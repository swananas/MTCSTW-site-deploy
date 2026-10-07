#!/usr/bin/env node
/* scripts/verify-one-prompt.js — One-Prompt onboarding verification
   (fe/one-prompt-onboarding, 2026-10-06).
   Run from the worktree root: node scripts/verify-one-prompt.js
   1. node --check on new/changed files
   2. Static checks: kill switches, zero XP / zero backend writes in the new
      module, once-ever persistence keys, auto-fire kills in the six edited
      modules, iOS install gate, queue wiring present
   3. vm runtime tests: PF.popupQueue one-at-a-time, session budget cap,
      one-prompt exemption, idempotent release, graceful degrade
   Exits 0 when every check passes, 1 with a failure list otherwise. */
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
function has(p, s) { return read(p).indexOf(s) !== -1; }
function hasNot(p, s) { return read(p).indexOf(s) === -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function codeHas(p, s) { return stripComments(read(p)).indexOf(s) !== -1; }
function codeHasNot(p, s) { return stripComments(read(p)).indexOf(s) === -1; }

var NEW = 'v1.4.3/core/37-one-prompt.js';
var EDITED = [
  'v1.4.3/games/guided-onboarding.js',
  'v1.4.3/core/31-pillars.js',
  'v1.4.3/core/24-first-minute.js',
  'v1.4.3/core/10-convert.js',
  'v1.4.3/core/13-flow.js',
  'v1.4.3/pwa/install.js',
  'build/bundle-core.js'
];

console.log('== 1. node --check ==');
[NEW].concat(EDITED).forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
/* kill switch */
if (has(NEW, "PF.skip('one-prompt')") && has(NEW, '?pf_off=one-prompt')) ok('kill switch (one-prompt)');
else no('kill switch', 'PF.skip(one-prompt) or doc missing');
/* zero XP / zero backend writes in the new module (comment-stripped: the
   header documents the REUSED +20 enlisted leg, it must not mint it) */
var srcCode = stripComments(read(NEW));
var badTokens = ['xpGrant', 'xp_ledger', 'postAction', 'fetch(', 'XMLHttpRequest'];
var leaked = badTokens.filter(function (t) { return srcCode.indexOf(t) !== -1; });
if (!leaked.length) ok('zero XP / zero backend writes in 37-one-prompt.js');
else no('economy leak', 'found: ' + leaked.join(', '));
/* measurement-only events present */
if (has(NEW, 'pf-oneprompt-shown') && has(NEW, 'pf-oneprompt-claim') && has(NEW, 'pf-oneprompt-dismissed'))
  ok('measurement events (shown/claim/dismissed)');
else no('measurement events', 'missing one-prompt events');
/* once-ever persistence */
if (has(NEW, 'pf_oneprompt_v1') && has(NEW, 'pf_checklist_v1')) ok('once-ever keys (prompt + checklist)');
else no('once-ever keys', 'missing pf_oneprompt_v1 / pf_checklist_v1');
/* claim runs the EXISTING flow, no new claim machinery (comment-stripped) */
if (codeHas(NEW, 'PF.requireCallsign') && codeHasNot(NEW, 'register(') && codeHasNot(NEW, '.register'))
  ok('claim via existing PF.requireCallsign');
else no('claim flow', 'must reuse PF.requireCallsign, no new register machinery');
/* recovery link on the claim prompt (CEO directive 2026-10-06) */
if (has(NEW, 'recoverLinkHTML')) ok('recovery path on claim prompt');
else no('recovery path', 'PF.recoverLinkHTML missing');

/* auto-fire kills */
/* guided-onboarding: no auto-launch timer in the launch section (the
   remaining setTimeouts are user-initiated: mission scroll on tap) */
var _goFull = stripComments(read('v1.4.3/games/guided-onboarding.js'));
var _goLaunch = _goFull.split('---------- launch')[1] || '';
if (_goLaunch.indexOf('setTimeout') === -1 && _goFull.indexOf('AUTO_MS') === -1 &&
    has('v1.4.3/games/guided-onboarding.js', 'NEW HERE'))
  ok('guided-onboarding: auto-launch killed, chip kept');
else no('guided-onboarding kill', 'auto-launch remnants or chip missing');
var _pil = read('v1.4.3/core/31-pillars.js');
var _mfr = _pil.match(/function maybeFirstRun\(\) \{[\s\S]*?\n  \}/);
if (_mfr && _mfr[0].indexOf('openChooser') === -1 &&
    has('v1.4.3/core/31-pillars.js', 'openChooser: openChooser'))
  ok('pillars: chooser auto-fire killed, tap API kept');
else no('pillars kill', 'maybeFirstRun still opens chooser or API dropped');
if (has('v1.4.3/core/24-first-minute.js', "PF.skip('one-prompt')"))
  ok('first-minute: stands down while one-prompt active');
else no('first-minute kill', 'one-prompt gate missing');
if (has('v1.4.3/core/10-convert.js', 'return false; /* one-prompt owns the callsign ask */') &&
    has('v1.4.3/core/10-convert.js', 'lapCount>=1'))
  ok('convert: nudge killed, victory lap max 1/session');
else no('convert kill', 'nudge alive or lap cap not demoted');
if (hasNot('v1.4.3/core/13-flow.js', "addEventListener('pf-xp'") &&
    has('v1.4.3/core/13-flow.js', 'NEXT UP'))
  ok('flow: floating chip removed, inline strips kept');
else no('flow kill', 'chip listener alive or strips broken');
var _ins = read('v1.4.3/pwa/install.js');
if (_ins.indexOf('pf_pwa_visits_v1') !== -1 &&
    _ins.indexOf('pf_pwa_engaged_v1') !== -1 &&
    _ins.indexOf('iosTryShow') !== -1 &&
    !/addEventListener\('load', function \(\) \{\s*setTimeout/.test(_ins))
  ok('install: iOS button gated on 2nd visit / engagement');
else no('install gate', 'visit/engagement gate missing or bare t+4s load timer remains');
/* build registration */
if (has('build/bundle-core.js', "'core/37-one-prompt.js'")) ok('build: 37-one-prompt.js registered');
else no('build registration', 'missing from build/bundle-core.js');
/* built bundle ships the module */
try {
  var bc = read('v1.4.3/core/bundle-core.js');
  if (bc.indexOf('pfOnePromptDone') !== -1) ok('built bundle-core.js ships one-prompt');
  else no('built bundle', 'pfOnePromptDone marker missing from bundle-core.js');
} catch (e) { no('built bundle', 'bundle-core.js unreadable'); }
/* queue wiring in the edited modules */
[['v1.4.3/games/guided-onboarding.js', 'guided-onboarding'],
 ['v1.4.3/core/31-pillars.js', 'pillars-chooser'],
 ['v1.4.3/core/10-convert.js', 'convert-card']].forEach(function (p) {
  if (has(p[0], "PF.popupQueue") && has(p[0], p[1])) ok('queue wired: ' + p[1]);
  else no('queue wiring', p[1] + ' not wired in ' + p[0]);
});
/* rites untouched (own arbitration, intentionally separate) */
if (hasNot('v1.4.3/core/rites.js', 'popupQueue')) ok('rites: own arbitration untouched');
else no('rites', 'rites.js should keep its own arbitration');

console.log('== 3. vm runtime: PF.popupQueue ==');
function loadQueue() {
  var store = {};
  var sstore = {};
  var sandbox = {
    window: {},
    document: {
      getElementById: function () { return null; },
      addEventListener: function () {},
      createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {} }; },
      body: { appendChild: function () {} }
    },
    localStorage: {
      getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: {
      getItem: function (k) { return sstore.hasOwnProperty(k) ? sstore[k] : null; },
      setItem: function (k, v) { sstore[k] = String(v); },
      removeItem: function (k) { delete sstore[k]; }
    },
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    console: console
  };
  sandbox.window.PF = { skip: function () { return false; } };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.document = sandbox.document;
  sandbox.PF = sandbox.window.PF;
  sandbox.localStorage = sandbox.localStorage;
  sandbox.sessionStorage = sandbox.sessionStorage;
  sandbox.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(read(NEW), sandbox, { filename: '37-one-prompt.js' });
  return sandbox.window.PF.popupQueue;
}
try {
  /* one-at-a-time + release (fresh queue) */
  var q1 = loadQueue();
  if (!q1) { no('queue boot', 'PF.popupQueue undefined'); }
  else {
    ok('queue boot');
    var a1 = q1.request('a', 'auto'), a2 = q1.request('b', 'auto');
    if (a1 && !a2) ok('one-at-a-time (second denied)');
    else no('one-at-a-time', 'a=' + a1 + ' b=' + a2);
    q1.release('a');
    var a3 = q1.request('b', 'auto');
    if (a3) ok('release frees the lock');
    else no('release', 'lock not freed');
    q1.release('b');
    q1.release('b'); q1.release('nope');
    if (q1.request('c', 'auto')) ok('idempotent release (no crash, lock reusable)');
    else no('idempotent release', 'lock stuck after double release');
  }
  /* session budget: 3 auto-fire max, 4th denied (fresh queue) */
  var q2 = loadQueue();
  if (q2) {
    var r1 = q2.request('y1', 'auto'); q2.release('y1');
    var r2 = q2.request('y2', 'auto'); q2.release('y2');
    var r3 = q2.request('y3', 'auto'); q2.release('y3');
    var r4 = q2.request('y4', 'auto');
    if (r1 && r2 && r3 && !r4) ok('session budget: 3 auto-fire max');
    else no('session budget', 'y1=' + r1 + ' y2=' + r2 + ' y3=' + r3 + ' y4=' + r4);
    /* one-prompt exempt from budget */
    var op = q2.request('one-prompt', 'auto');
    if (op) ok('one-prompt exempt from budget');
    else no('one-prompt exemption', 'denied despite exemption');
    q2.release('one-prompt');
    /* user-kind bypasses budget */
    var u1 = q2.request('u1', 'user'); q2.release('u1');
    var u2 = q2.request('u2', 'user');
    if (u1 && u2) ok('user-kind bypasses budget');
    else no('user-kind', 'user requests should bypass budget');
    q2.release('u2');
  } else { no('queue boot (budget group)', 'PF.popupQueue undefined'); }
} catch (e) { no('queue runtime', 'exception: ' + (e && e.message)); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ONE-PROMPT VERIFY OK.');
