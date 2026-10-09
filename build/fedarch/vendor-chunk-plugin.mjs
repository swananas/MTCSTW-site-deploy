#!/usr/bin/env node
/* build/fedarch/vendor-chunk-plugin.mjs
 * Post-process: find the auto-generated shared chunk whose inputs are >=60%
 * vendor-manifest modules and rename it to chunks/vendor.<hash>.js, rewriting
 * the import specifiers in every output chunk that references it.
 * Deterministic naming = stable CDN identity for the CEO-mandated vendor chunk. */
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const VENDOR_RATIO = 0.6;

export function makeVendorChunkPlugin(repoRoot, vendorManifestPath) {
  const vendor = JSON.parse(fs.readFileSync(vendorManifestPath, 'utf8')).vendor
    .map(p => path.resolve(repoRoot, p));
  return {
    name: 'fedarch-vendor-chunk',
    setup(build) {
      build.onEnd(result => {
        if (!result.metafile) return;
        const { outputs } = result.metafile;
        const outDir = build.initialOptions.outdir;
        let vendorChunk = null, bestRatio = 0;
        for (const [out, meta] of Object.entries(outputs)) {
          if (!meta.entryPoint && out.includes('/chunks/')) {
            let vBytes = 0, total = 0;
            for (const [inp, detail] of Object.entries(meta.inputs)) {
              const abs = path.resolve(inp);
              const b = detail.bytesInOutput || 0;
              total += b;
              if (vendor.includes(abs)) vBytes += b;
            }
            const ratio = total ? vBytes / total : 0;
            if (ratio >= VENDOR_RATIO && ratio > bestRatio) {
              bestRatio = ratio; vendorChunk = out;
            }
          }
        }
        if (!vendorChunk) return; // no vendor-qualifying chunk this build
        const oldBase = path.basename(vendorChunk);
        const newBase = oldBase.replace(/^chunk\./, 'vendor.');
        const repoRoot = build.initialOptions.absWorkingDir || process.cwd();
        const oldAbs = path.resolve(repoRoot, vendorChunk);
        const newAbs = path.resolve(repoRoot, path.dirname(vendorChunk), newBase);
        fs.renameSync(oldAbs, newAbs);
        // rewrite specifiers in every output that imports the old chunk name
        const specRe = new RegExp(oldBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        for (const [out] of Object.entries(outputs)) {
          const abs = path.resolve(repoRoot, out);
          if (abs === newAbs || !fs.existsSync(abs)) continue;
          const text = fs.readFileSync(abs, 'utf8');
          if (text.includes(oldBase)) fs.writeFileSync(abs, text.replace(specRe, newBase));
        }
        result.vendorChunk = { from: vendorChunk, to: path.join(path.dirname(vendorChunk), newBase), ratio: bestRatio };
      });
    }
  };
}
