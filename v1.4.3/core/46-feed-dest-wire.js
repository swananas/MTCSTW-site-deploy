/* core/46-feed-dest-wire.js | PF v1.4.3 | FEED DESTINATIONS — FULL WIRING (WS-2).
   CEO directive dir-20261010-021456-13712: wire every feature end-to-end on
   REAL backend endpoints. Extends the WS-1 (expand/drill) + WS-3 (engage) UI
   pass — it does not rebuild it.

   1. EXPAND — card tap -> evidence sheet. REAL karl_query of the card probe:
      real proof rows, real sources, real timeline (dates from source metadata
      only). Tries GET /api/karl/feed/:cardId/evidence first when live.
   2. DRILL DOWN — tapping a number executes a REAL karl_query, shows REAL
      results: CHART | TABLE | COMPARE. Tries GET /api/karl/drill first.
   3. SHARE IMAGE — reuses 45's paintKarlAnswerCard (1080x1350, CTA standard).
   4. ASK KARL — askRun(host, q): pre-fills AND executes a REAL karl_query,
      renders the REAL answer in-sheet. (/karl?q= alone does NOT execute —
      the /karl page ignores ?q=.)
   5. RELATED — real discoveries from GET /api/karl/related?card=, mapped to
      the REAL BE shape; karl_query `related` field backs it up when down.
   6. TRACK — POST /api/feed/save|follow-topic|alert is PRIMARY
      (45-feed-dest-engage already POSTs first); localStorage is the honest
      fallback. Zero XP.

   Card identity (WS-1): <rail>-<base36 hash32(q)> on data-kh-card;
   window.KH_REG[cardId] = full card incl. methodology chains (captured at
   creation via el._pfWire). Kill: ?pf_off=feed-dest-wire.
   Figure governance: API data verbatim, no synthesized numbers. esc() all
   interpolation; safeUrl for links. Skeletons, never spinners. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('feed-dest-wire')) { return; }
  if (window.PFFeedWire) { return; }

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
    if (/^\//.test(s)) return s;
    return '';
  }
  function txt(el) {
    try { return String(el.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return ''; }
  }
  function err(m) { try { if (PF && PF.error) PF.error('feed-dest-wire', m); } catch (e) {} }

  /* ---------------- backend ---------------- */
  function beBase() {
    try { return String(window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev').replace(/\/+$/, ''); }
    catch (e) { return 'https://pf-api.mtcstw.workers.dev'; }
  }
  function fetchJson(url, opts) {
    opts = opts || {};
    var ms = opts.timeout || 9000;
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      var ctrl = null;
      try { ctrl = new AbortController(); } catch (e) {}
      var to = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e2) {} fin(null); }, ms);
      var fo = { method: opts.method || 'GET', headers: { 'Accept': 'application/json' } };
      if (ctrl) fo.signal = ctrl.signal;
      if (opts.body != null) {
        fo.headers['Content-Type'] = 'application/json';
        try { fo.body = JSON.stringify(opts.body); }
        catch (e3) { clearTimeout(to); fin(null); return; }
      }
      fetch(url, fo).then(function (r) {
        if (!r || !r.ok) { clearTimeout(to); fin({ _http: r ? r.status : 0 }); return; }
        return r.json();
      }).then(function (j) { clearTimeout(to); fin(j || null); })
        .catch(function () { clearTimeout(to); fin(null); });
    });
  }
  function karlQuery(q, ms) {
    q = String(q || '').trim();
    if (!q) return Promise.resolve(null);
    return fetchJson(beBase() + '/?action=karl_query&q=' + encodeURIComponent(q), { timeout: ms || 12000 })
      .then(function (j) { return (j && j._http == null) ? j : null; });
  }
  function feedGet(path, ms) {
    return fetchJson(beBase() + path, { timeout: ms || 7000 })
      .then(function (j) { return (j && j._http == null && j.ok !== false) ? j : null; });
  }
  function feedPost(path, body) {
    return fetchJson(beBase() + path, { method: 'POST', body: body, timeout: 8000 })
      .then(function (j) { return (j && j._http == null) ? j : null; });
  }

  /* ---------------- card identity (WS-1 scheme) ---------------- */
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
  function normFig(f) {
    f = f || {};
    return { label: String(f.label || ''), value: String(f.value || ''),
      source: String(f.source || ''), chain: (f.chain || []).slice(0, 4) };
  }
  function normalize(d) {
    d = d || {};
    var q = String(d.question != null ? d.question : (d.q || ''));
    var rail = String(d.rail || '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'karl';
    var a = String(d.answer_html != null ? d.answer_html : (d.a != null ? d.a : ''));
    return {
      id: String(d.id || d.cardId || '') || cardIdFor(rail, q),
      rail: rail, q: q, a: a,
      plain: a.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      kind: String(d.kind || ''), src: String(d.source != null ? d.source : (d.src || '')),
      deep: String(d.deep_link != null ? d.deep_link : (d.deep || '')),
      when: String(d.updated_at != null ? d.updated_at : (d.when || '')),
      probe: String(d.probe || q), railLabel: String(d.railLabel || rail),
      figures: (d.figures || []).map(normFig).filter(function (f) { return f.value; }),
      live: !!d.live
    };
  }
  function domExtract(el) {
    var q = '', ans = '', src = '', deep = '', rail = '', when = '';
    try {
      var qEl = el.querySelector('.kh-q, .q'); if (qEl) q = txt(qEl);
      var aEl = el.querySelector('.kh-a, .a'); if (aEl) ans = aEl.innerHTML || '';
      var rEl = el.querySelector('.kh-receipts, .receipts'); if (rEl) src = txt(rEl);
      var dEl = el.querySelector('.kh-deeplink, .kh-door');
      if (dEl && dEl.getAttribute) deep = dEl.getAttribute('href') || '';
      var bEl = el.querySelector('.kh-railbadge, .kh-kbadge, .kh-dbadge');
      if (bEl) rail = txt(bEl).replace(/[^a-zA-Z ]/g, '').trim().toLowerCase().split(' ')[0] || '';
      var mEl = el.querySelector('.kh-card-meta'); if (mEl) when = txt(mEl);
    } catch (e) {}
    var figs = [];
    try {
      var fbs = el.querySelectorAll('.kh-figstrip .kh-fig, .kh-fig');
      for (var i = 0; i < fbs.length && i < 4; i++) {
        var b = fbs[i];
        var v = b.getAttribute('data-fig') || txt(b.querySelector('.fv')) || txt(b);
        var l = txt(b.querySelector('.fl'));
        if (v) figs.push({ label: l, value: v, source: src });
      }
    } catch (e2) {}
    return normalize({ question: q, answer_html: ans, figures: figs, source: src, deep_link: deep, rail: rail, updated_at: when });
  }
  function register(el, d) {
    if (!el || el._pfWireReg) return el._pfWireReg || null;
    var card = normalize(d || el._pfWire || domExtract(el));
    if (!card.q) return null;
    el._pfWireReg = card.id;
    try {
      el.setAttribute('data-kh-card', card.id);
      window.KH_REG = window.KH_REG || {};
      window.KH_REG[card.id] = card;
      el._pfWireCard = card;
    } catch (e) {}
    return card.id;
  }
  function cardFromEl(el) {
    if (!el) return null;
    try {
      if (el._pfWireCard) return el._pfWireCard;
      var st = el.getAttribute && el.getAttribute('data-kh-card');
      if (st && window.KH_REG && window.KH_REG[st]) return window.KH_REG[st];
    } catch (e) {}
    return null;
  }
  function scan(root) {
    try {
      var nodes = (root || document).querySelectorAll('#pf-karl-home .kh-card, [data-kh-card]');
      for (var i = 0; i < nodes.length; i++) register(nodes[i]);
    } catch (e) {}
  }
  var observer = null;
  function watch() {
    scan();
    if (observer || !window.MutationObserver) return;
    try {
      observer = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var ns = muts[i].addedNodes;
          for (var j = 0; j < ns.length; j++) {
            var n = ns[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.matches && (n.matches('#pf-karl-home .kh-card') || n.matches('[data-kh-card]'))) register(n);
            else if (n.querySelectorAll) {
              var inner = n.querySelectorAll('#pf-karl-home .kh-card, [data-kh-card]');
              for (var k = 0; k < inner.length; k++) register(inner[k]);
            }
          }
        }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* ---------------- real-data renderers (verbatim, never invented) ---------------- */
  function compact(n) {
    if (!isFinite(n)) return '\u2014';
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }
  function fmtN(n) { n = Number(n || 0); return n.toLocaleString ? n.toLocaleString('en-US') : String(n); }
  function factRows(facts) {
    var rows = [], srcs = {};
    function src(f) {
      var s = f && f.source, n = s ? String(s.name || s.endpoint || '') : '';
      if (n) srcs[n] = 1;
      return n;
    }
    (facts || []).forEach(function (f) {
      if (!f || typeof f !== 'object') return;
      if (f.label && f.value_display != null) { rows.push({ label: String(f.label), value: String(f.value_display), source: src(f) }); return; }
      if (f.donors && f.donors.length) {
        f.donors.slice(0, 6).forEach(function (d) {
          rows.push({ label: String(d.donor_employer || 'Donor'), value: '$' + compact(Number(d.total || 0)) + ' \u00B7 ' + fmtN(d.donations) + ' donations', source: 'FEC itemized' });
        });
        srcs['FEC itemized'] = 1; return;
      }
      if (f.colleges && f.colleges.length) {
        f.colleges.slice(0, 6).forEach(function (c) {
          rows.push({ label: String(c.name || 'College'), value: String(c.enrollment_display || c.enrollment || ''), source: 'Dept. of Education' });
        });
        srcs['Dept. of Education'] = 1; return;
      }
      if (f.creators && f.creators.length) {
        f.creators.slice(0, 4).forEach(function (c) {
          rows.push({ label: String(c.name || 'Creator'), value: (c.propaganda_score ? c.propaganda_score + '\u2605 ' : '') + String(c.followers_display || ''), source: 'SLR roster' });
        });
        srcs['SLR roster'] = 1; return;
      }
      if (f.trades && f.trades.length) {
        f.trades.slice(0, 4).forEach(function (t) {
          rows.push({ label: String(t.filer || 'Insider'), value: (t.shares ? fmtN(t.shares) + ' sh ' : '') + (t.price ? '@ $' + t.price : ''), source: 'SEC Form 4' });
        });
        srcs['SEC Form 4'] = 1; return;
      }
      if (f.holdings && f.holdings.length) {
        f.holdings.slice(0, 4).forEach(function (h) {
          rows.push({ label: String(h.company_name || 'Holding'), value: '$' + compact(Number(h.value_usd || 0)), source: 'SEC 13F' });
        });
        srcs['SEC 13F'] = 1; return;
      }
      if (f.top_cases && f.top_cases.length) {
        f.top_cases.slice(0, 4).forEach(function (c) {
          rows.push({ label: String(c.name || 'Case'), value: '$' + compact(Number(c.penalty || 0)), source: 'enforcement records' });
        });
        srcs['enforcement records'] = 1; return;
      }
      if (f.positions && f.positions.length) {
        f.positions.slice(0, 4).forEach(function (p) {
          rows.push({ label: String(p.person_name || p.name || 'Person'), value: String(p.org_name || ''), source: 'LittleSis' });
        });
        srcs['LittleSis'] = 1;
      }
    });
    return { rows: rows, sources: Object.keys(srcs) };
  }
  /* Real timeline: dates ONLY from source metadata. Never invented. */
  function timelineOf(facts) {
    var out = [];
    (facts || []).forEach(function (f) {
      var hay = String((f.source && f.source.period) || '') + ' ' + String(f.note || '');
      var m = /(\d{4}-\d{2}-\d{2})/.exec(hay);
      if (m) out.push({ date: m[1], label: String(f.label || ''), detail: String(f.note || f.value_display || '').slice(0, 160) });
    });
    out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return out.slice(0, 10);
  }
  function parseNum(s) {
    var m = /^\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([KMBT])?\s*(%)?\s*$/i.exec(String(s || '').trim());
    if (!m) return null;
    var v = parseFloat(m[1].replace(/,/g, ''));
    var suf = (m[2] || '').toUpperCase();
    if (suf === 'K') v *= 1e3; else if (suf === 'M') v *= 1e6;
    else if (suf === 'B') v *= 1e9; else if (suf === 'T') v *= 1e12;
    return { value: v, unit: m[3] ? '%' : (suf || '$') };
  }

  /* ---------------- sheets ---------------- */
  var cssDone = false;
  function cssOnce() {
    if (cssDone) return;
    cssDone = true;
    var reduced = false;
    try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var C = [
      '.fdw-scrim{position:fixed;inset:0;background:rgba(0,0,0,.66);opacity:0;pointer-events:none;transition:opacity .22s ease;z-index:99980}',
      '.fdw-scrim.on{opacity:1;pointer-events:auto}',
      '.fdw-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99981;max-width:600px;margin:0 auto;background:#101010;border:1px solid #262626;border-bottom:0;border-radius:18px 18px 0 0;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;transform:translateY(103%);' + (reduced ? '' : 'transition:transform .26s cubic-bezier(.2,.9,.3,1);') + 'font-family:Arial,sans-serif;color:#e8e2d4;padding-bottom:env(safe-area-inset-bottom)}',
      '.fdw-sheet.on{transform:translateY(0)}',
      '.fdw-grab{width:44px;height:5px;border-radius:3px;background:#3a3a3a;margin:10px auto 2px;flex:0 0 auto}',
      '.fdw-head{display:flex;align-items:center;gap:10px;padding:8px 18px 4px;flex:0 0 auto}',
      '.fdw-badge{font-weight:900;font-size:11px;letter-spacing:2px;color:#c1121f;flex:1}',
      '.fdw-x{background:#1c1c1c;border:1px solid #2e2e2e;color:#e8e2d4;border-radius:50%;width:40px;height:40px;font-size:16px;cursor:pointer;flex:0 0 auto}',
      '.fdw-body{overflow-y:auto;padding:4px 18px 16px;-webkit-overflow-scrolling:touch}',
      '.fdw-q{font-size:17px;font-weight:800;line-height:1.4;margin:2px 0 6px;color:#f5f0e6}',
      '.fdw-a{font-size:14px;line-height:1.6;color:#cfc9bc;margin:0 0 6px}',
      '.fdw-a b{color:#fff}',
      '.fdw-sechd{font-size:11px;font-weight:900;letter-spacing:2.2px;color:#8a8478;margin:18px 0 6px}',
      '.fdw-sk{border-radius:10px;margin:6px 0;min-height:56px;background:linear-gradient(100deg,#161616 30%,#232323 50%,#161616 70%);background-size:200% 100%;' + (reduced ? '' : 'animation:fdw-sh 1.2s infinite linear;') + '}',
      '@keyframes fdw-sh{from{background-position:200% 0}to{background-position:-200% 0}}',
      '.fdw-proof{display:block;width:100%;text-align:left;border:1px solid #262626;border-radius:10px;padding:11px 13px;margin:6px 0;background:#141414;cursor:pointer;color:inherit;font-family:inherit}',
      '.fdw-proof:active{border-color:#c1121f}',
      '.fdw-proof .k{font-size:12px;color:#8a8478;display:block;margin-bottom:2px}',
      '.fdw-proof .v{font-size:16px;font-weight:900;color:#f5f0e6;border-bottom:1px dotted rgba(193,18,31,.6)}',
      '.fdw-proof .s{font-size:11px;color:#6b665c;margin-top:4px;display:block}',
      '.fdw-row{border:1px solid #222;border-radius:10px;padding:10px 13px;margin:6px 0;background:#141414}',
      '.fdw-row .k{font-size:12px;color:#8a8478}',
      '.fdw-row .v{font-size:15px;font-weight:800;color:#f5f0e6;margin-top:2px}',
      '.fdw-row .s{font-size:11px;color:#6b665c;margin-top:3px}',
      '.fdw-tl{border-left:2px solid #c1121f;margin:6px 0 6px 6px;padding:2px 0 2px 14px}',
      '.fdw-tl .d{font-size:11px;font-weight:900;letter-spacing:1.5px;color:#c1121f}',
      '.fdw-tl .l{font-size:13.5px;font-weight:700;color:#f5f0e6;margin:2px 0}',
      '.fdw-tl .x{font-size:12.5px;color:#8a8478}',
      '.fdw-empty{background:#141414;border:1px dashed #3a3a3a;border-radius:10px;padding:16px;margin:8px 0;text-align:center;font-size:13px;color:#8a8478;line-height:1.55}',
      '.fdw-empty .big{font-weight:900;font-size:13.5px;color:#e8e2d4;margin-bottom:4px;letter-spacing:1px}',
      '.fdw-why{font-size:14px;line-height:1.65;color:#cfc9bc;background:#141414;border:1px solid #262626;border-radius:10px;padding:13px 14px;margin:6px 0}',
      '.fdw-rel{display:block;width:100%;border:1px solid #262626;border-radius:10px;padding:12px 14px;margin:6px 0;background:#141414;cursor:pointer;color:inherit;text-decoration:none;font-family:inherit;text-align:left}',
      '.fdw-rel:active{border-color:#c1121f}',
      '.fdw-rel .t{font-size:14px;font-weight:700;color:#f5f0e6;line-height:1.4}',
      '.fdw-rel .s{font-size:12px;color:#8a8478;margin-top:3px}',
      '.fdw-foot{display:flex;gap:8px;padding:10px 18px 18px;flex:0 0 auto}',
      '.fdw-btn{flex:1;min-height:52px;border-radius:12px;border:1px solid #2e2e2e;background:#1a1a1a;color:#f5f0e6;font-weight:900;font-size:12.5px;letter-spacing:1.2px;cursor:pointer;font-family:inherit}',
      '.fdw-btn:active{transform:scale(.97)}',
      '.fdw-btn.red{background:linear-gradient(135deg,#d61622,#a50e18);border-color:#d61622;color:#fff}',
      '.fdw-bigfig{font-size:44px;font-weight:900;color:#fff;letter-spacing:-.5px;margin:6px 0 2px}',
      '.fdw-figlabel{font-size:14px;color:#cfc9bc}',
      '.fdw-receipt{font-size:11.5px;color:#6b665c;letter-spacing:.8px;margin:8px 0 2px}',
      '.fdw-tabs{display:flex;gap:8px;margin:12px 0 6px}',
      '.fdw-tab{flex:1;min-height:44px;border-radius:10px;border:1px solid #2e2e2e;background:#161616;color:#8a8478;font-weight:900;font-size:12px;letter-spacing:1.5px;cursor:pointer;font-family:inherit}',
      '.fdw-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}',
      '.fdw-chain{margin:6px 0;padding-left:20px;font-size:13.5px;line-height:1.65;color:#b7b1a4}',
      '.fdw-chain li{margin:4px 0}',
      '.fdw-note{font-size:11.5px;color:#6b665c;margin:10px 0 0;line-height:1.55}',
      '.fdw-tbl{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0}',
      '.fdw-tbl th{text-align:left;font-size:11px;letter-spacing:1.5px;color:#8a8478;padding:8px 6px;border-bottom:1px solid #2e2e2e}',
      '.fdw-tbl td{padding:9px 6px;border-bottom:1px solid #1e1e1e;color:#e8e2d4;vertical-align:top}',
      '.fdw-tbl td.n{font-weight:800;color:#fff;white-space:nowrap}',
      '.fdw-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);background:#1c1c1c;border:1px solid #c1121f;color:#f5f0e6;padding:12px 18px;border-radius:12px;font-size:13.5px;font-weight:700;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:99999;max-width:88vw;text-align:center}',
      '.fdw-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}',
      '.fdw-live-tag{font-size:10px;font-weight:900;letter-spacing:1.8px;color:#4caf50;margin-left:8px}'
    ];
    try {
      var st = document.createElement('style');
      st.textContent = C.join('\n');
      (document.head || document.documentElement).appendChild(st);
    } catch (e) {}
  }
  var sheetSt = null;
  function closeSheet() {
    if (!sheetSt) return;
    var st = sheetSt; sheetSt = null;
    try { window.removeEventListener('popstate', st.pop); } catch (e) {}
    try { if (st.hist && !st.fromPop && window.history) history.back(); } catch (e2) {}
    st.scrim.classList.remove('on'); st.sheet.classList.remove('on');
    setTimeout(function () {
      try { st.scrim.remove(); st.sheet.remove(); } catch (e3) {}
      try { document.body.style.overflow = st.prevOverflow || ''; } catch (e4) {}
    }, 260);
  }
  function openSheet(badge, bodyHTML, footHTML) {
    cssOnce();
    closeSheet();
    var scrim = document.createElement('div'); scrim.className = 'fdw-scrim';
    var sheet = document.createElement('div'); sheet.className = 'fdw-sheet';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML =
      '<div class="fdw-grab"></div>' +
      '<div class="fdw-head"><span class="fdw-badge">' + badge + '</span>' +
      '<button class="fdw-x" aria-label="Close">\u00D7</button></div>' +
      '<div class="fdw-body">' + bodyHTML + '</div>' +
      (footHTML ? '<div class="fdw-foot">' + footHTML + '</div>' : '');
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    var prevOverflow = '';
    try { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
    sheetSt = { scrim: scrim, sheet: sheet, prevOverflow: prevOverflow, hist: false, fromPop: false };
    try { history.pushState({ fdw: 1 }, ''); sheetSt.hist = true; } catch (e2) {}
    var pop = function () { if (sheetSt) { sheetSt.fromPop = true; closeSheet(); } };
    sheetSt.pop = pop;
    window.addEventListener('popstate', pop);
    scrim.addEventListener('click', closeSheet);
    sheet.querySelector('.fdw-x').addEventListener('click', closeSheet);
    var startY = null;
    sheet.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      var dy = (startY != null && e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY - startY : 0;
      startY = null;
      if (dy > 110) closeSheet();
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      scrim.classList.add('on'); sheet.classList.add('on');
    }); });
    return { scrim: scrim, sheet: sheet, body: sheet.querySelector('.fdw-body'), foot: sheet.querySelector('.fdw-foot'), close: closeSheet };
  }
  var toastEl = null;
  function toast(msg) {
    try {
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'fdw-toast'; document.body.appendChild(toastEl); }
      toastEl.textContent = String(msg || '');
      toastEl.classList.add('on');
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
    } catch (e) {}
  }
  function honestEmpty(big, small) {
    return '<div class="fdw-empty"><div class="big">' + esc(big) + '</div>' + esc(small) + '</div>';
  }
  function rowHTML(r) {
    return '<div class="fdw-row"><div class="k">' + esc(r.label) + '</div><div class="v">' + esc(r.value) + '</div>' +
      (r.source ? '<div class="s">SOURCE \u2014 ' + esc(r.source) + '</div>' : '') + '</div>';
  }

  /* ---------------- 1. EXPAND ---------------- */
  function expandCard(card) {
    if (!card || !card.q) return false;
    var kindBadge = card.kind === 'inference' ? '\uD83E\uDDE0 KARL NOTICED' :
      (card.kind === 'discovery' ? '\u270A COMRADE FOUND' : '\u26A1 KARL FEED');
    var proofs = (card.figures || []).map(function (f, i) {
      return '<button type="button" class="fdw-proof" data-fdw-fig="' + i + '">' +
        '<span class="k">' + esc(f.label || 'Figure') + '</span><span class="v">' + esc(f.value) + '</span>' +
        (f.source ? '<span class="s">SOURCE \u2014 ' + esc(f.source) + '</span>' : '') + '</button>';
    }).join('') || honestEmpty('NO FIGURES', 'This card ships its receipts inline above.');
    var body =
      '<div class="fdw-q">' + esc(card.q) + '</div>' +
      (card.a ? '<div class="fdw-a">' + card.a + '</div>' : '') +
      '<div class="fdw-sechd">PROOF ROWS \u2014 TAP A NUMBER</div><div id="fdw-proofs">' + proofs + '</div>' +
      '<div class="fdw-sechd">\u26A1 LIVE FROM THE RAILS<span class="fdw-live-tag">REAL QUERY</span></div>' +
      '<div id="fdw-live"><div class="fdw-sk"></div><div class="fdw-sk"></div></div>' +
      '<div class="fdw-sechd">SOURCES</div><div id="fdw-srcs"><div class="fdw-sk"></div></div>' +
      '<div class="fdw-sechd">TIMELINE</div><div id="fdw-tl"><div class="fdw-sk"></div></div>' +
      '<div class="fdw-sechd">WHY THIS MATTERS</div><div class="fdw-why" id="fdw-why">' +
      (card.plain ? esc(card.plain) : 'The receipts above are the story.') + '</div>' +
      '<div class="fdw-sechd">RELATED KARL INFERENCES</div><div id="fdw-rel"><div class="fdw-sk"></div></div>';
    var deepHref = safeUrl(card.deep) || '/karl';
    var sh = openSheet(kindBadge + ' \u00B7 ' + esc(String(card.railLabel || card.rail || '').toUpperCase()), body,
      '<a class="fdw-btn red" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="' + esc(deepHref) + '">DIG DEEPER</a>' +
      '<button type="button" class="fdw-btn" id="fdw-deploy">DEPLOY</button>' +
      '<button type="button" class="fdw-btn" id="fdw-close">CLOSE</button>');
    sh.foot.querySelector('#fdw-close').addEventListener('click', sh.close);
    sh.foot.querySelector('#fdw-deploy').addEventListener('click', function () { shareCard(card); });
    sh.body.querySelectorAll('[data-fdw-fig]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = card.figures[Number(b.getAttribute('data-fdw-fig'))];
        if (f) openDrill(card, f);
      });
    });
    fillExpandLive(card, sh);
    return true;
  }
  function expand(el) {
    var card = cardFromEl(el);
    if (!card) { register(el); card = cardFromEl(el); }
    if (!card) return false;
    return expandCard(card);
  }
  function fillExpandLive(card, sh) {
    var live = sh.body.querySelector('#fdw-live');
    var srcs = sh.body.querySelector('#fdw-srcs');
    var tl = sh.body.querySelector('#fdw-tl');
    var rel = sh.body.querySelector('#fdw-rel');
    var why = sh.body.querySelector('#fdw-why');
    var alive = function () { return sheetSt && sheetSt.sheet === sh.sheet; };
    function renderFacts(facts) {
      if (!alive()) return;
      var fr = factRows(facts);
      live.innerHTML = fr.rows.length ? fr.rows.map(rowHTML).join('')
        : honestEmpty('RAILS QUIET', 'Karl found no fresh rows for this one \u2014 the card figures above are the audited receipts.');
      var names = fr.sources.length ? fr.sources :
        (card.src ? [String(card.src).replace(/^\s*\u25B8?\s*RECEIPTS\s*[\u2014-]\s*/i, '')] : []);
      srcs.innerHTML = names.length
        ? names.map(function (s) { return '<div class="fdw-row"><div class="v" style="font-size:13.5px">' + esc(s) + '</div></div>'; }).join('')
        : honestEmpty('NO SOURCE STAMPS', 'The rails returned rows without source stamps \u2014 treat as unverified.');
      var t = timelineOf(facts);
      tl.innerHTML = t.length
        ? '<div class="fdw-tl">' + t.map(function (e) {
            return '<div class="d">' + esc(e.date) + '</div><div class="l">' + esc(e.label) + '</div>' +
              (e.detail ? '<div class="x">' + esc(e.detail) + '</div>' : '');
          }).join('') + '</div>'
        : honestEmpty('NO DATED ENTRIES', 'No dated entries on the rails for this one \u2014 the receipts above are the latest pull.');
    }
    function renderRelList(links) {
      if (!alive()) return;
      if (!links.length) {
        rel.innerHTML = honestEmpty('NOT DRAWN YET', 'Karl hasn\u2019t connected this discovery to others yet. The rails are still building out.');
        return;
      }
      rel.innerHTML = links.slice(0, 8).map(function (l, i) {
        return '<button type="button" class="fdw-rel" data-fdw-krel="' + i + '"><div class="t">' + esc(l.label) + '</div>' +
          (l.sub ? '<div class="s">' + esc(l.sub) + '</div>' : '') + '</button>';
      }).join('');
      rel.querySelectorAll('[data-fdw-krel]').forEach(function (b) {
        b.addEventListener('click', function () {
          var l = links[Number(b.getAttribute('data-fdw-krel'))];
          if (!l) return;
          if (l.href && safeUrl(l.href)) { window.location.href = safeUrl(l.href); return; }
          if (l.cardRef && window.KH_REG && window.KH_REG[l.cardRef]) { expandCard(window.KH_REG[l.cardRef]); return; }
          askRunSheet(l.label, l.label);
        });
      });
    }
    function queryBackbone() {
      karlQuery(card.probe || card.q, 12000).then(function (j) {
        if (!alive()) return;
        renderFacts((j && j.facts) || []);
        var links = [];
        ((j && j.related) || []).forEach(function (r) {
          if (r && (r.label || r.href)) links.push({ label: r.label || r.product || 'Karl product', sub: r.product ? String(r.product).toUpperCase() : '', href: r.href || '' });
        });
        try {
          var reg = window.KH_REG || {};
          Object.keys(reg).forEach(function (k) {
            if (links.length >= 8) return;
            var c = reg[k];
            if (c && c.id !== card.id && c.rail === card.rail && c.q)
              links.push({ label: c.q, sub: 'SAME RAIL \u2014 ' + String(c.railLabel || c.rail).toUpperCase(), cardRef: c.id });
          });
        } catch (e) {}
        renderRelList(links);
      });
    }
    /* BE evidence endpoint first — only for content-addressed karl.* ids. */
    if (/^karl\.[a-z_]+\.[A-Za-z0-9\-_]+$/.test(card.id)) {
      feedGet('/api/karl/feed/' + encodeURIComponent(card.id) + '/evidence', 6000).then(function (j) {
        if (!alive()) return;
        if (j && j.proof_rows && j.proof_rows.length) {
          live.innerHTML = j.proof_rows.map(function (p) {
            return rowHTML({ label: String(p.label || ''), value: String(p.value_display != null ? p.value_display : p.value),
              source: p.source ? String(p.source.name || '') : '' });
          }).join('');
          srcs.innerHTML = (j.sources || []).map(function (s) {
            return '<div class="fdw-row"><div class="v" style="font-size:13.5px">' + esc(s.name || '') + '</div>' +
              (s.endpoint ? '<div class="s">' + esc(s.endpoint) + '</div>' : '') + '</div>';
          }).join('') || honestEmpty('NO SOURCE STAMPS', '');
          tl.innerHTML = (j.timeline || []).length
            ? '<div class="fdw-tl">' + j.timeline.map(function (e) {
                return '<div class="d">' + esc(e.date) + '</div><div class="l">' + esc(e.label || '') + '</div>' +
                  (e.detail ? '<div class="x">' + esc(e.detail) + '</div>' : '');
              }).join('') + '</div>'
            : honestEmpty('NO DATED ENTRIES', 'The evidence endpoint returned no timeline.');
          if (j.why_it_matters) why.textContent = String(j.why_it_matters);
          var ids = j.related_inference_ids || [];
          renderRelList(ids.slice(0, 6).map(function (id) {
            return { label: prettyCardId(id), sub: 'KARL INFERENCE \u2014 TAP TO RUN' };
          }));
          return;
        }
        queryBackbone();
      });
    } else { queryBackbone(); }
  }
  function prettyCardId(id) {
    var m = /^karl\.([a-z_]+)\.(.+)$/.exec(String(id || ''));
    if (!m) return String(id);
    try {
      var b = m[2].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var key = (typeof Buffer !== 'undefined') ? Buffer.from(b, 'base64').toString('utf8') : decodeURIComponent(escape(atob(b)));
      return m[1].replace(/_/g, ' ') + ': ' + key.slice(0, 70);
    } catch (e) { return String(id); }
  }
  function askRunSheet(title, q) {
    var sh = openSheet('\uD83E\uDDE0 ASK KARL',
      '<div class="fdw-q">' + esc(title || q) + '</div><div id="fdw-askres"><div class="fdw-sk"></div><div class="fdw-sk"></div></div>',
      '<button type="button" class="fdw-btn red" id="fdw-x">CLOSE</button>');
    sh.foot.querySelector('#fdw-x').addEventListener('click', sh.close);
    askRun(sh.body.querySelector('#fdw-askres'), q);
  }
  function shareCard(card) {
    var text = (card.q || '') + '\n\n' + (card.plain || '') + '\n\n\u2014 via KARL at mtcstw.com';
    var done = function () { toast('Deployed \u2014 spread it'); };
    try {
      if (navigator.share) { navigator.share({ title: 'KARL Discovery', text: text, url: 'https://mtcstw.com/' }).then(done, function () {}); return; }
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text + ' https://mtcstw.com/').then(function () { toast('Copied \u2014 paste it anywhere'); });
        return;
      }
    } catch (e2) {}
    done();
  }

  /* ---------------- 2. DRILL DOWN ---------------- */
  function metricSlug(label) {
    return String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'value';
  }
  function openDrill(card, fig) {
    fig = fig || {};
    var value = String(fig.value || ''), label = String(fig.label || 'Figure');
    var source = String(fig.source || card.src || '');
    var body =
      '<div style="font-size:11px;letter-spacing:2.2px;color:#e5383b;font-weight:900">WHY THIS NUMBER</div>' +
      '<div class="fdw-bigfig">' + esc(value) + '</div>' +
      '<div class="fdw-figlabel">' + esc(label) + '</div>' +
      (source ? '<div class="fdw-receipt">SOURCE \u2014 ' + esc(source) + '</div>' : '') +
      '<div class="fdw-sechd">\u26A1 KARL JUST RAN THIS<span class="fdw-live-tag">REAL QUERY</span></div>' +
      '<div id="fdw-dq"><div class="fdw-sk"></div><div class="fdw-sk"></div></div>' +
      '<div class="fdw-tabs"><button type="button" class="fdw-tab on" data-fdw-tab="chart">CHART</button>' +
      '<button type="button" class="fdw-tab" data-fdw-tab="table">TABLE</button>' +
      '<button type="button" class="fdw-tab" data-fdw-tab="compare">COMPARE</button></div>' +
      '<div id="fdw-dview"></div>' +
      '<div class="fdw-sechd">HOW WE GOT THIS</div>' +
      ((fig.chain && fig.chain.length)
        ? '<ul class="fdw-chain">' + fig.chain.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'
        : honestEmpty('METHODOLOGY NOT PUBLISHED', 'This figure\u2019s chain isn\u2019t on the card \u2014 the source line above is the receipt.'));
    var sh = openSheet('\uD83D\uDCCA DRILL DOWN', body,
      '<button type="button" class="fdw-btn red" id="fdw-dd">DEPLOY FIGURE</button>' +
      '<button type="button" class="fdw-btn" id="fdw-da">ASK KARL</button>' +
      '<button type="button" class="fdw-btn" id="fdw-dx">CLOSE</button>');
    sh.foot.querySelector('#fdw-dx').addEventListener('click', sh.close);
    sh.foot.querySelector('#fdw-dd').addEventListener('click', function () {
      var t = value + ' \u2014 ' + label + ' \u2014 via KARL at mtcstw.com';
      var done = function () { toast('Figure deployed'); };
      try {
        if (navigator.share) { navigator.share({ title: 'KARL figure', text: t, url: 'https://mtcstw.com/' }).then(done, function () {}); return; }
      } catch (e) {}
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t + ' https://mtcstw.com/').then(function () { toast('Copied \u2014 paste it anywhere'); }); return; }
      } catch (e2) {}
      done();
    });
    sh.foot.querySelector('#fdw-da').addEventListener('click', function () {
      askRunSheet('Why ' + value + '?', 'Why is ' + label + ' ' + value + '? ' + card.q);
    });
    var tabs = sh.body.querySelectorAll('[data-fdw-tab]');
    var view = sh.body.querySelector('#fdw-dview');
    var dq = sh.body.querySelector('#fdw-dq');
    var state = { rows: [], chartVals: [], q: '' };
    function setTab(name) {
      tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-fdw-tab') === name); });
      if (name === 'chart') renderChart();
      else if (name === 'table') renderTable();
      else renderCompare();
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { setTab(t.getAttribute('data-fdw-tab')); }); });
    function renderTable() {
      view.innerHTML = state.rows.length
        ? '<table class="fdw-tbl"><thead><tr><th>ITEM</th><th>VALUE</th><th>SOURCE</th></tr></thead><tbody>' +
          state.rows.slice(0, 12).map(function (r) {
            return '<tr><td>' + esc(r.label) + '</td><td class="n">' + esc(r.value) + '</td><td>' + esc(r.source || '') + '</td></tr>';
          }).join('') + '</tbody></table>'
        : honestEmpty('NO TABLE ROWS', 'The rails returned this figure without a breakdown \u2014 the source line above is the receipt.');
    }
    function renderChart() {
      if (state.chartVals.length < 2) {
        view.innerHTML = honestEmpty('NOTHING TO CHART', 'One number is a fact, not a trend \u2014 the table view has the breakdown.');
        return;
      }
      view.innerHTML = '<canvas id="fdw-cv" width="640" height="300" style="width:100%;height:auto;background:#141414;border:1px solid #262626;border-radius:10px"></canvas>' +
        '<div class="fdw-note">' + esc(state.q ? 'Charted from the live karl_query: \u201C' + state.q + '\u201D' : 'Charted from the card\u2019s figures.') + '</div>';
      drawBars(view.querySelector('#fdw-cv'), state.chartVals);
    }
    function renderCompare() {
      var mine = parseNum(value);
      var sibs = (card.figures || []).map(function (f) {
        return { label: f.label, value: f.value, p: parseNum(f.value) };
      }).filter(function (s) { return s.p && mine && s.p.unit === mine.unit; });
      if (sibs.length < 2) {
        view.innerHTML = honestEmpty('NOTHING COMPARABLE', 'The sibling figures on this card use different units \u2014 comparing them would be dishonest.');
        return;
      }
      view.innerHTML = '<canvas id="fdw-cv2" width="640" height="300" style="width:100%;height:auto;background:#141414;border:1px solid #262626;border-radius:10px"></canvas>' +
        '<table class="fdw-tbl"><tbody>' + sibs.map(function (s) {
          return '<tr><td>' + esc(s.label) + '</td><td class="n">' + esc(s.value) + '</td></tr>';
        }).join('') + '</tbody></table>';
      drawBars(view.querySelector('#fdw-cv2'), sibs.map(function (s) { return { label: s.label, value: s.p.value, display: s.value }; }));
    }
    var q = card.probe || card.q;
    function runQuery() {
      karlQuery(q, 12000).then(function (j) {
        if (!sheetSt || sheetSt.sheet !== sh.sheet) return;
        if (j && j.facts && j.facts.length) {
          var fr = factRows(j.facts);
          state.rows = fr.rows;
          state.q = q;
          var nums = [];
          j.facts.forEach(function (f) {
            if (typeof f.value === 'number' && f.label) nums.push({ label: String(f.label), value: f.value, display: f.value_display || String(f.value) });
          });
          if (!nums.length) fr.rows.forEach(function (r) {
            var p = parseNum(r.value);
            if (p) nums.push({ label: r.label, value: p.value, display: r.value });
          });
          state.chartVals = nums.slice(0, 12);
          var rails = (j.rail_status || []).filter(function (r) { return r.live; }).length;
          dq.innerHTML = '<div class="fdw-row"><div class="k">QUERY</div><div class="v" style="font-size:13.5px">\u201C' + esc(q) + '\u201D</div>' +
            '<div class="s">' + esc(fr.rows.length + ' real rows \u00B7 ' + (j.template || 'karl_query') + ' \u00B7 ' + rails + ' live rails') + '</div></div>';
        } else {
          dq.innerHTML = honestEmpty('RAILS QUIET', 'Karl found nothing fresh \u2014 the figure and its source line above are the audited receipts.');
        }
        setTab('chart');
      });
    }
    var slug = metricSlug(label);
    if (/^karl\.[a-z_]+\.[A-Za-z0-9\-_]+$/.test(card.id) && /^[a-z0-9_]{1,40}$/.test(slug)) {
      feedGet('/api/karl/drill?metric=' + encodeURIComponent(slug) + '&card=' + encodeURIComponent(card.id), 6000)
        .then(function (j) {
          if (!sheetSt || sheetSt.sheet !== sh.sheet) return;
          if (j && j.chart_spec) {
            state.chartVals = (j.values || []).map(function (v) {
              return { label: String(v.label || ''), value: Number(v.value) || 0, display: String(v.display || v.value) };
            }).filter(function (v) { return isFinite(v.value); });
            state.rows = (j.table_rows || []).map(function (r) { return { label: r.label, value: r.value, source: r.source }; });
            state.q = 'drill:' + slug;
            dq.innerHTML = '<div class="fdw-row"><div class="k">BACKEND DRILL</div><div class="v" style="font-size:13.5px">' + esc(j.label || label) + '</div><div class="s">Served by the feed-destination API</div></div>';
            setTab('chart');
            return;
          }
          runQuery();
        });
    } else { runQuery(); }
    return true;
  }
  function drill(el, fig) {
    var card = cardFromEl(el);
    if (!card) { register(el); card = cardFromEl(el); }
    if (!card || !card.q) return false;
    return openDrill(card, fig || {});
  }
  function drawBars(cv, vals) {
    if (!cv || !vals || !vals.length) return;
    try {
      var x = cv.getContext('2d');
      if (!x) return;
      var W = cv.width, H = cv.height, pad = 46;
      var max = Math.max.apply(null, vals.map(function (v) { return Math.abs(v.value); })) || [1];
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#141414'; x.fillRect(0, 0, W, H);
      var bw = (W - pad * 2) / vals.length;
      vals.forEach(function (v, i) {
        var h = Math.max(3, ((H - pad - 60) * Math.abs(v.value)) / max);
        var bx = pad + i * bw + bw * 0.18, by = H - 48 - h;
        var g = x.createLinearGradient(0, by, 0, by + h);
        g.addColorStop(0, '#e5383b'); g.addColorStop(1, '#7a0d12');
        x.fillStyle = g;
        x.fillRect(bx, by, bw * 0.64, h);
        x.fillStyle = '#fff'; x.font = 'bold 13px Arial'; x.textAlign = 'center';
        x.fillText(String(v.display || '').slice(0, 14), bx + bw * 0.32, by - 6);
        x.fillStyle = '#8a8478'; x.font = '11px Arial';
        x.save();
        x.translate(bx + bw * 0.32, H - 34); x.rotate(-0.5); x.textAlign = 'right';
        x.fillText(String(v.label || '').slice(0, 16), 0, 0);
        x.restore();
      });
    } catch (e) { err('drawBars: ' + (e && e.message)); }
  }

  /* ---------------- 4. ASK KARL — real execution ---------------- */
  function askRun(host, q) {
    q = String(q || '').trim();
    if (!host || !q) return;
    host.innerHTML = '<div class="fdw-sk"></div><div class="fdw-sk"></div>';
    karlQuery(q, 14000).then(function (j) {
      if (!j) {
        host.innerHTML = honestEmpty('RAILS DIDN\u2019T ANSWER', 'Check your connection and try again \u2014 nothing was invented in the meantime.');
        return;
      }
      var fr = factRows(j.facts || []);
      var ans = fr.rows.length
        ? '<b>' + esc(fr.rows[0].value) + '</b> \u2014 ' + esc(fr.rows[0].label) + '. Karl pulled this from the live rails.'
        : ((j.faq && j.faq.length && j.faq[0].answer)
          ? esc(j.faq[0].answer)
          : 'Karl searched the live rails and found <b>no direct match</b> \u2014 try naming a company, person, or industry.');
      var h = '<div class="fdw-q" style="font-size:15px">\u201C' + esc(q) + '\u201D</div><div class="fdw-a">' + ans + '</div>';
      if (fr.rows.length > 1) {
        h += '<div class="fdw-sechd">RECEIPTS</div>' + fr.rows.slice(1, 5).map(rowHTML).join('');
      }
      var rails = (j.rail_status || []).filter(function (r) { return r.live; }).length;
      h += '<div class="fdw-note">Real answer from karl_query \u00B7 template ' + esc(j.template || '?') +
        ' \u00B7 ' + rails + ' live rails' + (j.degraded ? ' \u00B7 degraded' : '') + '.</div>';
      host.innerHTML = h;
    });
  }

  /* ---------------- 5. RELATED — real backend, real shape ---------------- */
  /* Maps the REAL BE response {cards:[{kind,card_id,title,subtitle,
     template_label,href,label}]} and the karl_query `related`
     ([{product,href,label}]) fallback. */
  function relatedRows(j) {
    var out = [];
    if (!j || typeof j !== 'object') return out;
    (j.cards || []).forEach(function (c) {
      if (!c) return;
      if (c.kind === 'creator') {
        out.push({ kind: 'creator', title: String(c.slug || c.title || 'Creator'),
          sub: (c.followers ? fmtN(c.followers) + ' followers \u00B7 ' : '') + 'CREATOR', href: c.href || '' });
      } else if (c.kind === 'karl_connection') {
        out.push({ kind: 'conn', title: String(c.label || ''), sub: String(c.product || 'KARL') + ' CONNECTION', href: c.href || '' });
      } else {
        out.push({ kind: 'card', title: String(c.title || ''), sub: String(c.subtitle || c.template_label || ''),
          cardId: c.card_id || '', query: String(c.title || '') });
      }
    });
    (j.related || []).forEach(function (r) {
      if (r && (r.label || r.href)) out.push({ kind: 'conn', title: String(r.label || r.product || ''), sub: 'KARL PRODUCT', href: r.href || '' });
    });
    return out;
  }
  function loadRelated(host, card) {
    host.innerHTML = '<div class="fdw-sk"></div><div class="fdw-sk"></div><div class="fdw-sk"></div>';
    var q = card.probe || card.q;
    feedGet('/api/karl/related?card=' + encodeURIComponent(card.id), 8000).then(function (j) {
      if (!host.isConnected) return;
      var rows = relatedRows(j);
      if (rows.length) { renderRelated(host, rows); return; }
      karlQuery(q, 10000).then(function (kq) {
        if (!host.isConnected) return;
        var r2 = relatedRows(kq);
        if (!r2.length) {
          try {
            var reg = window.KH_REG || {};
            Object.keys(reg).forEach(function (k) {
              var c = reg[k];
              if (c && c.id !== card.id && c.rail === card.rail && c.q)
                r2.push({ kind: 'card', title: c.q, sub: 'SAME RAIL', cardId: c.id, query: c.q });
            });
          } catch (e) {}
        }
        renderRelated(host, r2);
      });
    });
  }
  function renderRelated(host, rows) {
    if (!rows.length) {
      host.innerHTML = honestEmpty('NOT DRAWN YET', 'Karl hasn\u2019t connected this discovery to others yet. The rails are still building out.');
      return;
    }
    host.innerHTML = rows.slice(0, 8).map(function (r, i) {
      return '<button type="button" class="fdw-rel" data-fdw-rr="' + i + '"><div class="t">' + esc(r.title) + '</div>' +
        (r.sub ? '<div class="s">' + esc(r.sub) + '</div>' : '') + '</button>';
    }).join('');
    host.querySelectorAll('[data-fdw-rr]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = rows[Number(b.getAttribute('data-fdw-rr'))];
        if (!r) return;
        var href = safeUrl(r.href || '');
        if (href) { window.location.href = href; return; }
        if (r.cardId && window.KH_REG && window.KH_REG[r.cardId]) { expandCard(window.KH_REG[r.cardId]); return; }
        askRunSheet(r.title, r.query || r.title);
      });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    try { watch(); } catch (e) { err('boot: ' + (e && e.message)); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PFFeedWire = {
    version: '1.0.0',
    cardIdFor: cardIdFor,
    register: register,
    scan: scan,
    cardFromEl: cardFromEl,
    expand: expand,
    expandCard: expandCard,
    drill: drill,
    openDrill: openDrill,
    askRun: askRun,
    askRunSheet: askRunSheet,
    loadRelated: loadRelated,
    relatedRows: relatedRows,
    karlQuery: karlQuery,
    feedGet: feedGet,
    feedPost: feedPost,
    factRows: factRows,
    timelineOf: timelineOf,
    parseNum: parseNum,
    close: closeSheet,
    toast: toast
  };
})();
