/* Frontend harness for the Forged For You tray (games/studio-drafts-tray.js).
   DOM-stub smoke: tray renders, empty state, draft row -> preview, dismiss
   removes row, unknown template degrades, kill switch, no-XP assertion,
   plus the CEO's double-grant vector (generate #1 + draft post later =
   exactly one share-credit per post action; dismiss/preview = zero).
   Run: node tests/studio-drafts-tray.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var WT = '/home/hatch/workspace/worktrees/fe-studio-drafts-tray';
var SRC = path.join(WT, 'v1.4.3', 'games', 'studio-drafts-tray.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

/* ---------- minimal DOM stub ---------- */
function matches(node, sel) {
  if (!node || !sel) return false;
  if (sel.charAt(0) === '#') return node.id === sel.slice(1);
  if (sel.charAt(0) === '.') {
    var want = sel.slice(1).split('.')[0];
    return ((' ' + (node.className || '') + ' ').indexOf(' ' + want + ' ') !== -1);
  }
  return (node.tagName || '').toLowerCase() === sel.toLowerCase();
}
function walk(node, sel, out) {
  if (!node) return out;
  if (matches(node, sel)) out.push(node);
  for (var i = 0; i < node.children.length; i++) walk(node.children[i], sel, out);
  return out;
}
function makeEl(tag, doc) {
  var _id = '';
  var el = {
    tagName: String(tag).toUpperCase(), children: [], parentNode: null,
    className: '', textContent: '', style: {}, attributes: {},
    value: '', disabled: false, _handlers: {},
    setAttribute: function (k, v) {
      this.attributes[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k === 'disabled') this.disabled = true;
    },
    getAttribute: function (k) { return this.attributes[k]; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) {
      var i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
      c.parentNode = null; return c;
    },
    insertBefore: function (n, ref) {
      var i = ref ? this.children.indexOf(ref) : -1;
      n.parentNode = this;
      if (i < 0) this.children.push(n); else this.children.splice(i, 0, n);
      return n;
    },
    remove: function () { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener: function (t, fn) { (this._handlers[t] = this._handlers[t] || []).push(fn); },
    dispatchEvent: function () { return true; },
    click: function () {
      var h = this._handlers.click || [];
      for (var i = 0; i < h.length; i++) h[i]({ target: this, preventDefault: function () {} });
    },
    scrollIntoView: function () {},
    querySelector: function (sel) { return walk(this, sel, [])[0] || null; },
    querySelectorAll: function (sel) { return walk(this, sel, []); }
  };
  /* Browser-faithful tree accessors. */
  Object.defineProperty(el, 'firstChild', {
    get: function () { return this.children[0] || null; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(el, 'lastChild', {
    get: function () { var c = this.children; return c[c.length - 1] || null; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(el, 'nextSibling', {
    get: function () {
      if (!this.parentNode) return null;
      var sibs = this.parentNode.children, i = sibs.indexOf(this);
      return (i >= 0 && i + 1 < sibs.length) ? sibs[i + 1] : null;
    },
    enumerable: true, configurable: true
  });
  /* id as accessor so direct property assignment (tray.id = 'x') registers
     in the document index, like a real browser. */
  Object.defineProperty(el, 'id', {
    get: function () { return _id; },
    set: function (v) {
      if (_id && doc._byId[_id] === el) delete doc._byId[_id];
      _id = String(v);
      if (_id) doc._byId[_id] = el;
    },
    enumerable: true, configurable: true
  });
  return el;
}

function makeEnv(opts) {
  opts = opts || {};
  var store = {};
  var docEvents = {};
  var doc = {
    _byId: {},
    head: null, body: null,
    hidden: false,
    createElement: function (tag) { return makeEl(tag, doc); },
    getElementById: function (id) { return doc._byId[id] || null; },
    getElementsByTagName: function (t) {
      return t.toLowerCase() === 'head' ? [doc.head] : [];
    },
    addEventListener: function (t, fn) { (docEvents[t] = docEvents[t] || []).push(fn); },
    dispatchEvent: function (ev) {
      var h = docEvents[ev.type] || [];
      for (var i = 0; i < h.length; i++) h[i](ev);
      return true;
    },
    querySelectorAll: function () { return []; }
  };
  doc.head = makeEl('head', doc);
  doc.body = makeEl('body', doc);

  var qs = opts.qs || '';
  var CustomEventCtor = function (type, o) { this.type = type; this.detail = (o && o.detail) || null; };
  var win = {
    PF: null,
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { href: 'https://www.mtcstw.com/', search: qs, pathname: '/' },
    PFCallsign: function () { return 'testwarlord'; },
    PFDeviceId: function () { return 'd-test1'; },
    CustomEvent: CustomEventCtor
  };

  /* PHQShare stub — mirrors the real contract (core/share-image-phq.js,
     parallel workstream): paint -> canvas|null, share/save -> bool, and the
     share flow's own once-per-day credit gate (creditShare fires one
     'pf-share-image' credit per day, like share-image.js). */
  var creditGate = {};
  var creditLog = [];
  var shareCalls = [], saveCalls = [], paintCalls = [];
  function creditShare(gameId, kind, day) {
    day = day || opts.creditDay || new Date().toISOString().slice(0, 10);
    var k = 'pf_shareimg_' + day;
    if (creditGate[k]) return false;
    creditGate[k] = true;
    creditLog.push({ game: gameId, kind: kind, day: day });
    return true;
  }
  var KNOWN = ['phq-pressure', 'phq-prediction'];
  win.PF = {
    skip: function (silo) { return qs.indexOf('pf_off=' + silo) !== -1; },
    log: function () {}, error: function () {},
    toast: function (m) { opts.toasts.push(m); },
    friendlyErr: function (j) { return (j && (j.err || j.error)) || ''; },
    authGetJSONP: function (url, action, params, cb) {
      opts.getCalls.push({ action: action, params: params });
      try { cb(opts.getResponse); } catch (e) {}
    },
    postAction: function (type, key, action, params, cb) {
      opts.postCalls.push({ type: type, key: key, action: action, params: params });
      try { cb(opts.postResponse || { ok: true }); } catch (e) {}
    },
    PHQShare: {
      ids: KNOWN.slice(),
      paint: function (id, data) {
        paintCalls.push({ id: id, data: data });
        if (KNOWN.indexOf(id) === -1) return null;
        var cv = makeEl('canvas', doc);
        cv.getContext = function () { return {}; };
        cv.width = 1080; cv.height = 1350;
        return cv;
      },
      share: function (id, data) {
        if (KNOWN.indexOf(id) === -1) return false;
        shareCalls.push({ id: id, data: data });
        creditShare(id, 'share');
        return true;
      },
      save: function (id, data) {
        if (KNOWN.indexOf(id) === -1) return false;
        saveCalls.push({ id: id, data: data });
        creditShare(id, 'save');
        return true;
      }
    },
    _t: { creditLog: creditLog, shareCalls: shareCalls, saveCalls: saveCalls,
          paintCalls: paintCalls, creditShare: creditShare, creditGate: creditGate }
  };

  var session = {};
  var g = {
    window: win, document: doc,
    localStorage: {
      getItem: function (k) { return store[k] || null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: {
      getItem: function (k) { return session[k] || null; },
      setItem: function (k, v) { session[k] = String(v); },
      removeItem: function (k) { delete session[k]; },
      _raw: session
    },
    setTimeout: function (fn) { opts.timeouts.push(fn); return opts.timeouts.length; },
    clearTimeout: function () {},
    setInterval: function (fn) { opts.intervals.push(fn); return opts.intervals.length; },
    clearInterval: function () {},
    console: console, Math: Math, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Date: Date, Error: Error, RegExp: RegExp,
    encodeURIComponent: encodeURIComponent, isFinite: isFinite, parseInt: parseInt,
    CustomEvent: CustomEventCtor
  };
  return { win: win, doc: doc, g: g };
}

function loadTray(env) {
  var src = fs.readFileSync(SRC, 'utf8');
  var fn = new Function('window', 'document', 'localStorage', 'sessionStorage',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'CustomEvent', 'IntersectionObserver', 'console',
    'Math', 'JSON', 'Object', 'Array', 'Number', 'String', 'Date',
    'Error', 'RegExp', 'encodeURIComponent', 'isFinite', 'parseInt',
    src);
  fn(env.win, env.doc, env.g.localStorage, env.g.sessionStorage,
    env.g.setTimeout, env.g.clearTimeout, env.g.setInterval, env.g.clearInterval,
    env.g.CustomEvent, undefined, console,
    Math, JSON, Object, Array, Number, String, Date,
    Error, RegExp, encodeURIComponent, isFinite, parseInt);
  return env;
}

function freshOpts(extra) {
  return Object.assign({
    qs: '', toasts: [], getCalls: [], postCalls: [], intervals: [], timeouts: [],
    getResponse: { ok: true, drafts: [] }, postResponse: { ok: true }
  }, extra || {});
}
/* anchor first, THEN load — the silo mounts at load time */
function booted(o, anchorId) {
  var env = makeEnv(o);
  if (anchorId) {
    var a = env.doc.createElement('div');
    a.setAttribute('id', anchorId);
    env.doc.body.appendChild(a);
  }
  return loadTray(env);
}
function trayOf(env) { return env.doc.getElementById('pf-forged-tray'); }
function byClass(root, cls) { return walk(root, '.' + cls, []); }
function btnByLabel(root, label) {
  var btns = walk(root, 'button', []);
  for (var i = 0; i < btns.length; i++) {
    if ((btns[i].textContent || '').trim() === label) return btns[i];
  }
  return null;
}
var NOW = Date.now();
function twoDrafts() {
  return { ok: true, drafts: [
    { id: 'd2', plugin: 'pressure', template: 'phq-prediction',
      title: 'Prediction settled: called it', data_snapshot: { statement: 'X', outcome: 'correct' },
      created: NOW - 2 * 3600 * 1000, read: false },
    { id: 'd1', plugin: 'pressure', template: 'phq-pressure',
      title: 'Pressure campaign: save the owls', data_snapshot: { title: 'owls' },
      created: NOW - 30 * 3600 * 1000, read: false }
  ] };
}

console.log('== studio-drafts-tray harness ==');

/* 1. tray renders + empty state */
(function () {
  var o = freshOpts();
  var env = booted(o, 'pf-ammo');
  ok('tray mounts after #pf-ammo', !!trayOf(env));
  ok('empty state shown', byClass(env.doc.body, 'fft-empty').length === 1);
  ok('empty-state copy exact', byClass(env.doc.body, 'fft-empty')[0].textContent ===
    'Nothing forged for you yet \u2014 take a civic action and the machine will draft your victory lap.');
  ok('backend queried with studio_drafts_get', o.getCalls.length === 1 && o.getCalls[0].action === 'studio_drafts_get');
  ok('no rows when empty', byClass(env.doc.body, 'fft-row').length === 0);
})();

/* 2. backend down -> empty gracefully */
(function () {
  var o = freshOpts({ getResponse: null });
  var env = booted(o, 'pf-ammo');
  ok('backend-down still renders tray', !!trayOf(env));
  ok('backend-down shows empty state', byClass(env.doc.body, 'fft-empty').length === 1);
})();

/* 3. draft rows: newest first, badge, age, unread dots */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var rows = byClass(trayOf(env), 'fft-row');
  ok('two rows', rows.length === 2);
  var titles = walk(rows[0], 'b', []).map(function (b) { return b.textContent; });
  ok('newest first', titles[0] === 'Prediction settled: called it');
  var plugins = byClass(rows[0], 'fft-plugin');
  ok('plugin badge uppercase', plugins.length === 1 && plugins[0].textContent === 'PRESSURE');
  var ages = byClass(rows[0], 'fft-age');
  ok('age "2h ago"', ages.length === 1 && ages[0].textContent === '2h ago');
  ok('unread dots present', byClass(rows[0], 'fft-dot').length === 1 &&
    byClass(rows[1], 'fft-dot').length === 1);
  var badge = byClass(trayOf(env), 'fft-unread');
  ok('unread badge = 2', badge.length === 1 && badge[0].textContent === '2');
})();

/* 4. row -> preview (paint called with template + data_snapshot) */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var rows = byClass(trayOf(env), 'fft-row');
  rows[0].click();
  var T = env.win.PF._t;
  ok('paint called once', T.paintCalls.length === 1);
  ok('paint got template + snapshot', T.paintCalls[0].id === 'phq-prediction' &&
    T.paintCalls[0].data && T.paintCalls[0].data.outcome === 'correct');
  ok('canvas in review', walk(trayOf(env), 'canvas', []).length === 1);
  ok('source line present', byClass(trayOf(env), 'fft-src').length === 1);
  ok('preview grants zero credits', T.creditLog.length === 0);
  var back = btnByLabel(trayOf(env), '\u2190 TRAY');
  ok('back button present', !!back);
  back.click();
  ok('back returns to list', byClass(trayOf(env), 'fft-row').length === 2);
  var seenDot = byClass(byClass(trayOf(env), 'fft-row')[0], 'fft-dot')[0];
  ok('opened draft shows seen dot', !!seenDot && seenDot.className.indexOf('seen') !== -1);
  var badge2 = byClass(trayOf(env), 'fft-unread');
  ok('badge stays 1 back in list', badge2.length === 1 && badge2[0].textContent === '1');
})();

/* 5. Post -> exact PF.PHQShare.share entry point, one credit */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  byClass(trayOf(env), 'fft-row')[0].click();
  var T = env.win.PF._t;
  var post = btnByLabel(trayOf(env), 'POST');
  ok('POST button enabled', !!post && !post.disabled);
  post.click();
  ok('share called with (template, data_snapshot)', T.shareCalls.length === 1 &&
    T.shareCalls[0].id === 'phq-prediction' && T.shareCalls[0].data.outcome === 'correct');
  ok('one share credit for the post action', T.creditLog.length === 1);
  ok('nothing auto-dismissed after post', byClass(trayOf(env), 'fft-review').length === 1);
})();

/* 6. THE DOUBLE-GRANT VECTOR: generate #1 (direct share) + draft post later
      same day -> the share gate credits exactly once total. */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var T = env.win.PF._t;
  /* generate #1: user posts straight from the political tab */
  env.win.PF.PHQShare.share('phq-pressure', { title: 'owls' });
  ok('generate #1 credits once', T.creditLog.length === 1);
  /* later: user posts the auto-enqueued draft for the same event */
  byClass(trayOf(env), 'fft-row')[1].click();
  btnByLabel(trayOf(env), 'POST').click();
  ok('draft post rides the same entry point', T.shareCalls.length === 2);
  ok('same-day draft post adds ZERO extra credit', T.creditLog.length === 1,
    'creditLog=' + JSON.stringify(T.creditLog));
  /* next day behaves like a normal fresh share (one credit per day) */
  T.creditShare('phq-pressure', 'share', '2099-01-01');
  ok('next-day share credits once (normal flow)', T.creditLog.length === 2);
})();

/* 7. dismiss -> zero XP, row removed */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var T = env.win.PF._t;
  byClass(trayOf(env), 'fft-row')[0].click();
  btnByLabel(trayOf(env), 'DISMISS').click();
  ok('dismiss POSTs studio_drafts_dismiss', o.postCalls.length === 1 &&
    o.postCalls[0].action === 'studio_drafts_dismiss' &&
    o.postCalls[0].type === 'studio' && o.postCalls[0].key === 'sd_action' &&
    o.postCalls[0].params.id === 'd2');
  ok('dismiss removes the row', byClass(trayOf(env), 'fft-row').length === 1);
  ok('dismiss toast fired', o.toasts.some(function (t) { return t.indexOf('dismissed') !== -1; }));
  ok('dismiss grants zero credits', T.creditLog.length === 0);
  ok('badge drops to 1', byClass(trayOf(env), 'fft-unread')[0].textContent === '1');
})();

/* 8. unknown template degrades: title + preview unavailable, no crash */
(function () {
  var o = freshOpts({ getResponse: { ok: true, drafts: [
    { id: 'dx', plugin: 'race', template: 'phq-race-not-real',
      title: 'Mystery draft', data_snapshot: {}, created: NOW - 60000, read: false }
  ] } });
  var env = booted(o, 'pf-ammo');
  var T = env.win.PF._t;
  byClass(trayOf(env), 'fft-row')[0].click();
  ok('preview-unavailable shown', byClass(trayOf(env), 'fft-unavail').length === 1);
  var post = btnByLabel(trayOf(env), 'POST');
  var save = btnByLabel(trayOf(env), 'SAVE');
  ok('POST disabled when unpaintable', !!post && post.disabled);
  ok('SAVE disabled when unpaintable', !!save && save.disabled);
  ok('share never called', T.shareCalls.length === 0);
  ok('EDIT still available', !!btnByLabel(trayOf(env), 'EDIT'));
  ok('DISMISS still available', !!btnByLabel(trayOf(env), 'DISMISS'));
  ok('zero credits', T.creditLog.length === 0);
})();

/* 9. kill switch */
(function () {
  var o = freshOpts({ qs: '?pf_off=forged-tray' });
  var env = booted(o, 'pf-ammo');
  ok('kill switch: no tray mounted', !trayOf(env));
  ok('kill switch: no backend call', o.getCalls.length === 0);
})();

/* 10. SAVE rides PF.PHQShare.save, same once-a-day gate */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var T = env.win.PF._t;
  byClass(trayOf(env), 'fft-row')[0].click();
  btnByLabel(trayOf(env), 'SAVE').click();
  ok('save called with (template, data)', T.saveCalls.length === 1 && T.saveCalls[0].id === 'phq-prediction');
  ok('save credits once', T.creditLog.length === 1);
  /* post after save same day -> still one credit (shared gate) */
  btnByLabel(trayOf(env), '\u2190 TRAY').click();
  byClass(trayOf(env), 'fft-row')[0].click();
  btnByLabel(trayOf(env), 'POST').click();
  ok('post-after-save same day adds zero', T.creditLog.length === 1);
})();

/* 11. EDIT: prefill payload stashed, forge-edit fired, nothing published */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  var T = env.win.PF._t;
  byClass(trayOf(env), 'fft-row')[0].click();
  var fired = [];
  env.doc.addEventListener('pf-forge-edit', function (ev) { fired.push(ev); });
  btnByLabel(trayOf(env), 'EDIT').click();
  var raw = env.g.sessionStorage.getItem('pf_forge_edit_v1');
  var payload = raw ? JSON.parse(raw) : null;
  ok('edit payload stashed', !!payload && payload.template === 'phq-prediction' &&
    payload.data.outcome === 'correct' && payload.source === 'forged-tray');
  ok('pf-forge-edit dispatched', fired.length === 1);
  o.timeouts.forEach(function (fn) { try { fn(); } catch (e) {} });
  ok('navigates to /create (forge lives there)', env.win.location.href === '/create');
  ok('edit publishes nothing', T.shareCalls.length === 0 && T.saveCalls.length === 0 && T.creditLog.length === 0);
})();

/* 12. pf-drafts-changed refreshes */
(function () {
  var o = freshOpts({ getResponse: twoDrafts() });
  var env = booted(o, 'pf-ammo');
  ok('initial fetch', o.getCalls.length === 1);
  env.doc.dispatchEvent(new env.g.CustomEvent('pf-drafts-changed'));
  ok('event triggers refetch', o.getCalls.length === 2);
  ok('60s poller armed', o.intervals.length === 1);
})();

/* 13. NO-XP static assertion: the tray file must contain no XP mechanics
      in CODE (comments documenting the invariant are stripped first). */
(function () {
  var src = fs.readFileSync(SRC, 'utf8');
  var code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/[^\n]*/gm, '');
  var banned = ['pf-share-image', 'creditShare', 'xpGrant', 'creditLocal', 'award(',
    'xp_today', 'localStorage'];
  var hits = banned.filter(function (t) { return code.indexOf(t) !== -1; });
  ok('no XP / share-credit / cross-session-cache tokens in code', hits.length === 0, 'hits=' + hits.join(','));
  var paCount = (code.match(/postAction/g) || []).length;
  ok('postAction appears exactly once in code (dismiss only)', paCount === 1, 'count=' + paCount);
  var ssCount = (code.match(/sessionStorage/g) || []).length;
  ok('sessionStorage used exactly once in code (forge-edit payload)', ssCount === 1, 'count=' + ssCount);
})();

/* 14. mount fallbacks: #pf-war-card anchor, then dedicated div */
(function () {
  var o = freshOpts();
  var env = booted(o, 'pf-war-card');
  ok('falls back to #pf-war-card anchor', !!trayOf(env));
  var o2 = freshOpts();
  var env2 = makeEnv(o2);
  var dedicated = env2.doc.createElement('div');
  dedicated.setAttribute('id', 'pf-forged-tray');
  env2.doc.body.appendChild(dedicated);
  loadTray(env2);
  ok('honors dedicated #pf-forged-tray div', env2.doc.getElementById('pf-forged-tray') === dedicated);
  var o3 = freshOpts();
  var env3 = makeEnv(o3);
  loadTray(env3);
  ok('no anchor -> visible error banner, no crash', !!env3.doc.getElementById('pf-forged-tray-missing'));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
