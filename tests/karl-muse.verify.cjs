/* tests/karl-muse.verify.cjs | KARL MUSE ENGINE verification.
   CEO directive 2026-10-07 ~14:09 CDT ("Make Karl the muse of the site").
   Stubs the browser globals, loads core/karl-muse.js, and asserts the
   next-move rules, taste model, story memory, and muse context shape.
   Run: node tests/karl-muse.verify.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ok - ' + name); }
  catch (e) { failed++; console.log('  FAIL - ' + name + ': ' + e.message); }
}

/* ---------- browser stubs ---------- */
var store = {};
function resetStore() { store = {}; }
var localStorageStub = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
var sessionStorageStub = {
  getItem: function () { return null; },
  setItem: function () {}
};
var documentStub = { body: null, head: null, location: null };
var windowStub = {
  PF: {
    skip: function () { return false; },
    isoWeekKey: function () { return '2026-W41'; },
    chiNow: function () { return new Date(); }
  },
  location: { pathname: '/', search: '' },
  PFCallsign: null, /* set per-test */
  __pfKarlDashCtx: null
};

function loadMuse() {
  delete windowStub.PFKarlMuse;
  var src = fs.readFileSync(
    path.join(__dirname, '..', 'v1.4.3', 'core', 'karl-muse.js'), 'utf8');
  var fn = new Function('window', 'localStorage', 'sessionStorage', 'document',
    'navigator',
    'window.PF = window.PF;\n' + src +
    '\nreturn window.PFKarlMuse;');
  return fn(windowStub, localStorageStub, sessionStorageStub, documentStub, {});
}
function setDashCtx(ctx) { windowStub.__pfKarlDashCtx = ctx; }
function setCallsign(cs) {
  windowStub.PFCallsign = function () { return cs; };
}

console.log('karl-muse engine:');

/* 1. Anonymous visitor -> onboard move first. */
t('anonymous nextMove is onboard', function () {
  resetStore(); setCallsign(''); setDashCtx(null);
  var M = loadMuse();
  var moves = M._movesList();
  assert.strictEqual(moves[0].id, 'onboard');
  assert.ok(moves[0].chip.indexOf('callsign') !== -1);
});

/* 2. Streak at risk outranks missions. */
t('streak-at-risk fires before missions', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 100, rank: 'SYMPATHIZER', streak: 5, reported_today: 0 });
  var M = loadMuse();
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('streak') !== -1, 'streak move present');
  assert.ok(moves.indexOf('streak') < moves.indexOf('missions'), 'streak before missions');
  assert.strictEqual(M.nextMove().id, 'streak');
});

/* 3. Rank push when close to next rank (xp=200 -> 50 from AGITATOR). */
t('rank push fires near threshold', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 200, streak: 0, reported_today: 1 });
  var M = loadMuse();
  var nr = M._nextRank(200);
  assert.strictEqual(nr.rank, 'AGITATOR');
  assert.strictEqual(nr.gap, 50);
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('rank') !== -1, 'rank move present, got: ' + moves.join(','));
});

/* 4. No rank push when far from next rank. */
t('no rank push when far', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 10, streak: 0, reported_today: 1 });
  var M = loadMuse();
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('rank') === -1, 'rank move absent, got: ' + moves.join(','));
});

/* 5. Missions move when nothing reported today. */
t('missions move when reported_today=0', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 10, streak: 0, reported_today: 0 });
  var M = loadMuse();
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('missions') !== -1);
});

/* 6. Nudge dedup: shown moves are skipped. */
t('nudge dedup skips shown moves', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 10, streak: 0, reported_today: 0 });
  var M = loadMuse();
  assert.strictEqual(M.nextMove().id, 'missions');
  M._recordNudge('missions');
  assert.strictEqual(M.nextMove().id, 'cell',
    'after missions shown, next unshown move (cell) wins; got ' + M.nextMove().id);
});

/* 7. topicOf taxonomy. */
t('topicOf classifies questions', function () {
  resetStore(); setCallsign(''); setDashCtx(null);
  var M = loadMuse();
  assert.strictEqual(M._topicOf('what is surplus value'), 'theory');
  assert.strictEqual(M._topicOf('how do I earn xp fast'), 'xp');
  assert.strictEqual(M._topicOf('where is my cell'), 'cell');
  assert.strictEqual(M._topicOf('asdf qwer zxcv'), null);
});

/* 8. observeQuestion feeds the taste model. */
t('observeQuestion records topics', function () {
  resetStore(); setCallsign(''); setDashCtx(null);
  var M = loadMuse();
  M.observeQuestion('what is surplus value');
  M.observeQuestion('tell me about marx');
  var s = M.readStory();
  assert.strictEqual(s.topics.theory, 2);
});

/* 9. museChips: 3 max, move chip first, taste-biased. */
t('museChips leads with the move', function () {
  resetStore(); setCallsign('');
  setDashCtx(null);
  var M = loadMuse();
  M.observeQuestion('what is surplus value');
  var chips = M.museChips(['How do I earn XP?', 'Where is the war report?']);
  assert.ok(chips.length <= 3, 'at most 3 chips');
  assert.ok(chips[0].indexOf('callsign') !== -1, 'first chip is the onboard move, got: ' + chips[0]);
  assert.ok(chips.indexOf('What is surplus value?') !== -1, 'taste chip present: ' + chips.join(' | '));
});

/* 10. museContext shape for the worker. */
t('museContext carries muse flag + user state', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 300, rank: 'AGITATOR', streak: 4,
    medals_this_week: '3/16', reported_today: 2, votes_this_week: 1,
    upcoming: 'Wed Oct 7 Evening debrief' });
  var M = loadMuse();
  var c = M.museContext();
  assert.strictEqual(c.muse, true);
  assert.strictEqual(c.user_state.callsign, 'tester');
  assert.strictEqual(c.user_state.xp, 300);
  assert.strictEqual(c.user_state.next_rank, 'ORGANIZER');
  assert.strictEqual(c.user_state.xp_to_next, 450);
  assert.strictEqual(typeof c.story, 'string');
});

/* 11. museGreeting contains the move + Karl voice. */
t('museGreeting is proactive', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 10, streak: 3, reported_today: 0 });
  var M = loadMuse();
  var g = M.museGreeting();
  assert.ok(g.indexOf('tester') !== -1, 'names the user');
  assert.ok(g.indexOf('3-day streak') !== -1, 'cites the streak, got: ' + g.slice(0, 200));
  assert.ok(g.indexOf('pf-kc-go') !== -1, 'has the action link');
  assert.ok(g.indexOf('\u2014 Karl') !== -1 || g.indexOf('— Karl') !== -1, 'signed');
});

/* 12. Story milestones: callsign claim recorded. */
t('story records callsign milestone', function () {
  resetStore(); setCallsign('newbie');
  setDashCtx(null);
  var M = loadMuse(); /* recordVisit runs on load */
  var s = M.readStory();
  assert.ok(s.visits >= 1);
  var found = s.milestones.some(function (m) { return m.m.indexOf('Claimed callsign') === 0; });
  assert.ok(found, 'milestone recorded: ' + JSON.stringify(s.milestones));
});

/* 13. readUserState degrades without dashboard ctx. */
t('readUserState fail-soft without ctx', function () {
  resetStore(); setCallsign('tester');
  setDashCtx(null);
  store['pf_ranks_v1'] = JSON.stringify({ xp: 42 });
  var M = loadMuse();
  var st = M.readUserState();
  assert.strictEqual(st.callsign, 'tester');
  assert.strictEqual(st.xp, 42, 'xp falls back to ranks ledger');
  assert.strictEqual(st.reported_today, undefined);
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('missions') === -1, 'missions rule needs known reported_today');
  assert.ok(moves[moves.length - 1] === 'inspire', 'always ends with inspire');
});

/* 14. Cell rule fires for the cell-less. */
t('cell move for cell-less user', function () {
  resetStore(); setCallsign('tester');
  setDashCtx({ callsign: 'tester', xp: 10, streak: 0, reported_today: 1, votes_week: 1 });
  var M = loadMuse();
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('cell') !== -1, 'cell move present: ' + moves.join(','));
});

/* 15. Kill switch respected. */
t('?pf_off=karl-muse kills the engine', function () {
  resetStore();
  delete windowStub.PFKarlMuse; /* the kill switch prevents (re)initialization */
  windowStub.location.search = '?pf_off=karl-muse';
  var src = fs.readFileSync(
    path.join(__dirname, '..', 'v1.4.3', 'core', 'karl-muse.js'), 'utf8');
  var fn = new Function('window', 'localStorage', 'sessionStorage', 'document', 'navigator',
    'window.PF = window.PF;\n' + src + '\nreturn window.PFKarlMuse || null;');
  var M = fn(windowStub, localStorageStub, sessionStorageStub, documentStub, {});
  assert.strictEqual(M, null);
  windowStub.location.search = '';
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
