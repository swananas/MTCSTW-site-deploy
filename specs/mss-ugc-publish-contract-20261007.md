# MAKE SHAREABLE — UGC publish contract (fe/make-shareable-inline, 2026-10-07)

CEO directive 2026-10-07 ~01:38 CDT ("further integration via EMBEDDING"):
Studio creation tools on every data page. The inline panel
(`v1.4.3/core/40-make-shareable.js`, `window.PFMakeShareable`) opens on any
data view; one PUBLISH tap sends the piece to the UGC feed **and** opens the
native share sheet.

## The contract: `window.PFUgcCreate`

A builder that wants to receive inline-panel publishes exposes:

```js
window.PFUgcCreate = {
  /* payload: {
       kind:    'receipt' | 'town' | 'extraction' | 'index' | 'karl',
       ref:     string,   // politician slug | zip | company slug | entity slug | 'q-<hash>'
       title:   string,   // display title, e.g. 'THE RECEIPT: Bernie Sanders'
       caption: string,   // the user's context line (<=140 chars, may be '')
       deepLink:string,   // canonical deep link, e.g. '/receipt/bernie-sanders'
       imageBlob: Blob,   // the product's own 1080x1350 painter output (PNG)
       gameId:  string    // PFShare game id for share-XP attribution
     }
     Returns: Promise<{ok:boolean, slug?:string, url?:string}> (or a sync
     truthy/falsy value — the panel accepts both). */
  publish: function (payload) { /* ... */ return Promise.resolve({ok:true}); }
};
```

Rules the panel enforces (builders don't need to):
- **Zero XP for viewing** — the panel never touches the XP ledger.
- Publishing routes through `PFShare.shareImage` (claimGate + creditShare):
  the existing share mechanics, nothing new.
- The native share sheet is **never held hostage** by the feed: a missing
  builder, a rejected promise, or a 20s timeout all fall through to the
  sheet. Fail-soft, never a wedge.
- UGC publish requires a callsign (the builders' backends are
  AUTH_MAP-gated). The panel prompts via `PF.requireCallsign`; a dismissed
  claim skips the feed and still opens the sheet.
- If no builder is present, the piece is queued device-local
  (`pf_mss_queue_v1`, cap 25, **metadata only** — the image re-paints from
  the unit's painter when the builder consumes the queue) and
  `pf-mss-queued` fires on `document`. A builder coming online later can
  drain the queue and repaint via the unit's `kind`/`ref`.
- `pf-mss-published` fires on `document` with `{kind, ref, ok}` after every
  attempt.

## Per-kind backend mapping

| kind | Builder (branch) | Publish target | Payload notes |
|---|---|---|---|
| `receipt` | UGC dossier-builder (`fe/ugc-dossier-builder`, `games/dossier.js` — LIVE) | POST `type:'dossier'`, `d_action:'dossier_publish'` | `pol_slug` = ref, `pol_name` from title, `share_line` = caption, `title` = caption or default, `why` = '', `notes` = [] |
| `town` | UGC town-report-builder (`fe/ugc-town-report` — building) | builder's publish action | `zip` = ref, `caption` = user context line |
| `extraction` | Story remixer (`fe/ugc-story-remixer`, `pages/bundle-ugc-remix.js` — LIVE) | remix publish | `company_slug` = ref, `take` = caption |
| `index` | — (no dedicated builder) | generic queue + native sheet | drains when a feed builder claims `kind:'index'` |
| `karl` | — (no dedicated builder) | generic queue + native sheet | drains when a feed builder claims `kind:'karl'` |

## Reference implementation (receipt → dossier-builder)

```js
window.PFUgcCreate = window.PFUgcCreate || {};
window.PFUgcCreate.publish = function (p) {
  if (p.kind !== 'receipt') return Promise.resolve({ ok: false, queued: true });
  var cs = window.PFCallsign ? window.PFCallsign() : '';
  var secret = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
  if (!cs || !secret) return Promise.resolve({ ok: false });
  var body = {
    type: 'dossier', d_action: 'dossier_publish',
    callsign: cs, auth_secret: secret,
    pol_slug: p.ref,
    pol_name: String(p.title || '').replace(/^THE RECEIPT:\s*/, ''),
    title: p.caption || p.title,
    why: '',
    share_line: p.caption || '',
    notes: []
  };
  return fetch(window.PF_BACKEND_URL + '?action=dossier_publish', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); })
    .then(function (j) { return { ok: !!(j && j.ok), slug: j && j.slug }; })
    .catch(function () { return { ok: false }; });
};
```

(A canonical implementation should live with the dossier-builder;
the above is the exact mapping so any owner can wire it in one pass.)

## Panel → page integration (for product owners)

The panel is page-agnostic. A product integrates in ~10 lines:

```js
/* 1. Register how this product paints (its OWN painter — never duplicated). */
PFMakeShareable.registerResolver('mykind', function (unit, done) {
  var cv = null;
  try { cv = myPainter(unit.ref); } catch (e) {}
  done(cv);
});
/* 2. Open the panel for a unit (button the product renders itself). */
button.addEventListener('click', function () {
  PFMakeShareable.openPanel({
    kind: 'mykind', ref: 'some-id',
    title: 'MY PRODUCT: Thing',
    deep: '/myproduct/some-id', game: 'myproduct'
  });
});
```

Or declaratively: any element with `[data-mss]` (+ `data-mss-kind`,
`data-mss-ref`, `data-mss-painter`, `data-mss-title`, `data-mss-deep`,
`data-mss-game`) is scanned automatically — the module injects the
MAKE SHAREABLE button itself. Custom-painter ids resolve through the new
`PFShare.paintAsync(gameId, done)` API.
