/* core/32-search.js  |  PF v1.4.3 | ONE SEARCH ACROSS EVERYTHING (PLAY 8, CEO directive 2026-10-06 ~14:37 CDT).
   A unified pillar-aware command bar. The search trigger is the header's own
   magnifier button (#pf-topbar-search, rendered by the shell); tapping it
   (or "/" or Cmd+K) opens the command palette overlay with the search box.
   Esc closes.
   ONE INDEX, FOUR PILLARS: CPI/price items, creator roster (Sick Left
   Radicals), events, news items, product pages, data bounties + the page
   directory — searched client-side, results grouped by pillar
   (SPREAD / DATA / ACT / ORGANIZE), each result a deep link.
   Index built at runtime from existing READ endpoints (fail-open GETs, the
   same pattern as 30-hud.js's xp_today reads) plus the client-side SLR DB
   (PF.slrAll / PF.ROSTER) and the page directory below. Fail-open: if any
   source fails, that group is omitted silently — search still works on the
   rest (pages + products are static, always available).
   RESULTS = INTEL CARDS (brand pattern library P-2): black card, red top
   rule, white Arial-bold headline, one data line, one action (DEPLOY ->).
   Debounced input (150ms). Token AND-match, ranked by match quality.
   FRONTEND-ONLY, ZERO NEW XP — pure routing + reads. No writes of any kind:
   no backend writes, no XP minted or promised, no persistence at all
   (device-local only — nothing leaves the browser, nothing is stored).
   DATA never touches identity: reads are anonymous (credentials:'omit').
   Mount: header button #pf-topbar-search; palette overlay on document.body.
   Silent no-op when the HUD host is absent (same contract as 31-pillars.js).
   KILL: ?pf_off=search  or  localStorage pf_disabled_v1='["search"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('search')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;

  /* ---- pillars (mirrors 31-pillars.js order + labels) ---- */
  var PILLARS = [
    { key: 'spread', label: 'SPREAD', sub: 'PROPAGANDA' },
    { key: 'data', label: 'DATA', sub: 'PRICES' },
    { key: 'act', label: 'ACT', sub: 'SHOW UP' },
    { key: 'organize', label: 'ORGANIZE', sub: 'CELLS' }
  ];
  var PILLAR_LABEL = {};
  PILLARS.forEach(function (p) { PILLAR_LABEL[p.key] = p.label + ' / ' + p.sub; });

  /* ---- theme: CSS custom properties (--pf-s-*), defaulting to the --pf-hud-* set ---- */
  var CSS = [
    ':root{',
    '--pf-s-bg:var(--pf-hud-bg,rgba(8,8,8,.94));--pf-s-border:var(--pf-hud-border,#2a2a2a);',
    '--pf-s-accent:var(--pf-hud-accent,#c1121f);--pf-s-text:var(--pf-hud-text,#f5ead6);',
    '--pf-s-dim:var(--pf-hud-dim,#a89e88);--pf-s-gold:var(--pf-hud-gold,#e8b33c);}',
    /* fallback button (only when the shell predates the header button) */
    '#pf-search-fallback{position:fixed;right:14px;bottom:120px;z-index:9990;width:48px;height:48px;',
    'border-radius:50%;background:#101010;border:1px solid var(--pf-s-border);color:var(--pf-s-text);',
    'font-size:20px;cursor:pointer;}',
    /* command palette overlay */
    '#pf-search{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.72);',
    'display:flex;align-items:flex-start;justify-content:center;padding:12vh 14px 14px;',
    'box-sizing:border-box;font-family:Arial,sans-serif;}',
    '#pf-search[hidden]{display:none;}',
    '.pf-s-panel{width:100%;max-width:560px;max-height:76vh;display:flex;flex-direction:column;',
    'background:#0a0a0a;border:1px solid var(--pf-s-border);border-top:4px solid var(--pf-s-accent);}',
    '.pf-s-inputrow{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--pf-s-border);}',
    '.pf-s-glyph{color:var(--pf-s-accent);font-size:16px;font-weight:900;}',
    '#pf-search-input{flex:1 1 auto;background:none;border:none;outline:none;color:var(--pf-s-text);',
    'font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:.02em;}',
    '#pf-search-input::placeholder{color:var(--pf-s-dim);font-weight:400;}',
    '.pf-s-esc{color:var(--pf-s-dim);font-size:10px;font-weight:700;letter-spacing:.14em;border:1px solid var(--pf-s-border);',
    'border-radius:4px;padding:4px 7px;background:none;cursor:pointer;font-family:Arial,sans-serif;}',
    '.pf-s-results{overflow-y:auto;padding:10px 12px 14px;-webkit-overflow-scrolling:touch;}',
    '.pf-s-pgroup{margin:12px 0 4px;font-size:10px;font-weight:900;letter-spacing:.24em;color:var(--pf-s-accent);}',
    '.pf-s-pgroup:first-child{margin-top:2px;}',
    /* Intel Card (P-2): black card, red top rule, white headline, one data line, one action */
    '.pf-s-card{display:block;background:#0d0d0d;border:1px solid var(--pf-s-border);border-top:3px solid var(--pf-s-accent);',
    'border-radius:4px;padding:10px 12px;margin:8px 0;text-decoration:none;color:var(--pf-s-text);}',
    '.pf-s-card:active{transform:scale(.99);border-color:var(--pf-s-accent);}',
    '.pf-s-k{font-size:9px;font-weight:800;letter-spacing:.22em;color:var(--pf-s-accent);margin-bottom:4px;}',
    '.pf-s-h{font-family:Arial,sans-serif;font-size:15px;font-weight:900;color:#fff;line-height:1.3;margin-bottom:3px;}',
    '.pf-s-d{font-size:12px;color:var(--pf-s-dim);line-height:1.45;margin-bottom:6px;}',
    '.pf-s-a{font-size:11px;font-weight:900;letter-spacing:.16em;color:var(--pf-s-accent);}',
    '.pf-s-empty{text-align:center;padding:26px 12px;color:var(--pf-s-dim);font-size:13px;line-height:1.7;}',
    '.pf-s-empty b{color:var(--pf-s-text);}',
    '.pf-s-hint{text-align:center;padding:8px;font-size:10px;letter-spacing:.14em;color:var(--pf-s-dim);font-weight:700;',
    'border-top:1px solid var(--pf-s-border);}'
  ].join('');
  function injectCss() {
    if (document.getElementById('pf-search-css')) return;
    try {
      var st = document.createElement('style');
      st.id = 'pf-search-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    /* deep links: same-origin paths, or http(s) for external news stories */
    var s = String(u || '').trim();
    if (s.charAt(0) === '/') return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '/';
  }
  function fmtMoney(cents) {
    var c = Number(cents);
    if (!isFinite(c)) return '';
    return '$' + (c / 100).toFixed(2);
  }
  function fmtDate(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  /* ---- anonymous fail-open GET reads (xp_today-style; credentials omitted) ---- */
  function getJSON(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    var url = BACKEND + q;
    var ctl = null, timer = null, settled = false;
    function fin(j) { if (settled) return; settled = true; if (timer) clearTimeout(timer); done(j); }
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} fin(null); }, 10000);
      } else {
        timer = setTimeout(function () { fin(null); }, 10000);
      }
      fetch(url, { method: 'GET', credentials: 'omit', headers: { 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r || !r.ok) throw new Error('http'); return r.json(); })
        .then(function (j) { fin(j && j.ok === false ? null : j); })
        .catch(function () { jsonp(url, fin); });
    } catch (e) { jsonp(url, fin); }
  }
  function jsonp(url, fin) {
    /* JSONP fallback (same as 30-hud.js): still read-only, still fail-open */
    try {
      var fn = 'pfSearchCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function over(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e2) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        fin(j && j.ok === false ? null : j);
      }
      window[fn] = over;
      s.onerror = function () { over(null); };
      s.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { over(null); }, 10000);
    } catch (e) { fin(null); }
  }

  /* ---- DATA pillar landing (via 31-pillars.js registry when present) ---- */
  function dataUrl() {
    try {
      if (PF.pillars && typeof PF.pillars.destinations === 'function') {
        var ds = PF.pillars.destinations('data');
        if (ds && ds.length && ds[0].url) return ds[0].url;
      }
    } catch (e) {}
    return '/peoples-cpi';
  }

  /* ---- sources: {key, pillar, kicker, action, params, items(j)} ----
     Each item normalizes to {title, sub, url, ext, hay}. Any source that
     throws or returns junk yields [] — its group is omitted silently. */
  var SOURCES = [
    {
      key: 'prices', pillar: 'data', kicker: 'PRICE', action: 'price_board',
      params: { area_key: 'national' },
      items: function (j) {
        var out = [], arr = (j && j.items) || [];
        for (var i = 0; i < arr.length; i++) {
          var it = arr[i] || {};
          var name = String(it.name || it.item_id || '').trim();
          if (!name) continue;
          var price = it.enough_data ? fmtMoney(it.median_cents) + ' / ' + String(it.unit || '') : 'not enough reports yet';
          out.push({
            title: name.toUpperCase(),
            sub: price + " — people's CPI",
            url: dataUrl(),
            hay: name + ' ' + String(it.item_id || '') + ' price cpi inflation ' + String(it.unit || '')
          });
        }
        return out;
      }
    },
    {
      key: 'databounties', pillar: 'data', kicker: 'DATA BOUNTY', action: 'databounty_list',
      params: {},
      items: function (j) {
        var out = [], arr = (j && j.bounties) || [];
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i] || {};
          var t = String(b.title || b.target_key || '').trim();
          if (!t) continue;
          out.push({
            title: t.toUpperCase(),
            sub: '+' + String(b.xp_amount || 0) + ' XP · ' + String(b.kind || 'bounty') +
              (b.detail ? ' — ' + String(b.detail).slice(0, 90) : ''),
            url: dataUrl(),
            hay: t + ' ' + String(b.kind || '') + ' ' + String(b.target_key || '') + ' ' + String(b.detail || '') + ' bounty data'
          });
        }
        return out;
      }
    },
    {
      key: 'bounties', pillar: 'act', kicker: 'BOUNTY', action: 'bounty_list',
      params: {},
      items: function (j) {
        var out = [], arr = (j && j.bounties) || [];
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i] || {};
          var t = String(b.title || '').trim();
          if (!t) continue;
          out.push({
            title: t.toUpperCase(),
            sub: '+' + String(b.xp_reward || 0) + ' XP' +
              (b.platform ? ' · ' + String(b.platform) : '') +
              (b.detail ? ' — ' + String(b.detail).slice(0, 90) : ''),
            url: '/create',
            hay: t + ' ' + String(b.platform || '') + ' ' + String(b.detail || '') + ' bounty mission xp'
          });
        }
        return out;
      }
    },
    {
      key: 'events', pillar: 'act', kicker: 'EVENT', action: 'event_list',
      params: {},
      items: function (j) {
        var out = [], arr = (j && j.events) || [];
        for (var i = 0; i < arr.length; i++) {
          var e = arr[i] || {};
          var t = String(e.title || '').trim();
          if (!t) continue;
          var when = fmtDate(e.event_at);
          out.push({
            title: t.toUpperCase(),
            sub: (when ? when + ' · ' : '') + String(e.location || e.type || 'event') +
              (e.rsvp_count ? ' · ' + e.rsvp_count + ' going' : ''),
            url: '/events',
            hay: t + ' ' + String(e.type || '') + ' ' + String(e.location || '') + ' ' + String(e.description || '') + ' event rally protest'
          });
        }
        return out;
      }
    },
    {
      key: 'news', pillar: 'spread', kicker: 'NEWS', action: 'news_top_get',
      params: { limit: 25 },
      items: function (j) {
        var out = [], arr = (j && j.stories) || [];
        for (var i = 0; i < arr.length; i++) {
          var s = arr[i] || {};
          var t = String(s.title || '').trim();
          if (!t || !s.url) continue;
          out.push({
            title: t,
            sub: String(s.source || 'news') + (s.published_at ? ' · ' + fmtDate(s.published_at) : ''),
            url: String(s.url),
            ext: true,
            hay: t + ' ' + String(s.source || '') + ' news story'
          });
        }
        return out;
      }
    }
  ];

  /* ---- client-side creator roster (SLR DB ships in the core bundle on SLR
     pages; lazy-loads on demand elsewhere via PF.ensureSLRDB) ---- */
  function creators() {
    var out = [], arr = null;
    try {
      if (PF && typeof PF.slrAll === 'function') arr = PF.slrAll();
      else if (PF && PF.ROSTER && PF.ROSTER.length) arr = PF.ROSTER;
      else if (PF && PF.slrLegacy && PF.slrLegacy.length) arr = PF.slrLegacy;
    } catch (e) { arr = null; }
    arr = arr || [];
    for (var i = 0; i < arr.length; i++) {
      var m = arr[i] || {};
      var name = String(m.name || '').trim();
      if (!name) continue;
      var h = m.handles || {};
      var handle = String(h.primary || m.handle || '');
      var platform = String(m.primary_platform || m.platform || '');
      var score = (m.propaganda_score != null ? m.propaganda_score : m.score);
      out.push({
        title: name.toUpperCase(),
        sub: (platform ? platform + ' · ' : '') +
          String(m.followers_display || '') +
          (score != null && score !== '' ? ' · score ' + score : ''),
        url: String(m.catalog_path || ('/' + String(m.slug || ''))),
        hay: name + ' ' + String(m.slug || '') + ' ' + handle + ' ' + platform + ' ' +
          String(m.content_focus || '') + ' ' + String(m.seo_description || '') + ' creator roster slr'
      });
    }
    return out;
  }

  /* ---- static sources: always available, even with the backend down ---- */
  var PRODUCTS = [
    { title: 'WAR BOND — $5', sub: '$5 · fund the fight.', url: '/store' },
    { title: 'WAR BOND — $10', sub: '$10 · fund the fight.', url: '/store' },
    { title: 'WAR BOND — $25', sub: '$25 · fund the fight.', url: '/store' },
    { title: 'WAR BOND — $50', sub: '$50 · fund the fight.', url: '/store' }
  ].map(function (p) {
    return { pillar: 'spread', kicker: 'PRODUCT', title: p.title, sub: p.sub, url: p.url,
      hay: p.title + ' war bond product store buy fund fight ' + p.sub };
  });

  /* Page directory (mirrors pages/page-mount.js PAGE_ORDERS titles + the
     31-pillars.js pageKey URL map). Deep links into the existing nav —
     no new pages, no nav-ceiling breach. */
  var PAGES = [
    { url: '/', title: 'HOME — YOUR CAMPAIGN', sub: 'XP, rank, streak. Your next move.', pillar: 'spread', kw: 'home start campaign daily orders enlist' },
    { url: '/arcade', title: 'THE ARCADE', sub: 'Nine games. Zero mercy. Play them all.', pillar: 'act', kw: 'arcade games play fan vote call it prediction' },
    { url: '/cells', title: 'CELLS', sub: 'Your squad, your war. Build it, run it.', pillar: 'organize', kw: 'cells cell squad join recruit organize' },
    { url: '/create', title: 'CREATE', sub: 'The propaganda workshop. Make it. Ship it.', pillar: 'spread', kw: 'create workshop poster forge content bank bounty board' },
    { url: '/bank', title: "THE PEOPLE'S BANK", sub: 'Your XP, weaponized. Save it, move it.', pillar: 'organize', kw: 'bank xp save' },
    { url: '/economy', title: 'THE ECONOMY', sub: 'Spend XP like it matters.', pillar: 'data', kw: 'economy inflation checkin price report' },
    { url: '/peoples-cpi', title: "THE PEOPLE'S CPI", sub: 'The prices they hide, counted by us.', pillar: 'data', kw: 'peoples cpi prices inflation basket data bounty' },
    { url: '/war-chest', title: 'THE WAR CHEST', sub: 'Fund the fight. Watch every cent.', pillar: 'organize', kw: 'war chest fund' },
    { url: '/ventures', title: 'JOINT VENTURES', sub: 'Pool up. Back creators. Share the spoils.', pillar: 'organize', kw: 'ventures pool creators' },
    { url: '/events', title: 'BOOTS ON THE GROUND', sub: 'Digital is the rehearsal. The street is the show.', pillar: 'act', kw: 'events irl rsvp rally protest show up' },
    { url: '/war-report', title: 'WAR REPORT', sub: "The week in the war. Numbers, winners, what's next.", pillar: 'spread', kw: 'war report weekly recap' },
    { url: '/war-room', title: 'WAR ROOM', sub: 'Debate nights. Election night. History, live.', pillar: 'act', kw: 'war room live debate election' },
    { url: '/follow-the-money', title: 'FOLLOW THE MONEY', sub: 'Follow the money. See who funds the votes.', pillar: 'data', kw: 'money pac donors billionaires follow the money' },
    { url: '/sick-left-radicals', title: 'SICK LEFT RADICALS', sub: 'The creator roster. Find your fighters.', pillar: 'spread', kw: 'roster creators affiliates slr sick left radicals' },
    { url: '/academy', title: 'ACADEMY', sub: 'Basic training for agitators.', pillar: 'act', kw: 'academy training lessons graduate' },
    { url: '/political-hq', title: 'POLITICAL HQ', sub: 'The optimized hub. Voter tools.', pillar: 'act', kw: 'political hq voter pledge ballot' },
    { url: '/creator-onboard', title: 'JOIN THE SICK LEFT RADICALS', sub: 'Creator onboarding. Bring your audience.', pillar: 'spread', kw: 'onboard apply creator join roster' },
    { url: '/request-access', title: 'CREATOR HQ', sub: 'Request access. Members only.', pillar: 'organize', kw: 'creator hq access request members' }
  ].map(function (p) {
    return { pillar: p.pillar, kicker: 'PAGE', title: p.title, sub: p.sub, url: p.url,
      hay: p.title + ' ' + p.sub + ' ' + p.kw + ' page' };
  });

  /* ---- the index: built lazily on first open, rebuilt never (one page view,
     one index). Each source is isolated: one failure never poisons another. ---- */
  var INDEX = null, BUILDING = false, BUILD_QUEUED = [];
  var SOURCE_COUNTS = {};
  function buildIndex(cb) {
    if (INDEX) { if (cb) cb(INDEX); return; }
    if (BUILDING) { if (cb) BUILD_QUEUED.push(cb); return; }
    BUILDING = true;
    var items = [];
    function staticItems() {
      /* static sources first: search works even if the backend is down */
      var cr = creators();
      for (var i = 0; i < cr.length; i++) items.push(mk('spread', 'CREATOR', cr[i]));
      for (var j = 0; j < PRODUCTS.length; j++) items.push(PRODUCTS[j]);
      for (var k = 0; k < PAGES.length; k++) items.push(PAGES[k]);
    }
    function mk(pillar, kicker, it) {
      return { pillar: pillar, kicker: kicker, title: it.title, sub: it.sub,
        url: safeUrl(it.url), ext: !!it.ext, hay: String(it.hay || '').toLowerCase() };
    }
    staticItems();
    var pending = SOURCES.length;
    function one() {
      if (--pending > 0) return;
      INDEX = items;
      BUILDING = false;
      var qs = BUILD_QUEUED.splice(0);
      for (var i = 0; i < qs.length; i++) { try { qs[i](INDEX); } catch (e) {} }
      if (cb) { try { cb(INDEX); } catch (e2) {} }
    }
    SOURCES.forEach(function (src) {
      SOURCE_COUNTS[src.key] = 0;
      try {
        getJSON(src.action, src.params, function (j) {
          try {
            var list = src.items(j) || [];
            for (var i = 0; i < list.length; i++) items.push(mk(src.pillar, src.kicker, list[i]));
            SOURCE_COUNTS[src.key] = list.length;
          } catch (e) { /* one bad mapper never breaks the index */ }
          one();
        });
      } catch (e) { one(); }
    });
    /* SLR DB may arrive late (lazy snapshot): refresh creators when it does */
    try {
      if (PF && PF.slrReady && typeof PF.slrReady.then === 'function') {
        PF.slrReady.then(function () {
          try {
            var before = 0;
            if (INDEX) {
              var cr = creators();
              for (var i = 0; i < cr.length; i++) {
                var neu = mk('spread', 'CREATOR', cr[i]);
                var dup = false;
                for (var k = 0; k < INDEX.length; k++) {
                  if (INDEX[k].kicker === 'CREATOR' && INDEX[k].url === neu.url) { dup = true; break; }
                }
                if (!dup) { INDEX.push(neu); before++; }
              }
              SOURCE_COUNTS.creators = (SOURCE_COUNTS.creators || 0) + before;
            }
          } catch (e) {}
        });
      }
    } catch (e2) {}
  }

  /* ---- search: token AND-match over the haystack, ranked ---- */
  function scoreItem(tokens, it) {
    var score = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var ti = it.hay.indexOf(t);
      if (ti === -1) return -1; /* AND: every token must hit */
      score += 10;
      if (ti === 0 || it.hay.charAt(ti - 1) === ' ') score += 4; /* word start */
      var ttl = it.title.toLowerCase();
      if (ttl.indexOf(t) !== -1) score += 6; /* title hit */
      if (ttl.indexOf(t) === 0) score += 8; /* title prefix */
    }
    return score;
  }
  function search(q) {
    var out = { spread: [], data: [], act: [], organize: [] };
    if (!INDEX) return out;
    var tokens = String(q || '').toLowerCase().split(/[^a-z0-9$]+/).filter(function (t) { return t.length >= 2; });
    if (!tokens.length) return out;
    var scored = [];
    for (var i = 0; i < INDEX.length; i++) {
      var s = scoreItem(tokens, INDEX[i]);
      if (s > 0) scored.push({ it: INDEX[i], s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    var perPillar = {};
    for (var j = 0; j < scored.length; j++) {
      var p = scored[j].it.pillar;
      perPillar[p] = perPillar[p] || 0;
      if (perPillar[p] >= 5) continue; /* cap 5 per pillar */
      out[p].push(scored[j].it);
      perPillar[p]++;
    }
    return out;
  }

  /* ---- palette UI ---- */
  var panel = null, input = null, resultsEl = null, openState = false;
  var DEBOUNCE_MS = 150, debounceTimer = null;

  function cardHtml(it) {
    var ext = it.ext ? ' target="_blank" rel="noopener"' : '';
    return '<a class="pf-s-card" href="' + esc(safeUrl(it.url)||'#') + '"' + ext + '>' +
      '<div class="pf-s-k">' + esc(it.kicker) + '</div>' +
      '<div class="pf-s-h">' + esc(it.title) + '</div>' +
      '<div class="pf-s-d">' + esc(it.sub) + '</div>' +
      '<div class="pf-s-a">DEPLOY &rarr;</div></a>';
  }
  function render(q) {
    if (!resultsEl) return;
    var groups = search(q);
    var total = groups.spread.length + groups.data.length + groups.act.length + groups.organize.length;
    if (!total) {
      resultsEl.innerHTML = '<div class="pf-s-empty">' +
        '<b>NO INTEL ON THAT.</b><br>Try &ldquo;eggs&rdquo;, &ldquo;bounty&rdquo;, &ldquo;event&rdquo;, &ldquo;cell&rdquo; &mdash; or one word at a time.</div>';
      return;
    }
    var h = '';
    for (var i = 0; i < PILLARS.length; i++) {
      var p = PILLARS[i], list = groups[p.key];
      if (!list.length) continue;
      h += '<div class="pf-s-pgroup">' + esc(PILLAR_LABEL[p.key]) + '</div>';
      for (var j = 0; j < list.length; j++) h += cardHtml(list[j]);
    }
    resultsEl.innerHTML = h;
  }
  function ensurePanel() {
    if (panel) return true;
    try {
      if (!document.body) return false;
      injectCss();
      var wrap = document.createElement('div');
      wrap.innerHTML =
        '<div id="pf-search" role="dialog" aria-label="Search the war room" hidden>' +
        '<div class="pf-s-panel">' +
        '<div class="pf-s-inputrow"><span class="pf-s-glyph" aria-hidden="true">&#8981;</span>' +
        '<input id="pf-search-input" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
        'placeholder="Search prices, creators, events, news, bounties&hellip;" aria-label="Search">' +
        '<button type="button" class="pf-s-esc" data-pf-search-esc="1" aria-label="Close">ESC</button></div>' +
        '<div class="pf-s-results" id="pf-search-results"></div>' +
        '<div class="pf-s-hint">/ OR &#8984;K TO SEARCH &middot; ESC TO CLOSE</div>' +
        '</div></div>';
      var el = wrap.firstChild;
      if (!el) return false;
      document.body.appendChild(el);
      panel = el;
      input = document.getElementById('pf-search-input');
      resultsEl = document.getElementById('pf-search-results');
      panel.addEventListener('click', function (ev) {
        if (ev.target === panel) close();
      });
      var escBtn = panel.querySelector('[data-pf-search-esc]');
      if (escBtn) escBtn.addEventListener('click', function () { close(); });
      if (input) {
        input.addEventListener('input', function () {
          if (debounceTimer) clearTimeout(debounceTimer);
          var v = input.value;
          debounceTimer = setTimeout(function () { render(v); }, DEBOUNCE_MS);
        });
        input.addEventListener('keydown', function (ev) {
          if (ev.key === 'Escape') { ev.stopPropagation(); close(); }
        });
      }
      return true;
    } catch (e) { return false; }
  }
  function open() {
    if (!ensurePanel()) return false;
    buildIndex(function () { render(input ? input.value : ''); });
    panel.removeAttribute('hidden');
    openState = true;
    try {
      if (input) { input.focus({ preventScroll: true }); }
    } catch (e) { try { input.focus(); } catch (e2) {} }
    return true;
  }
  function close() {
    openState = false;
    try { if (panel) panel.setAttribute('hidden', ''); } catch (e) {}
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  }
  function isOpen() { return openState; }

  /* ---- keyboard: "/" or Cmd+K opens/focuses, Esc closes ---- */
  function typingTarget(el) {
    try {
      if (!el || !el.tagName) return false;
      var t = el.tagName.toUpperCase();
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return true;
      if (el.isContentEditable) return true;
    } catch (e) {}
    return false;
  }
  function onKey(ev) {
    try {
      if (ev.key === 'Escape') {
        if (isOpen()) { ev.stopPropagation(); close(); }
        return;
      }
      var cmdK = (ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K');
      var slash = ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey;
      if (!cmdK && !slash) return;
      if (typingTarget(ev.target)) {
        /* already typing: only Cmd+K hijacks (focuses search); bare "/" types */
        if (!cmdK) return;
      }
      ev.preventDefault();
      if (isOpen()) { if (input) input.focus(); }
      else open();
    } catch (e) {}
  }

  /* ---- mount the trigger: the header's own search button ----
     HEADER REDESIGN (2026-10-08): one magnifying-glass button in the sticky
     header (#pf-topbar-search, rendered by the shell). No more SEARCH pill
     in a second bar. Falls back to a floating button on pages whose shell
     predates the header (defensive; all v2 shells ship the button). */
  function mountHeaderBtn() {
    try {
      var b = document.getElementById('pf-topbar-search');
      if (!b) return false;
      if (b.dataset.pfSearchWired) return true;
      b.dataset.pfSearchWired = '1';
      b.addEventListener('click', function (ev) {
        try { ev.stopPropagation(); } catch (e) {}
        if (isOpen()) close(); else open();
      });
      return true;
    } catch (e) { return false; }
  }
  function mountFallbackBtn() {
    try {
      if (document.getElementById('pf-search-fallback')) return true;
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'pf-search-fallback';
      b.setAttribute('aria-label', 'Search the site');
      b.innerHTML = '&#8981;';
      b.addEventListener('click', function () { if (isOpen()) close(); else open(); });
      document.body.appendChild(b);
      return true;
    } catch (e) { return false; }
  }
  function boot() {
    injectCss();
    if (mountHeaderBtn()) { wireKeys(); return; }
    var done = false, tries = 0;
    function found() {
      if (done) return; done = true;
      try { obs.disconnect(); } catch (e) {}
      if (mountHeaderBtn()) { wireKeys(); return; }
      mountFallbackBtn(); wireKeys();
    }
    var obs = null;
    try {
      obs = new MutationObserver(function () {
        try { if (document.getElementById('pf-topbar-search')) found(); } catch (e) {}
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    var iv = setInterval(function () {
      tries++;
      var b = null;
      try { b = document.getElementById('pf-topbar-search'); } catch (e) {}
      if (b) { try { clearInterval(iv); } catch (e2) {} found(); return; }
      if (tries > 45) { /* ~90s hard stop: fallback button, silent */
        try { clearInterval(iv); } catch (e3) {}
        try { if (obs) obs.disconnect(); } catch (e4) {}
        if (!done) { done = true; mountFallbackBtn(); wireKeys(); }
      }
    }, 2000);
  }
  var keysWired = false;
  function wireKeys() {
    if (keysWired) return;
    keysWired = true;
    try { document.addEventListener('keydown', onKey, true); } catch (e) {}
  }

  /* public API (debug + verify hooks; read-only) */
  try {
    PF.search = {
      open: open,
      close: close,
      isOpen: isOpen,
      search: search,
      buildIndex: buildIndex,
      sources: SOURCES.map(function (s) { return { key: s.key, pillar: s.pillar, action: s.action }; }),
      counts: function () { return JSON.parse(JSON.stringify(SOURCE_COUNTS)); },
      pillars: PILLARS.map(function (p) { return p.key; })
    };
  } catch (e) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
