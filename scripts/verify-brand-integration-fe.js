#!/usr/bin/env node
/* scripts/verify-brand-integration-fe.js — Brand Integration verification
   (fe/brand-integration, 2026-10-06).
   Run from the worktree root: node scripts/verify-brand-integration-fe.js
   1. node --check on new/changed files
   2. Static checks: kill switches, REG completeness + CTA standard, banned
      terms, bundle markers, every surface hook + link + handoff present,
      the /bounty -> /data-bounties retarget
   3. Mocked-browser runtime tests (vm + minimal DOM shim): NEW_REG merge,
      registerPainter + drainExternalPainters + resolvePoster precedence,
      registerDynamicReg, handoff() presets + idempotency, scan() nets mode
      vs full bar, [data-pf-handoff] scan wiring
   4. Shells out to the sibling verifiers (robreport, data-bounties) so their
      contracts stay green under the integration edits.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

var FILES = [
  'v1.4.3/core/share-everywhere.js',
  'v1.4.3/core/robreport.js',
  'v1.4.3/games/inflation-tracker.js',
  'v1.4.3/games/fred-stackem.js',
  'v1.4.3/games/war-report.js',
  'v1.4.3/games/data-bounties.js',
  'v1.4.3/games/academy.js',
  'v1.4.3/pages/political-hq.js',
  'v1.4.3/core/19-crossnav.js',
  'v1.4.3/games/fred-economy.js',
  'build/bundle-core.js',
  'build/bundle.js'
];

console.log('== 1. node --check ==');
FILES.forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var SE = 'v1.4.3/core/share-everywhere.js';
if (has(SE, "PF.skip('share-everywhere')")) ok('kill switch (share-everywhere)');
else no('kill switch', 'missing');
if (has('v1.4.3/core/robreport.js', "?pf_off=robreport")) ok('kill switch (robreport)');
else no('kill switch', 'robreport missing');

/* New REG entries: every one present with title/tag/lines/cta */
var NEW_KEYS = ['robreport', 'robreport-basket', 'war-report', 'inflation-board',
  'stackem', 'fred-economy', 'data-bounties', 'political-hq', 'academy',
  'shrinkflation', 'utilities', 'war-report-archive', 'peoples-cpi-methodology'];
var seSrc = read(SE);
var regOk = true;
NEW_KEYS.forEach(function (k) {
  if (seSrc.indexOf("'" + k + "'") === -1) { regOk = false; no('REG ' + k, 'missing template'); }
});
if (regOk) ok('REG templates (' + NEW_KEYS.length + ' new)');
/* CTA standard: JOIN THE FIGHT. + MTCSTW.COM in the custom-painter footer */
if (has(SE, "fillText('MTCSTW.COM'") && has(SE, "fillText('JOIN THE FIGHT.'")) ok('CTA standard in paintFooter');
else no('CTA standard', 'paintFooter missing MTCSTW.COM / JOIN THE FIGHT.');
/* Banned terms in the new/changed surface files (comment-stripped). */
['v1.4.3/core/share-everywhere.js', 'v1.4.3/core/robreport.js',
 'v1.4.3/games/data-bounties.js', 'v1.4.3/games/war-report.js',
 'v1.4.3/games/academy.js', 'v1.4.3/pages/political-hq.js'].forEach(function (f) {
  var s = stripComments(read(f)).toLowerCase();
  if (s.indexOf('donate') !== -1) no('banned term in ' + f, '"donate" found');
  if (s.indexOf('shanetheswan') !== -1) no('identity in ' + f, '@shanetheswan found');
});
ok('banned-term scan (no "donate", no @shanetheswan)');

/* Bundle markers */
var bcSrc = read('build/bundle-core.js');
/* Teardown: the P6 Action Bar now ships via 33-patterns.js (not
   share-everywhere.js). The shipping guarantee is that the patterns
   module — provider of the P6 Action Bar — is in the core build list. */
if (bcSrc.indexOf("'core/33-patterns.js'") !== -1)
  ok('build list: 33-patterns (P6 Action Bar) in bundle-core.js');
else no('build list', '33-patterns.js missing from bundle-core.js');
if (bcSrc.indexOf("'core/robreport.js'") !== -1) ok('build list: robreport in bundle-money');
else no('build list', 'robreport.js missing from MONEY_FILES');
var bSrc = read('build/bundle.js');
if (bSrc.indexOf('data-bounties.js') !== -1) ok('build list: data-bounties in bundle.js');
else no('build list', 'data-bounties.js missing');
if (bSrc.indexOf('war-report.js') !== -1) ok('build list: war-report in bundle.js');
else no('build list', 'war-report.js missing');

/* Surface hooks + link integrations + handoffs */
var HOOKS = [
  /* Teardown WS-5: robreport share is per-card PFShare posters registered
     directly (PFShare.setPoster) + data-rr-share buttons wired by
     wireShare() -> P.poster(pid) -> P.shareImage(). The loop closers are
     text links (/economy#pf-inflation-checkin, /follow-the-money). The
     old data-pf-share / data-pf-share-mode / data-pf-handoff / _painters /
     SE.resolvePoster hooks are retired; take-cell lives in the P6
     Action Bar (33-patterns.js). */
  ['v1.4.3/core/robreport.js', "PFShare.setPoster('robreport-' + it.id", 'robreport per-item poster registration'],
  ['v1.4.3/core/robreport.js', "PFShare.setPoster('robreport-basket-' + b.id", 'robreport per-basket poster registration'],
  ['v1.4.3/core/robreport.js', 'data-rr-share="', 'robreport card share buttons (data-rr-share)'],
  ['v1.4.3/core/robreport.js', "querySelectorAll('[data-rr-share]')", 'robreport wireShare wiring'],
  ['v1.4.3/core/robreport.js', 'P.poster(pid)', 'robreport poster resolution path'],
  ['v1.4.3/core/robreport.js', "href: '/economy#pf-inflation-checkin'", 'robbery card -> CPI checkin link'],
  ['v1.4.3/core/robreport.js', "href: '/follow-the-money'", 'robbery card -> follow-the-money link'],
  ['v1.4.3/core/robreport.js', 'SHARE THIS INTEL', 'robreport SHARE THIS INTEL card action'],
  ['v1.4.3/core/33-patterns.js', "'TAKE THIS TO YOUR CELL'", 'P6 Action Bar take-cell (replaces take-cell handoff)'],
  ['v1.4.3/games/inflation-tracker.js', 'data-pf-share="inflation-board"', 'inflation board/trends nets hook'],
  ['v1.4.3/games/inflation-tracker.js', 'data-pf-handoff="share-intel"', 'inflation SHARE THIS INTEL'],
  ['v1.4.3/games/fred-stackem.js', 'data-pf-share="stackem"', 'stackem nets hook'],
  ['v1.4.3/games/war-report.js', 'data-pf-share="war-report"', 'war report share bar'],
  ['v1.4.3/games/data-bounties.js', 'data-pf-handoff="take-cell"', 'bounty board -> cells handoff'],
  ['v1.4.3/games/academy.js', 'TAKE THIS TO YOUR CELL', 'academy certificate -> cells'],
  ['v1.4.3/games/academy.js', 'href="/cells"', 'academy /cells link'],
  ['v1.4.3/pages/political-hq.js', 'data-pf-share="political-hq"', 'political-hq share bar'],
  ['v1.4.3/pages/political-hq.js', 'data-pf-handoff="report-back"', 'political-hq REPORT BACK'],
  ['v1.4.3/games/fred-economy.js', "setAttribute('data-pf-share', 'fred-economy')", 'fred-economy nets hook'],
  ['v1.4.3/games/fred-economy.js', "setAttribute('data-pf-handoff', 'share-intel')", 'fred-economy SHARE THIS INTEL'],
  ['v1.4.3/core/19-crossnav.js', "window.location.replace('/data-bounties'", '/bounty -> /data-bounties retarget'],
  ['v1.4.3/core/19-crossnav.js', "'/bounty'", '/bounty path match']
];
var hooksOk = true;
HOOKS.forEach(function (h) {
  if (!has(h[0], h[1])) { hooksOk = false; no('hook: ' + h[2], h[0] + ' missing ' + h[1]); }
});
if (hooksOk) ok('surface hooks + links + handoffs (' + HOOKS.length + ')');

/* Handoff API present in the public surface */
['handoff: handoff', 'registerPainter: registerPainter', 'HANDOFFS = {',
 "'share-intel'", "'take-cell'", "'report-back'"].forEach(function (s) {
  if (has(SE, s)) ok('API ' + s);
  else no('API', s + ' missing from share-everywhere.js');
});

console.log('== 3. runtime tests (vm + DOM shim) ==');
function makeShim() {
  function matches(el, sel) {
    /* minimal: [attr], [attr="val"], and bare tag names (e.g. 'a') */
    if (/^[a-zA-Z][\w-]*$/.test(sel || '')) {
      return String(el.tagName || '').toUpperCase() === sel.toUpperCase();
    }
    var m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel || '');
    if (!m) return false;
    var v = el.getAttribute(m[1]);
    if (v === null || v === undefined) return false;
    return m[2] === undefined || String(v) === m[2];
  }
  function walk(el, sel, out) {
    if (matches(el, sel)) out.push(el);
    (el.children || []).forEach(function (c) { walk(c, sel, out); });
    return out;
  }
  function mkEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(),
      children: [], attributes: {}, style: {},
      textContent: '', innerHTML: '',
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      getAttribute: function (k) { return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
      addEventListener: function () {},
      querySelector: function (sel) { var r = walk(this, sel, []); return r[0] || null; },
      querySelectorAll: function (sel) { return walk(this, sel, []); }
    };
    return el;
  }
  var head = mkEl('head'), body = mkEl('body');
  var doc = {
    createElement: mkEl, head: head, body: body,
    readyState: 'complete', addEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function (sel) {
      var r = walk(head, sel, []).concat(walk(body, sel, [])); return r[0] || null;
    },
    querySelectorAll: function (sel) { return walk(head, sel, []).concat(walk(body, sel, [])); }
  };
  return { document: doc, body: body };
}

function loadModule() {
  var shim = makeShim();
  var PFShare = {
    REG: {},
    setPoster: function (id, fn) { (this._ps = this._ps || {})[id] = fn; },
    poster: function (gid) {
      if (!PFShare.REG[gid]) return null;
      return { width: 1080, height: 1350, _pfGeneric: true, getContext: function () { return null; } };
    },
    shareImage: function () {}, saveImage: function () {},
    stampCallsign: function (cv) { return cv; }
  };
  var sandbox = {
    window: {}, document: shim.document, navigator: { userAgent: 'node', clipboard: null },
    localStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; },
      setItem: function (k, v) { this._s[k] = String(v); } },
    setTimeout: function () {}, setInterval: function () {}, clearInterval: function () {},
    MutationObserver: function () { this.observe = function () {}; },
    URL: { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} },
    Blob: function () {}, Image: function () {},
    XMLSerializer: function () { this.serializeToString = function () { return '<svg/>'; }; },
    console: console
  };
  sandbox.window.PF = { skip: function () { return false; }, toast: function () {}, shareUrl: function (u) { return u; } };
  sandbox.window.PFShare = PFShare;
  sandbox.PFShare = PFShare;
  sandbox.PF = sandbox.window.PF;
  sandbox.window.pfShareEverywhereDone = false;
  vm.createContext(sandbox);
  vm.runInContext(read(SE), sandbox, { filename: 'share-everywhere.js' });
  return { sandbox: sandbox, PFShare: PFShare, shim: shim };
}

try {
  var m = loadModule();
  var PSE = m.sandbox.window.PFShareEverywhere;
  if (!PSE) { no('runtime boot', 'PFShareEverywhere undefined'); }
  else {
    ok('runtime boot');
    var regMissing = NEW_KEYS.filter(function (k) { return !m.PFShare.REG[k]; });
    if (!regMissing.length) ok('NEW_REG merged into PFShare.REG (' + NEW_KEYS.length + ')');
    else no('REG merge', 'missing: ' + regMissing.join(','));

    /* every NEW_REG entry: title/tag/lines/cta complete, cta non-empty */
    var fieldsOk = NEW_KEYS.every(function (k) {
      var g = m.PFShare.REG[k];
      return g && g.title && g.tag && g.lines && g.lines.length && g.cta;
    });
    if (fieldsOk) ok('REG entries complete (title/tag/lines/cta)');
    else no('REG completeness', 'a new entry is missing a field');

    /* registerPainter + resolvePoster precedence */
    PSE.registerPainter('test-x', function (done) { done({ custom: true }); });
    var got = null;
    PSE.resolvePoster('test-x', function (cv) { got = cv; });
    if (got && got.custom) ok('registerPainter -> resolvePoster precedence');
    else no('registerPainter', 'custom painter not resolved first');

    /* drainExternalPainters: PFRobReport._painters picked up on scan() */
    m.sandbox.window.PFRobReport = { _painters: { 'rr-drain': function (done) { done({ drained: true }); } } };
    PSE.scan();
    var got2 = null;
    PSE.resolvePoster('rr-drain', function (cv) { got2 = cv; });
    if (got2 && got2.drained) ok('drainExternalPainters (robreport mirror)');
    else no('drainExternalPainters', 'robreport painter not picked up');

    /* registerDynamicReg: per-item robreport REG from PFRobReportData */
    m.sandbox.window.PFRobReportData = {
      ITEMS: [{ id: 'x1', name: 'Test Item' }],
      BASKETS: [{ id: 'b1', name: 'Test Basket' }]
    };
    PSE.scan();
    var d1 = m.PFShare.REG['robreport-x1'], d2 = m.PFShare.REG['robreport-basket-b1'];
    if (d1 && d1.cta === 'JOIN THE FIGHT' && d2 && d2.cta === 'JOIN THE FIGHT')
      ok('registerDynamicReg (per-card/basket REG)');
    else no('registerDynamicReg', 'dynamic entries missing or wrong CTA');

    /* handoff(): the three presets render kicker + link, idempotent */
    var kinds = { 'share-intel': 'SHARE THIS INTEL', 'take-cell': 'TAKE THIS TO YOUR CELL', 'report-back': 'REPORT BACK' };
    function allText(el) {
      var t = el.textContent || '';
      (el.children || []).forEach(function (c) { t += ' ' + allText(c); });
      return t;
    }
    var hOk = true;
    Object.keys(kinds).forEach(function (kind) {
      var host = m.shim.document.createElement('div');
      var r1 = PSE.handoff(host, kind, {});
      var blk = host.querySelector('[data-pf-handoff="' + kind + '"]');
      var txt = blk ? allText(blk) : '';
      var link = blk ? blk.querySelector('a') : null;
      var r2 = PSE.handoff(host, kind, {});
      var n = host.querySelectorAll('[data-pf-handoff="' + kind + '"]').length;
      if (!(r1 && blk && txt.indexOf(kinds[kind]) !== -1 && link && link.href && r2 && n === 1)) {
        hOk = false;
        no('handoff ' + kind, 'kicker/link/idempotency broken');
      }
    });
    if (hOk) ok('handoff() presets (3) + idempotency');
    if (PSE.handoff(m.shim.document.createElement('div'), 'nope', {}) === false)
      ok('handoff() unknown kind -> false');
    else no('handoff() unknown kind', 'should return false');

    /* handoff preset links point at real routes */
    var hrefsOk = true;
    [['share-intel', '/create'], ['take-cell', '/cells'], ['report-back', '/data-bounties']].forEach(function (p) {
      var host = m.shim.document.createElement('div');
      PSE.handoff(host, p[0], {});
      var a = host.querySelector('a');
      if (!a || a.href !== p[1]) { hrefsOk = false; no('handoff link ' + p[0], 'want ' + p[1]); }
    });
    if (hrefsOk) ok('handoff preset routes (/create, /cells, /data-bounties)');

    /* scan() nets mode: networks row only, no share/save buttons */
    var nh = m.shim.document.createElement('div');
    nh.setAttribute('data-pf-share', 'stackem');
    nh.setAttribute('data-pf-share-mode', 'nets');
    m.shim.body.appendChild(nh);
    PSE.scan();
    var hasNets = !!nh.querySelector('[data-pfshare-networks="stackem"]');
    var hasBar = !!nh.querySelector('[data-pfshare-bar]');
    if (hasNets && !hasBar) ok('scan() nets mode (networks row only)');
    else no('scan() nets mode', 'nets=' + hasNets + ' bar=' + hasBar);
    /* re-scan is idempotent */
    PSE.scan();
    if (nh.querySelectorAll('[data-pfshare-networks="stackem"]').length === 1)
      ok('scan() nets idempotent');
    else no('scan() nets idempotency', 'duplicate networks rows');

    /* scan() full bar mode still works */
    var bh = m.shim.document.createElement('div');
    bh.setAttribute('data-pf-share', 'war-report');
    m.shim.body.appendChild(bh);
    PSE.scan();
    if (bh.querySelector('[data-pfshare-bar="war-report"]')) ok('scan() full bar mode (war-report)');
    else no('scan() full bar', 'bar missing');

    /* scan() declarative handoff wiring */
    var dh = m.shim.document.createElement('div');
    dh.setAttribute('data-pf-handoff', 'report-back');
    m.shim.body.appendChild(dh);
    PSE.scan();
    if (dh.querySelector('[data-pf-handoff="report-back"]')) ok('scan() [data-pf-handoff] wiring');
    else no('scan() handoff wiring', 'block not rendered');
  }
} catch (e) { no('runtime', 'exception: ' + (e && e.message)); }

console.log('== 4. sibling verifiers ==');
try {
  cp.execSync('node scripts/verify-robreport.js', { cwd: ROOT, stdio: 'pipe' });
  ok('verify-robreport.js green');
} catch (e) { no('verify-robreport.js', 'failed under integration edits'); }
try {
  cp.execSync('node scripts/verify-data-bounties-fe.js', { cwd: ROOT, stdio: 'pipe' });
  ok('verify-data-bounties-fe.js green');
} catch (e) { no('verify-data-bounties-fe.js', 'failed under integration edits'); }
try {
  cp.execSync('node scripts/verify-share-everywhere-fe.js', { cwd: ROOT, stdio: 'pipe' });
  ok('verify-share-everywhere-fe.js green (no regressions)');
} catch (e) { no('verify-share-everywhere-fe.js', 'regressed'); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('BRAND INTEGRATION VERIFY OK.');
