#!/usr/bin/env node
/* scripts/build-takecell-bundles.js — rebuilds only the bundles touched by
   UX Combination Play 2 (fe/ux-take-to-cell). Mirrors build/bundle.js's
   concat + terser + validate logic; parses the file lists OUT of
   build/bundle.js (SECTIONS) and build/bundle-core.js (BUNDLES) so
   registration drift is impossible. Run from the worktree root:
   node scripts/build-takecell-bundles.js
   Bundles: pages/bundle-pages (share-everywhere), core/bundle-money
   (robreport), games/bundle-sec1 (briefing), games/bundle-peoples-cpi,
   games/bundle-predgame, games/bundle-create (data-bounties),
   games/bundle-economy (inflation-tracker), games/bundle-events (events.js),
   games/bundle-events-map (civic-events), games/bundle-warreport. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V143 = path.join(ROOT, 'v1.4.3');
var GAMES = path.join(V143, 'games');

/* File list for a SECTIONS entry in build/bundle.js. Keeps '../' prefixes
   (bundle-create lists ../core/workshop.js and ../pages/workshop-create.js). */
function gameFiles(name) {
  var src = fs.readFileSync(path.join(ROOT, 'build', 'bundle.js'), 'utf8');
  var idx = src.indexOf("'" + name + "'");
  if (idx < 0) throw new Error('bundle entry not found: ' + name);
  var end = src.indexOf('],', idx);
  if (end < 0) throw new Error('bundle entry unterminated: ' + name);
  var block = src.slice(idx, end);
  var files = [];
  var re = /'(\.\.\/)?([a-z0-9-]+\.js)'/g, m;
  while ((m = re.exec(block))) {
    var f = (m[1] || '') + m[2];
    if (m[2] !== name + '.js' && files.indexOf(f) === -1) files.push(f);
  }
  return files;
}
/* File list for a BUNDLES entry in build/bundle-core.js: either an inline
   array ('pages/bundle-pages': [...]) or a named array (MONEY_FILES). */
function coreFiles(name, namedArray) {
  var src = fs.readFileSync(path.join(ROOT, 'build', 'bundle-core.js'), 'utf8');
  var idx, end;
  if (namedArray) {
    idx = src.indexOf('var ' + namedArray + ' = [');
    if (idx < 0) throw new Error('array not found: ' + namedArray);
    idx = src.indexOf('[', idx);
    end = src.indexOf('];', idx);
  } else {
    idx = src.indexOf("'" + name + "'");
    if (idx < 0) throw new Error('bundle entry not found: ' + name);
    idx = src.indexOf('[', idx);
    end = src.indexOf('],', idx);
  }
  if (end < 0) throw new Error('bundle entry unterminated: ' + name);
  var block = src.slice(idx, end);
  var files = [];
  var re = /'([a-z0-9\-\/]+\.js)'/g, m;
  while ((m = re.exec(block))) {
    if (files.indexOf(m[1]) === -1) files.push(m[1]);
  }
  return files;
}

var TERSER = null;
try {
  var candidates = [
    '/tmp/terser-fix/node_modules/.bin/terser',
    path.join(ROOT, 'node_modules', '.bin', 'terser')
  ];
  for (var ci = 0; ci < candidates.length; ci++) {
    try {
      cp.execSync(candidates[ci] + ' --version', { stdio: 'pipe' });
      TERSER = candidates[ci];
      break;
    } catch (e) {}
  }
  if (!TERSER) console.error('BUNDLE WARN: no working terser found — writing raw bundles.');
} catch (e) {}

var WANT = [
  { name: 'pages/bundle-pages', dir: V143, files: coreFiles('pages/bundle-pages') },
  { name: 'core/bundle-money', dir: V143, files: coreFiles('core/bundle-money', 'MONEY_FILES') },
  { name: 'bundle-sec1', dir: GAMES, files: gameFiles('bundle-sec1') },
  { name: 'bundle-peoples-cpi', dir: GAMES, files: gameFiles('bundle-peoples-cpi') },
  { name: 'bundle-predgame', dir: GAMES, files: gameFiles('bundle-predgame') },
  { name: 'bundle-create', dir: GAMES, files: gameFiles('bundle-create') },
  { name: 'bundle-economy', dir: GAMES, files: gameFiles('bundle-economy') },
  { name: 'bundle-events', dir: GAMES, files: gameFiles('bundle-events') },
  { name: 'bundle-events-map', dir: GAMES, files: gameFiles('bundle-events-map') },
  { name: 'bundle-warreport', dir: GAMES, files: gameFiles('bundle-warreport') }
];

WANT.forEach(function (b) {
  if (!b.files.length) throw new Error('empty file list for ' + b.name);
  var out = [];
  b.files.forEach(function (f) {
    var p = path.join(b.dir, f);
    if (!fs.existsSync(p)) throw new Error('missing file: ' + f + ' (bundle ' + b.name + ')');
    out.push('\n/* ===== ' + f + ' ===== */');
    out.push(fs.readFileSync(p, 'utf8'));
    out.push(';');
  });
  var raw = out.join('\n');
  var final = raw;
  if (TERSER) {
    try {
      final = cp.execSync(TERSER + ' --compress --mangle --toplevel', {
        input: raw, maxBuffer: 100 * 1024 * 1024
      }).toString();
    } catch (e) {
      console.error('BUNDLE WARN: terser failed on ' + b.name + ' — writing raw. ' + (e.message || e));
      final = raw;
    }
  }
  var dest = path.join(b.dir, b.name + '.js');
  fs.writeFileSync(dest, final);
  cp.execSync('node --check ' + dest, { stdio: 'pipe' });
  new Function(fs.readFileSync(dest, 'utf8'));
  console.log(b.name + '.js: ' + b.files.length + ' files, ' +
    (fs.statSync(dest).size / 1024).toFixed(1) + ' KB — OK');
});
console.log('take-cell bundles rebuilt and validated.');
