# PHQ Share-Painter Consolidation — V4 Gap Closure

**Branch:** `fe/phq-share-consolidation` (worktree `~/workspace/wt/merge-phq-share-consolidation`,
base `origin/integrate/big-update-fe`)
**Spec:** `~/workspace/hidden/design-team/design-system-spec-20261005.md` §3
**Status:** built, harness green — awaiting QC (incl. Performance gate), then Release Engineering rollout.

## What was wrong

~22 divergent copies of `core/share-image-phq.js` existed across the worktrees (10 distinct
variants). Every copy ended with `PF.PHQShare = { ids, share, save, paint }` — a reassignment, not a
registration. Whichever file loaded last won and silently dropped the other painters. The retired
`core/share-image-phq-kits.js` (branch `fe/campaign-share-kits`) monkey-patched the facade instead,
with its own kill convention. The stock-trades branch added a second per-painter kill alias
(`?pf_off=trades-card`).

## What this branch ships

1. **`v1.4.3/core/share-image-phq.js` — the single canonical module** (23 painters, ~87KB).
   Registration is additive: `PF.PHQShare.registerPainters({id: fn}, {id: 'TITLE'})`.
   The facade is created exactly once (by the lazy stub in the bundle path, or by the module
   itself in standalone mode under the `window.pfPhqShareDone` guard). No other file in the
   codebase may assign `PF.PHQShare`.
2. **`v1.4.3/core/share-image-phq-lazy.js` — ~1.5KB lazy stub**, now bundled in
   `pages/bundle-pages` *instead of* the full module (`build/bundle-core.js` updated). On the
   first share/save/paint/pledgeData call it injects
   `<version-base>/core/share-image-phq.js` (version derived from an already-loaded bundle
   script's URL) and replays queued share/save calls. The ~99% of visitors who never share
   never download the ~87KB module. **The lazy-load is load-bearing — the Performance gate
   must verify the module is absent from the initial bundle payload.**
3. **`core/share-image-phq-kits.js` retired** — its painters (`phq-bill`, `phq-urgency`) register
   in the canonical module. `PF.PHQShareKits` had no live consumers; no shim kept.
4. **`scripts/verify-phq-share-consolidation.js`** — the verify harness (22 checks, all green):
   no `PF.PHQShare =` outside the two canonical files, kill-check placement, kits retired,
   bundle wiring (stub in / module out), all 23 ids registered, every silo-referenced id
   resolves, headless functional tests (paint all 23, unknown id → false/null,
   per-painter kill, module kill, lazy queue → replay, double-load idempotent).

## Painter inventory

### Kept (23) — all registered in the canonical module

| id | card | source branch | live consumer |
|---|---|---|---|
| phq-pressure | PRESSURE CAMPAIGN | integrate line | pressure silos |
| phq-prediction | PREDICTION RESULT | integrate line | predict-game |
| phq-predict-call | MY CALL | integrate line | predict-game |
| phq-scorecard | VOTING SCORECARD | integrate line | congress-scorecards |
| phq-cellwin | CELL VICTORY | integrate line | cell competitions |
| phq-ballot | BALLOT COUNTDOWN | integrate line | ballot-countdown |
| phq-pledge | VOTER PLEDGE | integrate line | civic.js (`pledgeData` kept on facade) |
| phq-racecall | RACE CALLED | fe/election-live-mode | races.js |
| phq-race | RACE WATCH | fe/studio-painters | studio |
| phq-wallshame | WALL OF SHAME | fe/superpac-alerts | wall-of-shame.js |
| phq-pac | MONEY BOMB | fe/superpac-alerts | pac-alerts.js |
| phq-trades | THEIR PORTFOLIO | fe/stock-trades | trades-tab.js |
| phq-bill-status | BILL STATUS | fe/studio-painters | studio |
| phq-nonprofit | MOVEMENT ALLY | fe/studio-painters | studio |
| phq-poll-results | POLL RESULTS | fe/studio-painters | studio |
| phq-rep-contact | I TOOK ACTION | fe/studio-painters | studio |
| phq-money | FOLLOW THE MONEY | fe/money-page | money-tab.js |
| phq-ledger | THE LEDGER | fe/money-page | ledger-list.js |
| phq-boycott | DONOR BOYCOTT | fe/money-page | boycott-list.js |
| phq-corp | CORPORATE PLAYBOOK | fe/corp-playbook | corp-card.js |
| phq-votedonor | THE MONEY BEHIND THE VOTE | fe/money-page | money-page.js |
| phq-bill | BILL POSTER | fe/campaign-share-kits | civic.js (passes `{noCredit:true}` — Economy Desk 0-XP ruling) |
| phq-urgency | URGENCY POSTER | fe/campaign-share-kits | civic.js (passes `{noCredit:true}`) |

### Deduped (same id, different painter — kept the one with the live consumer)

- **phq-pac**: kept superpac-alerts' **MONEY BOMB** (consumer: `core/pac-alerts.js` passes spike
  data `{state, district, cycle, amount, spender, supportOppose, target, …}`). Retired
  money-page's **SUPER PAC ALERT** (`{alerts:[{amount, pac_name}]}`) — no live silo calls it.
- **phq-trades**: kept stock-trades' **THEIR PORTFOLIO** (consumer: `core/trades-tab.js` passes
  `{name, tradeCount, topTickers, dateFrom/To, sources, asOf}`; carries the CEO-mandated
  verbatim public-records footer). Retired money-page's **TRADES ON THE HILL** — no live silo
  calls it.
- **phq-corp / phq-wallshame**: verified byte-identical across branches — single copy kept.
- **chamberLine helper**: kept the stock-trades superset (handles `rep`/`sen` aliases;
  backward-compatible with superpac usage).
- **phq-race vs phq-racecall**: NOT duplicates — RACE WATCH (pre-election rating card) vs
  RACE CALLED (winner announcement). Both kept under their existing ids.

### Retired

- `core/share-image-phq-kits.js` (whole file; painters moved into the canonical module).
- The `?pf_off=trades-card` kill alias (second kill convention; use `?pf_off=phq-trades`).
- money-page's dead `phq-pac` / `phq-trades` painter variants (no consumers).

## Adoption plan (in-flight branches rebase — NOT rewritten centrally)

**Owner: Release Engineering**, sequenced with the Frontend liaison (touches the merge queue).
Per branch, the branch owner (or their lead) does:

1. Rebase onto `fe/phq-share-consolidation` (or onto the integrate line after this merges).
2. **Delete** the branch's private `v1.4.3/core/share-image-phq.js`
   (and `v1.4.3/core/share-image-phq-kits.js` on `fe/campaign-share-kits`).
3. If the branch added a painter not in the table above, move the painter fn into the
   canonical module's `PAINT_LOCAL`/`TITLES_LOCAL` + a data-contract line in the header —
   never a second file.
4. In `build/bundle-core.js`, take the bundle-config change: `pages/bundle-pages` lists
   `'core/share-image-phq-lazy.js'` instead of `'core/share-image-phq.js'`.
5. Run `node scripts/verify-phq-share-consolidation.js` — must be green before merge.
   **No branch merges while it reassigns `PF.PHQShare`** (spec §3c.3).

Branches carrying a private copy (from the 2026-10-05 survey): fe/ammo-political (worktrees),
fe/election-live-mode, fe/superpac-alerts, fix/dispatch-newsletter, wt-build-inner-check,
wt-stock-trades-fe, wt-studio-painters, wt/fe-corp-playbook, fe/money-page, fe/stock-trades,
merge-fe-ballot, merge-fe-bankmeta, merge-fe-cellwar, merge-fe-command, merge-fe-phq-posters,
merge-fe-pledge, merge-fe-predict-share, merge-fe-strike, merge-fe-studio-tab,
merge-fix-wb-xp, merge-integrate, merge-integrate2, fe/campaign-share-kits (kits file).

Known adoption follow-up (not a blocker): `civic.js`'s post-pledge flow calls
`PF.PHQShare.pledgeData(row)` synchronously and skips the card when it returns null. With
lazy-load, `pledgeData` returns null until the module loads (the stub triggers the load and
the subsequent `share('phq-pledge', …)` replays via the queue). The pledge-branch owner
should confirm the "my pledge" card still appears after a successful pledge, or route the
flow through the queued share path.

## QC status

- **Harness:** `node scripts/verify-phq-share-consolidation.js` → **22/22 PASS** (2026-10-05).
- **Independent QC:** PENDING — owned by the QC department (four gates run in parallel per the
  2026-10-05 restructure). This branch does not merge without a clean QC pass.
- **Performance gate (load-bearing):** PENDING — must confirm on a staged page that
  `core/share-image-phq.js` (~87KB) is absent from the initial `pages/bundle-pages` payload
  and loads exactly once on first share-click. Owned by QC Performance.

## Blockers

| blocker | owner |
|---|---|
| QC pass (all four gates, incl. Performance gate on the lazy-load) | QC department |
| Merge sequencing vs. the in-flight merge queue | Release Engineering + Frontend liaison |
| Branch owners delete private copies + rebase (list above) | respective branch leads |
| Rebuilt `v1.4.3/pages/bundle-pages.js` artifact after merge (stale checked-in copy still carries the old reassignment) | Release Engineering |
| civic.js post-pledge `pledgeData` flow confirmation under lazy-load | pledge-branch owner |
