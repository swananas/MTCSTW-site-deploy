/* games/war-timeline.js  |  PF v1.4.3 | THE WAR TIMELINE (PLAY 5 — UX Combination Plays Wave 2).
   One mission-board timeline for every time-bound thing in the movement.
   AGGREGATION (FE-side, read-only, fail-open — no new backend endpoints):
     1. calendar_events  — IRL events, war-room live ops, Solidarity Draw,
        War Report Mondays, fan-vote window, medal/streak Monday reset,
        season end, Discord routines (server-driven base feed).
     2. proposal_list    — open governance proposals' closes_at (GOV_GET, public).
     3. predict_qlist    — open CALL IT. questions' lock_at (PREDICT_GET, public).
     4. computed         — Daily Orders expiry (next America/Chicago midnight).
   Each source degrades independently: a down endpoint skips its kind(s) and
   the rest still render. All four fire in parallel with a 12s backstop —
   render whatever arrived, never a spinner forever.
   NORMALIZED SHAPE: {title, time, kind, deep_link, impact_weight} (+detail).
   RENDER: Intel Cards with time badges (TODAY / TOMORROW / THIS WEEKEND),
   impact-sorted by default with a CHRONOLOGICAL TOGGLE (Psych gate: the
   toggle is mandatory, not optional). Each card deep-links to its surface
   and carries the Action Bar where sensible (SHARE THIS INTEL / TAKE THIS
   TO YOUR CELL / REPORT BACK).
   MOUNT: /events via PAGE_ORDERS (pf-ov-wartimeline). The homepage compact
   strip is the sibling silo war-timeline-strip.js (bundle-home) — the
   aggregation core below is mirrored there; keep the two in sync.
   No XP anywhere. No writes. Zero new mechanics, zero new currencies.
   KILL: ?pf_off=wartimeline  or  localStorage pf_disabled_v1='["wartimeline"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wartimeline')) { return; }
  if (window.pfWarTimelineDone) { return; }
  window.pfWarTimelineDone = true;
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-wartimeline">
<style>
#pf-wartimeline .wt-sort{display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap}
#pf-wartimeline .wt-sortbtn{font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:13px;letter-spacing:.08em;
  background:#141414;color:#f5ead6;border:2px solid #4a4a4a;padding:10px 16px;min-height:44px;cursor:pointer}
#pf-wartimeline .wt-sortbtn[aria-pressed="true"]{background:#c1121f;border-color:#c1121f;color:#fff}
#pf-wartimeline .wt-card{background:#111;border:1px solid #3a2c22;border-left:5px solid #c1121f;
  padding:12px 14px;margin:10px 0}
#pf-wartimeline .wt-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
#pf-wartimeline .wt-badge{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:12px;
  letter-spacing:.08em;padding:4px 10px}
#pf-wartimeline .wt-kind{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:800;font-size:11px;
  letter-spacing:.08em;padding:4px 10px}
#pf-wartimeline .wt-title{font-weight:900;font-size:17px;color:#f5ead6;line-height:1.35;margin:4px 0;word-wrap:break-word;overflow-wrap:anywhere}
#pf-wartimeline .wt-meta{font-size:13px;color:#c9bfa8;margin:2px 0 8px;line-height:1.5}
#pf-wartimeline .wt-deploy{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:14px;
  letter-spacing:.06em;text-decoration:none;padding:11px 22px;min-height:44px;margin:4px 8px 4px 0;font-family:Arial,Helvetica,sans-serif}
#pf-wartimeline .wt-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #3a2c22}
#pf-wartimeline .wt-act{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:12px;letter-spacing:.06em;
  background:transparent;color:#f5ead6;border:2px solid #4a4a4a;padding:9px 14px;min-height:44px;cursor:pointer;text-decoration:none;
  display:inline-flex;align-items:center}
#pf-wartimeline .wt-act:hover{border-color:#c1121f;color:#fff}
#pf-wartimeline .wt-foot{font-size:12px;color:#8a8070;margin-top:12px}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-wartimeline">
<h2>The War Timeline</h2>
<div class="c-tag">Every deadline, every drop, every mobilization — one board. Sorted by impact, or by the clock. Your call.</div>
<div id="xWarTimeline"><div class="c-load">Reading the battlefield&hellip;</div></div>
</div>
<script>
(function(){
/* ============ SHARED AGGREGATOR CORE — mirrored in war-timeline-strip.js ============ */
var BACKEND=window.PF_BACKEND_URL;
var HOUR=3600000, DAY=86400000;
/* Event-kind vocabulary (single source of truth for the timeline):
   irl | governance | prediction | streak_reset | season_end | daily_orders |
   war_report | fan_vote | draw | liveops | discord */
var KIND_BASE={season_end:100,irl:95,governance:88,prediction:78,liveops:72,streak_reset:62,war_report:58,fan_vote:52,draw:46,daily_orders:42,discord:24};
var KIND_LABEL={season_end:'SEASON END',irl:'STREET',governance:'ASSEMBLY VOTE',prediction:'CALL IT.',liveops:'WAR ROOM',streak_reset:'STREAK RESET',war_report:'WAR REPORT',fan_vote:'FAN VOTE',draw:'DRAW',daily_orders:'DAILY ORDERS',discord:'DISCORD'};
var KIND_LINK={season_end:'/',irl:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',liveops:'/war-room',streak_reset:'/#pf-ranks',war_report:'/war-report',fan_vote:'/#pf-fanvote',draw:'/#pf-draw',daily_orders:'/#pf-orders',discord:''};
/* calendar_events feed kinds -> unified vocabulary. */
var CAL_KIND={irl:'irl',liveops:'liveops',draw:'draw',warreport:'war_report',fanvote:'fan_vote',medals:'streak_reset',offensive:'season_end',discord:'discord'};
var REPORT_LINK={irl:'/events',liveops:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',draw:'/#pf-draw',fan_vote:'/#pf-fanvote',war_report:'/war-report',season_end:'/',streak_reset:'/#pf-ranks',daily_orders:'/#pf-orders'};
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* URLs come from our own backend, but never trust a scheme — only allow
   relative paths and http(s). Anything else falls back to /events.
   NB: this file stages the inner script inside a template literal, so the
   regex below is written with doubled backslashes — the browser receives
   /^(https?:\/\/|\/)/i after template evaluation. */
function safeUrl(u){
  var s=String(u==null?'':u).trim();
  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;
  return '/events';
}
function chiNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})); }catch(e){ return new Date(); } }
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
function fmtDay(ts){
  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'}).format(new Date(ts)); }
  catch(e){ return ''; }
}
function fmtClock(ts){
  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ts))+' CT'; }
  catch(e){ return ''; }
}
function badge(ts,now){
  var a=chiParts(ts), b=chiParts(now);
  var da=Date.UTC(a.y,a.m-1,a.d), db=Date.UTC(b.y,b.m-1,b.d);
  var diff=Math.round((da-db)/DAY);
  if(diff<=0) return 'TODAY';
  if(diff===1) return 'TOMORROW';
  var wd=chiWeekday(ts);
  if(diff<7&&(wd===0||wd===6)) return 'THIS WEEKEND';
  return fmtDay(ts).toUpperCase();
}
/* JSONP read, fail-open: any failure -> cb(null), the kind is skipped. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfWtCb'+Math.floor(Math.random()*1e9);
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
function normCal(ev){
  var ts=+ev.ts; if(!isFinite(ts)||ts<=0) return null;
  var k=CAL_KIND[ev.kind]||'irl';
  return {title:String(ev.title||'Upcoming'),time:ts,kind:k,
    deep_link:safeUrl(ev.url||KIND_LINK[k]||'/events'),
    detail:String(ev.detail||''),_base:KIND_BASE[k]||30};
}
function normProp(p){
  var ts=+p.closes_at; if(!isFinite(ts)||ts<=0) return null;
  return {title:'VOTE CLOSES: '+String(p.title||'Proposal'),time:ts,kind:'governance',
    deep_link:KIND_LINK.governance,
    detail:(p.voter_count!=null&&+p.voter_count>0?(''+p.voter_count+' votes in — '):'')+'the Assembly decides. Make yours count.',
    _base:KIND_BASE.governance};
}
function normQ(q){
  var ts=+q.lock_at; if(!isFinite(ts)||ts<=0) return null;
  return {title:'CALL IT. LOCKS: '+String(q.title||'Question'),time:ts,kind:'prediction',
    deep_link:KIND_LINK.prediction,detail:'',_base:KIND_BASE.prediction};
}
function dailyOrdersEv(){
  try{ var end=chiNow(); end.setHours(24,0,0,0); var ts=end.getTime(); }
  catch(e){ var d=new Date(); d.setHours(24,0,0,0); var ts=d.getTime(); }
  return {title:'New Daily Orders drop',time:ts,kind:'daily_orders',
    deep_link:KIND_LINK.daily_orders,detail:'Fresh missions at midnight. Streaks roll with them.',
    _base:KIND_BASE.daily_orders};
}
function impact(ev,now){
  var dt=ev.time-now, w=ev._base;
  if(dt<24*HOUR) w+=40; else if(dt<48*HOUR) w+=20; else if(dt<7*DAY) w+=8;
  ev.impact_weight=w; return ev;
}
/* The aggregator: pulls every time-bound source, normalizes to
   {title,time,kind,deep_link,impact_weight}, fail-open per source.
   cb(list) with impact-sorted upcoming items. */
function collect(cb,limit){
  var now=Date.now(), out=[], pending=3, settled=false;
  function one(){ if(--pending<=0) finish(); }
  function finish(){
    if(settled) return; settled=true;
    var list=[];
    for(var i=0;i<out.length;i++){
      var ev=out[i];
      if(!ev||!(ev.time>now-HOUR)) continue; /* drop the stale */
      list.push(impact(ev,now));
    }
    list.sort(function(a,b){ return b.impact_weight-a.impact_weight; });
    cb(list.slice(0,limit||24));
  }
  try{ out.push(dailyOrdersEv()); }catch(e){}
  api('calendar_events',{},function(j){
    try{
      var evs=(j&&(j.events||[]))||[];
      for(var i=0;i<evs.length;i++){ var n=normCal(evs[i]); if(n) out.push(n); }
    }catch(e){}
    one();
  });
  api('proposal_list',{},function(j){
    try{
      var ps=(j&&(j.proposals||[]))||[];
      for(var i=0;i<ps.length;i++){
        if(ps[i]&&ps[i].status==='open'&&(+ps[i].closes_at)>now){ var n=normProp(ps[i]); if(n) out.push(n); }
      }
    }catch(e){}
    one();
  });
  api('predict_qlist',{},function(j){
    try{
      var qs=(j&&(j.questions||[]))||[];
      for(var i=0;i<qs.length;i++){
        if(qs[i]&&qs[i].status==='open'&&(+qs[i].lock_at)>now){ var n=normQ(qs[i]); if(n) out.push(n); }
      }
    }catch(e){}
    one();
  });
  setTimeout(finish,12000); /* backstop: render whatever arrived */
}
/* ============ END SHARED CORE ============ */
var root=null, box=null, items=[], shown=[], mode='impact';
function hide(){
  try{ var sec=root&&root.closest?root.closest('section'):null; (sec||root).style.display='none'; }catch(e){}
}
function shareIt(btn,ev){
  var url='';
  try{ url=location.origin+ev.deep_link; }catch(e){ url=ev.deep_link; }
  var text=ev.title+' — '+url;
  function doneOk(){ try{ btn.textContent='SHARED \u2713'; }catch(e){} setTimeout(function(){ try{btn.textContent='SHARE THIS INTEL';}catch(x){} },2200); }
  function copyFb(){
    try{
      var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      var okd=false; try{ okd=document.execCommand('copy'); }catch(e){}
      document.body.removeChild(ta); if(okd) doneOk();
    }catch(e){}
  }
  try{
    if(navigator.share){ navigator.share({title:'MTCSTW Intel',text:ev.title,url:url}).then(doneOk,function(){}); return; }
  }catch(e){}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(doneOk,copyFb); return; }
  }catch(e){}
  copyFb();
}
function cardHTML(ev,now,idx){
  var b=badge(ev.time,now);
  var h='<div class="wt-card">';
  h+='<div class="wt-top"><span class="wt-badge">'+esc(b)+'</span><span class="wt-kind">'+esc(KIND_LABEL[ev.kind]||ev.kind)+'</span></div>';
  h+='<div class="wt-title">'+esc(ev.title)+'</div>';
  h+='<div class="wt-meta">'+esc(fmtDay(ev.time)+' · '+fmtClock(ev.time))+(ev.detail?'<br>'+esc(ev.detail):'')+'</div>';
  if(ev.deep_link) h+='<a class="wt-deploy" href="'+esc(ev.deep_link)+'">DEPLOY &rarr;</a>';
  /* Action Bar — where sensible (skip ambient discord routines). */
  if(ev.deep_link&&ev.kind!=='discord'){
    var rep=REPORT_LINK[ev.kind]||'/#pf-orders';
    h+='<div class="wt-bar">'
      +'<button class="wt-act" data-wt="share" data-wt-idx="'+idx+'">SHARE THIS INTEL</button>'
      +'<a class="wt-act" href="/cells">TAKE THIS TO YOUR CELL</a>'
      +'<a class="wt-act" href="'+esc(rep)+'">REPORT BACK &rarr;</a>'
      +'</div>';
  }
  h+='</div>';
  return h;
}
function render(){
  if(!box) return;
  var now=Date.now();
  shown=items.slice();
  if(mode==='chrono') shown.sort(function(a,b){ return a.time-b.time; });
  else shown.sort(function(a,b){ return b.impact_weight-a.impact_weight; });
  if(!shown.length){ hide(); return; }
  var h='<div class="wt-sort" role="group" aria-label="Timeline sort order">'
    +'<button class="wt-sortbtn" data-wt-sort="impact" aria-pressed="'+(mode==='impact'?'true':'false')+'">IMPACT</button>'
    +'<button class="wt-sortbtn" data-wt-sort="chrono" aria-pressed="'+(mode==='chrono'?'true':'false')+'">CHRONOLOGICAL</button>'
    +'</div>';
  for(var i=0;i<shown.length;i++) h+=cardHTML(shown[i],now,i);
  h+='<div class="wt-foot">Impact = deadline weight &times; how soon it hits. Flip to CHRONOLOGICAL for the straight clock.</div>';
  box.innerHTML=h;
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-wt],[data-wt-sort]'):null; }catch(x){}
  if(!t||!root) return;
  var s=t.getAttribute('data-wt-sort');
  if(s){ mode=(s==='chrono')?'chrono':'impact'; render(); return; }
  if(t.getAttribute('data-wt')==='share'){
    var idx=+t.getAttribute('data-wt-idx');
    if(isFinite(idx)&&shown[idx]) shareIt(t,shown[idx]);
  }
}
function load(){
  root=document.getElementById('pf-wartimeline');
  if(!root) return;
  box=document.getElementById('xWarTimeline');
  if(!box) return;
  root.addEventListener('click',onClick);
  collect(function(list){ items=list; render(); },16);
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
