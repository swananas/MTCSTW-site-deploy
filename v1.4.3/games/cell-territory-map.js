/* games/cell-territory-map.js  |  PF v1.4.3 | CELLS 2.0 — Territory Map.
   Visual, state-level US tile map: each state is colored by its leading cell
   (highest current-week warmap points among cells with cells.state = that
   state). Unclaimed states render neutral gray. The viewer's own cell gets a
   gold "MY CELL" highlight; its self-declared home state gets a gold dashed
   outline. Legend lists leading cells with points held.
   Reads GET ?action=territory_map_status (public standings; the mine block
   rides along when the caller's auth verifies, via PF.authGetJSONP —
   same pattern as war-map.js). Displayed data is cell-level aggregates
   only — no user-level data anywhere on this surface.
   PRIVACY: state affiliation is self-declared, optional, 2-letter, coarse.
   No coordinates, no IP geolocation, no per-user positioning.
   Honorific only: territory is NEVER XP and never convertible.
   KILL: ?pf_off=cell-territory-map  or  localStorage pf_disabled_v1='["cell-territory-map"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cell-territory-map")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-territory-map">
<div class="fe-block pf-override-block pf-silo" id="pf-territory-map">
<div id="xTerritoryMap"><div class="tm-load">Charting the territory&hellip;</div></div>
</div>
<style>
#pf-territory-map .tm-wrap{background:linear-gradient(165deg,#0b0b0c 0%,#1a0d0d 55%,#0b0b0c 100%);border:3px solid #c1121f;padding:26px 22px;max-width:760px;margin:18px auto;text-align:center;box-shadow:0 0 28px rgba(193,18,31,.4), inset 0 0 60px rgba(0,0,0,.6);color:#f5ead6;font-family:Arial,sans-serif;position:relative;overflow:hidden}
#pf-territory-map .tm-wrap:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.18) 3px 4px)}
#pf-territory-map .tm-kicker{font-size:12px;letter-spacing:5px;color:#c1121f;font-weight:800;margin-bottom:6px}
#pf-territory-map h2{font-family:'Arial Black',Arial,sans-serif;color:#f5ead6;font-size:30px;margin:0 0 4px;letter-spacing:3px;text-transform:uppercase;text-shadow:2px 2px 0 #000}
#pf-territory-map .tm-week{font-family:'Courier New',monospace;font-size:13px;color:#ffb347;letter-spacing:2px;margin-bottom:10px}
#pf-territory-map .tm-map{width:100%;height:auto;display:block;margin:6px auto 4px;max-width:640px}
#pf-territory-map .tm-legend{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin:14px 0 4px;text-align:left}
#pf-territory-map .tm-leg{display:flex;align-items:center;gap:9px;background:rgba(10,10,10,.75);border:1px solid #4a4a4a;padding:8px 10px}
#pf-territory-map .tm-leg.tm-minecell{border:2px solid #ffd700}
#pf-territory-map .tm-sw{flex:0 0 auto;width:18px;height:18px;border:1px solid #000}
#pf-territory-map .tm-lname{font-weight:800;font-size:13.5px;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pf-territory-map .tm-lsub{font-size:11.5px;color:#b3a687}
#pf-territory-map .tm-tag{display:inline-block;background:#ffd700;color:#000;font-size:10px;font-weight:800;padding:1px 7px;margin-left:6px;letter-spacing:1px;vertical-align:middle}
#pf-territory-map .tm-note{font-size:11.5px;color:#b3a687;line-height:1.7;margin-top:12px;border-top:1px solid #4a4a4a;padding-top:10px}
#pf-territory-map .tm-note b{color:#f5ead6}
#pf-territory-map .tm-empty{font-size:14px;color:#b3a687;padding:16px 0;line-height:1.6}
#pf-territory-map .tm-load{color:#b3a687;font-size:14px;padding:20px}
#pf-territory-map .tm-cta{margin-top:14px;font-size:13.5px;color:#f5ead6}
#pf-territory-map .tm-cta a{color:#ffb347;font-weight:800}
</style>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} return cs; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Mine block is private-adjacent: prefer the shared auth JSONP, fall back
     to attaching auth_secret manually. */
  try{ if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; } }catch(e){}
  try{ var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
    if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec; }catch(e2){}
  var fn="pfTerrCb"+Math.floor(Math.random()*1e9);
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
/* Simplified US tile grid: [code, col, row], 12 cols x 10 rows. */
var TILES=[
["AK",0,0],["HI",11,0],
["ME",11,1],
["VT",1,2],["NH",2,2],
["WA",0,3],["ND",3,3],["MN",4,3],["WI",5,3],["MI",6,3],
["OR",0,4],["ID",1,4],["MT",2,4],["SD",3,4],["IA",4,4],["IL",5,4],["IN",6,4],["OH",7,4],["PA",8,4],["NY",9,4],
["NV",1,5],["WY",2,5],["NE",3,5],["MO",4,5],["KY",5,5],["WV",6,5],["VA",7,5],["NJ",8,5],["CT",9,5],["RI",10,5],["MA",11,5],
["CA",0,6],["UT",2,6],["CO",3,6],["KS",4,6],["TN",5,6],["NC",6,6],["SC",7,6],["DC",8,6],["MD",9,6],["DE",10,6],
["AZ",2,7],["NM",3,7],["OK",4,7],["AR",5,7],["MS",6,7],["AL",7,7],["GA",8,7],
["TX",3,8],["LA",4,8],
["FL",7,9]
];
var NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};
var PALETTE=["#c1121f","#e76f51","#f4a261","#e9c46a","#2a9d8f","#577590","#9b5de5","#f15bb5","#00bbf9","#80ed99"];
function cellColor(id){ var h=0,s=String(id||""); for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return PALETTE[h%PALETTE.length]; }
function render(j){
  var host=document.getElementById("xTerritoryMap"); if(!host) return;
  var h='<div class="tm-wrap">';
  h+='<div class="tm-kicker">CELLS 2.0</div>';
  h+='<h2>Territory Map</h2>';
  if(!j||!j.ok){
    /* Fail-soft: backend down or action unknown — honest offline state,
       map never half-renders. */
    host.innerHTML=h+'<div class="tm-empty">The territory map is offline right now.<br>Check back soon.</div></div>';
    return;
  }
  if(j.week_id){ h+='<div class="tm-week">WEEK OF '+esc(String(j.week_id))+'</div>'; }
  var regs=(j.regions&&j.regions.length)?j.regions:[];
  var byState={};
  for(var i=0;i<regs.length;i++){ var rr=regs[i]; if(rr&&rr.state) byState[String(rr.state).toUpperCase()]=rr; }
  var mine=(j.mine&&j.mine.cell_id)?j.mine:null;
  var mineState=mine&&mine.state?String(mine.state).toUpperCase():"";
  var seen={}, leg=[];
  var svg='<svg class="tm-map" viewBox="0 0 600 500" role="img" aria-label="Cell territory map by state">';
  for(var t=0;t<TILES.length;t++){
    var code=TILES[t][0], x=TILES[t][1]*50, y=TILES[t][2]*50;
    var reg=byState[code];
    var fill="#3a3a3a", stroke="#555", txtFill="#9a9a9a";
    var isMineCell=false, isHome=(mineState&&mineState===code);
    var tip=(NAMES[code]||code)+" — uncontested this week";
    if(reg&&reg.cell_id){
      fill=cellColor(reg.cell_id); stroke="#0b0b0c"; txtFill="#ffffff";
      tip=(NAMES[code]||code)+" — "+(reg.cell_name||reg.cell_id)+" ("+fmt(reg.points||0)+" pts)";
      if(mine&&reg.cell_id===mine.cell_id) isMineCell=true;
      if(!seen[reg.cell_id]){ seen[reg.cell_id]=1;
        leg.push({cell_id:reg.cell_id,cell_name:reg.cell_name||reg.cell_id,pts:Number(reg.points)||0,states:1,mine:isMineCell}); }
      else { for(var l=0;l<leg.length;l++){ if(leg[l].cell_id===reg.cell_id){ leg[l].pts+=Number(reg.points)||0; leg[l].states++; if(isMineCell) leg[l].mine=true; } } }
    }
    var bStroke=isMineCell?"#ffd700":stroke, bW=isMineCell?3:1.5;
    var dash=(isHome&&!isMineCell)?' stroke-dasharray="5 3"':"";
    if(isHome&&!isMineCell) bStroke="#ffd700";
    svg+='<g><title>'+esc(tip)+'</title>'+
      '<rect x="'+x+'" y="'+y+'" width="46" height="46" fill="'+fill+'" stroke="'+bStroke+'" stroke-width="'+bW+'"'+dash+'/>'+
      '<text x="'+(x+23)+'" y="'+(y+27)+'" text-anchor="middle" font-size="11" font-weight="800" fill="'+txtFill+'" font-family="Arial,sans-serif">'+esc(code)+'</text></g>';
  }
  svg+='</svg>';
  h+=svg;
  leg.sort(function(a,b){ return b.pts-a.pts; });
  if(leg.length){
    h+='<div class="tm-legend">';
    var maxLeg=12;
    for(var m=0;m<leg.length&&m<maxLeg;m++){
      var c=leg[m];
      h+='<div class="tm-leg'+(c.mine?' tm-minecell':'')+'"><span class="tm-sw" style="background:'+cellColor(c.cell_id)+'"></span>'+
        '<span><span class="tm-lname">'+esc(c.cell_name)+(c.mine?'<span class="tm-tag">MY CELL</span>':'')+'</span><br>'+
        '<span class="tm-lsub">'+c.states+' state'+(c.states===1?'':'s')+' &middot; '+fmt(c.pts)+' pts</span></span></div>';
    }
    if(leg.length>maxLeg){ h+='<div class="tm-leg"><span class="tm-lsub">+'+(leg.length-maxLeg)+' more cells holding turf</span></div>'; }
    h+='</div>';
  }else{
    h+='<div class="tm-empty">No territory claimed yet this week.<br>Be the first cell to plant a flag.</div>';
  }
  if(!mine){
    h+='<div class="tm-cta">Not holding turf yet? <a href="/cells">Join a cell</a> and put your state on the map.</div>';
  }
  h+='<div class="tm-note"><b>HOW TURF IS WON:</b> each state goes to the cell calling it home with the most territory points that week.<br>'+
    '<b>Honorific:</b> territory is recognition only — never XP, never convertible.<br>'+
    'State turf is self-declared by each cell. No one is tracked, mapped, or followed.</div>';
  h+='</div>';
  host.innerHTML=h;
  /* 2026-10-06 share-everywhere: share/save + network row on the map. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(host,'territory-map',{link:'/cells'}); }catch(e){}
}
function load(){
  api("territory_map_status",{callsign:ident()},render);
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },60000);
})();
<\/script>
</template>`); })();
