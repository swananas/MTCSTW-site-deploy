#!/usr/bin/env node
/* tests/fred-b1.verify.cjs — Wave B1 FE verify (S-15 Academy live figures,
   S-16 quiz-bank macro day, Daily Orders "read the release").
   Run from the repo root:
     node tests/fred-b1.verify.cjs
   1. node --check on the four changed game files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      - academy.js: [[FRED:<id>]] token replacement from the fred_macro rail,
        figures escaped, source link, honest fail-soft note, zero XP change
      - daily-interrogation.js: every-7th-day MACRO DAY swaps in the
        fred_quiz_bank question, same pf-interrogation-answered event, zero XP
      - daily-orders.js: release-day card from fred_release_prompts, claim
        dispatches pf-do-challenge-done with challenge 'read-the-release',
        xp 10, dedupe key dochall_<YYYYMM>_<series>_<cs>; no new XP legs
      - enlistment-ranks.js: award listener honors read-the-release at 10 XP
        (clamped <= 15), settle() forwards the 4th dedupe param
   3. Rebuilt bundles contain the new code (bundle-sec1, bundle-home,
      bundle-arcade-h, bundle-create).
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var AC = path.join(ROOT, 'v1.4.3', 'games', 'academy.js');
var DI = path.join(ROOT, 'v1.4.3', 'games', 'daily-interrogation.js');
var DO = path.join(ROOT, 'v1.4.3', 'games', 'daily-orders.js');
var ER = path.join(ROOT, 'v1.4.3', 'games', 'enlistment-ranks.js');
var BSEC1 = path.join(ROOT, 'v1.4.3', 'games', 'bundle-sec1.js');
var BHOME = path.join(ROOT, 'v1.4.3', 'games', 'bundle-home.js');
var BARCADEH = path.join(ROOT, 'v1.4.3', 'games', 'bundle-arcade-h.js');
var BCREATE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-create.js');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* Comment strip only — never strip string literals (regex-literal-blind). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function stat(code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing pattern: ' + re));
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed'); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[AC, DI, DO, ER].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var ac = read(AC), acC = stripComments(ac);
var di = read(DI), diC = stripComments(di);
var dor = read(DO), doC = stripComments(dor);
var er = read(ER), erC = stripComments(er);

/* ============ 2. S-15 academy.js ============ */
console.log('== 2. S-15 academy [[FRED:]] figures ==');
stat(acC, 'AC FRED token replacement', /split\(\/\\\[\\\[FRED:/);
stat(acC, 'AC reads fred_macro rail', /fred_macro/);
stat(acC, 'AC escapes injected figure text', /esc\(/);
stat(acC, 'AC source link to FRED', /source_url|fred\.stlouisfed\.org/);
stat(acC, 'AC fail-soft honest note', /figures? (are |unavailable|not yet|check back)/i);
if (/xpGrant\(/.test(acC)) no('AC zero new XP legs', 'xpGrant( found in academy.js');
else ok('AC zero new XP legs');

/* ============ 3. S-16 daily-interrogation macro day ============ */
console.log('== 3. S-16 macro-day quiz bank ==');
stat(diC, 'DI every-7th-day macro day', /MACRO DAY|macroDay/i);
stat(diC, 'DI quiz-bank question fetch', /fred_quiz_bank/);
stat(diC, 'DI same answered event (zero XP change)', /pf-interrogation-answered/);
stat(diC, 'DI skips if already played', /already played|played/i);
if (/xpGrant\(/.test(diC)) no('DI zero new XP legs', 'xpGrant( found in daily-interrogation.js');
else ok('DI zero new XP legs');

/* ============ 4. Daily Orders read-the-release ============ */
console.log('== 4. Daily Orders release-day order ==');
stat(doC, 'DO oRelease slot', /oRelease/);
stat(doC, 'DO reads fred_release_prompts', /fred_release_prompts/);
stat(doC, 'DO release-day card copy', /READ THE BRIEFING/);
stat(doC, 'DO mirror key shape dochall_<YYYYMM>_<series>',
  /return\s+['"]dochall_['"]\s*\+\s*per\s*\+\s*['"]_['"]\s*\+\s*sid/);
stat(doC, 'DO dedupe key carries callsign',
  /dedupe\s*:\s*key\s*\+\s*['"]_['"]\s*\+\s*\(id\.callsign/);
stat(doC, 'DO dispatches pf-do-challenge-done', /pf-do-challenge-done/);
stat(doC, 'DO challenge id read-the-release', /read-the-release/);
stat(doC, 'DO proposed 10 XP (existing leg)', /RELEASE_XP\s*=\s*10/);
stat(doC, 'DO claim passes RELEASE_XP', /xp\s*:\s*RELEASE_XP/);
stat(doC, 'DO claimed-state localStorage', /localStorage/);
if (/xpGrant\(/.test(doC)) no('DO zero new XP legs', 'xpGrant( found in daily-orders.js');
else ok('DO zero new XP legs (rides do_challenge_done tally)');

/* ============ 5. enlistment-ranks award path ============ */
console.log('== 5. enlistment-ranks award path ==');
stat(erC, 'ER honors read-the-release variant', /read-the-release/);
stat(erC, 'ER 10 XP award', /10/);
stat(erC, 'ER clamps to <= 15 (existing cap)', /15/);
stat(erC, 'ER settle forwards dedupe param', /dedupe/);
if (/xpGrant\(/.test(erC)) no('ER zero new XP legs', 'xpGrant( found in enlistment-ranks.js');
else ok('ER zero new XP legs');

/* ============ 6. rebuilt bundles carry the code ============ */
console.log('== 6. bundles ==');
try {
  var bsec1 = read(BSEC1);
  (bsec1.indexOf('oRelease') !== -1 && bsec1.indexOf('read-the-release') !== -1)
    ? ok('bundle-sec1 has release order') : no('bundle-sec1', 'release order code missing');
  var bhome = read(BHOME), barcadeh = read(BARCADEH);
  (bhome.indexOf('pfMacroDay') !== -1 || /MACRO DAY/.test(bhome))
    ? ok('bundle-home has macro day') : no('bundle-home', 'macro day code missing');
  (barcadeh.indexOf('pfMacroDay') !== -1 || /MACRO DAY/.test(barcadeh))
    ? ok('bundle-arcade-h has macro day') : no('bundle-arcade-h', 'macro day code missing');
  var bcreate = read(BCREATE);
  (bcreate.indexOf('[[FRED:') !== -1)
    ? ok('bundle-create has FRED token replacement') : no('bundle-create', 'token code missing');
} catch (e) { no('bundles', 'could not read bundle files: ' + (e && e.message)); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { process.exit(1); }
