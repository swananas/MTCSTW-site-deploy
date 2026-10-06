#!/usr/bin/env node
/* scripts/verify-livemode-fe.js — LIVE EVENT MODE frontend checks
   (fe/live-event-mode, PLAY 9, CEO directive 2026-10-06).
   Run from the repo root: node scripts/verify-livemode-fe.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: node --check on touched files; inner-script gate on livemode.js;
   livemode.js in exactly one bundle (bundle-livemode), staged in no other
   generated bundle; page wiring (/war-room PAGE_ORDERS, FE_MOUNT_IDS,
   footer isWarRoom flag + bundle mapping); brand copy (Briefing Hero /
   Intel Cards / Data Strips / Action Bar); copy rules (never
   bet/wager/odds/payout); zero-XP / zero-backend-writes (static + sandbox);
   composition wiring (market_list, predict_qlist, news rails, cell rails,
   PF.newsTop / PF.newsStats delegation); and a fake-DOM smoke that mounts
   the module against fake backends and verifies the kill switch, countdown
   rendering, module-failure isolation, polling backoff, and zero network
   writes. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var GAMES = path.join(ROOT, 'v1.4.3', 'games');
var SRC = path.join(GAMES, 'livemode.js');
var src = fs.readFileSync(SRC, 'utf8');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }

/* ---------- 1. node --check ---------- */
console.log('== 1. node --check ==');
[
  SRC,
  path.join(ROOT, 'build', 'bundle.js'),
  path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'),
  __filename
].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p)); }
  catch (e) { no(path.basename(p), 'node --check failed'); }
});
(function () {
  var f = fs.readFileSync(path.join(ROOT, 'loader', 'footer_v144_final.html'), 'utf8');
  var lines = f.split('\n').filter(function (l) {
    return l.indexOf('var JS_GAMES=') === 0 || l.indexOf('var isArcade=') === 0;
  });
  if (lines.length !== 2) { no('footer JS lines', 'expected 2 JS lines, found ' + lines.length); return; }
  try { lines.forEach(function (l) { new vm.Script(l); }); ok('footer_v144_final.html JS lines parse'); }
  catch (e) { no('footer JS lines', 'parse error: ' + e.message); }
})();

/* ---------- 2. inner-script gate ---------- */
console.log('== 2. inner-script gate ==');
try {
  cp.execSync('node scripts/check-inner-scripts.js ' + SRC, { stdio: 'pipe' });
  ok('check-inner-scripts.js clean on livemode.js');
} catch (e) { no('inner-script gate', 'check-inner-scripts failed'); }
if (src.indexOf('</scr' + 'ipt>') === -1) ok('no script tags anywhere in livemode.js');
else no('script tags', 'a </script> sequence exists in the file');

/* ---------- 3. bundle placement ---------- */
console.log('== 3. bundle placement ==');
var bundleSrc = fs.readFileSync(path.join(ROOT, 'build', 'bundle.js'), 'utf8');
var mentions = (bundleSrc.match(/'livemode\.js'/g) || []).length;
if (mentions === 1) ok("livemode.js listed exactly once in build/bundle.js");
else no('bundle listing', "'livemode.js' appears " + mentions + " times");
if (bundleSrc.indexOf("'bundle-livemode'") !== -1) ok('bundle-livemode section exists');
else no('bundle-livemode', 'section missing');
var lb = path.join(GAMES, 'bundle-livemode.js');
if (fs.existsSync(lb)) {
  var lbs = fs.readFileSync(lb, 'utf8');
  if (lbs.indexOf('pf-ov-livemode') !== -1) ok('bundle-livemode.js stages pf-ov-livemode');
  else no('bundle-livemode.js', 'template id missing');
  if (lbs.indexOf('window.PFLiveMode') !== -1) ok('bundle-livemode.js carries the engine');
  else no('bundle-livemode.js', 'engine missing');
} else { no('bundle-livemode.js', 'not generated — run node build/bundle.js'); }
fs.readdirSync(GAMES).filter(function (f) {
  return /^bundle-.*\.js$/.test(f) && f !== 'bundle-livemode.js';
}).forEach(function (b) {
  var s = fs.readFileSync(path.join(GAMES, b), 'utf8');
  if (s.indexOf('pf-ov-livemode') !== -1) no('bundle dedupe', b + ' also stages pf-ov-livemode');
});
ok('no other game bundle stages pf-ov-livemode');

/* ---------- 4. page wiring ---------- */
console.log('== 4. page wiring ==');
var pm = fs.readFileSync(path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'), 'utf8');
if (pm.indexOf("['livemode', 'pf-ov-livemode']") !== -1) ok('/war-room PAGE_ORDERS entry');
else no('/war-room wiring', "['livemode','pf-ov-livemode'] missing from pf-warroom order");
if (pm.indexOf("'pf-warroom'") !== -1 && pm.indexOf("'pf-live'") !== -1) ok('FE_MOUNT_IDS carries pf-warroom + pf-live');
else no('FE_MOUNT_IDS', 'pf-warroom/pf-live missing');
var foot = fs.readFileSync(path.join(ROOT, 'loader', 'footer_v144_final.html'), 'utf8');
if (foot.indexOf("isWarRoom=!!document.getElementById('pf-warroom')") !== -1) ok('footer isWarRoom flag');
else no('footer flag', 'isWarRoom missing');
if (foot.indexOf("isWarRoom?['games/bundle-warroom.js','games/bundle-livemode.js']") !== -1) ok('footer war-room bundle mapping');
else no('footer mapping', 'bundle-warroom/bundle-livemode mapping missing');
if (/var onV2=.*\|\|isWarRoom/.test(foot)) ok('footer onV2 includes isWarRoom (v1.4.3 base)');
else no('footer onV2', 'isWarRoom missing from onV2 — /war-room would load v1.1.0');

/* ---------- 5. copy rules (comment-stripped; strings NOT stripped —
   AGENTS.md lesson: naive quote-stripping is regex-literal-blind) ---------- */
console.log('== 5. copy rules ==');
var noComments = src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
var bannedHit = null;
['bet', 'wager', 'odds', 'payout'].forEach(function (w) {
  if (new RegExp('\\b' + w + '\\b', 'i').test(noComments)) bannedHit = w;
});
if (!bannedHit) ok('no bet/wager/odds/payout in code, strings, or comments');
else no('copy rules', 'banned word present: ' + bannedHit);
[['SHARE THIS INTEL', 'action bar 1'], ['TAKE THIS TO YOUR CELL', 'action bar 2'],
 ['REPORT BACK', 'action bar 3'], ['#c1121f', 'brand red'],
 ['Arial', 'brand type'], ['?pf_off=livemode', 'kill switch'],
 ['#pf-live', 'self-mount div']].forEach(function (pair) {
  if (src.indexOf(pair[0]) !== -1) ok('copy: ' + pair[1]);
  else no('copy: ' + pair[1], "'" + pair[0] + "' missing");
});

/* ---------- 6. zero-XP / zero-writes (static) ---------- */
console.log('== 6. zero-XP / zero-writes (static) ==');
var writeTokens = ['fetch(', 'XMLHttpRequest', 'localStorage.setItem', 'pf-xp',
  'authPost', 'dispatchEvent', 'p_action', 'm_action', 'w_action', 'g_action',
  'xpGrant', 'gain:', 'XP_REWARD', '+25 XP', '.post('];
var wtHit = null;
writeTokens.forEach(function (w) { if (noComments.indexOf(w) !== -1) wtHit = w; });
if (!wtHit) ok('no write/XP tokens in code or comments');
else no('no-writes', 'token present: ' + wtHit);

/* ---------- 7. composition wiring (static) ---------- */
console.log('== 7. composition wiring ==');
[['market_list', 'markets.js rail'], ['predict_qlist', 'predgame.js rail'],
 ['news_top_get', 'news rail fallback'], ['cell_mine', 'cells.js rail'],
 ['muster_leaderboard', 'rally rail'], ['PF.newsTop', 'news module delegation'],
 ['PF.newsStats', 'stats-resolver delegation'],
 ['window.PFLiveModeMount', 'public alias'],
 ['PFLiveMode.mount', 'public mount']].forEach(function (pair) {
  if (src.indexOf(pair[0]) !== -1) ok('wiring: ' + pair[1]);
  else no('wiring: ' + pair[1], "'" + pair[0] + "' missing");
});

/* ---------- 8. fake-DOM smoke ---------- */
console.log('== 8. fake-DOM smoke ==');
function makeEnv(opts) {
  opts = opts || {};
  var staged = false;
  var pendingScripts = [];
  var fetchCalls = [];
  var timers = { timeouts: [], intervals: {} };
  var promptCalls = [];
  function fakeEl(tag) {
    return {
      tagName: String(tag || 'div').toUpperCase(), id: '',
      attributes: {}, children: [], style: {},
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      getAttribute: function (k) { return this.attributes[k]; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      classList: { add: function () {}, contains: function () { return false; } },
      parentNode: null, textContent: '', innerHTML: ''
    };
  }
  /* Root element with slot-aware querySelector: paintSlot() targets
     [data-lm-slot="x"]; the countdown tick targets [data-lm-cd]. */
  function makeRoot() {
    var el = fakeEl('div');
    el.id = 'xLivemode';
    var slots = {};
    var cdEls = [];
    function slotEl(name) {
      if (!slots[name]) {
        slots[name] = fakeEl('div');
        Object.defineProperty(slots[name], 'innerHTML', {
          get: function () { return this._h || ''; },
          set: function (v) { this._h = String(v); },
          configurable: true
        });
      }
      return slots[name];
    }
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._h || ''; },
      set: function (v) {
        this._h = String(v);
        cdEls.length = 0;
        var re = /data-lm-cd="(\d+)"/g, m;
        while ((m = re.exec(this._h))) {
          (function (at) {
            var c = fakeEl('div');
            c._text = '';
            Object.defineProperty(c, 'textContent', {
              get: function () { return this._text; },
              set: function (v) { this._text = String(v); },
              configurable: true
            });
            c.getAttribute = function () { return at; };
            c.className = 'lm-cd';
            c.parentNode = { querySelector: function () { return null; } };
            cdEls.push(c);
          })(m[1]);
        }
      },
      configurable: true
    });
    el.querySelector = function (sel) {
      var m = /\[data-lm-slot="([^"]+)"\]/.exec(sel || '');
      if (m) return slotEl(m[1]);
      if (sel === '[data-lm-share]') { var b = fakeEl('button'); el._shareBtn = b; return b; }
      return null;
    };
    el.querySelectorAll = function (sel) {
      if (sel === '[data-lm-cd]') return cdEls;
      if (sel === '#xLivemode') return [el];
      return [];
    };
    el._slots = slots;
    return el;
  }
  var holderEl = fakeEl('div');
  holderEl.insertAdjacentHTML = function (pos, html) {
    if (html.indexOf('pf-ov-livemode') !== -1) staged = true;
  };
  var headEl = fakeEl('head');
  headEl.appendChild = function (s) { s.parentNode = headEl; pendingScripts.push(s); return s; };
  headEl.removeChild = function (s) {
    var ix = pendingScripts.indexOf(s);
    if (ix !== -1) pendingScripts.splice(ix, 1);
    return s;
  };
  var byId = {};
  if (opts.mountDiv) byId['pf-live'] = opts.mountDiv;
  var win = {
    location: {
      search: opts.search || '',
      href: 'https://mtcstw.com/war-room' + (opts.search || '')
    },
    PFCallsign: function () { return opts.callsign || ''; },
    PFDeviceId: function () { return 'dev-1'; },
    navigator: {},
    prompt: function (msg, dflt) { promptCalls.push(msg); return dflt; },
    fetch: function () { fetchCalls.push(Array.prototype.slice.call(arguments)); return Promise.reject(new Error('no fetch')); },
    PF: {
      skip: function (s) { return (opts.disabled || []).indexOf(s) !== -1; },
      holder: function () { return holderEl; },
      toast: function () {},
      log: function () {}, error: function () {},
      hidden: function () { return false; }
    },
    PF_BACKEND_URL: opts.backend === false ? undefined : 'https://backend.example/',
    console: console
  };
  if (opts.newsTop) win.PF.newsTop = opts.newsTop;
  var doc = {
    readyState: 'complete', hidden: false,
    getElementById: function (id) {
      if (id === 'pf-ov-livemode') return staged ? { id: id } : null;
      if (id === 'pf-livemode-css') return doc._css ? { id: id } : null;
      return byId[id] || null;
    },
    getElementsByTagName: function () { return [headEl]; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function (t) {
      var el = fakeEl(t);
      if (String(t).toLowerCase() === 'style') {
        el.appendChild = function (c) { doc._cssText = (c && c.text) || ''; return c; };
      }
      if (String(t).toLowerCase() === 'section') {
        el.querySelector = function (sel) {
          if (sel === '#xLivemode') { el._secRoot = el._secRoot || makeRoot(); return el._secRoot; }
          return null;
        };
      }
      return el;
    },
    createTextNode: function (t) { return { text: String(t) }; },
    head: headEl,
    addEventListener: function () {}
  };
  var RealDate = Date;
  var clock = { now: (opts.now != null ? opts.now : RealDate.now()) };
  function FakeDate() {
    if (arguments.length) return new RealDate(arguments[0]);
    return new RealDate(clock.now);
  }
  FakeDate.now = function () { return clock.now; };
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  var sandbox = {
    window: win, document: doc, console: console, Date: FakeDate,
    setTimeout: function (fn) { timers.timeouts.push(fn); return timers.timeouts.length; },
    clearTimeout: function () {},
    setInterval: function (fn, ms) { timers.intervals[ms] = fn; return ms; },
    clearInterval: function () {}
  };
  sandbox.globalThis = sandbox;
  return {
    win: win, doc: doc, sandbox: sandbox, timers: timers,
    pendingScripts: pendingScripts, fetchCalls: fetchCalls, promptCalls: promptCalls,
    makeRoot: makeRoot, fakeEl: fakeEl, clock: clock,
    staged: function () { return staged; }
  };
}
function fire(env, action, payload) {
  for (var i = 0; i < env.pendingScripts.length; i++) {
    var s = env.pendingScripts[i].src || '';
    if (s.indexOf('action=' + action) === -1) continue;
    var cb = (s.match(/[?&]callback=([^&]+)/) || [])[1];
    if (!cb || !env.win[cb]) continue;
    env.win[cb](payload);
    return true;
  }
  return false;
}
function runFile(env) {
  vm.createContext(env.sandbox);
  vm.runInContext(src, env.sandbox, { filename: 'livemode.js' });
  return env.sandbox;
}
var MARKET_PAYLOAD = {
  ok: true,
  markets: [
    { id: 'm1', title: 'Dems take the Senate?', kind: 'elections', status: 'open',
      total_pool: 1240,
      sides: [{ side: 'YES', pool: 806, bettors: 24 }, { side: 'NO', pool: 434, bettors: 14 }],
      locks_at: Date.now() + 7200e3 },
    { id: 'm2', title: 'Mayor recall succeeds?', kind: 'elections', status: 'open',
      total_pool: 300,
      sides: [{ side: 'YES', pool: 120, bettors: 6 }, { side: 'NO', pool: 180, bettors: 9 }],
      locks_at: Date.now() + 86400e3 }
  ]
};
var QLIST_PAYLOAD = {
  ok: true,
  questions: [
    { id: 'q1', title: 'Will the runoff go progressive?', category: 'elections',
      options: [{ id: 'a', label: 'Yes' }, { id: 'b', label: 'No' }],
      status: 'open', lock_at: new Date(Date.now() + 3600e3).toISOString() },
    { id: 'q2', title: 'CPI print above 3%?', category: 'economy',
      options: [{ id: 'a', label: 'Above' }, { id: 'b', label: 'Below' }],
      status: 'resolved', winning_option: 'a', source_label: 'BLS' }
  ]
};
var NEWS_PAYLOAD = {
  ok: true,
  stories: [
    { title: 'Senate race tightens in final poll', url: 'https://example.com/senate', source: 'Wire', published_at: Date.now() - 3600e3 },
    { title: 'Grocery prices steady', url: 'https://example.com/grocery', source: 'Wire', published_at: Date.now() - 7200e3 }
  ]
};
var RALLY_PAYLOAD = {
  ok: true,
  rows: [
    { cell_name: 'Bayou Brigade', muster: 42 },
    { cell_name: 'Red River Cell', muster: 31 }
  ]
};

/* 8a. kill switch: nothing staged, no API, when skipped. */
(function () {
  var env = makeEnv({ disabled: ['livemode'] });
  try {
    runFile(env);
    if (!env.staged()) ok('kill switch: template not staged when skipped');
    else no('kill switch', 'template staged despite PF.skip');
    if (!env.win.PFLiveMode) ok('kill switch: no public API when skipped');
    else no('kill switch', 'PFLiveMode exists despite skip');
  } catch (e) { no('kill switch smoke', 'threw: ' + e.message); }
})();
/* 8b. mount renders hero + 4 slots + action bar; countdown states. */
(function () {
  var T0 = 1790000000000;
  var at = T0 + ((2 * 86400) + (3 * 3600) + (4 * 60) + 5) * 1000;
  var env = makeEnv({ now: T0, search: '?live=election-night&live_at=' + new Date(at).toISOString() + '&live_moment=POLLS+CLOSE' });
  try {
    var sb = runFile(env);
    var root = env.makeRoot();
    sb.window.PFLiveMode.mount(root);
    var h = root.innerHTML;
    [['LIVE EVENT MODE', 'brand shell'], ['ELECTION NIGHT', 'event kicker'],
     ['POLLS CLOSE', 'moment label'], ['MAKE THE CALL', 'hero CTA'],
     ['SHARE THIS INTEL', 'action bar 1'], ['TAKE THIS TO YOUR CELL', 'action bar 2'],
     ['REPORT BACK', 'action bar 3'], ['/cells', 'cell link'], ['/war-report', 'report link']
    ].forEach(function (pair) {
      if (h.indexOf(pair[0]) !== -1) ok('hero: ' + pair[1]);
      else no('hero: ' + pair[1], "'" + pair[0] + "' missing");
    });
    var cdm = h.match(/<div class="lm-cd" data-lm-cd="\d+">([^<]*)<\/div>/);
    if (cdm && cdm[1] === '02:03:04:05') ok('countdown: DD:HH:MM:SS renders (' + cdm[1] + ')');
    else no('countdown render', 'got: ' + (cdm && cdm[1]));
    /* 1s tick keeps the countdown moving. */
    var tick = env.timers.intervals[1000];
    if (typeof tick !== 'function') { no('countdown tick', 'no 1s interval registered'); }
    else {
      tick();
      var cdEls = root.querySelectorAll('[data-lm-cd]');
      if (cdEls.length && /^\d\d:\d\d:\d\d:\d\d$/.test(cdEls[0].textContent)) ok('countdown: 1s ticker updates');
      else no('countdown tick', 'ticker did not update the figure');
    }
    /* Past moment -> LIVE NOW. */
    var env2 = makeEnv({ search: '?live=election-night&live_at=' + new Date(Date.now() - 60000).toISOString() });
    var sb2 = runFile(env2);
    var root2 = env2.makeRoot();
    sb2.window.PFLiveMode.mount(root2);
    if (root2.innerHTML.indexOf('LIVE NOW') !== -1) ok('countdown: past moment shows LIVE NOW');
    else no('countdown LIVE NOW', 'missing');
    /* No live_at -> MOMENT TBA. */
    var env3 = makeEnv({ search: '?live=election-night' });
    var sb3 = runFile(env3);
    var root3 = env3.makeRoot();
    sb3.window.PFLiveMode.mount(root3);
    if (root3.innerHTML.indexOf('MOMENT TBA') !== -1) ok('countdown: missing moment shows MOMENT TBA');
    else no('countdown TBA', 'missing');
  } catch (e) { no('mount smoke', 'threw: ' + (e && e.stack || e.message)); }
})();
/* 8c. full render against fake backends (JSONP news fallback path). */
(function () {
  var env = makeEnv({ search: '?live=election-night' });
  try {
    var sb = runFile(env);
    var root = env.makeRoot();
    sb.window.PFLiveMode.mount(root);
    fire(env, 'market_list', MARKET_PAYLOAD);
    fire(env, 'predict_qlist', QLIST_PAYLOAD);
    fire(env, 'news_top_get', NEWS_PAYLOAD);
    fire(env, 'muster_leaderboard', RALLY_PAYLOAD);
    /* cell_mine is skipped without a callsign — anonymous fail-open. */
    var s = root._slots;
    var checks = [
      [s.board && s.board._h, 'Dems take the Senate?', 'board: market title'],
      [s.board && s.board._h, '65%', 'board: dominant pool share'],
      [s.board && s.board._h, 'lm-strip', 'board: data strip markup'],
      [s.board && s.board._h, 'updated ', 'board: recency stamp'],
      [s.board && s.board._h, '/arcade#pf-forecasts', 'board: deep link out'],
      [s.calls && s.calls._h, 'Will the runoff go progressive?', 'calls: question title'],
      [s.calls && s.calls._h, 'CLOSES IN', 'calls: lock text'],
      [s.calls && s.calls._h, '/call-it', 'calls: deep link out'],
      [s.news && s.news._h, 'Senate race tightens', 'news: story headline'],
      [s.news && s.news._h, 'OPEN MARKETS ON THE BOARD', 'news: event data strip'],
      [s.rally && s.rally._h, 'Bayou Brigade', 'rally: leaderboard row'],
      [s.rally && s.rally._h, '42', 'rally: muster count'],
      [s.rally && s.rally._h, '/cells', 'rally: deep link out']
    ];
    checks.forEach(function (c) {
      if (c[0] && c[0].indexOf(c[1]) !== -1) ok(c[2]);
      else no(c[2], "'" + c[1] + "' missing from slot HTML");
    });
    if (env.fetchCalls.length === 0) ok('sandbox: zero fetch() calls during full render');
    else no('sandbox: fetch calls', env.fetchCalls.length + ' fetch() calls issued');
    /* share falls through to prompt (no navigator.share) — device-local only. */
    if (root._shareBtn && root._shareBtn.onclick) {
      root._shareBtn.onclick();
      if (env.promptCalls.length === 1) ok('share: device-local fallthrough, no backend write');
      else no('share fallthrough', 'prompt not called');
    } else { no('share button', 'share button not wired'); }
  } catch (e) { no('full render smoke', 'threw: ' + (e && e.stack || e.message)); }
})();
/* 8d. module-failure isolation: dead board slot never breaks the page. */
(function () {
  var env = makeEnv({ search: '?live=election-night' });
  try {
    var sb = runFile(env);
    var root = env.makeRoot();
    sb.window.PFLiveMode.mount(root);
    fire(env, 'market_list', { ok: false, err: 'down' });
    fire(env, 'predict_qlist', QLIST_PAYLOAD);
    fire(env, 'news_top_get', NEWS_PAYLOAD);
    fire(env, 'muster_leaderboard', RALLY_PAYLOAD);
    var s = root._slots;
    if (s.board && s.board._h && s.board._h.indexOf('lm-quiet') !== -1) ok('isolation: dead board slot renders quiet note');
    else no('isolation: board slot', 'no quiet fallback');
    if (s.calls && s.calls._h && s.calls._h.indexOf('Will the runoff') !== -1) ok('isolation: live slots still render');
    else no('isolation: surviving slots', 'calls slot did not render');
    if (s.news && s.news._h && s.news._h.indexOf('Senate race') !== -1) ok('isolation: news slot still renders');
    else no('isolation: news slot', 'news slot did not render');
  } catch (e) { no('isolation smoke', 'threw: ' + (e && e.stack || e.message)); }
})();
/* 8e. PF.newsTop composition: used when staged, JSONP fallback otherwise. */
(function () {
  var stories = [{ title: 'Top story via module', url: 'https://example.com/t', source: 'HQ', published_at: Date.now() }];
  var used = { module: false };
  var env = makeEnv({
    search: '?live=x',
    newsTop: { get: function () { used.module = true; return Promise.resolve({ stories: stories }); } }
  });
  try {
    var sb = runFile(env);
    var root = env.makeRoot();
    sb.window.PFLiveMode.mount(root);
    var newsFired = fire(env, 'news_top_get', NEWS_PAYLOAD);
    setTimeout(function () {
      var h = (root._slots.news && root._slots.news._h) || '';
      if (used.module) ok('composition: PF.newsTop.get used when staged');
      else no('composition: PF.newsTop', 'module not consulted');
      if (!newsFired) ok('composition: no news_top_get JSONP when the module answers');
      else no('composition: newsTop', 'redundant JSONP fired alongside the module');
      if (h.indexOf('Top story via module') !== -1) ok('composition: module stories render');
      else no('composition: module stories', 'not rendered');
      finishAsync();
    }, 50);
  } catch (e) { no('newsTop smoke', 'threw: ' + (e && e.stack || e.message)); finishAsync(); }
})();
/* 8f. polling backoff: all-fail doubles the interval; success resets it. */
(function () {
  var env = makeEnv({ search: '?live=x' });
  try {
    var sb = runFile(env);
    var root = env.makeRoot();
    sb.window.PFLiveMode.mount(root);
    fire(env, 'market_list', { ok: false });
    fire(env, 'predict_qlist', { ok: false });
    fire(env, 'news_top_get', { ok: false });
    fire(env, 'muster_leaderboard', { ok: false });
    var d1 = sb.window.PFLiveMode._debug()[0];
    if (d1 && d1.backoff === 120000) ok('backoff: all-fail doubles to 120s');
    else no('backoff: all-fail', 'backoff=' + (d1 && d1.backoff));
    var poll = env.timers.intervals[15000];
    if (typeof poll !== 'function') { no('polling', 'no 15s interval'); }
    else {
      ok('polling: 15s poll-checker registered');
      /* advance past the backed-off deadline -> a new refresh is issued */
      env.clock.now += 120001;
      var nScripts = env.pendingScripts.length;
      poll();
      if (env.pendingScripts.length <= nScripts) { no('backoff: repoll', 'no new requests after the backoff elapsed'); }
      else {
        ok('backoff: refresh re-issued after backoff elapsed');
        fire(env, 'market_list', MARKET_PAYLOAD);
        fire(env, 'predict_qlist', QLIST_PAYLOAD);
        fire(env, 'news_top_get', NEWS_PAYLOAD);
        fire(env, 'muster_leaderboard', RALLY_PAYLOAD);
        var d2 = sb.window.PFLiveMode._debug()[0];
        if (d2 && d2.backoff === 60000 && d2.fails === 0) ok('backoff: success resets to 60s');
        else no('backoff: reset', 'backoff=' + (d2 && d2.backoff) + ' fails=' + (d2 && d2.fails));
      }
    }
  } catch (e) { no('backoff smoke', 'threw: ' + (e && e.stack || e.message)); }
})();
/* 8g. #pf-live self-mount path. */
(function () {
  var host = null;
  var env = makeEnv({ search: '?live=x' });
  host = env.fakeEl('div');
  host.id = 'pf-live';
  host.appendChild = function (c) { host._sec = c; return c; };
  /* re-point getElementById at our host */
  var origGet = env.doc.getElementById;
  env.doc.getElementById = function (id) {
    if (id === 'pf-live') return host;
    return origGet(id);
  };
  try {
    var sb = runFile(env);
    if (host._sec && host._sec._secRoot && host._sec._secRoot.getAttribute('data-lm-mounted') === '1') {
      ok('self-mount: #pf-live builds and mounts the section');
    } else { no('self-mount', '#pf-live section not mounted'); }
  } catch (e) { no('self-mount smoke', 'threw: ' + (e && e.stack || e.message)); }
})();

/* async test 8e needs the event loop — defer the verdict. */
var asyncPending = 1;
function finishAsync() {
  asyncPending--;
  if (asyncPending === 0) verdict();
}
function verdict() {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) {
    console.log('FAILURES:');
    fails.forEach(function (f) { console.log(' - ' + f); });
    process.exit(1);
  }
}
setTimeout(function () {
  if (asyncPending > 0) { no('async completion', 'test 8e never finished'); verdict(); }
}, 5000);
