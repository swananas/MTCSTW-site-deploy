/* ============================================================================
   SILO: core/05-tally.js  |  PF v1.1.0
   WHAT: XP defaults per action + backend tally report
   PHASE: core JS
   EVENTS SEEN: pf-bracket-ballot, pf-bracket-liquidated, pf-caption-submit, pf-drop-claimed, pf-enlisted, pf-order-checkin, pf-poster-made, pf-quiz-done, pf-traitor-vote, pf-vote-cast, pf-wb-buy
   KILL: ?pf_off=05-tally  or  localStorage pf_disabled_v1='["05-tally"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
/*PF-TALLY*/ (function(){ 'use strict'; if(window.pfTallyLoaded)return;window.pfTallyLoaded=true; var XP_DEFAULTS={ 'pf-order-checkin':10, 'pf-drop-claimed':15, 'pf-caption-submit':10, 'pf-poster-made':10, 'pf-quiz-done':5, 'pf-vote-cast':5, 'pf-bracket-ballot':5, 'pf-bracket-liquidated':10, 'pf-traitor-vote':5, 'pf-wb-buy':25, 'pf-enlisted':10 }; var TASKS=Object.keys(XP_DEFAULTS); function report(actionType, xp){ try{ if(window.PF_BACKEND_URL){ fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({type:'action',action_type:actionType,xp:xp})}).catch(function(){}); if(typeof window.pfFetchGlobalTotal==='function'){ setTimeout(window.pfFetchGlobalTotal, 1500); } } }catch(e){} } TASKS.forEach(function(ev){ document.addEventListener(ev,function(e){ var xp=XP_DEFAULTS[ev]; try{ if(e&&e.detail&&typeof e.detail.xp==='number'&&e.detail.xp>0){ xp=e.detail.xp; } }catch(err){} var actionType=ev.replace(/^pf-/,'').replace(/-/g,'_'); report(actionType, xp); }); }); })();
