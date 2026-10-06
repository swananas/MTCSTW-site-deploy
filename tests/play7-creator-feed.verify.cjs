#!/usr/bin/env node
/* tests/play7-creator-feed.verify.cjs — PLAY 7 verification harness
 * (fe/play7-creator-feed, CEO "Go all" 2026-10-06).
 *
 * Covers the two FE surfaces:
 *  A. games/enlistment-ranks.js — weekly FAN FAVORITE honorific on the
 *     Vanguard Wall (pure honorific; votes never become XP).
 *  B. games/cell-hq.js — RALLY CALLS section in Cell HQ: creator-milestone
 *     rally suggestions with a "RALLY AROUND THIS →" take-to-cell handoff
 *     (clipboard copy — no auto-posting) + MARK TAKEN claim.
 *
 * Checks: kill switches (?pf_off=fan-favorite / ?pf_off=cell-rally),
 * fail-soft reads, no-XP (no xpGrant/mintXP/pf-xp in the new code),
 * XSS escaping of server strings, "donate" copy ban, and that the rebuilt
 * bundles carry the new code.
 * Run: node tests/play7-creator-feed.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');
var RANKS_SRC = path.join(ROOT, 'enlistment-ranks.js');
var HQ_SRC = path.join(ROOT, 'cell-hq.js');
var ranks = fs.readFileSync(RANKS_SRC, 'utf8');
var hq = fs.readFileSync(HQ_SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
function has(src, re) { return re.test(src); }

/* ============ A. Vanguard Wall — FAN FAVORITE honorific ============ */
ok('ranks: renderWall takes a fanFav param',
  has(ranks, /function renderWall\(serverWall,\s*fanFav\)/));
ok('ranks: wall fetch passes j.fan_favorite',
  has(ranks, /renderWall\(j\.wall,\s*j\.fan_favorite\)/));
ok('ranks: FAN FAVORITE honorific card markup',
  has(ranks, /u-fanfav/) && has(ranks, /FAN FAVORITE/));
ok('ranks: honorific names Propagandist of the Week',
  has(ranks, /Propagandist of the Week/));
ok('ranks: kill switch ?pf_off=fan-favorite',
  has(ranks, /PF\.skip\(\s*["']fan-favorite["']\s*\)/));
ok('ranks: fail-soft — null/absent favorite renders no card',
  has(ranks, /fanFav && fanFav\.slug/));
ok('ranks: XSS — favorite fields escaped',
  has(ranks, /fslug=esc\(String\(fanFav\.slug\)/) &&
  has(ranks, /fweek=esc\(String\(fanFav\.week/) &&
  has(ranks, /fvotes=esc\(String\(fanFav\.votes/));
ok('ranks: empty wall + no favorite keeps the honest empty state',
  has(ranks, /if\(!names\.length && !ffHtml\)/));
/* no-XP scoped to the ADDED fan-favorite block: extract renderWall and the
   fan-fav CSS, and assert neither mints XP. (The file's pre-existing XP
   economy — award()/settle() — is untouched and out of scope.) */
var rwStart = ranks.indexOf('function renderWall(');
var rwEnd = ranks.indexOf('function renderUnlocks()', rwStart);
var rwBlock = rwStart !== -1 && rwEnd !== -1 ? ranks.slice(rwStart, rwEnd) : '';
ok('ranks: no XP in the fan-favorite code',
  rwBlock.length > 0 && !/xpGrant/.test(rwBlock) && !/mintXP/.test(rwBlock) &&
  !/pf-xp/.test(rwBlock) && !/award\(/.test(rwBlock));
ok('ranks: fan-fav CSS present (red/black, Arial)',
  has(ranks, /\.u-fanfav\{/) && has(ranks, /\.u-ffhonor\{/) &&
  has(ranks, /#c1121f/));

/* ============ B. Cell HQ — RALLY CALLS ============ */
ok('hq: rally section reads rally_suggestions (public GET)',
  has(hq, /api\('rally_suggestions'/));
ok('hq: RALLY AROUND THIS → handoff button',
  has(hq, /RALLY AROUND THIS/));
ok('hq: handoff is clipboard copy (take-to-cell), not a post',
  has(hq, /navigator\.clipboard/) && has(hq, /execCommand\('copy'\)/));
ok('hq: no auto-posting — rally copy path never calls api() to write',
  !has(hq, /data-rally="copy"[\s\S]{0,200}api\(/));
ok('hq: MARK TAKEN claims via creatorfeed rally_act',
  has(hq, /cf_action:'rally_act'/) && has(hq, /type:'creatorfeed'/));
ok('hq: rally_act carries callsign auth',
  has(hq, /rallyActPost/) && has(hq, /PF\.getAuthSecret/));
ok('hq: kill switch ?pf_off=cell-rally',
  has(hq, /PF\.skip\('cell-rally'\)/));
ok('hq: rallyOff gates both placeholder and paint',
  (hq.match(/rallyOff\(\)/g) || []).length >= 3);
ok('hq: fail-soft — empty/failed read removes the section',
  has(hq, /box\.parentNode\.removeChild\(box\)/));
ok('hq: XSS — suggestion title/body escaped',
  has(hq, /esc\(String\(s\.title/) && has(hq, /esc\(String\(s\.body/));
ok('hq: rally CSS present',
  has(hq, /\.hq-rally\{/) && has(hq, /\.hq-rallyitem\{/));
ok('hq: suggestion-only copy (nothing posts itself)',
  has(hq, /Nothing posts itself/));
/* no-XP scoped to the ADDED rally block (paintRallyCalls + helpers). */
var rqStart = hq.indexOf('PLAY 7 (2026-10-06): RALLY CALLS');
var rqEnd = hq.indexOf('/* ---------- TAB 4: BROWSE ---------- */', rqStart);
var rqBlock = rqStart !== -1 && rqEnd !== -1 ? hq.slice(rqStart, rqEnd) : '';
ok('hq: no XP in the rally code',
  rqBlock.length > 0 && !/xpGrant/.test(rqBlock) && !/mintXP/.test(rqBlock) &&
  !/pf-xp/.test(rqBlock));
ok('hq: copy hygiene — no "donate" in rally copy',
  !/donate/i.test((hq.match(/RALLY CALL[\s\S]{0,400}/g) || []).join(' ')));

/* ============ C. Rebuilt bundles carry the new code ============ */
function bundleHas(bundle, needle) {
  var p = path.join(ROOT, bundle);
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').indexOf(needle) !== -1;
}
var sec1 = null, home = null, cells = null;
['bundle-sec1.js', 'bundle-home.js'].forEach(function (b) {
  if (bundleHas(b, 'u-fanfav')) sec1 = b;
});
['bundle-cells.js', 'bundle-cells-h.js'].forEach(function (b) {
  if (bundleHas(b, 'rally_suggestions')) cells = b;
});
ok('bundle: fan-favorite wall code rebuilt into a home bundle (' + (sec1 || 'MISSING') + ')', !!sec1);
ok('bundle: rally section rebuilt into a cells bundle (' + (cells || 'MISSING') + ')', !!cells);

console.log(failures ? '\n' + failures + ' FAILURES' : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
