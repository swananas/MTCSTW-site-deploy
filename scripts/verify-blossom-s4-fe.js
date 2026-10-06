#!/usr/bin/env node
/* scripts/verify-blossom-s4-fe.js — Project Blossom S4 + C1 + C4 frontend
   verification (fe/blossom-s4-economy-fund, 2026-10-06). Run from the
   worktree root: node scripts/verify-blossom-s4-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on every new/edited file.
   2. PAGE_ORDERS: 'pf-peoples-cpi' (title THE PEOPLE'S PRICE INDEX, spine
      FIGHT, self-mounting entry) and 'pf-fund' (title THE PROPAGANDA FUND,
      sub 'Every cent, accounted for.', spine ORGANIZE, self-mounting).
   3. SELF registry: 'peoples-cpi' -> #pf-peoples-cpi (kill peoples-cpi),
      'fund' -> #pf-fund (kill fund); FE_MOUNT_IDS lists both; mountHeader
      stamps data-pf-spine-phase from cfg.spine.
   4. Bundle composition: 'bundle-peoples-cpi' + 'bundle-fund' entries exist
      in build/bundle.js, each file listed exactly once; rebuilt bundles
      exist and parse.
   5. Footer: isPeoplesCpi/isFund detection, onV2 coverage, JS_GAMES maps to
      games/bundle-peoples-cpi.js / games/bundle-fund.js.
   6. Honesty gates in peoples-cpi.js: CPI_LABELS module owns all badge
      strings (no inline badge literals outside it); minimum-n client gate
      (enough_data && sample_count>=5 && contributors>=3); dual-chart
      fail-closed on missing kind label; null buckets break the SVG line
      (never interpolate); headline honest-empty states; official-null
      pending copy; no invented-data paths.
   7. Kill switches: PF.skip('peoples-cpi') / PF.skip('fund') master kills
      present in the silos.
   8. Copy grep: no "predict", "forecast", "will be", "true CPI",
      "real inflation" tokens in the silo.
   9. No XP in either silo outside the explicit ZERO ECONOMY doc line and
      the verbatim ethics line.
   10. Ethics line verbatim in peoples-cpi.js.
   11. /fund structure-only: the empty-honest copy verbatim; no figure
       rendering (no median_cents / money() / price tokens) in the fund silo.
   12. Economy cross-link: /economy carries THE INDEX -> /peoples-cpi.
   13. Next Move exits: /peoples-cpi -> /economy#pf-inflation-checkin;
       /fund -> /follow-the-money.
   14. Spine phases: FIGHT on pf-peoples-cpi, ORGANIZE on pf-fund.
   15. check-inner-scripts.js passes on the new silos. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var CPI = path.join(G, 'peoples-cpi.js');
var FUND = path.join(G, 'propaganda-fund.js');
var PM = path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js');
var BB = path.join(ROOT, 'build', 'bundle.js');
var FOOT = path.join(ROOT, 'loader', 'footer_v144_final.html');
var EHOME = path.join(G, 'economy-home.js');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function count(src, s) { return src.split(s).length - 1; }

console.log('== 1. node --check ==');
[['v1.4.3/games/peoples-cpi.js', CPI],
 ['v1.4.3/games/propaganda-fund.js', FUND],
 ['v1.4.3/pages/page-mount.js', PM],
 ['build/bundle.js', BB],
 ['v1.4.3/games/economy-home.js', EHOME],
 ['scripts/verify-blossom-s4-fe.js', path.join(ROOT, 'scripts', 'verify-blossom-s4-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

var pm = read(PM), cpi = read(CPI), fund = read(FUND), bb = read(BB), foot = read(FOOT), eh = read(EHOME);

console.log('== 2. PAGE_ORDERS ==');
if (has(pm, "'pf-peoples-cpi': {") && has(pm, "title: \"THE PEOPLE'S PRICE INDEX\""))
  ok('PAGE_ORDERS: pf-peoples-cpi with title THE PEOPLE\'S PRICE INDEX');
else no('PAGE_ORDERS', "pf-peoples-cpi entry or title missing");
if (has(pm, "spine: 'FIGHT',") && pm.indexOf("'pf-peoples-cpi'") < pm.indexOf("spine: 'FIGHT',") &&
    pm.indexOf("spine: 'FIGHT',") < pm.indexOf("'pf-fund'"))
  ok('PAGE_ORDERS: pf-peoples-cpi declares spine FIGHT');
else no('PAGE_ORDERS', "pf-peoples-cpi spine FIGHT missing/misplaced");
if (has(pm, "['peoples-cpi', null]")) ok('PAGE_ORDERS: pf-peoples-cpi self-mounting entry');
else no('PAGE_ORDERS', "['peoples-cpi', null] missing");
if (has(pm, "'pf-fund': {") && has(pm, "title: 'THE PROPAGANDA FUND'") &&
    has(pm, "sub: 'Every cent, accounted for.'"))
  ok('PAGE_ORDERS: pf-fund with title + sub');
else no('PAGE_ORDERS', 'pf-fund entry/title/sub missing');
if (has(pm, "spine: 'ORGANIZE',")) ok('PAGE_ORDERS: pf-fund declares spine ORGANIZE');
else no('PAGE_ORDERS', "pf-fund spine ORGANIZE missing");
if (has(pm, "['fund', null]")) ok('PAGE_ORDERS: pf-fund self-mounting entry');
else no('PAGE_ORDERS', "['fund', null] missing");

console.log('== 3. SELF registry + FE_MOUNT_IDS + header stamp ==');
if (has(pm, "'peoples-cpi': { div: 'pf-peoples-cpi', kill: 'peoples-cpi' }"))
  ok("SELF: peoples-cpi -> #pf-peoples-cpi (kill peoples-cpi)");
else no('SELF', "peoples-cpi registry entry missing");
if (has(pm, "'fund': { div: 'pf-fund', kill: 'fund' }"))
  ok("SELF: fund -> #pf-fund (kill fund)");
else no('SELF', "fund registry entry missing");
if (has(pm, "'pf-peoples-cpi'") && has(pm, "'pf-fund',") && /FE_MOUNT_IDS = \[[\s\S]*'pf-peoples-cpi'[\s\S]*'pf-fund'/.test(pm))
  ok('FE_MOUNT_IDS: both mount divs registered');
else no('FE_MOUNT_IDS', 'mount divs missing from registry');
if (has(pm, "data-pf-spine-phase") && has(pm, "cfg.spine"))
  ok('mountHeader: stamps data-pf-spine-phase from cfg.spine');
else no('mountHeader', 'spine-phase stamp missing');

console.log('== 4. bundle composition ==');
[['bundle-peoples-cpi', 'peoples-cpi.js'], ['bundle-fund', 'propaganda-fund.js']].forEach(function (pair) {
  var n = count(bb, "'" + pair[0] + "'");
  if (n === 1 && count(bb, "'" + pair[1] + "'") === 1)
    ok("bundle: '" + pair[0] + "' lists '" + pair[1] + "' exactly once");
  else no('bundle', "'" + pair[0] + "'/" + pair[1] + "' counts: " + n + "/" + count(bb, "'" + pair[1] + "'"));
});
[['bundle-peoples-cpi.js', 'peoples-cpi'], ['bundle-fund.js', 'fund']].forEach(function (pair) {
  var p = path.join(G, pair[0]);
  if (fs.existsSync(p) && has(read(p), pair[1])) {
    try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok('bundle built: ' + pair[0] + ' exists + parses'); }
    catch (e) { no('bundle', pair[0] + ' fails node --check'); }
  } else no('bundle', pair[0] + ' missing or stale');
});

console.log('== 5. footer loader ==');
if (has(foot, "isPeoplesCpi=!!document.getElementById('pf-peoples-cpi')") &&
    has(foot, "isFund=!!document.getElementById('pf-fund')"))
  ok('footer: isPeoplesCpi / isFund page detection');
else no('footer', 'page detection missing');
if (has(foot, '||isPeoplesCpi||') && has(foot, '||isFund||'))
  ok('footer: both pages in onV2');
else no('footer', 'onV2 coverage missing');
if (has(foot, "isPeoplesCpi?['games/bundle-peoples-cpi.js']") &&
    has(foot, "isFund?['games/bundle-fund.js']"))
  ok('footer: JS_GAMES maps to bundle-peoples-cpi.js / bundle-fund.js');
else no('footer', 'JS_GAMES entries missing');

console.log('== 6. honesty gates (peoples-cpi.js) ==');
/* CPI_LABELS module owns every badge string: every occurrence of the four
   §2.1 label literals must sit inside the module block. */
(function labelModule() {
  var mStart = cpi.indexOf('var CPI_LABELS = {');
  if (mStart === -1) { no('labels', 'CPI_LABELS module missing'); return; }
  var depth = 0, mEnd = -1;
  for (var i = cpi.indexOf('{', mStart); i < cpi.length; i++) {
    if (cpi[i] === '{') depth++;
    else if (cpi[i] === '}') { depth--; if (!depth) { mEnd = i; break; } }
  }
  ok('labels: CPI_LABELS module present');
  var lits = ['CROWDSOURCED', 'crowdsourced, not official', 'OFFICIAL CPI', 'Two ways of counting. Two separate lines. Never merged.'];
  var bad = [];
  lits.forEach(function (lit) {
    var at = -1;
    while ((at = cpi.indexOf(lit, at + 1)) !== -1) {
      if (at < mStart || at > mEnd) bad.push(lit + ' @' + at);
    }
  });
  if (!bad.length) ok('labels: all §2.1 badge literals live inside CPI_LABELS only');
  else no('labels', 'inline badge literals outside module: ' + bad.join(', '));
  if (has(cpi, 'CPI_LABELS.COMMUNITY_FULL') && has(cpi, 'CPI_LABELS.OFFICIAL_FULL') &&
      has(cpi, 'CPI_LABELS.DUAL_HEADER') && has(cpi, 'CPI_LABELS.COMMUNITY_BADGE'))
    ok('labels: render paths reference CPI_LABELS (no inline label strings)');
  else no('labels', 'render paths do not all reference CPI_LABELS');
})();
/* Minimum-n client gate. */
if (/enough_data && Number\(b\.sample_count\) >= 5 && Number\(b\.contributors\) >= 3/.test(cpi))
  ok('honesty: minimum-n client gate (enough_data && n>=5 && >=3 contributors)');
else no('honesty', 'minimum-n client gate missing');
/* Dual-chart fail-closed. */
if (/community\.kind !== 'community' \|\| !official \|\| official\.kind !== 'official'/.test(cpi) &&
    has(cpi, 'The chart needs both labeled series to draw honestly'))
  ok('honesty: dual chart fails closed without both kind labels');
else no('honesty', 'dual-chart fail-closed missing');
/* Null buckets break the line. */
if (has(cpi, 'if (pts[k].v == null) { pen = false; continue; }') &&
    has(cpi, 'null bucket BREAKS the line'))
  ok('honesty: null trend buckets break the SVG line (never interpolated)');
else no('honesty', 'null-bucket line-break missing');
/* Headline honest-empty states. */
if (has(cpi, 'Not enough reports yet to publish a national number. Report a price and be part of the first count.'))
  ok('honesty: headline honest-empty state (never a figure)');
else no('honesty', 'headline empty state copy missing');
if (has(cpi, 'The national composite is still being wired'))
  ok('honesty: backend-gap (§6.3) wiring panel, no invented composite');
else no('honesty', 'backend-gap wiring panel missing');
/* Official-null honesty. */
if (has(cpi, 'Official baseline pending') && has(cpi, 'official baseline pending'))
  ok('honesty: official-null pending copy');
else no('honesty', 'official-null pending copy missing');
if (has(cpi, 'fred.stlouisfed.org/series/CPIAUCNS'))
  ok('honesty: official series ID + source link');
else no('honesty', 'official source link missing');
/* The silo writes the badge with \u2014/\u26a0 escape sequences (rendered as
   —/⚠ in the browser); accept both the escape form and the literal char. */
if (has(cpi, 'days old \\u2014 expected monthly') || has(cpi, 'days old \u2014 expected monthly'))
  ok('honesty: stale-official badge present');
else no('honesty', 'stale badge copy missing');
/* Rebase disclosure. */
if (has(cpi, 'Both series rebased to 100 at') && has(cpi, 'Rebased values are not official index levels'))
  ok('honesty: rebase disclosure on the chart');
else no('honesty', 'rebase disclosure missing');

console.log('== 7. kill switches ==');
if (has(cpi, "PF.skip('peoples-cpi')")) ok("kill: PF.skip('peoples-cpi') master");
else no('kill', "PF.skip('peoples-cpi') missing");
if (has(fund, "PF.skip('fund')")) ok("kill: PF.skip('fund') master");
else no('kill', "PF.skip('fund') missing");
if (has(cpi, '?pf_off=peoples-cpi') && has(fund, '?pf_off=fund'))
  ok('kill: ?pf_off= switches documented in silo headers');
else no('kill', 'header docs missing a ?pf_off= switch');
/* Silent no-op when the mount div is absent. */
if (has(cpi, "getElementById('pf-peoples-cpi')") && has(cpi, 'if (!host) { return; }'))
  ok('mount: peoples-cpi silent no-op when #pf-peoples-cpi absent');
else no('mount', 'peoples-cpi no-op guard missing');
if (has(fund, "getElementById('pf-fund')") && has(fund, 'if (!host) { return; }'))
  ok('mount: fund silent no-op when #pf-fund absent');
else no('mount', 'fund no-op guard missing');

console.log('== 8. copy grep (no invention voice) ==');
var banned = ['predict', 'forecast', 'will be', 'true CPI', 'real inflation'];
var bannedHits = [];
banned.forEach(function (w) {
  var re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (re.test(cpi)) bannedHits.push(w);
});
if (!bannedHits.length) ok('copy: no predict/forecast/will-be/true-CPI/real-inflation tokens');
else no('copy', 'banned tokens in silo: ' + bannedHits.join(', '));

console.log('== 9. no XP ==');
[['peoples-cpi', cpi], ['fund', fund]].forEach(function (pair) {
  /* Token-boundary match: a naive /xp/i flags "expected"/"explainer".
     The allowed doc phrases are allowlisted below. */
  var hits = [];
  pair[1].split('\n').forEach(function (l, i) {
    if (l.indexOf('ZERO ECONOMY') !== -1) return;
    if (l.indexOf('Recognition only: 0 XP.') !== -1) return;
    if (/\bno XP\b/i.test(l)) return; /* doc line: "no XP anywhere in this module" */
    if (/\bxp\b/i.test(l) || /xpGrant/i.test(l)) hits.push((i + 1) + ':' + l.trim().slice(0, 70));
  });
  if (!hits.length) ok('no-XP: ' + pair[0] + ' clean (only ZERO ECONOMY doc line, ethics line, no-XP doc phrases)');
  else no('no-XP', pair[0] + ' XP tokens: ' + hits.join(' | '));
});

console.log('== 10. ethics line verbatim ==');
/* The silo stores the line with \u2014 escapes (rendered as — in the browser);
   match the source escape form. */
if (has(cpi, 'Your reports become anonymous community medians. Never sold. ZIP or city only \\u2014 never your address, never your name. Recognition only: 0 XP.'))
  ok('ethics: line verbatim in peoples-cpi.js');
else no('ethics', 'ethics line not verbatim');

console.log('== 11. /fund structure-only ==');
/* Escape form in source (\u2019/\u2014 render as ’/— in the browser). */
if (has(fund, 'The transparency report is being compiled. No figures publish until they\\u2019re verified \\u2014 we\\u2019d rather show you nothing than show you something shaky.'))
  ok('fund: empty-honest copy verbatim');
else no('fund', 'empty-honest copy not verbatim');
var figHits = [];
['median_cents', 'money(', 'price_cents', 'sample_count'].forEach(function (t) {
  if (has(fund, t)) figHits.push(t);
});
if (!figHits.length) ok('fund: no figure-rendering tokens (no numbers, no placeholders)');
else no('fund', 'figure tokens present: ' + figHits.join(', '));
if (!/\$\d/.test(fund)) ok('fund: no dollar figures');
else no('fund', 'dollar figure found');

console.log('== 12. economy cross-link ==');
if (has(eh, '/peoples-cpi') && has(eh, 'THE INDEX'))
  ok('economy: THE INDEX -> /peoples-cpi link row present');
else no('economy', 'cross-link missing');

console.log('== 13. Next Move exits ==');
if (has(cpi, '/economy#pf-inflation-checkin') && has(cpi, 'NEXT MOVE'))
  ok('exit: /peoples-cpi Next Move -> /economy#pf-inflation-checkin');
else no('exit', '/peoples-cpi Next Move exit missing');
if (has(fund, '/follow-the-money') && has(fund, 'NEXT MOVE'))
  ok('exit: /fund Next Move -> /follow-the-money');
else no('exit', '/fund Next Move exit missing');

console.log('== 14. spine phases ==');
var cpiBlock = pm.slice(pm.indexOf("'pf-peoples-cpi'"), pm.indexOf("'pf-fund'"));
var fundBlock = pm.slice(pm.indexOf("'pf-fund'"), pm.indexOf("'pf-fund'") + 1200);
if (has(cpiBlock, "spine: 'FIGHT'")) ok('spine: pf-peoples-cpi = FIGHT');
else no('spine', 'pf-peoples-cpi not FIGHT');
if (has(fundBlock, "spine: 'ORGANIZE'")) ok('spine: pf-fund = ORGANIZE');
else no('spine', 'pf-fund not ORGANIZE');

console.log('== 15. inner-script gate ==');
try {
  cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), CPI, FUND], { stdio: 'pipe' });
  ok('inner-script gate: new silos parse clean');
} catch (e) { no('inner-script gate', 'failed on new silos'); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
