/* core/07-slr-db.js  |  PF v1.4.2 | Master SLR database.
   The 62-member snapshot is generated into 07-slr-db-data.js (from
   src/data/slr-master-db.json). M35 (2026-10-05) perf split: the snapshot
   ships as its own lazily-loaded chunk, core/bundle-slr-data.js (minified,
   ~40KB gzip) — it is in NO blocking bundle. When the chunk has already
   landed it is applied SYNCHRONOUSLY, so PF.ROSTER, PF.slrAll() and
   PF.slrMember() are populated before any game silo runs — no async race
   for the synchronous consumers. Otherwise PF.ensureSLRDB() injects the
   pinned chunk on first need (promise-cached, concurrent calls deduped,
   15s backstop, JSON fallback, resolves to [] on failure so consumers
   degrade gracefully).
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
      : 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@4f896b0e9b3033a1b21317d4386e215339ff6455/src/data/slr-master-db.json';
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

  /* Synchronous fast path: if the lazy data chunk (or an in-bundle snapshot)
     already set window.PF_SLR_DB_SNAPSHOT, apply before any game silo runs. */
  var snap = window.PF_SLR_DB_SNAPSHOT;
  if (snap && apply(snap)) {
    PF.log('slr-db', 'snapshot applied: ' + MEMBERS.length + ' members');
  }

  /* ---- Lazy load (M34): PF.ensureSLRDB() ----
     Injects the pinned core/bundle-slr-data.js chunk exactly once and
     applies it. M35 (2026-10-05) perf split: the chunk is the terser-
     minified SLR snapshot (~40KB gzip, under the 120KB cap) — the raw
     07-slr-db-data.js no longer ships inside any blocking bundle.
     Concurrent callers share one promise; the 15s backstop plus the JSON
     fallback mean a failed load resolves to [] instead of hanging — every
     consumer already degrades on an empty roster.
     AUTO-UPDATE (2026-10-07, PINNED 2026-10-08 per roster-@main audit fix):
     before touching the bundled snapshot, try the master DB JSON with a short
     timeout. The URL is pinned to a commit SHA (was @main) so roster data is
     deterministic — a push to src/data/slr-master-db.json now needs a pin
     bump in LIVE_DB_URL to propagate. On any failure the bundled snapshot
     path runs unchanged. */
  var _slrPending = null;
  var LIVE_DB_URL = 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@4f896b0e9b3033a1b21317d4386e215339ff6455/src/data/slr-master-db.json';
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
      : 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@4f896b0e9b3033a1b21317d4386e215339ff6455/v1.4.3/core/07-slr-db-data.js');
  }
  PF.ensureSLRDB = function () {
    var s0 = window.PF_SLR_DB_SNAPSHOT;
    /* PINNED-UPDATE (was AUTO-UPDATE; pinned 2026-10-08): pinned JSON first
       (deterministic data). The bundled snapshot stays as the synchronous
       fast path only when the pinned fetch hasn't resolved yet — the pinned
       result wins whenever it arrives valid. */
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

  /* PROJECT BLOSSOM F3 (2026-10-06): SCORE SINGLE SOURCE OF TRUTH.
     The roster index and catalog pages rendered `m.propaganda_score`
     directly and drifted apart (index 8.9 vs catalog 9.0 for
     the-antifascist-frog). Every surface reads through PF.slrScore /
     PF.slrScoreText now — one getter, one format, one number. The live
     Efficiency Index (games/efficiency.js) may paint a computed score over
     these slots later, but the static fallback is always this. */
  PF.slrScore = function (slug) {
    var m = PF.slrMember(slug);
    var s = m ? Number(m.propaganda_score) : NaN;
    return (typeof s === 'number' && isFinite(s)) ? s : 0;
  };
  PF.slrScoreText = function (slug) {
    return PF.slrScore(slug).toFixed(1);
  };

  /* PROJECT BLOSSOM F2 (2026-10-06): REAL AFFINITY MATCHING.
     The old "nearest score" related block rendered an identical trio on
     unrelated pages. PF.slrRelated(slug, n) returns the n most related
     members — pure, deterministic, computed from the DB only:
       shared social platforms (canonicalized links[].platform +
         primary_platform; aggregators like Website/Linktree excluded): +4 each
       content_focus token overlap, IDF-weighted (rare shared words like
         "stop-motion" beat common ones like "political"): up to +12
       propaganda-score proximity: +4 x (1-|d|/2.2)
       audience-scale proximity (log10 followers_total): +1.5 x (1-|d|/3)
     Ties break by slug (ascending). Never returns the member itself.
     Exported on PF for the catalog page; also used by the verify suite. */
  var AFF_STOP = { the:1, a:1, an:1, and:1, or:1, of:1, to:1, in:1, on:1,
    for:1, with:1, is:1, are:1, was:1, be:1, by:1, from:1, as:1, at:1, it:1,
    its:1, this:1, that:1, they:1, their:1, them:1, we:1, our:1, you:1, your:1,
    he:1, she:1, his:1, her:1, not:1, no:1, but:1, so:1, if:1, when:1, who:1,
    what:1, which:1, all:1, both:1, more:1, most:1, than:1, into:1, over:1,
    out:1, up:1, about:1, also:1, new:1, per:1, via:1 };
  function affTokens(s) {
    var set = {};
    String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').forEach(function (w) {
      if (w && w.length > 2 && !AFF_STOP[w]) set[w] = 1;
    });
    return set;
  }
  /* Canonicalize a raw platform label to a real social/content platform.
     Aggregators (websites, link-in-bio, merch, tip jars, fundraisers) carry
     no affinity signal — every creator has them. Unknown -> ''. */
  function affCanonPlat(raw) {
    var s = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
    if (/^tiktok/.test(s)) return 'tiktok';
    if (/^facebook/.test(s)) return 'facebook';
    if (/^instagram/.test(s)) return 'instagram';
    if (/^youtube/.test(s)) return 'youtube';
    if (s === 'x') return 'x';
    if (/^substack/.test(s)) return 'substack';
    if (/^patreon/.test(s)) return 'patreon';
    if (/^podcast/.test(s)) return 'podcast';
    if (/^twitch/.test(s)) return 'twitch';
    return '';
  }
  function affPlatforms(m) {
    var set = {};
    try {
      var pp = affCanonPlat(m.primary_platform);
      if (pp) set[pp] = 1;
      (m.links || []).forEach(function (l) {
        var c = l && affCanonPlat(l.platform);
        if (c) set[c] = 1;
      });
    } catch (e) {}
    return set;
  }
  /* IDF table over the whole roster's content_focus tokens, computed once. */
  var _affIdf = null;
  function affIdf() {
    if (_affIdf) return _affIdf;
    var df = {}, i, k;
    for (i = 0; i < MEMBERS.length; i++) {
      var t = affTokens(MEMBERS[i] && MEMBERS[i].content_focus);
      for (k in t) df[k] = (df[k] || 0) + 1;
    }
    var N = Math.max(MEMBERS.length, 1), out = {};
    for (k in df) out[k] = Math.log(N / df[k]);
    _affIdf = out;
    return out;
  }
  PF.slrRelated = function (slug, n) {
    n = Math.max(1, Math.min(12, Number(n) || 3));
    var me = PF.slrMember(slug);
    if (!me) return [];
    var idf = affIdf();
    var meTok = affTokens(me.content_focus), mePl = affPlatforms(me);
    var meScore = Number(me.propaganda_score) || 0;
    var meReach = Math.log10(Math.max(Number(me.followers_total) || 1, 1));
    var scored = [];
    for (var i = 0; i < MEMBERS.length; i++) {
      var x = MEMBERS[i];
      if (!x || x.slug === slug) continue;
      var s = 0, k;
      var xp = affPlatforms(x), shared = 0;
      for (k in xp) { if (mePl[k]) shared++; }
      /* Platform overlap is capped: creators on six platforms would
         otherwise swamp the content signal with aggregator-style
         ubiquity (the old identical-trio failure mode). */
      s += 4 * Math.min(shared, 2);
      var xt = affTokens(x.content_focus), cw = 0;
      for (k in xt) { if (meTok[k]) cw += idf[k] || 0; }
      s += Math.min(12, cw);
      var ds = Math.abs((Number(x.propaganda_score) || 0) - meScore);
      s += 2.5 * (1 - Math.min(1, ds / 2.2));
      var dr = Math.abs(Math.log10(Math.max(Number(x.followers_total) || 1, 1)) - meReach);
      s += 1.5 * (1 - Math.min(1, dr / 3));
      scored.push({ m: x, s: s });
    }
    scored.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      return a.m.slug < b.m.slug ? -1 : (a.m.slug > b.m.slug ? 1 : 0);
    });
    return scored.slice(0, n).map(function (r) { return r.m; });
  };
})();
