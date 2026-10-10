# Explorable-Data API Contract — DRAFT v0.1 (WS-2 / WS-3 co-owned)
Date: 2026-10-10 | Status: DRAFT — pending WS-3 Backend lead alignment + WS-1 proposal approval.
CEO directive dir-20261010-010114-12003, issue (2): every number tappable, every fact
explorable / filterable / manipulable.

## Design intent
A tap on ANY rendered figure opens a FACT DRAWER (bottom sheet, mobile-first) — never a
navigation. Drawer content is composed client-side from the fact envelope; backend supplies
provenance. "Don't kill, just move": existing shares/CTAs stay; the drawer is additive.

## Fact envelope (every figure on the site carries this)
```json
{
  "fact_id": "rr:apple-take-2026",
  "label": "Their take",
  "value": 412000000,
  "unit": "USD",
  "display": "$412M",
  "kind": "money|pct|count|ratio|date",
  "method": "takePct = take / price, from 10-K filed figures",
  "band": "± range or band label (e.g. 'mid estimate')",
  "as_of": "2026-10-01",
  "stale": false,
  "sources": [{"name": "Apple FY2025 10-K", "period": "FY2025", "url": "https://…", "retrieved_at": 176…}],
  "related": ["fact_id…"],
  "actions": ["share", "to_cell", "checkin_price", "ask_karl"]
}
```

## Endpoints (WS-3 owns; contract only here)
- `GET ?action=fact&id=<fact_id>` → envelope above. Public, cached, never-500, fail-soft
  (drawer shows "source unavailable" + cached display value; never blocks the tap).
- `GET ?action=fact_related&id=<fact_id>` → [{fact_id, label, display}] for the
  "explore further" strip. Optional v1; client may use the `related` list in the envelope.
- Feed query params (filterable): `GET ?action=karl_robbery&sort=take_desc|take_pct_desc|fresh&tag=<tag>`
  — feed cards reorder client-side first; server sort when feed exceeds one page.
- Basket manipulator: `GET ?action=basket_model&basket=<id>&qty={<item_id>:<n>}` →
  {paid, take, take_pct} recomputed — enables "I buy 2x" what-if. Fail-soft to static values.

## Frontend responsibilities (WS-2)
- `[data-fact]` attribute on every rendered figure; one delegated tap listener per mount root.
- Drawer: bottom sheet, transform/opacity-only animation, `prefers-reduced-motion` respected,
  44px+ tap targets, closes on scrim tap / swipe-down / Esc.
- Tap feedback: `:active` press state on the figure itself (butter polish).
- Kill switch: `?pf_off=facts` disables drawers (figures render static, as today).
- Budget: drawer module lazy-loaded on first fact tap; NOT in the homepage blocking set.

## Constraints (standing)
- No fake counters, no hardcoded figures (News Desk audit governs). Every envelope value
  traces to a source with `retrieved_at`.
- No XP on fact taps (fail closed pending Economy sign-off). Share/to-cell reuse existing
  mechanics.
- Backdrop-filter banned on the drawer scrim (iPhone defect) — solid scrim only.
- `?pf_off=karl` / kill switches respected; privacy_erase scope covers fact-tap telemetry
  (telemetry: anonymous count only, like robreport pageview beacon).

## Open questions for WS-3
1. New endpoints vs extending karl_robbery/karl_stats envelopes (recommended: embed envelope
   in existing responses — zero new endpoints for v1).
2. `fact` id registry: who mints ids (FE data modules own ids; BE validates)?
3. Cache TTL for envelopes (figures re-anchor on filings; propose 24h CDN, `as_of` shown).
