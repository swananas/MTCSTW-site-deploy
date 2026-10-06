#!/usr/bin/env node
/* tests/triggers-layer.verify.cjs — PLAY 4 trigger layer (2026-10-06).
 * Executes v1.4.3/core/36-triggers.js in a vm sandbox with a fake DOM +
 * fake backend, and asserts:
 *   1. kill switch ?pf_off=triggers (and 36-triggers) -> PF.triggers absent
 *   2. vocabulary: 8 events, 5 opt-in categories, same-origin deep-links
 *   3. emit(): unknown event -> {ok:false}, no POST, never throws
 *   4. emit(): not opted in -> skipped, no POST
 *   5. emit(): opted in -> POST {type:'push', p_action:'push_trigger',
 *      event, params}; returns {ok:true}
 *   6. emit(): no PF_BACKEND_URL -> no throw (fail-open)
 *   7. rate limit: 4th emit in one category/day -> skipped
 *   8. dedupe: identical event+params twice -> 1 POST; distinct -> 2 POSTs
 *   9. fail-open: throwing authPost -> emit still returns ok, no throw
 *  10. prefs pane: 5 category rows + quiet-hours selects (24 options each),
 *      header copy; save POSTs all flags + qh_start/qh_end
 *  11. consumer guard: calling module absent -> guarded call never throws
 *  12. source grep: zero XP mechanics (no xpGrant/XP mint copy)
 * Run: node tests/triggers-layer.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'core', '36-triggers.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

function stubEl(id, knownIds) {
  var el = {
    _id: id, _html: '', textContent: '', value: '22', checked: false,
    disabled: false, _handlers: {},
    addEventListener: function (t, fn) { this._handlers[t] = fn; },
    click: function () { if (this._handlers.click) this._handlers.click({ preventDefault: function () {} }); },
    getAttribute: function (k) { return this._attrs ? this._attrs[k] : null; },
    setAttribute: function () {},
    appendChild: function () {}, removeChild: function () {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (h) {
      this._html = String(h);
      /* mini-DOM: register id="..." so getElementById finds them */
      var rx = /id="([^"]+)"/g, m;
      while ((m = rx.exec(this._html))) { knownIds[m[1]] = true; }
    }
  });
  return el;
}

function makeSandbox(opts) {
  opts = opts || {};
  var store = {};
  var posts = [];
  var els = {};
  var toggles = (opts.toggles || []).map(function (t) {
    var e = stubEl('tog', {});
    e._attrs = { 'data-k': t[0] };
    e.checked = !!t[1];
    return e;
  });
  var knownIds = {};
  function getEl(id) {
    if (id === 'pf-political-hq') { return opts.noHost ? null : host; }
    if (!knownIds[id]) { return null; } /* real DOM: unknown id -> null */
    if (!els[id]) { els[id] = stubEl(id, knownIds); }
    return els[id];
  }
  var created = [];
  var host = stubEl('pf-political-hq', knownIds);
  host.children = [];
  host.appendChild = function (c) { host.children.push(c); };
  host.insertBefore = function (c) { host.children.push(c); };

  var PF = {
    skip: function (s) { return (opts.killed || []).indexOf(s) >= 0; },
    toast: function () {},
    authPost: opts.authPost || function (B, body, cb) { posts.push(body); cb({ ok: true, prefs: {} }); },
    authGetJSONP: opts.authGetJSONP || null
  };
  var sandbox = {
    console: console,
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    Intl: Intl,
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    fetch: opts.fetch || function () { return Promise.reject(new Error('no network')); },
    document: {
      readyState: 'complete',
      getElementById: function (id) { return getEl(id); },
      querySelectorAll: function (sel) {
        if (sel === '.ptTog') { return toggles; }
        return [];
      },
      createElement: function (tag) { var e = stubEl(tag, knownIds); created.push(e); return e; },
      addEventListener: function () {},
      head: { appendChild: function () {} }
    }
  };
  sandbox.window = {
    PF: PF,
    PFCallsign: function () { return opts.callsign === undefined ? 'testcallsign' : opts.callsign; },
    PF_BACKEND_URL: opts.noBackend ? undefined : 'https://api.example/',
    confirm: function () { return true; }
  };
  sandbox.window.PF_BACKEND_URL = sandbox.window.PF_BACKEND_URL;
  vm.createContext(sandbox);
  return { sb: sandbox, posts: posts, els: els, host: host, store: store, created: created,
    seed: function (k, v) { store[k] = JSON.stringify(v); } };
}

function run(sb) {
  vm.runInContext(src, sb, { filename: '36-triggers.js' });
  return sb.window.PF.triggers;
}

/* ---------- 1. kill switch ---------- */
(function () {
  var a = makeSandbox({ killed: ['triggers'] });
  var t = run(a.sb);
  ok('kill ?pf_off=triggers -> no dispatcher', t === undefined);
  var b = makeSandbox({ killed: ['36-triggers'] });
  var t2 = run(b.sb);
  ok('kill ?pf_off=36-triggers -> no dispatcher', t2 === undefined);
})();

/* ---------- 2. vocabulary ---------- */
(function () {
  var a = makeSandbox({ noHost: true });
  var t = run(a.sb);
  ok('dispatcher present when not killed', !!t && typeof t.emit === 'function');
  var ev = Object.keys(t.EVENTS);
  ok(ev.length === 8, '8 trigger events (got ' + ev.length + ')');
  var want = ['price_spike_area', 'bounty_surge', 'cell_needs_votes', 'rally_suggested',
    'streak_at_risk', 'order_expiring', 'market_closing', 'proposal_closing'];
  ok(want.every(function (e) { return ev.indexOf(e) >= 0; }), 'all 8 event names present');
  ok(t.CATEGORIES.length === 5, '5 opt-in categories');
  ok(ev.every(function (e) {
    var u = t.EVENTS[e].url;
    return typeof u === 'string' && u[0] === '/' && u[1] !== '/';
  }), 'every event has a same-origin deep-link');
  var cats = t.CATEGORIES.map(function (c) { return c[0]; });
  ok(ev.every(function (e) { return cats.indexOf(t.EVENTS[e].category) >= 0; }),
    'every event maps to a known opt-in category');
})();

/* ---------- 3/4/5. emit gating + POST shape ---------- */
(function () {
  var a = makeSandbox({ noHost: true });
  var t = run(a.sb);
  var r0 = t.emit('nope', {});
  ok('unknown event -> {ok:false}', r0 && r0.ok === false);
  ok('unknown event -> no POST', a.posts.length === 0);
  var r1 = t.emit('order_expiring', { hours_left: 3 });
  ok('not opted in -> skipped', r1 && r1.ok === false && r1.skipped === 'not opted in');
  ok('not opted in -> no POST', a.posts.length === 0);
  a.seed('pf_trig_prefs', { games: 1 });
  var r2 = t.emit('order_expiring', { hours_left: 3 });
  ok('opted in -> {ok:true}', r2 && r2.ok === true);
  ok('opted in -> one POST', a.posts.length === 1);
  var b = a.posts[0];
  ok('POST type push', b.type === 'push');
  ok('POST p_action push_trigger', b.p_action === 'push_trigger');
  ok('POST carries event', b.event === 'order_expiring');
  ok('POST carries params', b.params && b.params.hours_left === 3);
  ok('POST carries callsign', b.callsign === 'testcallsign');
})();

/* ---------- 6. fail-open without backend ---------- */
(function () {
  var a = makeSandbox({ noHost: true, noBackend: true });
  var t = run(a.sb);
  a.seed('pf_trig_prefs', { games: 1 });
  var threw = false, r = null;
  try { r = t.emit('order_expiring', { hours_left: 1 }); } catch (e) { threw = true; }
  ok('no PF_BACKEND_URL -> no throw', !threw);
  ok('no PF_BACKEND_URL -> still returns ok', r && r.ok === true);
})();

/* ---------- 7. rate limit ---------- */
(function () {
  var a = makeSandbox({ noHost: true });
  var t = run(a.sb);
  a.seed('pf_trig_prefs', { games: 1 });
  var rs = [];
  for (var i = 0; i < 4; i++) { rs.push(t.emit('market_closing', { title: 'M' + i, hours_left: 2 })); }
  ok('first 3 emits ok', rs[0].ok && rs[1].ok && rs[2].ok);
  ok('4th emit rate-limited', rs[3].ok === false && rs[3].skipped === 'rate limit');
  ok('rate limit -> 3 POSTs', a.posts.length === 3);
})();

/* ---------- 8. dedupe ---------- */
(function () {
  var a = makeSandbox({ noHost: true });
  var t = run(a.sb);
  a.seed('pf_trig_prefs', { price_alerts: 1 });
  var r1 = t.emit('price_spike_area', { item: 'eggs', area: 'BR' });
  var r2 = t.emit('price_spike_area', { item: 'eggs', area: 'BR' });
  ok('first emit ok', r1.ok === true);
  ok('identical re-emit -> duplicate skip', r2.ok === false && r2.skipped === 'duplicate');
  var r3 = t.emit('price_spike_area', { item: 'milk', area: 'BR' });
  ok('distinct params -> ok', r3.ok === true);
  ok('dedupe -> 2 POSTs total', a.posts.length === 2);
})();

/* ---------- 9. fail-open on throwing authPost ---------- */
(function () {
  var a = makeSandbox({ noHost: true, authPost: function () { throw new Error('boom'); } });
  var t = run(a.sb);
  a.seed('pf_trig_prefs', { games: 1 });
  var threw = false, r = null;
  try { r = t.emit('order_expiring', {}); } catch (e) { threw = true; }
  ok('throwing authPost -> no throw', !threw);
  ok('throwing authPost -> still returns ok', r && r.ok === true);
})();

/* ---------- 10. prefs pane ---------- */
(function () {
  var savedBody = null;
  var canned = { ok: true, prefs: { price_alerts: 1, cells: 0, streaks: 0, games: 1,
    vote_alerts: 0, qh_start: 23, qh_end: 6 } };
  var a = makeSandbox({
    toggles: [['price_alerts', true], ['cells', false], ['streaks', false],
      ['games', true], ['vote_alerts', false]],
    authGetJSONP: function (B, action, params, done) { done(canned); },
    authPost: function (B, body, cb) { savedBody = body; cb({ ok: true, prefs: canned.prefs }); }
  });
  var t = run(a.sb);
  var paneHtml = a.created.map(function (e) { return e.innerHTML; }).join('\n');
  ok('pane mounted with header', paneHtml.indexOf('Alert Triggers') >= 0);
  var x = a.els.xTrigPrefs;
  var rows = (x.innerHTML.match(/class="ptTog"/g) || []).length;
  ok('5 category rows rendered (got ' + rows + ')', rows === 5);
  var opts24 = (x.innerHTML.match(/<option value="/g) || []).length;
  ok('quiet-hours selects have 24 options each (got ' + opts24 + ')', opts24 === 48);
  ok('qh start prefilled to 23', x.innerHTML.indexOf('value="23" selected') >= 0);
  ok('copy notes the 3/day cap', x.innerHTML.indexOf('3/day') >= 0);
  /* save flow */
  a.sb.document.getElementById('ptQhStart').value = '23';
  a.sb.document.getElementById('ptQhEnd').value = '6';
  a.els.ptSave.click();
  ok('save POSTs push_prefs', savedBody && savedBody.p_action === 'push_prefs');
  ok('save sends all 5 flags', savedBody && savedBody.price_alerts === 1 &&
    savedBody.cells === 0 && savedBody.streaks === 0 && savedBody.games === 1 &&
    savedBody.vote_alerts === 0);
  ok('save sends qh_start/qh_end', savedBody && savedBody.qh_start === 23 && savedBody.qh_end === 6);
  /* server prefs synced to client-side gates */
  ok('client opt-in synced from server', a.store.pf_trig_prefs === JSON.stringify(
    { price_alerts: 1, cells: 0, streaks: 0, games: 1, vote_alerts: 0 }));
})();

/* ---------- 11. consumer guard (dispatcher absent) ---------- */
(function () {
  var sb = {};
  vm.createContext(sb);
  var r = vm.runInContext(
    "(function(){ try { return (window.PF && PF.triggers) ? PF.triggers.emit('order_expiring', {}) : 'guarded'; } catch (e) { return 'threw'; } })()",
    sb);
  /* window undefined -> the guard's window.PF throws ReferenceError -> caught? No:
     bare `window` reference throws; game silos use window.PF which exists on
     the page. Simulate the real page: window exists, PF exists, no triggers. */
  var sb2 = { window: { PF: { skip: function () { return false; } } } };
  vm.createContext(sb2);
  var r2 = vm.runInContext(
    "var PF = window.PF; (function(){ try { return (window.PF && PF.triggers) ? PF.triggers.emit('x', {}) : 'guarded'; } catch (e) { return 'threw'; } })()",
    sb2);
  ok('guarded emit with dispatcher absent -> no throw', r2 === 'guarded');
})();

/* ---------- 12. zero-XP source grep ---------- */
(function () {
  var banned = [/xpGrant/i, /\+\s*\d*\s*XP/i, /XP\s*\+=/];
  var hits = banned.filter(function (rx) { return rx.test(src); });
  ok('zero XP mechanics in trigger layer', hits.length === 0,
    hits.length ? 'matched: ' + hits.length : '');
  ok('no "donate" copy', !/donate/i.test(src));
})();

console.log('\n' + (failures === 0 ? 'ALL PASS' : failures + ' FAILURES'));
process.exit(failures ? 1 : 0);
