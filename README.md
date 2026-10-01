# MTCSTW site deploy

Site code for mtcstw.com — deployed via CDN, loaded by a tiny snippet in Squarespace's Footer Code Injection.

## Layout (v1.1.0+)

- `v1.1.0/` — modular silos. One isolated file per homepage game plus shared core.
  - `v1.1.0/core/` — connector layer and shared services: `00-bus.js` (the PF event bus / connector: per-silo error attribution, kill switches, post-mount queue), styles, backend transport, ledger/XP, tally, template mounter, dead-block suppression, engagement copy, toast, ticker.
  - `v1.1.0/games/` — one depository per game: caption-combat, daily-orders, fan-vote, do-meter, media-nuke, poster-forge, daily-drop, service-medals, liquidation-bracket. Each game: exactly one template, one initializer, no cross-game dependencies.
  - `v1.1.0/fixes/` — per-page fixes (homepage, about, faqs, roster, podcast, tax, terms, schema) + mobile CSS.
  - `v1.1.0/loader/pf-loader-v1.1.0.html` — the tiny bootstrap snippet pasted into Squarespace Footer Code Injection. Pins an immutable commit hash, loads silos in order; a failed silo is named in the console and the rest keep going.
  - `v1.1.0/loader/silo-manifest.json` — load order. `v1.1.0/MANIFEST.md` — what each silo owns.
- `dist/pf-footer-v1.1.0.html` — the versioned monolith the silos were extracted from (audit reference).
- `loader/pf-loader.html` — legacy v1.0.x loader (superseded).
- `src/backend/` — Google Apps Script backend sources (reference; deployed separately).

## Kill switches

One bad game must never take down the homepage. Disable a single silo with no redeploy:

- URL: `?pf_off=do-meter` (comma-separated for several)
- Persistent: `localStorage pf_disabled_v1='["do-meter"]'`

Per-silo errors are tagged `[PF:<silo>]` in the console.

## Deploying a change

1. Edit the silo(s) under `v1.1.0/`.
2. Verify: every `.js` passes `node --check`; inner template scripts parse; templates round-trip byte-identical; jsdom integration suite green (21 tests: mount order, kill switch, failure isolation, error tagging).
3. Commit and push. Note the immutable commit hash.
4. Bake the hash into `v1.1.0/loader/pf-loader-v1.1.0.html` (`COMMIT`), or generate the footer snippet from it.
5. In Squarespace Code Injection: delete the old loader, paste the new one, save once. Never append.
6. Verify on the public page. Nothing is done until the public site proves it.

jsDelivr serves any commit: `https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@<commit>/v1.1.0/<path>`

## Rules

- Never append superseding code — replace in the same commit and the same editor save.
- Nothing is done until verified on the public site.
- Keep the loader tiny; all logic lives in `v1.1.0/`.
- No dead-element name mentions anywhere in code; dead blocks are suppressed by block ID only.
