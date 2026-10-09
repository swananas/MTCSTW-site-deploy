/* build/fedarch/dispatcher-snippet.js
 * REFERENCE implementation of the dynamic-import runtime contract (§5 of the
 * toolchain contract). The footer loader becomes this: a thin route dispatcher.
 * Frontend Pod wires the real page->route table; this file documents the
 * REQUIRED semantics: kill switches first, CDN base from own script URL,
 * import() at the route boundary, slrReady/ensureSLRDB preserved, fail-soft.
 *
 * Backward-compat anchors (non-negotiable):
 *  - jsDelivr base derived from the loader's own script URL (same as today's BASE)
 *  - ?pf_off=<silo> / localStorage pf_disabled_v1 checked BEFORE any import
 *  - PF.slrReady / PF.ensureSLRDB() remain the async-safe consumer contract
 *  - page modules keep guarding on DOM presence (inside route chunks)
 */
(function () {
  'use strict';

  /* 1. Kill switches FIRST — by silo name, exactly like the current loader. */
  function killedSilos() {
    var d = [];
    try { d = JSON.parse(localStorage.getItem('pf_disabled_v1') || '[]'); } catch (e) {}
    try {
      var m = location.search.match(/[?&]pf_off=([^&]+)/);
      if (m) d = d.concat(decodeURIComponent(m[1]).split(','));
    } catch (e) {}
    return d;
  }

  /* 2. CDN base from our own script URL: strip to /v1.4.3/, append dist/fedarch/.
   * The pin version rides with the loader — no hardcoded hashes in chunks. */
  function cdnBase() {
    var src = '';
    try { src = document.currentScript && document.currentScript.src || ''; } catch (e) {}
    var i = src.indexOf('/v1.4.3/');
    if (i < 0) throw new Error('fedarch dispatcher: cannot derive CDN base from ' + src);
    return src.slice(0, i) + '/v1.4.3/dist/fedarch/';
  }

  /* 3. Route resolution: page URL path -> route key. Frontend Pod owns the table. */
  var ROUTE_TABLE = [
    // [pathPrefix, route] — filled by Frontend Pod's route map
    ['/arcade', 'arcade'],
  ];
  function routeForPage() {
    var p = location.pathname || '/';
    for (var i = 0; i < ROUTE_TABLE.length; i++) {
      if (p.indexOf(ROUTE_TABLE[i][0]) === 0) return ROUTE_TABLE[i][1];
    }
    return 'home';
  }

  /* 4. Dispatch: fetch routes.json manifest once, dynamic import() the route entry.
   * Vendor chunk is pulled automatically as a static import of the route chunk.
   * Mount/order semantics: routes.json `order` declares per-route sequencing;
   * the dispatcher awaits entries in that order. */
  async function dispatch() {
    var killed = killedSilos();
    var base = cdnBase();
    var res = await fetch(base + 'routes.json', { cache: 'reload' });
    if (!res.ok) throw new Error('fedarch dispatcher: routes.json ' + res.status);
    var manifest = await res.json();
    var route = routeForPage();
    var def = manifest.routes[route] || manifest.routes.home;
    if (!def) throw new Error('fedarch dispatcher: no route "' + route + '" in manifest');

    // silo kill: skip this route's import entirely
    var silos = def.silos || [route];
    for (var s = 0; s < silos.length; s++) {
      if (killed.indexOf(silos[s]) !== -1) return; // killed — never import
    }

    try {
      await import(/* webpackIgnore: true */ base + def.entry);
    } catch (err) {
      // 5. Fail-soft: log via PF bus, degrade to the no-JS baseline. No retry storm.
      try {
        if (window.PF && typeof PF.error === 'function') PF.error('fedarch', err);
        else console.error('[fedarch]', err);
      } catch (e) {}
    }
  }

  /* 6. PF.slrReady / PF.ensureSLRDB() contract: the vendor chunk (bus + slr-db
   * rail) is a static import of every route chunk, so the rail is present before
   * any route module executes. Route modules call PF.ensureSLRDB() exactly as
   * today — async-safe, no synchronous PF.ROSTER reads at module top level. */
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dispatch);
    else dispatch();
  } catch (err) {
    try { console.error('[fedarch]', err); } catch (e) {}
  }
})();
