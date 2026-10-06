/* core/news-top.js  |  PF v1.4.3 | Top Stories rail client.
   One shared frontend helper for the news_top cache (wave-live-rails):
   GDELT 2.1 primary + Google News RSS backup, ingested server-side every
   20 min. Every on-site section that shows top stories reads through THIS
   helper so they all render the same cache.
   Backend contract: public GET action news_top_get (?limit=N) →
   {ok, stories:[{url,title,source,published_at,origin,manual,sourced_by}],
    fetched_at, stale,
    macro_flags:[{type,label,detail,period_label,source_url}]}.
   sourced_by (Synergy-1): normalized callsign of the creator who sourced a
   manually pinned story ('' when not creator-sourced). Rendered through the
   shared PF.credit component — the credit line appears only when present.
   macro_flags (Wave A2, S-10): release-day flags (jobs day / CPI day)
   drawn from FRED ingest freshness. Flag definitions owned by News Desk;
   this helper renders them plain-factually. Zero XP — display only.
   Fail-soft: on read failure the helper serves its last good payload;
   if there is none, stories:[] + stale:true — callers render a
   "stories updating" line, never a broken page.
   EDITORIAL GUARD: on-site display only. This helper never posts, shares,
   or publishes anywhere.
   API: PF.newsTop.get(limit) -> Promise<{stories, fetched_at, stale, macro_flags}>
        PF.newsTop.render(el, opts) -> fills el with the Top Stories rail
        PF.newsTop.source() -> "live" | "cache" | "empty" | "pending"
   Cached 5 min. Anonymous-safe (public GET, credentials omit).
   KILL: ?pf_off=news-top  or  localStorage pf_disabled_v1='["news-top"]'
         (whole rail). Flags only: ?pf_off=fred-editorial (same key kills
         the briefing macro section too). */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.newsTop) return;
  try { if (PF.skip && PF.skip('news-top')) return; } catch (e) {}

  var ACTION = 'news_top_get';
  var TIMEOUT_MS = 12000;
  var TTL_MS = 5 * 60 * 1000;

  var CACHE = null;   /* {stories, fetched_at, stale, macro_flags, at} */
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
        stale: !!j.stale, macro_flags: normalizeFlags(j.macro_flags), at: Date.now() };
    } catch (e) { return null; }
  }

  /* Wave A2 (S-10): release-day flags. Plain-factual, News Desk-owned
     definitions. Scheme-allowlisted FRED URLs only; anything else renders
     as unlinked text (never a javascript: or off-domain href). Honors
     ?pf_off=fred-editorial. */
  var FRED_URL_RE = /^https:\/\/fred\.stlouisfed\.org\/series\/[A-Z0-9]+$/;
  function flagsKilled() {
    try { return !!(PF.skip && PF.skip('fred-editorial')); } catch (e) { return false; }
  }
  function normalizeFlags(raw) {
    var out = [];
    try {
      if (flagsKilled()) return out;
      if (!Array.isArray(raw)) return out;
      for (var i = 0; i < raw.length; i++) {
        var f = raw[i] || {};
        if (!f.type || !f.label) continue;
        var url = String(f.source_url || '');
        if (!FRED_URL_RE.test(url)) url = '';
        out.push({ type: String(f.type).slice(0, 24),
          label: String(f.label).slice(0, 24),
          detail: String(f.detail || '').slice(0, 160),
          period_label: String(f.period_label || '').slice(0, 24),
          source_url: url });
      }
    } catch (e) {}
    return out;
  }

  function flagCss() {
    if (document.getElementById('pf-newstop-flags-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-newstop-flags-css';
    st.textContent =
      '.pf-newstop-flags{margin:0 0 10px}' +
      '.pf-newstop-flag{display:flex;gap:10px;align-items:baseline;padding:8px 10px;margin-bottom:6px;' +
      'background:#141003;border:1px solid #e8b64c;text-decoration:none}' +
      'a.pf-newstop-flag:hover{background:#1d1607}' +
      '.pf-newstop-flaglabel{font:bold 11px monospace;color:#0a0a0a;background:#e8b64c;' +
      'padding:3px 8px;border-radius:2px;white-space:nowrap;letter-spacing:1px}' +
      '.pf-newstop-flagdetail{font:12px monospace;color:#f5ead6}' +
      '.pf-newstop-flagsrc{display:block;font:10px monospace;color:#888;margin-top:2px}';
    document.head.appendChild(st);
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
      return { stories: [], fetched_at: 0, stale: true, macro_flags: [], at: Date.now() };
    });
    return PENDING;
  }

  function railHTML(payload, opts) {
    opts = opts || {};
    var title = opts.title || 'TOP STORIES';
    try { flagCss(); } catch (e) {}
    var h = '<div class="pf-newstop"><div class="pf-newstop-head">' + esc(title) + '</div>';
    /* Wave A2 (S-10): release-day flags above the stories. Omitted when
       none, when killed, or when the payload predates the flags field. */
    var flags = (payload && Array.isArray(payload.macro_flags)) ? payload.macro_flags : [];
    if (flags.length) {
      h += '<div class="pf-newstop-flags">';
      for (var fi = 0; fi < flags.length; fi++) {
        var f = flags[fi];
        var inner = '<span class="pf-newstop-flaglabel">' + esc(f.label) + '</span>' +
          '<span class="pf-newstop-flagdetail">' + esc(f.detail) +
          (f.period_label ? ' &middot; ' + esc(f.period_label) : '') +
          '<span class="pf-newstop-flagsrc">St. Louis Fed FRED (official)</span></span>';
        if (f.source_url) {
          h += '<a class="pf-newstop-flag" href="' + esc(f.source_url) +
            '" target="_blank" rel="noopener">' + inner + '</a>';
        } else {
          h += '<div class="pf-newstop-flag">' + inner + '</div>';
        }
      }
      h += '</div>';
    }
    if (!payload.stories.length) {
      h += '<div class="pf-newstop-empty">Stories updating&hellip; check back soon.</div>';
    } else {
      h += '<ul class="pf-newstop-list">';
      var n = Math.min(payload.stories.length, opts.limit || 8);
      for (var i = 0; i < n; i++) {
        var s = payload.stories[i];
        /* Synergy-1 attribution: creator-sourced pins carry sourced_by —
           the shared credit component renders it (or nothing, honestly). */
        var cr = '';
        try { cr = (PF.credit && s.sourced_by) ? PF.credit({ sourced_by: s.sourced_by }) : ''; } catch (e) {}
        h += '<li class="pf-newstop-item"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
          esc(s.title) + '</a>' +
          '<span class="pf-newstop-meta">' + esc(s.source) +
          (s.published_at ? ' &middot; ' + esc(timeAgo(s.published_at)) : '') + '</span>' + cr + '</li>';
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
        /* NEWS+STATS (2026-10-06): wire live stats into the rail. Fail-open —
           stories with no matching tags render exactly as before. */
        try {
          if (window.PF && PF.newsStats && p && p.stories) PF.newsStats.enhanceRail(el, p.stories);
        } catch (e2) {}
      });
      return self;
    },
    source: function () { return SRC; }
  };
})();
