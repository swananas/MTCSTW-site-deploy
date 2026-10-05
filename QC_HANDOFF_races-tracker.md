# QC Handoff — Races Tracker (Political HQ expansion #3)

**Branch:** `fe/races-tracker` (commit `df85704`), pushed to origin.
**Status:** Built, verified, NOT merged, NOT deployed. Awaiting CEO approval after QC pass.

## What was built
New HQ silo `v1.4.3/games/races.js` staging `<template id="pf-ov-races">` with a
`<div id="pf-races">` mount, registered in `build/bundle.js` (`bundle-hq`) and
mounted by `v1.4.3/pages/political-hq.js` ORDER (after intel). Features:
- "N DAYS TO ELECTION DAY" countdown header (Nov 3, 2026), computed client-side
  in America/Chicago; honors the `campaign_end` site_config rail as override.
- Race cards: state + seat, chamber badge (Senate/House), candidates + party,
  color-coded rating chip (Toss-up gold / Lean orange / Likely blue / Safe gray,
  D/R direction), stakes, "Rating: [source], [date]" on every card.
- Default sort Toss-up → Lean → Likely → Safe (unrated last); state A–Z sort;
  chamber filter (All/Senate/House) + state dropdown; all controls ≥44px.
- Stale ratings (backend `stale` flag OR rating >14 days old) render a visible
  "Last updated [date] — ratings may be outdated" banner. Never silent.
- Candidate detail drill-down via `races_get` (funding / class take).
- Fail-soft: backend down → `.c-neterr` + Retry button, no stuck spinners.
- Read-only, zero XP; never reads `race_list` (campaign.js contract untouched).
- Kill switch: `?pf_off=races` / `localStorage pf_disabled_v1='["races"]'`.

## Verification evidence (run in `~/workspace/worktrees/wt-races`)
- `node tests/races.verify.js` → **all 33 checks pass** (kill-switch, Chicago
  countdown math vs live date, fail-soft + retry, default sort order,
  state A–Z sort, chamber filters, rating chip classes + source lines,
  backend-stale + >14d client-fallback banners, esc() on hostile names,
  races_get detail drill-down, no-XP grep, no race_list read).
- `node --check` on all 5 changed/new JS files → OK.
- `node build/check-styles-sync.js` → SYNC-OK (all 266 design-system rules in
  the served `bundle-styles.css`).
- `node build/bundle.js` → bundle-hq.js rebuilt with races.js (5 files, OK).
- Bug found & fixed during verification: regex escapes inside the staged inner
  script were eaten by the outer template literal (`\s`→`s`); source now carries
  doubled backslashes, verified correct at the staged-output level via charcodes.

## Not yet verified (needs live page / real backend)
- Live /political-hq render against the real backend (backend crew's
  `races_list`/`races_get` actions are not yet live — all logic tested against
  fixtures).
- Mobile viewport on a real phone (CSS is stacked single-column, ≥44px targets,
  `box-sizing:border-box` + `width:100%` on cards — no fixed widths).
- Visual check of the stale banner + rating chips on the actual page.

## Backend contract assumptions (backend crew must honor)
- `races_list` → JSONP `{ok, races:[...], updated_at}`.
- Race: `{id, state, chamber:"Senate"|"House", office, seat, candidates,
  rating, source, rating_date, updated_at, stale, stakes}`.
  `candidates`: `[{name,party,funding,classTake}]` (JSON string also tolerated).
  `rating`: string like `"Toss-up (D)"`, `"Lean R"`, `"Safe D"` — or object
  `{level:"tossup"|"lean"|"likely"|"safe", direction:"D"|"R"}`.
  `stale`: boolean flag; the frontend ALSO computes staleness client-side when
  `rating_date` is >14 days old, so the flag is a hint, not load-bearing.
- `races_get` with `?id=` → `{ok, race:{...}}` full detail (funding/classTake).
- Direction outside D/R and unknown rating levels degrade to UNRATED (no crash).

## Files changed
- `v1.4.3/games/races.js` (new, ~400 lines)
- `v1.4.3/games/bundle-hq.js` (rebuilt — races.js appended)
- `v1.4.3/core/02-design-system.css` + `v1.4.3/core/bundle-styles.css` (rc-* rules)
- `v1.4.3/pages/political-hq.js` (ORDER += races)
- `build/bundle.js` (bundle-hq registration)
- `tests/races.verify.js` (new harness)
