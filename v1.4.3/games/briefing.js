/* games/briefing.js  |  PF v1.4.3 | MORNING BRIEFING.
   The cement: one scannable briefing that pulls every silo together into a
   single soldier identity + daily orders. First thing a soldier sees.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained
   post() -> PF.authPost). Aggregates existing endpoints; degrades per-section
   if the dedicated `briefing` / `season_current` backends are not deployed yet.
   Also injects the site-wide season banner (thin fixed strip: season name,
   days left, goal progress).
   Framing: military briefing. Dark, urgent, scannable in 30 seconds.
   KILL: ?pf_off=brief  or  localStorage pf_disabled_v1='["brief"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("brief")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-brief">
<div class="fe-block pf-override-block pf-silo" id="pf-brief">
<h2>Morning Briefing</h2>
<div class="c-tag">Your war, at a glance. Thirty seconds, then move.</div>
<div id="xBrief"><div class="c-load">Assembling your briefing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
/* Election Day fallback for the season frame. Local midnight. */
var ELECTION=new Date(2026,10,3,0,0,0,0).getTime();
/* Rank tiers mirror games/enlistment-ranks.js. */
var TIERS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfBrCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for writes. */
function dopaPost(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
  body[actionKey]=action;
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
/* CORS POST for writes. */
function post(cAction,params,cb){
  var body=Object.assign({type:"brief",b_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function go(siloId){
  try{
    var el=document.getElementById(siloId);
    if(el){ el.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  }catch(e){}
}
function tierOf(xp){
  var t=TIERS[0], next=null;
  for(var i=0;i<TIERS.length;i++){ if(xp>=TIERS[i][1]){ t=TIERS[i]; next=TIERS[i+1]||null; } }
  return {cur:t,next:next};
}
function fmtCountdown(ms){
  if(ms<=0) return "NOW";
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
  function p(n){ return (n<10?"0":"")+n; }
  if(h>48) return Math.floor(h/24)+"D "+(h%24)+"H";
  return h+"H "+p(m)+"M "+p(ss)+"S";
}
function fmtHours(ms){
  if(ms<=0) return "NOW";
  var h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
  return h+"H "+(m<10?"0":"")+m+"M";
}
var BAL=null,STREAK=null,LOOT=null,FLASH=null,COMEBACK=null,PROP=null,CELL=null,MISS=null,STAT=null,SEASON=null,BRIEF=null;
var N_CALLS=11;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=N_CALLS) fin(); }
  setTimeout(fin,15000);
  /* Dedicated endpoints first (no-ops until the backend ships). */
  api("briefing",{callsign:id.callsign,device:id.device},function(j){ BRIEF=(j&&j.ok)?j:null; one(); });
  api("season_current",{},function(j){ SEASON=(j&&j.ok)?j.season:null; one(); });
  /* Aggregate the silos directly — this is the cement. */
  api("xp_balance",{callsign:id.callsign},function(j){ BAL=j; one(); });
  api("streak_status",{callsign:id.callsign,device:id.device},function(j){ STREAK=(j&&j.ok)?j:null; one(); });
  api("loot_status",{callsign:id.callsign,device:id.device},function(j){ LOOT=(j&&j.ok)?j:null; one(); });
  api("flash_active",{},function(j){ FLASH=j; one(); });
  api("comeback_check",{callsign:id.callsign,device:id.device},function(j){ COMEBACK=(j&&j.ok&&j.eligible)?j:null; one(); });
  api("proposal_list",{},function(j){ PROP=j; one(); });
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){ CELL=(j&&j.ok)?j:null; one(); });
  api("campaign_missions",{callsign:id.callsign,device:id.device},function(j){ MISS=j; one(); });
  api("campaign_status",{},function(j){ STAT=j; one(); });
}
function seasonInfo(){
  if(SEASON){
    return { name:String(SEASON.name||"THE 32-DAY OFFENSIVE"),
      endsAt:Number(SEASON.ends_at||ELECTION),
      goal:Number(SEASON.goal||1000), progress:Number(SEASON.progress||0) };
  }
  var pledges=0,acts=0,goal=1000;
  try{
    if(STAT){ pledges=Number(STAT.pledges)||0; acts=Number(STAT.actions)||0; goal=Number(STAT.goal)||1000; }
  }catch(e){}
  return { name:"THE 32-DAY OFFENSIVE", endsAt:ELECTION, goal:goal, progress:pledges+acts };
}
function render(){
  var el=document.getElementById("xBrief"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML='<div class="br-gate">Briefings run on callsigns. Claim yours in Enlistment Ranks, then report back here.</div>'
      +'<div style="margin-top:10px"><button class="c-btn" onclick="document.getElementById(\'pf-ranks\')&&document.getElementById(\'pf-ranks\').scrollIntoView({behavior:\'smooth\'})">ENLIST</button></div>';
    renderSeasonBanner();
    return;
  }
  var xp=0;
  try{ xp=Number((BAL&&(BAL.balance!=null?BAL.balance:BAL.xp))||0); }catch(e){}
  var t=tierOf(xp);
  var streakN=0, streakRisk=false, streakHrs="";
  try{
    if(STREAK){ streakN=Number(STREAK.count)||0; streakRisk=!!STREAK.at_risk;
      if(streakRisk&&STREAK.hours_left) streakHrs=fmtHours(Number(STREAK.hours_left)*3600000); }
  }catch(e){}
  /* ---------- 1. SOLDIER HEADER ---------- */
  h+='<div class="br-head"><div class="br-id"><div class="br-cs">'+esc(id.callsign)+'</div>'
    +'<div class="br-rank">'+esc(t.cur[0])+'</div></div>'
    +'<div class="br-stats"><div class="br-stat"><span class="br-v">'+xp+'</span><span class="br-l">XP</span></div>'
    +'<div class="br-stat"><span class="br-v">'+(streakN>0?("\uD83D\uDD25"+streakN):"—")+'</span><span class="br-l">STREAK</span></div></div></div>';
  if(t.next){
    var lo=t.cur[1], hi=t.next[1], pct=Math.min(100,Math.max(0,Math.round((xp-lo)/Math.max(1,hi-lo)*100)));
    h+='<div class="br-tierwrap"><div class="br-tierbar"><div class="br-tierfill" style="width:'+pct+'%"></div></div>'
      +'<div class="x-note">'+(hi-xp)+' XP to '+esc(t.next[0])+' &mdash; '+pct+'%</div></div>';
  } else {
    h+='<div class="br-tierwrap"><div class="x-note">MAX RANK. You are the vanguard.</div></div>';
  }
  /* ---------- 2. URGENT ---------- */
  var urg=[];
  if(streakRisk){
    urg.push({t:"STREAK AT RISK",d:"Your "+streakN+"-day streak dies in "+streakHrs+". Check in or lose it.",
      btn:"SAVE STREAK",go:"pf-dopa"});
  }
  try{
    if(LOOT&&LOOT.can_claim) urg.push({t:"LOOT CRATE READY",d:"Today's crate is unopened. Something's inside.",
      btn:"OPEN CRATE",go:"pf-dopa"});
  }catch(e){}
  try{
    var ps=(PROP&&PROP.proposals)||[], now=Date.now(), closing=0;
    for(var pi=0;pi<ps.length;pi++){ var p=ps[pi];
      if(String(p.status||"open")==="open"&&Number(p.closes_at||0)>now&&Number(p.closes_at||0)-now<86400000) closing++; }
    if(closing>0) urg.push({t:closing+" VOTE"+(closing>1?"S":"")+" CLOSING",d:"Assembly proposals close within 24 hours. Your weight matters.",
      btn:"VOTE NOW",go:"pf-gov"});
  }catch(e){}
  if(COMEBACK){
    urg.push({t:"XP WAITING",d:"We saved "+Number(COMEBACK.xp||50)+" XP for your return.",
      btn:"CLAIM",act:"comeback"});
  }
  if(urg.length){
    h+='<div class="br-sec"><div class="br-sect">\u26A0 URGENT</div>';
    for(var u=0;u<urg.length;u++){ var ug=urg[u];
      h+='<div class="br-urg"><div class="br-ut">'+esc(ug.t)+'</div><div class="x-note">'+esc(ug.d)+'</div>'
        +'<button class="c-btn br-ubtn"'+(ug.go?(' data-go="'+ug.go+'"'):'')+(ug.act?(' data-act="'+ug.act+'"'):'')+'>'+esc(ug.btn)+'</button></div>';
    }
    h+='</div>';
  }
  /* ---------- 3. TODAY'S ORDERS ---------- */
  h+='<div class="br-sec"><div class="br-sect">TODAY&rsquo;S ORDERS</div>';
  var ms=[]; try{ ms=((MISS&&MISS.missions)||[]).filter(function(m){ return !m.done; }); }catch(e){}
  var shown=0;
  for(var mi=0;mi<ms.length&&shown<4;mi++,shown++){ var m=ms[mi];
    h+='<div class="br-order"><span class="br-oname">'+esc(m.label||m.id)+'</span>'
      +'<span class="br-oxp">+'+(Number(m.xp)||10)+' XP</span></div>';
  }
  var fe=[]; try{ fe=(FLASH&&(FLASH.events||[]))||[]; }catch(e){}
  for(var fi=0;fi<fe.length;fi++){ var f=fe[fi];
    var endsMs=Number(f.ends_in||0)*1000;
    h+='<div class="br-order br-flash"><span class="br-oname">\u26A1 '+esc(f.title||"FLASH EVENT")+' &mdash; '+esc(String(f.multiplier||"2"))+'X XP</span>'
      +'<span class="br-oxp br-tick" data-ends="'+(Date.now()+endsMs)+'">'+fmtCountdown(endsMs)+'</span></div>';
  }
  if(!ms.length&&!fe.length){ h+='<div class="x-note">Orders incoming. Check Daily Orders for the full board.</div>'; }
  h+='<div style="margin-top:8px"><button class="c-btn" data-go="pf-orders">FULL ORDER BOARD</button></div></div>';
  /* ---------- 4. YOUR CELL ---------- */
  h+='<div class="br-sec"><div class="br-sect">YOUR CELL</div>';
  try{
    if(CELL&&CELL.in_cell){
      var cl=(CELL.cells&&CELL.cells[0])||null;
      var cname=cl?cl.name:((CELL.cell&&CELL.cell.name)||"YOUR CELL");
      var mems=cl?Number(cl.members)||0:0, act=cl?Number(cl.active_week)||0:0;
      h+='<div class="br-cell"><span class="br-cname">'+esc(cname)+'</span>'
        +'<span class="x-note">'+mems+' soldiers &bull; '+act+' active this week</span></div>'
        +'<div style="margin-top:8px"><button class="c-btn" data-go="pf-cells">RALLY THE CELL</button></div>';
    } else {
      h+='<div class="x-note">No cell. Soldiers fight together or not at all.</div>'
        +'<div style="margin-top:8px"><button class="c-btn" data-go="pf-cells">FIND YOUR CELL</button></div>';
    }
  }catch(e){ h+='<div class="x-note">Cell intel unavailable.</div>'; }
  h+='</div>';
  /* ---------- 5. SEASON PROGRESS ---------- */
  var sn=seasonInfo();
  var dl=Math.max(0,Math.ceil((sn.endsAt-Date.now())/86400000));
  var spct=Math.min(100,Math.round(sn.progress/Math.max(1,sn.goal)*100));
  h+='<div class="br-sec"><div class="br-sect">'+esc(sn.name)+'</div>'
    +'<div class="br-seasonline"><span>'+dl+' DAYS LEFT</span><span>'+spct+'% OF GOAL</span></div>'
    +'<div class="br-tierwrap"><div class="br-tierbar"><div class="br-tierfill br-war" style="width:'+spct+'%"></div></div></div>'
    +'<div class="x-note">Day '+(32-dl)+' of 32 &mdash; '+sn.progress+' / '+sn.goal+' actions</div></div>';
  /* ---------- 6. UNCLAIMED ---------- */
  var un=[];
  try{ if(LOOT&&LOOT.can_claim) un.push("Loot crate (today)"); }catch(e){}
  if(COMEBACK) un.push(Number(COMEBACK.xp||50)+" XP comeback bonus");
  if(un.length){
    h+='<div class="br-sec"><div class="br-sect">UNCLAIMED</div><div class="x-note">You have '+un.length+' thing'+(un.length>1?"s":"")+' waiting:</div>';
    for(var ui=0;ui<un.length;ui++){ h+='<div class="br-order"><span class="br-oname">'+esc(un[ui])+'</span></div>'; }
    h+='<div style="margin-top:8px"><button class="c-btn" data-go="pf-dopa">COLLECT</button></div></div>';
  }
  el.innerHTML=h;
  /* wire nav buttons */
  var btns=el.querySelectorAll("button[data-go]");
  for(var b=0;b<btns.length;b++){
    (function(btn){ btn.onclick=function(){ go(btn.getAttribute("data-go")); }; })(btns[b]);
  }
  var acts=el.querySelectorAll("button[data-act='comeback']");
  for(var a=0;a<acts.length;a++){
    (function(btn){ btn.onclick=function(){
      btn.disabled=true; btn.textContent="CLAIMING...";
      var id2=ident();
      dopaPost("comeback","cb_action","comeback_claim",{callsign:id2.callsign,device:id2.device},function(j){
        if(j&&j.ok){ toast("Welcome back. +"+Number(j.xp||50)+" XP."); }
        else { toast((j&&j.err)||"Claim failed."); btn.disabled=false; btn.textContent="CLAIM"; return; }
        load();
      });
    }; })(acts[a]);
  }
  renderSeasonBanner();
  tick();
}
/* per-second countdowns for flash timers */
function tick(){
  try{
    var els=document.querySelectorAll("#xBrief .br-tick");
    for(var i=0;i<els.length;i++){
      var ends=Number(els[i].getAttribute("data-ends")||0);
      els[i].textContent=fmtCountdown(ends-Date.now());
    }
  }catch(e){}
}
/* ---------- season banner: thin fixed strip, always visible ---------- */
function bannerCss(){
  if(document.getElementById("pf-brief-css")) return;
  var s=document.createElement("style"); s.id="pf-brief-css";
  s.textContent=
    "#pf-brief .br-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:6px 0 10px}"
    +"#pf-brief .br-cs{font:bold 22px monospace;color:#fff;letter-spacing:1px}"
    +"#pf-brief .br-rank{display:inline-block;margin-top:4px;font:bold 11px monospace;color:#0a0a0a;background:#e8b64c;padding:3px 10px;border-radius:2px}"
    +"#pf-brief .br-stats{display:flex;gap:14px}"
    +"#pf-brief .br-stat{display:flex;flex-direction:column;align-items:center}"
    +"#pf-brief .br-v{font:bold 20px monospace;color:#e8b64c}"
    +"#pf-brief .br-l{font:10px monospace;color:#888;letter-spacing:1px}"
    +"#pf-brief .br-tierwrap{margin:0 0 12px}"
    +"#pf-brief .br-tierbar{height:8px;background:#222;border:1px solid #444;border-radius:4px;overflow:hidden}"
    +"#pf-brief .br-tierfill{height:100%;background:#e8b64c;transition:width .5s}"
    +"#pf-brief .br-tierfill.br-war{background:#c1121f}"
    +"#pf-brief .br-sec{margin:14px 0;padding:12px;border:1px solid #333;background:#101010}"
    +"#pf-brief .br-sect{font:bold 13px monospace;color:#c1121f;letter-spacing:2px;margin-bottom:10px}"
    +"#pf-brief .br-urg{border:2px solid #c1121f;background:#1a0505;padding:10px;margin-bottom:8px}"
    +"#pf-brief .br-ut{font:bold 13px monospace;color:#ff6b6b;margin-bottom:4px}"
    +"#pf-brief .br-ubtn{margin-top:8px}"
    +"#pf-brief .br-order{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid #222;font:13px monospace;color:#ddd}"
    +"#pf-brief .br-oxp{color:#e8b64c;font-weight:bold;white-space:nowrap;margin-left:10px}"
    +"#pf-brief .br-flash{border:1px solid #e8b64c;background:#141003;padding:8px}"
    +"#pf-brief .br-cell .br-cname{font:bold 16px monospace;color:#fff}"
    +"#pf-brief .br-seasonline{display:flex;justify-content:space-between;font:bold 12px monospace;color:#ff6b6b;margin-bottom:8px}"
    +"#pf-brief .br-gate{font:14px monospace;color:#ccc;padding:16px;border:1px dashed #666}"
    +"#pf-seasonbar{position:fixed;top:0;left:0;right:0;z-index:99990;background:#0a0a0a;border-bottom:2px solid #c1121f;color:#fff;font:bold 12px monospace;padding:7px 12px;display:flex;align-items:center;gap:10px;letter-spacing:1px}"
    +"#pf-seasonbar .sb-name{color:#ff6b6b;white-space:nowrap}"
    +"#pf-seasonbar .sb-bar{flex:1;height:6px;background:#222;border-radius:3px;overflow:hidden;min-width:60px}"
    +"#pf-seasonbar .sb-fill{height:100%;background:#c1121f}"
    +"#pf-seasonbar .sb-days{color:#e8b64c;white-space:nowrap}";
  document.head.appendChild(s);
}
function renderSeasonBanner(){
  bannerCss();
  try{
    var sn=seasonInfo();
    var dl=Math.max(0,Math.ceil((sn.endsAt-Date.now())/86400000));
    var pct=Math.min(100,Math.round(sn.progress/Math.max(1,sn.goal)*100));
    var bar=document.getElementById("pf-seasonbar");
    if(!bar){
      bar=document.createElement("div"); bar.id="pf-seasonbar";
      document.body.appendChild(bar);
    }
    bar.innerHTML='<span class="sb-name">\u2694 '+esc(sn.name)+'</span>'
      +'<span class="sb-bar"><span class="sb-fill" style="display:block;width:'+pct+'%"></span></span>'
      +'<span class="sb-days">'+dl+'D LEFT &bull; '+pct+'%</span>';
    /* keep clear of the dopamine comeback banner if it appears */
    var top=0;
    try{ if(document.getElementById("dpComeback")) top=42; }catch(e){}
    bar.style.top=top+"px";
    document.body.style.paddingTop=(36+top)+"px";
  }catch(e){}
}
bannerCss();
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
setInterval(tick,1000);
/* keep the banner clear if the comeback banner mounts later */
setInterval(function(){
  try{
    var bar=document.getElementById("pf-seasonbar"); if(!bar) return;
    var top=document.getElementById("dpComeback")?42:0;
    if(bar.style.top!==top+"px"){ bar.style.top=top+"px"; document.body.style.paddingTop=(36+top)+"px"; }
  }catch(e){}
},2000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
