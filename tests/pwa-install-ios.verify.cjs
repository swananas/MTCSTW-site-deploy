#!/usr/bin/env node
/* tests/pwa-install-ios.verify.cjs — PWA INSTALL APP tap on iOS Safari
 * (2026-10-06, fix/pwa-install-ios-tap).
 *
 * Root cause it guards: install.js executes TWICE on v2 pages — once inside
 * bundle-core[-slr].js and once as the standalone pwa/install.js the footer
 * loader appends (JS_PWA). The per-instance `btn` closure could not see the
 * other instance, so two identical #pf-pwa-install buttons stacked at the
 * same spot: tapping the top one dismissed only that instance's button while
 * the twin underneath stayed put, making the tap look like a no-op (and a
 * tap on the top X dismissed silently with the twin still showing).
 *
 * The fix: (1) showButton() guards on the DOM id so only one button ever
 * exists; (2) the iOS tap opens a persistent modal card (the Share ->
 * Add to Home Screen guidance IS the feature on iOS — one-tap install is
 * impossible) instead of a 3s toast. Android/Chrome beforeinstallprompt
 * behavior is unchanged.
 *
 * Run: node tests/pwa-install-ios.verify.cjs
 *   1. node --check on v1.4.3/pwa/install.js
 *   2. Static checks on the comment-stripped view (NO string stripping —
 *      the AGENTS.md lesson: naive quote-stripping is regex-literal-blind)
 *   3. Mocked-browser runtime (vm + minimal DOM stub, iOS UA, controllable
 *      timers): boot install.js TWICE (bundle instance + standalone),
 *      fire load, run the 4s timers -> exactly one #pf-pwa-install button;
 *      tap the button body -> modal #pf-pwa-ios-guide appears and the
 *      button is gone; GOT IT closes the modal; backdrop tap closes it;
 *      X tap dismisses with no modal and sets the session flag; the second
 *      instance never stacks a duplicate.
 *   3f (Android): ZUCK 2026-10-09 — Android is now engagement-gated like iOS
 *      (2nd visit or first engagement unlocks the held prompt), so the
 *      scenario pre-seeds pf_pwa_visits_v1=2 exactly like the iOS scenarios
 *      do; the prompt/accept/dismiss mechanics asserted are unchanged.
 *   4. The rebuilt bundles (bundle-core.js, bundle-core-slr.js) contain
 *      the fix.
 * Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var INSTALL = path.join(ROOT, 'v1.4.3', 'pwa', 'install.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core.js');
var BUNDLE_SLR = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core-slr.js');
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

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + INSTALL, { stdio: 'pipe' }); ok('install.js syntax'); }
catch (e) { no('install.js syntax', 'node --check failed'); }

var src = read(INSTALL), code = stripComments(src);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract ==');
stat(code, 'duplicate guard: showButton checks DOM id pf-pwa-install',
  /getElementById\('pf-pwa-install'\)/);
stat(code, 'iOS guide modal builder exists', /function showIOSGuide/);
stat(code, 'modal id pf-pwa-ios-guide', /pf-pwa-ios-guide/);
stat(code, 'modal close id pf-pwa-ios-gotit', /pf-pwa-ios-gotit/);
stat(code, 'modal carries Add to Home Screen steps', /Add to Home Screen/);
stat(code, 'iOS tap path opens the modal', /showIOSGuide\(\)/);
stat(code, 'iOS tap path no longer fires the 3s toast',
  /dismiss\(false\);\s*try\s*\{\s*sessionStorage\.setItem\('pf_pwa_dismissed',\s*'1'\);\s*\}\s*catch\s*\([^)]*\)\s*\{\}\s*showIOSGuide\(\);/);
/* 2026-10-07 fix/pwa-glitch: the PWA glitch fixes. */
stat(code, 'single-boot guard stops double execution', /window\.__pfPwaBooted/);
stat(code, 'manifest uses anonymous CORS (not use-credentials)', /crossorigin:\s*'anonymous'/);
if (/use-credentials/.test(code)) no('no use-credentials on manifest', 'credentialed manifest fetch fails CORS on jsDelivr');
else ok('no use-credentials on manifest');
stat(code, 'pwaBase is version-agnostic (no hardcoded v1.4.3)', /\\\/v\\d\+\\\.\\d\+\\\.\\d\+\\\//);
/* Android/Chrome path untouched: deferred prompt + welcome toast. */
stat(code, 'Android: beforeinstallprompt still captured', /addEventListener\('beforeinstallprompt'/);
stat(code, 'Android: deferredPrompt.prompt() still called', /deferredPrompt\.prompt\(\)/);
stat(code, 'Android: welcome toast still fired', /Welcome to the factory/);
/* House copy rules. */
if (!/donate/i.test(code)) ok('no "donate" in copy'); else no('no "donate" in copy', 'banned word present');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. runtime (vm + fake DOM, iOS UA, 2 instances) ==');

var IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

function makeWorld() {
  var idIndex = {};
  function El(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parentNode = null;
    this.style = {}; this.attributes = {}; this._ls = {};
    this._id = ''; this.textContent = ''; this._html = '';
  }
  Object.defineProperty(El.prototype, 'id', {
    get: function () { return this._id; },
    set: function (v) {
      if (this._id && idIndex[this._id] === this) delete idIndex[this._id];
      this._id = String(v); if (this._id) idIndex[this._id] = this;
    }
  });
  Object.defineProperty(El.prototype, 'innerHTML', {
    get: function () { return this._html; },
    set: function (h) {
      this._html = String(h);
      var re = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, m;
      while ((m = re.exec(this._html))) {
        var idm = /id="([^"]+)"/.exec(m[2]);
        if (!idm) continue;
        var c = new El(m[1]); c.id = idm[1]; this.appendChild(c);
      }
    }
  });
  El.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); };
  El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
  El.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i > -1) this.children.splice(i, 1);
    c.parentNode = null;
    if (c.id && idIndex[c.id] === c) delete idIndex[c.id];
    return c;
  };
  El.prototype.addEventListener = function (t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); };
  El.prototype.dispatchEvent = function (ev) {
    ev.target = ev.target || this;
    var node = this;
    while (node) {
      var ls = node._ls[ev.type] || [];
      for (var i = 0; i < ls.length; i++) ls[i].call(node, ev);
      node = node.parentNode;
    }
    return true;
  };
  function walk(n, fn) { fn(n); for (var i = 0; i < n.children.length; i++) walk(n.children[i], fn); }

  var html = new El('html'), head = new El('head'), body = new El('body');
  html.appendChild(head); html.appendChild(body);
  function fakeScript(s) { var e = new El('script'); e.src = s; head.appendChild(e); }
  /* the two script tags the footer loader injects, in order */
  fakeScript('https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/core/bundle-core-slr.js');
  fakeScript('https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/pwa/install.js');

  var winLs = {}, timers = [];
  function storage() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      _dump: function () { return m; }
    };
  }
  var session = storage();
  var sb = {
    document: {
      createElement: function (t) { return new El(t); },
      getElementById: function (id) { return idIndex[id] || null; },
      getElementsByTagName: function (t) {
        var out = [];
        walk(html, function (n) { if (n.tagName === String(t).toUpperCase()) out.push(n); });
        return out;
      },
      querySelector: function (sel) {
        var m = /^(link|meta)\[(rel|name)="([^"]+)"\]$/.exec(sel), found = null;
        walk(html, function (n) {
          if (!found && m && n.tagName === m[1].toUpperCase() && n.attributes[m[2]] === m[3]) found = n;
        });
        return found;
      },
      head: head, body: body, documentElement: html
    },
    navigator: { userAgent: IPHONE_UA },
    location: { search: '', href: 'https://www.mtcstw.com/' },
    localStorage: storage(), sessionStorage: session,
    setTimeout: function (cb) { timers.push(cb); return timers.length; },
    clearTimeout: function () {},
    console: console,
    PF: { skip: function () { return false; }, toast: function () {} }
  };
  sb.window = sb; sb.globalThis = sb;
  sb.addEventListener = function (t, fn) { (winLs[t] = winLs[t] || []).push(fn); };
  sb.fire = function (t, ev) {
    (winLs[t] || []).forEach(function (fn) { fn.call(sb, ev || { type: t }); });
  };
  sb.matchMedia = function () { return { matches: false }; };
  sb.runTimers = function () { var q = timers.splice(0); q.forEach(function (cb) { cb(); }); };
  vm.createContext(sb);
  return { sb: sb, body: body, session: session, walk: walk,
    buttons: function () {
      var out = [];
      walk(html, function (n) { if (n.id === 'pf-pwa-install') out.push(n); });
      return out;
    } };
}

function bootTwo(w) {
  /* Simulate a RETURNING visitor: the iOS prompt gate needs >= 2 visits
     (or an engagement event). Pre-seeding keeps the scenarios focused on
     the button/modal behavior, not the visit gate. (2026-10-07
     fix/pwa-glitch: the old suite passed this gate only via the
     double-execution visit-count bug that the single-boot guard removes.) */
  w.sb.localStorage.setItem('pf_pwa_visits_v1', '2');
  vm.runInContext(src, w.sb, { filename: 'install.js#instanceA(bundle)' });
  vm.runInContext(src, w.sb, { filename: 'install.js#instanceB(standalone)' });
  w.sb.fire('load');
  w.sb.runTimers(); /* the load+4000ms timers, both instances */
}

function findById(w, root, id) {
  var found = null;
  w.walk(root, function (n) { if (!found && n.id === id) found = n; });
  return found;
}

/* --- 3a. two instances -> exactly one button --- */
(function () {
  var w = makeWorld(); bootTwo(w);
  var btns = w.buttons();
  if (btns.length === 1) ok('two instances render exactly ONE #pf-pwa-install button');
  else no('two instances render exactly ONE #pf-pwa-install button', 'found ' + btns.length);
})();

/* --- 3b. tap button body -> modal appears, button dismissed --- */
(function () {
  var w = makeWorld(); bootTwo(w);
  var btn = w.buttons()[0];
  btn.dispatchEvent({ type: 'click', target: btn, bubbles: true });
  var modal = w.sb.document.getElementById('pf-pwa-ios-guide');
  if (modal) ok('tap opens the iOS guide modal');
  else no('tap opens the iOS guide modal', '#pf-pwa-ios-guide missing');
  if (w.buttons().length === 0) ok('tap dismisses the button');
  else no('tap dismisses the button', 'button still in DOM');
  if (modal && /Add to Home Screen/.test(modal.children[0] ? modal.children[0].innerHTML : '') ||
      (modal && /Add to Home Screen/.test(modal.innerHTML || ''))) {
    ok('modal carries the Add to Home Screen steps');
  } else no('modal carries the Add to Home Screen steps', 'steps not found in modal HTML');
  /* GOT IT closes */
  var gotit = modal && findById(w, modal, 'pf-pwa-ios-gotit');
  if (!gotit) { no('GOT IT closes the modal', 'button not materialized'); return; }
  modal.dispatchEvent({ type: 'click', target: gotit, bubbles: true });
  if (!w.sb.document.getElementById('pf-pwa-ios-guide')) ok('GOT IT closes the modal');
  else no('GOT IT closes the modal', 'modal still in DOM');
})();

/* --- 3c. backdrop tap closes the modal --- */
(function () {
  var w = makeWorld(); bootTwo(w);
  var btn = w.buttons()[0];
  btn.dispatchEvent({ type: 'click', target: btn, bubbles: true });
  var modal = w.sb.document.getElementById('pf-pwa-ios-guide');
  if (!modal) { no('backdrop tap closes the modal', 'modal never opened'); return; }
  modal.dispatchEvent({ type: 'click', target: modal, bubbles: true });
  if (!w.sb.document.getElementById('pf-pwa-ios-guide')) ok('backdrop tap closes the modal');
  else no('backdrop tap closes the modal', 'modal still in DOM');
})();

/* --- 3d. X tap -> silent session dismiss, NO modal --- */
(function () {
  var w = makeWorld(); bootTwo(w);
  var btn = w.buttons()[0];
  var x = findById(w, btn, 'pf-pwa-x');
  if (!x) { no('X tap dismisses silently', 'X span not materialized'); return; }
  btn.dispatchEvent({ type: 'click', target: x, bubbles: true });
  if (w.buttons().length === 0) ok('X tap dismisses the button');
  else no('X tap dismisses the button', 'button still in DOM');
  if (!w.sb.document.getElementById('pf-pwa-ios-guide')) ok('X tap shows no modal');
  else no('X tap shows no modal', 'modal appeared');
  if (w.session.getItem('pf_pwa_dismissed') === '1') ok('X tap sets the session dismiss flag');
  else no('X tap sets the session dismiss flag', 'flag missing');
})();

/* --- 3e. modal never duplicates --- */
(function () {
  var w = makeWorld(); bootTwo(w);
  var btn = w.buttons()[0];
  btn.dispatchEvent({ type: 'click', target: btn, bubbles: true });
  var count = 0;
  w.walk(w.body, function (n) { if (n.id === 'pf-pwa-ios-guide') count++; });
  if (count === 1) ok('modal never duplicates');
  else no('modal never duplicates', 'count=' + count);
})();

/* --- 3f. Android/Chrome path unchanged at runtime --- */
(function () {
  var ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  var w = makeWorld();
  w.sb.navigator.userAgent = ANDROID_UA;
  /* ZUCK 2026-10-09 (fe-zuck-pwa): Android is now engagement-gated like iOS
     (2nd visit or first engagement) — a cold first-visit beforeinstallprompt
     is held, not shown. Pre-seed the gate the same way the iOS scenarios do
     so this block keeps testing the prompt/accept/dismiss mechanics. */
  w.sb.localStorage.setItem('pf_pwa_visits_v1', '2');
  var toastCalls = [];
  w.sb.PF.toast = function (m) { toastCalls.push(m); };
  vm.runInContext(src, w.sb, { filename: 'install.js#instanceA(bundle)' });
  vm.runInContext(src, w.sb, { filename: 'install.js#instanceB(standalone)' });
  var promptCalls = 0;
  var ev = {
    type: 'beforeinstallprompt',
    preventDefault: function () {},
    prompt: function () { promptCalls++; },
    /* sync thenable so the userChoice chain resolves inside the test */
    userChoice: { then: function (cb) { cb({ outcome: 'accepted' }); return this; } }
  };
  w.sb.fire('beforeinstallprompt', ev);
  var btns = w.buttons();
  if (btns.length === 1) ok('Android: two instances render exactly ONE button');
  else no('Android: two instances render exactly ONE button', 'found ' + btns.length);
  if (!btns.length) return;
  btns[0].dispatchEvent({ type: 'click', target: btns[0], bubbles: true });
  if (promptCalls === 1) ok('Android: tap fires deferredPrompt.prompt() once');
  else no('Android: tap fires deferredPrompt.prompt() once', 'promptCalls=' + promptCalls);
  if (toastCalls.indexOf('Welcome to the factory.') !== -1) {
    ok('Android: accepted install still toasts the welcome message');
  } else {
    no('Android: accepted install still toasts the welcome message',
      'toastCalls=' + JSON.stringify(toastCalls));
  }
  if (w.buttons().length === 0) ok('Android: accepted install dismisses the button');
  else no('Android: accepted install dismisses the button', 'button still in DOM');
})();

/* ============ 4. rebuilt bundles carry the fix ============ */
console.log('== 4. bundles carry the fix ==');
[ ['bundle-core.js', BUNDLE], ['bundle-core-slr.js', BUNDLE_SLR] ].forEach(function (pair) {
  var bsrc;
  try { bsrc = read(pair[1]); } catch (e) { no(pair[0] + ' readable', String(e)); return; }
  if (bsrc.indexOf('pf-pwa-ios-guide') !== -1) ok(pair[0] + ' contains the iOS guide modal');
  else no(pair[0] + ' contains the iOS guide modal', 'marker missing — rebuild bundles');
  /* 2026-10-07: accept either quote style — terser normalizes to double quotes. */
  if (/getElementById\((['"])pf-pwa-install\1\)/.test(bsrc)) ok(pair[0] + ' contains the duplicate guard');
  else no(pair[0] + ' contains the duplicate guard', 'marker missing — rebuild bundles');
  if (bsrc.indexOf('__pfPwaBooted') !== -1) ok(pair[0] + ' contains the single-boot guard');
  else no(pair[0] + ' contains the single-boot guard', 'marker missing — rebuild bundles');
});

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
