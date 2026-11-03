# Playtest — game demos on mtcstw.com

Private, no-indexed test slot for Shane's game prototypes.
Live: https://www.mtcstw.com/playtest/

## Demo 01 — Watershed (`site/playtest/watershed/`)

**Concept (Shane, 2026-11-03):** a zen nature-building game in the spirit of
*From Dust* — the fun was never the objective, it was steering running water:
building terrain around it, letting the water pool, carve, carry silt, and lay
down new land over time. A "zen garden" for ecosystems the way Cities: Skylines
is a zen garden for cities. No win state. Water + land + life, watched.

**v0.2 graphics pass (2026-11-03, Shane's call — look before concept expansion; sim byte-for-byte the same rules):**
stylized top-down miniature direction. Elevation palette ramp + faint contour banding + two-axis
hillshade (terrain readable at a glance); water = 3-stop depth ramp, travelling shimmer, sun glints,
animated shore foam, muddy silt tint, and pale flow streaks that drift downhill so current direction
is visible; growth in three readable stages (sprout speckle → grass → forest floor) plus full-res
canopy crowns over mature forest; moisture now darkens soil and the waterline reads as pale wet sand;
springs bubble with expanding ripples; brush ring shows your tool footprint; legend under the canvas;
soft diorama vignette. Roadmap from here per Shane's sequencing question: v0.3 feel pass (rates/brush
tuned from his play), v0.4 first single concept expansion — evolution last by design.

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
