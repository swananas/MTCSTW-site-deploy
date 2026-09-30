# MTCSTW site deploy

Site code for mtcstw.com — deployed via CDN, loaded by a tiny snippet in Squarespace's Footer Code Injection.

## Layout

- `dist/pf-footer.html` — the full footer bundle (styles + all scripts). This is what the CDN serves.
- `loader/pf-loader.html` — the tiny bootstrap snippet pasted once into Squarespace Footer Code Injection. Fetches the bundle from jsDelivr and injects it.
- `src/backend/` — Google Apps Script backend sources (reference; deployed separately).

## Deploying a change

1. Edit `dist/pf-footer.html` (or rebuild it from source).
2. Verify: all `<script>` blocks pass `node --check`, no `document.write`.
3. Commit and push.
4. Tag a new version: `git tag v1.0.1 && git push origin v1.0.1`.
5. Update the version in the Squarespace footer snippet (`var V='v1.0.1'`).

jsDelivr serves tagged versions: `https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@v1.0.0/dist/pf-footer.html`

## Rules

- Never append superseding code — replace in the same commit.
- Nothing is done until verified on the public site.
- Keep the loader tiny; all logic lives in `dist/`.
