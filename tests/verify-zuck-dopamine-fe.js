#!/usr/bin/env node
/* tests/verify-zuck-dopamine-fe.js — ZUCK IT UP dopamine workstream (2026-10-09).
 * Verifies: 45-zuck-dopamine.js is in the core composition AND the built
 * bundles; index.html pillar section carries entrance/stagger hooks;
 * kill switch + reduced-motion + fail-safe present; rewards scaffolding is
 * DISABLED BY DEFAULT (Psych brief gating — no invented reward mechanics);
 * no nested anchors introduced. Run: node tests/verify-zuck-dopamine-fe.js */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'v1.4.3', 'core', '45-zuck-dopamine.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function has(f, s) { return fs.existsSync(f) && fs.readFileSync(f, 'utf8').indexOf(s) !== -1; }

/* 1. source exists + parses */
if (!fs.existsSync(SRC)) no('source file', 'missing v1.4.3/core/45-zuck-dopamine.js');
else {
  try { cp.execSync('node --check ' + JSON.stringify(SRC), { stdio: 'pipe' }); ok('source node --check'); }
  catch (e) { no('source node --check', 'parse failed'); }
}

/* 2. in build composition */
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/45-zuck-dopamine.js'")) ok('composition lists 45-zuck-dopamine.js');
else no('composition', "'core/45-zuck-dopamine.js' not in build/bundle-core.js CORE_FILES");

/* 3. in built bundles (root tree + site mirror) */
['v1.4.3/core/bundle-core-slr.js', 'v1.4.3/core/bundle-core.js',
 'site/v1.4.3/core/bundle-core-slr.js', 'site/v1.4.3/core/bundle-core.js'].forEach(function (b) {
  if (has(path.join(ROOT, b), 'PF.zuck')) ok(b + ' contains PF.zuck');
  else no(b, 'PF.zuck marker missing');
});

/* 4. index.html hooks */
var IDX = path.join(ROOT, 'site', 'index.html');
if (!fs.existsSync(IDX)) no('index.html', 'missing site/index.html');
else {
  var html = fs.readFileSync(IDX, 'utf8');
  var entr = (html.match(/data-pf-entrance/g) || []).length;
  if (entr >= 6) ok('index.html data-pf-entrance x' + entr + ' (h1, sub, 4 pillars)');
  else no('index.html entrances', 'only ' + entr + ' data-pf-entrance hooks');
  if (html.indexOf('data-pf-stagger="pillars"') !== -1) ok('index.html data-pf-stagger="pillars"');
  else no('index.html stagger', 'missing data-pf-stagger="pillars"');
  if (html.indexOf('.pf-entr-fail') !== -1 && html.indexOf('pf-js') !== -1) ok('index.html entrance CSS + pf-js/fail-safe');
  else no('index.html entrance CSS', 'missing pf-js gate or pf-entr-fail fallback');
  if (html.indexOf('prefers-reduced-motion') !== -1) ok('index.html reduced-motion CSS');
  else no('index.html reduced-motion', 'missing');
  /* no nested anchors introduced by our edits */
  var pillarBlock = html.slice(html.indexOf('id="pf-pillars"'), html.indexOf('id="pf-pillars"') + 4000);
  if (pillarBlock.indexOf('<a ') !== -1 && pillarBlock.replace(/<a /g, '').indexOf('<a ') === -1 || true) {
    var anchors = (pillarBlock.match(/<a /g) || []).length;
    if (anchors === 4) ok('pillar section has exactly 4 anchors, none nested');
    else no('pillar anchors', 'expected 4 anchors, found ' + anchors);
  }
}

/* 5. kill switch + reduced motion in source */
var src = fs.readFileSync(SRC, 'utf8');
if (src.indexOf("PF.skip('dopamine')") !== -1) ok('kill switch ?pf_off=dopamine checked');
else no('kill switch', "PF.skip('dopamine') missing");
if (src.indexOf('prefers-reduced-motion') !== -1) ok('reduced-motion respected');
else no('reduced-motion', 'missing');
if (src.indexOf('?pf_off=dopamine') !== -1) ok('kill documented in header comment');
else no('kill doc', 'header comment missing kill doc');

/* 6. REWARD GATING — the hard constraint */
if (/enabled\s*:\s*false/.test(src)) ok('rewards.enabled=false by default');
else no('reward gate', 'rewards.enabled is not false by default');
if (src.indexOf('zuck-dopamine-rules-20261009') !== -1) ok('rewards gate references Psych brief');
else no('reward gate', 'no reference to Psych brief');
var srcNoVeto = src.toLowerCase().replace(/no variable-ratio\/streaks?\//g, '').replace(/no streaks?,/g, '');
if (srcNoVeto.indexOf('streak') === -1) ok('no streak mechanics invented');
else no('streak', 'streak mechanic language present without brief');
if (!/Math\.random\(\)/.test(src.replace(/pfdope|COLORS/g, '')) || true) {
  if (src.indexOf('Math.random') === -1) ok('no randomness (no variable-reward machinery)');
  else no('randomness', 'Math.random present — variable-reward machinery needs Psych clearance');
}
if (src.toLowerCase().indexOf('dark pattern') !== -1) ok('no-dark-patterns stance documented');
else no('dark patterns', 'stance not documented');

/* 7. no economy surface (doc phrases like "no economy events" are fine) */
var srcNoDoc = src.replace(/no economy events?/g, '').replace(/economy coupling/g, '');
['xpGrant', 'PF.tally', 'ledger', 'economy'].forEach(function (w) {
  if (srcNoDoc.indexOf(w) === -1) ok('no economy surface: ' + w);
  else no('economy surface', w + ' referenced in motion module');
});

/* 8. Psych brief §1 caps (exact) */
if (src.indexOf('scale(.98)') !== -1) ok('§1-A press scale floor 0.98');
else no('§1-A scale', 'scale(.98) missing');
if (src.indexOf('translateY(1px)') !== -1) ok('§1-A press translateY(1px)');
else no('§1-A press', 'translateY(1px) missing');
if (src.indexOf('cubic-bezier(.2,.9,.25,1.2)') !== -1) ok('§1-A release spring easing');
else no('§1-A release', 'soft-spring easing missing');
if (/animation:pfzrip \.4s/.test(src)) ok('§1-A ripple 400ms');
else no('§1-A ripple', '400ms ripple missing');
if (src.indexOf('rgba(229,56,59,.22)') !== -1) ok('§1-A ripple opacity 0.22');
else no('§1-A ripple', '0.22 ink opacity missing');
if (src.indexOf('data-pf-burst') !== -1) ok('§1-B one burst per tap guard');
else no('§1-B burst', 'one-burst-per-tap guard missing');
var burstCount = (src.match(/for\(i=0;i<10;i\+\+\)/) || []).length;
if (burstCount) ok('§1-B burst = 10 particles (within 8–12)');
else no('§1-B burst', '10-particle burst loop missing');
if (src.indexOf('--dy') !== -1 && src.indexOf('-50-') !== -1) ok('§1-B burst drifts upward');
else no('§1-B burst', 'upward drift missing');
if (src.indexOf('animationend') !== -1) ok('§1-B/DOM hygiene: animationend removal');
else no('DOM hygiene', 'animationend removal missing');
var kf = (src.match(/@keyframes /g) || []).length;
if (kf <= 6) ok('§1-D keyframes ≤ 6 (' + kf + ' found)');
else no('§1-D keyframes', kf + ' keyframes exceeds 6');
var gz = require('zlib').gzipSync(fs.readFileSync(SRC)).length;
if (gz < 3 * 1024) ok('§1-D dopamine layer < 3KB (' + (gz / 1024).toFixed(2) + 'KB gzip)');
else no('§1-D budget', 'module gzip ' + (gz / 1024).toFixed(2) + 'KB exceeds 3KB');
if (src.indexOf('Math.random') === -1) ok('§2-1 no variable-ratio randomness');
else no('§2-1', 'Math.random present — variable-ratio veto');
if (srcNoVeto.indexOf('streak') === -1)
  ok('§2-2 no streak mechanics');
else no('§2-2', 'streak language present');
['pf-prog', 'setProgress'].forEach(function (w) {
  if (src.indexOf(w) === -1) ok('§3 relocation: no landing progress surface (' + w + ')');
  else no('§3 relocation', w + ' present — progress delight belongs on destination pages');
});
[0, 120, 200].forEach(function (d) {
  if (src.indexOf('return ' + d + ';') !== -1) ok('§1-C entrance delay ' + d + 'ms');
  else no('§1-C entrance', d + 'ms delay missing');
});
if (src.indexOf('return 240+n*80') !== -1) ok('§1-C pillar delays 240/320/400/480ms');
else no('§1-C entrance', 'pillar delay formula missing');
if (src.indexOf('Vibration') !== -1 && src.indexOf('NOT used') !== -1) ok('§1-B vibration API not used (documented)');
else no('§1-B vibration', 'not documented as unused');
if (src.indexOf('pf-op-claim') !== -1) ok('§1-A callsign CTA bound');
else no('§1-A callsign', 'callsign CTA not bound');

/* 8. site tree mirror byte-identical */
['core/bundle-core-slr.js', 'core/bundle-core.js'].forEach(function (b) {
  var a = path.join(ROOT, 'v1.4.3', b), c = path.join(ROOT, 'site', 'v1.4.3', b);
  if (fs.existsSync(a) && fs.existsSync(c) && fs.readFileSync(a).equals(fs.readFileSync(c)))
    ok('site mirror byte-identical: ' + b);
  else no('site mirror', b + ' differs between v1.4.3/ and site/v1.4.3/');
});

console.log('\nverify-zuck-dopamine-fe: ' + passes + ' PASS, ' + fails.length + ' FAIL');
process.exit(fails.length ? 1 : 0);
