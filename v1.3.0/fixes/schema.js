/* ============================================================================
   SILO: fixes/schema.js  |  PF v1.1.0
   WHAT: JSON-LD schema cleanup
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=schema  or  localStorage pf_disabled_v1='["schema"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/1 (verbatim) --- */
  try {
    /*PF-SCHEMA-CLEAN*/(function(){document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){s.remove()});var p=location.pathname;var d=null;if(p==="/"||p==="/home")d={"@context":"https://schema.org","@type":"Organization","name":"MTCSTW","url":"https://www.mtcstw.com"};if(d){var s=document.createElement("script");s.type="application/ld+json";s.text=JSON.stringify(d);document.head.appendChild(s)}})();
  } catch (err) { PF.error("schema.js", err); }
})();
