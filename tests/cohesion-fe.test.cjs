/* tests/cohesion-fe.test.cjs
   Functional verification for Cohesion Build-1 FE (display + latency),
   2026-10-05: §1 D1 (referral refresh), §2 fingerprint, §3 identity CTA,
   §4 freshness gate. Run: node tests/cohesion-fe.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var V = path.join(__dirname, '..', 'v1.4.3');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function src(f) { return fs.readFileSync(path.join(V, f), 'utf8'); }

/* ---------- minimal browser stub for the core modules ---------- */
function makeEnv(opts) {
  opts = opts || {};
  var disabled = (opts.pf_off || '').split(',').filter(Boolean);
  var callsign = opts.callsign === undefined ? null : opts.callsign;
  var PF = {
    skip: function (silo) { return disabled.indexOf(silo) !== -1; }
  };
  var window = {
    PF: PF,
    PFCallsign: function () { return callsign; },
    location: { search: opts.pf_off ? '?pf_off=' + opts.pf_off : '' },
    document: null
  };
  var mounted = [];
  var document = {
    _listeners: {},
    addEventListener: function (t, h) { (this._listeners[t] = this._listeners[t] || []).push(h); },
    removeEventListener: function () {},
    querySelector: function () { return null; },
    createElement: function (tag) {
      return { tag: tag, innerHTML: '', firstChild: null, parentNode: null,
        set innerHTML_(v) { this.innerHTML = v; },
        insertBefore: function (c) { mounted.push(c); } };
    },
    visibilityState: 'visible'
  };
  window.document = document;
  global.window = window;
  global.document = document;
  global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  return { PF: PF, mounted: mounted, setCallsign: function (c) { callsign = c; } };
}
function loadMod(f, env) {
  var code = src(f);
  var fn = new Function('window', 'document', 'localStorage', code);
  fn(global.window, global.document, global.localStorage);
}

/* ---------- §1 D1: referral activation-status refresh ---------- */
(function () {
  var s = src('games/referral.js');
  ok('D1: 120s interval gone', s.indexOf(',120000)') === -1);
  ok('D1: 30s interval present', s.indexOf(',30000)') !== -1);
  ok('D1: visibilitychange refresh wired', /visibilitychange/.test(s));
  ok('D1: anti-farm gate text intact', /3-ledger-action anti-farm gate/.test(s));
})();

/* ---------- §3: 25-claim-cta ---------- */
(function () {
  var env = makeEnv(); /* no callsign */
  loadMod('core/25-claim-cta.js', env);
  var PF = env.PF;
  ok('claimCTA: returns HTML when callsign is null',
    typeof PF.claimCTA === 'function' && PF.claimCTA('to muster').indexOf('CLAIM A CALLSIGN') !== -1);
  ok('claimCTA: Brand Consistency copy present',
    PF.claimCTA('x').indexOf('Claim your callsign. The ledger needs a name.') !== -1);
  ok('claimCTA: context rendered (not a toll)', PF.claimCTA('to muster').indexOf('to muster') !== -1);
  ok('claimCTA: non-blocking copy ("One tap")', PF.claimCTA('').indexOf('One tap') !== -1);
  env.setCallsign('REX-01');
  ok('claimCTA: returns empty string when callsign exists', PF.claimCTA('x') === '');

  var env2 = makeEnv({ pf_off: '25-claim-cta' });
  loadMod('core/25-claim-cta.js', env2);
  ok('claimCTA: ?pf_off=25-claim-cta kills module', env2.PF.claimCTA === undefined);

  /* mountClaimCTA inserts banner and is idempotent per node */
  var env3 = makeEnv();
  loadMod('core/25-claim-cta.js', env3);
  var html = env3.PF.claimCTA('to fire');
  ok('claimCTA: no per-user data leaked in HTML', html.indexOf('REX') === -1);
})();

/* ---------- §2: 26-crowd-credit ---------- */
(function () {
  var env = makeEnv();
  loadMod('core/26-crowd-credit.js', env);
  var PF = env.PF;
  ok('crowdCredit: exists', typeof PF.crowdCredit === 'function');
  var h = PF.crowdCredit(12, 'trailing 30 days');
  ok('crowdCredit: count + vintage in output', h.indexOf('12') !== -1 && h.indexOf('trailing 30 days') !== -1);
  ok('crowdCredit: plural/singular', PF.crowdCredit(1, 'v').indexOf('contributors') === -1 &&
    PF.crowdCredit(1, 'v').indexOf('contributor') !== -1);
  ok('crowdCredit: honest zero state', PF.crowdCredit(0, 'trailing 30 days').indexOf('no contributors yet') !== -1);
  ok('crowdCredit: no names leaked (aggregates only)', /[A-Z]{2,}-\d/.test(h) === false);
  var env2 = makeEnv({ pf_off: '26-crowd-credit' });
  loadMod('core/26-crowd-credit.js', env2);
  ok('crowdCredit: ?pf_off=26-crowd-credit kills module', env2.PF.crowdCredit === undefined);
})();

/* ---------- §4: 27-freshness ---------- */
(function () {
  var env = makeEnv();
  loadMod('core/27-freshness.js', env);
  var PF = env.PF;
  var now = Date.now();
  var fresh = PF.freshBadge(now - 5 * 60000);
  ok('freshBadge: LIVE badge on <=15-min-fresh data', fresh.indexOf('LIVE') !== -1);
  var stale = PF.freshBadge(now - 3 * 3600000);
  ok('freshBadge: stale data degrades to "updated Xh ago" (no LIVE)',
    stale.indexOf('LIVE') === -1 && stale.indexOf('updated') !== -1);
  ok('freshBadge: missing as_of -> no badge (fail-soft)', PF.freshBadge(null) === '' && PF.freshBadge(0) === '');
  ok('degradedVintage: stale "today" -> "recently"',
    PF.degradedVintage('today', now - 25 * 3600000) === 'recently');
  ok('degradedVintage: fresh "today" kept',
    PF.degradedVintage('today', now - 5 * 60000) === 'today');
  ok('honestZero: zero picks zero-line', PF.honestZero(0, 'A', 'B') === 'B');
  ok('honestZero: nonzero picks count line', PF.honestZero(7, 'A', 'B') === 'A');
  var env2 = makeEnv({ pf_off: '27-freshness' });
  loadMod('core/27-freshness.js', env2);
  ok('freshness: ?pf_off=27-freshness kills module', env2.PF.freshBadge === undefined);
})();

/* ---------- §2 FE: inflation-tracker fingerprint ---------- */
(function () {
  var s = src('games/inflation-tracker.js');
  ok('inflation: personal confirmation in receipt',
    s.indexOf("Your price check-in moved the People") !== -1);
  ok('inflation: card uses PF.crowdCredit', s.indexOf('PF.crowdCredit') !== -1);
  ok('inflation: suppressed cards show contributor count (counts publish)',
    /contributor[\s\S]*so far[\s\S]*We need at least 5 reports/.test(s));
  ok('inflation: suppressed cards NEVER show a number',
    s.indexOf('n<5 (or no median): NEVER a number') !== -1);
  ok('inflation: crowdCredit guarded when module killed',
    /if \(window\.PF && PF\.crowdCredit\)/.test(s));
})();

/* ---------- §4 FE: raid turnout + social-proof ---------- */
(function () {
  var d = src('games/daily-orders.js');
  ok('raid: honest zero state ("No raids reported today")',
    d.indexOf('No raids reported today') !== -1);
  ok('raid: never hidden at 0 (uses PF.honestZero)',
    d.indexOf('PF.honestZero') !== -1);
  ok('raid: vintage label on counter', d.indexOf('PF.degradedVintage') !== -1);
  var sp = src('games/social-proof.js');
  ok('social-proof: vintage helper', /vline\('checkins_today'/.test(sp));
  ok('social-proof: invitational zero states, counters never hidden at 0',
    sp.indexOf('No check-ins yet today') !== -1 &&
    sp.indexOf('No XP logged yet today') !== -1 &&
    sp.indexOf('No active cells this week') !== -1 &&
    sp.indexOf('No comrades online right now') !== -1 &&
    sp.indexOf('ci.style.display="none"') === -1 &&
    sp.indexOf('xp.style.display="none"') === -1 &&
    sp.indexOf('cells.style.display="none"') === -1 &&
    sp.indexOf('on.style.display="none"') === -1);
})();

/* ---------- §3 FE: mounts ---------- */
(function () {
  ok('infighting: claim CTA mounted', src('games/infighting.js').indexOf('PF.mountClaimCTA') !== -1);
  ok('caption-combat: claim CTA mounted', src('games/caption-combat.js').indexOf('PF.mountClaimCTA') !== -1);
  ok('caption-combat: mount guarded', /if\(window\.PF&&PF\.mountClaimCTA\)/.test(src('games/caption-combat.js')));
})();

/* ---------- D3: no SUM(actions.xp) reads ---------- */
(function () {
  var files = ['games/referral.js', 'games/daily-orders.js', 'games/social-proof.js', 'games/infighting.js',
    'games/caption-combat.js', 'games/inflation-tracker.js', 'core/20-nextop.js', 'core/00-bus.js'];
  var bad = files.filter(function (f) { return /SUM\(actions\.xp\)|actions\.xp/.test(src(f)); });
  ok('D3: no client-side SUM(actions.xp) reads', bad.length === 0, bad.join(','));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
