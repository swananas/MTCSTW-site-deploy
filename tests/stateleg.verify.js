#!/usr/bin/env node
/* tests/stateleg.verify.js — DOM-stub smoke harness for games/stateleg.js
 * (State Legislatures frontend, Political HQ).
 * Runs the REAL module (outer IIFE, not the staged template) in a vm sandbox
 * with a fake DOM + fake JSONP/fetch backend (mirroring the REAL
 * be/state-legislatures contract: stateleg_list / statebills_list /
 * statepeople_list with epoch updated_at), then drives window.PFStateLeg
 * like the federal tracker team would. Asserts:
 *   1. mount API exists; states list = 50 + DC (51)
 *   2. state picker renders 51 options; selecting a state lazy-loads
 *      legislature info (chambers, session badge, party control, updated)
 *   3. bill cards render title / summary / status chip / sponsors /
 *      source link / updated line
 *   4. stale flag (>14d) shows "last updated Xd ago" on old bills only
 *   5. missing fields render "check the official source" (data honesty)
 *   6. Nebraska (house_name null) renders its single chamber name
 *   7. pressure-this-bill: PFPressCampaigns hook fires when present;
 *      otherwise a bubbling 'pf-pressure-bill' CustomEvent with the bill
 *   8. contact logging POST shape: type/rep + r_action/rep_contact +
 *      callsign/rep_name/method/script_used; +25 XP toast copy exact;
 *      cap error -> exact 2/day copy
 *   9. federal toggle: absent -> no toggle (state-only); present ->
 *      STATE/FEDERAL tabs, federal mount called, state preserved on return
 *  10. pf-legislate-ready event re-renders the toggle when federal arrives late
 *  11. fail-soft: backend down -> inline error + RETRY; retry recovers
 *  12. statepeople_list absent -> legislator section hides cleanly
 *  13. renderSection() standalone mount works
 *  14. stored-XSS: backend strings are escaped
 *  15. DC (no seeded row) -> honest "no data" note, not an error loop
 * Run: node tests/stateleg.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'stateleg.js');
var raw = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- tiny element-tree DOM ---------- */
function mkEl(tag) {
  var n = { tag: (tag || 'div').toLowerCase(), attrs: {}, children: [], parentNode: null,
    _html: '', value: '', disabled: false, textContent: '',
    onclick: null, onchange: null, oninput: null, onerror: null, _dispatched: null };
  Object.defineProperty(n, 'innerHTML', {
    get: function () { return this.children.map(serialize).join(''); },
    set: function (h) { this._html = String(h); this.children = parseHTML(this._html, this); }
  });
  n.getAttribute = function (k) { return (k in this.attrs) ? this.attrs[k] : null; };
  n.setAttribute = function (k, v) { this.attrs[k] = String(v); };
  n.removeAttribute = function (k) { delete this.attrs[k]; };
  n.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
  n.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; };
  n.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
  n.addEventListener = function () {};
  n.dispatchEvent = function (ev) { this._dispatched = ev; return true; };
  n.click = function () { if (typeof this.onclick === 'function') this.onclick(); };
  n.querySelectorAll = function (sel) { return qsa(this, sel); };
  n.querySelector = function (sel) { var r = qsa(this, sel); return r.length ? r[0] : null; };
  return n;
}
function parseHTML(html, parent) {
  var root = mkEl('#root'); root.parentNode = parent || null;
  var stack = [root];
  var re = /<\/?([a-zA-Z0-9]+)(\s[^<>]*)?>|([^<>]+)/g, mt;
  while ((mt = re.exec(html))) {
    if (mt[3] !== undefined) {
      var tn = mkEl('#text'); tn.text = mt[3];
      stack[stack.length - 1].appendChild(tn);
      continue;
    }
    var tag = mt[1].toLowerCase();
    var isClose = html[mt.index + 1] === '/';
    if (isClose) {
      if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop();
      continue;
    }
    var attrs = {}, am = /([a-zA-Z0-9_:\-]+)="([^"]*)"/g, a2;
    var as = mt[2] || '';
    while ((a2 = am.exec(as))) attrs[a2[1]] = a2[2];
    var node = mkEl(tag); node.attrs = attrs;
    stack[stack.length - 1].appendChild(node);
    var selfClose = /\/\s*>$/.test(mt[0]) || tag === 'input' || tag === 'br' || tag === 'img';
    if (!selfClose) stack.push(node);
  }
  return root.children;
}
function serialize(n) {
  if (n.tag === '#text') return n.text || '';
  if (n.tag === '#root') return n.children.map(serialize).join('');
  var at = '';
  for (var k in n.attrs) at += ' ' + k + '="' + n.attrs[k] + '"';
  var inner = n.children.map(serialize).join('');
  if (!inner && (n.tag === 'input' || n.tag === 'br' || n.tag === 'img')) return '<' + n.tag + at + '>';
  return '<' + n.tag + at + '>' + inner + '</' + n.tag + '>';
}
function matchSel(node, sel) {
  if (node.tag === '#root' || node.tag === '#text') return false;
  var m;
  if ((m = sel.match(/^\[([a-zA-Z0-9_\-]+)(="([^"]*)")?\]$/))) {
    var v = node.getAttribute(m[1]);
    if (v === null) return false;
    if (m[3] !== undefined) return v === m[3];
    return true;
  }
  if ((m = sel.match(/^#([a-zA-Z0-9_\-]+)$/))) return node.getAttribute('id') === m[1];
  if ((m = sel.match(/^\.([a-zA-Z0-9_\-]+)$/))) {
    return (node.getAttribute('class') || '').split(/\s+/).indexOf(m[1]) >= 0;
  }
  if ((m = sel.match(/^([a-zA-Z0-9]+)\.([a-zA-Z0-9_\-]+)$/))) {
    return node.tag === m[1] && (node.getAttribute('class') || '').split(/\s+/).indexOf(m[2]) >= 0;
  }
  if ((m = sel.match(/^([a-zA-Z0-9]+)$/))) return node.tag === m[1];
  return false;
}
function qsa(root, sel) {
  var out = [];
  (function walk(n) {
    for (var i = 0; i < n.children.length; i++) {
      var c = n.children[i];
      if (matchSel(c, sel)) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}

/* ---------- fake backend (mirrors the REAL be/state-legislatures contract) ---------- */
var backendDown = false;
var fetchCalls = [];
var fetchResponder = function () { return { ok: true }; };
function daysAgoEpoch(d) { return Math.floor(Date.now() / 1000) - d * 86400; }
var CANNED = {
  'stateleg_list|': { ok: true, count: 3, legislatures: [
    { state: 'TX', name: 'Texas', senate_name: 'Senate',
      house_name: 'House of Representatives', session_status: 'adjourned',
      senate_control: 'R', house_control: 'R', governor_party: 'R',
      updated_at: daysAgoEpoch(1), stale: false, notes: null },
    { state: 'NE', name: 'Nebraska', senate_name: 'Nebraska Legislature',
      house_name: null, session_status: 'adjourned',
      senate_control: 'Nonpartisan', house_control: null, governor_party: 'R',
      updated_at: daysAgoEpoch(3), stale: false,
      notes: 'Unicameral, officially nonpartisan.' },
    { state: 'MI', name: 'Michigan', senate_name: 'Senate',
      house_name: 'House of Representatives', session_status: 'in_session',
      senate_control: 'D', house_control: 'D', governor_party: 'D',
      updated_at: daysAgoEpoch(1), stale: false, notes: null }
  ] },
  'statebills_list|TX': { ok: true, count: 3, filters: { state: 'TX', status: null }, bills: [
    { bill_id: 'TX-HB-100', state: 'TX', title: 'Test Bill Fresh',
      plain_english_summary: 'A fresh test bill.', status: 'introduced',
      sponsors: ['Rep. A', 'Rep. B'], updated_at: daysAgoEpoch(2), stale: false,
      source: 'https://capitol.texas.gov/bill/hb100', notes: null },
    { bill_id: 'TX-SB-50', state: 'TX', title: 'Test Bill Stale',
      plain_english_summary: 'A stale test bill.', status: 'passed_chamber',
      sponsors: ['Sen. C'], updated_at: daysAgoEpoch(20), stale: true,
      source: 'https://capitol.texas.gov/bill/sb50', notes: null },
    { bill_id: 'TX-HB-9', state: 'TX', title: 'Test Bill <script>alert(1)</script>',
      plain_english_summary: '', status: 'signed', sponsors: [],
      updated_at: daysAgoEpoch(5), stale: false,
      source: 'https://capitol.texas.gov/bill/hb9', notes: null }
  ] },
  'statebills_list|NE': { ok: true, count: 0, filters: { state: 'NE', status: null }, bills: [] },
  'statebills_list|MI': { ok: true, count: 0, filters: { state: 'MI', status: null }, bills: [] },
  'statebills_list|DC': { ok: true, count: 0, filters: { state: 'DC', status: null }, bills: [] },
  'statepeople_list|TX': { ok: true, count: 2, seeded: 'partial', note: 'partial seed',
    legislators: [
      { leg_id: 'TX-HD-45', state: 'TX', name: 'Jane Doe', chamber: 'House',
        party: 'D', district: '45', notes: null },
      { leg_id: 'TX-SD-12', state: 'TX', name: 'John Smith', chamber: 'Senate',
        party: 'R', district: '12', notes: null }
    ] }
  /* statepeople_list|NE intentionally absent -> section hides */
};

var toasts = [];
var docListeners = {};
var appendedSections = [];

var sandboxWindow = {
  PF_BACKEND_URL: 'https://backend.test/exec',
  PFCallsign: function () { return 'TESTCALL'; },
  PFDeviceId: function () { return 'DEV1'; },
  PF: {
    skip: function () { return false; },
    holder: function () { return { insertAdjacentHTML: function () {} }; },
    errCopy: function (j, fb) { return fb; },
    gateHTML: function (m) { return '<div class="gate">' + m + '</div>'; },
    toast: function (m) { toasts.push(m); }
  }
};

var sandboxDocument = {
  createElement: function (tag) {
    if (tag === 'script') {
      var s = mkEl('script');
      var realSrc = '';
      Object.defineProperty(s, 'src', {
        get: function () { return realSrc; },
        set: function (v) { realSrc = String(v); }
      });
      s._getSrc = function () { return realSrc; };
      return s;
    }
    return mkEl(tag);
  },
  head: null,
  body: null,
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  addEventListener: function (t, f) { (docListeners[t] = docListeners[t] || []).push(f); }
};
sandboxDocument.head = mkEl('head');
sandboxDocument.body = mkEl('body');
/* JSONP: script appended to head -> parse src, invoke the callback synchronously */
sandboxDocument.head.appendChild = function (s) {
  var src = (typeof s._getSrc === 'function') ? s._getSrc() : '';
  var u;
  try { u = new URL(src); } catch (e) { return s; }
  var action = u.searchParams.get('action');
  var cb = u.searchParams.get('callback');
  var state = u.searchParams.get('state');
  var resp = null;
  if (!backendDown) resp = CANNED[action + '|' + (state || '')] || null;
  var fn = sandboxWindow[cb];
  delete sandboxWindow[cb];
  if (typeof fn === 'function') fn(resp);
  return s;
};
sandboxDocument.body.appendChild = function (c) { appendedSections.push(c); return mkEl('body').appendChild.call(this, c); };

function CustomEvent(t, init) {
  this.type = t;
  this.bubbles = !!(init && init.bubbles);
  this.detail = (init && init.detail) || null;
}

var sandbox = {
  window: sandboxWindow,
  document: sandboxDocument,
  CustomEvent: CustomEvent,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  fetch: function (url, opts) {
    var body = null;
    try { body = JSON.parse(opts.body); } catch (e) {}
    fetchCalls.push({ url: url, body: body });
    var r = fetchResponder(body);
    return Promise.resolve({ json: function () { return Promise.resolve(r); } });
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(raw, sandbox, { filename: 'stateleg.js' });

var PFStateLeg = sandbox.window.PFStateLeg;

/* ================= assertions ================= */
ok('PFStateLeg exposed with mount/renderSection/states',
  PFStateLeg && typeof PFStateLeg.mount === 'function' &&
  typeof PFStateLeg.renderSection === 'function' && Array.isArray(PFStateLeg.states));
ok('states list = 50 states + DC (51)', PFStateLeg.states.length === 51);
ok('DC present in states list',
  PFStateLeg.states.some(function (s) { return s[0] === 'DC' && s[1] === 'District of Columbia'; }));

function freshMount(opts) {
  var el = mkEl('div');
  var sess = PFStateLeg.mount(el, opts || {});
  return { el: el, sess: sess };
}
function htmlOf(m) { return m.el.innerHTML; }
function selNode(m) { var n = m.el.querySelectorAll('#slStateSel'); return n[0]; }
function pickState(m, code) {
  var s = selNode(m);
  s.value = code;
  s.onchange();
}

var m1 = freshMount({});
var optCount = (htmlOf(m1).match(/<option/g) || []).length;
ok('state picker renders 51 state options (+1 placeholder)', optCount === 52, 'got ' + optCount);
ok('toggle hidden when federal module absent',
  m1.el.querySelectorAll('[data-sl-tab]').length === 0);
ok('prompt shown before a state is picked',
  htmlOf(m1).indexOf('Pick your state above') >= 0);

pickState(m1, 'TX');
var h1 = htmlOf(m1);
ok('legislature header: chamber names', h1.indexOf('Senate') >= 0 && h1.indexOf('House of Representatives') >= 0);
ok('session status badge: TX adjourned', h1.indexOf('Adjourned') >= 0 && h1.indexOf('slb-adj') >= 0);
ok('party control shown (Senate/House/Gov)', h1.indexOf('Senate R') >= 0 && h1.indexOf('House R') >= 0 && h1.indexOf('Gov R') >= 0);
pickState(m1, 'MI');
var hMI = htmlOf(m1);
ok('session status badge: in_session -> In session', hMI.indexOf('In session') >= 0 && hMI.indexOf('slb-in') >= 0);
pickState(m1, 'TX');
h1 = htmlOf(m1);
ok('bills: 3 cards rendered', m1.el.querySelectorAll('[data-bill-card]').length === 3);
ok('status chips: introduced/passed chamber/signed',
  h1.indexOf('>Introduced<') >= 0 && h1.indexOf('>Passed chamber<') >= 0 && h1.indexOf('>Signed<') >= 0);
ok('source link on every bill', (h1.match(/capitol\.texas\.gov\/bill/g) || []).length >= 3);
ok('updated line present', h1.indexOf('Updated ') >= 0);
ok('sponsors rendered', h1.indexOf('Rep. A, Rep. B') >= 0);
ok('stale flag on 20-day-old bill', h1.indexOf('last updated 20d ago') >= 0 && h1.indexOf('sl-stale') >= 0);
ok('fresh bill has no stale flag',
  (function () {
    var cards = m1.el.querySelectorAll('[data-bill-card]');
    var fresh = null;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-bill-card') === '0') fresh = cards[i];
    }
    /* card 0 html has no sl-stale — check via the full html segments */
    var parts = h1.split('data-bill-card="');
    return parts[1].indexOf('sl-stale') < 0;
  })());
ok('missing summary -> "check the official source"',
  h1.indexOf('Summary not listed &mdash; check the <a') >= 0 ||
  h1.indexOf('check the <a href="https://capitol.texas.gov/bill/hb9"') >= 0);
ok('stored-XSS escaped', h1.indexOf('&lt;script&gt;alert(1)&lt;/script&gt;') >= 0 &&
  h1.indexOf('<script>alert(1)') < 0);
ok('legislator rows render', h1.indexOf('Jane Doe') >= 0 && h1.indexOf('John Smith') >= 0);
ok('no phone in backend contract -> "no phone listed" on both rows',
  (h1.match(/no phone listed/g) || []).length === 2);
ok('method select present', m1.el.querySelectorAll('.sl-method').length === 1);
ok('+25 XP copy on log buttons',
  (h1.match(/LOG CONTACT \(\+25 XP\)/g) || []).length === 2);

/* pressure hook: event path (no PFPressCampaigns) */
var pBtns = m1.el.querySelectorAll('[data-sl-pressure]');
ok('pressure buttons on every card', pBtns.length === 3);
pBtns[1].click();
var card2 = null;
(function () {
  var cards = m1.el.querySelectorAll('[data-bill-card]');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-bill-card') === '1') card2 = cards[i];
  }
})();
ok("pressure fires 'pf-pressure-bill' CustomEvent when hook absent",
  card2 && card2._dispatched && card2._dispatched.type === 'pf-pressure-bill' &&
  card2._dispatched.detail.bill.number === 'TX-SB-50');

/* pressure hook: PFPressCampaigns present */
var hookBills = [];
sandboxWindow.PFPressCampaigns = { pressureBill: function (b) { hookBills.push(b); } };
var m2 = freshMount({ state: 'TX' });
var p2 = m2.el.querySelectorAll('[data-sl-pressure]')[0];
p2.click();
ok('pressure calls window.PFPressCampaigns.pressureBill when present',
  hookBills.length === 1 && hookBills[0].number === 'TX-HB-100');
delete sandboxWindow.PFPressCampaigns;

/* contact logging POST shape */
toasts = []; fetchCalls = [];
fetchResponder = function () { return { ok: true }; };
var logBtns = m1.el.querySelectorAll('[data-sl-log]');
logBtns[0].click();
setTimeout(function () {
  ok('rep_contact POST fired', fetchCalls.length === 1);
  var b = fetchCalls[0] && fetchCalls[0].body;
  ok('POST shape: type/rep + r_action/rep_contact',
    b && b.type === 'rep' && b.r_action === 'rep_contact');
  ok('POST shape: callsign/rep_name/method/script_used',
    b && b.callsign === 'TESTCALL' && b.rep_name === 'Jane Doe' &&
    b.method === 'call' && b.script_used === '');
  ok('success toast copy exact (+25 XP earned)',
    toasts.indexOf('Contact logged \u2014 +25 XP earned.') >= 0);

  /* cap path */
  toasts = []; fetchCalls = [];
  fetchResponder = function () { return { ok: false, err: 'daily cap reached' }; };
  var m3 = freshMount({ state: 'TX' });
  m3.el.querySelectorAll('[data-sl-log]')[0].click();
  setTimeout(function () {
    ok('cap toast copy exact (2/day)',
      toasts.indexOf('Daily limit reached (2/day) \u2014 +25 XP each, resets tomorrow.') >= 0);
    fetchResponder = function () { return { ok: true }; };

    /* federal toggle present */
    var fedMounts = [];
    sandboxWindow.PFLegislate = { mount: function (el, opts) { fedMounts.push({ el: el, opts: opts }); } };
    var m4 = freshMount({ state: 'TX' });
    ok('toggle renders when federal module present',
      m4.el.querySelectorAll('[data-sl-tab]').length === 2);
    var tabs = m4.el.querySelectorAll('[data-sl-tab]');
    var fedTab = null, stateTab = null;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-sl-tab') === 'federal') fedTab = tabs[i];
      if (tabs[i].getAttribute('data-sl-tab') === 'state') stateTab = tabs[i];
    }
    fedTab.click();
    ok('federal tab calls PFLegislate.mount',
      fedMounts.length === 1 && fedMounts[0].opts && fedMounts[0].opts.state === 'TX');
    /* re-query tabs after re-render */
    var tabs2 = m4.el.querySelectorAll('[data-sl-tab]');
    var stateTab2 = null;
    for (var j = 0; j < tabs2.length; j++) {
      if (tabs2[j].getAttribute('data-sl-tab') === 'state') stateTab2 = tabs2[j];
    }
    stateTab2.click();
    ok('state tab restores state UI (selection preserved)',
      m4.el.querySelectorAll('#slStateSel').length === 1 &&
      m4.el.querySelectorAll('[data-bill-card]').length === 3);

    /* pf-legislate-ready late arrival */
    delete sandboxWindow.PFLegislate;
    var m5 = freshMount({});
    ok('no toggle before federal arrives',
      m5.el.querySelectorAll('[data-sl-tab]').length === 0);
    sandboxWindow.PFLegislate = { mount: function () {} };
    (docListeners['pf-legislate-ready'] || []).forEach(function (f) { f(); });
    ok('toggle appears on pf-legislate-ready',
      m5.el.querySelectorAll('[data-sl-tab]').length === 2);
    delete sandboxWindow.PFLegislate;

    /* fail-soft: backend down */
    backendDown = true;
    var m6 = freshMount({ state: 'TX' });
    var h6 = htmlOf(m6);
    ok('backend down -> inline error (not blank)',
      h6.indexOf('c-err') >= 0);
    ok('backend down -> RETRY buttons',
      m6.el.querySelectorAll('[data-sl-retry]').length >= 1);
    backendDown = false;
    m6.el.querySelectorAll('[data-sl-retry]')[0].click();
    ok('retry recovers after backend returns',
      htmlOf(m6).indexOf('Senate') >= 0);

    /* statepeople_list absent -> section hides */
    var m7 = freshMount({ state: 'NE' });
    var h7 = htmlOf(m7);
    ok('Nebraska renders its single chamber name (real contract: house_name null)',
      h7.indexOf('Nebraska Legislature') >= 0);
    ok('absent statepeople_list -> legislator section hidden',
      h7.indexOf('Your state legislators') < 0);
    ok('NE empty bills -> honest empty state',
      h7.indexOf('No active bills listed') >= 0);

    /* DC has no seeded row in the real backend -> honest "no data" note */
    var m7b = freshMount({ state: 'DC' });
    var h7b = htmlOf(m7b);
    ok('DC (unseeded) -> "No legislature data" note, not an error loop',
      h7b.indexOf('No legislature data for this state yet.') >= 0 &&
      h7b.indexOf('c-err') < 0);

    /* renderSection standalone */
    appendedSections = [];
    var div = PFStateLeg.renderSection({});
    ok('renderSection returns a mounted div',
      !!div && appendedSections.length === 1 &&
      appendedSections[0].getAttribute('data-game') === 'stateleg');
    ok('renderSection content mounted',
      div.innerHTML.indexOf('State Legislatures') >= 0);

    /* gate without callsign */
    var saved = sandboxWindow.PFCallsign;
    sandboxWindow.PFCallsign = function () { return ''; };
    var m8 = freshMount({});
    ok('no callsign -> gate message (not a broken pane)',
      htmlOf(m8).indexOf('gate') >= 0);
    sandboxWindow.PFCallsign = saved;

    console.log('\n' + passes + ' passed, ' + failures + ' failed.');
    process.exit(failures ? 1 : 0);
  }, 50);
}, 50);
