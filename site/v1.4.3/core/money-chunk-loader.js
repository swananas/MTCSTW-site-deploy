/* core/money-chunk-loader.js | PF v1.4.3 | FOLLOW THE MONEY — lazy chunk loader.
   2026-10-05 (fix/money-minified-rebuild): the money suite (~65KB raw across
   10 modules) no longer rides in bundle-core.js. It ships as the minified
   core/bundle-money.js chunk, loaded on demand ONLY when a money surface is
   present:
     - <div id="pf-money">          -> the /money page (full-page shell)
     - <div id="pf-political-hq">    -> interim money tab + bill/legislator
       detail consumers (PFMoneyTab / PFMoneyVote / PFWallShame mounts)
   Master kill ?pf_off=money is honored BEFORE the chunk loads, so the kill
   switch keeps working with zero bytes fetched. Fail-soft: if the chunk
   fails to load, the page renders without the money suite (no throw).
   Base-URL resolution follows the established ownBase() pattern
   (core/07-slr-db.js): derive the CDN pin from the executing bundle's
   script src. KILL: ?pf_off=money (master). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money')) { return; }
  if (window.pfMoneyChunkLoading || window.pfMoneyChunkDone) { return; }
  /* 2026-10-05 (fix/crawl-3page-fix): the footer now loads core/bundle-money.js
     directly on /money via the isMoney JS_GAMES entry. If that already ran
     (money-page.js sets window.PFMoney at bundle time), the chunk is
     redundant — skip so we never double-fetch. (Guard reads window.PFMoney,
     not the pfMoneyPageDone marker, so the no-duplication verify keeps
     passing: that marker must only ever be SET inside bundle-money.js.) */
  if (window.PFMoney) { return; }
  var needsMoney = !!document.getElementById('pf-money') ||
                   !!document.getElementById('pf-political-hq');
  if (!needsMoney) { return; }
  window.pfMoneyChunkLoading = true;
  function ownBase() {
    try {
      var src = '';
      if (document.currentScript && document.currentScript.src) src = document.currentScript.src;
      var re = /^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^@]+@[^\/]+\/v1\.4\.3\/)core\/bundle-core(-slr)?\.js/;
      /* src looks like .../v1.4.3/core/bundle-core.js (or bundle-core-slr.js)
         on the pinned CDN when this file runs inside the core bundle.
         Swap the filename for the money chunk. */
      var m = src && src.match(re);
      if (m) { return m[1] + 'core/bundle-money.js'; }
      /* 2026-10-05 (fix/crawl-3page-fix): this loader ships inside
         pages/bundle-pages.js, NOT the core bundle — document.currentScript
         is the pages bundle, so the regex above never matches and the old
         code returned null ('no base') even though the core bundle's script
         tag is right there in the DOM. Fall back to scanning for it. */
      var ss = document.getElementsByTagName('script');
      for (var i = ss.length - 1; i >= 0; i--) {
        var s2 = (ss[i] && ss[i].src) || '';
        var m2 = s2.match(re);
        if (m2) { return m2[1] + 'core/bundle-money.js'; }
      }
    } catch (e) {}
    return null;
  }
  function done() {
    window.pfMoneyChunkLoading = false;
    window.pfMoneyChunkDone = true;
  }
  function fail(m) {
    done();
    try { if (PF && PF.error) PF.error('money-chunk', m); } catch (e) {}
  }
  var url = ownBase();
  if (!url) { fail('no base'); return; }
  var s = document.createElement('script');
  s.async = true;
  s.src = url;
  s.onload = done;
  s.onerror = function () { fail('load error'); };
  document.head.appendChild(s);
  /* Backstop: never leave the loading flag stuck if onload misfires. */
  setTimeout(function () { if (window.pfMoneyChunkLoading) done(); }, 20000);
})();
