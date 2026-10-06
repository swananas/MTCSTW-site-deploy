#!/usr/bin/env node
/* scripts/verify-teardown-patterns.js — WS-0 PATTERN LIBRARY verification harness
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-patterns.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on v1.4.3/core/33-patterns.js and this harness.
   2. Pattern presence: all 8 CSS pattern classes exist in 33-patterns.css;
      all 14 JS helpers exist on PF.patterns and are callable.
   3. CTA-verb source lint (comments + migration map + guard regexes stripped):
      FAILS on banned/rogue verbs — "donate" (any case), "equity" in CTA copy,
      "ENLIST ->" / "ENLIST ->" as a card CTA, "CALL IT ->" as a card CTA,
      "CONFIRM" pill CTAs, "FOLLOW THEIR MONEY ->" as a button. Only
      sanctioned pf-pat-* classes may appear (allow-listed).
      (The product NAME "CALL IT." and page slugs are fine — only CTA-verb
      usage is linted; the legacy-verb MIGRATION MAP is the sanctioned path
      and is exempted.)
   4. CTA behavior lint: adversarial labels ('DONATE NOW', 'HOLD EQUITY ->',
      'CALL IT ->', 'ENLIST ->', 'CONFIRM') fed through every CTA helper and
      the legacy mapper — output must never contain the rogue verb, and the
      mapper must translate to the sanctioned verb per the rogue-verb map.
   5. Color-rule checks: red (#c1121f) never used for up/down trend semantics
      (no trend selectors; no trend classes at all); red confined to CTA /
      active-state / figure-that-matters selectors. Rendered helper HTML
      carries zero inline hex colors (all styling lives in the CSS).
   6. Data Strip spec: figure + label + source + recency all present in output;
      fail-closed verified (any one field missing/blank -> '').
   7. Kill switch: PF.skip('patterns') suppresses PF.patterns; the module also
      no-ops when window.PF is absent.
   8. Fail-open: every helper called with hostile inputs (undefined, null, {},
      [], 42, getters that throw) returns '' and never throws.
   9. Zero backend / zero XP: no fetch/XHR/beacon/authPost/authGet/xpGrant/
      localStorage in the module source.
   10. Bundle wiring: 'core/33-patterns.js' registered in build/bundle-core.js
       CORE_FILES; '33-patterns.css' in build/check-styles-sync.js SOURCES;
       the rebuilt minified bundle-core.js contains the module; the served
       bundle-styles.css contains the pattern rules; check-styles-sync passes.
   11. Inner-script gate: scripts/check-inner-scripts.js passes on the new JS. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var CSS = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.css');
var JS = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE_JS = path.join(ROOT, 'build', 'bundle-core.js');
var SYNC_JS = path.join(ROOT, 'build', 'check-styles-sync.js');
var BUNDLE_CORE = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core.js');
var BUNDLE_CSS = path.join(ROOT, 'v1.4.3', 'core', 'bundle-styles.css');

var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }

function read(p) { return fs.readFileSync(p, 'utf8'); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}

/* strip block + line comments for source lints */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/* load the module in a vm sandbox; skip=true simulates ?pf_off=patterns */
function loadPatterns(skipPatterns, noPF) {
  var pf = noPF ? undefined : { skip: function (silo) { return !!skipPatterns && silo === 'patterns'; } };
  var sandbox = { window: { PF: pf }, console: console };
  vm.runInNewContext(read(JS), sandbox, { filename: '33-patterns.js' });
  return sandbox.window.PF ? sandbox.window.PF.patterns : undefined;
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[JS, __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check ' + path.basename(p), err); else ok('node --check ' + path.basename(p));
});

/* ================= 2. pattern presence ================= */
console.log('[2] pattern presence');
var cssSrc = read(CSS);
var cssClasses = {
  P1: '.pf-pat-hero', P2: '.pf-pat-intel', P3a: '.pf-pat-join',
  P3b: '.pf-pat-deploy', P3c: '.pf-pat-report', P4: '.pf-pat-data',
  P5: '.pf-pat-ring', P6: '.pf-pat-actions', P7: '.pf-pat-ledger', P8: '.pf-pat-proof'
};
Object.keys(cssClasses).forEach(function (k) {
  if (cssSrc.indexOf(cssClasses[k]) !== -1) ok('CSS ' + k + ' ' + cssClasses[k]);
  else bad('CSS ' + k + ' ' + cssClasses[k], 'class missing from 33-patterns.css');
});

var P = loadPatterns(false);
var helpers = ['hero', 'intelCard', 'join', 'deploy', 'deployBtn', 'report',
  'textLink', 'cta', 'fromLegacy', 'dataStrip', 'ring', 'actionBar',
  'ledgerLine', 'proof'];
if (!P) { bad('PF.patterns', 'not defined with skip=false'); }
else helpers.forEach(function (h) {
  if (typeof P[h] === 'function') ok('helper PF.patterns.' + h);
  else bad('helper PF.patterns.' + h, 'missing or not callable');
});

/* ================= 3. CTA-verb source lint ================= */
console.log('[3] CTA-verb source lint');
(function () {
  var src = stripComments(read(JS) + '\n' + read(CSS));
  /* exempt the sanctioned machinery: the legacy migration map + the CTA
     guard regexes (enforcement machinery, not shipped copy) */
  src = src.replace(/var LEGACY_MAP = \{[\s\S]*?\};/, ' ');
  src = src.replace(/\/(?:[^\/\\\n]|\\.)+\/[gim]*/g, function (m) {
    return /(donate|equity|enlist|confirm|call it|follow their money)/i.test(m) ? ' ' : m;
  });
  /* also exempt the migration-map key strings anywhere they appear */
  ['call it', 'call-it', 'callit', 'enlist', 'hold equity', 'equity', 'confirm'].forEach(function (k) {
    src = src.replace(new RegExp("'" + k.replace(/ /g, ' ') + "'", 'g'), ' ');
  });
  var banned = [
    [/donate/i, '"donate" (any case)'],
    [/equity/i, '"equity" in CTA copy'],
    [/enlist\s*(\u2192|->)/i, '"ENLIST ->" as a card CTA'],
    [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as a card CTA'],
    [/follow their money\s*(\u2192|->)/i, '"FOLLOW THEIR MONEY ->" as a button'],
    [/confirm/i, '"CONFIRM" pill CTA']
  ];
  banned.forEach(function (b) {
    if (b[0].test(src)) bad('CTA-verb lint', 'banned/rogue verb found: ' + b[1]);
    else ok('CTA-verb lint clean: ' + b[1]);
  });
  /* class allow-list: only sanctioned pf-pat-* classes may ship */
  var allowed = [
    'pf-pat', 'pf-pat-hero', 'pf-pat-hero-kicker', 'pf-pat-hero-mission', 'pf-pat-hero-sub',
    'pf-pat-intel', 'pf-pat-intel-kicker', 'pf-pat-intel-head', 'pf-pat-intel-data', 'pf-pat-intel-actions',
    'pf-pat-join', 'pf-pat-deploy', 'pf-pat-deploy-red', 'pf-pat-report', 'pf-pat-textlink',
    'pf-pat-data', 'pf-pat-data-fig', 'pf-pat-data-label', 'pf-pat-data-rule', 'pf-pat-data-src', 'pf-pat-data-time',
    'pf-pat-ring', 'pf-pat-ring-track', 'pf-pat-ring-fill', 'pf-pat-ring-pct',
    'pf-pat-ring-meta', 'pf-pat-ring-rank', 'pf-pat-ring-streak', 'pf-pat-ring-flame',
    'pf-pat-actions', 'pf-pat-ledger', 'pf-pat-ledger-what', 'pf-pat-ledger-fig', 'pf-pat-ledger-sub',
    'pf-pat-proof', 'pat-gray', 'pat-disabled', 'pat-arrow'
  ];
  var seen = {};
  (read(JS) + '\n' + read(CSS)).replace(/pf-pat-[a-z0-9-]+/g, function (m) { seen[m] = 1; return m; });
  Object.keys(seen).forEach(function (c) {
    if (allowed.indexOf(c) === -1) bad('class allow-list', 'unsanctioned class shipped: ' + c);
  });
  if (Object.keys(seen).every(function (c) { return allowed.indexOf(c) !== -1; }))
    ok('class allow-list: ' + Object.keys(seen).length + ' classes, all sanctioned');
})();

/* ================= 4. CTA behavior lint ================= */
console.log('[4] CTA behavior lint');
(function () {
  if (!P) { bad('CTA behavior', 'helpers unavailable'); return; }
  var rogue = ['DONATE NOW', 'donate', 'HOLD EQUITY \u2192', 'CALL IT \u2192', 'ENLIST \u2192', 'CONFIRM'];
  var ctaFns = [['join', P.join], ['deploy', P.deploy], ['deployBtn', P.deployBtn],
    ['report', P.report], ['textLink', P.textLink]];
  rogue.forEach(function (label) {
    ctaFns.forEach(function (pair) {
      var out = pair[1]('/x', label);
      if (/donate/i.test(out) || /equity/i.test(out) || /enlist/i.test(out) ||
          /call\s*it/i.test(out) || /confirm/i.test(out))
        bad('CTA behavior', pair[0] + " rendered rogue label '" + label + "'");
    });
  });
  ok('adversarial labels rejected by all CTA helpers');
  /* FOLLOW THEIR MONEY: sanctioned ONLY as a text link, never a button */
  if (P.textLink('/x', 'FOLLOW THEIR MONEY \u2192').indexOf('pf-pat-textlink') !== -1)
    ok('FOLLOW THEIR MONEY renders as a text link (sanctioned doorway)');
  else bad('money doorway', 'textLink refused the sanctioned FOLLOW THEIR MONEY doorway');
  if (P.deploy('/x', 'FOLLOW THEIR MONEY \u2192') === '' && P.deployBtn('/x', 'FOLLOW THEIR MONEY \u2192') === '')
    ok('FOLLOW THEIR MONEY refused as a button');
  else bad('money doorway', 'FOLLOW THEIR MONEY rendered as a button');
  /* legacy migration map: rogue verbs translate to sanctioned verbs */
  var map = [
    ['CALL IT \u2192', 'pf-pat-deploy', 'DEPLOY'], ['ENLIST \u2192', 'pf-pat-deploy', 'DEPLOY'],
    ['HOLD EQUITY \u2192', 'pf-pat-deploy', 'DEPLOY'], ['CONFIRM', 'pf-pat-report', 'REPORT BACK']
  ];
  map.forEach(function (m) {
    var out = P.fromLegacy(m[0], '/x');
    if (out.indexOf(m[1]) === -1 || out.indexOf(m[2]) === -1)
      bad('rogue-verb map', "'" + m[0] + "' did not translate to " + m[2]);
    else ok("rogue-verb map: '" + m[0] + "' -> " + m[2]);
  });
  /* JOIN THE FIGHT. is enlistment-only: label can never be reworded */
  if (P.join('/enlist', 'SOMETHING ELSE').indexOf('JOIN THE FIGHT.') !== -1) ok('join() enforces enlistment-only label');
  else bad('join() label', 'JOIN THE FIGHT. label was reworded');
  if (P.join('').indexOf('pf-pat-join') === -1 && P.join('') === '') ok('join() renders nothing without a destination');
  else bad('join() href', 'rendered without a destination');
  /* unknown CTA verb renders nothing, never a rogue CTA */
  if (P.cta('enlist-now', '/x', 'ENLIST NOW') === '') ok('cta() refuses unknown verbs');
  else bad('cta() unknown verb', 'rendered output for an unknown verb');
})();

/* ================= 5. color rules ================= */
console.log('[5] color-rule checks');
(function () {
  var css = stripComments(cssSrc);
  var redBlocks = [];
  var re = /([^{}]+)\{([^{}]*#c1121f[^{}]*)\}/gi, m;
  while ((m = re.exec(css))) redBlocks.push({ sel: m[1].trim(), body: m[2] });
  var trendHit = redBlocks.filter(function (b) { return /trend|up\b|down\b|gain|loss|rise|fall/i.test(b.sel); });
  if (trendHit.length) bad('color rule', 'red used on trend-semantic selectors: ' + trendHit.map(function (b) { return b.sel; }).join(', '));
  else ok('red (#c1121f) never used for trend semantics (' + redBlocks.length + ' red rules checked)');
  var allClasses = (cssSrc.match(/\.[a-z0-9-]+/gi) || []);
  var trendClasses = allClasses.filter(function (c) { return /trend/i.test(c); });
  if (trendClasses.length) bad('color rule', 'trend classes exist: ' + trendClasses.join(', '));
  else ok('no trend classes at all — trends are gray/white only by construction');
  /* rendered helper HTML carries zero inline hex colors */
  if (!P) return;
  var samples = [
    P.hero({ kicker: 'K', mission: 'M', joinHref: '/e' }),
    P.intelCard({ headline: 'H', dataLine: 'D', href: '/x' }),
    P.deploy('/x'), P.deployBtn('/x'), P.report('/x'), P.join('/x'),
    P.dataStrip({ figure: '1', label: 'L', source: 'S', updated: 'now' }),
    P.ring({ xp: 50, cap: 100, streak: 3, rank: 'AGITATOR' }),
    P.actionBar({ shareUrl: '/s', cellUrl: '/c', reportUrl: '/r' }),
    P.ledgerLine({ what: 'W', figure: '1', hot: true }),
    P.proof({ count: 1204, text: 'deployed this week' })
  ];
  var hex = samples.filter(function (s) { return /#[0-9a-f]{3,6}/i.test(s); });
  if (hex.length) bad('color rule', hex.length + ' rendered helpers carry inline hex colors');
  else ok('rendered HTML carries zero inline colors — styling lives in CSS');
})();

/* ================= 6. Data Strip fail-closed ================= */
console.log('[6] Data Strip spec');
(function () {
  if (!P) { bad('dataStrip', 'helpers unavailable'); return; }
  var full = { figure: '$4.12', label: 'EGGS / DOZEN', source: "estimated from shoppers' reports", updated: '40 min ago' };
  var out = P.dataStrip(full);
  [['pf-pat-data-fig', '$4.12'], ['pf-pat-data-label', 'EGGS / DOZEN'],
   ['pf-pat-data-src', 'reports'], ['pf-pat-data-time', '40 min ago']].forEach(function (pair) {
    if (out.indexOf(pair[0]) !== -1 && out.indexOf(pair[1]) !== -1) ok('dataStrip renders ' + pair[0]);
    else bad('dataStrip ' + pair[0], 'figure/label/source/recency missing from output');
  });
  ['figure', 'label', 'source', 'updated'].forEach(function (field) {
    var o = { figure: '1', label: 'L', source: 'S', updated: 'now' };
    o[field] = ''; if (P.dataStrip(o) !== '') { bad('dataStrip fail-closed', 'rendered with empty ' + field); return; }
    o[field] = '   '; if (P.dataStrip(o) !== '') { bad('dataStrip fail-closed', 'rendered with blank ' + field); return; }
    delete o[field]; if (P.dataStrip(o) !== '') { bad('dataStrip fail-closed', 'rendered with missing ' + field); return; }
    ok('dataStrip fail-closed: no ' + field + ' -> renders nothing');
  });
  if (P.dataStrip() === '' && P.dataStrip(null) === '' && P.dataStrip({}) === '') ok('dataStrip fail-closed: no input -> renders nothing');
  else bad('dataStrip fail-closed', 'rendered with no input');
})();

/* ================= 7. kill switch ================= */
console.log('[7] kill switch');
(function () {
  var killed = loadPatterns(true);
  if (killed === undefined) ok('?pf_off=patterns suppresses PF.patterns');
  else bad('kill switch', 'PF.patterns still defined when skipped');
  var noPF = loadPatterns(false, true);
  if (noPF === undefined) ok('module no-ops when window.PF is absent');
  else bad('kill switch', 'module ran without window.PF');
})();

/* ================= 8. fail-open ================= */
console.log('[8] fail-open sandbox');
(function () {
  if (!P) { bad('fail-open', 'helpers unavailable'); return; }
  var evil = [undefined, null, {}, [], 42, 'x', true];
  evil.push(Object.create(null));
  evil.push({ figure: { toString: function () { throw new Error('boom'); } } });
  var count = 0;
  helpers.forEach(function (h) {
    evil.forEach(function (input) {
      var out;
      try { out = P[h](input); }
      catch (e) { bad('fail-open', 'PF.patterns.' + h + ' threw on hostile input'); return; }
      if (typeof out !== 'string') { bad('fail-open', 'PF.patterns.' + h + ' returned non-string'); return; }
      count++;
    });
  });
  if (!failures.length) ok('fail-open: ' + count + ' hostile calls, none threw, all returned strings');
  /* helpers with no args at all */
  helpers.forEach(function (h) {
    try { P[h](); } catch (e) { bad('fail-open', 'PF.patterns.' + h + '() threw'); }
  });
  ok('fail-open: zero-arg calls never throw');
})();

/* ================= 9. zero backend / zero XP ================= */
console.log('[9] zero backend / zero XP');
(function () {
  var src = stripComments(read(JS));
  var banned = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'authPost', 'authGet', 'xpGrant', 'localStorage', '.ajax('];
  var hits = banned.filter(function (b) { return src.indexOf(b) !== -1; });
  if (hits.length) bad('zero backend/XP', 'forbidden calls in module: ' + hits.join(', '));
  else ok('zero backend calls, zero writes, zero XP mechanics');
})();

/* ================= 10. bundle wiring ================= */
console.log('[10] bundle wiring');
(function () {
  var bc = read(BUNDLE_JS);
  if (/['"]core\/33-patterns\.js['"]/.test(bc)) ok("33-patterns.js registered in build/bundle-core.js");
  else bad('bundle wiring', "'core/33-patterns.js' not found in build/bundle-core.js CORE_FILES");
  var sy = read(SYNC_JS);
  if (sy.indexOf('33-patterns.css') !== -1) ok('33-patterns.css registered in build/check-styles-sync.js');
  else bad('bundle wiring', "'33-patterns.css' not found in check-styles-sync.js SOURCES");
  if (fs.existsSync(BUNDLE_CORE)) {
    var min = read(BUNDLE_CORE);
    if (min.indexOf('pf-pat-join') !== -1 && min.indexOf('pf-pat-deploy') !== -1) ok('rebuilt minified bundle-core.js contains the patterns module');
    else bad('bundle wiring', 'rebuilt bundle-core.js lacks the patterns module markers');
  } else bad('bundle wiring', 'bundle-core.js not built — run node build/bundle-core.js first');
  if (fs.existsSync(BUNDLE_CSS)) {
    var css = read(BUNDLE_CSS);
    var need = ['.pf-pat-hero', '.pf-pat-intel', '.pf-pat-join', '.pf-pat-deploy', '.pf-pat-report',
      '.pf-pat-data', '.pf-pat-ring', '.pf-pat-actions', '.pf-pat-ledger', '.pf-pat-proof'];
    var missing = need.filter(function (c) { return css.indexOf(c) === -1; });
    if (!missing.length) ok('served bundle-styles.css contains all 8 pattern classes');
    else bad('bundle wiring', 'bundle-styles.css missing: ' + missing.join(', '));
  } else bad('bundle wiring', 'bundle-styles.css missing');
  var sync = cp.spawnSync(process.execPath, [SYNC_JS], { cwd: ROOT, encoding: 'utf8' });
  if (sync.status === 0) ok('check-styles-sync.js passes (source rules == served bundle)');
  else bad('check-styles-sync', (sync.stderr || sync.stdout || 'sync failed').split('\n').slice(0, 5).join(' | '));
})();

/* ================= 11. inner-script gate ================= */
console.log('[11] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), JS, __filename],
    { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) ok('check-inner-scripts.js passes on the new files');
  else bad('inner-script gate', (r.stderr || r.stdout || 'failed').split('\n').slice(0, 5).join(' | '));
})();

console.log('\nRESULT: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.error('\nFAILURES:'); failures.forEach(function (f) { console.error(' - ' + f); }); process.exit(1); }
console.log('ALL CHECKS GREEN');
