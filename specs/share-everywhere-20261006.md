# SPEC — Share Everywhere (fe/share-everywhere, 2026-10-06)

CEO directive: the territory map has no way to share — fix first, then standardize sitewide. Every UGC surface needs share-to-socials + save-to-phone, all carrying the recruiting CTA.

## Coverage matrix

| Surface | File | Before | After |
|---|---|---|---|
| Territory map | games/cell-territory-map.js | none | custom SVG→canvas painter + share bar + network row |
| War map (Frontlines) | games/war-map.js | none | leaderboard painter + share bar |
| Cell war front | games/cell-war-front.js | none | share bar (generic cell template) |
| Cell HQ | games/cell-hq.js | none | share bar (generic cell template) |
| Cell identity card | games/cell-identity.js | stamp only | share bar |
| Predictions (CALL IT.) | games/predict.js | none | share bar + painter |
| Pledge wall | games/campaign.js | none | share bar |
| Check-in | games/daily-orders.js | verify | verify / wire if missing |
| Content bank | games/bank-browse.js | none | share bar |
| Fan vote | games/fan-vote.js | stamp only | share bar |
| Quiz results | embeds/slr-match-quiz | REG exists | verify auto-injection |
| Achievements / medals | games/service-medals.js | none | share bar |
| Enlistment papers | games/enlistment-ranks.js | vanguard-wall | verify |
| War card | games/war-card.js | has | unchanged (JOIN MY CELL / BUILD YOUR CELL) |
| Raid card / supply raid | games/supply-raid.js | has | unchanged (JOIN THE RAID) |

## Architecture

New module `v1.4.3/core/share-everywhere.js`, loaded right after `core/share-image.js`
in the `pages/bundle-pages` list of build/bundle-core.js, immediately after
`core/share-image.js` (which ships in the pages bundle, not the core bundle).
Kill: `?pf_off=share-everywhere`.

1. **REG templates** added to `PFShare.REG` (title/tag/lines/cta), all CTA-standard:
   territory-map, war-map, cell-war-front, cell-hq, cell-identity, predictions,
   pledge-wall, checkin, content-bank, fan-vote (exists — verify), achievements,
   enlistment-papers.
2. **Custom painters** via `PFShare.setPoster`:
   - `territory-map` (async): serialize live `.tm-map` SVG → 1080x1350 branded
     poster + week + top-5 legend + CTA footer. Fallback to generic template
     when the SVG is absent.
   - `war-map` (async): leaderboard poster from live DOM (top 5 cells + points).
   - Others: generic `drawPoster` with REG entry.
3. **Universal bar**: `PFShareEverywhere.bar(hostEl, gameId, opts)` injects the
   SHARE IMAGE / SAVE IMAGE TO PHONE pair (same styling as share-image.js) +
   `PFShareEverywhere.networks(title, text, url)` — X / Facebook / Bluesky /
   Threads intent links + copy-link button.
4. **One-line hooks** in each surface's render function (idempotent, guarded by
   `window.PFShareEverywhere` presence; no-ops when PFShare is killed).

## Share targets

- Mobile: Web Share API with PNG file (sheet offers every installed social app).
- Desktop/no-share-API: download fallback (existing) + network intent row.
- Intent URLs: X `twitter.com/intent/tweet`, FB `facebook.com/sharer/sharer.php`,
  Bluesky `bsky.app/intent/compose`, Threads `threads.net/intent/post`, + copy link.

## Copy rules

- Every poster: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — via generic renderer
  or painted manually in custom painters.
- Raid cards keep JOIN THE RAID; war cards keep JOIN MY CELL / BUILD YOUR CELL.
- No "donate". MTCSTW identity only. Captions pre-written, no free text.

## Tests (scripts/verify-share-everywhere-fe.js)

1. `node --check` on new/changed files.
2. Static: REG entries complete (title/tag/lines/cta), banned terms absent,
   CTA standard present, kill switch present, bundle marker (file in build list).
3. Runtime (vm + DOM shim): REG registration, bar injection idempotency,
   network intent URL shapes, painter fallback when SVG absent, no-donate/no-real-name scan.
