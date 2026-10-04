/* ============================================================================
   SILO: fixes/faqs.js  |  PF v1.1.0
   WHAT: FAQs count fix
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=faqs  or  localStorage pf_disabled_v1='["faqs"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/1 (verbatim) --- */
  try {
    if(/^\/faqs\/?$/.test(location.pathname)){
    var pfFaqsCountFix=function(){
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),ns=[];
    while(w.nextNode())ns.push(w.currentNode);
    ns.forEach(function(n){
    var t=n.nodeValue,f=t.replace("40 vetted leftist creators","62 vetted leftist creators").replace("41 vetted leftist creators","62 vetted leftist creators").replace("40 roster creators","62 roster creators").replace("41 roster creators","62 roster creators").replace("40 creators","62 creators").replace("41 creators","62 creators");
    if(f!==t)n.nodeValue=f;
    });
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pfFaqsCountFix);else pfFaqsCountFix();
    }
  } catch (err) { PF.error("faqs.js", err); }
})();
