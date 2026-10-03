/* games/political-hq-nudge.js  |  PF v1.4.3 | Front-door nudge to Political HQ.
   A punchy CTA card on the homepage driving traffic to /political-hq.
   KILL: ?pf_off=hq-nudge  or  localStorage pf_disabled_v1='["hq-nudge"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("hq-nudge")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-hq-nudge">
<div class="fe-block pf-override-block pf-silo" id="pf-hq-nudge">
<div class="pf-hq-nudge-card" style="background:linear-gradient(135deg,#0a0a0a 0%,#1a0505 100%);border:2px solid #c1121f;padding:28px 24px;text-align:center;margin:16px 0;">
<div style="font-size:13px;letter-spacing:3px;color:#c1121f;font-weight:800;margin-bottom:8px;">NEW BATTLEGROUND</div>
<h2 style="color:#f5ead6;font-size:28px;margin:0 0 12px 0;letter-spacing:1px;">POLITICAL HQ</h2>
<p style="color:#ccc;font-size:15px;max-width:520px;margin:0 auto 20px auto;line-height:1.5;">Petitions. Rep contact. Voter registration. The People's Assembly. Wage civic warfare off the timeline.</p>
<a href="/political-hq" class="pf-btn" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:16px;padding:14px 36px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">ENTER THE HQ →</a>
</div>
</div>
</template>`);
})();
