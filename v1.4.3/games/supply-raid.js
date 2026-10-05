/* games/supply-raid.js  |  PF v1.4.3 | SUPPLY LINE RAID — bespoke cell home
   (Redistribution Layer, Phase B). Crash mechanics under the raid fiction,
   mounted on the cell pages (page-mount.js 'pf-cells-page' order, silo key
   'raid', template id pf-ov-raid).
   cell_id SOURCE — mounting context only: the module reads the SAME
   cell_mine action the pf-cells-page / pf-cell-hq silo already loads for
   this viewer and takes its primary-cell object (j.cell), exactly the way
   cell-hq.js's own MY CELLS tab does. NEVER from URL params, NEVER from
   user input. (Accessor question for the Cells wave owner: if the cells
   stack ever publishes a formal context accessor, consume it here instead
   of re-reading cell_mine — grep proof: no location.search / URLSearchParams
   / hash reads anywhere in this file.)
   Membership gate: the backend validates cell_members on crash_bet (rejects
   forged cell claims); the frontend additionally hides the raid surface for
   non-members (a join-a-cell nudge renders instead — zero stake controls).
   Backend actions: crash_status?cell_id (cell-scoped round, Phase B),
   crash_bet (+cell_id), crash_cashout. Reads via JSONP, writes via CORS
   POST {type:"gamble",g_action:...} — same transport as gambits.js. Every
   real XP move happens server-side; this file mints zero XP. Pre-Phase-B
   backends ignore the cell_id param and return the global round — the UI
   renders whatever the backend returns and never claims a scope it cannot
   verify. Round history is the player's own observed journal (localStorage,
   keyed by cell_id) — never invented backend data.
   XP has no cash value — solidarity stakes for the movement.
   KILL: ?pf_off=raid  or  localStorage pf_disabled_v1='["raid"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("raid")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-raid">
<style>
.rd-scope{font:700 11px Arial,sans-serif;letter-spacing:2px;color:#c1121f;margin-bottom:4px}
.rd-line{font:900 44px "Arial Black",Arial,sans-serif;color:#f5ead6;letter-spacing:1px;margin:10px 0;text-align:center;text-shadow:0 0 18px rgba(193,18,31,.55)}
.rd-line.rd-dead{color:#ff4d5e;text-shadow:0 0 18px rgba(255,77,94,.6)}
.rd-jrnl{margin-top:12px;border-top:1px solid #2a2a2a;padding-top:8px}
.rd-jrow{display:flex;justify-content:space-between;gap:8px;font:400 12px Arial,sans-serif;color:#9c8f78;padding:5px 2px;border-bottom:1px solid #1d1d1d}
.rd-jrow b{color:#c9bfa8}
.rd-secret{font:400 11px monospace;color:#8a8171;word-break:break-all;margin-top:8px;line-height:1.5}
.rd-verify{font:700 12px Arial,sans-serif;margin-top:6px}
.rd-pass{color:#7dd87d}.rd-fail{color:#ff4d5e}.rd-na{color:#9c8f78}
.rd-trust{border-top:1px solid #2a2a2a;margin-top:14px;padding:10px 4px 2px;font:400 11.5px Arial,sans-serif;color:#8a8171;line-height:1.6;letter-spacing:.02em}
.rd-trust b{color:#c9bfa8}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-raid">
<h2>SUPPLY LINE RAID</h2>
<div class="c-tag">Run the line. Time the exfil. The spoils arm the cell.</div>
<div id="xRaid"><div class="c-load">Raising the cell network&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var JRNL_KEY="pf_raid_journal_v1";
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* cell_mine is a private read — auto-attach the callsign session secret
     (same IDOR pattern as cell-hq.js). */
  if(action==="cell_mine"){
    try{ var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=<redacted> }catch(e){}
  }
  var fn="pfRaidCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for writes — real fetch, backend verdict parsed. */
function postG(gAction,params,cb){
  var body={type:"gamble",g_action:gAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
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
/* FNV-1a uint32 — byte-identical expression to the backend's hash32
   (src/gamble.js); same IEEE-754 doubles in the browser reproduce the
   backend's values exactly, precision quirks included. */
function fnv1a(s){
  var h=0x811c9dc5; s=String(s);
  for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*0x01000193)>>>0; }
  return h>>>0;
}
/* Provably-fair re-derivation of a crashed round's multiplier from its
   revealed secret — mirrors backend crashPointNew exactly. */
function crashPointFor(roundId,secret){
  var r=(fnv1a(String(roundId)+":"+String(secret))%100000)/100000;
  var cp=0.95/(1-r);
  if(cp<1) cp=1.00;
  if(cp>50) cp=50;
  return Math.floor(cp*100)/100;
}
/* Observed-round journal (this device only): {cell_id:[{rid,mult,outcome,ts}]} */
function jrnlGet(cid){
  try{ var o=JSON.parse(localStorage.getItem(JRNL_KEY)||"{}"); return (o&&o[String(cid)])||[]; }catch(e){ return []; }
}
function jrnlAdd(cid,row){
  try{
    var o={}; try{ o=JSON.parse(localStorage.getItem(JRNL_KEY)||"{}"); }catch(e2){ o={}; }
    var k=String(cid), arr=o[k]||[];
    arr.unshift(row); arr=arr.slice(0,12);
    o[k]=arr; localStorage.setItem(JRNL_KEY,JSON.stringify(o));
  }catch(e){}
}
/* ---- state ---- */
var CELL=null, CELLtried=false;   /* {id,name} — from cell_mine, mounting context only */
var S=null, Stried=false;         /* crash_status response */
var lastSeenRound=null;           /* round_id we were watching */
var myBetCached=null;             /* my uncashed bet, if any, last seen */
function loadCell(cb){
  var id=ident();
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){
    CELLtried=true;
    if(j&&j.ok!==false&&j.in_cell&&j.cell&&j.cell.id){
      CELL={id:String(j.cell.id),name:String(j.cell.name||"your cell")};
    } else { CELL=null; }
    if(cb) cb();
  });
  setTimeout(function(){ if(!CELLtried){ CELLtried=true; CELL=null; if(cb) cb(); } },15000);
}
function loadRound(soft){
  if(!CELL) return;
  api("crash_status",{cell_id:CELL.id},function(j){
    S=j; Stried=true;
    trackTransitions();
    render();
  });
  if(!soft) setTimeout(function(){ if(!Stried){ Stried=true; render(); } },15000);
}
/* Watch for round transitions between polls to journal observed rounds. */
function trackTransitions(){
  if(!S||!S.ok) return;
  var rid=String(S.round_id||"");
  if(lastSeenRound&&rid&&rid!==lastSeenRound){
    /* Previous round ended without us observing its crash — journal what we
       saw, unless the crash was already journaled. */
    var jr=jrnlGet(CELL.id);
    if(!jr.length||String(jr[0].rid)!==lastSeenRound){
      jrnlAdd(CELL.id,{rid:lastSeenRound,mult:null,outcome:"moved on",ts:Date.now()});
    }
  }
  if(S.crashed&&rid&&rid!==lastSeenRound){
    var oc="watched";
    if(myBetCached){ oc=myBetCached.cashed_out?"exfiltrated":"collapsed — stake armed the treasury"; }
    jrnlAdd(CELL.id,{rid:rid,mult:(S.multiplier!=null?Number(S.multiplier):null),outcome:oc,ts:Date.now()});
    try{ if(window.PF&&PF.wmCrashCrashed&&myBetCached&&!myBetCached.cashed_out) PF.wmCrashCrashed(rid); }catch(e){}
    lastSeenRound=rid; myBetCached=null;
    return;
  }
  lastSeenRound=rid||lastSeenRound;
}
function myBet(){
  var id=ident();
  var bets=(S&&S.bets)||[];
  for(var i=0;i<bets.length;i++){
    if(String(bets[i].bettor||"").toUpperCase()===String(id.callsign||"").toUpperCase()) return bets[i];
  }
  return null;
}
function render(){
  var el=document.getElementById("xRaid"); if(!el) return;
  var id=ident();
  var h='<div class="wm-frame">THE LINE CLIMBS. THE CELL TAKES ITS CUT — AND SHARES IT.</div>';
  if(!id.callsign){
    h+=PF.gateHTML('The War Room runs on callsigns.','to run the supply line');
    el.innerHTML=h; return;
  }
  if(!CELLtried){ h+='<div class="c-load">Raising the cell network&hellip;</div>'; el.innerHTML=h; return; }
  /* FRONTEND MEMBERSHIP GATE — the surface hides for non-members. */
  if(!CELL){
    h+='<div class="x-pane"><h4>The raid runs on cells</h4>'
      +'<div class="x-note">Supply Line Raid is a cell operation — the spoils arm YOUR cell treasury. '
      +'Found a cell or join one, then come back and run the line.</div>'
      +'<div class="cs-btnrow"><a class="c-btn" href="/cells" style="text-decoration:none;display:inline-block">FIND YOUR CELL</a></div></div>'
      +'<div class="rd-trust"><b>XP has no cash value. Stakes are final.</b><br>The line climbs until it collapses. '
      +'Pull out in time or your stake arms the cell treasury &mdash; the line keeps ~5% for the collective.</div>';
    el.innerHTML=h; return;
  }
  h+='<div class="rd-scope">&#9876; '+esc(CELL.name.toUpperCase())+' &mdash; CELL RAID ROUND</div>';
  h+='<div class="x-pane">';
  if(!Stried){ h+='<div class="c-load">Reading the board&hellip;</div>'; }
  else if(!S||!S.ok){
    h+='<div class="c-err">The line is unreachable right now.</div>'
      +'<button class="c-btn" id="rdRetry">RETRY</button>';
  } else {
    var mult=(S.multiplier!=null)?Number(S.multiplier):1.0;
    var dead=!!S.crashed;
    h+='<div class="rd-line'+(dead?' rd-dead':'')+'" id="rdLine">'+mult.toFixed(2)+'x</div>';
    var mb=myBet();
    if(dead){
      h+='<div class="x-note" style="color:#ff4d5e;font-weight:700">THE LINE COLLAPSED. Next round forming.</div>';
      if(S.crash_secret) h+=crashSecretHTML();
    } else if(mb&&!mb.cashed_out){
      myBetCached=mb;
      h+='<div class="x-note">You\\\'re on the line for '+(Number(mb.amount)||0)+' XP at '+mult.toFixed(2)+'x = '
        +Math.floor((Number(mb.amount)||0)*mult)+' XP</div>'
        +'<button class="c-btn" id="rdExfil">EXFILTRATE</button>'
        +'<div class="x-note">Pull out in time or the stake arms the cell treasury.</div>';
    } else if(mb&&mb.cashed_out){
      h+='<div class="x-note">Exfiltrated at '+Number(mb.cashout_mult||0).toFixed(2)+'x. The line is still climbing — '
        +'stake again below.</div>'
        +stakeRow();
    } else {
      h+=stakeRow();
    }
    h+='<div class="x-note">'+((S.bets||[]).length)+' on the line this round</div><div class="c-err" id="rdErr"></div>';
    h+=journalHTML();
  }
  h+='</div>';
  h+='<div class="rd-trust"><b>XP has no cash value. Stakes are final.</b><br>The line climbs until it collapses. '
    +'Pull out in time or your stake arms the cell treasury &mdash; the line keeps ~5% for the collective.</div>';
  el.innerHTML=h;
  wire(id);
}
function stakeRow(){
  return '<div class="cs-betrow"><input aria-label="XP amount" class="c-input pf-input-sm" id="rdAmt" type="number" min="1" placeholder="XP amount" >'
    +'<button class="c-btn" id="rdStake">STAKE</button></div>';
}
/* Post-crash secret reveal + a real re-derivation check (wired, not faked):
   recompute the crash point from the revealed secret and compare with the
   multiplier the backend settled. Runs only on backend-supplied values. */
function crashSecretHTML(){
  var sec=String(S.crash_secret||"");
  if(!sec) return "";
  var h='<div class="rd-secret">COLLAPSE SECRET (revealed post-collapse): '+esc(sec)+'</div>';
  h+='<button class="c-btn" id="rdVerify" style="margin-top:6px">VERIFY THE COLLAPSE</button><div class="rd-verify" id="rdVerifyOut"></div>';
  return h;
}
function journalHTML(){
  var rows=jrnlGet(CELL.id);
  if(!rows.length) return "";
  var h='<div class="rd-jrnl"><div class="x-note" style="font-weight:700">ROUND HISTORY — this cell, seen on this device</div>';
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    h+='<div class="rd-jrow"><b>'+esc(String(r.rid).slice(-8))+'</b><span>'
      +(r.mult!=null?Number(r.mult).toFixed(2)+'x':'—')+'</span><span>'+esc(r.outcome)+'</span></div>';
  }
  h+='</div>';
  return h;
}
function wire(id){
  var el=document.getElementById("xRaid"); if(!el) return;
  var rt=document.getElementById("rdRetry");
  if(rt) rt.onclick=function(){ Stried=false; loadRound(false); };
  var st=document.getElementById("rdStake");
  if(st) st.onclick=function(){
    var amt=parseInt((document.getElementById("rdAmt")||{}).value,10);
    var e=document.getElementById("rdErr");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    st.disabled=true;
    postG("crash_bet",{callsign:id.callsign,device:id.device,amount:amt,cell_id:CELL.id},function(j){
      st.disabled=false;
      if(!j||!j.ok){ if(e) e.textContent=PF.errCopy(j,"Stake failed."); return; }
      toast("ON THE LINE FOR "+amt+" XP. Exfiltrate before it collapses.");
      try{ if(window.PF&&PF.wmBetPlaced) PF.wmBetPlaced({game:"crash",round_id:j.round_id,amount:amt,cell_id:CELL.id}); }catch(wme){}
      Stried=false; loadRound(false);
    });
  };
  var co=document.getElementById("rdExfil");
  if(co) co.onclick=function(){
    co.disabled=true; co.textContent="EXFILTRATING...";
    postG("crash_cashout",{callsign:id.callsign,device:id.device,cell_id:CELL.id},function(j){
      if(!j||!j.ok){ toast(PF.errCopy(j,"Exfiltration failed.")); Stried=false; loadRound(false); return; }
      if(myBetCached) myBetCached.cashed_out=true;
      toast("EXFILTRATED: +"+(j.payout||0)+" XP!");
      try{ if(window.PF&&PF.wmCrashSettled) PF.wmCrashSettled(j.payout||0); }catch(wme){}
      try{ if(window.PF&&PF.dope){ var fh=document.getElementById("xRaid")||document.body; PF.dope.ping(fh,"EXFILTRATED"); } }catch(dpe){}
      Stried=false; loadRound(false);
    });
  };
  var vf=document.getElementById("rdVerify");
  if(vf) vf.onclick=function(){
    var out=document.getElementById("rdVerifyOut"); if(!out) return;
    var sec=String(S.crash_secret||"");
    if(!sec){ out.innerHTML='<span class="rd-na">No secret published for this round.</span>'; return; }
    var expect=crashPointFor(S.round_id,sec);
    var got=(S.multiplier!=null)?Math.floor(Number(S.multiplier)*100)/100:null;
    if(got==null){ out.innerHTML='<span class="rd-na">Settled multiplier unavailable — cannot compare.</span>'; return; }
    if(Math.abs(expect-got)<0.005){
      out.innerHTML='<span class="rd-pass">&#10003; VERIFIED — recomputed '+expect.toFixed(2)+'x from the revealed secret matches the settled '+got.toFixed(2)+'x.</span>';
    } else {
      out.innerHTML='<span class="rd-fail">&#10007; MISMATCH — recomputed '+expect.toFixed(2)+'x vs settled '+got.toFixed(2)+'x. Flag it.</span>';
    }
  };
}
/* ---- boot ---- */
loadCell(function(){
  render();
  if(CELL) loadRound(false);
});
var pollT=setInterval(function(){
  try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
  var line=document.getElementById("rdLine"); if(!line) return; /* off-page or gated */
  if(!CELL) return;
  api("crash_status",{cell_id:CELL.id},function(j){
    if(!j||!j.ok) return;
    var prevId=S?String(S.round_id||""):"";
    var wasDead=S?!!S.crashed:false;
    S=j;
    trackTransitions();
    var m=document.getElementById("rdLine");
    if(m){ m.textContent=(Number(j.multiplier)||1).toFixed(2)+"x";
      if(j.crashed){ m.className="rd-line rd-dead"; } }
    /* Re-render only on round change or fresh collapse — never clobber an
       in-progress verify readout or a typed stake amount every poll. */
    if(String(j.round_id||"")!==prevId||(j.crashed&&!wasDead)){ Stried=true; render(); }
  });
},5000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
