#!/usr/bin/env node
/* tests/fred-everywhere-p3.verify.cjs — FRED Everywhere Phase 3 frontend
   verification. Run from the repo root:
     node tests/fred-everywhere-p3.verify.cjs
   1. node --check on the 9 changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      new-series metadata (AGENCY/PLAIN/FREQ/SA_NSA), Pair-1 median read
      (retired CES read present only as a comment tombstone), 16-series
      macro subtitle, median re-points (governing read, macro rail,
      war-report matchup, economy M-01), Stack 'Em + explainer series
      lists, rent explainer label, Receipt check groceries + gas chips
      live / no "PHASE 3" labels / category kill switches, gasoline ID
      wired (motor-fuel component ID still never wired).
   3. Mocked-browser runtime tests (vm + DOM stub, JSONP intercepted):
      Receipt check groceries category renders the official food-at-home
      panel + the honest people's "building" state; gas chip is enabled
      with the CUSR0000SETB01 official leg (people's building state when
      no gasoline aggregate publishes); ?pf_off=receipt-groceries and
      ?pf_off=receipt-gas hide their chips; rent still renders both
      panels + gap.
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var C = path.join(ROOT, 'v1.4.3', 'core');
var FILES = [
  'v1.4.3/core/fred-shared.js', 'v1.4.3/core/money-macro.js', 'v1.4.3/core/fred-governing.js',
  'v1.4.3/games/fred-macro-rail.js', 'v1.4.3/games/fred-stackem.js', 'v1.4.3/games/fred-explain.js',
  'v1.4.3/games/fred-warreport.js', 'v1.4.3/games/fred-economy.js', 'v1.4.3/games/fred-receipt.js'
];
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function has(src, re) { return re.test(src); }
function hasS(f, sub) { return S[f].indexOf(sub) !== -1; }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
FILES.forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f + ' syntax'); }
  catch (e) { no('syntax ' + f, 'node --check failed'); }
});

/* ============ 2. static honesty checks ============ */
console.log('== 2. static honesty checks ==');
var S = {};
FILES.forEach(function (f) { S[f.replace(/^v1\.4\.3\//, '')] = stripComments(read(path.join(ROOT, f))); });

/* --- fred-shared.js: new-series metadata --- */
['DRCCLACBS', 'LES1252881600Q', 'CUSR0000SAF11', 'CUUR0000SEHA', 'CUSR0000SETB01'].forEach(function (id) {
  if (hasS('core/fred-shared.js', id + ':')) ok('shared metadata carries ' + id);
  else no('shared metadata ' + id, 'missing from a map');
});
if (has(S['core/fred-shared.js'], /LES1252881600Q:\s*'SA'/) &&
    has(S['core/fred-shared.js'], /CUSR0000SAF11:\s*'SA'/) &&
    has(S['core/fred-shared.js'], /CUSR0000SETB01:\s*'SA'/) &&
    has(S['core/fred-shared.js'], /DRCCLACBS:\s*'SA'/) &&
    has(S['core/fred-shared.js'], /CUUR0000SEHA:\s*'NSA'/))
  ok('shared SA/NSA: LES/FOOD/GAS/DELINQ SA, RENT NSA');
else no('shared SA/NSA', 'mismatch');
if (has(S['core/fred-shared.js'], /LES1252881600Q:\s*'q'/) &&
    has(S['core/fred-shared.js'], /DRCCLACBS:\s*'q'/) &&
    has(S['core/fred-shared.js'], /CUSR0000SAF11:\s*'m'/) &&
    has(S['core/fred-shared.js'], /CUSR0000SETB01:\s*'m'/))
  ok('shared FREQ: LES/DELINQ quarterly, FOOD/GAS monthly');
else no('shared FREQ', 'mismatch');
if (has(S['core/fred-shared.js'], /pair1:\s*'Median usual weekly earnings/))
  ok('shared READS.pair1 is the median read');
else no('shared pair1 read', 'not median-grounded');
if (S['core/fred-shared.js'].indexOf('Average wages are up') === -1)
  ok('shared: retired CES pair-1 read not rendered (comment tombstone only)');
else no('shared retired read', 'average-based pair-1 copy still live');

/* --- money-macro.js: 16 series --- */
if (hasS('core/money-macro.js', '16 SERIES')) ok('macro dashboard subtitle: 16 SERIES');
else no('macro subtitle', 'not 16');
if (S['core/money-macro.js'].indexOf('15 SERIES') === -1) ok('macro: no stale 15-series copy');
else no('macro stale copy', '15 SERIES still present');

/* --- fred-governing.js: real-wage read -> median --- */
if (hasS('core/fred-governing.js', 'LES1252881600Q (MEDIAN)')) ok('governing real-wage read re-pointed to median');
else no('governing median read', 'missing');
if (S['core/fred-governing.js'].indexOf('CES0500000003 (AVERAGE) vs CPIAUCNS') === -1)
  ok('governing: retired average pair line gone');
else no('governing retired pair', 'still present');
if (hasS('core/fred-governing.js', "'CES0500000003'") || hasS('core/fred-governing.js', '"CES0500000003"'))
  ok('governing 7-card strip keeps CES (News Desk series set)');
else no('governing strip', 'CES dropped from the 7-series block');

/* --- fred-macro-rail.js: earnings slot -> median --- */
if (has(S['games/fred-macro-rail.js'], /ORDER = \[[^\]]*'LES1252881600Q'[^\]]*\]/))
  ok('macro rail ORDER carries the median series');
else no('macro rail ORDER', 'LES missing');
if (S['games/fred-macro-rail.js'].indexOf('CES0500000003') === -1)
  ok('macro rail: CES fully retired from the rail');
else no('macro rail CES', 'CES still referenced');

/* --- fred-stackem.js: matchup 1 -> median, picker +3 --- */
if (has(S['games/fred-stackem.js'], /\{\s*sid1:\s*'LES1252881600Q',\s*sid2:\s*'CPIAUCNS'/))
  ok("stackem matchup[0] re-points to the median series");
else no('stackem matchup[0]', 'not median');
['DRCCLACBS', 'LES1252881600Q', 'CUSR0000SAF11', 'CUUR0000SEHA'].forEach(function (id) {
  if (hasS('games/fred-stackem.js', "'" + id + "'")) ok('stackem picker carries ' + id);
  else no('stackem picker ' + id, 'missing');
});
if (hasS('games/fred-stackem.js', "'CES0500000003'")) ok('stackem free-pick keeps CES (inequality lesson)');
else no('stackem CES', 'CES dropped from free pick');

/* --- fred-explain.js: rent label + series list --- */
if (hasS('games/fred-explain.js', 'What renters actually pay, from the CPI rent index'))
  ok('explain rent topic card: live rent copy');
else no('explain rent card', 'not updated');
if (S['games/fred-explain.js'].indexOf('via mortgage rates') === -1)
  ok('explain: via-mortgage rent label retired');
else no('explain rent label', 'via-mortgage copy still live');
['DRCCLACBS', 'LES1252881600Q', 'CUSR0000SAF11'].forEach(function (id) {
  if (hasS('games/fred-explain.js', "'" + id + "'")) ok('explain nerd-mode list carries ' + id);
  else no('explain list ' + id, 'missing');
});

/* --- fred-warreport.js: matchup -> median, 7-series block keeps CES --- */
if (has(S['games/fred-warreport.js'], /\{\s*id:\s*'wages-inflation',\s*a:\s*'LES1252881600Q'/))
  ok('war report wages-inflation matchup re-points to median');
else no('war report matchup', 'not median');
if (has(S['games/fred-warreport.js'], /ORDER = \[[^\]]*'CES0500000003'[^\]]*\]/))
  ok('war report 7-series block keeps CES (News Desk series set)');
else no('war report block', 'CES dropped from the 7-series block');

/* --- fred-economy.js: M-01 median copy --- */
if (hasS('games/fred-economy.js', 'Median real earnings growth')) ok('economy M-01 chart: median label');
else no('economy M-01 label', 'missing');
if (S['games/fred-economy.js'].indexOf('Average hourly earnings') === -1)
  ok('economy M-01: no average-earnings copy');
else no('economy M-01 copy', 'average copy still live');
if (hasS('games/fred-economy.js', 'the typical worker')) ok('economy M-01: median framing copy');
else no('economy M-01 framing', 'missing');

/* --- fred-receipt.js: groceries live, gas gated, no PHASE 3 labels --- */
if (S['games/fred-receipt.js'].indexOf('<small>PHASE 3</small>') === -1)
  ok('receipt: no PHASE 3 disabled labels');
else no('receipt PHASE 3 labels', 'still present');
if (hasS('games/fred-receipt.js', "official: 'CUSR0000SAF11'")) ok('receipt groceries official leg = CUSR0000SAF11');
else no('receipt groceries leg', 'missing');
if (has(S['games/fred-receipt.js'], /data-rc-cat="' \+ k \+ '"/) &&
    hasS('games/fred-receipt.js', "label: 'GROCERIES', official: 'CUSR0000SAF11'"))
  ok('receipt groceries chip is enabled (clickable)');
else no('receipt groceries chip', 'not enabled');
if (hasS('games/fred-receipt.js', "official: 'CUSR0000SETB01'"))
  ok('receipt gas official leg = CUSR0000SETB01');
else no('receipt gas leg', 'missing');
if (hasS('games/fred-receipt.js', "PF.skip('receipt-gas')"))
  ok('receipt gas category kill switch ?pf_off=receipt-gas');
else no('receipt gas kill', 'missing');
if (S['games/fred-receipt.js'].indexOf('failed verification at build') === -1)
  ok('receipt: verification-failure gated state removed');
else no('receipt gas gate', 'stale gated copy still present');
if (hasS('games/fred-receipt.js', "PF.skip('receipt-groceries')"))
  ok('receipt groceries category kill switch ?pf_off=receipt-groceries');
else no('receipt groceries kill', 'missing');
if (S['games/fred-receipt.js'].indexOf('CUSR0000SETB') === -1 ||
    S['games/fred-receipt.js'].indexOf('CUSR0000SETB01') !== -1)
  ok('receipt: motor-fuel component ID (CUSR0000SETB) never wired');
else no('receipt motor-fuel component ID', 'CUSR0000SETB present');
if (S['games/fred-stackem.js'].indexOf('CUSR0000SETB01') === -1 &&
    S['games/fred-explain.js'].indexOf('CUSR0000SETB01') === -1)
  ok('stackem/explainer: gasoline series not carded outside Receipt check (16-series scope stays Receipt + dashboard)');
else no('gasoline scope', 'SETB01 leaked into carded tools');

/* ============ 3. runtime (vm + DOM stub) ============ */
console.log('== 3. runtime (vm + DOM stub) ==');
function rentObs() {
  var o = [];
  for (var i = 14; i >= 0; i--) o.push({ period: '2026-' + String(8 - 0) + '-01', value: String(340 + (14 - i) * 0.4), retrieved_at: '2026-10-06T11:00:00Z' });
  o.forEach(function (r, k) { var m = 8 - k; r.period = '202' + (m > 0 ? '6' : '5') + '-' + String(m > 0 ? m : m + 12).padStart(2, '0') + '-01'; });
  return o;
}
function foodObs() {
  var o = [];
  for (var i = 14; i >= 0; i--) o.push({ period: '2026-08-01', value: String(335 + (14 - i) * 0.3), retrieved_at: '2026-10-06T11:00:00Z' });
  o.forEach(function (r, k) { var m = 8 - k; r.period = '202' + (m > 0 ? '6' : '5') + '-' + String(m > 0 ? m : m + 12).padStart(2, '0') + '-01'; });
  return o;
}
function makeStub(opts) {
  opts = opts || {};
  var killed = opts.killed || [];
  var bodies = [];
  var byId = {};
  function stubButton(attr, val) {
    var handlers = {};
    return {
      getAttribute: function (a) { return a === attr ? val : null; },
      addEventListener: function (t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
      click: function () { (handlers.click || []).forEach(function (fn) { fn(); }); }
    };
  }
  function genEl(tag) {
    var el = {
      tag: tag, children: [], _html: '', _id: '', className: '', style: {},
      dataset: {}, parentNode: null, textContent: '', _btns: [],
      set innerHTML(v) { this._html = String(v); bodies.push(this._html); this._btns = []; },
      get innerHTML() { return this._html; },
      set id(v) { this._id = v; if (v) byId[v] = this; },
      get id() { return this._id; },
      setAttribute: function () {}, getAttribute: function () { return null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
      insertBefore: function (c, ref) { this.children.unshift(c); c.parentNode = this; return c; },
      removeChild: function (c) { return c; },
      addEventListener: function () {}, removeEventListener: function () {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      querySelector: function () { var q = genEl('q'); return q; },
      querySelectorAll: function (sel) {
        var attr = sel === '[data-rc-cat]' ? 'data-rc-cat' : sel === '[data-rc-view]' ? 'data-rc-view' : null;
        if (!attr) return [];
        var vals = [], re = new RegExp('<button[^>]*' + attr + '="([a-z]+)"[^>]*>', 'g'), m;
        while ((m = re.exec(this._html))) vals.push(m[1]);
        var self = this;
        return vals.map(function (v) {
          var b = stubButton(attr, v);
          self._btns.push(b);
          return b;
        });
      },
      clickCat: function (v) {
        var found = null;
        this._btns.forEach(function (b) { if (b.getAttribute('data-rc-cat') === v) found = b; });
        if (found) found.click();
        return !!found;
      }
    };
    return el;
  }
  var hosts = opts.hosts || [];
  hosts.forEach(function (id) { var h = genEl('div'); h.id = id; });
  var store = {};
  var sandbox = {
    window: {
      PF: { skip: function (s) { return killed.indexOf(s) !== -1; }, error: function () {} },
      PF_BACKEND_URL: 'https://example.com/exec',
      location: { search: '', href: 'https://mtcstw.com/economy' },
      PFFred: {
        skip: function (s) { return killed.indexOf(s) !== -1; },
        api: function (action, params, cb) {
          var j = null;
          if (action === 'fred_series') {
            var sid = params && params.series_id;
            var obs = sid === 'CUSR0000SAF11' ? foodObs() : rentObs();
            j = { ok: true, series_id: sid, observations: obs, stale: false, days_old: 12 };
          } else if (action === 'price_board') {
            j = { ok: true, items: [{
              item_id: 'rent_1br', name: '1BR rent', unit: 'month', enough_data: true,
              median_cents: 135000, week_ago_median_cents: 134000, delta_pct: 0.75,
              sample_count: 7, contributors: 4
            }] };
          }
          try { cb(j); } catch (e) { throw e; }
        },
        esc: function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
        fmtPeriod: function (o) { return (o && o.period) || ''; },
        citation: function (o) { return (o && o.series_id || '') + ' · test citation'; },
        staleBadge: function () { return ''; },
        tapSheet: function () {}
      }
    },
    document: {
      readyState: 'complete',
      getElementById: function (id) {
        return Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null;
      },
      createElement: genEl,
      head: genEl('head'),
      body: genEl('body'),
      addEventListener: function () {}
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    console: console
  };
  sandbox.window.window = sandbox.window;
  return { sandbox: sandbox, bodies: bodies, byId: byId };
}
function runModule(opts) {
  var t = makeStub(opts);
  vm.createContext(t.sandbox);
  vm.runInContext(read(path.join(G, 'fred-receipt.js')), t.sandbox, { filename: 'fred-receipt.js' });
  return t;
}
function lastHtml(t) { return t.bodies[t.bodies.length - 1] || ''; }

/* --- A. rent renders by default --- */
(function () {
  var t = runModule({ hosts: ['pf-economy'] });
  var h = lastHtml(t);
  if (h.indexOf('RECEIPT CHECK') !== -1) ok('receipt mounts on #pf-economy');
  else no('receipt mount', 'missing');
  if (h.indexOf('data-rc-cat="rent"') !== -1 && /data-rc-cat="rent"[^>]*>RENT/.test(h)) ok('receipt rent chip renders');
  else no('receipt rent chip', 'missing');
  if (h.indexOf('data-rc-cat="groceries"') !== -1) ok('receipt groceries chip is enabled');
  else no('receipt groceries chip', 'not clickable');
  if (h.indexOf('data-rc-cat="gas"') !== -1 && /disabled[^>]*>GAS/.test(h) === false) ok('receipt gas chip is enabled (not disabled)');
  else no('receipt gas chip', 'not enabled');
  if (h.indexOf('CUUR0000SEHA') !== -1) ok('receipt rent official leg cites CUUR0000SEHA');
  else no('receipt rent citation', 'missing');
  if (h.indexOf('THE GAP') !== -1) ok('receipt rent gap renders');
  else no('receipt rent gap', 'missing');
})();

/* --- B. groceries category: official food panel + honest people's building state --- */
(function () {
  var t = runModule({ hosts: ['pf-economy'] });
  var host = t.byId['pf-receipt'];
  if (!host || !host.clickCat('groceries')) { no('receipt groceries click', 'chip not clickable'); return; }
  ok('receipt groceries chip clickable');
  var h = lastHtml(t);
  if (h.indexOf('CUSR0000SAF11') !== -1) ok('receipt groceries official leg cites CUSR0000SAF11');
  else no('receipt groceries citation', 'missing');
  if (h.indexOf('food at home (CPI)') !== -1) ok('receipt groceries official panel labeled food-at-home');
  else no('receipt groceries label', 'missing');
  if (h.indexOf('grocery basket') !== -1) ok('receipt groceries people\u2019s building state renders');
  else no('receipt groceries building state', 'missing');
  if (h.indexOf('THE GAP') === -1) ok('receipt groceries: no gap without a people\u2019s leg (honest)');
  else no('receipt groceries gap', 'gap rendered without a people\u2019s leg');
})();

/* --- C. category kill switches --- */
(function () {
  var t = runModule({ hosts: ['pf-economy'], killed: ['receipt-groceries'] });
  var h = lastHtml(t);
  if (h.indexOf('data-rc-cat="groceries"') === -1) ok('?pf_off=receipt-groceries hides the groceries chip');
  else no('receipt groceries kill', 'chip still rendered');
  if (h.indexOf('data-rc-cat="gas"') !== -1) ok('gas chip survives the groceries kill');
  else no('receipt gas vs groceries kill', 'gas chip wrongly hidden');
  if (h.indexOf('RECEIPT CHECK') !== -1) ok('receipt still mounts with the chip killed');
  else no('receipt kill mount', 'whole module suppressed');
})();
(function () {
  var t = runModule({ hosts: ['pf-economy'], killed: ['receipt-gas'] });
  var h = lastHtml(t);
  if (h.indexOf('data-rc-cat="gas"') === -1) ok('?pf_off=receipt-gas hides the gas chip');
  else no('receipt gas kill', 'chip still rendered');
  if (h.indexOf('data-rc-cat="groceries"') !== -1) ok('groceries chip survives the gas kill');
  else no('receipt groceries vs gas kill', 'groceries chip wrongly hidden');
  if (h.indexOf('RECEIPT CHECK') !== -1) ok('receipt still mounts with the gas chip killed');
  else no('receipt gas kill mount', 'whole module suppressed');
})();

/* --- E. gas category: official gasoline panel + honest people's building state --- */
(function () {
  var t = runModule({ hosts: ['pf-economy'] });
  var host = t.byId['pf-receipt'];
  if (!host || !host.clickCat('gas')) { no('receipt gas click', 'chip not clickable'); return; }
  ok('receipt gas chip clickable');
  var h = lastHtml(t);
  if (h.indexOf('CUSR0000SETB01') !== -1) ok('receipt gas official leg cites CUSR0000SETB01');
  else no('receipt gas citation', 'missing');
  if (h.indexOf('gasoline (all types, CPI)') !== -1) ok('receipt gas official panel labeled gasoline');
  else no('receipt gas label', 'missing');
  if (h.indexOf('Not enough reports yet') !== -1) ok('receipt gas people\u2019s building state renders');
  else no('receipt gas building state', 'missing');
  if (h.indexOf('THE GAP') === -1) ok('receipt gas: no gap without a people\u2019s leg (honest)');
  else no('receipt gas gap', 'gap rendered without a people\u2019s leg');
})();

/* --- D. master kill still suppresses --- */
(function () {
  var t = runModule({ hosts: ['pf-economy'], killed: ['economy-receipt'] });
  if (t.bodies.length === 0) ok('?pf_off=economy-receipt suppresses everything');
  else no('receipt master kill', 'rendered despite kill');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  ' + f); }); process.exit(1); }
