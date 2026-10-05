/* games/war-map.js  |  PF v1.4.3 | W5-12 Frontlines — Cell War Map.
   Weekly territory leaderboard: cross-system actions (Route March, recruit
   conversions, Ambush claims, approved post-proofs, flash-window actions)
   score TERRITORY POINTS for the actor's cell. Chicago-Monday season reset.
   All Fronts ops double everything (LIVE-FIRE 2X).
   Honorific only: territory points are NEVER XP and never convertible.
   Reads ?action=warmap_status (public standings; the mine block rides along
   when the caller's auth verifies).
   KILL: ?pf_off=war-map  or  localStorage pf_disabled_v1='["war-map"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-map")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-warmap">
<div class="fe-block pf-override-block pf-silo" id="pf-war-map">
<div id="xWarMap"><div class="wm-load">Surveying the front&hellip;</div></div>
</div>
<style>
#pf-war-map .wm-wrap{background:linear-gradient(165deg,#0b0b0c 0%,#200808 55%,#0b0b0c 100%);border:3px solid #c1121f;padding:26px 22px;max-width:700px;margin:18px auto;text-align:center;box-shadow:0 0 28px rgba(193,18,31,.4), inset 0 0 60px rgba(0,0,0,.6);color:#f5ead6;font-family:Arial,sans-serif;position:relative;overflow:hidden}
#pf-war-map .wm-wrap:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.18) 3px 4px)}
#pf-war-map .wm-kicker{font-size:12px;letter-spacing:5px;color:#c1121f;font-weight:800;margin-bottom:6px}
#pf-war-map h2{font-family:'Arial Black',Arial,sans-serif;color:#f5ead6;font-size:32px;margin:0 0 4px;letter-spacing:3px;text-transform:uppercase;text-shadow:2px 2px 0 #000}
#pf-war-map .wm-week{font-family:'Courier New',monospace;font-size:14px;color:#ffb347;letter-spacing:2px;margin-bottom:10px}
#pf-war-map .wm-live{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:13px;letter-spacing:2px;padding:8px 18px;margin:6px 0 12px;animation:wmPulse 1.6s infinite;border:2px solid #fff}
@keyframes wmPulse{0%,100%{box-shadow:0 0 0 rgba(193,18,31,.7)}50%{box-shadow:0 0 22px rgba(193,18,31,.9)}}
#pf-war-map .wm-leader{border:2px solid #ffb347;background:linear-gradient(90deg,#2a1503,#3a1e05);padding:12px;margin:0 0 14px}
#pf-war-map .wm-leader .wm-crown{font-size:22px}
#pf-war-map .wm-leader .wm-lname{font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#ffb347;letter-spacing:1px;margin:2px 0}
#pf-war-map .wm-leader .wm-lsub{font-size:12px;color:#d8c9a3;letter-spacing:1px}
#pf-war-map .wm-row{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;background:rgba(10,10,10,.75);border:1px solid #4a4a4a;padding:10px 12px;margin-bottom:8px;text-align:left;position:relative}
#pf-war-map .wm-row.wm-mine{border:2px solid #ffb347;background:rgba(42,21,3,.85)}
#pf-war-map .wm-pos{font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#c1121f;text-align:center;text-shadow:1px 1px 0 #000}
#pf-war-map .wm-row.wm-mine .wm-pos{color:#ffb347}
#pf-war-map .wm-name{font-weight:800;font-size:15px;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px}
#pf-war-map .wm-tag{display:inline-block;background:#ffb347;color:#000;font-size:10px;font-weight:800;padding:1px 7px;margin-left:6px;letter-spacing:1px;vertical-align:middle}
#pf-war-map .wm-sub{font-size:12px;color:#b3a687;margin-top:2px}
#pf-war-map .wm-bar{height:9px;background:#1c1c1c;margin-top:7px;border:1px solid #555}
#pf-war-map .wm-bar i{display:block;height:100%;background:linear-gradient(90deg,#7a0c14,#c1121f,#ff5a00)}
#pf-war-map .wm-pts{font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#ffb347;text-align:right;white-space:nowrap}
#pf-war-map .wm-pts small{display:block;font-size:10px;color:#b3a687;font-weight:400;letter-spacing:1px}
#pf-war-map .wm-minebox{border:2px dashed #ffb347;background:rgba(42,21,3,.6);padding:10px 12px;margin:12px 0;font-size:13px;color:#f5ead6;letter-spacing:.5px}
#pf-war-map .wm-minebox b{color:#ffb347}
#pf-war-map .wm-flips{margin:14px 0 4px;text-align:left}
#pf-war-map .wm-flips h4{font-size:11px;letter-spacing:3px;color:#c1121f;margin:0 0 8px;font-weight:800}
#pf-war-map .wm-flip{display:block;background:rgba(20,20,20,.8);border-left:4px solid #c1121f;padding:8px 10px;margin-bottom:6px;font-size:13px;color:#f5ead6;text-decoration:none}
#pf-war-map .wm-flip:hover{background:rgba(40,12,12,.9)}
#pf-war-map .wm-flip .wm-ago{font-size:11px;color:#b3a687;margin-left:6px;font-family:'Courier New',monospace}
#pf-war-map .wm-legend{font-size:11.5px;color:#b3a687;line-height:1.7;margin-top:12px;border-top:1px solid #4a4a4a;padding-top:10px}
#pf-war-map .wm-legend b{color:#f5ead6}
#pf-war-map .wm-count{font-family:'Courier New',monospace;font-size:13px;color:#ffb347;letter-spacing:1px;margin:8px 0 4px}
#pf-war-map .wm-empty{font-size:14px;color:#b3a687;padding:16px 0;line-height:1.6}
#pf-war-map .wm-load{color:#b3a687;font-size:14px;padding:20px}
#pf-war-map .wm-cta{margin-top:14px}
#pf-war-map .wm-btn{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:14px;padding:12px 28px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;margin:4px;cursor:pointer}
#pf-war-map .wm-btn.wm-ghost{background:transparent;border-color:#c1121f;color:#f5ead6}
</style>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} return cs; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private-adjacent read: the mine block needs auth. Prefer the shared
     authGetJSONP; fall back to attaching auth_secret manually. */
  try{
    if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
  }catch(e){}
  try{
    var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
    if(_sec&&params&&!params.auth_secret) params.auth_secret=<redacted>
  }catch(e2){}
  var fn="pfWmCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false, timer=null;
  function finish(j){ if(done)return; done=true;
    if(timer){clearTimeout(timer);timer=null;}
    try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  timer=setTimeout(function(){ finish(null); },12000);
}
/* UTC ms of 00:00 America/Chicago on (dayStr + addDays). */
function chicagoMidnightMs(dayStr,addDays){
  try{
    var base=Date.parse(String(dayStr).slice(0,10)+"T12:00:00Z")+(addDays||0)*86400000;
    var ymd=new Date(base).toISOString().slice(0,10);
    var guess=Date.parse(ymd+"T12:00:00Z");
    for(var i=0;i<3;i++){
      var parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(guess)).split(":");
      guess=guess-((+parts[0])*3600000+(+parts[1])*60000+(+parts[2])*1000);
    }
    return guess;
  }catch(e){ return Date.now()+86400000; }
}
function fmtDate(ymd){
  try{
    var p=String(ymd).slice(0,10).split("-");
    var M=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return M[+p[1]-1]+" "+(+p[2]);
  }catch(e){ return String(ymd||""); }
}
function ago(ts){
  var s=Math.max(0,Math.floor((Date.now()-ts)/1000));
  if(s<60) return s+"s AGO";
  var m=Math.floor(s/60); if(m<60) return m+"m AGO";
  var h=Math.floor(m/60); if(h<24) return h+"h AGO";
  return Math.floor(h/24)+"d AGO";
}
function fmt(n){ n=Math.round(Number(n)||0); return n.toLocaleString("en-US"); }
var WAR_END=0, TICK=null;
function tick(){
  var el=document.getElementById("wmCount"); if(!el) return;
  var ms=WAR_END-Date.now(); if(ms<0) ms=0;
  var d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000),
      m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
  el.textContent="MAP RESETS IN "+d+"d "+h+"h "+m+"m "+s+"s";
}
function goCells(){
  try{
    var onCells=/\\/cells\\/?$/.test(window.location.pathname||'');
    if(onCells){
      var t=document.getElementById("pf-cells");
      if(t){ t.scrollIntoView({behavior:"smooth",block:"start"}); return; }
    }
  }catch(e){}
  try{ window.location.href="/cells"; }catch(e2){}
}
function render(j){
  var host=document.getElementById("xWarMap"); if(!host) return;
  if(!j||!j.ok){ host.innerHTML='<div class="wm-empty">The war drums are silent. Check back soon.</div>'; return; }
  WAR_END=chicagoMidnightMs(j.week_id,7);
  var rows=j.standings||[];
  var top=rows.length?rows[0].points:1;
  var mine=j.mine||null;
  var h='<div class="wm-wrap">';
  h+='<div class="wm-kicker">FRONTLINES &middot; WEEKLY TERRITORY WAR</div>';
  h+='<h2>\u2694\uFE0F Cell War Map</h2>';
  h+='<div class="wm-week">WEEK OF '+esc(fmtDate(j.week_id))+'</div>';
  h+='<div class="wm-count" id="wmCount">--</div>';
  if(j.live_fire){
    h+='<div><span class="wm-live">\u26A1 LIVE-FIRE 2X \u2014 ALL FRONTS ACTIVE</span></div>';
  }
  if(rows.length){
    var L=rows[0];
    h+='<div class="wm-leader"><div class="wm-crown">\uD83D\uDC51</div>'+
       '<div class="wm-lname">'+esc(L.cell_name)+'</div>'+
       '<div class="wm-lsub">HOLDING THE FRONT \u2014 '+fmt(L.points)+' TERRITORY PTS</div></div>';
    for(var i=0;i<rows.length;i++){
      var r=rows[i], pct=top>0?Math.max(4,Math.round(r.points/top*100)):4;
      var isMine=!!(mine&&mine.cell_id&&mine.cell_id===r.cell_id);
      h+='<div class="wm-row'+(isMine?' wm-mine':'')+'">';
      h+='<div class="wm-pos">'+(i+1)+'</div>';
      h+='<div><div class="wm-name">'+esc(r.cell_name)+(isMine?'<span class="wm-tag">YOUR CELL</span>':'')+'</div>';
      h+='<div class="wm-sub">'+fmt(r.fighters)+' fighter'+(r.fighters===1?'':'s')+' scoring</div>';
      h+='<div class="wm-bar"><i style="width:'+pct+'%"></i></div></div>';
      h+='<div class="wm-pts">'+fmt(r.points)+'<small>TERRITORY</small></div>';
      h+='</div>';
    }
  }else{
    h+='<div class="wm-empty">The front is quiet.<br>No territory claimed yet this week.<br>Be the first cell on the board.</div>';
  }
  if(mine&&mine.cell_id){
    h+='<div class="wm-minebox">YOUR CELL <b>'+esc(mine.cell_name||mine.cell_id)+'</b> \u2014 RANK #'+(mine.rank||'?')+
       ' \u2014 <b>'+fmt(mine.points)+'</b> PTS <span style="color:#b3a687">(cap '+mine.week_cap+'/wk)</span></div>';
  }else{
    h+='<div class="wm-cta"><button class="wm-btn" id="wmJoinCell" type="button">JOIN A CELL</button>'+
       '<button class="wm-btn wm-ghost" id="wmBuildCell" type="button">BUILD YOUR CELL</button></div>';
  }
  var flips=j.recent_flips||[];
  if(flips.length){
    h+='<div class="wm-flips"><h4>\uD83D\uDCCB SECTOR FLIPS</h4>';
    for(var f=0;f<flips.length;f++){
      var fl=flips[f];
      h+='<a class="wm-flip" href="/cells">'+esc(fl.name)+'<span class="wm-ago">'+esc(ago(fl.ts))+'</span></a>';
    }
    h+='</div>';
  }
  h+='<div class="wm-legend"><b>HOW TERRITORY IS WON:</b> Route March +1 &middot; Ambush claim +2 &middot; '+
     'Post-proof bounty +3 &middot; Recruit conversion +5 &middot; action in a flash window +1.<br>'+
     'During an All Fronts operation everything <b>doubles</b>. Fresh map every Monday.'+
     '<br><b>Honorific:</b> territory points are never XP and can never be converted.</div>';
  h+='</div>';
  host.innerHTML=h;
  if(TICK) clearInterval(TICK);
  tick(); TICK=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
  var jb=document.getElementById("wmJoinCell"), bb=document.getElementById("wmBuildCell");
  if(jb) jb.onclick=goCells;
  if(bb) bb.onclick=goCells;
}
function load(){
  api("warmap_status",{callsign:ident()},render);
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },60000);
})();
<\/script>
</template>`);
})();
