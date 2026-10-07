# KARL EMBEDDED — integration handoff for the data pages (2026-10-07)

Branch: `fe/karl-embed` (feature branch, NOT merged to integration).
Widget: `v1.4.3/core/karl-embed.js` — self-mounting, zero XP, mobile-first,
clean light. Kill: `?pf_off=karl-embed`.
Backend: existing `?action=karl_query&q=&context=` (BE 61594cb,
KARL-CONTRACT.md) — **no new backend needed**; the `context` param already exists.

## Mount contract

Add the div anywhere in the page (the widget's MutationObserver mounts it
even if rendered after chunk load):

```html
<div id="pf-karl-embed"
     data-karl-title="Ask about this politician"
     data-karl-placeholder="Where did their biggest donations come from?"
     data-karl-context='{"name":"Jane Doe","slug":"jane-doe"}'></div>
```

- `data-karl-title` — the box headline (per page, see below).
- `data-karl-placeholder` — input placeholder.
- `data-karl-context` — JSON context sent as the endpoint's `context` param.
  Individual attrs also work: `data-karl-zip`, `data-karl-name`,
  `data-karl-slug`, `data-karl-company`, `data-karl-entity`.
- Live updates: `window.PFKarlEmbed.setContext({zip:'70801'})` (optionally
  pass the host element as 2nd arg). Merges into existing context and
  refreshes the "About:" line.

## Per-page wiring

| Page | Branch | Title | Context | Bundle step |
|---|---|---|---|---|
| /town | fe/karl-embed (WIRED) | "Ask about your town" | `{"zip":"<zip>"}` — pushed via `setContext` on every lookup | `core/karl-embed.js` added to TOWN_FILES (first); `core/bundle-town.js` rebuilt |
| /receipt | fe/data-receipt | "Ask about this politician" | `{"name":"<dossier name>","slug":"<dossier slug>"}` — set when the dossier loads (`/receipt/<slug>` auto-loads per RECEIPT-CONTRACT.md) | add `core/karl-embed.js` to that page's chunk file list; render the div in the dossier template |
| /extraction | (no FE branch seen) | "Ask about this company" | `{"company":"<company slug>"}` | same pattern |
| /index | fe/corruption-index (`v1.4.3/pages/index-page.js` → `#pf-index`, in `pages/bundle-pages`) | "Ask about this score" | `{"entity":"<entity name>"}` — set on tab/entity select (`/index?name=<slug>` deep-link per contract) | add `core/karl-embed.js` to `pages/bundle-pages` file list (or the index chunk); render the div under the score breakdown |

No Squarespace hand-steps: the div is rendered by each page's own silo JS,
and the widget JS ships inside each page's existing lazy chunk. The footer
loader needs no changes for /town (chunk already loads on `#pf-town`).

## What the widget does

- Compact input + ASK (≥16px, Enter submits). No suggestion chips (kept light).
- Queries `?action=karl_query&q=<q>&context=<json>` via JSONP (same contract
  as /karl). 15s timeout, friendly error state.
- Renders minimal fact-set cards: entity header, fact label + big value +
  note + source line (name · period · retrieved date · stale badge),
  disambiguation pick-one buttons (re-queries with `{name}`), rail-status
  strip omitted in embed (kept minimal — full strip lives on /karl),
  adjacency note, honest-empty state, degraded banner passthrough.
- Sticky web: the endpoint's `related` deep-links (max 3) render as
  GO-DEEPER buttons; every answer ends with `OPEN IN KARL →` → `/karl?q=<q>`
  for complex queries.
- Results are inline + collapsible (collapse/expand toggle).
- Zero XP: no ledger calls anywhere. Editor-safe (no-ops in Squarespace editor).

## Verification

- `node --check` clean on `karl-embed.js`, `town-page.js`; rebuilt
  `core/bundle-town.js` (terser) passes `node --check` + parse.
- DOM-stub harness: mount → `setContext({zip})` → submit → JSONP URL carries
  `action=karl_query` + `context` with zip → answer renders fact card,
  source line, sticky-web door, `/karl?q=` link, collapse toggle. All green.
- Live-page verification still needed post-merge: load /town?zip=70801, ask
  a question, confirm the answer + deep-links (no-hallucination rule).
