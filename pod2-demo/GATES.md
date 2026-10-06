# Pod 2 — Bluesky embeds: four gate reviews (2026-10-05)

**Build:** `v1.4.3/games/bluesky-feed.js` ("THE WIRE") — native house-styled
Bluesky embeds: hub profile banner (getProfile), hub recent posts
(getAuthorFeed, posts_no_replies), SLR generator feed leg (getFeed, publishes
pending Pod 1), optional hand-picks (getPosts). Mounted homepage PROOF closer.
Harness: `tests/bluesky-feed.verify.cjs` — 40/40 PASS. E2E demo:
`pod2-demo/bluesky-wire-demo.html` (real AppView data, 2026-10-05).

**Independence note:** this pod runs as a single subagent at max spawn depth
and cannot delegate to independent reviewer agents. The four gates below were
executed as separate, checklist-driven review passes (each with its own
lens), not as rubber stamps of the build pass. A fully independent re-review
by the parent before ship is recommended per org process.

## PSYCH — PASS
- Copy standard: combative, no "donate" (harness asserts). "THE NETWORK
  TALKS.", "Live fire from the Bluesky front", "JOIN THE FIGHT." CTA.
- No Bluesky-chrome confusion: cards are house-styled; every card links out
  to the canonical bsky.app post/profile ("VIEW →"), attribution unambiguous.
- No dark patterns: read-only, no account needed (stated in-section), no
  signup nudges beyond the hub FOLLOW CTA, no engagement bait.
- Repost bylines ("REPOSTED BY @x") preserve authorship honesty.
- No XP, no dopamine loops added — viewing is passive.

## ECONOMY — PASS
- Zero XP surfaces: module never dispatches pf-xp, touches no XP legs
  (harness greps the code body; only the header documents the rule).
- Zero backend cost: all reads from the public AppView; max 4 requests per
  page view, session-cached 10 min, 12s per-request timeout.
- No monetization interference: no store, ads, or War Bond touchpoints.

## SECURITY — PASS
- XSS: all post/profile text through esc(); all URLs through okURL()
  (https-only) — javascript:/data: rejected (harness proves the hostile
  cases degrade to inert text). facet link hrefs validated; unknown features
  degrade to plain text.
- Outbound links: target=_blank + rel="noopener noreferrer" (asserted).
- Facet byte-offset math walks code points with true UTF-8 lengths —
  emoji-adjacent facets stay intact (regression test with boundary exactly
  after an emoji; no U+FFFD corruption).
- No auth, no secrets, public data only. Fetch URLs built from a fixed
  APPVIEW constant + encodeURIComponent — no user-controlled URL assembly.
- Fail-soft: section removed from DOM only if all 4 sources fail; kill switch
  ?pf_off=bluesky-feed + pf_disabled_v1. Avatars carry referrerpolicy=
  "no-referrer".

## QC — PASS
- tests/bluesky-feed.verify.cjs: 40/40 PASS (staging, kill switch, XSS,
  facets, embeds, repost bylines, malformed-input safety, fail-soft, config
  doc, wiring).
- node --check clean on bluesky-feed.js, home-v2.js, build/bundle.js.
- Bundle rebuilt via node build/bundle.js --debug; deterministic — only
  bundle-home.js changed among bundles.
- Wiring asserted by harness: bundle-home contains the silo + template,
  home-v2 ORDER mounts ['bluesky','pf-ov-bsky'] last in PROOF,
  SILO_SEC maps bluesky→proof, build/bundle.js registers the file.
- E2E demo: real hub profile + 3 real hub posts render; generator getFeed
  returns 400 (unpublished) → feed leg skips silently, section survives on
  hub data — the designed fail-soft path, proven live.

## Open items (not blockers)
- Generator rkey: Pod 1 may publish under a different rkey than the assumed
  'sick-left-radicals' — one-line swap of BLUESKY_FEED_URI (documented).
- Roster-page (/sick-left-radicals) mount of the renderer is a fast-follow,
  not in this build.
