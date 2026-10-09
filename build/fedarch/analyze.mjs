#!/usr/bin/env node
/* build/fedarch/analyze.mjs
 * Reads esbuild's metafile and produces the CI bundle-analyzer report:
 * v1.4.3/dist/fedarch/report.json
 * Schema: builtAt, esbuild version, budgets, routes{chunk, bytes, gzipBytes,
 * chunks[], totalBytes, totalGzipBytes}, outputs{bytes, gzipBytes, entryPoint,
 * inputs[{path, bytesInOutput}]}, provenance{chunk -> [source inputs]}.
 * Usage: node build/fedarch/analyze.mjs <metafile> <manifest> <outReport> */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '..', '..');

const [, , metafilePath, manifestPath, outReport] = process.argv;
if (!metafilePath || !manifestPath || !outReport) {
  console.error('usage: analyze.mjs <metafile.json> <routes.manifest.json> <report.json>');
  process.exit(2);
}

const meta = JSON.parse(fs.readFileSync(metafilePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const budgets = JSON.parse(fs.readFileSync(path.join(here, 'budgets.json'), 'utf8'));

const outDir = path.dirname(path.resolve(outReport));
const gzipOf = abs => zlib.gzipSync(fs.readFileSync(abs), { level: 9 }).length;

// route name -> entry output file (esbuild output keys)
const routeEntryOut = {};
for (const [out, m] of Object.entries(meta.outputs)) {
  if (m.entryPoint) {
    const ep = path.resolve(m.entryPoint);
    for (const [route, def] of Object.entries(manifest.routes)) {
      if (path.resolve(REPO_ROOT, def.entry) === ep) routeEntryOut[route] = out;
    }
  }
}

const outputs = {};
const provenance = {};
for (const [out, m] of Object.entries(meta.outputs)) {
  const abs = path.resolve(outDir, out);
  const bytes = fs.existsSync(abs) ? fs.statSync(abs).size : (m.bytes || 0);
  const gzipBytes = fs.existsSync(abs) ? gzipOf(abs) : 0;
  outputs[out] = {
    bytes, gzipBytes,
    entryPoint: m.entryPoint ? path.relative(REPO_ROOT, path.resolve(m.entryPoint)) : null,
    inputs: Object.entries(m.inputs || {}).map(([inp, d]) => ({
      path: path.relative(REPO_ROOT, path.resolve(inp)),
      bytesInOutput: d.bytesInOutput || 0,
    })).sort((a, b) => b.bytesInOutput - a.bytesInOutput),
  };
  provenance[out] = outputs[out].inputs.map(i => i.path);
}

// per-route totals: route chunk + its imports (from metafile imports graph), vendor excluded as amortized
const routes = {};
for (const [route, entryOut] of Object.entries(routeEntryOut)) {
  const seen = new Set([entryOut]);
  const queue = [entryOut];
  let totalBytes = 0, totalGzip = 0;
  const chunks = [];
  while (queue.length) {
    const o = queue.pop();
    const om = meta.outputs[o];
    if (!om) continue;
    const info = outputs[o];
    const isVendor = path.basename(o).startsWith('vendor.');
    if (!isVendor) { totalBytes += info.bytes; totalGzip += info.gzipBytes; } // vendor amortized across routes
    for (const imp of (om.imports || [])) {
      const ip = imp.path;
      if (!seen.has(ip)) { seen.add(ip); queue.push(ip); chunks.push(ip); }
    }
  }
  const chunkBase = path.basename(entryOut);
  routes[route] = {
    chunk: chunkBase,
    bytes: outputs[entryOut].bytes,
    gzipBytes: outputs[entryOut].gzipBytes,
    chunks: chunks.map(c => path.basename(c)),
    totalBytes, totalGzipBytes: totalGzip,
  };
}

const report = {
  builtAt: new Date().toISOString(),
  esbuild: JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'node_modules', 'esbuild', 'package.json'), 'utf8')).version,
  budgets: {
    routeChunk: budgets.routeChunkBytes,
    vendor: budgets.vendorChunkBytes,
    coreRuntime: budgets.coreRuntimeBytes,
    routeTotal: budgets.routeTotalBytes,
  },
  routes, outputs, provenance,
};
fs.writeFileSync(outReport, JSON.stringify(report, null, 2) + '\n');
console.log(`fedarch analyze: ${Object.keys(routes).length} routes, ${Object.keys(outputs).length} outputs -> ${path.relative(REPO_ROOT, outReport)}`);
