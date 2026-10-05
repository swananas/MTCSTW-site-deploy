#!/usr/bin/env node
/* scripts/verify-homepage-wave2.js — Wave-2 inner-script syntax gate
 * (gambits.js, supply-raid.js, markets.js — the AbortController
 * `},15000); }catch(e){}` one-brace bug the P0 worker copy-paste-spotted).
 *
 * Same browser-replication approach as verify-homepage-p0.js: extract the
 * staged <template> literal from the outer file, evaluate it exactly as the
 * outer IIFE does (no ${} — the harness refuses interpolations), pull the
 * <script> block out of the resulting HTML, and compile it with the JS
 * engine (parse-only, never executed). SyntaxError fails loudly.
 *
 * Covers the silo sources AND the concatenated bundles the site serves —
 * the bundles inline the silos whole-file, so both copies must parse:
 *   bundle-arcade.js  ← gambits.js, markets.js   (served on /arcade)
 *   bundle-cells.js   ← supply-raid.js           (served on /cells)
 *
 * Before/after proof: run against HEAD with `git stash`-style checkout of
 * the originals (or a clean worktree) → the 6 checks FAIL with
 * 'Unexpected token catch'; on the fixed tree they all PASS, and the
 * postG load() boot assertion holds.
 *
 * Usage: node scripts/verify-homepage-wave2.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

var CHECKS = [
  /* silo sources */
  { file: 'v1.4.3/games/gambits.js',     templateId: 'pf-ov-gambits', boot: 'function load('      },
  { file: 'v1.4.3/games/supply-raid.js', templateId: 'pf-ov-raid',    boot: 'loadCell(function()' },
  { file: 'v1.4.3/games/markets.js',     templateId: 'pf-ov-markets', boot: 'function loadList('  },
  /* served bundles (silos inlined whole-file) */
  { file: 'v1.4.3/games/bundle-arcade.js', templateId: 'pf-ov-gambits', boot: 'function load('      },
  { file: 'v1.4.3/games/bundle-arcade.js', templateId: 'pf-ov-markets', boot: 'function loadList('  },
  { file: 'v1.4.3/games/bundle-cells.js',  templateId: 'pf-ov-raid',    boot: 'loadCell(function()' },
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

function checkOne(file, templateId, boot) {
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
    /* Boot assertion: the widget's entry point must be reachable — guards
     * against a fix that merely moves the parse error. Each widget's boot
     * is given per-check (gambits: load(), markets: loadList(),
     * supply-raid: loadCell boot call). */
    var bootName = (boot || '').replace(/\(.*$/, '');
    if (m[1].indexOf(boot) < 0) {
      throw new Error('inner script parses but boot "' + bootName + '" is not defined — boot unreachable');
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
  failures += checkOne(CHECKS[k].file, CHECKS[k].templateId, CHECKS[k].boot);
}
if (failures) {
  console.error('\n' + failures + ' inner-script check(s) FAILED — widget(s) would die in the browser.');
  process.exit(1);
}
console.log('\nAll inner-script syntax checks passed.');
