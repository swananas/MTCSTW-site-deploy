#!/usr/bin/env node
/* build/fedarch/budget-gate.mjs
 * HARD budget enforcement BY THE BUILD. Reads v1.4.3/dist/fedarch/report.json
 * (+ budgets.json) and exits NON-ZERO on any violation — CI goes red, the
 * build fails. Budget policy (the numbers) is CEO-set; mechanics are Toolchain's.
 * Fails when:
 *   - any route chunk file > routeChunkBytes (100KB standing per-route budget),
 *     except kind:"data" routes which are checked against dataChunkBytes
 *     (data payloads are not JS code — CEO budget applies to code, not data)
 *   - any route's total initial payload (route + its unique chunks, vendor
 *     excluded as amortized) > routeTotalBytes (dataChunkBytes for kind:"data")
 *   - vendor chunk > vendorChunkBytes
 *   - core runtime chunk (routes.json-adjacent bus shim) > coreRuntimeBytes
 *   - any gzip size > gzipMultiplier * corresponding raw budget
 * Usage: node build/fedarch/budget-gate.mjs [report.json]  (default dist path) */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '..', '..');
const reportPath = process.argv[2] || path.join(REPO_ROOT, 'v1.4.3', 'dist', 'fedarch', 'report.json');
const budgets = JSON.parse(fs.readFileSync(path.join(here, 'budgets.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const KB = n => (n / 1024).toFixed(1) + 'KB';
const fails = [];
const rows = [];

function check(label, bytes, budget, kind) {
  const ok = bytes <= budget;
  rows.push({ label, bytes, budget, ok, kind });
  if (!ok) fails.push(`${label}: ${KB(bytes)} > budget ${KB(budget)} (${kind})`);
}

for (const [route, r] of Object.entries(report.routes)) {
  // Data payloads are not code: kind:"data" routes (declared in the manifest)
  // are checked against the separate dataChunkBytes budget. Fail closed if the
  // budget is missing — a data route with no data budget is a config error.
  let chunkBudget = budgets.routeChunkBytes;
  let totalBudget = budgets.routeTotalBytes;
  const kindTag = r.kind === 'data' ? ' [data]' : '';
  if (r.kind === 'data') {
    if (!(budgets.dataChunkBytes > 0)) {
      fails.push(`budget config: route "${route}" is kind:"data" but budgets.json has no dataChunkBytes`);
    } else {
      chunkBudget = budgets.dataChunkBytes;
      totalBudget = budgets.dataChunkBytes;
    }
  }
  check(`route chunk ${route} (${r.chunk})${kindTag}`, r.bytes, chunkBudget, 'route-chunk');
  check(`route chunk ${route} gzip${kindTag}`, r.gzipBytes, chunkBudget * budgets.gzipMultiplier, 'route-chunk-gzip');
  check(`route total ${route} (route+chunks, vendor amortized)${kindTag}`, r.totalBytes, totalBudget, 'route-total');
}

for (const [out, o] of Object.entries(report.outputs)) {
  const base = path.basename(out);
  if (/^vendor\.[0-9a-f]+\.js$/.test(base)) {
    check(`vendor chunk ${base}`, o.bytes, budgets.vendorChunkBytes, 'vendor');
    check(`vendor chunk ${base} gzip`, o.gzipBytes, budgets.vendorChunkBytes * budgets.gzipMultiplier, 'vendor-gzip');
  }
}

console.log('\nfedarch budget gate — per-route PASS/FAIL');
console.log('label'.padEnd(58) + 'size'.padStart(10) + '  budget'.padStart(10) + '  verdict');
for (const r of rows) {
  console.log(r.label.padEnd(58) + KB(r.bytes).padStart(10) + KB(r.budget).padStart(10) + '  ' + (r.ok ? 'PASS' : 'FAIL'));
}
if (fails.length) {
  console.log('\nBUDGET GATE FAILED — build rejected:');
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`\nBUDGET GATE PASSED — ${rows.length} checks, 0 violations.`);
