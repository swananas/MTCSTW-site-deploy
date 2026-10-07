# USER DASHBOARD HUB — SPEC (2026-10-07, CEO approved ~11:34 CDT)

## What this is
A HUB, not a widget pile. `/dashboard` is the user's personal command surface:
clean, light, mobile-first, everything reachable within 2 taps. It is NOT a
homepage duplicate (the `/v2-page` incident is the anti-pattern).

## The 5 sections (in order)
1. **IDENTITY / USER HUB** — "who am I here": callsign, XP total, current rank +
   progress bar to next rank, daily streak (+ at-risk flag), service medals
   rack (device-local), weekly challenge status line. If no callsign: the
   one-prompt claim card (ONE clear prompt, once ever — reuse `PF.requireCallsign`
   flow / `core/37-one-prompt.js` semantics; no new XP).
2. **FEATURE GRID** — compact link-cards, NOT embedded widgets. Every major
   feature reachable within 2 taps. Each card: icon/emoji, name, one-line
   descriptor, deep link. Cards (14): Arcade, Cells, Create (Poster Forge),
   Bank, Economy, War Chest, Ventures, Events, War Report, Academy, CALL IT.,
   Liquidation, Political HQ, Follow the Money.
3. **MASTER CALENDAR** — compact rail of upcoming dated things (next 7 days),
   server-driven from `calendar_events` via the `dashboard_init` composite.
   "View full calendar → /events".
4. **PERSONAL ACTIVITY** — recent actions (check-ins, votes, posts, shares),
   achievements unlocked, weekly-medal progress bar toward Full Deployment,
   rank XP progress. From `dashboard_init.activity`.
5. **MY DATA / ECONOMIC CONTRIBUTIONS** — the user's contributions to the
   movement's intelligence: prices reported (People's CPI), bounties
   completed, data submitted. Ethics framing (non-negotiable): "your activity
   powers the movement's intelligence". Aggregated counts only, never anyone
   else's data.

## Frontend architecture (follow existing conventions)
- New silo: `v1.4.3/games/user-dashboard.js`
  - Silo key: `userdash` (the old analytics silo `dashboard.js` owns `dash` —
    no collision; `dashboard.js` stays on /create via bundle-create).
  - Stages `<template id="pf-ov-userdash">` into `PF.holder()` at bundle time.
  - Renders itself on `#pf-dashboard` (Squarespace Code block hand-step).
  - Kill: `?pf_off=userdash` or `localStorage pf_disabled_v1='["userdash"]'`.
  - Never mounts in the Squarespace editor (`isEditor()` check, same pattern).
  - Graceful degradation: every section is independent; null/failed data
    HIDES the section (or shows an honest "signed in?" line), never throws.
  - Mobile: 44px minimum touch targets on all cards/buttons.
- New bundle: `build/bundle.js` gets `'bundle-userdash': ['user-dashboard.js']`
  → builds `v1.4.3/games/bundle-userdash.js`.
- Loader (`loader/footer_v144_final.html` + `ship-loader` equivalents):
  `isDashboard = !!document.getElementById('pf-dashboard')` → JS_GAMES entry
  `['games/bundle-userdash.js']`.
- `pages/page-mount.js`:
  - PAGE_ORDERS entry `pf-dashboard`: title 'MY HQ',
    sub 'Your war, your numbers, your next move — everything within two taps.',
    exit → `/arcade` ('NEXT MOVE: FIGHT →').
  - FE_MOUNT_IDS: add `'pf-dashboard'`.
- Data: ONE composite fetch (`dashboard_init`) on mount. No fan-out. Medals
  rack reads device-local `pf_medals_v2` (service-medals.js owns the schema);
  callsign via `PFCallsign()` / `PFDeviceId()`; auth secret via `PF.getAuthSecret()`.
- Lazy: the calendar rail and activity feed render after the identity card
  paints — identity first (critical), the rest in the same response but staged
  by rAF/timeout so first paint stays fast.

## Backend architecture
- New file: `src/dashboard-init.js`, export `dashboardInitDispatch(DB, env, action, p)`.
- GET action `dashboard_init` (JSONP-safe, read-only, zero XP, zero writes).
- Registered in `src/index.js` next to `homepage_init` (public GET branch +
  `jsonpCached` with TTL ~60s).
- Contract:
  ```
  GET ?action=dashboard_init[&callsign=X&auth_secret=Y][&callback=cb]
  -> { ok:true, action:'dashboard_init', as_of,
       signed_in: bool,
       calendar: {...calendar_events...} | null,   // PUBLIC, always attempted
       ranks: {ladder:[{xp,name}]} | null,          // PUBLIC
       identity: {callsign,xp,rank:{name,xp,next_name,next_xp,progress_pct},
                  streak:{count,freezes,at_risk}, challenge:{...}|null} | null,
       activity: {recent:[{action,ts,xp,label}], week_xp, actions_7d} | null,
       econ: {prices_reported, bounties_completed, data_submitted} | null }
  ```
- Auth: signed-in parts (identity/activity/econ) gated on
  `authCheck(DB, callsign, auth_secret)` — same IDOR pattern as `xp_history`.
  Anonymous callers get `signed_in:false` + public keys only. Auth failure =
  those keys null, still 200 (fail-soft, like `homepage_init`).
- Fail-soft per key: `soft()` wrapper (rejection or `{ok:false}` → null).
- Sources (all read-only):
  - identity.xp: `xpBalanceOf` (xp.js); rank: `rankFor` + `RANKS` (briefing.js);
    streak: `streaks` table read (streaks.js pattern);
    challenge: latest `challenges` row (challenges.js), fail-soft.
  - activity: `user_totals` (stats.js, device/callsign) + `xp_history` via
    `ledgerDispatch` (limit 12, auth-gated — mirrors the `xp_history` branch).
  - econ: `price_reports` count (inflation.js schema), `data_bounty_claims` +
    `data_bounty_confirms` counts (data_bounties.js schema). Aggregated
    counts only — no other user's data.
- NOT in AUTH_MAP (anonymous-safe GET parts by design; signed-in parts gate
  inside the handler — same as `calendar_events` + `xp_history` precedent).

## Kill switches
- `?pf_off=userdash` / `localStorage pf_disabled_v1='["userdash"]'` — frontend.
- Backend: `dashboard_init` fails safe to nulls; no persistent state, no kill
  needed beyond normal deploy rollback.

## Page-weight budget (shipping gate)
- Critical JS for /dashboard: the silo file + template ≤ **25KB** unminified.
- Bundle `bundle-userdash.js` ≤ **40KB** minified. No game bundles load on
  /dashboard — the hub ROUTES, it doesn't embed.
- One backend call. No JSONP fan-out.

## Feature-catalog cross-check (Oct 6 synergy: everything ≤2 taps)
Grid cards must link: /arcade, /cells, /create, /bank, /economy, /war-chest,
/ventures, /events, /war-report, /academy, /call-it, /liquidation,
/political-hq, /follow-the-money. Flagged gaps: none — all 14 have live pages.
(Receipt dossiers / town reports reachable via Political HQ and KARL cards'
deep links — noted in grid as secondary rows, not separate cards.)

## Squarespace hand-step (CEO/Shane — DO NOT DO in code)
1. Create page `/dashboard` (unlisted or nav-hidden — his call).
2. Add Code block: `<div id="pf-dashboard"></div>`.
3. Verify after deploy: page loads, hub renders, 2-tap nav works.

## Ship-call prerequisites (not authorized yet)
- Full-workforce QC pass on the bundle (zero-hold) + live-page verification.
- CTO push authorization per the conditional-push directive.
