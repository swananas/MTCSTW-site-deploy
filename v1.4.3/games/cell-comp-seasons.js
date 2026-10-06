/* games/cell-comp-seasons.js  |  PF v1.4.3 | CELLS 2.0 — Competition Seasons.
   Season = 4 consecutive Chicago-Monday weeks (season_id = first Monday of
   the block). Each weekly competition win = 1 season point; tiebreak = total
   counts across the season. Finalize is lazy on read (existing cellcomp
   pattern). Rewards: crown + feed announcement + history entry.
   Reads GET ?action=cellcomp_season_status (public live standings) and
   GET ?action=cellcomp_season_history (public sealed seasons, newest first).
   Standings are aggregate and public; no per-user targeting.
   Zero XP. No new XP mechanics, no currencies — crowns and honor only.
   KILL: ?pf_off=cell-comp-seasons  or  localStorage pf_disabled_v1='["cell-comp-seasons"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cell-comp-seasons")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cellcomp-seasons">
<div class="fe-block pf-override-block pf-silo" id="pf-cellcomp-seasons">
<div id="xCellCompSeasons"><div class="cs-load">Opening the season books&hellip;</div></div>
</div>
<style>
#pf-cellcomp-seasons .cs-wrap{background:linear-gradient(165deg,#0b0b0c 0%,#141006 55%,#0b0b0c 100%);border:3px solid #c9a227;padding:26px 22px;max-width:760px;margin:18px auto;text-align:center;box-shadow:0 0 28px rgba(201,162,39,.35), inset 0 0 60px rgba(0,0,0,.6);color:#f5ead6;font-family:Arial,sans-serif;position:relative;overflow:hidden}
#pf-cellcomp-seasons .cs-wrap:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.18) 3px 4px)}
#pf-cellcomp-seasons .cs-kicker{font-size:12px;letter-spacing:5px;color:#c9a227;font-weight:800;margin-bottom:6px}
#pf-cellcomp-seasons h2{font-family:'Arial Black',Arial,sans-serif;color:#f5ead6;font-size:30px;margin:0 0 4px;letter-spacing:3px;text-transform:uppercase;text-shadow:2px 2px 0 #000}
#pf-cellcomp-seasons .cs-season{font-family:'Courier New',monospace;font-size:13px;color:#ffb347;letter-spacing:2px;margin-bottom:10px}
#pf-cellcomp-seasons .cs-prog{max-width:420px;margin:10px auto 4px}
#pf-cellcomp-seasons .cs-proglabel{font-size:12px;letter-spacing:2px;color:#f5ead6;margin-bottom:5px}
#pf-cellcomp-seasons .cs-bar{height:10px;background:#1c1c1c;border:1px solid #555}
#pf-cellcomp-seasons .cs-bar i{display:block;height:100%;background:linear-gradient(90deg,#8a6d1f,#c9a227,#ffe27a)}
#pf-cellcomp-seasons .cs-metric{margin:16px 0 4px;text-align:left}
#pf-cellcomp-seasons .cs-metric h3{font-size:14px;letter-spacing:3px;color:#c9a227;margin:0 0 8px;font-weight:800;text-transform:uppercase}
#pf-cellcomp-seasons .cs-row{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;background:rgba(10,10,10,.75);border:1px solid #4a4a4a;padding:9px 12px;margin-bottom:7px;text-align:left}
#pf-cellcomp-seasons .cs-row.cs-first{border:2px solid #c9a227;background:rgba(42,32,6,.85)}
#pf-cellcomp-seasons .cs-pos{font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#c9a227;text-align:center;text-shadow:1px 1px 0 #000}
#pf-cellcomp-seasons .cs-name{font-weight:800;font-size:14.5px;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px}
#pf-cellcomp-seasons .cs-sub{font-size:11.5px;color:#b3a687;margin-top:2px}
#pf-cellcomp-seasons .cs-pts{font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#ffe27a;text-align:right;white-space:nowrap}
#pf-cellcomp-seasons .cs-pts small{display:block;font-size:10px;color:#b3a687;font-weight:400;letter-spacing:1px}
#pf-cellcomp-seasons .cs-champs{margin:18px 0 4px;text-align:left;border-top:1px solid #4a4a4a;padding-top:14px}
#pf-cellcomp-seasons .cs-champs h3{font-size:14px;letter-spacing:3px;color:#c9a227;margin:0 0 8px;font-weight:800}
#pf-cellcomp-seasons .cs-champ{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(10,10,10,.75);border:1px solid #4a4a4a;padding:9px 12px;margin-bottom:7px}
#pf-cellcomp-seasons .cs-champ .cs-cname{font-weight:800;font-size:14px;color:#f5ead6}
#pf-cellcomp-seasons .cs-champ .cs-csub{font-size:11.5px;color:#b3a687;font-family:'Courier New',monospace}
#pf-cellcomp-seasons .cs-empty{font-size:14px;color:#b3a687;padding:16px 0;line-height:1.6}
#pf-cellcomp-seasons .cs-load{color:#b3a687;font-size:14px;padding:20px}
#pf-cellcomp-seasons .cs-note{font-size:11.5px;color:#b3a687;line-height:1.7;margin-top:12px;border-top:1px solid #4a4a4a;padding-top:10px}
#pf-cellcomp-seasons .cs-note b{color:#f5ead6}
</style>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCsCb"+Math.floor(Math.random()*1e9);
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
function fmt(n){ n=Math.round(Number(n)||0); return n.toLocaleString("en-US"); }
function fmtDate(sealed){
  try{
    var ms=Number(sealed); if(ms>0&&ms<1e12) ms=ms*1000;
    if(!(ms>0)) return "";
    return new Date(ms).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  }catch(e){ return ""; }
}
function metricLabel(m){
  var s=String(m||"").replace(/[_-]+/g," ").replace(/\\s+/g," ").trim();
  if(!s) return "COMPETITION";
  return s.toUpperCase();
}
var ST=null, HI=null, gS=false, gH=false;
function render(){
  var host=document.getElementById("xCellCompSeasons"); if(!host) return;
  if(!gS||!gH) return;
  var h='<div class="cs-wrap">';
  h+='<div class="cs-kicker">CELLS 2.0</div>';
  h+='<h2>Competition Seasons</h2>';
  var okS=!!(ST&&ST.ok), okH=!!(HI&&HI.ok);
  if(!okS&&!okH){
    /* Fail-soft: both reads down — honest offline state. */
    host.innerHTML=h+'<div class="cs-empty">The season books are offline right now.<br>Check back soon.</div></div>';
    return;
  }
  if(okS){
    var seasonId=String(ST.season_id||ST.week_id||"");
    /* Backend contract: week_index / season_weeks (not week_no / weeks_total). */
    var wkTot=Math.max(1,Number(ST.season_weeks)||4);
    var wkNo=Math.max(1,Math.min(wkTot,Number(ST.week_index)||1));
    h+='<div class="cs-season">SEASON '+(seasonId?esc(seasonId):'LIVE')+'</div>';
    h+='<div class="cs-prog"><div class="cs-proglabel">WEEK '+wkNo+' OF '+wkTot+'</div>'+
      '<div class="cs-bar"><i style="width:'+Math.round(wkNo/wkTot*100)+'%"></i></div></div>';
    /* Backend contract: metrics is an OBJECT keyed by metric name, each value
       {metric_label, standings:[...]} — not an array of {metric, rows}. */
    var mKeys=(ST.metrics&&typeof ST.metrics==="object")?Object.keys(ST.metrics):[];
    if(!mKeys.length){
      h+='<div class="cs-empty">No competitions scored yet this season.<br>Get your cell in the fight.</div>';
    }
    for(var mi=0;mi<mKeys.length;mi++){
      var mk=mKeys[mi], m=(ST.metrics[mk]||{}), rows=(m.standings&&m.standings.length)?m.standings:[];
      h+='<div class="cs-metric"><h3>'+esc(m.metric_label||metricLabel(mk))+'</h3>';
      if(!rows.length){ h+='<div class="cs-empty">No scores yet.</div>'; }
      for(var i=0;i<rows.length;i++){
        var r=rows[i]||{};
        h+='<div class="cs-row'+(i===0?' cs-first':'')+'">';
        h+='<div class="cs-pos">'+(i+1)+'</div>';
        h+='<div><div class="cs-name">'+(i===0?'\\uD83D\\uDC51 ':'')+esc(r.cell_name||r.cell_id||'Cell')+'</div>'+
          '<div class="cs-sub">'+fmt(r.total_cnt||0)+' total scored (tiebreak)</div></div>';
        h+='<div class="cs-pts">'+fmt(r.weekly_wins||0)+'<small>SEASON PTS</small></div>';
        h+='</div>';
      }
      h+='</div>';
    }
  }
  if(okH){
    var seasons=(HI.seasons&&HI.seasons.length)?HI.seasons:[];
    h+='<div class="cs-champs"><h3>\\uD83C\\uDFC6 Past Champions</h3>';
    if(!seasons.length){ h+='<div class="cs-empty">No sealed seasons yet — the first crown is still up for grabs.</div>'; }
    for(var s=0;s<seasons.length;s++){
      var cs=seasons[s]||{};
      var dt=fmtDate(cs.sealed_at);
      h+='<div class="cs-champ"><span><span class="cs-cname">\\uD83D\\uDC51 '+esc(cs.champion_cell_name||cs.champion_cell_id||'Unknown cell')+'</span><br>'+
        '<span class="cs-csub">SEASON '+esc(String(cs.season_id||''))+(dt?' · SEALED '+esc(dt):'')+'</span></span></div>';
    }
    h+='</div>';
  }
  h+='<div class="cs-note"><b>HOW SEASONS WORK:</b> four Chicago-Monday weeks, one block. Each weekly competition win = 1 season point; ties break on total scored across the season.<br>'+
    '<b>Crowns and honor only</b> — seasons never mint XP and never will.</div>';
  h+='</div>';
  host.innerHTML=h;
}
function load(){
  gS=false; gH=false; ST=null; HI=null;
  api("cellcomp_season_status",{},function(j){ ST=j; gS=true; render(); });
  api("cellcomp_season_history",{},function(j){ HI=j; gH=true; render(); });
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },60000);
})();
<\/script>
</template>`); })();
