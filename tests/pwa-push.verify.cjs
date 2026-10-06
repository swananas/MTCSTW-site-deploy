#!/usr/bin/env node
/* tests/pwa-push.verify.cjs — PWA PUSH CLIENT (2026-10-05, fe/pwa).
   Run from the repo root:
     node tests/pwa-push.verify.cjs
   1. node --check on v1.4.3/pwa/push.js
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      F2: POST bodies ride p_action (backend POST rail dispatches on
          d.p_action); no push_action property anywhere in code.
      F3: push_prefs posts send topic flags top-level via flatPrefs();
          no nested {prefs: ...} object on any push_prefs post.
      F4/Defect D: prefs GET uses PF.authGetJSONP (house pattern), with a
          manual auth_secret fallback when it isn't wired.
   3. Mocked-browser runtime (vm + minimal DOM stub):
      boot with a LIVE service-worker registration -> init -> loadPrefs
      fires PF.authGetJSONP('push_prefs', {callsign}) and applies prefs;
      fallback path puts auth_secret on the JSONP URL;
      enableFlow gesture chain posts {type:'push', p_action:'push_subscribe'}
      (F2) then flat top-level topic flags (F3);
      savePrefs posts flat flags; globalOff posts push_unsubscribe then
      zeroed flat flags.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var PUSH = path.join(ROOT, 'v1.4.3', 'pwa', 'push.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function stat(code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing: ' + re));
}
function statAbsent(code, name, re, why) {
  if (!re.test(code)) ok(name); else no(name, why || ('forbidden pattern present: ' + re));
}

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + PUSH, { stdio: 'pipe' }); ok('push.js syntax'); }
catch (e) { no('push.js syntax', 'node --check failed'); }

var src = read(PUSH), code = stripComments(src);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract ==');
/* F2: the POST rail dispatches on d.p_action (backend TYPE_KEY push->p_action). */
stat(code, 'F2 post() sends p_action', /p_action:\s*action/);
statAbsent(code, 'F2 no push_action property in code', /push_action\s*:/,
  'push_action property would miss the backend dispatch (d.p_action)');
/* F3: topic flags top-level — flatPrefs on all three push_prefs posts. */
stat(code, 'F3 flatPrefs(chosen) on enableFlow prefs post', /post\('push_prefs',\s*flatPrefs\(chosen\)/);
stat(code, 'F3 flatPrefs(prefs) on savePrefs', /post\('push_prefs',\s*flatPrefs\(prefs\)/);
stat(code, 'F3 flatPrefs(all) on globalOff', /post\('push_prefs',\s*flatPrefs\(all\)/);
stat(code, 'F3 flatPrefs emits top-level topic flags', /daily_orders:\s*chosen\.daily_orders\s*\?\s*1\s*:\s*0/);
statAbsent(code, 'F3 no nested prefs object on posts', /prefs\s*:\s*(chosen|prefs|all)/,
  'nested {prefs:{...}} is ignored by the backend (reads top-level flags)');
/* F4 + Defect D: authed prefs GET via the house pattern, secret fallback. */
stat(code, 'F4/Defect-D loadPrefs uses PF.authGetJSONP', /PF\.authGetJSONP\(BACKEND,\s*'push_prefs'/);
stat(code, 'F4 fallback attaches auth_secret', /auth_secret:\s*authSecret\(\)/);
stat(code, 'F4 authSecret reads PF.getAuthSecret', /PF\.getAuthSecret\)\s*\?\s*PF\.getAuthSecret\(\)/);

/* ============ 3. vm + DOM stub runtime ============ */
console.log('== 3. vm runtime contract ==');

function makeEnv(opts) {
  opts = opts || {};
  var registry = {};
  var toggles = [];
  var scripts = [];
  var posts = [];
  var ajpCalls = [];

  function El(tag) {
    var el = {
      tag: tag, children: [], listeners: {}, _html: '', textContent: '',
      _id: '',
      get id() { return this._id; },
      set id(v) { this._id = String(v); registry[this._id] = this; },
      get innerHTML() { return this._html; },
      set innerHTML(v) {
        this._html = String(v);
        var re = /id="([A-Za-z0-9_\-]+)"/g, m;
        while ((m = re.exec(this._html))) { if (!registry[m[1]]) registry[m[1]] = El('div'); }
        toggles.length = 0;
        var re2 = /class="ppTog" data-k="([a-z_]+)"/g, m2;
        while ((m2 = re2.exec(this._html))) {
          (function (k) {
            toggles.push({
              _k: k, checked: false,
              getAttribute: function (a) { return a === 'data-k' ? k : null; }
            });
          })(m2[1]);
        }
      },
      addEventListener: function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
      appendChild: function (c) { this.children.push(c); return c; },
      insertBefore: function (c) { this.children.push(c); return c; },
      removeChild: function (c) { return c; },
      __click: function () {
        (this.listeners.click || []).forEach(function (fn) { fn({ preventDefault: function () {} }); });
      }
    };
    /* script elements: capture src so the harness can answer the JSONP */
    if (tag === 'script') {
      el._src = '';
      Object.defineProperty(el, 'src', {
        get: function () { return this._src; },
        set: function (v) { this._src = String(v); scripts.push(this); }
      });
      Object.defineProperty(el, 'parentNode', { get: function () { return headStub; } });
      el.onerror = null;
    }
    return el;
  }

  var headStub = { appendChild: function () {}, removeChild: function () {} };
  var host = El('div'); host.id = 'pf-political-hq';

  var documentStub = {
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (tag) { return El(tag); },
    querySelectorAll: function (sel) { return sel === '.ppTog' ? toggles : []; },
    head: headStub,
    body: El('body')
  };

  var PF = {
    skip: function () { return false; },
    toast: function () {},
    errCopy: function (j, fb) { return (j && j.err) || fb || 'err'; },
    getAuthSecret: function () { return 's3cret'; },
    authPost: function (url, body, cb) { posts.push({ url: url, body: body, cb: cb }); }
  };
  if (opts.withAuthGetJSONP !== false) {
    PF.authGetJSONP = function (url, action, params, cb) {
      ajpCalls.push({ url: url, action: action, params: params });
      /* canned authed prefs read */
      cb({ ok: true, prefs: { daily_orders: 1, draw_results: 0, event_reminders: 1 } });
    };
  }

  var fakeSub = {
    endpoint: 'https://push.example.com/sub/harness1',
    toJSON: function () {
      return { endpoint: this.endpoint, keys: { p256dh: 'p256dh1', auth: 'auth1' } };
    },
    unsubscribe: function () { return Promise.resolve(true); }
  };
  var fakeReg = {
    active: {},
    pushManager: {
      getSubscription: function () { return Promise.resolve(opts.existingSub ? fakeSub : null); },
      subscribe: function () { return Promise.resolve(fakeSub); }
    }
  };

  var sandbox = {
    console: console,
    setTimeout: function (fn, ms) { var t = setTimeout(fn, ms); if (t.unref) t.unref(); return t; },
    clearTimeout: clearTimeout,
    atob: atob,
    navigator: { serviceWorker: { getRegistration: function () { return Promise.resolve(fakeReg); } } },
    Notification: { permission: 'default', requestPermission: function () { return Promise.resolve('granted'); } },
    PushManager: function () {},
    document: documentStub,
    confirm: function () { return true; }
  };
  sandbox.window = sandbox;
  sandbox.PF = PF;
  sandbox.PFCallsign = function () { return 'testuser'; };
  sandbox.PFDeviceId = function () { return 'dev1'; };
  sandbox.PF_BACKEND_URL = 'https://api.test/';
  vm.createContext(sandbox);
  vm.runInContext(read(PUSH), sandbox, { filename: 'push.js' });

  function tick(n) {
    var p = Promise.resolve();
    for (var i = 0; i < (n || 8); i++) p = p.then(function () {});
    return p;
  }
  function lastScript() { return scripts[scripts.length - 1]; }
  function answerJsonp(script, payload) {
    var m = /[?&]callback=([^&]+)/.exec(script.src);
    if (!m) throw new Error('no callback in ' + script.src);
    sandbox.window[decodeURIComponent(m[1])](payload);
  }
  function respondPost(i, payload) { posts[i].cb(payload); }

  return {
    registry: registry, toggles: toggles, scripts: scripts, posts: posts, ajpCalls: ajpCalls,
    sandbox: sandbox, tick: tick, lastScript: lastScript, answerJsonp: answerJsonp,
    respondPost: respondPost, fakeSub: fakeSub,
    click: function (id) {
      var el = registry[id];
      if (!el) throw new Error('no element #' + id);
      el.__click();
    }
  };
}

async function scenarioAuthGetJSONP() {
  var t = makeEnv({ withAuthGetJSONP: true });
  await t.tick(12); /* boot -> getRegistration -> init -> loadPrefs */
  if (t.ajpCalls.length !== 1) { no('runtime: loadPrefs fires one authGetJSONP', 'got ' + t.ajpCalls.length); return null; }
  ok('runtime: loadPrefs fires one authGetJSONP');
  var c = t.ajpCalls[0];
  if (c.action === 'push_prefs' && c.params && c.params.callsign === 'testuser') ok('runtime: authGetJSONP action=push_prefs + callsign');
  else no('runtime: authGetJSONP shape', JSON.stringify({ action: c.action, params: c.params }));
  if (/SAVE PUSH PREFS|SAVE/.test('') || t.registry.ppEnable) ok('runtime: pane rendered with ENABLE control');
  else no('runtime: pane rendered', 'ppEnable missing');
  return t;
}

async function scenarioFallback() {
  var t = makeEnv({ withAuthGetJSONP: false });
  await t.tick(12);
  var s = t.lastScript();
  if (!s) { no('runtime fallback: JSONP script created', 'no script'); return null; }
  ok('runtime fallback: JSONP script created');
  var q = s.src;
  var has = function (k, v) { return q.indexOf(encodeURIComponent(k) + '=' + encodeURIComponent(v)) >= 0; };
  if (q.indexOf('action=push_prefs') >= 0 && has('callsign', 'testuser') && has('auth_secret', 's3cret'))
    ok('runtime fallback: JSONP URL carries action + callsign + auth_secret (F4)');
  else no('runtime fallback: JSONP URL params', q);
  t.answerJsonp(s, { ok: true, prefs: { daily_orders: 0, draw_results: 0, event_reminders: 0 } });
  await t.tick(6);
  return t;
}

async function scenarioEnableFlow(t) {
  t.click('ppEnable');
  await t.tick(12); /* permission -> vapid JSONP */
  var s = t.lastScript();
  if (!s || s.src.indexOf('action=push_vapid_public') < 0) {
    no('runtime: enableFlow fetches the VAPID key', s ? s.src : 'no script'); return false;
  }
  ok('runtime: enableFlow fetches the VAPID key (public GET, no secret needed)');
  t.answerJsonp(s, { ok: true, vapid_public_key: 'BP_11jn3O1ocj1CeXqD0yHgWcPsDj7fqcayK9mPWe8Ax21w9X85FZa7bk_piLhawfoJqo9M2M3MxdUeAAhT2wXI' });
  await t.tick(12); /* subscribe -> post push_subscribe */
  if (t.posts.length < 1) { no('runtime: push_subscribe posted', 'no post'); return false; }
  var b = t.posts[0].body;
  if (b.type === 'push' && b.p_action === 'push_subscribe' && !('push_action' in b))
    ok('runtime F2: subscribe post = {type:push, p_action} (no push_action)');
  else { no('runtime F2: subscribe post shape', JSON.stringify(b)); return false; }
  if (b.callsign === 'testuser' && b.endpoint === t.fakeSub.endpoint && b.p256dh === 'p256dh1' && b.auth === 'auth1')
    ok('runtime: subscribe post carries callsign + endpoint + keys');
  else no('runtime: subscribe post fields', JSON.stringify(b));
  t.respondPost(0, { ok: true, subscribed: true });
  await t.tick(12); /* -> post push_prefs (flat) -> loadPrefs */
  if (t.posts.length < 2) { no('runtime: push_prefs posted after subscribe', 'only ' + t.posts.length); return false; }
  var p = t.posts[1].body;
  var flat = p.type === 'push' && p.p_action === 'push_prefs' &&
    p.daily_orders !== undefined && p.draw_results !== undefined &&
    p.event_reminders !== undefined && !('prefs' in p);
  if (flat) ok('runtime F3: prefs post sends flat top-level topic flags (no nested prefs)');
  else { no('runtime F3: prefs post shape', JSON.stringify(p)); return false; }
  t.respondPost(1, { ok: true, prefs: { daily_orders: 0, draw_results: 0, event_reminders: 0 } });
  await t.tick(8); /* prefs callback -> loadPrefs (authGetJSONP, auto) -> render with SUB */
  return true;
}

async function scenarioSavePrefs(t) {
  /* after enableFlow, SUB is set and the pane re-rendered with SAVE */
  await t.tick(6);
  if (!t.registry.ppSave) { no('runtime: SAVE control rendered after subscribe', 'ppSave missing'); return false; }
  ok('runtime: SAVE control rendered after subscribe');
  t.toggles.forEach(function (tg) { tg.checked = (tg.getAttribute('data-k') === 'daily_orders'); });
  t.click('ppSave');
  await t.tick(8);
  var b = t.posts[t.posts.length - 1].body;
  if (b.p_action === 'push_prefs' && b.daily_orders === 1 && b.draw_results === 0 &&
      b.event_reminders === 0 && !('prefs' in b))
    ok('runtime F3: savePrefs posts flat flags {1,0,0}');
  else { no('runtime F3: savePrefs shape', JSON.stringify(b)); return false; }
  t.respondPost(t.posts.length - 1, { ok: true, prefs: { daily_orders: 1, draw_results: 0, event_reminders: 0 } });
  await t.tick(6);
  return true;
}

async function scenarioGlobalOff(t) {
  if (!t.registry.ppOffAll) { no('runtime: turn-off-all control rendered', 'ppOffAll missing'); return false; }
  t.click('ppOffAll'); /* confirm() stubbed true */
  await t.tick(12);
  var un = null, zp = null;
  t.posts.forEach(function (p) {
    if (p.body.p_action === 'push_unsubscribe') un = p.body;
    if (p.body.p_action === 'push_prefs' && p.body.daily_orders === 0 &&
        p.body.draw_results === 0 && p.body.event_reminders === 0) zp = p.body;
  });
  if (un && un.endpoint === t.fakeSub.endpoint) ok('runtime: globalOff posts push_unsubscribe for the endpoint');
  else { no('runtime: globalOff unsubscribe post', JSON.stringify(t.posts.map(function (p) { return p.body.p_action; }))); return false; }
  if (zp && !('prefs' in zp)) ok('runtime: globalOff zeroes prefs with flat flags');
  else { no('runtime: globalOff zero-prefs post', JSON.stringify(zp)); return false; }
  return true;
}

(async function () {
  try {
    var t1 = await scenarioAuthGetJSONP();
    if (t1) {
      if (await scenarioEnableFlow(t1)) {
        await scenarioSavePrefs(t1);
        await scenarioGlobalOff(t1);
      }
    }
    await scenarioFallback();
  } catch (e) {
    no('runtime harness', String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '));
  }
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('failures:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
  process.exit(fails.length ? 1 : 0);
})();
