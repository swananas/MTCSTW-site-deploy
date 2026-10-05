# Follow the Money — Frontend Integration Notes
Branch: `fe/follow-the-money` (from `origin/fe/wall-of-shame`). Staged only — no merge, no deploy.

## What shipped (frontend only)

- `v1.4.3/core/money-tab.js` — `PFMoneyTab.mount(bioguideId, container)`.
  Money tab for the legislator detail view: cycle totals, small-dollar vs
  large-dollar split bar, top-10 donors, top industries (with an
  "ESTIMATED FROM EMPLOYER DATA" badge where `estimated=1`), source footer.
  DOWNLOAD/SHARE buttons route through the existing `PF.PHQShare` flow.
- `v1.4.3/core/money-vote-card.js` — `PFMoneyVote.mount(billId, container)`.
  Vote-vs-donor card for the bill detail view. Header copy is exactly
  **"Who funded both sides"**; per-row body copy is exactly
  **"received $X from [industry]"**; methodology caption is always shown
  verbatim: **"Donations are correlated with votes, not proof of cause."**
  Members with `money:null` render vote-only rows (never hidden). No share
  buttons on this card (read-only display).
- `v1.4.3/core/share-image-phq.js` — new `phq-money` painter ("FOLLOW THE
  MONEY", 1080×1350): legislator name, cycle totals, top-3 donors (or top-3
  industries when no donors), FEC source + retrieval date, callsign stamp,
  JOIN THE FIGHT. Sibling workers' painters (`phq-trades`, `phq-pac`,
  `phq-corp`, `phq-ledger`, `phq-boycott`) do not collide.
- `scripts/verify-money-fe.js` — full verification (116 checks).
- Both new modules registered in `build/bundle-core.js` (`pages/bundle-pages`),
  right after `core/wall-of-shame.js`. Bundles rebuilt green.

## One-line hooks (Release Eng wires these — the modules never auto-mount)

```js
// Legislator detail view (money tab):
PFMoneyTab.mount('J000288', document.getElementById('legislator-money-slot'));

// Bill detail view (vote-vs-donor card; fe/legislation-tracker sibling branch):
PFMoneyVote.mount('H.R.3633', document.getElementById('bill-money-slot'));
```

## Fail-soft contract

- Endpoint down / `{ok:false}` / malformed response → the mount section hides
  itself entirely (never a broken widget). `mount()` returns `false` on
  missing args.
- Money tab, `ok:true` but no summary → honest empty state:
  "Money data isn't loaded yet — no figures shown rather than guesses."
  (section stays, source footer still printed).
- Vote card, `ok:true` but zero rows → "No vote records returned for this bill."
- No invented figures anywhere: missing fields render as em-dash; every
  number shown carries its source ("Source: FEC · {cycle} cycle ·
  retrieved {date}").

## Kill switches

- `?pf_off=money-tab` (or `localStorage pf_disabled_v1='["money-tab"]'`) —
  `PFMoneyTab` is never exposed.
- `?pf_off=money-vote` (or `localStorage pf_disabled_v1='["money-vote"]'`) —
  `PFMoneyVote` is never exposed.
- The `phq-money` painter rides the existing `?pf_off=phq-share` module kill.

## Backend contract expected (parallel backend wave, be/follow-the-money)

```
?action=money_legislator&bioguide_id=J000288 ->
{ok, legislator:{bioguide_id,name,chamber,party,state}, cycle, retrieved,
 summary:{total_raised,total_spent,cash_on_hand,small_dollar,large_dollar},
 top_donors:[{name,employer,amount}] (up to 10),
 top_industries:[{industry,amount,estimated}]}

?action=money_vote_card&bill_id=H.R.3633 ->
{ok, bill:{bill_id,title}, methodology,
 rows:[{bioguide_id,name,chamber,party,state,vote,
        money:{industries:[{industry,amount}]} | money:null}]}
```

Until the backend ships FEC data, all views show the honest empty states —
nothing is rendered from guesses.

## XP wiring table — Economy Desk sign-off: PENDING

| Surface | XP leg | Amount | Frequency | Proof | Notes |
|---|---|---|---|---|---|
| Viewing money tab | none | 0 | — | — | Read-only. No read-XP leg fires: `core/read-xp.js` only anchors `#pf-readxp` / Top Stories / Ammo surfaces; the money tab renders `.pf-mt` and never touches those selectors. |
| Viewing vote-vs-donor card | none | 0 | — | — | Read-only. Same anchoring reason (`.pf-mv`). |
| Sharing a money card (`phq-money`) | existing `create_share:` | +5 | 2/day | server-verified proof | Rides the EXISTING backend leg — same as wall-of-shame cards. No new keys, no new amounts. |
| Downloading a money card | none | 0 | — | — | Save-only; no XP leg attached. |

No XP code exists in the frontend bundle (grep-verifiable: `/\bxp\b/i`
absent from both new modules on the comment-stripped view; verified in
`scripts/verify-money-fe.js`).
