# BLOSSOM CROSS-POLLINATION WIRING MAP
**Workstream:** ws-imp-loop-design-map-20261010 · **Directive:** dir-20261010-021948-6267
**Extends:** `~/workspace/specs/blossom-wiring-gaps.md` (the 10-item prioritized queue — carried forward, not redone) and `~/workspace/specs/blossom-cross-pollination-adoption.md` (§3 checklist).
**Updated:** 2026-10-10 ~04:10 CDT · **Tree:** `ux/feed-destinations-20261010` @ `622be7c0`.

## What tonight's merges changed in the graph

| Blossom chain | Tonight's delta | Net effect |
|---|---|---|
| Feed → Modeling (drill) | Homepage: 7 wired destinations (expand, drill-down, share image, go deeper, related, save, methodology) on every feed card; beefy feed rail deep-links; inline drill sheet (data-fig) | **Homepage leg CLOSED.** Deep-app legs still open (G1.2). |
| Modeling → Create | (none tonight) | G2.1 (Dossier), G2.2 (town/cpi/corruption) still open |
| Create → Feed | (none tonight) | G3.1 still open (L, Backend Pod) |
| Karl → Feed → Deep → Karl | /karl/?q= bridges on all 4 pillar pages (5+2+2+2 deep queries); Karl homepage = homepage itself now | Pillar legs are **bridge-only** — Karl answers don't route onward (G4.1), so the chain dead-ends at the answer. Deep pages lack Ask-Karl (G4.2). |
| Roster → Money → Cells → Create → Feed → Roster | Pillar rebuild wired nav + Karl bridges on all four; catalog pages retain full CTAs | **Broken at 2 joints:** roster→catalog links lost in rebuild (G-D1); money→cells/create missing (G-D4/G5.1); cells CTA is a query not a destination (G-D2); create hub missing its own tools (G-D3/G2.3) |

## New wiring introduced tonight (verify in Pass 2)
1. **Weave spine (WS-C):** `FROM THE FEED / RELATED ROBBERIES` rail + `← THE ROBBERY REPORT` on every **bundle-core** page. Pillar shells load no core JS → spine doesn't reach them (G-D10; they have manual feed-link cards instead — acceptable, but note the two-tier system).
2. **karl_feed (BE, WS-B-BE):** 9-rail home feed contract (`?action=karl_feed`) — server-side Karl inference leads + 18-slot curated rotation. FE landed on homepage; **the standalone Propaganda Feed (`games/feed.js`) is not on this contract** — G1.3/G3.2 open.
3. **feed-dest APIs (BE WS-1/WS-2):** evidence, drill, compare, related, save, follow-topic, alert, share (+share-image). FE homepage landed 7 of these inline; **save/alert are localStorage-only on FE** — server POSTs (`/api/feed/save`, `/api/feed/alert`, `/api/feed/follow-topic`) unwired (G-D9).
4. **Explore layer (BE WS-3):** `?action=explore_catalog` + `?action=explore_fact` — tappable-number index over 14 datasets. FE contract co-sign pending — **no surface consumes it yet**; this is the future drill backend for G1.2/G-D5.

## Revised priority queue (Blossom lens, design-owned first)
1. **G-D1** roster→catalog links (P0) — restores the Roster→…→Roster loop's entry joint. FE pillars-feed. → Proposal P-001.
2. **G-D3** create hub lists all tools (P0-adjacent) — un-breaks Create's IN from its own suite. FE pillars-feed. → P-002.
3. **G-D2** cells CTA → real destination (P0) — Coordinate must land somewhere. Verify bundle-cells mount first. → P-005.
4. **G-D4** money→cells/create CTAs (P2) — Money never sits alone. FE pillars-feed + Design. → P-003.
5. **G-D5** tappable figures on /money (P2) — Modeling→Create chain needs the drill entry. FE pillars-feed. → P-004 (with butter-lite).
6. **G-D7/G-D8** butter-lite on pillars + homepage (P1) — ripple, reduced-motion, skeletons; inline, budget-safe. → P-004, P-006.
7. **G-D9** save→server POST (P2) — Feed persistence across devices. FE homepage, coord fe-feed-dest-wire. → P-007.
8. G4.1 /karl page onward routing (M) — Pass 2 verify, then proposal.
9. G1.2 deep-app drill (M) — explore layer is the backend; needs FE design once contract co-signed.
10. G3.1 create→pool→feed (L) — Backend Pod; Design input on submit UX when specced.

## Checklist compliance note (per adoption spec §3)
Tonight's pillar rebuild ships: IN-links ✅ (nav + homepage), OUT-links ⚠️ (Karl bridges only — check #1 technically passes "at least one OUT" but #12 retro-review would flag the missing deep-page/modeling links), Karl-wired ✅, share CTA ⚠️ (no share actions on pillars at all — #5 not violated, just absent), no-mocks ✅ (all links real), budget ✅ (5–24KB shells), loop-law ✅ (inform+CTA present, payoff = Karl answer). **Design verdict: shippable skeleton, but G-D1 is a P0 regression that must be fixed before the loop's "no dead ends" bar is met.**
