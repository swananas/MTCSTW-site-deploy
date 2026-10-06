/* core/ugc-cartlens.js | PF v1.4.3 | CARTLENS BORROWS for the UGC dopamine layer.
   CEO directive 2026-10-06 ~11:40 CDT ("run it", spec: ugc-dopamine-ranking-20261006.md §8).
   Two additions on top of core/ugc-dopamine.js — this file does NOT modify the
   data-bounties board's code; everything hooks via MutationObserver + events.

   1) SCOUT badge (spec §8b — sparse-area scout targeting): bounty cards whose
      id appears with scout_priority in the ugc_value_rank API render a SCOUT
      badge as the FIRST element of the card — the most prominent badge in the
      card hierarchy. Copy: "SCOUT — thin data here, your report matters most".
      The incentive is for COVERAGE (showing up where data is missing), never
      for the values reported.

   2) Parse-assist "Check my photo" hook (spec §8a): in the photo/price claim
      flow, once the user attaches a photo URL, a "CHECK MY PHOTO" action is
      offered. It POSTs receipt_parse_assist (backend branch be/ugc-cartlens —
      FAIL-SOFT if not live) with { photo_url, manual: { price_cents, item,
      date } }. If the response says suggest_review, a gentle double-check
      prompt appears ("The photo looks like $X but you entered $Y — want to
      fix it?"). The check NEVER blocks submission — the claim SUBMIT button
      is untouched and fully independent. The 📸 provenance badge marks photo
      provenance (counts 1x like every report — never weight) and applies
      regardless of the check outcome.

   Backend contract notes:
   - ugc_value_rank (GET, JSONP, from be/ugc-dopamine-rank): scout flags are
     read defensively — j.scout (array of bounty ids) OR any of j.bounties /
     j.ranked / j.items whose entries carry scout_priority:true with an id
     field (bounty_id | id | bounty). Whatever shape the backend ships, the
     badge renders; if the backend isn't live yet, nothing renders and the
     page works exactly as before.
   - receipt_parse_assist (POST): { photo_url, manual: { price_cents, item,
     date } } via PF.postAction('ugc','ugc_action','receipt_parse_assist',…).
     Response honored shapes: { ok, suggest_review, assist: {
     parsed_price_cents } } (parsed.price_cents also accepted). The $X/$Y
     prompt line renders ONLY when both numbers are real numbers from the
     response + the user's own entry — never invented.

   Copy rules (hard): no "donate", no XP numbers, honest plain copy, no fake
   scarcity/urgency (Psych gate §2f noted — copy is plain by construction).
   Visual: BREATHE tokens via var(--pf-*, hardcoded fallback).
   Mobile-first: buttons are 44px tap targets.
   Reduced motion: honors prefers-reduced-motion (no animation).
   KILL: ?pf_off=ugccartlens */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ugccartlens')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* ---------------- utils ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function lsGet(k, dflt) { try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fmtPrice(cents) {
    var n = Number(cents);
    if (!isFinite(n) || n < 0) return '';
    return '$' + (n / 100).toFixed(2);
  }
  function todayKey() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(Date.now());
    } catch (e) { return ''; }
  }

  /* ---------------- CSS (BREATHE tokens, fallbacks) ---------------- */
  var CSS =
    '.ucl-scout{display:flex;gap:10px;align-items:center;flex-wrap:wrap;' +
    'background:linear-gradient(90deg,var(--pf-red,#c1121f),#7a0b13);' +
    'border:2px solid var(--pf-gold,#e8b923);border-radius:3px;' +
    'padding:10px 12px;margin:0 0 10px;' +
    'font-family:var(--pf-font-body,Arial,sans-serif)}' +
    '.ucl-scout .sk{width:100%;font-size:9px;letter-spacing:4px;color:var(--pf-gold,#e8b923);font-weight:800;margin-bottom:2px}' +
    '.ucl-scout .st{font-family:var(--pf-font-display,"Arial Black",Arial,sans-serif);' +
    'font-size:15px;letter-spacing:3px;color:#fff;font-weight:800;white-space:nowrap}' +
    '.ucl-scout .ss{font-size:12.5px;line-height:1.45;color:var(--pf-cream,#f5ead6)}' +
    '.ucl-checkwrap{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px}' +
    '.ucl-checkbtn{background:transparent;color:var(--pf-gold,#e8b923);' +
    'border:2px solid var(--pf-gold,#e8b923);border-radius:3px;font-weight:800;' +
    'letter-spacing:1.5px;font-size:12.5px;padding:10px 16px;min-height:44px;cursor:pointer;' +
    'font-family:var(--pf-font-body,Arial,sans-serif)}' +
    '.ucl-checkbtn:hover{background:rgba(232,185,35,.12)}' +
    '.ucl-checkbtn:disabled{opacity:.55;cursor:default}' +
    '.ucl-prov{display:inline-flex;align-items:center;gap:6px;font-size:12px;' +
    'color:var(--pf-gold,#e8b923);border:1px solid var(--pf-border,#3a3a3a);' +
    'border-radius:12px;padding:5px 11px;line-height:1.4;white-space:nowrap}' +
    '.ucl-review{margin:8px 0;padding:12px;border:2px solid var(--pf-gold,#e8b923);' +
    'border-left-width:6px;border-radius:3px;background:var(--pf-dark-2,#1a1a1a)}' +
    '.ucl-review .rt{font-size:13px;letter-spacing:2px;font-weight:800;color:var(--pf-gold,#e8b923);margin-bottom:6px}' +
    '.ucl-review .rl{font-size:13.5px;line-height:1.55;color:var(--pf-cream,#f5ead6);margin-bottom:10px}' +
    '.ucl-review .row{display:flex;gap:8px;flex-wrap:wrap}' +
    '.ucl-fix{background:var(--pf-gold,#e8b923);color:#111;border:0;border-radius:3px;' +
    'font-weight:800;letter-spacing:1.5px;font-size:12.5px;padding:10px 16px;min-height:44px;cursor:pointer}' +
    '.ucl-keep{background:transparent;color:var(--pf-muted,#c9bfa8);' +
    'border:1px solid var(--pf-border,#3a3a3a);border-radius:3px;' +
    'font-size:12.5px;padding:10px 16px;min-height:44px;cursor:pointer}' +
    '.ucl-note{font-size:12px;color:var(--pf-muted,#c9bfa8);line-height:1.5;margin:6px 0}' +
    '@media (prefers-reduced-motion: reduce){.ucl-scout{animation:none}}';
  try {
    if (!document.getElementById('pf-ucl-css')) {
      var st = document.createElement('style');
      st.id = 'pf-ucl-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
  } catch (e) {}

  /* ---------------- scout set (from ugc_value_rank) ---------------- */
  var scoutSet = {}; /* bountyId -> true */
  function scoutCount() { return Object.keys(scoutSet).length; }
  function setHas(id) { return !!scoutSet[String(id || '')]; }
  /* Defensive reader: the backend owns the exact JSON shape, so accept every
     reasonable one. Returns an array of bounty-id strings. */
  function scoutIdsFromRank(j) {
    var ids = [];
    function push(id) {
      id = String(id == null ? '' : id).trim();
      if (id && ids.indexOf(id) === -1) ids.push(id);
    }
    if (!j || typeof j !== 'object') return ids;
    if (j.scout && j.scout.length) {
      for (var i = 0; i < j.scout.length; i++) {
        var s = j.scout[i];
        push((s && typeof s === 'object') ? (s.bounty_id || s.id || s.bounty) : s);
      }
    }
    ['bounties', 'ranked', 'items'].forEach(function (key) {
      var list = j[key];
      if (!list || !list.length) return;
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (b && b.scout_priority === true) push(b.bounty_id || b.id || b.bounty);
      }
    });
    return ids;
  }
  function refreshScout(cb) {
    try { jsonp('ugc_value_rank', {}, 9000, function (j) {
      try {
        if (j && j.ok) {
          var ids = scoutIdsFromRank(j);
          var next = {};
          ids.forEach(function (id) { next[id] = true; });
          scoutSet = next;
          lsSet('pf_ucl_scout_v1', { ts: Date.now(), ids: ids });
          scan();
        }
      } catch (e) {}
      if (cb) { try { cb(); } catch (e2) {} }
    }); } catch (e) { if (cb) { try { cb(); } catch (e2) {} } }
  }
  /* Warm start: last known scout set, so badges render even before the first
     poll returns (backend may lag the board's own JSONP). */
  (function warmStart() {
    try {
      var w = lsGet('pf_ucl_scout_v1', null);
      if (w && w.ids && w.ids.length && Date.now() - (w.ts || 0) < 24 * 3600e3) {
        w.ids.forEach(function (id) { scoutSet[String(id)] = true; });
      }
    } catch (e) {}
  })();

  /* ---------------- JSONP (same pattern as core/ugc-dopamine.js) ---------------- */
  var BACKEND = '';
  try { BACKEND = window.PF_BACKEND_URL || ''; } catch (e) {}
  var jsonpSeq = 0;
  function jsonp(action, params, timeoutMs, cb) {
    var done = false;
    function finish(j) {
      if (done) return; done = true;
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      try { delete window[fn]; } catch (e) {}
      try { cb(j); } catch (e) {}
    }
    if (!BACKEND) { setTimeout(function () { finish(null); }, 0); return; }
    var fn = 'pfUclCb' + (++jsonpSeq) + '_' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script');
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }
    q += '&callback=' + fn;
    try { s.src = BACKEND + q; document.head.appendChild(s); } catch (e) { finish(null); return; }
    setTimeout(function () { finish(null); }, timeoutMs || 8000);
  }

  /* ---------------- 1) SCOUT badge ---------------- */
  function scoutBadgeHTML() {
    /* First element of the card = most prominent badge in the card hierarchy. */
    return '<div class="ucl-scout" role="note" aria-label="Scout bounty: thin data in this area">' +
      '<span class="sk">MTCSTW.COM</span>' +
      '<span class="st">SCOUT</span>' +
      '<span class="ss">thin data here, your report matters most</span></div>';
  }
  function injectScoutBadges(host) {
    var n = 0;
    try {
      host = host || $('pf-data-bounties');
      if (!host) return 0;
      var cards = host.querySelectorAll('.db-card');
      for (var i = 0; i < cards.length; i++) {
        (function (card) {
          var bid = card.getAttribute('data-b');
          if (!bid || !setHas(bid)) return;
          if (card.querySelector('.ucl-scout')) return; /* idempotent */
          card.insertAdjacentHTML('afterbegin', scoutBadgeHTML());
          n++;
        })(cards[i]);
      }
    } catch (e) {}
    return n;
  }

  /* ---------------- provenance badge ---------------- */
  function provChipHTML(long) {
    return '<span class="ucl-prov" title="Photo provenance — counted 1\u00D7 like every report. Photos are never weighted.">' +
      '\uD83D\uDCF8 ' + (long ? 'photo attached \u2014 provenance, counted 1\u00D7' : 'provenance') + '</span>';
  }

  /* ---------------- 2) "Check my photo" parse-assist ---------------- */
  function checkWrapHTML() {
    return '<div class="ucl-checkwrap">' +
      '<button type="button" class="ucl-checkbtn" data-ucl-check>CHECK MY PHOTO</button>' +
      provChipHTML(true) + '</div>';
  }
  function photoInput(form) {
    try { return form.querySelector('input[data-f="photo_url"]'); } catch (e) { return null; }
  }
  function photoUrl(form) {
    var inp = photoInput(form);
    var v = inp ? String(inp.value || '').trim() : '';
    return /^https?:\/\//i.test(v) ? v : '';
  }
  /* Ensure the check action + provenance chip exist iff a photo URL is
     attached. Called on input/change (delegated) and on every scan. */
  function syncCheckWraps(host) {
    try {
      host = host || $('pf-data-bounties');
      if (!host) return 0;
      var n = 0;
      var forms = host.querySelectorAll('.db-claim');
      for (var i = 0; i < forms.length; i++) {
        (function (form) {
          var url = photoUrl(form);
          var wrap = form.querySelector('.ucl-checkwrap');
          if (url && !wrap) {
            /* Anchor the wrap right after the photo URL input so the action
               reads as part of attaching the photo. */
            var inp = photoInput(form);
            var d = document.createElement('div');
            d.innerHTML = checkWrapHTML();
            var w = d.firstChild;
            if (inp && inp.parentNode && inp.nextSibling) inp.parentNode.insertBefore(w, inp.nextSibling);
            else if (inp && inp.parentNode) inp.parentNode.appendChild(w);
            else form.insertBefore(w, form.firstChild);
            n++;
          } else if (!url && wrap && wrap.parentNode) {
            wrap.parentNode.removeChild(wrap);
          }
        })(forms[i]);
      }
      return n;
    } catch (e) { return 0; }
  }
  /* Mark provenance on already-rendered claim rows (server data: the row
     already shows a "view photo" link when a photo was claimed). */
  function syncRowProvenance(host) {
    var n = 0;
    try {
      host = host || $('pf-data-bounties');
      if (!host) return 0;
      var rows = host.querySelectorAll('.db-claimrow');
      for (var i = 0; i < rows.length; i++) {
        (function (row) {
          if (!row.querySelector('.db-plink')) return;
          if (row.querySelector('.ucl-prov')) return;
          var d = document.createElement('span');
          d.innerHTML = provChipHTML(false);
          row.appendChild(d.firstChild);
          n++;
        })(rows[i]);
      }
    } catch (e) {}
    return n;
  }
  function collectManual(form, card) {
    var manual = {};
    try {
      var inps = form.querySelectorAll('.db-in');
      for (var i = 0; i < inps.length; i++) {
        var f = inps[i].getAttribute('data-f'), v = String(inps[i].value || '').trim();
        if (!v) continue;
        if (f === 'price_cents') { var pc = Math.round(Number(v)); if (pc > 0) manual.price_cents = pc; }
        else if (f === 'taken_at') manual.date = v;
      }
      if (card) {
        var t = card.querySelector('.db-title');
        if (t) manual.item = String(t.textContent || '').trim().slice(0, 120);
      }
      if (!manual.date) manual.date = todayKey();
    } catch (e) {}
    return manual;
  }
  /* The gentle double-check prompt. $X/$Y render ONLY when both are real
     numbers from the response + the user's own entry — honest copy. */
  function reviewLine(j, manualCents) {
    var px = NaN, mc = Number(manualCents);
    try {
      var a = (j && j.assist) || {};
      var raw = a.parsed_price_cents != null ? a.parsed_price_cents : a.price_cents;
      px = Number(raw);
    } catch (e) {}
    if (isFinite(px) && px > 0 && isFinite(mc) && mc > 0 && px !== mc) {
      return 'The photo looks like ' + fmtPrice(px) + ' but you entered ' + fmtPrice(mc) + ' \u2014 want to fix it?';
    }
    return 'The photo and your entry don\u2019t quite line up \u2014 want to double-check your entry?';
  }
  function showReview(form, j, manual) {
    try {
      var old = form.querySelector('.ucl-review');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var d = document.createElement('div');
      d.innerHTML = '<div class="ucl-review" role="alert">' +
        '<div class="rt">DOUBLE-CHECK?</div>' +
        '<div class="rl">' + esc(reviewLine(j, manual.price_cents)) + '</div>' +
        '<div class="row">' +
        '<button type="button" class="ucl-fix" data-ucl-fix>FIX IT</button>' +
        '<button type="button" class="ucl-keep" data-ucl-keep>KEEP AS-IS</button>' +
        '</div></div>';
      var panel = d.firstChild;
      /* The check never blocks submission: it docks right above the claim
         SUBMIT button and the SUBMIT stays fully independent. */
      var submit = form.querySelector('[data-act="claim"]');
      if (submit && submit.parentNode) submit.parentNode.insertBefore(panel, submit);
      else form.appendChild(panel);
      var fix = panel.querySelector('[data-ucl-fix]');
      if (fix) fix.addEventListener('click', function () {
        var pf = form.querySelector('input[data-f="price_cents"]');
        if (pf) { try { pf.focus(); pf.select(); } catch (e2) {} }
        try { if (panel.parentNode) panel.parentNode.removeChild(panel); } catch (e3) {}
      });
      var keep = panel.querySelector('[data-ucl-keep]');
      if (keep) keep.addEventListener('click', function () {
        try { if (panel.parentNode) panel.parentNode.removeChild(panel); } catch (e4) {}
      });
    } catch (e) {}
  }
  function showNote(form, text) {
    try {
      var old = form.querySelector('.ucl-note');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var d = document.createElement('div');
      d.innerHTML = '<div class="ucl-note">' + esc(text) + '</div>';
      var submit = form.querySelector('[data-act="claim"]');
      if (submit && submit.parentNode) submit.parentNode.insertBefore(d.firstChild, submit);
      else form.appendChild(d.firstChild);
      setTimeout(function () {
        try { var n = form.querySelector('.ucl-note'); if (n && n.parentNode) n.parentNode.removeChild(n); } catch (e2) {}
      }, 9000);
    } catch (e) {}
  }
  function runCheck(btn) {
    try {
      var form = btn.closest ? btn.closest('.db-claim') : null;
      if (!form) return;
      var card = form.closest ? form.closest('.db-card') : null;
      var url = photoUrl(form);
      if (!url) return;
      var manual = collectManual(form, card);
      /* POST receipt_parse_assist. Fail-soft: PF.postAction calls back null
         on network failure / no backend — the flow degrades to a quiet note. */
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'CHECKING\u2026';
      function restore() {
        try { btn.disabled = false; btn.textContent = label; } catch (e) {}
      }
      var payload = { photo_url: url, manual: manual };
      var answered = false;
      function onResp(j) {
        if (answered) return; answered = true;
        restore();
        try {
          if (j && j.ok && j.suggest_review === true) {
            showReview(form, j, manual);
          } else if (!j || !j.ok) {
            showNote(form, 'Photo check isn\u2019t available right now \u2014 your submission works the same either way.');
          }
          /* suggest_review false / absent: nothing to say. The 📸 provenance
             chip is already there — it applies regardless of the outcome. */
        } catch (e) {}
      }
      if (PF && PF.postAction) {
        PF.postAction('ugc', 'ugc_action', 'receipt_parse_assist', payload, onResp);
        /* Belt-and-braces timeout: a hung helper must not strand the button. */
        setTimeout(function () { if (!answered) onResp(null); }, 16000);
      } else {
        restore();
        showNote(form, 'Photo check isn\u2019t available right now \u2014 your submission works the same either way.');
      }
    } catch (e) {}
  }

  /* ---------------- scan (idempotent) ---------------- */
  function scan() {
    try {
      var host = $('pf-data-bounties');
      wireHost(host); /* the board may have mounted after boot */
      injectScoutBadges(host);
      syncCheckWraps(host);
      syncRowProvenance(host);
    } catch (e) {}
  }

  /* ---------------- board wire ---------------- */
  /* Delegated listeners attach to the board host on first sight (the board
     renders async via JSONP, so it may not exist at boot). Idempotent. */
  function wireHost(host) {
    try {
      if (!host || host._uclWired) return;
      host._uclWired = true;
      host.addEventListener('input', function (ev) {
        try {
          var t = ev.target;
          if (t && t.getAttribute && t.getAttribute('data-f') === 'photo_url') kick();
        } catch (e) {}
      });
      host.addEventListener('change', function (ev) {
        try {
          var t = ev.target;
          if (t && t.getAttribute && t.getAttribute('data-f') === 'photo_url') kick();
        } catch (e) {}
      });
      host.addEventListener('click', function (ev) {
        try {
          var t = ev.target;
          if (t && t.getAttribute && t.getAttribute('data-ucl-check') != null) {
            /* Deliberately NOT preventDefault on anything else — the claim
               SUBMIT path is the board's own and stays untouched. */
            runCheck(t);
          }
        } catch (e) {}
      });
    } catch (e) {}
  }
  var deb = null;
  function kick() {
    if (deb) return;
    deb = setTimeout(function () { deb = null; scan(); }, 150);
  }
  function wire() {
    try {
      /* Watch the board itself if mounted, plus the body so late-mounted
         boards (async JSONP render) are caught. Never touches the board's
         own code. */
      wireHost($('pf-data-bounties'));
      var MO = window.MutationObserver;
      if (MO) {
        new MO(kick).observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    } catch (e) {}
    setTimeout(scan, 500);
  }

  /* ---------------- public API ---------------- */
  PF.UGCCartLens = {
    version: '1.0.0',
    refreshScout: refreshScout,
    scan: scan,
    scoutIdsFromRank: scoutIdsFromRank,
    scoutBadgeHTML: scoutBadgeHTML,
    reviewLine: reviewLine,
    fmtPrice: fmtPrice,
    /* test-only surface */
    _t: {
      scoutCount: scoutCount, setHas: setHas, injectScoutBadges: injectScoutBadges,
      syncCheckWraps: syncCheckWraps, syncRowProvenance: syncRowProvenance,
      collectManual: collectManual, photoUrl: photoUrl, runCheck: runCheck,
      reduced: reduced
    }
  };

  /* ---------------- boot ---------------- */
  try {
    wire();
    setTimeout(function () { try { refreshScout(); } catch (e) {} }, 2500);
    setInterval(function () {
      try { if (document.visibilityState !== 'hidden') refreshScout(); } catch (e) {}
    }, 120000);
  } catch (e) {}
})();
