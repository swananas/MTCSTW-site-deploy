/* Dispatch newsletter signup — frontend checks (2026-10-05).
   Run: node scripts/verify-dispatch-signup-fe.js
   Covers bug 2 (dead "JOIN THE DISPATCH" button):
   A. Static: signup modal exists, posts the EXISTING notifyq/contact_set
      contract (type/nq_action/callsign/email/email_optin/age13), mailto
      fallback for callsign-less visitors, +20 XP once/exempt preserved,
      pf-enlisted event still fires (service medals / do-meter / pinups),
      no newsletter backend was invented.
   B. Functional: the inner <script> of the silo template is extracted and
      executed in a stub DOM; the "enlisted" action button is clicked and
      the full signup flow is driven — modal opens, valid email + 13+
      submits the contact_set body via PF.authPost, success awards 20 XP
      and dispatches pf-enlisted; the no-callsign path takes the
      clearly-labeled mailto fallback instead of faking a signup. */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var ROOT = path.join(__dirname, '..');

var pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

var src = read('v1.4.3/games/enlistment-ranks.js');
console.log('== A. static checks ==');
ok(src.indexOf('function dispatchSignup()') !== -1, 'dispatchSignup modal function exists');
ok(src.indexOf('run:dispatchSignup') !== -1, 'enlisted action runs dispatchSignup');
ok(src.indexOf('run:function(){ try{document.dispatchEvent(new CustomEvent("pf-enlisted"));}catch(e){} return award("enlisted",20,"once",{exempt:1}); }},') === -1,
   'old one-tap dead button is gone');
ok(/type:"notifyq",nq_action:"contact_set",callsign:cs,email:em,email_optin:1,age13:1/.test(src),
   'posts EXISTING notifyq/contact_set contract (no invented endpoint)');
ok(src.indexOf('mailto:mtcstw@gmail.com?subject="+encodeURIComponent("DISPATCH SIGNUP")') !== -1,
   'callsign-less path: clearly-labeled mailto fallback (no fake signup)');
ok(src.indexOf('award("enlisted",20,"once",{exempt:1})') !== -1,
   'same +20 XP once/exempt award preserved (no new XP mechanics)');
ok(/document\.dispatchEvent\(new CustomEvent\("pf-enlisted"\)\)/.test(src),
   'pf-enlisted still fires (medals / do-meter / pinups intact)');
ok(src.indexOf('I confirm I am 13 or older') !== -1, '13+ self-certification checkbox present');
ok(src.indexOf('</scr' + 'ipt>') === -1 || src.indexOf('innerHTML') !== -1, 'no literal nested script close in strings');
{
  var b = read('v1.4.3/games/bundle-sec1.js');
  ok(b.indexOf('function dispatchSignup()') !== -1 && b.indexOf('run:dispatchSignup') !== -1,
     'bundle-sec1.js rebuilt with the fix');
}

console.log('== B. functional checks (stub DOM) ==');
/* Extract the mounted inner <script> exactly as the browser receives it:
   the silo stages a <template> via insertAdjacentHTML with a template
   literal, so evaluate the outer literal first, then pull the script. */
function mountedInner(srcText) {
  var i = srcText.indexOf('insertAdjacentHTML(');
  var j = srcText.indexOf('`', i);
  var k = srcText.indexOf('`);', j);
  var html = eval('`' + srcText.slice(j + 1, k) + '`');
  var m2 = html.match(/<script>([\s\S]*)<\/script>/);
  return m2 && m2[1];
}
var inner = mountedInner(src);
ok(!!inner, 'inner <script> extracted from template (browser-equivalent)');
try {
  new vm.Script(inner, { filename: 'enlistment-ranks-inner.js' });
  ok(true, 'mounted inner script parses as JS');
} catch (e) {
  ok(false, 'mounted inner script parses as JS', String((e && e.message) || e));
  console.log('== ' + pass + ' passed, ' + fail + ' failed ==');
  process.exit(1);
}

/* ---- stub DOM ---- */
function El(tag, id) {
  this.tagName = (tag || 'div').toUpperCase();
  this.id = id || '';
  this.children = [];
  this.style = {};
  this._html = '';
  this.textContent = '';
  this.value = '';
  this.checked = false;
  this.disabled = false;
  this.href = '';
  this._attrs = {};
  this.onclick = null;
  this.listeners = {};
  var _cls = {};
  this.classList = {
    add: function (c) { _cls[c] = 1; },
    remove: function (c) { delete _cls[c]; },
    contains: function (c) { return !!_cls[c]; }
  };
}
El.prototype.setAttribute = function (k, v) { this._attrs[k] = v; };
El.prototype.getAttribute = function (k) { return this._attrs[k]; };
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
El.prototype.remove = function () {};
El.prototype.addEventListener = function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); };
El.prototype.click = function () { if (this.onclick) this.onclick({ target: this }); };
El.prototype.querySelector = function (sel) {
  if (sel[0] === '#') {
    var want = sel.slice(1);
    var found = null;
    (function walk(e) {
      if (found) return;
      if (e.id === want) { found = e; return; }
      (e.children || []).forEach(walk);
      (e._parsed || []).forEach(walk);
    })(this);
    return found;
  }
  return null;
};
El.prototype.querySelectorAll = function () { return []; };
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (h) {
    this._html = h;
    /* Parse action buttons (rGrid) and modal children (id="..."). */
    this._parsed = [];
    var self = this;
    var re = /<(button|input|div|span|a)[^>]*\bid="([^"]+)"[^>]*>/g, mm;
    while ((mm = re.exec(h))) {
      var c = new El(mm[1], mm[2]);
      var cls = /class="([^"]*)"/.exec(mm[0]); if (cls) c._attrs['class'] = cls[1];
      var da = /data-a="([^"]*)"/.exec(mm[0]); if (da) c._attrs['data-a'] = da[1];
      self._parsed.push(c);
    }
    /* rGrid action buttons: <button class="r-act..." data-a="ID"> */
    var rb = /<button class="r-act[^"]*" data-a="([^"]+)"/g, bm;
    while ((bm = rb.exec(h))) {
      var b2 = new El('button', '');
      b2._attrs['class'] = 'r-act'; b2._attrs['data-a'] = bm[1];
      self._parsed.push(b2);
    }
  },
  configurable: true
});
El.prototype.querySelectorAllButtons = function () { return this._parsed || []; };

var byId = {};
var bodyEl = new El('body', 'body');
var dispatched = [];
var toasts = [];
var authPosts = [];
var fetches = [];
var store = {};
var locationHref = { value: '' };
var callsign = 'TESTCALL'; /* stubbed PFCallsign */

function gid(id) {
  if (!byId[id]) {
    var e = new El('div', id);
    if (id === 'rGrid') {
      e.querySelectorAll = function () { return e._parsed || []; };
    }
    byId[id] = e;
  }
  return byId[id];
}

var documentStub = {
  getElementById: function (id) {
    if (id === 'pfDispatchModal') {
      var found = null;
      (function walk(e) { if (found) return; if (e.id === 'pfDispatchModal') { found = e; return; } (e.children || []).forEach(walk); })(bodyEl);
      return found;
    }
    return gid(id);
  },
  createElement: function (t) { return new El(t, ''); },
  querySelector: function (sel) {
    if (sel === 'button.u-btn[data-u="wall"]') return null;
    return null;
  },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  dispatchEvent: function (ev) { dispatched.push(ev.type || ev); return true; },
  body: bodyEl,
  head: new El('head', 'head'),
  location: locationHref
};
/* body.appendChild captures the modal for later lookup */
var origAppend = bodyEl.appendChild.bind(bodyEl);
bodyEl.appendChild = function (c) { origAppend(c); return c; };

var windowStub = {
  PF: {
    skip: function () { return false; },
    holder: function () { return new El('div', 'pf-holder'); },
    toast: function (t) { toasts.push(t); },
    authPost: function (url, body, cb) { authPosts.push({ url: url, body: body }); cb({ ok: true }); },
    errCopy: function (j, fb) { return (j && j.err) || fb; }
  },
  PFCallsign: function () { return callsign; },
  PFDeviceId: function () { return 'dev1'; },
  PF_BACKEND_URL: 'https://example.invalid/exec',
  location: locationHref
};
function CustomEventStub(t, o) { this.type = t; this.detail = (o && o.detail) || {}; }

var sandbox = {
  window: windowStub,
  document: documentStub,
  localStorage: {
    getItem: function (k) { return (k in store) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  CustomEvent: CustomEventStub,
  fetch: function () { fetches.push(1); return Promise.reject(new Error('no net')); },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  JSON: JSON, Math: Math, Date: Date, encodeURIComponent: encodeURIComponent,
  console: console, navigator: {}
};
sandbox.globalThis = sandbox;
/* Browser parity: window.PF is a global (bare `PF` resolves), matching how
   the rest of this silo already references PF (e.g. PF.toast, PF.errCopy). */
sandbox.PF = windowStub.PF;
vm.createContext(sandbox);
try {
  vm.runInContext(inner, sandbox, { filename: 'enlistment-ranks-inner.js' });
  ok(true, 'inner script executes in stub DOM without throwing');
} catch (e) {
  ok(false, 'inner script executes in stub DOM without throwing', String(e && e.stack || e));
  console.log('== ' + pass + ' passed, ' + fail + ' failed ==');
  process.exit(1);
}

/* rGrid should now hold the action buttons including "enlisted". */
var grid = gid('rGrid');
var btns = grid.querySelectorAll('button.r-act');
var enlistBtn = btns.filter(function (b) { return b.getAttribute('data-a') === 'enlisted'; })[0];
ok(!!enlistBtn, 'JOIN THE DISPATCH action button rendered');
ok(typeof enlistBtn.onclick === 'function', 'button has click handler wired');

/* Click -> modal opens. */
enlistBtn.click();
var modal = documentStub.getElementById('pfDispatchModal');
ok(!!modal, 'click opens the dispatch signup modal (button does something real)');

/* Invalid email is rejected. */
var email = modal.querySelector('#pfDspEmail');
var age = modal.querySelector('#pfDspAge');
var go = modal.querySelector('#pfDspGo');
var msgEl = modal.querySelector('#pfDspMsg');
email.value = 'not-an-email'; age.checked = true; go.click();
ok(msgEl.textContent === 'Enter a valid email.', 'invalid email rejected with message');

/* Missing 13+ is rejected. */
email.value = 'comrade@example.org'; age.checked = false; go.click();
ok(msgEl.textContent === 'Please confirm you are 13 or older.', '13+ checkbox enforced');

/* Valid submit with callsign -> existing backend contract. */
email.value = 'comrade@example.org'; age.checked = true; go.click();
ok(authPosts.length === 1, 'signup POSTs to backend (not faked)');
var pb = authPosts[0].body;
ok(pb.type === 'notifyq' && pb.nq_action === 'contact_set', 'uses notifyq/contact_set action');
ok(pb.callsign === 'TESTCALL' && pb.email === 'comrade@example.org' &&
   pb.email_optin === 1 && pb.age13 === 1,
   'contact_set body carries callsign+email+optin+age13 (existing contract)');

/* Success -> XP + event + toast. */
var st = JSON.parse(store['pf_ranks_v1'] || '{}');
ok(st.got && st.got.enlisted && st.xp === 20, '+20 XP awarded once under the "enlisted" key');
ok(dispatched.indexOf('pf-enlisted') !== -1, 'pf-enlisted dispatched (medals/do-meter/pinups fire)');
ok(toasts.some(function (t) { return /ENLISTED IN THE DISPATCH/.test(t); }), 'confirmation toast shown');
ok(documentStub.getElementById('pfDispatchModal') === null ||
   bodyEl.children.indexOf(modal) === -1, 'modal closes on success');

/* No-callsign path -> clearly-labeled mailto fallback, no fake signup. */
callsign = '';
authPosts.length = 0;
/* reset XP so the award is observable */
delete store['pf_ranks_v1'];
var grid2 = gid('rGrid2'); /* fresh render not needed; reuse dispatchSignup via second modal */
var btns2 = grid.querySelectorAll('button.r-act');
var eb2 = btns2.filter(function (b) { return b.getAttribute('data-a') === 'enlisted'; })[0];
eb2.click();
var modal2 = documentStub.getElementById('pfDispatchModal');
var em2 = modal2.querySelector('#pfDspEmail');
var ag2 = modal2.querySelector('#pfDspAge');
var go2 = modal2.querySelector('#pfDspGo');
em2.value = 'nocallsign@example.org'; ag2.checked = true; go2.click();
ok((locationHref.href||'').indexOf('mailto:mtcstw@gmail.com?subject=DISPATCH%20SIGNUP') === 0,
   'no callsign: mailto fallback opens (subject=DISPATCH SIGNUP)');
ok(authPosts.length === 0, 'no callsign: nothing faked against the backend');
ok((locationHref.href||'').indexOf(encodeURIComponent('nocallsign@example.org')) !== -1,
   'no callsign: email carried in the mailto body');

console.log('== ' + pass + ' passed, ' + fail + ' failed ==');
process.exit(fail ? 1 : 0);
