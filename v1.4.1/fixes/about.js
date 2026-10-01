/* ============================================================================
   SILO: fixes/about.js  |  PF v1.1.0
   WHAT: About page typo fixes
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=about  or  localStorage pf_disabled_v1='["about"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/1 (verbatim) --- */
  try {
    if(/^\/about\/?$/.test(location.pathname)){
    var pfAboutTypoFix=function(){
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),ns=[];
    while(w.nextNode())ns.push(w.currentNode);
    ns.forEach(function(n){
    var t=n.nodeValue,f=t.replace("strategies. business","strategies, business").replace("a love one","a loved one");
    if(f!==t)n.nodeValue=f;
    });
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pfAboutTypoFix);else pfAboutTypoFix();
    }
  } catch (err) { PF.error("about.js", err); }
})();
