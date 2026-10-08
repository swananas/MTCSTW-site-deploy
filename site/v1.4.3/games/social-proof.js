/* games/social-proof.js  |  PF v1.4.3 | Live social proof ticker.
   Slim bar near the top of the homepage showing the network is alive:
   "127 soldiers checked in today". Refreshes every 5 min. Session-dismissible.
   S2 (2026-10-04): Proof Wall strip under the bar — approved post-proof
   bounty posts (callsign + platform + bounty) from the social_proof feed.
   S3 (2026-10-05): static "8M+ network reach" stat in the bar (CEO directive);
   the "N soldiers checked in today" line is suppressed when check-ins are 0
   (never advertise an empty room) — XP earned / active cells show instead.
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
#pf-sp-proofwall{margin-top:8px;border:1px solid #333;background:#0d0d0d;padding:10px 14px;font-family:Arial,sans-serif;font-size:12px;color:#f5ead6}
.sp-pw-title{font:bold 11px Arial;color:#c1121f;letter-spacing:2px;margin-bottom:8px}
.sp-pw-row{display:flex;gap:8px;flex-wrap:wrap}
.sp-pw-chip{display:inline-flex;align-items:center;gap:6px;background:#141414;border:1px solid #333;border-left:3px solid #c1121f;padding:6px 10px;color:#f5ead6}
.sp-pw-chip b{color:#fff}
.sp-pw-chip i{font-style:normal;color:#9db4c8;font-size:11px;text-transform:uppercase;letter-spacing:1px}
.sp-pw-chip span{color:#888;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:520px){#pf-sp-bar{font-size:12px;gap:10px}}
@media(prefers-reduced-motion:reduce){#pf-sp-bar .sp-live{animation:none}}
</style>
<div id="pf-sp-bar" role="status" aria-live="polite">
<span class="sp-live" aria-hidden="true"></span>
<!-- S3 (2026-10-05): static 8M+ network reach stat (CEO directive — lives in
     SEO metadata only until now). Always visible, never wired to the backend. -->
<span class="sp-stat" id="pf-sp-reach"><b>8M+</b> network reach</span>
<span class="sp-stat" id="pf-sp-checkins">Loading network pulse&hellip;</span>
<span class="sp-stat" id="pf-sp-xp" style="display:none"></span>
<span class="sp-stat" id="pf-sp-cells" style="display:none"></span>
<span class="sp-stat" id="pf-sp-online" style="display:none"></span>
<!-- V3 (2026-10-07): do-meter headline number absorbed as one bar stat. -->
<span class="sp-stat" id="pf-sp-domn" style="display:none"></span>
<button id="pf-sp-x" aria-label="Dismiss">&times;</button>
</div>
<div id="pf-sp-proofwall" style="display:none"></div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function pwPlat(p){ p=String(p||"").toLowerCase();
  return p==="tiktok"?"TikTok":p==="instagram"?"IG":p==="facebook"?"FB":p==="youtube"?"YT":(p||"?"); }
function fmt(n){ n=Math.round(Number(n)||0); return n>=1000?(n/1000).toFixed(1).replace(/\\.0$/,'')+'K':String(n); }
function fmtDo(n){ n=Math.round(Number(n)||0);
  if(n>=1000000){ var m=n/1000000; return (m>=100?String(Math.round(m)):m.toFixed(1).replace(/\\.0$/,''))+'M'; }
  return fmt(n); }
/* V3 (2026-10-07): do-meter headline number absorbed as one bar stat.
   Primary: PF.homepageInit() composite (stats). Fallback: the tally layer's
   PF_GLOBAL_TASKS / local pf_do_v1 — do-meter's own sources, zero extra
   calls. Hides when no number is available. */
function doTasksNum(d){
  /* V3 composite ships stats.do_meter_total (from task_totals.total); the rest
     are legacy key names kept as a defensive fallback. */
  var cand=["do_meter_total","tasks_total","task_total","total_tasks","network_tasks","tasks_done","global_tasks"],
      st=(d&&d.stats)||null, i, v;
  if(st){ for(i=0;i<cand.length;i++){ v=Number(st[cand[i]]); if(v>0) return v; } }
  try{ if(window.PF_GLOBAL_TASKS>0) return Number(window.PF_GLOBAL_TASKS); }catch(e){}
  try{ var s=JSON.parse(localStorage.getItem("pf_do_v1")||"null");
    if(s&&s.w===PF.isoWeekKey(PF.chiNow())&&Number(s.total)>0) return Number(s.total); }catch(e2){}
  return 0;
}
function paintDoMeter(){
  var el=$("pf-sp-domn"); if(!el) return;
  var show=function(n){
    if(n>0){ el.innerHTML="<b>"+fmtDo(n)+"</b> tasks done"; el.style.display=""; }
    else { el.style.display="none"; }
  };
  try{
    if(window.PF&&typeof PF.homepageInit==="function"){
      PF.homepageInit().then(function(d){ show(doTasksNum(d)); },function(){ show(0); });
      return;
    }
  }catch(e){}
  show(doTasksNum(null));
}
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
  /* Cohesion §4 (2026-10-05): every counter carries its vintage label
     (server-supplied j.vintages, degraded if stale). Zero states are honest
     and invitational — never hidden, never faked. */
  function vline(key, fb){
    var v='';
    try{
      var raw=(j&&j.vintages&&j.vintages[key])||fb||'';
      v=(window.PF&&PF.degradedVintage)?PF.degradedVintage(raw,j&&j.as_of):raw;
    }catch(e){ v=fb||''; }
    return v?" <span style='opacity:.7;font-size:.85em'>("+v+")</span>":"";
  }
  var ci=$("pf-sp-checkins"), xp=$("pf-sp-xp"), cells=$("pf-sp-cells"), on=$("pf-sp-online");
  var n=Number(j.checkins_today)||0;
  /* §4: the check-ins line is never hidden at 0 — an honest, invitational
     zero state replaces the old hide-the-line behavior. */
  ci.style.display="";
  if(n>0){
    ci.innerHTML="<b>"+fmt(n)+"</b> soldier"+(n===1?"":"s")+" checked in today"+vline('checkins_today','today');
  } else {
    ci.innerHTML="No check-ins yet today \u2014 start the wave"+vline('checkins_today','today');
  }
  /* §4: zero states are honest and invitational — the counters are never
     hidden at 0 (replaces the pre-cohesion hide-the-line behavior). */
  xp.style.display="";
  if(j.xp_earned_today>0){ xp.innerHTML="\u26A1 <b>"+fmt(j.xp_earned_today)+"</b> XP earned today"+vline('xp_earned_today','today'); }
  else { xp.innerHTML="\u26A1 No XP logged yet today \u2014 do a mission"+vline('xp_earned_today','today'); }
  cells.style.display="";
  if(j.active_cells>0){ cells.innerHTML="\uD83C\uDFE0 <b>"+fmt(j.active_cells)+"</b> active cells"+vline('active_cells','trailing 7 days'); }
  else { cells.innerHTML="\uD83C\uDFE0 No active cells this week \u2014 muster one"+vline('active_cells','trailing 7 days'); }
  on.style.display="";
  if(j.online_now>0){ on.innerHTML="<b>"+fmt(j.online_now)+"</b> online now"+vline('online_now','last 15 minutes'); }
  else { on.innerHTML="No comrades online right now \u2014 check back soon"+vline('online_now','last 15 minutes'); }
  /* S2 (2026-10-04) — Proof Wall strip: approved post-proof posts.
     Composes with the pulse bar; extends it, doesn't replace it. */
  var pwel=$("pf-sp-proofwall");
  if(pwel){
    if(j.proof_wall&&j.proof_wall.length){
      pwel.style.display="";
      var ph='<div class="sp-pw-title">PROOF WALL &mdash; fresh posts from the field</div><div class="sp-pw-row">';
      for(var pi=0;pi<Math.min(j.proof_wall.length,12);pi++){
        var pw0=j.proof_wall[pi]||{};
        ph+='<span class="sp-pw-chip"><b>'+esc(pw0.callsign||"?")+'</b><i>'+esc(pwPlat(pw0.platform))+'</i><span>'+esc(pw0.bounty||"")+'</span></span>';
      }
      pwel.innerHTML=ph+'</div>';
    } else { pwel.style.display="none"; }
  }
}
function tick(){
  /* V3 (2026-10-07): paint from the homepage_init composite (stats key) —
     one shared call, not a separate social_proof fetch. Falls back to the
     direct api() only when the composite helper is unavailable. */
  try{
    if(window.PF&&typeof PF.homepageInit==="function"){
      PF.homepageInit().then(function(d){ paint(d&&d.stats); paintDoMeter(); },
        function(){ paint(null); paintDoMeter(); });
      return;
    }
  }catch(e){}
  api(paint); paintDoMeter();
}
var x=$("pf-sp-x");
if(x) x.onclick=function(){
  try{ sessionStorage.setItem('pf_sp_dismissed','1'); }catch(e){}
  var bar=$("pf-sp-bar"); if(bar) bar.style.display="none";
  var pwel=$("pf-sp-proofwall"); if(pwel) pwel.style.display="none";
};
tick();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },300000);
/* V3: repaint the absorbed do-meter stat when the tally layer syncs. */
document.addEventListener("pf-global-tasks",function(){ paintDoMeter(); });
document.addEventListener("pf-do-update",function(){ paintDoMeter(); });
})();
</scr`+`ipt>
</div>
</template>`);
})();
