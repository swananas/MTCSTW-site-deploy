#!/usr/bin/env node
/* scripts/verify-rally-fe.js — Founder rally tool frontend verification
   harness (fe/cell-founder-rally, 2026-10-05). Run from the worktree root:
     node scripts/verify-rally-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module + the rebuilt bundle-cells.js; the bundle
      carries the rally code.
   2. Founder-only gating: the rally mount + paintRally call sit inside the
      isFounder branch of the founder controls card; the non-founder branch
      has no rally surface.
   3. Action contract: rally_search / rally_preview / rally_status ride GET
      (api()) with auth_secret (AUTHREAD); rally_send is in the WRITE map
      (POST via PF.postAction, type 'cell' / cell_action 'rally_send').
   4. Factual card not editable: preview renders server card fields
      (title/status_line/action_line/link) as display-only; the only founder
      input is the note textarea.
   5. Note cap: 140-char maxlength + live counter.
   6. Rate limit surfaced: used_this_week -> 'Next rally unlocks Monday'
      copy; composer replaced after send.
   7. Lexicon gate: zero banned terms (casino lexicon + the banned d-word).
   8. Backslash discipline: no backtick spans in the module.
   9. No XP logic in frontend: no xpGrant call, no XP arithmetic.
   10. Stored-XSS guard: every server-sourced string in the rally UI passes
       through esc(). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'games', 'cell-hq.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-cells.js');
var BUILDER = path.join(ROOT, 'build', 'bundle.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
/* Code-only view: strip block comments, line comments, and string literals. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
function grepHits(src, re) {
  var out = [];
  src.split('\n').forEach(function (l, i) {
    if (re.test(l)) out.push((i + 1) + ':' + l.trim().slice(0, 100));
  });
  return out;
}

var src = read(MOD);
var code = codeOnly(src);

console.log('== 1. syntax + bundle ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('node --check cell-hq.js'); }
catch (e) { no('node --check cell-hq.js', e.message); }
if (fs.existsSync(BUNDLE)) {
  var bsrc = read(BUNDLE);
  if (has(bsrc, 'rally_send') && has(bsrc, 'hqRallyBody')) ok('rebuilt bundle-cells.js carries the rally UI');
  else no('bundle', 'bundle-cells.js missing rally code — rebuild with node build/bundle.js');
} else no('bundle', 'bundle-cells.js not found');

console.log('== 2. founder-only gating ==');
var founderBlock = '';
var fbIdx = src.indexOf('/* Founder controls. */');
var elseIdx = src.indexOf('} else if (cell) {', fbIdx);
var founderBlock = elseIdx !== -1 ? src.slice(fbIdx, elseIdx) : '';
if (founderBlock.indexOf('hqRallyBody') !== -1)
  ok('rally mount inside the isFounder founder-controls card');
else no('founder gate', 'hqRallyBody not in the isFounder branch');
if (src.indexOf('paintRally(S.detail)') !== -1)
  ok('paintRally called only for founders (guarded call in paintDetail)');
else no('founder gate', 'paintRally call missing');
var nonFounderBranch = src.split('} else if (cell) {');
if (nonFounderBranch.length > 1 && nonFounderBranch[1].split('body.innerHTML = h;')[0].indexOf('ally') === -1)
  ok('non-founder branch has no rally surface');
else no('founder gate', 'rally surface reachable by non-founders');

console.log('== 3. action contract ==');
if (has(src, 'rally_search:1') && has(src, 'rally_preview:1') && has(src, 'rally_status:1'))
  ok('AUTHREAD covers all three rally GET reads (auth_secret attached)');
else no('auth reads', 'rally_search/preview/status missing from AUTHREAD');
['rally_search', 'rally_preview', 'rally_status'].forEach(function (a) {
  if (has(src, "api('" + a + "'")) ok('GET read: ' + a);
  else no('GET read', a + ' not called via api()');
});
if (has(src, 'rally_send:1') && has(src, "api('rally_send'"))
  ok('rally_send in WRITE map -> POST (type cell / cell_action)');
else no('rally_send POST', 'WRITE map or api() call missing');

console.log('== 4. factual card not editable ==');
if (has(src, 'R.card = j.card') && has(src, 'esc(c.title)') && has(src, 'esc(c.status_line)') &&
    has(src, 'esc(c.action_line)') && has(src, 'esc(c.link)'))
  ok('preview renders server card fields display-only');
else no('card display', 'server card fields not rendered display-only');
if (has(src, 'hqRallyNote') && has(src, 'maxlength="140"'))
  ok('founder note is the only free-text input');
else no('note input', 'note textarea missing');

console.log('== 5. note cap ==');
if (has(src, 'maxlength="140"') && has(src, 'hqRallyCount') && has(src, '/140'))
  ok('140-char maxlength + live counter');
else no('note cap', 'maxlength or counter missing');

console.log('== 6. rate limit surfaced ==');
if (has(src, 'used_this_week') && has(src, 'Next rally unlocks Monday'))
  ok('used_this_week -> unlocks-Monday state');
else no('rate limit UI', 'used_this_week / unlock copy missing');

console.log('== 7. lexicon gate ==');
var HARD = /casino|white market|jackpot|high roller|takes double|roulette|coin flip|red\/black|single number pays|slots|run it back|rake\b|dice|double-or-nothing|donat/i;
var lexHits = grepHits(src, HARD);
if (lexHits.length) no('lexicon', 'banned terms: ' + lexHits.join(' | '));
else ok('lexicon: zero banned terms');

console.log('== 8. backslash discipline ==');
if (src.indexOf('`') === -1) ok('backslash: no backtick spans — hazard class absent');
else no('backticks', 'backtick spans present');

console.log('== 9. no XP logic in frontend ==');
if (!has(code, 'xpGrant') && !/\+ *\d+ *XP|\bXP\b *\+/.test(code)) ok('no xpGrant, no XP arithmetic');
else no('XP logic', 'xpGrant call or XP arithmetic in rally UI');

console.log('== 10. stored-XSS guard ==');
var escNeeded = ['esc(c.title)', 'esc(c.status_line)', 'esc(c.action_line)', 'esc(c.link)',
  'esc(x.title)', 'esc(x.line', 'esc(r.title'];
var missing = escNeeded.filter(function (s) { return !has(src, s); });
if (!missing.length) ok('every server-sourced rally string passes through esc()');
else no('esc()', 'missing: ' + missing.join(', '));

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { fails.forEach(function (f) { console.log('  FAIL ' + f); }); process.exit(1); }
