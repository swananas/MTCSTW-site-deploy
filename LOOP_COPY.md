# Detonation Themes — Loop Copy Drafts

**Psych (Behavioral Design) review: PENDING** — none of the copy below is
final. Do not ship to the site until Psych signs off.

Workstream: `fe/nuke-political-themes` (banner: `v1.4.3/games/nuke-themes.js`).
Backend source of truth: `nuke_theme_get` (branch `be/nuke-political-themes`).
Every fact the banner shows is traceable to the legislation tracker row —
the theme only fires on a REAL scheduled floor-vote date, never invented.

## 1. Theme banner

| Slot | Draft copy | Source |
|---|---|---|
| Kicker | 🎯 TODAY'S TARGET | static |
| Headline | **H.R. 22** — floor vote today | `{bill.number}` + "floor vote today" (vote date = row's `floor_vote_date`) |
| Key fact 1 | Floor vote scheduled today (2026-10-05). | row `floor_vote_date` |
| Key fact 2 | Status: passed the House. | row `status` → label map |
| Key fact 3 | Sponsor: Rep. Chip Roy [R-TX-21]. | row `sponsor_name` (falls back to `stuck_in` when no sponsor) |
| Honesty line | Target set from the legislation tracker's verified floor-vote schedule — never invented. Full title: Safeguard American Voter Eligibility Act. | static + row `title` |
| Source link | congress.gov ↗ | row `source_url` |

Voice: punchy, movement register ("TODAY'S TARGET", "Detonate on this").
The headline names the bill, the action (floor vote), and the when (today) —
the inform requirement, no click needed to learn the facts.

## 2. CTAs

| Button | Draft label | Destination (every button lands somewhere real) |
|---|---|---|
| Primary | ⚡ DETONATE ON THIS | Smooth-scrolls to the REAL nuke press button (`[data-nuke-press="1"]`) inside the same `#slr-nuke` block, pulses it with a gold outline, focuses it. The user then taps the actual press button → the existing press flow runs: `nuke_press` POST → +50 charge, `PF.dope.ping("+50 CHARGE — THE BLAST GROWS")`, CHARGED ✓ + streak state, "Your press landed" line, charge-bar fill + tier milestones, `pf-nuke-update` event. The banner never auto-presses — the user's tap on the real button is the consent. If the press button isn't painted yet, brief poll then fall back to the top of the nuke block. No dead ends. |
| Secondary | ⚒ FORGE THIS | Dispatches cancelable `pf-forge-launch` event `{tab:"political", bill_id, bill_number, bill_title, key_facts, source:"nuke-theme"}` + scrolls `#pf-poster` (Poster Forge block) into view. If the Forge block isn't on the page, falls back to the backend `forge_link` URL (`/?forge=political&bill=HR-22#pf-poster`). |

## 3. Detonation confirmation line (themed payoff)

Shown in the banner when the strip reports `pressed=true` while the theme
is active (display only — reuses the strip's `pf_nuke_press_v1` record;
no new XP, no new visuals invented):

> ⚡ CHARGE COMMITTED — your +50 is aimed at H.R. 22 today.

Template: `⚡ CHARGE COMMITTED — your +50 is aimed at {bill.number} today.`

## 4. Forge-landing confirmation

Shown ONLY when the Forge actually pre-loads the bill (it calls
`preventDefault()` on the cancelable `pf-forge-launch` event to say so).
Until the Forge adopts the listener, FORGE THIS only scrolls — it never
claims a pre-load that didn't happen.

> H.R. 22 loaded in the POLITICAL tab — make it loud.

Template: `{bill.number} loaded in the POLITICAL tab — make it loud.`

## Dark-pattern risk review (for Psych)

1. **Fake urgency is banned — and structurally impossible here.** The theme
   fires ONLY on a real scheduled date in tracker data (backend-enforced:
   exact `floor_vote_date` match + ≤7d `updated_at` freshness + fail-closed
   on DB errors). "Floor vote today" states a verified fact; it is not
   manufactured scarcity. Copy must never add "last chance" / "only hours
   left" language — the date alone carries the timeliness.
2. **No invented stakes.** Nothing in this loop may imply a nuke press
   changes the vote outcome. The themed confirmation says the +50 is
   "aimed at" the bill — a targeting metaphor inside the acknowledged
   fiction (the site already labels the blast math "the fiction stays").
   The existing honesty line ("the meter proves we showed up — not that
   the algorithm obeyed") still governs.
3. **Consent preserved on the primary CTA.** DETONATE ON THIS routes to the
   real press button rather than one-click auto-pressing. The press itself
   is idempotent per Chicago day, but the extra tap keeps the action
   deliberate.
4. **No false pre-load claims.** The forge-landing confirmation fires only
   on the Forge's explicit `preventDefault()` signal. Pre-adoption, the
   button scrolls silently.
5. **No new XP, no new currency, no pay-to-win surface.** The loop reuses
   the existing press economy (+5 XP via the existing `nuke_press` leg,
   unchanged) and existing dopamine (dope.ping, streak line, charge bar,
   milestone pings). Nothing here invents a reward.
6. **Accessibility:** the press-button pulse honors
   `prefers-reduced-motion`; all banner text is real DOM text (not
   image-only); buttons are native `<button>` elements.

## Open questions for Psych

- Is "DETONATE ON THIS" too violent-adjacent for the theme context, or is
  it on-brand for the Media Nuke fiction? Alternative: "AIM THE BLAST".
- Does the themed confirmation line ("your +50 is aimed at H.R. 22")
  risk implying vote influence to a casual reader? Tighter alternative:
  "CHARGE COMMITTED — today's blast is dedicated to the H.R. 22 fight."
- Forge-landing toast wording once the Forge adopts the listener.
