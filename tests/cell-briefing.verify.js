#!/usr/bin/env node
/* tests/cell-briefing.verify.js — verification harness for
 * games/cell-briefing.js (Political HQ weave #5).
 * DOM-shim: executes the module against a fake DOM and a fake
 * PF.authGetJSONP backend, and asserts:
 *   1. kill-switch (?pf_off=cell-briefing / PF.skip) renders nothing
 *   2. dismissed flag (pf_cell_briefing_v1 b_<cellId>) -> no mount
 *   3. pf-cell-joined -> authGetJSONP 'cell_briefing_get' with cell_id;
 *      full payload renders senators / bills / campaigns / ballot sections
 *   4. empty sections hide (no feature tables merged); backend failure ->
 *      fail silent, no card, no dismissal flag written
 *   5. dismiss click -> card removed + permanent flag set
 *   6. URL validation: javascript: URLs never become links
 *   7. no-XP grep assertion: the module mints zero XP
 * Run: node tests/cell-briefing.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'cell-briefing.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- minimal DOM shim ---------- */
function makeEl(id) {
  return {
    id: id || '', children: [], parentNode: null,
    innerHTML: '', textContent: '', style: {}, attrs: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; },
    insertBefore: function (c, ref) {
      c.parentNode = this;
      var i = ref ? this.children.indexOf(ref) : -1;
      if (i >= 0) this.children.splice(i, 0, c); else this.children.push(c);
    },
    removeChild: function (c) {
      var i = this.children.indexOf(c);
      if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; }
      return c;
    },
    querySelector: function (sel) {
      /* only supports '#id' against innerHTML-generated buttons; stubs are
         persistent so onclick wiring is observable. */
      if (!this._qs) this._qs = {};
      if (!this._qs[sel]) {
        if (this.innerHTML && this.innerHTML.indexOf('id="' + sel.replace('#', '') + '"') >= 0) {
          this._qs[sel] = { onclick: null };
        } else {
          this._qs[sel] = null;
        }
      }
      return this._qs[sel];
    },
    scrollIntoView: function () {}
  };
}

function makeEnv(opts) {
  opts = opts || {};
  var ls = {};
  if (opts.dismissed) ls['pf_cell_briefing_v1'] = JSON.stringify({ b_c1: 1 });
  var listeners = {};
  var timers = [];
  var host = makeEl('pf-cells');
  var calls = [];
  var pf = {
    skip: function (k) { return k === 'cell-briefing' ? !!opts.skip : false; },
    authGetJSONP: function (backend, action, params, cb) {
      calls.push({ action: action, params: params });
      if (opts.backend === 'fail') { cb({ ok: false, err: 'db error' }); return; }
      cb(opts.payload || null);
    }
  };
  var doc = {
    createElement: function () { return makeEl(); },
    getElementById: function (id) {
      if (id === 'pf-cells') return host;
      if (id === 'pf-cell-briefing') {
        for (var i = 0; i < host.children.length; i++) {
          if (host.children[i].id === 'pf-cell-briefing') return host.children[i];
        }
        return null;
      }
      return null;
    },
    addEventListener: function (name, fn) { listeners[name] = fn; },
    dispatchEvent: function () {}
  };
  var win = {
    PF: pf,
    PF_BACKEND_URL: 'https://backend.test/exec',
    PFCallsign: function () { return 'BossA'; },
    PFDeviceId: function () { return 'dev1'; },
    location: { href: 'https://mtcstw.com/cells', search: '' },
    localStorage: {
      getItem: function (k) { return ls[k] == null ? null : ls[k]; },
      setItem: function (k, v) { ls[k] = String(v); }
    },
    document: doc,
    navigator: {}
  };
  win.window = win;
  return { win: win, listeners: listeners, timers: timers, host: host, calls: calls, ls: ls,
    setTimeout: function (fn, ms) { timers.push(fn); return timers.length; } };
}

function run(env) {
  var sandbox = env.win;
  sandbox.setTimeout = env.setTimeout;
  sandbox.console = console;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'cell-briefing.js' });
  return sandbox;
}

function fullPayload() {
  return {
    ok: true, cell_id: 'c1', cell_name: 'Lonestar Cell', state: 'TX',
    senators: [
      { name: 'John Cornyn', party: 'R', phone: '202-224-2934', url: 'https://www.cornyn.senate.gov' },
      { name: 'Ted Cruz', party: 'R', phone: '202-224-5922', url: 'https://www.cruz.senate.gov' }
    ],
    house_lookup_url: 'https://www.house.gov/representatives/find-your-representative',
    bills: [{ bill_id: 'HR-22', title: 'SAVE Act', status: 'passed-house',
      source_url: 'https://www.congress.gov/bill/119th-congress/house-bill/22' }],
    campaigns: [{ id: 'pc1', title: 'Force a Vote on H.R. 14', target_bill: 'H.R. 14', days_remaining: 30 }],
    ballot: { kind: 'state', state: 'TX', state_name: 'Texas',
      next_deadline: { label: 'Voter registration deadline', date: '2026-10-05' },
      register_url: 'https://www.vote.gov/register/tx/' }
  };
}

/* ---------- 1. kill switch ---------- */
{
  var e = makeEnv({ skip: true });
  run(e);
  e.listeners['pf-cell-joined'] && e.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  ok('kill switch: no listeners mounted', Object.keys(e.listeners).length === 0);
  ok('kill switch: no backend call', e.calls.length === 0);
}

/* ---------- 2. dismissed flag ---------- */
{
  var e2 = makeEnv({ dismissed: true });
  run(e2);
  e2.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  e2.timers.forEach(function (fn) { fn(); });
  ok('dismissed: no card mounted', e2.host.children.length === 0);
  ok('dismissed: no backend call', e2.calls.length === 0);
}

/* ---------- 3. join -> fetch -> full render ---------- */
{
  var e3 = makeEnv({ payload: fullPayload() });
  run(e3);
  e3.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  ok('join: timer scheduled', e3.timers.length === 1);
  e3.timers.forEach(function (fn) { fn(); });
  ok('join: backend action', e3.calls.length === 1 && e3.calls[0].action === 'cell_briefing_get');
  ok('join: cell_id passed', e3.calls[0].params.cell_id === 'c1');
  ok('join: card mounted', e3.host.children.length === 1 &&
    e3.host.children[0].id === 'pf-cell-briefing');
  var html = e3.host.children[0].innerHTML;
  ok('render: senators section', html.indexOf('YOUR SENATORS') >= 0 && html.indexOf('John Cornyn') >= 0);
  ok('render: phone link', html.indexOf('tel:2022242934') >= 0);
  ok('render: house lookup', html.indexOf('FIND YOUR HOUSE REP') >= 0 &&
    html.indexOf('house.gov/representatives/find-your-representative') >= 0);
  ok('render: bill + congress.gov link', html.indexOf('ON THE FLOOR RIGHT NOW') >= 0 &&
    html.indexOf('congress.gov/bill/119th-congress/house-bill/22') >= 0);
  ok('render: campaign + days', html.indexOf('OPEN PRESSURE CAMPAIGNS') >= 0 &&
    html.indexOf('30 days left') >= 0);
  ok('render: ballot deadline', html.indexOf('NEXT BALLOT DEADLINE') >= 0 &&
    html.indexOf('Oct 5, 2026') >= 0 && html.indexOf('vote.gov/register/tx/') >= 0);
  ok('render: Texas flag line', html.indexOf('Texas') >= 0);
  ok('shown once: flag written at render', JSON.parse(e3.ls['pf_cell_briefing_v1'] || '{}').b_c1 === 1);
}

/* ---------- 4. empty sections hide; failure fails silent ---------- */
{
  var p = fullPayload();
  p.senators = []; p.bills = []; p.campaigns = []; p.ballot = null;
  var e4 = makeEnv({ payload: p });
  run(e4);
  e4.listeners['pf-cell-formed']({ detail: { cell: { id: 'c1' } } });
  e4.timers.forEach(function (fn) { fn(); });
  ok('empty: card still mounts (house lookup present)', e4.host.children.length === 1);
  var h4 = e4.host.children[0].innerHTML;
  ok('empty: senators hidden', h4.indexOf('YOUR SENATORS') < 0);
  ok('empty: bills hidden', h4.indexOf('ON THE FLOOR RIGHT NOW') < 0);
  ok('empty: campaigns hidden', h4.indexOf('OPEN PRESSURE CAMPAIGNS') < 0);
  ok('empty: ballot hidden', h4.indexOf('NEXT BALLOT DEADLINE') < 0);
  ok('empty: house lookup survives', h4.indexOf('FIND YOUR HOUSE REP') >= 0);

  var e5 = makeEnv({ backend: 'fail' });
  run(e5);
  e5.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  e5.timers.forEach(function (fn) { fn(); });
  ok('failure: no card', e5.host.children.length === 0);
  ok('failure: no dismissal flag written', e5.ls['pf_cell_briefing_v1'] == null);
}

/* ---------- 5. dismiss click ---------- */
{
  var e6 = makeEnv({ payload: fullPayload() });
  run(e6);
  e6.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  e6.timers.forEach(function (fn) { fn(); });
  var card = e6.host.children[0];
  ok('dismiss: card present pre-click', !!card);
  var btn = card.querySelector('#pf-cb-dismiss');
  ok('dismiss: button wired', !!btn && typeof btn.onclick === 'function');
  btn.onclick();
  ok('dismiss: card removed', e6.host.children.length === 0);
  ok('dismiss: flag permanent', JSON.parse(e6.ls['pf_cell_briefing_v1'] || '{}').b_c1 === 1);
}

/* ---------- 6. URL validation ---------- */
{
  var p6 = fullPayload();
  p6.house_lookup_url = 'javascript:alert(1)';
  p6.senators[0].url = 'javascript:alert(1)';
  p6.bills[0].source_url = 'data:text/html,<script>alert(1)</script>';
  p6.ballot.register_url = 'JAVASCRIPT:alert(1)';
  var e7 = makeEnv({ payload: p6 });
  run(e7);
  e7.listeners['pf-cell-joined']({ detail: { cell: { id: 'c1' } } });
  e7.timers.forEach(function (fn) { fn(); });
  var h7 = e7.host.children[0].innerHTML;
  ok('urls: no javascript: links', h7.toLowerCase().indexOf('javascript:') < 0);
  ok('urls: no data: links', h7.toLowerCase().indexOf('data:text') < 0);
  ok('urls: house section hidden when url bad', h7.indexOf('FIND YOUR HOUSE REP') < 0);
}

/* ---------- 7. no-XP grep assertion ---------- */
{
  var noGrant = src.indexOf('xpGrant') < 0;
  var noPost = src.indexOf('postAction') < 0;
  var scrubbed = src.replace(/zero XP|no XP|no-XP|XP legs/gi, '');
  var noXpStr = !/\+\d+\s*XP/i.test(scrubbed) && !/xp_?grant/i.test(scrubbed);
  ok('no-XP: never calls xpGrant', noGrant);
  ok('no-XP: never posts actions', noPost);
  ok('no-XP: no XP-amount copy', noXpStr, src.match(/\+\d+\s*XP/i));
}

console.log(failures === 0 ? '\ncell-briefing.verify: ALL PASS' : '\ncell-briefing.verify: ' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
