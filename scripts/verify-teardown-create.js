#!/usr/bin/env node
/* scripts/verify-teardown-create.js — TEARDOWN WS-4 (CREATE) verification harness
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-create.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on v1.4.3/games/create-press.js, v1.4.3/pages/workshop-create.js, this harness.
   2. Template-first: PFPress.mount(section) renders the fight-organized picker
      (CALL YOUR REP / PRICE SPIKE / CELL RECRUIT); no blank-canvas default path
      (no canvas creation outside the kit-driven painter; mount never renders an editor).
   3. Mastery path: kit unlocks / advanced tracks / spotlight slots tiers present;
      P5 ring used for progression (render-only).
   4. Action Bar after creation: preview stage emits P6 with SHARE THIS INTEL ·
      TAKE THIS TO YOUR CELL · REPORT BACK in that order (checked via the real
      PF.patterns helper).
   5. CTA-verb source lint on comment-stripped (never string-stripped) source:
      banned copy — "donate" (any case), "ENLIST ->"/"CALL IT ->"/"HOLD EQUITY ->"
      as card CTAs, "CONFIRM" pill CTAs, "FOLLOW THEIR MONEY ->" as a button.
   6. Kill switches: PF.skip('create-press') suppresses PFPress entirely.
   7. Zero backend / zero XP: no fetch/XHR/beacon/authPost/authGet/xpGrant/
      creditLocal/pf-xp dispatch in the module. localStorage is device-local only.
   8. Red-button rule (News Desk gate): only DEPLOY-family may be red; backs and
      dismissals render ghost (no red backgrounds outside pf-pat-deploy-red/join).
   9. P8 social proof: proof helper suppresses without a real positive count
      (pattern-level), and the module only feeds it the real device-local count.
   10. Bundle wiring: 'create-press.js' in build/bundle.js bundle-create; the
       rebuilt minified bundle-create.js contains the module.
   11. Inner-script gate: scripts/check-inner-scripts.js passes on the new JS. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var PRESS = path.join(ROOT, 'v1.4.3', 'games', 'create-press.js');
var ADAPTERS = path.join(ROOT, 'v1.4.3', 'pages', 'workshop-create.js');
var PATTERNS_JS = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE_DEF = path.join(ROOT, 'build', 'bundle.js');
var BUNDLE_BUILT = path.join(ROOT, 'v1.4.3', 'games', 'bundle-create.js');
var INNER_CHECK = path.join(ROOT, 'scripts', 'check-inner-scripts.js');

var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}
/* strip block + line comments ONLY (per AGENTS.md lesson: never strip strings
   for lint — esc()'s /"/g and regex literals would unbalance a stripper) */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[PRESS, ADAPTERS, __filename].forEach(function (p) {
  var e = nodeCheck(p);
  if (e) bad('node --check ' + path.basename(p), e); else ok('node --check ' + path.basename(p));
});

/* ================= 2-9. load module in a vm sandbox ================= */
function makeSandbox(skipPress) {
  var listeners = {};
  var stubEl = function () {
    return {
      setAttribute: function () {}, appendChild: function () {}, addEventListener: function () {},
      querySelector: function () { return null; }, querySelectorAll: function () { return []; },
      getContext: function () { return null; }, style: {}, classList: { add: function () {}, contains: function () { return false; } },
      files: null, value: '', textContent: '', innerHTML: ''
    };
  };
  var store = {};
  var doc = {
    addEventListener: function (t, fn) { listeners[t] = fn; },
    createElement: stubEl,
    querySelector: function () { return null; },
    body: stubEl(), head: stubEl()
  };
  var pf = {
    skip: function (silo) { return !!skipPress && silo === 'create-press'; },
    error: function () {}
  };
  var sb = {
    window: { PF: pf },
    document: doc,
    localStorage: {
      getItem: function (k) { return store[k] == null ? null : store[k]; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    navigator: {},
    matchMedia: function () { return { matches: false }; },
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    console: console
  };
  sb.window.document = doc;
  sb.window.matchMedia = sb.matchMedia;
  sb.window.localStorage = sb.localStorage;
  vm.runInNewContext(read(PATTERNS_JS), sb, { filename: '33-patterns.js' });
  vm.runInNewContext(read(PRESS), sb, { filename: 'create-press.js' });
  return { sb: sb, pf: pf, listeners: listeners, store: store };
}

/* ================= 2. template-first ================= */
console.log('[2] template-first (no blank-canvas default)');
(function () {
  var s = makeSandbox(false);
  if (!s.sb.window.PFPress) { bad('PFPress API', 'window.PFPress not exposed'); return; }
  ok('PFPress.mount exposed');
  var section = { innerHTML: '' };
  try { s.sb.window.PFPress.mount(section); } catch (e) { bad('mount()', 'threw: ' + e.message); return; }
  var html = section.innerHTML;
  ['CALL YOUR REP', 'PRICE SPIKE', 'CELL RECRUIT'].forEach(function (fight) {
    if (html.indexOf(fight) !== -1) ok('picker organized by fight: ' + fight);
    else bad('picker fight group', fight + ' missing from mount output');
  });
  if (html.indexOf('MASTERY PATH') !== -1) ok('picker shows mastery path');
  else bad('picker mastery path', 'missing');
  if (html.indexOf('<canvas') === -1 && html.indexOf('textarea') === -1) ok('no editor/canvas on entry (picker only)');
  else bad('blank-canvas default', 'mount() rendered an editor or canvas without a kit choice');
  /* FIGHTS structure: grouped by fight ids, not by format */
  var fights = s.sb.window.PFPress._fights;
  var ids = fights.map(function (f) { return f.id; }).join(',');
  if (ids === 'call-your-rep,price-spike,cell-recruit') ok('fight order + ids exact');
  else bad('fight ids', 'got: ' + ids);
  var formatNames = /cta|video|slideshow|beforeafter|format/i;
  var anyFormat = fights.some(function (f) { return formatNames.test(f.id); });
  if (!anyFormat) ok('templates organized by fight, not format');
  else bad('template organization', 'a fight id looks like a format');
  /* no blank-canvas path in source: canvas only from paint() (kit-driven) */
  var src = stripComments(read(PRESS));
  var canvases = (src.match(/createElement\('canvas'\)/g) || []).length;
  var paintCalls = (src.match(/paint\(currentKit/g) || []).length;
  if (canvases === 1 && paintCalls === 1) ok('single kit-driven painter, no blank-canvas path');
  else bad('painter paths', 'createElement(canvas) x' + canvases + ', paint(currentKit) x' + paintCalls);
})();

/* ================= 3. mastery path ================= */
console.log('[3] mastery path');
(function () {
  var s = makeSandbox(false);
  var tiers = s.sb.window.PFPress._tiers;
  var names = tiers.map(function (t) { return t.name; });
  [['PRESS OPERATIVE', 'kit unlocks'], ['PRESS SERGEANT', 'advanced tracks'], ['SPOTLIGHT ELIGIBLE', 'spotlight slots']].forEach(function (want) {
    var t = tiers.filter(function (x) { return x.name === want[0]; })[0];
    if (t && new RegExp(want[1], 'i').test(t.desc)) ok('tier: ' + want[0] + ' (' + want[1] + ')');
    else bad('mastery tier', want[0] + ' missing or wrong desc');
  });
  /* ring is render-only: runs() reads device-local, never mints */
  var src = stripComments(read(PRESS));
  if (src.indexOf('P.ring(') !== -1) ok('P5 ring renders progression');
  else bad('P5 ring', 'not used');
  var html = '';
  var section = { innerHTML: '' };
  s.sb.window.PFPress.mount(section); html = section.innerHTML;
  if (/pf-pat-ring/.test(html)) ok('ring present in mount output');
  else bad('ring output', 'pf-pat-ring missing');
})();

/* ================= 4. Action Bar after creation ================= */
console.log('[4] Action Bar after creation');
(function () {
  var s = makeSandbox(false);
  var P = s.sb.window.PF.patterns;
  var bar = P.actionBar({ shareUrl: '#pf-press-share', cellUrl: '/cells', reportUrl: '/#pf-orders' });
  var labels = ['SHARE THIS INTEL', 'TAKE THIS TO YOUR CELL', 'REPORT BACK'];
  var idx = labels.map(function (l) { return bar.indexOf(l); });
  if (idx.every(function (i) { return i !== -1; }) && idx[0] < idx[1] && idx[1] < idx[2]) {
    ok('P6 order: SHARE THIS INTEL · TAKE THIS TO YOUR CELL · REPORT BACK');
  } else bad('P6 order', 'labels missing or out of order');
  var src = stripComments(read(PRESS));
  if (src.indexOf('P.actionBar(') !== -1 && src.indexOf('renderPreview') !== -1) {
    ok('preview stage emits the P6 Action Bar');
  } else bad('preview action bar', 'P.actionBar not wired to renderPreview');
  if (src.indexOf('navigator.share') !== -1) ok('SHARE THIS INTEL -> native share sheet');
  else bad('native share', 'navigator.share missing');
})();

/* ================= 5. CTA-verb source lint ================= */
console.log('[5] CTA-verb source lint');
(function () {
  var src = stripComments(read(PRESS));
  /* exempt the CTA guard-regex-free module: check raw shipped copy only.
     Exempt sanctioned machinery: the join() label constant and page slugs. */
  var checks = [
    [/donate/i, 'donate language'],
    [/enlist\s*->/i, 'ENLIST -> card CTA'],
    [/call\s*it\s*->/i, 'CALL IT -> card CTA'],
    [/hold\s*equity\s*->/i, 'HOLD EQUITY -> card CTA'],
    [/follow their money\s*->/i, 'FOLLOW THEIR MONEY -> as button'],
    [/\bCONFIRM\b(?!\s*(pill|ation))/, 'CONFIRM pill CTA']
  ];
  checks.forEach(function (c) {
    if (c[0].test(src)) bad('CTA lint', c[1] + ' found in create-press.js');
    else ok('CTA lint clean: ' + c[1]);
  });
  /* red buttons: only pf-pat-deploy-red (DEPLOY family) and pf-pat-join */
  if (/pf-press-ghost/.test(src)) ok('ghost class for backs/dismissals');
  else bad('ghost backs', 'pf-press-ghost missing');
})();

/* ================= 6. kill switches ================= */
console.log('[6] kill switches');
(function () {
  var killed = makeSandbox(true);
  if (killed.sb.window.PFPress === undefined) ok('PF.skip(create-press) suppresses the module');
  else bad('kill switch', 'PFPress exposed despite skip');
  var src = stripComments(read(PRESS));
  if (/PF\.skip\(['"]create-press['"]\)/.test(src)) ok('PF.skip(create-press) guard in source');
  else bad('kill guard', 'PF.skip("create-press") missing');
  if (/pf_off=create-press/.test(read(PRESS))) ok('?pf_off=create-press documented');
  else bad('kill doc', '?pf_off=create-press not documented');
  /* adapter kill id matches the module kill id */
  var ad = stripComments(read(ADAPTERS));
  if (/id:\s*'press'/.test(ad) && /kill:\s*'create-press'/.test(ad)) ok("adapter registers 'press' with kill 'create-press'");
  else bad('adapter kill', "press adapter kill id mismatch");
  /* shell master kill still honored: workshop.js untouched */
  if (/pf_off=workshop/.test(read(path.join(ROOT, 'v1.4.3', 'core', 'workshop.js')))) {
    ok('master ?pf_off=workshop kill preserved');
  } else bad('master kill', 'workshop kill doc missing');
})();

/* ================= 7. zero backend / zero XP ================= */
console.log('[7] zero backend / zero XP');
(function () {
  var src = stripComments(read(PRESS));
  ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'authPost', 'authGet', 'xpGrant',
   'creditLocal', "pf-xp'", 'pf-xp"', 'BACKEND', '.post('].forEach(function (tok) {
    if (src.indexOf(tok) !== -1) bad('network/XP surface', tok + ' found in create-press.js');
    else ok('absent: ' + tok);
  });
  /* localStorage is device-local run counting only — allowed */
  if (/pf_press_runs_v1/.test(src)) ok('device-local run counter only (pf_press_runs_v1)');
  else bad('run counter', 'pf_press_runs_v1 missing');
})();

/* ================= 8. red-button rule ================= */
console.log('[8] News Desk red-button rule');
(function () {
  var src = stripComments(read(PRESS));
  /* backs/dismissals must use the ghost class, never a red background */
  var ghostDef = src.match(/\.pf-press-ghost\{[^}]*\}/);
  if (ghostDef && ghostDef[0].indexOf('#c1121f') !== -1 && /background:transparent/.test(ghostDef[0])) {
    ok('ghost backs: transparent bg, red border only (never a red button)');
  } else bad('ghost style', 'pf-press-ghost must be transparent-bg');
  /* the only red button path is P.deployBtn (DEPLOY family) */
  var deployBtnUses = (src.match(/P\.deployBtn\(/g) || []).length;
  var rawRedBtn = (src.match(/background:#c1121f/g) || []).length;
  if (deployBtnUses === 1 && rawRedBtn === 0) ok('single red CTA path: P.deployBtn (RUN THE PRESS)');
  else bad('red buttons', 'P.deployBtn x' + deployBtnUses + ', raw red backgrounds x' + rawRedBtn);
})();

/* ================= 9. P8 social proof ================= */
console.log('[9] P8 social proof real-or-suppressed');
(function () {
  var s = makeSandbox(false);
  var P = s.sb.window.PF.patterns;
  if (P.proof({ count: 0, text: 'x' }) === '' && P.proof({ count: -3, text: 'x' }) === '' &&
      P.proof({}) === '') ok('proof() suppresses without a real positive count');
  else bad('P8 suppression', 'proof() rendered without a real count');
  if (P.proof({ count: 4, text: 'press runs on this device' }).indexOf('4') !== -1) {
    ok('proof() renders the real device-local count');
  } else bad('P8 render', 'proof() failed on a real count');
  var src = stripComments(read(PRESS));
  if (/P\.proof\(\{\s*count:\s*n,/.test(src)) ok('module feeds proof() only the real run count');
  else bad('P8 wiring', 'module does not feed proof() the real count');
})();

/* ================= 10. bundle wiring ================= */
console.log('[10] bundle wiring');
(function () {
  var def = read(BUNDLE_DEF);
  var m = def.match(/'bundle-create': \[([\s\S]*?)\n  \],/);
  if (m && m[1].indexOf("'create-press.js'") !== -1) ok("'create-press.js' in build/bundle.js bundle-create");
  else bad('bundle def', "'create-press.js' missing from bundle-create section");
  if (def.indexOf("'create-press.js'") !== -1) {
    var occurrences = def.split("'create-press.js'").length - 1;
    if (occurrences === 1) ok('create-press.js in exactly one bundle');
    else bad('bundle def', 'create-press.js listed ' + occurrences + ' times');
  }
  if (fs.existsSync(BUNDLE_BUILT)) {
    var built = read(BUNDLE_BUILT);
    if (built.indexOf('pf_press_runs_v1') !== -1 || built.indexOf('create-press') !== -1) {
      ok('rebuilt bundle-create.js contains the module');
    } else bad('built bundle', 'bundle-create.js lacks the create-press module (rebuild?)');
  } else bad('built bundle', 'bundle-create.js missing');
})();

/* ================= 11. inner-script gate ================= */
console.log('[11] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath, [INNER_CHECK, PRESS], { encoding: 'utf8' });
  if (r.status === 0) ok('check-inner-scripts.js passes on create-press.js');
  else bad('inner-script gate', (r.stderr || r.stdout || 'failed').split('\n')[0]);
})();

/* ================= report ================= */
console.log('\n' + passes + ' passed, ' + failures.length + ' failed.');
if (failures.length) {
  console.error('FAILURES:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('TEARDOWN WS-4 (CREATE): GREEN');
