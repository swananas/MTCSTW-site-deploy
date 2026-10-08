/* games/hall-of-proof.js  |  PF v1.4.3 | HALL OF PROOF (W5-6, Wave 5C).
   One public wall for every system's winners — the social surface the
   whole empire's victories land on. This week's pins grouped by source,
   past-weeks archive, coronation banner. Honorific ONLY: zero XP anywhere
   (FAN FAVORITE precedent). Mount: homepage PROOF section
   (coordinator: add ['hall', 'pf-ov-hall'] to the PROOF ORDER block in
   pages/home-v2.js, 'hall':'proof' to SILO_SEC, and 'hall-of-proof.js' to
   the bundle-home SECTIONS list in build/bundle.js).
   KILL: ?pf_off=hall-of-proof  or  localStorage pf_disabled_v1='["hall"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("hall")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-hall">
<div class="fe-block pf-override-block pf-silo" id="pf-hallofproof">
<style>
#pf-hallofproof{background:#0a0a0a;border-top:3px solid #c1121f;border-bottom:3px solid #c1121f;padding:22px 16px;font-family:Arial,sans-serif;color:#f5ead6;text-align:center}
#pf-hallofproof .hp-kicker{font-size:11px;letter-spacing:3px;color:#e5383b;font-weight:bold;margin-bottom:6px}
#pf-hallofproof h2{margin:0 0 4px;font-size:24px;letter-spacing:1px;color:#f5ead6}
#pf-hallofproof .hp-sub{font-size:12px;color:#9c8f78;margin-bottom:16px}
#pf-hallofproof .hp-banner{background:#1a0505;border:1px solid #c1121f;border-radius:6px;padding:12px;max-width:640px;margin:0 auto 18px;font-size:13px}
#pf-hallofproof .hp-banner b{color:#e5383b}
#pf-hallofproof .hp-groups{max-width:720px;margin:0 auto;text-align:left}
#pf-hallofproof .hp-group{margin-bottom:14px;background:#111;border:1px solid #2c2c2c;border-radius:6px;overflow:hidden}
#pf-hallofproof .hp-ghead{padding:8px 12px;background:#161616;font-size:13px;font-weight:bold;color:#f5ead6;border-bottom:1px solid #2c2c2c}
#pf-hallofproof .hp-ghead .hp-count{color:#e5383b;margin-left:6px;font-size:12px}
#pf-hallofproof .hp-pin{padding:7px 12px;font-size:13px;border-bottom:1px solid #1d1d1d;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
#pf-hallofproof .hp-pin:last-child{border-bottom:none}
#pf-hallofproof .hp-cs{font-family:monospace;color:#ffd34d;font-weight:bold}
#pf-hallofproof .hp-detail{color:#9c8f78;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
#pf-hallofproof .hp-empty{font-size:13px;color:#9c8f78;padding:18px 10px;max-width:640px;margin:0 auto}
#pf-hallofproof .hp-archive{margin:18px auto 0;max-width:640px;font-size:12px;color:#9c8f78}
#pf-hallofproof .hp-archive select{background:#111;color:#f5ead6;border:1px solid #555;border-radius:4px;padding:6px 8px;font-size:12px}
#pf-hallofproof .hp-foot{margin-top:14px;font-size:11px;color:#6e6252;letter-spacing:1px}
@media(max-width:520px){#pf-hallofproof h2{font-size:20px}#pf-hallofproof .hp-detail{max-width:40%}}
</style>
<div class="hp-kicker">WEEKLY CORONATION &mdash; SUNDAYS</div>
<h2>HALL OF PROOF</h2>
<div class="hp-sub">Every soldier who proved it this week. No prizes. Just proof.</div>
<div id="pf-hp-main"><div class="c-load">Summoning the week&rsquo;s victors&hellip;</div></div>
<div class="hp-archive" id="pf-hp-archive" style="display:none">
  PAST WEEKS &nbsp;<select id="pf-hp-weeksel" aria-label="Past weeks"></select>
</div>
<div class="hp-foot">ZERO XP FOR VIEWING &mdash; THE HONOR IS THE POINT.</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var CS_RE=/^[a-z0-9_]{3,20}$/;
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmtWeek(w){ /* yyyy-mm-dd (Monday) -> "WEEK OF OCT 5, 2026" */
  var m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(w||"")); if(!m) return esc(String(w||""));
  var months=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return "WEEK OF "+months[Number(m[2])-1]+" "+Number(m[3])+", "+m[1];
}
function api(week,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfHallCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  s.src=BACKEND+"?action=hall_list"+(week?"&week="+encodeURIComponent(week):"")+"&callback="+fn;
  document.head.appendChild(s);
  setTimeout(function(){ finish(null); },10000);
}
/* HIDE-ON-EMPTY (2026-10-05, display-only): an empty winners wall is
   anti-proof. Hide the whole section when pins is empty; show it when the
   wall has winners. A failed fetch keeps CURRENT behavior (visible error
   pane) — never hide content on an error. No XP anywhere (unchanged). */
function hpSec(){
  try{ var m=$("pf-hallofproof"); return (m&&m.closest)?m.closest("section"):null; }
  catch(e){ return null; }
}
function setWallHidden(hidden){
  try{ var s=hpSec(); if(s) s.style.display=hidden?"none":""; }catch(e){}
}
function labelFor(crit,src){
  for(var i=0;i<crit.length;i++){ if(crit[i].k===src) return crit[i].feat; }
  return src.replace(/_/g," ");
}
function paint(j){
  var main=$("pf-hp-main"); if(!main) return;
  if(!j||!j.ok){
    setWallHidden(false);
    main.innerHTML='<div class="hp-empty">The wall is unreachable right now &mdash; the fight goes on without it.</div>';
    return;
  }
  var pins=(j.pins||[]).filter(function(x){ return CS_RE.test(String(x.callsign||"")); });
  /* Empty wall: hide the section (anti-proof). Winners: show it. */
  setWallHidden(!pins.length);
  if(!pins.length) return;
  var crit=j.criteria||[];
  var coron=j.coronation||{};
  var h="";
  /* Coronation banner. */
  h+='<div class="hp-banner">'+fmtWeek(j.week)+'<br>';
  if(pins.length){
    h+='This week, <b>'+pins.length+'</b> soldier'+(pins.length===1?"":"s")+' earned the wall.';
  }else{
    h+='No pins coronated for this week yet &mdash; the Sunday coronation is coming.';
  }
  h+='</div>';
  /* Pins grouped by source, criteria order. */
  var order=[], groups={};
  for(var i=0;i<crit.length;i++) order.push(crit[i].k);
  pins.forEach(function(p){
    var s=String(p.source||"");
    if(order.indexOf(s)===-1) order.push(s);
    if(!groups[s]) groups[s]=[];
    groups[s].push(p);
  });
  if(!pins.length){
    h+='<div class="hp-empty">The wall waits. March the circuit, crack the dead drop, claim the pot &mdash; come back Sunday.</div>';
  }else{
    h+='<div class="hp-groups">';
    order.forEach(function(s){
      var g=groups[s]; if(!g||!g.length) return;
      g.sort(function(a,b){ return String(a.callsign).localeCompare(String(b.callsign)); });
      h+='<div class="hp-group"><div class="hp-ghead">'+esc(labelFor(crit,s))+'<span class="hp-count">'+g.length+'</span></div>';
      for(var k=0;k<g.length;k++){
        h+='<div class="hp-pin"><span class="hp-cs">'+esc(g[k].callsign)+'</span>'
          +'<span class="hp-detail">'+esc(g[k].detail||"")+'</span></div>';
      }
      h+='</div>';
    });
    h+='</div>';
  }
  main.innerHTML=h;
  /* share-out gaps #11: the wall is shareable. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(main,'hall-of-proof',{link:'/hall-of-proof'}); }catch(e){}
  /* Past-weeks archive. */
  var weeks=(j.weeks||[]).filter(function(w){ return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(w)); });
  var arch=$("pf-hp-archive"), sel=$("pf-hp-weeksel");
  if(arch&&sel&&weeks.length){
    arch.style.display="";
    sel.innerHTML=weeks.map(function(w){
      return '<option value="'+esc(w)+'"'+(w===j.week?' selected':'')+'>'+fmtWeek(w)+'</option>';
    }).join("");
    sel.onchange=function(){ api(sel.value,paint); };
  }
}
api(null,paint);
})();
</scr`+`ipt>
</div>
</template>`);
})();
