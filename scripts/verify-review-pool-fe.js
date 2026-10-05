#!/usr/bin/env node
/* scripts/verify-review-pool-fe.js — Community Review frontend verification
   harness (wave-community-review-fe, 2026-10-05). Run from the worktree root:
     node scripts/verify-review-pool-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, build/bundle.js, and this harness.
   2. Blind UI by construction: the module reads no identity or live-split
      fields (submitter / vote split / gold-standard markers / voter
      identities) — in code OR comments.
   3. Kill switch: ?pf_off=review-pool via PF.skip('review-pool') + the
      header documents it; silent no-op when #pf-review-pool is absent.
   4. Settlement display states: win (stake returned + reward) and loss
      (stake lost) copy, sourced from server values.
   5. Empty-pool state: review_next empty -> discovery 'empty' view.
   6. Claim timer: expires_at countdown display.
   7. Lexicon gate: zero banned terms (casino lexicon + the banned d-word).
   8. Backslash discipline: no backtick spans in the module, so the lone-
      backslash hazard class is absent by construction (asserted).
   9. No XP logic in frontend: no xpGrant call, no arithmetic on economy
      values, no fallback mint math (server values displayed only).
   10. Bundle registration: review-pool.js in exactly one bundle
       (bundle-cells) and present in the rebuilt bundle-cells.js. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var MOD = path.join(G, 'review-pool.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
/* Code-only view: strip block comments, line comments, and string literals,
   so prose in comments/docs can't mask or fake a code-level check. */
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

console.log('== 1. node --check ==');
[['v1.4.3/games/review-pool.js', MOD],
 ['build/bundle.js', path.join(ROOT, 'build', 'bundle.js')],
 ['scripts/verify-review-pool-fe.js', path.join(ROOT, 'scripts', 'verify-review-pool-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

var src = read(MOD);
var code = codeOnly(src);

console.log('== 2. blind UI by construction ==');
/* The review UI must never read identity-revealing or split-revealing
   fields. Whole-file scope: even comments are forbidden from carrying the
   field names (a field name in a comment is one copy-paste from a readout). */
var BLIND = /submitter|gold_?standard|votes?_accept|votes?_reject|vote_?split|\bvoters?\b/i;
var blindHits = grepHits(src, BLIND);
if (blindHits.length) no('blind UI', 'forbidden field tokens: ' + blindHits.join(' | '));
else ok('blind UI: no identity/split/gold-standard/voter fields anywhere');
/* Positive: the mandatory blind copy renders verbatim. */
if (has(src, 'Judge the work, not the worker.') &&
    has(src, "You can\\'t see who made this") || has(src, 'You can&#39;t see who made this') ||
    has(src, "can't see who made this"))
  ok('blind UI: mandatory blind copy present');
else no('blind UI', 'mandatory "Judge the work, not the worker" copy missing');
/* Positive: the work surface exists (artifact/caption/citations/proof). */
if (has(src, 'citations') && has(src, 'verified_read') && has(src, 'proof_links') &&
    has(src, 'artifact_url') && has(src, 'caption'))
  ok('blind UI: work surface (artifact/caption/citations/proof) renders');

console.log('== 3. kill switch + silent no-op ==');
if (has(src, "PF.skip('review-pool')") && has(src, 'pf_off=review-pool'))
  ok('kill switch: ?pf_off=review-pool via PF.skip');
else no('kill switch', "missing PF.skip('review-pool') or ?pf_off=review-pool");
if (has(src, "document.getElementById('pf-review-pool')") && /if\s*\(!mount\)\s*\{\s*return/.test(src))
  ok('mount: silent no-op when #pf-review-pool absent');
else no('mount', 'missing silent no-op guard for #pf-review-pool');
if (/pf-disabled|pf_disabled_v1/.test(src) || has(src, "PF.skip('review-pool')"))
  ok('kill switch: localStorage pf_disabled_v1 path covered by PF.skip');
else no('kill switch', 'localStorage path not covered');

console.log('== 4. settlement display states ==');
if (has(src, 'Stake returned + reward') && has(src, 'stake_returned') && has(src, 'reward_xp'))
  ok('settlement: win state (stake returned + reward) from server values');
else no('settlement', 'win-state settlement copy/fields missing');
if (has(src, 'Stake lost') && has(src, 'lost_xp'))
  ok('settlement: loss state (stake lost) from server values');
else no('settlement', 'loss-state settlement copy/fields missing');
if (has(src, 'agreement_rate'))
  ok('settlement: running agreement rate displayed');
else no('settlement', 'agreement_rate display missing');

console.log('== 5. empty-pool state ==');
if (has(src, 'j.empty') && has(src, "S.view = 'empty'") && has(src, 'The pool is empty'))
  ok('empty pool: review_next empty -> empty view with copy');
else no('empty pool', 'empty-pool branch or copy missing');

console.log('== 6. claim timer ==');
if (has(src, 'expires_at') && has(src, 'data-rp-exp') && has(src, 'Vote within'))
  ok('timer: 4h claim countdown from server expires_at');
else no('timer', 'expires_at countdown display missing');
if (has(src, '\u22125 XP staked') || has(src, '−5 XP staked') || has(src, 'XP staked'))
  ok('timer/stake: stake debit toast on claim');
else no('timer/stake', 'stake-debit toast missing');

console.log('== 7. lexicon gate ==');
var HARD = /casino|white market|jackpot|high roller|takes double|roulette|coin flip|red\/black|single number pays|slots|run it back|rake\b|dice|double-or-nothing|donat/i;
var lexHits = grepHits(src, HARD);
if (lexHits.length) no('lexicon', 'banned terms: ' + lexHits.join(' | '));
else ok('lexicon: zero banned terms');

console.log('== 8. backslash discipline ==');
if (src.indexOf('`') === -1) ok('backslash: no backtick spans — hazard class absent');
else no('backslash', 'backtick spans present — run the phase-b span scanner');

console.log('== 9. no XP logic in frontend ==');
if (/xpGrant/.test(code)) no('XP logic', 'xpGrant called in frontend');
else ok('XP logic: no xpGrant in frontend');
/* No arithmetic on economy values: stake/reward fields must only be read
   and displayed, never added, multiplied, or compared in math. */
var arithHits = grepHits(code, /(stake_xp|stake_returned|reward_xp|lost_xp|xP_earned_reviewing)\s*[-+*/%]/);
if (arithHits.length) no('XP logic', 'economy arithmetic: ' + arithHits.join(' | '));
else ok('XP logic: economy values read/display only, no arithmetic');
if (/Math\.(floor|round|ceil)\s*\([^)]*(stake|reward|xp)/i.test(code))
  no('XP logic', 'Math.* on economy values');
else ok('XP logic: no Math on economy values');
/* No client-side mint constants masquerading as economy: the module must not
   define its own stake/reward amounts. */
if (/(^|[^.\w])(STAKE|REWARD)\s*=\s*\d/.test(code)) no('XP logic', 'client-side economy constants');
else ok('XP logic: no client-side stake/reward constants');

console.log('== 10. bundle registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
var listHits = (bsrc.match(/'review-pool\.js'/g) || []).length;
if (listHits === 1) ok('bundle: review-pool.js listed exactly once in build/bundle.js');
else no('bundle', "'review-pool.js' listed " + listHits + ' times in build/bundle.js');
var bundlePath = path.join(G, 'bundle-cells.js');
if (fs.existsSync(bundlePath) && has(read(bundlePath), 'review-pool')) {
  if (has(read(bundlePath), 'rp-review-pool') || has(read(bundlePath), 'review-pool'))
    ok('bundle: review-pool present in rebuilt bundle-cells.js');
  else no('bundle', 'review-pool marker missing in bundle-cells.js');
} else no('bundle', 'bundle-cells.js not rebuilt or missing review-pool');

console.log('== 11. contract surface ==');
['review_next', 'review_vote', 'review_status', 'review_history',
 'review_leaderboard', 'review_cell_board'].forEach(function (a) {
  if (has(src, a)) ok('contract: ' + a);
  else no('contract', a + ' missing');
});
if (has(src, "postAction('review','review_action'") || has(src, 'review_action'))
  ok('contract: {type:review, review_action} dispatch idiom');
else no('contract', 'review_action dispatch idiom missing');
if (has(src, 'REVIEW NEXT')) ok('contract: REVIEW NEXT one-button claim');
else no('contract', 'REVIEW NEXT button missing');
if (has(src, 'FROM YOUR CELL') && has(src, 'cell_priority'))
  ok('contract: cell-priority mod layer');
else no('contract', 'cell-priority indicator missing');
if (has(src, 'accuracy') && has(src, 'volume') && has(src, 'cell'))
  ok('contract: leaderboards + cell accuracy board');
else no('contract', 'leaderboard/cell-board render missing');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
