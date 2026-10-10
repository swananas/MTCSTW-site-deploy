# WS-2 FE Audit — "Zuck Butter Pass" (dir-20261010-010114-12003)
Date: 2026-10-10 ~02:00 CDT | Worker: fe-zuckbutter-20261010
Branch: `fe/zuck-butter-20261010` @ 1a4de807 (origin/integrate/big-update-fe, verified via ls-remote)
Status of WS-1: PROPOSAL NOT YET APPROVED — no repo code written (proposal-first rule). This audit is the gate input.

## Issue 1 — Feed interactions clunky (cards, taps, expands)
INVENTORY (all verified in tree):
- THE ROBBERY REPORT cards (`v1.4.3/core/robreport.js`): ONE outrage figure rendered static
  (not tappable); card actions = 3 text links (share, report price, follow money).
  `details > summary` for "receipts & the math" = native instant snap — no expand animation,
  no tap feedback, no animated marker.
- Basket cards: per-item rows static `<li>`; qty NOT manipulable (can't model "I buy 2x").
- No filters / sort / search on the feed. One click handler total in robreport.js (share).
- Button butter polish exists (`44-button-butter.css`, `43-butter-polish.css`: :active scale(.97))
  but feed cards, summaries, and text CTAs have NO press state.
- Shell loads games bundles SEQUENTIALLY and awaited (build-shells.py: `await load` in a loop)
  — mount latency is serialized, not parallel.
- Yesterday's sibling motion modules are NOT on this line: `45-zuck-dopamine.js` (press scale,
  ink ripple, launch burst) and the `fe-zuck-butter-20261009` shell transitions (.34s mount
  crossfade, skeleton morph) — that branch is under F-061 HOLD (stale base 45eaa40).

## Issue 2 — Facts not malleable (every number tappable → explorable/filterable/manipulable)
GAPS:
- Karl answers (`karl-page.js`): fact cards static; numbers NOT tappable; source stamps are
  plain text (not links, not expandable); no per-fact drill-down ("why this number").
- Robbery report: take figure static; value-chain segments static (no tap-to-isolate a segment);
  basket qty fixed — no "what if I bought N" manipulator.
- Inflation checkin exists on /economy (user-submitted prices → people's CPI) but is not wired
  into feed cards — no "your price vs their take" loop.
- karl_query backend contract (per sitekit scaffold): public GET, rate-limited, NO_PROSE —
  FE composes cards from facts. Good substrate for a fact-drawer.
- CONTRACT DRAFT: see `audit/explorable-data-contract-draft-20261010.md` (fact-tap API,
  co-owned with WS-3 Backend lead; alignment pending).

## Issue 3 — Karl output clunky on the /karl page
- Full `host.innerHTML` re-render on every query (hero + answer rebuilt) — focus loss, jank,
  no optimistic UI.
- Loading = generic "Querying the rails…" shimmer; no staged progress, no recent-query chips
  during load.
- SHELL DEFECT: `site/karl/index.html` topbar uses `position:sticky` + `backdrop-filter:blur`
  — the exact pattern the karl-home design sign-off BANNED (iPhone defect; solid sticky required).
- Corruption-card buttons refire queries (good explorability seed); deep-link doors to Receipt
  dossiers / town reports exist (good). Sources = text stamps, not tappable.
- `karl-embed.js` (19.6KB) + `karl-companion.js` (42KB floating button); companion superseded
  on `/` per karl-home sign-off, retained for deep pages.

## Issue 4 — Dead links (rebuild or redirect per WS-5 link map)
- Static scan: 105 HTML shells / 1349 internal refs → ZERO dead at file level.
- JS-rendered dead paths (3, all verified missing as `site/<path>`):
  1. `/academy` — 20-nextop.js TRAIN CTA, 30-hud.js next-op, karl-muse.js theory link
     (Academy is a parked concept; OPEN item in memory).
  2. `/poster-forge` — games/creator-assist.js "OPEN POSTER FORGE" anchor (poster-forge is a
     gotoSilo WORKSHOP id on /create, not a route — href is wrong).
  3. `/privacy` — 16-footer.js footer link (no privacy page exists).
- WS-5 Site Integration link map: NOT YET DELIVERED — this inventory feeds it.

## Payload budget (standing QC gate: 220KB gzip homepage blocking set)
- Homepage (`/`) blocking set at base head: 260KB gzip — **40KB OVER budget**.
  (shell 2.3 + bundle-styles 30.1 + bundle-core-slr 161.4 + games sec1 25.9 + userdash 25.0
  + bundle-pages-home 15.5). Games load sequentially (awaited) — parallelizing load ≠ removing
  weight; budget fix needs 'don't kill, just move' (lazy/defer).
- verify-built-bundles: 184/184 PASS at base head.

## Sibling-branch review (yesterday's butter pass)
- `origin/fe-zuck-butter-20261009` @ a3383b3: 1 commit, 36 files (34 route shells +
  build-shells.py + sw.js + version.json). Reusable: parallel bundle fetch template, .34s mount
  transitions, :active tap feedback, skeleton shimmer + crossfade. STATE: F-061 HOLD — stale
  base 45eaa40 predates the referral-XSS fix; NOT merged; do not build on top blindly.
  Forward-port of its shell mechanics onto the fresh line is the intended path.
- `origin/fe/butter-pass` @ d62e8ba7 (2026-10-08, CEO-ordered visual upgrade): already merged
  ancestor of the line (174 commits behind tip) — its content is in the tree; nothing to port.

## Build readiness
Blocked on: (a) WS-1 proposal approval; (b) WS-5 link map (rebuild/redirect calls for the
3 dead paths); (c) WS-3 alignment on the explorable-data contract. Engels muse consulted
pre-work: 0 whispers (empty diff, expected). No deploys (freeze).
