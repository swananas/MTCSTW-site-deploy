# Playtest — game demos on mtcstw.com

Private, no-indexed test slot for Shane's game prototypes.
Live: https://www.mtcstw.com/playtest/

## Demo 01 — Watershed (`site/playtest/watershed/`)

**Concept (Shane, 2026-11-03):** a zen nature-building game in the spirit of
*From Dust* — the fun was never the objective, it was steering running water:
building terrain around it, letting the water pool, carve, carry silt, and lay
down new land over time. A "zen garden" for ecosystems the way Cities: Skylines
is a zen garden for cities. No win state. Water + land + life, watched.

**v0 implementation (single HTML file, no build step, no dependencies):**
- 96×96 heightfield. Water flows cell → lowest neighbour each tick.
- Flow erodes its source (steeper/faster = more; vegetation roots resist),
  picks the eroded earth up as carried silt, and drops silt where water is
  still/slow — green ground traps silt faster. That deposition is what builds
  new land and deltas over time.
- Springs feed headwaters; edges drain; slight evaporation (no bathtub effect).
- Moisture memory greens the land: wet ground grows vegetation, deep water
  drowns it, dry ground fades.
- Phone tools: Raise / Dig / Spring / Rain / Seed, brush size, pause, regenerate.

## Adding the next demo

1. Build on the Mac (Godot web export, Phaser, or plain HTML/JS).
2. Drop the export in `site/playtest/<slug>/` with an `index.html` entry point.
   Include `<meta name="robots" content="noindex, nofollow">`.
3. Add a card for it in `site/playtest/index.html`.
4. Commit content + built `site/` output in the same commit, deploy via
   `~/workspace/hidden/engels/gate/deploy.sh mtcstw-app`, and byte-verify the
   new pages live on www.mtcstw.com and mtcstw-app workers.dev.

Notes:
- Site CSP (`site/_headers`) already permits self-hosted scripts + wasm eval.
  A threaded Godot build may additionally need COOP/COEP headers for
  `/playtest/*` — add and verify that when the first Godot export lands.
- Keep only the latest build per demo; old exports are just storage creep.
- Serving cost: static assets on the existing Worker — effectively $0.
