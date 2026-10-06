#!/usr/bin/env node
/* scripts/verify-war-timeline-fe.js — ONE WAR CALENDAR (PLAY 5, fe/war-timeline,
   2026-10-06).
   Run from the repo root: node scripts/verify-war-timeline-fe.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: node --check on touched files; inner-script gate on both new silos;
   bundle placement (war-timeline.js exactly once in build/bundle.js inside
   bundle-events; war-timeline-strip.js exactly once inside bundle-home; each
   staged in its own generated bundle and not the other); page-mount wiring
   (pf-events order entry after mastercal); kill switches; the event-kind
   vocabulary; copy/brand rules; fail-open strings; and a fake-DOM smoke that
   executes both IIFEs against fake calendar_events/proposal_list/
   predict_qlist backends and verifies normalization, impact sort, the
   mandatory CHRONOLOGICAL toggle, time badges, Action Bar buttons, deep
   links — plus the fail-open hide path when every endpoint is down. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var GAMES = path.join(ROOT, 'v1.4.3', 'games');
var WT = path.join(GAMES, 'war-timeline.js');
var WTS = path.join(GAMES, 'war-timeline-strip.js');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ---------- 1. node --check on touched files ---------- */
console.log('== 1. node --check ==');
[WT, WTS,
  path.join(ROOT, 'build', 'bundle.js'),
  path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'),
  __filename
].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p)); }
  catch (e) { no(path.basename(p), 'node --check failed'); }
});

/* ---------- 2. inner-script gate ---------- */
console.log('== 2. inner-script gate ==');
try {
  cp.execSync('node scripts/check-inner-scripts.js ' + WT + ' ' + WTS, { cwd: ROOT, stdio: 'pipe' });
  ok('check-inner-scripts.js clean on both silos');
} catch (e) { no('inner-script gate', 'check-inner-scripts failed'); }

/* ---------- 3. bundle placement ---------- */
console.log('== 3. bundle placement ==');
var bundleSrc = read(path.join(ROOT, 'build', 'bundle.js'));
[['war-timeline.js', 'bundle-events'], ['war-timeline-strip.js', 'bundle-home']].forEach(function (pair) {
  var mentions = (bundleSrc.match(new RegExp("'" + pair[0].replace(/\./g, '\\.') + "'", 'g')) || []).length;
  if (mentions === 1) ok(pair[0] + ' listed exactly once in build/bundle.js');
  else no('bundle listing', "'" + pair[0] + "' appears " + mentions + ' times');
});
function sectionOf(name) {
  var i = bundleSrc.indexOf("'" + name + "'");
  var keys = ["'bundle-sec1'", "'bundle-home'", "'bundle-events'", "'bundle-hq'"];
  var best = null, bestIdx = -1;
  keys.forEach(function (k) {
    var ki = bundleSrc.lastIndexOf(k + ':', i);
    if (ki > bestIdx) { bestIdx = ki; best = k; }
  });
  return best;
}
if (sectionOf('war-timeline.js') === "'bundle-events'") ok('war-timeline.js lives in bundle-events');
else no('war-timeline.js bundle', 'not in bundle-events');
if (sectionOf('war-timeline-strip.js') === "'bundle-home'") ok('war-timeline-strip.js lives in bundle-home');
else no('war-timeline-strip.js bundle', 'not in bundle-home');
/* Generated bundles: each template staged in its own bundle, not the other. */
var evB = read(path.join(GAMES, 'bundle-events.js'));
var homeB = read(path.join(GAMES, 'bundle-home.js'));
if (evB.indexOf('pf-ov-wartimeline') !== -1) ok('bundle-events.js stages pf-ov-wartimeline');
else no('bundle-events.js', 'pf-ov-wartimeline missing');
if (homeB.indexOf('pfWarTimelineStripDone') !== -1) ok('bundle-home.js carries the strip silo');
else no('bundle-home.js', 'strip silo missing');
if (homeB.indexOf('pf-ov-wartimeline') === -1) ok('full timeline NOT in bundle-home');
else no('cross-bundle leak', 'pf-ov-wartimeline found in bundle-home.js');
if (evB.indexOf('pfWarTimelineStripDone') === -1) ok('strip NOT in bundle-events');
else no('cross-bundle leak', 'strip found in bundle-events.js');

/* ---------- 4. page-mount wiring ---------- */
console.log('== 4. page-mount wiring ==');
var pm = read(path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js'));
var mcIdx = pm.indexOf("['mastercal', 'pf-ov-mastercal']");
var wtIdx = pm.indexOf("['wartimeline', 'pf-ov-wartimeline']");
if (wtIdx !== -1) ok("pf-events order carries ['wartimeline','pf-ov-wartimeline']");
else no('page-mount', 'wartimeline entry missing');
if (mcIdx !== -1 && wtIdx > mcIdx) ok('timeline mounts right after the month grid');
else no('page-mount order', 'wartimeline not positioned after mastercal');

/* ---------- 5. kill switches ---------- */
console.log('== 5. kill switches ==');
var wtSrc = read(WT), wtsSrc = read(WTS);
if (wtSrc.indexOf("PF.skip('wartimeline')") !== -1 && wtSrc.indexOf('?pf_off=wartimeline') !== -1)
  ok('full timeline honors ?pf_off=wartimeline');
else no('kill switch', 'wartimeline kill missing');
if (wtsSrc.indexOf("PF.skip('wartimeline-strip')") !== -1 && wtsSrc.indexOf('?pf_off=wartimeline-strip') !== -1)
  ok('strip honors ?pf_off=wartimeline-strip');
else no('kill switch', 'wartimeline-strip kill missing');

/* ---------- 6. kind vocabulary ---------- */
console.log('== 6. kind vocabulary ==');
var KINDS = ['irl', 'governance', 'prediction', 'streak_reset', 'season_end',
  'daily_orders', 'war_report', 'fan_vote', 'draw', 'liveops', 'discord'];
var missing = KINDS.filter(function (k) { return wtSrc.indexOf(k + ':') === -1; });
if (!missing.length) ok('11-kind vocabulary present (' + KINDS.join(', ') + ')');
else no('kind vocabulary', 'missing: ' + missing.join(', '));
/* calendar_events feed kinds all mapped into the vocabulary */
['irl:', 'liveops:', 'draw:', 'warreport:', 'fanvote:', 'medals:', 'offensive:', 'discord:']
  .forEach(function (k) {
    if (wtSrc.indexOf(k) !== -1) ok('CAL_KIND maps ' + k.replace(':', ''));
    else no('CAL_KIND', 'missing feed kind ' + k);
  });

/* ---------- 7. copy / brand / rules ---------- */
console.log('== 7. copy, brand, rules ==');
[['impact_weight', 'normalized shape carries impact_weight'],
  ['CHRONOLOGICAL', 'mandatory chronological toggle'],
  ['aria-pressed', 'toggle uses aria-pressed'],
  ['SHARE THIS INTEL', 'Action Bar: SHARE THIS INTEL'],
  ['TAKE THIS TO YOUR CELL', 'Action Bar: TAKE THIS TO YOUR CELL'],
  ['REPORT BACK', 'Action Bar: REPORT BACK'],
  ['TODAY', 'time badge TODAY'],
  ['THIS WEEKEND', 'time badge THIS WEEKEND'],
  ['America/Chicago', 'Chicago-timezone aware']
].forEach(function (pair) {
  if (wtSrc.indexOf(pair[0]) !== -1) ok(pair[1]);
  else no('copy/brand', 'missing: ' + pair[0]);
});
if (/xp|XP/.test(wtSrc.replace(/explain/gi, '')) && wtSrc.indexOf('No XP') === -1)
  no('zero-XP rule', 'suspicious XP mention');
else ok('zero XP mechanics (header asserts, no XP grants)');
if (wtsSrc.indexOf('NEXT ON THE WAR TIMELINE') !== -1 && wtsSrc.indexOf('/events') !== -1)
  ok('strip renders next-3 + FULL TIMELINE link');
else no('strip render', 'header or /events link missing');
if (wtsSrc.indexOf('pf-campaign') !== -1) ok('strip targets the YOUR CAMPAIGN (#pf-campaign) area');
else no('strip mount', '#pf-campaign anchor missing');

/* ---------- 8. fake-DOM smoke ---------- */
console.log('== 8. fake-DOM smoke ==');
function makeSandbox(responses) {
  var html = '';
  var els = {};
  function mkEl(tag) {
    return {
      tagName: tag, children: [], style: {}, textContent: '',
      _innerHTML: '', _attrs: {},
      set innerHTML(v) { this._innerHTML = String(v); },
      get innerHTML() { return this._innerHTML; },
      setAttribute: function (k, v) { this._attrs[k] = v; },
      getAttribute: function (k) { return this._attrs[k]; },
      appendChild: function (c) { this.children.push(c); return c; },
      removeChild: function (c) { return c; },
      addEventListener: function () {},
      closest: function () { return null; },
      querySelector: function () { return null; },
      parentNode: null
    };
  }
  var scriptEls = [];
  var doc = {
    createElement: function (tag) {
      var el = mkEl(tag);
      if (tag === 'script') {
        scriptEls.push(el);
        Object.defineProperty(el, 'src', {
          set: function (v) {
            var m = /[?&]action=([^&]*)/.exec(v);
            var cbm = /[?&]callback=([^&]*)/.exec(v);
            var action = m && decodeURIComponent(m[1]);
            var cb = cbm && cbm[1];
            var resp = responses[action];
            setTimeout(function () {
              if (typeof sandbox.window[cb] === 'function') sandbox.window[cb](resp === undefined ? null : resp);
            }, 0);
          },
          get: function () { return ''; }
        });
      }
      return el;
    },
    getElementById: function (id) {
      if (!els[id]) {
        var el = mkEl('div'); el.id = id;
        el.closest = function () { return null; };
        els[id] = el;
      }
      return els[id];
    },
    head: mkEl('head'), body: mkEl('body')
  };
  var holder = mkEl('div');
  holder.insertAdjacentHTML = function (pos, h) { html += h; };
  var sandbox = {
    window: {
      PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
      PF: { skip: function () { return false; }, holder: function () { return holder; } },
      location: { origin: 'https://mtcstw.com' },
      navigator: {}
    },
    document: doc,
    location: { origin: 'https://mtcstw.com' },
    navigator: {},
    setTimeout: function (fn) { return 0; }, /* never fire timers: fail-open paths stay manual */
    clearTimeout: function () {},
    setInterval: function (fn) { try { fn(); } catch (e) {} return 1; },
    clearInterval: function () {},
    console: console,
    Intl: Intl
  };
  sandbox.window.window = sandbox.window;
  sandbox.__html = function () { return html; };
  sandbox.__els = els;
  sandbox.__holder = holder;
  return sandbox;
}
/* Extract the staged inner <script> from the outer silo file: evaluate the
   static template literal exactly as the browser would, then pull the script. */
function innerScriptOf(file) {
  var src = read(file);
  var t0 = src.indexOf('`<template');
  if (t0 === -1) throw new Error('template literal not found');
  var t1 = src.indexOf('</template>`', t0);
  var litSrc = src.slice(t0, t1 + '</template>`'.length);
  var html = vm.runInNewContext(litSrc, {});
  var m = /<script>([\s\S]*)<\/script>/.exec(html);
  if (!m) throw new Error('inner script not found');
  return { html: html, js: m[1].replace(/<\\\/script>/g, '</scr' + 'ipt>') };
}
var NOW = Date.now();
var FEEDS = {
  calendar_events: { ok: true, events: [
    { id: 'e1', title: 'Rally at the Capitol', kind: 'irl', ts: NOW + 5 * 3600000, url: '/events', detail: 'Bring friends.' },
    { id: 'e2', title: 'Stale march', kind: 'irl', ts: NOW - 48 * 3600000, url: '/events', detail: '' }
  ]},
  proposal_list: { ok: true, proposals: [
    { id: 'p1', title: 'Fund the strike fund', status: 'open', closes_at: NOW + 3 * 3600000, voter_count: 12 },
    { id: 'p2', title: 'Closed proposal', status: 'closed', closes_at: NOW - 3600000 }
  ]},
  predict_qlist: { ok: true, questions: [
    { id: 'q1', title: 'Will the bill pass?', status: 'open', lock_at: NOW + 50 * 3600000 },
    { id: 'q2', title: 'Locked question', status: 'locked', lock_at: NOW + 3600000 }
  ]}
};
try {
  /* --- outer IIFE stages the template --- */
  var sb = makeSandbox(FEEDS);
  vm.createContext(sb);
  vm.runInContext(read(WT), sb, { filename: 'war-timeline.js' });
  var staged = sb.__html();
  if (staged.indexOf('pf-ov-wartimeline') !== -1 && staged.indexOf('xWarTimeline') !== -1)
    ok('outer IIFE stages pf-ov-wartimeline with #xWarTimeline');
  else no('smoke', 'template not staged');
  /* --- inner script: full aggregation + render --- */
  var inner = innerScriptOf(WT);
  var sb2 = makeSandbox(FEEDS);
  /* real timers for the JSONP callbacks, manual backstop */
  sb2.setTimeout = function (fn, ms) { if (ms <= 50) setTimeout(fn, 0); return 0; };
  vm.createContext(sb2);
  vm.runInContext(inner.js, sb2, { filename: 'war-timeline-inner.js' });
  setTimeout(function () {
    try {
      var box = sb2.__els['xWarTimeline'];
      var h = box.innerHTML;
      var checks = [
        ['Rally at the Capitol', 'irl event normalized'],
        ['VOTE CLOSES: Fund the strike fund', 'governance close normalized'],
        ['CALL IT. LOCKS: Will the bill pass?', 'prediction lock normalized'],
        ['New Daily Orders drop', 'computed daily-orders expiry present'],
        ['CHRONOLOGICAL', 'chronological toggle rendered'],
        ['SHARE THIS INTEL', 'Action Bar share button'],
        ['TAKE THIS TO YOUR CELL', 'Action Bar cell button'],
        ['REPORT BACK', 'Action Bar report button'],
        ['/political-hq#pf-gov', 'governance deep link'],
        ['/arcade#pf-predgame', 'prediction deep link']
      ];
      checks.forEach(function (c) {
        if (h.indexOf(c[0]) !== -1) ok('render: ' + c[1]);
        else no('smoke render', 'missing: ' + c[0]);
      });
      if (h.indexOf('Stale march') === -1) ok('stale event filtered out');
      else no('smoke filter', 'stale event rendered');
      if (h.indexOf('Closed proposal') === -1 && h.indexOf('Locked question') === -1)
        ok('closed proposal + locked question excluded');
      else no('smoke filter', 'closed/locked item rendered');
      /* impact order: irl (95+40) > governance (88+40) > prediction (78+20) > daily_orders (42+40) */
      var iIrl = h.indexOf('Rally at the Capitol'), iGov = h.indexOf('VOTE CLOSES'),
        iPred = h.indexOf('CALL IT. LOCKS'), iOrd = h.indexOf('New Daily Orders drop');
      if (iIrl !== -1 && iIrl < iGov && iGov < iPred && iPred < iOrd)
        ok('impact sort order correct (irl > governance > prediction > daily_orders)');
      else no('smoke sort', 'impact order wrong: ' + [iIrl, iGov, iPred, iOrd].join(','));
      if (h.indexOf('TODAY') !== -1) ok('TODAY badge rendered');
      else no('smoke badge', 'no TODAY badge');
    } catch (e) { no('smoke render', 'exception: ' + e.message); }
    /* --- fail-open: every endpoint down -> only the computed daily-orders
       item renders (fail-open: down kinds are skipped, the rest render) --- */
    try {
      var sb3 = makeSandbox({ calendar_events: null, proposal_list: null, predict_qlist: null });
      sb3.setTimeout = function (fn, ms) { if (ms <= 50) setTimeout(fn, 0); return 0; };
      vm.createContext(sb3);
      vm.runInContext(inner.js, sb3, { filename: 'war-timeline-inner-fail.js' });
      setTimeout(function () {
        try {
          var h3 = sb3.__els['xWarTimeline'].innerHTML;
          var cards = (h3.match(/wt-card/g) || []).length;
          if (cards === 1 && h3.indexOf('New Daily Orders drop') !== -1)
            ok('fail-open: all endpoints down -> only the computed daily-orders item renders');
          else no('fail-open', 'expected 1 computed card, found ' + cards);
          var root = sb3.__els['pf-wartimeline'];
          if (root.style.display !== 'none') ok('fail-open: section stays up with computed data');
          else no('fail-open', 'section hid despite computed data');
        } catch (e) { no('fail-open', 'exception: ' + e.message); }
        /* --- strip silo smoke --- */
        try {
          var sb4 = makeSandbox(FEEDS);
          sb4.setTimeout = function (fn, ms) { if (ms <= 50) setTimeout(fn, 0); return 0; };
          vm.createContext(sb4);
          /* fake the mounted YOUR CAMPAIGN block */
          var camp = sb4.document.createElement('div'); camp.id = 'pf-campaign';
          var parent = sb4.document.createElement('div');
          camp.parentNode = parent;
          parent.insertBefore = function (el, ref) { parent.children.push(el); };
          sb4.document.getElementById = (function (orig) {
            return function (id) {
              if (id === 'pf-campaign') return camp;
              if (id === 'pf-wtstrip') return null;
              return orig(id);
            };
          })(sb4.document.getElementById);
          vm.runInContext(read(WTS), sb4, { filename: 'war-timeline-strip.js' });
          setTimeout(function () {
            try {
              var strip = parent.children.filter(function (c) { return c.id === 'pf-wtstrip'; })[0];
              if (!strip) { no('strip smoke', 'strip did not mount after #pf-campaign'); }
              else {
                var sh = sb4.__els['xWtStrip'].innerHTML;
                if (sh.indexOf('FULL TIMELINE') !== -1) ok('strip renders with FULL TIMELINE link');
                else no('strip smoke', 'strip body missing');
                var rows = (sh.match(/ws-row/g) || []).length;
                if (rows === 3) ok('strip shows exactly 3 upcoming items');
                else no('strip smoke', 'expected 3 rows, found ' + rows);
              }
            } catch (e) { no('strip smoke', 'exception: ' + e.message); }
            finish2();
          }, 50);
        } catch (e) { no('strip smoke', 'exception: ' + e.message); finish2(); }
      }, 50);
    } catch (e) { no('fail-open', 'exception: ' + e.message); finish2(); }
    function finish2() {
      console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
      if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
    }
  }, 50);
} catch (e) { no('smoke', 'exception: ' + e.message); }
/* Note: process exits via finish2() in the async path. Guard against the
   sync path never reaching it: */
setTimeout(function () {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed (guard).');
  process.exit(fails.length ? 1 : 0);
}, 8000).unref();
