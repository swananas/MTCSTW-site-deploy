/* games/ballot-measures.js  |  PF v1.4.3 | BALLOT MEASURES: Political HQ
   ballot-measure board (workstream 2 of 2, 2026-10-05).
   READ-ONLY. ZERO XP — this module mints nothing, multiplies nothing, moves
   no XP. Reading a card grants 0 (the read-XP leg is news Top Stories
   comprehension only — src/readcreate.js — and does not apply here).
   Sharing a card uses the existing share leg only (PFShare.shareText /
   navigator.share, the feed.js pattern) — 0 XP from this module.
   LAYERING: an HQ silo like races.js. Reads via JSONP (self-contained
   api()). It never reaches into another silo's internals, and it does NOT
   touch the races board — it consumes only the new measures_list action.
   Backend contract (backend crew, v85):
     measures_list {election: upcoming|all|archived, state} ->
       {ok, measures:[...], count}
   Measure shape (all optional except id — everything degrades gracefully):
     {id, state, title, summary, yes_means, no_means, backed_by, opposed_by,
      election_date, status: "upcoming"|"archived",
      network_position: "yes"|"no"|"neutral"|null,
      position_rationale, source, updated_at}
   - status is computed at read time by the backend (election_date <
     Chicago today -> archived, else upcoming). The pane only groups by it.
   - network position badge renders ONLY when network_position is set; the
     published rationale rides with it.
   SEAM: mounted by pages/political-hq.js (ORDER entry
   ['ballot-measures', 'pf-ov-ballot-measures'], after the races board) and
   shipped in games/bundle-hq.js (build/bundle.js). Deliberately NOT mounted
   from the races board — the two silos stay decoupled; HQ is the page that
   owns both.
   KILL: ?pf_off=measures  or  localStorage pf_disabled_v1='["measures"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("measures")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-ballot-measures">
<div class="fe-block pf-override-block pf-silo" id="pf-ballot-measures">
<h2>Ballot Measures</h2>
<div class="c-tag">What's on the ballot, in plain language. Know the vote.</div>
<div id="xMeasures"><div class="c-load">Mobilizing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ PF.toast(m); }catch(e){} }
/* JSONP GET for reads (12s timeout — same fail-soft envelope as races.js). */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfBmCb"+Math.floor(Math.random()*1e9);
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
/* ---------- state ---------- */
var MEASURES=null,      /* normalized measures from measures_list */
    F={election:"upcoming",state:"all"};  /* filters */
/* ---------- dates ---------- */
/* America/Chicago calendar day — same canonical day the backend gates on. */
function chiParts(){
  try{
    var ps=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=+ps[i].value; } return o;
  }catch(e){ var d=new Date(); return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()}; }
}
var EL_Y=2026, EL_M=11, EL_D=3;
function daysToElection(){
  var p=chiParts();
  var nowMs=Date.UTC(p.year,p.month-1,p.day);
  var elMs=Date.UTC(EL_Y,EL_M-1,EL_D);
  return Math.max(0,Math.round((elMs-nowMs)/86400000));
}
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* YYYY-MM-DD parsed as date parts (local calendar day), NOT via the Date
   constructor's UTC-midnight interpretation — avoids rendering one day early
   in America/Chicago (same fix as races.js). */
function parseDate(t){
  if(t==null||t==="") return null;
  var m=String(t).match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
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
/* ---------- normalization ---------- */
function normMeasure(m){
  return {
    id:String(m.id!=null?m.id:""),
    state:String(m.state||""),
    title:String(m.title||"Untitled measure"),
    summary:String(m.summary||""),
    yesMeans:String(m.yes_means||m.yesMeans||""),
    noMeans:String(m.no_means||m.noMeans||""),
    electionDate:String(m.election_date||""),
    status:String(m.status||"upcoming"),
    networkPosition:(m.network_position==="yes"||m.network_position==="no"||m.network_position==="neutral")?m.network_position:null,
    positionRationale:String(m.position_rationale||""),
    source:String(m.source||"")
  };
}
/* ---------- data ---------- */
function load(){
  var el=document.getElementById("xMeasures");
  var params={};
  if(F.election!=="upcoming") params.election=F.election;
  api("measures_list",params,function(j){
    if(j&&j.ok&&j.measures){
      MEASURES=j.measures.map(normMeasure);
    } else {
      MEASURES=null; /* backend down / malformed -> fail-soft */
    }
    render();
  });
}
/* ---------- render ---------- */
function headHTML(){
  var h='<div class="bm-head">';
  if(F.election==="archived"){
    h+='<div class="bm-count">ARCHIVED MEASURES</div>'
      +'<div class="bm-framesub">PAST BATTLES. THE RECORD STANDS.</div>';
  } else {
    var d=daysToElection();
    h+='<div class="bm-count">'+d+' DAY'+(d===1?"":"S")+' TO ELECTION DAY</div>'
      +'<div class="bm-framesub">NOV 3, 2026. READ THE MEASURE. KNOW THE VOTE.</div>';
  }
  h+='</div>';
  return h;
}
function controlsHTML(){
  var states={}, i, r;
  for(i=0;i<(MEASURES||[]).length;i++){ r=MEASURES[i]; if(r.state) states[r.state]=1; }
  var sl=Object.keys(states).sort();
  var h='<div class="bm-controls">';
  h+='<div class="bm-fgroup"><span class="bm-label">Board</span><div class="bm-ewrap" role="group" aria-label="Election filter">';
  var es=[["upcoming","Upcoming"],["archived","Archived"]];
  for(i=0;i<es.length;i++){
    h+='<button class="bm-e'+(F.election===es[i][0]?" bm-on":"")+'" data-bm-el="'+es[i][0]+'" aria-pressed="'+(F.election===es[i][0])+'">'+esc(es[i][1])+'</button>';
  }
  h+='</div></div>';
  h+='<div class="bm-fgroup"><label class="bm-label" for="bmState">State</label>'
    +'<select class="bm-select" id="bmState"><option value="all">All states</option>';
  for(i=0;i<sl.length;i++){
    h+='<option value="'+esc(sl[i])+'"'+(F.state===sl[i]?' selected':'')+'>'+esc(sl[i])+'</option>';
  }
  h+='</select></div>';
  h+='</div>';
  return h;
}
function filtered(){
  var out=[], i;
  for(i=0;i<(MEASURES||[]).length;i++){
    var m=MEASURES[i];
    if(F.state!=="all"&&m.state!==F.state) continue;
    out.push(m);
  }
  out.sort(function(a,b){
    var s=String(a.state).localeCompare(String(b.state));
    if(s) return s;
    return String(a.title).localeCompare(String(b.title));
  });
  return out;
}
/* Network position badge — renders ONLY when networkPosition is set
   (null -> nothing, per the pane contract). */
function posBadge(m){
  if(!m.networkPosition) return "";
  var label=m.networkPosition.toUpperCase();
  var cls=m.networkPosition==="yes"?"bm-pos-yes":(m.networkPosition==="no"?"bm-pos-no":"bm-pos-neu");
  var h='<div class="bm-pos '+cls+'">NETWORK POSITION: '+esc(label)+'</div>';
  if(m.positionRationale) h+='<div class="bm-why">'+esc(m.positionRationale)+'</div>';
  return h;
}
function cardHTML(m){
  var h='<article class="bm-card" data-bm-id="'+esc(m.id)+'">';
  h+='<div class="bm-top"><div class="bm-title">'+esc(m.title)+'</div>';
  if(m.state) h+='<span class="bm-badge">'+esc(m.state)+'</span>';
  h+='</div>';
  var ed=fmtDate(m.electionDate);
  if(ed) h+='<div class="bm-date">On the ballot: '+esc(ed)+'</div>';
  h+=posBadge(m);
  if(m.summary) h+='<div class="bm-sum">'+esc(m.summary)+'</div>';
  if(m.yesMeans||m.noMeans){
    h+='<div class="bm-votes">';
    if(m.yesMeans) h+='<div class="bm-yes"><b>YES</b> &mdash; '+esc(m.yesMeans)+'</div>';
    if(m.noMeans) h+='<div class="bm-no"><b>NO</b> &mdash; '+esc(m.noMeans)+'</div>';
    h+='</div>';
  }
  var src=m.source||"";
  if(src) h+='<div class="bm-source">Source: '+esc(src)+'</div>';
  h+='<button class="bm-share" data-bm-share="'+esc(m.id)+'">SHARE THIS MEASURE</button>';
  h+='</article>';
  return h;
}
function render(){
  var el=document.getElementById("xMeasures"); if(!el) return;
  var h=headHTML();
  if(MEASURES===null){
    /* Fail-soft: backend down. Never a stuck spinner. */
    h+='<div class="c-neterr">The wire didn&rsquo;t answer with measure data.'
      +'<br><button class="c-btn" id="bmRetry">Retry connection</button></div>';
    el.innerHTML=h;
    wireControls(null);
    var rb=document.getElementById("bmRetry");
    if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
    return;
  }
  h+=controlsHTML();
  var rows=filtered();
  if(!rows.length){
    h+='<div class="x-note">No measures on the board for these filters &mdash; widen the net.</div>';
  }
  for(var i=0;i<rows.length;i++) h+=cardHTML(rows[i]);
  h+='<div style="margin-top:10px"><button class="c-btn" id="bmRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireControls(el);
  var rb2=document.getElementById("bmRetry");
  if(rb2) rb2.onclick=function(){ el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
}
function shareMeasure(m){
  /* Existing share leg only (feed.js pattern): PFShare.shareText when the
     share core is present, else the native share sheet, else a nudge.
     ZERO XP — this module never dispatches share-credit events. */
  var title=m.title+(m.state?" ("+m.state+")":"")+" — Know the vote. JOIN THE FIGHT.";
  try{
    if(window.PFShare&&PFShare.shareText){ PFShare.shareText(title); return; }
    if(navigator.share){ navigator.share({title:m.title,text:title,url:location.href}); return; }
  }catch(e){}
  toast("Copy the link and spread it.");
}
function wireControls(el){
  if(!el) return;
  var eb=el.querySelectorAll("[data-bm-el]");
  for(var i=0;i<eb.length;i++){
    (function(btn){
      btn.onclick=function(){ F.election=btn.getAttribute("data-bm-el"); render(); load(); };
    })(eb[i]);
  }
  var ss=document.getElementById("bmState");
  if(ss) ss.onchange=function(){ F.state=ss.value; render(); };
  var sb=el.querySelectorAll("[data-bm-share]");
  for(var j=0;j<sb.length;j++){
    (function(btn){
      btn.onclick=function(){
        var id=btn.getAttribute("data-bm-share");
        for(var k=0;k<(MEASURES||[]).length;k++){
          if(MEASURES[k].id===id){ shareMeasure(MEASURES[k]); return; }
        }
      };
    })(sb[j]);
  }
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
