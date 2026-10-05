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
    'dopamine.js',
    'enlistment-ranks.js',
    /* Wave 5B (2026-10-04): theater rack + ribbon chase strip + Frontline
       Streak + Theater Rank. Self-mounts into #pf-ranks and #xBrief. */
    'theater.js',
    'service-medals.js',
    'social-proof.js'
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
    'feed.js',
    'political-hq-nudge.js',
    'war-bonds.js',
    'campaign.js',
    'alerts.js',
    'fan-vote.js',
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
    'briefing-siren.js'
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
    'war-room-ticker.js'
  ],
  'bundle-create-h': [
    /* /create — poster-forge + feed (the Propaganda Feed workshop). */
    'poster-forge.js',
    'feed.js'
  ],
  'bundle-arcade': [
    /* /arcade — the 4 arcade games not already in bundle-home. */
    'caption-combat.js',
    'bracket-board.js',
    'battles.js',
    'casino.js',
    /* White Market de-isolation (2026-10-04, worker C): exit routing, win-share
       poster, sweep-to-vault, bet tracking. Hooks into casino.js settlements. */
    'casino-exits.js',
    /* THE WHITE MARKET lobby + prediction markets (2026-10-04, worker B):
       hall front door + markets panel. Mounts first on /arcade via
       page-mount.js, ahead of the casino house-games zone. */
    'markets.js',
    /* A3 Deployment Tracker (2026-10-04): /arcade lobby deep-links into
       unplayed medal games. Coordinator: rebuild bundles to ship. */
    'deploy-tracker.js'
  ],
  'bundle-cells': [
    /* /cells (+ Creator HQ) — the cell lifecycle. */
    'cell-hq.js',
    'cell-war.js',
    'diplomacy.js',
    'contracts.js',
    'war-card.js'
  ],
  'bundle-create': [
    /* /create (+ Creator HQ) — creator tooling. */
    'academy.js',
    /* Wave 6A R1 (2026-10-04): graduation -> daily-loop induction card.
       Hooks academy.js's pf-lesson-complete event; mounts on /request-access
       + homepage wherever the academy mounts. */
    'academy-graduation.js',
    'creator-assist.js',
    'armory.js',
    'dashboard.js',
    'earnings.js'
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
   2026-10-03 from the homepage ACT section. Loaded by the footer loader
   only when #pf-political-hq is present — never on the homepage or other
   pages. */
var HQ_BUNDLES = {
  'bundle-hq': [
    'civic.js',
    'governance.js',
    'notify-prefs.js',
    'intel.js'
  ]
};

var ALL = {};
Object.keys(SECTIONS).forEach(function (k) { ALL[k] = SECTIONS[k]; });
Object.keys(HQ_BUNDLES).forEach(function (k) { ALL[k] = HQ_BUNDLES[k]; });

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
   - 2026-10-03 homepage slimming consolidated daily-drop, daily-fire,
     boost-raid, media-nuke, video, amplify, archive, bounties, assist into
     other silos — their files are being deleted; the build must not fail
     on their absence (or their presence, mid-migration). */
var DEAD = ['bank.js', 'daily-drop.js', 'daily-fire.js', 'boost-raid.js',
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
    var p = path.join(ROOT, f);
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
