#!/usr/bin/env node
/* build/fedarch/esbuild.config.mjs
 * Builds the per-route config from build/fedarch/routes.manifest.json.
 * Exported so build.mjs and tests can consume it without side effects. */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeVendorChunkPlugin } from './vendor-chunk-plugin.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..');
export const FEDARCH = path.join(REPO_ROOT, 'build', 'fedarch');
export const OUT_DIR = path.join(REPO_ROOT, 'v1.4.3', 'dist', 'fedarch');

export function loadRoutesManifest(manifestPath) {
  const p = manifestPath || path.join(FEDARCH, 'routes.manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entries = {};
  for (const [route, def] of Object.entries(m.routes)) {
    const abs = path.resolve(REPO_ROOT, def.entry);
    if (!fs.existsSync(abs)) throw new Error(`fedarch: missing entry for route "${route}": ${def.entry}`);
    entries[route] = abs;
  }
  return { routes: m.routes, entries };
}

export function makeConfig({ entries, outdir, metafilePath } = {}) {
  const loaded = entries ? { entries } : loadRoutesManifest();
  return {
    entryPoints: loaded.entries,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    splitting: true,          // route-based code splitting: shared modules -> chunks
    treeShaking: true,        // drop unused exports (effective on ESM-form modules)
    minify: true,
    legalComments: 'none',
    outdir: outdir || OUT_DIR,
    entryNames: 'routes/[name].[hash]',
    chunkNames: 'chunks/chunk.[hash]',
    metafile: true,
    plugins: [makeVendorChunkPlugin(REPO_ROOT, path.join(FEDARCH, 'vendor.manifest.json'))],
    logLevel: 'warning',
  };
}
