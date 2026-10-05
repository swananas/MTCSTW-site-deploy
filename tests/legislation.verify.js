#!/usr/bin/env node
/* tests/legislation.verify.js — verification harness for games/legislation.js.
 * Two-stage DOM-shim:
 *   1. Outer: runs the silo IIFE against a PF stub; captures the staged
 *      <template id="pf-ov-legislation"> HTML (or nothing under
 *      ?pf_off=legislation).
 *   2. Inner: extracts the <script> from the captured template and runs it
 *      in a fresh VM with a stub document/window/fetch. JSONP reads are
 *      answered synchronously from canned backend fixtures; fetch POSTs are
 *      recorded and answered from canned fixtures.
 * Asserts (~32): card render, stage mapping for every status value (unit +
 * rendered), filter behavior (status/chamber fire bills_list with params),
 * vote POST shape, tally update in place, founder-gating of the vote button,
 * expand -> bills_get, key-player event dispatch, empty/error states.
 * Run: node tests/legislation.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'legislation.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- stub DOM ---------- */
function makeEl(id) {
  return {
    id: id || '', innerHTML: '', textContent: '', value: '', style: {},
    attrs: {}, disabled: false,
    __listeners: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return (k in this.attrs) ? this.attrs[k] : null; },
    hasAttribute: function (k) { return k in this.attrs; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    addEventListener: function (t, fn) {
      this.__listeners[t] = this.__listeners[t] || [];
      this.__listeners[t].push(fn);
    },
    appendChild: function () {}, removeChild: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    closest: function () { return null; },
    scrollIntoView: function () {},
    onclick: null, onchange: null, oninput: null
  };
}
var HOST_GLOBALS = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Math',
  'JSON', 'RegExp', 'Error', 'isFinite', 'parseInt', 'parseFloat',
  'encodeURIComponent', 'decodeURIComponent', 'console'];

function runOuter(search) {
  var skipSet = {};
  var m = (search || '').match(/[?&]pf_off=([^&]+)/);
  if (m) m[1].split(',').forEach(function (s) { skipSet[decodeURIComponent(s)] = 1; });
  var win = { __template: null };
  HOST_GLOBALS.forEach(function (g) { win[g] = global[g]; });
  win.window = win;
  win.PF = {
    skip: function (s) { return !!skipSet[s]; },
    holder: function () {
      return {
        insertAdjacentHTML: function (pos, html) { win.__template = html; }
      };
    }
  };
  vm.createContext(win);
  vm.runInContext(src, win, { filename: 'legislation-outer.js' });
  return win;
}

/* Extract the inner <script> from the staged template. In the staged string
   the file's `</scr`+`ipt>` concat has already evaluated to `</script>`. */
function innerSrcOf(templateHtml) {
  var m = String(templateHtml).match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}

function runInner(opts) {
  opts = opts || {};
  var win = {
    __jsonpCalls: [], __jsonpParams: [], __posts: [], __toasts: [],
    __dispatched: [], __els: {}
  };
  HOST_GLOBALS.forEach(function (g) { win[g] = global[g]; });
  win.window = win;
  win.PF_BACKEND_URL = 'https://backend.test/exec';
  win.location = { href: 'https://www.mtcstw.com/political-hq', search: '' };
  win.localStorage = { getItem: function () { return '[]'; }, setItem: function () {} };
  win.PFCallsign = function () { return opts.callsign || ''; };
  win.PFDeviceId = function () { return 'dev-1'; };
  win.setTimeout = function () { return 0; };
  win.clearTimeout = function () {};
  win.CustomEvent = function (name, o) { this.name = name; this.detail = (o && o.detail) || {}; };

  function el(id) {
    if (!win.__els[id]) win.__els[id] = makeEl(id);
    return win.__els[id];
  }
  /* Pre-registered mount points the silo looks up. */
  el('xLegislation');
  el('lgStatus');
  var cham = el('lgCham');
  var chBtns = [' ', 'house', 'senate'].map(function () { return makeEl(); });
  cham.querySelectorAll = function () { return chBtns; };
  win.__chBtns = chBtns;
  var listEl = el('lgList');

  function canned(action, params) {
    var b = opts.backend || {};
    var r = b[action];
    if (typeof r === 'function') return r(params);
    return (r === undefined) ? null : r;
  }
  function handleJSONP(url) {
    win.__jsonpCalls.push(url);
    var params = {};
    String(url).replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) {
      params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    var action = params.action || '';
    win.__jsonpParams.push({ action: action, params: params });
    var j = canned(action, params);
    var cb = params.callback || '';
    try { if (cb && win[cb]) win[cb](j); } catch (e) { /* test surface */ }
  }
  function scriptEl() {
    var s = makeEl();
    var cur = '';
    Object.defineProperty(s, 'src', {
      get: function () { return cur; },
      set: function (v) { cur = v; handleJSONP(v); },
      configurable: true
    });
    s.parentNode = null;
    return s;
  }
  win.document = {
    getElementById: function (id) { return win.__els[id] || null; },
    createElement: function (tag) {
      if (String(tag).toLowerCase() === 'script') return scriptEl();
      return makeEl();
    },
    querySelector: function (sel) {
      if (sel === '.lg-cham') return cham;
      return null;
    },
    querySelectorAll: function (sel) {
      /* Backed by a scan of the last rendered list HTML — the silo only
         queries [data-leg-tally] / [data-leg-picker] inside the list. */
      var html = el('xLegislation').innerHTML || '';
      var out = [], re, mm;
      if (sel === '[data-leg-tally]') re = /data-leg-tally="([^"]*)"/g;
      else if (sel === '[data-leg-picker]') re = /data-leg-picker="([^"]*)"/g;
      else return [];
      while ((mm = re.exec(html))) {
        var key = sel + '|' + mm[1];
        if (!win.__els[key]) win.__els[key] = makeEl(key);
        var e2 = win.__els[key];
        e2.setAttribute(sel === '[data-leg-tally]' ? 'data-leg-tally' : 'data-leg-picker', mm[1]);
        out.push(e2);
      }
      return out;
    },
    addEventListener: function () {},
    dispatchEvent: function (ev) { win.__dispatched.push(ev); },
    head: { appendChild: function () {} },
    body: makeEl('body')
  };
  win.fetch = function (url, o2) {
    var body = {};
    try { body = JSON.parse(o2.body); } catch (e) {}
    win.__posts.push({ url: url, body: body });
    var action = body.b_action || body.action || '';
    var j = canned('POST:' + action, body);
    if (j === null || j === undefined) j = { ok: false, err: 'no fixture' };
    /* Synchronous promise stand-in that unwraps nested thenables one
       level, like a real Promise chain (r.json() returns a promise). */
    function P(v) {
      return {
        __P: true,
        then: function (cb) {
          var r;
          try { r = cb(v); } catch (e) { return P(null); }
          if (r && r.__P) { var out; r.then(function (x) { out = x; }); return P(out); }
          return P(r);
        },
        catch: function () { return P(null); }
      };
    }
    return P({ json: function () { return P(j); } });
  };
  win.PF = {
    skip: function () { return false; },
    toast: function (m2) { win.__toasts.push(String(m2)); },
    errCopy: function (j, fb) {
      return String((j && (j.err || j.error)) || fb || 'Error.');
    }
  };
  vm.createContext(win);
  var inner = innerSrcOf(opts.template);
  if (!inner) throw new Error('no inner script extracted');
  vm.runInContext(inner, win, { filename: 'legislation-inner.js' });
  win.__el = el;
  win.__listEl = listEl;
  return win;
}

/* Fire the delegated list click with a fake target matching one data attr. */
function fireListClick(win, attr, val) {
  var fake = makeEl('fake');
  fake.setAttribute(attr, val);
  fake.closest = function () { return fake; };
  var listeners = win.__listEl.__listeners.click || [];
  var ev = { target: fake };
  listeners.forEach(function (fn) { fn(ev); });
}
function lastJsonp(win) {
  return win.__jsonpCalls[win.__jsonpCalls.length - 1] || '';
}

/* ---------- fixtures ---------- */
function bill(over) {
  var b = {
    id: 'b1', number: 'H.R. 22', title: 'SAVE Act',
    summary: 'Requires proof of citizenship to register to vote.',
    status: 'committee', chamber: 'house',
    sponsor_name: 'Chip Roy', sponsor_bioguide: 'R000589',
    support_count: 2, oppose_count: 1,
    pressure_link: 'https://www.mtcstw.com/political-hq#campaigns'
  };
  Object.keys(over || {}).forEach(function (k) { b[k] = over[k]; });
  return b;
}
function baseBackend() {
  return {
    bills_list: { ok: true, bills: [bill()] },
    cell_mine: { ok: true, cell_id: 'cell-1', is_founder: true, callsign: 'CS' },
    bills_get: { ok: true, bill: bill({ full_summary: 'Full text of the summary.' }),
      cell_votes: { support: 2, oppose: 1 }, pressure_link: '/political-hq#campaigns' },
    'POST:bill_vote': { ok: true, cell_votes: { support: 5, oppose: 2 } }
  };
}
var TEMPLATE = runOuter('').__template;
ok('template staged with pf-ov-legislation id',
  !!TEMPLATE && TEMPLATE.indexOf('id="pf-ov-legislation"') !== -1);
ok('inner script extractable from staged template', !!innerSrcOf(TEMPLATE));
ok('?pf_off=legislation stages nothing', runOuter('?pf_off=legislation').__template === null);

/* ---------- stage mapping (unit) ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), callsign: 'CS' });
  var T = w.__pfLegTest;
  function st(s) { return T.billStage(s); }
  ok('stage: introduced -> 0', st('introduced').idx === 0 && !st('introduced').dead);
  ok('stage: committee -> 1', st('committee').idx === 1);
  ok('stage: passed_house -> 2', st('passed_house').idx === 2);
  ok('stage: passed_senate -> 3', st('passed_senate').idx === 3);
  ok('stage: signed -> 4', st('signed').idx === 4);
  ok('stage: dead -> terminal', st('dead').dead === true && st('dead').idx === -1);
  ok('stage: alias became_law -> 4', st('became_law').idx === 4);
  ok('stage: unknown -> no highlight, not dead',
    st('mystery_status').idx === -1 && !st('mystery_status').dead);
})();

/* ---------- rendered card + stages ---------- */
(function () {
  var bills = [
    bill({ id: 's0', status: 'introduced' }),
    bill({ id: 's1', status: 'committee' }),
    bill({ id: 's2', status: 'passed_house' }),
    bill({ id: 's3', status: 'passed_senate' }),
    bill({ id: 's4', status: 'signed' }),
    bill({ id: 's5', status: 'dead' }),
    bill({ id: 's6', status: 'mystery_status' })
  ];
  var be = baseBackend();
  be.bills_list = { ok: true, bills: bills };
  var w = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  var html = w.__el('xLegislation').innerHTML;
  ok('card renders number + title',
    html.indexOf('H.R. 22') !== -1 && html.indexOf('SAVE Act') !== -1);
  ok('card renders plain-English summary',
    html.indexOf('Requires proof of citizenship') !== -1);
  var T = w.__pfLegTest;
  function curCount(s) {
    var h = T.stageHTML(s);
    var m2 = h.match(/lg-cur/g);
    return m2 ? m2.length : 0;
  }
  ok('rendered: committee highlights exactly one stage', curCount('committee') === 1);
  ok('rendered: committee highlight sits on the Committee step',
    T.stageHTML('committee').indexOf('lg-cur"><span class="lg-dot"></span><span class="lg-lab">Committee') !== -1);
  ok('rendered: signed marks all 5 done, current on Signed',
    (T.stageHTML('signed').match(/lg-done/g) || []).length === 4 && curCount('signed') === 1);
  ok('rendered: dead is terminal greyed, no current highlight',
    T.stageHTML('dead').indexOf('lg-dead') !== -1 &&
    T.stageHTML('dead').indexOf('DEAD') !== -1 && curCount('dead') === 0);
  ok('rendered: unknown status shows raw status, no highlight',
    T.stageHTML('mystery_status').indexOf('Status: mystery_status') !== -1 &&
    curCount('mystery_status') === 0);
})();

/* ---------- card content: stuck, players, tally, pressure ---------- */
(function () {
  var b = bill({
    id: 'c1', stuck_in: 'Senate — no floor vote scheduled',
    blockers: [{ name: 'Mitch McConnell', bioguide_id: 'M000355' }, 'Kyrsten Sinema'],
    support_count: 0, oppose_count: 0,
    pressure_link: 'https://example.com/campaign-9'
  });
  var be = baseBackend();
  be.bills_list = { ok: true, bills: [b] };
  var w = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  var html = w.__el('xLegislation').innerHTML;
  ok('stuck-in line renders', html.indexOf('Stuck: Senate — no floor vote scheduled') !== -1);
  ok('sponsor name renders', html.indexOf('Chip Roy') !== -1);
  ok('blockers render when API returns them (object + string)',
    html.indexOf('Mitch McConnell') !== -1 && html.indexOf('Kyrsten Sinema') !== -1);
  ok('zero tally renders honestly', html.indexOf('No cell votes yet.') !== -1);
  ok('pressure button uses API pressure_link',
    html.indexOf('href="https://example.com/campaign-9"') !== -1);
  var be2 = baseBackend();
  be2.bills_list = { ok: true, bills: [bill({ id: 'c2', support_count: 2, oppose_count: 1 })] };
  var w2 = runInner({ template: TEMPLATE, backend: be2, callsign: 'CS' });
  var html2 = w2.__el('xLegislation').innerHTML;
  ok('tally line on every card',
    html2.indexOf('2 cells support') !== -1 && html2.indexOf('1 cell oppose') !== -1);
  var be3 = baseBackend();
  be3.bills_list = { ok: true, bills: [bill({ id: 'c3' })] };
  var w3 = runInner({ template: TEMPLATE, backend: be3, callsign: 'CS' });
  ok('no blockers section when API omits them',
    w3.__el('xLegislation').innerHTML.indexOf('Blockers:') === -1);
})();

/* ---------- filters fire bills_list with params ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), callsign: 'CS' });
  var n0 = w.__jsonpCalls.length;
  w.__el('lgStatus').value = 'committee';
  w.__el('lgStatus').onchange();
  var u1 = lastJsonp(w);
  ok('status filter fires bills_list with status param',
    u1.indexOf('action=bills_list') !== -1 && u1.indexOf('status=committee') !== -1,
    u1);
  var n1 = w.__jsonpCalls.length;
  var fakeBtn = makeEl('fake');
  fakeBtn.setAttribute('data-ch', 'senate');
  fakeBtn.closest = function () { return fakeBtn; };
  w.__el('lgCham').onclick({ target: fakeBtn });
  var u2 = lastJsonp(w);
  ok('chamber toggle fires bills_list with chamber param',
    u2.indexOf('action=bills_list') !== -1 && u2.indexOf('chamber=senate') !== -1,
    u2);
  ok('filter refires issued new requests', w.__jsonpCalls.length > n1 && n1 > n0);
})();

/* ---------- founder gating ---------- */
(function () {
  var wNo = runInner({ template: TEMPLATE, backend: baseBackend() }); /* no callsign */
  ok('vote button hidden without callsign',
    wNo.__el('xLegislation').innerHTML.indexOf('data-leg-vote') === -1);
  var be = baseBackend();
  be.cell_mine = { ok: true, cell_id: 'cell-1', is_founder: false, callsign: 'CS' };
  var wNf = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  ok('vote button hidden for non-founder',
    wNf.__el('xLegislation').innerHTML.indexOf('data-leg-vote') === -1);
  var wF = runInner({ template: TEMPLATE, backend: baseBackend(), callsign: 'CS' });
  ok('vote button shown for founder',
    wF.__el('xLegislation').innerHTML.indexOf('data-leg-vote="b1"') !== -1);
})();

/* ---------- vote picker + POST shape + tally update + toast ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), callsign: 'CS' });
  var T = w.__pfLegTest;
  T.paintPicker('b1', true);
  var pk = w.__els['[data-leg-picker]|b1'];
  ok('vote picker opens with SUPPORT / OPPOSE',
    pk && pk.style.display === 'block' &&
    pk.innerHTML.indexOf('SUPPORT') !== -1 && pk.innerHTML.indexOf('OPPOSE') !== -1);
  T.castVote('b1', 'support');
  var post = w.__posts[w.__posts.length - 1];
  ok('vote POST shape {type,b_action,callsign,cell_id,bill_id,position}',
    post && post.body.type === 'bill' && post.body.b_action === 'bill_vote' &&
    post.body.callsign === 'CS' && post.body.cell_id === 'cell-1' &&
    post.body.bill_id === 'b1' && post.body.position === 'support',
    JSON.stringify(post && post.body));
  var tally = w.__els['[data-leg-tally]|b1'];
  ok('tally updates in place on success',
    tally && tally.innerHTML.indexOf('5 cells support') !== -1 &&
    tally.innerHTML.indexOf('2 cells oppose') !== -1,
    tally && tally.innerHTML);
  ok('success toast reads "Cell vote recorded: SUPPORT"',
    w.__toasts.indexOf('Cell vote recorded: SUPPORT') !== -1,
    JSON.stringify(w.__toasts));
})();

/* ---------- vote failure: honest error, tally untouched ---------- */
(function () {
  var be = baseBackend();
  be['POST:bill_vote'] = { ok: false, err: 'Not the founder.' };
  var w = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  var T = w.__pfLegTest;
  T.paintPicker('b1', true);
  T.castVote('b1', 'oppose');
  ok('vote failure surfaces backend error',
    w.__toasts.some(function (t) { return t.indexOf('Not the founder.') !== -1; }),
    JSON.stringify(w.__toasts));
  var tally = w.__els['[data-leg-tally]|b1'];
  ok('tally untouched on failure',
    !tally || tally.innerHTML.indexOf('5 cells support') === -1);
})();

/* ---------- expand -> bills_get detail with joined key players ---------- */
(function () {
  var be = baseBackend();
  be.bills_get = function (params) {
    return { ok: true,
      bill: bill({ id: params.bill_id, full_summary: 'The full breakdown.' }),
      key_players_joined: null,
      pressure_link: '/political-hq#campaigns',
      cell_votes: { support: 2, oppose: 1 } };
  };
  /* bills_get fixture carries key_players joined to member data */
  var w = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  var before = w.__jsonpCalls.length;
  w.__pfLegTest.toggleExpand('b1');
  var fired = w.__jsonpCalls.slice(before).join(' ');
  ok('expand fires bills_get with bill_id',
    fired.indexOf('action=bills_get') !== -1 && fired.indexOf('bill_id=b1') !== -1,
    fired);
  /* re-run with key_players in the detail payload */
  var be2 = baseBackend();
  be2.bills_get = { ok: true,
    bill: Object.assign(bill({ id: 'b1' }), {
      key_players: [
        { name: 'Chip Roy', bioguide_id: 'R000589', role: 'sponsor', party: 'R', state: 'TX', chamber: 'house' },
        { name: 'Mitch McConnell', bioguide_id: 'M000355', role: 'blocker', party: 'R', state: 'KY', chamber: 'senate' }
      ] }),
    cell_votes: { support: 2, oppose: 1 } };
  var w2 = runInner({ template: TEMPLATE, backend: be2, callsign: 'CS' });
  w2.__pfLegTest.toggleExpand('b1');
  var html = w2.__el('xLegislation').innerHTML;
  ok('detail renders key players with joined member data',
    html.indexOf('Mitch McConnell') !== -1 && html.indexOf('Sen KY') !== -1 &&
    html.indexOf('blocker') !== -1);
})();

/* ---------- key-player link dispatches directory event ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), callsign: 'CS' });
  w.__pfLegTest.focusMember('R000589|Chip Roy');
  var ev = w.__dispatched[w.__dispatched.length - 1];
  ok('key-player click dispatches pf-legislation-member',
    ev && ev.name === 'pf-legislation-member' &&
    ev.detail.bioguide_id === 'R000589' && ev.detail.name === 'Chip Roy',
    JSON.stringify(ev && { name: ev.name, detail: ev.detail }));
})();

/* ---------- error / empty states ---------- */
(function () {
  var be = baseBackend();
  be.bills_list = null; /* unreachable */
  var w = runInner({ template: TEMPLATE, backend: be, callsign: 'CS' });
  var html = w.__el('xLegislation').innerHTML;
  ok('unreachable bills_list renders retry',
    html.indexOf('id="lgRetry"') !== -1);
  var be2 = baseBackend();
  be2.bills_list = { ok: true, bills: [] };
  var w2 = runInner({ template: TEMPLATE, backend: be2, callsign: 'CS' });
  ok('empty list renders honest empty state',
    w2.__el('xLegislation').innerHTML.indexOf('No bills on the board') !== -1);
})();

console.log('\n' + passes + ' passed, ' + failures + ' failed.');
process.exit(failures ? 1 : 0);
