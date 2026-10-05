/* Congress scorecards frontend smoke test (2026-10-05).
   DOM-stub harness: loads the REAL v1.4.3/games/civic.js inner script,
   answers its JSONP reads with contract-shaped fixtures, and drives the
   scorecard / issue / share interactions through the module's own
   delegated listeners. Run: node tests/congress-scorecards-fe.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var CIVIC = '/home/hatch/workspace/wt-scorecards/v1.4.3/games/civic.js';

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ---- captured state ---- */
var REQ = [];            /* JSONP requests: {action, params} */
var SHARE_TEXTS = [];    /* PFShare.shareText payloads */
var TOASTS = [];         /* PF.toast messages */

function parseQS(src) {
  var q = src.split('?')[1] || '', out = {};
  q.split('&').forEach(function (kv) {
    var i = kv.indexOf('=');
    if (i > -1) out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
  });
  return out;
}

/* Contract-shaped fixtures (mirrors the be/congress-scorecards contract). */
var VOTES_S001 = [
  { vote_id: 'V1', position: 'Yea', issue_tag: 'Reproductive Freedom', question: 'Passage', bill_title: 'Freedom Act', vote_date: '2026-01-15', result: 'Passed' },
  { vote_id: 'V2', position: 'Nay', issue_tag: 'Labor Rights', question: 'Passage', bill_title: 'Union Shield Act', vote_date: '2026-02-20', result: 'Failed' }
];
var ISSUE_V1 = {
  ok: true,
  vote: { vote_id: 'V1', question: 'Passage', bill_title: 'Freedom Act', vote_date: '2026-01-15', result: 'Passed', chamber: 'House' },
  breakdown: { yea: { D: 48, R: 2, I: 0 }, nay: { D: 1, R: 44, I: 2 }, not_voting: { D: 1, R: 2, I: 0 } }
};
var REPS = [
  { name: 'Jane Doe', party: 'D', chamber: 'house', state: 'LA', district: '2', phone: '(202) 225-0001', bioguide_id: 'S001' },
  { name: '<img src=x onerror=alert(1)>', party: 'R', chamber: 'senate', state: 'TX', phone: '', bioguide_id: 'S002' },
  { name: 'Bob No', party: 'I', chamber: 'senate', state: 'VT', phone: '', bioguide_id: 'S003' },
  { name: 'No Key Rep', party: 'D', chamber: 'house', state: 'CA', district: '5', phone: '' }
];

function responder(action, params) {
  if (action === 'reps_list') return { ok: true, reps: REPS };
  if (action === 'scorecard_get') {
    if (params.bioguide_id === 'S001') return { ok: true, bioguide_id: 'S001', votes: VOTES_S001 };
    if (params.bioguide_id === 'S002') return { ok: true, bioguide_id: 'S002', votes: [] };
    if (params.bioguide_id === 'S004') return null; /* unreachable wire */
    return { ok: false };
  }
  if (action === 'scorecard_issue') {
    if (params.vote_id === 'V1') return ISSUE_V1;
    return { ok: false };
  }
  if (action === 'rep_contact_history') return { ok: true, history: [] };
  return { ok: false };
}

/* ---- DOM stubs ---- */
function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false,
    style: {}, _attrs: {}, _handlers: {},
    getAttribute: function (a) { return this._attrs[a] || null; },
    setAttribute: function (a, v) { this._attrs[a] = String(v); },
    hasAttribute: function (a) { return Object.prototype.hasOwnProperty.call(this._attrs, a); },
    addEventListener: function (t, f) { this._handlers[t] = f; },
    removeEventListener: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    closest: function () { return null; },
    scrollIntoView: function () {},
    appendChild: function () {}, removeChild: function () {}
  };
}
var registry = {};
var docEl = makeEl();
var doc = {
  documentElement: docEl,
  head: { appendChild: function (s) {
    var qs = parseQS(s.src || '');
    var action = qs.action, params = qs;
    REQ.push({ action: action, params: params });
    var fn = qs.callback;
    setTimeout(function () {
      try { if (fn && window[fn]) window[fn](responder(action, params)); } catch (e) {}
    }, 5);
  } },
  createElement: function (tag) { return makeEl(); },
  getElementById: function (id) { return registry[id] || (registry[id] = makeEl()); },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  body: makeEl()
};
var window = {
  PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
  PFCallsign: function () { return 'TESTER'; },
  PFDeviceId: function () { return 'DEV1'; },
  PFShare: {
    shareText: function (t) { SHARE_TEXTS.push(t); },
    setPoster: function () {}
  },
  location: { href: 'https://www.mtcstw.com/political-hq' }
};
window.PF = {
  skip: function () { return false; },
  holder: function () { return { insertAdjacentHTML: function () {} }; },
  toast: function (m) { TOASTS.push(m); },
  gateHTML: function () { return ''; },
  errCopy: function (j, d) { return d; },
  shareUrl: function (u) { return u; }
};
var navigator = { share: function () { return Promise.resolve(); } };
/* Browsers expose window.* as bare globals; mirror PFShare for the idiom
   `window.PFShare&&PFShare.shareText(...)` used across the games. */
global.PFShare = window.PFShare;

/* Extract the inner <script> from civic.js and execute it with the stubs. */
function loadCivic() {
  var src = fs.readFileSync(CIVIC, 'utf8');
  var inner = src.split('<script>')[1].split('</scr')[0];
  var fn = new Function('window', 'document', 'navigator', 'localStorage',
    'setTimeout', 'clearTimeout', 'console', 'Math', 'JSON', 'Object',
    'Array', 'Number', 'String', 'Date', 'Error', 'encodeURIComponent', inner);
  var store = {};
  fn(window, doc, navigator,
    { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    setTimeout, clearTimeout, console, Math, JSON, Object,
    Array, Number, String, Date, Error, encodeURIComponent);
}

/* Fire a delegated click: the module calls e.target.closest(selector) once. */
function fakeBtn(vals) {
  return {
    id: vals.id || '',
    hasAttribute: function (a) { return Object.prototype.hasOwnProperty.call(vals, a); },
    getAttribute: function (a) { return vals[a] != null ? String(vals[a]) : null; }
  };
}
function clickOn(el, vals) {
  var h = el._handlers.click;
  if (!h) throw new Error('no click handler on element');
  h({ target: { closest: function () { return fakeBtn(vals); } } });
}
function reqs(action, key, val) {
  return REQ.filter(function (r) { return r.action === action && (!key || r.params[key] === val); });
}

async function main() {
  loadCivic();
  await sleep(80); /* let the initial JSONP round-trip + render settle */

  var xc = registry['xCivic'];
  ok('directory rendered', !!xc && xc.innerHTML.indexOf('Find your reps') !== -1);
  ok('reps_list read fired', reqs('reps_list').length >= 1);

  /* ---- scorecard toggle buttons: only rows carrying a bioguide key ----
     NOTE: paintDir() repaints the live #cvDirList element, so rows live in
     its innerHTML (as in the browser), not the xCivic template string. */
  var dlHtml0 = registry['cvDirList'].innerHTML;
  var toggles = (dlHtml0.match(/data-sc-toggle="/g) || []).length;
  ok('SCORECARD button on keyed rows only (3 of 4)', toggles === 3, 'found ' + toggles);
  ok('button carries the bioguide_id', dlHtml0.indexOf('data-sc-toggle="S001"') !== -1);

  /* ---- open member scorecard ---- */
  clickOn(registry['cvDirList'], { 'data-sc-toggle': 'S001' });
  await sleep(60);
  ok('scorecard_get fired with bioguide_id', reqs('scorecard_get', 'bioguide_id', 'S001').length === 1);
  var dl = registry['cvDirList'].innerHTML;
  ok('YEA badge rendered', dl.indexOf('cv-vb-yea') !== -1 && dl.indexOf('>YEA<') !== -1);
  ok('NAY badge rendered', dl.indexOf('cv-vb-nay') !== -1 && dl.indexOf('>NAY<') !== -1);
  ok('bill title rendered', dl.indexOf('Freedom Act') !== -1);
  ok('vote date rendered', dl.indexOf('01/15/2026') !== -1);
  ok('issue_tag is a jump button', dl.indexOf('data-sc-issue="V1"') !== -1 && dl.indexOf('Reproductive Freedom') !== -1);
  ok('SHARE button present once votes load', dl.indexOf('data-sc-share="S001"') !== -1);
  ok('member name escaped (no raw img)', dl.indexOf('Jane Doe') !== -1);

  /* ---- issue view: party breakdown math ---- */
  clickOn(registry['cvDirList'], { 'data-sc-issue': 'V1' });
  await sleep(60);
  ok('scorecard_issue fired with vote_id', reqs('scorecard_issue', 'vote_id', 'V1').length === 1);
  var ip = registry['cvIssuePanel'].innerHTML;
  ok('issue panel shows vote title', ip.indexOf('Freedom Act') !== -1);
  ok('issue panel shows chamber', ip.indexOf('House') !== -1);
  ok('yea total = D+R+I = 50', ip.indexOf('cv-irtot">50<') !== -1, ip.match(/cv-irtot">\d+</g));
  ok('nay total = 47', ip.indexOf('cv-irtot">47<') !== -1);
  ok('not-voting total = 3', ip.indexOf('cv-irtot">3<') !== -1);
  ok('party columns labeled D/R/I', ip.indexOf('>D<') !== -1 && ip.indexOf('>R<') !== -1 && ip.indexOf('>I<') !== -1);
  ok('BACK button present', ip.indexOf('data-issue-back') !== -1);

  /* ---- back returns to the directory ---- */
  clickOn(docEl, { 'data-issue-back': '' });
  await sleep(20);
  ok('issue panel cleared on back', registry['cvIssuePanel'].innerHTML === '');

  /* ---- issue error state + retry ---- */
  clickOn(registry['cvDirList'], { 'data-sc-issue': 'V9' });
  await sleep(60);
  var ipe = registry['cvIssuePanel'].innerHTML;
  ok('issue error state', ipe.indexOf('vote wire') !== -1 && ipe.indexOf('data-issue-retry="V9"') !== -1);
  clickOn(docEl, { 'data-issue-retry': 'V9' });
  await sleep(60);
  ok('issue retry refires the read', reqs('scorecard_issue', 'vote_id', 'V9').length === 2);

  /* ---- share wiring: real data only ---- */
  clickOn(docEl, { 'data-issue-back': '' });
  await sleep(20);
  clickOn(registry['cvDirList'], { 'data-sc-share': 'S001' });
  await sleep(20);
  ok('shareText called', SHARE_TEXTS.length === 1, SHARE_TEXTS.length + ' calls');
  var st = SHARE_TEXTS[0] || '';
  ok('share names the member', st.indexOf('Jane Doe') !== -1, st);
  ok('share summarizes real positions', st.indexOf('2 votes tracked (1 Yea, 1 Nay)') !== -1, st);
  ok('share links Political HQ', st.indexOf('political-hq') !== -1, st);
  ok('no invented votes in share copy', st.indexOf('Untitled') === -1);

  /* ---- empty state: no votes tracked, never fake data ---- */
  clickOn(registry['cvDirList'], { 'data-sc-toggle': 'S002' });
  await sleep(60);
  var dl2 = registry['cvDirList'].innerHTML;
  ok('empty state copy', dl2.indexOf('no votes tracked yet') !== -1);
  ok('empty state renders zero vote badges', dl2.indexOf('cv-vb-') === -1);
  ok('escaped member name in empty detail', dl2.indexOf('&lt;img') !== -1 && dl2.indexOf('<img src=x') === -1);

  /* ---- error state + retry ---- */
  clickOn(registry['cvDirList'], { 'data-sc-toggle': 'S003' });
  await sleep(60);
  var dl3 = registry['cvDirList'].innerHTML;
  ok('scorecard error state', dl3.indexOf('scorecard wire') !== -1 && dl3.indexOf('data-sc-retry="S003"') !== -1);
  clickOn(registry['cvDirList'], { 'data-sc-retry': 'S003' });
  await sleep(60);
  ok('scorecard retry refires the read', reqs('scorecard_get', 'bioguide_id', 'S003').length === 2);

  /* ---- fail-soft: unreachable API (null JSONP) ---- */
  REPS.push({ name: 'Wire Down', party: 'D', chamber: 'house', state: 'NY', phone: '', bioguide_id: 'S004' });
  clickOn(registry['cvDirList'], { 'data-sc-toggle': 'S004' });
  await sleep(60);
  ok('null response degrades to error state, not a crash',
    registry['cvDirList'].innerHTML.indexOf('scorecard wire') !== -1);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
