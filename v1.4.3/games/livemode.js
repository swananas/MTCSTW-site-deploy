/* games/livemode.js  |  PF v1.4.3 | LIVE EVENT MODE (PLAY 9).
   CEO directive 2026-10-06: a fused live surface for high-moment events
   (election night, vote closes, prediction resolution, cell war finals).
   One mount (#pf-live, or the /war-room PAGE_ORDERS slot) composing
   EXISTING modules' public GET rails into a single live view — composed,
   never rebuilt:
     - live market board ..... market_list JSONP read (the markets.js rail)
     - open calls ............. predict_qlist JSONP read (the predgame.js rail)
     - related news + stats ... PF.newsTop when staged, else news_top_get
                               JSONP read; stats render as Data Strips
                               (figure + label + source + recency — the
                               stats-resolver pattern; PF.newsStats.stripHTML
                               is delegated to when a later bundle stages it)
     - cell rally ............. cell_mine + muster_leaderboard JSONP reads
                               (the cells.js rails)
     - countdown .............. local 1s ticker to the event moment — no
                               backend involved
   READ-ONLY BY CONSTRUCTION: every rail is a JSONP GET. This file issues
   zero writes and zero XP — no gain keys, no XP events, no storage writes.
   Pick / position / check-in affordances are plain deep LINKS (CALL IT. ->
   /arcade#pf-forecasts, the board -> /arcade, cells -> /cells): the writes live in
   their home silos, never here.
   POLLING: one 60s master refresh across all slots; consecutive all-slot
   failures back off 60 -> 120 -> 240 -> 480s (cap), reset on any success.
   Refreshes are skipped while the tab is hidden (PF.hidden convention).
   FAIL-OPEN: every slot is independently guarded. A dead slot renders a
   quiet empty note — never a spinner forever, never a broken page. The
   hero and the Action Bar always render.
   EVENT CONFIG: ?live=<slug> | data-live-event on the mount div selects
   the event; ?live_at=<ISO-8601> | data-live-at sets the moment;
   ?live_moment=<label> | data-live-moment names it (default THE MOMENT).
   No config -> the hero stands by and the event-agnostic slots still load.
   BRAND (pattern library): Briefing Hero header, Intel Cards, Data Strips,
   Action Bar (SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK).
   Red #c1121f, black #0a0a0a, Arial. Verbs: DEPLOY -> for actions.
   COPY (psych gate): never "wager"-family or trader language. Pool share
   and plain stakes only.
   KILL: ?pf_off=livemode  or  localStorage pf_disabled_v1='["livemode"]'
   PUBLIC API: window.PFLiveMode.mount(el); window.PFLiveModeMount(el) alias.
   Styles ship via a single head-injected <style id="pf-livemode-css"> so
   the #pf-live self-mount path is styled without page-mount staging. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('livemode')) { return; }
  if (document.getElementById('pf-ov-livemode')) { return; }

  /* ---------- brand CSS (head-injected once; covers every mount path) ---------- */
  var CSS = [
    '#pf-livemode{max-width:1080px;margin:0 auto;padding:8px 12px 24px;color:#f5f0e1;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}',
    '.lm-hero{background:#0a0a0a;border:1px solid #2a2a2a;border-top:4px solid #c1121f;padding:22px 18px;margin:0 0 14px;box-sizing:border-box}',
    '.lm-kicker{color:#c1121f;font-weight:900;font-size:12px;letter-spacing:0.22em;margin-bottom:8px}',
    '.lm-mission{color:#fff;font-weight:900;font-size:1.25rem;line-height:1.3;margin:0 0 14px}',
    '.lm-cdwrap{border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;padding:14px 0;margin:0 0 14px;text-align:center}',
    '.lm-cd{font-family:"Arial Black",Arial,sans-serif;font-weight:900;font-size:2.6rem;letter-spacing:0.06em;color:#fff;line-height:1}',
    '.lm-cd.lm-live{color:#c1121f;animation:lmPulse 1.2s infinite}',
    '@keyframes lmPulse{0%,100%{opacity:1}50%{opacity:0.45}}',
    '.lm-cdlab{color:#c1121f;font-weight:900;font-size:11px;letter-spacing:0.2em;margin-top:8px}',
    '.lm-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:0.95rem;letter-spacing:0.1em;text-decoration:none;padding:14px 28px;min-height:48px;line-height:1.4;box-sizing:border-box;border:0;cursor:pointer;font-family:inherit}',
    '.lm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 14px}',
    '@media (max-width:720px){.lm-grid{grid-template-columns:1fr}}',
    '.lm-card{background:#0a0a0a;border:1px solid #2a2a2a;border-top:3px solid #c1121f;padding:16px 14px;box-sizing:border-box}',
    '.lm-kind{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:10px;letter-spacing:0.14em;padding:4px 8px;margin-bottom:10px}',
    '.lm-head{color:#fff;font-weight:900;font-size:1rem;line-height:1.35;margin:0 0 8px}',
    'a.lm-head{color:#fff;text-decoration:none;display:block}',
    'a.lm-head:hover{text-decoration:underline}',
    '.lm-data{color:#8a8a8a;font-size:0.82rem;line-height:1.5;margin:8px 0}',
    '.lm-act{display:inline-block;margin-top:8px;color:#fff;font-weight:900;font-size:0.85rem;letter-spacing:0.08em;text-decoration:none;border:2px solid #c1121f;padding:10px 18px;min-height:44px;line-height:1.4;box-sizing:border-box}',
    '.lm-strip{margin:10px 0;padding:10px 0;border-top:1px solid #c1121f}',
    '.lm-fig{color:#fff;font-weight:900;font-size:2rem;line-height:1}',
    '.lm-lab{color:#c1121f;font-weight:900;font-size:11px;letter-spacing:0.16em;margin-top:4px}',
    '.lm-src{color:#8a8a8a;font-size:11px;margin-top:4px}',
    '.lm-row{display:flex;justify-content:space-between;gap:8px;padding:8px 4px;border-bottom:1px solid #222;font-size:0.88rem;color:#c9c2b2}',
    '.lm-row b{color:#fff}',
    '.lm-row .lm-hot{color:#c1121f;font-weight:900}',
    '.lm-quiet{border:2px dashed #4a4a4a;padding:14px;color:#8a8a8a;font-size:0.88rem;line-height:1.5}',
    '.lm-load{color:#8a8a8a;padding:14px;text-align:center;font-size:0.9rem}',
    '.lm-actionbar{display:flex;gap:10px;flex-wrap:wrap;background:#0a0a0a;border:1px solid #2a2a2a;border-bottom:4px solid #c1121f;padding:16px 14px;box-sizing:border-box}',
    '.lm-abtn{flex:1 1 160px;min-height:48px;background:#141414;border:2px solid #c1121f;color:#fff;font-weight:900;font-size:0.82rem;letter-spacing:0.1em;cursor:pointer;text-decoration:none;text-align:center;padding:13px 10px;box-sizing:border-box;font-family:inherit;display:inline-block;line-height:1.4}',
    '.lm-abtn:active{background:#c1121f}'
  ].join('\n');
  try {
    if (!document.getElementById('pf-livemode-css')) {
      var st = document.createElement('style');
      st.id = 'pf-livemode-css';
      st.type = 'text/css';
      if (st.styleSheet) { st.styleSheet.cssText = CSS; }
      else { st.appendChild(document.createTextNode(CSS)); }
      (document.head || document.getElementsByTagName('head')[0]).appendChild(st);
    }
  } catch (e) {}

  /* Template: pure markup (no inner script — the engine lives in this IIFE).
     page-mount.js stages it via importNode; the module also self-mounts
     into #pf-live. Both paths are styled by the head-injected CSS above. */
  PF.holder().insertAdjacentHTML('beforeend',
    '<template id="pf-ov-livemode">' +
    '<div class="fe-block pf-override-block pf-silo" id="pf-livemode">' +
    '<div id="xLivemode"><div class="lm-load">Raising the live board&hellip;</div></div>' +
    '</div>' +
    '</template>');

  var LM = window.PFLiveMode = window.PFLiveMode || {};
  var BACKEND = window.PF_BACKEND_URL;
  var MOUNTS = [];
  var tickIv = null, pollIv = null;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function qs(k) {
    try {
      var m = new RegExp('[?&]' + k + '=([^&]*)').exec(window.location.search || '');
      return m ? decodeURIComponent(String(m[1]).replace(/\+/g, ' ')) : '';
    } catch (e) { return ''; }
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }
  function hidden() {
    try { if (window.PF && PF.hidden && PF.hidden()) return true; } catch (e) {}
    try { if (document.hidden) return true; } catch (e2) {}
    return false;
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
  function once(fn) {
    var done = false;
    return function () { if (done) return; done = true; fn.apply(null, arguments); };
  }
  /* JSONP GET — reads only. 12s timeout, then the slot fails open. */
  function api(action, params, cb) {
    cb = once(cb);
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfLmCb' + Math.floor(Math.random() * 1e9);
    var s = null, finished = false;
    function finish(j) {
      if (finished) return; finished = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s && s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
      cb(j);
    }
    try {
      s = document.createElement('script');
      window[fn] = function (j) { finish(j); };
      s.onerror = function () { finish(null); };
      var q = '?action=' + encodeURIComponent(action);
      for (var k in params) {
        if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }
      q += '&callback=' + fn;
      s.src = BACKEND + q;
      document.head.appendChild(s);
      setTimeout(function () { finish(null); }, 12000);
    } catch (e) { finish(null); }
  }
  /* Data Strip (pattern library #4): figure + label + source + recency.
     Delegates to PF.newsStats.stripHTML when a later bundle stages the
     stats-resolver; inline fallback otherwise. */
  function stripHTML(st) {
    try {
      if (window.PF && PF.newsStats && PF.newsStats.stripHTML) return PF.newsStats.stripHTML(st);
    } catch (e) {}
    return '<div class="lm-strip"><div class="lm-fig">' + esc(st.figure) + '</div>' +
      '<div class="lm-lab">' + esc(st.label) + '</div>' +
      '<div class="lm-src">' + esc(st.source || '') +
      (st.recency ? ' &middot; ' + esc(st.recency) : '') + '</div></div>';
  }
  function fmtLeft(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d) + ':' + p(h) + ':' + p(m) + ':' + p(sec);
  }
  function lockText(lockAt) {
    var t = lockAt ? Date.parse(lockAt) : NaN;
    if (isNaN(t)) return 'CLOSING SOON';
    var ms = t - Date.now();
    if (ms <= 0) return 'CLOSED';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return 'CLOSES IN ' + d + 'd ' + h + 'h';
    if (h > 0) return 'CLOSES IN ' + h + 'h ' + m + 'm';
    return 'CLOSES IN ' + m + 'm';
  }

  /* ---------- event config ---------- */
  function eventCfg(el) {
    var slug = '', at = '', moment = '';
    try {
      slug = qs('live') || (el && el.getAttribute && el.getAttribute('data-live-event')) || '';
      at = qs('live_at') || (el && el.getAttribute && el.getAttribute('data-live-at')) || '';
      moment = qs('live_moment') || (el && el.getAttribute && el.getAttribute('data-live-moment')) || '';
    } catch (e) {}
    slug = String(slug).trim();
    var t = Date.parse(String(at).trim());
    if (isNaN(t)) t = null;
    moment = String(moment).trim() || 'THE MOMENT';
    return { slug: slug, at: t, moment: moment };
  }
  function prettySlug(slug) {
    return String(slug).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase() || 'LIVE EVENT';
  }

  /* ---------- slot loaders (reads only; cb(data, ok)) ---------- */
  function loadBoard(cb) {
    api('market_list', {}, function (j) {
      var ms = (j && (j.markets || j.list || j.rows)) || [];
      cb(Array.isArray(ms) ? ms : [], !!(j && j.ok !== false && ms.length));
    });
  }
  function loadCalls(cb) {
    api('predict_qlist', {}, function (j) {
      var qlist = (j && (j.questions || j.rows || j.list)) || [];
      cb(Array.isArray(qlist) ? qlist : [], !!(j && j.ok !== false && qlist.length));
    });
  }
  function loadNews(cb) {
    cb = once(cb);
    var settled = false;
    function done(stories) {
      if (settled) return; settled = true;
      cb(Array.isArray(stories) ? stories : [], !!(stories && stories.length));
    }
    try {
      if (window.PF && PF.newsTop && PF.newsTop.get) {
        PF.newsTop.get(6).then(
          function (p) { done(p && p.stories); },
          function () { done([]); });
        setTimeout(function () { done([]); }, 12000);
        return;
      }
    } catch (e) {}
    api('news_top_get', { limit: 6 }, function (j) { done(j && j.stories); });
  }
  function loadRally(cb) {
    cb = once(cb);
    var idt = ident();
    var out = { cell: null, board: [] };
    var need = idt.callsign ? 2 : 1, n = 0, settled = false;
    function maybe() {
      if (++n < need || settled) return;
      settled = true;
      cb(out, !!(out.cell || out.board.length));
    }
    setTimeout(function () { if (!settled) { settled = true; cb(out, false); } }, 13000);
    if (idt.callsign) {
      api('cell_mine', { callsign: idt.callsign, device: idt.device }, function (j) {
        out.cell = (j && (j.cell || j.mine)) || null;
        maybe();
      });
    }
    api('muster_leaderboard', { limit: 5 }, function (j) {
      var rows = (j && (j.rows || j.leaders || j.board || j.list)) || [];
      out.board = Array.isArray(rows) ? rows : [];
      maybe();
    });
  }

  /* ---------- renderers ---------- */
  function heroHTML(cfg) {
    var hasEvent = !!cfg.slug;
    var kicker = hasEvent ? '&#128308; LIVE EVENT MODE &mdash; ' + esc(prettySlug(cfg.slug)) : 'LIVE EVENT MODE';
    var mission = hasEvent
      ? 'One screen. The board, the wire, and the rally &mdash; refreshing live.'
      : 'No live event on the board right now. The machine never sleeps &mdash; the live board below is always on.';
    var cd;
    if (cfg.at == null) {
      cd = '<div class="lm-cdwrap"><div class="lm-cd">--:--:--:--</div>' +
        '<div class="lm-cdlab">MOMENT TBA</div></div>';
    } else {
      var live = cfg.at <= Date.now();
      cd = '<div class="lm-cdwrap"><div class="lm-cd' + (live ? ' lm-live' : '') + '" data-lm-cd="' + cfg.at + '">' +
        (live ? '&#128308; LIVE NOW' : esc(fmtLeft(cfg.at - Date.now()))) + '</div>' +
        '<div class="lm-cdlab">' + (live ? 'IT IS HAPPENING' : 'UNTIL ' + esc(cfg.moment)) + '</div></div>';
    }
    return '<div class="lm-hero"><div class="lm-kicker">' + kicker + '</div>' +
      '<div class="lm-mission">' + mission + '</div>' + cd +
      '<a class="lm-cta" href="/arcade#pf-forecasts">MAKE THE CALL &rarr;</a></div>';
  }
  function shellHTML(cfg) {
    return heroHTML(cfg) +
      '<div class="lm-grid">' +
      '<div class="lm-card" data-lm-slot="board"><div class="lm-kind">LIVE BOARD</div><div class="lm-load">Reading the board&hellip;</div></div>' +
      '<div class="lm-card" data-lm-slot="calls"><div class="lm-kind">CALLS OPEN</div><div class="lm-load">Reading the calls&hellip;</div></div>' +
      '<div class="lm-card" data-lm-slot="news"><div class="lm-kind">THE WIRE</div><div class="lm-load">Tapping the wire&hellip;</div></div>' +
      '<div class="lm-card" data-lm-slot="rally"><div class="lm-kind">CELL RALLY</div><div class="lm-load">Mustering the cells&hellip;</div></div>' +
      '</div>' +
      '<div class="lm-actionbar">' +
      '<button type="button" class="lm-abtn" data-lm-share>SHARE THIS INTEL</button>' +
      '<a class="lm-abtn" href="/cells">TAKE THIS TO YOUR CELL</a>' +
      '<a class="lm-abtn" href="/war-report">REPORT BACK</a>' +
      '</div>';
  }
  function quietHTML(msg) {
    return '<div class="lm-quiet">' + esc(msg) + '</div>';
  }
  function paintSlot(root, slot, html) {
    try {
      var box = root.querySelector ? root.querySelector('[data-lm-slot="' + slot + '"]') : null;
      if (box) box.innerHTML = '<div class="lm-kind">' +
        ({ board: 'LIVE BOARD', calls: 'CALLS OPEN', news: 'THE WIRE', rally: 'CELL RALLY' }[slot] || '') +
        '</div>' + html;
    } catch (e) {}
  }
  /* --- live board: read-only market cards (no position UI, no writes) --- */
  function boardHTML(ms, ok, fetchedAt) {
    if (!ok || !ms.length) return quietHTML('The board is quiet right now — the wire fought back. It refreshes on its own.');
    var open = ms.filter(function (m) { return String(m.status || 'open').toLowerCase() === 'open'; }).slice(0, 3);
    if (!open.length) return quietHTML('No open markets on the board. The next board opens soon.');
    return open.map(function (m) {
      var sides = m.sides || [], total = Number(m.total_pool) || 0, fighters = 0;
      sides.forEach(function (sd) { fighters += Number(sd.bettors || 0); });
      var lead = sides.slice().sort(function (a, b) { return Number(b.pool || 0) - Number(a.pool || 0); })[0];
      var share = (lead && total > 0) ? Math.round(Number(lead.pool || 0) / total * 100) : 0;
      var leadLabel = lead ? String(lead.side == null ? '' : lead.side) : '';
      var lockAt = Number(m.locks_at) || 0;
      var h = '<div class="lm-head">' + esc(m.title || m.id || 'Market') + '</div>';
      h += stripHTML({
        figure: share + '%',
        label: leadLabel ? ('SAY ' + leadLabel).toUpperCase() : 'POOL SHARE',
        source: 'War Room board · pool ' + total,
        recency: 'updated ' + timeAgo(fetchedAt)
      });
      h += '<div class="lm-data">' +
        (lockAt ? esc(lockText(new Date(lockAt).toISOString())) : 'CLOSING SOON') +
        ' &middot; ' + fighters + ' in the pool</div>';
      h += '<a class="lm-act" href="/arcade#pf-forecasts">FULL BOARD &rarr;</a>';
      return h;
    }).join('');
  }
  /* --- open calls: read-only CALL IT. questions (picks live in /arcade#pf-forecasts) --- */
  function callsHTML(qlist, ok) {
    if (!ok || !qlist.length) return quietHTML('No calls on the board right now. The next board is already loading.');
    var open = qlist.filter(function (q) {
      var st = String(q.status || q.state || 'open').toLowerCase();
      if (st !== 'open') return false;
      var la = q.lock_at || q.lockAt || q.locks_at || q.closes_at;
      if (la && Date.parse(la) <= Date.now()) return false;
      return true;
    }).slice(0, 3);
    if (!open.length) return quietHTML('Every call is locked or resolved. The next board is already loading.');
    return open.map(function (q) {
      var cat = String(q.category || q.cat || '').toUpperCase();
      var la = q.lock_at || q.lockAt || q.locks_at || q.closes_at;
      var h = '<div class="lm-head">' + esc(q.title || q.question || 'Untitled question') + '</div>';
      h += '<div class="lm-data">' + esc(lockText(la)) +
        (cat ? ' &middot; ' + esc(cat) : '') + '</div>';
      h += '<a class="lm-act" href="/arcade#pf-forecasts">MAKE THE CALL &rarr;</a>';
      return h;
    }).join('');
  }
  /* --- the wire: news stories + Data Strips (stats-resolver pattern) --- */
  function newsHTML(stories, ok, cfg, boardMs, qlist) {
    if (!ok || !stories.length) return quietHTML('The wire is quiet right now. Stand by.');
    var kws = cfg.slug ? cfg.slug.split(/[-_\s]+/).filter(function (w) { return w.length > 2; }) : [];
    function rel(s) {
      var t = String((s.title || '') + ' ' + (s.source || '')).toLowerCase();
      for (var i = 0; i < kws.length; i++) { if (t.indexOf(kws[i].toLowerCase()) !== -1) return true; }
      return kws.length === 0;
    }
    var rel_ = stories.filter(rel), rest = stories.filter(function (s) { return !rel(s); });
    var pick = rel_.concat(rest).slice(0, 3);
    var h = pick.map(function (s) {
      var url = String(s.url || s.link || '');
      var okUrl = /^(https?:)\/\//i.test(url) ? url : '';
      var head = '<div class="lm-head">' + esc(s.title || 'Untitled') + '</div>';
      if (okUrl) head = '<a class="lm-head" href="' + esc(okUrl) + '" target="_blank" rel="noopener">' + esc(s.title || 'Untitled') + '</a>';
      return head + '<div class="lm-data">' + esc(s.source || 'wire') +
        (s.published_at ? ' &middot; ' + esc(timeAgo(s.published_at)) : '') + '</div>';
    }).join('');
    /* Event-level Data Strips from already-fetched rails — no extra reads. */
    var strips = [];
    var openMs = (boardMs || []).filter(function (m) { return String(m.status || 'open').toLowerCase() === 'open'; });
    if (openMs.length) {
      strips.push({
        figure: String(openMs.length),
        label: 'OPEN MARKETS ON THE BOARD',
        source: 'War Room board',
        recency: 'live now'
      });
    }
    var openQ = (qlist || []).filter(function (q) {
      return String(q.status || q.state || 'open').toLowerCase() === 'open';
    });
    if (openQ.length) {
      strips.push({
        figure: String(openQ.length),
        label: 'CALLS OPEN ON CALL IT.',
        source: 'CALL IT. board',
        recency: 'live now'
      });
    }
    for (var i = 0; i < Math.min(2, strips.length); i++) h += stripHTML(strips[i]);
    return h;
  }
  /* --- cell rally: my cell (read-only) + muster leaderboard --- */
  function rallyHTML(r, ok) {
    if (!ok || (!r.cell && !r.board.length)) {
      return quietHTML('No cell on file for this callsign — or the rally board is down. The rally still needs you: find your cell.') +
        '<a class="lm-act" href="/cells">FIND YOUR CELL &rarr;</a>';
    }
    var h = '';
    if (r.cell) {
      var c = r.cell;
      var name = c.name || c.cell_name || c.title || 'YOUR CELL';
      var members = c.member_count || c.members || (c.member_list || []).length || '';
      var streak = c.streak || c.streak_days || '';
      h += '<div class="lm-head">' + esc(name).toUpperCase() + '</div>';
      h += '<div class="lm-data">' +
        (members !== '' ? esc(String(members)) + ' fighters' : 'your squad') +
        (streak !== '' && streak != null ? ' &middot; ' + esc(String(streak)) + '-day streak' : '') +
        '</div>';
    }
    if (r.board.length) {
      h += '<div style="margin-top:6px">';
      r.board.slice(0, 5).forEach(function (row, i) {
        var nm = row.cell_name || row.name || row.cell || 'cell ' + (i + 1);
        var ct = row.muster != null ? row.muster : (row.musters != null ? row.musters :
                 (row.rally != null ? row.rally : (row.count != null ? row.count : '')));
        h += '<div class="lm-row"><b>' + (i + 1) + '. ' + esc(nm) + '</b>' +
          '<span class="' + (i === 0 ? 'lm-hot' : '') + '">' + (ct === '' ? '&mdash;' : esc(String(ct))) + '</span></div>';
      });
      h += '</div>';
    }
    h += '<a class="lm-act" href="/cells">RALLY WITH YOUR CELL &rarr;</a>';
    return h;
  }

  /* ---------- share (device-local only; zero backend writes) ---------- */
  function shareIntel(cfg) {
    var slug = cfg.slug ? prettySlug(cfg.slug) : 'LIVE EVENT MODE';
    var text = 'LIVE on MTCSTW.COM: ' + slug + ' — the board, the wire, the rally.';
    var url = '';
    try { url = String(window.location.href || '').split('#')[0]; } catch (e) {}
    try {
      if (window.navigator && window.navigator.share) {
        window.navigator.share({ title: 'LIVE EVENT MODE', text: text, url: url });
        return;
      }
    } catch (e) {}
    try {
      if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
        window.navigator.clipboard.writeText(text + ' ' + url);
        toast('Intel copied. Spread it.');
        return;
      }
    } catch (e) {}
    try { window.prompt('Copy the intel:', text + ' ' + url); } catch (e2) {}
  }

  /* ---------- mount ---------- */
  function refresh(m) {
    var root = m.root, cfg = m.cfg, st = m.st;
    var left = 4, anyOk = false, decided = false;
    function settle(ok) {
      if (ok) anyOk = true;
      if (--left > 0) return;
      if (decided) return; decided = true;
      if (anyOk) { st.fails = 0; st.backoff = 60000; }
      else { st.fails++; st.backoff = Math.min(480000, st.backoff * 2); }
      st.next = Date.now() + st.backoff;
    }
    var boardMs = null, qlist = null;
    loadBoard(function (ms, ok) {
      boardMs = ms;
      paintSlot(root, 'board', boardHTML(ms, ok, Date.now()));
      settle(ok);
    });
    loadCalls(function (qs2, ok) {
      qlist = qs2;
      paintSlot(root, 'calls', callsHTML(qs2, ok));
      settle(ok);
    });
    loadNews(function (stories, ok) {
      paintSlot(root, 'news', newsHTML(stories, ok, cfg, boardMs, qlist));
      settle(ok);
    });
    loadRally(function (r, ok) {
      paintSlot(root, 'rally', rallyHTML(r, ok));
      settle(ok);
    });
  }
  function tickSecond() {
    var now = Date.now();
    for (var i = 0; i < MOUNTS.length; i++) {
      try {
        var m = MOUNTS[i];
        if (m.cfg.at == null) continue;
        var els = m.root.querySelectorAll ? m.root.querySelectorAll('[data-lm-cd]') : [];
        for (var j = 0; j < els.length; j++) {
          var at = Number(els[j].getAttribute('data-lm-cd'));
          if (at <= now) {
            els[j].innerHTML = '&#128308; LIVE NOW';
            if (!els[j].className.match(/lm-live/)) els[j].className += ' lm-live';
            var lab = els[j].parentNode ? els[j].parentNode.querySelector('.lm-cdlab') : null;
            if (lab) lab.textContent = 'IT IS HAPPENING';
          } else {
            els[j].textContent = fmtLeft(at - now);
          }
        }
      } catch (e) {}
    }
  }
  function ensureTimers() {
    if (!tickIv) {
      try { tickIv = setInterval(tickSecond, 1000); } catch (e) {}
    }
    if (!pollIv) {
      try {
        pollIv = setInterval(function () {
          if (hidden()) return;
          var now = Date.now();
          for (var i = 0; i < MOUNTS.length; i++) {
            try { if (now >= MOUNTS[i].st.next) refresh(MOUNTS[i]); } catch (e) {}
          }
        }, 15000);
      } catch (e) {}
    }
  }
  function mountInto(el) {
    try {
      var root = (el.querySelector && el.id === 'xLivemode')
        ? el
        : (el.querySelector ? el.querySelector('#xLivemode') : null);
      if (!root) return;
      if (root.getAttribute && root.getAttribute('data-lm-mounted')) return;
      if (root.setAttribute) root.setAttribute('data-lm-mounted', '1');
      var cfg = eventCfg(el);
      root.innerHTML = shellHTML(cfg);
      /* share button */
      try {
        var sh = root.querySelector('[data-lm-share]');
        if (sh) sh.onclick = function () { shareIntel(cfg); };
      } catch (e) {}
      var m = { root: root, cfg: cfg, st: { next: Date.now() + 60000, backoff: 60000, fails: 0 } };
      MOUNTS.push(m);
      ensureTimers();
      refresh(m);
    } catch (e) {
      try { console.log('[livemode] mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
  }
  LM.mount = mountInto;
  window.PFLiveModeMount = mountInto;
  /* Debug surface for the verify harness (read-only introspection). */
  LM._debug = function () {
    return MOUNTS.map(function (m) {
      return { backoff: m.st.backoff, fails: m.st.fails, nextIn: m.st.next - Date.now() };
    });
  };

  /* ---------- auto-mount ----------
     (1) #pf-live self-mount — hand-placed mount div (e.g. an overlay
         panel or a dedicated Squarespace Code block); (2) template-staged
         #xLivemode mounts — e.g. /war-room via PAGE_ORDERS. Retried late in
         case page code stages after this bundle. */
  function liveSelfMount() {
    try {
      var host = document.getElementById('pf-live');
      if (!host) return;
      if (host.getAttribute && host.getAttribute('data-lm-self')) return;
      if (host.setAttribute) host.setAttribute('data-lm-self', '1');
      var sec = document.createElement('section');
      sec.className = 'pf-v2-game pf-livemode-self';
      sec.setAttribute('data-game', 'livemode');
      sec.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-livemode">' +
        '<div id="xLivemode"><div class="lm-load">Raising the live board&hellip;</div></div>' +
        '</div>';
      host.appendChild(sec);
      var x = sec.querySelector('#xLivemode');
      if (x) mountInto(x);
    } catch (e) {
      try { console.log('[livemode] self-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
  }
  function autoMount() {
    try {
      var els = document.querySelectorAll ? document.querySelectorAll('#xLivemode') : [];
      for (var i = 0; i < els.length; i++) mountInto(els[i]);
    } catch (e) {
      try { console.log('[livemode] auto-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
    liveSelfMount();
  }
  autoMount();
  setTimeout(autoMount, 1500);
  setTimeout(autoMount, 4000);
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  } catch (e) {}
})();
