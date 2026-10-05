# Nuke FE Contract Fix — Smoke Checklist (2026-10-05, wave-nuke-fe)

Independent QC returned FAIL on the nuke wire-up: the Fed-injection channel
was a dead end and `nuke_status` reads were misaligned. This commit fixes the
FRONTEND ONLY — the backend (`origin/wave-nuke` @ `87fa884`) is untouched.
No deploys.

Files changed (sources): `v1.4.3/games/reserve.js`, `v1.4.3/core/17-nuke-strip.js`,
`v1.4.3/games/do-meter.js`, `v1.4.3/games/treasury.js`.
Rebuilt via `node build/bundle.js` + `node build/bundle-core.js` (both validated
with `node --check` internally): `bundle-bank.js`, `bundle-cells.js`,
`bundle-sec1.js`, `bundle-core.js`, `bundle-core-slr.js`,
`bundle-footer-chrome.js`.

## What was wrong (QC-verified)

1. **Blocker — injection channel dead.** FE `rsvInjSubmit` posted
   `{type:"reserve", r_action:"reserve_propose", kind:"nuke_injection", amount:N}`.
   BE `reserve_propose` (`src/reserve.js:546`) reads only `p.lever_changes`
   → rejected `'no lever changes'`; even hand-crafted
   `lever_changes:{"nuke_injection":5000}` failed (`'unknown lever'`).
   The working path `nuke_inject_propose` (`src/nuke.js:633-701`) was never
   called by the FE (zero hits).
2. **Proposal badge** read `p.kind`/`p.amount`, which BE `propsOut`
   (`src/reserve.js:472-484`) never emits.
3. **`nuke_status` misalignment.** BE sends
   `{ok, charge, tiers:{T1..T4}, armed_tier:NUMBER, hold_tier:NUMBER|null,
   effective_tier, cooldown_*, last_decay_day, detonation,
   caller:{callsign, pressed_today, streak, streak_day}|null}`.
   FE read a string `hold`, top-level `pressed`/`charge_streak`, and expected
   `detonation_streak` + `comrades` — none of which the BE sends. `nuke_press`
   returns `streak` (number), which the Do Meter never read.
4. **Treasury `loadStakedToday`** read `j.staked_today`/`j.cell_staked_today`
   — no backend action anywhere sends either (grep of all `src/*.js` on
   `origin/wave-nuke` is empty).

## What changed

- Injection form → `postNuke("nuke_inject_propose", {amount, title})` via the
  existing `PF.postAction` helper (auth secret attached automatically),
  posting `{type:"nuke", n_action:"nuke_inject_propose", callsign, device,
  auth_secret, amount, title}`.
- Proposal-card NUKE INJECTION badge → `p.lever_changes.nuke_injection`.
- `reserve.js` NUKE COMMAND: `armed_tier`/`hold_tier` numbers → tier ids via
  `nukeTierId()` (T1=10000, T2=25000, T3=50000, T4=150000 — matches BE).
- Strip `normStatus` + Do Meter `normNuke`: map real BE fields —
  `armed_tier`(number)→tier id, `hold_tier`(number|null)→tier id|null,
  `pressed`←`caller.pressed_today`, `charge_streak`←`caller.streak`.
  `detonation_streak`/`comrades` dropped (not served); hero detail line now
  shows the armed tier instead of a phantom comrade count. Do Meter
  `heroPress` reads `j.streak` from the press response.
- Treasury: `stakedToday` readout dropped; cap line now states the honest
  contract (backend enforces the 2,500/day cap per stake; over-cap stakes
  are rejected and refunded).

## Smoke steps (read-through verified, end to end)

### 1. PRESS (strip button / hero button)
- **FE:** `pressNuke()` (strip) or `heroPress()` (do-meter, prefers strip).
- **Request:** `PF.postAction("nuke","n_action","nuke_press",{callsign,device})`
  → POST `{type:"nuke", n_action:"nuke_press", callsign, device, auth_secret}`.
- **BE** (`src/nuke.js:495`): `xpGrant` idempotent on
  `nuke_press:<callsign>:<day>`; `INSERT OR IGNORE` into `nuke_press_log`
  (loser = idempotent dup); `creditPress` (+50 × (1+participation_rate) per
  cell); `touchStreak`; `touchPool` → charge += credit; `maybeDetonate`.
- **Response:** `{ok:true, pressed:true, charged, cells, streak:<number>,
  charge, detonation}` (or `{ok:true, dup:true, pressed:true, streak,
  charge, detonation}` on re-press).
- **FE render:** button → `CHARGED ✓ +50` (+ streak line); local pressed
  record written to `pf_nuke_press_v1` with the server `streak`; tick()
  refreshes the strip from `nuke_status`.
- **Check:** pressed flag and streak now come from `caller.pressed_today`
  / `caller.streak` in `normStatus` — no more permanent "YOU: PRESS TODAY".

### 2. STAKE (treasury card, officer-gated)
- **FE:** `postNuke('nuke_stake', {cell_id, amount})`.
- **Request:** POST `{type:"nuke", n_action:"nuke_stake", callsign, device,
  auth_secret, cell_id, amount}`.
- **BE** (`src/nuke.js:554`): officer gate; `amount>0`; daily cap 2,500 via
  `treasury_log`; conditional-debit `UPDATE` (check-then-act closed);
  post-debit cap recheck (race → refund + reject); `touchPool` →
  charge += amount; `maybeDetonate`; feed `nuke_staked`.
- **Response:** `{ok:true, staked, cell_id, charge, detonation}`.
- **FE render:** toast `STAKED <amt> XP INTO THE BLAST`; panel refreshes.
  No `staked_today` read — the cap line states the enforcement contract.
- **Check:** error path surfaces the backend's remaining-cap message
  (`daily stake cap reached — <n> charge remaining today`).

### 3. HOLD (reserve NUKE COMMAND, governor-gated)
- **FE:** `postNuke("nuke_hold", {hold})` with `hold` = "T2"/"T3"/"T4"/"".
- **Request:** POST `{type:"nuke", n_action:"nuke_hold", callsign, device,
  auth_secret, hold}`.
- **BE** (`src/nuke.js:708`): governor gate; T2/T3/T4 → holdTier number;
  ""/CLEAR/T1/AUTO → null; `savePool`.
- **Response:** `{ok:true, hold_tier, effective_tier}`.
- **FE render:** toast; `load()` → `nuke_status` → `hold_tier` (number) →
  `nukeTierId()` → `HOLD FOR T2` badge / `AUTO-FIRE AT T1`.
- **Check:** old `j.hold` string read is gone; a hold of 25000 renders
  `HOLD FOR T2`, not `HOLD FOR 25000`.

### 4. INJECT-PROPOSE (reserve injection form, governor-gated) — the blocker fix
- **FE:** `postNuke("nuke_inject_propose", {amount, title})`.
- **Request:** POST `{type:"nuke", n_action:"nuke_inject_propose", callsign,
  device, auth_secret, amount, title}` (title defaults to
  `NUKE INJECTION: <amt> XP -> blast charge` server-side when <5 chars).
- **BE** (`src/nuke.js:633`): governor gate; `1<=amount<=5000`; max 1
  open/passed `nuke_injection` proposal per Chicago week; proposer cell =
  caller's first governed verified cell (or `p.cell_id` if governed);
  `INSERT` into `reserve_proposals` with
  `lever_changes = {"nuke_injection": amt}`, status `open`, 48h discussion
  window (clamped 12–168h); ledger row `proposal_created`.
- **Response:** `{ok:true, id, amount, discussion_ends,
  vote_with:"reserve_vote"}`.
- **FE render:** toast `Injection proposed.`; `load()` → the proposal card
  shows the NUKE INJECTION badge reading `p.lever_changes.nuke_injection`.
- **Check:** the old `reserve_propose` path is fully removed from this form
  (no `kind:"nuke_injection"`, no `amount` on a reserve POST).

### 5. VOTE (proposal card, governor-gated) — unchanged, was already working
- **FE:** `post("vote", {callsign, device, proposal_id, choice})`
  → POST `{type:"reserve", r_action:"reserve_vote", ...}`.
- **BE** (`src/reserve.js:606`): `reserve_vote` — board tally per cell.
- **Response:** `{ok:true, ...}` → FE toast `Vote recorded.`, reload.

### 6. FINALIZE (lazy, server-side) — unchanged path, now reachable
- **BE:** `touchPool` (`src/nuke.js:326`) → `applyPassedInjections`
  (`src/nuke.js:213`): finalizes expired open injection proposals via the
  exported `finalizeProposal` (`src/reserve.js:316`), then applies passed
  ones: `xp_ledger` double-entry (+amt / −amt sink, idempotent on
  `nuke_injection:<pid>` key), `INSERT OR IGNORE` into
  `nuke_injections_applied`, `pool.charge += amt`, feed `nuke_injected`.
- **FE surface:** reserve ledger gains the `proposal_created` /
  finalization rows; the proposal card moves open → passed.

### 7. CHARGE APPLICATION (server-side) — unchanged path, now fed by all three sources
- Press: `pool.charge += credit.total` (`nuke_press`).
- Stake: `pool.charge += amount` (`nuke_stake`).
- Injection: `pool.charge += amt` (`applyPassedInjections`).
- `maybeDetonate` (`src/nuke.js:282`): fires once when decay-applied charge
  ≥ armed tier (or hold tier when set) and now > cooldown → detonation
  record + DETONATION_CREW ribbons; surplus rolls forward.
- **FE surface:** strip + hero meter read the new charge from `nuke_status`;
  tier-relative milestones (25/60/100% of the ARMED tier) unchanged.

## Verification performed (this commit)

- Read every FE call path against `origin/wave-nuke` `src/nuke.js`
  (lines 213-282, 326-395, 438-494, 495-600, 628-735) and `src/reserve.js`
  (lines 316, 468-490, 546-606): request shapes, response shapes, gates,
  and error strings all match what the FE now sends/reads.
- `node --check` on all four touched source files: pass.
- Rebuilt `v1.4.3/games/bundle-*.js` and `v1.4.3/core/bundle-*.js` with the
  repo build scripts (both run `node --check` on outputs): pass.
- Grep of rebuilt bundles: new paths present (`nuke_inject_propose`,
  `nukeTierId`, `hold_tier`); old paths absent (`kind:"nuke_injection"`
  POST, `p.kind` badge read, `staked_today`, `stakedToday`); only
  `detonation_streak` hits are comments documenting the dropped field.
- No banned terms (no "donate" copy, no real name), backslash discipline
  kept (no stray `\\` in template-literal scopes).

## QC handoff

- Contract paths to spot-check: `rsvInjSubmit` handler (reserve.js) —
  confirm the POST goes to `{type:"nuke", n_action:"nuke_inject_propose"}`;
  proposal badge reads `p.lever_changes.nuke_injection`; strip `normStatus`
  maps `hold_tier`/`caller.*`; do-meter `normNuke` maps raw + normalized
  shapes; treasury has no `staked_today` read.
- Backend untouched: `git diff origin/wave-nuke-fe --stat` should show only
  the 4 sources + 6 rebuilt bundles + this file. No deploy performed.
