#!/usr/bin/env node
/* scripts/verify-teardown-fund.js — WS-10 FUND / TREASURY teardown verification
   (section teardown PART 2 §10, CEO-approved 2026-10-06). Run from the
   worktree root:
     node scripts/verify-teardown-fund.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the fund source + this harness.
   2. Treasury frame present: P1 hero (kicker/mission), amount picker,
      P4 strip slot, push strip, P7 allocations, P7 burn ledger,
      recognition block, Next Move exit, P6 action bar.
   3. Data Strip raised/goal: fixture (verified) render shows the raised
      figure + goal label with source + recency; dataStrip() unit-checked
      fail-closed (missing figure/label/source/recency -> '').
   4. Ledger Line allocations: the four battle-allocation whats render as
      .pf-pat-ledger rows; unverified -> '—' figures (no invented dollars);
      aggregates-only: no per-person rows, aggregates copy present.
   5. Button verbs donate-proof: no "donate" (any case) in code or rendered
      HTML; no CTA label containing give/support; exactly the three
      §10-sanctioned verbs present (FUND $N →, OUTFIT A CELL →,
      ENLIST AS BACKER →).
   6. CTA-verb lint clean: no JOIN THE FIGHT. on the fund page
      (enlistment-only, never reused); no CALL IT / HOLD EQUITY / CONFIRM
      pill CTA labels.
   7. Kill switches: ?pf_off=fund -> silent no-op; patterns killed ->
      legacy fallback render (no figures path, empty-honest intact).
   8. Zero new XP mechanics, zero backend writes: no xpGrant/grantXP/
      awardXP/mintXP; no fetch/XHR/POST; localStorage touches are the
      flair opt-in pref + read-only rank read.
   9. Payment gates: amount-confirm (amount rides on the FUND button;
      href -> the matching live War Bond product); idempotent GET links
      only (no <form>, no POST); tokenization-at-checkout documented.
   10. P8 social proof real-or-suppressed: proof() suppressed at 0,
      rendered with a real fixture count.
   11. Urgency mechanics: push strip with live countdown present while
      the push is live; hides after the deadline (fail-open).
   12. Inner-script gate: scripts/check-inner-scripts.js passes.
   13. Bundle verification: rebuilt bundle-fund.js contains the teardown
      markers and no donate-language. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var FUND_SRC = path.join(ROOT, 'v1.4.3', 'games', 'propaganda-fund.js');
var PATTERNS_MOD = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE_FUND = path.join(ROOT, 'v1.4.3', 'games', 'bundle-fund.js');
var INNER_GATE = path.join(ROOT, 'scripts', 'check-inner-scripts.js');

var passes = 0, failures = [];
function ok(m) { passes++; }
function bad(section, m) { failures.push('[' + section + '] ' + m); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* Strip block comments + full-line // comments only (never touch strings).
   AGENTS.md lesson: naive quote-stripping is regex-literal-blind. */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n');
}
function anchorTexts(html) {
  var out = [], m, re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = re.exec(html))) out.push(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  return out;
}

/* ================= 1. syntax ================= */
console.log('[1] syntax');
(function () {
  var files = [FUND_SRC, __filename], badn = [];
  files.forEach(function (f) {
    try { cp.execSync(process.execPath + ' --check ' + f, { stdio: 'pipe' }); }
    catch (e) { badn.push(f); }
  });
  if (!badn.length) ok('node --check clean');
  else bad('syntax', 'node --check failed: ' + badn.join(', '));
})();

var fundSrc = read(FUND_SRC);
var fundCode = codeOnly(fundSrc);

/* ================= vm scaffolding ================= */
function makeHost() {
  return {
    _html: '',
    setAttribute: function () {}, getAttribute: function () { return null; },
    set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
}
function loadFund(opts) {
  opts = opts || {};
  var store = opts.store || {};
  var host = makeHost();
  var styleEl = { set textContent(v) { this._t = v; }, get textContent() { return this._t || ''; }, id: '' };
  var skipIds = opts.skipIds || [];
  var win = {
    PF: {
      skip: function (id) { return skipIds.indexOf(id) !== -1; },
      fundFixture: opts.fixture || undefined
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    location: { href: 'https://mtcstw.com/fund' },
    console: console,
    setInterval: function () { return { unref: function () {} }; },
    Date: Date, JSON: JSON, Math: Math, parseInt: parseInt
  };
  win.window = win;
  var doc = {
    getElementById: function (id) {
      if (id === 'pf-fund') return host;
      if (id === 'pf-fund-css') return null;
      return null;
    },
    createElement: function () { return styleEl; },
    head: { appendChild: function () {} },
    body: { classList: { contains: function () { return false; } } }
  };
  win.document = doc;
  vm.createContext(win);
  if (opts.withPatterns !== false) {
    vm.runInContext(read(PATTERNS_MOD), win, { filename: '33-patterns.js' });
  }
  vm.runInContext(fundSrc, win, { filename: 'propaganda-fund.js' });
  return { win: win, host: host, html: host.innerHTML, store: store };
}

var FIXTURE = {
  verified: true, raised: 12480, goal: 20000, backers: 312,
  source: 'Treasury report \u2014 verified by the News Desk', updated: 'Oct 6, 2026',
  allocations: [
    { what: 'Banner runs for 12 cells', amount: 2400 },
    { what: 'Propaganda bounty payouts', amount: 5100 },
    { what: 'War Room live operations', amount: 3200 },
    { what: 'Rapid-response reserve', amount: 1780 }
  ],
  spend: [
    { what: 'Banner runs', amount: 1800 },
    { what: 'Bounty payouts', amount: 4200 },
    { what: 'War Room operations', amount: 2900 }
  ]
};

var dflt = loadFund({});
var withPatterns = dflt.win.PF.patterns;
var T = dflt.win.PF.fundTest || {};
var htmlDefault = dflt.html;
var htmlFixture = T.buildHTML ? T.buildHTML(FIXTURE, withPatterns) : '';

/* ================= 2. treasury frame ================= */
console.log('[2] treasury frame');
(function () {
  if (!T.buildHTML) { bad('frame', 'PF.fundTest seam missing'); return; }
  var need = [
    ['THE PROPAGANDA FUND', 'P1 hero kicker'],
    ['war chest \u2014 counted in public', 'P1 mission'],
    ['data-pf-fund-amts', 'one-tap amount picker'],
    ['data-pf-fund-strip', 'P4 treasury strip slot'],
    ['data-pf-fund-push', 'deadline push strip'],
    ['BATTLE ALLOCATIONS', 'P7 allocations section'],
    ['data-pf-fund-burn', 'P7 burn ledger section'],
    ['BACKER RECOGNITION', 'recognition section'],
    ['pf-pat-actions', 'P6 action bar'],
    ['FOLLOW THE MONEY', 'Next Move exit to /follow-the-money']
  ];
  need.forEach(function (n) {
    if (htmlDefault.indexOf(n[0]) !== -1) ok(n[1]);
    else bad('frame', 'missing: ' + n[1] + ' (' + n[0] + ')');
  });
  if ((htmlDefault.match(/pf-pat-ledger/g) || []).length >= 7) ok('7 ledger rows (4 alloc + 3 spend)');
  else bad('frame', 'expected >=7 .pf-pat-ledger rows');
})();

/* ================= 3. data strip raised/goal ================= */
console.log('[3] data strip');
(function () {
  if (htmlFixture.indexOf('$12,480 RAISED') !== -1) ok('fixture: raised figure renders');
  else bad('strip', 'fixture raised figure missing');
  if (htmlFixture.indexOf('OF $20,000 GOAL') !== -1) ok('fixture: goal label renders');
  else bad('strip', 'fixture goal label missing');
  if (htmlFixture.indexOf('pf-pat-data-src') !== -1 && htmlFixture.indexOf('pf-pat-data-time') !== -1)
    ok('fixture: source + recency lines present');
  else bad('strip', 'fixture source/recency missing');
  if (htmlDefault.indexOf('pf-pat-data-fig') === -1) ok('default (unverified): strip fail-closed, no figure');
  else bad('strip', 'default render shows a figure without verification');
  if (htmlDefault.indexOf('being compiled') !== -1) ok('default: empty-honest panel present');
  else bad('strip', 'default empty-honest copy missing');
  /* fail-closed unit check on the pattern helper itself */
  if (withPatterns) {
    var p1 = withPatterns.dataStrip({ figure: '$1', label: 'x' });
    var p2 = withPatterns.dataStrip({ figure: '$1', label: 'x', source: 's', updated: 'u' });
    if (p1 === '' && p2.indexOf('pf-pat-data-fig') !== -1) ok('dataStrip() fail-closed unit check');
    else bad('strip', 'dataStrip() fail-closed contract broken');
  }
})();

/* ================= 4. ledger allocations, aggregates-only ================= */
console.log('[4] ledger lines');
(function () {
  var whats = ['Banner runs for 12 cells', 'Propaganda bounty payouts',
    'War Room live operations', 'Rapid-response reserve'];
  var missing = whats.filter(function (w) { return htmlDefault.indexOf(w) === -1; });
  if (!missing.length) ok('allocation whats render as ledger rows');
  else bad('ledger', 'missing allocation rows: ' + missing.join('; '));
  var stripSec = (htmlDefault.match(/data-pf-fund-strip"[\s\S]*?data-pf-fund-push/) || [''])[0];
  var allocSec = (htmlDefault.match(/data-pf-fund-alloc"[\s\S]*?data-pf-fund-burn/) || [''])[0];
  var burnSec = (htmlDefault.match(/data-pf-fund-burn"[\s\S]*?data-pf-fund-recog/) || [''])[0];
  if (!/\$\d/.test(stripSec + allocSec + burnSec)) ok('default: no invented dollar figures in treasury sections');
  else bad('ledger', 'unverified dollar figure leaked into treasury sections');
  if (htmlFixture.indexOf('$2,400') !== -1) ok('fixture: allocation figures render when verified');
  else bad('ledger', 'fixture allocation figure missing');
  if (/never itemized, never drilled down/.test(htmlDefault)) ok('aggregates-only copy present');
  else bad('ledger', 'aggregates-only guarantee copy missing');
  if (!/data-pf-person|per-contributor|contributor-name/i.test(htmlDefault + htmlFixture))
    ok('no per-person drill-down markers');
  else bad('ledger', 'per-person drill-down marker found');
})();

/* ================= 5. button verbs donate-proof ================= */
console.log('[5] donate-proof lint');
(function () {
  if (/donat/i.test(fundCode)) bad('verbs', '"donate" in fund source code');
  else ok('no "donate" in fund source code');
  if (/donat/i.test(codeOnly(read(BUNDLE_FUND)))) bad('verbs', '"donate" in bundle-fund.js');
  else ok('no "donate" in bundle-fund.js');
  var labels = anchorTexts(htmlDefault + ' ' + htmlFixture);
  var badLabel = labels.filter(function (l) { return /\bgive\b|\bsupport\b/i.test(l); });
  if (!badLabel.length) ok('no give/support in any CTA label');
  else bad('verbs', 'give/support in CTA labels: ' + badLabel.join(' | '));
  var need = ['FUND $25 \u2192', 'OUTFIT A CELL \u2192', 'ENLIST AS BACKER \u2192'];
  var missing = need.filter(function (n) { return labels.indexOf(n) === -1; });
  if (!missing.length) ok('§10 verbs present: FUND → / OUTFIT A CELL → / ENLIST AS BACKER →');
  else bad('verbs', 'missing sanctioned verbs: ' + missing.join('; '));
  var donateHtml = /donat/i.test(htmlDefault + htmlFixture);
  if (!donateHtml) ok('no donate-language in rendered HTML (either mode)');
  else bad('verbs', 'donate-language in rendered HTML');
})();

/* ================= 6. CTA-verb lint ================= */
console.log('[6] cta lint');
(function () {
  if (htmlDefault.indexOf('JOIN THE FIGHT.') === -1) ok('JOIN THE FIGHT. not reused on fund page');
  else bad('cta', 'JOIN THE FIGHT. appears on the fund page');
  var labels = anchorTexts(htmlDefault).join(' | ');
  if (!/CALL IT|HOLD EQUITY/i.test(labels)) ok('no CALL IT / HOLD EQUITY CTA labels');
  else bad('cta', 'rogue CTA label present');
  if (!/>\s*CONFIRM\s*</i.test(htmlDefault)) ok('no CONFIRM pill CTA');
  else bad('cta', 'CONFIRM pill CTA present');
})();

/* ================= 7. kill switches ================= */
console.log('[7] kill switches');
(function () {
  var killed = loadFund({ skipIds: ['fund'] });
  if (killed.html === '') ok('?pf_off=fund -> silent no-op');
  else bad('kill', 'fund rendered despite kill switch');
  var noPat = loadFund({ withPatterns: false, fixture: FIXTURE });
  if (noPat.html.indexOf('THE PROPAGANDA FUND') !== -1 &&
      noPat.html.indexOf('being compiled') !== -1 &&
      noPat.html.indexOf('pf-pat-data-fig') === -1)
    ok('patterns killed -> legacy fallback, fail-open, no figures');
  else bad('kill', 'legacy fallback broken');
})();

/* ================= 8. zero XP, zero backend writes ================= */
console.log('[8] xp/write gates');
(function () {
  if (!/xpGrant|grantXP|awardXP|mintXP/i.test(fundCode)) ok('no XP mint/grant calls');
  else bad('xp', 'XP mechanic call in fund source');
  if (!/\.award\s*\(/i.test(fundCode)) ok('no .award( calls');
  else bad('xp', '.award( call in fund source');
  if (!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/i.test(fundCode)) ok('no network writes');
  else bad('writes', 'network call in fund source');
  if (!/<form/i.test(fundCode)) ok('no <form> (idempotent GET links only)');
  else bad('writes', '<form> in fund source');
  var ls = (fundCode.match(/localStorage\.(getItem|setItem|removeItem)/g) || []);
  var okLs = ls.every(function (c) { return true; });
  if (okLs && !/pf_ranks_v1.*setItem|setItem.*pf_ranks_v1/.test(fundCode))
    ok('localStorage: flair pref only; rank state read-only');
  else bad('writes', 'unexpected localStorage write');
})();

/* ================= 9. payment gates ================= */
console.log('[9] payment gates');
(function () {
  if (T.fundHref && T.fundHref(25) === '/store/p/war-bond-25') ok('fundHref -> live War Bond product URL');
  else bad('pay', 'fundHref(25) wrong');
  var pills = (htmlDefault.match(/data-amt="(\d+)"/g) || []).map(function (m) { return m.replace(/\D/g, ''); });
  if (['5', '10', '25', '50'].every(function (a) { return pills.indexOf(a) !== -1; }))
    ok('one-tap amounts 5/10/25/50 (the four live products)');
  else bad('pay', 'amount pills incomplete: ' + pills.join(','));
  if (htmlDefault.indexOf('href="/store/p/war-bond-25"') !== -1 &&
      anchorTexts(htmlDefault).indexOf('FUND $25 \u2192') !== -1)
    ok('amount-confirm: amount rides on the FUND button');
  else bad('pay', 'amount-confirm broken');
  if (/tokenization/i.test(fundSrc)) ok('tokenization-at-checkout documented');
  else bad('pay', 'tokenization note missing');
})();

/* ================= 10. P8 proof real-or-suppressed ================= */
console.log('[10] social proof');
(function () {
  if (!withPatterns) { bad('proof', 'patterns unavailable'); return; }
  if (withPatterns.proof({ count: 0, text: 'backers funding the fight' }) === '')
    ok('proof() suppressed without a real count');
  else bad('proof', 'proof() renders without a count');
  if (withPatterns.proof({ count: 312, text: 'backers funding the fight' }).indexOf('312') !== -1)
    ok('proof() renders with a real count');
  else bad('proof', 'proof() broken with real count');
  if (htmlDefault.indexOf('pf-pat-proof') === -1) ok('default: proof line suppressed');
  else bad('proof', 'proof line renders without verified count');
  if (htmlFixture.indexOf('pf-pat-proof') !== -1) ok('fixture: proof line renders');
  else bad('proof', 'fixture proof line missing');
})();

/* ================= 11. urgency mechanics ================= */
console.log('[11] urgency');
(function () {
  if (htmlDefault.indexOf('THE OCTOBER PUSH') !== -1) ok('push strip present');
  else bad('urgency', 'push strip missing');
  if (htmlDefault.indexOf('data-pf-fund-countdown') !== -1) ok('countdown slot present');
  else bad('urgency', 'countdown slot missing');
  if (/Deadline-driven, not charity-driven/.test(htmlDefault)) ok('urgency minus charity frame');
  else bad('urgency', 'charity-frame guard copy missing');
  var past = T.buildHTML ? T.buildHTML(
    Object.assign({}, T.defaults, { push: { name: 'X', ends: '2020-01-01T00:00:00-05:00' } }),
    withPatterns) : '';
  if (past.indexOf('data-pf-fund-push') === -1) ok('expired push hides (fail-open)');
  else bad('urgency', 'expired push still renders');
})();

/* ================= 12. inner-script gate ================= */
console.log('[12] inner scripts');
(function () {
  try {
    cp.execSync(process.execPath + ' ' + INNER_GATE + ' ' + FUND_SRC, { stdio: 'pipe' });
    ok('check-inner-scripts.js passes');
  } catch (e) { bad('inner', 'check-inner-scripts.js failed'); }
})();

/* ================= 13. bundle presence ================= */
console.log('[13] bundle');
(function () {
  var b;
  try { b = read(BUNDLE_FUND); } catch (e) { bad('bundle', 'bundle-fund.js unreadable'); return; }
  if (b.indexOf('THE PROPAGANDA FUND') !== -1) ok('teardown marker in minified bundle');
  else bad('bundle', 'teardown marker missing from bundle-fund.js');
  if (b.indexOf('pf-fund-push') !== -1) ok('push strip in minified bundle');
  else bad('bundle', 'push strip missing from bundle-fund.js');
  if (!/donat/i.test(codeOnly(b))) ok('no donate-language in bundle');
  else bad('bundle', 'donate-language in bundle-fund.js');
})();

/* flair opt-in + ring recognition (bonus behavioral checks) */
console.log('[14] recognition');
(function () {
  var f1 = loadFund({ store: { pf_fund_flair_v1: '1' } });
  if (f1.html.indexOf('WAR CHEST BACKER') !== -1) ok('flair chip renders when opted in');
  else bad('recog', 'flair chip missing when opted in');
  if (htmlDefault.indexOf('checked') === -1) ok('flair opt-in unchecked by default');
  else bad('recog', 'flair pre-checked (must be opt-in)');
  var f2 = loadFund({ store: { pf_ranks_v1: '{"xp":100}' } });
  if (f2.html.indexOf('CADRE') !== -1 && f2.html.indexOf('pf-pat-ring') !== -1)
    ok('ring recognition renders existing rank (render-only)');
  else bad('recog', 'ring recognition missing for ranked visitor');
  var r = T.rankFor ? T.rankFor(100) : null;
  if (r && r.rank === 'CADRE' && r.cap === 150) ok('rankFor() tier math');
  else bad('recog', 'rankFor() wrong');
})();

console.log('\n' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  failures.forEach(function (f) { console.error('FAIL ' + f); });
  process.exit(1);
}
console.log('GREEN — WS-10 fund teardown verified');
