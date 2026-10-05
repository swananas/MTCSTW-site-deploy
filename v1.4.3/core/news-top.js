/* core/news-top.js  |  PF v1.4.3 | Top Stories rail client.
   One shared frontend helper for the news_top cache (wave-live-rails):
   GDELT 2.1 primary + Google News RSS backup, ingested server-side every
   20 min. Every on-site section that shows top stories reads through THIS
   helper so they all render the same cache.
   Backend contract: public GET action news_top_get (?limit=N) →
   {ok, stories:[{url,title,source,published_at,origin,manual}],
    fetched_at, stale}.
   Fail-soft: on read failure the helper serves its last good payload;
   if there is none, stories:[] + stale:true — callers render a
   "stories updating" line, never a broken page.
   EDITORIAL GUARD: on-site display only. This helper never posts, shares,
   or publishes anywhere.
   API: PF.newsTop.get(limit) -> Promise<{stories, fetched_at, stale}>
        PF.newsTop.render(el, opts) -> fills el with the Top Stories rail
        PF.newsTop.source() -> "live" | "cache" | "empty" | "pending"
   Cached 5 min. Anonymous-safe (public GET, credentials omit).
   KILL: ?pf_off=news-top  or  localStorage pf_disabled_v1='["news-top"]' */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.newsTop) return;
  try { if (PF.skip && PF.skip('news-top')) return; } catch (e) {}

  var ACTION = 'news_top_get';
  var TIMEOUT_MS = 12000;
  var TTL_MS = 5 * 60 * 1000;

  var CACHE = null;   /* {stories, fetched_at, stale, at} */
  var PENDING = null;
  var SRC = 'pending';

  function apiBase() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function timeAgo(ts) {
    try {
      var d = Date.now() - Number(ts || 0);
      if (d < 0) d = 0;
      var m = Math.floor(d / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    } catch (e) { return ''; }
  }

  function fetchJSONP(url, cb) {
    try {
      var fn = 'pfNtCb' + Math.floor(Math.random() * 1e9);
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

  function normalize(j) {
    try {
      if (!j || j.ok === false) return null;
      var arr = j.stories || j.data || [];
      if (!Array.isArray(arr) || !arr.length) return null;
      var stories = [];
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (!s || !s.url || !s.title) continue;
        stories.push({ url: String(s.url), title: String(s.title),
          source: String(s.source || ''), published_at: Number(s.published_at) || 0,
          origin: String(s.origin || ''), manual: !!s.manual });
      }
      if (!stories.length) return null;
      return { stories: stories, fetched_at: Number(j.fetched_at) || 0,
        stale: !!j.stale, at: Date.now() };
    } catch (e) { return null; }
  }

  function loadLive(limit) {
    var base = apiBase();
    if (!base) return Promise.resolve(null);
    var url = base.replace(/\/$/, '') + '?action=' + ACTION + '&limit=' + (limit || 12);
    return new Promise(function (resolve) {
      var settled = false;
      function done(p) { if (!settled) { settled = true; resolve(p); } }
      try {
        fetch(url, { credentials: 'omit' }).then(function (r) {
          if (!r || !r.ok) throw 0;
          return r.json();
        }).then(function (j) { done(normalize(j)); })
        .catch(function () { fetchJSONP(url, function (j) { done(normalize(j)); }); });
        setTimeout(function () { done(null); }, TIMEOUT_MS + 2000);
      } catch (e) { fetchJSONP(url, function (j) { done(normalize(j)); }); }
    });
  }

  function ensure(limit) {
    if (CACHE && (Date.now() - CACHE.at) < TTL_MS) return Promise.resolve(CACHE);
    if (PENDING) return PENDING;
    PENDING = loadLive(limit).then(function (p) {
      PENDING = null;
      if (p) { SRC = 'live'; CACHE = p; return CACHE; }
      if (CACHE) { SRC = 'cache'; return CACHE; } /* last good */
      SRC = 'empty';
      return { stories: [], fetched_at: 0, stale: true, at: Date.now() };
    });
    return PENDING;
  }

  function railHTML(payload, opts) {
    opts = opts || {};
    var title = opts.title || 'TOP STORIES';
    var h = '<div class="pf-newstop"><div class="pf-newstop-head">' + esc(title) + '</div>';
    if (!payload.stories.length) {
      h += '<div class="pf-newstop-empty">Stories updating&hellip; check back soon.</div>';
    } else {
      h += '<ul class="pf-newstop-list">';
      var n = Math.min(payload.stories.length, opts.limit || 8);
      for (var i = 0; i < n; i++) {
        var s = payload.stories[i];
        h += '<li class="pf-newstop-item"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
          esc(s.title) + '</a>' +
          '<span class="pf-newstop-meta">' + esc(s.source) +
          (s.published_at ? ' &middot; ' + esc(timeAgo(s.published_at)) : '') + '</span></li>';
      }
      h += '</ul>';
      if (payload.stale) {
        h += '<div class="pf-newstop-stale">Last updated ' +
          esc(timeAgo(payload.fetched_at)) + ' &mdash; refreshing.</div>';
      }
    }
    h += '</div>';
    return h;
  }

  PF.newsTop = {
    get: function (limit) { return ensure(limit || 12); },
    render: function (el, opts) {
      if (!el) return;
      var self = this;
      ensure(opts && opts.limit).then(function (p) {
        try { el.innerHTML = railHTML(p, opts); } catch (e) {}
      });
      return self;
    },
    source: function () { return SRC; }
  };
})();
