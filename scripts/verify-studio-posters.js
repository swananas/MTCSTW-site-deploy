#!/usr/bin/env node
/* scripts/verify-studio-posters.js — Studio poster batch verification
   (2026-10-05, branch fix/studio-posters). Run from the worktree root:
     node scripts/verify-studio-posters.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Part A: static checks on v1.4.3/core/share-image.js (REG keys, copy,
   banned terms, dormant ORDER).
   Part B: headless render harness — the file is evaluated in a vm sandbox
   with a mock canvas 2d context that records fillText calls. Each new REG
   entry is rendered via PFShare.poster(id) and each custom painter is run
   with seeded PFShare.posterState; assertions check the verbatim copy
   strings land on the canvas calls. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'v1.4.3', 'core', 'share-image.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

console.log('== A1. node --check ==');
try { cp.execSync('node --check ' + SRC, { stdio: 'pipe' }); ok('core/share-image.js parses'); }
catch (e) { no('core/share-image.js parses', 'node --check failed'); }

var src = read(SRC);
/* Comment-stripped source for "string must not survive" checks — the code's
   own comments document what was removed (same technique as
   scripts/verify-phaseb-fe.js). */
var codeOnly = (function () {
  var out = [], inBlock = false;
  src.split('\n').forEach(function (l) {
    var t = l.trim(), rest = l;
    if (inBlock) {
      var end = t.indexOf('*/');
      if (end === -1) return;
      inBlock = false; rest = t.slice(end + 2);
    }
    var bs = rest.indexOf('/*');
    while (bs !== -1) {
      var be = rest.indexOf('*/', bs + 2);
      if (be === -1) { inBlock = true; rest = rest.slice(0, bs); break; }
      rest = rest.slice(0, bs) + rest.slice(be + 2);
      bs = rest.indexOf('/*');
    }
    var lc = rest.indexOf('//');
    if (lc !== -1) rest = rest.slice(0, lc);
    out.push(rest);
  });
  return out.join('\n');
})();
var NEW_KEYS = ['first-wave', 'ammo-cite', 'top-stories', 'markets', 'gambits',
                'draw', 'raid', 'nuke-detonation', 'enlisted-ceremony'];

console.log('== A2. REG entry static checks ==');
NEW_KEYS.forEach(function (k) {
  if (new RegExp("^[ \\t]*'" + k + "':\\s*\\{", 'm').test(src)) ok("REG has '" + k + "'");
  else no("REG has '" + k + "'", 'entry missing');
});
if (/^[ \t]*'casino':\s*\{/m.test(src)) no("'casino' REG retired", "entry still present");
else ok("'casino' REG retired");
if (codeOnly.indexOf('Starting at $1') !== -1) no('war-bonds $1 line killed', 'still present');
else ok('war-bonds $1 line killed');
if (src.indexOf('$5 \\u00b7 $10 \\u00b7 $25 \\u00b7 $50') !== -1) ok('war-bonds $5/$10/$25/$50 tiers');
else no('war-bonds $5/$10/$25/$50 tiers', 'tier line missing');
if (src.indexOf('Half to the machine. Half split equally among the 62 creators.') !== -1)
  ok('war-bonds 50/50 split copy');
else no('war-bonds 50/50 split copy', 'sub line missing');
if (codeOnly.indexOf('5 million') !== -1) no('do-meter stale goal killed', 'still present');
else ok('do-meter stale goal killed');
if (src.indexOf('The weekly target climbs 25% with every detonation.') !== -1)
  ok('do-meter evergreen goal copy');
else no('do-meter evergreen goal copy', 'line missing');
if (/donate/i.test(src)) no('no banned terms', '"donate" found');
else ok('no banned terms');
['cash out', 'cashout'].forEach(function (t) {
  if (codeOnly.toLowerCase().indexOf(t) !== -1) no('no "' + t + '"', 'found in share-image.js code');
});
ok('no "cash out"/"cashout" (raid uses EXFILTRATE)');
/* Dormant: none of the four live-section gameIds may be in ORDER (no
   share/save buttons injected into unlaunched games). */
var orderM = src.match(/var ORDER = \[([\s\S]*?)\];/);
var orderTxt = orderM ? orderM[1] : '';
['markets', 'gambits', 'draw', 'raid'].forEach(function (k) {
  if (orderTxt.indexOf("'" + k + "'") !== -1) no("'" + k + "' dormant (not in ORDER)", 'in ORDER');
  else ok("'" + k + "' dormant (not in ORDER)");
});
/* All 9 painters registered + posterState exposed. */
/* All painters registered — EXCEPT 'ammo-cite', whose painter is owned by
   games/ammo.js (branch fix/studio-ammo-ux); this branch must not register
   one or the merge collides. */
NEW_KEYS.forEach(function (k) {
  if (k === 'ammo-cite') {
    if (codeOnly.indexOf("setPoster('ammo-cite'") !== -1)
      no("no local painter for 'ammo-cite' (owned by games/ammo.js)", 'setPoster call present — merge collision risk');
    else ok("no local painter for 'ammo-cite' (owned by games/ammo.js)");
    return;
  }
  if (src.indexOf("setPoster('" + k + "'") !== -1) ok("painter registered for '" + k + "'");
  else no("painter registered for '" + k + "'", 'setPoster call missing');
});
if (/posterState:\s*posterState/.test(src)) ok('PFShare.posterState exposed');
else no('PFShare.posterState exposed', 'missing from public API');

console.log('== B. headless render harness ==');
/* ---- mock browser ---- */
function mockCtx(texts) {
  return {
    fillText: function (t) { texts.push(String(t)); },
    measureText: function () { return { width: 100 }; },
    fillRect: function () {}, strokeRect: function () {},
    save: function () {}, restore: function () {}
  };
}
var store = {
  pf_identity_v1: JSON.stringify({ callsign: 'TESTCALL' }),
  pf_boost_v1: 'null'
};
var localStorage = {
  getItem: function (k) { return (k in store) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
var capturedPFShare = null, capturedPainters = {};
var win = {};
Object.defineProperty(win, 'PFShare', {
  configurable: true,
  get: function () { return capturedPFShare; },
  set: function (v) {
    capturedPFShare = v;
    var orig = v.setPoster.bind(v);
    v.setPoster = function (id, fn) { capturedPainters[id] = fn; return orig(id, fn); };
  }
});
win.PF = {
  skip: function () { return false; },
  chiNow: function () { return new Date('2026-10-05T12:00:00-05:00'); },
  rosterBySlug: function () { return null; },
  isSubscriber: function () { return false; }
};
function mockCanvas() {
  var texts = [];
  return { width: 0, height: 0, _texts: texts, getContext: function () { return mockCtx(texts); } };
}
var document = {
  createElement: function (tag) {
    if (tag === 'canvas') return mockCanvas();
    return { style: {}, setAttribute: function () {}, appendChild: function () {} };
  },
  querySelector: function () { return null; },
  addEventListener: function () {},
  dispatchEvent: function () { return true; }
};
var sandbox = {
  window: win, document: document, localStorage: localStorage,
  navigator: { userAgent: 'node-harness' },
  setTimeout: function () { return 0; },
  console: console
};
sandbox.globalThis = sandbox;
try {
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'share-image.js' });
  ok('share-image.js evaluates in sandbox');
} catch (e) {
  no('share-image.js evaluates in sandbox', String(e && e.message || e));
}
var PFShare = capturedPFShare;
if (!PFShare) { no('PFShare captured', 'window.PFShare never assigned'); }
else {
  ok('PFShare captured');
  NEW_KEYS.forEach(function (k) {
    if (k === 'ammo-cite') { ok("painter for 'ammo-cite' owned by games/ammo.js (not registered here)"); return; }
    if (capturedPainters[k]) ok("painter reachable for '" + k + "'");
    else no("painter reachable for '" + k + "'", 'not captured via setPoster');
  });

  /* B1: REG fallback renders via PFShare.poster(id). */
  var REG_EXPECT = {
    'first-wave': ['YOU WERE HERE WHEN IT STARTED.', 'First Wave founder'],
    'ammo-cite': ['SOURCED. VERIFIED. WEAPONIZED.'],
    'top-stories': ['FROM THE NEWS RAIL'],
    'markets': ['READ THE BOARD. BACK THE OUTCOME.'],
    'gambits': ['THE GAMBIT'],
    'draw': ['THE SOLIDARITY DRAW'],
    'raid': ['SUPPLY LINE RAID'],
    'nuke-detonation': ['\u2605 DETONATION \u2605'],
    'enlisted-ceremony': ['YOU HAVE A NAME.', 'GET A SQUAD \u2192']
  };
  NEW_KEYS.forEach(function (k) {
    var cv = null;
    try { cv = PFShare.poster(k); } catch (e) { cv = null; }
    if (!cv) { no("REG fallback renders '" + k + "'", 'poster() returned null'); return; }
    var t = cv._texts.join('\n');
    var missing = REG_EXPECT[k].filter(function (s) { return t.indexOf(s) === -1; });
    if (missing.length) no("REG fallback renders '" + k + "'", 'missing: ' + missing.join(' | '));
    else ok("REG fallback renders '" + k + "'");
    if (t.indexOf('MTCSTW.COM') === -1 || t.indexOf('JOIN THE FIGHT.') === -1)
      no("REG fallback footer '" + k + "'", 'MTCSTW.COM / JOIN THE FIGHT. missing');
  });
  ok('all REG fallbacks carry MTCSTW.COM + JOIN THE FIGHT. footer');

  /* B2: custom painters with seeded state. */
  function runPainter(id, state) {
    if (state === undefined) PFShare.posterState(id, null);
    else PFShare.posterState(id, state);
    var out = null, err = null;
    try { capturedPainters[id](function (cv) { out = cv; }); }
    catch (e) { err = e; }
    PFShare.posterState(id, null);
    return { cv: out, err: err, texts: out ? out._texts.join('\n') : '' };
  }
  function expectPainter(name, id, state, must) {
    var r = runPainter(id, state);
    if (r.err) { no(name, 'threw: ' + r.err); return; }
    if (!r.cv) { no(name, 'done(null) — expected a canvas'); return; }
    var missing = must.filter(function (s) { return r.texts.indexOf(s) === -1; });
    if (missing.length) { no(name, 'missing: ' + missing.join(' | ')); return; }
    if (r.texts.indexOf('MTCSTW.COM') === -1 || r.texts.indexOf('JOIN THE FIGHT.') === -1) {
      no(name, 'footer missing'); return;
    }
    ok(name);
  }
  function expectNull(name, id, state) {
    var r = runPainter(id, state);
    if (r.err) { no(name, 'threw: ' + r.err); return; }
    if (r.cv) no(name, 'expected done(null), got a canvas');
    else ok(name);
  }

  expectPainter('first-wave standard', 'first-wave', {},
    ['YOU WERE HERE WHEN IT STARTED.', 'First Wave founder \u2014 TESTCALL',
     'ENLIST THIS WEEK. FOUNDERS ARE FOREVER.', 'FIGHTING AS TESTCALL']);
  expectPainter('first-wave full muster', 'first-wave', { full_muster: true },
    ['FIRST WAVE \u2014 FULL MUSTER', 'TESTCALL stood the full muster. First wave, full strength.']);
  expectPainter('top-stories', 'top-stories', { headline: 'Story Headline', outlet: 'Mother Jones' },
    ['FROM THE NEWS RAIL \u2014 READ FIRST. SHARE SECOND.', 'Story Headline',
     'via Mother Jones \u2014 this is what we\u2019re reading today.']);
  expectPainter('markets', 'markets', { market_title: 'Test Market', position: 'YES' },
    ['READ THE BOARD. BACK THE OUTCOME.', 'Test Market',
     'TESTCALL backs YES \u2014 winners split the pool, no house cut.']);
  expectPainter('gambits win', 'gambits', { won: true, winner_callsign: 'TESTCALL', pot_xp: 190 },
    ['THE GAMBIT \u2014 50/50. NO HOUSE.', 'TESTCALL TOOK THE POT.',
     '190 XP on one flip. 5% armed the war chest.']);
  expectPainter('gambits loss', 'gambits', { won: false },
    ['THE POT GOT AWAY.', 'Winner takes 1.9\u00d7. The war chest takes its cut \u2014 5% of every pot.']);
  expectPainter('draw win', 'draw', { won: true, winner_callsign: 'TESTCALL', winner_xp: 8000, chest_xp: 2000, round: 12 },
    ['THE SOLIDARITY DRAW \u2014 FORTUNE FAVORS THE COLLECTIVE.', 'TESTCALL DREW THE WEEK.',
     '8,000 XP to the winner \u2014 2,000 XP to the war chest. Verifiable draw, round 12.']);
  expectPainter('draw loss', 'draw', { won: false },
    ['THE POT RIDES AGAIN.', '10 XP a ticket. Winner takes the lion\u2019s share \u2014 the war chest takes its cut.']);
  expectPainter('raid win', 'raid', { won: true, multiplier: '2.5', payout_xp: 250 },
    ['SUPPLY LINE RAID \u2014 THE LINE CLIMBS. THE NERVE HOLDS.',
     'TESTCALL EXFILTRATED AT \u00d72.5.',
     '250 XP out before the collapse. The line keeps its cut for the collective.']);
  expectPainter('raid loss (cell)', 'raid', { won: false, cell_name: 'Red Cell' },
    ['THE LINE COLLAPSED.', 'TESTCALL\u2019s stake arms Red Cell\u2019s treasury. Losers fund the squad.']);
  expectPainter('raid loss (unaffiliated)', 'raid', { won: false },
    ['TESTCALL\u2019s stake arms the network war chest. Losers fund the squad.']);
  expectPainter('nuke-detonation T3', 'nuke-detonation', { tier: 3 },
    ['\u2605 DETONATION \u2605', 'NATIONAL TAKEOVER',
     'The blast is real. TESTCALL was in the Detonation Crew.',
     'The meter proves we showed up, not that the algorithm obeyed.']);
  expectPainter('nuke-detonation T2 tag', 'nuke-detonation', { tier: 'T2' }, ['REGIONAL SURGE']);
  expectPainter('enlisted-ceremony', 'enlisted-ceremony', {},
    ['YOU HAVE A NAME.', 'TESTCALL is enlisted. Now get a squad.', 'GET A SQUAD \u2192']);

  /* B3: invalid state -> done(null), never invented copy.
     ('ammo-cite' has no local painter — owned by games/ammo.js.) */
  expectNull('gambits no won flag -> null', 'gambits', { pot_xp: 10 });
  expectNull('draw win missing round -> null', 'draw',
    { won: true, winner_callsign: 'A', winner_xp: 1, chest_xp: 1 });
  expectNull('raid win missing payout -> null', 'raid', { won: true, multiplier: '2' });
  expectNull('nuke bad tier -> null', 'nuke-detonation', { tier: 9 });
  expectNull('markets missing title -> null', 'markets', { position: 'YES' });
  /* enlisted with no callsign -> null (ceremony fires post-claim anyway). */
  var savedIdent = store.pf_identity_v1;
  delete store.pf_identity_v1;
  expectNull('enlisted-ceremony no callsign -> null', 'enlisted-ceremony', {});
  store.pf_identity_v1 = savedIdent;
}

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
console.log('ALL STUDIO POSTER CHECKS PASS');
