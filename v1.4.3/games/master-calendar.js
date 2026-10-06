/* games/master-calendar.js  |  PF v1.4.3 | THE WAR CALENDAR (master calendar).
   One calendar aggregating every dated thing in the movement: IRL events,
   Solidarity Draw, War Report Mondays, fan-vote windows, medal resets,
   MIDTERM BLITZ end, Discord daily/weekly routines. Server-driven via
   the `calendar_events` BE action so the site and Discord routines stay
   in sync (single source of truth).

   PLACEMENT: full month view mounts FIRST on /events (PAGE_ORDERS);
   the Creator HQ dashboard carries a compact THIS WEEK strip (see the
   dashboard.js edit — same feed, compact render).
   LAYERING: a game silo like civic-events.js. Reads via JSONP
   (self-contained api()). It never reaches into another silo's internals.
   No XP anywhere in this module. No auth (public feed).
   KILL: ?pf_off=mastercal  or  localStorage pf_disabled_v1='["mastercal"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('mastercal')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-mastercal">
<div class="fe-block pf-override-block pf-silo" id="pf-mastercal">
<h2>The War Calendar</h2>
<div class="c-tag">Every fight, every deadline, every briefing — one calendar. Never miss a mobilization.</div>
<div id="xMasterCal"><div class="c-load">Reading the calendar&hellip;</div></div>
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
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var KIND_LABEL={irl:'STREET',draw:'DRAW',warreport:'WAR REPORT',fanvote:'FAN VOTE',medals:'MEDALS',offensive:'OFFENSIVE',discord:'DISCORD'};
var KIND_COLOR={irl:'#c1121f',draw:'#f5a623',warreport:'#4a90d9',fanvote:'#9b59b6',medals:'#27ae60',offensive:'#e74c3c',discord:'#7289da'};
var root=null, events=[], viewY=0, viewM=0, selDay=null;
function evOnDay(ev,y,m,d){
  var p=chiParts(ev.ts);
  return p.y===y&&p.m===m&&p.d===d;
}
function kindDot(k){
  return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+(KIND_COLOR[k]||'#888')+';margin-right:2px;"></span>';
}
function render(){
  if(!root) return;
  var nowP=chiParts(Date.now());
  if(!viewY){ viewY=nowP.y; viewM=nowP.m; }
  /* Month grid. */
  /* QC gate (2026-10-05, F2): use NOON UTC — UTC midnight is 6-7 PM the
     PREVIOUS day in Chicago, which read the wrong weekday and skewed the
     whole grid one column. Noon UTC is always the same Chicago day. */
  var firstWk=chiWeekday(Date.UTC(viewY,viewM-1,1,12));
  var daysInM=new Date(Date.UTC(viewY,viewM,0)).getUTCDate();
  var h='<div class="mc-nav"><button class="c-btn" data-mc="prev">&larr;</button>'+
    '<span class="mc-title">'+MONTHS[viewM-1]+' '+viewY+'</span>'+
    '<button class="c-btn" data-mc="next">&rarr;</button></div>';
  h+='<div class="mc-grid"><div class="mc-dow">S</div><div class="mc-dow">M</div><div class="mc-dow">T</div><div class="mc-dow">W</div><div class="mc-dow">T</div><div class="mc-dow">F</div><div class="mc-dow">S</div>';
  var i, d;
  for(i=0;i<firstWk;i++) h+='<div class="mc-day mc-empty"></div>';
  for(d=1;d<=daysInM;d++){
    var hasEv=false, dots='';
    for(i=0;i<events.length;i++){
      if(evOnDay(events[i],viewY,viewM,d)){ hasEv=true; dots+=kindDot(events[i].kind); if(dots.length>120) break; }
    }
    var isToday=(viewY===nowP.y&&viewM===nowP.m&&d===nowP.d);
    var isSel=(selDay&&selDay.y===viewY&&selDay.m===viewM&&selDay.d===d);
    h+='<div class="mc-day'+(isToday?' mc-today':'')+(isSel?' mc-sel':'')+'" data-mc="day" data-d="'+d+'">'+d+
      (hasEv?'<div class="mc-dots">'+dots+'</div>':'')+'</div>';
  }
  h+='</div>';
  /* Upcoming list (next 30 days from today, or selected day). */
  var listTitle='UPCOMING', listEv=[];
  if(selDay){
    listTitle='ON '+MONTHS[selDay.m-1].toUpperCase()+' '+selDay.d;
    for(i=0;i<events.length;i++) if(evOnDay(events[i],selDay.y,selDay.m,selDay.d)) listEv.push(events[i]);
  } else {
    var cutoff=Date.now()+30*86400000;
    for(i=0;i<events.length;i++) if(events[i].ts>=Date.now()-3600000&&events[i].ts<=cutoff) listEv.push(events[i]);
    listEv=listEv.slice(0,12);
  }
  h+='<h4 class="mc-listtitle">'+listTitle+'</h4>';
  if(!listEv.length){
    h+='<div class="c-note">Nothing on the books. '+(selDay?'Pick another day.':'Check back — the fight never sleeps.')+'</div>';
  } else {
    h+='<div class="mc-list">';
    for(i=0;i<listEv.length;i++){
      var ev=listEv[i];
      h+='<a class="mc-item" href="'+esc(safeUrl(ev.url||'/events'))+'">'+
        '<span class="mc-kind" style="background:'+(KIND_COLOR[ev.kind]||'#888')+'">'+esc(KIND_LABEL[ev.kind]||ev.kind||'EVENT')+'</span>'+
        '<span class="mc-item-main"><b>'+esc(ev.title)+'</b><br><span class="mc-date">'+esc(ev.date_label)+'</span>'+
        (ev.detail?'<br><span class="mc-detail">'+esc(ev.detail)+'</span>':'')+
        (ev.recurring&&ev.schedule?'<br><span class="mc-recur">'+esc(ev.schedule)+'</span>':'')+
        '</span><span class="mc-go">&rarr;</span></a>';
    }
    h+='</div>';
  }
  /* Legend. */
  h+='<div class="mc-legend">';
  for(var k in KIND_LABEL) h+='<span>'+kindDot(k)+esc(KIND_LABEL[k])+'</span> ';
  h+='</div>';
  /* Town-hall honest state. */
  h+='<div class="c-note" style="margin-top:10px;">Town halls: no BE feed yet — the tracker on this page is the source until then.</div>';
  root.innerHTML=h;
  /* share-out gaps #11: the war calendar is shareable. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(root,'master-calendar',{link:'/events'}); }catch(e){}
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-mc]'):null; }catch(x){}
  if(!t||!root) return;
  var a=t.getAttribute('data-mc');
  var nowP=chiParts(Date.now());
  if(a==='prev'){
    viewM--; if(viewM<1){ viewM=12; viewY--; }
    /* Don't wander before last month. */
    if(viewY<nowP.y||(viewY===nowP.y&&viewM<nowP.m)){ viewY=nowP.y; viewM=nowP.m; }
    selDay=null; render();
  } else if(a==='next'){
    viewM++; if(viewM>12){ viewM=1; viewY++; }
    /* Cap at +4 months. */
    var maxM=nowP.m+4, maxY=nowP.y;
    while(maxM>12){ maxM-=12; maxY++; }
    if(viewY>maxY||(viewY===maxY&&viewM>maxM)){ viewY=maxY; viewM=maxM; }
    selDay=null; render();
  } else if(a==='day'){
    var d=+t.getAttribute('data-d');
    if(selDay&&selDay.y===viewY&&selDay.m===viewM&&selDay.d===d) selDay=null;
    else selDay={y:viewY,m:viewM,d:d};
    render();
  }
}
function load(){
  root=document.getElementById('xMasterCal');
  if(!root) return;
  if(!BACKEND){ root.innerHTML='<div class="c-err">Calendar offline — backend unreachable.</div>'; return; }
  root.addEventListener('click',onClick);
  api('calendar_events',{},function(j){
    if(!root) return;
    if(!j||!j.ok){ root.innerHTML='<div class="c-err">The calendar would not load. Try again soon.</div>'; return; }
    events=j.events||[];
    render();
  });
}
load();
})();</scr`+`ipt>
</div>
</template>`);
})();
