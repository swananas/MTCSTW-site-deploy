#!/usr/bin/env node
/* build/fedarch/verify-fedarch.mjs
 * GREEN-LOCALLY verification + demo budget-pass/fail proof.
 * Run: node build/fedarch/verify-fedarch.mjs
 *  1. PASS scenario: real v1.4.3 sources as route entries -> build must succeed,
 *     report.json must exist with per-route sizes + provenance, vendor chunk named.
 *  2. FAIL scenario: same manifest + a generated ~130KB over-budget fixture route
 *     -> budget-gate MUST exit non-zero (the gate fires on an over-budget fixture).
 *  3. Dispatcher snippet must parse (node --check).
 * Exit 0 only if all three hold. */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '..', '..');
const DIST = path.join(REPO_ROOT, 'v1.4.3', 'dist', 'fedarch');
const node = process.execPath;
let failures = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

console.log('== fedarch verify: PASS scenario (real sources) ==');
execFileSync(node, [path.join(here, 'build.mjs')], { stdio: 'pipe' });
const report = JSON.parse(fs.readFileSync(path.join(DIST, 'report.json'), 'utf8'));
ok('report.json written', !!report.routes);
ok('2 routes built', Object.keys(report.routes).length === 2, Object.keys(report.routes).join(','));
const vendorOut = Object.keys(report.outputs).find(o => path.basename(o).startsWith('vendor.'));
ok('vendor chunk deterministically named', !!vendorOut, vendorOut || 'none');
ok('shared chunk produced (code splitting works)',
  Object.keys(report.outputs).some(o => o.startsWith('chunks/')),
  Object.keys(report.outputs).filter(o => o.startsWith('chunks/')).map(o => path.basename(o)).join(', '));
ok('provenance maps chunks -> source inputs',
  Object.values(report.provenance).some(arr => arr.some(p => p.includes('v1.4.3/core/00-bus.js'))));
ok('routes.json manifest written w/ SRI',
  (() => { try { const m = JSON.parse(fs.readFileSync(path.join(DIST, 'routes.json'), 'utf8')); return !!m.routes.home.integrity; } catch { return false; } })());
ok('no dist output committed outside v1.4.3/dist/fedarch',
  !fs.existsSync(path.join(REPO_ROOT, 'v1.4.3', 'dist', 'routes.json')));

console.log('== fedarch verify: FAIL scenario (over-budget fixture) ==');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fedarch-over-'));
// Generate a ~130KB fixture module (big literal — source bytes are what the budget counts).
const bigLiteral = 'PF_OVER_BUDGET_FIXTURE = "' + 'x'.repeat(130 * 1024) + '";\n';
fs.writeFileSync(path.join(tmp, 'big.js'), bigLiteral);
fs.writeFileSync(path.join(tmp, 'over.entry.js'),
  `import './big.js';\nimport '${path.join(REPO_ROOT, 'v1.4.3', 'core', '00-bus.js')}';\n`);
const overManifest = {
  routes: {
    home: { entry: 'build/fedarch/entries/home.entry.js', order: ['home'], silos: ['home'] },
    over: { entry: path.join(tmp, 'over.entry.js'), order: ['over'], silos: ['over'] },
  },
};
const overManifestPath = path.join(tmp, 'routes.manifest.json');
fs.writeFileSync(overManifestPath, JSON.stringify(overManifest));
const overOut = path.join(tmp, 'dist');
let gateFired = false, gateOutput = '';
try {
  execFileSync(node, [path.join(here, 'build.mjs'), '--manifest', overManifestPath, '--outdir', overOut], { stdio: 'pipe' });
} catch (e) {
  gateFired = true;
  gateOutput = (e.stdout || '').toString() + (e.stderr || '').toString();
}
ok('budget gate FIRED on over-budget fixture (build exit != 0)', gateFired);
ok('gate names the violating route', /route chunk over|BUDGET GATE FAILED/.test(gateOutput), gateOutput.split('\n').find(l => /route chunk over/.test(l))?.trim() || 'no detail line');
ok('over-budget report artifact still written for diagnosis', fs.existsSync(path.join(overOut, 'report.json')));
fs.rmSync(tmp, { recursive: true, force: true });

console.log('== fedarch verify: dispatcher snippet parses ==');
try {
  execSync(`${node} --check ${path.join(here, 'dispatcher-snippet.js')}`, { stdio: 'pipe' });
  ok('dispatcher-snippet.js parses', true);
} catch { ok('dispatcher-snippet.js parses', false); }

console.log(failures ? `\nVERIFY FAILED: ${failures} check(s)` : '\nVERIFY GREEN: all checks passed.');
process.exit(failures ? 1 : 0);
