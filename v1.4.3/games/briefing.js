/* games/briefing.js  |  PF v1.4.3 | MORNING BRIEFING.
   The cement: one scannable briefing that pulls every silo together into a
   single soldier identity + daily orders. First thing a soldier sees.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained
   post() -> PF.authPost). Aggregates existing endpoints; degrades per-section
   if the dedicated `briefing` / `season_current` backends are not deployed yet.
   Also injects the site-wide season banner (thin fixed strip: season name,
   days left, goal progress).
   2026-10-03: Daily Drop consolidated here as the FEATURED DROP slot
   (games/daily-drop.js deleted). Streak/day-count logic preserved verbatim;
   streak key pf_drop_v1 unchanged so existing streaks carry over.
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
  /* Private reads require auth_secret (IDOR fix). Route gated actions
     through the shared claim-retry GET (2026-10-03): pre-auth callsign
     holders with no stored secret get one auth_claim attempt instead of
     failing 'missing credentials' forever. */
  if(action==="loot_status"||action==="streak_status"||action==="cell_mine"||action==="comeback_check"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
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
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
/* CORS POST for writes. */
function post(cAction,params,cb){
  var body=Object.assign({type:"brief",b_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
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
var BAL=null,STREAK=null,LOOT=null,FLASH=null,COMEBACK=null,COMEBACK_ERR=null,PROP=null,CELL=null,MISS=null,STAT=null,SEASON=null,BRIEF=null,SEASHIST=null,ECON=null;
var N_CALLS=13;
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
  api("comeback_check",{callsign:id.callsign,device:id.device},function(j){ COMEBACK=(j&&j.ok&&j.eligible)?j:null; COMEBACK_ERR=(j&&!j.ok)?j:null; one(); });
  api("proposal_list",{},function(j){ PROP=j; one(); });
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){ CELL=(j&&j.ok)?j:null; one(); });
  api("campaign_missions",{callsign:id.callsign,device:id.device},function(j){ MISS=j; one(); });
  api("campaign_status",{},function(j){ STAT=j; one(); });
  /* 2026-10-03: season_history (public) — past seasons surface in §5. */
  api("season_history",{},function(j){ SEASHIST=(j&&j.ok&&j.seasons)||null; one(); });
  /* R34 (2026-10-04): econ_calendar — auctions ending / drops starting as
     appointment mechanics inside the briefing. Degrades silently until W6B-1
     ships the action. */
  api("econ_calendar",{},function(j){ ECON=(j&&j.ok)?j:null; one(); });
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
    /* 2026-10-04: the Featured Drop is public content — its slot and the
       SHARE THIS DROP button render for anonymous visitors too. Only the
       personalized briefing (rank, XP, orders, cell) needs a callsign.
       Previously the whole drop hid behind the gate, so anonymous crawls
       saw no drop at all while logged-in owners did. */
    el.innerHTML='<div class="br-gate">Briefings run on callsigns. Claim yours in Enlistment Ranks, then report back here.</div>'
      +'<div style="margin-top:10px"><button class="c-btn" onclick="document.getElementById(\\\'pf-ranks\\\')&&document.getElementById(\\\'pf-ranks\\\').scrollIntoView({behavior:\\\'smooth\\\'})">ENLIST</button></div>'
      +dropSectionHtml();
    dropWire();
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
  } else if(COMEBACK_ERR&&/missing credentials|unauthorized|claim unavailable|legacy_callsign/.test(String(COMEBACK_ERR.err||""))){
    /* Auth-gated read failed (2026-10-03): friendly reconnect nudge, never
       the raw backend string. */
    urg.push({t:"RECONNECT NEEDED",d:"Your callsign lost its handshake with HQ. Re-claim it in Enlistment Ranks (one tap), then reload.",
      btn:"RECONNECT",go:"pf-ranks"});
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
  /* ---------- 3.5 FEATURED DROP (Daily Drop slot) ---------- */
  h+=dropSectionHtml();
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
  /* ---------- 4.5 ECON CALENDAR (R34) — appointment mechanics: auctions
     ending and drops starting, straight from econ_calendar. Past items are
     skipped; the whole section hides until the backend action ships. */
  (function(){
    var now=Date.now(), rows=[];
    try{
      var auc=ECON&&ECON.auctions?ECON.auctions:[];
      for(var ai=0;ai<auc.length;ai++){
        var a=auc[ai], ends=Number(a.ends_at||0);
        if(ends&&ends<now) continue;
        rows.push({t:"AUCTION ENDS: "+(a.title||a.id||"auction"), c:fmtCountdown(ends?ends-now:0)});
      }
      var drp=ECON&&ECON.drops?ECON.drops:[];
      for(var di2=0;di2<drp.length;di2++){
        var dp=drp[di2], starts=Number(dp.starts_at||0);
        if(starts&&starts<now) continue;
        rows.push({t:"DROP: "+(dp.title||dp.id||"drop"), c:starts?("IN "+fmtCountdown(starts-now)):"SOON"});
      }
    }catch(e){}
    if(!rows.length) return;
    h+='<div class="br-sec"><div class="br-sect">ECON CALENDAR</div>';
    for(var ri=0;ri<Math.min(rows.length,5);ri++){
      h+='<div class="br-order"><span class="br-oname">'+esc(rows[ri].t)+'</span>'
        +'<span class="br-oxp">'+esc(rows[ri].c)+'</span></div>';
    }
    h+='<div style="margin-top:8px"><a href="/economy" class="c-btn" style="text-decoration:none;display:inline-block;">RUN THE ECONOMY</a></div></div>';
  })();
  /* ---------- 5. SEASON PROGRESS ---------- */
  var sn=seasonInfo();
  var dl=Math.max(0,Math.ceil((sn.endsAt-Date.now())/86400000));
  var spct=Math.min(100,Math.round(sn.progress/Math.max(1,sn.goal)*100));
  h+='<div class="br-sec"><div class="br-sect">'+esc(sn.name)+'</div>'
    +'<div class="br-seasonline"><span>'+dl+' DAYS LEFT</span><span>'+spct+'% OF GOAL</span></div>'
    +'<div class="br-tierwrap"><div class="br-tierbar"><div class="br-tierfill br-war" style="width:'+spct+'%"></div></div></div>'
    +'<div class="x-note">Day '+(32-dl)+' of 32 &mdash; '+sn.progress+' / '+sn.goal+' actions</div>';
  /* 2026-10-03: season_history (public) — past seasons, degrade silently. */
  (function(){
    var past=[];
    try{
      var all=SEASHIST||[];
      for(var si=0;si<all.length;si++){
        var s=all[si];
        if(String(s.status)==="active") continue;
        if(SEASON&&String(s.id)===String(SEASON.id)) continue;
        past.push(s);
      }
    }catch(e){}
    if(past.length){
      h+='<div class="x-note" style="margin-top:8px"><b>PAST SEASONS:</b></div>';
      for(var pi2=0;pi2<Math.min(past.length,5);pi2++){
        var ps2=past[pi2];
        h+='<div class="x-note">'+esc(ps2.name||"season")+' — '+Number(ps2.pct||0)+'% of '+esc(ps2.goal_type||"goal")+'</div>';
      }
    }
  })();
  h+='</div>';
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
        if(j&&j.ok){
          var got=Number(j.xp||50);
          toast("Welcome back. +"+got+" XP.");
          /* 2026-10-03: comeback:record_check (AUTH) — the comeback flow
             checks the day's haul against the personal best. */
          try{
            dopaPost("comeback","cb_action","record_check",{callsign:id2.callsign,device:id2.device,day_xp:got},function(rj){
              if(rj&&rj.ok&&rj.is_record){ toast("NEW PERSONAL RECORD: "+got+" XP in a day."); }
            });
          }catch(e){}
        }
        else { toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; btn.textContent="CLAIM"; return; }
        load();
      });
    }; })(acts[a]);
  }
  dropWire();
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
    +"#pf-seasonbar .sb-days{color:#e8b64c;white-space:nowrap}"
    /* 2026-10-03: FEATURED DROP slot (Daily Drop consolidation) — the drop's
       own styles, rescoped from #pf-drop to #pf-brief.br-*. */
    +"#pf-brief .br-dday{font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:12px}"
    +"#pf-brief .br-dcard{background:#f5ead6;color:#0d0d0d;padding:18px 16px;margin:0 0 12px;text-align:left}"
    +"#pf-brief .br-dtag{display:inline-block;background:#c1121f;color:#fff;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;padding:4px 12px;margin-bottom:10px;text-transform:uppercase}"
    +"#pf-brief .br-dhead{font-family:'Arial Black',Arial,sans-serif;font-size:19px;line-height:1.3;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;color:#0d0d0d}"
    +"#pf-brief .br-dbody{font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#333;margin:0}"
    +"#pf-brief .br-dstreak{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:12px}"
    +"#pf-brief .br-dbtns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:4px}"
    +"#pf-brief .br-darch{display:none;margin-top:12px;text-align:left}"
    +"#pf-brief .br-darch.open{display:block}"
    +"#pf-brief .br-daitem{background:#1a1a1a;border-left:4px solid #c1121f;padding:10px 14px;margin:8px 0;font-family:Arial,sans-serif}"
    +"#pf-brief .br-daday{font-size:11px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase}"
    +"#pf-brief .br-dahead{font-family:'Arial Black',Arial,sans-serif;font-size:13px;text-transform:uppercase;margin:2px 0;color:#f5ead6}"
    +"#pf-brief .br-dabody{font-size:12px;color:#c9bfa8}"
    +"#pf-brief .br-dnote{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:10px}";
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
/* ---------- FEATURED DROP (Daily Drop consolidation, 2026-10-03) ----------
   The Daily Drop's content, streak/day-count logic, and backend hook, folded
   into the Briefing as a featured-content slot. Copy and streak mechanics are
   verbatim from games/daily-drop.js (deleted); the streak key pf_drop_v1 is
   unchanged so existing streaks carry over. Fires pf-drop-claimed (Do Meter
   +2, field-op auto-complete) and pf-drop-golden exactly as before. */
var DROP_LS="pf_drop_v1", DROP_LAUNCH="2026-09-28";
/* DROPS: 30 evergreen agitprop items, cycling. t = STAT | QUOTE | TRUTH | ORDER */
var DROPS=[
{t:"STAT",h:"8 men own more wealth than half of humanity.",b:"Not 8 percent. 8 men. Half the planet. This isn't an economy, it's a heist."},
{t:"TRUTH",h:"Your boss needs you. You don't need your boss.",b:"Every dollar of profit is a wage that wasn't paid. Remember who makes the value."},
{t:"QUOTE",h:"\u201CThe ruling ideas of each age have ever been the ideas of its ruling class.\u201D \u2014 Karl Marx",b:"Read that again the next time the news tells you what's \u2018realistic.\u2019"},
{t:"ORDER",h:"Talk to one coworker about pay today.",b:"Wage secrecy is a boss's best friend. One honest conversation is an act of war."},
{t:"STAT",h:"American workers are 2.5x more productive than in 1979. Pay is up 15%.",b:"Productivity soared. Your paycheck didn't. The difference went to people who've never done your job."},
{t:"TRUTH",h:"Billionaires don't create jobs. Workers create wealth; billionaires collect it.",b:"Nobody ever got rich from their own labor alone."},
{t:"QUOTE",h:"\u201CIt is the job of thinking people not to be on the side of the executioners.\u201D \u2014 Albert Camus",b:"Pick a side. The machine already picked you."},
{t:"ORDER",h:"Share one drop from this page today.",b:"Propaganda only works if it moves. Be the machine's distribution arm."},
{t:"STAT",h:"The top 1% owns 32% of all wealth in America.",b:"The bottom 50% owns 2.5%. The game isn't rigged \u2014 rigged implies it was ever fair."},
{t:"TRUTH",h:"\u2018Unskilled labor\u2019 is a myth invented to pay you less.",b:"Try running a restaurant, warehouse, or hospital with no \u2018unskilled\u2019 workers for one day."},
{t:"QUOTE",h:"\u201CThe law, in its majestic equality, forbids rich and poor alike to sleep under bridges.\u201D \u2014 Anatole France",b:"Justice is blind. It just happens to only see one class."},
{t:"ORDER",h:"Learn your rights at work tonight.",b:"15 minutes of reading. The boss hopes you never do it."},
{t:"STAT",h:"CEOs now make 290x the average worker.",b:"In 1965 it was 21x. Nothing about leadership got 14 times better."},
{t:"TRUTH",h:"The news calls it \u2018the economy.\u2019 They mean the stock market.",b:"Your rent went up and your pay didn't. That's the economy you live in."},
{t:"QUOTE",h:"\u201CIf voting changed anything, they'd make it illegal.\u201D \u2014 Emma Goldman",b:"They're certainly trying."},
{t:"ORDER",h:"Find one local mutual aid group and follow them.",b:"The revolution is also a food drive. Start where your feet are."},
{t:"STAT",h:"Empty homes outnumber homeless people 28 to 1.",b:"There is no housing shortage. There's a profit shortage in housing people."},
{t:"TRUTH",h:"They want you debating strangers online instead of organizing coworkers.",b:"The algorithm feeds you outrage because outrage doesn't unionize."},
{t:"QUOTE",h:"\u201CThe only thing necessary for evil to triumph is for good people to do nothing.\u201D",b:"The machine prefers you tired, alone, and scrolling."},
{t:"ORDER",h:"Cancel one subscription that funds the machine.",b:"Your money is a vote they actually count. Spend it like it."},
{t:"STAT",h:"Medical debt is the #1 cause of bankruptcy in America.",b:"In every other rich country, getting sick doesn't mean going broke. Here it's a business model."},
{t:"TRUTH",h:"Nobody is coming to save us. That's the good news.",b:"It means we get to save each other. That's what the network is for."},
{t:"QUOTE",h:"\u201CFirst they ignore you, then they laugh at you, then they fight you, then you win.\u201D",b:"We're somewhere between laughing and fighting. Good."},
{t:"ORDER",h:"Ask an elder what organizing looked like before the internet.",b:"The tactics are old. The tools are new. Learn both."},
{t:"TRUTH",h:"Solidarity is a strategy, not a sentiment.",b:"Every strike won, every union formed, every right you have \u2014 won by people acting together."},
{t:"ORDER",h:"Put your politics in the group chat.",b:"One message. \u2018Did you know CEOs make 290x what we do?\u2019 Then watch."},
{t:"TRUTH",h:"\u2018There is no alternative\u2019 is the most successful propaganda ever made.",b:"There are always alternatives. They just don't profit the people saying that."},
{t:"ORDER",h:"Support one striking worker this week.",b:"Walk a picket line, contribute to a strike fund, or just bring coffee. Show up."},
{t:"TRUTH",h:"The network is the message.",b:"8M+ reach. One machine. You're already inside it \u2014 act like it."},
{t:"ORDER",h:"Bring one friend into the ranks.",b:"Send them this page. The machine grows one recruit at a time."}
];
function dropChi(){ var d=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"})); d.setHours(0,0,0,0); return d; }
function dropDayNum(){ var l=new Date(DROP_LAUNCH+"T00:00:00"); return Math.max(1,Math.floor((dropChi()-l)/86400000)+1); }
function dropFor(n){ return DROPS[(n-1)%DROPS.length]; }
function dropKey(d){ return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function dropLoad(){ try{ return JSON.parse(localStorage.getItem(DROP_LS)||'{"last":"","streak":0}'); }catch(e){ return {last:"",streak:0}; } }
function dropSave(s){ try{ localStorage.setItem(DROP_LS,JSON.stringify(s)); }catch(e){} }
function dropNetCount(){ var nc=62; try{ if(window.PF&&PF.slrAll){ var a=PF.slrAll(); if(a&&a.length) nc=a.length; } else if(window.PF&&PF.ROSTER&&PF.ROSTER.length){ nc=PF.ROSTER.length; } }catch(e){} return nc; }
var DROP_N=dropDayNum(), DROP_S=dropLoad(), DROP_TK=dropKey(dropChi());
var DROP_NET={tag:null,head:null,body:null}, DROP_GOLDEN=false, _dropRendered=false, _dropGoldFired=false;
/* New-day claim: streak advance, pf-drop-claimed event, golden roll. */
(function dropClaim(){
  if(DROP_S.last===DROP_TK) return;
  var y=dropChi(); y.setDate(y.getDate()-1);
  DROP_S.streak=(DROP_S.last===dropKey(y))?DROP_S.streak+1:1; DROP_S.last=DROP_TK; dropSave(DROP_S);
  try{ document.dispatchEvent(new CustomEvent("pf-drop-claimed",{detail:{day:DROP_TK,streak:DROP_S.streak}})); }catch(e){}
  /* GOLDEN DROP: 1-in-20 claims hit the motherlode — special art + bonus XP. */
  try{ if(Math.random()<0.05){ DROP_GOLDEN=true; document.dispatchEvent(new CustomEvent("pf-drop-golden",{detail:{day:DROP_TK}})); } }catch(e2){}
})();
function dropPaint(){
  var ddp=dropFor(DROP_N);
  var tag=DROP_NET.tag||ddp.t, head=DROP_NET.head||ddp.h, body=DROP_NET.body||ddp.b;
  var d=document.getElementById("brDropDay"); if(d) d.textContent="Day "+DROP_N+" of the offensive";
  var t=document.getElementById("brDropTag");
  if(t){ if(DROP_GOLDEN){ t.textContent="\u2605 GOLDEN DROP \u2605"; t.style.color="#e8b10c"; } else t.textContent=tag; }
  var h=document.getElementById("brDropHead");
  if(h){ if(DROP_GOLDEN){ h.innerHTML="THE MOTHERLODE<br><span style='font-size:0.9rem;'>Today the machine smiles on you.</span>"; } else h.textContent=head; }
  var b=document.getElementById("brDropBody"); if(b) b.textContent=String(body).replace("{N}",dropNetCount());
  var s2=document.getElementById("brDropStreak");
  if(s2) s2.textContent="Your streak: "+DROP_S.streak+(DROP_S.streak===1?" day":" days")+" \u2014 come back tomorrow to keep it alive";
}
/* Backend content: today's drop from the server (?action=daily_content).
   The static DROPS array is the fallback — the slot renders identically. */
function dropTryBackend(){
  api("daily_content",{},function(j){
    if(_dropRendered) return; _dropRendered=true;
    if(j&&j.ok&&j.head){ DROP_NET={tag:j.tag||"TRUTH",head:j.head,body:j.body||""}; }
    dropPaint();
  });
  setTimeout(function(){ if(!_dropRendered){ _dropRendered=true; dropPaint(); } },8000);
}
function dropSectionHtml(){
  var ddp=dropFor(DROP_N);
  var tag=DROP_NET.tag||ddp.t, head=DROP_NET.head||ddp.h, body=String(DROP_NET.body||ddp.b).replace("{N}",dropNetCount());
  /* 2026-10-03 fix: the slot mounts as section[data-game="daily-drop"] (nested in
     briefing's section) so core/share-image.js re-attaches its SHARE IMAGE /
     SAVE IMAGE TO PHONE pair — the pair the drop lost in the homepage reorg. */
  return '<section class="br-sec" data-game="daily-drop"><div class="br-sect">\u26A1 FEATURED DROP</div>'
    +'<div class="br-dday" id="brDropDay">Day '+DROP_N+' of the offensive</div>'
    +'<div class="br-dcard"><span class="br-dtag" id="brDropTag"'+(DROP_GOLDEN?' style="color:#e8b10c"':'')+'>'+(DROP_GOLDEN?'\u2605 GOLDEN DROP \u2605':esc(tag))+'</span>'
    +'<p class="br-dhead" id="brDropHead">'+(DROP_GOLDEN?"THE MOTHERLODE<br><span style='font-size:0.9rem;'>Today the machine smiles on you.</span>":esc(head))+'</p>'
    +'<p class="br-dbody" id="brDropBody">'+esc(body)+'</p></div>'
    +'<div class="br-dstreak" id="brDropStreak">Your streak: '+DROP_S.streak+(DROP_S.streak===1?" day":" days")+' \u2014 come back tomorrow to keep it alive</div>'
    +'<div class="br-dbtns"><button class="c-btn" id="brDropShare">SHARE THIS DROP</button>'
    +'<button class="c-btn" id="brDropArchBtn">PAST DROPS</button></div>'
    +'<div class="br-darch" id="brDropArch"></div>'
    +'<div class="br-dnote">One drop per day. Come back tomorrow &mdash; the offensive continues.</div></section>';
}
/* ---------- FEATURED DROP share poster (2026-10-03 fix) ----------
   SHARE THIS DROP generates a branded 1080x1350 poster of TODAY's drop through
   the PFShare image flow. The painter reads the rendered DOM so it works
   whether the content came from the backend or the static fallback. */
function dropWrap(x,text,maxW){
  var words=String(text==null?"":text).split(/\\s+/),lines=[],line="";
  words.forEach(function(w){ var t=line?line+" "+w:w;
    if(x.measureText(t).width>maxW&&line){ lines.push(line); line=w; } else { line=t; } });
  if(line)lines.push(line); return lines;
}
function dropPaintPoster(done){
  try{
    var tagEl=document.getElementById("brDropTag"),hdEl=document.getElementById("brDropHead"),bdEl=document.getElementById("brDropBody");
    var tag=String(tagEl?tagEl.textContent:"TRUTH").toUpperCase(),
        head=String(hdEl?hdEl.textContent:"").toUpperCase(),
        body=bdEl?bdEl.textContent:"";
    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ done(null); return; }
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);
    x.textAlign="center";
    var y=170;
    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",W/2,y); y+=108;
    x.fillStyle="#c1121f"; x.font="900 60px \\\"Arial Black\\\",Arial,sans-serif";
    x.fillText("\u2605 THE DAILY DROP \u2605",W/2,y); y+=92;
    x.fillStyle="#f5ead6"; x.font="700 38px Arial,sans-serif";
    x.fillText("DAY "+DROP_N+" OF THE 32-DAY OFFENSIVE",W/2,y); y+=84;
    x.font="700 32px Arial,sans-serif";
    var tw=x.measureText(tag).width+80;
    x.fillStyle="#c1121f"; x.fillRect(W/2-tw/2,y-46,tw,66);
    x.fillStyle="#ffffff"; x.fillText(tag,W/2,y); y+=104;
    x.fillStyle="#f5ead6"; x.font="900 52px \\\"Arial Black\\\",Arial,sans-serif";
    dropWrap(x,head,W-170).slice(0,5).forEach(function(l){ x.fillText(l,W/2,y); y+=64; });
    y+=22;
    /* 2026-10-04 P4 #11 (margin bump 2026-10-04): footer reservation — the body
       is capped so it never enters the footer zone (MTCSTW.COM at H-168), and
       the streak line gets a guaranteed 80px slot instead of being silently
       skipped when space runs out. The extra 10px over the original 70 buys
       the streak ~17px of worst-case clearance above the footer while also
       trimming the tight-case body budget by up to a line. */
    x.fillStyle="#c9bfa8"; x.font="400 38px Arial,sans-serif";
    var streakSlot=80, bodyMaxY=(H-168)-streakSlot;
    var bodyLines=dropWrap(x,body,W-210);
    var avail=Math.max(1,Math.floor((bodyMaxY-y)/52));
    bodyLines.slice(0,Math.min(7,avail)).forEach(function(l){ x.fillText(l,W/2,y); y+=52; });
    y+=26;
    x.fillStyle="#ff5a00"; x.font="700 34px Arial,sans-serif";
    x.fillText("YOUR STREAK: "+DROP_S.streak+(DROP_S.streak===1?" DAY":" DAYS"),W/2,y);
    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */
    x.fillStyle="#c1121f"; x.font="900 46px \\\"Arial Black\\\",Arial,sans-serif";
    x.fillText("MTCSTW.COM",W/2,H-168);
    x.font="900 44px \\\"Arial Black\\\",Arial,sans-serif";
    x.fillText("JOIN THE FIGHT.",W/2,H-108);
    x.fillStyle="#c9bfa8"; x.font="400 30px Arial,sans-serif";
    try{ x.fillText(new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase(),W/2,H-58); }catch(e){}
    done(cv);
  }catch(e){ try{ done(null); }catch(e2){} }
}
/* Register the drop's custom painter with the share-image companion. Guarded:
   if the companion is killed (?pf_off=share-image) the SHARE THIS DROP button
   falls back to text share below. */
try{ if(window.PFShare&&PFShare.setPoster) PFShare.setPoster("daily-drop",dropPaintPoster); }catch(e){}
function dropWire(){
  var sh=document.getElementById("brDropShare");
  if(sh) sh.onclick=function(){
    /* 2026-10-03 fix: SHARE THIS DROP generates a poster IMAGE of today's drop
       through the PFShare image flow (canvas -> PNG). On iOS the share sheet
       is the save route ("Save Image" is one tap); on desktop it downloads.
       Text share is the fallback when the share-image companion is
       unavailable (e.g. ?pf_off=share-image). */
    function textShare(){
      var hd=document.getElementById("brDropHead"), cur=hd?hd.textContent:"";
      /* Share reads the rendered headline from the DOM so it works whether the
         content came from the backend or the static fallback. */
      var text="Day "+DROP_N+" of the offensive: "+cur+" \u2014 via The Propaganda Factory "+location.href;
      if(navigator.share){ navigator.share({title:"The Daily Drop",text:text,url:location.href}).catch(function(){}); }
      else if(navigator.clipboard){ navigator.clipboard.writeText(text).then(function(){ toast("Drop copied. Go spread it."); }).catch(function(){}); }
    }
    if(window.PFShare&&window.PFShare.shareImage){
      sh.disabled=true;
      try{
        dropPaintPoster(function(cv){
          sh.disabled=false;
          if(cv) PFShare.shareImage(cv,"pfn-daily-drop.png","The Daily Drop","daily-drop");
          else textShare();
        });
      }catch(e){ sh.disabled=false; textShare(); }
    } else textShare();
  };
  var ab=document.getElementById("brDropArchBtn");
  if(ab) ab.onclick=function(){
    var arch=document.getElementById("brDropArch"); if(!arch) return;
    if(arch.classList.contains("open")){ arch.classList.remove("open"); return; }
    var nc=dropNetCount(), hh="";
    for(var i=1;i<=7;i++){ var dn=DROP_N-i; if(dn<1) break; var d=dropFor(dn);
      hh+='<div class="br-daitem"><div class="br-daday">Day '+dn+' \u00B7 '+esc(d.t)+'</div><div class="br-dahead">'+esc(d.h)+'</div><div class="br-dabody">'+esc(String(d.b).replace("{N}",nc))+'</div></div>';
    }
    arch.innerHTML=hh||'<div class="br-daitem"><div class="br-dabody">The offensive just began. Check back tomorrow.</div></div>';
    arch.classList.add("open");
  };
  /* Golden-drop celebration, once the slot is on the page. */
  if(DROP_GOLDEN&&!_dropGoldFired){
    _dropGoldFired=true;
    try{ if(window.PF&&PF.dope){ var hb=document.getElementById("brDropDay"); PF.dope.confetti(hb?hb.parentNode:document.body,40); } }catch(e){}
  }
}
bannerCss();
dropTryBackend();
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
/* keep the banner clear if the comeback banner mounts later */
setInterval(function(){
  try{
    if(window.PF&&PF.hidden&&PF.hidden()) return;
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
