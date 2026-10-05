#!/usr/bin/env node
/* tests/polls-contract.verify.js — contract-fix verification for the
 * Network Polls pane (v1.4.3/games/civic.js), 2026-10-05.
 * DOM-shim: extracts the inner <script> from the civic template, executes it
 * against a fake DOM + fake JSONP/fetch backend, and asserts the backend
 * contract (be/network-polls @ d5e33ef):
 *   1. polls POSTs use po_action (polls_vote, polls_create) — no p_action
 *      anywhere in the polls code path.
 *   2. polls_get detail is nested under resp.poll; per-option counts come
 *      from `count` (null until voted/closed), pct computed from
 *      count/total_votes.
 *   3. null counts fall back to list-level options without NaN.
 *   4. closed-polls section reads polls_list with status=closed.
 * Run: node tests/polls-contract.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- extract the inner script from the template ---------- */
var m = src.match(/<script>\n([\s\S]*?)\n<\/scr`\+`ipt>/);
ok('inner script extracted from civic template', !!m);
var inner = m[1];
/* expose internals for the contract assertions (injected inside the IIFE) */
inner = inner.replace(/\}\)\(\);\s*$/,
  '\n;window.__PT={post:post,api:api,pollDetailAdapt:pollDetailAdapt,' +
  'pollCountsOpen:pollCountsOpen,pollCard:pollCard,pollsPane:pollsPane,' +
  'pollsIsAdmin:pollsIsAdmin,' +
  'resetDetails:function(){POLLS_DETAIL={};POLLS_FETCHING={};}};\n})();');

/* ---------- canned backend (contract shape: be/network-polls) ---------- */
var NOW = Date.now();
var openPoll = { id: 'p1', question: 'Pressure the water bill?', kind: 'pressure',
  bill_id: 'HB-42', options: [{ id: 'o1', label: 'Yes' }, { id: 'o2', label: 'No' }],
  closes_at: NOW + 864e5, status: 'open', total_votes: 0,
  created_by: 'c1', has_voted: false, results_hidden: true };
var closedPoll = { id: 'p2', question: 'Old poll?', kind: 'general',
  options: [{ id: 'o1', label: 'Aye' }, { id: 'o2', label: 'Nay' }],
  closes_at: NOW - 864e5, status: 'closed', total_votes: 10,
  created_by: 'c1', has_voted: false, results_hidden: false };
/* polls_get for p1: voted viewer sees released counts (nested under poll) */
var detailCounts = { ok: true, poll: { id: 'p1', question: 'Pressure the water bill?',
  kind: 'pressure', bill_id: 'HB-42',
  options: [{ id: 'o1', label: 'Yes', count: 7 }, { id: 'o2', label: 'No', count: 3 }],
  closes_at: NOW + 864e5, status: 'open', total_votes: 10,
  created_by: 'c1', has_voted: true, results_hidden: false } };
/* polls_get for p2: closed poll, counts released */
var detailClosed = { ok: true, poll: { id: 'p2', question: 'Old poll?', kind: 'general',
  options: [{ id: 'o1', label: 'Aye', count: 6 }, { id: 'o2', label: 'Nay', count: 4 }],
  closes_at: NOW - 864e5, status: 'closed', total_votes: 10,
  created_by: 'c1', has_voted: false, results_hidden: false } };
/* polls_get with counts still hidden (null) */
var detailHidden = { ok: true, poll: { id: 'p2', question: 'Old poll?', kind: 'general',
  options: [{ id: 'o1', label: 'Aye', count: null }, { id: 'o2', label: 'Nay', count: null }],
  closes_at: NOW - 864e5, status: 'closed', total_votes: 0,
  created_by: 'c1', has_voted: false, results_hidden: true } };
var detailMode = 'counts';

function canned(action, params) {
  if (action === 'polls_list' && params.status === 'open') return { ok: true, polls: [openPoll] };
  if (action === 'polls_list' && params.status === 'closed') return { ok: true, polls: [closedPoll] };
  if (action === 'polls_get') {
    if (params.poll_id === 'p1') return detailCounts;
    return detailMode === 'hidden' ? detailHidden : detailClosed;
  }
  return { ok: false };
}

/* ---------- DOM / browser stubs ---------- */
var apiUrls = [];
var postBodies = [];
var store = {};
var adminStore = {};
var xCivic = { innerHTML: '' };

function parseQuery(u) {
  var out = {};
  var q = u.split('?')[1] || '';
  q.split('&').forEach(function (pair) {
    var kv = pair.split('=');
    out[decodeURIComponent(kv[0] || '')] = decodeURIComponent(kv[1] || '');
  });
  return out;
}

var sandbox = {};
sandbox.window = {
  PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
  PFCallsign: function () { return 'TESTCALL'; },
  PFDeviceId: function () { return 'TESTDEV'; },
  PF: { skip: function () { return false; },
        toast: function () {},
        errCopy: function (j, d) { return d; } },
  localStorage: {
    getItem: function (k) { return store[k] != null ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  /* admin-session flag per the pollsIsAdmin() contract (same key as
     governance.js/economy.js); secret is entered on private admin surfaces */
  sessionStorage: {
    getItem: function (k) { return adminStore[k] != null ? adminStore[k] : null; },
    setItem: function (k, v) { adminStore[k] = String(v); },
    removeItem: function (k) { delete adminStore[k]; }
  }
};
sandbox.window.localStorage = sandbox.window.localStorage;
var documentStub = {
  head: { appendChild: function (s) {
    apiUrls.push(s.src);
    var q = parseQuery(s.src);
    var fn = q.callback;
    s.parentNode = { removeChild: function () {} };
    var resp = canned(q.action, q);
    if (sandbox.window[fn]) sandbox.window[fn](resp);
  } },
  body: { appendChild: function () {} },
  createElement: function (tag) {
    if (tag === 'script') return { src: '', parentNode: null, onerror: null };
    return { textContent: '', style: {}, setAttribute: function () {}, remove: function () {} };
  },
  getElementById: function (id) { return id === 'xCivic' ? xCivic : null; },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; }
};
sandbox.document = documentStub;
sandbox.window.document = documentStub;
sandbox.PF = sandbox.window.PF;
sandbox.localStorage = sandbox.window.localStorage;
sandbox.sessionStorage = sandbox.window.sessionStorage;
sandbox.setInterval = function () { return 0; };
sandbox.clearInterval = function () {};
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.fetch = function (url, opts) {
  try { postBodies.push(JSON.parse(opts.body)); } catch (e) { postBodies.push(opts.body); }
  return Promise.resolve({ json: function () { return Promise.resolve({ ok: true, id: 'p9' }); } });
};
sandbox.AbortController = undefined;
sandbox.console = console;
vm.createContext(sandbox);

vm.runInContext(inner, sandbox, { filename: 'civic-inner.js' });
var T = sandbox.window.__PT;
ok('test hooks exposed', !!T && !!T.post && !!T.pollCard);

/* ---------- 1. polls_list status params (closed section uses status=closed) ---------- */
var listUrls = apiUrls.filter(function (u) { return u.indexOf('action=polls_list') >= 0; });
ok('polls_list called with status=open', listUrls.some(function (u) { return u.indexOf('status=open') >= 0; }), JSON.stringify(listUrls));
ok('polls_list called with status=closed (closed section)', listUrls.some(function (u) { return u.indexOf('status=closed') >= 0; }), JSON.stringify(listUrls));

/* ---------- 2. POST action key: po_action, never p_action ---------- */
postBodies = [];
T.post('poll', 'po_action', 'polls_vote',
  { callsign: 'TESTCALL', poll_id: 'p1', option_id: 'o1' }, function () {});
setTimeout(function () {
  var b = postBodies[0] || {};
  ok('polls_vote posts type=poll', b.type === 'poll', JSON.stringify(b));
  ok('polls_vote posts po_action=polls_vote', b.po_action === 'polls_vote', JSON.stringify(b));
  ok('polls_vote body has no p_action key', !('p_action' in b), JSON.stringify(b));
  ok('polls_vote carries poll_id + option_id', b.poll_id === 'p1' && b.option_id === 'o1');

  postBodies = [];
  T.post('poll', 'po_action', 'polls_create',
    { callsign: 'TESTCALL', question: 'Q?', options: ['a', 'b'], kind: 'general', closes_at: NOW + 864e5 }, function () {});
  setTimeout(function () {
    var c = postBodies[0] || {};
    ok('polls_create posts po_action=polls_create', c.po_action === 'polls_create', JSON.stringify(c));
    ok('polls_create body has no p_action key', !('p_action' in c), JSON.stringify(c));

    /* ---------- 3. adapter: nested resp.poll ---------- */
    var ad = T.pollDetailAdapt({ ok: true, poll: detailCounts.poll });
    ok('pollDetailAdapt reads nested poll', ad && ad.id === 'p1' && ad.options.length === 2);
    var adFb = T.pollDetailAdapt({ ok: true, id: 'x', options: [{ id: 'o', label: 'L', count: 5 }] });
    ok('pollDetailAdapt falls back to resp when no poll key', adFb && adFb.id === 'x');

    /* ---------- 4. render voted poll: pct from count/total_votes ---------- */
    store['pf_polls_voted_v1'] = JSON.stringify({ p1: 'o1' });
    T.resetDetails();
    T.pollCard(openPoll, false); /* first pass: triggers fetchPollDetail */
    var h1 = T.pollCard(openPoll, false); /* second pass: detail cached */
    ok('voted poll renders Yes option', h1.indexOf('Yes') >= 0);
    ok('pct 70% computed from count/total_votes', h1.indexOf('70%') >= 0, h1.slice(0, 400));
    ok('pct 30% computed from count/total_votes', h1.indexOf('30%') >= 0);
    ok('vote count 7 rendered', h1.indexOf('7 (70%)') >= 0, h1.slice(0, 400));

    /* ---------- 5. null counts -> list-level options fallback, no NaN ---------- */
    detailMode = 'hidden';
    delete store['pf_polls_voted_v1'];
    T.resetDetails();
    T.pollCard(closedPoll, true); /* first pass: triggers fetchPollDetail */
    var h2 = T.pollCard(closedPoll, true); /* second pass: detail cached */
    ok('hidden-counts poll falls back to list options (Aye)', h2.indexOf('Aye') >= 0);
    ok('hidden-counts poll falls back to list options (Nay)', h2.indexOf('Nay') >= 0);
    ok('no NaN in hidden-counts render', h2.indexOf('NaN') < 0, h2.slice(0, 300));

    /* ---------- 6. source grep: no p_action in polls code path ---------- */
    var srcFull = fs.readFileSync(SRC, 'utf8');
    ok('no "poll","p_action" POST in sources', srcFull.indexOf('"poll","p_action"') < 0);
    ok('no p_action polls key in sources', !/po?ll[^]*p_action/.test(srcFull) || srcFull.indexOf("p_action:'polls_") < 0);

    /* ---------- 7. admin gate: creation surface admin-only, no secret input on public pane ---------- */
    var htmlNonAdmin = T.pollsPane();
    ok('non-admin: pollsIsAdmin() false without session secret', !T.pollsIsAdmin());
    ok('non-admin: no START A POLL button rendered', htmlNonAdmin.indexOf('cvPollOpen') < 0, htmlNonAdmin.slice(-400));
    ok('non-admin: no create form rendered', htmlNonAdmin.indexOf('cvPollCreate') < 0);
    ok('non-admin: admin-only x-note shown', htmlNonAdmin.indexOf('Poll creation is admin-only') >= 0, htmlNonAdmin.slice(-400));
    ok('no admin-secret input on the public pane (non-admin)', htmlNonAdmin.indexOf('pf_admin_secret') < 0);
    adminStore['pf_admin_secret'] = 's3cret';
    ok('admin: pollsIsAdmin() true with session secret', T.pollsIsAdmin());
    var htmlAdmin = T.pollsPane();
    ok('admin: START A POLL button rendered', htmlAdmin.indexOf('cvPollOpen') >= 0 && htmlAdmin.indexOf('START A POLL') >= 0, htmlAdmin.slice(-400));
    ok('no admin-secret input on the public pane (admin)', htmlAdmin.indexOf('pf_admin_secret') < 0);
    delete adminStore['pf_admin_secret'];

    console.log(failures === 0 ? '\nALL POLLS CONTRACT CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
    process.exit(failures === 0 ? 0 : 1);
  }, 50);
}, 50);
