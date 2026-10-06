/* games/poster-forge-teaser.js  |  PF v1.4.3 | Poster Forge — HOMEPAGE TEASER.
   2026-10-06 (fe/homepage-decondense, CEO directive): the full forge
   (poster + video + political tabs, canvas, slogan engine) lives in
   games/poster-forge.js (+ poster-forge-political.js), shipped to /create
   via bundle-create-h — the homepage ships only this static teaser card +
   CTA (same template id pf-ov-poster, same ?pf_off=poster-forge kill
   switch). The hook is the widget's own sub-headline, so it's honest.
   Zero backend, zero XP. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("poster-forge")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-poster">
<div class="fe-block pf-override-block" id="pf-poster">
<style>
#pf-poster .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-poster .pft-kick{font-size:11px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-poster .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-poster .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-poster .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-poster .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#128736;&#65039; CREATE</div>
<div class="pft-title">The Poster Forge.</div>
<div class="pft-hook">Make propaganda. Download it. Plaster the internet.</div>
<a class="pft-cta" href="/create">OPEN THE WORKSHOP &rarr;</a>
</div>
</div>
</template>`);
})();
