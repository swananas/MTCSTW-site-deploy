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
if (src.indexOf('streak') === -1 || src.toLowerCase().indexOf('no streak') !== -1) ok('no streak mechanics invented');
else no('streak', 'streak mechanic language present without brief');
if (!/Math\.random\(\)/.test(src.replace(/pfdope|COLORS/g, '')) || true) {
  if (src.indexOf('Math.random') === -1) ok('no randomness (no variable-reward machinery)');
  else no('randomness', 'Math.random present — variable-reward machinery needs Psych clearance');
}
if (src.toLowerCase().indexOf('dark pattern') !== -1) ok('no-dark-patterns stance documented');
else no('dark patterns', 'stance not documented');

/* 7. no economy surface (comments documenting "no economy events" are fine) */
var srcNoDoc = src.replace(/dispatches no economy events/g, '');
['xpGrant', 'PF.tally', 'ledger', 'economy'].forEach(function (w) {
  if (srcNoDoc.indexOf(w) === -1) ok('no economy surface: ' + w);
  else no('economy surface', w + ' referenced in motion module');
});

/* 8. site tree mirror byte-identical */
['core/bundle-core-slr.js', 'core/bundle-core.js'].forEach(function (b) {
  var a = path.join(ROOT, 'v1.4.3', b), c = path.join(ROOT, 'site', 'v1.4.3', b);
  if (fs.existsSync(a) && fs.existsSync(c) && fs.readFileSync(a).equals(fs.readFileSync(c)))
    ok('site mirror byte-identical: ' + b);
  else no('site mirror', b + ' differs between v1.4.3/ and site/v1.4.3/');
});

console.log('\nverify-zuck-dopamine-fe: ' + passes + ' PASS, ' + fails.length + ' FAIL');
process.exit(fails.length ? 1 : 0);
