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
   Fixture figures are synthetic paint-test values, not asserted facts.
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
/* esc() on injected fields — comment-stripped view, no string stripping */
['esc\\(leg\\.name', 'esc\\(chamberLabel\\(leg\\)\\)', 'esc\\(EMPTY_MSG\\)',
 'esc\\(d\\.name', 'esc\\(d\\.employer\\)', 'esc\\(d\\.industry',
 'esc\\(money\\(d\\.amount\\)\\)', 'esc\\(j\\.cycle', 'esc\\(retrDate\\(j\\.retrieved\\)\\)'
].forEach(function (pat) {
  if (new RegExp(pat).test(mtcode)) ok('money-tab esc applied: ' + pat.replace(/\\\\/g, ''));
  else no('esc() money-tab', pat + ' not found');
});
['esc\\(HEADER\\)', 'esc\\(r\\.name', 'esc\\(chamberLabel\\(r\\)\\)',
 'esc\\(r\\.vote', 'esc\\(money\\(d\\.amount\\)\\)', 'esc\\(d\\.industry',
 'esc\\(bill\\.bill_id', 'esc\\(bill\\.title', 'esc\\(EMPTY_MSG\\)'
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
  ok('vote-card per-row copy shape: "received $X from [industry]"');
else no('row copy', '"received $X from" shape missing');
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
['donate', 'shanetheswan'].forEach(function (w) {
  if (mtsrc.toLowerCase().indexOf(w) === -1 && mvsrc.toLowerCase().indexOf(w) === -1 &&
      psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(mtsrc) && !/\bShane\b/.test(mvsrc) && !/\bShane\b/.test(pcode))
  ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/money-tab.js'") &&
    has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/money-vote-card.js'"))
  ok('money-tab.js + money-vote-card.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfMoneyTabDone') &&
    has(path.join(V, 'pages', 'bundle-pages.js'), 'pfMoneyVoteDone'))
  ok('module markers present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfMoneyTabDone/pfMoneyVoteDone missing from bundle-pages.js');

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
var MRESP_OK = {
  ok: true,
  legislator: { bioguide_id: 'J000288', name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA' },
  cycle: '2026', retrieved: '2026-10-05',
  summary: { total_raised: 1234567, total_spent: 890123, cash_on_hand: 344444,
             small_dollar: 0.23, large_dollar: 0.77 },
  top_donors: [
    { name: 'ACME CORP', employer: 'ACME INC', amount: 25000 },
    { name: 'JOHN DOE', employer: '', amount: 10000 }
  ],
  top_industries: [
    { industry: 'FINANCE', amount: 120000, estimated: 1 },
    { industry: 'ENERGY', amount: 80000, estimated: 0 }
  ]
};
var VRESP_OK = {
  ok: true,
  bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' },
  methodology: 'Donations are correlated with votes, not proof of cause.',
  rows: [
    { bioguide_id: 'J000288', name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
      vote: 'Yea',
      money: { industries: [{ industry: 'FINANCE', amount: 50000 },
                           { industry: 'ENERGY', amount: 25000 }] } },
    { bioguide_id: 'S000148', name: 'CHUCK SCHUMER', chamber: 'senate', party: 'D', state: 'NY',
      vote: 'Nay', money: null }
  ]
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with money painter registered)');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(
      ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-money']))
    ok('ids list includes phq-money');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
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
      html.indexOf('retrieved OCT 5, 2026') !== -1)
    ok('tab source footer: "Source: FEC · 2026 cycle · retrieved OCT 5, 2026"');
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
  var t = mountTab({ ok: true, legislator: { name: 'MIKE JOHNSON' }, cycle: '2026', retrieved: '2026-10-05' });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf("Money data isn't loaded yet — no figures shown rather than guesses.") !== -1 &&
      html.indexOf('Source: FEC') !== -1)
    ok('tab empty state: no summary shows the honest message + source footer (section stays)');
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
    ok('vote row copy: "received $50,000 from FINANCE"');
  else no('row copy', 'missing');
  if (html.indexOf('$25,000') !== -1 && html.indexOf('ENERGY') !== -1)
    ok('vote row carries all top industries with amounts');
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
  var t = mountVote({ ok: true, bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' }, rows: [] });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf('No vote records returned for this bill.') !== -1)
    ok('vote empty state: zero rows shows the honest message (section stays)');
  else no('vote empty state', 'missing or section hidden');
})();
(function () {
  /* methodology default when the endpoint omits it */
  var t = mountVote({ ok: true, bill: { bill_id: 'H.R.3633', title: 'X' },
    rows: [{ name: 'A', vote: 'Yea', money: null }] });
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

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
