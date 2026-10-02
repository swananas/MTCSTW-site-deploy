/* core/05-tally.js  |  PF v1.4.1 | Site-wide tally: reports every counted game event to the backend so
   KILL: ?pf_off=05-tally  or  localStorage pf_disabled_v1='["05-tally"]' */
(function(){ 'use strict'; if(window.PF&&window.PF.skip('05-tally'))return;
if(window.pfTallyLoaded)return; window.pfTallyLoaded=true;
/* Mirrors the rank-XP economy: daily tasks sum to 50/day (PF.DAILY_XP_CAP);
   weekly tasks keep their own values; tally-only events keep theirs.
   detail.xp overrides when a game reports its actual capped award — including
   0 when the daily pool is spent (never fall back to the default then, or the
   backend would record XP the user never earned). */
var XP_DEFAULTS={ 'pf-order-checkin':10, 'pf-drop-claimed':1, 'pf-caption-submit':10, 'pf-poster-made':1, 'pf-quiz-done':15, 'pf-guess-done':1, 'pf-raid-report':2, 'pf-vote-cast':10, 'pf-bracket-ballot':10, 'pf-bracket-liquidated':10, 'pf-traitor-vote':5, 'pf-wb-buy':25, 'pf-enlisted':20, 'pf-billionaire-answered':1, 'pf-interrogation-answered':1, 'pf-share-image':1, 'pf-boost-tipped':0, 'pf-checkin':2, 'pf-guess-scored':0 };
/* Do-meter point scale — MUST match the PTS table in games/do-meter.js. */
var PTS_DEFAULTS={ 'pf-order-checkin':1, 'pf-drop-claimed':2, 'pf-caption-submit':2, 'pf-poster-made':2, 'pf-quiz-done':1, 'pf-guess-done':2, 'pf-raid-report':2, 'pf-vote-cast':1, 'pf-bracket-ballot':1, 'pf-bracket-liquidated':2, 'pf-traitor-vote':1, 'pf-wb-buy':5, 'pf-enlisted':3, 'pf-billionaire-answered':1, 'pf-interrogation-answered':1, 'pf-share-image':2, 'pf-boost-tipped':1, 'pf-checkin':1, 'pf-guess-scored':0 };
/* Pool-capped events whose TRUE award is forwarded by enlistment-ranks via
   pf-tally-settle. The raw game event fires BEFORE the award is computed, so
   recording the default here would over-record whenever the 50/day pool is
   spent (or under-record the rank-panel check-in/share, which award without
   dispatching a game event at all). The tally records these ONLY on settle —
   never on the raw event — so the backend always matches the user's ledger. */
var POOL_SETTLED={ 'pf-guess-done':1, 'pf-raid-report':1, 'pf-poster-made':1, 'pf-share-image':1, 'pf-drop-claimed':1, 'pf-billionaire-answered':1, 'pf-interrogation-answered':1, 'pf-checkin':1, 'pf-guess-scored':0 };
var TASKS=Object.keys(XP_DEFAULTS);
function report(actionType, xp, pts, meta){
  try{
    if(window.PF_BACKEND_URL){
      var dev='',cs='';
      try{ if(window.PFDeviceId) dev=window.PFDeviceId(); if(window.PFCallsign) cs=window.PFCallsign(); }catch(e){}
      fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({type:'action',action_type:actionType,xp:xp,pts:pts,device:dev,callsign:cs,meta:meta||'',auth_secret:(window.PF&&PF.getAuthSecret?PF.getAuthSecret():'')})}).catch(function(){});
      if(typeof window.pfFetchGlobalTotal==='function'){ setTimeout(window.pfFetchGlobalTotal, 1500); }
      if(typeof window.pfFetchGlobalTasks==='function'){ setTimeout(window.pfFetchGlobalTasks, 1500); }
    }
  }catch(e){}
}
TASKS.forEach(function(ev){
  document.addEventListener(ev,function(e){
    if(POOL_SETTLED[ev]) return; /* true award arrives via pf-tally-settle */
    var xp=XP_DEFAULTS[ev];
    try{ if(e&&e.detail&&typeof e.detail.xp==='number'){ xp=Math.max(0,Math.floor(e.detail.xp)); } }catch(err){}
    var meta='';
    try{ if(e&&e.detail&&e.detail.creator){ meta=String(e.detail.creator)+':'+(Math.floor(Number(e.detail.tipped)||0)); } }catch(err){}
    try{ if(e&&e.detail&&e.detail.archetype){ meta='archetype:'+String(e.detail.archetype).slice(0,24); } }catch(err){}
    try{ if(e&&e.detail&&typeof e.detail.score==='number'){ meta='score:'+Math.max(0,Math.min(5,Math.floor(e.detail.score))); } }catch(err){}
    var actionType=ev.replace(/^pf-/,'').replace(/-/g,'_');
    report(actionType, xp, PTS_DEFAULTS[ev]||1, meta);
  });
});
/* True-award settlement from enlistment-ranks (pool-capped events only). */
document.addEventListener("pf-tally-settle",function(e){
  var ev=e&&e.detail&&e.detail.ev;
  if(!ev||!POOL_SETTLED[ev]) return;
  var xp=XP_DEFAULTS[ev];
  try{ if(e&&e.detail&&typeof e.detail.xp==='number'){ xp=Math.max(0,Math.floor(e.detail.xp)); } }catch(err){}
  report(ev.replace(/^pf-/,'').replace(/-/g,'_'), xp, PTS_DEFAULTS[ev]||1, '');
});
})();
