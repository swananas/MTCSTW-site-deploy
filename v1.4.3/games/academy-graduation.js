/* games/academy-graduation.js  |  PF v1.4.3 | R1: Academy graduation -> daily-loop induction.
   Hooks the pf-lesson-complete event academy.js already dispatches (and runs
   one mount-time check for past completions). When the backend reports every
   lesson done and academy_progress.graduated is false, it POSTs the idempotent
   academy_graduate flag and renders a GRADUATION ceremony card — once, ever:
     1. CLAIM YOUR CALLSIGN (PF.requireCallsign; defensive — lessons already
        require a callsign, so this is normally a checkmark)
     2. START TODAY'S ROUTE MARCH — deep-link to stop 1 of the S1 circuit
        (circuit_status stops[0].page; ?creator= preserved; falls back to
        the homepage briefing if the circuit read fails)
     3. First Daily Orders check-in link (/#pf-orders)
   The card is a sibling inserted BEFORE #pf-academy (never replaces the
   academy's own render), dismisses permanently via the local flag + the
   backend academy_graduates row, and grants ZERO XP — lesson payouts already
   happened. Cross-device: the backend graduated flag is authoritative.
   KILL: ?pf_off=academy-graduation  or  localStorage pf_disabled_v1='["academy-graduation"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('academy-graduation')) { return; }
  if (window.pfAcademyGraduationDone) { return; }
  window.pfAcademyGraduationDone = true;
  var BACKEND = window.PF_BACKEND_URL;
  var FLAG_KEY = 'pf_academy_grad_v1';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) { try { PF.toast(m); } catch (e) {} }

  function flagSet(cs) {
    try {
      var o = JSON.parse(localStorage.getItem(FLAG_KEY) || '{}');
      return !!(o && o[cs]);
    } catch (e) { return false; }
  }
  function flagMark(cs) {
    try {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(FLAG_KEY) || '{}'); } catch (e2) { o = {}; }
      o[cs] = 1;
      localStorage.setItem(FLAG_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function creatorSlug() {
    try { if (PF && typeof PF.storedCreatorRef === 'function') return PF.storedCreatorRef() || ''; } catch (e) {}
    return '';
  }

  /* R1/R19 claim-scoped guard (2026-10-04): the graduation card (R1) and the
     post-claim squad interstitial (R19, core/22-squadjoin.js) fire on the same
     pf-callsign-claimed event — exactly ONE may claim the moment per callsign.
     Graduation takes precedence: R1 evaluates the claim and records its verdict
     ('pending' -> 'card' | 'declined'); R19 shows only on 'declined'. Shared
     sessionStorage key so both silos respect it across branches/pages. */
  var CLAIM_UX_KEY = 'pf_claim_ux_v1';
  function claimUxGet(cs) {
    try {
      var o = JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY) || '{}');
      return (o && o[String(cs || '').toLowerCase()]) || null;
    } catch (e) { return null; }
  }
  function claimUxSet(cs, patch) {
    try {
      var k = String(cs || '').toLowerCase(); if (!k) return;
      var o = {};
      try { o = JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY) || '{}'); } catch (e2) { o = {}; }
      o[k] = Object.assign(o[k] || {}, { callsign: k }, patch || {});
      sessionStorage.setItem(CLAIM_UX_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  /* JSONP GET — academy_progress is auth-gated, so it rides the shared
     claim-retry getter like academy.js does; lesson_list stays public. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (action === 'academy_progress' && window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, action, params, cb); return;
      }
    } catch (e) {}
    var fn = 'pfAgCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    try { document.head.appendChild(s); } catch (e3) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000);
  }

  /* POST: real CORS fetch, PF.authPost first when available (attaches the
     callsign secret). Same shape as academy.js's post(). */
  function post(aAction, params, cb) {
    var body = Object.assign({ type: 'academy', a_action: aAction }, params);
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e) { done(null); }
  }

  /* Route March day-1 deep-link (S1). Reads today's circuit stops and sends
     the graduate to stop 1 with ?creator= preserved for race coherence.
     Guarded: falls back to the homepage briefing if S1 hasn't landed or the
     read fails — never a dead button. */
  function goRouteMarch(btn) {
    function fallback() {
      try { location.href = '/#pf-brief'; } catch (e) {}
    }
    if (btn) { btn.disabled = true; btn.textContent = 'FINDING TODAY\u2019S ROUTE\u2026'; }
    var id = ident();
    var cr = creatorSlug();
    function nav(page) {
      var url = String(page || '/#pf-brief');
      if (cr) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'creator=' + encodeURIComponent(cr);
      try { location.href = url; } catch (e) { fallback(); }
    }
    if (!BACKEND || !id.callsign) { fallback(); return; }
    var finished = false;
    function done(j) {
      if (finished) return; finished = true;
      try {
        if (j && j.ok && j.stops && j.stops.length && j.stops[0].page) { nav(j.stops[0].page); return; }
      } catch (e) {}
      fallback();
    }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, 'circuit_status', { callsign: id.callsign }, done); }
      else {
        var fn = 'pfAgRm' + Math.floor(Math.random() * 1e9);
        window[fn] = function (j) { try { delete window[fn]; } catch (e) {} done(j); };
        var s = document.createElement('script');
        s.onerror = function () { done(null); };
        s.src = BACKEND + '?action=circuit_status&callsign=' + encodeURIComponent(id.callsign) + '&callback=' + fn;
        document.head.appendChild(s);
      }
    } catch (e) { done(null); }
    setTimeout(function () { done(null); }, 10000);
  }

  function renderCard(container, total) {
    if (!container || document.getElementById('pf-graduation')) return;
    var id = ident();
    var card = document.createElement('div');
    card.id = 'pf-graduation';
    card.setAttribute('data-pf-graduation', '1');
    card.style.cssText = 'border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;' +
      'padding:1.6rem 1.2rem;margin:0 0 1.2rem;text-align:center;box-sizing:border-box;' +
      'box-shadow:0 0 34px rgba(193,18,31,.45);font-family:inherit;';

    var steps = '';
    /* Step 1: callsign. Lessons require one, so this is a checkmark in
       practice — the claim branch is defensive per the R1 spec. */
    if (id.callsign) {
      steps += '<div style="margin:.55rem 0;padding:.7rem;border:2px solid #2f7a3d;background:#0a140a;">' +
        '<div style="color:#7ddf8a;font-weight:900;letter-spacing:.1em;">&#10003; CALLSIGN CLAIMED &mdash; ' +
        esc(id.callsign.toUpperCase()) + '</div></div>';
    } else {
      steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-claim" ' +
        'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
        'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
        'CLAIM YOUR CALLSIGN</button></div>';
    }
    /* Step 2: Route March day-1. Step 3: Daily Orders check-in. */
    steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-march" ' +
      'style="display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      'START TODAY\u2019S ROUTE MARCH &rarr;</button>' +
      '<div style="font-size:.72rem;color:#b8ab8e;margin-top:.35rem;">Day 1 of the 7-day escalator &mdash; 10 XP today, up to 75 on day 7.</div></div>';
    steps += '<div style="margin:.55rem 0;"><a href="/#pf-orders" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'CHECK IN: DAILY ORDERS &rarr;</a></div>';
    /* QW-5b (2026-10-05): graduation -> bounties bridge. Zero XP — pure link. */
    steps += '<div style="margin:.55rem 0;"><div style="font-size:.8rem;color:#f5f0e1;' +
      'line-height:1.5;margin-bottom:.4rem;">Graduated? The war needs graduates.</div>' +
      '<a href="/create?tab=bounties" ' +
      'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'FIND OPEN BOUNTIES &rarr;</a></div>';
    /* QW-5c (2026-10-05): graduation share — PFShare poster API. The
       'academy-grad' REG painter entry lands in core/share-image.js
       (teammate batch); the generic fallback covers the interim. */
    steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-share" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      'SHARE YOUR GRADUATION</button></div>';

    card.innerHTML =
      '<div style="color:#c1121f;font-weight:900;letter-spacing:.18em;font-size:1.15rem;margin-bottom:.4rem;">' +
      '&#9733; ACADEMY GRADUATE &#9733;</div>' +
      '<div style="font-size:.9rem;color:#f5f0e1;line-height:1.6;margin-bottom:.8rem;">' +
      'All ' + total + ' lessons complete. The training wheels are off, soldier &mdash; ' +
      'here are your first orders:</div>' +
      steps +
      '<div style="margin-top:1rem;"><button type="button" id="pf-grad-dismiss" ' +
      'style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;' +
      'cursor:pointer;text-decoration:underline;">dismiss</button></div>';

    try {
      var root = container.querySelector('#pf-academy');
      if (root && root.parentNode === container) container.insertBefore(card, root);
      else container.insertBefore(card, container.firstChild);
    } catch (e) { return; }
    /* R1/R19: the card rendered for this callsign — claim the post-claim
       moment so the squad interstitial (R19) stands down for this claim. */
    try { claimUxSet(id.callsign || '', { r1: 'card', ts: Date.now() }); } catch (e0) {}

    /* Ceremony, not a silent tick: confetti burst on the card. */
    try {
      if (window.PF && PF.dope) { PF.dope.confetti(card, 60); PF.dope.press(card); }
    } catch (e2) {}

    function dismiss() {
      var dcs = '';
      try { dcs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e3a) {}
      if (dcs) flagMark(dcs);
      else if (id.callsign) flagMark(id.callsign);
      try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e3) {}
    }
    var dis = card.querySelector('#pf-grad-dismiss');
    if (dis) dis.onclick = dismiss;

    var marchBtn = card.querySelector('#pf-grad-march');
    if (marchBtn) marchBtn.onclick = function () { goRouteMarch(marchBtn); };

    var gradShare = card.querySelector('#pf-grad-share');
    if (gradShare) gradShare.onclick = function () {
      try {
        var PS = window.PFShare;
        if (PS && PS.poster && PS.shareImage) {
          var cv = PS.poster('academy-grad');
          if (cv) { PS.shareImage(cv, 'pfn-academy-grad.png', 'ACADEMY GRADUATE', 'academy-grad'); }
        }
      } catch (e) {}
    };

    var claimBtn = card.querySelector('#pf-grad-claim');
    if (claimBtn) claimBtn.onclick = function () {
      try {
        if (window.PF && PF.requireCallsign) {
          PF.requireCallsign(function (cs) {
            if (cs) {
              dismiss();
              toast('Callsign claimed. Welcome to the fight.');
            }
          }, { context: 'to graduate from the Academy' });
        }
      } catch (e6) {}
    };
  }

  /* Graduation check: fresh lesson state from the backend; renders the card
     only when every lesson is done AND no graduation flag exists locally or
     server-side. Idempotent by construction.
     R1/R19 sequencing: check(container, optCs, optDone) — the claim listener
     passes the claimed callsign + a verdict callback so the squad
     interstitial (R19) learns whether the card rendered for THIS claim. */
  function check(container, optCs, optDone) {
    function verdict(v) { try { if (optDone) optDone(v); } catch (e) {} }
    try {
      var id = ident();
      var cs = optCs || id.callsign;
      if (!cs) { verdict('declined'); return; }
      if (flagSet(cs)) { verdict('declined'); return; }
      if (document.getElementById('pf-graduation')) { verdict('declined'); return; }
      /* R1/R19 vice versa: if the squad interstitial already claimed this
         claim's moment, the card stands down. Claim-scoped only (optCs set)
         — later genuine graduations re-evaluate without optCs. */
      if (optCs) {
        var gx = claimUxGet(cs);
        if (gx && gx.r19 === 'shown') { verdict('declined'); return; }
      }
      var lessonsArr = null, apGraduated = null, calls = 0, finished = false;
      function maybe() {
        calls++;
        if (calls < 2 || finished) return;
        finished = true;
        try {
          var lessons = lessonsArr || [];
          if (!lessons.length) { verdict('declined'); return; }
          var n = 0, i;
          for (i = 0; i < lessons.length; i++) { if (lessons[i].done) n++; }
          if (n < lessons.length) { verdict('declined'); return; } /* not all done — no graduation */
          if (apGraduated === true) { flagMark(cs); verdict('declined'); return; }
          /* Mirror the flag server-side (idempotent), then render. The local
             flag is set at render so a failed POST can't loop the card. */
          try {
            post('academy_graduate', { callsign: cs, device: id.device }, function () {});
          } catch (e) {}
          flagMark(cs);
          renderCard(container, lessons.length);
          verdict('card');
        } catch (e2) { verdict('declined'); }
      }
      /* Safety: never hang the check. */
      setTimeout(function () { if (!finished) { finished = true; verdict('declined'); } }, 15000);
      api('lesson_list', {}, function (j) {
        if (j && j.ok && j.lessons && j.lessons.length) lessonsArr = j.lessons;
        maybe();
      });
      api('academy_progress', { callsign: cs }, function (j) {
        if (j && j.ok) {
          apGraduated = (j.graduated === true);
          if (j.lessons && j.lessons.length) lessonsArr = j.lessons;
        }
        maybe();
      });
    } catch (e3) { verdict('declined'); }
  }

  function containers() {
    var out = [], els = document.querySelectorAll('#pf-academy'), i;
    for (i = 0; i < els.length; i++) {
      var c = els[i].parentElement;
      if (c && out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }

  /* Primary trigger: academy.js dispatches pf-lesson-complete after every
     successful lesson_complete — check on a beat so the academy's own
     re-render lands first. The /create workshop adapter kicks a dedicated
     pf-graduation-check for the same re-check (never Do-Meter-scored). */
  var pending = false;
  function recheckSoon() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      var cs = containers(), i;
      for (i = 0; i < cs.length; i++) check(cs[i]);
    }, 1200);
  }
  document.addEventListener('pf-lesson-complete', recheckSoon);
  document.addEventListener('pf-graduation-check', recheckSoon);

  /* R1/R19 claim-scoped sequencing (2026-10-04): the graduation card fires
     on pf-callsign-claimed. Evaluate the claim NOW — if this claim's owner is
     a fresh graduate, the card renders and the R19 squad interstitial stands
     down for this claim (guard verdict 'card'); otherwise the verdict is
     'declined' and R19 may show. Graduation takes precedence by construction:
     the verdict is claim-scoped, and R19 polls for it before showing. */
  document.addEventListener('pf-callsign-claimed', function (e) {
    try {
      var cs = '';
      try { cs = String((e && e.detail && e.detail.callsign) || ''); } catch (e0) {}
      if (!cs && window.PFCallsign) { try { cs = window.PFCallsign() || ''; } catch (e1) {} }
      if (!cs) return;
      var g = claimUxGet(cs);
      if (g && g.r1 === 'card') return; /* card already rendered for this claim */
      claimUxSet(cs, { r1: 'pending', ts: Date.now() });
      var done = false;
      function settle(v) {
        if (done) return; done = true;
        claimUxSet(cs, { r1: v, ts: Date.now() });
      }
      var carr = containers(), i, remaining = carr.length;
      if (!remaining) { settle('declined'); return; }
      for (i = 0; i < carr.length; i++) {
        (function (c) {
          check(c, cs, function (v) {
            if (done) return;
            if (v === 'card') { settle('card'); return; }
            remaining--;
            if (remaining <= 0) settle('declined');
          });
        })(carr[i]);
      }
    } catch (e2) {}
  });

  /* Mount-time leg: catches graduates whose final lesson landed on another
     device/session. One cheap read per device until the flag is set. */
  function boot() {
    setTimeout(function () {
      var cs = containers(), i;
      for (i = 0; i < cs.length; i++) check(cs[i]);
    }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
