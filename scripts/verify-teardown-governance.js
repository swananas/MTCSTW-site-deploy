#!/usr/bin/env node
/* scripts/verify-teardown-governance.js — WS-11 GOVERNANCE / REFERENDUM teardown
   verification (section teardown PART 2 §11 + CEO DECISION 4 tiered ceremony,
   CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-governance.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the governance source + this harness.
   2. Tiered ceremony: full-tier proposal -> full-ceremony card (FULL
      REFERENDUM, pro/con at a glance, stakes, countdown, shielded, big
      YES/NO/ABSTAIN); routine proposal -> lightweight inline ballot;
      server `tier` field wins; keyword heuristic as interim fallback.
   3. Shielded ballots: open proposals render NO tallies (no yes/no weights,
      no voter counts); shielded notice present.
   4. Quorum display bucketed: band labels only, never exact pre-close counts.
   5. NO client-side vote-weight computation (source scan): no sqrt/floor
      weight formula, no purchase/tier weight math, no component breakdowns.
   6. Callsign-gated voting: no callsign -> PF.gateHTML gate, no ballot.
   7. Guided first-vote micro-flow: 3 steps for new voters; dismissed via
      device-local flag; suppressed once voted.
   8. CTA-verb lint clean: no donate/enlist/call-it/confirm-pill rogue verbs;
      cast action rides REPORT BACK ->; no JOIN THE FIGHT. reuse.
   9. Kill switches: ?pf_off=gov -> silent no-op (no template staged);
      patterns killed -> legacy fail-open render (still shielded).
   10. Countdown rising urgency: <6h -> gv-urg-3 FINAL HOURS; <24h -> gv-urg-2.
   11. Election night: closed proposals -> outcome declared, margin, turnout,
      published outcome statement, P6 action bar (share/cell/report).
   12. Create + delegation mechanics preserved (100 XP cost, delegate set).
   13. Red-button rule: only the DEPLOY-family create button may be red;
      cast targets are report-family, non-red.
   14. Zero new XP mechanics, zero backend writes: no xpGrant-family calls;
      backend actions limited to the pre-existing set.
   15. Inner-script gate: scripts/check-inner-scripts.js passes.
   16. Bundle verification: rebuilt bundle-hq-deep.js carries the teardown
      markers and none of the removed weight formula. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var GOV_SRC = path.join(ROOT, 'v1.4.3', 'games', 'governance.js');
var PATTERNS_MOD = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE_HQ_DEEP = path.join(ROOT, 'v1.4.3', 'games', 'bundle-hq-deep.js');
var INNER_GATE = path.join(ROOT, 'scripts', 'check-inner-scripts.js');

var passes = 0, failures = [];
function ok(m) { passes++; }
function bad(section, m) { failures.push('[' + section + '] ' + m); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* Strip block comments + full-line // comments only (never touch strings).
   AGENTS.md lesson: naive quote-stripping is regex-literal-blind. */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n');
}

/* ================= 1. syntax ================= */
console.log('[1] syntax');
(function () {
  var files = [GOV_SRC, __filename], badn = [];
  files.forEach(function (f) {
    try { cp.execSync(process.execPath + ' --check ' + f, { stdio: 'pipe' }); }
    catch (e) { badn.push(f); }
  });
  if (!badn.length) ok('node --check clean');
  else bad('syntax', 'node --check failed: ' + badn.join(', '));
})();

var govSrc = read(GOV_SRC);
var govCode = codeOnly(govSrc);

/* ================= vm scaffolding =================
   Phase 1: run the OUTER file with a stub PF.holder() that captures the
   staged template HTML (this exercises the real outer-template-literal
   escape processing). Phase 2: extract the inner <script> and run it with
   full DOM stubs + the real 33-patterns library + a fixture. */
function makeStore() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; },
    _dump: function () { return s; }
  };
}
function stageTemplate(skipGov) {
  var captured = { html: '' };
  var sb1 = {
    window: {},
    document: {},
    localStorage: makeStore(),
    sessionStorage: makeStore(),
    setInterval: function () { return 0; },
    setTimeout: function () { return 0; }
  };
  sb1.window.PF = {
    skip: function (id) { return skipGov && id === 'governance'; },
    holder: function () {
      return { insertAdjacentHTML: function (pos, html) { captured.html = String(html); } };
    }
  };
  sb1.window.window = sb1.window;
  vm.createContext(sb1);
  vm.runInContext(govSrc, sb1, { filename: 'governance-outer.js' });
  return captured.html;
}
function runInner(opts) {
  opts = opts || {};
  var tpl = stageTemplate(false);
  var m = tpl.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('no inner <script> captured from template');
  var innerSrc = m[1];
  var store = opts.store || makeStore();
  var host = {
    _h: '',
    set innerHTML(v) { this._h = String(v); },
    get innerHTML() { return this._h; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
  var styleEl = null;
  var sb = {
    window: {},
    document: {
      getElementById: function (id) {
        if (id === 'xGov') return host;
        if (id === 'pf-gov-css') return styleEl;
        return null;
      },
      createElement: function (tag) {
        if (tag === 'style') { styleEl = { _t: '', set textContent(v) { this._t = String(v); }, get textContent() { return this._t || ''; }, id: '' }; return styleEl; }
        return { setAttribute: function () {}, getAttribute: function () { return null; }, addEventListener: function () {}, style: {} };
      },
      head: { appendChild: function () {} },
      documentElement: { appendChild: function () {} },
      addEventListener: function () {},
      activeElement: null
    },
    localStorage: store,
    sessionStorage: makeStore(),
    location: { href: 'https://mtcstw.com/governance' },
    setInterval: function () { return 0; },
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    confirm: function () { return false; }
  };
  sb.window.PF = {
    BACKEND_URL: '',
    skip: function (id) { return opts.patternsKilled && id === 'patterns'; },
    toast: function () {},
    hidden: function () { return false; },
    gateHTML: function (msg) { return '<div class="c-gate">' + msg + '</div>'; },
    govFixture: opts.fixture || null
  };
  sb.window.PFCallsign = function () { return opts.callsign || ''; };
  sb.window.PFDeviceId = function () { return 'test-device'; };
  sb.window.PF_BACKEND_URL = '';
  /* browsers alias window.* onto the global: the silo reads window.localStorage */
  sb.window.localStorage = store;
  sb.window.sessionStorage = sb.sessionStorage;
  sb.window.window = sb.window;
  /* browsers alias window.* onto the global scope: bare `PF` must resolve. */
  sb.PF = sb.window.PF;
  sb.PFCallsign = sb.window.PFCallsign;
  sb.PFDeviceId = sb.window.PFDeviceId;
  vm.createContext(sb);
  if (!opts.patternsKilled) {
    vm.runInContext(read(PATTERNS_MOD), sb, { filename: '33-patterns.js' });
  }
  vm.runInContext(innerSrc, sb, { filename: 'governance-inner.js' });
  return { html: host._h, css: styleEl ? styleEl.textContent : '', store: store };
}

var NOW = Date.now();
function prop(o) {
  var base = { id: 'px', title: 'Untitled', description: '', proposer: 'someone',
    closes_at: NOW + 2 * 864e5, status: 'open', voted: false,
    yes_weight: 0, no_weight: 0, voter_count: 0, result: null };
  for (var k in o) base[k] = o[k];
  return base;
}
var FIXTURE = {
  proposals: [
    prop({ id: 'p1', title: 'Amend the charter: war chest oversight', description: 'The Assembly should elect its own auditors.',
      closes_at: NOW + 3 * 864e5, voter_count: 150, yes_weight: 999, no_weight: 888 }),
    prop({ id: 'p2', title: 'Pick the Friday movie', description: 'Routine programming note.',
      closes_at: NOW + 3 * 3600e3, voter_count: 12, yes_weight: 777, no_weight: 666 }),
    prop({ id: 'p3', title: 'Banner run budget', status: 'closed', result: 'passed',
      yes_weight: 240, no_weight: 60, voter_count: 88 }),
    prop({ id: 'p4', title: 'Routine thing', tier: 'constitutional', description: 'Server-tier wins.',
      closes_at: NOW + 5 * 864e5, voter_count: 40 })
  ],
  xp: 900
};

/* ================= 2. tiered ceremony ================= */
console.log('[2] tiered ceremony');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  function has(id, cls) { return h.indexOf('id="gv-prop-' + id + '"') !== -1 && h.indexOf(cls) !== -1; }
  if (h.indexOf('id="gv-prop-p1"') !== -1 && h.indexOf('gv-full') !== -1 && h.indexOf('FULL REFERENDUM') !== -1) ok('full-tier proposal renders full-ceremony card');
  else bad('tiered ceremony', 'p1 (charter/war-chest keywords) did not render a gv-full FULL REFERENDUM card');
  if (h.indexOf('id="gv-prop-p2"') !== -1 && h.indexOf('gv-inline') !== -1 && h.indexOf('LIGHTWEIGHT BALLOT') !== -1) ok('routine proposal renders lightweight inline ballot');
  else bad('tiered ceremony', 'p2 (routine) did not render a gv-inline LIGHTWEIGHT BALLOT row');
  if (h.indexOf('id="gv-prop-p4"') !== -1) {
    var i4 = h.indexOf('id="gv-prop-p4"');
    var seg = h.slice(Math.max(0, i4 - 400), i4 + 400);
    if (seg.indexOf('gv-full') !== -1 || h.slice(0, i4).lastIndexOf('gv-full') > h.slice(0, i4).lastIndexOf('gv-inline')) ok('server tier field wins over heuristic');
    else bad('tiered ceremony', 'p4 (tier=constitutional) did not render full ceremony');
  } else bad('tiered ceremony', 'p4 missing from render');
  if (h.indexOf('THE PROPOSER\u2019S CASE') !== -1 && h.indexOf('THE KEY QUESTION') !== -1) ok('pro/con at a glance present');
  else bad('tiered ceremony', 'pro/con at-a-glance blocks missing');
  if (h.indexOf('server-set weight') !== -1) ok('personalized stakes line present');
  else bad('tiered ceremony', 'personalized stakes (server-set weight) line missing');
  if (h.indexOf('REPORT YES \u2192') !== -1 && h.indexOf('REPORT NO \u2192') !== -1) ok('big YES/NO cast targets present');
  else bad('tiered ceremony', 'YES/NO cast targets missing');
  /* ABSTAIN is backend-gated (proposal_vote accepts only yes/no today):
     the button must be present exactly when ABSTAIN_SUPPORTED is true. */
  var abstFlag = /var ABSTAIN_SUPPORTED\s*=\s*true/.test(govCode);
  var abstBtn = h.indexOf('data-ch="abstain"') !== -1;
  if (abstBtn === abstFlag) ok('ABSTAIN target matches backend support flag (' + (abstFlag ? 'on' : 'off — backend rejects abstain today') + ')');
  else bad('tiered ceremony', 'ABSTAIN button/flag mismatch');
})();

/* ================= 3. shielded ballots ================= */
console.log('[3] shielded ballots');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  var leaks = [];
  ['999', '888', '777', '666'].forEach(function (n) {
    if (h.indexOf(n) !== -1) leaks.push(n);
  });
  if (!leaks.length) ok('open-proposal tallies sealed (no yes/no weights leak)');
  else bad('shielded ballots', 'open tally numbers leaked into HTML: ' + leaks.join(', '));
  if (h.indexOf('150') === -1) ok('open voter counts hidden');
  else bad('shielded ballots', 'open voter_count 150 leaked into HTML');
  if (h.indexOf('BALLOT SHIELDED') !== -1) ok('shielded notice rendered');
  else bad('shielded ballots', 'BALLOT SHIELDED notice missing');
  /* post-close figures ARE published (the vote is over) */
  if (h.indexOf('240') !== -1 && h.indexOf('60') !== -1) ok('closed tallies publish post-close');
  else bad('shielded ballots', 'closed-proposal tallies missing from results');
})();

/* ================= 4. quorum bucketed ================= */
console.log('[4] quorum bucketed');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  if (h.indexOf('QUORUM: STRONG') !== -1 && h.indexOf('QUORUM: BUILDING') !== -1) ok('quorum band labels render');
  else bad('quorum bucketed', 'quorum band labels missing');
  if (h.indexOf('12 voters') === -1 && h.indexOf('>12<') === -1) ok('no exact pre-close counts');
  else bad('quorum bucketed', 'exact pre-close voter count rendered');
})();

/* ================= 5. no client-side weight computation ================= */
console.log('[5] no client-side weight computation');
(function () {
  var fails = [];
  if (/Math\.sqrt/.test(govCode)) fails.push('Math.sqrt present (old weight formula)');
  if (/1\s*\+\s*Math\.floor/.test(govCode)) fails.push('1+Math.floor weight formula present');
  if (/purchase/i.test(govCode)) fails.push('"purchase" appears in governance code');
  if (/\bweight\s*=\s*[^;]*\b(xp|balance|tier|purchase)\b/i.test(govCode)) fails.push('weight derived from xp/balance/tier/purchase');
  if (/voteWeight\s*=\s*function|function\s+voteWeight/.test(govCode)) fails.push('client voteWeight function defined');
  if (!fails.length) ok('no client-side weight computation (source scan)');
  else bad('weight computation', fails.join('; '));
  if (/Vote weight is SERVER-SIDE ONLY/.test(govSrc)) ok('security gate documented in source');
  else bad('weight computation', 'server-side-only security gate not documented');
})();

/* ================= 6. callsign gate ================= */
console.log('[6] callsign gate');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: '' });
  if (r.html.indexOf('c-gate') !== -1) ok('no callsign -> gate renders');
  else bad('callsign gate', 'gate missing for callsign-less visitor');
  if (r.html.indexOf('gv-full') === -1 && r.html.indexOf('gv-cast') === -1) ok('no ballot rendered without callsign');
  else bad('callsign gate', 'ballot/cast targets rendered without callsign');
})();

/* ================= 7. first-vote micro-flow ================= */
console.log('[7] first-vote micro-flow');
(function () {
  var r1 = runInner({ fixture: FIXTURE, callsign: 'fresh' });
  if (r1.html.indexOf('gv-firstvote') !== -1 && r1.html.indexOf('YOUR FIRST VOTE') !== -1) ok('new voter gets guided micro-flow');
  else bad('first-vote flow', 'gv-firstvote missing for new voter');
  var steps = (r1.html.match(/gv-step-n/g) || []).length;
  if (steps >= 3) ok('micro-flow has 3 steps');
  else bad('first-vote flow', 'expected 3 steps, found ' + steps);
  var store = makeStore(); store.setItem('pf_gov_firstvote_v1', '1');
  var r2 = runInner({ fixture: FIXTURE, callsign: 'fresh', store: store });
  if (r2.html.indexOf('gv-firstvote') === -1) ok('dismissed flow stays dismissed (device-local)');
  else bad('first-vote flow', 'flow reappears after dismiss flag set');
  var votedFix = JSON.parse(JSON.stringify(FIXTURE));
  votedFix.proposals[0].voted = true;
  var r3 = runInner({ fixture: votedFix, callsign: 'veteran' });
  if (r3.html.indexOf('gv-firstvote') === -1) ok('flow suppressed once voted');
  else bad('first-vote flow', 'flow shown to an existing voter');
})();

/* ================= 8. CTA-verb lint ================= */
console.log('[8] CTA-verb lint');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  var texts = [];
  var re = /<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi, m;
  while ((m = re.exec(h))) texts.push(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  var joined = texts.join(' | ');
  var banned = [
    [/donate/i, '"donate" in CTA copy'],
    [/enlist\s*(\u2192|->)/i, '"ENLIST ->" as a card CTA'],
    [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as a card CTA'],
    [/hold\s*equity/i, '"HOLD EQUITY" in CTA copy'],
    [/follow their money/i, '"FOLLOW THEIR MONEY" as a button']
  ];
  var hit = false;
  banned.forEach(function (b) {
    if (b[0].test(joined)) { bad('CTA-verb lint', 'rogue verb in rendered CTAs: ' + b[1]); hit = true; }
  });
  if (!hit) ok('CTA-verb lint clean on rendered CTAs');
  if (/JOIN THE FIGHT/.test(joined)) bad('CTA-verb lint', 'JOIN THE FIGHT. reused outside enlistment');
  else ok('JOIN THE FIGHT. not reused');
  if (/confirm/i.test(joined)) bad('CTA-verb lint', '"CONFIRM" pill CTA present');
  else ok('no CONFIRM pill CTA');
})();

/* ================= 9. kill switches ================= */
console.log('[9] kill switches');
(function () {
  var tpl = stageTemplate(true);
  if (tpl === '') ok('?pf_off=gov -> silent no-op (no template staged)');
  else bad('kill switch', '?pf_off=gov still staged a template');
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier', patternsKilled: true });
  if (r.html.indexOf('pf-pat-hero') === -1 && r.html.indexOf('BALLOT SHIELDED') === -1) {
    if (r.html.indexOf('gv-inline') !== -1) ok('patterns killed -> legacy fail-open render');
    else bad('kill switch', 'legacy render missing');
  } else bad('kill switch', 'pattern classes rendered with patterns killed');
  var r2 = runInner({ fixture: FIXTURE, callsign: 'testsoldier', patternsKilled: true });
  if (r2.html.indexOf('999') === -1) ok('legacy render still shielded');
  else bad('kill switch', 'legacy render leaks tallies');
})();

/* ================= 10. countdown urgency ================= */
console.log('[10] countdown urgency');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  var i2 = h.indexOf('id="gv-prop-p2"');
  var seg2 = h.slice(Math.max(0, i2 - 600), i2 + 200);
  if (seg2.indexOf('gv-urg-3') !== -1 && /FINAL HOURS/.test(h)) ok('<6h proposal gets pulsing FINAL HOURS urgency');
  else bad('urgency', 'p2 (3h left) missing gv-urg-3 / FINAL HOURS');
  var i1 = h.indexOf('id="gv-prop-p1"');
  var seg1 = h.slice(Math.max(0, i1 - 600), i1 + 200);
  if (seg1.indexOf('gv-urg-1') !== -1) ok('3-day proposal stays at base urgency');
  else bad('urgency', 'p1 (3d left) not at gv-urg-1');
})();

/* ================= 11. election night ================= */
console.log('[11] election night');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  var checks = [
    ['THE ASSEMBLY HAS SPOKEN', 'outcome declared'],
    ['PASSED', 'result badge'],
    ['the Assembly adopts', 'published outcome statement'],
    ['Margin', 'margin ledger'],
    ['soldiers voted', 'turnout line'],
    ['SHARE THIS INTEL', 'P6 share handoff'],
    ['TAKE THIS TO YOUR CELL', 'P6 cell handoff'],
    ['REPORT BACK', 'P6 report handoff']
  ];
  checks.forEach(function (c) {
    if (h.indexOf(c[0]) !== -1) ok('results: ' + c[1]);
    else bad('election night', c[1] + ' missing');
  });
})();

/* ================= 12. create + delegation preserved ================= */
console.log('[12] create + delegation');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var h = r.html;
  if (h.indexOf('gvTitle') !== -1 && h.indexOf('PUT IT TO A VOTE \u2192') !== -1 && h.indexOf('100 XP') !== -1) ok('proposal creation preserved (100 XP cost)');
  else bad('create', 'new-proposal pane missing or cost changed');
  if (h.indexOf('gvDel') !== -1 && h.indexOf('DELEGATE MY VOTE \u2192') !== -1) ok('liquid delegation preserved');
  else bad('delegation', 'delegation pane missing');
})();

/* ================= 13. red-button rule ================= */
console.log('[13] red-button rule');
(function () {
  var r = runInner({ fixture: FIXTURE, callsign: 'testsoldier' });
  var css = r.css;
  function bgRed(selector) {
    var re = new RegExp(selector.replace(/\./g, '\\.') + '\\{[^}]*\\}', 'g'), m, hit = false;
    while ((m = re.exec(css))) { if (/background\s*:\s*#c1121f/i.test(m[0])) hit = true; }
    return hit;
  }
  if (bgRed('.gv-cast')) bad('red-button rule', '.gv-cast (vote targets) carry a red background');
  else ok('cast targets are non-red (report-family)');
  if (bgRed('.gv-btn-red')) ok('only the DEPLOY-family create button is red');
  else bad('red-button rule', '.gv-btn-red missing its red background');
})();

/* ================= 14. zero XP / zero backend writes ================= */
console.log('[14] zero new XP, zero backend writes');
(function () {
  var xpHits = ['xpGrant', 'grantXP', 'awardXP', 'mintXP'].filter(function (w) { return govCode.indexOf(w) !== -1; });
  if (!xpHits.length) ok('no XP-granting calls');
  else bad('zero XP', 'XP mechanics found: ' + xpHits.join(', '));
  var actions = {}, re = /(?:g_action|action)\s*:\s*"([^"]+)"/g, m;
  while ((m = re.exec(govCode))) actions[m[1]] = true;
  var allowed = { proposal_list: 1, delegation_get: 1, xp_balance: 1, proposal_vote: 1, proposal_create: 1, delegate_set: 1, proposal_close: 1 };
  var extra = Object.keys(actions).filter(function (a) { return !allowed[a]; });
  if (!extra.length) ok('backend actions limited to the pre-existing set');
  else bad('backend writes', 'new backend actions: ' + extra.join(', '));
})();

/* ================= 15. inner-script gate ================= */
console.log('[15] inner-script gate');
(function () {
  try {
    cp.execSync(process.execPath + ' ' + INNER_GATE + ' ' + GOV_SRC, { stdio: 'pipe' });
    ok('check-inner-scripts.js passes');
  } catch (e) { bad('inner-script gate', 'check-inner-scripts.js failed'); }
})();

/* ================= 16. bundle verification ================= */
console.log('[16] bundle verification');
(function () {
  if (!fs.existsSync(BUNDLE_HQ_DEEP)) { bad('bundle', 'bundle-hq-deep.js missing — run node build/bundle.js'); return; }
  var b = read(BUNDLE_HQ_DEEP);
  var markers = ['gv-full', 'REPORT YES', 'BALLOT SHIELDED', 'THE ASSEMBLY HAS SPOKEN', 'gv-firstvote'];
  var missing = markers.filter(function (mk) { return b.indexOf(mk) === -1; });
  if (!missing.length) ok('bundle-hq-deep.js carries the teardown markers');
  else bad('bundle', 'markers missing from bundle-hq-deep.js: ' + missing.join(', '));
  if (/Math\.floor\(Math\.sqrt/.test(b)) bad('bundle', 'old client weight formula still in bundle');
  else ok('old weight formula absent from bundle');
  try { cp.execSync(process.execPath + ' --check ' + BUNDLE_HQ_DEEP, { stdio: 'pipe' }); ok('bundle node --check clean'); }
  catch (e) { bad('bundle', 'bundle-hq-deep.js failed node --check'); }
})();

/* ================= summary ================= */
console.log('\n' + passes + ' passed, ' + failures.length + ' failed.');
if (failures.length) {
  failures.forEach(function (f) { console.log('FAIL ' + f); });
  process.exit(1);
}
console.log('TEARDOWN-GOVERNANCE GREEN');
