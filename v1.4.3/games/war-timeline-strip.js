/* games/war-timeline-strip.js  |  PF v1.4.3 | WAR TIMELINE STRIP (PLAY 5 — UX Combination Plays Wave 2).
   Compact companion to war-timeline.js: the next 3 upcoming items from the
   same unified feed, mounted in the hub homepage YOUR CAMPAIGN area
   (right after the mounted #pf-campaign block). Self-mounts by DOM presence —
   polls for #pf-campaign up to 20s, then gives up silently (fail-open).
   AGGREGATION: same four sources as war-timeline.js (calendar_events,
   proposal_list closes, predict_qlist locks, computed Daily Orders expiry),
   same normalization {title,time,kind,deep_link,impact_weight}, each source
   fail-open. The aggregator core is mirrored from war-timeline.js — keep the
   two in sync.
   No XP anywhere. No writes. Zero new mechanics, zero new currencies.
   KILL: ?pf_off=wartimeline-strip (or ?pf_off=wartimeline) or
   localStorage pf_disabled_v1='["wartimeline-strip"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wartimeline-strip') || PF.skip('wartimeline')) { return; }
  if (window.pfWarTimelineStripDone) { return; }
  window.pfWarTimelineStripDone = true;
  /* ============ SHARED AGGREGATOR CORE — mirrored from war-timeline.js ============ */
  var BACKEND = window.PF_BACKEND_URL;
  var HOUR = 3600000, DAY = 86400000;
  /* Event-kind vocabulary (single source of truth for the timeline):
     irl | governance | prediction | streak_reset | season_end | daily_orders |
     war_report | fan_vote | draw | liveops | discord */
  var KIND_BASE = {season_end:100, irl:95, governance:88, prediction:78, liveops:72, streak_reset:62, war_report:58, fan_vote:52, draw:46, daily_orders:42, discord:24};
  var KIND_LABEL = {season_end:'SEASON END', irl:'STREET', governance:'ASSEMBLY VOTE', prediction:'CALL IT.', liveops:'WAR ROOM', streak_reset:'STREAK RESET', war_report:'WAR REPORT', fan_vote:'FAN VOTE', draw:'DRAW', daily_orders:'DAILY ORDERS', discord:'DISCORD'};
  var KIND_LINK = {season_end:'/', irl:'/events', governance:'/political-hq#pf-gov', prediction:'/arcade#pf-predgame', liveops:'/war-room', streak_reset:'/#pf-ranks', war_report:'/war-report', fan_vote:'/#pf-fanvote', draw:'/#pf-draw', daily_orders:'/#pf-orders', discord:''};
  var CAL_KIND = {irl:'irl', liveops:'liveops', draw:'draw', warreport:'war_report', fanvote:'fan_vote', medals:'streak_reset', offensive:'season_end', discord:'discord'};
  function chiParts(ts){
    try{
      var ps = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
      var o = {}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }
      return {y:+o.year, m:+o.month, d:+o.day};
    }catch(e){ var d=new Date(ts); return {y:d.getFullYear(), m:d.getMonth()+1, d:d.getDate()}; }
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
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  /* URLs come from our own backend, but never trust a scheme — only allow
     relative paths and http(s). Anything else falls back to /events.
     NB: this file stages nothing in a template literal, so the regex below
     is the plain /^(https?:\/\/|\/)/i the browser receives. */
  function safeUrl(u){
    var s=String(u==null?'':u).trim();
    if(/^(https?:\/\/|\/)/i.test(s)) return s;
    return '/events';
  }
  function chiNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})); }catch(e){ return new Date(); } }
  function api(action,params,cb){
    if(!BACKEND){ cb(null); return; }
    var fn='pfWtSCb'+Math.floor(Math.random()*1e9);
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
    return {title:String(ev.title||'Upcoming'), time:ts, kind:k,
      deep_link:safeUrl(ev.url||KIND_LINK[k]||'/events'), _base:KIND_BASE[k]||30};
  }
  function normProp(p){
    var ts=+p.closes_at; if(!isFinite(ts)||ts<=0) return null;
    return {title:'VOTE CLOSES: '+String(p.title||'Proposal'), time:ts, kind:'governance',
      deep_link:KIND_LINK.governance, _base:KIND_BASE.governance};
  }
  function normQ(q){
    var ts=+q.lock_at; if(!isFinite(ts)||ts<=0) return null;
    return {title:'CALL IT. LOCKS: '+String(q.title||'Question'), time:ts, kind:'prediction',
      deep_link:KIND_LINK.prediction, _base:KIND_BASE.prediction};
  }
  function dailyOrdersEv(){
    var ts;
    try{ var end=chiNow(); end.setHours(24,0,0,0); ts=end.getTime(); }
    catch(e){ var d=new Date(); d.setHours(24,0,0,0); ts=d.getTime(); }
    return {title:'New Daily Orders drop', time:ts, kind:'daily_orders',
      deep_link:KIND_LINK.daily_orders, _base:KIND_BASE.daily_orders};
  }
  function impact(ev,now){
    var dt=ev.time-now, w=ev._base;
    if(dt<24*HOUR) w+=40; else if(dt<48*HOUR) w+=20; else if(dt<7*DAY) w+=8;
    ev.impact_weight=w; return ev;
  }
  function collect(cb,limit){
    var now=Date.now(), out=[], pending=3, settled=false;
    function one(){ if(--pending<=0) finish(); }
    function finish(){
      if(settled) return; settled=true;
      var list=[];
      for(var i=0;i<out.length;i++){
        var ev=out[i];
        if(!ev||!(ev.time>now-HOUR)) continue;
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
    setTimeout(finish,12000);
  }
  /* ============ END SHARED CORE ============ */
  var CSS = '#pf-wtstrip .ws-row{display:flex;gap:10px;align-items:baseline;padding:9px 0;border-top:1px solid #3a2c22}'
    + '#pf-wtstrip .ws-row:first-of-type{border-top:0}'
    + '#pf-wtstrip .ws-badge{flex:0 0 auto;background:#c1121f;color:#fff;font-weight:900;font-size:11px;letter-spacing:.08em;padding:3px 8px;font-family:Arial,Helvetica,sans-serif}'
    + '#pf-wtstrip .ws-kind{flex:0 0 auto;color:#8a8070;font-weight:800;font-size:10px;letter-spacing:.08em;font-family:Arial,Helvetica,sans-serif}'
    + '#pf-wtstrip .ws-t{flex:1 1 auto;font-weight:700;font-size:14px;color:#f5ead6;line-height:1.35;word-wrap:break-word;overflow-wrap:anywhere;font-family:Arial,Helvetica,sans-serif}'
    + '#pf-wtstrip .ws-t a{color:#f5ead6;text-decoration:none}'
    + '#pf-wtstrip .ws-t a:hover{color:#fff;text-decoration:underline}'
    + '#pf-wtstrip .ws-more{display:inline-block;margin-top:8px;color:#dc143c;font-size:13px;font-weight:900;letter-spacing:.06em;text-decoration:none;font-family:Arial,Helvetica,sans-serif}';
  function mount(){
    var camp=null;
    try{ camp=document.getElementById('pf-campaign'); }catch(e){}
    if(!camp||!camp.parentNode) return false;
    if(document.getElementById('pf-wtstrip')) return true;
    var el=document.createElement('div');
    el.className='fe-block pf-override-block pf-silo';
    el.id='pf-wtstrip';
    var st=document.createElement('style'); st.textContent=CSS;
    el.appendChild(st);
    var head=document.createElement('h3');
    head.style.cssText='font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:.06em;font-size:16px;color:#f5ead6;margin:0 0 4px';
    head.textContent='NEXT ON THE WAR TIMELINE';
    el.appendChild(head);
    var body=document.createElement('div');
    body.id='xWtStrip';
    body.innerHTML='<div class="c-load">Reading the battlefield&hellip;</div>';
    el.appendChild(body);
    camp.parentNode.insertBefore(el, camp.nextSibling);
    collect(function(list){
      var box=document.getElementById('xWtStrip');
      if(!box) return;
      if(!list.length){ el.style.display='none'; return; }
      var now=Date.now(), h='';
      for(var i=0;i<Math.min(3,list.length);i++){
        var ev=list[i];
        h+='<div class="ws-row"><span class="ws-badge">'+esc(badge(ev.time,now))+'</span>'
          +'<span class="ws-kind">'+esc(KIND_LABEL[ev.kind]||ev.kind)+'</span>'
          +'<span class="ws-t"><a href="'+esc(ev.deep_link||'/events')+'">'+esc(ev.title)+'</a></span></div>';
      }
      h+='<a class="ws-more" href="/events">FULL TIMELINE &rarr;</a>';
      box.innerHTML=h;
    },3);
    return true;
  }
  /* YOUR CAMPAIGN area mounts lazily — poll for it, give up silently. */
  var tries=0;
  var timer=setInterval(function(){
    tries++;
    try{ if(mount()){ clearInterval(timer); return; } }catch(e){}
    if(tries>=40){ clearInterval(timer); }
  },500);
})();
