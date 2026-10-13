#!/usr/bin/env bash
# bump-pwa-version.sh — stamp ONE consistent PWA build id at deploy time.
#
# Restored 2026-10-13 (homepage r3 / PWA staleness root-cause fix) from the
# original in commit e17414d6, which lived only on the FE integration line —
# this deploy lineage never had the file, so the Engels gate logged
# "bump script missing" and shipped every deploy with frozen Oct-11 stamps
# while the service workers served cache-first bundles from an Oct-9/Oct-11
# cache. Enhancements over the original are marked [r3].
#
# Updates, atomically from the PWA's point of view:
#   1. site/version.json            (polled by every page, served no-store)
#   2. window.__PF_BUILD in every built page (stamped by build-shells.py)
#   3. the cache name in BOTH service workers: site/sw.js AND site/sw2.js
#      [r3: the homepage registers /sw2.js only (index.html: "kill the
#       frozen /sw.js, use /sw2.js only"); the original script stamped only
#       sw.js, leaving the live worker's cache name behind.]
#   4. Promise Keeper latest-build.txt [r3: LAYERS.md Layer 1 — the deploy
#      pipeline writes the build id there; PK escalations repeatedly flagged
#      "deploy pipeline does not auto-write latest-build.txt".]
#
# Why all stamps move together: the PWA self-heal (build-shells.py
# SELFCHECK_JS) compares the live /version.json build against the
# page-embedded __PF_BUILD and, on ANY mismatch, unregisters the service
# worker, wipes all caches, and reloads. The reload does not clear the
# mismatch, so a version.json-only bump puts the live site into an infinite
# reload loop for every visitor (incident 2026-10-10 19:35 CDT).
#
# Why the bump matters: both service workers serve static assets
# CACHE-FIRST from a cache named 'mtcstw-pwa-<build id>'. A cache hit is
# served forever — the network is never re-consulted — until a new service
# worker with a DIFFERENT cache name activates and purges the old cache
# (activate handler: delete every key !== CACHE). Changing the stamp
# changes sw.js/sw2.js bytes, which is what triggers the browser's
# service-worker update check on the next navigation.
#
# Called by engels/gate/deploy.sh (Step 3) for the mtcstw-app worker,
# AFTER cd'ing into the deploy repo and BEFORE `wrangler deploy`, so the
# re-stamped tree is exactly what ships.
#
# Build-string convention (unchanged): <date-time>-<short sha of the
# deployed tip>, e.g. 20261011-0035-74b4f4b4. The sha comes from the working
# tree being deployed, so the id always names the actual deployed tip.
#
# Usage: bump-pwa-version.sh [repo_root]   (default: this script's repo root)
# Exit 1 if the final consistency check fails (deploy.sh aborts then).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${1:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$REPO" || { echo "[pwa-bump] FATAL: cannot cd to $REPO"; exit 1; }

log() { echo "[pwa-bump] $*"; }

[[ -f site/version.json ]] || { log "FATAL: site/version.json not found"; exit 1; }

OLD_BUILD="$(python3 -c "import json,sys;print(json.load(open('site/version.json')).get('build',''))" 2>/dev/null)"
NEW_BUILD="$(date +%Y%m%d-%H%M)-$(git rev-parse --short HEAD 2>/dev/null || echo 'nogit')"

log "old=$OLD_BUILD new=$NEW_BUILD"

# 1. version.json — the file the PWA polls
printf '{"build":"%s"}' "$NEW_BUILD" > site/version.json

# 2. Re-stamp window.__PF_BUILD in every page. [r3: pattern-based — replace
#    ANY existing id, not only the exact old string. The tree carried a
#    desynced outlier (__PF_BUILD="20261011-dig-001" on the /dig page) that
#    an exact-match pass would have missed, failing the consistency gate
#    and aborting every deploy. Pattern replace converges all pages.]
RESTAMPED="$(python3 - "$NEW_BUILD" <<'PYEOF'
import os, re, sys
new = sys.argv[1]
pat = re.compile(r'window\.__PF_BUILD="[^"]*"')
changed = 0
for root, _dirs, files in os.walk('site'):
    for fn in files:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(root, fn)
        with open(p, encoding='utf-8', errors='replace') as fh:
            s = fh.read()
        s2, n = pat.subn('window.__PF_BUILD="%s"' % new, s)
        if n:
            with open(p, 'w', encoding='utf-8') as fh:
                fh.write(s2)
            changed += 1
print(changed)
PYEOF
)"
log "re-stamped $RESTAMPED pages"

# 3. Service-worker cache names — same first-occurrence rule as
#    build-shells.py, applied to BOTH workers [r3].
for SW in site/sw.js site/sw2.js; do
  if [[ -f "$SW" ]]; then
    sed -i "0,/'mtcstw-pwa-[^']*'/s//'mtcstw-pwa-$NEW_BUILD'/" "$SW"
    log "$SW cache name -> mtcstw-pwa-$NEW_BUILD"
  fi
done

# 4. Promise Keeper latest-build.txt (Layer 1 output, Layer 6 input).
PK_BUILD_FILE="$HOME/workspace/hidden/promise-keeper/latest-build.txt"
if [[ -d "$(dirname "$PK_BUILD_FILE")" ]]; then
  printf '%s\n' "$NEW_BUILD" > "$PK_BUILD_FILE"
  log "latest-build.txt -> $NEW_BUILD"
else
  log "note: promise-keeper dir not found; latest-build.txt not written"
fi

# 5. Consistency gate: everything the PWA compares must agree.
FAIL=0
GOT="$(python3 -c "import json;print(json.load(open('site/version.json')).get('build',''))")"
[[ "$GOT" == "$NEW_BUILD" ]] || { log "MISMATCH: version.json has '$GOT'"; FAIL=1; }
while IFS= read -r f; do
  if ! grep -qF "window.__PF_BUILD=\"$NEW_BUILD\"" "$f"; then
    log "MISMATCH: $f"; FAIL=1
  fi
done < <(grep -rlF --include='*.html' '__PF_BUILD=' site/ 2>/dev/null)
for SW in site/sw.js site/sw2.js; do
  if [[ -f "$SW" ]] && ! grep -qF "mtcstw-pwa-$NEW_BUILD" "$SW"; then
    log "MISMATCH: $SW cache name"; FAIL=1
  fi
done

if [[ $FAIL -ne 0 ]]; then
  log "❌ INCONSISTENT — refusing to ship a split-brain PWA build"
  exit 1
fi
log "✅ consistent @ $NEW_BUILD (version.json + pages + sw.js + sw2.js)"
