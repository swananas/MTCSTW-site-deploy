/* games/movement.js  |  PF v1.4.3 | MOVEMENT FINANCE.
   The movement's collective financial layer: cause pools (strike/bail/mutual
   aid), creator subscriptions, crowdfunded prize pools, and the XP burn
   leaderboard. Reads via JSONP (self-contained api()), writes via CORS POST
   (self-contained post()). It never reaches into another silo's internals.
   Does NOT duplicate peoplesbank.js (transfers, savings, loans, bonds,
   history) — remittances link there instead.
   KILL: ?pf_off=movement  or  localStorage pf_disabled_v1='["movement"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("movement")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-movement">
<div class="fe-block pf-override-block pf-silo" id="pf-movement">
<h2>Movement Finance</h2>
<div class="c-tag">Collective money for collective power. No billionaires on the board.</div>
<div id="xMovement"><div class="c-load">Opening the war chest&hellip;</div></div>
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
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfMvCb"+Math.floor(Math.random()*1e9);
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
var CAUSES=null, SUBS=null, PRIZES=null, BURNS=null;
/* S7 FUND THEIR FIGHT (2026-10-04): /war-chest?creator=<slug> preselects
   the creator in the subscription UI — catalog pages deep-link here.
   Existing backend contract only: {type:'finance',f_action:'subscribe',
   subscriber, creator, amount_per_week}. No new actions. */
var PRESELECT=(function(){
  try{
    var m=String(window.location.search||"").match(/[?&]creator=([a-z0-9_-]{3,60})/i);
    return m?m[1].toLowerCase():"";
  }catch(e){ return ""; }
})();
var preselectApplied=false;
/* 6A-R9 (2026-10-04): /war-chest?cell=<id>&sponsor=1 — cell treasury
   sponsorship mode. Deep-linked from the /cells treasury panel's
   "SPONSOR A CAUSE" button. Officer-gated server-side (cause_sponsor). */
var SPONSOR_CELL=(function(){
  try{
    var m=String(window.location.search||"").match(/[?&]cell=([a-zA-Z0-9_-]{1,64})/);
    var s=/[?&]sponsor=1/.test(String(window.location.search||""));
    return (m&&s)?m[1]:"";
  }catch(e){ return ""; }
})();
var SPONSOR_CELL_NAME="", sponsorCellFetched=false;
function fetchSponsorCell(cb){
  if(sponsorCellFetched||!SPONSOR_CELL){ if(cb)cb(); return; }
  sponsorCellFetched=true;
  api("cell_card",{cell_id:SPONSOR_CELL},function(j){
    if(j&&j.ok&&j.cell&&j.cell.name) SPONSOR_CELL_NAME=j.cell.name;
    if(cb)cb();
  });
}
function load(){
  var id=ident(), done=false, n=0, need=4;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("cause_list",{},function(j){ CAUSES=j; one(); });
  api("subscription_list",{callsign:id.callsign},function(j){ SUBS=j; one(); });
  api("prize_list",{},function(j){ PRIZES=j; one(); });
  api("burn_leaderboard",{},function(j){ BURNS=j; one(); });
  /* 6A-R9: resolve the sponsor cell's name in parallel (public read). */
  if(SPONSOR_CELL) fetchSponsorCell(function(){ render(); });
}
function render(){
  var el=document.getElementById("xMovement"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML=PF.gateHTML('Movement finance runs on callsigns.','to fund the fight');
    return;
  }
  h+=renderCauses(id);
  h+=renderSubs(id);
  h+=renderPrizes(id);
  h+=renderBurns(id);
  h+=renderRemitLink();
  h+='<div style="margin-top:10px"><button class="c-btn" id="mvRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireCauses(id,el); wireSubs(id,el); wirePrizes(id,el); wireBurns(id,el);
  /* S7 preselect: prefill the subscribe field with the ?creator= target
     once per page view, then scroll the visitor to it. */
  if(PRESELECT&&!preselectApplied){
    preselectApplied=true;
    try{
      var pi=document.getElementById("mvSubCs");
      if(pi&&!pi.value) pi.value=PRESELECT;
      var pb2=document.getElementById("mvPre");
      if(pb2&&pb2.scrollIntoView) setTimeout(function(){ try{ pb2.scrollIntoView({block:"center"}); }catch(e){} },400);
      toast("FUNDING "+PRESELECT.toUpperCase()+" \\u2014 set XP/week and hit SUPPORT.");
    }catch(e){}
  }
  var rb=document.getElementById("mvRetry");
  if(rb) rb.onclick=function(){ CAUSES=SUBS=PRIZES=BURNS=null; el.innerHTML='<div class="c-load">Opening the war chest&hellip;</div>'; load(); };
}
/* ---------- 1. CAUSE POOLS ---------- */
function renderCauses(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; CAUSE POOLS — MONEY FOR THE FIGHT &#9670;</div>'
    +'<div class="x-note">Strike funds. Bail funds. Mutual aid. When the movement needs money fast, it comes from here — not from billionaires with strings attached.</div>';
  /* 6A-R9: sponsor mode banner — the cell whose treasury is on the line. */
  if(SPONSOR_CELL){
    var cnm=SPONSOR_CELL_NAME||SPONSOR_CELL;
    h+='<div class="x-note" style="border:1px solid #c1121f;padding:8px;margin:6px 0;background:#1c0a0a;">'
      +'&#9876; SPONSORING AS <b>CELL '+esc(cnm)+'</b> — treasury XP, not yours. '
      +'Founder/officers only; every sponsorship hits the war-room ticker.</div>';
  }
  var pools=(CAUSES&&CAUSES.ok&&CAUSES.pools)||[];
  if(!pools.length) h+='<div class="x-note">No cause pools yet.</div>';
  for(var i=0;i<pools.length;i++){
    var p=pools[i];
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(p.name)+'</b>'
      +'<div class="x-note">'+esc(p.description||"")+'</div>'
      +'<div class="x-note"><b>'+Number(p.balance||0).toLocaleString()+' XP</b> &bull; '+Number(p.donors||0)+' backers</div>';
    /* 6A-R9: "Sponsored by CELL <NAME>" attribution block. */
    var spons=p.sponsors||[];
    if(spons.length){
      h+='<div class="x-note" style="margin-top:4px">&#9876; <b>Sponsored by</b> '
        +spons.map(function(sp){
          return 'CELL '+esc(sp.cell_name||sp.cell_id)+' ('+Number(sp.amount||0).toLocaleString()+' XP)';
        }).join(' &middot; ')+'</div>';
    }
    h+='<div style="margin-top:6px"><input aria-label="XP" class="c-in pf-input-sm" data-causeamt="'+esc(p.id)+'" type="number" min="1" placeholder="XP" /> '
      +'<button class="c-btn" data-causefund="'+esc(p.id)+'">FUND</button>';
    /* 6A-R9: sponsor-from-treasury flow (officer-gated server-side). */
    if(SPONSOR_CELL){
      h+=' <input aria-label="Treasury XP" class="c-in pf-input-sm" data-sponsoramt="'+esc(p.id)+'" type="number" min="1" placeholder="Treasury XP" /> '
        +'<button class="c-btn" data-sponsor="'+esc(p.id)+'" style="border-color:#c1121f">SPONSOR FROM TREASURY</button>';
    }
    h+='</div></div></div>';
  }
  h+='</div>';
  /* 6A-R9: inter-cell sponsorship totals leaderboard. */
  h+=renderSponsorBoard();
  return h;
}
/* 6A-R9: inter-cell sponsorship totals — the rivalry stat. */
function renderSponsorBoard(){
  var board=(CAUSES&&CAUSES.ok&&CAUSES.sponsor_board)||[];
  if(!board.length) return '';
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; CELL SPONSORSHIP BOARD &#9670;</div>'
    +'<div class="x-note">Which cells put their treasury where their mouth is.</div>';
  for(var i=0;i<board.length;i++){
    var b=board[i];
    h+='<div class="cp-lead"><span class="cp-lname">'+(i+1)+'. CELL '+esc(b.cell_name||b.cell_id)+'</span> '
      +'<span class="cp-lxp">'+Number(b.total||0).toLocaleString()+' XP</span>'
      +'<div class="x-note">'+Number(b.sponsorships||0)+' sponsorships</div></div>';
  }
  h+='</div>';
  return h;
}
function wireCauses(id,el){
  var bs=el.querySelectorAll('button[data-causefund]');
  for(var i=0;i<bs.length;i++){ (function(btn){
    btn.onclick=function(){
      var pid=btn.getAttribute("data-causefund");
      var inp=el.querySelector('input[data-causeamt="'+pid+'"]');
      var amt=Math.round(Number(inp?inp.value:0)||0);
      if(amt<=0){ toast("Enter an amount."); return; }
      btn.disabled=true;
      post("finance","f_action","cause_donate",{callsign:id.callsign,device:id.device,pool_id:pid,amount:amt},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast(PF.errCopy(j,"Transfer failed.")); return; }
        toast("FUNDED "+amt+" XP. The movement thanks you.");
        api("cause_list",{},function(jj){ CAUSES=jj; render(); });
      });
    };
  })(bs[i]); }
  /* 6A-R9: sponsor-from-treasury wiring — officer-gated server-side
     (cause_sponsor). Native confirm() per the treasury-panel convention;
     the debit hits the CELL treasury, never the officer's wallet. */
  var ss=el.querySelectorAll('button[data-sponsor]');
  for(var k=0;k<ss.length;k++){ (function(btn){
    btn.onclick=function(){
      var pid=btn.getAttribute("data-sponsor");
      var inp=el.querySelector('input[data-sponsoramt="'+pid+'"]');
      var amt=Math.round(Number(inp?inp.value:0)||0);
      if(amt<=0){ toast("Enter a treasury amount."); return; }
      if(!id.callsign){ toast("Claim a callsign first."); return; }
      var cnm=SPONSOR_CELL_NAME||SPONSOR_CELL;
      if(!window.confirm("Sponsor "+amt+" XP from CELL "+cnm+" treasury to this cause? Officers only.")) return;
      btn.disabled=true;
      post("finance","f_action","cause_sponsor",{callsign:id.callsign,device:id.device,cell_id:SPONSOR_CELL,pool_id:pid,amount:amt},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast(PF.errCopy(j,"Sponsorship failed.")); return; }
        toast(j.dup?"Already sponsored — counted once.":"CELL "+(j.cell_name||cnm)+" SPONSORED "+amt+" XP. The ticker saw it.");
        api("cause_list",{},function(jj){ CAUSES=jj; render(); });
      });
    };
  })(ss[k]); }
}
/* ---------- 2. SUBSCRIPTIONS ---------- */
function renderSubs(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; CREATOR SUBSCRIPTIONS — PATRONAGE, MOVEMENT-STYLE &#9670;</div>'
    +'<div class="x-note">Weekly recurring XP to the creators who arm you. Cancel anytime. No platform takes a cut.</div>';
  var sup=(SUBS&&SUBS.ok&&SUBS.supporting)||[];
  h+='<div class="pb-sub">YOU SUPPORT ('+sup.length+')</div>';
  if(!sup.length) h+='<div class="x-note">You don&rsquo;t support anyone yet. Find a creator worth funding below.</div>';
  var total=0;
  for(var i=0;i<sup.length;i++){
    var s=sup[i]; total+=Number(s.amount_per_week||0);
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(s.creator)+'</b>'
      +'<div class="x-note">'+Number(s.amount_per_week).toLocaleString()+' XP/week &bull; since '+esc(fmtDate(s.started_at))+'</div></div>'
      +'<button class="c-btn" data-unsub="'+esc(s.creator)+'">STOP</button></div>';
  }
  if(sup.length) h+='<div class="x-note"><b>'+total.toLocaleString()+' XP/week</b> flowing to creators.</div>';
  h+='<div class="pb-sub pf-mt" >FIND CREATORS</div>'
    +(PRESELECT?'<div class="x-note" id="mvPre" style="border:1px solid #c1121f;padding:8px;margin:6px 0;background:#1c0a0a;">FUNDING <b>'+esc(PRESELECT)+'</b> &mdash; preloaded below. <a href="/war-chest" style="color:#dc143c;">clear</a></div>':'')
    +'<div><input aria-label="creator callsign" class="c-in pf-input-md" id="mvSubCs" type="text" placeholder="creator callsign" /> '
    +'<input aria-label="XP/week" class="c-in pf-input-sm" id="mvSubAmt" type="number" min="1" max="10000" placeholder="XP/week" /> '
    +'<button class="c-btn" id="mvSubBtn">SUPPORT</button></div>'
    +'<div class="c-err" id="mvSubErr"></div>';
  h+='</div>';
  return h;
}
function wireSubs(id,el){
  var b=document.getElementById("mvSubBtn");
  if(b) b.onclick=function(){
    var cr=String(document.getElementById("mvSubCs").value||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    var amt=Math.round(Number(document.getElementById("mvSubAmt").value)||0);
    var e=document.getElementById("mvSubErr"); e.textContent="";
    if(!cr||cr.length<3){ e.textContent="Enter a creator callsign."; return; }
    if(cr===id.callsign){ e.textContent="Cannot support yourself."; return; }
    if(amt<=0||amt>10000){ e.textContent="Amount must be 1–10,000 XP/week."; return; }
    b.disabled=true;
    post("finance","f_action","subscribe",{callsign:id.callsign,device:id.device,subscriber:id.callsign,creator:cr,amount_per_week:amt},function(j){
      b.disabled=false;
      if(!j||!j.ok){ e.textContent=PF.errCopy(j,"Failed."); return; }
      toast("SUPPORTING "+cr+" at "+amt+" XP/week.");
      document.getElementById("mvSubCs").value=""; document.getElementById("mvSubAmt").value="";
      api("subscription_list",{callsign:id.callsign},function(jj){ SUBS=jj; render(); });
    });
  };
  var us=el.querySelectorAll('button[data-unsub]');
  for(var i=0;i<us.length;i++){ (function(btn){
    btn.onclick=function(){
      var cr=btn.getAttribute("data-unsub"); btn.disabled=true;
      post("finance","f_action","unsubscribe",{callsign:id.callsign,device:id.device,subscriber:id.callsign,creator:cr},function(j){
        if(!j||!j.ok){ toast(PF.errCopy(j,"Failed.")); btn.disabled=false; return; }
        toast("Stopped supporting "+cr+".");
        api("subscription_list",{callsign:id.callsign},function(jj){ SUBS=jj; render(); });
      });
    };
  })(us[i]); }
}
/* ---------- 3. PRIZE POOLS ---------- */
function renderPrizes(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; PRIZE POOLS — CROWDFUNDED GLORY &#9670;</div>'
    +'<div class="x-note">The community puts up the stakes. Winners take all. Create a pool, fund it, fight for it.</div>'
    +'<div><input aria-label="pool title" class="c-in pf-input-md" id="mvPrizeTitle" type="text" maxlength="120" placeholder="pool title" /> '
    +'<input aria-label="target XP" class="c-in pf-input-sm" id="mvPrizeTarget" type="number" min="1" placeholder="target XP" /> '
    +'<button class="c-btn" id="mvPrizeBtn">CREATE POOL</button></div>'
    +'<div class="c-err" id="mvPrizeErr"></div><div style="height:8px"></div>';
  var pools=(PRIZES&&PRIZES.ok&&PRIZES.pools)||[];
  if(!pools.length) h+='<div class="x-note">No open pools. Start one.</div>';
  for(var i=0;i<pools.length;i++){
    var p=pools[i], pct=Math.min(100,Math.round(Number(p.raised||0)/Math.max(1,Number(p.target||1))*100));
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(p.title)+'</b>'
      +'<div class="x-note">by '+esc(p.created_by||"")+'</div>'
      +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>'
      +'<div class="x-note">'+Number(p.raised||0).toLocaleString()+' / '+Number(p.target||0).toLocaleString()+' XP ('+pct+'%)</div>'
      +'<div style="margin-top:6px"><input aria-label="XP" class="c-in pf-input-sm" data-prizeamt="'+esc(p.id)+'" type="number" min="1" placeholder="XP" /> '
      +'<button class="c-btn" data-prizecon="'+esc(p.id)+'">CONTRIBUTE</button></div></div></div>';
  }
  h+='</div>';
  return h;
}
function wirePrizes(id,el){
  var c=document.getElementById("mvPrizeBtn");
  if(c) c.onclick=function(){
    var t=String(document.getElementById("mvPrizeTitle").value||"").trim().slice(0,120);
    var tg=Math.round(Number(document.getElementById("mvPrizeTarget").value)||0);
    var e=document.getElementById("mvPrizeErr"); e.textContent="";
    if(!t){ e.textContent="Enter a title."; return; }
    if(tg<=0){ e.textContent="Enter a target."; return; }
    c.disabled=true;
    post("prize","p_action","prize_create",{callsign:id.callsign,device:id.device,title:t,target:tg},function(j){
      c.disabled=false;
      if(!j||!j.ok){ e.textContent=PF.errCopy(j,"Failed."); return; }
      toast("POOL CREATED. Now fund it.");
      document.getElementById("mvPrizeTitle").value=""; document.getElementById("mvPrizeTarget").value="";
      api("prize_list",{},function(jj){ PRIZES=jj; render(); });
    });
  };
  var bs=el.querySelectorAll('button[data-prizecon]');
  for(var i=0;i<bs.length;i++){ (function(btn){
    btn.onclick=function(){
      var pid=btn.getAttribute("data-prizecon");
      var inp=el.querySelector('input[data-prizeamt="'+pid+'"]');
      var amt=Math.round(Number(inp?inp.value:0)||0);
      if(amt<=0){ toast("Enter an amount."); return; }
      btn.disabled=true;
      post("prize","p_action","prize_contribute",{callsign:id.callsign,device:id.device,pool_id:pid,amount:amt},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast(PF.errCopy(j,"Failed.")); return; }
        toast("CONTRIBUTED "+amt+" XP to the pool.");
        api("prize_list",{},function(jj){ PRIZES=jj; render(); });
      });
    };
  })(bs[i]); }
}
/* ---------- 4. BURN LEADERBOARD ---------- */
function renderBurns(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; THE FURNACE — PROVE COMMITMENT &#9670;</div>'
    +'<div class="x-note">Burn XP permanently. No refund, no takeback. 1,000+ XP earns the <b>TRUE BELIEVER</b> badge. The ultimate flex is setting money on fire for the cause.</div>'
    +'<div><input aria-label="XP to burn" class="c-in pf-input-sm" id="mvBurnAmt" type="number" min="1" placeholder="XP to burn" /> '
    +'<input aria-label="reason (optional)" class="c-in pf-input-md" id="mvBurnWhy" type="text" maxlength="80" placeholder="reason (optional)" /> '
    +'<button class="c-btn" id="mvBurnBtn">BURN IT</button></div>'
    +'<div class="c-err" id="mvBurnErr"></div><div style="height:8px"></div>';
  var bs=(BURNS&&BURNS.ok&&BURNS.burners)||[];
  h+='<div class="pb-sub">HALL OF THE COMMITTED</div>';
  if(!bs.length) h+='<div class="x-note">Nobody has burned yet. Be the first to prove it.</div>';
  var me=null;
  for(var i=0;i<Math.min(bs.length,20);i++){
    var b=bs[i];
    if(b.callsign===id.callsign) me=b;
    h+='<div class="cp-lead"><span class="cp-lrank">'+(i+1)+'.</span> <span class="cp-lname">'+esc(b.callsign)+'</span> '
      +'<span class="cp-lxp">'+Number(b.total_burned||0).toLocaleString()+' XP</span>'
      +(Number(b.total_burned||0)>=1000?' <span class="cp-mdone">TRUE BELIEVER</span>':'')+'</div>';
  }
  if(me&&Number(me.total_burned||0)>=1000)
    h+='<div class="cp-pledged">&#9733; TRUE BELIEVER — you have burned '+Number(me.total_burned).toLocaleString()+' XP.</div>';
  h+='</div>';
  return h;
}
function wireBurns(id,el){
  var b=document.getElementById("mvBurnBtn");
  if(!b) return;
  b.onclick=function(){
    var amt=Math.round(Number(document.getElementById("mvBurnAmt").value)||0);
    var why=String(document.getElementById("mvBurnWhy").value||"").trim().slice(0,80);
    var e=document.getElementById("mvBurnErr"); e.textContent="";
    if(amt<=0){ e.textContent="Enter an amount."; return; }
    if(!confirm("Burn "+amt+" XP forever? This cannot be undone.")) return;
    b.disabled=true;
    post("finance","f_action","xp_burn",{callsign:id.callsign,device:id.device,amount:amt,reason:why},function(j){
      b.disabled=false;
      if(!j||!j.ok){ e.textContent=PF.errCopy(j,"Burn failed."); return; }
      toast("BURNED "+amt+" XP."+(j.badge?" TRUE BELIEVER badge earned.":""));
      document.getElementById("mvBurnAmt").value=""; document.getElementById("mvBurnWhy").value="";
      api("burn_leaderboard",{},function(jj){ BURNS=jj; render(); });
    });
  };
}
/* ---------- 5. REMITTANCES — link to the Bank ---------- */
function renderRemitLink(){
  return '<div class="x-pane"><div class="pb-bankhead">&#9670; TRANSFERS &#9670;</div>'
    +'<div class="x-note">Cross-cell XP transfers live at the <b>Peoples Bank of Propaganda</b> — Teller Window No. 2. '
    +'2% fee funds the community lottery. One bank, one ledger, no duplication.</div></div>';
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="movement"]'); }catch(e){}
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
