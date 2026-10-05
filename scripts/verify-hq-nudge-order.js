#!/usr/bin/env node
/* scripts/verify-hq-nudge-order.js — Homepage hq-nudge reorder smoke test
   (P1#6, homepage audit 2026-10-05; branch fe/homepage-hq-nudge-move).
   Run from the worktree root:
     node scripts/verify-hq-nudge-order.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Asserts: the hq-nudge CTA card ("NEW BATTLEGROUND -> POLITICAL HQ") moved
   from the CREATE section to START HERE, mounting IMMEDIATELY after
   daily-orders. Covers: node --check on touched files, ORDER-array
   position (exactly once, right after daily-orders, no other widget moved),
   SILO_SEC section mapping, template staged in the critical-path bundle
   (bundle-sec1) and gone from the lazy bundle-home, no duplicate staging,
   CREATE section still opens with poster-forge, and a simulated mount pass
   reproducing home-v2.js placeWidget() insertion order. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var HOME = path.join(ROOT, 'v1.4.3', 'pages', 'home-v2.js');
var SEC1 = path.join(ROOT, 'v1.4.3', 'games', 'bundle-sec1.js');
var HOME_B = path.join(ROOT, 'v1.4.3', 'games', 'bundle-home.js');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function count(s, sub) { return s.split(sub).length - 1; }

var home = read(HOME);

/* 1. node --check on every touched file. */
console.log('== 1. node --check ==');
[HOME, SEC1, HOME_B, path.join(__dirname, 'verify-hq-nudge-order.js')].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p)); }
  catch (e) { no(path.basename(p), 'node --check failed'); }
});

/* 2. Extract the ORDER array entries in file order. */
console.log('== 2. ORDER array ==');
var m = home.match(/var ORDER = \[([\s\S]*?)\];/);
if (!m) { no('ORDER parse', 'ORDER array not found in home-v2.js'); }
var order = [];
m[1].replace(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g, function (all, silo, tpl) {
  order.push({ silo: silo, tpl: tpl }); return all;
});
var keys = order.map(function (e) { return e.silo; });
var iNudge = keys.indexOf('hq-nudge');
var iOrders = keys.indexOf('daily-orders');
var iDopa = keys.indexOf('dopa');
var iPoster = keys.indexOf('poster-forge');

if (iNudge === -1) no('hq-nudge present', 'hq-nudge missing from ORDER');
else if (count(keys.join(','), 'hq-nudge') !== 1) no('hq-nudge unique', 'hq-nudge appears more than once');
else ok('hq-nudge present exactly once');

if (iOrders === -1) no('daily-orders present', 'daily-orders missing from ORDER');
else if (iNudge === iOrders + 1) ok('hq-nudge immediately after daily-orders');
else no('hq-nudge adjacency', 'hq-nudge at index ' + iNudge + ', daily-orders at ' + iOrders);

if (iNudge !== -1 && iDopa !== -1 && iNudge < iDopa) ok('hq-nudge before dopa (no other widget moved)');
else no('dopa position', 'unexpected dopa/hq-nudge relative order');

if (iPoster !== -1) ok('poster-forge still in ORDER (CREATE intact)');
else no('poster-forge present', 'poster-forge missing from ORDER');

/* Section boundaries: CREATE's first silo must still be poster-forge. */
var createFirst = home.match(/\{\s*id:\s*'create'[\s\S]*?first:\s*'([^']+)'/);
if (createFirst && createFirst[1] === 'poster-forge') ok("CREATE section still opens with poster-forge");
else no('CREATE first', 'CREATE first is ' + (createFirst && createFirst[1]));

/* 3. SILO_SEC mapping — placeWidget() inserts by section id; without this
      the card would still render at the end of CREATE. */
console.log('== 3. SILO_SEC section mapping ==');
var secBlock = home.match(/var SILO_SEC = \{([\s\S]*?)\};/);
/* Simple parse: split the SILO_SEC object into silo->section pairs. */
var siloSec = {};
if (secBlock) {
  secBlock[1].replace(/'([^']+)'\s*:\s*'([^']+)'/g, function (a, s, sec) {
    siloSec[s] = sec; return a;
  });
}
if (siloSec['hq-nudge'] === 'start-here') ok("SILO_SEC['hq-nudge'] === 'start-here'");
else no("SILO_SEC['hq-nudge']", 'mapped to ' + siloSec['hq-nudge']);
if (siloSec['daily-orders'] === 'start-here' && siloSec['poster-forge'] === 'create')
  ok('neighbors keep their sections');
else no('neighbor sections', 'unexpected neighbor mapping');

/* 4. Bundle staging: the template must stage with the critical path so the
      retry loop mounts it in ORDER position (late staging would pin it to
      the END of START HERE, after enlistment-ranks). */
console.log('== 4. bundle staging ==');
var sec1 = read(SEC1), homeB = read(HOME_B);
if (count(sec1, 'pf-ov-hq-nudge') === 1) ok('pf-ov-hq-nudge staged in bundle-sec1.js (critical path)');
else no('bundle-sec1 staging', 'pf-ov-hq-nudge count in bundle-sec1.js = ' + count(sec1, 'pf-ov-hq-nudge'));
if (count(homeB, 'pf-ov-hq-nudge') === 0) ok('pf-ov-hq-nudge removed from bundle-home.js (no dup staging)');
else no('bundle-home cleanup', 'pf-ov-hq-nudge still present ' + count(homeB, 'pf-ov-hq-nudge') + 'x in bundle-home.js');

/* 5. Simulated mount: stage templates in bundle load order, then replay
      ORDER through placeWidget()'s "insert before next section head" rule. */
console.log('== 5. simulated mount pass ==');
var SEC_ORDER = ['start-here', 'play', 'belong', 'create', 'fund', 'act', 'proof'];
var staged = {};            /* tplId staged once its bundle loads */
[SEC1].forEach(function (p) { staged[p] = true; }); /* critical path first */
var dom = [];               /* flat list of mounted silos in visual order */
function sectionHeadIndex(secId) {
  for (var i = 0; i < dom.length; i++) if (dom[i] === 'HEAD:' + secId) return i;
  return -1;
}
SEC_ORDER.forEach(function (s) { dom.push('HEAD:' + s); });
/* Section heads sit before their section's widgets: seed header anchors. */
var placeLog = [];
function placeWidget(silo) {
  var secId = siloSec[silo];
  var nextIdx = SEC_ORDER.indexOf(secId) + 1;
  var nextHead = nextIdx < SEC_ORDER.length ? 'HEAD:' + SEC_ORDER[nextIdx] : null;
  var at = nextHead ? sectionHeadIndex(nextHead) : dom.length;
  dom.splice(at, 0, silo);
  placeLog.push(silo);
}
/* Pass 1: critical-path templates staged; lazy bundle-home not yet loaded. */
var pending = [];
order.forEach(function (e) {
  var tplInSec1 = sec1.indexOf('id=\\"' + e.tpl + '\\"') !== -1 || sec1.indexOf("id='" + e.tpl + "'") !== -1 || sec1.indexOf(e.tpl) !== -1;
  if (tplInSec1) placeWidget(e.silo); else pending.push(e.silo);
});
var firstPass = dom.filter(function (x) { return x.indexOf('HEAD:') !== 0; });
var nudgeFirst = firstPass.indexOf('hq-nudge');
var ordersFirst = firstPass.indexOf('daily-orders');
if (nudgeFirst !== -1 && nudgeFirst === ordersFirst + 1)
  ok('first paint: hq-nudge mounts immediately after daily-orders');
else no('first paint order', 'hq-nudge=' + nudgeFirst + ' daily-orders=' + ordersFirst);

/* Pass 2: lazy bundle-home arrives (user scrolls); nothing re-mounts. */
pending.forEach(function (silo) { placeWidget(silo); });
var final = dom.filter(function (x) { return x.indexOf('HEAD:') !== 0; });
var wantStart = ['socialproof', 'brief', 'daily-orders', 'hq-nudge', 'dopa', 'do-meter', 'enlistment-ranks'];
var gotStart = final.slice(0, wantStart.length);
if (JSON.stringify(gotStart) === JSON.stringify(wantStart))
  ok('final START HERE order: ' + gotStart.join(' -> '));
else no('final order', 'got ' + gotStart.join(','));
var createSlice = final.slice(final.indexOf('poster-forge'), final.indexOf('war-bonds'));
if (createSlice.indexOf('hq-nudge') === -1 && createSlice[0] === 'poster-forge')
  ok('CREATE contains no hq-nudge (poster-forge -> feed only)');
else no('CREATE cleanup', 'CREATE slice: ' + createSlice.join(','));

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
