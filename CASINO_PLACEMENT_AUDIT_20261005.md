# Casino Placement Audit — 20261005

**Workstream:** Casino Audit + Implement Worker
**Branch:** `audit/casino-placement` (FE repo) @ worktree `~/workspace/wt-casino-audit`
**Integration heads verified:** BE `194657a3d2b32f8388034e76bdf1fd884d8f8c7a` · FE `e8367ccef7a032cfa4e48b940ccbaf6e88a4c5c6`
(worktree cut from current `origin/integrate/big-update-fe` @ `3f5d5d2`, which is ahead of `e8367cc` only by the f5-tally-dedupe merge)
**GAP sweep:** G-03 (`~/workspace/hidden/gap-sweep-20261005.md`)
**CEO ruling:** casino was likely broken apart — find its pieces, implement the missing ones elsewhere. Do NOT restore the standalone casino page. Do NOT touch the FULL DEPLOYMENT gambling gate or build new gambling mechanics.

## Phase 1 — Audit

### Recovered: `v1.4.3/games/casino.js` (515 lines, still in repo)
Retired 2026-10-05 (Redistribution Layer Phase A): unmounted from `/arcade`, on the
intentional DEAD list in `build/bundle.js:288`. File retained in-repo for history.
Mount `['casino','pf-ov-casino']` removed from `v1.4.3/pages/page-mount.js`.

### Mechanic inventory (every game, wager/payout/XP flow, backend action)

| # | Mechanic | Wager/payout/XP flow | Backend action(s) |
|---|----------|---------------------|-------------------|
| 1 | **Wagers** — pool betting on battles/races/challenges. List open wagers, pick a side, enter XP, BET. Odds shown as `pays X.Xx`. | Bet XP on a side; winners split the pool (parimutuel) | `wager_list` (GET) · `wager_place` (POST `{type:"wager",w_action}`) |
| 2 | **Lottery** — 10 XP/ticket, BUY 1/5/10 buttons, weekly draw, winner takes the whole pot | Debit XP → tickets → pot; weekly admin draw pays pot | `lottery_status` (GET) · `lottery_buy` (POST `{type:"gamble",g_action}`) |
| 3 | **Coin flip** — CREATE (stake + heads/tails), TAKE IT (accept), winner takes **1.9×** (copy fixed by math-audit 9; was "double"), 5% rake fed the lottery | Two-player pot; winner 1.9× stake | `flip_open` (GET) · `flip_create`, `flip_join` (POST `{type:"gamble",g_action}`) |
| 4 | **Crash** — bet XP on rising multiplier, CASH OUT before crash, uncashout = loss; crash status polled every 5s | Bet at 1.0×; cashout = bet × multiplier | `crash_status` (GET) · `crash_bet`, `crash_cashout` (POST `{type:"gamble",g_action}`) |
| 5 | **Roulette** — red/black pays 2×, single number 0–36 pays 36×, 5% of losses fed the lottery | Instant spin; win → payout; loss → toast | `roulette_spin` (POST `{type:"gamble",g_action}`) — **REMOVED from backend** |
| 6 | **Cashout reveal** — persistent win screen ("I JUST CASHED OUT +N XP") with VAULT IT (one-tap winnings → `/bank` vault via existing bank-deposit action, fail-closed, weekly cap, idempotency key), SHARE THE WIN (PFShare `'casino'` poster painter), exits chip row (RUN IT BACK / VAULT / MARKETS). Fired `pf-casino-cashed` → ticked the 16th service medal. | Real XP moves only via existing bank deposit | bank `deposit` (existing action); PFShare poster |
| 7 | **"High Roller" 16th service medal** (`pf-casino-cashed`) | medal event | — |

Backend state (BE head `194657a`, verified): `src/wagers.js` — `wagerDispatch` serves
`wager_list`/`wager_create`/`wager_place`/`wager_resolve` (all alive). `src/gamble.js` —
`gambleDispatch` serves `lottery_status`/`lottery_buy`/`lottery_draw`,
`flip_create`/`flip_open`/`flip_join`, `crash_bet`/`crash_round_open`/`crash_status`/`crash_cashout`
(all alive). **Roulette was removed 2026-10-05** (`842b7b2` "Phase A Redistribution Layer
backend"): "cut from the dispatch and the auth map; its 5% loss feeder died with it."
The retired flows were rewritten as the redistribution layer: lottery → **Solidarity Draw**
(80% winner / 20% war chest, provably-fair draw secret), flips → **Gambit duels**
(5% of every pot tithes to the network war chest), crash → **Supply Line Raid**
(uncashed crash bets credit the losers' cell treasuries / war chest).

## Phase 2 — Trace (mechanic → current home)

| # | Mechanic | Current home | Status |
|---|----------|--------------|--------|
| 1 | Wagers | `games/markets.js` **BATTLE WAGERS zone** on `/arcade` (wager_list + wager_place, odds strip, bettor counts, parimutuel copy, `PF.wmBetPlaced`/`PF.wmWagerResolved` hooks) | ✅ EXISTS |
| 2 | Lottery | `games/solidarity-draw.js` (silo `draw`, bundle-home, mounted on homepage Hall of Proof via `pages/home-v2.js`) + `markets.js` **DRAW zone** (Phase-A interim, ride-through) | ✅ EXISTS |
| 3 | Coin flip | `games/gambits.js` — **THE GAMBIT** (silo `gambits`, bundle-arcade, mounted on `/arcade` right after War Room; `PF.wmFlipSettled` hook) | ✅ EXISTS |
| 4 | Crash | `games/supply-raid.js` (silo `raid`, bundle-cells, mounted on `/cells`; cell-scoped rounds, `PF.wmBetPlaced`/`PF.wmCrashSettled`/`PF.wmCrashCrashed` hooks) + `markets.js` **RAID zone** (Phase-A interim for non-cell members) | ✅ EXISTS |
| 5 | Roulette | — | ❌ DROPPED (deliberate; see below) |
| 6 | Cashout reveal / VAULT IT / SHARE THE WIN | `games/casino-exits.js` (still in bundle-arcade): `PF.wmSettled` → `pf-wm-settled` event → win/loss exit cards (VAULT IT leads, STAKE IT FORWARD, FUND THE FIGHT), one-tap VAULT IT bank deposit, PFShare `'redist-win'` painter + `shareImage` win-share poster | ✅ EXISTS |
| 7 | High Roller medal | Replaced by **Market Maker** medal (`pf-wm-settled` — first settled redistribution event each week; REQUIRED for FULL DEPLOYMENT). Removal documented in `games/service-medals.js` + `games/deploy-tracker.js`. | ✅ SUPERSEDED (deliberate) |

Hook continuity: every new surface calls the same `PF.wm*` exit hooks casino.js called
(`wmBetPlaced`, `wmSettled`, `wmWagerResolved`, `wmFlipSettled`, `wmCrashSettled`,
`wmCrashCrashed`, `wmLotterySeen`), exposed by `casino-exits.js` — stake tracking,
sweep-to-vault, exit routing, and the Market Maker medal all survive the move.
Trust copy "XP has no cash value. Stakes are final." present on every surface.
Payout math copies match the backend (gambit 1.9×, draw 80/20, parimutuel wagers,
crash −5% EV). All XP moves go through `xpGrant()` (backend, fail-closed).

## Phase 3 — Implementation decision

**Nothing was implemented. Justification per mechanic:**

- Mechanics 1–4, 6, 7 already have complete natural homes (same backend actions, same
  exit hooks, same trust copy, matching payout math, mounts verified live in bundle
  configs + page-mount/home-v2). Re-implementing would duplicate existing surfaces.
- **Mechanic 5 (roulette): DROPPED, not rebuilt.** Reasons: (a) the Phase-A backend
  spec (`842b7b2`, on the integration line) deliberately cut `roulette_spin` from the
  dispatch AND the auth map; (b) rebuilding it would require adding a new backend
  gambling action — a new gambling mechanic, which this task explicitly forbids;
  (c) the CEO's FULL DEPLOYMENT gambling-gate redesign is open/unauthorized — roulette
  is exactly the kind of mechanic that gate redesign must adjudicate, not this
  placement task; (d) no spec or QC doc directs a roulette replacement. The drop is
  documented here and in the harness as an intentional removal.
- No new standalone casino page, no new gambling gates, no new backend actions, no
  real-money mechanics. Deploy freeze respected (no deploys; branch only).

## Tests

`tests/casino-placement.verify.cjs` (new, in this branch) — static placement harness,
21 assertions covering: casino.js on the DEAD list (unbundled); each mechanic's
frontend file in its bundle config + mounted (page-mount/home-v2); each backend
action present in `wagerDispatch`/`gambleDispatch` at the pinned BE head; roulette's
documented absence from the backend dispatch; `PF.wm*` hook exposure + per-surface
hook calls; `'redist-win'` painter + VAULT IT in casino-exits.js; Market Maker medal
replacing High Roller; trust copy + XP discipline (xpGrant fail-closed) on the
redistribution paths. Run: `node tests/casino-placement.verify.cjs`.

Result: **21/21 PASS** (run 2026-10-05).
