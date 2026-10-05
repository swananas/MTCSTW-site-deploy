#!/usr/bin/env node
/* tests/fred-bank-phq.verify.cjs — Wave A5 FRED surfaces (S-06/S-13/S-08).
   Run from the repo root:
     node tests/fred-bank-phq.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      window.PFBankFred / window.PFJobsPanel contracts, per-surface kills,
      never auto-mounts, esc() on injected fields, fred_context rail +
      surface names, SA/NSA chips, source stamps + click-through URLs,
      honest-empty copy, no XP code, no invented figure values,
      peoplesbank.js + civic.js mount guards, build/bundle.js registration,
      theater-sitrep.js economy-line contract
   3. Mocked-browser runtime tests (vm + minimal DOM stub): PFBankFred.mount
      renders 3 cards from a bank_rates fixture in backend order (titles,
      values, periods, change labels, SA/NSA chips, source stamps,
      click-through hrefs, BORROW BENCHMARK tag, in-game rate block);
      fred_live:false renders the honest empty; a stale card suppresses its
      figure; fail-soft on null; kill honored. PFJobsPanel.mount renders 2
      cards + CITE THIS factual lines from a jobs fixture; renders NOTHING
      on null (fail-soft); kill honored. theater-sitrep.js loads clean and
      honors ?pf_off=sitrep-economy.
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var BF = path.join(ROOT, 'v1.4.3', 'games', 'bank-fred-context.js');
var JP = path.join(ROOT, 'v1.4.3', 'games', 'phq-jobs-panel.js');
var SR = path.join(ROOT, 'v1.4.3', 'games', 'theater-sitrep.js');
var PB = path.join(ROOT, 'v1.4.3', 'games', 'peoplesbank.js');
var CV = path.join(ROOT, 'v1.4.3', 'games', 'civic.js');
var BB = path.join(ROOT, 'build', 'bundle.js');
var BBANK = path.join(ROOT, 'v1.4.3', 'games', 'bundle-bank.js');
var BHQ = path.join(ROOT, 'v1.4.3', 'games', 'bundle-hq.js');
var BWR = path.join(ROOT, 'v1.4.3', 'games', 'bundle-warreport.js');
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

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[BF, JP, SR, PB, CV, BB].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var bf = read(BF), bfC = stripComments(bf);
var jp = read(JP), jpC = stripComments(jp);
var sr = read(SR), srC = stripComments(sr);
var pb = read(PB), pbC = stripComments(pb);
var cv = read(CV), cvC = stripComments(cv);
var bb = read(BB);

/* ============ 2. S-06 bank-fred-context.js static ============ */
console.log('== 2. S-06 bank-fred-context.js ==');
function stat(src, code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing: ' + re));
}
stat(bf, bfC, 'S06 PFBankFred contract', /window\.PFBankFred\s*=\s*\{\s*mount\s*:\s*mount\s*\}/);
stat(bf, bfC, 'S06 never auto-mounts', /function mount\(container,\s*gameRatePct\)/);
stat(bf, bfC, 'S06 kill bank-fred', /PF\.skip\(['"]bank-fred['"]\)/);
stat(bf, bfC, 'S06 master kill bank', /PF\.skip\(['"]bank['"]\)/);
stat(bf, bfC, 'S06 fred_context rail', /['"]fred_context['"]/);
stat(bf, bfC, 'S06 surface=bank_rates', /surface['"]?\s*:\s*['"]bank_rates['"]/);
stat(bf, bfC, 'S06 esc defined', /function esc\(s\)/);
if ((bfC.match(/[^a-zA-Z]esc\(/g) || []).length >= 3) ok('S06 esc used on injected fields'); else no('S06 esc used', 'esc() never called');
stat(bf, bfC, 'S06 SA/NSA chip', /pf-bf-chip/);
stat(bf, bfC, 'S06 source stamp', /FRED \\u00b7|FRED ·/);
stat(bf, bfC, 'S06 FRED click-through', /fred\.stlouisfed\.org\/series\//);
stat(bf, bfC, 'S06 borrow benchmark tag', /BORROW BENCHMARK/);
stat(bf, bfC, 'S06 game/official separation copy', /Game rates pay XP, not dollars/);
stat(bf, bfC, 'S06 honest empty copy', /Nothing here is estimated or seeded/);
stat(bf, bfC, 'S06 stale suppression', /s\.stale/);
if (!/xpGrant|TALLY_XP_CAP|xp_grant/i.test(bfC)) ok('S06 zero-XP'); else no('S06 zero-XP', 'XP-adjacent code found');
/* no invented figure values: the module must not hardcode numeric rates */
var nums = bfC.match(/\b\d+\.\d{2}\b/g) || [];
var badNums = nums.filter(function (n) { return ['1e9', '24.20'].indexOf(n) < 0; });
if (!badNums.length) ok('S06 no hardcoded figures'); else no('S06 no hardcoded figures', 'found: ' + badNums.join(','));

/* ============ 3. S-06 mount in peoplesbank.js ============ */
console.log('== 3. S-06 peoplesbank.js mount ==');
stat(pb, pbC, 'S06 slot div', /id="pbFredCtx"|id=\\"pbFredCtx\\"/);
stat(pb, pbC, 'S06 mount call guarded', /window\.PFBankFred\s*&&\s*window\.PFBankFred\.mount/);
stat(pb, pbC, 'S06 slot honors kill', /PF\.skip\(['"]bank-fred['"]\)/);
stat(pb, pbC, 'S06 passes in-game rate', /PFBankFred\.mount\(fctx,\s*\(BST && BST\.ok\) \? Number\(BST\.rate_pct\)/);

/* ============ 4. S-13 phq-jobs-panel.js static ============ */
console.log('== 4. S-13 phq-jobs-panel.js ==');
stat(jp, jpC, 'S13 PFJobsPanel contract', /window\.PFJobsPanel\s*=\s*\{\s*mount\s*:\s*mount\s*\}/);
stat(jp, jpC, 'S13 kill phq-jobs', /PF\.skip\(['"]phq-jobs['"]\)/);
stat(jp, jpC, 'S13 fred_context rail', /['"]fred_context['"]/);
stat(jp, jpC, 'S13 surface=jobs', /surface['"]?\s*:\s*['"]jobs['"]/);
stat(jp, jpC, 'S13 esc defined', /function esc\(s\)/);
if ((jpC.match(/[^a-zA-Z]esc\(/g) || []).length >= 3) ok('S13 esc used on injected fields'); else no('S13 esc used', 'esc() never called');
stat(jp, jpC, 'S13 CITE THIS block', /CITE THIS/);
stat(jp, jpC, 'S13 source stamp', /FRED \\u00b7|FRED ·/);
stat(jp, jpC, 'S13 FRED click-through', /fred\.stlouisfed\.org\/series\//);
stat(jp, jpC, 'S13 fail-soft renders nothing', /container\.innerHTML = ''/);
stat(jp, jpC, 'S13 stale suppression', /s\.stale/);
if (!/xpGrant|TALLY_XP_CAP|xp_grant/i.test(jpC)) ok('S13 zero-XP'); else no('S13 zero-XP', 'XP-adjacent code found');
/* no persuasive/editorial copy: the panel must stay facts-only */
if (!/what this means|should |must call|demand |fight back/i.test(jpC)) ok('S13 facts-only (no editorial copy)');
else no('S13 facts-only', 'editorial-sounding copy found');

/* ============ 5. S-13 mount in civic.js ============ */
console.log('== 5. S-13 civic.js mount ==');
stat(cv, cvC, 'S13 slot div', /id="cvJobsPanel"|id=\\"cvJobsPanel\\"/);
stat(cv, cvC, 'S13 slot above pressure pane', /cvJobsPanel[\s\S]{0,400}pressurePaneHTML|pressurePaneHTML\(\)[\s\S]{0,200}cvJobsPanel/);
stat(cv, cvC, 'S13 mount call guarded', /window\.PFJobsPanel\s*&&\s*window\.PFJobsPanel\.mount/);

/* ============ 6. S-08 theater-sitrep.js static ============ */
console.log('== 6. S-08 theater-sitrep.js ==');
stat(sr, srC, 'S08 kill sitrep-economy', /PF\.skip\(["']sitrep-economy["']\)/);
stat(sr, srC, 'S08 fred_context rail', /["']fred_context["']/);
stat(sr, srC, 'S08 surface=sitrep', /surface["']?\s*:\s*["']sitrep["']/);
stat(sr, srC, 'S08 economy line label', /STATE OF THE ECONOMY/);
stat(sr, srC, 'S08 official-via-FRED tag', /OFFICIAL VIA FRED/);
stat(sr, srC, 'S08 stale omission', /gdp\.stale \|\| un\.stale/);
stat(sr, srC, 'S08 esc on line', /esc\(econ\)/);
stat(sr, srC, 'S08 fail-soft (omit when dead)', /if \(econ\) h \+=/);
if (!/xpGrant/i.test(srC)) ok('S08 zero-XP'); else no('S08 zero-XP', 'xpGrant found');

/* ============ 7. bundle registration ============ */
console.log('== 7. bundle registration ==');
if (/'bank-fred-context\.js'/.test(bb)) ok('bundle-bank carries bank-fred-context.js'); else no('bundle bank-fred-context', 'not in build/bundle.js');
if (/'phq-jobs-panel\.js'/.test(bb)) ok('bundle-hq carries phq-jobs-panel.js'); else no('bundle phq-jobs-panel', 'not in build/bundle.js');
if (/bank-fred-context/.test(read(BBANK))) ok('bundle-bank.js built with module'); else no('bundle-bank.js', 'module missing from built bundle');
if (/phq-jobs-panel/.test(read(BHQ))) ok('bundle-hq.js built with module'); else no('bundle-hq.js', 'module missing from built bundle');
if (/sitrep-economy/.test(read(BWR))) ok('bundle-warreport.js built with S-08 patch'); else no('bundle-warreport.js', 'S-08 patch missing from built bundle');

/* ============ 8. mocked-browser runtime ============ */
console.log('== 8. mocked-browser runtime ==');
function makeSandbox() {
  var store = {};
  var els = {};
  function mkEl() {
    return {
      innerHTML: '', textContent: '', style: {}, dataset: {},
      setAttribute: function () {}, getAttribute: function () { return null; },
      appendChild: function () {}, removeChild: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {}
    };
  }
  var head = mkEl();
  var scripts = [];
  var sandbox = {
    console: console,
    window: null,
    document: {
      head: head,
      createElement: function (tag) {
        var el = mkEl(); el.tagName = tag;
        if (tag === 'script') { el.src = ''; scripts.push(el); }
        return el;
      },
      getElementById: function (id) {
        if (!els[id]) els[id] = mkEl();
        return els[id];
      },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      readyState: 'complete'
    },
    localStorage: {
      getItem: function (k) { return store[k] || null; },
      setItem: function (k, v) { store[k] = v; },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: function (fn) { return 0; },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Array: Array, Object: Object, RegExp: RegExp, Error: Error,
    isFinite: isFinite, isNaN: isNaN, encodeURIComponent: encodeURIComponent,
    parseInt: parseInt, parseFloat: parseFloat
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox._scripts = scripts;
  sandbox._els = els;
  return sandbox;
}
/* api() builds a JSONP script tag; the test harness answers it from the
   fixture by invoking the registered callback directly. */
function answerApi(sandbox, payload) {
  var s = sandbox._scripts[sandbox._scripts.length - 1];
  if (!s || !s.src) return false;
  var m = /callback=([^&]+)/.exec(s.src);
  if (!m) return false;
  var fn = decodeURIComponent(m[1]);
  if (typeof sandbox[fn] !== 'function') return false;
  sandbox[fn](payload);
  return true;
}
function cardFixture(id, title, val, label, period, change) {
  return {
    series_id: id, title: title, value: val, value_label: label,
    unit: 'percent', unit_label: 'Percent', period: period,
    period_label: period, change_label: change, change_basis: 'mom',
    sa_nsa: 'NSA', source: 'Board of Governors via FRED',
    source_url: 'https://fred.stlouisfed.org/series/' + id,
    stale: false, stale_note: null, retrieved_at: Date.now(), vintage_date: '2026-10-05'
  };
}

/* --- S-06 runtime --- */
(function () {
  var sb = makeSandbox();
  sb.PF = { skip: function () { return false; } };
  sb.PF_BACKEND_URL = 'https://api.example/';
  vm.createContext(sb);
  vm.runInContext(read(BF), sb, { filename: 'bank-fred-context.js' });
  if (!sb.PFBankFred || typeof sb.PFBankFred.mount !== 'function') { no('S06 runtime', 'PFBankFred.mount missing'); return; }
  ok('S06 module loads, PFBankFred exposed');
  var host = sb.document.getElementById('t1');
  sb.PFBankFred.mount(host, 2.5);
  var answered = answerApi(sb, {
    ok: true, fred_live: true, surface: 'bank_rates', retrieved_at: Date.now(),
    cards: [
      cardFixture('FEDFUNDS', 'FED FUNDS RATE', 4.33, '4.33', 'Sep 2026', '+0.00 pp'),
      cardFixture('DGS10', '10-YR TREASURY', 4.10, '4.10', 'Oct 2, 2026', '+0.05 pp'),
      cardFixture('MORTGAGE30US', '30-YR MORTGAGE', 6.55, '6.55', 'Oct 1, 2026', '-0.10 pp')
    ], note: ''
  });
  if (!answered) { no('S06 runtime', 'JSONP callback not invoked'); return; }
  var h = host.innerHTML;
  var checks = [
    ['renders 3 official cards', /FED FUNDS RATE/.test(h) && /10-YR TREASURY/.test(h) && /30-YR MORTGAGE/.test(h)],
    ['values + periods', /4\.33/.test(h) && /Sep 2026/.test(h)],
    ['change labels', /\+0\.00 pp/.test(h)],
    ['SA/NSA chips', /NSA/.test(h)],
    ['source stamps', /FRED/.test(h) && /RETRIEVED/.test(h)],
    ['click-through hrefs', /fred\.stlouisfed\.org\/series\/FEDFUNDS/.test(h)],
    ['BORROW BENCHMARK tag on mortgage', /BORROW BENCHMARK/.test(h)],
    ['in-game rate block', /YOUR BANK \(IN-GAME\)/.test(h) && /2\.5%\/week/.test(h)],
    ['separation copy', /Game rates pay XP, not dollars/.test(h)],
    ['no-duplication guard', sb.PFBankFred.mount(host, 2.5) === true]
  ];
  checks.forEach(function (c) { if (c[1]) ok('S06 ' + c[0]); else no('S06 ' + c[0], 'render mismatch'); });
})();

/* --- S-06 honest empty + fail-soft + kill --- */
(function () {
  var sb = makeSandbox();
  sb.PF = { skip: function () { return false; } };
  sb.PF_BACKEND_URL = 'https://api.example/';
  vm.createContext(sb);
  vm.runInContext(read(BF), sb, { filename: 'bank-fred-context.js' });
  var host = sb.document.getElementById('t2');
  sb.PFBankFred.mount(host, 0);
  /* Backend-supplied honest note is rendered verbatim (module must not
     substitute its own copy when the backend speaks). */
  answerApi(sb, { ok: true, fred_live: false, cards: [], note: 'No official macro data yet — wire the key.' });
  if (/OFFICIAL RATES CONNECTING/.test(host.innerHTML) && /wire the key/.test(host.innerHTML))
    ok('S06 honest empty (no key, backend note)'); else no('S06 honest empty', host.innerHTML.slice(0, 120));
  /* Without any backend note the module falls back to its locked copy. */
  var host2b = sb.document.getElementById('t2b');
  sb.PFBankFred.mount(host2b, 0);
  answerApi(sb, { ok: true, fred_live: false, cards: [], note: '' });
  if (/OFFICIAL RATES CONNECTING/.test(host2b.innerHTML) && /estimated or seeded/.test(host2b.innerHTML))
    ok('S06 honest empty (no key, fallback copy)'); else no('S06 honest empty fallback', host2b.innerHTML.slice(0, 120));
  var host2 = sb.document.getElementById('t3');
  sb.PFBankFred.mount(host2, 0);
  answerApi(sb, null);
  if (/FIRST REFRESH PENDING|OFFICIAL RATES CONNECTING/.test(host2.innerHTML))
    ok('S06 fail-soft on null'); else no('S06 fail-soft', host2.innerHTML.slice(0, 120));
  /* stale card: figure suppressed, note shown */
  var host3 = sb.document.getElementById('t4');
  sb.PFBankFred.mount(host3, 0);
  var stale = cardFixture('FEDFUNDS', 'FED FUNDS RATE', 4.33, '4.33', 'Sep 2026', '+0.00 pp');
  stale.stale = true; stale.stale_note = 'Last updated Sep 2026 — refresh pending.';
  answerApi(sb, { ok: true, fred_live: true, surface: 'bank_rates', cards: [stale], note: '' });
  if (/refresh pending/.test(host3.innerHTML) && !/pf-bf-value">4\.33/.test(host3.innerHTML))
    ok('S06 stale suppression'); else no('S06 stale suppression', host3.innerHTML.slice(0, 160));
})();

/* --- S-06 kill --- */
(function () {
  var sb = makeSandbox();
  sb.PF = { skip: function (k) { return k === 'bank-fred'; } };
  sb.PF_BACKEND_URL = 'https://api.example/';
  vm.createContext(sb);
  vm.runInContext(read(BF), sb, { filename: 'bank-fred-context.js' });
  if (!sb.PFBankFred) ok('S06 ?pf_off=bank-fred kills module');
  else no('S06 kill', 'module still exposed');
})();

/* --- S-13 runtime --- */
(function () {
  var sb = makeSandbox();
  sb.PF = { skip: function () { return false; } };
  sb.PF_BACKEND_URL = 'https://api.example/';
  vm.createContext(sb);
  vm.runInContext(read(JP), sb, { filename: 'phq-jobs-panel.js' });
  if (!sb.PFJobsPanel || typeof sb.PFJobsPanel.mount !== 'function') { no('S13 runtime', 'PFJobsPanel.mount missing'); return; }
  ok('S13 module loads, PFJobsPanel exposed');
  var host = sb.document.getElementById('j1');
  sb.PFJobsPanel.mount(host);
  var answered = answerApi(sb, {
    ok: true, fred_live: true, surface: 'jobs', retrieved_at: Date.now(),
    cards: [
      cardFixture('UNRATE', 'UNEMPLOYMENT RATE', 4.2, '4.20', 'Sep 2026', '+0.10 pp'),
      cardFixture('PAYEMS', 'PAYROLLS', 159000, '159,000', 'Sep 2026', '+143')
    ], note: ''
  });
  if (!answered) { no('S13 runtime', 'JSONP callback not invoked'); return; }
  var h = host.innerHTML;
  var checks = [
    ['renders 2 job cards', /UNEMPLOYMENT RATE/.test(h) && /PAYROLLS/.test(h)],
    ['values + periods', /4\.20/.test(h) && /159,000/.test(h) && /Sep 2026/.test(h)],
    ['CITE THIS factual lines', (h.match(/CITE THIS/g) || []).length === 2],
    ['quote line factual format', /UNEMPLOYMENT RATE IS 4\.20/.test(h)],
    ['source stamps', /FRED/.test(h) && /RETRIEVED/.test(h)],
    ['click-through hrefs', /fred\.stlouisfed\.org\/series\/UNRATE/.test(h)]
  ];
  checks.forEach(function (c) { if (c[1]) ok('S13 ' + c[0]); else no('S13 ' + c[0], 'render mismatch'); });
  /* fail-soft: null renders NOTHING */
  var host2 = sb.document.getElementById('j2');
  sb.PFJobsPanel.mount(host2);
  answerApi(sb, null);
  if (host2.innerHTML === '') ok('S13 fail-soft renders nothing on null');
  else no('S13 fail-soft', host2.innerHTML.slice(0, 120));
})();

/* --- S-13 kill --- */
(function () {
  var sb = makeSandbox();
  sb.PF = { skip: function (k) { return k === 'phq-jobs'; } };
  sb.PF_BACKEND_URL = 'https://api.example/';
  vm.createContext(sb);
  vm.runInContext(read(JP), sb, { filename: 'phq-jobs-panel.js' });
  if (!sb.PFJobsPanel) ok('S13 ?pf_off=phq-jobs kills module');
  else no('S13 kill', 'module still exposed');
})();

/* --- S-08 load + kill (full-module load in the sandbox) --- */
(function () {
  var sb = makeSandbox();
  sb.PF = {
    skip: function (k) { return k === 'sitrep-economy'; },
    hidden: function () { return true; },
    error: function () {}
  };
  sb.PF_BACKEND_URL = 'https://api.example/';
  sb.PFCallsign = function () { return 'TESTER'; };
  sb.PFDeviceId = function () { return 'd1'; };
  sb.MutationObserver = function () { this.observe = function () {}; };
  vm.createContext(sb);
  try {
    vm.runInContext(read(SR), sb, { filename: 'theater-sitrep.js' });
    ok('S08 theater-sitrep.js loads clean');
  } catch (e) { no('S08 load', String((e && e.message) || e).slice(0, 160)); }
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
process.exit(fails.length ? 1 : 0);
