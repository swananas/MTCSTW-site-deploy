#!/usr/bin/env node
/* tests/fred-everywhere-p2.verify.cjs — FRED Everywhere Phase 2 (three user
   modeling tools) frontend verification. Run from the repo root:
     node tests/fred-everywhere-p2.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      IIFE + PF guard + double-run guard, master ?pf_off=fred + per-surface
      kills, zero XP, banned moral verbs absent (robbed/stole/rigged), exact
      explainer disclaimer, 4-fact citations in share cards, combative-as-
      question, "average" wage labeling, Tool-3 never-blended copy,
      money-page section registration, bundle-fred-tools chunk + loader
   3. Mocked-browser runtime tests (vm + DOM stub, JSONP intercepted):
      Stack 'Em curated mount renders chart + honest read + citation;
      explainer renders 5 beats + exact disclaimer; Receipt check renders
      both panels + gap + sample-count honesty and the thin state;
      kills suppress everything; no merged official/people's number.
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
var MODS = {
  stackem: path.join(G, 'fred-stackem.js'),
  explain: path.join(G, 'fred-explain.js'),
  receipt: path.join(G, 'fred-receipt.js'),
  loader: path.join(C, 'fred-tools-loader.js'),
  moneypage: path.join(C, 'money-page.js')
};
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function has(src, re) { return re.test(src); }

/* ============ 0. bundles carry the tools ============ */
console.log('== 0. bundle registration ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
var toolsChunk = read(path.join(C, 'bundle-fred-tools.js'));
['fred-stackem.js', 'fred-explain.js', 'fred-receipt.js'].forEach(function (f) {
  if (toolsChunk.indexOf(f) !== -1) ok('bundle-fred-tools.js carries ' + f);
  else no('bundle-fred-tools.js', f + ' missing');
});
var pagesBundle = read(path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js'));
if (pagesBundle.indexOf('pfFredToolsLoading') !== -1) ok('bundle-pages.js carries fred-tools-loader.js');
else no('bundle-pages.js', 'fred-tools-loader missing');
var moneyChunk = read(path.join(C, 'bundle-money.js'));
if (moneyChunk.indexOf('PFStackEm') !== -1 && moneyChunk.indexOf('PFExplain') !== -1)
  ok('bundle-money.js carries stackem + explain');
else no('bundle-money.js', 'stackem/explain missing');

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
Object.keys(MODS).forEach(function (k) {
  try { cp.execSync('node --check ' + MODS[k], { stdio: 'pipe' }); ok(k + ' syntax'); }
  catch (e) { no('syntax ' + k, 'node --check failed'); }
});

/* ============ 2. static honesty checks ============ */
console.log('== 2. static honesty checks ==');
var S = {};
Object.keys(MODS).forEach(function (k) { S[k] = stripComments(read(MODS[k])); });

/* IIFE + PF guard + double-run guard. */
[['stackem', 'PFStackEm'], ['explain', 'PFExplain'], ['receipt', 'PFReceipt']].forEach(function (p) {
  var s = S[p[0]];
  if (has(s, /^\s*\(function\s*\(\)\s*\{/) || s.indexOf('(function () {') !== -1) ok(p[0] + ' IIFE');
  else no(p[0] + ' IIFE', 'missing');
  if (s.indexOf('if (!PF) return;') !== -1) ok(p[0] + ' PF guard');
  else no(p[0] + ' PF guard', 'missing');
  if (s.indexOf('if (window.' + p[1] + ') return;') !== -1) ok(p[0] + ' double-run guard');
  else no(p[0] + ' double-run guard', 'missing');
});

/* Master kill + per-surface kills. */
[['stackem', ['money-stackem', 'war-stack', 'academy-stackem']],
 ['explain', ['money-explain', 'economy-explain', 'war-explain', 'brief-explain']],
 ['receipt', ['economy-receipt']]].forEach(function (p) {
  var s = S[p[0]];
  if (s.indexOf("PF.skip('fred')") !== -1) ok(p[0] + ' master kill ?pf_off=fred');
  else no(p[0] + ' master kill', "PF.skip('fred') missing");
  p[1].forEach(function (k) {
    if (s.indexOf("'" + k + "'") !== -1) ok(p[0] + ' per-surface kill ' + k);
    else no(p[0] + ' kill ' + k, 'missing');
  });
});
if (S.loader.indexOf("PF.skip('fred')") !== -1) ok('loader honors ?pf_off=fred before fetch');
else no('loader kill', 'missing');

/* Zero XP. */
Object.keys(MODS).forEach(function (k) {
  if (/(xpGrant|awardXP|addXP|PF\.xp|localStorage.*\bxp\b)/i.test(S[k]))
    no(k + ' zero-XP', 'XP machinery reference found');
  else ok(k + ' zero-XP');
});

/* Banned moral verbs absent from copy (comment-stripped view). */
['stackem', 'explain', 'receipt'].forEach(function (k) {
  if (/\b(robbed|stole|rigged)\b/i.test(S[k])) no(k + ' banned verbs', 'robbed/stole/rigged in copy');
  else ok(k + ' no banned moral verbs');
});

/* Disclaimer is backend-owned (fred_explain payload, verified by the backend
   honesty suite): the frontend must render it verbatim, never author one. */
if (S.explain.indexOf('esc(j.disclaimer') !== -1) ok('explain renders backend disclaimer verbatim');
else no('explain disclaimer', 'not rendered verbatim');
if (!/disclaimer\s*:\s*['"]One series/.test(S.explain)) ok('explain authors no frontend disclaimer');
else no('explain disclaimer authorship', 'frontend disclaimer constant found');

/* 5-beat structure: the frontend renders backend beats verbatim (figure +
   beats 2–5), never inventing copy. Beat titles are backend-owned. */
if (S.explain.indexOf('beats') !== -1 && S.explain.indexOf('b.title') !== -1 &&
    S.explain.indexOf('b.text') !== -1) ok('explain 5-beat structure (verbatim render)');
else no('explain beats', 'missing');

/* Share card paints the backend 4-fact citations (content verified server-side). */
if (S.stackem.indexOf('j.citations') !== -1 && S.stackem.indexOf('Data: FRED') !== -1)
  ok('stackem share-card paints 4-fact citations');
else no('stackem share-card citations', 'missing');

/* Exact disclaimer text (backend-owned) — kept for the runtime render check. */
var DISCLAIMER = 'One series, one month, one honest read. It explains what moved — not what to do about it. Not financial advice. Not a prediction. For the full picture, stack two numbers.';

/* Tool 3: never blended. */
if (S.receipt.indexOf('never blended') !== -1) ok('receipt never-blended copy');
else no('receipt never-blended', 'missing');
if (/official[\s\S]{0,80}people/i.test(S.receipt) && !/\(off[\s\S]{0,40}\+[\s\S]{0,40}ppl\)\/2/.test(S.receipt))
  ok('receipt no averaging of the two datasets');
else no('receipt no-merge', 'suspicious merge pattern');

/* People's Index sample-count honesty. */
if (S.receipt.indexOf('5 reports') !== -1 && S.receipt.indexOf('3') !== -1) ok('receipt sample-count honesty');
else no('receipt sample-count', 'missing');

/* Cross-linking: every tool offers the other two (static — the compact
   briefing/war slots pass noXlinks/noFollow by design; full surfaces render
   them, verified in the builder paths). */
if (S.stackem.indexOf('pf-explain') !== -1 && S.stackem.indexOf('pf-receipt') !== -1)
  ok('stackem cross-links to tools 2+3');
else no('stackem cross-links', 'missing');
if (S.explain.indexOf('pf-stackem') !== -1 && S.explain.indexOf('pf-receipt') !== -1)
  ok('explain cross-links to tools 1+3');
else no('explain cross-links', 'missing');
if (S.receipt.indexOf('pf-stackem') !== -1 && S.receipt.indexOf('pf-explain') !== -1)
  ok('receipt cross-links to tools 1+2');
else no('receipt cross-links', 'missing');

/* Money-page section registration. */
if (S.moneypage.indexOf("'stackem'") !== -1 && S.moneypage.indexOf("'explain'") !== -1)
  ok('money-page registers stackem + explain sections');
else no('money-page sections', 'missing');

/* ============ 3. runtime (vm + DOM stub) ============ */
console.log('== 3. runtime (vm + DOM stub) ==');

/* Fixtures — synthetic paint-test values, not asserted facts. */
var FIX = {
  fred_compare: {
    ok: true, fred_live: true, mode: 'guided', pair_key: 'wages_vs_prices',
    basis: 'yoy', window_label: '5 years', comparison_paused: false,
    headline: 'ARE PAYCHECKS BEATING PRICES? Right now: yes — by 0.9 points.',
    read: [
      'Average hourly earnings are up 3.8% over the last 12 months; CPI inflation is up 2.9% over the same stretch.',
      'That is the whole story the numbers can tell: paychecks growing a little faster than prices.'
    ],
    legs: [
      { series_id: 'CES0500000003', title: 'Average Hourly Earnings', agency: 'U.S. Bureau of Labor Statistics',
        basis: '12-month % change', color: '#ffb347',
        points: [{ period: '2025-09', value: 3.5 }, { period: '2026-03', value: 3.6 }, { period: '2026-09', value: 3.8 }] },
      { series_id: 'CPIAUCNS', title: 'Consumer Price Index', agency: 'U.S. Bureau of Labor Statistics',
        basis: '12-month % change', color: '#6aa5ff',
        points: [{ period: '2025-09', value: 3.0 }, { period: '2026-03', value: 3.1 }, { period: '2026-09', value: 2.9 }] }
    ],
    disclosures: [{ text: 'Wages are seasonally adjusted; CPI is not — the legend says which is which.' }],
    citations: ['CES0500000003 · U.S. Bureau of Labor Statistics · Sep 2026 · retrieved Oct 5, 2026 via FRED',
                'CPIAUCNS · U.S. Bureau of Labor Statistics · Sep 2026 · retrieved Oct 5, 2026 via FRED'],
    retrieved_at: 1760000000000
  },
  fred_explain: {
    ok: true, fred_live: true, topic: 'rent',
    figure: { headline: 'RENT: +3.8% over the last 12 months.',
              citation: 'CUUR0000SEHA · U.S. Bureau of Labor Statistics · Sep 2026 · retrieved Oct 5, 2026 via FRED' },
    beats: [
      { n: 1, title: 'THE FIGURE', text: 'Rent of primary residence is up 3.8% year over year.' },
      { n: 2, title: 'WHAT IT MEASURES', text: 'What renters actually pay, sampled monthly by BLS.' },
      { n: 3, title: 'WHY IT MOVED', text: 'Lease turnover is still catching up to 2023 asking rents.' },
      { n: 4, title: 'WHAT IT MEANS FOR YOU', text: 'A $1,200 lease renewing at this pace lands near $1,246.' },
      { n: 5, title: 'WHAT TO WATCH', text: 'Next CPI release, and whether new-lease asking rents cool.' }
    ],
    disclaimer: DISCLAIMER,
    disclaimer_short: 'Not financial advice. Not a prediction.',
    followups: ['Stack rent against wages', 'Check the receipts'],
    retrieved_at: 1760000000000
  },
  fred_series: {
    ok: true, fred_live: true, series_id: 'CUUR0000SEHA',
    observations: (function () {
      var o = [], v = 320.0;
      for (var i = 0; i < 15; i++) {
        o.push({ period: '2026-' + ('0' + (9 - i)).slice(-2), value: +(v - i * 0.9).toFixed(1), retrieved_at: 1760000000000 });
      }
      return o;
    })()
  },
  price_board: {
    ok: true, area_key: 'national',
    items: [{
      item_id: 'rent_1br', enough_data: true,
      median_cents: 125000, week_ago_median_cents: 123000,
      delta_pct: 1.6, sample_count: 7, reporter_count: 4
    }]
  },
  price_board_thin: {
    ok: true, area_key: 'national',
    items: [{ item_id: 'rent_1br', enough_data: false, sample_count: 2, reporter_count: 1 }]
  }
};

function makeStub(opts) {
  opts = opts || {};
  var killed = opts.killed || [];
  var fix = opts.fix || FIX;
  var hosts = opts.hosts || [];
  var bodies = [];
  var byId = {};
  function stubEl() {
    return {
      addEventListener: function () {}, removeEventListener: function () {},
      setAttribute: function () {}, getAttribute: function () { return null; },
      click: function () {}, textContent: '', className: '', style: {},
      dataset: {}, parentNode: null
    };
  }
  function genEl(tag) {
    var el = {
      tag: tag, children: [], _html: '', _id: '', className: '', style: {},
      dataset: {}, parentNode: null, textContent: '',
      set innerHTML(v) { this._html = String(v); bodies.push(this._html); },
      get innerHTML() { return this._html; },
      set id(v) { this._id = v; if (v) byId[v] = this; },
      get id() { return this._id; },
      setAttribute: function () {}, getAttribute: function () { return null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
      insertBefore: function (c, ref) { this.children.unshift(c); c.parentNode = this; return c; },
      removeChild: function (c) { return c; },
      addEventListener: function () {}, removeEventListener: function () {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      querySelector: function (sel) {
        /* Capturing element: result renders (mountCurated/mountInto write
           into el.querySelector(...).innerHTML) must be observable. */
        var q = genEl('q');
        return q;
      },
      querySelectorAll: function () { return []; },
      get firstChild() { return this.children[0] || null; }
    };
    return el;
  }
  hosts.forEach(function (id) { var h = genEl('div'); h.id = id; });
  byId['pf-fe-css'] = null;
  var store = {};
  var sandbox = {
    window: {
      PF: { skip: function (s) { return killed.indexOf(s) !== -1; }, error: function () {} },
      PF_BACKEND_URL: 'https://example.com/exec',
      location: { search: '', href: 'https://mtcstw.com/economy' },
      PFFred: {
        skip: function (s) { return killed.indexOf(s) !== -1; },
        api: function (action, params, cb) {
          var key = action === 'price_board' && params && params.thin ? 'price_board_thin' : action;
          var j = Object.prototype.hasOwnProperty.call(fix, key) ? fix[key] : null;
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

function runModule(name, opts) {
  var t = makeStub(opts);
  vm.createContext(t.sandbox);
  vm.runInContext(read(MODS[name]), t.sandbox, { filename: name + '.js' });
  return t;
}
function allHtml(t) { return t.bodies.join('\n'); }

/* --- A. Stack 'Em curated mount on War Report --- */
(function () {
  var t = runModule('stackem', { hosts: ['xWarReport'] });
  var h = allHtml(t);
  if (!t.sandbox.window.PFStackEm) { no('stackem exposes PFStackEm', 'missing'); return; }
  ok('stackem exposes PFStackEm');
  if (h.indexOf('THIS WEEK') !== -1 || h.indexOf('STACK') !== -1) ok('stackem curated mounts on #xWarReport');
  else no('stackem curated mount', 'no mount output; got ' + h.slice(0, 120));
  if (h.indexOf('ARE PAYCHECKS BEATING PRICES') !== -1) ok('stackem renders honest read');
  else no('stackem read', 'headline missing');
  if (h.indexOf('CES0500000003') !== -1 && h.indexOf('CPIAUCNS') !== -1) ok('stackem renders 4-fact citations');
  else no('stackem citations', 'missing');
  if (h.indexOf('<svg') !== -1) ok('stackem renders SVG chart');
  else no('stackem chart', 'missing');
  if (/\b(robbed|stole|rigged)\b/i.test(h)) no('stackem rendered copy', 'banned verb rendered');
  else ok('stackem rendered copy has no banned verbs');
  if (h.indexOf('FLIP IT') !== -1 || S.stackem.indexOf('data-se-act="flip"') !== -1 ||
      S.stackem.indexOf('data-se-act=\\"flip\\"') !== -1) ok('stackem follow-ups (flip/try-a-matchup)');
  else no('stackem follow-ups', 'missing');
})();

/* --- B. Stack 'Em master kill suppresses --- */
(function () {
  var t = runModule('stackem', { hosts: ['xWarReport'], killed: ['fred'] });
  if (allHtml(t) === '') ok('stackem ?pf_off=fred suppresses');
  else no('stackem kill', 'rendered despite kill');
})();

/* --- C. Stack 'Em guided mode in Academy --- */
(function () {
  var t = runModule('stackem', { hosts: ['pf-academy-hq'] });
  var h = allHtml(t);
  if (h.indexOf('GUIDED') !== -1 || h.indexOf('guided') !== -1) ok('stackem guided mounts on #pf-academy-hq');
  else no('stackem guided mount', 'no guided output; got ' + h.slice(0, 120));
  if (t.sandbox.window.PFStackEm.mountGuided && t.sandbox.window.PFStackEm.mountCurated)
    ok('stackem exposes guided + curated API');
  else no('stackem guided API', 'missing');
})();

/* --- D. Explainer renders 5 beats + disclaimer --- */
(function () {
  var t = runModule('explain', { hosts: ['xBrief'] });
  var h = allHtml(t);
  if (!t.sandbox.window.PFExplain) { no('explain exposes PFExplain', 'missing'); return; }
  ok('explain exposes PFExplain');
  if (h.indexOf('RENT: +3.8%') !== -1) ok('explain renders the figure');
  else no('explain figure', 'missing');
  /* Beat 1 is the figure block; beats 2–5 render as <details>. */
  var beats = (h.match(/<details class="pf-ex-beat"/g) || []).length;
  if (beats === 4 && h.indexOf('pf-ex-fig') !== -1) ok('explain renders 5 beats (figure + 4 details)');
  else no('explain beats', 'got ' + beats + ' detail beats');
  if (h.indexOf(DISCLAIMER) !== -1) ok('explain renders exact disclaimer');
  else no('explain disclaimer render', 'missing');
})();

/* --- E. Explainer kill suppresses --- */
(function () {
  var t = runModule('explain', { hosts: ['xBrief'], killed: ['brief-explain'] });
  if (allHtml(t) === '') ok('explain ?pf_off=brief-explain suppresses');
  else no('explain kill', 'rendered despite kill');
})();

/* --- F. Receipt check: both panels, gap, sample honesty --- */
(function () {
  var t = runModule('receipt', { hosts: ['pf-economy'] });
  var h = allHtml(t);
  if (!t.sandbox.window.PFReceipt) { no('receipt exposes PFReceipt', 'missing'); return; }
  ok('receipt exposes PFReceipt');
  if (h.indexOf('RECEIPT CHECK') !== -1) ok('receipt hero mounts on #pf-economy');
  else no('receipt mount', 'missing; got ' + h.slice(0, 120));
  if (h.indexOf('OFFICIAL') !== -1 && h.indexOf('PEOPLE') !== -1) ok('receipt renders both panels');
  else no('receipt panels', 'missing');
  if (h.indexOf('SIDE-BY-SIDE') !== -1) ok('receipt segmented toggle renders');
  else no('receipt toggle', 'missing');
  if (h.indexOf('THE GAP') !== -1) ok('receipt gap described');
  else no('receipt gap', 'missing');
  if (h.indexOf('7 reports') !== -1) ok('receipt sample-count honesty (7 reports)');
  else no('receipt sample count', 'missing');
  if (h.indexOf('never blended') !== -1) ok('receipt never-blended copy renders');
  else no('receipt never-blended render', 'missing');
  /* No merged number: exactly two figures render (one per panel) — the gap
     is described in words, never averaged into a third number. */
  var figs = (h.match(/pf-rc-fig/g) || []).length;
  if (figs === 2) ok('receipt no merged number (2 figures, 0 blends)');
  else no('receipt no-merge', figs + ' figures rendered');
})();

/* --- G. Receipt check thin state --- */
(function () {
  var t = makeStub({ hosts: ['pf-economy'] });
  vm.createContext(t.sandbox);
  /* Swap in the thin price board via the api stub's thin flag. */
  var origApi = t.sandbox.window.PFFred.api;
  t.sandbox.window.PFFred.api = function (action, params, cb) {
    if (action === 'price_board') params = { thin: true };
    return origApi(action, params, cb);
  };
  vm.runInContext(read(MODS.receipt), t.sandbox, { filename: 'receipt.js' });
  var h = allHtml(t);
  if (h.indexOf('Not enough reports yet') !== -1) ok('receipt thin state renders');
  else no('receipt thin state', 'missing; got ' + h.slice(0, 160));
  if (h.indexOf('5 reports') !== -1) ok('receipt thin state cites 5-report minimum');
  else no('receipt thin minimum', 'missing');
})();

/* --- H. Receipt kill suppresses --- */
(function () {
  var t = runModule('receipt', { hosts: ['pf-economy'], killed: ['economy-receipt'] });
  if (allHtml(t) === '') ok('receipt ?pf_off=economy-receipt suppresses');
  else no('receipt kill', 'rendered despite kill');
})();

/* --- I. Loader: no fetch without a tool host --- */
(function () {
  var t = runModule('loader', { hosts: [] });
  if (t.sandbox.window.pfFredToolsLoading) no('loader idle', 'fetched without a host');
  else ok('loader idle without a tool host');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) {
  console.log('FAILURES:');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
