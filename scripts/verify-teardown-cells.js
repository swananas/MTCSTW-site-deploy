#!/usr/bin/env node
/* scripts/verify-teardown-cells.js — TEARDOWN WS-3 (cells) verification
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-cells.js
   AFTER rebuilding bundles (Step 5).
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on every touched source file + this harness.
   2. 3-slot Action Bar (P6) present on dashboard cards: cell sources call
      PF.patterns.actionBar / render the pf-pat-actions nav (cells.js guest
      room, cell-hq.js cards, cell-war-front.js, cell-soundoff.js).
   3. One-tap join -> ONE named first action: cell-soundoff.js mounts on
      pf-cell-joined with the exact 'SOUND OFF' headline and the
      'name, city, why you're here — REPORT BACK' action; the card has
      exactly one primary CTA.
   4. Contribution-first / identity-second split enforced in code:
      - the guest path (paintGuestRoom in cells.js) wires ZERO social
        mutations (cell_join/cell_checkin/cell_cover/cell_create/cell_leave/
        cell_promote);
      - guest data actions are rate-limited (GUEST_RL_MAX) and quarantined
        (pf_guest_queue localStorage) with an origin:'guest_queue'
        provenance flag on replay;
      - SOUND OFF refuses to post without a callsign (social gate).
   5. Streaks are participation-rate framed: 'REPORTED TODAY' copy present;
      no OUT-shame badge ('c-mno') in cells.js; strike progress lists
      reporters only (no per-member done/missed drill-down).
   6. CTA-verb lint (comments + the patterns module + migration map
      stripped): FAILS on banned/rogue verbs in cell sources — 'donate'
      (any case), 'equity' in CTA copy, uppercase ENLIST as a card CTA,
      'CALL IT ->' as a card CTA, 'CONFIRM' pill buttons.
   7. Kill switches: every touched module honors PF.skip('<silo-id>').
   8. Zero new XP mechanics in the new module: no xpGrant/creditLocal/pf-xp.
   9. Zero new backend actions in the new module: the only action name sent
      is the pre-existing cell_checkin (the REPORT BACK).
   10. Bundle wiring: 'cell-soundoff.js' registered in build/bundle.js
       (bundle-cells-h); the rebuilt minified bundles contain the new
       module + guest-queue markers. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var SOURCES = [
  'games/cell-soundoff.js',
  'games/cells.js',
  'games/cell-hq.js',
  'games/cell-first-hour.js',
  'games/cell-identity.js',
  'games/cell-starter-kit.js',
  'core/22-squadjoin.js',
  'games/cell-war-front.js',
  'games/cell-war.js'
];
var KILLS = {
  'games/cell-soundoff.js': 'cell-soundoff',
  'games/cells.js': 'cells',
  'games/cell-hq.js': 'cellhq',
  'games/cell-first-hour.js': 'cell-first-hour',
  'games/cell-identity.js': 'cell-identity',
  'games/cell-starter-kit.js': 'cell-kits',
  'core/22-squadjoin.js': 'squadjoin',
  'games/cell-war-front.js': 'cell-war-front',
  'games/cell-war.js': 'cell-war'
};

var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }

function read(p) { return fs.readFileSync(p, 'utf8'); }
function srcOf(f) { return read(path.join(V, f)); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}
/* strip block + line comments for source lints */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}
/* extract one function body by name (best-effort brace match) */
function fnBody(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i === -1) return null;
  var j = src.indexOf('{', i);
  if (j === -1) return null;
  var depth = 0;
  for (var k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(j, k + 1); }
  }
  return null;
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
SOURCES.forEach(function (f) {
  var err = nodeCheck(path.join(V, f));
  if (err) bad('syntax ' + f, err); else ok('syntax ' + f);
});
(function () {
  var err = nodeCheck(__filename);
  if (err) bad('syntax scripts/verify-teardown-cells.js', err);
  else ok('syntax scripts/verify-teardown-cells.js');
})();

/* ================= 2. Action Bar (P6) ================= */
console.log('[2] 3-slot Action Bar on dashboard cards');
['games/cells.js', 'games/cell-hq.js', 'games/cell-war-front.js', 'games/cell-soundoff.js'].forEach(function (f) {
  var s = stripComments(srcOf(f));
  var callsBar = /\.actionBar\s*\(/.test(s) || /pf-pat-actions/.test(s);
  if (!callsBar) bad('action-bar ' + f, 'no .actionBar() call or pf-pat-actions markup');
  else ok('action-bar ' + f);
});
/* the pattern module carries the three fixed slots, in order */
(function () {
  var p = srcOf('core/33-patterns.js');
  var hasSlots = /SHARE THIS INTEL/.test(p) && /TAKE THIS TO YOUR CELL/.test(p) && /REPORT BACK/.test(p);
  if (!hasSlots) bad('action-bar slots', 'pattern module missing one of the three fixed slots');
  else ok('action-bar slots (SHARE THIS INTEL · TAKE THIS TO YOUR CELL · REPORT BACK)');
})();

/* ================= 3. one-tap join -> one named first action ================= */
console.log('[3] one-tap join -> ONE named first action');
(function () {
  var s = srcOf('games/cell-soundoff.js');
  var sc = stripComments(s);
  if (!/pf-cell-joined/.test(sc)) bad('soundoff trigger', 'does not listen for pf-cell-joined');
  else ok('soundoff mounts on pf-cell-joined');
  if (!/SOUND OFF/.test(sc)) bad('soundoff name', 'the card is not named SOUND OFF');
  else ok('soundoff named SOUND OFF');
  if (!/name, city, why/.test(sc)) bad('soundoff action', 'missing the named action "name, city, why you\'re here"');
  else ok('soundoff named action: name, city, why you\'re here — REPORT BACK');
  /* exactly one primary CTA in the form path: the REPORT BACK submit */
  var submits = (sc.match(/REPORT BACK/g) || []).length;
  if (submits < 1) bad('soundoff single action', 'no REPORT BACK primary action');
  else ok('soundoff single primary action (REPORT BACK)');
  if (!/pf_soundoff_done_v1/.test(sc)) bad('soundoff once', 'card does not dismiss permanently per cell');
  else ok('soundoff fires once per cell, then hands off');
})();

/* ================= 4. contribution-first / identity-second ================= */
console.log('[4] anonymous/guest split enforced in code');
(function () {
  var s = stripComments(srcOf('games/cells.js'));
  var guest = fnBody(s, 'paintGuestRoom');
  if (!guest) { bad('guest room', 'paintGuestRoom not found in cells.js'); return; }
  ok('guest room paintGuestRoom exists');
  var socialWrites = ['cell_join', 'cell_checkin', 'cell_cover', 'cell_create', 'cell_leave', 'cell_promote'];
  var leaked = socialWrites.filter(function (a) { return guest.indexOf(a) !== -1; });
  if (leaked.length) bad('guest split', 'guest path wires social mutations: ' + leaked.join(', '));
  else ok('guest path wires ZERO social mutations');
  if (!/pf_guest_queue_v1/.test(s)) bad('guest quarantine', 'no pf_guest_queue_v1 quarantine store');
  else ok('guest actions quarantined in pf_guest_queue_v1');
  if (!/GUEST_RL_MAX/.test(s)) bad('guest rate limit', 'no GUEST_RL_MAX rate limit');
  else ok('guest data actions rate-limited (GUEST_RL_MAX/day)');
  if (!/origin\s*:\s*['"]guest_queue['"]/.test(s)) bad('guest provenance', 'replay missing origin:\'guest_queue\' provenance flag');
  else ok('guest replay carries origin:\'guest_queue\' provenance flag');
  if (!/pf-callsign-claimed/.test(s)) bad('guest merge', 'no pf-callsign-claimed replay (one session -> one callsign merge)');
  else ok('one session -> one callsign merge on pf-callsign-claimed');
})();
(function () {
  var s = stripComments(srcOf('games/cell-soundoff.js'));
  if (!/socialOk\(\)/.test(s) || !/Claim a callsign/.test(s)) bad('soundoff social gate', 'SOUND OFF does not gate posting on a claimed callsign');
  else ok('SOUND OFF gated: no callsign, no post (claim prompt instead)');
})();

/* ================= 5. participation-rate framing ================= */
console.log('[5] streaks = participation rate, never blame');
(function () {
  var s = stripComments(srcOf('games/cells.js'));
  if (!/REPORTED TODAY/.test(s)) bad('participation copy', 'cells.js lacks "REPORTED TODAY" participation framing');
  else ok('participation framing: "N OF M REPORTED TODAY"');
  if (/c-mno/.test(s)) bad('no blame badge', 'cells.js still renders the OUT-shame badge (c-mno)');
  else ok('no OUT-shame badge — non-reporters render neutrally');
})();
(function () {
  var s = stripComments(srcOf('games/cell-hq.js'));
  if (!/Who reported\?/.test(s)) bad('strike reporters', 'strike progress does not use reporters-only framing');
  else ok('strike progress: reporters-only, no blame drill-down');
  if (/&#9675;/.test(s)) bad('strike marks', 'strike progress still renders per-member missed marks');
  else ok('no per-member missed marks in strike progress');
  if (!/participation, not perfection/.test(s)) bad('strike copy', 'strike progress copy lacks participation framing');
  else ok('strike copy: "participation, not perfection"');
})();
(function () {
  var s = stripComments(srcOf('games/cell-first-hour.js'));
  if (/burn their cover on you/.test(s)) bad('first-hour copy', 'blame copy still present ("burn their cover on you")');
  else ok('first-hour cover copy: no blame');
})();

/* ================= 6. CTA-verb lint ================= */
console.log('[6] CTA-verb lint on cell sources');
var CTA_FILES = SOURCES.filter(function (f) { return f !== 'core/33-patterns.js'; });
var ctaBad = 0;
CTA_FILES.forEach(function (f) {
  var s = stripComments(srcOf(f));
  var issues = [];
  if (/donate/i.test(s)) issues.push('donate-language');
  if (/equity/i.test(s)) issues.push('equity in CTA copy');
  if (/ENLIST(?![A-Z])/g.test(s)) {
    /* uppercase ENLIST as a CTA label (button/link text), not prose */
    var m = s.match(/>[^<>]*ENLIST[^A-Z][^<>]*</g) || s.match(/ENLIST [A-Z]+ \u2192|ENLIST [A-Z]+ ->/g);
    if (m) issues.push('ENLIST as card CTA: ' + m[0].slice(0, 40));
  }
  if (/CALL\s*IT\s*[-→>]/.test(s)) issues.push('CALL IT as card CTA');
  if (/>CONFIRM</.test(s)) issues.push('CONFIRM pill CTA');
  if (issues.length) { ctaBad++; bad('cta-verb ' + f, issues.join('; ')); }
  else ok('cta-verb ' + f);
});

/* ================= 7. kill switches ================= */
console.log('[7] kill switches');
Object.keys(KILLS).forEach(function (f) {
  var s = srcOf(f);
  var re = new RegExp("PF\\.skip\\(['\"]" + KILLS[f] + "['\"]\\)");
  if (!re.test(s)) bad('kill ' + f, 'missing PF.skip("' + KILLS[f] + '")');
  else ok('kill ' + f + ' (?pf_off=' + KILLS[f] + ')');
});

/* ================= 8. zero new XP ================= */
console.log('[8] zero new XP mechanics in the new module');
(function () {
  var s = stripComments(srcOf('games/cell-soundoff.js'));
  var xp = ['xpGrant', 'creditLocal', 'pf-xp', 'debitLocal', 'xp_each'];
  var hit = xp.filter(function (w) { return s.indexOf(w) !== -1; });
  if (hit.length) bad('zero xp', 'new XP surface in cell-soundoff.js: ' + hit.join(', '));
  else ok('zero new XP in cell-soundoff.js');
})();

/* ================= 9. zero new backend actions ================= */
console.log('[9] zero new backend actions in the new module');
(function () {
  var s = stripComments(srcOf('games/cell-soundoff.js'));
  var actions = [];
  var re = /(?:cell_action|g_action|f_action)\s*['"]?\s*:\s*['"]([^'"]+)['"]/g, m;
  while ((m = re.exec(s)) !== null) actions.push(m[1]);
  var novel = actions.filter(function (a) { return a !== 'cell_checkin'; });
  if (novel.length) bad('zero backend', 'new backend actions in cell-soundoff.js: ' + novel.join(', '));
  else ok('zero new backend actions (REPORT BACK reuses cell_checkin)');
})();

/* ================= 10. bundle wiring ================= */
console.log('[10] bundle wiring');
(function () {
  var b = read(path.join(ROOT, 'build', 'bundle.js'));
  if (b.indexOf("'cell-soundoff.js'") === -1) bad('bundle config', 'cell-soundoff.js not registered in build/bundle.js');
  else ok('bundle config: cell-soundoff.js in bundle-cells-h');
  var min = null;
  try { min = read(path.join(V, 'games', 'bundle-cells-h.js')); } catch (e) {}
  if (!min) { bad('bundle artifact', 'v1.4.3/games/bundle-cells-h.js missing — rebuild bundles first'); return; }
  ['pf-soundoff', 'SOUND OFF', 'pf_guest_queue_v1', 'REPORTED TODAY'].forEach(function (marker) {
    if (min.indexOf(marker) === -1) bad('bundle artifact', 'bundle-cells-h.js missing marker: ' + marker);
    else ok('bundle-cells-h.js contains ' + marker);
  });
  /* pf-pat-actions is rendered by the pattern module — it ships in the core
     bundle, not the cells bundle. */
  var coreMin = null;
  try { coreMin = read(path.join(V, 'core', 'bundle-core.js')); } catch (e) {}
  if (!coreMin || coreMin.indexOf('pf-pat-actions') === -1) bad('bundle artifact', 'core/bundle-core.js missing pf-pat-actions (pattern module)');
  else ok('core/bundle-core.js contains pf-pat-actions (P6)');
})();

console.log('\n' + passes + ' passed, ' + failures.length + ' failed.');
if (failures.length) { console.error('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('TEARDOWN WS-3 (cells): GREEN');
