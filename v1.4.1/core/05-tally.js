/* ============================================================================
   SILO: core/05-tally.js  |  PF v1.4.1
   WHAT: Site-wide tally: reports every counted game event to the backend so
         per-user instances aggregate into SITE GLOBAL totals.
         - xp  (site energy unit)  -> ?action=xp_totals / ?action=action_totals
           feeds the Media Nuke 50,000 goal. Scale is historical — do NOT
           rescale it; the nuke's goal pacing depends on it.
         - pts (do-meter task points, same unit as the Do Meter's local count)
           -> ?action=task_totals feeds the Do Meter's SITE-WIDE headline.
           Legacy rows without pts are mapped server-side via the legacy table.
   PHASE: core JS (loads early; listeners attach to document)
   EVENTS SEEN: pf-billionaire-answered, pf-bracket-ballot, pf-bracket-liquidated,
     pf-caption-submit, pf-drop-claimed, pf-enlisted, pf-interrogation-answered,
     pf-order-checkin, pf-poster-made, pf-quiz-done, pf-share-image,
     pf-traitor-vote, pf-vote-cast, pf-wb-buy
   KILL: ?pf_off=05-tally  or  localStorage pf_disabled_v1='["05-tally"]'
   ============================================================================ */
(function(){ 'use strict'; if(window.pfTallyLoaded)return; window.pfTallyLoaded=true;
var XP_DEFAULTS={ 'pf-order-checkin':10, 'pf-drop-claimed':15, 'pf-caption-submit':10, 'pf-poster-made':10, 'pf-quiz-done':5, 'pf-vote-cast':5, 'pf-bracket-ballot':5, 'pf-bracket-liquidated':10, 'pf-traitor-vote':5, 'pf-wb-buy':25, 'pf-enlisted':10, 'pf-billionaire-answered':5, 'pf-interrogation-answered':5, 'pf-share-image':5 };
/* Do-meter point scale — MUST match the PTS table in games/do-meter.js. */
var PTS_DEFAULTS={ 'pf-order-checkin':1, 'pf-drop-claimed':2, 'pf-caption-submit':2, 'pf-poster-made':2, 'pf-quiz-done':1, 'pf-vote-cast':1, 'pf-bracket-ballot':1, 'pf-bracket-liquidated':2, 'pf-traitor-vote':1, 'pf-wb-buy':5, 'pf-enlisted':3, 'pf-billionaire-answered':1, 'pf-interrogation-answered':1, 'pf-share-image':2 };
var TASKS=Object.keys(XP_DEFAULTS);
function report(actionType, xp, pts){
  try{
    if(window.PF_BACKEND_URL){
      fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({type:'action',action_type:actionType,xp:xp,pts:pts})}).catch(function(){});
      if(typeof window.pfFetchGlobalTotal==='function'){ setTimeout(window.pfFetchGlobalTotal, 1500); }
      if(typeof window.pfFetchGlobalTasks==='function'){ setTimeout(window.pfFetchGlobalTasks, 1500); }
    }
  }catch(e){}
}
TASKS.forEach(function(ev){
  document.addEventListener(ev,function(e){
    var xp=XP_DEFAULTS[ev];
    try{ if(e&&e.detail&&typeof e.detail.xp==='number'&&e.detail.xp>0){ xp=e.detail.xp; } }catch(err){}
    var actionType=ev.replace(/^pf-/,'').replace(/-/g,'_');
    report(actionType, xp, PTS_DEFAULTS[ev]||1);
  });
});
})();
