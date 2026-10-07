/* games/user-dashboard.js  |  PF v1.4.3 | MY HQ — the user dashboard hub.
   CEO-approved 2026-10-07. This is a HUB, not a widget pile. Butter pass
   2026-10-07: full motion system (140ms press states, staggered section
   entry, animated XP bars), skeleton loading, single-red palette, unified
   label voice, 44px tap targets, safe-area padding, in-place repaint after
   callsign claim. Sections:

   1. IDENTITY / USER HUB — callsign, XP, rank + progress to next, streak,
      service-medals rack (device-local, service-medals.js schema, tap a
      medal to reveal its name), weekly challenge status. No callsign ->
      the one-prompt claim card (ONE clear prompt, once ever — reuses the
      existing PF.requireCallsign flow, repaints in place on success).
   2. FEATURE GRID — 16 compact link-cards (icon, name, one-liner, deep
      link) + a conditional WAR ROOM card when tiles.warroom signals live.
   3. THE INTEL DESK — the data-products layer: Karl, The Receipt, Who
      Owns Your Town, Extraction Engine, People's Price Index.
   4. MAKE IT YOURS — the UGC action machine: Dossier Builder, Town
      Reports, Story Remixer.
   5. ASK KARL — the AI copilot, native in the hub.
   6. CALENDAR — 7-day strip + next-7-days rail from dashboard_init.calendar,
      "full calendar -> /events". ALWAYS renders: falls back to the recurring
      rhythm when the backend returns nothing (CEO directive 2026-10-07).
   7. PERSONAL ACTIVITY — recent actions + weekly medal progress toward
      FULL DEPLOYMENT + rank XP progress.
   8. MY DATA — the caller's own movement-intelligence contributions
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
<div id="xUserDash"><div class="ud-sk" style="height:140px"></div><div class="ud-sk" style="height:320px;margin-top:22px"></div></div>
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
   the rack itself is owned there; we never write it). Tap a medal to
   reveal its name (title tooltips don't work on touch). */
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
/* The feature grid — the Oct 6 synergy requirement: every major feature
   reachable within 2 taps. icon / name / one-liner / deep link / tile-key
   (tile-key pulls the live stat line from dashboard_init.tiles). */
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
 ['\\uD83D\\uDD75\\uFE0F','Follow the Money','See who funds the votes.','/follow-the-money',null],
 ['\\uD83D\\uDC65','SLR Roster','62 sick radicals.','/sick-left-radicals',null],
 ['\\uD83D\\uDED2','War Bonds Store','Fund the fight.','/store',null]];
/* THE INTEL DESK — the data-products layer. Glyphs are text-mode symbols
   (never emoji) so they render in the hub's voice. */
var INTEL=[
 ['\\u2756','Karl','Ask anything. Sourced answers.','/karl'],
 ['$','The Receipt','Type a name. See the money.','/receipt'],
 ['\\u2302','Who Owns Your Town','Power in your backyard.','/town'],
 ['\\u25C9','Extraction Engine','Corporate crime, mapped.','/extraction'],
 ['\\u2197','People\\u2019s Price Index','Our inflation number.','/peoples-cpi']];
/* MAKE IT YOURS — the UGC action machine: user content becomes movement
   actions (shares, campaigns, evidence, price data). */
var MINE=[
 ['\\u270E','Dossier Builder','Annotate the evidence.','/dossier'],
 ['\\u2630','Town Reports','Report from your zip.','/town-report'],
 ['\\u21BB','Story Remixer','Remix the stories.','/remix']];
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
   '#pf-userdash{font-family:Arial;color:#f5ead6;padding-bottom:env(safe-area-inset-bottom)}'
  +'#pf-userdash *{box-sizing:border-box}'
  +'.ud-sec{margin:0 0 22px;animation:udA .45s ease-out both}'
  +'@keyframes udA{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
  +'.ud-sec a,.ud-sec button,.ud-sec input,.ud-medal,.ud-del{transition:transform .14s ease,background-color .16s ease,border-color .16s ease}'
  +'.ud-h,.ud-tk{font-weight:800;letter-spacing:2px;color:#c1121f}'
  +'.ud-h{font-size:13px;margin:0 0 10px}'
  +'.ud-tk{font-size:11px;white-space:nowrap}'
  +'.ud-when{flex:0 0 92px;font:800 11px Arial;letter-spacing:2px;color:#e8b33c}'
  +'.ud-card,.ud-cell,.ud-stat{background:#0d0d0d;border:1px solid #2c2c2c;border-radius:6px}'
  +'.ud-card{padding:16px}'
  +'.ud-card.ud-dense{padding:6px 14px}'
  +'.ud-id-cs{font:24px "Arial Black",Arial;letter-spacing:2px;margin:0 0 2px}'
  +'.ud-id-none{font-size:16px;margin-top:12px}'
  +'.ud-id-rank{font:800 12px Arial;letter-spacing:2px;color:#e8b33c;margin:0 0 10px}'
  +'.ud-bar{height:10px;background:#1e1e1e;border:1px solid #333;border-radius:5px;overflow:hidden;margin:6px 0 4px}'
  +'.ud-bar>i{display:block;height:100%;width:0;background:#c1121f;transition:width .8s cubic-bezier(.2,.7,.3,1)}'
  +'.ud-bar-gold>i{background:#e8b33c}'
  +'.ud-meta{font:12px/1.7 Arial;color:#a89e88}'
  +'.ud-meta b{color:#f5ead6}'
  +'.ud-mut{color:#a89e88}.ud-gold{color:#e8b33c}.ud-ok{color:#e8b33c;font-weight:700}.ud-link{color:#c1121f;font-weight:700}'
  +'.ud-mt6{margin-top:6px}.ud-mt8{margin-top:8px}.ud-mt10{margin-top:10px}.ud-mb2{margin-bottom:2px}.ud-mb10{margin-bottom:10px}'
  +'.ud-streak{font:800 14px Arial}'
  +'.ud-warn{color:#c1121f;font-weight:700}'
  +'.ud-rack{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}'
  +'.ud-medal{width:44px;height:44px;display:grid;place-items:center;font-size:20px;border:1px solid #333;border-radius:6px;background:#141414;color:#555;cursor:pointer}'
  +'.ud-medal.got{border-color:#e8b33c;color:#e8b33c;background:#1c1503}'
  +'.ud-cap{font:800 11px Arial;color:#e8b33c;letter-spacing:2px;min-height:16px;margin-top:4px}'
  +'.ud-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}'
  +'@media(min-width:700px){.ud-grid{grid-template-columns:repeat(4,1fr)}}'
  +'.ud-cell{display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 12px;text-decoration:none;color:inherit}'
  +'.ud-cell:active{transform:scale(.97);border-color:#c1121f;background:#1a0d0d}'
  +'.ud-ico{font-size:22px;line-height:1;flex:none;color:#e8b33c}'
  +'.ud-cell .ud-tx{flex:1;min-width:0}'
  +'.ud-nm,.ud-ds,.ud-tl{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}'
  +'.ud-nm{font:800 13px Arial;letter-spacing:.5px}'
  +'.ud-ds{font-size:11px;color:#a89e88;margin-top:2px}'
  +'.ud-tl{font:800 11px Arial;color:#e8b33c;margin-top:3px}'
  +'.ud-row,.ud-today{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid #1c1c1c;min-height:44px}'
  +'.ud-row{padding:9px 2px;font-size:13px}'
  +'.ud-row:last-child{border-bottom:0}'
  +'.ud-row:active,.ud-today:active{background:#1a0d0d}'
  +'.ud-what{flex:1;min-width:0}'
  +'.ud-go{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;color:#ff4d5e;font-weight:800;text-decoration:none;white-space:nowrap}'
  +'.ud-go:active{background:#1a0d0d;color:#f5ead6}'
  +'.ud-act{display:flex;align-items:baseline;gap:10px;padding:8px 2px;border-bottom:1px solid #1c1c1c;font-size:12px;color:#a89e88}'
  +'.ud-act:last-child{border-bottom:0}'
  +'.ud-xp{margin-left:auto;font:800 12px Arial;color:#e8b33c;white-space:nowrap}'
  +'.ud-claim{display:block;width:100%;min-height:52px;background:#c1121f;color:#fff;border:0;border-radius:6px;font:800 15px Arial;letter-spacing:2px;cursor:pointer;margin-top:12px}'
  +'.ud-claim:active{background:#9c0e18;transform:scale(.98)}'
  +'.ud-more{display:block;text-align:center;margin:12px 0 0;font:800 12px Arial;letter-spacing:2px;color:#c1121f;text-decoration:none;min-height:44px;line-height:44px}'
  +'.ud-more:active{background:#1a0d0d;color:#f5ead6}'
  +'.ud-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center}'
  +'.ud-stat{padding:14px 6px}'
  +'.ud-stat b{display:block;font:22px "Arial Black",Arial;color:#e8b33c}'
  +'.ud-stat span{font-size:11px;color:#a89e88;letter-spacing:1px}'
  +'.ud-eth{font:italic 12px/1.6 Arial;color:#a89e88;margin:10px 2px 0}'
  +'.ud-vp{font:800 14px/1.6 Arial;margin:0 0 12px;padding-bottom:12px;border-bottom:1px solid #2c2c2c}'
  +'.ud-today{padding:11px 2px 11px 10px;border-left:3px solid #c1121f;text-decoration:none;color:inherit}'
  +'.ud-today:last-child{border-bottom:0}'
  +'.ud-today.ud-static{cursor:default}'
  +'.ud-th{flex:1;min-width:0;font:700 15px/1.5 Arial}'
  +'.ud-calstrip{display:flex;gap:6px;margin:8px 0 12px}'
  +'.ud-calday{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;min-height:56px;justify-content:center}'
  +'.ud-caltoday{border-color:#c1121f;background:#1c0a0a}'
  +'.ud-calev{border-color:#e8b33c}'
  +'.ud-caldow{font:800 11px Arial;color:#a89e88;letter-spacing:1px}'
  +'.ud-caltoday .ud-caldow{color:#c1121f}'
  +'.ud-calnum{font:18px/1 "Arial Black",Arial}'
  +'.ud-caldot{width:6px;height:6px;border-radius:50%;background:#e8b33c;margin-top:2px}'
  +'.ud-sk{border-radius:4px;background:linear-gradient(90deg,#141414,#1f1f1f,#141414);background-size:200% 100%;animation:udB 1.3s linear infinite}'
  +'@keyframes udB{to{background-position:-200% 0}}'
  +'.ud-karl-log{max-height:280px;overflow-y:auto;margin:0 0 10px;display:flex;flex-direction:column;gap:8px}'
  +'.ud-karl-msg,.ud-calday{background:#141414;border:1px solid #2c2c2c;border-radius:6px}'
  +'.ud-karl-msg{font:13px/1.6 Arial;padding:10px 12px;white-space:pre-wrap;overflow-wrap:break-word}'
  +'.ud-karl-msg.u{background:#1c0a0a;border-color:#c1121f}'
  +'.ud-karl-msg.k{border-left:3px solid #e8b33c}'
  +'.ud-karl-who{font:800 11px Arial;letter-spacing:2px;color:#e8b33c;margin-bottom:4px}'
  +'.ud-karl-msg.u .ud-karl-who{color:#c1121f}'
  +'.ud-karl-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}'
  +'.ud-karl-chip{background:#141414;border:1px solid #e8b33c;color:#e8b33c;font-size:11px;letter-spacing:.5px;padding:8px 12px;border-radius:20px;cursor:pointer;min-height:36px}'
  +'.ud-karl-chip:active{transform:scale(.97);background:#1c1503}'
  +'.ud-karl-form{display:flex;gap:8px}'
  +'.ud-karl-in{flex:1;min-width:0;background:#0a0a0a;border:1px solid #2c2c2c;border-radius:6px;color:#f5ead6;font-size:14px;padding:12px;min-height:48px}'
  +'.ud-karl-in:focus{outline:none;border-color:#c1121f}'
  +'.ud-karl-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;font:800 13px Arial;letter-spacing:1px;padding:0 20px;cursor:pointer;min-height:48px;min-width:76px}'
  +'.ud-karl-btn:active{background:#9c0e18;transform:scale(.97)}'
  +'.ud-karl-btn:disabled{opacity:.5;cursor:default}'
  +'.ud-karl-think{color:#a89e88;font-style:italic}'
  +'.ud-btn.ud-del{color:#c1121f}'
  +'.ud-ov{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.82);display:grid;place-items:center;padding:20px}'
  +'.ud-dlg{border-color:#c1121f;max-width:520px;padding:20px;font:13px/1.6 Arial;animation:udD .18s ease both}'
  +'@keyframes udD{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}'
  +'.ud-dlg p{margin:0 0 12px}'
  +'.ud-dlg-btns{display:flex;gap:12px;flex-wrap:wrap}'
  +'.ud-btn{background:#c1121f;color:#fff;border:0;font:800 12px Arial;letter-spacing:1px;padding:0 20px;cursor:pointer;min-height:44px;border-radius:6px}'
  +'.ud-btn.ghost{background:transparent;border:1px solid currentColor}'
  +'.ud-btn:active{background:#9c0e18;transform:scale(.98)}'
  +'.ud-btn.ghost:active{background:#1a0d0d}'
  +'.ud-dlg-msg{font-size:12px;margin-top:12px;min-height:18px;color:#a89e88}';
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
       POST, zero new XP mechanics). Pitch, button first, small explainer. */
    return sec('WHO ARE YOU HERE?',
      '<div class="ud-card"><div class="ud-vp">62 sick radicals. Real data on the billionaires. Daily missions. Free forever.</div>'
      +'<button class="ud-claim" id="udClaim">CLAIM YOUR CALLSIGN</button>'
      +'<div class="ud-id-cs ud-id-none">NO CALLSIGN YET</div>'
      +'<div class="ud-meta ud-mt6">One name. Every game, every cell, every medal — '
      +'your XP follows it everywhere.</div></div>');
  }
  var r=id.rank||{}, st=id.streak||{}, ch=id.challenge||null;
  var xp=Number(id.xp)||0;
  var nextLine=r.next_name
    ? 'Next: <b>'+esc(r.next_name)+'</b> at '+Number(r.next_xp).toLocaleString('en-US')+' XP'
    : '<b>Max rank reached.</b>';
  var streakLine='<span class="ud-streak">\\uD83D\\uDD25 '+Number(st.count||0)+'-day streak</span>';
  if(st.at_risk) streakLine+=' <span class="ud-warn">— CHECK IN TODAY OR IT DIES</span>';
  else if(st.checked_in_today) streakLine+=' <span class="ud-ok">— safe today</span>';
  var chLine=ch&&ch.title
    ? '<div class="ud-meta ud-mt8">This week: <b>'+esc(ch.title)+'</b>'
      +(ch.active?' <span class="ud-ok">— LIVE</span>':' <span class="ud-mut">— ended '+esc(ch.end_day||'')+'</span>')
      +' · <a class="ud-link" href="/cells">rally your cell →</a></div>'
    : '';
  return sec('WHO AM I HERE?',
    '<div class="ud-card">'
    +'<div class="ud-id-cs">'+esc(id.callsign||'SOLDIER')+'</div>'
    +'<div class="ud-id-rank">'+esc(r.name||'RECRUIT')+' · '+xp.toLocaleString('en-US')+' XP</div>'
    +'<div class="ud-bar"><i data-w="'+Math.min(100,Math.max(0,Number(r.progress_pct)||0))+'"></i></div>'
    +'<div class="ud-meta">'+nextLine+'</div>'
    +'<div class="ud-meta ud-mt6">'+streakLine+'</div>'
    +rackHtml(ms)
    +chLine
    +'</div>');
}
function rackHtml(ms){
  var h='<div class="ud-rack" role="img" aria-label="'+ms.got+' of '+ms.total+' weekly service medals earned">';
  for(var i=0;i<MEDALS.length;i++){
    var got=!!(ms.m&&ms.m[MEDALS[i][0]]);
    h+='<span class="ud-medal'+(got?' got':'')+'" data-name="'+esc(MEDALS[i][2].toUpperCase())+'">'+MEDALS[i][1]+'</span>';
  }
  h+='</div><div class="ud-cap" aria-live="polite"></div>';
  if(ms.fd) h+='<div class="ud-meta">\\u2605 <b class="ud-gold">FULL DEPLOYMENT</b> — rack complete this week.</div>';
  else h+='<div class="ud-meta">'+ms.got+'/'+ms.total+' medals this week — full rack = <b>FULL DEPLOYMENT</b> (+50 XP, Vanguard Wall).</div>';
  return h;
}
/* Shared compact link-card grid renderer (feature grid + Intel Desk + Make
   It Yours). Block layout, no <br>: stat lines clamp to one line. */
function linkGrid(t,cs,tl){
  var h='<div class="ud-grid">';
  for(var i=0;i<cs.length;i++){ var c=cs[i],s=c[4]?tileLine(c[4],tl):'';
    h+='<a class="ud-cell" href="'+safeUrl(c[3])+'"><span class="ud-ico" aria-hidden="true">'+c[0]+'</span>'
      +'<span class="ud-tx"><span class="ud-nm">'+esc(c[1])+'</span><span class="ud-ds">'+esc(c[2])+'</span>'
      +(s?'<span class="ud-tl">'+esc(s)+'</span>':'')+'</span></a>'; }
  return sec(t,h+'</div>');
}
/* WAR ROOM — the conditional feature-grid card: only when the backend
   signals a live or scheduled event (tiles.warroom). Absent = skipped. */
function renderFeatureGrid(t){
  var cards=GRID.slice();
  var wr=t&&t.warroom;
  if(wr&&(wr.live||wr.scheduled||wr.url||wr.headline)){
    cards.push(['\\uD83D\\uDEA8','WAR ROOM'+(wr.live?' \\u00B7 LIVE':''),wr.headline||'The fight is on.',wr.url||'/war-room']);
  }
  return linkGrid('EVERYTHING, TWO TAPS',cards,t);
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
  return sec('TODAY','<div class="ud-card ud-dense">'+h+'</div>');
}
/* CALENDAR — the 7-day strip + upcoming events (CEO directive 2026-10-07).
   Always renders: backend events from dashboard_init.calendar, with a
   built-in fallback schedule so the widget is never an empty void.
   Fallback rows carry their recurring-rhythm label (EVERY DAY / EVERY WEEK)
   in muted tone. Condensed, mobile-first, matches the hub's visual language. */
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
        +'<span class="ud-what">'+esc(fe[0])+' <span class="ud-mut">· '+esc(fe[1])+' · '+(fe[3]==='daily'?'EVERY DAY':'EVERY WEEK')+'</span></span>'
        +'<a class="ud-go" href="'+safeUrl(fe[2])+'">GO →</a></div>';
    }
  }
  h+='<a class="ud-more" href="/events">FULL CALENDAR →</a>';
  return sec('CALENDAR', '<div class="ud-card ud-dense">'+h+'</div>');
}
/* ASK KARL — the AI copilot, native in the hub (CEO directive 2026-10-07).
   Inline chat: no new page, no external link. Karl answers from theory +
   live evidence, and receives the caller's hub context (callsign, XP, rank,
   today's missions, streak) so answers can reference their war.
   FAIL-SOFT: if Karl is unreachable, an honest line — never a spinner. */
var KARL_URL='https://pf-karl.mtcstw.workers.dev/karl/ask';
var KARL_SUGGEST=[
 'What should I do today?',
 'How do I earn more XP?',
 'What is surplus value?',
 'Explain the war chest'
];
function karlContext(idn,ms,j){
  var ctx={};
  try{
    if(idn.callsign) ctx.callsign=idn.callsign;
    if(j&&j.identity){
      if(j.identity.xp!=null) ctx.xp=j.identity.xp;
      if(j.identity.rank) ctx.rank=j.identity.rank;
      if(j.identity.streak!=null) ctx.streak=j.identity.streak;
    }
    if(ms&&typeof ms.got==='number') ctx.medals_this_week=ms.got+'/'+ms.total;
    if(j&&j.tiles){
      if(j.tiles.orders&&typeof j.tiles.orders.raiders==='number')
        ctx.reported_today=j.tiles.orders.raiders;
      if(j.tiles.vote&&typeof j.tiles.vote.total==='number')
        ctx.votes_this_week=j.tiles.vote.total;
    }
    if(j&&j.calendar&&j.calendar.events&&j.calendar.events.length){
      ctx.upcoming=j.calendar.events.slice(0,5).map(function(e){
        return (e.when||'')+' '+(e.what||'');
      }).join('; ');
    }
    /* KARL MUSE (fe/karl-muse, 2026-10-07): the dashboard gateway speaks as
       the muse too. The worker switches to muse mode on ctx.muse. The ctx is
       stashed globally so the sitewide companion can read the same signals. */
    ctx.muse=true;
    try{
      if(window.PFKarlMuse&&PFKarlMuse.storySummary) ctx.story=PFKarlMuse.storySummary();
    }catch(e){}
  }catch(e){}
  try{ window.__pfKarlDashCtx=ctx; }catch(e){}
  return ctx;
}
function renderKarl(){
  var chips='';
  for(var i=0;i<KARL_SUGGEST.length;i++){
    chips+='<button class="ud-karl-chip" data-q="'+esc(KARL_SUGGEST[i])+'">'+esc(KARL_SUGGEST[i])+'</button>';
  }
  var h='<div class="ud-card">'
    +'<div class="ud-karl-log" id="udKarlLog" aria-live="polite">'
    +'<div class="ud-karl-msg k"><div class="ud-karl-who">KARL</div>'
    +'I&#39;m Karl — the movement&#39;s intelligence. Ask me about theory, the fight, or your war. I answer from the canon and live evidence, and I never guess.<div class="ud-meta ud-mt6">Tap a suggestion or type below.</div></div>'
    +'</div>'
    +'<div class="ud-karl-chips" id="udKarlChips">'+chips+'</div>'
    +'<form class="ud-karl-form" id="udKarlForm">'
    +'<input class="ud-karl-in" id="udKarlIn" type="text" maxlength="500" placeholder="Ask Karl anything…" autocomplete="off" aria-label="Ask Karl">'
    +'<button class="ud-karl-btn" id="udKarlBtn" type="submit">ASK</button>'
    +'</form></div>';
  return sec('ASK KARL', h);
}
function karlAddMsg(who,text){
  try{
    var log=document.getElementById('udKarlLog');
    if(!log) return;
    log.insertAdjacentHTML('beforeend','<div class="ud-karl-msg '+who+'"><div class="ud-karl-who">'
      +(who==='u'?'YOU':'KARL')+'</div><div>'+esc(String(text==null?'':text).slice(0,4000))+'</div></div>');
    log.scrollTop=log.scrollHeight;
  }catch(e){}
}
function karlAsk(question,ctx){
  var btn=document.getElementById('udKarlBtn');
  var inp=document.getElementById('udKarlIn');
  if(btn) btn.disabled=true;
  karlAddMsg('u',question);
  var think=document.createElement('div');
  think.className='ud-karl-msg k';
  think.innerHTML='<div class="ud-karl-who">KARL</div><span class="ud-karl-think">Consulting the canon…</span>';
  try{
    var log=document.getElementById('udKarlLog');
    if(log){ log.appendChild(think); log.scrollTop=log.scrollHeight; }
  }catch(e){}
  function done(answer,err){
    try{ if(think.parentNode) think.parentNode.removeChild(think); }catch(e2){}
    if(btn) btn.disabled=false;
    if(inp){ inp.value=''; try{inp.focus();}catch(e3){} }
    if(err){
      karlAddMsg('k','Karl is unreachable right now — the evidence rail or the worker is down. Try again in a bit. — Karl');
    }else{
      karlAddMsg('k',answer);
    }
  }
  try{
    fetch(KARL_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question:String(question).slice(0,500),context:ctx||{}})
    }).then(function(r){ return r.json(); }).then(function(j){
      if(j&&j.ok&&j.answer){ done(j.answer); }
      else if(j&&j.error==='rate_limited'){ done(null,true); karlAddMsg('k','Karl rests for this IP — quota resets hourly. — Karl'); }
      else { done(null,true); }
    }).catch(function(){ done(null,true); });
    setTimeout(function(){
      /* Terminal state: never leave "Consulting…" hanging. */
      try{ if(think.parentNode){ think.parentNode.removeChild(think); karlAddMsg('k','Karl took too long — try again. — Karl'); if(btn) btn.disabled=false; } }catch(e){}
    },20000);
  }catch(e){ done(null,true); }
}
function bindKarl(root,ctx){
  try{
    var form=root.querySelector('#udKarlForm');
    var inp=root.querySelector('#udKarlIn');
    if(form&&inp){
      form.addEventListener('submit',function(e){
        try{ e.preventDefault(); }catch(e2){}
        var q=inp.value.trim();
        if(!q) return;
        karlAsk(q,ctx);
      });
    }
    var chips=root.querySelector('#udKarlChips');
    if(chips){
      chips.addEventListener('click',function(e){
        var t=e.target;
        while(t&&t!==chips&&!t.getAttribute('data-q')) t=t.parentNode;
        var q=t&&t.getAttribute&&t.getAttribute('data-q');
        if(q) karlAsk(q,ctx);
      });
    }
  }catch(e){}
}
function renderActivity(act,ms){
  if(!act) return '';
  var h='';
  var rec=act.recent||[];
  if(rec.length){
    h+='<div class="ud-card ud-dense ud-mb10">';
    for(var i=0;i<Math.min(rec.length,6);i++){
      var e=rec[i], d=Number(e.delta)||0;
      h+='<div class="ud-act"><span>'+relTime(e.ts)+'</span><span>'+esc(actLabel(e.key,e.reason))+'</span>'
        +(d?'<span class="ud-xp">'+(d>0?'+':'')+d+' XP</span>':'')+'</div>';
    }
    h+='</div>';
  }
  var fdPct=Math.round(ms.got/ms.total*100);
  h+='<div class="ud-card"><div class="ud-meta ud-mb2">Weekly medals toward <b>FULL DEPLOYMENT</b>: <b>'+ms.got+'/'+ms.total+'</b></div>'
    +'<div class="ud-bar ud-bar-gold"><i data-w="'+fdPct+'"></i></div></div>';
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
    +'<div class="ud-mt10"><button class="ud-btn ghost ud-del" id="udDeleteData">DELETE MY DATA</button></div>';
  return sec('MY DATA', h);
}
function renderSignedOut(){
  return sec('WHO AM I HERE?',
    '<div class="ud-card"><div class="ud-meta">Sign in with your callsign to see '
    +'your XP, rank, streak and activity — or claim one below.</div>'
    +'<button class="ud-claim" id="udClaim">CLAIM YOUR CALLSIGN</button></div>');
}
function bind(root,karlCtx){
  /* ASK KARL — wire the chat form + suggestion chips. */
  bindKarl(root,karlCtx||{});
  /* MEDAL RACK — tap a medal to reveal its name (touch-friendly tooltip). */
  try{
    var racks=root.querySelectorAll('.ud-rack');
    for(var ri=0;ri<racks.length;ri++){
      (function(rack){
        rack.addEventListener('click',function(e){
          try{
            var m=e.target;
            while(m&&m!==rack&&!(m.className&&String(m.className).indexOf('ud-medal')>=0)) m=m.parentNode;
            if(!m||m===rack) return;
            var cap=rack.parentNode.querySelector('.ud-cap'),nm=m.getAttribute('data-name')||'';
            if(cap&&nm) cap.textContent=(cap.textContent===nm?'':nm);
          }catch(x){}
        });
      })(racks[ri]);
    }
  }catch(e){}
  /* CLAIM CALLSIGN — in-place repaint (no location.reload): re-read the
     identity, show the skeleton, re-run dashboard_init. */
  try{
    var b=root.querySelector('#udClaim');
    if(b) b.addEventListener('click',function(){
      try{
        if(window.PF&&PF.requireCallsign){ PF.requireCallsign(function(){
          var xr=document.getElementById('xUserDash'); if(xr&&xr._repaint) xr._repaint();
        },{context:'to open your HQ'}); return; }
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
/* Standalone erase dialog (fallback when the footer silo hasn't mounted).
   Hub palette: Arial, #f5ead6 cream, 6px radius, 1px borders; 180ms
   fade/scale-in; 44px+ buttons. */
function udEraseDialog(){
  var PFl=window.PF||{}, BACKEND=window.PF_BACKEND_URL, id=ident();
  var ov=document.createElement('div');
  ov.className='ud-ov';
  ov.innerHTML='<div class="ud-card ud-dlg" role="dialog" aria-modal="true">'
    +'<div class="ud-h ud-dlg-t">BURN YOUR RECORD</div>'
    +'<p class="ud-dlg-p">This wipes <b>everything</b> the Propaganda Factory holds on you'
    +(id.callsign?' under callsign <b>'+esc(id.callsign)+'</b>':' on this browser')
    +': your XP, streaks, medals, votes, cells, referrals, contact info. This cannot be undone.</p>'
    +'<div class="ud-dlg-btns">'
    +'<button class="ud-btn" id="udDelYes">YES, ERASE IT ALL</button>'
    +'<button class="ud-btn ghost" id="udDelNo">CANCEL</button>'
    +'</div><div class="ud-dlg-msg" id="udDelMsg"></div></div>';
  document.body.appendChild(ov);
  function close(){ try{ov.parentNode.removeChild(ov);}catch(e){} }
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  ov.querySelector('#udDelNo').addEventListener('click',close);
  ov.querySelector('#udDelYes').addEventListener('click',function(){
    var btn=this; btn.disabled=true; btn.textContent='BURNING\u2026';
    var body={type:'privacy',p_action:'privacy_erase',callsign:id.callsign,device:id.device,scope:'full'};
    function done(j){
      if(!(j&&j.ok)){
        btn.disabled=false; btn.textContent='RETRY';
        var m=ov.querySelector('#udDelMsg');
        if(m) m.textContent='Erase failed. Your data is untouched \u2014 try again.';
        return;
      }
      try{
        var ks=[];
        for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('pf_')===0) ks.push(k); }
        ks.forEach(function(kk){ try{localStorage.removeItem(kk);}catch(e){} });
      }catch(e2){}
      ov.querySelector('.ud-dlg').innerHTML='<div class="ud-h ud-dlg-t">RECORD BURNED</div>'
        +'<p class="ud-dlg-p">'+esc((j&&j.note)||'All your data has been erased.')+'</p>';
      setTimeout(function(){ try{location.reload();}catch(e){} },3000);
    }
    try{
      if(PFl.authPost&&BACKEND){ PFl.authPost(BACKEND,body,done); return; }
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
  var skelHtml=root.innerHTML; /* the staged skeleton doubles as the repaint loader */
  var ms=medalState();
  var idn=ident();
  var painted=false, seq=0;
  /* XP bars paint at 0 and ease to their value (.8s cubic-bezier). */
  function animBars(){
    try{ var b=root.querySelectorAll('.ud-bar>i[data-w]');
      for(var i=0;i<b.length;i++)(function(el,w){ setTimeout(function(){ el.style.width=w+'%'; },80); })(b[i],b[i].getAttribute('data-w'));
    }catch(e){}
  }
  function paint(j){
    if(painted) return; painted=true;
    var signedIn=!!(j&&j.signed_in&&j.identity);
    var hasCallsign=!!idn.callsign;
    var tiles=(j&&j.tiles)?j.tiles:{};
    var h='';
    if(!hasCallsign&&!signedIn) h+=renderIdentity(null,ms);
    else if(!signedIn) h+=renderSignedOut();
    else h+=renderIdentity(j.identity,ms);
    /* The hub core renders for everyone — useful before enlistment too. */
    h+=renderToday(tiles);
    h+=renderKarl();
    h+=renderFeatureGrid(tiles);
    h+=linkGrid('THE INTEL DESK',INTEL);
    h+=linkGrid('MAKE IT YOURS',MINE);
    h+=renderCalendar(j?j.calendar:null);
    if(signedIn){
      h+=renderActivity(j.activity,ms);
      h+=renderEcon(j.econ);
    }
    if(!h){ root.innerHTML='<div class="ud-meta">The HQ failed to muster. <a class="ud-link" href="javascript:location.reload()">Reload</a>.</div>'; return; }
    root.innerHTML=h;
    /* Staggered section entry: 60ms per section, fade + slight rise. */
    try{ var _ss=root.querySelectorAll('.ud-sec'); for(var _si=0;_si<_ss.length;_si++){ _ss[_si].style.animationDelay=(60+_si*60)+'ms'; } }catch(e){}
    animBars();
    bind(root,karlContext(idn,ms,j));
  }
  function fetch(){
    var my=++seq; painted=false;
    api('dashboard_init',{callsign:idn.callsign,device:idn.device,auth_secret:idn.auth_secret},
      function(j){ if(my===seq) paint(j); });
    /* Terminal state: never spin on the skeleton forever. */
    setTimeout(function(){ if(my===seq&&!painted){ paint(null); } },15000);
  }
  root._repaint=function(){ try{ idn=ident(); root.innerHTML=skelHtml; fetch(); }catch(e){} };
  fetch();
}
load();
})();</scr`+`ipt>
</div>
</template>`);
})();
