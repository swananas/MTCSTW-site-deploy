#!/usr/bin/env python3
"""Inject the Karl Ambient loader tag into every site page.

KARL AMBIENT (2026-10-12): Karl as a layer, not a place. Every page
that loads pf-faces.js (the universal core rail) gets ONE more tag
right after it:

    <script src="/v1.4.3/core/karl-ambient-loader.js" defer></script>

The loader itself is ~2.2KB gzipped; Karl's sheet loads on first tap.

Idempotent: pages already carrying the tag are skipped. RE-RUN this
after any branch that adds pages (e.g. creator-claim's /join and
/creator-hub) merges into the live tree, so new pages inherit Karl.

Usage: python3 build/inject-karl-ambient.py [site_dir]
"""
import os
import re
import sys

SITE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "site")
TAG = '<script src="/v1.4.3/core/karl-ambient-loader.js" defer></script>'
ANCHOR = re.compile(r'<script[^>]*pf-faces\.js[^>]*>\s*</script>')

injected, already, no_anchor = [], [], []

for root, _dirs, files in os.walk(SITE):
    for name in files:
        if not name.endswith(".html"):
            continue
        p = os.path.join(root, name)
        with open(p, "r", encoding="utf-8", errors="replace") as fh:
            html = fh.read()
        if "karl-ambient-loader.js" in html:
            already.append(p)
            continue
        m = ANCHOR.search(html)
        if not m:
            no_anchor.append(p)
            continue
        html = html[: m.end()] + "\n" + TAG + html[m.end():]
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(html)
        injected.append(p)

print(f"injected: {len(injected)}")
print(f"already:  {len(already)}")
print(f"no pf-faces anchor (skipped): {len(no_anchor)}")
for p in no_anchor:
    print("  NO-ANCHOR:", os.path.relpath(p, SITE))
