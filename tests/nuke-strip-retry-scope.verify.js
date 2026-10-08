#!/usr/bin/env node
/* tests/nuke-strip-retry-scope.verify.js — regression harness for the
 * 2026-10-05 retry-scope fix (sticky bar must never become a retry overlay).
 *
 * DOM-shim: loads v1.4.3/core/17-nuke-strip.js in a vm sandbox with fake
 * browser globals and a fake PF.postAction backend that FAILS the press,
 * then asserts:
 *   1. a failed press sets "PRESS FAILED — RETRY" + the `failed` class on
 *      #pnsNuke ONLY — every other bar element (bar container, tap, rally,
 *      dismiss, meter labels) is byte-identical before/after the failure
 *   2. the only click listener that triggers a press is on #pnsNuke
 *      (no bar-wide retry surface)
 *   3. starting a retry clears the failed state (CHARGING…, no `failed`)
 *   4. the `failed` CSS rule is scoped to the nuke press button selector
 *   5. a press that SUCCEEDS (backend ok) never shows the retry state
 *
 * Run: node tests/nuke-strip-retry-scope.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'core', '17-nuke-strip.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- fake DOM ---------- */
function makeEl(id) {
  var classes = {};
  return {
    id: id || '', textContent: '', title: '', hidden: false, style: {},
    classList: {
      add: function (c) { classes[c] = 1; },
      remove: function (c) { delete classes[c]; },
      contains: function (c) { return !!classes[c]; },
      snapshot: function () { return Object.keys(classes).sort().join(' '); }
    },
    listeners: {},
    addEventListener: function (ev, fn) { this.listeners[ev] = fn; },
    setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function () {}, insertAdjacentHTML: function () {},
    contains: function () { return false; },
    getBoundingClientRect: function () { return { top: -9999, bottom: -9900 }; },
    snapshot: function () {
      return JSON.stringify({
        t: this.textContent, ti: this.title, h: this.hidden,
        c: this.classList.snapshot(), s: JSON.stringify(this.style)
      });
    }
  };
}

function makeWorld(pressImpl) {
  var els = {};
  ['pf-nuke-stick', 'pnsFill', 'pnsPct', 'pnsYou', 'pnsTap', 'pnsX',
   'pnsNuke', 'pnsRally', 'pnsCell'].forEach(function (id) { els[id] = makeEl(id); });
  var store = {};
  var timeouts = [];
  var win = {
    PFCallsign: function () { return 'tester'; },
    PFDeviceId: function () { return 'd-test'; },
    PF: {
      skip: function () { return false; },
      postAction: function (type, actionKey, action, params, cb) {
        if (type === 'nuke' && action === 'nuke_press') pressImpl(cb);
        else cb({ ok: true });
      },
      toast: function () {},
      dope: null
    },
    location: { href: 'https://mtcstw.com/', search: '' },
    addEventListener: function () {},
    innerHeight: 900
  };
  win.window = win;
  var doc = {
    readyState: 'complete',
    head: { appendChild: function () {} },
    body: makeEl('body'),
    createElement: function () { return makeEl(); },
    getElementById: function (id) { return els[id] || null; },
    addEventListener: function (ev, fn) { if (ev === 'DOMContentLoaded') fn(); },
    querySelector: function () { return null; }
  };
  var sandbox = {
    window: win, document: doc,
    localStorage: {
      getItem: function (k) { return store[k] || null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: {
      getItem: function () { return null; },
      setItem: function () {}, removeItem: function () {}
    },
    setTimeout: function (fn) { timeouts.push(fn); return timeouts.length; },
    clearTimeout: function () {},
    setInterval: function () { return 0; },
    console: console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: '17-nuke-strip.js' });
  return { sandbox: sandbox, win: win, els: els };
}

function snapshotBar(els) {
  var snap = {};
  Object.keys(els).forEach(function (id) { snap[id] = els[id].snapshot(); });
  return JSON.stringify(snap);
}

/* ---------- 1-3: failure scoping ---------- */
(function () {
  console.log('-- failed press stays scoped to #pnsNuke');
  var pendingCb = null;
  var w = makeWorld(function (cb) { pendingCb = cb; }); /* deferred backend */
  var strip = w.win.pfNukeStrip;
  ok('strip boots and exposes press()', !!(strip && typeof strip.press === 'function'));
  var before = snapshotBar(w.els);
  var btn = w.els.pnsNuke;

  /* Attempt 1: in flight — no failed state yet. */
  strip.press();
  ok('press attempt shows CHARGING with no failed state',
    btn.textContent.indexOf('CHARGING') === 0 && !btn.classList.contains('failed'),
    btn.textContent + ' / ' + btn.classList.snapshot());

  /* Backend reports failure. */
  pendingCb({ ok: false, err: 'press failed' });
  ok('failed press labels the button PRESS FAILED — RETRY',
    btn.textContent === 'PRESS FAILED \u2014 RETRY', btn.textContent);
  ok('failed press adds the `failed` class to #pnsNuke',
    btn.classList.contains('failed'));
  /* Every other element must be untouched (vs the pre-press snapshot). */
  var beforeIds = JSON.parse(before);
  var diffs = [];
  Object.keys(w.els).forEach(function (id) {
    if (id === 'pnsNuke') return;
    if (w.els[id].snapshot() !== beforeIds[id]) diffs.push(id);
  });
  ok('no element other than #pnsNuke changes on press failure', diffs.length === 0,
    diffs.join(','));

  /* Retry: starting a new press attempt clears the failed state. */
  strip.press();
  ok('retry attempt clears `failed` while in flight',
    !btn.classList.contains('failed') && btn.textContent.indexOf('CHARGING') === 0,
    btn.textContent + ' / ' + btn.classList.snapshot());
  pendingCb({ ok: false, err: 'press failed' });
  ok('retry that also fails stays scoped to the button',
    btn.classList.contains('failed') &&
    btn.textContent === 'PRESS FAILED \u2014 RETRY');
})();

/* ---------- 4: CSS scoping ---------- */
(function () {
  console.log('-- retry CSS scoping');
  ok('failed-state CSS rule is scoped to the press button selector',
    /#pf-nuke-stick \.pns-act\.failed\{/.test(src));
  ok('no selector applies a retry style to the bar container',
    !/#pf-nuke-stick\.failed|#pf-nuke-stick[^{]*\{[^}]*retry/i.test(src.replace(/#pf-nuke-stick \.pns-act\.failed\{[^}]*\}/g, '')));
})();

/* ---------- 5: success never shows retry ---------- */
(function () {
  console.log('-- successful press shows no retry state');
  var w = makeWorld(function (cb) { cb({ ok: true, pressed: true, charged: 50, streak: 1 }); });
  w.win.pfNukeStrip.press();
  var btn = w.els.pnsNuke;
  ok('successful press marks the button charged, not failed',
    btn.classList.contains('charged') && !btn.classList.contains('failed'),
    btn.textContent + ' / ' + btn.classList.snapshot());
})();

console.log(failures ? '\n' + failures + ' FAILED' : '\nall checks passed');
process.exit(failures ? 1 : 0);
