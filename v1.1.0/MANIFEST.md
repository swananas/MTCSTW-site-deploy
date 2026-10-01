# PF v1.1.0 — silo manifest

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
