# QC Request — Strike Orders Creation Task

**To:** QC / Audit (Internal QC Lead — queue owner)
**From:** Strike Orders Creative Task Builder (build pod)
**Date:** 2026-10-05
**Verdict requested:** PASS / FAIL / HELD (veto absolute, per SOP)

Claude is out of this workflow — this request is for the internal QC team only.

## Branches under review (do NOT merge or deploy — stage for CEO approval)

| Stream | Branch | SHA | Base |
|--------|--------|-----|------|
| Backend | `be/strike-orders-creative` | `79e0829` | `be/strike-orders-political-synergy` @ `cc65c76` |
| Frontend | `fe/strike-orders-creative` | `5e1543d` | `fe/cell-strike-orders` @ `03e9240` |

Worktrees: `~/workspace/worktrees/be-strike-creative`, `~/workspace/worktrees/fe-strike-creative`.

## What was built

1. **New `creation` political task type** (~1 in 6 political slots, same
   deterministic per-cell rotation; `STRIKE_POL` 6 entries, `strikePolIndex`
   extracted, `strikeCreationFallback`).
2. **Live entity binding** (`strikeBindEntities`): studio_plugins registry
   contract read (defensive — registry not landed) + `races`/`measures`
   tables; state-scoped first, then federal; stale (>180d) / factless
   entities never bind. Bound set + `why_now` (verbatim live copy) + `bounty`
   hint ride in `task_ref`.
3. **Bind-or-fallback** at generation AND reroll: unbindable creation →
   deterministic next task type, never a dead card.
4. **`strike_forge_log`** (POST, member-only, AUTH_MAP `cell:strike_forge_log`
   + POST_ONLY, zero XP): entity-bound completion receipt, validated against
   the week's bound set, INSERT OR IGNORE (exactly-once).
5. **Completion probe** for `creation` in `strikePolDone` (defensive:
   missing table → incomplete, never crash).
6. **Frontend:** creation card (TARGET / WHY NOW / bounty hint-or-generic-link
   / zero-XP note / FORGE THIS), fight-aware entity pick (`PF.pickFight()`),
   `pf-forge-launch` handoff (localStorage + CustomEvent, `tab:'political'`),
   forge arrival state (FORGING AMMO FOR banner, headline pre-load, POLITICAL
   tab auto-switch hook), download tags `pf-poster-made` + POSTs the forge
   log + STRIKE LOGGED toast.
7. **Migration** `migrations/v75_cell_strike_forge_log.sql` (self-healing DDL
   in-module too).
8. **DST fix (pre-existing bug, flag to political-synergy coordinator):**
   `strikeWeekIndex` used UTC-ms floor division → the week after
   spring-forward reused the rotation index (political type repeated two
   weeks running). Now calendar-day math. Only the spring-forward week
   changes value vs the old formula.

## Spec checklist (for the audit bar)

- [ ] Rotation: creation ~1/6, never repeats, deterministic (§1)
- [ ] No invented political facts — all entity fields from live rows
- [ ] `strike_forge_log`: auth-gated, member-only, fail-closed, zero XP
- [ ] FE→BE contract match: `strike_forge_log` params
      (cell_id, week_start, entity_kind, entity_id) vs backend validation
- [ ] No backslash damage in touched files; doubling rule honored
- [ ] Built code present in bundles (bundle-cells, bundle-home, bundle-create-h)
- [ ] No Squarespace edits; Jeanine Pirreaux untouched; no banned terms
      (lexicon gate passes in the FE harness)
- [ ] XP only via `xpGrant()` — the new paths mint none (see XP_TABLE.md)
- [ ] Cross-branch: does not clobber `be/strike-orders-political-synergy`
      in-flight work; DST fix is the one shared-code touch (flagged above)

## Test results (run by builder)

- Backend: `tests/cell-strike-orders-creative.test.mjs` **48/48 pass**;
  existing `tests/cell-strike-orders.test.mjs` **57/57 pass** (no regressions).
- Frontend: `scripts/verify-strike-orders-fe.js` **50/50 pass** (34 existing + 16 new).
- `node --check` clean on all touched source files.

## Parallel gates status (file your sign-off/blocker to the branch)

- **Psych (Behavioral Design):** PENDING — loop copy in `LOOP_COPY.md`
  (FE worktree root). Nothing is final until Psych signs.
- **Economy Desk:** PENDING — XP table in `XP_TABLE.md` (BE worktree root).
- **Security:** folded into QC per org chart (auth gates + fail-closed review).
- **QC / Audit:** THIS REQUEST.

## Known dependencies / non-blockers

- The Forge **POLITICAL tab** is the release train's build (pick-fight
  consumer #1). The launch payload carries `tab:'political'` and the forge
  auto-switches when the tab exists; until then the confirmation banner on
  the POSTER tab is the arrival. Not a QC blocker — flagged for the
  coordinator.
- `be/studio-plugins` registry not landed: binding reads its contract
  defensively; `races`/`measures` are the live source on this branch.
  Bills/reps light up when `be/legislation-tracker` / `be/congress-directory`
  land (5-line addition at `strikeRaceEntities`).

## Merge-order note for Release Eng (after QC PASS + CEO approval)

1. `be/strike-orders-political-synergy` lands first (it is the base).
2. `be/strike-orders-creative` rebases onto it (touches shared
   `strikeWeekIndex`/`STRIKE_POL` — expect a clean rebase; the DST fix
   should be offered back to the synergy branch).
3. `fe/strike-orders-creative` after `fe/cell-strike-orders`.
4. Apply `migrations/v75_cell_strike_forge_log.sql` manually at deploy
   (production D1 has no auto-migrations); confirm no v75 collision at
   integration.
