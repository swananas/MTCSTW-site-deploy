#!/usr/bin/env node
/* scripts/verify-cells-2.0-fe.js — CELLS 2.0 frontend verification harness
   (territory map + competition seasons + recruit funnel + invite deep links,
   2026-10-05). Run from the worktree root:
     node scripts/verify-cells-2.0-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the two new modules, cell-hq.js, cells.js,
      page-mount.js, build/bundle.js, and this harness.
   2. Kill switches: PF.skip('cell-territory-map') / PF.skip('cell-comp-seasons')
      present, ?pf_off= documented in headers, localStorage path covered by
      PF.skip, and page-mount.js mounts both on /cell-war (BLOSSOM S2 split)
      with matching silo keys.
   3. Territory tile grid: exactly 51 tiles (50 states + DC), all codes valid,
      viewBox present, unclaimed fill #3a3a3a, MY CELL gold highlight, legend.
   4. Territory contract: reads territory_map_status; renders regions
      {state, cell_id, cell_name, points}; mine {state, cell_id}; fail-soft
      offline state; no user-level data fields.
   5. Seasons contract: reads cellcomp_season_status + cellcomp_season_history;
      week N of 4 progress; per-metric standings with weekly_wins + total_cnt
      tiebreak; past champions from history; fail-soft offline state.
   6. Recruit panel (cell-hq.js): recruit_funnel auto-attaches auth, invite
      link format /cells?invite=<code>&by=<callsign>, copy button, funnel
      stats (taps -> joins), joiner list.
   7. cells.js join flow: ?invite= + ?by= read on load, by passed to every
      cell_join, fail-silent recruit_click ping once per pageview when by
      is present.
   8. Lexicon gate: zero banned terms (casino lexicon + the banned d-word) in
      the new modules and in the changed lines of cell-hq.js / cells.js.
   9. No XP: no xpGrant, no XP arithmetic in the new modules.
   10. Backslash discipline: no backtick spans in the new modules (the lone-
       backslash hazard class is absent by construction).
   11. Bundle registration: both new files in exactly one bundle
       (bundle-cells), present in the rebuilt bundle-cells.js, absent from the
       slim bundle-cells-h; invite plumbing present in bundle-cells-h via
       cells.js.
   12. Inner-script gate: scripts/check-inner-scripts.js passes on every
       touched file. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var TM = path.join(G, 'cell-territory-map.js');
var CS = path.join(G, 'cell-comp-seasons.js');
var HQ = path.join(G, 'cell-hq.js');
var CELLS = path.join(G, 'cells.js');
var PM = path.join(V, 'pages', 'page-mount.js');
var BUILD = path.join(ROOT, 'build', 'bundle.js');
var BUNDLE_CELLS = path.join(G, 'bundle-cells.js');
var BUNDLE_CELLS_H = path.join(G, 'bundle-cells-h.js');

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function grepHits(src, re) {
  var out = [];
  src.split('\n').forEach(function (l, i) {
    if (re.test(l)) out.push((i + 1) + ':' + l.trim().slice(0, 110));
  });
  return out;
}
/* Changed lines only (added lines in the working-tree diff) — so the lexicon
   and no-XP gates judge this build's code, not the file's history. */
function addedLines(file) {
  try {
    var d = cp.execFileSync('git', ['diff', '--', path.relative(ROOT, file)],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return d.split('\n').filter(function (l) { return l.charAt(0) === '+' && l.charAt(1) !== '+'; })
      .map(function (l) { return l.slice(1); }).join('\n');
  } catch (e) { return read(file); /* untracked or git-less: whole file */ }
}

var tm = read(TM), cs = read(CS), hq = read(HQ), cells = read(CELLS), pm = read(PM);
var hqNew = addedLines(HQ), cellsNew = addedLines(CELLS);

console.log('== 1. syntax ==');
[TM, CS, HQ, CELLS, PM, BUILD, __filename].forEach(function (f) {
  try { cp.execFileSync(process.execPath, ['--check', f], { stdio: 'ignore' }); ok('node --check ' + path.basename(f)); }
  catch (e) { no('node --check ' + path.basename(f), 'syntax error'); }
});

console.log('== 2. kill switches ==');
[['cell-territory-map', tm], ['cell-comp-seasons', cs]].forEach(function (pair) {
  var key = pair[0], src = pair[1];
  if (has(src, 'PF.skip("' + key + '")')) ok('kill: PF.skip(' + key + ')');
  else no('kill ' + key, 'PF.skip("' + key + '") not found');
  if (has(src, '?pf_off=' + key)) ok('kill: ?pf_off=' + key + ' documented');
  else no('kill ' + key, '?pf_off=' + key + ' not documented in header');
});
if (has(pm, "['cell-territory-map', 'pf-ov-territory-map']") &&
    has(pm, "['cell-comp-seasons', 'pf-ov-cellcomp-seasons']") &&
    has(pm, "'pf-cell-war'"))
  ok('page-mount: both silos mounted on /cell-war (BLOSSOM S2 split off /cells) with matching template ids');
else no('page-mount', 'order entries missing or template ids mismatched');

console.log('== 3. territory tile grid ==');
var tileM = /var TILES=\[([\s\S]*?)\];/.exec(tm);
if (!tileM) { no('tiles', 'TILES constant not found'); }
else {
  var codes = [];
  tileM[1].replace(/\["([A-Z]{2})",\d+,\d+\]/g, function (m, c) { codes.push(c); return m; });
  var VALID = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
  var bad = codes.filter(function (c) { return VALID.indexOf(c) === -1; });
  var dup = codes.filter(function (c, i) { return codes.indexOf(c) !== i; });
  if (codes.length === 51 && !bad.length && !dup.length)
    ok('tiles: 51 unique valid codes (50 states + DC)');
  else no('tiles', 'count=' + codes.length + ' bad=' + bad.join(',') + ' dup=' + dup.join(','));
}
if (has(tm, 'viewBox="0 0 600 500"')) ok('tiles: SVG viewBox present');
else no('tiles', 'viewBox missing');
if (has(tm, '"#3a3a3a"') || has(tm, "'#3a3a3a'") || has(tm, '#3a3a3a')) ok('tiles: unclaimed gray fill');
else no('tiles', 'unclaimed gray fill not found');
if (has(tm, 'MY CELL')) ok('tiles: MY CELL highlight copy');
else no('tiles', 'MY CELL highlight missing');

console.log('== 4. territory contract ==');
[['territory_map_status', 'action'], ['regions', 'regions array'],
 ['cell_id', 'cell_id'], ['cell_name', 'cell_name'], ['points', 'points'],
 ['mine', 'mine block']].forEach(function (pair) {
  if (has(tm, pair[0])) ok('territory: reads ' + pair[1]);
  else no('territory contract', pair[0] + ' missing');
});
if (has(tm, 'offline right now')) ok('territory: fail-soft offline state');
else no('territory contract', 'offline state missing');
/* No user-level data: the map must never reference per-user fields in
   executable code (comments describing the privacy posture are stripped). */
var tmCode = tm.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
var userish = grepHits(tmCode, /user_id|device_id|ip_address|latitude|longitude|geoloc/i);
if (!userish.length) ok('territory: no user-level data fields');
else no('territory privacy', 'user-level fields: ' + userish.join(' | '));

console.log('== 5. seasons contract ==');
[['cellcomp_season_status', 'status'], ['cellcomp_season_history', 'history'],
 ['weekly_wins', 'weekly-win points'], ['total_cnt', 'tiebreak totals'],
 ['WEEK ', 'week N of 4 progress'], ['Past Champions', 'past champions'],
 ['sealed_at', 'sealed_at']].forEach(function (pair) {
  if (has(cs, pair[0])) ok('seasons: ' + pair[1]);
  else no('seasons contract', pair[0] + ' missing');
});
/* Real backend shape (2026-10-05 gate fix): metrics is an OBJECT keyed by
   metric -> {metric_label, standings:[...]}; week progress from
   week_index / season_weeks. Regression guard for the mismatch that left
   standings stuck on the empty state and WEEK 1 OF 4. */
[['week_index', 'week_index week field'], ['season_weeks', 'season_weeks total'],
 ['metric_label', 'metric_label display label'], ['standings', 'standings rows']].forEach(function (pair) {
  if (has(cs, pair[0])) ok('seasons: ' + pair[1]);
  else no('seasons contract (real shape)', pair[0] + ' missing');
});
if (has(cs, 'offline right now')) ok('seasons: fail-soft offline state');
else no('seasons contract', 'offline state missing');
if (has(cs, 'never mint XP')) ok('seasons: zero-XP honorific copy');
else no('seasons contract', 'zero-XP copy missing');

console.log('== 6. recruit panel (cell-hq.js) ==');
if (has(hq, 'action==="recruit_funnel"')) ok('recruit: recruit_funnel auto-attaches auth');
else no('recruit', 'recruit_funnel missing from auth-attach condition');
if (has(hq, 'recruit_funnel')) ok('recruit: funnel read present');
else no('recruit', 'recruit_funnel not referenced');
if (has(hq, '/cells?invite=') && has(hq, '&by=')) ok('recruit: invite link format /cells?invite=<code>&by=<callsign>');
else no('recruit', 'invite link format missing');
if (has(hq, 'data-hq="recruit-copy"') && has(hq, "a==='recruit-copy'")) ok('recruit: copy button + delegation');
else no('recruit', 'copy button or delegation missing');
if (has(hq, 'taps') && has(hq, 'joined')) ok('recruit: funnel stats (taps -> joins)');
else no('recruit', 'funnel stats missing');
if (has(hq, 'joiners') && has(hq, 'joined_day')) ok('recruit: joiner list (callsign + joined_day)');
else no('recruit', 'joiner list missing');
if (has(hq, 'id="hqRecruit"')) ok('recruit: panel placeholder in detail view');
else no('recruit', 'hqRecruit placeholder missing');

console.log('== 7. invite join flow (cells.js) ==');
if (/[?&]invite=\(\[A-Za-z0-9_-\]/.test(cells) || has(cells, '[?&]invite=')) ok('invite: ?invite= read on load');
else no('invite', '?invite= param read missing');
if (has(cells, '[?&]by=')) ok('invite: ?by= read on load');
else no('invite', '?by= param read missing');
var joinCalls = (cells.match(/api\("cell_join",\{[^}]*by:inviteBy\(\)/g) || []).length;
if (joinCalls >= 3) ok('invite: by passed to ' + joinCalls + ' cell_join calls');
else no('invite', 'by passed to only ' + joinCalls + ' cell_join calls (want >=3)');
if (has(cells, 'recruit_click') && has(cells, '_pfInvitePinged')) ok('invite: fail-silent recruit_click ping once per pageview');
else no('invite', 'recruit_click ping missing or not once-per-pageview guarded');

console.log('== 8. lexicon gate ==');
var HARD = /casino|white market|jackpot|high roller|roulette|coin flip|slots|rake\b|dice|double-or-nothing|donat/i;
var lexNew = grepHits(tm + '\n' + cs + '\n' + hqNew + '\n' + cellsNew, HARD);
if (!lexNew.length) ok('lexicon: zero banned terms in new/changed code');
else no('lexicon', 'banned terms: ' + lexNew.join(' | '));

console.log('== 9. no XP ==');
var xpNew = grepHits(tm + '\n' + cs + '\n' + hqNew + '\n' + cellsNew, /xpGrant|\+ ?\d+ ?XP|XP ?\+|mint/i);
xpNew = xpNew.filter(function (h) { return !/never (mint )?XP|never XP/i.test(h); });
if (!xpNew.length) ok('no-XP: no grants or XP arithmetic in new/changed code');
else no('no-XP', 'XP surface: ' + xpNew.join(' | '));

console.log('== 10. backslash discipline ==');
/* The lone-backslash hazard class: a backtick or ${ inside the INNER script
   would terminate/interpolate the OUTER template literal. Each new module
   stages exactly one outer template literal (2 backticks) and its inner
   script must contain neither backticks nor ${. */
var btOk = true;
[[TM, tm], [CS, cs]].forEach(function (pair) {
  var f = pair[0], src = pair[1];
  var nBt = (src.match(/`/g) || []).length;
  var inner = /<script>([\s\S]*?)<\\\/script>/.exec(src);
  var innerBad = inner && (inner[1].indexOf('`') !== -1 || inner[1].indexOf('${') !== -1);
  if (nBt === 2 && !innerBad) ok('backslash: ' + path.basename(f) + ' — single outer literal, clean inner script');
  else { btOk = false; no('backslash', path.basename(f) + ' backticks=' + nBt + ' innerBad=' + !!innerBad); }
  /* Lone-backslash hazard regression (2026-10-05): inside the outer template
     literal, a single \ before s/d/w/n/u mangles when cooked (/\s+/g became
     /s+/g and silently broke metric labels). Rule for these modules: every
     backslash inside the inner script is doubled (cooks to a literal
     backslash) — after removing \\ pairs, none may remain. */
  if (inner) {
    var stripped = inner[1].replace(/\\\\/g, '');
    var lone = stripped.match(/\\/g) || [];
    if (!lone.length) ok('backslash: ' + path.basename(f) + ' — no lone backslashes in inner script');
    else no('backslash', path.basename(f) + ' has ' + lone.length + ' lone backslash(es) — will mangle when cooked');
  }
});

console.log('== 11. bundle registration ==');
var bsrc = read(BUILD);
[['cell-territory-map.js', 1], ['cell-comp-seasons.js', 1]].forEach(function (pair) {
  var f = pair[0];
  /* count occurrences inside the bundle-cells SECTIONS block */
  var blk = /'bundle-cells': \[([\s\S]*?)\],\n  'bundle-create'/.exec(bsrc);
  var n = blk ? (blk[1].match(new RegExp("'" + f.replace(/\./g, '\\.') + "'", 'g')) || []).length : 0;
  if (n === 1) ok('bundle: ' + f + ' registered once in bundle-cells');
  else no('bundle registration', f + ' in bundle-cells ' + n + 'x (want 1)');
  var total = (bsrc.match(new RegExp("'" + f.replace(/\./g, '\\.') + "'", 'g')) || []).length;
  if (total === 1) ok('bundle: ' + f + ' in exactly one bundle total');
  else no('bundle registration', f + ' in ' + total + ' bundles total (want 1)');
});
var bc = read(BUNDLE_CELLS);
if (has(bc, 'pf-ov-territory-map') && has(bc, 'pf-ov-cellcomp-seasons'))
  ok('bundle-cells.js: both new modules present in rebuilt bundle');
else no('bundle-cells.js', 'new module template ids missing from rebuilt bundle');
var bch = read(BUNDLE_CELLS_H);
if (!has(bch, 'pf-ov-territory-map') && !has(bch, 'pf-ov-cellcomp-seasons'))
  ok('bundle-cells-h.js: slim bundle untouched by new modules');
else no('bundle-cells-h.js', 'new modules leaked into the slim bundle');
if (has(bch, 'recruit_click') && has(bch, 'acceptInviteDeepLink'))
  ok('bundle-cells-h.js: invite plumbing present via cells.js');
else no('bundle-cells-h.js', 'invite plumbing missing');

console.log('== 12. inner-script gate ==');
try {
  cp.execFileSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), TM, CS, HQ, CELLS, PM],
    { stdio: 'pipe' });
  ok('inner-script syntax gate passes on all touched files');
} catch (e) { no('inner-script gate', String((e.stdout || '') + (e.stderr || '')).slice(0, 300)); }

console.log('\ncells-2.0 FE: ' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
