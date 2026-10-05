#!/usr/bin/env node
/* tests/fred-s35.verify.cjs — Wave B5 S-35 FE verify (war-room ticker).
   Run from the repo root:
     node tests/fred-s35.verify.cjs
   1. node --check on the new game file
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      - kill switch ?pf_off=fred_ticker (PF.skip(KILL), KILL='fred_ticker')
      - News Desk copy: no "live"/"now" in code or strings; header copy
        "figures update daily from FRED"; "as of " stamps on every item;
        empty copy "No macro releases in the last 30 days."
      - Psych: no countdown language; poll interval exactly hourly
        (60*60*1000), no faster auto-refresh; no red/flash/blink/animation
        formatting in code or strings
      - QC: stale badge path (pf-ticker-stale + STALE + last-good as-of)
      - mount: #pf-fred-ticker explicit, #pf-cell-hq fallback, silent
        no-op elsewhere; cell_id from cell_mine only (no location.search /
        URLSearchParams / location.hash reads)
      - zero XP: no xpGrant, no PF.xp, no xp event dispatches
      - esc() on every backend interpolation
   3. Rebuilt bundle-cells.js contains the ticker code.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var TICK = path.join(ROOT, 'v1.4.3', 'games', 'fred-ticker.js');
var BCELLS = path.join(ROOT, 'v1.4.3', 'games', 'bundle-cells.js');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* Comment strip only — never strip string literals (regex-literal-blind). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function stat(code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing pattern: ' + re));
}
function statNot(code, name, re, why) {
  if (!re.test(code)) ok(name); else no(name, why || ('banned pattern present: ' + re));
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed'); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + TICK, { stdio: 'pipe' }); ok('fred-ticker.js syntax'); }
catch (e) { no('syntax fred-ticker.js', 'node --check failed'); }

var code = stripComments(read(TICK));

/* ============ 2. static checks ============ */
console.log('== 2. static checks (comment-stripped) ==');
/* Kill switch. */
stat(code, 'kill switch PF.skip(KILL)', /PF\.skip\(KILL\)/);
stat(code, "KILL = 'fred_ticker'", /var KILL = 'fred_ticker'/);
/* News Desk copy: no "live"/"now" anywhere in code or strings. */
statNot(code, 'no "live" in code/strings', /\blive\b/i, '"live" found outside comments');
var noDateNow = code.replace(/Date\.now\(\)/g, '');
statNot(noDateNow, 'no "now" in code/strings', /\bnow\b/i, '"now" found outside comments/Date.now()');
stat(code, 'header copy: figures update daily from FRED',
  /figures update daily from FRED/);
stat(code, '"as of " stamps', /as of /);
stat(code, 'empty copy: No macro releases in the last 30 days',
  /No macro releases in the last 30 days/);
/* Psych: no countdown, hourly poll, no doom formatting. */
statNot(code, 'no countdown language', /countdown/i);
stat(code, 'poll exactly hourly', /var POLL_MS = 60 \* 60 \* 1000/);
stat(code, 'poll uses POLL_MS', /setInterval\(function \(\) \{[\s\S]*?\}, POLL_MS\)/);
var timers = code.match(/setInterval\(/g) || [];
if (timers.length === 1) ok('single auto-refresh timer');
else no('single auto-refresh timer', 'expected 1 setInterval, found ' + timers.length);
statNot(code, 'no red/flash/blink/animation in code/strings',
  /\bred\b|\bflash\b|\bblink\b|animation/i);
/* QC: stale badge path. */
stat(code, 'stale badge class', /pf-ticker-stale/);
stat(code, 'STALE badge text', /STALE/);
stat(code, 'stale last-good as-of', /Last good figure as of/);
/* Mount + cell context. */
stat(code, 'explicit mount #pf-fred-ticker', /getElementById\('pf-fred-ticker'\)/);
stat(code, 'HQ fallback #pf-cell-hq', /getElementById\('pf-cell-hq'\)/);
stat(code, 'cell_id from cell_mine', /api\(BACKEND, 'cell_mine'|api\(backend, 'cell_mine'/);
statNot(code, 'no URL-param cell_id', /location\.search|URLSearchParams|location\.hash/);
/* Zero XP. */
statNot(code, 'no xpGrant', /xpGrant/);
statNot(code, 'no PF.xp', /PF\.xp/i);
statNot(code, 'no xp event dispatch', /pf-xp-|dispatchEvent\(new CustomEvent\('pf-do/i);
/* esc() on backend interpolations. */
stat(code, 'esc(e.label)', /esc\(e\.label/);
stat(code, 'esc(e.value_label)', /esc\(e\.value_label/);
stat(code, 'esc(e.source_url)', /esc\(e\.source_url/);
stat(code, 'esc(e.series_id)', /esc\(e\.series_id/);
stat(code, 'esc(e.change_note)', /esc\(e\.change_note/);
/* Backend action name. */
stat(code, "calls action 'fred_ticker'", /'fred_ticker'/);

/* ============ 3. bundle contains the ticker ============ */
console.log('== 3. bundle-cells.js ==');
var bcode = stripComments(read(BCELLS));
stat(bcode, 'bundle-cells ships fred-ticker', /WAR-ROOM TICKER/);
stat(bcode, 'bundle-cells ships kill switch', /fred_ticker/);

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
