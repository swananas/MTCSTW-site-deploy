#!/usr/bin/env node
/* scripts/verify-share-everywhere-fe.js — Share Everywhere verification.
   Run from the worktree root: node scripts/verify-share-everywhere-fe.js
   1. node --check on new/changed files
   2. Static checks (kill switch, REG completeness, CTA standard, banned
      terms, bundle marker, surface hooks present)
   3. Mocked-browser runtime tests (vm + minimal DOM shim): REG registration,
      bar() idempotency, network intent URL shapes, painter fallback when the
      SVG is absent, resolvePoster generic fallback.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

var FILES = [
  'v1.4.3/core/share-everywhere.js',
  'v1.4.3/games/cell-territory-map.js',
  'v1.4.3/games/war-map.js',
  'v1.4.3/games/cell-war-front.js',
  'v1.4.3/games/cell-hq.js',
  'v1.4.3/games/cell-identity.js',
  'v1.4.3/games/predict.js',
  'v1.4.3/games/campaign.js',
  'v1.4.3/games/bank-browse.js',
  'v1.4.3/games/service-medals.js',
  /* share-out gaps (fe/share-out-gaps) */
  'v1.4.3/games/predgame.js',
  'v1.4.3/games/cell-war.js',
  'v1.4.3/games/peoplesbank.js',
  'v1.4.3/games/ventures.js',
  'v1.4.3/games/governance.js',
  'v1.4.3/games/events.js',
  'v1.4.3/games/war-bonds.js',
  'v1.4.3/games/blackout.js',
  'v1.4.3/games/hall-of-proof.js',
  'v1.4.3/games/master-calendar.js',
  'build/bundle-core.js'
];

console.log('== 1. node --check ==');
FILES.forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var SE = 'v1.4.3/core/share-everywhere.js';
if (has(SE, "PF.skip('share-everywhere')")) ok('kill switch');
else no('kill switch', 'missing');

/* REG completeness: every new surface has title/tag/lines/cta */
var REG_KEYS = ['territory-map', 'war-map', 'cell-war-front', 'cell-hq', 'cell-identity',
  'predictions', 'pledge-wall', 'checkin', 'content-bank', 'achievements', 'enlistment-papers',
  /* share-out gaps (fe/share-out-gaps) */
  'callit', 'cellwar-standings', 'war-bonds', 'bank-deposit', 'event-rsvp', 'gov-result',
  'ventures', 'arcade-blackout', 'arcade-ambush', 'hall-of-proof', 'master-calendar'];
var seSrc = read(SE);
var regOk = true;
REG_KEYS.forEach(function (k) {
  if (seSrc.indexOf("'" + k + "'") === -1) { regOk = false; no('REG ' + k, 'missing template'); }
});
if (regOk) ok('REG templates (' + REG_KEYS.length + ')');
/* each template has title, tag, lines, cta */
['title:', 'tag:', 'lines:', 'cta:'].forEach(function (field) {
  var count = (seSrc.match(new RegExp(field, 'g')) || []).length;
  if (count >= REG_KEYS.length) ok('REG field ' + field + ' x' + count);
  else no('REG field ' + field, 'only ' + count + ' of ' + REG_KEYS.length);
});

/* CTA standard: paintFooter carries MTCSTW.COM + JOIN THE FIGHT. */
if (has(SE, "fillText('MTCSTW.COM'") && has(SE, "fillText('JOIN THE FIGHT.'")) ok('CTA standard in custom painters');
else no('CTA standard', 'paintFooter missing MTCSTW.COM / JOIN THE FIGHT.');

/* Banned terms: no "donate", no real name in the new module (comment-stripped). */
var stripped = stripComments(seSrc).toLowerCase();
if (stripped.indexOf('donate') === -1) ok('no "donate"');
else no('banned term', '"donate" found');
if (stripped.indexOf('shanetheswan') === -1) ok('no @shanetheswan');
else no('identity', '@shanetheswan found');

/* Bundle marker: module in the core build list after share-image.js */
var buildSrc = read('build/bundle-core.js');
var siIdx = buildSrc.indexOf("'core/share-image.js'");
var seIdx = buildSrc.indexOf("'core/share-everywhere.js'");
if (seIdx > siIdx && siIdx !== -1) ok('build list (after share-image.js)');
else no('build list', 'share-everywhere.js not after share-image.js');

/* Surface hooks present */
var HOOKS = [
  ['v1.4.3/games/cell-territory-map.js', "bar(host,'territory-map'"],
  ['v1.4.3/games/war-map.js', "bar(host,'war-map'"],
  ['v1.4.3/games/cell-war-front.js', "bar(host,'cell-war-front'"],
  ['v1.4.3/games/cell-hq.js', "bar(p,'cell-hq'"],
  ['v1.4.3/games/cell-identity.js', "bar(el,'cell-identity'"],
  ['v1.4.3/games/predict.js', "bar(root,'predictions'"],
  ['v1.4.3/games/campaign.js', "bar(el,'pledge-wall'"],
  ['v1.4.3/games/bank-browse.js', "bar(mount,'content-bank'"],
  ['v1.4.3/games/service-medals.js', "bar(el,'achievements'"],
  /* share-out gaps (fe/share-out-gaps) */
  ['v1.4.3/games/predgame.js', 'pq-callshare'],
  ['v1.4.3/games/predgame.js', "terminal({"],
  ['v1.4.3/games/cell-war.js', "bar(host,'cellwar-standings'"],
  ['v1.4.3/games/cell-identity.js', 'SHARE BANNER'],
  ['v1.4.3/games/peoplesbank.js', 'pf:terminal'],
  ['v1.4.3/games/peoplesbank.js', 'data-pf-terminal="bank-deposit"'],
  ['v1.4.3/games/ventures.js', 'https://www.mtcstw.com/ventures'],
  ['v1.4.3/games/governance.js', 'gv-share'],
  ['v1.4.3/games/events.js', 'gameId:"event-rsvp"'],
  ['v1.4.3/games/war-bonds.js', 'data-pf-share="war-bonds"'],
  ['v1.4.3/games/war-bonds.js', 'pf_backed=1'],
  ['v1.4.3/games/blackout.js', "bar(el,'arcade-blackout'"],
  ['v1.4.3/games/hall-of-proof.js', "bar(main,'hall-of-proof'"],
  ['v1.4.3/games/master-calendar.js', "bar(root,'master-calendar'"]
];
var hooksOk = true;
HOOKS.forEach(function (h) {
  if (!has(h[0], h[1])) { hooksOk = false; no('hook ' + h[0], 'missing ' + h[1]); }
});
if (hooksOk) ok('surface hooks (' + HOOKS.length + ')');

/* Terminal (game-over) hook infrastructure */
if (has(SE, "PF.skip('share-terminal')")) ok('terminal kill switch');
else no('terminal kill switch', 'missing');
if (has(SE, "addEventListener('pf:terminal'") && has(SE, 'PFShareEverywhere.terminal')) ok('pf:terminal listener + public API');
else no('pf:terminal wiring', 'listener or public terminal() missing');
if (has(SE, "'cellwar-standings': paintCellWarStandings") && has(SE, "'war-bonds': paintWarBonds")) ok('dedicated painters registered');
else no('dedicated painters', 'cellwar-standings/war-bonds not in PAINTERS');
if (has(SE, 'pf-ambush-claimed')) ok('ambush claim bridge');
else no('ambush bridge', 'pf-ambush-claimed bridge missing');
/* terminal panel must not interpolate user data into HTML — textContent only */
['k.textContent', 't.textContent', 'r.textContent', 's.textContent'].forEach(function (tc) {
  if (has(SE, tc)) ok('terminal panel ' + tc);
  else no('terminal panel escaping', tc + ' missing');
});
/* per-module kill switches on the touched silos */
[['v1.4.3/games/predgame.js', "PF.skip('predgame')"],
 ['v1.4.3/games/cell-war.js', "PF.skip"],
 ['v1.4.3/games/peoplesbank.js', "PF.skip"],
 ['v1.4.3/games/governance.js', "PF.skip"],
 ['v1.4.3/games/events.js', "PF.skip"],
 ['v1.4.3/games/war-bonds.js', 'pf_off=war-bonds'],
 ['v1.4.3/games/blackout.js', "PF.skip"],
 ['v1.4.3/games/ventures.js', "PF.skip"]
].forEach(function (k) {
  if (has(k[0], k[1])) ok('kill switch ' + k[0].split('/').pop());
  else no('kill switch ' + k[0], 'missing');
});

/* Inner-script gate on the touched widget silos */
try {
  cp.execSync('node scripts/check-inner-scripts.js ' +
    'v1.4.3/games/cell-territory-map.js v1.4.3/games/war-map.js ' +
    'v1.4.3/games/cell-war-front.js v1.4.3/games/campaign.js ' +
    'v1.4.3/games/war-bonds.js',
    { cwd: ROOT, stdio: 'pipe' });
  ok('inner-script gate');
} catch (e) { no('inner-script gate', 'failed'); }

console.log('== 3. runtime tests (vm + DOM shim) ==');
/* Minimal DOM shim sufficient for module boot + bar() + networks(). */
function makeShim() {
  var els = [];
  function matches(el, sel) {
    /* minimal: [attr] and [attr="val"] */
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
      children: [], attributes: {}, style: {}, dataset: {},
      textContent: '', innerHTML: '',
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      getAttribute: function (k) { return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
      addEventListener: function () {},
      querySelector: function (sel) { var r = walk(this, sel, []); return r[0] || null; },
      querySelectorAll: function (sel) { return walk(this, sel, []); }
    };
    els.push(el);
    return el;
  }
  var head = mkEl('head'), body = mkEl('body');
  var doc = {
    createElement: mkEl,
    head: head, body: body,
    readyState: 'complete',
    addEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function (sel) {
      var r = walk(head, sel, []).concat(walk(body, sel, []));
      return r[0] || null;
    },
    querySelectorAll: function (sel) { return walk(head, sel, []).concat(walk(body, sel, [])); }
  };
  return { document: doc, els: els };
}

function loadModule() {
  var shim = makeShim();
  var PFShare = {
    REG: {},
    setPoster: function (id, fn) { (this._ps = this._ps || {})[id] = fn; },
    poster: function (gid) {
      /* generic fallback painter: return a fake canvas */
      if (!PFShare.REG[gid]) return null;
      return { width: 1080, height: 1350, _pfGeneric: true,
        getContext: function () { return null; } };
    },
    shareImage: function (cv, fn2, title, gid, opts) { this._lastShare = { cv: cv, gid: gid, opts: opts }; },
    saveImage: function (cv, fn2, gid, opts) { this._lastSave = { cv: cv, gid: gid, opts: opts }; },
    stampCallsign: function (cv) { return cv; }
  };
  var sandbox = {
    window: {}, document: shim.document, navigator: { userAgent: 'node', clipboard: null },
    localStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; },
      setItem: function (k, v) { this._s[k] = String(v); } },
    setTimeout: function () {}, setInterval: function () {}, clearInterval: function () {},
    MutationObserver: function () { this.observe = function () {}; },
    URL: { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} },
    Blob: function () {}, Image: function () {}, XMLSerializer: function () { this.serializeToString = function () { return '<svg/>'; }; },
    console: console
  };
  sandbox.window.PF = { skip: function () { return false; }, toast: function () {}, shareUrl: function (u) { return u; } };
  sandbox.window.PFShare = PFShare;
  /* browsers alias window.* to bare globals — the module uses both forms */
  sandbox.PFShare = PFShare;
  sandbox.PF = sandbox.window.PF;
  sandbox.window.pfShareEverywhereDone = false;
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(ROOT, SE)), sandbox, { filename: 'share-everywhere.js' });
  return { sandbox: sandbox, PFShare: PFShare, shim: shim };
}

try {
  var m = loadModule();
  var PSE = m.sandbox.window.PFShareEverywhere;
  if (!PSE) { no('runtime boot', 'PFShareEverywhere undefined'); }
  else {
    ok('runtime boot');
    /* REG merged into PFShare.REG */
    var missing = REG_KEYS.filter(function (k) { return !m.PFShare._ps || true; });
    var regMissing = REG_KEYS.filter(function (k) { return !m.PFShare.REG[k]; });
    if (!regMissing.length) ok('REG merged into PFShare.REG');
    else no('REG merge', 'missing: ' + regMissing.join(','));
    /* painters registered */
    if (m.PFShare._ps && m.PFShare._ps['territory-map'] && m.PFShare._ps['war-map']) ok('custom painters registered');
    else no('painters', 'territory-map/war-map not registered');

    /* bar() idempotency */
    var host = m.shim.document.createElement('div');
    var r1 = PSE.bar(host, 'war-map', {});
    var bars1 = host.children.filter(function (c) {
      return c.getAttribute && c.getAttribute('data-pfshare-bar') === 'war-map';
    }).length;
    var r2 = PSE.bar(host, 'war-map', {});
    var bars2 = host.children.filter(function (c) {
      return c.getAttribute && c.getAttribute('data-pfshare-bar') === 'war-map';
    }).length;
    if (r1 && r2 && bars1 === 1 && bars2 === 1) ok('bar() idempotent');
    else no('bar() idempotency', 'bars: ' + bars1 + ' -> ' + bars2);

    /* network intent URLs (caption suffix appended by captionFor) */
    var net = PSE.networks('T', 'hello world', 'https://www.mtcstw.com/x');
    var hrefs = [];
    (function walk(el) {
      if (el.tagName === 'A' && el.href) hrefs.push(el.href);
      (el.children || []).forEach(walk);
    })(net);
    var txt = encodeURIComponent('hello world — via The Propaganda Factory https://www.mtcstw.com/x');
    var want = ['https://twitter.com/intent/tweet?text=' + txt,
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://www.mtcstw.com/x'),
      'https://bsky.app/intent/compose?text=' + txt,
      'https://www.threads.net/intent/post?text=' + txt];
    var netOk = want.every(function (w) { return hrefs.indexOf(w) !== -1; });
    if (netOk && hrefs.length === 4) ok('network intent URLs (4)');
    else no('network intents', JSON.stringify(hrefs));

    /* resolvePoster: territory-map with no SVG -> generic fallback */
    var done1 = null;
    PSE.resolvePoster('territory-map', function (cv) { done1 = cv; });
    if (done1 && done1._pfGeneric) ok('resolvePoster fallback (no SVG)');
    else no('resolvePoster fallback', 'expected generic canvas');

    /* resolvePoster: unknown gameId with no REG -> null, never throws */
    var done2 = 'unset', threw = false;
    try { PSE.resolvePoster('nope-not-real', function (cv) { done2 = cv; }); }
    catch (e) { threw = true; }
    if (!threw && done2 === null) ok('resolvePoster unknown -> null');
    else no('resolvePoster unknown', 'threw=' + threw);

    /* share pipeline: bar share button -> wrapped shareImage resolves painter */
    var host2 = m.shim.document.createElement('div');
    PSE.bar(host2, 'war-map', {});
    var shareBtn = null;
    (function walk2(el) {
      if (el.getAttribute && el.getAttribute('data-pfshare') === 'war-map-share') shareBtn = el;
      (el.children || []).forEach(walk2);
    })(host2);
    if (shareBtn) ok('share button wired with data-pfshare');
    else no('share button', 'not found');

    /* ---- share-out gaps: terminal() ---- */
    if (typeof PSE.terminal !== 'function') { no('terminal()', 'not exposed'); }
    else {
      ok('terminal() exposed');
      /* terminal renders a result panel + the site-wide bar into the host */
      var thost = m.shim.document.createElement('div');
      thost.nodeType = 1;
      var tr = PSE.terminal({ gameId: 'bank-deposit', title: 'VAULT SECURED',
        result: 'DEPOSITED TO THE VAULT', score: '+500 XP',
        lines: ['Deposits build the war chest.'], link: '/bank', host: thost });
      var panel = null;
      (function walk3(el) {
        if (el.getAttribute && el.getAttribute('data-pf-terminal-panel') === 'bank-deposit') panel = el;
        (el.children || []).forEach(walk3);
      })(thost);
      var tbar = panel && panel.querySelector('[data-pfshare-bar="bank-deposit"]');
      if (tr && panel && tbar) ok('terminal() panel + bar');
      else no('terminal() panel', 'panel=' + !!panel + ' bar=' + !!tbar);
      /* terminal is idempotent: a second call replaces, never duplicates */
      PSE.terminal({ gameId: 'bank-deposit', title: 'T2', host: thost });
      var panels = [];
      (function walk4(el) {
        if (el.getAttribute && el.getAttribute('data-pf-terminal-panel') === 'bank-deposit') panels.push(el);
        (el.children || []).forEach(walk4);
      })(thost);
      if (panels.length === 1) ok('terminal() idempotent');
      else no('terminal() idempotency', panels.length + ' panels');
      /* detail-driven painter registered; resolves through resolvePoster */
      var tdone = null;
      PSE.resolvePoster('bank-deposit', function (cv) { tdone = cv; });
      if (tdone && tdone._pfGeneric) ok('terminal painter via resolvePoster');
      else no('terminal painter', 'no canvas resolved');
      /* kill switch: ?pf_off=share-terminal stops the panel */
      var skip0 = m.sandbox.PF.skip;
      m.sandbox.PF.skip = function (mod) { return mod === 'share-terminal'; };
      var thost2 = m.shim.document.createElement('div');
      thost2.nodeType = 1;
      var tr2 = PSE.terminal({ gameId: 'event-rsvp', title: "I'M GOING", host: thost2 });
      var found2 = false;
      (function walk5(el) {
        if (el.getAttribute && el.getAttribute('data-pf-terminal-panel')) found2 = true;
        (el.children || []).forEach(walk5);
      })(thost2);
      m.sandbox.PF.skip = skip0;
      if (tr2 === false && !found2) ok('terminal kill switch');
      else no('terminal kill switch', 'panel rendered while killed');
      /* cellwar-standings painter: no live rows in the shim -> generic fallback */
      var cdone = 'unset';
      PSE.resolvePoster('cellwar-standings', function (cv) { cdone = cv; });
      if (cdone && cdone._pfGeneric) ok('cellwar-standings painter fallback');
      else no('cellwar-standings painter', 'no fallback canvas');
    }
  }
} catch (e) { no('runtime', 'exception: ' + (e && e.message)); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
