#!/usr/bin/env node
/* build/bundle.js — Concatenate v1.4.3 game silos into 7 section bundles.
 *
 * WHY WHOLE-FILE CONCAT: each game file is a self-contained IIFE that (1)
 * checks PF.skip() for its kill switch, then (2) stages a <template> into
 * PF.holder(). Concatenating whole files preserves both behaviors exactly.
 * Extracting inner scripts would break the staging mechanism. Each file is
 * its own namespace guard (IIFE) so concatenation is collision-safe.
 *
 * BUNDLES (2026-10-02): one per homepage funnel section (see
 * pages/home-v2.js SECTIONS). The loader fetches sec1 with the critical
 * path and lazy-loads sec2..sec7 per section as the user scrolls.
 * Cache win: change one widget → only its section bundle invalidates.
 *
 * Minification: terser (node_modules) with --compress --mangle. Falls back
 * to raw on error. Pass --debug to write unminified bundles instead.
 *
 * Usage: node build/bundle.js [--debug]
 * Output: v1.4.3/games/bundle-sec1.js … bundle-sec7.js + bundle-hq.js
 * (bundle-hq.js = HQ-only silos for /political-hq; loaded on demand by the
 *  footer loader, never in the homepage critical path or lazy set.)
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');
var DEBUG = process.argv.indexOf('--debug') !== -1;

/* Section -> silo files. Mirrors pages/home-v2.js SECTIONS/ORDER.
   Non-ORDER silos get a home by affinity:
   - service-medals: hooks into #pf-ranks (sec1)
   - cell-hq, war-card: Creator HQ mounts (sec3, cell affinity)
   - creator-assist: creator tooling (sec4)
   - efficiency: background service painting roster scores (sec7)
   HQ silos (civic, governance, notify-prefs) mount ONLY on /political-hq and
   live in the separate HQ_BUNDLES set below — never in the homepage
   section bundles (~31KB saved per homepage visit). */
var SECTIONS = {
  'bundle-sec1': [
    /* START HERE — hook & daily loop. In critical path (loads blocking). */
    'briefing.js',
    'do-meter.js',
    'daily-orders.js',
    'dopamine.js',
    'enlistment-ranks.js',
    'service-medals.js',
    'notify.js',
    'social-proof.js'
  ],
  'bundle-sec2': [
    /* PLAY — games arcade. */
    'caption-combat.js',
    'creator-guess.js',
    'slr-match-quiz.js',
    'daily-interrogation.js',
    'billionaire-supervillain.js',
    'bracket-board.js',
    'boost-raid.js',
    'daily-drop.js',
    'battles.js',
    'infighting.js',
    'media-nuke.js',
    'casino.js'
  ],
  'bundle-sec3': [
    /* BELONG — cells & squads. */
    'cells.js',
    'cell-hq.js',
    'cell-war.js',
    'diplomacy.js',
    'contracts.js',
    'referral.js',
    'war-card.js'
  ],
  'bundle-sec4': [
    /* CREATE — creator tools. */
    'academy.js',
    'assist.js',
    'creator-assist.js',
    'poster-forge.js',
    'video.js',
    'feed.js',
    'amplify.js',
    'political-hq-nudge.js',
    'armory.js',
    'archive.js',
    'dashboard.js'
  ],
  'bundle-sec5': [
    /* FUND — economy & money. */
    'peoplesbank.js',
    'economy.js',
    'war-bonds.js',
    'movement.js',
    'earnings.js',
    'bounties.js',
    'ventures.js',
    'vault.js'
  ],
  'bundle-sec6': [
    /* ACT — action & intel. */
    'campaign.js',
    'alerts.js',
    'irl.js',
    'intel.js'
  ],
  'bundle-sec7': [
    /* PROOF — social validation. */
    'fan-vote.js',
    'efficiency.js'
  ]
};

/* HQ-only bundle: civic, governance, notify-prefs mount ONLY on /political-hq
   (pages/political-hq.js). Loaded by the footer loader only when
   #pf-political-hq is present — NOT on the homepage or other pages. */
var HQ_BUNDLES = {
  'bundle-hq': [
    'civic.js',
    'governance.js',
    'notify-prefs.js'
  ]
};

var ALL = {};
Object.keys(SECTIONS).forEach(function (k) { ALL[k] = SECTIONS[k]; });
Object.keys(HQ_BUNDLES).forEach(function (k) { ALL[k] = HQ_BUNDLES[k]; });

function fail(msg) { console.error('BUNDLE FAIL: ' + msg); process.exit(1); }

/* Every game .js file must live in exactly one section or HQ bundle. */
var allFiles = fs.readdirSync(ROOT).filter(function (f) { return f.slice(-3) === '.js'; });
var bundled = [];
Object.keys(ALL).forEach(function (b) {
  ALL[b].forEach(function (f) {
    if (bundled.indexOf(f) !== -1) fail('file in two bundles: ' + f);
    bundled.push(f);
  });
});
/* Dead code: bank.js superseded by peoplesbank.js, intentionally excluded. */
var DEAD = ['bank.js'];
var unbundled = allFiles.filter(function (f) {
  return bundled.indexOf(f) === -1 && f.indexOf('bundle-') !== 0 && DEAD.indexOf(f) === -1;
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
console.log('All section bundles built and validated.' +
  (totalRaw ? ' Total: ' + (totalRaw / 1024).toFixed(0) + ' KB raw -> ' +
  (totalOut / 1024).toFixed(0) + ' KB shipped.' : ''));
