# /money CTA Copy — Psych Review Routing

Branch: `fe/money-page` (2026-10-05). Psych holds veto on CTA copy per the
acting-CEO directive. Nothing below ships to production without Psych sign-off.

## Standing copy contract (already approved in prior waves)
- "THE MONEY BEHIND THE VOTE" — page lede (money-page.js).
- Correlation line: "Donations are correlated with votes, not proof of cause."
  Never "bought by" — always "received $X from". (Enforced by verify-money-page.js.)
- Share-image CTA standard: "JOIN THE FIGHT." on every share image.

## Copy needing Psych approval (new in this wave)

| # | Copy | Location | Psych question |
|---|------|----------|----------------|
| 1 | "Follow the Money" (nav label) | page title / hub tab | Provisional per directive — approve or replace |
| 2 | "WALL OF SHAME" (section + painter) | money-page.js §, wall-of-shame.js, phq-wallshame | Shame framing — approved in the wallshame wave; re-confirm at page scale |
| 3 | "FIND YOUR REP" (ZIP lookup CTA) | money-page.js hero | Action CTA — approve tone |
| 4 | "FORGE THIS" (poster forge button) | money-page.js, pf_forge_prefill_v1 stash | Approve verb |
| 5 | "BILLIONAIRE LEDGERS" (section header) | money-page.js | Note: painter badge keeps sibling contract "THE LEDGER" |
| 6 | "DONOR BOYCOTTS" (section header) | money-page.js | Boycott framing — provisional, needs Psych call |
| 7 | "CORPORATE PLAYBOOK" (section header) | money-page.js | Painter badge uses "THEIR PLAYBOOK" — confirm which |
| 8 | "TRADES ON THE HILL" (section header) | money-page.js, phq-trades | Legal-hold empty state — confirm framing while under hold |
| 9 | "SUPER PAC ALERTS" (section header) | money-page.js, phq-pac | Legal-hold empty state — confirm framing while under hold |
| 10 | "THE REST OF THE MONEY MAP" (deep-8 section) | money-deep8.js | Planned-slot framing — confirm |
| 11 | Hub mission copy (5 companions) | money-page.js exits | Provisional per directive — approve or replace |

## Empty-state copy (legal hold — honest, no data invented)
- Trades: "Congressional stock-trade disclosure is under legal review. No
  figures shown rather than invented." (money-trades.js, phq-trades)
- PAC alerts: "Super PAC alert feed is under legal review…" (money-pac-alerts.js)
- Deep-8 slots: "PLANNED — no data yet. This slot is reserved…" (money-deep8.js)

## Banned terms (enforced by verify scripts)
`donate` (except the FEC disclaimer "corporations can't donate directly —
this is employee giving"), `shanetheswan`, real names.
