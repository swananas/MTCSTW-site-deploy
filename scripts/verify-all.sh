#!/bin/sh
# scripts/verify-all.sh — MASTER VERIFY FLOW (2026-10-06, CTO).
# Step 0 is ALWAYS the built-bundle syntax gate: a line with broken bundles
# fails here before any feature verify can claim PASS (the eb6a701 lesson).
# Usage: sh scripts/verify-all.sh [extra args passed to each verifier]
set -u
cd "$(dirname "$0")/.."

echo "== STEP 0: built-bundle syntax gate =="
node scripts/verify-built-bundles.js || { echo "GATE FAILED — broken bundles; refusing to run feature verifies."; exit 1; }

echo ""
echo "== feature verifies =="
FAIL=0
for v in scripts/verify-*.js; do
  case "$v" in
    *verify-built-bundles.js) continue ;;
  esac
  echo "--- $v ---"
  if node "$v" "$@" > /tmp/verify-all-last.log 2>&1; then
    tail -1 /tmp/verify-all-last.log
  else
    echo "FAILED: $v"
    tail -5 /tmp/verify-all-last.log
    FAIL=1
  fi
done

if [ "$FAIL" -eq 1 ]; then echo "VERIFY-ALL: FAILURES PRESENT"; exit 1; fi
echo "VERIFY-ALL: GREEN"
