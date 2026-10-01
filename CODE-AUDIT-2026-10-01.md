# Code Audit — 2026-10-01 (v1.4.2, footer pin 6b4ef96)

Scope: GitHub repo `swananas/MTCSTW-site-deploy` (v1.4.2 + v1.1.0, 56 JS files),
footer loader `loader/footer_v142_final.html`, backend `src/backend/Code-merged-v11.gs`.

## Clean

- **Syntax:** all 56 JS files pass `node --check`.
- **Loader integrity:** all 30 V2 + 25 V1 JS files and all CSS files exist on disk
  and return HTTP 200 from jsDelivr at their pinned commits
  (`6b4ef96` / `6e8b9a42397abc5b42f0ba6b123ec4bbdd7857de`).
- **Backend coverage:** every frontend `api("…")` / `?action=…` call has a backend
  handler — except `wall`/`etch` (see Finding 1).
- **Shared globals:** every `PF.*` / `PFShare.*` used is defined
  (`PF.ROSTER` via `Object.defineProperty` getter in `core/03-global.js`;
  `PF.creditShare` assigned in `core/share-image.js`; all 6 `PFShare` methods defined).
- **Template IDs:** cross-silo refs (`pf-ranks`, `pf-medals`) are null-guarded;
  remaining misses were escaped-quote false positives or Squarespace section IDs.
- **Tally accounting:** `05-tally.js` `POOL_SETTLED` + `pf-tally-settle` design is sound —
  pool-capped events record only the true clipped award, never the raw event.
  `PF.creditShare` once-per-day gate prevents share double-counting.
  `PF.claimDayXp` is the single choke point for daily XP (Daily Orders, rank awards).

## Findings

### 1. [HIGH] Vanguard Wall backend is missing — and its POST pollutes the fan-vote sheet
- `games/enlistment-ranks.js` POSTs `{action:"wall"}` (`apiPostWall`, line ~264) and
  GETs `?action=wall` (`wallFromServer`, line ~282).
- `games/daily-orders.js` maps wall→`etch` for GET (`?action=etch`, line ~137).
- Backend `doGet` has **no** `wall`/`etch` handler → returns `{error:"unknown action: wall"}`.
  The wall degrades to local-only (localStorage fallback works), but cross-device wall is dead.
- Worse: backend `doPost` falls through unknown actions into the **fan-vote** handler —
  every "Etch it" click appends a junk row `[date, "undefined", "undefined", 1]`
  to the vote sheet (`Code-merged-v11.gs` line ~242).
- **Fix:** add `wall`/`etch` read+write handlers backed by a wall sheet; make `doPost`
  reject unknown actions instead of falling through to the vote writer.
  Also clean the junk `"undefined"` rows from the vote sheet.

### 2. [MEDIUM] Duplicate `id="cName"` on the homepage
- `games/cells.js:157` (cell-name input) and `games/caption-combat.js:24` (handle input)
  both use `id="cName"`. Both games mount on the homepage (ORDER #2 and #13).
- `document.getElementById('cName')` always returns the cells input, so Caption Combat
  reads/writes the wrong field (caption-combat.js:65,82).
- **Fix:** rename caption-combat's field (e.g. `ccName`).

### 3. [LOW] `PF.afterMount` in MANIFEST.md doesn't exist
- Referenced in `v1.4.2/MANIFEST.md:43` but never defined or called. Doc-only; no runtime impact.
- **Fix:** remove the line or implement the hook.

### 4. [INFO] Pool-exempt direct ledger writes (design confirmation needed)
These write to `pf_ranks_v1` bypassing the 50/day `claimDayXp` pool — arguably correct
as event-bounded exemptions, but confirm they should stay outside the pool:
- Bracket upset bonus `+5` once per matchup (`games/bracket-board.js:220`)
- Rank claim links `+10/+10/+15` one-time-ever (`core/04-ledger.js`, has counted-once guard)
- Cell recruit bounty `+25` once per recruit/day (`games/cells.js:105`)

### 5. [INFO] `pf-xp` event has no listeners
Dispatched by `04-ledger.js` and `bracket-board.js`; nothing listens. Harmless.

## Not audited here
Live interaction behavior on mtcstw.com — covered by the site audit (next phase).
