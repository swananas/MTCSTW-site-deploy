/* games/master-calendar.js  |  PF v1.4.3 | THE WAR CALENDAR: the mission board.
   One board aggregating every dated thing in the movement: IRL mobilizations,
   Solidarity Draw, War Report Mondays, fan-vote windows, medal resets,
   MIDTERM BLITZ end, Discord daily/weekly routines. Server-driven via the
   `calendar_events` BE action so the site and Discord routines stay in sync
   (single source of truth); mobilizations merge in from the events platform's
   `event_list` rail (read-only here — the events silo owns writes).

   WS-8 SECTION TEARDOWN (2026-10-06, CEO-approved): the War Calendar is a
   MISSION BOARD, not a database. Intel Cards (P2) sorted by IMPACT-WEIGHT
   (the Next Move ladder — mcImpact(), documented below), NOT chronology.
   The impact sort is LABELED ("SORTED BY IMPACT") with a CHRONOLOGICAL
   TOGGLE (Psych gate — labeled, reversible, user-controlled). Each card:
   time badge ("TODAY", "THIS WEEKEND", ...), the pre-existing +50 XP RSVP
   reward line (display only — the irl rail mints it, this module mints
   nothing), P8 social proof (REAL RSVP counts or suppressed — never
   invented), and one-tap RSVP as DEPLOY -> (red DEPLOY-family button, the
   card's single mission CTA). Post-RSVP the card swaps to an Action Bar
   (P6): SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK
   (attendance confirm = the event's field-report composer).
   MAP is the second tab — it scrolls to the protest/event map lazy chunk
   (civic-events.js, OSM link-outs, never fetched until scrolled near).

   CTA discipline: DEPLOY -> for mission actions (red allowed); REPORT BACK
   for close-the-loop; card actions and doorways are text links; JOIN THE
   FIGHT. never appears here (RSVP is callsign-gated — enlistment copy would
   be a lie). No "donate", no rogue verbs. Red = CTAs, active states,
   figures-that-matter only.
   Zero new XP mechanics. Zero new backend writes: RSVP rides the
   PRE-EXISTING irl rail (type:'irl', i_action:'event_rsvp') that events.js
   already uses — same write, new surface.
   LAYERING: a game silo like civic-events.js. Reads via JSONP
   (self-contained api()). It never reaches into another silo's internals.
   FAIL-OPEN: either feed can die and the board renders from the other; a
   card that can't render renders nothing.
   KILL: ?pf_off=mastercal  or  localStorage pf_disabled_v1='["mastercal"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('mastercal')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-mastercal">
<div class="fe-block pf-override-block pf-silo" id="pf-mastercal">
<h2>The War Calendar</h2>
<div class="c-tag">Every fight, every deadline, every briefing — one calendar. Never miss a mobilization.</div>
<div id="xMasterCal"><div class="c-load">Reading the board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* URLs come from our own backend, but never trust a scheme — only allow
   relative paths and http(s). Anything else falls back to /events. */
function safeUrl(u){
  var s=String(u==null?'':u).trim();
  /* NB: this file stages the inner script inside a template literal, so the
     regex below is written with doubled backslashes — the browser receives
     /^(https?:\/\/|\/)/i after template evaluation. */
  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;
  return '/events';
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfMcCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement('div'); t.textContent=m;
  t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* P-pattern access, fail-open (the library stages before the games bundles). */
function mcPat(){ try{ return (window.PF&&window.PF.patterns)||null; }catch(e){ return null; } }
/* Widget styles, head-injected once. Red = mission CTA + active tab +
   figures-that-matter only; badges are neutral (no trend semantics). */
function mcCss(){
  if(document.getElementById('pf-mc-css')) return;
  var s=document.createElement('style'); s.id='pf-mc-css';
  s.textContent=
    '.mc-hero{margin:0 0 12px}'
    +'.mc-tabs{display:flex;gap:8px;margin:0 0 10px}'
    +'.mc-tab{background:transparent;border:1px solid #666;color:#fff;font:bold 12px monospace;letter-spacing:1px;padding:9px 16px;cursor:pointer}'
    +'.mc-tab-on{background:#c1121f;border-color:#c1121f}'
    +'.mc-sortbar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}'
    +'.mc-sortlabel{font:bold 11px monospace;letter-spacing:1px;color:#e8b64c}'
    +'.mc-tbadge{display:inline-block;background:#222;border:1px solid #555;color:#fff;font:bold 10px monospace;letter-spacing:1px;padding:3px 8px;margin:0 0 6px}'
    +'.mc-xp{font:bold 11px monospace;color:#c1121f;letter-spacing:1px;margin:6px 0 2px}'
    +'.mc-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px}'
    +'.mc-tlink{font:bold 11px monospace;color:#fff;text-decoration:underline}'
    +'.mc-youin{font:bold 12px monospace;color:#27ae60;letter-spacing:1px;margin:8px 0 2px}'
    +'.mc-card{margin:0 0 12px}'
    +'.mc-empty{border:1px solid #333;background:#101010;padding:16px;font:13px Arial;color:#aaa}';
  try{ document.head.appendChild(s); }catch(e){}
}
/* ---------- the Next Move ladder: impact-weight classifier ----------
   Street action outranks everything (that's the point of the movement);
   imminence beats chronology via the recency boost; real RSVP momentum
   breaks ties. Past items score off the board (never rendered). No XP is
   minted here — weight is display order only. */
var KIND_LABEL={irl:'STREET',draw:'DRAW',warreport:'WAR REPORT',fanvote:'FAN VOTE',medals:'MEDALS',offensive:'OFFENSIVE',discord:'DISCORD'};
var KIND_W={offensive:90,irl:85,warreport:60,fanvote:55,medals:50,draw:40,discord:30};
function normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }
function mcImpact(it){
  var w=0;
  if(it.src==='event'){ w+=100; }
  else { w+=(KIND_W[it.kind]||40); }
  var dt=it.ts-Date.now();
  if(dt<0) return -100000;
  if(dt<24*3600*1000) w+=30;
  else if(dt<7*86400*1000) w+=15;
  w+=Math.min(Number(it.rsvp_count)||0,25);
  return w;
}
/* Chicago date parts for a UTC-ms timestamp. */
function chiParts(ts){
  try{
    var ps=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }
    return {y:+o.year,m:+o.month,d:+o.day};
  }catch(e){ var d=new Date(ts); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }
}
function chiWeekday(ts){
  try{
    var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(ts));
    return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;
  }catch(e){ return new Date(ts).getDay(); }
}
/* Time badges — availability is the dominant filter for volunteer action. */
function mcBadge(ts){
  try{
    var p=chiParts(ts), n=chiParts(Date.now());
    var dayMs=86400000;
    var d0=Date.UTC(n.y,n.m-1,n.d), d1=Date.UTC(p.y,p.m-1,p.d);
    var diff=Math.round((d1-d0)/dayMs);
    if(diff<0) return '';
    if(diff===0) return 'TODAY';
    if(diff===1) return 'TOMORROW';
    var wd=chiWeekday(ts);
    if((wd===0||wd===6)&&diff<=7) return 'THIS WEEKEND';
    if(diff<7) return 'THIS WEEK';
    if(diff<14) return 'NEXT WEEK';
    return '';
  }catch(e){ return ''; }
}
function chiDate(ts){
  try{
    var s=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(normTs(ts)));
    return s.replace(' AM','am').replace(' PM','pm');
  }catch(e){ return ''; }
}
/* ---------- feeds ---------- */
var root=null, calFeed=[], evFeed=[], sortMode='impact', rsvpd={}, rsvpBusy={};
function normCal(list){
  var out=[], i, e;
  for(i=0;i<(list||[]).length;i++){
    e=list[i]||{};
    out.push({src:'cal',kind:String(e.kind||''),title:String(e.title||'Upcoming'),
      ts:normTs(e.ts),url:safeUrl(e.url||'/events'),
      dateLabel:String(e.date_label||chiDate(e.ts)),detail:String(e.detail||'')});
  }
  return out;
}
function normEv(list){
  var out=[], i, e;
  for(i=0;i<(list||[]).length;i++){
    e=list[i]||{};
    out.push({src:'event',id:String(e.id||''),title:String(e.title||'Mobilization'),
      ts:normTs(e.event_at),type:String(e.type||'event'),
      location:String(e.location||''),rsvp_count:Number(e.rsvp_count)||0,
      desc:String(e.description||'')});
  }
  return out;
}
/* ---------- P1 hero (fail-open fallback mirrors the pattern shape) ---------- */
function mcHero(){
  var PAT=mcPat();
  if(PAT) return '<div class="mc-hero">'+PAT.hero({kicker:'WAR CALENDAR',
    mission:'Pick your fight. Impact first.',
    sub:'Every mobilization, deadline, and briefing — ranked by what moves the needle.'})+'</div>';
  return '<div class="mc-hero"><div style="border-top:4px solid #c1121f;background:#0a0a0a;padding:14px 16px;">'
    +'<div style="color:#c1121f;font-weight:900;font-size:12px;letter-spacing:2px;">WAR CALENDAR</div>'
    +'<div style="color:#fff;font-weight:900;font-size:18px;">Pick your fight. Impact first.</div></div></div>';
}
/* ---------- P8 social proof: real counts render, anything else is suppressed ---------- */
function mcProof(n,txt){
  var PAT=mcPat();
  if(PAT) return PAT.proof({count:n,text:txt});
  n=Number(n); if(!(n>0)) return '';
  return '<p style="font:12px monospace;color:#aaa;"><b style="color:#fff;">'+n.toLocaleString('en-US')+'</b> '+esc(txt)+'</p>';
}
/* ---------- P6 post-RSVP Action Bar: fixed order, real destinations ---------- */
function mcActionBar(id){
  var PAT=mcPat();
  var urls={shareUrl:'/events#e='+id,cellUrl:'/cells',reportUrl:'/events#e='+id};
  if(PAT) return PAT.actionBar(urls);
  return '<nav style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font:bold 11px monospace;">'
    +'<a href="/events#e='+esc(id)+'" style="color:#fff;">SHARE THIS INTEL</a>'
    +'<a href="/cells" style="color:#fff;">TAKE THIS TO YOUR CELL</a>'
    +'<a href="/events#e='+esc(id)+'" style="color:#fff;">REPORT BACK</a></nav>';
}
/* RSVP rides the PRE-EXISTING irl rail (type:'irl', i_action:'event_rsvp') —
   the same write events.js performs. This module mints nothing. */
function postIrl(cAction,params,cb){
  var body={type:'irl',i_action:cAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
  try{
    var o={method:'POST',headers:{'Content-Type':'application/json'},body:bodyStr}, c=null, t=null;
    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
    fetch(BACKEND,o)
      .then(function(r){ return r.json(); })
      .then(function(j){ if(t) clearTimeout(t); done(j); })
      .catch(function(){ if(t) clearTimeout(t); done(null); });
  }catch(e){ done(null); }
}
function doRsvp(id,btn){
  var me=ident();
  if(!me.callsign){ toast('Claim your callsign first (Daily Orders).'); return; }
  if(rsvpBusy[id]) return; rsvpBusy[id]=1;
  if(btn) btn.disabled=true;
  postIrl('event_rsvp',{callsign:me.callsign,device:me.device,event_id:id},function(j){
    rsvpBusy[id]=0;
    if(!j||!j.ok){ toast((j&&j.err)||'RSVP failed.'); if(btn) btn.disabled=false; return; }
    rsvpd[id]=1;
    for(var i=0;i<evFeed.length;i++) if(evFeed[i].id===id) evFeed[i].rsvp_count=(j.rsvps!=null?j.rsvps:(evFeed[i].rsvp_count+1));
    toast('Deployed. See you in the streets.');
    render();
  });
}
/* ---------- Intel Cards (P2) ---------- */
function evCard(e){
  var badge=mcBadge(e.ts);
  var h='<article class="pf-pat pf-pat-intel mc-card">';
  h+='<p class="pf-pat-intel-kicker">'+esc(String(e.type||'event').toUpperCase())+'</p>';
  if(badge) h+='<div><span class="mc-tbadge">'+badge+'</span></div>';
  h+='<h3 class="pf-pat-intel-head">'+esc(e.title)+'</h3>';
  h+='<p class="pf-pat-intel-data">'+esc(chiDate(e.ts))+(e.location?' &mdash; '+esc(e.location):'')+'</p>';
  h+=mcProof(e.rsvp_count,'soldiers deployed');
  /* The +50 XP is the pre-existing irl-rail reward — displayed, never minted here. */
  h+='<div class="mc-xp">+50 XP PER RSVP &mdash; BOOTS ON THE GROUND</div>';
  h+='<div class="mc-actions">';
  if(rsvpd[e.id]){
    h+='<span class="mc-youin">&#10003; YOU ARE IN</span>';
  } else {
    h+='<button class="pf-pat-deploy-red" data-mc="rsvp" data-id="'+esc(e.id)+'">DEPLOY &#8594;</button>';
  }
  h+='<a class="mc-tlink" href="#e='+esc(e.id)+'">DETAILS &#8594;</a>';
  h+='</div>';
  if(rsvpd[e.id]) h+=mcActionBar(e.id);
  h+='</article>';
  return h;
}
function calCard(c){
  var badge=mcBadge(c.ts);
  var h='<article class="pf-pat pf-pat-intel mc-card">';
  h+='<p class="pf-pat-intel-kicker">'+esc(KIND_LABEL[c.kind]||String(c.kind||'EVENT').toUpperCase())+'</p>';
  if(badge) h+='<div><span class="mc-tbadge">'+badge+'</span></div>';
  h+='<h3 class="pf-pat-intel-head">'+esc(c.title)+'</h3>';
  h+='<p class="pf-pat-intel-data">'+esc(c.dateLabel)+(c.detail?' &mdash; '+esc(c.detail):'')+'</p>';
  h+='<div class="mc-actions">';
  var PAT=mcPat();
  h+=PAT?PAT.deploy(c.url,'DEPLOY'):'<a href="'+esc(c.url)+'" style="font:bold 11px monospace;color:#fff;">DEPLOY &#8594;</a>';
  h+='</div></article>';
  return h;
}
/* Pure board builder (feeds + sort mode in, HTML out) — the verify harness
   exercises this directly. */
function mcBoardHtml(cal,ev,mode){
  var items=[], i;
  for(i=0;i<cal.length;i++) items.push(cal[i]);
  for(i=0;i<ev.length;i++) items.push(ev[i]);
  var up=[];
  for(i=0;i<items.length;i++){ if(mcImpact(items[i])>-100000) up.push(items[i]); }
  if(mode==='chrono'){
    up.sort(function(a,b){ return a.ts-b.ts; });
  } else {
    up.sort(function(a,b){ return mcImpact(b)-mcImpact(a); });
  }
  up=up.slice(0,15);
  var h='';
  for(i=0;i<up.length;i++){
    h+=(up[i].src==='event'?evCard(up[i]):calCard(up[i]));
  }
  if(!h) h='<div class="mc-empty">Nothing on the board right now &mdash; check back. The fight never sleeps.</div>';
  return h;
}
function sortBarHtml(){
  var impact=sortMode!=='chrono';
  return '<div class="mc-sortbar"><span class="mc-sortlabel">'
    +(impact?'SORTED BY IMPACT':'SORTED CHRONOLOGICALLY')
    +'</span><button class="c-btn ghost" data-mc="sort">'
    +(impact?'CHRONOLOGICAL &#8595;':'BY IMPACT &#8595;')
    +'</button></div>';
}
function tabsHtml(){
  return '<div class="mc-tabs" role="tablist">'
    +'<button class="mc-tab mc-tab-on" data-mc="tab-board" role="tab">MISSION BOARD</button>'
    +'<button class="mc-tab" data-mc="tab-map" role="tab">MAP</button>'
    +'</div>';
}
function render(){
  if(!root) return;
  mcCss();
  var h=mcHero()+tabsHtml()+sortBarHtml();
  h+=mcBoardHtml(calFeed,evFeed,sortMode);
  /* Town-hall honest state (unchanged). */
  h+='<div class="c-note" style="margin-top:10px;">Town halls: no BE feed yet &mdash; the tracker on this page is the source until then.</div>';
  root.innerHTML=h;
  /* share-out gaps #11: the war calendar is shareable. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(root,'master-calendar',{link:'/events'}); }catch(e){}
}
function goMap(){
  try{
    var t=document.querySelector('[data-lazy-silo="civicevents"]')||document.getElementById('pf-civicevents');
    if(t&&t.scrollIntoView){ t.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  }catch(e){}
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-mc]'):null; }catch(x){}
  if(!t||!root) return;
  var a=t.getAttribute('data-mc');
  if(a==='sort'){
    sortMode=(sortMode==='chrono'?'impact':'chrono');
    render();
  } else if(a==='tab-map'){
    try{
      var tabs=root.querySelectorAll('.mc-tab');
      for(var i=0;i<tabs.length;i++) tabs[i].classList.remove('mc-tab-on');
      t.classList.add('mc-tab-on');
    }catch(x){}
    goMap();
  } else if(a==='tab-board'){
    try{
      var tabs2=root.querySelectorAll('.mc-tab');
      for(var j=0;j<tabs2.length;j++) tabs2[j].classList.remove('mc-tab-on');
      t.classList.add('mc-tab-on');
    }catch(x){}
    try{ var sec=document.getElementById('pf-mastercal'); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}
  } else if(a==='rsvp'){
    doRsvp(t.getAttribute('data-id'),t);
  }
}
function load(){
  root=document.getElementById('xMasterCal');
  if(!root) return;
  if(!BACKEND){ root.innerHTML='<div class="c-err">Calendar offline &mdash; backend unreachable.</div>'; return; }
  root.addEventListener('click',onClick);
  var settled=0;
  function maybeRender(){ settled++; if(settled===1||settled===2) render(); }
  api('calendar_events',{},function(j){
    if(root&&j&&j.ok) calFeed=normCal(j.events);
    maybeRender();
  });
  /* Mobilizations merge in read-only — RSVP/detail/check-ins live in the
     events silo below. A dead rail just means a thinner board (fail-open). */
  api('event_list',{},function(j){
    if(root&&j&&j.ok) evFeed=normEv(j.events);
    maybeRender();
  });
  setTimeout(function(){ if(root&&root.innerHTML.indexOf('c-load')>=0) render(); },15000);
}
load();
})();</scr`+`ipt>
</div>
</template>`);
})();
