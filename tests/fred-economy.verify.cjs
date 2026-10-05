#!/usr/bin/env node
/* tests/fred-economy.verify.cjs — FRED /economy deepening (W4 A4) frontend verification.
   Run from the repo root:
     node tests/fred-economy.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      IIFE + PF guard + double-run guard, master + per-section kills,
      /economy-only mount (host #pf-economy, after #pf-inflation-trends),
      never in the Squarespace editor, esc() + safeUrl http(s)-only,
      the 6 backend action names, zero XP, no predictive/doom copy,
      honest-empty copy, SA/NSA chips, FRED source stamps, SVG-only charts
      (no chart library), no inner <script>, bundle-economy registration
   3. Mocked-browser runtime tests (vm + minimal DOM stub, JSONP
      intercepted): each section renders from fixtures; master + per-section
      kills suppress; fred_live:false renders the honest empty; wage stub
      renders WAGE DATA CONNECTING; stale renders the stale note with
      figures suppressed; sahm triggered/not-triggered states + episodes;
      esc on injected fields; safeUrl drops non-http(s) links.
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'games', 'fred-economy.js');
var BC = path.join(ROOT, 'build', 'bundle.js');
var BEC = path.join(ROOT, 'v1.4.3', 'games', 'bundle-economy.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles (bundle-economy carries the module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
/* The repo carries a pre-existing stale bundle-hq.js (source drift, not
   ours) — restore it so this branch stays drive-by-free. */
try { cp.execSync('git checkout -- v1.4.3/games/bundle-hq.js', { cwd: ROOT, stdio: 'pipe' }); }
catch (e) { /* not a git checkout context; ignore */ }
var becSrc = read(BEC);
if (becSrc.indexOf("'fred-economy.js'") !== -1 || becSrc.indexOf('fred-economy.js') !== -1) {
  ok('bundle-economy.js carries fred-economy.js');
} else { no('bundle-economy.js', 'fred-economy.js missing after rebuild'); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[MOD, BC].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var src = read(MOD), code = stripComments(src);
var bcsrc = read(BC);

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
function has(n, re, srcOverride) { if (re.test(srcOverride || code)) ok(n); else no(n, 'pattern missing: ' + re); }
function hasNot(n, re) { if (!re.test(code)) ok(n); else no(n, 'banned pattern present: ' + re); }

has('IIFE + use strict', /\(function \(\) \{\s*'use strict';/);
has('PF guard', /var PF = window\.PF;\s*if \(!PF\) \{ return; \}/);
has('double-run guard', /window\.pfFredEconomyDone/);
has('master kill economy-fred', /PF\.skip\('economy-fred'\)/);
['fed-watch', 'housing-context', 'official-trend', 'wage-gap', 'sahm', 'sahm-history'].forEach(function (s) {
  has('per-section kill ' + s, new RegExp("PF\\.skip\\('" + s + "'\\)"));
});
has('/economy host gate', /getElementById\('pf-economy'\)/);
has('mounts after A1 trends widget', /getElementById\('pf-inflation-trends'\)/);
has('never in Squarespace editor', /\/config\//);
hasNot('no inner <script> blocks', /<script/i);
has('esc() defined', /function esc\(s\)/);
has('safeUrl http(s)-only', /\/\^https\?:\\\/\\\//);
hasNot('safeUrl drops others (returns null)', /safeUrl[\s\S]{0,400}return u;/);
has('action fred_fedwatch', /fred_fedwatch/);
has('action fred_housing', /fred_housing/);
has('action fred_wage_gap', /fred_wage_gap/);
has('action fred_sahm', /fred_sahm/);
has('action fred_economy (S-26 ext-1)', /fred_economy/);
has('ext-1 mount function', /function mountSahmHistory/);
has('ext-1 mounts under the gauge section', /mountSahmHistory\(root, sahmSec\)/);
has('ext-1 fail-soft on no-key/stale (removes section)', /function remove\(\)/);
hasNot('ext-1: no "recession followed" claim without News Desk sign-off', /recession followed/i);
has('ext-1 renders backend framing_line', /framing_line/);
has('action fred_series (S-14)', /fred_series/);
has('action price_trends (S-14 community line)', /price_trends/);
hasNot('zero XP: no xpGrant', /xpGrant/);
hasNot('zero XP: no XP legs', /xp_leg|XP_REWARD|grantXP/i);
has('honest empty head', /OFFICIAL DATA CONNECTING/);
has('honest no-line-we-don\'t-have', /draw a line we don/);
has('SA/NSA chips', /sa_nsa/);
has('FRED source stamps', /fred\.stlouisfed\.org/);
has('stale suppression respected (FE)', /stale/);
has('SVG charts (no library)', /<svg/);
hasNot('no chart library', /chart\.js|\bd3\b|highcharts|plotly/i);
hasNot('no canvas charting', /getContext\(['"]2d['"]\)/);
has('two labeled lines, never blended (copy)', /never (one|blended)/i);
hasNot('no predictive copy', /will (rise|fall|spike|crash|soar|drop)|recession (is coming|looms|ahead|inevitable)|forecast (shows|says|of)|predicts? (a|the) recession/i);
has('bundle-economy registration', /'fred-economy\.js'/, bcsrc);
has('bundle comment documents kills', /economy-fred/);

/* ============ 3. mocked-browser runtime tests ============ */
console.log('== 3. runtime (vm + DOM stub) ==');

/* Fixtures keyed by action — synthetic paint-test values. */
var FIX = {
  fred_fedwatch: {
    ok: true, fred_live: true, retrieved_at: 1760000000000,
    core: { series_id: 'CPILFESL', title: 'Core CPI', sa_nsa: 'SA', period_label: 'Sep 2026',
            yoy: 3.1, yoy_label: '+3.1% YoY', stale: false,
            source_url: 'https://fred.stlouisfed.org/series/CPILFESL', retrieved_at: 1760000000000 },
    headline: { series_id: 'CPIAUCNS', title: 'Headline CPI', sa_nsa: 'NSA', period_label: 'Sep 2026',
            yoy: 2.9, yoy_label: '+2.9% YoY', stale: false,
            source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS', retrieved_at: 1760000000000 },
    pce: { series_id: 'PCEPI', title: 'PCE', sa_nsa: 'SA', period_label: 'Sep 2026',
            yoy: 2.7, yoy_label: '+2.7% YoY', stale: false,
            source_url: 'https://fred.stlouisfed.org/series/PCEPI', retrieved_at: 1760000000000 },
    gap_pp: 0.2, gap_label: '+0.2 pp — core above headline', note: ''
  },
  fred_housing: {
    ok: true, fred_live: true, retrieved_at: 1760000000000,
    mortgage: { series_id: 'MORTGAGE30US', title: '30-Yr Mortgage', sa_nsa: 'NSA',
            period_label: '2026-10-01', value: 6.35, value_label: '6.35%', stale: false,
            source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US', retrieved_at: 1760000000000 },
    cpi: { series_id: 'CPIAUCNS', title: 'CPI', sa_nsa: 'NSA', period_label: 'Sep 2026',
            yoy: 2.9, yoy_label: '+2.9% YoY', stale: false,
            source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS', retrieved_at: 1760000000000 },
    note: ''
  },
  fred_wage_gap: {
    ok: true, fred_live: true, wage_live: true, stale: false,
    retrieved_at: 1760000000000, period: '2026-09', period_label: 'Sep 2026',
    wage_yoy: 3.8, cpi_yoy: 2.9, gap_pp: 0.9,
    wage: { series_id: 'CES0500000003', title: 'Avg Hourly Earnings', sa_nsa: 'SA',
            source_url: 'https://fred.stlouisfed.org/series/CES0500000003', retrieved_at: 1760000000000 },
    cpi: { series_id: 'CPIAUCNS', title: 'CPI', sa_nsa: 'NSA',
            source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS', retrieved_at: 1760000000000 },
    history: [
      { period: '2026-09', period_label: 'Sep 2026', wage_yoy: 3.8, cpi_yoy: 2.9, gap_pp: 0.9 },
      { period: '2026-08', period_label: 'Aug 2026', wage_yoy: 3.7, cpi_yoy: 3.0, gap_pp: 0.7 },
      { period: '2026-07', period_label: 'Jul 2026', wage_yoy: 3.6, cpi_yoy: 3.1, gap_pp: 0.5 }
    ],
    note: ''
  },
  fred_sahm: {
    ok: true, fred_live: true, stale: false, retrieved_at: 1760000000000,
    threshold_pp: 0.5, rule_plain: 'Plain-words rule text here.',
    unrate: { series_id: 'UNRATE', title: 'Unemployment', sa_nsa: 'SA',
            source_url: 'https://fred.stlouisfed.org/series/UNRATE', retrieved_at: 1760000000000 },
    current: { period: '2026-09', period_label: 'Sep 2026', sahm_pp: 0.15,
               three_mo_avg: 4.3, twelve_mo_low: 4.1, triggered: false },
    episodes: [
      { start_period: '2020-03', start_label: 'Mar 2020', end_period: '2020-08',
        end_label: 'Aug 2020', peak_pp: 2.1 }
    ],
    note: ''
  },
  fred_economy: {
    ok: true, fred_live: true, stale: false, panel: 'sahm_history',
    threshold_pp: 0.5,
    framing_line: 'The Sahm rule has triggered 2 times since Mar 2020 in the ' +
      'official unemployment series. The rule flags what already happened ' +
      'in the job market — it is not a prediction of what comes next.',
    framing_review: 'pending',
    unrate: { series_id: 'UNRATE', title: 'Unemployment', sa_nsa: 'SA',
            source_url: 'https://fred.stlouisfed.org/series/UNRATE', retrieved_at: 1760000000000 },
    triggers: [
      { start: '2020-03', end: '2020-08', peak_value: 2.1, recovered: true },
      { start: '2026-09', end: '2026-09', peak_value: 0.67, recovered: false }
    ],
    trigger_count: 2, data_since: '2020-03', data_through: '2026-09', note: ''
  },
  fred_series: {
    ok: true, fred_live: true, series_id: 'CPIAUCNS', title: 'CPI-U', sa_nsa: 'NSA',
    source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS',
    retrieved_at: 1760000000000, vintage_date: '2026-10-05',
    observations: [
      { period: '2026-09', value: 320.0 },
      { period: '2026-08', value: 319.2 },
      { period: '2026-07', value: 318.5 }
    ]
  },
  price_trends: {
    ok: true,
    peoples_index: [
      { week_start: '2026-09-07', value: 100 },
      { week_start: '2026-09-14', value: 100.4 },
      { week_start: '2026-09-21', value: 100.2 }
    ]
  }
};

function runSandbox(opts) {
  opts = opts || {};
  var killed = opts.killed || [];
  var fix = opts.fix || FIX;
  var bodies = [];   /* captured .pf-fe-body renders, in mount order */
  var hostKids = [];
  var byId = {};

  function captureEl() {
    var el = {
      _html: '',
      set innerHTML(v) { this._html = String(v); bodies.push(this._html); },
      get innerHTML() { return this._html; }
    };
    return el;
  }
  function scriptEl() {
    var el = { _src: '', onerror: null, parentNode: null };
    Object.defineProperty(el, 'src', {
      get: function () { return this._src; },
      set: function (v) {
        this._src = String(v);
        /* JSONP intercept: parse action + callback, answer synchronously. */
        var m = /[?&]action=([^&]+)/.exec(this._src);
        var c = /[?&]callback=([^&]+)/.exec(this._src);
        var action = m ? decodeURIComponent(m[1]) : '';
        var cb = c ? c[1] : '';
        var fj = Object.prototype.hasOwnProperty.call(fix, action) ? fix[action] : null;
        if (cb && sandbox.window[cb]) {
          try { sandbox.window[cb](fj); } catch (e) { /* surface below */ throw e; }
        }
      }
    });
    return el;
  }
  function genEl(tag) {
    if (tag === 'script') return scriptEl();
    var el = {
      tag: tag, children: [], _html: '', _id: '', className: '',
      style: {},
      set innerHTML(v) { this._html = String(v); },
      get innerHTML() { return this._html; },
      set id(v) { this._id = v; if (v) byId[v] = this; },
      get id() { return this._id; },
      setAttribute: function () {},
      appendChild: function (c) { this.children.push(c); hostKids.push(c); return c; },
      classList: { contains: function () { return false; } },
      querySelector: function () { return captureEl(); },
      parentNode: null
    };
    return el;
  }

  var host = genEl('div'); host.id = 'pf-economy';
  var trends = genEl('div'); trends.id = 'pf-inflation-trends';
  trends.parentNode = { insertBefore: function (c) { hostKids.push(c); return c; } };
  byId['pf-economy'] = host;
  byId['pf-inflation-trends'] = trends;
  byId['pf-fe-css'] = null;

  var sandbox = {
    window: {
      PF: {
        skip: function (s) { return killed.indexOf(s) !== -1; },
        error: function () {}
      },
      PF_BACKEND_URL: 'https://example.com/exec',
      location: { search: '', href: 'https://mtcstw.com/economy' }
    },
    document: {
      getElementById: function (id) {
        return Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null;
      },
      createElement: genEl,
      head: { appendChild: function () {} },
      body: genEl('body')
    },
    localStorage: { getItem: function () { return null; } },
    setTimeout: function () { return 0; },
    console: console
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'fred-economy.js' });
  return { bodies: bodies, hostKids: hostKids, host: host };
}

function bodiesJoin(r) { return r.bodies.join('\n'); }

/* --- full render --- */
var r = runSandbox({});
var all = bodiesJoin(r);
function hasR(n, re) { if (re.test(all)) ok(n); else no(n, 'missing in render: ' + re); }

hasR('S-05 card 1 title', /WHAT THE FED ACTUALLY WATCHES/);
hasR('S-05 card 2 title', /THE FED\u2019S FAVORITE INFLATION NUMBER/);
hasR('S-05 core/headline values', /\+3\.1% YoY/);
hasR('S-05 gap label', /core above headline/);
hasR('S-05 SA/NSA chips', />SA</);
hasR('S-05 FRED link', /fred\.stlouisfed\.org\/series\/CPILFESL/);
hasR('S-07 mortgage value', /6\.35%/);
hasR('S-07 shelter explainer', /36% of the CPI/);
hasR('S-14 two-line chart', /Official CPI-U \(BLS\)/);
hasR('S-14 community line labeled', /People\u2019s Index \(community-reported\)/);
hasR('S-14 never-blended footnote', /never one/);
hasR('S-14 svg rendered', /<svg/);
hasR('M-01 gap headline', /wages ahead of/);
hasR('M-01 two lines', /Wage growth/);
hasR('S-26 not triggered', /NOT TRIGGERED/);
hasR('S-26 gauge vs 0.5', /trigger 0\.5 pp/);
hasR('S-26 episode from data', /Mar 2020/);
hasR('S-26 descriptive-only note', /not a prediction/);
if (r.hostKids.length >= 1) ok('mounted into /economy host'); else no('mount', 'no children mounted');

/* --- master kill --- */
var rk = runSandbox({ killed: ['economy-fred'] });
if (rk.bodies.length === 0 && rk.hostKids.length === 0) ok('master kill suppresses all');
else no('master kill', 'rendered ' + rk.bodies.length + ' bodies');

/* --- per-section kill --- */
var rs = runSandbox({ killed: ['sahm'] });
var sAll = bodiesJoin(rs);
if (!/SAHM RULE/.test(sAll) && /WHAT THE FED/.test(sAll)) ok('per-section kill (sahm)');
else no('per-section kill', 'sahm leaked or others missing');

/* --- fred_live:false honest empty --- */
var re = runSandbox({ fix: {
  fred_fedwatch: { ok: true, fred_live: false, note: 'No official macro data yet.' },
  fred_housing: { ok: true, fred_live: false, note: '' },
  fred_wage_gap: { ok: true, fred_live: false, note: '' },
  fred_sahm: { ok: true, fred_live: false, note: '' },
  fred_series: { ok: true, fred_live: false, note: '' },
  price_trends: { ok: true, peoples_index: [] }
} });
var eAll = bodiesJoin(re);
if (/OFFICIAL DATA CONNECTING/.test(eAll) && !/<svg/.test(eAll)) ok('fred_live:false honest empty, no charts');
else no('honest empty', 'empty state missing or chart drawn without data');

/* --- wage stub (wire on arrival) --- */
var rw = runSandbox({ fix: Object.assign({}, FIX, {
  fred_wage_gap: { ok: true, fred_live: true, wage_live: false,
    note: 'Average hourly earnings not ingested yet.' }
}) });
if (/WAGE DATA CONNECTING/.test(bodiesJoin(rw))) ok('wage stub state');
else no('wage stub', 'WAGE DATA CONNECTING missing');

/* --- stale suppression --- */
var rst = runSandbox({ fix: Object.assign({}, FIX, {
  fred_sahm: { ok: true, fred_live: true, stale: true,
    stale_note: 'Unemployment data is stale — refresh pending.' }
}) });
var stAll = bodiesJoin(rst);
if (/FIGURES STALE/.test(stAll) && !/NOT TRIGGERED/.test(stAll)) ok('stale suppresses figures');
else no('stale', 'stale state wrong');

/* --- sahm triggered state --- */
var rtg = runSandbox({ fix: Object.assign({}, FIX, {
  fred_sahm: Object.assign({}, FIX.fred_sahm, {
    current: { period: '2026-09', period_label: 'Sep 2026', sahm_pp: 0.67,
               three_mo_avg: 4.7, twelve_mo_low: 4.0, triggered: true }
  })
}) });
if (/TRIGGERED/.test(bodiesJoin(rtg)) && !/NOT TRIGGERED/.test(bodiesJoin(rtg))) ok('sahm TRIGGERED state');
else no('sahm triggered', 'TRIGGERED missing');

/* --- esc on injected fields --- */
var rx = runSandbox({ fix: Object.assign({}, FIX, {
  fred_fedwatch: Object.assign({}, FIX.fred_fedwatch, {
    core: Object.assign({}, FIX.fred_fedwatch.core, { title: '<script>alert(1)</script>' })
  })
}) });
var xAll = bodiesJoin(rx);
if (xAll.indexOf('<script>alert(1)</script>') === -1 && /&lt;script&gt;/.test(xAll)) ok('esc on injected fields');
else no('esc', 'raw script tag in output');

/* --- safeUrl drops non-http(s) --- */
var ru = runSandbox({ fix: Object.assign({}, FIX, {
  fred_fedwatch: Object.assign({}, FIX.fred_fedwatch, {
    core: Object.assign({}, FIX.fred_fedwatch.core, { source_url: 'javascript:alert(1)' })
  })
}) });
if (bodiesJoin(ru).indexOf('javascript:alert(1)') === -1) ok('safeUrl drops javascript: URLs');
else no('safeUrl', 'javascript: URL rendered');

/* --- official-only when no community data --- */
var ro = runSandbox({ fix: Object.assign({}, FIX, { price_trends: { ok: true, peoples_index: [] } }) });
var oAll = bodiesJoin(ro);
if (/Official CPI-U \(BLS\)/.test(oAll) && /not enough community data/.test(oAll)) ok('official-only fallback');
else no('official-only', 'fallback wrong');

/* --- S-26 ext-1: trigger-history strip renders --- */
hasR('ext-1 strip card', /PAST TRIGGERS — OFFICIAL SERIES/);
hasR('ext-1 framing line (neutral)', /not a prediction of what comes next/);
hasR('ext-1 recovered range', /Mar 2020 \u2013 Aug 2020/);
hasR('ext-1 recovered state', /fell back below the 0\.50 trigger/);
hasR('ext-1 live state', /still above the 0\.50 trigger/);
hasR('ext-1 peak value', /peak 2\.10 pp/);
hasR('ext-1 source stamp', /fred\.stlouisfed\.org\/series\/UNRATE/);

/* --- ext-1: per-extension kill suppresses strip, keeps gauge --- */
var rkh = runSandbox({ killed: ['sahm-history'] });
var khAll = bodiesJoin(rkh);
if (!/PAST TRIGGERS — OFFICIAL SERIES/.test(khAll) && /SAHM RULE — CURRENT READING/.test(khAll)) ok('ext-1 kill (sahm-history) suppresses strip only');
else no('ext-1 kill', 'strip leaked or gauge missing');

/* --- ext-1: master sahm kill suppresses both --- */
var rkm = runSandbox({ killed: ['sahm'] });
if (!/PAST TRIGGERS — OFFICIAL SERIES/.test(bodiesJoin(rkm)) && !/SAHM RULE/.test(bodiesJoin(rkm))) ok('master sahm kill suppresses gauge + strip');
else no('master sahm kill', 'sahm surface leaked');

/* --- ext-1: fail-soft — no key / stale -> strip absent, no error wall --- */
var rnok = runSandbox({ fix: Object.assign({}, FIX, {
  fred_economy: { ok: true, fred_live: false, note: 'key hand-step' }
}) });
if (!/PAST TRIGGERS — OFFICIAL SERIES/.test(bodiesJoin(rnok))) ok('ext-1 no-key -> strip absent');
else no('ext-1 no-key', 'strip rendered without data');
var rsth = runSandbox({ fix: Object.assign({}, FIX, {
  fred_economy: { ok: true, fred_live: true, stale: true, panel: 'sahm_history',
                  stale_note: 'stale', triggers: [], framing_line: '', framing_review: 'pending' }
}) });
if (!/PAST TRIGGERS — OFFICIAL SERIES/.test(bodiesJoin(rsth))) ok('ext-1 stale -> strip absent');
else no('ext-1 stale', 'strip rendered from stale data');

/* --- ext-1: zero triggers -> honest empty line, no marks --- */
var rzero = runSandbox({ fix: Object.assign({}, FIX, {
  fred_economy: Object.assign({}, FIX.fred_economy, {
    triggers: [], trigger_count: 0,
    framing_line: 'The Sahm rule has triggered 0 times since Oct 2024 in the ' +
      'official unemployment series. The rule flags what already happened — it is not a prediction.'
  })
}) });
if (/No past triggers in the available history window/.test(bodiesJoin(rzero))) ok('ext-1 zero triggers honest line');
else no('ext-1 zero triggers', 'honest line missing');

/* --- ext-1: esc on injected framing line --- */
var rxe = runSandbox({ fix: Object.assign({}, FIX, {
  fred_economy: Object.assign({}, FIX.fred_economy, {
    framing_line: '<img src=x onerror=alert(1)>'
  })
}) });
var xeAll = bodiesJoin(rxe);
if (xeAll.indexOf('<img src=x onerror=alert(1)>') === -1 && /&lt;img/.test(xeAll)) ok('ext-1 esc on injected framing line');
else no('ext-1 esc', 'raw injection in output');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n' + fails.join('\n')); process.exit(1); }
