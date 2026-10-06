#!/usr/bin/env node
/* scripts/verify-ux-take-to-cell.js — UX Combination Play 2 verification
   (fe/ux-take-to-cell, 2026-10-06): TAKE THIS TO YOUR CELL everywhere.
   Run from the worktree root: node scripts/verify-ux-take-to-cell.js
   1. node --check on every touched source file (+ inner scripts of the
      template-staged modules: war-report, briefing, civic-events)
   2. Static checks per card type: the take-cell action / action-bar host is
      present with title + figure + link payload; kill switches; the label
      order standard (SHARE THIS INTEL · TAKE THIS TO YOUR CELL · REPORT
      BACK); zero new XP; already-had-it surfaces untouched
   3. Mocked-browser runtime tests (vm + minimal DOM shim) against
      core/share-everywhere.js: actionBar build + order + shareOwn skip +
      idempotency; takeToCell fail-open (no callsign / ?pf_off=takecell);
      staged-drop routing; PFCellFeed.post direct-post seam; [data-pf-takecell]
      declarative wiring; payload-aware take-cell handoff; staged-drop
      receiver strip (no feed -> no post button, no error)
   4. Rebuilt-bundle markers: every touched bundle ships the new code
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
function count(p, s) { return read(p).split(s).length - 1; }

var TOUCHED = [
  'v1.4.3/core/share-everywhere.js',
  'v1.4.3/core/robreport.js',
  'v1.4.3/games/peoples-cpi.js',
  'v1.4.3/games/inflation-tracker.js',
  'v1.4.3/games/predgame.js',
  'v1.4.3/games/war-report.js',
  'v1.4.3/games/briefing.js',
  'v1.4.3/games/events.js',
  'v1.4.3/games/civic-events.js',
  'v1.4.3/games/data-bounties.js'
];

console.log('== 1. node --check (outer files) ==');
TOUCHED.forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 1b. node --check (staged inner scripts) ==');
/* war-report.js, briefing.js, civic-events.js stage their real script inside
   a <template> in an outer template literal: the raw slice still carries the
   outer escapes, so unescape exactly like the browser does (evaluate the
   template literal), then extract <script>..</scr`+`ipt> and check. */
['v1.4.3/games/war-report.js', 'v1.4.3/games/briefing.js', 'v1.4.3/games/civic-events.js'].forEach(function (f) {
  try {
    var src = read(f);
    var bt1 = src.indexOf('`<template');
    if (bt1 < 0) { no(f + ' inner', 'template literal not found'); return; }
    var end = bt1 + 1;
    while (true) {
      end = src.indexOf('`', end);
      if (end < 0) break;
      var bs = 0, k = end - 1;
      while (k > bt1 && src[k] === '\\') { bs++; k--; }
      if (bs % 2 === 0) break;
      end++;
    }
    if (end < 0) { no(f + ' inner', 'unterminated template literal'); return; }
    var staged;
    try { staged = vm.runInNewContext(src.slice(bt1, end + 1), {}); }
    catch (e) { no(f + ' inner', 'template eval failed: ' + e.message); return; }
    var a = staged.indexOf('<script>'), b = staged.indexOf('</scr');
    if (a < 0 || b < 0 || b <= a) { no(f + ' inner', 'staged script not found'); return; }
    var tmp = path.join(ROOT, '.verify-inner-' + path.basename(f));
    fs.writeFileSync(tmp, staged.slice(a + 8, b));
    try { cp.execSync('node --check ' + tmp, { stdio: 'pipe' }); ok(f + ' inner script'); }
    catch (e) { no(f + ' inner script', 'node --check failed on staged script'); }
    fs.unlinkSync(tmp);
  } catch (e) { no(f + ' inner', String(e && e.message || e)); }
});

console.log('== 2. static: take-cell mechanism (share-everywhere.js) ==');
var SE = 'v1.4.3/core/share-everywhere.js';
[
  ['takeToCell action', 'function takeToCell(payload)'],
  ['actionBar builder', 'function actionBar(host, opts)'],
  ['primaryCell resolver', 'function primaryCell(cb)'],
  ['PFCellFeed.post seam', 'window.PFCellFeed.post'],
  ['PFCellPrimary seam', 'window.PFCellPrimary'],
  ['finer kill switch', "PF.skip('takecell')"],
  ['staged-drop routing', "'/cells#pf-takecell'"],
  ['staged-drop receiver', 'function scanTakecellDrop()'],
  ['drop strip renderer', 'function renderDropStrip(p)'],
  ['declarative button wiring', '[data-pf-takecell]'],
  ['declarative bar hosts', '[data-pf-actionbar]'],
  ['fail-open visibility', 'function refreshTcVisibility('],
  ['per-card button CSS', '.pf-tc-btn'],
  ['payload-aware take-cell handoff', "kind === 'take-cell'"],
  ['exported: takeToCell', 'takeToCell: takeToCell'],
  ['exported: actionBar', 'actionBar: actionBar'],
  ['exported: primaryCell', 'primaryCell: primaryCell']
].forEach(function (c) {
  if (has(SE, c[1])) ok(c[0]); else no(c[0], 'missing in share-everywhere.js');
});
/* Label order standard, scoped to the actionBar builder:
   SHARE THIS INTEL · TAKE THIS TO YOUR CELL · REPORT BACK */
(function () {
  var src = read(SE);
  var a0 = src.indexOf('function actionBar(host, opts)');
  var a1 = src.indexOf('function refreshTcVisibility(');
  if (a0 < 0 || a1 < a0) { no('label order', 'actionBar not found'); return; }
  var body = src.slice(a0, a1);
  var i1 = body.indexOf('SHARE THIS INTEL'), i2 = body.indexOf('TAKE THIS TO YOUR CELL'), i3 = body.indexOf('REPORT BACK');
  if (i1 > 0 && i2 > i1 && i3 > i2) ok('label order standard (SHARE · TAKE-CELL · REPORT BACK)');
  else no('label order', 'labels missing or out of order in actionBar');
})();
/* Zero new XP: the take-cell code paths mint nothing */
(function () {
  var src = read(SE);
  var bad = ['xpGrant(', 'PF.xpGrant', 'XP_REWARD', '+XP', 'ledger.add', 'xpledge'];
  var hit = bad.filter(function (s) { return src.indexOf(s) !== -1; });
  if (!hit.length) ok('zero new XP in take-cell code');
  else no('zero new XP', 'found: ' + hit.join(', '));
})();

console.log('== 2b. static: per-card-type coverage ==');
function cardCheck(name, file, needles) {
  var missing = needles.filter(function (s) { return !has(file, s); });
  if (!missing.length) ok(name);
  else no(name, 'missing: ' + missing.join(' | '));
}
cardCheck('robreport item cards', 'v1.4.3/core/robreport.js', [
  'data-pf-tc-kind="robreport"', 'data-pf-tc-link="/money"',
  'THE ROBBERY REPORT \\u2014', '&#9733; TAKE THIS TO YOUR CELL'
]);
cardCheck('robreport basket cards', 'v1.4.3/core/robreport.js', ['SHARE BASKET']);
cardCheck('robreport section handoff payload', 'v1.4.3/core/robreport.js', [
  'data-pf-handoff="take-cell" data-pf-tc-kind="robreport"'
]);
cardCheck('peoples-cpi share cards', 'v1.4.3/games/peoples-cpi.js', [
  'data-pf-tc-kind="peoples-cpi"', 'data-pf-tc-link="/economy"'
]);
cardCheck('inflation-tracker price cards (both paths)', 'v1.4.3/games/inflation-tracker.js', [
  'data-pf-tc-kind="inflation"', 'data-pf-tc-link="/economy"'
]);
if (count('v1.4.3/games/inflation-tracker.js', 'data-pf-actionbar') >= 2) ok('inflation-tracker: both card paths');
else no('inflation-tracker paths', 'expected 2 action-bar hosts');
cardCheck('predgame resolved cards', 'v1.4.3/games/predgame.js', [
  'data-pf-tc-kind="predgame"', 'OUTCOME: '
]);
cardCheck('war-report pane', 'v1.4.3/games/war-report.js', [
  'data-pf-handoff="take-cell" data-pf-tc-kind="war-report"', 'data-pf-tc-link="/war-report"'
]);
cardCheck('briefing war plan', 'v1.4.3/games/briefing.js', [
  'data-pf-tc-kind="briefing"', 'data-pf-tc-link="/"'
]);
cardCheck('events.js cards', 'v1.4.3/games/events.js', [
  'data-pf-tc-kind="event"', 'data-pf-tc-link="/events"'
]);
cardCheck('civic-events cards', 'v1.4.3/games/civic-events.js', [
  'data-pf-tc-kind="civic-event"', 'data-pf-tc-link="/events"'
]);
cardCheck('data-bounty cards', 'v1.4.3/games/data-bounties.js', [
  'data-pf-tc-kind="data-bounty"', 'data-pf-tc-link="/data-bounties"'
]);
cardCheck('data-bounties section handoff payload', 'v1.4.3/games/data-bounties.js', [
  'data-pf-handoff="take-cell" data-pf-tc-kind="data-bounty"'
]);
if (count('v1.4.3/core/robreport.js', 'data-pf-tc-kind="robreport"') >= 3) ok('robreport: item + basket + section');
else no('robreport coverage', 'expected 3+ take-cell payloads');
/* Already-had-it surfaces: still present, untouched semantics */
if (has('v1.4.3/games/academy.js', 'TAKE THIS TO YOUR CELL')) ok('academy take-cell (already had it, untouched)');
else no('academy take-cell', 'missing');

console.log('== 2c. static: kill switches ==');
[
  ['share-everywhere', SE, "?pf_off=share-everywhere"],
  ['takecell (finer)', SE, "?pf_off=takecell"],
  ['robreport', 'v1.4.3/core/robreport.js', '?pf_off=robreport'],
  ['peoples-cpi', 'v1.4.3/games/peoples-cpi.js', '?pf_off=peoples-cpi'],
  ['inflation', 'v1.4.3/games/inflation-tracker.js', '?pf_off=inflation'],
  ['predgame', 'v1.4.3/games/predgame.js', '?pf_off=predgame'],
  ['war-report', 'v1.4.3/games/war-report.js', '?pf_off=war-report'],
  ['brief', 'v1.4.3/games/briefing.js', '?pf_off=brief'],
  ['events', 'v1.4.3/games/events.js', '?pf_off=events'],
  ['civicevents', 'v1.4.3/games/civic-events.js', '?pf_off=civicevents'],
  ['databounties', 'v1.4.3/games/data-bounties.js', '?pf_off=databounties']
].forEach(function (c) {
  if (has(c[1], c[2])) ok('kill ' + c[0]);
  else no('kill ' + c[0], 'missing ' + c[2]);
});

console.log('== 3. runtime (vm + DOM shim) ==');
/* Minimal DOM shim sufficient for share-everywhere's take-cell paths. */
function makeEnv(opts) {
  opts = opts || {};
  var toasts = [];
  var listeners = [];
  function mkEl(tag) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(),
      children: [], attrs: {}, style: {},
      _text: '', _html: '',
      parentNode: null, _listeners: {},
      setAttribute: function (k, v) { this.attrs[String(k)] = String(v); },
      getAttribute: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore: function (c, ref) {
        c.parentNode = this;
        var i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
        c.parentNode = null; return c;
      },
      remove: function () { if (this.parentNode) this.parentNode.removeChild(this); },
      addEventListener: function (t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
      click: function () {
        var l = this._listeners.click || [], ev = { preventDefault: function () {} };
        for (var i = 0; i < l.length; i++) l[i](ev);
      },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      contains: function () { return true; }
    };
    Object.defineProperty(el, 'textContent', {
      get: function () { return this._text; }, set: function (v) { this._text = String(v); }
    });
    return el;
  }
  var registry = [];
  function matches(el, sel) {
    var m = /^\[([a-z0-9-]+)(?:="([^"]*)")?\]$/.exec(sel);
    if (!m) return false;
    var v = el.getAttribute(m[1]);
    if (v === null) return false;
    return m[2] === undefined || v === m[2];
  }
  var head = mkEl('head'), body = mkEl('body');
  var doc = {
    readyState: 'complete',
    head: head, body: body,
    _registry: registry,
    createElement: function (t) { var e = mkEl(t); registry.push(e); return e; },
    querySelectorAll: function (sel) {
      return registry.filter(function (e) { return matches(e, sel); });
    },
    querySelector: function (sel) {
      var r = this.querySelectorAll(sel); return r.length ? r[0] : null;
    },
    getElementById: function () { return null; },
    addEventListener: function () {},
    _all: function () { return registry; }
  };
  var store = {};
  if (opts.callsign) store.pf_identity_v1 = JSON.stringify({ callsign: opts.callsign, device: 'd1' });
  var sstore = {};
  if (opts.drop) sstore.pf_takecell_drop = JSON.stringify({ p: opts.drop, ts: Date.now() });
  var loc = { hash: opts.hash || '', href: 'https://www.mtcstw.com/economy', pathname: '/economy' };
  var skipped = {};
  (opts.skip || []).forEach(function (s) { skipped[s] = 1; });
  var win = {
    document: doc,
    location: loc,
    navigator: {},
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(sstore, k) ? sstore[k] : null; },
      setItem: function (k, v) { sstore[k] = String(v); },
      removeItem: function (k) { delete sstore[k]; }
    },
    PF: {
      skip: function (s) { return !!skipped[s]; },
      toast: function (m) { toasts.push(String(m)); },
      shareUrl: function (u) { return u; },
      getAuthSecret: function () { return ''; }
    },
    MutationObserver: function () { this.observe = function () {}; },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    setTimeout: function (fn) { listeners.push(fn); return 0; },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    _toasts: toasts, _sstore: sstore, _loc: loc, _doc: doc
  };
  if (opts.cellFeed) win.PFCellFeed = opts.cellFeed;
  if (opts.primary) win.PFCellPrimary = opts.primary;
  win.window = win;
  return win;
}
function loadSE(win) {
  var src = read(SE);
  var ctx = vm.createContext(win);
  vm.runInContext(src, ctx, { filename: 'share-everywhere.js' });
  return win.PFShareEverywhere;
}
function t(name, fn) {
  try { fn(); ok(name); } catch (e) { no(name, String(e && e.message || e)); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assert failed'); }

/* 3a. actionBar: order, labels, shareOwn skip, idempotency */
t('actionBar builds 3 buttons in mandated order', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  SE_.actionBar(host, { title: 'T', figure: 'F', link: '/economy', kind: 'inflation' });
  assert(host.children.length === 3, 'expected 3 buttons, got ' + host.children.length);
  assert(host.children[0].textContent === '\u26a1 SHARE THIS INTEL', 'first: ' + host.children[0].textContent);
  assert(host.children[1].textContent === '\u2605 TAKE THIS TO YOUR CELL', 'second: ' + host.children[1].textContent);
  assert(host.children[2].textContent === '\u2713 REPORT BACK', 'third: ' + host.children[2].textContent);
  assert(host.children[2].tagName === 'A' && host.children[2].href === '/data-bounties', 'report-back link');
});
t('actionBar shareOwn skips SHARE THIS INTEL, order kept', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  SE_.actionBar(host, { title: 'T', link: '/money', kind: 'robreport', shareOwn: true });
  assert(host.children.length === 2, 'expected 2 buttons, got ' + host.children.length);
  assert(host.children[0].textContent === '\u2605 TAKE THIS TO YOUR CELL', 'first');
  assert(host.children[1].textContent === '\u2713 REPORT BACK', 'second');
});
t('actionBar idempotent on re-call', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  SE_.actionBar(host, { title: 'T', link: '/', kind: 'x' });
  SE_.actionBar(host, { title: 'T', link: '/', kind: 'x' });
  assert(host.children.length === 3, 'no duplicates, got ' + host.children.length);
});
t('actionBar take-cell button carries payload attrs', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  SE_.actionBar(host, { title: 'My Title', figure: 'Fig 1', link: '/events', kind: 'event' });
  var b = host.children[1];
  assert(b.getAttribute('data-pf-takecell') === '', 'declarative attr');
  assert(b.getAttribute('data-pf-tc-title') === 'My Title', 'title attr');
  assert(b.getAttribute('data-pf-tc-figure') === 'Fig 1', 'figure attr');
  assert(b.getAttribute('data-pf-tc-link') === '/events', 'link attr');
});

/* 3b. takeToCell fail-open paths */
t('takeToCell: no callsign -> toast, no stage, no navigation', function () {
  var win = makeEnv({});
  var SE_ = loadSE(win);
  var r = SE_.takeToCell({ title: 'T', figure: 'F', link: '/money', kind: 'robreport' });
  assert(r === false, 'returns false');
  assert(win._toasts.length === 1 && /callsign/i.test(win._toasts[0]), 'callsign toast');
  assert(!win._sstore.pf_takecell_drop, 'nothing staged');
  assert(win._loc.href === 'https://www.mtcstw.com/economy', 'no navigation');
});
t('takeToCell: ?pf_off=takecell -> inert', function () {
  var win = makeEnv({ callsign: 'TESTER', skip: ['takecell'] });
  var SE_ = loadSE(win);
  var r = SE_.takeToCell({ title: 'T', link: '/' });
  assert(r === false, 'returns false');
  assert(!win._sstore.pf_takecell_drop, 'nothing staged');
});
t('takeToCell: member, no feed mechanism -> staged drop + /cells route', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var r = SE_.takeToCell({ title: 'Robbery', figure: 'Take $5', link: '/money', kind: 'robreport' });
  assert(r === true, 'returns true');
  var staged = JSON.parse(win._sstore.pf_takecell_drop);
  assert(staged.p.title === 'Robbery', 'title staged');
  assert(staged.p.figure === 'Take $5', 'figure staged');
  assert(staged.p.link === '/money', 'link staged');
  assert(win._loc.href === '/cells#pf-takecell', 'routes to cell, got ' + win._loc.href);
});
t('takeToCell: PFCellFeed.post registered -> direct post with context', function () {
  var posted = null;
  var win = makeEnv({
    callsign: 'TESTER',
    primary: { id: 'cell-1', name: 'Cell One' },
    cellFeed: { post: function (p, cb) { posted = p; cb(true); } }
  });
  var SE_ = loadSE(win);
  var r = SE_.takeToCell({ title: 'CPI', figure: '$4.20 median', link: '/economy', kind: 'inflation' });
  assert(r === true, 'returns true');
  assert(posted && posted.cell_id === 'cell-1', 'cell id');
  assert(posted.title === 'CPI' && posted.figure === '$4.20 median', 'title+figure');
  assert(posted.link === '/economy' && posted.kind === 'inflation', 'link+kind');
  assert(/TESTER/.test(posted.context) && /\/economy/.test(posted.context), 'context: ' + posted.context);
  assert(!win._sstore.pf_takecell_drop, 'no staged fallback');
  assert(win._toasts.length === 1 && /Cell One/.test(win._toasts[0]), 'confirm toast');
});

/* 3c. declarative [data-pf-takecell] wiring via scan() */
t('scan wires [data-pf-takecell] click -> takeToCell payload', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var b = win.document.createElement('button');
  b.setAttribute('data-pf-takecell', '');
  b.setAttribute('data-pf-tc-title', 'Card Title');
  b.setAttribute('data-pf-tc-figure', 'Key figure');
  b.setAttribute('data-pf-tc-link', '/war-report');
  b.setAttribute('data-pf-tc-kind', 'war-report');
  SE_.scan();
  b.click();
  var staged = JSON.parse(win._sstore.pf_takecell_drop);
  assert(staged.p.title === 'Card Title', 'title from attrs');
  assert(staged.p.figure === 'Key figure', 'figure from attrs');
  assert(staged.p.link === '/war-report', 'link from attrs');
});
t('scan hides take-cell buttons when no callsign (fail-open)', function () {
  var win = makeEnv({});
  var SE_ = loadSE(win);
  var b = win.document.createElement('button');
  b.setAttribute('data-pf-takecell', '');
  SE_.scan();
  assert(b.style.display === 'none', 'hidden, got ' + b.style.display);
});
t('scan hides take-cell buttons under ?pf_off=takecell', function () {
  var win = makeEnv({ callsign: 'TESTER', skip: ['takecell'] });
  var SE_ = loadSE(win);
  var b = win.document.createElement('button');
  b.setAttribute('data-pf-takecell', '');
  SE_.scan();
  assert(b.style.display === 'none', 'hidden under kill');
});

/* 3d. payload-aware take-cell handoff preset */
t('handoff take-cell with payload renders posting button', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  var r = SE_.handoff(host, 'take-cell', { payload: { title: 'P', figure: 'F', link: '/money', kind: 'robreport' } });
  assert(r === true, 'handoff ok');
  var inner = host.children[0];
  var btn = null;
  for (var i = 0; i < inner.children.length; i++) {
    if (inner.children[i].tagName === 'BUTTON') btn = inner.children[i];
  }
  assert(btn && btn.textContent === 'TAKE THIS TO YOUR CELL', 'posting button');
  btn.click();
  assert(JSON.parse(win._sstore.pf_takecell_drop).p.title === 'P', 'payload posted on click');
});
t('handoff take-cell without payload keeps legacy /cells anchor', function () {
  var win = makeEnv({ callsign: 'TESTER' });
  var SE_ = loadSE(win);
  var host = win.document.createElement('div');
  SE_.handoff(host, 'take-cell', {});
  var inner = host.children[0];
  var a = null;
  for (var i = 0; i < inner.children.length; i++) {
    if (inner.children[i].tagName === 'A') a = inner.children[i];
  }
  assert(a && a.textContent === 'OPEN YOUR CELL' && a.href === '/cells', 'legacy anchor');
});

/* 3e. staged-drop receiver */
t('drop receiver: strip renders, no feed -> no POST button, no error', function () {
  var win = makeEnv({
    callsign: 'TESTER', hash: '#pf-takecell',
    drop: { title: 'Intel', figure: 'Fig', link: '/economy', kind: 'inflation' }
  });
  var SE_ = loadSE(win);
  SE_.scan();
  var strips = win._doc._all().filter(function (e) { return e.getAttribute('data-pf-takecell-drop') === '1'; });
  assert(strips.length === 1, 'strip rendered');
  var texts = [];
  (function walk(e) {
    if (e.textContent) texts.push(e.textContent);
    for (var i = 0; i < e.children.length; i++) walk(e.children[i]);
  })(strips[0]);
  var all = texts.join(' ');
  assert(/INTEL DROP/.test(all) && /Intel/.test(all), 'strip content: ' + all.slice(0, 80));
  assert(!/POST TO MY CELL/.test(all), 'no post button without feed mechanism');
  var discards = [];
  (function walk2(e) {
    if (e.tagName === 'BUTTON' && e.textContent === 'DISCARD') discards.push(e);
    for (var i = 0; i < e.children.length; i++) walk2(e.children[i]);
  })(strips[0]);
  assert(discards.length === 1, 'discard button');
  discards[0].click();
  assert(!win._sstore.pf_takecell_drop, 'drop cleared');
  assert(!strips[0].parentNode, 'strip removed');
});
t('drop receiver: no staged payload -> nothing rendered, no error', function () {
  var win = makeEnv({ callsign: 'TESTER', hash: '#pf-takecell' });
  var SE_ = loadSE(win);
  SE_.scan();
  var strips = win._doc._all().filter(function (e) { return e.getAttribute('data-pf-takecell-drop') === '1'; });
  assert(strips.length === 0, 'no strip');
});
t('module fail-open: no PF -> no throw, no export', function () {
  var win = makeEnv({});
  delete win.PF;
  var threw = false;
  try { loadSE(win); } catch (e) { threw = true; }
  assert(!threw, 'no throw');
  assert(!win.PFShareEverywhere, 'no export without PF');
});

console.log('== 4. rebuilt-bundle markers ==');
/* Staged modules (war-report, briefing, civic-events) carry their HTML inside
   an outer template literal, so quotes arrive backslash-escaped in the
   minified bundle — the runtime string is identical. Accept both forms. */
function markerIn(bundle, marker) {
  if (has(bundle, marker)) return true;
  var esc1 = marker.replace(/"/g, '\\"');
  return has(bundle, esc1);
}
[
  ['v1.4.3/pages/bundle-pages.js', 'takeToCell'],
  ['v1.4.3/core/bundle-money.js', 'data-pf-tc-kind="robreport"'],
  ['v1.4.3/games/bundle-sec1.js', 'data-pf-tc-kind="briefing"'],
  ['v1.4.3/games/bundle-peoples-cpi.js', 'data-pf-tc-kind="peoples-cpi"'],
  ['v1.4.3/games/bundle-predgame.js', 'data-pf-tc-kind="predgame"'],
  ['v1.4.3/games/bundle-create.js', 'data-pf-tc-kind="data-bounty"'],
  ['v1.4.3/games/bundle-economy.js', 'data-pf-tc-kind="inflation"'],
  ['v1.4.3/games/bundle-events.js', 'data-pf-tc-kind="event"'],
  ['v1.4.3/games/bundle-events-map.js', 'data-pf-tc-kind="civic-event"'],
  ['v1.4.3/games/bundle-warreport.js', 'data-pf-tc-kind="war-report"']
].forEach(function (c) {
  try {
    if (markerIn(c[0], c[1])) ok('bundle ships: ' + c[0]);
    else no('bundle ships: ' + c[0], 'marker missing: ' + c[1]);
  } catch (e) { no('bundle ships: ' + c[0], 'unreadable'); }
});

console.log('\n==================');
console.log('PASS: ' + passes + '  FAIL: ' + fails.length);
if (fails.length) {
  console.log('Failures:');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
console.log('ALL GREEN — take-to-cell is universal.');
