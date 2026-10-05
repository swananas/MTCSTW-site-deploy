/* games/cells.js  |  PF v1.4.1 | CELLS: callsign squads with shared streaks
   CHAINLINK (v1.4.3): up to 3 cells per callsign, max 5 members per cell.
   All members checked in = +1 streak day = +5% XP on Daily Orders for
   everyone (cap +50%, primary cell). A cellmate can cover one missed day
   per week. Recruit with your code: +25 XP when they check in.
   Chainlinks (2+ cells) stitch the network together: +10 XP per extra cell,
   weekly. Founder can set a custom cell name; the cell earns its VERIFIED
   badge once 2+ callsigns are attached.
   All cell state lives in the tally backend (cross-device); the frontend
   only caches the display. Public weekly leaderboard.
   KILL: ?pf_off=cells  or  localStorage pf_disabled_v1='["cells"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cells")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cells">
<div class="fe-block pf-override-block" id="pf-cells">
<h2>Build Your Cell</h2>
<div class="c-tag">Five callsigns. One streak. Nobody gets left behind.</div>
<div id="cBody"><div class="c-load">Raising the cell network&hellip;</div></div>
<div class="c-boardwrap"><h3>Cell leaderboard &mdash; this week</h3><div id="cBoard"><div class="c-load">Loading&hellip;</div></div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var LS_C="pf_cells_v1";
var BOUNTY_FALLBACK=25;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
/* CELLS STATE AFFILIATION (2026-10-05): 50 states + DC, copied verbatim
   from civic.js STATES (bundle-cells-h ships cells.js WITHOUT civic.js, so
   the constant is duplicated here by design — keep both lists in sync; see
   tests/cell-state-consistency.md). Fail-soft: every state read is guarded,
   so cells from an old backend (no state field) render exactly as before. */
var CELL_STATES=[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["DC","District of Columbia"]];
function cellStateName(code){ code=String(code||"").toUpperCase();
  for(var i=0;i<CELL_STATES.length;i++) if(CELL_STATES[i][0]===code) return CELL_STATES[i][1];
  return ""; }
function cellStateOpts(sel,noLabel){
  var h='<option value="">'+esc(noLabel||"No state affiliation")+'</option>';
  for(var i=0;i<CELL_STATES.length;i++){
    h+='<option value="'+CELL_STATES[i][0]+'"'+(sel===CELL_STATES[i][0]?' selected':'')+'>'+esc(CELL_STATES[i][1])+'</option>';
  }
  return h; }
function cellStateBadge(c){ /* "OPERATING IN TEXAS" on the cell header. */
  var n=c&&cellStateName(c.state);
  return n?'<span class="c-state" title="State affiliation">OPERATING IN '+esc(n.toUpperCase())+'</span>':""; }
function cellStateTag(it){ /* compact "TEXAS" tag for task/bounty/listing rows. */
  var n=it&&cellStateName(it.state);
  return n?'<span class="c-stag" title="State-scoped">'+esc(n.toUpperCase())+'</span>':""; }
function selVal(id){ var el=document.getElementById(id); return el?String(el.value||""):""; }
/* G3 (2026-10-04): shared-streak milestone badge + "milestone tomorrow"
   teaser. Milestones: 7/14/30/60/90 days. Narration only — the +5%/day
   mult stays the reward, zero new XP. */
var MS_MILESTONES=[7,14,30,60,90];
function msBadge(streak){
  streak=Number(streak)||0;
  var hit=null, next=null;
  for(var i=0;i<MS_MILESTONES.length;i++){
    if(streak>=MS_MILESTONES[i]) hit=MS_MILESTONES[i];
    if(streak+1===MS_MILESTONES[i]) next=MS_MILESTONES[i];
  }
  var base="display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;margin-left:6px;letter-spacing:1px;vertical-align:middle;";
  var h="";
  if(hit) h+='<span style="'+base+'background:#c1121f;color:#fff;" title="Shared streak milestone — the ticker heard it">&#127942; '+hit+'-DAY MILESTONE</span>';
  else if(next) h+='<span style="'+base+'background:transparent;color:#ffb347;border:1px solid #ffb347;" title="Check in tomorrow to claim it">&#128293; '+next+'-day milestone tomorrow</span>';
  return h;
}
function load(k,fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch(e){ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
/* CELLS wave G1 (2026-10-04): lifecycle events for the guided first hour
   (games/cell-first-hour.js — extends R19's post-claim interstitial, dedupe).
   Fired on cell form/join success; the first-hour module mounts its founder
   checklist / joiner induction from these. Zero XP, pure routing. */
function emitCellEv(name,cell){
  try{ document.dispatchEvent(new CustomEvent(name,{detail:{cell:cell||null}})); }catch(e){}
}
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  /* Fallback only if core hasn't loaded yet — matches PF.toast styling. */
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;bottom:8%;transform:translateX(-50%);background:#0a0a0a;color:#f5f0e1;font:bold 15px monospace;padding:12px 22px;border:2px solid #c1121f;z-index:99999;max-width:90vw;text-align:center;box-sizing:border-box";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* JSONP, same pattern as the other games. 12s timeout: a hung Apps Script
   request must never wedge the section on its loading text. */
/* P0 (2026-10-02): cell mutations are POST-only (CSRF-able via GET).
   Route them through the POST helper; read-only actions stay on JSONP. */
var POST_CELL_ACTIONS = {cell_create:1,cell_join:1,cell_checkin:1,cell_cover:1,cell_leave:1,cell_rename:1,cell_bounty_claim:1,cell_update:1};
function api(action,params,cb){
  if(POST_CELL_ACTIONS[action]){
    if(window.PF && PF.postAction){ PF.postAction('cell','cell_action',action,params,cb); return; }
    post('cell','cell_action',action,params,cb); return;
  }
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Route cell_mine through
     the shared claim-retry GET (2026-10-03): pre-auth callsign holders get
     one auth_claim attempt instead of 'missing credentials' forever. */
  if(action==="cell_mine"){
    try{
      if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  /* Callback nonce: crypto-random where available (invite codes themselves
     are issued server-side by cell_create; this is just the JSONP name). */
  var _cr=new Uint32Array(1);
  try{ if(window.crypto&&crypto.getRandomValues) crypto.getRandomValues(_cr); else _cr[0]=Math.floor(Math.random()*4294967295); }catch(e){ _cr[0]=Math.floor(Math.random()*4294967295); }
  var fn="pfCellCb"+_cr[0];
  var s=document.createElement("script");
  var done=false, timer=null;
  function finish(j){
    if(done) return; done=true;
    if(timer){ clearTimeout(timer); timer=null; }
    window[fn]=function(){};
    try{ delete window[fn]; }catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s);
    cb(j);
  }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  timer=setTimeout(function(){ finish(null); },12000);
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn;
  s.src=BACKEND+q;
  document.head.appendChild(s);
}
/* CORS POST for POST_ONLY actions (cell_promote, challenge_join). */
/* JSONP GET that transmits empty-string params (unlike api(), which drops
   them): clearing a state affiliation must send an explicit empty state,
   not silently keep the old one. null/undefined are still dropped. */
function apiKeepEmpty(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var _cr=new Uint32Array(1);
  try{ if(window.crypto&&crypto.getRandomValues) crypto.getRandomValues(_cr); else _cr[0]=Math.floor(Math.random()*4294967295); }catch(e){ _cr[0]=Math.floor(Math.random()*4294967295); }
  var fn="pfCellCb"+_cr[0];
  var s=document.createElement("script"), done=false, timer=null;
  function finish(j){
    done=true;
    if(timer){ clearTimeout(timer); timer=null; }
    window[fn]=function(){};
    try{ delete window[fn]; }catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s);
    cb(j);
  }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  timer=setTimeout(function(){ finish(null); },12000);
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null) q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn;
  s.src=BACKEND+q;
  document.head.appendChild(s);
}
function post(type,actionKey,action,params,cb){  var body=Object.assign({type:type},params||{});
  body[actionKey]=action;
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
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
/* Cached multiplier for Daily Orders. Refreshes in the background when stale. */
function cache(){ return load(LS_C,{mult:1,cell_id:"",name:"",t:0}); }
window.pfCellMult=function(){
  var c=cache();
  if(Date.now()-c.t>15*60*1000){ try{ refresh(true); }catch(e){} }
  return c.mult||1;
};
function setCache(mult,cell_id,name){ save(LS_C,{mult:mult||1,cell_id:cell_id||"",name:name||"",t:Date.now()}); }

var state=null, board=null, busy=false, netFailed=false;
/* Display modes (2026-10-03 homepage slimming): full management depth on
   /cells (pf-cells-page) and /arcade (pf-arcade); slim on the homepage
   (pf-v2) — pitch + join form + leaderboard teaser + check-in. */
var PF_MODE=(function(){ try{
  if(document.getElementById('pf-arcade')||document.getElementById('pf-cells-page')) return 'full';
}catch(e){} return 'slim'; })();
var SLIM=PF_MODE==='slim';
function refresh(quiet){
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(busy) return; busy=true; netFailed=false;
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){
    busy=false;
    if(!j){
      netFailed=true;
      if(!quiet){ renderNetErr(); }
      else if(state){ render(); }
      return;
    }
    state=j;
    if(j.in_cell&&j.cell){ setCache(j.cell.mult,j.cell.id,j.cell.name); }
    claimBounties(j);
    /* CHAINLINK: 2+ cells wired -> weekly bridge bonus via the ledger. */
    try{
      var nCells=(j.cells&&j.cells.length)||0;
      if(nCells>=2){
        var _d=new Date(),_o=new Date(_d.getFullYear(),0,1);
        var _wk=_d.getFullYear()+"-W"+Math.ceil((((_d-_o)/86400000)+_o.getDay()+1)/7);
        document.dispatchEvent(new CustomEvent("pf-chainlink",{detail:{cells:nCells,week:_wk}}));
      }
    }catch(e){}
    render();
  });
}
/* The section is never allowed to die on its loading text: a failed
   request renders an explicit error panel with a retry. */
function renderNetErr(){
  var el=document.getElementById("cBody");
  if(!el) return;
  el.innerHTML='<div class="c-neterr">The cell network is slow to answer. Your callsign is fine &mdash; the wire is not.'+
    '<br><button class="c-btn" id="cRetry">Retry connection</button></div>';
  document.getElementById("cRetry").onclick=function(){ refresh(); };
}
/* Recruit bounty: +25 XP per claimed recruit, exactly once each. */
function claimBounties(j){
  var pend=(j&&j.bounties_pending)||[];
  if(!pend.length) return;
  var id=ident();
  api("cell_bounty_claim",{callsign:id.callsign,device:id.device},function(r){
    if(!r||!r.ok||!r.claimed||!r.claimed.length) return;
    var n=0, each=r.xp_each||BOUNTY_FALLBACK;
    r.claimed.forEach(function(b){
      var key="cell_bounty_"+b.from+"_"+b.day;
      /* The shared ledger owns idempotency now (exactly-once per key).
         Backend already granted this XP in cell_bounty_claim (xpGrant with
         key cellbounty_<cell>_<recruit>). Local ledger update is for instant
         UX only — do NOT dispatch pf-xp or the backend gets it twice. */
      var credited=false;
      try{ credited=(window.PF&&PF.creditLocal)?PF.creditLocal(key,each):false; }catch(e){}
      if(credited) n++;
    });
    if(n>0){ toast("+"+(n*each)+" XP — recruit bounty! Your cell grows."); }
  });
}
function loadBoard(){
  api("cell_leaderboard",{},function(j){
    board=j;
    var el=document.getElementById("cBoard");
    if(!el) return;
    if(!j||!j.cells||!j.cells.length){ el.innerHTML='<div class="c-empty">No cells on the board yet. The first founder&rsquo;s name goes here.</div>'; return; }
    /* SLIM: leaderboard teaser — top 3 + link to the full board on /cells. */
    var rows=SLIM?j.cells.slice(0,3):j.cells;
    var html=rows.map(function(c,i){
      var pfl=c.prestige_flame?' <span class="c-prb" style="margin-left:4px;" title="'+esc(c.prestige_tier||"")+' cell">'+c.prestige_flame+'</span>':"";
      return '<div class="c-brow'+(i===0?" c-btop":"")+'"><span class="c-brank">'+(i+1)+'</span>'+
        '<span class="c-bname">'+esc(c.name)+pfl+
        (c.verified?'<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>':'')+cellStateTag(c)+'</span>'+
        '<span class="c-bstat">'+c.streak+' streak &middot; '+c.members+'/5</span></div>';
    }).join("");
    el.innerHTML=html;
    if(SLIM){ el.insertAdjacentHTML('beforeend','<div class="x-note"><a href="/cells" style="color:#c1121f;">Full cell leaderboard &rarr;</a></div>'); }
  });
}
/* CELLS G14 (2026-10-04): CELL MUSTER board \
   During an All Fronts op, cell check-ins score muster points; the board
   shows the per-op ranking and each rank's Frontlines territory
   bonus (+20/+10/+5). Hidden when no op has muster data. Full mode only;
   refreshes on the 5-minute tick. */
function loadMuster(){
  if(SLIM) return;
  var wrap=document.getElementById("cMusterWrap"); if(!wrap) return;
  var id=ident(), params={};
  if(id.callsign) params.callsign=id.callsign;
  api("muster_leaderboard",params,function(j){
    var mel=document.getElementById("cMuster"); if(!mel) return;
    if(!j||!j.ok||!j.op||!j.board||!j.board.length){ wrap.style.display="none"; return; }
    wrap.style.display="";
    var op=j.op;
    var head='<div class="x-note">'+esc(op.name)+
      (op.live?' &mdash; <b style="color:#c1121f;">LIVE</b>: check in to score muster points':' &mdash; final standings')+'</div>';
    var terr=["+20","+10","+5"];
    var rows=j.board.slice(0,10).map(function(r){
      var bonus=r.rank<=3?' &middot; <b style="color:#c1121f;">'+terr[r.rank-1]+' territory</b>':"";
      return '<div class="c-lrow"><span class="c-lname">#'+r.rank+' '+esc(r.cell_name)+'</span>'+
        '<span class="c-lstat">'+r.points+' muster &middot; '+r.fighters+' fighters'+bonus+'</span></div>';
    }).join("");
    var mine="";
    if(j.mine&&j.mine.cell_id){
      mine='<div class="x-note">Your cell: <b>'+esc(j.mine.cell_name)+'</b>'+
        (j.mine.rank?' &mdash; rank #'+j.mine.rank+' ('+j.mine.points+' muster)':' &mdash; no muster points yet. Check in while the op is live.')+'</div>';
    }
    mel.innerHTML=head+'<div class="c-lrows">'+rows+'</div>'+mine;
  });
}
function renderGate(){
  var el=document.getElementById("cBody");
  if(!el) return;
  /* 2026-10-03 H8: active in-place claim (was: scroll away to Enlistment Ranks). */
  el.innerHTML=PF.gateHTML('Cells run on callsigns.','to form your cell');
}
/* Friendly copy for cell_mine read failures (2026-10-03): raw backend
   strings like 'missing credentials' are never rendered as UI copy. */
function cellErrCopy(e){
  e=String(e||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return "The cell network couldn't verify this callsign — it predates the new auth system. Contact MTCSTW to recover it.";
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return "The cell network couldn't verify your callsign. Re-claim it in Enlistment Ranks (one tap), then retry.";
  return "The cell network didn't answer. Your callsign is fine — the wire is not.";
}
/* Friendly copy for WRITE paths (2026-10-03 M27): read paths already got
   friendly copy (cellErrCopy); writes route raw snake_case codes through
   the same propaganda-voice map. Never show a raw code to users. */
function cellWriteErr(e,fb){
  var s=String(e==null?"":e).trim();
  var fall=fb||"The wire fought back. Nothing changed — retry.";
  if(!s||/network error/i.test(s)) return fall;
  var map={
    "invalid_code":"That invite code doesn't open any door. Check it and try again.",
    "cell_full":"That cell is full — five fighters max. Found your own instead.",
    "already_accepted":"Already locked in. One shot per cell.",
    "already_joined":"You're already in. The fight continues.",
    "already leading":"You're already wiring this cell. One wire per cell.",
    "already claimed":"Already claimed. One shot per fighter.",
    "already settled":"Already settled. It's done.",
    "bad callsign":"That callsign didn't check out. Re-claim it in Enlistment Ranks, then retry.",
    "missing cell_id":"No cell selected. Refresh and try again.",
    "unknown cell":"That cell isn't on the map anymore. Refresh and retry.",
    "db error":"The cell ledger hiccuped. Retry in a moment.",
    "title too short":"Title needs 4+ characters.",
    "title rejected":"That title didn't pass the censors. Pick another.",
    "bad characters":"Letters, numbers, and spaces only. Keep it clean."
  };
  if(map[s]) return map[s];
  if(s.indexOf("_")!==-1) return fall; /* never show raw snake_case */
  return s; /* backend prose already human-readable */
}
/* M26 (2026-10-03): disabled + spinner label on mutation buttons. */
function busyBtn(btn,on,label){
  try{
    if(on){ if(btn.getAttribute("data-lbl")==null) btn.setAttribute("data-lbl",btn.textContent); btn.disabled=true; btn.textContent=label||"WORKING…"; }
    else{ btn.disabled=false; var l=btn.getAttribute("data-lbl"); if(l!=null) btn.textContent=l; btn.removeAttribute("data-lbl"); }
  }catch(e){}
}
function render(){
  var el=document.getElementById("cBody");
  if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!state){ if(netFailed){ renderNetErr(); return; } el.innerHTML='<div class="c-load">Raising the cell network&hellip;</div>'; return; }
  if(state.err&&!state.in_cell&&state.err!=="no_cell"){
    el.innerHTML='<div class="c-neterr">'+esc(cellErrCopy(state.err))
      +'<br><button class="c-btn" id="cErrRetry">Retry connection</button></div>';
    document.getElementById("cErrRetry").onclick=function(){ refresh(); };
    return;
  }
  if(!state.in_cell){ renderLobby(el); return; }
  renderCell(el,state);
}
function renderLobby(el){
  /* CELL IDENTITY (2026-10-05): guided founding wizard replaces the blank
     form — a cell with no identity can't complete founding. Kill-switch
     (?pf_off=cell-identity) falls back to the original blank form. */
  function identEnabled(){ return window.PFCellIdentity && window.PFCellIdentity.enabled(); }
  var formPaneHtml = identEnabled()
    ? '<div class=\"c-pane\"><h4>Form a cell</h4><div id=\"cIdentWizard\"></div></div>'
    : '<div class=\"c-pane\"><h4>Form a cell</h4>'+\n    '<input aria-label=\"CELL NAME\" id=\"cName\" maxlength=\"24\" placeholder=\"CELL NAME\" autocomplete=\"off\">'+\n    '<select class=\"c-sel\" id=\"cState\" aria-label=\"STATE AFFILIATION\">'+cellStateOpts(\"\",\"No state affiliation\")+'</select>'+\n    '<div class=\"x-note\">State affiliation unlocks location tasks and policymaker bounties.</div>'+\n    '<br><button class=\"c-btn\" id=\"cCreate\">Form cell</button>'+\n    '<div class=\"c-err\" id=\"cCreateErr\"></div></div>';
  /* SLIM (homepage): pitch + join form only. Steps + search are full-mode
     depth for /cells. */
  var stepsHtml=SLIM?"":
    '<div class="c-steps">'+
    '<div class="c-step"><span class="c-snum">1</span><span>Form your cell below, or join with a code.</span></div>'+
    '<div class="c-step"><span class="c-snum">2</span><span>Check in daily after your orders.</span></div>'+
    '<div class="c-step"><span class="c-snum">3</span><span>Streak climbs. Miss a day and a cellmate covers you once a week.</span></div>'+
    '</div>';
  var searchHtml=SLIM?"":
    '<div class="c-pane"><h4>Find a cell</h4>'+
    '<input aria-label="NAME OR STATE" id="cSearch" maxlength="32" placeholder="NAME OR STATE" autocomplete="off">'+
    '<select class="c-sel" id="cSearchState" aria-label="FILTER BY STATE">'+cellStateOpts("","All states")+'</select>'+
    /* ENGAGE-A #4 (2026-10-05): cause/vibe/tag filters. Rendered only when
       the backend serves tags (cell-identity track schema); hidden until
       then — pre-identity-schema backends browse exactly as before. */
    '<div id="cSearchTags" style="display:none;margin-top:6px"></div>'+
    ' <button class="c-btn" id="cSearchBtn">Search</button>'+
    '<div class="c-err" id="cSearchErr"></div>'+
    '<div id="cSearchRes"></div></div>';
  el.innerHTML=
    '<div class="c-pitch">No cells exist yet &mdash; <b>found the first one</b> and your name goes on the wall.'+
    '<br>Five callsigns. One streak. Every day the whole cell checks in, the streak climbs and everyone banks <b>+5% XP on Daily Orders</b> &mdash; up to <b>+50%</b>.</div>'+
    stepsHtml+
    '<div class="c-lobby">'+
    formPaneHtml+
    '<div class="c-pane"><h4>Join a cell</h4>'+
    '<input aria-label="INVITE CODE" id="cCode" maxlength="6" placeholder="INVITE CODE" autocomplete="off" style="text-transform:uppercase">'+
    '<input aria-label="WHO RECRUITED YOU (CALLSIGN)" id="cRef" maxlength="32" placeholder="WHO RECRUITED YOU (CALLSIGN)" autocomplete="off" style="text-transform:uppercase">'+
    '<br><button class="c-btn" id="cJoin">Join cell</button>'+
    '<div class="c-err" id="cJoinErr"></div></div>'+
    '</div>'+
    searchHtml+
    '<div class="c-bounty">SHARE YOUR CELL CODE &mdash; every RECRUIT who checks in pays <b>+25 XP</b>. One recruit, one credit, everywhere.</div>'+
    (SLIM?'<div class="x-note">Full cell management &mdash; search, prestige, challenges &mdash; lives at <a href="/cells" style="color:#c1121f;">/cells</a>.</div>':'');
  /* CELL IDENTITY (2026-10-05): wizard mounts when enabled; the blank form
     is the kill-switch fallback. */
  if(identEnabled()){
    var wzel=document.getElementById("cIdentWizard");
    if(wzel) window.PFCellIdentity.mountWizard(wzel,{
      stateOptsHTML:cellStateOpts("","No state affiliation"),
      onDone:function(){ refresh(); }});
  } else {
  document.getElementById("cCreate").onclick=function(){
    var nm=document.getElementById("cName").value, id=ident(), err=document.getElementById("cCreateErr");
    err.textContent="";
    var btn=document.getElementById("cCreate");
    busyBtn(btn,true);
    api("cell_create",{callsign:id.callsign,device:id.device,name:nm,state:selVal("cState")},function(j){
      busyBtn(btn,false);
      if(!j||!j.ok){ err.textContent=cellWriteErr(j&&j.err); return; }
      toast("Cell "+j.cell.name+" formed. Recruit your four.");
      emitCellEv("pf-cell-formed", j.cell);
      refresh();
    });
  };
  }
  document.getElementById("cJoin").onclick=function(){
    var code=document.getElementById("cCode").value, ref=document.getElementById("cRef").value,
        id=ident(), err=document.getElementById("cJoinErr");
    err.textContent="";
    var btn=document.getElementById("cJoin");
    busyBtn(btn,true);
    api("cell_join",{callsign:id.callsign,device:id.device,code:code,ref:ref},function(j){
      busyBtn(btn,false);
      if(!j||!j.ok){ err.textContent=cellWriteErr(j&&j.err); return; }
      toast("Welcome to "+j.cell.name+". Check in daily.");
      emitCellEv("pf-cell-joined", j.cell);
      /* R23 (2026-10-04): recruiter-attributed joins fire the ONE shared
         RECRUIT event (09-referral tags source=cell for S3 race credit). */
      try{
        var rr=String(ref||"").trim().toLowerCase();
        if(rr) document.dispatchEvent(new CustomEvent("pf-recruit-cell",{detail:{recruiter:rr}}));
      }catch(e){}
      refresh();
    });
  };
  /* FIND A CELL: search by name/state, join from results.
     ENGAGE-A #4 (2026-10-05): discovery browse — cause/vibe/tag filters
     (rendered from server-served tags only; the cell-identity track owns the
     tag schema — this UI never invents tags), "your cells" state, one-tap
     join. Join pays 0 XP (review-cleared); the inviter's existing recruit
     stack is untouched. */
  var sb=document.getElementById("cSearchBtn");
  var cFlt={cause:"",vibe:"",tag:""};
  function cTagRow(cells){
    /* Build the cause/vibe/tag filter row from server-served tags only.
       No tags in the response (pre-identity-schema) = row stays hidden. */
    var wrap=document.getElementById("cSearchTags"); if(!wrap) return;
    var causes={},vibes={},tags={};
    for(var i=0;i<cells.length;i++){
      var cc=cells[i]||{};
      if(cc.cause) causes[String(cc.cause).toLowerCase()]=1;
      if(cc.vibe) vibes[String(cc.vibe).toLowerCase()]=1;
      var tg=cc.tags||[];
      for(var t=0;t<tg.length;t++) tags[String(tg[t]).toLowerCase()]=1;
    }
    var nC=Object.keys(causes).length,nV=Object.keys(vibes).length,nT=Object.keys(tags).length;
    if(!nC&&!nV&&!nT){ wrap.style.display="none"; wrap.innerHTML=""; cFlt={cause:"",vibe:"",tag:""}; return; }
    function sel(id,label,opts,cur){
      var h='<select class="c-sel" id="'+id+'" aria-label="'+esc(label)+'"><option value="">'+esc(label)+'</option>';
      var ks=Object.keys(opts).sort();
      for(var k=0;k<ks.length;k++) h+='<option value="'+esc(ks[k])+'"'+(ks[k]===cur?' selected':'')+'>'+esc(ks[k])+'</option>';
      return h+'</select>';
    }
    wrap.innerHTML=(nC?sel("cFltCause","All causes",causes,cFlt.cause):"")+
      (nV?sel("cFltVibe","All vibes",vibes,cFlt.vibe):"")+
      (nT?sel("cFltTag","All tags",tags,cFlt.tag):"");
    wrap.style.display="";
    function bind(id,key){ var s=document.getElementById(id); if(s) s.onchange=function(){ cFlt[key]=s.value; doSearch(); }; }
    bind("cFltCause","cause"); bind("cFltVibe","vibe"); bind("cFltTag","tag");
  }
  function doSearch(){
    var q=document.getElementById("cSearch").value,
        id=ident(), err=document.getElementById("cSearchErr"),
        res=document.getElementById("cSearchRes");
    err.textContent=""; res.innerHTML='<div class="c-load">Searching&hellip;</div>';
    var params={q:q,state:selVal("cSearchState"),cause:cFlt.cause,vibe:cFlt.vibe,tag:cFlt.tag};
    if(id.callsign) params.callsign=id.callsign;
    api("cell_search",params,function(j){
      if(!j||!j.ok){ err.textContent=cellWriteErr(j,"Network error."); res.innerHTML=""; return; }
      var list=j.cells||[];
      cTagRow(list);
      if(!list.length){ res.innerHTML='<div class="x-note">No cells match. Found the first one above.</div>'; return; }
      var h="";
      for(var i=0;i<Math.min(list.length,10);i++){
        var cc=list[i]||{};
        /* G10 (2026-10-04): one-tap browse->join — the backend exposes
           invite_code for VERIFIED cells only (PM decision #6). The JOIN
           button carries the code, so there is no manual code entry.
           Unverified cells keep their code behind the founder's share flow:
           an invite-only note instead of a dead JOIN button.
           ENGAGE-A #4: 'mine' rows render an IN YOUR CELL state. */
        var jbtn=cc.mine
          ?'<span class="x-note">&#10003; IN YOUR CELL</span>'
          :cc.invite_code
          ?'<button class="c-btn c-sm" data-code="'+esc(cc.invite_code)+'">JOIN</button>'
          :'<span class="x-note">invite only</span>';
        var tagHtml="";
        var tgchips=[];
        if(cc.cause) tgchips.push(esc(cc.cause));
        if(cc.vibe) tgchips.push(esc(cc.vibe));
        var tg2=cc.tags||[];
        for(var t2=0;t2<Math.min(tg2.length,3);t2++) tgchips.push(esc(tg2[t2]));
        if(tgchips.length) tagHtml=' <span class="cp-tags">'+tgchips.join(" &middot; ")+'</span>';
        h+='<div class="cp-lead"><span class="cp-lname">'+esc(cc.name)+cellStateTag(cc)+'</span> '
          +'<span class="cp-lxp">'+(Number(cc.member_count)||0)+'/5'
          +(cc.verified?' \u2713':'')
          +(Number(cc.streak)?' &#128293;'+Number(cc.streak):'')+'</span> '
          +jbtn+tagHtml+'</div>';
      }
      res.innerHTML=h;
      var btns=res.querySelectorAll("button[data-code]");
      for(var b=0;b<btns.length;b++)(function(btn){
        btn.onclick=function(){
          var code=btn.getAttribute("data-code"), id2=ident();
          err.textContent="";
          busyBtn(btn,true);
          api("cell_join",{callsign:id2.callsign,device:id2.device,code:code},function(j2){
            busyBtn(btn,false);
            if(!j2||!j2.ok){ err.textContent=cellWriteErr(j2&&j2.err); return; }
            toast("Welcome to "+j2.cell.name+". Check in daily.");
            emitCellEv("pf-cell-joined", j2.cell);
            refresh();
          });
        };
      })(btns[b]);
    });
  }
  if(sb) sb.onclick=doSearch;
}
/* SLIM (homepage): the check-in card only. Members list, prestige, chainlink
   bar, challenges, health, rename, leave — all full-mode depth on /cells. */
/* CELLS G4 (2026-10-04): VERIFIED banner on the cell profile \
   PM-directed full-width banner (beyond the compact chip in the card head).
   Copy states only what is true: 2+ callsigns strong. */
function verifiedBanner(c){
  if(!c||!c.verified) return "";
  return '<div class="c-vbanner" style="background:#0d0d0d;border:2px solid #c1121f;margin:0 0 12px;padding:10px 12px;text-align:center;">'+
    '<span style="color:#c1121f;font-weight:900;letter-spacing:2px;font-size:15px;">\u2713 VERIFIED CELL</span>'+
    '<div class="x-note" style="margin-top:4px;">2+ callsigns strong &middot; Hall-pinnable</div></div>';
}
function renderCellSlim(el,s){
  var c=s.cell, pct=Math.round((c.mult-1)*100), id=ident();
  var html=verifiedBanner(c)+'<div class="c-card">'+
    '<div class="c-chead"><span class="c-cname">'+esc(c.name)+'</span>'+cellStateBadge(c)+
    (c.verified?'<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>':'')+
    '<span class="c-code" id="cCodeShow" title="Tap to copy">'+esc(c.invite_code)+'</span></div>'+
    '<div class="c-cstats"><span class="c-flame">&#128293; '+c.streak+'-day streak</span>'+msBadge(c.streak)+
    '<span class="c-mult">+'+pct+'% XP on Daily Orders</span></div>';
  if(!s.checked_today){
    html+='<button class="c-btn c-big" id="cCheckin">Orders done &mdash; check in</button>';
  } else {
    html+='<div class="c-done">Checked in today. The streak holds because of you.</div>';
  }
  if(s.cover_for){
    html+='<button class="c-btn c-cover" id="cCover">Cover '+esc(s.cover_for)+' &mdash; save the streak</button>';
  }
  html+='<div class="x-note"><a href="/cells" style="color:#c1121f;">Manage your cell &rarr;</a> members, prestige, challenges, the full board.</div>';
  html+='<div class="c-err" id="cActErr"></div></div>';
  el.innerHTML=html;
  var errEl=document.getElementById("cActErr");
  document.getElementById("cCodeShow").onclick=function(){
    var code=String(c.invite_code||"");
    function fallback(){
      /* Clipboard write blocked (permissions / non-secure context): render
         the code as selectable text instead of a false "copied" toast. */
      try{
        errEl.innerHTML="";
        var sp=document.createElement("span");
        sp.textContent="Copy blocked \u2014 long-press to copy your code: "+code;
        sp.style.cssText="user-select:all;-webkit-user-select:all;cursor:text;";
        errEl.appendChild(sp);
      }catch(e2){ toast("Cell code: "+code); }
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(code).then(function(){ toast("Code copied: "+code); },fallback);
      }
      else { fallback(); }
    }catch(e){ fallback(); }
  };
  var ci=document.getElementById("cCheckin");
  if(ci) ci.onclick=function(){
    errEl.textContent="";
    busyBtn(ci,true);
    api("cell_checkin",{callsign:id.callsign,device:id.device,cell_id:c.id},function(j){
      busyBtn(ci,false);
      if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err); return; }
      if(j.already){ toast("Already checked in."); }
      else { if(j.milestone_hit){ toast("\ud83d\udd25 CELL STREAK MILESTONE: "+j.milestone_hit+" DAYS \u2014 the ticker heard it."); } else { toast("Checked in. Streak: "+j.cell.streak+"."); } /* F-5 (2026-10-05): this tally rail STAYS. The api("cell_checkin") call
         above feeds the streak system (type:cell); this POST feeds the
         tally (type:action) which contracts.js perfect_week reads.
         Two different rails, not a double rail — do not remove. */
      try{ if(window.pfReportAction) window.pfReportAction("cell_checkin"); }catch(e){} }
      refresh();
    });
  };
  var cv=document.getElementById("cCover");
  if(cv) cv.onclick=function(){
    errEl.textContent="";
    busyBtn(cv,true);
    api("cell_cover",{callsign:id.callsign,device:id.device,cell_id:c.id},function(j){
      busyBtn(cv,false);
      if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err,"No cover to play."); return; }
      toast("Cover played — "+j.covered+" is saved. Streak: "+j.streak+".");
      refresh();
    });
  };
}
/* RECRUIT poster: 1080x1350 cell-recruit image for the native share sheet.
   Pure canvas text/shapes only — no external assets, so the canvas can never
   be tainted. The FIGHTING AS <CALLSIGN> strip is applied by
   PFShare.stampCallsign inside shareImage (idempotent); keep the bottom 70px
   of the layout clear for it.
   CELLS G9 (2026-10-04): cell-branded variant — cell name + VERIFIED check
   + prestige frame. Colors are DERIVED from the cell (deterministic hash of
   the cell id over 8 curated on-brand palettes) — never founder-picked, so
   there is no moderation surface. Composes this existing generator; no new
   generator was built. */
var CELL_PALETTES=[
  {primary:"#c1121f",bg:"#0d0d0d",box:"#141010",cream:"#f5ead6",muted:"#c9bfa8"},
  {primary:"#e07a1f",bg:"#0d0b08",box:"#171009",cream:"#f5ead6",muted:"#c9b190"},
  {primary:"#8f0f1e",bg:"#0a0a0a",box:"#120a0a",cream:"#e8dcc8",muted:"#b0a48e"},
  {primary:"#ff2b2b",bg:"#080808",box:"#140b0b",cream:"#f5ead6",muted:"#c9bfa8"},
  {primary:"#b34a1f",bg:"#0c0a09",box:"#151010",cream:"#efe6d0",muted:"#bfae94"},
  {primary:"#d4a017",bg:"#0d0d0c",box:"#141310",cream:"#f5ead6",muted:"#c9bd9a"},
  {primary:"#dc143c",bg:"#0b0b0b",box:"#130d0f",cream:"#f5ead6",muted:"#c4b3a8"},
  {primary:"#ff5a1f",bg:"#0d0d0d",box:"#16100c",cream:"#fff3e0",muted:"#cbb79e"}
];
function cellPalette(c){
  var s=String((c&&(c.id||c.invite_code||c.name))||"cell"), h=5381, i;
  for(i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; }
  return CELL_PALETTES[h%CELL_PALETTES.length];
}
function drawRecruitPoster(c){
  var W=1080,H=1350;
  var pal=cellPalette(c);
  var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var x=cv.getContext("2d"); if(!x) return null;
  function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,W/2,y); }
  function wrapLines(text,font,maxW,maxLines){
    x.font=font; x.textAlign="center";
    var words=String(text||"").split(/\\s+/), lines=[], cur="";
    words.forEach(function(w){
      var t=cur?cur+" "+w:w;
      if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
    });
    if(cur) lines.push(cur);
    return lines.slice(0,maxLines||2);
  }
  x.fillStyle=pal.bg; x.fillRect(0,0,W,H);
  /* Prestige frame (G9): prestiged cells get an outer band in the derived
     primary, over the standard double frame. */
  var pr=(c&&c.prestige)||null,
      pTier=(pr&&pr.tier&&pr.tier.name)?String(pr.tier.name).toUpperCase():"";
  if(pTier){ x.strokeStyle=pal.primary; x.lineWidth=26; x.strokeRect(8,8,W-16,H-16); }
  x.strokeStyle=pal.primary; x.lineWidth=14; x.strokeRect(20,20,W-40,H-40);
  x.strokeStyle=pal.cream; x.lineWidth=3; x.strokeRect(44,44,W-88,H-88);
  var y=118;
  center("\u2605 THE PROPAGANDA FACTORY \u2605",y,"700 32px Arial,sans-serif",pal.primary); y+=76;
  var nameF='900 82px "Arial Black",Arial,sans-serif';
  wrapLines(String(c.name||"MY CELL").toUpperCase(),nameF,W-170,2).forEach(function(l){
    center(l,y,nameF,pal.primary); y+=96; });
  y+=18;
  /* VERIFIED check (G9): verified cells carry the mark on the poster. */
  if(c&&c.verified){
    var vt="\u2713 VERIFIED";
    x.font="700 34px Arial,sans-serif";
    var vw=x.measureText(vt).width+64;
    x.fillStyle=pal.bg; x.fillRect(W/2-vw/2,y-44,vw,64);
    x.strokeStyle=pal.primary; x.lineWidth=4; x.strokeRect(W/2-vw/2,y-44,vw,64);
    center(vt,y,"700 34px Arial,sans-serif",pal.primary); y+=72;
  }
  var tagF="700 34px Arial,sans-serif";
  wrapLines("FIVE CALLSIGNS. ONE STREAK. NOBODY LEFT BEHIND.",tagF,W-190,2).forEach(function(l){
    center(l,y,tagF,pal.cream); y+=48; });
  var streak=Number(c.streak)||0;
  y+=26;
  center("\u26A1 "+streak+"-DAY STREAK \u26A1",y,'900 40px "Arial Black",Arial,sans-serif',pal.primary); y+=74;
  /* Prestige tier banner (G9). */
  if(pTier){
    center("\u25C6 "+pTier+" \u25C6",y,"700 34px Arial,sans-serif",pal.primary); y+=56;
  }
  center("INVITE CODE",y,"700 30px Arial,sans-serif",pal.muted); y+=16;
  var code=String(c.invite_code||"").toUpperCase()||"???";
  x.strokeStyle=pal.primary; x.lineWidth=6;
  x.strokeRect(W/2-280,y,560,150);
  x.fillStyle=pal.box; x.fillRect(W/2-280,y,560,150);
  center(code,y+106,'900 96px "Arial Black",Arial,sans-serif',pal.primary);
  y+=150+52;
  var lnF="400 34px Arial,sans-serif";
  wrapLines("Enter this code on mtcstw.com/cells to wire in.",lnF,W-210,2).forEach(function(l){
    center(l,y,lnF,pal.muted); y+=50; });
  wrapLines("Check in daily. Stack the streak. Recruit +25 XP.",lnF,W-210,2).forEach(function(l){
    center(l,y,lnF,pal.muted); y+=50; });
  y+=44;
  var cta="JOIN MY CELL";
  x.font='900 44px "Arial Black",Arial,sans-serif';
  var tw=x.measureText(cta).width+110;
  x.fillStyle=pal.primary; x.fillRect(W/2-tw/2,y-58,tw,94);
  center(cta,y+8,'900 44px "Arial Black",Arial,sans-serif',"#ffffff");
  y=H-160;
  center("MTCSTW.COM",y,'900 48px "Arial Black",Arial,sans-serif',pal.primary);
  return cv;
}
function renderCell(el,s){
  if(SLIM){ renderCellSlim(el,s); return; }
  var c=s.cell, pct=Math.round((c.mult-1)*100);
  var mems=(s.members||[]).map(function(m){
    var role=String(m.role||"member").toUpperCase();
    var badge=role==="FOUNDER"?'<span class="c-role c-rfounder">FOUNDER</span>'
      :role==="OFFICER"?'<span class="c-role c-rofficer">OFFICER</span>':"";
    var prb=(Number(m.prestige_level)||0)>0
      ?' <span class="c-prb" title="Prestige '+esc(m.prestige_badge||"")+'">&#9733;'+esc(m.prestige_badge||"")+'</span>':"";
    var prom=(s.is_founder&&role!=="FOUNDER"&&role!=="OFFICER")
      ?' <button class="c-btn c-sm c-prom" data-cs="'+esc(m.callsign)+'">PROMOTE</button>':"";
    return '<div class="c-mrow"><span class="c-dot'+(m.checked_today?" c-on":"")+'"></span>'+
      '<span class="c-mname">'+esc(m.callsign)+'</span>'+prb+badge+
      (m.checked_today?'<span class="c-mok">IN</span>':'<span class="c-mno">OUT</span>')+prom+'</div>';
  }).join("");
  /* CELL PRESTIGE panel: tier badge, power, benefits, progress, recruit nudge. */
  var pr=c.prestige||null, prHtml="";
  if(pr&&pr.tier){
    var benHtml=(pr.benefits||[]).map(function(b){
      return '<div class="c-prben">&#10003; '+esc(b)+'</div>'; }).join("");
    var progHtml="";
    if(pr.next_tier){
      var pw=Math.min(100,Math.round(pr.power/pr.next_tier.min*100));
      progHtml='<div class="c-prprog"><div class="c-prfill" style="width:'+pw+'%"></div></div>'+
        '<div class="x-note">'+pr.next_tier.need+' more power to reach '+esc(pr.next_tier.name)+'</div>';
    } else {
      progHtml='<div class="x-note">MAX TIER &mdash; the cell burns at full power.</div>';
    }
    prHtml='<div class="c-prestige" style="background:#120404;border:2px solid #c1121f;margin:12px 0;padding:14px;text-align:center;">'+
      '<div style="font-size:22px;letter-spacing:2px;">'+pr.flame+'</div>'+
      '<div style="color:#c1121f;font-weight:900;font-size:18px;letter-spacing:3px;">'+esc(pr.tier.name)+'</div>'+
      '<div class="x-note" style="margin-bottom:8px;">'+pr.power+' prestige power &middot; '+pr.prestiged_count+' prestiged '+(pr.prestiged_count===1?"fighter":"fighters")+'</div>'+
      benHtml+progHtml+'</div>';
  } else {
    prHtml='<div class="c-prestige" style="background:#0d0d0d;border:1px dashed #555;margin:12px 0;padding:12px;text-align:center;">'+
      '<div class="x-note">&#128293; No prestige power yet. <b>Recruit prestiged fighters</b> to ignite cell bonuses &mdash; EMBER at 1 power (+5% XP for everyone).</div></div>';
  }
  /* CHAINLINK bar: every cell this callsign wires, the cap, the network stat. */
  var myCells=s.cells||[], linkBar='';
  if(myCells.length){
    var rows=myCells.map(function(mc){
      return '<div class="c-lrow"><span class="c-lname">'+esc(mc.name)+'</span>'+
        '<span class="c-lstat">'+mc.streak+' streak &middot; '+(mc.checked_today?'checked in':'not in today')+'</span>'+
        (mc.id!==c.id?'':' <span class="c-lprim">PRIMARY</span>')+
        ' <a class="c-lleave" data-id="'+esc(mc.id)+'" data-nm="'+esc(mc.name)+'">leave</a></div>';
    }).join("");
    linkBar='<div class="c-linkbar"><div class="c-lhead">&#9939; CHAINLINK — you wire '+myCells.length+'/3 cells</div>'+
      '<div class="c-lrows">'+rows+'</div>'+
      (myCells.length<3
        ? '<div class="c-ljoin"><input aria-label="INVITE CODE" id="cLinkCode" maxlength="6" placeholder="INVITE CODE" autocomplete="off" style="text-transform:uppercase"> '+
          '<button class="c-btn" id="cLinkJoin">Wire another cell</button><div class="c-err" id="cLinkErr"></div></div>'
        : '<div class="c-lcap">Cap reached — three cells is the whole wire.</div>')+
      '<div class="c-lnet" id="cLinkNet">Mapping the network&hellip;</div>'+
      '<div class="c-lwhy">Chainlinks belong to 2+ cells and stitch the network together — so every cell on earth is reachable by direct contact. +10 XP per extra cell, weekly.</div></div>';
  }
  var html=verifiedBanner(c)+linkBar+'<div class="c-card">'+
    '<div class="c-chead"><span class="c-cname">'+esc(c.name)+'</span>'+cellStateBadge(c)+
    (c.verified
      ? '<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>'
      : '<span class="c-unv" title="Recruit at least one more callsign to verify this cell">UNVERIFIED &mdash; RECRUIT TO VERIFY</span>')+
    '<span class="c-code" id="cCodeShow" title="Tap to copy">'+esc(c.invite_code)+'</span></div>'+
    '<div class="c-cstats"><span class="c-flame">&#128293; '+c.streak+'-day streak</span>'+msBadge(c.streak)+
    '<span class="c-mult">+'+pct+'% XP on Daily Orders</span>'+
    '<span class="c-cov">Covers left this week: '+c.covers_left+'</span></div>'+
    prHtml+
    '<div class="c-members">'+mems+'</div>';
  if(s.is_founder){
    html+='<div class="c-rename"><input aria-label="RENAME CELL" id="cRename" maxlength="24" placeholder="RENAME CELL" value="'+esc(c.name)+'" autocomplete="off">'+
      '<button class="c-btn" id="cRenameBtn">Rename</button></div>';
    /* State affiliation edit (founder only): cell_update accepts optional
       state; "No state affiliation" clears it. Fail-soft on old backends —
       the select reverts and the error shows in #cActErr. */
    html+='<div class="c-rename"><select class="c-sel" id="cStateEdit" aria-label="STATE AFFILIATION">'+cellStateOpts(String(c.state||""),"No state affiliation")+'</select>'+
      '<button class="c-btn" id="cStateBtn">Set state</button></div>';
    /* CELL IDENTITY (2026-10-05): backfill prompt for founders whose cell
       has no identity yet. Invitational, never shaming, never a penalty. */
    html+='<div id="cIdentBackfill"></div>';
  }
  /* RECRUIT: any member can mint the recruit poster and share it. */
  html+='<button class="c-btn c-big" id="cRecruit">RECRUIT</button>';
  if(!s.checked_today){
    html+='<button class="c-btn c-big" id="cCheckin">Orders done &mdash; check in</button>';
  } else {
    html+='<div class="c-done">Checked in today. The streak holds because of you.</div>';
  }
  if(s.cover_for){
    html+='<button class="c-btn c-cover" id="cCover">Cover '+esc(s.cover_for)+' &mdash; save the streak</button>';
  }
  html+='<div class="c-health" id="cHealth"><div class="c-load">Reading cell health&hellip;</div></div>';
  html+='<div class="c-leave"><a id="cLeave">Leave cell</a></div><div class="c-err" id="cActErr"></div></div>';
  el.innerHTML=html;
  var id=ident(), errEl=document.getElementById("cActErr");
  /* CELL IDENTITY (2026-10-05): founder backfill — load the identity, show
     the invitational prompt only when the profile is incomplete. */
  (function(){
    if(!s.is_founder) return;
    if(!(window.PFCellIdentity&&window.PFCellIdentity.enabled())) return;
    var bf=document.getElementById("cIdentBackfill"); if(!bf) return;
    window.PFCellIdentity.loadIdentity(c.id,function(ident2){
      if(ident2&&ident2.profile_complete) return;
      bf.innerHTML=window.PFCellIdentity.backfillBannerHTML(c.name);
      var b=bf.querySelector("[data-idbackfill]");
      if(b) b.onclick=function(){
        window.PFCellIdentity.mountWizard(bf,{mode:"edit",cellId:c.id,
          stateOptsHTML:cellStateOpts(String(c.state||""),"No state affiliation"),
          initial:identityToInitial(ident2,c),
          onDone:function(){ refresh(); }});
      };
    });
  })();
  function identityToInitial(ident2,cell){
    if(!ident2) return {name:(cell&&cell.name)||"",state:(cell&&cell.state)||""};
    var vibes=[],custom="";
    (ident2.vibes||[]).forEach(function(v){
      var k=v.key||v;
      if(String(k).indexOf("custom:")===0) custom=String(k).slice(7);
      else vibes.push(k);
    });
    return {name:(cell&&cell.name)||"",state:(cell&&cell.state)||"",
      causes:(ident2.causes||[]).map(function(x){return x.key||x;}),
      vibes:vibes,customVibe:custom,
      specialties:(ident2.specialties||[]).map(function(x){return x.key||x;}),
      cadence:ident2.meeting_cadence||"",entry:ident2.entry_style||"",
      charter:ident2.charter||"",motto:ident2.motto||"",region:ident2.region||"",
      palette:(ident2.palette==null?-1:Number(ident2.palette))};
  }
  /* Cell health: members, 7d checkins, 30d recruits. */
  (function(){
    var hel=document.getElementById("cHealth"); if(!hel) return;
    api("cell_health",{cell_id:c.id},function(j){
      if(!j||!j.ok){ hel.innerHTML=""; return; }
      var mem=Number(j.members)||0, ci=Number(j.checkins_7d)||0, rc=Number(j.recruits_30d)||0;
      var score=Math.min(100,Math.round(mem*8+ci*2+rc*5));
      hel.innerHTML='<div class="c-hhead">CELL HEALTH</div>'
        +'<div class="c-hbar"><div class="c-hfill" style="width:'+score+'%"></div></div>'
        +'<div class="x-note">'+mem+'/5 members &bull; '+ci+' check-ins (7d) &bull; '+rc+' recruits (30d)</div>';
    });
  })();
  /* Promote buttons (founder only). */
  var prs=el.querySelectorAll(".c-prom");
  for(var pi=0;pi<prs.length;pi++)(function(btn){
    btn.onclick=function(){
      var tgt=btn.getAttribute("data-cs"), id2=ident();
      errEl.textContent="";
      busyBtn(btn,true);
      post("cell","cell_action","cell_promote",{callsign:id2.callsign,device:id2.device,cell_id:c.id,target:tgt,role:"officer"},function(j){
        busyBtn(btn,false);
        if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err); return; }
        toast(tgt+" promoted to OFFICER.");
        refresh();
      });
    };
  })(prs[pi]);
  var rn=document.getElementById("cRenameBtn");
  if(rn) rn.onclick=function(){
    var nm=document.getElementById("cRename").value;
    errEl.textContent="";
    busyBtn(rn,true);
    api("cell_rename",{callsign:id.callsign,device:id.device,name:nm},function(j){
      busyBtn(rn,false);
      if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err); return; }
      toast("Cell renamed to "+j.cell.name+(j.cell.verified?" \u2713 verified.":"."));
      refresh();
    });
  };
  /* Founder: change the cell's state affiliation (cell_update). */
  var stb=document.getElementById("cStateBtn");
  if(stb) stb.onclick=function(){
    var sv=document.getElementById("cStateEdit"), val=sv?String(sv.value||""):"";
    errEl.textContent="";
    busyBtn(stb,true);
    api("cell_update",{callsign:id.callsign,device:id.device,cell_id:c.id,state:val},function(j){
      busyBtn(stb,false);
      if(!j||!j.ok){
        /* Old backend without cell_update: revert the picker, keep the
           old affiliation rendering untouched. */
        if(sv) sv.value=String(c.state||"");
        errEl.textContent=cellWriteErr(j&&j.err);
        return;
      }
      toast("Cell state affiliation updated.");
      refresh();
    });
  };
  /* RECRUIT: mint the poster and open the phone's native share sheet.
     PFShare.shareImage handles stampCallsign (idempotent), toBlob -> File ->
     navigator.canShare({files}) -> navigator.share, and the
     download fallback on browsers without file-share support. */
  var rc=document.getElementById("cRecruit");
  if(rc) rc.onclick=function(){
    errEl.textContent="";
    if(!window.PFShare){ errEl.textContent="Share engine still loading \u2014 tap again in a second."; return; }
    if(!id.callsign){ errEl.textContent="Claim a callsign first \u2014 it goes on the poster."; return; }
    toast("Minting your recruit poster\u2026");
    var cv=null;
    try{ cv=drawRecruitPoster(c); }catch(e){ cv=null; }
    if(!cv){ errEl.textContent="Poster failed \u2014 try again."; return; }
    try{
      PFShare.shareImage(cv,
        "cell-recruit-"+String(c.invite_code||"").toLowerCase()+".png",
        "Join my cell: "+c.name,
        "cell-recruit");
    }catch(e){ errEl.textContent="Share unavailable here."; }
  };
  document.getElementById("cCodeShow").onclick=function(){
    var code=String(c.invite_code||"");
    function fallback(){
      /* Clipboard write blocked (permissions / non-secure context): render
         the code as selectable text instead of a false "copied" toast. */
      try{
        errEl.innerHTML="";
        var sp=document.createElement("span");
        sp.textContent="Copy blocked \u2014 long-press to copy your code: "+code;
        sp.style.cssText="user-select:all;-webkit-user-select:all;cursor:text;";
        errEl.appendChild(sp);
      }catch(e2){ toast("Cell code: "+code); }
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(code).then(function(){ toast("Code copied: "+code); },fallback);
      }
      else { fallback(); }
    }catch(e){ fallback(); }
  };
  var ci=document.getElementById("cCheckin");  if(ci) ci.onclick=function(){
    errEl.textContent="";
    busyBtn(ci,true);
    api("cell_checkin",{callsign:id.callsign,device:id.device,cell_id:c.id},function(j){
      busyBtn(ci,false);
      if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err); return; }
      if(j.already){ toast("Already checked in."); }
      else { if(j.milestone_hit){ toast("\ud83d\udd25 CELL STREAK MILESTONE: "+j.milestone_hit+" DAYS \u2014 the ticker heard it."); } else { toast("Checked in. Streak: "+j.cell.streak+"."); } /* F-5 (2026-10-05): this tally rail STAYS. The api("cell_checkin") call
         above feeds the streak system (type:cell); this POST feeds the
         tally (type:action) which contracts.js perfect_week reads.
         Two different rails, not a double rail — do not remove. */
      try{ if(window.pfReportAction) window.pfReportAction("cell_checkin"); }catch(e){} }
      refresh();
    });
  };
  var cv=document.getElementById("cCover");
  if(cv) cv.onclick=function(){
    errEl.textContent="";
    busyBtn(cv,true);
    api("cell_cover",{callsign:id.callsign,device:id.device,cell_id:c.id},function(j){
      busyBtn(cv,false);
      if(!j||!j.ok){ errEl.textContent=cellWriteErr(j&&j.err,"No cover to play."); return; }
      toast("Cover played — "+j.covered+" is saved. Streak: "+j.streak+".");
      refresh();
    });
  };
  var lv=document.getElementById("cLeave");
  if(lv) lv.onclick=function(){
    /* M28: anchors have no disabled state — a busy flag blocks double-taps. */
    if(lv.getAttribute("data-busy")) return;
    if(!window.confirm("Leave "+c.name+"? Your cell streak bonus goes with it.")) return;
    lv.setAttribute("data-busy","1"); lv.style.opacity=".5";
    api("cell_leave",{callsign:id.callsign,device:id.device},function(j){
      /* M28: check the backend verdict — on failure the fighter stays in
         the cell and the local cache is NOT cleared. */
      if(!j||!j.ok){
        lv.removeAttribute("data-busy"); lv.style.opacity="";
        errEl.textContent=cellWriteErr(j&&j.err,"The wire fought back — you're still in the cell.");
        return;
      }
      setCache(1,"",""); state=null; refresh();
    });
  };
  /* CHAINLINK wiring: per-cell leave + wire-another join + network stat. */
  /* CELL CHALLENGES: active challenges, join for your cell, leaderboard,
     plus CREATE CHALLENGE (challenge_create: title 4-48 chars, metric
     checkins|recruits|xp, days 1-30). */
  (function(){
    var host=document.createElement("div");
    host.className="c-chalwrap"; host.id="cChal";
    host.innerHTML='<h3>Cell challenges</h3><div class="c-load">Loading challenges&hellip;</div>';
    el.appendChild(host);
    function createFormHtml(){
      return '<div class="x-pane"><h4>Propose a challenge</h4>'
        +'<div class="x-note">Cells compete on your metric for 1-30 days. Title needs 4+ characters.</div>'
        +'<input id="cChTitle" maxlength="48" placeholder="CHALLENGE TITLE" aria-label="Challenge title"> '
        +'<select id="cChMetric" aria-label="Metric">'
        +'<option value="checkins">Daily check-ins</option>'
        +'<option value="recruits">Recruits</option>'
        +'<option value="xp">XP earned</option></select> '
        +'<input id="cChDays" type="number" min="1" max="30" value="7" style="width:64px" aria-label="Days"> '
        +'<input id="cChPurse" type="number" min="0" placeholder="PURSE XP (optional)" aria-label="Purse XP" style="width:150px"> '
        +'<button class="c-btn" id="cChCreateBtn">CREATE CHALLENGE</button>'
        +'<div class="c-err" id="cChCreateErr"></div></div>';
    }
    function wireCreate(){
      var btn=host.querySelector("#cChCreateBtn"); if(!btn) return;
      btn.onclick=function(){
        var id3=ident();
        if(!id3.callsign){ toast("Claim a callsign first."); return; }
        var tEl=host.querySelector("#cChTitle"), mEl=host.querySelector("#cChMetric"),
            dEl=host.querySelector("#cChDays"), ee=host.querySelector("#cChCreateErr");
        var title=tEl?tEl.value.trim():"", metric=mEl?mEl.value:"checkins",
            days=dEl?(parseInt(dEl.value,10)||7):7;
        var pEl=host.querySelector("#cChPurse");
        var purse=pEl?Math.max(0,parseInt(pEl.value,10)||0):0;
        if(ee) ee.textContent="";
        if(title.length<4){ if(ee) ee.textContent="Title needs 4+ characters."; return; }
        if(days<1) days=1; if(days>30) days=30;
        if(!window.confirm("Launch challenge \\\"+title+\\\" for "+days+" days?")) return;
        busyBtn(btn,true);
        var cbody={callsign:id3.callsign,device:id3.device,title:title,metric:metric,days:days};
        /* R25: optional purse rides challenge_create (backend contract). */
        if(purse>0) cbody.purse=purse;
        post("challenge","ch_action","challenge_create",cbody,
          function(r){
            busyBtn(btn,false);
            if(!r||!r.ok){ if(ee) ee.textContent=cellWriteErr(r&&r.err); return; }
            toast("CHALLENGE LIVE. Get your cell in.");
            loadCh();
          });
      };
    }
    /* 6A-R10: event-squad challenge template. /events links here with
       ?squad=<event_id>; prefill the create form (title/metric/days) from
       the event via the existing challenge_create contract. Minimal:
       prefill only, the user still confirms + launches. */
    function prefillSquad(host){
      var m=null;
      try{ m=String(window.location.search||"").match(/[?&]squad=([a-zA-Z0-9_-]{1,64})/); }catch(e){}
      if(!m) return;
      var eid=m[1];
      api("event_list",{},function(j){
        var evs=(j&&j.ok&&j.events)||[];
        var ev=null;
        for(var i=0;i<evs.length;i++){ if(String(evs[i].id)===eid){ ev=evs[i]; break; } }
        if(!ev) return;
        var tEl=host.querySelector("#cChTitle"), mEl=host.querySelector("#cChMetric"),
            dEl=host.querySelector("#cChDays"), ee=host.querySelector("#cChCreateErr");
        if(!tEl||!mEl||!dEl) return;
        var title=("SQUAD ROLL CALL: "+String(ev.title||"event")).slice(0,48);
        var days=Math.ceil(((Number(ev.event_at)||Date.now())-Date.now())/86400000);
        if(!(days>=1)) days=1; if(days>30) days=30;
        tEl.value=title; mEl.value="checkins"; dEl.value=days;
        if(ee){ ee.innerHTML='&#9876; Prefilled from <b>'+esc(String(ev.title||"the event"))+'</b> — launch it and get your cell in.'; }
        try{ if(tEl.scrollIntoView) tEl.scrollIntoView({block:"center"}); }catch(e){}
      });
    }
    function loadCh(){
      host.innerHTML='<h3>Cell challenges</h3><div class="c-load">Loading challenges&hellip;</div>';
      api("challenge_list",{},function(j){
        var h='<h3>Cell challenges</h3>';
        var list=(j&&j.ok&&j.challenges)||[];
        if(!list.length){
          h+='<div class="x-pane"><div class="x-note">No active challenges. The war council will announce the next one — or propose your own below.</div></div>';
        }
        for(var i=0;i<list.length;i++){
          var ch=list[i]||{};
          /* R25 (2026-10-04): purse display on challenge cards; winners link
             to the Hall spotlight. CEO decision (2026-10-04): challenge-purse
             payout goes through backend auto-pay ONLY — the frontend
             dividend-button payout path was REMOVED (double-payable, no
             mutual exclusion). The purse line below is a STATUS DISPLAY only:
             it never initiates a payout. Backend contract (flagged):
             challenge_list rows may carry purse (or prize_xp), status,
             winner (cell name), winner_cell_id. */
          var purse=Math.max(0,parseInt(ch.purse||ch.prize_xp||0,10)||0);
          var won=String(ch.winner||ch.winner_cell||"");
          var isDone=/complete|ended|resolved|closed/i.test(String(ch.status||""))||!!won;
          h+='<div class="x-pane"><h4>'+esc(ch.title)+cellStateTag(ch)+'</h4>'
            +'<div class="x-note">'+esc(ch.detail||"")+'</div>'
            +(purse?'<div class="x-note"><b>\uD83C\uDFC6 PURSE: '+purse.toLocaleString()+' XP</b></div>':'')
            +(won?'<div class="x-note">\uD83C\uDFC6 WINNER: <b>'+esc(won)+'</b> &mdash; <a href="/#pf-v2" style="color:#c1121f;">HALL OF PROOF \u2192</a></div>':'')
            +'<div class="x-note">'+(isDone?"Decided.":"Ends: "+esc(ch.ends||"soon"))+'</div>'
            +(isDone
              ?(purse?'<div class="x-note"><b>\uD83C\uDFC6 PURSE: '+purse.toLocaleString()+' XP</b> — auto-pays to '+(won?'<b>'+esc(won)+'</b>':'the winning cell')+' via the backend. No manual payout.</div>':'')
              :'<button class="c-btn c-chjoin" data-ch="'+esc(ch.id)+'">ENTER MY CELL</button>')
            +'<div class="c-err" id="cChErr-'+esc(ch.id)+'"></div></div>';
        }
        h+=createFormHtml();
        h+='<div id="cChBoard"><div class="c-load">Loading standings&hellip;</div></div>';
        host.innerHTML=h;
        wireCreate();
        prefillSquad(host);
        var jbs=host.querySelectorAll(".c-chjoin");
        for(var b=0;b<jbs.length;b++)(function(btn){
          btn.onclick=function(){
            var chid=btn.getAttribute("data-ch"), id2=ident();
            var ee=document.getElementById("cChErr-"+chid); if(ee) ee.textContent="";
            busyBtn(btn,true);
            post("challenge","ch_action","challenge_join",{callsign:id2.callsign,device:id2.device,cell_id:c.id,challenge_id:chid},function(r){
              busyBtn(btn,false);
              if(!r||!r.ok){ if(ee) ee.textContent=cellWriteErr(r&&r.err); return; }
              toast("Cell entered. Fight for the top.");
            });
          };
        })(jbs[b]);
        /* R25 purse payout: REMOVED (2026-10-04, CEO decision). Backend
           auto-pay (challenge_resolve) is the ONE payout path — this
           frontend dividend-button path was double-payable with no mutual
           exclusion. The purse card above is a status display only. */
        api("challenge_board",{},function(b2){
          var bh=document.getElementById("cChBoard"); if(!bh) return;
          var rows=(b2&&b2.board)||[];
          if(!rows.length){ bh.innerHTML='<div class="x-note">No standings yet.</div>'; return; }
          var hh="";
          for(var q=0;q<Math.min(rows.length,10);q++){
            hh+='<div class="cp-lead"><span class="cp-lrank">'+(q+1)+'.</span> '
              +'<span class="cp-lname">'+esc(rows[q].cell||rows[q].cell_name)+'</span> '
              +'<span class="cp-lxp">'+(Number(rows[q].score)||0)+' pts</span></div>';
          }
          bh.innerHTML=hh;
        });
      });
    }
    loadCh();
  })();
  var lleaves=document.querySelectorAll(".c-lleave");
  for(var li2=0;li2<lleaves.length;li2++)(function(a){
    a.onclick=function(){
      if(a.getAttribute("data-busy")) return;
      if(!window.confirm("Leave "+a.getAttribute("data-nm")+"?")) return;
      a.setAttribute("data-busy","1"); a.style.opacity=".5";
      api("cell_leave",{callsign:id.callsign,device:id.device,cell_id:a.getAttribute("data-id")},function(j){
        if(!j||!j.ok){
          a.removeAttribute("data-busy"); a.style.opacity="";
          errEl.textContent=cellWriteErr(j&&j.err,"The wire fought back — you're still in the cell.");
          return;
        }
        state=null; refresh();
      });
    };
  })(lleaves[li2]);
  var lj=document.getElementById("cLinkJoin");
  if(lj) lj.onclick=function(){
    var code=document.getElementById("cLinkCode").value, err=document.getElementById("cLinkErr");
    errEl.textContent=""; err.textContent="";
    api("cell_join",{callsign:id.callsign,device:id.device,code:code},function(j){
      if(!j||!j.ok){ err.textContent=cellWriteErr(j,"Network error."); return; }
      toast("Wired into "+j.cell.name+". The chain grows.");
      emitCellEv("pf-cell-joined", j.cell);
      refresh();
    });
  };
  paintLinkNet();
}
/* Chainlink network stat: cached 5 min. */
var _linkNetAt=0, _linkNetHtml="";
function paintLinkNet(){
  var el=document.getElementById("cLinkNet");
  if(!el) return;
  if(Date.now()-_linkNetAt<5*60*1000&&_linkNetHtml){ el.innerHTML=_linkNetHtml; return; }
  api("cell_links",{},function(j){
    if(!j){ el.innerHTML=""; return; }
    _linkNetAt=Date.now();
    _linkNetHtml='<b>'+j.chainlinkers+'</b> chainlinkers wiring <b>'+j.cells+'</b> cells — <b>'+j.main_pct+'%</b> in the main chain';
    el.innerHTML=_linkNetHtml;
  },true);
}
/* A7 (2026-10-04): war-card BUILD A CELL deep links — ?cell=<invite_code>
   lands here with ?ref=<callsign>. The ref is first-touch captured by the
   referral engine (09-referral + pf_pending_ref); the invite code is
   pre-filled below and the recruiter field takes the stored ref, so the
   arrival is one tap from joining. The existing cell_join + recruit_log
   paths then pay the recruiter's +25 XP bounty — no new backend actions. */
var _pfCellDl=false;
function acceptCellDeepLink(){
  if(_pfCellDl) return;
  var m=null;
  try{ m=String(location.search||"").match(/[?&]cell=([A-Za-z0-9_-]{1,12})/); }catch(e){}
  if(!m||!m[1]) return;
  _pfCellDl=true;
  var code=m[1], n=0;
  (function fill(){
    var cI=null,cR=null;
    try{ cI=document.getElementById("cCode"); cR=document.getElementById("cRef"); }catch(e){}
    if(cI){
      try{ cI.value=code; }catch(e2){}
      try{
        if(cR&&!cR.value&&window.PF&&PF.storedRef){
          var sr=PF.storedRef();
          if(sr) cR.value=String(sr).toUpperCase();
        }
      }catch(e3){}
      try{ cI.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e4){}
      try{ toast("Invite link accepted \u2014 tap JOIN to wire into the cell."); }catch(e5){}
      return;
    }
    /* The claim gate renders first for no-callsign arrivals — retry until
       the join form exists (post-claim render included). */
    if(++n<25) setTimeout(fill,400);
  })();
}
refresh();
loadBoard();
loadMuster();
acceptCellDeepLink();
if(!window._pfCellsTick){ window._pfCellsTick=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} loadBoard(); loadMuster(); },5*60*1000); }
})();
</script>
</div>
</template>`);
})();
