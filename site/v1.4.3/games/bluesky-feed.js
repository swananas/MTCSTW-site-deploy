/* games/bluesky-feed.js  |  PF v1.4.3 | BLUESKY EMBEDS (Component 2).
   Renders Bluesky content natively in house styling — no Bluesky chrome.
   Fetches hydrated views from the public AppView (https://public.api.bsky.app,
   no auth, no secrets, public data only):
     - app.bsky.feed.getFeed      — the SLR generator feed (Component 1)
     - app.bsky.feed.getAuthorFeed — the hub account's recent posts
     - app.bsky.feed.getPosts     — hand-picked post AT-URIs (optional strip)
     - app.bsky.actor.getProfile  — the hub account's profile banner
   Surfaces: homepage PROOF closer ("THE WIRE") + the reusable renderer
   PF.bluesky.renderCard / PF.bluesky.renderPosts, usable anywhere on the site.
   ==========================================================================
   >>> CONFIG SWAP (one line) <<<
   Hub account (VERIFIED LIVE 2026-10-05): @mtcstw.com
   (https://bsky.app/profile/mtcstw.com), DID did:plc:csmzqyzncudpfjyrvr7r7ate.
   The generator record is NOT published yet (Pod 1). The DID below is real;
   the rkey 'sick-left-radicals' is our assumption — if Pod 1 publishes under
   a different rkey, swap that one token on this line:
     var BLUESKY_FEED_URI = 'at://did:plc:csmzqyzncudpfjyrvr7r7ate/app.bsky.feed.generator/sick-left-radicals';
   Until the record exists, getFeed 400s and the feed leg is skipped silently
   (the live hub leg carries the section). If Pod 1 publishes exactly this
   URI, the feed leg lights up with zero code changes.
   BLUESKY_HANDPICKS (array of at:// post URIs) renders a "HAND-PICKED
   STRIKES" strip; empty = skipped.
   ==========================================================================
   FAIL-SOFT: the section is removed from the DOM only if EVERY source fails
   (profile + hub posts + feed + handpicks). One live source is enough. 12s
   per-request timeout. Session-cached 10 min to keep the AppView happy.
   KILL: ?pf_off=bluesky-feed  or  localStorage pf_disabled_v1='["bluesky-feed"]'
   NO XP: this module never dispatches pf-xp and never touches the XP legs
   (Economy Desk rule: no new XP mechanics without a CEO decision).
   Copy standard: combative, never "donate". */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('bluesky-feed')) { return; }
  if (window.pfBlueskyDone) return;
  window.pfBlueskyDone = true;

  /* ================= CONFIG (the one-line swap) ================= */
  var BLUESKY_HUB_DID = 'did:plc:csmzqyzncudpfjyrvr7r7ate';
  var BLUESKY_HUB_HANDLE = 'mtcstw.com';
  var BLUESKY_HUB_URL = 'https://bsky.app/profile/mtcstw.com';
  var BLUESKY_FEED_URI = 'at://did:plc:csmzqyzncudpfjyrvr7r7ate/app.bsky.feed.generator/sick-left-radicals';
  var BLUESKY_HANDPICKS = []; /* e.g. ['at://did:plc:xyz/app.bsky.feed.post/abc'] */
  var APPVIEW = 'https://public.api.bsky.app';
  var HUB_LIMIT = 6, FEED_LIMIT = 8;
  var FETCH_TIMEOUT_MS = 12000;
  var CACHE_MS = 10 * 60 * 1000;

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function okURL(u) {
    var s = String(u == null ? '' : u).trim();
    return /^(https?:)\/\//i.test(s) ? s : '';
  }
  function num(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function relTime(iso) {
    var t = 0;
    try { t = new Date(iso).getTime(); } catch (e) {}
    if (!t) return '';
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd';
    return Math.floor(s / (86400 * 7)) + 'w';
  }
  function postLink(pv) {
    /* at://did:plc:x/app.bsky.feed.post/<rkey> → https://bsky.app/profile/<handle|did>/post/<rkey> */
    var uri = String((pv && pv.uri) || ''), m = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/);
    if (!m) return '';
    var handle = String(((pv || {}).author || {}).handle || '') || m[1];
    return 'https://bsky.app/profile/' + encodeURIComponent(handle) + '/post/' + encodeURIComponent(m[2]);
  }

  /* Facet-aware linkification. Facet indexes are UTF-8 byte offsets into the
     post text — slice on true byte boundaries (code-point walk) so multi-byte
     chars (emoji) stay intact. Unknown/unsupported features degrade to plain
     text. */
  function renderRichText(text, facets) {
    text = String(text == null ? '' : text);
    var enc = new TextEncoder();
    var chars = [], lens = [], _ci = 0;
    while (_ci < text.length) {
      var _cp = text.codePointAt(_ci), _ch = String.fromCodePoint(_cp);
      chars.push(_ch);
      try { lens.push(enc.encode(_ch).length); } catch (e) { lens.push(1); }
      _ci += _cp > 0xFFFF ? 2 : 1;
    }
    function byteSlice(start, end) {
      var b = 0, i = 0, s = '';
      while (i < chars.length && b + lens[i] <= start) { b += lens[i]; i++; }
      while (i < chars.length && b < end) { b += lens[i]; s += chars[i]; i++; }
      return s;
    }
    var fs = (facets || []).filter(function (f) {
      return f && f.index && typeof f.index.byteStart === 'number' && typeof f.index.byteEnd === 'number';
    }).sort(function (a, b) { return a.index.byteStart - b.index.byteStart; });
    var out = '', cur = 0;
    fs.forEach(function (f) {
      var bs = f.index.byteStart, be = f.index.byteEnd;
      if (bs < cur || be <= bs) return;
      out += esc(byteSlice(cur, bs));
      var chunk = byteSlice(bs, be);
      var feat = (f.features || []).filter(function (x) {
        return x && /^\$?app\.bsky\.richtext\.facet/i.test(String(x.$type || ''));
      })[0];
      var t = feat ? String(feat.$type || '') : '', link = '';
      if (/\/link$|#link$|\.link$/i.test(t) && okURL(feat.uri)) {
        link = feat.uri;
      } else if (/mention$/i.test(t) && feat.did) {
        link = 'https://bsky.app/profile/' + encodeURIComponent(String(feat.did));
      } else if (/tag$/i.test(t) && feat.tag) {
        link = 'https://bsky.app/hashtag/' + encodeURIComponent(String(feat.tag));
      }
      out += link
        ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" style="color:' + RED + ';font-weight:700;">' + esc(chunk) + '</a>'
        : esc(chunk);
      cur = be;
    });
    out += esc(byteSlice(cur, 1e9));
    return out.replace(/\n/g, '<br>');
  }

  function avatarHTML(author, size) {
    var av = okURL(author && author.avatar);
    var name = esc((author && author.displayName) || (author && author.handle) || '?');
    if (av) return '<img src="' + esc(av) + '" alt="' + name + '" loading="lazy" referrerpolicy="no-referrer" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid ' + RED + ';display:block;">';
    var init = String(name.replace(/&[^;]+;/g, '')).replace(/&/g, '').charAt(0).toUpperCase() || '?';
    return '<span style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#1a1a1a;border:2px solid ' + RED + ';display:inline-flex;align-items:center;justify-content:center;color:' + RED + ';font-weight:900;font-size:' + Math.round(size * 0.4) + 'px;flex:none;">' + esc(init) + '</span>';
  }

  function embedHTML(pv) {
    var e = (pv && pv.embed) || null;
    if (!e) return '';
    var t = String(e.$type || '');
    var h = '';
    if (/embed\.images#view/i.test(t) && e.images && e.images.length) {
      var imgs = e.images.slice(0, 4);
      h += '<div style="display:grid;grid-template-columns:repeat(' + (imgs.length > 1 ? 2 : 1) + ',1fr);gap:6px;margin-top:0.7rem;">';
      imgs.forEach(function (im) {
        var src = okURL(im && im.thumb) || okURL(im && im.fullsize);
        if (!src) return;
        h += '<img src="' + esc(src) + '" alt="' + esc((im && im.alt) || 'Bluesky image') + '" loading="lazy" referrerpolicy="no-referrer" style="width:100%;max-height:300px;object-fit:cover;display:block;border:1px solid #2a2a2a;border-radius:4px;">';
      });
      h += '</div>';
    } else if (/embed\.external#view/i.test(t) && e.external) {
      var x = e.external, xurl = okURL(x.uri);
      var xthumb = okURL(x.thumb);
      h += '<div style="margin-top:0.7rem;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;">';
      if (xthumb) h += '<img src="' + esc(xthumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;max-height:200px;object-fit:cover;display:block;">';
      h += '<div style="padding:0.6rem 0.8rem;">'
        + (x.title ? '<div style="font-weight:800;font-size:0.85rem;color:' + CREAM + ';">' + esc(x.title) + '</div>' : '')
        + (x.description ? '<div style="font-size:0.78rem;color:' + MUTED + ';margin-top:0.25rem;">' + esc(String(x.description).slice(0, 160)) + '</div>' : '')
        + (xurl ? '<div style="font-size:0.72rem;color:' + RED + ';margin-top:0.3rem;">' + esc(String(x.uri).replace(/^https?:\/\//, '').slice(0, 60)) + '</div>' : '')
        + '</div></div>';
    } else if (/embed\.record#view/i.test(t) && e.record) {
      var r = e.record, rt = String(r.$type || '');
      if (/viewRecord/i.test(rt) && r.author) {
        var rn = esc(String(r.author.displayName || r.author.handle || ''));
        var rh = esc(String(r.author.handle || ''));
        var rtxt = r.value && r.value.text ? String(r.value.text).slice(0, 220) : '';
        h += '<div style="margin-top:0.7rem;border:1px solid #2a2a2a;border-radius:4px;padding:0.6rem 0.8rem;background:#101010;">'
          + '<div style="font-size:0.78rem;font-weight:800;color:' + CREAM + ';">' + rn + ' <span style="color:' + MUTED + ';font-weight:400;">@' + rh + '</span></div>'
          + (rtxt ? '<div style="font-size:0.8rem;color:' + MUTED + ';margin-top:0.3rem;">' + esc(rtxt) + (rtxt.length >= 220 ? '&hellip;' : '') + '</div>' : '')
          + '</div>';
      } else if (/viewNotFound|viewBlocked|viewDetached/i.test(rt)) {
        h += '<div style="margin-top:0.7rem;font-size:0.78rem;color:' + MUTED + ';font-style:italic;">Quoted post unavailable.</div>';
      }
    } else if (/embed\.recordWithMedia#view/i.test(t) && e.media) {
      h += embedHTML({ embed: e.media });
      h += embedHTML({ embed: { $type: 'app.bsky.embed.record#view', record: e.record } });
    }
    return h;
  }

  /* The reusable post-card renderer. pv = a hydrated postView from the
     AppView (app.bsky.feed.getFeed / getAuthorFeed / getPosts). Pure function —
     never throws on malformed input (returns '' instead). */
  function renderCard(pv) {
    try {
      if (!pv || (!pv.post && !pv.uri)) return '';
      var post = pv.post || pv;
      var author = post.author || {};
      var rec = post.record || {};
      var reason = pv.reason && String(pv.reason.$type || '');
      var byline = '';
      if (/reasonRepost/i.test(reason) && pv.reason.by) {
        var rb = pv.reason.by;
        byline = '<div style="font-size:0.72rem;color:' + MUTED + ';margin-bottom:0.4rem;letter-spacing:0.06em;">&#8646; REPOSTED BY <b style="color:' + CREAM + ';">@' + esc(String(rb.handle || rb.displayName || '')) + '</b></div>';
      }
      var dname = esc(String(author.displayName || author.handle || 'unknown'));
      var handle = esc(String(author.handle || ''));
      var t = relTime(post.indexedAt || rec.createdAt);
      var txt = renderRichText(rec.text, rec.facets);
      var link = postLink(post);
      var stats = '<div style="display:flex;gap:1.1rem;margin-top:0.7rem;font-size:0.78rem;color:' + MUTED + ';">'
        + '<span>&#128172; ' + num(post.replyCount) + '</span>'
        + '<span>&#8646; ' + num(post.repostCount) + '</span>'
        + '<span>&hearts; ' + num(post.likeCount) + '</span>'
        + (post.quoteCount ? '<span>&ldquo; ' + num(post.quoteCount) + '</span>' : '')
        + (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" style="margin-left:auto;color:' + RED + ';font-weight:800;letter-spacing:0.08em;">VIEW &rarr;</a>' : '')
        + '</div>';
      return '<article class="pf-bsky-card" style="background:' + BLACK + ';border:2px solid #2a2a2a;border-left:4px solid ' + RED + ';color:' + CREAM + ';padding:1rem 1.1rem;border-radius:4px;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
        + byline
        + '<div style="display:flex;gap:0.8rem;align-items:center;">' + avatarHTML(author, 44)
        + '<div style="min-width:0;"><div style="font-weight:900;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + dname + '</div>'
        + '<div style="font-size:0.78rem;color:' + MUTED + ';">@' + handle + (t ? ' &middot; ' + esc(t) : '') + '</div></div></div>'
        + '<div style="margin-top:0.7rem;font-size:0.92rem;line-height:1.5;overflow-wrap:anywhere;">' + (txt || '') + '</div>'
        + embedHTML(post)
        + stats + '</article>';
    } catch (e) { return ''; }
  }

  /* The hub profile banner renderer. p = a hydrated profileView. Pure. */
  function renderProfile(p) {
    try {
      if (!p || !p.did) return '';
      var url = okURL(BLUESKY_HUB_URL);
      var html = '<div class="pf-bsky-profile" style="display:flex;gap:1rem;align-items:center;text-align:left;margin:1.2rem auto 0;max-width:640px;background:#101010;border:2px solid #2a2a2a;border-radius:4px;padding:1rem 1.2rem;">'
        + avatarHTML(p, 56)
        + '<div style="min-width:0;flex:1;">'
        + '<div style="font-weight:900;font-size:1.05rem;color:' + CREAM + ';">' + esc(String(p.displayName || p.handle || '')) + '</div>'
        + '<div style="font-size:0.8rem;color:' + MUTED + ';">@' + esc(String(p.handle || '')) + ' &middot; ' + num(p.followersCount) + ' followers</div>'
        + (p.description ? '<div style="font-size:0.8rem;color:' + MUTED + ';margin-top:0.3rem;line-height:1.4;">' + esc(String(p.description).slice(0, 180)) + '</div>' : '')
        + '</div>'
        + (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" style="flex:none;background:' + RED + ';color:' + CREAM + ';font-weight:900;letter-spacing:0.1em;font-size:0.78rem;padding:0.6rem 1.1rem;text-decoration:none;border:2px solid ' + RED + ';">FOLLOW</a>' : '')
        + '</div>';
      return html;
    } catch (e) { return ''; }
  }

  /* Render an array of AT-URIs (app.bsky.feed.getPosts) into container.
     Fail-soft: resolves never-rejecting. */
  function renderPosts(container, uris) {
    uris = (uris || []).filter(function (u) { return /^at:\/\//.test(String(u)); });
    if (!container || !uris.length) return Promise.resolve(0);
    var url = APPVIEW + '/xrpc/app.bsky.feed.getPosts?uris=' + uris.slice(0, 10).map(encodeURIComponent).join('&uris=');
    return fetchJSON(url).then(function (j) {
      var posts = (j && j.posts) || [];
      var html = posts.map(renderCard).filter(Boolean).join('');
      if (html) container.innerHTML = html;
      return posts.length;
    }).catch(function () { return 0; });
  }

  function fetchJSON(url) {
    var ctrl = null, timer = null;
    try {
      ctrl = new AbortController();
      timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);
    } catch (e) {}
    var p = (window.fetch ? fetch(url, ctrl ? { signal: ctrl.signal } : {}) : Promise.reject(new Error('no fetch')))
      .then(function (r) { if (!r || !r.ok) throw new Error('bad ' + (r && r.status)); return r.json(); });
    return p.then(function (j) { if (timer) clearTimeout(timer); return j; },
      function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function cacheGet(k) {
    try {
      var raw = sessionStorage.getItem(k);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (Date.now() - o.ts) > CACHE_MS) return null;
      return o.data;
    } catch (e) { return null; }
  }
  function cacheSet(k, data) {
    try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
  }

  /* Expose the reusable renderer + config for other surfaces. */
  PF.bluesky = {
    renderCard: renderCard,
    renderPosts: renderPosts,
    renderProfile: renderProfile,
    config: {
      feedUri: BLUESKY_FEED_URI, handpicks: BLUESKY_HANDPICKS, appview: APPVIEW,
      hubDid: BLUESKY_HUB_DID, hubHandle: BLUESKY_HUB_HANDLE, hubUrl: BLUESKY_HUB_URL
    }
  };

  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bsky">
<div class="fe-block pf-override-block">
<style>
#pf-bsky-feed .pf-bsky-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;margin-top:1rem;}
#pf-bsky-feed .pf-bsky-sec-label{font-size:0.78rem;letter-spacing:0.22em;color:#b8ab8e;margin:1.6rem 0 0;font-weight:800;}
#pf-bsky-feed .pf-bsky-cta{display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.12em;padding:0.7rem 1.6rem;margin-top:1.4rem;text-decoration:none;font-size:0.85rem;border:2px solid #c1121f;}
#pf-bsky-feed .pf-bsky-cta:hover{background:#f5f0e1;color:#c1121f;}
</style>
<div id="pf-bsky-feed" style="max-width:1100px;margin:2.5rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:2rem 1.5rem;box-sizing:border-box;text-align:center;">
  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; THE WIRE &#9733;</div>
  <div style="font-size:1.1rem;font-weight:800;letter-spacing:0.06em;margin-top:0.4rem;">THE NETWORK TALKS.</div>
  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.7rem auto 0;max-width:620px;line-height:1.5;">Live fire from the Bluesky front &mdash; straight from the hub, and soon from the Sick Left Radicals' own feed. When the network moves, you see it here first.</div>
  <div id="pf-bsky-profile"></div>
  <div class="pf-bsky-sec-label" id="pf-bsky-hub-label" style="display:none;">FROM THE HUB &mdash; @MTCSTW.COM</div>
  <div class="pf-bsky-grid" id="pf-bsky-hub" style="display:none;"></div>
  <div class="pf-bsky-sec-label" id="pf-bsky-feed-label" style="display:none;">THE SLR FEED &mdash; ROSTER FIRE</div>
  <div class="pf-bsky-grid" id="pf-bsky-grid" style="display:none;"></div>
  <div class="pf-bsky-sec-label" id="pf-bsky-hp-label" style="display:none;">HAND-PICKED STRIKES</div>
  <div class="pf-bsky-grid" id="pf-bsky-handpicks" style="display:none;"></div>
  <div><a class="pf-bsky-cta" href="https://bsky.app/profile/mtcstw.com" target="_blank" rel="noopener noreferrer">JOIN THE FIGHT. &rarr; FOLLOW @MTCSTW.COM</a></div>
  <div style="font-size:0.75rem;color:#b8ab8e;margin-top:0.8rem;">Fresh posts load live from Bluesky. No account needed to read.</div>
</div>
</div>
<script>
(function(){
  var ROOT_ID = 'pf-bsky-feed';
  var APPVIEW = 'https://public.api.bsky.app';
  var HUB_DID = (window.PF && PF.bluesky && PF.bluesky.config.hubDid) || '';
  var FEED_URI = (window.PF && PF.bluesky && PF.bluesky.config.feedUri) || '';
  var HANDPICKS = (window.PF && PF.bluesky && PF.bluesky.config.handpicks) || [];
  function kill(){ var r = document.getElementById(ROOT_ID); if (r) { var b = r.closest ? r.closest('.fe-block') : null; (b || r).remove(); } }
  function fetchJSON(url){
    var ctrl = null, timer = null;
    try { ctrl = new AbortController(); timer = setTimeout(function(){ try{ ctrl.abort(); }catch(e){} }, 12000); } catch(e){}
    var p = (window.fetch ? fetch(url, ctrl ? { signal: ctrl.signal } : {}) : Promise.reject(new Error('no fetch')))
      .then(function(r){ if(!r || !r.ok) throw new Error('bad ' + (r && r.status)); return r.json(); });
    return p.then(function(j){ if(timer) clearTimeout(timer); return j; }, function(e){ if(timer) clearTimeout(timer); throw e; });
  }
  function cacheGet(k){ try{ var raw = sessionStorage.getItem(k); if(!raw) return null; var o = JSON.parse(raw); if(!o || (Date.now()-o.ts) > 600000) return null; return o.data; }catch(e){ return null; } }
  function cacheSet(k,d){ try{ sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), data: d })); }catch(e){} }
  function show(el, label){ if(el){ el.style.display = ''; } if(label){ label.style.display = ''; } }
  var root = document.getElementById(ROOT_ID);
  if(!root || !(window.PF && PF.bluesky)){ kill(); return; }
  var B = PF.bluesky;
  var profEl = document.getElementById('pf-bsky-profile');
  var hubEl = document.getElementById('pf-bsky-hub'), hubL = document.getElementById('pf-bsky-hub-label');
  var feedEl = document.getElementById('pf-bsky-grid'), feedL = document.getElementById('pf-bsky-feed-label');
  var hpEl = document.getElementById('pf-bsky-handpicks'), hpL = document.getElementById('pf-bsky-hp-label');
  var alive = 0;

  /* 1. hub profile banner (getProfile). */
  var pProf = Promise.resolve(false);
  if(HUB_DID && profEl){
    var pk = 'pf_bsky_profile_v1';
    var cached = cacheGet(pk);
    var paintProf = function(p){ var h = B.renderProfile(p); if(h){ profEl.innerHTML = h; return true; } return false; };
    if(cached){ alive += paintProf(cached) ? 1 : 0; }
    else { pProf = fetchJSON(APPVIEW + '/xrpc/app.bsky.actor.getProfile?actor=' + encodeURIComponent(HUB_DID))
      .then(function(j){ cacheSet(pk, j); if(paintProf(j)) alive++; return true; }).catch(function(){ return false; }); }
  }

  /* 2. hub recent posts (getAuthorFeed, no replies). */
  var pHub = Promise.resolve(false);
  if(HUB_DID && hubEl){
    var hk = 'pf_bsky_hub_v1';
    var hdata = cacheGet(hk);
    var paintHub = function(j){
      var items = (j && j.feed) || [];
      var cards = items.slice(0, 6).map(function(it){ return B.renderCard(it); }).filter(Boolean).join('');
      if(cards){ hubEl.innerHTML = cards; show(hubEl, hubL); return true; }
      return false;
    };
    if(hdata){ if(paintHub(hdata)) alive++; }
    else { pHub = fetchJSON(APPVIEW + '/xrpc/app.bsky.feed.getAuthorFeed?actor=' + encodeURIComponent(HUB_DID) + '&filter=posts_no_replies&limit=6')
      .then(function(j){ cacheSet(hk, j); if(paintHub(j)) alive++; return true; }).catch(function(){ return false; }); }
  }

  /* 3. SLR generator feed (getFeed) — record may not exist yet; skip silently. */
  var pFeed = Promise.resolve(false);
  if(FEED_URI && feedEl){
    var fk = 'pf_bsky_feed_v1:' + FEED_URI;
    var fdata = cacheGet(fk);
    var paintFeed = function(j){
      var items = (j && j.feed) || [];
      var cards = items.slice(0, 8).map(function(it){ return B.renderCard(it); }).filter(Boolean).join('');
      if(cards){ feedEl.innerHTML = cards; show(feedEl, feedL); return true; }
      return false;
    };
    if(fdata){ if(paintFeed(fdata)) alive++; }
    else { pFeed = fetchJSON(APPVIEW + '/xrpc/app.bsky.feed.getFeed?feed=' + encodeURIComponent(FEED_URI) + '&limit=8')
      .then(function(j){ cacheSet(fk, j); if(paintFeed(j)) alive++; return true; }).catch(function(){ return false; }); }
  }

  /* 4. hand-picked posts (getPosts). */
  var pHp = Promise.resolve(false);
  if(HANDPICKS.length && hpEl){
    var picks = HANDPICKS.filter(function(u){ return /^at:\\/\\//.test(String(u)); }).slice(0, 6);
    if(picks.length){ pHp = B.renderPosts(hpEl, picks).then(function(n){ if(n > 0){ show(hpEl, hpL); alive++; } return n > 0; }).catch(function(){ return false; }); }
  }

  /* Fail-soft: the section survives on ANY live source; dies only if all fail. */
  Promise.all([pProf, pHub, pFeed, pHp]).then(function(){ if(alive === 0){ kill(); } });
})();
<\/script>
</template>`);
})();
