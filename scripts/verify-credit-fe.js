#!/usr/bin/env node
/* scripts/verify-credit-fe.js — Synergy-1 attribution frontend harness.
   Run from the repo root: node scripts/verify-credit-fe.js
   1. node --check on the touched files
   2. Static checks (comment-strip only, never string-strip — AGENTS.md):
      kill switch, PF.credit/PF.creditData defined, esc() on interpolations,
      zero-XP token, banned terms, bundle markers, contract docs
   3. Mocked-browser runtime tests (vm + window/PF shim): creator credit
      with/without link, hq marker, honest empties, XSS escaping,
      ?pf_off=credit kill, creditData variants, macro-gallery + news-top
      wiring through the shared component
   Does NOT rebuild bundles (the wave build already did; this harness only
   verifies). Exits 0 when every check passes, 1 with a failure list. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
/* Comment-strip ONLY (no quote stripping — the esc() /"/g pattern breaks
   naive string strippers; see AGENTS.md). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
['v1.4.3/core/pf-credit.js', 'v1.4.3/core/news-top.js',
 'v1.4.3/core/macro-gallery.js', 'v1.4.3/games/ammo.js',
 'v1.4.3/games/poster-forge.js', 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var creditSrc = read(path.join(V, 'core', 'pf-credit.js'));
var creditCode = stripComments(creditSrc);

console.log('== 2. static contract checks ==');
ok('PF.credit defined', creditCode.indexOf('PF.credit = function') !== -1);
ok('PF.creditData defined', creditCode.indexOf('PF.creditData = function') !== -1);
ok('kill switch ?pf_off=credit', creditCode.indexOf("PF.skip('credit')") !== -1 ||
  creditCode.indexOf('PF.skip("credit")') !== -1);
ok('escapes interpolated callsign', /esc\(it\.sourced_by\)/.test(creditCode));
ok('escapes interpolated name', /esc\(it\.sourced_name\)/.test(creditCode));
ok('escapes interpolated url', /esc\(it\.sourced_url\)/.test(creditCode));
ok('url scheme allowlist (http/https or site-relative)',
  /https\?:\\\//.test(creditCode) && /javascript/.test(creditCode) === false);
ok('honest empty: no sourced_by -> empty string',
  /if \(!it\.sourced_by\) return '';/.test(creditCode));
ok('hq marker renders HQ copy', /MADE BY PROPAGANDA FACTORY HQ/.test(creditSrc));
ok('never fabricates links (link only when sourced_url present)',
  /it\.sourced_url\s*\?/.test(creditCode));
ok('zero-XP: no xpGrant', /xpGrant\s*\(/.test(creditCode) === false);
ok('no XP-adjacent tokens', /\bgrantXP\b|\bawardXP\b/.test(creditCode) === false);
ok('no banned terms', /donate|donation/i.test(creditCode) === false);
ok('registered in bundle-core build', has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/pf-credit.js'"));
ok('shipped in bundle-core.js', has(path.join(V, 'core', 'bundle-core.js'), 'PF.credit = function'));
ok('shipped in bundle-core-slr.js', has(path.join(V, 'core', 'bundle-core-slr.js'), 'PF.credit = function'));
ok('news-top renders through PF.credit', /PF\.credit\(\{ sourced_by: s\.sourced_by \}\)/.test(read(path.join(V, 'core', 'news-top.js'))));
ok('macro-gallery community via PF.credit',
  /creditFor\(\{ sourced_by: it\.sourced_by \|\| it\.callsign \}\)/.test(read(path.join(V, 'core', 'macro-gallery.js'))));
ok('macro-gallery hq via PF.credit',
  /creditFor\(\{ sourced_by: it\.sourced_by \|\| 'hq' \}\)/.test(read(path.join(V, 'core', 'macro-gallery.js'))));
ok('old per-surface MADE BY line removed from gallery',
  read(path.join(V, 'core', 'macro-gallery.js')).indexOf("MADE BY ' + esc(it.callsign") === -1);
ok('S-20 hook in poster-forge contract', /sourced_by, sourced_name, sourced_url/.test(read(path.join(V, 'games', 'poster-forge.js'))));
ok('S-20 passthrough in ammo forgeThis', /sourced_by: card\.sourced_by \|\| ''/.test(read(path.join(V, 'games', 'ammo.js'))));

console.log('== 3. runtime (mocked browser) ==');
function boot(disabled) {
  var disabledArr = disabled || [];
  var sandbox = {
    console: console,
    window: {}
  };
  sandbox.window.PF = {
    skip: function (s) { return disabledArr.indexOf(s) !== -1; }
  };
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(V, 'core', 'pf-credit.js')), sandbox, { filename: 'pf-credit.js' });
  return sandbox.window.PF;
}
var PF = boot();
function t(name, cond) { if (cond) ok(name); else no(name, 'render mismatch'); }

var c1 = PF.credit({ sourced_by: 'voxnoire' });
t('creator credit renders callsign', c1.indexOf('SOURCED BY @voxnoire') !== -1);
t('creator credit wrapper class', c1.indexOf('pf-credit') !== -1);
t('no link when no url', c1.indexOf('<a ') === -1);
var c2 = PF.credit({ sourced_by: 'voxnoire', sourced_url: '/sick-left-radicals' });
t('link when url supplied', c2.indexOf('<a href="/sick-left-radicals"') !== -1);
t('link carries callsign text', c2.indexOf('@voxnoire</a>') !== -1);
var c3 = PF.credit({ sourced_by: 'hq' });
t('hq renders HQ copy', c3.indexOf('MADE BY PROPAGANDA FACTORY HQ') !== -1);
t('hq has no link', c3.indexOf('<a ') === -1);
t('unknown -> empty', PF.credit({}) === '');
t('null -> empty', PF.credit(null) === '');
t('garbage callsign -> empty', PF.credit({ sourced_by: 'EVIL"><script>' }) === '');
t('legacy {callsign} accepted', PF.credit({ callsign: 'mtcstw' }).indexOf('@mtcstw') !== -1);
t('bare string accepted', PF.credit('voxnoire').indexOf('@voxnoire') !== -1);
t('display name shown with callsign',
  PF.credit({ sourced_by: 'voxnoire', sourced_name: 'Voix Noire' }).indexOf('Voix Noire (@voxnoire)') !== -1);
var xss = PF.credit({ sourced_by: 'voxnoire', sourced_name: '"><img src=x onerror=1>', sourced_url: 'javascript:alert(1)' });
t('XSS: name escaped', xss.indexOf('<img') === -1 && xss.indexOf('&quot;&gt;') !== -1);
t('XSS: javascript: url rejected', xss.indexOf('javascript:') === -1 && xss.indexOf('<a ') === -1);
var xss2 = PF.credit({ sourced_by: 'voxnoire', sourced_url: 'https://mtcstw.com/ok' });
t('https url allowed', xss2.indexOf('href="https://mtcstw.com/ok"') !== -1);
var cd1 = PF.creditData({ label: 'FRED', detail: 'CPIAUCNS · NSA · RETRIEVED Oct 5', url: 'https://fred.stlouisfed.org/series/CPIAUCNS' });
t('creditData renders', cd1.indexOf('DATA:') !== -1 && cd1.indexOf('FRED') !== -1);
t('creditData links', cd1.indexOf('https://fred.stlouisfed.org/series/CPIAUCNS') !== -1);
t('creditData empty without label', PF.creditData({}) === '');
var PFK = boot(['credit']);
t('kill: credit -> empty', PFK.credit({ sourced_by: 'voxnoire' }) === '');
t('kill: creditData -> empty', PFK.creditData({ label: 'FRED' }) === '');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { fails.forEach(function (f) { console.log('FAILED: ' + f); }); process.exit(1); }
