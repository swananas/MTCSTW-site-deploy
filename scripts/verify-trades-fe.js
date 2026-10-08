#!/usr/bin/env node
/* scripts/verify-trades-fe.js — Stock Trades (Follow the Money) verification.
   Run from the repo root:
     node scripts/verify-trades-fe.js
   1. node --check on both new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switches (trades-tab, trades-card), painter registration
      (IDS/TITLES/PAINT), esc() on every injected name/title field, no photo
      hotlinking, no auto-mount, verbatim footer, HOLD checks (no
      trade-before-vote inference language), range discipline (no midpoint),
      no XP code, EIGA empty state, copy/CTA standards, banned terms, bundle
      registration
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      the phq-trades painter renders its spec copy on fixture data, stamps
      the callsign, degrades with no callsign; PFTradesTab.mount() renders
      the four elements + verbatim footer on good endpoint responses, wires
      SHARE through the EXISTING PF.PHQShare flow, honors both kill switches,
      and fails soft (hides the section) on bad endpoint responses.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var TAB_MOD = path.join(V, 'core', 'trades-tab.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function expectedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ============ 0. rebuild bundles (bundle-pages carries both modules) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[PAINTER_MOD, TAB_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var psrc = read(PAINTER_MOD), tsrc = read(TAB_MOD);
var pcode = stripComments(psrc), tcode = stripComments(tsrc);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
/* painter registration */
if (pcode.indexOf("'phq-trades'") !== -1 &&
    /var IDS = \[[^\]]*'phq-trades'[^\]]*\]/.test(pcode)) ok('painter id in IDS');
else no('painter IDS', 'phq-trades missing from IDS');
if (/'phq-trades': 'THEIR PORTFOLIO'/.test(pcode)) ok('painter title THEIR PORTFOLIO');
else no('painter TITLES', 'missing');
if (/'phq-trades': paintTrades/.test(pcode)) ok('painter in PAINT table');
else no('painter PAINT', 'missing');
if (pcode.indexOf('function paintTrades') !== -1) ok('paintTrades defined');
else no('paintTrades', 'missing');
/* kill switches */
if (/PF\.skip\('trades-tab'\)/.test(tcode)) ok('kill: PF.skip(trades-tab) module guard');
else no('kill trades-tab', 'guard missing');
if (/PF\.skip\('trades-card'\)/.test(pcode)) ok('kill: PF.skip(trades-card) in painter go()');
else no('kill trades-card', 'guard missing');
if (/PF\.skip\('trades-card'\)/.test(tcode)) ok('tab hides SHARE when trades-card killed');
else no('tab card-kill', 'SHARE button not gated');
/* esc() on injected HTML fields (trades-tab builds HTML strings; the painter
   is canvas fillText — no HTML injection vector there) */
['esc(m.name', 'esc(t.ticker', 'esc(t.amount_range)', 'esc(t.asset_name)',
 'esc(t.filing_url)', 'esc(c.name)', 'esc(v.bill_id)', 'esc(v.position)'].forEach(function (frag) {
  if (tcode.indexOf(frag) !== -1) ok('esc(): ' + frag);
  else no('esc()', frag + ' not escaped');
});
/* no photo hotlinking / invented imagery — only documented source URLs */
(function () {
  var urls = tcode.match(/'https?:\/\/[^']+'/g) || [];
  var bad = urls.filter(function (u) {
    return u.indexOf('disclosures-clerk.house.gov') === -1 &&
           u.indexOf('quantengines.com') === -1 &&
           u.indexOf('clerk.house.gov') === -1 &&
           u.indexOf('www.senate.gov') === -1;
  });
  if (!bad.length) ok('only documented source URLs, no hotlinking');
  else no('hotlink', 'unexpected URLs: ' + bad.join(','));
})();
/* no auto-mount */
if (!/PFTradesTab\.mount\(/.test(tcode.replace(/window\.PFTradesTab = \{ mount: mount \}/, '')))
  ok('no auto-mount (mount only exposed, never called)');
else no('auto-mount', 'module calls PFTradesTab.mount itself');
/* mandatory verbatim footer (CEO 2026-10-05) */
var FOOT = 'Public records shown side by side. A contribution/trade does not prove it caused a vote.';
if (tsrc.indexOf(FOOT) !== -1) ok('verbatim footer sentence on the tab');
else no('footer', 'verbatim sentence missing from trades-tab.js');
if (/Sources: /.test(tcode) && /Figures as of /.test(tcode)) ok('footer fills Sources + Figures-as-of');
else no('footer fill', 'sources/date fill-in missing');
var PFOOT = 'A CONTRIBUTION/TRADE DOES NOT PROVE IT CAUSED A VOTE';
if (psrc.indexOf(PFOOT) !== -1 && psrc.indexOf('PUBLIC RECORDS SHOWN SIDE BY SIDE') !== -1)
  ok('verbatim footer on the phq-trades painter');
else no('painter footer', 'verbatim footer missing from painter');
if (psrc.indexOf('FIGURES AS OF') !== -1) ok('painter footer fills retrieval date');
else no('painter date', 'missing');
/* HOLD: no trade-before-vote inference (CEO 2026-10-05) — checked on the
   comment-stripped view, so HOLD documentation comments don't trip it */
['before the vote', 'days before', 'traded before', 'ahead of the vote', 'juxtapos'].forEach(function (w) {
  if (tcode.toLowerCase().indexOf(w) === -1 && pcode.toLowerCase().indexOf(w) === -1)
    ok('HOLD respected, no "' + w + '" inference copy');
  else no('HOLD', 'inference language present: "' + w + '"');
});
/* range discipline: no midpoint, no exact-amount presentation */
['midpoint', 'mid-point'].forEach(function (w) {
  if (tcode.toLowerCase().indexOf(w) === -1 && pcode.toLowerCase().indexOf(w) === -1)
    ok('no "' + w + '" anywhere');
  else no('range discipline', w + ' present');
});
if (tcode.indexOf('amount_range') !== -1) ok('tab presents amount_range (never exact)');
else no('amount_range', 'missing');
/* no XP code on the tab */
['xpGrant', 'create_share', 'pf-xp-granted', 'xp_grant'].forEach(function (w) {
  if (tcode.indexOf(w) === -1) ok('no XP hook: ' + w);
  else no('XP code', w + ' present on the tab');
});
/* EIGA honest empty state */
if (tsrc.indexOf('EIGA') !== -1 && /pending/i.test(tsrc) && /CEO decision/i.test(tsrc))
  ok('EIGA honest empty state (pending CEO decision)');
else no('EIGA', 'empty state missing');
/* elements present */
['TRADES LOG', 'COMMITTEE ASSIGNMENTS', 'VOTE RECORD', 'Committee assignments not available.',
 'No STOCK Act trades on file for this member.', 'No vote records on file.'].forEach(function (s) {
  if (tsrc.indexOf(s) !== -1) ok('element copy: "' + s.slice(0, 34) + '"');
  else no('element', 'missing: ' + s);
});
/* share rides existing plumbing */
if (tcode.indexOf("PF.PHQShare.share(PAINTER, pd)") !== -1 ||
    tcode.indexOf('PHQ.share(PAINTER, pd)') !== -1) ok('SHARE rides existing PF.PHQShare');
else no('share plumbing', 'not routed through PF.PHQShare');
/* copy/CTA standards */
if (psrc.indexOf('THEIR PORTFOLIO') !== -1) ok('THEIR PORTFOLIO header copy');
else no('header copy', 'missing');
if (psrc.indexOf('JOIN THE FIGHT.') !== -1) ok('JOIN THE FIGHT. CTA standard');
else no('CTA', 'missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (tsrc.toLowerCase().indexOf(w) === -1 && psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(tsrc) && !/\bShane\b/.test(pcode)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
function has(p, s) { return read(p).indexOf(s) !== -1; }
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/trades-tab.js'"))
  ok('trades-tab.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfTradesTabDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfTradesTabDone missing from bundle-pages.js');

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
  el.querySelector = function (sel) {
    /* minimal: find first descendant whose innerHTML marker matches */
    var found = null;
    (function walk(n) {
      if (found) return;
      (n.children || []).forEach(function (c) {
        if (found) return;
        if ((c._innerHTML || '').indexOf(sel) !== -1 ||
            (c._attrs && Object.keys(c._attrs).some(function (k) { return c._attrs[k] === sel; }))) found = c;
        walk(c);
      });
    })(el);
    return found;
  };
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
  vm.runInContext(read(TAB_MOD), sb, { filename: 'trades-tab.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function allHtml(el) {
  var h = (el._innerHTML || '') + '\n' + (el.textContent || '');
  (el.children || []).forEach(function (c) { h += '\n' + allHtml(c); });
  return h;
}

/* Fixtures: the two trade rows mirror the real v85 seed (A000372 INTU buy,
   A000055 GSK sell) — public-record values, not invented. */
var TRADES_OK = {
  ok: true, bioguide_id: 'A000372',
  member: { name: 'Rick W. Allen', chamber: 'rep', party: 'R', state: 'GA',
    committees: [
      { code: 'HSIF', name: 'House Committee on Energy and Commerce', chamber: 'house', role: null },
      { code: 'HSIF15', name: 'House Committee on Energy and Commerce — Subcommittee on Oversight and Investigations', chamber: 'house', role: null }
    ] },
  source: 'U.S. House Clerk (official STOCK Act filing)',
  retrieved_at: '2026-10-05',
  trades: [
    { ticker: 'INTU', asset_name: 'Intuit Inc. Common Stock (INTU) [ST]', tx_type: 'buy',
      amount_low: 1001, amount_high: 15000, amount_range: '$1,001 – $15,000',
      tx_date: '2025-06-20', disclosure_date: '2025-07-15', days_to_disclose: 25,
      late_filing: false,
      filing_url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20030608.pdf',
      source: 'U.S. House Clerk (official STOCK Act filing)', retrieved_at: 1791201600 },
    { ticker: 'ROL', asset_name: 'Rollins, Inc. Common Stock (ROL) [ST]', tx_type: 'buy',
      amount_low: 15001, amount_high: 50000, amount_range: '$15,001 – $50,000',
      tx_date: '2024-12-12', disclosure_date: '2025-01-16', days_to_disclose: 35,
      late_filing: false,
      filing_url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20026537.pdf',
      source: 'U.S. House Clerk (official STOCK Act filing)', retrieved_at: 1791201600 }
  ]
};
var TRADES_EMPTY = { ok: true, empty: true, trades: [], member: null,
  reason: 'no trades on file for this member' };
var VOTES_OK = {
  ok: true, bioguide_id: 'A000372', vote_count: 2,
  votes: [
    { vote_id: 'h-119-2025-145', position: 'Yea', issue_tag: null, party: 'R', chamber: 'house',
      vote_date: '2025-05-22', question: 'On Passage', bill_id: 'H.R.1',
      bill_title: 'One Big Beautiful Bill Act', result: 'Passed' },
    { vote_id: 'h-119-2025-190', position: 'Yea', issue_tag: null, party: 'R', chamber: 'house',
      vote_date: '2025-07-03', question: 'On Motion to Concur', bill_id: 'H.R.1',
      bill_title: 'One Big Beautiful Bill Act', result: 'Passed' }
  ]
};
var PFIX_TRADES = {
  name: 'Rick W. Allen', chamber: 'rep', party: 'R', state: 'GA',
  tradeCount: 2,
  topTickers: [{ ticker: 'INTU', n: 1 }, { ticker: 'ROL', n: 1 }],
  dateFrom: '2024-12-12', dateTo: '2025-06-20',
  sources: [{ label: 'U.S. House Clerk (official STOCK Act filing)',
              url: 'https://disclosures-clerk.house.gov/' }],
  asOf: '2026-10-05'
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with phq-trades painter registered)');
  if (PHQ.ids.indexOf('phq-trades') !== -1 && PHQ.ids.length === 6)
    ok('ids list carries 6 painters incl. phq-trades');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.registered['phq-trades'] === 'function') ok('setPoster registered: phq-trades');
  else no('registration', 'phq-trades not registered with PFShare');

  /* --- painter: full fixture --- */
  var cv = PHQ.paint('phq-trades', PFIX_TRADES);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('trades painter', 'no 1080x1350 canvas');
  else {
    ok('trades painter mounts 1080x1350');
    if (hasFrag(cv, 'THEIR PORTFOLIO')) ok('trades badge');
    else no('badge', 'missing');
    if (hasText(cv, 'RICK W. ALLEN')) ok('trades member name');
    else no('name', 'missing');
    if (hasFrag(cv, 'U.S. HOUSE') && hasFrag(cv, 'R') && hasFrag(cv, 'GA'))
      ok('trades chamber/party/state line');
    else no('chamber line', 'missing');
    if (hasText(cv, '2 STOCK ACT TRADES ON FILE')) ok('trades headline count');
    else no('count', 'missing: ' + joined(cv).slice(0, 400));
    if (hasText(cv, 'INTU \u00d71') && hasText(cv, 'ROL \u00d71')) ok('top tickers by trade count');
    else no('tickers', 'missing');
    if (hasFrag(cv, 'DEC 12, 2024') && hasFrag(cv, 'JUN 20, 2025')) ok('trades date span');
    else no('span', 'missing');
    /* mandatory verbatim footer, sources + date filled in */
    if (hasFrag(cv, 'PUBLIC RECORDS SHOWN SIDE BY SIDE')) ok('painter: footer sentence (verbatim)');
    else no('footer sentence', 'missing');
    if (hasFrag(cv, 'A CONTRIBUTION/TRADE DOES NOT PROVE IT CAUSED A VOTE')) ok('painter: no-inference clause');
    else no('footer clause', 'missing');
    if (hasFrag(cv, 'DISCLOSURES-CLERK.HOUSE.GOV')) ok('painter: actual source link filled in');
    else no('footer source', 'missing');
    if (hasFrag(cv, 'FIGURES AS OF OCT 5, 2026')) ok('painter: retrieval date filled in');
    else no('footer date', 'missing');
    /* range discipline: no dollar figures on the card at all */
    var dollars = textsOf(cv).filter(function (t) { return /\$[\d,]+/.test(t); });
    if (!dollars.length) ok('painter: no dollar figures (counts/tickers only)');
    else no('dollar figures', 'found on card: ' + dollars.join(' | '));
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true)
      ok('trades callsign stamp + _pfStamped');
    else no('stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('trades bottom stack (deep link + CTA + date)');
    else no('bottom', 'stack incomplete');
  }
  /* --- painter: sparse data degrades, never throws --- */
  try {
    cv = PHQ.paint('phq-trades', {});
    if (cv && hasText(cv, '0 STOCK ACT TRADES ON FILE')) ok('trades empty record: 0 trades headline');
    else no('degrade', 'empty record headline wrong');
  } catch (e) { no('degrade', 'threw on empty data: ' + (e && e.message)); }
  /* --- painter: no-callsign, no blank stamp --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  cv = env2.sb.PF.PHQShare.paint('phq-trades', PFIX_TRADES);
  if (!hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true) ok('trades no-callsign: no blank stamp');
  else no('no-cs', 'blank stamp painted');
  /* --- painter: layout guard (clean gap above bottom stack) --- */
  (function () {
    var c = PHQ.paint('phq-trades', PFIX_TRADES);
    var rs = c._recs || [], bad = [], link = null, date = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
      if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
      if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    }
    if (!bad.length) ok('trades: clean gap above bottom stack');
    else no('gap', 'content in stack gap: ' + bad.join(' | '));
    if (link === 1222) ok('trades: deep link at H-128');
    else no('link y', 'deep link y=' + link);
    if (date === 1302) ok('trades: date line at H-48');
    else no('date y', 'date y=' + date);
  })();
  /* --- painter: dense fixture (4 tickers) keeps the gap --- */
  (function () {
    var dense = JSON.parse(JSON.stringify(PFIX_TRADES));
    dense.tradeCount = 9;
    dense.topTickers = [{ ticker: 'AAPL', n: 3 }, { ticker: 'TSLA', n: 2 },
      { ticker: 'NVDA', n: 2 }, { ticker: 'AMD', n: 2 }];
    dense.name = 'Alexandria Ocasio-Cortez With A Very Long Name Indeed';
    var c = PHQ.paint('phq-trades', dense);
    var rs = c._recs || [], bad = [];
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
    }
    if (!bad.length) ok('trades dense: no collision with bottom stack');
    else no('dense gap', 'content in stack gap: ' + bad.join(' | '));
  })();
}

/* --- PFTradesTab.mount: happy path (two JSONP legs) --- */
function mountWith(tradesResp, votesResp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFTradesTab.mount('A000372', container);
  function answerLast(resp, actionFrag) {
    var sc = e.captured.scripts[e.captured.scripts.length - 1];
    var m = String(sc.src || '').match(/callback=([^&]+)/);
    if (!m) { no('jsonp', 'callback param missing: ' + sc.src); return false; }
    if (String(sc.src).indexOf(actionFrag) === -1) {
      no('jsonp', 'expected ' + actionFrag + ', got: ' + sc.src); return false;
    }
    e.sb[m[1]](resp);
    return true;
  }
  if (!answerLast(tradesResp, 'action=trades_legislator')) return null;
  /* the tab fires scorecard_get after the first render */
  if (votesResp !== undefined) {
    if (!answerLast(votesResp, 'action=scorecard_get')) return null;
  }
  return { env: e, container: container, mountRet: r };
}
(function () {
  var t = mountWith(TRADES_OK, VOTES_OK);
  if (!t) return;
  if (t.mountRet !== true) no('mount ret', 'expected true');
  else ok('mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-tr') { no('tab root', 'missing .pf-tr'); return; }
  ok('tab root rendered');
  var html = allHtml(root);
  /* element 1: trades log */
  if (html.indexOf('TRADES LOG') !== -1 && html.indexOf('INTU') !== -1 && html.indexOf('ROL') !== -1)
    ok('element 1: trades log with tickers');
  else no('trades log', 'missing');
  if (html.indexOf('$1,001 \u2013 $15,000') !== -1 && html.indexOf('$15,001 \u2013 $50,000') !== -1)
    ok('element 1: amount RANGES shown ($X \u2013 $Y)');
  else no('ranges', 'amount_range missing from tab');
  if (html.indexOf('VIEW FILING') !== -1 &&
      html.indexOf('disclosures-clerk.house.gov/public_disc/ptr-pdfs/2025/20030608.pdf') !== -1)
    ok('element 1: filing link per row');
  else no('filing link', 'missing');
  if (html.indexOf('25 days') !== -1) ok('element 1: days-to-disclose shown');
  else no('days', 'missing');
  /* element 2: committees */
  if (html.indexOf('COMMITTEE ASSIGNMENTS') !== -1 &&
      html.indexOf('House Committee on Energy and Commerce') !== -1)
    ok('element 2: committee assignments listed');
  else no('committees', 'missing');
  /* element 3: vote record */
  if (html.indexOf('VOTE RECORD') !== -1 && html.indexOf('H.R.1') !== -1 &&
      html.indexOf('YEA') !== -1)
    ok('element 3: vote record rendered from scorecard_get');
  else no('votes', 'missing: ' + html.slice(-400));
  /* element 4: EIGA */
  if (html.indexOf('EIGA DISCLOSURES') !== -1 && /pending/i.test(html) && /CEO decision/i.test(html))
    ok('element 4: EIGA honest empty state');
  else no('EIGA', 'missing');
  /* mandatory verbatim footer */
  if (html.indexOf('Public records shown side by side. A contribution/trade does not prove it caused a vote.') !== -1)
    ok('verbatim footer sentence on the tab');
  else no('footer', 'verbatim sentence missing from rendered tab');
  if (html.indexOf('https://disclosures-clerk.house.gov/') !== -1) ok('footer: actual source link');
  else no('footer link', 'missing');
  if (html.indexOf('Figures as of') !== -1 && html.indexOf('OCT 5, 2026') !== -1)
    ok('footer: retrieval date filled in');
  else no('footer date', 'missing');
  if (html.indexOf('https://clerk.house.gov/') !== -1) ok('footer: vote-record source link (house)');
  else no('footer votes link', 'missing');
  /* HOLD: no inference copy anywhere on the rendered tab */
  var low = html.toLowerCase();
  if (low.indexOf('before the vote') === -1 && low.indexOf('days before') === -1)
    ok('HOLD: no trade-before-vote inference copy on the tab');
  else no('HOLD', 'inference copy rendered');
  /* SHARE -> PF.PHQShare.share('phq-trades', {...}) via existing flow */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('click delegation', 'no click listener on tab root'); return; }
  ok('click delegation wired');
  click({ target: { getAttribute: function (k) { return k === 'data-tr-share' ? '1' : null; } } });
  var sh = t.env.shareCalls[0];
  if (t.env.shareCalls.length === 1 && sh && sh.id === 'phq-trades' &&
      sh.cv && (sh.cv._recs || []).length > 10)
    ok('SHARE routes to PF.PHQShare.share with painted trades canvas');
  else no('share', 'routing failed');
  var scv = sh && sh.cv;
  if (scv && hasText(scv, 'RICK W. ALLEN') && hasText(scv, 'INTU \u00d71'))
    ok('shared poster carries endpoint data (name + top tickers)');
  else no('poster data', 'poster missing endpoint fields');
  if (scv && hasFrag(scv, 'A CONTRIBUTION/TRADE DOES NOT PROVE IT CAUSED A VOTE'))
    ok('shared poster carries the verbatim footer');
  else no('poster footer', 'missing');
})();

/* --- mount: empty trades -> honest empty states, tab still renders --- */
(function () {
  var t = mountWith(TRADES_EMPTY, VOTES_OK);
  if (!t) return;
  var html = allHtml(t.container);
  if (t.container.style.display !== 'none' &&
      html.indexOf('No STOCK Act trades on file for this member.') !== -1)
    ok('empty: honest trades empty state (tab stays)');
  else no('empty trades', 'missing or tab hidden');
  if (html.indexOf('Committee assignments not available.') !== -1)
    ok('empty: committees honest empty state');
  else no('empty committees', 'missing');
})();

/* --- mount: late-filing badge --- */
(function () {
  var late = JSON.parse(JSON.stringify(TRADES_OK));
  late.trades[0].late_filing = true;
  late.trades[0].days_to_disclose = 61;
  var t = mountWith(late, VOTES_OK);
  if (!t) return;
  var html = allHtml(t.container);
  if (html.indexOf('LATE FILING') !== -1 && html.indexOf('61 days') !== -1)
    ok('late-filing badge renders (>45 days)');
  else no('late badge', 'missing');
})();

/* --- mount: scorecard down -> votes honest empty, footer still renders --- */
(function () {
  var t = mountWith(TRADES_OK, null);
  if (!t) return;
  var html = allHtml(t.container);
  if (html.indexOf('No vote records on file.') !== -1)
    ok('votes fail-soft: honest empty state');
  else no('votes fail-soft', 'missing');
  if (html.indexOf('Public records shown side by side.') !== -1)
    ok('footer still renders when votes fail');
  else no('footer on votes-fail', 'missing');
})();

/* --- mount: fail-soft paths --- */
(function () {
  var t = mountWith({ ok: false }, undefined);
  if (t && t.container.style.display === 'none' && t.container.children.length === 0)
    ok('fail-soft: {ok:false} hides the section entirely');
  else no('fail-soft ok:false', 'section not hidden');
})();
(function () {
  var t = mountWith(null, undefined);
  if (t && t.container.style.display === 'none')
    ok('fail-soft: endpoint down (null) hides the section entirely');
  else no('fail-soft null', 'section not hidden');
})();

/* --- mount: bad args --- */
(function () {
  var e = makeEnv();
  var W = e.sb.PFTradesTab;
  if (W.mount('', e.sb.document.createElement('div')) === false &&
      W.mount('A000372', null) === false)
    ok('mount fail-soft on missing bioguideId/container (returns false)');
  else no('mount args', 'did not fail closed');
})();

/* --- kill switches honored --- */
(function () {
  var e = makeEnv({ search: '?pf_off=trades-tab' });
  if (typeof e.sb.PFTradesTab === 'undefined') ok('kill: ?pf_off=trades-tab prevents mount API');
  else no('kill trades-tab', 'PFTradesTab exposed despite kill');
})();
(function () {
  var e = makeEnv({ search: '?pf_off=trades-card' });
  var t = (function () {
    var container = e.sb.document.createElement('div');
    var r = e.sb.PFTradesTab.mount('A000372', container);
    var sc = e.captured.scripts[e.captured.scripts.length - 1];
    var m = String(sc.src || '').match(/callback=([^&]+)/);
    if (m) e.sb[m[1]](TRADES_OK);
    return { env: e, container: container };
  })();
  var html = allHtml(t.container);
  if (html.indexOf('data-tr-share') === -1 && html.indexOf('SHARE PORTFOLIO CARD') === -1)
    ok('kill: ?pf_off=trades-card hides the SHARE button');
  else no('kill trades-card', 'SHARE button rendered despite kill');
  /* painter-level guard: go() refuses phq-trades */
  var got = e.sb.PF.PHQShare.share('phq-trades', PFIX_TRADES);
  if (got === false && e.shareCalls.length === 0) ok('kill: painter go() refuses phq-trades');
  else no('painter kill', 'go() did not refuse');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
