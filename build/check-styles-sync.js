#!/usr/bin/env node
/**
 * check-styles-sync.js — CSS sync guard (added 2026-10-04)
 *
 * WHY: bundle-styles.css is the SERVED stylesheet (the loader pulls it via
 * jsDelivr) but it is HAND-MAINTAINED — no build script regenerates it from
 * the source files. On 2026-10-03 the Know Your Enemy contrast CSS shipped in
 * v1.4.3/core/02-design-system.css (commit 1b8213f) but was never copied into
 * bundle-styles.css, so the live fix was half-deployed (NH1, gap audit v3).
 *
 * WHAT: every rule block in the source CSS files must appear verbatim
 * (modulo comments + whitespace) in the bundle. Exits 0 on success, 1 with
 * the missing rules listed when the bundle has drifted. Bundle-only additions
 * (e.g. the hand-added DEFECT/audit fix blocks at the bottom of the bundle)
 * are allowed and not flagged.
 *
 * RUN: node build/check-styles-sync.js   (from repo root)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  'v1.4.3/core/01-styles.css',
  'v1.4.3/core/02-design-system.css',
  'v1.4.3/core/33-patterns.css',
  'v1.4.3/core/41-mobile-first.css',
  'v1.4.3/core/42-mobile-nav-trim.css',
  'v1.4.3/core/44-button-butter.css',
];
const BUNDLE = 'v1.4.3/core/bundle-styles.css';

const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

function fail(msg) { console.error('SYNC-FAIL: ' + msg); process.exitCode = 1; }

let bundle;
try {
  bundle = norm(fs.readFileSync(path.join(ROOT, BUNDLE), 'utf8'));
} catch (e) {
  fail('cannot read ' + BUNDLE + ': ' + e.message);
  process.exit(1);
}

let totalMissing = 0;
for (const rel of SOURCES) {
  let src;
  try {
    src = norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    fail('cannot read ' + rel + ': ' + e.message);
    continue;
  }
  const rules = src.split('}').map((r) => r.trim()).filter((r) => r.length > 0);
  const missing = rules.filter((r) => !bundle.includes(r));
  totalMissing += missing.length;
  if (missing.length) {
    console.error(`SYNC-FAIL: ${rel}: ${missing.length}/${rules.length} rules missing from ${BUNDLE}:`);
    missing.slice(0, 20).forEach((m) => console.error('  MISSING: ' + m.slice(0, 120)));
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
  } else {
    console.log(`SYNC-OK: ${rel}: all ${rules.length} rules present in ${BUNDLE}`);
  }
}

if (totalMissing > 0) {
  console.error(
    '\nACTION: copy the missing rules from the source file(s) into ' + BUNDLE +
    ' (01-styles.css content = top of bundle; 02-design-system.css content = ' +
    'middle, ending at .bt-st-rejected; hand-added defect blocks stay at the bottom), ' +
    'then hand off for re-pin. The bundle is the SERVED file — source edits alone change nothing live.'
  );
  process.exit(1);
}
console.log('SYNC-OK: bundle-styles.css is in sync with all CSS sources.');
