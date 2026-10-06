#!/usr/bin/env node
/* scripts/verify-wins-echo.js | PLAY 10 — WINS THAT ECHO (2026-10-06).
   Static + sandbox verification for the win-event system:
     - event emission on each win type
     - hub strip render (hub hero slot)
     - mute toggle
     - kill switch (?pf_off=wins)
     - no-XP-minted assertion
     - fail-open on missing data
   Run: node scripts/verify-wins-echo.js  (exit 1 on any failure) */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V143 = path.join(ROOT, 'v1.4.3');
var passed = 0, failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ================= STATIC ================= */
console.log('static checks');
var winsSrc = read(path.join(V143, 'core/33-wins.js'));
var hubSrc = read(path.join(V143, 'core/32-hubhome.js'));
var cwSrc = read(path.join(V143, 'games/cell-war.js'));
var cwfSrc = read(path.join(V143, 'games/cell-war-front.js'));
var msSrc = read(path.join(V143, 'core/macro-share.js'));
var hqSrc = read(path.join(V143, 'games/cell-hq.js'));
var coreBundle = read(path.join(V143, 'core/bundle-core.js'));
var coreSlrBundle = read(path.join(V143, 'core/bundle-core-slr.js'));
var cellsBundle = read(path.join(V143, 'games/bundle-cells.js'));

ok('bus defines PF.wins with full API',
  /PF\.wins\s*=\s*\{[^}]*emit[^}]*recent[^}]*muted[^}]*setMuted[^}]*renderHubStrip[^}]*injectCellFeed/.test(winsSrc));
ok('kill switch PF.skip(wins) + ?pf_off=wins documented',
  winsSrc.indexOf("PF.skip('wins')") !== -1 && winsSrc.indexOf('?pf_off=wins') !== -1);
ok('hub hero has WINS slot', hubSrc.indexOf('data-ph-wins') !== -1);
ok('hub hero fill() renders the strip', hubSrc.indexOf('PF.wins.renderHubStrip') !== -1);
ok('cell-war victory detector emits cellwar_win', cwSrc.indexOf("PF.wins.emit('cellwar_win'") !== -1);
ok('cell-war-front victory detector emits cellwar_win', cwfSrc.indexOf("PF.wins.emit('cellwar_win'") !== -1);
ok('macro-share poster_share success emits poster_deployed', msSrc.indexOf("PF.wins.emit('poster_deployed'") !== -1);
ok('bus listens for pf-share-image (share pipeline)', winsSrc.indexOf("pf-share-image") !== -1);
ok('bus listens for pf-win escape-hatch events', winsSrc.indexOf("'pf-win'") !== -1);
ok('cell feed injection hook in cell-hq.js', hqSrc.indexOf('PF.wins.injectCellFeed') !== -1);
ok('mute toggle is device-local', winsSrc.indexOf('pf_wins_muted') !== -1 && winsSrc.indexOf('data-pw-mute') !== -1);
ok('33-wins.js bundled (bundle-core)', coreBundle.indexOf('pf-wins-css') !== -1);
ok('33-wins.js bundled (bundle-core-slr)', coreSlrBundle.indexOf('pf-wins-css') !== -1);
ok('detectors bundled (bundle-cells)', cellsBundle.indexOf('cellwar_win') !== -1);

/* NO-XP-MINTED assertion: the bus and every detector hook must never grant XP. */
function noXpMinted(src, label) {
  var bad = /xpGrant\s*\(|INSERT\s+INTO|UPDATE\s+\w+\s+SET|postAction\s*\(/.test(src);
  ok('no XP minted: ' + label, !bad);
}
noXpMinted(winsSrc, '33-wins.js bus');
/* detector hooks live inside larger modules — assert the hook neighborhoods only */
function hookNeighborhood(src, marker) {
  var i = src.indexOf(marker);
  return i === -1 ? '' : src.slice(Math.max(0, i - 200), i + 1200);
}
noXpMinted(hookNeighborhood(cwSrc, "PF.wins.emit('cellwar_win'"), 'cell-war.js hook');
noXpMinted(hookNeighborhood(cwfSrc, "PF.wins.emit('cellwar_win'"), 'cell-war-front.js hook');
noXpMinted(hookNeighborhood(msSrc, "PF.wins.emit('poster_deployed'"), 'macro-share.js hook');
ok('bus header documents locked-XP-table reference',
  winsSrc.indexOf('xp-locked-table-retuned-20261006.md') !== -1);

/* ================= SANDBOX ================= */
console.log('sandbox tests');

function makeEnv(opts) {
  opts = opts || {};
  var listeners = {};
  var store = {};
  var lsBroken = !!opts.lsBroken;
  function el() {
    return {
      style: {}, children: [], _html: '',
      set innerHTML(v) { this._html = String(v); },
      get innerHTML() { return this._html; },
      textContent: '',
      id: '', className: '',
      setAttribute: function () {}, appendChild: function (c) { this.children.push(c); return c; },
      insertBefore: function (c) { this.children.unshift(c); return c; },
      removeChild: function () {}, querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {}, firstChild: null
    };
  }
  var doc = {
    readyState: 'complete',
    head: el(), body: el(),
    createElement: function () { return el(); },
    getElementById: function () { return opts.existingCellFeed ? el() : null; },
    querySelectorAll: function () { return []; },
    addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent: function (ev) {
      (listeners[ev.type] || []).forEach(function (fn) { try { fn(ev); } catch (e) {} });
      return true;
    },
    _listeners: listeners
  };
  var localStorage = {
    getItem: function (k) { if (lsBroken) throw new Error('denied'); return (k in store) ? store[k] : null; },
    setItem: function (k, v) { if (lsBroken) throw new Error('denied'); store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    _store: store
  };
  function CustomEvent(type, init) { this.type = type; this.detail = (init && init.detail) || {}; }
  var win = {
    PF: {
      skip: function (s) { return opts.killed && s === 'wins'; },
      toast: function () {}
    },
    PF_BACKEND_URL: '',
    location: { search: opts.killed ? '?pf_off=wins' : '', href: 'https://mtcstw.com/' },
    document: doc, localStorage: localStorage, CustomEvent: CustomEvent,
    navigator: {}
  };
  win.window = win;
  return { win: win, doc: doc, localStorage: localStorage, CustomEvent: CustomEvent, listeners: listeners };
}

function loadWins(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(winsSrc, ctx, { filename: '33-wins.js' });
  return env.win.PF.wins;
}

/* 1: emission on each win type */
{
  var env = makeEnv();
  var W = loadWins(env);
  ok('bus loads, PF.wins defined', !!W);
  var types = ['cellwar_win', 'bounty_filled', 'poster_shared', 'poster_deployed'];
  var allOk = true;
  types.forEach(function (t) { if (!W.emit(t, 'T ' + t, 'detail ' + t)) allOk = false; });
  ok('emit() true for all 4 win types', allOk);
  var r = W.recent(10);
  ok('recent() returns all 4 newest-first', r.length === 4 && r[0].type === 'poster_deployed');
  ok('events carry {type,title,detail,ts}, recognition only',
    r.every(function (w) { return w.type && w.title && typeof w.ts === 'number' && !('xp' in w); }));
}
/* 2: invalid type dropped */
{
  var env2 = makeEnv();
  var W2 = loadWins(env2);
  ok('emit() rejects unknown type', W2.emit('bogus_win', 'X', 'Y') === false);
  ok('rejected type not stored', W2.recent(10).length === 0);
}
/* 3: dedupe window */
{
  var env3 = makeEnv();
  var W3 = loadWins(env3);
  W3.emit('cellwar_win', 'CROWN', 'd1');
  var second = W3.emit('cellwar_win', 'CROWN', 'd2');
  ok('duplicate title+type within 24h deduped', second === false && W3.recent(10).length === 1);
  var third = W3.emit('cellwar_win', 'CROWN', 'd3', { dedupe: 'cellwar:week-99' });
  ok('custom dedupe key allows distinct weeks', third === true && W3.recent(10).length === 2);
}
/* 4: mute toggle */
{
  var env4 = makeEnv();
  var W4 = loadWins(env4);
  W4.emit('poster_shared', 'SHARED', 'd');
  var slot = env4.doc.createElement('div');
  W4.renderHubStrip(slot);
  ok('strip renders when unmuted', slot.innerHTML.indexOf('WINS THAT ECHO') !== -1);
  ok('strip shows mute button', slot.innerHTML.indexOf('data-pw-mute') !== -1);
  W4.setMuted(true);
  ok('muted() true after setMuted(true)', W4.muted() === true);
  var slot2 = env4.doc.createElement('div');
  W4.renderHubStrip(slot2);
  ok('strip hidden when muted', slot2.style.display === 'none');
  W4.setMuted(false);
  ok('unmute restores', W4.muted() === false);
}
/* 5: kill switch */
{
  var env5 = makeEnv({ killed: true });
  var W5 = loadWins(env5);
  ok('?pf_off=wins kills the module (PF.wins undefined)', W5 === undefined);
}
/* 6: fail-open on broken localStorage */
{
  var env6 = makeEnv({ lsBroken: true });
  var W6 = loadWins(env6);
  var eok = W6.emit('bounty_filled', 'FILLED', 'd');
  ok('emit survives localStorage failure (memory fallback)', eok === true);
  ok('recent() works without localStorage', W6.recent(5).length === 1);
  W6.setMuted(true);
  ok('mute degrades gracefully without localStorage', true);
}
/* 7: pf-share-image detector */
{
  var env7 = makeEnv();
  var W7 = loadWins(env7);
  env7.doc.dispatchEvent(new env7.CustomEvent('pf-share-image',
    { detail: { day: '2026-10-06', game: 'daily-orders', kind: 'share' } }));
  var r7 = W7.recent(5);
  ok('pf-share-image (kind=share) emits poster_shared',
    r7.length === 1 && r7[0].type === 'poster_shared');
  env7.doc.dispatchEvent(new env7.CustomEvent('pf-share-image',
    { detail: { day: '2026-10-06', game: 'daily-orders', kind: 'save' } }));
  ok('pf-share-image (kind=save) ignored', W7.recent(5).length === 1);
}
/* 8: pf-win escape hatch */
{
  var env8 = makeEnv();
  var W8 = loadWins(env8);
  env8.doc.dispatchEvent(new env8.CustomEvent('pf-win',
    { detail: { type: 'bounty_filled', title: 'FILLED', detail: 'd' } }));
  env8.doc.dispatchEvent(new env8.CustomEvent('pf-win',
    { detail: { type: 'not_a_win', title: 'X', detail: 'd' } }));
  var r8 = W8.recent(5);
  ok('pf-win carries valid types, drops invalid ones',
    r8.length === 1 && r8[0].type === 'bounty_filled');
}
/* 9: empty feed -> slot hidden (never an empty box) */
{
  var env9 = makeEnv();
  var W9 = loadWins(env9);
  var slot9 = env9.doc.createElement('div');
  W9.renderHubStrip(slot9);
  ok('empty feed hides the slot', slot9.style.display === 'none' && slot9.innerHTML === '');
}
/* 10: XSS escaping */
{
  var env10 = makeEnv();
  var W10 = loadWins(env10);
  W10.emit('cellwar_win', '<script>alert(1)</script>', '<img src=x onerror=alert(2)>');
  var slot10 = env10.doc.createElement('div');
  W10.renderHubStrip(slot10);
  ok('titles/details are HTML-escaped',
    slot10.innerHTML.indexOf('<script>') === -1 && slot10.innerHTML.indexOf('&lt;script&gt;') !== -1);
}
/* 11: injectCellFeed idempotent */
{
  var env11 = makeEnv();
  var W11 = loadWins(env11);
  W11.emit('cellwar_win', 'CROWN', 'd');
  var mount = env11.doc.createElement('div');
  var origCreate = env11.doc.createElement.bind(env11.doc);
  var stripDiv = null;
  /* getElementById('pf-wins-cellfeed'): null until the strip div exists */
  env11.doc.getElementById = function (id) {
    if (id === 'pf-wins-cellfeed') return stripDiv;
    return null;
  };
  var origAppend = mount.appendChild.bind(mount);
  mount.appendChild = function (c) { if (c.id === 'pf-wins-cellfeed') stripDiv = c; return origAppend(c); };
  var origInsert = mount.insertBefore.bind(mount);
  mount.insertBefore = function (c) { if (c.id === 'pf-wins-cellfeed') stripDiv = c; return origInsert(c); };
  W11.injectCellFeed(mount);
  W11.injectCellFeed(mount);
  W11.injectCellFeed(mount);
  ok('injectCellFeed is idempotent (one strip per mount)', mount.children.length === 1);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
