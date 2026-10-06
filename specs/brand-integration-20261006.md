# SPEC — Brand Integration (fe/brand-integration, 2026-10-06)

CEO directive: site-wide brand + integration pass. The connective tissue on
top of the four-pillar spine — no dead ends, every pillar feeds the others,
one share brand everywhere. Extends `origin/fe/share-everywhere` (31/31),
never forks it. Merged in `fe/robbery-report` + `fe/data-bounties` for their
surfaces.

## Coverage map

| Surface | Shareable? | Linked? | Gap / action |
|---|---|---|---|
| Territory map, war map, cell war front, cell HQ, cell identity, predictions, pledge wall, check-in, Content Bank, fan vote, quiz, achievements/medals, enlistment papers | ✅ (share-everywhere bar) | partial | unchanged this pass |
| War card / raid card | ✅ (own painters) | partial | unchanged — per-game CTA exceptions hold |
| **Robbery Report item cards (29)** | ⚠️ had button, painters DEAD (all cards shared the generic daily-orders poster) | partial (live chip only) | FIXED: unified `resolvePoster` path; `data-pf-share` nets hooks; `NEXT → LIVE PRICES / CLAIM A BOUNTY` on every card |
| **Household baskets (4)** | ⚠️ same dead-painter bug | ✗ | FIXED: same as cards |
| Shrinkflation callouts | ✗ surface absent | ✗ | REG reserved (`shrinkflation`) — bar works day one |
| /prices → People's CPI board | ⚠️ own SHARE THIS BOARD button | ✅ loop law | nets row added; SHARE THIS INTEL handoff under board |
| People's CPI trends | ✗ no share at all | ✗ | nets row added |
| /peoples-cpi methodology footnote | ✗ | ✗ | SHARE THIS INTEL handoff at `#pf-inf-method` |
| Utilities vertical | ✗ surface absent | ✗ | REG reserved (`utilities`) |
| Stack 'Em | ⚠️ own SHARE THE RECEIPTS | ✅ xlinks | nets row added |
| FRED economy deepening (5 sections) | ✗ | ✗ | nets row + SHARE THIS INTEL at surface foot |
| Political HQ (9 sections) | partial (predict/predgame) | ✗ | page-level share bar + REPORT BACK handoff |
| War Report | ✗ no share at all | partial (nextActionRow) | full share bar after the report body (both branches) |
| War-report archive cards | ✗ surface absent (latest-only render) | ✗ | REG reserved (`war-report-archive`) |
| Data bounty board | ✗ (transactional) | ✗ | TAKE THIS TO YOUR CELL handoff (bounty boards → cells) |
| Academy certificate | ✗ | ✗ | ★ TAKE THIS TO YOUR CELL → /cells |
| Next Move bounty CTA | n/a | ✗ /bounty 404s live | FIXED: crossnav retargets /bounty → /data-bounties (both chrome bundles) |

## What was built

**share-everywhere.js (extended, not forked):**
- 13 new REG entries (robreport, robreport-basket, war-report, inflation-board,
  stackem, fred-economy, data-bounties, political-hq, academy + reserved
  shrinkflation / utilities / war-report-archive / peoples-cpi-methodology).
  Per-card/basket robreport REG registered dynamically from PFRobReportData.
- `PFShareEverywhere.registerPainter(gameId, fn)` + `drainExternalPainters()`
  (pulls `PFRobReport._painters` on every scan — fixes the dead-painter bug:
  PFShare.poster is the generic renderer and never consults CUSTOM).
- `PFShareEverywhere.handoff(host, kind, opts)` — three presets:
  `share-intel` → /create · `take-cell` → /cells · `report-back` → /data-bounties.
  Brand-styled, textContent-only (no HTML injection), safeHref-guarded.
- Scan modes: `data-pf-share-mode="nets"` renders the network intent row only
  (surfaces that already own their share/save buttons); `[data-pf-handoff]`
  declarative wiring; MutationObserver catches late mounts.
- CTA standard: paintFooter carries MTCSTW.COM + JOIN THE FIGHT. (red, bold)
  on every custom painter; robreport's own footerPoster already standard.

**Surface edits:** robreport.js (hooks, links, painter mirror, unified share
path), inflation-tracker.js (board/trends nets, 2× handoff), fred-stackem.js
(nets), fred-economy.js (nets + handoff), war-report.js (full bar),
data-bounties.js (take-cell handoff), academy.js (certificate → /cells),
political-hq.js (page bar + report-back), 19-crossnav.js (/bounty retarget).

**Tests:** scripts/verify-brand-integration-fe.js — 44 checks (node --check,
static, vm+DOM-shim runtime, sibling verifiers). All green. Bundles rebuilt
(bundle-core.js + bundle.js), all validated.

## Integration notes / open

- `/prices`, shrinkflation callouts, utilities vertical, war-report archive are
  not in this build (Squarespace-authored or pending surfaces) — REG entries
  are reserved so the bar/handoff work the day they land.
- The `/bounty` retarget fires in the footer chrome on the Squarespace 404
  page — needs a live-page check (open /bounty, expect redirect).
- War Report share uses the generic poster (no per-week painter) — a custom
  week-painter is a fast-follow if the CEO wants the report body in pixels.
