/* games/cell-war.js  |  PF v1.4.3 | Weekly Cell War — marquee event widget.
   Monday 00:00 - Sunday 23:59 CT: cells compete on member XP earned.
   Winner gets the CHAMPIONS crown + members earn +10% XP the next week.
   KILL: ?pf_off=cell-war  or  localStorage pf_disabled_v1='["cell-war"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cell-war")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cellwar">
<div class="fe-block pf-override-block pf-silo" id="pf-cell-war">
<div id="xCellWar"><div class="cw-load">Mustering the armies&hellip;</div></div>
</div>
<style>
#pf-cell-war .cw-wrap{background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);border:3px solid #c1121f;padding:26px 22px;max-width:680px;margin:18px auto;text-align:center;box-shadow:0 0 24px rgba(193,18,31,.35);color:#f5ead6;font-family:Arial,sans-serif}
#pf-cell-war .cw-kicker{font-size:12px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:6px}
#pf-cell-war .cw-stakes{font-size:13px;letter-spacing:3px;color:#e8b64c;font-weight:800;margin-bottom:10px;text-transform:uppercase}
#pf-cell-war h2{font-family:'Arial Black',Arial,sans-serif;color:#f5ead6;font-size:30px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-cell-war h2 .cw-week{color:#c1121f}
#pf-cell-war .cw-count{font-family:'Courier New',monospace;font-size:15px;color:#ffb347;letter-spacing:1px;margin-bottom:14px}
#pf-cell-war .cw-champ{background:#c1121f;color:#fff;font-weight:800;font-size:14px;padding:10px 14px;margin:0 0 16px;letter-spacing:1px}
#pf-cell-war .cw-champ small{display:block;font-weight:400;font-size:12px;margin-top:4px;letter-spacing:0}
#pf-cell-war .cw-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;background:#161616;border:1px solid #333;padding:10px 12px;margin-bottom:8px;text-align:left}
#pf-cell-war .cw-row.cw-mine{border:2px solid #ffb347;background:#1e1508}
#pf-cell-war .cw-pos{font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#c1121f;text-align:center}
#pf-cell-war .cw-row.cw-mine .cw-pos{color:#ffb347}
#pf-cell-war .cw-name{font-weight:800;font-size:15px;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pf-cell-war .cw-sub{font-size:12px;color:#a89e88;margin-top:2px}
#pf-cell-war .cw-sub .cw-flame{margin-right:4px}
#pf-cell-war .cw-mine-tag{display:inline-block;background:#ffb347;color:#000;font-size:10px;font-weight:800;padding:1px 6px;margin-left:6px;letter-spacing:1px;vertical-align:middle}
#pf-cell-war .cw-bar{height:8px;background:#2a2a2a;margin-top:6px;border:1px solid #444}
#pf-cell-war .cw-bar i{display:block;height:100%;background:linear-gradient(90deg,#c1121f,#ff5a00)}
#pf-cell-war .cw-xp{font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#ffb347;text-align:right;white-space:nowrap}
#pf-cell-war .cw-cta{margin-top:16px}
#pf-cell-war .cw-btn{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;margin:4px;cursor:pointer}
#pf-cell-war .cw-btn.cw-ghost{background:transparent;border-color:#c1121f;color:#f5ead6}
#pf-cell-war .cw-note{font-size:12px;color:#a89e88;margin-top:12px;line-height:1.5}
#pf-cell-war .cw-empty{font-size:14px;color:#a89e88;padding:14px 0;line-height:1.6}
#pf-cell-war .cw-load{color:#a89e88;font-size:14px;padding:20px}
/* G6 (2026-10-04): War Room odds strip — live championship odds from
   the war board + market escrow pools. Zero XP for viewing. */
#pf-cell-war .cw-odds{margin:6px 0 8px;border:1px dashed #c1121f;padding:12px 10px;background:#100808}
#pf-cell-war .cw-okick{font-size:11px;letter-spacing:3px;color:#ffb347;font-weight:800;margin-bottom:8px}
#pf-cell-war .cw-orow{display:grid;grid-template-columns:1fr auto;gap:8px;padding:6px 4px;border-top:1px solid #2a2a2a;font-size:13px;text-align:left}
#pf-cell-war .cw-oname{font-weight:800;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pf-cell-war .cw-oev{font-family:'Courier New',monospace;color:#ffb347;font-size:12px;white-space:nowrap}
#pf-cell-war .cw-obet{display:inline-block;margin-top:10px;background:transparent;border:1px solid #ffb347;color:#ffb347;font-weight:800;font-size:12px;padding:8px 18px;text-decoration:none;letter-spacing:1px}
#pf-cell-war .cw-ofree{font-size:11px;color:#a89e88;margin-top:8px}
</style>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} return {callsign:cs}; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCwCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
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
function fmt(n){ n=Math.round(Number(n)||0); return n.toLocaleString("en-US"); }
var WAR_END=0, TICK=null;
function tick(){
  var el=document.getElementById("cwCount"); if(!el) return;
  var ms=WAR_END-Date.now();
  if(ms<0) ms=0;
  var d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000),
      m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
  el.textContent=d+"d "+h+"h "+m+"m "+s+"s REMAINING";
}
function goCells(){
  /* 2026-10-03: the cells lobby lives at /cells now (was a homepage
     scroll target). On /cells, smooth-scroll to the cells widget;
     from anywhere else, navigate there. */
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
  var host=document.getElementById("xCellWar"); if(!host) return;
  if(!j||!j.ok){ host.innerHTML='<div class="cw-empty">The war drums are silent. Check back soon.</div>'; return; }
  WAR_END=chicagoMidnightMs(j.week_start,7);
  var rows=(j.standings||[]).slice(0,5);
  var top=rows.length?rows[0].xp_earned:1;
  var h='<div class="cw-wrap">';
  h+='<div class="cw-kicker">MARQUEE EVENT</div>';
  h+='<h2>\u2694\uFE0F Cell War <span class="cw-week">\u2014 Week '+esc(j.week_no||"?")+'</span></h2>';
  h+='<div class="cw-stakes">Weekly champions claim territory</div>';
  h+='<div class="cw-count" id="cwCount">--</div>';
  if(j.last_winner&&j.last_winner.cell_name){
    h+='<div class="cw-champ">\uD83C\uDFC6 REIGNING CHAMPIONS: '+esc(j.last_winner.cell_name)+
       '<small>'+fmt(j.last_winner.xp_earned)+' XP last week \u2014 members earn +'+(j.champion_bonus_pct||10)+'% XP all this week</small></div>';
    /* PLAY 10 — WINS THAT ECHO (2026-10-06): cell-war victory render ->
       win event. RECOGNITION ONLY — the war prize (+150 XP/member winners,
       +50 consolation) is paid by the backend under the locked XP table
       (xp-locked-table-retuned-20261006.md §4.7, NO_MULT); this hook mints
       zero XP. Dedupe key = the war week. */
    try {
      if (window.PF && PF.wins && typeof PF.wins.emit === 'function') {
        PF.wins.emit('cellwar_win',
          '\u2694\uFE0F ' + String(j.last_winner.cell_name) + ' TOOK THE CROWN',
          'Cell War champions · Week ' + (j.week_no || '?') +
            ' · +' + (j.champion_bonus_pct || 10) + '% XP all week',
          { dedupe: 'cellwar:' + String(j.week_no || j.week_start || '') });
      }
    } catch (e) {}
  }
  if(rows.length){
    for(var i=0;i<rows.length;i++){
      var r=rows[i], pct=top>0?Math.max(4,Math.round(r.xp_earned/top*100)):4;
      h+='<div class="cw-row'+(r.mine?' cw-mine':'')+'">';
      h+='<div class="cw-pos">'+(i+1)+'</div>';
      h+='<div><div class="cw-name">'+esc(r.name)+(r.mine?'<span class="cw-mine-tag">YOUR CELL</span>':'')+'</div>';
      h+='<div class="cw-sub">'+(r.prestige_flame?'<span class="cw-flame">'+esc(r.prestige_flame)+'</span>':"")+
         (r.prestige_tier?esc(r.prestige_tier)+' \u00B7 ':"")+esc(r.members)+' fighters'+
         (r.members_active?' \u00B7 '+esc(r.members_active)+' active':'')+'</div>';
      h+='<div class="cw-bar"><i style="width:'+pct+'%"></i></div></div>';
      h+='<div class="cw-xp">'+fmt(r.xp_earned)+' XP</div>';
      h+='</div>';
    }
  }else{
    h+='<div class="cw-empty">No shots fired yet this week.<br>Be the first cell on the board.</div>';
  }
  /* G6: War Room championship odds strip — filled by renderMarket. */
  h+='<div id="cwMarket"><div class="cw-load">Reading the War Room&hellip;</div></div>';
  var mine=(j.my_cells||[]).length>0;
  h+='<div class="cw-cta">';
  if(mine){
    h+='<button class="cw-btn" id="cwViewCell" type="button">RALLY MY CELL \u2192</button>';
  }else{
    h+='<button class="cw-btn" id="cwJoinCell" type="button">JOIN A CELL</button>';
    h+='<button class="cw-btn cw-ghost" id="cwBuildCell" type="button">BUILD YOUR CELL</button>';
  }
  h+='</div>';
  h+='<div class="cw-note">Every XP you earn feeds your cell\u2019s war score \u2014 bout fire counts too. '+
     'Top cell Sunday midnight takes the crown, claims territory on the war map, and reigns with +10% XP all next week.</div>';
  h+='</div>';
  host.innerHTML=h;
  if(TICK) clearInterval(TICK);
  tick(); TICK=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
  var jb=document.getElementById("cwJoinCell"), bb=document.getElementById("cwBuildCell"), vb=document.getElementById("cwViewCell");
  if(jb) jb.onclick=goCells;
  if(bb) bb.onclick=goCells;
  if(vb) vb.onclick=goCells;
}
function load(){
  var id=ident();
  api("cellwar_standings",{callsign:id.callsign},render);
  /* G6: War Room championship odds — live from the war board. */
  api("cellwar_market",{},renderMarket);
}
function renderMarket(j){
  var el=document.getElementById("cwMarket"); if(!el) return;
  var odds=(j&&j.ok&&j.odds)||[];
  if(!odds.length){ el.innerHTML='<div class="cw-note">No odds yet \u2014 the market opens when cells hit the board.</div>'; return; }
  var h='<div class="cw-odds"><div class="cw-okick">\uD83C\uDFDB\uFE0F WAR ROOM \u2014 CHAMPIONSHIP ODDS</div>';
  for(var i=0;i<Math.min(5,odds.length);i++){
    var o=odds[i];
    var ev=esc(String(o.implied||0))+'%'+(o.pays>0?' \u00B7 pays '+esc(String(o.pays))+'x':'');
    h+='<div class="cw-orow"><div class="cw-oname">'+(i+1)+'. '+esc(o.name||'')+'</div><div class="cw-oev">'+ev+'</div></div>';
  }
  h+='<a class="cw-obet" href="/arcade#pf-forecasts">STAKE IN THE WAR ROOM \u2192</a>';
  h+='<div class="cw-ofree">Odds move with the war board. Viewing is free.</div></div>';
  el.innerHTML=h;
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },60000);
})();
<\/script>
</template>`);
})();
