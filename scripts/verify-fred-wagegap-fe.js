#!/usr/bin/env node
/* scripts/verify-fred-wagegap-fe.js — Wave B2 S-29 frontend harness.
   Run from the worktree root:
     node scripts/verify-fred-wagegap-fe.js
   1. node --check on the touched files
   2. Static checks (kill switch, backend contract shape, honest copy,
      zero-XP token, banned terms, no editorial, anti-duplication guard:
      the card must read ONLY ?action=fred_wagegap, never fred_wage_gap).
      NOTE (AGENTS.md lesson): comment-strip only, never string-strip.
   3. Mocked-browser runtime tests (vm + minimal DOM shim + JSONP capture):
      mount paths, kill switch, badge math, stamps, chart SVG, share hook
      guarded for pre-S-23, empty/stale/error states, XSS escaping.
   Rebuilds bundles first via build/bundle.js. Exits 0 when every check
   passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var GAME = path.join(V, 'games', 'fred-wagegap-card.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
/* Comment-strip ONLY (no quote stripping — the esc() /"/g pattern breaks
   naive string strippers; see AGENTS.md). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
/* Keep the diff surgical — revert unrelated bundle-hq regeneration churn. */
try {
  var hqDiff = cp.execSync('git -C ' + ROOT + ' diff --name-only -- v1.4.3/games/bundle-hq.js',
    { encoding: 'utf8' }).trim();
  if (hqDiff) {
    cp.execSync('git -C ' + ROOT + ' checkout -- v1.4.3/games/bundle-hq.js');
    ok('bundle-hq.js regeneration churn reverted (unrelated to this wave)');
  } else ok('bundle-hq.js untouched by rebuild');
} catch (e) { no('bundle-hq revert', e && e.message); }

console.log('== 1. node --check ==');
[GAME, path.join(ROOT, 'build', 'bundle.js')].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f)); }
  catch (e) { no(f, 'node --check failed'); }
});

var src = read(GAME);
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]wagegap['"]\)/.test(src)) ok('kill switch PF.skip("wagegap") wired');
else no('kill', 'PF.skip("wagegap") not found');
if (src.indexOf('?pf_off=wagegap') !== -1) ok('KILL comment documents ?pf_off=wagegap');
else no('kill comments', 'missing ?pf_off=wagegap docs');

if (src.indexOf("'fred_wagegap'") !== -1 || src.indexOf('"fred_wagegap"') !== -1)
  ok('contract action fred_wagegap present');
else no('contract action', 'fred_wagegap missing');
/* Anti-duplication: the card must NEVER call M-01's explorer action. */
if (code.indexOf('fred_wage_gap') === -1)
  ok('anti-duplication: fred_wage_gap action never called (S-29 reads only fred_wagegap)');
else no('anti-duplication', 'fred_wage_gap referenced in code — binding violation');

if (src.indexOf("copy_review: 'pending'") !== -1)
  ok('News label review flagged copy_review:pending (A3 pattern)');
else no('copy_review flag', 'missing pending flag for News Desk');

if (src.indexOf('macro-wagegap') !== -1 && /PFMacroCards\.render\(['"]macro-wagegap['"]/.test(src))
  ok('S-23 share hook: PFMacroCards.render("macro-wagegap", …) guarded');
else no('share hook', 'macro-wagegap painter hook missing');
if (src.indexOf('PFMacroCards') !== -1 && src.indexOf('typeof P.render') !== -1)
  ok('share hook fail-softs when S-23 painter is absent');
else no('share guard', 'unguarded PFMacroCards call');

if (!/\bxp\b/i.test(code)) ok('zero-XP token check (no xp word-token in code)');
else no('zero-XP rule', 'found xp-like token: ' +
  (code.match(/\S{0,20}\bxp\b\S{0,20}/i) || ['?'])[0]);
if (code.indexOf('xpGrant') === -1) ok('no xpGrant in code');
else no('xpGrant', 'xpGrant referenced');
if (code.indexOf('postAction') === -1) ok('module never touches PF.postAction (GET rails only)');
else no('PF surface', 'postAction referenced');

['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* No editorial layer (§0-5): no "what this means" commentary in code
   (checked on the comment-stripped view — the header documents the rule). */
if (code.toLowerCase().indexOf('what this means') === -1)
  ok('no editorial "what this means" layer');
else no('editorial', '"what this means" commentary present');
/* Never auto-mounts: no top-level mount() call, no page-specific host. */
if (!/^\s*mount\s*\(/m.test(code) && src.indexOf('#pf-economy') === -1)
  ok('never auto-mounts (mount only via window.PFWageGap)');
else no('auto-mount', 'top-level mount call or /economy host reference found');
if (src.indexOf('window.PFWageGap = { mount: mount }') !== -1)
  ok('exposes window.PFWageGap.mount');
else no('expose', 'window.PFWageGap.mount not exposed');

/* Badge copy per spec contract (drafts, News review pending). */
['AHEAD', 'BEHIND'].forEach(function (w) {
  if (src.indexOf(w) !== -1) ok('badge wording present: ' + w);
  else no('badge wording', w + ' missing');
});
if (src.indexOf('SA/NSA') !== -1) ok('SA/NSA chips documented');
else no('sa-nsa', 'SA/NSA chips missing');

var bundleEconomy = read(path.join(V, 'games', 'bundle-economy.js'));
if (bundleEconomy.indexOf('fred-wagegap-card.js') !== -1)
  ok('fred-wagegap-card.js marker in rebuilt bundle-economy.js');
else no('bundle marker', 'fred-wagegap-card.js missing from bundle-economy.js');
if (has(path.join(ROOT, 'build', 'bundle.js'), "'fred-wagegap-card.js'"))
  ok('fred-wagegap-card.js registered in build/bundle.js (bundle-economy)');
else no('bundle registration', 'fred-wagegap-card.js not in SECTIONS');

/* ================= mocked browser ================= */
console.log('== 3. mocked-browser runtime ==');

function makeWorld(opts) {
  opts = opts || {};
  var killed = {};
  (opts.kill || []).forEach(function (k) { killed[k] = true; });
  var scripts = [];
  function El(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this._raw = '';
    this.textContent = '';
    this.clicked = 0;
  }
  El.prototype.appendChild = function (c) {
    this.children.push(c); c.parentNode = this; return c;
  };
  El.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i !== -1) this.children.splice(i, 1);
    c.parentNode = null; return c;
  };
  Object.defineProperty(El.prototype, 'innerHTML', {
    get: function () {
      /* serialize like the real DOM: own markup + children's markup */
      return this._raw + this.children.map(function (c) { return c._raw; }).join('');
    },
    set: function (v) { this._raw = String(v); this.children = []; }
  });
  El.prototype.addEventListener = function (t, fn) {
    (this.listeners[t] = this.listeners[t] || []).push(fn);
  };
  El.prototype.click = function () {
    this.clicked++;
    (this.listeners.click || []).forEach(function (fn) { fn({ preventDefault: function () {} }); });
  };
  /* Minimal querySelector: returns a memoized stub element when the
     attribute is present in this element's rendered HTML, so listeners
     attached by the module and clicks fired by the test hit the same stub. */
  El.prototype.querySelector = function (sel) {
    var m = sel.match(/\[data-([a-z-]+)\]/);
    if (!m || this._raw.indexOf('data-' + m[1]) === -1) return null;
    this._qsCache = this._qsCache || {};
    if (!this._qsCache[sel]) {
      var stub = new El('stub');
      stub._attr = 'data-' + m[1];
      this._qsCache[sel] = stub;
    }
    return this._qsCache[sel];
  };
  var head = new El('head');
  var realHeadAppend = head.appendChild.bind(head);
  head.appendChild = function (c) {
    if (c.tagName === 'SCRIPT' && c.src) scripts.push(c);
    return realHeadAppend(c);
  };
  var container = new El('div');
  var sandbox = {
    console: console,
    setTimeout: function () { return 0; },
    Math: Math, JSON: JSON, Date: Date, RegExp: RegExp,
    encodeURIComponent: encodeURIComponent,
    window: null,
    document: {
      createElement: function (t) { return new El(t); },
      head: head,
      body: new El('body'),
      querySelector: function (sel) {
        if (sel === '#pf-wagegap-test') return container;
        return null;
      }
    }
  };
  sandbox.window = sandbox;
  sandbox.PF = {
    skip: function (id) { return !!killed[id]; },
    PF_BACKEND_URL: 'https://pf-api.test.workers.dev'
  };
  sandbox.window.PF = sandbox.PF;
  sandbox.window.PF_BACKEND_URL = 'https://pf-api.test.workers.dev';
  vm.createContext(sandbox);
  vm.runInContext(read(GAME), sandbox, { filename: 'fred-wagegap-card.js' });
  return { sandbox: sandbox, container: container, scripts: scripts, El: El };
}

function fireJsonp(world, payload) {
  var s = world.scripts[world.scripts.length - 1];
  if (!s) { no('jsonp', 'no script tag captured'); return false; }
  var m = String(s.src || '').match(/[?&]callback=([^&]+)/);
  if (!m) { no('jsonp', 'no callback param in ' + s.src); return false; }
  if (String(s.src).indexOf('action=fred_wagegap') === -1) {
    no('jsonp', 'script did not call action=fred_wagegap: ' + s.src); return false;
  }
  world.sandbox[m[1]](payload);
  return true;
}

function fixture(gap) {
  var series = [];
  var y = 2026, m = 10;
  for (var i = 0; i < 15; i++) {
    var mm = m - i, yy = y;
    while (mm < 1) { mm += 12; yy -= 1; }
    series.push({ period: yy + '-' + (mm < 10 ? '0' : '') + mm,
                  wage_yoy_pct: 3.8, cpi_yoy_pct: 2.6, gap_pp: gap == null ? 1.2 : gap });
  }
  return {
    ok: true, fred_live: true, retrieved_at: 1760000000000,
    latest: {
      period: '2026-10', period_label: 'Oct 2026',
      wage_yoy_pct: 3.8, cpi_yoy_pct: 2.6, gap_pp: gap == null ? 1.2 : gap,
      wage_series: { series_id: 'CES0500000003',
        source_url: 'https://fred.stlouisfed.org/series/CES0500000003',
        vintage_date: '2026-10-05', sa_nsa: 'SA' },
      cpi_series: { series_id: 'CPIAUCNS',
        source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS',
        vintage_date: '2026-10-05', sa_nsa: 'NSA' }
    },
    series: series, stale: false, stale_note: null, note: ''
  };
}

/* --- 3a. kill switch: mount is a silent no-op --- */
{
  var w = makeWorld({ kill: ['wagegap'] });
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (w.container.innerHTML === '' && w.scripts.length === 0)
    ok('kill ?pf_off=wagegap: no render, no fetch');
  else no('kill switch', 'mount rendered or fetched while killed');
}

/* --- 3b. full render: badge, lines, chips, stamps, chart, share --- */
{
  var w = makeWorld();
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (!fireJsonp(w, fixture(1.2))) { no('render', 'jsonp fire failed'); }
  else {
    var h = w.container.innerHTML;
    if (h.indexOf('+1.2pp AHEAD') !== -1) ok('badge: +1.2pp AHEAD');
    else no('badge', '+1.2pp AHEAD missing');
    if (h.indexOf('arithmetic, not a forecast') !== -1) ok('badge subline: arithmetic disclaimer');
    else no('badge subline', 'forecast disclaimer missing');
    if (h.indexOf('WAGE GROWTH') !== -1 && h.indexOf('PRICE GROWTH') !== -1)
      ok('two labeled lines in legend');
    else no('legend', 'WAGE GROWTH / PRICE GROWTH labels missing');
    if (h.indexOf('<svg') !== -1 && h.indexOf('#e8b923') !== -1 && h.indexOf('#c1121f') !== -1)
      ok('SVG chart with both line colors');
    else no('chart', 'SVG two-line chart missing');
    if (h.indexOf('SA</span>') !== -1 && h.indexOf('NSA</span>') !== -1)
      ok('SA + NSA chips rendered');
    else no('chips', 'SA/NSA chips missing');
    if (h.indexOf('https://fred.stlouisfed.org/series/CES0500000003') !== -1 &&
        h.indexOf('https://fred.stlouisfed.org/series/CPIAUCNS') !== -1)
      ok('both FRED source links stamped');
    else no('stamps', 'FRED series links missing');
    if (h.indexOf('vintage 2026-10-05') !== -1) ok('vintage dates stamped');
    else no('vintage', 'vintage_date missing');
    if (h.indexOf('SHARE THIS CHART') !== -1) ok('SHARE button rendered');
    else no('share button', 'SHARE THIS CHART missing');
    if (h.indexOf('target="_blank"') !== -1 && h.indexOf('rel="noopener"') !== -1)
      ok('FRED links open in new tab (noopener)');
    else no('link attrs', 'target/rel missing');
  }
}

/* --- 3c. behind badge --- */
{
  var w = makeWorld();
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w, fixture(-0.8))) {
    if (w.container.innerHTML.indexOf('−0.8pp BEHIND') !== -1 ||
        w.container.innerHTML.indexOf('-0.8pp BEHIND') !== -1)
      ok('badge: behind state renders');
    else no('badge behind', 'BEHIND badge missing');
  }
}

/* --- 3d. share hook: absent painter -> honest note; present painter -> render called --- */
{
  var w = makeWorld();
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w, fixture(1.2))) {
    var cardHtml = w.container.innerHTML;
    /* reach the card element the module appended (last child of container) */
    var cardEl = w.container.children[w.container.children.length - 1];
    var btn = cardEl.querySelector('[data-pf-wgc-share]');
    var hint = cardEl.querySelector('[data-pf-wgc-sharehint]');
    if (!btn || !hint) { no('share wiring', 'button/hint stubs not found'); }
    else {
      btn.click();
      if (hint.textContent.indexOf('macro-cards') !== -1)
        ok('share pre-S-23: honest "check back soon" note');
      else no('share note', 'fail-soft note missing, got: ' + hint.textContent);
      /* now with a painter present */
      var seen = null;
      w.sandbox.PFMacroCards = {
        render: function (t, el) { seen = { template: t, el: el }; }
      };
      btn.click();
      if (seen && seen.template === 'macro-wagegap' && seen.el === cardEl)
        ok('share with painter: PFMacroCards.render("macro-wagegap", cardEl)');
      else no('share call', 'painter not called correctly: ' + JSON.stringify(seen && seen.template));
    }
    if (cardHtml.indexOf('PFMacroCards') === -1) ok('no painter leak in rendered HTML');
    else no('painter leak', 'PFMacroCards referenced in markup');
  }
}

/* --- 3e. honest empties --- */
{
  var w = makeWorld();
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w, { ok: true, fred_live: false, note: 'No official macro data yet — hand-step open.' })) {
    if (w.container.innerHTML.indexOf('OFFICIAL DATA CONNECTING') !== -1)
      ok('no-key: honest empty copy');
    else no('no-key empty', 'locked empty copy missing');
  }
  var w2 = makeWorld();
  w2.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w2, { ok: true, fred_live: true, stale: true,
      stale_note: 'Latest figures are stale — refresh pending. No stale numbers shown.',
      latest: null, series: [] })) {
    var h2 = w2.container.innerHTML;
    if (h2.indexOf('FIGURES STALE') !== -1 && h2.indexOf('AHEAD') === -1 && h2.indexOf('BEHIND') === -1)
      ok('stale: suppressed figures, stale note shown');
    else no('stale', 'stale figures leaked or note missing');
  }
  var w3 = makeWorld();
  w3.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w3, { ok: true, fred_live: true, latest: null, series: [],
      note: 'Not enough shared history yet — the wage and price series need 12 overlapping months.' })) {
    if (w3.container.innerHTML.indexOf('12 overlapping months') !== -1)
      ok('thin history: overlap honest-empty');
    else no('overlap empty', 'overlap note missing');
  }
  var w4 = makeWorld();
  w4.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  if (fireJsonp(w4, null)) {
    if (w4.container.innerHTML.indexOf('FEED ERROR') !== -1)
      ok('network fail: friendly error, no stack trace');
    else no('error state', 'FEED ERROR missing');
  }
}

/* --- 3f. XSS escaping + URL sink guard --- */
{
  var w = makeWorld();
  w.sandbox.PFWageGap.mount('#pf-wagegap-test', {});
  var f = fixture(1.2);
  f.latest.period_label = 'Oct 2026"><script>alert(1)</script>';
  f.latest.wage_series.source_url = 'javascript:alert(1)';
  if (fireJsonp(w, f)) {
    var h = w.container.innerHTML;
    if (h.indexOf('<script>alert(1)</script>') === -1 && h.indexOf('&lt;script&gt;') !== -1)
      ok('XSS: period_label escaped');
    else no('XSS', 'unescaped script in output');
    if (h.indexOf('javascript:alert(1)') === -1)
      ok('URL sink guard: javascript: URL dropped');
    else no('url guard', 'javascript: URL rendered');
  }
}

/* --- 3g. missing container: silent no-op --- */
{
  var w = makeWorld();
  try {
    w.sandbox.PFWageGap.mount('#no-such-div', {});
    ok('missing container: silent no-op');
  } catch (e) { no('missing container', 'threw: ' + (e && e.message)); }
}

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n' + fails.join('\n')); process.exit(1); }
