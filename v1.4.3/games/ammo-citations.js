/* games/ammo-citations.js  |  PF v1.4.3 | AMMO FINDER — OFFICIAL FIGURES (S-11)
   + RELEASE-DAY PROMPTS (S-28). Wave A3.
   S-11: the four citable FRED series (CPIAUCNS, CPILFESL, PCEPI,
   MORTGAGE30US) as copy-ready citation cards — headline, talking point,
   source stamp (series ID, SA/NSA, retrieval/vintage date, FRED link).
   Official figures only; never blended with crowdsourced data.
   S-28: on CPI days and jobs days, a nudge strip hands creators the fresh
   figure with a one-tap citation grab. Distribution only — this module
   grants nothing, mints nothing, and touches no points rails. Posting
   still flows through the existing content legs with their own caps.
   Display/utility only — no points calls, no points-adjacent logic
   anywhere in this file.
   ---- BACKEND CONTRACT (CONFIRMED, 2026-10-05) ----
   be/fred-creator (?action=fred_citations, JSONP, public, read-only):
     {ok, fred_live, retrieved_at, citations:[{series_id, title, frequency,
      sa_nsa, period, period_label, value, value_label, change_basis,
      change_pct, change_pct_label, headline, talking_point, citation,
      source, source_url, retrieved_at, vintage_date, stale, stale_note}],
      pending_series:[...], note}
   be/fred-creator (?action=fred_release_prompts, JSONP, public, read-only):
     {ok, fred_live, retrieved_at, release_window_days:7,
      prompts:[{kind, series_id, headline, figure, copy, cta, target,
      days_since_release, stale, period_label, source_url, vintage_date,
      retrieved_at}], note}
   fred_live:false / empty arrays are honest states, never errors.
   KILL: ?pf_off=ammo-figures  or  localStorage pf_disabled_v1='["ammo-figures"]'
   KILL: ?pf_off=release-prompts  (nudge strip only — citations stay up)
   The nudge's CTA scrolls to the citations block, so killing ammo-figures
   takes the nudge with it. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ammo-figures')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href0 = window.location.href || '';
    if (href0.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  /* Mount: Creator HQ, right after the Ammo Finder (#pf-ammo). Fallback:
     right after #pf-war-card (the Creator HQ anchor). Neither anchor
     anywhere -> a visible error banner, never a silent no-op. */
  var mount = document.getElementById('pf-ammo');
  var fellBack = false;
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      try { console.warn('[PF figures] #pf-ammo missing — fell back to the #pf-war-card anchor.'); } catch (e0b) {}
      mount = document.createElement('div');
      mount.id = 'pf-figures-anchor';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
      fellBack = true;
    } else {
      try {
        var fail = document.createElement('div');
        fail.id = 'pf-figures-missing';
        fail.setAttribute('role', 'alert');
        fail.style.cssText = 'background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;' +
          'font:bold 14px Arial,sans-serif;padding:16px;margin:12px;';
        fail.textContent = 'OFFICIAL FIGURES HAS NOWHERE TO MOUNT — ' +
          'add <div id="pf-ammo"></div> or <div id="pf-war-card"></div> to the Creator HQ page.';
        if (document.body) document.body.insertBefore(fail, document.body.firstChild);
      } catch (e0c) {}
      return;
    }
  }

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* Clipboard, same two-tier pattern as the Ammo Finder: navigator.clipboard
     first, hidden-textarea execCommand fallback. No copy tracking — this
     module keeps no ledger and awards nothing. */
  function copyText(txt, btn, msg) {
    function doneOk() {
      toast(msg || 'Citation copied. Go make it hurt.');
      if (btn) {
        var o = btn.textContent;
        btn.textContent = 'COPIED';
        btn.disabled = true;
        setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
      } else { fallback(); }
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }
  /* JSONP loader, same pattern as the macro strip: backend callback name
     validated by the worker's identifier-path check server-side. */
  function api(action, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFigCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    s.src = BACKEND + '?action=' + encodeURIComponent(action) + '&callback=' + fn;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }
  /* http(s) URLs only — a citation link never becomes a javascript: link. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : null;
  }
  /* Epoch-ms -> 'OCT 5, 2026'. null when unparseable (never a guessed date). */
  function fmtRetrieved(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }

  var CSS =
    '#pf-figures{font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-figures .fig-shell{border-top:1px solid #3a3a3a;margin-top:18px;padding-top:14px}' +
    '#pf-figures h2{font:bold 20px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}' +
    '#pf-figures .fig-tag{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:0 0 12px}' +
    '#pf-figures .fig-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:0 0 12px;letter-spacing:.5px}' +
    '#pf-figures .fig-empty{border:1px dashed #3a3a3a;border-radius:2px;padding:26px 16px;text-align:center}' +
    '#pf-figures .fig-empty h4{font:bold 15px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}' +
    '#pf-figures .fig-empty p{font:400 14px/1.6 Arial;color:#b8a98a;margin:0}' +
    '#pf-figures .fig-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:16px;font:400 14px/1.6 Arial;margin:8px 0}' +
    '#pf-figures .fig-err button{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}' +
    '#pf-figures .fig-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #e8b923;' +
      'padding:14px 16px;margin:0 0 12px}' +
    '#pf-figures .fig-head{font:bold 15px/1.4 Arial;color:#fff;margin:0 0 6px;letter-spacing:1px}' +
    '#pf-figures .fig-tp{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-figures .fig-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}' +
    '#pf-figures .fig-src a{color:#e8b923;text-decoration:underline}' +
    '#pf-figures .fig-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
    '#pf-figures .fig-copybtn{background:transparent;border:1px solid #e8b923;color:#fff;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '#pf-figures .fig-copybtn:hover{background:#e8b923;color:#000}' +
    '#pf-figures .fig-copybtn:disabled{opacity:.45;cursor:not-allowed}' +
    '#pf-figures .fig-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:8px 0}' +
    '#pf-figures .fig-pend{font:400 12px/1.5 Arial;color:#b8a98a;margin:10px 0 0;letter-spacing:.5px}' +
    '#pf-prompts .pr-strip{background:#1a0505;border:1px solid #c1121f;border-left:6px solid #c1121f;' +
      'padding:14px 16px;margin:14px 0;font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-prompts .pr-head{font:bold 15px/1.4 Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}' +
    '#pf-prompts .pr-fig{font:bold 18px/1.4 Arial;color:#ff6b6b;margin:0 0 6px}' +
    '#pf-prompts .pr-copy{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-prompts .pr-meta{font:400 11px/1.5 Arial;color:#8a7f66;letter-spacing:.5px;margin:0 0 10px}' +
    '#pf-prompts .pr-actions{display:flex;gap:8px;flex-wrap:wrap}' +
    '#pf-prompts .pr-cta{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-prompts .pr-cta:hover{background:#e01a28}' +
    '#pf-prompts .pr-dismiss{background:transparent;border:1px solid #555;color:#b8a98a;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '@media(max-width:560px){#pf-prompts .pr-cta{width:100%}}';

  function mountShell() {
    var wrap = document.createElement('div');
    wrap.id = 'pf-figures';
    wrap.innerHTML = '<style>' + CSS + '</style>' +
      '<div id="pf-prompts" aria-live="polite"></div>' +
      '<div class="fig-shell" id="pf-figures-shell">' +
      '<h2>OFFICIAL FIGURES</h2>' +
      '<div class="fig-tag">Citable U.S. macro sources for your claims — series, source, and retrieval date on every one.</div>' +
      '<div id="xFigures" aria-live="polite"></div>' +
      '</div>';
    if (fellBack) { mount.appendChild(wrap); }
    else { mount.parentNode.insertBefore(wrap, mount.nextSibling); }
    return wrap;
  }
  var shell = mountShell();
  var xPrompts = document.getElementById('pf-prompts');
  var xFigures = document.getElementById('xFigures');

  /* Per-prompt dismiss: a dismissed kind stays dismissed for the session
     (stored as a JSON array so CPI + jobs dismiss independently). */
  function dismissedKinds() {
    try {
      var raw = sessionStorage.getItem('pf_prompts_dismissed_v1');
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function dismissPrompt(key) {
    try {
      var arr = dismissedKinds();
      if (arr.indexOf(key) === -1) arr.push(key);
      sessionStorage.setItem('pf_prompts_dismissed_v1', JSON.stringify(arr));
    } catch (e) {}
    try {
      var strips = xPrompts.querySelectorAll('[data-pr-kind="' + key + '"]');
      for (var i = 0; i < strips.length; i++) strips[i].remove();
    } catch (e2) {}
  }
  function isDismissed(key) { return dismissedKinds().indexOf(String(key)) !== -1; }

  function stamp(c) {
    var parts = ['FRED', c.series_id || '', c.sa_nsa || ''];
    var ret = fmtRetrieved(c.retrieved_at);
    if (ret) parts.push('RETRIEVED ' + ret);
    return parts.filter(Boolean).join(' \u00b7 ');
  }

  /* ---------------- S-28: release-day nudge strip ---------------- */
  function renderPrompts(j) {
    if (PF.skip('release-prompts')) return;
    if (!j || !j.ok || !Array.isArray(j.prompts) || !j.prompts.length) return;
    var h = '';
    for (var i = 0; i < j.prompts.length; i++) {
      var p = j.prompts[i] || {};
      if (isDismissed(p.kind)) continue;
      var link = safeUrl(p.source_url);
      h += '<div class="pr-strip" role="status" data-pr-kind="' + esc(p.kind || 'x') + '">' +
        '<div class="pr-head">' + esc(p.headline || 'FRESH FIGURE') + '</div>' +
        '<div class="pr-fig">' + esc(p.figure || '') + '</div>' +
        '<div class="pr-copy">' + esc(p.copy || '') + '</div>' +
        '<div class="pr-meta">' + esc(stamp({ series_id: p.series_id, sa_nsa: '', retrieved_at: p.retrieved_at })) +
        (link ? ' \u00b7 <a href="' + esc(link) + '" target="_blank" rel="noopener" style="color:#e8b923">FRED</a>' : '') +
        '</div>' +
        '<div class="pr-actions">' +
        '<button type="button" class="pr-cta" data-pr-cta="' + i + '">' + esc(p.cta || 'GRAB THE CITATION') + '</button>' +
        '<button type="button" class="pr-dismiss" data-pr-dismiss="' + esc(p.kind || 'x') + '" aria-label="Dismiss this release-day prompt">DISMISS</button>' +
        '</div></div>';
    }
    if (!h) return;
    xPrompts.innerHTML = h;
  }

  /* Prompt-strip clicks: bound ONCE at module scope (never re-bound on
     re-render — no listener stacking). */
  xPrompts.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var ci = t.getAttribute('data-pr-cta');
    if (ci !== null && ci !== undefined && ci !== '') {
      var tgt = document.getElementById('pf-figures');
      if (tgt && tgt.scrollIntoView) { try { tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { try { tgt.scrollIntoView(); } catch (e2) {} } }
      return;
    }
    var di = t.getAttribute('data-pr-dismiss');
    if (di) dismissPrompt(di);
  });

  /* ---------------- S-11: citation cards ---------------- */
  function citationCard(c) {
    var link = safeUrl(c.source_url);
    var head;
    if (c.stale) {
      head = '<div class="fig-stale">FIGURE STALE \u2014 DO NOT CITE</div>' +
        '<div class="fig-tp">' + esc(c.stale_note || 'Last updated \u2014 refresh pending.') + '</div>';
    } else {
      head = '<div class="fig-head">' + esc(c.headline || c.title || '') + '</div>' +
        '<div class="fig-tp">' + esc(c.talking_point || '') + '</div>';
    }
    return '<div class="fig-card">' + head +
      '<div class="fig-src">' + esc(stamp(c)) + '<br>' + esc(c.source || '') +
      (link ? ' \u00b7 <a href="' + esc(link) + '" target="_blank" rel="noopener">View on FRED</a>' : '') + '</div>' +
      '<div class="fig-actions">' +
      '<button type="button" class="fig-copybtn" data-fig-copy="' + esc(c.series_id || '') + '"' +
      (c.stale || !c.citation ? ' disabled' : '') + ' aria-label="Copy citation for ' + esc(c.series_id || '') + '">' +
      (c.stale ? 'STALE \u2014 NO CITATION' : 'COPY CITATION') + '</button>' +
      '</div></div>';
  }

  function renderCitations(j) {
    if (!j || !j.ok) { renderFigError(); return; }
    var live = !!j.fred_live;
    var cits = Array.isArray(j.citations) ? j.citations : [];
    if (!live) {
      xFigures.innerHTML = '<div class="fig-empty"><h4>OFFICIAL FIGURES NOT CONNECTED YET</h4>' +
        '<p>' + esc(j.note || 'The FRED API key hand-step is still open. Figures appear once the official feed is connected. Nothing here is estimated or seeded.') + '</p></div>';
      return;
    }
    if (!cits.length) {
      xFigures.innerHTML = '<div class="fig-empty"><h4>FEED CONNECTED \u2014 FIRST REFRESH PENDING</h4>' +
        '<p>' + esc(j.note || 'The official feed is connected and the first data refresh is still on its way. Nothing here is estimated or seeded.') + '</p></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < cits.length; i++) h += citationCard(cits[i] || {});
    var pend = Array.isArray(j.pending_series) ? j.pending_series.filter(Boolean) : [];
    if (pend.length) {
      h += '<div class="fig-pend">Still on the way: ' + esc(pend.join(', ')) +
        ' \u2014 figures appear once ingest lands them.</div>';
    } else if (j.note) {
      h += '<div class="fig-pend">' + esc(j.note) + '</div>';
    }
    xFigures.innerHTML = h;
  }
  function renderFigError() {
    xFigures.innerHTML = '<div class="fig-err" role="alert">Official figures are down right now. Try again in a bit.' +
      '<br><button type="button" data-fig-retry="1">RETRY</button></div>';
  }

  /* copy + retry delegation (single listener; survives re-renders) */
  xFigures.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var sid = t.getAttribute('data-fig-copy');
    if (sid) {
      var card = null;
      for (var i = 0; i < (figState.cits || []).length; i++) {
        if ((figState.cits[i] || {}).series_id === sid) { card = figState.cits[i]; break; }
      }
      if (card && card.citation) copyText(card.citation, t);
      return;
    }
    if (t.getAttribute('data-fig-retry')) { loadCitations(); }
  });

  var figState = { cits: [] };
  function loadCitations() {
    xFigures.innerHTML = '<div class="fig-empty"><h4>LOADING OFFICIAL FIGURES\u2026</h4></div>';
    api('fred_citations', function (j) {
      try {
        if (j && j.ok) {
          figState.cits = j.citations || [];
          renderCitations(j);
        } else renderFigError();
      } catch (e) { renderFigError(); }
    });
  }
  function loadPrompts() {
    if (PF.skip('release-prompts')) return;
    api('fred_release_prompts', function (j) {
      try { renderPrompts(j); } catch (e) {}
    });
  }

  loadCitations();
  loadPrompts();
})();
