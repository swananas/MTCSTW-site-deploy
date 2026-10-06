#!/usr/bin/env node
/* scripts/verify-url-render-sweep.js — pre-ship URL-render hardening verification.
   Run from the repo root: node scripts/verify-url-render-sweep.js
   1. node --check on every touched file
   2. Static assertions: every fixed render site wraps its URL in the allowlist
   3. Functional: each file's safeUrl/cleanHref extracted via vm and tested
      against javascript:/data:/vbscript: (must reject) and http/https/relative
      (must pass) */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

/* file -> list of [render-site marker, description] that must be allowlisted */
var SITES = {
  'v1.4.3/games/academy.js': [
    ['esc(safeUrl(f.url)||"#")', 'fred source link allowlisted']
  ],
  'v1.4.3/games/briefing.js': [
    ['esc(safeUrl(z.page)||"/")', 'crossfire zone page allowlisted'],
    ['esc(safeUrl(s.page)||"/")', 'circuit stop page allowlisted']
  ],
  'v1.4.3/games/civic-events.js': [
    ["esc(safeUrl(ev.source_url)||'#')", 'event source_url allowlisted x2']
  ],
  'v1.4.3/games/daily-orders.js': [
    ['escHtml(safeUrl(p.source_url)||"#")', 'official figure source allowlisted'],
    ["escHtml(cur.tu)", 'raid target href escaped']
  ],
  'v1.4.3/games/data-bounties.js': [
    ['safeUrl(pl.photo_url)', 'claim photo_url allowlisted at render']
  ],
  'v1.4.3/games/legislation.js': [
    ['safeUrl(b.pressure_link)', 'pressure_link allowlisted (card)'],
    ['safeUrl(b.pressure_link||d.pressure_link)', 'pressure_link allowlisted (detail)']
  ],
  'v1.4.3/games/notify.js': [
    ['safeUrl(l)', 'backend notification link allowlisted in ntDest']
  ],
  'v1.4.3/games/ammo.js': [
    ['esc(safeUrl(d.url)||"#")', 'politician official-site allowlisted'],
    ['esc(safeUrl(d.source_url)||"#")', 'vote source_url allowlisted']
  ],
  'v1.4.3/games/bank-fred-context.js': [
    ['esc(safeUrl(s.source_url)', 'FRED context source_url allowlisted']
  ],
  'v1.4.3/games/battles.js': [
    ['safeUrl(pr.image_data)', 'proposal image_data allowlisted'],
    ['safeUrl(en.image)', 'entry image allowlisted']
  ],
  'v1.4.3/games/review-pool.js': [
    ['safeUrl(a.artifact_url)', 'artifact_url allowlisted']
  ],
  'v1.4.3/core/22-routemarch.js': [
    ["esc(safeUrl(s.page) || '/')", 'route march stop page allowlisted']
  ],
  'v1.4.3/core/32-search.js': [
    ["esc(safeUrl(it.url)||'#')", 'search result url allowlisted']
  ],
  'v1.4.3/core/33-patterns.js': [
    ['upgraded from denylist to', 'cleanHref upgraded from denylist to allowlist']
  ],
  'v1.4.3/core/fred-shared.js': [
    ['esc(safeUrl(card.source_url)', 'FRED sheet source_url allowlisted']
  ],
  'v1.4.3/core/money-page.js': [
    ['safeUrl(cfg && cfg.money_page_url)', 'site-config money_page_url allowlisted']
  ],
  'v1.4.3/core/news-top.js': [
    ['safeUrl(f.source_url)', 'flag source_url allowlisted'],
    ["esc(safeUrl(s.url)||'#')", 'story url allowlisted']
  ],
  'v1.4.3/core/pf-credit.js': [
    ["esc(safeUrl(it.sourced_url)||'#')", 'sourced_url allowlisted']
  ],
  'v1.4.3/core/macro-gallery.js': [
    ['safeUrl(it.artifact_url)', 'gallery artifact_url allowlisted']
  ]
};

console.log('== 1. node --check ==');
Object.keys(SITES).forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static render-site assertions ==');
Object.keys(SITES).forEach(function (f) {
  var src = read(f);
  SITES[f].forEach(function (pair) {
    var marker = pair[0], desc = pair[1];
    if (src.indexOf(marker) !== -1) ok(f + ' :: ' + desc);
    else no(f + ' :: ' + desc, 'marker missing: ' + marker);
  });
});
/* cleanHref must be an allowlist now, not a denylist */
(function () {
  var src = read('v1.4.3/core/33-patterns.js');
  var start = src.indexOf('function cleanHref(');
  var body = src.slice(start, src.indexOf('/* fail-open wrapper', start));
  if (body.indexOf('new URL') !== -1 && body.indexOf('https://x.invalid') !== -1)
    ok('33-patterns.js :: cleanHref is URL-parse allowlist');
  else no('33-patterns.js :: cleanHref', 'allowlist upgrade not detected');
  if (!/javascript\|data\|vbscript/.test(body))
    ok('33-patterns.js :: no denylist remnant in cleanHref');
  else no('33-patterns.js :: cleanHref', 'denylist remnant detected');
})();

console.log('== 3. functional allowlist tests (vm) ==');
/* Brace-balanced extraction of each file's safeUrl/cleanHref. The sandbox is
   given URL (not present in a bare vm context). Dangerous inputs must come
   back as '' or a safe fallback ('/' or '#') — never the dangerous URL.
   Legit inputs must survive. */
function extractFn(src, name) {
  var start = src.indexOf('function ' + name + '(');
  if (start === -1) return null;
  var i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) break; }
  }
  return src.slice(start, j + 1);
}
var FUN = [
  ['v1.4.3/games/data-bounties.js', 'safeUrl'],
  ['v1.4.3/games/academy.js', 'safeUrl'],
  ['v1.4.3/games/briefing.js', 'safeUrl'],
  ['v1.4.3/games/legislation.js', 'safeUrl'],
  ['v1.4.3/games/notify.js', 'safeUrl'],
  ['v1.4.3/games/bank-fred-context.js', 'safeUrl'],
  ['v1.4.3/games/battles.js', 'safeUrl'],
  ['v1.4.3/games/review-pool.js', 'safeUrl'],
  ['v1.4.3/games/ammo.js', 'safeUrl'],
  ['v1.4.3/games/civic-events.js', 'safeUrl'],
  ['v1.4.3/games/daily-orders.js', 'safeUrl'],
  ['v1.4.3/core/22-routemarch.js', 'safeUrl'],
  ['v1.4.3/core/33-patterns.js', 'cleanHref'],
  ['v1.4.3/core/fred-shared.js', 'safeUrl'],
  ['v1.4.3/core/money-page.js', 'safeUrl'],
  ['v1.4.3/core/news-top.js', 'safeUrl'],
  ['v1.4.3/core/pf-credit.js', 'safeUrl'],
  ['v1.4.3/core/macro-gallery.js', 'safeUrl'],
  ['v1.4.3/core/32-search.js', 'safeUrl']
];
var BAD = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)', 'java\tscript:alert(1)', 'file:///etc/passwd'];
var GOOD = ['https://example.com/x.jpg', 'http://example.com/', 'https://pics.example/a.jpg?x=1#f',
  '/political-hq', '/arcade#pf-forecasts', '#pf-vote'];
/* helpers with intentionally narrower contracts (http(s)-only render contexts) */
var GOOD_NARROW = ['https://example.com/x.jpg', 'http://example.com/', 'https://pics.example/a.jpg?x=1#f'];
var NARROW = {
  'v1.4.3/games/review-pool.js': 1,
  'v1.4.3/games/ammo.js': 1,
  'v1.4.3/core/pf-credit.js': 1
};
function safeResult(r, input) {
  /* '' or a same-origin fallback is safe; the dangerous URL itself is not */
  if (r === '' || r === '/' || r === '#') return true;
  return r !== input;
}
FUN.forEach(function (pair) {
  var f = pair[0], name = pair[1], src = read(f);
  var body = extractFn(src, name);
  if (!body) { no(f + ' :: ' + name, 'helper not extractable'); return; }
  var fn;
  try { fn = vm.runInNewContext('(' + body + ')', { URL: URL }); }
  catch (e) { no(f + ' :: ' + name, 'vm compile failed: ' + e.message); return; }
  var badOk = true, goodOk = true, badWhy = '';
  BAD.forEach(function (u) {
    var r = null;
    try { r = fn(u); } catch (e) { r = ''; }
    if (!safeResult(r, u)) { badOk = false; badWhy = u + ' -> ' + r; }
  });
  var goodList = NARROW[f] ? GOOD_NARROW : GOOD;
  goodList.forEach(function (u) {
    var r = '';
    try { r = fn(u); } catch (e) {}
    if (!r) goodOk = false;
  });
  if (badOk) ok(f + ' :: ' + name + ' neutralizes javascript:/data:/vbscript:/file:');
  else no(f + ' :: ' + name, 'dangerous URL survived: ' + badWhy);
  if (goodOk) ok(f + ' :: ' + name + ' passes http/https/relative');
  else no(f + ' :: ' + name, 'legit URL rejected');
});

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (x) { console.log('  - ' + x); }); }
process.exit(fails.length ? 1 : 0);
