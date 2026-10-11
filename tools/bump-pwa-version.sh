#!/usr/bin/env bash
# bump-pwa-version.sh — stamp ONE consistent PWA build id at deploy time.
#
# Updates, atomically from the PWA's point of view:
#   1. site/version.json            (polled by every page, served no-store)
#   2. window.__PF_BUILD in every built page (stamped by build-shells.py)
#   3. the sw.js cache name         (var CACHE = 'mtcstw-pwa-<id>')
#
# Why all three: the PWA self-heal (build-shells.py SELFCHECK_JS) compares
# the live /version.json build against the page-embedded __PF_BUILD and, on
# ANY mismatch, unregisters the service worker, wipes all caches, and
# reloads. The reload does not clear the mismatch, so a version.json-only
# bump puts the live site into an infinite reload loop for every visitor
# (this happened on the 2026-10-10 19:35 CDT deploy). All three must move
# together, every deploy.
#
# Called by engels/gate/deploy.sh (Step 3) for the mtcstw-app worker,
# AFTER cd'ing into the deploy repo and BEFORE `wrangler deploy`, so the
# re-stamped tree is exactly what ships.
#
# Build-string convention (unchanged): <UTC date-time>-<short sha of the
# deployed tip>, e.g. 20261011-0035-74b4f4b4. The sha comes from the working
# tree being deployed, so the id always names the actual deployed tip.
#
# Usage: bump-pwa-version.sh [repo_root]   (default: this script's repo root)
# Exit 1 if the final consistency check fails (deploy.sh must abort then).

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

# 2. Re-stamp the build-time-embedded __PF_BUILD in every page.
#    Fixed-string replace of the exact old id (unique per build: UTC
#    timestamp + short sha). Scoped to *.html to avoid touching binaries.
#    Fallback: if the id in version.json appears in NO page (e.g. a previous
#    version.json-only bump dirtied the tree), adopt the dominant
#    page-embedded __PF_BUILD as OLD so the tree still converges.
RESTAMPED=0
if [[ -z "$OLD_BUILD" || "$OLD_BUILD" == "$NEW_BUILD" ]]; then
  log "no page re-stamp needed (old id empty or unchanged)"
else
  if ! grep -rlF --include='*.html' "$OLD_BUILD" site/ >/dev/null 2>&1; then
    OLD_BUILD="$(grep -rhoE --include='*.html' 'window\.__PF_BUILD="[^"]*"' site/ 2>/dev/null \
      | sed 's/.*="//;s/"//' | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')"
    log "version.json id not found in pages; adopting page id as old: $OLD_BUILD"
  fi
  if [[ -n "$OLD_BUILD" ]]; then
    while IFS= read -r f; do
      sed -i "s/$OLD_BUILD/$NEW_BUILD/g" "$f" && RESTAMPED=$((RESTAMPED+1))
    done < <(grep -rlF --include='*.html' "$OLD_BUILD" site/ 2>/dev/null)
  fi
  log "re-stamped $RESTAMPED pages"
fi

# 3. sw.js cache name — same first-occurrence rule as build-shells.py
#    (re.subn(r"'mtcstw-pwa-[^']*'", ..., count=1)).
if [[ -f site/sw.js ]]; then
  sed -i "0,/'mtcstw-pwa-[^']*'/s//'mtcstw-pwa-$NEW_BUILD'/" site/sw.js
  log "sw.js cache name -> mtcstw-pwa-$NEW_BUILD"
fi

# 4. Consistency gate: everything the PWA compares must agree.
FAIL=0
GOT="$(python3 -c "import json;print(json.load(open('site/version.json')).get('build',''))")"
[[ "$GOT" == "$NEW_BUILD" ]] || { log "MISMATCH: version.json has '$GOT'"; FAIL=1; }
while IFS= read -r f; do
  if ! grep -qF "window.__PF_BUILD=\"$NEW_BUILD\"" "$f"; then
    log "MISMATCH: $f"; FAIL=1
  fi
done < <(grep -rlF --include='*.html' '__PF_BUILD=' site/ 2>/dev/null)
if [[ -f site/sw.js ]] && ! grep -qF "mtcstw-pwa-$NEW_BUILD" site/sw.js; then
  log "MISMATCH: site/sw.js cache name"; FAIL=1
fi

if [[ $FAIL -ne 0 ]]; then
  log "❌ INCONSISTENT — refusing to ship a split-brain PWA build"
  exit 1
fi
log "✅ consistent @ $NEW_BUILD (version.json + pages + sw.js)"
