/* ============================================================================
   SILO: games/comrades.js  |  PF v1.3.0
   WHAT: Find Your Comrades / Community link hub (social links)
   PHASE: games: template now, mounted by pages/home-v2.js on /v2 only.
          Inert on all other paths (staged inside <template>).
   KILL: ?pf_off=comrades  or  localStorage pf_disabled_v1='["comrades"]'
   SOURCE: verbatim extract from the live https://www.mtcstw.com/ homepage
           (native Squarespace Code Block / block), community markdown block + minimal scoped PF style
   ============================================================================ */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("comrades")) { PF.log("comrades", "disabled via kill-switch"); return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-comrades">
<style>
#pf-comrades{max-width:900px;margin:0 auto;padding:2.2rem 1.2rem;text-align:center;}
#pf-comrades h2{letter-spacing:.14em;margin:0 0 .4rem;}
#pf-comrades p{opacity:.85;margin:0 0 1rem;}
#pf-comrades ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;}
#pf-comrades li{margin:0;}
#pf-comrades a{display:inline-block;padding:.55rem 1.1rem;border:2px solid #c1121f;color:#f5ead6;text-decoration:none;font-weight:700;letter-spacing:.06em;}
#pf-comrades a:hover{background:#c1121f;color:#fff;}
</style>
<div id="pf-comrades" class="fe-block pf-override-block">
<h2>COMMUNITY</h2>
<p>Find us across the internet:</p>
<ul>
<li><a href="https://discord.gg/jxete994tv">Discord</a></li>
<li><a href="https://www.facebook.com/MTCSTW/">Facebook — MTCSTW</a></li>
<li><a href="https://www.facebook.com/share/1Dtq6cjQTg/?mibextid=wwXIfr">Facebook — The Propaganda Factory</a></li>
<li><a href="https://x.com/MTCSTW1">X</a></li>
<li><a href="https://bsky.app/profile/mtcstw.com">Bluesky</a></li>
<li><a href="https://www.youtube.com/@MTCSTW">YouTube</a></li>
<li>Instagram: @propfac, @mtcstw</li>
</ul>
</div>
</template>`);
  PF.log("comrades", "silo loaded");
})();
