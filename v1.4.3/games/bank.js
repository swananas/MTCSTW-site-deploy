/* games/bank.js  |  PF v1.4.3 | THE WAR CHEST: personal XP bank.
   Clean, minimal UI: balance, rate, deposit/withdraw, weekly room, activity.
   Reads via JSONP (bank_status). Writes via POST {type:'bank', b_action}
   through PF.authPost (deposit/withdraw are POST-only on the backend).
   OVERTIME: listens for pf-xp gains; daily XP beyond 60 earns a 25% kicker
   into the bank (server enforces the streak-scaled cap).
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
<div class="c-tag">Your XP bank. Save it. Grow it.</div>
<div id="bBody"><div class="c-load">Opening the vault&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
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
function postBank(bAction,params,cb){
  var body={type:"bank",b_action:bAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(j){ cb(j); })
      .catch(function(){ cb({ok:false,err:"Network error."}); });
  }catch(e){ cb({ok:false,err:"Network error."}); }
}
/* ---------- OVERTIME KICKER (unchanged) ---------- */
var OT_KEY="pf_bank_ot_v1", THRESH=60, RATE=0.25, LOCAL_CAP=10;
function chiDay(){ try{ return new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"}); }catch(e){
  var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); } }
function otState(){ try{ var s=JSON.parse(localStorage.getItem(OT_KEY)||"null"); var t=chiDay();
  if(!s||s.day!==t) s={day:t,total:0,sent:0,n:0}; return s; }catch(e){ return {day:chiDay(),total:0,sent:0,n:0}; } }
function otSave(s){ try{ localStorage.setItem(OT_KEY,JSON.stringify(s)); }catch(e){} }
document.addEventListener("pf-xp", function(e){
  var d=(e&&e.detail)||{}, gain=Math.round(Number(d.gain)||0);
  if(gain<=0) return;
  var id=ident(); if(!id.callsign) return;
  var s=otState(), prev=s.total; s.total+=gain;
  var overPrev=Math.max(0,prev-THRESH), overNew=Math.max(0,s.total-THRESH);
  var kick=Math.floor((overNew-overPrev)*RATE);
  if(kick>0 && s.sent<LOCAL_CAP){
    kick=Math.min(kick, LOCAL_CAP-s.sent);
    s.n++; var key=id.device+":"+s.day+":"+s.n; otSave(s);
    postBank("overtime",{callsign:id.callsign,device:id.device,amount:kick,key:key},function(j){
      if(j&&j.ok){
        var s2=otState(); s2.sent+=kick; otSave(s2);
        setTimeout(load,4000);
      } else if(j&&j.err==="cap"){
        /* Backend streak-scaled cap hit — local counter stays honest. */
      } else {
        toast("Overtime kicker missed the vault (network). Your XP is safe — it retries on your next gain.");
      }
    });
  } else otSave(s);
});
/* ---------- STATE ---------- */
var st=null, busy=false, spendable=null, lastAction="deposit";
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
var KIND_LBL={overtime:"overtime kicker",deposit:"deposit",withdraw:"withdrawal",interest:"interest",pledge_out:"venture pledge",pledge_back:"pledge returned",dividend:"dividend"};
/* ---------- RENDER ---------- */
function render(){
  var el=document.getElementById("bBody"); if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!st||!st.ok){ el.innerHTML='<div class="c-load">Opening the vault&hellip;</div>'; return; }
  var bal=Math.round(Number(st.balance)||0);
  var rate=Number(st.rate_pct)||0;
  var used=Math.round(Number(st.deposit_week_used)||0), cap=Math.round(Number(st.deposit_week_cap)||0);
  var room=Math.max(0,cap-used), pct=cap>0?Math.min(100,Math.round(100*used/cap)):0;
  var h='';
  /* 1. Big balance */
  h+='<div class="x-pane" style="text-align:center;padding:22px 12px;">'
    +'<div style="font-family:var(--pf-font-display);font-size:44px;color:var(--pf-cream);line-height:1;">'+bal.toLocaleString()+' <span style="font-size:18px;color:var(--pf-red-bright);">XP</span></div>'
    +'<div class="x-note" style="margin:8px 0 0;">in the vault</div>';
  /* 2. Interest rate */
  h+='<div class="x-note" style="margin:10px 0 0;">Earning <b style="color:var(--pf-cream);">'+rate+'%/week</b>';
  if(st.credit&&st.credit.cell_name) h+=' &middot; cell <b style="color:var(--pf-cream);">'+esc(st.credit.cell_name)+'</b> boosts your rate';
  else h+=' &middot; join a cell to raise it (up to 7%)';
  h+='</div>';
  if(Number(st.interest_paid)>0) h+='<div class="x-note" style="color:var(--pf-green);">+'+Math.round(Number(st.interest_paid))+' XP interest just landed.</div>';
  h+='</div>';
  /* 5. Weekly deposit room */
  h+='<div class="x-pane"><div class="x-note" style="margin:0 0 6px;">Weekly deposit room: <b style="color:var(--pf-cream);">'+room.toLocaleString()+' XP</b> left</div>'
    +'<div style="background:var(--pf-dark);border:1px solid var(--pf-border);height:10px;">'
    +'<div style="background:var(--pf-red);height:100%;width:'+pct+'%;"></div></div></div>';
  /* 3+4. Amount + chips + two big buttons */
  h+='<div class="x-pane">'
    +'<div class="x-note" style="margin:0 0 6px;">Spendable: <b style="color:var(--pf-cream);">'+(spendable==null?"?":Math.round(Number(spendable)).toLocaleString())+' XP</b></div>'
    +'<input class="c-in" id="bAmt" type="number" min="1" inputmode="numeric" placeholder="Amount" aria-label="XP amount" style="margin-bottom:8px;">'
    +'<div style="margin-bottom:8px;">'
    +'<button class="c-btn ghost pf-btn-sm" data-chip="50">50</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-chip="100">100</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-chip="250">250</button> '
    +'<button class="c-btn ghost pf-btn-sm" data-chip="ALL">ALL</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;">'
    +'<button class="c-btn" id="bDeposit" style="flex:1;margin:0;">DEPOSIT</button>'
    +'<button class="c-btn ghost" id="bWithdraw" style="flex:1;margin:0;">WITHDRAW</button>'
    +'</div>'
    +'<div class="c-err" id="bErr"></div>'
    +'<div class="x-note" style="margin:8px 0 0;">Withdrawals are free — but XP pulled before Monday forfeits the week\'s interest on it.</div>'
    +'</div>';
  /* 6. Recent activity — last 5 */
  var hist=(st.history||[]).slice(0,5);
  h+='<div class="x-pane"><div class="x-note" style="margin:0 0 6px;"><b style="color:var(--pf-cream);letter-spacing:2px;">RECENT ACTIVITY</b></div>';
  if(!hist.length) h+='<div class="x-note">Nothing yet. Make your first deposit.</div>';
  hist.forEach(function(t){
    var d=Math.round(Number(t.delta)||0);
    h+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--pf-border);font-size:13px;">'
      +'<span style="color:var(--pf-muted);">'+esc(fmtTs(t.ts))+' &middot; '+esc(KIND_LBL[t.kind]||t.kind)+'</span>'
      +'<b style="color:'+(d>=0?'var(--pf-green)':'var(--pf-red-bright)')+';">'+(d>=0?"+":"")+d.toLocaleString()+'</b></div>';
  });
  h+='</div>';
  el.innerHTML=h;
  /* chips */
  var chips=el.querySelectorAll('button[data-chip]');
  for(var i=0;i<chips.length;i++){ (function(ch){
    ch.onclick=function(){
      var v=ch.getAttribute("data-chip"), inp=document.getElementById("bAmt");
      if(v==="ALL"){
        var max=lastAction==="withdraw"?bal:(spendable==null?0:Math.round(Number(spendable)));
        inp.value=Math.max(0,max);
      } else inp.value=v;
    };
  })(chips[i]); }
  /* deposit / withdraw */
  function doTransfer(isDep,btn){
    var amt=Math.round(Number(document.getElementById("bAmt").value)||0);
    var err=document.getElementById("bErr"), iid=ident();
    err.textContent="";
    if(!amt||amt<1){ err.textContent="Enter an amount."; return; }
    lastAction=isDep?"deposit":"withdraw";
    btn.disabled=true;
    postBank(isDep?"deposit":"withdraw",
      {callsign:iid.callsign,device:iid.device,amount:amt,key:iid.device+":"+Date.now()},
      function(j){
        btn.disabled=false;
        if(j&&j.ok){ toast(isDep?("+"+amt.toLocaleString()+" XP in the vault."):(amt.toLocaleString()+" XP withdrawn to spendable.")); }
        else { err.textContent=(j&&(j.err||j.error))||"Transfer failed."; }
        setTimeout(load,1200);
      });
  }
  var dep=document.getElementById("bDeposit"), wd=document.getElementById("bWithdraw");
  if(dep) dep.onclick=function(){ doTransfer(true,dep); };
  if(wd) wd.onclick=function(){ doTransfer(false,wd); };
}
load();
setInterval(function(){ if(!busy) load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
