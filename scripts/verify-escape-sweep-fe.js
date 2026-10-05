#!/usr/bin/env node
/* scripts/verify-escape-sweep-fe.js — Escape-stripping sweep verification.
   Run from the worktree root:
     node scripts/verify-escape-sweep-fe.js
   Background: game files stage <template><script> blocks via JS template
   literals. Template evaluation processes backslash escapes, so a regex
   like /\s+/ written with single backslashes inside the template reaches
   the browser as /s+/ (broken). The fix doubles backslashes in source so
   the browser receives the intended single-backslash regex.
   This harness:
   1. node --check on the touched files
   2. Evaluates each template literal (the browser's post-escape view) and
      asserts the fixed regexes survive as intended single-backslash forms,
      and that the broken escape-stripped forms are absent
   3. Functionally tests the regexes against sample inputs
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

/* Evaluate every template literal in the file (browser's post-escape view).
   Templates with ${} interpolation are skipped (none in these files). */
function browserView(file) {
  var src = read(file);
  var views = [], inTpl = false, start = 0, i = 0;
  while (i < src.length) {
    var c = src[i];
    if (!inTpl && c === '`') { inTpl = true; start = i; i++; continue; }
    if (inTpl) {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') {
        var tplSrc = src.slice(start, i + 1);
        if (tplSrc.indexOf('${') < 0) {
          try { views.push(vm.runInNewContext(tplSrc, {})); }
          catch (e) { no(file + ' template eval', e.message); return null; }
        }
        inTpl = false; i++; continue;
      }
      i++; continue;
    }
    i++;
  }
  return views.join('\n');
}

console.log('== 1. node --check ==');
['v1.4.3/games/campaign.js', 'v1.4.3/games/hall-of-proof.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. campaign.js — browser receives intact regexes ==');
var camp = browserView('v1.4.3/games/campaign.js');
if (camp) {
  var good = [
    [/\/\^U\\.S\\.\\s\*\/i/, 'raceLabel regex /^U\\.S\\.\\s*/i'],
    [/\.split\(\/\\s\+\/\)/, 'split regex /\\s+/'],
    [/\/\(\\d\+\)px\//, 'font-size regex /(\\d+)px/']
  ];
  good.forEach(function (g) {
    if (g[0].test(camp)) ok('campaign.js: ' + g[1]);
    else no('campaign.js: ' + g[1], 'regex mangled by template evaluation');
  });
  var bad = [/\/\^U\.S\.s\*\//, /\.split\(\/s\+\/\)/, /\/\(d\+\)px\//];
  bad.forEach(function (re, i) {
    if (re.test(camp)) no('campaign.js broken form #' + i, 'escape-stripped regex in browser view');
    else ok('campaign.js: no escape-stripped form #' + i);
  });
}

console.log('== 3. hall-of-proof.js — browser receives intact regex ==');
var hall = browserView('v1.4.3/games/hall-of-proof.js');
if (hall) {
  if (/\/\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)\$\//.test(hall))
    ok('hall-of-proof.js: date regex /^(\\d{4})-(\\d{2})-(\\d{2})$/');
  else no('hall-of-proof.js: date regex', 'regex mangled by template evaluation');
  if (/\/\^\(d\{4\}\)-\(d\{2\}\)-\(d\{2\}\)\$\//.test(hall))
    no('hall-of-proof.js broken form', 'escape-stripped regex in browser view');
  else ok('hall-of-proof.js: no escape-stripped form');
}

console.log('== 4. functional: regexes behave correctly ==');
try {
  var lbl = 'NC ' + 'U.S. Senate'.replace(/^U\.S\.\s*/i, '');
  if (lbl === 'NC Senate') ok('raceLabel("U.S. Senate") -> "NC Senate"');
  else no('raceLabel', 'got ' + JSON.stringify(lbl));
  var p = 'John Quincy Adams'.trim().split(/\s+/);
  if (p[p.length - 1] === 'Adams') ok('lastName split on /\\s+/');
  else no('lastName split', 'got ' + JSON.stringify(p));
  var fm = 'Arial Black 60px'.match(/(\d+)px/);
  if (fm && fm[1] === '60') ok('font-size match /(\\d+)px/');
  else no('font-size match', 'got ' + JSON.stringify(fm));
  var dm = '2026-10-05'.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm && dm[1] === '2026' && dm[2] === '10' && dm[3] === '05') ok('date match');
  else no('date match', 'got ' + JSON.stringify(dm));
  // Prove the bug class: the stripped forms misbehave
  if ('U.S. Senate'.replace(/^U.S.s*/i, '') !== 'Senate')
    ok('broken /^U.S.s*/ would NOT strip "U.S. " (confirms bug class)');
  if ('a b'.split(/s+/).length !== 2)
    ok('broken /s+/ would NOT split on whitespace (confirms bug class)');
} catch (e) { no('functional', 'exception: ' + e.message); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
