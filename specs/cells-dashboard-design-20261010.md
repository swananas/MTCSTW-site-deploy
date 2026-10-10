# /cells Cell Dashboard — Design Spec (WS-A)
**Directive:** dir-20261010-102841-19724 · **Workstream:** ws-cellsdash-design-20261010 (Design Team)
**Branch:** `design/cells-dashboard-20261010` · **Base FE:** `2662a2aa` (local `integrate/big-update-fe`)
**Deliverable:** design proposal only — no repo page code (Design Team is proposal-first).

## 0. The one-sentence spec

**/cells becomes a real dashboard, not a landing page:** the CONNECT pillar's home, where a member sees
their cell, coordinates actions, and tracks collective impact. One visitor, one question: *"Are you in
a cell yet?"* — if yes, the dashboard; if no, the find/join/create flow. Tagline: **"Nobody fights alone."**

## 1. Entry logic (closes P0 gap G-D2)

The imp-loop audit (2026-10-10) found **P0 G-D2**: /cells' FIND YOUR CELL routes to a Karl query, not a
real cell destination. This spec closes it. Entry gates on two live facts:

| State | Condition | /cells renders |
|---|---|---|
| A — Anonymous | no callsign | §2 Hero + find/join/create flow; one-prompt callsign card (once-ever) |
| B — Lonely member | callsign, `cell_mine.in_cell == false` | §2 Hero (short) + §7 find/join/create as the primary panel |
| C — Cell member | callsign, in_cell | Full dashboard: §3 → §8. Hero collapses to cell banner |

Existing entry surfaces keep working: war-card `?cell=`/`?ref=` deep links, `/arcade` enlist links —
all land on /cells and hit this gate (no dead ends, no Karl-query detour).

**Reconciliation with review-only branches (READ-ONLY, do not commit):**
- `fe/cells-2.0`: ships cells, cell-hq, cell-war, diplo, contracts + territory map, comp seasons,
  recruit funnel, invite deep links, founding wizard + identity kit. This design REUSES those
  surfaces, does not rebuild them. The dashboard mounts as a new `cells-dash` entry point on /cells;
  legacy silos remain reachable from inside (Contracts, Diplomacy, Treasury rows link out).
- `fe/blossom-s2s3-cellbank`: split /cell-war off /cells. **Weekly Cell War championship lives at
  /cell-war** — the dashboard's leaderboard (§5) is a *different* surface (impact rankings), and links
  out to /cell-war for the weekly championship. No second war identity.
- `be/cells-2.0`: no such branch locally — nothing to reconcile.

## 2. Dashboard IA

```
┌─────────────────────────────────────────────┐
│ CELL BANNER  "NOBODY FIGHTS ALONE."          │  (state C: cell name + VERIFIED + streak flame)
│ (state A/B: hero pitch + CTA)               │
├─────────────────────────────────────────────┤
│ §3  MY CELL card                            │  members · location · check-in · activity feed
│     ┌─────────────────────────────────────┐ │
│     │ Cell identity: name, VERIFIED, tier  │ │
│     │ Roster (faces row, tap → roster)     │ │
│     │ Location: coarse city/county only   │ │
│     │ Streak: N days, cover-a-mate status │ │
│     │ ACTIVITY FEED (latest 8, paginate)  │ │
│     └─────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ §4  CELL ACTIONS panel                      │  coordinated campaigns + deploy targets
│     Active campaigns (cards w/ progress)    │
│     Deploy targets (per-target muster)      │
│     + NEW ACTION (founder/officer)          │
├─────────────────────────────────────────────┤
│ §5  IMPACT LEADERBOARD                      │  cell-vs-cell + intra-cell member ranks
│     (link out: weekly championship →       │
│      /cell-war — not duplicated here)       │
├─────────────────────────────────────────────┤
│ §6  CELL COMMS  (chat/coordination)         │  feed + Karl-ask + Discord handoff
├─────────────────────────────────────────────┤
│ §7  FIND / JOIN / CREATE (state A/B: top;   │  browse VERIFIED cells · one-tap join ·
│     state C: collapsed footer row)          │  6-char code entry · found-a-cell wizard
├─────────────────────────────────────────────┤
│ §8  INTEL FROM THE ROBBERY REPORT           │  day's discoveries → DEPLOY TO CELL
└─────────────────────────────────────────────┘
```

### §3 — My Cell card (the emotional home)

- **Cell identity header:** cell name, VERIFIED badge (auto at 2+ members, existing), prestige tier
  chip (EMBER→CATACLYSM), health score (0–100) with plain-language pulse line
  ("Your cell is heating up."). No donate copy anywhere (standing copy rule).
- **Roster:** face row (callsign initials, max 8 shown + "+N more" → full roster sheet).
  Founder/officer badges. Tap a face → member sheet: callsign, streak days, weekly XP, role.
- **Location:** coarse only (city/county) — never exact (privacy posture: coarse location, always).
  Shows as a chip, e.g. "BATON ROUGE AREA".
- **Check-in:** one big CHECK IN button (zuck butter: 56px+, thumb zone, ripple on tap).
  Quorum-based shared streak: "5/7 CHECKED IN — 2 to go." Cover-a-mate control when a member is
  about to break streak ("COVER THERESA — costs nothing, saves the chain").
- **Activity feed:** latest 8 cell-scoped events (check-ins, joins, dividends, campaign launches,
  ticker-ceremony highlights), newest first, relative timestamps. Paginate "LOAD MORE".
  **Empty state (zero events):** "Quiet — for now. Your first check-in starts the record."
  Cold-start is the #1 cells problem (CELLS_ANALYSIS 2026-10-04): every empty state assumes
  activity and invites the first action, never shames.

### §4 — Cell actions panel (coordinated campaigns, deploy targets)

- **Active campaigns:** cards with title, plain-language goal, progress bar (members pledged/acted),
  deadline chip, DEPLOY button. Campaign types (backed by existing rails): recruit drive (recruit
  funnel), war-chest funding drive (1000 XP → 24h +5% check-in bonus), pressure action (external
  target: call/email/petition).
- **Deploy targets:** per-target muster row — target name (e.g. "CITY COUNCIL VOTE — Tue"),
  what the cell does (tappable checklist), muster count "6/9 IN".
- **+ NEW ACTION (founder/officer-gated):** title → goal → target → deadline → publish.
  Publishes into the feed and fires the cell's notification path.
- **Empty state:** "No active campaigns. FOUND ONE →" (founder) / "Your officers can launch
  campaigns — nudge them in CELL COMMS." (member).

### §5 — Impact leaderboard (impact rankings)

- **Cell-vs-cell:** rank by weekly IMPACT score, top 25, scrollable. Impact = member XP attributed
  (existing) + check-in streak weight + treasury contributions + recruits — the mix, not pure XP,
  so small cells can win on showing up (cold-start friendly).
- **Intra-cell:** member ranks inside my cell (streak days, weekly XP, actions completed).
  Titles are status currency: "STREAK KEEPER", "TOP RECRUITER".
- **Explicit link-out:** "WEEKLY CELL WAR CHAMPIONSHIP → /cell-war" — that surface is not rebuilt here.
- **Impact is honest:** cells with zero activity show "—" not fake zeros; "No cells ranked yet
  this week — yours could be first."

### §6 — Cell comms (chat/coordination integration point)

No in-app chat rail exists in the FE codebase (verified 2026-10-10: no chat modules). The design
**integrates existing channels**, single panel, three stacked rows:

1. **ACTIVITY WIRE** — the §3 feed's highlight reel (in-site, no new infra): ceremony events
   (declarations, dividends, VERIFIED) auto-post here.
2. **ASK KARL TOGETHER** — one-tap deep link: "ASK KARL ABOUT THIS" on any campaign/target →
   `/karl?q=<prefilled>` with the cell + target in context. Karl is the engine, not the mascot.
3. **DISCORD HANDOFF** — "OPEN CELL CHANNEL" → the cell's Discord channel (server wired to site
   backend for event notifications). If unlinked: "LINK DISCORD CHANNEL" (founder).

No new chat rail is assumed. WS-B picks backing; design degrades gracefully (rows 1–2 work
without Discord).

### §7 — Find / join / create flow (the G-D2 closure)

- **BROWSE:** VERIFIED cells first, then by proximity (coarse), then by impact rank. Card: name,
  VERIFIED, member count, coarse location, impact rank, **JOIN button right on the card**
  (one-tap browse→join — CELLS_ANALYSIS G10; invite codes exposed for VERIFIED cells only).
- **JOIN BY CODE:** 6-char code entry (existing `cell_join`), with paste-from-link support.
- **CREATE:** guided founding wizard (REUSE `fe/cells-2.0` wizard, do not rebuild): name → coarse
  location → recruit #2 for VERIFIED → first check-in checklist. Founder checklist reads `cell_mine`
  live; dismisses permanently; hands off to NEXT OP.
- Max 3 cells per callsign (existing chainlink rule); UI shows "CELL 2 OF 3" when joining a second.
- **Copy rule:** "Lone wolves get picked off. Find your people." (kept from current /cells).

### §8 — Intel from the Robbery Report

- Card pulls the day's Robbery Report lead + top discoveries (same `karl_robbery` payload the
  homepage LOOP-1 build introduced — reuse, don't duplicate; fail-soft honest-empty while BE ships).
- Each discovery carries **DEPLOY TO CELL** → prefills §4 NEW ACTION with target + source stamps
  (source attribution is non-negotiable: every intel item shows its source and generated_at).
- This is the CONNECT pillar acting on fresh intel: "Who's robbing you → what your cell does about it."

## 3. Visual direction

- **Dark war-room:** `#0a0a0a` base (matches current /cells), `#c1121f` primary red, `#e5383b`
  hot accents. Cards `#121212` with 1px `#2a2a2a` borders; section headers stamped in caps,
  letter-spaced, red rule underneath (war-room dossier feel).
- **Zuck butter:** every tappable is ≥48px (CTA 56px), ripple/press feedback on tap, card press
  scale .98, skeleton shimmer on data load (no blank holes), `prefers-reduced-motion` honored.
  Feed rows slide-in staggered on first load only (not on paginate).
- **Mobile-first:** single column ≤480px; two-column ≥900px (My Cell + Actions left, Leaderboard +
  Intel right); Comm feed full-width bottom on desktop. Sticky bottom action bar on mobile with
  CHECK IN / COMMS / ACTIONS — thumb-zone navigation.
- **"Nobody fights alone.":** the cell banner line, always visible, and the empty-state voice —
  belonging, not mechanics. Copy stays punchy and combative (standing copy standard).

## 4. Payload budgets (standing QC gate: per-section KB targets)

Page total first-load budget: **≤ 200KB transfer** (gz ~80KB), **critical JS ≤ 60KB**,
**≤ 2 API calls before first paint** (matches homepage unclunk discipline: calls 21 → 2).

| Section | HTML+CSS (inline/shared) | New JS (source) | Notes |
|---|---|---|---|
| Shell/banner (state gate) | ≤ 4KB (reuses bundle-styles.css) | ≤ 3KB | Skeleton while `cell_mine` resolves |
| §3 My Cell | ≤ 12KB | ≤ 8KB | Roster faces CSS-only; feed rows template |
| §4 Actions | ≤ 10KB | ≤ 8KB | Progress bars CSS; lazy below fold |
| §5 Leaderboard | ≤ 8KB | ≤ 6KB | Virtualize beyond 25 rows |
| §6 Comms | ≤ 8KB | ≤ 5KB | Rows 1–2 ship first; Discord link lazy |
| §7 Find/join/create | ≤ 15KB | ≤ 10KB | Wizard steps lazy-loaded, not inlined |
| §8 Intel | ≤ 6KB | ≤ 5KB | Reuses karl_robbery renderer |
| **Total new** | **≤ 63KB** | **≤ 45KB src / ≤ 16KB gz** | |

Rules: images are callsign-initial avatars (CSS, zero bytes); no hero imagery; PWA caches shell;
lazy everything below §4 on mobile; page fails the QC gate if any section exceeds its row or the
page exceeds 200KB.

## 5. API surface assumed (WS-B builds to this)

Conventions: `POST /api` with `action:` (existing pf-api pattern), callsign auth on member calls,
fail-closed on DB errors, honest-empty payloads (never fabricated rows).

**EXISTING (reuse as-is — verified live 2026-10-02 unless noted):**

| Action | Data returned (shape) |
|---|---|
| `cell_mine` | `{ok,in_cell,cell:{cell_id,name,tagline,invite_code,verified,members:[{callsign,role,streak_days,weekly_xp}],location_coarse,prestige_tier,health_score,streak:{days,checked_in_today,quorum:{in,of}},treasury:{balance},cell_count}}` |
| `cell_checkin` | `{ok,streak_days,quorum:{in,of}}` |
| `cell_cover` | `{ok,saved_callsign,streak_days}` |
| `cell_create` | `{ok,cell_id,invite_code}` (+ existing wizard fields) |
| `cell_join` | `{ok,cell_id}` (code or one-tap) |
| `cell_leave` | `{ok}` |
| `cell_search` | **extend:** `{cells:[{cell_id,name,verified,member_count,location_coarse,impact_rank,invite_code?}]}` — invite_code exposed for VERIFIED cells only (G10); coarse location required (never exact) |
| `cellwar_standings` | existing weekly championship (link-out to /cell-war) |
| `karl_robbery` | day-rotating lead + discoveries (homepage LOOP-1 contract) — §8 consumes |

**NEW (WS-B to spec/build — shapes assumed by this design):**

| Action | Request | Response shape |
|---|---|---|
| `cell_dashboard` | `{}` (auth) | `{ok, cell:{...as cell_mine...}, feed:[{id,ts,type,actor_callsign,text,ref}], actions:[{id,title,goal,pledged,needed,deadline_ts,deploy_targets:[{id,label,checklist:[],mustered,muster_of}]}], impact:{cell_rank,of_cells,score_breakdown:{xp,streak,treasury,recruits}}, members_rank:[{callsign,streak_days,weekly_xp,actions_done,title}], comms:{discord_linked,discord_url,unread_wire}, intel:[{id,title,summary,source,generated_at}]}` — ONE call, everything first-paint needs |
| `cell_feed` | `{cursor?}` | `{ok, items:[...], next_cursor}` — paginated activity |
| `cell_impact_board` | `{limit:25}` | `{ok, week_id, rows:[{rank,cell_id,name,verified,member_count,impact_score,trend}]}` |
| `cell_action_create` | `{title,goal,target,deadline_ts}` (founder/officer) | `{ok, action_id}` → lands in feed + notifications |
| `cell_action_muster` | `{action_id,target_id}` | `{ok, mustered, muster_of}` |
| `cell_treasury` | `{}` | `{ok, balance, trajectory_7d:[], pending_dividends}` — §3/§4 read-only for now (spend UI is a later directive; copy "FUND THE TREASURY", never "donate") |

**Honesty rules for WS-B:** zero-activity cells return `"—"`/empty arrays, never synthetic rows;
`generated_at` on every intel item; `cell_search` never returns exact location.

## 6. Acceptance (what QC checks)

1. Anonymous → /cells → one-prompt callsign → §7 flow → in a cell → dashboard (no Karl detour).
2. `?cell=<code>` deep link lands in §7 with code prefilled and JOIN armed.
3. First paint ≤ 2 API calls; page ≤ 200KB; each section within its §4 row.
4. All empty states invite the first action (no dead "No cells exist" walls).
5. Copy audit: zero "donate", zero fabricated numbers, sources on all intel.
6. Reduced-motion + 320px viewport pass; thumb-zone CTAs ≥ 48px.

## 7. Handoff

- **WS-B (ws-cellsdash-be-20261010, Backend Pod):** §5 table is the contract. Build `cell_dashboard`
  first (unblocks all first-paint), then feed pagination, impact board, action create/muster.
  Note: `cellIsOfficer`/`treasuryIsOfficer` `WHERE id=?` bug (CELLS_ANALYSIS #0) must be fixed
  before any founder/officer-gated action can succeed — flag as prerequisite.
- **WS-C (ws-cellsdash-fe-20261010, Frontend Pod):** build to §2–§4. Reuse `fe/cells-2.0`
  founding wizard, identity kit, and `karl_robbery` renderer — do not rebuild. Mount as
  `cells-dash` on /cells; keep legacy silos linked (Contracts, Diplomacy, Treasury, /cell-war).
- **No deploys** (freeze active). Spec is proposal-only; nothing here authorizes page code.

## 8. Open questions for CEO (not blockers)

1. Impact-score mix weights (XP vs streak vs treasury vs recruits) — proposed 40/30/15/15;
   CEO call before WS-B finalizes scoring.
2. Discord per-cell channels: who creates/links them (founder self-serve vs org-provisioned)?
3. /cell-war vs impact leaderboard naming — "IMPACT BOARD" vs "CELL RANKINGS"?
