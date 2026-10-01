# Site Audit — 2026-10-01 (live mtcstw.com, footer pin 6b4ef96)

Read-only live audit: homepage + /sick-left-radicals. No votes, check-ins,
forms, shares, or purchases touched.

## Pass

- Homepage renders (title "The Propaganda Factory by MTCSTW | Join the Movement Now").
- All 31 bundle URLs pinned to `6b4ef96`; `853a8fa` absent from page source.
- All 16 game sections mount in order with live data: Daily Orders, Cells, Fan Vote
  (10-candidate ballot, "6 BALLOTS CAST"), SLR Match Quiz, Creator Guess, Bracket Board
  (16 seeds), Boost Raid, Do Meter ("920 tasks complete"), Daily Drop, Billionaire
  Supervillain, Daily Interrogation, Media Nuke ("255 / 50,000 XP", "21 comrades"),
  Caption Combat, Poster Forge, Enlistment Ranks, War Bonds.
- Cells section shows the engagement lobby (founder CTA, explainer, leaderboard
  empty-state) — NOT stuck on "Raising the cell network...".
- Roster page: 62 member cards, "8.0M combined reach", scores + follower counts,
  search present. Shuffle is auto-on-load (no button by design).
- Cells bounty copy ("+25 XP every time your recruit checks in") is in the code.

## Fail

### 1. [HIGH] Media Nuke sticky action bar never appears
Shipped in commit 63592b4, passed 15/15 harness checks, but on the live site
scrolling the widget out of view reveals no sticky bar — only the persistent
Do Meter network ticker.
Prime suspect (code-level): `buildStick` (media-nuke.js:274) creates the bar hidden
and the IntersectionObserver's initial fire runs before the backend tick sets
`stickReady=true` (updateStick, line 250). `updateStick` updates the bar's content
but never re-evaluates visibility, so if the observer settled while data was still
loading, the bar stays hidden until a fresh threshold crossing re-triggers it —
and on the live page it never recovered.
Proposed lean fix: pass `root` into `updateStick(xp,pct,root)` and re-evaluate
`bar.hidden` from `getBoundingClientRect()` once `stickReady` flips true.

### 2. [MEDIUM] Daily Orders boost widget renders "MOST BOOSTED THIS WEEK: undefined"
`daily-orders.js:366` reads `top.name`, but backend `boost_totals`
(Code-merged-v11.gs:355) returns `leaders:[{slug,tipped,signal}]` — no `name` field.
Proposed lean fix: resolve via the existing `rosterBySlug(top.slug)` (already used
in the same file, line 351), falling back to the slug:
`var m=rosterBySlug(top.slug), nm=m?m.name:top.slug;`

### 3. [MEDIUM] Hero banner intermittently fails to mount
Rendered on first load, absent on the next three (empty gray band above Daily Orders).
"START THE MISSION" appears nowhere in v1.4.2 — the hero is native Squarespace
content, not bundle code. Needs eyes in the Squarespace editor (banner section
settings / conflicting custom CSS).

## Noted (not bugs)
- Audit browser profile carried prior localStorage (Caption Combat fields pre-filled);
  nothing was submitted.
