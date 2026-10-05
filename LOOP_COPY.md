# Strike Orders — Creation Loop Copy

**Psych (Behavioral Design) review: PENDING** — none of the copy below is
final. Do not ship to the live site until Psych signs off.

Workstream: `be/strike-orders-creative` + `fe/strike-orders-creative`
(2026-10-05). Every outbound loop here is informative AND carries a
call-to-action back to the site with a dopamine payoff on arrival — no dead
ends (CEO standing directive).

## The loop

Cell HQ strike-orders panel → FORGE THIS → Poster Forge (confirmation state)
→ download → strike logged (entity-bound, zero XP) → cell progress checkmark.

## 1. Order card (Cell HQ → strike orders panel)

- **Headline:** `FORGE A STRIKE POSTER`
- **Badges:** `POLITICAL STRIKE` (gold) + `CREATION`
- **Target line:** `TARGET: {entity title}` — e.g. `TARGET: U.S. Senate: Abdul El-Sayed vs Mike Rogers`
- **Why-now line:** `WHY NOW: {live copy}` — verbatim from the entity's live
  `stakes`/`summary` field, e.g. `WHY NOW: The most important progressive bet
  on the map.` Never invented: when the entity carries no live why-now copy,
  the line is omitted (not filled in).
- **Detail:** `Forge one propaganda poster about {entity title} in the Poster Forge.`
- **CTA button:** `FORGE THIS →`
- **Zero-XP note:** `The order itself grants zero XP — the forge's normal poster/share legs pay out when you create.`
- **Bounty line, entity-matched bounty exists:** `This also counts toward the {bounty title} bounty — open the bounty board →`
  (link: `/create?tab=bounties`)
- **Bounty line, no match:** `Bounty hunters: check the bounty board for poster bounties on this fight.`
  (link: `/create?tab=bounties` — generic, never invents a bounty)
- **Fail-soft (no bound entities client-side):** button becomes `OPEN THE FORGE →`
  (link: `/create#pf-poster`) — never a dead card.

## 2. Forge landing confirmation (arrival state)

On arrival from FORGE THIS, the Forge shows — above the canvas, red-bordered:

- **Confirmation headline:** `FORGING AMMO FOR: {ENTITY TITLE}`
- **Sub-line:** `Strike order accepted — forge it, download it, share it. Your cell counts it.`
- The entity title is pre-loaded into the Headline field **only if the forge
  is untouched** (empty or the default `EAT THE RICH`) — never clobbers work
  in progress.
- **POLITICAL tab:** the launch payload carries `tab: 'political'` and the
  forge auto-switches to `[data-ptab="political"]` when that tab exists. The
  tab itself is the release train's build (pick-fight consumer #1) — until it
  lands, the confirmation state on the POSTER tab is the arrival.

## 3. Completion payoff

- **On download (strike-launched session):** toast `STRIKE LOGGED — your cell counts it.`
- **Cell HQ card:** the existing strike progress UI flips the member's mark to
  ✓ and the aggregate to `x/y members completed` — the visible payoff.
- **XP legs (existing, unchanged):** the download fires `pf-poster-made` →
  +1 XP once/day (enlistment-ranks `poster_<date>`, idempotent ledger key);
  sharing fires `pf-share-image` → +1 XP/day. The strike order mints zero XP
  of its own; the `strike_forge_log` receipt is XP-free by construction.
- **Bounty eligibility** is surfaced on the card (see §1), not invented.

## Copy rules honored

- No invented political facts: every entity field (title, why-now, state)
  comes from a live row; stale (>180d) or factless entities never bind.
- The word "donate" appears nowhere.
- No new XP mechanics, no new currencies.
- Hostile strings are escaped at every interpolation (card body + data attrs).

---
*Drafted 2026-10-05 by the Strike Orders Creative Task Builder. Awaiting Psych review.*
