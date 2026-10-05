# /money Page — Integration Handoff

Branch: `fe/money-page` (from `fe/follow-the-money`), pushed not merged.
Production freeze holds — stage only, no deploys.

## What was built
Context-aware "Follow the Money" frontend: renders as a full page in
`#pf-money` (when the Squarespace /money page exists) and as the 6th interim
tab inside /political-hq (when it doesn't) — no code fork, no cutover deploy.

New modules (all in `v1.4.3/core/`):
- `money-page.js` — `PFMoney` shell: 10 sections, per-section kills, master
  `PF.skip('money')`, AC-return rail, FORGE THIS poster stash
  (`pf_forge_prefill_v1`), deep links `?bioguide=` / `?bill=`, redirect card
  when `money_page_url` site-config is set.
- `money-trades.js`, `money-pac-alerts.js` — legal-hold honest empty states;
  backend endpoint contracts reserved (`money_trades`, 30-day PAC staleness
  suppression).
- `money-deep8.js` — 8 planned-extension slots, honest empty states, per-slot kills.
- Integrated from sibling branches: `money-tab.js`, `money-vote-card.js`,
  `wall-of-shame.js`, `ledger-list.js`, `boycott-list.js`, `corp-card.js`.
- `share-image-phq.js` — 12 painters registered (4 pre-existing + `phq-money`,
  `phq-wallshame` + 6 money-suite: `phq-ledger`, `phq-boycott`, `phq-corp`,
  `phq-votedonor`, `phq-trades`, `phq-pac`).
- `pages/page-mount.js` — `SELF['money']`, `PAGE_ORDERS['pf-money']`,
  `FE_MOUNT_IDS`; `build/bundle-core.js` registrations.

## Test results (all green, run 2026-10-05)
- `scripts/verify-money-page.js` — 44/44 (shell, kills, mount modes, painters,
  copy contract, no-XP, AC rail, forge stash).
- `scripts/verify-ledgers-fe.js` — 75/75.
- `scripts/verify-corpplay-fe.js` — 70/70.
- `scripts/verify-wallshame-fe.js` — 74/74.
- Two real bugs fixed during integration: master kill not checked at shell
  entry; `ledgerMoney`/`ledgerPct` helpers dropped by the painter extraction
  (spending path returned null — caught by the ledgers script).

## Perf budget (for QC Performance Team)
- Money-suite incremental: **+91,775 bytes** unminified in `bundle-pages.js`
  (258,049 → 349,824 vs `fe/follow-the-money`).
- Estimated minified ~55 KB — well under the 220 KB budget on an incremental
  basis. Total page bundle (341.6 KB unminified) exceeds 220 KB, but the base
  was already 258 KB pre-existing; the overage is shared site chrome, not the
  money suite. **Needs QC Performance sign-off before merge.**

## Needs CTO/CEO call
1. **Psych veto**: CTA copy table at `PSYCH_CTA_COPY.md` — 11 items need
   approval (nav label, boycott/shame framing, hub missions provisional).
2. **Legal hold**: trades + PAC alerts render honest empty states until the
   financial-disclosure commercial-use hold resolves. Ordinary FEC/legislative
   reporting is NOT under hold and is live.
3. **Backend contracts**: `money_trades` endpoint doesn't exist yet (reserved);
   deep-8 slots have no backends (planned); vote-section share does a separate
   endpoint fetch for `PFMoneyVote` data.
4. **Squarespace hand-steps** (CEO manual, NOT done): create /money page, add
   `#pf-money` div, add nav link. Until then the interim PHQ tab serves.
5. **Pipeline**: parallel Judgment gates (Psych, Economy, Security, QC+Perf) →
   Release Engineering. Nothing merges without QC pass.

## Loop law / wiring (wiring-map §6)
All §6.1–6.2 cross-links implemented: directory rep donor tabs, races
candidate FEC, bill-detail vote-vs-donor (`PFMoneyVote.mount`), Wall of Shame
slot API (`PFWallShame.mount`), Studio painters (12 registered), AC-return
rail. Zero orphans per verify-money-page.js.
