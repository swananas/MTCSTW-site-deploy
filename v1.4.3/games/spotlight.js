/* games/spotlight.js | PF v1.4.3 | SPOTLIGHT TEASER — "Today's Game".
   2026-10-06 (fe/homepage-decondense, CEO directive): the full rotating games
   (creator-guess / daily-interrogation / billionaire-supervillain) moved to
   /arcade — the homepage keeps only this static teaser card naming today's
   pick via the same Chicago day-of-year rotation the widget used, so the
   name shown is honest, plus a CTA to the arcade. Zero backend, zero XP.
   KILL: ?pf_off=spotlight  or  localStorage pf_disabled_v1='["spotlight"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("spotlight")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-spotlight">
<div class="fe-block pf-override-block" id="pf-spotlight">
<style>
#pf-spotlight .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-spotlight .pft-kick{font-size:11px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-spotlight .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-spotlight .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-spotlight .pft-hook b{color:#f5ead6}
#pf-spotlight .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-spotlight .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#127918; PLAY &middot; TODAY&rsquo;S GAME</div>
<div class="pft-title">Today&rsquo;s game.</div>
<div class="pft-hook">Today&rsquo;s pick: <b id="pf-spot-name">&hellip;</b><br>One game a day. The rest wait in the arcade.</div>
<a class="pft-cta" href="/arcade">PLAY IN THE ARCADE &rarr;</a>
</div>
<script>
(function(){
'use strict';
/* Same rotation the full widget used: Chicago day-of-year % 3, skipping
   games the visitor killed (?pf_off= / localStorage). */
var GAMES=[
  {key:'creator-guess',name:'Guess the Creator'},
  {key:'daily-interrogation',name:'The Daily Interrogation'},
  {key:'billionaire-supervillain',name:'Billionaire or Supervillain?'}
];
function chiNow(){ try{ return (window.PF&&window.PF.chiNow)?window.PF.chiNow():new Date(); }catch(e){ return new Date(); } }
function dayOfYear(d){
  var jan1=new Date(d.getFullYear(),0,1);
  var today=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.max(0,Math.round((today-jan1)/86400000));
}
function pick(){
  var doy=dayOfYear(chiNow());
  for(var i=0;i<GAMES.length;i++){
    var g=GAMES[(doy+i)%GAMES.length];
    try{ if(window.PF&&window.PF.skip&&window.PF.skip(g.key)) continue; }catch(e){}
    return g;
  }
  return GAMES[0];
}
try{
  var el=document.getElementById('pf-spot-name');
  if(el) el.textContent=pick().name;
}catch(e){}
})();
</scr`+`ipt>
</div>
</template>`);
})();
