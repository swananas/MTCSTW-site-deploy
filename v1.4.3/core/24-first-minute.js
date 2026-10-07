/* core/24-first-minute.js  |  PF v1.4.3 | THE FIRST-60-SECONDS ANONYMOUS MISSION.
   (psych-quick-wins Spec 2.) Competence before commitment: anonymous homepage
   visitors with NO callsign get one prescribed 60-second action — one tap on
   the existing anonymous fan-vote flow — before any name is ever asked for.
   The existing convert machinery (core/10-convert.js) then fires its
   "BANK THIS XP" enlistment nudge at the value peak.

   Rules: homepage ONLY (the #pf-v2 shell is the homepage marker —
   pages/home-v2.js mounts only where the shell lives), callsign-less only
   (localStorage 'pf_identity_v1' -> .callsign empty; verified pattern from
   core/03-global.js:50 and 09-referral.js:21), one showing per device per 7
   days (loop-guard pf_firstmission_v1). Hero-adjacent: the card inserts
   immediately before the #pf-v2 shell, i.e. above the first funnel section.
   CLS guard: an empty layout slot (min-height ~card height) is reserved
   synchronously at eval, before the mount retries — the later card
   injection replaces the slot in the same tick, so the page never shifts.

   The CTA deep-links into the existing anonymous fan-vote flow
   (games/fan-vote.js, live node #pf-vote — anonymous by design, one
   vote/browser/week). The vote's completion fires 'pf-vote-cast', which
   10-convert.js already turns into the BANK THIS XP nudge. This file adds
   ZERO backend actions and ZERO new events into the economy — only two
   lightweight document CustomEvents for measurement wiring (no dashboards):
   'pf-firstmission-shown' and 'pf-firstmission-cta'.
   KILL: ?pf_off=first-mission  or  localStorage pf_disabled_v1='["first-mission"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('first-mission')) { return; }
  if (window.pfFirstMissionDone) return; window.pfFirstMissionDone = true;

  /* 2026-10-06 (one-prompt): THE ONE PROMPT owns first-run now — its inline
     checklist carries the first-mission CTA. Stand down while one-prompt is
     active; resume as the fallback if one-prompt is killed
     (?pf_off=one-prompt). PF.skip() is name-based, safe even if
     37-one-prompt.js isn't loaded. */
  try { if (window.PF && !PF.skip('one-prompt')) return; } catch (e) {}

  var GUARD_KEY = 'pf_firstmission_v1';
  var SLOT_ID = 'pf-first-mission-slot';
  var SLOT_MIN_H = '360px'; /* approx card height: reserves layout, kills CLS */
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function due() {
    try {
      var t = Number(localStorage.getItem(GUARD_KEY) || 0);
      return !(t && (Date.now() - t < WEEK_MS));
    } catch (e) { return false; }
  }
  function mark() { try { localStorage.setItem(GUARD_KEY, String(Date.now())); } catch (e) {} }

  /* Identity check: pf_identity_v1 -> .callsign empty == no callsign.
     Mirrors core/03-global.js window.PFCallsign + the 09-referral.js fallback. */
  function hasCallsign() {
    try {
      if (typeof window.PFCallsign === 'function' && window.PFCallsign()) return true;
    } catch (e) {}
    try {
      var o = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      return !!(o && o.callsign);
    } catch (e2) { return false; }
  }

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }

  if (hasCallsign()) return; /* holders get no first mission */
  if (!due()) return;

  /* CLS guard: reserve the card's layout slot before the mount retries run,
     so the later injection can't shift the page. Synchronous at eval (and
     retried with the mount) — the card replaces the slot in the same tick. */
  function reserveSlot() {
    try {
      if (document.getElementById('pf-first-mission') || document.getElementById(SLOT_ID)) return true;
      var host = document.getElementById('pf-v2');
      if (!host || !host.parentNode) return false;
      if (isEditor()) return true;
      var slot = document.createElement('div');
      slot.id = SLOT_ID;
      slot.setAttribute('aria-hidden', 'true');
      slot.style.cssText = 'min-height:' + SLOT_MIN_H + ';box-sizing:border-box;';
      host.parentNode.insertBefore(slot, host);
      return true;
    } catch (e) { return false; }
  }
  function dropSlot() {
    try {
      var s = document.getElementById(SLOT_ID);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    } catch (e2) {}
  }

  function mount() {
    try {
      if (document.getElementById('pf-first-mission')) return true;
      /* #pf-v2 is the homepage shell (pages/home-v2.js). Absent -> not the
         homepage -> never show. The card replaces the reserved slot (or, if
         the slot never got reserved, inserts before the shell as before). */
      var host = document.getElementById('pf-v2');
      if (!host || !host.parentNode) return false;
      if (isEditor()) return true; /* editor: count as handled, render nothing */

      var card = document.createElement('div');
      card.id = 'pf-first-mission';
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'First mission');
      card.style.cssText = 'background:#0b0b0c;border:3px solid #c1121f;max-width:680px;width:calc(100% - 2rem);margin:1rem auto;padding:1.5rem 1.25rem;text-align:center;box-sizing:border-box;font-family:\'Helvetica Neue\',Arial,sans-serif;';
      card.innerHTML =
        '<div style="color:#c1121f;font-weight:800;letter-spacing:0.3em;font-size:0.72rem;margin-bottom:0.7rem;">&#9733; FIRST MISSION &#8212; 60 SECONDS. NO NAME REQUIRED. &#9733;</div>'
        + '<div style="color:#f5ead6;font-weight:900;font-size:1.5rem;line-height:1.25;margin-bottom:0.4rem;">YOU DON\'T NEED A NAME TO FIRE THE FIRST SHOT.</div>'
        + '<div style="color:#c9bfa8;font-size:0.95rem;line-height:1.6;margin-bottom:1.1rem;">One vote. Sixty seconds. Then decide if you\'re staying.</div>'
        + '<a id="pf-fm-cta" href="#pf-vote" style="display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:0.12em;font-size:0.95rem;text-decoration:none;padding:0.9rem 2.2rem;border:2px solid #c1121f;">FIRE &#8594;</a>'
        + '<div style="margin-top:0.9rem;"><span id="pf-fm-no" role="button" tabindex="0" style="color:#b8ab8e;font-size:0.8rem;cursor:pointer;text-decoration:underline;">just looking</span></div>';
      var slot = document.getElementById(SLOT_ID);
      if (slot && slot.parentNode) {
        slot.parentNode.replaceChild(card, slot);
      } else {
        host.parentNode.insertBefore(card, host);
      }
      mark();
      try { document.dispatchEvent(new CustomEvent('pf-firstmission-shown')); } catch (e) {}
      function close() { try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e2) {} }
      var cta = card.querySelector('#pf-fm-cta'), no = card.querySelector('#pf-fm-no');
      if (cta) {
        cta.addEventListener('click', function () {
          try { document.dispatchEvent(new CustomEvent('pf-firstmission-cta')); } catch (e) {}
          /* The anchor scrolls to the live #pf-vote node; the vote flow and
             its 'pf-vote-cast' completion (10-convert.js BANK THIS XP nudge)
             are untouched. Card stays mounted — the mission is the vote. */
        });
      }
      if (no) {
        var dismiss = function () { close(); };
        no.onclick = dismiss;
        no.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { dismiss(); } };
      }
      return true;
    } catch (e3) { return false; }
  }

  /* Reserve the slot synchronously at eval, then fill it on the mount
     retries. The shell is Squarespace-editor markup; retry briefly in case
     the footer bundle ran before the page body finished parsing. If the
     mount never lands, the reserved slot is dropped — no gap left behind. */
  var tries = 0;
  (function attempt() {
    try { reserveSlot(); } catch (e) {}
    if (mount()) return;
    if (tries++ < 3) { setTimeout(attempt, 1000); return; }
    dropSlot();
  })();
})();
