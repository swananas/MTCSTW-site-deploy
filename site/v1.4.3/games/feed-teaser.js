/* games/feed-teaser.js  |  PF v1.4.3 | PROPAGANDA FEED — HOMEPAGE TEASER.
   2026-10-06 (fe/homepage-decondense, CEO directive): the full feed
   (TRENDING / NEW / TOP / BOOST / VAULT tabs, amplify, archive) lives in
   games/feed.js, shipped to /create via bundle-create-h — the homepage ships
   only this static teaser card + CTA (same template id pf-ov-feed, same
   ?pf_off=feed kill switch). The hook is the widget's own tagline, so it's
   honest. The boost/amplify XP spend mechanics are unchanged on /create.
   Zero backend calls here. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("feed")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-feed">
<div class="fe-block pf-override-block" id="pf-feed">
<style>
#pf-feed .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-feed .pft-kick{font-size:11px;letter-spacing:4px;color:#e5383b;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-feed .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-feed .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-feed .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-feed .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#128736;&#65039; CREATE</div>
<div class="pft-title">Propaganda Feed.</div>
<div class="pft-hook">Fresh ammo. Find it. Pump it. Track the spread.</div>
<a class="pft-cta" href="/create">OPEN THE FEED &rarr;</a>
</div>
</div>
</template>`);
})();
