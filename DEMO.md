# USER DASHBOARD HUB — DEMO NOTES (2026-10-07)

## What to show Shane
`/dashboard` — MY HQ. Five sections, one screen, mobile-first:

1. **WHO AM I HERE?** — callsign, XP, rank + progress bar to next rank,
   daily streak (with at-risk warning), the 16-medal weekly rack, this
   week's challenge. No callsign → one CLAIM YOUR CALLSIGN card (the
   one-prompt: one clear prompt, once ever).
2. **EVERYTHING, TWO TAPS** — 14 link-cards: Arcade, Cells, Create, Bank,
   Economy, War Chest, Ventures, Events, War Report, Academy, CALL IT.,
   Liquidation, Political HQ, Follow the Money. This IS the Oct 6
   ecosystem-synergy requirement — every major feature reachable in 2 taps.
3. **THIS WEEK** — next-7-days rail from the server calendar (War Report
   Mondays, fan-vote window, medal resets, Discord routines, Solidarity
   Draw, 32-Day Offensive) + "FULL CALENDAR →" to /events.
4. **YOUR WEEK** — recent actions (check-ins, votes, posts, shares) with
   XP, plus the weekly-medal progress bar toward FULL DEPLOYMENT.
5. **MY DATA** — prices reported, bounties completed, data submitted.
   Framed per the ethics rule: "Your activity powers the movement's
   intelligence." Aggregated counts, never anyone else's data.

## What to verify live (post-deploy)
- Page loads with ONE backend call (`?action=dashboard_init`).
- Signed-in: all 5 sections. Signed-out: claim card + grid + calendar.
- Tap every grid card → lands on the right page (2-tap check).
- Kill: `?pf_off=userdash` → page shows header only, no hub.
- Mobile: cards are 44px+ targets, 2-column grid.

## Shane's hand-steps (do NOT do in code)
1. Squarespace: create page `/dashboard`.
2. Add Code block: `<div id="pf-dashboard"></div>`.
3. Optional: add to nav (his call — unlisted works too).

## Ship-call prerequisites
- Full-workforce QC pass on the bundle (zero-hold) + live-page verification.
- CEO ship call per the conditional-push directive (backend deploy +
  frontend pin, one coordinated push).
