#!/usr/bin/env node
/* build/bundle.js — Concatenate v1.4.3 game silos into per-page bundles.
 *
 * WHY WHOLE-FILE CONCAT: each game file is a self-contained IIFE that (1)
 * checks PF.skip() for its kill switch, then (2) stages a <template> into
 * PF.holder() (or self-mounts). Concatenating whole files preserves both
 * behaviors exactly. Extracting inner scripts would break the staging
 * mechanism. Each file is its own namespace guard (IIFE) so concatenation
 * is collision-safe.
 *
 * BUNDLES (2026-10-03): one per page/destination after the homepage
 * slimming (see pages/home-v2.js ORDER + pages/page-mount.js PAGE_ORDERS).
 * Homepage = bundle-sec1 in the critical path + bundle-home lazy-loaded
 * as ONE bundle for the PLAY/BELONG/CREATE/FUND/ACT/PROOF sections.
 * Dedicated pages (/arcade, /cells, /create, /bank, /economy, /war-chest,
 * /ventures, /events, /war-report, SLR roster/catalog) fetch only the
 * bundle(s) they mount. /political-hq fetches bundle-hq.
 * Cache win: change one widget → only its page bundle invalidates.
 *
 * Minification: terser (node_modules) with --compress --mangle. Falls back
 * to raw on error. Pass --debug to write unminified bundles instead.
 *
 * Usage: node build/bundle.js [--debug]
 * Output: v1.4.3/games/bundle-*.js (one per page/destination; bundle-hq.js
 * = HQ-only silos for /political-hq, loaded on demand by the footer
 * loader, never in the homepage critical path or lazy set.)
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');
var DEBUG = process.argv.indexOf('--debug') !== -1;

/* Bundle -> silo files. Mirrors pages/home-v2.js ORDER (homepage) and
   pages/page-mount.js PAGE_ORDERS (dedicated pages). Every game .js file
   lives in exactly one bundle — the build enforces this below. */
var SECTIONS = {
  'bundle-sec1': [
    /* HOMEPAGE START HERE — hook & daily loop. In critical path (blocking). */
    'briefing.js',
    'do-meter.js',
    'daily-orders.js',
    /* Political HQ integration #5 (2026-10-05): home-state preference —
       onboarding state picker (stateless-first) + settings widget. Lives
       with the claim flow in bundle-sec1 (critical path). No XP, read-only. */
    'home-state.js',
    /* Political HQ creation weave #5 (2026-10-05): pick-your-fight
       preference — onboarding issue-area picker (max 3, skippable) +
       settings widget. Step two of onboarding personalization, right after
       the state picker. No XP, read-only. */
    'pick-fight.js',
    /* P1#6 (2026-10-05): hq-nudge promoted to START HERE (homepage audit).
       Static CTA card — must stage with the critical path so it mounts in
       ORDER position right after daily-orders, not late at section end. */
    'political-hq-nudge.js',
    'dopamine.js',
    'enlistment-ranks.js',
    /* Wave 5B (2026-10-04): theater rack + ribbon chase strip + Frontline
       Streak + Theater Rank. Self-mounts into #pf-ranks and #xBrief. */
    'theater.js',
    'service-medals.js',
    'social-proof.js',
    /* LAUNCH WEEK (2026-10-05): FIRST WAVE — countdown/live banner, founder
       badge, 7-day circuit card, founder roll. Self-mounting; site-wide
       fixed banner bar (homepage hero-adjacent), homepage + /cells circuit
       leg. READ-ONLY, zero XP. War-room /cells leg via bundle-cells-h
       slim dup (same pattern as war-room-ticker.js). */
    'first-wave.js'
    /* notify.js is global chrome (header bell) — it ships in
       pages/bundle-pages.js via build/bundle-core.js, not a page bundle. */
  ],
  'bundle-home': [
    /* HOMEPAGE PLAY/BELONG/CREATE/FUND/ACT/PROOF — lazy-loaded as one bundle
       when those sections scroll near. Dedicated pages (/arcade, /cells,
       /create) fetch the slim bundle-arcade-h / bundle-cells-h /
       bundle-create-h bundles instead of this one. */
    'spotlight.js',
    'creator-guess.js',
    'daily-interrogation.js',
    'billionaire-supervillain.js',
    'slr-match-quiz.js',
    'infighting.js',
    'cells.js',
    /* CELLS wave G1 (2026-10-04): guided cell first hour — extends R19's
       post-claim interstitial; founder checklist / joiner induction. */
    'cell-first-hour.js',
    'referral.js',
    'poster-forge.js',
    /* Political HQ creation-plugins (2026-10-05): the Poster Forge POLITICAL
       tab. Loads right after poster-forge.js — mounts into #xPolitical. */
    'poster-forge-political.js',
    'feed.js',
    'war-bonds.js',
    'campaign.js',
    'alerts.js',
    'fan-vote.js',
    /* W5-11 Blackout Op (2026-10-04): siren countdown + debrief reveal. */
    'blackout.js',
    /* W5-6 Hall of Proof (2026-10-04): public winners wall, PROOF section. */
    'hall-of-proof.js',
    /* Wave 3 files (registered by Wave 5C integration 2026-10-04 to unblock
       the build gate; Wave 6B 2026-10-04 registered S5 war-room ticker
       (self-mounting, fail-silent; homepage PROOF + /cells) and A2 flash
       siren here too. Union of both sides — 'hall-of-proof.js' confirmed
       present in the merged tree. */
    'ambush-drop.js',
    'war-room-ticker.js',
    'flash-siren.js',
    'briefing-siren.js',
    /* REDISTRIBUTION LAYER Phase B (2026-10-05): The Solidarity Draw's
       bespoke home (silo key 'draw'), mounted in the Hall of Proof section
       on the homepage (pages/home-v2.js PROOF ORDER). Pre-draw secret
       commitment + post-draw revealed-secret verify. */
    'solidarity-draw.js',
    /* Homepage new surfaces (2026-10-05): War Report Monday card (#11),
       podcast LISTEN card (#13), SLR roster teaser (#14) — PROOF section. */
    'home-new-surfaces.js'
  ],
  /* SLIM DEDICATED-PAGE BUNDLES (2026-10-04, M1 dead-weight fix): /arcade,
     /cells and /create used to fetch the full bundle-home (~83KB gz) to get
     a handful of its games. These three slim bundles re-list silos that
     also live in bundle-home; the loader's JS_GAMES map fetches the slim
     bundle INSTEAD of bundle-home on those pages, so no page ever loads the
     same silo twice. bundle-home stays intact as the homepage's single lazy
     bundle for PLAY/BELONG/CREATE/FUND/ACT/PROOF (zero homepage change).
     The uniqueness check below skips these bundles on purpose. */
  'bundle-arcade-h': [
    /* /arcade — the 5 arcade games that lived in bundle-home. */
    'creator-guess.js',
    'daily-interrogation.js',
    'billionaire-supervillain.js',
    'slr-match-quiz.js',
    'infighting.js'
  ],
  'bundle-cells-h': [
    /* /cells — cells.js stages pf-ov-cells for the main Cells widget.
       cell-first-hour.js (CELLS wave G1, 2026-10-04): the guided first hour —
       extends R19's post-claim interstitial; mounts the founder checklist /
       joiner induction on pf-cell-formed / pf-cell-joined. */
    'cells.js',
    'cell-first-hour.js',
    /* S5 war-room ticker /cells leg (slim dup — the loader fetches this
       INSTEAD of bundle-home on /cells, never both). */
    'war-room-ticker.js',
    /* LAUNCH WEEK (2026-10-05): FIRST WAVE /cells leg — circuit card after
       the cell-war standings + the fixed banner bar (war-room mount).
       Slim dup of bundle-sec1's copy; loader fetches this INSTEAD of
       bundle-home on /cells, never both — no double-mount. */
    'first-wave.js'
  ],
  'bundle-create-h': [
    /* /create — poster-forge + feed (the Propaganda Feed workshop). */
    'poster-forge.js',
    /* Slim dup of bundle-home's copy: political tab rides along. */
    'poster-forge-political.js',
    'feed.js'
  ],
  'bundle-arcade': [
    /* /arcade — the 3 arcade games not already in bundle-home. */
    'caption-combat.js',
    'bracket-board.js',
    'battles.js',
    /* THE GAMBIT (2026-10-05): flip create/open/join UI moved out of the
       retired casino template. Silo key 'gambits'; mounts on /arcade via
       page-mount.js, right after the War Room section. */
    'gambits.js',
    /* Redistribution layer de-isolation: exit routing, win-share poster,
       sweep-to-vault, stake tracking. Hooks into the layer settlements
       (markets.js zones, gambits.js) — event name 'pf-wm-settled' stays. */
    'casino-exits.js',
    /* THE WAR ROOM — FRONTLINE FORECASTS (rebranded 2026-10-05 from the
       White Market lobby): the layer's front door + markets panel + the
       Phase-A interim BATTLE WAGERS / RAID / DRAW zones. Mounts first on
       /arcade via page-mount.js. */
    'markets.js',
    /* A3 Deployment Tracker (2026-10-04): /arcade lobby deep-links into
       unplayed medal games. Coordinator: rebuild bundles to ship. */
    'deploy-tracker.js'
    /* Phase B (built 2026-10-05): 'supply-raid.js' (silo key 'raid',
       bundle-cells, mounted on pf-cells-page / pf-cell-hq) and
       'solidarity-draw.js' (silo key 'draw', bundle-home, mounted in the
       Hall of Proof section on the homepage). */
  ],
  'bundle-cells': [
    /* /cells (+ Creator HQ) — the cell lifecycle. */
    'cell-hq.js',
    /* Cells G7 (2026-10-04): standalone treasury UI (fund/spend/trajectory). */
    'treasury.js',
    'cell-war.js',
    /* Propaganda Front (2026-10-05): opt-in political side front for the
       Cell War — per-capita political asset output, recognition-only crown,
       zero XP. Standby state when the forge/bounty rails aren't live. */
    'cell-war-front.js',
    'diplomacy.js',
    'contracts.js',
    'war-card.js',
    /* W5-12 Frontlines: the weekly territory war map. */
    'war-map.js',
    /* REDISTRIBUTION LAYER Phase B (2026-10-05): Supply Line Raid — the
       bespoke cell home (silo key 'raid'). Mounted on pf-cells-page via
       page-mount.js; cell-scoped rounds (cell_id from the loaded cell
       context, never URL params); hidden for non-members. */
    'supply-raid.js',
    /* COMMUNITY REVIEW WAVE (2026-10-05): Review Pool — community review of
       Content Bank submissions (SOP v2). Silo key 'review-pool'; self-mounts
       into #pf-review-pool on Creator HQ / Studio, silent no-op elsewhere.
       Kill: ?pf_off=review-pool. */
    'review-pool.js'
  ],
  'bundle-create': [
    /* /create (+ Creator HQ) — creator tooling.
       WORKSHOP SHELL (2026-10-05): core/workshop.js is FIRST so its hidden
       dock hosts (#pf-ammo, #pf-creator-assist, #pf-forged-tray) exist before
       the self-mount modules' IIFEs run — otherwise ammo fires its error
       banner and creator-assist's S7 appends straight into #pf-create.
       pages/workshop-create.js is LAST: it registers every tool adapter with
       the shell and runs the initial route. Both ship here, NOT in
       bundle-create-h (the slim /create bundle stays poster-forge + feed). */
    '../core/workshop.js',
    'academy.js',
    /* Wave 6A R1 (2026-10-04): graduation -> daily-loop induction card.
       Hooks academy.js's pf-lesson-complete event; mounts on /request-access
       + homepage wherever the academy mounts. */
    'academy-graduation.js',
    'creator-assist.js',
    /* Wave claim-support FE (2026-10-05): Ammo Finder — Creator HQ claim
       support. Type a claim, get leftist sources to back it up. Self-mounts
       into #pf-ammo / #pf-war-card. Display-only, no XP. Backend action
       `claim_support_search` CONFIRMED on wave-claim-support (2026-10-05). */
    'ammo.js',
    'armory.js',
    'dashboard.js',
    'earnings.js',
    /* CONTENT BANK POLITICAL METADATA (2026-10-05, weave #8): Bank Browse —
       the Content Bank gallery (filters, sort, load more, REMIX THIS).
       Silo key 'bank-browse'; self-mounts into #pf-bank-browse on the
       Creator HQ Content Bank area, silent no-op elsewhere.
       Kill: ?pf_off=bank-meta. No XP anywhere in this module. */
    'bank-browse.js',
    /* WORKSHOP SHELL adapters (2026-10-05): last in the bundle — registers
       all nine /create tool adapters with PFWorkshop and runs the initial
       #pf-tool= / ?for= route. */
    '../pages/workshop-create.js'
  ],
  'bundle-bank': [
    /* /bank — the People's Bank. */
    'peoplesbank.js',
    'vault.js',
    /* allfronts admin (2026-10-04): operation console mounts beside the vault. */
    'operations-admin.js',
    /* Federal Reserve frontend (2026-10-04): monetary policy dashboard —
       Bank is retail, Reserve is monetary; they belong together on /bank. */
    'reserve.js'
  ],
  'bundle-economy': [
    /* /economy — Run the Economy. */
    'economy.js'
  ],
  'bundle-warchest': [
    /* /war-chest — Movement Finance. */
    'movement.js'
  ],
  'bundle-ventures': [
    /* /ventures — Joint Ventures. */
    'ventures.js'
  ],
  'bundle-events': [
    /* /events — Boots on the Ground. */
    'irl.js'
  ],
  'bundle-warreport': [
    /* /war-report — the weekly digest. */
    'war-report.js',
    /* Wave 5B (2026-10-04): Situation Report pane, prepended into #xWarReport. */
    'theater-sitrep.js'
  ],
  'bundle-roster': [
    /* SLR roster/catalog pages — the live Efficiency Index painter. */
    'efficiency.js'
  ]
};

/* HQ bundle: civic, governance, notify-prefs mount ONLY on /political-hq
   (pages/political-hq.js) — plus Know Your Enemy (intel.js), moved here
   2026-10-03 from the homepage ACT section, plus Ally Organizations
   (nonprofits.js), added 2026-10-05, plus the legislation tracker
   (legislation.js, 2026-10-05) — bill cards with stage progress, key
   players, cell tallies, founder-only cell voting. Loaded by the footer
   loader only when #pf-political-hq is present — never on the homepage or
   other pages. */
var HQ_BUNDLES = {
  'bundle-hq': [
    'civic.js',
    'civic-duty.js',
    /* 2026-10-05 (fe/state-legislatures): state legislature directory. */
    'stateleg.js',
    /* 2026-10-05 (fe/legislation-tracker): bill tracker. */
    'legislation.js',
    'governance.js',
    'notify-prefs.js',
    'intel.js',
    /* 2026-10-05: Call the Shot prediction game (fe/predict-share-call) —
       bill widgets + section + SHARE YOUR CALL poster hook. */
    'predict.js',
    /* Ballot Countdown Cards (2026-10-05): Forged-for-You ballot drafts tray
       + phq-ballot forge/share/pledge loop. Kill ?pf_off=ballotcd. */
    'ballot-countdown.js',
    /* Ally Organizations directory (fe/nonprofits-directory, 2026-10-05). */
    'nonprofits.js'
  ]
};

var ALL = {};
Object.keys(SECTIONS).forEach(function (k) { ALL[k] = SECTIONS[k]; });
Object.keys(HQ_BUNDLES).forEach(function (k) { ALL[k] = HQ_BUNDLES[k]; });

/* COMMAND DASHBOARD (2026-10-05, fe/command-shell): shell + request infra for
   the /command page. Sources live in v1.4.3/command/ (NOT v1.4.3/games/), so
   the "every game file in exactly one bundle" enforcement below never sees
   them. bundle-command is a STANDALONE page bundle — NEVER homepage: the
   HOMEPAGE_EXCLUDE check fails the build if any command file ever lands in
   bundle-sec1 or bundle-home. */
var COMMAND_ROOT = path.join(__dirname, '..', 'v1.4.3', 'command');
var COMMAND_FILES = ['00-shell.js', '01-request.js', '02-registry.js'];
ALL['bundle-command'] = COMMAND_FILES;
var COMMAND_BUNDLE_ROOT = { 'bundle-command': COMMAND_ROOT };

/* Homepage exclusion: command-dashboard files must NEVER ship in the
   homepage critical path (bundle-sec1) or the homepage lazy bundle
   (bundle-home). */
['bundle-sec1', 'bundle-home'].forEach(function (b) {
  SECTIONS[b].forEach(function (f) {
    if (COMMAND_FILES.indexOf(f) !== -1) fail('command file ' + f + ' in homepage bundle ' + b);
  });
});

function fail(msg) { console.error('BUNDLE FAIL: ' + msg); process.exit(1); }

/* Every game .js file must live in exactly one page or HQ bundle — or in
   GLOBAL_CHROME, which ships via build/bundle-core.js (pages/bundle-pages.js
   loads on every v2 page) instead of a page bundle. */
var allFiles = fs.readdirSync(ROOT).filter(function (f) { return f.slice(-3) === '.js'; });
/* Every game .js file must live in exactly one page or HQ bundle — except the
   three SLIM_DUP bundles above, which intentionally re-list silos from
   bundle-home (the loader fetches slim INSTEAD of bundle-home, never both). */
var SLIM_DUP = ['bundle-arcade-h', 'bundle-cells-h', 'bundle-create-h'];
var bundled = [];
Object.keys(ALL).forEach(function (b) {
  if (SLIM_DUP.indexOf(b) !== -1) return; /* see note above */
  ALL[b].forEach(function (f) {
    if (bundled.indexOf(f) !== -1) fail('file in two bundles: ' + f);
    bundled.push(f);
  });
});
/* Dead code, intentionally excluded from every bundle:
   - bank.js superseded by peoplesbank.js.
   - casino.js RETIRED 2026-10-05 (Redistribution Layer Phase A): unmounted
     from the /arcade page order and the manifest; the file stays in repo
     (history). Its ?pf_off=casino kill-switch is vestigial — not rewired.
   - 2026-10-03 homepage slimming consolidated daily-drop, daily-fire,
     boost-raid, media-nuke, video, amplify, archive, bounties, assist into
     other silos — their files are being deleted; the build must not fail
     on their absence (or their presence, mid-migration). */
var DEAD = ['bank.js', 'casino.js', 'daily-drop.js', 'daily-fire.js', 'boost-raid.js',
  'media-nuke.js', 'video.js', 'amplify.js', 'archive.js', 'bounties.js',
  'assist.js'];
/* Global chrome: notify.js (header bell) + flash-siren.js (A2 site-wide siren
   banner) are bundled by build/bundle-core.js into pages/bundle-pages.js —
   intentionally excluded from page bundles. */
var GLOBAL_CHROME = ['notify.js', 'flash-siren.js'];
var unbundled = allFiles.filter(function (f) {
  return bundled.indexOf(f) === -1 && f.indexOf('bundle-') !== 0 &&
    DEAD.indexOf(f) === -1 && GLOBAL_CHROME.indexOf(f) === -1;
});
if (unbundled.length) fail('unbundled game files: ' + unbundled.join(', '));

/* Inner-script syntax gate (2026-10-05): widget silos stage <template> HTML
   containing inner <script> blocks inside template literals. node --check
   only sees the OUTER file — the inner script the browser receives exists
   only after template-literal escape processing, and a SyntaxError there
   kills the whole widget at runtime (MORNING BRIEFING + Solidarity Draw,
   2026-10-05). Check every shipped silo's inner scripts BEFORE bundling. */
try {
  cp.execFileSync(process.execPath,
    [path.join(__dirname, '..', 'scripts', 'check-inner-scripts.js')]
      /* bundle-command silos live under v1.4.3/command/, not v1.4.3/games/. */
      .concat(bundled.map(function (f) {
        return path.join(ALL['bundle-command'].indexOf(f) !== -1 ? COMMAND_ROOT : ROOT, f);
      })),
    { stdio: 'inherit' });
} catch (e) { fail('inner <script> syntax check failed'); }

/* Resolve terser: local node_modules first, then global, then give up. */
function terserBin() {
  var local = path.join(__dirname, '..', 'node_modules', '.bin', 'terser');
  if (fs.existsSync(local)) return local;
  try { cp.execSync('which terser', { stdio: 'pipe' }); return 'terser'; } catch (e) {}
  return null;
}
var TERSER = DEBUG ? null : terserBin();
if (!DEBUG && !TERSER) {
  console.error('BUNDLE WARN: terser not found — writing unminified bundles. Run: npm install terser');
}

var totalRaw = 0, totalOut = 0;
Object.keys(ALL).forEach(function (name) {
  var files = ALL[name];
  var out = [];
  out.push('/* PF v1.4.3 ' + name + '.js — concatenated bundle, generated by build/bundle.js.');
  out.push('   DO NOT EDIT. Regenerate with: node build/bundle.js [--debug]');
  out.push('   Contains: ' + files.join(', '));
  out.push('   Each silo keeps its own PF.skip() kill switch (?pf_off=<silo>). */');
  files.forEach(function (f) {
    var p = path.join(COMMAND_BUNDLE_ROOT[name] || ROOT, f);
    if (!fs.existsSync(p)) fail('missing file: ' + f);
    var src = fs.readFileSync(p, 'utf8');
    out.push('\n/* ===== ' + f + ' ===== */');
    out.push(src);
    /* Semicolon guard: ensure files can't bleed into each other. */
    out.push(';');
  });
  var dest = path.join(ROOT, name + '.js');
  var raw = out.join('\n');
  totalRaw += raw.length;
  var final = raw;
  if (TERSER) {
    try {
      final = cp.execSync(TERSER + ' --compress --mangle --toplevel', {
        input: raw, maxBuffer: 100 * 1024 * 1024
      }).toString();
    } catch (e) {
      console.error('BUNDLE WARN: terser failed on ' + name + ' — writing raw. ' + (e.message || e));
      final = raw;
    }
  }
  fs.writeFileSync(dest, final);
  totalOut += final.length;
  var bytes = fs.statSync(dest).size;

  /* Validate: node --check + new Function parse. */
  try {
    cp.execSync('node --check ' + dest, { stdio: 'pipe' });
  } catch (e) { fail(name + ' failed node --check'); }
  try {
    new Function(fs.readFileSync(dest, 'utf8'));
  } catch (e) { fail(name + ' failed new Function parse: ' + e.message); }

  var saved = raw.length ? Math.round((1 - final.length / raw.length) * 100) : 0;
  console.log(name + '.js: ' + files.length + ' files, ' + (bytes / 1024).toFixed(1) +
    ' KB (' + saved + '% smaller than raw) — OK');
});
console.log('All game bundles built and validated.' +
  (totalRaw ? ' Total: ' + (totalRaw / 1024).toFixed(0) + ' KB raw -> ' +
  (totalOut / 1024).toFixed(0) + ' KB shipped.' : ''));
