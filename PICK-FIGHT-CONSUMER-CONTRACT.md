# Pick-Your-Fight — Consumer Contract (release train)

`games/pick-fight.js` (branch `fe/pick-your-fight`). Onboarding preference:
new users pick 1–3 issue areas ("fights") in the callsign-claim flow, one
screen after the home-state picker. Step two of onboarding personalization.

## Storage & privacy
- `localStorage` `pf_pick_fight_v1`: JSON array of area ids. `[]` = skipped /
  no filter. Missing key = never chosen.
- Local only. Never public, never on leaderboards, never shared, no backend
  writes, no XP. Same privacy posture as `pf_home_state_v1`.
- Kill switch: `?pf_off=pick-fight` or `localStorage pf_disabled_v1='["pick-fight"]'`.

## The 12 stable area ids
`voting` Voting Rights & Democracy · `labor` Labor & Workers' Rights ·
`repro` Reproductive Rights · `climate` Climate & Environment ·
`racial` Racial Justice · `lgbtq` LGBTQ+ Rights ·
`immigrant` Immigrant Rights · `criminal` Criminal Justice Reform ·
`healthcare` Healthcare Access · `housing` Housing & Tenants' Rights ·
`poverty` Anti-Poverty & Economic Justice · `watchdog` Watchdog & Accountability

(from the aligned-nonprofits master directory; ids must not be renamed —
consumers filter on them).

## Consumer API (on `window.PF`)
- `PF.pickFight()` → `["voting","climate"]` (fresh copy; `[]` = no filter /
  never chosen — treat both as "no filter").
- `PF.pickFightChosen()` → boolean — true once the user has saved (even empty).
- `PF.setPickFight(arr)` → bool — programmatic save (dedupes, caps at 3,
  drops unknown ids).
- `PF.pickFightNames()` → `["Voting Rights & Democracy", ...]` display names.
- `PF.pickFightOptions()` → all 12 `[id, label]` pairs.
- Event: `document.addEventListener('pf-pick-fight-changed', e => ...)` —
  `e.detail.fights` is the saved array. Fires on every save (claim flow,
  settings widget, clear).

## Consumers (wired by release train, NOT in this branch)
1. **Poster Forge political tab** — pre-filter plugins/templates by fights;
   empty filter = show all. Subscribe to `pf-pick-fight-changed` to refresh.
2. **Strike orders political slot** — prefer fight-relevant tasks; fall back to
   the general political pool when the fight has none.
3. **Ballot center / civic snapshot** — prioritize fight-relevant bills in the
   snapshot; never hide deadlines (deadlines are date-driven, fights only
   reorder/em prize emphasis).
4. **Nonprofit directory** — pre-filter to fight areas; one tap clears back to
   all 12.
5. **Discord ammo drop** (creation weave #7) — label each drop with its area id
   so fight holders get signal; never exclude other areas.

## Rules for consumers
- Fights REORDER/PRE-FILTER only — never hide civic content behind them
  (ballot deadlines, campaign calls, and vote windows stay visible to all).
- Treat `[]` and "never chosen" identically (no filter).
- Unknown ids from storage must be dropped silently (forward-compat).
- No XP, no backend writes, no public display — preference is private.

## Composition with the home-state picker (`fe/home-state-picker`)
- Both are preference-only, localStorage, no backend, no XP.
- Claim box order: state picker select FIRST, fight checkbox grid SECOND
  (`#oPickFight` mount). Settings widgets stack: `#pfPickFightMount` mounts
  immediately AFTER `#pfHomeStateMount` when present.
- Merge order: `fe/home-state-picker` FIRST, then `fe/pick-your-fight`
  (this branch is based on it; both touch `daily-orders.js` claim box).
- Neither module reads the other; no cross-dependency.
