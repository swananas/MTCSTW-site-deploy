/* games/predict-home.js  |  PF v1.4.3 | CALL THE SHOT home wiring.
   NAMED SURFACE (Prediction Games Home Coordinator decision, 2026-10-05):
   prediction games live in the PHQ BALLOT hub as slot 3.7 — "CALL THE SHOT —
   Prediction Games" — not on /create, not a new page.
   SURVEY (what exists, what this file touches):
     - wave-predict-game-fe: v1.4.3/games/predict.js — CALL THE SHOT bill
       prediction game (user-generated predictions; renders ONLY bills the
       backend returns via predict_list; resolutions come from official bill
       status — nothing is invented). Silo id: predict. NOT edited here.
     - fe/predict-share-call: SHARE YOUR CALL poster (phq-predict-call painter
       in core/share-image-phq.js) — the payoff exit. NOT edited here.
     - merge/fe-predict-share-call (Release Eng staging): already registers
       ['predict','pf-ov-predict'] in pages/political-hq.js ORDER and bundles
       predict.js into bundle-hq. This file MUST NOT duplicate that.
     - be/predict-game: migration v102_predict_game.sql (predictions table) +
       predict_place/list/leaderboard actions; +25 XP rides the existing
       backend predict_win_* leg. NOT edited here.
     - Election-night live mode (fe/election-live-mode): wiring map lists a
       "prediction game" exit — that exit resolves to THIS surface
       (#phq-ballot-predict); the elections crew points their link here.
     - Market Maker / prediction market desk (vault.js, War Room era) is a
       separate cell-internal surface — explicitly NOT this home.
   WHAT THIS FILE DOES (wiring only, zero game logic):
     1. Hub anchor: tags the mounted #pf-predict section wrapper as
        #phq-ballot-predict (data-hub="ballot", data-slot="3.7") so the PHQ
        5-hub build can slot it without touching game code, and so feeder
        surfaces (races tracker, election-live board, War Report results
        beat, Action Center deep link) have a stable target.
     2. Hub header chrome: BALLOT kicker + mission line + AC-return rail
        ("BACK TO ACTION CENTER" -> #pf-action-center), per the hub contract.
     3. Payoff exits rail: cell competitions (results night), pressure
        footprint, races tracker — plus the in-game SHARE YOUR CALL poster
        (fe/predict-share-call). Every rail link is a same-page anchor;
        missing targets are a no-op, never an error.
   LAYERING: pure decorator. Reads nothing from other silos' internals;
   reaches only public DOM anchors. Runs after predict.js mounts.
   KILL: same silo id as the game — ?pf_off=predict (or localStorage
   pf_disabled_v1='["predict"]'). Decorator honors PF.skip('predict').
   COPY: hub mission + CTA labels are provisional — Psych holds veto.
   FAIL-SOFT: every DOM touch is guarded; missing #pf-predict (killed or
   backend-gated) is a silent no-op. Never throws.
   XP: none granted here. No new currencies, no new mechanics. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('predict')) { return; }

  var ANCHOR = 'phq-ballot-predict';
  var DONE = 'data-pf-predict-home';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function decorate() {
    try {
      var inner = document.getElementById('pf-predict');
      if (!inner) return false;
      if (inner.getAttribute(DONE)) return true;
      inner.setAttribute(DONE, '1');

      /* Hub anchor: stable target for feeders + the 5-hub build. Keep the
         #pf-predict id intact — the game's own CSS and code depend on it. */
      var section = inner;
      try {
        if (inner.closest) {
          var wrap = inner.closest('section[data-game="predict"]');
          if (wrap) section = wrap;
        }
      } catch (e) {}
      try {
        section.setAttribute('id', ANCHOR);
        section.setAttribute('data-hub', 'ballot');
        section.setAttribute('data-slot', '3.7');
      } catch (e) {}

      /* Hub header chrome: kicker + mission + AC-return rail. */
      var head = document.createElement('div');
      head.className = 'phh-head';
      head.innerHTML =
        '<div class="phh-kicker">BALLOT &middot; SECTION 3.7</div>' +
        '<div class="phh-mission">Read the room. Lock your calls before results drop. ' +
        'Boards come from the live backend &mdash; nothing here is invented.</div>' +
        '<div class="phh-rail">' +
        '<a class="phh-btn phh-back" href="#pf-action-center">BACK TO ACTION CENTER</a>' +
        '</div>';
      try { inner.insertBefore(head, inner.firstChild); } catch (e) {}

      /* Payoff exits rail: where the user goes NEXT (loop law). */
      var rail = document.createElement('div');
      rail.className = 'phh-exits';
      rail.innerHTML =
        '<div class="phh-exits-label">NEXT MOVES</div>' +
        '<div class="phh-rail">' +
        '<a class="phh-btn" href="#cvCompBox">RESULTS NIGHT: CELL COMPETITIONS</a>' +
        '<a class="phh-btn" href="#pf-footprint">YOUR PRESSURE FOOTPRINT</a>' +
        '<a class="phh-btn" href="#pf-races">BACK TO RACES</a>' +
        '</div>' +
        '<div class="phh-note">Lock a pick and hit SHARE YOUR CALL to post your ' +
        'prediction poster. +25 XP when the board resolves in your favor.</div>';
      try { inner.appendChild(rail); } catch (e) {}

      return true;
    } catch (e) { return false; }
  }

  function styles() {
    try {
      if (document.getElementById('pf-predict-home-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-predict-home-css';
      st.textContent =
        '#phq-ballot-predict .phh-head{margin:0 0 12px}' +
        '#phq-ballot-predict .phh-kicker{font-size:0.72rem;letter-spacing:0.22em;color:#b8ab8e;font-weight:700;margin-bottom:6px}' +
        '#phq-ballot-predict .phh-mission{font-size:0.88rem;color:#f5f0e1;margin-bottom:10px;line-height:1.45}' +
        '#phq-ballot-predict .phh-rail{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}' +
        '#phq-ballot-predict .phh-btn{flex:1 1 160px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;' +
        'font-weight:900;font-size:0.85rem;letter-spacing:0.1em;text-decoration:none;text-align:center;' +
        'border:2px solid var(--pf-red);background:#141414;color:#f5f0e1;font-family:inherit;padding:10px 12px;box-sizing:border-box}' +
        '#phq-ballot-predict .phh-btn:active{background:var(--pf-red)}' +
        '#phq-ballot-predict .phh-back{border-color:var(--pf-gold)}' +
        '#phq-ballot-predict .phh-exits{margin-top:16px;border-top:2px solid #3a3a3a;padding-top:12px}' +
        '#phq-ballot-predict .phh-exits-label{font-size:0.75rem;letter-spacing:0.2em;color:var(--pf-red);font-weight:900;margin-bottom:4px}' +
        '#phq-ballot-predict .phh-note{font-size:0.8rem;color:#b8ab8e;margin-top:8px;line-height:1.45}';
      (document.head || document.documentElement).appendChild(st);
    } catch (e) {}
  }

  styles();

  /* predict.js mounts late (template -> ORDER instantiation -> JSONP). Watch
     for #pf-predict and decorate once; retry twice more for slow loads. */
  function tryDecorate() { decorate(); }
  try {
    if (typeof MutationObserver !== 'undefined' && document.body) {
      var obs = new MutationObserver(function () {
        if (decorate()) { try { obs.disconnect(); } catch (e) {} }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { try { obs.disconnect(); } catch (e) {} }, 30000);
    }
  } catch (e) {}
  tryDecorate();
  setTimeout(tryDecorate, 3000);
  setTimeout(tryDecorate, 9000);
})();
