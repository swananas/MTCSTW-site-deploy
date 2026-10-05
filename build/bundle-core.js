#!/usr/bin/env node
/* build/bundle-core.js — Concatenate v1.4.3 core + page files into bundles.
 *
 * WHY: the footer loader was fetching 15 core files + 5 page files as 20
 * sequential blocking requests (async=false). Concatenation in loader order
 * is behavior-identical (order preserved) and cuts initial requests 23 -> 4.
 *
 * M34 (2026-10-03): core/07-slr-db-data.js (173KB raw, 41.6KB gzip — 71% of
 * the old bundle-core) NO LONGER ships in core/bundle-core.js. It lives in
 * core/bundle-core-slr.js instead: the identical core composition plus the
 * snapshot in the same position. The footer loader
 * (loader/footer_v143_final.html) picks bundle-core-slr.js on pages that
 * mount roster consumers (homepage, /arcade, /create, Creator HQ, SLR
 * roster/catalog) and the slim bundle-core.js everywhere else (/bank,
 * /economy, /war-chest, /ventures, /events, /war-report, /political-hq,
 * /cells never read the DB). Synchronous PF.ROSTER / PF.slrAll() consumers
 * keep working unchanged on SLR pages; on slim-core pages the DB loads on
 * demand via PF.ensureSLRDB() (core/07-slr-db.js) — promise-cached, deduped,
 * fails gracefully to [].
 *
 * SAFETY:
 * - 07-slr-db.js ownBase() matches 'bundle-core' in script src — also matches
 *   'bundle-core-slr.js' (substring), so the lazy data URL resolves on both.
 * - pwa/install.js pwaBase() matches any '/v1.4.3/' + 'MTCSTW-site-deploy'
 *   script — works with both bundle names.
 * - Kill switches (?pf_off=<silo>) are by silo name, not filename — preserved.
 * - Page files guard on DOM presence (getElementById checks) — safe to concat.
 *
 * Usage: node build/bundle-core.js [--debug]
 * Output: v1.4.3/core/bundle-core.js, v1.4.3/core/bundle-core-slr.js,
 *         v1.4.3/pages/bundle-pages.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var V143 = path.join(__dirname, '..', 'v1.4.3');
var DEBUG = process.argv.indexOf('--debug') !== -1;

/* The slim core composition. bundle-core-slr (below) = this list plus the
   173KB SLR snapshot, for pages that mount roster consumers. */
var CORE_FILES = [
  'core/00-bus.js',
  'core/07-slr-db.js',
  'core/03-global.js',
  /* wave-live-rails (2026-10-05): site_config client — key dates, tuning
     knobs, small facts. Early: other modules read through PF.siteConfig. */
  'core/site-config.js',
  /* wave-live-rails (2026-10-05): Top Stories rail client — one shared
     helper (PF.newsTop) so every section renders the same news cache. */
  'core/news-top.js',
  /* creator-stats (2026-10-05): unified stats reader — PF.creatorStats.
     After 03-global (PF_BACKEND_URL); lazy, no load-time DOM/DB dependency. */
  'core/creator-stats.js',
  'core/14-auth.js',
  'pwa/install.js',
  'core/04-ledger.js',
  'core/05-tally.js',
  'core/08-dopamine.js',
  'core/09-referral.js',
  /* R26 (2026-10-04): shared power-up/shield inventory chip. Core so every
     page bundle can mount it via PF.mountInventoryChip. */
  'core/23-inventory.js',
  'core/10-convert.js',
  'core/11-xpledger.js',
  'core/12-notify.js',
  'core/13-flow.js',
  'core/15-seo.js',
  'core/campaign-data.js',
  'core/17-nuke-strip.js',
  'core/16-footer.js',
  /* crossnav: persistent 9-page cross-link strip + page CTAs (all pages). */
  'core/19-crossnav.js',
  /* nextop (S4, 2026-10-04): context-aware NEXT OP card, in-flow above the
     footer chrome on every page. Last: mounts before the footer element,
     so the chrome strips (crossnav/16-footer) sit below it. */
  'core/20-nextop.js',
  /* allfronts (2026-10-04): ALL FRONTS operation banner — fixed-top strip
     while an operation is live or launching within the hour. */
  'core/21-allfronts.js',
  /* routemarch (S1, 2026-10-04): daily guided-circuit strip — STOP n OF 4
     + claim button on today's route stop pages. Last: mounts before the
     footer element, alongside nextop. */
  'core/22-routemarch.js',
  /* squadjoin (R19, 2026-10-04): post-claim "NOW GET A SQUAD." interstitial. */
  'core/22-squadjoin.js',
  /* rites (ENLISTED, 2026-10-05): post-claim enlistment ceremony (r0 claim
     arbitration). ORDER: must follow 22-squadjoin.js — both listen for
     'pf-callsign-claimed' with a 1200ms beat, and squadjoin's listener must
     register first so its beat sees r0='pending' and polls to a verdict. */
  'core/rites.js',
  /* first-minute (Spec 2, 2026-10-05): anonymous homepage first-60s mission.
     Page-conditional (self-gates on the #pf-v2 homepage shell + no
     callsign), like 22-routemarch.js — bundled in core, never shown off-page. */
  'core/24-first-minute.js',
  /* commend (W5-7, 2026-10-04): Battle Commendations — ticker-item kudos
     buttons + daily progress chip + standalone commend-a-callsign form. */
  'core/commend.js',
  /* oparc (W5-10, 2026-10-04): operation arc reader — PF.opArc(), no DOM. */
  'core/oparc.js',
  /* read-xp (read/create XP, 2026-10-05): article reader (visibility-aware
     heartbeats + comprehension quiz), Ammo Finder CITE THIS decorator,
     Content Bank composer, poster-share proof capture. Self-mounts only
     on explicit anchors (#pf-readxp / #pf-readxp-bank); decorates Top
     Stories surfaces and Ammo Finder cards via MutationObserver when
     those dependencies are present. Fail-soft everywhere. */
  'core/read-xp.js',
  /* dead-drop (A1, 2026-10-05): daily hidden XP cache. Riddle card injects
     into the Morning Briefing (#xBrief); tappable cache widget renders ONLY
     on the server-supplied hidden page, mounted above the footer. The claim
     POST validates server-side; the page is never hardcoded client-side.
     Was a dead file — written but never bundled. Kill: ?pf_off=deaddrop. */
  'core/22-dead-drop.js'
];

var BUNDLES = {
  'core/bundle-core': CORE_FILES.slice(),
  /* M34: roster pages get the identical core PLUS the snapshot, in the same
     relative position the old bundle-core used (right after 00-bus.js). */
  'core/bundle-core-slr':
    ['core/00-bus.js', 'core/07-slr-db-data.js'].concat(CORE_FILES.slice(1)),
  'pages/bundle-pages': [
    'pages/home-v2.js',
    'pages/political-hq.js',
    'pages/slr-roster.js',
    'pages/slr-catalog.js',
    'pages/page-mount.js',
    'games/notify.js',
    /* A2 flash siren: site-wide banner, self-mounting + fail-silent. Global
       chrome (every v2 page) — was a dead file at 4ce7391, never bundled. */
    'games/flash-siren.js',
    'core/06-pinups.js',
    'core/share-image.js',
    /* PHQ share posters (2026-10-05): the five Political HQ custom painters
       (pressure / prediction / scorecard / cell-win / wall-of-shame). Right after
       share-image so PFShare is registered first; registers via PFShare.setPoster
       with its own retry loop, and exposes PF.PHQShare for the PHQ silos. */
    'core/share-image-phq.js',
    /* Wall of Shame (2026-10-05): bill-detail legislator carousel
       (PFWallShame.mount). Right after share-image-phq.js so the
       phq-wallshame painter is registered before any card SHARE/DOWNLOAD
       can fire. Never auto-mounts — Release Eng calls PFWallShame.mount()
       from the bill detail view (fe/legislation-tracker). */
    'core/wall-of-shame.js',
    /* Stock Trades (2026-10-05): legislator money tab (PFTradesTab.mount).
       Right after wall-of-shame.js — same PHQ silo family, rides the
       phq-trades painter registered above. Never auto-mounts — Release Eng
       calls PFTradesTab.mount() from the legislator money view
       (fe/follow-the-money). */
    'core/trades-tab.js',
    /* creator-recruit: shared recruiting toolbar for roster cards + catalog
       pages. Last: needs PFShare (share-image.js) + the catalog renderers. */
    'pages/creator-recruit.js',
    /* Wave 6A R5 (2026-10-04): recruit-link -> guided first hour welcome card
       for ?creator= arrivals on /request-access. Needs the SLR roster
       (core) + PF.requireCallsign (core). */
    'pages/recruit-welcome.js'
  ],
  /* DEFECT 1 (2026-10-03): /store, /privacy, /terms and every other non-v2
     page route to the v1.1.0 silo set, which carries no footer chrome — the
     DELETE MY DATA link (16-footer) and the NUKE meter / RUN MISSION bar
     (17-nuke-strip) shipped only inside bundle-core.js (v2 pages). This slim
     bundle carries just the chrome plus its minimum runtime (PF bus, backend
     URL + identity helpers, authPost) so the loader can append it to the
     v1.1.0 branch. Double-load safe on v2 pages (00-bus/14-auth/16/17 all
     guard on existing state), but the loader only requests it off-v2. */
  'core/bundle-footer-chrome': [
    'core/00-bus.js',
    'core/18-footer-deps.js',
    'core/14-auth.js',
    'core/17-nuke-strip.js',
    'core/16-footer.js',
    /* crossnav: persistent 9-page strip on v1.1.0-branch pages too. */
    'core/19-crossnav.js',
    /* nextop (S4, 2026-10-04): NEXT OP card on v1.1.0-branch pages too —
       every page ends with a next action, not just v2 pages. */
    'core/20-nextop.js',
    /* allfronts (2026-10-04): operation banner on v1.1.0-branch pages too. */
    'core/21-allfronts.js',
    /* routemarch (S1, 2026-10-04): route strip on v1.1.0-branch pages too —
       stop pages like /bank and /political-hq ride this bundle. */
    'core/22-routemarch.js',
    /* commend (W5-7, 2026-10-04): commend buttons + chip on v1.1.0 pages too. */
    'core/commend.js',
    /* oparc (W5-10, 2026-10-04): PF.opArc() reader on v1.1.0 pages too. */
    'core/oparc.js'
  ]
};

function fail(msg) { console.error('BUNDLE FAIL: ' + msg); process.exit(1); }

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

Object.keys(BUNDLES).forEach(function (name) {
  var files = BUNDLES[name];
  var out = [];
  out.push('/* PF v1.4.3 ' + name + '.js — concatenated bundle, generated by build/bundle-core.js.');
  out.push('   DO NOT EDIT. Regenerate with: node build/bundle-core.js [--debug]');
  out.push('   Contains: ' + files.join(', '));
  out.push('   Each file keeps its own PF.skip() kill switch (?pf_off=<silo>). */');
  files.forEach(function (f) {
    var p = path.join(V143, f);
    if (!fs.existsSync(p)) fail('missing file: ' + f);
    var src = fs.readFileSync(p, 'utf8');
    out.push('\n/* ===== ' + f + ' ===== */');
    out.push(src);
    out.push(';');
  });
  var dest = path.join(V143, name + '.js');
  var raw = out.join('\n');
  var final = raw;
  if (TERSER) {
    try {
      final = cp.execSync(TERSER + ' --compress --mangle --toplevel', {
        input: raw, maxBuffer: 100 * 1024 * 1024
      }).toString();
    } catch (e) {
      console.error('BUNDLE WARN: terser failed on ' + name + ' — writing raw.');
      final = raw;
    }
  }
  fs.writeFileSync(dest, final);
  var bytes = fs.statSync(dest).size;
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
console.log('Core bundles built and validated.');
