/* games/ballot-countdown.js  |  PF v1.4.3 | BALLOT COUNTDOWN CARDS.
   Forged-for-You ballot drafts: one JSONP read of ?action=ballot_countdowns
   per page view (module cache), filtered to the viewer's LOCAL home state
   (localStorage pf_home_state_v1 / PF.homeState() — frontend-only, zero
   backend writes). Stateless ("") or unset (null) -> renders nothing.
   Cards paint via PF.PHQShare.paint('phq-ballot', {...}) — pure canvas, no
   XP side effects.

   XP — Economy Desk ruling 2026-10-05 (binding, veto final):
     T1 generate card from draft -> pf-xp {gain:1, key:'poster_ballot:<draft_id>'}
        poster_ leg, draft-scoped, NO day component. One draft pays once, ever.
     T2 share/post card          -> pf-xp {gain:1, key:'share_ballot:<card_id>'}
        share leg, card-scoped, NO day component. One card pays once, ever.
     T5 viewing / claiming drafts -> 0 XP. claimDraft() is an XP-free marker —
        any grant emitted from a claim handler would be a new mechanic.
   This module NEVER dispatches pf-poster-made or pf-share-image (those fire
   the generic poster_/share legs and would double-pay the same action) and
   NEVER posts to the poster_share proof endpoint (create_share: +5 DENIED
   for ballot cards — eligibility gate fails closed; widening it would be a
   new mechanic).
   Discord ammo-drop contract (T3): deep link #ballot-forge=<draft_id> forges
   the same draft with the IDENTICAL T1 key space — no per-surface keys, no
   source bonus.
   Civic snapshot widget contract: ballot_countdowns entries carry draft_id;
   the widget links its ballot line to '#ballot-forge=<draft_id>'.
   BEHAVIORAL LOOP (CEO directive 2026-10-05): every outbound loop is
   informative + carries a CTA back with a dopamine payoff on arrival.
   Loop: inform (days left) -> invite back (CHECK REGISTRATION / PLEDGE TO
   VOTE) -> pay off on-site (CHECKED / PLEDGED states + confirmation +
   the T1/T2 XP toasts). No dead ends: every card and tray entry resolves
   to an action with a visible state change. Checking and pledging are
   0-XP actions (Economy Desk T5) — the payoff is the confirmation, not XP.
   FAIL-SOFT: backend down/empty/error -> the tray renders nothing (no box,
   no spinner forever; 12s timeout). Kill: ?pf_off=ballotcd or
   localStorage pf_disabled_v1='["ballotcd"]'. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ballotcd')) { return; }
  if (window.pfBallotCdDone) return;
  window.pfBallotCdDone = true;

  var MOUNT_ID = 'pf-forged-ballot';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function okURL(u) {
    var s = String(u == null ? '' : u).trim();
    return /^(https?:)\/\//i.test(s) ? s : '';
  }

  /* Viewer home state: "" = stateless, null = never chosen -> both skip. */
  function homeState() {
    var v = null;
    try { v = localStorage.getItem('pf_home_state_v1'); } catch (e) { v = null; }
    if (v == null) {
      try { v = String((PF.homeState && PF.homeState()) || '').trim().toUpperCase() || null; }
      catch (e2) { v = null; }
    } else {
      v = String(v).trim().toUpperCase();
    }
    if (!v || !/^[A-Z]{2}$/.test(v)) return '';
    return v;
  }

  /* ---------- data: one JSONP read per page view ---------- */
  var CACHE = null, FETCHED = false;
  function fetchCountdowns(cb) {
    if (FETCHED) { cb(CACHE); return; }
    FETCHED = true;
    /* ballot_countdowns has no backend route — fail-soft: no countdowns. */
    cb(null);
  }

  /* ---------- XP: existing mirror legs only, ballot-scoped keys ---------- */
  function payXp(key, reason) {
    try {
      document.dispatchEvent(new CustomEvent('pf-xp', {
        detail: { gain: 1, key: key, reason: reason }
      }));
    } catch (e) {}
  }
  /* T5: claim is an XP-free marker. Viewing is passive. */
  function claimDraft(draftId) {
    try {
      localStorage.setItem('pf_ballot_claimed_' + String(draftId), '1');
    } catch (e) {}
    return true;
  }

  /* ---------- behavioral loop: checked + pledged states (0 XP) ---------- */
  /* Checking registration and pledging to vote are on-site actions with a
     visible state change + confirmation payoff. They carry NO XP (Economy
     Desk T5) — the dopamine is the confirmation, never a grant. */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function isChecked(draftId) { return lsGet('pf_ballot_checked_' + draftId) === '1'; }
  function isPledged(draftId) { return lsGet('pf_ballot_pledged_' + draftId) != null; }
  function markChecked(draftId) { lsSet('pf_ballot_checked_' + draftId, '1'); }
  function pledge(cd) {
    lsSet('pf_ballot_pledged_' + String(cd.draft_id), String(Date.now()));
    pledgeOverlay(cd);
    return true;
  }
  /* Pledge confirmation: the on-arrival payoff. Informative (state +
     Election Day), invitational (share CTA), satisfying (pledged state). */
  function pledgeOverlay(cd) {
    try {
      var old = document.getElementById('pfbc-pledge-ov');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var ov = document.createElement('div');
      ov.id = 'pfbc-pledge-ov';
      ov.innerHTML =
        '<div class="pfbc-ov-card">' +
        '<div class="pfbc-ov-kicker">\u2605 THE PROPAGANDA FACTORY \u2605</div>' +
        '<div class="pfbc-ov-head">PLEDGE LOGGED.</div>' +
        '<div class="pfbc-ov-body">You\u2019re in the fight for ' + esc(cd.state) +
        '. Polls are open through <b>ELECTION DAY \u2014 NOVEMBER 3, 2026</b>.</div>' +
        '<div class="pfbc-ov-sub">Your callsign is on the card. Now put your vote where your mouth is.</div>' +
        '<button class="pfbc-ov-btn" id="pfbc-ov-share">SHARE YOUR COUNTDOWN</button>' +
        '<button class="pfbc-ov-x" id="pfbc-ov-x">BACK TO THE FIGHT</button>' +
        '</div>';
      document.body.appendChild(ov);
      var close = function () { try { ov.parentNode.removeChild(ov); } catch (e) {} };
      document.getElementById('pfbc-ov-x').addEventListener('click', close);
      ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
      document.getElementById('pfbc-ov-share').addEventListener('click', function () {
        close();
        var card = forge(cd);
        if (card) shareCard(card);
      });
    } catch (e) {}
  }

  /* ---------- card lifecycle ---------- */
  function cardIdFor(draft) {
    /* Card-scoped identity: stable for one generated card instance.
       draft_id + short random per generation — no day component. */
    var r = '';
    try {
      var b = new Uint8Array(3);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b)
        : b.forEach(function (_, i) { b[i] = Math.floor(Math.random() * 256); });
      for (var i = 0; i < b.length; i++) r += ('0' + b[i].toString(16)).slice(-2);
    } catch (e) { r = String(Math.floor(Math.random() * 16777216).toString(16)); }
    return String(draft.draft_id) + '_' + r;
  }
  function paintData(cd) {
    return {
      state: cd.state,
      daysLeft: cd.same_day ? null : cd.days_left,
      deadline: cd.deadline,
      registerUrl: cd.register_url,
      sameDay: !!cd.same_day
    };
  }
  /* T1: user generates the card. Pays poster_ +1 via the mirror leg with
     the draft-scoped key — one draft pays once, ever. */
  function forge(cd) {
    var PHQ = PF.PHQShare;
    if (!PHQ || !PHQ.paint) return null;
    var cv = null;
    try { cv = PHQ.paint('phq-ballot', paintData(cd)); } catch (e) { cv = null; }
    if (!cv) return null;
    payXp('poster_ballot:' + String(cd.draft_id), 'ballot countdown card generated');
    return { canvas: cv, card_id: cardIdFor(cd), draft: cd };
  }
  /* T2: user shares/posts the card. Pays share +1 via the mirror leg with
     the card-scoped key — one card pays once, ever. Deliberately does NOT
     route through PFShare.shareImage/saveImage: those fire pf-share-image
     (the generic share leg) and would double-pay the same action. */
  function shareCard(card, title) {
    if (!card || !card.canvas) return false;
    var cv = card.canvas;
    /* The painter stamps FIGHTING AS <CALLSIGN> inline (cv._pfStamped);
       the canvas ships as painted — no second stamp pass. */
    function done() {
      payXp('share_ballot:' + String(card.card_id), 'ballot countdown card shared');
      try { if (PF.toast) PF.toast('Shared. Go spread the word.'); } catch (e2) {}
    }
    try {
      cv.toBlob(function (blob) {
        if (!blob) { try { if (PF.toast) PF.toast('Card failed — try again.'); } catch (e) {} return; }
        var fn = 'ballot-countdown-' + String(card.draft.state || 'xx').toLowerCase() + '.png';
        var file = null;
        try { file = new File([blob], fn, { type: 'image/png' }); } catch (e2) {}
        /* The shared card carries the ballot CTA in its share text — the
           outbound loop always deep-links to the registration action. */
        var regLine = okURL(card.draft.register_url)
          ? ' REGISTER: ' + card.draft.register_url : ' REGISTER: https://www.vote.gov/register/';
        var shareText = 'JOIN THE FIGHT.' + regLine + ' — mtcstw.com';
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            navigator.share({ files: [file], title: title || 'BALLOT COUNTDOWN', text: shareText })
              .then(done, function (err) {
                if (err && err.name === 'AbortError') return;
                downloadBlob(blob, fn); done();
              });
          } catch (e3) { downloadBlob(blob, fn); done(); }
        } else { downloadBlob(blob, fn); done(); }
      }, 'image/png');
    } catch (e) { return false; }
    return true;
  }
  function downloadBlob(blob, fn) {
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fn;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { document.body.removeChild(a); } catch (e) {} }, 4000);
    } catch (e) {}
  }
  /* ---------- tray render (Forged-for-You mount) ---------- */
  /* Every tray entry resolves to an action with a visible state change —
     no dead ends (CEO behavioral directive):
       FORGE CARD        -> paints the card, T1 XP toast (informative payoff)
       SHARE CARD        -> share sheet, T2 XP toast
       CHECK REGISTRATION-> off-site register_url; marks CHECKED on click
       I CHECKED ✓       -> checked state (was: CHECK REGISTRATION)
       PLEDGE TO VOTE    -> on-site pledge -> PLEDGE LOGGED confirmation
       ✓ PLEDGED         -> pledged state */
  function cardHTML(cd) {
    var head = cd.same_day ? 'NO DEADLINE — REGISTER AT THE POLLS'
      : cd.days_left === 0 ? 'TODAY: LAST DAY TO REGISTER'
      : cd.days_left === 1 ? '1 DAY LEFT TO REGISTER'
      : cd.days_left + ' DAYS LEFT TO REGISTER';
    var id = esc(cd.draft_id);
    var btns = '<button class="pfbc-forge" data-forge="' + id + '">FORGE CARD</button>';
    if (okURL(cd.register_url)) {
      btns += isChecked(cd.draft_id)
        ? '<span class="pfbc-done">\u2713 REGISTRATION CHECKED</span>'
        : '<a class="pfbc-reg" data-check="' + id + '" href="' + esc(cd.register_url) + '" target="_blank" rel="noopener">CHECK REGISTRATION</a>';
    }
    btns += isPledged(cd.draft_id)
      ? '<span class="pfbc-done pfbc-pledged">\u2713 PLEDGED TO VOTE</span>'
      : '<button class="pfbc-pledge" data-pledge="' + id + '">PLEDGE TO VOTE</button>';
    return '<div class="pfbc-card" data-draft="' + id + '">' +
      '<div class="pfbc-head">' + esc(head) + '</div>' +
      '<div class="pfbc-sub">' + esc(cd.state) + (cd.deadline ? ' · DEADLINE ' + esc(cd.deadline) : '') + '</div>' +
      '<div class="pfbc-btns">' + btns + '</div></div>';
  }
  function renderTray(list) {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    if (!list || !list.length) { mount.style.display = 'none'; return; }
    function draw() {
      mount.innerHTML = '<h3>YOUR BALLOT COUNTDOWN</h3>' +
        list.map(cardHTML).join('') +
        '<div class="pfbc-note">Deadlines from official state sources. Forging a card stamps your callsign. Checking and pledging earn no XP — the vote is the payoff.</div>';
      wire(mount, list, draw);
    }
    draw();
  }
  function wire(mount, list, redraw) {
    function find(id) {
      for (var j = 0; j < list.length; j++)
        if (String(list[j].draft_id) === String(id)) return list[j];
      return null;
    }
    var i, b;
    var forges = mount.querySelectorAll('[data-forge]');
    for (i = 0; i < forges.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          var cd = find(el.getAttribute('data-forge'));
          if (!cd) return;
          var card = forge(cd);
          if (!card) { try { if (PF.toast) PF.toast('Card failed — try again.'); } catch (e) {} return; }
          var sb = document.createElement('button');
          sb.className = 'pfbc-share'; sb.textContent = 'SHARE CARD';
          sb.addEventListener('click', function () { shareCard(card); });
          el.parentNode.replaceChild(sb, el);
          try { if (PF.toast) PF.toast('CARD FORGED — +1 XP'); } catch (e2) {}
        });
      })(forges[i]);
    }
    var checks = mount.querySelectorAll('[data-check]');
    for (i = 0; i < checks.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          /* The link opens the official registration check off-site; the
             click marks the on-site CHECKED state — the payoff on return. */
          markChecked(el.getAttribute('data-check'));
          setTimeout(redraw, 600);
        });
      })(checks[i]);
    }
    var pledges = mount.querySelectorAll('[data-pledge]');
    for (i = 0; i < pledges.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          var cd = find(el.getAttribute('data-pledge'));
          if (!cd) return;
          pledge(cd);
          setTimeout(redraw, 600);
        });
      })(pledges[i]);
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    var st = homeState();
    if (!st) return; /* stateless / unset: no drafts rendered */
    /* 2026-10-05 (fe/political-hq-optimize): skip the countdowns read when the
       tray mount is absent — the bundle loads on /political-hq but the
       #pf-forged-ballot mount lives elsewhere (hand-step). Fetching into the
       void was one wasted JSONP read per pageview for every home-state user.
       (DOM check after the state check so stateless users never touch the DOM.) */
    if (!document.getElementById(MOUNT_ID)) return;
    /* Deep-link contract for the Discord ammo drop (T3): #ballot-forge=<draft_id>
       forges the same draft with the identical T1 key space. */
    var deepId = null;
    try {
      var m = String(location.hash || '').match(/#ballot-forge=([^&]+)/);
      if (m) deepId = decodeURIComponent(m[1]);
    } catch (e) {}
    fetchCountdowns(function (cds) {
      if (!cds) return;
      var mine = [];
      for (var i = 0; i < cds.length; i++) if (cds[i] && cds[i].state === st) mine.push(cds[i]);
      renderTray(mine);
      if (deepId && mine.length) {
        for (var j = 0; j < mine.length; j++) {
          if (String(mine[j].draft_id) === String(deepId)) { forge(mine[j]); break; }
        }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* Public contract for the Forged-for-You tray sibling + civic widget.
     checked()/pledged() let the widget render countdown state changes. */
  try {
    PF.ballotCountdowns = {
      homeState: homeState,
      fetch: fetchCountdowns,
      forge: forge,
      share: shareCard,
      claim: claimDraft, /* XP-free marker (T5) */
      pledge: pledge, /* 0 XP — confirmation is the payoff */
      checked: isChecked,
      pledged: isPledged,
      paintData: paintData
    };
  } catch (e) {}
})();
