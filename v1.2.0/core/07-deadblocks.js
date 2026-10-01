/* ============================================================================
   SILO: core/07-deadblocks.js  |  PF v1.1.0
   WHAT: Suppresses the 3 undeletable native blocks by stable block ID
   PHASE: core JS
   EVENTS SEEN: (none)
   KILL: ?pf_off=07-deadblocks  or  localStorage pf_disabled_v1='["07-deadblocks"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
/*PF-DEADBLOCKS-V1.1.0: suppress three undeletable native Squarespace blocks.
Block controls are non-responsive in the editor (verified 2026-10-01, user + automation,
phone + computer), so the stored blocks cannot be deleted there. This module hides them
on the public page only. Targets stable block IDs -- no content-name matching, so no
dead element names appear anywhere in this code. Never runs in the Squarespace editor,
so stored content is never destroyed. Multi-pass to win races with other runtime rewrites. */
(function(){ 'use strict';
if(window.pfDeadblocksV110)return; window.pfDeadblocksV110=true;
var TARGETS=[
 {id:'block-yui_3_17_2_1_1790233957040_8325', scope:'block'},
 {id:'block-yui_3_17_2_1_1790420774802_6910', scope:'block'},
 {id:'block-yui_3_17_2_1_1790409305031_9051', scope:'section'}
];
function isEditor(){ try{
 var h=window.location.href||'';
 if(h.indexOf('/config/')!==-1) return true;
 var b=document.body;
 if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
 return false; }catch(e){ return false; } }
function run(){ if(isEditor()) return;
 for(var i=0;i<TARGETS.length;i++){
  var t=TARGETS[i], b=null;
  try{ b=document.getElementById(t.id); }catch(e){ continue; }
  if(!b||!b.parentNode) continue;
  var scopeEl=null;
  if(t.scope==='section'){ scopeEl=b.closest('section')||b.closest('.fe-block'); }
  else { scopeEl=b.closest('.fe-block')||b.closest('section'); }
  if(!scopeEl) scopeEl=b;
  try{ if(scopeEl.parentNode) scopeEl.parentNode.removeChild(scopeEl); }catch(e){}
 } }
var passes=0;
function tick(){ try{run();}catch(e){} if(++passes<6) setTimeout(tick,1200); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick);
else tick();
})();
