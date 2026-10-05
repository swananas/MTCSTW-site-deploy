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
/* 2026-10-05: congressional directory — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-civic .cv-dirfilters .c-in{width:100%;box-sizing:border-box;margin-bottom:8px}
#pf-civic .cv-t44{min-height:44px}
#pf-civic .cv-cham{display:flex;gap:8px;margin:8px 0}
#pf-civic .cv-cham .c-btn{flex:1;min-height:44px;padding:8px 4px}
#pf-civic .cv-cham .c-btn[aria-pressed="true"]{outline:3px solid #f5ead6;outline-offset:-3px}
#pf-civic .cv-dirrow{border:1px solid #4a4a4a;padding:12px;margin:12px 0;overflow-wrap:anywhere}
#pf-civic .cv-dirname{font-weight:900;font-size:16px;margin-bottom:4px}
#pf-civic .cv-pb{display:inline-block;min-width:20px;text-align:center;font-weight:900;font-size:12px;border:1px solid #f5ead6;padding:1px 6px;margin-left:8px;vertical-align:middle}
#pf-civic .cv-pb-D{color:#8fbfff}#pf-civic .cv-pb-R{color:#ff8f8f}#pf-civic .cv-pb-I{color:#c9bfa8}
#pf-civic .cv-diractions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
#pf-civic .cv-xpb{display:inline-block;font-weight:900;font-size:12px;color:#ffd166;border:1px solid #ffd166;padding:6px 10px;white-space:nowrap}
/* 2026-10-05: call practice mode — frontend-only rehearsal overlay.
   Mobile-first: 44px+ targets, no horizontal scroll, timer pinned. */
#pfPracOv{position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;background:rgba(8,8,8,.96);overflow-y:auto;display:none;-webkit-overflow-scrolling:touch}
#pfPracOv .pfprac-card{max-width:640px;margin:0 auto;padding:16px 16px 48px;color:#f5ead6;box-sizing:border-box}
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
#pfPracOv .pfprac-warm{font-size:24px;font-weight:900;color:#f5ead6;margin:16px 0 8px}
</style>
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
/* 2026-10-05: congressional directory state. reps_list is the only new read;
   the rep_contact write path below is shared with the legacy "Contact your
   rep" pane — no new reward mechanics. */
var DIRST={st:"",ch:"",q:"",reps:null,load:false,err:false};
var STATES_F=null; /* STATES + DC, filter-only (STATES itself untouched). */
/* 6A-R7: voter-pledge poster state — set on a successful pledge. */
var PLEDGE_DONE=false, PLEDGE_STATE_NAME='';
function pledgeStateName(code){
  for(var i=0;i<STATES.length;i++) if(STATES[i][0]===code) return STATES[i][1];
  return code||'';
}
/* 6A-R7: pledge-poster custom painter (1080x1350, PF brand, JOIN THE FIGHT.
   CTA standard). Stamps the pledged state; the callsign stamp rides via
   PFShare.shareImage -> stampCallsign (idempotent). */
function pledgePoster(done){
  function fail(){ try{ done(null); }catch(e){} }
  try{
    var cv=document.createElement('canvas'); cv.width=1080; cv.height=1350;
    var x=cv.getContext('2d'); if(!x){ fail(); return; }
    var st=String(PLEDGE_STATE_NAME||'').toUpperCase().slice(0,24);
    x.fillStyle='#0d0d0d'; x.fillRect(0,0,1080,1350);
    x.strokeStyle='#c1121f'; x.lineWidth=18; x.strokeRect(16,16,1048,1318);
    x.strokeStyle='#f5ead6'; x.lineWidth=3; x.strokeRect(52,52,976,1246);
    x.textAlign='center';
    x.fillStyle='#f5ead6'; x.font='700 34px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605',540,160);
    x.fillStyle='#c1121f'; x.font='900 96px "Arial Black",Arial,sans-serif';
    x.fillText('I PLEDGED',540,340); x.fillText('TO VOTE',540,450);
    if(st){
      x.fillStyle='#f5ead6'; x.font='900 64px "Arial Black",Arial,sans-serif';
      x.fillText(st,540,590);
    }
    x.fillStyle='#c9bfa8'; x.font='400 38px Arial,sans-serif';
    x.fillText('One ballot. One soldier. Zero excuses.',540,700);
    x.fillText('Pledge yours. Register. Show up.',540,756);
    x.fillStyle='#c1121f'; x.font='900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM',540,1182);
    x.fillText('JOIN THE FIGHT.',540,1242);
    done(cv);
  }catch(e){ fail(); }
}
try{
  if(window.PFShare&&PFShare.setPoster) PFShare.setPoster('voter-pledge',pledgePoster);
  else document.addEventListener('pf-share-ready',function h(){
    document.removeEventListener('pf-share-ready',h);
    try{ if(window.PFShare&&PFShare.setPoster) PFShare.setPoster('voter-pledge',pledgePoster); }catch(e){}
  });
}catch(e){}
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=5) fin(); }
  setTimeout(fin,15000);
  api("petition_list",{},function(j){ P=j; one(); });
  api("rep_list",{},function(j){ REPS=j; one(); });
  api("rep_scripts",{},function(j){ SCRIPTS=j; one(); });
  /* 2026-10-03: voter_pledge_stats (public) — aggregate pledge counts. */
  api("voter_pledge_stats",{},function(j){ VSTATS=j; one(); });
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
function stateOpts(sel){
  var h='<option value="">Select state&hellip;</option>';
  for(var i=0;i<STATES.length;i++){
    h+='<option value="'+STATES[i][0]+'"'+(sel===STATES[i][0]?' selected':'')+'>'+esc(STATES[i][1])+'</option>';
  }
  return h;
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
  var h='<div class="cv-dirrow">'
    +'<div class="cv-dirname">'+esc(nm)+partyBadge(r.party)+'</div>'
    +'<div class="x-note">'+(chLabel?esc(chLabel)+" &middot; ":"")+loc+'</div>'
    +'<div class="cv-diractions">';
  if(telHref) h+='<a class="c-btn cv-t44" href="'+esc(telHref)+'">CALL</a>';
  else h+='<span class="x-note">no phone listed</span>';
  if(curl) h+=' <a class="c-btn cv-t44" href="'+esc(curl)+'" target="_blank" rel="noopener">CONTACT</a>';
  /* +25 XP badge rides next to LOG CONTACT (CEO requirement 2026-10-05) —
     the reward is surfaced, not new. */
  h+=' <button type="button" class="c-btn cv-t44" data-dir-log="'+esc(nm)+'">LOG CONTACT</button>'
    +'<span class="cv-xpb">+25 XP</span>'
    /* 2026-10-05: call practice mode — rehearsal entry point per row.
       Practice earns zero XP (stated in the overlay); the real call logs
       through the same doLogContact() path as LOG CONTACT. */
    +' <button type="button" class="c-btn cv-t44" data-dir-practice="'+esc(nm)+'" data-dir-phone="'+esc(telHref)+'">PRACTICE FIRST</button>';
  h+='</div></div>';
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
  var h="";
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
      toast("Contact logged \u2014 +25 XP earned.");
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
    var parts=filled.split(/\n\s*\n/), i, t;
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
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(p.title)+'</div>'
      +'<div class="x-note">Target: '+esc(p.target)+' &bull; by '+esc(p.creator)+'</div>'
      +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+(p.pct||0)+'%"></div></div>'
      +'<div class="x-note">'+(p.sig_count||0)+' / '+p.goal+' signatures ('+(p.pct||0)+'%)</div>'
      +'<button class="c-btn cp-mbtn" data-pet-sign="'+esc(p.id)+'">SIGN (+10 XP)</button> '
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
  /* --- contact your rep --- */
  h+='<div class="x-pane"><h4>Contact your rep</h4>';
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
  /* --- congressional directory (2026-10-05): full member directory.
     Server filters on state/chamber (reps_list); name search is
     client-side. Renders only what the API returns — no invented data. */
  h+='<div class="x-pane"><h4>Find your reps</h4>'
    +'<div class="x-note">Every logged contact: <b>+25 XP</b> (2/day).</div>'
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
      /* 6A-R7: voter pledge -> PFShare pledge-poster (?ref= rides the link). */
      +(PLEDGE_DONE?'<button class="c-btn" id="cvPledgeShare">SHARE YOUR PLEDGE \u2192</button>':'')
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
}
function gv(id){ var e=document.getElementById(id); return e?e.value:""; }
function bind(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  qsa("[data-pet-sign]").forEach(function(b){
    b.onclick=function(){
      var pid=b.getAttribute("data-pet-sign");
      b.disabled=true;
      post("petition","pe_action","petition_sign",{callsign:ident().callsign,petition_id:pid},function(j){
        if(j&&j.ok){ toast(j.dup?"Already signed.":"Signed. +10 XP."); refreshPetitions(); }
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
  var pcb=document.getElementById("cvPetCreate");
  if(pcb) pcb.onclick=function(){
    var err=document.getElementById("cvPetErr");
    var title=gv("cvPetTitle").trim(), target=gv("cvPetTarget").trim();
    if(!title||!target){ err.textContent="Title and target are required."; return; }
    pcb.disabled=true;
    post("petition","pe_action","petition_create",{callsign:ident().callsign,title:title,description:gv("cvPetDesc"),target:target,goal:Number(gv("cvPetGoal"))||500},function(j){
      if(j&&j.ok){ toast("Petition launched. +25 XP."); CREATE_OPEN=false; refreshPetitions(); }
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
     POST, same +25 XP, same 2/day cap as the directory rows. */
  if(lc) lc.onclick=function(){ doLogContact(gv("cvRepSel"),lc,document.getElementById("cvRepErr")); };
  /* 2026-10-05: call practice mode — rehearses against the topic-selected
     script (or the default rep-contact script); zero XP, stated in the
     overlay. */
  var pf1=document.getElementById("cvPracticeFirst");
  if(pf1) pf1.onclick=function(){ pracOpen({repName:gv("cvRepSel"),phone:""}); };
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
  /* Delegated: retry lives inside the painted list, rows re-paint on
     search/filter — one listener survives all of it. */
  var dl=document.getElementById("cvDirList");
  if(dl&&!dl.getAttribute("data-bound")){
    dl.setAttribute("data-bound","1");
    dl.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-dir-log],[data-dir-practice],#cvDirRetry"):null;
      if(!t) return;
      if(t.id==="cvDirRetry"){ fetchDir(); return; }
      /* 2026-10-05: call practice mode entry — per-row rehearsal. Survives
         repaints (delegated), so unreachable→retry never breaks it. */
      if(t.hasAttribute&&t.hasAttribute("data-dir-practice")){
        pracOpen({repName:t.getAttribute("data-dir-practice"),phone:t.getAttribute("data-dir-phone")||""});
        return;
      }
      doLogContact(t.getAttribute("data-dir-log"),t,document.getElementById("cvDirErr"));
    });
  }
  /* First paint: fire the reps_list read once (Mobilizing… covers it). */
  if(DIRST.reps===null&&!DIRST.load&&!DIRST.err){ fetchDir(); }
  /* voter — 2026-10-05 (audit #2): voter_check failure keeps the state
     selection (VOTER.state survives) and renders an inline c-err + Retry
     instead of a blank select with no feedback. */
  function voterCheck(st){
    if(!st) return;
    VOTER={state:st};
    api("voter_check",{state:st},function(j){
      VOTER=(j&&j.url)?j:{state:st,err:true};
      try{ render(); }catch(e){}
    });
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
        /* 6A-R7: pledge landed -> arm the share-poster button. */
        PLEDGE_DONE=true; PLEDGE_STATE_NAME=pledgeStateName(stCode);
        toast(j.dup?"Already pledged.":"Pledged. +50 XP.");
        try{ render(); }catch(e){}
      }
      else { toast(PF.errCopy(j,"Pledge failed.")); }
      pl.disabled=false;
    });
  };
  /* 6A-R7: pledge-poster share — ?ref= rides PF.shareUrl on the link. */
  var pls=document.getElementById("cvPledgeShare");
  if(pls) pls.onclick=function(){
    try{
      if(!(window.PFShare&&PFShare.shareImage)){ toast("Share unavailable."); return; }
      pledgePoster(function(cv){
        if(!cv){ toast("Poster failed \u2014 try again."); return; }
        PFShare.shareImage(cv,'pfn-voter-pledge.png','I PLEDGED TO VOTE','voter-pledge',
          { link:'https://www.mtcstw.com/political-hq' });
      });
    }catch(e){ toast("Share failed."); }
  };
  /* 2026-10-05 (audit #3): the civic contact-prefs form is gone — "Control the
     Signal" (notify-prefs) is the single contact-PII surface and owns the
     contact_set write path. No civic-side save binding anymore. */
  /* rep contact history (rep_contact_history, AUTH): the caller's own log.
     2026-10-05 (audit #7): fetched once per page view — bind() runs on every
     re-render, and each run used to refire this authed call. LOG CONTACT
     refreshes it explicitly (the only action that mutates the log). */
  fetchHist();
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
