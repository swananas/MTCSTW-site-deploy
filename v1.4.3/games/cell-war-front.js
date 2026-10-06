/* games/cell-war-front.js  |  PF v1.4.3 | Cell War Propaganda Front.
   Opt-in political side front alongside the weekly Cell War (CEO weave #4).
   Opted-in cells compete on political asset output — posters forged via
   political plugins + propaganda bounties completed — scored PER CAPITA
   (output / members) so big cells don't auto-win. Winner takes the
   PROPAGANDIST crown + a history entry: recognition only, ZERO XP.
   Opt-in per cell, default OFF. When the forge/bounty rails aren't live yet
   the front shows STANDBY and the war continues normally.
   Actions: cellwar_front_standings (GET, public), cellwar_front_history
   (GET, public), cellwar_front_join (POST, auth + member-gated).
   KILL: ?pf_off=cell-war-front  or  localStorage pf_disabled_v1='["cell-war-front"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cell-war-front")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cellwarfront">
<div class="fe-block pf-override-block pf-silo" id="pf-cell-war-front">
<div id="xCellWarFront"><div class="pf-load">Raising the propaganda front&hellip;</div></div>
</div>
<style>
#pf-cell-war-front .pf-load{color:#a89e88;font-size:14px;padding:20px;text-align:center}
#pf-cell-war-front .pw-wrap{background:linear-gradient(160deg,#0d0d0d 0%,#140b1c 60%,#0d0d0d 100%);border:3px solid #7b2ff7;padding:26px 22px;max-width:680px;margin:18px auto;text-align:center;box-shadow:0 0 24px rgba(123,47,247,.35);color:#f5ead6;font-family:Arial,sans-serif}
#pf-cell-war-front .pw-kicker{font-size:12px;letter-spacing:4px;color:#7b2ff7;font-weight:800;margin-bottom:6px}
#pf-cell-war-front h2{font-family:'Arial Black',Arial,sans-serif;color:#f5ead6;font-size:28px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-cell-war-front h2 .pw-week{color:#7b2ff7}
#pf-cell-war-front .pw-sub{font-size:13px;color:#a89e88;margin-bottom:14px;line-height:1.5}
#pf-cell-war-front .pw-champ{background:#7b2ff7;color:#fff;font-weight:800;font-size:14px;padding:10px 14px;margin:0 0 16px;letter-spacing:1px}
#pf-cell-war-front .pw-champ small{display:block;font-weight:400;font-size:12px;margin-top:4px;letter-spacing:0}
#pf-cell-war-front .pw-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;background:#161616;border:1px solid #333;padding:10px 12px;margin-bottom:8px;text-align:left}
#pf-cell-war-front .pw-row.pw-mine{border:2px solid #c9a0ff;background:#17101f}
#pf-cell-war-front .pw-pos{font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#7b2ff7;text-align:center}
#pf-cell-war-front .pw-row.pw-mine .pw-pos{color:#c9a0ff}
#pf-cell-war-front .pw-name{font-weight:800;font-size:15px;color:#f5ead6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pf-cell-war-front .pw-sub2{font-size:12px;color:#a89e88;margin-top:2px}
#pf-cell-war-front .pw-mine-tag{display:inline-block;background:#c9a0ff;color:#000;font-size:10px;font-weight:800;padding:1px 6px;margin-left:6px;letter-spacing:1px;vertical-align:middle}
#pf-cell-war-front .pw-bar{height:8px;background:#2a2a2a;margin-top:6px;border:1px solid #444}
#pf-cell-war-front .pw-bar i{display:block;height:100%;background:linear-gradient(90deg,#7b2ff7,#c9a0ff)}
#pf-cell-war-front .pw-score{font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#c9a0ff;text-align:right;white-space:nowrap}
#pf-cell-war-front .pw-cta{margin-top:16px}
#pf-cell-war-front .pw-btn{display:inline-block;background:#7b2ff7;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;margin:4px;cursor:pointer}
#pf-cell-war-front .pw-btn.pw-ghost{background:transparent;border-color:#7b2ff7;color:#f5ead6}
#pf-cell-war-front .pw-btn:disabled{opacity:.5;cursor:default}
#pf-cell-war-front .pw-note{font-size:12px;color:#a89e88;margin-top:12px;line-height:1.5}
#pf-cell-war-front .pw-empty{font-size:14px;color:#a89e88;padding:14px 0;line-height:1.6}
#pf-cell-war-front .pw-standby{border:2px dashed #7b2ff7;padding:22px 16px;margin:6px 0}
#pf-cell-war-front .pw-standby .pw-st-k{font-size:12px;letter-spacing:4px;color:#c9a0ff;font-weight:800;margin-bottom:8px}
</style>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfPwCb"+Math.floor(Math.random()*1e9);
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
function pfPost(body,cb){
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var ctl=null; try{ ctl=new AbortController(); }catch(e){}
    var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})
      .then(function(r){ return r.json(); }).then(function(j){ try{clearTimeout(hung);}catch(e){} done(j); })
      .catch(function(){ try{clearTimeout(hung);}catch(e){} done(null); });
  }catch(e){ done(null); }
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
var WAR_END=0, TICK=null, LAST=null;
function tick(){
  var el=document.getElementById("pwCount"); if(!el) return;
  var ms=WAR_END-Date.now();
  if(ms<0) ms=0;
  var d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000),
      m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000);
  el.textContent=d+"d "+h+"h "+m+"m "+s+"s REMAINING";
}
function toast(m){
  try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{
    var t=document.createElement("div"); t.textContent=m;
    t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#7b2ff7;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
    document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800);
  }catch(e2){}
}
function joinFront(cellId,btn){
  var id=ident();
  if(!id.callsign){ toast("Claim a callsign first, then enlist your cell."); return; }
  if(btn) btn.disabled=true;
  pfPost({type:"cell",cell_action:"cellwar_front_join",callsign:id.callsign,device:id.device,cell_id:cellId},function(j){
    if(j&&j.ok){ toast("Cell enlisted in the Propaganda Front."); load(); }
    else{ toast("Couldn't enlist — "+((j&&j.err)||"try again")); if(btn) btn.disabled=false; }
  });
}
function render(j){
  var host=document.getElementById("xCellWarFront"); if(!host) return;
  LAST=j||null;
  if(!j||!j.ok){ host.innerHTML='<div class="pw-wrap"><div class="pw-empty">The front is quiet. Check back soon.</div></div>'; return; }
  WAR_END=chicagoMidnightMs(j.week_start,7);
  var h='<div class="pw-wrap">';
  h+='<div class="pw-kicker">SIDE FRONT \u2014 OPT-IN</div>';
  h+='<h2>\uD83D\uDCEF Propaganda Front <span class="pw-week">\u2014 Week '+esc(j.week_no||"?")+'</span></h2>';
  h+='<div class="pw-sub">The Cell War\u2019s political side front. Forged posters + completed bounties, scored <b>per fighter</b> \u2014 small cells can take this one.<br>Winner takes the PROPAGANDIST crown. Recognition only \u2014 zero XP.</div>';
  if(j.unavailable){
    h+='<div class="pw-standby"><div class="pw-st-k">\u23F3 ON STANDBY</div>'+
       '<div class="pw-empty">The forge and bounty rails are still mustering \u2014 this front opens when they go live.<br>The Cell War marches on regardless.</div></div>';
    h+='</div>';
    host.innerHTML=h;
    /* 2026-10-06 share-everywhere. */
    try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(host,'cell-war-front',{link:'/cells'}); }catch(e){}
    if(TICK) clearInterval(TICK);
    tick(); TICK=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
    return;
  }
  var rows=(j.fronts||[]);
  var top=rows.length?rows[0].per_capita:1;
  if(j.last_winner&&j.last_winner.cell_name){
    h+='<div class="pw-champ">\uD83C\uDFC6 PROPAGANDIST CROWN: '+esc(j.last_winner.cell_name)+
       '<small>'+fmt(j.last_winner.output)+' political assets last week \u2014 the crown is glory, not XP</small></div>';
  }
  if(rows.length){
    for(var i=0;i<rows.length;i++){
      var r=rows[i], pct=top>0?Math.max(4,Math.round(r.per_capita/top*100)):4;
      var pc=(Math.round((Number(r.per_capita)||0)*100)/100).toFixed(2);
      h+='<div class="pw-row'+(r.mine?' pw-mine':'')+'">';
      h+='<div class="pw-pos">'+(i+1)+'</div>';
      h+='<div><div class="pw-name">'+esc(r.name)+(r.mine?'<span class="pw-mine-tag">YOUR CELL</span>':'')+'</div>';
      h+='<div class="pw-sub2">'+fmt(r.output)+' assets \u00B7 '+esc(r.members)+' fighters</div>';
      h+='<div class="pw-bar"><i style="width:'+pct+'%"></i></div></div>';
      h+='<div class="pw-score">'+pc+'<br><span style="font-size:10px;color:#a89e88">per fighter</span></div>';
      h+='</div>';
    }
  }else{
    h+='<div class="pw-empty">No cell has enlisted yet this week.<br>Be the first to raise the propaganda front.</div>';
  }
  /* Enlist CTA: members of cells that haven't opted in. */
  var id=ident();
  var mine=j.my_cells||[], opted=j.opted_cells||[];
  var can=[];
  for(var mi=0;mi<mine.length;mi++){ if(opted.indexOf(mine[mi])===-1) can.push(mine[mi]); }
  h+='<div class="pw-cta">';
  if(can.length&&id.callsign){
    h+='<button class="pw-btn" id="pwJoin" type="button">ENLIST MY CELL \u2192</button>';
  }else if(!id.callsign){
    h+='<div class="pw-note">Claim a callsign and join a cell to enlist it in the front.</div>';
  }
  h+='</div>';
  h+='<div class="pw-note">Every poster forged via political plugins and every bounty your fighters complete feeds your cell\u2019s per-fighter score. '+
     'Top cell Sunday midnight takes the PROPAGANDIST crown \u2014 glory only, zero XP. Opt-in is per week; the front defaults OFF.</div>';
  h+='</div>';
  host.innerHTML=h;
  if(TICK) clearInterval(TICK);
  tick(); TICK=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
  var jb=document.getElementById("pwJoin");
  if(jb) jb.onclick=function(){ joinFront(can[0],jb); };
}
function load(){
  var id=ident();
  api("cellwar_front_standings",{callsign:id.callsign},render);
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },60000);
})();
<\/script>
</template>`);
})();
