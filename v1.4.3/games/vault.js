/* games/vault.js  |  PF v1.4.3 | ADMIN VAULT: Shane's financial control panel.
   Admin-only UI for the XP financial system — lottery, wagers, subs, causes,
   prizes, events, drops, alerts. Public reads via JSONP, admin reads via fetch
   GET with X-Admin-Secret, admin writes via CORS POST with X-Admin-Secret.
   Secret is prompted once per session and kept in sessionStorage only.
   NOT in the homepage ORDER (see pages/home-v2.js) — it mounts ONLY on a
   direct URL carrying ?vault=1 (or #vault). Without the flag nothing mounts.
   Every data read/write inside is X-Admin-Secret gated, so a visitor without
   the secret sees only the locked gate, never vault data.
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
  /* 2026-10-03 H7: admin posts ride X-Admin-Secret, but callsign-gated admin
     actions (auction_cancel, prize_award) also need the callsign auth the
     authGate demands — attach the admin's own identity when available. */
  try{
    if(!body.callsign&&window.PFCallsign){ var _cs=window.PFCallsign(); if(_cs) body.callsign=_cs; }
    if(!body.auth_secret&&window.PF&&PF.getAuthSecret){ var _s=PF.getAuthSecret(); if(_s) body.auth_secret=_s; }
  }catch(e){}
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). Admin surface. */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":getSecret()},body:JSON.stringify(body)},c=null,t=null;
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
function fmtDur(ms){
  if(ms<=0) return "now";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;
  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);
  var out=""; if(d>0)out+=d+"d "; if(h>0||d>0)out+=h+"h "; out+=m+"m";
  return out.trim();
}
function val(id){ var el=document.getElementById(id); return el?String(el.value||"").trim():""; }
function err(id,m){ var el=document.getElementById(id); if(el) el.textContent=m||""; }
var NH=null, LS=null, WL=null, CL=null, EL=null, DL=null, AL=null, BP=null, IS=null, WH=null, BTL=null, AUL=null, SN=null, SH=null, PQ=null;
function load(){
  var n=0;
  function one(){ n++; if(n>=15) render(); }
  setTimeout(render,15000);
  apiAdmin("network_health",function(j){ NH=j; one(); });
  /* 2026-10-03 conn fix: was hardcoded callsign:"x". Use the admin's own
     callsign when known; the read is public so no param is fine too. */
  var _vcs=""; try{ if(window.PFCallsign) _vcs=window.PFCallsign()||""; }catch(e){}
  api("lottery_status",_vcs?{callsign:_vcs}:{},function(j){ LS=j; one(); });
  api("wager_list",{},function(j){ WL=j; one(); });
  api("cause_list",{},function(j){ CL=j; one(); });
  api("event_list",{},function(j){ EL=j; one(); });
  api("drop_list",{},function(j){ DL=j; one(); });
  api("alert_list",{},function(j){ AL=j; one(); });
  apiAdmin("battle_proposals",function(j){ BP=j; one(); });
  apiAdmin("intel_submissions",function(j){ IS=j; one(); });
  /* S2 (2026-10-04): post-proof approval queue (shared with B6 later). */
  apiAdmin("proof_queue",function(j){ PQ=j; one(); });
  api("battle_list",{},function(j){ BTL=j; one(); });
  api("auction_list",{},function(j){ AUL=j; one(); });
  apiAdmin("webhook_health",function(j){ WH=j; one(); });
  /* Season console (2026-10-04): current + history are public JSONP reads,
     the writes ride post("season","s_action",...) with X-Admin-Secret. */
  api("season_current",{},function(j){ SN=j; one(); });
  api("season_history",{},function(j){ SH=j; one(); });
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
      else{ clearSecret(); err("vlGateErr",PF.errCopy(j,"Invalid secret.")); }
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
  /* FLASH EVENT CONSOLE (2026-10-04): fire a site-wide XP multiplier window.
     POST flash_create {title, multiplier, duration_hours, description} rides
     X-Admin-Secret (copied to _adminSecret by index.js); backend clamps
     multiplier 1.25x-5x and duration 1h-72h; xp.js multiplies every grant
     while an event is active. */
  h+='<div class="x-pane"><h4>Flash event console</h4>'
    +'<div class="x-note">Ignite a site-wide XP multiplier. Every XP grant is multiplied while it burns (xp.js applies it automatically). Backend clamps: 1.25x&ndash;5x, 1&ndash;72 hours.</div>'
    +'<div class="vl-form"><input aria-label="Flash event title" id="vlFEvt" class="c-input pf-input-lg" placeholder="Event title (e.g. RIOT WEEKEND)" >'
    +'<input aria-label="Multiplier" id="vlFMult" class="c-input pf-input-sm" type="number" min="1.25" max="5" step="0.25" value="2" >'
    +'<input aria-label="Duration hours" id="vlFHrs" class="c-input pf-input-sm" type="number" min="1" max="72" step="1" value="2" >'
    +'<input aria-label="Description (optional)" id="vlFDesc" class="c-input pf-input-lg" placeholder="Description (optional)" >'
    +'<button class="c-btn" id="vlFFire">IGNITE FLASH EVENT</button><div class="c-err" id="vlFErr"></div></div>'
    +'<div class="x-note" id="vlFOut"></div></div>';
  /* FLASH BROADCAST (2026-10-03): the producer behind the 'Flash events'
     notification preference. Fires a broadcast email (type='flash_events')
     to every email-opted-in user; drainQueue respects per-type prefs. */
  h+='<div class="x-pane"><h4>Flash broadcast</h4>'
    +'<div class="x-note">Enqueues a broadcast email to everyone opted in to Flash events. No sender configured yet? The row waits in the queue — no flood.</div>'
    +'<div class="vl-form"><input aria-label="Flash title" id="vlFBTitle" class="c-input pf-input-lg" placeholder="Flash title" >'
    +'<input aria-label="Flash message" id="vlFBMsg" class="c-input pf-input-lg" placeholder="Message (goes to email + in-app)" >'
    +'<button class="c-btn" id="vlFBFire">FIRE BROADCAST</button><div class="c-err" id="vlFBErr"></div></div></div>';
  /* A8 WAR-WORD CONSOLE (2026-10-04): set the spoken war-word for a podcast
     episode. POST warword_set rides X-Admin-Secret (vault post()); backend
     clamps payout 5..50 XP, deactivates the old word, and pings active
     fighters WITHOUT naming the word (it stays spoken-only). */
  h+='<div class="x-pane"><h4>War-word console</h4>'
    +'<div class="x-note">Set the war-word spoken in the latest episode. Listeners type it in Daily Fire to claim the bounty. Keep the word spoken-only — it is never shown on-site.</div>'
    +'<div class="vl-form"><input aria-label="War-word" id="vlWWWord" class="c-input pf-input-md" placeholder="War-word (e.g. CATACLYSM)" >'
    +'<input aria-label="Episode label" id="vlWWEp" class="c-input pf-input-lg" placeholder="Episode label (e.g. EP 42 — THE TURN)" >'
    +'<input aria-label="Bounty XP" id="vlWWXp" class="c-input pf-input-sm" type="number" min="5" max="50" step="1" value="25" >'
    +'<button class="c-btn" id="vlWWFire">SET WAR-WORD</button><div class="c-err" id="vlWWErr"></div></div>'
    +'<div class="x-note" id="vlWWOut"></div></div>';
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
  /* S2 (2026-10-04) — PROOF QUEUE: post-proof bounty claims awaiting
     verdict. Approve pays the XP through xpGrant caps; reject burns
     nothing and ticks the device's rejection counter (repeat offenders
     flagged). Shared queue — B6 (Raid the Comments) rides it later. */
  var pql=(PQ&&PQ.ok&&PQ.queue)||[];
  h+='<div class="x-pane"><h4>Proof queue ('+pql.length+' pending)</h4>';
  h+='<div class="x-note">Post-proof bounty claims. APPROVE pays the XP (capped); REJECT burns nothing, flags repeat offenders.</div>';
  if(!pql.length){ h+='<div class="x-note">Queue is empty.</div>'; }
  for(var qi=0;qi<pql.length;qi++){
    var pq0=pql[qi];
    var prc=Number(pq0.reject_count)||0;
    h+='<div class="vl-mod"><b>'+esc(pq0.bounty_title||'Untitled')+'</b> '
      +'<span class="x-note">'+Number(pq0.xp_reward||0)+' XP &bull; '+esc(pq0.platform||'?').toUpperCase()+' &bull; '+esc(pq0.hashtag||'')+'</span><br>'
      +'<span class="x-note">by '+esc(pq0.claimer||'?')+' &mdash; '+fmtDate(pq0.submitted_at)+'</span> '
      +'<a href="'+esc(pq0.proof_url||'#')+'" target="_blank" rel="noopener" style="color:#dc143c;font-size:12px">VERIFY POST</a>'
      +(prc>0?' <span class="x-note" style="color:#c1121f;font-weight:bold">REJECTS: '+prc+(prc>=3?' — REPEAT OFFENDER':'')+'</span>':'')+'<br>'
      +'<button class="c-btn c-btn-sm" data-pap="'+pq0.id+'">APPROVE</button> '
      +'<button class="c-btn c-btn-dim c-btn-sm" data-prj="'+pq0.id+'">REJECT</button></div>';
  }
  h+='</div>';
  /* S2 (2026-10-04) — post a POST-PROOF bounty (house-funded, no escrow). */
  h+='<div class="x-pane"><h4>Post a proof bounty</h4>'
    +'<div class="x-note">Network-funded: XP mints on approval. Claims need a matching-platform post URL.</div>'
    +'<input aria-label="Bounty title" id="vlPBTitle" class="c-input pf-input-lg" placeholder="TITLE — e.g. Raid poster: October push" maxlength="80"><br>'
    +'<input aria-label="Bounty detail" id="vlPBDetail" class="c-input pf-input-lg" placeholder="Detail — what should the caption carry?" maxlength="200"><br>'
    +'<input aria-label="Bounty XP" id="vlPBXp" class="c-input pf-input-sm" placeholder="XP (5-500)" maxlength="3" inputmode="numeric"> '
    +'<select aria-label="Target platform" id="vlPBPlat" class="c-input pf-input-sm">'
    +'<option value="tiktok">TikTok</option><option value="instagram">Instagram</option>'
    +'<option value="facebook">Facebook</option><option value="youtube">YouTube</option></select><br>'
    +'<input aria-label="Mission hashtag" id="vlPBTag" class="c-input pf-input-lg" placeholder="Mission hashtag — e.g. #PFNMission12" maxlength="60"><br>'
    +'<input aria-label="Poster asset URL" id="vlPBAsset" class="c-input pf-input-lg" placeholder="Poster asset URL (https://…) — shown as the download" maxlength="500"><br>'
    +'<button class="c-btn" id="vlPBPost">POST PROOF BOUNTY</button><div class="c-err" id="vlPBErr"></div></div>';
  h+='</div>';
  h+='</div>';
  /* WEBHOOK HEALTH — War Bond commerce pipeline (2026-10-03 C2b).
     Admin-only: reveals whether the Squarespace order webhook has ever
     fired. "Never" means the webhook URL was never pasted — the reason
     bond_claim finds nothing. */
  h+='<div class="x-pane"><h4>War Bond webhook</h4>';
  if(WH&&WH.ok){
    if(WH.webhook_live){
      h+='<div class="x-note">Webhook LIVE. Last order received: <b>'+esc(WH.last_webhook)+'</b> &bull; '
        +Number(WH.purchases||0)+' purchase(s) recorded ('+Number(WH.manual_records||0)+' manual).</div>';
    } else {
      h+='<div class="c-err">NO WEBHOOK EVER RECEIVED. Paste the webhook URL in Squarespace '
        +'(WAR_BOND_WEBHOOK_SETUP.md) or record sales manually via bond_record.</div>';
    }
  } else {
    h+='<div class="x-note">Webhook health unavailable ('+esc((WH&&WH.err)||"loading")+').</div>';
  }
  h+='</div>';
  /* RECORD WAR BOND SALE — the bond_record fallback promised in the help
     text above (2026-10-04). Manual recording for cash/in-person sales
     until the Squarespace webhook URL is pasted. Thank-you XP routes
     through xpGrant, so daily caps still apply; on a cap-hit day the XP
     stays claimable via bond_claim. */
  var wbD=new Date(), wbM=wbD.getMonth()+1, wbDay=wbD.getDate();
  var wbToday=wbD.getFullYear()+"-"+(wbM<10?"0":"")+wbM+"-"+(wbDay<10?"0":"")+wbDay;
  h+='<div class="x-pane"><h4>Record War Bond sale</h4>'
    +'<div class="x-note">Manual fallback for cash/in-person sales — until the Squarespace order webhook is live.</div>'
    +'<div class="vl-form">'
    +'<input aria-label="Buyer callsign" id="vlWBcs" class="c-input pf-input-md" placeholder="Buyer callsign" >'
    +'<input aria-label="Buyer email (optional)" id="vlWBemail" class="c-input pf-input-lg" placeholder="Buyer email (optional)" >'
    +'<select aria-label="War Bond tier" id="vlWBtier" class="c-input pf-input-sm">'
    +'<option value="5">$5 &mdash; 50 XP</option>'
    +'<option value="10">$10 &mdash; 100 XP</option>'
    +'<option value="25">$25 &mdash; 250 XP</option>'
    +'<option value="50">$50 &mdash; 500 XP</option>'
    +'</select>'
    +'<input aria-label="Sale date" id="vlWBdate" class="c-input pf-input-md" type="date" value="'+wbToday+'" >'
    +'<button class="c-btn" id="vlWBRec">RECORD SALE</button><div class="c-err" id="vlWBErr"></div>'
    +'</div><div class="x-note" id="vlWBOut"></div></div>';
  /* BATTLE CONTROL — direct create/close/voting control (2026-10-03 H7).
     Proposals still flow through the moderation queue above; these are the
     admin-only battle_create / battle_create_staked / battle_open_voting /
     battle_close actions. Admin writes ride X-Admin-Secret like everything
     else in the vault. */
  h+='<div class="x-pane"><h4>Battle control</h4>'
    +'<div class="vl-form">'
    +'<input aria-label="Battle title" id="vlBT" class="c-input pf-input-lg" placeholder="Battle title" >'
    +'<input id="vlBEnds" class="c-input pf-input-md" type="datetime-local" >'
    +'<button class="c-btn" id="vlBCreate">CREATE BATTLE</button><div class="c-err" id="vlBErr"></div>'
    +'</div>'
    +'<div class="vl-form" style="margin-top:6px">'
    +'<input aria-label="Staked battle title" id="vlBST" class="c-input pf-input-lg" placeholder="Staked battle title" >'
    +'<input aria-label="Entry fee XP" id="vlBFee" class="c-input pf-input-sm" type="number" min="1" placeholder="Fee XP" >'
    +'<input aria-label="Prize pool XP" id="vlBPool" class="c-input pf-input-sm" type="number" min="0" placeholder="Pool XP" >'
    +'<button class="c-btn" id="vlBSCreate">CREATE STAKED</button><div class="c-err" id="vlBSErr"></div>'
    +'</div>';
  var vbl=(BTL&&BTL.ok&&BTL.battles)||[];
  if(!vbl.length){ h+='<div class="x-note">No battles on record.</div>'; }
  for(var vbi=0;vbi<vbl.length;vbi++){
    var vb=vbl[vbi], vst=String(vb.status||"").toUpperCase();
    h+='<div class="vl-row"><div><b>'+esc(vb.title||vb.id)+'</b> '
      +' <span class="x-note">'+vst+' &bull; ends '+fmtDate(vb.ends_at)
      +(Number(vb.entry_fee)>0?(' &bull; STAKED '+Number(vb.entry_fee)+' XP in / '+Number(vb.prize_pool||0)+' pool'):'')
      +'</span></div><div class="vl-form">'
      +(vb.status==="open"?'<button class="c-btn c-btn-sm" data-bvote="'+esc(vb.id)+'">OPEN VOTING</button> ':'')
      +(vb.status!=="closed"?'<button class="c-btn c-btn-dim c-btn-sm" data-bclose="'+esc(vb.id)+'">CLOSE &amp; SETTLE</button>':'')
      +'</div></div>';
  }
  h+='<div class="c-err" id="vlBCErr"></div>';
  /* Auctions are admin-seeded; the seller-cancel lives here (admin rail).
     Only pre-bid auctions can be cancelled — the backend enforces it. */
  var vaul=(AUL&&AUL.ok&&AUL.auctions)||[];
  h+='<div class="x-note" style="margin-top:8px"><b>Auctions</b></div>';
  if(!vaul.length){ h+='<div class="x-note">No auctions running.</div>'; }
  for(var vai=0;vai<vaul.length;vai++){
    var va=vaul[vai];
    h+='<div class="vl-row"><div><b>'+esc(va.slot||va.id)+'</b> '
      +' <span class="x-note">top bid '+Number(va.current_bid||0)+' XP &bull; '+(Number(va.bid_count||0))+' bid(s) &bull; ends '+fmtDate(va.ends_at)+'</span></div>'
      +((Number(va.bid_count||0)===0)?'<button class="c-btn c-btn-dim c-btn-sm" data-acancel="'+esc(va.id)+'">CANCEL AUCTION</button>':'<span class="x-note">has bids — close instead</span>')
      +'</div>';
  }
  h+='<div class="c-err" id="vlACErr"></div></div>';
  /* WAVE3-S3-START (race console HTML)
     S3 Creator Recruit Races (2026-10-04): race create/end admin forms ride
     post("recruitrace","rr_action",...) + X-Admin-Secret, exact vault pattern.
     Backend: recruitRaceDispatch (race_create / race_end / race_payout /
     recruit_race). Wire-up lives in the WAVE3-S3 wire-up block below. */
  h+='<div class="x-pane"><h4>Recruit races</h4>';
  h+='<div class="x-note" id="vlRaceStatus">Loading race status&hellip;</div>';
  h+='<div class="vl-form">'
    +'<input aria-label="Race name" id="vlRName" class="c-input pf-input-lg" placeholder="Race name (e.g. October Recruit Sprint)" >'
    +'<input aria-label="Start date" id="vlRStart" class="c-input pf-input-md" type="datetime-local" >'
    +'<input aria-label="End date" id="vlREnd" class="c-input pf-input-md" type="datetime-local" >'
    +'<input aria-label="Participants (optional, comma-separated callsigns)" id="vlRParts" class="c-input pf-input-lg" placeholder="Participants (optional): callsign1, callsign2&hellip;" >'
    +'<button class="c-btn" id="vlRCreate">START RACE</button><div class="c-err" id="vlRErr"></div>'
    +'</div>';
  h+='<div class="vl-form">'
    +'<input aria-label="Race ID (end)" id="vlREndId" class="c-input pf-input-lg" placeholder="Race ID" >'
    +'<button class="c-btn c-btn-dim" id="vlREndBtn">END RACE &amp; PAY WINNER</button><div class="c-err" id="vlREndErr"></div>'
    +'</div></div>';
  /* WAVE3-S3-END (race console HTML) */
  /* SEASON CONTROL (2026-10-04): the 32-Day Offensive is over; no way to
     launch a new season without curl. Three admin forms ride the existing
     post("season","s_action",...) + X-Admin-Secret pattern.
     season_create params: name, description, starts_at, ends_at (epoch ms),
       goal_type, goal_target. season_tick: season_id, metric, value.
       season_end: season_id. */
  h+='<div class="x-pane"><h4>Season control</h4>';
  var sc=(SN&&SN.ok&&SN.season)||null;
  if(sc){
    h+='<div class="x-note">LIVE: <b>'+esc(sc.name)+'</b> &mdash; '+(sc.days_left||0)+' day(s) left &bull; '
      +esc(sc.goal_type)+': '+Number(sc.current||0)+'/'+Number(sc.goal_target||0)+' ('+Number(sc.pct||0)+'%)'
      +' <span class="x-note">id '+esc(sc.id)+'</span></div>';
  } else {
    h+='<div class="x-note">No live season ('+esc((SN&&SN.err)||(SN&&!SN.season?"ended / none":"loading"))+'). The 32-Day Offensive has ended &mdash; launch the next campaign below.</div>';
  }
  h+='<div class="vl-form">'
    +'<input aria-label="Season name" id="vlSName" class="c-input pf-input-lg" placeholder="Season name (e.g. 45-Day Surge)" >'
    +'<input aria-label="Season description" id="vlSDesc" class="c-input pf-input-lg" placeholder="Description (goal narrative)" >'
    +'<input aria-label="Start date" id="vlSStart" class="c-input pf-input-md" type="datetime-local" >'
    +'<input aria-label="End date" id="vlSEnd" class="c-input pf-input-md" type="datetime-local" >'
    +'<input aria-label="Goal type (metric)" id="vlSGType" class="c-input pf-input-md" placeholder="Goal type (e.g. shares)" >'
    +'<input aria-label="Goal target" id="vlSGTarget" class="c-input pf-input-sm" type="number" min="1" placeholder="Target" >'
    +'<button class="c-btn" id="vlSCreate">LAUNCH SEASON</button><div class="c-err" id="vlSErr"></div>'
    +'</div>';
  h+='<div class="vl-form" style="margin-top:6px">'
    +'<input aria-label="Season ID (tick)" id="vlTSeason" class="c-input pf-input-lg" placeholder="Season ID" >'
    +'<input aria-label="Metric" id="vlTMetric" class="c-input pf-input-md" placeholder="Metric (e.g. shares)" >'
    +'<input aria-label="Value to add" id="vlTValue" class="c-input pf-input-sm" type="number" placeholder="+ value" >'
    +'<button class="c-btn" id="vlSTick">TICK SEASON</button><div class="c-err" id="vlTErr"></div>'
    +'<div class="x-note" id="vlTOut"></div></div>';
  h+='<div class="vl-form" style="margin-top:6px">'
    +'<input aria-label="Season ID (end)" id="vlESeason" class="c-input pf-input-lg" placeholder="Season ID" >'
    +'<button class="c-btn c-btn-dim" id="vlSEndBtn">END SEASON</button><div class="c-err" id="vlEErr"></div>'
    +'</div>';
  var shr=(SH&&SH.ok&&SH.seasons)||[];
  if(shr.length){
    h+='<div class="x-note" style="margin-top:6px"><b>Recent seasons</b></div><div class="vl-list">';
    for(var si=0;si<Math.min(shr.length,6);si++){ var ss=shr[si];
      h+='<div class="vl-row"><div><b>'+esc(ss.name||ss.id)+'</b>'
        +' <span class="x-note">'+String(ss.status||"").toUpperCase()+' &bull; '+Number(ss.current||0)+'/'+Number(ss.goal_target||0)+' ('+Number(ss.pct||0)+'%)</span></div>'
        +'<span class="x-note">'+esc(ss.id)+'</span></div>';
    }
    h+='</div>';
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
    /* H2 fix (2026-10-04): the draw request must carry the current round_id
       (backend requires it). LS is the lottery_status read from load(). */
    var drr=(LS&&LS.ok&&LS.round)||null;
    if(!drr||!drr.id){ b.disabled=false; err("vlDrawErr","No active lottery round."); toast("Draw failed: no active lottery round."); return; }
    post("gamble","g_action","lottery_draw",{round_id:drr.id},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlDrawErr",PF.errCopy(j,"Draw failed.")); return; }
      toast("Winner: "+j.winner+" — "+j.pot+" XP."); LS=null; load();
    }); };
  b=document.getElementById("vlWCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var sides=val("vlWSides").split(",").map(function(s){ return s.trim(); }).filter(Boolean);
    var closes=val("vlWClose"); var ts=closes?new Date(closes).getTime():0;
    post("wager","w_action","wager_create",{kind:val("vlWKind"),target_id:val("vlWTid"),description:val("vlWDesc"),sides:sides,closes_at:ts},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlWErr",PF.errCopy(j,"Create failed.")); return; }
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
        if(!j||!j.ok){ err("vlWResErr",PF.errCopy(j,"Resolve failed.")); return; }
        toast("Wager resolved. "+(j.payouts||[]).length+" payouts."); WL=null; load();
      }); };
  })(rbs[i]); }
  b=document.getElementById("vlSubProc");
  if(b) b.onclick=function(){ b.disabled=true;
    post("sub","s_action","subscription_process",{},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlSubErr",PF.errCopy(j,"Process failed.")); return; }
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
        if(!j||!j.ok){ err("vlCWErr",PF.errCopy(j,"Withdraw failed.")); return; }
        toast("Disbursed "+(j.withdrawn||0)+" XP from "+pid+"."); CL=null; load();
      }); };
  })(cwb[i]); }
  b=document.getElementById("vlPAward");
  if(b) b.onclick=function(){ b.disabled=true;
    post("prize","p_action","prize_award",{pool_id:val("vlPPool"),winner:val("vlPWin")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlPErr",PF.errCopy(j,"Award failed.")); return; }
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
        if(!j||!j.ok){ err("vlEAErr",PF.errCopy(j,"Confirm failed.")); return; }
        toast(j.dup?"Already confirmed.":"Attendance confirmed. +100 XP to "+cs+".");
      }); };
  })(eab[e]); }
  b=document.getElementById("vlDCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var at=val("vlDAt"); var ts=at?new Date(at).getTime():0;
    post("drop","d_action","drop_create",{title:val("vlDTitle"),content_id:val("vlDCid"),drop_at:ts},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlDErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Drop created: "+j.id); DL=null; load();
    }); };
  b=document.getElementById("vlACreate");
  if(b) b.onclick=function(){ b.disabled=true;
    post("alert","al_action","alert_create",{headline:val("vlAHead"),context:val("vlACtx"),template_id:val("vlATpl")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlAErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Alert created: "+j.id); AL=null; load();
    }); };
  /* flash event console: flash_create rides X-Admin-Secret (vault post());
     created_by comes from the admin's own callsign attached above. */
  b=document.getElementById("vlFFire");
  if(b) b.onclick=function(){ b.disabled=true;
    var ft=val("vlFEvt");
    if(!ft){ err("vlFErr","Title required."); b.disabled=false; return; }
    var fmult=Number(val("vlFMult"))||2, fhrs=Number(val("vlFHrs"))||2;
    if(fmult<1.25||fmult>5){ err("vlFErr","Multiplier must be 1.25 to 5."); b.disabled=false; return; }
    if(fhrs<1||fhrs>72){ err("vlFErr","Duration must be 1 to 72 hours."); b.disabled=false; return; }
    post("flash","fl_action","flash_create",
      {title:ft,multiplier:fmult,duration_hours:fhrs,description:val("vlFDesc")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlFErr",PF.errCopy(j,"Ignite failed.")); return; }
      toast("Flash event live: "+j.multiplier+"x XP until "+fmtDate(j.ends_at)+".");
      var out=document.getElementById("vlFOut");
      if(out) out.textContent="Event ID "+j.id+" — multiplier hits every XP grant now.";
      var fte=document.getElementById("vlFEvt"); if(fte) fte.value="";
    }); };
  /* flash broadcast: the producer for the 'Flash events' email pref */
  b=document.getElementById("vlFBFire");
  if(b) b.onclick=function(){ b.disabled=true;
    var ft=val("vlFBTitle"), fm=val("vlFBMsg");
    if(!ft||!fm){ err("vlFBErr","Title and message required."); b.disabled=false; return; }
    post("flash","fl_action","flash_broadcast",{title:ft,message:fm},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlFBErr",PF.errCopy(j,"Broadcast failed.")); return; }
      toast("Flash broadcast queued (row "+j.id+"). It drains with the hourly queue.");
    }); };
  /* A8 war-word console: warword_set rides X-Admin-Secret (vault post());
     backend normalizes the word, clamps 5..50 XP, and pings active fighters
     without naming the word. */
  b=document.getElementById("vlWWFire");
  if(b) b.onclick=function(){ b.disabled=true;
    var ww=val("vlWWWord");
    if(!ww){ err("vlWWErr","War-word required."); b.disabled=false; return; }
    var wxp=Number(val("vlWWXp"))||25;
    if(wxp<5||wxp>50){ err("vlWWErr","Bounty must be 5 to 50 XP."); b.disabled=false; return; }
    post("warword","w_action","warword_set",{word:ww,episode:val("vlWWEp"),xp:wxp},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlWWErr",PF.errCopy(j,"Set failed.")); return; }
      toast("War-word live: "+j.word.toUpperCase()+" ("+j.xp_amount+" XP). Fighters were pinged.");
      var out=document.getElementById("vlWWOut");
      if(out) out.textContent="Active word: "+j.word+" — episode: "+(j.episode||"(unlabeled)")+" — "+j.xp_amount+" XP bounty.";
      var wwe=document.getElementById("vlWWWord"); if(wwe) wwe.value="";
    }); };
  /* moderation queue: battle proposals */
  var baps=document.querySelectorAll("[data-bap]");
  for(var bi=0;bi<baps.length;bi++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("battle","b_action","battle_approve",{proposal_id:btn.getAttribute("data-bap")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Approve failed: "+(PF.errCopy(j,"error"))); return; }
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
        if(!j||!j.ok){ toast("Reject failed: "+(PF.errCopy(j,"error"))); return; }
        toast("Proposal rejected."); BP=null; load();
      }); };
  })(brjs[bj]); }
  /* moderation queue: intel submissions */
  var iaps=document.querySelectorAll("[data-iap]");
  for(var ii=0;ii<iaps.length;ii++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("intel","i_action","intel_approve",{submission_id:btn.getAttribute("data-iap")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Approve failed: "+(PF.errCopy(j,"error"))); return; }
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
        if(!j||!j.ok){ toast("Reject failed: "+(PF.errCopy(j,"error"))); return; }
        toast("Submission rejected."); IS=null; load();
      }); };
  })(irjs[ij]); }
  /* S2 (2026-10-04) moderation queue: proof claims (shared with B6 later) */
  var paps=document.querySelectorAll("[data-pap]");
  for(var pi=0;pi<paps.length;pi++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("bounty","b_action","proof_verdict",{claim_id:btn.getAttribute("data-pap"),verdict:"approve"},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Approve failed: "+(PF.errCopy(j,"error"))); return; }
        toast("Proof approved: +"+(j.xp||0)+" XP paid."); PQ=null; load();
      }); };
  })(paps[pi]); }
  var prjs=document.querySelectorAll("[data-prj]");
  for(var pj=0;pj<prjs.length;pj++){ (function(btn){
    btn.onclick=function(){
      var reason=window.prompt("Rejection reason (optional):")||"";
      btn.disabled=true;
      post("bounty","b_action","proof_verdict",{claim_id:btn.getAttribute("data-prj"),verdict:"reject",reason:reason},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast("Reject failed: "+(PF.errCopy(j,"error"))); return; }
        toast("Proof rejected. Nothing paid."); PQ=null; load();
      }); };
  })(prjs[pj]); }
  /* S2 (2026-10-04): post a proof bounty (house-funded) */
  b=document.getElementById("vlPBPost");
  if(b) b.onclick=function(){ b.disabled=true; err("vlPBErr","");
    var pt=val("vlPBTitle"), px=Math.round(Number(val("vlPBXp"))||0);
    if(pt.length<4){ err("vlPBErr","Title needs 4+ characters."); b.disabled=false; return; }
    if(!(px>=5&&px<=500)){ err("vlPBErr","XP must be 5-500."); b.disabled=false; return; }
    post("bounty","b_action","proofbounty_create",{title:pt,detail:val("vlPBDetail"),xp_reward:px,
      platform:val("vlPBPlat"),hashtag:val("vlPBTag"),asset_url:val("vlPBAsset")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlPBErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Proof bounty live: "+j.id); load();
    }); };
  /* battle control: create / create staked / open voting / close & settle */
  b=document.getElementById("vlBCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var ends=val("vlBEnds"); var ts=ends?new Date(ends).getTime():0;
    post("battle","b_action","battle_create",{title:val("vlBT"),ends_at:ts},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlBErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Battle created: "+j.id); BTL=null; load();
    }); };
  b=document.getElementById("vlBSCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    post("battle","b_action","battle_create_staked",{title:val("vlBST"),entry_fee:Number(val("vlBFee"))||0,prize_pool:Number(val("vlBPool"))||0},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlBSErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Staked battle created: "+j.id); BTL=null; load();
    }); };
  var bvts=document.querySelectorAll("[data-bvote]");
  for(var vi=0;vi<bvts.length;vi++){ (function(btn){
    btn.onclick=function(){ btn.disabled=true;
      post("battle","b_action","battle_open_voting",{battle_id:btn.getAttribute("data-bvote")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlBCErr",PF.errCopy(j,"Open voting failed.")); return; }
        toast("Voting open."); BTL=null; load();
      }); };
  })(bvts[vi]); }
  var bcls=document.querySelectorAll("[data-bclose]");
  for(var ci=0;ci<bcls.length;ci++){ (function(btn){
    btn.onclick=function(){
      if(!window.confirm("Close and settle this battle? Winner takes +100 XP.")) return;
      btn.disabled=true;
      post("battle","b_action","battle_close",{battle_id:btn.getAttribute("data-bclose")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlBCErr",PF.errCopy(j,"Close failed.")); return; }
        toast("Battle settled. Winner: "+(j.winner||"?")); BTL=null; load();
      }); };
  })(bcls[ci]); }
  /* manual war bond sale: bond_record via the warbond admin rail */
  b=document.getElementById("vlWBRec");
  if(b) b.onclick=function(){ b.disabled=true; err("vlWBErr","");
    var cs=val("vlWBcs"), em=val("vlWBemail").toLowerCase(), tier=Number(val("vlWBtier"))||0;
    var dv=val("vlWBdate"), soldTs=dv?(new Date(dv+"T12:00:00").getTime()||0):0;
    if(!cs&&!em){ err("vlWBErr","Buyer callsign or email required."); b.disabled=false; return; }
    if(!tier){ err("vlWBErr","Pick a War Bond tier."); b.disabled=false; return; }
    post("warbond","wb_action","bond_record",{buyer_callsign:cs,email:em,amount:tier,sold_ts:soldTs},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlWBErr",PF.errCopy(j,"Record failed.")); return; }
      var out=document.getElementById("vlWBOut");
      var bits=[];
      if(j.dup) bits.push("<b>DUPLICATE</b> — this sale was already recorded.");
      bits.push("Recorded a <b>$"+Number(j.tier||0)+"</b> War Bond sale"+(j.callsign?(" for <b>"+esc(j.callsign)+"</b>"):"")+".");
      bits.push("Thank-you XP: <b>"+Number(j.xp_granted||0)+"</b>"+
        (Number(j.xp_granted||0)===0?" (cap-hit day — stays claimable via bond_claim).":"."));
      bits.push("Split: $"+Number(j.network_share||0).toFixed(2)+" network / $"+Number(j.creator_share||0).toFixed(2)+" creator pool.");
      bits.push("Order: <span class=\"c-mono\">"+esc(j.order_id||"")+"</span>");
      if(out) out.innerHTML=bits.join("<br>");
      toast(j.dup?"Sale already recorded.":"War Bond sale recorded: $"+j.tier+(j.callsign?" for "+j.callsign:"")+".");
    }); };
  /* auction cancel (admin): only pre-bid auctions can be cancelled */
  var acs=document.querySelectorAll("[data-acancel]");
  for(var ai2=0;ai2<acs.length;ai2++){ (function(btn){
    btn.onclick=function(){
      if(!window.confirm("Cancel this auction? It must have no bids.")) return;
      btn.disabled=true;
      post("sink","s_action","auction_cancel",{auction_id:btn.getAttribute("data-acancel")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ err("vlACErr",PF.errCopy(j,"Cancel failed.")); return; }
        toast("Auction cancelled."); AUL=null; load();
      }); };
  })(acs[ai2]); }
  /* WAVE3-S3-START (race console wire-up)
     S3 Creator Recruit Races (2026-10-04): race create + end wire-up.
     Reads recruit_race (public JSONP); writes ride
     post("recruitrace","rr_action",...) with X-Admin-Secret.
     race_end closes the race early AND auto-pays the champion. */
  api("recruit_race",{race_id:"current"},function(j){
    var box=document.getElementById("vlRaceStatus"); if(!box) return;
    if(!j||!j.ok){ box.textContent="Race status unavailable."; return; }
    var r=j.race;
    if(r){
      box.innerHTML="LIVE: <b>"+esc(r.name)+"</b> &mdash; ends in "+fmtDur(Number(r.seconds_left||0))
        +" &bull; "+Number(j.total_recruits||0)+" recruits counted"
        +' <span class="x-note">id '+esc(r.id)+'</span>';
      var eid=document.getElementById("vlREndId"); if(eid&&!eid.value) eid.value=r.id;
    } else if(j.champion&&j.champion.winner){
      box.innerHTML="No live race. Last champion: <b>"+esc(j.champion.winner)+"</b>"
        +" ("+esc(j.champion.race_name||"")+")";
    } else {
      box.textContent="No races yet — start the first one below.";
    }
  });
  b=document.getElementById("vlRCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var rName=val("vlRName");
    var rMs=val("vlRStart")?new Date(val("vlRStart")).getTime():0;
    var rEndMs=val("vlREnd")?new Date(val("vlREnd")).getTime():0;
    if(!rName){ err("vlRErr","Race name required."); b.disabled=false; return; }
    if(!(rMs>0)||!(rEndMs>0)){ err("vlRErr","Start and end dates required."); b.disabled=false; return; }
    if(!(rEndMs>rMs)){ err("vlRErr","End must be after start."); b.disabled=false; return; }
    post("recruitrace","rr_action","race_create",{name:rName,starts_at:rMs,ends_at:rEndMs,participants:val("vlRParts")},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlRErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Race started: "+j.id); load();
    }); };
  b=document.getElementById("vlREndBtn");
  if(b) b.onclick=function(){
    var rid=val("vlREndId");
    if(!rid){ err("vlREndErr","Race ID required."); return; }
    if(!window.confirm("End race "+rid+"? It closes out and pays the champion.")) return;
    b.disabled=true;
    post("recruitrace","rr_action","race_end",{race_id:rid},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlREndErr",PF.errCopy(j,"End failed.")); return; }
      toast(j.winner?("Race ended. Champion: "+j.winner+" (+"+j.xp+" XP)."):"Race ended — no qualifying recruits."); load();
    }); };
  /* WAVE3-S3-END (race console wire-up) */
  /* season control: create / tick / end (2026-10-04).
     All ride post("season","s_action",...) + X-Admin-Secret, exact vault pattern. */
  var scCur=(SN&&SN.ok&&SN.season)||null;
  var _tEl=document.getElementById("vlTSeason"), _mEl=document.getElementById("vlTMetric"), _eEl=document.getElementById("vlESeason");
  if(scCur&&scCur.id){
    if(_tEl&&!_tEl.value) _tEl.value=scCur.id;
    if(_eEl&&!_eEl.value) _eEl.value=scCur.id;
    if(_mEl&&!_mEl.value) _mEl.value=scCur.goal_type||"shares";
  }
  b=document.getElementById("vlSCreate");
  if(b) b.onclick=function(){ b.disabled=true;
    var sName=val("vlSName");
    var sMs=val("vlSStart")?new Date(val("vlSStart")).getTime():0;
    var eMs=val("vlSEnd")?new Date(val("vlSEnd")).getTime():0;
    if(!sName){ err("vlSErr","Season name required."); b.disabled=false; return; }
    if(!(sMs>0)||!(eMs>0)){ err("vlSErr","Start and end dates required."); b.disabled=false; return; }
    if(!(eMs>sMs)){ err("vlSErr","End must be after start."); b.disabled=false; return; }
    post("season","s_action","season_create",{name:sName,description:val("vlSDesc"),starts_at:sMs,ends_at:eMs,goal_type:val("vlSGType"),goal_target:Number(val("vlSGTarget"))||0},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlSErr",PF.errCopy(j,"Create failed.")); return; }
      toast("Season launched: "+j.id); SN=null; SH=null; load();
    }); };
  b=document.getElementById("vlSTick");
  if(b) b.onclick=function(){ b.disabled=true;
    var sid=val("vlTSeason");
    if(!sid){ err("vlTErr","Season ID required."); b.disabled=false; return; }
    post("season","s_action","season_tick",{season_id:sid,metric:val("vlTMetric")||"shares",value:Number(val("vlTValue"))||0},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlTErr",PF.errCopy(j,"Tick failed.")); return; }
      var out=document.getElementById("vlTOut");
      if(out) out.textContent="Progress updated. Total: "+(j.total||0)+".";
      toast("Season ticked. Total: "+(j.total||0)+"."); SN=null; SH=null; load();
    }); };
  b=document.getElementById("vlSEndBtn");
  if(b) b.onclick=function(){
    var sid=val("vlESeason");
    if(!sid){ err("vlEErr","Season ID required."); return; }
    if(!window.confirm("End season "+sid+"? It closes out and leaves the current slot empty.")) return;
    b.disabled=true;
    post("season","s_action","season_end",{season_id:sid},function(j){
      b.disabled=false;
      if(!j||!j.ok){ err("vlEErr",PF.errCopy(j,"End failed.")); return; }
      toast("Season ended: "+sid); SN=null; SH=null; load();
    }); };
}
renderGate();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(getSecret()) load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);

/* ---- DIRECT-URL MOUNT (2026-10-03, gap C1) ----
   The vault template is staged above but NOT in the homepage ORDER — this
   is what makes the Battle/Intel moderation queue reachable again.
   Mount rule: ONLY when the page URL carries ?vault=1 (or #vault).
   Without the flag, nothing mounts: no template, no error leak.
   Admin gate: the vault's own inner gate (renderGate) prompts for the admin
   secret (sessionStorage 'pf_admin_secret', same key as dashboard.js) and
   every data read/write rides on X-Admin-Secret — a visitor without the
   secret sees only the locked gate, never vault data.
   Never mounts inside the Squarespace editor. Idempotent. */
try {
  var _vhref = String((window.location && window.location.href) || '');
  var _vhash = String((window.location && window.location.hash) || '');
  var _vwant = /[?&]vault=1(?:[&#]|$)/.test(_vhref) || _vhash === '#vault';
  if (_vwant && !window.pfVaultMounted) {
    var _ved = _vhref.indexOf('/config/') !== -1;
    try {
      var _vb = document.body;
      if (_vb && (_vb.classList.contains('sqs-edit-mode') || _vb.classList.contains('sqs-editing'))) _ved = true;
    } catch (_ve0) {}
    if (!_ved) {
      var _vtpl = document.getElementById('pf-ov-vault');
      if (_vtpl && _vtpl.content && !document.getElementById('pf-vault')) {
        window.pfVaultMounted = true;
        var _vfrag = document.importNode(_vtpl.content, true);
        var _vss = _vfrag.querySelectorAll ? _vfrag.querySelectorAll('script') : [];
        var _vcode = [];
        for (var _vi = 0; _vi < _vss.length; _vi++) {
          try { _vcode.push(_vss[_vi].textContent); } catch (_ve1) {}
          try { _vss[_vi].remove(); } catch (_ve2) {}
        }
        /* Homepage shell (#pf-v2) keeps funnel styling; any other page gets
           a visible mount at the top of the body. PF.holder() is display:none
           (staging only) — never mount there. */
        var _vhost = document.getElementById('pf-v2') || document.body;
        var _vsec = document.createElement('section');
        _vsec.className = 'pf-v2-game';
        _vsec.setAttribute('data-game', 'vault');
        _vsec.appendChild(_vfrag);
        if (_vhost === document.body && _vhost.firstChild) _vhost.insertBefore(_vsec, _vhost.firstChild);
        else _vhost.appendChild(_vsec);
        for (var _vj = 0; _vj < _vcode.length; _vj++) {
          try { (0, eval)(_vcode[_vj]); }
          catch (_ve3) { if (PF && PF.error) PF.error('vault', 'inner script failed :: ' + (_ve3 && _ve3.message || _ve3)); }
        }
      }
    }
  }
} catch (_ve4) {}

})();
