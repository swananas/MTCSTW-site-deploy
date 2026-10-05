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
/* --- petition share kits (2026-10-05, weave #3) ---
   Every petition ships an auto-generated kit: 1 poster (phq-petition
   painter) + 1 caption from the live petition_kit payload. Regeneration is
   a refetch — the payload is computed live, so REFRESH KIT always shows
   the current sig count.
   XP wiring: kit GENERATION = 0 XP (creation XP already paid by
   petition_create 'pet-create-<id>' +25). Kit SHARING rides the existing
   poster_share 'create_share:<cshash8>:<devhash8>:<proofhash8>:<chi_day>'
   leg (+5, NO_MULT, counts toward the daily cap, proof-verified).
   Political plugin registry interface: fetchPluginData(plugin, id) —
   fail-soft; the registry isn't landed yet, so the petition_kit backend
   GET is the primary path and a registry hit only overrides it.
   KILL: ?pf_off=kit-petition hides every kit surface. */
var KIT_OFF=false;
try{ KIT_OFF=!!(window.PF&&PF.skip('kit-petition')); }catch(e){}
function kitLink(pid){ return 'https://mtcstw.com/political-hq?pet='+encodeURIComponent(pid); }
function getPetitionKit(pid,cb){
  function viaBackend(){ api('petition_kit',{petition_id:pid},function(j){ cb(j&&j.ok?j:null); }); }
  try{
    var f=window.fetchPluginData;
    if(typeof f!=='function'){ viaBackend(); return; }
    var r=f('petition',pid);
    if(r&&typeof r.then==='function'){
      r.then(function(j){ if(j&&j.ok&&j.title) cb(j); else viaBackend(); },function(){ viaBackend(); });
      return;
    }
    if(r&&r.ok&&r.title){ cb(r); return; }
  }catch(e){}
  viaBackend();
}
function kitCaptionOf(kit){ return (kit&&(kit.caption_text||''))||''; }
function copyText(t,okMsg){
  function done(){ toast(okMsg||'Copied.'); }
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(done,function(){ legacyCopy(t,done); });
      return;
    }
  }catch(e){}
  legacyCopy(t,done);
}
function legacyCopy(t,done){
  try{
    var ta=document.createElement('textarea'); ta.value=t;
    ta.style.cssText='position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta); done();
  }catch(e){ toast('Copy failed — long-press to copy.'); }
}
function phqKit(){
  try{ return (window.PF&&PF.PHQShare)?PF.PHQShare:null; }catch(e){ return null; }
}
function kitPaintPreview(box,kit){
  box.innerHTML='';
  var PHQ=phqKit(); if(!PHQ) return;
  var cv=null;
  try{ cv=PHQ.paint('phq-petition',kit.poster_data||{}); }catch(e){}
  if(!cv) return;
  try{
    cv.style.cssText='width:100%;max-width:340px;height:auto;border:1px solid #3a3a3a;display:block;margin:6px auto;';
    box.appendChild(cv);
  }catch(e){}
}
function kitGet(out){
  try{ return JSON.parse(out.getAttribute('data-kit-json')||'null'); }catch(e){ return null; }
}
/* SHARE KIT panel: poster preview + download/share + caption copy +
   REFRESH KIT (refetch = regenerate) + LOG MY SHARE proof capture
   (poster_share -> create_share: leg, +5 XP, NO_MULT, daily-capped). */
function paintKit(out,pid){
  var kit=kitGet(out); if(!kit) return;
  var cap=kitCaptionOf(kit);
  var PHQ=phqKit();
  out.innerHTML='<div class="x-note"><b>SHARE KIT</b> — poster + caption, live numbers (launched '+esc(kit.source_date||'')+').</div>'
    +'<div data-kit-preview></div>'
    +'<textarea class="c-in" rows="4" readonly>'+esc(cap)+'</textarea>'
    +'<button class="c-btn cp-mbtn" data-kit-copy>COPY CAPTION</button> '
    +(PHQ?'<button class="c-btn cp-mbtn" data-kit-dl>DOWNLOAD POSTER</button> '
    +'<button class="c-btn cp-mbtn" data-kit-share>SHARE POSTER</button> ':'')
    +'<button class="c-btn cp-mbtn" data-kit-refresh>REFRESH KIT</button>'
    +'<div class="x-note" style="margin-top:6px"><b>LOG MY SHARE (+5 XP)</b> — post the poster publicly (keep the petition link in the post), then paste the link:'
    +'<br><input class="c-in" data-kit-proof placeholder="https://\u2026 link to your public post" maxlength="2000">'
    +' <button class="c-btn cp-mbtn" data-kit-proof-go>SUBMIT PROOF</button>'
    +'<div class="c-err" data-kit-proof-out></div>'
    +'<div class="x-note">XP has no cash value. Stakes are final.</div></div>';
  kitPaintPreview(out.querySelector('[data-kit-preview]'),kit);
  function q1(sel){ try{ return out.querySelector(sel); }catch(e){ return null; } }
  var cp=q1('[data-kit-copy]'); if(cp) cp.onclick=function(){ copyText(cap,'Caption copied.'); };
  var dl=q1('[data-kit-dl]'); if(dl) dl.onclick=function(){
    var P2=phqKit(); if(P2) P2.save('phq-petition',kit.poster_data||{});
  };
  var sh=q1('[data-kit-share]'); if(sh) sh.onclick=function(){
    var P3=phqKit(); if(!P3) return;
    var link=kitLink(pid);
    try{ if(window.PF&&PF.shareUrl) link=PF.shareUrl(link); }catch(e){}
    P3.share('phq-petition',kit.poster_data||{},{link:link});
  };
  var rf=q1('[data-kit-refresh]'); if(rf) rf.onclick=function(){
    rf.disabled=true;
    getPetitionKit(pid,function(k2){
      rf.disabled=false;
      if(!k2){ toast('Refresh failed \u2014 retry.'); return; }
      try{ out.setAttribute('data-kit-json',JSON.stringify(k2)); }catch(e){}
      paintKit(out,pid);
      toast('Kit refreshed \u2014 live numbers.');
    });
  };
  var pg=q1('[data-kit-proof-go]'); if(pg) pg.onclick=function(){
    var inp=q1('[data-kit-proof]'), msg=q1('[data-kit-proof-out]');
    var proof=(inp&&inp.value||'').trim();
    if(!/^https?:\/\//i.test(proof)){ if(msg) msg.textContent='Paste the link to your public post.'; return; }
    pg.disabled=true;
    var id2=ident();
    post('readcreate','rc_action','poster_share',
      {callsign:id2.callsign,device:id2.device,story_url:kitLink(pid),proof_url:proof},
      function(j){
        pg.disabled=false;
        if(j&&j.ok){ if(msg) msg.textContent=''; try{ inp.value=''; }catch(e){} toast('Share logged. +5 XP.'); }
        else if(msg){ msg.textContent=PF.errCopy(j,'Proof didn\u2019t verify. Check it\u2019s public and carries the petition link.'); }
      });
  };
}
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
      /* 2026-10-05: petition share kit — poster + caption from the live kit
         payload. Killed by ?pf_off=kit-petition. */
      +(KIT_OFF?'':'<button class="c-btn cp-mbtn" data-pet-kit="'+esc(p.id)+'">SHARE KIT</button>'
      +'<div class="x-note" data-pet-kit-out="'+esc(p.id)+'" style="display:none"></div>')
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
    +'<button class="c-btn" id="cvLogContact">LOG CONTACT (+25 XP)</button><div class="c-err" id="cvRepErr"></div>'
    +'<div class="x-note">XP has no cash value. Stakes are final.</div>'
    /* 2026-10-03: rep_contact_history (AUTH) — the caller's own contact log. */
    +'<div id="cvHistBox" style="margin-top:8px"><div class="x-note">Reading your contact log&hellip;</div></div>';
  if(REPS&&REPS.note){ h+='<div class="x-note">'+esc(REPS.note)+'</div>'; }
  h+='</div>';
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
  /* Petition share kits (2026-10-05): per-card SHARE KIT toggle + panel.
     Attribute-matched (audit #5 idiom) — the id never goes through
     selector parsing. */
  qsa("[data-pet-kit]").forEach(function(b){
    b.onclick=function(){
      var pid=b.getAttribute("data-pet-kit");
      var out=null, outs=document.querySelectorAll("[data-pet-kit-out]");
      for(var oi=0;oi<outs.length;oi++){
        if(outs[oi].getAttribute("data-pet-kit-out")===pid){ out=outs[oi]; break; }
      }
      if(!out) return;
      if(out.style.display!=="none"&&out.getAttribute("data-kit-loaded")==="1"){
        out.style.display="none"; return;
      }
      out.style.display="block";
      if(out.getAttribute("data-kit-loaded")==="1"){ paintKit(out,pid); return; }
      out.innerHTML='<div class="x-note">Forging your share kit&hellip;</div>';
      getPetitionKit(pid,function(kit){
        if(!kit){ out.innerHTML='<div class="x-note">Kit unavailable &mdash; retry.</div>'; return; }
        out.setAttribute("data-kit-loaded","1");
        try{ out.setAttribute("data-kit-json",JSON.stringify(kit)); }catch(e){}
        paintKit(out,pid);
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
  if(lc) lc.onclick=function(){
    var err=document.getElementById("cvRepErr");
    var rep=gv("cvRepSel"); if(!rep){ err.textContent="Pick a rep first."; return; }
    var box=document.getElementById("cvScriptBox");
    var sid=box?box.getAttribute("data-script-id"):"";
    lc.disabled=true;
    post("rep","r_action","rep_contact",{callsign:ident().callsign,rep_name:rep,method:gv("cvMethod"),script_used:sid||""},function(j){
      if(j&&j.ok){ toast("Contact logged. +25 XP."); fetchHist(true); }
      else { err.textContent=PF.errCopy(j,"Log failed."); }
      lc.disabled=false;
    });
  };
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
