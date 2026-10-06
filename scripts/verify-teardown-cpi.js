#!/usr/bin/env node
/* scripts/verify-teardown-cpi.js — WS-6 CPI/ECONOMY teardown verification
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-cpi.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the CPI sources and this harness.
   2. Pattern integration: PF.patterns.dataStrip / .report / .proof /
      .intelCard / .actionBar call sites exist in the right modules.
   3. HARD BLOCK (CEO decision 5): the word "quorum" (any case) is ABSENT
      from all CPI sources and both rebuilt bundles — user-facing or
      otherwise. Lint fails if found.
   4. Zero XP: no xpGrant/grantXP/awardXP/mintXP in CPI sources or bundles;
      the "0 XP" honesty line is still present.
   5. CTA-verb lint: no "donate" (any case); no CONFIRM-pill CTA labels;
      no CALL IT / ENLIST / HOLD EQUITY as CTA labels.
   6. Kill switches: every PF.skip() gate for the CPI surface is present.
   7. Fail-closed: PF.patterns.dataStrip refuses figures missing any of
      figure/label/source/recency (functional vm test); every CPI figure
      path routes through stripFigure() and carries an honest fallback.
   8. Gray/white trends: no red/green up/down tints; no red chart strokes;
      trend bars are not red.
   9. Trust-stamp structure: every stripFigure call site passes updated:;
      proof() is called with a real count.
   10. Callsign gate: the check-in flow still requires a callsign before
       the report rail; PF.presetInflationItem is exposed for one-tap
       confirms (the confirm path posts nothing itself).
   11. Bundle presence: rebuilt minified bundles contain the teardown
       markers and no "quorum".
   12. Inner-script gate: scripts/check-inner-scripts.js passes on the
       touched sources. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SOURCES = [
  'v1.4.3/games/peoples-cpi.js',
  'v1.4.3/games/inflation-tracker.js',
  'v1.4.3/games/economy-home.js'
];
var BUNDLES = [
  'v1.4.3/games/bundle-peoples-cpi.js',
  'v1.4.3/games/bundle-economy.js'
];
var PATTERNS_JS = 'v1.4.3/core/33-patterns.js';

var passes = 0, failures = [];
function ok(m) { passes++; console.log('  ok: ' + m); }
function bad(section, m) { failures.push('[' + section + '] ' + m); console.error('  FAIL [' + section + ']: ' + m); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function count(src, re) { var m = src.match(re); return m ? m.length : 0; }
function isBundle(f) { return BUNDLES.indexOf(f) !== -1; }
function srcOf(f) { return isBundle(f) ? bundle[f] : cpi[f]; }

/* ================= 1. syntax ================= */
console.log('[1] syntax');
(function () {
  var files = SOURCES.concat(['scripts/verify-teardown-cpi.js']);
  var badn = [];
  files.forEach(function (f) {
    try { cp.execSync(process.execPath + ' --check ' + path.join(ROOT, f), { stdio: 'pipe' }); }
    catch (e) { badn.push(f); }
  });
  if (!badn.length) ok('node --check clean on ' + files.length + ' files');
  else bad('syntax', 'node --check failed: ' + badn.join(', '));
})();

var cpi = {}, bundle = {};
SOURCES.forEach(function (f) { cpi[f] = read(f); });
BUNDLES.forEach(function (f) {
  try { bundle[f] = read(f); } catch (e) { bundle[f] = null; }
});

/* ================= 2. pattern integration ================= */
console.log('[2] pattern integration');
(function () {
  function has(f, s, label) {
    if (cpi[f].indexOf(s) !== -1) ok(label);
    else bad('patterns', f + ' missing ' + label);
  }
  has('v1.4.3/games/peoples-cpi.js', 'stripFigure({', 'peoples-cpi: stripFigure() trust-stamp call sites');
  has('v1.4.3/games/peoples-cpi.js', '.intelCard({', 'peoples-cpi: Intel Card (P2) price cards');
  has('v1.4.3/games/peoples-cpi.js', '.proof({', 'peoples-cpi: P8 proof line (report count)');
  has('v1.4.3/games/peoples-cpi.js', "verb: 'report'", 'peoples-cpi: one-tap confirm as REPORT BACK (P3)');
  has('v1.4.3/games/peoples-cpi.js', '.actionBar({', 'peoples-cpi: P6 Action Bar');
  has('v1.4.3/games/peoples-cpi.js', 'pf-cpi-hero', 'peoples-cpi: hero-scale headline wrapper');
  has('v1.4.3/games/inflation-tracker.js', 'stripFigure({', 'inflation-tracker: stripFigure() trust-stamp call sites');
  has('v1.4.3/games/inflation-tracker.js', '.proof({', 'inflation-tracker: P8 proof line (report count)');
  has('v1.4.3/games/inflation-tracker.js', "pt.report(", 'inflation-tracker: one-tap confirm as REPORT BACK (P3)');
  has('v1.4.3/games/inflation-tracker.js', 'data-confirm-item', 'inflation-tracker: confirm affordance wiring');
  has('v1.4.3/games/inflation-tracker.js', 'data-inf-spark', 'inflation-tracker: sparkline slots');
  has('v1.4.3/games/economy-home.js', 'presetInflationItem', 'economy-home: deep-link item pre-scope');
})();

/* ================= 3. HARD BLOCK: no "quorum" wording ================= */
console.log('[3] quorum hard block (CEO decision 5)');
(function () {
  var badf = [];
  SOURCES.concat(BUNDLES).forEach(function (f) {
    var src = srcOf(f);
    if (src == null) { badf.push(f + ' (missing)'); return; }
    if (/quorum/i.test(src)) badf.push(f);
  });
  if (!badf.length) ok('the word "quorum" appears nowhere in CPI sources or bundles');
  else bad('quorum-block', '"quorum" wording found in: ' + badf.join(', '));
})();

/* ================= 4. zero XP ================= */
console.log('[4] zero XP');
(function () {
  var badf = [];
  SOURCES.concat(BUNDLES).forEach(function (f) {
    var src = srcOf(f);
    if (src == null) return;
    if (/(xpGrant|grantXP|awardXP|mintXP|mint_xp)/i.test(src)) badf.push(f);
  });
  if (!badf.length) ok('no XP-grant calls anywhere on the CPI surface (confirms mint zero XP)');
  else bad('zero-xp', 'XP-grant pattern found in: ' + badf.join(', '));
  if (/0 XP/.test(cpi['v1.4.3/games/peoples-cpi.js'])) ok('peoples-cpi: "0 XP" honesty line present');
  else bad('zero-xp', 'peoples-cpi lost its "0 XP" honesty line');
  if (/0 XP/.test(cpi['v1.4.3/games/economy-home.js'])) ok('economy-home: "0 XP" honesty line present');
  else bad('zero-xp', 'economy-home lost its "0 XP" honesty line');
})();

/* ================= 5. CTA-verb lint ================= */
console.log('[5] CTA-verb lint');
(function () {
  SOURCES.forEach(function (f) {
    var src = cpi[f];
    if (/donate/i.test(src)) { bad('cta-verb', f + ': banned word "donate"'); return; }
    /* CONFIRM-pill CTA: a button/link whose whole label is CONFIRM[/THIS PRICE]. */
    if (/>\s*CONFIRM(\s+(THIS\s+)?PRICE)?\s*(→|->|&rarr;)?\s*</i.test(src)) {
      bad('cta-verb', f + ': CONFIRM-pill CTA label (must be REPORT BACK)');
      return;
    }
    if (/>\s*(CALL\s*IT|HOLD\s+EQUITY)\s*(→|->|&rarr;)?\s*</i.test(src)) {
      bad('cta-verb', f + ': rogue verb as CTA label');
      return;
    }
    /* ENLIST as a bare CTA label — "Enlistment Ranks" prose is fine. */
    if (/>\s*ENLIST\s*(→|->|&rarr;)?\s*</i.test(src)) {
      bad('cta-verb', f + ': ENLIST as card CTA (must be DEPLOY)');
      return;
    }
    ok(f + ': CTA verbs clean (no donate / CONFIRM-pill / rogue verbs)');
  });
})();

/* ================= 6. kill switches ================= */
console.log('[6] kill switches');
(function () {
  var need = {
    'v1.4.3/games/peoples-cpi.js': ['peoples-cpi', 'peoples-cpi-chart', 'peoples-cpi-share'],
    'v1.4.3/games/inflation-tracker.js': ['inflation', 'inflation-checkin', 'inflation-board', 'inflation-trends'],
    'v1.4.3/games/economy-home.js': ['economy-home']
  };
  Object.keys(need).forEach(function (f) {
    var missing = need[f].filter(function (k) {
      return cpi[f].indexOf("PF.skip('" + k + "')") === -1;
    });
    if (!missing.length) ok(f + ': all kill switches present (' + need[f].join(', ') + ')');
    else bad('kill-switch', f + ' missing PF.skip for: ' + missing.join(', '));
  });
})();

/* ================= 7. fail-closed Data Strip ================= */
console.log('[7] fail-closed Data Strip');
(function () {
  var src = read(PATTERNS_JS);
  var sandbox = { window: { PF: { skip: function () { return false; } } } };
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: PATTERNS_JS });
  } catch (e) {
    bad('fail-closed', 'could not load 33-patterns.js in vm: ' + e.message);
    return;
  }
  var P = sandbox.window.PF.patterns;
  if (!P || typeof P.dataStrip !== 'function') { bad('fail-closed', 'PF.patterns.dataStrip not callable'); return; }
  var cases = [
    [{ figure: '102.4', label: 'L', source: 'S' }, '', 'missing updated'],
    [{ figure: '102.4', label: 'L', updated: 'now' }, '', 'missing source'],
    [{ figure: '', label: 'L', source: 'S', updated: 'now' }, '', 'blank figure'],
    [{ figure: '102.4', label: 'L', source: 'S', updated: 'now' }, 'non-empty', 'all four present']
  ];
  var failed = 0;
  cases.forEach(function (c) {
    var out = P.dataStrip(c[0]);
    var pass = c[1] === 'non-empty' ? (out && out.indexOf('102.4') !== -1) : (out === '');
    if (!pass) { failed++; console.error('    dataStrip case failed: ' + c[2]); }
  });
  if (!failed) ok('dataStrip fail-closed: refuses any figure missing label/source/recency (4/4 vm cases)');
  else bad('fail-closed', failed + ' dataStrip vm case(s) failed');
  /* Every CPI figure path routes through stripFigure and carries an honest fallback. */
  if (cpi['v1.4.3/games/peoples-cpi.js'].indexOf('missing its trust stamp') !== -1 &&
      cpi['v1.4.3/games/peoples-cpi.js'].indexOf('Figure withheld') !== -1)
    ok('peoples-cpi: honest fallback panels on strip refusal');
  else bad('fail-closed', 'peoples-cpi missing honest fallback on strip refusal');
  if (cpi['v1.4.3/games/inflation-tracker.js'].indexOf('Figure withheld') !== -1)
    ok('inflation-tracker: honest fallback panel on strip refusal');
  else bad('fail-closed', 'inflation-tracker missing honest fallback on strip refusal');
  /* P8 real-or-suppressed (vm): zero/negative count suppresses the line. */
  if (P.proof({ count: 0, text: 'reports this week' }) === '' &&
      P.proof({ count: 214, text: 'reports this week' }).indexOf('214') !== -1)
    ok('P8 proof: real count renders, zero count suppressed');
  else bad('fail-closed', 'P8 proof real-or-suppressed violated');
  /* REPORT BACK refuses the CONFIRM label (rogue-verb guard). */
  if (P.report('/x', 'REPORT BACK').indexOf('REPORT BACK') !== -1 &&
      P.report('/x', 'CONFIRM THIS PRICE') === '')
    ok('P3 report(): renders REPORT BACK, refuses CONFIRM labels');
  else bad('fail-closed', 'P3 report() guard violated');
})();

/* ================= 8. gray/white trends ================= */
console.log('[8] gray/white trends');
(function () {
  var badf = [];
  SOURCES.forEach(function (f) {
    if (/#c98f8f|#9fc98f/i.test(cpi[f])) badf.push(f + ' (red/green up/down tints)');
  });
  if (!badf.length) ok('no red/green up/down tints in CPI sources');
  else bad('trend-colors', badf.join(', '));
  var pc = cpi['v1.4.3/games/peoples-cpi.js'];
  if (pc.indexOf("stroke=\"' + RED + '\"") === -1) ok('peoples-cpi: no red chart strokes');
  else bad('trend-colors', 'peoples-cpi: red chart stroke remains');
  var it = cpi['v1.4.3/games/inflation-tracker.js'];
  if (!/height:' \+ hgt \+ 'px;background:#c1121f/.test(it)) ok('inflation-tracker: trend bars are not red');
  else bad('trend-colors', 'inflation-tracker: red trend bars remain');
  if (it.indexOf('stroke="#d8d0c0"') !== -1) ok('inflation-tracker: sparklines gray/white');
  else bad('trend-colors', 'inflation-tracker: sparkline stroke missing');
  if (pc.indexOf('stroke="#d8d0c0"') !== -1) ok('peoples-cpi: sparklines gray/white');
  else bad('trend-colors', 'peoples-cpi: sparkline stroke missing');
})();

/* ================= 9. trust-stamp structure ================= */
console.log('[9] trust-stamp structure');
(function () {
  [['v1.4.3/games/peoples-cpi.js'], ['v1.4.3/games/inflation-tracker.js']].forEach(function (pair) {
    var f = pair[0], src = cpi[f];
    var calls = count(src, /stripFigure\(\{/g);
    var updated = count(src, /updated:/g);
    if (calls > 0 && updated >= calls) ok(f + ': ' + calls + ' stripFigure call site(s), all pass updated:');
    else bad('trust-stamp', f + ': ' + calls + ' stripFigure sites but only ' + updated + ' updated: stamps');
    if (/\.proof\(\{\s*count:/.test(src)) ok(f + ': proof() called with a real count');
    else bad('trust-stamp', f + ': proof() not called with count:');
  });
})();

/* ================= 10. callsign gate + confirm path ================= */
console.log('[10] callsign gate');
(function () {
  var it = cpi['v1.4.3/games/inflation-tracker.js'];
  if (it.indexOf('You need a callsign to report') !== -1 &&
      /if\s*\(!id\.callsign\)/.test(it))
    ok('inflation-tracker: callsign gate intact on the report rail (frontend cannot bypass)');
  else bad('callsign-gate', 'callsign gate missing or weakened in inflation-tracker');
  if (it.indexOf('PF.presetInflationItem = function') !== -1)
    ok('inflation-tracker: PF.presetInflationItem exposed for one-tap confirms');
  else bad('callsign-gate', 'PF.presetInflationItem not exposed');
  if (cpi['v1.4.3/games/economy-home.js'].indexOf('pf-inflation-checkin\\/') !== -1)
    ok('economy-home: deep-link item suffix parsed');
  else bad('callsign-gate', 'economy-home deep-link item parsing missing');
})();

/* ================= 11. bundle presence ================= */
console.log('[11] bundle presence (minified)');
(function () {
  var missing = BUNDLES.filter(function (f) { return bundle[f] == null; });
  if (missing.length) { bad('bundles', 'not built: ' + missing.join(', ') + ' — run node build/bundle.js first'); return; }
  var b1 = bundle['v1.4.3/games/bundle-peoples-cpi.js'];
  var b2 = bundle['v1.4.3/games/bundle-economy.js'];
  /* NOTE: internal helper names (stripFigure) do not survive terser
     --mangle; the markers below are property accesses and string literals,
     which minification preserves. */
  [['bundle-peoples-cpi.js', b1, ['dataStrip', 'REPORT BACK', 'pf-cpi-hero']],
   ['bundle-economy.js', b2, ['dataStrip', 'presetInflationItem', 'data-confirm-item']]].forEach(function (t) {
    var absent = t[2].filter(function (m) { return t[1].indexOf(m) === -1; });
    if (!absent.length) ok(t[0] + ': teardown markers present in minified output');
    else bad('bundles', t[0] + ' missing markers: ' + absent.join(', '));
  });
})();

/* ================= 12. inner-script gate ================= */
console.log('[12] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-inner-scripts.js')].concat(
      SOURCES.map(function (f) { return path.join(ROOT, f); }), [__filename]),
    { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) ok('check-inner-scripts.js passes on the touched sources');
  else bad('inner-script gate', (r.stderr || r.stdout || 'failed').split('\n').slice(0, 5).join(' | '));
})();

console.log('\nRESULT: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.error('\nFAILURES:');
  failures.forEach(function (f) { console.error(' - ' + f); });
  process.exit(1);
}
console.log('ALL CHECKS GREEN');
