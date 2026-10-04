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
function load(k,fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch(e){ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  /* Fallback only if core hasn't loaded yet — matches PF.toast styling. */
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;bottom:8%;transform:translateX(-50%);background:#0a0a0a;color:#f5f0e1;font:bold 15px monospace;padding:12px 22px;border:2px solid #c1121f;z-index:99999;max-width:90vw;text-align:center;box-sizing:border-box";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* JSONP, same pattern as the other games. 12s timeout: a hung Apps Script
   request must never wedge the section on its loading text. */
/* P0 (2026-10-02): cell mutations are POST-only (CSRF-able via GET).
   Route them through the POST helper; read-only actions stay on JSONP. */
var POST_CELL_ACTIONS = {cell_create:1,cell_join:1,cell_checkin:1,cell_cover:1,cell_leave:1,cell_rename:1,cell_bounty_claim:1};
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
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params||{});
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
        (c.verified?'<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>':'')+'</span>'+
        '<span class="c-bstat">'+c.streak+' streak &middot; '+c.members+'/5</span></div>';
    }).join("");
    el.innerHTML=html;
    if(SLIM){ el.insertAdjacentHTML('beforeend','<div class="x-note"><a href="/cells" style="color:#c1121f;">Full cell leaderboard &rarr;</a></div>'); }
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
    ' <button class="c-btn" id="cSearchBtn">Search</button>'+
    '<div class="c-err" id="cSearchErr"></div>'+
    '<div id="cSearchRes"></div></div>';
  el.innerHTML=
    '<div class="c-pitch">No cells exist yet &mdash; <b>found the first one</b> and your name goes on the wall.'+
    '<br>Five callsigns. One streak. Every day the whole cell checks in, the streak climbs and everyone banks <b>+5% XP on Daily Orders</b> &mdash; up to <b>+50%</b>.</div>'+
    stepsHtml+
    '<div class="c-lobby">'+
    '<div class="c-pane"><h4>Form a cell</h4>'+
    '<input aria-label="CELL NAME" id="cName" maxlength="24" placeholder="CELL NAME" autocomplete="off">'+
    '<br><button class="c-btn" id="cCreate">Form cell</button>'+
    '<div class="c-err" id="cCreateErr"></div></div>'+
    '<div class="c-pane"><h4>Join a cell</h4>'+
    '<input aria-label="INVITE CODE" id="cCode" maxlength="6" placeholder="INVITE CODE" autocomplete="off" style="text-transform:uppercase">'+
    '<input aria-label="WHO RECRUITED YOU (CALLSIGN)" id="cRef" maxlength="32" placeholder="WHO RECRUITED YOU (CALLSIGN)" autocomplete="off" style="text-transform:uppercase">'+
    '<br><button class="c-btn" id="cJoin">Join cell</button>'+
    '<div class="c-err" id="cJoinErr"></div></div>'+
    '</div>'+
    searchHtml+
    '<div class="c-bounty">Share your cell code: <b>+25 XP</b> every time your recruit checks in.</div>'+
    (SLIM?'<div class="x-note">Full cell management &mdash; search, prestige, challenges &mdash; lives at <a href="/cells" style="color:#c1121f;">/cells</a>.</div>':'');
  document.getElementById("cCreate").onclick=function(){
    var nm=document.getElementById("cName").value, id=ident(), err=document.getElementById("cCreateErr");
    err.textContent="";
    var btn=document.getElementById("cCreate");
    busyBtn(btn,true);
    api("cell_create",{callsign:id.callsign,device:id.device,name:nm},function(j){
      busyBtn(btn,false);
      if(!j||!j.ok){ err.textContent=cellWriteErr(j&&j.err); return; }
      toast("Cell "+j.cell.name+" formed. Recruit your four.");
      refresh();
    });
  };
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
      refresh();
    });
  };
  /* FIND A CELL: search by name/state, join from results. */
  var sb=document.getElementById("cSearchBtn");
  if(sb) sb.onclick=function(){
    var q=document.getElementById("cSearch").value,
        id=ident(), err=document.getElementById("cSearchErr"),
        res=document.getElementById("cSearchRes");
    err.textContent=""; res.innerHTML='<div class="c-load">Searching&hellip;</div>';
    api("cell_search",{q:q},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; res.innerHTML=""; return; }
      var list=j.cells||[];
      if(!list.length){ res.innerHTML='<div class="x-note">No cells match. Found the first one above.</div>'; return; }
      var h="";
      for(var i=0;i<Math.min(list.length,10);i++){
        var cc=list[i]||{};
        h+='<div class="cp-lead"><span class="cp-lname">'+esc(cc.name)+'</span> '
          +'<span class="cp-lxp">'+(Number(cc.members)||0)+'/5'
          +(cc.verified?' \u2713':'')+'</span> '
          +'<button class="c-btn c-sm" data-code="'+esc(cc.invite_code||"")+'">JOIN</button></div>';
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
            refresh();
          });
        };
      })(btns[b]);
    });
  };
}
/* SLIM (homepage): the check-in card only. Members list, prestige, chainlink
   bar, challenges, health, rename, leave — all full-mode depth on /cells. */
function renderCellSlim(el,s){
  var c=s.cell, pct=Math.round((c.mult-1)*100), id=ident();
  var html='<div class="c-card">'+
    '<div class="c-chead"><span class="c-cname">'+esc(c.name)+'</span>'+
    (c.verified?'<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>':'')+
    '<span class="c-code" id="cCodeShow" title="Tap to copy">'+esc(c.invite_code)+'</span></div>'+
    '<div class="c-cstats"><span class="c-flame">&#128293; '+c.streak+'-day streak</span>'+
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
      else { toast("Checked in. Streak: "+j.cell.streak+"."); try{ if(window.pfReportAction) window.pfReportAction("cell_checkin"); }catch(e){} }
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
   of the layout clear for it. */
function drawRecruitPoster(c){
  var W=1080,H=1350;
  var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var x=cv.getContext("2d"); if(!x) return null;
  function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,W/2,y); }
  function wrapLines(text,font,maxW,maxLines){
    x.font=font; x.textAlign="center";
    var words=String(text||"").split(/\s+/), lines=[], cur="";
    words.forEach(function(w){
      var t=cur?cur+" "+w:w;
      if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
    });
    if(cur) lines.push(cur);
    return lines.slice(0,maxLines||2);
  }
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
  x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(20,20,W-40,H-40);
  x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(44,44,W-88,H-88);
  var y=118;
  center("\u2605 THE PROPAGANDA FACTORY \u2605",y,"700 32px Arial,sans-serif","#c1121f"); y+=76;
  var nameF='900 82px "Arial Black",Arial,sans-serif';
  wrapLines(String(c.name||"MY CELL").toUpperCase(),nameF,W-170,2).forEach(function(l){
    center(l,y,nameF,"#c1121f"); y+=96; });
  y+=18;
  var tagF="700 34px Arial,sans-serif";
  wrapLines("FIVE CALLSIGNS. ONE STREAK. NOBODY LEFT BEHIND.",tagF,W-190,2).forEach(function(l){
    center(l,y,tagF,"#f5ead6"); y+=48; });
  var streak=Number(c.streak)||0;
  y+=26;
  center("\u26A1 "+streak+"-DAY STREAK \u26A1",y,'900 40px "Arial Black",Arial,sans-serif',"#c1121f"); y+=74;
  center("INVITE CODE",y,"700 30px Arial,sans-serif","#c9bfa8"); y+=16;
  var code=String(c.invite_code||"").toUpperCase()||"???";
  x.strokeStyle="#c1121f"; x.lineWidth=6;
  x.strokeRect(W/2-280,y,560,150);
  x.fillStyle="#141010"; x.fillRect(W/2-280,y,560,150);
  center(code,y+106,'900 96px "Arial Black",Arial,sans-serif',"#c1121f");
  y+=150+52;
  var lnF="400 34px Arial,sans-serif";
  wrapLines("Enter this code on mtcstw.com/cells to wire in.",lnF,W-210,2).forEach(function(l){
    center(l,y,lnF,"#c9bfa8"); y+=50; });
  wrapLines("Check in daily. Stack the streak. Recruit +25 XP.",lnF,W-210,2).forEach(function(l){
    center(l,y,lnF,"#c9bfa8"); y+=50; });
  y+=44;
  var cta="JOIN MY CELL";
  x.font='900 44px "Arial Black",Arial,sans-serif';
  var tw=x.measureText(cta).width+110;
  x.fillStyle="#c1121f"; x.fillRect(W/2-tw/2,y-58,tw,94);
  center(cta,y+8,'900 44px "Arial Black",Arial,sans-serif',"#ffffff");
  y=H-160;
  center("MTCSTW.COM",y,'900 48px "Arial Black",Arial,sans-serif',"#c1121f");
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
  var html=linkBar+'<div class="c-card">'+
    '<div class="c-chead"><span class="c-cname">'+esc(c.name)+'</span>'+
    (c.verified
      ? '<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>'
      : '<span class="c-unv" title="Recruit at least one more callsign to verify this cell">UNVERIFIED &mdash; RECRUIT TO VERIFY</span>')+
    '<span class="c-code" id="cCodeShow" title="Tap to copy">'+esc(c.invite_code)+'</span></div>'+
    '<div class="c-cstats"><span class="c-flame">&#128293; '+c.streak+'-day streak</span>'+
    '<span class="c-mult">+'+pct+'% XP on Daily Orders</span>'+
    '<span class="c-cov">Covers left this week: '+c.covers_left+'</span></div>'+
    prHtml+
    '<div class="c-members">'+mems+'</div>';
  if(s.is_founder){
    html+='<div class="c-rename"><input aria-label="RENAME CELL" id="cRename" maxlength="24" placeholder="RENAME CELL" value="'+esc(c.name)+'" autocomplete="off">'+
      '<button class="c-btn" id="cRenameBtn">Rename</button></div>';
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
      post("cell","cell_action","cell_promote",{callsign:id2.callsign,device:id2.device,cell_id:c.id,target:tgt},function(j){
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
      else { toast("Checked in. Streak: "+j.cell.streak+"."); try{ if(window.pfReportAction) window.pfReportAction("cell_checkin"); }catch(e){} }
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
        if(ee) ee.textContent="";
        if(title.length<4){ if(ee) ee.textContent="Title needs 4+ characters."; return; }
        if(days<1) days=1; if(days>30) days=30;
        if(!window.confirm("Launch challenge \\\"+title+\\\" for "+days+" days?")) return;
        busyBtn(btn,true);
        post("challenge","ch_action","challenge_create",
          {callsign:id3.callsign,device:id3.device,title:title,metric:metric,days:days},
          function(r){
            busyBtn(btn,false);
            if(!r||!r.ok){ if(ee) ee.textContent=cellWriteErr(r&&r.err); return; }
            toast("CHALLENGE LIVE. Get your cell in.");
            loadCh();
          });
      };
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
          h+='<div class="x-pane"><h4>'+esc(ch.title)+'</h4>'
            +'<div class="x-note">'+esc(ch.detail||"")+'</div>'
            +'<div class="x-note">Ends: '+esc(ch.ends||"soon")+'</div>'
            +'<button class="c-btn c-chjoin" data-ch="'+esc(ch.id)+'">ENTER MY CELL</button>'
            +'<div class="c-err" id="cChErr-'+esc(ch.id)+'"></div></div>';
        }
        h+=createFormHtml();
        h+='<div id="cChBoard"><div class="c-load">Loading standings&hellip;</div></div>';
        host.innerHTML=h;
        wireCreate();
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
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; return; }
      toast("Wired into "+j.cell.name+". The chain grows.");
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
refresh();
loadBoard();
if(!window._pfCellsTick){ window._pfCellsTick=setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} loadBoard(); },5*60*1000); }
})();
</script>
</div>
</template>`);
})();
