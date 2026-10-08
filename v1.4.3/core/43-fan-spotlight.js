/* core/43-fan-spotlight.js  |  PF v1.4.3 | Weekly Fan Favorite homepage spotlight.
   SYNERGY PROJECT #6 (CEO directive 2026-10-07 ~21:37 CDT): the backend's
   fanFavoriteWeek() picks a winner every Monday but the honorific lived
   only in the backend — nobody saw it. This widget auto-features the week's
   Fan Favorite on the homepage: creator photo, name, and the
   "VOTED BY THE PEOPLE — FAN FAVORITE THIS WEEK" honorific.

   Pattern (proven model from core/43-vote-standings.js):
   1. One source of truth — the worker's public `wall` action
      (GET ?action=wall → {wall:[...], fan_favorite:{slug,week,votes}|null}),
      the same fanFavoriteWeek() result that rides the Vanguard Wall.
      NO new backend endpoint, NO worker deploy, NO backend change.
   2. Live pull with fallback — JSONP fetchLive() with a 3s timeout,
      client-side cache (memory + localStorage, 1h TTL, keyed by Chicago
      ISO week so the widget rotates automatically every Monday when the
      backend picks a new winner); on any failure the widget simply stays
      hidden (fail-soft — never an empty or broken state).
   3. Auto re-render — custom `pf-fan-spotlight` event; the card repaints on
      arrival. No manual sync.

   Read-only: zero XP, zero writes anywhere. Fan votes never grant XP
   (standing rule) and this module never casts one.
   JEANINE CHECK (verified 2026-10-07 before excluding): the standing
   do-not-touch rule is about roster PHOTO updates; she cannot receive
   votes at all (VOTE_SKIP_SLUGS on the roster + catalog vote CTAs — no
   ballot path for her slug), so fanFavoriteWeek() can never return her.
   Mirroring 43-vote-standings.js R3, a defensive SKIP_SLUGS check refuses
   to render her slug anyway — it cannot misfire on real data.
   API: PF.fanSpotlight.ensure() (promise), PF.fanSpotlight.current()
        ({slug,name,picture,votes,week} | null), PF.fanSpotlight.week().
   KILL: ?pf_off=fan-spotlight  or  localStorage pf_disabled_v1='["fan-spotlight"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('fan-spotlight')) { return; }

  var RED = '#c1121f', RED_TX = '#e5383b' /* CONTRAST FIX 2026-10-08: text-safe red, 4.68:1 on #0a0a0a */, CREAM = '#f5ead6', MUTED = '#b8ab8e';
  var SKIP_SLUGS = ['jeanine-pirreaux-comedy'];
  var CACHE_KEY = 'pf_fan_spotlight_v1';
  var CACHE_TTL_MS = 60 * 60 * 1000; /* 1h: winner rotates weekly, cheap on D1 */
  var LIVE_TIMEOUT_MS = 3000;
  var MOUNT_RETRY_MS = 60000; /* keep looking for the fan-vote section this long */

  var _mem = null;    /* {week, ts, fav:{slug,week,votes}|null} */
  var _pending = null;
  var _mounted = false;

  function apiBase() {
    var u = '';
    try { u = window.PF_BACKEND_URL || ''; } catch (e) {}
    return u || 'https://pf-api.mtcstw.workers.dev';
  }

  /* Current Chicago ISO week key 'YYYY-W##' — same algorithm as the ballot
     and the backend voteWeek(); prefer PF.isoWeekKey when the bus offers it. */
  function weekKey() {
    try {
      if (PF.isoWeekKey && PF.chiNow) return PF.isoWeekKey(PF.chiNow());
    } catch (e) {}
    var d = new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    var w = 1 + Math.round((t - first) / 6048e5);
    return t.getUTCFullYear() + '-W' + (w < 10 ? '0' + w : String(w));
  }

  function normFav(f) {
    if (!f || typeof f !== 'object') return null;
    var slug = String(f.slug || '').toLowerCase().trim();
    if (!slug || SKIP_SLUGS.indexOf(slug) !== -1) return null;
    return { slug: slug, week: String(f.week || ''), votes: Math.max(0, Math.round(Number(f.votes) || 0)) };
  }

  function readCache(wk) {
    if (_mem && _mem.week === wk && (Date.now() - _mem.ts) < CACHE_TTL_MS) return _mem;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        var c = JSON.parse(raw);
        if (c && c.week === wk && (Date.now() - (c.ts || 0)) < CACHE_TTL_MS) {
          _mem = c;
          return c;
        }
      }
    } catch (e) {}
    return null;
  }

  function writeCache(rec) {
    _mem = rec;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(rec)); } catch (e) {}
  }

  /* fetchLive(): JSONP pull of the public wall action, 3s timeout. The
     fan_favorite field IS the fanFavoriteWeek() result — same transport the
     ballot and repLine use for PF_BACKEND_URL reads. */
  function fetchLive() {
    return new Promise(function (resolve) {
      var done = false;
      function fin(fav) {
        if (done) return; done = true;
        resolve(fav || null);
      }
      try {
        var cb = 'pfFsCb' + Math.floor(Math.random() * 1e9);
        var s = document.createElement('script');
        var to = setTimeout(function () { fin(null); cleanup(); }, LIVE_TIMEOUT_MS);
        function cleanup() {
          try { delete window[cb]; } catch (e) {}
          try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
        }
        window[cb] = function (data) {
          clearTimeout(to);
          try { fin(normFav(data && data.fan_favorite)); }
          catch (e) { fin(null); }
          cleanup();
        };
        s.onerror = function () { clearTimeout(to); fin(null); cleanup(); };
        s.async = true;
        s.src = apiBase() + '?action=' + encodeURIComponent('wall') + '&callback=' + cb;
        document.head.appendChild(s);
      } catch (e) { fin(null); }
    });
  }

  function ensure() {
    var wk = weekKey();
    var hit = readCache(wk);
    if (hit) return Promise.resolve(hit);
    if (_pending) return _pending;
    _pending = new Promise(function (resolve) {
      fetchLive().then(function (fav) {
        _pending = null;
        var rec = { week: wk, ts: Date.now(), fav: fav };
        writeCache(rec);
        if (fav) {
          PF.log && PF.log('fan-spotlight', 'live favorite applied: ' + fav.slug + ' (' + fav.votes + ' votes, week ' + fav.week + ')');
        } else {
          PF.error && PF.error('fan-spotlight', 'no favorite this week — widget stays hidden');
        }
        try { document.dispatchEvent(new CustomEvent('pf-fan-spotlight')); } catch (e) {}
        resolve(rec);
      });
    });
    return _pending;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Creator card data from the SLR DB (synchronous on the homepage, which
     ships the snapshot; lazy-awaited elsewhere). Photo is mandatory — a
     missing photo is a broken state, so fail-soft hides instead. */
  function cardData(fav) {
    var m = null;
    try { m = PF.slrMember ? PF.slrMember(fav.slug) : null; } catch (e) { m = null; }
    if (!m || !m.name || !m.picture) return null;
    return {
      slug: fav.slug, name: m.name, picture: m.picture,
      alt: m.image_alt || (m.name + ' — Sick Left Radicals'),
      catalog: m.catalog_path || ('/sick-left-radicals#' + fav.slug),
      votes: fav.votes
    };
  }

  /* Idempotent mount: an explicit [data-pf-fanspotlight] host wins;
     otherwise, on the #pf-v2 homepage shell the card is inserted right
     after the fan-vote block (same insertion point as the events nudge). */
  function mountNode() {
    var host = null;
    try { host = document.querySelector('[data-pf-fanspotlight]'); } catch (e) {}
    if (host) return { host: host, own: false };
    var h = null;
    try { h = document.getElementById('pf-v2'); } catch (e2) {}
    if (!h) return null;
    var voteSec = null;
    try { voteSec = h.querySelector('section[data-game="fan-vote"]'); } catch (e3) {}
    if (!voteSec || voteSec.parentNode !== h) return null;
    var node = voteSec.nextSibling;
    while (node && node.nodeType !== 1) node = node.nextSibling;
    if (node && node.className && String(node.className).indexOf('pf-fan-spotlight') !== -1) {
      return { host: node, own: true };
    }
    var div = document.createElement('div');
    div.className = 'pf-fan-spotlight';
    voteSec.parentNode.insertBefore(div, voteSec.nextSibling);
    return { host: div, own: true };
  }

  function cardHTML(c) {
    return '' +
    '<div style="max-width:min(680px,94vw);margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;' +
      'background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);' +
      'border:3px solid ' + RED + ';color:' + CREAM + ';font-family:Arial,sans-serif;">' +
      '<div style="font-size:12px;letter-spacing:4px;color:' + RED_TX + ';font-weight:800;margin-bottom:10px;">&#9733; VOTED BY THE PEOPLE &#9733;</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:clamp(1.4rem,5vw,2rem);letter-spacing:2px;margin:0 0 14px;text-transform:uppercase;">Fan Favorite This Week</div>' +
      '<a href="' + esc(c.catalog) + '" style="text-decoration:none;color:inherit;display:inline-block;">' +
        '<img src="' + esc(c.picture) + '" alt="' + esc(c.alt) + '" loading="lazy" ' +
          'style="width:120px;height:120px;object-fit:cover;border-radius:50%;border:3px solid ' + RED + ';display:block;margin:0 auto 12px;" ' +
          'onerror="this.style.display=\'none\'"/>' +
        '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:1.25rem;letter-spacing:1px;color:' + CREAM + ';text-transform:uppercase;">' + esc(c.name) + '</div>' +
      '</a>' +
      '<div style="margin-top:8px;font-size:0.85rem;color:' + MUTED + ';letter-spacing:0.08em;">' + esc(c.votes) + ' VOTES THIS WEEK</div>' +
      '<div style="margin-top:14px;"><a href="#pf-vote" style="display:inline-block;background:' + RED + ';color:#fff;font-weight:800;font-size:0.9rem;' +
        'padding:0.7rem 1.6rem;text-decoration:none;letter-spacing:0.14em;border:2px solid #fff;">VOTE FOR NEXT WEEK&#8217;S FAVORITE &rarr;</a></div>' +
    '</div>';
  }

  /* Paint: fail-soft — any missing piece hides the widget, never renders
     an empty or broken state. Idempotent. */
  function paint() {
    var fav = null;
    try {
      var wk = weekKey();
      var rec = readCache(wk);
      fav = rec ? rec.fav : null;
    } catch (e) { fav = null; }
    var slot = mountNode();
    if (!slot) return; /* not on the homepage yet, or no fan-vote section — stay out */
    try {
      if (!fav) { slot.host.innerHTML = ''; return; }
      var c = cardData(fav);
      if (!c) { slot.host.innerHTML = ''; return; }
      slot.host.innerHTML = cardHTML(c);
      _mounted = true;
    } catch (e2) {
      try { slot.host.innerHTML = ''; } catch (e3) {}
    }
  }

  /* Late SLR DB: if the snapshot loads after us, repaint on readiness. */
  function whenDbReady(fn) {
    try {
      if (PF.slrReady && PF.slrReady.then) { PF.slrReady.then(function () { fn(); }, function () { fn(); }); }
      else { setTimeout(fn, 0); }
    } catch (e) { setTimeout(fn, 0); }
  }

  function boot() {
    try {
      document.removeEventListener('pf-fan-spotlight', paint);
      document.addEventListener('pf-fan-spotlight', paint);
    } catch (e) {}
    ensure().then(function () {
      whenDbReady(paint);
    });
    /* The fan-vote block mounts lazily — keep watching for it briefly so
       the spotlight lands even when the block arrives after core runs. */
    try {
      var t0 = Date.now();
      var iv = setInterval(function () {
        try {
          if (_mounted || (Date.now() - t0) > MOUNT_RETRY_MS) { clearInterval(iv); return; }
          var slot = mountNode();
          if (slot) { paint(); if (_mounted) clearInterval(iv); }
        } catch (e) {}
      }, 1000);
    } catch (e2) {}
  }

  PF.fanSpotlight = {
    ensure: ensure,
    week: weekKey,
    skipSlugs: SKIP_SLUGS.slice(),
    current: function () {
      try {
        var rec = readCache(weekKey());
        return rec ? rec.fav : null;
      } catch (e) { return null; }
    },
    paint: paint
  };

  /* Warm the cache on load so the card paints fast; paint itself is driven
     by the pf-fan-spotlight event + the mount retry. Fail-soft throughout. */
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else setTimeout(boot, 0);
  } catch (e) {}
})();
