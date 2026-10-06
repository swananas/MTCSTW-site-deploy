# YOUR WAR CHEST — Frontend Handoff (PLAY 6, 2026-10-06)

Branch: `fe/warchest-money-glue`. Staged only — no merge, no deploy, no footer pin touch.

## What shipped (frontend only)

- `v1.4.3/core/warchest-view.js` — `PFWarChest`, the unified money view.
  Read-only aggregation of EXISTING GET endpoints. No new backend endpoints,
  no money movement, no schema changes, zero XP mechanics, zero new
  currencies. Viewing grants 0 XP; the module never calls a grant/write leg.
- `scripts/verify-warchest-view-fe.js` — full verification (64 checks, green).
- `build/bundle-core.js` — one-line registration in `CORE_FILES`
  (`'core/warchest-view.js'`, after `core/27-freshness.js`).

## Surfaces (explicit slots only — never guesses at Squarespace DOM)

| Slot | Surface |
|---|---|
| `#pf-warchest-card` | Compact homepage card for the YOUR CAMPAIGN area. Personal XP balance + first cell chest + CTA `OPEN YOUR WAR CHEST →` → `/war-chest#pf-warchest-view`. Backend down → hides itself. No callsign → enlist prompt (stays visible). |
| `#pf-warchest-view` | Full unified view (new Squarespace page, suggested `/war-chest` — the page shell already exists per the bundle header). Personal / cells / movement sections of Ledger Lines. Total backend failure → hides. |
| `#pf-warchest-cell` | Cell dashboard section. `data-cell-id` optional — falls back to the caller's first cell via `cell_mine`. |

## Squarespace hand-steps (Release Eng / Shane)

1. Homepage YOUR CAMPAIGN area: add a Code Block with `<div id="pf-warchest-card"></div>`.
2. `/war-chest` page: add a Code Block with `<div id="pf-warchest-view"></div>`.
3. Cell dashboard: add `<div id="pf-warchest-cell" data-cell-id="..."></div>`
   (omit `data-cell-id` to auto-use the viewer's first cell).

## Endpoint contract (all existing, JSONP GET, 12s timeout, fail-open)

- `xp_balance?callsign=` → `{balance}` — PERSONAL WAR CHEST row
- `xp_history?callsign=&limit=100` (auth-gated, `PF.getAuthSecret()` auto-attached)
  → client-side aggregation: BOUNTY EARNINGS (positive `bounty_*`/`databounty_*`/`cellbounty_*`
  legs), SURGE MULTIPLIERS EARNED (count + best of `(surge xN)` / `(Nx roll)` markers),
  CAUSE-POOL CONTRIBUTIONS (negative `cause_*` legs)
- `bond_list?callsign=` → LIBERTY BONDS HELD (unredeemed sum)
- `cell_mine?callsign=` (auth-gated) → cell list, then `warchest_status?cell_id=`
  per cell → cell total + caller's own contribution (from leaderboard; per-transaction
  history rows are never rendered — aggregates only)
- `treasury_balance?cell_id=` → CELL TREASURY (cell dashboard section)
- `bond_stats` → WAR BONDS — MOVEMENT TOTAL (`$X revenue · N purchases`,
  labeled "all buyers, aggregate")

## Omitted rows (fail-open — no endpoint exists, nothing invented)

- Per-callsign store / War Bond purchase history (`bond_stats` is aggregate-only;
  `war_bond_purchases` rows are not exposed per-callsign)
- Per-callsign store order history (no endpoint)

## Copy / honesty rules enforced

- Every figure carries `Source: <action> · live` (or `· last 100 entries · latest <ago>`).
- The word "donate" appears nowhere (copy uses "contributions").
- Footer line: "War Bonds grant 0 XP. Real money is delinked from XP."
- Ledger Line pattern: left = what, right = figure, red (`.hot`) when it matters
  (outbound contributions, real-money War Bond revenue, goal-hit chests).

## Kill switches

`?pf_off=warchest` (master — module never exposed) · `?pf_off=warchest-card` ·
`?pf_off=warchest-full` · `?pf_off=warchest-cell`.

## Tests

`node scripts/verify-warchest-view-fe.js` — 64 checks, ALL GREEN:
node --check, bundle registration (with core-only rebuild fallback — the shared
tree churns under sibling workers), static contract (kill switches, read-only:
no xpGrant/POST/fetch, no banned copy, CTA, explicit slots only, endpoint
allowlist, auth auto-attach, esc() on cell names, Ledger Line pattern, source
labels), and mocked-browser runtime tests (aggregation math, omitted rows on
endpoint failure, fail-open hides, kill switches, no-callsign behavior, cell
section, XSS escaping).
