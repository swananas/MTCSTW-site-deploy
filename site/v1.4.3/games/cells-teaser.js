/* games/cells-teaser.js | PF v1.4.1 | CELLS — HOMEPAGE TEASER.
   2026-10-06 (fe/homepage-decondense, CEO directive): the full cell UI
   (build/join cells, standings, cell war) lives in games/cells.js, shipped
   to /cells via bundle-cells-h — the homepage ships only this static teaser
   card + CTA (same template id pf-ov-cells, same ?pf_off=cells kill switch).
   The hook is the widget's own tagline, so it's honest. No XP mechanics
   touched: cell XP (check-in streaks, recruit bounties, chainlinks) is
   backend-granted and unchanged on /cells. Zero backend calls here. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cells")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cells">
<div class="fe-block pf-override-block" id="pf-cells">
<style>
#pf-cells .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-cells .pft-kick{font-size:11px;letter-spacing:4px;color:#e5383b;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-cells .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-cells .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-cells .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-cells .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#127988; BELONG</div>
<div class="pft-title">Build your cell.</div>
<div class="pft-hook">Five callsigns. One streak. Nobody gets left behind.</div>
<a class="pft-cta" href="/cells">OPEN CELLS &rarr;</a>
</div>
</div>
</template>`);
})();
