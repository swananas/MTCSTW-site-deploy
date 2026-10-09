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
<!-- W6B (2026-10-04): anchor for R11/R22 /#pf-warplan links. Wave 5A's W5-4
     war-plan section should take over this id when it merges — remove this span then. -->
<span id="pf-warplan"></span>
<h2>Morning Briefing</h2>
<div class="c-tag">Your war, at a glance. Thirty seconds, then move.</div>
<div id="xBrief"><div class="c-load">Assembling your briefing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
/* Election Day fallback for the season frame. Local midnight. */
var ELECTION=new Date(2026,10,3,0,0,0,0).getTime();
/* wave-live-rails (2026-10-05): the authoritative date comes from the
   site_config rail ('campaign_end'); the hardcoded date above is the
   fail-soft fallback. */
try{
  if(window.PF&&PF.siteConfig){ PF.siteConfig.ready(function(map){
    try{ var t=map&&map.campaign_end?Date.parse(map.campaign_end):0;
      if(t>0) ELECTION=t; }catch(e){}
  }); }
}catch(e){}
/* Rank tiers mirror games/enlistment-ranks.js. */
var TIERS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  /* SECURITY (2026-10-06 pre-ship hardening): scheme allowlist for URLs
     rendered into href/src. Only http(s) or relative URLs pass;
     javascript:, data:, vbscript: etc. are rejected. */
  function safeUrl(u){
    var s=String(u==null?'':u).trim();
    if(!s) return '';
    try{ var p=new URL(s,'https://x.invalid').protocol;
      if(p==='http:'||p==='https:') return s; }catch(e){}
    return '';
  }
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
  if(action==="loot_status"||action==="streak_status"||action==="cell_mine"||action==="comeback_check"||action==="circuit_status"||action==="war_plan"||action==="crossfire_status"){
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
var BAL=null,STREAK=null,LOOT=null,FLASH=null,COMEBACK=null,COMEBACK_ERR=null,PROP=null,CELL=null,MISS=null,STAT=null,SEASON=null,BRIEF=null,SEASHIST=null,CIRCUIT=null,WARPLAN=null,OPARC=null,HALL=null,ECON=null,XCROSS=null;
var N_CALLS=12;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=N_CALLS) fin(); }
  setTimeout(fin,15000);
  /* Dedicated endpoints first (no-ops until the backend ships). */
  api("briefing",{callsign:id.callsign,device:id.device},function(j){
    BRIEF=(j&&j.ok)?j:null;
    /* D1 STRUCT (2026-10-06): xp_balance / streak_status / loot_status /
       proposal_list are strict subsets of the briefing aggregate — derived
       client-side instead of firing duplicate calls. flash_active and
       cell_mine stay dedicated: briefing carries flash ends_in only as a
       formatted string (no numeric countdown) and has no active_week. */
    try{
      var b=BRIEF&&BRIEF.briefing;
      if(b){
        BAL={balance:Number((b.soldier&&b.soldier.xp)||0)};
        /* briefing's streak_hours_left is true hours; the old streak_status
           field was ms (misnamed), so the *3600000 in render() is now
           correct for the derived value. */
        STREAK={ok:true,
          count:Number((b.soldier&&b.soldier.streak_count)||0),
          at_risk:!!(b.soldier&&b.soldier.streak_at_risk),
          hours_left:Number((b.soldier&&b.soldier.streak_hours_left)||0)};
        LOOT={ok:true,can_claim:!!(b.today&&b.today.loot_available)};
        /* proposals_closing_soon is pre-filtered server-side to open
           proposals closing within 24h — exactly the set the old
           proposal_list loop counted. */
        PROP={closingSoon:(b.proposals_closing_soon||[]).length};
      }
    }catch(e){}
    one();
  });
  api("season_current",{},function(j){ SEASON=(j&&j.ok)?j.season:null; one(); });
  /* Aggregate the silos directly — this is the cement.
     (D1 STRUCT 2026-10-06: xp_balance / streak_status / loot_status /
     proposal_list removed — derived from the briefing aggregate above.) */
  /* S1 Route March (2026-10-04): today's circuit — auth-gated per-callsign read. */
  api("circuit_status",{callsign:id.callsign,device:id.device},function(j){ CIRCUIT=(j&&j.ok)?j:null; one(); });
  /* W5-4 War Plan (2026-10-04): the morning aggregate — march preview +
     ambush window + flash siren + recruit race + climbers + streak/ribbons.
     Public info returns for any callsign; the personal streak slice is
     included only when auth checks out (optional-auth, handled server-side).
     Zero XP for reading or routing. */
  api("war_plan",{callsign:id.callsign,device:id.device},function(j){ WARPLAN=(j&&j.ok)?j:null; one(); });
  api("flash_active",{},function(j){ FLASH=j; one(); });
  /* W5-5 Crossfire Circuit (2026-10-04): hot-zone state — auth-gated read. */
  api("crossfire_status",{callsign:id.callsign,device:id.device},function(j){ XCROSS=(j&&j.ok)?j:null; one(); });
  api("comeback_check",{callsign:id.callsign,device:id.device},function(j){ COMEBACK=(j&&j.ok&&j.eligible)?j:null; COMEBACK_ERR=(j&&!j.ok)?j:null; one(); });
  /* (D1 STRUCT 2026-10-06: proposal_list removed — the closing-soon count is
     derived from the briefing aggregate in the briefing callback above.) */
  /* D1 STRUCT (2026-10-06): cell_mine is a DEDICATED call (not a duplicate).
     The briefing aggregate's cell block has no active_week, which the
     YOUR CELL section renders — so the dedicated call stays. */
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){ CELL=(j&&j.ok)?j:null; one(); });
  api("campaign_missions",{callsign:id.callsign,device:id.device},function(j){ MISS=j; one(); });
  api("campaign_status",{},function(j){ STAT=j; one(); });
  /* 2026-10-03: season_history (public) — past seasons surface in §5. */
  api("season_history",{},function(j){ SEASHIST=(j&&j.ok&&j.seasons)||null; one(); });
  /* W5-10 Operation Arcs (2026-10-04): arc read is a Promise from core/oparc.js
     — never part of the N_CALLS countdown; fail-silent, paints when it lands. */
  try{
    if(window.PF&&typeof PF.opArc==="function"){
      PF.opArc().then(function(a){ OPARC=a; paintArcHeader(); },function(){});
    }
  }catch(e){}
  /* W5-6 Hall of Proof (2026-10-04): "you were mentioned" read — never part
     of the N_CALLS countdown; fail-silent, paints when it lands. */
  try{
    api("hall_list",{},function(j){ HALL=(j&&j.ok)?j:null; paintHallMention(); });
  }catch(e){}
  /* R34 (2026-10-04): econ_calendar — auctions ending / drops starting as
     appointment mechanics inside the briefing. Degrades silently until W6B-1
     ships the action. */
  api("econ_calendar",{},function(j){ ECON=(j&&j.ok)?j:null; one(); });
}
/* D1 STRUCT (2026-10-06) FIX — PRE-EXISTING BUG (introduced b99352d 2026-10-04):
   crossfireHtml() was nested inside load(), so render()'s unconditional
   h+=crossfireHtml() threw ReferenceError on every signed-in briefing render.
   Hoisted to top level; behavior otherwise unchanged. */
  /* ---------- W5-5 CROSSFIRE CIRCUIT (2026-10-04): a live flash window turns
   the next Route March stop into a hot zone. One auth-gated read
   (crossfire_status); the combo claim is POST-only. The zone is picked
   server-side — the client never sends a stop index. ---------- */
function crossfireHtml(){
  if(!XCROSS||!XCROSS.flash_live) return "";
  var h='<div class="br-sec br-xf"><div class="br-sect">\u26A1 CROSSFIRE CIRCUIT</div>';
  if(XCROSS.claimed){
    h+='<div class="x-note">Zone cleared. +'+Number(XCROSS.payout||0)+' XP banked. The flash window is still live — hold the line.</div></div>';
    return h;
  }
  var z=XCROSS.zone;
  if(!z){
    h+='<div class="x-note">Flash window live, but the march is fully walked. Nothing left to crossfire.</div></div>';
    return h;
  }
  h+='<div class="br-xfz">CROSSFIRE ZONE: <b>'+esc(z.label||"")+'</b></div>';
  var total=Number(XCROSS.step_xp||0)+Number(XCROSS.combo_xp||0);
  if(XCROSS.can_claim){
    h+='<div class="x-note">Mission verified. Claim the combo before the window closes.</div>'
      +'<div style="margin-top:8px"><button class="c-btn br-xfbtn" data-act="crossfire">CLAIM COMBO +'+total+' XP</button></div>';
  } else if(XCROSS.device_claimed){
    h+='<div class="x-note">This device already fired its crossfire claim today.</div>';
  } else {
    h+='<div class="x-note">Run the mission, then claim the combo:</div>'
      +'<div style="margin-top:8px"><a class="c-btn" href="'+esc(safeUrl(z.page)||"/")+'">GO: '+esc(z.label||"")+'</a></div>';
  }
  h+='</div>';
  return h;
}
function seasonInfo(){
  if(SEASON){
    return { name:String(SEASON.name||"THE MIDTERM BLITZ"),
      endsAt:Number(SEASON.ends_at||ELECTION),
      goal:Number(SEASON.goal||1000), progress:Number(SEASON.progress||0) };
  }
  var pledges=0,acts=0,goal=1000;
  try{
    if(STAT){ pledges=Number(STAT.pledges)||0; acts=Number(STAT.actions)||0; goal=Number(STAT.goal)||1000; }
  }catch(e){}
  return { name:"THE MIDTERM BLITZ", endsAt:ELECTION, goal:goal, progress:pledges+acts };
}
/* ---------- S1 ROUTE MARCH (2026-10-04): TODAY'S ROUTE MARCH card ---------- */
function routeMarchHtml(){
  if(!CIRCUIT||!CIRCUIT.stops) return "";
  var stops=CIRCUIT.stops, h="";
  var sd=Number(CIRCUIT.streak_day||1);
  h+='<div class="br-sec" id="pf-routemarch"><div class="br-sect">\\u2694 TODAY\\u2019S ROUTE MARCH</div>';
  h+='<div class="br-rmhead"><span class="br-rmname">'+esc(String(CIRCUIT.route_name||"MARCH"))+'</span>'
    +'<span class="br-rmday">DAY '+sd+' &bull; NEXT +'+Number(CIRCUIT.next_payout||10)+' XP</span></div>';
  for(var i=0;i<stops.length;i++){ var s=stops[i];
    h+='<a class="br-rmstop'+(s.done?" done":"")+'" href="'+esc(safeUrl(s.page)||"/")+'">'
      +'<span class="br-rmn">'+(s.done?"\\u2713":"STOP "+(i+1))+'</span>'
      +'<span class="br-rml">'+esc(s.action_label||"")+'</span>'
      +'<span class="br-rmgo">&rarr;</span></a>';
  }
  if(CIRCUIT.claimed){
    h+='<div class="x-note" style="margin-top:8px">\\u2713 MARCH COMPLETE &mdash; DAY '+sd+' &bull; +'
      +Number(CIRCUIT.payout||0)+' XP claimed. Tomorrow pays +'+Number(CIRCUIT.next_payout||10)
      +' XP. Miss a day and the streak resets.<br><a href="/store" style="display:inline-block;color:#e5383b;font-weight:700;margin-top:8px;min-height:44px;line-height:44px">GEAR UP AT THE STORE &rarr;</a></div>';
  } else if(CIRCUIT.can_claim){
    h+='<div style="margin-top:10px"><button class="c-btn br-rmbtn" data-act="circuit">CLAIM +'
      +Number(CIRCUIT.next_payout||10)+' XP &mdash; DAY '+sd+'</button></div>';
  } else {
    h+='<div class="x-note" style="margin-top:8px">'+Number(CIRCUIT.completed||0)+' OF '
      +Number(CIRCUIT.total||4)+' stops done. Finish the march to claim +'
      +Number(CIRCUIT.next_payout||10)+' XP (day '+sd+').</div>';
  }
  h+='</div>';
  return h;
}
/* W5-10 Operation Arcs (2026-10-04): "OPERATION <name>: <chapter_title>" line
   under the soldier header whenever an arc is live. DOM-insert only — never a
   full re-render — so a late arc read can't clobber mid-interaction state.
   paintArcHeader is safe to call any number of times (dedupes on .br-arc). */
function paintArcHeader(){
  try{
    if(!OPARC||!OPARC.active) return;
    var el=document.getElementById("xBrief"); if(!el) return;
    if(el.querySelector(".br-arc")) return;
    var head=el.querySelector(".br-head");
    var d=document.createElement("div");
    d.className="br-arc";
    d.style.cssText="margin:10px 0 0;padding:8px 12px;border:2px solid #c1121f;background:#0a0a0a;color:#f5ead6;font:bold 14px/1.4 monospace;text-transform:uppercase;letter-spacing:1px;";
    d.textContent="OPERATION "+String(OPARC.name||"").toUpperCase()+": "+String(OPARC.chapter_title||"");
    if(head&&head.parentNode) head.parentNode.insertBefore(d,head.nextSibling);
    else el.insertBefore(d,el.firstChild);
  }catch(e){}
}
/* ---------- V3 (2026-10-07) CIVICSNAP ABSORB ----------
   One inline line: "Today in Political HQ: [active campaign]" -> /political-hq.
   Read from PF.homepageInit() (briefing) only — no separate API call.
   DOM-insert only (never a full re-render), dedupes on .br-civic, fail-silent. */
function civicCampaignTitle(d){
  /* V3 composite ships civic.campaigns=[{id,title,...}] from pressure_list.
     Take the first active campaign's title. Legacy probes kept as fallback. */
  try{
    var cv=d&&d.civic, arr=cv&&cv.campaigns;
    if(arr&&arr.length&&arr[0]&&arr[0].title) return String(arr[0].title);
  }catch(e0){}
  var cand=["civic_campaign","phq_campaign","active_campaign","pressure_campaign","campaign"],
      pools=[], i, k, p, c, t;
  try{
    var b=(d&&d.briefing)||null; if(b&&b.briefing) b=b.briefing;
    if(b) pools.push(b);
    if(b&&b.civic_snapshot) pools.push(b.civic_snapshot);
    if(b&&b.snapshot) pools.push(b.snapshot);
  }catch(e){}
  for(i=0;i<pools.length;i++){
    p=pools[i]; if(!p||typeof p!=="object") continue;
    for(k=0;k<cand.length;k++){
      c=p[cand[k]]; t="";
      if(c&&typeof c==="object"){ t=c.title||c.name||""; }
      else if(typeof c==="string"){ t=c; }
      if(t) return String(t);
    }
  }
  return "";
}
function paintCivicLine(){
  try{
    if(!(window.PF&&typeof PF.homepageInit==="function")) return;
    PF.homepageInit().then(function(d){
      try{
        var t=civicCampaignTitle(d);
        if(!t) return;
        var el=document.getElementById("xBrief"); if(!el) return;
        if(el.querySelector(".br-civic")) return;
        var dv=document.createElement("div");
        dv.className="br-civic";
        dv.style.cssText="margin:10px 0 0;padding:8px 12px;border:1px solid #3a2c22;background:#0d0b06;color:#f5ead6;font:13px monospace;";
        dv.innerHTML='TODAY IN POLITICAL HQ: <b style="color:#e8b64c">'+esc(t)+'</b>'
          +' &nbsp;<a href="/political-hq" style="color:#e5383b;font-weight:bold;text-decoration:none;">ENTER &rarr;</a>';
        el.insertBefore(dv,el.firstChild);
      }catch(e){}
    },function(){});
  }catch(e2){}
}
/* ---------- W5-6 HALL OF PROOF MENTION (2026-10-04) ----------
   "You were mentioned" — paints when the hall_list read lands, never part
   of the N_CALLS countdown; fail-silent, dedupes on .br-hall. */
function paintHallMention(){
  try{
    if(!HALL||!HALL.pins||!HALL.pins.length) return;
    var id=ident(); if(!id.callsign) return;
    var mycs=String(id.callsign).toLowerCase().trim(), mine=[];
    for(var i=0;i<HALL.pins.length;i++){
      if(String(HALL.pins[i].callsign||"").toLowerCase()===mycs) mine.push(HALL.pins[i]);
    }
    if(!mine.length) return;
    var el=document.getElementById("xBrief"); if(!el) return;
    if(el.querySelector(".br-hall")) return;
    var feats=mine.map(function(x){ return x.feat||x.source; }).join(", ");
    var d=document.createElement("div");
    d.className="br-hall";
    d.style.cssText="border:1px solid #c1121f;background:#140606;border-radius:6px;padding:10px 12px;margin:10px 0";
    d.innerHTML='<div style="font-size:11px;letter-spacing:2px;color:#e5383b;font-weight:bold">HALL OF PROOF</div>'
      +'<div style="font-size:13px;margin-top:4px;color:#f5ead6">You were pinned this week &mdash; '+esc(String(mine.length))
      +' feat'+(mine.length===1?"":"s")+' on the wall: '+esc(feats)+'.</div>';
    var arc=el.querySelector(".br-arc"), head=el.querySelector(".br-head");
    if(arc&&arc.parentNode) arc.parentNode.insertBefore(d,arc.nextSibling);
    else if(head&&head.parentNode) head.parentNode.insertBefore(d,head.nextSibling);
    else el.insertBefore(d,el.firstChild);
  }catch(e){}
}
/* ---------- W5-4 MORNING WAR PLAN (2026-10-04): the 30-second read ----------
   One aggregate read (war_plan) fanning out to every live system. Every row
   is a deep link; eligibility is enforced server-side at the destinations.
   Zero XP for reading or routing. Rows render only when their subsystem has
   live data — null subsystems render nothing (no empty cards). */
function warPlanHtml(){
  var wp=WARPLAN;
  if(!wp) return "";
  var rows="", now=Date.now();
  /* ROUTE MARCH — one-line deep link down to the dedicated card (§3.25),
     which carries the per-stop deep links and the day-N escalator. */
  try{
    if(wp.march){
      var mstopN=(wp.march.stops||[]).length;
      rows+='<div class="br-order"><span class="br-oname">\\u2694 ROUTE MARCH &mdash; '+esc(String(wp.march.route_name||"MARCH"))+' &middot; '+mstopN+' stops</span>'
        +'<button class="c-btn" data-go="pf-routemarch">MARCH</button></div>';
    }
  }catch(e){}
  /* AMBUSH — tonight's window. Live drops show slots + countdown; otherwise
     the wait to the next eligible window. Links to /events (claim surface). */
  try{
    var am=wp.ambush;
    if(am){
      if(am.live&&am.drop){
        var d=am.drop, left=Math.max(0,Number(d.slot_cap||0)-Number(d.claims||0));
        rows+='<div class="br-order br-flash"><span class="br-oname">\\uD83C\\uDF81 AMBUSH LIVE &mdash; '+left+' slots left</span>'
          +'<span class="br-oxp br-tick" data-ends="'+Number(d.ends_at||0)+'">'+fmtCountdown(Number(d.ends_at||0)-now)+'</span></div>'
          +'<div style="margin:6px 0 2px"><a class="c-btn" href="/events">CLAIM THE DROP</a></div>';
      } else if(Number(am.next_eligible_in||0)>0){
        rows+='<div class="br-order"><span class="br-oname">\\uD83C\\uDF81 AMBUSH &mdash; next window in '+fmtHours(Number(am.next_eligible_in))+'</span>'
          +'<a class="c-btn" href="/events">STANDBY</a></div>';
      }
    }
  }catch(e){}
  /* FLASH SIREN — siren countdown or live event. Routes to the arcade. */
  try{
    var fl=wp.flash;
    if(fl&&(fl.live||fl.siren)){
      var flt=fl.live?"\\u26A1 FLASH LIVE":"\\uD83D\\uDEA8 SIREN";
      var cd="";
      if(fl.siren&&!fl.live&&Number(fl.starts_at||0)>0)
        cd=' <span class="br-oxp br-tick" data-ends="'+Number(fl.starts_at)+'">'+fmtCountdown(Number(fl.starts_at)-now)+'</span>';
      rows+='<div class="br-order"><span class="br-oname">'+flt+' &mdash; '+esc(String(fl.title||"FLASH EVENT"))+cd+'</span>'
        +'<button class="c-btn" data-go="pf-dopa">TO THE ARCADE</button></div>';
    }
  }catch(e){}
  /* RECRUIT RACE — top 3 recruiters when a race is live. Routes to referrals. */
  try{
    var rc=wp.race;
    if(rc&&rc.race&&rc.leaderboard&&rc.leaderboard.length){
      var top=rc.leaderboard.slice(0,3);
      var names=top.map(function(r,i){ return (i+1)+". "+esc(String(r.callsign||"?"))+" ("+Number(r.recruits||0)+")"; }).join(" \\u00B7 ");
      rows+='<div class="br-order"><span class="br-oname">\\uD83C\\uDFC1 RECRUIT RACE &mdash; '+names+'</span>'
        +'<button class="c-btn" data-go="pf-referral">RECRUIT</button></div>';
    }
  }catch(e){}
  /* CLIMBERS — no climbers module in the backend yet (war_plan.climbers is
     null). Nothing renders until the Climbers Board (A6) ships. */
  /* STREAK — day-N chain display. Included only when the callsign authed. */
  try{
    var st=wp.streak;
    if(st){
      var sn=Number(st.count||0);
      rows+='<div class="br-order"><span class="br-oname">\\uD83D\\uDD25 DAY '+sn+' &mdash; the chain holds'+(st.at_risk?" (AT RISK &mdash; check in today)":"")+'</span>'
        +'<button class="c-btn" data-go="pf-dopa">HOLD IT</button></div>';
    }
  }catch(e){}
  /* RIBBONS — W5-1 Theater Ribbons not built (war_plan.ribbons is []). The
     ribbon-chase strip ("4/7 systems — FULL THEATER needs 3 more") renders
     here once the backend ships a chase object. */
  if(!rows) return "";
  /* UX Combination Play 2 (fe/ux-take-to-cell): figure = the order lines as
     plain text. Kill: ?pf_off=brief. */
  var wpFig = "";
  try { wpFig = String(rows).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140); } catch (e) {}
  return '<div class="br-sec"><div class="br-sect">\\u2694 TODAY\\u2019S WAR PLAN</div>'
    +'<div class="x-note" style="margin-bottom:6px">The whole theater, 30 seconds. Every line is a door &mdash; eligibility is checked on the other side.</div>'
    +rows
    +'<div data-pf-actionbar data-pf-tc-kind="briefing" data-pf-tc-title="TODAY\\u2019S WAR PLAN" data-pf-tc-figure="'+esc(wpFig)+'" data-pf-tc-link="/"></div>'
    +'</div>';
}
/* SECURITY (2026-10-08): duplicate crossfireHtml() removed — the later declaration
   shadowed the 2026-10-06 safeUrl() scheme allowlist on the GO: href. The
   surviving hoisted copy at ~line 230 retains safeUrl(z.page). */
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
      +dropSectionHtml()
      /* wave-live-rails (2026-10-05): Top Stories is public — renders for
         anonymous visitors too, same cache as the HQ. */
      +'<div class="br-sec" id="pf-brief-news"><div class="x-note">Stories updating&hellip;</div></div>';
    dropWire();
    renderSeasonBanner();
    paintArcHeader();
    paintCivicLine();
    try {
      var nh0=document.getElementById("pf-brief-news");
      if(nh0&&window.PF&&PF.newsTop){ PF.newsTop.render(nh0,{limit:5}); }
    } catch(e0){}
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
    /* Cohesion §5 copy standard (Psych, binding): streaks never feel like
       punishment — no "dies", no "or lose it" threat framing. */
    urg.push({t:"YOUR RUN IS STILL STANDING",d:"Your "+streakN+"-day run is still standing \u2014 "+streakHrs+" left today. One check-in keeps it rolling.",
      btn:"KEEP IT ROLLING",go:"pf-dopa"});
  }
  try{
    if(LOOT&&LOOT.can_claim) urg.push({t:"LOOT CRATE READY",d:"Today's crate is unopened. Something's inside.",
      btn:"OPEN CRATE",go:"pf-dopa"});
  }catch(e){}
  try{
    /* D1 STRUCT (2026-10-06): the closing-soon count is derived from the
       briefing aggregate's proposals_closing_soon (open proposals closing
       within 24h) — no dedicated proposal_list call. */
    var closing=Number((PROP&&PROP.closingSoon)||0);
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
  /* ---------- 2.5 WAR PLAN (W5-4) — the 30-second morning read ---------- */
  h+=warPlanHtml();
  /* ---------- 2.6 MACRO THIS WEEK (Wave A2, S-04, 2026-10-05) ----------
     Release-week lines (jobs day, CPI day) from the briefing's macro_week
     field. Renders ONLY on release weeks (backend sends lines only then).
     Read-only official FRED figures — zero XP, display only.
     KILL: ?pf_off=fred-editorial (same key as the news-rail flags). */
  (function(){
    try {
      if (window.PF && PF.skip && PF.skip('fred-editorial')) return;
      var mw = BRIEF && BRIEF.briefing && BRIEF.briefing.macro_week;
      var mlines = (mw && Array.isArray(mw.lines)) ? mw.lines : [];
      if (!mlines.length) return;
      h += '<div class="br-sec"><div class="br-sect">MACRO THIS WEEK</div>';
      for (var mi2 = 0; mi2 < mlines.length; mi2++) {
        var ln = mlines[mi2] || {};
        var lab = (ln.type === 'jobs_day') ? 'JOBS DAY' :
                  (ln.type === 'cpi_day') ? 'CPI DAY' : 'MACRO';
        var txt = String(ln.text || '').replace(/^(JOBS DAY|CPI DAY):\s*/, '');
        h += '<div class="br-macro"><span class="br-mlabel">' + esc(lab) + '</span>' +
             '<span class="br-mtext">' + esc(txt) + '</span></div>';
      }
      if (mw.source_note) h += '<div class="x-note">' + esc(mw.source_note) + '</div>';
      h += '</div>';
    } catch (e) {}
  })();
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
  /* W5-5 Crossfire Circuit: hot-zone banner (only renders during a live flash). */
  h+=crossfireHtml();
  /* ---------- 3.25 ROUTE MARCH (S1) — today's guided circuit ---------- */
  h+=routeMarchHtml();
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
    h+='<div style="margin-top:8px"><a href="/economy" class="c-btn" style="text-decoration:none;display:inline-block;">RUN THE ECONOMY</a></div>';
    /* A1 home (2026-10-05): People's Price Index feeder — Daily Briefing row.
       Deep-links to the check-in widget on /economy. No backend call. */
    h+='<div class="br-order" style="margin-top:6px"><span class="br-oname">PRICE INDEX \u2014 report this week\u2019s prices</span>' +
      '<span class="br-oxp"><a href="/economy#pf-inflation-checkin" style="color:#e8a0a0;">REPORT \u2192</a></span></div>';
    h+='</div>';
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
  /* ---------- 7. TOP STORIES (wave-live-rails) — the shared news_top cache.
     Fail-soft: the helper renders a "stories updating" line when empty. */
  h+='<div class="br-sec" id="pf-brief-news"><div class="x-note">Stories updating&hellip;</div></div>';
  el.innerHTML=h;
  try {
    var nh=document.getElementById("pf-brief-news");
    if(nh&&window.PF&&PF.newsTop){ PF.newsTop.render(nh,{limit:5}); }
  } catch(e2){}
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
          /* Spec 8 (Fix Pod, 2026-10-05): route into one prescribed next
             action — the Daily Orders check-in card — instead of toast +
             reload. load() re-fetches comeback_check so the CLAIM card
             clears; then scroll to #pf-orders and flash it (pf-flash idiom
             mirrors daily-orders.js). */
          load();
          setTimeout(function(){
            try{
              var oc=document.getElementById("pf-orders");
              if(oc){
                var r=oc.getBoundingClientRect();
                if(r.top<-10||r.top>window.innerHeight+10){
                  var t=r.top+(window.pageYOffset||document.documentElement.scrollTop||0);
                  window.scrollTo(0,Math.max(0,t-20));
                }
                oc.classList.add("pf-flash");
                setTimeout(function(){ try{oc.classList.remove("pf-flash");}catch(e3){} },1400);
              } else { toast("Next: check in with Daily Orders."); }
            }catch(e2){ toast("Next: check in with Daily Orders."); }
          },650);
          return;
        }
        else { toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; btn.textContent="CLAIM"; return; }
      });
    }; })(acts[a]);
  }
  /* S1 Route March: the circuit claim button (pays the escalating bonus). */
  var rmacts=el.querySelectorAll("button[data-act='circuit']");
  for(var ra=0;ra<rmacts.length;ra++){
    (function(btn){ btn.onclick=function(){
      btn.disabled=true; btn.textContent="CLAIMING...";
      var id2=ident();
      dopaPost("circuit","c_action","circuit_claim",{callsign:id2.callsign,device:id2.device},function(j){
        if(j&&j.ok){
          toast("ROUTE MARCH COMPLETE. +"+Number(j.payout||0)+" XP \\u2014 DAY "+Number(j.streak_day||1)+". Tomorrow pays +"+Number(j.next_payout||0)+" XP.");
        }
        else { toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; btn.textContent="CLAIM BONUS"; return; }
        load();
      });
    }; })(rmacts[ra]);
  }
  /* W5-5 Crossfire Circuit: the zone combo claim (pays the step share + 15 XP).
     Reveal uses the loot-crate burst styling, then the briefing reloads. */
  var xfacts=el.querySelectorAll("button[data-act='crossfire']");
  for(var xf=0;xf<xfacts.length;xf++){
    (function(btn){ btn.onclick=function(){
      btn.disabled=true; btn.textContent="CLAIMING...";
      var id2=ident();
      dopaPost("crossfire","x_action","crossfire_claim",{callsign:id2.callsign,device:id2.device},function(j){
        if(j&&j.ok){
          var got=Number(j.payout||0);
          try{
            btn.parentNode.innerHTML='<div class="br-xfr"><div class="xf-rtag">CROSSFIRE COMBO</div>'
              +'<div class="xf-rxp">+'+got+' XP</div>'
              +'<div class="xf-rname">'+esc(String(j.zone||""))+'</div></div>';
          }catch(e){}
          toast("CROSSFIRE COMBO. +"+got+" XP.");
          setTimeout(load,2600);
        }
        else { toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; btn.textContent="CLAIM COMBO"; return; }
      });
    }; })(xfacts[xf]);
  }
  dropWire();
  renderSeasonBanner();
  paintArcHeader();
  paintCivicLine();
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
    +"#pf-brief .br-sect{font:bold 13px monospace;color:#e5383b;letter-spacing:2px;margin-bottom:10px}"
    +"#pf-brief .br-urg{border:2px solid #c1121f;background:#1a0505;padding:10px;margin-bottom:8px}"
    +"#pf-brief .br-ut{font:bold 13px monospace;color:#ff6b6b;margin-bottom:4px}"
    +"#pf-brief .br-ubtn{margin-top:8px}"
    +"#pf-brief .br-order{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid #222;font:13px monospace;color:#ddd}"
    +"#pf-brief .br-oxp{color:#e8b64c;font-weight:bold;white-space:nowrap;margin-left:10px}"
    +"#pf-brief .br-flash{border:1px solid #e8b64c;background:#141003;padding:8px}"
    +"#pf-brief .br-cell .br-cname{font:bold 16px monospace;color:#fff}"
    +"#pf-brief .br-seasonline{display:flex;justify-content:space-between;font:bold 12px monospace;color:#ff6b6b;margin-bottom:8px}"
    +"#pf-brief .br-gate{font:14px monospace;color:#ccc;padding:16px;border:1px dashed #666}"
    /* wave-live-rails (2026-10-05): Top Stories rail slots into the brief. */
    +"#pf-brief .pf-newstop-head{font:bold 13px monospace;color:#e5383b;letter-spacing:2px;margin-bottom:10px}"
    +"#pf-brief .pf-newstop-list{list-style:none;margin:0;padding:0}"
    +"#pf-brief .pf-newstop-item{padding:8px 4px;border-bottom:1px solid #222;font:13px monospace}"
    +"#pf-brief .pf-newstop-item a{color:#f5ead6;text-decoration:none}"
    +"#pf-brief .pf-newstop-item a:hover{color:#fff;text-decoration:underline}"
    +"#pf-brief .pf-newstop-meta{display:block;font:11px monospace;color:#888;margin-top:3px}"
    +"#pf-brief .pf-newstop-empty,#pf-brief .pf-newstop-stale{font:12px monospace;color:#888;padding:6px 0}"
    /* Wave A2 (S-04, 2026-10-05): MACRO THIS WEEK section. */
    +"#pf-brief .br-macro{display:flex;gap:10px;align-items:baseline;padding:8px 4px;border-bottom:1px solid #222;font:13px monospace;color:#ddd}"
    +"#pf-brief .br-mlabel{font:bold 11px monospace;color:#0a0a0a;background:#e8b64c;padding:3px 8px;border-radius:2px;white-space:nowrap;letter-spacing:1px}"
    +"#pf-brief .br-mtext{color:#f5ead6}"
    /* S1 Route March (2026-10-04): TODAY'S ROUTE MARCH card. */
    +"#pf-brief .br-rmhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}"
    +"#pf-brief .br-rmname{font:bold 15px monospace;color:#fff;letter-spacing:1px}"
    +"#pf-brief .br-rmday{font:bold 11px monospace;color:#e8b64c;letter-spacing:1px}"
    +"#pf-brief .br-rmstop{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #222;font:13px monospace;color:#ddd;text-decoration:none}"
    +"#pf-brief .br-rmstop.done{color:#7ddf8a}"
    +"#pf-brief .br-rmn{font:bold 12px monospace;color:#e5383b;min-width:54px}"
    +"#pf-brief .br-rmstop.done .br-rmn{color:#7ddf8a}"
    +"#pf-brief .br-rml{flex:1}"
    +"#pf-brief .br-rmgo{color:#e5383b;font-weight:bold}"
    +"#pf-brief .br-rmbtn{margin-top:2px}"
    +"#pf-seasonbar{position:fixed;top:0;left:0;right:0;z-index:99990;background:#0a0a0a;border-bottom:2px solid #c1121f;color:#fff;font:bold 12px monospace;padding:7px 12px;display:flex;align-items:center;gap:10px;letter-spacing:1px;box-sizing:border-box;min-height:36px}"
    +"#pf-seasonbar .sb-name{color:#ff6b6b;white-space:nowrap}"
    +"#pf-seasonbar .sb-bar{flex:1;height:6px;background:#222;border-radius:3px;overflow:hidden;min-width:60px}"
    +"#pf-seasonbar .sb-fill{height:100%;background:#c1121f}"
    +"#pf-seasonbar .sb-days{color:#e8b64c;white-space:nowrap}"
    +"#pf-seasonbar .sb-link{display:flex;align-items:center;gap:10px;flex:1;color:inherit;text-decoration:none;cursor:pointer}"
    +"#pf-seasonbar .sb-x{background:none;border:none;color:#888;font:bold 16px monospace;cursor:pointer;padding:2px 6px;line-height:1}"
    +"#pf-seasonbar .sb-x:hover{color:#fff}"
    /* 2026-10-08 fix/mobile-visual: the fixed banner (z-index 99990) was
       overlapping the sticky topbar (z-index 10000) when scrolled, clipping
       the nav items. Offset the sticky topbar below the banner. */
    +"body[data-pf-banner='on'] .pf-topbar{top:36px !important}"
    +"body[data-pf-banner='off'] .pf-topbar{top:0 !important}"
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
    +"#pf-brief .br-dnote{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:10px}"
    /* W5-5 Crossfire Circuit (2026-10-04): hot-zone banner + combo reveal
       (burst animation mirrors the ambush/loot-crate reveal). */
    +"#pf-brief .br-xf{border:2px solid #e8b10c;background:#171106}"
    +"#pf-brief .br-xfz{font:13px monospace;color:#fff;margin-bottom:6px}"
    +"#pf-brief .br-xfz b{color:#e8b10c}"
    +"#pf-brief .br-xfbtn{margin-top:2px}"
    +"#pf-brief .br-xfr{margin:10px auto 0;max-width:320px;padding:14px;border:3px solid #e8b10c;background:#0d0d0d;text-align:center;animation:xfburnst .5s ease-out}"
    +"#pf-brief .br-xfr .xf-rtag{font:bold 12px monospace;color:#e8b10c;letter-spacing:3px;margin-bottom:6px}"
    +"#pf-brief .br-xfr .xf-rxp{font:bold 34px monospace;color:#f5ead6}"
    +"#pf-brief .br-xfr .xf-rname{font:13px monospace;color:#c9bfa8;margin-top:4px}"
    +"@keyframes xfburnst{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}"
    +"@media (prefers-reduced-motion: reduce){#pf-brief .br-xfr{animation:none!important}}";
  document.head.appendChild(s);
}
function renderSeasonBanner(){
  bannerCss();
  /* 2026-10-06: dismissible season bar — X persists in localStorage. */
  try{ if(localStorage.getItem("pf_seasonbar_hide")==="1"){ try{document.body.setAttribute("data-pf-banner","off");}catch(e){} return; } }catch(e){}
  try{ document.body.setAttribute("data-pf-banner","on"); }catch(e2){}
  try{
    var sn=seasonInfo();
    var dl=Math.max(0,Math.ceil((sn.endsAt-Date.now())/86400000));
    var pct=Math.min(100,Math.round(sn.progress/Math.max(1,sn.goal)*100));
    var bar=document.getElementById("pf-seasonbar");
    if(!bar){
      bar=document.createElement("div"); bar.id="pf-seasonbar";
      document.body.appendChild(bar);
    }
    /* R22 (Wave 6B): the season banner is a link — tap through to the
       briefing's season/war-plan section instead of a dead strip. */
    bar.innerHTML='<a class="sb-link" href="/#pf-warplan" title="See the war plan">'
      +'<span class="sb-name">\u2694 '+esc(sn.name)+'</span>'
      +'<span class="sb-bar"><span class="sb-fill" style="display:block;width:'+pct+'%"></span></span>'
      +'<span class="sb-days">'+dl+'D LEFT &bull; '+pct+'%</span></a>'
      +'<button class="sb-x" id="sbX" aria-label="Hide banner">&#10005;</button>';
    /* X-out: hide + persist */
    try{
      var sbx=document.getElementById("sbX");
      if(sbx&&!sbx._wired){ sbx._wired=1; sbx.addEventListener("click",function(ev){
        try{ ev.stopPropagation(); ev.preventDefault(); }catch(e){}
        try{ localStorage.setItem("pf_seasonbar_hide","1"); }catch(e2){}
        var b=document.getElementById("pf-seasonbar");
        try{ if(b) b.style.display="none"; document.body.style.paddingTop="0px"; document.body.setAttribute("data-pf-banner","off"); }catch(e3){}
      }); }
    }catch(e){}
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
/* V3 (2026-10-07, "unclunk"): seed the Featured Drop from the homepage_init
   composite — its briefing key IS the daily_content response. No separate
   daily_content call. Falls back to dropTryBackend when the composite is
   unavailable. */
function dropFromComposite(){
  if (_dropRendered) return;
  var done=function(){
    if (_dropRendered) return; _dropRendered=true;
    try { render(); } catch (e) {}
    dropPaint();
  };
  try{
    if (window.PF && typeof PF.homepageInit === "function") {
      PF.homepageInit().then(function(d){
        var b=d&&d.briefing;
        if (b && b.ok !== false && b.head) {
          DROP_NET={ tag:b.tag||"TRUTH", head:b.head, body:b.body||"" };
        }
        done();
      }, function(){ done(); });
      setTimeout(function(){ done(); },8000);
      return;
    }
  }catch(e){}
  dropTryBackend();
}
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
    /* ---- butter: editorial kit (factgen standard) ---- */
    var btR="#c1121f", btRD="#7d0b16", btC="#f2ecdc", btG="#c9a227",
        btM="#a89a7d", btF="#6f6350";
    x.fillStyle="#0e0d0c"; x.fillRect(0,0,W,H);
    x.save(); x.globalAlpha=0.032; x.strokeStyle="#ffffff"; x.lineWidth=1;
    for(var btD=-H; btD<W+H; btD+=26){
      x.beginPath(); x.moveTo(btD,0); x.lineTo(btD+H,H); x.stroke();
    }
    x.restore();
    var btVg=x.createRadialGradient(W/2,H*0.40,H*0.16,W/2,H*0.50,H*0.85);
    btVg.addColorStop(0,"rgba(0,0,0,0)"); btVg.addColorStop(1,"rgba(0,0,0,0.55)");
    x.fillStyle=btVg; x.fillRect(0,0,W,H);
    var btBar=x.createLinearGradient(0,0,0,10);
    btBar.addColorStop(0,btR); btBar.addColorStop(1,btRD);
    x.fillStyle=btBar; x.fillRect(0,0,W,10);
    x.save(); x.globalAlpha=0.05; x.fillStyle=btC;
    x.font="900 620px Arial,sans-serif"; x.textAlign="center";
    x.fillText("★",W/2,H*0.60); x.restore();
    x.textAlign="center";
    var y=130;
    /* kicker: letterspaced gold */
    x.fillStyle=btG; x.font="700 27px Arial,sans-serif";
    try{ x.letterSpacing="10px"; }catch(e){}
    x.fillText("THE PROPAGANDA FACTORY",W/2,y);
    try{ x.letterSpacing="0px"; }catch(e){}
    y+=36;
    x.strokeStyle="rgba(201,162,39,0.5)"; x.lineWidth=1;
    x.beginPath(); x.moveTo(W/2-150,y); x.lineTo(W/2+150,y); x.stroke();
    y+=78;
    /* masthead: monumental serif with red gradient */
    x.font='900 64px Georgia,"Times New Roman",serif';
    var btFg=x.createLinearGradient(0,y-64,0,y);
    btFg.addColorStop(0,"#e63946"); btFg.addColorStop(1,btRD);
    x.fillStyle=btFg;
    x.fillText("★ THE DAILY DROP ★",W/2,y); y+=96;
    x.fillStyle=btG; x.font="700 30px Arial,sans-serif";
    try{ x.letterSpacing="6px"; }catch(e){}
    x.fillText("DAY "+DROP_N+" OF THE MIDTERM BLITZ",W/2,y);
    try{ x.letterSpacing="0px"; }catch(e){}
    y+=84;
    /* tag: hairline box, red letterspaced */
    x.font="700 30px Arial,sans-serif";
    try{ x.letterSpacing="4px"; }catch(e){}
    var tw=x.measureText(tag).width+90;
    try{ x.letterSpacing="0px"; }catch(e){}
    x.strokeStyle=btR; x.lineWidth=2;
    x.strokeRect(W/2-tw/2,y-46,tw,64);
    x.fillStyle=btR; x.font="700 30px Arial,sans-serif";
    try{ x.letterSpacing="4px"; }catch(e){}
    x.fillText(tag,W/2,y);
    try{ x.letterSpacing="0px"; }catch(e){}
    y+=104;
    /* headline: editorial serif */
    x.fillStyle=btC; x.font='900 54px Georgia,"Times New Roman",serif';
    dropWrap(x,head,W-170).slice(0,5).forEach(function(l){ x.fillText(l,W/2,y); y+=68; });
    y+=18;
    /* red diamond rule */
    x.strokeStyle=btR; x.lineWidth=2;
    x.beginPath(); x.moveTo(W/2-190,y); x.lineTo(W/2-26,y); x.stroke();
    x.beginPath(); x.moveTo(W/2+26,y); x.lineTo(W/2+190,y); x.stroke();
    x.save(); x.translate(W/2,y); x.rotate(Math.PI/4);
    x.fillStyle=btR; x.fillRect(-9,-9,18,18); x.restore();
    y+=56;
    /* 2026-10-04 P4 #11 (margin bump 2026-10-04): footer reservation — the body
       is capped so it never enters the footer zone (butter footer starts at
       H-215), and the streak line gets a guaranteed 80px slot instead of
       being silently skipped when space runs out. */
    x.fillStyle=btM; x.font='400 36px Georgia,"Times New Roman",serif';
    var streakSlot=80, bodyMaxY=(H-215)-streakSlot;
    var bodyLines=dropWrap(x,body,W-210);
    var avail=Math.max(1,Math.floor((bodyMaxY-y)/50));
    bodyLines.slice(0,Math.min(7,avail)).forEach(function(l){ x.fillText(l,W/2,y); y+=50; });
    y+=26;
    x.fillStyle=btG; x.font="700 30px Arial,sans-serif";
    try{ x.letterSpacing="6px"; }catch(e){}
    x.fillText("YOUR STREAK: "+DROP_S.streak+(DROP_S.streak===1?" DAY":" DAYS"),W/2,y);
    try{ x.letterSpacing="0px"; }catch(e){}
    /* ---- butter footer: CTA standard ---- */
    var fy=H-215;
    x.strokeStyle="rgba(201,162,39,0.45)"; x.lineWidth=1;
    x.beginPath(); x.moveTo(120,fy); x.lineTo(W-120,fy); x.stroke();
    fy+=58;
    x.font="900 44px Arial,sans-serif"; x.fillStyle=btC;
    try{ x.letterSpacing="8px"; }catch(e){}
    var btCta="JOIN THE FIGHT";
    var btCtaW=x.measureText(btCta).width;
    x.fillText(btCta,W/2,fy);
    x.fillStyle=btR; x.fillText(".",W/2+btCtaW/2-4,fy);
    try{ x.letterSpacing="0px"; }catch(e){}
    fy+=52;
    x.fillStyle=btR; x.font="900 32px Arial,sans-serif";
    try{ x.letterSpacing="10px"; }catch(e){}
    x.fillText("MTCSTW.COM",W/2,fy);
    try{ x.letterSpacing="0px"; }catch(e){}
    fy+=42;
    x.fillStyle=btF; x.font="400 24px Arial,sans-serif";
    try{ x.fillText(new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase(),W/2,fy); }catch(e){}
    var btBar2=x.createLinearGradient(0,H-10,0,H);
    btBar2.addColorStop(0,btRD); btBar2.addColorStop(1,btR);
    x.fillStyle=btBar2; x.fillRect(0,H-10,W,10);
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
/* V3 homepage (2026-10-07, "unclunk"): anonymous visitors render the brief
   from the homepage_init composite only — the 12-call load() fan-out is
   skipped (nothing in it serves the anonymous gate+drop+news render).
   Signed-in visitors keep the full personalized briefing. */
var V3_ANON_BRIEF=false;
try { V3_ANON_BRIEF=!!document.getElementById('pf-v2')&&!ident().callsign; } catch (e) {}
if (V3_ANON_BRIEF) {
  dropFromComposite();
  /* Anonymous re-poll: refresh the composite past its 60s cache, repaint. */
  setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
    try{ if(window.PF&&typeof PF.homepageInit==="function") PF.homepageInit(true).then(function(){ try{render();}catch(e2){} },function(){}); }catch(e3){} },600000);
} else {
  dropTryBackend();
  load();
  /* D1 STRUCT (2026-10-06): re-poll stretched 3min -> 10min. Briefing content
     changes on day boundaries (day key / streak / loot); per-second countdowns
     are DOM-only via tick(). Skip-when-hidden preserved. */
  setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },600000);
}
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
