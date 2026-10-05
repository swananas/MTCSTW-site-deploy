/* games/inflation-teaser.js  |  PF v1.4.3 | HP feeder for the People's Price Index.
   Compact FUND-section card driving homepage traffic to /economy (the A1 home).
   Deep links: REPORT A PRICE -> /economy#pf-inflation-checkin,
               SEE THE INDEX  -> /economy#pf-inflation-trends.
   No backend calls on the homepage (perf: bundle-home is near its cap) — the
   live index lives on /economy; this card is the invitation, not the data.
   Ethical rails (Psych A1 conditions verbatim): the teaser never promises
   individual reward or precision — anonymous community medians, never sold.
   ZERO XP: grants, shows, and promises no XP (Economy Desk APPROVE).
   KILL: ?pf_off=inflation-teaser  or  localStorage pf_disabled_v1='["inflation-teaser"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('inflation-teaser')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-inflation-teaser">
<div class="fe-block pf-override-block pf-silo" id="pf-inflation-teaser">
<div style="background:linear-gradient(135deg,#0a0a0a 0%,#1a0505 100%);border:2px solid #c1121f;padding:28px 24px;text-align:center;margin:16px 0;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
<div style="font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;">THE PEOPLE&rsquo;S PRICE INDEX</div>
<h2 style="color:#f5f0e6;font-size:24px;margin:0 0 12px 0;letter-spacing:1px;">THEY LIE ABOUT INFLATION. WE COUNT IT.</h2>
<p style="color:#ccc;font-size:15px;max-width:520px;margin:0 auto 8px auto;line-height:1.5;">The government won&rsquo;t give us an honest inflation number, so we&rsquo;re building our own &mdash; one grocery receipt at a time.</p>
<p style="color:#a89e88;font-size:12.5px;max-width:520px;margin:0 auto 20px auto;line-height:1.5;">Your reports become anonymous community medians. Never sold. ZIP or city only &mdash; never your address, never your name. Recognition only: 0 XP.</p>
<a href="/economy#pf-inflation-checkin" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:16px;padding:14px 36px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">REPORT A PRICE &rarr;</a>
<div style="margin-top:12px;"><a href="/economy#pf-inflation-trends" style="color:#e8a0a0;font-size:13px;letter-spacing:.1em;">SEE THE INDEX &rarr;</a></div>
</div>
</div>
</template>`);
})();
