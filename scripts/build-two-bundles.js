#!/usr/bin/env node
/* scripts/build-two-bundles.js — rebuilds only bundle-economy.js and
   bundle-warreport.js (fe/ux-news-combos). Mirrors build/bundle.js's
   concat + terser + validate logic; parses the file lists OUT of
   build/bundle.js so registration drift is impossible. Run from the
   worktree root: node scripts/build-two-bundles.js */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var WANT = ['bundle-economy', 'bundle-warreport'];

/* Extract the BUNDLES map entries for the two bundles from build/bundle.js:
   the entry lists are sequences of 'file.js' string literals between the
   entry key and its closing "],". */
function fileList(name) {
  var src = fs.readFileSync(path.join(ROOT, 'build', 'bundle.js'), 'utf8');
  var idx = src.indexOf("'" + name + "'");
  if (idx < 0) throw new Error('bundle entry not found: ' + name);
  var end = src.indexOf('],', idx);
  if (end < 0) throw new Error('bundle entry unterminated: ' + name);
  var block = src.slice(idx, end);
  var files = [];
  var re = /'([a-z0-9-]+\.js)'/g, m;
  while ((m = re.exec(block))) {
    if (m[1] !== name + '.js') files.push(m[1]);
  }
  return files.filter(function (f, i) { return files.indexOf(f) === i; });
}

var TERSER = null;
try {
  var local = path.join(ROOT, 'node_modules', '.bin', 'terser');
  if (fs.existsSync(local)) TERSER = local;
  else { cp.execSync('which terser', { stdio: 'pipe' }); TERSER = 'terser'; }
} catch (e) { TERSER = null; }
if (!TERSER) console.error('BUNDLE WARN: terser not found — writing unminified bundles.');

WANT.forEach(function (name) {
  var files = fileList(name);
  if (!files.length) throw new Error('empty file list for ' + name);
  var out = [];
  files.forEach(function (f) {
    var p = path.join(G, f);
    if (!fs.existsSync(p)) throw new Error('missing file: ' + f);
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
      console.error('BUNDLE WARN: terser failed on ' + name + ' — writing raw. ' + (e.message || e));
      final = raw;
    }
  }
  var dest = path.join(G, name + '.js');
  fs.writeFileSync(dest, final);
  cp.execSync('node --check ' + dest, { stdio: 'pipe' });
  new Function(fs.readFileSync(dest, 'utf8'));
  console.log(name + '.js: ' + files.length + ' files, ' +
    (fs.statSync(dest).size / 1024).toFixed(1) + ' KB — OK');
});
console.log('two bundles rebuilt and validated.');
