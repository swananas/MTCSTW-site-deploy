/* core/45-feed-dest-engage.js | PF v1.4.3 | FEED DESTINATIONS UI (WS-3).
   CEO directive dir-20261010-021406-30107 — Feed destinations 3-6 of
   /tmp/feed-destinations.md. Sibling WS-1 owns destinations 1 (EXPAND) +
   2 (DRILL DOWN); WS-2 owns the BE endpoints below.

   WHAT IT DOES: attaches a 4-button engagement row (DEPLOY / ASK KARL /
   RELATED / TRACK) to every Karl feed card and opens a bottom sheet per
   destination. Mobile-first, thumb-reachable, skeleton -> content, no
   spinners, zero XP, no auth required.

   CARD CONTRACT (aligned to WS-1 spec karl-feed-expand-drilldown-20261010
   + beefy-feed-contract.json v1.0.0): card data resolves in this order —
   (1) PFFeedDest.attach(el, data) programmatic,
   (2) el[data-kh-card] -> window.KH_REG[cardId] (WS-1 stamps
       cardId = <rail>-<base36 hash32(q)>),
   (3) DOM extraction from .kh-card markup (beefy / kh-home feed).
   PFFeedDest.cardIdFor(rail, q) implements the id scheme — WS-1 uses the
   same scheme, so ids match when BE endpoints land.

   DESTINATIONS:
   3. DEPLOY — branded share IMAGE (paintKarlAnswer ported from /karl,
      1080x1350, 'JOIN THE FIGHT.' + MTCSTW.COM per the share-image CTA
      standard) + native share text + copy link. Text/link prefer
      GET /api/feed/card/:cardId/share, instant local fallback.
   4. ASK KARL — pre-filled deep-dive query, suggested follow-ups,
      'go deeper' chains; all deep-link to /karl?q= (the /karl page
      deep-links its query param).
   5. RELATED — 'more like this' rail, Karl inference connections,
      mentioned creator profiles; GET /api/karl/related?card=<id>.
   6. TRACK — save to collection, follow topic, alert on number changes;
      POST /api/feed/save, /api/feed/follow-topic, /api/feed/alert.
      UI only: every POST fails-soft to on-device localStorage with
      honest copy ('saved on this device'). No outbound delivery hooks.

   GRACEFUL FALLBACK: every BE call races a timeout and falls back to
   local/derived content. The sheet never shows a spinner — skeletons
   morph into content or honest-empty notes.

   Kill: ?pf_off=feed-dest-engage. Demo: ?fde_demo=1 renders 3 sample
   cards for QC without any sibling branch. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('feed-dest-engage')) { return; }
  if (window.PFFeedDest) { return; }

  var BACKEND = window.PF_BACKEND_URL || '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s;
    } catch (e) {}
    if (/^\//.test(s)) return s; /* site-relative deep link */
    return '';
  }
  function err(m) { try { if (PF && PF.error) PF.error('feed-dest-engage', m); } catch (e) {} }
  function txt(el) {
    try { return String(el.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; }
  }

  /* ---------------- card id scheme (WS-1 contract) ---------------- */
  function hash32(s) {
    var h = 5381, i;
    s = String(s || '');
    for (i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return h >>> 0;
  }
  function cardIdFor(rail, q) {
    var r = String(rail || 'karl').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!r) r = 'karl';
    return r + '-' + hash32(q).toString(36);
  }

  /* ---------------- card data normalization ---------------- */
  /* Beefy contract fields: id, kind, question, answer_html, figures[],
     exhibit_rows, source, deep_link, rail, updated_at, live.
     KH_REG / attach() callers may use either naming. */
  function normFigure(f) {
    f = f || {};
    return {
      label: String(f.label || ''),
      value: String(f.value || f.value_display || ''),
      source: String(f.source || ''),
      asOf: String(f.as_of || f.asOf || '')
    };
  }
  function normalize(d) {
    d = d || {};
    var figs = (d.figures || []).map(normFigure).filter(function (f) { return f.value; });
    var answer = String(d.answer_html != null ? d.answer_html : (d.a != null ? d.a : ''));
    var q = String(d.question != null ? d.question : (d.q || ''));
    var id = String(d.id || d.cardId || '');
    if (!id) id = cardIdFor(d.rail, q);
    return {
      id: id,
      kind: String(d.kind || ''),
      q: q,
      headline: String(d.headline || q),
      answer: answer,
      plainAnswer: answer.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      facts: figs,
      src: String(d.source != null ? d.source : (d.src || '')),
      href: String(d.deep_link != null ? d.deep_link : (d.deep || d.href || '')),
      when: String(d.updated_at != null ? d.updated_at : (d.when || '')),
      rail: String(d.rail || ''),
      live: !!d.live,
      followUps: (d.followUps || d.follow_ups || []).slice(0, 8),
      creators: (d.creators || []).slice(0, 8),
      topic: String(d.topic || d.rail || '')
    };
  }

  /* DOM extraction — works on beefy .kh-card and kh-home .kh-card markup
     without any sibling code changes. Never invents: missing fields stay ''. */
  function domExtract(el) {
    var q = '', ans = '', src = '', href = '', rail = '', when = '';
    try {
      var qEl = el.querySelector('.kh-q, .q');
      if (qEl) q = txt(qEl);
      var aEl = el.querySelector('.kh-a, .a');
      if (aEl) ans = aEl.innerHTML || '';
      var rEl = el.querySelector('.kh-receipts, .receipts');
      if (rEl) src = txt(rEl);
      var dEl = el.querySelector('.kh-deeplink, .kh-door');
      if (dEl && dEl.getAttribute) href = dEl.getAttribute('href') || '';
      var bEl = el.querySelector('.kh-railbadge, .kh-kbadge, .kh-dbadge');
      if (bEl) rail = txt(bEl).replace(/[^a-zA-Z ]/g, '').trim().toLowerCase().split(' ')[0] || '';
      var mEl = el.querySelector('.kh-card-meta');
      if (mEl) when = txt(mEl);
    } catch (e) {}
    var figs = [];
    try {
      var fbs = el.querySelectorAll('.kh-figstrip .kh-fig, .kh-fig');
      for (var i = 0; i < fbs.length && i < 3; i++) {
        var b = fbs[i];
        var v = b.getAttribute('data-fig') || txt(b.querySelector('.fv')) || txt(b);
        var l = txt(b.querySelector('.fl'));
        if (v) figs.push({ label: l, value: v, source: src });
      }
    } catch (e2) {}
    return normalize({ id: '', question: q, answer_html: ans, figures: figs, source: src, deep_link: href, rail: rail, updated_at: when });
  }

  function cardFromEl(el) {
    if (!el) return null;
    try {
      if (el._pfFeedDest) return normalize(el._pfFeedDest);
      var stamped = el.getAttribute && el.getAttribute('data-kh-card');
      if (stamped && window.KH_REG && window.KH_REG[stamped]) {
        return normalize(window.KH_REG[stamped]);
      }
    } catch (e) {}
    return domExtract(el);
  }

  /* ---------------- network: endpoints with graceful fallback ---------------- */
  function fetchJson(url, opts) {
    opts = opts || {};
    var ms = opts.timeout || 8000;
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      var ctrl = null;
      try { ctrl = new AbortController(); } catch (e) {}
      var to = setTimeout(function () {
        try { if (ctrl) ctrl.abort(); } catch (e2) {}
        fin(null);
      }, ms);
      var fo = { method: opts.method || 'GET', headers: { 'Accept': 'application/json' } };
      if (ctrl) fo.signal = ctrl.signal;
      if (opts.body != null) {
        fo.headers['Content-Type'] = 'application/json';
        try { fo.body = JSON.stringify(opts.body); } catch (e3) { clearTimeout(to); fin(null); return; }
      }
      fetch(url, fo).then(function (r) {
        if (!r || !r.ok) { clearTimeout(to); fin(null); return; }
        return r.json();
      }).then(function (j) { clearTimeout(to); fin(j || null); })
        .catch(function () { clearTimeout(to); fin(null); });
    });
  }
  /* Try same-origin first, then PF_BACKEND_URL. Null = endpoint not live. */
  function apiGet(path, timeout) {
    var cands = [];
    try { cands.push(String(window.location.origin || '') + path); } catch (e) {}
    if (BACKEND) cands.push(String(BACKEND).replace(/\/$/, '') + path);
    return (function next(i) {
      if (i >= cands.length) return Promise.resolve(null);
      return fetchJson(cands[i], { timeout: timeout || 8000 }).then(function (j) {
        return j || next(i + 1);
      });
    })(0);
  }
  function apiPost(path, body) {
    var url = '';
    try { url = String(window.location.origin || '') + path; } catch (e) {}
    return fetchJson(url, { method: 'POST', body: body, timeout: 8000 }).then(function (j) {
      if (j && j.ok !== false) return j;
      if (BACKEND) {
        return fetchJson(String(BACKEND).replace(/\/$/, '') + path,
          { method: 'POST', body: body, timeout: 8000 });
      }
      return null;
    });
  }

  /* ---------------- local stores (fallback + offline truth) ---------------- */
  var LS_KEY = 'pf_fde_v1';
  function store() {
    var s = { saves: {}, follows: {}, alerts: {} };
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') s = p; }
    } catch (e) {}
    if (!s.saves) s.saves = {};
    if (!s.follows) s.follows = {};
    if (!s.alerts) s.alerts = {};
    return s;
  }
  function saveStore(s) {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ---------------- toast ---------------- */
  var toastEl = null;
  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'fde-toast';
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = String(msg || '');
      toastEl.classList.add('on');
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
    } catch (e) {}
  }

  /* ---------------- CSS ---------------- */
  var cssDone = false;
  function cssOnce() {
    if (cssDone) return;
    cssDone = true;
    var C = [
      '.pf-fde-bar{display:flex;gap:8px;margin:12px 0 2px;flex-wrap:wrap}',
      '.pf-fde-btn{flex:1 1 0;min-width:0;min-height:48px;padding:12px 6px;border-radius:12px;cursor:pointer;',
      'font-family:Arial,sans-serif;font-weight:900;font-size:11.5px;letter-spacing:1.2px;',
      'border:1px solid #2e2e2e;background:#161616;color:#e8e2d4;transition:transform .12s ease,border-color .15s ease,background .15s ease}',
      '.pf-fde-btn:active{transform:scale(.96)}',
      '.pf-fde-btn.primary{background:linear-gradient(135deg,#d61622,#a50e18);border-color:#d61622;color:#fff}',
      '.pf-fde-btn.on{border-color:#c1121f;color:#fff;background:#221013}',
      '.fde-scrim{position:fixed;inset:0;background:rgba(0,0,0,.62);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:99990}',
      '.fde-scrim.on{opacity:1;pointer-events:auto}',
      '.fde-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99991;max-width:560px;margin:0 auto;',
      'background:#101010;border:1px solid #262626;border-bottom:0;border-radius:18px 18px 0 0;',
      'max-height:86vh;max-height:86dvh;display:flex;flex-direction:column;',
      'transform:translateY(102%);transition:transform .28s cubic-bezier(.2,.9,.3,1);',
      'font-family:Arial,sans-serif;color:#e8e2d4;padding-bottom:env(safe-area-inset-bottom)}',
      '.fde-sheet.on{transform:translateY(0)}',
      '.fde-grab{width:44px;height:5px;border-radius:3px;background:#3a3a3a;margin:10px auto 2px;flex:0 0 auto}',
      '.fde-head{display:flex;align-items:center;gap:10px;padding:10px 18px 6px;flex:0 0 auto}',
      '.fde-title{font-weight:900;font-size:13px;letter-spacing:2.5px;color:#c1121f;flex:1}',
      '.fde-x{background:#1c1c1c;border:1px solid #2e2e2e;color:#e8e2d4;border-radius:50%;width:40px;height:40px;',
      'font-size:16px;cursor:pointer;flex:0 0 auto}',
      '.fde-body{overflow-y:auto;padding:6px 18px 26px;-webkit-overflow-scrolling:touch}',
      '.fde-q{font-size:16px;font-weight:700;line-height:1.45;margin:2px 0 4px;color:#f5f0e6}',
      '.fde-sub{font-size:12.5px;color:#8a8478;margin:0 0 14px}',
      '.fde-act{display:block;width:100%;text-align:center;margin:8px 0;padding:15px;border-radius:12px;cursor:pointer;',
      'font-weight:900;font-size:14px;letter-spacing:1.5px;border:1px solid #2e2e2e;background:#1a1a1a;color:#f5f0e6;',
      'transition:transform .12s ease,background .15s ease;min-height:52px;text-decoration:none;box-sizing:border-box}',
      '.fde-act:active{transform:scale(.98)}',
      '.fde-act.red{background:linear-gradient(135deg,#d61622,#a50e18);border-color:#d61622;color:#fff}',
      '.fde-act .sm{display:block;font-weight:400;font-size:11.5px;letter-spacing:.3px;opacity:.75;margin-top:3px}',
      '.fde-chiprow{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
      '.fde-chip{background:#1a1a1a;border:1px solid #2e2e2e;border-radius:20px;padding:11px 15px;font-size:13px;',
      'color:#e8e2d4;cursor:pointer;min-height:44px;transition:border-color .15s ease}',
      '.fde-chip:active{border-color:#c1121f}',
      '.fde-askrow{display:flex;gap:8px;margin:12px 0 4px}',
      '.fde-askin{flex:1;min-width:0;background:#1a1a1a;border:1px solid #2e2e2e;border-radius:12px;color:#f5f0e6;',
      'font-size:14px;padding:13px 14px;outline:none;min-height:48px}',
      '.fde-askin:focus{border-color:#c1121f}',
      '.fde-askgo{background:linear-gradient(135deg,#d61622,#a50e18);border:0;border-radius:12px;color:#fff;',
      'font-weight:900;letter-spacing:1.5px;font-size:13px;padding:0 20px;cursor:pointer;min-height:48px}',
      '.fde-sk{border-radius:12px;margin:8px 0;background:linear-gradient(100deg,#161616 30%,#222 50%,#161616 70%);',
      'background-size:200% 100%;animation:fde-shimmer 1.3s infinite linear;min-height:74px}',
      '@keyframes fde-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}',
      '.fde-rel{border:1px solid #262626;border-radius:12px;padding:13px 14px;margin:8px 0;background:#141414;cursor:pointer;display:block;text-decoration:none;color:inherit}',
      '.fde-rel:active{border-color:#c1121f}',
      '.fde-rel .t{font-size:14px;font-weight:700;color:#f5f0e6;margin-bottom:3px;line-height:1.4}',
      '.fde-rel .s{font-size:12px;color:#8a8478}',
      '.fde-rel .w{font-size:12px;color:#c9a13b;margin-top:5px;font-style:italic}',
      '.fde-sechd{font-size:11.5px;font-weight:900;letter-spacing:2.5px;color:#8a8478;margin:18px 0 4px}',
      '.fde-empty{background:#141414;border:1px dashed #3a3a3a;border-radius:12px;padding:20px 16px;margin:10px 0;',
      'text-align:center;font-size:13.5px;color:#8a8478;line-height:1.55}',
      '.fde-empty .big{font-weight:900;font-size:15px;color:#e8e2d4;margin-bottom:6px;letter-spacing:1px}',
      '.fde-trow{display:flex;align-items:center;gap:12px;border:1px solid #262626;border-radius:12px;',
      'padding:12px 14px;margin:8px 0;background:#141414;cursor:pointer;min-height:64px;width:100%;text-align:left;color:inherit;font-family:inherit}',
      '.fde-trow:active{border-color:#c1121f}',
      '.fde-trow .tt{flex:1;min-width:0}',
      '.fde-trow .tt .h{font-size:14px;font-weight:900;letter-spacing:.8px;color:#f5f0e6}',
      '.fde-trow .tt .d{font-size:12px;color:#8a8478;margin-top:3px;line-height:1.45}',
      '.fde-tog{flex:0 0 auto;width:52px;height:30px;border-radius:16px;background:#2a2a2a;position:relative;transition:background .18s ease;border:1px solid #3a3a3a}',
      '.fde-trow.on .fde-tog{background:#c1121f;border-color:#c1121f}',
      '.fde-tog:after{content:"";position:absolute;top:3px;left:4px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .18s ease}',
      '.fde-trow.on .fde-tog:after{left:24px}',
      '.fde-note{font-size:11.5px;color:#6b665c;margin:12px 0 0;line-height:1.55}',
      '.fde-saved{display:flex;align-items:center;gap:10px;border:1px solid #262626;border-radius:10px;',
      'padding:10px 12px;margin:6px 0;background:#141414;font-size:13px}',
      '.fde-saved a{flex:1;min-width:0;color:#f5f0e6;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.fde-saved button{background:none;border:1px solid #3a3a3a;color:#8a8478;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;min-height:40px}',
      '.fde-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);',
      'background:#1e1e1e;border:1px solid #c1121f;color:#f5f0e6;font-family:Arial,sans-serif;font-size:13.5px;',
      'padding:13px 20px;border-radius:24px;opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:99999;max-width:88vw;text-align:center}',
      '.fde-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
      '@media(prefers-reduced-motion:reduce){.fde-sheet{transition:none}.fde-scrim{transition:none}.fde-sk{animation:none}}'
    ];
    try {
      var st = document.createElement('style');
      st.setAttribute('data-pf-fde-css', '1');
      st.textContent = C.join('\n');
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---------------- sheet ---------------- */
  var scrim = null, sheet = null, sheetBody = null, sheetOpen = false, sheetCard = null;
  function sheetEnsure() {
    cssOnce();
    if (sheet) return;
    try {
      scrim = document.createElement('div');
      scrim.className = 'fde-scrim';
      scrim.addEventListener('click', closeSheet);
      sheet = document.createElement('div');
      sheet.className = 'fde-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.innerHTML = '<div class="fde-grab"></div>' +
        '<div class="fde-head"><div class="fde-title" id="fde-title"></div>' +
        '<button type="button" class="fde-x" aria-label="Close">&#10005;</button></div>' +
        '<div class="fde-body" id="fde-body"></div>';
      sheet.querySelector('.fde-x').addEventListener('click', closeSheet);
      document.body.appendChild(scrim);
      document.body.appendChild(sheet);
      sheetBody = sheet.querySelector('#fde-body');
      document.addEventListener('keydown', function (e) {
        if (e && e.key === 'Escape' && sheetOpen) closeSheet();
      });
      /* swipe-down to dismiss */
      var sy = null;
      sheet.addEventListener('touchstart', function (e) {
        try { sy = e.touches[0].clientY; } catch (ex) { sy = null; }
      }, { passive: true });
      sheet.addEventListener('touchend', function (e) {
        try {
          if (sy != null && (e.changedTouches[0].clientY - sy) > 90 &&
              sheetBody.scrollTop < 10) closeSheet();
        } catch (ex) {}
        sy = null;
      }, { passive: true });
    } catch (e) {}
  }
  function openSheet(card, view) {
    sheetEnsure();
    if (!sheet) return;
    sheetCard = card;
    var titles = { deploy: 'DEPLOY', ask: 'ASK KARL', related: 'RELATED', track: 'TRACK' };
    try {
      sheet.querySelector('#fde-title').textContent = titles[view] || 'KARL FEED';
      sheetBody.innerHTML = '';
      VIEWS[view](card, sheetBody);
      scrim.classList.add('on');
      sheet.classList.add('on');
      sheetOpen = true;
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
    } catch (e) { err('openSheet failed: ' + (e && e.message)); }
  }
  function closeSheet() {
    sheetOpen = false;
    sheetCard = null;
    try {
      if (scrim) scrim.classList.remove('on');
      if (sheet) sheet.classList.remove('on');
      document.body.style.overflow = '';
    } catch (e) {}
  }

  function deepLink(card) {
    var h = safeUrl(card.href);
    if (h) return h;
    if (card.q) return '/karl?q=' + encodeURIComponent(card.q);
    return '/';
  }
  function absUrl(path) {
    try {
      var o = String(window.location.origin || '');
      if (/^https?:\/\//.test(path)) return path;
      return o + (path.charAt(0) === '/' ? path : '/' + path);
    } catch (e) { return path; }
  }
  function localShareText(card) {
    var lines = [card.q || card.headline || 'A Karl discovery'];
    (card.facts || []).slice(0, 3).forEach(function (f) {
      lines.push(f.label + ': ' + f.value);
    });
    if (card.src) lines.push('— ' + card.src);
    lines.push('— via KARL at mtcstw.com');
    return lines.join('\n');
  }
  function karlUrl(q) {
    return '/karl?q=' + encodeURIComponent(String(q || '').slice(0, 300));
  }
  function markCardDeployed(card) {
    /* Keep the beefy card's own DEPLOY button state consistent. */
    try {
      var els = document.querySelectorAll('[data-kh-card="' + card.id + '"]');
      for (var i = 0; i < els.length; i++) {
        var b = els[i].querySelector('.kh-deploy-btn');
        if (b && !b.classList.contains('kh-done')) {
          b.classList.add('kh-done');
          b.textContent = 'DEPLOYED \u2713';
        }
      }
    } catch (e) {}
  }

  /* ---------------- 3. DEPLOY ---------------- */
  /* paintKarlAnswer, ported from core/karl-page.js (?action=karl_query
     front door). Same 1080x1350 branded canvas: facts + source stamps,
     share-image CTA standard — 'JOIN THE FIGHT.' red bold above
     MTCSTW.COM. Generalized to feed-card data. */
  function kWrap(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], line = '', i, t;
    for (i = 0; i < words.length; i++) {
      t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintKarlAnswerCard(card) {
    var W = 1080, H = 1350, cv, x;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = W; cv.height = H;
    try { x = cv.getContext('2d'); } catch (e) { return null; }
    if (!x) return null;
    var facts = (card.facts || []).slice(0, 3);
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 150;
    x.fillStyle = '#f5ead6'; x.font = '700 32px Arial,sans-serif';
    x.fillText('\u2605 KARL \u2605', W / 2, y); y += 52;
    x.fillStyle = '#c9bfa8'; x.font = '700 28px Arial,sans-serif';
    x.fillText('THE FEED', W / 2, y); y += 80;
    x.fillStyle = '#ffffff'; x.font = '900 56px "Arial Black",Arial,sans-serif';
    kWrap(x, String(card.q || card.headline || '').toUpperCase(), W - 170).slice(0, 3).forEach(function (l) {
      x.fillText(l, W / 2, y); y += 68;
    });
    y += 30;
    facts.forEach(function (f) {
      x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
      kWrap(x, String(f.label || '').toUpperCase(), W - 170).slice(0, 1).forEach(function (l) {
        x.fillText(l, W / 2, y); y += 42;
      });
      x.fillStyle = '#ffffff'; x.font = '900 64px "Arial Black",Arial,sans-serif';
      kWrap(x, String(f.value || ''), W - 170).slice(0, 2).forEach(function (l) {
        x.fillText(l, W / 2, y); y += 76;
      });
      y += 26;
    });
    if (card.src) {
      x.fillStyle = '#8a8172'; x.font = '400 26px Arial,sans-serif';
      kWrap(x, 'Source: ' + card.src, W - 170).slice(0, 2).forEach(function (l) {
        x.fillText(l, W / 2, y); y += 36;
      });
      y += 20;
    }
    /* share-image CTA standard: JOIN THE FIGHT. red bold above MTCSTW.COM */
    x.fillStyle = '#c1121f'; x.font = '900 52px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 210);
    x.fillStyle = '#f5ead6'; x.font = '900 40px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 148);
    x.fillStyle = '#8a8172'; x.font = '400 26px Arial,sans-serif';
    x.fillText('mtcstw.com/karl', W / 2, H - 96);
    return cv;
  }

  function shareImage(card) {
    var cv = null;
    try { cv = paintKarlAnswerCard(card); } catch (e) { cv = null; }
    if (!cv) { toast('Image failed — try text share'); return; }
    var text = localShareText(card);
    var url = absUrl(deepLink(card));
    function deliver(blob) {
      var fname = 'karl-' + String(card.id || 'discovery').replace(/[^a-z0-9-]/gi, '') + '.png';
      try {
        var file = new File([blob], fname, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'KARL Discovery', text: text })
            .then(function () { markCardDeployed(card); }, function () {});
          return;
        }
      } catch (e) {}
      /* fallback: download */
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { try { a.remove(); } catch (e2) {} }, 500);
        toast('Image saved — share it anywhere');
        markCardDeployed(card);
      } catch (e2) { toast('Image failed — try text share'); }
    }
    try {
      if (cv.toBlob) cv.toBlob(deliver, 'image/png');
      else {
        var bin = atob(cv.toDataURL('image/png').split(',')[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        deliver(new Blob([arr], { type: 'image/png' }));
      }
    } catch (e) { toast('Image failed — try text share'); }
  }

  function shareTextFlow(card) {
    /* Race the share endpoint; fall back to local text instantly. */
    var settled = false;
    function go(payload) {
      if (settled) return;
      settled = true;
      var text = payload.text || localShareText(card);
      var url = payload.url || absUrl(deepLink(card));
      var done = function () { markCardDeployed(card); };
      try {
        if (navigator.share) {
          navigator.share({ title: 'KARL Discovery', text: text, url: url })
            .then(done, function () {});
          return;
        }
      } catch (e) {}
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text + ' ' + url).then(function () {
            done(); toast('Copied — paste it anywhere');
          }, function () { toast('Copy blocked — long-press to copy'); });
          return;
        }
      } catch (e2) {}
      done();
    }
    setTimeout(function () { go({}); }, 1500); /* instant path */
    try {
      apiGet('/api/feed/card/' + encodeURIComponent(card.id) + '/share', 1400).then(function (j) {
        if (j && (j.text || j.url)) go({ text: j.text, url: j.url });
      });
    } catch (e) {}
  }

  function copyLink(card) {
    var url = absUrl(deepLink(card));
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          toast('Link copied — paste it anywhere');
        }, function () { toast('Copy blocked — long-press to copy'); });
        return;
      }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Link copied — paste it anywhere');
    } catch (e2) { toast(url); }
  }

  function viewDeploy(card, host) {
    var h = '<div class="fde-q">' + esc(card.q || card.headline) + '</div>' +
      '<p class="fde-sub">Zero XP — deploying is just sharing the intel.</p>' +
      '<button type="button" class="fde-act red" data-fde-act="image">SHARE IMAGE' +
      '<span class="sm">Branded 1080×1350 poster — JOIN THE FIGHT. / MTCSTW.COM</span></button>' +
      '<button type="button" class="fde-act" data-fde-act="text">SHARE TEXT' +
      '<span class="sm">Native share sheet with the receipts</span></button>' +
      '<button type="button" class="fde-act" data-fde-act="link">COPY LINK' +
      '<span class="sm">Deep link to this exact discovery</span></button>';
    host.innerHTML = h;
    host.querySelector('[data-fde-act="image"]').addEventListener('click', function () { shareImage(card); });
    host.querySelector('[data-fde-act="text"]').addEventListener('click', function () { shareTextFlow(card); });
    host.querySelector('[data-fde-act="link"]').addEventListener('click', function () { copyLink(card); });
  }

  /* ---------------- 4. ASK KARL ---------------- */
  function followUpsFor(card) {
    var out = [], seen = {};
    function push(label, q) {
      q = String(q || '').slice(0, 300);
      if (!q || seen[q]) return;
      seen[q] = 1;
      out.push({ label: label, q: q });
    }
    (card.followUps || []).forEach(function (fu) {
      if (typeof fu === 'string') push(fu, fu);
      else if (fu) push(fu.label || fu.q, fu.q || fu.label);
    });
    var f0 = (card.facts || [])[0];
    if (f0 && f0.value) {
      push('What does "' + f0.value + '" mean for me?',
        'What does ' + f0.value + ' (' + f0.label + ') mean for regular people?');
    }
    if (card.src) push("Who's behind these numbers?", 'Who is behind the numbers in: ' + card.q);
    push('Is it getting worse?', 'Is ' + (card.headline || card.q) + ' getting worse over time?');
    push('How does my area compare?', 'How does my area compare on: ' + (card.headline || card.q));
    return out.slice(0, 5);
  }
  function viewAsk(card, host) {
    var deepQ = 'Tell me everything behind this: ' + (card.q || card.headline);
    var h = '<div class="fde-q">' + esc(card.q || card.headline) + '</div>' +
      '<p class="fde-sub">Karl answers from public records — never from memory.</p>' +
      '<a class="fde-act red" href="' + esc(karlUrl(deepQ)) + '">GO DEEPER' +
      '<span class="sm">Full Karl breakdown of this discovery</span></a>' +
      '<div class="fde-sechd">SUGGESTED FOLLOW-UPS</div><div class="fde-chiprow">';
    followUpsFor(card).forEach(function (fu) {
      h += '<a class="fde-chip" href="' + esc(karlUrl(fu.q)) + '">' + esc(fu.label) + '</a>';
    });
    h += '</div><div class="fde-sechd">ASK YOUR OWN</div>' +
      '<div class="fde-askrow"><input class="fde-askin" id="fde-askin" type="text" maxlength="300" ' +
      'value="' + esc('Tell me more about ' + (card.headline || card.q)) + '" aria-label="Ask Karl">' +
      '<button type="button" class="fde-askgo" id="fde-askgo">ASK</button></div>' +
      '<p class="fde-note">Every question opens /karl with your words pre-filled — chains keep going from there.</p>';
    host.innerHTML = h;
    var go = host.querySelector('#fde-askgo'), inp = host.querySelector('#fde-askin');
    go.addEventListener('click', function () {
      var q = String(inp.value || '').trim();
      if (!q) { inp.focus(); return; }
      window.location.href = karlUrl(q);
    });
    inp.addEventListener('keydown', function (e) {
      if (e && e.key === 'Enter') go.click();
    });
  }

  /* ---------------- 5. RELATED ---------------- */
  function relCard(r) {
    var href = safeUrl(r.href || r.deep_link || '');
    var inner = '<div class="t">' + esc(r.q || r.question || r.headline || '') + '</div>' +
      (r.src || r.source ? '<div class="s">' + esc(r.src || r.source) + '</div>' : '') +
      (r.why ? '<div class="w">' + esc(r.why) + '</div>' : '');
    if (href) return '<a class="fde-rel" href="' + esc(href) + '">' + inner + '</a>';
    return '<div class="fde-rel">' + inner + '</div>';
  }
  function honestEmpty() {
    return '<div class="fde-empty"><div class="big">NOT DRAWN YET</div>' +
      'Karl hasn\'t connected this discovery to others yet. The rails are still building out — check back.</div>';
  }
  function viewRelated(card, host) {
    var h = '<div class="fde-q">' + esc(card.q || card.headline) + '</div>' +
      '<div class="fde-sechd">MORE LIKE THIS</div><div id="fde-rel-list">' +
      '<div class="fde-sk"></div><div class="fde-sk"></div><div class="fde-sk"></div></div>' +
      '<div id="fde-rel-conn"></div><div id="fde-rel-creators"></div>';
    /* Immediate local creators (no wait on the endpoint). */
    if ((card.creators || []).length) {
      h += '<div class="fde-sechd">MENTIONED CREATORS</div><div id="fde-rel-creators-local">' +
        card.creators.map(function (c) {
          var href = safeUrl(c.href || '/sick-left-radicals');
          var inner = '<div class="t">' + esc(c.name || '') + '</div>' +
            (c.reach ? '<div class="s">' + esc(c.reach) + '</div>' : '');
          return href ? '<a class="fde-rel" href="' + esc(href) + '">' + inner + '</a>'
            : '<div class="fde-rel">' + inner + '</div>';
        }).join('') + '</div>';
    }
    host.innerHTML = h;
    var list = host.querySelector('#fde-rel-list');
    var connBox = host.querySelector('#fde-rel-conn');
    var creatorsBox = host.querySelector('#fde-rel-creators');
    apiGet('/api/karl/related?card=' + encodeURIComponent(card.id), 8000).then(function (j) {
      if (!sheetOpen || sheetCard !== card) return;
      if (!j || j.ok === false) { list.innerHTML = honestEmpty(); return; }
      var rel = j.related || j.more_like_this || [];
      var conns = j.connections || j.inference_links || [];
      var creators = j.creators || [];
      if (!rel.length && !conns.length && !creators.length) {
        list.innerHTML = honestEmpty();
        return;
      }
      list.innerHTML = rel.length ? rel.slice(0, 6).map(relCard).join('') :
        '<div class="fde-empty"><div class="big">NOT DRAWN YET</div>No sibling discoveries found for this one.</div>';
      if (conns.length) {
        connBox.innerHTML = '<div class="fde-sechd">KARL\u2019S CONNECTIONS</div>' +
          conns.slice(0, 6).map(relCard).join('');
      }
      if (creators.length && !host.querySelector('#fde-rel-creators-local')) {
        creatorsBox.innerHTML = '<div class="fde-sechd">MENTIONED CREATORS</div>' +
          creators.slice(0, 6).map(function (c) {
            var href = safeUrl(c.href || '/sick-left-radicals');
            var inner = '<div class="t">' + esc(c.name || '') + '</div>' +
              (c.reach ? '<div class="s">' + esc(c.reach) + '</div>' : '');
            return href ? '<a class="fde-rel" href="' + esc(href) + '">' + inner + '</a>'
              : '<div class="fde-rel">' + inner + '</div>';
          }).join('');
      }
    });
  }

  /* ---------------- 6. TRACK ---------------- */
  function viewTrack(card, host) {
    var s = store();
    var topic = card.topic || card.rail || 'Karl feed';
    var figCount = (card.facts || []).length;
    function row(key, title, desc, on, sub) {
      return '<button type="button" class="fde-trow' + (on ? ' on' : '') + '" data-fde-track="' + key + '">' +
        '<span class="tt"><span class="h">' + esc(title) + '</span>' +
        '<span class="d">' + esc(desc) + (sub ? '<br>' + esc(sub) : '') + '</span></span>' +
        '<span class="fde-tog"></span></button>';
    }
    var h = '<div class="fde-q">' + esc(card.q || card.headline) + '</div>' +
      '<p class="fde-sub">Your watchlist. Nothing leaves this device until the sync endpoints are live.</p>' +
      row('save', 'SAVE TO COLLECTION',
        s.saves[card.id] ? 'Saved on this device' : 'Keep this discovery in your pocket',
        !!s.saves[card.id],
        s.saves[card.id] && s.saves[card.id].synced ? 'Synced' : '') +
      row('follow', 'FOLLOW TOPIC: ' + topic.toUpperCase(),
        s.follows[topic] ? 'Following — new discoveries surface here' : 'Get new discoveries on this topic',
        !!s.follows[topic], '') +
      row('alert', 'ALERT ON NUMBER CHANGES',
        s.alerts[card.id] ? 'Watching ' + figCount + ' number' + (figCount === 1 ? '' : 's') + ' — you\u2019ll get a ping' : 'Ping me when this discovery\u2019s numbers move',
        !!s.alerts[card.id], '');
    var ids = Object.keys(s.saves || {});
    h += '<div class="fde-sechd">MY COLLECTION (' + ids.length + ')</div><div id="fde-saved-list">';
    if (!ids.length) {
      h += '<div class="fde-empty"><div class="big">EMPTY POCKET</div>Saved discoveries land here.</div>';
    } else {
      ids.slice().reverse().slice(0, 12).forEach(function (id) {
        var sv = s.saves[id] || {};
        var href = safeUrl(sv.href || '');
        h += '<div class="fde-saved">' +
          (href ? '<a href="' + esc(href) + '">' + esc(sv.q || id) + '</a>'
            : '<a>' + esc(sv.q || id) + '</a>') +
          '<button type="button" data-fde-unsave="' + esc(id) + '">REMOVE</button></div>';
      });
    }
    h += '</div><p class="fde-note">Save / follow / alert POST to /api/feed/save, /api/feed/follow-topic, ' +
      '/api/feed/alert when those endpoints are live (WS-2). Until then everything is stored on this device only.</p>';
    host.innerHTML = h;

    function rerender() { viewTrack(card, host); }
    host.querySelector('[data-fde-track="save"]').addEventListener('click', function () {
      var st = store();
      if (st.saves[card.id]) {
        delete st.saves[card.id];
        saveStore(st);
        rerender();
        return;
      }
      var rec = { q: card.q || card.headline, href: deepLink(card), src: card.src, savedAt: Date.now(), synced: false };
      apiPost('/api/feed/save', { cardId: card.id }).then(function (j) {
        var st2 = store();
        if (j && j.ok !== false) rec.synced = true;
        st2.saves[card.id] = rec;
        saveStore(st2);
        toast(rec.synced ? 'Saved' : 'Saved on this device');
        if (sheetOpen && sheetCard === card) rerender();
      });
    });
    host.querySelector('[data-fde-track="follow"]').addEventListener('click', function () {
      var st = store();
      if (st.follows[topic]) {
        delete st.follows[topic];
        saveStore(st);
        rerender();
        return;
      }
      apiPost('/api/feed/follow-topic', { topic: topic }).then(function (j) {
        var st2 = store();
        st2.follows[topic] = { at: Date.now(), synced: !!(j && j.ok !== false) };
        saveStore(st2);
        toast(st2.follows[topic].synced ? 'Following ' + topic : 'Following ' + topic + ' on this device');
        if (sheetOpen && sheetCard === card) rerender();
      });
    });
    host.querySelector('[data-fde-track="alert"]').addEventListener('click', function () {
      var st = store();
      if (st.alerts[card.id]) {
        delete st.alerts[card.id];
        saveStore(st);
        rerender();
        return;
      }
      apiPost('/api/feed/alert', { cardId: card.id, watch: 'numbers' }).then(function (j) {
        var st2 = store();
        st2.alerts[card.id] = {
          at: Date.now(), synced: !!(j && j.ok !== false),
          figures: (card.facts || []).map(function (f) { return f.label + ': ' + f.value; })
        };
        saveStore(st2);
        toast(st2.alerts[card.id].synced ? 'Watching these numbers' : 'Watching on this device');
        if (sheetOpen && sheetCard === card) rerender();
      });
    });
    var uns = host.querySelectorAll('[data-fde-unsave]');
    for (var i = 0; i < uns.length; i++) {
      (function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var st = store();
          delete st.saves[b.getAttribute('data-fde-unsave')];
          saveStore(st);
          rerender();
        });
      })(uns[i]);
    }
  }

  var VIEWS = { deploy: viewDeploy, ask: viewAsk, related: viewRelated, track: viewTrack };

  /* ---------------- attach / scan ---------------- */
  function attach(el, data) {
    if (!el || el._pfFdeBar) return false;
    try {
      if (data) el._pfFeedDest = data;
      var bar = document.createElement('div');
      bar.className = 'pf-fde-bar';
      bar.setAttribute('data-pf-fde', '1');
      var btns = [
        ['deploy', '\u2914 DEPLOY', true],
        ['ask', 'ASK KARL', false],
        ['related', 'RELATED', false],
        ['track', 'TRACK', false]
      ];
      btns.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pf-fde-btn' + (b[2] ? ' primary' : '');
        btn.setAttribute('data-fde', b[0]);
        btn.textContent = b[1];
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var card = cardFromEl(el);
          if (!card || !card.q) { toast('Card data not ready yet'); return; }
          openSheet(card, b[0]);
        });
        bar.appendChild(btn);
      });
      /* Land just above the card meta so the proof block stays last. */
      var meta = el.querySelector('.kh-card-meta');
      if (meta && meta.parentNode === el) el.insertBefore(bar, meta);
      else el.appendChild(bar);
      el._pfFdeBar = bar;
      return true;
    } catch (e) { err('attach failed: ' + (e && e.message)); return false; }
  }
  function detach(el) {
    try {
      if (el && el._pfFdeBar) { el._pfFdeBar.remove(); el._pfFdeBar = null; }
    } catch (e) {}
  }
  function scan(root) {
    try {
      var nodes = (root || document).querySelectorAll('#pf-karl-home .kh-card, [data-kh-card]');
      for (var i = 0; i < nodes.length; i++) attach(nodes[i]);
    } catch (e) {}
  }
  var observer = null;
  function watch() {
    if (observer || !window.MutationObserver) { scan(); return; }
    try {
      observer = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.matches && (n.matches('#pf-karl-home .kh-card') || n.matches('[data-kh-card]'))) {
              attach(n);
            } else if (n.querySelectorAll) {
              var inner = n.querySelectorAll('#pf-karl-home .kh-card, [data-kh-card]');
              for (var k = 0; k < inner.length; k++) attach(inner[k]);
            }
          }
        }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    scan();
  }

  /* ---------------- demo (QC without sibling branches) ---------------- */
  function demo(mount) {
    cssOnce();
    var host = mount || document.body;
    var samples = [
      {
        id: cardIdFor('rent', 'Who is driving up rent in your town?'),
        question: 'Who is driving up rent in your town?',
        answer_html: 'Corporate landlords bought <b>1 in 4</b> starter homes last year.',
        figures: [
          { label: 'Starter homes bought by investors', value: '1 in 4', source: 'RECEIPTS — county deed records' },
          { label: 'Median rent hike since 2020', value: '+31%', source: 'RECEIPTS — Census ACS' }
        ],
        source: 'RECEIPTS — county deed records · Census ACS',
        deep_link: '/town', rail: 'rent', updated_at: '2h ago', kind: 'inference',
        followUps: ['Which landlords own the most near me?', 'What can renters actually do about this?'],
        creators: [{ name: 'Moreno Neurospicy News', reach: '130K+', href: '/sick-left-radicals' }]
      },
      {
        id: cardIdFor('billionaires', 'How rich are the billionaires?'),
        question: 'How rich are the billionaires?',
        answer_html: 'Forbes counts <b>3,428</b> billionaires holding <b>$20.1T</b>.',
        figures: [
          { label: 'Billionaires worldwide', value: '3,428', source: 'RECEIPTS — Forbes 2026' },
          { label: 'Combined wealth', value: '$20.1T', source: 'RECEIPTS — Forbes 2026' }
        ],
        source: 'RECEIPTS — Forbes 2026',
        deep_link: '/follow-the-money', rail: 'billionaires', updated_at: '5h ago', kind: 'discovery'
      },
      {
        id: cardIdFor('labor', 'Who stole the most wages?'),
        question: 'Who stole the most wages?',
        answer_html: 'Wage theft tops <b>$50B</b> a year — more than all robberies combined.',
        figures: [
          { label: 'Annual wage theft', value: '$50B+', source: 'RECEIPTS — EPI analysis' }
        ],
        source: 'RECEIPTS — EPI analysis',
        deep_link: '/follow-the-money', rail: 'labor', updated_at: '1d ago', kind: 'inference'
      }
    ];
    var wrap = document.createElement('div');
    wrap.id = 'pf-karl-home';
    wrap.innerHTML = '<div class="kh-feed" id="kh-feed"></div>';
    var feed = wrap.querySelector('#kh-feed');
    samples.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'kh-card' + (d.kind === 'inference' ? ' kh-inference' : '');
      el.setAttribute('data-kh-card', d.id);
      var figs = d.figures.map(function (f) {
        return '<button class="kh-fig" data-fig="' + esc(f.value) + '"><span class="fv">' + esc(f.value) +
          '</span><span class="fl">' + esc(f.label) + '</span></button>';
      }).join('');
      el.innerHTML =
        '<div class="kh-q">' + esc(d.question) + '</div>' +
        '<div class="kh-a">' + d.answer_html + '</div>' +
        '<div class="kh-figstrip">' + figs + '</div>' +
        '<div class="kh-receipts">' + esc(d.source) + '</div>' +
        '<div class="kh-card-meta"><span class="kh-src">' + esc(d.source.split('—')[0].trim()) + '</span>' +
        '<span>' + esc(d.updated_at) + '</span></div>' +
        '<a class="kh-deeplink" href="' + esc(d.deep_link) + '">DIG DEEPER \u2192</a>';
      feed.appendChild(el);
      /* Programmatic attach with the full contract (figures, follow-ups,
         creators) — the path sibling renderers should use. */
      attach(el, d);
    });
    host.appendChild(wrap);
    return wrap;
  }

  /* ---------------- boot ---------------- */
  function boot() {
    try {
      var m = /[?&]fde_demo=1/.test(String(window.location.search || ''));
      if (m) { demo(document.body); return; }
      watch();
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PFFeedDest = {
    version: '1.0.0',
    attach: attach,
    detach: detach,
    open: openSheet,
    close: closeSheet,
    demo: demo,
    scan: scan,
    cardIdFor: cardIdFor,
    cardFromEl: cardFromEl,
    paint: paintKarlAnswerCard,
    shareText: localShareText,
    followUpsFor: followUpsFor
  };
})();
