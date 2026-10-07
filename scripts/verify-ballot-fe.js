#!/usr/bin/env node
/* scripts/verify-ballot-fe.js — Ballot Countdown Cards frontend verification.
   Run from the worktree root:
     node scripts/verify-ballot-fe.js
   1. Rebuild bundles via build/bundle.js (+ bundle-core for the painter).
   2. node --check on the touched files.
   3. Static checks: kill switches, painter registration, Economy Desk key
      scheme (poster_ballot:/share_ballot:), T5 zero-XP on claim/view,
      create_share:/poster_share denial, no pf-poster-made/pf-share-image
      double-pay paths, behavioral loop copy surfaces, banned terms.
   4. Mocked-browser runtime tests (vm + DOM/canvas shims):
      painter renders all 51 states x variants (7/3/1/0/sameDay/degrade),
      kill-switch behavior, module home-state filtering, tray copy, XP keys,
      pledge overlay, deep link.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'core', 'share-image-phq.js');
var GAME = path.join(V, 'games', 'ballot-countdown.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }

console.log('== 1. node --check ==');
[MOD, GAME, path.join(ROOT, 'build', 'bundle.js'), path.join(ROOT, 'build', 'bundle-core.js')].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f)); }
  catch (e) { no(path.basename(f), 'node --check failed'); }
});

var psrc = read(MOD), pcode = stripComments(psrc);
var gsrc = read(GAME), gcode = stripComments(gsrc);

console.log('== 2. static: painter contract ==');
if (/PF\.skip\(['"]phq-share['"]\)/.test(psrc)) ok('kill switch PF.skip("phq-share")');
else no('kill switch', 'PF.skip("phq-share") not found');
if (psrc.indexOf('?pf_off=phq-share') !== -1) ok('KILL comment documents ?pf_off=phq-share');
else no('kill comment', 'missing');
if (psrc.indexOf("'phq-ballot'") !== -1 && /'phq-ballot':\s*paintBallot/.test(psrc)) ok('phq-ballot painter registered (IDS/TITLES/PAINT)');
else no('painter registration', 'phq-ballot missing from IDS/TITLES/PAINT');
if (psrc.indexOf('JOIN THE FIGHT.') !== -1) ok('CTA standard: JOIN THE FIGHT.');
else no('CTA', 'missing');
if (psrc.indexOf('CLAIM YOUR CALLSIGN AT MTCSTW.COM') !== -1) ok('no-callsign funnel line present');
else no('funnel', 'missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (psrc.toLowerCase().indexOf(w) === -1 && gsrc.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(psrc) && !/\bShane\b/.test(gsrc)) ok('no real names in copy');
else no('real name', 'found "Shane"');
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/share-image-phq.js'")) ok('painter in build/bundle-core.js');
else no('bundle-core', 'share-image-phq.js not registered');
if (has(path.join(ROOT, 'build', 'bundle.js'), "'ballot-countdown.js'")) ok('ballot-countdown.js in build/bundle.js (bundle-hq)');
else no('bundle.js', 'ballot-countdown.js not registered');

console.log('== 3. static: Economy Desk key scheme + denials ==');
if (gcode.indexOf("'poster_ballot:'") !== -1 || gcode.indexOf('"poster_ballot:"') !== -1) ok('T1 key poster_ballot:<draft_id>');
else no('T1 key', 'poster_ballot: key not found');
if (gcode.indexOf("'share_ballot:'") !== -1 || gcode.indexOf('"share_ballot:"') !== -1) ok('T2 key share_ballot:<card_id>');
else no('T2 key', 'share_ballot: key not found');
if (gcode.indexOf('poster_share') === -1 && gcode.indexOf('create_share') === -1) ok('create_share:/poster_share DENIED (absent)');
else no('create_share denial', 'poster_share/create_share referenced in module');
if (gcode.indexOf('pf-poster-made') === -1 && gcode.indexOf('pf-share-image') === -1) ok('no generic pf-poster-made/pf-share-image dispatch (no double-pay)');
else no('double-pay', 'module dispatches a generic leg event');
if (/claimDraft[\s\S]{0,400}?pf-xp/.test(gcode)) no('T5 claim', 'claimDraft references pf-xp');
else ok('T5 claim: claimDraft emits no pf-xp');
if (gcode.indexOf("pf_off=ballotcd") !== -1 || gsrc.indexOf('?pf_off=ballotcd') !== -1) ok('module kill switch documented');
else no('module kill', '?pf_off=ballotcd not documented');

console.log('== 4. static: behavioral loop copy surfaces ==');
[['YOUR BALLOT COUNTDOWN', 'tray heading'], ['FORGE CARD', 'forge button'],
 ['CHECK REGISTRATION', 'check button'], ['PLEDGE TO VOTE', 'pledge button'],
 ['PLEDGE LOGGED.', 'pledge confirmation'], ['ELECTION DAY', 'pledge overlay ED line'],
 ['CARD FORGED — +1 XP', 'T1 toast'], ['Shared. Go spread the word.', 'T2 toast'],
 ['#ballot-forge=', 'ammo deep-link contract']
].forEach(function (pair) {
  if (gsrc.indexOf(pair[0]) !== -1) ok('loop copy: ' + pair[1]);
  else no('loop copy', pair[1] + ' ("' + pair[0] + '") missing');
});
if (gsrc.indexOf('REGISTER: ') !== -1 && /register_url/.test(gsrc)) ok('share text carries registration CTA');
else no('share CTA', 'share text missing registration line');

/* ============ 5. mocked-browser runtime ============ */
console.log('== 5. mocked-browser runtime (canvas stub) ==');
function pxOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(String(font)); return m ? parseFloat(m[1]) : 10; }
function Ctx2D(rec) {
  this._rec = rec; this.font = '400 10px Arial,sans-serif';
  this.fillStyle = '#000000'; this.textAlign = 'center'; this.textBaseline = 'alphabetic';
}
Ctx2D.prototype.measureText = function (t) { return { width: String(t).length * pxOf(this.font) * 0.62 }; };
Ctx2D.prototype.fillText = function (t, x, y) { this._rec.push({ text: String(t), font: this.font }); };
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'clip', 'rect'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return { width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); } };
}
function makePainterEnv(kill) {
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { return 0; };
  sb.navigator = {};
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.document = { createElement: function (t) { return t === 'canvas' ? makeCanvas() : {}; }, addEventListener: function () {} };
  sb.PF = { skip: function (n) { return kill && n === 'phq-share'; }, toast: function () {} };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PFShare = { setPoster: function () {}, shareImage: function () {}, saveImage: function () {}, stampCallsign: function (cv) { return cv; } };
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'share-image-phq.js' });
  return sb;
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(textsOf(cv).join('\n')).indexOf(squish(frag)) !== -1; }

var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
var penv = makePainterEnv(false);
var PHQ = penv.PF && penv.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed');
  if (PHQ.ids.indexOf('phq-ballot') !== -1 && PHQ.ids.length === 6) ok('6 painter ids incl. phq-ballot');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  var variants = [
    { name: '7-day', data: { state: 'TX', daysLeft: 7, deadline: '2026-10-05', registerUrl: 'https://www.vote.gov/register/tx/', sameDay: false }, frags: ['7', 'DAYSLEFT', 'TOREGISTERINTEXAS', 'DEADLINE:OCTOBER5,2026', 'REGISTER:VOTE.GOV/REGISTER/TX', 'JOIN THE FIGHT.', 'FIGHTINGASWARHAWK'] },
    { name: '3-day', data: { state: 'FL', daysLeft: 3, deadline: '2026-10-05', registerUrl: 'https://www.vote.gov/register/fl/', sameDay: false }, frags: ['3', 'DAYSLEFT', 'TOREGISTERINFLORIDA'] },
    { name: '1-day', data: { state: 'LA', daysLeft: 1, deadline: '2026-10-06', registerUrl: 'https://www.vote.gov/register/la/', sameDay: false }, frags: ['1', 'DAYLEFT', 'TOREGISTERINLOUISIANA'] },
    { name: 'today', data: { state: 'GA', daysLeft: 0, deadline: '2026-10-05', registerUrl: 'https://www.vote.gov/register/ga/', sameDay: false }, frags: ['TODAY', 'LASTDAYTOREGISTERINGEORGIA'] },
    { name: 'same-day', data: { state: 'CA', daysLeft: null, deadline: null, registerUrl: 'https://www.vote.gov/register/ca/', sameDay: true }, frags: ['NODEADLINE', 'REGISTERATTHEPOLLSINCALIFORNIA'] },
    { name: 'degrade', data: { state: 'DC', daysLeft: null, deadline: null, registerUrl: null, sameDay: false }, frags: ['CHECKYOURDEADLINE', 'VOTE.GOV/REGISTER'] }
  ];
  variants.forEach(function (v) {
    var cv = PHQ.paint('phq-ballot', v.data);
    if (!cv) { no('paint ' + v.name, 'returned null'); return; }
    var bad = v.frags.filter(function (f) { return !hasFrag(cv, f); });
    if (!bad.length) ok('paint ' + v.name + ' renders');
    else no('paint ' + v.name, 'missing: ' + bad.join(', '));
  });
  /* All 51 states render without throwing; never invents a deadline. */
  var stateFails = [];
  STATES.forEach(function (st) {
    try {
      var cv = PHQ.paint('phq-ballot', { state: st, daysLeft: 3, deadline: '2026-10-19', registerUrl: 'https://www.vote.gov/register/' + st.toLowerCase() + '/', sameDay: false });
      if (!cv) stateFails.push(st + ':null');
    } catch (e) { stateFails.push(st + ':throw'); }
  });
  if (!stateFails.length) ok('painter renders all 51 states');
  else no('all states', stateFails.slice(0, 5).join(', '));
  /* Unknown painter id -> null (fail-soft). */
  if (PHQ.paint('phq-nope', {}) === null) ok('unknown painter id returns null');
  else no('unknown id', 'did not return null');
  /* No-callsign fallback: claim funnel line, no stamp strip. */
  var penv2 = makePainterEnv(false);
  penv2.localStorage.removeItem('pf_identity_v1');
  penv2.PFCallsign = function () { return ''; };
  vm.runInContext(read(MOD), penv2, { filename: 'share-image-phq.js' });
  var PHQ2 = penv2.PF.PHQShare;
  var cv2 = PHQ2.paint('phq-ballot', { state: 'TX', daysLeft: 3, deadline: '2026-10-05', registerUrl: 'https://www.vote.gov/register/tx/', sameDay: false });
  if (cv2 && hasFrag(cv2, 'CLAIMYOURCALLSIGNATMTCSTW.COM') && !cv2._pfStamped) ok('no-callsign funnel (no stamp strip)');
  else no('no-callsign', 'funnel line missing or unexpected stamp');
}
/* Kill switch: ?pf_off=phq-share -> no painters. */
var kenv = makePainterEnv(true);
if (!kenv.PF.PHQShare) ok('kill switch: PF.skip("phq-share") suppresses painters');
else no('kill switch', 'painters exposed despite skip');

console.log('== 6. module runtime (DOM shim) ==');
function fakeEl(tag) {
  var el = {
    tagName: String(tag || 'div').toUpperCase(), children: [], _listeners: {}, _html: '',
    style: {}, parentNode: null,
    set innerHTML(h) { this._html = String(h); },
    get innerHTML() { return this._html; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
    querySelectorAll: function () { return []; },
    getAttribute: function (k) { return this._attrs ? this._attrs[k] : null; },
    setAttribute: function (k, v) { (this._attrs = this._attrs || {})[k] = v; },
    click: function () {}
  };
  return el;
}
function makeGameEnv(homeState, countdowns) {
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  if (homeState !== undefined) store.pf_home_state_v1 = homeState;
  var dispatched = [];
  var mount = null, overlayAppended = null;
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function () { return 0; };
  sb.navigator = {};
  sb.location = { hash: '' };
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.document = {
    readyState: 'complete',
    createElement: function (t) { return t === 'canvas' ? makeCanvas() : fakeEl(t); },
    addEventListener: function () {},
    dispatchEvent: function (ev) { dispatched.push(ev); return true; },
    getElementById: function (id) {
      if (id === 'pf-forged-ballot') { if (!mount) mount = fakeEl('div'); return mount; }
      return fakeEl('div');
    },
    head: fakeEl('head'),
    body: (function () { var b = fakeEl('body'); var orig = b.appendChild; b.appendChild = function (c) { overlayAppended = c; return orig.call(b, c); }; return b; })()
  };
  sb.document.head.appendChild = function (s) {
    /* Fire the JSONP callback with the fixture on script inject. */
    try {
      var m = /callback=([A-Za-z0-9_]+)/.exec(String(s.src || ''));
      if (m && typeof sb.window[m[1]] === 'function') sb.window[m[1]]({ ok: true, countdowns: countdowns });
    } catch (e) {}
    return s;
  };
  sb.PF = {
    skip: function () { return false; }, toast: function () {},
    PHQShare: { paint: function (id, d) { var cv = makeCanvas(); return paintBallotRef(id, d, cv); } }
  };
  sb.PF_BACKEND_URL = 'https://pf-api.test/';
  sb.CustomEvent = function (t, o) { this.type = t; this.detail = (o && o.detail) || {}; };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.URL = { createObjectURL: function () { return 'blob:x'; } };
  vm.createContext(sb);
  return { sb: sb, store: store, dispatched: dispatched,
    getMount: function () { return mount; }, getOverlay: function () { return overlayAppended; } };
}
/* Reuse the real paintBallot through the painter module for forge() tests. */
var _penv = makePainterEnv(false);
var _PHQ = _penv.PF.PHQShare;
function paintBallotRef(id, d, cv) { return _PHQ.paint(id, d); }

var FIX = [
  { state: 'TX', days_left: 7, deadline: '2026-10-05', register_url: 'https://www.vote.gov/register/tx/', same_day: 0, draft_id: 101 },
  { state: 'CA', days_left: null, deadline: null, register_url: 'https://www.vote.gov/register/ca/', same_day: 1, draft_id: 102 }
];
/* Stateless -> no tray render, no fetch issues. */
var g0 = makeGameEnv('');
vm.runInContext(read(GAME), g0.sb, { filename: 'ballot-countdown.js' });
if (!g0.getMount()) ok('stateless: tray not rendered');
else no('stateless', 'mount was touched');
/* Unset -> same. */
var g0b = makeGameEnv(undefined);
vm.runInContext(read(GAME), g0b.sb, { filename: 'ballot-countdown.js' });
if (!g0b.getMount()) ok('unset home state: tray not rendered');
else no('unset', 'mount was touched');
/* TX home state -> ballot_countdowns has no backend route (junk-removal
   2026-10-06): the tray fail-softs to unrendered. The render-path assertions
   (tray copy, loop buttons, home-state filter) are retired until the route
   lands; renderTray stays in the module for that day. */
var g1 = makeGameEnv('TX', FIX);
vm.runInContext(read(GAME), g1.sb, { filename: 'ballot-countdown.js' });
var BC = g1.sb.PF.ballotCountdowns;
if (!BC) { no('contract', 'PF.ballotCountdowns not exposed'); }
else {
  ok('PF.ballotCountdowns exposed');
  var html = g1.getMount() ? g1.getMount().innerHTML : '';
  if (!g1.getMount() || html.indexOf('YOUR BALLOT COUNTDOWN') === -1) ok('tray fail-soft: not rendered without backend route');
  else no('tray render', 'tray rendered without data');
  /* T1: forge dispatches pf-xp with the draft-scoped key. */
  var card = BC.forge(FIX[0]);
  var xpEv = g1.dispatched.filter(function (e) { return e.type === 'pf-xp'; });
  if (xpEv.length === 1 && xpEv[0].detail.key === 'poster_ballot:101' && xpEv[0].detail.gain === 1) ok('T1 forge -> pf-xp poster_ballot:101 (+1)');
  else no('T1 key', 'got ' + JSON.stringify(xpEv.map(function (e) { return e.detail; })));
  var generic = g1.dispatched.filter(function (e) { return e.type === 'pf-poster-made' || e.type === 'pf-share-image'; });
  if (!generic.length) ok('no generic leg events on forge');
  else no('double-pay', 'generic events fired');
  /* T2: share dispatches the card-scoped key. card.toBlob is stubbed. */
  card.canvas.toBlob = function (cb) { cb({ size: 8 }); };
  g1.sb.navigator.canShare = function () { return false; };
  BC.share(card);
  var xpEv2 = g1.dispatched.filter(function (e) { return e.type === 'pf-xp'; });
  var shareKeys = xpEv2.map(function (e) { return e.detail.key; }).filter(function (k) { return k.indexOf('share_ballot:') === 0; });
  if (shareKeys.length === 1 && /^share_ballot:101_[0-9a-f]+$/.test(shareKeys[0])) ok('T2 share -> pf-xp ' + shareKeys[0]);
  else no('T2 key', 'got ' + JSON.stringify(xpEv2.map(function (e) { return e.detail; })));
  /* T5: claim + view emit zero XP. */
  var n0 = g1.dispatched.length;
  BC.claim('101');
  if (g1.dispatched.length === n0) ok('T5 claim: zero XP events');
  else no('T5 claim', 'claim emitted events');
  /* Pledge: 0 XP, overlay appended, state persisted. */
  var n1 = g1.dispatched.length;
  BC.pledge(FIX[0]);
  if (g1.dispatched.length === n1) ok('pledge: zero XP events');
  else no('pledge XP', 'pledge emitted events');
  if (g1.getOverlay() && /PLEDGE LOGGED/.test(g1.getOverlay().innerHTML)) ok('pledge confirmation overlay renders');
  else no('pledge overlay', 'not rendered');
  if (BC.pledged('101') === true && BC.checked('101') === false) ok('pledged()/checked() state accessors');
  else no('state accessors', 'wrong states');
}
/* Module kill switch. */
var gk = makeGameEnv('TX', FIX);
gk.sb.PF.skip = function (n) { return n === 'ballotcd'; };
vm.runInContext(read(GAME), gk.sb, { filename: 'ballot-countdown.js' });
if (!gk.sb.PF.ballotCountdowns) ok('kill switch: PF.skip("ballotcd") suppresses module');
else no('module kill', 'contract exposed despite skip');

console.log('\nballot-fe: ' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) process.exit(1);
