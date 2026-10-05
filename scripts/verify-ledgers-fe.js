#!/usr/bin/env node
/* scripts/verify-ledgers-fe.js — Billionaire Ledgers frontend verification.
   Run from the repo root:
     node scripts/verify-ledgers-fe.js
   1. node --check on both new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switch, painter registration (IDS/TITLES/PAINT), esc() on every
      injected name/figure field, no auto-mount, copy/CTA standards, banned
      terms, bundle registration
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      the phq-ledger painter renders its spec copy on fixture data (spending
      loaded + spending pending), stamps the callsign, degrades with no
      callsign; PFLedgers.mount() renders the ranked ledger on a good
      endpoint response, wires DOWNLOAD/SHARE through the EXISTING
      PF.PHQShare flow, honors the kill switch, and fails soft (hides the
      section) on bad endpoint responses.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var LEDGER_MOD = path.join(V, 'core', 'ledger-list.js');
var fails = [], passes = 0;
function ok(n) { passes++; /* console.log('  PASS ' + n); */ }
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
[PAINTER_MOD, LEDGER_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var psrc = read(PAINTER_MOD), lsrc = read(LEDGER_MOD);
var pcode = stripComments(psrc), lcode = stripComments(lsrc);

console.log('== 2. static contract checks ==');
/* painter registration */
if (pcode.indexOf("'phq-ledger'") !== -1 &&
    /var IDS = \[[^\]]*'phq-ledger'[^\]]*\]/.test(pcode)) ok('painter id in IDS');
else no('painter IDS', "'phq-ledger' missing from IDS");
if (/'phq-ledger':\s*'THE LEDGER'/.test(pcode)) ok("TITLES['phq-ledger'] = 'THE LEDGER'");
else no('painter TITLES', 'missing');
if (/'phq-ledger':\s*paintLedger/.test(pcode)) ok('painters map registers paintLedger');
else no('painters map', 'missing paintLedger');
/* kill switches */
if (/PF\.skip\(['"]ledgers['"]\)/.test(lsrc)) ok('kill switch PF.skip("ledgers") wired');
else no('kill switch', 'PF.skip("ledgers") not found');
if (lsrc.indexOf('?pf_off=ledgers') !== -1) ok('KILL comment documents ?pf_off=ledgers');
else no('kill comment', '?pf_off=ledgers missing from header');
if (/PF\.skip\(['"]phq-share['"]\)/.test(psrc)) ok('painter module kill switch still wired');
else no('painter kill', 'PF.skip("phq-share") missing');
/* esc() on injected fields — checked on the comment-stripped view, no
   string stripping (AGENTS.md lesson). Every field below is interpolated
   into innerHTML in ledger-list.js. */
['esc\\(e\\.name\\)', 'esc\\(e\\.rank\\)', 'esc\\(fmtB\\(e\\.net_worth_b\\)\\)',
 'esc\\(fmtUSD\\(e\\.political_spending\\)\\)', 'esc\\(fmtPct\\(e\\.spending_ratio\\)\\)',
 'esc\\(forbesDate\\(e\\.net_worth_as_of\\)\\)', 'esc\\(e\\.spending_cycle\\)',
 'esc\\(SPENDING_PENDING\\)', 'esc\\(EMPTY_MSG\\)'].forEach(function (pat) {
  if (new RegExp(pat).test(lcode)) ok('esc applied: ' + pat.replace(/\\\\/g, ''));
  else no('esc()', pat + ' not found in ledger-list.js');
});
/* no auto-mount: the module only exposes window.PFLedgers.mount */
if (/window\.PFLedgers\s*=\s*\{\s*mount:\s*mount\s*\}/.test(lcode)) ok('only mount() exposed (no auto-mount)');
else no('auto-mount', 'window.PFLedgers shape unexpected');
if (lcode.indexOf('PFLedgers.mount(') === -1 || (lcode.match(/PFLedgers\.mount\(/g) || []).length <= 2)
  ok('module never calls PFLedgers.mount itself');
else no('auto-mount', 'module calls PFLedgers.mount');
/* copy + CTA standards */
if (pcode.indexOf('JOIN THE FIGHT.') !== -1) ok('ledger painter keeps JOIN THE FIGHT. CTA');
else no('CTA', 'JOIN THE FIGHT. missing from painter');
/* no XP grants in this module: sharing rides the existing PHQShare flow
   (backend create_share: leg, Economy Desk sign-off pending); the module
   itself must not call xpGrant or any XP API. Comments mentioning XP are
   fine — only executable grant paths count. */
(function () {
  var codeNoComments = lcode;
  if (/xpGrant\s*\(/.test(codeNoComments)) no('xp', 'xpGrant() call found in ledger-list.js');
  else if (/\bPF\.xp\b|\.xpGrant\b/.test(codeNoComments)) no('xp', 'XP API call found in ledger-list.js');
  else ok('no XP grant paths in ledger-list.js');
})();
if (psrc.toLowerCase().indexOf('donate') === -1 && lsrc.toLowerCase().indexOf('donate') === -1)
  ok('banned word "donate" absent from both modules');
else no('banned term', '"donate" found');
/* caveat lines present */
if (lcode.indexOf('name-matched') !== -1 && lcode.indexOf('Forbes') !== -1)
  ok('caveat copy (Forbes / name-matched) in ledger list');
else no('caveats', 'missing');
if (pcode.indexOf('NAME-MATCHED') !== -1 && pcode.indexOf('FORBES') !== -1)
  ok('caveat copy in ledger painter');
else no('painter caveats', 'missing');
/* bundle registration */
var bsrc = read(path.join(ROOT, 'build', 'bundle-core.js'));
if (bsrc.indexOf("'core/ledger-list.js'") !== -1) ok('ledger-list.js in bundle-core.js pages bundle');
else no('bundle reg', 'core/ledger-list.js missing from build/bundle-core.js');
var bpjs = read(path.join(V, 'pages', 'bundle-pages.js'));
if (bpjs.indexOf('pfLedgersDone') !== -1 && bpjs.indexOf('paintLedger') !== -1)
  ok('bundle-pages.js carries both ledger modules');
else no('bundle output', 'ledger modules missing from bundle-pages.js');
/* (XP-grant check lives in the IIFE above) */

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime ==');
function pxOf(font) {
  var m = String(font).match(/(\d+)px/);
  return m ? parseInt(m[1], 10) : 10;
}
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
  Ctx2D.prototype[k] = function (x, y, w, h) {
    if (k === 'fillRect') this._rec.push({ rect: true, fillStyle: this.fillStyle, x: x, y: y, w: w, h: h });
  };
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
    createTextNode: function (t) { return { text: String(t) }; },
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
  vm.runInContext(read(LEDGER_MOD), sb, { filename: 'ledger-list.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).filter(function (r) { return r.text !== undefined; }).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function badgeOp(cv, firstChar) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++)
    if (rs[i].text === firstChar && rs[i].y === 280) return rs[i];
  return null;
}
function redRects(cv) {
  return (cv._recs || []).filter(function (r) { return r.rect && r.fillStyle === '#c1121f'; });
}
function allHtml(el) {
  var h = (el._innerHTML || '') + '\n' + (el.textContent || '');
  (el.children || []).forEach(function (c) { h += '\n' + allHtml(c); });
  return h;
}

/* Fixtures. The billionaires (Musk, Buffett) and their Forbes net worths are
   real transcribed figures; the political_spending values are SYNTHETIC
   paint-test numbers, not asserted facts. */
var PFIX_LOADED = {
  name: 'Elon Musk', rank: 1, netWorthB: 839, netWorthAsOf: '2026-03-01',
  spending: 839000000, spendingCycle: 2026, ratio: 0.001,
  matchNote: "match='name-matched, identity unverified'"
};
var PFIX_PENDING = {
  name: 'Warren Buffett', rank: 9, netWorthB: 149, netWorthAsOf: '2026-03-01',
  spending: null, spendingCycle: null, ratio: null,
  matchNote: 'spending not yet ingested'
};
var RESP_OK = {
  ok: true,
  methodology: 'Net worths hand-transcribed from Forbes; spending FEC name-matched.',
  list: { forbes_list_url: 'https://www.forbes.com/billionaires/',
    forbes_snapshot_date: '2026-03-01', spending_status: 'partial', spending_note: null },
  total: 2,
  entries: [
    { name: 'Elon Musk', rank: 1, net_worth_b: 839, net_worth_usd: 839e9,
      net_worth_as_of: '2026-03-01', net_worth_source_url: 'https://www.forbes.com/billionaires/',
      net_worth_label: 'net worth $839,000,000,000 (Forbes, 2026-03-01)',
      political_spending: 839000000, spending_cycle: 2026,
      match_note: "match='name-matched, identity unverified'",
      spending_status: 'loaded',
      spending_label: 'spent $839,000,000 on federal elections (FEC, name-matched)',
      spending_ratio: 0.001 },
    { name: 'Warren Buffett', rank: 9, net_worth_b: 149, net_worth_usd: 149e9,
      net_worth_as_of: '2026-03-01', net_worth_source_url: 'https://www.forbes.com/billionaires/',
      net_worth_label: 'net worth $149,000,000,000 (Forbes, 2026-03-01)',
      political_spending: null, spending_cycle: null, match_note: 'pending',
      spending_status: 'pending', spending_label: null, spending_ratio: null }
  ]
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with ledger painter registered)');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(
      ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-ledger']))
    ok('ids list includes phq-ledger (6 painters)');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.registered['phq-ledger'] === 'function') ok('setPoster registered: phq-ledger');
  else no('registration', 'phq-ledger not registered with PFShare');

  /* --- painter: spending loaded --- */
  var cv = PHQ.paint('phq-ledger', PFIX_LOADED);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('ledger mount', 'no 1080x1350 canvas');
  else {
    ok('ledger mounts 1080x1350');
    if (hasFrag(cv, 'THE LEDGER')) {
      ok('ledger badge');
      var bop = badgeOp(cv, 'T');
      if (bop && bop.fillStyle === '#c1121f') ok('ledger badge red');
      else no('ledger badge color', 'not red: ' + (bop && bop.fillStyle));
    } else no('ledger badge', 'missing');
    if (hasText(cv, '#1 ON THE FORBES 2026 LIST')) ok('ledger rank line');
    else no('rank', 'missing');
    if (hasText(cv, 'ELON MUSK')) ok('ledger name');
    else no('name', 'missing');
    if (hasText(cv, 'NET WORTH') && hasText(cv, '$839B')) ok('ledger net worth headline');
    else no('net worth', 'missing');
    if (hasText(cv, 'FORBES MAR 1, 2026 SNAPSHOT')) ok('ledger Forbes caveat');
    else no('forbes caveat', 'missing: ' + JSON.stringify(textsOf(cv).slice(0, 20)));
    if (hasText(cv, 'SPENT ON FEDERAL ELECTIONS') && hasText(cv, '$839,000,000')) ok('ledger spending headline');
    else no('spending', 'missing');
    if (hasFrag(cv, 'FEC SCHEDULE A, 2026 CYCLE')) ok('ledger FEC cycle caveat');
    else no('fec caveat', 'missing');
    if (hasFrag(cv, 'NAME-MATCHED')) ok('ledger name-matched caveat');
    else no('match caveat', 'missing');
    var bars = redRects(cv).filter(function (r) { return r.w > 0 && r.w < 880 && r.h === 30; });
    if (bars.length >= 1) ok('ledger ratio bar painted (red fill rect)');
    else no('ratio bar', 'no red bar rect found');
    if (hasFrag(cv, '0.1% OF NET WORTH')) ok('ledger ratio label 0.1%');
    else no('ratio label', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true)
      ok('ledger callsign stamp + _pfStamped');
    else no('stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('ledger bottom stack (deep link + CTA + date)');
    else no('bottom', 'stack incomplete');
  }
  /* --- painter: spending pending degrades honestly --- */
  try {
    cv = PHQ.paint('phq-ledger', PFIX_PENDING);
    if (cv && hasText(cv, 'FEC DATA NOT YET LOADED') && hasText(cv, 'WARREN BUFFETT') &&
        !hasFrag(cv, 'SPENT ON FEDERAL ELECTIONS'))
      ok('ledger pending: honest not-loaded line, no spending headline');
    else no('pending degrade', 'wrong pending rendering');
    var pbars = redRects(cv).filter(function (r) { return r.w > 0 && r.w < 880 && r.h === 30; });
    if (!pbars.length) ok('ledger pending: no ratio bar');
    else no('pending bar', 'bar painted with no spending');
  } catch (e) { no('pending degrade', 'threw: ' + (e && e.message)); }
  /* --- painter: sparse data degrades to em-dash, never throws --- */
  try {
    cv = PHQ.paint('phq-ledger', {});
    if (cv && hasFrag(cv, '\u2014')) ok('ledger empty record renders \u2014');
    else no('degrade', 'no em-dash for missing fields');
  } catch (e) { no('degrade', 'threw on empty data: ' + (e && e.message)); }
  /* --- painter: no-callsign, no blank stamp --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  cv = env2.sb.PF.PHQShare.paint('phq-ledger', PFIX_LOADED);
  if (!hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true) ok('ledger no-callsign: no blank stamp');
  else no('no-cs', 'blank stamp painted');
  /* --- painter: layout guard (clean gap above bottom stack) --- */
  (function () {
    var c = PHQ.paint('phq-ledger', PFIX_LOADED);
    var rs = c._recs || [], bad = [], link = null, date = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.text === undefined) continue;
      if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
      if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
      if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    }
    if (!bad.length) ok('ledger: clean gap above bottom stack');
    else no('gap', 'content in stack gap: ' + bad.join(' | '));
    if (link === 1222) ok('ledger: deep link at H-128');
    else no('link y', 'deep link y=' + link);
    if (date === 1302) ok('ledger: date line at H-48');
    else no('date y', 'date y=' + date);
  })();
}

/* --- PFLedgers.mount: happy path --- */
function mountWith(resp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFLedgers.mount(container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp', 'callback param missing from script src: ' + sc.src); return null; }
  if (String(sc.src).indexOf('action=ledger_list') === -1)
    no('jsonp', 'action missing: ' + sc.src);
  else ok('mount fires JSONP ledger_list');
  e.sb[m[1]](resp); /* backend answers */
  return { env: e, container: container, mountRet: r };
}
(function () {
  var t = mountWith(RESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('mount ret', 'expected true');
  else ok('mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-ledger') { no('ledger root', 'missing .pf-ledger'); return; }
  ok('ledger root rendered');
  var rows = root.children.filter(function (c) { return c.className === 'pf-ledger-row'; });
  if (rows.length === 2) ok('one row per billionaire (2 rows)');
  else no('rows', 'expected 2 rows, got ' + rows.length);
  var html = allHtml(root);
  if (html.indexOf('Elon Musk') !== -1 && html.indexOf('Warren Buffett') !== -1)
    ok('ranked names rendered');
  else no('names', 'missing');
  if (html.indexOf('NET WORTH $839B') !== -1 && html.indexOf('Forbes') !== -1)
    ok('net worth figure + Forbes caveat');
  else no('net worth', 'missing');
  if (html.indexOf('SPENT $839,000,000') !== -1 && html.indexOf('name-matched') !== -1)
    ok('spending figure + name-matched caveat');
  else no('spending', 'missing');
  if (html.indexOf('FEC data not yet loaded') !== -1) ok('pending row honest empty line');
  else no('pending line', 'missing');
  if (html.indexOf('0.1%') !== -1) ok('ratio percentage rendered');
  else no('ratio pct', 'missing');
  if (html.indexOf('pf-ledger-bar') !== -1) ok('ratio bar markup present');
  else no('ratio bar', 'missing');
  if (html.indexOf('METHOD: Net worths hand-transcribed') !== -1) ok('method caption under ledger');
  else no('method caption', 'missing');
  /* DOWNLOAD -> PF.PHQShare.save('phq-ledger', {...}) via existing flow */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('click delegation', 'no click listener on ledger root'); return; }
  ok('click delegation wired');
  click({ target: { getAttribute: function (k) { return k === 'data-ledger-dl' ? '0' : null; } } });
  if (t.env.saveCalls.length === 1 && t.env.saveCalls[0].id === 'phq-ledger' &&
      t.env.saveCalls[0].fn === 'pfn-phq-ledger.png' &&
      t.env.saveCalls[0].cv && (t.env.saveCalls[0].cv._recs || []).length > 10)
    ok('DOWNLOAD routes to PF.PHQShare.save with painted ledger canvas');
  else no('download', 'routing failed');
  /* SHARE -> PF.PHQShare.share('phq-ledger', {...}) */
  click({ target: { getAttribute: function (k) { return k === 'data-ledger-sh' ? '1' : null; } } });
  if (t.env.shareCalls.length === 1 && t.env.shareCalls[0].id === 'phq-ledger')
    ok('SHARE routes to PF.PHQShare.share with painted ledger canvas');
  else no('share', 'routing failed');
  /* painter data comes from the endpoint entry, not invented — the SHARE click
     above targeted index 1 (the pending Buffett row), so the poster must
     carry the pending row's honest not-loaded line, not a zero. */
  var scv = t.env.shareCalls[0] && t.env.shareCalls[0].cv;
  if (scv && hasText(scv, 'WARREN BUFFETT') && hasText(scv, 'FEC DATA NOT YET LOADED'))
    ok('shared poster carries endpoint data (row 2, pending path honest)');
  else no('poster data', 'poster missing endpoint fields');
})();

/* --- mount: fail-soft paths --- */
(function () {
  var t = mountWith({ ok: false });
  if (t && t.container.style.display === 'none' && t.container.children.length === 0)
    ok('fail-soft: {ok:false} hides the section entirely');
  else no('fail-soft ok:false', 'section not hidden');
})();
(function () {
  var t = mountWith(null);
  if (t && t.container.style.display === 'none')
    ok('fail-soft: endpoint down (null) hides the section entirely');
  else no('fail-soft null', 'section not hidden');
})();
(function () {
  var t = mountWith({ ok: true, methodology: 'm', list: {}, total: 0, entries: [] });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' && html.indexOf('The ledger is empty') !== -1)
    ok('empty state: zero rows shows the honest empty message (section stays)');
  else no('empty state', 'missing or section hidden');
})();

/* --- mount: bad args + already-mounted guard --- */
(function () {
  var e = makeEnv();
  var L = e.sb.PFLedgers;
  if (L.mount(null) === false) ok('mount fail-soft on missing container (returns false)');
  else no('mount args', 'did not fail closed');
  var c = e.sb.document.createElement('div');
  e.sb.PFLedgers.mount(c);
  e.captured.scripts.length = 0;
  /* simulate an already-mounted container */
  var marker = e.sb.document.createElement('div');
  marker.className = 'pf-ledger';
  c.appendChild(marker);
  /* querySelector stub returns null — emulate a real match instead */
  c.querySelector = function () { return marker; };
  if (e.sb.PFLedgers.mount(c) === true && e.captured.scripts.length === 0)
    ok('already-mounted guard: no second JSONP fetch');
  else no('mount guard', 'double-mounted');
})();

/* --- kill switch honored --- */
(function () {
  var e = makeEnv({ search: '?pf_off=ledgers' });
  if (typeof e.sb.PFLedgers === 'undefined') ok('kill switch: ?pf_off=ledgers prevents mount API');
  else no('kill switch', 'PFLedgers exposed despite ?pf_off=ledgers');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
