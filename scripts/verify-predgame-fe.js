#!/usr/bin/env node
/* scripts/verify-predgame-fe.js — CALL IT. prediction-game frontend checks
   (fe/predict-game, 2026-10-05).
   Run from the repo root: node scripts/verify-predgame-fe.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: node --check on touched files; inner-script gate on predgame.js;
   predict.js (the bill game) untouched; predgame.js in exactly one games
   bundle (bundle-predgame) and staged in no other generated bundle;
   page wiring (/arcade, /political-hq BALLOT hub, /money); footer bundle
   mapping; copy rules (never bet/wager/odds/payout); touch targets >=44px;
   kill switch; fail-soft strings; and a fake-DOM smoke that executes the
   IIFE, stages the template, mounts the section against a fake
   predict_qlist/predict_qleaderboard backend, and verifies the fail-soft
   hide path when the backend actions are missing. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var GAMES = path.join(ROOT, 'v1.4.3', 'games');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ---------- 1. node --check on every touched file ---------- */
console.log('== 1. node --check ==');
[
  path.join(GAMES, 'predgame.js'),
  path.join(ROOT, 'build', 'bundle.js'),
  path.join(ROOT, 'build', 'bundle-core.js'),
  path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'),
  path.join(ROOT, 'v1.4.3', 'pages', 'political-hq.js'),
  path.join(GAMES, 'phq-hubs.js'),
  __filename
].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p)); }
  catch (e) { no(path.basename(p), 'node --check failed'); }
});
/* footer is HTML — syntax-check only the JS lines we touched. */
(function () {
  var f = read(path.join(ROOT, 'loader', 'footer_v144_final.html'));
  var lines = f.split('\n').filter(function (l) {
    return l.indexOf('var JS_GAMES=') === 0 || l.indexOf('var JS_HQ=') === 0;
  });
  if (lines.length !== 2) { no('footer JS lines', 'expected 2 JS lines, found ' + lines.length); return; }
  try {
    lines.forEach(function (l) { new vm.Script(l); });
    ok('footer_v144_final.html JS lines parse');
  } catch (e) { no('footer JS lines', 'parse error: ' + e.message); }
})();

/* ---------- 2. inner-script gate ---------- */
console.log('== 2. inner-script gate ==');
try {
  cp.execSync('node scripts/check-inner-scripts.js ' + path.join(GAMES, 'predgame.js'), { stdio: 'pipe' });
  ok('check-inner-scripts.js clean on predgame.js');
} catch (e) { no('inner-script gate', 'check-inner-scripts failed'); }

/* ---------- 3. predict.js (bill game) untouched ---------- */
console.log('== 3. bill game untouched ==');
try {
  var d = cp.execSync('git diff HEAD -- v1.4.3/games/predict.js', { cwd: ROOT, stdio: 'pipe' }).toString();
  if (d.trim() === '') ok('v1.4.3/games/predict.js unmodified');
  else no('predict.js untouched', 'working tree has changes');
} catch (e) { no('predict.js untouched', 'git diff failed'); }

/* ---------- 4. bundle placement ---------- */
console.log('== 4. bundle placement ==');
var src = read(path.join(GAMES, 'predgame.js'));
var bundleSrc = read(path.join(ROOT, 'build', 'bundle.js'));
var mentions = (bundleSrc.match(/'predgame\.js'/g) || []).length;
if (mentions === 1) ok("predgame.js listed exactly once in build/bundle.js");
else no('bundle listing', "'predgame.js' appears " + mentions + " times");
if (bundleSrc.indexOf("'bundle-predgame'") !== -1) ok('bundle-predgame section exists');
else no('bundle-predgame', 'section missing');
var pb = path.join(GAMES, 'bundle-predgame.js');
if (fs.existsSync(pb)) {
  var pbs = read(pb);
  if (pbs.indexOf('pf-ov-predgame') !== -1) ok('bundle-predgame.js stages pf-ov-predgame');
  else no('bundle-predgame.js', 'template id missing');
  if (pbs.indexOf('window.PFPredgame') !== -1 || pbs.indexOf('PFPredgame=') !== -1) ok('bundle-predgame.js carries the engine');
  else no('bundle-predgame.js', 'engine missing');
} else { no('bundle-predgame.js', 'not generated — run node build/bundle.js'); }
/* no other generated bundle may stage the template (exactly-one-bundle rule) */
['bundle-arcade.js', 'bundle-hq.js', 'bundle-hq-deep.js', 'bundle-sec1.js', 'bundle-home.js'].forEach(function (b) {
  var p = path.join(GAMES, b);
  if (!fs.existsSync(p)) return;
  var s = read(p);
  if (s.indexOf('pf-ov-predgame') !== -1) no('bundle dedupe', b + ' also stages pf-ov-predgame');
});
ok('no other game bundle stages pf-ov-predgame');

/* ---------- 5. page wiring ---------- */
console.log('== 5. page wiring ==');
var pm = read(path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'));
if (pm.indexOf("['predgame', 'pf-ov-predgame']") !== -1) ok('/arcade PAGE_ORDERS entry');
else no('/arcade wiring', "['predgame','pf-ov-predgame'] missing from pf-arcade order");
var phq = read(path.join(ROOT, 'v1.4.3', 'pages', 'political-hq.js'));
if (phq.indexOf("['predgame', 'pf-ov-predgame']") !== -1) ok('/political-hq ORDER entry');
else no('/political-hq wiring', 'ORDER entry missing');
var hubs = read(path.join(GAMES, 'phq-hubs.js'));
if (hubs.indexOf("order: ['races', 'measures', 'predict', 'predgame']") !== -1) ok('BALLOT hub order includes predgame');
else no('BALLOT hub', 'predgame missing from ballot hub order');
var foot = read(path.join(ROOT, 'loader', 'footer_v144_final.html'));
[
  ["isArcade?['games/bundle-arcade-h.js','games/bundle-arcade.js','games/bundle-predgame.js']", '/arcade footer bundle'],
  ["isMoney?['core/bundle-money.js','games/bundle-predgame.js']", '/money footer bundle'],
  ["var JS_HQ=isHQ?['games/bundle-hq.js','games/bundle-predgame.js']", '/political-hq footer bundle']
].forEach(function (pair) {
  if (foot.indexOf(pair[0]) !== -1) ok(pair[1]);
  else no(pair[1], 'footer mapping missing');
});

/* ---------- 6. copy rules ---------- */
console.log('== 6. copy rules ==');
var srcNoComments = src
  .replace(/\/\*[\s\S]*?\*\//g, '') /* block comments (incl. the header doc) */
  .split('\n').filter(function (l) { return l.trim().indexOf('//') !== 0; }).join('\n');
var banned = ['bet', 'wager', 'odds', 'payout'];
var bannedHit = null;
banned.forEach(function (w) {
  var m = srcNoComments.match(new RegExp('\\b' + w + '\\b', 'i'));
  if (m) bannedHit = w;
});
if (!bannedHit) ok('no bet/wager/odds/payout in code or strings');
else no('copy rules', 'banned word present: ' + bannedHit);
[['CALL IT.', 'header'], ['+25 XP', 'XP copy'], ['not financial advice', 'economy disclaimer'],
 ['?pf_off=predgame', 'kill switch'], ['section hidden', 'fail-soft copy'],
 ['Right calls pay', 'right-calls-pay copy']].forEach(function (pair) {
  if (src.indexOf(pair[0]) !== -1) ok('copy: ' + pair[1]);
  else no('copy: ' + pair[1], "'" + pair[0] + "' missing");
});

/* ---------- 7. touch targets ---------- */
console.log('== 7. touch targets ==');
if (/\.pq-btn\{[^}]*min-height:48px/.test(src)) ok('.pq-btn min-height 48px');
else no('touch targets', '.pq-btn min-height:48px missing');
if (/\.pq-chip\{[^}]*min-height:44px/.test(src)) ok('.pq-chip min-height 44px');
else no('touch targets', '.pq-chip min-height:44px missing');

/* ---------- 8. fake-DOM smoke ---------- */
console.log('== 8. fake-DOM smoke ==');
function makeEnv(opts) {
  opts = opts || {};
  var staged = { html: null };
  var elsById = {};
  function makeEl(tag) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(),
      style: {}, children: [], attributes: {},
      innerHTML: '', textContent: '',
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      getAttribute: function (k) { return this.attributes[k]; },
      appendChild: function (c) { this.children.push(c); return c; },
      removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      closest: function () { return null; },
      classList: { add: function () {}, contains: function () { return false; } },
      parentNode: null
    };
    return el;
  }
  var holderEl = makeEl('div');
  holderEl.insertAdjacentHTML = function (pos, html) { staged.html = html; };
  var headEl = makeEl('head');
  var pendingScripts = [];
  headEl.appendChild = function (s) { pendingScripts.push(s); return s; };
  var win = {
    PFCallsign: function () { return opts.callsign === false ? '' : 'TESTER'; },
    PFDeviceId: function () { return 'dev-1'; },
    PF: {
      skip: function (s) { return (opts.disabled || []).indexOf(s) !== -1; },
      holder: function () { return holderEl; },
      log: function () {}, error: function () {},
      toast: function () {}, friendlyErr: function () { return ''; }, errCopy: function (j, d) { return d; }
    },
    PF_BACKEND_URL: opts.backend === false ? undefined : 'https://backend.example/',
    console: console
  };
  var doc = {
    readyState: 'complete',
    getElementById: function (id) {
      if (id === 'pf-ov-predgame') return staged.html ? { id: id, content: {} } : null;
      return elsById[id] || null;
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function (t) { return makeEl(t); },
    head: headEl,
    addEventListener: function () {}
  };
  win.document = doc;
  return { win: win, doc: doc, staged: staged, pendingScripts: pendingScripts, elsById: elsById, makeEl: makeEl };
}
function runFile(env) {
  var sandbox = {
    window: env.win, document: env.doc, console: console,
    setTimeout: function (fn) { return 0; }, clearInterval: function () {}, setInterval: function () { return 0; },
    fetch: function () { return Promise.reject(new Error('no fetch')); }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'predgame.js' });
  return sandbox;
}
/* 8a. IIFE runs, stages the template once, exports the API. */
(function () {
  var env = makeEnv();
  try {
    var sb = runFile(env);
    if (env.staged.html && env.staged.html.indexOf('pf-ov-predgame') !== -1) ok('template staged into PF.holder()');
    else no('template staging', 'pf-ov-predgame not staged');
    if (sb.window.PFPredgame && typeof sb.window.PFPredgame.mount === 'function') ok('window.PFPredgame.mount exported');
    else no('public API', 'PFPredgame.mount missing');
    if (typeof sb.window.PFPredgameMount === 'function') ok('window.PFPredgameMount alias exported');
    else no('public API', 'PFPredgameMount missing');
  } catch (e) { no('IIFE smoke', 'threw: ' + e.message); }
})();
/* 8b. kill switch: nothing staged when skipped. */
(function () {
  var env = makeEnv({ disabled: ['predgame'] });
  try {
    runFile(env);
    if (!env.staged.html) ok('kill switch: template not staged when skipped');
    else no('kill switch', 'template staged despite PF.skip');
  } catch (e) { no('kill switch smoke', 'threw: ' + e.message); }
})();
/* 8c. no backend URL -> section hides, page never breaks. */
(function () {
  var env = makeEnv({ backend: false });
  try {
    var sb = runFile(env);
    var el = env.makeEl('div'); el.querySelector = function () { return null; };
    var logged = [];
    var orig = console.log;
    console.log = function (m) { logged.push(String(m)); };
    sb.window.PFPredgame.mount(el);
    console.log = orig;
    if (el.style.display === 'none') ok('fail-soft: hidden with no backend URL');
    else no('fail-soft no-backend', 'element not hidden');
    if (logged.some(function (m) { return m.indexOf('[predgame]') === 0; })) ok('fail-soft: logged');
    else no('fail-soft log', 'no [predgame] log line');
  } catch (e) { no('fail-soft smoke', 'threw: ' + e.message); }
})();
/* 8d. full render against a fake predict_qlist / predict_qleaderboard. */
(function () {
  var env = makeEnv();
  try {
    var sb = runFile(env);
    var root = env.makeEl('div');
    sb.window.PFPredgame.mount(root);
    if (!env.pendingScripts.length) { no('render smoke', 'no JSONP script issued'); return; }
    var qsrc = env.pendingScripts[0].src || '';
    var qcb = (qsrc.match(/[?&]callback=([^&]+)/) || [])[1];
    if (!qcb || !sb.window[qcb]) { no('render smoke', 'qlist callback not registered'); return; }
    sb.window[qcb]({
      ok: true,
      questions: [
        { id: 'q1', title: 'Will the mayoral runoff go to progressives?', category: 'elections',
          options: [{ id: 'a', label: 'Yes' }, { id: 'b', label: 'No' }],
          status: 'open', lock_at: new Date(Date.now() + 3600e3).toISOString(), rules: 'Majority wins.' },
        { id: 'q2', title: 'Next CPI print above 3%?', category: 'economy',
          options: [{ id: 'a', label: 'Above 3%' }, { id: 'b', label: 'At or below' }],
          status: 'open', lock_at: new Date(Date.now() + 7200e3).toISOString(), rules: '' },
        { id: 'q3', title: 'Roster hits 100 affiliates?', category: 'movement',
          options: [{ id: 'a', label: 'Yes' }, { id: 'b', label: 'No' }],
          status: 'resolved', winning_option: 'a', source_label: 'Roster page', source_url: 'https://example.com/roster' },
        { id: 'q4', title: 'Unemployment under 4% next print?', category: 'economy',
          options: [{ id: 'a', label: 'Under 4%' }, { id: 'b', label: '4% or above' }],
          status: 'resolved', winning_option: 'b', source_label: 'BLS', source_url: 'https://example.com/bls',
          economy_disclaimer: 'Game only — not financial advice.' }
      ],
      picks: [{ question_id: 'q3', option_id: 'a', correct: 1 },
              { question_id: 'q4', option_id: 'a', correct: 0 }]
    });
    if (env.pendingScripts.length < 2) { no('render smoke', 'leaderboard request not issued'); return; }
    var lsrc = env.pendingScripts[1].src || '';
    var lcb = (lsrc.match(/[?&]callback=([^&]+)/) || [])[1];
    if (!lcb || !sb.window[lcb]) { no('render smoke', 'leaderboard callback not registered'); return; }
    sb.window[lcb]({ ok: true, leaders: [{ callsign: 'TESTER', wins: 5, losses: 2, resolved: 7 }] });
    var h = root.innerHTML;
    [
      ['ELECTIONS', 'category chips'], ['ECONOMY', 'economy chip'], ['MOVEMENT', 'movement chip'],
      ['mayoral runoff', 'question title'], ['LOCKS IN', 'lock countdown'],
      ['NAIL THE CALL', 'XP line'], ['not financial advice', 'economy disclaimer'],
      ['YOUR RECORD', 'record strip'], ['TOP CALLERS', 'leaderboard'],
      ['TESTER', 'leader row'], ['RESOLVED', 'resolved state'],
      ['source:', 'source attribution'], ['YOU CALLED IT', 'correct-pick state'],
      ['MISSED IT', 'miss-pick state'], ['the next board is already open', 'softened miss copy']
    ].forEach(function (pair) {
      if (h.indexOf(pair[0]) !== -1) ok('render: ' + pair[1]);
      else no('render: ' + pair[1], "'" + pair[0] + "' missing from section HTML");
    });
    if (h.indexOf('strike back') !== -1) no('render: loss-chasing copy', "'strike back' must not appear");
  } catch (e) { no('render smoke', 'threw: ' + (e && e.stack || e.message || e)); }
})();
/* 8d2. qlist rides PF.authGetJSONP when available; auth failure falls back
   to the public board (no callsign) instead of hiding the section. */
(function () {
  var env = makeEnv();
  var authCalls = [];
  env.win.PF.authGetJSONP = function (backendUrl, action, params, cb) {
    authCalls.push({ action: action, params: params });
    /* First call: simulate a logged-in callsign with no usable secret. */
    if (authCalls.length === 1) { cb({ ok: false, err: 'missing credentials' }); return; }
    cb(null);
  };
  try {
    var sb = runFile(env);
    var root = env.makeEl('div');
    sb.window.PFPredgame.mount(root);
    if (authCalls.length < 1) { no('auth qlist', 'PF.authGetJSONP not used for qlist'); return; }
    if (authCalls[0].action === 'predict_qlist') ok('auth qlist: action is predict_qlist');
    else no('auth qlist: action', 'wrong action: ' + authCalls[0].action);
    /* Auth failure -> exactly one public fallback via raw api(). (The authed
       read itself injects no script; the fallback does — that's expected.) */
    if (env.pendingScripts.length < 1) { no('auth qlist fallback', 'no public fallback script injected'); return; }
    var fsrc = env.pendingScripts[0].src || '';
    if (fsrc.indexOf('action=predict_qlist') !== -1) ok('auth qlist fallback: public qlist requested');
    else no('auth qlist fallback: action', 'wrong fallback action');
    if (fsrc.indexOf('callsign=') === -1) ok('auth qlist fallback: no callsign on public read');
    else no('auth qlist fallback: callsign', 'callsign leaked on public read');
    var fcb = (fsrc.match(/[?&]callback=([^&]+)/) || [])[1];
    if (!fcb || !sb.window[fcb]) { no('auth qlist fallback', 'callback not registered'); return; }
    sb.window[fcb]({ ok: true, questions: [
      { id: 'q9', title: 'Public board question?', category: 'elections',
        options: [{ id: 'a', label: 'Yes' }, { id: 'b', label: 'No' }],
        status: 'open', lock_at: new Date(Date.now() + 3600e3).toISOString(), rules: '' }
    ], picks: [] });
    var lsrc = (env.pendingScripts[1] && env.pendingScripts[1].src) || '';
    var lcb = (lsrc.match(/[?&]callback=([^&]+)/) || [])[1];
    if (lcb && sb.window[lcb]) sb.window[lcb]({ ok: true, leaders: [] });
    if (root.innerHTML.indexOf('Public board question?') !== -1) ok('auth qlist fallback: board renders');
    else no('auth qlist fallback: render', 'board did not render');
  } catch (e) { no('auth qlist', 'threw: ' + (e && e.stack || e.message || e)); }
})();
/* 8e. qlist {ok:false} (backend actions missing) -> section hides. */
(function () {
  var env = makeEnv();
  try {
    var sb = runFile(env);
    var root = env.makeEl('div');
    sb.window.PFPredgame.mount(root);
    var qcb = ((env.pendingScripts[0].src || '').match(/[?&]callback=([^&]+)/) || [])[1];
    sb.window[qcb]({ ok: false, err: 'unknown action' });
    if (root.style.display === 'none') ok('fail-soft: hidden when qlist unavailable');
    else no('fail-soft qlist', 'section not hidden on {ok:false}');
  } catch (e) { no('fail-soft qlist smoke', 'threw: ' + e.message); }
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
