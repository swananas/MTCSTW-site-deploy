/* games/civic.js  |  PF v1.4.3 | CIVIC ACTION: petitions, rep contact,
   voter registration, notification preferences.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals.
   KILL: ?pf_off=civic  or  localStorage pf_disabled_v1='["civic"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("civic")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-civic">
<div class="fe-block pf-override-block pf-silo" id="pf-civic">
<h2>Wage Civic Warfare</h2>
<div class="c-tag">Petitions, reps, voter registration. Power off the timeline.</div>
<div id="xCivic"><div class="c-load">Mobilizing&hellip;</div></div>
<style>
/* 2026-10-05: ballot center (Political HQ #4) — mobile-first, no horizontal
   scroll, every touch target >= 44px. */
#pf-civic .cv-t44{min-height:44px}
#pf-civic .cv-bal-cd{font-size:16px;margin:10px 0;padding:10px;border:1px solid #4a4a4a;overflow-wrap:anywhere}
#pf-civic .cv-balreg{margin:8px 0}
#pf-civic .cv-balacts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
/* 2026-10-05: cell competitions card — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-civic .cv-cmp-tog{display:flex;gap:8px;margin:8px 0}
#pf-civic .cv-cmp-tog .c-btn{flex:1;min-height:44px;padding:8px 4px}
#pf-civic .cv-cmp-tog .c-btn[aria-pressed="true"]{outline:3px solid var(--pf-cream);outline-offset:-3px}
#pf-civic .cv-cmp-row{border:1px solid #4a4a4a;padding:10px 12px;margin:8px 0;overflow-wrap:anywhere}
#pf-civic .cv-cmp-rank{display:inline-block;min-width:36px;font-weight:900;font-size:16px;color:#ffd166}
#pf-civic .cv-cmp-name{font-weight:900;font-size:15px}
#pf-civic .cv-cmp-you{border-color:#ffd166;background:rgba(255,209,102,.08)}
#pf-civic .cv-cmp-tag{display:inline-block;font-size:11px;font-weight:900;color:#0d0d0d;background:#ffd166;padding:2px 8px;margin-left:8px;vertical-align:middle}
#pf-civic .cv-cmp-win{border:1px solid #ffd166;padding:12px;margin:8px 0;background:rgba(193,18,31,.12)}
/* 2026-10-05: congressional directory — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-civic .cv-dirfilters .c-in{width:100%;box-sizing:border-box;margin-bottom:8px}
#pf-civic .cv-t44{min-height:44px}
#pf-civic .cv-cham{display:flex;gap:8px;margin:8px 0}
#pf-civic .cv-cham .c-btn{flex:1;min-height:44px;padding:8px 4px}
#pf-civic .cv-cham .c-btn[aria-pressed="true"]{outline:3px solid var(--pf-cream);outline-offset:-3px}
#pf-civic .cv-dirrow{border:1px solid #4a4a4a;padding:12px;margin:12px 0;overflow-wrap:anywhere}
#pf-civic .cv-dirname{font-weight:900;font-size:16px;margin-bottom:4px}
#pf-civic .cv-pb{display:inline-block;min-width:20px;text-align:center;font-weight:900;font-size:12px;border:1px solid var(--pf-cream);padding:1px 6px;margin-left:8px;vertical-align:middle}
#pf-civic .cv-pb-D{color:#8fbfff}#pf-civic .cv-pb-R{color:#ff8f8f}#pf-civic .cv-pb-I{color:var(--pf-muted)}
#pf-civic .cv-nv{display:inline-block;font-weight:900;font-size:11px;letter-spacing:1px;border:1px solid var(--pf-cream);padding:2px 6px;margin-left:8px;vertical-align:middle;white-space:nowrap}
#pf-civic .cv-diractions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
#pf-civic .cv-xpb{display:inline-block;font-weight:900;font-size:12px;color:#ffd166;border:1px solid #ffd166;padding:6px 10px;white-space:nowrap}
/* 2026-10-05 (rep-flow friction): secondary row actions tuck behind MORE —
   the scan path stays name > CALL/CONTACT/LOG. */
#pf-civic .cv-mored{display:inline-block}
#pf-civic .cv-mored>summary{list-style:none;display:inline-block;cursor:pointer}
#pf-civic .cv-mored>summary::-webkit-details-marker{display:none}
#pf-civic .cv-mored>summary::after{content:" \u25be"}
#pf-civic .cv-mored[open]>summary::after{content:" \u25b4"}
#pf-civic .cv-morebody{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
/* 2026-10-05: voting scorecards — mobile-first, badges readable, >=44px
   touch targets, no horizontal scroll. */
#pf-civic .cv-scdetail{margin-top:10px;border-top:2px solid #4a4a4a;padding-top:10px}
#pf-civic .cv-sc-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
#pf-civic .cv-scrow{display:flex;gap:10px;align-items:flex-start;border-top:1px solid #4a4a4a;padding:10px 0}
#pf-civic .cv-scrow:first-of-type{border-top:none}
#pf-civic .cv-scbody{flex:1;min-width:0}
#pf-civic .cv-sctitle{font-weight:700;font-size:14px;overflow-wrap:anywhere}
#pf-civic .cv-vb{display:inline-block;flex:none;font-weight:900;font-size:13px;padding:6px 8px;border:2px solid;min-width:56px;text-align:center}
#pf-civic .cv-vb-yea{color:#7dff9a;border-color:#7dff9a}
#pf-civic .cv-vb-nay{color:#ff8f8f;border-color:#ff8f8f}
#pf-civic .cv-vb-nv{color:var(--pf-muted);border-color:var(--pf-muted)}
#pf-civic .cv-sctag{min-height:44px;margin-top:8px}
#pf-civic .cv-issue{border:2px solid var(--pf-red);padding:12px;margin-bottom:12px;overflow-wrap:anywhere}
#pf-civic .cv-ir{display:grid;grid-template-columns:1fr 44px 44px 44px 64px;gap:4px;padding:8px 0;border-top:1px solid #4a4a4a;text-align:center;font-size:14px;align-items:center}
#pf-civic .cv-irh{font-weight:900;border-top:none;color:var(--pf-muted);font-size:12px}
#pf-civic .cv-ir .cv-irlabel{text-align:left;font-weight:900}
#pf-civic .cv-ir .cv-irtot{font-weight:900}
#pf-civic .cv-diractions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
#pf-civic .cv-xpb{display:inline-block;font-weight:900;font-size:12px;color:#ffd166;border:1px solid #ffd166;padding:6px 10px;white-space:nowrap}
/* 2026-10-05: call practice mode — frontend-only rehearsal overlay.
   Mobile-first: 44px+ targets, no horizontal scroll, timer pinned. */
#pfPracOv{position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;background:rgba(8,8,8,.96);overflow-y:auto;display:none;-webkit-overflow-scrolling:touch}
#pfPracOv .pfprac-card{max-width:640px;margin:0 auto;padding:16px 16px 48px;color:var(--pf-cream);box-sizing:border-box}
#pfPracOv .pfprac-top{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(8,8,8,.96);padding:12px 0;z-index:2}
#pfPracOv .pfprac-timer{font:bold 28px monospace;color:#ffd166}
#pfPracOv .pfprac-x{min-width:44px}
#pfPracOv .pfprac-h{margin:8px 0 4px}
#pfPracOv .pfprac-zero{margin:8px 0}
#pfPracOv .pfprac-tele{font-size:22px;line-height:1.5;background:#141414;border:1px solid #4a4a4a;padding:20px 16px;margin:12px 0;min-height:120px;overflow-wrap:anywhere}
#pfPracOv .pfprac-prog{text-align:center}
#pfPracOv .pfprac-row{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
#pfPracOv .pfprac-row .c-btn{flex:1;min-height:44px;box-sizing:border-box}
#pfPracOv .pfprac-big{width:100%;min-height:52px;margin:12px 0;box-sizing:border-box}
#pfPracOv .pfprac-gentle{opacity:0;transition:opacity 1.2s ease;font-size:17px;color:#ffd166;text-align:center;margin:16px 0}
#pfPracOv .pfprac-gentle.pfprac-show{opacity:1}
#pfPracOv .pfprac-warm{font-size:24px;font-weight:900;color:var(--pf-cream);margin:16px 0 8px}
</style>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){} toastLocal(m); }
/* 2026-10-05 (P2 F2-TOAST): read the Civic Duty progress AFTER the
   pf-civic-* event has been dispatched (civic-duty.js records
   synchronously), so the toast shows the count including this action.
   2026-10-05 (P2 scope fix): dutyN/dutyFrag were nested inside toast()'s
   body, so every call site outside toast() threw ReferenceError and the
   Civic Duty toast never fired. They now live at IIFE top-level. */
function dutyN(){ try{ var p=window.PF&&PF.civicDutyProgress&&PF.civicDutyProgress(); return (p&&p.count)||0; }catch(e){ return 0; } }
function dutyFrag(){ return " \ud83d\uddf3 Civic Duty: "+dutyN()+" of 3."; }
function toastLocal(m){
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCvCb"+Math.floor(Math.random()*1e9);
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
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
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
var STATES=[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]];
var P=null, REPS=null, SCRIPTS=null, VOTER=null, CREATE_OPEN=false, VSTATS=null;
/* 2026-10-05 (pledge-share-cards weave): voter-pledge share card state.
   PLEDGE_CARD holds the phq-pledge painter data built from ballot_get via
   PF.PHQShare.pledgeData — set on a successful pledge only when the ballot
   wire returns a live, non-expired deadline. PLEDGE_NOTE carries the
   fail-soft "deadline passed" copy for expired-deadline states. Card
   GENERATION pays 0 XP (the +50 pledge XP is paid by voter_pledge itself);
   card SHARING rides the existing poster_share leg (+5 fixed, NO_MULT,
   counts toward the daily cap) through the POSTER SHARE verification tab. */
var PLEDGE_DONE=false, PLEDGE_CARD=null, PLEDGE_NOTE='';
/* 2026-10-05: congressional directory state. reps_list is the only new read;
   the rep_contact write path below is shared with the legacy "Contact your
   rep" pane — no new reward mechanics. */
var DIRST={st:"",ch:"",q:"",reps:null,load:false,err:false};
var STATES_F=null; /* STATES + DC, filter-only (STATES itself untouched). */
/* 2026-10-05 (wave pressure-campaigns FE): active pressure campaigns from
   pressure_list, per-campaign script+targets via pressure_get, join state. */
var PC_LIST=null, PC_SCRIPT={}, PC_TITLE={}, PC_JOINED={};
/* 2026-10-05 (P2 F2-TOAST): petitions signed this session render a
   post-sign SHARE IT button — the share ask follows the action (W18). */
var PET_SHARE_AFTER={}, PET_TITLE={};
/* 6A-R7: voter-pledge poster state — set on a successful pledge. */
var PLEDGE_DONE=false, PLEDGE_STATE_NAME='';
/* Network Polls (2026-10-05, interactive expansion #3): poll list/detail
   cache, create-form state, per-poll voted state (client-side +
   localStorage so a refresh keeps it; the API's has_voted is the
   server-side half). */
var POLLS_OPEN=null, POLLS_CLOSED=null, POLLS_ERR=false, POLLS_CREATE_OPEN=false,
    POLLS_CREATE_OPTS=2, POLLS_DETAIL={}, POLLS_FETCHING={},
    POLLS_DRAFT={q:"",opts:[],kind:"general",dur:"3",bill:""};
function pledgeStateName(code){
  for(var i=0;i<STATES.length;i++) if(STATES[i][0]===code) return STATES[i][1];
  return code||'';
}
/* After a successful voter_pledge: resolve the ballot row for the state and
   arm the SHARE YOUR PLEDGE button with real deadline data. Fail-soft at
   every step — the pledge itself always stands:
     - ?pf_off=card-pledge or no PHQShare module -> button stays disarmed
     - ballot_get fails/missing row -> button stays disarmed (no invented dates)
     - expired deadline -> PLEDGE_NOTE "deadline passed", no card
     - same-day (NULL deadline) -> armed with the at-the-polls variant */
function armPledgeCard(stCode){
  PLEDGE_CARD=null; PLEDGE_NOTE='';
  var done=function(){ try{ render(); }catch(e){} };
  try{
    if(PF&&PF.skip('card-pledge')){ done(); return; }
    if(!(window.PF&&PF.PHQShare&&PF.PHQShare.pledgeData)){ done(); return; }
  }catch(e){ done(); return; }
  api("ballot_get",{state:stCode},function(b){
    try{
      var row=(b&&b.ok&&b.ballot)||null;
      if(!row){ done(); return; } /* ballot wire down — pledge stands, card paused */
      var data=PF.PHQShare.pledgeData(row);
      if(!data){
        PLEDGE_NOTE='Registration has closed in '+pledgeStateName(stCode)+
          ' — the deadline passed. Your pledge still counts: vote Nov 3.';
        done(); return;
      }
      /* vote.gov link: ballot register_url first, voter_check URL as fallback. */
      if(!data.registerUrl&&VOTER&&VOTER.url) data.registerUrl=VOTER.url;
      PLEDGE_CARD=data;
    }catch(e){}
    done();
  });
}
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=8) fin(); }
  setTimeout(fin,15000);
  api("petition_list",{},function(j){ P=j; one(); });
  api("rep_list",{},function(j){ REPS=j; one(); });
  api("rep_scripts",{},function(j){ SCRIPTS=j; one(); });
  /* 2026-10-03: voter_pledge_stats (public) — aggregate pledge counts. */
  api("voter_pledge_stats",{},function(j){ VSTATS=j; one(); });
  /* 2026-10-05 (wave pressure-campaigns FE): active campaigns. Fail-soft —
     a down wire or zero campaigns hides the pane entirely (render skips it). */
  api("pressure_list",{},function(j){ PC_LIST=(j&&j.ok&&j.campaigns)||[]; one(); });
  /* 2026-10-05: network polls — open list is the contract call; closed
     list is best-effort (backend may not serve status=closed). */
  api("polls_list",{status:"open"},function(j){
    if(j&&j.ok){ POLLS_OPEN=j; } else { POLLS_ERR=true; POLLS_OPEN=null; }
    one();
  });
  api("polls_list",{status:"closed"},function(j){
    POLLS_CLOSED=(j&&j.ok)?j:null;
    one();
  });
  one();
}
/* 2026-10-05 (audit #7): sign/create used to trigger a full load() — 5 reads
   plus re-render plus the contact-history JSONP refire in bind(). The only
   pane those actions mutate is the petitions list: one petition_list read,
   then re-render from cache. */
function refreshPetitions(){
  api("petition_list",{},function(j){ P=j; try{ render(); }catch(e){} });
}
var HIST_DONE=false;
/* 2026-10-05 (audit #7): contact-history paint, split out so the log box can
   refresh without a full re-render. Fetched once per page view (fetchHist);
   LOG CONTACT — the only action that mutates the log — refreshes it
   explicitly instead of every sign/pledge/create refiring it. */
function paintHist(box,hist){
  if(!hist.length){ box.innerHTML='<div class="x-note">No contacts logged yet. Your first call is +25 XP.</div>'; return; }
  var hh='<div class="x-note" style="margin-top:6px"><b>Your contact log:</b></div>';
  for(var i=0;i<Math.min(hist.length,5);i++){
    var e=hist[i], dt="";
    try{ dt=new Date(Number(e.ts)).toLocaleDateString(); }catch(ee){}
    hh+='<div class="x-note">'+esc(e.rep_name||"rep")+' — '+esc(e.method||"")+(dt?" — "+esc(dt):"")+'</div>';
  }
  box.innerHTML=hh;
}
function fetchHist(force){
  var box=document.getElementById("cvHistBox"); if(!box) return;
  if(HIST_DONE&&!force) return;
  var id2=ident(); if(!id2.callsign){ box.innerHTML=""; return; }
  HIST_DONE=true;
  var pp={callsign:id2.callsign};
  function cb2(j){
    var b2=document.getElementById("cvHistBox");
    if(!b2){ HIST_DONE=false; return; }
    if(!(j&&j.ok)){ HIST_DONE=false; return; } /* failed — retry on next bind */
    paintHist(b2,j.history||[]);
  }
  try{ if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,"rep_contact_history",pp,cb2); return; } }catch(e){}
  api("rep_contact_history",pp,cb2);
}
/* ============ PRESSURE CAMPAIGNS (2026-10-05, wave pressure-campaigns FE) ============
   One card per active campaign: title, target bill (+ congress.gov link when
   the bill text carries one), days remaining, call script with copy button,
   tap-to-call target members with LOG CALL buttons, live participant/call
   counters, share, and JOIN THE PRESSURE -> pressure_join.
   FAIL-SOFT: if the API is down or returns no campaigns, pressurePaneHTML()
   returns "" and the section never mounts. No broken widget, no stuck
   spinner. No invented data — everything rendered comes from the API. */
function pcCountersHTML(c){
  return '<b>'+(Number(c.participant_count)||0)+'</b> in &bull; <b>'+(Number(c.call_count)||0)+'</b> calls logged';
}
function pcBillHTML(tb){
  tb=String(tb==null?"":tb); if(!tb) return "";
  /* Extract the first https URL for the congress.gov link; the label is the
     text with the URL stripped. */
  var m=tb.match(/https?:\\/\\/[^\\s<>"']+/);
  var label=m?tb.replace(m[0],"").replace(/\s{2,}/g," ").trim():tb;
  var h='<div class="x-note">Target bill: <b>'+esc(label||tb)+'</b>';
  if(m){ h+=' &bull; <a href="'+esc(m[0])+'" target="_blank" rel="noopener">congress.gov \u2192</a>'; }
  return h+'</div>';
}
function pcDaysHTML(c){
  var d=null;
  try{
    var t=new Date(c.ends_at).getTime();
    if(!isNaN(t)) d=Math.max(0,Math.ceil((t-Date.now())/864e5));
  }catch(e){}
  if(d==null&&c.days_remaining!=null&&c.days_remaining!=="") d=Math.max(0,Number(c.days_remaining)||0);
  if(d==null) return "";
  return '<div class="x-note">'+(d===0?'<b>Last day</b> to call.':'<b>'+d+'</b> day'+(d===1?"":"s")+' left to call.')+'</div>';
}
function pressurePaneHTML(){
  /* Fail-soft: nothing to render -> no section at all. */
  if(!(PC_LIST&&PC_LIST.length)) return "";
  var h='<div class="x-pane" id="cvPcPane"><h4>Pressure campaigns</h4>'
    +'<div class="c-tag">Call blitzes on live bills. Read the script, ring the office, log the call.</div>';
  for(var i=0;i<PC_LIST.length;i++){
    var c=PC_LIST[i]||{}, cid=String(c.id||"");
    if(!cid) continue;
    PC_TITLE[cid]=c.title||"A Propaganda Factory pressure campaign";
    h+='<div class="cp-mission" data-pc-card>'
      +'<div class="cp-mtext">'+esc(c.title||"Pressure campaign")+'</div>'
      +pcBillHTML(c.target_bill)
      +pcDaysHTML(c)
      +'<div class="x-note" data-pc-counts="'+esc(cid)+'">'+pcCountersHTML(c)+'</div>'
      +'<div data-pc-body="'+esc(cid)+'"><div class="c-load">Loading campaign&hellip;</div></div>'
      +'<button class="c-btn cp-mbtn" data-pc-join="'+esc(cid)+'"'+(PC_JOINED[cid]?" disabled":"")+'>'+(PC_JOINED[cid]?"YOU&rsquo;RE IN":"JOIN THE PRESSURE")+'</button> '
      /* 2026-10-05 (P10 W18): the share ask follows the action — SHARE
         renders only after join, never on the un-joined card. */
      +'<button class="c-btn cp-mbtn" data-pc-share="'+esc(cid)+'"'+(PC_JOINED[cid]?"":' style="display:none"')+'>SHARE</button>'
      +'</div>';
  }
  return h+'</div>';
}
/* Two-tier clipboard (navigator.clipboard first, hidden-textarea
   execCommand fallback) — same pattern as ammo.js. iOS-safe. */
function pcCopyText(txt,btn,msg){
  function doneOk(){
    toast(msg||"Copied.");
    if(btn){ var o=btn.textContent; btn.textContent="COPIED"; btn.disabled=true;
      setTimeout(function(){ btn.textContent=o; btn.disabled=false; },1500); }
  }
  function fallback(){
    try{
      var ta=document.createElement("textarea"); ta.value=txt;
      ta.style.cssText="position:fixed;opacity:0";
      ta.setAttribute("readonly","");
      document.body.appendChild(ta); ta.select();
      try{ ta.setSelectionRange(0,ta.value.length); }catch(e){}
      document.execCommand("copy"); ta.remove(); doneOk();
    }catch(e2){ toast("Copy failed \u2014 select it manually."); }
  }
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(doneOk,function(){ fallback(); }); }
    else fallback();
  }catch(e){ fallback(); }
}
function pcFindBody(cid){
  var nodes=document.querySelectorAll("[data-pc-body]");
  for(var i=0;i<nodes.length;i++){ if(nodes[i].getAttribute("data-pc-body")===cid) return nodes[i]; }
  return null;
}
function pcPaintCard(cid,j){
  var body=pcFindBody(cid); if(!body) return;
  var c=(j&&j.ok&&j.campaign)||null;
  if(!c){
    body.innerHTML='<div class="x-note">Campaign details are unavailable right now \u2014 check back shortly.</div>';
    return;
  }
  PC_SCRIPT[cid]=c.script||"";
  var h='<div class="pf-mt"><div class="x-note"><b>Call script</b></div>'
    +'<div class="x-note" style="white-space:pre-wrap">'+esc(c.script||"")+'</div>'
    +'<button class="c-btn cp-mbtn" data-pc-copy="'+esc(cid)+'">COPY SCRIPT</button></div>';
  var ms=c.target_members||[];
  if(ms.length){
    h+='<div class="x-note pf-mt"><b>Targets \u2014 tap to call:</b></div>';
    for(var i=0;i<ms.length;i++){
      var m=ms[i]||{};
      var tel=String(m.phone||"").replace(/[^0-9+]/g,"");
      var badge="";
      if(m.party&&m.state) badge=String(m.party)+" \u00b7 "+String(m.state);
      else if(m.party||m.state) badge=String(m.party||m.state);
      var mname=String(m.name||"Member");
      h+='<div class="cp-mission" style="margin-top:8px">'
        +'<div class="cp-mtext">'+esc(mname)+'</div>'
        +'<div class="x-note">'+esc(String(m.role||""))+(badge?" &bull; "+esc(badge):"")+'</div>'
        +(tel?'<a class="c-btn cp-mbtn" href="tel:'+esc(tel)+'">'+esc(String(m.phone||tel))+'</a> ':'')
        +'<button class="c-btn cp-mbtn" data-pc-log="'+esc(cid)+"|"+esc(mname)+'">LOG CALL (+25 XP)</button>'
        +'</div>';
    }
  }
  body.innerHTML=h;
  /* Per-card bindings happen here, not in bind(): pressure_get resolves
     after bind() already ran, so bind-on-paint is the only correct spot. */
  var bb=body.querySelectorAll("[data-pc-copy]");
  for(var b2=0;b2<bb.length;b2++){ (function(btn){ btn.onclick=function(){
    pcCopyText(PC_SCRIPT[btn.getAttribute("data-pc-copy")]||"",btn,"Script copied. Go make the call.");
  }; })(bb[b2]); }
  var lb=body.querySelectorAll("[data-pc-log]");
  for(var l2=0;l2<lb.length;l2++){ (function(btn){ btn.onclick=function(){
    var v=btn.getAttribute("data-pc-log"), pi=v.indexOf("|");
    var cid2=v.slice(0,pi), mname=v.slice(pi+1);
    btn.disabled=true;
    /* Extended rep_contact POST: the backend accepts an optional campaign
       param, passed here so the call is attributed to the campaign. */
    post("rep","r_action","rep_contact",{callsign:ident().callsign,rep_name:mname,method:"call",script_used:"pressure:"+cid2,campaign:cid2},function(j){
      /* 2026-10-05 (P2 F2-TOAST): a campaign call is a rep contact — it
         feeds Civic Duty. Record first so the toast shows the new count. */
      if(j&&j.ok){ try{ document.dispatchEvent(new CustomEvent('pf-civic-rep-contacted')); }catch(e){}
        toast("Logged \u2014 +25 XP."+dutyFrag()); fetchHist(true);
        /* 2026-10-05 (P10 W18): share ask AFTER the logged call, never
           before the effort. Transient — next card repaint clears it. */
        try{ if(btn.parentNode&&!btn.parentNode.querySelector("[data-pc-tell]")){
          var tb=document.createElement("button"); tb.type="button";
          tb.className="c-btn cp-mbtn"; tb.setAttribute("data-pc-tell","1");
          tb.textContent="Tell the network \u2192";
          tb.onclick=function(){ pcShare(cid2); };
          btn.parentNode.insertBefore(tb,btn.nextSibling); } }catch(e2){} }
      /* 2/day cap: the backend surfaces the 'cap' code, routed through the
         shared friendly-copy mapper (resets at midnight Chicago). */
      else { toast(PF.errCopy(j,"Log failed.")); }
      btn.disabled=false;
    });
  }; })(lb[l2]); }
}
function pcRefreshCounts(){
  /* Re-poll pressure_list for live participant/call counters only — the
     rendered cards (script/targets from pressure_get) are left untouched. */
  api("pressure_list",{},function(j){
    if(!(j&&j.ok&&j.campaigns)) return;
    var nodes=document.querySelectorAll("[data-pc-counts]");
    for(var i=0;i<j.campaigns.length;i++){
      var c=j.campaigns[i]||{}, cid=String(c.id||"");
      for(var k=0;k<nodes.length;k++){
        if(nodes[k].getAttribute("data-pc-counts")===cid){ nodes[k].innerHTML=pcCountersHTML(c); break; }
      }
    }
  });
}
function pcShare(cid){
  var title=PC_TITLE[cid]||"A Propaganda Factory pressure campaign";
  var link="https://www.mtcstw.com/political-hq";
  try{ if(window.PF&&typeof PF.shareUrl==="function") link=PF.shareUrl(link); }catch(e){}
  var text=title+" \u2014 join the pressure at "+link;
  /* Site share convention: navigator.share when available, clipboard
     fallback — same two-tier pattern as do-meter/fan-vote text shares. */
  if(navigator.share){ try{ navigator.share({title:title,text:text}).catch(function(){}); return; }catch(e){} }
  pcCopyText(text,null,"Share text copied. Spread it.");
}
function pressureBind(qsa){
  if(!(PC_LIST&&PC_LIST.length)) return;
  for(var i=0;i<PC_LIST.length;i++){
    (function(cid){
      if(!cid) return;
      /* Per-card script + targets (pressure_get). Fail-soft per card. */
      api("pressure_get",{id:cid},function(j){ pcPaintCard(cid,j); });
    })(String((PC_LIST[i]||{}).id||""));
  }
  /* COPY SCRIPT and LOG CALL buttons are painted by the async pressure_get
     and bound there at paint time (pcPaintCard); join/share buttons are in
     the synchronous card shell, bound here. */
  qsa("[data-pc-join]").forEach(function(b){
    b.onclick=function(){
      var cid=b.getAttribute("data-pc-join");
      if(PC_JOINED[cid]) return;
      b.disabled=true;
      post("pressure","pr_action","pressure_join",{callsign:ident().callsign,id:cid},function(j){
        if(j&&j.ok){ PC_JOINED[cid]=1; b.innerHTML="YOU&rsquo;RE IN"; pcRefreshCounts();
          /* 2026-10-05 (P10 W18): reveal the post-join SHARE affordance. */
          try{ var card=b.closest?b.closest("[data-pc-card]"):null;
            var sh=card?card.querySelector("[data-pc-share]"):null;
            if(sh) sh.style.display=""; }catch(e){} }
        else { toast(PF.errCopy(j,"Join failed.")); b.disabled=false; }
      });
    };
  });
  qsa("[data-pc-share]").forEach(function(b){
    b.onclick=function(){ pcShare(b.getAttribute("data-pc-share")); };
  });
}
function stateOpts(sel){
  var h='<option value="">Select state&hellip;</option>';
  for(var i=0;i<STATES.length;i++){
    h+='<option value="'+STATES[i][0]+'"'+(sel===STATES[i][0]?' selected':'')+'>'+esc(STATES[i][1])+'</option>';
  }
  return h;
}
/* --- ballot center (2026-10-05, Political HQ #4): state-keyed election
   dates from the ballot_get wire. READ-ONLY — no XP, no write path.
   Renders ONLY what the API returns; NULL/missing fields fall back to
   "Check your state site" + the official link, never invented data.
   Countdowns reflect real ISO dates vs the viewer's local today only. */
var BAL={st:"",rows:null,load:false,err:false};
var STATES50=null; /* STATES + DC, filter-only (STATES itself untouched). */
function ballotStates(){
  if(!STATES50) STATES50=STATES.concat([["DC","District of Columbia"]]);
  return STATES50;
}
function ballotStateOpts(sel){
  var st=ballotStates(), h='<option value="">Pick your state&hellip;</option>';
  for(var i=0;i<st.length;i++){
    h+='<option value="'+st[i][0]+'"'+(sel===st[i][0]?' selected':'')+'>'+esc(st[i][1])+'</option>';
  }
  return h;
}
var BAL_MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* Parse an ISO date ("2026-10-19") as LOCAL midnight — new Date("2026-10-19")
   is UTC midnight and would drift a day behind for US timezones. */
function balDate(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||""));
  if(!m) return null;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
}
function balFmt(iso){
  var d=balDate(iso); if(!d) return "";
  return BAL_MONTHS[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();
}
/* Whole calendar days from local-today start to the deadline. Positive =
   days left, 0 = today, negative = passed. */
function balDaysLeft(iso){
  var d=balDate(iso); if(!d) return null;
  var now=new Date(); now.setHours(0,0,0,0);
  return Math.round((d.getTime()-now.getTime())/86400000);
}
function balFind(code){
  if(!BAL.rows) return null;
  for(var i=0;i<BAL.rows.length;i++){ if(String(BAL.rows[i].state)===code) return BAL.rows[i]; }
  return null;
}
/* Normalize the ballot_get&all=1 payload — accept the record list under
   whichever key the backend ships (rows/ballots/states), never assume. */
function balRows(j){
  if(!j||!j.ok) return null;
  var cands=[j.rows,j.ballots,j.states];
  for(var i=0;i<cands.length;i++){
    if(cands[i]&&typeof cands[i].length==="number") return cands[i];
  }
  return null;
}
function ballotDeadlineHTML(row){
  var nm=esc(row.state_name||row.state||"your state");
  if(!row.registration_deadline){
    /* NULL deadline = same-day registration (backend notes explain). */
    return '<div class="cv-bal-cd"><b>Same-day registration available</b> in '+nm+'.</div>'
      +(row.notes?'<div class="x-note">'+esc(row.notes)+'</div>':"");
  }
  var left=balDaysLeft(row.registration_deadline), dstr=balFmt(row.registration_deadline);
  if(left===null){
    return '<div class="cv-bal-cd">Registration deadline in '+nm+': check the date on the state site.</div>';
  }
  if(left<0) return '<div class="cv-bal-cd"><b>Registration has closed</b> in '+nm+' (deadline was '+esc(dstr)+'). You may still have options &mdash; check the state site.</div>';
  if(left===0) return '<div class="cv-bal-cd"><b>TODAY is the last day</b> to register in '+nm+'.</div>';
  return '<div class="cv-bal-cd"><b>'+left+' day'+(left===1?"":"s")+' left</b> to register in '+nm+' ('+esc(dstr)+').</div>';
}
/* Every outbound link: the state's own URL from the API, new tab, no
   opener — never a PF-wrapped or invented URL. */
function ballotLink(label,url){
  if(!url) return "";
  return '<a class="c-btn cv-t44" href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(label)+'</a>';
}
function ballotFallback(label,url){
  var h='<div class="x-note">'+esc(label)+': check your state site';
  if(url) h+=' &mdash; <a href="'+esc(url)+'" target="_blank" rel="noopener">official link</a>';
  return h+'.</div>';
}
function ballotBoxHTML(){
  if(BAL.err){
    return '<div class="c-err">Couldn&rsquo;t reach the ballot wire.</div>'
      +'<button type="button" class="c-btn cv-t44" id="cvBalRetry">RETRY</button>';
  }
  if(BAL.load||BAL.rows===null) return '<div class="c-load">Mobilizing&hellip;</div>';
  if(!BAL.st) return '<div class="x-note">Pick your state for deadlines, early voting dates, and your polling place.</div>';
  var row=balFind(BAL.st);
  if(!row) return '<div class="x-note">No ballot data for that state yet &mdash; check your state site.</div>';
  var nm=esc(row.state_name||row.state||"");
  var h='<div><div class="x-note" style="margin-top:8px"><b>'+nm+'</b></div>';
  h+=ballotDeadlineHTML(row);
  /* Register — official state URL only, clearly labeled as official. */
  if(row.register_url){
    h+='<div class="cv-balreg">'+ballotLink("REGISTER TO VOTE",row.register_url)+'</div>'
      +'<div class="x-note">Opens '+nm+'&rsquo;s <b>official</b> registration site in a new tab.</div>';
  } else {
    h+=ballotFallback("Registration link",row.ballot_info_url);
  }
  /* Early voting. */
  if(row.early_voting_start||row.early_voting_end){
    var ev=balFmt(row.early_voting_start);
    if(row.early_voting_end) ev+=(ev?" &ndash; ":"")+balFmt(row.early_voting_end);
    h+='<div class="x-note"><b>Early voting:</b> '+ev+'</div>';
  } else {
    h+=ballotFallback("Early voting dates",row.ballot_info_url||row.register_url);
  }
  /* Election day: the API value; the Nov 3, 2026 general is the fallback. */
  h+='<div class="x-note"><b>Election day:</b> '+(balFmt(row.election_day)||"Nov 3, 2026")+'</div>';
  /* Polling place + ballot info. */
  var links=ballotLink("FIND MY POLLING PLACE",row.polling_place_url)
    +(row.polling_place_url&&row.ballot_info_url?" ":"")
    +ballotLink("BALLOT INFO",row.ballot_info_url);
  if(links) h+='<div class="cv-balacts">'+links+'</div>';
  else h+=ballotFallback("Polling place & ballot info",null);
  if(row.notes&&row.registration_deadline) h+='<div class="x-note">'+esc(row.notes)+'</div>';
  h+='</div>';
  return h;
}
function paintBallot(){
  var box=document.getElementById("cvBalBox"); if(!box) return;
  box.innerHTML=ballotBoxHTML();
}
function fetchBallot(){
  BAL.load=true; BAL.err=false; paintBallot();
  /* all=1: one read, cached — state switches then paint from cache with no
     per-selection round-trip (mobile-friendly). */
  api("ballot_get",{all:1},function(j){
    BAL.load=false;
    var rows=balRows(j);
    if(rows){ BAL.rows=rows; BAL.err=false; }
    else { BAL.err=true; }
    paintBallot();
  });
}
/* --- cell-vs-cell civic competitions (2026-10-05) ---
   Public GET reads (cellcomp_current + cellcomp_history). Fail-soft: the
   card stays hidden until cellcomp_current lands ok — never an error
   widget. campaign_calls returns metric_live:false until the
   pressure-campaign build ships: "coming soon" placeholder, never broken.
   winner_bonus is null (CEO decision 2026-10-05) — no bonus copy anywhere. */
var COMP={metric:"rep_contacts",cur:{},load:{},hist:null,histDone:false};
function compUnit(metric){
  if(metric==="campaign_calls") return "campaign calls";
  return "rep contacts";
}
function compMetricLabel(metric){
  if(metric==="campaign_calls") return "Pressure-campaign calls";
  return "Rep contacts";
}
function compWeekDate(wk){
  var d=String(wk||"").slice(0,10);
  try{
    var s=new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
    if(s&&s!=="Invalid Date") return s;
  }catch(e){}
  return d;
}
function compWinnerHTML(cur){
  var w=cur.last_winner;
  if(!(w&&(w.cell_name||w.cell_id))) return "";
  return '<div class="cv-cmp-win"><b>&#127942; Last week&#8217;s champion:</b> '
    +esc(w.cell_name||w.cell_id)+' &mdash; '+Number(w.cnt||0)+' '+esc(compUnit(cur.metric))
    +'<div class="x-note">Week of '+esc(compWeekDate(w.week_start))+'</div></div>';
}
function compMyLine(cur){
  var mc=cur.my_cells||[];
  if(!mc.length) return "";
  var unit=esc(compUnit(cur.metric));
  var bits=[];
  for(var i=0;i<mc.length;i++){
    var m=mc[i], nm=String(m.name||m.cell_id);
    bits.push("<b>"+esc(nm)+"</b>"+(m.rank?(" &mdash; #"+Number(m.rank)):" &mdash; not on the board yet")
      +" ("+Number(m.cnt||0)+" "+unit+")");
  }
  return '<div class="x-note">Your cell'+(bits.length>1?"s":"")+": "+bits.join(" &middot; ")+"</div>";
}
function compStandingsHTML(cur){
  var metric=cur.metric||COMP.metric;
  var unit=compUnit(metric);
  if(!cur.metric_live){
    return '<div class="x-note">Campaign-call tracking goes live when pressure campaigns ship. '
      +'The rep-contact race is live now &mdash; switch the toggle.</div>';
  }
  var rows=cur.standings||[];
  if(!rows.length){
    return '<div class="x-note">No '+esc(unit)+' logged this week yet. Your cell could take the lead.</div>';
  }
  var mine={};
  var mc=cur.my_cells||[];
  for(var i=0;i<mc.length;i++){ mine[String(mc[i].cell_id)]=1; }
  var h="";
  for(var r=0;r<rows.length;r++){
    var row=rows[r], you=mine[String(row.cell_id)];
    h+='<div class="cv-cmp-row'+(you?" cv-cmp-you":"")+'">'
      +'<span class="cv-cmp-rank">#'+(r+1)+'</span> '
      +'<span class="cv-cmp-name">'+esc(row.name||row.cell_id)+'</span>'
      +(you?'<span class="cv-cmp-tag">YOUR CELL</span>':"")
      +'<div class="x-note">'+Number(row.cnt||0)+' '+esc(unit)
      +' &middot; '+Number(row.members||0)+' members</div>'
      +'</div>';
  }
  return h;
}
function compHistHTML(){
  var wins=(COMP.hist&&COMP.hist.winners)||[];
  if(!wins.length) return "";
  var h='<div class="x-note" style="margin-top:8px"><b>Past champions:</b></div>';
  for(var i=0;i<Math.min(wins.length,16);i++){
    var w=wins[i];
    h+='<div class="x-note">'+esc(compWeekDate(w.week_start))+" &mdash; "+esc(compMetricLabel(w.metric))
      +': <b>'+esc(w.cell_name||w.cell_id)+"</b> ("+Number(w.cnt||0)+")</div>";
  }
  return h;
}
function compCardHTML(){
  var cur=COMP.cur[COMP.metric];
  if(!(cur&&cur.ok)) return "";
  var days=Number(cur.days_remaining||0);
  var h='<div class="x-pane"><h4>Cell competitions</h4>'
    +'<div class="x-note">Which cell logs the most civic action this week? Live standings below.</div>'
    +'<div class="cv-cmp-tog" role="group" aria-label="Competition metric">'
    +'<button type="button" class="c-btn" data-comp-metric="rep_contacts" aria-pressed="'
    +(COMP.metric==="rep_contacts"?"true":"false")+'">REP CONTACTS</button>'
    +'<button type="button" class="c-btn" data-comp-metric="campaign_calls" aria-pressed="'
    +(COMP.metric==="campaign_calls"?"true":"false")+'">CAMPAIGN CALLS</button>'
    +'</div>'
    +'<div class="x-note"><b>'+days+'</b> day'+(days===1?"":"s")+' left this week.</div>'
    +compWinnerHTML(cur)
    +compMyLine(cur)
    +'<div id="cvCompStand">'+compStandingsHTML(cur)+'</div>'
    +compHistHTML()
    +'</div>';
  return h;
}
function paintComp(){
  var box=document.getElementById("cvCompBox"); if(!box) return;
  box.innerHTML=compCardHTML();
}
function fetchComp(){
  var m=COMP.metric;
  if(COMP.cur[m]||COMP.load[m]){ paintComp(); }
  else{
    COMP.load[m]=true;
    var pp={metric:m};
    var idc=ident(); if(idc.callsign) pp.callsign=idc.callsign;
    /* api() drops null/"" params; callsign rides only when present. */
    api("cellcomp_current",pp,function(j){
      COMP.load[m]=false;
      if(j&&j.ok){ COMP.cur[m]=j; paintComp(); }
      /* fail-soft: on error the box stays empty — no error widget. */
    });
  }
  if(!COMP.histDone){
    COMP.histDone=true;
    api("cellcomp_history",{},function(j){
      if(j&&j.ok){ COMP.hist=j; paintComp(); }
      else { COMP.histDone=false; } /* failed — retry on next bind */
    });
  }
}
/* --- congressional directory helpers (2026-10-05) --- */
function dirStateOpts(sel){
  if(!STATES_F) STATES_F=STATES.concat([["DC","District of Columbia"]]);
  var h='<option value="">All states</option>';
  for(var i=0;i<STATES_F.length;i++){
    h+='<option value="'+STATES_F[i][0]+'"'+(sel===STATES_F[i][0]?' selected':'')+'>'+esc(STATES_F[i][1])+'</option>';
  }
  return h;
}
function partyBadge(party){
  var t=String(party||"").trim().toUpperCase();
  var l=t.charAt(0);
  if(l==="D"||l==="R"||l==="I") return '<span class="cv-pb cv-pb-'+l+'">'+l+'</span>';
  return t?'<span class="cv-pb cv-pb-I">'+esc(t.slice(0,3))+'</span>':"";
}
function dirRowHTML(r){
  var nm=String(r.name||"").trim()||"Unnamed";
  var ch=String(r.chamber||"").toLowerCase();
  var chLabel=ch==="senate"?"Senator":ch==="house"?"Rep":"";
  var loc=esc(String(r.state||""));
  if(ch==="house"&&r.district) loc+=" &middot; District "+esc(String(r.district));
  var phone=String(r.phone||"").trim();
  /* tel: href sanitized to dial-safe chars; display keeps the API string. */
  var telHref=phone?("tel:"+phone.replace(/[^0-9+().\-]/g,"")):"";
  var curl=String(r.contact_form||r.url||"").trim();
  /* CEO directive 2026-10-05: non-voting delegates (voting===false) get a
     visible label. Fail-soft: rows without the field render exactly as
     before (strict === false, so true/absent/undefined => no label). */
  var nvLabel=(r.voting===false?'<span class="cv-nv">NON-VOTING DELEGATE</span>':"");
  var h='<div class="cv-dirrow">'
    +'<div class="cv-dirname">'+esc(nm)+partyBadge(r.party)+nvLabel+'</div>'
    +'<div class="x-note">'+(chLabel?esc(chLabel)+" &middot; ":"")+loc+'</div>'
    +'<div class="cv-diractions">';
  if(telHref) h+='<a class="c-btn cv-t44" href="'+esc(telHref)+'">CALL</a>';
  else h+='<span class="x-note">no phone listed</span>';
  if(curl) h+=' <a class="c-btn cv-t44" href="'+esc(curl)+'" target="_blank" rel="noopener">CONTACT</a>';
  /* +25 XP badge rides next to LOG CONTACT (CEO requirement 2026-10-05) —
     the reward is surfaced, not new. */
  h+=' <button type="button" class="c-btn cv-t44" data-dir-log="'+esc(nm)+'">LOG CONTACT</button>'
    +'<span class="cv-xpb">+25 XP</span>';
  /* 2026-10-05 (rep-flow friction): secondary row actions tuck behind MORE —
     the scan path is name > CALL/CONTACT/LOG, not five equal buttons. */
  var moreBtns="";
  /* 2026-10-05: voting scorecards — expandable member detail keyed by
     bioguide_id. Rows without the key get no button (fail-soft). */
  var bio=scKey(r);
  if(bio) moreBtns+=' <button type="button" class="c-btn cv-t44" data-sc-toggle="'+esc(bio)+'">'
    +(SCST.open===bio?"HIDE SCORECARD":"SCORECARD")+'</button>';
  /* 2026-10-05: call practice mode — rehearsal entry point per row.
     Practice earns zero XP (stated in the overlay); the real call logs
     through the same doLogContact() path as LOG CONTACT. */
  moreBtns+=' <button type="button" class="c-btn cv-t44" data-dir-practice="'+esc(nm)+'" data-dir-phone="'+esc(telHref)+'">PRACTICE FIRST</button>';
  if(moreBtns) h+=' <details class="cv-mored"><summary class="c-btn cv-t44">MORE</summary><div class="cv-morebody">'+moreBtns+'</div></details>';
  h+='</div>';
  if(bio&&SCST.open===bio) h+=scDetailHTML(bio);
  h+='</div>';
  return h;
}
function dirListHTML(){
  if(DIRST.err){
    return '<div class="c-err">Couldn&rsquo;t reach the directory wire.</div>'
      +'<button type="button" class="c-btn cv-t44" id="cvDirRetry">RETRY</button>';
  }
  /* Mobilizing fallback pattern, matching the rest of the silo. */
  if(DIRST.load||DIRST.reps===null) return '<div class="c-load">Mobilizing&hellip;</div>';
  var q=String(DIRST.q||"").trim().toLowerCase();
  var reps=DIRST.reps.slice();
  /* Client re-sort fallback (server already sorts state ASC, name ASC). */
  reps.sort(function(a,b){
    var sa=String(a.state||""), sb=String(b.state||"");
    if(sa<sb) return -1; if(sa>sb) return 1;
    var na=String(a.name||"").toLowerCase(), nb=String(b.name||"").toLowerCase();
    if(na<nb) return -1; if(na>nb) return 1; return 0;
  });
  if(q) reps=reps.filter(function(r){ return String(r.name||"").toLowerCase().indexOf(q)!==-1; });
  if(!reps.length) return '<div class="x-note">No members match those filters. Broaden the hunt.</div>';
  /* 2026-10-05 (rep-flow friction): a count line so the list scans as
     "your reps", not an endless dump. */
  var h='<div class="x-note">'+reps.length+' member'+(reps.length===1?"":"s")
    +(DIRST.st?" in "+esc(String(DIRST.st).toUpperCase()):" nationwide")
    +(DIRST.ch?" · "+esc(DIRST.ch):"")+'.</div>';
  for(var i=0;i<reps.length;i++) h+=dirRowHTML(reps[i]);
  return h;
}
function paintDir(){
  var l=document.getElementById("cvDirList"); if(!l) return;
  l.innerHTML=dirListHTML();
}
function fetchDir(){
  DIRST.load=true; DIRST.err=false;
  paintDir();
  /* api() drops null/"" params, so empty filters = unfiltered list. */
  api("reps_list",{state:DIRST.st,chamber:DIRST.ch},function(j){
    DIRST.load=false;
    if(j&&j.ok&&j.reps){ DIRST.reps=j.reps; DIRST.err=false; }
    else { DIRST.err=true; }
    paintDir();
  });
}
/* --- voting scorecards (2026-10-05) ---
   Backend contract (be/congress-scorecards, parallel build — developed
   against the documented shape, verify against the real branch before ship):
     scorecard_get?bioguide_id=X ->
       {ok, bioguide_id, votes:[{vote_id, position, issue_tag, question,
                                bill_title, vote_date, result}]}
     scorecard_issue?vote_id=Y ->
       {ok, vote:{...}, breakdown:{yea:{D,R,I}, nay:{D,R,I},
                                   not_voting:{D,R,I}}}
   Linked by bioguide_id — the same key the directory rows carry (scKey
   reads r.bioguide_id, falls back to r.bioguide/r.id; rows without any key
   get no SCORECARD button — fail-soft, never invented).
   Renders ONLY what the API returns. No placeholder votes: a member with
   no tracked votes gets the explicit "no votes tracked yet" empty state. */
var SCST={open:null,issue:null,issueFrom:null,sc:{},iss:{}};
function scKey(r){ return String((r&&(r.bioguide_id||r.bioguide||r.id))||"").trim(); }
function scGet(bio){ return SCST.sc[bio]||null; }
function repNameByBio(bio){
  var reps=DIRST.reps||[];
  for(var i=0;i<reps.length;i++){ if(scKey(reps[i])===bio) return String(reps[i].name||"").trim(); }
  return "";
}
function fetchScorecard(bio){
  var cur=SCST.sc[bio]={load:true,err:false,votes:null,name:repNameByBio(bio)};
  paintDir();
  api("scorecard_get",{bioguide_id:bio},function(j){
    cur.load=false;
    if(j&&j.ok&&j.votes){ cur.votes=j.votes; cur.err=false; }
    else { cur.err=true; }
    paintDir();
  });
}
function posBadge(pos){
  var p=String(pos||"").toLowerCase().trim();
  if(p.indexOf("yea")===0) return '<span class="cv-vb cv-vb-yea">YEA</span>';
  if(p.indexOf("nay")===0) return '<span class="cv-vb cv-vb-nay">NAY</span>';
  /* Anything else (Present, Not Voting, Absent) is shown verbatim —
     escaped — never normalized into Yea/Nay. */
  return '<span class="cv-vb cv-vb-nv">'+esc(String(pos||"\u2014").toUpperCase().slice(0,12))+'</span>';
}
function scDate(ds){
  var d=String(ds||"").trim(); if(!d) return "";
  var m=d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return m[2]+"/"+m[3]+"/"+m[1];
  return d.slice(0,10);
}
function scVoteHTML(v){
  var title=String(v.bill_title||v.question||"").trim()||"Untitled vote";
  var h='<div class="cv-scrow">'+posBadge(v.position)
    +'<div class="cv-scbody">'
    +'<div class="cv-sctitle">'+esc(title)+'</div>'
    +'<div class="x-note">'+esc(scDate(v.vote_date));
  if(v.result) h+=' &middot; Result: '+esc(v.result);
  h+='</div>';
  /* Entry point to the issue view: tapping an issue_tag jumps to the
     vote breakdown for that vote. No vote_id -> plain label, no jump. */
  if(v.issue_tag){
    if(v.vote_id) h+='<button type="button" class="c-btn cv-t44 cv-sctag" data-sc-issue="'+esc(String(v.vote_id))+'">'+esc(v.issue_tag)+'</button>';
    else h+='<div class="x-note">'+esc(v.issue_tag)+'</div>';
  }
  return h+'</div></div>';
}
function scDetailHTML(bio){
  var cur=scGet(bio), nm=(cur&&cur.name)||repNameByBio(bio)||"This member";
  var h='<div class="cv-scdetail" data-sc-detail="'+esc(bio)+'">'
    +'<div class="cv-sc-head"><b>'+esc(nm)+' &mdash; voting record</b>';
  /* Share rides the detail header once votes are in hand — never on a
     loading/failed pane, so the shared text can only describe real data. */
  if(cur&&!cur.load&&!cur.err&&cur.votes) h+=' <button type="button" class="c-btn cv-t44" data-sc-share="'+esc(bio)+'">SHARE</button>';
  h+='</div>';
  if(!cur||cur.load){ h+='<div class="c-load">Reading their record&hellip;</div>'; }
  else if(cur.err){
    h+='<div class="c-err">Couldn&rsquo;t reach the scorecard wire.</div>'
      +'<button type="button" class="c-btn cv-t44" data-sc-retry="'+esc(bio)+'">RETRY</button>';
  }
  else if(!cur.votes.length){
    h+='<div class="x-note">'+esc(nm)+' has no votes tracked yet.</div>';
  }
  else {
    for(var i=0;i<cur.votes.length;i++) h+=scVoteHTML(cur.votes[i]);
  }
  return h+'</div>';
}
/* --- issue view: "where does Congress stand on X" --- */
function fetchIssue(vid){
  var cur=SCST.iss[vid]={load:true,err:false,vote:null,breakdown:null};
  paintIssue();
  api("scorecard_issue",{vote_id:vid},function(j){
    cur.load=false;
    if(j&&j.ok&&j.vote&&j.breakdown){ cur.vote=j.vote; cur.breakdown=j.breakdown; cur.err=false; }
    else { cur.err=true; }
    paintIssue();
  });
}
function partySum(o){ o=o||{}; return (Number(o.D)||0)+(Number(o.R)||0)+(Number(o.I)||0); }
function n0(v){ return String(Number(v)||0); }
function issueTableHTML(bd){
  var rows=[["yea","YEA"],["nay","NAY"],["not_voting","NOT VOTING"]];
  var h='<div class="cv-issue-table">'
    +'<div class="cv-ir cv-irh"><span></span><span>D</span><span>R</span><span>I</span><span>TOTAL</span></div>';
  for(var i=0;i<rows.length;i++){
    var c=bd[rows[i][0]]||{};
    h+='<div class="cv-ir"><span class="cv-irlabel">'+rows[i][1]+'</span>'
      +'<span>'+n0(c.D)+'</span><span>'+n0(c.R)+'</span><span>'+n0(c.I)+'</span>'
      +'<span class="cv-irtot">'+partySum(c)+'</span></div>';
  }
  return h+'</div>';
}
function issueHTML(){
  var vid=SCST.issue, cur=vid?SCST.iss[vid]:null;
  if(!vid) return "";
  var h='<div class="cv-issue" id="cvIssue">';
  h+='<button type="button" class="c-btn cv-t44" data-issue-back>&larr; BACK</button>';
  if(!cur||cur.load){ return h+'<div class="c-load">Reading the vote&hellip;</div></div>'; }
  if(cur.err){
    return h+'<div class="c-err">Couldn&rsquo;t reach the vote wire.</div>'
      +'<button type="button" class="c-btn cv-t44" data-issue-retry="'+esc(vid)+'">RETRY</button></div>';
  }
  var v=cur.vote||{}, bd=cur.breakdown||{};
  var title=String(v.bill_title||v.question||v.title||"").trim()||"Vote";
  h+='<h4 style="margin:10px 0 4px">'+esc(title)+'</h4>'
    +'<div class="x-note">'+esc(scDate(v.vote_date));
  if(v.chamber) h+=' &middot; '+esc(v.chamber);
  if(v.result) h+=' &middot; Result: '+esc(v.result);
  h+='</div>'
    /* Totals math: each cell is the API's number; TOTAL is D+R+I. */
    +issueTableHTML(bd)
    +'<div class="x-note">Counts straight from the wire — no spin.</div></div>';
  return h;
}
function paintIssue(){
  var p=document.getElementById("cvIssuePanel"); if(!p) return;
  p.innerHTML=issueHTML();
}
/* Share: text share via the existing PFShare.shareText idiom (dashboard.js
   promptShare), navigator.share fallback, toast fallback. Copy is built
   from the member's real tracked positions only — member name + Yea/Nay
   counts + link back to Political HQ. */
function shareScorecard(bio){
  var cur=scGet(bio), nm=(cur&&cur.name)||repNameByBio(bio)||"A member of Congress";
  var url="https://www.mtcstw.com/political-hq";
  try{ if(window.PF&&typeof PF.shareUrl==="function") url=PF.shareUrl(url); }catch(e){}
  var title=nm+"'s voting record";
  var summary="", votes=(cur&&cur.votes)||[];
  if(votes.length){
    var y=0,n=0;
    for(var i=0;i<votes.length;i++){
      var p=String(votes[i].position||"").toLowerCase().trim();
      if(p.indexOf("yea")===0) y++; else if(p.indexOf("nay")===0) n++;
    }
    summary=" \u2014 "+votes.length+" votes tracked ("+y+" Yea, "+n+" Nay)";
  } else summary=" \u2014 no votes tracked yet";
  var txt=title+summary+" \u2014 see the receipts at "+url;
  try{
    if(window.PFShare&&PFShare.shareText){ PFShare.shareText(txt); return; }
    if(typeof navigator!=="undefined"&&navigator.share){
      navigator.share({title:title,text:txt,url:url}).catch(function(){}); return;
    }
  }catch(e){}
  toast("Copy the link and spread it: "+url);
}
/* Shared rep_contact write path (2026-10-05): the legacy "Contact your rep"
   pane and every directory row log through this — same POST shape, same
   +25 XP, same 2/day cap. */
function doLogContact(repName,btn,errEl){
  if(!repName){ if(errEl) errEl.textContent="Pick a rep first."; return; }
  var box=document.getElementById("cvScriptBox");
  var sid=box?box.getAttribute("data-script-id"):"";
  if(btn) btn.disabled=true;
  post("rep","r_action","rep_contact",{callsign:ident().callsign,rep_name:repName,method:gv("cvMethod"),script_used:sid||""},function(j){
    if(j&&j.ok){
      /* CEO requirement 2026-10-05: the +25 XP reward is explicit in the
         confirmation. */
      /* 2026-10-05 (P2 F2-TOAST): the contact action feeds Civic Duty —
         record first so the toast shows the new count. */
      try{ document.dispatchEvent(new CustomEvent('pf-civic-rep-contacted')); }catch(e){}
      toast("Logged \u2014 +25 XP."+dutyFrag());
      fetchHist(true);
    } else {
      var e=String((j&&(j.err||j.error))||"");
      if(/cap/i.test(e)){
        /* 2/day cap per the rep_contact contract — reward amount + reset
           spelled out. */
        toast("Daily limit reached (2/day) \u2014 +25 XP each, resets tomorrow.");
      } else {
        var m=PF.errCopy(j,"Log failed.");
        if(errEl) errEl.textContent=m; else toast(m);
      }
    }
    if(btn) btn.disabled=false;
  });
}
/* --- call practice mode (2026-10-05): frontend-only rehearsal for
   first-time callers. Warm and encouraging, never gamified-shaming.
   PRACTICE EARNS ZERO XP — the overlay and entry points say so plainly.
   The real call logs through the shared doLogContact() helper above
   (same POST shape, +25 XP, 2/day cap) — the POST logic is NOT
   duplicated here. No backend writes from practice; the only
   persistence is a per-callsign practice count in localStorage, used
   for encouragement copy only. */
var PRAC={el:null,timer:null,secs:60,lines:[],idx:0,rep:"",phone:"",script:null,started:false,done:false};
function pracGetCount(){
  var id=""; try{ id=ident().callsign||""; }catch(e){}
  try{ return Number(window.localStorage.getItem("pf_prac_count_"+id))||0; }catch(e){ return 0; }
}
function pracBumpCount(){
  var id=""; try{ id=ident().callsign||""; }catch(e){}
  try{ window.localStorage.setItem("pf_prac_count_"+id,String(pracGetCount()+1)); }catch(e){}
}
/* Script picker: a campaign-passed script wins verbatim; otherwise the
   default rep-contact script — the topic-selected one when the legacy
   pane has one picked, else the first backend script. Never invented. */
function pracDefaultScript(){
  var scripts=(SCRIPTS&&SCRIPTS.scripts)||[];
  if(!scripts.length) return null;
  var sid=""; try{ var b=document.getElementById("cvScriptBox"); sid=b?b.getAttribute("data-script-id"):""; }catch(e){}
  for(var i=0;i<scripts.length;i++){ if(sid&&String(scripts[i].id)===String(sid)) return scripts[i]; }
  return scripts[0];
}
function pracNormScript(sc){
  if(!sc) return null;
  var body=sc.script!=null?sc.script:(sc.body!=null?sc.body:"");
  if(!String(body).replace(/\s+/g,"")) return null;
  return {title:String(sc.title||sc.topic||"Call script"),body:String(body)};
}
/* Same substitution + escaping discipline as showScript: escape the
   script first, then fill {NAME}/{STATE}/{REP} with escaped values. */
function pracFill(body,repName){
  var name=gv("cvMyName")||"[YOUR NAME]", st=gv("cvMyState")||"[STATE]", rep=repName||gv("cvRepSel")||"[REP]";
  return esc(body).split("{NAME}").join(esc(name)).split("{STATE}").join(esc(st)).split("{REP}").join(esc(rep));
}
function pracFmt(s){ s=Math.max(0,s); var m=Math.floor(s/60), r=s%60; return m+":"+(r<10?"0":"")+r; }
function pracEnsure(){
  if(PRAC.el) return PRAC.el;
  var ov=document.createElement("div");
  ov.id="pfPracOv"; ov.style.display="none";
  document.body.appendChild(ov);
  PRAC.el=ov; return ov;
}
function pracStopTimer(){ if(PRAC.timer){ try{ clearInterval(PRAC.timer); }catch(e){} PRAC.timer=null; } }
function pracPaintLine(){
  var t=document.getElementById("pfPracTele"); if(t) t.innerHTML=PRAC.lines[PRAC.idx]||"";
  var p=document.getElementById("pfPracProg"); if(p) p.textContent="Line "+(PRAC.idx+1)+" of "+PRAC.lines.length;
}
function pracRender(){
  var ov=pracEnsure();
  var n=pracGetCount();
  var h='<div class="pfprac-card">'
    +'<div class="pfprac-top">'
    +'<div class="pfprac-timer" id="pfPracTimer" aria-live="polite">'+pracFmt(PRAC.secs)+'</div>'
    +'<button type="button" class="c-btn cv-t44 pfprac-x" id="pfPracClose" aria-label="Close practice">\u2715</button>'
    +'</div>'
    +'<h3 class="pfprac-h">Practice your call</h3>'
    /* Zero-XP copy, plain: practice never mints XP. */
    +'<div class="x-note pfprac-zero">Practice earns <b>no XP</b> \u2014 the real call earns <b>+25 XP</b>.</div>';
  if(PRAC.rep) h+='<div class="x-note">Rehearsing for: <b>'+esc(PRAC.rep)+'</b></div>';
  if(n>0) h+='<div class="x-note">You\u2019ve run through this '+n+' time'+(n===1?"":"s")+'. Each rep makes the real call easier.</div>';
  if(!PRAC.script){
    /* Backend-unreachable: no script to rehearse against, retry the
       rep_scripts read — practice itself never depends on the write wire. */
    h+='<div class="c-err">The script wire didn\u2019t answer \u2014 nothing to rehearse against yet.</div>'
      +'<button type="button" class="c-btn cv-t44 pfprac-big" id="pfPracRetryScript">RETRY LOADING SCRIPT</button>';
  } else {
    h+='<div class="x-note"><b>'+esc(PRAC.script.title)+'</b></div>'
      +'<div class="pfprac-tele" id="pfPracTele" aria-live="polite">'+(PRAC.lines[PRAC.idx]||"")+'</div>'
      +'<div class="x-note pfprac-prog" id="pfPracProg">Line '+(PRAC.idx+1)+' of '+PRAC.lines.length+'</div>'
      +'<div class="pfprac-row">'
      +'<button type="button" class="c-btn cv-t44" id="pfPracPrev">\u2190 BACK</button>'
      +'<button type="button" class="c-btn cv-t44" id="pfPracNext">NEXT LINE \u2192</button>'
      +'</div>';
    if(!PRAC.started){
      h+='<button type="button" class="c-btn cv-t44 pfprac-big" id="pfPracStart">START 60-SECOND TIMER</button>'
        +'<div class="x-note">Read it out loud, like the staffer just picked up. No rush \u2014 the timer is a guide, not a test.</div>';
    }
    /* Gentle end target: filled + faded in when the timer lands, never a buzzer. */
    h+='<div class="pfprac-gentle" id="pfPracGentle" aria-live="polite"></div>';
    if(!PRAC.done){
      h+='<button type="button" class="c-btn cv-t44 pfprac-big" id="pfPracDone">I PRACTICED \u2713</button>';
    } else {
      h+='<div class="pfprac-warm">Nice. You\u2019ve got this.</div>'
        +'<div class="x-note">The real call is where the +25 XP lives. Staffer answers, you read your lines, done.</div>'
        +'<div class="pfprac-row">';
      if(PRAC.phone) h+='<a class="c-btn cv-t44" href="'+esc(PRAC.phone)+'">CALL NOW</a>';
      h+='<button type="button" class="c-btn cv-t44" id="pfPracLog">LOG THE REAL CALL (+25 XP)</button></div>'
        +'<div class="c-err" id="pfPracErr"></div>'
        +'<div class="x-note">2 logged contacts per day \u2014 same as always.</div>';
    }
  }
  h+='</div>';
  ov.innerHTML=h;
  pracBind();
}
function pracBind(){
  function on(id,fn){ var e=document.getElementById(id); if(e) e.onclick=fn; }
  on("pfPracClose",pracClose);
  on("pfPracStart",pracStart);
  on("pfPracDone",pracCheckIn);
  on("pfPracLog",pracLogReal);
  on("pfPracPrev",function(){ if(PRAC.idx>0){ PRAC.idx--; pracPaintLine(); } });
  on("pfPracNext",function(){ if(PRAC.idx<PRAC.lines.length-1){ PRAC.idx++; pracPaintLine(); } });
  on("pfPracRetryScript",function(){
    var b=document.getElementById("pfPracRetryScript"); if(b) b.disabled=true;
    api("rep_scripts",{},function(j){ SCRIPTS=j; pracOpen({repName:PRAC.rep,phone:PRAC.phone}); });
  });
}
function pracOpen(opts){
  opts=opts||{};
  PRAC.rep=String(opts.repName||"");
  PRAC.phone=String(opts.phone||"");
  /* Campaign-passed script verbatim, else the default rep-contact script. */
  PRAC.script=pracNormScript(opts.script)||pracNormScript(pracDefaultScript());
  PRAC.lines=[]; PRAC.idx=0; PRAC.secs=60; PRAC.started=false; PRAC.done=false;
  if(PRAC.script){
    var filled=pracFill(PRAC.script.body,PRAC.rep);
    /* Teleprompter: line-by-line advance — simpler and more robust than
       auto-scroll (no scroll-timing bugs at any font size). Split on
       blank lines so each beat is one tap. */
    var parts=filled.split(/\\n\s*\\n/), i, t;
    for(i=0;i<parts.length;i++){ t=parts[i].replace(/\s+/g," ").replace(/^\s+|\s+$/g,""); if(t) PRAC.lines.push(t); }
    if(!PRAC.lines.length) PRAC.lines=[filled];
  }
  pracStopTimer();
  pracRender();
  var ov=pracEnsure(); ov.style.display="block";
  try{ ov.scrollTop=0; }catch(e){}
  try{ document.body.style.overflow="hidden"; }catch(e){}
}
function pracClose(){
  pracStopTimer();
  var ov=document.getElementById("pfPracOv");
  if(ov) ov.style.display="none";
  try{ document.body.style.overflow=""; }catch(e){}
}
function pracStart(){
  if(PRAC.started) return;
  PRAC.started=true; PRAC.secs=60;
  var t=document.getElementById("pfPracTimer"); if(t) t.textContent=pracFmt(PRAC.secs);
  var s=document.getElementById("pfPracStart"); if(s) s.style.display="none";
  pracStopTimer();
  PRAC.timer=setInterval(pracTick,1000);
}
function pracTick(){
  PRAC.secs--;
  var t=document.getElementById("pfPracTimer");
  if(t) t.textContent=pracFmt(PRAC.secs);
  if(PRAC.secs<=0){
    pracStopTimer();
    var g=document.getElementById("pfPracGentle");
    if(g){ g.innerHTML="Time. Breathe \u2014 that was the hard part, and you did it."; g.classList.add("pfprac-show"); }
    var s=document.getElementById("pfPracStart"); if(s) s.style.display="none";
  }
}
/* "I practiced" check-in: warm, ungated (no timer requirement, no
   shaming) — bumps the local encouragement count and surfaces the
   real-call prompt. */
function pracCheckIn(){
  if(PRAC.done) return;
  PRAC.done=true; pracStopTimer(); pracBumpCount();
  pracRender();
}
/* Real-call path: reuses the EXISTING doLogContact() write path — same
   POST, same +25 XP, same 2/day cap. No duplicated POST logic. */
function pracLogReal(){
  var b=document.getElementById("pfPracLog");
  var err=document.getElementById("pfPracErr");
  doLogContact(PRAC.rep,b,err);
}
/* Defensive entry point for parallel builds (pressure-campaign cards are
   not in this base yet): cards can call
   window.PFPractice.open({repName,phone,script:{title,script}}) — the
   script passes through verbatim — or render
   <button data-pf-practice data-pf-rep="..." data-pf-phone="tel:..."
   data-pf-script-title="..." data-pf-script-body="...">. */
window.PFPractice={ open:function(o){ try{ pracOpen(o||{}); }catch(e){} }, close:function(){ try{ pracClose(); }catch(e){} } };
try{
  document.addEventListener("click",function(e){
    var b=e.target&&e.target.closest?e.target.closest("[data-pf-practice]"):null;
    if(!b) return;
    var sb=b.getAttribute("data-pf-script-body");
    window.PFPractice.open({
      repName:b.getAttribute("data-pf-rep")||"",
      phone:b.getAttribute("data-pf-phone")||"",
      script:sb?{title:b.getAttribute("data-pf-script-title")||"Call script",script:sb}:null
    });
  });
}catch(e){}
function render(){
  var el=document.getElementById("xCivic"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    h+=PF.gateHTML('Civic action runs on callsigns.','to take civic action');
    el.innerHTML=h; return;
  }
  /* --- petitions --- */
  h+='<div class="x-pane"><h4>Petitions</h4>';
  var pets=(P&&P.petitions)||[];
  if(!pets.length){ h+='<div class="x-note">No petitions yet. Start the first one below.</div>'; }
  for(var i=0;i<pets.length;i++){
    var p=pets[i];
    PET_TITLE[p.id]=p.title;
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(p.title)+'</div>'
      +'<div class="x-note">Target: '+esc(p.target)+' &bull; by '+esc(p.creator)+'</div>'
      +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+(p.pct||0)+'%"></div></div>'
      +'<div class="x-note">'+(p.sig_count||0)+' / '+p.goal+' signatures ('+(p.pct||0)+'%)</div>'
      +'<button class="c-btn cp-mbtn" data-pet-sign="'+esc(p.id)+'">SIGN (+10 XP)</button> '
      /* 2026-10-05 (P2 F2-TOAST / P10 W18): share affordance appears only
         AFTER signing — never before the action. */
      +(PET_SHARE_AFTER[p.id]?'<button class="c-btn cp-mbtn" data-pet-shareafter="'+esc(p.id)+'">SHARE IT \u2192</button> ':"")
      /* 2026-10-03: petition_sigs (public) — who signed, per card. */
      +'<button class="c-btn cp-mbtn" data-pet-sigs="'+esc(p.id)+'">WHO SIGNED</button>'
      +'<div class="x-note" data-pet-sigs-out="'+esc(p.id)+'" style="display:none"></div>'
      +'<div class="x-note">XP has no cash value. Stakes are final.</div></div>';
  }
  if(CREATE_OPEN){
    h+='<div class="x-pane pf-mt" ><h4>New petition</h4>'
      +'<input aria-label="Title (e.g. Stop the rent gouging)" class="c-in"  id="cvPetTitle" maxlength="140" placeholder="Title (e.g. Stop the rent gouging)">'
      +'<input aria-label="Target (e.g. City Council)" class="c-in"  id="cvPetTarget" maxlength="140" placeholder="Target (e.g. City Council)">'
      +'<textarea class="c-in"  id="cvPetDesc" rows="3" maxlength="2000" placeholder="What are we demanding?"></textarea>'
      +'<input aria-label="Signature goal" class="c-in"  id="cvPetGoal" type="number" min="10" max="1000000" value="500" placeholder="Signature goal">'
      +'<button class="c-btn" id="cvPetCreate">LAUNCH PETITION</button> '
      +'<button class="c-btn" id="cvPetCancel">CANCEL</button><div class="c-err" id="cvPetErr"></div></div>';
  } else {
    h+='<button class="c-btn" id="cvPetOpen">START A PETITION</button>';
  }
  h+='</div>';
  /* --- pressure campaigns (2026-10-05, wave pressure-campaigns FE) --- */
  h+=pressurePaneHTML();
  /* --- Wave A5 S-13: official jobs panel above pressure campaigns.
     The module mounts itself into this slot; a dead macro wire renders
     nothing and never breaks the civic page. */
  if(!(PF&&(PF.skip('phq-jobs')))) h+='<div id="cvJobsPanel"></div>';
  /* --- network polls (2026-10-05) --- */
  h+=pollsPane();
  /* --- contact your rep --- */
  h+='<div class="x-pane"><h4>Contact your rep</h4>'
    /* 2026-10-05 (P1 F2-PROG): Civic Duty progress meter mount. Painted by
       civic-duty.js from PF.civicDutyProgress(); empty until that module
       paints (MutationObserver repaints after re-renders). */
    +'<div class="x-note" id="cvDutyMeter" aria-live="polite"></div>'
  var reps=(REPS&&REPS.reps)||[];
  var ropts='<option value="">Pick a rep&hellip;</option>';
  for(var r=0;r<reps.length;r++){ ropts+='<option value="'+esc(reps[r].name)+'">'+esc(reps[r].name)+' &mdash; '+esc(reps[r].role||reps[r].chamber||"")+'</option>'; }
  var scripts=(SCRIPTS&&SCRIPTS.scripts)||[];
  var topics={}, topts='<option value="">Pick a topic&hellip;</option>';
  for(var s2=0;s2<scripts.length;s2++){ if(!topics[scripts[s2].topic]){ topics[scripts[s2].topic]=1; topts+='<option value="'+esc(scripts[s2].topic)+'">'+esc(scripts[s2].topic)+'</option>'; } }
  h+='<select class="c-in"  id="cvRepSel">'+ropts+'</select>'
    +'<select class="c-in"  id="cvTopicSel">'+topts+'</select>'
    +'<div id="cvScriptBox"></div>'
    +'<input aria-label="Your name (for the script)" class="c-in"  id="cvMyName" maxlength="60" placeholder="Your name (for the script)">'
    +'<select class="c-in"  id="cvMyState">'+stateOpts("")+'</select>'
    +'<div class="x-note">Method:</div>'
    +'<select class="c-in"  id="cvMethod"><option value="call">Call</option><option value="email">Email</option><option value="tweet">Tweet</option></select>'
    +'<button class="c-btn" id="cvLogContact">LOG CONTACT (+25 XP)</button> '
    /* 2026-10-05: call practice mode entry point — rehearses the rep call
       against the script picker below. Zero XP, stated plainly. */
    +'<button class="c-btn" id="cvPracticeFirst">PRACTICE FIRST</button><div class="c-err" id="cvRepErr"></div>'
    +'<div class="x-note">Practice earns no XP &mdash; the real call earns +25 XP.</div>'
    +'<div class="x-note">XP has no cash value. Stakes are final.</div>'
    /* 2026-10-03: rep_contact_history (AUTH) — the caller's own contact log. */
    +'<div id="cvHistBox" style="margin-top:8px"><div class="x-note">Reading your contact log&hellip;</div></div>';
  if(REPS&&REPS.note){ h+='<div class="x-note">'+esc(REPS.note)+'</div>'; }
  h+='</div>';
  /* --- cell competitions (2026-10-05): weekly cell-vs-cell civic race.
     The card stays empty until cellcomp_current lands ok (fail-soft). It
     sits on the rep-contact pane — logging a contact is how cells score. */
  h+='<div id="cvCompBox"></div>';
  /* --- congressional directory (2026-10-05): full member directory.
     Server filters on state/chamber (reps_list); name search is
     client-side. Renders only what the API returns — no invented data. */
  /* 2026-10-05 (rep-flow friction): default the directory to the viewer's
     home state. "All states" dumped all 535 members on first paint — the
     rep lookup is "your reps", not the whole Congress. Once-per-mount:
     an explicit "All states" choice (or the legislation-member flow's
     deliberate reset) must survive later re-renders. */
  if(!DIRST.st&&!DIRST._hsInit){ DIRST._hsInit=true;
    try{ var _hs=(window.PF&&PF.homeState&&PF.homeState())||""; if(_hs) DIRST.st=_hs; }catch(e){} }
  h+='<div class="x-pane"><h4>Find your reps</h4>'
    +'<div class="x-note">Every logged contact: <b>+25 XP</b> (2/day).</div>'
    /* 2026-10-05: issue view panel — "where does Congress stand on X".
       Painted at the top of the directory pane when a vote is open. */
    +'<div id="cvIssuePanel">'+issueHTML()+'</div>'
    +'<div class="cv-dirfilters">'
    +'<select class="c-in cv-t44" id="cvDirState" aria-label="Filter by state">'+dirStateOpts(DIRST.st)+'</select>'
    +'<div class="cv-cham" role="group" aria-label="Chamber filter">'
    +'<button type="button" class="c-btn cv-ch" data-ch="" aria-pressed="'+(DIRST.ch===""?"true":"false")+'">ALL</button>'
    +'<button type="button" class="c-btn cv-ch" data-ch="senate" aria-pressed="'+(DIRST.ch==="senate"?"true":"false")+'">SENATE</button>'
    +'<button type="button" class="c-btn cv-ch" data-ch="house" aria-pressed="'+(DIRST.ch==="house"?"true":"false")+'">HOUSE</button>'
    +'</div>'
    +'<input class="c-in cv-t44" id="cvDirQ" type="search" maxlength="60" placeholder="Search by name" aria-label="Search by name" value="'+esc(DIRST.q)+'">'
    +'</div>'
    +'<div class="c-err" id="cvDirErr"></div>'
    +'<div id="cvDirList">'+dirListHTML()+'</div>'
    +'</div>';
  /* --- voter registration --- */
  h+='<div class="x-pane"><h4>Voter registration</h4>'
    /* 2026-10-03: voter_pledge_stats (public) — movement social proof. */
    +(function(){
      if(!(VSTATS&&VSTATS.ok)) return "";
      var total=Number(VSTATS.total_pledges)||0;
      var bs=(VSTATS.by_state)||[], top=[];
      for(var vi=0;vi<Math.min(bs.length,5);vi++){ top.push(esc(bs[vi].state)+": "+Number(bs[vi].pledges||0)); }
      return '<div class="x-note"><b>'+total+'</b> pledged network-wide'+(top.length?" — top states: "+top.join(", "):"")+'.</div>';
    })()
    +'<select class="c-in"  id="cvVoterState">'+stateOpts(VOTER&&VOTER.state?VOTER.state:"")+'</select>'
    +'<div id="cvVoterBox">';
  if(VOTER&&VOTER.url){
    h+='<div class="x-note">Official registration for '+esc(VOTER.state)+':</div>'
      +'<a class="c-btn" href="'+esc(VOTER.url)+'" target="_blank" rel="noopener">REGISTER ON VOTE.GOV</a> '
      +'<button class="c-btn" id="cvPledge">PLEDGE (+50 XP)</button>'
      +'<div class="x-note">XP has no cash value. Stakes are final.</div>'
      /* 2026-10-05 (pledge-share-cards): SHARE YOUR PLEDGE arms only when the
         ballot wire returned a live deadline (PLEDGE_CARD). Expired states
         get the fail-soft "deadline passed" note instead of a card. */
      +(PLEDGE_CARD?'<button class="c-btn" id="cvPledgeShare">SHARE YOUR PLEDGE \u2192</button>':'')
      +(PLEDGE_DONE&&PLEDGE_NOTE?'<div class="x-note">'+esc(PLEDGE_NOTE)+'</div>':'')
      +'<div class="x-note">'+esc(VOTER.note||"")+'</div>';
  } else if(VOTER&&VOTER.err){
    /* 2026-10-05 (audit #2): a voter_check failure used to land here with
       the select reset blank and zero feedback. VOTER.state survives the
       failure so the select keeps the user's state; show inline error +
       Retry instead of silence. */
    h+='<div class="c-err">Couldn&rsquo;t reach the registration wire for '+esc(VOTER.state)+'.</div>'
      +'<button class="c-btn" id="cvVoterRetry">RETRY</button>';
  } else {
    h+='<div class="x-note">Pick your state to get the official registration link.</div>';
  }
  h+='</div></div>';
  /* --- ballot center (2026-10-05, Political HQ #4): state election dates.
     Read-only pane — countdowns from real API dates only, no invented data,
     no XP. Ballot deadlines live here; voter registration stays above. */
  h+='<div class="x-pane"><h4>Ballot Center</h4>'
    +'<div class="x-note">Deadlines, early voting, and your polling place &mdash; straight from your state&rsquo;s official data.</div>'
    +'<select class="c-in cv-t44" id="cvBalState" aria-label="Pick your state">'+ballotStateOpts(BAL.st)+'</select>'
    +'<div id="cvBalBox">'+ballotBoxHTML()+'</div>'
    +'</div>';
  /* --- notification preferences (2026-10-05, audit #3): contact PII lives in
     ONE surface — "Control the Signal" (notify-prefs silo, right below) owns
     email/phone/opt-ins. This pane is now a link, not a second capture form.
     No data-flow changes: notify-prefs' contact_set stays the single write
     path, with its own 13+ self-certification intact. */
  h+='<div class="x-pane"><h4>Notification preferences</h4>'
    +'<div class="x-note">Drops, alerts, and battle calls live in one place now.</div>'
    +'<a class="c-btn" href="#notifications">MANAGE NOTIFICATIONS \u2192</a></div>';
  el.innerHTML=h;
  bind();
  /* 2026-10-05 (P4 pane anchors): the civic panes are painted async (after
     the JSONP fan-in in load()), so phq-hubs' tagHubPanes() at mount time
     finds nothing. Announce every paint; the hub re-tags idempotently. */
  try{ document.dispatchEvent(new CustomEvent('pf-civic-panes')); }catch(e){}
  /* Wave A5 S-13: mount the official jobs panel (defensive — the module
     may be killed or absent from an older bundle). */
  try {
    var jp = document.getElementById('cvJobsPanel');
    if (jp && window.PFJobsPanel && window.PFJobsPanel.mount) window.PFJobsPanel.mount(jp);
  } catch (e) {}
}
/* ================= NETWORK POLLS (2026-10-05, expansion #3) ================
   Backend contract (backend pod, parallel build):
     GET  ?action=polls_list&status=open   -> {ok, polls:[{id,question,kind,bill_id,options:[{id,label}],closes_at,status,total_votes,created_by,has_voted,results_hidden}]}
     GET  ?action=polls_list&status=closed -> same, closed polls (results released)
     GET  ?action=polls_get&poll_id=X&callsign=Y -> {ok, poll:{id,question,kind,bill_id,options:[{id,label,count|null}],closes_at,status,total_votes,created_by,has_voted,results_hidden}}
     POST {type:'poll', po_action:'polls_create', callsign, question, options:[labels], kind, bill_id?, closes_at} -> {ok,id}
     POST {type:'poll', po_action:'polls_vote', callsign, poll_id, option_id} -> {ok}
   RESULTS RULE (anti-bandwagoning): percentages hidden until the viewer has
   voted (client-side map + API has_voted) or the poll is closed. Enforced
   here and — per contract — on the backend (counts withheld in polls_get). */
function pollVotedGet(){ try{ return JSON.parse(localStorage.getItem("pf_polls_voted_v1")||"{}"); }catch(e){ return {}; } }
function pollVotedSet(m){ try{ localStorage.setItem("pf_polls_voted_v1",JSON.stringify(m)); }catch(e){} }
function pollCountdown(ts){
  var ms=Number(ts)-Date.now();
  if(!(ms>0)) return "Closed";
  var d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4);
  if(d>0) return d+"d "+h+"h left";
  if(h>0) return h+"h "+m+"m left";
  return Math.max(m,1)+"m left";
}
function pollTick(){
  var els=document.querySelectorAll("[data-poll-countdown]");
  for(var i=0;i<els.length;i++){ els[i].textContent=pollCountdown(els[i].getAttribute("data-poll-countdown")); }
}
try{ setInterval(pollTick,30000); }catch(e){}
function loadPolls(){
  POLLS_ERR=false;
  var done=0;
  function one(){ done++; if(done>=2){ try{ render(); }catch(e){} } }
  api("polls_list",{status:"open"},function(j){
    if(j&&j.ok){ POLLS_OPEN=j; } else { POLLS_ERR=true; POLLS_OPEN=null; }
    one();
  });
  api("polls_list",{status:"closed"},function(j){
    POLLS_CLOSED=(j&&j.ok)?j:null;
    one();
  });
}
function fetchPollDetail(pid){
  var k=String(pid);
  if(POLLS_FETCHING[k]||POLLS_DETAIL[k]) return;
  POLLS_FETCHING[k]=true;
  var pp={poll_id:pid};
  var id2=ident(); if(id2.callsign) pp.callsign=id2.callsign;
  api("polls_get",pp,function(j){
    POLLS_FETCHING[k]=false;
    if(j&&j.ok){ POLLS_DETAIL[k]=pollDetailAdapt(j); try{ render(); }catch(e){} }
    /* failure: keep the "Reading results" note; the next re-render refires */
  });
}
/* 2026-10-05 (contract fix): backend polls_get nests the detail under
   "poll" and ships per-option "count" (null until voted/closed), not
   top-level "options" with "votes". Normalize to the detail object. */
function pollDetailAdapt(j){
  if(!j) return null;
  var d=(j.poll&&typeof j.poll==="object")?j.poll:j;
  return d;
}
/* pct from count/total_votes when the backend has released counts;
   falls back to list-level options (no counts shown) when null. */
function pollCountsOpen(opts){
  for(var i=0;i<opts.length;i++){ if(opts[i].count==null) return false; }
  return true;
}
function pollIsVoted(p){
  var m=pollVotedGet();
  return !!(m[String(p.id)]||p.has_voted);
}
function pollCard(p,closed){
  var h='<div class="cp-mission">';
  h+='<div class="cp-mtext">'+esc(p.question)+'</div>';
  var kind=String(p.kind||"general");
  h+='<div class="x-note">'+(kind==="pressure"
    ?'<b>PRESSURE POLL</b> \u2014 "should we pressure this bill?"'
    :"General poll");
  if(p.bill_id){
    var bl=String(p.bill_id);
    h+=' \u2022 bill: '+(bl.indexOf("http")===0
      ?'<a href="'+esc(bl)+'" target="_blank" rel="noopener">link</a>'
      :esc(bl));
  }
  h+='</div>';
  /* passed badge: passed pressure polls PROPOSE a draft campaign — review
     queue, never auto-launch. */
  if(String(p.status)==="passed"){
    h+='<div class="x-note"><b>\u2713 Passed \u2014 draft campaign proposed, under review.</b></div>';
  }
  if(!closed){
    h+='<div class="x-note">Closes in <span data-poll-countdown="'+esc(p.closes_at)+'">'+pollCountdown(p.closes_at)+'</span></div>';
  } else {
    h+='<div class="x-note">Closed.</div>';
  }
  h+='<div class="x-note"><b>'+Number(p.total_votes||0)+'</b> votes</div>';
  var voted=pollIsVoted(p);
  if(voted||closed){
    var det=POLLS_DETAIL[String(p.id)];
    if(!det){
      h+='<div class="x-note">Reading results&hellip;</div>';
      fetchPollDetail(p.id);
    } else {
      var opts=(det.options&&det.options.length)?det.options:[];
      /* contract: per-option counts released via "count"; while null (voter
         hasn't voted / poll open), fall back to list-level options. */
      var countsOpen=opts.length>0&&pollCountsOpen(opts);
      if(!countsOpen){ opts=(p.options&&p.options.length)?p.options:opts; }
      var tot=Number(det.total_votes!=null?det.total_votes:p.total_votes)||0;
      if(!opts.length){ h+='<div class="x-note">No results yet.</div>'; }
      for(var i=0;i<opts.length;i++){
        var o=opts[i];
        var v=(o.count!=null)?(Number(o.count)||0):((o.votes!=null)?(Number(o.votes)||0):0);
        var pct=(countsOpen&&tot>0)?Math.round(v*100/tot):((o.pct!=null)?Number(o.pct):0);
        h+='<div class="x-note" style="margin-top:6px">'+esc(o.label)+' \u2014 '+v+' ('+pct+'%)</div>'
          +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>';
      }
      /* 2026-10-05 (P11 W14): the voted poll is no longer a dead end —
         convert the peak-engagement moment into a first civic action. */
      h+='<div class="x-note" style="margin-top:8px">'+(kind==="pressure"
        ?'This could become a pressure campaign \u2014 <a href="/political-hq#phq-action">see TAKE ACTION \u2192</a>'
        :'Your call is counted. <a href="/political-hq#phq-pane-directory">Make it real: contact your rep \u2192</a>')+'</div>';
    }
  } else {
    /* RESULTS RULE: vote buttons only, no percentages — no bandwagoning. */
    var vo=p.options||[];
    h+='<div class="x-note">Results stay hidden until you vote.</div>';
    for(var j=0;j<vo.length;j++){
      h+='<button class="c-btn cp-mbtn" style="min-height:44px" data-poll-vote="'+esc(p.id)+'" data-poll-opt="'+esc(vo[j].id)+'">'+esc(vo[j].label)+'</button> ';
    }
    if(!vo.length){ h+='<div class="x-note">No options on this poll.</div>'; }
  }
  h+='<div class="x-note">XP has no cash value. Stakes are final.</div></div>';
  return h;
}
function pollSaveDraft(){
  POLLS_DRAFT.q=gv("cvPollQ");
  var a=[], els=document.querySelectorAll("[data-poll-opt-in]");
  for(var i=0;i<els.length;i++){ a.push(els[i].value); }
  POLLS_DRAFT.opts=a;
  POLLS_DRAFT.kind=gv("cvPollKind")||"general";
  POLLS_DRAFT.dur=gv("cvPollDur")||"3";
  POLLS_DRAFT.bill=gv("cvPollBill");
}
function pollCreateForm(){
  var h='<div class="x-pane pf-mt"><h4>New poll</h4>'
    +'<input aria-label="Poll question" class="c-in" id="cvPollQ" maxlength="280" placeholder="Poll question (280 max)" value="'+esc(POLLS_DRAFT.q)+'">'
    +'<div id="cvPollOpts">';
  for(var i=0;i<POLLS_CREATE_OPTS;i++){
    var ov=(POLLS_DRAFT.opts&&POLLS_DRAFT.opts[i])?POLLS_DRAFT.opts[i]:"";
    h+='<div><input aria-label="Option '+(i+1)+'" class="c-in" data-poll-opt-in="'+i+'" maxlength="120" placeholder="Option '+(i+1)+'" value="'+esc(ov)+'">'
      +(i>=2?' <button class="c-btn" data-poll-opt-rm="'+i+'" style="min-height:44px">REMOVE</button>':'')+'</div>';
  }
  h+='</div>'
    +'<button class="c-btn" id="cvPollAddOpt" style="min-height:44px">+ ADD OPTION ('+POLLS_CREATE_OPTS+'/6)</button>'
    +'<div class="x-note" style="margin-top:8px">Kind:</div>'
    +'<select class="c-in" id="cvPollKind">'
    +'<option value="general"'+(POLLS_DRAFT.kind==="general"?" selected":"")+'>General</option>'
    +'<option value="pressure"'+(POLLS_DRAFT.kind==="pressure"?" selected":"")+'>Should we pressure this bill?</option></select>'
    +'<input aria-label="Bill link (pressure polls)" class="c-in" id="cvPollBill" maxlength="300" placeholder="Bill link (pressure polls)" value="'+esc(POLLS_DRAFT.bill)+'"'
    +(POLLS_DRAFT.kind==="pressure"?"":' style="display:none"')+'>'
    +'<div class="x-note">Duration:</div>'
    +'<select class="c-in" id="cvPollDur">'
    +'<option value="1"'+(POLLS_DRAFT.dur==="1"?" selected":"")+'>1 day</option>'
    +'<option value="3"'+(POLLS_DRAFT.dur==="3"?" selected":"")+'>3 days</option>'
    +'<option value="7"'+(POLLS_DRAFT.dur==="7"?" selected":"")+'>7 days</option>'
    +'<option value="14"'+(POLLS_DRAFT.dur==="14"?" selected":"")+'>14 days</option></select>'
    +'<div class="x-note"><b>Pressure polls that PASS (&gt;60% YES and 10+ votes) only PROPOSE a draft campaign for review. They never auto-launch.</b></div>'
    +'<button class="c-btn" id="cvPollCreate" style="min-height:44px">LAUNCH POLL</button> '
    +'<button class="c-btn" id="cvPollCancel" style="min-height:44px">CANCEL</button>'
    +'<div class="c-err" id="cvPollErr"></div></div>';
  return h;
}
/* Admin gate for poll creation: backend polls_create is admin-only (CEO decision).
   Same session flag as governance.js/economy.js — the secret is entered on the
   private admin surfaces, never on this public pane. */
function pollsIsAdmin(){ try{ return !!sessionStorage.getItem("pf_admin_secret"); }catch(e){ return false; } }
function pollsPane(){
  var h='<div class="x-pane"><h4>Network Polls</h4>';  h+='<div class="x-note">Cast your vote. Results stay hidden until you vote \u2014 no bandwagoning.</div>';
  if(!BACKEND||(POLLS_ERR&&!POLLS_OPEN)){
    h+='<div class="c-err">Couldn&rsquo;t reach the polls wire.</div>'
      +'<button class="c-btn" id="cvPollRetry" style="min-height:44px">RETRY</button>';
    h+='</div>';
    return h;
  }
  var open=(POLLS_OPEN&&POLLS_OPEN.polls)||[];
  if(!open.length){ h+='<div class="x-note">No open polls right now. Start the first one.</div>'; }
  for(var i=0;i<open.length;i++){ h+=pollCard(open[i],false); }
  var closed=(POLLS_CLOSED&&POLLS_CLOSED.polls)||[];
  if(closed.length){
    h+='<h4 style="margin-top:10px">Closed polls</h4>';
    for(var c=0;c<closed.length;c++){ h+=pollCard(closed[c],true); }
  }
  if(pollsIsAdmin()){
    if(POLLS_CREATE_OPEN){
      h+=pollCreateForm();
    } else {
      h+='<button class="c-btn" id="cvPollOpen" style="min-height:44px">START A POLL</button>';
    }
  } else {
    h+='<div class="x-note">Poll creation is admin-only &mdash; vote on open polls below.</div>';
  }
  h+='</div>';
  return h;
}
function bindPolls(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var rt=document.getElementById("cvPollRetry");
  if(rt) rt.onclick=function(){ loadPolls(); };
  var op=document.getElementById("cvPollOpen");
  if(op) op.onclick=function(){
    POLLS_CREATE_OPEN=true; POLLS_CREATE_OPTS=2;
    POLLS_DRAFT={q:"",opts:[],kind:"general",dur:"3",bill:""};
    render();
  };
  var cn=document.getElementById("cvPollCancel");
  if(cn) cn.onclick=function(){ POLLS_CREATE_OPEN=false; render(); };
  var kind=document.getElementById("cvPollKind");
  if(kind) kind.onchange=function(){
    var b=document.getElementById("cvPollBill");
    if(b) b.style.display=(kind.value==="pressure")?"":"none";
  };
  var add=document.getElementById("cvPollAddOpt");
  if(add) add.onclick=function(){
    if(POLLS_CREATE_OPTS<6){ pollSaveDraft(); POLLS_CREATE_OPTS++; render(); }
  };
  qsa("[data-poll-opt-rm]").forEach(function(b){
    b.onclick=function(){
      if(POLLS_CREATE_OPTS>2){ pollSaveDraft(); POLLS_CREATE_OPTS--; render(); }
    };
  });
  qsa("[data-poll-vote]").forEach(function(b){
    b.onclick=function(){
      var pid=b.getAttribute("data-poll-vote"), oid=b.getAttribute("data-poll-opt");
      b.disabled=true;
      post("poll","po_action","polls_vote",{callsign:ident().callsign,poll_id:pid,option_id:oid},function(j){
        if(j&&j.ok){
          var m=pollVotedGet(); m[String(pid)]=String(oid); pollVotedSet(m);
          delete POLLS_DETAIL[String(pid)];
          toast("+5 XP earned");
          fetchPollDetail(pid);
        } else { toast(PF.errCopy(j,"Vote failed.")); b.disabled=false; }
      });
    };
  });
  var cb=document.getElementById("cvPollCreate");
  if(cb) cb.onclick=function(){
    var err=document.getElementById("cvPollErr");
    var q=gv("cvPollQ").trim();
    if(!q){ err.textContent="Question is required."; return; }
    if(q.length>280){ err.textContent="Question must be 280 characters or less."; return; }
    var opts=[];
    qsa("[data-poll-opt-in]").forEach(function(inp){
      var v=(inp.value||"").trim(); if(v) opts.push(v);
    });
    if(opts.length<2){ err.textContent="At least 2 options are required."; return; }
    if(opts.length>6){ err.textContent="At most 6 options."; return; }
    var k=gv("cvPollKind")==="pressure"?"pressure":"general";
    var dur=Number(gv("cvPollDur"))||3;
    var bill=gv("cvPollBill").trim();
    cb.disabled=true;
    var params={callsign:ident().callsign,question:q,options:opts,kind:k,closes_at:Date.now()+dur*864e5};
    if(k==="pressure"&&bill) params.bill_id=bill;
    post("poll","po_action","polls_create",params,function(j){
      if(j&&j.ok){
        toast("Poll launched.");
        POLLS_CREATE_OPEN=false; POLLS_CREATE_OPTS=2;
        POLLS_DRAFT={q:"",opts:[],kind:"general",dur:"3",bill:""};
        loadPolls();
      } else { err.textContent=PF.errCopy(j,"Create failed."); cb.disabled=false; }
    });
  };
}
/* ================= END NETWORK POLLS ================= */
function gv(id){ var e=document.getElementById(id); return e?e.value:""; }
function bind(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  qsa("[data-pet-sign]").forEach(function(b){
    b.onclick=function(){
      var pid=b.getAttribute("data-pet-sign");
      b.disabled=true;
      post("petition","pe_action","petition_sign",{callsign:ident().callsign,petition_id:pid},function(j){
        if(j&&j.ok){
          /* 2026-10-05 (P2 F2-TOAST): record first — the toast shows the
             count INCLUDING this action. Share ask comes after the action
             (P10 W18), never before. */
          try{ document.dispatchEvent(new CustomEvent('pf-civic-petition-signed')); }catch(e){}
          toast((j.dup?"Already signed.":"Signed. +10 XP.")+dutyFrag()+(j.dup?"":" Share it \u2192"));
          if(!j.dup){ PET_SHARE_AFTER[pid]=1; }
          refreshPetitions();
        }
        else { toast(PF.errCopy(j,"Sign failed.")); b.disabled=false; }
      });
    };
  });
  var po=document.getElementById("cvPetOpen");
  if(po) po.onclick=function(){ CREATE_OPEN=true; render(); };
  /* WHO SIGNED toggle (petition_sigs, public): per-card signature list. */
  qsa("[data-pet-sigs]").forEach(function(b){
    b.onclick=function(){
      var pid=b.getAttribute("data-pet-sigs");
      /* 2026-10-05 (audit #5): the backend petition id used to interpolate
         unescaped into a CSS attribute selector — a quote in an id silently
         killed WHO SIGNED. Match by attribute instead; the id never goes
         through selector parsing now. */
      var out=null, outs=document.querySelectorAll("[data-pet-sigs-out]");
      for(var oi=0;oi<outs.length;oi++){
        if(outs[oi].getAttribute("data-pet-sigs-out")===pid){ out=outs[oi]; break; }
      }
      if(!out) return;
      if(out.style.display!=="none"){ out.style.display="none"; out.innerHTML=""; return; }
      out.style.display="block";
      out.innerHTML='<div class="x-note">Reading signatures&hellip;</div>';
      api("petition_sigs",{petition_id:pid},function(j){
        var sigs=(j&&j.ok&&j.sigs)||[];
        if(!sigs.length){ out.innerHTML='<div class="x-note">No signatures yet. Be the first.</div>'; return; }
        var names=[];
        for(var i=0;i<Math.min(sigs.length,10);i++){ names.push(esc(sigs[i].callsign)); }
        out.innerHTML='<div class="x-note"><b>'+sigs.length+'</b> signed: '+names.join(", ")+(sigs.length>10?" &hellip;":"")+'</div>';
      });
    };
  });
  var pc=document.getElementById("cvPetCancel");
  if(pc) pc.onclick=function(){ CREATE_OPEN=false; render(); };
  /* 2026-10-05 (P2 F2-TOAST): post-sign share affordance — two-tier native
     share with clipboard fallback, same pattern as pcShare(). */
  qsa("[data-pet-shareafter]").forEach(function(sb){
    sb.onclick=function(){
      var pid2=sb.getAttribute("data-pet-shareafter");
      var title=PET_TITLE[pid2]||"A Propaganda Factory petition";
      var link="https://www.mtcstw.com/political-hq";
      try{ if(window.PF&&typeof PF.shareUrl==="function") link=PF.shareUrl(link); }catch(e){}
      var text=title+" \u2014 sign it at "+link;
      if(navigator.share){ try{ navigator.share({title:title,text:text}).catch(function(){}); return; }catch(e){} }
      try{
        if(navigator.clipboard&&navigator.clipboard.writeText){
          navigator.clipboard.writeText(text).then(function(){ toast("Share text copied. Spread it."); },function(){ toast("Copy failed \u2014 select it manually."); });
        } else toast("Copy failed \u2014 select it manually.");
      }catch(e2){ toast("Copy failed \u2014 select it manually."); }
    };
  });
  var pcb=document.getElementById("cvPetCreate");
  if(pcb) pcb.onclick=function(){
    var err=document.getElementById("cvPetErr");
    var title=gv("cvPetTitle").trim(), target=gv("cvPetTarget").trim();
    if(!title||!target){ err.textContent="Title and target are required."; return; }
    pcb.disabled=true;
    post("petition","pe_action","petition_create",{callsign:ident().callsign,title:title,description:gv("cvPetDesc"),target:target,goal:Number(gv("cvPetGoal"))||500},function(j){
      if(j&&j.ok){
        /* 2026-10-05 (P2 F2-TOAST): record first — toast shows the new count. */
        try{ document.dispatchEvent(new CustomEvent('pf-civic-petition-created')); }catch(e){}
        toast("Live. +25 XP."+dutyFrag()); CREATE_OPEN=false; refreshPetitions();
      }
      else { err.textContent=PF.errCopy(j,"Create failed."); pcb.disabled=false; }
    });
  };
  /* script picker */
  var ts=document.getElementById("cvTopicSel");
  function showScript(){
    var box=document.getElementById("cvScriptBox"); if(!box) return;
    var topic=gv("cvTopicSel");
    var scripts=(SCRIPTS&&SCRIPTS.scripts)||[];
    var sc=null;
    for(var i=0;i<scripts.length;i++){ if(scripts[i].topic===topic){ sc=scripts[i]; break; } }
    if(!sc){ box.innerHTML=""; return; }
    var name=gv("cvMyName")||"[YOUR NAME]", st=gv("cvMyState")||"[STATE]", rep=gv("cvRepSel")||"[REP]";
    /* Escape the backend-supplied script BEFORE substitution (stored-XSS
       hardening — a malformed script row must not execute in visitors'
       browsers). The {NAME}/{STATE}/{REP} tokens are replaced with the
       already-escaped user inputs afterwards. */
    var txt=esc(sc.script).split("{NAME}").join(esc(name)).split("{STATE}").join(esc(st)).split("{REP}").join(esc(rep));
    box.innerHTML='<div class="x-pane pf-mt" ><h4>'+esc(sc.title)+'</h4><div class="x-note" style="white-space:pre-wrap">'+txt+'</div></div>';
    box.setAttribute("data-script-id",sc.id);
  }
  if(ts) ts.onchange=showScript;
  var nm=document.getElementById("cvMyName"), mst=document.getElementById("cvMyState"), rp=document.getElementById("cvRepSel");
  if(nm) nm.oninput=showScript; if(mst) mst.onchange=showScript; if(rp) rp.onchange=showScript;
  var lc=document.getElementById("cvLogContact");
  /* 2026-10-05: routes through the shared rep_contact write path — same
     POST, same +25 XP, same 2/day cap as the directory rows. (The older
     inline binding this replaced is gone; doLogContact is the single
     owner of this flow, including the pf-civic-rep-contacted dispatch.) */
  if(lc) lc.onclick=function(){ doLogContact(gv("cvRepSel"),lc,document.getElementById("cvRepErr")); };
  /* --- congressional directory bindings --- */
  var dst=document.getElementById("cvDirState");
  if(dst) dst.onchange=function(){ DIRST.st=gv("cvDirState"); fetchDir(); };
  var dq=document.getElementById("cvDirQ");
  if(dq) dq.oninput=function(){ DIRST.q=gv("cvDirQ"); paintDir(); };
  var cham=document.querySelector(".cv-cham");
  if(cham) cham.onclick=function(e){
    var b=e.target&&e.target.closest?e.target.closest("[data-ch]"):null; if(!b) return;
    DIRST.ch=b.getAttribute("data-ch");
    var btns=cham.querySelectorAll("[data-ch]");
    for(var i=0;i<btns.length;i++){ btns[i].setAttribute("aria-pressed",btns[i]===b?"true":"false"); }
    fetchDir();
  };
  /* 2026-10-05: call practice mode — rehearses against the topic-selected
     script (or the default rep-contact script); zero XP, stated in the
     overlay. */
  var pf1=document.getElementById("cvPracticeFirst");
  if(pf1) pf1.onclick=function(){ pracOpen({repName:gv("cvRepSel"),phone:""}); };
  /* Delegated: retry lives inside the painted list, rows re-paint on
     search/filter — one listener survives all of it. */
  var dl=document.getElementById("cvDirList");
  if(dl&&!dl.getAttribute("data-bound")){
    dl.setAttribute("data-bound","1");
    dl.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-dir-log],[data-dir-practice],[data-sc-toggle],[data-sc-share],[data-sc-retry],[data-sc-issue],#cvDirRetry"):null;
      if(!t) return;
      if(t.id==="cvDirRetry"){ fetchDir(); return; }
      /* 2026-10-05: voting scorecards — toggle, share, retry, issue jump. */
      if(t.hasAttribute("data-sc-toggle")){
        var bio=t.getAttribute("data-sc-toggle");
        if(SCST.open===bio){ SCST.open=null; paintDir(); }
        else { SCST.open=bio; fetchScorecard(bio); }
        return;
      }
      if(t.hasAttribute("data-sc-share")){ shareScorecard(t.getAttribute("data-sc-share")); return; }
      if(t.hasAttribute("data-sc-retry")){ fetchScorecard(t.getAttribute("data-sc-retry")); return; }
      if(t.hasAttribute("data-sc-issue")){
        var vid=t.getAttribute("data-sc-issue");
        SCST.issue=vid;
        fetchIssue(vid);
        /* fetchIssue -> paintIssue (loading state paints first). */
        try{ var p=document.getElementById("cvIssuePanel"); if(p&&p.scrollIntoView) p.scrollIntoView(); }catch(ee){}
        return;
      }
      /* 2026-10-05: call practice mode entry — per-row rehearsal. Survives
         repaints (delegated), so unreachable→retry never breaks it. */
      if(t.hasAttribute&&t.hasAttribute("data-dir-practice")){
        pracOpen({repName:t.getAttribute("data-dir-practice"),phone:t.getAttribute("data-dir-phone")||""});
        return;
      }
      doLogContact(t.getAttribute("data-dir-log"),t,document.getElementById("cvDirErr"));
    });
  }
  /* 2026-10-05: issue-view panel buttons (BACK/RETRY) — the panel repaints
     on fetchIssue, so delegation on the document survives. Bound once. */
  var de=document.documentElement;
  if(de&&!de.getAttribute("data-sc-bound")){
    de.setAttribute("data-sc-bound","1");
    de.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-issue-back],[data-issue-retry]"):null;
      if(!t) return;
      if(t.hasAttribute("data-issue-back")){
        SCST.issue=null;
        paintIssue(); paintDir();
        try{ var dl2=document.getElementById("cvDirList"); if(dl2&&dl2.scrollIntoView) dl2.scrollIntoView(); }catch(ee){}
        return;
      }
      if(t.hasAttribute("data-issue-retry")){ fetchIssue(t.getAttribute("data-issue-retry")); }
    });
  }
  /* First paint: fire the reps_list read once (Mobilizing… covers it). */
  if(DIRST.reps===null&&!DIRST.load&&!DIRST.err){ fetchDir(); }
  /* 2026-10-05 (rep-flow friction): follow the home-state picker. When the
     viewer sets/changes their home state, the directory re-filters to it —
     the rep lookup stays "your reps" with zero extra taps. Bound once. */
  var dehs=document.documentElement;
  if(dehs&&!dehs.getAttribute("data-dirhs-bound")){
    dehs.setAttribute("data-dirhs-bound","1");
    document.addEventListener("pf-home-state-changed",function(e){
      try{
        var s=e&&e.detail&&e.detail.state;
        if(typeof s==="string"&&s&&s!==DIRST.st){
          DIRST.st=s; DIRST.reps=null; DIRST.q="";
          var ds=document.getElementById("cvDirState"); if(ds) ds.value=s;
          var dq=document.getElementById("cvDirQ"); if(dq) dq.value="";
          fetchDir();
        }
      }catch(ee){}
    });
  }
  /* voter — 2026-10-05 (audit #2): voter_check failure keeps the state
     selection (VOTER.state survives) and renders an inline c-err + Retry
     instead of a blank select with no feedback.
     2026-10-05 (voter-check auth): route through PF.authGetJSONP so the
     backend can attribute the check to the callsign (auth_secret-in-GET,
     same as rep_contact_history). No session -> plain api() as before;
     the read path (vote.gov URL) is unaffected either way. */
  function voterCheck(st){
    if(!st) return;
    VOTER={state:st};
    var pp={state:st};
    function cb(j){
      VOTER=(j&&j.url)?j:{state:st,err:true};
      /* 2026-10-05 (P2 F2-TOAST): the voter check is a Civic Duty action —
         confirm it and show the new count. */
      if(j&&j.url){ try{ document.dispatchEvent(new CustomEvent('pf-civic-voter-checked')); }catch(e){}
        try{ toast("Checked."+dutyFrag()); }catch(e2){} }
      try{ render(); }catch(e){}
    }
    try{ if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,"voter_check",pp,cb); return; } }catch(e){}
    api("voter_check",pp,cb);
  }
  var vs=document.getElementById("cvVoterState");
  if(vs) vs.onchange=function(){ voterCheck(gv("cvVoterState")); };
  var vr=document.getElementById("cvVoterRetry");
  if(vr) vr.onclick=function(){ voterCheck(gv("cvVoterState")); };
  var pl=document.getElementById("cvPledge");
  if(pl) pl.onclick=function(){
    pl.disabled=true;
    var stCode=gv("cvVoterState");
    post("rep","r_action","voter_pledge",{callsign:ident().callsign,state:stCode},function(j){
      if(j&&j.ok){
        /* 2026-10-05 (pledge-share-cards): pledge landed -> resolve the
           ballot deadline, then arm the SHARE YOUR PLEDGE button. The +50
           pledge XP is paid by voter_pledge itself — nothing extra here. */
        PLEDGE_DONE=true;
        /* 2026-10-05 (P2 F2-TOAST): record first — toast shows the new
           count. Share ask follows the pledge (cvPledgeShare button). */
        try{ document.dispatchEvent(new CustomEvent('pf-civic-voter-pledged')); }catch(e){}
        toast((j.dup?"Already pledged.":"Pledged. +50 XP.")+dutyFrag()+(j.dup?"":" Share your pledge \u2192"));
        try{ armPledgeCard(stCode); }catch(e){ try{ render(); }catch(e2){} }
      }
      else { toast(PF.errCopy(j,"Pledge failed.")); }
      pl.disabled=false;
    });
  };
  /* 2026-10-05 (pledge-share-cards): SHARE YOUR PLEDGE -> phq-pledge card
     (state name, real registration deadline from ballot data, vote.gov link,
     callsign stamp, source + date). Generation pays 0 XP. After the native
     share sheet, the user banks +5 XP by verifying the public post in the
     existing POSTER SHARE tab (create_share: leg, fixed amount, NO_MULT,
     counts toward the daily cap — no new ledger prefix). */
  var pls=document.getElementById("cvPledgeShare");
  if(pls) pls.onclick=function(){
    try{
      if(!(window.PF&&PF.PHQShare)){ toast("Share unavailable."); return; }
      if(PF.skip&&PF.skip('card-pledge')){ toast("Pledge cards are paused."); return; }
      var ok=PF.PHQShare.share('phq-pledge',PLEDGE_CARD||{},
        {title:'I PLEDGED TO VOTE',link:'https://www.mtcstw.com/political-hq'});
      if(ok) setTimeout(function(){
        toast("Posted it publicly? Paste the link in the POSTER SHARE tab to bank +5 XP.");
      },1500);
    }catch(e){ toast("Share failed."); }
  };
  /* 2026-10-05 (audit #3): the civic contact-prefs form is gone — "Control the
     Signal" (notify-prefs) is the single contact-PII surface and owns the
     contact_set write path. No civic-side save binding anymore. */
  /* --- ballot center (2026-10-05): state select paints from the cached
     ballot_get&all=1 rows — no round-trip per selection. One lazy read on
     first bind; RETRY lives inside the painted box, so it needs a direct
     binding after every re-render (same pattern as cvVoterRetry). */
  var bst=document.getElementById("cvBalState");
  if(bst) bst.onchange=function(){ BAL.st=gv("cvBalState"); paintBallot(); };
  var brt=document.getElementById("cvBalRetry");
  if(brt) brt.onclick=function(){ fetchBallot(); };
  if(BAL.rows===null&&!BAL.load&&!BAL.err){ fetchBallot(); }
  /* network polls (2026-10-05): vote buttons, create form, retry. */
  bindPolls();
  /* rep contact history (rep_contact_history, AUTH): the caller's own log.
     2026-10-05 (audit #7): fetched once per page view — bind() runs on every
     re-render, and each run used to refire this authed call. LOG CONTACT
     refreshes it explicitly (the only action that mutates the log). */
  /* --- cell competitions (2026-10-05): metric toggle is delegated (the card
     re-paints on toggle) — one listener per fresh box element, matching the
     directory-retry pattern. Reads are public GET; the card hides on error. */
  var cbox=document.getElementById("cvCompBox");
  if(cbox&&!cbox.getAttribute("data-bound")){
    cbox.setAttribute("data-bound","1");
    cbox.addEventListener("click",function(e){
      var b=e.target&&e.target.closest?e.target.closest("[data-comp-metric]"):null;
      if(!b) return;
      var m=b.getAttribute("data-comp-metric");
      if(m!==COMP.metric&&(m==="rep_contacts"||m==="campaign_calls")){
        COMP.metric=m; paintComp(); fetchComp();
      }
    });
  }
  fetchComp();
  fetchHist();
  /* 2026-10-05 (wave pressure-campaigns FE): pressure-card bindings. */
  pressureBind(qsa);
}
/* 2026-10-05: legislation silo integration — key-player names on bill cards
   dispatch pf-legislation-member; filter THIS directory to that member and
   scroll it into view. Decoupled via event: the legislation silo never
   touches civic internals, and this listener is a no-op when the directory
   pane isn't mounted. */
document.addEventListener("pf-legislation-member",function(e){
  try{
    var d=(e&&e.detail)||{};
    var nm=String(d.name||"").trim(); if(!nm) return;
    if(!document.getElementById("cvDirList")) return; /* directory not mounted */
    DIRST.st=""; DIRST.ch=""; DIRST.q=nm;
    var st=document.getElementById("cvDirState"); if(st) st.value="";
    var q=document.getElementById("cvDirQ"); if(q) q.value=nm;
    var btns=document.querySelectorAll(".cv-cham [data-ch]");
    for(var i=0;i<btns.length;i++){
      btns[i].setAttribute("aria-pressed",btns[i].getAttribute("data-ch")===""?"true":"false");
    }
    fetchDir();
    var pane=document.getElementById("pf-civic");
    if(pane&&pane.scrollIntoView) pane.scrollIntoView();
  }catch(err){}
});
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
