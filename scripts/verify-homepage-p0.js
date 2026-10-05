#!/usr/bin/env node
/* scripts/verify-homepage-p0.js — Homepage P0 inner-script syntax gate.
 *
 * WHY THIS EXISTS: node --check CANNOT see these errors. Each widget stages
 * its inner <script> inside a template literal passed to insertAdjacentHTML
 * (the closing tag is even split as `</scr`+`ipt>` in source). The SyntaxError
 * only materializes AFTER template-literal escape processing — i.e. in the
 * exact bytes the browser parses. This harness replicates the browser:
 *   1. extract the staged <template> literal from the outer file,
 *   2. evaluate it exactly as the outer IIFE does (no ${} allowed — the
 *      harness refuses to eval interpolations),
 *   3. pull the <script> block out of the resulting HTML,
 *   4. compile it with the JS engine (parse-only, never executed).
 * Any SyntaxError fails loudly (non-zero exit). Also asserts the widget's
 * boot function load() is defined, so a fix that merely moves the parse
 * error is still caught.
 *
 * Covers the silo sources AND the concatenated bundles the homepage serves
 * (bundle-sec1.js = blocking, bundle-home.js = lazy) — the bundles inline
 * the silos whole-file, so both copies must parse.
 *
 * Usage: node scripts/verify-homepage-p0.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

var CHECKS = [
  { file: 'v1.4.3/games/briefing.js',        templateId: 'pf-ov-brief' },
  { file: 'v1.4.3/games/solidarity-draw.js', templateId: 'pf-ov-draw'  },
  { file: 'v1.4.3/games/bundle-sec1.js',     templateId: 'pf-ov-brief' },
  { file: 'v1.4.3/games/bundle-home.js',     templateId: 'pf-ov-draw'  },
];

/* Extract the staged HTML for a widget. The outer file stages it as one or
 * more template literals joined by `+` (the inner </script> is split as
 * `</scr`+`ipt>` so the literal sequence never appears in source). Returns
 * the list of raw literal sources, in order. */
function extractLiterals(src, templateId) {
  var marker = '<template id="' + templateId + '"';
  var markerIdx = src.indexOf(marker);
  if (markerIdx < 0) throw new Error('template marker not found: ' + templateId);
  var i = markerIdx;
  while (i >= 0 && src[i] !== '`') i--;
  if (i < 0) throw new Error('opening backtick not found for ' + templateId);
  var literals = [];
  for (;;) {
    var start = i;               // at opening backtick
    i = start + 1;
    while (i < src.length) {     // scan to matching close backtick
      var c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') break;
      i++;
    }
    if (i >= src.length) throw new Error('unterminated template literal for ' + templateId);
    literals.push(src.slice(start, i + 1));
    i++;                         // past close backtick
    var j = i;
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] === '+') {        // another literal follows (`</scr`+`ipt>`)
      j++;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] !== '`') throw new Error('expected template literal after + for ' + templateId);
      i = j;
      continue;
    }
    break;
  }
  return literals;
}

function checkOne(file, templateId) {
  var label = file + ' :: #' + templateId;
  try {
    var src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    var literals = extractLiterals(src, templateId);
    for (var l = 0; l < literals.length; l++) {
      if (literals[l].indexOf('${') >= 0) {
        throw new Error('template contains ${...} interpolation — harness refuses to eval');
      }
    }
    /* Replicate the browser: evaluate the literal(s) exactly as the outer
     * IIFE does. A substitution-free template literal evaluates to a pure
     * string; no widget code runs here. */
    var html = eval('(' + literals.join('+') + ')'); // eslint-disable-line no-eval
    var m = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) throw new Error('no <script> block found in staged template');
    /* Parse-only: vm.Script compiles without executing. */
    new vm.Script(m[1], { filename: templateId + '.inner.js' });
    if (!/(^|[^A-Za-z0-9_$])function load\(/.test(m[1])) {
      throw new Error('inner script parses but load() is not defined — boot unreachable');
    }
    console.log('PASS  ' + label);
    return 0;
  } catch (e) {
    var kind = e && e.constructor ? e.constructor.name : 'Error';
    console.log('FAIL  ' + label + ' :: ' + kind + ': ' + (e && e.message));
    return 1;
  }
}

var failures = 0;
for (var k = 0; k < CHECKS.length; k++) {
  failures += checkOne(CHECKS[k].file, CHECKS[k].templateId);
}
if (failures) {
  console.error('\n' + failures + ' inner-script check(s) FAILED — widget(s) would die in the browser.');
  process.exit(1);
}
console.log('\nAll inner-script syntax checks passed.');
