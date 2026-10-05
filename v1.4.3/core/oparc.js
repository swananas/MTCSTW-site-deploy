/* core/oparc.js  |  PF v1.4.3 | W5-10 OPERATION ARCS: central arc reader.
   ASYNC READER ONLY (ZERO XP, ZERO DOM) — exposes window.PF.opArc(), a
   promise-returning reader for the active operation arc (oparc_current).
   Every reskin surface pulls through here: briefing header, route-march stop
   titles, dead-drop riddle flavor, mystery-bounty copy, ticker templates.
   Polls the public oparc_current read via JSONP; caches ~5 min client-side.
   Fail-silent everywhere: a dead read resolves {active:false} and never
   breaks the page. Follows the core/21-allfronts.js reader pattern.
   KILL: ?pf_off=oparc  or  localStorage pf_disabled_v1='["oparc"]'
   Coordinator: register in build/bundle-core.js CORE_FILES AFTER
   'core/21-allfronts.js' as 'core/oparc.js', then rebuild bundles. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('oparc')) { return; }

  var BACKEND = window.PF_BACKEND_URL;
  var CACHE_MS = 300000; /* ~5 min */
  var cachedAt = 0, cached = null, inflight = null;

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    var fn = 'pfOpArcCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e3) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    try {
      for (var k in params) q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    } catch (e4) {}
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    s.async = true;
    try { document.head.appendChild(s); } catch (e5) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000); /* 12s backstop */
  }

  function normalize(j) {
    if (j && j.ok && j.active) {
      return {
        active: true,
        id: Number(j.id) || 0,
        name: String(j.name || '').slice(0, 120),
        target: String(j.target || '').slice(0, 200),
        chapter: Number(j.chapter) || 1,
        chapter_title: String(j.chapter_title || '').slice(0, 120),
        flavor: String(j.flavor || '').slice(0, 500)
      };
    }
    return { active: false };
  }

  /* PF.opArc() -> Promise<arc>. Resolves {active:false} on any failure. */
  PF.opArc = function () {
    var now = Date.now();
    if (cached && (now - cachedAt) < CACHE_MS) return Promise.resolve(cached);
    if (inflight) return inflight;
    inflight = new Promise(function (resolve) {
      var done = false;
      function fin(j) {
        if (done) return; done = true;
        inflight = null;
        try {
          cached = normalize(j);
          cachedAt = Date.now();
          resolve(cached);
        } catch (e) { resolve({ active: false }); }
      }
      try { api('oparc_current', {}, fin); } catch (e) { fin(null); }
      setTimeout(function () { fin(null); }, 15000);
    });
    return inflight;
  };

  /* Manual cache bust (admin consoles, tests). */
  PF.opArcClear = function () { cached = null; cachedAt = 0; };
})();
