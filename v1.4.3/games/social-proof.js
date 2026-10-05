/* games/social-proof.js  |  PF v1.4.3 | Live social proof ticker.
   Slim bar near the top of the homepage showing the network is alive:
   "127 soldiers checked in today". Refreshes every 5 min. Session-dismissible.
   KILL: ?pf_off=social-proof  or  localStorage pf_disabled_v1='["social-proof"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("socialproof")) { return; }
  try {
    if (sessionStorage.getItem('pf_sp_dismissed') === '1') return;
  } catch (e) {}
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-socialproof">
<div class="fe-block pf-override-block pf-silo" id="pf-socialproof">
<style>
#pf-sp-bar{display:flex;align-items:center;gap:14px;background:#0a0a0a;border-left:4px solid #c1121f;padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:#f5ead6;flex-wrap:wrap}
#pf-sp-bar .sp-stat{white-space:nowrap}
#pf-sp-bar .sp-stat b{color:#c1121f;font-size:15px}
#pf-sp-bar .sp-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4caf50;animation:spPulse 2s infinite}
@keyframes spPulse{0%,100%{opacity:1}50%{opacity:.35}}
#pf-sp-x{margin-left:auto;background:none;border:1px solid #555;color:#888;cursor:pointer;font-size:14px;line-height:1;padding:4px 8px}
#pf-sp-x:hover{color:#fff;border-color:#c1121f}
@media(max-width:520px){#pf-sp-bar{font-size:12px;gap:10px}}
@media(prefers-reduced-motion:reduce){#pf-sp-bar .sp-live{animation:none}}
</style>
<div id="pf-sp-bar" role="status" aria-live="polite">
<span class="sp-live" aria-hidden="true"></span>
<span class="sp-stat" id="pf-sp-checkins">Loading network pulse&hellip;</span>
<span class="sp-stat" id="pf-sp-xp" style="display:none"></span>
<span class="sp-stat" id="pf-sp-cells" style="display:none"></span>
<span class="sp-stat" id="pf-sp-online" style="display:none"></span>
<button id="pf-sp-x" aria-label="Dismiss">&times;</button>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function $(id){ return document.getElementById(id); }
function fmt(n){ n=Math.round(Number(n)||0); return n>=1000?(n/1000).toFixed(1).replace(/\\.0$/,'')+'K':String(n); }
function api(cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfSpCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  s.src=BACKEND+"?action=social_proof&callback="+fn; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },10000);
}
function paint(j){
  var bar=$("pf-sp-bar"); if(!bar) return;
  /* L1 (2026-10-03): honest error state — don't leave "Loading network pulse…"
     forever when the backend is unreachable. The 5-minute poller self-heals
     on the next tick. */
  if(!j||!j.ok){
    var ci0=$("pf-sp-checkins");
    if(ci0) ci0.innerHTML="Network pulse unreachable \u2014 retrying";
    return;
  }
  var ci=$("pf-sp-checkins"), xp=$("pf-sp-xp"), cells=$("pf-sp-cells"), on=$("pf-sp-online");
  var n=Number(j.checkins_today)||0;
  ci.innerHTML="<b>"+fmt(n)+"</b> soldier"+(n===1?"":"s")+" checked in today";
  if(j.xp_earned_today>0){ xp.style.display=""; xp.innerHTML="\u26A1 <b>"+fmt(j.xp_earned_today)+"</b> XP earned"; }
  if(j.active_cells>0){ cells.style.display=""; cells.innerHTML="\uD83C\uDFE0 <b>"+fmt(j.active_cells)+"</b> active cells"; }
  if(j.online_now>0){ on.style.display=""; on.innerHTML="<b>"+fmt(j.online_now)+"</b> online now"; }
}
function tick(){ api(paint); }
var x=$("pf-sp-x");
if(x) x.onclick=function(){
  try{ sessionStorage.setItem('pf_sp_dismissed','1'); }catch(e){}
  var bar=$("pf-sp-bar"); if(bar) bar.style.display="none";
};
tick();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
