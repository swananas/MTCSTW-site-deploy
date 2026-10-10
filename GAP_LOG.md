# IMPROVEMENT LOOP — Live Gap Log
**Workstream:** ws-imp-loop-design-map-20261010 (Design Team lead) · **Directive:** dir-20261010-021948-6267
**Audited tree:** deploy-repo integration tip `ux/feed-destinations-20261010` @ `622be7c0` (post tonight's merges: butter-fullsite, beefy-feed, weave-spine, karl-homepage, pillar rebuilds, feed-destinations)
**Updated:** 2026-10-10 ~05:00 CDT · **Status:** PASS 2 complete (Karl surfaces, modeling apps, catalog, dashboard, standalone feed, arcade). Pass 3 queued: re-verify + any new FE workstream output.

Severity: **P0** = dead end / broken promise (user taps, nothing real happens). **P1** = butter-bar miss on a shipped surface. **P2** = missing Blossom cross-link (surface works but sits isolated).

## OPEN

| ID | Sev | Surface | Gap | Next logical destination that's missing | Owner |
|---|---|---|---|---|---|
| G-D1 | P0 | /sick-left-radicals (CONNECT) | Roster cards expand-only; slugs in data but **no link to catalog pages** (`d.onclick` toggles open; zero catalog hrefs in shell). The old roster's VIEW HERE convention was lost in the rebuild. | → `/<slug>` catalog deep page | FE pillars-feed |
| G-D2 | P0 | /cells (COORDINATE) | "FIND YOUR CELL" CTA → `/karl/?q=How do I join a cell` — a query, not a destination. User looking for a cell gets an answer card, not a cell directory/app. | → real cells surface (verify bundle-cells.js mount; else build one) | FE pillars-feed |
| G-D3 | P1 | /create (CREATE) | Hub lists 3 doors (Karl / roster / feed) — **/fact-generator, /story-remixer, poster-forge unreachable from the Create hub** (G2.3 carried forward, still open after rebuild) | → `/fact-generator`, `/story-remixer`, poster-forge | FE pillars-feed |
| G-D4 | P2 | /money (CAPITAL) | Rails link only to Karl queries; **no "Form a cell around this cause" / "Make propaganda about this"** CTAs (G5.1 carried forward) | → /cells, /create | FE pillars-feed + Design |
| G-D5 | P2 | /money (CAPITAL) | Rail figures ($6.45T, $12.7B, 335, 71, 60) are plain text — **not tappable**; no drill path into the data (G1.2 carried forward; homepage has data-fig+drillSheet, pillars don't) | → drill-down sheet / modeling deep pages | FE pillars-feed |
| G-D6 | P2 | /sick-left-radicals (CONNECT) | Roster index has no Money/Cells/Create CTAs per entry (G5.2 carried forward) — depends on G-D1 first | → catalog (then its CTAs) | FE pillars-feed |
| G-D7 | P1 | All 4 pillar shells | **Butter-lite missing:** no ink ripple (bundle-core not loaded), mount `rise` animation replays on every load (spec: first-paint-only) and has **no `prefers-reduced-motion` guard**, no skeleton on async `karl_stats` fetch (money page number swaps silently), no kill switch on inline JS | butter-lite snippet | FE pillars-feed |
| G-D8 | P1 | Homepage (site/index.html) | Butter present (toast, press states, data-fig+inline drill sheet, 7 destinations) but **no ripple, no skeleton, no `prefers-reduced-motion` guard**; homepage ships zero core JS by design (perf) so it can't inherit 45-butter-sitewide | inline ripple + reduced-motion guard | FE homepage |
| G-D9 | P2 | Homepage feed cards | SAVE writes **localStorage only** (`kh_saved_v1`); backend `POST /api/feed/save` (WS-2/WS-1, be/feed-dest-apis-20261010) exists — FE not wired to it yet. Saved cards don't survive devices. | → POST /api/feed/save w/ device id | FE homepage (coord fe-feed-dest-wire) |
| G-D10 | P2 | Pillar shells | Weave-spine (WS-C) injects feed rails + `← THE ROBBERY REPORT` on **bundle-core pages only** — pillar shells load no core JS, so the spine never lands there. (They do have manual feed-link cards back to `/` — partial.) | verify; may be fine as-is | FE pillars-feed |

## CARRIED FORWARD from blossom-wiring-gaps.md (verified still open tonight)
- G1.2: no drill on /economy, /peoples-cpi, /dossier, /corruption-index, /follow-the-money apps — **OPEN** (apps not re-audited yet; Pass 2)
- G1.3/G3.2: Propaganda Feed (`games/feed.js`) SHARE & PUMP only — **OPEN** (Pass 2)
- G2.1: Dossier Builder zero links to /create, /karl, /money, /cells, /feed — **OPEN** (Pass 2)
- G2.2: /town, /peoples-cpi, /corruption-index share CTAs but no create-tool route w/ preloaded data — **OPEN** (Pass 2)
- G3.1: no create tool posts into review pool/feed — **OPEN** (L, Backend Pod)
- G4.1: /karl page query dead end — **OPEN** (Pass 2)
- G4.2: deep data apps lack Ask-Karl CTA — **OPEN** (Pass 2)

## CLOSED / PARTIALLY CLOSED by tonight's merges (verified on tip)
- G1.1 (hub feed-link sections → deep drills): **PARTIAL** — pillar feed-link cards now route to `/karl/?q=` deep queries (a real drill path via Karl) but not to modeling deep pages
- Homepage feed → 7 destinations (expand, drill-down, share image, go deeper, related, save, methodology): **CLOSED** on homepage cards (622be7c0) — all hit real APIs, no mocks
- WS-A butter (45-butter-sitewide + 46-drill-sheet): **CLOSED** on bundle-core pages; corridor pages (corruption-index, slr-catalog, peoples-cpi) upgraded
- WS-C weave spine: **CLOSED** on bundle-core pages (rail + `← THE ROBBERY REPORT`)

## PASS 2 (2026-10-10 ~05:00 CDT)

| ID | Sev | Surface | Gap | Next logical destination that's missing | Owner |
|---|---|---|---|---|---|
| G-K1 | P2 | /karl page | Answers render GO DEEPER doors (backend `r.related`) + MAKE SHAREABLE ✅ (G4.1 partial) — but **no live discovery rails on the page**; a user with no question sees an empty composer. Answer figures not tappable (0 data-pf-fig). | → discovery rails (karl_feed contract); figures → drill sheet | FE homepage |
| G-K2 | P1 | /karl page | Butter via bundle-core ✅ (ripple, skeletons, kill) — figures excluded from drill convention | data-pf-fig on answer figures | FE homepage |
| G-M1 | P2 | /economy, /dossier, /corruption-index, /peoples-cpi | **0 karl refs, 0 drill, 0 data-pf-fig** — drill-sheet + explore infra sits unused on the page (G1.2/G4.2 carried, confirmed on tip) | figures → drill sheet (works today); Ask-Karl CTA | FE pillars-feed |
| G-M2 | P2 | /dossier | Most isolated surface confirmed: 0 links to /create, /karl, /money, /cells, /feed (G2.1) | → "Turn into propaganda" → /create?case= | FE pillars-feed |
| G-M3 | P2 | /town | Best-wired (drill 6, karl 3) but 0 /create (G2.2), 0 data-pf-fig | → create w/ preloaded data | FE pillars-feed |
| G-F1 | P2 | Propaganda Feed (games/feed.js) | SHARE & PUMP only — 0 /karl, 0 drill, 0 /create (G1.3/G3.2 confirmed) | → drill + remix per card | FE pillars-feed |
| G-C1 | P1 | Catalog pages (/<slug>) | OUT links survive (bundle-pages.js CTAs ✅); **IN broken** — roster no longer links (G-D1); no return link to /sick-left-radicals on catalog pages; no catalog↔catalog cross-links | → P-001 + P-011 | FE pillars-feed |
| G-X1 | — | Cells app (bundle-cells.js), poster-forge | Mount surfaces not found in audited shells — FE to verify canonical routes (carried in P-002/P-005) | verify | FE |

## CLOSED in Pass 2
- Dashboard (user-dashboard.js): well wired (karl 44, /create 3, /cells 2, INTEL grids) — no gaps filed.
- /follow-the-money → 301-style redirect to /money (canonical) — wired, not a dead end.
- 5/6 modeling shells load bundle-core → butter engine + weave spine + drill-sheet infra present on town/economy/dossier/corruption-index/peoples-cpi.
- /karl answers: GO DEEPER + MAKE SHAREABLE now render (G4.1 partial — was fully open at wiring-gaps audit).

## Notes
- Pillar shells are standalone (5–24KB, inline CSS/JS, zero external scripts) — deliberate perf choice; butter must ride inline, not via bundle-core.
- Catalog deep pages (`site/<slug>/`) exist with canonical `https://www.mtcstw.com/<slug>` — the roster just doesn't link them.

## PASS 3 (2026-10-10 ~06:00 CDT) — money apps, cells app, war surfaces, design review
- **G5.1 CONFIRMED on tip:** bundle-bank.js + bundle-ventures.js — 0 /cells, 0 /create, 0 /karl links (share + JOIN THE FIGHT present); bundle-warchest.js — 1 /cells link, 0 /create. All three shells (site/bank, site/ventures, site/war-chest) load bundle-core. → P-003 scope extends to money apps: add Cells/Create CTAs in-app, not just the /money shell.
- **Cells app (bundle-cells.js):** has /cells:1, /create:1, /karl:0 links internally — app-to-app wiring partial; mount shell unlocated (G-X1 carried).
- **War surfaces** (site/war-report, site/war-room — 9KB shells): pillar nav only; content via bundles (not deep-audited this pass).
- **Games sampled:** 127 game files reference callsign claim flow; 57 carry JOIN THE FIGHT; 33 use navigator.share — no systemic gap; game-level butter rides bundle-core.
- **DESIGN REVIEW filed:** Robbery Report reimagine spec §5 APPROVED with R1–R7 (DESIGN_REVIEW_ROBBERY_REIMAGINE.md).
