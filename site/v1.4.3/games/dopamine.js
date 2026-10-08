/* games/dopamine.js  |  PF v1.4.3 | DAILY FIRE — the habit loop hub.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST through PF.authPost (self-contained post()). It never
   reaches into another silo's internals.
   Backend contract (new): GET dopamine_status -> {ok, loot:{claimed_today,next_reset_in},
     streak:{count,at_risk,risk_ends_at,longest,broken_at}, flash:[{id,label,multiplier,ends_at}],
     combo:{count,multiplier}, records:{best_day_xp,longest_streak},
     nearrank:{position,above:{callsign,xp_gap},below:{callsign,xp_gap}}}
   POST {type:"loot",l_action:"loot_open"} | {type:"streak",str_action:"streak_freeze_buy"|"streak_repair"} | {type:"comeback",cb_action:"comeback_claim"}
   GET comeback_check -> {ok, eligible, xp}
   Until the backend lands, every section degrades to a "warming up" state.
   Site-wide overlays (injected to body): lucky-bonus toast
   (listens for pf:lucky; also fires when any post() response carries j.lucky),
   comeback banner. Combo meter listens for pf-combo-hit events.
   (2026-10-02: the pf-promoted level-up modal was removed — the pinup poster
   in core/06-pinups.js is the canonical rank-up celebration.)
   KILL: ?pf_off=dopa  or  localStorage pf_disabled_v1='["dopa"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("dopa")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-dopa">
<div class="fe-block pf-override-block pf-silo" id="pf-dopa">
<h2>Daily Fire</h2>
<div class="c-tag">Your daily habit loop. Open the crate. Protect the streak. Chase the flash.</div>
<div id="xDopa"><div class="c-load">Stoking the fire&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* Friendly copy for gated read failures (2026-10-03): raw backend strings
   like 'missing credentials' are never shown as UI copy. */
function dpAuthHint(j){
  var e=String((j&&j.err)||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return '<br><span class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>';
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return '<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.'+
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
      (function(){ try{ return (window.PF && window.PF.recoverLinkHTML) ? window.PF.recoverLinkHTML() : ''; }catch(e2){ return ''; } })()+
      '</span>';
  return "";
}
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Route gated actions
     through the shared claim-retry GET (2026-10-03): pre-auth callsign
     holders with no stored secret get one auth_claim attempt instead of
     failing 'missing credentials' forever. */
  if(action==="dopamine_status"||action==="combo_status"||action==="comeback_check"||action==="loot_history"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfDpCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for writes — through the auth layer, backend verdict parsed.
   If the backend flags a lucky bonus (j.lucky), fire the toast. */
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params||{});
  body[actionKey]=action;
  function done(j){
    try{
      if(j&&j.lucky&&window.PF&&PF.dopaLucky){ PF.dopaLucky(j.lucky.xp||0,j.lucky.mult||0); }
      else if(j&&j.lucky){ luckyToast(j.lucky.xp||0,j.lucky.mult||0); }
    }catch(e){}
    try{ cb(j||{ok:false,err:"Network error."}); }catch(e2){}
  }
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
  var bodyStr=JSON.stringify(body);
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
/* ---- dopamine silo styles ---- */
function dpCss(){
  if(document.getElementById("pf-dopa-css")) return;
  var s=document.createElement("style"); s.id="pf-dopa-css";
  s.textContent=
    ".dp-pane{margin:14px 0;padding:14px;border:1px solid #5a1a1a;background:#160b0b}"
    +".dp-pane h4{margin:0 0 8px;color:#f5ead6;letter-spacing:2px;font-size:13px}"
    +".dp-cratewrap{text-align:center;padding:10px 0}"
    +".dp-crate{font-size:96px;line-height:1;filter:drop-shadow(0 0 18px #e8b10c);display:inline-block}"
    +".dp-shake{animation:dpshake .6s ease-in-out}"
    +"@keyframes dpshake{0%,100%{transform:rotate(0)}15%{transform:rotate(-14deg) translateX(-8px)}35%{transform:rotate(12deg) translateX(8px)}55%{transform:rotate(-9deg) translateX(-6px)}75%{transform:rotate(7deg) translateX(6px)}}"
    +".dp-burst{animation:dpburst .5s ease-out}"
    +"@keyframes dpburst{0%{transform:scale(.6)}55%{transform:scale(1.35)}100%{transform:scale(1)}}"
    +".dp-reward{margin:10px auto 0;max-width:320px;padding:12px;border:3px solid #9aa0a6;background:#0d0d0d;text-align:center;animation:dpburst .5s ease-out}"
    +".dp-reward .dp-rlabel{font:bold 12px monospace;letter-spacing:3px;margin-bottom:6px}"
    +".dp-reward .dp-rxp{font:bold 34px monospace;color:#f5ead6}"
    +".dp-reward .dp-rname{font:13px monospace;color:#c9bfa8;margin-top:4px}"
    +".dp-flame{font-size:64px;line-height:1;filter:drop-shadow(0 0 14px #ff6a00)}"
    +".dp-streakn{font:bold 44px monospace;color:#f5ead6}"
    +".dp-risk{margin:10px 0;padding:10px;border:2px solid #ff3b30;background:#2a0d0d;color:#ffb3ab;font:bold 13px monospace;letter-spacing:1px}"
    +".dp-barwrap{height:10px;background:#2a1414;border:1px solid #5a1a1a;margin:8px 0}"
    +".dp-bar{height:100%;background:linear-gradient(90deg,#c1121f,#e8b10c);transition:width .4s}"
    +".dp-flash{margin:8px 0;padding:10px;border:1px solid #e8b10c;background:#1c1408}"
    +".dp-mult{display:inline-block;background:#e8b10c;color:#000;font:bold 12px monospace;padding:2px 8px;margin-right:8px}"
    +".dp-count{font:bold 16px monospace;color:#e8b10c;letter-spacing:2px}"
    +".dp-combo{font:bold 52px monospace;color:#f5ead6;text-shadow:0 0 16px #c1121f}"
    +".dp-trophy{font-size:30px;margin-right:10px}"
    +".dp-rec{display:flex;align-items:center;margin:6px 0;font:14px monospace;color:#c9bfa8}"
    +".dp-rankbig{font:bold 30px monospace;color:#f5ead6}"
    +".dp-gap{font:14px monospace;color:#e8b10c}"
    +".dp-overlay{position:fixed;inset:0;z-index:100000;background:rgba(8,2,2,.94);display:flex;align-items:center;justify-content:center;text-align:center}"
    +".dp-lvlup h1{font:bold 22px monospace;letter-spacing:6px;color:#e8b10c;margin:0 0 10px}"
    +".dp-lvlup .dp-rankname{font:bold 64px monospace;color:#f5ead6;text-shadow:0 0 30px #c1121f;margin:10px 0;animation:dpburst .6s ease-out}"
    +".dp-lvlup .dp-sub{font:14px monospace;color:#c9bfa8;margin-bottom:18px}"
    +".dp-lucky{position:fixed;top:14%;left:50%;transform:translateX(-50%);z-index:100001;background:#0d2a0d;border:3px solid #4caf50;color:#d6f5d6;font:bold 16px monospace;letter-spacing:1px;padding:14px 26px;animation:dpburst .4s ease-out;box-shadow:0 0 30px #4caf50}"
    +".dp-comeback{position:fixed;top:0;left:0;right:0;z-index:99998;background:#c1121f;color:#fff;font:bold 14px monospace;padding:10px;text-align:center;border-bottom:2px solid #fff}"
    +".dp-comeback button{margin-left:12px;background:#fff;color:#c1121f;border:none;font:bold 13px monospace;padding:6px 16px;cursor:pointer}"
    +"@media (prefers-reduced-motion: reduce){.dp-shake,.dp-burst,.dp-reward,.dp-lucky{animation:none!important}}";
  document.head.appendChild(s);
}
var RARITY={
  common:{c:"#9aa0a6",label:"COMMON"},
  rare:{c:"#4da3ff",label:"RARE"},
  epic:{c:"#b45cff",label:"EPIC"},
  legendary:{c:"#e8b10c",label:"LEGENDARY"}
};
var MILESTONES=[7,14,30,60,100];
var ST=null, CB=null, WARM=false, WW=null;
/* A8 Podcast Listener Bounties: WW carries the warword_status read —
   {ok, active, episode, xp_amount, claimed}. The word itself never arrives. */
/* ---- combo meter (session-local) ---- */
function comboGet(){
  try{
    var c=JSON.parse(localStorage.getItem("pf_combo_v1")||'{"n":0,"ts":0}');
    if(Date.now()-(c.ts||0)>30*60*1000) c={n:0,ts:Date.now()};
    return c;
  }catch(e){ return {n:0,ts:Date.now()}; }
}
function comboMult(n){ return 1+Math.min(8,Math.floor(n/3))*0.25; }
function comboHit(){
  var c=comboGet(); c.n=(c.n||0)+1; c.ts=Date.now();
  try{ localStorage.setItem("pf_combo_v1",JSON.stringify(c)); }catch(e){}
  /* 2026-10-03 H7: feed the SERVER combo too. The backend consumes it on the
     next positive xpGrant (up to +300 XP bonus) — the local meter was the
     only half. Fire-and-forget, auth-attached. */
  try{
    var id=ident();
    if(id.callsign&&BACKEND) post("combo","co_action","combo_hit",{callsign:id.callsign,device:id.device},function(){});
  }catch(e){}
  refreshServerCombo();
  renderCombo();
}
/* Server combo status (combo_status GET, public): shows the armed multiplier
   the next XP grant will consume. Throttled to 60s. */
var SRV_COMBO=null, SRV_COMBO_AT=0, SRV_COMBO_ERR=null;
function refreshServerCombo(){
  try{
    var id=ident();
    if(!id.callsign||!BACKEND) return;
    if(Date.now()-SRV_COMBO_AT<60000) return;
    SRV_COMBO_AT=Date.now();
    api("combo_status",{callsign:id.callsign},function(j){
      SRV_COMBO=(j&&j.ok)?j:null; SRV_COMBO_ERR=(j&&!j.ok)?j:null; renderCombo();
    });
  }catch(e){}
}
function load(){
  var id=ident(), n=0, done=false;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  var p={callsign:id.callsign,device:id.device};
  api("dopamine_status",p,function(j){
    if(j&&j.ok){ ST=j; checkStreakMilestone(j); } else { WARM=true; }
    one();
  });
  /* A8: war-word live/claimed state (public read — the word never leaves the
     server). Fails silent: the bounty pane degrades to a standby note. */
  api("warword_status",{device:id.device},function(j){
    if(j&&j.ok){ WW=j; } else { WW=null; }
    one();
  });
  refreshServerCombo();
}
/* Streak milestones (7/14/30/60/100) trigger the level-up celebration overlay.
   Celebrates once per milestone per callsign — tracked in localStorage. */
function checkStreakMilestone(j){
  try{
    var count=Number((j&&j.streak&&j.streak.count)||0);
    if(!count) return;
    var seen={};
    try{ seen=JSON.parse(localStorage.getItem("pf_streak_ms_v1")||"{}"); }catch(e){}
    for(var i=0;i<MILESTONES.length;i++){
      var m=MILESTONES[i];
      if(count>=m&&!seen["m"+m]){
        seen["m"+m]=1;
        try{ localStorage.setItem("pf_streak_ms_v1",JSON.stringify(seen)); }catch(e2){}
        levelUpOverlay(m+"-DAY STREAK");
        break;
      }
    }
  }catch(e){}
}
/* GAP AUDIT v2 U1 (2026-10-03): levelUpOverlay() was CALLED above but never
   DEFINED — the ReferenceError died inside the try/catch while the milestone
   was already marked "seen", so streak celebrations silently never fired and
   never retried. Now defined: a full-screen celebration using the
   .dp-overlay/.dp-lvlup styles already shipped in dpCss(). Dismiss via the
   button, clicking the backdrop, or Escape; auto-dismisses after 30s so the
   overlay can never strand the page. */
function levelUpOverlay(title){
  try{
    ovCss();
    var old=document.getElementById("dpLvlOv");
    if(old&&old.parentNode) old.parentNode.removeChild(old);
    var label=String(title||"STREAK MILESTONE");
    var d=document.createElement("div");
    d.id="dpLvlOv"; d.className="dp-overlay dp-lvlup";
    d.setAttribute("role","dialog"); d.setAttribute("aria-label","Streak milestone");
    d.innerHTML='<div><h1>&#9733; STREAK MILESTONE &#9733;</h1>'
      +'<div class="dp-rankname">'+esc(label)+'</div>'
      +'<div class="dp-sub">The streak holds. The machine notices.<br>Keep the fire lit.</div>'
      +'<button id="dpLvlBtn" class="c-btn">KEEP FIGHTING</button></div>';
    document.body.appendChild(d);
    try{ if(window.PF&&PF.dope&&PF.dope.confetti){ PF.dope.confetti(d,40); } }catch(e){}
    var done=false;
    function onKey(e){ if(e&&(e.key==="Escape"||e.keyCode===27)) close(); }
    function close(){
      if(done) return; done=true;
      try{ document.removeEventListener("keydown",onKey); }catch(e2){}
      try{ if(d.parentNode) d.parentNode.removeChild(d); }catch(e3){}
    }
    document.addEventListener("keydown",onKey);
    d.addEventListener("click",function(e){ if(e.target===d) close(); });
    var b=document.getElementById("dpLvlBtn");
    if(b){ b.onclick=close; try{ b.focus(); }catch(e4){} }
    setTimeout(close,30000);
  }catch(e5){ try{ toast("Streak milestone hit: "+String(title||"")+"."); }catch(e6){} }
}
function fmtLeft(ms){
  ms=Math.max(0,ms);
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
  function p2(x){ return (x<10?"0":"")+x; }
  return p2(h)+":"+p2(m)+":"+p2(ss);
}
function render(){
  var el=document.getElementById("xDopa"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    /* 2026-10-05 Phase 3 #9: anonymous dopa teaser. Anonymous visitors get a
       real glimpse of today's fire — public flash_list + warword_status are
       anonymous-safe — plus an honest mechanic preview and a one-tap callsign
       claim CTA, instead of the dead gate card. When there is no anonymous-
       safe data to show, the panes describe the mechanic honestly; they never
       promise loot the visitor can't claim. Kill switch: ?pf_off=dopa
       (silo-wide via PF.skip, above). */
    dpCss();
    renderTeaser(el);
    return;
  }
  if(WARM||!ST){
    el.innerHTML='<div class="x-pane"><h4>The forge is warming up</h4>'
      +'<div class="x-note">Loot crates, streak shields and flash events are being wired into the backend. Your fire is safe &mdash; check back soon.</div></div>'
      +'<div class="x-pane"><h4>Session combo</h4><div id="dpComboBox"></div></div>';
    renderCombo();
    return;
  }
  h+=renderLoot();
  h+=renderStreak();
  h+=renderFlash();
  h+=renderWarWord();
  h+='<div class="x-pane"><h4>Session combo</h4><div id="dpComboBox"></div></div>';
  h+=renderRecords();
  h+=renderNearRank();
  el.innerHTML=h;
  wire();
  renderCombo();
  fillLootHistory();
  fillFlashHistory();
}
function renderLoot(){
  var loot=(ST&&ST.loot)||{}, claimed=!!loot.claimed_today;
  var h='<div class="x-pane dp-pane"><h4>Supply crate</h4><div class="dp-cratewrap">';
  h+='<div class="dp-crate" id="dpCrate">&#128230;</div>';
  h+='<div id="dpRewardSlot"></div>';
  if(claimed){
    h+='<div class="x-note">Crate claimed. Next drop '+(loot.next_reset_in?esc(loot.next_reset_in):"tomorrow")+'.</div>';
  } else {
    h+='<div style="margin-top:10px"><button class="c-btn" id="dpOpenBtn">OPEN THE CRATE</button></div>'
      +'<div class="x-note">One free crate a day. Rarity decides the payload.</div>'
      +'<div class="c-err" id="dpLootErr"></div>';
  }
  /* 2026-10-03: loot_history (AUTH) — what the crate paid out before. */
  h+='<div id="dpLootHist"><div class="x-note">Reading crate history&hellip;</div></div>';
  h+='</div></div>';
  return h;
}
/* Loot history fill (loot_history, AUTH read). Called after every render. */
function fillLootHistory(){
  var box=document.getElementById("dpLootHist"); if(!box) return;
  var id=ident(); if(!id.callsign){ box.innerHTML=""; return; }
  api("loot_history",{callsign:id.callsign,device:id.device},function(j){
    if(!document.getElementById("dpLootHist")) return;
    var hist=(j&&j.ok&&j.history)||[];
    if(!hist.length){ box.innerHTML='<div class="x-note">No crate history yet. Open your first crate.</div>'; return; }
    var hh='<div class="x-note" style="margin-top:8px"><b>RECENT PULLS:</b></div>';
    for(var i=0;i<Math.min(hist.length,5);i++){
      var e=hist[i], rk=RARITY[e.rarity]||RARITY.common;
      var dt=""; try{ dt=new Date(Number(e.ts)).toLocaleDateString(); }catch(e2){}
      hh+='<div class="x-note">['+esc(rk.label)+'] '+esc(e.type||"pull")+' +'+Number(e.amount||0)+' XP'+(dt?" — "+esc(dt):"")+'</div>';
    }
    box.innerHTML=hh;
  });
}
function renderStreak(){
  var sk=(ST&&ST.streak)||{}, count=Number(sk.count)||0, longest=Number(sk.longest)||count;
  var h='<div class="x-pane dp-pane"><h4>Detonation streak</h4><div style="text-align:center">';
  h+='<div class="dp-flame">&#128293;</div>';
  h+='<div class="dp-streakn">'+count+' DAY'+(count===1?"":"S")+'</div>';
  if(sk.at_risk&&sk.risk_ends_at){
    h+='<div class="dp-risk">&#9888; STREAK AT RISK &mdash; dies in <span class="dp-count" data-until="'+Number(sk.risk_ends_at)+'">--:--:--</span><br>Check in or buy a freeze.</div>';
  }
  if(sk.broken_recent){
    h+='<div class="dp-risk">STREAK BROKEN &mdash; repair window closing. 250 XP to relight it.</div>';
  }
  var next=null;
  for(var i=0;i<MILESTONES.length;i++){ if(count<MILESTONES[i]){ next=MILESTONES[i]; break; } }
  var prev=0;
  for(var j=MILESTONES.length-1;j>=0;j--){ if(count>=MILESTONES[j]){ prev=MILESTONES[j]; break; } }
  var target=next||100, pct=Math.min(100,Math.round((count-prev)/Math.max(1,target-prev)*100));
  h+='<div class="dp-barwrap"><div class="dp-bar" style="width:'+pct+'%"></div></div>';
  h+='<div class="x-note">'+(next?count+" / "+next+" days to the next milestone":"MAXIMUM STREAK. You are the fire.")+' &bull; longest: '+longest+'</div>';
  h+='<div style="margin-top:8px">'
    /* 2026-10-03: streak_checkin (AUTH) — the plain daily check-in was never
       wired; only freeze/repair had buttons. */
    +'<button class="c-btn" id="dpCheckinBtn">CHECK IN</button> '
    +'<button class="c-btn" id="dpFreezeBtn">BUY FREEZE &mdash; 100 XP</button> ';
  if(sk.broken_recent){ h+='<button class="c-btn" id="dpRepairBtn">REPAIR &mdash; 250 XP</button>'; }
  h+='</div><div class="c-err" id="dpStreakErr"></div>';
  h+='</div></div>';
  return h;
}
function renderFlash(){
  var fl=(ST&&ST.flash)||[];
  var h='<div class="x-pane dp-pane"><h4>Flash events</h4>';
  if(!fl.length){
    h+='<div class="x-note">No flash events live. When one drops, the clock starts ticking.</div>';
  }
  for(var i=0;i<fl.length;i++){
    var f=fl[i], mult=Number(f.multiplier)||2;
    h+='<div class="dp-flash"><span class="dp-mult">'+mult+'X XP</span>'
      +'<b>'+esc(f.label||"Flash event")+'</b><br>'
      +'<span class="dp-count" data-until="'+Number(f.ends_at)+'">--:--:--</span> remaining</div>';
  }
  /* 2026-10-04 flash history strip (flash_list, public GET) — recent/past
     flash events, newest first. Filled by fillFlashHistory() after render. */
  h+='<div id="dpFlashHist"><div class="x-note">Reading flash history&hellip;</div></div>';
  h+='</div>';
  return h;
}
/* Flash history fill (flash_list, public read). Called after every render.
   Mirrors fillLootHistory(): public JSONP, newest-first, past events only. */
function fillFlashHistory(){
  var box=document.getElementById("dpFlashHist"); if(!box) return;
  api("flash_list",{},function(j){
    if(!document.getElementById("dpFlashHist")) return;
    var ev=(j&&j.ok&&j.events)||[];
    var past=ev.filter(function(e){ return !e.active; });
    if(!past.length){ box.innerHTML='<div class="x-note">No past flash events yet. The next one will burn bright.</div>'; return; }
    var hh='<div class="x-note" style="margin-top:8px"><b>RECENT FLASHES:</b></div>';
    for(var i=0;i<Math.min(past.length,6);i++){
      var e=past[i], mult=Number(e.multiplier)||1, dt="";
      try{ dt=new Date(Number(e.ends_at)).toLocaleDateString(); }catch(e2){}
      hh+='<div class="x-note">&#128293; <span class="dp-mult">'+mult+'X</span>'
        +esc(e.title||"Flash event")+(dt?' <span class="x-note">&mdash; burned out '+esc(dt)+'</span>':"")+'</div>';
    }
    box.innerHTML=hh;
  });
}
/* ---- anonymous teaser (2026-10-05 Phase 3 #9) ----
   Shown when there is no callsign. Panes reuse the dopa visual language
   (.dp-pane, .dp-crate, .dp-flash, .dp-mult, .dp-count, .dp-flame) so this
   reads as the same widget, unlocked. All data is anonymous-safe:
   flash_list and warword_status are public reads. The crate pane describes
   the mechanic honestly — never a fake "today's pull". The CTA reuses the
   site-wide in-place claim flow (data-pf-claim-cs -> PF.requireCallsign). */
function renderTeaser(el){
  var h='<div class="x-pane dp-pane"><h4>TODAY&rsquo;S CRATE</h4><div class="dp-cratewrap">'
    +'<div class="dp-crate">&#128230;</div>'
    +'<div class="x-note">One free supply crate every day. Pulls pay XP &mdash; Common to Legendary.<br>Yours is sitting there, locked.</div>'
    +'<div style="margin-top:10px"><button class="c-btn" data-pf-claim-cs="1" data-pf-claim-ctx="to open today&rsquo;s crate">CLAIM YOUR CALLSIGN TO OPEN TODAY&rsquo;S CRATE</button></div>'
    +'</div></div>'
    +'<div class="x-pane dp-pane"><h4>FLASH EVENTS</h4><div id="dpTeaseFlash"><div class="x-note">Reading the wire&hellip;</div></div></div>'
    +'<div class="x-pane dp-pane"><h4>WAR-WORD BOUNTY</h4><div id="dpTeaseWW"><div class="x-note">Reading the wire&hellip;</div></div></div>'
    +'<div class="x-pane dp-pane"><h4>DETONATION STREAK</h4><div style="text-align:center">'
    +'<div class="dp-flame">&#128293;</div>'
    +'<div class="x-note">Check in daily. Buy a freeze to skip a day without dying.<br>Milestones at 7, 14, 30, 60 and 100 days.</div>'
    +'</div></div>';
  el.innerHTML=h;
  fillTeaserFlash();
  fillTeaserWarWord();
}
/* Teaser flash fill (flash_list, public). Active events render with the same
   .dp-flash row the enlisted view uses; the global tick() drives the
   [data-until] countdowns automatically. No active events = an honest
   "quiet right now" note, not an empty room. */
function fillTeaserFlash(){
  var box=document.getElementById("dpTeaseFlash"); if(!box) return;
  api("flash_list",{},function(j){
    if(!document.getElementById("dpTeaseFlash")) return;
    var ev=(j&&j.ok&&j.events)||[];
    var live=ev.filter(function(e){ return e.active; });
    if(live.length){
      var hh="";
      for(var i=0;i<live.length;i++){
        var f=live[i], mult=Number(f.multiplier)||2;
        hh+='<div class="dp-flash"><span class="dp-mult">'+mult+'X XP</span>'
          +'<b>'+esc(f.label||f.title||"Flash event")+'</b><br>'
          +'<span class="dp-count" data-until="'+Number(f.ends_at)+'">--:--:--</span> remaining</div>';
      }
      box.innerHTML=hh+'<div class="x-note">Live right now. Enlisted soldiers are cashing in.</div>';
    } else {
      box.innerHTML='<div class="x-note">No flash event live right now. They drop without warning &mdash; enlist and you&rsquo;re in the second one lands.</div>';
    }
  });
}
/* Teaser war-word fill (warword_status, public with device id only). Never
   shows a redeem box — redeeming needs a callsign. When no word is live,
   the pane routes to the podcast so the visitor arrives armed. */
function fillTeaserWarWord(){
  var box=document.getElementById("dpTeaseWW"); if(!box) return;
  var id=ident();
  api("warword_status",{device:id.device},function(j){
    if(!document.getElementById("dpTeaseWW")) return;
    if(j&&j.ok&&j.active){
      box.innerHTML='<div class="x-note">BOUNTY LIVE: <b>+'+Number(j.xp_amount||25)+' XP</b> for the spoken war-word'
        +(j.episode?' in <b>'+esc(j.episode)+'</b>':'')
        +'. Hear it in the episode, enlist, take the bounty.<br>'
        +'<a href="'+WW_PODCAST+'" target="_blank" rel="noopener">LISTEN TO THE PODCAST</a></div>';
    } else {
      box.innerHTML='<div class="x-note">The bounty wire is quiet right now. Every episode hides a spoken war-word worth XP &mdash; <a href="'+WW_PODCAST+'" target="_blank" rel="noopener">LISTEN TO THE PODCAST</a> so you&rsquo;re ready.</div>';
    }
  });
}
/* A8 Podcast Listener Bounties — spoken war-word per episode, redeemed here
   for a small XP bounty. The word is spoken in the episode and compared
   server-side; this widget never fetches it. Placement: the Daily Fire hub
   (homepage) — where a podcast listener landing on the site stokes the fire.
   KILL: ?pf_off=dopa (whole silo). */
var WW_PODCAST='https://rss.com/podcasts/the-propaganda-factory';
function renderWarWord(){
  var h='<div class="x-pane dp-pane"><h4>War-word bounty</h4>';
  h+='<div class="x-note">Every episode of the podcast hides a spoken war-word. '
    +'Hear it, type it below, take the bounty. '
    +'<a href="'+WW_PODCAST+'" target="_blank" rel="noopener">LISTEN TO THE PODCAST</a></div>';
  var ww=WW;
  if(!ww){
    h+='<div class="x-note">The bounty wire is quiet right now — check back after the next episode drops.</div>';
  } else if(!ww.active){
    h+='<div class="x-note">No war-word live right now. Listen to the latest episode so you are ready when the next one drops.</div>';
  } else if(ww.claimed){
    h+='<div class="x-note">Bounty claimed'+(ww.episode?' for <b>'+esc(ww.episode)+'</b>':'')
      +'. One per device per word — the next word drops with the next episode.</div>';
  } else {
    h+='<div style="margin-top:10px">'
      +'<input aria-label="Spoken war-word" id="dpWarWordInput" class="c-input" '
      +'placeholder="Type the spoken war-word" autocapitalize="none" autocomplete="off" spellcheck="false" '
      +'style="max-width:280px;margin-right:8px">'
      +'<button class="c-btn" id="dpWarWordBtn">REDEEM BOUNTY</button>'
      +'<div class="c-err" id="dpWarWordErr"></div></div>'
      +'<div class="x-note">Bounty: <b>'+Number(ww.xp_amount||25)+' XP</b>'
      +(ww.episode?' — live for <b>'+esc(ww.episode)+'</b>':'')
      +'. One claim per device. The wire resets with each new word.</div>';
  }
  h+='</div>';
  return h;
}
function renderCombo(){
  var box=document.getElementById("dpComboBox"); if(!box) return;
  var c=comboGet(), m=comboMult(c.n);
  box.innerHTML='<div class="dp-combo">x'+m.toFixed(2)+'</div>'
    +'<div class="x-note">'+(c.n||0)+' chained actions this session. Every 3 actions raises the multiplier (cap x3.00).</div>'
    +((SRV_COMBO&&Number(SRV_COMBO.multiplier)>1)
      ?'<div class="x-note" style="color:#e8b10c"><b>WAR COMBO ARMED x'+Number(SRV_COMBO.multiplier)+'</b> — your next XP grant hits harder ('+(Number(SRV_COMBO.combo_count)||0)+' backend actions banked).</div>'
      :(SRV_COMBO_ERR?dpAuthHint(SRV_COMBO_ERR):''));
}
function renderRecords(){
  var rc=(ST&&ST.records)||{};
  if(!rc.best_day_xp&&!rc.longest_streak) return "";
  var h='<div class="x-pane dp-pane"><h4>Personal records</h4>';
  if(rc.best_day_xp){ h+='<div class="dp-rec"><span class="dp-trophy">&#127942;</span><span>Best day: <b>'+Number(rc.best_day_xp)+' XP</b></span></div>'; }
  if(rc.longest_streak){ h+='<div class="dp-rec"><span class="dp-trophy">&#128293;</span><span>Longest streak: <b>'+Number(rc.longest_streak)+' days</b></span></div>'; }
  h+='</div>';
  return h;
}
function renderNearRank(){
  var nr=(ST&&ST.nearrank)||{};
  if(!nr.position) return "";
  var h='<div class="x-pane dp-pane"><h4>The hunt</h4><div style="text-align:center">';
  h+='<div class="dp-rankbig">YOU ARE #'+Number(nr.position)+'</div>';
  if(nr.above&&nr.above.callsign){
    h+='<div class="dp-gap">'+Number(nr.above.xp_gap||0)+' XP behind #'+(Number(nr.position)-1)+' '+esc(String(nr.above.callsign).toUpperCase())+'</div>';
  }
  if(nr.below&&nr.below.callsign){
    h+='<div class="x-note">#'+(Number(nr.position)+1)+' '+esc(String(nr.below.callsign).toUpperCase())+' is '+Number(nr.below.xp_gap||0)+' XP behind YOU. Don&rsquo;t get caught.</div>';
  }
  h+='</div></div>';
  return h;
}
function wire(){
  var id=ident();
  var ob=document.getElementById("dpOpenBtn");
  if(ob){ ob.onclick=function(){
    var err=document.getElementById("dpLootErr");
    var crate=document.getElementById("dpCrate");
    ob.disabled=true; ob.textContent="CRACKING IT OPEN...";
    if(crate){ crate.classList.remove("dp-burst"); crate.classList.add("dp-shake"); }
    post("loot","l_action","loot_open",{callsign:id.callsign,device:id.device},function(j){
      if(crate){ crate.classList.remove("dp-shake"); }
      if(j&&j.ok&&j.reward){
        var r=j.reward, rk=RARITY[r.rarity]||RARITY.common;
        var slot=document.getElementById("dpRewardSlot");
        if(slot){
          slot.innerHTML='<div class="dp-reward" style="border-color:'+rk.c+'">'
            +'<div class="dp-rlabel" style="color:'+rk.c+'">'+rk.label+'</div>'
            +'<div class="dp-rxp">+'+Number(r.xp||0)+' XP</div>'
            +'<div class="dp-rname">'+esc(r.label||"Supply drop")+'</div>'
            +(((r.rarity==="epic")||(r.rarity==="legendary"))
              ?'<div style="margin-top:10px"><button class="c-btn" id="dpSharePull">SHARE YOUR PULL</button></div>':"")
            +'</div>';
          /* Epic/legendary pulls get a share prompt — dopamine peak meets social outlet. */
          var spb=document.getElementById("dpSharePull");
          if(spb){ (function(rw,rkk){ spb.onclick=function(){ shareLoot(rw,rkk); }; })(r,rk); }
        }
        if(crate){ crate.classList.add("dp-burst"); }
        try{ if(window.PF&&PF.dope){ PF.dope.confetti(document.getElementById("pf-dopa"),40); PF.dope.xpFloat(document.getElementById("pf-dopa"),"+"+Number(r.xp||0)+" XP"); } }catch(e){}
        ob.textContent="CLAIMED"; comboHit();
        try{ document.dispatchEvent(new CustomEvent("pf-combo-hit")); }catch(e2){}
      } else {
        ob.disabled=false; ob.textContent="OPEN THE CRATE";
        if(err) err.textContent=PF.errCopy(j,"The crate jammed. Try again.");
      }
    });
  }; }
  var fb=document.getElementById("dpFreezeBtn");
  if(fb){ fb.onclick=function(){
    if(!confirm("Spend 100 XP on a streak freeze? It saves your streak if you miss a day.")) return;
    var err=document.getElementById("dpStreakErr"); fb.disabled=true;
    post("streak","str_action","streak_freeze_buy",{callsign:id.callsign,device:id.device},function(j){
      fb.disabled=false;
      if(j&&j.ok){ toast("Streak frozen. Sleep easy, soldier."); comboHit(); load(); }
      else if(err) err.textContent=PF.errCopy(j,"Freeze failed.");
    });
  }; }
  /* 2026-10-03: plain daily check-in (streak_checkin, AUTH). */
  var cib=document.getElementById("dpCheckinBtn");
  if(cib){ cib.onclick=function(){
    var err=document.getElementById("dpStreakErr");
    cib.disabled=true; cib.textContent="CHECKING IN\u2026";
    post("streak","str_action","streak_checkin",{callsign:id.callsign,device:id.device},function(j){
      cib.disabled=false; cib.textContent="CHECK IN";
      if(j&&j.ok){
        toast(j.dup?("Already checked in — day "+(Number(j.count)||"")+" holds."):("Checked in. Day "+(Number(j.count)||"")+" of the fire."));
        comboHit(); load();
      }
      else if(err) err.textContent=PF.errCopy(j,"Check-in failed.");
    });
  }; }
  var rb=document.getElementById("dpRepairBtn");
  if(rb){ rb.onclick=function(){
    if(!confirm("Spend 250 XP to relight your broken streak?")) return;
    var err=document.getElementById("dpStreakErr"); rb.disabled=true;
    post("streak","str_action","streak_repair",{callsign:id.callsign,device:id.device},function(j){
      rb.disabled=false;
      if(j&&j.ok){ toast("Streak relit. Don't let it die twice."); comboHit(); load(); }
      else if(err) err.textContent=PF.errCopy(j,"Repair failed.");
    });
  }; }
  /* A8 Podcast Listener Bounties: redeem the spoken war-word. One claim per
     device per word (backend-enforced); the word is compared server-side. */
  var wwb=document.getElementById("dpWarWordBtn");
  if(wwb){ wwb.onclick=function(){
    var err=document.getElementById("dpWarWordErr");
    var inp=document.getElementById("dpWarWordInput");
    var word=inp?inp.value:"";
    if(!word||!word.trim()){ if(err) err.textContent="Type the word you heard in the episode."; return; }
    wwb.disabled=true; wwb.textContent="CHECKING THE WIRE...";
    post("warword","w_action","warword_redeem",{callsign:id.callsign,device:id.device,word:word},function(j){
      wwb.disabled=false; wwb.textContent="REDEEM BOUNTY";
      if(j&&j.ok){
        var gained=Number(j.xp||0);
        toast("BOUNTY SECURED. +"+gained+" XP"+(j.lucky?" — LUCKY hit":"")+".");
        try{ if(window.PF&&PF.dope){ PF.dope.confetti(document.getElementById("pf-dopa"),40); PF.dope.xpFloat(document.getElementById("pf-dopa"),"+"+gained+" XP"); } }catch(e){}
        comboHit();
        try{ document.dispatchEvent(new CustomEvent("pf-combo-hit")); }catch(e2){}
        load();
      } else if(err) {
        err.textContent=warWordErr(j);
      }
    });
  }; }
}
/* Friendly copy for war-word rejections — the backend word is never shown,
   so wrong guesses get a nudge back to the episode. */
function warWordErr(j){
  var e=String((j&&j.err)||"");
  if(e==="wrong word") return "That word does not open anything. Listen close and try again.";
  if(e==="already claimed") return "Already claimed. One bounty per device per word.";
  if(e==="no war-word live") return "No war-word is live right now — it drops with the next episode.";
  if(e==="daily cap reached"||j&&j.capped) return "Daily cap reached. The wire resets at midnight Chicago time — come back swinging.";
  if(e==="device required") return "Your device ID did not come through — reload and try again.";
  return PF.errCopy(j,"The wire fought back. Nothing changed — retry.");
}
/* ---- ticking countdowns ---- */
function tick(){
  var now=Date.now(), els=document.querySelectorAll("#pf-dopa [data-until]");
  for(var i=0;i<els.length;i++){
    var until=Number(els[i].getAttribute("data-until"))||0;
    els[i].textContent=fmtLeft(until-now);
  }
}
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },1000);
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },120000);
/* combo events from anywhere on the page */
try{ document.addEventListener("pf-combo-hit",function(){ comboHit(); }); }catch(e){}
try{ document.addEventListener("pf-content-shared",function(){ comboHit(); }); }catch(e){}
/* Orphan producers get a home: creation actions feed the combo meter.
   pf-alert-forge (alerts), pf-boost-given (forge), pf-campaign-act/pledge (campaign)
   previously fired with no consumer — now they stoke the session combo. */
try{
  ["pf-alert-forge","pf-boost-given","pf-campaign-act","pf-campaign-pledge"].forEach(function(ev){
    document.addEventListener(ev,function(){ comboHit(); });
  });
}catch(e){}
load();
/* ---- global overlays (site-wide, injected once) ---- */
function ovCss(){ dpCss(); }
function luckyToast(xp,mult){
  try{
    var old=document.getElementById("dpLuckyOv");
    if(old&&old.parentNode) old.parentNode.removeChild(old);
    var d=document.createElement("div");
    d.id="dpLuckyOv"; d.className="dp-lucky";
    d.textContent="LUCKY! +"+Number(xp||0)+" XP"+(mult?"  (x"+mult+" bonus)":"");
    document.body.appendChild(d);
    try{ if(window.PF&&PF.dope){ PF.dope.confetti(d,24); } }catch(e){}
    setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },3200);
  }catch(e){}
}
if(window.PF&&!PF.dopaLucky){ PF.dopaLucky=function(xp,mult){ luckyToast(xp,mult); }; }
try{
  document.addEventListener("pf:lucky",function(e){
    var d=(e&&e.detail)||{};
    luckyToast(d.xp||0,d.mult||0);
  });
}catch(e){}
/* Loot pull share (2026-10-04 P2): the old detached-anchor download broke on
   Firefox/iOS (anchor never attached to the DOM; iOS ignores the download
   attribute) and failures were swallowed. Same robust pattern as
   core/share-image.js — Web Share with files when navigator.canShare allows,
   iOS-safe download fallbacks, real toast on failure. Credits the once-per-day
   share gate only on a completed share or download — never on cancel. */
function shareLoot(reward,rk){
  try{
    var c=document.createElement("canvas"); c.width=1080; c.height=1080;
    var g=c.getContext("2d");
    /* ---- butter: editorial kit (factgen standard) ---- */
    var btR="#c1121f", btRD="#7d0b16", btC="#f2ecdc", btG="#c9a227",
        btM="#a89a7d", btF="#6f6350";
    g.fillStyle="#0e0d0c"; g.fillRect(0,0,1080,1080);
    g.save(); g.globalAlpha=0.032; g.strokeStyle="#ffffff"; g.lineWidth=1;
    for(var btD=-1080; btD<2160; btD+=26){
      g.beginPath(); g.moveTo(btD,0); g.lineTo(btD+1080,1080); g.stroke();
    }
    g.restore();
    var btVg=g.createRadialGradient(540,432,173,540,540,918);
    btVg.addColorStop(0,"rgba(0,0,0,0)"); btVg.addColorStop(1,"rgba(0,0,0,0.55)");
    g.fillStyle=btVg; g.fillRect(0,0,1080,1080);
    var btBar=g.createLinearGradient(0,0,0,10);
    btBar.addColorStop(0,btR); btBar.addColorStop(1,btRD);
    g.fillStyle=btBar; g.fillRect(0,0,1080,10);
    g.save(); g.globalAlpha=0.05; g.fillStyle=btC;
    g.font="900 620px Arial,sans-serif"; g.textAlign="center";
    g.fillText("★",540,648); g.restore();
    /* rarity frame keeps the pull's color identity */
    g.strokeStyle=(rk&&rk.c)||"#e8b10c"; g.lineWidth=10; g.strokeRect(28,28,1024,1024);
    g.strokeStyle="rgba(242,236,220,0.25)"; g.lineWidth=2; g.strokeRect(52,52,976,976);
    g.textAlign="center";
    /* rarity label: letterspaced */
    g.fillStyle=(rk&&rk.c)||"#e8b10c"; g.font="700 44px Arial,sans-serif";
    try{ g.letterSpacing="10px"; }catch(e9){}
    g.fillText(((rk&&rk.label)||"LEGENDARY").toUpperCase()+" PULL",540,220);
    try{ g.letterSpacing="0px"; }catch(e8){}
    g.strokeStyle="rgba(201,162,39,0.5)"; g.lineWidth=1;
    g.beginPath(); g.moveTo(430,258); g.lineTo(650,258); g.stroke();
    /* reward: monumental serif */
    g.fillStyle=btC; g.font='900 84px Georgia,"Times New Roman",serif';
    var lb=String((reward&&reward.label)||"SUPPLY DROP").toUpperCase().slice(0,22);
    g.fillText(lb,540,400);
    if(reward&&reward.xp){
      /* red diamond rule */
      g.strokeStyle=btR; g.lineWidth=2;
      g.beginPath(); g.moveTo(390,470); g.lineTo(514,470); g.stroke();
      g.beginPath(); g.moveTo(566,470); g.lineTo(690,470); g.stroke();
      g.save(); g.translate(540,470); g.rotate(Math.PI/4);
      g.fillStyle=btR; g.fillRect(-8,-8,16,16); g.restore();
      /* the figure: gold gradient, drop shadow */
      g.font='900 96px Georgia,"Times New Roman",serif';
      var btFig="+"+Number(reward.xp)+" XP";
      g.fillStyle="rgba(0,0,0,0.55)";
      g.fillText(btFig,545,617);
      var btGg=g.createLinearGradient(0,520,0,610);
      btGg.addColorStop(0,"#f0d060"); btGg.addColorStop(1,"#8a6d1c");
      g.fillStyle=btGg;
      g.fillText(btFig,540,610);
    }
    var cs=""; try{ cs=String(window.PFCallsign?window.PFCallsign():"").toUpperCase(); }catch(e2){}
    g.fillStyle=btM; g.font="700 36px Arial,sans-serif";
    try{ g.letterSpacing="6px"; }catch(e7){}
    if(cs) g.fillText("PULLED BY "+cs,540,710);
    try{ g.letterSpacing="0px"; }catch(e6){}
    /* ---- butter footer: CTA standard ---- */
    var fy=830;
    g.strokeStyle="rgba(201,162,39,0.45)"; g.lineWidth=1;
    g.beginPath(); g.moveTo(140,fy); g.lineTo(940,fy); g.stroke();
    fy+=56;
    g.font="900 42px Arial,sans-serif"; g.fillStyle=btC;
    try{ g.letterSpacing="8px"; }catch(e5){}
    var btCta="JOIN THE FIGHT";
    var btCtaW=g.measureText(btCta).width;
    g.fillText(btCta,540,fy);
    g.fillStyle=btR; g.fillText(".",540+btCtaW/2-4,fy);
    try{ g.letterSpacing="0px"; }catch(e4){}
    fy+=50;
    g.fillStyle=btR; g.font="900 30px Arial,sans-serif";
    try{ g.letterSpacing="10px"; }catch(e3){}
    g.fillText("MTCSTW.COM",540,fy);
    try{ g.letterSpacing="0px"; }catch(e10){}
    var btBar2=g.createLinearGradient(0,1070,0,1080);
    btBar2.addColorStop(0,btRD); btBar2.addColorStop(1,btR);
    g.fillStyle=btBar2; g.fillRect(0,1070,1080,10);
    try{ if(window.PFShare&&window.PFShare.stampCallsign) c=window.PFShare.stampCallsign(c)||c; }catch(e2){}
    var filename="loot-pull-"+Date.now()+".png";
    /* A completed share counts as content shared (feeds the combo meter)
       and credits the once-per-day share gate. */
    function credit(){
      try{ if(window.PF&&PF.creditShare) PF.creditShare("dopa","share"); }catch(e){}
      try{ document.dispatchEvent(new CustomEvent("pf-content-shared",{detail:{kind:"loot"}})); }catch(e3){}
    }
    function dl(blob){
      var url=URL.createObjectURL(blob);
      var ios=false;
      try{ ios=/iPad|iPhone|iPod/.test(navigator.userAgent||""); }catch(e){}
      if(ios){
        /* iOS ignores the download attribute and detached anchors — open the
           image in a new tab so the user can long-press to save it. Credit
           only when the open is confirmed: a null/undefined return means the
           popup was blocked, so toast instead of crediting. */
        var win=null; try{ win=window.open(url,"_blank"); }catch(e){}
        if(win){ credit(); toast("Long-press the image — Save to Photos."); }
        else { toast("Popup blocked — allow popups, then try again."); }
        return;
      }
      try{
        var a=document.createElement("a");
        a.href=url; a.download=filename;
        document.body.appendChild(a); a.click();
        setTimeout(function(){ try{URL.revokeObjectURL(url);}catch(e){} a.remove(); },4000);
        credit();
        toast("Pull saved. Go spread the word.");
      }catch(e){ toast("Save failed \\u2014 try again."); }
    }
    function gotBlob(blob){
      if(!blob){ toast("Poster failed \\u2014 try again."); return; }
      var file=null;
      try{ file=new File([blob],filename,{type:"image/png"}); }catch(e){}
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
        var cs2=""; try{ cs2=window.PFCallsign?window.PFCallsign():""; }catch(e){}
        var txt="My supply-crate pull from The Propaganda Factory"+(cs2?" ("+cs2+")":"")+" \\u2014 https://www.mtcstw.com";
        try{
          navigator.share({files:[file],title:"Loot pull",text:txt}).then(
            function(){ credit(); toast("Shared. Go spread the word."); },
            function(err){
              if(err&&err.name==="AbortError"){ toast("Share cancelled."); }
              else dl(blob);
            });
        }catch(e){ dl(blob); }
        return;
      }
      dl(blob);
    }
    try{
      if(c.toBlob){ c.toBlob(function(b){ gotBlob(b); },"image/png"); }
      else{
        /* toBlob missing (old browsers): toDataURL -> fetch -> blob. */
        try{
          fetch(c.toDataURL("image/png")).then(function(r){ return r.blob(); })
            .then(function(b){ gotBlob(b); })
            .catch(function(){ toast("Poster failed \\u2014 try again."); });
        }catch(e){ toast("Poster failed \\u2014 try again."); }
      }
    }catch(e){ toast("Poster failed \\u2014 try again."); }
  }catch(e){ toast("Poster failed \\u2014 try again."); }
}
function comebackBanner(xp){
  ovCss();
  try{
    if(document.getElementById("dpComeback")) return;
    var d=document.createElement("div");
    d.id="dpComeback"; d.className="dp-comeback";
    d.innerHTML='WE MISSED YOU, SOLDIER. We saved '+Number(xp||50)+' XP &mdash; <button id="dpCbClaim">CLAIM</button>';
    document.body.appendChild(d);
    var b=document.getElementById("dpCbClaim");
    if(b){ b.onclick=function(){
      b.disabled=true; b.textContent="CLAIMING...";
      var id=ident();
      post("comeback","cb_action","comeback_claim",{callsign:id.callsign,device:id.device},function(j){
        if(d.parentNode) d.parentNode.removeChild(d);
        if(j&&j.ok){
          var got=Number(j.xp||xp||50);
          toast("Welcome back. +"+got+" XP."); comboHit();
          /* R11 (Wave 6B, 2026-10-04): post-comeback_claim routing — the
             reactivated user gets a WAR PLAN card, not a dead homepage top. */
          warplanCard();
          /* 2026-10-03: comeback:record_check (AUTH) — check the day's haul
             against the personal best right in the comeback flow. */
          try{
            post("comeback","cb_action","record_check",{callsign:id.callsign,device:id.device,day_xp:got},function(rj){
              if(rj&&rj.ok&&rj.is_record){ toast("NEW PERSONAL RECORD: "+got+" XP in a day."); }
            });
          }catch(e){}
        }
      });
    }; }
  }catch(e){}
}
/* R11 (Wave 6B): YOUR WAR PLAN FOR TODAY card — dismissible, deep-links to
   the briefing's war-plan section (/#pf-warplan). Zero XP: pure routing. */
function warplanCard(){
  try{
    if(document.getElementById("dpWarplan")) return;
    var d=document.createElement("div");
    d.id="dpWarplan";
    d.style.cssText="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99995;background:#0a0a0a;border:2px solid #c1121f;color:#f5ead6;font:bold 14px Arial,sans-serif;padding:14px 18px;max-width:92vw;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.6)";
    d.innerHTML='<div style="font-size:11px;letter-spacing:2px;color:#e5383b;margin-bottom:6px">WELCOME BACK, SOLDIER</div>'
      +'<a href="/#pf-warplan" style="color:#f5ead6;text-decoration:none;font-size:16px;letter-spacing:1px">YOUR WAR PLAN FOR TODAY \u2192</a>'
      +'<button id="dpWarplanX" aria-label="Dismiss" style="margin-left:12px;background:none;border:1px solid #666;color:#999;padding:2px 8px;cursor:pointer;font-size:12px">\u2715</button>';
    document.body.appendChild(d);
    document.getElementById("dpWarplanX").onclick=function(){ try{ d.parentNode.removeChild(d); }catch(e){} };
    setTimeout(function(){ try{ if(d.parentNode) d.parentNode.removeChild(d); }catch(e){} },30000);
  }catch(e){}
}
/* comeback check runs site-wide on homepage load */
(function(){
  var id=ident(); if(!id.callsign) return;
  api("comeback_check",{callsign:id.callsign,device:id.device},function(j){
    if(j&&j.ok&&j.eligible){ comebackBanner(j.xp||50); }
  });
})();
})();
</scr`+`ipt>
</div>
</template>`);
})();
