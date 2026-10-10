# DESIGN PROPOSALS — Improvement Loop Pass 1
**Workstream:** ws-imp-loop-design-map-20261010 · **Directive:** dir-20261010-021948-6267
**Rule:** proposal-first — no repo code without approval. Approved → handed to ws-imp-loop-homepage-20261010 / ws-imp-loop-pillars-feed-20261010.
**Filed:** 2026-10-10 ~04:25 CDT · **Status legend:** PROPOSED / APPROVED / HANDED / BUILT

All proposals: mobile-first, zuck-butter physics (100ms tap / 220ms release / 400ms ripple / reduced-motion honored), condense-don't-cut, per-page payload budget respected (each ≤ ~1KB).

---

## P-001 — Roster cards link to catalog pages (fixes G-D1, P0)
**Surface:** /sick-left-radicals · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** cards expand-only; 62 catalog pages exist but the roster links to none.
**Design:** the name+score row becomes the link (`<a href="/<slug>">`), with a `→` affordance; card-body tap still toggles the bio. Keep search, keep expand. ~200B.
**Blossom:** restores IN-path roster→catalog (check #7); catalog CTAs then carry Money/Cells/Create.
**Status:** PROPOSED — recommend APPROVE (P0 regression).

## P-002 — /create hub lists every create tool (fixes G-D3/G2.3)
**Surface:** /create · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** hub shows 3 doors; /fact-generator, /story-remixer, poster-forge unreachable from it.
**Design:** add 3 `.tool` cards in the existing pattern: Fact Generator → `/fact-generator` ("Turn any claim into a sourced fact card"); Story Remixer → `/story-remixer` ("Remix a story into threads and scripts"); Poster Forge → canonical route TBD (verify mount — homepage CREATE block was replaced in rebuild; game file `games/poster-forge.js` mounts `#pf-poster`, no shell found mounting it — FE to confirm route or re-mount). Keep the 3 existing doors. ~1KB.
**Status:** PROPOSED — recommend APPROVE; poster-forge route needs FE verify (flagged).

## P-003 — /money gets Cells + Create CTAs (fixes G-D4/G5.1)
**Surface:** /money · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** money surfaces sit alone; donor can't form a cell or make propaganda.
**Design:** two-button row under the rails: `FORM A CELL AROUND THIS →` → `/cells`; `MAKE PROPAGANDA ABOUT THIS →` → `/create`. Same `.karl-link` button pattern, second in gold. ~400B. Zero XP, no new copy standards (CTA copy is navigational, not share CTA).
**Status:** PROPOSED — recommend APPROVE.

## P-004 — Pillar butter-lite: tappable figures + reduced-motion + ripple (fixes G-D5/G-D7)
**Surface:** all 4 pillar shells · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** no ripple (bundle-core not loaded), `rise` mount animation replays every load with no reduced-motion guard, rail figures not tappable, money wealth stat swaps silently on fetch.
**Design (one inline snippet, ~1.2KB, shared across the 4 shells):**
- (a) Figures: dotted-underline convention on rail `.n` figures (visual drill affordance; tap behavior = the card's existing Karl deep-query until the drill module loads — no fake affordance, the number already drills via Karl).
- (b) `@media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }` per shell.
- (c) 15-line inline ripple on `.rail/.tool/.feed-card` taps (touch-point origin, 400ms, DOM-removed on animationend; skipped under reduced-motion).
- (d) Money wealth stat: shimmer skeleton until `karl_stats` lands or 800ms → static `$6.5T+` stays as honest fallback (never blank).
- (e) Kill: `?pf_off=lite` guard on the inline script.
**Payload:** shells stay 6–25KB — within budget.
**Status:** PROPOSED — recommend APPROVE.

## P-005 — /cells "FIND YOUR CELL" → real destination (fixes G-D2, P0)
**Surface:** /cells · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** CTA routes to a Karl query, not a cell directory/app.
**Design:** pending FE verification of the cells app mount (`games/bundle-cells.js` mounts `pf-cell-hq` et al — no shell found mounting it in the audited paths). Option A: CTA → verified cell route. Option B (fallback): keep Karl bridge, add `BROWSE OPEN CELLS →` placeholder-free — no dead buttons; if no route exists, the CTA stays Karl until the directory ships (explicit deferral, not a mock).
**Status:** PROPOSED — PENDING-VERIFY (FE to confirm cell app route).

## P-006 — Feed SAVE → server POST (fixes G-D9)
**Surface:** homepage feed cards · **For:** ws-imp-loop-homepage-20261010 (coord fe-feed-dest-wire-20261010)
**Problem:** SAVE is localStorage-only; `POST /api/feed/save` exists (be/feed-dest-apis-20261010).
**Design:** SAVE POSTs `{cardId, callsign?, device}` (stable localStorage uuid per WS-1 contract) → `★ SAVED`; on failure/offline, fall back to localStorage with toast "Saved on this device". No UX change on happy path. Alert/follow-topic wiring rides the same pattern (follow-up proposal after this lands).
**Status:** PROPOSED — recommend APPROVE (check overlap with fe-feed-dest-wire-20261010 first).

## P-007 — Homepage inline ripple + reduced-motion (fixes G-D8)
**Surface:** site/index.html · **For:** ws-imp-loop-homepage-20261010
**Problem:** homepage ships zero core JS (perf) so 45-butter-sitewide never runs: no ripple, no reduced-motion guard on kh animations.
**Design:** port the P-004 ripple snippet inline (~500B) scoped to `.kh-card/.kh-act-btn`; add reduced-motion guard for kh transitions. Homepage stays ~75KB.
**Status:** PROPOSED — recommend APPROVE.

---
**Handoff:** on APPROVAL, each proposal → the named FE workstream as a build directive with the Blossom IN/OUT declared above. P-001 is the P0 — recommend it goes first.
