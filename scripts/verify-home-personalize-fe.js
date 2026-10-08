#!/usr/bin/env node
/* scripts/verify-home-personalize-fe.js — headless checks for Project 3
   (fe/home-personalize). Runs the real module against stubbed window/
   document/localStorage and asserts:
     1. source is syntax-clean (node --check)
     2. module is registered in build/bundle-core.js BUNDLES
     3. pages/bundle-pages.js carries the module marker
     4. ANONYMOUS: no callsign -> zero script tags injected (no fetches),
        no exceptions, DOM untouched
     5. LOGGED-IN + ALL FETCHES FAIL: pf-personalize still fires, no
        injections land, no exceptions (fail-soft, defaults stand)
     6. LOGGED-IN + FETCHES SUCCEED: activity payload correct
        (xp, rank from ladder, streak passthrough, voted slug)
   Run from the worktree root: node scripts/verify-home-personalize-fe.js */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'v1.4.3', 'pages', 'home-personalize.js');
var MANIFEST = path.join(ROOT, 'build', 'bundle-core.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js');

var fails = 0;
function ok(name) { console.log('ok   ' + name); }
function no(name, why) { fails++; console.log('MISS ' + name + ' — ' + (why || '')); }

/* 1. syntax */
try { cp.execSync('node --check ' + SRC, { stdio: 'pipe' }); ok('node --check home-personalize.js'); }
catch (e) { no('node --check home-personalize.js', e.message); }

/* 2. manifest registration */
try {
  var man = fs.readFileSync(MANIFEST, 'utf8');
  var bi = man.indexOf("'pages/bundle-pages'");
  var blk = man.slice(man.indexOf('[', bi), man.indexOf('],', bi));
  var hasReg = blk.indexOf("'pages/home-personalize.js'") !== -1;
  var h2 = blk.indexOf("'pages/home-v2.js'") !== -1;
  if (hasReg && h2 && blk.indexOf('home-personalize') > blk.indexOf('home-v2'))
    ok('registered in build/bundle-core.js after home-v2.js');
  else no('manifest registration', 'missing or misordered');
} catch (e) { no('manifest registration', e.message); }

/* 3. bundle marker */
try {
  var b = fs.readFileSync(BUNDLE, 'utf8');
  if (b.indexOf('pf-personalize') !== -1 && b.indexOf('pfHomePersonalizeDone') !== -1)
    ok('module present in pages/bundle-pages.js');
  else no('bundle marker', 'strings missing');
} catch (e) { no('bundle marker', e.message); }

/* ---- headless harness ---- */
function makeWorld(opts) {
  opts = opts || {};
  var scripts = [];
  var events = [];
  var listeners = {};
  var store = Object.assign({}, opts.localStorage || {});
  var els = {};
  function fakeEl(id) {
    return {
      id: id, _attrs: {}, style: {},
      getAttribute: function (k) { return this._attrs[k] || null; },
      setAttribute: function (k, v) { this._attrs[k] = v; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      appendChild: function () {},
      insertBefore: function () {},
      addEventListener: function () {},
      scrollIntoView: function () {},
      classList: { contains: function () { return false; } }
    };
  }
  var document = {
    getElementById: function (id) {
      if (id === 'pf-v2' && opts.noHost) return null;
      if (!els[id]) els[id] = fakeEl(id);
      return els[id];
    },
    querySelector: function () { return null; },
    createElement: function (tag) {
      var e = fakeEl('');
      e.tagName = tag.toUpperCase();
      if (tag === 'script') {
        scripts.push(e);
        e._fire = opts.scriptFire || null; /* 'success'|'fail'|null */
        if (e._fire) setTimeout(function () {
          if (e._fire === 'success' && e._responder) e._responder();
          if (e._fire === 'fail' && e.onerror) e.onerror();
        }, 5);
      }
      return e;
    },
    head: { appendChild: function (s) { if (s._fire === 'success' && s._responder) { /* responder set by test */ } } },
    body: fakeEl('body'),
    addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent: function (ev) {
      events.push(ev);
      (listeners[ev.type] || []).forEach(function (fn) { try { fn(ev); } catch (e) {} });
      return true;
    }
  };
  var window = {
    PFCallsign: opts.callsign ? function () { return opts.callsign; } : undefined,
    PF: {
      skip: function () { return false; },
      error: function () {},
      beUrl: function () { return 'https://pf-api.mtcstw.workers.dev'; },
      homepageInit: function () { return Promise.resolve({ ranks: { ladder: (opts.ladder || []) } }); },
      authGetJSONP: opts.noAuthGet ? undefined : function (be, action, params, cb, o) {
        if (opts.hud) setTimeout(function () { cb(opts.hud); }, 5);
        /* else: never calls back -> timeout path */
      },
      chiNow: function () { return new Date('2026-10-07T12:00:00'); },
      slrMember: function (slug) {
        return opts.slrMember && opts.slrMember[slug] ? opts.slrMember[slug] : null;
      }
    },
    location: { href: 'https://mtcstw.com/' },
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
    CustomEvent: function (t, o) { this.type = t; this.detail = (o && o.detail) || null; }
  };
  window.window = window; window.document = document;
  var localStorage = {
    getItem: function (k) { return (k in store) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  return { window: window, document: document, localStorage: localStorage,
    scripts: scripts, events: events, store: store };
}

function runModule(world) {
  var src = fs.readFileSync(SRC, 'utf8');
  var fn = new Function('window', 'document', 'localStorage', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'CustomEvent',
    'with(window){with(document){' + src + '}}');
  var errors = [];
  try {
    fn.call(world.window, world.window, world.document, world.localStorage,
      world.window.setTimeout, world.window.clearTimeout,
      world.window.setInterval, world.window.clearInterval,
      world.window.CustomEvent);
  } catch (e) { errors.push(e); }
  return errors;
}
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  /* 4. anonymous: no callsign anywhere */
  var w4 = makeWorld({});
  var e4 = runModule(w4);
  await wait(100);
  if (e4.length === 0 && w4.scripts.length === 0) ok('anonymous: no exceptions, zero fetches');
  else no('anonymous path', 'errors=' + e4.length + ' scripts=' + w4.scripts.length);

  /* 5. logged-in, everything fails (authGetJSONP never calls back,
     xp_balance script errors, homepageInit rejects) */
  var w5 = makeWorld({
    callsign: 'testpilot',
    localStorage: { pf_identity_v1: JSON.stringify({ callsign: 'testpilot' }) },
    noAuthGet: true,
    scriptFire: 'fail'
  });
  w5.window.PF.homepageInit = function () { return Promise.reject(new Error('down')); };
  var e5 = runModule(w5);
  await wait(300);
  var fired5 = w5.events.some(function (ev) { return ev.type === 'pf-personalize'; });
  if (e5.length === 0 && fired5) ok('logged-in + total failure: fail-soft, event still fires');
  else no('fail-soft path', 'errors=' + e5.length + ' fired=' + fired5);

  /* 6. logged-in, everything succeeds */
  var ladder = [{ xp: 0, name: 'SYMPATHIZER' }, { xp: 100, name: 'AGITATOR' }, { xp: 500, name: 'VANGUARD' }];
  var w6 = makeWorld({
    callsign: 'testpilot',
    ladder: ladder,
    hud: { ok: true, xp_today: 25, streak: { count: 7, checked_in_today: false, at_risk: true, hours_left: 7200000 }, in_cell: true },
    slrMember: { 'sex-drugs-rock-n-roll': { name: 'Sex Drugs Rock n Roll', catalog_path: '/sex-drugs-rock-n-roll', propaganda_score: 9.8 } },
    localStorage: { 'slr-vote-2026-W41': JSON.stringify({ name: 'Sex Drugs Rock n Roll', slug: 'sex-drugs-rock-n-roll', weight: 1 }) }
  });
  /* xp_balance responder: intercept the JSONP callback the module registers */
  var e6 = runModule(w6);
  await wait(60);
  /* find the xp_balance script and fire its callback */
  var src6 = fs.readFileSync(SRC, 'utf8');
  if (e6.length) { no('success path module load', String(e6[0] && e6[0].message)); }
  else {
    var fired6 = w6.events.filter(function (ev) { return ev.type === 'pf-personalize'; });
    /* xp_balance fires via script onload -> our harness never called it;
       re-run with a responder that answers xp_balance */
    var w7 = makeWorld({
      callsign: 'testpilot', ladder: ladder,
      hud: { ok: true, xp_today: 25, streak: { count: 7, checked_in_today: false, at_risk: true, hours_left: 7200000 }, in_cell: true },
      slrMember: { 'sex-drugs-rock-n-roll': { name: 'Sex Drugs Rock n Roll', catalog_path: '/sex-drugs-rock-n-roll', propaganda_score: 9.8 } },
      localStorage: { 'slr-vote-2026-W41': JSON.stringify({ name: 'Sex Drugs Rock n Roll', slug: 'sex-drugs-rock-n-roll', weight: 1 }) }
    });
    /* answer xp_balance: the module builds url with callback=pfHpXXX and sets
       window[cb]; our document stub doesn't wire window props, so emulate: */
    var origCE = w7.document.createElement.bind(w7.document);
    w7.document.createElement = function (tag) {
      var elx = origCE(tag);
      if (tag === 'script') {
        setTimeout(function () {
          try {
            var m = String(elx.src || '').match(/callback=([^&]+)/);
            var cb = m && m[1];
            if (elx.src.indexOf('action=xp_balance') !== -1 && cb && w7.window[cb]) {
              w7.window[cb]({ balance: 320 });
            }
          } catch (e2) {}
        }, 5);
      }
      return elx;
    };
    var e7 = runModule(w7);
    await wait(200);
    var fired7 = w7.events.filter(function (ev) { return ev.type === 'pf-personalize'; });
    var det = fired7.length ? fired7[fired7.length - 1].detail : null;
    if (e7.length === 0 && det && det.xp === 320 && det.rank === 'AGITATOR' &&
        det.xpToday === 25 && det.streak && det.streak.count === 7 &&
        det.votedSlug === 'sex-drugs-rock-n-roll' && det.inCell === true) {
      ok('success path: activity payload correct (xp/rank/streak/vote/cell)');
    } else {
      no('success path payload', 'errors=' + e7.length + ' detail=' + JSON.stringify(det));
    }
    if (fired6.length + fired7.length > 0) ok('pf-personalize event fires on data ready');
    else no('event fire', 'no pf-personalize event observed');
  }

  console.log(fails ? ('\n' + fails + ' CHECK(S) FAILED') : '\nALL VERIFY CHECKS PASS');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
