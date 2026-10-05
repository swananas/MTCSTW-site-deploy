#!/usr/bin/env node
/* tests/pledge-card-trigger.verify.cjs — trigger wiring for the voter pledge
   share card (Political HQ weave #4, "Voter Pledge Cards").
   DOM-shim: extracts the civic.js inner <script>, executes it against a fake
   DOM + fake JSONP backend + the REAL share-image-phq.js module (for
   PF.PHQShare.pledgeData), and asserts:
     1. after a successful voter_pledge the pane calls ballot_get for the
        pledged state (deadline comes from ballot data, never invented)
     2. live deadline (TX) -> SHARE YOUR PLEDGE button arms; clicking it calls
        PF.PHQShare.share('phq-pledge', <card data>) with the real deadline,
        vote.gov link, and election day from the ballot row
     3. same-day state (CO, NULL deadline) -> armed with the sameday variant
     4. expired state (AK) -> button NOT armed; fail-soft "deadline passed"
        note renders instead of a card
     5. ballot_get failure -> pledge stands, button stays disarmed, no crash
     6. ?pf_off=card-pledge -> button stays disarmed
     7. civic.js introduces no new XP leg: no xpGrant, no new ledger prefix,
        no create_pledge: key
   All ballot rows come from tests/pledge-ballot-seed.cjs (the backend
   migration) — real dates only.
   Run: node tests/pledge-card-trigger.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var CIVIC = path.join(ROOT, 'v1.4.3', 'games', 'civic.js');
var PHQMOD = path.join(ROOT, 'v1.4.3', 'core', 'share-image-phq.js');
var SEED = require('./pledge-ballot-seed.cjs');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

var src = fs.readFileSync(CIVIC, 'utf8');
var sStart = src.indexOf('<script>');
var sEnd = src.indexOf('</scr' + '`+`ipt>');
ok('civic.js inner script extractable', sStart !== -1 && sEnd !== -1 && sEnd > sStart);
var inner = src.slice(sStart + '<script>'.length, sEnd);

/* ============ static wiring checks ============ */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
var code = stripComments(src);
ok('trigger: voter_pledge success calls ballot_get', /api\("ballot_get",\{state:/.test(code));
ok('trigger: card data built via PF.PHQShare.pledgeData', /PF\.PHQShare\.pledgeData\(/.test(code));
ok('trigger: share routes via PF.PHQShare.share("phq-pledge")', /PF\.PHQShare\.share\('phq-pledge'/.test(code));
ok('trigger: card-pledge kill switch checked before arming', /PF\.skip\(['"]card-pledge['"]\)/.test(code));
ok('trigger: fail-soft "deadline passed" note', /deadline passed/.test(src));
ok('trigger: old deadline-less pledgePoster removed', src.indexOf('function pledgePoster') === -1);
ok('no new XP leg: xpGrant absent from civic.js', code.indexOf('xpGrant') === -1);
ok('no new XP leg: no create_pledge: prefix', code.indexOf('create_pledge:') === -1);
ok('no new XP leg: pledge button copy still +50 (paid by voter_pledge)', /PLEDGE \(\+50 XP\)/.test(src));

/* ============ DOM shim ============ */
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

/* Run the REAL phq module once in a sandbox to get the real pledgeData. */
function realPHQShare() {
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.navigator = {};
  sb.localStorage = {
    getItem: function () { return null; },
    setItem: function () {}, removeItem: function () {}
  };
  sb.document = { createElement: function () { return {}; }, addEventListener: function () {} };
  sb.PF = { skip: function () { return false; }, toast: function () {} };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PFShare = { setPoster: function () {}, shareImage: function () {}, saveImage: function () {}, stampCallsign: function (cv) { return cv; } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(PHQMOD, 'utf8'), sb, { filename: 'share-image-phq.js' });
  return sb.PF.PHQShare;
}
var REAL_PLEDGE_DATA = realPHQShare().pledgeData;
ok('real PF.PHQShare.pledgeData loaded from share-image-phq.js', typeof REAL_PLEDGE_DATA === 'function');

function makeEnv(opts) {
  opts = opts || {};
  var registry = {};
  ['xCivic', 'cvVoterState', 'cvVoterRetry', 'cvPledge', 'cvPledgeShare', 'cvHistBox',
   'cvPetOpen', 'cvLogContact', 'cvRepSel', 'cvTopicSel', 'cvMyName', 'cvMyState',
   'cvScriptBox', 'cvPetTitle', 'cvPetTarget', 'cvPetDesc', 'cvPetGoal', 'cvPetErr'
  ].forEach(function (id) { registry[id] = makeEl(id); });
  var toasts = [], shareCalls = [], ballotCalls = [];
  var killCard = !!opts.killCardPledge;
  var ballotMode = opts.ballotMode || 'ok'; /* ok | fail | expired | sameday */
  var win = {
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    PFCallsign: function () { return 'WARHAWK'; },
    PFDeviceId: function () { return 'DEV1'; }
  };
  win.PF = {
    skip: function (silo) {
      if (silo === 'card-pledge') return killCard;
      return false;
    },
    toast: function (m) { toasts.push(String(m)); },
    errCopy: function (j, d) { return d; },
    gateHTML: function () { return ''; },
    holder: function () { return { insertAdjacentHTML: function () {} }; },
    authPost: function (url, body, cb) {
      /* voter_pledge POST — the existing action, not duplicated. */
      setTimeout(function () {
        if (body && body.r_action === 'voter_pledge') cb({ ok: true, balance: 150 });
        else cb({ ok: true });
      }, 5);
    },
    PHQShare: {
      pledgeData: REAL_PLEDGE_DATA,
      share: function (id, data, o) { shareCalls.push({ id: id, data: data, opts: o }); return true; },
      save: function () { return true; },
      paint: function () { return null; }
    }
  };
  function ballotRowFor() {
    if (ballotMode === 'fail') return null;
    if (ballotMode === 'expired') return SEED.ballotRow('AK');
    if (ballotMode === 'sameday') return SEED.ballotRow('CO');
    return SEED.ballotRow('TX');
  }
  function fakeJSONP(action, params) {
    if (action === 'ballot_get') {
      ballotCalls.push(params.state || params);
      var row = ballotRowFor();
      return row ? { ok: true, ballot: row } : null;
    }
    if (action === 'voter_check')
      return { ok: true, state: params.state, url: 'https://www.vote.gov/register/' + String(params.state || '').toLowerCase() + '/', note: 'Official registration via vote.gov.' };
    if (action === 'petition_list') return { ok: true, petitions: [] };
    if (action === 'rep_list') return { ok: true, reps: [] };
    if (action === 'rep_scripts') return { ok: true, scripts: [] };
    if (action === 'voter_pledge_stats') return { ok: true, total_pledges: 3, by_state: [] };
    if (action === 'rep_contact_history') return { ok: true, history: [] };
    return { ok: true };
  }
  var head = {
    appendChild: function (s) {
      s.parentNode = head;
      var u;
      try { u = new URL(s.src); } catch (e) { setTimeout(function () { s.onerror && s.onerror(); }, 5); return; }
      var action = u.searchParams.get('action');
      var params = {};
      u.searchParams.forEach(function (v, k) { params[k] = v; });
      var fn = u.searchParams.get('callback');
      setTimeout(function () { try { if (win[fn]) win[fn](fakeJSONP(action, params)); } catch (e) {} }, 5);
    },
    removeChild: function () {}
  };
  var doc = {
    head: head,
    createElement: function () { return makeEl(''); },
    getElementById: function (id) {
      if (!registry[id]) registry[id] = makeEl(id);
      return registry[id];
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    body: makeEl('body')
  };
  return { win: win, doc: doc, registry: registry, toasts: toasts, shareCalls: shareCalls, ballotCalls: ballotCalls };
}

function loadModule(env) {
  /* The outer civic.js wrapper defines `var PF = window.PF;` — the inner
     script uses bare PF, so declare it here the same way. */
  var body = 'var PF = window.PF;\n' + inner;
  var fn = new Function('window', 'document', 'setTimeout', 'clearTimeout',
    'console', 'Math', 'JSON', 'Object', 'Array', 'Number', 'String',
    'Date', 'encodeURIComponent', body);
  fn(env.win, env.doc, setTimeout, clearTimeout, console, Math, JSON,
    Object, Array, Number, String, Date, encodeURIComponent);
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* Drive the full pledge flow: pick state -> voter_check -> PLEDGE -> ballot_get. */
async function pledgeFlow(env, code) {
  loadModule(env);
  await sleep(60); /* load() JSONP round-trips + initial render */
  var st = env.registry.cvVoterState;
  st.value = code;
  if (typeof st.onchange === 'function') st.onchange();
  await sleep(60); /* voter_check round-trip + re-render */
  var pl = env.registry.cvPledge;
  ok('flow[' + code + ']: PLEDGE button bound after voter_check', typeof pl.onclick === 'function');
  if (typeof pl.onclick !== 'function') return false;
  pl.onclick();
  await sleep(80); /* voter_pledge POST + ballot_get round-trip + re-render */
  return true;
}

async function main() {
  /* --- 1. TX: live deadline -> button arms, share carries real ballot data --- */
  var env = makeEnv({ ballotMode: 'ok' });
  if (await pledgeFlow(env, 'TX')) {
    var html = env.registry.xCivic.innerHTML;
    ok('TX: ballot_get called for the pledged state', env.ballotCalls.indexOf('TX') !== -1,
      'calls=' + JSON.stringify(env.ballotCalls));
    ok('TX: SHARE YOUR PLEDGE armed on a live deadline', html.indexOf('SHARE YOUR PLEDGE') !== -1);
    var pls = env.registry.cvPledgeShare;
    ok('TX: share button bound', typeof pls.onclick === 'function');
    pls.onclick();
    await sleep(30);
    ok('TX: share routed once via PF.PHQShare.share', env.shareCalls.length === 1,
      'n=' + env.shareCalls.length);
    if (env.shareCalls.length === 1) {
      var c = env.shareCalls[0];
      ok('TX: share id is phq-pledge', c.id === 'phq-pledge', 'id=' + c.id);
      ok('TX: card data carries the real TX deadline (traceable)', c.data && c.data.deadline === '2026-10-05',
        'deadline=' + (c.data && c.data.deadline));
      ok('TX: card data carries the vote.gov register URL', c.data && c.data.registerUrl === 'https://www.vote.gov/register/tx/',
        'url=' + (c.data && c.data.registerUrl));
      ok('TX: card data carries election day 2026-11-03', c.data && c.data.electionDay === '2026-11-03');
      ok('TX: card data carries the state name', c.data && c.data.stateName === 'Texas');
      ok('TX: share link rides the political-hq deep link', c.opts && c.opts.link === 'https://www.mtcstw.com/political-hq');
    }
    ok('TX: no "deadline passed" note on a live deadline', html.indexOf('deadline passed') === -1);
  }

  /* --- 2. CO: same-day (NULL deadline) -> armed with the sameday variant --- */
  var env2 = makeEnv({ ballotMode: 'sameday' });
  if (await pledgeFlow(env2, 'CO')) {
    var html2 = env2.registry.xCivic.innerHTML;
    ok('CO: SHARE YOUR PLEDGE armed for a same-day state', html2.indexOf('SHARE YOUR PLEDGE') !== -1);
    env2.registry.cvPledgeShare.onclick();
    await sleep(30);
    var c2 = env2.shareCalls[0];
    ok('CO: card data uses the sameday variant (no fake urgency)', c2 && c2.data && c2.data.daysLeft === 'sameday' && c2.data.deadline === null,
      JSON.stringify(c2 && c2.data && { daysLeft: c2.data.daysLeft, deadline: c2.data.deadline }));
  }

  /* --- 3. AK: expired -> no card, fail-soft "deadline passed" note --- */
  var env3 = makeEnv({ ballotMode: 'expired' });
  if (await pledgeFlow(env3, 'AK')) {
    var html3 = env3.registry.xCivic.innerHTML;
    ok('AK: SHARE YOUR PLEDGE NOT armed on an expired deadline', html3.indexOf('SHARE YOUR PLEDGE') === -1);
    ok('AK: fail-soft "deadline passed" note rendered', html3.indexOf('deadline passed') !== -1);
    ok('AK: no share call possible (button absent)', env3.shareCalls.length === 0);
    ok('AK: pledge itself still succeeded (+50 XP toast)', env3.toasts.some(function (t) { return /Pledged/.test(t); }),
      'toasts=' + JSON.stringify(env3.toasts));
  }

  /* --- 4. ballot wire down -> pledge stands, button disarmed, no crash --- */
  var env4 = makeEnv({ ballotMode: 'fail' });
  if (await pledgeFlow(env4, 'TX')) {
    var html4 = env4.registry.xCivic.innerHTML;
    ok('wire-down: no card without ballot data (nothing invented)', html4.indexOf('SHARE YOUR PLEDGE') === -1);
    ok('wire-down: pledge toast still fired', env4.toasts.some(function (t) { return /Pledged/.test(t); }));
  }

  /* --- 5. kill switch ?pf_off=card-pledge -> button disarmed --- */
  var env5 = makeEnv({ ballotMode: 'ok', killCardPledge: true });
  if (await pledgeFlow(env5, 'TX')) {
    ok('kill switch: SHARE YOUR PLEDGE disarmed', env5.registry.xCivic.innerHTML.indexOf('SHARE YOUR PLEDGE') === -1);
  }

  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  if (failures) process.exit(1);
  console.log('ALL GREEN');
}

main().catch(function (e) { console.error('HARNESS ERROR: ' + (e && e.stack || e)); process.exit(1); });
