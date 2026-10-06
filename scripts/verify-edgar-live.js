#!/usr/bin/env node
/* scripts/verify-edgar-live.js — SEC EDGAR live pills verification.
   CEO directive 2026-10-06 ~15:34 CDT: live EDGAR rail for the Robbery Report.
   Run from the repo root: node scripts/verify-edgar-live.js
   1. node --check on new/changed files
   2. Static checks: kill switch, bundle registration, esc() on all
      interpolations, zero-XP tokens, fail-open guards, banned terms,
      ITEM_COMPANIES covers every robreport-data.js item id.
   3. Mocked-browser runtime tests (vm + minimal DOM shim): pillHTML per
      status, fill() wiring, fail-open paths, XSS escaping, fmtDate.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var EL = 'v1.4.3/core/edgar-live.js';
var RR = 'v1.4.3/core/robreport.js';
var RD = 'v1.4.3/core/robreport-data.js';
var fails = [], passes = 0;
function ok(n) { passes++; }
function no(n, why) { fails.push(n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
[EL, RR, 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok('check ' + f); }
  catch (e) { no('check ' + f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var src = read(EL), stripped = stripComments(src);

if (has(EL, "qs('pf_off') === 'edgarlive'")) ok('kill switch (?pf_off=edgarlive)');
else no('kill switch', 'missing');
if (has('build/bundle-core.js', "'core/edgar-live.js'")) ok('bundle registration (MONEY_FILES)');
else no('bundle registration', 'core/edgar-live.js not in build/bundle-core.js');
/* esc() on interpolations: every dynamic value in pillHTML goes through esc() */
var pillFn = src.slice(src.indexOf('function pillHTML'), src.indexOf('function fill'));
var interpCount = (pillFn.match(/esc\(/g) || []).length;
if (interpCount >= 8) ok('esc() on pill interpolations (' + interpCount + ')');
else no('esc() coverage', 'only ' + interpCount + ' esc() calls in pillHTML');
if (!/xpGrant|postAction|authCall/i.test(stripped)) ok('zero-XP tokens');
else no('zero-XP', 'XP/auth tokens found');
if (/donate/i.test(stripped)) no('banned terms', '"donate" found');
else ok('no banned terms');
if (stripped.indexOf('PF.bus.jsonp') !== -1 && stripped.indexOf('catch (e)') !== -1) ok('fail-open guards (jsonp + try/catch)');
else no('fail-open', 'missing guards');
if (has(RR, 'data-rr-live')) ok('host placeholder (data-rr-live in robreport.js)');
else no('host placeholder', 'robreport.js has no data-rr-live placeholder');

/* ITEM_COMPANIES covers every robreport-data.js item id (minus baskets/excluded) */
var itemIds = [];
var idRe = /id: '([a-z0-9-]+)'/g, m;
var rdSrc = read(RD);
while ((m = idRe.exec(rdSrc))) itemIds.push(m[1]);
var nonItems = ['big-mac', 'monthly-essentials', 'cleaning-baby', 'pantry-staples', 'cleaning-personal'];
var missing = itemIds.filter(function (id) {
  return nonItems.indexOf(id) === -1 && src.indexOf("'" + id + "'") === -1;
});
if (!missing.length) ok('ITEM_COMPANIES covers all ' + (itemIds.length - nonItems.length) + ' item ids');
else no('item coverage', 'missing: ' + missing.join(','));

console.log('== 3. runtime tests (vm + DOM shim) ==');

function makeSandbox(opts) {
  opts = opts || {};
  var nodes = [];
  function mkNode(id) {
    return {
      _id: id,
      style: { display: 'none' },
      innerHTML: '',
      getAttribute: function (n) { return n === 'data-rr-live' ? this._id : null; },
    };
  }
  (opts.itemIds || []).forEach(function (id) { nodes.push(mkNode(id)); });
  var jsonpCalls = [];
  var sandbox = {
    console: console,
    location: { search: opts.search || '' },
    document: {
      readyState: 'loading',
      head: { appendChild: function () {} },
      createElement: function () { return { set textContent(v) {}, }; },
      getElementById: function () { return null; },
      querySelectorAll: function (sel) { return sel === '[data-rr-live]' ? nodes : []; },
      documentElement: {},
    },
    addEventListener: function () {},
    MutationObserver: undefined,
    setTimeout: setTimeout,
    PF: {
      backend: null,
      skip: function () { return false; },
      bus: opts.noBus ? undefined : {
        jsonp: function (action, params) {
          jsonpCalls.push({ action: action, params: params });
          return Promise.resolve(opts.jsonpResponse === undefined ? null : opts.jsonpResponse);
        },
      },
    },
    _nodes: nodes,
    _jsonpCalls: jsonpCalls,
  };
  sandbox.window = sandbox;
  return sandbox;
}

function loadEL(sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'edgar-live.js' });
  return sandbox.PF && sandbox.PF.edgarLive;
}

var co = function (status, extra) {
  var base = { key: 'nike', ticker: 'NKE', status: status,
    live: { margin: 0.429, margin_pct: '42.9', period_end: '2026-05-31', filed: '2026-07-15',
            form: '10-K', edgar_url: 'https://www.sec.gov/Archives/x' },
    curated: { margin: 0.429, margin_pct: '42.9' } };
  if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
  return base;
};

/* pillHTML per status */
(function () {
  var api = loadEL(makeSandbox());
  var p1 = api.pillHTML(co('confirmed'));
  if (p1.indexOf('LIVE FROM EDGAR') !== -1 && p1.indexOf('42.9%') !== -1 && p1.indexOf('Jul 15, 2026') !== -1) ok('pill: confirmed');
  else no('pill: confirmed', p1.slice(0, 120));
  var p2 = api.pillHTML(co('new_filing'));
  if (p2.indexOf('NEW FILING') !== -1 && p2.indexOf('under review') !== -1) ok('pill: new_filing');
  else no('pill: new_filing', p2.slice(0, 120));
  var p3 = api.pillHTML(co('drift'));
  if (p3.indexOf('UNDER REVIEW') !== -1 && p3.indexOf('42.9%') !== -1) ok('pill: drift');
  else no('pill: drift', p3.slice(0, 120));
  var p4 = api.pillHTML(co('uncomparable'));
  if (p4.indexOf('company-wide') !== -1) ok('pill: uncomparable');
  else no('pill: uncomparable', p4.slice(0, 120));
  if (api.pillHTML(co('stale')) === '' && api.pillHTML(co('unavailable', { live: null })) === '') ok('pill: stale/unavailable render nothing');
  else no('pill: stale/unavailable', 'should be empty string');
  if (api.pillHTML(null) === '' && api.pillHTML({}) === '') ok('pill: null-safe');
  else no('pill: null-safe', 'should be empty string');
})();

/* XSS escaping */
(function () {
  var api = loadEL(makeSandbox());
  var evil = co('confirmed', { live: { margin: 0.5, margin_pct: '50.0"><script>alert(1)</script>',
    period_end: '2026-05-31', filed: '2026-07-15', form: '10-K', edgar_url: 'javascript:alert(1)' } });
  var p = api.pillHTML(evil);
  if (p.indexOf('<script>') === -1 && p.indexOf('&quot;') !== -1) ok('pill: XSS escaped');
  else no('pill: XSS', 'unescaped markup in pill');
})();

/* fmtDate */
(function () {
  var api = loadEL(makeSandbox());
  if (api.fmtDate('2026-07-15') === 'Jul 15, 2026' && api.fmtDate('bogus') === 'bogus') ok('fmtDate');
  else no('fmtDate', api.fmtDate('2026-07-15'));
})();

/* fill() wiring */
(function () {
  var sb = makeSandbox({ itemIds: ['pegasus', 'iphone', 'nope'] });
  var api = loadEL(sb);
  var byKey = { nike: co('confirmed'), apple: co('uncomparable') };
  var n = api.fill(byKey);
  var peg = sb._nodes[0], iph = sb._nodes[1], nop = sb._nodes[2];
  if (n === 2 && peg.style.display === 'block' && peg.innerHTML.indexOf('LIVE FROM EDGAR') !== -1 &&
      iph.innerHTML.indexOf('company-wide') !== -1 && nop.style.display === 'none') ok('fill: pills wired, unknown id skipped');
  else no('fill', 'n=' + n + ' peg=' + peg.innerHTML.slice(0, 60));
})();

/* fill() fail-open: no matching companies */
(function () {
  var sb = makeSandbox({ itemIds: ['pegasus'] });
  var api = loadEL(sb);
  var n = api.fill({});
  if (n === 0 && sb._nodes[0].style.display === 'none') ok('fill: fail-open on empty data');
  else no('fill fail-open', 'n=' + n);
})();

/* boot() fail-open: no bus */
(function () {
  var sb = makeSandbox({ noBus: true, itemIds: ['pegasus'] });
  var api = loadEL(sb);
  try { api.boot(); ok('boot: fail-open without PF.bus'); }
  catch (e) { no('boot fail-open', String(e).slice(0, 80)); }
})();

/* boot() fail-open: null backend response */
(function () {
  var sb = makeSandbox({ itemIds: ['pegasus'], jsonpResponse: null });
  var api = loadEL(sb);
  try {
    api.boot();
    setTimeout(function () {
      if (sb._nodes[0].style.display === 'none') ok('boot: fail-open on null response');
      else no('boot null response', 'placeholder was filled');
      finish();
    }, 50);
  } catch (e) { no('boot null response', String(e).slice(0, 80)); finish(); }
  function finish() {
    console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
    if (fails.length) { fails.forEach(function (f) { console.log('FAIL: ' + f); }); process.exit(1); }
  }
})();
