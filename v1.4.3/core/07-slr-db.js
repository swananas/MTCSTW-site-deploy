/* core/07-slr-db.js  |  PF v1.4.2 | Master SLR database.
   The 62-member snapshot is generated into 07-slr-db-data.js (from
   src/data/slr-master-db.json). M34 (2026-10-03): the snapshot ships INSIDE
   the core bundle only on roster pages (core/bundle-core-slr.js); the slim
   core/bundle-core.js omits it. When the snapshot is present it is applied
   SYNCHRONOUSLY, so PF.ROSTER, PF.slrAll() and PF.slrMember() are populated
   before any game silo runs — no async race for the synchronous consumers.
   When it is absent, PF.ensureSLRDB() injects the pinned data script on
   first need (promise-cached, concurrent calls deduped, 15s backstop, JSON
   fallback, resolves to [] on failure so consumers degrade gracefully).
   PF.slrReady is a lazy getter over ensureSLRDB(), so existing
   PF.slrReady.then(...) consumers work on both core variants unchanged.
   API: PF.slrReady (promise), PF.ensureSLRDB(), PF.slrAll(), PF.slrMember(slug),
        PF.slrMeta(), PF.slrLegacy (legacy-shape array backing the PF.ROSTER getter).
   KILL: ?pf_off=slr-db  or  localStorage pf_disabled_v1='["slr-db"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('slr-db')) { return; }

  var MEMBERS = [];
  var META = null;

  function toLegacy(m) {
    var h = m.handles || {};
    return {
      name: m.name, slug: m.slug, score: m.propaganda_score,
      handle: h.primary || h.tiktok || '', platform: m.primary_platform || '',
      img: m.picture || '', imgAlt: m.image_alt || (m.name + ' — Sick Left Radicals'),
      seoTitle: m.seo_title || '', seoDesc: m.seo_description || ''
    };
  }

  function apply(d) {
    if (d && d.members && d.members.length) {
      MEMBERS = d.members;
      META = d.meta || null;
      try { PF.slrLegacy = MEMBERS.map(toLegacy); } catch (e) { PF.slrLegacy = []; }
      return true;
    }
    return false;
  }

  function ownBase() {
    try {
      var src = '';
      if (document.currentScript && document.currentScript.src) src = document.currentScript.src;
      if (!src) {
        var ss = document.getElementsByTagName('script');
        for (var i = ss.length - 1; i >= 0; i--) {
          if (ss[i].src && (ss[i].src.indexOf('07-slr-db') !== -1 || ss[i].src.indexOf('bundle-core') !== -1)) { src = ss[i].src; break; }
        }
      }
      var m = src.match(/^(https:\/\/cdn\.jsdelivr\.net\/gh\/[^@]+@[^\/]+)\//);
      if (m) return m[1];
    } catch (e) {}
    return null;
  }

  function fetchFallback() {
    var b = ownBase();
    var url = b ? b + '/src/data/slr-master-db.json'
      : 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@main/src/data/slr-master-db.json';
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('slr-db HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!apply(d)) throw new Error('slr-db bad payload');
        return MEMBERS;
      })
      .catch(function (err) {
        MEMBERS = [];
        try { PF.slrLegacy = []; } catch (e) {}
        PF.error('slr-db', err);
        return MEMBERS;
      });
  }

  /* Synchronous fast path (unchanged): on bundle-core-slr pages the snapshot
     rode in with the bundle — apply before any game silo runs. */
  var snap = window.PF_SLR_DB_SNAPSHOT;
  if (snap && apply(snap)) {
    PF.log('slr-db', 'snapshot applied: ' + MEMBERS.length + ' members');
  }

  /* ---- Lazy load (M34): PF.ensureSLRDB() ----
     Injects the pinned core/07-slr-db-data.js script exactly once and applies
     it. Concurrent callers share one promise; the 15s backstop plus the JSON
     fallback mean a failed load resolves to [] instead of hanging — every
     consumer already degrades on an empty roster.
     AUTO-UPDATE (2026-10-07): before touching the bundled snapshot, try the
     live master DB JSON from @main with a short timeout. A push to
     src/data/slr-master-db.json on main auto-propagates to all catalog/roster
     pages within jsDelivr cache time — no code ship, no pin change, no footer
     edit. On any failure the bundled snapshot path runs unchanged. */
  var _slrPending = null;
  var LIVE_DB_URL = 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@main/src/data/slr-master-db.json';
  var LIVE_TIMEOUT_MS = 3000;
  function fetchLive() {
    return new Promise(function (resolve) {
      var done = false;
      function fin(data) {
        if (done) return; done = true;
        resolve(data || null);
      }
      try {
        var to = setTimeout(function () { fin(null); }, LIVE_TIMEOUT_MS);
        fetch(LIVE_DB_URL, { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) throw new Error('live-db HTTP ' + r.status);
            return r.json();
          })
          .then(function (d) {
            clearTimeout(to);
            if (d && d.members && d.members.length) fin(d);
            else fin(null);
          })
          .catch(function () { clearTimeout(to); fin(null); });
      } catch (e) { fin(null); }
    });
  }
  function dataUrl() {
    var b = ownBase();
    return (b ? b + '/v1.4.3/core/07-slr-db-data.js'
      : 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@main/v1.4.3/core/07-slr-db-data.js');
  }
  PF.ensureSLRDB = function () {
    var s0 = window.PF_SLR_DB_SNAPSHOT;
    /* AUTO-UPDATE: live JSON first (fresh data, no ship needed). The bundled
       snapshot stays as the synchronous fast path only when the live fetch
       hasn't resolved yet — the live result wins whenever it arrives valid. */
    if (MEMBERS.length && !MEMBERS._liveStale) return Promise.resolve(MEMBERS);
    if (_slrPending) return _slrPending;
    _slrPending = new Promise(function (resolve) {
      /* Fast path: bundled snapshot applies synchronously so first paint
         never waits on network. */
      var snapApplied = s0 && apply(s0);
      function useLiveThenResolve() {
        fetchLive().then(function (live) {
          if (live && apply(live)) {
            try { MEMBERS._liveStale = false; } catch (e) {}
            PF.log('slr-db', 'live master DB applied: ' + MEMBERS.length + ' members (auto-update)');
          } else if (snapApplied) {
            PF.log('slr-db', 'live fetch missed; snapshot stands (' + MEMBERS.length + ' members)');
          }
          resolve(MEMBERS);
        });
      }
      if (snapApplied) {
        /* Snapshot is up instantly; upgrade to live data in the background,
           then resolve with the best available. Consumers that already
           rendered from snapshot get the live data on next navigation;
           data-pf-fc paint picks up live counts via creatorStats. */
        try { MEMBERS._liveStale = true; } catch (e2) {}
        resolve(MEMBERS);
        /* Kick the live upgrade without blocking the caller. */
        fetchLive().then(function (live) {
          if (live && apply(live)) {
            try { MEMBERS._liveStale = false; } catch (e3) {}
            PF.log('slr-db', 'live master DB upgraded: ' + MEMBERS.length + ' members (auto-update)');
            try { document.dispatchEvent(new CustomEvent('pf-slr-live')); } catch (e4) {}
          }
        });
        return;
      }
      /* No snapshot: original lazy-load chain (pinned script -> JSON fallback),
         with live fetch attempted first. */
      fetchLive().then(function (live) {
        if (live && apply(live)) {
          PF.log('slr-db', 'live master DB applied (no snapshot): ' + MEMBERS.length + ' members');
          resolve(MEMBERS);
          return;
        }
        var url = dataUrl(), done = false;
        function fin() {
          if (done) return; done = true;
          var s2 = window.PF_SLR_DB_SNAPSHOT;
          if (s2 && apply(s2)) {
            PF.log('slr-db', 'lazy snapshot applied: ' + MEMBERS.length + ' members');
            resolve(MEMBERS);
          } else {
            /* Backstop: the pinned JSON carries the same {meta, members} shape. */
            fetchFallback().then(resolve);
          }
        }
        try {
          var el = document.createElement('script');
          el.src = url; el.async = true;
          el.onload = fin; el.onerror = fin;
          document.head.appendChild(el);
          setTimeout(fin, 15000);
        } catch (e) { fin(); }
      });
    });
    return _slrPending;
  };

  /* PF.slrReady — lazy getter: the first .then() pulls the DB in on demand.
     Existing consumers (pages/slr-roster.js, pages/slr-catalog.js,
     games/efficiency.js) need no changes on either core variant. */
  try {
    Object.defineProperty(PF, 'slrReady', {
      configurable: true,
      get: function () { return PF.ensureSLRDB(); }
    });
  } catch (e) {
    PF.slrReady = PF.ensureSLRDB();
  }

  PF.slrAll = function () { return MEMBERS; };
  PF.slrMeta = function () { return META; };
  PF.slrMember = function (slug) {
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].slug === slug) return MEMBERS[i];
    }
    return null;
  };
})();
