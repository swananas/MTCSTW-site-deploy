/* games/governance.js | PF v1.4.3 | THE PEOPLE'S ASSEMBLY: network governance.
   TEARDOWN WS-11 (section teardown PART 2 §11, CEO-approved 2026-10-06):
   the referendum. Built on PF.patterns (WS-0 library):
     P1 Briefing Hero (THE PEOPLE'S ASSEMBLY — propose. vote. the Assembly decides.)
     P2 Intel Cards, full-ceremony scale for constitutional/fund-level votes
     P4 quorum readout, BUCKETED (bands, never exact pre-close counts)
     P5 Progression Ring (XP progress, render-only — NEVER vote weight)
     P6 Action Bar (share / cell / report) closing every decided proposal
   TIERED CEREMONY (CEO DECISION 4, 2026-10-06):
     FULL referendum ceremony — constitutional/fund-level votes: full-screen
       proposal card, pro/con at a glance, personalized stakes, countdown with
       rising visual urgency, SHIELDED ballots, big YES/NO/ABSTAIN targets.
     LIGHTWEIGHT inline ballot — routine votes: compact ledger-style rows.
     Guided first-vote micro-flow — new voters get a 3-step on-ramp.
   SHIELDED BALLOTS: open proposals render NO tallies — no yes/no weights, no
   voter counts. Tallies stay sealed until close (kills bandwagon effects).
   NOTE: the JSONP proposal_list payload still carries the numbers; true
   sealing needs the backend to withhold them (flagged CEO-decision item —
   zero backend writes in this wave, so the frontend hides what it must).
   SECURITY (HARD GATE):
     - Vote weight is SERVER-SIDE ONLY and NON-PURCHASABLE. This file NEVER
       computes vote weight. The old client-side formula (1+floor(sqrt(xp/100)))
       is REMOVED. The only weights this page ever displays are server-issued:
       the weight on a vote POST response, and (future) a server weight field.
     - No component breakdowns of weight in client code. No purchase/tier
       math anywhere near voting. Delegation copy describes server behavior
       only ("their ballot carries your weight too").
     - Callsign-gated voting (PF.gateHTML); quorum display bucketed.
   CTA DISCIPLINE: casting a vote is REPORT BACK (votes close the loop) —
     the cast targets read REPORT YES → / REPORT NO → / REPORT ABSTAIN → in
     report-family (non-red) styling. PUT IT TO A VOTE → is DEPLOY-family.
     Red-button rule: only the DEPLOY-family create button may be red.
   ELECTION NIGHT: every closed proposal renders a results block — outcome
     declared, margin, turnout, a published outcome statement, and the P6
     action bar assigning the next step. No vote disappears into a void.
   BACKEND NEEDS (CEO decision items — NOT built here, zero backend writes):
     1. `tier` (or ceremony/weight_class) on proposal_list items for
        deterministic ceremony classification (frontend uses a documented
        keyword heuristic as the interim).
     2. Withhold yes_weight/no_weight/voter_count for OPEN proposals so
        shielded ballots are real, not cosmetic.
     3. A server-issued current vote-weight field (proposal_list or a weight
        read) so the stakes line can show "your vote carries X" pre-vote.
     4. Eligible-voter denominator for a true turnout % on results.
     5. Abstain support: proposal_vote currently REJECTS choice=abstain
        ("choice must be yes or no", backend gov.js). The ABSTAIN target is
        built and flag-gated (ABSTAIN_SUPPORTED=false); flip the flag once
        the backend accepts abstain + defines tally semantics.
     6. Optional: pro/con fields on proposals for a true two-sided card.
   TEST SEAM: window.PF.govFixture ({proposals, delegation, xp}) deep-merges
   over defaults — the verify harness + News Desk staged previews. Never set
   in production. window.PF.govTest exposes buildHTML/tier/quorum/urgency.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained
   api()), writes via CORS POST (self-contained post()). It never reaches
   into another silo's internals.
   KILL: ?pf_off=governance  or  localStorage pf_disabled_v1='["governance"]'.
   Fail-open: patterns killed -> legacy compact render (still shielded,
   still server-weight-only, still callsign-gated). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("governance")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-gov">
<div class="fe-block pf-override-block pf-silo" id="pf-gov">
<h2>The People&rsquo;s Assembly</h2>
<div class="c-tag">The network governs itself. Propose. Vote. The Assembly decides.</div>
<div id="xGov"><div class="c-load">Convening the assembly&hellip;</div></div>
</div>
<script>
(function(){
/* ===== inner: helpers (unchanged mechanics) ===== */
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px Arial,sans-serif;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfGvCb"+Math.floor(Math.random()*1e9);
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
function post(gAction,params,cb){
  var body={type:"gov",g_action:gAction};
  for(var k in params){ if(Object.prototype.hasOwnProperty.call(params,k)) body[k]=params[k]; }
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
/* Admin gate for AUTH+ADMIN dual-gated actions (admin early proposal close).
   Same key as vault.js / dashboard.js: sessionStorage 'pf_admin_secret'. */
function isAdmin(){ try{ return !!sessionStorage.getItem("pf_admin_secret"); }catch(e){ return false; } }
function adminPost(gAction,params,cb){
  var secret=""; try{ secret=sessionStorage.getItem("pf_admin_secret")||""; }catch(e){}
  if(!secret){ post(gAction,params,cb); return; }
  var body={type:"gov",g_action:gAction};
  for(var k in params){ if(Object.prototype.hasOwnProperty.call(params,k)) body[k]=params[k]; }
  try{ var s2=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s2) body.auth_secret=s2; }catch(e2){}
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e3){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":secret},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e4){} },15000); } }catch(e5){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e6){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e7){ done(null); }
}
/* localStorage helpers (device-local prefs only — never votes, never weight) */
function lsGet(k){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ window.localStorage.setItem(k,v); }catch(e){} }
var FIRSTVOTE_KEY="pf_gov_firstvote_v1";
var LASTW_KEY="pf_gov_lastweight_v1"; /* server-issued weight from the last vote response */
/* ABSTAIN SUPPORT (backend-gated): the live proposal_vote endpoint accepts
   only yes/no (backend gov.js: "choice must be yes or no"). The ABSTAIN
   target ships the moment the backend accepts choice=abstain and defines
   tally semantics — flip this flag, zero other changes. CEO-decision
   backend item: abstain support. */
var ABSTAIN_SUPPORTED=false;
function abstainBtnHTML(pid,small){
  if(!ABSTAIN_SUPPORTED) return "";
  return '<button type="button" class="gv-cast'+(small?" gv-small":"")+'" data-pid="'+esc(pid)+'" data-ch="abstain">'
    +(small?"ABSTAIN \u2192":"REPORT ABSTAIN \u2192")+'</button>';
}

/* ===== teardown WS-11: silo-local CSS (injected once at mount) ===== */
var GOV_CSS=[
".pf-gov{max-width:760px;margin:0 auto;padding:4px 0 30px;background:#0a0a0a;color:#fff;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;}",
".gv-kicker{color:#c1121f;text-transform:uppercase;letter-spacing:3px;font-weight:800;font-size:12px;margin:0 0 8px;}",
".gv-sec{margin:26px 0 0;padding:0 4px;}",
".gv-sec-t{font-size:19px;font-weight:800;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;}",
".gv-note{color:#8a8a8a;font-size:13px;line-height:1.6;margin:0 0 10px;}",
".gv-stakes{border:1px solid #4a4a4a;background:#0d0d0d;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.6;color:#d8d0c0;}",
".gv-stakes b{color:#fff;}",
/* full-ceremony card */
".gv-full{background:#0d0d0d;border:2px solid #c1121f;margin:0 0 18px;padding:20px 18px;}",
".gv-full h3{font-size:22px;font-weight:900;margin:0 0 10px;line-height:1.25;color:#fff;}",
".gv-case{border-left:3px solid #4a4a4a;padding:2px 0 2px 12px;margin:12px 0;}",
".gv-case-k{color:#c1121f;font-size:11px;letter-spacing:2px;font-weight:800;margin:0 0 4px;}",
".gv-case p{margin:0;font-size:14px;line-height:1.6;color:#e8e2d2;}",
".gv-shield{background:#12060a;border:1px dashed #c1121f;color:#e8e2d2;font-size:12.5px;padding:10px 12px;margin:12px 0;line-height:1.5;}",
".gv-quorum{font-size:12px;letter-spacing:2px;font-weight:800;color:#8a8a8a;margin:10px 0;}",
".gv-quorum .segs{letter-spacing:0;color:#c1121f;}",
".gv-count{font-weight:900;letter-spacing:2px;font-size:15px;margin:8px 0;}",
".gv-urg-1 .gv-count{color:#fff;}",
".gv-urg-2 .gv-count{color:#c1121f;}",
".gv-urg-3{border-color:#c1121f;}",
".gv-urg-3 .gv-count{color:#c1121f;animation:gvPulse 1.6s ease-in-out infinite;}",
"@keyframes gvPulse{0%,100%{opacity:1;}50%{opacity:.55;}}",
/* cast targets: REPORT-family, non-red, thumb-zone */
".gv-cast-row{display:flex;gap:10px;margin:16px 0 4px;flex-wrap:wrap;}",
".gv-cast{flex:1 1 140px;background:#0a0a0a;border:2px solid #8a8a8a;color:#fff;font-weight:900;letter-spacing:1px;font-size:16px;padding:16px 10px;cursor:pointer;font-family:Arial,Helvetica,sans-serif;min-height:64px;}",
".gv-cast:hover{border-color:#fff;}",
".gv-cast:disabled{opacity:.45;cursor:wait;}",
".gv-cast.gv-yes{border-color:#fff;}",
".gv-voted{color:#8a8a8a;font-size:13px;margin:10px 0 0;}",
/* lightweight inline ballot */
".gv-inline{display:flex;gap:12px;align-items:center;background:#0d0d0d;border:1px solid #4a4a4a;padding:12px;margin:0 0 10px;flex-wrap:wrap;}",
".gv-inline-main{flex:1 1 220px;}",
".gv-inline-t{font-weight:800;font-size:15px;margin:0 0 4px;color:#fff;}",
".gv-inline-meta{color:#8a8a8a;font-size:12px;margin:0;}",
".gv-inline-vote{display:flex;gap:8px;}",
".gv-cast.gv-small{flex:0 1 auto;min-height:48px;padding:10px 14px;font-size:13px;}",
".gv-inline.gv-urg-2 .gv-inline-meta{color:#c1121f;font-weight:800;}",
".gv-inline.gv-urg-3 .gv-inline-meta{color:#c1121f;font-weight:900;animation:gvPulse 1.6s ease-in-out infinite;}",
/* first-vote micro-flow */
".gv-firstvote{border:2px solid #c1121f;background:#12060a;padding:18px;margin:16px 0;}",
".gv-firstvote h4{margin:0 0 10px;font-size:16px;letter-spacing:2px;color:#fff;}",
".gv-step{display:flex;gap:12px;margin:10px 0;align-items:flex-start;}",
".gv-step-n{background:#c1121f;color:#fff;font-weight:900;width:28px;height:28px;line-height:28px;text-align:center;flex:0 0 28px;font-size:14px;}",
".gv-step p{margin:0;font-size:13.5px;line-height:1.55;color:#e8e2d2;}",
".gv-step p b{color:#fff;}",
/* results / election night */
".gv-result{background:#0d0d0d;border:2px solid #4a4a4a;padding:18px;margin:0 0 16px;}",
".gv-result.gv-passed{border-color:#fff;}",
".gv-badge{display:inline-block;font-weight:900;letter-spacing:2px;font-size:13px;padding:6px 14px;margin:0 0 10px;}",
".gv-badge.gv-pass{background:#fff;color:#0a0a0a;}",
".gv-badge.gv-fail{background:#0a0a0a;color:#8a8a8a;border:2px solid #8a8a8a;}",
".gv-badge.gv-tie{background:#0a0a0a;color:#c1121f;border:2px solid #c1121f;}",
".gv-result h3{font-size:19px;font-weight:900;margin:0 0 8px;color:#fff;}",
".gv-outcome{font-size:14px;line-height:1.6;color:#e8e2d2;margin:0 0 10px;}",
".gv-outcome b{color:#fff;}",
/* closing-soon ping */
".gv-ping{background:#1a0505;border:2px solid #c1121f;color:#e8e2d2;padding:12px 14px;margin:12px 0;font-size:14px;line-height:1.5;}",
".gv-ping b{color:#c1121f;}",
".gv-ping a{color:#fff;font-weight:800;}",
/* form */
".gv-form{background:#0d0d0d;border:1px solid #4a4a4a;padding:18px;margin:0 0 10px;}",
".gv-form input[type=text],.gv-form textarea{width:100%;background:#141414;color:#fff;border:1px solid #4a4a4a;padding:10px;font-size:14px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;margin:0 0 10px;}",
".gv-form input[type=number]{background:#141414;color:#fff;border:1px solid #4a4a4a;padding:8px;font-size:14px;width:70px;}",
".gv-err{color:#c1121f;font-size:13px;min-height:18px;margin:6px 0 0;}",
".gv-btn-red{display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:1px;font-size:15px;padding:14px 26px;border:none;cursor:pointer;font-family:Arial,Helvetica,sans-serif;}",
".gv-btn-ghost{display:inline-block;background:transparent;color:#8a8a8a;border:1px solid #4a4a4a;font-weight:700;font-size:13px;padding:10px 18px;cursor:pointer;font-family:Arial,Helvetica,sans-serif;margin-left:8px;}"
].join("");
function govCSS(){
  try{
    if(document.getElementById("pf-gov-css")) return;
    var st=document.createElement("style"); st.id="pf-gov-css"; st.textContent=GOV_CSS;
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}
}

/* ===== teardown WS-11: tiered ceremony =====
   FULL referendum ceremony: constitutional/fund-level votes.
   LIGHTWEIGHT inline ballot: routine votes.
   Server field (tier/ceremony/weight_class) wins when present. INTERIM
   HEURISTIC below runs only until the backend ships tier on
   proposal_list (CEO-decision backend item #1) — documented, fail-open
   (unknown -> lightweight), never a security boundary. */
function govTier(p){
  p=p||{};
  var t=String(p.tier||p.ceremony||p.weight_class||"").toLowerCase();
  if(/full|constitutional|referendum/.test(t)) return "full";
  if(/light|routine|inline|minor/.test(t)) return "light";
  var txt=String((p.title||"")+" "+(p.description||"")).toLowerCase();
  if(/constitution|amendment|charter|by-?law|treasury|war[- ]?chest|\\bfund\\b|budget|\\bdues\\b|\\bfee\\b|quorum|recall|impeach|dissolve|merge/.test(txt)) return "full";
  return "light";
}
/* ===== quorum: BUCKETED bands, never exact pre-close counts ===== */
function quorumBand(n){
  n=Math.max(0,Math.floor(Number(n)||0));
  if(n<=0)  return {label:"QUORUM: AWAITING FIRST BALLOTS",segs:0};
  if(n<25)  return {label:"QUORUM: BUILDING",segs:1};
  if(n<100) return {label:"QUORUM: GROWING",segs:2};
  return {label:"QUORUM: STRONG",segs:3};
}
function quorumHTML(n){
  var b=quorumBand(n), segs="";
  for(var i=0;i<3;i++) segs+=(i<b.segs?"\u25A0":"\u25A1");
  return '<p class="gv-quorum">'+esc(b.label)+' <span class="segs">'+segs+'</span></p>';
}
/* ===== countdown with rising visual urgency ===== */
function fmtLeft(ms){
  if(ms<=0) return "CLOSED";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  if(d>0) return d+"d "+h+"h left";
  if(h>0) return h+"h "+m+"m left";
  return m+"m left";
}
function urgClass(ms){
  if(ms<=0) return "gv-urg-1";
  if(ms<=6*3600000) return "gv-urg-3";   /* final hours: pulsing red */
  if(ms<=24*3600000) return "gv-urg-2";  /* closing: red */
  return "gv-urg-1";
}
function countHTML(ms){
  return '<p class="gv-count">'+esc(fmtLeftUrgent(ms).toUpperCase())+'</p>';
}
/* shared urgency label: base countdown + rising-urgency tail */
function fmtLeftUrgent(ms){
  var u=urgClass(ms), tail=(u==="gv-urg-3")?" \u2014 FINAL HOURS":(u==="gv-urg-2"?" \u2014 CLOSING":"");
  return fmtLeft(ms)+tail;
}
/* ===== state ===== */
var GOV_DEFAULTS={proposals:[],delegation:null,xp:null};
function mergeGov(base,over){
  var out={},k;
  for(k in base){ if(Object.prototype.hasOwnProperty.call(base,k)) out[k]=base[k]; }
  if(over&&typeof over==="object"){
    for(k in over){
      if(!Object.prototype.hasOwnProperty.call(over,k)) continue;
      out[k]=over[k];
    }
  }
  return out;
}
var GOVFIX=null;
try{ GOVFIX=(window.PF&&window.PF.govFixture)||null; }catch(e){}
var PL=null, DG=null, XP=null, LASTW=null;
try{ var _lw=parseInt(lsGet(LASTW_KEY),10); if(isFinite(_lw)&&_lw>0) LASTW=_lw; }catch(e){}
function load(){
  var id=ident();
  if(GOVFIX){
    /* Test seam / staged preview: never in production. */
    PL={proposals:GOVFIX.proposals||[]};
    DG=GOVFIX.delegation||null;
    XP=(GOVFIX.xp==null?null:Math.max(0,Math.floor(Number(GOVFIX.xp)||0)));
    render();
    return;
  }
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=3) fin(); }
  setTimeout(fin,15000);
  /* 6A-R7/E21: pass the callsign so proposal_list returns the per-proposal
     voted flag the non-voter ping UI keys off. */
  api("proposal_list",{callsign:id.callsign||""},function(j){ PL=j; one(); });
  if(id.callsign){ api("delegation_get",{callsign:id.callsign},function(j){ DG=j; one(); }); }
  else { DG=null; one(); }
  /* P5 ring feed ONLY. SECURITY: xp_balance is a public read used to render
     the Progression Ring (XP progress, render-only). It MUST NOT feed any
     vote-weight computation — weight is server-set and arrives only via
     vote responses (LASTW) or a future server weight field. The old
     client-side formula (1+floor(sqrt(xp/100))) was REMOVED in WS-11. */
  if(id.callsign){
    api("xp_balance",{callsign:id.callsign},function(j){
      XP=(j&&j.balance!=null)?Math.max(0,Math.floor(Number(j.balance)||0)):null;
      one();
    });
  } else { XP=null; one(); }
}
/* Rank ladder for the P5 ring (render-only; same ladder the fund page uses).
   The ring shows XP progress toward the next rank — never vote weight. */
var RANKS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
function rankFor(xp){
  var r=RANKS[0][0], cap=RANKS[1][1];
  for(var i=0;i<RANKS.length;i++){
    if(xp>=RANKS[i][1]){ r=RANKS[i][0]; cap=(RANKS[i+1]||[0,xp])[1]; }
  }
  return {rank:r,cap:Math.max(cap,xp+1)};
}

/* ===== renderers ===== */
function pat(){
  try{ return (window.PF&&window.PF.patterns&&!window.PF.skip("patterns"))?window.PF.patterns:null; }
  catch(e){ return null; }
}
function heroHTML(P){
  if(P) return P.hero({kicker:"THE PEOPLE'S ASSEMBLY",mission:"The network governs itself. Propose. Vote. The Assembly decides.",sub:"Power from the ranks, not from above. Every ballot ends in a published outcome."});
  return '<div class="gv-sec"><p class="gv-kicker">The People\u2019s Assembly</p><p class="gv-sec-t">The network governs itself. Propose. Vote. The Assembly decides.</p></div>';
}
/* Personalized stakes (P5). The weight line is explicit: server-set, grows
   with XP, never for sale, never computed on this device. The ring renders
   XP progress ONLY. */
function stakesHTML(P){
  var h='<div class="gv-stakes"><b>YOUR STAKES:</b> your ballot carries <b>server-set weight</b> \u2014 the Assembly server sets it. It grows with your XP. <b>Never for sale. Never computed on your device.</b>';
  if(LASTW) h+=' Last counted ballot: weight <b>'+LASTW+'</b> (server-set).';
  h+='</div>';
  if(P&&XP!=null&&XP>0){
    var r=rankFor(XP);
    h+=P.ring({xp:XP,cap:r.cap,rank:r.rank})
      +'<p class="gv-note">Your grind, recognized. This ring shows XP progress only \u2014 the server sets vote weight.</p>';
  }
  return h;
}
/* Guided first-vote micro-flow: new voters (callsign, never voted, never
   dismissed) get the 3-step on-ramp above the ballot. */
function isNewVoter(props){
  try{ if(lsGet(FIRSTVOTE_KEY)==="1") return false; }catch(e){}
  for(var i=0;i<props.length;i++){ if(props[i].voted===true) return false; }
  if(LASTW) return false;
  return true;
}
function firstVoteHTML(open){
  var target=open.length?("#gv-prop-"+open[0].id):"#gv-open";
  return '<div class="gv-firstvote" id="gv-firstvote">'
    +'<h4>YOUR FIRST VOTE \u2014 3 STEPS</h4>'
    +'<div class="gv-step"><div class="gv-step-n">1</div><p><b>THE ASSEMBLY DECIDES.</b> Proposals, weighted votes, delegation. Every ballot ends in a published outcome \u2014 no vote disappears into a void.</p></div>'
    +'<div class="gv-step"><div class="gv-step-n">2</div><p><b>BALLOTS ARE SHIELDED.</b> Tallies stay sealed until the vote closes. Vote your conscience, not the crowd \u2014 no bandwagons.</p></div>'
    +'<div class="gv-step"><div class="gv-step-n">3</div><p><b>YOUR WEIGHT IS SERVER-SET.</b> It grows with your XP. Never for sale, never computed on your device. Casting is reporting back \u2014 it closes the loop.</p></div>'
    +'<p style="margin:12px 0 0;"><a href="'+esc(target)+'" class="gv-btn-red" data-gv-firstvote-go style="text-decoration:none;">GOT IT \u2014 TAKE ME TO THE BALLOT \u2193</a></p>'
    +'</div>';
}
/* 6A-R7/E21: non-voter ping — open proposals closing within 6h that this
   callsign hasn't voted on get a closing-soon banner above the fold. */
function pingHTML(open){
  var ping=[];
  for(var i=0;i<open.length;i++){
    var p=open[i], left=Number(p.closes_at||0)-Date.now();
    if(left>0&&left<=6*3600000&&p.voted!==true) ping.push(p);
  }
  var h="";
  for(var q=0;q<ping.length;q++){
    var qp=ping[q];
    h+='<div class="gv-ping"><b>\u26A0 VOTE CLOSING SOON:</b> &ldquo;'+esc(qp.title)+'&rdquo; '
      +'closes in '+esc(fmtLeft(Number(qp.closes_at)-Date.now()))
      +' \u2014 you haven\u2019t voted. '
      +'<a href="#gv-prop-'+esc(qp.id)+'">VOTE NOW \u2193</a></div>';
  }
  return h;
}
/* FULL referendum ceremony: full-screen proposal card (P2, large). */
function fullCardHTML(p){
  var left=Number(p.closes_at||0)-Date.now();
  var u=urgClass(left);
  var voted=p.voted===true;
  var h='<article class="gv-full '+u+'" id="gv-prop-'+esc(p.id)+'">'
    +'<p class="gv-kicker">FULL REFERENDUM \u00B7 CONSTITUTIONAL / FUND LEVEL</p>'
    +'<h3>'+esc(p.title)+'</h3>'
    +countHTML(left)
    +'<div class="gv-case"><p class="gv-case-k">THE PROPOSER\u2019S CASE</p><p>'+esc(p.description||"No case filed.")+'</p></div>'
    +'<div class="gv-case"><p class="gv-case-k">THE KEY QUESTION</p><p>Should the Assembly '+esc(String(p.title||"").charAt(0).toLowerCase()+String(p.title||"").slice(1))+'?</p></div>'
    +'<p class="gv-note">By <b style="color:#fff;">'+esc(p.proposer)+'</b> \u00B7 your ballot carries server-set weight \u2014 grows with XP, never for sale.</p>'
    +'<div class="gv-shield">\uD83D\uDEE1\uFE0F <b>BALLOT SHIELDED</b> \u2014 tallies stay sealed until the vote closes. No bandwagons, no gaming the count.</div>'
    +quorumHTML(p.voter_count);
  if(voted){
    h+='<p class="gv-voted">\u2713 Ballot recorded. The tally stays sealed until close.</p>';
  } else {
    h+='<div class="gv-cast-row">'
      +'<button type="button" class="gv-cast gv-yes" data-pid="'+esc(p.id)+'" data-ch="yes">REPORT YES \u2192</button>'
      +'<button type="button" class="gv-cast" data-pid="'+esc(p.id)+'" data-ch="no">REPORT NO \u2192</button>'
      +abstainBtnHTML(p.id,false)
      +'</div>'
      +'<p class="gv-note">Casting is reporting back \u2014 your vote closes the loop.</p>';
  }
  h+=closeBtnsHTML(p);
  h+='</article>';
  return h;
}
/* LIGHTWEIGHT inline ballot: routine votes, compact ledger-style rows. */
function inlineRowHTML(p){
  var left=Number(p.closes_at||0)-Date.now();
  var voted=p.voted===true;
  var h='<div class="gv-inline '+urgClass(left)+'" id="gv-prop-'+esc(p.id)+'">'
    +'<div class="gv-inline-main">'
    +'<p class="gv-inline-t">'+esc(p.title)+'</p>'
    +'<p class="gv-inline-meta">LIGHTWEIGHT BALLOT \u00B7 '+esc(fmtLeftUrgent(left))+' \u00B7 '+esc(quorumBand(p.voter_count).label)+' \u00B7 shielded</p>'
    +'</div>';
  if(voted){
    h+='<p class="gv-voted">\u2713 Recorded</p>';
  } else {
    h+='<div class="gv-inline-vote">'
      +'<button type="button" class="gv-cast gv-small" data-pid="'+esc(p.id)+'" data-ch="yes">REPORT YES \u2192</button>'
      +'<button type="button" class="gv-cast gv-small" data-pid="'+esc(p.id)+'" data-ch="no">REPORT NO \u2192</button>'
      +abstainBtnHTML(p.id,true)
      +'</div>';
  }
  h+=closeBtnsHTML(p);
  h+='</div>';
  return h;
}
/* 2026-10-03: proposal_close (AUTH+ADMIN). Past the deadline anyone can
   settle; early close is admin-only (backend enforces). */
function closeBtnsHTML(p){
  var pastDue=Number(p.closes_at||0)<=Date.now();
  if(pastDue) return '<p style="margin:10px 0 0;"><button type="button" class="gv-btn-ghost" data-gv-close data-pid="'+esc(p.id)+'">CLOSE &amp; SETTLE</button></p>';
  if(isAdmin()) return '<p style="margin:10px 0 0;"><button type="button" class="gv-btn-ghost" data-gv-close-early data-pid="'+esc(p.id)+'">CLOSE EARLY (ADMIN)</button></p>';
  return "";
}
/* ELECTION NIGHT: every closed proposal ends in a published outcome statement
   + margin + turnout + the P6 action bar assigning the next step. */
function resultBadge(q){
  if(q.result==="passed") return '<span class="gv-badge gv-pass">PASSED</span>';
  if(q.result==="failed") return '<span class="gv-badge gv-fail">FAILED</span>';
  return '<span class="gv-badge gv-tie">DEADLOCKED</span>';
}
function outcomeStatement(q){
  var t=String(q.title||"Untitled");
  if(q.result==="passed") return '<b>PASSED</b> \u2014 the Assembly adopts &ldquo;'+esc(t)+'&rdquo;. The result stands.';
  if(q.result==="failed") return '<b>FAILED</b> \u2014 the Assembly rejects &ldquo;'+esc(t)+'&rdquo;. The result stands.';
  return '<b>DEADLOCKED</b> \u2014 &ldquo;'+esc(t)+'&rdquo; falls short of a decision. It can be re-proposed.';
}
function marginPct(yes,no){
  var t=yes+no; if(t<=0) return "\u2014";
  return Math.round(Math.abs(yes-no)/t*100)+" PTS";
}
function resultsHTML(hist,P){
  var h='<div class="gv-sec"><p class="gv-kicker">Election night</p><p class="gv-sec-t">Decided ('+hist.length+')</p>';
  if(!hist.length){ h+='<p class="gv-note">Nothing decided yet. History is waiting to be written.</p>'; }
  for(var k=0;k<Math.min(hist.length,20);k++){
    var q=hist[k];
    var yes=Number(q.yes_weight)||0, no=Number(q.no_weight)||0, vc=Number(q.voter_count)||0;
    var cls=q.result==="passed"?"gv-passed":"";
    h+='<article class="gv-result '+cls+'">'
      +'<p class="gv-kicker">THE ASSEMBLY HAS SPOKEN</p>'
      +resultBadge(q)
      +'<h3>'+esc(q.title)+'</h3>'
      +'<p class="gv-outcome">'+outcomeStatement(q)+'</p>';
    /* P7 ledger lines: post-close exact figures are fine — the vote is over. */
    if(P){
      h+=P.ledgerLine({what:"YES weight",figure:String(yes),hot:true})
        +P.ledgerLine({what:"NO weight",figure:String(no),hot:true})
        +P.ledgerLine({what:"Margin",figure:marginPct(yes,no)})
        +P.ledgerLine({what:"Turnout",figure:vc+" soldier"+(vc===1?"":"s")+" voted"});
    } else {
      h+='<p class="gv-note">YES '+yes+' \u00B7 NO '+no+' \u00B7 margin '+esc(marginPct(yes,no))+' \u00B7 '+vc+' voted</p>';
    }
    /* P6: the next step is assigned, not left hanging. */
    var shareUrl="";
    try{ shareUrl=(window.location.href||"").split("#")[0]+"#gv-prop-"+encodeURIComponent(q.id||""); }catch(e){}
    if(P) h+=P.actionBar({shareUrl:shareUrl,cellUrl:"/cells",reportUrl:"/#pf-orders"});
    else h+='<p class="gv-note"><a href="/cells" style="color:#fff;">Take this to your cell \u2192</a></p>';
    h+='</article>';
  }
  h+='</div>';
  return h;
}

function createHTML(P){
  var h='<div class="gv-sec"><p class="gv-kicker">New proposal</p><p class="gv-sec-t">Put it on the floor</p>'
    +'<div class="gv-form">'
    +'<p class="gv-note">Costs <b style="color:#fff;">100 XP</b> to put on the floor \u2014 keeps the spam out. Duration 1\u201330 days. XP has no cash value. Stakes are final.</p>'
    +'<input type="text" aria-label="Proposal title" id="gvTitle" maxlength="120" placeholder="Proposal title">'
    +'<textarea aria-label="Proposal description" id="gvDesc" maxlength="2000" rows="3" placeholder="What are you proposing, and why? Make the case."></textarea>'
    +'<p class="gv-note">Duration: <input type="number" id="gvDays" min="1" max="30" value="7"> days</p>'
    +'<button type="button" class="gv-btn-red" id="gvCreateBtn">PUT IT TO A VOTE \u2192</button>'
    +'<p class="gv-err" id="gvCreateErr"></p>'
    +'</div></div>';
  return h;
}
function delegationHTML(){
  var cur=(DG&&DG.delegate)||null, toMe=(DG&&DG.delegated_to_me)||[];
  var h='<div class="gv-sec"><p class="gv-kicker">Liquid delegation</p><p class="gv-sec-t">Lend your voice</p>'
    +'<div class="gv-form">'
    +'<p class="gv-note">Trust someone&rsquo;s judgment? Hand them your vote \u2014 their ballot carries your weight too. You can vote directly anytime: your own ballot always overrides.</p>';
  if(cur){ h+='<p class="gv-note">Your vote rides with <b style="color:#fff;">'+esc(cur)+'</b>.</p>'
    +'<button type="button" class="gv-btn-ghost" id="gvUndelegate">TAKE MY VOTE BACK</button>'; }
  else { h+='<p class="gv-note">You hold your own vote.</p>'
    +'<input type="text" aria-label="Delegate callsign" id="gvDel" maxlength="20" placeholder="Delegate callsign">'
    +'<button type="button" class="gv-btn-red" id="gvDelegateBtn">DELEGATE MY VOTE \u2192</button>'; }
  if(toMe.length){ h+='<p class="gv-note">'+toMe.length+' soldier'+(toMe.length>1?'s':'')+' trust'+(toMe.length>1?'':'s')+' your judgment: '+toMe.map(function(x){return esc(x);}).join(", ")+'</p>'; }
  h+='<p class="gv-err" id="gvDelErr"></p></div></div>';
  return h;
}
function render(){
  var el=document.getElementById("xGov"); if(!el) return;
  govCSS();
  var P=pat();
  if(!P){ renderLegacy(el); return; }
  var id=ident();
  if(!id.callsign){
    el.innerHTML='<div class="pf-gov">'+heroHTML(P)+PF.gateHTML("The Assembly votes on callsigns.","to take your seat in the Assembly")+'</div>';
    return;
  }
  var props=(PL&&PL.proposals)||[];
  var open=[], hist=[];
  for(var i=0;i<props.length;i++){ if(props[i].status==="open") open.push(props[i]); else hist.push(props[i]); }
  var full=[], light=[];
  for(var o=0;o<open.length;o++){ if(govTier(open[o])==="full") full.push(open[o]); else light.push(open[o]); }
  var h='<div class="pf-gov">';
  h+=heroHTML(P);
  h+=stakesHTML(P);
  if(isNewVoter(props)) h+=firstVoteHTML(open);
  h+=pingHTML(open);
  /* --- full referendum ceremony --- */
  h+='<div class="gv-sec" id="gv-open"><p class="gv-kicker">On the floor</p><p class="gv-sec-t">Full referenda ('+full.length+')</p>';
  if(!full.length) h+='<p class="gv-note">No full referenda open. Constitutional and fund-level votes land here, with full ceremony.</p>';
  for(var f=0;f<full.length;f++) h+=fullCardHTML(full[f]);
  h+='</div>';
  /* --- lightweight inline ballots --- */
  h+='<div class="gv-sec"><p class="gv-kicker">Routine business</p><p class="gv-sec-t">Lightweight ballots ('+light.length+')</p>';
  if(!light.length) h+='<p class="gv-note">No routine ballots open.</p>';
  for(var l=0;l<light.length;l++) h+=inlineRowHTML(light[l]);
  h+='</div>';
  /* --- new proposal --- */
  h+='<div class="x-pane"><h4>New proposal</h4>'
    +'<div class="x-note">Costs <b>100 XP</b> to put on the floor &mdash; keeps the spam out. Duration 1&ndash;30 days. XP has no cash value. Stakes are final.</div>'
    +'<input aria-label="Proposal title" class="c-in" id="gvTitle" maxlength="120" placeholder="Proposal title">'
    +'<textarea class="c-in" id="gvDesc" maxlength="2000" rows="3" placeholder="What are you proposing, and why?"></textarea>'
    +'<div class="x-note">Duration: <input class="c-in gv-dur" id="gvDays" type="number" min="1" max="30" value="7"> days</div>'
    +'<button class="c-btn" id="gvCreateBtn">PUT IT TO A VOTE (100 XP)</button><div class="c-err" id="gvCreateErr"></div></div>';
  /* --- delegation --- */
  var cur=(DG&&DG.delegate)||null, toMe=(DG&&DG.delegated_to_me)||[];
  h+='<div class="x-pane"><h4>Liquid delegation</h4>'
    +'<div class="x-note">Trust someone&rsquo;s judgment? Hand them your vote weight. They vote, it counts double. You vote directly anytime &mdash; your own ballot always wins.</div>';
  if(cur){ h+='<div class="x-note">Your vote is delegated to <b>'+esc(cur)+'</b>.</div>'
    +'<button class="c-btn" id="gvUndelegate">TAKE MY VOTE BACK</button>'; }
  else { h+='<div class="x-note">You hold your own vote.</div>'
    +'<input aria-label="Delegate callsign" class="c-in" id="gvDel" maxlength="20" placeholder="Delegate callsign">'
    +'<button class="c-btn" id="gvDelegateBtn">DELEGATE MY VOTE</button>'; }
  if(toMe.length){ h+='<div class="x-note">'+toMe.length+' soldier'+(toMe.length>1?'s':'')+' trust'+(toMe.length>1?'':'s')+' your judgment: '+toMe.map(function(x){return esc(x);}).join(", ")+'</div>'; }
  h+='<div class="c-err" id="gvDelErr"></div></div>';
  /* --- history --- */
  h+='<div class="x-pane"><h4>Decided ('+hist.length+')</h4>';
  if(!hist.length){ h+='<div class="x-note">Nothing decided yet. History is waiting to be written.</div>'; }
  for(var k=0;k<Math.min(hist.length,20);k++){
    var q=hist[k], badge=q.result==="passed"?'<span class="gv-pass">PASSED</span>':(q.result==="failed"?'<span class="gv-fail">FAILED</span>':'<span class="gv-tie">TIE</span>');
    h+='<div class="gv-prop gv-hist"><div class="gv-ptitle">'+esc(q.title)+' '+badge+'</div>'
      +'<div class="x-note">YES '+esc(q.yes_weight)+' &bull; NO '+esc(q.no_weight)+' &bull; '+esc(q.voter_count)+' voters</div>'
      /* share-out gaps #8: the result is shareable. */
      +'<div style="margin-top:6px"><button type="button" class="c-btn ghost gv-share" data-idx="'+k+'">SHARE RESULT</button></div></div>';
  }
  h+='</div>';
  h+=createHTML(P);
  h+=delegationHTML();
  h+=resultsHTML(hist,P);
  /* P6 page-level close: nothing ends with the individual. */
  var pageUrl=""; try{ pageUrl=window.location.href||""; }catch(e){}
  h+=P.actionBar({shareUrl:pageUrl,cellUrl:"/cells",reportUrl:"/#pf-orders"});
  /* Brand integration (2026-10-06, fix 5, ported from line @ WS-A phase 2):
     cross-pillar handoffs — wired declaratively by the share-everywhere
     scanner (same branded styling). */
  h+='<div data-pf-handoff="take-cell"></div><div data-pf-handoff="report-back"></div>';
  h+='</div>';
  el.innerHTML=h;
  wire(el);
}
/* Fail-open: patterns killed -> legacy compact render. Still shielded,
   still server-weight-only, still callsign-gated. */
function renderLegacy(el){
  var id=ident();
  if(!id.callsign){
    el.innerHTML='<div class="pf-gov">'+heroHTML(null)+'<p class="gv-note">The Assembly votes on callsigns.</p></div>';
    return;
  }
  var props=(PL&&PL.proposals)||[];
  var h='<div class="pf-gov">'+heroHTML(null);
  h+='<p class="gv-note">Your ballot carries server-set weight \u2014 grows with XP, never for sale, never computed here.</p>';
  h+='<div class="gv-sec"><p class="gv-sec-t">Open ('+props.filter(function(p){return p.status==="open";}).length+')</p>';
  for(var i=0;i<props.length;i++){
    var p=props[i]; if(p.status!=="open") continue;
    var left=Number(p.closes_at||0)-Date.now();
    h+='<div class="gv-inline"><div class="gv-inline-main"><p class="gv-inline-t">'+esc(p.title)+'</p>'
      +'<p class="gv-inline-meta">'+esc(fmtLeft(left))+' \u00B7 shielded</p></div>';
    if(p.voted===true){ h+='<p class="gv-voted">\u2713 Recorded</p>'; }
    else{
      h+='<div class="gv-inline-vote">'
        +'<button type="button" class="gv-cast gv-small" data-pid="'+esc(p.id)+'" data-ch="yes">YES \u2192</button>'
        +'<button type="button" class="gv-cast gv-small" data-pid="'+esc(p.id)+'" data-ch="no">NO \u2192</button>'
        +abstainBtnHTML(p.id,true)
        +'</div>';
    }
    h+='</div>';
  }
  h+='</div>'+createHTML(null)+delegationHTML()+'</div>';
  el.innerHTML=h;
  wire(el);
}
function wire(el){
  /* --- cast a vote: REPORT-family targets. Double-click guard (audit #26):
     disable ALL targets for the proposal while the vote POST is in flight;
     re-enable only on failure (success re-renders via load()). */
  var vbs=el.querySelectorAll(".gv-cast[data-pid]");
  for(var v=0;v<vbs.length;v++){ (function(b){ b.addEventListener("click",function(){
    var pid=b.getAttribute("data-pid"), ch=b.getAttribute("data-ch");
    var pair=[];
    for(var q=0;q<vbs.length;q++){ if(vbs[q].getAttribute("data-pid")===pid) pair.push(vbs[q]); }
    for(var q2=0;q2<pair.length;q2++){ pair[q2].disabled=true; }
    var id2=ident();
    post("proposal_vote",{callsign:id2.callsign,device:id2.device,proposal_id:pid,choice:ch},function(r){
      if(r&&r.ok){
        /* Server-issued weight only — cached for the stakes line. */
        var w=parseInt(r.weight,10);
        if(isFinite(w)&&w>0){ LASTW=w; lsSet(LASTW_KEY,String(w)); }
        toast("Ballot reported. The tally stays sealed until close.");
        load();
      }
      else {
        toast((r&&r.err)||"Vote failed.");
        for(var q3=0;q3<pair.length;q3++){ pair[q3].disabled=false; }
      }
    });
  }); })(vbs[v]); }
  /* share-out gaps #8: each decided result is shareable via pf:terminal. */
  var gss=el.querySelectorAll(".gv-share");
  for(var gs=0;gs<gss.length;gs++){ (function(b){ b.addEventListener("click",function(){
    try{
      var qq=hist[Number(b.getAttribute("data-idx"))];
      if(!qq||!window.PFShareEverywhere||!window.PFShareEverywhere.terminal) return;
      var res=qq.result==="passed"?"PASSED":(qq.result==="failed"?"FAILED":"TIE");
      window.PFShareEverywhere.terminal({
        gameId:"gov-result", title:"THE ASSEMBLY DECIDED",
        result:res+" — "+String(qq.title||""),
        lines:["YES "+qq.yes_weight+" · NO "+qq.no_weight+" · "+qq.voter_count+" voters"],
        link:"/political-hq",
        host:(b.closest&&b.closest(".x-pane"))||el,
        kicker:"\u2696 THE ASSEMBLY \u2696"
      });
    }catch(e){}
  }); })(gss[gs]); }
  /* close & settle (proposal_close, AUTH+ADMIN). Past-due: any authed user.
     Early: admin only — rides the X-Admin-Secret header via adminPost. */
  function closeProposal(pid,early,btn){
    if(!window.confirm(early?"Close this proposal EARLY as admin? The result stands.":"Close and settle this proposal? The result stands.")) return;
    var id2=ident();
    btn.disabled=true; btn.textContent="CLOSING\u2026";
    var send=early?adminPost:post;
    send("proposal_close",{callsign:id2.callsign,device:id2.device,proposal_id:pid},function(r){
      if(r&&r.ok){ toast("Closed. The Assembly has spoken."); load(); }
      else {
        toast((r&&r.err)||"Close failed.");
        btn.disabled=false; btn.textContent=early?"CLOSE EARLY (ADMIN)":"CLOSE & SETTLE";
      }
    });
  }
  var cbs=el.querySelectorAll("[data-gv-close]");
  for(var c=0;c<cbs.length;c++){ (function(b){ b.addEventListener("click",function(){
    closeProposal(b.getAttribute("data-pid"),false,b);
  }); })(cbs[c]); }
  var ebs=el.querySelectorAll("[data-gv-close-early]");
  for(var e=0;e<ebs.length;e++){ (function(b){ b.addEventListener("click",function(){
    closeProposal(b.getAttribute("data-pid"),true,b);
  }); })(ebs[e]); }
  var fvb=el.querySelector("[data-gv-firstvote-go]");
  if(fvb){ fvb.addEventListener("click",function(){ lsSet(FIRSTVOTE_KEY,"1"); }); }
  var cb=el.querySelector("#gvCreateBtn");
  if(cb){ cb.addEventListener("click",function(){
    var t=document.getElementById("gvTitle").value.trim(), d=document.getElementById("gvDesc").value.trim();
    var dys=Math.max(1,Math.min(30,parseInt(document.getElementById("gvDays").value,10)||7));
    var er=document.getElementById("gvCreateErr");
    if(!t){ er.textContent="Give it a title."; return; }
    er.textContent="";
    if(!confirm("This costs 100 XP. Put it to a vote?")) return;
    var id2=ident();
    post("proposal_create",{callsign:id2.callsign,device:id2.device,title:t,description:d,duration_days:dys},function(r){
      if(r&&r.ok){ toast("On the floor. Let the people decide."); load(); }
      else { er.textContent=(r&&r.err)||"Failed."; }
    });
  }); }
  var db=el.querySelector("#gvDelegateBtn");
  if(db){ db.addEventListener("click",function(){
    var d2=document.getElementById("gvDel").value.trim().toLowerCase();
    var er=document.getElementById("gvDelErr"); if(!d2){ er.textContent="Whose judgment do you trust?"; return; }
    er.textContent="";
    var id2=ident();
    post("delegate_set",{callsign:id2.callsign,device:id2.device,delegate:d2},function(r){
      if(r&&r.ok){ toast("Vote delegated to "+d2+"."); load(); }
      else { er.textContent=(r&&r.err)||"Failed."; }
    });
  }); }
  var ub=el.querySelector("#gvUndelegate");
  if(ub){ ub.addEventListener("click",function(){
    var id2=ident();
    post("delegate_set",{callsign:id2.callsign,device:id2.device,delegate:""},function(r){
      if(r&&r.ok){ toast("Vote reclaimed."); load(); }
      else { toast((r&&r.err)||"Failed."); }
    });
  }); }
}
/* 2026-10-05 (audit #27): the 120s scheduled re-render wiped in-progress drafts
   (the new-proposal form, the delegate-callsign input). Skip the tick while
   any input/textarea in the pane is focused or holds a non-default value. */
function govHasDraft(){
  try{
    var el=document.getElementById("xGov"); if(!el) return false;
    var f=el.querySelectorAll("input,textarea");
    for(var i=0;i<f.length;i++){
      var t=f[i];
      if(t===document.activeElement) return true;
      if(t.type==="checkbox"||t.type==="radio"){ if(t.checked!==t.defaultChecked) return true; }
      else if(String(t.value)!==String(t.defaultValue)) return true;
    }
  }catch(e){}
  return false;
}
/* TEST SEAM — the verify harness drives these without a backend. */
try{
  window.PF.govTest={
    buildHTML:function(fixture,callsign){
      var keep=GOVFIX;
      GOVFIX=fixture||{proposals:[]};
      var html="";
      try{
        PL={proposals:(GOVFIX.proposals||[])}; DG=GOVFIX.delegation||null;
        XP=(GOVFIX.xp==null?null:Math.max(0,Math.floor(Number(GOVFIX.xp)||0)));
        var _id=ident; ident=function(){ return {callsign:callsign||"",device:"t"}; };
        var host={_h:"",set innerHTML(v){ this._h=String(v); },get innerHTML(){ return this._h; },
          querySelector:function(){ return null; },querySelectorAll:function(){ return []; },
          addEventListener:function(){}};
        var _gd=document.getElementById;
        document.getElementById=function(gid){ return gid==="xGov"?host:_gd.call(document,gid); };
        try{ render(); }finally{ document.getElementById=_gd; ident=_id; }
        html=host._h;
      }finally{ GOVFIX=keep; }
      return html;
    },
    tier:govTier, quorumBand:quorumBand, urgClass:urgClass, fmtLeft:fmtLeft,
    marginPct:marginPct, isNewVoter:isNewVoter, abstainSupported:ABSTAIN_SUPPORTED
  };
}catch(e){}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(govHasDraft()) return; load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
