# Poster Forge POLITICAL tab — contract assumptions for integration

Branch: `fe/studio-political-tab` (worktree `~/workspace/wt-studio-political-tab`).
These are the assumptions the tab was built against. The backend
(`studio_plugins_list` manifest) and painter workstreams are parallel and
unmerged at build time — integration must verify each item before ship.

## 1. Backend manifest: `studio_plugins_list` (NOT YET OBSERVED)

The tab calls `GET ?action=studio_plugins_list` (JSONP, same convention as
every other game silo). Assumed response shape:

```json
{ "ok": true, "plugins": [
  { "id": "bill", "label": "Bill", "available": true,
    "search_action": "bills_list", "detail_action": "bills_get",
    "item_key": "bills", "id_param": "bill_id",
    "template_ids": ["tpl-bill-status"], "source": "congress.gov" }
] }
```

- `id` is one of: `bill scorecard race poll prediction rep nonprofit campaign`.
  Unknown ids are SKIPPED (nothing to map them with).
- Every field except `id` is optional; missing fields fall back to the
  hardcoded defaults in the module (see §3).
- `available:false` → button disabled with "data unavailable", not selectable.
- Manifest missing/unavailable/malformed → hardcoded fallback, all
  `available:true`; each search then fails soft individually.
- `template_ids[]` selects among the tab's registered templates
  (`tpl-bill-status`, `tpl-scorecard`, `tpl-race`, `tpl-poll-results`,
  `tpl-prediction`, `tpl-rep-contact`, `tpl-nonprofit`, `tpl-campaign`).
  Unknown template ids are skipped.

## 2. Search/detail actions (assumed = existing list endpoints)

| plugin | search_action (list) | detail_action | item_key | id_param |
|---|---|---|---|---|
| bill | `bills_list` | `bills_get` | `bills` | `bill_id` |
| scorecard | `reps_list` | `scorecard_get` | `reps` | `bioguide_id` |
| race | `races_list` | `races_get` | `races` | `race_id` |
| poll | `polls_list` (+`status=closed`) | `polls_get` | `polls` | `poll_id` |
| prediction | `predict_list` | — (re-runs search, matches id) | `bills` | `bill_id` |
| rep | `reps_list` | — (re-runs search, matches id) | `reps` | `bioguide_id` |
| nonprofit | `nonprofits_list` | — (re-runs search, matches id) | `nonprofits` | `nonprofit_id` |
| campaign | `petition_list` | — (re-runs search, matches id) | `petitions` | `petition_id` |

- Search sends `{q: <query>}` (+ plugin `search_params`). If a list endpoint
  ignores `q`, results render unfiltered (top 6) — fail-soft, never broken.
- `reps_list` is ALSO client-filtered by name (mirrors the congressional
  directory silo's own behavior).
- Detail responses are read as `j.detail || j.bill || j.race || j.poll ||
  j.scorecard || j.rep || j.nonprofit || j.petition || j.prediction`.
- Item lists are read as `j[item_key] || j.items || j.results`.
- Prediction: only SETTLED picks are listed (both pick and result present);
  `j.record || j.my_record || j.caller_record` supplies `{wins, losses}`.

Field names mapped per plugin are the union of field spellings observed in
the sibling silo branches (`fe/legislation-tracker`, `fe/races-tracker`,
`fe/nonprofits-directory`, `fe/network-polls`, `fe/congress-directory`,
`fe/congress-scorecards`) and base `civic.js` — e.g. bill
`number|bill_number`, `title|short_title`, `sponsor_name|sponsor`,
`stuck_in|stuck`, `support_count|supports`. If the real backend renames a
field, the mapper degrades to null (painter renders em-dash), never invented.

## 3. Painter data contracts (assumed — painter workstream is parallel)

Existing painters (contracts taken from `core/share-image-phq.js`):
- `phq-pressure`: `{title, target, demand, signatures, signaturesGoal}`
- `phq-scorecard`: `{name, state, party, grade, verdict, votes[3]{bill, vote, for_us}}`
- `phq-prediction`: `{statement, outcome('correct'|'missed'), wins, losses}`

New painters (ids per CEO brief; field shapes ASSUMED by this tab — the
painter workstream must confirm or the preview fails soft with
"poster engine isn't on this page yet"):
- `phq-bill-status`: `{number, title, chamber, status, stage, sponsor,
  lastAction, lastActionDate, supportCount, opposeCount}`
- `phq-race`: `{office, state, district, seat, chamber, level,
  candidates[{name, party}], rating, ratingSource, ratingDate, stakes, summary}`
- `phq-poll-results`: `{question, status, closesAt, totalVotes,
  options[{label, votes, pct}]}`
- `phq-rep-contact`: `{name, state, party, chamber, district, phone}`
- `phq-nonprofit`: `{name, mission, city, state, website, ein, scope}`

Known gap filed for the painter workstream: `phq-scorecard` renders
`for_us:null` as a red ✗. The scorecard API supplies no `for_us` judgment,
so the tab passes null (honest) — the painter needs a tri-state
(unknown → em-dash) or the scorecard poster mislabels votes. Likewise
`grade`/`verdict` have no backend feed → passed as null → em-dash.

## 4. Honesty-rail inputs (backend-provided)

- Stale: `item.stale === true` (observed on race rows in `fe/races-tracker`).
  Any plugin's detail/item carrying it triggers the stale banner.
- Source line: `detail.source || item.source || rating_source`, date from
  `source_date || updated_at || updated || rating_date`, else fetch date.
  Per-plugin default source labels (used only when the response carries
  none): bill/scorecard/rep → `congress.gov`; race → `PFN Race Desk`;
  poll → `PFN Network Polls`; prediction → `PFN Predictions`;
  nonprofit → `IRS / ProPublica Nonprofit Explorer`; campaign → `PFN Campaigns`.

## 5. XP wiring (Economy Desk correction 2026-10-05 — VERIFIED)

The tab dispatches zero XP events and makes zero grant calls (asserted by
`tests/poster-forge-political.test.cjs`, static + runtime).

| Action | Existing leg | Amount (existing leg) | Note |
|---|---|---|---|
| generate-via-plugin → SHARE | `pf-share-image` via `PF.PHQShare.share` → `PFShare.shareImage` → `creditShare(gameId,'share')` | 1 XP + 2 PTS (`XP_DEFAULTS`/`PTS_DEFAULTS` in `core/05-tally.js`), i.e. `award("share",1,"daily")` | Once per day per device (`pf_shareimg_<YYYY-MM-DD>` localStorage); never on cancel/fail |
| generate-via-plugin → SAVE | `pf-share-image` via `PF.PHQShare.save` → `PFShare.saveImage` → `creditShare(gameId,'save')` | 1 XP + 2 PTS — SAME leg | Gate is kind-agnostic: Share+Save same day = **+1 XP total**, not +1 each |
| plugin-pick / search / template-pick / preview paint | — | 0 | Pure UI; no events |
| `pf-poster-made` (normal forge Download leg) | — | — | NOT fired by this tab (no download button); adding it would be a second grant path |

Double-grant verification: `share-image-phq.js go()` calls `shareImage`/
`saveImage` exactly once per user action; each completion path in
`core/share-image.js` calls `creditShare` exactly once (cancel/fail paths
call it zero times); `creditShare`'s day-key collapses share+save into one
`pf-share-image` event. The tab adds no wrapper around `PF.PHQShare.share`/
`save` — direct calls only.

## 6. Kill switches

- Whole tab: `?pf_off=poster-forge` (module returns before boot; pane never
  instantiates without the forge).
- Per plugin: `?pf_off=plugin-<id>` (e.g. `?pf_off=plugin-bill`) hides that
  plugin's button. Handled by `PF.skip`, so `localStorage pf_disabled_v1`
  entries work too.

## 7. Integration checklist before ship

- [ ] `studio_plugins_list` live → verify shape against §1 (or update tab).
- [ ] Painter workstream confirms §3 field shapes (esp. the five new painters).
- [ ] `phq-scorecard` tri-state for `for_us` (or accept ✗-for-unknown).
- [ ] Regenerate bundles with terser (`node build/bundle.js`) — this branch
      registers `poster-forge-political.js` in `bundle-home` + `bundle-create-h`
      but committed bundles were NOT regenerated (no terser in worktree).
- [ ] Internal QC sign-off (this build's self-QC: 56/56 smoke tests pass).
- [ ] CEO approval — DO NOT merge/deploy without it.
