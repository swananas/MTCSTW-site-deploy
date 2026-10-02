# Cloudflare Migration Plan — MTCSTW backend

## Why
Apps Script deploys are hand-pasted through a browser editor (~1hr, crash-prone).
Cloudflare Workers: git-push deploys in seconds, real SQL (D1), edge-fast, free tier covers us.

## What moves (endpoint inventory from Code-merged-v11.gs, ~2140 lines)
- Fan vote: vote/retract, results
- Actions/tally: action tracking, xp_totals, task_totals, xp_today, raid_turnout, bracket_turnout
- Checkins: daily orders state, streaks
- XP ledger: grant (idempotent), balance, spend
- Cells: create/join/checkin/cover/leave/rename/bounty_claim/leaderboard/links/mine
- Contracts: camps, board, post/accept/cancel/claim, payouts
- Bank: overtime, deposit, withdraw, status (lazy interest, credit score)
- Ventures: propose, pledge, list, mine, resolve, vote
- Discord relay: server-side webhook forward (becomes a Worker secret)
- Vanguard Wall: etch

## Target architecture
- **Worker** (`pf-api`): single worker, Hono-style router (or vanilla), same action names as today — the frontend's `PF_BACKEND_URL` just points at the new origin. Zero silo rewrites.
- **D1 database** (`pfdb`): one table per sheet above. Indexed on (callsign), (venture_id), (day). Sheet scans become indexed queries.
- **Secrets**: Discord webhook via `wrangler secret` (never in code, never client-side).
- **Custom domain**: `api.mtcstw.com` (free, cleaner than workers.dev; needs DNS — check if mtcstw.com is already on Cloudflare).

## Frontend changes
- One-line: `PF_BACKEND_URL` → `https://api.mtcstw.com` (set in one place — verify where).
- Nothing else: same `?action=` GETs and POST shapes.

## Data migration
1. Export each Sheet tab to CSV (Apps Script one-off or manual export).
2. `wrangler d1 import` / batched INSERTs into D1.
3. Reconcile row counts per table; keep Sheets as read-only audit archive.

## Cutover sequence (with rollback)
1. Build worker + D1 schema in a dev worker (`pf-api-dev`).
2. Import data snapshot; run the full endpoint checklist against dev.
3. Point a test page at dev; verify bank/venture/cell/contract flows.
4. Cutover: switch `PF_BACKEND_URL` to `api.mtcstw.com` via footer loader update (one deploy, same as any frontend push).
5. Monitor 48h. Rollback = flip the URL back; Apps Script stays untouched as the hot spare until we're confident, then retired.

## What I need from you (when we start building)
1. Cloudflare **account ID** (dash.cloudflare.com → Workers & Pages → Overview, right sidebar). Not secret.
2. A scoped **API token**: My Profile → API Tokens → Create → custom: `Workers Scripts: Edit` + `D1: Edit` + `Account Settings: Read`. Paste it to me when I ask — I'll use it immediately and you'll delete it after, same as the Discord token.
3. Answer: is mtcstw.com's DNS already on Cloudflare? (If yes, `api.mtcstw.com` is one click.)

## Estimate
Port: 2–3 focused sessions. Migration + verification: 1 session. Cutover: one footer deploy. No site downtime by design.
