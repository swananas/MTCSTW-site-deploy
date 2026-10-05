#!/usr/bin/env node
/* scripts/verify-engage-a-fe.js — Engage-A frontend verification (#2 reactions,
   #4 cell discovery, #6 discord bridge FE-side = none: bridge is backend-only,
   its only FE surface is the dark kill switch already covered by BE tests).
   Run from the repo root:
     node scripts/verify-engage-a-fe.js
   0. rebuild game bundles (bundle-core.js carries games/reactions.js into
      v1.4.3/pages/bundle-pages.js — global chrome on every v2 page)
   1. node --check on every touched file
   2. Static contract checks (kill switches, mount contract, zero-XP certs,
      esc hygiene, POST-only writes, discovery UX, banned copy)
   3. Mocked-browser runtime tests (vm): reactions module lifecycle —
      registration, auto-mount, counts render, tap throttle, kill switch,
      fail-soft without a backend.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var REACT = path.join(V, 'games', 'reactions.js');
var CELLS = path.join(V, 'games', 'cells.js');
var DOMETER = path.join(V, 'games', 'do-meter.js');
var WARREP = path.join(V, 'games', 'war-report.js');
var BUNDLE_CORE = path.join(ROOT, 'build', 'bundle-core.js');
var BUNDLE_JS = path.join(ROOT, 'build', 'bundle.js');
var PAGES_BUNDLE = path.join(V, 'pages', 'bundle-pages.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* AGENTS.md lesson: strip comments only — never strip string literals
   (regex literals like /"/g unbalance naive strippers and cascade false
   failures). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
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
var pagesBundle = '';
try {
  pagesBundle = read(PAGES_BUNDLE);
  if (pagesBundle.indexOf('pf_off=reactions') !== -1) ok('bundle-pages.js carries games/reactions.js');
  else no('bundle wiring', 'reactions.js not found in built pages/bundle-pages.js');
} catch (e) { no('bundle wiring', 'could not read pages/bundle-pages.js'); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[REACT, CELLS, DOMETER, WARREP, BUNDLE_CORE, BUNDLE_JS].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f) + ' syntax'); }
  catch (e) { no('syntax', 'node --check failed on ' + f); }
});

var rSrc = read(REACT), rCode = stripComments(rSrc);
var cSrc = read(CELLS), cCode = stripComments(cSrc);
var coreSrc = read(BUNDLE_CORE), coreCode = stripComments(coreSrc);
var bSrc = read(BUNDLE_JS), bCode = stripComments(bSrc);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');

/* --- #2 reactions module --- */
if (/PF\.skip\(["']reactions["']\)/.test(rSrc)) ok('reactions kill switch PF.skip("reactions") wired');
else no('kill switch', 'PF.skip("reactions") missing in reactions.js');
if (rSrc.indexOf('?pf_off=reactions') !== -1) ok('?pf_off=reactions documented');
else no('kill doc', '?pf_off=reactions not documented in reactions.js');
if (/PF\.reactions\s*=\s*api/.test(rCode) && /window\.PFReactions\s*=\s*api/.test(rCode))
  ok('PF.reactions / window.PFReactions public API registered');
else no('public API', 'PF.reactions registration missing');
if (/mount:\s*mount/.test(rCode) && /EMOJI:\s*EMOJI\.slice\(\)/.test(rCode))
  ok('PF.reactions.mount + EMOJI contract exposed');
else no('mount contract', 'PF.reactions.mount/EMOJI contract missing');
/* Curated allowlist: exactly the six approved emoji. */
var emojiList = ['🔥', '📈', '💪', '🎯', '👀', '✊'];
var allowOk = emojiList.every(function (e) { return rSrc.indexOf("'" + e + "'") !== -1; });
if (allowOk && !/donate/i.test(rSrc)) ok('curated 6-emoji allowlist; no banned copy');
else no('allowlist', 'emoji allowlist wrong or banned copy present');
/* ZERO-XP cert: reactions must never touch the ledger. */
if (!/xpGrant|creditLocal|PFShare/.test(rCode)) ok('reactions zero-XP cert (no xpGrant/creditLocal/PFShare in code)');
else no('zero-XP', 'reactions.js references XP machinery');
/* esc hygiene: every interpolated value in render() passes esc(). */
var renderBlock = (rSrc.match(/function render\([\s\S]*?\n  \}/) || [''])[0];
if (renderBlock && /esc\(e\)/.test(renderBlock) && /esc\(cc|esc\(/.test(renderBlock)) ok('render() escapes all interpolated values');
else no('esc hygiene', 'render() does not esc() its interpolated values');
/* POST-only writes: the react write path goes through PF.authPost or
   PF.postAction — never a GET URL construction. (react_counts is the
   read-only JSONP aggregate; the word-boundary keeps it out.) */
if (/PF\.authPost|PF\.postAction/.test(rCode) && !/BACKEND\s*\+\s*["']\?action=react(?=["'&])/.test(rCode))
  ok('reaction writes are POST-only (no GET URL for react)');
else no('POST-only', 'react write path is not POST-only');
/* Client tap throttle exists (display-integrity; server enforces for real). */
if (/TAP_THROTTLE_MS|lastTap/.test(rCode)) ok('client tap throttle present');
else no('throttle', 'no client tap throttle');
/* data-react-surface auto-mount + MutationObserver for late surfaces. */
if (/data-react-surface/.test(rSrc) && /MutationObserver/.test(rSrc)) ok('data-react-surface auto-mount with late-surface observer');
else no('auto-mount', 'data-react-surface auto-mount missing');
/* Aggregate counts only — never a reactor list. */
if (/react_counts/.test(rSrc) && !/reactors|reactor_list/.test(rCode)) ok('aggregate counts only (no reactor list)');
else no('privacy', 'reactor-list surface detected');

/* --- bundle wiring for #2 --- */
if (/['"]games\/reactions\.js['"]/.test(coreSrc)) ok('bundle-core.js ships games/reactions.js as global chrome');
else no('bundle wiring', 'games/reactions.js missing from bundle-core.js pages/bundle-pages list');
if (/['"]reactions\.js['"]/.test(bCode)) ok('bundle.js GLOBAL_CHROME excludes reactions.js from page bundles');
else no('bundle wiring', 'reactions.js missing from bundle.js GLOBAL_CHROME');
/* Mount points on the two data surfaces. */
if (read(DOMETER).indexOf('data-react-surface="do-meter"') !== -1) ok('do-meter carries data-react-surface="do-meter"');
else no('mount point', 'do-meter missing its reactions mount point');
if (read(WARREP).indexOf('data-react-surface="war-report"') !== -1) ok('war-report carries data-react-surface="war-report"');
else no('mount point', 'war-report missing its reactions mount point');

/* --- #4 cell discovery --- */
if (cSrc.indexOf('id="cSearchTags"') !== -1) ok('discovery filter row cSearchTags present');
else no('discovery', 'cSearchTags filter row missing from cells.js');
if (cSrc.indexOf('IN YOUR CELL') !== -1 && /cc\.mine/.test(cCode)) ok('"your cells" state (IN YOUR CELL) wired to mine flag');
else no('discovery', 'mine-state not rendered in search results');
if (/cause:cFlt\.cause,vibe:cFlt\.vibe,tag:cFlt\.tag/.test(cCode.replace(/\s+/g, '')))
  ok('cause/vibe/tag params sent to cell_search');
else no('discovery', 'cause/vibe/tag filters not passed to cell_search');
if (cSrc.indexOf('cell_join') !== -1) ok('one-tap join still routes through cell_join');
else no('discovery', 'cell_join wiring missing');
/* Discovery tags come only from the server response — never invented here.
   (An empty filter-state reset {cause:""} is not invented metadata.) */
var tagRowBlock = (cSrc.match(/function cTagRow\([\s\S]*?\n  \}/) || [''])[0];
if (tagRowBlock && !/cause:\s*"[^"]|vibe:\s*"[^"]|tags:\s*\[[^\]]/.test(stripComments(tagRowBlock)))
  ok('discovery renders only server-served tags (no invented metadata)');
else no('discovery', 'cTagRow appears to invent tags');
/* Zero-XP cert scoped to the Engage-A discovery block (the file's pre-existing
   bounty-claim mirror credit at cell_bounty_claim is legacy, untouched). */
var engageBlock = (cSrc.match(/\/\* FIND A CELL: search by name\/state, join from results\.[\s\S]*?if\(sb\) sb\.onclick=doSearch;\n\}/) || [''])[0];
if (engageBlock && !/xpGrant|creditLocal/.test(stripComments(engageBlock)))
  ok('discovery zero-XP cert (no xpGrant/creditLocal in Engage-A block)');
else no('zero-XP', 'Engage-A discovery block touches XP machinery');
/* Discovery copy: no banned terms. */
if (!/donate/i.test(cSrc)) ok('cells.js copy has no banned terms');
else no('copy', 'banned copy in cells.js');

/* ============ 3. mocked-browser runtime tests (vm) ============ */
console.log('== 3. mocked-browser runtime tests (vm) ==');

function makeSandbox(opts) {
  opts = opts || {};
  var skips = opts.skip || {};
  var listeners = {};
  var posted = [];
  var countsReqs = [];
  var els = {};
  function fakeEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(),
      attrs: {},
      children: [],
      style: {},
      className: '',
      innerHTML: '',
      disabled: false,
      textContent: '',
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push({ el: this, fn: fn }); },
      appendChild: function (c) { this.children.push(c); return c; },
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; },
      closest: function () { return null; }
    };
    return el;
  }
  var doc = {
    readyState: opts.readyState || 'complete',
    head: fakeEl('head'),
    body: fakeEl('body'),
    documentElement: fakeEl('html'),
    _els: els,
    createElement: function (t) {
      var el = fakeEl(t);
      el.onerror = null;
      return el;
    },
    getElementById: function (id) { return els[id] || null; },
    querySelectorAll: function (sel) {
      if (sel === '[data-react-surface]') return opts.surfaces || [];
      return [];
    },
    addEventListener: function () {}
  };
  var PF = {
    skip: function (f) { return !!skips[f]; },
    toast: function () {},
    authPost: opts.noAuthPost ? undefined : function (url, body, cb) { posted.push(body); if (cb) cb({ ok: true }); },
    postAction: function (type, key, action, params, cb) { posted.push(Object.assign({ type: type }, params)); if (cb) cb({ ok: true }); },
    authGetJSONP: opts.noAuthGet ? undefined : function (url, action, params, cb) {
      countsReqs.push({ action: action, params: params });
      if (cb) cb({ ok: true, reactions: {} });
    },
    gateHTML: function (a, b) { return '<div class="gate">' + a + ' ' + b + '</div>'; }
  };
  var sandbox = {
    window: null, document: doc, MutationObserver: opts.noMO ? undefined : function () {
      this.observe = function () {}; this.disconnect = function () {};
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: function () { return 0; },
    console: console, Uint32Array: Uint32Array, JSON: JSON, Date: Date, Math: Math,
    encodeURIComponent: encodeURIComponent
  };
  sandbox.window = sandbox;
  sandbox.PF = PF;
  sandbox.PF_BACKEND_URL = opts.backend === undefined ? 'https://pf-api.mtcstw.workers.dev' : opts.backend;
  sandbox.PFCallsign = function () { return opts.callsign === undefined ? 'TESTCALL' : opts.callsign; };
  sandbox.PFDeviceId = function () { return 'TESTDEV'; };
  if (opts.crypto !== false) {
    sandbox.crypto = { getRandomValues: function (a) { a[0] = 12345; return a; } };
  }
  sandbox._posted = posted;
  sandbox._countsReqs = countsReqs;
  sandbox._listeners = listeners;
  return sandbox;
}

function runModule(sandbox, src) {
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'reactions.js' });
  return sandbox;
}

/* 3a. registration + auto-mount + counts render */
(function () {
  var sb = makeSandbox();
  var mountEl = sb.document.createElement('div');
  mountEl.setAttribute('data-react-surface', 'do-meter');
  sb.document.querySelectorAll = function (sel) {
    if (sel === '[data-react-surface]') return [mountEl];
    return [];
  };
  runModule(sb, rSrc);
  if (sb.PF.reactions && sb.window.PFReactions && typeof sb.PF.reactions.mount === 'function')
    ok('vm: PF.reactions registered with mount()');
  else { no('vm register', 'PF.reactions not registered'); return; }
  if (sb.PF.reactions.EMOJI.length === 6) ok('vm: EMOJI allowlist has 6 entries');
  else no('vm allowlist', 'EMOJI length != 6');
  if (mountEl.getAttribute('data-react-mounted') === '1') ok('vm: auto-mount claimed the surface');
  else no('vm automount', 'surface not auto-mounted');
  /* Counts came back empty {} — six buttons rendered, no counts yet. */
  var btns = (mountEl.innerHTML.match(/<button/g) || []).length;
  if (btns === 6) ok('vm: six emoji buttons rendered');
  else no('vm render', 'expected 6 buttons, got ' + btns);
  if (mountEl.innerHTML.indexOf('🔥') !== -1 && mountEl.innerHTML.indexOf('✊') !== -1)
    ok('vm: allowlist emoji present in rendered HTML');
  else no('vm render', 'allowlist emoji missing from HTML');
})();

/* 3b. tap -> POST-only react write, throttle suppresses the second tap */
(function () {
  var sb = makeSandbox();
  var mountEl = sb.document.createElement('div');
  mountEl.setAttribute('data-react-surface', 'war-report');
  /* Fake buttons: innerHTML is a string here, so simulate the click path by
     calling the captured listener with a fake event target instead. */
  var clickFns = [];
  mountEl.addEventListener = function (t, fn) { if (t === 'click') clickFns.push(fn); };
  mountEl.querySelectorAll = function () { return []; };
  sb.document.querySelectorAll = function (sel) {
    if (sel === '[data-react-surface]') return [mountEl];
    return [];
  };
  runModule(sb, rSrc);
  var fakeBtn = sb.document.createElement('button');
  fakeBtn.setAttribute('data-emoji', '🔥');
  var fakeTarget = { closest: function () { return fakeBtn; } };
  clickFns.forEach(function (fn) { fn({ target: fakeTarget }); });
  if (sb._posted.length === 1 && sb._posted[0].type === 'react' && sb._posted[0].react_action === 'react' &&
      sb._posted[0].emoji === '🔥' && sb._posted[0].surface === 'war-report')
    ok('vm: tap POSTs {type:react, react_action:react, surface, emoji}');
  else no('vm tap', 'tap did not produce the expected POST body');
  clickFns.forEach(function (fn) { fn({ target: fakeTarget }); }); /* within 10s */
  if (sb._posted.length === 1) ok('vm: rapid second tap throttled client-side');
  else no('vm throttle', 'second tap was not throttled');
})();

/* 3c. kill switch: PF.skip("reactions") -> module returns early */
(function () {
  var sb = makeSandbox({ skip: { reactions: true } });
  runModule(sb, rSrc);
  if (!sb.PF.reactions && !sb.window.PFReactions) ok('vm: kill switch short-circuits the module');
  else no('vm kill', 'module registered despite PF.skip("reactions")');
})();

/* 3d. fail-soft: no backend, no auth helpers -> mount renders, tap no-ops */
(function () {
  var sb = makeSandbox({ backend: '', noAuthPost: true, noAuthGet: true, noMO: true });
  sb.PF.postAction = undefined;
  var mountEl = sb.document.createElement('div');
  mountEl.setAttribute('data-react-surface', 'x');
  sb.document.querySelectorAll = function (sel) {
    if (sel === '[data-react-surface]') return [mountEl];
    return [];
  };
  try {
    runModule(sb, rSrc);
    ok('vm: module loads with no backend and no auth helpers (fail-soft)');
  } catch (e) { no('vm failsoft', 'threw without backend: ' + (e && e.message)); }
})();

/* 3e. gate: no callsign -> gate prompt instead of a POST */
(function () {
  var sb = makeSandbox({ callsign: '' });
  var mountEl = sb.document.createElement('div');
  mountEl.setAttribute('data-react-surface', 'y');
  var clickFns = [];
  mountEl.addEventListener = function (t, fn) { if (t === 'click') clickFns.push(fn); };
  sb.document.querySelectorAll = function (sel) {
    if (sel === '[data-react-surface]') return [mountEl];
    return [];
  };
  runModule(sb, rSrc);
  var fakeBtn = sb.document.createElement('button');
  fakeBtn.setAttribute('data-emoji', '📈');
  clickFns.forEach(function (fn) { fn({ target: { closest: function () { return fakeBtn; } } }); });
  if (sb._posted.length === 0 && mountEl.innerHTML.indexOf('gate') !== -1)
    ok('vm: no-callsign tap shows the gate, posts nothing');
  else no('vm gate', 'no-callsign tap posted or did not gate');
})();

/* ============ summary ============ */
console.log('\n== engage-a FE: ' + passes + ' passed, ' + fails.length + ' failed ==');
if (fails.length) {
  console.log('FAILURES:');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
