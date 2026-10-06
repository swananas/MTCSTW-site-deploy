# /create Workshop Shell — Contract

**Branch:** `fe/create-workshop-shell` (from `integrate/big-update-fe`; `origin/master` does not exist).
**Status:** built, 41/41 verify checks green. **Never merged, never deployed** — production freeze holds.

## What it is

`/create` becomes one workshop: shared header + tool rail, **one active tool at a time**,
tools lazy-mount on first open, hash deep-links (`#pf-tool=<tool-id>`). Chrome + mounting
only — **no XP, no behavior changes inside tools**.

## Files

| File | Role |
|---|---|
| `v1.4.3/core/workshop.js` | The shell: registry, chrome, open/close, hash routing, kill handling. **First** in `bundle-create`. |
| `v1.4.3/pages/workshop-create.js` | The 9 tool adapters. **Last** in `bundle-create`. |
| `v1.4.3/pages/page-mount.js` | Guard added: legacy stacked `pf-create` mount runs only when the shell is killed/absent. |
| `v1.4.3/games/bundle-create.js` | Regenerated (`node build/bundle.js`). |
| `build/bundle.js` | Bundle list: `../core/workshop.js` first, `../pages/workshop-create.js` last. Neither in `bundle-create-h`. |
| `scripts/verify-workshop-fe.js` | 41 checks: `node --check`, static contract, runtime in a DOM shim. |

## Contract

```js
PFWorkshop.register({ id, title, tagline, templateId|null, selfMount|null, kill, mount })
```
- **Additive, never reassignment.** Duplicate `id` → rejected (`false`), original kept.
- `templateId` — shell clones the staged `<template id="pf-ov-*">` + execs inner scripts (page-mount's approach). Truly lazy.
- `selfMount` — host div id. The shell pre-creates it in a hidden dock at boot (killed tools excluded), the module renders into it at bundle load, the shell relocates the node into the pane on open / parks it on close (moves preserve listeners).
- `mount(section, def)` — custom mount override (academy, graduation, forged-tray).
- `kill` — the tool's `?pf_off` id. Killed tools never register (never reach the rail).
- `PFWorkshop.open(id)` / `.close()` — one active tool; close returns to the rail.
- **Back button**: `open()` sets `location.hash` (history entry); Back reverts it → `hashchange` → close. **Escape** closes.
- `.route()` — initial `#pf-tool=<id>` / `?for=<slug>` handling; called once by the adapters file.
- **Master kill** `?pf_off=workshop` → shell never boots, `window.pfWorkshopClaimed` unset → `page-mount.js` runs the legacy stacked layout (regression path). Same fallback if `bundle-create` fails to load.

## Adapter status

| Tool | Kind | Kill | Status |
|---|---|---|---|
| press (TEARDOWN WS-4, 2026-10-06) | custom (`PFPress.mount`, lazy; FIRST in rail) — THE PRINT SHOP: template picker by FIGHT → slot editor → full-screen preview → P6 Action Bar; mastery path KIT UNLOCKS → ADVANCED TRACKS → SPOTLIGHT SLOTS | `create-press` | LIVE |
| poster-forge | template `pf-ov-poster` | `poster-forge` | LIVE |
| feed | template `pf-ov-feed` | `feed` | LIVE |
| armory | template `pf-ov-armory` | `armory` | LIVE |
| earnings | template `pf-ov-earnings` | `earnings` | LIVE |
| academy | custom (`PFAcademy.mount`, lazy) | `academy` | LIVE |
| creator-assist | self-mount `#pf-creator-assist` | `creator-assist` | LIVE |
| ammo | self-mount `#pf-ammo` | `ammo` | LIVE |
| graduation | custom (kicks `pf-graduation-check`, relocates `#pf-graduation` if it renders; honest empty state + Academy payoff otherwise) | `academy-graduation` | LIVE |
| forged-tray | self-mount `#pf-forged-tray` | `forged-tray` | **STAGED** — module lives on `fe/studio-drafts-tray`, not in this tree. Adapter registers host + kill; empty host → honest not-live-here staged state with rail-return CTA (never the terminal error). Zero changes needed here when that branch integrates. |

## What the incoming-tools integrator needs to know

1. **New tool = one `PFWorkshop.register()` call** in `pages/workshop-create.js`. Pick the kind: `templateId` for staged-template tools, `selfMount` + host id for self-mount modules, `mount()` for anything exotic. Declare the tool's `kill` id (must match the module's own `PF.skip()` id).
2. **Self-mount hosts are primed at shell boot** (`SELF_MOUNT_HOSTS` in `core/workshop.js`, first in `bundle-create`). If your module needs its host div to exist at bundle load, **add it to that list** and keep it in sync with your adapter — the adapters file loads last, too late to preempt IIFE fallbacks.
3. **Rail order = registration order** in the adapters file.
4. **Soon-to-land tools** (Meme of the Week, Caption Combat, Forge political plugins, share kits): register them the same way. Nothing else changes.
5. **No backend migration** — frontend-only, none reserved.
6. **Design system**: header block pattern, TERMINAL STATE error handling, `.c-load` only (no new `-load` classes), `PF.toast()`, focus-visible untouched. All encoded in `scripts/verify-workshop-fe.js` — run it after adding a tool.
7. **Known limitation**: self-mount tools render at bundle load into the hidden dock (their IIFEs can't be deferred without rewriting them); only template tools are truly lazy. Opening a self-mount tool just reveals already-rendered DOM.
8. `dashboard.js` (also in `bundle-create`) is **not** a workshop tool — untouched, still mounts on Creator HQ.
