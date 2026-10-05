#!/usr/bin/env node
/* scripts/verify-pressure-board-fe.js — A2 Civic Pressure Index frontend
   verification harness (fe/pressure-index, 2026-10-05). Run from the worktree
   root:  node scripts/verify-pressure-board-fe.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, build/bundle.js, build/bundle-core.js,
      pages/political-hq.js, and this harness.
   2. Kill switch: PF.skip('pressure') (contract) + PF.skip('pressure-board')
      (convention); header documents ?pf_off=pressure; functional: skip=true
      stages nothing, skip=false stages the pf-ov-pressure-board template.
   3. Bundle registration: pressure-board.js in exactly one bundle
      (bundle-hq) per build/bundle.js; present in the rebuilt
      v1.4.3/games/bundle-hq.js.
   4. Mount wiring: ['pressure-board','pf-ov-pressure-board'] in the ORDER of
      pages/political-hq.js AND in the rebuilt v1.4.3/pages/bundle-pages.js.
   5. Contract surface: gold rows carry `display` (one fixture row null),
      never `display_name`; no `alert_driven` anywhere (never a zero).
      Functional: null display renders "Unlabeled rep"; rows sort by
      pressure desc. `alert_driven` never appears in code (the header
      documents the deliberate gold omission).
   6. Methodology: fixture method text carries all five key lines
      (state-attribution disclosure, community-typed-labels caveat,
      deletion-honesty sentence, k>=10, "community-reported and unofficial");
      methodText() extracts from the pressure_method {ok,text} shape;
      render uses the runtime-supplied text, never a hardcoded copy.
   7. Suppression: suppressed_count renders "not enough reports yet"; a
      defensive n<10 row is folded into suppressed (its numbers never render).
   8. Honesty rails: JSONP failure renders the fixture ONLY behind the
      DEMO BOARD banner; live success renders no banner. Fixture rep names
      are obviously fake.
   9. Lexicon + no-XP + read-only: zero banned terms (the banned d-word
      included); no xpGrant; no POST/write paths (no authPost, fetch(,
      XMLHttpRequest).
   10. XSS-inert: dynamic fields render through esc() only (quote-free
      split/join escaper); raw interpolation of display/state/week is absent
      from the comment-stripped view (no string stripping — AGENTS.md lesson:
      regex literals are quote-blind). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var MOD = path.join(G, 'pressure-board.js');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
var src = read(MOD);
/* Comment-stripped view (strings INTACT): the right view for identifier
   checks. AGENTS.md lesson: string-stripping makes regex literals quote-blind,
   so string literals are masked only in codeOnly(), used for call-shape
   checks where literals can't appear. */
function noComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}
function codeOnly(src) {
  var out = '', i = 0, n = src.length, q = null;
  while (i < n) {
    var c = src[i], d = src[i + 1];
    if (q) {
      if (c === '\\' && i + 1 < n) { out += '  '; i += 2; continue; }
      if (c === q) { q = null; out += ' '; i++; continue; }
      out += ' '; i++; continue;
    }
    if (c === '/' && d === '*') { var j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === '/' && d === '/') { var k = src.indexOf('\n', i + 2); i = k < 0 ? n : k; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += ' '; i++; continue; }
    out += c; i++;
  }
  return out;
}
/* Extract the inner <script> from the staged template — most of the module's
   logic lives there, so static checks on it run against this extraction. */
function innerScript() {
  var a = src.indexOf('<script>');
  var b = src.lastIndexOf('</script>');
  return (a < 0 || b <= a) ? null : src.slice(a + '<script>'.length, b);
}
var inner = innerScript();
if (!inner) { no('inner script extraction', 'script tags not found'); }
var nc = noComments(src);                 /* outer file, strings intact */
var ncInner = inner ? noComments(inner) : ''; /* inner script, strings intact */
var codeInner = inner ? codeOnly(inner) : ''; /* inner script, literals masked */

console.log('== 1. syntax ==');
['v1.4.3/games/pressure-board.js', 'build/bundle.js', 'build/bundle-core.js',
 'v1.4.3/pages/political-hq.js', 'scripts/verify-pressure-board-fe.js'
].forEach(function (f) {
  try { cp.execSync('node --check ' + JSON.stringify(path.join(ROOT, f)), { stdio: 'pipe' }); ok('node --check ' + f); }
  catch (e) { no('node --check ' + f, 'syntax error'); }
});

console.log('== 2. kill switch ==');
(function () {
  var ids = [], m, re = /PF\.skip\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = re.exec(nc))) ids.push(m[1]);
  if (ids.indexOf('pressure') > -1 && ids.indexOf('pressure-board') > -1) ok('PF.skip both ids');
  else no('PF.skip both ids', 'found: ' + ids.join(','));
})();
if (/\?pf_off=pressure\b/.test(src)) ok('header documents ?pf_off=pressure');
else no('header documents ?pf_off=pressure', 'missing');
(function () {
  var staged = [];
  function run(skipVal) {
    staged = [];
    var win = {
      PF: {
        skip: function () { return skipVal; },
        holder: function () { return { insertAdjacentHTML: function (pos, html) { staged.push(html); } }; }
      }
    };
    var fn = new Function('window', 'document', src);
    fn(win, { getElementById: function () { return null; }, createElement: function () { return {}; } });
  }
  run(true);
  if (staged.length === 0) ok('skip=true stages nothing');
  else no('skip=true stages nothing', 'staged ' + staged.length);
  run(false);
  if (staged.length === 1 && has(staged[0], 'id="pf-ov-pressure-board"')) ok('skip=false stages the template');
  else no('skip=false stages the template', 'staged=' + staged.length);
})();

console.log('== 3. bundle registration ==');
(function () {
  var b = read(path.join(ROOT, 'build/bundle.js'));
  var hits = (b.match(/'pressure-board\.js'/g) || []).length;
  if (hits === 1) ok('pressure-board.js listed exactly once in build/bundle.js');
  else no('pressure-board.js listed exactly once in build/bundle.js', 'hits=' + hits);
  var hqSection = b.slice(b.indexOf("'bundle-hq'"));
  if (has(hqSection, "'pressure-board.js'")) ok('registered in bundle-hq');
  else no('registered in bundle-hq', 'not in the HQ bundle list');
  var built = read(path.join(G, 'bundle-hq.js'));
  if (has(built, 'pf-ov-pressure-board')) ok('rebuilt games/bundle-hq.js carries the template');
  else no('rebuilt games/bundle-hq.js carries the template', 'rebuild bundles first');
})();

console.log('== 4. mount wiring ==');
(function () {
  var phq = read(path.join(V, 'pages', 'political-hq.js'));
  var pair = "['pressure-board', 'pf-ov-pressure-board']";
  if (has(phq, pair)) ok('ORDER entry in pages/political-hq.js');
  else no('ORDER entry in pages/political-hq.js', 'missing ' + pair);
  var bp = read(path.join(V, 'pages', 'bundle-pages.js'));
  if (has(bp, pair)) ok('rebuilt pages/bundle-pages.js carries the ORDER entry');
  else no('rebuilt pages/bundle-pages.js carries the ORDER entry', 'rebuild bundle-core first');
})();

console.log('== 5-8. contract, methodology, suppression, honesty (functional) ==');
/* Extract the inner <script> from the staged template and run it against a
   DOM mock. The inner script exposes window.PFPressureBoard for tests. */
function makeHost() { return { innerHTML: '' }; }
function runInner(opts) {
  /* opts: { backend: string|null, board: object|null, method: object|null,
             liveOk: bool } — liveOk decides whether JSONP "succeeds". */
  var host = makeHost();
  var win = { PF_BACKEND_URL: opts.backend || '', location: { search: '' } };
  var timers = [];
  var doc = {
    getElementById: function (id) { return id === 'xPressureBoard' ? host : null; },
    createElement: function (t) {
      return {
        _src: '', parentNode: { removeChild: function () {} },
        set src(v) {
          this._src = v;
          var m = /[?&]callback=([^&]+)/.exec(v);
          var action = /[?&]action=([^&]+)/.exec(v);
          var cb = m && m[1], act = action && decodeURIComponent(action[1]);
          var self = this;
          setTimeout(function () {
            if (opts.liveOk && cb) {
              var payload = act === 'pressure_method' ? opts.method : opts.board;
              win[cb](payload);
            } else if (self.onerror) {
              self.onerror();
            }
          }, 0);
        },
        get src() { return this._src; },
        onerror: null
      };
    },
    head: { appendChild: function () {} }
  };
  var fn = new Function('window', 'document', 'location', 'setTimeout', inner);
  fn(win, doc, win.location, function (f) { timers.push(f); return 0; });
  return { win: win, host: host };
}
function drain(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(function () {
  /* static contract checks on the whole module (comments included — the
     strictest view: these identifiers must not appear anywhere) */
  if (has(src, 'display_name')) no('no display_name', 'gold carries display, not display_name');
  else ok('no display_name in code');
  /* alert_driven must never render — the header comment documents the
     deliberate omission, so this check runs on the comment-stripped view. */
  if (has(noComments(src), 'alert_driven')) no('no alert_driven', 'must never render it');
  else ok('no alert_driven in code (omission documented in header)');
  var m = src.match(/display:\s*null/);
  if (m) ok('fixture exercises display:null');
  else no('fixture exercises display:null', 'need a null-display fixture row');
})();

(function () {
  /* methodology fixture carries the five key lines */
  var key = [
    "pledged a state count toward rep totals, not state totals",
    'community-typed',
    'Delete your data any time',
    '10 distinct voices (k',
    'community-reported and unofficial'
  ];
  var missing = key.filter(function (k) { return !has(src, k); });
  if (missing.length === 0) ok('fixture methodology carries all five key lines');
  else no('fixture methodology carries all five key lines', 'missing: ' + missing.join(' | '));
})();

(async function () {
  var liveBoard = {
    ok: true, week: 'Oct 5 \u2013 Oct 11, 2026',
    by_rep: [
      { rep_key: 'r1', display: 'Rep. Live Test', calls: 300, sigs: 100, pressure: 400, n: 90 },
      { rep_key: 'r2', display: null, calls: 200, sigs: 50, pressure: 250, n: 60 },
      { rep_key: 'r3', display: 'Rep. Low Data', calls: 5, sigs: 2, pressure: 7, n: 3 }
    ],
    by_state: [{ state: 'LA', calls: 500, pledges: 120 }],
    suppressed_count: 4
  };
  var liveMethod = { ok: true, text: 'Live method line one.\n\nLive method line two carries community-reported and unofficial.' };

  /* A. live path: JSONP succeeds for both endpoints */
  var t1 = runInner({ backend: 'https://x.test', board: liveBoard, method: liveMethod, liveOk: true });
  await drain(30);
  var h1 = t1.host.innerHTML;
  if (has(h1, 'Unlabeled rep')) ok('live: null display renders "Unlabeled rep"');
  else no('live: null display renders "Unlabeled rep"', 'not found');
  var i400 = h1.indexOf('>400<'), i250 = h1.indexOf('>250<');
  if (i400 > -1 && i250 > -1 && i400 < i250) ok('live: rows sorted by pressure desc');
  else no('live: rows sorted by pressure desc', 'order wrong');
  if (has(h1, 'not enough reports yet')) ok('live: suppressed_count renders the honesty line');
  else no('live: suppressed_count renders the honesty line', 'not found');
  if (has(h1, 'Low Data')) no('live: n<10 row suppressed', 'low-data row leaked into the table');
  else ok('live: n<10 row folded into suppressed');
  if (has(h1, '5 more on the watchlist')) ok('live: suppressed includes defensive fold (4+1=5)');
  else no('live: suppressed includes defensive fold', 'expected "5 more on the watchlist"');
  if (!has(h1, 'DEMO BOARD')) ok('live: no demo banner');
  else no('live: no demo banner', 'banner leaked into live render');
  if (has(h1, 'community-reported and unofficial')) ok('live: methodology from pressure_method response');
  else no('live: methodology from pressure_method response', 'runtime text not rendered');
  if (has(h1, 'Oct 5')) ok('live: week window rendered');
  else no('live: week window rendered', 'week missing');

  /* B. dead backend: fixture behind the DEMO banner */
  var t2 = runInner({ backend: 'https://x.test', liveOk: false });
  await drain(30);
  var h2 = t2.host.innerHTML;
  if (has(h2, 'DEMO BOARD')) ok('dead wire: fixture renders behind DEMO BOARD banner');
  else no('dead wire: fixture renders behind DEMO BOARD banner', 'banner missing');
  if (has(h2, 'demo data')) ok('dead wire: footer flagged demo data');
  else no('dead wire: footer flagged demo data', 'footer missing the flag');

  /* C. half-live: board ok but method endpoint dead -> fixture mode (a board
     without methodology would violate the trust rules) */
  var t3 = runInner({ backend: 'https://x.test', board: liveBoard, method: null, liveOk: true });
  await drain(30);
  if (has(t3.host.innerHTML, 'DEMO BOARD')) ok('half-live: fixture fallback when methodology missing');
  else no('half-live: fixture fallback when methodology missing', 'rendered without methodology');

  /* D. methodText seam: accepts {ok,text} shape */
  var t4 = runInner({ backend: '', liveOk: false });
  await drain(10);
  var PB = t4.win.PFPressureBoard;
  if (PB && PB.methodText({ ok: true, text: 'abc' }) === 'abc') ok('methodText reads {ok,text}');
  else no('methodText reads {ok,text}', 'seam broken');
  if (PB && PB.methodText({ ok: false, text: 'abc' }) === null) ok('methodText rejects ok:false');
  else no('methodText rejects ok:false', 'seam broken');
  if (PB && PB.isValidBoard({ ok: true, by_rep: [], by_state: [] }) && !PB.isValidBoard({ ok: true })) ok('isValidBoard shape gate');
  else no('isValidBoard shape gate', 'seam broken');

  finish();
})().catch(function (e) { no('functional run', String(e && e.stack || e)); finish(); });

function finish() {
  console.log('== 9. lexicon, no-XP, read-only ==');
  (function () {
    if (/donate/i.test(src)) no('lexicon: banned d-word absent', 'found in module');
    else ok('lexicon: banned d-word absent');
    var banned = ['casino', 'jackpot'];
    var hit = banned.filter(function (w) { return new RegExp(w, 'i').test(src); });
    if (hit.length) no('lexicon: clean', 'found: ' + hit.join(','));
    else ok('lexicon: clean');
  })();
  (function () {
    var xpHits = ['xpGrant', 'xpledger', 'ledgerGrant', 'awardXP'].filter(function (w) { return has(src, w); });
    if (xpHits.length) no('no XP logic', 'found: ' + xpHits.join(','));
    else ok('no XP logic anywhere');
    var writeHits = ['authPost', 'XMLHttpRequest', 'fetch('].filter(function (w) { return has(src, w); });
    if (writeHits.length) no('read-only: no write paths', 'found: ' + writeHits.join(','));
    else ok('read-only: no write paths (JSONP reads only)');
  })();

  console.log('== 10. XSS-inert rendering ==');
  (function () {
    var escCalls = (ncInner.match(/esc\(/g) || []).length - 1; /* minus the function definition */
    /* 4 dynamic interpolation sites: rep name, state, week line, method
       paragraphs — every one must pass through esc(). */
    if (escCalls >= 4) ok('esc() covers all dynamic sites (' + escCalls + ' calls)');
    else no('esc() covers all dynamic sites', 'only ' + escCalls + ' calls');
    var bad = [];
    if (has(ncInner, '+ r.display') || has(ncInner, '+r.display')) bad.push('raw r.display interpolation');
    if (has(ncInner, '+ st.state') || has(ncInner, '+st.state')) bad.push('raw st.state interpolation');
    if (has(ncInner, '+ board.week') || has(ncInner, '+board.week')) bad.push('raw board.week interpolation');
    if (!has(ncInner, 'esc(name)')) bad.push('rep name not esc()d');
    if (!has(ncInner, 'esc(st.state)')) bad.push('state not esc()d');
    if (!has(ncInner, 'esc(paras[i])')) bad.push('method paragraphs not esc()d');
    if (bad.length) no('XSS: dynamic fields escaped', bad.join(' | '));
    else ok('XSS: dynamic fields escaped (display/state/week/method)');
    var sinks = (ncInner.match(/\.innerHTML\s*=/g) || []).length;
    if (sinks === 1) ok('single innerHTML sink');
    else no('single innerHTML sink', 'found ' + sinks);
  })();

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exitCode = 1; }
}
