/* Callsign recovery FE verification (branch fe/callsign-recovery).
   Runs core/29-callsign-recovery.js in Node with a minimal fake DOM and a
   mocked backend contract, then asserts the recovery flow end-to-end.
   Run: node tests/callsign-recovery.verify.cjs (from repo root) */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3/core/29-callsign-recovery.js');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

/* ---------- minimal fake DOM ---------- */
function makeEl(tag) {
  var el = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [], parentNode: null, attributes: {},
    _html: '', _text: '',
    style: {},
    id: '', className: '',
    value: '', disabled: false,
    onclick: null, onkeydown: null,
    _listeners: {},
    getAttribute: function (k) { return this.attributes[k] || null; },
    setAttribute: function (k, v) { this.attributes[k] = String(v); },
    hasAttribute: function (k) { return k in this.attributes; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) {
      var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
      c.parentNode = null; return c;
    },
    addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
    focus: function () {},
    click: function () { if (typeof this.onclick === 'function') this.onclick({ target: this, preventDefault: function () {} }); },
    querySelector: function (sel) { return findIn(this, sel); },
    closest: function (sel) {
      var n = this;
      while (n) { if (matches(n, sel)) return n; n = n.parentNode; }
      return null;
    },
  };
  Object.defineProperty(el, 'textContent', {
    get: function () { return this._text; },
    set: function (v) { this._text = String(v); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (html) { setHTML(el, html); },
  });
  return el;
}
function matches(el, sel) {
  if (!sel || !el || !el.getAttribute) return false;
  return String(sel).split(',').some(function (part) { return matchesOne(el, part.trim()); });
}
function matchesOne(el, sel) {
  if (!sel || !el || !el.getAttribute) return false;
  if (sel[0] === '#') return el.id === sel.slice(1);
  var m = sel.match(/^\[([a-z0-9-]+)(="([^"]*)")?\]$/i);
  if (m) {
    var v = el.getAttribute(m[1]);
    if (v == null) return false;
    if (m[3] !== undefined) return v === m[3];
    return true;
  }
  return false;
}
function findIn(root, sel) {
  if (matches(root, sel)) return root;
  for (var i = 0; i < root.children.length; i++) {
    var f = findIn(root.children[i], sel);
    if (f) return f;
  }
  return null;
}
/* Parse innerHTML enough for the module: harvest id=".." and data-pf-*
   attributes into stub children registered on the parent. */
function setHTML(el, html) {
  el._html = String(html);
  el.children = [];
  var re = /<([a-zA-Z0-9]+)([^>]*)>/g, m;
  while ((m = re.exec(el._html))) {
    var attrs = m[2], c = makeEl(m[1]);
    var idm = attrs.match(/id="([^"]+)"/);
    if (idm) c.id = idm[1];
    var clm = attrs.match(/class="([^"]+)"/);
    if (clm) c.className = clm[1];
    var dam = attrs.match(/(data-pf-[a-z-]+)(="([^"]*)")?/g);
    if (dam) dam.forEach(function (d) {
      var dm = d.match(/(data-pf-[a-z-]+)(="([^"]*)")?/);
      c.setAttribute(dm[1], dm[3] === undefined ? '' : dm[3]);
    });
    el.appendChild(c);
  }
}

var store = {};
var dispatched = [];
var fetchCalls = [];
var fetchResponder = null;

function freshWindow(disabled) {
  store = {}; dispatched = []; fetchCalls = []; fetchResponder = null;
  var body = makeEl('body');
  var head = makeEl('head');
  var docListeners = {};
  var doc = {
    body: body, head: head,
    createElement: makeEl,
    getElementById: function (id) { return findIn(body, '#' + id); },
    querySelector: function (sel) { return findIn(body, sel); },
    addEventListener: function (t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    _listeners: docListeners,
    execCommand: function () { return true; },
  };
  body.parentNode = doc; head.parentNode = doc;
  var win = {
    PF: {
      skip: function (s) { return (disabled || []).indexOf(s) !== -1; },
      saveAuthSecret: function (s) { try { store.pf_auth_secret = String(s); } catch (e) {} },
      getAuthSecret: function () { return store.pf_auth_secret || ''; },
      toast: function (m) { win._toasts = win._toasts || []; win._toasts.push(m); },
    },
    PF_BACKEND_URL: 'https://example.test/auth',
    PFDeviceId: function () { return 'd-testdevice'; },
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
    },
    document: doc,
    CustomEvent: function (t, o) { this.type = t; this.detail = (o && o.detail) || {}; },
    navigator: {},
    location: { reload: function () { win._reloaded = true; } },
    _toasts: [], _reloaded: false,
  };
  win.document.defaultView = win;
  return win;
}
function fireClick(win, target) {
  var handlers = win.document._listeners.click || [];
  handlers.forEach(function (h) { h({ target: target, preventDefault: function () {} }); });
}

function loadModule(win) {
  var src = fs.readFileSync(MOD, 'utf8');
  var fn = new Function('window', 'document', 'localStorage', 'fetch', 'navigator', 'location',
    'CustomEvent', 'setTimeout', 'clearTimeout', 'AbortController',
    'src');
  /* Rewire the bare globals the IIFE uses to our fakes. */
  var code = 'var window=arguments[0],document=arguments[1],localStorage=arguments[2],' +
    'fetch=arguments[3],navigator=arguments[4],location=arguments[5],' +
    'CustomEvent=arguments[6],setTimeout=arguments[7],clearTimeout=arguments[8],' +
    'AbortController=arguments[9];' +
    'var dispatchEvent=function(e){dispatched.push(e);};' +
    src;
  /* eslint-disable-next-line no-new-func */
  var runner = new Function(code + '\nreturn window.PF;');
  /* Provide document.dispatchEvent hook via the window proxy below. */
  win.document.dispatchEvent = function (e) { dispatched.push(e); };
  runner.call(win, win, win.document, win.localStorage,
    function (url, o) {
      var body = null;
      try { body = JSON.parse(o.body); } catch (e) {}
      fetchCalls.push({ url: url, body: body });
      var resp = fetchResponder ? fetchResponder(body) : { ok: false };
      return Promise.resolve({ json: function () { return Promise.resolve(resp); } });
    },
    win.navigator, win.location, win.CustomEvent,
    function (f) { return 0; }, function () {}, undefined);
  return win.PF;
}

/* ================= TESTS ================= */
console.log('callsign recovery module — functional verification');

/* 1. API surface + kill switch */
var w1 = freshWindow([]);
var PF1 = loadModule(w1);
ok('module exposes openCallsignRecovery', typeof PF1.openCallsignRecovery === 'function');
ok('module exposes openRecoveryIssue', typeof PF1.openRecoveryIssue === 'function');
ok('module exposes recoverLinkHTML', typeof PF1.recoverLinkHTML === 'function');
ok('module exposes mountRecoveryEntry', typeof PF1.mountRecoveryEntry === 'function');
var link = PF1.recoverLinkHTML();
ok('recoverLinkHTML contains the data-pf-recover-cs tap hook', /data-pf-recover-cs="1"/.test(link));
ok('recoverLinkHTML copy is "Already have one? Recover it"', /Already have one\? Recover it/.test(link));
ok('recoverLinkHTML mentions nothing about donate', !/donate/i.test(link));

var w1k = freshWindow(['29-callsign-recovery']);
var PF1k = loadModule(w1k);
ok('kill switch (?pf_off) keeps the module dormant', typeof PF1k.openCallsignRecovery !== 'function');

/* 2. Delegated tap opens the recovery modal */
var w2 = freshWindow([]);
var PF2 = loadModule(w2);
var fakeBtn = makeEl('button');
fakeBtn.setAttribute('data-pf-recover-cs', '1');
w2.document.body.appendChild(fakeBtn);
fireClick(w2, fakeBtn);
var modal = w2.document.getElementById('pf-recover-modal');
ok('data-pf-recover-cs tap opens #pf-recover-modal', !!modal);
ok('modal has callsign + code inputs', !!modal.querySelector('#pf-rec-cs') && !!modal.querySelector('#pf-rec-code'));
ok('modal has RECOVER IT button', !!modal.querySelector('#pf-rec-btn'));

/* 3. Successful recover saves secret + callsign, dispatches event */
var w3 = freshWindow([]);
var PF3 = loadModule(w3);
PF3.openCallsignRecovery();
fetchResponder = function (body) {
  if (body && body.auth_action === 'auth_recover') return { ok: true, callsign: 'testcs', auth_secret: 'sec-abc-123' };
  return { ok: false };
};
var m3 = w3.document.getElementById('pf-recover-modal');
m3.querySelector('#pf-rec-cs').value = 'testcs';
m3.querySelector('#pf-rec-code').value = 'ABCD-EFGH-JKLM-NPQR';
m3.querySelector('#pf-rec-btn').click();
setTimeout(function () {
  var id = {};
  try { id = JSON.parse(store.pf_identity_v1 || '{}'); } catch (e) {}
  ok('recover posts auth_recover with the documented contract', fetchCalls.some(function (c) {
    return c.body && c.body.type === 'auth' && c.body.auth_action === 'auth_recover' &&
      c.body.callsign === 'testcs' && c.body.recovery_code === 'ABCD-EFGH-JKLM-NPQR' && c.body.device === 'd-testdevice';
  }));
  ok('success saves auth_secret via the existing helper path', store.pf_auth_secret === 'sec-abc-123');
  ok('success writes callsign into pf_identity_v1', id.callsign === 'testcs');
  ok('success dispatches pf-callsign-claimed', dispatched.some(function (e) { return e.type === 'pf-callsign-claimed'; }));
  ok('modal shows the RECOVERED state', /RECOVERED|Welcome back/.test(
    (m3.querySelector('#pf-rec-body') || {}).innerHTML || ''));

  /* 4. Failure: uniform, non-leaking error copy */
  var w4 = freshWindow([]);
  var PF4 = loadModule(w4);
  PF4.openCallsignRecovery();
  fetchResponder = function () { return { ok: false, err: 'invalid recovery credentials' }; };
  var m4 = w4.document.getElementById('pf-recover-modal');
  m4.querySelector('#pf-rec-cs').value = 'nosuchcs';
  m4.querySelector('#pf-rec-code').value = 'ZZZZ-ZZZZ-ZZZZ-ZZZZ';
  m4.querySelector('#pf-rec-btn').click();
  setTimeout(function () {
    var errEl = m4.querySelector('#pf-rec-err');
    var errTxt = errEl ? errEl.textContent : '';
    ok('failure shows a user-friendly message', /check out|Double-check/i.test(errTxt));
    ok('failure never distinguishes callsign/code/lockout', !/lock|unknown|no such|banned/i.test(errTxt));
    ok('failure saves nothing', !store.pf_auth_secret && !store.pf_identity_v1);

    /* 5. Issue flow: "Get a recovery code" panel */
    var w5 = freshWindow([]);
    store.pf_identity_v1 = JSON.stringify({ callsign: 'testcs' });
    store.pf_auth_secret = 'sec-abc-123';
    var PF5 = loadModule(w5);
    fetchResponder = function (body) {
      if (body && body.auth_action === 'auth_recovery_issue')
        return { ok: true, recovery_code: 'ABCD-EFGH-JKLM-NPQR' };
      return { ok: false };
    };
    PF5.openRecoveryIssue();
    var m5 = w5.document.getElementById('pf-recover-modal');
    ok('issue panel opens for the authed device', !!m5 && !!m5.querySelector('#pf-rec-i-btn'));
    m5.querySelector('#pf-rec-i-btn').click();
    setTimeout(function () {
      ok('issue posts auth_recovery_issue with callsign + secret', fetchCalls.some(function (c) {
        return c.body && c.body.auth_action === 'auth_recovery_issue' &&
          c.body.callsign === 'testcs' && c.body.auth_secret === 'sec-abc-123';
      }));
      var ibHtml = ((m5.querySelector('#pf-rec-i-body') || {}).innerHTML) || '';
      ok('code panel renders the code in large groups', !!m5.querySelector('#pf-rec-i-code') && /ABCD-EFGH-JKLM-NPQR/.test(ibHtml));
      ok('code panel has a copy button', !!m5.querySelector('#pf-rec-i-copy'));
      ok('write-it-down warning is present', /SHOWN AGAIN/i.test(ibHtml));
      ok('security warning about code misuse is present', /Anyone with this code can move your callsign/i.test(ibHtml));

      /* 6. Identity entry point: idempotent, only when logged in */
      var w6 = freshWindow([]);
      var PF6 = loadModule(w6);
      var rWho = makeEl('div'); rWho.id = 'rWho';
      w6.document.body.appendChild(rWho);
      ok('entry does not mount with no callsign', PF6.mountRecoveryEntry(rWho) === false);
      store.pf_identity_v1 = JSON.stringify({ callsign: 'testcs' });
      ok('entry mounts for a logged-in callsign', PF6.mountRecoveryEntry(rWho) === true);
      function entryCount() {
        var n = 0;
        rWho.children.forEach(function (c) { if (c.hasAttribute('data-pf-recovery-entry')) n++; });
        return n;
      }
      ok('entry markup contains the GET A RECOVERY CODE tap', !!rWho.querySelector('[data-pf-recovery-issue]'));
      PF6.mountRecoveryEntry(rWho);
      ok('entry is idempotent (no duplicate mounts)', entryCount() === 1);
      /* delegated tap on the entry opens the issue panel */
      var entryBtn = rWho.querySelector('[data-pf-recovery-issue]');
      fireClick(w6, entryBtn);
      ok('entry tap opens the recovery-issue modal', !!w6.document.getElementById('pf-recover-modal'));

      console.log('\n' + pass + ' passed, ' + fail + ' failed');
    }, 30);
  }, 30);
}, 30);
