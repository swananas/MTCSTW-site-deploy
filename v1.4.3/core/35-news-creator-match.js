/* core/35-news-creator-match.js  |  PF v1.4.3 | News <-> Creator matching
   (Synergy-7, CEO directive 2026-10-07).
   PROBLEM: the site shows news and the creator DB knows what each creator
   posts about — never connected. This module connects them, both ways:
     - on news rails: "CREATORS COVERING THIS" — up to 3 roster members per
       story (photo, name, platform link), wired into PF.newsTop.render by
       34-newsstats-style post-render decoration (fail-open).
     - on creator catalog pages: "RECENTLY IN THE NEWS" — up to 3 stories
       matching the creator's beat, mounted into #pf-catalog-news by
       pages/slr-catalog.js (fail-soft: no matches = no section).
   MATCHING (v1, keyword/topic overlap — no ML):
     - One source of truth on each side: creator topics derived from the
       master DB (content_focus + offer + key_strengths + bio via PF.slrReady /
       PF.slrAll); news topics derived from the live news pipeline
       (story title + source via PF.newsTop.get, own fetch fallback).
     - A 14-topic keyword taxonomy (TAG VOCABULARY below) tags both sides;
       score = count of shared topics; rank overlap desc, propaganda_score
       desc. No shared topic = no match = section not shown.
   LIVE PULL + FALLBACK: creators come from PF.slrReady (snapshot or lazy
   JSON, resolves [] on failure); stories from PF.newsTop.get (its own 5-min
   cache + JSONP fallback), else a direct fetch with timeout, else [].
   AUTO RE-RENDER: listens for pf-slr-live (live DB updates) and re-runs
   every mounted surface. News rails re-enhance whenever PF.newsTop.render
   runs, so they always track the freshest cache.
   Fail-soft throughout: module never throws into callers, never shifts
   layout when data is absent (slots render only when matches exist).
   Zero XP — display only. No writes, no POSTs.
   API: PF.newsCreatorMatch = { topicsFor, topicsForStory, creatorsForStory,
          storiesForCreator, enhanceRail, mountCreatorNews, refresh }
   KILL: ?pf_off=news-creator-match  or
         localStorage pf_disabled_v1='["news-creator-match"]' */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.newsCreatorMatch) return;
  try { if (PF.skip && PF.skip('news-creator-match')) return; } catch (e) { return; }

  /* ---------------- TAG VOCABULARY (v1 keyword topics) ----------------
     Each topic: [key, regex]. Keep regexes word-boundary-safe where the
     bare word is ambiguous (ice vs service, cop vs copper). The taxonomy
     mirrors the news ingest's movement-relevant beats. */
  var TOPICS = [
    ['labor', /\b(union|strike|picket|walkout|minimum wage|wages?|workers?|afl-?cio|uaw|teamsters|collective bargain|general strike|labor)\b/i],
    ['abortion', /\b(abortion|reproductive|roe v\.?\s*wade|planned parenthood|pro[ -]?choice)\b/i],
    ['immigration', /\b(ice|deport\w*|daca|immigra\w*|border|asylum|refugee|migrant)\b/i],
    ['police', /\b(police|brutality|prison|carceral|qualified immunity|cops?|incarcerat\w*)\b/i],
    ['housing', /\b(rent|evict\w*|tenant|landlord|housing|homeless|gentrif\w*)\b/i],
    ['economy', /(student debt|\bdebt\b|inflation|\bcpi\b|medicare|medicaid|\bsnap\b|health policy|\bhealth\b|billionaire|oligarch|wealth|corporate|\bceo\b|class war|capitalis\w*|tariff|lobby)/i],
    ['voting', /(vot\w*|ballot|gerrymand|suppression|election|democracy|powerthepolls|supreme court|scotus)/i],
    ['climate', /\b(climate|fossil|oil|gas|pipeline|environ\w*|warming)\b/i],
    ['lgbtq', /\b(trans|lgbtq\w*|queer|drag|gender)\b/i],
    ['race', /(racis\w*|white supremacy|black lives|\bblm\b|civil rights|anti-?racist)/i],
    ['foreign', /\b(gaza|palestin\w*|ukraine|war|military|imperialis\w*|empire|sudan|congo)\b/i],
    ['organizing', /(mutual aid|organiz\w*|solidarity|community|boycott|protest|fundrais\w*|\bubi\b)/i],
    ['media', /\b(meme|misinformation|disinformation|propaganda|podcast|comedy|satire|debunk\w*|news)\b/i],
    ['feminism', /(feminis\w*|patriarchy|misogyny|women'?s rights)/i]
  ];

  /* Do-not-touch slug (roster convention: excluded from roulette + view
     counts) — kept out of the auto-match pool. */
  var SKIP_SLUGS = ['jeanine-pirreaux-comedy'];

  var topicCache = {}; /* memo: slug/url -> topic array */

  function tagText(text) {
    var out = [];
    var t = String(text || '');
    if (!t) return out;
    for (var i = 0; i < TOPICS.length; i++) {
      try { if (TOPICS[i][1].test(t)) out.push(TOPICS[i][0]); } catch (e) {}
    }
    return out;
  }

  function creatorText(m) {
    var parts = [];
    try {
      if (m.content_focus) parts.push(m.content_focus);
      (m.offer || []).forEach(function (o) { parts.push(o); });
      (m.key_strengths || []).forEach(function (s) { parts.push(s); });
      if (m.bio) parts.push(m.bio);
    } catch (e) {}
    return parts.join(' ');
  }

  function topicsFor(m) {
    if (!m) return [];
    var key = 'c:' + (m.slug || m.name || '');
    if (topicCache[key]) return topicCache[key];
    var t = tagText(creatorText(m));
    topicCache[key] = t;
    return t;
  }

  function topicsForStory(s) {
    if (!s) return [];
    var key = 's:' + (s.url || s.title || '');
    if (topicCache[key]) return topicCache[key];
    var t = tagText(String(s.title || '') + ' ' + String(s.source || ''));
    topicCache[key] = t;
    return t;
  }

  function overlap(a, b) {
    var n = 0;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) !== -1) n++;
    }
    return n;
  }

  function eligible(m) {
    return !!(m && m.slug && m.catalog_path && SKIP_SLUGS.indexOf(m.slug) === -1);
  }

  /* Top-N creators for one story: shared-topic count desc, then
     propaganda_score desc. Empty when nothing shares a topic. */
  function creatorsForStory(story, members, n) {
    var out = [];
    try {
      var st = topicsForStory(story);
      if (!st.length || !members || !members.length) return out;
      var scored = [];
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        if (!eligible(m)) continue;
        var ov = overlap(st, topicsFor(m));
        if (ov > 0) scored.push({ m: m, ov: ov });
      }
      scored.sort(function (a, b) {
        if (b.ov !== a.ov) return b.ov - a.ov;
        return (Number(b.m.propaganda_score) || 0) - (Number(a.m.propaganda_score) || 0);
      });
      var lim = Math.max(1, Math.min(3, n || 3));
      for (var j = 0; j < scored.length && j < lim; j++) out.push(scored[j].m);
    } catch (e) {}
    return out;
  }

  /* Newest-first stories sharing at least one topic with the creator. */
  function storiesForCreator(member, stories, n) {
    var out = [];
    try {
      var ct = topicsFor(member);
      if (!ct.length || !stories || !stories.length) return out;
      var lim = Math.max(1, Math.min(4, n || 3));
      for (var i = 0; i < stories.length && out.length < lim; i++) {
        var s = stories[i];
        if (s && s.url && s.title && overlap(ct, topicsForStory(s)) > 0) out.push(s);
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- data: live pull with fallback ---------------- */
  var membersPromise_ = null;
  function membersPromise() {
    if (membersPromise_) return membersPromise_;
    membersPromise_ = new Promise(function (resolve) {
      try {
        if (window.PF && PF.slrReady && PF.slrReady.then) {
          PF.slrReady.then(function (ms) { resolve(Array.isArray(ms) ? ms : []); },
            function () { resolve([]); });
          return;
        }
        if (window.PF && PF.slrAll) { resolve(PF.slrAll() || []); return; }
      } catch (e) {}
      resolve([]);
    });
    return membersPromise_;
  }

  var NEWS_TIMEOUT = 10000;
  function storiesPromise(limit) {
    return new Promise(function (resolve) {
      var done = function (ss) { resolve(Array.isArray(ss) ? ss : []); };
      try {
        if (window.PF && PF.newsTop && PF.newsTop.get) {
          PF.newsTop.get(limit || 12).then(function (p) {
            done(p && p.stories ? p.stories : []);
          }, function () { done([]); });
          return;
        }
      } catch (e) {}
      /* Fallback: direct read of the news_top_get action. Fail-soft. */
      try {
        var base = window.PF_BACKEND_URL || '';
        if (!base) { done([]); return; }
        var url = base.replace(/\/$/, '') + '?action=news_top_get&limit=' + (limit || 12);
        var timer = setTimeout(function () { done([]); }, NEWS_TIMEOUT);
        fetch(url, { credentials: 'omit' }).then(function (r) {
          if (!r || !r.ok) throw 0;
          return r.json();
        }).then(function (j) {
          clearTimeout(timer);
          done(j && Array.isArray(j.stories) ? j.stories : []);
        }).catch(function () { clearTimeout(timer); done([]); });
      } catch (e2) { done([]); }
    });
  }

  /* ---------------- rendering ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Scheme allowlist (same rule as news-top.js): http(s) or nothing. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s;
    } catch (e) {}
    return '';
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
  function cssOnce() {
    if (document.getElementById('pf-ncm-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-ncm-css';
    st.textContent =
      '.pf-ncm{margin:8px 0 2px;padding:8px 10px;background:#120d0d;border:1px solid #3a1414;}' +
      '.pf-ncm-k{font-size:10px;letter-spacing:0.18em;color:#e5383b;font-weight:900;margin-bottom:6px;}' +
      '.pf-ncm-row{display:flex;gap:10px;align-items:center;margin:6px 0;}' +
      '.pf-ncm-row img{width:44px;height:44px;object-fit:cover;flex:0 0 auto;border:2px solid #c1121f;}' +
      '.pf-ncm-name{color:#f5f0e1;font-weight:800;font-size:0.85rem;text-decoration:none;}' +
      '.pf-ncm-name:hover{text-decoration:underline;}' +
      '.pf-ncm-sub{color:#b8ab8e;font-size:0.72rem;margin-top:2px;}' +
      '.pf-ncm-sub a{color:#e5383b;text-decoration:none;font-weight:700;}' +
      '.pf-ncm-stories{list-style:none;padding:0;margin:6px 0 0;}' +
      '.pf-ncm-stories li{margin:0 0 8px;}' +
      '.pf-ncm-stories a{color:#f5f0e1;text-decoration:none;font-size:0.9rem;line-height:1.4;}' +
      '.pf-ncm-stories a:hover{text-decoration:underline;}' +
      '.pf-ncm-meta{color:#8a7f68;font-size:0.72rem;margin-top:2px;}';
    document.head.appendChild(st);
  }

  /* One creator chip: photo, name (catalog link), platform link. */
  function creatorChip(m) {
    var name = esc(m.name || 'A Sick Left Radical');
    var cat = safeUrl(m.catalog_path || ('/' + (m.slug || ''))) || '#';
    var img = '';
    var pic = safeUrl(m.picture || '');
    if (pic) {
      img = '<img src="' + esc(pic) + '" alt="' + esc(m.image_alt || (m.name + ', SLR propagandist')) + '" loading="lazy">';
    }
    /* Platform link: first confirmed link, else primary handle text. */
    var plat = '';
    try {
      var links = m.links || [];
      var L = null;
      for (var i = 0; i < links.length; i++) {
        if (links[i] && links[i].url && (!links[i].status || links[i].status === 'confirmed')) { L = links[i]; break; }
      }
      if (!L && links.length) L = links[0];
      if (L && L.url) {
        var pu = safeUrl(L.url);
        if (pu) plat = '<a href="' + esc(pu) + '" target="_blank" rel="noopener">' + esc(L.platform || 'Profile') + ' &nearr;</a>';
      }
    } catch (e) {}
    if (!plat) {
      var h = (m.handles && (m.handles.primary || '')) || '';
      if (h) plat = '<span>' + esc(h) + '</span>';
    }
    var score = (m.propaganda_score != null) ? Number(m.propaganda_score).toFixed(1) + '/10' : '';
    return '<div class="pf-ncm-row">' + img +
      '<div style="min-width:0;"><a class="pf-ncm-name" href="' + esc(cat) + '">' + name + '</a>' +
      '<div class="pf-ncm-sub">' + (score ? esc(score) + ' &middot; ' : '') + plat + '</div></div></div>';
  }

  function creatorsHTML(picks) {
    var h = '<div class="pf-ncm"><div class="pf-ncm-k">CREATORS COVERING THIS</div>';
    for (var i = 0; i < picks.length; i++) h += creatorChip(picks[i]);
    return h + '</div>';
  }

  /* ---- news rail side: stories[i] <-> .pf-newstop-item[i] (mirrors the
     34-newsstats enhanceRail mapping). Slots mount only when matches exist;
     members resolve async so the rail never waits on the creator DB. ---- */
  var rails = []; /* {el, stories} — re-enhanced on pf-slr-live */
  function enhanceRail(el, stories) {
    try {
      if (!el || !Array.isArray(stories) || !stories.length) return;
      rails.push({ el: el, stories: stories });
      if (rails.length > 12) rails.shift();
      membersPromise().then(function (members) {
        if (!members || !members.length) return;
        try {
          var items = el.querySelectorAll ? el.querySelectorAll('.pf-newstop-item') : [];
          var n = Math.min(items.length, stories.length);
          for (var i = 0; i < n; i++) {
            (function (li, story) {
              try {
                if (li.querySelector && li.querySelector('.pf-ncm')) return; /* already wired */
                var picks = creatorsForStory(story, members, 3);
                if (!picks.length) return; /* no match = no section */
                cssOnce();
                var slot = document.createElement('div');
                slot.innerHTML = creatorsHTML(picks);
                li.appendChild(slot.firstChild);
              } catch (e) {}
            })(items[i], stories[i]);
          }
        } catch (e2) {}
      });
    } catch (e3) {}
  }

  function reEnhanceRails() {
    /* Drop old slots and re-run against the (possibly updated) DB. */
    try {
      membersPromise_ = null; /* force fresh member read */
      rails.forEach(function (r) {
        try {
          var olds = r.el.querySelectorAll ? r.el.querySelectorAll('.pf-ncm') : [];
          for (var i = olds.length - 1; i >= 0; i--) {
            if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]);
          }
        } catch (e) {}
      });
      var keep = rails.slice();
      rails = [];
      keep.forEach(function (r) { enhanceRail(r.el, r.stories); });
    } catch (e) {}
  }

  /* ---- catalog side: fill #pf-catalog-news for one member. ---- */
  function mountCreatorNews(el, member) {
    try {
      if (!el || !member) return;
      el.innerHTML = '';
      storiesPromise(12).then(function (stories) {
        try {
          var hits = storiesForCreator(member, stories, 3);
          if (!hits.length) return; /* fail-soft: no section */
          cssOnce();
          var h = '<div class="pf-ncm" style="margin:2rem 0 0.8rem;"><div class="pf-ncm-k">RECENTLY IN THE NEWS</div><ul class="pf-ncm-stories">';
          for (var i = 0; i < hits.length; i++) {
            var s = hits[i];
            var u = safeUrl(s.url) || '#';
            h += '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' +
              '<div class="pf-ncm-meta">' + esc(s.source || '') +
              (s.published_at ? ' &middot; ' + esc(timeAgo(s.published_at)) : '') + '</div></li>';
          }
          el.innerHTML = h + '</ul></div>';
        } catch (e) {}
      });
    } catch (e2) {}
  }

  /* Auto re-render on live DB updates (event-driven, no polling). */
  try {
    document.addEventListener('pf-slr-live', function () { reEnhanceRails(); });
  } catch (e) {}

  PF.newsCreatorMatch = {
    topicsFor: topicsFor,
    topicsForStory: topicsForStory,
    creatorsForStory: creatorsForStory,
    storiesForCreator: storiesForCreator,
    enhanceRail: enhanceRail,
    mountCreatorNews: mountCreatorNews,
    refresh: reEnhanceRails
  };
  try { PF.log && PF.log('news-creator-match', 'ready'); } catch (e) {}
})();
