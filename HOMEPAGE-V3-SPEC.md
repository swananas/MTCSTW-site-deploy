# Homepage Redesign v3 — "Unclunk" Spec

**CEO directive 2026-10-07:** 30 widgets → 5-7 blocks. Each widget MOVES to a dedicated page or INTEGRATES into a consolidated block. Nothing orphaned.

**Audit:** `~/workspace/hidden/homepage-audit-20261007.md`

## New homepage structure (7 blocks)

| # | Block | Silo | Action |
|---|---|---|---|
| 1 | HERO | `hero` (NEW) | Static template in home-v2.js. H1 "JOIN THE PROPAGANDA FACTORY", one subhead, one CTA "CLAIM YOUR CALLSIGN →". |
| 2 | Network pulse | `socialproof` | KEEP. Absorb do-meter's headline number as an extra stat in the bar. |
| 3 | Daily briefing | `brief` | KEEP. Absorb civicsnap as one inline line. |
| 4 | Daily orders | `daily-orders` | KEEP. Absorb: dopa (loot claim button inline), enlistment-ranks (compact rank strip), referral (recruit nudge link). |
| 5 | Find your match | `slr-match-quiz` | KEEP (slim teaser). Absorb roster-teaser's CTA as "Meet all 62 fighters →" link. |
| 6 | Fan vote | `fan-vote` | KEEP. Absorb: hall (winners strip inline), draw (pot total line inline). |
| 7 | Explore | `closer` (NEW) | Static template in home-v2.js. Link-card grid to dedicated pages. Replaces sitemap. |

## SECTIONS (simplified)

Replace 7 funnel sections with 3 flow groups. NO "Section N of 7" kickers, NO rules — just clean titles.

- `start`: hero, socialproof, brief → `games/bundle-sec1.js` (critical, ~24KB gzip)
- `discover`: daily-orders, slr-match-quiz → `games/bundle-home.js` (lazy, 800px IO pre-load)
- `proof`: fan-vote, closer → `games/bundle-home.js` (lazy)

## Widget disposition map

**INTEGRATE (absorbed into parent blocks):**
- do-meter → socialproof (headline "X tasks complete" as bar stat)
- civicsnap → brief (one inline line)
- dopa → daily-orders (loot claim button)
- enlistment-ranks → daily-orders (compact rank strip)
- referral → daily-orders (recruit nudge link)
- roster-teaser → slr-match-quiz ("Meet all 62 →" link)
- hall → fan-vote (winners strip)
- draw → fan-vote (pot total line)
- sitemap → closer (directory function replaced by link grid)

**MOVE (full version lives on dedicated page; removed from homepage ORDER):**
- hq-nudge → /request-access (card in closer)
- spotlight, infighting → /arcade
- cells → /cells
- poster-forge, feed → /create
- quartermaster, war-bonds → /bank
- inflation-teaser → /economy
- ritual-calendar → /money
- campaign, fb-missions → /events (cards in closer)
- alerts → /political-hq
- warreport-card → /war-report
- podcast-card → closer (media link)
- bluesky → /sick-left-radicals (card in closer)

**KEEP as-is:**
- mountEventsNudge (static nudge card, already minimal)

## The 5 fixes

### 1. Hero with H1
New `hero` template in home-v2.js, mounted first. Static HTML (works without JS per audit #6 — actually it IS JS-injected; see note below).
- H1: "JOIN THE PROPAGANDA FACTORY"
- Subhead: "62 sick radicals. Real data. Daily missions. Enlist in 30 seconds."
- CTA: "CLAIM YOUR CALLSIGN →" → opens callsign claim flow
- Secondary: "See how it works ↓" → smooth scroll to brief

### 2. Widget consolidation (31 → 7)
Per table above. New ORDER array in home-v2.js. NEXT_LINKS updated for the 7 blocks.

### 3. API batching (21 → 1-2 calls)
- **Backend:** new `homepage_init` GET action returning `{briefing, orders, stats, tribes, vote, ranks}` in one response.
- **Frontend:** `PF.homepageInit()` helper in core — parallel Promise.all with dedup + 60s cache. Widgets call it; fallback to individual actions if it fails.
- Target: 1 composite call on first load, 1 refresh call max.

### 4. Critical JS <150KB
- **Loader change** (`ship-loader/footer-v147-blossom.html`): remove `isHome` from `NEED_SLR` so homepage loads slim `bundle-core.js` (411KB raw vs 575KB).
- Homepage widgets degrade gracefully on empty roster (verified: all consumers handle `[]`).
- Quiz slim mode needs no DB. Roster-teaser removed (moved).
- **Do NOT break:** /arcade, /create, roster pages keep SLR core.

### 5. Mobile-first
- New `v1.4.3/core/41-mobile-first.css`:
  - All buttons/links: min-height 44px, min-width 44px touch targets
  - Replace fixed max-widths (640/520/420px) with `min(680px, 92vw)` fluid widths
  - Hero stacks vertically; closer grid: 3-col → 2-col → 1-col
  - Homepage-specific overrides only (don't break dedicated pages)
- Mobile nav (15+ items → 5): **Squarespace hand-step**, document in ship notes. Cannot do in repo.

## Files to change

**Frontend (`integrate/big-update-fe`):**
1. `v1.4.3/pages/home-v2.js` — rewrite ORDER/SECTIONS, hero+closer templates, NEXT_LINKS
2. `v1.4.3/games/social-proof.js` — absorb do-meter number
3. `v1.4.3/games/briefing.js` — absorb civicsnap line
4. `v1.4.3/games/daily-orders.js` — absorb dopa/ranks/referral
5. `v1.4.3/games/slr-match-quiz.js` — absorb roster-teaser CTA (slim mode)
6. `v1.4.3/games/fan-vote.js` — absorb hall/draw
7. `v1.4.3/core/41-mobile-first.css` — NEW
8. `ship-loader/footer-v147-blossom.html` — remove isHome from NEED_SLR
9. Rebuild: `games/bundle-sec1.js`, `games/bundle-home.js` via `build/bundle.js`

**Backend (`integrate/big-update`):**
10. New `homepage_init` GET action (composite)

## QC gates
- A: All 7 blocks mount without JS errors; kill switches work
- B: No new auth surface; homepage_init is GET-only, public data
- C: Loader still resolves; no references to removed silos; bundles rebuild clean
- D: Critical JS <150KB gzip; API calls ≤2 on load

## Out of scope
- Dedicated pages (untouched — moved widgets already live there)
- Squarespace nav (hand-step)
- Backend deploy (parent's ship call)
