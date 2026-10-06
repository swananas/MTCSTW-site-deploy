/* pages/recruit-welcome.js  |  PF v1.4.3 | R5: recruit-link -> guided first hour.
   ?creator=<slug> traffic lands on /request-access (see pages/creator-recruit.js
   "COPY ENLIST LINK"). This renders the guided first-hour welcome card for
   those arrivals: "X RECRUITED YOU" + the recruiting creator's real catalog
   card (PF.slrMember roster DB data only — never invented), then 3 prescribed
   steps: 1) claim callsign (PF.requireCallsign, the register flow), 2) Route
   March stop 1 (S1 circuit_status deep-link, ?creator= preserved), 3) today's
   seeded NEXT OP (scrolls to the S4 pf-nextop card in-flow).
   Attribution: ?creator= is first-touch persisted by core/09-referral.js
   (pf_creator_ref_v1) and carried explicitly in the Route March deep-link,
   so it survives through to the first circuit claim (S3 race coherence).
   The recruit minimum bar (callsign + 1 Daily Orders mission) stays
   backend-side — this card grants nothing and bypasses nothing.
   Jeanine Pirreaux Comedy: excluded (do not touch).
   KILL: ?pf_off=recruit-welcome  or  localStorage pf_disabled_v1='["recruit-welcome"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('recruit-welcome')) { return; }
  if (window.pfRecruitWelcomeDone) { return; }
  window.pfRecruitWelcomeDone = true;

  var DIS_KEY = 'pf_recruit_welcome_dismissed_v1';
  var NO_TOUCH_SLUGS = { 'jeanine-pirreaux-comedy': 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function onRequestAccess() {
    try { return /(^|\/)request-access(\/|$)/.test(location.pathname || ''); } catch (e) { return false; }
  }
  function dismissed(slug) {
    try {
      var o = JSON.parse(localStorage.getItem(DIS_KEY) || '{}');
      return !!(o && o[slug]);
    } catch (e) { return false; }
  }
  function markDismissed(slug) {
    try {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(DIS_KEY) || '{}'); } catch (e2) { o = {}; }
      o[slug] = 1;
      localStorage.setItem(DIS_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function hasCallsign() {
    try { if (PF && typeof PF.hasCallsign === 'function') return PF.hasCallsign(); } catch (e) {}
    try { return !!(window.PFCallsign && window.PFCallsign()); } catch (e2) { return false; }
  }
  function myCallsign() {
    try { if (window.PFCallsign) return window.PFCallsign() || ''; } catch (e) {}
    return '';
  }
  function creatorSlug() {
    try { if (PF && typeof PF.storedCreatorRef === 'function') return PF.storedCreatorRef() || ''; } catch (e) {}
    return '';
  }

  /* Route March stop-1 deep-link (S1). Self-contained (no cross-file
     ordering dependency with the R1 graduation card): reads circuit_status,
     navigates to stops[0].page with ?creator= preserved for race coherence.
     Guarded — falls back to the homepage briefing if the circuit read fails. */
  function goRouteMarch(btn, slug) {
    function fallback() {
      try { location.href = '/#pf-brief'; } catch (e) {}
    }
    if (btn) { btn.disabled = true; btn.textContent = 'FINDING STOP 1\u2026'; }
    var BACKEND = window.PF_BACKEND_URL;
    var cs = myCallsign();
    function nav(page) {
      var url = String(page || '/#pf-brief');
      if (slug) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'creator=' + encodeURIComponent(slug);
      try { location.href = url; } catch (e) { fallback(); }
    }
    if (!BACKEND || !cs) { fallback(); return; }
    var finished = false;
    function done(j) {
      if (finished) return; finished = true;
      try {
        if (j && j.ok && j.stops && j.stops.length && j.stops[0].page) { nav(j.stops[0].page); return; }
      } catch (e2) {}
      fallback();
    }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, 'circuit_status', { callsign: cs }, done); }
      else {
        var fn = 'pfRwRm' + Math.floor(Math.random() * 1e9);
        window[fn] = function (j) { try { delete window[fn]; } catch (e3) {} done(j); };
        var s = document.createElement('script');
        s.onerror = function () { done(null); };
        s.src = BACKEND + '?action=circuit_status&callsign=' + encodeURIComponent(cs) + '&callback=' + fn;
        document.head.appendChild(s);
      }
    } catch (e4) { done(null); }
    setTimeout(function () { done(null); }, 10000);
  }

  function memberCard(member) {
    var name = String(member.name || 'A Sick Left Radical');
    var score = (member.propaganda_score != null) ? Number(member.propaganda_score).toFixed(1) : '';
    var followers = String(member.followers_display || '');
    var path = String(member.catalog_path || ('/' + member.slug));
    var photo = String(member.picture || '');
    var h = '<div style="display:flex;gap:.9rem;align-items:center;text-align:left;' +
      'border:2px solid #c1121f;background:#141010;padding:.8rem;margin:.9rem auto;max-width:480px;box-sizing:border-box;">';
    if (photo) {
      h += '<img src="' + esc(photo) + '" alt="' + esc(member.image_alt || (name + ' — Sick Left Radicals')) + '" ' +
        'loading="lazy" style="width:72px;height:72px;object-fit:cover;flex:0 0 auto;border:2px solid #c1121f;" />';
    }
    h += '<div style="min-width:0;">' +
      '<div style="color:#f5f0e1;font-weight:900;letter-spacing:.06em;font-size:.95rem;">' + esc(name.toUpperCase()) + '</div>' +
      '<div style="color:#b8ab8e;font-size:.75rem;margin-top:.25rem;">' +
      (score ? 'PROPAGANDA SCORE ' + esc(score) + '/10' : '') +
      (score && followers ? ' &middot; ' : '') +
      (followers ? esc(followers.toUpperCase()) + ' FOLLOWERS' : '') + '</div>' +
      '<div style="margin-top:.4rem;"><a href="' + esc(path) + '" ' +
      'style="color:#fff;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-decoration:underline;">' +
      'VIEW ' + esc(name.toUpperCase()) + '\u2019S PAGE &rarr;</a></div>' +
      '</div></div>';
    return h;
  }

  function render(slug, member) {
    if (document.getElementById('pf-recruit-welcome')) return;
    var name = String(member.name || 'A Sick Left Radical');
    var card = document.createElement('div');
    card.id = 'pf-recruit-welcome';
    card.setAttribute('data-pf-recruit-welcome', '1');
    card.style.cssText = 'border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;' +
      'padding:1.5rem 1.2rem;margin:0 0 1.4rem;text-align:center;box-sizing:border-box;' +
      'box-shadow:0 0 30px rgba(193,18,31,.4);font-family:inherit;';

    var claimed = hasCallsign();
    var step1 = claimed
      ? '<div style="margin:.55rem 0;padding:.7rem;border:2px solid #2f7a3d;background:#0a140a;">' +
        '<div style="color:#7ddf8a;font-weight:900;letter-spacing:.1em;font-size:.85rem;">&#10003; CALLSIGN CLAIMED &mdash; ' +
        esc(myCallsign().toUpperCase()) + '</div></div>'
      : '<div style="margin:.55rem 0;"><button type="button" id="pf-rw-claim" ' +
        'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
        'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
        '1 &mdash; CLAIM YOUR CALLSIGN</button>' +
        /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
        (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })() +
        '</div>';
    var step2 = '<div style="margin:.55rem 0;"><button type="button" id="pf-rw-march" ' +
      'style="display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      '2 &mdash; ROUTE MARCH: STOP 1 &rarr;</button>' +
      '<div style="font-size:.72rem;color:#b8ab8e;margin-top:.35rem;">Walk the circuit. The first stop is where streaks start.</div></div>';
    var step3 = '<div style="margin:.55rem 0;"><button type="button" id="pf-rw-nextop" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      '3 &mdash; SEE TODAY\u2019S NEXT OP &darr;</button></div>';

    card.innerHTML =
      '<div style="color:#c1121f;font-weight:900;letter-spacing:.16em;font-size:1.05rem;margin-bottom:.3rem;">' +
      '&#9873; ' + esc(name.toUpperCase()) + ' RECRUITED YOU</div>' +
      '<div style="font-size:.85rem;color:#b8ab8e;line-height:1.55;">' +
      esc(name) + ' fights with the Sick Left Radicals. Now it\u2019s your turn &mdash; ' +
      'your first hour, prescribed:</div>' +
      memberCard(member) +
      '<div style="color:#f5f0e1;font-weight:900;letter-spacing:.14em;font-size:.85rem;margin:1rem 0 .4rem;">' +
      'YOUR FIRST HOUR</div>' +
      step1 + step2 + step3 +
      '<div style="margin-top:.8rem;"><button type="button" id="pf-rw-dismiss" ' +
      'style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;' +
      'cursor:pointer;text-decoration:underline;">dismiss</button></div>';

    /* Mount in-flow at the top of the Academy block (the recruit's first
       stop on /request-access); fall back to the war-card block, then body. */
    var anchor = null;
    try {
      var hq = document.getElementById('pf-academy-hq');
      var hqb = hq && hq.closest ? hq.closest('.fe-block') : null;
      anchor = hqb || null;
      if (!anchor) {
        var wc = document.getElementById('pf-war-card');
        anchor = (wc && wc.closest) ? wc.closest('.fe-block') : null;
      }
    } catch (e) { anchor = null; }
    try {
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
      else if (document.body) document.body.insertBefore(card, document.body.firstChild);
      else return;
    } catch (e2) { return; }

    function dismiss() {
      markDismissed(slug);
      try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e3) {}
    }
    var dis = card.querySelector('#pf-rw-dismiss');
    if (dis) dis.onclick = dismiss;

    var claimBtn = card.querySelector('#pf-rw-claim');
    if (claimBtn) claimBtn.onclick = function () {
      try {
        if (window.PF && PF.requireCallsign) {
          PF.requireCallsign(function (cs) {
            /* The pf-callsign-claimed listener in core/09-referral.js logs
               the recruit_log row with this creator as recruiter — the
               backend minimum bar counts it from there. */
            if (cs) dismiss();
          }, { context: 'to answer ' + name + '\u2019s call' });
        }
      } catch (e4) {}
    };

    var marchBtn = card.querySelector('#pf-rw-march');
    if (marchBtn) marchBtn.onclick = function () { goRouteMarch(marchBtn, slug); };

    var opBtn = card.querySelector('#pf-rw-nextop');
    if (opBtn) opBtn.onclick = function () {
      /* S4 NEXT OP card mounts in-flow above the footer on every page. */
      var t = null;
      try { t = document.getElementById('pf-nextop'); } catch (e5) {}
      if (t) {
        try { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e6) {}
      } else {
        try { location.href = '/#pf-orders'; } catch (e7) {}
      }
    };
  }

  function resolveAndRender(slug, triedLazy) {
    var member = null;
    try { member = (PF && typeof PF.slrMember === 'function') ? PF.slrMember(slug) : null; } catch (e) {}
    if (member && member.name) { render(slug, member); return; }
    /* Roster DB may still be resolving on slim-core pages — one lazy retry. */
    if (!triedLazy) {
      try {
        if (PF && typeof PF.ensureSLRDB === 'function') {
          PF.ensureSLRDB().then(function () { resolveAndRender(slug, true); });
          return;
        }
      } catch (e2) {}
      setTimeout(function () { resolveAndRender(slug, true); }, 4000);
    }
    /* Real roster data only — never render with invented creator data. */
  }

  function boot() {
    try {
      if (!onRequestAccess()) return;
      var slug = creatorSlug();
      if (!slug || NO_TOUCH_SLUGS[slug]) return;
      if (dismissed(slug)) return;
      if (document.getElementById('pf-recruit-welcome')) return;
      resolveAndRender(slug, false);
    } catch (e) {}
  }
  /* 09-referral.js captures ?creator= at parse time; the SLR snapshot ships
     inside the SLR core on HQ pages, so the member resolves synchronously in
     practice. Bounded retries catch late renders. */
  [0, 1200, 3500, 8000].forEach(function (ms) { setTimeout(boot, ms); });
})();
