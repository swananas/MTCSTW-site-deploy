# Homepage v3 — Widget Disposition Map

**Date:** 2026-10-07
**Directive:** Every homepage widget either MOVES to a dedicated page or INTEGRATES into a consolidated block. Nothing orphaned.

## The 7 homepage blocks

1. **hero** (NEW) — H1 + subhead + CTA
2. **socialproof** — network pulse bar (+ do-meter number)
3. **brief** — daily briefing (+ civicsnap line)
4. **daily-orders** — missions loop (+ loot, ranks, recruit)
5. **slr-match-quiz** — slim teaser (+ roster link)
6. **fan-vote** — weekly vote (+ winners, draw pot)
7. **closer** (NEW) — link-card grid to all dedicated pages

## Disposition: INTEGRATE (9 widgets absorbed)

| Widget | Absorbed into | How |
|---|---|---|
| do-meter | socialproof | Headline "X tasks complete" as extra bar stat |
| civicsnap | brief | One inline line: "Today in Political HQ: ..." |
| dopa | daily-orders | Loot claim button inline |
| enlistment-ranks | daily-orders | Compact rank strip: "RANK: X · N XP" |
| referral | daily-orders | "Recruit a fighter →" nudge link |
| roster-teaser | slr-match-quiz | "Meet all 62 fighters →" link |
| hall | fan-vote | Winners strip: "LAST WEEK'S CHAMPIONS: ..." |
| draw | fan-vote | Pot total line |
| sitemap | closer | Directory function replaced by link-card grid |

## Disposition: MOVE (19 widgets → dedicated pages)

| Widget | New home | Homepage replacement |
|---|---|---|
| hq-nudge | /request-access | Closer: Creator HQ card |
| spotlight | /arcade | Closer: Arcade card |
| infighting | /arcade | Closer: Arcade card |
| cells | /cells | Closer: Cells card |
| poster-forge | /create | Closer: Create card |
| feed | /create | Closer: Create card |
| quartermaster | /bank | Closer: Bank card |
| war-bonds | /bank | Closer: Bank card |
| inflation-teaser | /economy | Closer: Economy card |
| ritual-calendar | /money | (deep link, no closer card) |
| campaign | /events | Closer: Events card |
| fb-missions | /events | Closer: Events card |
| alerts | /political-hq | (deep link, no closer card) |
| warreport-card | /war-report | Closer: War Report card |
| podcast-card | (media) | Closer: linked from War Report card |
| bluesky | /sick-left-radicals | Closer: Roster card |

## Disposition: RETIRED FROM HOMEPAGE (2 brief-block injectors)

These two self-inject into `#xBrief` (the brief block's mount), which breaks the
v3 consolidated brief block. They are **guarded off the v3 homepage** (guard
checks for `section[data-game="hero"]`), files retained, `?pf_off=` kill
switches intact. **Needs Shane's call** for their dedicated homes:

| Widget | Status | Candidate home |
|---|---|---|
| fred-briefing | Weekday economy strip; v3 injection disabled | /economy |
| theater | Ribbon chase strip + rack; v3 injection disabled; rank display now via the daily-orders rank strip | ranks surface TBD |

## Bundle placement (critical-path budget)

`bundle-sec1.js` (blocking) carries ONLY `briefing.js` + `social-proof.js`
(hero is a static template, no game file). Everything else that rode sec1 for
the old homepage — `daily-orders.js` + 13 legacy files — moved to
`bundle-home.js` (lazy, 800px IO pre-load margin). Critical JS: ~143KB gzip,
under the 150KB audit target.

## Disposition: KEEP (3 unchanged)

| Widget | Notes |
|---|---|
| socialproof | Parent block, absorbs do-meter |
| brief | Parent block, absorbs civicsnap |
| daily-orders | Parent block, absorbs dopa/ranks/referral |
| slr-match-quiz | Parent block, absorbs roster-teaser link |
| fan-vote | Parent block, absorbs hall/draw |
| mountEventsNudge | Static nudge card, already minimal |

## Kill switches (all preserved)

Every moved widget keeps its `?pf_off=<silo>` kill switch. Removed-from-homepage widgets can be re-added to ORDER if needed.

## Verification

- [ ] All 7 blocks mount on homepage
- [ ] No 404s from closer card links
- [ ] Moved widgets still work on dedicated pages
- [ ] Integrated inline elements degrade gracefully
