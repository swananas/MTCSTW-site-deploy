#!/usr/bin/env node
/* scripts/verify-built-bundles.js — CENTRAL SYNTAX GATE (2026-10-06, CTO).
   Step 0 for every verify run: no verify script may PASS a line whose built
   bundles are broken. Born from the eb6a701 incident: the merge committed
   seven built bundles with unresolved conflict markers (including the
   homepage bundle-sec1.js), and the branch verify reported 83/84 PASS
   because it grepped markers instead of parsing.
   Checks, for every built bundle under the repo root:
     1. node --check (real parse — catches '<<<<<<<' and any syntax break)
     2. conflict-marker scan: lines starting with <<<<<<< or >>>>>>> (never
        valid JS at line start; belt-and-braces under the parse)
   Usage: node scripts/verify-built-bundles.js [--root <repo-root>]
   Exit 0 when every bundle passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var args = process.argv.slice(2);
var rootArg = args.indexOf('--root');
var ROOT = rootArg !== -1 && args[rootArg + 1]
  ? path.resolve(args[rootArg + 1])
  : path.join(__dirname, '..');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }

function findBundles(dir, out) {
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return out; }
  entries.forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') return;
      findBundles(p, out);
    } else if (/^bundle-.*\.js$/.test(e.name) || /dist[\/\\]worker\.js$/.test(p)) {
      out.push(p);
    }
  });
  return out;
}

var bundles = findBundles(ROOT, []);
console.log('verify-built-bundles: ' + bundles.length + ' built bundles under ' + ROOT);

bundles.forEach(function (f) {
  var rel = path.relative(ROOT, f);
  try {
    cp.execSync('node --check ' + JSON.stringify(f), { stdio: 'pipe' });
    ok(rel + ' (node --check)');
  } catch (e) { no(rel, 'node --check failed'); return; }
  var src = fs.readFileSync(f, 'utf8');
  var bad = [];
  src.split('\n').forEach(function (line, i) {
    if (/^<{7}/.test(line) || /^>{7}/.test(line)) bad.push(i + 1);
  });
  if (bad.length) no(rel, 'conflict markers at lines ' + bad.slice(0, 5).join(','));
  else ok(rel + ' (no conflict markers)');
});

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('BUILT-BUNDLE GATE OK.');
