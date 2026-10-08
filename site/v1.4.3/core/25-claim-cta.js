/* core/25-claim-cta.js  |  PF v1.4.3 | Cohesion §3 (2026-10-05): identity surfacing.
   Shared, NON-BLOCKING callsign claim CTA. Mounts wherever PFCallsign() is
   null — Daily Orders, cells lobby, game shells, HQ dashboard.
   - Invitational, never a toll: it sits beside content, never gates it.
     (Do NOT gate existing free actions behind claiming — spec §3.)
   - Routes through the EXISTING enlistment flow: PF.requireCallsign ->
     POST register -> same 'enlisted' +20 leg (existing, server-clamped,
     idempotent). No new key namespace, no new reward.
   - Copy standard (Brand Consistency owns the words): invitational —
     "Claim your callsign. The ledger needs a name."
   - Listens for 'pf-callsign-claimed' and removes itself on claim.
   API:
     PF.claimCTA(context)        -> HTML string ('' when a callsign exists)
     PF.mountClaimCTA(el, context) -> mounts into el when callsign is null
   KILL: ?pf_off=25-claim-cta  or  localStorage pf_disabled_v1='["25-claim-cta"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('25-claim-cta')) return;

  var COPY = 'Claim your callsign. The ledger needs a name.';
  var SUB = 'One tap. Your XP follows it everywhere.';

  function hasCallsign() {
    try { return !!(window.PFCallsign && window.PFCallsign()); } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Invitational banner HTML. context: short purpose string rendered under
     the copy, e.g. 'to muster with your cell'.
     BUTTER PASS 2026-10-07 (workstream 4): inline styles moved to the
     .pf-claim-cta class library in core/02-design-system.css. Markup order,
     copy, data attributes, and wiring are byte-for-byte the same —
     visual-only. */
  window.PF.claimCTA = function (context) {
    if (hasCallsign()) return '';
    var ctx = context ? '<div class="pf-claim-cta-ctx">' + esc(context) + '</div>' : '';
    return '<div class="pf-claim-cta">' +
      '<div class="pf-claim-cta-copy">' +
      '<span class="pf-claim-cta-star" aria-hidden="true">&#9733;</span> ' + esc(COPY) +
      ' <span class="pf-claim-cta-star" aria-hidden="true">&#9733;</span></div>' +
      '<div class="pf-claim-cta-sub">' + esc(SUB) + '</div>' + ctx +
      '<button type="button" data-pf-claim-cs="1" class="pf-claim-cta-btn">CLAIM A CALLSIGN</button>' +
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path.
         data-pf-recover-cs is owned by core/29-callsign-recovery.js. */
      (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })() +
      '</div>';
  };

  /* Mount into el (selector or node) when no callsign; no-op otherwise.
     Wires through the existing PF.requireCallsign enlistment modal — the
     delegated [data-pf-claim-cs] click handler in 03-global.js owns the tap,
     so this only needs to insert the HTML. Re-checks on
     'pf-callsign-claimed' and removes itself. */
  window.PF.mountClaimCTA = function (el, context) {
    try {
      if (hasCallsign()) return false;
      var node = typeof el === 'string' ? document.querySelector(el) : el;
      if (!node) return false;
      if (node.querySelector && node.querySelector('.pf-claim-cta')) return true; /* already mounted */
      var wrap = document.createElement('div');
      wrap.innerHTML = PF.claimCTA(context);
      var banner = wrap.firstChild;
      if (!banner) return false;
      node.insertBefore(banner, node.firstChild);
      document.addEventListener('pf-callsign-claimed', function h() {
        try {
          if (banner.parentNode) banner.parentNode.removeChild(banner);
        } catch (e) {}
        document.removeEventListener('pf-callsign-claimed', h);
      });
      return true;
    } catch (e) { return false; }
  };
})();
