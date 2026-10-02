/* games/daily-orders.js  |  PF v1.4.1 | Daily Orders widget: template + 30 rotating missions
   KILL: ?pf_off=daily-orders  or  localStorage pf_disabled_v1='["daily-orders"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("daily-orders")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-orders">
<div class="fe-block pf-override-block" id="pf-orders">

<h2>Daily Orders</h2>
<div class="o-date" id="oDate"></div>
<div class="o-dispatch" id="oDispatch"></div>
<div class="o-meterwrap">
  
  <div class="o-meter" id="oMeter"></div>
  <div class="o-combo" id="oCombo"></div>
</div>
<div class="o-warpath" id="oWarPath"></div>
<div class="o-reset" id="oReset"></div>
<div id="oMissions"></div>
<div class="o-boost" id="oBoost"></div>
<div class="o-patrons" id="oPatrons"></div>
<div class="o-prog" id="oProg"></div>
<div class="o-streak" id="oStreak"></div>
<div class="o-next" id="oNext"></div>
<div class="o-rankline" id="oRank"></div>
<div class="o-loot" id="oLoot"></div>
<div class="o-err" id="oErr"></div>
<div class="o-note">3 orders (10 XP each) + 1 field op (+5) per day. Run all three plus the op for the +5 full-deployment command bonus. Every daily task on this page caps at 50 XP a day &mdash; your cell streak gets you there faster. Streak shields forgive a missed day. Today's Boost lets you tip earned XP to a creator at 1 XP = 2 signal.</div>
<div><button class="o-shareimg" id="oShareImg">Share orders as image</button><div class="o-note" id="oShareCount"></div></div>
<div class="o-claim" id="oClaimWrap">
  <a id="oClaimToggle">Claim your rank on every device</a>
  <div class="o-claimbox" id="oClaimBox">
    <input id="oCallsign" maxlength="20" placeholder="CALLSIGN" autocomplete="off" style="text-transform:uppercase">
    <input id="oEmail" type="email" placeholder="EMAIL (OPTIONAL)" autocomplete="off">
    <br><button class="o-claimbtn" id="oClaimBtn">Claim</button>
    <div class="o-err" id="oClaimErr"></div>
  </div>
  <div class="o-who" id="oWho"></div>
</div>

<script>
(function(){
var MISSIONS=[
{t:"Like the latest post from 3 SLR creators you haven't engaged with this week."},
{t:"Share one SLR creator's post to your story or feed. Pick your favorite.",share:1},
{t:"Leave a genuine comment on a small SLR creator's latest video."},
{t:"Like 5 SLR posts in a row. Speed round."},
{t:"Comment one thoughtful question on any SLR creator's latest post."},
{t:"Share any SLR creator's post — not mutual aid, just straight propaganda. Any post works, pick a banger.",share:1},
{t:"Like and comment on the newest post from the lowest-ranked creator on the Ledger. Lift from the bottom."},
{t:"Send one SLR creator's page to a group chat. Convert the group chat.",share:1},
{t:"Quote-share an SLR post and add why it matters to you.",share:1},
{t:"Drop a brick emoji in the comments of 3 SLR posts. Mark the territory."},
{t:"Like every post from the last 7 days on one SLR creator's page. Deep like."},
{t:"Share one SLR video to a group or community you're in.",share:1},
{t:"Leave an encouraging comment on an SLR creator dealing with hate or burnout."},
{t:"Like and comment on 2 SLR creators outside your usual niche."},
{t:"Share the Liquidation Ledger and tag your #1 SLR creator.",share:1},
{t:"Comment your favorite SLR creator's catchphrase under their latest post."},
{t:"Like 3 SLR posts and reply to one commenter on each. Build the thread."},
{t:"Share an old banger from an SLR creator's archive. Deep cut.",share:1},
{t:"Comment on one SLR post with a class-first take that sharpens the argument."},
{t:"Like and share one SLR creator's announcement — a show, a stream, a drop.",share:1},
{t:"Duet or stitch one SLR creator's video with your own take.",share:1},
{t:"Comment on 3 SLR posts from creators with different propaganda scores. Spread it around."},
{t:"Share one SLR creator's post with someone who 'doesn't do politics'.",share:1},
{t:"Like the latest 5 posts from today's Propagandist of the Week."},
{t:"Leave a real comment — 3 sentences or more — on one SLR video."},
{t:"Share one SLR creator's catalog profile from this site with a friend.",share:1},
{t:"Comment on one SLR post tagging another SLR creator who'd vibe with it. Cross-pollinate."},
{t:"Like and share a post from the newest SLR recruit. Welcome them in.",share:1},
{t:"Post a screenshot of an SLR post you liked and say why it hit.",share:1},
{t:"Rest. Like one SLR post, touch grass, come back tomorrow — the streak keeps."}
];
var LOOT=["The machine sees you, agitator.","Another brick in the wall. Their wall. We're taking it apart.","Noted in the ledger. History will remember this one.","Discipline is propaganda too.","Small actions, compounded. That's the whole theory.","The algorithm didn't see it coming.","Report filed. The network grows.","You are the media now. Act like it."];
/* FIELD OPS — the lynchpin: one cross-game bonus mission per day, rotating.
   Doing the op in its home silo auto-completes it here and feeds the Do Meter. */
var FIELD_OPS=[
 {game:"fan-vote",ev:"pf-vote-cast",label:"Cast your Fan Vote ballot"},
 {game:"bracket-board",ev:"pf-bracket-ballot",label:"Call a Liquidation Bracket matchup"},
 {game:"caption-combat",ev:"pf-caption-submit",label:"Fire a caption in Caption Combat"},
 {game:"poster-forge",ev:"pf-poster-made",label:"Forge a propaganda poster"},
 {game:"slr-match-quiz",ev:"pf-quiz-done",label:"Find your SLR match"},
 {game:"creator-guess",ev:"pf-guess-done",label:"Play Guess the Creator"},
 {game:"boost-raid",ev:"pf-raid-report",label:"Report back on today's Boost Raid"},
 {game:"daily-drop",ev:"pf-drop-claimed",label:"Claim today's Daily Drop"}
];
var OP_XP=5, CMD_XP=5;
function fieldOp(){ return FIELD_OPS[dayOfYear()%FIELD_OPS.length]; }
/* economy — every daily task on the page draws from one 50 XP/day pool (PF.claimDayXp).
   3 orders x 10 + field op 5 + command bonus 5 = 45; the last 5 come from the
   satellite dailies (raid, check-in, share, guess, poster, drop, billionaire,
   interrogation). A perfect day lands exactly on 50. Cell streaks multiply
   mission XP but the pool still caps at 50 — the bonus gets you there faster. */
var PER_DAY=3, BASE_XP=10, DAILY_MAX=50;
var PLATFORMS=[["tiktok","TikTok"],["facebook","Facebook"],["instagram","Instagram"],["x","X"],["youtube","YouTube"]];
var STREAK_BONUS={3:10,7:25,30:100};
var TIERS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
var LS_O="pf_orders_v1", LS_R="pf_ranks_v1", LS_I="pf_identity_v1";
/* Single canonical backend: window.PF_BACKEND_URL (core/03-global.js). No hardcoded
   exec URLs here — the old ranks-backend deployment this once pointed at is retired. */
function beUrl(){ try{ return window.PF_BACKEND_URL||""; }catch(e){ return ""; } }

function ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function today(){ return ymd(PF.chiNow()); }
function yesterday(){ var d=PF.chiNow(); d.setDate(d.getDate()-1); return ymd(d); }
function load(k,fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch(e){ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function dayOfYear(){ var d=new Date(), s=new Date(d.getFullYear(),0,0); return Math.floor((d-s)/864e5); }
function missionSet(){ var d=dayOfYear(), out=[]; for(var i=0;i<PER_DAY;i++) out.push((d*PER_DAY+i)%MISSIONS.length); return out; }
function tierOf(xp){ var t=TIERS[0]; for(var i=0;i<TIERS.length;i++){ if(xp>=TIERS[i][1]) t=TIERS[i]; } return t; }

/* today's record, with migration from v1 shape {days:{date:true}} */
function dayRec(){
  var o=load(LS_O,{streak:0,last:"",days:{}}), t=today(), r=o.days[t];
  if(r===true) r={done:[{m:"legacy",p:null,g:0}],xp:0,bonusPaid:false};
  if(!r||!r.done) r={done:[],xp:0,bonusPaid:false};
  /* migrate old number-array format to {m,p,g} entries */
  if(r.done.length&&typeof r.done[0]==="number"){
    r.done=r.done.map(function(m,ix){ return {m:m,p:null,g:Math.min(10+5*ix,DAILY_MAX)}; });
  }
  if(typeof r.xp!=="number") r.xp=0;
  return {o:o, rec:r};
}
function saveDay(o,rec){ o.days[today()]=rec; save(LS_O,o); }

function ident(){ return load(LS_I,{});  }

  function apiPost(obj,cb){
 if(!beUrl()){ cb(null); return;}
  var fn="pfPostCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script");
  window[fn]=function(j){ try{delete window[fn];}catch(e){} if(s.parentNode) s.parentNode.removeChild(s); cb(j);};
  s.onerror=function(){ try{delete window[fn];}catch(e){} cb(null);};
  var q="?action="+encodeURIComponent(obj.action==="wall"?"etch":obj.action);
  q+="&callsign="+encodeURIComponent(obj.callsign||"");
  if(obj.email) q+="&email="+encodeURIComponent(obj.email);
  if(obj.day) q+="&day="+encodeURIComponent(obj.day);
  if(obj.mission!=null) q+="&mission="+encodeURIComponent(obj.mission);
  if(obj.platform) q+="&platform="+encodeURIComponent(obj.platform);
  if(obj.spread!=null) q+="&spread="+encodeURIComponent(obj.spread);
  if(obj.gained!=null) q+="&gained="+encodeURIComponent(obj.gained);
  q+="&callback="+fn;
  s.src=beUrl()+q;
  document.head.appendChild(s);

}
function apiGet(callsign,cb){
  if(!beUrl()){ cb(null); return; }
  var fn="pfRankCb"+Math.floor(Math.random()*1e9);
  window[fn]=function(j){ try{delete window[fn];}catch(e){} s.parentNode.removeChild(s); cb(j); };
  var s=document.createElement("script");
  s.onerror=function(){ cb(null); };
  s.src=beUrl()+"?action=get&callsign="+encodeURIComponent(callsign)+"&callback="+fn;
  document.head.appendChild(s);
}

function platLabel(p){ var f=PLATFORMS.filter(function(x){return x[0]===p;})[0]; var t=f?f[1].toUpperCase():String(p||"").toUpperCase(); return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escHtml(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* Merge cross-device Daily Orders state from the backend: union today's
   missions (never duplicates, never drops local progress), take the max
   streak, adopt the later last_day, adopt op_done. Never regresses local. */
function mergeCheckinState(j){
  if(!j||!j.ok) return;
  var r=load(LS_R,{xp:0,got:{}});
  if(typeof j.xp==="number"&&j.xp>r.xp){ r.xp=j.xp; save(LS_R,r); }
  var d=dayRec();
  if(typeof j.streak==="number"&&j.streak>(d.o.streak||0)) d.o.streak=j.streak;
  if(j.last_day&&(!d.o.last||j.last_day>d.o.last)) d.o.last=j.last_day;
  var plats=j.today_platforms||[];
  (j.today_done||[]).forEach(function(mm,ix){
    var key=String(mm);
    if(!d.rec.done.some(function(x){ return String(x.m)===key; })) d.rec.done.push({m:mm,p:plats[ix]||null,g:0});
  });
  if(j.op_done) d.rec.opDone=true;
  saveDay(d.o,d.rec);
  render();
}

function checkin(mi,platform){
  var d=dayRec(), o=d.o, rec=d.rec, t=today();
  var already=rec.done.some(function(x){ return String(x.m)===String(mi); });
  if(already) return {ok:false, err:"already"};
  platform=platform||null;
  var firstToday=rec.done.length===0;
  var reportNo=rec.done.length+1;                    /* 1,2,3 */
  /* CELL BONUS: shared cell streaks juice mission XP. +5%/streak day, cap +50%.
     The central 50/day pool (PF.claimDayXp) still holds — the bonus just gets
     you to the cap faster instead of stacking above it. */
  var cellMult=(typeof window.pfCellMult==="function")?window.pfCellMult():1;
  var want=Math.round(BASE_XP*Math.max(1,cellMult));
  var gained=0;
  try{ gained=(window.PF&&PF.claimDayXp)?PF.claimDayXp(want):Math.min(want,Math.max(0,DAILY_MAX-(rec.xp||0))); }
  catch(e){ gained=Math.min(want,Math.max(0,DAILY_MAX-(rec.xp||0))); }
  var cellBonus=(cellMult>1&&gained>BASE_XP)?gained-BASE_XP:0;
  var bonus=0, shieldUsed=false, shieldEarned=false;
  if(firstToday){
    if(o.last===yesterday()){ o.streak=(o.streak||0)+1; }
    else if(o.last&&o.last!==t&&(o.shields||0)>0){ o.shields--; shieldUsed=true; /* streak holds */ }
    else { o.streak=1; }
    o.last=t;
    /* Streak milestone bonus draws from the same 50/day pool — it gets you to
       the cap faster, never stacks above it. */
    if(STREAK_BONUS[o.streak]&&!rec.bonusPaid){ try{ bonus=(window.PF&&PF.claimDayXp)?PF.claimDayXp(STREAK_BONUS[o.streak]):STREAK_BONUS[o.streak]; }catch(e){ bonus=STREAK_BONUS[o.streak]; } rec.bonusPaid=true; }
    /* every 7th streak day forges a shield: one missed day forgiven */
    if(o.streak%7===0&&o.lastShieldAt!==o.streak){ o.shields=(o.shields||0)+1; o.lastShieldAt=o.streak; shieldEarned=true; }
  }
  rec.done.push({m:String(mi),p:platform,g:gained}); rec.xp=(rec.xp||0)+gained; saveDay(o,rec);
  /* FULL DEPLOYMENT command bonus is claimed here so it lands inside the same
     dispatched event — the tally records it exactly once, no phantom row. */
  var cmd=maybeCommandBonus();
  var r=load(LS_R,{xp:0,got:{}}), key="order_"+t+"_"+mi;
  if(r.got[key]!==t){ r.got[key]=t; r.xp+=gained+bonus; save(LS_R,r); }
  fireEvent(t,mi,reportNo,gained+bonus+cmd,o.streak,platform);
  var id=ident();
  if(id.callsign){
    apiPost({action:"checkin",callsign:id.callsign,day:t,mission:mi,platform:platform,spread:0,gained:gained+bonus+cmd},function(j){
      mergeCheckinState(j);
    });
  }
  return {ok:true, reportNo:reportNo, gained:gained, bonus:bonus, cmd:cmd, platform:platform, streak:o.streak, xp:r.xp, tier:tierOf(r.xp)[0], shieldUsed:shieldUsed, shieldEarned:shieldEarned, cellBonus:cellBonus, cellMult:cellMult};
}
function fireEvent(t,mi,reportNo,xp,streak,platform){
  try{ document.dispatchEvent(new CustomEvent("pf-order-checkin",{detail:{day:t,mission:mi,reportNo:reportNo,xp:xp,streak:streak,platform:platform||null}})); }catch(e){}
}
/* COMMAND BONUS: 3/3 missions + field op = FULL DEPLOYMENT, once per day.
   Draws from the same 50/day pool — it can clip to 0 if the pool is spent. */
function maybeCommandBonus(){
  var d=dayRec(), t=today();
  if(d.rec.done.length>=3&&d.rec.opDone&&!d.rec.cmdPaid){
    d.rec.cmdPaid=true; saveDay(d.o,d.rec);
    var r=load(LS_R,{xp:0,got:{}}), key="order_cmd_"+t, got=0;
    if(r.got[key]!==t){ r.got[key]=t; got=PF.claimDayXp(CMD_XP); r.xp+=got; save(LS_R,r); }
    return got;
  }
  return 0;
}
/* Field-op auto-complete: arm today's op event exactly once per page load. */
(function armFieldOp(){
  var opDay=today(), op=fieldOp();
  if(window._pfOpKey===opDay+op.ev) return;
  window._pfOpKey=opDay+op.ev;
  document.addEventListener(op.ev,function(){
    if(today()!==opDay) return;             /* stale listener from a past day */
    var d=dayRec();
    if(d.rec.opDone) return;                /* counted exactly once */
    d.rec.opDone=true; saveDay(d.o,d.rec);
    var r=load(LS_R,{xp:0,got:{}}), key="order_op_"+opDay, got=0;
    if(r.got[key]!==opDay){ r.got[key]=opDay; got=PF.claimDayXp(OP_XP); r.xp+=got; save(LS_R,r); }
    /* feed the Do Meter + tally exactly once, like a normal check-in —
       command bonus folded into the same event so it's counted once */
    var cmd=maybeCommandBonus();
    try{ document.dispatchEvent(new CustomEvent("pf-order-checkin",{detail:{day:opDay,mission:"field-op",reportNo:0,xp:got+cmd,streak:(d.o.streak||0),platform:null}})); }catch(e){}
    /* sync the field-op completion so other devices see op_done */
    try{ var idf=ident(); if(idf.callsign){ apiPost({action:"checkin",callsign:idf.callsign,day:opDay,mission:"field-op",spread:0,gained:got+cmd},function(j){ mergeCheckinState(j); }); } }catch(e){}
    var lootEl=document.getElementById("oLoot");
    if(lootEl) lootEl.textContent="+"+(got+cmd)+" XP — FIELD OP COMPLETE: "+op.label+". The network runs through you."+(cmd?" FULL DEPLOYMENT command bonus!":"");
    /* DOPAMINE: field-op celebration — confetti + floating XP over the orders widget. */
    try{ if(window.PF&&PF.dope){ var ob=document.getElementById("pf-orders"); PF.dope.confetti(ob,30); PF.dope.xpFloat(ob,"+"+(got+cmd)+" XP"); } }catch(e){}
    render();
  });
})();

/* ============ TODAY'S BOOST — tip earned XP to a creator, 1 XP = 2 signal ============
   One boost per day. Tipped XP leaves your rank total (it becomes the creator's
   signal) and feeds your lifetime patron record. The tip reports to the tally
   backend with xp:0 and the amount in meta, so site-wide XP is never double-counted. */
var LS_B="pf_boost_v1", LS_P="pf_patron_v1";
var BOOST_RATIO=2;
var PUMP_SIGNAL={profile:10, offsite:20, share:30};
var PUMP_LABELS={profile:"Open their catalog profile", offsite:"Follow them off-site", share:"Share the boost card"};
var TIP_PRESETS=[5,10,25];
function boostRec(){ return load(LS_B,null); }
function patronRec(){ return load(LS_P,{tipped:0,signal:0}); }
function rosterBySlug(s){ var r=PF.ROSTER||[]; for(var i=0;i<r.length;i++){ if(r[i].slug===s) return r[i]; } return null; }
function tipBoost(slug,xp){
  xp=Math.floor(Number(xp)||0);
  var entry=rosterBySlug(slug);
  if(!entry) return {ok:false,err:"Pick a creator first."};
  if(!(xp>=1)) return {ok:false,err:"Pick an XP amount."};
  var b=boostRec();
  if(b&&b.date===today()) return {ok:false,err:"Boost already deployed today — new orders at midnight."};
  var r=load(LS_R,{xp:0,got:{}});
  if(xp>r.xp) return {ok:false,err:"Not enough XP — earn it first, then tip it."};
  r.xp-=xp; save(LS_R,r);
  var signal=xp*BOOST_RATIO;
  save(LS_B,{date:today(),creator:slug,tipped:xp,signal:signal,pumps:{}});
  var p=patronRec(); p.tipped+=xp; p.signal+=signal; save(LS_P,p);
  try{ document.dispatchEvent(new CustomEvent("pf-boost-tipped",{detail:{creator:slug,tipped:xp}})); }catch(e){}
  try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:-xp,total:r.xp}})); }catch(e){}
  return {ok:true,name:entry.name,slug:slug,tipped:xp,signal:signal};
}
function pumpBoost(kind){
  var b=boostRec();
  if(!b||b.date!==today()) return {ok:false};
  if(!PUMP_SIGNAL[kind]||b.pumps[kind]) return {ok:false};
  b.pumps[kind]=1; b.signal+=PUMP_SIGNAL[kind]; save(LS_B,b);
  var p=patronRec(); p.signal+=PUMP_SIGNAL[kind]; save(LS_P,p);
  return {ok:true,signal:b.signal};
}
function apiAction(action,cb){
  if(!beUrl()){ cb(null); return; }
  var fn="pfBoostCb"+Math.floor(Math.random()*1e9);
  window[fn]=function(j){ try{delete window[fn];}catch(e){} s.parentNode.removeChild(s); cb(j); };
  var s=document.createElement("script");
  s.onerror=function(){ cb(null); };
  s.src=beUrl()+"?action="+encodeURIComponent(action)+"&callback="+fn;
  document.head.appendChild(s);
}
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function renderBoost(){
  var box=document.getElementById("oBoost"); if(!box) return;
  var b=boostRec(), t=today(), r=load(LS_R,{xp:0,got:{}});
  var h='<div class="o-bhead">\u{1F4E3} TODAY\u2019S BOOST &mdash; pump a creator with your XP</div>';
  h+='<div class="o-bsub">1 XP = '+BOOST_RATIO+' signal. One boost per day. Tipped XP leaves your rank and becomes their signal.</div>';
  if(!b||b.date!==t){
    var opts=(PF.ROSTER||[]).map(function(x){ return '<option value="'+x.slug+'">'+x.name+'</option>'; }).join("");
    h+='<div class="o-brow"><select id="oBoostSel" class="o-bsel"><option value="">\u2014 pick a creator \u2014</option>'+opts+'</select></div>';
    h+='<div class="o-brow">'+TIP_PRESETS.map(function(x){ return '<button class="o-tipbtn" data-tip="'+x+'">'+x+' XP</button>'; }).join("")+'</div>';
    h+='<button class="o-btn o-boostbtn" id="oBoostGo">DEPLOY BOOST &rarr;</button><div class="o-err" id="oBoostErr"></div>';
    h+='<div class="o-bbal">Your rank XP available: <b>'+(r.xp||0)+'</b></div>';
  } else {
    var entry=rosterBySlug(b.creator);
    h+='<div class="o-bdone">\u2713 Boost deployed: <b>'+(entry?entry.name:b.creator)+'</b> &mdash; '+b.tipped+' XP tipped &rarr; <b>'+b.signal+' signal</b> sent.</div>';
    h+='<div class="o-bsub">Pump them up for bonus signal:</div><div class="o-brow">';
    Object.keys(PUMP_SIGNAL).forEach(function(k){
      h+='<button class="o-pumpbtn'+(b.pumps[k]?' done':'')+'" data-pump="'+k+'"'+(b.pumps[k]?' disabled':'')+'>'+(b.pumps[k]?'\u2713 ':'+'+PUMP_SIGNAL[k]+' ')+PUMP_LABELS[k]+'</button>';
    });
    h+='</div><button class="o-btn o-sharebtn" id="oBoostShare">Share boost card</button>';
  }
  h+='<div class="o-crown" id="oCrown"></div>';
  box.innerHTML=h;
  var sel=document.getElementById("oBoostSel"), amt=null;
  if(sel){
    box.querySelectorAll("button.o-tipbtn").forEach(function(btn){
      btn.onclick=function(){ amt=parseInt(btn.getAttribute("data-tip"),10);
        box.querySelectorAll("button.o-tipbtn").forEach(function(x){x.classList.remove("sel");});
        btn.classList.add("sel"); };
    });
    document.getElementById("oBoostGo").onclick=function(){
      var res=tipBoost(sel.value,amt);
      var err=document.getElementById("oBoostErr");
      if(!res.ok){ if(err) err.textContent=res.err; return; }
      render(); renderBoost(); renderPatrons();
    };
  } else {
    box.querySelectorAll("button.o-pumpbtn").forEach(function(btn){
      btn.onclick=function(){
        var k=btn.getAttribute("data-pump");
        if(k==="profile"){ var e2=rosterBySlug(b.creator); if(e2){ try{ window.open("https://www.mtcstw.com/"+e2.slug,"_blank"); }catch(x){} } }
        if(k==="share"){ shareBoostCard(); return; }
        var res=pumpBoost(k);
        if(res.ok){ renderBoost(); }
      };
    });
    var sh=document.getElementById("oBoostShare");
    if(sh) sh.onclick=function(){ shareBoostCard(); };
  }
  /* Weekly crown: most-boosted creator, from the backend. */
  var crown=document.getElementById("oCrown");
  if(crown){
    if(_crownCache&&_crownCache.leaders&&_crownCache.leaders.length){
      var top=_crownCache.leaders[0];
      /* Backend returns {slug,tipped,signal} — resolve the display name locally. */
      var _tm=rosterBySlug(top.slug), _tn=(_tm&&_tm.name)?_tm.name:top.slug;
      crown.innerHTML='\u{1F451} MOST BOOSTED THIS WEEK: <b>'+escHtml(_tn)+'</b> &mdash; '+top.signal+' signal';
    } else {
      apiAction("boost_totals",function(j){
        if(j&&j.leaders&&j.leaders.length){ _crownCache=j; renderBoost(); }
      });
    }
  }
}
/* Patrons strip: capped rotating sample of top tippers, reshuffled every render. */
var _patronCache=null, _crownCache=null;
function renderPatrons(){
  var box=document.getElementById("oPatrons"); if(!box) return;
  var show=function(list){
    if(!list||!list.length){ box.innerHTML=""; return; }
    var sample=shuffle(list.slice()).slice(0,5);
    box.innerHTML='<div class="o-phead">\u2605 PATRONS IN THE FIELD</div><div class="o-prow">'
      +sample.map(function(p){ return '<div class="o-patron"><b>'+escHtml(String(p.callsign||"ghost")).toUpperCase()+'</b><span>'+p.tipped+' XP tipped</span></div>'; }).join("")
      +'</div>';
  };
  if(_patronCache){ show(_patronCache.patrons); return; }
  apiAction("patron_totals",function(j){
    if(j&&j.patrons&&j.patrons.length){ _patronCache=j; show(j.patrons); }
    else {
      /* Backend not yet serving patrons: show this device's own record if it exists. */
      var p=patronRec(), id=ident();
      if(p.tipped>0) show([{callsign:(id.callsign||"you"),tipped:p.tipped}]);
      else box.innerHTML="";
    }
  });
}
/* Boost share card: 1080x1350 propaganda card for cross-platform pumping. */
function drawBoostCard(){
  var b=boostRec(); if(!b) return null;
  var entry=rosterBySlug(b.creator)||{name:b.creator};
  var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
  var ctx=cv.getContext("2d");
  ctx.fillStyle="#0d0d0d"; ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle="#c1121f"; ctx.fillRect(0,0,1080,26); ctx.fillRect(0,1324,1080,26);
  ctx.textAlign="center"; ctx.fillStyle="#f5f0e1";
  ctx.font="bold 64px Arial"; ctx.fillText("I BOOSTED",540,220);
  ctx.fillStyle="#ff5a00"; ctx.font="bold 88px Arial";
  wrapLines(ctx,entry.name.toUpperCase(),900).slice(0,2).forEach(function(l,i){ ctx.fillText(l,540,340+i*100); });
  ctx.fillStyle="#f5f0e1"; ctx.font="bold 120px Arial";
  ctx.fillText(b.signal+" SIGNAL",540,640);
  ctx.font="40px Arial"; ctx.fillStyle="#c1121f";
  ctx.fillText(b.tipped+" XP TIPPED \u00b7 1 XP = "+BOOST_RATIO+" SIGNAL",540,730);
  ctx.fillStyle="#f5f0e1"; ctx.font="36px Arial";
  wrapLines(ctx,"Pump your creator. Daily Orders on mtcstw.com.",860).forEach(function(l,i){ ctx.fillText(l,540,880+i*52); });
  ctx.fillStyle="#ff5a00"; ctx.font="bold 44px Arial";
  ctx.fillText("MTCSTW.COM",540,1180);
  return cv;
}
function shareBoostCard(){
  var done2=function(){
    var r=pumpBoost("share");
    renderBoost();
  };
  try{
    var cv=drawBoostCard(); if(!cv) return;
    try{ if(window.PFShare&&window.PFShare.stampCallsign){ cv=window.PFShare.stampCallsign(cv)||cv; } }catch(e){}
    var go=function(url,blob){
      var file=new File([blob],"pfn-boost.png",{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:"Today's Boost",text:"I boosted "+(rosterBySlug((boostRec()||{}).creator)||{}).name+" on mtcstw.com — pump your creator."}).then(done2).catch(function(){});
      }else{
        var a=document.createElement("a"); a.href=url; a.download="pfn-boost.png";
        document.body.appendChild(a); a.click(); a.remove(); done2();
      }
    };
    if(cv.toBlob){ cv.toBlob(function(bl){ go(URL.createObjectURL(bl),bl); },"image/png"); }
    else{ var u=cv.toDataURL("image/png"); fetch(u).then(function(r){return r.blob();}).then(function(bl){ go(URL.createObjectURL(bl),bl); }); }
  }catch(e){}
}

function syncFromServer(){
  var id=ident(); if(!id.callsign) return;
  apiGet(id.callsign,function(j){ mergeCheckinState(j); });
}

function warPathHtml(o){
  var h='<div class="o-wplabel">7-day war path</div><div class="o-wprow">', now=PF.chiNow();
  for(var i=6;i>=0;i--){
    var dt=new Date(now.getTime()); dt.setDate(dt.getDate()-i);
    var k=ymd(dt), r=o.days&&o.days[k];
    var hit=r&&r.done&&r.done.length>0;
    h+='<div class="o-day'+(hit?' hit':'')+(i===0?' today':'')+'"><span>'+"SMTWTFS"[dt.getDay()]+'</span><em>'+(hit?'\u2713':'')+'</em></div>';
  }
  return h+'</div>';
}
function renderReset(){
  var el=document.getElementById("oReset"); if(!el) return;
  var now=PF.chiNow(), end=new Date(now.getTime()); end.setHours(24,0,0,0);
  var ms=Math.max(0,end-now), h=Math.floor(ms/36e5), m=Math.floor(ms%36e5/6e4);
  el.textContent="NEW ORDERS IN "+h+"H "+m+"M — streaks roll at midnight";
}

function render(){
  var set=missionSet(), d=dayRec(), rec=d.rec, t=today();
  document.getElementById("oDate").textContent=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  /* DISPATCH CEREMONY: stamp slams in on the first view of the day. */
  var firstView=!rec.dispatchShown;
  if(firstView){ rec.dispatchShown=1; saveDay(d.o,rec); }
  var disp=document.getElementById("oDispatch");
  if(disp) disp.innerHTML=firstView?'<span class="o-stamp">\u25C8 ORDERS RECEIVED \u25C8</span>':"";
  var wp=document.getElementById("oWarPath");
  if(wp) wp.innerHTML=warPathHtml(d.o);
  renderReset();
  var doneCount=rec.done.length;
  /* XP METER — 3 segments, flashes hotter with the combo */
  var meter=document.getElementById("oMeter"), mh="";
  set.forEach(function(mi){
    var filled=rec.done.some(function(x){ return String(x.m)===String(mi); });
    mh+='<div class="o-seg'+(filled?" fill":"")+'"></div>';
  });
  meter.innerHTML=mh;
  meter.className="o-meter"+(doneCount>=3?" maxed":doneCount>=2?" hot":"");
  document.getElementById("oCombo").textContent=doneCount>=3?"3/3 — ORDERS COMPLETE":doneCount===2?"2 down — one more for full deployment.":doneCount===1?"1 down — 2 to go.":"";
  /* Live preview of what the share card's completion headline will read. */
  var sc=document.getElementById("oShareCount");
  if(sc){ var td=doneCount+(rec.opDone?1:0);
    sc.textContent=rec.cmdPaid?"Your share card reads: FULL DEPLOYMENT — all tasks complete.":"Your share card will read: "+td+" OF 4 TASKS COMPLETE."; }
  var html="";
  set.forEach(function(mi,slot){
    var m=MISSIONS[mi]||{t:""}, entry=null;
    rec.done.forEach(function(x){ if(String(x.m)===String(mi)) entry=x; });
    var isDone=!!entry;
    var xpLine='+'+(isDone?(typeof entry.g==="number"?entry.g:BASE_XP):BASE_XP)+' XP'+(isDone?"":" · report #"+(doneCount+1));
    var action;
    if(isDone){ action='<div><span class="o-donetag">Reported</span></div>'; }
    else if(m.share){
      action='<div class="o-platpick" id="o-pick-'+mi+'"><div class="o-picklabel">Where did you share it?</div>'
        +PLATFORMS.map(function(p){
            return '<button class="o-platbtn" data-mi="'+mi+'" data-p="'+p[0]+'">'+p[1]+'</button>';
          }).join("")
        +'</div><button class="o-btn o-sharebtn" data-mi="'+mi+'">Report back</button>';
    }
    else { action='<button class="o-btn" data-mi="'+mi+'">Report back</button>'; }
    html+='<div class="o-mission'+(isDone?" done":"")+'">'
      +'<div class="o-mtext">'+m.t+'</div>'
      +'<div class="o-xp">'+xpLine+'</div>'
      +(isDone&&entry.p?'<div><span class="o-ptag">Shared to '+platLabel(entry.p)+'</span></div>':"")
      +action
      +'</div>';
  });
  /* FIELD OP card — the cross-game bonus mission. */
  var op=fieldOp(), opDone=!!rec.opDone;
  html+='<div class="o-fieldop'+(opDone?' done':'')+'">'
    +'<div class="o-fophead">\u2605 FIELD OP &mdash; CROSS-GAME BONUS</div>'
    +'<div class="o-mtext">'+op.label+'</div>'
    +'<div class="o-xp">+'+OP_XP+' XP'+(opDone?' &middot; complete':'')+'</div>'
    +(opDone?'<div><span class="o-donetag">Op complete</span></div>'
            :'<div class="o-fopsub">Deploy to its silo and complete it there &mdash; it auto-reports here.</div><button class="o-btn o-deploybtn" data-game="'+op.game+'">Deploy &rarr;</button>')
    +'</div>';
  var z=document.getElementById("oMissions"); z.innerHTML=html;
  z.className=firstView?"o-reveal":"";
  z.querySelectorAll("button.o-deploybtn").forEach(function(b){
    b.onclick=function(){
      var g=b.getAttribute("data-game");
      var sec=document.querySelector('section[data-game="'+g+'"]')
        ||document.getElementById('pf-'+g)||document.getElementById('pf-ov-'+g);
      if(sec){
        var scrolled=false;
        try{ sec.scrollIntoView({behavior:"smooth",block:"start"}); scrolled=true; }
        catch(e){ try{ sec.scrollIntoView(); scrolled=true; }catch(e2){} }
        if(!scrolled){
          try{
            var r=sec.getBoundingClientRect();
            var top=r.top+(window.pageYOffset||document.documentElement.scrollTop||0);
            window.scrollTo(0,Math.max(0,top-20)); scrolled=true;
          }catch(e3){}
        }
        /* Fallback: if still at top after 600ms, force-jump. */
        setTimeout(function(){
          try{
            var r2=sec.getBoundingClientRect();
            if(r2.top<-10||r2.top>window.innerHeight+10){
              var t2=r2.top+(window.pageYOffset||document.documentElement.scrollTop||0);
              window.scrollTo(0,Math.max(0,t2-20));
            }
          }catch(e4){}
        },650);
        try{
          sec.classList.add("pf-flash");
          setTimeout(function(){ try{sec.classList.remove("pf-flash");}catch(e){} },1400);
        }catch(e){}
      }
    };
  });
  function doReport(mi,platform,btn){
    var res=checkin(mi,platform);
    if(!res.ok) return;
    var box=document.getElementById("pf-orders");
    box.classList.remove("o-flash"); void box.offsetWidth; box.classList.add("o-flash");
    var loot=LOOT[Math.floor(Math.random()*LOOT.length)];
        if(res.platform) loot="Reported via "+platLabel(res.platform)+". "+loot;
        if(res.shieldUsed) loot="STREAK SHIELD held the line — your streak survives. "+loot;
        if(res.shieldEarned) loot="STREAK SHIELD earned — one missed day forgiven. "+loot;
        if(res.cellBonus>0) loot="CELL BONUS +"+res.cellBonus+" XP ("+Math.round((res.cellMult-1)*100)+"% cell streak) — "+loot;
    var cmd=res.cmd||maybeCommandBonus();
    /* DOPAMINE: press bounce, floating XP, streak-milestone ping, mission-complete confetti.
       Pure presentation — the economy already settled above; nothing here awards or tallies. */
    try{ if(window.PF&&PF.dope){
      if(btn) PF.dope.press(btn);
      PF.dope.xpFloat(box,"+"+(res.gained+res.bonus+cmd)+" XP");
      if(res.bonus>0) PF.dope.ping(box,res.streak+"-DAY STREAK BONUS");
      PF.dope.confetti(box,res.reportNo>=3?60:18);
      if(res.reportNo>=3) PF.dope.ping(box,"ALL ORDERS COMPLETE");
    } }catch(e){}
    if(cmd) loot="FULL DEPLOYMENT — COMMAND BONUS +"+cmd+". "+loot;
    document.getElementById("oLoot").textContent="+"+(res.gained+res.bonus+cmd)+" XP — "+loot+(res.bonus?" "+res.streak+"-day streak bonus!":"");
    document.getElementById("oErr").textContent="";
    render();
  }
  z.querySelectorAll("button.o-btn").forEach(function(b){
    b.onclick=function(){
      var mi=parseInt(b.getAttribute("data-mi"),10);
      if(b.classList.contains("o-sharebtn")){
        var pick=document.getElementById("o-pick-"+mi);
        if(pick) pick.style.display=pick.style.display==="block"?"none":"block";
        return;
      }
      doReport(mi,null,b);
    };
  });
  z.querySelectorAll("button.o-platbtn").forEach(function(b){
    b.onclick=function(){
      doReport(parseInt(b.getAttribute("data-mi"),10), b.getAttribute("data-p"), b);
    };
  });
  document.getElementById("oProg").textContent=Math.min(doneCount,PER_DAY)+"/"+PER_DAY+" orders complete";
  renderBoost();
  renderPatrons();
  document.getElementById("oStreak").innerHTML="Current streak: <b>"+(d.o.streak||0)+"</b> day"+((d.o.streak||0)===1?"":"s")+((d.o.shields||0)>0?" &nbsp;\uD83D\uDEE1\uFE0F x"+d.o.shields:"");
  var s=d.o.streak||0;
  var nextMil=Object.keys(STREAK_BONUS).map(Number).filter(function(n){return n>s;}).sort(function(a,b){return a-b;})[0];
      document.getElementById("oNext").textContent=nextMil?("Streak bonus at "+nextMil+" days (+"+STREAK_BONUS[nextMil]+" XP)"):"Maximum streak bonus achieved. Legendary.";
  var r=load(LS_R,{xp:0});
  function paintRank(xp){ var el=document.getElementById("oRank"); if(el) el.textContent=xp>0?("Rank: "+tierOf(xp)[0]+" · "+xp+" XP"):""; }
  paintRank(r.xp);
  var id=ident(), wrap=document.getElementById("oClaimWrap");
  /* Prefer the backend ledger balance when a callsign exists — keeps the rank
     line consistent with every other XP readout on the page. */
  try{
    if(id.callsign&&window.PF&&PF.xpBalance){
      PF.xpBalance(function(bal){
        if(typeof bal==="number"&&bal>r.xp){ r.xp=bal; save(LS_R,r); paintRank(bal); }
      });
    }
  }catch(e){}
  if(!beUrl()){ wrap.style.display="none"; }
  else if(id.callsign){
    document.getElementById("oClaimToggle").style.display="none";
    document.getElementById("oWho").textContent="Fighting as "+id.callsign.toUpperCase()+" — rank follows you everywhere.";
  } else {
    document.getElementById("oClaimToggle").onclick=function(){
      var b=document.getElementById("oClaimBox");
      b.style.display=b.style.display==="block"?"none":"block";
    };
    document.getElementById("oClaimBtn").onclick=function(){
      var cs=document.getElementById("oCallsign").value.trim().toLowerCase();
      var em=document.getElementById("oEmail").value.trim();
      var errBox=document.getElementById("oClaimErr");
      if(!/^[a-z0-9_]{3,20}$/.test(cs)){ errBox.textContent="Callsign: 3-20 chars, letters/numbers/underscore."; return; }
      if(em&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){ errBox.textContent="That email doesn't look right — fix it or leave it blank."; return; }
      errBox.textContent="Claiming…";
      var regParams={action:"register",callsign:cs,email:em};
      try{ var _dev=window.PFDeviceId?window.PFDeviceId():""; if(_dev) regParams.device=_dev; }catch(e){}
      try{ var prf=localStorage.getItem("pf_pending_ref"); if(prf&&/^[a-z0-9_]{3,20}$/.test(prf)) regParams.ref=prf; }catch(e){}
      apiPost(regParams,function(j){
        if(!j){ errBox.textContent="Network error. Try again."; return; }
        if(!j.ok){ errBox.textContent=j.error==="taken"?"That callsign is taken.":"Bad callsign."; return; }
        try{ localStorage.removeItem("pf_pending_ref"); }catch(e2){}
        /* Per-callsign auth: capture the secret from enlistment, or claim it for existing users. */
        try{
          if(j.auth_secret&&window.PF&&PF.saveAuthSecret){ PF.saveAuthSecret(j.auth_secret); }
          else if(window.PF&&PF.claimAuthSecret){ PF.claimAuthSecret(cs,function(){}); }
        }catch(e3){}
        save(LS_I,{callsign:cs,email:em});
        try{document.dispatchEvent(new CustomEvent('pf-callsign-claimed',{detail:{callsign:cs}}));}catch(e){}
        var rr=load(LS_R,{xp:0,got:{}});
        if(j.xp>rr.xp){ rr.xp=j.xp; save(LS_R,rr); }
        render();
      });
    };
  }
}
/* SHARE AS IMAGE — renders today's orders to a 1080x1350 propaganda card
   and shares it via the native share sheet (falls back to PNG download). */
function wrapLines(ctx,text,maxW){
  var words=String(text).split(/\\s+/),lines=[],line='';
  words.forEach(function(w){
    var t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}
    else line=t;
  });
  if(line)lines.push(line);
  return lines;
}
function drawOrdersCard(){
  var W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);
  x.strokeStyle='#c1121f';x.lineWidth=16;x.strokeRect(14,14,W-28,H-28);
  x.strokeStyle='#f5ead6';x.lineWidth=3;x.strokeRect(44,44,W-88,H-88);
  x.textAlign='center';
  var y=150;
  x.fillStyle='#f5ead6';x.font='900 78px "Arial Black",Arial,sans-serif';
  x.fillText('\\u2605 DAILY ORDERS \\u2605',W/2,y);y+=58;
  x.fillStyle='#c1121f';x.font='700 34px Arial,sans-serif';
  var ds=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
  x.fillText(ds,W/2,y);y+=30;
  x.strokeStyle='#c1121f';x.lineWidth=4;
  x.beginPath();x.moveTo(140,y);x.lineTo(W-140,y);x.stroke();y+=70;
  var set=missionSet(),d=dayRec(),rec=d.rec||{done:[]};
  /* COMPLETION COUNT — the shareable headline: how many tasks got done. */
  var mDone=set.filter(function(mi){return rec.done.some(function(e){return e.m===mi;});}).length;
  var tDone=mDone+(rec.opDone?1:0), full=!!rec.cmdPaid;
  x.fillStyle=full?'#e8b923':'#c1121f';x.font='900 50px "Arial Black",Arial,sans-serif';
  x.fillText(full?'FULL DEPLOYMENT':(tDone+' OF 4 TASKS COMPLETE'),W/2,y);y+=64;
  x.fillStyle='#c9bfa8';x.font='400 29px Arial,sans-serif';
  x.fillText(mDone+' / 3 ORDERS'+(rec.opDone?'  •  FIELD OP DONE':'  •  FIELD OP OPEN'),W/2,y);y+=54;
  x.textAlign='left';
  set.forEach(function(mi,ix){
    var m=MISSIONS[mi]||{t:''};
    var done=rec.done.some(function(e){return e.m===mi;});
    x.fillStyle='#c1121f';x.font='900 60px "Arial Black",Arial,sans-serif';
    x.fillText('0'+(ix+1),120,y);
    x.fillStyle=done?'#c1121f':'#f5ead6';x.font='400 37px Arial,sans-serif';
    var lines=wrapLines(x,m.t,W-360);
    lines.forEach(function(ln,i){x.fillText(ln,300,y-14+i*48);});
    if(done){x.fillStyle='#c1121f';x.font='700 30px Arial,sans-serif';x.fillText('\\u2713 REPORTED',300,y-14+lines.length*48+6);}
    y+=Math.max(150,lines.length*48+86);
  });
  x.textAlign='left';
  var fop=fieldOp(), fopLines=wrapLines(x,'FIELD OP: '+fop.label+(rec.opDone?' \u2713':''),W-360);
  x.fillStyle='#e8b923';x.font='900 30px "Arial Black",Arial,sans-serif';
  fopLines.forEach(function(ln,i){x.fillText(ln,120,y+i*42);});
  y+=fopLines.length*42+36;
  x.textAlign='center';
  var streak=(d.o&&d.o.streak)||0;
  x.fillStyle='#c1121f';x.font='900 40px "Arial Black",Arial,sans-serif';
  x.fillText(streak>0?('STREAK: '+streak+' DAY'+(streak===1?'':'S')):'DAY ONE. START THE STREAK.',W/2,y+20);y+=80;
  var id=ident(),cs='';
  try{cs=String(id.callsign||'').toUpperCase();}catch(e){}
  if(cs){x.fillStyle='#c9bfa8';x.font='400 30px Arial,sans-serif';x.fillText('ORDERS FOR: '+cs,W/2,y+10);y+=56;try{cv._pfStamped=true;}catch(e){}}
  x.fillStyle='#f5ead6';x.font='900 62px "Arial Black",Arial,sans-serif';
  x.fillText('MTCSTW.COM',W/2,H-170);
  x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
  x.fillText('THE PROPAGANDA FACTORY',W/2,H-116);
  x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
  x.fillText('JOIN THE FIGHT.',W/2,H-76);
  return cv;
}
function shareOrdersImage(btn){
  if(btn)btn.disabled=true;
  /* Remove any prior share note. */
  var prior=document.getElementById('oShareNote');if(prior)prior.remove();
  var note=function(msg,color){
    var d=document.createElement('div');d.id='oShareNote';d.className='o-rules';
    d.style.color=color||'#f5f0e1';d.style.marginTop='10px';d.textContent=msg;
    if(btn&&btn.parentNode)btn.parentNode.appendChild(d);
    setTimeout(function(){if(d.parentNode)d.remove();},9000);
  };
  try{
    var cv=drawOrdersCard();
    var awardShare=function(){
      /* Credit ONLY on a confirmed share or a completed download — never on cancel.
         Routed through the shared once-per-day gate (PF.creditShare) so a share
         here plus a share from any other game can't credit the same day twice. */
      if(btn)btn.disabled=false;
      try{
        if(PF && typeof PF.creditShare==='function'){ PF.creditShare('daily-orders','share'); }
        else if(typeof window.pfCreditShare==='function'){ window.pfCreditShare('daily-orders','share'); }
        else { document.dispatchEvent(new CustomEvent('pf-share-image',{detail:{day:new Date().toISOString().slice(0,10)}})); }
      }catch(e){}
    };
    var done=function(url,blob){
      var file=new File([blob],'pfn-daily-orders.png',{type:'image/png'});
      var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'Daily Orders',text:'Today\\u2019s orders from the Propaganda Factory.'}).then(awardShare).catch(function(){
          /* User cancelled the share sheet — NO credit. */
          if(btn)btn.disabled=false;
          note('Share cancelled — no share credit. Tap the button again to share.','#c1121f');
        });
      }else{
        var a=document.createElement('a');a.href=url;a.download='pfn-daily-orders.png';
        document.body.appendChild(a);a.click();a.remove();
        if(isIOS)note('Image downloaded — open Photos, tap the image, then Share to post it.','#f5f0e1');
        awardShare();
      }
    };
    if(cv.toBlob){cv.toBlob(function(b){done(URL.createObjectURL(b),b);},'image/png');}
    else{var u=cv.toDataURL('image/png');fetch(u).then(function(r){return r.blob();}).then(function(b){done(URL.createObjectURL(b),b);});}
  }catch(e){if(btn)btn.disabled=false;}
}
var _shareBtn=document.getElementById('oShareImg');
if(_shareBtn){_shareBtn.addEventListener('click',function(){shareOrdersImage(_shareBtn);});}

renderReset();
if(!window._pfOrdersTick){ window._pfOrdersTick=setInterval(function(){ renderReset(); },60000); }
render();
syncFromServer();
})();
</script>
</div>
</template>`);
})();
