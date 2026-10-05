#!/usr/bin/env node
/* scripts/verify-quiet-collapse-fe.js — Quiet-State Collapse verification
   (homepage audit Phase 3 #7/#8: alerts collapse + hall hide).
   Run from the repo root:
     node scripts/verify-quiet-collapse-fe.js
   0. node --check on both widget files (outer) + rebuild bundle-home
   1. Extract the REAL inner scripts the way the browser sees them
      (eval the outer mount IIFE, capture the staged <template> HTML,
      pull the <script> text) and node --check each — this is the
      inner-script SyntaxError class node --check can't see on the outer file
   2. Static contract checks (strip markup, CSS hooks, kill switches,
      no XP changes, banned terms)
   3. Mocked-browser runtime (vm + DOM stub) driving the real inner scripts:
        alerts: empty -> collapsed strip; alert -> expanded;
                quiet->alert via the 3-min poll -> flash + toast + scroll;
                fetch error (null / ok:false) -> current visible behavior
        hall:   empty pins -> section hidden; pins -> shown;
                fetch error -> current visible behavior
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3', 'games');
var ALERTS = path.join(V, 'alerts.js');
var HALL = path.join(V, 'hall-of-proof.js');
var BUNDLE_HOME = path.join(V, 'bundle-home.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function count(p, s) { return read(p).split(s).length - 1; }

/* ============ 0. syntax + bundle rebuild ============ */
console.log('== 0. node --check (outer) + bundle rebuild ==');
[ALERTS, HALL].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f) + ' outer syntax'); }
  catch (e) { no(path.basename(f) + ' outer syntax', 'node --check failed'); }
});
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
if (has(BUNDLE_HOME, 'pf-quietstrip') && has(BUNDLE_HOME, 'setWallHidden')) ok('bundle-home.js carries both features');
else no('bundle marker', 'pf-quietstrip/setWallHidden missing from bundle-home.js');

/* ============ 1. extract browser-true inner scripts ============ */
/* Minimal DOM stub for the OUTER mount IIFE: PF.holder() captures the HTML. */
function outerCapture(file) {
  var captured = '';
  var holder = { insertAdjacentHTML: function (pos, html) { captured = html; } };
  var PF = { skip: function () { return false; }, holder: function () { return holder; } };
  var win = { PF: PF };
  var sb = { window: win, PF: PF, console: console };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read(file), sb, { filename: path.basename(file) });
  return captured;
}
function innerOf(file) {
  var html = outerCapture(file);
  var tpl = html.match(/<template[^>]*>([\s\S]*)<\/template>/);
  if (!tpl) { no(path.basename(file) + ' template', 'no <template> captured'); return null; }
  var sc = tpl[1].match(/<script>([\s\S]*?)<\/script>/);
  if (!sc) { no(path.basename(file) + ' inner script', 'no <script> in template'); return null; }
  return { html: tpl[1], js: sc[1] };
}
console.log('== 1. inner-script extraction + syntax (browser-equivalent) ==');
var alInner = innerOf(ALERTS), hallInner = innerOf(HALL);
[[alInner, 'alerts'], [hallInner, 'hall-of-proof']].forEach(function (pair) {
  var got = pair[0], name = pair[1];
  if (!got) return;
  var tmp = path.join('/tmp', 'qc-inner-' + name + '.js');
  fs.writeFileSync(tmp, got.js);
  try { cp.execSync('node --check ' + tmp, { stdio: 'pipe' }); ok(name + ' inner script syntax (browser-equivalent)'); }
  catch (e) { no(name + ' inner script syntax', 'node --check failed on extracted inner script'); }
});

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
/* alerts */
if (alInner && alInner.html.indexOf('pf-quietstrip') !== -1) ok('alerts template: quiet strip markup present');
else no('alerts strip markup', 'pf-quietstrip missing from template');
if (alInner && /\.pf-quiet\b/.test(alInner.html) && alInner.html.indexOf('pfAlFlash') !== -1) ok('alerts template: .pf-quiet + flash CSS present');
else no('alerts quiet CSS', '.pf-quiet/pfAlFlash CSS missing');
if (alInner && alInner.js.indexOf('setQuiet') !== -1 && alInner.js.indexOf('wasQuiet') !== -1) ok('alerts inner: quiet-state + transition logic present');
else no('alerts quiet logic', 'setQuiet/wasQuiet missing');
if (alInner && alInner.js.indexOf('180000') !== -1) ok('alerts inner: 3-minute poll path intact (re-check hook)');
else no('alerts poll', '180000 poll interval missing');
if (has(ALERTS, 'PF.skip("alerts")') && has(ALERTS, '?pf_off=alerts')) ok('alerts kill switch intact');
else no('alerts kill', 'kill switch regressed');
/* hall */
if (hallInner && hallInner.js.indexOf('setWallHidden') !== -1 && hallInner.js.indexOf('hpSec') !== -1) ok('hall inner: hide-on-empty logic present');
else no('hall hide logic', 'setWallHidden/hpSec missing');
if (has(HALL, 'PF.skip("hall")') && has(HALL, '?pf_off=hall-of-proof')) ok('hall kill switch intact');
else no('hall kill', 'kill switch regressed');
/* no XP changes */
if (count(ALERTS, '+25 XP') === 2) ok('alerts: no XP changes (2 pre-existing +25 XP copies — header + response-log toast — untouched)');
else no('alerts XP', 'expected 2 pre-existing "+25 XP", found ' + count(ALERTS, '+25 XP'));
if (count(HALL, 'xpGrant') === 0 && !/\+ ?\d+ XP/.test(read(HALL).replace('ZERO XP FOR VIEWING', ''))) ok('hall: still zero XP (honorific only)');
else no('hall XP', 'XP grant/copy appeared');
/* banned terms / no invented identity */
['donate', 'shanetheswan'].forEach(function (w) {
  if (ALERTS && HALL && read(ALERTS).toLowerCase().indexOf(w) === -1 && read(HALL).toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(read(ALERTS)) && !/\bShane\b/.test(read(HALL))) ok('no real names in touched files');
else no('real name', '"Shane" found in touched files');
/* fail-soft markers: error path keeps section visible */
if (alInner && /if\(!ok\)[\s\S]{0,200}setQuiet\(false\)/.test(alInner.js)) ok('alerts: fetch error forces visible (setQuiet(false))');
else no('alerts fail-soft', 'error path does not force visible');
if (hallInner && /if\(!j\|\|!j\.ok\)[\s\S]{0,200}setWallHidden\(false\)/.test(hallInner.js)) ok('hall: fetch error forces visible (setWallHidden(false))');
else no('hall fail-soft', 'error path does not force visible');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime (DOM stub) ==');
var scrolls, toasts;
function makeClassList() {
  var s = new Set();
  return {
    _set: s,
    add: function (c) { s.add(c); },
    remove: function (c) { s.delete(c); },
    contains: function (c) { return s.has(c); }
  };
}
function makeEl(id, extra) {
  var el = {
    id: id || '', innerHTML: '', textContent: '', style: {},
    classList: makeClassList(), offsetWidth: 100,
    closest: function () { return null; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    appendChild: function (c) { return c; },
    removeChild: function (c) { return c; },
    scrollIntoView: function () { scrolls.push(this.id); },
    setAttribute: function () {}, getAttribute: function () { return null; },
    addEventListener: function () {}, remove: function () {}
  };
  if (extra) for (var k in extra) el[k] = extra[k];
  return el;
}
/* Build a fresh sandbox per scenario group; run the REAL inner script. */
function sandboxFor(innerJs, registry) {
  scrolls = []; toasts = [];
  var intervals = [], timeouts = [], pendingScripts = [];
  var win = {
    PF_BACKEND_URL: 'https://backend.invalid',
    PFCallsign: undefined, PFDeviceId: undefined
  };
  var PF = {
    skip: function () { return false; },
    toast: function (m) { toasts.push(m); },
    hidden: function () { return false; },
    errCopy: function (j, d) { return d; },
    authPost: function (b, body, cb) { cb({ ok: false }); }
  };
  win.PF = PF;
  var head = makeEl('head');
  head.appendChild = function (s) { pendingScripts.push(s); return s; };
  var documentStub = {
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (t) {
      if (String(t).toLowerCase() === 'script') return makeEl('', { src: '', onerror: null });
      return makeEl('');
    },
    head: head, body: makeEl('body'),
    addEventListener: function () {}, dispatchEvent: function () { return true; }
  };
  var sb = {
    window: win, PF: PF, document: documentStub,
    console: console, encodeURIComponent: encodeURIComponent,
    setTimeout: function (fn) { timeouts.push(fn); return timeouts.length; },
    setInterval: function (fn, ms) { intervals.push({ fn: fn, ms: ms }); return intervals.length; },
    clearTimeout: function () {}, clearInterval: function () {}
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(innerJs, sb, { filename: 'inner.js' });
  return {
    win: win, intervals: intervals,
    jsonp: function (re, key) {
      var ks = Object.keys(win).filter(function (k) { return re.test(k); });
      if (!ks.length) { no('jsonp cb', 'no pending ' + key + ' callback'); return null; }
      return win[ks[ks.length - 1]];
    }
  };
}

/* ---- alerts runtime ----
   Each scenario gets a FRESH sandbox: the JSONP callback is one-shot
   (finish() deletes window[fn]), so a fresh load() per scenario mirrors
   the browser exactly. */
function freshAlerts() {
  var block = makeEl('pf-alerts');
  var xAlerts = makeEl('xAlerts');
  xAlerts.innerHTML = '<div class="c-load">Scanning the wire&hellip;</div>';
  var reg = { 'pf-alerts': block, 'xAlerts': xAlerts };
  var ctx = sandboxFor(alInner.js, reg);
  return {
    block: block, xAlerts: xAlerts, ctx: ctx,
    drive: function (payload) {
      var cb = ctx.jsonp(/^pfAlCb\d+$/, 'alert');
      if (cb) cb(payload);
      return !!cb;
    }
  };
}
(function alertsRuntime() {
  var AL = [{ id: 'a1', headline: 'BREAKING: test alert', context: 'ctx', created_at: Date.now(), response_count: 3, template_id: 't1' }];

  /* D/E: fetch error -> current visible behavior */
  var e1 = freshAlerts();
  e1.drive(null);
  if (!e1.block.classList.contains('pf-quiet') && e1.xAlerts.innerHTML.indexOf('No active alerts') !== -1)
    ok('alerts: fetch error (null) -> visible, current quiet-pane copy');
  else no('alerts error null', 'quiet=' + e1.block.classList.contains('pf-quiet'));
  var e2 = freshAlerts();
  e2.drive({ ok: false });
  if (!e2.block.classList.contains('pf-quiet') && e2.xAlerts.innerHTML.indexOf('No active alerts') !== -1)
    ok('alerts: fetch error (ok:false) -> visible, current quiet-pane copy');
  else no('alerts error ok:false', 'quiet=' + e2.block.classList.contains('pf-quiet'));

  /* A: empty alerts -> collapsed strip */
  var q = freshAlerts();
  q.drive({ ok: true, alerts: [] });
  if (q.block.classList.contains('pf-quiet') && q.xAlerts.innerHTML === '')
    ok('alerts: empty alert_list -> collapsed (pf-quiet on, body cleared)');
  else no('alerts empty', 'quiet=' + q.block.classList.contains('pf-quiet'));

  /* B: alert present on load -> expanded */
  var a = freshAlerts();
  a.drive({ ok: true, alerts: AL });
  if (!a.block.classList.contains('pf-quiet') && a.xAlerts.innerHTML.indexOf('BREAKING: test alert') !== -1 &&
      a.xAlerts.innerHTML.indexOf('ACTIVE ALERT') !== -1)
    ok('alerts: alert present -> expanded with alert pane');
  else no('alerts expanded', 'quiet=' + a.block.classList.contains('pf-quiet'));

  /* C: poll re-check path — quiet, then an alert fires mid-session */
  var p = freshAlerts();
  var poll = p.ctx.intervals.filter(function (i) { return i.ms === 180000; })[0];
  if (!poll) { no('alerts poll', 'no 180000ms interval captured'); return; }
  ok('alerts: 3-minute poll interval captured (re-check path)');
  poll.fn(); /* hidden() false -> load() -> fresh JSONP cb */
  p.drive({ ok: true, alerts: [] });
  if (!p.block.classList.contains('pf-quiet')) { no('alerts poll quiet', 'poll empty did not collapse'); return; }
  ok('alerts: poll re-check with empty list stays collapsed');
  poll.fn();
  p.drive({ ok: true, alerts: AL });
  var flashed = p.block.classList.contains('pf-flash');
  var toasted = toasts.some(function (t) { return /ACTIVE ALERT/.test(t); });
  var scrolled = scrolls.indexOf('pf-alerts') !== -1;
  if (!p.block.classList.contains('pf-quiet') && flashed && toasted && scrolled)
    ok('alerts: mid-session alert via poll -> expanded + flash + toast + scroll (impossible to miss)');
  else no('alerts mid-session', 'quiet=' + p.block.classList.contains('pf-quiet') +
    ' flash=' + flashed + ' toast=' + toasted + ' scroll=' + scrolled);
})();

/* ---- hall runtime ---- (fresh sandbox per scenario: one-shot JSONP cb) */
function freshHall() {
  var section = makeEl('hall-section');
  var wall = makeEl('pf-hallofproof', { closest: function () { return section; } });
  var main = makeEl('pf-hp-main');
  var arch = makeEl('pf-hp-archive'); arch.style.display = 'none';
  var sel = makeEl('pf-hp-weeksel');
  var reg = { 'pf-hallofproof': wall, 'pf-hp-main': main, 'pf-hp-archive': arch, 'pf-hp-weeksel': sel };
  var ctx = sandboxFor(hallInner.js, reg);
  return {
    section: section, main: main,
    drive: function (payload) {
      var cb = ctx.jsonp(/^pfHallCb\d+$/, 'hall');
      if (cb) cb(payload);
      return !!cb;
    }
  };
}
(function hallRuntime() {
  var PINS = [{ callsign: 'redfox', source: 'dead_drop', detail: 'cracked the drop' },
              { callsign: 'graywolf', source: 'fan_vote', detail: 'fan favorite' }];
  var CRIT = [{ k: 'dead_drop', feat: 'Dead Drop' }, { k: 'fan_vote', feat: 'Fan Vote' }];

  var h1 = freshHall();
  h1.drive(null);
  if (h1.section.style.display !== 'none' && h1.main.innerHTML.indexOf('unreachable') !== -1)
    ok('hall: fetch error (null) -> visible, current error pane');
  else no('hall error null', 'display=' + h1.section.style.display);

  var h2 = freshHall();
  h2.drive({ ok: true, pins: [], week: '2026-10-05', criteria: [], weeks: [] });
  if (h2.section.style.display === 'none')
    ok('hall: empty pins -> section hidden');
  else no('hall empty', 'display=' + h2.section.style.display);

  var h3 = freshHall();
  h3.drive({ ok: true, pins: PINS, week: '2026-10-05', criteria: CRIT, weeks: [] });
  if (h3.section.style.display !== 'none' && h3.main.innerHTML.indexOf('redfox') !== -1 &&
      h3.main.innerHTML.indexOf('graywolf') !== -1)
    ok('hall: pins present -> section shown with winners');
  else no('hall pins', 'display=' + h3.section.style.display);

  var h4 = freshHall();
  h4.drive({ ok: true, pins: [{ callsign: 'BAD NAME!', source: 'x', detail: 'y' }], week: '2026-10-05', criteria: [], weeks: [] });
  if (h4.section.style.display === 'none')
    ok('hall: invalid-callsign pins filtered -> treated as empty -> hidden');
  else no('hall invalid pins', 'display=' + h4.section.style.display);
})();

/* ============ summary ============ */
console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL QUIET-COLLAPSE CHECKS PASS');
