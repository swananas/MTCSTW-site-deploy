/* games/earnings.js  |  PF v1.4.3 | CREATOR EARNINGS.
   For creators to track income: subscribers, revenue shares from sponsored
   content, referral commissions, tips received, and an earnings summary.
   Reads via JSONP (self-contained api()), writes via CORS POST
   (self-contained post()). It never reaches into another silo's internals.
   KILL: ?pf_off=earnings  or  localStorage pf_disabled_v1='["earnings"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("earnings")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-earnings">
<div class="fe-block pf-override-block pf-silo" id="pf-earnings">
<h2>Get Paid to Agitate</h2>
<div class="c-tag">Your work pays. Track every stream.</div>
<div id="xEarnings"><div class="c-load">Counting the money&hellip;</div></div>
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
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"||action==="tip_history"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfErCb"+Math.floor(Math.random()*1e9);
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
function post(type,key,cAction,params,cb){
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function fmtDate(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }
}
function weekStart(){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
var SUBS=null, COMM=null, TIPS=null, HIST=null, FT=null;
function load(){
  var id=ident(), done=false, n=0, need=5;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("subscription_list",{callsign:id.callsign},function(j){ SUBS=j; one(); });
  api("commission_earnings",{callsign:id.callsign},function(j){ COMM=j; one(); });
  api("tip_history",{callsign:id.callsign},function(j){ TIPS=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:200},function(j){ HIST=j; one(); });
  /* R30 (2026-10-04): funding_totals — opt-in aggregates for the
     CREATORS GETTING FUNDED strip. Degrades silently until it ships. */
  api("funding_totals",{},function(j){ FT=j; one(); });
}
function render(){
  var el=document.getElementById("xEarnings"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML=PF.gateHTML('Earnings run on callsigns.','to see your earnings');
    return;
  }
  h+=renderSummary(id);
  h+=renderFunded(id);
  h+=renderSubscribers(id);
  h+=renderRevenue(id);
  h+=renderCommissions(id);
  h+=renderTips(id);
  h+='<div style="margin-top:10px"><button class="c-btn" id="erRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireRevenue(id,el);
  wireFunded(el);
  var rb=document.getElementById("erRetry");
  if(rb) rb.onclick=function(){ SUBS=COMM=TIPS=HIST=null; FT=null; el.innerHTML='<div class="c-load">Counting the money&hellip;</div>'; load(); };
}
/* ---------- SUMMARY ---------- */
function earnTotals(){
  var ws=weekStart(), allTime=0, thisWeek=0;
  try{
    var es=(HIST&&HIST.ok&&HIST.entries)||[];
    for(var i=0;i<es.length;i++){
      var d=Number(es[i].delta)||0;
      if(d>0){ allTime+=d; if(Number(es[i].ts)>=ws) thisWeek+=d; }
    }
  }catch(e){}
  return { allTime:Math.round(allTime), thisWeek:Math.round(thisWeek) };
}
function renderSummary(id){
  var t=earnTotals();
  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];
  var subWk=0;
  for(var i=0;i<fans.length;i++) subWk+=Number(fans[i].amount_per_week||0);
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; EARNINGS SUMMARY &#9670;</div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">THIS WEEK</div><div class="pb-cval">'+t.thisWeek.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">ALL TIME</div><div class="pb-cval">'+t.allTime.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SUBS / WEEK</div><div class="pb-cval">'+subWk.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SUPPORTERS</div><div class="pb-cval">'+fans.length+'</div></div>'
    +'</div>'
    +'<div class="x-note">XP in. Every stream below feeds these numbers — subscriptions, tips, commissions, revenue shares.</div></div>';
  return h;
}
/* ---------- R30: CREATORS GETTING FUNDED ---------- */
var FUND_MILESTONES=[1000,10000,100000];
function fundMilestone(tips){
  var ms=0;
  for(var i=0;i<FUND_MILESTONES.length;i++){ if(tips>=FUND_MILESTONES[i]) ms=FUND_MILESTONES[i]; }
  return ms;
}
function renderFunded(id){
  /* Opt-in aggregates only — the backend counts creators who opted in.
     Silent until funding_totals ships (W6B-1). */
  if(!FT||!FT.ok) return "";
  var tips=Number(FT.total_tips||0), n=Number(FT.creator_count||0);
  var ms=fundMilestone(tips);
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; CREATORS GETTING FUNDED &#9670;</div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">CREATORS IN</div><div class="pb-cval">'+n.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">TIPS FLOWING</div><div class="pb-cval">'+tips.toLocaleString()+'</div></div>'
    +'</div>'
    +'<div class="x-note">Opted-in creators only. Real tips, real fighters — the machine funds its own.</div>';
  if(ms>0){
    h+='<div style="margin-top:8px"><button class="c-btn" id="erMileBtn">SHARE THE '+ms.toLocaleString()+' MILESTONE</button></div>';
  }
  h+='</div>';
  return h;
}
function wireFunded(el){
  var b=document.getElementById("erMileBtn");
  if(b) b.onclick=function(){ erPaintMilestone(); };
}
function erPaintMilestone(){
  var tips=Number((FT&&FT.total_tips)||0), n=Number((FT&&FT.creator_count)||0);
  var ms=fundMilestone(tips);
  if(!ms){ toast("No milestone hit yet — keep tipping."); return; }
  try{
    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }
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
    var y=170;
    /* kicker: letterspaced gold */
    x.fillStyle=btG; x.font="700 27px Arial,sans-serif";
    try{ x.letterSpacing="10px"; }catch(e){}
    x.fillText("THE PROPAGANDA FACTORY",W/2,y);
    try{ x.letterSpacing="0px"; }catch(e2){}
    y+=36;
    x.strokeStyle="rgba(201,162,39,0.5)"; x.lineWidth=1;
    x.beginPath(); x.moveTo(W/2-150,y); x.lineTo(W/2+150,y); x.stroke();
    y+=100;
    /* the figure: monumental gold gradient, drop shadow */
    x.font='900 120px Georgia,"Times New Roman",serif';
    var btFig=ms.toLocaleString()+"+";
    x.fillStyle="rgba(0,0,0,0.55)";
    x.fillText(btFig,W/2+6,y+8);
    var btGg=x.createLinearGradient(0,y-120,0,y);
    btGg.addColorStop(0,"#f0d060"); btGg.addColorStop(1,"#8a6d1c");
    x.fillStyle=btGg;
    x.fillText(btFig,W/2,y); y+=110;
    x.fillStyle=btC; x.font='900 58px Georgia,"Times New Roman",serif';
    try{ x.letterSpacing="4px"; }catch(e3){}
    x.fillText("TIPS AND COUNTING",W/2,y);
    try{ x.letterSpacing="0px"; }catch(e4){}
    y+=100;
    /* red diamond rule */
    x.strokeStyle=btR; x.lineWidth=2;
    x.beginPath(); x.moveTo(W/2-190,y); x.lineTo(W/2-26,y); x.stroke();
    x.beginPath(); x.moveTo(W/2+26,y); x.lineTo(W/2+190,y); x.stroke();
    x.save(); x.translate(W/2,y); x.rotate(Math.PI/4);
    x.fillStyle=btR; x.fillRect(-9,-9,18,18); x.restore();
    y+=84;
    x.fillStyle=btM; x.font='italic 400 38px Georgia,"Times New Roman",serif';
    x.fillText(n.toLocaleString()+" creators getting funded.",W/2,y); y+=64;
    x.fillText("The machine funds its own.",W/2,y);
    /* source citation: the funding ledger */
    x.fillStyle=btF; x.font="400 24px Arial,sans-serif";
    try{ x.letterSpacing="2px"; }catch(e5){}
    x.fillText("SOURCE — THE PROPAGANDA FACTORY FUNDING LEDGER",W/2,H-250);
    try{ x.letterSpacing="0px"; }catch(e6){}
    /* ---- butter footer: CTA standard ---- */
    var fy=H-215;
    x.strokeStyle="rgba(201,162,39,0.45)"; x.lineWidth=1;
    x.beginPath(); x.moveTo(120,fy); x.lineTo(W-120,fy); x.stroke();
    fy+=58;
    x.font="900 44px Arial,sans-serif"; x.fillStyle=btC;
    try{ x.letterSpacing="8px"; }catch(e7){}
    var btCta="JOIN THE FIGHT";
    var btCtaW=x.measureText(btCta).width;
    x.fillText(btCta,W/2,fy);
    x.fillStyle=btR; x.fillText(".",W/2+btCtaW/2-4,fy);
    try{ x.letterSpacing="0px"; }catch(e8){}
    fy+=52;
    x.fillStyle=btR; x.font="900 32px Arial,sans-serif";
    try{ x.letterSpacing="10px"; }catch(e9){}
    x.fillText("MTCSTW.COM",W/2,fy);
    try{ x.letterSpacing="0px"; }catch(e10){}
    fy+=42;
    x.fillStyle=btF; x.font="400 24px Arial,sans-serif";
    try{ x.fillText(new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}).toUpperCase(),W/2,fy); }catch(e11){}
    var btBar2=x.createLinearGradient(0,H-10,0,H);
    btBar2.addColorStop(0,btRD); btBar2.addColorStop(1,btR);
    x.fillStyle=btBar2; x.fillRect(0,H-10,W,10);
    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-funding-milestone.png","Creators getting funded","funding");
    else toast("Share engine still loading.");
  }catch(e){ toast("Poster failed — try again."); }
}
/* ---------- 1. SUBSCRIBERS ---------- */
function renderSubscribers(id){
  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; SUBSCRIBERS — YOUR PATRONS &#9670;</div>'
    +'<div class="x-note">Soldiers paying you weekly XP. Treat them well — they fund your propaganda.</div>';
  if(!fans.length) h+='<div class="x-note">No subscribers yet. Make propaganda worth paying for.</div>';
  var total=0;
  for(var i=0;i<fans.length;i++){
    var f=fans[i]; total+=Number(f.amount_per_week||0);
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(f.subscriber)+'</span> '
      +'<span class="cp-lxp">'+Number(f.amount_per_week||0).toLocaleString()+' XP/week</span>'
      +'<span class="x-note"> since '+esc(fmtDate(f.started_at))+'</span></div>';
  }
  if(fans.length) h+='<div class="x-note"><b>'+total.toLocaleString()+' XP/week</b> in recurring patronage.</div>';
  h+='</div>';
  return h;
}
/* ---------- 2. REVENUE SHARES ---------- */
function renderRevenue(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; REVENUE SHARES — SPONSORED CONTENT &#9670;</div>'
    +'<div class="x-note">When someone sponsors a poster you boosted, 10% of the spend flows to top boosters. Claim what&rsquo;s yours.</div>'
    +'<button class="c-btn" id="erClaimBtn">CLAIM REVENUE</button> <span class="x-note" id="erClaimNote"></span></div>';
  return h;
}
function wireRevenue(id,el){
  var b=document.getElementById("erClaimBtn");
  if(!b) return;
  b.onclick=function(){
    b.disabled=true;
    document.getElementById("erClaimNote").textContent="checking\u2026";
    post("finance","f_action","revenue_claim",{callsign:id.callsign,device:id.device},function(j){
      b.disabled=false;
      if(!j||!j.ok){
        document.getElementById("erClaimNote").textContent=PF.errCopy(j,"Nothing to claim.");
        return;
      }
      var t=Number(j.total||0);
      document.getElementById("erClaimNote").textContent=t>0?("claimed "+t.toLocaleString()+" XP"):"nothing pending";
      toast(t>0?("CLAIMED "+t+" XP. Your boosts paid off."):("No pending revenue."));
    });
  };
}
/* ---------- 3. COMMISSIONS ---------- */
function renderCommissions(id){
  var tot=(COMM&&COMM.ok)?Number(COMM.total_earned||0):0;
  var recs=(COMM&&COMM.ok&&COMM.recruits)||[];
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; REFERRAL COMMISSIONS — 5% OF YOUR RECRUITS &#9670;</div>'
    +'<div class="x-note">Every recruit you bring in pays you 5% of their earnings — automatically, until they&rsquo;ve earned 10,000 XP. Build the network, share the upside.</div>'
    +'<div class="pb-balrow"><span class="pb-blabel">TOTAL EARNED</span><span class="pb-bval">'+tot.toLocaleString()+' XP</span></div>';
  if(!recs.length) h+='<div class="x-note">No recruits yet. Your referral code is in the Referral War panel.</div>';
  for(var i=0;i<recs.length;i++){
    var r=recs[i];
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(r.recruit)+'</span> '
      +'<span class="cp-lxp">+'+Number(r.earned_for_you||0).toLocaleString()+' XP for you</span></div>';
  }
  h+='</div>';
  return h;
}
/* ---------- 4. TIPS RECEIVED ---------- */
function renderTips(id){
  var tips=(TIPS&&TIPS.ok&&TIPS.tips)||[];
  var mine=[], total=0;
  for(var i=0;i<tips.length;i++){
    if(String(tips[i].to_cs||"").toLowerCase()===id.callsign.toLowerCase()){
      mine.push(tips[i]); total+=Number(tips[i].xp||0);
    }
  }
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; TIPS RECEIVED &#9670;</div>'
    +'<div class="x-note">Direct appreciation from soldiers who value your work.</div>'
    +'<div class="pb-balrow"><span class="pb-blabel">TOTAL TIPPED</span><span class="pb-bval">'+total.toLocaleString()+' XP</span></div>';
  if(!mine.length) h+='<div class="x-note">No tips yet. Keep creating.</div>';
  for(var q=0;q<Math.min(mine.length,15);q++){
    var t=mine[q];
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(t.from_cs)+'</span> '
      +'<span class="cp-lxp">+'+Number(t.xp||0).toLocaleString()+' XP</span>'
      +(t.message?'<div class="x-note">&ldquo;'+esc(t.message)+'&rdquo;</div>':'')+'</div>';
  }
  h+='</div>';
  return h;
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="earnings"]'); }catch(e){}
  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
  if(start){ try{ if(sec) sec.addEventListener('pointerdown',start,{once:true}); }catch(e){} }
  else load();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
