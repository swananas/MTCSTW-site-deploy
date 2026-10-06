/* core/ugc-asks.js  |  PF v1.4.3 | UGC ASK INJECTOR (CEO directive 2026-10-06).
   Spec: ~/workspace/specs/ugc-dopamine-ranking-20261006.md §4 (opportunity map),
   §3a-i (gas-price first-class flow), §7 (stacked ask bundles for political actions).
   WHAT: small contextual ask cards (icon, one line of copy, CTA) mounted at the
   mapped P0/P1 points. Every CTA deep-links into the EXISTING bounty claim UI —
   no parallel intake paths. If the bounty board is on the page the CTA jumps to
   #pf-data-bounties with kind+target prefill; otherwise it links to the board
   page (/create) with pf_kind/pf_target params the board-page handshake applies.
   ANTI-NAG: an ask is suppressed where the user already contributed
   (localStorage marker set on claim/confirm success); max 2 DISTINCT asks per
   surface per session; dismissed asks stay dismissed (localStorage). Asks sit
   below/after content — never modals, never blocking (empty states excepted,
   where the ask IS the content).
   COORDINATION: this module owns ask cards. It does NOT route — the Next Move
   engine owns routing priority. If PF.nextMove.ownsSurface(surface) claims a
   surface, injection there is skipped. Integration point for the dopamine
   module: dispatch document CustomEvent 'pf-ugc-contributed' {key}.
   VISUAL: BREATHE system tokens (fallbacks included), mobile-first, 44px+
   touch targets, reduced-motion safe.
   KILL: ?pf_off=ugcasks  or  localStorage pf_disabled_v1='["ugcasks"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ugcasks')) { return; }

  /* ---------------- config ---------------- */
  var KILL = 'ugcasks';
  var BOARD_URL = '/create';              /* canonical bounty board page */
  var BOARD_ANCHOR = 'pf-data-bounties';
  var LS_CONTRIB = 'pf_ugc_contrib_v1';   /* {askKey: ts} — already contributed */
  var LS_DISMISS = 'pf_ugc_dismiss_v1';   /* {askKey: ts} — dismissed, stays dismissed */
  var SS_PREFILL = 'pf_ugc_prefill';      /* {kind,target,cell} one-shot deep-link prefill */
  var SS_SEEN = 'pf_ugc_seen_v1';         /* {surface:{askKey:1}} session frequency cap */
  var SS_ROT = 'pf_ugc_wr_rot';           /* war-report footer rotation cursor */
  var MAX_DISTINCT_PER_SURFACE = 2;

  /* Bounty kind labels (mirrors games/data-bounties.js + §3a/§7c new kinds). */
  var KIND_LABEL = {
    gas_price: 'GAS PRICE', commodity_confirm: 'COMMODITY CHECK',
    crowd_confirm: 'CROWD CONFIRM', cpi_price: 'PRICE CHECK',
    prediction_resolve: 'CONFIRM OUTCOME', raid_report: 'RAID REPORT',
    intel_corroborate: 'CORROBORATE INTEL', review_needed: 'REVIEW NEEDED',
    event_attendance: 'ATTENDANCE', roster_correction: 'ROSTER FIX',
    photo_evidence: 'PHOTO BOUNTY'
  };
  function kindFromLabel(label) {
    label = String(label || '').trim().toUpperCase();
    for (var k in KIND_LABEL) { if (KIND_LABEL[k] === label) return k; }
    return '';
  }

  /* ---------------- ask table ----------------
     line may contain [area] (replaced with coarse area or 'your sector'). */
  var ASKS = {
    gas: {
      key: 'gas', kind: 'gas_price', icon: '\u26FD', kicker: 'FIELD ASK \u00B7 GAS',
      line: 'Seen a gas price today? <b>15 seconds</b> \u2192',
      sub: 'Snap the sign for premium confirmation \u2192', subKind: 'photo_evidence',
      cta: 'REPORT GAS PRICE \u2192',
      surfaces: ['economy', 'warreport', 'cells', 'price-empty']
    },
    warreport_photos: {
      key: 'warreport_photos', kind: 'photo_evidence', icon: '\uD83D\uDCF8', kicker: 'FIELD ASK',
      line: 'Were you there? <b>Send your field photos</b> \u2192',
      cta: 'SEND PHOTOS \u2192', surfaces: ['warreport']
    },
    cpi_thin: {
      key: 'cpi_thin', kind: 'cpi_price', icon: '\uD83E\uDDFE', kicker: 'PRICE GAP',
      line: 'We need <b>3 prices</b> in your area. Be the first \u2192',
      cta: 'REPORT A PRICE \u2192', surfaces: ['economy']
    },
    event_photos: {
      key: 'event_photos', kind: 'photo_evidence', icon: '\uD83D\uDCF8', kicker: 'FIELD ASK',
      line: 'Upload your photos \u2192',
      cta: 'UPLOAD PHOTOS \u2192', surfaces: ['events']
    },
    empty_intel: {
      key: 'empty_intel', kind: 'intel_corroborate', icon: '\uD83D\uDCFB', kicker: 'INTEL GAP',
      line: 'No reports yet \u2014 <b>be the first</b> \u2192',
      cta: 'DROP INTEL \u2192', surfaces: ['intel-empty']
    },
    empty_raid: {
      key: 'empty_raid', kind: 'raid_report', icon: '\u2694\uFE0F', kicker: 'AFTER-ACTION GAP',
      line: 'No reports yet \u2014 <b>be the first</b> \u2192',
      cta: 'FILE RAID REPORT \u2192', surfaces: ['raid-empty']
    },
    empty_pledge: {
      key: 'empty_pledge', kind: '', icon: '\u270A', kicker: 'WALL IS QUIET',
      line: 'No pledges yet \u2014 <b>be the first</b> \u2192',
      cta: 'MAKE YOUR PLEDGE \u2192', surfaces: ['pledge-empty'], hrefSelf: true
    },
    pred_evidence: {
      key: 'pred_evidence', kind: 'intel_corroborate', icon: '\uD83D\uDD0D', kicker: 'BACK YOUR CALL',
      line: 'Add your <b>evidence</b> for this call \u2192',
      cta: 'ADD EVIDENCE \u2192', surfaces: ['predgame']
    },
    academy_work: {
      key: 'academy_work', kind: '', icon: '\uD83D\uDEE0\uFE0F', kicker: 'SHOW YOUR WORK',
      line: 'Lesson banked. <b>Show your work</b> \u2192',
      cta: 'SUBMIT TO CONTENT BANK \u2192',
      href: '/create#pf-review-pool', surfaces: ['academy']
    },
    cell_intel: {
      key: 'cell_intel', kind: 'intel_corroborate', icon: '\uD83D\uDCFB', kicker: 'CELL ASK',
      line: 'Your cell needs intel in <b>[area]</b> \u2192',
      cta: 'DROP INTEL \u2192', surfaces: ['cells']
    }
  };

  /* §7 stacked legs for political actions. kind -> bounty claim flow. */
  var LEGS = [
    { leg: 1, key: 'event_leg1', kind: 'event_attendance', icon: '\u270B', label: 'CHECK IN', desc: 'RSVP / check in at the action' },
    { leg: 2, key: 'event_leg2', kind: 'photo_evidence', icon: '\uD83D\uDCF8', label: 'SNAP PHOTOS', desc: 'Photos from the streets' },
    { leg: 3, key: 'event_leg3', kind: 'crowd_confirm', icon: '\uD83D\uDC65', label: 'CONFIRM THE CROWD', desc: 'Turnout estimate + photo' },
    { leg: 4, key: 'event_leg4', kind: 'event_attendance', icon: '\uD83D\uDEE1\uFE0F', label: 'REP YOUR CELL', desc: 'Cell showing \u2014 roll up together', cell: true }
  ];

  /* ---------------- storage helpers ---------------- */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k) || '{}'); } catch (e) { return {}; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function hasContributed(key) { return !!lsGet(LS_CONTRIB)[key]; }
  function recordContribution(key) {
    if (!key) return;
    var m = lsGet(LS_CONTRIB); m[key] = Date.now(); lsSet(LS_CONTRIB, m);
  }
  function isDismissed(key) { return !!lsGet(LS_DISMISS)[key]; }
  function dismiss(key) {
    if (!key) return;
    var m = lsGet(LS_DISMISS); m[key] = Date.now(); lsSet(LS_DISMISS, m);
  }
  function markKindContributed(kind) {
    if (!kind) return;
    Object.keys(ASKS).forEach(function (k) { if (ASKS[k].kind === kind) recordContribution(k); });
    LEGS.forEach(function (L) { if (L.kind === kind) recordContribution(L.key); });
  }

  /* ---------------- anti-nag gate ---------------- */
  function nextMoveOwns(surface) {
    try {
      if (PF.nextMove && typeof PF.nextMove.ownsSurface === 'function' && PF.nextMove.ownsSurface(surface)) return true;
    } catch (e) {}
    return false;
  }
  function canShow(key, surface) {
    if (!key || !surface) return false;
    if (isDismissed(key) || hasContributed(key)) return false;
    if (nextMoveOwns(surface)) return false;
    var seen = ssGet(SS_SEEN);
    var s = seen[surface] || {};
    if (!s[key] && Object.keys(s).length >= MAX_DISTINCT_PER_SURFACE) return false;
    return true;
  }
  function markShown(key, surface) {
    var seen = ssGet(SS_SEEN);
    seen[surface] = seen[surface] || {};
    seen[surface][key] = 1;
    ssSet(SS_SEEN, seen);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(id, doc) { try { return (doc || document).getElementById(id); } catch (e) { return null; } }

  /* ---------------- BREATHE-styled CSS (injected once) ---------------- */
  var CSS_ID = 'pf-ugc-asks-css';
  function injectCSS(doc) {
    doc = doc || document;
    try {
      if (doc.getElementById(CSS_ID)) return;
      var st = doc.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '.pf-ask{--ask-red:var(--pf-red,#c1121f);--ask-gold:var(--pf-gold,#e8b923);' +
        '--ask-cream:var(--pf-cream,#f5ead6);--ask-muted:var(--pf-muted,#a89e88);' +
        'background:#0d0d0d;border:2px solid #2a2a2a;border-left:6px solid var(--ask-red);' +
        'border-radius:6px;padding:18px 16px;margin:22px 0;box-sizing:border-box;' +
        'max-width:640px;font-family:Arial,Helvetica,sans-serif}' +
        '.pf-ask-kicker{font-size:11px;letter-spacing:4px;color:var(--ask-gold);' +
        'font-weight:800;margin-bottom:8px}' +
        '.pf-ask-line{font-size:16px;line-height:1.5;color:var(--ask-cream);margin:0 0 6px}' +
        '.pf-ask-line b{color:#fff}' +
        '.pf-ask-sub{font-size:13px;color:var(--ask-muted);margin:2px 0 12px;line-height:1.5}' +
        '.pf-ask-sub a{color:var(--ask-gold);font-weight:700;text-decoration:underline}' +
        '.pf-ask-row{display:flex;gap:10px;align-items:center;margin-top:12px}' +
        '.pf-ask-cta{display:inline-block;background:var(--ask-red);color:#fff!important;' +
        'font-weight:800;font-size:14px;letter-spacing:1px;padding:13px 22px;' +
        'min-height:48px;line-height:1.3;text-decoration:none;border-radius:4px;' +
        'box-sizing:border-box;text-align:center}' +
        '.pf-ask-cta:active{background:#8f0d17}' +
        '.pf-ask-x{margin-left:auto;background:transparent;border:1px solid #3a3a3a;' +
        'color:var(--ask-muted);width:44px;height:44px;border-radius:4px;font-size:16px;' +
        'cursor:pointer;flex:0 0 auto}' +
        '.pf-ask-foot{font-size:10px;letter-spacing:2px;color:#6b6252;margin-top:12px}' +
        '.pf-ask-legs{list-style:none;margin:14px 0 0;padding:0;display:flex;' +
        'flex-direction:column;gap:8px}' +
        '.pf-ask-leg{display:flex;gap:10px;align-items:center;background:#141414;' +
        'border:1px solid #2a2a2a;border-radius:4px;padding:10px 12px;' +
        'font-size:14px;color:var(--ask-cream);box-sizing:border-box}' +
        '.pf-ask-leg.pf-leg-em{border-color:var(--ask-gold);background:#1a1408}' +
        '.pf-ask-leg.pf-leg-done{opacity:.65}' +
        '.pf-leg-ic{font-size:18px;flex:0 0 auto}' +
        '.pf-leg-tx{flex:1;min-width:0;line-height:1.4}' +
        '.pf-leg-cta{padding:10px 14px;min-height:44px;font-size:12px;flex:0 0 auto}' +
        '.pf-leg-done-t{font-size:11px;letter-spacing:2px;color:var(--ask-gold);' +
        'font-weight:800;flex:0 0 auto}' +
        '.pf-leg-x{background:transparent;border:0;color:#6b6252;font-size:14px;' +
        'cursor:pointer;width:44px;height:44px;flex:0 0 auto}' +
        '.pf-ask-flash{animation:pf-ask-flash 1.4s ease 2}' +
        '@keyframes pf-ask-flash{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 4px var(--ask-gold)}}' +
        '@media (prefers-reduced-motion:reduce){.pf-ask-flash{animation:none}}';
      var head = doc.head || doc.getElementsByTagName('head')[0];
      if (head) head.appendChild(st);
    } catch (e) {}
  }

  /* ---------------- deep links ----------------
     On-page board -> jump to #pf-data-bounties and stash kind+target prefill.
     Off-page      -> board page URL with pf_kind/pf_target params. */
  function deepLink(kind, target, extra) {
    extra = extra || {};
    var onPage = !!$('pf-data-bounties');
    var q = '?pf_kind=' + encodeURIComponent(kind || '');
    if (target) q += '&pf_target=' + encodeURIComponent(target);
    if (extra.cell) q += '&pf_cell=1';
    if (onPage) return { href: '#' + BOARD_ANCHOR, onPage: true };
    return { href: BOARD_URL + q + '#' + BOARD_ANCHOR, onPage: false };
  }
  function stashPrefill(kind, target, cell) {
    try {
      sessionStorage.setItem(SS_PREFILL, JSON.stringify({ kind: kind, target: target || '', cell: cell ? 1 : 0, ts: Date.now() }));
    } catch (e) {}
  }
  function readPrefill() {
    try {
      var p = JSON.parse(sessionStorage.getItem(SS_PREFILL) || 'null');
      if (p && p.kind) return p;
    } catch (e) {}
    try {
      var qs = location.search || '';
      var m = /[?&]pf_kind=([^&]+)/.exec(qs);
      if (m) {
        var t = /[?&]pf_target=([^&]+)/.exec(qs);
        var c = /[?&]pf_cell=([^&]+)/.exec(qs);
        return { kind: decodeURIComponent(m[1]), target: t ? decodeURIComponent(t[1]) : '', cell: c ? 1 : 0 };
      }
    } catch (e2) {}
    return null;
  }
  /* Board-page handshake: find the bounty card matching kind (+target text),
     highlight it, scroll to it, and prefill the area field. One-shot. */
  function applyPrefill(doc) {
    doc = doc || document;
    var pre = readPrefill();
    if (!pre || !pre.kind) return false;
    var host = $('pf-data-bounties', doc);
    if (!host) return false;
    var label = KIND_LABEL[pre.kind] || String(pre.kind).toUpperCase();
    var target = String(pre.target || '').toLowerCase();
    var tries = 0;
    (function poll() {
      tries++;
      var cards = [];
      try { cards = host.querySelectorAll('.db-card'); } catch (e) {}
      var best = null;
      for (var i = 0; i < cards.length; i++) {
        var kindEl = cards[i].querySelector ? cards[i].querySelector('.db-kind') : null;
        var kl = kindEl ? String(kindEl.textContent || '').trim().toUpperCase() : '';
        if (kl !== label && kl !== String(pre.kind).toUpperCase()) continue;
        if (!target) { best = cards[i]; break; }
        var txt = String(cards[i].textContent || '').toLowerCase();
        var tShort = target.indexOf(':') > -1 ? target.split(':')[1] : target;
        if (txt.indexOf(target) > -1 || (tShort && txt.indexOf(tShort) > -1)) { best = cards[i]; break; }
        if (!best) best = cards[i];
      }
      if (best) {
        try {
          best.classList.add('pf-ask-flash');
          if (best.scrollIntoView) best.scrollIntoView({ block: 'start' });
          else if (best.scrollIntoView !== undefined) best.scrollIntoView();
          var area = best.querySelector ? best.querySelector('input[data-f="area_key"]') : null;
          if (area && !area.value && target && target.indexOf('event:') !== 0) area.value = pre.target;
          setTimeout(function () { try { best.classList.remove('pf-ask-flash'); } catch (e2) {} }, 3200);
        } catch (e3) {}
        try { sessionStorage.removeItem(SS_PREFILL); } catch (e4) {}
        return;
      }
      if (tries < 24) setTimeout(poll, 500);
      else { try { sessionStorage.removeItem(SS_PREFILL); } catch (e5) {} }
    })();
    return true;
  }

  /* ---------------- card renderers ---------------- */
  function ctaAttrs(kind, target, cell, onPage) {
    return 'data-pf-kind="' + esc(kind || '') + '" data-pf-target="' + esc(target || '') + '"' +
      (cell ? ' data-pf-cell="1"' : '') + (onPage ? ' data-pf-onpage="1"' : '');
  }
  function cardHTML(key, opts) {
    opts = opts || {};
    var a = ASKS[key];
    if (!a) return '';
    var surface = opts.surface || a.surfaces[0] || 'general';
    var target = opts.target || '';
    var line = String(a.line).replace(/\[area\]/g, esc(opts.area || 'your sector'));
    var href, dl;
    if (a.hrefSelf) {
      href = '#' + (opts.rootId || BOARD_ANCHOR);
      dl = { href: href, onPage: true };
    } else if (a.href) {
      dl = { href: a.href, onPage: false };
    } else {
      dl = deepLink(a.kind, target);
    }
    var h = '<div class="pf-ask" data-pf-ask="' + esc(key) + '" data-pf-surface="' + esc(surface) + '"' +
      (opts.lesson ? ' data-pf-lesson="' + esc(opts.lesson) + '"' : '') + '>';
    h += '<div class="pf-ask-kicker">' + a.icon + ' ' + esc(a.kicker) + '</div>';
    h += '<div class="pf-ask-line">' + line + '</div>';
    if (a.sub && a.subKind) {
      var sdl = deepLink(a.subKind, target);
      h += '<div class="pf-ask-sub"><a href="' + esc(sdl.href) + '" ' +
        ctaAttrs(a.subKind, target, false, sdl.onPage) + '>' + esc(a.sub) + '</a></div>';
    }
    h += '<div class="pf-ask-row"><a class="pf-ask-cta" href="' + esc(dl.href) + '" ' +
      ctaAttrs(a.kind, target, false, dl.onPage) + '>' + esc(a.cta) + '</a>' +
      '<button class="pf-ask-x" aria-label="Dismiss">\u2715</button></div>';
    h += '<div class="pf-ask-foot">MTCSTW.COM \u00B7 your content becomes movement action \u2014 never sold</div></div>';
    return h;
  }

  /* Stacked bundle card for event pages (§7). phase: pre | post | unknown. */
  function bundleHTML(eventId, opts) {
    opts = opts || {};
    var phase = opts.phase || 'unknown';
    var items = '';
    LEGS.forEach(function (L) {
      if (isDismissed(L.key)) return;
      var done = hasContributed(L.key) || (L.leg === 1 && !!opts.rsvpd);
      var em = (phase === 'pre' && L.leg === 1 && !done) || (phase === 'post' && L.leg > 1 && !done);
      var dl = deepLink(L.kind, 'event:' + eventId, { cell: L.cell ? 1 : 0 });
      items += '<li class="pf-ask-leg' + (em ? ' pf-leg-em' : '') + (done ? ' pf-leg-done' : '') + '" data-pf-leg="' + L.key + '">' +
        '<span class="pf-leg-ic">' + L.icon + '</span>' +
        '<span class="pf-leg-tx"><b>' + esc(L.label) + '</b> \u2014 ' + esc(L.desc) + '</span>' +
        (done
          ? '<span class="pf-leg-done-t">DONE \u2713</span>'
          : '<a class="pf-ask-cta pf-leg-cta" href="' + esc(dl.href) + '" ' +
            ctaAttrs(L.kind, 'event:' + eventId, L.cell ? 1 : 0, dl.onPage) + '>GO \u2192</a>' +
            '<button class="pf-leg-x" data-pf-legx="' + L.key + '" aria-label="Dismiss this step">\u2715</button>') +
        '</li>';
    });
    if (!items) return '';
    var kicker = ((opts.evType || 'rally') + ' day').toUpperCase();
    return '<div class="pf-ask pf-ask-bundle" data-pf-ask="event_bundle" data-pf-surface="events" data-pf-event="' + esc(eventId) + '">' +
      '<div class="pf-ask-kicker">\uD83D\uDD25 ' + esc(kicker) + '</div>' +
      '<div class="pf-ask-line">Check in \u2192 snap photos \u2192 confirm the crowd \u2192 <b>rep your cell</b>.</div>' +
      '<ol class="pf-ask-legs">' + items + '</ol>' +
      '<div class="pf-ask-row"><button class="pf-ask-x" aria-label="Dismiss">\u2715</button></div>' +
      '<div class="pf-ask-foot">MTCSTW.COM \u00B7 stacked action \u2014 every leg is its own bounty</div></div>';
  }

  /* ---------------- surface probes ---------------- */
  function closest(el, sel) {
    try { if (el && el.closest) return el.closest(sel); } catch (e) {}
    return null;
  }
  function areaFrom(root) {
    try {
      var inp = root.querySelector('input[data-f="area_key"]');
      if (inp && inp.value) return String(inp.value).slice(0, 40);
      var el = root.querySelector('[data-pf-area]');
      if (el) return String(el.getAttribute('data-pf-area') || '').slice(0, 40);
    } catch (e) {}
    return '';
  }
  function cellArea(host) {
    try {
      var d = host.getAttribute('data-area');
      if (d) return String(d).slice(0, 40);
      var el = host.querySelector('[data-area], .pf-cell-area');
      if (el) return String(el.getAttribute('data-area') || el.textContent || '').trim().slice(0, 40);
    } catch (e) {}
    return '';
  }

  /* /economy price view: gas ask at TOP, CPI-thin ask inline. */
  function probeEconomy(doc) {
    var surface = 'economy';
    var top = $('pf-inflation-checkin', doc) || $('pf-economy', doc);
    if (!top) return;
    var hasGas = false;
    try { hasGas = !!top.querySelector('[data-pf-ask="gas"]'); } catch (e) {}
    if (!hasGas && canShow('gas', surface)) {
      var html = cardHTML('gas', { surface: surface, target: areaFrom(top) });
      if (html) { try { top.insertAdjacentHTML('afterbegin', html); markShown('gas', surface); } catch (e2) {} }
    }
    var host = $('pf-inflation-checkin', doc);
    if (host) {
      var hasThin = false;
      try { hasThin = !!host.querySelector('[data-pf-ask="cpi_thin"]'); } catch (e3) {}
      if (!hasThin && canShow('cpi_thin', surface)) {
        var h2 = cardHTML('cpi_thin', { surface: surface });
        if (h2) { try { host.insertAdjacentHTML('beforeend', h2); markShown('cpi_thin', surface); } catch (e4) {} }
      }
    }
  }

  /* War Report footer: rotate gas <-> field-photos asks. */
  function nextRotation() {
    var r = '';
    try { r = sessionStorage.getItem(SS_ROT) || ''; } catch (e) {}
    return r === 'warreport_photos' ? 'warreport_photos' : 'gas';
  }
  function setRotation(v) { try { sessionStorage.setItem(SS_ROT, v); } catch (e) {} }
  function probeWarReport(doc) {
    var surface = 'warreport';
    var host = $('pf-warreport', doc);
    if (!host) return;
    try { if (host.querySelector('.pf-ask')) return; } catch (e) {}
    var first = nextRotation();
    var order = first === 'gas' ? ['gas', 'warreport_photos'] : ['warreport_photos', 'gas'];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      if (!canShow(k, surface)) continue;
      var html = cardHTML(k, { surface: surface });
      if (!html) continue;
      try { host.insertAdjacentHTML('beforeend', html); markShown(k, surface); }
      catch (e2) { break; }
      setRotation(k === 'gas' ? 'warreport_photos' : 'gas');
      break;
    }
  }

  /* Cell dashboards: gas ask + cell intel ask. */
  function probeCells(doc) {
    var surface = 'cells';
    var host = $('pf-cell-hq', doc);
    if (!host) return;
    var area = cellArea(host);
    ['gas', 'cell_intel'].forEach(function (k) {
      try { if (host.querySelector('[data-pf-ask="' + k + '"]')) return; } catch (e) {}
      if (!canShow(k, surface)) return;
      var html = cardHTML(k, { surface: surface, area: area });
      if (!html) return;
      try { host.insertAdjacentHTML('beforeend', html); markShown(k, surface); } catch (e2) {}
    });
  }

  /* Post-prediction: after the first locked-in call. */
  function probePredgame(doc) {
    var surface = 'predgame';
    var host = $('pf-predgame', doc);
    if (!host) return;
    var locked;
    try { locked = host.querySelectorAll('.pq-locked'); } catch (e) { return; }
    for (var i = 0; i < locked.length; i++) {
      var el = locked[i];
      if (!/you called/i.test(el.textContent || '')) continue;
      if (el.getAttribute('data-pf-ask-done')) continue;
      el.setAttribute('data-pf-ask-done', '1');
      if (!canShow('pred_evidence', surface)) continue;
      var html = cardHTML('pred_evidence', { surface: surface });
      if (!html) continue;
      try { el.insertAdjacentHTML('afterend', html); markShown('pred_evidence', surface); } catch (e2) {}
      break;
    }
  }

  /* Empty states: the ask IS the content. */
  var EMPTY_PROBES = [
    { roots: ['pf-inflation-trends', 'pf-inflation-board'], key: 'gas', surface: 'price-empty' },
    { roots: ['pf-deaddrop'], key: 'empty_intel', surface: 'intel-empty' },
    { roots: ['pf-raid'], key: 'empty_raid', surface: 'raid-empty' },
    { roots: ['pf-pledge-wall'], key: 'empty_pledge', surface: 'pledge-empty', classAlt: 'pf-pledge-wall' }
  ];
  function isEmptyish(el) {
    if (!el) return false;
    try {
      if (el.querySelector('.pf-empty,.c-note,.db-empty') || el.getAttribute('data-pf-empty') === '1') return true;
      if (el.children.length === 0) return true;
    } catch (e) {}
    return false;
  }
  function probeEmpty(doc) {
    EMPTY_PROBES.forEach(function (p) {
      var host = null;
      for (var i = 0; i < p.roots.length; i++) { host = $(p.roots[i], doc); if (host) break; }
      if (!host && p.classAlt) { try { host = doc.querySelector('.' + p.classAlt); } catch (e) {} }
      if (!host || !isEmptyish(host)) return;
      try { if (host.querySelector('.pf-ask')) return; } catch (e2) {}
      if (!canShow(p.key, p.surface)) return;
      var html = cardHTML(p.key, { surface: p.surface, rootId: host.id || '' });
      if (!html) return;
      try { host.insertAdjacentHTML('beforeend', html); markShown(p.key, p.surface); } catch (e3) {}
    });
  }

  /* ---------------- stacked event bundle (§7) ---------------- */
  function fetchEventStart(eventId, cb) {
    var done = false;
    function fin(v) { if (!done) { done = true; try { cb(v); } catch (e) {} } }
    setTimeout(function () { fin(0); }, 4000);
    try {
      if (!PF.jsonp || !eventId) return fin(0);
      PF.jsonp('civicevent_list', { id: eventId }).then(function (j) {
        var ev = j && j.ok && j.events && j.events[0];
        fin(ev && ev.starts_at ? Number(ev.starts_at) : 0);
      }).catch(function () { fin(0); });
    } catch (e) { fin(0); }
  }
  function mountEventBundle(doc) {
    doc = doc || document;
    var root = $('xCivicEvents', doc) || $('pf-civicevents', doc);
    if (!root) return;
    var detail;
    try { detail = root.querySelector('.ce-detail'); } catch (e) { return; }
    if (!detail || detail.getAttribute('data-pf-ask-bundle')) return;
    detail.setAttribute('data-pf-ask-bundle', '1');
    var eventId = '', evType = 'rally', rsvpd = false;
    try {
      var rsvpBtn = detail.querySelector('[data-ce="rsvp"]');
      if (rsvpBtn) eventId = rsvpBtn.getAttribute('data-id') || '';
      var typeEl = detail.querySelector('.ce-type');
      if (typeEl && typeEl.textContent) evType = typeEl.textContent.trim().toLowerCase() || 'rally';
      var rsvpWrap = doc.getElementById('ce-rsvp');
      rsvpd = !!(rsvpWrap && rsvpWrap.getAttribute('data-rsvpd') === '1');
    } catch (e2) {}
    fetchEventStart(eventId, function (startsAt) {
      var phase = startsAt ? (startsAt < Date.now() ? 'post' : 'pre') : 'unknown';
      if (!canShow('event_bundle', 'events')) return;
      var html = bundleHTML(eventId, { phase: phase, rsvpd: rsvpd, evType: evType });
      if (!html) return;
      try { detail.insertAdjacentHTML('beforeend', html); markShown('event_bundle', 'events'); } catch (e3) {}
    });
  }

  /* ---------------- gas-thinnest retarget for REPORT A PRICE ---------------- */
  function gasThinnest(cb) {
    function done(v) { try { cb(!!v); } catch (e) {} }
    try {
      if (!PF.jsonp) return done(false);
      PF.jsonp('databounty_list', {}).then(function (j) {
        try {
          var list = (j && (j.bounties || j.data)) || [];
          var need = { gas_price: 0, commodity_confirm: 0, cpi_price: 0 };
          var seen = { gas_price: false, commodity_confirm: false, cpi_price: false };
          for (var i = 0; i < list.length; i++) {
            var b = list[i] || {}, k = b.kind;
            if (!(k in need)) continue;
            seen[k] = true;
            var n = Number(b.need_urgency);
            if (!isFinite(n)) n = 1.0;
            if (n > need[k]) need[k] = n;
          }
          var gas = seen.gas_price ? need.gas_price : 0.5;
          var cpi = seen.cpi_price ? need.cpi_price : 0.5;
          var com = seen.commodity_confirm ? need.commodity_confirm : 0.5;
          done(seen.gas_price && gas > cpi && gas > com);
        } catch (e) { done(false); }
      }).catch(function () { done(false); });
    } catch (e2) { done(false); }
  }
  function retargetReportPrice(doc) {
    doc = doc || document;
    var anchors = [];
    [['a[href="/economy#pf-inflation-checkin"]', false], ['a[href^="/peoples-cpi"]', true]].forEach(function (pair) {
      var nl;
      try { nl = doc.querySelectorAll(pair[0]); } catch (e) { return; }
      for (var i = 0; i < nl.length; i++) {
        if (pair[1] && !/report/i.test(nl[i].textContent || '')) continue;
        anchors.push(nl[i]);
      }
    });
    anchors.forEach(function (a) {
      if (!a || a.getAttribute('data-pf-ask-rp')) return;
      a.setAttribute('data-pf-ask-rp', '1');
      gasThinnest(function (thin) {
        if (!thin) return;
        try {
          a.href = deepLink('gas_price', '').href;
          a.setAttribute('data-pf-ask-rp', 'gas');
        } catch (e) {}
      });
    });
  }

  /* ---------------- observers & events ---------------- */
  function onDocClick(e) {
    var lx = closest(e.target, '.pf-leg-x');
    if (lx) {
      dismiss(lx.getAttribute('data-pf-legx'));
      var li = closest(lx, '.pf-ask-leg');
      var card = closest(lx, '.pf-ask');
      if (li && li.parentNode) li.parentNode.removeChild(li);
      if (card) {
        var left = 0;
        try { left = card.querySelectorAll('.pf-ask-leg').length; } catch (e) {}
        if (!left && card.parentNode) card.parentNode.removeChild(card);
      }
      if (e.preventDefault) e.preventDefault();
      return;
    }
    var bx = closest(e.target, '.pf-ask-x');
    if (bx) {
      var card2 = closest(bx, '.pf-ask');
      dismiss(card2 && card2.getAttribute('data-pf-ask'));
      if (card2 && card2.parentNode) card2.parentNode.removeChild(card2);
      if (e.preventDefault) e.preventDefault();
      return;
    }
    var cta = closest(e.target, 'a.pf-ask-cta');
    if (cta) {
      var kind = cta.getAttribute('data-pf-kind');
      if (kind) {
        stashPrefill(kind, cta.getAttribute('data-pf-target') || '', cta.getAttribute('data-pf-cell') === '1');
        if (cta.getAttribute('data-pf-onpage') === '1') {
          setTimeout(function () { try { applyPrefill(); } catch (e2) {} }, 400);
        }
      }
    }
  }
  function onLessonComplete(e) {
    var lid = e && e.detail && e.detail.lesson;
    var host = $('pf-academy') || $('pf-academy-hq');
    if (!host) return;
    var surface = 'academy';
    if (!canShow('academy_work', surface)) return;
    try {
      if (lid && host.querySelector('[data-pf-ask="academy_work"][data-pf-lesson="' + String(lid).replace(/"/g, '') + '"]')) return;
    } catch (e2) {}
    var html = cardHTML('academy_work', { surface: surface, lesson: lid });
    if (!html) return;
    try { host.insertAdjacentHTML('beforeend', html); markShown('academy_work', surface); } catch (e3) {}
  }
  function observeBody() {
    if (typeof MutationObserver === 'undefined') return;
    var t = null;
    function arm() {
      try {
        var mo = new MutationObserver(function (muts) {
          var relevant = false;
          for (var i = 0; i < muts.length && !relevant; i++) {
            var nodes = muts[i].addedNodes || [];
            for (var j = 0; j < nodes.length; j++) {
              var n = nodes[j];
              if (!n || n.nodeType !== 1) continue;
              if (closest(n, '.pf-ask')) continue;
              relevant = true;
              break;
            }
          }
          if (!relevant) return;
          if (t) clearTimeout(t);
          t = setTimeout(function () { try { injectAll(); } catch (e) {} }, 500);
        });
        if (document.body) mo.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
    if (document.body) arm();
    else {
      try {
        document.addEventListener('DOMContentLoaded', function () {
          try {
            var mo = new MutationObserver(function () {
              if (t) clearTimeout(t);
              t = setTimeout(function () { try { injectAll(); } catch (e2) {} }, 500);
            });
            mo.observe(document.body, { childList: true, subtree: true });
          } catch (e3) {}
        });
      } catch (e4) {}
    }
  }
  /* Watch bounty claim/confirm success messages -> contributed markers (anti-nag). */
  function observeClaims() {
    var board = $('pf-data-bounties');
    if (!board || typeof MutationObserver === 'undefined') return;
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var n = muts[i].target;
          if (!n || n.nodeType !== 1) continue;
          var isMsg = false;
          try { isMsg = !!(n.classList && n.classList.contains('db-msg')); } catch (e) {}
          if (!isMsg) continue;
          if (!/submitted \u2014 awaiting confirmation|confirmation recorded|bounty filled/i.test(n.textContent || '')) continue;
          var card = closest(n, '.db-card');
          var kindEl = card && card.querySelector ? card.querySelector('.db-kind') : null;
          var kind = kindEl ? kindFromLabel(kindEl.textContent) : '';
          if (kind) markKindContributed(kind);
        }
      });
      mo.observe(board, { childList: true, subtree: true, characterData: true });
    } catch (e2) {}
  }

  function injectAll(doc) {
    doc = doc || document;
    probeEconomy(doc);
    probeWarReport(doc);
    probeCells(doc);
    probePredgame(doc);
    mountEventBundle(doc);
    probeEmpty(doc);
  }
  function boot() {
    injectCSS();
    applyPrefill();
    retargetReportPrice();
    injectAll();
    try {
      document.addEventListener('click', onDocClick);
      document.addEventListener('pf-lesson-complete', onLessonComplete);
      document.addEventListener('pf-ugc-contributed', function (e) {
        try { recordContribution(e.detail && e.detail.key); } catch (x) {}
      });
    } catch (e) {}
    observeBody();
    observeClaims();
  }

  /* ---------------- public API (tests + Next Move coordination) ---------------- */
  PF.UGCAsks = {
    KILL: KILL,
    BOARD_URL: BOARD_URL,
    BOARD_ANCHOR: BOARD_ANCHOR,
    ASKS: ASKS,
    LEGS: LEGS,
    KIND_LABEL: KIND_LABEL,
    MAX_DISTINCT_PER_SURFACE: MAX_DISTINCT_PER_SURFACE,
    cardHTML: cardHTML,
    bundleHTML: bundleHTML,
    deepLink: deepLink,
    stashPrefill: stashPrefill,
    readPrefill: readPrefill,
    applyPrefill: applyPrefill,
    canShow: canShow,
    markShown: markShown,
    hasContributed: hasContributed,
    recordContribution: recordContribution,
    markKindContributed: markKindContributed,
    isDismissed: isDismissed,
    dismiss: dismiss,
    gasThinnest: gasThinnest,
    retargetReportPrice: retargetReportPrice,
    mountEventBundle: mountEventBundle,
    injectAll: injectAll,
    resetSession: function () {
      try {
        sessionStorage.removeItem(SS_SEEN);
        sessionStorage.removeItem(SS_ROT);
        sessionStorage.removeItem(SS_PREFILL);
      } catch (e) {}
    }
  };

  try {
    if (typeof document !== 'undefined' && document) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    }
  } catch (e) {}
})();
