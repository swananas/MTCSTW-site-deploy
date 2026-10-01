#!/usr/bin/env python3
"""Connection audit for PF v1.4.2 — verifies every silo is wired correctly.
Run: python3 audit-silos.py  (exit 0 = clean, exit 1 = findings)
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
V142 = os.path.join(ROOT, 'v1.4.2')
findings = []
def ok(msg): print(f"  ok: {msg}")
def bad(msg): findings.append(msg); print(f"  FAIL: {msg}")

print("== 1. footer loader lists vs disk ==")
footer = open(os.path.join(ROOT, 'loader', 'footer_v142_final.html')).read()
v2 = re.search(r'var JS=onV2\?(\[.*?\])\:', footer, re.S).group(1)
v1 = re.search(r'var JS=onV2\?\[.*?\]\:(\[.*?\]);', footer, re.S).group(1)
v2_files = re.findall(r'"([^"]+)"', v2) or re.findall(r"'([^']+)'", v2)
v1_files = re.findall(r'"([^"]+)"', v1) or re.findall(r"'([^']+)'", v1)
for f in v2_files:
    p = os.path.join(V142, f)
    if not os.path.exists(p): bad(f"V2-listed file missing on disk: {f}")
for f in v1_files:
    p = os.path.join(ROOT, 'v1.1.0', f)
    if not os.path.exists(p): bad(f"V1-listed file missing on disk: {f}")
ok(f"{len(v2_files)} V2 files, {len(v1_files)} V1 files all on disk")

print("== 2. kill-switch ids match filenames ==")
SKIP_ALLOW = {'core/07-slr-db.js': 'slr-db', 'core/06-pinups.js': 'pinups'}
for f in v2_files:
    if not f.endswith('.js'): continue
    src = open(os.path.join(V142, f)).read()
    m = re.search(r'PF\.skip\(\s*["\']([^"\']+)["\']\s*\)', src)
    expect = os.path.basename(f)[:-3]
    if f in ('core/00-bus.js', 'core/07-slr-db-data.js'):
        continue  # bus owns skip(); data file has no logic
    if f in SKIP_ALLOW:
        if not m or m.group(1) != SKIP_ALLOW[f]:
            bad(f"{f}: expected documented skip id '{SKIP_ALLOW[f]}'")
        continue
    if not m: bad(f"{f}: no PF.skip id found"); continue
    if m.group(1) != expect: bad(f"{f}: skip id '{m.group(1)}' != '{expect}'")
ok("kill-switch ids checked")

print("== 3. load order ==")
order = v2_files
def idx(n): return order.index(n)
checks = [
    ('core/00-bus.js', 'core/07-slr-db-data.js'),
    ('core/07-slr-db-data.js', 'core/07-slr-db.js'),
    ('core/07-slr-db.js', 'core/03-global.js'),
    ('core/03-global.js', 'core/04-ledger.js'),
    ('core/07-slr-db.js', 'games/war-card.js'),
    ('core/07-slr-db.js', 'games/fan-vote.js'),
    ('core/07-slr-db.js', 'games/daily-orders.js'),
    ('core/07-slr-db.js', 'pages/slr-roster.js'),
    ('core/07-slr-db.js', 'pages/slr-catalog.js'),
]
for a, b in checks:
    if idx(a) > idx(b): bad(f"load order: {a} must come before {b}")
ok("load order constraints hold")

print("== 4. PF.ROSTER is a live getter, not a hardcoded array ==")
g = open(os.path.join(V142, 'core/03-global.js')).read()
if 'PF.ROSTER = [' in g: bad("03-global.js still hardcodes PF.ROSTER array")
if 'defineProperty(PF' not in g or "'ROSTER'" not in g: bad("03-global.js missing PF.ROSTER getter")
if 'PF.slrLegacy' not in g: bad("ROSTER getter does not read PF.slrLegacy")
dbsrc = open(os.path.join(V142, 'core/07-slr-db.js')).read()
if 'PF.slrLegacy' not in dbsrc: bad("07-slr-db.js never sets PF.slrLegacy")
ok("PF.ROSTER getter wired to PF.slrLegacy")

print("== 5. data flow: new silos read the DB, consumers read PF.ROSTER ==")
for f in ('pages/slr-roster.js', 'pages/slr-catalog.js'):
    s = open(os.path.join(V142, f)).read()
    if 'PF.slrReady' not in s: bad(f"{f} does not wait for PF.slrReady")
    if 'PF.ROSTER' in s and 'slr-roster' not in f: bad(f"{f} reads PF.ROSTER directly")
for f in ('games/war-card.js', 'games/fan-vote.js', 'games/daily-orders.js'):
    s = open(os.path.join(V142, f)).read()
    if 'PF.ROSTER' not in s: bad(f"{f} no longer reads PF.ROSTER")
    if 'slr-missing-candidates' in s or 'creators-db' in s: bad(f"{f} references old data files")
ok("data flow correct")

print("== 6. slug coverage: footer alternation covers all 62 DB slugs ==")
db = json.load(open(os.path.join(ROOT, 'src/data/slr-master-db.json')))
slugs = [m['slug'] for m in db['members']]
m = re.search(r"var SLR_SLUGS='([^']+)'", footer)
falts = m.group(1).split('|')
missing = [s for s in slugs if s not in falts]
extra = [s for s in falts if s not in slugs]
if missing: bad(f"footer slug list missing: {missing}")
if extra: bad(f"footer slug list has extras: {extra}")
for mem in db['members']:
    if mem['catalog_path'] != '/' + mem['slug']:
        bad(f"catalog_path mismatch for {mem['slug']}")
ok(f"all {len(slugs)} slugs in footer, catalog paths consistent")

print("== 7. games derive creators from the DB (no hardcoded pools) ==")
have = set(slugs)
for f in ('games/slr-match-quiz.js', 'games/creator-guess.js'):
    s = open(os.path.join(V142, f)).read()
    # strip block/line comments before scanning for literals
    nc = re.sub(r'/\*[\s\S]*?\*/', '', s)
    nc = re.sub(r'(^|\n)\s*//[^\n]*', r'\1', nc)
    hard = sorted({slug for slug in have if re.search(r'["\']' + re.escape(slug) + r'["\']', nc)})
    if hard: bad(f"{f}: hardcoded creator slugs (must come from PF.slrAll): {hard[:8]}")
    if 'slrAll' not in nc: bad(f"{f}: does not read PF.slrAll — not DB-driven")
ok("quiz/guess are DB-driven, zero hardcoded creator slugs")

print("== 8. mount creation unique (reads are fine) ==")
creators = {}
for f in v2_files:
    if not f.endswith('.js'): continue
    s = open(os.path.join(V142, f)).read()
    # creation patterns: el.id='x', h.id='x', id="x" inside template HTML
    made = set(re.findall(r"\.id\s*=\s*['\"]([a-z0-9\-]+)['\"]", s))
    made |= set(re.findall(r'id=\\"([a-z0-9\-]+)\\"', s))
    made |= set(re.findall(r'id="([a-z0-9\-]+)"', s))
    for mid in made:
        if mid in ('pf-silo-holder', 'pf-v2'): continue
        creators.setdefault(mid, []).append(f)
dupes = {k: v for k, v in creators.items() if len(v) > 1}
if dupes: bad(f"element id created by multiple silos: {dupes}")
# every new silo must guard its mount point
for f, mid in (('pages/slr-roster.js', 'pf-slr-roster'), ('pages/slr-catalog.js', 'pf-catalog'),
               ('games/war-card.js', 'pf-war-card')):
    s = open(os.path.join(V142, f)).read()
    if mid not in s: bad(f"{f} missing mount guard for #{mid}")
ok("mount creation checked (service-medals creates #pf-medals, pinups only anchors)")

print("== 9. no live code references to retired data files ==")
for dirpath, _, files in os.walk(V142):
    for fn in files:
        if not fn.endswith('.js'): continue
        p = os.path.join(dirpath, fn)
        s = open(p).read()
        # allow the meta provenance string in the generated snapshot
        s_scrubbed = s.replace(
            "creators-db.json (41, group C enriched) + slr-missing-candidates.json (21 approved)", "")
        if 'creators-db.json' in s_scrubbed or 'slr-missing-candidates' in s_scrubbed:
            bad(f"{os.path.relpath(p, V142)} references retired data files")
ok("no retired data references in live code")

print("== 10. syntax check all v1.4.2 JS ==")
badjs = []
for dirpath, _, files in os.walk(V142):
    for fn in files:
        if fn.endswith('.js'):
            p = os.path.join(dirpath, fn)
            r = subprocess.run(['node', '--check', p], capture_output=True)
            if r.returncode != 0: badjs.append(p)
if badjs: bad(f"syntax errors: {badjs}")
ok("all JS parses")

print("== 11. snapshot in sync with master JSON ==")
snap_src = open(os.path.join(V142, 'core/07-slr-db-data.js')).read()
mm = re.search(r'window\.PF_SLR_DB_SNAPSHOT = (\{.*\});\s*$', snap_src, re.S)
snap = json.loads(mm.group(1))
if [m['slug'] for m in snap['members']] != slugs: bad("snapshot slug order/content != master JSON")
if snap['meta']['total_members'] != 62: bad("snapshot meta wrong")
ok("snapshot in sync with src/data/slr-master-db.json")

print("== 12. counted-once: single numeric follower field ==")
for mem in db['members']:
    if not isinstance(mem['followers_total'], int) or mem['followers_total'] <= 0:
        bad(f"{mem['slug']}: bad followers_total")
    for k in ('followers', 'follower_count', 'total_followers'):
        if k in mem: bad(f"{mem['slug']}: duplicate follower field '{k}'")
ok("followers_total is the single numeric audience field")

print()
if findings:
    print(f"AUDIT FAILED: {len(findings)} finding(s)")
    sys.exit(1)
print("AUDIT CLEAN — all connections verified")
