/* games/guided-onboarding.js  |  PF v1.4.3 | Guided onboarding: the first 2 minutes.
   2026-10-05 (expansion brainstorm, CEO greenlight "Handle all"): new visitors
   land and wander — this strings the existing onboarding pieces into one guided
   path: 1) pick your fight -> 2) claim callsign -> 3) first mission (Daily Orders).
   ALTERNATIVE PATH, not a replacement: the first-minute card, claim CTAs, and
   Daily Orders are untouched. Every step is skippable; the flow is re-enterable.

   Reuses existing machinery — builds nothing twice:
   - Step 1: PF.pickFightOptions()/PF.setPickFight() (games/pick-fight.js) —
     same pf_pick_fight_v1 key, same +10 XP first-pick hook (CEO 2026-10-05).
   - Step 2: PF.requireCallsign() (core/03-global.js) — same register POST,
     same +20 enlisted leg, same 'pf-callsign-claimed' event.
   - Step 3: scrolls to the mounted Daily Orders node (#pf-orders).

   Trigger: homepage only (#pf-v2 shell), callsign-less only, not in editor.
   Auto-launch once per device ever (sticky pf_onboard_v1), 30s after load —
   the first-minute card keeps priority at t=0; this is the path for visitors
   who didn't engage it. Entry chip ("NEW HERE — TAKE THE 2-MINUTE START")
   persists for callsign-less visitors as the re-enter path until they claim.
   ?onboard=1 forces launch (demo/testing).
   z-index 99998 sits BELOW the callsign modal (99999) so step 2's modal
   renders on top.
   ZERO new backend actions. Measurement only: pf-onboard-shown,
   pf-onboard-step {step}, pf-onboard-done, pf-onboard-skipped {step}.
   KILL: ?pf_off=guided-onboarding  or  localStorage pf_disabled_v1='["guided-onboarding"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('guided-onboarding')) { return; }
  if (window.pfGuidedOnboardDone) { return; }
  window.pfGuidedOnboardDone = true;

  var KILL = 'guided-onboarding';
  var LS = 'pf_onboard_v1';
  var AUTO_MS = 30000;
  var Z = 99998;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }

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
  function state() {
    try { return localStorage.getItem(LS) || ''; } catch (e) { return 'done'; }
  }
  function setState(v) { try { localStorage.setItem(LS, v); } catch (e) {} }
  function forced() {
    try { return /(^|[?&])onboard=1(&|$)/.test(window.location.search || ''); } catch (e) { return false; }
  }
  function fire(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch (e) {}
  }

  if (isEditor() || !isHomepage()) return;

  /* ---------- shared chrome ---------- */
  var overlay = null, body_ = null, dots_ = null;

  function dotsHtml(step) {
    var h = '<div style="font-size:.68rem;letter-spacing:.28em;color:#8a7f68;margin-bottom:.7rem;" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) {
      h += '<span style="color:' + (i <= step ? '#c1121f' : '#4a4033') + ';">&#9679;</span> ';
    }
    return h + '<span style="letter-spacing:.14em;">STEP ' + step + ' OF 3</span></div>';
  }

  function open() {
    if (overlay) return;
    if (hasCallsign()) return;
    overlay = document.createElement('div');
    overlay.id = 'pf-onboard';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Your first two minutes');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:' + Z +
      ';background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;' +
      'padding:1rem;box-sizing:border-box;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#0a0a0a;border:3px solid #c1121f;color:#f5ead6;' +
      'font-family:"Helvetica Neue",Arial,sans-serif;padding:1.5rem;max-width:440px;width:100%;' +
      'max-height:92vh;overflow-y:auto;box-sizing:border-box;text-align:center;position:relative;';
    box.innerHTML =
      '<div id="pf-ob-x" role="button" tabindex="0" aria-label="Close" style="position:absolute;' +
      'top:0;right:0;cursor:pointer;font-size:1.4rem;color:#b8ab8e;line-height:1;' +
      'padding:.6rem;min-width:44px;min-height:44px;box-sizing:border-box;text-align:center;">&times;</div>' +
      '<div style="font-size:.8rem;font-weight:900;letter-spacing:.22em;color:#c1121f;margin-bottom:.9rem;">' +
      '&#9873; YOUR FIRST 2 MINUTES</div>' +
      '<div id="pf-ob-dots"></div><div id="pf-ob-body"></div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    body_ = box.querySelector('#pf-ob-body');
    dots_ = box.querySelector('#pf-ob-dots');
    var x = box.querySelector('#pf-ob-x');
    function onX(e) { if (e && e.key && e.key !== 'Enter' && e.key !== ' ') return; skip(curStep); }
    if (x) { x.onclick = function () { skip(curStep); }; x.onkeydown = onX; }
    overlay.onclick = function (e) { if (e.target === overlay) skip(curStep); };
    document.addEventListener('keydown', escClose);
    fire('pf-onboard-shown');
  }
  function escClose(e) {
    try { if (e.key === 'Escape' && overlay) skip(curStep); } catch (e2) {}
  }
  function close() {
    document.removeEventListener('keydown', escClose);
    try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
    overlay = null; body_ = null; dots_ = null;
    hideChip();
  }
  function skip(step) {
    fire('pf-onboard-skipped', { step: step });
    setState('dismissed');
    close();
    showChip();
  }
  function done() {
    fire('pf-onboard-done');
    setState('done');
    close();
  }
  function skipLink() {
    return '<div><button type="button" data-ob="skip" style="background:none;border:0;color:#8a7f68;' +
      'cursor:pointer;font-size:.75rem;text-decoration:underline;padding:.6rem;min-height:44px;' +
      'font-family:inherit;">Skip for now</button></div>';
  }
  function wireSkip(scope) {
    var b = scope.querySelector('[data-ob="skip"]');
    if (b) b.onclick = function () { skip(curStep); };
  }

  var curStep = 0;
  function render(step) {
    curStep = step;
    if (!overlay) open();
    if (!body_) return;
    dots_.innerHTML = dotsHtml(step);
    if (step === 1) renderFight();
    else if (step === 2) renderClaim();
    else renderMission();
    fire('pf-onboard-step', { step: step });
    try {
      var btn = body_.querySelector('[data-ob-primary]');
      if (btn) btn.focus();
    } catch (e) {}
  }

  /* ---------- step 1: pick your fight ---------- */
  function renderFight() {
    var opts = null, cur = [];
    try { if (PF.pickFightOptions) opts = PF.pickFightOptions(); } catch (e) {}
    try { if (PF.pickFight) cur = PF.pickFight() || []; } catch (e2) {}
    if (!opts || !opts.length) { render(2); return; } /* pick-fight unavailable: degrade */
    var h = '<div style="font-size:1.15rem;font-weight:900;letter-spacing:.1em;margin-bottom:.5rem;">' +
      'PICK YOUR FIGHT</div>' +
      '<div style="font-size:.82rem;color:#b8ab8e;line-height:1.5;margin-bottom:.4rem;">' +
      'What are you here to fight for? Pick up to 3 &mdash; it personalizes ' +
      'your missions, posters &amp; bills.</div>' +
      '<div id="pf-ob-grid" role="group" aria-label="Pick your fights" style="display:grid;' +
      'grid-template-columns:1fr 1fr;gap:6px;margin:.6rem 0;text-align:left;">';
    for (var i = 0; i < opts.length; i++) {
      var id = 'pf-ob-f-' + i;
      var on = cur.indexOf(opts[i][0]) !== -1;
      h += '<label for="' + id + '" style="display:flex;align-items:center;gap:8px;font-size:12px;' +
        'color:#d8cdb4;background:#0d0d0d;border:1px solid #3a2f1d;padding:8px;min-height:44px;' +
        'cursor:pointer;box-sizing:border-box;">' +
        '<input type="checkbox" id="' + id + '" class="pf-ob-cb" data-fid="' + esc(opts[i][0]) + '"' +
        (on ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#c1121f;flex:none;">' +
        esc(opts[i][1]) + '</label>';
    }
    h += '</div><div id="pf-ob-cap" style="display:none;font-size:11px;color:#e8b923;margin:-2px 0 6px;"></div>' +
      '<div style="font-size:11px;color:#8a7f68;margin:2px 0 8px;">Only used to personalize your feed. ' +
      'Never public, never on leaderboards, never shared.</div>' +
      '<button type="button" data-ob-primary id="pf-ob-continue" style="background:#c1121f;color:#fff;' +
      'border:none;font-family:inherit;font-weight:900;letter-spacing:.12em;font-size:.9rem;' +
      'padding:.8rem 2rem;cursor:pointer;min-height:44px;width:100%;box-sizing:border-box;">CONTINUE &rarr;</button>' +
      '<div><button type="button" id="pf-ob-surprise" style="background:none;border:0;color:#e8b923;' +
      'cursor:pointer;font-size:.78rem;text-decoration:underline;padding:.6rem;min-height:44px;' +
      'font-family:inherit;">Surprise me &mdash; skip this</button></div>' +
      skipLink();
    body_.innerHTML = h;
    var grid = body_.querySelector('#pf-ob-grid');
    var boxes = grid.querySelectorAll('.pf-ob-cb');
    var cap = body_.querySelector('#pf-ob-cap');
    for (var j = 0; j < boxes.length; j++) {
      boxes[j].addEventListener('change', function () {
        var checked = grid.querySelectorAll('.pf-ob-cb:checked');
        if (checked.length > 3) {
          this.checked = false;
          if (cap) { cap.textContent = 'Pick up to 3 fights.'; cap.style.display = 'block'; }
        } else if (cap) { cap.style.display = 'none'; }
      });
    }
    function saveAndNext() {
      var out = [], cbx = grid.querySelectorAll('.pf-ob-cb:checked');
      for (var k = 0; k < cbx.length && out.length < 3; k++) {
        out.push(cbx[k].getAttribute('data-fid'));
      }
      try { if (PF.setPickFight) PF.setPickFight(out); } catch (e) {}
      render(2);
    }
    body_.querySelector('#pf-ob-continue').onclick = saveAndNext;
    body_.querySelector('#pf-ob-surprise').onclick = function () {
      try { if (PF.setPickFight) PF.setPickFight([]); } catch (e) {}
      render(2);
    };
    wireSkip(body_);
  }

  /* ---------- step 2: claim callsign ---------- */
  function renderClaim() {
    body_.innerHTML =
      '<div style="font-size:1.15rem;font-weight:900;letter-spacing:.1em;margin-bottom:.5rem;">' +
      'CLAIM YOUR CALLSIGN</div>' +
      '<div style="font-size:.82rem;color:#b8ab8e;line-height:1.55;margin-bottom:1rem;">' +
      'Your name in the fight. Your XP follows it everywhere &mdash; on this ' +
      'device and any other you claim it on.</div>' +
      '<button type="button" data-ob-primary id="pf-ob-claim" style="background:#c1121f;color:#fff;' +
      'border:none;font-family:inherit;font-weight:900;letter-spacing:.12em;font-size:.9rem;' +
      'padding:.8rem 2rem;cursor:pointer;min-height:44px;width:100%;box-sizing:border-box;">' +
      'CLAIM A CALLSIGN</button>' +
      '<div><button type="button" id="pf-ob-anon" style="background:none;border:0;color:#e8b923;' +
      'cursor:pointer;font-size:.78rem;text-decoration:underline;padding:.6rem;min-height:44px;' +
      'font-family:inherit;">I&rsquo;ll stay anonymous for now</button></div>' +
      skipLink();
    body_.querySelector('#pf-ob-claim').onclick = function () {
      if (PF.requireCallsign) {
        PF.requireCallsign(function () { render(3); }, { context: 'to complete your enlistment' });
      } else { render(3); }
    };
    body_.querySelector('#pf-ob-anon').onclick = function () { render(3); };
    wireSkip(body_);
  }

  /* ---------- step 3: first mission ---------- */
  function renderMission() {
    body_.innerHTML =
      '<div style="font-size:1.15rem;font-weight:900;letter-spacing:.1em;margin-bottom:.5rem;">' +
      'YOUR FIRST MISSION IS WAITING</div>' +
      '<div style="font-size:.82rem;color:#b8ab8e;line-height:1.55;margin-bottom:1rem;">' +
      'Today&rsquo;s orders are posted. One tap, one action &mdash; you&rsquo;re in the fight.</div>' +
      '<button type="button" data-ob-primary id="pf-ob-go" style="background:#c1121f;color:#fff;' +
      'border:none;font-family:inherit;font-weight:900;letter-spacing:.12em;font-size:.9rem;' +
      'padding:.8rem 2rem;cursor:pointer;min-height:44px;width:100%;box-sizing:border-box;">' +
      'SEE TODAY&rsquo;S ORDERS &rarr;</button>' +
      skipLink();
    body_.querySelector('#pf-ob-go').onclick = function () {
      done();
      setTimeout(function () {
        try {
          var t = document.getElementById('pf-orders');
          if (t) {
            t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            var prev = t.style.outline;
            t.style.transition = 'outline .3s';
            t.style.outline = '3px solid #c1121f';
            setTimeout(function () { try { t.style.outline = prev || ''; } catch (e) {} }, 2200);
          }
        } catch (e2) {}
      }, 60);
    };
    wireSkip(body_);
  }

  /* ---------- entry chip (re-enter path) ---------- */
  var chip = null;
  function showChip() {
    try {
      if (chip || hasCallsign()) return;
      var st = state();
      if (st === 'done') return;
      var host = document.getElementById('pf-v2');
      if (!host || !host.parentNode) return;
      chip = document.createElement('div');
      chip.id = 'pf-ob-chip';
      chip.innerHTML =
        '<button type="button" id="pf-ob-chipbtn" style="display:block;width:100%;max-width:560px;' +
        'margin:.6rem auto;background:#0d0d0d;border:2px solid #c1121f;color:#f5ead6;' +
        'font-family:Arial,sans-serif;font-weight:900;letter-spacing:.12em;font-size:.8rem;' +
        'padding:.7rem 1rem;cursor:pointer;min-height:44px;box-sizing:border-box;">' +
        '&#9873; NEW HERE? TAKE THE 2-MINUTE START &rarr;</button>';
      host.parentNode.insertBefore(chip, host);
      var btn = chip.querySelector('#pf-ob-chipbtn');
      if (btn) btn.onclick = function () { open(); render(1); };
    } catch (e) {}
  }
  function hideChip() {
    try { if (chip && chip.parentNode) chip.parentNode.removeChild(chip); } catch (e) {}
    chip = null;
  }

  /* If they claim elsewhere, the chip's job is done. */
  document.addEventListener('pf-callsign-claimed', function () {
    hideChip();
    if (overlay) { done(); }
  });

  /* ---------- launch ---------- */
  showChip();
  if (hasCallsign()) { hideChip(); return; }
  if (forced()) { open(); render(1); return; }
  if (state()) return; /* shown/dismissed/done before: chip only */
  setTimeout(function () {
    try {
      if (hasCallsign() || state() || isEditor()) return;
      open(); render(1);
    } catch (e) {}
  }, AUTO_MS);

  /* Public re-entry (console/testing): PF.startOnboarding() */
  try { PF.startOnboarding = function () { if (!hasCallsign()) { open(); render(1); } }; } catch (e) {}
})();
