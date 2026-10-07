# PF Single Coordinated Ship — Release Checklist

One bundle, one pin, one footer save. Nothing ships piecemeal. Nothing is
"done" until the public page proves it. (Google audit C10/FE, 2026-10-07.)

Fill in per release:
- Release name: _______________
- New FE pin (full commit hash): _______________
- Footer loader file: _______________ (e.g. ship-loader/footer-v147-blossom.html)
- Ship call time (CDT): _______________

## 0. Pre-conditions (CEO-gated)

- [ ] CEO ship call given explicitly (chat message, timestamped).
- [ ] Full-workforce QC pass completed with a clean zero-hold result.
      On ANY hold: stop. Fix, re-QC, new ship call. No exceptions.
- [ ] Deployment freeze status confirmed lifted by the ship call.

## 1. Backend deploy + verify

The backend is the `pf-api` Cloudflare Worker
(https://pf-api.mtcstw.workers.dev) — xp ledger, War Chest, cells, contracts,
ventures, fan vote, stats, wall, discord relay.

- [ ] Deploy the backend (wrangler deploy from the backend repo).
- [ ] Verify: `curl -s https://pf-api.mtcstw.workers.dev/<health-endpoint>` returns
      healthy, and spot-check one write path (e.g. fan vote or xp ledger)
      end-to-end. Do not proceed on any backend error.

## 2. Frontend pin = the new commit hash

- [ ] All FE work for this release is committed on the integration branch;
      record the full commit hash as the new pin.
- [ ] In the footer loader file: set `V3='<new-pin>'` and `VCHROME='<new-pin>'`.
      `V1` stays `76107b5` — the v1.1.0 set is untouched by this release,
      per the standing rule.
- [ ] Update the loader's pin-history comment block AND the header comment's
      `V3 pin:` line (stale header comments caused a past ship-blocker).
- [ ] Verify every bundle path the loader requests exists at the new pin:
      `git ls-tree <new-pin>` for each `v1.4.3/...` path (CSS, core bundles,
      per-page game bundles, pages bundles, pwa/install.js, footer-chrome).
      Any missing path = BLOCKER, rebuild/re-pin before proceeding.
- [ ] Rebuild minified bundles from source (`node build/bundle.js` — requires
      terser; never ship unminified bundles) and confirm `git status` shows
      ONLY the bundles whose sources changed.

## 3. ONE Squarespace footer save

Hand-step (Squarespace editor, mtcstw.com — Settings → Advanced → Code Injection
→ Footer). Never append-only.

- [ ] Paste the NEW loader code into the footer textarea (append at the end).
- [ ] Find-select-DELETE the old loader code in the SAME textarea.
- [ ] SAVE exactly once. One save, no deferred cleanup.

## 4. LIVE-VERIFY (the repo cannot prove what's pasted in Squarespace)

The pin in git means nothing until the served page carries it. Verify live:

- [ ] `curl -s https://mtcstw.com/ | grep -o "V3='[0-9a-f]*'"` → shows the NEW pin.
- [ ] Repeat on a v2 page carrying a mount div (e.g. `https://mtcstw.com/arcade`)
      and on a non-v2 page (e.g. `https://mtcstw.com/store`) — confirm the new
      pin on v2 pages and `V1='76107b5'` on legacy pages.
- [ ] `curl -sI "https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@<new-pin>/v1.4.3/core/00-bus.js"`
      → HTTP 200 (no 404s on the critical path).
- [ ] Load the homepage in a real browser: no `[PF SILO FAILED]` errors in the
      console, Daily Orders widget mounts and reports.
- [ ] Any mismatch between the served pin and the new pin = the footer paste
      did not take — redo STEP 3, then re-verify. Do not declare the ship done.

## 5. Post-ship health checks (+2h and +24h)

Schedule both at the ship call (STEP 11 of the push runbook):

- [ ] +2h sweep: error rates (console/SILO FAILED), live surfaces (homepage,
      arcade, cells, roster), user reports, D1 rows-read headroom.
- [ ] +24h sweep: same, plus confirm no CDN 404s in the loader's requested
      bundle set at the new pin.
- [ ] Any failure: ping Shane immediately. Never sit on a blocked/degraded ship.

## Standing rules referenced

- No append-only deployments (2026-09-30): superseded code is deleted in the
  same editor session.
- No hallucinations (2026-09-30): nothing is "done" until the public page proves it.
- Single coordinated ship (2026-10-05): everything ships at once — no piecemeal
  live pushes. Bundle protocol: frontend changes accumulate into ONE bundle,
  ONE pin, ONE footer save.
- Page-weight budget is a standing QC gate (2026-10-06): every push stays under
  the per-page payload budget or it doesn't ship.
- D1 free-tier watch: the `d1-free-tier-watch` cron pings Shane at 80% of the
  5M/day free cap; at cap, D1 hard-fails until midnight UTC.
- Deploy auth: gh CLI device-flow only — chat-pasted tokens are never used.
