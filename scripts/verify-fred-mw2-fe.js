#!/usr/bin/env node
/* scripts/verify-fred-mw2-fe.js — FRED modeling wave 2 frontend verification.
   Run from the repo root:
     node scripts/verify-fred-mw2-fe.js
   1. node --check on the new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switches, esc() on injected fields, safeUrl on links, no XP code,
      no forecast/doom language, official-vs-crowd side labels, MODEL chips,
      sign-off chip on M-05, methodology presence, bundle registration
   3. Mocked-browser runtime tests (vm + minimal DOM stub + synchronous JSONP
      fixture responder):
      - fred-models2.js mounts M-04 + U-01 on #pf-economy (fixture data),
        honors ?pf_off=rent-burden / local-indices / economy-fred
      - phq-jobs-panel.js PFJobsPanel.mount renders the M-05 composite with
        the pending-sign-off chip and the not-a-forecast label
      - phq-geo-intel.js renders the organizer view (intensity bars, method
        mix, suppressed TX absent), honors ?pf_off=geo-intel
      - money-macro.js PFMacro.mount appends the M-03 + M-06 strip cards
      - bank-fred-context.js PFBankFred.mount appends the M-03 + M-06 cards
      - all fail soft on dead wires
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD_FM2 = path.join(V, 'games', 'fred-models2.js');
var MOD_GI = path.join(V, 'games', 'phq-geo-intel.js');
var MOD_JP = path.join(V, 'games', 'phq-jobs-panel.js');
var MOD_BF = path.join(V, 'games', 'bank-fred-context.js');
var MOD_MM = path.join(V, 'core', 'money-macro.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[MOD_FM2, MOD_GI, MOD_JP, MOD_BF, MOD_MM].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var fm2 = read(MOD_FM2), gi = read(MOD_GI), jp = read(MOD_JP),
    bf = read(MOD_BF), mm = read(MOD_MM);
var cFm2 = stripComments(fm2), cGi = stripComments(gi), cJp = stripComments(jp),
    cBf = stripComments(bf), cMm = stripComments(mm);
var ALL = [cFm2, cGi, cJp, cBf, cMm].join('\n');

console.log('== 2. static contract checks ==');
/* kill switches */
[['rent-burden', cFm2], ['local-indices', cFm2], ['geo-intel', cGi],
 ['yield-spread', cBf + cMm], ['policy-stance', cBf + cMm],
 ['economy-fred', cFm2], ['phq-jobs', cJp], ['bank-fred', cBf],
 ['money-macro', cMm]].forEach(function (t) {
  if (t[1].indexOf("'" + t[0] + "'") !== -1 || t[1].indexOf('"' + t[0] + '"') !== -1) ok('kill switch ' + t[0]);
  else no('kill switch ' + t[0], 'missing');
});
/* zero XP */
if (/xpGrant|xp_grant/i.test(ALL)) no('zero XP', 'xpGrant found');
else ok('zero XP (no xpGrant in any module)');
/* esc() on injected fields */
[['fred-models2', cFm2], ['phq-geo-intel', cGi], ['phq-jobs-panel', cJp],
 ['bank-fred-context', cBf], ['money-macro', cMm]].forEach(function (t) {
  var n = (t[1].match(/esc\(/g) || []).length;
  if (n > 3) ok(t[0] + ' escapes injected fields (' + n + ' esc() calls)');
  else no(t[0] + ' escaping', 'only ' + n + ' esc() calls');
});
/* safeUrl on server-supplied links (fred-models2 stamps) */
if (cFm2.indexOf('safeUrl(c.source_url)') !== -1 || cFm2.indexOf('safeUrl(') !== -1) ok('safeUrl guards source links');
else no('safeUrl', 'missing in fred-models2');
/* no forecast / doom language in user-facing copy */
if (/will (rise|fall|cut|raise|increase|decrease|hike)/i.test(ALL)) no('forecast language', 'banned prediction phrasing found');
else ok('no forecast phrasing');
/* "doom" as a standalone word — the CSS property border-collapse is
   normalized out first so it can't false-positive. */
var ALLnoCSS = ALL.replace(/border-collapse:collapse/g, 'borderCollapse:separate')
                  .replace(/border-collapse/g, 'borderCollapse');
if (/(?<![-\w])(collapse|crash|doom|panic)(?![-\w])/i.test(ALLnoCSS)) no('doom copy', 'banned doom word found');
else ok('no doom copy');
/* official vs crowd never blended — side labels */
if (cFm2.indexOf('OFFICIAL SIDE') !== -1 && cFm2.indexOf('CROWD SIDE') !== -1) ok('official/crowd side labels');
else no('side labels', 'OFFICIAL SIDE / CROWD SIDE missing');
if (/NEVER BLENDED|never blended/i.test(ALL)) ok('never-blended rule stated');
else no('never-blended', 'rule not stated in code');
/* MODEL chips on derived surfaces */
if (cMm.indexOf('MODEL M-03') !== -1 && cMm.indexOf('MODEL M-06') !== -1) ok('strip MODEL chips M-03/M-06');
else no('strip MODEL chips', 'missing');
if (cBf.indexOf('M-03') !== -1 && cBf.indexOf('M-06') !== -1) ok('bank MODEL chips M-03/M-06');
else no('bank MODEL chips', 'missing');
/* M-05 sign-off chip + not-a-forecast label */
if (cJp.indexOf('WEIGHTS PENDING ECONOMY DESK SIGN-OFF') !== -1) ok('M-05 pending-sign-off chip');
else no('M-05 sign-off chip', 'missing');
if (cJp.indexOf('DESCRIPTIVE INDEX') !== -1) ok('M-05 not-a-forecast label');
else no('M-05 label', 'missing');
/* descriptive-only marker in geo-intel */
if (/not a target, not a score/i.test(cGi)) ok('U-10 descriptive ratio copy');
else no('U-10 copy', 'missing');
if (/no districts, no individuals/i.test(cGi)) ok('U-09 coarse-geo copy');
else no('U-09 copy', 'missing');
/* bundle registration */
var bb = read(path.join(ROOT, 'build', 'bundle.js'));
if (bb.indexOf("'fred-models2.js'") !== -1) ok('fred-models2.js in bundle composition');
else no('bundle composition', 'fred-models2.js missing');
if (bb.indexOf("'phq-geo-intel.js'") !== -1) ok('phq-geo-intel.js in bundle composition');
else no('bundle composition', 'phq-geo-intel.js missing');
var be = read(path.join(V, 'games', 'bundle-economy.js'));
var bh = read(path.join(V, 'games', 'bundle-hq.js'));
var bmo = read(path.join(V, 'core', 'bundle-money.js'));
var bba = read(path.join(V, 'games', 'bundle-bank.js'));
if (be.indexOf('pfFredModels2Done') !== -1) ok('fred-models2 in bundle-economy.js');
else no('bundle-economy.js', 'fred-models2 not in built bundle');
if (bh.indexOf('pfGeoIntelDone') !== -1) ok('phq-geo-intel in bundle-hq.js');
else no('bundle-hq.js', 'phq-geo-intel not in built bundle');
if (bmo.indexOf('pfMacroDone') !== -1 && bmo.indexOf('MODEL M-03') !== -1) ok('money-macro M-03/M-06 in bundle-money.js');
else no('bundle-money.js', 'model cards not in built bundle');
if (bba.indexOf('pfBankFredDone') !== -1 && bba.indexOf('MODEL · M-03') !== -1) ok('bank M-03/M-06 in bundle-bank.js');
else no('bundle-bank.js', 'model cards not in built bundle');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime ==');

var NOW = Date.now();
function buckets(n, medFn, cntFn) {
  var out = [];
  for (var i = 0; i < 12; i++) {
    var wk = NOW - (12 - i) * 7 * 24 * 3600 * 1000;
    var c = cntFn(i), m = medFn(i);
    out.push({ week_start: wk, week_start_label: new Date(wk).toISOString().slice(0, 10),
               sample_count: c, median_cents: m, trimmed_mean_cents: m, suppressed: c < 5 });
  }
  return out;
}
var FIXTURES = {
  fred_rent_burden: { ok: true, fred_live: true, retrieved_at: NOW,
    mortgage: { title: '30-Year Fixed Rate Mortgage Average in the U.S.', sa_nsa: 'NSA',
      value_label: '6.75%', period_label: 'Oct 1, 2026', source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
      retrieved_at: NOW },
    rent: { title: 'Consumer Price Index for All Urban Consumers: Rent of Primary Residence in U.S. City Average',
      sa_nsa: 'NSA', value_label: '340.00', yoy: 3.1, yoy_label: '+3.1% YoY', period_label: 'Sep 2026',
      source_url: 'https://fred.stlouisfed.org/series/CUUR0000SEHA', retrieved_at: NOW },
    shelter_weight_pct: 35.625, shelter_weight_source: 'BLS CPI relative importance, shelter, December 2025',
    shelter_weight_url: 'https://www.bls.gov/cpi/factsheets/tenants-household-insurance.htm',
    shelter_contribution_pp: 1.1,
    shelter_contribution_label: '+1.10 pp of headline CPI comes from shelter alone',
    explainer_draft: 'Housing is the single biggest slice of the inflation index.' },
  geo_local_inflation: { ok: true, item_id: 'eggs', weeks: 12, min_n: 5,
    areas: [
      { area_key: '70808', label: 'Baton Rouge, LA', sample_total: 60,
        buckets: buckets(12, function (i) { return i === 3 ? null : 300 + i * 5; },
          function (i) { return i === 3 ? 2 : 6; }) },
      { area_key: '70112', label: 'New Orleans, LA', sample_total: 48,
        buckets: buckets(12, function () { return 350; }, function () { return 5; }) }
    ] },
  pressure_list: { ok: true, campaigns: [{ id: 'c1', title: 'Test Campaign' }] },
  geo_support_intensity: { ok: true, organizer_first: true, min_n: 5,
    states: [
      { state: 'LA', pledges: 12, sigs: 8, participants: 9, contacts: 6, intensity: 23 },
      { state: 'TX', pledges: null, sigs: null, participants: null, contacts: null, intensity: null }
    ] },
  geo_campaign_effectiveness: { ok: true, organizer_first: true, min_n: 5,
    campaigns: [{ campaign_id: 'c1', title: 'Test Campaign', participants_total: 9, contacts_total: 6,
      states: [{ state: 'LA', participants: 9, contacts: 6, contacts_per_100_participants: 66.7,
        method_mix: { call: 4, form: 2 } }] }] },
  fred_context_jobs: { ok: true, fred_live: true,
    cards: [
      { title: 'Civilian Unemployment Rate', series_id: 'UNRATE', sa_nsa: 'SA', value_label: '4.1%',
        period_label: 'Sep 2026', change_label: '+0.1 pp', source_url: 'https://fred.stlouisfed.org/series/UNRATE',
        retrieved_at: NOW },
      { title: 'All Employees, Total Nonfarm', series_id: 'PAYEMS', sa_nsa: 'SA', value_label: '160,000',
        period_label: 'Sep 2026', change_label: '+250K', source_url: 'https://fred.stlouisfed.org/series/PAYEMS',
        retrieved_at: NOW }
    ] },
  fred_jobs_quality: { ok: true, fred_live: true, stale: false, retrieved_at: NOW, score: 78.5,
    components: [
      { label: 'Job growth', weight: 40, raw_label: '+1.5% annualized (3-mo)', score: 83.3 },
      { label: 'Unemployment level', weight: 30, raw_label: '4.0%', score: 80 },
      { label: 'Wage growth', weight: 30, raw_label: '+3.5% YoY', score: 70 }
    ],
    weights: { payems: 40, unrate: 30, earnings: 30 }, weights_signed_off: false,
    label: 'DESCRIPTIVE INDEX — NOT A FORECAST',
    methodology: 'Fixed published weights: job growth 40 / unemployment level 30 / wage growth 30.' },
  fred_context_bank: { ok: true, fred_live: true,
    cards: [
      { title: 'Federal Funds Effective Rate', series_id: 'FEDFUNDS', sa_nsa: 'NSA', value_label: '4.33%',
        period_label: 'Sep 2026', source_url: 'https://fred.stlouisfed.org/series/FEDFUNDS', retrieved_at: NOW },
      { title: '10-Year Treasury Constant Maturity Rate', series_id: 'DGS10', sa_nsa: 'NSA', value_label: '4.60%',
        period_label: 'Oct 3, 2026', source_url: 'https://fred.stlouisfed.org/series/DGS10', retrieved_at: NOW },
      { title: '30-Year Fixed Rate Mortgage Average in the U.S.', series_id: 'MORTGAGE30US', sa_nsa: 'NSA',
        value_label: '6.75%', period_label: 'Oct 1, 2026', source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
        retrieved_at: NOW }
    ] },
  fred_macro: { ok: true, fred_live: true,
    series: [
      { title: 'Federal Funds Effective Rate', series_id: 'FEDFUNDS', sa_nsa: 'NSA', value_label: '4.33%',
        unit_label: 'Percent', period_label: 'Sep 2026', source_url: 'https://fred.stlouisfed.org/series/FEDFUNDS',
        retrieved_at: NOW }
    ] },
  fred_yield_spread: { ok: true, fred_live: true, spread_live: true, stale: false, retrieved_at: NOW,
    spread_bp: 40, inverted: false, spread_label: '40 bp normal (10Y above 2Y)',
    history: [{ period: '2026-10-03', period_label: 'Oct 3, 2026', spread_bp: 40, inverted: false }] },
  fred_policy_stance: { ok: true, fred_live: true, stance_live: true, stale: false, retrieved_at: NOW,
    real_rate: 1.87, real_rate_label: '+1.87% (real)', regime: 'neutral',
    regime_copy_draft: 'Neutral — the policy rate roughly matches inflation.',
    period_label: 'Sep 2026', thresholds: { restrictive_min: 2.0, accommodative_max: 0.0 } }
};

function makeEl(tag, env) {
  var el = { tagName: String(tag).toUpperCase(), children: [], _attrs: {},
             style: {}, parentNode: null, className: '', _innerHTML: '', textContent: '', id: '' };
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
  el.insertAdjacentHTML = function (pos, html) { el._innerHTML += String(html); };
  el.querySelector = function (sel) {
    /* class selector over this element's innerHTML: return a proxy whose
       parentNode.insertBefore appends into this element's HTML. */
    var cls = sel.charAt(0) === '.' ? sel.slice(1) : null;
    if (!cls) return null;
    var re = new RegExp('class="[^"]*\\b' + cls + '\\b');
    if (!re.test(el._innerHTML)) return null;
    return { nextSibling: null,
             appendChild: function (c) {
               el._innerHTML += c._innerHTML || '';
               c.parentNode = el;
               return c;
             },
             parentNode: { insertBefore: function (newEl) { el._innerHTML += newEl._innerHTML; } } };
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  if (String(tag).toLowerCase() === 'script') {
    env.captured.scripts.push(el);
    var _src = '';
    Object.defineProperty(el, 'src', {
      get: function () { return _src; },
      set: function (url) {
        _src = String(url);
        var am = /[?&]action=([^&]+)/.exec(_src);
        var cm = /[?&]callback=([^&]+)/.exec(_src);
        var action = am ? decodeURIComponent(am[1]) : '';
        var cb = cm ? decodeURIComponent(cm[1]) : '';
        var fx = Object.prototype.hasOwnProperty.call(env.fixtures, action)
          ? env.fixtures[action] : null;
        /* fred_context is shared by surfaces — disambiguate by param. */
        if (action === 'fred_context') {
          var sm = /[?&]surface=([^&]+)/.exec(_src);
          var surf = sm ? decodeURIComponent(sm[1]) : '';
          fx = surf === 'bank_rates' ? env.fixtures.fred_context_bank
             : surf === 'jobs' ? env.fixtures.fred_context_jobs : null;
        }
        try { env.sb[cb](fx); } catch (e) {}
      }
    });
    el.onerror = null;
  }
  env.captured.created.push(el);
  return el;
}

function makeEnv(opts) {
  opts = opts || {};
  var env = { captured: { scripts: [], created: [] }, fixtures: opts.fixtures || FIXTURES };
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; }; /* sync in tests */
  sb.navigator = {};
  sb.location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  sb.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  var hosts = {};
  (opts.hosts || []).forEach(function (id) { hosts[id] = makeEl('div', env); hosts[id].id = id; });
  var head = makeEl('head', env);
  head.appendChild = function (c) { return c; };
  sb.document = {
    createElement: function (t) { return makeEl(t, env); },
    head: head,
    getElementById: function (id) { return hosts[id] || null; },
    addEventListener: function () {}
  };
  sb.PF = {
    skip: function (silo) {
      var m = String(sb.location.search).match(/[?&]pf_off=([^&]+)/);
      if (m && decodeURIComponent(m[1]).split(',').indexOf(silo) !== -1) return true;
      return false;
    },
    toast: function () {}
  };
  sb.PF_BACKEND_URL = 'https://pf-api.example.com/exec';
  env.sb = sb;
  env.hosts = hosts;
  vm.createContext(sb);
  return env;
}
function allHTML(env) {
  var h = '';
  Object.keys(env.hosts).forEach(function (k) { h += env.hosts[k]._innerHTML; });
  env.captured.created.forEach(function (el) { h += el._innerHTML || ''; });
  return h;
}
function runMod(env, modPath) {
  vm.runInContext(read(modPath), env.sb, { filename: path.basename(modPath) });
}

/* --- fred-models2 on /economy --- */
console.log('== 3a. fred-models2 (/economy) ==');
{
  var env = makeEnv({ hosts: ['pf-economy'] });
  runMod(env, MOD_FM2);
  var h = allHTML(env);
  if (h.indexOf('THE RENT/MORTGAGE SQUEEZE') !== -1) ok('M-04 section renders');
  else no('M-04 render', 'section missing');
  if (h.indexOf('OFFICIAL SIDE') !== -1 && h.indexOf('6.75%') !== -1) ok('M-04 official figures render');
  else no('M-04 figures', 'missing');
  if (h.indexOf('+1.10 pp of headline CPI') !== -1) ok('M-04 shelter contribution renders');
  else no('M-04 contribution', 'missing');
  if (h.indexOf('DRAFT COPY') !== -1) ok('M-04 explainer flagged DRAFT COPY');
  else no('M-04 draft chip', 'missing');
  if (h.indexOf('IS IT JUST YOUR TOWN?') !== -1 && h.indexOf('CROWD SIDE') !== -1) ok('U-01 section renders');
  else no('U-01 render', 'section missing');
  if (h.indexOf('<svg') !== -1 && h.indexOf('Baton Rouge, LA') !== -1) ok('U-01 chart + area legend render');
  else no('U-01 chart', 'missing');
  if (h.indexOf('n=') !== -1) ok('U-01 sample counts on points');
  else no('U-01 sample counts', 'missing');
}
{
  var env2 = makeEnv({ hosts: ['pf-economy'], search: '?pf_off=rent-burden' });
  runMod(env2, MOD_FM2);
  var h2 = allHTML(env2);
  if (h2.indexOf('THE RENT/MORTGAGE SQUEEZE') === -1 && h2.indexOf('IS IT JUST YOUR TOWN?') !== -1)
    ok('?pf_off=rent-burden kills M-04 only');
  else no('rent-burden kill', 'kill switch misbehaving');
}
{
  var env3 = makeEnv({ hosts: ['pf-economy'], search: '?pf_off=local-indices' });
  runMod(env3, MOD_FM2);
  if (allHTML(env3).indexOf('<svg') === -1) ok('?pf_off=local-indices kills U-01');
  else no('local-indices kill', 'chart still rendered');
}
{
  var env4 = makeEnv({ hosts: ['pf-economy'], search: '?pf_off=economy-fred' });
  runMod(env4, MOD_FM2);
  if (env4.hosts['pf-economy'].children.length === 0) ok('?pf_off=economy-fred master kill');
  else no('economy-fred master kill', 'module mounted anyway');
}
{
  /* dead wire: no backend -> fail soft, no throw */
  var env5 = makeEnv({ hosts: ['pf-economy'] });
  env5.sb.PF_BACKEND_URL = '';
  try { runMod(env5, MOD_FM2); ok('fred-models2 fail-soft without backend'); }
  catch (e) { no('fred-models2 fail-soft', String(e && e.message)); }
}

/* --- phq-jobs-panel M-05 --- */
console.log('== 3b. phq-jobs-panel M-05 ==');
{
  var env = makeEnv({ hosts: ['pf-political-hq'] });
  runMod(env, MOD_JP);
  var host = makeEl('div', env);
  var m = env.sb.PFJobsPanel.mount(host);
  var h = host._innerHTML + allHTML(env);
  if (m && h.indexOf('JOBS-QUALITY COMPOSITE') !== -1) ok('M-05 composite renders');
  else no('M-05 render', 'composite missing');
  if (h.indexOf('78.5') !== -1) ok('M-05 score renders');
  else no('M-05 score', 'missing');
  if (h.indexOf('WEIGHTS PENDING ECONOMY DESK SIGN-OFF') !== -1) ok('M-05 sign-off chip renders');
  else no('M-05 sign-off chip render', 'missing');
  if (h.indexOf('DESCRIPTIVE INDEX — NOT A FORECAST') !== -1) ok('M-05 not-a-forecast label renders');
  else no('M-05 label render', 'missing');
  if (h.indexOf('Job growth') !== -1 && h.indexOf('83.3') !== -1) ok('M-05 component bars render');
  else no('M-05 bars', 'missing');
}
{
  /* stale composite -> honest empty, no score */
  var env2 = makeEnv({ hosts: ['pf-political-hq'] });
  env2.fixtures = Object.assign({}, FIXTURES, {
    fred_jobs_quality: { ok: true, fred_live: true, stale: true,
      stale_note: 'Jobs data is stale or incomplete — refresh pending. No stale numbers shown.',
      score: null, components: [] }
  });
  runMod(env2, MOD_JP);
  var host2 = makeEl('div', env2);
  env2.sb.PFJobsPanel.mount(host2);
  var h2 = host2._innerHTML + allHTML(env2);
  if (h2.indexOf('JOBS-QUALITY COMPOSITE') !== -1 && h2.indexOf('refresh pending') !== -1)
    ok('M-05 stale renders honest note');
  else no('M-05 stale', 'missing honest note');
}

/* --- phq-geo-intel U-09/U-10 --- */
console.log('== 3c. phq-geo-intel (U-09/U-10) ==');
{
  var env = makeEnv({ hosts: ['pf-political-hq'] });
  runMod(env, MOD_GI);
  var h = allHTML(env);
  if (h.indexOf('ORGANIZER VIEW') !== -1 && h.indexOf('WHERE THE PRESSURE IS HOTTEST') !== -1)
    ok('geo-intel organizer view renders');
  else no('geo-intel render', 'missing');
  if (h.indexOf('>LA<') !== -1 && h.indexOf('23') !== -1) ok('U-09 intensity bars render (LA=23)');
  else no('U-09 bars', 'missing');
  if (h.indexOf('>TX<') === -1) ok('suppressed TX absent from intensity map');
  else no('U-09 suppression', 'TX rendered despite suppression');
  if (h.indexOf('CONTACTS / 100') !== -1 && h.indexOf('66.7') !== -1) ok('U-10 effectiveness table renders');
  else no('U-10 table', 'missing');
  if (h.indexOf('call 4') !== -1 && h.indexOf('form 2') !== -1) ok('U-10 method mix renders');
  else no('U-10 method mix', 'missing');
  if (h.indexOf('Test Campaign') !== -1) ok('campaign selector renders');
  else no('campaign selector', 'missing');
}
{
  var env2 = makeEnv({ hosts: ['pf-political-hq'], search: '?pf_off=geo-intel' });
  runMod(env2, MOD_GI);
  if (env2.hosts['pf-political-hq'].children.length === 0) ok('?pf_off=geo-intel kill');
  else no('geo-intel kill', 'module mounted anyway');
}
{
  var env3 = makeEnv({ hosts: ['pf-political-hq'] });
  env3.sb.PF_BACKEND_URL = '';
  try { runMod(env3, MOD_GI); ok('geo-intel fail-soft without backend'); }
  catch (e) { no('geo-intel fail-soft', String(e && e.message)); }
}

/* --- money-macro M-03/M-06 strip cards --- */
console.log('== 3d. money-macro strip cards ==');
{
  var env = makeEnv({ hosts: [] });
  runMod(env, MOD_MM);
  var host = makeEl('div', env);
  env.sb.PFMacro.mount(host);
  var h = host._innerHTML + allHTML(env);
  if (h.indexOf('YIELD-CURVE SPREAD') !== -1 && h.indexOf('+40 bp') !== -1) ok('M-03 strip card renders');
  else no('M-03 strip card', 'missing');
  if (h.indexOf('FED POLICY STANCE') !== -1 && h.indexOf('NEUTRAL') !== -1) ok('M-06 strip card renders');
  else no('M-06 strip card', 'missing');
  if (h.indexOf('MODEL M-03') !== -1 && h.indexOf('MODEL M-06') !== -1) ok('strip MODEL chips render');
  else no('strip MODEL chips render', 'missing');
  if (h.indexOf('never a forecast') !== -1 || h.indexOf('not a forecast') !== -1) ok('strip descriptive-only note');
  else no('strip note', 'missing');
}
{
  var env2 = makeEnv({ hosts: [], search: '?pf_off=yield-spread,policy-stance' });
  runMod(env2, MOD_MM);
  var host2 = makeEl('div', env2);
  env2.sb.PFMacro.mount(host2);
  var h2 = host2._innerHTML + allHTML(env2);
  if (h2.indexOf('YIELD-CURVE SPREAD') === -1 && h2.indexOf('FED POLICY STANCE') === -1)
    ok('strip model cards honor kill switches');
  else no('strip kill switches', 'cards rendered despite kills');
}

/* --- bank-fred-context M-03/M-06 --- */
console.log('== 3e. bank-fred-context model cards ==');
{
  var env = makeEnv({ hosts: [] });
  runMod(env, MOD_BF);
  var host = makeEl('div', env);
  env.sb.PFBankFred.mount(host, 5);
  var h = host._innerHTML + allHTML(env);
  if (h.indexOf('YIELD-CURVE SPREAD (10Y') !== -1) ok('M-03 bank card renders');
  else no('M-03 bank card', 'missing');
  if (h.indexOf('HOW RESTRICTIVE IS THE FED?') !== -1) ok('M-06 bank card renders');
  else no('M-06 bank card', 'missing');
  if (h.indexOf('MODEL · M-03') !== -1 && h.indexOf('MODEL · M-06') !== -1) ok('bank MODEL chips render');
  else no('bank MODEL chips render', 'missing');
  if (h.indexOf('DRAFT COPY') !== -1) ok('bank draft-copy chips render');
  else no('bank draft chips', 'missing');
}

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n' + fails.join('\n')); process.exit(1); }
