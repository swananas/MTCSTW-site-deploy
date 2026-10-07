/* games/user-dashboard.js  |  PF v1.4.3 | MY HQ — the user dashboard hub.
   CEO-approved 2026-10-07. This is a HUB, not a widget pile: five compact
   sections, one composite backend call, everything reachable within 2 taps.

   1. IDENTITY / USER HUB — callsign, XP, rank + progress to next, streak,
      service-medals rack (device-local, service-medals.js schema), weekly
      challenge status. No callsign -> the one-prompt claim card (ONE clear
      prompt, once ever — reuses the existing PF.requireCallsign flow).
   2. FEATURE GRID — 14 compact link-cards (icon, name, one-liner, deep
      link). Routing, not embedding.
   3. CALENDAR — 7-day strip + next-7-days rail from dashboard_init.calendar,
      "full calendar -> /events". ALWAYS renders: falls back to the recurring
      rhythm when the backend returns nothing (CEO directive 2026-10-07).
   4. PERSONAL ACTIVITY — recent actions + weekly medal progress toward
      FULL DEPLOYMENT + rank XP progress.
   5. MY DATA — the caller's own movement-intelligence contributions
      (prices reported, bounties completed, data submitted). Aggregated
      counts only, never anyone else's data. Ethics line:
      "your activity powers the movement's intelligence."

   Mounted by pages/page-mount.js on #pf-dashboard (Squarespace Code block
   hand-step). Template-first silo like master-calendar.js: stages
   <template id="pf-ov-userdash"> into PF.holder(); the inner script renders
   into #pf-userdash after mount.

   LAYERING: a game silo. ONE JSONP call (dashboard_init). It never reaches
   into another silo's internals. Zero writes, zero XP minted here.
   FAIL-SOFT: every section renders independently; null/failed data hides
   the section (or shows an honest line), never throws, never spins forever.
   KILL: ?pf_off=userdash  or  localStorage pf_disabled_v1='["userdash"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('userdash')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-userdash">
<div class="fe-block pf-override-block pf-silo" id="pf-userdash">
<h2>My HQ</h2>
<div class="c-tag">Your war, your numbers, your next move — everything within two taps.</div>
<div id="xUserDash"><div class="c-load">Mustering&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function isEditor(){ try{
  var h=window.location.href||'';
  if(h.indexOf('/config/')!==-1) return true;
  var b=document.body;
  if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
  return false; }catch(e){ return false; } }
/* URLs come from our own backend + our own grid — never trust a scheme. */
function safeUrl(u){
  var s=String(u==null?'':u).trim();
  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;
  return '/';
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfUdCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },15000);
}
function ident(){ var cs='',dev='',sec='';
  try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){}
  try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){}
  try{ sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():''; }catch(e){}
  return {callsign:cs,device:dev,auth_secret:sec}; }
/* Weekly medal rack — mirrors games/service-medals.js MEDALS (glyphs only;
   the rack itself is owned there; we never write it). */
var MEDALS=[
 ['vote','\\u2605','Ballot'],['ballot','\\u2622','Bracket Ballot'],
 ['bracket','\\u2620','Liquidator'],['caption','\\u270E','Word Warrior'],
 ['poster','\\u25C8','Press Pass'],['quiz','\\u25C9','Intel Operative'],
 ['billionaire','\\uFF04','Billionaire Spotter'],['interrogation','\\u2754','Interrogator'],
 ['orders','\\u25B2','Field Duty'],['drop','\\u25CF','Supply Runner'],
 ['enlisted','\\u2694','Enlisted'],['guess','\\u25CE','Profiler'],
 ['raid','\\u26A1','Raider'],['infight','\\uD83E\\uDD4A','Brawler'],
 ['whitemarket','\\uD83C\\uDFB2','Market Maker'],['civic','\\uD83D\\uDDF3','Civic Duty']];
function medalState(){
  try{
    var wk='';
    try{ if(window.PF&&PF.isoWeekKey&&PF.chiNow) wk=PF.isoWeekKey(PF.chiNow()); }catch(e){}
    var s=JSON.parse(localStorage.getItem('pf_medals_v2')||'null');
    if(!s||typeof s!=='object'||!s.m) return {got:0,total:MEDALS.length,m:{},fd:false,stale:true};
    if(wk&&s.w&&s.w!==wk) return {got:0,total:MEDALS.length,m:{},fd:false,stale:true};
    var got=0;
    for(var i=0;i<MEDALS.length;i++){ if(s.m[MEDALS[i][0]]) got++; }
    return {got:got,total:MEDALS.length,m:s.m,fd:!!s.fd,stale:false};
  }catch(e){ return {got:0,total:MEDALS.length,m:{},fd:false,stale:true}; }
}
/* The 14-card feature grid — the Oct 6 synergy requirement: every major
   feature reachable within 2 taps. icon / name / one-liner / deep link. */
var GRID=[
 ['\\uD83C\\uDFAE','Arcade','Six games. Zero mercy.','/arcade','orders'],
 ['\\u26A1','Cells','Your squad, your war.','/cells','social'],
 ['\\uD83C\\uDFA8','Create','The propaganda workshop.','/create'],
 ['\\uD83C\\uDFE6','Bank',"Your XP, weaponized.",'/bank'],
 ['\\uD83D\\uDCCA','Economy','Spend XP like it matters.','/economy'],
 ['\\uD83D\\uDCB0','War Chest','Fund the fight.','/war-chest'],
 ['\\uD83E\\uDD1D','Ventures','Pool up. Back creators.','/ventures'],
 ['\\uD83D\\uDCCD','Events','Boots on the ground.','/events'],
 ['\\uD83D\\uDCF0','War Report','The week in the war.','/war-report','vote'],
 ['\\uD83C\\uDF93','Academy','Learn the craft.','/request-access'],
 ['\\uD83D\\uDD2E','CALL IT.','Call it before it happens.','/call-it'],
 ['\\uD83C\\uDFC6','Liquidation','The brackets. The carnage.','/liquidation'],
 ['\\uD83C\\uDFDB\\uFE0F','Political HQ','Pressure where it hurts.','/political-hq','briefing'],
 ['\\uD83D\\uDD75\\uFE0F','Follow the Money','See who funds the votes.','/follow-the-money',null]];
function fmtNum(n){ try{ return Number(n).toLocaleString('en-US'); }catch(e){ return String(n==null?'':n); } }
/* Live stat line per tile-key (dashboard_init.tiles). CEO vision 2026-10-07:
   super condensed info hub — cards carry live numbers, not just links.
   Fail-soft: missing tile = no line, card still renders as a plain link. */
function tileLine(key,t){
  t=t||{};
  try{
    if(key==='orders'&&t.orders&&typeof t.orders.raiders==='number')
      return '\\u2694 '+fmtNum(t.orders.raiders)+' reported today';
    if(key==='vote'&&t.vote&&typeof t.vote.total==='number')
      return '\\uD83D\\uDDF3 '+fmtNum(t.vote.total)+' votes this week';
    if(key==='briefing'&&t.briefing&&t.briefing.head)
      return '\\uD83D\\uDCF0 '+(t.briefing.tag?String(t.briefing.tag).toUpperCase()+': ':'')+String(t.briefing.head).slice(0,42)+'\\u2026';
    if(key==='social'&&t.social){
      var sc=t.social,bits=[];
      if(sc.online_now!=null) bits.push(fmtNum(sc.online_now)+' online');
      if(sc.active_cells) bits.push(fmtNum(sc.active_cells)+' cells active');
      if(bits.length) return '\\uD83D\\uDD25 '+bits.join(' \\u00B7 ');
    }
  }catch(e){}
  return '';
}
function css(){
  if(document.getElementById('pf-ud-css')) return;
  var s=document.createElement('style'); s.id='pf-ud-css';
  s.textContent=
   '.ud-sec{margin:0 0 22px}.ud-h{font:bold 13px Arial;letter-spacing:3px;color:#dc143c;margin:0 0 10px}'
  +'.ud-card{background:#0d0d0d;border:1px solid #2c2c2c;border-radius:6px;padding:16px;box-sizing:border-box}'
  +'.ud-id-cs{font-family:"Arial Black",Arial;font-size:24px;letter-spacing:2px;color:#f5ead6;margin:0 0 2px}'
  +'.ud-id-rank{font:bold 12px Arial;letter-spacing:2px;color:#e8b33c;margin:0 0 10px}'
  +'.ud-bar{height:10px;background:#1e1e1e;border:1px solid #333;border-radius:5px;overflow:hidden;margin:6px 0 4px}'
  +'.ud-bar>i{display:block;height:100%;background:#c1121f}'
  +'.ud-bar-gold>i{background:#e8b33c}'
  +'.ud-meta{font:12px Arial;color:#a89e88;line-height:1.7}'
  +'.ud-meta b{color:#f5ead6}'
  +'.ud-streak{font:bold 14px Arial;color:#f5ead6}'
  +'.ud-warn{color:#ff6b5e;font-weight:700}'
  +'.ud-rack{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}'
  +'.ud-medal{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid #333;border-radius:6px;background:#141414;color:#555;box-sizing:border-box}'
  +'.ud-medal.got{border-color:#e8b33c;color:#e8b33c;background:#1c1503}'
  +'.ud-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}'
  +'@media(min-width:700px){.ud-grid{grid-template-columns:repeat(4,1fr)}}'
  +'.ud-cell{display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 12px;background:#0d0d0d;border:1px solid #2c2c2c;border-radius:6px;color:#f5ead6;text-decoration:none;box-sizing:border-box;font-family:Arial,sans-serif}'
  +'.ud-cell:active{transform:scale(.97);border-color:#c1121f}'
  +'.ud-ico{font-size:22px;line-height:1;flex:0 0 auto}'
  +'.ud-nm{font-size:13px;font-weight:800;letter-spacing:.5px}'
  +'.ud-ds{font-size:11px;color:#a89e88;margin-top:2px}'
  +'.ud-row{display:flex;align-items:baseline;gap:10px;padding:9px 2px;border-bottom:1px solid #1c1c1c;font:13px Arial;color:#f5ead6}'
  +'.ud-row:last-child{border-bottom:0}'
  +'.ud-when{flex:0 0 92px;font:bold 11px Arial;color:#e8b33c;letter-spacing:1px}'
  +'.ud-what{flex:1;min-width:0}'
  +'.ud-go{color:#dc143c;font-weight:800;text-decoration:none;white-space:nowrap}'
  +'.ud-act{display:flex;align-items:baseline;gap:10px;padding:8px 2px;border-bottom:1px solid #1c1c1c;font:12px Arial;color:#a89e88}'
  +'.ud-act:last-child{border-bottom:0}'
  +'.ud-xp{margin-left:auto;font:bold 12px Arial;color:#e8b33c;white-space:nowrap}'
  +'.ud-claim{display:block;width:100%;min-height:52px;background:#c1121f;color:#fff;border:0;border-radius:6px;font:bold 15px Arial;letter-spacing:2px;cursor:pointer;margin-top:12px}'
  +'.ud-more{display:block;text-align:center;margin:12px 0 0;font:bold 12px Arial;letter-spacing:2px;color:#dc143c;text-decoration:none;min-height:44px;line-height:44px}'
  +'.ud-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center}'
  +'.ud-stat{background:#0d0d0d;border:1px solid #2c2c2c;border-radius:6px;padding:14px 6px}'
  +'.ud-stat b{display:block;font-family:"Arial Black",Arial;font-size:22px;color:#e8b33c}'
  +'.ud-stat span{font:11px Arial;color:#a89e88;letter-spacing:1px}'
  +'.ud-eth{font:12px Arial;color:#a89e88;margin:10px 2px 0;line-height:1.6;font-style:italic}'
  +'.ud-vp{font:bold 14px Arial;color:#f5ead6;line-height:1.6;margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid #2c2c2c}'
  +'.ud-tl{display:block;font:bold 11px Arial;color:#e8b33c;margin-top:3px}'
  +'.ud-today{display:flex;align-items:baseline;gap:10px;padding:11px 2px;border-bottom:1px solid #1c1c1c;text-decoration:none;min-height:44px;box-sizing:border-box}'
  +'.ud-today:last-child{border-bottom:0}'
  +'.ud-today.ud-static{cursor:default}'
  +'.ud-tk{flex:0 0 auto;font:bold 10px Arial;letter-spacing:2px;color:#dc143c;white-space:nowrap}'
  +'.ud-th{flex:1;min-width:0;font:13px Arial;color:#f5ead6;line-height:1.5}'
  +'.ud-calstrip{display:flex;gap:6px;margin:8px 0 12px}'
  +'.ud-calday{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;background:#141414;border:1px solid #2c2c2c;border-radius:6px;box-sizing:border-box;min-height:56px;justify-content:center}'
  +'.ud-caltoday{border-color:#c1121f;background:#1c0a0a}'
  +'.ud-calev{border-color:#e8b33c}'
  +'.ud-caldow{font:bold 9px Arial;color:#a89e88;letter-spacing:1px}'
  +'.ud-caltoday .ud-caldow{color:#dc143c}'
  +'.ud-calnum{font-family:"Arial Black",Arial;font-size:18px;color:#f5ead6;line-height:1}'
  +'.ud-caldot{width:6px;height:6px;border-radius:50%;background:#e8b33c;margin-top:2px}';
  try{ document.head.appendChild(s); }catch(e){}
}
function sec(title,inner){
  return '<div class="ud-sec"><div class="ud-h">'+esc(title)+'</div>'+inner+'</div>';
}
function relTime(ts){
  try{
    var d=Date.now()-Number(ts); if(!(d>=0)) return 'just now';
    var m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m ago';
    var h=Math.floor(m/60); if(h<24) return h+'h ago';
    var days=Math.floor(h/24); return days+'d ago';
  }catch(e){ return ''; }
}
function actLabel(key,reason){
  var k=String(key||'').toLowerCase(), r=String(reason||'');
  if(k.indexOf('checkin')>=0||k.indexOf('streak')===0) return 'Daily check-in';
  if(k.indexOf('vote')>=0) return 'Fan vote';
  if(k.indexOf('poster')>=0||k.indexOf('press')>=0) return 'Poster forged';
  if(k.indexOf('caption')>=0) return 'Caption combat';
  if(k.indexOf('quiz')>=0) return 'Quiz / intel';
  if(k.indexOf('order')>=0||k.indexOf('mission')>=0) return 'Mission complete';
  if(k.indexOf('share')>=0) return 'Share';
  if(k.indexOf('price')>=0||k.indexOf('cpi')>=0) return 'Price reported';
  if(k.indexOf('bounty')>=0) return 'Bounty action';
  if(k.indexOf('deploy')>=0) return 'Full deployment';
  if(k.indexOf('raid')>=0) return 'Supply raid';
  if(k.indexOf('refer')>=0||k.indexOf('recruit')>=0) return 'Recruit';
  if(r) return r.slice(0,40);
  return k ? k.replace(/[_:]/g,' ').slice(0,40) : 'Action';
}
function renderIdentity(id,ms){
  if(!id){
    /* No signed-in identity: the one-prompt claim card. ONE clear prompt,
       once ever — the existing requireCallsign claim flow (same register
       POST, zero new XP mechanics). */
    return sec('WHO ARE YOU HERE?',
      '<div class="ud-card"><div class="ud-vp">62 sick radicals. Real data on the billionaires. Daily missions. Free forever.</div>'
      +'<div class="ud-id-cs">NO CALLSIGN YET</div>'
      +'<div class="ud-meta">One name. Every game, every cell, every medal — '
      +'your XP follows it everywhere.</div>'
      +'<button class="ud-claim" id="udClaim">CLAIM YOUR CALLSIGN</button></div>');
  }
  var r=id.rank||{}, st=id.streak||{}, ch=id.challenge||null;
  var xp=Number(id.xp)||0;
  var nextLine=r.next_name
    ? 'Next: <b>'+esc(r.next_name)+'</b> at '+Number(r.next_xp).toLocaleString('en-US')+' XP'
    : '<b>Max rank reached.</b>';
  var streakLine='<span class="ud-streak">\\uD83D\\uDD25 '+Number(st.count||0)+'-day streak</span>';
  if(st.at_risk) streakLine+=' <span class="ud-warn">— CHECK IN TODAY OR IT DIES</span>';
  else if(st.checked_in_today) streakLine+=' <span style="color:#27ae60">— safe today</span>';
  var chLine=ch&&ch.title
    ? '<div class="ud-meta" style="margin-top:8px">This week: <b>'+esc(ch.title)+'</b>'
      +(ch.active?' <span style="color:#27ae60">— LIVE</span>':' <span style="color:#a89e88">— ended '+esc(ch.end_day||'')+'</span>')
      +' · <a href="/cells" style="color:#dc143c;font-weight:700">rally your cell →</a></div>'
    : '';
  return sec('WHO AM I HERE?',
    '<div class="ud-card">'
    +'<div class="ud-id-cs">'+esc(id.callsign||'SOLDIER')+'</div>'
    +'<div class="ud-id-rank">'+esc(r.name||'RECRUIT')+' · '+xp.toLocaleString('en-US')+' XP</div>'
    +'<div class="ud-bar"><i style="width:'+Math.min(100,Math.max(0,Number(r.progress_pct)||0))+'%"></i></div>'
    +'<div class="ud-meta">'+nextLine+'</div>'
    +'<div class="ud-meta" style="margin-top:6px">'+streakLine+'</div>'
    +rackHtml(ms)
    +chLine
    +'</div>');
}
function rackHtml(ms){
  var h='<div class="ud-rack" role="img" aria-label="'+ms.got+' of '+ms.total+' weekly service medals earned">';
  for(var i=0;i<MEDALS.length;i++){
    var got=!!(ms.m&&ms.m[MEDALS[i][0]]);
    h+='<span class="ud-medal'+(got?' got':'')+'" title="'+esc(MEDALS[i][2])+'">'+MEDALS[i][1]+'</span>';
  }
  h+='</div>';
  if(ms.fd) h+='<div class="ud-meta">\\u2605 <b style="color:#e8b33c">FULL DEPLOYMENT</b> — rack complete this week.</div>';
  else h+='<div class="ud-meta">'+ms.got+'/'+ms.total+' medals this week — full rack = <b>FULL DEPLOYMENT</b> (+50 XP, Vanguard Wall).</div>';
  return h;
}
function renderGrid(t){
  var h='<div class="ud-grid">';
  for(var i=0;i<GRID.length;i++){
    var tl=tileLine(GRID[i][4],t);
    h+='<a class="ud-cell" href="'+safeUrl(GRID[i][3])+'">'
      +'<span class="ud-ico">'+GRID[i][0]+'</span>'
      +'<span><span class="ud-nm">'+esc(GRID[i][1])+'</span><br>'
      +'<span class="ud-ds">'+esc(GRID[i][2])+'</span>'
      +(tl?'<br><span class="ud-tl">'+esc(tl)+'</span>':'')+'</span></a>';
  }
  return sec('EVERYTHING, TWO TAPS', h+'</div>');
}
/* TODAY — the condensed info lead (CEO vision 2026-10-07): today's truth
   drop, today's missions, this week's vote, the movement right now — every
   row a one-tap action. Tiles are public; renders for everyone. */
function renderToday(t){
  t=t||{};
  var h='';
  var b=t.briefing,o=t.orders,v=t.vote,sc=t.social;
  if(b&&b.head){
    h+='<a class="ud-today" href="/political-hq">'
      +'<span class="ud-tk">TODAY\u2019S TRUTH'+(b.tag?' \u00B7 '+esc(String(b.tag).toUpperCase()):'')+'</span>'
      +'<span class="ud-th">'+esc(b.head)+'</span>'
      +'<span class="ud-go">READ \u2192</span></a>';
  }
  if(o&&typeof o.raiders==='number'){
    h+='<a class="ud-today" href="/#pf-orders">'
      +'<span class="ud-tk">TODAY\u2019S MISSIONS</span>'
      +'<span class="ud-th">'+fmtNum(o.raiders)+' soldiers reported today</span>'
      +'<span class="ud-go">DO \u2192</span></a>';
  }
  if(v&&typeof v.total==='number'){
    h+='<a class="ud-today" href="/#pf-vote">'
      +'<span class="ud-tk">FAN VOTE \u00B7 THIS WEEK</span>'
      +'<span class="ud-th">'+fmtNum(v.total)+' votes cast</span>'
      +'<span class="ud-go">VOTE \u2192</span></a>';
  }
  if(sc){
    var bits=[];
    if(sc.checkins_today) bits.push(fmtNum(sc.checkins_today)+' checked in today');
    if(sc.xp_earned_today) bits.push(fmtNum(sc.xp_earned_today)+' XP earned today');
    if(sc.active_cells) bits.push(fmtNum(sc.active_cells)+' cells active');
    if(sc.online_now!=null) bits.push(fmtNum(sc.online_now)+' online now');
    if(bits.length){
      h+='<div class="ud-today ud-static"><span class="ud-tk">THE MOVEMENT RIGHT NOW</span>'
        +'<span class="ud-th">'+esc(bits.join(' \u00B7 '))+'</span></div>';
    }
  }
  if(!h) return '';
  return sec('TODAY','<div class="ud-card" style="padding:6px 14px">'+h+'</div>');
}
/* CALENDAR — the 7-day strip + upcoming events (CEO directive 2026-10-07).
   Always renders: backend events from dashboard_init.calendar, with a
   built-in fallback schedule so the widget is never an empty void.
   Condensed, mobile-first, matches the hub's visual language. */
var CAL_FALLBACK=[
 ['Evening debrief','Discord #daily-mission','/events','daily'],
 ['Morning briefing','Discord #morning-briefing','/events','daily'],
 ['Daily mission','New orders drop','/#pf-orders','daily'],
 ['Fan vote closes','Propagandist of the Week','/#pf-vote','Sun'],
 ['War Report','The week in the war','/war-report','Mon'],
 ['Service medals reset','New rack, new medals','/arcade','Mon']];
function calDayLabel(ts){
  try{
    var d=new Date(Number(ts));
    var days=['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var mon=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return days[d.getDay()]+' '+mon[d.getMonth()]+' '+d.getDate();
  }catch(e){ return ''; }
}
function renderCalendar(cal){
  var evs=(cal&&cal.events)||[];
  var now=Date.now(), upcoming=[];
  for(var i=0;i<evs.length;i++){
    var ts=Number(evs[i].ts)||0;
    if(ts>=now-3600000&&ts<=now+7*86400000) upcoming.push(evs[i]);
  }
  upcoming.sort(function(a,b){ return (Number(a.ts)||0)-(Number(b.ts)||0); });
  upcoming=upcoming.slice(0,7);
  /* 7-day strip header: visual calendar feel, always shows. */
  var strip='<div class="ud-calstrip">';
  var dayMs=86400000, today=new Date(); today.setHours(0,0,0,0);
  var t0=today.getTime();
  var dayNames=['S','M','T','W','T','F','S'];
  for(var d=0;d<7;d++){
    var dt=new Date(t0+d*dayMs);
    var hasEv=false;
    for(var k=0;k<upcoming.length;k++){
      var ets=Number(upcoming[k].ts)||0;
      var ed=new Date(ets); ed.setHours(0,0,0,0);
      if(ed.getTime()===t0+d*dayMs){ hasEv=true; break; }
    }
    strip+='<div class="ud-calday'+(d===0?' ud-caltoday':'')+(hasEv?' ud-calev':'')+'">'
      +'<span class="ud-caldow">'+dayNames[dt.getDay()]+'</span>'
      +'<span class="ud-calnum">'+dt.getDate()+'</span>'
      +(hasEv?'<span class="ud-caldot"></span>':'')+'</div>';
  }
  strip+='</div>';
  var h=strip;
  if(upcoming.length){
    for(var j=0;j<upcoming.length;j++){
      var e=upcoming[j];
      h+='<div class="ud-row"><span class="ud-when">'+esc(e.date_label||calDayLabel(e.ts))+'</span>'
        +'<span class="ud-what">'+esc(e.title||'')+'</span>'
        +'<a class="ud-go" href="'+safeUrl(e.url||'/events')+'">GO →</a></div>';
    }
  } else {
    /* Fallback: the recurring rhythm, so the widget always has content. */
    for(var f=0;f<Math.min(CAL_FALLBACK.length,5);f++){
      var fe=CAL_FALLBACK[f];
      h+='<div class="ud-row"><span class="ud-when">'+esc(fe[3].toUpperCase())+'</span>'
        +'<span class="ud-what">'+esc(fe[0])+' <span style="color:#a89e88">· '+esc(fe[1])+'</span></span>'
        +'<a class="ud-go" href="'+safeUrl(fe[2])+'">GO →</a></div>';
    }
  }
  h+='<a class="ud-more" href="/events">FULL CALENDAR →</a>';
  return sec('CALENDAR', '<div class="ud-card" style="padding:6px 14px">'+h+'</div>');
}
function renderActivity(act,ms){
  if(!act) return '';
  var h='';
  var rec=act.recent||[];
  if(rec.length){
    h+='<div class="ud-card" style="padding:6px 14px;margin-bottom:10px">';
    for(var i=0;i<Math.min(rec.length,6);i++){
      var e=rec[i], d=Number(e.delta)||0;
      h+='<div class="ud-act"><span>'+relTime(e.ts)+'</span><span>'+esc(actLabel(e.key,e.reason))+'</span>'
        +(d?'<span class="ud-xp">'+(d>0?'+':'')+d+' XP</span>':'')+'</div>';
    }
    h+='</div>';
  }
  var fdPct=Math.round(ms.got/ms.total*100);
  h+='<div class="ud-card"><div class="ud-meta" style="margin-bottom:2px">Weekly medals toward <b>FULL DEPLOYMENT</b>: <b>'+ms.got+'/'+ms.total+'</b></div>'
    +'<div class="ud-bar ud-bar-gold"><i style="width:'+fdPct+'%"></i></div></div>';
  return sec('YOUR WEEK', h);
}
function renderEcon(econ){
  if(!econ) return '';
  var h='<div class="ud-stats">'
    +'<div class="ud-stat"><b>'+(Number(econ.prices_reported)||0)+'</b><span>PRICES REPORTED</span></div>'
    +'<div class="ud-stat"><b>'+(Number(econ.bounties_completed)||0)+'</b><span>BOUNTIES DONE</span></div>'
    +'<div class="ud-stat"><b>'+(Number(econ.data_submitted)||0)+'</b><span>DATA SUBMITTED</span></div>'
    +'</div>'
    +'<div class="ud-eth">&ldquo;Your activity powers the movement&rsquo;s intelligence.&rdquo; Aggregated, anonymous by default — never sold.</div>'
    +'<a class="ud-more" href="/economy">ADD PRICE DATA →</a>'
    +'<div style="margin-top:10px"><button class="ud-delete" id="udDeleteData" style="background:transparent;border:1px solid #c1121f;color:#c1121f;font:bold 11px Arial,sans-serif;letter-spacing:0.12em;padding:8px 14px;cursor:pointer;">DELETE MY DATA</button></div>';
  return sec('MY DATA', h);
}
function renderSignedOut(){
  return sec('WHO AM I HERE?',
    '<div class="ud-card"><div class="ud-meta">Sign in with your callsign to see '
    +'your XP, rank, streak and activity — or claim one below.</div>'
    +'<button class="ud-claim" id="udClaim">CLAIM YOUR CALLSIGN</button></div>');
}
function bind(root){
  try{
    var b=root.querySelector('#udClaim');
    if(b) b.addEventListener('click',function(){
      try{
        if(window.PF&&PF.requireCallsign){ PF.requireCallsign(function(){ try{location.reload();}catch(e){} },{context:'to open your HQ'}); return; }
      }catch(e){}
      try{ location.href='/'; }catch(e2){}
    });
  }catch(e){}
  /* DELETE MY DATA — reuses the footer silo's dialog if present, else runs the erase directly. */
  try{
    var d=root.querySelector('#udDeleteData');
    if(d) d.addEventListener('click',function(){
      try{
        var fl=document.getElementById('pf-delete-data-link');
        if(fl){ fl.click(); return; }
      }catch(e){}
      udEraseDialog();
    });
  }catch(e2){}
}
/* Standalone erase dialog (fallback when the footer silo hasn't mounted). */
function udEraseDialog(){
  var PF=window.PF||{};
  var BACKEND=window.PF_BACKEND_URL;
  function ident(){
    var cs='',dev='';
    try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){}
    try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){}
    return {callsign:cs,device:dev};
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var id=ident();
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  var box=document.createElement('div');
  box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true');
  box.style.cssText='background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;max-width:520px;width:100%;padding:28px;font-family:"Helvetica Neue",Arial,sans-serif;line-height:1.6;box-sizing:border-box;';
  box.innerHTML=
    '<div style="color:#c1121f;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">BURN YOUR RECORD</div>'
    +'<p style="font-size:13px;margin:0 0 12px;">This wipes <b>everything</b> the Propaganda Factory holds on you'
    +(id.callsign?' under callsign <b>'+esc(id.callsign)+'</b>':' on this browser')
    +': your XP, streaks, medals, votes, cells, referrals, contact info. This cannot be undone.</p>'
    +'<div style="display:flex;gap:12px;flex-wrap:wrap;">'
    +'<button id="udDelYes" style="background:#c1121f;color:#fff;border:none;font-weight:900;letter-spacing:0.1em;font-size:12px;padding:12px 20px;cursor:pointer;">YES, ERASE IT ALL</button>'
    +'<button id="udDelNo" style="background:transparent;color:#f5f0e1;border:2px solid #f5f0e1;font-weight:900;letter-spacing:0.1em;font-size:12px;padding:10px 18px;cursor:pointer;">CANCEL</button>'
    +'</div><div id="udDelMsg" style="font-size:12px;margin-top:12px;min-height:18px;"></div>';
  ov.appendChild(box); document.body.appendChild(ov);
  function close(){ try{ov.parentNode.removeChild(ov);}catch(e){} }
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  document.getElementById('udDelNo').addEventListener('click',close);
  document.getElementById('udDelYes').addEventListener('click',function(){
    var btn=document.getElementById('udDelYes');
    btn.disabled=true; btn.textContent='BURNING\u2026';
    var body={type:'privacy',p_action:'privacy_erase',callsign:id.callsign,device:id.device,scope:'full'};
    function done(j){
      if(!(j&&j.ok)){
        btn.disabled=false; btn.textContent='RETRY';
        var m=document.getElementById('udDelMsg');
        if(m) m.textContent='Erase failed. Your data is untouched — try again.';
        return;
      }
      try{
        var gone=[];
        for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('pf_')===0) gone.push(k); }
        gone.forEach(function(kk){ try{localStorage.removeItem(kk);}catch(e){} });
      }catch(e2){}
      box.innerHTML='<div style="color:#c1121f;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">RECORD BURNED</div>'
        +'<p style="font-size:13px;margin:0;">'+esc((j&&j.note)||'All your data has been erased.')+'</p>';
      setTimeout(function(){ try{location.reload();}catch(e){} },3000);
    }
    try{
      if(PF.authPost&&BACKEND){ PF.authPost(BACKEND,body,done); return; }
      fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){return r.json();}).then(function(j){done(j||{ok:false});})
        .catch(function(){done(null);});
    }catch(e){ done(null); }
  });
}
function load(){
  var root=document.getElementById('xUserDash');
  if(!root) return;
  if(isEditor()){ root.innerHTML='<div class="ud-meta">Dashboard mounts on the live page.</div>'; return; }
  css();
  var ms=medalState();
  var idn=ident();
  var painted=false;
  /* INSTANT SHELL (2026-10-07, perf/sitewide-ux-opt): the static hub (claim
     prompt or mustering card, TODAY, feature grid, calendar fallback) paints
     immediately — zero network wait. dashboard_init upgrades it with live
     data when it lands. Re-paint is safe: innerHTML replacement discards
     old nodes, so bind() never double-attaches. */
  function renderMustering(callsign,ms){
    return sec('WHO AM I HERE?',
      '<div class="ud-card"><div class="ud-id-cs">'+esc(callsign||'SOLDIER')+'</div>'
      +'<div class="ud-meta">Mustering your record&hellip;</div>'
      +rackHtml(ms)
      +'</div>');
  }
  function paint(j,isShell){
    if(painted) return;
    var h='';
    var signedIn=!!(j&&j.signed_in&&j.identity);
    var hasCallsign=!!idn.callsign;
    var tiles=(j&&j.tiles)?j.tiles:{};
    if(isShell&&hasCallsign){
      /* Shell for a returning soldier: local callsign + static hub now,
         live identity/activity/econ when the API lands. */
      h+=renderMustering(idn.callsign,ms);
      h+=renderToday(tiles);
      h+=renderGrid(tiles);
      h+=renderCalendar(null);
    } else if(!hasCallsign&&!signedIn){
      /* Callsign-less: the one prompt (claim card). TODAY + grid + calendar
         still render — the hub is useful before enlistment too. */
      h+=renderIdentity(null,ms);
      h+=renderToday(tiles);
      h+=renderGrid(tiles);
      h+=renderCalendar(j?j.calendar:null);
    } else if(!signedIn){
      /* Has a local callsign but the backend didn't auth it (secret missing
         or stale): honest line + full hub. */
      h+=renderSignedOut();
      h+=renderToday(tiles);
      h+=renderGrid(tiles);
      h+=renderCalendar(j?j.calendar:null);
    } else {
      h+=renderIdentity(j.identity,ms);
      h+=renderToday(tiles);
      h+=renderGrid(tiles);
      h+=renderCalendar(j?j.calendar:null);
      h+=renderActivity(j.activity,ms);
      h+=renderEcon(j.econ);
    }
    if(!h){ root.innerHTML='<div class="ud-meta">The HQ failed to muster. <a href="javascript:location.reload()" style="color:#dc143c">Reload</a>.</div>'; return; }
    root.innerHTML=h;
    bind(root);
    /* Only a real (non-shell) paint locks — the shell yields to live data. */
    if(!isShell) painted=true;
  }
  /* Paint the static shell instantly; the API upgrades it when it lands. */
  paint(null,true);
  api('dashboard_init',{callsign:idn.callsign,device:idn.device,auth_secret:idn.auth_secret},function(j){ paint(j,false); });
  /* Terminal state: never spin on "Mustering…" forever. */
  setTimeout(function(){
    paint(null,false);
  },15000);
}
load();
})();</scr`+`ipt>
</div>
</template>`);
})();
