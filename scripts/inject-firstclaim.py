#!/usr/bin/env python3
"""Idempotent injector: adds the first-claim toast snippet to site pages.
Skips pages already containing the PF_FIRSTCLAIM_V1 marker.
Only touches site/*/index.html (and site/index.html)."""
import os, sys

SITE = os.path.expanduser('~/workspace/mtcstw-site-deploy/site')
SNIPPET = os.path.join(SITE, '_snippets', 'firstclaim-toast.html')
MARKER = 'PF_FIRSTCLAIM_V1'

def main():
    with open(SNIPPET) as f:
        snippet = f.read()
    pages = []
    for root, dirs, files in os.walk(SITE):
        # skip snippets dir itself and non-page dirs
        if '_snippets' in root:
            continue
        for fn in files:
            if fn == 'index.html':
                pages.append(os.path.join(root, fn))
    injected = skipped = 0
    for p in sorted(pages):
        try:
            with open(p, 'r', encoding='utf-8', errors='replace') as f:
                html = f.read()
        except Exception as e:
            print('READ FAIL', p, e); continue
        if MARKER in html:
            skipped += 1; continue
        # inject before </body>, else append
        if '</body>' in html:
            html = html.replace('</body>', snippet + '\n</body>', 1)
        else:
            html = html + '\n' + snippet
        try:
            with open(p, 'w', encoding='utf-8') as f:
                f.write(html)
            injected += 1
        except Exception as e:
            print('WRITE FAIL', p, e)
    print('injected=%d skipped=%d total=%d' % (injected, skipped, len(pages)))

if __name__ == '__main__':
    main()
