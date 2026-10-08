/* games/slr-match-quiz-teaser.js  |  PF v1.4.3 | SLR Match Quiz — HOMEPAGE TEASER.
   2026-10-06 (fe/homepage-decondense, CEO directive): the full 5-question
   quiz (propaganda archetype + 3 creator matches) lives in
   games/slr-match-quiz.js, shipped to /arcade via bundle-arcade-h — the
   homepage ships only this static teaser card + CTA (same template id
   pf-ov-matchquiz, same ?pf_off=slr-match-quiz kill switch). Zero backend,
   zero XP. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("slr-match-quiz")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-matchquiz">
<div class="fe-block pf-override-block" id="pf-matchquiz">
<style>
#pf-matchquiz .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-matchquiz .pft-kick{font-size:11px;letter-spacing:4px;color:#e5383b;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-matchquiz .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-matchquiz .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-matchquiz .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-matchquiz .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#127918; PLAY</div>
<div class="pft-title">Find your SLR match.</div>
<div class="pft-hook">5 questions. Your propaganda archetype. 3 creator matches.</div>
<a class="pft-cta" href="/arcade">TAKE THE QUIZ &rarr;</a>
</div>
</div>
</template>`);
})();
