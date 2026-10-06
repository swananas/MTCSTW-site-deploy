/* core/fred-tools-loader.js | PF v1.4.3 | FRED EVERYWHERE PHASE 2 — tool chunk loader.
   The three user modeling tools (Stack 'Em, explainer, Receipt check) ship
   as the lazy core/bundle-fred-tools.js chunk, loaded on demand ONLY when a
   tool host exists on the page:
     - <div id="pf-economy">     -> /economy (Receipt check hero + explainer)
     - <div id="xWarReport">      -> /war-report (curated stack + explainer)
     - <div id="xBrief">          -> homepage Morning Briefing (explainer)
     - <div id="pf-academy-hq">   -> Academy (guided Stack 'Em)
   The money page does NOT use this chunk — its tools ride inside the money
   chunk (blocking, synchronous with money-page.js). If the money chunk
   already provided the tools (window.PFStackEm), this loader stands down.
   Master kill ?pf_off=fred is honored BEFORE the chunk loads. Fail-soft:
   if the chunk fails, pages render without the tools (no throw).
   Base-URL resolution follows the money-chunk-loader ownBase() pattern.
   KILL: ?pf_off=fred. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('fred')) { return; }
  if (window.pfFredToolsLoading || window.pfFredToolsDone) { return; }
  /* Money chunk already serving the tools (money page): stand down. */
  if (window.PFStackEm || window.PFExplain || window.PFReceipt) { return; }
  var needsTools = false;
  try {
    needsTools = !!document.getElementById('pf-economy') ||
                !!document.getElementById('xWarReport') ||
                !!document.getElementById('xBrief') ||
                !!document.getElementById('pf-academy-hq');
  } catch (e) { needsTools = false; }
  if (!needsTools) { return; }
  window.pfFredToolsLoading = true;
  function ownBase() {
    try {
      var re = /^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^@]+@[^\/]+\/v1\.4\.3\/)core\/bundle-core(-slr)?\.js/;
      if (document.currentScript && document.currentScript.src) {
        var m0 = String(document.currentScript.src).match(re);
        if (m0) { return m0[1] + 'core/bundle-fred-tools.js'; }
      }
      var ss = document.getElementsByTagName('script');
      for (var i = ss.length - 1; i >= 0; i--) {
        var s2 = (ss[i] && ss[i].src) || '';
        var m2 = s2.match(re);
        if (m2) { return m2[1] + 'core/bundle-fred-tools.js'; }
      }
    } catch (e) {}
    return null;
  }
  function done() {
    window.pfFredToolsLoading = false;
    window.pfFredToolsDone = true;
  }
  function fail() { done(); }
  var url = ownBase();
  if (!url) { fail(); return; }
  try {
    var s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = done;
    s.onerror = fail;
    document.head.appendChild(s);
    setTimeout(function () {
      if (window.pfFredToolsLoading) fail();
    }, 15000);
  } catch (e) { fail(); }
})();
