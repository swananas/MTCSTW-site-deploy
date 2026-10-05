# XP Wiring — Voter Pledge Cards (weave #4, 2026-10-05)
For Economy Desk review. No new XP currencies, no new ledger prefixes,
`xpGrant()` fail-closed (backend untouched — `voter_pledge` and
`poster_share` are pre-existing actions).

| Action | Leg | Idempotency key format | Amount | NO_MULT | NO_COMM | Idempotency mechanism | Daily cap |
|---|---|---|---|---|---|---|---|
| Card **generation** (phq-pledge painter renders the 1080×1350 canvas) | none — pure frontend render | n/a | **0 XP** | n/a | n/a | n/a — pledge XP was already paid by `voter_pledge` | n/a |
| `voter_pledge` (POST, pre-existing — NOT duplicated) | `xpGrant()` in `src/reps.js` | `voter-pledge-<callsign>` | +50 | existing treatment, unchanged | existing treatment, unchanged | `INSERT INTO voter_pledges` fails on duplicate callsign → early return `{ok:true, dup:true}` (verified in `src/reps.js` L128–158) | idempotent per callsign (dup pays once) |
| Card **sharing** (verified public post) | `poster_share` → `create_share:` leg (`src/readcreate.js` ~L922, fixed-amount faucet) | `create_share:<cshash8>:<devhash8>:<proofhash8>:<chi_day>` where `proofhash8 = sha256hex('rcproof\|'+proofUrl)[0:16][0:8]`, `chi_day` = Chicago calendar day | **+5 fixed** | YES — `'create_share:'` in `NO_MULT` (`src/xp.js` L72; skips power-up/flash/combo/LUCKY/cell pipeline) | YES — `'create_share:'` in `NO_COMM` (`src/xp.js` L247; zero recruiter commission) | `UNIQUE(grant_key)` on `share_log` — atomic single INSERT, race loser gets `{ok:true, dup:true}`; plus 30-day proof-URL dedup per identity (`proof_reused`); server-side proof fetch must find the story URL/title or the `mtcstw.com` marker on the proof page (`proof marker missing` otherwise); proof domain allow-listed (facebook/instagram/tiktok/x/youtube/threads/bsky/substack) | 2/day per callsign AND 2/day per device; counts toward the daily XP cap (NOT in NO_CAP — Economy Desk C3) |

Flow: after a successful `voter_pledge`, the civic pane arms SHARE YOUR PLEDGE
with ballot-deadline data. The button opens the native share sheet
(`PFShare.shareImage`); generation mints nothing. The user then verifies the
public post in the existing POSTER SHARE tab (`poster_share` action,
`story_url` + `proof_url`), which rides the exact `create_share:` leg above —
same key format, same +5, same caps. No `pledge_share:` prefix was introduced;
a grep for `create_pledge:` / `xpGrant` in the new frontend code returns empty
(asserted in `tests/pledge-card-trigger.verify.cjs`).
