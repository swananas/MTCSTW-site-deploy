#!/usr/bin/env node
/* build/fedarch/vendor-chunk-plugin.mjs
 * Post-process: find the auto-generated shared chunks whose inputs are >=60%
 * vendor-manifest modules and rename them to chunks/vendor.<hash>.js, rewriting
 * the import specifiers in every output chunk that references them.
 * Deterministic naming = stable CDN identity for the CEO-mandated vendor chunk.
 * NOTE (integration fix 2026-10-09): esbuild may partition the vendor modules
 * across SEVERAL shared chunks (seen with the 13-route manifest: the 2-route
 * sample kept them together). Every qualifying chunk is promoted — promoting
 * only the best-ratio one stranded vendor-manifest modules (00-bus, 03-global,
 * 14-auth) in a generically-named chunk, which the analyzer then counted
 * against every route's total instead of amortizing it as vendor. */
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
        const repoRoot = build.initialOptions.absWorkingDir || process.cwd();
        const renames = [];
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
            if (ratio < VENDOR_RATIO) continue;
            const oldBase = path.basename(out);
            const newBase = oldBase.replace(/^chunk\./, 'vendor.');
            const oldAbs = path.resolve(repoRoot, out);
            const newAbs = path.resolve(repoRoot, path.dirname(out), newBase);
            fs.renameSync(oldAbs, newAbs);
            // rewrite specifiers in every output that imports the old chunk name
            const specRe = new RegExp(oldBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            for (const [o2] of Object.entries(outputs)) {
              const abs2 = path.resolve(repoRoot, o2);
              if (abs2 === newAbs || !fs.existsSync(abs2)) continue;
              const text = fs.readFileSync(abs2, 'utf8');
              if (text.includes(oldBase)) fs.writeFileSync(abs2, text.replace(specRe, newBase));
            }
            renames.push({ from: out, to: path.join(path.dirname(out), newBase), ratio });
          }
        }
        if (!renames.length) return; // no vendor-qualifying chunk this build
        result.vendorChunks = renames;
        // backward compat: single-chunk consumers read result.vendorChunk
        result.vendorChunk = renames[0];
      });
    }
  };
}
