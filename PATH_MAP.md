# LOGICAL PATH MAP — every surface → its next logical destination
**Workstream:** ws-imp-loop-design-map-20261010 · **Directive:** dir-20261010-021948-6267
**Rule:** every surface must have at least one IN (a real user arrives from somewhere) and one OUT (a real user can go somewhere next). No dead ends. A Karl query is a *bridge*, not a destination — it only counts as OUT if the answer itself routes onward.
**Audited:** 2026-10-10 ~04:10 CDT on integration tip `ux/feed-destinations-20261010` @ `622be7c0`.
Legend: ✅ wired · ⚠️ bridge-only (Karl query) · ❌ dead end / missing

## 1. Homepage — THE ROBBERY REPORT (`/`)
| From (IN) | To (OUT) | Status |
|---|---|---|
| direct, PWA, nav brand | Karl composer (`karl_query` real API) | ✅ |
| | Robbery Report cards → EXPAND / DRILL-DOWN / SHARE IMAGE / GO DEEPER / RELATED / SAVE / METHODOLOGY (7 real destinations) | ✅ |
| | Beefy feed cards → deep pages (rail deep links), tappable figures → inline drill sheet | ✅ |
| | DEPLOY → native share, share CTA standard ('JOIN THE FIGHT.') | ✅ |
| | 4-pillar strip → /create, /sick-left-radicals, /cells, /money | ✅ |
| Feed cards (SAVED tab) | saved view (localStorage only — server POST not wired, see G-D9) | ⚠️ |

## 2. CREATE (`/create`)
| From (IN) | To (OUT) | Status |
|---|---|---|
| homepage strip, pillar nav, Karl DEPLOY | /karl/ (Deploy from Karl) | ✅ |
| | /sick-left-radicals/ (Amplify creators) | ✅ |
| | / (Mine the feed) | ✅ |
| | /karl/?q=… (Fresh ammunition cards) | ⚠️ bridge-only |
| | /fact-generator, /story-remixer, poster-forge | ❌ **G-D3** |
| (IN gap) | No create tool posts back into the feed/pool (G3.1) — the loop's open end | ❌ |

## 3. CONNECT (`/sick-left-radicals`)
| From (IN) | To (OUT) | Status |
|---|---|---|
| homepage strip, pillar nav | search + expandable creator cards | ✅ |
| | /karl/?q=… (ASK KARL ABOUT THE ROSTER, related discoveries) | ⚠️ bridge-only |
| | / (back to Robbery Report) | ✅ |
| | `/<slug>` catalog deep pages | ❌ **G-D1** — slugs exist, no links |
| | Money/Cells/Create CTAs per creator | ❌ **G-D6** (after G-D1) |

## 4. COORDINATE (`/cells`)
| From (IN) | To (OUT) | Status |
|---|---|---|
| homepage strip, pillar nav | 3-step flow: get intel → find people → deploy | ✅ (content) |
| | /karl/?q=How do I join a cell (FIND YOUR CELL) | ⚠️ bridge-only — **G-D2** |
| | /karl/?q=Private prisons (related discovery) | ⚠️ |
| | / (back to Robbery Report) | ✅ |
| | real cell directory / cell app | ❌ **G-D2** |

## 5. CAPITAL (`/money`)
| From (IN) | To (OUT) | Status |
|---|---|---|
| homepage strip, pillar nav | 5 rails → /karl/?q=… (billionaires, enforcement, 13F, insider, interlocks) | ⚠️ bridge-only |
| | ASK KARL ABOUT THE MONEY | ⚠️ |
| | related discoveries → /karl/?q=…, / | ⚠️/✅ |
| | drill into figures (tap $6.45T → composition) | ❌ **G-D5** |
| | "Form a cell around this cause" → /cells | ❌ **G-D4** |
| | "Make propaganda about this" → /create | ❌ **G-D4** |

## 6. Karl (`/karl/`) — Pass 2 (not yet audited tonight)
Carried: answers are a query dead end (G4.1) — no feed cards, no deep-page links on answers. Verify against current tip.

## 7. Modeling deep pages (/town, /economy, /dossier, /corruption-index, /follow-the-money, /peoples-cpi) — Pass 2
Carried: no in-app drill (G1.2), no Ask-Karl CTA (G4.2), town→dossier single link. Verify against current tip (weave-spine should now add feed rail + ← ROBBERY REPORT on bundle-core pages).

## 8. Catalog deep pages (`/<slug>`, 62) — Pass 2
Known-good wiring (per prior audit): FUND THEIR FIGHT → /ventures?creator=, bounties → /create?for=, THEIR TOWN → /town, CREATE FEED → /create#pf-feed?creator=. **IN gap:** roster index no longer links them (G-D1) — verify alternate IN paths survive.

## 9. Propaganda Feed (`games/feed.js`) — Pass 2
Carried: SHARE & PUMP only, zero drill/remix links (G1.3/G3.2). Verify.

## 10. Games / dashboard / user surfaces — Pass 2
Not yet audited tonight.

---
**Dead-end count (Pass 1):** 2 P0 (G-D1 roster→catalog, G-D2 cells CTA), 1 P0-adjacent (G-D3 create tools unreachable), 4 P2 missing cross-links.
**Next pass:** Karl surfaces, modeling apps, games, cells app, catalog IN-paths, dashboard, standalone feed — before 11:00 CDT.
