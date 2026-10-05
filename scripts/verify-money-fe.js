#!/usr/bin/env node
/* scripts/verify-money-fe.js — Follow the Money frontend verification.
   Run from the repo root:
     node scripts/verify-money-fe.js
   1. node --check on the new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switches, painter registration (IDS/TITLES/PAINT), esc() on every
      injected field, no auto-mount, existing share flow reused, no XP code,
      copy-rule compliance (header copy, methodology caption verbatim, no
      banned causation phrases), empty-state copy, source footer, banned
      terms, bundle registration
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      the phq-money painter renders its spec copy on fixture data, prefers
      donors and falls back to industries, stamps the callsign, degrades
      with no callsign and on sparse data; PFMoneyTab.mount() renders the
      money tab on a good endpoint response (totals, split bar, donors,
      industry badge, source footer), wires DOWNLOAD/SHARE through the
      EXISTING PF.PHQShare flow, honors the kill switch, and fails soft;
      PFMoneyVote.mount() renders the vote-vs-donor card (header copy, per-row
      "received $X from" copy, methodology caption, money:null vote-only
      rows), honors the kill switch, and fails soft.
   4. Real-BE integration: tests/fixtures/fixture-money_*.json — byte output
      of the LOCKED backend's repDispatch (be/follow-the-money @ dd9cab9,
      captured by running the BE test harness) — is fed through
      PFMoneyTab.mount / PFMoneyVote.mount. The real contract
      (member/totals.{raised,spent,cash}/retrieved_at/industries[].total/
      small_dollar_pct/large_dollar_pct, cards[]/position/copy) renders —
      the empty states must NOT fire on real data.
   Fixture figures are synthetic paint-test values, not asserted facts;
   section 4 fixtures are real repDispatch output (members are the BE test's
   seeded congress rows).
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var MT_MOD = path.join(V, 'core', 'money-tab.js');
var MV_MOD = path.join(V, 'core', 'money-vote-card.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function expectedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ============ 0. rebuild bundles (bundle-pages carries the modules) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[PAINTER_MOD, MT_MOD, MV_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var psrc = read(PAINTER_MOD), mtsrc = read(MT_MOD), mvsrc = read(MV_MOD);
var pcode = stripComments(psrc), mtcode = stripComments(mtsrc), mvcode = stripComments(mvsrc);

console.log('== 2. static contract checks ==');
/* painter registration */
if (pcode.indexOf("'phq-money'") !== -1 &&
    /var IDS = \[[^\]]*'phq-money'[^\]]*\]/.test(pcode)) ok('painter id in IDS');
else no('painter IDS', "'phq-money' missing from IDS");
if (/'phq-money':\s*'FOLLOW THE MONEY'/.test(pcode)) ok("TITLES['phq-money'] = 'FOLLOW THE MONEY'");
else no('painter TITLES', 'missing');
if (/'phq-money':\s*paintMoney/.test(pcode)) ok('painters map registers paintMoney');
else no('painters map', 'missing paintMoney');
/* kill switches */
if (/PF\.skip\(['"]money-tab['"]\)/.test(mtsrc)) ok('kill switch PF.skip("money-tab") wired');
else no('kill switch', 'PF.skip("money-tab") not found');
if (/PF\.skip\(['"]money-vote['"]\)/.test(mvsrc)) ok('kill switch PF.skip("money-vote") wired');
else no('kill switch', 'PF.skip("money-vote") not found');
if (mtsrc.indexOf('?pf_off=money-tab') !== -1) ok('KILL comment documents ?pf_off=money-tab');
else no('kill comment', '?pf_off=money-tab missing from header');
if (mvsrc.indexOf('?pf_off=money-vote') !== -1) ok('KILL comment documents ?pf_off=money-vote');
else no('kill comment', '?pf_off=money-vote missing from header');
/* esc() on injected fields — comment-stripped view, no string stripping.
   Field names track the LOCKED BE contract (member/totals/retrieved_at/
   industries[].total/small_dollar_pct, cards[]/position/d.copy). */
['esc\\(leg\\.name', 'esc\\(chamberLabel\\(leg\\)\\)', 'esc\\(EMPTY_MSG\\)',
 'esc\\(d\\.name', 'esc\\(d\\.employer\\)', 'esc\\(d\\.industry',
 'esc\\(money\\(d\\.amount\\)\\)', 'esc\\(money\\(d\\.total\\)\\)', 'esc\\(j\\.cycle',
 'esc\\(retrDate\\(j\\.retrieved_at\\)\\)'
].forEach(function (pat) {
  if (new RegExp(pat).test(mtcode)) ok('money-tab esc applied: ' + pat.replace(/\\\\/g, ''));
  else no('esc() money-tab', pat + ' not found');
});
['esc\\(HEADER\\)', 'esc\\(r\\.name', 'esc\\(chamberLabel\\(r\\)\\)',
 'esc\\(r\\.position', 'esc\\(money\\(d\\.total\\)\\)', 'esc\\(d\\.copy\\)',
 'esc\\(d\\.industry', 'esc\\(bill\\.bill_id', 'esc\\(bill\\.title',
 'esc\\(EMPTY_MSG\\)'
].forEach(function (pat) {
  if (new RegExp(pat).test(mvcode)) ok('money-vote esc applied: ' + pat.replace(/\\\\/g, ''));
  else no('esc() money-vote', pat + ' not found');
});
if (/esc\(j\.methodology \|\| METHOD\)/.test(mvcode)) ok('methodology caption esc applied');
else no('esc() methodology', 'missing');
/* never auto-mounts (integration hooks live in header comments, stripped) */
if (!/PFMoneyTab\.mount\(/.test(mtcode)) ok('money-tab never auto-mounts (Release Eng calls PFMoneyTab.mount)');
else no('auto-mount', 'PFMoneyTab.mount invoked inside money-tab.js');
if (!/PFMoneyVote\.mount\(/.test(mvcode)) ok('money-vote never auto-mounts (Release Eng calls PFMoneyVote.mount)');
else no('auto-mount', 'PFMoneyVote.mount invoked inside money-vote-card.js');
/* existing share flow reused, no rebuilt plumbing, no XP */
if (mtcode.indexOf('PF.PHQShare') !== -1 && /PHQ\.save\(/.test(mtcode) && /PHQ\.share\(/.test(mtcode))
  ok('money-tab DOWNLOAD/SHARE route through existing PF.PHQShare.save/.share');
else no('share flow', 'money-tab not using PF.PHQShare.save/.share');
if (mtcode.indexOf("'phq-money'") !== -1) ok('money-tab references painter id phq-money');
else no('painter id ref', 'missing in money-tab.js');
[mtcode, mvcode].forEach(function (c, i) {
  var nm = i === 0 ? 'money-tab.js' : 'money-vote-card.js';
  if (!/\bxp\b/i.test(c.replace(/explain/gi, ''))) ok('no XP code: ' + nm);
  else no('no-xp', 'found xp reference in ' + nm);
});
/* copy-rule compliance — vote-vs-donor card */
if (mvsrc.indexOf('Who funded both sides') !== -1) ok('vote-card header copy: "Who funded both sides"');
else no('header copy', 'missing');
if (mvsrc.indexOf('Donations are correlated with votes, not proof of cause.') !== -1)
  ok('methodology caption present verbatim');
else no('methodology', 'verbatim caption missing');
var BANNED = ['bought by', 'owned by', 'quid pro quo', 'bribe', 'pay-to-play', 'pay to play', 'in exchange for'];
var banFail = 0;
BANNED.forEach(function (w) {
  if (mvsrc.toLowerCase().indexOf(w) !== -1) { no('causation', '"' + w + '" present in money-vote-card.js'); banFail++; }
  if (mtsrc.toLowerCase().indexOf(w) !== -1) { no('causation', '"' + w + '" present in money-tab.js'); banFail++; }
});
if (/\bbought\b/i.test(mvsrc) || /\bbought\b/i.test(mtsrc)) { no('causation', 'bare "bought" present'); banFail++; }
if (!banFail) ok('no banned causation phrases in either module');
if (mvcode.indexOf('received <span') !== -1 || mvsrc.indexOf("received <span class=\"pf-mv-amt\">") !== -1)
  ok('vote-card per-row fallback shape: "received $X from [industry]"');
else no('row copy', 'fallback "received $X from" shape missing');
if (/esc\(d\.copy\)/.test(mvcode)) ok('vote-card consumes the BE prebuilt copy verbatim (d.copy)');
else no('row copy', 'd.copy not consumed verbatim');
/* money-tab copy */
if (mtsrc.indexOf("Money data isn't loaded yet — no figures shown rather than guesses.") !== -1)
  ok('money-tab empty state copy present');
else no('empty copy', 'missing');
if (mtsrc.indexOf('Source: FEC · ') !== -1) ok('money-tab source footer: "Source: FEC · {cycle} cycle · retrieved {date}"');
else no('source footer', 'missing');
if (mtsrc.indexOf('ESTIMATED FROM EMPLOYER DATA') !== -1) ok('industry "estimated from employer data" badge present');
else no('est badge', 'missing');
if (mtsrc.indexOf('SMALL-DOLLAR') !== -1 && mtsrc.indexOf('LARGE-DOLLAR') !== -1)
  ok('small-dollar vs large-dollar split section present');
else no('split', 'missing');
/* banned terms + real names */
['shanetheswan'].forEach(function (w) {
  if (mtsrc.toLowerCase().indexOf(w) === -1 && mvsrc.toLowerCase().indexOf(w) === -1 &&
      psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
/* 'donate' appears only in honest legal framing (the "corporations cannot donate
   directly" disclaimer + the total_donated data field) — QC-ruled false positive.
   Ban only actual solicitation copy. */
(function () {
  var combo = (mtsrc + mvsrc + psrc).toLowerCase();
  var solicits = ['donate now', 'donate today', 'donate here', 'donate to', 'please donate',
    'click to donate', '>donate<', 'donate!'];
  var hit = solicits.filter(function (ph) { return combo.indexOf(ph) !== -1; });
  if (hit.length === 0) ok('no donation solicitation copy in money sources');
  else no('banned term', 'solicitation copy: ' + JSON.stringify(hit));
})();
if (!/\bShane\b/.test(mtsrc) && !/\bShane\b/.test(mvsrc) && !/\bShane\b/.test(pcode))
  ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/money-tab.js'") &&
    has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/money-vote-card.js'"))
  ok('money-tab.js + money-vote-card.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
/* (2026-10-05 fix/money-minified-rebuild: the old 'module markers present in
   rebuilt pages/bundle-pages.js' check was retired — the money suite moved
   to the lazy core/bundle-money.js chunk. See chunk-split guards below.) */
/* 2026-10-05 (fix/money-minified-rebuild): money chunk-split. The 10 money
   modules no longer ride in bundle-pages.js — they ship as the minified
   core/bundle-money.js chunk, loaded on demand by core/money-chunk-loader.js
   (which stays in bundle-pages.js). Guard the new architecture: */
var MCHUNK = path.join(V, 'core', 'bundle-money.js');
if (fs.existsSync(MCHUNK) && has(MCHUNK, 'pfMoneyTabDone') && has(MCHUNK, 'pfMoneyVoteDone') &&
    has(MCHUNK, 'pfMoneyPageDone'))
  ok('money chunk core/bundle-money.js carries the suite (tab+vote+page markers)');
else no('money chunk', 'core/bundle-money.js missing or incomplete');
/* No duplication: the money modules must appear in exactly one built bundle.
   (Pre-split, the suite shipped in both core and pages on some builds — the
   weight-budget killer. Check code markers, not separator comments: terser
   strips comments from the minified output.) */
var dup = ['pfMoneyTabDone', 'pfMoneyPageDone', 'pfMoneyDeepDone'].some(function (mk) {
  return has(path.join(V, 'core', 'bundle-core.js'), mk) ||
         has(path.join(V, 'pages', 'bundle-pages.js'), mk);
});
if (!dup) ok('no money duplication: modules only in bundle-money.js');
else no('money duplication', 'money module found in bundle-core.js or bundle-pages.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfMoneyChunkLoading'))
  ok('chunk loader present in bundle-pages.js');
else no('chunk loader', 'money-chunk-loader missing from bundle-pages.js');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime (canvas + DOM stub) ==');
function pxOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(String(font)); return m ? parseFloat(m[1]) : 10; }
function Ctx2D(rec) {
  this._rec = rec;
  this.font = '400 10px Arial,sans-serif';
  this.fillStyle = '#000000';
  this.textAlign = 'center';
  this.textBaseline = 'alphabetic';
}
Ctx2D.prototype.measureText = function (t) { return { width: String(t).length * pxOf(this.font) * 0.62 }; };
Ctx2D.prototype.fillText = function (t, x, y) {
  this._rec.push({ text: String(t), font: this.font, fillStyle: this.fillStyle, x: x, y: y });
};
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate',
 'beginPath', 'clip', 'rect', 'arc', 'stroke', 'fill'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return {
    width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); }
  };
}
function makeEl(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), children: [], _attrs: {},
    _listeners: {}, style: {}, parentNode: null, className: '',
    _innerHTML: '', textContent: '', id: '', scrollLeft: 0, clientWidth: 320
  };
  el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
  el.removeChild = function (c) {
    var ix = el.children.indexOf(c);
    if (ix !== -1) el.children.splice(ix, 1);
    try { c.parentNode = null; } catch (e) {}
    return c;
  };
  el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
  el.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
  };
  el.addEventListener = function (t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); };
  el.querySelector = function () { return null; };
  el.scrollTo = function () {};
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  return el;
}
function makeEnv(opts) {
  opts = opts || {};
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var captured = { scripts: [], headChildren: [] };
  var registered = {};
  var shareCalls = [], saveCalls = [];
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function () { return 0; }; /* no auto-timeout in tests */
  sb.navigator = {};
  sb.location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  var head = makeEl('head');
  var _headAppend = head.appendChild;
  head.appendChild = function (c) { captured.headChildren.push(c); return _headAppend(c); };
  sb.document = {
    createElement: function (t) {
      t = String(t).toLowerCase();
      if (t === 'canvas') return makeCanvas();
      var el = makeEl(t);
      if (t === 'script') captured.scripts.push(el);
      return el;
    },
    head: head,
    getElementById: function () { return null; },
    addEventListener: function () {}
  };
  sb.PF = {
    skip: function (silo) {
      var disabled = [];
      try {
        var m = String(sb.location.search).match(/[?&]pf_off=([^&]+)/);
        if (m) disabled = disabled.concat(decodeURIComponent(m[1]).split(','));
      } catch (e) {}
      try { disabled = disabled.concat(JSON.parse(sb.localStorage.getItem('pf_disabled_v1') || '[]')); } catch (e2) {}
      return disabled.indexOf(silo) !== -1;
    },
    toast: function () {}
  };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PF_BACKEND_URL = opts.backend === undefined ? 'https://pf-api.example.com/exec' : opts.backend;
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(PAINTER_MOD), sb, { filename: 'share-image-phq.js' });
  vm.runInContext(read(MT_MOD), sb, { filename: 'money-tab.js' });
  vm.runInContext(read(MV_MOD), sb, { filename: 'money-vote-card.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function opFor(cv, text) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++) if (rs[i].text === text) return rs[i];
  return null;
}
/* moneyRow splits label/value into two fillText ops ('RAISED  ' + '$X'),
   so exact-text lookup misses — match on the squished fragment instead. */
function opFrag(cv, frag) {
  var rs = cv._recs || [], f = squish(frag);
  for (var i = 0; i < rs.length; i++)
    if (squish(rs[i].text).indexOf(f) !== -1) return rs[i];
  return null;
}
function allHtml(el) {
  var h = (el._innerHTML || '') + '\n' + (el.textContent || '');
  (el.children || []).forEach(function (c) { h += '\n' + allHtml(c); });
  return h;
}

/* Fixtures — synthetic paint-test values, not asserted facts. */
var PFIX = {
  bioguideId: 'J000288', name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
  cycle: '2026', retrieved: '2026-10-05',
  raised: 1234567, spent: 890123, cash: 344444,
  topDonors: [
    { name: 'ACME CORP', employer: 'ACME INC', amount: 25000 },
    { name: 'JOHN DOE', employer: '', amount: 10000 },
    { name: 'JANE SMITH', employer: 'SMITH LLC', amount: 7500 }
  ],
  topIndustries: [{ industry: 'FINANCE', amount: 120000 }]
};
/* MRESP_OK / VRESP_OK — synthetic paint-test values, not asserted facts.
   Shapes track the LOCKED BE contract (be/follow-the-money @ dd9cab9):
   member/totals.{raised,spent,cash}/retrieved_at/industries[].total/
   small_dollar_pct & large_dollar_pct as percentages (NO x100),
   cards[]/position/BE-prebuilt copy. */
var MRESP_OK = {
  ok: true,
  cycle: 2026, source: 'FEC (api.open.fec.gov)', retrieved_at: 1760000000000,
  member: { bioguide_id: 'J000288', fec_candidate_id: 'H8NY15154', name: 'MIKE JOHNSON',
            office: 'H', state: 'LA', party: 'R' },
  totals: { raised: 1234567, spent: 890123, cash: 344444 },
  small_dollar_pct: 23, large_dollar_pct: 77,
  top_donors: [
    { name: 'ACME CORP', employer: 'ACME INC', occupation: 'CEO', amount: 25000 },
    { name: 'JOHN DOE', employer: '', occupation: 'Retired', amount: 10000 }
  ],
  industries: [
    { industry: 'FINANCE', total: 120000, estimated: true },
    { industry: 'ENERGY', total: 80000, estimated: false }
  ]
};
var VRESP_OK = {
  ok: true,
  bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' },
  cycle: 2026,
  cards: [
    { bioguide_id: 'J000288', name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
      position: 'Yea', vote_id: 'h-119-2026-3633', vote_date: '2026-03-01',
      question: 'On Passage', source_url: 'https://clerk.house.gov/Votes/20263633',
      money: { cycle: 2026, source: 'FEC (api.open.fec.gov)', retrieved_at: 1760000000000,
        industries: [{ industry: 'FINANCE', total: 50000, estimated: true,
                       copy: 'received $50,000 from FINANCE' },
                     { industry: 'ENERGY', total: 25000, estimated: false,
                       copy: 'received $25,000 from ENERGY' }] } },
    { bioguide_id: 'S000148', name: 'CHUCK SCHUMER', chamber: 'senate', party: 'D', state: 'NY',
      position: 'Nay', vote_id: 's-119-2026-3633', vote_date: '2026-03-02',
      question: 'On Passage of the Bill',
      source_url: 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00363.htm',
      money: null }
  ]
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with money painter registered)');
  var wantMoney = ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-money'];
  var missingMoney = wantMoney.filter(function (id) { return PHQ.ids.indexOf(id) === -1; });
  if (missingMoney.length === 0)
    ok('ids list includes phq-money (+ suite; registry carries ' + PHQ.ids.length + ' total)');
  else no('ids', 'missing ids: ' + JSON.stringify(missingMoney));
  if (typeof env.registered['phq-money'] === 'function') ok('setPoster registered: phq-money');
  else no('registration', 'phq-money not registered with PFShare');

  /* --- painter: full fixture --- */
  var cv = PHQ.paint('phq-money', PFIX);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('money mount', 'no 1080x1350 canvas');
  else {
    ok('money mounts 1080x1350');
    if (hasFrag(cv, 'FOLLOW THE MONEY')) ok('money badge');
    else no('badge', 'missing');
    if (hasText(cv, 'MIKE JOHNSON')) ok('money legislator name');
    else no('name', 'missing');
    if (hasFrag(cv, 'U.S. HOUSE') && hasFrag(cv, 'R') && hasFrag(cv, 'LA'))
      ok('money chamber/party/state line');
    else no('chamber line', 'missing');
    if (hasFrag(cv, '2026 CYCLE')) ok('money cycle line');
    else no('cycle', 'missing');
    if (hasFrag(cv, 'RAISED') && hasFrag(cv, '$1,234,567')) ok('money RAISED total');
    else no('raised', 'missing');
    if (hasFrag(cv, 'SPENT') && hasFrag(cv, '$890,123')) ok('money SPENT total');
    else no('spent', 'missing');
    if (hasFrag(cv, 'CASH ON HAND') && hasFrag(cv, '$344,444')) ok('money CASH ON HAND total');
    else no('cash', 'missing');
    var rop = opFrag(cv, '$1,234,567');
    if (rop && /900 [4-9]\dpx/.test(rop.font)) ok('totals are display type');
    else no('totals type', 'not display type: ' + (rop && rop.font));
    if (hasText(cv, 'TOP DONORS') && hasFrag(cv, 'ACME CORP') && hasFrag(cv, '$25,000'))
      ok('money top-3 donors preferred');
    else no('donors', 'missing: ' + joined(cv).slice(0, 400));
    if (hasFrag(cv, 'SOURCE: FEC') && hasFrag(cv, 'RETRIEVED OCT 5, 2026'))
      ok('money source line + retrieval date');
    else no('source', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true)
      ok('money callsign stamp + _pfStamped');
    else no('stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('money bottom stack (deep link + CTA + date)');
    else no('bottom', 'stack incomplete');
  }
  /* --- painter: industries fallback when no donors --- */
  try {
    var cvI = PHQ.paint('phq-money', {
      name: 'JANE DOE', chamber: 'senate', party: 'D', state: 'CA',
      cycle: '2026', retrieved: '2026-10-05', raised: 500000, spent: 400000, cash: 100000,
      topDonors: [], topIndustries: [{ industry: 'TECH', amount: 90000 }]
    });
    if (cvI && hasText(cvI, 'TOP INDUSTRIES') && hasFrag(cvI, 'TECH') && !hasText(cvI, 'TOP DONORS'))
      ok('money falls back to top industries when no donors');
    else no('industry fallback', 'missing');
  } catch (e) { no('industry fallback', 'threw: ' + (e && e.message)); }
  /* --- painter: sparse data degrades to em-dash, never throws --- */
  try {
    var cvS = PHQ.paint('phq-money', {});
    if (cvS && hasFrag(cvS, '\u2014')) ok('money empty record renders \u2014');
    else no('degrade', 'no em-dash for missing fields');
  } catch (e) { no('degrade', 'threw on empty data: ' + (e && e.message)); }
  /* --- painter: no-callsign, no blank stamp --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  var cvN = env2.sb.PF.PHQShare.paint('phq-money', PFIX);
  if (!hasFrag(cvN, 'FIGHTING AS') && cvN._pfStamped !== true) ok('money no-callsign: no blank stamp');
  else no('no-cs', 'blank stamp painted');
  /* --- painter: long name still clears the bottom stack --- */
  (function () {
    var c = PHQ.paint('phq-money', Object.assign({}, PFIX, { name: 'ALEXANDRIA OCASIO-CORTEZ THE LONGEST NAME EVER' }));
    var rs = c._recs || [], bad = [], link = null, date = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.y > 1194 && r.y < 1218) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
      if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
      if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    }
    if (!bad.length) ok('money: clean gap above bottom stack (long name)');
    else no('gap', 'content in stack gap: ' + bad.join(' | '));
    if (link === 1222) ok('money: deep link at H-128');
    else no('link y', 'deep link y=' + link);
    if (date === 1302) ok('money: date line at H-48');
    else no('date y', 'date y=' + date);
  })();
}

/* --- PFMoneyTab.mount: happy path --- */
function mountTab(resp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFMoneyTab.mount('J000288', container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp tab', 'callback param missing: ' + sc.src); return null; }
  if (String(sc.src).indexOf('action=money_legislator') === -1 ||
      String(sc.src).indexOf('bioguide_id=J000288') === -1)
    no('jsonp tab', 'action/bioguide_id missing: ' + sc.src);
  else ok('money-tab fires JSONP money_legislator&bioguide_id=J000288');
  e.sb[m[1]](resp); /* backend answers */
  return { env: e, container: container, mountRet: r };
}
(function () {
  var t = mountTab(MRESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('tab mount ret', 'expected true');
  else ok('tab mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-mt') { no('tab root', 'missing .pf-mt'); return; }
  ok('tab root rendered');
  var html = allHtml(root);
  if (html.indexOf('MIKE JOHNSON') !== -1 && html.indexOf('U.S. HOUSE') !== -1)
    ok('tab header: name + chamber line');
  else no('tab header', 'missing');
  if (html.indexOf('$1,234,567') !== -1 && html.indexOf('$890,123') !== -1 && html.indexOf('$344,444') !== -1)
    ok('tab totals row (raised/spent/cash)');
  else no('tab totals', 'missing');
  if (html.indexOf('width:23%') !== -1 && html.indexOf('width:77%') !== -1)
    ok('tab small/large split bar (23%/77%)');
  else no('tab split bar', 'missing');
  if (html.indexOf('ACME CORP') !== -1 && html.indexOf('ACME INC') !== -1 && html.indexOf('$25,000') !== -1)
    ok('tab top donors (name + employer + amount)');
  else no('tab donors', 'missing');
  if (html.indexOf('FINANCE') !== -1 && html.indexOf('ESTIMATED FROM EMPLOYER DATA') !== -1)
    ok('tab top industries with estimated badge');
  else no('tab industries', 'missing');
  if (html.indexOf('Source: FEC') !== -1 && html.indexOf('2026 cycle') !== -1 &&
      html.indexOf('retrieved OCT 9, 2025') !== -1)
    ok('tab source footer: "Source: FEC · 2026 cycle · retrieved OCT 9, 2025" (epoch-ms retrieved_at)');
  else no('tab footer', 'missing');
  /* DOWNLOAD -> PF.PHQShare.save('phq-money', {...}) via existing flow */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('tab click delegation', 'no click listener'); return; }
  ok('tab click delegation wired');
  click({ target: { getAttribute: function (k) { return k === 'data-mt-dl' ? '1' : null; } } });
  if (t.env.saveCalls.length === 1 && t.env.saveCalls[0].id === 'phq-money' &&
      t.env.saveCalls[0].fn === 'pfn-phq-money.png' &&
      t.env.saveCalls[0].cv && (t.env.saveCalls[0].cv._recs || []).length > 10)
    ok('tab DOWNLOAD routes to PF.PHQShare.save with painted money canvas');
  else no('tab download', 'routing failed');
  /* SHARE -> PF.PHQShare.share('phq-money', {...}) */
  click({ target: { getAttribute: function (k) { return k === 'data-mt-sh' ? '1' : null; } } });
  if (t.env.shareCalls.length === 1 && t.env.shareCalls[0].id === 'phq-money')
    ok('tab SHARE routes to PF.PHQShare.share with painted money canvas');
  else no('tab share', 'routing failed');
  /* painter data comes from the endpoint response, not invented */
  var scv = t.env.shareCalls[0] && t.env.shareCalls[0].cv;
  if (scv && hasText(scv, 'MIKE JOHNSON') && hasFrag(scv, '$1,234,567') && hasFrag(scv, 'SOURCE: FEC'))
    ok('shared money poster carries endpoint data + source');
  else no('poster data', 'poster missing endpoint fields');
})();

/* --- money tab: fail-soft + empty states --- */
(function () {
  var t = mountTab(null);
  if (t && t.container.style.display === 'none' && t.container.children.length === 0)
    ok('tab fail-soft: endpoint down (null) hides the section entirely');
  else no('tab fail-soft null', 'section not hidden');
})();
(function () {
  var t = mountTab({ ok: false });
  if (t && t.container.style.display === 'none')
    ok('tab fail-soft: {ok:false} hides the section entirely');
  else no('tab fail-soft ok:false', 'section not hidden');
})();
(function () {
  var t = mountTab({ ok: true, member: { name: 'MIKE JOHNSON' }, cycle: 2026,
    retrieved_at: 1760000000000 });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf("Money data isn't loaded yet — no figures shown rather than guesses.") !== -1 &&
      html.indexOf('Source: FEC') !== -1)
    ok('tab empty state: no totals shows the honest message + source footer (section stays)');
  else no('tab empty state', 'missing or section hidden');
})();
(function () {
  var e = makeEnv();
  var W = e.sb.PFMoneyTab;
  if (W.mount('', e.sb.document.createElement('div')) === false &&
      W.mount('J000288', null) === false)
    ok('tab mount fail-soft on missing bioguideId/container (returns false)');
  else no('tab mount args', 'did not fail closed');
})();
(function () {
  var e = makeEnv({ search: '?pf_off=money-tab' });
  if (typeof e.sb.PFMoneyTab === 'undefined') ok('tab kill switch: ?pf_off=money-tab prevents mount API');
  else no('tab kill switch', 'PFMoneyTab exposed despite ?pf_off=money-tab');
  if (typeof e.sb.PFMoneyVote !== 'undefined') ok('tab kill switch is scoped (money-vote still loads)');
  else no('kill scope', 'money-vote wrongly killed');
})();

/* --- PFMoneyVote.mount: happy path --- */
function mountVote(resp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFMoneyVote.mount('H.R.3633', container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp vote', 'callback param missing: ' + sc.src); return null; }
  if (String(sc.src).indexOf('action=money_vote_card') === -1 ||
      String(sc.src).indexOf('bill_id=H.R.3633') === -1)
    no('jsonp vote', 'action/bill_id missing: ' + sc.src);
  else ok('vote card fires JSONP money_vote_card&bill_id=H.R.3633');
  e.sb[m[1]](resp); /* backend answers */
  return { env: e, container: container, mountRet: r };
}
(function () {
  var t = mountVote(VRESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('vote mount ret', 'expected true');
  else ok('vote mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-mv') { no('vote root', 'missing .pf-mv'); return; }
  ok('vote card root rendered');
  var html = allHtml(root);
  if (html.indexOf('Who funded both sides') !== -1) ok('vote header copy: "Who funded both sides"');
  else no('vote header', 'missing');
  if (html.indexOf('H.R.3633') !== -1 && html.indexOf('THE CLARITY ACT') !== -1)
    ok('vote card bill line');
  else no('vote bill', 'missing');
  if (html.indexOf('MIKE JOHNSON') !== -1 && html.indexOf('Yea') !== -1)
    ok('vote row: name + vote');
  else no('vote row', 'missing');
  if (html.indexOf('received') !== -1 && html.indexOf('$50,000') !== -1 && html.indexOf('FINANCE') !== -1)
    ok('vote row copy verbatim from BE: "received $50,000 from FINANCE"');
  else no('row copy', 'missing');
  if (html.indexOf('$25,000') !== -1 && html.indexOf('ENERGY') !== -1)
    ok('vote row carries all top industries with totals');
  else no('row industries', 'missing');
  /* money:null member -> vote-only row, never hidden */
  if (html.indexOf('CHUCK SCHUMER') !== -1 && html.indexOf('Nay') !== -1)
    ok('money:null member renders a vote-only row (never hidden)');
  else no('vote-only row', 'missing');
  var receivedCount = (html.match(/received/g) || []).length;
  if (receivedCount === 2) ok('vote-only row carries no donor lines (2 "received" lines total)');
  else no('vote-only purity', receivedCount + ' "received" lines');
  if (html.indexOf('Donations are correlated with votes, not proof of cause.') !== -1)
    ok('methodology caption rendered verbatim');
  else no('methodology render', 'missing');
  /* no causation language in the RENDERED output either */
  var low = html.toLowerCase();
  if (low.indexOf('bought') === -1 && low.indexOf('owned by') === -1)
    ok('rendered vote card has no causation language');
  else no('rendered copy', 'causation language leaked into render');
})();

/* --- vote card: fail-soft + empty states + kill --- */
(function () {
  var t = mountVote(null);
  if (t && t.container.style.display === 'none' && t.container.children.length === 0)
    ok('vote fail-soft: endpoint down (null) hides the section entirely');
  else no('vote fail-soft null', 'section not hidden');
})();
(function () {
  var t = mountVote({ ok: false });
  if (t && t.container.style.display === 'none')
    ok('vote fail-soft: {ok:false} hides the section entirely');
  else no('vote fail-soft ok:false', 'section not hidden');
})();
(function () {
  var t = mountVote({ ok: true, bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' }, cards: [] });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf('No vote records returned for this bill.') !== -1)
    ok('vote empty state: zero cards shows the honest message (section stays)');
  else no('vote empty state', 'missing or section hidden');
})();
(function () {
  /* methodology default when the endpoint omits it */
  var t = mountVote({ ok: true, bill: { bill_id: 'H.R.3633', title: 'X' },
    cards: [{ name: 'A', position: 'Yea', money: null }] });
  var html = t ? allHtml(t.container) : '';
  if (html.indexOf('Donations are correlated with votes, not proof of cause.') !== -1)
    ok('vote methodology defaults to the verbatim caption');
  else no('methodology default', 'missing');
})();
(function () {
  var e = makeEnv();
  var W = e.sb.PFMoneyVote;
  if (W.mount('', e.sb.document.createElement('div')) === false &&
      W.mount('H.R.3633', null) === false)
    ok('vote mount fail-soft on missing billId/container (returns false)');
  else no('vote mount args', 'did not fail closed');
})();
(function () {
  var e = makeEnv({ search: '?pf_off=money-vote' });
  if (typeof e.sb.PFMoneyVote === 'undefined') ok('vote kill switch: ?pf_off=money-vote prevents mount API');
  else no('vote kill switch', 'PFMoneyVote exposed despite ?pf_off=money-vote');
  if (typeof e.sb.PFMoneyTab !== 'undefined') ok('vote kill switch is scoped (money-tab still loads)');
  else no('kill scope', 'money-tab wrongly killed');
})();

/* ============ 4. real-BE integration (LOCKED contract, be/follow-the-money @ dd9cab9) ============
   The 116 checks above use contract-correct synthetic fixtures. This test
   feeds REAL repDispatch output — tests/fixtures/fixture-money_*.json,
   captured by running the BE test harness against dd9cab9 — through
   PFMoneyTab.mount / PFMoneyVote.mount. With live BE data the modules must
   RENDER (never the empty states). */
console.log('== 4. real-BE response integration (captured repDispatch output) ==');
var BE_LEG = JSON.parse(read(path.join(ROOT, 'tests', 'fixtures', 'fixture-money_legislator.json')));
var BE_VOTE = JSON.parse(read(path.join(ROOT, 'tests', 'fixtures', 'fixture-money_vote_card.json')));
/* sanity: the fixtures really are the BE contract, not the old FE assumption */
if (BE_LEG.member && BE_LEG.totals && typeof BE_LEG.totals.raised === 'number' &&
    typeof BE_LEG.retrieved_at === 'number' && Array.isArray(BE_LEG.industries) &&
    typeof BE_LEG.small_dollar_pct === 'number' && !('summary' in BE_LEG) && !('legislator' in BE_LEG))
  ok('fixture money_legislator is the real BE contract (member/totals/retrieved_at/industries/pcts)');
else no('fixture shape', 'money_legislator fixture does not match the BE contract');
if (Array.isArray(BE_VOTE.cards) && BE_VOTE.cards.length > 0 &&
    BE_VOTE.cards[0].position !== undefined && !('rows' in BE_VOTE) &&
    BE_VOTE.cards.some(function (c) { return c.money && c.money.industries &&
      c.money.industries.some(function (x) { return typeof x.copy === 'string'; }); }))
  ok('fixture money_vote_card is the real BE contract (cards[]/position/prebuilt copy)');
else no('fixture shape', 'money_vote_card fixture does not match the BE contract');

(function () {
  /* real legislator response -> PFMoneyTab renders, NOT the empty state */
  var t = mountTab(BE_LEG);
  if (!t) return;
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-mt') { no('real tab root', 'missing .pf-mt'); return; }
  var html = allHtml(root);
  if (html.indexOf("Money data isn't loaded yet") === -1) ok('real tab: no empty state on live BE data');
  else no('real tab', 'EMPTY STATE fired on a real BE response');
  if (html.indexOf('Fixture One') !== -1 && html.indexOf('U.S. HOUSE') !== -1)
    ok('real tab: name + office-H chamber line');
  else no('real tab header', 'missing');
  if (html.indexOf('$100,000') !== -1 && html.indexOf('$70,000') !== -1 && html.indexOf('$30,000') !== -1)
    ok('real tab: totals.raised/spent/cash ($100,000/$70,000/$30,000)');
  else no('real tab totals', 'missing');
  /* percentages pass straight through — 2.5 and 60, never x100 */
  if (html.indexOf('width:2.5%') !== -1 && html.indexOf('width:60%') !== -1 &&
      html.indexOf('2.5%') !== -1 && html.indexOf('60%') !== -1 &&
      html.indexOf('width:250%') === -1 && html.indexOf('width:6000%') === -1)
    ok('real tab: split bar uses small/large_dollar_pct directly (2.5%/60%, no x100)');
  else no('real tab split', 'percentages wrong or multiplied');
  if (html.indexOf('Big Donor') !== -1 && html.indexOf('Exxon') !== -1 && html.indexOf('$9,000') !== -1)
    ok('real tab: top donor name + employer + amount');
  else no('real tab donors', 'missing');
  if (html.indexOf('Finance &amp; Insurance') !== -1 && html.indexOf('$40,000') !== -1 &&
      html.indexOf('ESTIMATED FROM EMPLOYER DATA') !== -1)
    ok('real tab: industries[].total + estimated badge');
  else no('real tab industries', 'missing');
  if (html.indexOf('Source: FEC') !== -1 && html.indexOf('2026 cycle') !== -1 &&
      html.indexOf('retrieved OCT 9, 2025') !== -1)
    ok('real tab: source footer with epoch-ms retrieved_at (OCT 9, 2025)');
  else no('real tab footer', 'missing');
  /* SHARE poster rides the real data through the adapter */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('real tab poster', 'no click listener'); return; }
  click({ target: { getAttribute: function (k) { return k === 'data-mt-sh' ? '1' : null; } } });
  var scv = t.env.shareCalls[0] && t.env.shareCalls[0].cv;
  if (scv && hasText(scv, 'FIXTURE ONE') && hasFrag(scv, '$100,000') &&
      hasFrag(scv, 'U.S. HOUSE') && hasFrag(scv, 'SOURCE: FEC') &&
      hasFrag(scv, 'RETRIEVED OCT 9, 2025'))
    ok('real tab SHARE: poster carries BE data (name/totals/chamber/source/date)');
  else no('real tab poster', 'poster missing BE fields');
})();

(function () {
  /* real vote-card response -> PFMoneyVote renders, NOT the empty state */
  var t = mountVote(BE_VOTE);
  if (!t) return;
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-mv') { no('real vote root', 'missing .pf-mv'); return; }
  var html = allHtml(root);
  if (html.indexOf('No vote records returned') === -1) ok('real vote: no empty state on live BE data');
  else no('real vote', 'EMPTY STATE fired on a real BE response');
  if (html.indexOf('Who funded both sides') !== -1) ok('real vote: header copy');
  else no('real vote header', 'missing');
  if (html.indexOf('H.R.1') !== -1 && html.indexOf('One Big Beautiful Bill Act') !== -1)
    ok('real vote: bill line (H.R.1 — One Big Beautiful Bill Act)');
  else no('real vote bill', 'missing');
  if (html.indexOf('Robert B. Aderholt') !== -1 && html.indexOf('Yea') !== -1)
    ok('real vote: card reads position (not vote)');
  else no('real vote card', 'missing');
  /* the BE prebuilt copy is consumed VERBATIM — byte-identical to repDispatch */
  var want = BE_VOTE.cards.filter(function (c) { return c.bioguide_id === 'A000055'; })[0]
    .money.industries[0].copy;
  if (want === 'received $40,000 from Finance & Insurance' &&
      html.indexOf('received $40,000 from Finance &amp; Insurance') !== -1)
    ok('real vote: BE prebuilt copy consumed verbatim ("received $40,000 from Finance & Insurance")');
  else no('real vote copy', 'verbatim copy missing');
  /* money:null member -> vote-only row, never hidden */
  if (html.indexOf('Mark E. Amodei') !== -1 && html.indexOf('Yea') !== -1)
    ok('real vote: money:null member renders a vote-only row (never hidden)');
  else no('real vote vote-only', 'missing');
  /* money object with EMPTY industries -> the no-data line, not hidden */
  if (html.indexOf('Jake Auchincloss') !== -1 && html.indexOf('No industry donor data reported.') !== -1)
    ok('real vote: empty industries renders the no-data line (row stays)');
  else no('real vote empty-industries', 'missing');
  if (html.indexOf('Donations are correlated with votes, not proof of cause.') !== -1)
    ok('real vote: methodology caption rendered verbatim');
  else no('real vote methodology', 'missing');
  var low = html.toLowerCase();
  if (low.indexOf('bought') === -1) ok('real vote: no causation language in rendered output');
  else no('real vote copy-rule', 'causation language leaked');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
