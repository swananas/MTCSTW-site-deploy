/* core/10-convert.js  |  PF v1.4.3 | Onsite conversion loops.
   1) Victory lap: after any game completion, a floating "NEXT MISSION" card
      points the player at one game they haven't touched this week — sessions
      keep moving across games instead of ending. 2026-10-06 (one-prompt):
      max 1 per session (was 3); cards go through PF.popupQueue.
   2) Enlistment nudge: KILLED 2026-10-06 (one-prompt) — THE ONE PROMPT owns
      the callsign ask; this auto-fire was redundant.
   Pure presentation + event listeners; awards NOTHING itself.
   KILL: ?pf_off=10-convert  or  localStorage pf_disabled_v1='["10-convert"]' */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('10-convert'))return;
if(window.pfConvertLoaded)return; window.pfConvertLoaded=true;
var PF=window.PF||(window.PF={});

/* Completion events -> game keys. */
var EV2GAME={
  'pf-order-checkin':'orders','pf-drop-claimed':'drop','pf-quiz-done':'quiz',
  'pf-guess-done':'guess','pf-bracket-ballot':'bracket','pf-raid-report':'raid',
  'pf-vote-cast':'vote','pf-poster-made':'forge','pf-caption-submit':'caption',
  'pf-do-challenge-done':'dometer','pf-billionaire-answered':'billionaire',
  'pf-interrogation-answered':'interrogation','pf-infight-fire':'infight',
  'pf-contract-claimed':'contracts'
};
var MISSIONS=[
  {key:'orders',  label:'Daily Orders',    blurb:'Report in. 30 seconds.',        anchor:'#pf-orders',  page:'/'},
  {key:'vote',    label:'Fan Vote',        blurb:'Crown this week\u2019s propagandist.', anchor:'#pf-vote',    page:'/'},
  {key:'quiz',    label:'SLR Match Quiz',  blurb:'Find your fighter archetype.',  anchor:'#pf-matchquiz', page:'/'},
  {key:'guess',   label:'Guess the Creator', blurb:'Name that propagandist.',     anchor:'#pf-guess',    page:'/arcade'},
  {key:'bracket', label:'Liquidation Bracket', blurb:'Pick the bracket. Win glory.', anchor:'#pf-bracket', page:'/arcade'},
  {key:'raid',    label:'Boost Raid',      blurb:'Storm a target together.',     anchor:'#pf-orders',  page:'/'},
  {key:'dometer', label:'Do Meter',        blurb:'Log a task. Fuel the meter.',   anchor:'#pf-dometer2', page:'/'},
  {key:'forge',   label:'Poster Forge',    blurb:'Mint a propaganda poster.',    anchor:'#pf-poster',   page:'/'},
  {key:'caption', label:'Caption Combat',  blurb:'Write the winning caption.',   anchor:'#pf-caption',  page:'/arcade'},
  {key:'drop',    label:'Daily Drop',      blurb:'Claim today\u2019s drop.',       anchor:'#pf-brief',    page:'/'},
  {key:'contracts', label:'Mercenary Contracts', blurb:'Take a contract. Get paid.', anchor:'#pf-contracts', page:'/cells'}
];
function weekKey(){
  try{
    var d=new Date(), onejan=new Date(d.getFullYear(),0,1);
    var w=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);
    return d.getFullYear()+'-W'+w;
  }catch(e){ return 'W0'; }
}
function played(key){
  try{ return localStorage.getItem('pf_played_'+weekKey()+'_'+key)==='1'; }catch(e){ return false; }
}
function markPlayed(key){
  try{ localStorage.setItem('pf_played_'+weekKey()+'_'+key,'1'); }catch(e){}
}
Object.keys(EV2GAME).forEach(function(ev){
  document.addEventListener(ev,function(){ markPlayed(EV2GAME[ev]); comboTrack(EV2GAME[ev]); firstBlood(); afterGame(EV2GAME[ev]); });
});
function nextMission(){
  for(var i=0;i<MISSIONS.length;i++){ if(!played(MISSIONS[i].key)) return MISSIONS[i]; }
  return null;
}
PF.nextMission=nextMission;

/* COMBO: two different games in one day fires pf-combo once (the ledger pays
   +8 XP, exempt). Distinct-game days are the habit we're building. */
function dayStr(){ try{ return new Date().toISOString().slice(0,10); }catch(e){ return 'd0'; } }
function comboTrack(key){
  var k='pf_combo_'+dayStr(), arr=[];
  try{ arr=JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ arr=[]; }
  if(arr.indexOf(key)<0){ arr.push(key); try{ localStorage.setItem(k,JSON.stringify(arr)); }catch(e){} }
  if(arr.length===2){
    var fk=k+'_fired', fired=false;
    try{ fired=localStorage.getItem(fk)==='1'; }catch(e){}
    if(fired) return;
    try{ localStorage.setItem(fk,'1'); }catch(e){}
    try{ document.dispatchEvent(new CustomEvent('pf-combo',{detail:{day:dayStr(),games:arr}})); }catch(e){}
  }
}
/* FIRST BLOOD: the day's first logged task gets a callout + tiny award. */
function firstBlood(){
  var k='pf_firstblood_'+dayStr(), done=false;
  try{ done=localStorage.getItem(k)==='1'; }catch(e){}
  if(done) return;
  try{ localStorage.setItem(k,'1'); }catch(e){}
  try{ if(window.PF&&PF.dope) PF.dope.ping(document.body,'FIRST BLOOD \u2014 first strike of the day'); }catch(e){}
  try{ document.dispatchEvent(new CustomEvent('pf-first-blood',{detail:{day:dayStr()}})); }catch(e){}
}

/* ---- floating card primitives ----
   2026-10-06 (one-prompt): cards go through PF.popupQueue — one overlay at
   a time, auto-fire counts against the session budget. Returns null when
   denied; callers must guard. */
var lapCount=0, lastLap=0;
function cardShell(id){
  try {
    if (window.PF && PF.popupQueue && !PF.popupQueue.request('convert-card','auto')) return null;
  } catch(e){}
  var d=document.createElement('div');
  d.id=id;
  d.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9991;max-width:290px;'+
    'background:#0d0d0d;border:3px solid #c1121f;color:#f5ead6;padding:14px 14px 12px;'+
    'font-family:monospace;box-shadow:0 4px 30px rgba(193,18,31,.45);';
  var x=document.createElement('span');
  x.textContent='\u00d7';
  x.style.cssText='position:absolute;top:4px;right:10px;font-size:18px;cursor:pointer;color:#b8ab8e;';
  x.onclick=function(){ d.remove(); try{ if(window.PF&&PF.popupQueue) PF.popupQueue.release('convert-card'); }catch(e2){} };
  d.appendChild(x);
  document.body.appendChild(d);
  return d;
}
function goBtn(label, mission, dismiss){
  var anchor=mission.anchor, page=mission.page||'/';
  var b=document.createElement('button');
  b.textContent=label;
  b.style.cssText='background:#c1121f;border:none;color:#f5f0e1;font:bold 13px monospace;'+
    'letter-spacing:2px;padding:9px 18px;margin-top:10px;cursor:pointer;width:100%;';
  b.onclick=function(){
    var t=document.querySelector(anchor);
    if(t){ try{ t.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){} }
    else if(page&&window.location.pathname!==page){ try{ window.location.href=page+anchor; }catch(e){} }
    /* else: right page but widget not mounted — nothing to scroll to. */
    dismiss();
  };
  return b;
}

/* Victory lap: once per 10 min, max 1 per session (2026-10-06 one-prompt:
   was 3/session — demoted), only when a mission is open. */
function afterGame(justPlayed){
  /* Enlistment nudge takes precedence for callsign-less visitors. */
  if(nudge()) return;
  var now=Date.now();
  if(lapCount>=1||now-lastLap<10*60*1000) return;
  var m=nextMission();
  if(!m||m.key===justPlayed) return;
  lastLap=now; lapCount++;
  var d=cardShell('pf-next-mission');
  if(!d) return; /* popup queue denied: another overlay is showing */
  function kill(){ try{ d.remove(); }catch(e){} try{ if(window.PF&&PF.popupQueue) PF.popupQueue.release('convert-card'); }catch(e2){} }
  var h=document.createElement('div');
  h.style.cssText='color:#c1121f;font-weight:900;letter-spacing:2px;font-size:12px;margin-bottom:6px;';
  h.textContent='\u2691 NEXT MISSION';
  var t=document.createElement('div');
  t.style.cssText='font-size:15px;font-weight:900;margin-bottom:2px;';
  t.textContent=m.label;
  var b=document.createElement('div');
  b.style.cssText='font-size:12px;color:#b8ab8e;';
  b.textContent=m.blurb;
  d.appendChild(h); d.appendChild(t); d.appendChild(b);
  d.appendChild(goBtn('DEPLOY \u2192', m, kill));
  setTimeout(kill, 25000);
}

/* Enlistment nudge: KILLED 2026-10-06 (one-prompt). THE ONE PROMPT owns the
   callsign ask now — this auto-fire is redundant. Function kept (early
   return) so the call site needs no edit. */
var nudged=false;
function nudge(){
  return false; /* one-prompt owns the callsign ask */
  if(nudged) return false;
  var has=false;
  try{ has=PF.hasCallsign&&PF.hasCallsign(); }catch(e){}
  if(has) return false;
  var today=''; try{ today=new Date().toISOString().slice(0,10); }catch(e){}
  try{ if(localStorage.getItem('pf_enlist_nudge_v1')===today) return false; }catch(e){}
  nudged=true;
  try{ localStorage.setItem('pf_enlist_nudge_v1',today); }catch(e){}
  var d=cardShell('pf-enlist-nudge');
  var h=document.createElement('div');
  h.style.cssText='color:#c1121f;font-weight:900;letter-spacing:2px;font-size:12px;margin-bottom:6px;';
  h.textContent='\u2691 BANK THIS XP';
  var t=document.createElement('div');
  t.style.cssText='font-size:13px;margin-bottom:2px;';
  t.textContent='Claim a callsign and every point you earn follows you across devices.';
  d.appendChild(h); d.appendChild(t);
  d.appendChild(goBtn('CLAIM CALLSIGN \u2192', {anchor:'#pf-orders',page:'/'}, function(){ d.remove(); }));
  /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
  try{
    if(window.PF && PF.recoverLinkHTML){
      var rl=document.createElement('div');
      rl.innerHTML=PF.recoverLinkHTML();
      d.appendChild(rl);
    }
  }catch(e){}
  /* Expand the claim box on arrival. */
  var iv=setInterval(function(){
    var tg=document.getElementById('oClaimToggle');
    if(tg){ try{ tg.click(); }catch(e){} clearInterval(iv); }
  },1200);
  setTimeout(function(){ clearInterval(iv); if(d.parentNode) d.parentNode.removeChild(d); }, 30000);
  return true;
}
})();
