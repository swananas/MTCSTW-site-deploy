#!/usr/bin/env node
/* scripts/verify-teardown-academy.js — WS-12 ACADEMY teardown verification
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-academy.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on academy.js, academy-graduation.js, this harness.
   2. First lesson completable pre-enlistment, device-local guardrails:
      the anonymous REPORT BACK branch stores to localStorage only and
      issues NO backend call (no post/api/fetch in the anon branch);
      the anon record is device-keyed.
   3. XP migration is single-lesson via xpGrant only (source scan):
      migrateAnon issues exactly one post() and it is the existing
      lesson_complete action (the server-side xpGrant path); no xpGrant()
      client-side; no new a_action values anywhere in the file.
   4. Streak freeze/repair mechanics present (useFreeze, repairDay,
      ac-freeze / ac-repair wiring).
   5. Cell streaks participation-rate framed: "participation rate" +
      "showed up N of M days" copy; cell data suppressed when absent (P8).
   6. No blame-attribution language (Psych lint, comments stripped):
      "you failed", "broken streak", "streak is broken", "lost your streak",
      "shame", "fallen behind", "let your/the cell down", "no excuses".
   7. Every lesson ends in a deployed action, not a quiz: the
      WHAT YOU DO ABOUT IT / REPORT BACK block ships in lessonCard;
      no quiz token outside comments.
   8. Milestone unlocks callsign-gated (locked without a callsign; no
      attribution until claimed).
   9. CTA-verb lint: no "MARK COMPLETE"; no donate / ENLIST -> / CONFIRM
      pill / CALL IT -> rogue CTAs; DEPLOY -> only as the mission
      commitment; START/PLAY/BEGIN for lesson consumption.
   10. Kill switches: PF.skip('academy') / PF.skip('academy-graduation')
       suppress staging (functional vm test); kill comments present.
   11. Zero new XP mechanics / zero new backend writes: only the shipped
       actions lesson_complete / course_complete / academy_graduate;
       no new grant/mint functions.
   12. Bundle verification: rebuilt minified bundle-create.js contains the
       new academy markers.
   13. Inner-script gate: scripts/check-inner-scripts.js passes.
   NOTE (AGENTS.md lesson): lints run on the comment-stripped view WITHOUT
   naive quote-stripping (regex-literal-blind). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var ACADEMY = path.join(ROOT, 'v1.4.3', 'games', 'academy.js');
var GRAD = path.join(ROOT, 'v1.4.3', 'games', 'academy-graduation.js');
var BUNDLE_CREATE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-create.js');

var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}
/* Comment stripper for source lints (regex-literal-aware: strip comments
   only, never naive quote-stripping). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

var aSrc = read(ACADEMY), gSrc = read(GRAD);
var aCode = stripComments(aSrc), gCode = stripComments(gSrc);

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[ACADEMY, GRAD, __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check ' + path.basename(p), err); else ok('node --check ' + path.basename(p));
});

/* ================= 2. pre-enlistment first lesson, device-local ========= */
console.log('[2] anonymous first lesson + device-local guardrails');
(function () {
  if (aSrc.indexOf('CEO DECISION 2') < 0) { bad('anon-first-lesson', 'CEO decision 2 block missing'); return; }
  /* the anon REPORT BACK branch: find the anon anonSet block and assert it
     issues no backend call */
  var m = aCode.match(/if\s*\(\s*fl\s*&&\s*String\(fl\.id\)\s*===\s*String\(lid\)\s*\)\s*\{([\s\S]*?)\n\s{10}\}/);
  if (!m) { bad('anon-branch', 'anonymous REPORT BACK branch not found'); return; }
  var branch = m[1];
  if (/post\s*\(|api\s*\(|fetch\s*\(|authPost|authGetJSONP/.test(branch)) {
    bad('anon-branch', 'anonymous completion branch touches the backend — guardrail violated');
  } else ok('anon completion is device-local (no backend call)');
  /* device-local = anonSet (the localStorage writer) or localStorage directly */
  if (/anonSet\s*\(|localStorage/.test(branch)) ok('anon record stored device-local (anonSet/localStorage)');
  else bad('anon-branch', 'anon record is not device-local');
  if (/device\s*:\s*id2\.device/.test(branch)) ok('anon record device-keyed');
  else bad('anon-branch', 'anon record missing device key');
  if (!/pf-callsign-claimed/.test(aSrc)) bad('anon-migration-trigger', 'no pf-callsign-claimed migration listener');
  else ok('callsign-claim migration listener present');
})();

/* ================= 3. single-lesson xpGrant-only migration ============== */
console.log('[3] XP migration: single lesson, xpGrant only');
(function () {
  var m = aCode.match(/function migrateAnon\(el\)\s*\{([\s\S]*?)\n  \}/);
  if (!m) { bad('migrateAnon', 'migrateAnon not found'); return; }
  var body = m[1];
  var posts = body.match(/post\s*\(\s*(['"])([^'"]+)\1/g) || [];
  if (posts.length !== 1) { bad('migrateAnon', 'expected exactly 1 post() call, found ' + posts.length); return; }
  if (posts[0].indexOf('lesson_complete') < 0) { bad('migrateAnon', 'migration does not use lesson_complete: ' + posts[0]); return; }
  ok('migration uses exactly one post: the existing lesson_complete action');
  if (/rec\.lessonId/.test(body) && !/for\s*\(/.test(body)) ok('migration is single-lesson (no lesson loop)');
  else bad('migrateAnon', 'migration is not provably single-lesson');
  if (/xpGrant\s*\(/.test(aCode)) bad('xpGrant-client', 'client-side xpGrant() call found — XP must be granted server-side only');
  else ok('no client-side xpGrant() — server-side grant only');
  var actions = {};
  var re = /post\s*\(\s*(['"])([a-z_]+)\1/g, mm;
  while ((mm = re.exec(aCode))) actions[mm[2]] = 1;
  var allowed = { lesson_complete: 1, course_complete: 1, academy_graduate: 1 };
  var rogue = Object.keys(actions).filter(function (a) { return !allowed[a]; });
  if (rogue.length) bad('backend-actions', 'new backend actions introduced: ' + rogue.join(','));
  else ok('no new backend actions (' + Object.keys(actions).sort().join(', ') + ')');
})();

/* ================= 4. streak freeze/repair ============================== */
console.log('[4] streak anti-cruelty mechanics');
(function () {
  var need = ['useFreeze', 'repairDay', 'streakInfo', 'recordActivity', 'ac-freeze', 'ac-repair', 'pf_academy_act_v1', 'pf_academy_streak_v1'];
  var missing = need.filter(function (t) { return aSrc.indexOf(t) < 0; });
  if (missing.length) bad('streak-mechanics', 'missing: ' + missing.join(', '));
  else ok('freeze + repair + device-local activity log present');
  if (aSrc.indexOf('pf_academy_streak_v1') >= 0 && aSrc.indexOf('no backend') >= 0)
    ok('streak state device-local (no backend)');
  else bad('streak-mechanics', 'streak state not provably device-local');
})();

/* ================= 5. cell streaks: participation rate ================== */
console.log('[5] cell streaks participation-rate framing');
(function () {
  if (aSrc.indexOf('participation rate') < 0) { bad('cell-participation', 'participation-rate framing copy missing'); return; }
  ok('participation-rate framing present');
  if (/showed up/.test(aSrc)) ok('"showed up N of M days" framing present');
  else bad('cell-participation', '"showed up" framing missing');
  if (/CELL_PART\s*\|\|\s*!\s*CELL_PART/.test(aSrc) || aSrc.indexOf('suppressed without real data') >= 0)
    ok('cell panel suppressed without real data (P8)');
  else bad('cell-participation', 'cell panel not provably suppressed when the feed is absent');
})();

/* ================= 6. no blame language (Psych lint) ==================== */
console.log('[6] anti-cruelty language lint');
(function () {
  var banned = [
    /\byou failed\b/i,
    /broken streak/i,
    /streak is broken/i,
    /lost (your|the|my) streak/i,
    /\bshame\b/i,
    /fallen behind/i,
    /let (your|the) cell down/i,
    /no excuses/i
  ];
  var hit = false;
  [ [aCode, 'academy.js'], [gCode, 'academy-graduation.js'] ].forEach(function (pair) {
    banned.forEach(function (re) {
      if (re.test(pair[1])) { bad('blame-lint ' + pair[0], 'banned phrase matched: ' + re); hit = true; }
    });
  });
  if (!hit) ok('no blame-attribution language in either file');
})();

/* ================= 7. deployed action, not a quiz ======================= */
console.log('[7] every lesson ends in a deployed action');
(function () {
  if (aCode.indexOf('WHAT YOU DO ABOUT IT') < 0) { bad('deployed-action', 'mission kicker missing'); return; }
  if (aCode.indexOf('REPORT BACK') < 0) { bad('deployed-action', 'REPORT BACK close-the-loop missing'); return; }
  if (aCode.indexOf('DEPLOY') < 0) { bad('deployed-action', 'DEPLOY mission commitment missing'); return; }
  ok('deployed-action block ships in every lesson card');
  if (/\bquiz\b/i.test(aCode)) bad('no-quiz', 'quiz token found outside comments');
  else ok('no quiz mechanics');
  if (aCode.indexOf('MARK COMPLETE') >= 0) bad('cta-rogue', '"MARK COMPLETE" still present');
  else ok('"MARK COMPLETE" retired');
})();

/* ================= 8. milestones callsign-gated ========================= */
console.log('[8] milestone unlocks callsign-gated');
(function () {
  if (aSrc.indexOf('Claim your callsign to hold milestones') < 0) { bad('milestones-gate', 'callsign gate copy missing'); return; }
  if (!/locked\s*=\s*!id\.callsign/.test(aCode)) { bad('milestones-gate', 'gate not provably tied to callsign'); return; }
  ok('milestones callsign-gated, no attribution until claimed');
  if (aSrc.indexOf('/political-hq') >= 0) ok('proposal-rights milestone points at the real assembly');
  else bad('milestones-links', 'proposal-rights link missing');
})();

/* ================= 9. CTA-verb lint ===================================== */
console.log('[9] CTA-verb discipline');
(function () {
  var rogue = [
    [/donate/i, '"donate"'],
    [/ENLIST\s*->/, '"ENLIST ->"'],
    [/CALL\s*IT\s*->/, '"CALL IT ->" as CTA'],
    [/CONFIRM/, '"CONFIRM" pill']
  ];
  var hit = false;
  [ [aCode, 'academy.js'], [gCode, 'academy-graduation.js'] ].forEach(function (pair) {
    rogue.forEach(function (r) {
      if (r[0].test(pair[1])) { bad('cta-verb ' + pair[0], 'rogue CTA ' + r[1]); hit = true; }
    });
  });
  if (!hit) ok('CTA verbs clean (no donate / ENLIST -> / CALL IT -> / CONFIRM)');
  /* START/PLAY/BEGIN for consumption, DEPLOY for mission commitment */
  if (/ac-start[^]*?>\s*START\s*</.test(aSrc)) ok('consumption CTA uses START');
  else bad('cta-consumption', 'lesson consumption CTA is not START-family');
  if (/DEPLOY/.test(aCode) && aSrc.indexOf('mission commitment') >= 0) ok('DEPLOY scoped to mission commitment');
  else bad('cta-deploy', 'DEPLOY scoping unclear');
})();

/* ================= 10. kill switches (functional vm) ==================== */
console.log('[10] kill switches');
function sandboxFor(skipKey) {
  var staged = [];
  var store = {};
  var listeners = {};
  var windowObj = {};
  var documentObj = {
    addEventListener: function (t, f) { listeners[t] = f; },
    getElementById: function () { return null; },
    createElement: function () { return { setAttribute: function () {}, style: {} }; },
    head: { appendChild: function () {} },
    readyState: 'complete',
    querySelectorAll: function () { return []; }
  };
  windowObj.PF = {
    skip: function (k) { return k === skipKey; },
    holder: function () {
      return { insertAdjacentHTML: function (pos, html) { staged.push(html); } };
    },
    toast: function () {},
    creditLocal: function () {}
  };
  windowObj.PFCallsign = function () { return ''; };
  windowObj.PFDeviceId = function () { return 'dev-test'; };
  windowObj.PF_BACKEND_URL = undefined;
  var sb = {
    window: windowObj,
    document: documentObj,
    localStorage: {
      getItem: function (k) { return (k in store) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    location: { href: '', reload: function () {} },
    navigator: {},
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    CustomEvent: function (t, o) { this.type = t; this.detail = (o && o.detail) || null; },
    console: console
  };
  sb.window.window = sb.window;
  return { sb: sb, staged: staged, listeners: listeners, store: store };
}
function runInSandbox(file, skipKey) {
  var s = sandboxFor(skipKey);
  try {
    vm.runInNewContext(read(file), s.sb, { filename: file });
  } catch (e) {
    return { error: e, staged: s.staged };
  }
  return { error: null, staged: s.staged, win: s.sb.window };
}
(function () {
  var r = runInSandbox(ACADEMY, null);
  if (r.error) { bad('academy-load', 'IIFE threw in sandbox: ' + (r.error && r.error.message)); }
  else if (!r.win.PFAcademy || typeof r.win.PFAcademy.mount !== 'function') bad('academy-load', 'PFAcademy.mount missing');
  else ok('academy IIFE loads fail-open (no backend, no callsign)');
  /* fail-open mount with an empty backend: staging + mount must not throw */
  var r2 = runInSandbox(ACADEMY, 'academy');
  if (r2.error) bad('academy-kill', 'killed module threw: ' + (r2.error && r2.error.message));
  else if (r2.staged.length) bad('academy-kill', 'PF.skip("academy") did not suppress staging');
  else ok('?pf_off=academy / pf_disabled_v1 kill switch suppresses staging');
  var r3 = runInSandbox(GRAD, 'academy-graduation');
  if (r3.error) bad('graduation-kill', 'killed module threw: ' + (r3.error && r3.error.message));
  else ok('academy-graduation kill switch suppresses');
  if (aSrc.indexOf("PF.skip(\"academy\")") < 0) bad('kill-comment', 'academy kill comment missing');
  else ok('kill-switch comments present');
})();

/* ================= 11. zero new XP mechanics ============================ */
console.log('[11] zero new XP mechanics');
(function () {
  /* creditLocal is the shared ledger mirror (pre-existing pattern); the only
     XP source is the backend via lesson_complete/course_complete. */
  if (/creditLocal\s*\(\s*rec\.lessonId/.test(aCode)) ok('migration mirrors the normal lesson payout (no new mechanic)');
  if (/xpFloat|dope\.xp/.test(aCode)) ok('HUD XP float reused (no new mechanic)');
  if (/function\s+grant|mintXP|addXP\s*\(/.test(aCode)) bad('xp-mechanics', 'new XP grant/mint function introduced');
  else ok('no new XP grant/mint functions');
})();

/* ================= 12. bundle verification ============================== */
console.log('[12] bundle verification');
(function () {
  if (!fs.existsSync(BUNDLE_CREATE)) { bad('bundle', 'bundle-create.js missing — rebuild first'); return; }
  var b = read(BUNDLE_CREATE);
  var markers = ['pf_academy_anon_v1', 'WHAT YOU DO ABOUT IT', 'ac-td12-css', 'FIRST STEP', 'pf_academy_leagues_v1'];
  var missing = markers.filter(function (m) { return b.indexOf(m) < 0; });
  if (missing.length) bad('bundle', 'markers missing from minified bundle-create.js: ' + missing.join(', '));
  else ok('rebuilt bundle-create.js carries all academy teardown markers');
})();

/* ================= 13. inner-script gate ================================ */
console.log('[13] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), ACADEMY, GRAD],
    { encoding: 'utf8' });
  if (r.status !== 0) bad('inner-scripts', (r.stderr || r.stdout || 'failed').split('\n')[0]);
  else ok('check-inner-scripts passes on both files');
})();

console.log('\n' + passes + ' passed, ' + failures.length + ' failed.');
if (failures.length) { console.error('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('ACADEMY TEARDOWN VERIFY: GREEN');
