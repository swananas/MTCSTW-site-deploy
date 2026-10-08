#!/usr/bin/env node
/* tests/election-live.verify.js — verification harness for the election-night
 * live mode layer in games/races.js + the phq-racecall painter in
 * core/share-image-phq.js (be/race-calls-live + fe/election-live-mode,
 * 2026-10-05).
 *
 * Part A (races.js): fake DOM + intercepted JSONP + fake Date (phase gating).
 *   1. kill-switch (?pf_off=election-live): no LIVE header, no CALLED badges,
 *      no SHARE THE CALL, no watch buttons, no too-early notes
 *   2. countdown phase: N-days header, toss-ups get WATCH THIS RACE, safe
 *      races don't, existing calls still render
 *   3. live phase: LIVE header, called race -> CALLED badge + source + CT
 *      time + SHARE THE CALL; uncalled -> TOO EARLY / TOO CLOSE TO CALL
 *   4. results phase: CALLED persists; no too-early notes
 *   5. SHARE THE CALL click -> PF.PHQShare.share('phq-racecall', data) with
 *      winner/source/loser from the backend call record
 *   6. watch toggle -> localStorage pf_race_watch_v1 updated, re-render
 *      shows WATCHING THIS RACE + header watch count
 *   7. esc(): hostile winner name is escaped in the CALLED block
 *   8. static: module mints zero XP (no xpGrant), writes nothing (JSONP
 *      reads only), kill switch documented
 * Part B (painter): vm + canvas-2d stub.
 *   9. phq-racecall paints: winner stamp, source + CT honesty line,
 *      callsign stamp, JOIN THE FIGHT. + deep link
 *  10. no-callsign -> CLAIM YOUR CALLSIGN AT MTCSTW.COM funnel
 *  11. missing optional fields degrade (no throw, '—' fallbacks)
 *  12. registered in IDS/TITLES/PAINT + PFShare.setPoster; share routes
 *      through PFShare.shareImage
 * Run: node tests/election-live.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var RACES_SRC = fs.readFileSync(path.join(ROOT, 'v1.4.3', 'games', 'races.js'), 'utf8');
var PHQ_SRC = fs.readFileSync(path.join(ROOT, 'v1.4.3', 'core', 'share-image-phq.js'), 'utf8');

var failures = 0, passes = 0;
function ok(name) { passes++; console.log('PASS: ' + name); }
function no(name, why) { failures++; console.error('FAIL: ' + name + (why ? ' — ' + why : '')); }

/* ================= Part A harness ================= */
function makeEl(id) {
  var el = {
    id: id || '', _html: '', children: [], parentNode: null,
    attrs: {}, value: '', _onclick: null, _onchange: null, _qcache: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; this.onappend(c); },
    removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; },
    insertAdjacentHTML: function (pos, html) { this.innerHTML = this._html + html; },
    onappend: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function (sel) {
      if (this._qcache[sel]) return this._qcache[sel];
      var m = sel.match(/^\[data-([a-z-]+)\]$/);
      var out = [];
      if (m) {
        var attr = m[1], re = new RegExp('<([a-zA-Z]+)[^>]*data-' + attr + '="([^"]*)"[^>]*>', 'g'), mm;
        while ((mm = re.exec(this._html)) !== null) {
          var btn = makeEl(); btn.setAttribute('data-' + attr, mm[2]); out.push(btn);
        }
      }
      this._qcache[sel] = out;
      return out;
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._html; },
    set: function (v) { el._html = v; el._qcache = {}; }
  });
  Object.defineProperty(el, 'onclick', { get: function () { return el._onclick; }, set: function (v) { el._onclick = v; } });
  Object.defineProperty(el, 'onchange', { get: function () { return el._onchange; }, set: function (v) { el._onchange = v; } });
  return el;
}

/* Fake Date pinned at fixedMs; with-args construction delegates to real Date. */
function fakeDateAt(ms) {
  var Real = Date;
  function FD() {
    if (arguments.length === 0) return new Real(ms);
    var a = Array.prototype.slice.call(arguments);
    return new (Function.prototype.bind.apply(Real, [null].concat(a)))();
  }
  FD.now = function () { return ms; };
  FD.UTC = Real.UTC; FD.parse = Real.parse;
  FD.prototype = Real.prototype;
  return FD;
}

function RACES_FIX(hostile) {
  return {
    ok: true, last_updated: '2026-11-03', stale: false,
    races: [
      { id: 'nc-senate', state: 'NC', chamber: 'Senate', office: 'U.S. Senate',
        candidates: [{ name: hostile || 'Roy Cooper', party: 'D' }, { name: 'Michael Whatley', party: 'R' }],
        rating: 'Leans D (Cooper +9)', source: 'RCP', source_date: '2026-11-01',
        called_winner: hostile || 'Roy Cooper', called_at: Date.UTC(2026, 10, 4, 2, 30, 0), called_source: 'AP' },
      { id: 'tx-senate', state: 'TX', chamber: 'Senate', office: 'U.S. Senate',
        candidates: [{ name: 'James Talarico', party: 'D' }, { name: 'Ken Paxton', party: 'R' }],
        rating: 'Toss-up (Talarico +2.7)', source: 'RCP', source_date: '2026-11-01' },
      { id: 'me-senate', state: 'ME', chamber: 'Senate', office: 'U.S. Senate',
        candidates: [{ name: 'Troy Jackson', party: 'D' }, { name: 'Susan Collins', party: 'R' }],
        rating: 'Toss-up (even)', source: 'RCP', source_date: '2026-11-01' },
      { id: 'wy-senate', state: 'WY', chamber: 'Senate', office: 'U.S. Senate',
        candidates: [{ name: 'Safe Sam', party: 'R' }],
        rating: 'Safe R', source: 'RCP', source_date: '2026-11-01' }
    ]
  };
}

var OCT20 = Date.UTC(2026, 9, 20, 12, 0, 0);   /* countdown: Chicago Oct 20 */
var NOV3 = Date.UTC(2026, 10, 3, 20, 0, 0);    /* live: Chicago Nov 3, 2pm CST */
var NOV6 = Date.UTC(2026, 10, 6, 15, 0, 0);   /* results: Chicago Nov 6 */

function runRaces(opts) {
  opts = opts || {};
  var FD = fakeDateAt(opts.nowMs || OCT20);
  var store = {};
  if (opts.watch) store['pf_race_watch_v1'] = JSON.stringify(opts.watch);
  var shareCalls = [];
  var skipSet = {};
  try {
    var m = (opts.search || '').match(/[?&]pf_off=([^&]+)/);
    if (m) m[1].split(',').forEach(function (s) { skipSet[decodeURIComponent(s)] = 1; });
  } catch (e) {}
  var head = makeEl('head'), els = {};
  function getEl(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; }
  var holder = makeEl('holder');
  var win = {
    PF_BACKEND_URL: 'https://backend.test/exec',
    location: { href: 'https://mtcstw.com/political-hq', search: opts.search || '' },
    PF: {
      skip: function (s) { return !!skipSet[s]; },
      holder: function () { return holder; },
      toast: function () {},
      hidden: function () { return false; },
      PHQShare: { share: function (id, data, o) { shareCalls.push({ id: id, data: data, opts: o }); return true; } }
    },
    document: {
      head: head, body: makeEl('body'), readyState: 'complete',
      createElement: function () { return makeEl(); },
      getElementById: function (id) { return getEl(id); }
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    Intl: Intl, Date: FD, Math: Math, JSON: JSON, console: console
  };
  var fixture = opts.fixture || RACES_FIX();
  head.onappend = function (s) {
    try {
      var url = String(s.src || '');
      var cm = url.match(/[?&]callback=([^&]+)/);
      var fn = cm ? cm[1] : '';
      if (fn && win[fn]) { var cb = win[fn]; try { delete win[fn]; } catch (e2) {} cb(fixture); }
    } catch (e) {}
  };
  var sandbox = { window: win };
  vm.createContext(sandbox);
  var prelude = 'var window=this.window;var document=window.document;var localStorage=window.localStorage;'
    + 'var location=window.location;var Intl=window.Intl;var Date=window.Date;'
    + 'var setTimeout=function(){return 0;};var clearTimeout=function(){};var setInterval=function(){return 0;};';
  Object.keys(win).forEach(function (k) { sandbox[k] = win[k]; });
  sandbox.window = win;
  vm.runInContext(prelude + '\n' + RACES_SRC, sandbox, { filename: 'races.js' });
  var tmpl = holder.innerHTML;
  var sm = tmpl.match(/<script>([\s\S]*?)<\/script>/);
  if (sm) vm.runInContext(prelude + '\n' + sm[1], sandbox, { filename: 'races-inner.js' });
  function html() { return (els['xRaces'] && els['xRaces'].innerHTML) || ''; }
  return { html: html, els: els, shareCalls: shareCalls, store: store };
}
function has(h, s) { return h.indexOf(s) !== -1; }
function clickFirst(r, sel, val) {
  var attr = sel.slice(1, -1);
  var btns = r.els['xRaces'].querySelectorAll(sel);
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute(attr) === val) { btns[i].onclick(); return true; }
  }
  return false;
}

/* ---------- 1. kill switch ---------- */
(function () {
  var r = runRaces({ nowMs: NOV3, search: '?pf_off=election-live' });
  var h = r.html();
  if (!has(h, 'LIVE') && !has(h, 'rc-called') && !has(h, 'SHARE THE CALL') &&
      !has(h, 'TOO EARLY') && !has(h, 'data-rc-remind'))
    ok('1. kill switch: ?pf_off=election-live suppresses all live-mode UI');
  else no('1. kill switch', 'live-mode UI leaked through the kill switch');
})();

/* ---------- 2. countdown phase ---------- */
(function () {
  var r = runRaces({ nowMs: OCT20 });
  var h = r.html();
  if (has(h, '14 DAYS TO ELECTION DAY')) ok('2a. countdown header shows days to Nov 3');
  else no('2a. countdown header', h.slice(0, 200));
  var watchBtns = r.els['xRaces'].querySelectorAll('[data-rc-remind]');
  var ids = watchBtns.map(function (b) { return b.getAttribute('data-rc-remind'); });
  if (ids.indexOf('tx-senate') !== -1 && ids.indexOf('me-senate') !== -1 && ids.indexOf('wy-senate') === -1)
    ok('2b. toss-ups get WATCH THIS RACE; safe race does not');
  else no('2b. watch buttons', 'got: ' + JSON.stringify(ids));
  if (has(h, 'rc-called') && has(h, 'SHARE THE CALL')) ok('2c. existing call still renders in countdown');
  else no('2c. existing call in countdown');
  if (!has(h, 'TOO EARLY')) ok('2d. no too-early notes before election night');
  else no('2d. too-early leaked into countdown');
})();

/* ---------- 3. live phase ---------- */
(function () {
  var r = runRaces({ nowMs: NOV3 });
  var h = r.html();
  if (has(h, 'LIVE')) ok('3a. live header on Nov 3');
  else no('3a. live header');
  if (has(h, 'rc-called') && has(h, 'via AP') && has(h, 'CT')) ok('3b. CALLED badge + source + CT time');
  else no('3b. called badge', h.slice(Math.max(0, h.indexOf('rc-called') - 40), h.indexOf('rc-called') + 160));
  if (has(h, 'SHARE THE CALL')) ok('3c. SHARE THE CALL button on called race');
  else no('3c. share button');
  if (has(h, 'TOO EARLY / TOO CLOSE TO CALL')) ok('3d. uncalled races show too-early state');
  else no('3d. too-early state');
})();

/* ---------- 4. results phase ---------- */
(function () {
  var r = runRaces({ nowMs: NOV6 });
  var h = r.html();
  if (has(h, 'rc-called') && has(h, 'SHARE THE CALL')) ok('4a. calls persist after the live window');
  else no('4a. calls persist');
  if (!has(h, 'TOO EARLY') && !has(h, 'rc-live')) ok('4b. no too-early notes or LIVE header post-window');
  else no('4b. post-window UI');
})();

/* ---------- 5. share click ---------- */
(function () {
  var r = runRaces({ nowMs: NOV3 });
  if (!clickFirst(r, '[data-rc-sharecall]', 'nc-senate')) { no('5. share click', 'button not found'); return; }
  var c = r.shareCalls[0];
  if (c && c.id === 'phq-racecall' && c.data.winner === 'Roy Cooper' &&
      c.data.source === 'AP' && c.data.loser === 'Michael Whatley' &&
      c.data.winnerParty === 'D' && c.opts && /CALLED/.test(c.opts.title))
    ok('5. SHARE THE CALL -> PF.PHQShare.share(phq-racecall, call-record data)');
  else no('5. share click', JSON.stringify(c && { id: c.id, data: c.data }));
})();

/* ---------- 6. watch toggle ---------- */
(function () {
  var r = runRaces({ nowMs: OCT20 });
  if (!clickFirst(r, '[data-rc-remind]', 'tx-senate')) { no('6. watch toggle', 'button not found'); return; }
  var w;
  try { w = JSON.parse(r.store['pf_race_watch_v1'] || '[]'); } catch (e) { w = []; }
  var h = r.html();
  if (w.indexOf('tx-senate') !== -1 && has(h, 'WATCHING THIS RACE') && has(h, 'WATCHING 1 RACE'))
    ok('6. watch toggle persists + re-renders header count');
  else no('6. watch toggle', 'store=' + JSON.stringify(w));
})();

/* ---------- 7. esc ---------- */
(function () {
  var hostile = '<img src=x onerror=alert(1)>';
  var r = runRaces({ nowMs: NOV3, fixture: RACES_FIX(hostile) });
  var h = r.html();
  if (h.indexOf('<img src=x') === -1 && has(h, '&lt;img'))
    ok('7. hostile winner name escaped in CALLED block');
  else no('7. esc', 'raw HTML leaked');
})();

/* ---------- 8. static: zero XP, reads only ---------- */
(function () {
  var code = RACES_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
  var bad = [];
  if (code.indexOf('xpGrant') !== -1) bad.push('xpGrant');
  if (/\bpost\s*\(/.test(code)) bad.push('post(');
  if (code.indexOf('fetch(') !== -1) bad.push('fetch(');
  if (code.indexOf('XMLHttpRequest') !== -1) bad.push('XMLHttpRequest');
  if (bad.length) no('8. zero-XP/reads-only', 'found: ' + bad.join(', '));
  else ok('8. zero XP minted; backend writes: none (JSONP reads only)');
  if (RACES_SRC.indexOf('?pf_off=election-live') !== -1) ok('8b. kill switch documented in module header');
  else no('8b. kill switch doc');
})();

/* ================= Part B: painter ================= */
function pxOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(String(font)); return m ? parseFloat(m[1]) : 10; }
function Ctx2D(rec) {
  this._rec = rec;
  this.font = '400 10px Arial,sans-serif';
  this.fillStyle = '#000000';
  this.textAlign = 'center';
  this.textBaseline = 'alphabetic';
}
Ctx2D.prototype.measureText = function (t) { return { width: String(t).length * pxOf(this.font) * 0.62 }; };
Ctx2D.prototype.fillText = function (t, x, y) {
  this._rec.push({ text: String(t), font: this.font, fillStyle: this.fillStyle, x: x, y: y });
};
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'clip', 'rect'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return { width: 0, height: 0, _pfStamped: false, _recs: [], getContext: function () { return new Ctx2D(this._recs); } };
}
function makeEnv(withCallsign) {
  var store = withCallsign === false ? {} : { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var registered = {}, shareCalls = [], saveCalls = [];
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.navigator = {};
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.document = {
    createElement: function (t) { if (String(t).toLowerCase() === 'canvas') return makeCanvas(); return {}; },
    addEventListener: function () {}
  };
  sb.PF = { skip: function () { return false; }, toast: function () {} };
  sb.PFCallsign = function () { return withCallsign === false ? '' : 'WARHAWK'; };
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(PHQ_SRC, sb, { filename: 'share-image-phq.js' });
  return { sb: sb, registered: registered, shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(textsOf(cv).join('\n')).indexOf(squish(frag)) !== -1; }

var FIX_RACECALL = {
  state: 'NC', office: 'U.S. Senate',
  winner: 'Roy Cooper', winnerParty: 'D',
  loser: 'Michael Whatley', loserParty: 'R',
  source: 'AP', calledAt: Date.UTC(2026, 10, 4, 2, 30, 0)
};

/* ---------- 9. painter renders ---------- */
(function () {
  var env = makeEnv(true);
  var PHQ = env.sb.PF && env.sb.PF.PHQShare;
  if (!PHQ) { no('9. painter', 'PF.PHQShare not exposed'); return; }
  if (PHQ.ids.indexOf('phq-racecall') === -1) { no('9. painter', 'phq-racecall not in ids'); return; }
  if (typeof env.registered['phq-racecall'] !== 'function') { no('9. painter', 'not registered via setPoster'); return; }
  var cv;
  try { cv = PHQ.paint('phq-racecall', FIX_RACECALL); } catch (e) { no('9. painter', 'threw: ' + e.message); return; }
  if (!cv) { no('9. painter', 'paint returned null'); return; }
  var checks = [
    ['winner stamp', 'ROY COOPER'],
    ['honesty source', 'CALLED BY AP'],
    ['CT time', 'CT'],
    ['deep link', 'MTCSTW.COM/POLITICAL-HQ'],
    ['CTA', 'JOIN THE FIGHT.'],
    ['callsign', 'FIGHTING AS WARHAWK']
  ];
  var bad = checks.filter(function (c) { return !hasFrag(cv, c[1]); });
  if (!bad.length && cv._pfStamped) ok('9. phq-racecall paints: winner, source+CT, callsign, CTA, deep link');
  else no('9. painter', 'missing: ' + bad.map(function (b) { return b[0]; }).join(', ') + (cv._pfStamped ? '' : ' (+_pfStamped unset)'));
})();

/* ---------- 10. no-callsign funnel ---------- */
(function () {
  var env = makeEnv(false);
  var PHQ = env.sb.PF && env.sb.PF.PHQShare;
  var cv = PHQ.paint('phq-racecall', FIX_RACECALL);
  if (cv && hasFrag(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM')) ok('10. no-callsign -> claim funnel line');
  else no('10. no-callsign funnel');
})();

/* ---------- 11. missing fields degrade ---------- */
(function () {
  var env = makeEnv(true);
  var PHQ = env.sb.PF && env.sb.PF.PHQShare;
  var cv1, cv2;
  try {
    cv1 = PHQ.paint('phq-racecall', {});
    cv2 = PHQ.paint('phq-racecall', { winner: 'Roy Cooper' });
  } catch (e) { no('11. degrade', 'threw: ' + e.message); return; }
  if (cv1 && cv2 && hasFrag(cv1, '—')) ok('11. missing fields degrade gracefully (no throw, — fallbacks)');
  else no('11. degrade');
})();

/* ---------- 12. share routing ---------- */
(function () {
  var env = makeEnv(true);
  var PHQ = env.sb.PF && env.sb.PF.PHQShare;
  PHQ.share('phq-racecall', FIX_RACECALL, { title: 'T' });
  var c = env.shareCalls[0];
  if (c && c.id === 'phq-racecall' && c.cv && c.cv._recs && c.cv._recs.length > 0)
    ok('12. share routes through PFShare.shareImage with painted canvas');
  else no('12. share routing');
})();

console.log('\nelection-live: ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
