# PF v1.3.0 — silo manifest

One file per game. `core/00-bus.js` is the connector layer on top.

## Load order

- CSS `core/01-styles.css`
- CSS `fixes/mobile.css`
- JS `core/00-bus.js`
- JS `core/03-global.js`
- JS `core/04-ledger.js`
- JS `core/05-tally.js`
- JS `games/caption-combat.js`
- JS `games/daily-orders.js`
- JS `games/fan-vote.js`
- JS `games/do-meter.js`
- JS `games/media-nuke.js`
- JS `games/poster-forge.js`
- JS `games/daily-drop.js`
- JS `games/service-medals.js`
- JS `games/liquidation-bracket.js`
- JS `core/06-override.js`
- JS `core/07-deadblocks.js`
- JS `core/08-engage.js`
- JS `core/09-toast.js`
- JS `core/10-ticker.js`
- JS `fixes/homepage.js`
- JS `fixes/about.js`
- JS `fixes/faqs.js`
- JS `fixes/roster.js`
- JS `fixes/podcast.js`
- JS `fixes/tax.js`
- JS `fixes/terms.js`
- JS `fixes/schema.js`

## Kill-switches

Append `?pf_off=<silo-id>` to any URL, or set localStorage `pf_disabled_v1`
to a JSON array of silo ids. Silo id = file name without extension.

## Notes

- Game companions (save/share, syncs) run after the mounter via `PF.afterMount`.
- Every silo failure is tagged `[PF:<silo>]` in the console.
- service-medals listens to game events; order-independent by design.

---

# PF v1.2.0 — /v2 clean page (added 2026-10-01)

v1.2.0 = v1.1.0 plus one new silo: `pages/home-v2.js`.

## What it does

Mounts the 7 staged game templates onto the fresh Squarespace page `/v2`, in
this order: daily-orders, fan-vote, do-meter, media-nuke, poster-forge,
daily-drop, caption-combat. The page itself holds only
`<div id="pf-v2"></div>` — every widget renders from GitHub silos.

Also creates a slim `#pf-ranks` anchor so the Service Medals rack (GitHub
code) renders. The full Enlistment Ranks ledger, Liquidation Bracket section,
War Bonds commerce, and Find Your Comrades are native Squarespace sections and
stay on the main page.

## /v2 load set (no fixes/*.js — those patch legacy pages)

CSS: `core/01-styles.css`, `fixes/mobile.css`
JS: `core/00-bus.js`, `core/03-global.js`, `core/04-ledger.js`,
`core/05-tally.js`, all 9 `games/*.js`, `pages/home-v2.js`,
`core/06-override.js` (early-returns on /v2 and flushes companions),
`core/07-deadblocks.js`, `core/08-engage.js`, `core/09-toast.js`,
`core/10-ticker.js`.

## Footer loader

The footer snippet is path-aware: `/v2` loads the v1.2.0 set above;
every other path loads the unchanged v1.1.0 set. One snippet, one save,
no double-loading.

## v1.3.0 — /v2 page sections (v2-only silos)

Four more homepage sections converted from native Squarespace blocks to GitHub
silos. They load ONLY on /v2 (path-aware footer), staged inert inside
`<template>`; `pages/home-v2.js` mounts them after the 7 games.

- JS `games/enlistment-ranks.js` → template `pf-ov-ranks` → mounts `#pf-ranks`
  (Enlistment Ranks loyalty ladder; also the Service Medals rack host)
- JS `games/bracket-board.js` → template `pf-ov-bracket` → mounts `#pf-bracket`
  (Liquidation Bracket board; ballot mode — no backend URL set)
- JS `games/comrades.js` → template `pf-ov-comrades` → mounts `#pf-comrades`
  (Community link hub)
- JS `games/war-bonds.js` → template `pf-ov-bonds` → mounts `#pf-warbonds`
  (War Bonds directory; tier buttons link to /store products, dispatch pf-wb-buy)

Kill-switches: `?pf_off=enlistment-ranks|bracket-board|comrades|war-bonds`.
