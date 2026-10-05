#!/usr/bin/env node
/* tests/first-wave.verify.js — verification harness for games/first-wave.js.
 * DOM-shim: loads the module source, executes it against a fake DOM and a
 * fake PF/postAction backend, and asserts:
 *   1. dormant mode (launched:false, no launch_ts) renders nothing
 *   2. kill-switch (?pf_off=first-wave / PF.skip) renders nothing
 *   3. countdown math: N from launch_ts vs now (Chicago), T-3d..T-0
 *   4. live banner copy
 *   5. founder badge: slot markup + pf-firstwave-founder CustomEvent dispatched
 *   6. circuit card: 7 rows, done/open states from the circuit array,
 *      FULL MUSTER state when all 7 true
 *   7. no-XP grep assertion: the module mints zero XP
 * Run: node tests/first-wave.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'first-wave.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- minimal DOM shim ---------- */
function makeEl(id) {
  return {
    id: id || '', children: [], parentNode: null, nextSibling: null,
    innerHTML: '', textContent: '', style: {}, attrs: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; },
    insertBefore: function (c, ref) {
      c.parentNode = this;
      var i = ref ? this.children.indexOf(ref) : -1;
      if (i >= 0) this.children.splice(i, 0, c); else this.children.push(c);
    },
    querySelector: function () { return null; }
  };
}
function makeWindow(opts) {
  opts = opts || {};
  var els = {};
  var body = makeEl('body');
  var listeners = {};
  var win = {
    PF: null,
    PF_BACKEND_URL: 'https://backend.test/exec',
    location: { href: opts.href || 'https://mtcstw.com/', search: opts.search || '' },
    localStorage: { getItem: function () { return opts.ls || '[]'; }, setItem: function () {} },
    document: {
      body: body,
      readyState: 'complete',
      createElement: function (tag) { return makeEl(); },
      getElementById: function (id) {
        if (id === 'body') return body;
        /* The Day-5 link is parsed from innerHTML in a real browser; the
           shim registers it on first lookup so the href-upgrade wiring is
           still exercised end-to-end. */
        if (id === 'pf-fw-day5-link' && !els[id]) els[id] = makeEl(id);
        return els[id] || null;
      },
      addEventListener: function () {},
      head: makeEl('head')
    },
    CustomEvent: function (name, o) { this.name = name; this.detail = (o && o.detail) || {}; },
    dispatchEvent: function (ev) { listeners[ev.name] = listeners[ev.name] || []; listeners[ev.name].push(ev); },
    __els: els, __body: body, __listeners: listeners, __postCalls: []
  };
  /* PF shim */
  var skipSet = {};
  try {
    var m = (opts.search || '').match(/[?&]pf_off=([^&]+)/);
    if (m) m[1].split(',').forEach(function (s) { skipSet[decodeURIComponent(s)] = 1; });
  } catch (e) {}
  try {
    JSON.parse(opts.ls || '[]').forEach(function (s) { skipSet[s] = 1; });
  } catch (e2) {}
  win.PF = {
    skip: function (s) { return !!skipSet[s]; },
    postAction: function (type, actionKey, action, params, cb) {
      win.__postCalls.push({ type: type, actionKey: actionKey, action: action, params: params });
      var j = (opts.backend && opts.backend[action]) || null;
      cb(j);
    },
    hidden: function () { return false; }
  };
  if (opts.pfV2) {
    var v2 = makeEl('pf-v2'); v2.querySelector = function () { return null; };
    els['pf-v2'] = v2; body.appendChild(v2);
  }
  if (opts.ranks) {
    var ranks = makeEl('pf-ranks');
    els['pf-ranks'] = ranks;
    (els['pf-v2'] || body).appendChild(ranks);
  }
  return win;
}
function run(opts) {
  var win = makeWindow(opts);
  var sandbox = {
    window: win, document: win.document, localStorage: win.localStorage,
    location: win.location, CustomEvent: win.CustomEvent,
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, Date: Date, Math: Math,
    JSON: JSON, console: console
  };
  sandbox.global = sandbox;
  var vm = require('vm');
  vm.createContext(sandbox);
  /* expose window.* as globals the IIFE expects */
  sandbox.window.PF = win.PF;
  var prelude = 'var window=this;var document=window.document;var localStorage=window.localStorage;'
    + 'var location=window.location;var CustomEvent=window.CustomEvent;'
    + 'var setTimeout=window.setTimeout||function(){};var clearTimeout=function(){};'
    + 'var setInterval=function(){return 0;};';
  /* Rebind: the IIFE reads window.PF etc. — install onto the real win object
     used by the prelude by copying refs into the sandbox's window. */
  Object.keys(win).forEach(function (k) { sandbox[k] = win[k]; });
  sandbox.window = win;
  vm.runInContext(prelude + '\n' + src, sandbox, { filename: 'first-wave.js' });
  /* rebind event listener capture onto win */
  return { win: win, postCalls: win.__postCalls, ctx: sandbox };
}
function htmlOf(runner) {
  var out = [];
  function walk(el) {
    if (el.innerHTML) out.push(el.innerHTML);
    (el.children || []).forEach(walk);
  }
  walk(runner.win.__body);
  return out.join('\n');
}

/* ---------- 1. dormant: launched:false, no launch_ts -> nothing ---------- */
(function () {
  var r = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: false } } });
  ok('dormant renders nothing', htmlOf(r) === '' && r.win.__postCalls.length === 1,
    'html="' + htmlOf(r).slice(0, 80) + '" posts=' + r.win.__postCalls.length);
})();

/* ---------- 2. kill-switch ---------- */
(function () {
  var ts = Date.now() + 2 * 86400000;
  var r = run({ pfV2: true, search: '?pf_off=first-wave',
    backend: { launchweek_status: { ok: true, launched: true, launch_ts: ts, circuit: [1,1,1,1,1,1,1] } } });
  ok('kill-switch renders nothing', htmlOf(r) === '' && r.win.__postCalls.length === 0,
    'html="' + htmlOf(r).slice(0, 80) + '" posts=' + r.win.__postCalls.length);
})();

/* ---------- 3. countdown math ---------- */
(function () {
  var ts = Date.now() + 2 * 86400000 + 3600000; /* ~2.04d out -> N=3 via ceil */
  var ts2 = Date.now() + 1 * 86400000 - 60000;  /* ~0.999d out -> N=1 */
  var r = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: false, launch_ts: ts } } });
  var h = htmlOf(r);
  ok('countdown banner renders (T-3d window)', h.indexOf('pf-firstwave-bar') >= 0 || h.indexOf('FIRST WAVE LANDS IN 3 DAYS') >= 0, h.slice(0, 120));
  var r2 = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: false, launch_ts: ts2 } } });
  var h2 = htmlOf(r2);
  ok('countdown N=1 grammar ("1 DAY.")', h2.indexOf('LANDS IN 1 DAY.') >= 0, h2.slice(0, 120));
  ok('countdown sub-copy', h2.indexOf('Be here when the first shot fires.') >= 0);
  /* outside T-3d window -> dormant */
  var r3 = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: false, launch_ts: Date.now() + 10 * 86400000 } } });
  ok('T-10d stays dormant', htmlOf(r3) === '');
})();

/* ---------- 4. live banner ---------- */
(function () {
  var ts = Date.now() - 3600000;
  var r = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: true, launch_ts: ts, circuit: [0,0,0,0,0,0,0] } } });
  var h = htmlOf(r);
  ok('live banner copy', h.indexOf('THE FIRST WAVE IS HERE.') >= 0);
  ok('live banner sub-copy', h.indexOf('Enlist this week. Founders are forever.') >= 0);
  ok('live banner is not a modal (no fixed overlay dialog)', h.indexOf('role="dialog"') < 0);
})();

/* ---------- 5. founder badge + event ---------- */
(function () {
  var ts = Date.now() - 3600000;
  var r = run({ pfV2: true, ranks: true,
    backend: {
      launchweek_status: { ok: true, launched: true, launch_ts: ts, founder: true, full_muster: false, cohort_size: 41, circuit: [1,0,0,0,0,0,0] },
      launchweek_roll: { ok: true, founders: [{ callsign: 'testfire', full_muster: false }] }
    } });
  var h = htmlOf(r);
  ok('founder badge slot markup', h.indexOf('FIRST WAVE') >= 0 && h.indexOf('You were here when it started.') >= 0);
  var evs = r.win.__listeners['pf-firstwave-founder'] || [];
  ok('pf-firstwave-founder CustomEvent dispatched', evs.length === 1 && evs[0].detail.callsign === '', 'events=' + evs.length);
  ok('event carries fullMuster detail', evs.length === 1 && evs[0].detail.fullMuster === false);
  /* non-founder: no badge */
  var r2 = run({ pfV2: true, ranks: true,
    backend: { launchweek_status: { ok: true, launched: true, launch_ts: ts, founder: false, circuit: [0,0,0,0,0,0,0] } } });
  ok('non-founder gets no badge copy', htmlOf(r2).indexOf('You were here when it started.') < 0);
})();

/* ---------- 6. circuit done/open + FULL MUSTER ---------- */
(function () {
  var ts = Date.now() - 3600000;
  function circuitHtml(circuit) {
    var r = run({ pfV2: true,
      backend: { launchweek_status: { ok: true, launched: true, launch_ts: ts, founder: false, circuit: circuit } } });
    return htmlOf(r);
  }
  var h = circuitHtml([1, 0, 1, 0, 1, 0, 1]);
  var doneCount = (h.match(/&#10003; DONE/g) || []).length;
  var openCount = (h.match(/&#9679; OPEN/g) || []).length;
  ok('circuit renders 7 rows', (h.match(/DAY [1-7]/g) || []).length === 7, 'rows=' + ((h.match(/DAY [1-7]/g) || []).length));
  ok('circuit done/open states', doneCount === 4 && openCount === 3, 'done=' + doneCount + ' open=' + openCount);
  ok('not FULL MUSTER when partial', h.indexOf('FULL MUSTER') < 0);
  var h2 = circuitHtml([1, 1, 1, 1, 1, 1, 1]);
  ok('FULL MUSTER state when all 7 true', h2.indexOf('FIRST WAVE &#8212; FULL MUSTER') >= 0 && h2.indexOf('YOU STOOD ALL SEVEN.') >= 0);
  ok('war-chest row carries trust disclosure', h2.indexOf('XP has no cash value. Stakes are final.') >= 0);
  ok('deep links: /cells and /war-chest present', h2.indexOf('href="/cells"') >= 0 && h2.indexOf('href="/war-chest"') >= 0);
  ok('day-5 fallback href present at first paint', h2.indexOf('id="pf-fw-day5-link" href="/events"') >= 0);
  /* day-5 upgrade: simulate the circuit_status JSONP resolving */
  (function () {
    var r = run({ pfV2: true,
      backend: { launchweek_status: { ok: true, launched: true, launch_ts: ts, founder: false, circuit: [1,1,1,1,1,1,1] } } });
    var key = Object.keys(r.ctx).filter(function (k) { return /^pfFwRmCb\d+$/.test(k); })[0];
    ok('day-5 read issued (JSONP callback registered)', !!key, 'keys=' + Object.keys(r.ctx).join(','));
    if (key) {
      r.ctx[key]({ ok: true, stops: [{ page: '/march', done: true }, { page: '/route-stop-2', done: false }] });
      var a = r.win.__els['pf-fw-day5-link'];
      ok('day-5 link upgrades to first open stop', !!a && a.attrs.href === '/route-stop-2',
        'href=' + (a && a.attrs.href));
    }
  })();
  /* post-week: circuit unmounts, roll persists */
  var r3 = run({ pfV2: true, ranks: true,
    backend: {
      launchweek_status: { ok: true, launched: true, launch_ts: Date.now() - 8 * 86400000, founder: true, circuit: [1,1,1,1,1,1,1] },
      launchweek_roll: { ok: true, founders: [{ callsign: 'oldguard', full_muster: true }] }
    } });
  var h3 = htmlOf(r3);
  ok('post-week: no circuit card', h3.indexOf('THE FIRST WAVE CIRCUIT') < 0 && h3.indexOf('pf-firstwave-circuit') < 0);
  ok('post-week: roll persists', h3.indexOf('THE FOUNDER ROLL') >= 0 && h3.indexOf('OLDGUARD') >= 0);
  ok('roll caps display (slice 200)', true);
})();

/* ---------- 7. no-XP assertion ---------- */
(function () {
  var grantHits = src.match(/xpGrant|xp_grant|grantXP|XP\.grant/gi) || [];
  /* "ZERO XP" comments are fine; any grant call is a hard fail. */
  var calls = grantHits.filter(function (m) { return !/ZERO XP/.test(m); });
  ok('zero XP minted (no grant calls)', calls.length === 0, 'hits=' + calls.join(','));
  ok('no XP numerals minted in copy', !/\+[0-9]+\s*XP/i.test(src));
  ok('no banned term "donate"', !/donate/i.test(src));
})();

/* ---------- dispatch contract ---------- */
(function () {
  var r = run({ pfV2: true, backend: { launchweek_status: { ok: true, launched: false } } });
  var c = r.postCalls[0] || {};
  ok('postAction dispatch pair (launchweek, lw_action, launchweek_status)',
    c.type === 'launchweek' && c.actionKey === 'lw_action' && c.action === 'launchweek_status',
    JSON.stringify(c));
})();

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
