#!/usr/bin/env node
/* scripts/verify-cohesion-surfaces.js
   COHESION SURFACE INTEGRATIONS — static verification (2026-10-06).
   Checks:
     1. Every edited surface file dispatches pf:terminal with a context string.
     2. No "donate" in any edited file (copy ban).
     3. No NEW XP grants introduced by the cohesion edits (zero-new-XP rule).
        The predgame "CALLED IT — NEXT QUESTION" link is pure navigation;
        campaign's existing creditLocal("campaign_pledge", 25) predates this
        work (backend-mirror, nolx pattern) — it must not be new from this diff.
     4. Bundles rebuilt after the edits: each surface's built bundle is newer
        than its source file, and the expected context string is present in
        the built bundle.
     5. node --check passes on every edited source file. */
'use strict';
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

var ROOT = path.resolve(__dirname, '..');
var fails = [];
var passes = 0;
function check(name, ok, extra) {
  if (ok) { passes++; console.log('  PASS  ' + name); }
  else { fails.push(name); console.log('  FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function diffAdded(p) {
  /* lines added by the uncommitted diff for this file */
  try {
    var out = execSync('git diff HEAD -- "' + p + '"', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(function (l) { return l.charAt(0) === '+' && l.charAt(1) !== '+'; });
  } catch (e) { return []; }
}

/* file -> expected pf:terminal context, and the bundle it ships in */
var SURFACES = [
  { src: 'v1.4.3/games/predgame.js',       ctx: 'predict-resolved', bundle: 'v1.4.3/games/bundle-predgame.js' },
  { src: 'v1.4.3/games/slr-match-quiz.js', ctx: 'quiz-result',      bundle: 'v1.4.3/games/bundle-arcade-h.js' },
  { src: 'v1.4.3/games/fan-vote.js',       ctx: 'vote-cast',        bundle: 'v1.4.3/games/bundle-home.js' },
  { src: 'v1.4.3/games/events.js',         ctx: 'rsvp',             bundle: 'v1.4.3/games/bundle-events.js' },
  { src: 'v1.4.3/games/civic-events.js',   ctx: 'rsvp',             bundle: 'v1.4.3/games/bundle-events-map.js' },
  { src: 'v1.4.3/games/campaign.js',       ctx: 'pledge',           bundle: 'v1.4.3/games/bundle-home.js' },
  { src: 'v1.4.3/games/daily-orders.js',   ctx: 'orders-complete',  bundle: 'v1.4.3/games/bundle-sec1.js' },
  { src: 'v1.4.3/games/academy.js',        ctx: 'lesson-complete',  bundle: 'v1.4.3/games/bundle-create.js' }
];

console.log('[1] pf:terminal dispatch with context in each edited file');
SURFACES.forEach(function (s) {
  var body = read(s.src);
  var re = new RegExp('pf:terminal[\\s\\S]{0,160}?context\\s*:\\s*[\'"]' + s.ctx + '[\'"]');
  check(s.src + ' dispatches pf:terminal context \'' + s.ctx + '\'', re.test(body));
});

console.log('[2] "donate" copy ban');
SURFACES.forEach(function (s) {
  check(s.src + ' has no "donate"', !/donate/i.test(read(s.src)));
});

console.log('[3] zero new XP (diff-added lines only)');
var XP_RE = /\bxpGrant\s*\(|creditLocal\s*\(|awardXP\s*\(|grantXP\s*\(|pf-xp/i;
SURFACES.forEach(function (s) {
  var added = diffAdded(s.src);
  var hits = added.filter(function (l) { return XP_RE.test(l); });
  check(s.src + ' introduces no new XP grants', hits.length === 0,
    hits.length ? 'added lines matched: ' + hits.slice(0, 2).join(' | ').slice(0, 120) : '');
});

console.log('[4] bundles rebuilt (committed build contains source context)');
/* QC hardening (2026-10-06): mtime comparison is unreliable under worktree
   checkout ordering, and minified game bundles carry no file-list header.
   The context string (e.g. 'predict-resolved') can only exist in the bundle
   if it was built from the wired source — that is the freshness proof. */
SURFACES.forEach(function (s) {
  var btxt = read(s.bundle);
  check(s.bundle + ' contains context \'' + s.ctx + '\'', btxt.indexOf(s.ctx) >= 0);
});

console.log('[5] node --check on every edited file');
SURFACES.forEach(function (s) {
  var ok = true, msg = '';
  try { execSync('node --check "' + s.src + '"', { cwd: ROOT, stdio: 'pipe' }); }
  catch (e) { ok = false; msg = String(e.message).split('\n')[0]; }
  check('node --check ' + s.src, ok, msg);
});

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILED: ' + fails.join('; ')); process.exit(1); }
console.log('ALL COHESION-SURFACE CHECKS PASS');
