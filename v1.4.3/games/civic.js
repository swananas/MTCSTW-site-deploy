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
/* 2026-10-05: cell competitions card — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-civic .cv-cmp-tog{display:flex;gap:8px;margin:8px 0}
#pf-civic .cv-cmp-tog .c-btn{flex:1;min-height:44px;padding:8px 4px}
#pf-civic .cv-cmp-tog .c-btn[aria-pressed="true"]{outline:3px solid #f5ead6;outline-offset:-3px}
#pf-civic .cv-cmp-row{border:1px solid #4a4a4a;padding:10px 12px;margin:8px 0;overflow-wrap:anywhere}
#pf-civic .cv-cmp-rank{display:inline-block;min-width:36px;font-weight:900;font-size:16px;color:#ffd166}
#pf-civic .cv-cmp-name{font-weight:900;font-size:15px}
#pf-civic .cv-cmp-you{border-color:#ffd166;background:rgba(255,209,102,.08)}
#pf-civic .cv-cmp-tag{display:inline-block;font-size:11px;font-weight:900;color:#0d0d0d;background:#ffd166;padding:2px 8px;margin-left:8px;vertical-align:middle}
#pf-civic .cv-cmp-win{border:1px solid #ffd166;padding:12px;margin:8px 0;background:rgba(193,18,31,.12)}
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
    +'<button class="c-btn" id="cvLogContact">LOG CONTACT (+25 XP)</button><div class="c-err" id="cvRepErr"></div>'
    +'<div class="x-note">XP has no cash value. Stakes are final.</div>'
    /* 2026-10-03: rep_contact_history (AUTH) — the caller's own contact log. */
    +'<div id="cvHistBox" style="margin-top:8px"><div class="x-note">Reading your contact log&hellip;</div></div>';
  if(REPS&&REPS.note){ h+='<div class="x-note">'+esc(REPS.note)+'</div>'; }
  h+='</div>';
  /* --- cell competitions (2026-10-05): weekly cell-vs-cell civic race.
     The card stays empty until cellcomp_current lands ok (fail-soft). It
     sits on the rep-contact pane — logging a contact is how cells score. */
  h+='<div id="cvCompBox"></div>';
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
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
