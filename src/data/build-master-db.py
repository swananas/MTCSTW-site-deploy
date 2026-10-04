#!/usr/bin/env python3
"""Build src/data/slr-master-db.json — the single canonical SLR creator database.
Merges the 41 existing creators (creators-db.json) with the 21 approved new
candidates (slr-missing-candidates.json). Optionally overlays
catalog-scrape.json (live catalog page content for the 41 old members).

Rules:
- Everything counted once: followers_total is the ONE numeric audience field.
- Never invent URLs. Links carry their verified status.
- New members get provisional propaganda scores (7.6-9.8, no 10s), flagged.
"""
import json, re, os, sys, argparse

# ---- Regen safety (2026-10-04, creator audit): this script REGENERATES the
# master from scratch. Hand-patches applied directly to slr-master-db.json
# (e.g. ipostwhenifeelhot 26K bio, MTCSTW 62/8M+ copy, instagram.com/propfac,
# SD Patreon retagged unverified, thelastcookout clean URLs) are REVERTED by
# a regen. The diff gate at the bottom refuses to write when the regen
# differs from the committed master unless --force (explicit approval).
ap = argparse.ArgumentParser(description='Build src/data/slr-master-db.json')
ap.add_argument('--force', '-y', action='store_true',
                help='explicit approval: overwrite the committed master even when the regen diffs')
ap.add_argument('--allow-missing-seo', action='store_true',
                help='explicit approval: proceed when the out-of-repo SEO meta file is absent '
                     '(seo_description left empty for all members)')
ARGS = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))

# Served frontend version — the generated DB snapshot must land in the
# SERVED tree. (Was: stale v1.4.2/ path; the site serves v1.4.3/.)
# Bump together with the site version.
SERVED_VERSION = 'v1.4.3'

# Out-of-repo SEO enrichment source. Deliberately outside the repo
# (produced by the meta-description workflow). A missing file used to fail
# SILENTLY (empty seo_description for all 62) — now it fails LOUDLY unless
# --allow-missing-seo is passed (explicit, logged).
SEO_META_PATH = os.path.normpath(os.path.join(
    HERE, '..', '..', '..',
    'goals', 'propaganda-factory-website-rebuild', 'files',
    'meta_descriptions.json'))
db41 = json.load(open(os.path.join(HERE, 'creators-db.json')))
cands = json.load(open(os.path.join(HERE, 'slr-missing-candidates.json')))
scrape_path = os.path.join(HERE, 'catalog-scrape.json')
scrape = json.load(open(scrape_path)) if os.path.exists(scrape_path) else {}

# ---- Manual follower totals for the 41 (roster/user-stated figures, 2026-10-01 research) ----
OLD_TOTALS = {
 "sex-drugs-rock-n-roll": 258708, "mtcstw": 380000, "radically-sunny": 300000,
 "east-coast-it-notes": 84755, "joman": 290000, "quietmayhem": 10700,
 "dr-taylor-andrew": 357000, "the-atheist-socialist": 28537,
 "us-department-of-health-and-human-shenanigans": 13468,
 "f-this-imperialistic-bs": 35340, "guillotines-for-a-better-america": 63970,
 "guillotines-for-billionares-2020": 56000,
 "south-dakota-department-of-propaganda": 75000, "films-for-action": 1000000,
 "voix-noire": 50000, "bona-bones": 158600,
 "black-newsbeat-with-dr-kimeka-campbell": 44000, "hex-reject": 53000,
 "ipostwhenifeelhot": 26000, "wisconsin-department-of-propaganda": 57000,
 "the-antifascist-frog": 56500, "jeanine-pirreaux-comedy": 48000,
 "your-friendly-neighborhood-schizophrenic": 45000, "undraylowery": 16000,
 "minnesota-department-of-propaganda": 166967, "the-dr-greg-show": 35000,
 "damn-pam-ham-from-effingham": 22600,
 "luigis-mansion-socialist-shitposting": 22000,
 "let-the-revolution-begin-peacefully-of-course": 109815,
 "kim-hunt-slaythegop": 650000, "little-anarchist-brat": 9000,
 "im-that-girl": 74681, "joey": 55000, "the-political-feminist": 55631,
 "us-federal-department-of-propaganda": 136178, "deejay10": 18000,
 "eat-the-rich": 54000, "keithwashburn": 20000, "moreno-neurospicy-news": 130000,
 "dogman_v1": 21900, "bitchysitch": 9969,
}

def fmt(n):
    # NOTE (2026-10-01): strip the ".0" BEFORE appending the suffix —
    # rstrip after the suffix is a no-op (last char is K/M), which is why
    # "55.0K" survived on the live site.
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}".rstrip('0').rstrip('.') + "M"
    if n >= 1000:
        return f"{n/1000:.1f}".rstrip('0').rstrip('.') + "K"
    return str(n)

def parse_count(s):
    """Parse '498,800 (2026-10-01)' / '~11.7K' / '30,200 followers' -> int or None.
    Rejects non-audience numbers (episodes, members, $/mo, n/a)."""
    if not s: return None
    s = s.strip()
    if re.search(r'episode|member|\$|n/a|unknown|not publicly shown|not verified$', s, re.I):
        return None
    m = re.match(r'~?\s*([\d,]+(?:\.\d+)?)\s*([KMB])?', s)
    if not m: return None
    n = float(m.group(1).replace(',', ''))
    mult = {'K': 1e3, 'M': 1e6, 'B': 1e9}.get((m.group(2) or '').upper(), 1)
    return int(n * mult)

PLAT_NORM = {'tiktok':'tiktok','facebook':'facebook','instagram':'instagram',
             'youtube':'youtube','x':'x','substack':'substack'}
AUDIENCE_PLATFORMS = {'tiktok','facebook','instagram','youtube','x','substack'}

members = []

# ---- 41 existing ----
for c in db41['creators']:
    slug = c['slug']
    total = OLD_TOTALS[slug]
    links = [{"platform": k.capitalize(), "url": v, "status": "confirmed"}
             for k, v in c.get('links', {}).items() if isinstance(v, str) and v.startswith('http')]
    notes = c.get('notes', '')
    m_bio = re.search(r'Bio:\s*([^\n]{20,400})', notes)
    m_cf = re.search(r'Content focus:\s*([^\n]{20,400})', notes)
    sc = scrape.get(slug, {})
    members.append({
        "slug": slug,
        "name": c['name'],
        "handles": {"primary": c.get('handle') or ""},
        "primary_platform": c.get('principal_platform', c.get('primary_platform', '')),
        "propaganda_score": c['propaganda_score'],
        "score_provisional": False,
        "followers_total": total,
        "followers_display": fmt(total) + "+",
        "followers_by_platform": {k: {"count": v, "confidence": "confirmed"}
                                  for k, v in c.get('followers', {}).items()},
        "followers_as_of": c.get('followers_as_of', '2026-10-01'),
        "picture": c.get('picture'),
        "catalog_path": "/" + slug,
        "links": links,
        "key_strengths": sc.get('strengths', []),
        "offer": sc.get('offer', []),
        "bio": sc.get('bio') or (m_bio.group(1).strip() if m_bio else ""),
        "content_focus": m_cf.group(1).strip() if m_cf else "",
        "is_new": False,
    })

# ---- 21 new ----
NEW_NAMES = {
 "@nikalie.monroe": "Nikalie", "@mexiguerita22": "Mexiguerita22",
 "@progressively2026": "realprogressive111", "@therevcoms": "The Revcoms",
 "@itsdewberry": "Dew", "@thatalabamafella": "alabamafella",
 "@official.ghost.of.eli": "Eli Noah", "@combatvetsagainsttrump": "Thomas Sidle",
 "@_dofd": "Defense of Democracy", "@mermaid.tm": "MermaidTM",
 "@jessicacymone": "Jessica Cymone", "@mandifromtheinternet": "mandifromtheinternet",
 "@sajidahtalks2025": "sajidahtalks2025", "@public_enlightenment": "public_enlightenment",
 "@love_and_molotov": "Randi Lisandro", "@thelastcookout": "Liv2bgr8",
 "@an_iowan": "An_Iowan", "@splashofgenz": "Emily Ann Gregson",
 "@sissyfits": "Sissyfits", "@worlds_strongest_mayo": "worlds_strongest_mayo",
 "@vandala_effect": "Bella Vandala",
}
NEW_SCORES = {
 "@nikalie.monroe": 9.1, "@mexiguerita22": 9.2, "@progressively2026": 8.9,
 "@mandifromtheinternet": 8.6, "@vandala_effect": 8.6, "@itsdewberry": 8.5,
 "@thatalabamafella": 8.5, "@therevcoms": 8.4, "@mermaid.tm": 8.3,
 "@official.ghost.of.eli": 8.2, "@jessicacymone": 8.1,
 "@combatvetsagainsttrump": 8.1, "@_dofd": 8.0, "@public_enlightenment": 7.9,
 "@love_and_molotov": 7.9, "@an_iowan": 7.8, "@thelastcookout": 7.8,
 "@sajidahtalks2025": 7.8, "@splashofgenz": 7.7, "@sissyfits": 7.7,
 "@worlds_strongest_mayo": 7.6,
}

# Manual follower total overrides (verified combined reach from user research,
# where URL-backed platform sums undercount). Format: tiktok_handle -> total.
FOLLOWER_OVERRIDES = {
 "@_dofd": 74600,  # 2026-10-01: TikTok 47.2K + IG ~11.7K + FB ~11.3K + X ~4.4K
}

def slugify(handle):
    s = handle.lower().lstrip('@').replace('.', '-').replace('_', '-')
    s = re.sub(r'-+', '-', s).strip('-')
    return s or 'member'

for c in cands['candidates']:
    t = c.get('tiktok', '')
    slug = slugify(t)
    plat_counts = {}
    links = []
    handles = {}
    for l in c.get('links', []):
        plat = PLAT_NORM.get((l.get('platform') or '').lower(), (l.get('platform') or '').lower())
        url = (l.get('url') or '').strip()
        if not url.startswith('http'):
            continue  # never invent URLs; skip non-URL entries
        links.append({"platform": plat.capitalize(), "url": url,
                      "status": l.get('status', 'unverified')})
        n = parse_count(l.get('followers'))
        if n and plat in AUDIENCE_PLATFORMS and plat not in plat_counts:
            plat_counts[plat] = {"count": n, "confidence": l.get('status', 'unverified')}
        mm = re.search(r'(?:tiktok\.com/@|instagram\.com/|youtube\.com/@)([\w.\-]+)', url)
        if mm and plat in ('tiktok', 'instagram', 'youtube') and plat not in handles:
            handles[plat] = '@' + mm.group(1)
    total = sum(v['count'] for v in plat_counts.values())
    # Apply manual override if present (verified combined reach)
    t_handle = c.get('tiktok', '')
    if t_handle in FOLLOWER_OVERRIDES:
        total = FOLLOWER_OVERRIDES[t_handle]
    primary = 'tiktok' if 'tiktok' in plat_counts else (next(iter(plat_counts), 'tiktok'))
    cf = c.get('content_focus', '')
    wsf = c.get('why_slr_fit', '')
    strengths = [
        f"{fmt(total)} combined audience (verified 2026-10-01)",
        cf[:160],
        wsf[:160],
    ]
    # Generate "What they offer" showcase from content focus and strengths
    disp_name = NEW_NAMES.get(t, c.get('display_name', t))
    offer_items = []
    if cf:
        offer_items.append(cf[:200])
    if len(strengths) > 1 and strengths[1] and strengths[1][:200] not in offer_items:
        offer_items.append(strengths[1][:200])
    if len(strengths) > 2 and strengths[2] and strengths[2][:200] not in offer_items and len(offer_items) < 2:
        offer_items.append(strengths[2][:200])
    offer_items.append(f"{fmt(total)} audience in the Sick Left Radicals amplifier — {primary.capitalize()} native, leftist to the bone")
    members.append({
        "slug": slug,
        "name": disp_name,
        "handles": handles or {"primary": t},
        "primary_platform": primary.capitalize(),
        "propaganda_score": NEW_SCORES[t],
        "score_provisional": True,
        "followers_total": total,
        "followers_display": fmt(total),
        "followers_by_platform": plat_counts,
        "followers_as_of": "2026-10-01",
        "picture": c.get('picture'),
        "catalog_path": "/" + slug,
        "links": links,
        "key_strengths": strengths,
        "offer": offer_items[:3],
        "bio": (c.get('platform_summary', '') + ' ' + cf).strip(),
        "content_focus": cf,
        "is_new": True,
    })

# ---- validate ----
slugs = [m['slug'] for m in members]
assert len(members) == 62, f"expected 62 members, got {len(members)}"
assert len(set(slugs)) == 62, "duplicate slugs!"
for m in members:
    assert m['followers_total'] > 0, f"no followers for {m['slug']}"
    assert 7.6 <= m['propaganda_score'] <= 9.8, f"score out of range {m['slug']}"
    if not m['links']:
        print(f"WARNING: no links for {m['slug']} (known dead end, kept)")
    assert m['catalog_path'].startswith('/'), m['slug']

out = {
    "meta": {
        "version": "2026-10-02",
        "total_members": 62,
        "existing": 41,
        "new": 21,
        "source": "creators-db.json (41, group C enriched) + slr-missing-candidates.json (21 approved)",
        "catalog_scrape_applied": bool(scrape),
        "rules": ["followers_total is the single numeric audience field (counted once)",
                  "new members carry provisional scores 7.6-9.8",
                  "no guessed URLs; links tagged confirmed/probable/unverified"],
    },
    "members": members,
}
# ---- SEO enrichment (2026-10-02): titles, descriptions, alt text, freshness ----
# NOTE: meta_descriptions.json lives OUTSIDE the repo (see SEO_META_PATH).
# A missing file used to fail SILENTLY — every member got an empty
# seo_description and nobody noticed. Now: LOUD failure by default;
# --allow-missing-seo documents the fallback (explicit, logged).
_seo_metas = {}
if os.path.exists(SEO_META_PATH):
    try:
        _seo_metas = {m['slug']: m['meta_description'] for m in
                      json.load(open(SEO_META_PATH))}
    except Exception as e:
        sys.exit("FATAL: could not parse SEO meta file %s: %s" % (SEO_META_PATH, e))
elif ARGS.allow_missing_seo:
    print("WARNING: SEO meta file missing (%s); proceeding with EMPTY "
          "seo_description for all members (--allow-missing-seo)." % SEO_META_PATH)
else:
    sys.exit(
        "FATAL: SEO meta file not found: %s\n"
        "  A regen without it would silently blank seo_description for all 62 members.\n"
        "  Pass --allow-missing-seo to proceed anyway (explicit, logged)." % SEO_META_PATH)
for _m in members:
    _name = _m.get('name', '')
    _slug = _m.get('slug', '')
    _full_title = f"{_name} | Sick Left Radicals | MTCSTW"
    # Keep titles <=60 chars for SERP display: drop the middle segment for long names
    _m['seo_title'] = _full_title if len(_full_title) <= 60 else f"{_name} | MTCSTW"
    _m['seo_description'] = _seo_metas.get(_slug, '')
    _cf = (_m.get('content_focus') or '').strip()
    if len(_cf) > 70:
        _cf = _cf[:70].rsplit(' ', 1)[0] + '...'
    _m['image_alt'] = f"{_name}, {_cf} — Sick Left Radicals" if _cf else f"{_name} — Sick Left Radicals creator"
    _m['content_updated'] = '2026-10-02'
# ---- DIFF GATE (2026-10-04): the regen must produce zero unexpected diffs
# vs the committed master. Any diff is treated as a probable hand-patch
# that the regen would revert — the script prints a per-field summary and
# refuses to write. --force / -y is the explicit-approval escape hatch. ----
def _norm(o):
    return json.dumps(o, ensure_ascii=False, sort_keys=True)

def _diff_summary(regen, committed, limit=25):
    """Per-field diff of regen vs committed master. Returns (lines, n_members)."""
    lines, n = [], 0
    cm = {m['slug']: m for m in committed.get('members', [])}
    rm = {m['slug']: m for m in regen.get('members', [])}
    if set(cm) != set(rm):
        lines.append("  slug set changed: only-in-committed=%s only-in-regen=%s"
                     % (sorted(set(cm) - set(rm)), sorted(set(rm) - set(cm))))
    for slug in sorted(set(cm) & set(rm)):
        a, b = cm[slug], rm[slug]
        if a == b:
            continue
        n += 1
        if n > limit:
            continue
        lines.append("  [%s]" % slug)
        for k in sorted(set(a) | set(b)):
            if a.get(k) != b.get(k):
                va = json.dumps(a.get(k), ensure_ascii=False)[:160]
                vb = json.dumps(b.get(k), ensure_ascii=False)[:160]
                lines.append("    %s:\n      committed: %s\n      regen:     %s" % (k, va, vb))
    if n > limit:
        lines.append("  ... and %d more member(s) with diffs" % (n - limit))
    if committed.get('meta') != regen.get('meta'):
        lines.append("  meta committed: %s"
                     % json.dumps(committed.get('meta'), ensure_ascii=False)[:200])
        lines.append("  meta regen:     %s"
                     % json.dumps(regen.get('meta'), ensure_ascii=False)[:200])
    return lines, n

out_path = os.path.join(HERE, 'slr-master-db.json')
if os.path.exists(out_path):
    committed = json.load(open(out_path))
    if _norm(committed) != _norm(out):
        diff_lines, n_members = _diff_summary(out, committed)
        print("DIFF GATE: regen differs from the committed master "
              "(%d member record(s) + meta check). REFUSING TO WRITE." % n_members)
        print("  These diffs are probably hand-patches a regen would revert:")
        for dl in diff_lines:
            print(dl)
        if not ARGS.force:
            print("\n  No files were written. Re-run with --force / -y for EXPLICIT "
                  "APPROVAL to overwrite, or sync the hand-patches into this "
                  "script's source inputs first.")
            sys.exit(1)
        print("\n  --force given: EXPLICIT APPROVAL recorded — overwriting the "
              "committed master.")
    else:
        print("DIFF GATE: regen is identical to the committed master. Writing.")
else:
    print("DIFF GATE: no committed master found (first build) — writing initial output.")

json.dump(out, open(out_path, 'w'), indent=2, ensure_ascii=False)
print(f"wrote {out_path}: {len(members)} members, scrape overlay: {bool(scrape)}")
print("new slugs:", ", ".join(sorted(slugify(c.get('tiktok','')) for c in cands['candidates'])))

# ---- generated snapshot embedded in the site bundle ----
# core/07-slr-db-data.js is GENERATED — never hand-edit. It lets 07-slr-db.js
# populate PF.ROSTER / PF.slrAll() synchronously at load (no async race for
# the existing synchronous game consumers). The JSON above stays the source
# of truth; rebuild after any edit.
# 2026-10-04: writes to the SERVED tree (was: stale v1.4.2/ path). Both
# writes are covered by the diff gate above — a gated regen never half-writes.
data_js = ("/* GENERATED by src/data/build-master-db.py — do not hand-edit. "
           "Rebuild after editing slr-master-db.json. */\n"
           "window.PF_SLR_DB_SNAPSHOT = " + json.dumps(out, ensure_ascii=False) + ";\n")
data_path = os.path.normpath(os.path.join(HERE, '..', '..', SERVED_VERSION, 'core', '07-slr-db-data.js'))
open(data_path, 'w').write(data_js)
print(f"wrote {data_path} ({len(data_js)//1024} KB)")
