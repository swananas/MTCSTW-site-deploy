/* ============================================================================
   SILO: games/daily-orders.js  |  PF v1.1.0
   WHAT: Daily Orders widget: template + 30 rotating missions
   PHASE: games: template now, companions after mount
   EVENTS SEEN: pf-callsign-claimed, pf-order-checkin, pf-orders, pf-ov-orders, pf-override-block, pf-share-image
   KILL: ?pf_off=daily-orders  or  localStorage pf_disabled_v1='["daily-orders"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("daily-orders")) { PF.log("daily-orders", "disabled via kill-switch"); return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-orders">
<div class="fe-block pf-override-block" id="pf-orders">

<h2>Daily Orders</h2>
<div class="o-date" id="oDate"></div>
<div class="o-meterwrap">
  
  <div class="o-meter" id="oMeter"></div>
  <div class="o-combo" id="oCombo"></div>
</div>
<div id="oMissions"></div>
<div class="o-prog" id="oProg"></div>
<div class="o-streak" id="oStreak"></div>
<div class="o-next" id="oNext"></div>
<div class="o-rankline" id="oRank"></div>
<div class="o-loot" id="oLoot"></div>
<div class="o-err" id="oErr"></div>
<div class="o-note">3 orders per day. Chain them for combo XP. Share missions on a new platform: +5 spread combo each. Max 50 XP/day from missions.</div>
<div><button class="o-shareimg" id="oShareImg">Share orders as image</button></div>
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
var COMBO_LOOT={2:"Combo x2. The machine is warming up.",3:"COMBO x3. FULL AGITATION. Maximum pressure."};
/* economy */
var PER_DAY=3, BASE_XP=10, COMBO_STEP=5, DAILY_MAX=50;
var SPREAD_XP=5;
var PLATFORMS=[["tiktok","TikTok"],["facebook","Facebook"],["instagram","Instagram"],["x","X"],["youtube","YouTube"]];
var STREAK_BONUS={3:10,7:25,30:100};
var TIERS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
var LS_O="pf_orders_v1", LS_R="pf_ranks_v1", LS_I="pf_identity_v1";
var BACKEND_URL="https://script.google.com/macros/s/AKfycbxKFGLAsEqn8msdaNSjML8yHNEHRvaI5drVzJQwMiaVbkhkMBlNoFq1M4hdJo33Usic5Q/exec";

function chiNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})); }catch(e){ return new Date(); } }
function ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function today(){ return ymd(chiNow()); }
function yesterday(){ var d=chiNow(); d.setDate(d.getDate()-1); return ymd(d); }
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
    r.done=r.done.map(function(m,ix){ return {m:m,p:null,g:Math.min(BASE_XP+COMBO_STEP*ix,DAILY_MAX)}; });
  }
  if(typeof r.xp!=="number") r.xp=0;
  return {o:o, rec:r};
}
function saveDay(o,rec){ o.days[today()]=rec; save(LS_O,o); }

function ident(){ return load(LS_I,{});  }

  function apiPost(obj,cb){
 if(!BACKEND_URL){ cb(null); return;}
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
  q+="&callback="+fn;
  s.src=BACKEND_URL+q;
  document.head.appendChild(s);

}
function apiGet(callsign,cb){
  if(!BACKEND_URL){ cb(null); return; }
  var fn="pfRankCb"+Math.floor(Math.random()*1e9);
  window[fn]=function(j){ try{delete window[fn];}catch(e){} s.parentNode.removeChild(s); cb(j); };
  var s=document.createElement("script");
  s.onerror=function(){ cb(null); };
  s.src=BACKEND_URL+"?action=get&callsign="+encodeURIComponent(callsign)+"&callback="+fn;
  document.head.appendChild(s);
}

function platLabel(p){ var f=PLATFORMS.filter(function(x){return x[0]===p;})[0]; return f?f[1].toUpperCase():String(p||"").toUpperCase(); }

function checkin(mi,platform){
  var d=dayRec(), o=d.o, rec=d.rec, t=today();
  var already=rec.done.some(function(x){ return x.m===mi; });
  if(already) return {ok:false, err:"already"};
  platform=platform||null;
  var usedPlat={};
  rec.done.forEach(function(x){ if(x.p) usedPlat[x.p]=1; });
  var mission=MISSIONS[mi]||{};
  var firstToday=rec.done.length===0;
  var combo=rec.done.length+1;                       /* 1,2,3 */
  /* SPREAD COMBO: share mission on a platform not yet used today = +5 */
  var spread=(mission.share&&platform&&!usedPlat[platform])?SPREAD_XP:0;
  var comboXp=BASE_XP+COMBO_STEP*(combo-1);
  var room=Math.max(0,DAILY_MAX-(rec.xp||0));        /* same 50 XP/day cap */
  var gained=Math.min(comboXp+spread,room);
  var bonus=0;
  if(firstToday){
    o.streak=(o.last===yesterday())?(o.streak||0)+1:1; o.last=t;
    if(STREAK_BONUS[o.streak]&&!rec.bonusPaid){ bonus=STREAK_BONUS[o.streak]; rec.bonusPaid=true; }
  }
  rec.done.push({m:mi,p:platform,g:gained}); rec.xp=(rec.xp||0)+gained; saveDay(o,rec);
  var r=load(LS_R,{xp:0,got:{}}), key="order_"+t+"_"+mi;
  if(r.got[key]!==t){ r.got[key]=t; r.xp+=gained+bonus; save(LS_R,r); }
  fireEvent(t,mi,combo,gained+bonus,o.streak,platform,spread);
  var id=ident();
  if(id.callsign){
    apiPost({action:"checkin",callsign:id.callsign,day:t,mission:mi,platform:platform,spread:spread?1:0},function(j){
      if(j&&j.ok){
        var rr=load(LS_R,{xp:0,got:{}}); if(j.xp>rr.xp) rr.xp=j.xp; save(LS_R,rr);
        var dd=dayRec(); dd.o.streak=j.streak; dd.o.last=j.last_day;
        if(j.today_done&&j.today_done.length){
          var plats=j.today_platforms||[];
          dd.rec.done=j.today_done.map(function(mm,ix){ return {m:mm,p:plats[ix]||null,g:0}; });
          dd.rec.xp=j.today_xp||dd.rec.xp;
        }
        saveDay(dd.o,dd.rec);

        render();
      }
    });
  }
  return {ok:true, combo:combo, gained:gained, bonus:bonus, spread:spread, platform:platform, streak:o.streak, xp:r.xp, tier:tierOf(r.xp)[0]};
}
function fireEvent(t,mi,combo,xp,streak,platform,spread){
  try{ document.dispatchEvent(new CustomEvent("pf-order-checkin",{detail:{day:t,mission:mi,combo:combo,xp:xp,streak:streak,platform:platform||null,spread:spread||0}})); }catch(e){}
}

function syncFromServer(){
  var id=ident(); if(!id.callsign) return;
  apiGet(id.callsign,function(j){
    if(!j||!j.ok) return;
    var r=load(LS_R,{xp:0,got:{}});
    if(j.xp>r.xp){ r.xp=j.xp; save(LS_R,r); }
    var d=dayRec(), recent=(j.last_day===today()||j.last_day===yesterday());
    if(recent&&j.streak>(d.o.streak||0)){ d.o.streak=j.streak; d.o.last=j.last_day; }
    if(j.today_done&&j.today_done.length){
      var plats=j.today_platforms||[];
      j.today_done.forEach(function(mi,ix){
        var has=d.rec.done.some(function(x){ return x.m===mi; });
        if(!has) d.rec.done.push({m:mi,p:plats[ix]||null,g:0});
      });
      if(typeof j.today_xp==="number") d.rec.xp=j.today_xp;
    }
    saveDay(d.o,d.rec); render();
  });
}

function render(){
  var set=missionSet(), d=dayRec(), rec=d.rec, t=today();
  document.getElementById("oDate").textContent=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  var doneCount=rec.done.length;
  /* XP METER — 3 segments, flashes hotter with the combo */
  var meter=document.getElementById("oMeter"), mh="";
  set.forEach(function(mi){
    var filled=rec.done.some(function(x){ return x.m===mi; });
    mh+='<div class="o-seg'+(filled?" fill":"")+'"></div>';
  });
  meter.innerHTML=mh;
  meter.className="o-meter"+(doneCount>=3?" maxed":doneCount>=2?" hot":"");
  document.getElementById("oCombo").textContent=doneCount>=3?"FULL COMBO — MAXIMUM PRESSURE":doneCount===2?"COMBO x2 — one more. Chain it.":doneCount===1?"1 down. Chain the next for combo XP.":"";
  var nextVal=Math.min(BASE_XP+COMBO_STEP*doneCount, Math.max(0,DAILY_MAX-(rec.xp||0))), html="";
  set.forEach(function(mi,slot){
    var m=MISSIONS[mi]||{t:""}, entry=null;
    rec.done.forEach(function(x){ if(x.m===mi) entry=x; });
    var isDone=!!entry;
    var usedPlat={}; rec.done.forEach(function(x){ if(x.p) usedPlat[x.p]=1; });
    var spreadHint=(m.share&&!isDone)?'<div class="o-spreadline">+'+SPREAD_XP+' spread combo on a new platform</div>':"";
    var platTag=(isDone&&entry.p)?'<div><span class="o-ptag">Shared to '+platLabel(entry.p)+'</span></div>':"";
    var xpLine='+'+(isDone?(typeof entry.g==="number"?entry.g:BASE_XP+COMBO_STEP*doneCount):nextVal)+' XP'+(isDone?"":" · report #"+(doneCount+1));
    var action;
    if(isDone){ action='<div><span class="o-donetag">Reported</span></div>'; }
    else if(m.share){
      action='<div class="o-platpick" id="o-pick-'+mi+'"><div class="o-picklabel">Where did you share it? (+'+SPREAD_XP+' on a new platform)</div>'
        +PLATFORMS.map(function(p){
            var fresh=!usedPlat[p[0]];
            return '<button class="o-platbtn" data-mi="'+mi+'" data-p="'+p[0]+'">'+p[1]+(fresh?" +"+SPREAD_XP:"")+'</button>';
          }).join("")
        +'</div><button class="o-btn o-sharebtn" data-mi="'+mi+'">Report back</button>';
    }
    else { action='<button class="o-btn" data-mi="'+mi+'">Report back</button>'; }
    html+='<div class="o-mission'+(isDone?" done":"")+'">'
      +'<div class="o-mtext">'+m.t+'</div>'
      +'<div class="o-xp">'+xpLine+'</div>'
      +spreadHint+platTag+action
      +'</div>';
  });
  var z=document.getElementById("oMissions"); z.innerHTML=html;
  function doReport(mi,platform){
    var res=checkin(mi,platform);
    if(!res.ok) return;
    var box=document.getElementById("pf-orders");
    box.classList.remove("o-flash"); void box.offsetWidth; box.classList.add("o-flash");
    var loot=LOOT[Math.floor(Math.random()*LOOT.length)];
        if(res.spread) loot="Spread combo +"+res.spread+" — "+platLabel(res.platform)+". "+loot;
        if(COMBO_LOOT[res.combo]) loot=COMBO_LOOT[res.combo]+(res.spread?" (+"+res.spread+" spread)":"");
    document.getElementById("oLoot").textContent="+"+(res.gained+res.bonus)+" XP — "+loot+(res.bonus?" "+res.streak+"-day streak bonus!":"");
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
      doReport(mi,null);
    };
  });
  z.querySelectorAll("button.o-platbtn").forEach(function(b){
    b.onclick=function(){
      doReport(parseInt(b.getAttribute("data-mi"),10), b.getAttribute("data-p"));
    };
  });
  document.getElementById("oProg").textContent=doneCount+"/"+PER_DAY+" orders complete";
  document.getElementById("oStreak").innerHTML="Current streak: <b>"+(d.o.streak||0)+"</b> day"+((d.o.streak||0)===1?"":"s");
  var s=d.o.streak||0;
  var nextMil=Object.keys(STREAK_BONUS).map(Number).filter(function(n){return n>s;}).sort(function(a,b){return a-b;})[0];
      document.getElementById("oNext").textContent=nextMil?("Streak bonus at "+nextMil+" days (+"+STREAK_BONUS[nextMil]+" XP)"):"Maximum streak bonus achieved. Legendary.";
  var r=load(LS_R,{xp:0});
  document.getElementById("oRank").textContent=r.xp>0?("Rank: "+tierOf(r.xp)[0]+" · "+r.xp+" XP"):"";
  var id=ident(), wrap=document.getElementById("oClaimWrap");
  if(!BACKEND_URL){ wrap.style.display="none"; }
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
      apiPost({action:"register",callsign:cs,email:em},function(j){
        if(!j){ errBox.textContent="Network error. Try again."; return; }
        if(!j.ok){ errBox.textContent=j.error==="taken"?"That callsign is taken.":"Bad callsign."; return; }
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
  x.textAlign='center';
  var streak=(d.o&&d.o.streak)||0;
  x.fillStyle='#c1121f';x.font='900 40px "Arial Black",Arial,sans-serif';
  x.fillText(streak>0?('STREAK: '+streak+' DAY'+(streak===1?'':'S')):'DAY ONE. START THE STREAK.',W/2,y+20);y+=80;
  var id=ident(),cs='';
  try{cs=String(id.callsign||'').toUpperCase();}catch(e){}
  if(cs){x.fillStyle='#c9bfa8';x.font='400 30px Arial,sans-serif';x.fillText('ORDERS FOR: '+cs,W/2,y+10);y+=56;}
  x.fillStyle='#f5ead6';x.font='900 62px "Arial Black",Arial,sans-serif';
  x.fillText('MTCSTW.COM',W/2,H-170);
  x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
  x.fillText('THE PROPAGANDA FACTORY',W/2,H-116);
  x.fillStyle='#c9bfa8';x.font='400 26px Arial,sans-serif';
  x.fillText('Do things. Post proof.',W/2,H-76);
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
      /* Credit ONLY on a confirmed share or a completed download — never on cancel. */
      if(btn)btn.disabled=false;
      try{document.dispatchEvent(new CustomEvent('pf-share-image',{detail:{day:new Date().toISOString().slice(0,10)}}));}catch(e){}
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

render();
syncFromServer();
})();
</script>
</div>
</template>`);
  PF.log("daily-orders", "silo loaded");
})();
