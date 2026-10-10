# DESIGN PROPOSALS — Improvement Loop Pass 1
**Workstream:** ws-imp-loop-design-map-20261010 · **Directive:** dir-20261010-021948-6267
**Rule:** proposal-first — no repo code without approval. Approved → handed to ws-imp-loop-homepage-20261010 / ws-imp-loop-pillars-feed-20261010.
**Filed:** 2026-10-10 ~04:25 CDT · **Status legend:** PROPOSED / APPROVED / HANDED / BUILT

All proposals: mobile-first, zuck-butter physics (100ms tap / 220ms release / 400ms ripple / reduced-motion honored), condense-don't-cut, per-page payload budget respected (each ≤ ~1KB).

---

## P-001 — Roster cards link to catalog pages (fixes G-D1, P0)
**Surface:** /sick-left-radicals · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** cards expand-only; 62 catalog pages exist but the roster links to none.
**Design:** the name+score row becomes the link (`<a href="/<slug>">`), with a `→` affordance; card-body tap still toggles the bio. Implementation note: the card's `onclick` toggles `.open` — guard with `if(e.target.closest('a'))return` so link taps don't also toggle. Keep search, keep expand. ~200B.
**Blossom:** restores IN-path roster→catalog (check #7); catalog CTAs then carry Money/Cells/Create.
**Status:** PROPOSED — recommend APPROVE (P0 regression).

## P-002 — /create hub lists every create tool (fixes G-D3/G2.3)
**Surface:** /create · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** hub shows 3 doors; /fact-generator, /story-remixer, poster-forge unreachable from it.
**Design:** add 3 `.tool` cards in the existing pattern: Fact Generator → `/fact-generator` ("Turn any claim into a sourced fact card") — verified live shell; Story Remixer → `/story-remixer` ("Remix a story into threads and scripts") — verified live shell; Poster Forge → canonical route TBD (verify mount — homepage CREATE block was replaced in rebuild; game file `games/poster-forge.js` mounts `#pf-poster`, no shell found mounting it — FE to confirm route or re-mount). Keep the 3 existing doors. ~1KB.
**Status:** PROPOSED — recommend APPROVE; poster-forge route needs FE verify (flagged).

## P-003 — /money gets Cells + Create CTAs (fixes G-D4/G5.1)
**Surface:** /money + money apps (/bank, /ventures, /war-chest) · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** money surfaces sit alone; donor can't form a cell or make propaganda. Confirmed on tip: bundle-bank.js + bundle-ventures.js have 0 /cells, 0 /create, 0 /karl links; bundle-warchest.js has 1 /cells link.
**Design:** two-button row under the rails: `FORM A CELL AROUND THIS →` → `/cells`; `MAKE PROPAGANDA ABOUT THIS →` → `/create`. Same `.karl-link` button pattern, second in gold. ~400B. In the money APPS: same two actions as contextual CTAs (e.g., on a venture detail: "Form a cell around this cause" / "Make propaganda about this"). Zero XP, no new copy standards (CTA copy is navigational, not share CTA).
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
**Coordination (2026-10-10 ~05:20 CDT):** `fe/feed-dest-wire-20261010` already wires `/api/feed/save` in bundle-core (46-feed-dest-wire.js) — but the homepage ships zero core JS, so its inline SAVE is a parallel implementation. This proposal is ALIGNMENT, not a new implementation: homepage SAVE must speak the same server contract (same cardId scheme, same device id) so saved state is coherent across surfaces.
**Status:** PROPOSED — recommend APPROVE (check overlap with fe-feed-dest-wire-20261010 first).

## P-007 — Homepage inline ripple + reduced-motion (fixes G-D8)
**Surface:** site/index.html · **For:** ws-imp-loop-homepage-20261010
**Problem:** homepage ships zero core JS (perf) so 45-butter-sitewide never runs: no ripple, no reduced-motion guard on kh animations.
**Design:** port the P-004 ripple snippet inline (~500B) scoped to `.kh-card/.kh-act-btn`; add reduced-motion guard for kh transitions. Homepage stays ~75KB.
**Status:** PROPOSED — recommend APPROVE.

---
**Handoff:** on APPROVAL, each proposal → the named FE workstream as a build directive with the Blossom IN/OUT declared above. P-001 is the P0 — recommend it goes first.

## Pass 2 proposals (2026-10-10 ~05:00 CDT)

## P-008 — Modeling apps: tappable figures + Ask Karl + Dossier→Create (fixes G-M1/G-M2/G-M3/G4.2)
**Surfaces:** /town, /economy, /dossier, /corruption-index, /peoples-cpi · **For:** ws-imp-loop-pillars-feed-20261010
**Design:**
- (a) Mark key figures `data-pf-fig="<value>" data-pf-source="<short source>"` (+ `data-pf-why` where a why-chain exists) — drill sheet opens TODAY (display-only, fail-closed); the explore_fact backend (WS-3) upgrades it to live data later with zero FE rework. ~20 lines/app.
- (b) One `ASK KARL ABOUT THIS ↓` button per app → `/karl/?q=<app-specific query>` (G4.2).
- (c) Dossier Builder: `TURN THIS INTO PROPAGANDA →` → `/create?case=<dossier-id>`; /create shows a "working from dossier" chip when `?case=` present (G2.1). Town/economy/cpi: `MAKE PROPAGANDA FROM THIS ↓` → `/create` (G2.2; preloaded-data handoff is a fast-follow once /create accepts payload params).
**Blossom:** Modeling→Create chain (check #1 both directions: IN from weave rail, OUT to create/Karl).
**Status:** PROPOSED — recommend APPROVE.

## P-009 — /karl page: discovery rails on empty state + tappable answer figures (fixes G-K1/G-K2)
**Surface:** /karl/ · **For:** ws-imp-loop-homepage-20261010
**Design:**
- (a) When no `?q=` and no answer yet, render compact discovery rails reusing the `karl_feed` 9-rail contract (same card renderer as homepage, compact variant) — Karl is never an empty room.
- (b) Mark answer figures `data-pf-fig` → drill sheet (bundle-core already on the page).
**Blossom:** Karl→Feed→Deep→Karl chain (check #2 Karl-wired both directions).
**Status:** PROPOSED — recommend APPROVE.

## P-010 — Propaganda Feed cards: drill + remix (fixes G-F1/G1.3/G3.2)
**Surface:** games/feed.js · **For:** ws-imp-loop-pillars-feed-20261010
**Design:** per card add `DRILL ↓` (→ drill sheet if figure+source known, else `/karl/?q=<poster topic>`) and `REMIX` (→ `/karl/` with the poster as context, ending at MAKE SHAREABLE). Keeps SHARE & PUMP untouched.
**Coordination (2026-10-10 ~05:20 CDT):** `fe/feed-dest-engage-20261010` ships SHARE/ASK/RELATED/TRACK UI in bundle-core — check whether it covers `games/feed.js` cards before building; if yes, this proposal narrows to REMIX-only.
**Status:** PROPOSED — recommend APPROVE.

## P-011 — Catalog return paths + cross-links (fixes G-C1, with P-001)
**Surfaces:** /<slug> catalog pages · **For:** ws-imp-loop-pillars-feed-20261010
**Problem:** catalog pages are 62 hand-maintained static files (not generated — 0 matches in site/build-shells.py); no return link to /sick-left-radicals; no catalog↔catalog cross-links; roster data lives in two places (inlined ROSTER JSON on the SLR shell + 62 separate pages).
**Design:** (a) immediate: add `← ALL 62 RADICALS` return link → /sick-left-radicals on every catalog page; (b) structural (recommended): build a **catalog page generator** — one template + the roster dataset emitting all 62 pages with return links, 2–3 related-creator cross-links (same score band), and the standard CTAs (FUND THEIR FIGHT / bounties / THEIR TOWN / CREATE FEED) baked in. Single source of truth going forward; no more 62-file edits. (c) P-001 (roster→catalog links) is the prerequisite — do that first.
**Status:** PROPOSED — recommend APPROVE (after P-001).

## P-012 — Restore one-prompt onboarding on the new IA (P1, conversion-critical)
**Problem:** the standing one-prompt onboarding (37-one-prompt.js) triggers on `#pf-v2` — removed in the Karl homepage rebuild — and lives in bundle-core, which the homepage + 4 pillar shells don't load. First-time visitors are currently NEVER prompted to claim a callsign. Verified: 0 `#pf-v2` in new site/index.html; 0 claim-prompt UI on all 6 standalone surfaces.
**Design (two parts):**
- (A) Re-key core trigger: `#pf-v2` → `#pf-karl-home` in 37-one-prompt.js (1-line; restores the prompt on bundle-core pages).
- (B) Inline one-prompt-lite on the 5 remaining standalone shells (4 pillars + /karl): same card pattern as the homepage build, ~5s delay, fires only if `!localStorage.pf_oneprompt_v1 && !hasCallsign()`; dismiss/claim sets the flag. Claim CTA → `/arcade/` enlistment flow (canonical per sibling homepage build — see coordination). Kill `?pf_off=oneprompt-lite`. ~1.5KB inline per shell.
**Coordination (2026-10-10 ~06:45 CDT):** ws-imp-loop-homepage-20261010 ALREADY BUILT the homepage one-prompt (fe/imp-loop-homepage-robbery-20261010 @ 907adec4): card → `/arcade/` enlistment, anonymous-only via pf_identity_v1. **Flag divergence:** sibling uses `pf_oneprompt_home_seen`; core uses `pf_oneprompt_v1`. Recommend the sibling's card ALSO read/set `pf_oneprompt_v1` so the re-keyed core module never double-prompts — "once ever" must hold across surfaces. My original /dashboard claim destination is WITHDRAWN in favor of the sibling's /arcade/ route.
**Blossom:** #4 (standard claim flow, not a new mechanism), #6 (shared once-ever flag — no re-prompt).
**For:** ws-imp-loop-homepage-20261010 (A: 1-line core + flag unification) + ws-imp-loop-pillars-feed-20261010 (B: pillar shells).
**Status:** PROPOSED — recommend APPROVE (P1). Homepage part already built by sibling.
