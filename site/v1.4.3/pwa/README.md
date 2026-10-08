# PWA — MTCSTW Propaganda Factory

Progressive Web App bootstrap for mtcstw.com. Because the site is
Squarespace-hosted and we can only inject footer JS (no `<head>` access),
everything is wired up at runtime by `pwa/install.js`.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Web app manifest — name, icons, colors, standalone display |
| `icon-192.png` / `icon-512.png` | App icons (black bg, red MTCSTW, red border) |
| `apple-touch-icon.png` | iOS home-screen icon (180px) |
| `sw.js` | Service worker: cache-first statics, network-first API, offline fallback |
| `install.js` | Footer-injected bootstrap: injects manifest link, registers SW, shows INSTALL APP prompt |

`install.js` follows the standard silo conventions: IIFE, `'use strict'`,
`PF.skip('pwa')` kill switch (`?pf_off=pwa` or
`localStorage pf_disabled_v1='["pwa"]'`), no cross-silo internals.

## Deployment

No file upload needed — everything is served from this repo via jsDelivr,
same as the rest of the bundle.

1. Add `'pwa/install.js'` to the `JS` array in
   `loader/footer_v143_final.html` (recommend right after
   `'core/03-global.js'` so `PF` exists).
2. Commit, push, generate the new footer pin.
3. Reinstall the footer in Squarespace (delete old code, paste new, save once).
4. `install.js` derives its own CDN base from the loaded script tags, so it
   is pin-agnostic — no per-deploy edits needed.

## What works immediately (manifest-only mode)

- `<link rel="manifest">` injected at runtime (cross-origin manifest is fine —
  jsDelivr serves `Access-Control-Allow-Origin: *`).
- Icons resolve relative to the manifest URL on jsDelivr.
- **iOS:** "Add to Home Screen" works via the manifest + apple-touch-icon.
  `install.js` shows an INSTALL APP button on iOS with the
  Share → Add to Home Screen hint.
- **Android/Chrome:** `beforeinstallprompt` is captured and surfaced as a
  floating INSTALL APP button.

## Service worker: the same-origin constraint (read this)

Browsers **hard-require** the service-worker script to be same-origin with the
site. `install.js` attempts to register the jsDelivr-hosted `sw.js`; that
registration **will fail** with a SecurityError, which is caught and logged —
the app then runs in manifest-only mode. This is expected, not a bug.

For full offline support + the Android install prompt (Chrome requires a SW
with a `fetch` handler for installability), `sw.js` must be served from
`https://www.mtcstw.com/sw.js`. Options:

1. **Cloudflare proxy (recommended):** put Cloudflare in front of the
   Squarespace site and add a worker/route serving this repo's `sw.js` at
   `/sw.js` with `Content-Type: application/javascript` and
   `Service-Worker-Allowed: /`.
2. **Squarespace limitation:** Squarespace `/s/` file links serve with
   `Content-Disposition: attachment` (forced download), so they cannot host a
   SW. There is no same-origin static-file hosting on stock Squarespace.

Until one of those is in place, the PWA runs manifest-only: installable on
iOS, install-prompt on Android only where the browser doesn't require a SW.

## Verify

- Chrome DevTools → Application → Manifest: should show MTCSTW, icons, colors.
- `curl -sI <jsdelivr-url>/v1.4.3/pwa/manifest.json` → check 200 + CORS header.
- Lighthouse PWA audit: installable checks will flag the missing SW until
  same-origin hosting is set up (expected — see above).

## Adjust if needed

- `manifest.json` uses `https://www.mtcstw.com/` for `id`/`start_url`/`scope`.
  If the canonical domain differs, update those three fields.
- Theme color `#c81e1e` (red), background `#0a0a0a` (near-black).
