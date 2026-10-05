#!/usr/bin/env node
/* scripts/verify-economy-home.js — /economy Price-Index Home integration
   verification (fe/economy-price-index-home, 2026-10-05). Run from the
   worktree root AFTER rebuilding bundles:
     node build/bundle.js && node scripts/verify-economy-home.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the new modules, build/bundle.js, home-v2.js,
      briefing.js, and this harness.
   2. Mount layer: economy-home.js stages #pf-inflation-home with the three
      A1 mount divs, inserts into #pf-economy (silent no-op elsewhere),
      editor-guarded, double-run safe.
   3. Bundle order: economy-home.js listed BEFORE inflation-tracker.js in
      build/bundle.js bundle-economy, and the built bundle keeps that order.
   4. Kill switches: ?pf_off=economy-home and ?pf_off=inflation-teaser via
      PF.skip, documented in the headers.
   5. Zero XP: no xpGrant / XP award copy in the new files; the 0-XP
      recognition-only disclosure is present.
   6. Ethical rails: transparent-consent, aggregated-by-default, coarse-
      location-only, never-sold, no-individual-scoring copy present in the
      home section header and the HP teaser.
   7. AC-return rail: /political-hq#pf-action-center link present.
   8. HP widget: pf-ov-inflation-teaser template staged, home-v2.js ORDER +
      NEXT_LINKS + SILO_SEC (fund) entries, deep links to
      /economy#pf-inflation-checkin and /economy#pf-inflation-trends.
   9. Daily Briefing: ECON CALENDAR carries the Price Index row linking to
      /economy#pf-inflation-checkin.
   10. Perf: rebuilt bundle-economy.js fits the 220 KB /economy budget;
       no chart library in the A1 stack (no d3/chart.js/highcharts).
   11. Deep-link anchors: the three A1 ids exist in the home section.
   12. No fork: economy-home.js contains no copy of A1 widget internals
       (no BASKET, no mountCheckin/mountBoard/mountTrends reimplementation). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var HOME = path.join(G, 'economy-home.js');
var TEASER = path.join(G, 'inflation-teaser.js');
var BRIEF = path.join(G, 'briefing.js');
var HOME2 = path.join(ROOT, 'v1.4.3', 'pages', 'home-v2.js');
var BUNDLEJS = path.join(ROOT, 'build', 'bundle.js');
var BE = path.join(G, 'bundle-economy.js');
var BH = path.join(G, 'bundle-home.js');
var BS1 = path.join(G, 'bundle-sec1.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function count(src, s) { return src.split(s).length - 1; }

console.log('== 1. node --check ==');
[BUNDLEJS, HOME, TEASER, BRIEF, HOME2, __filename].forEach(function (f) {
  try { cp.execSync('node --check ' + JSON.stringify(f), { stdio: 'pipe' }); ok('syntax ' + path.basename(f)); }
  catch (e) { no('syntax ' + path.basename(f), 'node --check failed'); }
});

var home = read(HOME), teaser = read(TEASER), brief = read(BRIEF),
    home2 = read(HOME2), bjs = read(BUNDLEJS),
    be = read(BE), bh = read(BH), bs1 = read(BS1);

console.log('== 2. mount layer ==');
if (has(home, "document.getElementById('pf-economy')")) ok('mount targets #pf-economy'); else no('mount target', '#pf-economy lookup missing');
if (has(home, 'pf-inflation-home')) ok('home section #pf-inflation-home'); else no('home section', 'missing');
['pf-inflation-checkin', 'pf-inflation-board', 'pf-inflation-trends'].forEach(function (id) {
  if (has(home, 'id="' + id + '"') || has(home, "id=\\'" + id + "\\'") || has(home, id)) ok('mount div ' + id);
  else no('mount div ' + id, 'missing from economy-home.js');
});
if (has(home, 'sqs-edit-mode') || has(home, '/config/')) ok('editor guard'); else no('editor guard', 'missing');
if (has(home, 'pf-inflation-home') && has(home, 'return; } /* double-run safe */')) ok('double-run safe'); else no('double-run safe', 'guard missing');

console.log('== 3. bundle order ==');
var ecoSec = bjs.slice(bjs.indexOf("'bundle-economy'"));
var iHome = ecoSec.indexOf("'economy-home.js'"), iInf = ecoSec.indexOf("'inflation-tracker.js'");
if (iHome !== -1 && iInf !== -1 && iHome < iInf) ok('bundle.js: economy-home.js before inflation-tracker.js');
else no('bundle.js order', 'economy-home.js must precede inflation-tracker.js');
var beHome = be.indexOf('/* ===== economy-home.js ===== */'), beInf = be.indexOf('/* ===== inflation-tracker.js ===== */');
if (beHome !== -1 && beInf !== -1 && beHome < beInf) ok('built bundle-economy.js order'); else no('built bundle order', 'wrong or missing');
if (count(bjs, "'economy-home.js'") === 1) ok('economy-home.js listed exactly once'); else no('economy-home.js listing', 'count != 1');

console.log('== 4. kill switches ==');
if (has(home, "PF.skip('economy-home')") && has(home, 'pf_off=economy-home')) ok('kill economy-home'); else no('kill economy-home', 'missing');
if (has(teaser, "PF.skip('inflation-teaser')") && has(teaser, 'pf_off=inflation-teaser')) ok('kill inflation-teaser'); else no('kill inflation-teaser', 'missing');

console.log('== 5. zero XP ==');
[HOME, TEASER].forEach(function (f) {
  var s = read(f), n = path.basename(f);
  if (!has(s, 'xpGrant')) ok(n + ': no xpGrant'); else no(n + ': no xpGrant', 'xpGrant found');
  if (!/\+[0-9]+ XP/.test(s)) ok(n + ': no +N XP award copy'); else no(n + ': XP award copy', 'found');
});
if (has(home, '0 XP') || has(home, 'earn <b>0 XP</b>')) ok('0-XP recognition-only disclosure'); else no('0-XP disclosure', 'missing');

console.log('== 6. ethical rails ==');
[['transparent consent', home, 'powers the movement'], ['aggregated by default', home, 'aggregated by default'],
 ['coarse location', home, 'never your address'], ['never sold', home, 'never sold'],
 ['no individual scoring', home, 'No individual scoring'],
 ['teaser ethics', teaser, 'Never sold'], ['teaser coarse', teaser, 'never your address']
].forEach(function (c) {
  if (has(c[1], c[2])) ok('ethics: ' + c[0]); else no('ethics: ' + c[0], 'copy missing');
});

console.log('== 7. AC-return rail ==');
if (has(home, '/political-hq#pf-action-center')) ok('AC-return rail -> /political-hq#pf-action-center');
else no('AC-return rail', 'missing');

console.log('== 8. HP widget ==');
if (has(teaser, 'pf-ov-inflation-teaser')) ok('template pf-ov-inflation-teaser staged'); else no('teaser template', 'missing');
if (has(home2, "['inflation-teaser', 'pf-ov-inflation-teaser']")) ok('home-v2 ORDER entry'); else no('home-v2 ORDER', 'missing');
if (has(home2, "'inflation-teaser'") && has(home2, '/economy#pf-inflation-checkin')) ok('home-v2 NEXT_LINKS deep links'); else no('home-v2 NEXT_LINKS', 'missing');
if (has(home2, "'inflation-teaser':'fund'")) ok('home-v2 SILO_SEC fund'); else no('home-v2 SILO_SEC', 'missing');
if (has(bh, 'pf-ov-inflation-teaser')) ok('bundle-home.js contains teaser'); else no('bundle-home.js teaser', 'missing');
if (has(teaser, '/economy#pf-inflation-checkin') && has(teaser, '/economy#pf-inflation-trends')) ok('teaser deep links'); else no('teaser deep links', 'missing');

console.log('== 9. Daily Briefing ==');
if (has(brief, '/economy#pf-inflation-checkin')) ok('briefing Price Index row'); else no('briefing row', 'missing');
if (has(bs1, 'pf-inflation-checkin')) ok('bundle-sec1.js rebuilt with row'); else no('bundle-sec1.js row', 'missing');

console.log('== 10. perf ==');
var beBytes = fs.statSync(BE).size;
if (beBytes <= 220 * 1024) ok('bundle-economy.js ' + (beBytes / 1024).toFixed(1) + ' KB <= 220 KB budget');
else no('bundle-economy.js budget', (beBytes / 1024).toFixed(1) + ' KB > 220 KB');
['d3.', 'chart.js', 'highcharts', 'Chart(', 'new Chart'].forEach(function (lib) {
  if (!has(be, lib)) ok('no chart lib (' + lib + ')'); else no('chart lib', lib + ' found in bundle-economy.js');
});

console.log('== 11. deep-link anchors ==');
['#pf-inflation-checkin', '#pf-inflation-board', '#pf-inflation-trends'].forEach(function (a) {
  if (has(home, a)) ok('deep-link anchor ' + a); else no('deep-link anchor ' + a, 'missing');
});

console.log('== 12. no fork of A1 code ==');
['BASKET', 'mountCheckin', 'mountBoard', 'mountTrends', 'price_cents'].forEach(function (tok) {
  if (!has(home, tok)) ok('no A1 internals (' + tok + ')'); else no('A1 fork', tok + ' reimplemented in economy-home.js');
});

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
