/* core/creator-stats.js  |  PF v1.4.3 | Unified creator-stats client.
   One central helper for per-creator follower counts and the network total.
   Backend contract (wave-unified-stats): public GET action creator_stats_get
   with ?slugs=a,b or ?all=1, returning [{slug, platform, followers,
   updated_at}]. Fail-closed server-side; fail-SOFT here: on any read
   failure the helper falls back to the PF_SLR_DB_SNAPSHOT seed data
   (followers_total / followers_as_of). Counts are DISPLAY-ONLY — never
   XP-adjacent, never branched on.
   Anonymous visitors must see counts: the read is a plain public GET, no
   auth secret, no credentials.
   API: PF.creatorStats.get(slug) -> {followers, updated_at} | null
        PF.creatorStats.getAll() -> {slug: {followers, updated_at}}
        PF.creatorStats.networkTotal() -> sum of followers (the 8M+ figure
          derives from this — it is never hardcoded)
        PF.creatorStats.count() -> member count
        PF.creatorStats.fmt(n) -> "12.6K" / "1.2M" / "8M"
        PF.creatorStats.fmtTotal(n) -> fmt + "+" ("8M+")
        PF.creatorStats.ready(cb) -> cb(map) after live fetch or fallback
        PF.creatorStats.paint(root) -> fills [data-pf-fc] / [data-pf-fc-total]
          / [data-pf-fc-count] nodes inside root
        PF.creatorStats.source() -> "live" | "snapshot" | "pending"
   Cached after the first fetch. Shares the bundle's CORS-safe read path
   (fetch first, JSONP backstop — the same pattern as the public reads in
   pages/slr-roster.js and games/operations-admin.js).
   KILL: ?pf_off=creator-stats  or  localStorage pf_disabled_v1='["creator-stats"]' */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.creatorStats) return;
  try { if (PF.skip && PF.skip('creator-stats')) return; } catch (e) {}

  var ACTION = 'creator_stats_get';
  var TIMEOUT_MS = 12000;

  var CACHE = null;      /* slug -> {followers, updated_at, platform} */
  var PENDING = null;    /* in-flight promise */
  var SRC = 'pending';   /* live | snapshot | pending */

  function apiBase() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }

  /* Display formatter: 12600 -> "12.6K", 1200000 -> "1.2M", 8000000 -> "8M". */
  function fmt(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    var v;
    if (n >= 1e6) {
      v = n / 1e6;
      return (v >= 100 ? String(Math.round(v))
        : String(Math.round(v * 10) / 10).replace(/\.0$/, '')) + 'M';
    }
    if (n >= 1e3) {
      v = n / 1e3;
      return (v >= 100 ? String(Math.round(v))
        : String(Math.round(v * 10) / 10).replace(/\.0$/, '')) + 'K';
    }
    return String(n);
  }
  function fmtTotal(n) { return fmt(n) + '+'; }

  /* Fail-soft seed: the bundled SLR snapshot. Display-only, never XP. */
  function snapshotMap() {
    var map = {};
    try {
      var members = [];
      if (PF.slrAll) { try { members = PF.slrAll() || []; } catch (e0) {} }
      if (!members.length && window.PF_SLR_DB_SNAPSHOT && window.PF_SLR_DB_SNAPSHOT.members)
        members = window.PF_SLR_DB_SNAPSHOT.members;
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        if (!m || !m.slug) continue;
        var f = Number(m.followers_total);
        if (!(f > 0)) continue;
        map[m.slug] = {
          followers: Math.round(f),
          updated_at: m.followers_as_of || '',
          platform: 'primary',
          _snap: true
        };
      }
    } catch (e) {}
    return map;
  }

  function applyLive(rows) {
    var map = {};
    try {
      if (!rows) return null;
      var arr = Array.isArray(rows) ? rows : (rows.rows || rows.data || rows.stats || null);
      if (!arr || !arr.length) return null;
      for (var i = 0; i < arr.length; i++) {
        var r = arr[i];
        if (!r || !r.slug) continue;
        var f = Number(r.followers);
        if (!(f >= 0)) continue;
        /* 'primary' platform is the roster's canonical count; prefer it. */
        if (map[r.slug] && map[r.slug].platform === 'primary' && r.platform !== 'primary') continue;
        map[r.slug] = {
          followers: Math.round(f),
          updated_at: r.updated_at || 0,
          platform: r.platform || 'primary'
        };
      }
      if (!Object.keys(map).length) return null;
    } catch (e) { return null; }
    return map;
  }

  function fetchJSONP(url, cb) {
    try {
      var fn = 'pfCsCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function fin(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e) {}
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
        try { cb(j); } catch (e3) {}
      }
      window[fn] = function (j) { fin(j); };
      s.onerror = function () { fin(null); };
      s.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + fn;
      s.async = true;
      document.head.appendChild(s);
      setTimeout(function () { fin(null); }, TIMEOUT_MS);
    } catch (e) { try { cb(null); } catch (e2) {} }
  }

  function loadLive() {
    var base = apiBase();
    if (!base) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var done = false;
      function fin(map) { if (!done) { done = true; resolve(map); } }
      var url = base + '?action=' + encodeURIComponent(ACTION) + '&all=1';
      var timer = setTimeout(function () { fin(null); }, TIMEOUT_MS);
      try {
        fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' })
          .then(function (r) {
            if (!r || !r.ok) throw new Error('http ' + (r && r.status));
            return r.json();
          })
          .then(function (j) { clearTimeout(timer); fin(applyLive(j)); })
          .catch(function () {
            /* CORS-safe backstop: the worker answers JSONP too. */
            try { fetchJSONP(url, function (j2) { clearTimeout(timer); fin(applyLive(j2)); }); }
            catch (e) { clearTimeout(timer); fin(null); }
          });
      } catch (e) { clearTimeout(timer); fin(null); }
    });
  }

  function ready(cb) {
    var done = function (m) { try { if (cb) cb(m); } catch (e) {} };
    if (CACHE) { done(CACHE); return; }
    if (PENDING) { PENDING.then(function (m) { done(m); }); return; }
    PENDING = loadLive().then(function (live) {
      if (live) { CACHE = live; SRC = 'live'; }
      else { CACHE = snapshotMap(); SRC = 'snapshot'; }
      try { if (window.PF && PF.log) PF.log('creator-stats', 'ready from ' + SRC + ' (' + Object.keys(CACHE).length + ' slugs)'); } catch (e) {}
      return CACHE;
    });
    PENDING.then(function (m) { done(m); });
  }

  function get(slug) {
    try {
      if (CACHE && CACHE[slug]) return CACHE[slug];
      var snap = snapshotMap();
      return snap[slug] || null;
    } catch (e) { return null; }
  }

  function getAll() {
    var out = {};
    try {
      var map = CACHE || snapshotMap();
      for (var k in map) out[k] = { followers: map[k].followers, updated_at: map[k].updated_at };
    } catch (e) {}
    return out;
  }

  function networkTotal() {
    var t = 0, all = getAll();
    for (var k in all) t += all[k].followers || 0;
    return t;
  }

  function count() {
    var n = 0, all = getAll();
    for (var k in all) n++;
    return n;
  }

  /* Progressive enhancement: pre-live markup carries snapshot fallback
     text; paint() overwrites with live values once ready. */
  function paint(root) {
    try {
      if (!root || !root.querySelectorAll) return;
      var all = getAll();
      var nodes = root.querySelectorAll('[data-pf-fc]');
      for (var i = 0; i < nodes.length; i++) {
        var slug = nodes[i].getAttribute('data-pf-fc');
        var rec = slug && all[slug];
        if (rec && rec.followers > 0) nodes[i].textContent = fmt(rec.followers);
      }
      var totals = root.querySelectorAll('[data-pf-fc-total]');
      for (var j = 0; j < totals.length; j++) totals[j].textContent = fmtTotal(networkTotal());
      var counts = root.querySelectorAll('[data-pf-fc-count]');
      for (var c = 0; c < counts.length; c++) counts[c].textContent = String(count());
    } catch (e) {}
  }

  PF.creatorStats = {
    get: get,
    getAll: getAll,
    networkTotal: networkTotal,
    count: count,
    fmt: fmt,
    fmtTotal: fmtTotal,
    ready: ready,
    paint: paint,
    source: function () { return SRC; }
  };
})();
