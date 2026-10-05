#!/usr/bin/env node
/* tests/money-macro.verify.cjs — FRED macro strip (V5) frontend verification.
   Run from the repo root:
     node tests/money-macro.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      window.PFMacro contract, master + per-section kills, never auto-mounts,
      esc() on every injected field, fred_macro rail name, SA/NSA chips,
      source stamps + click-through URLs, honest-empty + stale-note copy,
      no XP code, no commentary, data-driven (no fabricated series values),
      money-page.js SECTIONS order + mount guard, bundle registration,
      money-chunk no-duplication, inflation-tracker.js untouched
   3. Mocked-browser runtime tests (vm + minimal DOM stub): PFMacro.mount
      renders 8 cards from a fred_macro fixture in backend order (titles,
      values, periods, change labels, SA/NSA chips, source stamps,
      click-through hrefs); fred_live:false renders the honest empty;
      fred_live:true + empty series renders the awaiting-ingest state;
      a stale card suppresses its figure and shows the stale note;
      fail-soft on null; esc on injected fields; no-duplication guard;
      master + per-section kills.
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'core', 'money-macro.js');
var PAGE = path.join(ROOT, 'v1.4.3', 'core', 'money-page.js');
var BC = path.join(ROOT, 'build', 'bundle-core.js');
var MCHUNK = path.join(ROOT, 'v1.4.3', 'core', 'bundle-money.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles (money chunk carries the module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[MOD, PAGE, BC].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var src = read(MOD), code = stripComments(src);
var psrc = read(PAGE), pcode = stripComments(psrc);
var bcsrc = read(BC);

console.log('== 2. static contract checks ==');
/* PFMacro contract: never auto-mounts, exposes { mount } */
if (/window\.PFMacro\s*=\s*\{\s*mount\s*:\s*mount/.test(code)) ok('window.PFMacro exposes { mount }');
else no('PFMacro contract', 'window.PFMacro = { mount: mount } missing');
if (!/PFMacro\.mount\(/.test(code)) ok('money-macro.js never auto-mounts (only money-page calls PFMacro.mount)');
else no('auto-mount', 'PFMacro.mount invoked inside money-macro.js');
if (code.indexOf('pfMacroDone') !== -1) ok('no-duplication guard pfMacroDone present');
else no('guard', 'pfMacroDone missing');
/* kill switches */
if (/PF\.skip\(['"]money['"]\)\s*\|\|\s*PF\.skip\(['"]money-macro['"]\)/.test(code))
  ok("kill switch PF.skip('money') || PF.skip('money-macro') at module head");
else no('kill switch', 'master + per-section kill missing from module head');
if (src.indexOf('?pf_off=money-macro') !== -1) ok('KILL comment documents ?pf_off=money-macro');
else no('kill comment', '?pf_off=money-macro missing from header');
/* esc() on injected fields — locked contract fields (title/series_id/value_label/
   unit_label/period_label/change_label/change_pct_label/stale_note/source_url) */
['esc\\(s\\.title', 'esc\\(s\\.value_label', 'esc\\(s\\.unit_label',
 'esc\\(s\\.period_label', 'esc\\(s\\.stale_note', 'esc\\(s\\.source_url',
 'esc\\(change \\|\\|', 'esc\\(stamp\\(s\\)\\)'
].forEach(function (pat) {
  if (new RegExp(pat).test(code)) ok('esc applied: ' + pat.replace(/\\/g, ''));
  else no('esc()', pat + ' not found');
});
/* series_id rides into esc() through the source-stamp builder (stamp()),
   and the change labels ride in through the computed `change` local. */
/* rail + honesty surfaces */
if (src.indexOf("api('fred_macro'") !== -1) ok('fires the locked rail ?action=fred_macro');
else no('rail', "api('fred_macro') not found");
if (src.indexOf('fred_series') === -1) ok('no fred_series overreach in the strip module');
else no('rail', 'fred_series referenced — out of scope');
if (code.indexOf('sa_nsa') !== -1 && code.indexOf('pf-macro-sa') !== -1)
  ok('SA/NSA chip rendered per card (sa_nsa)');
else no('SA/NSA', 'chip missing');
if (src.indexOf('FRED') !== -1 && src.indexOf('RETRIEVED') !== -1 &&
    src.indexOf('https://fred.stlouisfed.org/series/') !== -1)
  ok('source stamp: "FRED · [series] · retrieved [date]" + FRED series URL');
else no('source stamp', 'missing');
if (src.indexOf('OFFICIAL DATA CONNECTING') !== -1 &&
    src.indexOf('Nothing here is estimated or seeded') !== -1)
  ok('honest empty state (fred_live:false): "OFFICIAL DATA CONNECTING", no mock data');
else no('honest empty', 'missing');
if (src.indexOf('FIRST REFRESH PENDING') !== -1)
  ok('distinct honest state for connected-but-awaiting-ingest');
else no('awaiting ingest', 'missing');
if (code.indexOf('s.stale') !== -1 && code.indexOf('s.stale_note') !== -1)
  ok('stale-suppression: figure hidden, backend stale_note shown');
else no('stale', 'stale handling missing');
if (src.indexOf('NEVER BLENDED WITH CROWDSOURCED DATA') !== -1)
  ok('official/crowdsourced separation labeled on the strip');
else no('separation', 'no-blend label missing');
/* data-driven: the module renders backend rows, never a hardcoded roster */
if (code.indexOf('j.series') !== -1 && /Array\.isArray\(j\.series\)/.test(code))
  ok('data-driven: renders j.series from the rail (Array.isArray guard)');
else no('data-driven', 'not consuming j.series');
if (!/var\s+(SERIES|CARDS|FIXTURE)\s*=/.test(code)) ok('no hardcoded series roster in the module');
else no('hardcoded', 'module carries its own series roster');
/* no XP */
if (!/\bxp\b/i.test(code.replace(/explain/gi, ''))) ok('zero XP: no xp code in money-macro.js');
else no('no-xp', 'xp reference found in money-macro.js');
/* no commentary — Psych reviews this surface; figures only. Checked on the
   comment-stripped view: the header comment's own "no what-this-means"
   rule is not a violation. */
var BANNED = ['what this means', 'means for you', 'why it matters', 'you should', 'buy now', 'sell now'];
var banFail = 0;
BANNED.forEach(function (w) {
  if (code.toLowerCase().indexOf(w) !== -1) { no('commentary', '"' + w + '" present in money-macro.js'); banFail++; }
});
if (!banFail) ok('no predictions / no "what this means" commentary in the module');
/* money-page.js mount point: MACRO strip FIRST in SECTIONS */
if (/var SECTIONS = \[\s*\{\s*key:\s*['"]macro['"],\s*kill:\s*['"]money-macro['"]/.test(pcode))
  ok('money-page.js: MACRO strip is the FIRST entry in SECTIONS');
else no('SECTIONS order', 'macro entry not first in SECTIONS');
if (/window\.PFMacro\)\s*PFMacro\.mount\(d\)/.test(pcode))
  ok('money-page.js: macro mount guarded by window.PFMacro');
else no('mount guard', 'PFMacro mount guard missing in money-page.js');
if (psrc.indexOf('money-macro \u00b7 money-fec-donors') !== -1)
  ok('money-page.js: money-macro listed in the kill-ids header comment');
else no('kill ids', 'money-macro missing from money-page header comment');
if (psrc.indexOf('straight from the Fed data vault') !== -1)
  ok('money-page.js: MACRO sub copy per spec');
else no('sub copy', 'missing');
/* bundle wiring */
if (bcsrc.indexOf("'core/money-macro.js'") !== -1)
  ok("core/money-macro.js registered in build/bundle-core.js MONEY_FILES");
else no('bundle registration', 'not in MONEY_FILES');
if (fs.existsSync(MCHUNK) && read(MCHUNK).indexOf('pfMacroDone') !== -1)
  ok('money chunk core/bundle-money.js carries the macro module (rebuilt)');
else no('money chunk', 'core/bundle-money.js missing pfMacroDone after rebuild');
var dup = ['pfMacroDone'].some(function (mk) {
  return read(path.join(ROOT, 'v1.4.3', 'core', 'bundle-core.js')).indexOf(mk) !== -1 ||
         read(path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js')).indexOf(mk) !== -1;
});
if (!dup) ok('no duplication: macro module only in bundle-money.js');
else no('duplication', 'pfMacroDone found in bundle-core.js or bundle-pages.js');
/* inflation-tracker.js is NOT touched by this change */
try {
  var d = cp.execSync('git diff --name-only -- v1.4.3/core/inflation-tracker.js',
    { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!d) ok('inflation-tracker.js untouched');
  else no('inflation-tracker', 'modified: ' + d);
} catch (e) { no('inflation-tracker', 'git check failed'); }

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime (DOM stub) ==');
function makeEl(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), children: [], _attrs: {},
    _listeners: {}, style: {}, parentNode: null, className: '',
    _innerHTML: '', textContent: '', id: ''
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
    try {
      var m = /^\.([\w-]+)$/.exec(String(sel));
      if (m && el._innerHTML.indexOf(m[1]) !== -1) return {};
    } catch (e) {}
    return null;
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  return el;
}
function makeEnv(opts) {
  opts = opts || {};
  var captured = { scripts: [], headChildren: [] };
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function () { return 0; };
  sb.navigator = {};
  sb.location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  var head = makeEl('head');
  var _headAppend = head.appendChild;
  head.appendChild = function (c) { captured.headChildren.push(c); return _headAppend(c); };
  sb.document = {
    createElement: function (t) {
      t = String(t).toLowerCase();
      var el = makeEl(t);
      if (t === 'script') captured.scripts.push(el);
      return el;
    },
    head: head,
    getElementById: function (id) {
      for (var i = 0; i < captured.headChildren.length; i++)
        if (captured.headChildren[i].id === id) return captured.headChildren[i];
      return null;
    },
    addEventListener: function () {}
  };
  sb.PF = {
    skip: function (silo) {
      var disabled = [];
      try {
        var m = String(sb.location.search).match(/[?&]pf_off=([^&]+)/);
        if (m) disabled = disabled.concat(decodeURIComponent(m[1]).split(','));
      } catch (e) {}
      return disabled.indexOf(silo) !== -1;
    }
  };
  sb.PF_BACKEND_URL = opts.backend === undefined ? 'https://pf-api.example.com/exec' : opts.backend;
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'money-macro.js' });
  return { sb: sb, captured: captured };
}
function cardCount(html) { return (html.match(/class="pf-macro-card"/g) || []).length; }

/* Fixture figures are synthetic paint-test values, not asserted facts.
   Shape tracks the locked contract (kit §3a): 8 cards in backend order. */
var RT = Date.UTC(2026, 9, 5); /* -> OCT 5, 2026 in fmtRetrieved */
function mkSeries() {
  return [
    { series_id: 'FEDFUNDS', title: 'FED FUNDS RATE', period: '2026-09-01',
      period_label: 'Sep 2026', value: 4.33, value_label: '4.33',
      unit: 'percent', unit_label: 'Percent', frequency: 'monthly', sa_nsa: 'NSA',
      prior_value: 4.33, change: 0.0, change_label: '+0.00 pp', change_pct: 0,
      change_basis: 'mom', source: 'Federal Reserve via FRED',
      source_url: 'https://fred.stlouisfed.org/series/FEDFUNDS',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'UNRATE', title: 'UNEMPLOYMENT RATE', period: '2026-09-01',
      period_label: 'Sep 2026', value: 4.3, value_label: '4.3',
      unit: 'percent', unit_label: 'Percent', frequency: 'monthly', sa_nsa: 'SA',
      prior_value: 4.2, change: 0.1, change_label: '+0.1 pp', change_pct: 2.38,
      change_basis: 'mom', source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/UNRATE',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'DGS10', title: '10-YR TREASURY', period: '2026-10-02',
      period_label: 'Oct 2, 2026', value: 4.15, value_label: '4.15',
      unit: 'percent', unit_label: 'Percent', frequency: 'daily', sa_nsa: 'NSA',
      prior_value: 4.10, change: 0.05, change_label: '+0.05 pp', change_pct: 1.22,
      change_basis: 'dow', source: 'Federal Reserve via FRED',
      source_url: 'https://fred.stlouisfed.org/series/DGS10',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'MORTGAGE30US', title: '30-YR MORTGAGE', period: '2026-10-01',
      period_label: 'Week ending Oct 1, 2026', value: 6.28, value_label: '6.28',
      unit: 'percent', unit_label: 'Percent', frequency: 'weekly', sa_nsa: 'NSA',
      prior_value: 6.31, change: -0.03, change_label: '-0.03 pp', change_pct: -0.48,
      change_basis: 'wow', source: 'Freddie Mac via FRED',
      source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'CPIAUCNS', title: 'CPI \u2014 ALL ITEMS (YoY)', period: '2026-08',
      period_label: 'Aug 2026', value: 334.98, value_label: '334.98',
      unit: 'idx_1982_84_100', unit_label: 'Index (1982-84=100)', frequency: 'monthly',
      sa_nsa: 'NSA', prior_value: 324.12, change: 10.86, change_label: '+10.86',
      change_pct: 3.35, change_pct_label: '+3.3% YoY', change_basis: 'yoy',
      source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'CPILFESL', title: 'CORE CPI (YoY)', period: '2026-08',
      period_label: 'Aug 2026', value: 341.55, value_label: '341.55',
      unit: 'idx_1982_84_100', unit_label: 'Index (1982-84=100)', frequency: 'monthly',
      sa_nsa: 'SA', prior_value: 331.20, change: 10.35, change_label: '+10.35',
      change_pct: 3.12, change_pct_label: '+3.1% YoY', change_basis: 'yoy',
      source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/CPILFESL',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'PAYEMS', title: 'PAYROLLS', period: '2026-09-01',
      period_label: 'Sep 2026', value: 159234, value_label: '159,234',
      unit: 'thousands_persons', unit_label: 'Thousands of persons', frequency: 'monthly',
      sa_nsa: 'SA', prior_value: 159212, change: 22, change_label: '+22',
      change_pct: 0.01, change_basis: 'mom',
      source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/PAYEMS',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' },
    { series_id: 'GDP', title: 'REAL GDP GROWTH', period: '2026-04-01',
      period_label: '2026 Q2', value: 23874.0, value_label: '23,874.0',
      unit: 'billions_chained_2017', unit_label: 'B$ (chained 2017)', frequency: 'quarterly',
      sa_nsa: 'SAAR', prior_value: 23750.0, change: 124.0, change_label: '+$124.0 B',
      change_pct: 2.1, change_pct_label: '+2.1% ann.', change_basis: 'qoq_ann',
      source: 'U.S. Bureau of Economic Analysis via FRED',
      source_url: 'https://fred.stlouisfed.org/series/GDP',
      stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05' }
  ];
}
var MRESP_OK = { ok: true, fred_live: true, retrieved_at: RT, series: mkSeries(), note: null };

function mountWith(resp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var ret = e.sb.PFMacro.mount(container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = sc && String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp', 'callback param missing: ' + (sc && sc.src)); return null; }
  if (String(sc.src).indexOf('action=fred_macro') === -1) no('jsonp', 'action=fred_macro missing: ' + sc.src);
  else ok('fires JSONP ?action=fred_macro with callback');
  e.sb[m[1]](resp);
  return { env: e, container: container, mountRet: ret };
}

/* --- happy path: 8 cards --- */
(function () {
  var t = mountWith(MRESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('mount ret', 'expected true');
  else ok('mount returns true');
  var html = t.container._innerHTML;
  if (cardCount(html) === 8) ok('renders exactly 8 cards');
  else no('card count', 'got ' + cardCount(html));
  /* backend order preserved */
  var order = ['FED FUNDS RATE', 'UNEMPLOYMENT RATE', '10-YR TREASURY', '30-YR MORTGAGE',
               'CPI', 'CORE CPI', 'PAYROLLS', 'REAL GDP GROWTH'];
  var ix = order.map(function (o) { return html.indexOf(o); });
  if (ix.every(function (v) { return v !== -1; }) && ix.every(function (v, i) { return i === 0 || v > ix[i - 1]; }))
    ok('cards render in backend order');
  else no('order', 'cards out of order or missing');
  if (html.indexOf('4.33') !== -1 && html.indexOf('334.98') !== -1 && html.indexOf('23,874.0') !== -1)
    ok('value labels rendered');
  else no('values', 'missing');
  if (html.indexOf('Sep 2026') !== -1 && html.indexOf('Aug 2026') !== -1 && html.indexOf('2026 Q2') !== -1)
    ok('period labels rendered');
  else no('periods', 'missing');
  if (html.indexOf('+0.1 pp') !== -1) ok('rate card renders pp change label (+0.1 pp)');
  else no('pp change', 'missing');
  if (html.indexOf('+3.3% YoY') !== -1) ok('YoY cards lead with the YoY label (+3.3% YoY)');
  else no('yoy change', 'missing');
  if (html.indexOf('>NSA<') !== -1 && html.indexOf('>SA<') !== -1 && html.indexOf('>SAAR<') !== -1)
    ok('SA/NSA/SAAR chips on cards');
  else no('SA/NSA chips', 'missing');
  if (html.indexOf('FRED \u00b7 FEDFUNDS \u00b7 RETRIEVED OCT 5, 2026') !== -1)
    ok('source stamp: "FRED \u00b7 FEDFUNDS \u00b7 RETRIEVED OCT 5, 2026"');
  else no('source stamp', 'missing');
  if (html.indexOf('href="https://fred.stlouisfed.org/series/UNRATE"') !== -1)
    ok('click-through link to the FRED series page');
  else no('click-through', 'missing');
  if (html.indexOf('OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA') !== -1)
    ok('no-blend footer on the strip');
  else no('no-blend footer', 'missing');
  if (html.indexOf('Index (1982-84=100)') !== -1 && html.indexOf('B$ (chained 2017)') !== -1)
    ok('unit labels rendered');
  else no('unit labels', 'missing');
})();

/* --- honest empty: fred_live:false --- */
(function () {
  /* note:null so the module's own default honest copy is what renders. */
  var t = mountWith({ ok: true, fred_live: false, retrieved_at: null, series: [], note: null });
  var html = t ? t.container._innerHTML : '';
  if (t && cardCount(html) === 0 && html.indexOf('OFFICIAL DATA CONNECTING') !== -1)
    ok('fred_live:false -> honest empty, zero cards');
  else no('honest empty', 'empty copy missing or cards rendered');
  if (t && html.indexOf('Nothing here is estimated or seeded') !== -1)
    ok('empty state carries the no-estimates copy');
  else no('empty copy', 'missing');
})();

/* --- connected, awaiting first ingest --- */
(function () {
  var t = mountWith({ ok: true, fred_live: true, retrieved_at: RT, series: [],
    note: 'figures appear once the first ingest runs.' });
  var html = t ? t.container._innerHTML : '';
  if (t && cardCount(html) === 0 && html.indexOf('FIRST REFRESH PENDING') !== -1)
    ok('fred_live:true + empty series -> distinct awaiting-ingest state');
  else no('awaiting ingest', 'missing or cards rendered');
})();

/* --- fail-soft: null response --- */
(function () {
  var t = mountWith(null);
  var html = t ? t.container._innerHTML : '';
  if (t && cardCount(html) === 0 && html.indexOf('OFFICIAL DATA CONNECTING') !== -1)
    ok('fail-soft: null response renders the honest empty (section stays)');
  else no('fail-soft null', 'missing or threw');
})();

/* --- stale card suppresses its figure --- */
(function () {
  var series = mkSeries();
  series[2].stale = true;
  series[2].stale_note = 'Last updated Oct 2, 2026 \u2014 refresh pending.';
  series[2].value_label = '9.99-STALE';
  series[2].value = null; series[2].prior_value = null;
  series[2].change = null; series[2].change_pct = null;
  var t = mountWith({ ok: true, fred_live: true, retrieved_at: RT, series: series, note: null });
  var html = t ? t.container._innerHTML : '';
  if (t && html.indexOf('Last updated Oct 2, 2026 \u2014 refresh pending.') !== -1 &&
      html.indexOf('9.99-STALE') === -1)
    ok('stale card: figure suppressed, honest stale note shown');
  else no('stale', 'figure leaked or note missing');
  if (t && cardCount(html) === 8) ok('stale card keeps its slot (no silent drop)');
  else no('stale slot', 'card dropped');
})();

/* --- esc on injected fields --- */
(function () {
  var t = mountWith({ ok: true, fred_live: true, retrieved_at: RT, series: [{
    series_id: 'XSS', title: '<img src=x onerror=1>', period: '2026-10-01',
    period_label: 'Oct 2026', value: 1, value_label: '1',
    unit: 'percent', unit_label: 'P"><script>alert(1)</script>',
    frequency: 'daily', sa_nsa: 'NSA', prior_value: 0, change: 0,
    change_label: 'x', change_basis: 'mom',
    source: 's', source_url: 'https://fred.stlouisfed.org/series/XSS?a="b"',
    stale: false, stale_note: null, retrieved_at: RT, vintage_date: '2026-10-05'
  }], note: null });
  var html = t ? t.container._innerHTML : '';
  if (t && html.indexOf('<img src=x') === -1 && html.indexOf('&lt;img') !== -1)
    ok('esc: injected title escaped');
  else no('esc title', 'raw HTML leaked');
  if (t && html.indexOf('&quot;b&quot;') !== -1)
    ok('esc: injected URL attribute escaped');
  else no('esc url', 'attribute injection leaked');
})();

/* --- no-duplication guard --- */
(function () {
  var e = makeEnv();
  var c = e.sb.document.createElement('div');
  e.sb.PFMacro.mount(c);
  /* let the first fetch complete (renders .pf-macro into the container) */
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('dedup', 'callback param missing'); return; }
  e.sb[m[1]](MRESP_OK);
  var n1 = e.captured.scripts.length;
  var r2 = e.sb.PFMacro.mount(c);
  if (r2 === true && e.captured.scripts.length === n1)
    ok('no-duplication: second mount on the same container returns true without a second fetch');
  else no('dedup', 'second mount re-fetched or failed');
})();

/* --- fail-soft args --- */
(function () {
  var e = makeEnv();
  if (e.sb.PFMacro.mount(null) === false && e.sb.PFMacro.mount() === false)
    ok('mount fail-soft on missing container (returns false)');
  else no('mount args', 'did not fail closed');
})();

/* --- kill switches --- */
(function () {
  var e = makeEnv({ search: '?pf_off=money' });
  if (typeof e.sb.PFMacro === 'undefined') ok('master kill: ?pf_off=money darkens the macro module');
  else no('master kill', 'PFMacro exposed despite ?pf_off=money');
})();
(function () {
  var e = makeEnv({ search: '?pf_off=money-macro' });
  if (typeof e.sb.PFMacro === 'undefined') ok('per-section kill: ?pf_off=money-macro darkens the macro module');
  else no('section kill', 'PFMacro exposed despite ?pf_off=money-macro');
})();
(function () {
  var e = makeEnv({ search: '' });
  if (typeof e.sb.PFMacro !== 'undefined') ok('no kill: PFMacro exposed by default');
  else no('default', 'PFMacro missing with no kill switch');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
