# Watershed — Style Sheet v1

_Written 2026-11-03 by the game studio seat. Source: Shane's own photo bank
(Nature Moodboard v1 — 2,007 photos classified on-device on Swanny, 602
candidates, 247 verified nature frames, 26 curated). This sheet governs every
visual decision in the Watershed line. References give us **qualities, never
assets**: every sprite, color ramp, and shape in the game is generated from
these rules by our own code._

## The one-line look

**A muted, humid Gulf South miniature — soft hazed light, low saturation,
water that is olive and sky-silver before it is ever blue.**

Measured on Shane's own core frames: mean saturation **0.19** (low),
mean brightness **0.44** (soft mid), warmth near neutral with warm bayou
frames and cool open-water frames. If a render looks vivid, tropical, or
theme-park, it is off-sheet.

## Palette of record (15 colors)

Each hex is anchored to a measured color extracted from Shane's photos.

| Role | Name | Hex |
|---|---|---|
| Water — still swamp / shadowed channel | Bayou Deep | `#403E2C` |
| Water — open river | River Grey-Blue | `#60748B` |
| Water — deeper flow | Channel Blue | `#3F5B81` |
| Water — clear shallows over sand | Shallow Turquoise | `#497478` |
| Water — still surface / sky mirror | Sky Reflection | `#C3CFDE` |
| Suspended silt / muddy shallows | Silt | `#A4A090` |
| Bank / fresh deposit | Wet Earth | `#54513D` |
| Shore / waterline | Wet Sand | `#B4B4AC` |
| Marsh plain / wet grass | Marsh Olive | `#6D6E54` |
| Wet forest / cypress | Swamp Canopy | `#596143` |
| Deep shade / wettest soil | Land Shadow | `#232519` |
| Open land / healthy growth | Field Green | `#3F4B27` |
| Dry grass / ripe field | Cane Gold | `#8E6836` |
| Day sky (hazed) | Humid Sky | `#9BBADD` |
| Low-sun light (tint, not a surface) | Dusk Amber | `#D3A270` |

Foam and glints are the only near-whites allowed, and they stay warm.

## Light doctrine

- One sun, low and warm by default; shadows cool and desaturated.
- Everything is slightly hazed — distance softens toward Humid Sky,
  never toward white.
- Still water renders as a **mirror of the sky first** (Sky Reflection),
  tinted by its bed: olive over mud, turquoise over sand, grey over silt.
- Night and dusk are in-palette (moonlit coast, blue-hour lake are core
  reference frames), not a filter applied afterwards.

## Camera & surface (carried from the v0.2 → tilt-pass design)

- Top-down tilted miniature (the "tilt pass"): continuous shaded mesh,
  no visible grid, one consistent light direction.
- Detail density stays low and rule-placed (cypress knees, reed lines,
  cane rows) — texture comes from light and water behavior, not clutter.
- Water motion is the spectacle: flow streaks, foam at edges, silt clouds.
  Land changes slowly and keeps the memory of what the player did.

## Geography of record

Louisiana → Florida Gulf, from Shane's own bank: bayou & cypress swamp,
marsh waterways, cane fields, the big grey river, white-sand Florida
shallows. Off-geography references (desert, volcano, alpine) are excluded
from the look even when they are beautiful.

## Provenance rules (binding)

1. The **core** moodboard frames are Shane's own photographs; they alone
   set the palette of record.
2. Saved professional frames in the bank are **inspiration tier** —
   qualities only (water form, drama, light), never traced, never assets.
3. Another artist's designed work (e.g. theme-park icons) is excluded
   on sight, even from inspiration.
4. The PRIVATE family folder is excluded from all game reference work.

_Moodboard v1 (viewable, with the 26 frames and per-frame extracted
colors) lives in the floor pack: FACTORY/Homebox Data/watershed-moodboard/
— it contains personal photos and is not published to the site or repo._
