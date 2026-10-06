#!/usr/bin/env node
/* scripts/build-bsky-sdk.js — Pod 4 (2026-10-05): "Sign in with Bluesky".
   ADDITIVE build step (does not touch the terser concat pipeline).
   The official @atproto/oauth-client-browser SDK is ESM-only — no UMD/IIFE
   build is shipped — so it cannot ride build/bundle.js (whole-file-concat
   of IIFE silos). This step bundles it once per deploy into a lazily-loaded
   IIFE at v1.4.3/core/bsky-oauth-sdk.js, exposed as window.PFBlueskyOAuth.
   The widget (core/28-bsky-link.js) lazy-loads that file via <script> ONLY
   on user action (Sign in click) or the OAuth callback landing — never on
   the homepage critical path (~150-250KB minified).
   Run: node scripts/build-bsky-sdk.js
   (Release Eng: run this before pushing; the committed artifact is the
   fallback if the step is ever skipped.) */
'use strict';
var esbuild = require('esbuild');
var path = require('path');
var fs = require('fs');

var ROOT = path.join(__dirname, '..');
var ENTRY = path.join(ROOT, 'node_modules', '@atproto', 'oauth-client-browser', 'dist', 'index.js');
var OUT = path.join(ROOT, 'v1.4.3', 'core', 'bsky-oauth-sdk.js');

if (!fs.existsSync(ENTRY)) {
  console.error('build-bsky-sdk: SDK entry not found: ' + ENTRY);
  console.error('Run: npm install --save-dev @atproto/oauth-client-browser');
  process.exit(1);
}

esbuild.buildSync({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'iife',
  globalName: 'PFBlueskyOAuth',
  minify: true,
  outfile: OUT,
});

var kb = Math.round(fs.statSync(OUT).size / 1024);
var src = fs.readFileSync(OUT, 'utf8');
if (!/PFBlueskyOAuth/.test(src)) { console.error('build-bsky-sdk: global not found in output'); process.exit(1); }
if (!/BrowserOAuthClient/.test(src)) { console.error('build-bsky-sdk: BrowserOAuthClient missing from bundle'); process.exit(1); }
/* IIFE sanity: no ESM import/export statements may survive bundling. */
if (/^\s*import[\s('"]|^\s*export[\s{]/m.test(src)) {
  console.error('build-bsky-sdk: ESM statements leaked into the IIFE bundle');
  process.exit(1);
}
console.log('bsky-oauth-sdk.js built: ' + kb + ' KB — OK');
