#!/usr/bin/env node
/* tests/predict-game.verify.cjs — smoke test for the CALL THE SHOT prediction
 * game (v1.4.3/games/predict.js, wave-predict-game-fe 2026-10-05).
 *
 * DOM-shim: extracts the predict.js inner <script>, executes it against a
 * fake DOM + a fake predict_* JSONP/POST backend, and asserts:
 *   1. widget renders WILL PASS / WILL FAIL buttons (>=44px touch targets)
 *      + margin input + +25 XP line for an open bill with a callsign
 *   2. mount(el, bill) signature works (the legislation tracker's embed API)
 *   3. locked state shows after a successful predict_place
 *   4. resolved states render (won: "YOU CALLED IT. +25 XP"; lost: "MISSED IT")
 *   5. fail-soft: missing backend URL hides the widget, never throws
 *   6. no-callsign gate renders instead of buttons
 *   7. section renders bills + record + leaderboard rows
 * Run: node tests/predict-game.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'predict.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- extract the inner <script> ---------- */
var sStart = src.indexOf('<script>');
var sEnd = src.indexOf('</scr' + '`+`ipt>');
ok('inner script extractable', sStart !== -1 && sEnd !== -1 && sEnd > sStart);
var inner = src.slice(sStart + '<script>'.length, sEnd);

/* ---------- backend fixtures ---------- */
var BILLS = [
  { bill_id: 'hr-1', title: 'Kill the Billionaire Tax Break', status: 'committee', my_pick: '', result: '' },
  { bill_id: 'hr-2', title: 'Medicare for All Floor Vote', status: 'floor', my_pick: 'pass', result: '' },
  { bill_id: 'hr-3', title: 'Rent Cap Bill', status: 'resolved', my_pick: 'pass', result: 'pass' },
  { bill_id: 'hr-4', title: 'Union Busting Ban', status: 'resolved', my_pick: 'pass', result: 'fail' }
];
var posted = [];
function fakeGET(action, params) {
  if (action === 'predict_list') {
    return { ok: true, bills: BILLS, record: { wins: 3, losses: 1 } };
  }
  if (action === 'predict_leaderboard') {
    var leaders = [];
    for (var i = 0; i < 25; i++) leaders.push({ callsign: 'FIGHTER' + i, wins: 25 - i, losses: i });
    return { ok: true, leaders: leaders };
  }
  return { ok: true };
}

/* ---------- DOM shim ---------- */
function makeEl(id) {
  var el = {
    id: id || '', innerHTML: '', textContent: '', value: '', style: {},
    attrs: {}, parentNode: null, disabled: false,
    onclick: null, onchange: null,
    children: [],
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    addEventListener: function () {},
    appendChild: function (c) { c.parentNode = this; this.children.push(c); },
    removeChild: function () {},
    querySelector: function (sel) {
      if (sel === '.pp-margin') return { value: '' };
      if (sel === '.pp-msg') return { textContent: '' };
      if (sel === '#xPredict') return null;
      return null;
    },
    querySelectorAll: function (sel) {
      if (sel === '.pp-btn') {
        if (this._buttons) return this._buttons;
        var b1 = makeEl(''); b1.setAttribute('data-act', 'pass');
        b1.disabled = false;
        var b2 = makeEl(''); b2.setAttribute('data-act', 'fail');
        b2.disabled = false;
        this._buttons = [b1, b2];
        return this._buttons;
      }
      if (sel === '.pp-widget') return this._widgets || [];
      return [];
    }
  };
  return el;
}
function makeEnv(opts) {
  opts = opts || {};
  var win = {
    PF_BACKEND_URL: opts.noBackend ? '' : 'https://pf-api.mtcstw.workers.dev',
    PFCallsign: opts.noCallsign ? function () { return ''; } : function () { return 'TESTER'; },
    PFDeviceId: function () { return 'DEV1'; }
  };
  win.PF = {
    skip: function () { return false; },
    toast: function () {},
    errCopy: function (j, d) { return (j && (j.err || j.error)) || d; },
    holder: function () { return { insertAdjacentHTML: function () {} }; }
  };
  var head = {
    appendChild: function (s) {
      s.parentNode = head;
      var u;
      try { u = new URL(s.src); } catch (e) { setTimeout(function () { s.onerror && s.onerror(); }, 5); return; }
      var action = u.searchParams.get('action');
      var fn = u.searchParams.get('callback');
      setTimeout(function () {
        try { if (win[fn]) win[fn](fakeGET(action, u.searchParams)); } catch (e) {}
      }, 5);
    },
    removeChild: function () {}
  };
  var doc = {
    head: head,
    createElement: function () { return makeEl(''); },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    body: makeEl('body')
  };
  return { win: win, doc: doc };
}
function loadModule(env) {
  var fetchFn = env.win.fetch || function () {};
  var fn = new Function('window', 'document', 'console', 'setTimeout', 'fetch',
    'window.PFPredict = undefined; (function(){ var window = arguments[0], document = arguments[1]; ' + inner + ' })(window, document);');
  fn(env.win, env.doc, console, setTimeout, fetchFn);
  return env.win.PFPredict;
}

var PFP = loadModule(makeEnv());
ok('window.PFPredict exported', !!(PFP && typeof PFP.mount === 'function'));

/* ---------- 1: open bill widget ---------- */
var openBill = BILLS[0];
var html = PFP.renderWidget(openBill);
ok('widget renders WILL PASS button', html.indexOf('WILL PASS') !== -1);
ok('widget renders WILL FAIL button', html.indexOf('WILL FAIL') !== -1);
ok('widget renders margin input', html.indexOf('pp-margin') !== -1);
ok('widget advertises +25 XP', html.indexOf('+25 XP') !== -1);
ok('buttons are >=44px touch targets (min-height:48px)', src.indexOf('min-height:48px') !== -1);
ok('margin input is >=44px (min-height:44px)', src.indexOf('.pp-margin{') !== -1 && src.indexOf('min-height:44px') !== -1);

/* ---------- 2: mount signature ---------- */
var mountEl = makeEl('mount');
try {
  PFP.mount(mountEl, openBill);
  ok('mount(el, bill) renders without throwing', mountEl.innerHTML.indexOf('WILL PASS') !== -1);
} catch (e) { ok('mount(el, bill) renders without throwing', false, String(e)); }
try {
  PFP.mount(null, openBill);
  ok('mount(null, bill) is a soft no-op', true);
} catch (e) { ok('mount(null, bill) is a soft no-op', false, String(e)); }
try {
  PFP.mount(makeEl('x'), { title: 'no id' });
  ok('mount(el, bill-without-id) hides softly', true);
} catch (e) { ok('mount(el, bill-without-id) hides softly', false, String(e)); }

/* ---------- 3: locked state after predict_place ---------- */
var lockEl = makeEl('lock');
PFP.mount(lockEl, BILLS[1]); /* my_pick: 'pass' */
ok('locked state shows pick', lockEl.innerHTML.indexOf('LOCKED IN') !== -1 && lockEl.innerHTML.indexOf('PASS') !== -1);
ok('locked state advertises +25 XP', lockEl.innerHTML.indexOf('+25 XP') !== -1);

/* simulate a pick click -> predict_place success -> locked re-render */
var simEl = makeEl('sim');
var postedBodies = [];
var env2 = makeEnv();
env2.win.fetch = function (url, o) {
  postedBodies.push(JSON.parse(o.body));
  return Promise.resolve({ json: function () { return Promise.resolve({ ok: true }); } });
};
var PFP2 = loadModule(env2);
PFP2.mount(simEl, openBill);
var btns = simEl.querySelectorAll('.pp-btn');
ok('mounted widget exposes two pick buttons', btns.length === 2);
btns[0].onclick(); /* WILL PASS */
setTimeout(function () {
  ok('predict_place POSTed with bill_id + prediction', postedBodies.length === 1 &&
    postedBodies[0].p_action === 'predict_place' &&
    postedBodies[0].bill_id === 'hr-1' && postedBodies[0].prediction === 'pass');
  ok('locked state shows after successful pick', simEl.innerHTML.indexOf('LOCKED IN') !== -1);

  /* ---------- 4: resolved states ---------- */
  ok('resolved win shows "YOU CALLED IT. +25 XP"', PFP.renderWidget(BILLS[2]).indexOf('YOU CALLED IT') !== -1 &&
    PFP.renderWidget(BILLS[2]).indexOf('+25 XP') !== -1);
  ok('resolved loss shows "MISSED IT"', PFP.renderWidget(BILLS[3]).indexOf('MISSED IT') !== -1);
  ok('resolved shows final result', PFP.renderWidget(BILLS[2]).indexOf('PASSED') !== -1 &&
    PFP.renderWidget(BILLS[3]).indexOf('FAILED') !== -1);

  /* ---------- 5: fail-soft, no backend ---------- */
  var PFPnb = loadModule(makeEnv({ noBackend: true }));
  var nbEl = makeEl('nb');
  var threw = false;
  try { PFPnb.mount(nbEl, openBill); } catch (e) { threw = true; }
  ok('fail-soft: missing backend hides widget, never throws', !threw && nbEl.style.display === 'none');

  /* ---------- 6: no-callsign gate ---------- */
  var PFPnc = loadModule(makeEnv({ noCallsign: true }));
  var gateHtml = PFPnc.renderWidget(openBill);
  ok('no callsign -> gate instead of buttons', gateHtml.indexOf('WILL PASS') === -1 &&
    gateHtml.indexOf('callsign') !== -1);

  /* ---------- 7: section renders bills + record + leaderboard ---------- */
  var secEl = makeEl('sec');
  var xEl = makeEl('xPredict');
  secEl.querySelector = function (sel) { return sel === '#xPredict' ? xEl : null; };
  PFP.mountSection(secEl);
  setTimeout(function () {
    var sh = xEl.innerHTML;
    ok('section renders open bills', sh.indexOf('Kill the Billionaire Tax Break') !== -1);
    ok('section renders caller record (W/L)', sh.indexOf('YOUR RECORD') !== -1 && sh.indexOf('3W') !== -1);
    var lrows = (sh.match(/pp-lrow/g) || []).length;
    ok('section renders leaderboard rows (25)', lrows === 25, 'got ' + lrows);
    ok('no "undefined"/"NaN" leaks in section', sh.indexOf('undefined') === -1 && sh.indexOf('NaN') === -1);

    console.log('\n' + passes + ' passed, ' + failures + ' failed.');
    process.exit(failures ? 1 : 0);
  }, 60);
}, 60);
