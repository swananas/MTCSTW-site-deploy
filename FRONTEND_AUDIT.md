# Frontend Audit — v1.4.3 (branch main)

Line-by-line audit of `~/workspace/mtcstw-site-deploy/v1.4.3` source files
(`core/*.js`, `games/*.js` excluding `bundle-*.js`, `pages/*.js`, `loader/`),
~27,000 lines. Audited 2026-10-02. Bundle files were excluded from the
source audit but verified for integrity (see §8).

**Method:** full reads of all `core/` and `pages/` files; full reads of
high-risk game files (economy, auth-adjacent, user-content); automated
scans across all 67 source files for dead functions, esc-variant usage,
POST-helper variants, gate styles, storage keys, fetch/JSONP error
handling, innerHTML escaping, template-literal safety, and cross-file
mirror consistency.

## Severity totals

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 5 |
| MEDIUM   | 20 |
| LOW      | 18 |

---

## HIGH

### H1. Callsign normalization split — underscore callsigns mis-keyed in 3 core files
`core/09-referral.js:14`, `core/11-xpledger.js:24`, `core/13-flow.js:20`

The canonical callsign format is `/^[a-z0-9_]{3,20}$/` (underscores legal —
`games/daily-orders.js:631`, `core/14-auth.js:44`). But three core files
strip underscores with `.replace(/[^a-z0-9]/g,'')`:
- `11-xpledger.js:24` — the backend **XP ledger mirror** keys balances under
  the stripped form (`sargedog` instead of `sarge_dog`). `PF.xpBalance`
  queries the stripped form too, so contracts escrow sees the wrong balance
  for any underscore callsign.
- `09-referral.js:14` — `?ref=` attribution and `PF.shareUrl` emit the
  stripped form; backend recruit matching against the canonical form misses.
- `13-flow.js:20` — `cell_mine` JSONP queries the stripped callsign; cell
  membership check misses.
`14-auth.js`, `movement.js:146`, `peoplesbank.js:187,297` keep underscores.
One normalization helper is needed; today the economy silently forks per
callsign spelling.

### H2. Sticky flow layer routes to dead silos — NEXT UP chain permanently stuck
`core/13-flow.js:53-54,67,81`

`nextStep()` routes enlisted in-cell users to `{silo:'bank'}` then
`{silo:'ventures'}`, gated on `pf_bank_seen_v1` / `pf_venture_seen_v1`.
Nothing sets those flags anymore — only the dead `games/bank.js` /
`games/ventures.js` did, and both are excluded from bundles (documented
DEAD in `build/bundle.js`). `scrollToSilo('bank')` finds no `#pf-bank`
element and silently no-ops. Every user who reaches step 3 of the
enlist → cell → war chest → venture chain gets a dead suggestion forever.
The live silo is `peoplesbank` (`pf-ov-peoplesbank`, mount key
`peoplesbank` — `pages/home-v2.js:62`).

### H3. Tally tables drifted from the Do Meter — infight fires never reach the backend
`core/05-tally.js:10,12` vs `games/do-meter.js:35`

The comment on `PTS_DEFAULTS` says "MUST match the PTS table in
games/do-meter.js" — it doesn't:
- `do-meter.js` has `pf-infight-fire:3`; the tally has no `pf-infight-fire`
  anywhere (not in `XP_DEFAULTS`, `PTS_DEFAULTS`, or `TASKS`), so infight
  fires — dispatched at `games/infighting.js:235,264` — are never recorded
  in the site-wide backend totals.
- The tally has `pf-boost-tipped:1`, `pf-checkin:1`, `pf-guess-scored:0`;
  the meter lacks all three.
- `do-meter.js` `LABELS` (line 36) lacks `pf-guess-done`/`pf-checkin`,
  so those types count toward the total but are invisible in the breakdown.

### H4. Tally settle wiring has black holes in both directions
`core/05-tally.js:19`, `games/enlistment-ranks.js:424-436`,
`games/creator-guess.js:120-121`

- `pf-guess-scored` is in `POOL_SETTLED` (so the tally skips the raw event)
  but **no `settle("pf-guess-scored",…)` is ever dispatched** — the backend
  never records guess scores.
- `settle("pf-do-challenge-done",…)` and `settle("pf-do-fullspectrum",…)`
  (`enlistment-ranks.js:435-436`) are dispatched, but the tally's
  `pf-tally-settle` handler drops any event not in `POOL_SETTLED`, and
  neither event is in `XP_DEFAULTS`/`TASKS` — silently discarded.

### H5. Full Deployment double-dips across ledgers on the no-callsign path
`games/service-medals.js:84-108`

When a callsign-less user earns all medals, `fullDeployment()` banks +50 XP
directly into localStorage `pf_ranks_v1` **and** sets `fd_pending`. On
`pf-callsign-claimed`, `flushPendingDeploy()` fires the backend deploy
(+50 XP on the backend ledger). The direct-callsign path gets +50 once
(backend only); the claim-later path gets +50 local **and** +50 backend.
The local grant also bypasses `award()`, so `11-xpledger` never mirrors it
— the two ledgers disagree by design on this path.

---

## MEDIUM

### M1. `pfReportAction` fetch has no `.catch` — unhandled rejection
`core/03-global.js:27` — the `try/catch` around it cannot catch async
rejections. (`core/05-tally.js:26` does it right with `.catch(function(){}.)`.)

### M2. JSONP without timeout in core readers — hung requests leak script tags
- `core/00-bus.js` `seedDayXp` (~line 100): `onerror` only, no timeout (unlike
  `jsonp()` in the same file, which has 12s).
- `core/03-global.js` `pfFetchGlobalTotal` / `pfFetchGlobalTasks`: `onerror`
  only, no timeout, no cleanup timer.
- `core/09-referral.js` `pollCount` and `core/11-xpledger.js` `xpBalance`
  remove the tag on a timer but never resolve — acceptable (fire-and-forget),
  unlike the above.

### M3. `war-card.js` `api()` — the only game JSONP helper without timeout/guard
`games/war-card.js:32-44`: no 12s `setTimeout(finish(null))`, no `done`
guard — a hung request leaves the widget on "loading" forever and a double
callback would fire `cb` twice. Every other game file uses the 12s pattern
(cells.js got this exact fix 2026-10-01).

### M4. Fan Vote crashes on empty roster
`games/fan-vote.js:54`: `var _cutoff = _sorted[9].score;` — if the SLR DB
fails (`PF.ROSTER` = `[]`), `_sorted[9]` is `undefined` and the whole inner
script throws. `slr-roster.js` handles DB failure gracefully; fan-vote does
not.

### M5. `isoWeek()` redefined per-file despite the bus's "must not redefine" rule
`core/00-bus.js` documents `PF.isoWeekKey` as the single copy "games must
not redefine". Redefined anyway in `games/fan-vote.js:65` and
`games/efficiency.js:37`; `core/10-convert.js` has its own non-ISO `weekKey()`
(Sunday-based vs ISO). Three week-numbering schemes coexist.

### M6. Kill-switch ID confusion on dashboard
`games/dashboard.js:9` checks `PF.skip("dashboard")` but its own header
(`:5`) documents `?pf_off=dash`, and `pages/home-v2.js` mounts it under key
`'dash'`. `?pf_off=dashboard` kills staging but not the mount step;
`?pf_off=dash` kills the mount but not staging. (Compare `gov`/`diplo`,
which are consistent.)

### M7. Duplicate JSONP callback prefix — copy-paste
`games/diplomacy.js:28` and `games/dopamine.js:39` both use
`var fn="pfDpCb"+…`. The 1e9 random suffix makes collision unlikely, but
the two silos share a callback namespace — a collision would route one
silo's response into the other's promise.

### M8. Do Meter has bespoke confetti/ping instead of `PF.dope`
`games/do-meter.js:172,177` reimplements confetti + ping. `core/08-dopamine.js`
exists precisely as "one implementation every game uses instead of bespoke
one-off effects"; 7 files use `PF.dope`, do-meter doesn't.

### M9. Backend fields interpolated unescaped in Daily Orders
`games/daily-orders.js:369` (`top.signal`) and `:385` (`p.tipped`) go into
`innerHTML` raw, while the adjacent callsign/name fields use `escHtml`.
Presumably numeric from the backend, but nothing coerces them — one string
value is an XSS hole.

### M10. `propaganda_score.toFixed(1)` with no null guard
`pages/slr-roster.js` (cardHTML) and `pages/slr-catalog.js` (score display +
related creators): one DB row missing `propaganda_score` throws and kills
the entire roster/catalog render. (Related-creators sort also NaNs on
missing scores.)

### M11. Pin-Up Wall medal mirror drifted
`core/06-pinups.js:33` mirrors "games/service-medals.js MEDALS" with 14
entries; service-medals now has 15 (`infight`/`Brawler` added). No pinup
exists for the Brawler medal, and the "All 14 medals in one week" /
`n:35` counts are stale.

### M12. Unescaped slug in creator-guess study links
`games/creator-guess.js` renders `"<a href='/" +missed[mi]+"' …>"` — the
roster slug is not escaped (the display name on the same line is). Operator
data today, but inconsistent.

### M13. Unescaped vote name in reset message
`games/fan-vote.js` `resetVote()`: `v.name` (from localStorage) is
interpolated into `msg.innerHTML` without the `esc()` defined 240 lines
above it. Self-XSS only, but the esc exists and wasn't used.

### M14. Nine files hardcode the old Apps Script backend URL
`games/boost-raid.js:69`, `bracket-board.js:220`, `creator-guess.js:49`,
`efficiency.js:29`, `fan-vote.js:39`, `infighting.js:93`,
`slr-match-quiz.js:53`, `pages/slr-catalog.js:117` hardcode
`…/AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec`;
`games/media-nuke.js:40` uses it as fallback; `games/service-medals.js:18`
uses a **different** deployment ID (`AKfycbxKFGLAsEqn8…`). These will NOT
follow the `PF_BACKEND_URL` flip to Cloudflare. (Transitional by design per
the rollback plan, but the split is now load-bearing and undocumented in
the files themselves.)

### M15. `?pf_off=03-global` doesn't stop the global JSONP fetches
`core/03-global.js:127` gates only the event-listener IIFE;
`pfFetchGlobalTotal()` / `pfFetchGlobalTasks()` already fired
unconditionally at load (lines ~60, ~100).

### M16. `loader/silo-manifest.json` is stale
Documents a v1.1.0-style individual-file load order: lists dead
`games/bank.js` + `games/ventures.js`, omits the three bundles and new core
files (`07-slr-db*.js`, `08-dopamine.js`, `14-auth.js`, `campaign-data.js`),
and claims "v1.4.3 adds bank.js/ventures.js" which `build/bundle.js`
marks DEAD/superseded.

### M17. `core/08-dopamine.js` has no kill switch
Every other core service honors `PF.skip()`; the dopamine lib (and
`00-bus.js`, `07-slr-db-data.js`, `14-auth.js` — infrastructure) don't.
`08-dopamine.js` is a presentation service like the rest and should gate.

### M18. `syncFromServer` — dead path with no error handler
`games/enlistment-ranks.js:77-89`: `BACKEND_URL=""` so it never runs; if it
did, the injected script has no `onerror`, leaking `window[fn]` and the
script tag on failure.

### M19. Catalog pageview beacon pinned to the old backend
`pages/slr-catalog.js:117` falls back to the hardcoded Apps Script URL via
`PF.effApi` (`games/efficiency.js:29`) — pageview analytics bypass the
Cloudflare migration.

### M20. Stale `PF.xpSpend` in header docs
`core/11-xpledger.js` header still documents `PF.xpSpend(amount,key,reason,cb)`
although the footer comment records its removal (2026-10-02, backend
deleted the action as attack surface).

---

## LOW

- **L1.** `core/00-bus.js:14`: `PF.v: '1.4.2'` in the v1.4.3 tree — version drift.
- **L2.** `core/04-ledger.js`: entire file minified to one line — inconsistent
  with repo style, ungreppable.
- **L3.** `core/06-pinups.js:68`, `games/fan-vote.js:133`: `esc()` uses
  `String(s)` so `null` renders as `"null"`; the standard variant uses
  `s==null?"":s`.
- **L4.** POST-helper naming drift: `post()` (standard), `apiPost()`
  (daily-orders), `postX()` (feed.js), `api(action,params,cb,isGet)`
  (contracts.js), `post(type,actionKey,action,params,cb)` (dopamine.js),
  `postW`/`postG` (casino.js), `apiGet`/`apiPostDeploy` (service-medals).
  All route through `PF.authPost` first — behavior is consistent, names aren't.
- **L5.** `esc` naming drift: `esc` (standard, ~40 files), `escHtml`
  (`games/daily-orders.js:161`, identical impl), `pfEsc`
  (`games/poster-forge.js:239`, identical impl). `infighting.js:30,99`
  defines it twice (outer HYPE scope + inner script scope — both used).
- **L6.** `games/boost-raid.js`, `creator-guess.js`, `slr-match-quiz.js` build
  their inner script via string concatenation (`'…'+\n'…'`) instead of
  template literals, and their inner `esc()` escapes only `&` and `<`
  (no `>`, `"`). Works, but fragile and weaker than the standard.
- **L7.** `core/10-convert.js`: `dayStr()` uses UTC (`toISOString`) while the
  XP economy uses America/Chicago (`PF._xpDayStr`) — combo/first-blood day
  boundaries differ from the 50-XP pool boundary by up to a day edge.
- **L8.** `core/07-slr-db.js:55-58`: fallback fetch hardcodes
  `…@main/src/data/slr-master-db.json` instead of deriving the pin.
- **L9.** `fetch(dataURL).then(…)` without `.catch` in
  `games/daily-orders.js:439,762`, `games/do-meter.js:339` (toBlob-missing
  fallback path).
- **L10.** `core/share-image.js` war-bonds REG copy: "War Bonds fund 60% of
  all PF operations" vs the 50/50 split in `games/war-bonds.js` and memory.
- **L11.** `games/war-bonds.js` `WARCHEST` is a hardcoded 4-creator map
  despite the "no hardcoded list" comment two lines above it.
- **L12.** `games/service-medals.js:14`: "all 12 homepage games" comment vs
  15 medals.
- **L13.** `esc()` doesn't strip `javascript:` URLs — used in `href` in
  `slr-catalog.js`, `war-bonds.js`. Operator-controlled data only.
- **L14.** `core/13-flow.js`: strip/chip labels escape only `<` (fixed-label
  map, not user data — defense-in-depth nit).
- **L15.** `loader/pf-loader-v1.1.0.html`: stale v1.1.0 artifact
  (`COMMIT_PLACEHOLDER`, v1.1.0 paths) sitting in the v1.4.3 tree.
- **L16.** `games/infighting.js` HYPE overlay builds a selector from a
  localStorage slug (`[data-eff-score="…"]`) — self-tamper only.
- **L17.** `games/daily-orders.js:644`: claim stores the raw email in
  `pf_identity_v1` localStorage (local-only PII).
- **L18.** `games/daily-orders.js:369` crown + `:385` patrons use data cached
  with no TTL invalidation on backend change (minor staleness).

---

## What's clean (verified, no findings)

- **Bundle integrity (§8 of task):** all 48 non-bundle game files appear in
  exactly one bundle in `build/bundle.js`; no duplicates, no omissions,
  no phantom entries. `bank.js`/`ventures.js` intentionally excluded
  (documented DEAD). Rebuilt bundles are byte-identical to what's checked
  in — bundles are in sync with sources.
- **Template safety:** all staged `<template>` blocks properly closed; no
  raw backticks or `${` inside template literals. The `` ` ``+`` ` `` split
  in `</scr`+`ipt>` (29 files) is the deliberate, safe `</script>`-avoidance
  pattern, not a bug.
- **Dead code:** no dead functions (every `function` definition is called;
  onclick/setInterval/addEventListener references verified). No unreachable
  code of note. `bank.js`/`ventures.js` are the only dead files, and
  they're intentionally excluded.
- **Gate styles:** consistent — every game file uses `PF.skip("<id>")` as
  its first statement (the 4 core files without it are infrastructure:
  bus, snapshot data, dopamine lib, auth).
- **POST helpers:** every `post()` variant tries `PF.authPost` first with a
  `.catch`-guarded raw-fetch fallback. `14-auth.js` correctly attaches
  `auth_secret` and retries `auth_claim` once on 401.
- **XSS:** `esc()` applied consistently on user/backend-derived strings in
  feed, cells, contracts, caption-combat (uses `textContent`), roster,
  catalog. All `JSON.parse` calls are try-guarded. No `eval` of remote or
  user data; no `postMessage`; no hardcoded secrets (admin secret is
  prompt-per-session into `sessionStorage`, shared key `pf_admin_secret`
  between vault and dashboard).
- **Response handling:** `api()` callbacks consistently null-check
  (`if(!j)…`, `(j&&j.x)||…`) before use.
- **`(0,eval)` in `pages/home-v2.js:72-79`:** indirect eval of the silo's
  own first-party inner `<script>` text — the sanctioned mount mechanism
  (cloned templates don't execute inner scripts). Not user input, not
  remote-untrusted. Risk is CSP fragility: a future `script-src` without
  `unsafe-eval` breaks every silo mount. Acceptable by design; noted.

## Fix priority (suggested order)

1. H1 — single callsign-normalization helper; re-key or migrate affected rows.
2. H2 — point `13-flow.js` at `peoplesbank` (or drop the chain steps).
3. H3/H4 — reconcile tally tables with the meter; add missing settles.
4. H5 — make the no-callsign deploy path idempotent across ledgers.
5. M3/M2 — add the 12s JSONP timeout to war-card + core readers.
6. M4 — guard fan-vote against empty roster.
7. M14/M19 — decide the backend-URL story per file before the flip.
