/* core/site-config.js  |  PF v1.4.3 | Site config client.
   One central helper for real information that changes without a deploy —
   key dates, tuning knobs, small facts. Backend contract (wave-live-rails):
   public GET action config_get with ?key=X or ?all=1, returning
   {ok, config:{key:{value, updated_at}}}. Fail-closed server-side;
   fail-SOFT here: on any read failure the helper falls back to built-in
   defaults. Config values are DISPLAY/CONFIG-ONLY — never XP-adjacent.
   API: PF.siteConfig.get(key, fallback) -> string
        PF.siteConfig.getAll() -> {key: value}
        PF.siteConfig.ready(cb) -> cb(map) after live fetch or fallback
        PF.siteConfig.source() -> "live" | "defaults" | "pending"
   Cached after the first fetch. Anonymous-safe (public GET, credentials omit).
   KILL: ?pf_off=site-config  or  localStorage pf_disabled_v1='["site-config"]' */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.siteConfig) return;
  try { if (PF.skip && PF.skip('site-config')) return; } catch (e) {}

  var ACTION = 'config_get';
  var TIMEOUT_MS = 12000;

  /* Built-in defaults — the fail-soft floor. Mirrors the backend seeds. */
  var DEFAULTS = {
    campaign_end: '2026-11-03T23:59:00-06:00',
    election_day: '2026-11-03'
  };

  var CACHE = null;      /* key -> value */
  var PENDING = null;    /* in-flight promise */
  var SRC = 'pending';   /* live | defaults | pending */

  function apiBase() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }

  function fetchJSONP(url, cb) {
    try {
      var fn = 'pfScCb' + Math.floor(Math.random() * 1e9);
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

  function applyLive(j) {
    var map = null;
    try {
      var cfg = j && (j.config || (j.data && j.data.config));
      if (cfg && typeof cfg === 'object') {
        map = {};
        var keys = Object.keys(cfg);
        for (var i = 0; i < keys.length; i++) {
          var v = cfg[keys[i]];
          map[keys[i]] = (v && typeof v === 'object' && 'value' in v) ? String(v.value) : String(v);
        }
        if (!Object.keys(map).length) map = null;
      }
    } catch (e) { map = null; }
    return map;
  }

  function loadLive() {
    var base = apiBase();
    if (!base) return Promise.resolve(null);
    var url = base.replace(/\/$/, '') + '?action=' + ACTION + '&all=1';
    return new Promise(function (resolve) {
      var settled = false;
      function done(map) { if (!settled) { settled = true; resolve(map); } }
      try {
        fetch(url, { credentials: 'omit' }).then(function (r) {
          if (!r || !r.ok) throw 0;
          return r.json();
        }).then(function (j) { done(applyLive(j)); })
        .catch(function () { fetchJSONP(url, function (j) { done(applyLive(j)); }); });
        setTimeout(function () { done(null); }, TIMEOUT_MS + 2000);
      } catch (e) { fetchJSONP(url, function (j) { done(applyLive(j)); }); }
    });
  }

  function ensure() {
    if (CACHE) return Promise.resolve(CACHE);
    if (PENDING) return PENDING;
    PENDING = loadLive().then(function (map) {
      if (map) { SRC = 'live'; CACHE = map; }
      else { SRC = 'defaults'; CACHE = Object.assign({}, DEFAULTS); }
      PENDING = null;
      return CACHE;
    });
    return PENDING;
  }

  PF.siteConfig = {
    get: function (key, fallback) {
      if (CACHE && CACHE[key] !== undefined) return CACHE[key];
      if (DEFAULTS[key] !== undefined) return DEFAULTS[key];
      return fallback !== undefined ? fallback : '';
    },
    getAll: function () {
      return Object.assign({}, DEFAULTS, CACHE || {});
    },
    ready: function (cb) {
      ensure().then(function (map) { try { cb(map); } catch (e) {} });
    },
    source: function () { return SRC; }
  };
  /* Warm the cache on load (non-blocking). */
  try { ensure(); } catch (e) {}
})();
