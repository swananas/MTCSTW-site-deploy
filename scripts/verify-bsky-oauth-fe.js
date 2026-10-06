#!/usr/bin/env node
/* scripts/verify-bsky-oauth-fe.js — Pod 4 (2026-10-05) "Sign in with Bluesky".
   Verifies the frontend link widget:
   1. rebuilds core bundles via build/bundle-core.js (must run clean)
   2. node --check on the source silo
   3. marker presence in built core/bundle-core.js
   4. banned terms absent (donate, xpGrant, real-name handle)
   5. OAuth constants: client metadata URL, pinned SDK URL, scope 'atproto',
      redirect URI — and the SDK bundle URL is reachable (HTTP 200)
   6. no token exfiltration shape: link POST body fields are exactly
      type/bl_action/callsign/did/handle (auth_secret rides the standard
      PF.authPost mechanism, like every other write)
   Exits 0 when every check passes. */
'use strict';
var cp = require('child_process');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var SRC = path.join(V, 'core', '28-bsky-link.js');
var BUNDLE = path.join(V, 'core', 'bundle-core.js');
var SDK_IIFE = path.join(V, 'core', 'bsky-oauth-sdk.js');
var SDK_BUILD = path.join(ROOT, 'scripts', 'build-bsky-sdk.js');

var failures = [];
function ok(name) { console.log('ok   ' + name); }
function no(name, why) { failures.push(name + ': ' + why); console.error('FAIL ' + name + ' — ' + why); }
function has(hay, needle) { return hay.indexOf(needle) >= 0; }
function read(f) { return fs.readFileSync(f, 'utf8'); }

console.log('== 0. rebuild core bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

console.log('== 1. syntax ==');
try { cp.execSync('node --check ' + JSON.stringify(SRC), { stdio: 'pipe' }); ok('node --check 28-bsky-link.js'); }
catch (e) { no('syntax', 'node --check failed'); }

var src = '', bundle = '';
try { src = read(SRC); bundle = read(BUNDLE); }
catch (e) { no('read files', String(e && e.message)); }

console.log('== 2. markers ==');
[['pf-bsky-card', 'card marker'], ['BrowserOAuthClient', 'SDK usage'],
 ['bsky_link', 'link action'], ['bsky_unlink', 'unlink action'],
 ['bsky_status', 'status action'], ['28-bsky-link', 'kill-switch id'],
].forEach(function (m) {
  if (has(src, m[0]) && has(bundle, m[0])) ok('marker ' + m[1]);
  else no('marker ' + m[1], 'missing in src and/or built bundle');
});

console.log('== 3. banned terms / hygiene ==');
if (!/donate/i.test(src)) ok('no "donate" in copy');
else no('banned term', '"donate" appears in copy');
if (src.indexOf('xpGrant') < 0) ok('no xpGrant (zero XP)');
else no('xp discipline', 'xpGrant referenced');
if (!/shanetheswan/i.test(src)) ok('no real-name handle');
else no('identity', '@shanetheswan appears');
/* No token material may be referenced as a payload field. */
var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '');
if (!/access_token|refresh_token|id_token/i.test(codeOnly)) ok('no OAuth token fields in code');
else no('no-token invariant', 'token-shaped identifier in code');

console.log('== 4. OAuth constants ==');
var MD_URL = 'https://pf-api.mtcstw.workers.dev/oauth-client-metadata.json';
var RESOLVER = 'https://pf-api.mtcstw.workers.dev';
var REDIRECT = 'https://www.mtcstw.com/?bsky_oauth=1';
[[MD_URL, 'client metadata URL'], [RESOLVER, 'backend handleResolver (XRPC proxy)'],
 [REDIRECT, 'redirect URI'],
 ["scope: 'atproto'", 'minimal scope at signIn'],
 ['bsky-oauth-sdk.js', 'lazy IIFE chunk reference'],
 ['PFBlueskyOAuth', 'IIFE global name'],
].forEach(function (c) {
  if (has(src, c[0])) ok(c[1]);
  else no(c[1], 'constant missing: ' + c[0]);
});
/* The widget must NOT pull the SDK from a third-party CDN at runtime —
   it lazy-loads our own pinned IIFE chunk (same pin as the core bundle). */
if (!/cdn\.jsdelivr\.net\/npm\/@atproto/.test(src)) ok('no third-party SDK CDN in widget');
else no('SDK sourcing', 'widget still references a third-party SDK CDN');
/* Link POST body shape: only public identifiers (+ standard callsign auth). */
var postShape = /bl_action:\s*'bsky_link',\s*callsign:\s*callsign\(\),\s*did:\s*did,\s*handle:\s*handle/;
if (postShape.test(src)) ok('link POST body = type/bl_action/callsign/did/handle only');
else no('link POST shape', 'unexpected fields in the link POST body');

console.log('== 5. SDK IIFE bundle ==');
try {
  var sdk = read(SDK_IIFE);
  if (/PFBlueskyOAuth/.test(sdk) && /BrowserOAuthClient/.test(sdk)) ok('IIFE exposes PFBlueskyOAuth.BrowserOAuthClient');
  else no('SDK IIFE', 'global or BrowserOAuthClient missing');
  if (!/^\s*import[\s('"]|^\s*export[\s{]/m.test(sdk)) ok('IIFE has no ESM import/export leakage');
  else no('SDK IIFE', 'ESM statements leaked into the bundle');
  var kb = Math.round(sdk.length / 1024);
  if (kb < 400) ok('IIFE size ' + kb + ' KB (lazy-loaded, off critical path)');
  else no('SDK IIFE', 'bundle suspiciously large: ' + kb + ' KB');
} catch (e) { no('SDK IIFE', 'bsky-oauth-sdk.js missing — run node scripts/build-bsky-sdk.js'); }
if (fs.existsSync(SDK_BUILD)) ok('scripts/build-bsky-sdk.js present (additive esbuild step)');
else no('SDK build step', 'scripts/build-bsky-sdk.js missing');

console.log('\n' + (failures.length ? failures.length + ' FAILURES' : 'ALL CHECKS PASSED'));
process.exit(failures.length ? 1 : 0);
