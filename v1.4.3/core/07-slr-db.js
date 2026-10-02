/* core/07-slr-db.js  |  PF v1.4.2 | Master SLR database.
   The 62-member snapshot is embedded in 07-slr-db-data.js (generated from
   src/data/slr-master-db.json at build time) and applied SYNCHRONOUSLY, so
   PF.ROSTER, PF.slrAll() and PF.slrMember() are populated before any game
   silo runs — no async race for the existing synchronous consumers.
   If the snapshot is absent, falls back to fetching the pinned JSON.
   API: PF.slrReady (promise), PF.slrAll(), PF.slrMember(slug), PF.slrMeta(),
        PF.slrLegacy (legacy-shape array backing the PF.ROSTER getter).
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
      img: m.picture || ''
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
        PF.emit('pf:slr-db-ready', { count: MEMBERS.length, fetched: true });
        return MEMBERS;
      })
      .catch(function (err) {
        MEMBERS = [];
        try { PF.slrLegacy = []; } catch (e) {}
        PF.error('slr-db', err);
        PF.emit('pf:slr-db-ready', { count: 0, failed: true });
        return MEMBERS;
      });
  }

  var snap = window.PF_SLR_DB_SNAPSHOT;
  if (snap && apply(snap)) {
    PF.log('slr-db', 'snapshot applied: ' + MEMBERS.length + ' members');
    PF.slrReady = Promise.resolve(MEMBERS);
  } else {
    PF.slrReady = fetchFallback();
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
