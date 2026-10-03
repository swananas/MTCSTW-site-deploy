/* games/vault.js  |  PF v1.4.3 | ADMIN VAULT: Shane's financial control panel.
   Admin-only UI for the XP financial system — lottery, wagers, subs, causes,
   prizes, events, drops, alerts. Public reads via JSONP, admin reads via fetch
   GET with X-Admin-Secret, admin writes via CORS POST with X-Admin-Secret.
   Secret is prompted once per session and kept in sessionStorage only.
   KILL: ?pf_off=vault  or  localStorage pf_disabled_v1='["vault"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("vault")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-vault">
<div class="fe-block pf-override-block pf-silo" id="pf-vault">
<h2>Admin Vault</h2>
<div class="c-tag">Financial control room. Restricted access.</div>
<div id="xVault"><div class="c-load">Checking credentials&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var SECRET_KEY="pf_admin_secret";
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },3200); }catch(e2){} }
function getSecret(){ try{ return sessionStorage.getItem(SECRET_KEY)||""; }catch(e){ return ""; } }
function setSecret(s){ try{ sessionStorage.setItem(SECRET_KEY,s); }catch(e){} }
function clearSecret(){ try{ sessionStorage.removeItem(SECRET_KEY); }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfVlCb"+Math.floor(Math.random()*1e9);
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
function apiAdmin(action,cb){
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND+"?action="+encodeURIComponent(action),{method:"GET",headers:{"X-Admin-Secret":getSecret()}})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function post(type,key,cAction,params,cb){
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":getSecret()},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function fmtDate(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }
}
function fmtDur(ms){
  if(ms<=0) return "now";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;
  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);
  var out=""; if(d>0)out+=d+"d "; if(h>0||d>0)out+=h+"h "; out+=m+"m";
  return out.trim();
}
function val(id){ var el=document.getElementById(id); return el?String(el.value||"").trim():""; }
function err(id,m){ var el=document.getElementById(id); if(el) el.textContent=m||""; }
var NH=null, LS=null, WL=null, CL=null, EL=null, DL=null, AL=null, BP=null, IS=null;
function load(){
  var n=0;
  function one(){ n++; if(n>=9) render(); }
  setTimeout(render,15000);
  apiAdmin("network_health",function(j){ NH=j; one(); });
  api("lottery_status",{callsign:"x"},function(j){ LS=j; one(); });
  api("wager_list",{},function(j){ WL=j; one(); });
  api("cause_list",{},function(j){ CL=j; one(); });
  api("event_list",{},function(j){ EL=j; one(); });
  api("drop_list",{},function(j){ DL=j; one(); });
  api("alert_list",{},function(j){ AL=j; one(); });
  apiAdmin("battle_proposals",function(j){ BP=j; one(); });
  apiAdmin("intel_submissions",function(j){ IS=j; one(); });
}
function renderGate(){
  var el=document.getElementById("xVault"); if(!el) return;
  el.innerHTML='<div class="x-pane"><h4>Restricted area</h4>'
    +'<div class="x-note">The Vault manages the XP financial system. Enter the admin secret to unlock.</div>'
    +'<input aria-label="Admin secret" id="vlSecret" type="password" class="c-input pf-input-lg" placeholder="Admin secret" >'
    +'<div style="margin-top:8px"><button class="c-btn" id="vlUnlock">UNLOCK VAULT</button></div>'
    +'<div class="c-err" id="vlGateErr"></div></div>';
  document.getElementById("vlUnlock").onclick=function(){
    var s=val("vlSecret");
    if(!s){ err("vlGateErr","Enter the secret."); return; }
    setSecret(s);
    apiAdmin("network_health",function(j){
      if(j&&j.ok){ toast("Vault unlocked."); load(); }
      else{ clearSecret(); err("vlGateErr",(j&&j.err)||"Invalid secret."); }
    });
  };
}
function render(){
  var el=document.getElementById("xVault"); if(!el) return;
  if(!getSecret()){ renderGate(); return; }
  if(NH&&!NH.ok&&NH.err==="unauthorized"){ clearSecret(); renderGate(); return; }
  var h="";
  h+='<div style="margin-bottom:10px"><button class="c-btn c-btn-dim" id="vlLock">LOCK VAULT</button></div>';
  /* 1. SYSTEM OVERVIEW */
  h+='<div class="x-pane"><h4>System overview</h4>';
  if(NH&&NH.ok){
    h+='<div class="vl-grid">'
      +'<div class="vl-stat"><div class="vl-num">'+Number(NH.total_users||0)+'</div><div class="vl-lab">Soldiers</div></div>'
      +'<div class="vl-stat"><div class="vl-num">'+Number(NH.active_7d||0)+'</div><div class="vl-lab">Active 7d</div></div>'
      +'<div class="vl-stat"><div class="vl-num">'+Number(NH.total_shares||0)+'</div><div class="vl-lab">Total shares</div></div>'
      +'<div class="vl-stat"><div class="vl-num">'+Number(NH.total_content||0)+'</div><div class="vl-lab">Content pieces</div></div>'
      +'</div>';
    var gr=NH.growth||{};
    h+='<div class="x-note">Shares this week: '+(gr.this_week!=null?gr.this_week:"?")+' &bull; last week: '+(gr.last_week!=null?gr.last_week:"?")+'</div>';
    var tc=(NH.top_cells||[]);
    if(tc.length){ h+='<div class="x-note">Top cells: '+tc.slice(0,5).map(function(c){ return esc(c.cell_id||c.id)+" ("+(c.shares||0)+")"; }).join(" &bull; ")+'</div>'; }
  } else {
    h+='<div class="x-note">System overview unavailable ('+esc((NH&&NH.err)||"loading")+').</div>';
  }
  var lr=(LS&&LS.ok&&LS.round)||null;
  if(lr){ h+='<div class="x-note">Lottery pot: <b>'+Number(lr.pot||0)+' XP</b> &bull; '+(lr.total_tickets||0)+' tickets &bull; draw in '+fmtDur(Number(lr.ends_at||0)-Date.now())+'</div>'; }
  h+='</div>';
  /* 2. LOTTERY CONTROL */
  h+='<div class="x-pane"><h4>Lottery control</h4>';
  if(lr){
    h+='<div class="x-note">Round <b>'+esc(lr.id)+'</b> &mdash; pot <b>'+Number(lr.pot||0)+' XP</b>, '+(lr.total_tickets||0)+' tickets, ends '+fmtDate(lr.ends_at)+'</div>'
      +'<button class="c-btn" id="vlDraw">DRAW WINNER</button><div class="c-err" id="vlDrawErr"></div>';
  } else { h+='<div class="x-note">Lottery status loading&hellip;</div>'; }
  h+='</div>';
  /* 3. WAGER MANAGEMENT */
  h+='<div class="x-pane"><h4>Wager management</h4>'
    +'<div class="vl-form">'
    +'<input aria-label="Kind: battle | race | challenge" id="vlWKind" class="c-input pf-input-md" placeholder="Kind: battle | race | challenge" >'
    +'<input aria-label="Target ID (battle/race/challenge)" id="vlWTid" class="c-input pf-input-lg" placeholder="Target ID (battle/race/challenge)" >'
    +'<input aria-label="Description" id="vlWDesc" class="c-input pf-input-lg" placeholder="Description" >'
    +'<input aria-label="Sides, comma-separated" id="vlWSides" class="c-input pf-input-lg" placeholder="Sides, comma-separated" >'
    +'<input id="vlWClose" class="c-input pf-input-md" type="datetime-local" >'
    +'<button class="c-btn" id="vlWCreate">CREATE WAGER</button><div class="c-err" id="vlWErr"></div>'
    +'</div>';
  var ws=(WL&&WL.ok&&WL.wagers)||[];
  if(ws.length){
    h+='<div class="vl-list">';
    for(var i=0;i<ws.length;i++){ var w=ws[i];
      h+='<div class="vl-row"><div><b>'+esc(w.description||w.id)+'</b>'
        +' <span class="x-note">'+esc(w.kind)+' &bull; pool '+Number(w.total_pool||0)+' XP &bull; '+(w.resolved?"RESOLVED: "+esc(w.outcome):"closes "+fmtDate(w.closes_at))+'</span></div>';
      if(!w.resolved){
        h+='<div class="vl-form"><input aria-label="Winning side" id="vlWRes_'+esc(w.id)+'" class="c-input pf-input-md" placeholder="Winning side" >'
          +'<button class="c-btn" data-wres="'+esc(w.id)+'">RESOLVE</button></div>';
      }
      h+='</div>';
    }
    h+='</div><div class="c-err" id="vlWResErr"></div>';
  } else { h+='<div class="x-note">No wagers yet.</div>'; }
  h+='</div>';
  /* 4. SUBSCRIPTION PROCESSING */
  h+='<div class="x-pane"><h4>Subscription processing</h4>'
    +'<div class="x-note">Run weekly (or on demand) to move due XP from subscribers to creators.</div>'
    +'<button class="c-btn" id="vlSubProc">PROCESS DUE PAYMENTS</button><div class="c-err" id="vlSubErr"></div>'
    +'<div class="x-note" id="vlSubOut"></div></div>';
  /* 5. CAUSE WITHDRAWALS */
  h+='<div class="x-pane"><h4>Cause withdrawals</h4>';
  var cs=(CL&&CL.ok&&CL.pools)||[];
  if(cs.length){
    for(var c=0;c<cs.length;c++){ var p=cs[c];
      h+='<div class="vl-row"><div><b>'+esc(p.name)+'</b> <span class="x-note">'+Number(p.balance||0)+' XP &bull; '+(p.donors||0)+' donors</span>'
        +'<div class="x-note">'+esc(p.description||"")+'</div></div>'
        +'<div class="vl-form"><input aria-label="Amount" id="vlCW_'+esc(p.id)+'" class="c-input pf-input-sm" type="number" min="1" placeholder="Amount" >'
        +'<input aria-label="Disbursement note" id="vlCWN_'+esc(p.id)+'" class="c-input pf-input-md" placeholder="Disbursement note" >'
        +'<button class="c-btn" data-cw="'+esc(p.id)+'">WITHDRAW</button></div></div>';
    }
    h+='<div class="c-err" id="vlCWErr"></div>';
  } else { h+='<div class="x-note">No cause pools.</div>'; }
  h+='</div>';
  /* 6. PRIZE AWARDS */
  h+='<div class="x-pane"><h4>Prize awards</h4>'
    +'<div class="x-note">Award a crowdfunded prize pool to its winner. Pool empties on award.</div>'
    +'<div class="vl-form"><input aria-label="Pool ID" id="vlPPool" class="c-input pf-input-md" placeholder="Pool ID" >'
    +'<input aria-label="Winner callsign" id="vlPWin" class="c-input pf-input-md" placeholder="Winner callsign" >'
    +'<button class="c-btn" id="vlPAward">AWARD PRIZE</button><div class="c-err" id="vlPErr"></div></div></div>';
  /* 7. EVENT ATTENDANCE */
  h+='<div class="x-pane"><h4>Event attendance</h4>';
  var ev=(EL&&EL.ok&&EL.events)||[];
  if(ev.length){
    h+='<div class="vl-list">';
    for(var e=0;e<Math.min(ev.length,10);e++){ var ve=ev[e];
      h+='<div class="vl-row"><div><b>'+esc(ve.title)+'</b> <span class="x-note">'+esc(ve.type)+' &bull; '+fmtDate(ve.event_at)+' &bull; '+(ve.rsvp_count||0)+' RSVPs</span></div>'
        +'<div class="vl-form"><input aria-label="Callsign" id="vlEA_'+esc(ve.id)+'" class="c-input pf-input-sm" placeholder="Callsign" >'
        +'<button class="c-btn" data-ea="'+esc(ve.id)+'">CONFIRM ATTENDANCE</button></div></div>';
    }
    h+='</div><div class="c-err" id="vlEAErr"></div>';
  } else { h+='<div class="x-note">No events.</div>'; }
  h+='</div>';
  /* 8. DROPS & ALERTS */
  h+='<div class="x-pane"><h4>Coordinated drops</h4>'
    +'<div class="vl-form"><input aria-label="Drop title" id="vlDTitle" class="c-input pf-input-lg" placeholder="Drop title" >'
    +'<input aria-label="Content ID" id="vlDCid" class="c-input pf-input-md" placeholder="Content ID" >'
    +'<input id="vlDAt" class="c-input pf-input-md" type="datetime-local" >'
    +'<button class="c-btn" id="vlDCreate">CREATE DROP</button><div class="c-err" id="vlDErr"></div></div>';
  var dp=(DL&&DL.ok&&DL.drops)||[];
  if(dp.length){ h+='<div class="x-note">'+dp.length+' scheduled drop(s). Latest: <b>'+esc(dp[0].title)+'</b> &mdash; '+esc(dp[0].commit_count||0)+' committed, drops '+fmtDate(dp[0].drop_at)+'</div>'; }
  h+='</div>';
  h+='<div class="x-pane"><h4>Rapid response alerts</h4>'
    +'<div class="vl-form"><input aria-label="Headline" id="vlAHead" class="c-input pf-input-lg" placeholder="Headline" >'
    +'<input aria-label="Context for creators" id="vlACtx" class="c-input pf-input-lg" placeholder="Context for creators" >'
    +'<input aria-label="Template ID (optional)" id="vlATpl" class="c-input pf-input-md" placeholder="Template ID (optional)" >'
    +'<button class="c-btn" id="vlACreate">CREATE ALERT</button><div class="c-err" id="vlAErr"></div></div>';
  var ax=(AL&&AL.ok&&AL.alerts)||[];
  if(ax.length){ h+='<div class="x-note">'+ax.length+' active alert(s). Latest: <b>'+esc(ax[0].headline)+'</b> &mdash; '+esc(ax[0].response_count||0)+' responses</div>'; }
  h+='</div>';
  /* FLASH BROADCAST (2026-10-03): the producer behind the 'Flash events'
     notification preference. Fires a broadcast email (type='flash_events')
     to every email-opted-in user; drainQueue respects per-type prefs. */
  h+='<div class="x-pane"><h4>Flash broadcast</h4>'
    +'<div class="x-note">Enqueues a broadcast email to everyone opted in to Flash events. No sender configured yet? The row waits in the queue — no flood.</div>'
    +'<div class="vl-form"><input aria-label="Flash title" id="vlFBTitle" class="c-input pf-input-lg" placeholder="Flash title" >'
    +'<input aria-label="Flash message" id="vlFBMsg" class="c-input pf-input-lg" placeholder="Message (goes to email + in-app)" >'
    +'<button class="c-btn" id="vlFBFire">FIRE BROADCAST</button><div class="c-err" id="vlFBErr"></div></div></div>';
  /* MODERATION QUEUE — battle proposals + intel submissions */
  h+='<div class="x-pane"><h4>Moderation queue</h4>';
  var bpl=(BP&&BP.ok&&BP.proposals)||[];
  h+='<div class="x-note"><b>Battle proposals ('+bpl.length+' pending)</b></div>';
  if(!bpl.length){ h+='<div class="x-note">No pending battle proposals.</div>'; }
  for(var mi=0;mi<bpl.length;mi++){
    var mp=bpl[mi];
    h+='<div class="vl-mod"><b>'+esc(mp.title)+'</b> <span class="x-note">by '+esc(mp.proposer)+' &mdash; '+fmtDate(mp.created_at)+'</span> '
      +'<button class="c-btn c-btn-sm" data-bap="'+mp.id+'">APPROVE</button> '
      +'<button class="c-btn c-btn-dim c-btn-sm" data-brj="'+mp.id+'">REJECT</button></div>';
  }
  var isl=(IS&&IS.ok&&IS.submissions)||[];
  h+='<div class="x-note" style="margin-top:8px"><b>Intel submissions ('+isl.length+' pending)</b></div>';
  if(!isl.length){ h+='<div class="x-note">No pending intel submissions.</div>'; }
  for(var mj=0;mj<isl.length;mj++){
    var ms=isl[mj];
    h+='<div class="vl-mod"><b>'+esc(ms.target)+'</b> <span class="x-note">by '+esc(ms.submitter)+' &mdash; '+esc(String(ms.activity||"").slice(0,80))+'</span><br>'
      +'<span class="x-note">Source: '+esc(ms.source)+'</span> '
      +'<button class="c-btn c-btn-sm" data-iap="'+ms.id+'">APPROVE</button> '
      +'<button class="c-btn c-btn-dim c-btn-sm" data-irj="'+ms.id+'">REJECT</button></div>';
  }
  h+='</div>';
  el.innerHTML=h;
  wire();
}
function wire(){
  var lock=document.getElementById("vlLock");
  if(lock) lock.onclick=function(){ clearSecret(); NH=null; renderGate(); toast("Vault locked."); };
  var b;
  b=document.getElementById("vlDraw");
  if(b) b.onclick=function(){ b.disabled=true;
    post("gamble","g_action","lottery_draw",{},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlDrawErr",(j&&j.err)||"Draw failed."); return; }
      toast("Winner: "+j.winner+" — "+j.pot+" XP."); LS=null; load();
    }); };
  b=document.getElementById("vlWCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var sides=val("vlWSides").split(",").map(function(s){ return s.trim(); }).filter(Boolean);
    var closes=val("vlWClose"); var ts=closes?new Date(closes).getTime():0;
    post("wager","w_action","wager_create",{kind:val("vlWKind"),target_id:val("vlWTid"),description:val("vlWDesc"),sides:sides,closes_at:ts},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlWErr",(j&&j.err)||"Create failed."); return; }
      toast("Wager created: "+j.id); WL=null; load();
    }); };
  var rbs=document.querySelectorAll("[data-wres]");
  for(var i=0;i<rbs.length;i++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      var wid=btn.getAttribute("data-wres");
      var side=val("vlWRes_"+wid);
      if(!side){ err("vlWResErr","Enter the winning side."); btn.disabled=false; return; }
      post("wager","w_action","wager_resolve",{wager_id:wid,winning_side:side},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlWResErr",(j&&j.err)||"Resolve failed."); return; }
        toast("Wager resolved. "+(j.payouts||[]).length+" payouts."); WL=null; load();
      }); };
  })(rbs[i]); }
  b=document.getElementById("vlSubProc");
  if(b) b.onclick=function(){ b.disabled=true;
    post("sub","s_action","subscription_process",{},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlSubErr",(j&&j.err)||"Process failed."); return; }
      var out=document.getElementById("vlSubOut");
      if(out) out.textContent="Paid "+(j.paid||0)+" subscriptions, skipped "+(j.skipped||0)+".";
      toast("Subscriptions processed.");
    }); };
  var cwb=document.querySelectorAll("[data-cw]");
  for(var c=0;c<cwb.length;c++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      var pid=btn.getAttribute("data-cw");
      post("cause","c_action","cause_withdraw",{pool_id:pid,amount:Number(val("vlCW_"+pid))||0,note:val("vlCWN_"+pid)},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlCWErr",(j&&j.err)||"Withdraw failed."); return; }
        toast("Disbursed "+(j.withdrawn||0)+" XP from "+pid+"."); CL=null; load();
      }); };
  })(cwb[i]); }
  b=document.getElementById("vlPAward");
  if(b) b.onclick=function(){ b.disabled=true;
    post("prize","p_action","prize_award",{pool_id:val("vlPPool"),winner:val("vlPWin")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlPErr",(j&&j.err)||"Award failed."); return; }
      toast("Awarded "+(j.amount||0)+" XP to "+j.winner+".");
    }); };
  var eab=document.querySelectorAll("[data-ea]");
  for(var e=0;e<eab.length;e++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      var eid=btn.getAttribute("data-ea");
      var cs=val("vlEA_"+eid);
      if(!cs){ err("vlEAErr","Enter a callsign."); btn.disabled=false; return; }
      post("irl","i_action","event_attended",{event_id:eid,callsign:cs},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlEAErr",(j&&j.err)||"Confirm failed."); return; }
        toast(j.dup?"Already confirmed.":"Attendance confirmed. +100 XP to "+cs+".");
      }); };
  })(eab[e]); }
  b=document.getElementById("vlDCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var at=val("vlDAt"); var ts=at?new Date(at).getTime():0;
    post("drop","d_action","drop_create",{title:val("vlDTitle"),content_id:val("vlDCid"),drop_at:ts},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlDErr",(j&&j.err)||"Create failed."); return; }
      toast("Drop created: "+j.id); DL=null; load();
    }); };
  b=document.getElementById("vlACreate");
  if(b) b.onclick=function(){ b.disabled=true;
    post("alert","al_action","alert_create",{headline:val("vlAHead"),context:val("vlACtx"),template_id:val("vlATpl")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlAErr",(j&&j.err)||"Create failed."); return; }
      toast("Alert created: "+j.id); AL=null; load();
    }); };
  /* flash broadcast: the producer for the 'Flash events' email pref */
  b=document.getElementById("vlFBFire");
  if(b) b.onclick=function(){ b.disabled=true;
    var ft=val("vlFBTitle"), fm=val("vlFBMsg");
    if(!ft||!fm){ err("vlFBErr","Title and message required."); b.disabled=false; return; }
    post("flash","fl_action","flash_broadcast",{title:ft,message:fm},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlFBErr",(j&&j.err)||"Broadcast failed."); return; }
      toast("Flash broadcast queued (row "+j.id+"). It drains with the hourly queue.");
    }); };
  /* moderation queue: battle proposals */
  var baps=document.querySelectorAll("[data-bap]");
  for(var bi=0;bi<baps.length;bi++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("battle","b_action","battle_approve",{proposal_id:btn.getAttribute("data-bap")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Approve failed: "+((j&&j.err)||"error")); return; }
        toast("Battle approved and live: "+j.id); BP=null; load();
      }); };
  })(baps[bi]); }
  var brjs=document.querySelectorAll("[data-brj]");
  for(var bj=0;bj<brjs.length;bj++){ (function(btn){
    btn.onclick=function(){
      var reason=window.prompt("Rejection reason (optional):")||"";
      btn.disabled=true;
      post("battle","b_action","battle_reject",{proposal_id:btn.getAttribute("data-brj"),reason:reason},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Reject failed: "+((j&&j.err)||"error")); return; }
        toast("Proposal rejected."); BP=null; load();
      }); };
  })(brjs[bj]); }
  /* moderation queue: intel submissions */
  var iaps=document.querySelectorAll("[data-iap]");
  for(var ii=0;ii<iaps.length;ii++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("intel","i_action","intel_approve",{submission_id:btn.getAttribute("data-iap")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Approve failed: "+((j&&j.err)||"error")); return; }
        toast("Intel published: "+j.id); IS=null; load();
      }); };
  })(iaps[ii]); }
  var irjs=document.querySelectorAll("[data-irj]");
  for(var ij=0;ij<irjs.length;ij++){ (function(btn){
    btn.onclick=function(){
      var reason=window.prompt("Rejection reason (optional):")||"";
      btn.disabled=true;
      post("intel","i_action","intel_reject",{submission_id:btn.getAttribute("data-irj"),reason:reason},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Reject failed: "+((j&&j.err)||"error")); return; }
        toast("Submission rejected."); IS=null; load();
      }); };
  })(irjs[ij]); }
}
renderGate();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(getSecret()) load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
