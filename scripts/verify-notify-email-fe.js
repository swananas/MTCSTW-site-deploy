#!/usr/bin/env node
/* scripts/verify-notify-email-fe.js — regression guard for the notify-prefs
 * email regex.
 *
 * HISTORY:
 * - 2026-10-05 (first fix): the regex literal in updateEmail() was
 *   double-escaped — \\s in a PLAIN regex literal matches a literal
 *   backslash + 's', so every email containing the letter 's' was rejected
 *   and \\. required a literal backslash before the dot.
 * - 2026-10-05 M35: that fix was incomplete. Both regexes live INSIDE
 *   staged template literals (insertAdjacentHTML `<template>` blocks), and
 *   a single-escaped \s in a template cooks to the LETTER 's' at runtime
 *   (V8 accepts the invalid escape and collapses it) — so the runtime
 *   regex was /^[^s@]+@[^s@]+.[^s@]+$/, STILL rejecting real emails. The
 *   source must therefore carry the DOUBLE-escaped form (\\s, \\.), which
 *   the template cooks to the intended single-escaped regex. Terser
 *   re-emits the cooked template with proper re-escaping, so the built
 *   bundles carry the double-escaped form too.
 *
 * Asserts:
 *   1. Sources carry the template-correct double-escaped form.
 *   2. No single-escaped \s@ remains in the sources (it would cook to 's').
 *   3. Functional: the COOKED regex (what the browser actually runs after
 *      the template cooks — single-escaped) ACCEPTS valid emails
 *      (user@example.com, a.b+tag@sub.domain.org — notably containing 's')
 *      and REJECTS invalid ones (no-at-sign, @nodomain,
 *      spaces in@email.com).
 *   4. The rebuilt bundles (bundle-hq.js, bundle-warreport.js) carry the
 *      double-escaped template-correct form, never the s-mangled form.
 * Run: node scripts/verify-notify-email-fe.js
 */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');
var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }

/* 1. Template-correct double-escaped form in the sources. In the script
 * below these literals are written with \\\\ so the actual expected text
 * has \\ (two chars: backslash backslash). */
var NP_SRC_RE = '/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/';
var WR_SRC_RE = '/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]{2,}$/';
var NP = 'notify-prefs.js';
var WR = 'war-report.js';
var npSrc = read(NP), wrSrc = read(WR);
ok(NP + ': updateEmail carries the template-correct double-escaped regex',
  npSrc.indexOf(NP_SRC_RE) !== -1);
ok(WR + ': wrEmailValid carries the template-correct double-escaped regex',
  wrSrc.indexOf(WR_SRC_RE) !== -1);

/* 2. No single-escaped \s@ in the sources: strip every double backslash,
 * then a lone \s must not remain (it would cook to the letter 's'). */
function noSingleEscaped(src) {
  var scrubbed = src.replace(/\\\\/g, '\x00');
  return scrubbed.indexOf('\\s') === -1;
}
ok(NP + ': no single-escaped \\s remains (would cook to \'s\')', noSingleEscaped(npSrc));
ok(WR + ': no single-escaped \\s remains (would cook to \'s\')', noSingleEscaped(wrSrc));

/* 3. Functional checks against the COOKED regex — what the browser runs
 * after the template literal cooks \\s -> \s. Single-escaped text here. */
var NP_RE_TEXT = '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/';
var WR_RE_TEXT = '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/';
var npRe = eval(NP_RE_TEXT);
var wrRe = eval(WR_RE_TEXT);

var valid = ['user@example.com', 'a.b+tag@sub.domain.org',
  'organizer@sickleftrads.net', 'x@y.zz'];
var invalid = ['no-at-sign', '@nodomain', 'spaces in@email.com',
  'missingdot@domain'];
/* Note: backslashes pass the permissive [^\s@]+ class — pre-existing
 * semantics, unchanged by this fix. */

valid.forEach(function (em) {
  ok('notify-prefs accepts <' + em + '>', npRe.test(em));
  ok('war-report  accepts <' + em + '>', wrRe.test(em));
});
invalid.forEach(function (em) {
  ok('notify-prefs rejects <' + em + '>', !npRe.test(em));
  ok('war-report  rejects <' + em + '>', !wrRe.test(em));
});

/* 4. Rebuilt bundles carry the template-correct form (terser re-emits the
 * cooked template with proper re-escaping, so the bundle keeps \\s), and
 * never the s-mangled form. */
var hq = read('bundle-hq.js'), wrep = read('bundle-warreport.js');
var MANGLED = '/^[^s@]+@';
ok('bundle-hq.js carries the template-correct regex', hq.indexOf(NP_SRC_RE) !== -1);
ok('bundle-warreport.js carries the template-correct regex', wrep.indexOf(WR_SRC_RE) !== -1);
ok('bundle-hq.js has no s-mangled regex', hq.indexOf(MANGLED) === -1);
ok('bundle-warreport.js has no s-mangled regex', wrep.indexOf(MANGLED) === -1);

if (failures) { console.error('\n' + failures + ' assertion(s) failed.'); process.exit(1); }
console.log('\nAll notify-email assertions passed.');
