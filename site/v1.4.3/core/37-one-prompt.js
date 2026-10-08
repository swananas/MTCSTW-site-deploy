/* core/37-one-prompt.js  |  PF v1.4.3 | THE ONE PROMPT + popup backstop.
   CEO directive 2026-10-06 ("Too many pop ups via user reports"): a new
   visitor got ~5 interruptions in the first 30s on the homepage — guided
   onboarding (t+30s), adventure chooser, first-minute card, iOS install
   button (t+4s), enlistment nudge — each built sensibly alone, never
   budgeted together. The fix: ONE clear prompt that integrates a first-time
   visitor effortlessly, everything else demoted or killed.

   PART A — PF.popupQueue (site-wide backstop). Max ONE modal/fullscreen at a
   time; auto-fire overlays additionally capped at 3 per session
   (sessionStorage pf_popup_budget_v1). The one-prompt itself is exempt from
   the budget (it is the one prompt). request(id, kind) -> boolean;
   release(id) is idempotent. Consumers degrade gracefully when absent.

   PART B — THE ONE PROMPT. Single fullscreen first-run card, ONCE EVER
   (localStorage pf_oneprompt_v1), ~5s after homepage load (#pf-v2),
   callsign-less only, never in the Squarespace editor. One headline stating
   what the site is, one action CLAIM YOUR CALLSIGN -> the existing
   PF.requireCallsign claim flow (same register POST, same +20 enlisted leg,
   same 'pf-callsign-claimed' event). Dismiss ("just looking") -> never
   shows again. After claim, the existing rites arbitration fires untouched
   (still exactly one card); pick-your-fight + first mission continue INLINE
   as a homepage checklist (#pf-oneprompt-checklist) — no more modals.
   The guided-onboarding "NEW HERE" chip stays as the re-entry path.

   ZERO new XP. ZERO new backend actions. Measurement only:
   pf-oneprompt-shown, pf-oneprompt-claim, pf-oneprompt-dismissed,
   pf-oneprompt-checklist-done.
   KILL: ?pf_off=one-prompt  or  localStorage pf_disabled_v1='["one-prompt"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('one-prompt')) { return; }
  if (window.pfOnePromptDone) { return; }
  window.pfOnePromptDone = true;

  var LS_PROMPT = 'pf_oneprompt_v1';
  var LS_CHECKLIST = 'pf_checklist_v1';
  var SS_BUDGET = 'pf_popup_budget_v1';
  var BUDGET_MAX = 3;
  var PROMPT_MS = 5000;
  var Z = 99998; /* legacy: below the callsign modal (99999). Now owned by
     .pf-op-veil in core/02-design-system.css; kept for reference. */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function fire(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
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
  function isHomepage() {
    try { return !!document.getElementById('pf-v2'); } catch (e) { return false; }
  }
  function hasCallsign() {
    try { if (typeof window.PFCallsign === 'function' && window.PFCallsign()) return true; } catch (e) {}
    try {
      var o = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      return !!(o && o.callsign);
    } catch (e2) { return false; }
  }

  /* ---------------- PART A: PF.popupQueue ---------------- */
  var openId = null;
  function budgetUsed() {
    try { return Number(sessionStorage.getItem(SS_BUDGET) || 0); } catch (e) { return 0; }
  }
  function budgetBump() {
    try { sessionStorage.setItem(SS_BUDGET, String(budgetUsed() + 1)); } catch (e) {}
  }
  try {
    if (!PF.popupQueue) {
      PF.popupQueue = {
        /* kind: 'auto' (fires without user action) | 'user' (tap-driven).
           The one-prompt is exempt from the session budget — it IS the one. */
        request: function (id, kind) {
          try {
            if (!id) return false;
            if (openId && openId !== id) return false; /* one at a time */
            if (openId === id) return true; /* idempotent re-request */
            if (kind === 'auto' && id !== 'one-prompt' && budgetUsed() >= BUDGET_MAX) return false;
            openId = id;
            if (kind === 'auto' && id !== 'one-prompt') budgetBump();
            return true;
          } catch (e) { return false; }
        },
        release: function (id) {
          try { if (openId && openId === id) openId = null; } catch (e) {}
        },
        /* introspection for tests/debugging */
        _open: function () { return openId; },
        _budgetUsed: budgetUsed
      };
    }
  } catch (e) {}

  function queueRequest(id, kind) {
    try {
      if (window.PF && PF.popupQueue && typeof PF.popupQueue.request === 'function') {
        return PF.popupQueue.request(id, kind);
      }
    } catch (e) {}
    return true; /* queue absent (module loaded standalone): old behavior */
  }
  function queueRelease(id) {
    try {
      if (window.PF && PF.popupQueue && typeof PF.popupQueue.release === 'function') {
        PF.popupQueue.release(id);
      }
    } catch (e) {}
  }

  /* ---------------- PART B: THE ONE PROMPT ---------------- */
  var overlay = null;

  function open() {
    if (overlay) return false;
    if (hasCallsign()) return false;
    if (!queueRequest('one-prompt', 'auto')) return false;
    overlay = document.createElement('div');
    overlay.id = 'pf-oneprompt';
    overlay.className = 'pf-op-veil';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welcome to the Propaganda Factory');
    /* BUTTER PASS 2026-10-07 (workstream 4): inline styles moved to the
       .pf-op-* class library in core/02-design-system.css. IDs, ARIA,
       wiring, dismissal, focus — all unchanged, visual-only. */
    overlay.innerHTML =
      '<div class="pf-op-card">' +
      '<div class="pf-op-kicker">&#9733; THE PROPAGANDA FACTORY &#9733;</div>' +
      '<div class="pf-op-head">THE MEMES ARE THE WEAPON.<br>YOU ARE THE ARMY.</div>' +
      '<div class="pf-op-sub">' +
      'A leftist creator network turning posts into power. One tap and ' +
      'you&rsquo;re in &mdash; your XP follows you everywhere.</div>' +
      '<button type="button" id="pf-op-claim" class="pf-op-claim">' +
      'CLAIM YOUR CALLSIGN</button>' +
      '<div class="pf-op-no-wrap"><button type="button" id="pf-op-no" class="pf-op-no">just looking</button></div>' +
      /* CEO directive 2026-10-06: every claim prompt needs the recovery path. */
      (function () { try { return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; } catch (e) { return ''; } })() +
      '</div>';
    document.body.appendChild(overlay);
    fire('pf-oneprompt-shown');
    function onClaim() {
      fire('pf-oneprompt-claim');
      lsSet(LS_PROMPT, 'claimed');
      close();
      /* The existing claim flow takes over (modal renders above at 99999).
         Rites arbitration fires on pf-callsign-claimed; the checklist
         mounts from the claim listener below. */
      try {
        if (PF.requireCallsign) PF.requireCallsign(function () {}, { context: 'to join the fight' });
      } catch (e) {}
    }
    function onDismiss() {
      fire('pf-oneprompt-dismissed');
      lsSet(LS_PROMPT, 'dismissed');
      close();
      mountChecklist();
    }
    var c = overlay.querySelector('#pf-op-claim'), n = overlay.querySelector('#pf-op-no');
    if (c) c.onclick = onClaim;
    if (n) n.onclick = onDismiss;
    overlay.onclick = function (e) { try { if (e.target === overlay) onDismiss(); } catch (e2) {} };
    try {
      var btn = overlay.querySelector('#pf-op-claim');
      if (btn) btn.focus();
    } catch (e3) {}
    return true;
  }
  function close() {
    queueRelease('one-prompt');
    try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
    overlay = null;
  }

  /* ---------------- PART C: inline checklist ---------------- */
  var checklistEl = null;
  var stepsDone = { fight: false, claim: false, mission: false };

  function fightPicked() {
    try {
      if (window.PF && PF.pillars && typeof PF.pillars.pathNames === 'function') {
        return PF.pillars.pathNames().length > 0;
      }
    } catch (e) {}
    return false;
  }
  function stepRow(n, title, sub, btnLabel, btnId, num) {
    var done = stepsDone[n];
    return '<div data-op-step="' + n + '" class="pf-op-step' + (done ? ' is-done' : '') + '">' +
      '<div class="pf-op-step-dot">' + (done ? '&#10003;' : num) + '</div>' +
      '<div class="pf-op-step-main"><div class="pf-op-step-title">' + esc(title) + '</div>' +
      '<div class="pf-op-step-sub">' + esc(sub) + '</div></div>' +
      (done ? '' : '<button type="button" id="' + btnId + '" class="pf-op-step-btn">' + esc(btnLabel) + '</button>') +
      '</div>';
  }
  function renderChecklist() {
    if (!checklistEl) return;
    /* re-evaluate */
    stepsDone.fight = fightPicked();
    stepsDone.claim = hasCallsign();
    var all = stepsDone.fight && stepsDone.claim && stepsDone.mission;
    if (all) {
      fire('pf-oneprompt-checklist-done');
      try { if (checklistEl.parentNode) checklistEl.parentNode.removeChild(checklistEl); } catch (e) {}
      checklistEl = null;
      lsSet(LS_CHECKLIST, 'done');
      return;
    }
    /* 2026-10-08 fix/mobile-visual: dynamic numbering. When the user already
       has a callsign, the CLAIM step is hidden — renumber the visible steps
       so they show 1, 2 instead of the confusing 1, 3. */
    var stepNum = 0;
    checklistEl.innerHTML =
      '<div class="pf-op-cl-headrow">' +
      '<div class="pf-op-cl-head">&#9873; YOUR FIRST MOVES</div>' +
      '<button type="button" id="pf-op-cl-x" class="pf-op-cl-x" aria-label="Dismiss checklist">&times;</button>' +
      '</div>' +
      stepRow('fight', 'PICK YOUR FIGHT', 'Tunes what you see first.', 'PICK →', 'pf-op-cl-fight', ++stepNum) +
      (stepsDone.claim ? '' : stepRow('claim', 'CLAIM YOUR CALLSIGN', 'Your XP follows it everywhere.', 'CLAIM →', 'pf-op-cl-claim', ++stepNum)) +
      stepRow('mission', 'RUN YOUR FIRST MISSION', 'One vote. Sixty seconds.', 'FIRE →', 'pf-op-cl-mission', ++stepNum);
    var x = checklistEl.querySelector('#pf-op-cl-x');
    if (x) x.onclick = function () {
      lsSet(LS_CHECKLIST, 'dismissed');
      try { if (checklistEl.parentNode) checklistEl.parentNode.removeChild(checklistEl); } catch (e2) {}
      checklistEl = null;
    };
    var f = checklistEl.querySelector('#pf-op-cl-fight');
    if (f) f.onclick = function () {
      try {
        if (window.PF && PF.pillars && typeof PF.pillars.openChooser === 'function') PF.pillars.openChooser();
      } catch (e) {}
      setTimeout(renderChecklist, 1200); /* re-check after the chooser closes */
    };
    var cl = checklistEl.querySelector('#pf-op-cl-claim');
    if (cl) cl.onclick = function () {
      try { if (PF.requireCallsign) PF.requireCallsign(function () {}, { context: 'to join the fight' }); } catch (e) {}
    };
    var m = checklistEl.querySelector('#pf-op-cl-mission');
    if (m) m.onclick = function () {
      try {
        var t = document.getElementById('pf-vote');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.location.hash = '#pf-vote';
      } catch (e) {}
    };
  }
  function mountChecklist() {
    try {
      if (checklistEl) { renderChecklist(); return; }
      if (!isHomepage() || isEditor()) return;
      if (lsGet(LS_CHECKLIST)) return; /* dismissed/done before */
      if (hasCallsign() && fightPicked()) return; /* nothing left to do */
      var host = document.getElementById('pf-v2');
      if (!host || !host.parentNode) return;
      /* Don't double up with the legacy first-minute card if it mounted. */
      if (document.getElementById('pf-first-mission')) return;
      checklistEl = document.createElement('div');
      checklistEl.id = 'pf-oneprompt-checklist';
      checklistEl.className = 'pf-op-checklist';
      checklistEl.setAttribute('role', 'region');
      checklistEl.setAttribute('aria-label', 'Your first moves');
      host.parentNode.insertBefore(checklistEl, host);
      renderChecklist();
    } catch (e) {}
  }

  /* Claim from anywhere: prompt's job is done; checklist takes over. */
  document.addEventListener('pf-callsign-claimed', function () {
    try {
      if (!lsGet(LS_PROMPT)) lsSet(LS_PROMPT, 'claimed-elsewhere');
      if (overlay) close();
      mountChecklist();
    } catch (e) {}
  });
  /* First mission done via the fan vote. */
  document.addEventListener('pf-vote-cast', function () {
    try { stepsDone.mission = true; renderChecklist(); } catch (e) {}
  });
  /* Fight picked elsewhere (chooser closed): re-check on next paint. */
  document.addEventListener('click', function () {
    try { if (checklistEl && !stepsDone.fight && fightPicked()) renderChecklist(); } catch (e) {}
  });

  /* ---------------- launch ---------------- */
  if (isEditor() || !isHomepage()) return;
  if (hasCallsign()) { mountChecklist(); return; }
  if (lsGet(LS_PROMPT)) { mountChecklist(); return; } /* resolved before: checklist only */
  setTimeout(function () {
    try {
      if (hasCallsign() || lsGet(LS_PROMPT) || isEditor()) return;
      open();
    } catch (e) {}
  }, PROMPT_MS);

  /* Public re-entry (console/testing): PF.startOnePrompt() */
  try {
    PF.startOnePrompt = function () {
      try { localStorage.removeItem(LS_PROMPT); } catch (e) {}
      open();
    };
  } catch (e) {}
})();
