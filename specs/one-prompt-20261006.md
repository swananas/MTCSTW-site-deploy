# SPEC — One-Prompt Onboarding (fe/one-prompt-onboarding)

**CEO directive 2026-10-06 ~21:35/21:40 CDT:** "Too many pop ups via user reports."
"An initial user should have one clear prompt that integrates them into the site
effortlessly." → **Build it** (approved 21:40 CDT).

Branch stays OFF the integration lines (frozen for the final QC gate) until the
CEO decides whether it rides this push or the next.

## Problem (popup audit 2026-10-06)
A brand-new iOS visitor gets ~5 interruptions in the first 30s on the homepage
(storage bar, first-minute card, adventure-chooser modal, INSTALL APP button at
t+4s, guided-onboarding fullscreen at t+30s — the modal and fullscreen can
overlap), ~10 overlay firings across a homepage → game → /cells session. Each
module was built sensibly alone; nobody budgeted them together.

## Design: THE ONE PROMPT
- New module `v1.4.3/core/37-one-prompt.js`.
- Single fullscreen first-run card, **once ever** (`localStorage pf_oneprompt_v1`),
  ~5s after homepage load (`#pf-v2` present), callsign-less only, never in the
  Squarespace editor.
- One headline stating what the site is, **one action: "CLAIM YOUR CALLSIGN"**
  → runs the existing `PF.requireCallsign` claim flow (same register POST,
  same +20 enlisted leg, same `pf-callsign-claimed` event — nothing new).
- Dismiss ("just looking") → `pf_oneprompt_v1='dismissed'`, never shows again.
- After claim: the existing rites arbitration fires on `pf-callsign-claimed`
  (untouched — still exactly one card). Then pick-your-fight + first mission
  continue **inline** as a homepage checklist — no more modals.
- The existing "NEW HERE" entry chip stays as the re-entry path (inline,
  user-initiated — keep per audit).
- Zero new XP. Zero new backend actions. Measurement events only:
  `pf-oneprompt-shown`, `pf-oneprompt-claim`, `pf-oneprompt-dismissed`.
- KILL: `?pf_off=one-prompt` or `localStorage pf_disabled_v1='["one-prompt"]'`.

## Inline checklist (`#pf-oneprompt-checklist`, before `#pf-v2`, homepage only)
1. **PICK YOUR FIGHT** → opens `PF.pillars.openChooser()` (tap; guarded).
2. **CLAIM YOUR CALLSIGN** → `PF.requireCallsign` (hidden once claimed).
3. **FIRST MISSION** → fan-vote CTA (`#pf-vote` anchor; absorbs the
   first-minute card's job).
- Steps auto-check: claim via `pf-callsign-claimed`, fight via
  `PF.pillars.pathNames().length > 0`, mission via `pf-vote-cast`.
- Dismiss X → `pf_checklist_v1='dismissed'`, never again. All done → card
  collapses away.

## Auto-fire kills
| Module | Change |
|---|---|
| `games/guided-onboarding.js` | Kill t+30s auto-launch. Chip + `?onboard=1` + `PF.startOnboarding()` stay. |
| `core/31-pillars.js` | `maybeFirstRun()` no longer auto-opens the adventure chooser. Row tap (`[data-pf-path-change]`) still opens it. |
| `core/24-first-minute.js` | Stands down when one-prompt is active (`!PF.skip('one-prompt')` → return). Resumes as fallback if one-prompt is killed. |
| `core/10-convert.js` | Enlistment nudge killed (early `return false`). Victory lap `lapCount>=3` → `>=1` (max 1/session). |
| `core/13-flow.js` | Floating "◈ Next" chip removed. Inline "NEXT UP" strips stay. |
| `v1.4.3/pwa/install.js` | iOS INSTALL APP: 2nd visit (`pf_pwa_visits_v1>=2`) OR after first engagement (`pf-callsign-claimed` / `pf-vote-cast` / `pf-order-checkin` / `pf-xp`). No longer t+4s on cold load. Android `beforeinstallprompt` path untouched. |

## Backstop: `PF.popupQueue` (defined in 37-one-prompt.js)
- `request(id, kind)` — kind `'auto'`|`'user'`. Denies when another overlay is
  open (one at a time). Auto-fire additionally capped at **3 per session**
  (`sessionStorage pf_popup_budget_v1`); the one-prompt itself is exempt.
- `release(id)` — clears only when `id` holds the lock (idempotent).
- Wired: one-prompt card, guided-onboarding `open()`, pillars `openChooser()`,
  10-convert `cardShell()`. Rites keep their own arbitration (already one-card;
  intentionally separate). Consumers degrade gracefully when `PF.popupQueue`
  is absent (old behavior).

## Keep (untouched)
Storage notice, rites arbitration, pinup reveals, "NEW HERE" chip, all
user-initiated modals (callsign claim, recovery, confirm/prompt, share sheets,
iOS install guide, push opt-in).

## Build registration
`build/bundle-core.js` CORE_FILES += `core/37-one-prompt.js` (after
`core/36-wildfinds.js`). Rebuild `v1.4.3/core/bundle-core.js` +
`v1.4.3/core/bundle-core-slr.js` via `node build/bundle-core.js`.

## QC (independent pass on the branch)
`scripts/verify-one-prompt.js`: node --check on new/changed files; kill-switch
checks; zero-XP assertion (no xpGrant/xp_ledger/new POST in 37-one-prompt.js);
once-ever persistence (localStorage keys set on dismiss/claim); auto-fire kills
verified (no setTimeout auto-open in guided-onboarding, no openChooser in
maybeFirstRun, nudge dead, chip block gone, iOS gate present); queue unit
behavior via vm (one-at-a-time, budget cap, exempt one-prompt, idempotent
release); existing flows intact (rites listener, requireCallsign path,
NEW HERE chip).
