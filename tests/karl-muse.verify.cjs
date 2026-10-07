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
  assert.ok(g.toLowerCase().indexOf('streak') !== -1, 'cites the streak, got: ' + g.slice(0, 200));
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

/* ================= v2 — butter sweep #2 (user modeling suite) ================= */

function injectStory(obj) {
  store['pf_karl_story_v1'] = JSON.stringify(obj);
}
function v2base(over) {
  var now = Date.now();
  var s = { v: 2, firstSeen: now - 30 * 86400000, lastSeen: now, prevSeen: 0,
    visits: 5, days: {}, pages: {}, topics: {}, topicEvents: [], affin: {},
    milestones: [], _lastTopic: null };
  if (over) { for (var k in over) { s[k] = over[k]; } }
  return s;
}
function quietCtx(over) {
  /* A context where every urgent rule is off: only taste/inspire can fire. */
  var c = { callsign: 'tester', xp: 10, streak: 0, reported_today: 1, votes_week: 1 };
  if (over) { for (var k in over) { c[k] = over[k]; } }
  return c;
}

/* 16. Taste v2: recent questions outweigh old ones. */
t('taste recency weights recent questions', function () {
  resetStore(); setCallsign('tester'); setDashCtx(null);
  var now = Date.now();
  injectStory(v2base({ topicEvents: [
    { t: 'theory', at: now - 40 * 86400000 },
    { t: 'intel', at: now - 1 * 86400000 }
  ] }));
  store['pf_nuke_cell_v1'] = JSON.stringify({ cell: { name: 'Cell A' } });
  var M = loadMuse();
  assert.ok(M._topicScore('intel') > M._topicScore('theory'), 'recent intel beats old theory');
  var tops = M.museChips([]);
  assert.ok(tops.join(' ').indexOf('rep') !== -1 || tops.join(' ').indexOf('intel') !== -1,
    'recent taste surfaces in chips: ' + tops.join(' | '));
});

/* 17. Affinity: Karl learns the related-next-thing. */
t('affinity tracks question pairs', function () {
  resetStore(); setCallsign(''); setDashCtx(null);
  var M = loadMuse();
  M.observeQuestion('what is surplus value');
  M.observeQuestion('how do I join a cell');
  assert.strictEqual(M._relatedTopic('theory'), 'cell',
    'theory -> cell affinity learned');
});

/* 18. Visit streak: consecutive days counted. */
t('visit streak counts consecutive days', function () {
  resetStore(); setCallsign('tester'); setDashCtx(null);
  function dk(offset) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d = new Date(d.getTime() - offset * 86400000);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  var days = {}; days[dk(0)] = 1; days[dk(1)] = 2; days[dk(2)] = 1; days[dk(4)] = 1;
  injectStory(v2base({ days: days }));
  var M = loadMuse();
  assert.strictEqual(M._visitStreak(), 3, '3 consecutive days (gap at day 3 breaks it)');
  var st = M.readUserState();
  assert.strictEqual(st.visit_streak, 3);
});

/* 19. Welcome-back fires after a 7+ day absence. */
t('welcome-back after long absence', function () {
  resetStore(); setCallsign('tester');
  var now = Date.now();
  injectStory(v2base({ lastSeen: now - 10 * 86400000, visits: 5 }));
  setDashCtx(quietCtx());
  store['pf_nuke_cell_v1'] = JSON.stringify({ cell: { name: 'Cell A' } });
  store['pf_medals_v2'] = JSON.stringify({ w: '2026-W41', m: { vote: 1, ballot: 1, bracket: 1, caption: 1, poster: 1, quiz: 1, billionaire: 1, interrogation: 1, orders: 1, drop: 1, enlisted: 1, guess: 1, raid: 1, infight: 1, whitemarket: 1, civic: 1 } });
  var M = loadMuse();
  var moves = M._movesList();
  assert.strictEqual(moves[0].id, 'welcome-back', 'got: ' + moves.map(function (m) { return m.id; }).join(','));
  assert.ok(moves[0].headline.indexOf('10 days') !== -1 || moves[0].headline.indexOf('away') !== -1,
    'names the absence: ' + moves[0].headline);
});

/* 20. FULL DEPLOYMENT push fires at 13-15/16 medals. */
t('fd-push fires near full deployment', function () {
  resetStore(); setCallsign('tester');
  injectStory(v2base());
  setDashCtx(quietCtx());
  store['pf_nuke_cell_v1'] = JSON.stringify({ cell: { name: 'Cell A' } });
  var medals = {};
  ['vote', 'ballot', 'bracket', 'caption', 'poster', 'quiz', 'billionaire',
   'interrogation', 'orders', 'drop', 'enlisted', 'guess', 'raid', 'infight']
    .forEach(function (k) { medals[k] = 1; });
  store['pf_medals_v2'] = JSON.stringify({ w: '2026-W41', m: medals });
  var M = loadMuse();
  var moves = M._movesList().map(function (m) { return m.id; });
  assert.ok(moves.indexOf('fd-push') !== -1, 'fd-push present: ' + moves.join(','));
  assert.ok(moves.indexOf('fd-push') < moves.indexOf('medals') || moves.indexOf('medals') === -1,
    'fd-push outranks generic medals');
});

/* 21. Taste rule: your appetite becomes a deep link. */
t('taste move deep-links your appetite', function () {
  resetStore(); setCallsign('tester');
  setDashCtx(quietCtx());
  store['pf_nuke_cell_v1'] = JSON.stringify({ cell: { name: 'Cell A' } });
  var M = loadMuse();
  M.observeQuestion('what is surplus value');
  M.observeQuestion('tell me about marx');
  M.observeQuestion('explain capital to me');
  var moves = M._movesList();
  var tm = moves.filter(function (m) { return m.id === 'taste'; })[0];
  assert.ok(tm, 'taste move present: ' + moves.map(function (m) { return m.id; }).join(','));
  assert.strictEqual(tm.href, '/academy', 'theory -> academy');
});

/* 22. Headline variants: stable within the day. */
t('headline variants are stable per day', function () {
  resetStore(); setCallsign(''); setDashCtx(null);
  var M = loadMuse();
  assert.strictEqual(M._variant(['a', 'b', 'c']), M._variant(['a', 'b', 'c']));
});

/* 23. v1 -> v2 story migration preserves history. */
t('v1 story migrates to v2', function () {
  resetStore(); setCallsign('tester'); setDashCtx(null);
  var now = Date.now();
  injectStory({ v: 1, firstSeen: now - 60 * 86400000, visits: 5,
    pages: { '/economy': 3 }, topics: { theory: 2 },
    milestones: [{ t: now - 86400000, m: '10 visits — a regular' }] });
  var M = loadMuse();
  var s = M.readStory();
  assert.strictEqual(s.v, 2);
  assert.strictEqual(s.visits >= 5, true, 'visits preserved (+1 for this load)');
  assert.ok(s.topicEvents.some(function (e) { return e.t === 'theory'; }),
    'old taste becomes an aging event');
  assert.ok(M._topicScore('theory') > 0, 'migrated taste still scores');
});

/* 24. Engagement tiers: new / active / veteran. */
t('engagement tiers from visits', function () {
  resetStore(); setCallsign('tester'); setDashCtx(null);
  injectStory(v2base({ visits: 0 }));
  var M1 = loadMuse();
  assert.strictEqual(M1.readUserState().engagement, 'new');
  resetStore(); setCallsign('tester'); setDashCtx(null);
  injectStory(v2base({ visits: 30 }));
  var M2 = loadMuse();
  assert.strictEqual(M2.readUserState().engagement, 'veteran');
  var c = M2.museContext();
  assert.strictEqual(c.user_state.engagement, 'veteran');
  assert.ok(Array.isArray(c.taste_profile), 'taste_profile present');
});

/* 25. Fresh milestones are celebrated in the greeting. */
t('greeting celebrates fresh milestones', function () {
  resetStore(); setCallsign('tester');
  var now = Date.now();
  injectStory(v2base({ firstSeen: now - 5 * 86400000,
    milestones: [{ t: now - 3600000, m: '10 visits — a regular' }] }));
  setDashCtx(quietCtx());
  store['pf_nuke_cell_v1'] = JSON.stringify({ cell: { name: 'Cell A' } });
  var M = loadMuse();
  var g = M.museGreeting();
  assert.ok(g.indexOf('10 visits') !== -1, 'celebrates the milestone, got: ' + g.slice(0, 300));
  var fresh = M._freshMilestones();
  assert.ok(fresh.indexOf('10 visits — a regular') !== -1);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
