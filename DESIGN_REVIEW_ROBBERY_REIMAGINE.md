# DESIGN IA REVIEW — Robbery Report Reimagine Spec
**Spec:** `~/workspace/hidden/specs/robbery-report-reimagine-spec-20261010.md` (News Desk, dir-20261010-011235-21553)
**Reviewer:** Design Team lead, ws-imp-loop-design-map-20261010 · **Date:** 2026-10-10 ~05:45 CDT
**Verdict:** **APPROVE §5 IA with refinements** (7 notes below). No IA rework needed; refinements are additive.

## §5.1 Surface — APPROVE
Nesting verdict journalism inside `#pf-karl-home` (no new IA node) is correct. LEAD / DOCKET / LEDGERS is a sound block order.
**Refinement R1 (bloat guard):** the homepage currently carries the raw discovery feed + KARL NOTICED + beefy cards + 4-pillar strip (74KB). The DOCKET must not stack on top of all of it. Design rule: LEAD (1 card) + DOCKET (3–5 verdict cards) sit ABOVE the existing raw feed; the raw feed remains below as **"THE WIRE — uncurated discovery"**, clearly labeled. Curated verdicts up top, raw discovery below — condense-don't-cut applied to IA. **Budget line: verdict layer ≤15KB inline** (standing per-page budget).

## §5.2 Verdict-card anatomy — APPROVE with refinements
1. **R2 (badge treatment — answers CEO open question #4):** verdict badge = pill, verdict word, color per §1.1 (green/red/amber/grey). Tap → bottom sheet with the verdict definition (reuse the drill-sheet interaction pattern; no new species).
2. **R3 (receipts default):** receipts **collapsed by default** on mobile, one tap expands. Cards stay scannable; the receipt is one tap away, never more.
3. **R4 (CTA row):** add **SAVE** alongside ASK KARL ABOUT THIS / MORE ROBBERIES / share — verdict cards must match the 7-destination feed-card contract (G-D9: server POST, same cardId scheme). A verdict you can't save is a second-class card.
4. Figures inline + tappable → Karl drill-in: conforms to the `data-pf-fig` convention (P-008).

## §5.3 Constraints — APPROVE
**R5 (kill switch):** use `?pf_off=robbery-verdicts` for the verdict layer specifically (granular), under the existing `?pf_off=karl-home` umbrella. Matches the P-5/P-7 pattern with finer granularity.

## Blossom cross-pollination check (adoption spec §3) — PASS with 2 notes
Checks 1–11 PASS (IN/OUT declared, Karl-wired deeply, zero XP, share CTA standard, no-mocks via HONEST-EMPTY, loop-law INFORM/CTA/PAYOFF, failure modes named).
- **R6 (check #12 retro-review):** the two nearest unconnected surfaces are **/create** and **/cells**. A verdict card with no "make propaganda from this" path repeats G2.2. Add `MAKE PROPAGANDA FROM THIS →` (→ `/create`, prefill per P-008c) to the CTA row or as a secondary link under receipts. Cells link: optional per story (only when the verdict names a localizable target).
- **R7 (Psych watch item §7.3):** agree the verdict-mix rule is the structural guard; Design defers the ratio question to Psych but recommends the docket NEVER lead two same-verdict cards in a row at launch (interleave by default).

## CEO open questions — Design input
1. TTLs: no Design objection to 72h / 7-day.
2. LEAD selection: curator's pick (spec default) — Design agrees; algorithmic lead stays as KARL NOTICED beside it (dual-lead, distinct labels).
3. 3–5/day: no objection.
4. Badge treatment: answered in R2.
5. Dual-lead: yes — "THE LEAD" (curated verdict) + "KARL NOTICED" (algorithmic inference), visually distinct, never confused.

## Handoff
News Desk → Implementation Team: §5 is Design-signed with R1–R7. Build specs for the verdict layer must cite this review. Next: PR/Psych independent sign-offs (§7.2/7.3) per the coordinator's routing.

## Addendum R8 — drillDown query synthesis (2026-10-10 ~07:30 CDT, from tip audit)
The live homepage `drillDown(label, value)` synthesizes `q = label + ' ' + value` from card text before calling `karl_query`. This works today, but it violates §4.2's "no invented queries" rule once verdict cards ship with pre-written `karl_drill` entries. **Design rule:** drill entry points must prefer a `data-karl-q` (pre-written query) attribute when present, falling back to synthesis only for legacy cards. One attribute, no new API.
