#!/usr/bin/env node
/* build/fedarch/build.mjs — the fedarch build orchestrator.
 * Steps: clean outdir -> esbuild (splitting, metafile) -> vendor-chunk rename
 * remap in metafile -> write meta.json + routes.json (dispatcher manifest w/ SRI)
 * -> analyze (report.json) -> budget-gate (HARD FAIL on over-budget).
 * Usage: node build/fedarch/build.mjs [--manifest <path>] [--outdir <path>]
 * Exit non-zero if the budget gate fails: the build IS the enforcement. */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { makeConfig, loadRoutesManifest, REPO_ROOT, FEDARCH, OUT_DIR } from './esbuild.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const mi = args.indexOf('--manifest');
const oi = args.indexOf('--outdir');
const manifestPath = mi >= 0 ? path.resolve(args[mi + 1]) : path.join(FEDARCH, 'routes.manifest.json');
const outdir = oi >= 0 ? path.resolve(args[oi + 1]) : OUT_DIR;

const loaded = loadRoutesManifest(manifestPath);
fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

console.log(`fedarch build: ${Object.keys(loaded.entries).length} route entries -> ${path.relative(REPO_ROOT, outdir)}`);
const result = await esbuild.build(makeConfig({ entries: loaded.entries, outdir }));

// Remap the vendor-chunk renames into the metafile and normalize output keys
// to be relative to the outdir (analyzer + dispatcher both read these).
let meta = result.metafile;
const renames = result.vendorChunks || (result.vendorChunk ? [result.vendorChunk] : []);
const rel = p => path.relative(outdir, path.resolve(REPO_ROOT, p));
const remap = key => {
  for (const r of renames) {
    const from = rel(r.from), to = rel(r.to);
    if (key === from) return to;
  }
  return key;
};
const fixed = { inputs: meta.inputs, outputs: {} };
for (const [out, m] of Object.entries(meta.outputs)) {
  const key = remap(rel(out));
  const imports = (m.imports || []).map(d => ({ ...d, path: remap(rel(d.path)) }));
  fixed.outputs[key] = { ...m, imports, entryPoint: m.entryPoint ? path.resolve(m.entryPoint) : undefined };
}
meta = fixed;
fs.writeFileSync(path.join(outdir, 'meta.json'), JSON.stringify(meta, null, 2));

// routes.json — the runtime dispatcher manifest (route -> chunk + imports + SRI)
const routeEntryOut = {};
for (const [out, m] of Object.entries(meta.outputs)) {
  if (m.entryPoint) {
    for (const [route, def] of Object.entries(loaded.routes)) {
      if (path.resolve(REPO_ROOT, def.entry) === path.resolve(m.entryPoint)) routeEntryOut[route] = out;
    }
  }
}
const integrity = {};
for (const out of Object.keys(meta.outputs)) {
  const h = crypto.createHash('sha384').update(fs.readFileSync(path.join(outdir, out))).digest('base64');
  integrity[out] = 'sha384-' + h;
}
const routesJson = { version: 1, builtAt: new Date().toISOString(), routes: {} };
for (const [route, out] of Object.entries(routeEntryOut)) {
  const walkImports = o => (meta.outputs[o]?.imports || []).map(i => i.path);
  const walk = (o, seen = new Set()) => {
    for (const imp of walkImports(o)) {
      if (!seen.has(imp)) { seen.add(imp); walk(imp, seen); }
    }
    return seen;
  };
  routesJson.routes[route] = {
    entry: out,
    imports: [...walk(out)],
    integrity: Object.fromEntries([out, ...walk(out)].map(f => [f, integrity[f]])),
    silos: loaded.routes[route].silos || [route],
    order: loaded.routes[route].order || [route],
  };
}
fs.writeFileSync(path.join(outdir, 'routes.json'), JSON.stringify(routesJson, null, 2));

// Analyze -> report.json, then the hard budget gate.
execFileSync('node', [path.join(here, 'analyze.mjs'),
  path.join(outdir, 'meta.json'), manifestPath, path.join(outdir, 'report.json')], { stdio: 'inherit' });
execFileSync('node', [path.join(here, 'budget-gate.mjs'), path.join(outdir, 'report.json')], { stdio: 'inherit' });
console.log('fedarch build: GREEN — budgets enforced, report.json written.');
