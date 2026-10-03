/* games/peoplesbank.js  |  PF v1.4.3 | THE PEOPLES BANK OF PROPAGANDA.
   A virtual bank branch: the everyday financial institution where soldiers
   manage their XP. Account overview, transfers, savings, loans, war bonds,
   full transaction history. Reads via JSONP (self-contained api()), writes
   via CORS POST (self-contained post()). It never reaches into another
   silo's internals. Does NOT duplicate economy.js (staking, auctions,
   cosmetics, treasury, gambling) or casino.js — the Bank is for everyday
   banking: balances, transfers, savings, loans, bonds, history.
   KILL: ?pf_off=peoplesbank  or  localStorage pf_disabled_v1='["peoplesbank"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("peoplesbank")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-peoplesbank">
<div class="fe-block pf-override-block pf-silo" id="pf-peoplesbank">
<h2>The Peoples Bank of Propaganda</h2>
<div class="c-tag">Your money. Your movement. No billionaires on the board.</div>
<div id="xPBank"><div class="c-load">Opening the vault&hellip;</div></div>
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
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"||action==="bank_status"||action==="tip_history"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfPbCb"+Math.floor(Math.random()*1e9);
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
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function fmtDur(ms){
  if(ms<=0) return "now";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;
  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);
  var out=""; if(d>0)out+=d+"d "; if(h>0||d>0)out+=h+"h "; out+=m+"m";
  return out.trim();
}
function fmtDate(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }
}
function fmtTime(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var hh=d.getHours(), ap=hh>=12?"PM":"AM"; hh=hh%12; if(hh===0)hh=12;
    var mm=("0"+d.getMinutes()).slice(-2);
    return mo[d.getMonth()]+" "+d.getDate()+" "+hh+":"+mm+" "+ap; }catch(e){ return ""; }
}
function acctNum(cs){
  var h=0; var s=String(cs||"").toUpperCase();
  for(var i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; }
  h=Math.abs(h);
  return "PB-"+("000000"+(h%1000000)).slice(-6);
}
var BAL=null, SAV=null, STK=null, BND=null, LNS=null, RH=null, XH=null, MEMBER_SINCE=null;
var BST=null, TAB="vault", VAULT_LAST="deposit";
var HIST_FILTER="all";
function load(){
  var id=ident(), done=false, n=0, need=8;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("xp_balance",{callsign:id.callsign},function(j){ BAL=j; one(); });
  api("bank_status",{callsign:id.callsign},function(j){ BST=j; one(); });
  api("savings_balance",{callsign:id.callsign},function(j){ SAV=j; one(); });
  api("stake_list",{callsign:id.callsign},function(j){ STK=j; one(); });
  api("bond_list",{callsign:id.callsign},function(j){ BND=j; one(); });
  api("loan_list",{callsign:id.callsign},function(j){ LNS=j; one(); });
  api("remit_history",{callsign:id.callsign},function(j){ RH=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:100},function(j){
    XH=j;
    try{
      var es=(j&&j.entries)||[];
      if(es.length) MEMBER_SINCE=es[es.length-1].ts;
    }catch(e){}
    one();
  });
}
function gate(){
  var id=ident();
  if(!id.callsign) return PF.gateHTML('The Bank serves callsign holders.','to open an account');
  return "";
}
function netWorth(){
  var liq=(BAL&&typeof BAL.balance==="number")?BAL.balance:0;
  var sav=(SAV&&SAV.ok)?Number(SAV.balance||0):0;
  var stk=0;
  try{ var ss=(STK&&STK.stakes)||[]; for(var i=0;i<ss.length;i++){ if(!ss[i].claimed) stk+=Number(ss[i].amount||0); } }catch(e){}
  var bnd=0;
  try{ var bb=(BND&&BND.ok&&BND.bonds)||[]; for(var q=0;q<bb.length;q++){ if(!bb[q].redeemed) bnd+=Number(bb[q].amount||0); } }catch(e){}
  var lendOut=0, owe=0;
  try{
    var al=(LNS&&LNS.ok&&LNS.as_lender)||[];
    for(var a=0;a<al.length;a++){ if(!al[a].repaid) lendOut+=Number(al[a].principal||0); }
    var ab=(LNS&&LNS.ok&&LNS.as_borrower)||[];
    for(var b=0;b<ab.length;b++){ if(!ab[b].repaid) owe+=Number(ab[b].principal||0)+Math.round(Number(ab[b].principal||0)*Number(ab[b].interest_pct||0)/100); }
  }catch(e2){}
  return { liq:liq, sav:sav, stk:stk, bnd:bnd, lendOut:lendOut, owe:owe,
    total: Math.round(liq+sav+stk+bnd+lendOut-owe) };
}
var TABS=[["vault","VAULT"],["teller","TRANSFERS"],["savings","SAVINGS"],["loans","LOANS"],["bonds","BONDS"],["history","LEDGER"]];
function renderTabs(){
  var h='<div class="pb-tabs" style="display:flex;gap:6px;overflow-x:auto;margin:10px 0;padding-bottom:4px;">';
  for(var i=0;i<TABS.length;i++){
    var k=TABS[i][0], lbl=TABS[i][1];
    h+='<button class="c-btn'+(TAB===k?"":" ghost")+' pf-btn-sm pb-tab" data-pbtab="'+k+'" style="white-space:nowrap;'+(TAB===k?"":"opacity:.75;")+'">'+lbl+'</button>';
  }
  h+='</div>';
  return h;
}
function render(){
  var el=document.getElementById("xPBank"); if(!el) return;
  var id=ident(), h="", g=gate();
  if(g){ el.innerHTML=g; return; }
  h+=renderTabs();
  if(TAB==="vault") h+=renderVault(id);
  else if(TAB==="teller") h+=renderTeller(id);
  else if(TAB==="savings") h+=renderSavings(id);
  else if(TAB==="loans") h+=renderLoans(id);
  else if(TAB==="bonds") h+=renderBonds(id);
  else if(TAB==="history") h+=renderHistory(id);
  h+='<div style="margin-top:10px"><button class="c-btn" id="pbRetry">Refresh</button></div>';
  el.innerHTML=h;
  var ts=el.querySelectorAll('button[data-pbtab]');
  for(var i=0;i<ts.length;i++){ (function(btn){
    btn.onclick=function(){ TAB=btn.getAttribute("data-pbtab"); render(); };
  })(ts[i]); }
  if(TAB==="vault") wireVault(id,el);
  else if(TAB==="teller") wireTeller(id,el);
  else if(TAB==="savings") wireSavings(id,el);
  else if(TAB==="loans") wireLoans(id,el);
  else if(TAB==="bonds") wireBonds(id,el);
  else if(TAB==="history") wireHistory(id,el);
  var rb=document.getElementById("pbRetry");
  if(rb) rb.onclick=function(){ BAL=SAV=STK=BND=LNS=RH=XH=BST=null; el.innerHTML='<div class="c-load">Opening the vault&hellip;</div>'; load(); };
  var vr=document.getElementById("pbVaultRetry");
  if(vr) vr.onclick=function(){ BAL=SAV=STK=BND=LNS=RH=XH=BST=null; el.innerHTML='<div class="c-load">Opening the vault&hellip;</div>'; load(); };
}
/* ---------- 0. VAULT — the clean default: balance, rate, deposit/withdraw, room, activity ---------- */
var VAULT_KIND_LBL={overtime:"overtime kicker",deposit:"deposit",withdraw:"withdrawal",interest:"interest",pledge_out:"venture pledge",pledge_back:"pledge returned",dividend:"dividend"};
function renderVault(id){
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; THE VAULT &#9670;</div>';
  if(!BST||!BST.ok){
    h+='<div class="c-neterr">The vault did not answer. Your XP is safe &mdash; the wire is not.'
      +'<br><button class="c-btn" id="pbVaultRetry">Retry connection</button></div></div>';
    return h;
  }
  var bal=Math.round(Number(BST.balance)||0);
  var rate=Number(BST.rate_pct)||0;
  var used=Math.round(Number(BST.deposit_week_used)||0), cap=Math.round(Number(BST.deposit_week_cap)||0);
  var room=Math.max(0,cap-used), pct=cap>0?Math.min(100,Math.round(100*used/cap)):0;
  var spendable=(BAL&&typeof BAL.balance==="number")?Math.round(BAL.balance):null;
  /* big balance */
  h+='<div style="text-align:center;padding:18px 8px 6px;">'
    +'<div style="font-size:44px;line-height:1;color:#f5f0e6;">'+bal.toLocaleString()+' <span style="font-size:18px;color:#c1121f;">XP</span></div>'
    +'<div class="x-note" style="margin:8px 0 0;">in the vault &middot; ACCT '+esc(acctNum(id.callsign))+'</div></div>';
  /* interest rate */
  h+='<div class="x-note" style="text-align:center;margin:6px 0 0;">Earning <b>'+rate+'%/week</b>';
  if(BST.credit&&BST.credit.cell_name) h+=' &middot; cell <b>'+esc(BST.credit.cell_name)+'</b> boosts your rate';
  else h+=' &middot; join a cell to raise it (up to 7%)';
  h+='</div>';
  if(Number(BST.interest_paid)>0) h+='<div class="x-note" style="text-align:center;color:#4caf50;">+'+Math.round(Number(BST.interest_paid))+' XP interest just landed.</div>';
  /* weekly room */
  h+='<div style="margin:12px 0 4px;"><div class="x-note" style="margin:0 0 6px;">Weekly deposit room: <b>'+room.toLocaleString()+' XP</b> left</div>'
    +'<div style="background:#111;border:1px solid #333;height:10px;">'
    +'<div style="background:#c1121f;height:100%;width:'+pct+'%;"></div></div></div>';
  /* amount + chips + buttons (POST-only writes — never GET) */
  h+='<div style="margin-top:10px;">'
    +'<div class="x-note" style="margin:0 0 6px;">Spendable: <b>'+(spendable==null?"?":spendable.toLocaleString())+' XP</b></div>'
    +'<input class="c-in" id="pbVltAmt" type="number" min="1" inputmode="numeric" placeholder="Amount" aria-label="XP amount" style="margin-bottom:8px;">'
    +'<div style="margin-bottom:8px;">'
    +'<button class="c-btn ghost pf-btn-sm" data-vchip="50">50</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-vchip="100">100</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-vchip="250">250</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-vchip="ALL">ALL</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;">'
    +'<button class="c-btn" id="pbVltDep" style="flex:1;margin:0;">DEPOSIT</button>'
    +'<button class="c-btn ghost" id="pbVltWdr" style="flex:1;margin:0;">WITHDRAW</button>'
    +'</div>'
    +'<div class="c-err" id="pbVltErr"></div>'
    +'<div class="x-note" style="margin:8px 0 0;">Withdrawals are free — but XP pulled before Monday forfeits the week\\\'s interest on it.</div>'
    +'</div>';
  /* overtime kicker (2026-10-03 H7): log a shift, bank XP up to the daily cap */
  var otUsed=Math.round(Number(BST.overtime_today)||0), otCap=Math.round(Number(BST.overtime_cap)||0);
  var otRoom=Math.max(0,otCap-otUsed);
  h+='<div style="margin-top:12px;border-top:1px solid #333;padding-top:10px;">'
    +'<div class="x-note" style="margin:0 0 6px;"><b style="letter-spacing:2px;">OVERTIME KICKER</b> &mdash; worked a shift? Bank it: <b>'+otUsed+'/'+otCap+' XP</b> today'+(otRoom>0?(' ('+otRoom+' room)'):(' (capped)'))+'</div>'
    +'<div style="display:flex;gap:8px;">'
    +'<input class="c-in" id="pbOtAmt" type="number" min="1" max="50" inputmode="numeric" placeholder="XP" aria-label="Overtime XP" style="flex:1;margin:0;">'
    +'<button class="c-btn" id="pbOtLog" style="flex:2;margin:0;">LOG OVERTIME</button>'
    +'</div><div class="c-err" id="pbOtErr"></div></div>';
  /* recent activity — last 5 */
  var hist=(BST.history||[]).slice(0,5);
  h+='<div style="margin-top:12px;"><div class="x-note" style="margin:0 0 6px;"><b style="letter-spacing:2px;">RECENT ACTIVITY</b></div>';
  if(!hist.length) h+='<div class="x-note">Nothing yet. Make your first deposit.</div>';
  for(var i=0;i<hist.length;i++){
    var t=hist[i], d=Math.round(Number(t.delta)||0);
    h+='<div class="pb-row"><span class="pb-'+(d>=0?"in":"out")+'">'+(d>=0?"+":"")+d.toLocaleString()+' XP</span>'
      +' <span>'+esc(VAULT_KIND_LBL[t.kind]||t.kind||"")+'</span>'
      +'<span class="x-note"> '+esc(fmtTime(t.ts))+'</span></div>';
  }
  h+='</div>';
  /* net-worth strip — keeps the old account-overview functionality, compact */
  var nw=netWorth();
  h+='<div style="margin-top:12px;"><div class="x-note" style="margin:0 0 6px;"><b style="letter-spacing:2px;">FULL PICTURE</b> &middot; net worth '+nw.total.toLocaleString()+' XP</div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">LIQUID</div><div class="pb-cval">'+Math.round(nw.liq).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SAVINGS</div><div class="pb-cval">'+Math.round(nw.sav).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">STAKED</div><div class="pb-cval">'+Math.round(nw.stk).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">WAR BONDS</div><div class="pb-cval">'+Math.round(nw.bnd).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">LOANS OUT</div><div class="pb-cval">+'+Math.round(nw.lendOut).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">YOU OWE</div><div class="pb-cval pb-neg">-'+Math.round(nw.owe).toLocaleString()+'</div></div>'
    +'</div></div>';
  if(MEMBER_SINCE) h+='<div class="x-note" style="margin-top:8px;">MEMBER SINCE '+esc(fmtDate(MEMBER_SINCE))+'</div>';
  h+='</div>';
  return h;
}
function wireVault(id,el){
  function balNow(){ return (BST&&BST.ok)?Math.round(Number(BST.balance)||0):0; }
  function spendNow(){ return (BAL&&typeof BAL.balance==="number")?Math.round(BAL.balance):0; }
  var chips=el.querySelectorAll('button[data-vchip]');
  for(var i=0;i<chips.length;i++){ (function(ch){
    ch.onclick=function(){
      var v=ch.getAttribute("data-vchip"), inp=document.getElementById("pbVltAmt");
      if(!inp) return;
      if(v==="ALL"){
        var max=VAULT_LAST==="withdraw"?balNow():spendNow();
        inp.value=Math.max(0,max);
      } else inp.value=v;
    };
  })(chips[i]); }
  function doTransfer(isDep,btn){
    var amt=Math.round(Number(document.getElementById("pbVltAmt").value)||0);
    var err=document.getElementById("pbVltErr"), iid=ident();
    if(err) err.textContent="";
    if(!amt||amt<1){ if(err) err.textContent="Enter an amount."; return; }
    VAULT_LAST=isDep?"deposit":"withdraw";
    btn.disabled=true;
    /* POST-only: backend rejects GET writes (CSRF defense). */
    post("bank","b_action",isDep?"deposit":"withdraw",
      {callsign:iid.callsign,device:iid.device,amount:amt,key:iid.device+":"+Date.now()},
      function(j){
        btn.disabled=false;
        if(j&&j.ok){ toast(isDep?("+"+amt.toLocaleString()+" XP in the vault."):(amt.toLocaleString()+" XP withdrawn to spendable.")); }
        else if(err){ err.textContent=(j&&(j.err||j.error))||"Transfer failed."; }
        setTimeout(function(){
          api("bank_status",{callsign:iid.callsign},function(jj){ BST=jj; render(); });
          api("xp_balance",{callsign:iid.callsign},function(j2){ BAL=j2; render(); });
        },1200);
      });
  }
  var dep=document.getElementById("pbVltDep"), wd=document.getElementById("pbVltWdr");
  if(dep) dep.onclick=function(){ doTransfer(true,dep); };
  if(wd) wd.onclick=function(){ doTransfer(false,wd); };
  /* overtime kicker: POST-only bank write (2026-10-03 H7) */
  var otb=document.getElementById("pbOtLog");
  if(otb) otb.onclick=function(){
    var amtEl=document.getElementById("pbOtAmt");
    var amt=Math.round(Number(amtEl&&amtEl.value)||0);
    var err=document.getElementById("pbOtErr"), iid=ident();
    if(err) err.textContent="";
    if(!amt||amt<1){ if(err) err.textContent="Enter an amount."; return; }
    otb.disabled=true;
    post("bank","b_action","overtime",{callsign:iid.callsign,device:iid.device,amount:amt,key:iid.device+":"+Date.now()},function(j){
      otb.disabled=false;
      if(j&&j.ok){ toast("OVERTIME LOGGED. +"+amt+" XP in the vault."); }
      else if(err){ err.textContent=(j&&(j.err||j.error))||"Log failed."; }
      setTimeout(function(){
        api("bank_status",{callsign:iid.callsign},function(jj){ BST=jj; render(); });
      },1200);
    });
  };
}
/* ---------- 1. ACCOUNT OVERVIEW (the lobby) ---------- */
function renderLobby(id){
  var nw=netWorth();
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; TELLER WINDOW No. 1 — ACCOUNT OVERVIEW &#9670;</div>'
    +'<div class="pb-acct"><span>ACCT '+esc(acctNum(id.callsign))+'</span> &bull; <span>'+esc(id.callsign)+'</span>'
    +(MEMBER_SINCE?(' &bull; <span>MEMBER SINCE '+esc(fmtDate(MEMBER_SINCE))+'</span>'):'')
    +'</div>'
    +'<div class="pb-networth"><div class="pb-nwlabel">TOTAL NET WORTH</div>'
    +'<div class="pb-nwval">'+nw.total.toLocaleString()+' XP</div></div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">LIQUID</div><div class="pb-cval">'+Math.round(nw.liq).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SAVINGS</div><div class="pb-cval">'+Math.round(nw.sav).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">STAKED</div><div class="pb-cval">'+Math.round(nw.stk).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">WAR BONDS</div><div class="pb-cval">'+Math.round(nw.bnd).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">LOANS OUT</div><div class="pb-cval">+'+Math.round(nw.lendOut).toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">YOU OWE</div><div class="pb-cval pb-neg">-'+Math.round(nw.owe).toLocaleString()+'</div></div>'
    +'</div></div>';
  return h;
}
/* ---------- 2. TELLER WINDOW — TRANSFERS ---------- */
function renderTeller(id){
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; TELLER WINDOW No. 2 — TRANSFERS &#9670;</div>'
    +'<div class="x-note">Send XP to any soldier. 2% fee funds the community lottery pot. No billionaires take a cut here.</div>'
    +'<div><input aria-label="recipient callsign" class="c-in pf-input-md" id="pbToCs" type="text" placeholder="recipient callsign" /> '
    +'<input aria-label="XP" class="c-in" id="pbToAmt" type="number" min="1" placeholder="XP" style="width:100px"/> '
    +'<input aria-label="message (optional)" class="c-in pf-input-md" id="pbToMsg" type="text" maxlength="80" placeholder="message (optional)" /> '
    +'<button class="c-btn" id="pbSendBtn">SEND</button></div>'
    +'<div class="c-err" id="pbSendErr"></div><div style="height:8px"></div>';
  var sent=(RH&&RH.ok&&RH.sent)||[], recv=(RH&&RH.ok&&RH.received)||[];
  h+='<div class="pb-hist"><div class="x-note"><b>Recent transfers</b></div>';
  var all=[];
  for(var i=0;i<sent.length;i++) all.push({dir:"out",other:sent[i].other,amount:sent[i].amount,fee:sent[i].fee,ts:sent[i].ts});
  for(var q=0;q<recv.length;q++) all.push({dir:"in",other:recv[q].other,amount:recv[q].amount,fee:recv[q].fee,ts:recv[q].ts});
  all.sort(function(a,b){ return Number(b.ts)-Number(a.ts); });
  if(!all.length) h+='<div class="x-note">No transfers yet. Money that doesn&rsquo;t move doesn&rsquo;t fight.</div>';
  for(var w=0;w<Math.min(all.length,10);w++){
    var t=all[w];
    h+='<div class="pb-row"><span class="pb-'+(t.dir==="in"?"in":"out")+'">'+(t.dir==="in"?"+":"-")+Number(t.amount).toLocaleString()+' XP</span>'
      +' <span>'+(t.dir==="in"?"from":"to")+' '+esc(t.other)+'</span>'
      +'<span class="x-note"> '+esc(fmtTime(t.ts))+(t.fee?' &bull; fee '+Number(t.fee)+' XP':'')+'</span></div>';
  }
  h+='</div></div>';
  return h;
}
function wireTeller(id,el){
  var b=document.getElementById("pbSendBtn");
  if(!b) return;
  b.onclick=function(){
    var to=String(document.getElementById("pbToCs").value||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    var amt=Math.round(Number(document.getElementById("pbToAmt").value)||0);
    var err=document.getElementById("pbSendErr");
    err.textContent="";
    if(!to||to.length<3){ err.textContent="Enter a valid recipient callsign."; return; }
    if(to===id.callsign){ err.textContent="Cannot send to yourself."; return; }
    if(amt<=0){ err.textContent="Enter an amount."; return; }
    var fee=Math.max(1,Math.round(amt*0.02));
    if(!confirm("Send "+amt+" XP to "+to+"? Fee: "+fee+" XP. They receive "+(amt-fee)+" XP.")) return;
    b.disabled=true;
    post("remit","r_action","remit_send",{callsign:id.callsign,device:id.device,to_cs:to,amount:amt},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Transfer failed."; b.disabled=false; return; }
      toast("SENT. "+to+" receives "+(j.received||amt)+" XP.");
      document.getElementById("pbToCs").value=""; document.getElementById("pbToAmt").value=""; document.getElementById("pbToMsg").value="";
      b.disabled=false;
      api("remit_history",{callsign:id.callsign},function(jj){ RH=jj; render(); });
      api("xp_balance",{callsign:id.callsign},function(jj2){ BAL=jj2; render(); });
    });
  };
}
/* ---------- 3. SAVINGS DESK ---------- */
function renderSavings(id){
  var bal=(SAV&&SAV.ok)?Number(SAV.balance||0):0;
  var acc=(SAV&&SAV.ok)?Number(SAV.accrued||0):0;
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; SAVINGS DESK — 2% APY, NO LOCK-UP &#9670;</div>'
    +'<div class="pb-balrow"><span class="pb-blabel">SAVINGS BALANCE</span><span class="pb-bval">'+Math.round(bal).toLocaleString()+' XP</span></div>'
    +(acc>0?'<div class="x-note">+'+acc.toFixed(2)+' XP interest accrued since last visit. It compounds while you sleep.</div>':'')
    +'<div class="x-note">For the cautious. Staking (in XP Economy) pays more but locks your funds. Savings is always liquid.</div>'
    +'<div><input aria-label="XP amount" class="c-in pf-input-sm" id="pbSavAmt" type="number" min="1" placeholder="XP amount" /> '
    +'<button class="c-btn" id="pbSavDep">DEPOSIT</button> '
    +'<button class="c-btn" id="pbSavWdr">WITHDRAW</button></div>'
    +'<div class="c-err" id="pbSavErr"></div></div>';
  return h;
}
function wireSavings(id,el){
  function amtOf(){
    var a=Math.round(Number(document.getElementById("pbSavAmt").value)||0);
    var e=document.getElementById("pbSavErr"); e.textContent="";
    if(a<=0){ e.textContent="Enter an amount."; return 0; }
    return a;
  }
  function refresh(){
    api("savings_balance",{callsign:id.callsign},function(j){ SAV=j; render(); });
    api("xp_balance",{callsign:id.callsign},function(j2){ BAL=j2; render(); });
  }
  var d=document.getElementById("pbSavDep");
  if(d) d.onclick=function(){
    var a=amtOf(); if(!a) return; d.disabled=true;
    post("finance","f_action","savings_deposit",{callsign:id.callsign,device:id.device,amount:a},function(j){
      d.disabled=false;
      if(!j||!j.ok){ document.getElementById("pbSavErr").textContent=(j&&j.err)||"Deposit failed."; return; }
      toast("DEPOSITED "+a+" XP. Slow and steady.");
      refresh();
    });
  };
  var w=document.getElementById("pbSavWdr");
  if(w) w.onclick=function(){
    var a=amtOf(); if(!a) return; w.disabled=true;
    post("finance","f_action","savings_withdraw",{callsign:id.callsign,device:id.device,amount:a},function(j){
      w.disabled=false;
      if(!j||!j.ok){ document.getElementById("pbSavErr").textContent=(j&&j.err)||"Withdrawal failed."; return; }
      toast("WITHDREW "+a+" XP. Back in your pocket.");
      refresh();
    });
  };
}
/* ---------- 4. LOAN DESK ---------- */
function loanRepayTotal(l){
  return Number(l.principal||0)+Math.round(Number(l.principal||0)*Number(l.interest_pct||0)/100);
}
function renderLoans(id){
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; LOAN DESK — PEOPLE LENDING TO PEOPLE &#9670;</div>'
    +'<div class="x-note">The bank doesn&rsquo;t lend. Soldiers lend to soldiers. Max 50% interest — no loan sharks in this branch.</div>';
  /* create offer */
  h+='<div class="pb-sub">MAKE A LOAN OFFER</div>'
    +'<div><input aria-label="borrower callsign" class="c-in pf-input-md" id="pbLnTo" type="text" placeholder="borrower callsign" /> '
    +'<input aria-label="principal XP" class="c-in pf-input-sm" id="pbLnAmt" type="number" min="1" placeholder="principal XP" /> '
    +'<input aria-label="interest %" class="c-in pf-input-sm" id="pbLnInt" type="number" min="0" max="50" placeholder="interest %" /> '
    +'<select class="c-in" id="pbLnDur"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select> '
    +'<button class="c-btn" id="pbLnOffer">OFFER LOAN</button></div>'
    +'<div class="c-err" id="pbLnErr"></div><div style="height:10px"></div>';
  /* as borrower: incoming offers to accept */
  var ab=(LNS&&LNS.ok&&LNS.as_borrower)||[];
  var al=(LNS&&LNS.ok&&LNS.as_lender)||[];
  h+='<div class="pb-sub">YOUR LOANS — BORROWING ('+ab.filter(function(l){return !l.repaid;}).length+' active)</div>';
  if(!ab.length) h+='<div class="x-note">Nobody has offered you a loan. Build trust, build credit.</div>';
  for(var i=0;i<ab.length;i++){
    var b=ab[i], total=loanRepayTotal(b), due=Number(b.due_at)-Date.now();
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+Number(b.principal).toLocaleString()+' XP</b> from '+esc(b.lender)
      +'<div class="x-note">Interest: '+Number(b.interest_pct||0)+'% &bull; repay '+total.toLocaleString()+' XP &bull; '
      +(b.repaid?'<span class="cp-mdone">REPAID</span>':(due>0?('due in '+esc(fmtDur(due))):'<b>OVERDUE</b>'))+'</div></div>';
    if(!b.repaid) h+='<button class="c-btn" data-lnrepay="'+esc(b.id)+'">REPAY '+total.toLocaleString()+'</button>';
    h+='</div>';
  }
  h+='<div class="pb-sub">YOUR LOANS — LENDING ('+al.filter(function(l){return !l.repaid;}).length+' active)</div>';
  if(!al.length) h+='<div class="x-note">You haven&rsquo;t lent to anyone. Capital that sits still is capital wasted.</div>';
  for(var q=0;q<al.length;q++){
    var l2=al[q], t2=loanRepayTotal(l2), d2=Number(l2.due_at)-Date.now();
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+Number(l2.principal).toLocaleString()+' XP</b> to '+esc(l2.borrower)
      +'<div class="x-note">Interest: '+Number(l2.interest_pct||0)+'% &bull; owed '+t2.toLocaleString()+' XP &bull; '
      +(l2.repaid?'<span class="cp-mdone">REPAID</span>':(d2>0?('due in '+esc(fmtDur(d2))):'<b>OVERDUE</b>'))+'</div></div>'
      +(l2.repaid?'<div class="cp-mdone">CLOSED</div>'
        :l2.cancelled?'<div class="x-note">CANCELLED &mdash; principal refunded</div>'
        :'<div><div class="x-note">AWAITING REPAYMENT</div><button class="c-btn ghost" data-lncancel="'+esc(l2.id)+'">CANCEL OFFER</button></div>')
      +'</div>';
  }
  h+='</div>';
  return h;
}
function wireLoans(id,el){
  var o=document.getElementById("pbLnOffer");
  if(o) o.onclick=function(){
    var to=String(document.getElementById("pbLnTo").value||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    var amt=Math.round(Number(document.getElementById("pbLnAmt").value)||0);
    var pct=Math.round(Number(document.getElementById("pbLnInt").value)||0);
    var dur=Number(document.getElementById("pbLnDur").value)||7;
    var e=document.getElementById("pbLnErr"); e.textContent="";
    if(!to||to.length<3){ e.textContent="Enter a borrower callsign."; return; }
    if(to===id.callsign){ e.textContent="Cannot lend to yourself."; return; }
    if(amt<=0){ e.textContent="Enter a principal."; return; }
    if(pct<0||pct>50){ e.textContent="Interest must be 0–50%."; return; }
    o.disabled=true;
    post("finance","f_action","loan_offer",{callsign:id.callsign,device:id.device,borrower:to,principal:amt,interest_pct:pct,duration_days:dur},function(j){
      o.disabled=false;
      if(!j||!j.ok){ e.textContent=(j&&j.err)||"Offer failed."; return; }
      toast("LOAN OFFERED. "+to+" can accept it at the Loan Desk.");
      api("loan_list",{callsign:id.callsign},function(jj){ LNS=jj; render(); });
    });
  };
  var rps=el.querySelectorAll('button[data-lnrepay]');
  for(var i=0;i<rps.length;i++){ (function(btn){
    btn.onclick=function(){
      var lid=btn.getAttribute("data-lnrepay"); btn.disabled=true;
      post("finance","f_action","loan_repay",{callsign:id.callsign,device:id.device,loan_id:lid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Repayment failed."); btn.disabled=false; return; }
        toast("LOAN REPAID. Your credit stands.");
        api("loan_list",{callsign:id.callsign},function(jj){ LNS=jj; render(); });
        api("xp_balance",{callsign:id.callsign},function(j2){ BAL=j2; render(); });
      });
    };
  })(rps[i]); }
  /* lender cancel: kill your own unaccepted offer, principal refunded (2026-10-03 H7) */
  var lcs=el.querySelectorAll('button[data-lncancel]');
  for(var li=0;li<lcs.length;li++){ (function(btn){
    btn.onclick=function(){
      var lid=btn.getAttribute("data-lncancel");
      if(!window.confirm("Cancel this loan offer? The principal returns to you.")) return;
      btn.disabled=true;
      post("finance","f_action","loan_cancel",{callsign:id.callsign,device:id.device,loan_id:lid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Cancel failed."); btn.disabled=false; return; }
        toast("OFFER CANCELLED. Principal refunded.");
        api("loan_list",{callsign:id.callsign},function(jj){ LNS=jj; render(); });
      });
    };
  })(lcs[li]); }
}
/* ---------- 5. BOND DESK ---------- */
function renderBonds(id){
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; BOND DESK — WAR BONDS, 20% IN 30 DAYS &#9670;</div>'
    +'<div class="x-note">Buy the war effort. Your XP funds the fight; in 30 days it comes back 20% heavier. The billionaires&rsquo; bonds fund yachts. Ours fund the revolution.</div>'
    +'<div><input aria-label="XP to invest" class="c-in pf-input-sm" id="pbBondAmt" type="number" min="1" placeholder="XP to invest" /> '
    +'<button class="c-btn" id="pbBondBuy">BUY BOND</button></div>'
    +'<div class="c-err" id="pbBondErr"></div><div style="height:8px"></div>';
  var bonds=(BND&&BND.ok&&BND.bonds)||[];
  var active=bonds.filter(function(b){ return !b.redeemed; });
  h+='<div class="pb-sub">YOUR BONDS ('+active.length+' active)</div>';
  if(!bonds.length) h+='<div class="x-note">No bonds. The war effort needs financiers.</div>';
  for(var i=0;i<bonds.length;i++){
    var b=bonds[i], matured=Date.now()>=Number(b.matures_at);
    var payout=Math.round(Number(b.amount)*1.2);
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+Number(b.amount).toLocaleString()+' XP</b> bond'
      +'<div class="x-note">Matures to <b>'+payout.toLocaleString()+' XP</b> &bull; '
      +(b.redeemed?'<span class="cp-mdone">REDEEMED</span>':(matured?'MATURED — claim it':'matures in '+esc(fmtDur(Number(b.matures_at)-Date.now()))))
      +' &bull; bought '+esc(fmtDate(b.bought_at))+'</div></div>';
    if(!b.redeemed&&matured) h+='<button class="c-btn" data-bondid="'+b.id+'">REDEEM '+payout.toLocaleString()+'</button>';
    else if(!b.redeemed) h+='<div class="x-note">LOCKED</div>';
    else h+='<div class="cp-mdone">PAID</div>';
    h+='</div>';
  }
  h+='</div>';
  return h;
}
function wireBonds(id,el){
  var b=document.getElementById("pbBondBuy");
  if(b) b.onclick=function(){
    var a=Math.round(Number(document.getElementById("pbBondAmt").value)||0);
    var e=document.getElementById("pbBondErr"); e.textContent="";
    if(a<=0){ e.textContent="Enter an amount."; return; }
    b.disabled=true;
    post("finance","f_action","bond_buy",{callsign:id.callsign,device:id.device,amount:a},function(j){
      b.disabled=false;
      if(!j||!j.ok){ e.textContent=(j&&j.err)||"Purchase failed."; return; }
      toast("BOND BOUGHT. +20% in 30 days. The war effort thanks you.");
      api("bond_list",{callsign:id.callsign},function(jj){ BND=jj; render(); });
      api("xp_balance",{callsign:id.callsign},function(j2){ BAL=j2; render(); });
    });
  };
  var rds=el.querySelectorAll('button[data-bondid]');
  for(var i=0;i<rds.length;i++){ (function(btn){
    btn.onclick=function(){
      var bid=btn.getAttribute("data-bondid"); btn.disabled=true;
      post("finance","f_action","bond_redeem",{callsign:id.callsign,device:id.device,bond_id:bid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Redemption failed."); btn.disabled=false; return; }
        toast("+"+(j.payout||0)+" XP REDEEMED. Profit is a weapon.");
        api("bond_list",{callsign:id.callsign},function(jj){ BND=jj; render(); });
        api("xp_balance",{callsign:id.callsign},function(j2){ BAL=j2; render(); });
      });
    };
  })(rds[i]); }
}
/* ---------- 6. TRANSACTION HISTORY (the ledger) ---------- */
function histCat(key){
  var k=String(key||"").toLowerCase();
  if(/remit/.test(k)) return "transfer";
  if(/tip/.test(k)) return "tip";
  if(/bond/.test(k)) return "bond";
  if(/loan/.test(k)) return "loan";
  if(/sav/.test(k)) return "savings";
  if(/stake/.test(k)) return "stake";
  if(/wager|lotter|flip|crash|roulette|gamble|bet/.test(k)) return "gamble";
  if(/auction|cosmetic|sponsor|powerup|title|boost|bounty|battle|mission|campaign|challenge|referral|vote|contract/.test(k)) return "activity";
  return "other";
}
function renderHistory(id){
  var h='<div class="x-pane pb-pane"><div class="pb-bankhead">&#9670; THE LEDGER — EVERY CENT ACCOUNTED FOR &#9670;</div>'
    +'<div class="x-note">Full XP movement history. Filter by type.</div>'
    +'<div class="pb-filters">'
    +'<button class="c-btn pb-f'+(HIST_FILTER==="all"?" pb-fact":"")+'" data-hf="all">ALL</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="transfer"?" pb-fact":"")+'" data-hf="transfer">TRANSFERS</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="tip"?" pb-fact":"")+'" data-hf="tip">TIPS</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="bond"?" pb-fact":"")+'" data-hf="bond">BONDS</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="loan"?" pb-fact":"")+'" data-hf="loan">LOANS</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="savings"?" pb-fact":"")+'" data-hf="savings">SAVINGS</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="gamble"?" pb-fact":"")+'" data-hf="gamble">GAMBLING</button> '
    +'<button class="c-btn pb-f'+(HIST_FILTER==="activity"?" pb-fact":"")+'" data-hf="activity">ACTIVITY</button>'
    +'</div><div style="height:8px"></div>';
  var es=(XH&&XH.ok&&XH.entries)||[];
  var shown=0;
  for(var i=0;i<es.length;i++){
    var e=es[i], cat=histCat(e.key);
    if(HIST_FILTER!=="all"&&cat!==HIST_FILTER) continue;
    shown++;
    var d=Number(e.delta)||0;
    h+='<div class="pb-row"><span class="pb-'+(d>=0?"in":"out")+'">'+(d>=0?"+":"")+d.toLocaleString()+' XP</span>'
      +' <span class="pb-hkey">'+esc(e.key||"")+'</span>'
      +(e.reason?(' <span class="x-note">'+esc(e.reason)+'</span>'):'')
      +'<span class="x-note"> '+esc(fmtTime(e.ts))+'</span></div>';
    if(shown>=60) break;
  }
  if(!shown) h+='<div class="x-note">No entries in this category. Yet.</div>';
  h+='<div class="x-note pf-mt" >Showing '+shown+' of '+es.length+' entries.</div>';
  h+='</div>';
  return h;
}
function wireHistory(id,el){
  var fs=el.querySelectorAll('button[data-hf]');
  for(var i=0;i<fs.length;i++){ (function(btn){
    btn.onclick=function(){ HIST_FILTER=btn.getAttribute("data-hf"); render(); };
  })(fs[i]); }
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="peoplesbank"]'); }catch(e){}
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

