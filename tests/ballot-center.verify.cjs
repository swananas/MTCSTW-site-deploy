#!/usr/bin/env node
/* tests/ballot-center.verify.cjs — smoke test for the Ballot Center pane
 * (Political HQ #4, added to v1.4.3/games/civic.js 2026-10-05).
 *
 * DOM-shim: extracts the civic.js inner <script>, executes it against a
 * fake DOM + a fake ballot_get JSONP backend, and asserts:
 *   1. state selector mounts exactly once with 51 options (50 states + DC)
 *      plus the placeholder
 *   2. countdown math: future deadline ("N days left"), today ("TODAY is
 *      the last day"), past ("Registration has closed"), NULL deadline
 *      ("Same-day registration available")
 *   3. register/polling-place/ballot-info links point at the official
 *      API-supplied URLs, open in a new tab, and the register button is
 *      labeled as the state's official site
 *   4. missing/NULL fields render "check your state site" + official link —
 *      never invented data; no "undefined"/"NaN" leaks
 *   5. backend failure renders an inline error + RETRY
 *   6. the pane mounts exactly once
 * Run: node tests/ballot-center.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- extract the inner <script> ---------- */
var sStart = src.indexOf('<script>');
/* The file closes the inner script as </scr`+`ipt> (template concat, so the
   staged HTML can't terminate early) — match that literal split. */
var sEnd = src.indexOf('</scr' + '`+`ipt>');
ok('inner script extractable', sStart !== -1 && sEnd !== -1 && sEnd > sStart);
var inner = src.slice(sStart + '<script>'.length, sEnd);

/* ---------- fake dates, relative to the real local today ---------- */
function isoPlus(days) {
  var d = new Date(); d.setHours(0, 0, 0, 0);
  d = new Date(d.getTime() + days * 86400000);
  var m = String(d.getMonth() + 1), dd = String(d.getDate());
  return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dd.length < 2 ? '0' + dd : dd);
}
var BALLOT_ROWS = [
  { state: 'TX', state_name: 'Texas', registration_deadline: isoPlus(12),
    early_voting_start: '2026-10-19', early_voting_end: '2026-10-30',
    election_day: '2026-11-03',
    polling_place_url: 'https://teamrv-mvp.sos.texas.gov/MVP/mvp.do',
    ballot_info_url: 'https://www.votetexas.gov/',
    register_url: 'https://www.votetexas.gov/register-to-vote/',
    notes: 'Mailed applications must be postmarked by the deadline.' },
  { state: 'CA', state_name: 'California', registration_deadline: isoPlus(-3),
    early_voting_start: null, early_voting_end: null, election_day: '2026-11-03',
    polling_place_url: 'https://www.sos.ca.gov/elections/polling-place',
    ballot_info_url: 'https://www.sos.ca.gov/elections/',
    register_url: 'https://registertovote.ca.gov/', notes: null },
  { state: 'CO', state_name: 'Colorado', registration_deadline: isoPlus(0),
    early_voting_start: '2026-10-19', early_voting_end: null, election_day: '2026-11-03',
    polling_place_url: 'https://www.sos.colorado.gov/', ballot_info_url: null,
    register_url: 'https://www.sos.colorado.gov/voter/pages/pub/home.xhtml', notes: null },
  { state: 'SD', state_name: 'South Dakota', registration_deadline: null,
    early_voting_start: null, early_voting_end: null, election_day: '2026-11-03',
    polling_place_url: 'https://vip.sdsos.gov/VIPViewer/',
    ballot_info_url: 'https://sdsos.gov/elections-voting/',
    register_url: 'https://sdsos.gov/elections-voting/voting/register-to-vote/',
    notes: 'Same-day registration at your polling place with proof of residence.' },
  { state: 'NV', state_name: 'Nevada', registration_deadline: isoPlus(7),
    early_voting_start: null, early_voting_end: null, election_day: '2026-11-03',
    polling_place_url: null, ballot_info_url: 'https://www.nvsos.gov/sos/elections',
    register_url: null, notes: null }
];

/* ---------- DOM shim ---------- */
function makeEl(id) {
  return {
    id: id || '', innerHTML: '', textContent: '', value: '', style: {},
    attrs: {}, parentNode: null, disabled: false,
    onclick: null, onchange: null, oninput: null,
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    addEventListener: function () {},
    appendChild: function (c) { c.parentNode = this; },
    removeChild: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}
function makeEnv(ballotPayload) {
  var registry = {};
  ['xCivic', 'cvBalState', 'cvBalBox', 'cvBalRetry', 'cvHistBox', 'cvVoterState',
   'cvDirState', 'cvDirList'].forEach(function (id) { registry[id] = makeEl(id); });
  var win = {
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    PFCallsign: function () { return 'TESTER'; },
    PFDeviceId: function () { return 'DEV1'; }
  };
  win.PF = {
    skip: function () { return false; },
    toast: function () {},
    errCopy: function (j, d) { return d; },
    gateHTML: function () { return ''; },
    holder: function () { return { insertAdjacentHTML: function () {} }; }
  };
  function fakeJSONP(action) {
    if (action === 'ballot_get') return ballotPayload;
    if (action === 'petition_list') return { ok: true, petitions: [] };
    if (action === 'rep_list') return { ok: true, reps: [] };
    if (action === 'rep_scripts') return { ok: true, scripts: [] };
    if (action === 'voter_pledge_stats') return { ok: true, total_pledges: 0, by_state: [] };
    if (action === 'rep_contact_history') return { ok: true, history: [] };
    return { ok: true };
  }
  var head = {
    appendChild: function (s) {
      s.parentNode = head;
      var u;
      try { u = new URL(s.src); } catch (e) { setTimeout(function () { s.onerror && s.onerror(); }, 5); return; }
      var action = u.searchParams.get('action');
      var fn = u.searchParams.get('callback');
      setTimeout(function () {
        try { if (win[fn]) win[fn](fakeJSONP(action)); } catch (e) {}
      }, 5);
    },
    removeChild: function () {}
  };
  var doc = {
    head: head,
    createElement: function () { return makeEl(''); },
    getElementById: function (id) { return registry[id] || null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    body: makeEl('body')
  };
  return { win: win, doc: doc, registry: registry };
}
function loadModule(env) {
  var fn = new Function('window', 'document', 'setTimeout', 'clearTimeout',
    'console', 'Math', 'JSON', 'Object', 'Array', 'Number', 'String',
    'Date', 'encodeURIComponent', inner);
  fn(env.win, env.doc, setTimeout, clearTimeout, console, Math, JSON,
    Object, Array, Number, String, Date, encodeURIComponent);
}
function count(str, sub) { return str.split(sub).length - 1; }
function select(code) {
  var st = env.registry.cvBalState;
  st.value = code;
  if (typeof st.onchange === 'function') st.onchange();
  return env.registry.cvBalBox.innerHTML;
}

/* ---------- run 1: healthy backend ---------- */
var env = makeEnv({ ok: true, rows: BALLOT_ROWS });
loadModule(env);

setTimeout(function () {
  var civicHTML = env.registry.xCivic.innerHTML;
  ok('civic rendered', civicHTML.indexOf('Ballot Center') !== -1);
  ok('pane mounts exactly once', count(civicHTML, 'id="cvBalState"') === 1, 'count=' + count(civicHTML, 'id="cvBalState"'));

  var selStart = civicHTML.indexOf('id="cvBalState"');
  var selHTML = civicHTML.slice(civicHTML.lastIndexOf('<select', selStart), civicHTML.indexOf('</select>', selStart));
  ok('selector has 51 state options + placeholder', count(selHTML, '<option') === 52, 'count=' + count(selHTML, '<option'));
  ok('DC present in selector', selHTML.indexOf('value="DC"') !== -1);

  var box0 = env.registry.cvBalBox.innerHTML;
  ok('pre-selection prompt', box0.indexOf('Pick your state') !== -1);

  /* TX: future deadline → countdown */
  var tx = select('TX');
  ok('TX countdown: 12 days left', tx.indexOf('12 days') !== -1 && tx.indexOf('to register in Texas') !== -1, tx.slice(0, 200));
  ok('TX register link → official URL, new tab',
    tx.indexOf('href="https://www.votetexas.gov/register-to-vote/"') !== -1 &&
    tx.indexOf('target="_blank"') !== -1 && tx.indexOf('rel="noopener"') !== -1);
  ok('TX register labeled official', tx.indexOf('official') !== -1);
  ok('TX early voting dates', tx.indexOf('Oct 19, 2026') !== -1 && tx.indexOf('Oct 30, 2026') !== -1);
  ok('TX election day', tx.indexOf('Nov 3, 2026') !== -1);
  ok('TX polling place link', tx.indexOf('href="https://teamrv-mvp.sos.texas.gov/MVP/mvp.do"') !== -1);
  ok('TX notes rendered', tx.indexOf('postmarked by the deadline') !== -1);

  /* CA: past deadline → plain closed copy */
  var ca = select('CA');
  ok('CA past deadline: closed copy', ca.indexOf('Registration has closed') !== -1 && ca.indexOf('California') !== -1);
  ok('CA no countdown numbers on closed deadline', ca.indexOf('days left') === -1);

  /* CO: deadline today */
  var co = select('CO');
  ok('CO today: last-day copy', co.indexOf('TODAY is the last day') !== -1 && co.indexOf('Colorado') !== -1);

  /* SD: NULL deadline → same-day */
  var sd = select('SD');
  ok('SD NULL deadline: same-day registration', sd.indexOf('Same-day registration available') !== -1 && sd.indexOf('South Dakota') !== -1);
  ok('SD notes rendered', sd.indexOf('proof of residence') !== -1);

  /* NV: missing register/polling/early URLs → "check your state site" */
  var nv = select('NV');
  ok('NV missing register_url: fallback copy', nv.indexOf('Registration link') !== -1 && nv.indexOf('check your state site') !== -1);
  ok('NV fallback links to official ballot_info_url',
    nv.indexOf('href="https://www.nvsos.gov/sos/elections"') !== -1);
  ok('NV missing early voting: fallback copy', nv.indexOf('Early voting dates') !== -1);
  ok('NV no REGISTER button without register_url', nv.indexOf('REGISTER TO VOTE') === -1);

  /* never invented: no undefined/NaN leaks anywhere in the pane */
  [tx, ca, co, sd, nv].forEach(function (h, i) {
    ok('no undefined/NaN leak [' + i + ']', h.indexOf('undefined') === -1 && h.indexOf('NaN') === -1);
  });

  /* no fake urgency: countdown appears only with a real future deadline */
  ok('countdown only on real future deadline',
    tx.indexOf('days left') !== -1 && ca.indexOf('days left') === -1 && sd.indexOf('days left') === -1);

  /* ---------- run 2: backend failure → inline error + RETRY ---------- */
  var env2 = makeEnv(null); /* ballot_get returns null → error path */
  loadModule(env2);
  setTimeout(function () {
    var box2 = env2.registry.cvBalBox.innerHTML;
    ok('backend failure: inline error', box2.indexOf('ballot wire') !== -1);
    ok('backend failure: RETRY button', box2.indexOf('id="cvBalRetry"') !== -1);
    ok('retry bound', typeof env2.registry.cvBalRetry.onclick === 'function');

    console.log(failures === 0 ? '\nALL BALLOT CENTER CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
    process.exit(failures === 0 ? 0 : 1);
  }, 150);
}, 150);
