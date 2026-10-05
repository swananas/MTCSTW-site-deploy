# Cell state-affiliation — FE/BE consistency notes (2026-10-05, branch fe/cell-state-affiliation)

## Duplicated state list (by design)
`v1.4.3/games/civic.js` owns the canonical `STATES` (50 states, `[code,name]` pairs).
The cell bundles do NOT ship civic.js:
- `bundle-cells-h` and `bundle-home` ship `cells.js` without `civic.js`
- `bundle-cells` ships `cell-hq.js` without `civic.js`

So the list is duplicated verbatim (plus DC) in two places:
- `v1.4.3/games/cells.js` → `CELL_STATES` (+ `cellStateName`, `cellStateOpts`, `cellStateBadge`, `cellStateTag`)
- `v1.4.3/games/cell-hq.js` → `HQ_STATES` (+ `hqStateName`, `hqStateOpts`, `hqStateBadge`, `hqStateTag`)

KEEP IN SYNC: any change to civic.js STATES must be copied to both. DC is
included in the cell lists but not in civic.js STATES (civic uses a separate
STATES50).

## Backend contract (branch be/cell-state-affiliation, built in parallel)
- `cell_create` / `cell_update` accept optional `state` (2-letter code, nullable; empty string clears)
- cell objects carry `state` (null/absent when unaffiliated)
- `cell_search` accepts `state` filter param (empty = unfiltered, same as today)
- bounty/task listing rows may carry `state`; FE renders a tag when present

## Transport notes
- cells.js: mutations POST via `post()` (JSON body, empty strings transmit);
  `cell_update` goes through `apiKeepEmpty` (JSONP GET that transmits `state=""`
  so clearing an affiliation is explicit, not silently dropped by api()'s
  drop-empty filter).
- cell-hq.js: all mutations POST via `postMut`; `cell_update` added to the
  WRITE map so it POSTs like `cell_rename`. `cell_search` is a READ (JSONP GET);
  the empty-string filter drops `state=""` so unfiltered discovery is
  byte-identical to before.

## Fail-soft (old backend)
Every state read is guarded (`cellStateName('')` → `''`, badge/tag return `''`).
Old-backend cells render exactly as before: no badge, no tags, no `undefined`.
`cell_update` on an old backend errors → picker reverts, error shows in the
cell error line.

## Verification
`node tests/cell-state-smoke.test.cjs` — 29/29 pass (2026-10-05).
Covers: 52-option pickers, create POST state, badge show/hide, discovery filter
param, explicit-empty clear, fail-soft on stateless cells.
