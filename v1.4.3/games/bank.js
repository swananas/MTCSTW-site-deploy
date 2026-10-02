/* games/bank.js  |  PF v1.4.3 | THE WAR CHEST: personal XP bank.
   LAYERING: a game silo like contracts.js. Talks to the backend bank actions
   over JSONP (verdicts) and POST (fire-and-forget overtime). Reads spendable
   balance via PF.xpBalance only for display. Never reaches into another silo.
   OVERTIME: listens for pf-xp gains; daily XP beyond 60 earns a 25% kicker
   into the bank (server enforces the streak-scaled 5..10/day cap).
   Flags localStorage pf_bank_seen_v1 so the flow layer can route users here.
   KILL: ?pf_off=bank  or  localStorage pf_disabled_v1='["bank"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("bank")) { return; }
  try { localStorage.setItem("pf_bank_seen_v1", "1"); } catch (e) {}
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bank">
<div class="fe-block pf-override-block" id="pf-bank">
<h2>The War Chest</h2>
<div class="c-tag">Your XP bank. Save it. Grow it. Spend it on wars to come.</div>
<div id="bBody"><div class="c-load">Opening the vault&hellip;</div></div>
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
  var fn="pfBkCb"+Math.floor(Math.random()*1e9);
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
function post(action,params){
  try{
    fetch(BACKEND,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},
      body:JSON.stringify(Object.assign({type:"bank",b_action:action},params))}).catch(function(){});
  }catch(e){}
}
var OT_KEY="pf_bank_ot_v1", THRESH=60, RATE=0.25, LOCAL_CAP=10;
function chiDay(){ try{ return new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"}); }catch(e){
  var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); } }
function otState(){ try{ var s=JSON.parse(localStorage.getItem(OT_KEY)||"null"); var t=chiDay();
  if(!s||s.day!==t) s={day:t,total:0,sent:0,n:0}; return s; }catch(e){ return {day:chiDay(),total:0,sent:0,n:0}; } }
function otSave(s){ try{ localStorage.setItem(OT_KEY,JSON.stringify(s)); }catch(e){} }
/* Overtime kicker: every pf-xp gain past the daily threshold skims 25% to the bank. */
document.addEventListener("pf-xp", function(e){
  var d=(e&&e.detail)||{}, gain=Math.round(Number(d.gain)||0);
  if(gain<=0) return;
  var id=ident(); if(!id.callsign) return;
  var s=otState(), prev=s.total; s.total+=gain;
  var overPrev=Math.max(0,prev-THRESH), overNew=Math.max(0,s.total-THRESH);
  var kick=Math.floor((overNew-overPrev)*RATE);
  if(kick>0 && s.sent<LOCAL_CAP){
    kick=Math.min(kick, LOCAL_CAP-s.sent);
    s.n++; s.sent+=kick; otSave(s);
    post("overtime",{callsign:id.callsign,device:id.device,amount:kick,key:id.device+":"+s.day+":"+s.n});
    setTimeout(load,4000);
  } else otSave(s);
});
var st=null, busy=false, spendable=null;
function load(){
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(busy) return; busy=true;
  api("bank_status",{callsign:id.callsign},function(j){
    busy=false; st=j;
    try{ if(window.PF&&PF.xpBalance) PF.xpBalance(function(b){ spendable=b; render(); }); else render(); }
    catch(e){ render(); }
  });
}
function renderGate(){
  var el=document.getElementById("bBody"); if(!el) return;
  el.innerHTML='<div class="c-gate">The War Chest runs on callsigns. Claim yours in Enlistment Ranks, then come back and start saving.</div>';
}
function fmtTs(ts){ try{ var d=new Date(ts); return (d.getMonth()+1)+"/"+d.getDate()+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2); }catch(e){ return ""; } }
var KIND_LBL={overtime:"overtime kicker",deposit:"weekly deposit",withdraw:"withdrawal",interest:"interest",pledge_out:"venture pledge",pledge_back:"pledge returned",dividend:"dividend"};
function render(){
  var el=document.getElementById("bBody"); if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!st||!st.ok){ el.innerHTML='<div class="c-load">Opening the vault&hellip;</div>'; return; }
  var h='<div class="x-pane"><h4>Vault balance</h4>';
  h+='<div class="x-bigbal">'+st.balance+' <span>XP</span></div>';
  h+='<div class="x-note">Earning <b>'+st.rate_pct+'%/week</b> interest';
  if(st.credit) h+=' — cell <b>'+esc(st.credit.cell_name)+'</b> credit <b>'+st.credit.score+'</b>';
  else h+=' — <b>join a cell</b> to raise your rate (up to 7%)';
  h+='.</div>';
  if(st.interest_paid>0) h+='<div class="x-warn">+'+st.interest_paid+' XP interest just landed.</div>';
  var o=otState();
  h+='<div class="x-meter"><div class="x-meterlbl">Overtime today: '+Math.min(o.sent,st.overtime_cap)+' / '+st.overtime_cap+' XP'+(st.streak>0?' <span class="x-dim">(streak '+st.streak+'d)</span>':'')+'</div>';
  h+='<div class="x-bar"><div class="x-fill" style="width:'+Math.min(100,Math.round(100*Math.min(o.sent,st.overtime_cap)/Math.max(1,st.overtime_cap)))+'%"></div></div>';
  h+='<div class="x-note">Play past '+THRESH+' XP in a day and 25% of the overflow lands here.</div></div>';
  h+='</div>';
  /* deposit / withdraw */
  h+='<div class="x-pane"><h4>Move XP</h4>';
  h+='<div class="x-note">Spendable balance: <b>'+(spendable==null?"?":spendable)+' XP</b> &middot; weekly deposit room: <b>'+Math.max(0,st.deposit_week_cap-st.deposit_week_used)+' XP</b></div>';
  h+='<input id="bDepAmt" type="number" min="1" max="40" placeholder="DEPOSIT XP" style="width:120px"> ';
  h+='<button class="c-btn" id="bDeposit">Deposit</button> ';
  h+='<input id="bWdAmt" type="number" min="1" placeholder="WITHDRAW XP" style="width:130px"> ';
  h+='<button class="c-btn" id="bWithdraw">Withdraw</button><div class="c-err" id="bErr"></div>';
  h+='<div class="x-note">Deposits come from your spendable XP. Withdrawals are free — but XP pulled before Monday forfeits the week\'s interest on it.</div></div>';
  /* credit score */
  if(st.credit&&st.credit.parts){
    var p=st.credit.parts;
    h+='<div class="x-pane"><h4>Cell credit — '+st.credit.score+'</h4><div class="x-note">';
    h+='Activity '+Math.round(p.activity*100)+'% &middot; Contracts '+Math.round(p.contracts*100)+'% &middot; Recruits '+Math.round(p.recruits*100)+'% &middot; Consistency '+Math.round(p.consistency*100)+'%';
    h+='<br>Keep your cellmates active and your rate climbs toward 7%.</div></div>';
  }
  /* history */
  var hist=st.history||[];
  if(hist.length){
    h+='<div class="x-pane"><h4>Ledger</h4>';
    hist.forEach(function(t){
      h+='<div class="x-myrow"><span>'+fmtTs(t.ts)+' — '+esc(KIND_LBL[t.kind]||t.kind)+'</span> <b class="'+(t.delta>=0?"x-pos":"x-neg")+'">'+(t.delta>=0?"+":"")+t.delta+'</b></div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  var b=document.getElementById("bDeposit");
  if(b) b.onclick=function(){
    var amt=parseInt(document.getElementById("bDepAmt").value,10), err=document.getElementById("bErr"), iid=ident();
    err.textContent="";
    if(!amt||amt<1){ err.textContent="Enter an amount."; return; }
    b.disabled=true;
    var fn="pfBkDep"+Math.floor(Math.random()*1e9);
    window[fn]=function(j){
      try{delete window[fn];}catch(e){}
      b.disabled=false;
      if(j&&j.ok){ toast("+"+amt+" XP in the vault."); }
      else { err.textContent=(j&&j.err)||"Deposit failed."; }
      setTimeout(load,1200);
    };
    var s=document.createElement("script");
    s.src=BACKEND+"?action=bank_deposit&callsign="+encodeURIComponent(iid.callsign)+"&device="+encodeURIComponent(iid.device)+
      "&amount="+amt+"&key="+encodeURIComponent(iid.device+":"+Date.now())+"&callback="+fn;
    s.onerror=function(){ try{delete window[fn];}catch(e){} err.textContent="Network error."; b.disabled=false; };
    document.head.appendChild(s);
    setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); },15000);
  };
  var w=document.getElementById("bWithdraw");
  if(w) w.onclick=function(){
    var amt=parseInt(document.getElementById("bWdAmt").value,10), err=document.getElementById("bErr"), iid=ident();
    err.textContent="";
    if(!amt||amt<1){ err.textContent="Enter an amount."; return; }
    w.disabled=true;
    var fn="pfBkWd"+Math.floor(Math.random()*1e9);
    window[fn]=function(j){
      try{delete window[fn];}catch(e){}
      w.disabled=false;
      if(j&&j.ok){ toast(amt+" XP withdrawn to spendable."); }
      else { err.textContent=(j&&j.err)||"Withdrawal failed."; }
      setTimeout(load,1200);
    };
    var s=document.createElement("script");
    s.src=BACKEND+"?action=bank_withdraw&callsign="+encodeURIComponent(iid.callsign)+"&device="+encodeURIComponent(iid.device)+
      "&amount="+amt+"&key="+encodeURIComponent(iid.device+":"+Date.now())+"&callback="+fn;
    s.onerror=function(){ try{delete window[fn];}catch(e){} err.textContent="Network error."; w.disabled=false; };
    document.head.appendChild(s);
    setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); },15000);
  };
}
load();
setInterval(function(){ if(!busy) load(); }, 180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
