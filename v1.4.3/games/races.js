/* games/races.js  |  PF v1.4.3 | RACES TRACKER: Political HQ midterm races board.
   READ-ONLY. ZERO XP — this module mints nothing, multiplies nothing, moves
   no XP. It lists competitive races with ratings, filters, and sorting.
   LAYERING: an HQ silo like campaign.js. Reads via JSONP (self-contained
   api()). It never reaches into another silo's internals, and it does NOT
   touch the existing race_list contract (campaign.js battlegrounds) — it
   consumes only the new races_list / races_get actions.
   Backend contract (backend crew, Political HQ expansion #3):
     races_list -> {ok, races:[...], count, total, last_updated, stale}
     races_get {id} -> {ok, race:{...}}   (detail drill-down)
   - last_updated: top-level board timestamp.
   - stale: TOP-LEVEL flag (authoritative — never silent). A board-level
     stale banner renders whenever it is set, in addition to per-race logic.
   Race shape (all optional except id — everything degrades gracefully):
     {id, state, chamber:"Senate"|"House", office, seat, candidates,
      rating, source, source_date, updated_at, stakes}
   - candidates: [{name,party,funding,classTake}] (JSON string tolerated).
   - rating: string like "Toss-up (D)", "Lean R", "Safe D" — or an object
     {level:"tossup"|"lean"|"likely"|"safe", direction:"D"|"R"}.
   - source: rating source label ("Cook Political Report", ...).
   - source_date (aliased to rating_date internally): ISO or YYYY-MM-DD —
     the card shows "Rating: [source], [date]". YYYY-MM-DD is parsed as
     date-parts (no UTC-midnight shift) so the rendered day is exact.
   - stale: legacy per-race flag still honored; the TOP-LEVEL stale flag is
     the authoritative one.
   KILL: ?pf_off=races  or  localStorage pf_disabled_v1='["races"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("races")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-races">
<div class="fe-block pf-override-block pf-silo" id="pf-races">
<h2>Races Tracker</h2>
<div class="c-tag">Midterm battlegrounds, scored on class lines.</div>
<div id="xRaces"><div class="c-load">Mobilizing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
/* Nov 3, 2026 — Election Day. Countdown is calendar-day math in
   America/Chicago (no DST edge cases, matches campaign.js). */
var ELECTION_YMD=20261103;
/* wave-live-rails: the authoritative campaign end comes from the site_config
   rail ('campaign_end' — the CEO can move it without a deploy); the
   hardcoded date above is the fail-soft fallback. */
var EL_Y=2026, EL_M=11, EL_D=3;
try{
  if(window.PF&&PF.siteConfig){ PF.siteConfig.ready(function(map){
    try{
      var t=map&&map.campaign_end?Date.parse(map.campaign_end):0;
      if(t>0){
        var ps=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date(t));
        var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=+ps[i].value; }
        if(o.year&&o.month&&o.day){ EL_Y=o.year; EL_M=o.month; EL_D=o.day; ELECTION_YMD=o.year*10000+o.month*100+o.day; }
      }
    }catch(e){}
  }); }
}catch(e){}
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ PF.toast(m); }catch(e){} }
/* JSONP GET for reads (12s timeout — same fail-soft envelope as civic.js). */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfRcCb"+Math.floor(Math.random()*1e9);
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
function chiParts(){
  try{
    var ps=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=+ps[i].value; } return o;
  }catch(e){ var d=new Date(); return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()}; }
}
function chiYmd(){ var p=chiParts(); return p.year*10000+p.month*100+p.day; }
function daysToElection(){
  var p=chiParts();
  var nowMs=Date.UTC(p.year,p.month-1,p.day);
  var elMs=Date.UTC(EL_Y,EL_M-1,EL_D);
  return Math.max(0,Math.round((elMs-nowMs)/86400000));
}
function electionDay(){ return chiYmd()===ELECTION_YMD; }
function electionOver(){ return chiYmd()>ELECTION_YMD; }
/* ---------- election-night live mode (2026-10-05) ---------- */
/* Date-gated on Chicago calendar days: dormant until Nov 3 (countdown +
   watch-list phase), LIVE across Nov 3–4 (the 48h call window), results
   archive after. A card shows a call ONLY from backend call data
   (race_call) — uncalled races read "too early/too close", never an
   invented result.
   KILL: ?pf_off=election-live or localStorage pf_disabled_v1='["election-live"]' */
var EL_OFF=false;
try{ EL_OFF=!!(window.PF&&PF.skip('election-live')); }catch(e){}
function elPhase(){
  if(EL_OFF) return 'off';
  var ymd=chiYmd();
  if(ymd<ELECTION_YMD) return 'countdown';
  if(ymd<=ELECTION_YMD+1) return 'live';
  return 'results';
}
function isTossup(r){ return normRating(r&&r.rating).level==='tossup'; }
/* "NOV 3, 10:42 PM CT" — America/Chicago, the election's timezone. */
function fmtCallTime(t){
  try{
    var d=new Date(Number(t));
    if(isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',
      day:'numeric',hour:'numeric',minute:'2-digit'}).format(d).toUpperCase()+' CT';
  }catch(e){ return ''; }
}
/* Watch list: toss-up races the user wants to check on Nov 3.
   Local-only private preference — never uploaded, never public. */
var WATCH_KEY='pf_race_watch_v1';
function getWatch(){
  try{ var a=JSON.parse(localStorage.getItem(WATCH_KEY)||'[]'); return Array.isArray(a)?a:[]; }
  catch(e){ return []; }
}
function setWatch(a){ try{ localStorage.setItem(WATCH_KEY,JSON.stringify(a)); }catch(e){} }
function isWatched(id){
  var w=getWatch();
  for(var i=0;i<w.length;i++){ if(String(w[i])===String(id)) return true; }
  return false;
}
/* ---------- state ---------- */
var RACES=null,            /* normalized races from races_list */
    LIST_UPDATED=null,     /* backend top-level last_updated */
    LIST_STALE=false,      /* backend top-level stale flag (authoritative) */
    F={chamber:"all",state:"all",sort:"comp"},  /* filters */
    EXPANDED={},           /* id -> true (detail open) */
    DETAIL={};             /* id -> races_get payload (cached) */
/* ---------- rating normalization ---------- */
var LEVELS={tossup:0,lean:1,likely:2,safe:3};
function normRating(r){
  var level=null, dir=null;
  if(r&&typeof r==="object"){
    var l=String(r.level||r.rating||r.tier||"").toLowerCase().replace(/[-\\s]/g,"");
    if(l==="tossup"||l==="toss") l="tossup";
    if(LEVELS[l]!=null) level=l;
    var d=String(r.direction||r.side||r.dir||"").toUpperCase();
    if(d==="D"||d==="R") dir=d;
  } else {
    var s=String(r||"");
    var m=s.match(/(toss[\\s-]?up|lean|likely|safe)/i);
    if(m){ var mm=m[1].toLowerCase().replace(/[\\s-]/g,""); if(LEVELS[mm]!=null) level=mm; }
    var md=s.match(/\\b([DR])\\b/);
    if(md) dir=md[1];
  }
  return {level:level,dir:dir,raw:r};
}
function rateRank(r){ var l=normRating(r&&r.rating).level; return l==null?4:LEVELS[l]; }
function chamberOf(r){
  var c=String(r.chamber||"").toLowerCase();
  if(c.indexOf("senate")>=0) return "Senate";
  if(c.indexOf("house")>=0) return "House";
  var o=String(r.office||"").toLowerCase();
  if(o.indexOf("senate")>=0) return "Senate";
  if(o.indexOf("house")>=0) return "House";
  return "";
}
function normCands(c){
  if(typeof c==="string"){ try{ c=JSON.parse(c); }catch(e){ c=[]; } }
  if(!c||!c.length) return [];
  var out=[];
  for(var i=0;i<c.length;i++){
    var x=c[i]||{};
    out.push({name:x.name||x.candidate||"",party:x.party||"",funding:x.funding||x.money||"",classTake:x.classTake||x.class_take||""});
  }
  return out;
}
function normRace(r){
  var cands=normCands(r.candidates);
  return {
    id:String(r.id!=null?r.id:""),
    state:String(r.state||""),
    chamber:chamberOf(r),
    office:String(r.office||""),
    seat:String(r.seat||r.district||""),
    candidates:cands,
    rating:r.rating,
    source:String(r.source||r.rating_source||""),
    rating_date:r.rating_date||r.ratingDate||r.source_date||null,
    updated_at:r.updated_at||r.updatedAt||null,
    stale:!!r.stale,
    stakes:String(r.stakes||r.summary||""),
    /* Election-night calls (v83 race_call). Null until a call lands —
       the card renders "too early/too close", never an invented result. */
    calledWinner:r.calledWinner||r.called_winner||null,
    calledAt:r.calledAt||r.called_at||null,
    calledSource:r.calledSource||r.called_source||null
  };
}
/* ---------- dates ---------- */
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* YYYY-MM-DD is parsed as date parts (local calendar day), NOT via the
   Date constructor's UTC-midnight interpretation — avoids rendering one
   day early in America/Chicago. */
function parseDate(t){
  if(t==null||t==="") return null;
  var m=String(t).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    var d=new Date(+m[1],+m[2]-1,+m[3]);
    if(!isNaN(d.getTime())) return d;
  }
  try{
    var d2=new Date(typeof t==="number"?t:String(t));
    return isNaN(d2.getTime())?null:d2;
  }catch(e){ return null; }
}
function fmtDate(t){
  var d=parseDate(t); if(!d) return "";
  var s=MON[d.getMonth()]+" "+d.getDate();
  if(d.getFullYear()!==new Date().getFullYear()) s+=", "+d.getFullYear();
  return s;
}
function msOf(t){ var d=parseDate(t); return d?d.getTime():0; }
/* Stale = top-level board flag (authoritative, never silent), per-race
   backend flag, OR rating older than 14 days (client fallback, keyed off
   the aliased source_date — not the row-write timestamp). */
function isStale(r){
  if(r.stale) return true;
  var ms=msOf(r.rating_date||r.updated_at);
  if(!ms) return false;
  return (Date.now()-ms)>14*86400000;
}
/* Board-level banner: the authoritative top-level flag. Rendered once,
   above the board, IN ADDITION to any per-card banners. */
function boardStaleHTML(){
  if(!LIST_STALE) return "";
  var dateStr=(LIST_UPDATED&&fmtDate(LIST_UPDATED))||"unknown";
  return '<div class="rc-stale rc-board" role="alert">Board data: last updated '+esc(dateStr)
    +' &mdash; ratings may be outdated.</div>';
}
/* ---------- data ---------- */
function load(){
  var el=document.getElementById("xRaces");
  api("races_list",{},function(j){
    if(j&&j.ok&&j.races&&j.races.length){
      RACES=j.races.map(normRace);
      LIST_UPDATED=j.last_updated||j.updated_at||null;
      LIST_STALE=!!j.stale;
    } else if(j&&j.ok&&j.races&&!j.races.length){
      RACES=[]; LIST_UPDATED=j.last_updated||j.updated_at||null; LIST_STALE=!!j.stale;
    } else {
      RACES=null; /* backend down / malformed -> fail-soft */
      LIST_UPDATED=null; LIST_STALE=false;
    }
    render();
  });
}
/* ---------- render ---------- */
function countdownHTML(){
  var phase=elPhase();
  var h='<div class="rc-head">';
  if(phase==='live'){
    h+='<div class="rc-count rc-live"><span class="rc-livedot" aria-hidden="true"></span> LIVE &mdash; RACE CALLS AS THEY COME IN</div>'
      +'<div class="rc-framesub">CALLED RACES GET A SHARE CARD THE SECOND THE CALL LANDS.</div>';
  } else if(electionDay()){
    h+='<div class="rc-count">ELECTION DAY IS HERE</div>'
      +'<div class="rc-framesub">GET OUT. BRING TWO PEOPLE WITH YOU.</div>';
  } else if(electionOver()){
    h+='<div class="rc-count">THE POLLS ARE CLOSED</div>'
      +'<div class="rc-framesub">THE FIGHT CONTINUES. WATCH THE BOARD.</div>';
  } else {
    var d=daysToElection();
    h+='<div class="rc-count">'+d+' DAY'+(d===1?"":"S")+' TO ELECTION DAY</div>'
      +'<div class="rc-framesub">NOV 3, 2026. EVERY RACE BELOW IS A BATTLEFIELD.</div>';
    var w=getWatch();
    if(w.length){
      h+='<div class="rc-watchnote">YOU&rsquo;RE WATCHING '+w.length+' RACE'+(w.length===1?"":"S")+' &mdash; CHECK BACK NOV 3.</div>';
    } else {
      h+='<div class="rc-watchnote">TAP &#128276; ON A TOSS-UP TO WATCH IT FOR ELECTION NIGHT.</div>';
    }
  }
  h+='</div>';
  return h;
}
function controlsHTML(){
  var states={}, i, r;
  for(i=0;i<(RACES||[]).length;i++){ r=RACES[i]; if(r.state) states[r.state]=1; }
  var sl=Object.keys(states).sort();
  var h='<div class="rc-controls">';
  h+='<div class="rc-fgroup"><span class="rc-label">Chamber</span><div class="rc-chamwrap" role="group" aria-label="Chamber filter">';
  var chs=[["all","All"],["Senate","Senate"],["House","House"]];
  for(i=0;i<chs.length;i++){
    h+='<button class="rc-cham'+(F.chamber===chs[i][0]?" rc-on":"")+'" data-rc-cham="'+chs[i][0]+'" aria-pressed="'+(F.chamber===chs[i][0])+'">'+esc(chs[i][1])+'</button>';
  }
  h+='</div></div>';
  h+='<div class="rc-fgroup"><label class="rc-label" for="rcState">State</label>'
    +'<select class="rc-select" id="rcState"><option value="all">All states</option>';
  for(i=0;i<sl.length;i++){
    h+='<option value="'+esc(sl[i])+'"'+(F.state===sl[i]?' selected':'')+'>'+esc(sl[i])+'</option>';
  }
  h+='</select></div>';
  h+='<div class="rc-fgroup"><label class="rc-label" for="rcSort">Sort</label>'
    +'<select class="rc-select" id="rcSort">'
    +'<option value="comp"'+(F.sort==="comp"?" selected":"")+'>Most competitive first</option>'
    +'<option value="state"'+(F.sort==="state"?" selected":"")+'>State A&ndash;Z</option>'
    +'</select></div>';
  h+='</div>';
  return h;
}
function filteredSorted(){
  var out=[], i;
  for(i=0;i<(RACES||[]).length;i++){
    var r=RACES[i];
    if(F.chamber!=="all"&&r.chamber!==F.chamber) continue;
    if(F.state!=="all"&&r.state!==F.state) continue;
    out.push(r);
  }
  if(F.sort==="state"){
    out.sort(function(a,b){
      var s=String(a.state).localeCompare(String(b.state));
      if(s) return s;
      var rr=rateRank(a)-rateRank(b);
      if(rr) return rr;
      return String(a.office).localeCompare(String(b.office));
    });
  } else {
    /* Default: Toss-up -> Lean -> Likely -> Safe, unrated last. */
    out.sort(function(a,b){
      var rr=rateRank(a)-rateRank(b);
      if(rr) return rr;
      var s=String(a.state).localeCompare(String(b.state));
      if(s) return s;
      return String(a.office).localeCompare(String(b.office));
    });
  }
  return out;
}
function levelLabel(l){
  return {tossup:"TOSS-UP",lean:"LEAN",likely:"LIKELY",safe:"SAFE"}[l]||"UNRATED";
}
function ratingChip(r){
  var n=normRating(r.rating), l=n.level;
  var cls=l?"rc-"+l:"rc-unrated";
  var txt=levelLabel(l);
  if(n.dir) txt+=" \u00b7 "+n.dir;
  var dcls=n.dir==="D"?" rc-d":(n.dir==="R"?" rc-r":"");
  return '<span class="rc-rate '+cls+dcls+'">'+esc(txt)+'</span>';
}
function sourceLine(r){
  var dateStr=fmtDate(r.rating_date||r.updated_at);
  var src=r.source||"";
  if(src&&dateStr) return "Rating: "+esc(src)+", "+esc(dateStr);
  if(src) return "Rating: "+esc(src);
  if(dateStr) return "Rating updated "+esc(dateStr);
  return "Rating: awaiting data";
}
function staleBanner(r){
  if(!isStale(r)) return "";
  var dateStr=fmtDate(r.rating_date||r.updated_at)||"unknown";
  return '<div class="rc-stale" role="alert">Last updated '+esc(dateStr)
    +' &mdash; ratings may be outdated.</div>';
}
function candRow(c){
  var pc=String(c.party||"").toUpperCase();
  var pcls=pc.indexOf("D")===0?" rc-p-d":(pc.indexOf("R")===0?" rc-p-r":"");
  var h='<div class="rc-cand"><b>'+esc(c.name||"TBD")+'</b>';
  if(c.party) h+=' <span class="rc-party'+pcls+'">'+esc(c.party)+'</span>';
  h+='</div>';
  return h;
}
/* Election-night call block. Renders ONLY from backend call data —
   uncalled races show the honest "too early/too close" state. In the
   countdown phase, toss-ups offer a local watch-list toggle. */
function callHTML(r){
  var phase=elPhase();
  if(phase==='off') return '';
  if(r.calledWinner){
    var h='<div class="rc-called" role="status"><span class="rc-calledbadge">CALLED</span> '
      +'<b>'+esc(r.calledWinner)+'</b>';
    if(r.calledSource) h+=' <span class="rc-callsrc">via '+esc(r.calledSource)+'</span>';
    if(r.calledAt) h+=' <span class="rc-calltime">'+esc(fmtCallTime(r.calledAt))+'</span>';
    h+='</div>';
    h+='<button class="c-btn rc-sharecall" data-rc-sharecall="'+esc(r.id)+'"'
      +' aria-label="Share the called result for the '+esc(r.state+' '+r.office)+' race">SHARE THE CALL</button>';
    return h;
  }
  if(phase==='live'){
    return '<div class="x-note rc-tooearly">TOO EARLY / TOO CLOSE TO CALL &mdash; CHECK BACK.</div>';
  }
  if(phase==='countdown'&&isTossup(r)){
    var watching=isWatched(r.id);
    return '<button class="c-btn rc-remind'+(watching?' rc-on':'')+'" data-rc-remind="'+esc(r.id)+'"'
      +' aria-pressed="'+watching+'">'
      +(watching?'&#10003; WATCHING THIS RACE':'&#128276; WATCH THIS RACE')+'</button>';
  }
  return '';
}
/* One-tap share card for a called race. Data comes straight from the
   backend call record — the painter renders source + call time as the
   honesty line. The share rides PFShare.shareImage, so the callsign gate,
   the idempotent FIGHTING AS stamp, and the once-daily pf-share-image
   credit all ride along (no new XP faucet). */
function shareRaceCall(id){
  var r=null, i;
  for(i=0;i<(RACES||[]).length;i++){ if(String(RACES[i].id)===String(id)){ r=RACES[i]; break; } }
  if(!r||!r.calledWinner){ toast('No call on file for this race yet.'); return; }
  if(!(window.PF&&PF.PHQShare)){ toast('Share unavailable.'); return; }
  var cs=r.candidates||[], winner=null, loser=null, k;
  for(k=0;k<cs.length;k++){
    if(String(cs[k].name)===String(r.calledWinner)) winner=cs[k];
    else if(!loser) loser=cs[k];
  }
  var data={
    state:r.state, office:r.office,
    winner:r.calledWinner, winnerParty:winner?winner.party:'',
    loser:loser?loser.name:'', loserParty:loser?loser.party:'',
    source:r.calledSource, calledAt:r.calledAt
  };
  var title='CALLED: '+r.state+' '+r.office+' \u2014 '+r.calledWinner;
  PF.PHQShare.share('phq-racecall',data,{title:title,link:'https://www.mtcstw.com/political-hq'});
}
function cardHTML(r){
  var h='<article class="rc-card" data-rc-id="'+esc(r.id)+'">';
  h+='<div class="rc-top"><div class="rc-title">'+esc(r.state)+(r.office?" &mdash; "+esc(r.office):"")+'</div>';
  if(r.chamber) h+='<span class="rc-badge '+(r.chamber==="Senate"?"rc-senate":"rc-house")+'">'+esc(r.chamber.toUpperCase())+'</span>';
  h+='</div>';
  if(r.seat) h+='<div class="rc-seat">'+esc(r.seat)+'</div>';
  h+=staleBanner(r);
  h+='<div class="rc-rate-row">'+ratingChip(r)+'<div class="rc-source">'+sourceLine(r)+'</div></div>';
  h+=callHTML(r);
  var cs=r.candidates||[];
  for(var i=0;i<cs.length;i++) h+=candRow(cs[i]);
  if(r.stakes) h+='<div class="rc-stakes">'+esc(r.stakes)+'</div>';
  var rid=esc(r.id);
  if(r.id){
    h+='<button class="rc-detail-btn" data-rc-detail="'+rid+'" aria-expanded="'+(!!EXPANDED[r.id])+'">'
      +(EXPANDED[r.id]?"HIDE DETAILS":"CANDIDATE DETAILS")+'</button>';
    if(EXPANDED[r.id]) h+=detailHTML(r);
  }
  h+='</article>';
  return h;
}
function detailHTML(r){
  var d=DETAIL[r.id];
  var h='<div class="rc-detail">';
  if(!d){
    h+='<div class="x-note">Details loading&hellip;</div></div>';
    return h;
  }
  var full=d.race||d||{};
  var cs=normCands(full.candidates||r.candidates);
  if(!cs.length) h+='<div class="x-note">No candidate detail on file.</div>';
  for(var i=0;i<cs.length;i++){
    h+='<div class="rc-dcand"><b>'+esc(cs[i].name)+'</b>'+(cs[i].party?" ("+esc(cs[i].party)+")":"")+'</div>';
    if(cs[i].funding) h+='<div class="rc-dfund">Money: '+esc(cs[i].funding)+'</div>';
    if(cs[i].classTake) h+='<div class="rc-dtake">Class take: '+esc(cs[i].classTake)+'</div>';
  }
  if(full.stakes&&String(full.stakes)!==String(r.stakes)) h+='<div class="rc-stakes">'+esc(full.stakes)+'</div>';
  h+='</div>';
  return h;
}
function render(){
  var el=document.getElementById("xRaces"); if(!el) return;
  var h=countdownHTML();
  if(RACES===null){
    /* Fail-soft: backend down. Never a stuck spinner. */
    h+='<div class="c-neterr">The wire didn&rsquo;t answer with race data.'
      +'<br><button class="c-btn" id="rcRetry">Retry connection</button></div>';
    el.innerHTML=h;
    wireControls(null);
    var rb=document.getElementById("rcRetry");
    if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
    return;
  }
  h+=controlsHTML();
  h+=boardStaleHTML();
  var rows=filteredSorted();
  if(!rows.length){
    h+='<div class="x-note">No races on the board for these filters &mdash; widen the net.</div>';
  }
  for(var i=0;i<rows.length;i++) h+=cardHTML(rows[i]);
  if(LIST_UPDATED){
    h+='<div class="rc-upd">Board data: '+esc(fmtDate(LIST_UPDATED))+'</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="rcRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireControls(el);
  var rb2=document.getElementById("rcRetry");
  if(rb2) rb2.onclick=function(){ el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
}
function wireControls(el){
  if(!el) return;
  var cb=el.querySelectorAll("[data-rc-cham]");
  for(var i=0;i<cb.length;i++){
    (function(btn){
      btn.onclick=function(){ F.chamber=btn.getAttribute("data-rc-cham"); render(); };
    })(cb[i]);
  }
  var ss=document.getElementById("rcState");
  if(ss) ss.onchange=function(){ F.state=ss.value; render(); };
  var so=document.getElementById("rcSort");
  if(so) so.onchange=function(){ F.sort=so.value; render(); };
  var db=el.querySelectorAll("[data-rc-detail]");
  for(var j=0;j<db.length;j++){
    (function(btn){
      btn.onclick=function(){ toggleDetail(btn.getAttribute("data-rc-detail")); };
    })(db[j]);
  }
  /* Election-night live mode wiring. */
  var sc=el.querySelectorAll("[data-rc-sharecall]");
  for(var s=0;s<sc.length;s++){
    (function(btn){
      btn.onclick=function(){ shareRaceCall(btn.getAttribute("data-rc-sharecall")); };
    })(sc[s]);
  }
  var rm=el.querySelectorAll("[data-rc-remind]");
  for(var m=0;m<rm.length;m++){
    (function(btn){
      btn.onclick=function(){
        var id=btn.getAttribute("data-rc-remind"), w=getWatch(), out=[], found=false, i;
        for(i=0;i<w.length;i++){
          if(String(w[i])===String(id)){ found=true; } else { out.push(w[i]); }
        }
        if(!found) out.push(id);
        setWatch(out);
        render(); /* re-render so the header watch count stays true */
      };
    })(rm[m]);
  }
}
function toggleDetail(id){
  if(!id) return;
  if(EXPANDED[id]){ delete EXPANDED[id]; render(); return; }
  EXPANDED[id]=true;
  if(!DETAIL[id]){
    api("races_get",{id:id},function(j){
      DETAIL[id]=(j&&j.ok)?(j.race?j:(j||{})):{err:1};
      render();
    });
    /* Render immediately with the loading detail state; the api callback
       re-renders when the detail lands. */
    render();
    return;
  }
  render();
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
