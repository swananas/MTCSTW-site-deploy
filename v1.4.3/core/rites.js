/* core/rites.js  |  PF v1.4.3 | THE ENLISTED CEREMONY (r0 claim arbitration).
   The first of three rites (hyperlink-rites §1.11a + §2.7). Fires on the
   'pf-callsign-claimed' document event (dispatched by core/03-global.js and
   games/daily-orders.js after a callsign claim) — the peak identity-
   commitment moment, converted into squad belonging.

   CLAIM ARBITRATION: the claim moment is contested. academy-graduation.js
   (R1, graduation) and core/22-squadjoin.js (R19, squad interstitial) already
   arbitrate via sessionStorage.pf_claim_ux_v1. ENLISTED joins as r0 with
   precedence graduation > enlisted > squadjoin:
     - marks r0:'pending' SYNCHRONOUSLY on claim dispatch,
     - settles to 'card' (shown) | 'declined' (kill-switch, already-completed
       per server rites_log, local per-callsign loop-guard, or R1 showing),
     - R19's poll condition becomes r1==='declined' && r0==='declined'
       (see 22-squadjoin.js); ENLISTED's CTA absorbs squadjoin's job when shown.

   Card: fullscreen war-card (22-squadjoin.js pattern), one 1200ms beat:
   the enlistment poster stamped "FIGHTING AS <CALLSIGN>" via
   PFShare.poster('enlistment-ranks') + PFShare.stampCallsign (core/share-image.js),
   exactly one CTA "GET A SQUAD ->" deep-linking to the cells lobby, dismiss
   "later". On CTA or dismiss: idempotent POST rite_enlisted_complete
   (server-authoritative rites_log; localStorage loop-guard only).
   Zero XP granted by the card itself — the reward is the squad.
   KILL: ?pf_off=enlisted-rite  or  localStorage pf_disabled_v1='["enlisted-rite"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('enlisted-rite')) { return; }
  if (window.pfRitesEnlistedDone) return; window.pfRitesEnlistedDone = true;

  var CLAIM_UX_KEY = 'pf_claim_ux_v1';
  var GUARD_KEY = 'pf_enlisted_v1'; /* per-callsign local loop-guard (academy pattern) */
  var POST_KEY = 'pf_enlisted_posted_v1'; /* in-session + local once-per-claim POST guard */
  var BEAT_MS = 1200;

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
  function settle(cs, v) { try { claimUxSet(cs, { r0: v, r0ts: Date.now() }); } catch (e) {} }

  /* Academy-pattern loop-guard: {callsignLower: 1} map in localStorage. */
  function guardDone(cs) {
    try {
      var o = JSON.parse(localStorage.getItem(GUARD_KEY) || '{}');
      return !!(o && o[String(cs || '').toLowerCase()]);
    } catch (e) { return false; }
  }
  function guardMark(cs) {
    try {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(GUARD_KEY) || '{}'); } catch (e2) { o = {}; }
      o[String(cs || '').toLowerCase()] = 1;
      localStorage.setItem(GUARD_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  var sent = {};
  function posted(cs) {
    try { if (sent[String(cs || '').toLowerCase()]) return true; } catch (e) {}
    try {
      var o = JSON.parse(localStorage.getItem(POST_KEY) || '{}');
      return !!(o && o[String(cs || '').toLowerCase()]);
    } catch (e2) { return false; }
  }
  function markPosted(cs) {
    try { sent[String(cs || '').toLowerCase()] = 1; } catch (e) {}
    try {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(POST_KEY) || '{}'); } catch (e2) { o = {}; }
      o[String(cs || '').toLowerCase()] = 1;
      localStorage.setItem(POST_KEY, JSON.stringify(o));
    } catch (e3) {}
  }

  /* Server-authoritative completed check: rites_log holds the 'enlisted' flag.
     BACKEND SEAM (2026-10-05): the `rite_status` read action does not exist in
     the worker yet — the backend wave owns it. Assumed shape:
     {ok:true, rites:{enlisted:true}} (or flat j.enlisted). Any error, timeout,
     or unknown shape resolves 'unknown' -> false (fail-open): the card shows
     on the normal beat and the per-callsign local loop-guard is the concrete
     repeat protection until the server read lands. */
  function serverCompleted(cs, cb) {
    var done = false;
    function fin(v) { if (done) return; done = true; try { cb(!!v); } catch (e) {} }
    try {
      var url = window.PF_BACKEND_URL || '';
      if (!url || !(window.PF && PF.authGetJSONP)) { fin(false); return; }
      var to = setTimeout(function () { fin(false); }, 6000);
      PF.authGetJSONP(url, 'rite_status', { callsign: String(cs || '').toLowerCase() }, function (j) {
        try { clearTimeout(to); } catch (e) {}
        var fin2 = false;
        try { fin2 = !!(j && j.ok && ((j.rites && j.rites.enlisted) || j.enlisted)); } catch (e2) {}
        fin(fin2);
      });
    } catch (e) { fin(false); }
  }

  /* Idempotent completion POST. Server-side idempotency is authoritative;
     the local guards keep this device from double-firing across CTA/dismiss. */
  function completeRite(cs, cb) {
    function done() { try { if (cb) cb(); } catch (e) {} }
    try {
      if (!cs || posted(cs)) { done(); return; }
      markPosted(cs);
      if (window.PF && PF.postAction) {
        /* Dispatch pair follows the postAction(type,actionKey,action) convention
           (cf. ('stats','s_action','infight_settle')). Backend wave confirms. */
        PF.postAction('rite', 'rite_action', 'rite_enlisted_complete',
          { callsign: String(cs).toLowerCase() }, function () { done(); });
        return;
      }
    } catch (e) {}
    done();
  }

  /* Beat 2: the enlistment poster stamped "FIGHTING AS <CALLSIGN>".
     Uses the existing PFShare pipeline (core/share-image.js): the
     'enlistment-ranks' REG poster painted by PFShare.poster, stamped by
     PFShare.stampCallsign (idempotent via cv._pfStamped). Degrades to no
     poster if the pipeline is absent — the card still shows. */
  function posterUrl() {
    try {
      if (window.PFShare && typeof PFShare.poster === 'function') {
        var cv = PFShare.poster('enlistment-ranks');
        if (cv && typeof PFShare.stampCallsign === 'function') {
          try { cv = PFShare.stampCallsign(cv) || cv; } catch (e0) {}
        }
        if (cv && typeof cv.toDataURL === 'function') return cv.toDataURL('image/png');
      }
    } catch (e) {}
    return null;
  }

  function show(cs) {
    if (!cs) return;
    if (guardDone(cs)) { settle(cs, 'declined'); return; }
    /* R1 may have settled to 'card' during the beat — re-check before render. */
    var g = null; try { g = claimUxGet(cs); } catch (e) {}
    if (g && g.r1 === 'card') { settle(cs, 'declined'); return; }
    try { if (document.getElementById('pf-graduation')) { settle(cs, 'declined'); return; } } catch (e2) {}
    try { if (document.getElementById('pf-enlisted')) { settle(cs, 'card'); return; } } catch (e3) {}

    var img = posterUrl();
    try {
      var ov = document.createElement('div');
      ov.id = 'pf-enlisted';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-label', 'Enlisted');
      ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99997;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box;overflow-y:auto;';
      var imgHtml = img
        ? '<div style="margin:0 auto 1.1rem;max-width:260px;"><img src="' + img + '" alt="Enlistment poster" style="display:block;width:100%;height:auto;border:2px solid #c1121f;" /></div>'
        : '';
      ov.innerHTML =
        '<div style="position:relative;background:#0b0b0c;border:3px solid #c1121f;max-width:440px;width:100%;margin:auto;padding:2rem 1.5rem;text-align:center;box-sizing:border-box;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
        + '<div id="pf-en-x" role="button" tabindex="0" aria-label="Close" style="position:absolute;top:0.4rem;right:0.7rem;cursor:pointer;font-size:1.4rem;color:#b8ab8e;line-height:1;">&times;</div>'
        + '<div style="color:#c1121f;font-weight:800;letter-spacing:0.3em;font-size:0.72rem;margin-bottom:0.8rem;">&#9733; ENLISTED &#9733;</div>'
        + imgHtml
        + '<div style="color:#f5ead6;font-weight:900;font-size:1.7rem;line-height:1.25;margin-bottom:0.4rem;">YOU HAVE A NAME.<br>NOW GET A SQUAD.</div>'
        + '<div style="color:#c9bfa8;font-size:0.95rem;line-height:1.6;margin-bottom:1.2rem;">The network runs on cells. Lone wolves get picked off.</div>'
        + '<a id="pf-en-cta" href="/cells" style="display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:0.12em;font-size:0.95rem;text-decoration:none;padding:0.9rem 2rem;border:2px solid #c1121f;">GET A SQUAD &#8594;</a>'
        + '<div style="margin-top:0.9rem;"><span id="pf-en-no" role="button" tabindex="0" style="color:#b8ab8e;font-size:0.8rem;cursor:pointer;text-decoration:underline;">later</span></div>'
        + '</div>';
      document.body.appendChild(ov);
      settle(cs, 'card');
      guardMark(cs);
      function close() { try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {} }
      function onDismiss() { close(); completeRite(cs); }
      function onCta(ev) {
        try { if (ev && ev.preventDefault) ev.preventDefault(); } catch (e) {}
        close();
        /* Fire the completion POST, then route. Bounded wait so a slow
           network can't strand the user; the POST is idempotent anyway. */
        var went = false;
        function nav() { if (went) return; went = true; try { window.location.href = '/cells'; } catch (e) {} }
        try { completeRite(cs, nav); } catch (e2) {}
        setTimeout(nav, 2500);
      }
      var x = ov.querySelector('#pf-en-x'), no = ov.querySelector('#pf-en-no'),
          cta = ov.querySelector('#pf-en-cta');
      if (x) { x.onclick = onDismiss; x.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { onDismiss(); } }; }
      if (no) { no.onclick = onDismiss; no.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { onDismiss(); } }; }
      if (cta) { cta.onclick = onCta; }
    } catch (e4) { settle(cs, 'declined'); }
  }

  /* Per-claim server-read state, so the read starts at dispatch and the beat
     decides immediately when the read has already resolved. */
  var claims = {};
  function evaluate(cs) {
    var k = String(cs || '').toLowerCase(); if (!k) return;
    var st = claims[k];
    /* R1 card showing -> graduation wins; stand down. */
    var g = null; try { g = claimUxGet(cs); } catch (e) {}
    if (g && g.r1 === 'card') { settle(cs, 'declined'); return; }
    try { if (document.getElementById('pf-graduation')) { settle(cs, 'declined'); return; } } catch (e2) {}
    if (guardDone(cs)) { settle(cs, 'declined'); return; }
    if (st && st.completed) { settle(cs, 'declined'); return; }
    if (!st || st.server === 'pending') {
      /* Read still in flight — poll until it resolves (bounded by the
         read's own 6s cap), keeping the card off the beat. */
      var n = 0;
      (function poll() {
        var s2 = claims[k];
        if (s2 && s2.server !== 'pending') { evaluate(cs); return; }
        if (n++ >= 14) { show(cs); return; } /* read hung past its cap: fail open */
        setTimeout(poll, 500);
      })();
      return;
    }
    show(cs);
  }

  document.addEventListener('pf-callsign-claimed', function (e) {
    var cs = '';
    try { cs = String((e && e.detail && e.detail.callsign) || ''); } catch (e0) {}
    if (!cs) { try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e1) {} }
    if (!cs) return;
    var k = String(cs).toLowerCase();
    /* Mark r0:'pending' SYNCHRONOUSLY — R19 (22-squadjoin.js) reads this
       at its own beat and polls until r0 settles. */
    claimUxSet(cs, { r0: 'pending' });
    /* Fast-decline paths: kill-switch or the per-callsign loop-guard. */
    if (PF.skip('enlisted-rite')) { settle(cs, 'declined'); return; }
    if (guardDone(cs)) { settle(cs, 'declined'); return; }
    /* Kick off the server completed-read now so the beat decides instantly. */
    claims[k] = { server: 'pending', completed: false };
    serverCompleted(cs, function (fin) {
      try { claims[k] = { server: 'done', completed: !!fin }; } catch (e2) {}
    });
    /* Let the claim toast breathe — the card lands a beat later. */
    setTimeout(function () { evaluate(cs); }, BEAT_MS);
  });
})();
