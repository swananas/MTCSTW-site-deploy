#!/usr/bin/env node
/* scripts/verify-notify-email-fe.js — regression guard for the notify-prefs
 * email regex (2026-10-05 fix: the regex literal in updateEmail() was
 * double-escaped — \\s in a regex literal matches a literal backslash + 's',
 * so every email containing the letter 's' was rejected and \\. required a
 * literal backslash before the dot).
 *
 * Asserts:
 *   1. notify-prefs.js updateEmail regex is the single-escaped literal
 *      /^[^\s@]+@[^\s@]+\.[^\s@]+$/ — no double-escaped \\s@ anywhere in
 *      the source files.
 *   2. war-report.js wrEmailValid regex likewise single-escaped.
 *   3. Functional: the evaluated regex ACCEPTS valid emails
 *      (user@example.com, a.b+tag@sub.domain.org — notably containing 's')
 *      and REJECTS invalid ones (no-at-sign, @nodomain,
 *      spaces in@email.com).
 *   4. The rebuilt bundles (bundle-hq.js, bundle-warreport.js) contain the
 *      fixed regex, not the double-escaped one.
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

/* 1-2. No double-escaped \s@ inside a regex literal in the sources. */
var NP = 'notify-prefs.js';
var WR = 'war-report.js';
var npSrc = read(NP), wrSrc = read(WR);
var doubleEscaped = /\/[^/\n]*\\\\s@[^/\n]*\//; /* regex literal containing \\s@ */
ok(NP + ': no double-escaped regex remains', !doubleEscaped.test(npSrc));
ok(WR + ': no double-escaped regex remains', !doubleEscaped.test(wrSrc));

/* Expected single-escaped literals. */
var NP_RE_TEXT = '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/';
var WR_RE_TEXT = '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/';
ok(NP + ': updateEmail carries the fixed regex', npSrc.indexOf(NP_RE_TEXT) !== -1);
ok(WR + ': wrEmailValid carries the fixed regex', wrSrc.indexOf(WR_RE_TEXT) !== -1);

/* 3. Functional checks against the evaluated regex literals. */
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

/* 4. Rebuilt bundles carry the fix. */
var hq = read('bundle-hq.js'), wrep = read('bundle-warreport.js');
ok('bundle-hq.js carries the fixed regex', hq.indexOf(NP_RE_TEXT) !== -1);
ok('bundle-warreport.js carries the fixed regex', wrep.indexOf(WR_RE_TEXT) !== -1);
ok('bundle-hq.js has no double-escaped regex', !doubleEscaped.test(hq));
ok('bundle-warreport.js has no double-escaped regex', !doubleEscaped.test(wrep));

if (failures) { console.error('\n' + failures + ' assertion(s) failed.'); process.exit(1); }
console.log('\nAll notify-email assertions passed.');
