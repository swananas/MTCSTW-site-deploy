/* games/cell-first-hour.js  |  PF v1.4.3 | CELLS wave G1: guided cell first hour.
   EXTENDS R19 (core/22-squadjoin.js, wave-6b-4): R19's post-claim interstitial
   ("YOU HAVE A NAME. NOW GET A SQUAD.") routes peak-identity arrivals to
   /cells. This module continues the guided first hour AFTER the form/join
   moment — it does NOT re-implement the post-claim card (dedupe; R19 owns
   that surface).
   Founder path: cell formed -> 3-step checklist (1. share code via poster ->
   2. check in -> 3. recruit fighter #2 for the VERIFIED badge). Steps 2 and
   3 check off live from cell_mine reads; step 1 completes when the recruit
   poster share opens (the share-sheet invocation is the action — no backend
   signal exists for a poster share).
   Joiner path: cell joined -> induction (1. check in -> 2. cover-rule
   explainer -> 3. recruit one -> the EXISTING +25 XP recruit bounty, which
   pays through the already-wired cell_bounty_claim path). Zero new XP here —
   pure routing into existing payouts.
   Listens for pf-cell-formed / pf-cell-joined (dispatched by games/cells.js
   on form/join success). Both paths dismiss permanently (localStorage) and
   hand off to the S4 NEXT OP card when done.
   KILL: ?pf_off=cell-first-hour  or  localStorage pf_disabled_v1='["cell-first-hour"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('cell-first-hour')) { return; }
  if (window.pfCellFirstHourDone) { return; }
  window.pfCellFirstHourDone = true;

  var DIS_KEY = 'pf_cell_fh_v1'; /* permanent dismissal: {f_<cellid>:1, j_<cellid>:1} */
  var POLL_MS = 30000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function loadDis() {
    try { return JSON.parse(localStorage.getItem(DIS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function dismissed(kind, cellId) {
    try { return !!loadDis()[kind + '_' + cellId]; } catch (e) { return false; }
  }
  function markDismissed(kind, cellId) {
    try {
      var o = loadDis(); o[kind + '_' + cellId] = 1;
      localStorage.setItem(DIS_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function getFlag(k) {
    try { return localStorage.getItem(k) === '1'; } catch (e) { return false; }
  }
  function setFlag(k) {
    try { localStorage.setItem(k, '1'); } catch (e) {}
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }
  function myIdent() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  /* Live cell_mine read — the same auth path games/cells.js uses. */
  function readMine(cb) {
    var BACKEND = window.PF_BACKEND_URL, id = myIdent();
    if (!BACKEND || !id.callsign) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, 'cell_mine', { callsign: id.callsign, device: id.device }, cb);
        return;
      }
    } catch (e) {}
    cb(null);
  }
  function findCell(j, cellId) {
    try {
      var list = (j && j.cells) || [], i;
      for (i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(cellId)) return list[i];
      }
      if (j && j.cell && String(j.cell.id) === String(cellId)) return j.cell;
    } catch (e) {}
    return null;
  }
  /* S4 NEXT OP handoff — same pattern as pages/recruit-welcome.js. */
  function goNextop() {
    var t = null;
    try { t = document.getElementById('pf-nextop'); } catch (e) {}
    if (t) {
      try { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {}
    } else {
      try { location.href = '/#pf-orders'; } catch (e3) {}
    }
  }
  function goCheckin() {
    var c = null;
    try { c = document.getElementById('cCheckin'); } catch (e) {}
    if (c) {
      try { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e2) {}
      return;
    }
    var p = null;
    try { p = document.getElementById('pf-cells'); } catch (e3) {}
    if (p) { try { p.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e4) {} }
  }
  /* Step 1 (both paths): open the recruit flow. Full-mode pages have the
     real RECRUIT button (mint the poster -> native share sheet); slim pages
     fall back to copying the invite code. Either invocation counts — the
     share-sheet opening IS the share action. */
  function openRecruit() {
    var rec = null;
    try { rec = document.getElementById('cRecruit'); } catch (e) {}
    if (rec) { try { rec.click(); } catch (e2) {} return; }
    var code = '', codeEl = null;
    try {
      codeEl = document.getElementById('cCodeShow');
      code = codeEl ? String(codeEl.textContent || '').trim() : '';
    } catch (e3) {}
    if (!code) { toast('Recruit from the /cells page.'); return; }
    function done2() { toast('Code copied: ' + code + ' — send it anywhere.'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done2, function () { toast('Cell code: ' + code); });
      } else { toast('Cell code: ' + code); }
    } catch (e4) { toast('Cell code: ' + code); }
  }

  var active = null; /* one guided card at a time */

  /* TEARDOWN WS-3 (News Desk gate): the red-button rule — only enlistment
     and the DEPLOY family may be red. "GOT IT" is a confirmation, so it
     renders ghost (non-red). */
  function stepRow(num, title, body, done, btnId, btnLabel, ghostBtn) {
    var h = '<div style="margin:.55rem 0;padding:.7rem .8rem;text-align:left;box-sizing:border-box;' +
      (done
        ? 'border:2px solid #2f7a3d;background:#0a140a;'
        : 'border:2px solid #5a1518;background:#141010;') + '">';
    h += '<div style="font-weight:900;letter-spacing:.08em;font-size:.85rem;color:' +
      (done ? '#7ddf8a' : '#f5f0e1') + ';">' +
      (done ? '&#10003; ' : num + ' &mdash; ') + esc(title) + '</div>';
    if (!done) {
      h += '<div style="font-size:.78rem;color:#b8ab8e;line-height:1.5;margin:.3rem 0 .5rem;">' + body + '</div>';
      if (btnId) {
        var btnStyle = ghostBtn
          ? 'display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5f0e1;font-weight:900;letter-spacing:.1em;padding:.55rem 1.1rem;font-size:.78rem;cursor:pointer;'
          : 'display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;font-weight:900;letter-spacing:.1em;padding:.55rem 1.1rem;font-size:.78rem;cursor:pointer;';
        h += '<button type="button" id="' + btnId + '" style="' + btnStyle + '">' + esc(btnLabel) + '</button>';
      }
    }
    h += '</div>';
    return h;
  }

  function renderCard() {
    var st = active;
    if (!st) return;
    var card = null;
    try { card = document.getElementById('pf-cell-firsthour'); } catch (e) {}
    if (!card) return;
    var stepsEl = null;
    try { stepsEl = card.querySelector('#pf-fh-steps'); } catch (e2) {}
    if (!stepsEl) return;

    var h = '';
    if (st.kind === 'f') {
      h += stepRow(1, 'SPREAD THE CODE',
        'Mint the recruit poster and put your invite code in front of fresh fighters. No recruits, no cell.',
        st.shared, 'pf-fh-share', 'MINT THE RECRUIT POSTER');
      h += stepRow(2, 'CHECK IN',
        'Light the streak. Day one starts with you — the founder checks in first.',
        st.checked, 'pf-fh-checkin', 'GO CHECK IN');
      h += stepRow(3, 'RECRUIT FIGHTER #2',
        'One more callsign earns the VERIFIED badge. Unverified cells are rumors; verified cells are facts.',
        st.verified, null, null);
    } else {
      h += stepRow(1, 'CHECK IN',
        'The streak needs you today. Every day the whole cell checks in, the streak climbs and everyone banks more XP.',
        st.checked, 'pf-fh-checkin', 'GO CHECK IN');
      h += stepRow(2, 'THE COVER RULE',
        'Miss a day and a cellmate can cover you &mdash; once per week. That is the whole safety net. ' +
        'No blame, no questions — the net holds.',
        st.coverOk, 'pf-fh-cover', 'GOT IT', true);
      h += stepRow(3, 'RECRUIT ONE',
        'Bring one fighter in. When your recruit checks in, the +25 XP recruit bounty pays through the existing bounty wire &mdash; no extra steps.',
        st.recruited, 'pf-fh-share', 'RECRUIT ONE');
    }

    var allDone = st.kind === 'f'
      ? (st.shared && st.checked && st.verified)
      : (st.checked && st.coverOk && st.recruited);

    if (allDone) {
      stepsEl.innerHTML =
        '<div style="margin:.6rem 0;padding:1rem;border:2px solid #2f7a3d;background:#0a140a;">' +
        '<div style="color:#7ddf8a;font-weight:900;letter-spacing:.12em;font-size:.95rem;">&#10003; FIRST HOUR COMPLETE.</div>' +
        '<div style="font-size:.8rem;color:#b8ab8e;margin:.4rem 0 .7rem;line-height:1.5;">The cell is armed. Your next op is waiting.</div>' +
        '<button type="button" id="pf-fh-nextop" style="display:inline-block;background:#c1121f;border:2px solid #c1121f;' +
        'color:#fff;font-weight:900;letter-spacing:.12em;padding:.7rem 1.4rem;font-size:.82rem;cursor:pointer;">' +
        'SEE TODAY\u2019S NEXT OP &darr;</button></div>';
      var nb = stepsEl.querySelector('#pf-fh-nextop');
      if (nb) nb.onclick = function () {
        markDismissed(st.kind, st.cellId);
        destroy();
        goNextop();
      };
      return;
    }

    stepsEl.innerHTML = h;
    function wire(id, fn) {
      var b = null;
      try { b = stepsEl.querySelector('#' + id); } catch (e3) {}
      if (b) b.onclick = fn;
    }
    wire('pf-fh-share', function () {
      openRecruit();
      if (st.kind === 'f') { st.shared = true; setFlag('pf_fh_shared_' + st.cellId); }
      renderCard();
      /* A recruit joining now shows up on the next live read. */
      setTimeout(refresh, 8000);
    });
    wire('pf-fh-checkin', function () { goCheckin(); });
    wire('pf-fh-cover', function () {
      st.coverOk = true;
      setFlag('pf_fh_coverok_' + st.cellId);
      renderCard();
    });
  }

  function refresh() {
    var st = active;
    if (!st) return;
    readMine(function (j) {
      if (!active || active.cellId !== st.cellId) return;
      if (!j || !j.ok) return;
      var c = findCell(j, st.cellId);
      if (!c) { destroy(); return; } /* left the cell — stand down */
      st.checked = !!c.checked_today;
      st.verified = !!c.verified;
      if (st.kind === 'j') {
        var pend = (j.bounties_pending || []).length;
        var mems = Number(c.members) || 0;
        st.recruited = pend > 0 || mems > st.baseline;
      }
      renderCard();
    });
  }

  function destroy() {
    if (active && active.timer) { try { clearInterval(active.timer); } catch (e) {} }
    active = null;
    var card = null;
    try { card = document.getElementById('pf-cell-firsthour'); } catch (e2) {}
    try { if (card && card.parentNode) card.parentNode.removeChild(card); } catch (e3) {}
  }

  function mount(kind, cell) {
    var cellId = cell && (cell.id || cell.cell_id);
    var cellName = (cell && cell.name) || 'YOUR CELL';
    if (!cellId) return;
    if (dismissed(kind, cellId)) return;
    var host = null;
    try { host = document.getElementById('pf-cells'); } catch (e) {}
    if (!host) return;
    destroy();
    try { if (document.getElementById('pf-cell-firsthour')) return; } catch (e2) {}

    var card = document.createElement('div');
    card.id = 'pf-cell-firsthour';
    card.setAttribute('data-pf-firsthour', '1');
    card.style.cssText = 'border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;' +
      'padding:1.4rem 1.2rem;margin:0 0 1.2rem;text-align:center;box-sizing:border-box;' +
      'box-shadow:0 0 30px rgba(193,18,31,.4);font-family:inherit;';

    var kicker = kind === 'f' ? 'CELL ARMED &mdash; YOUR FIRST HOUR' : 'WIRED IN &mdash; YOUR FIRST HOUR';
    var title = kind === 'f'
      ? esc(cellName.toUpperCase()) + ' IS LIVE'
      : 'WELCOME TO ' + esc(cellName.toUpperCase());
    var sub = kind === 'f'
      ? 'Three moves. Do them now and your cell stops being an idea and starts being a weapon.'
      : 'You have a squad now. Three moves to become dangerous.';

    card.innerHTML =
      '<div style="color:#c1121f;font-weight:900;letter-spacing:.16em;font-size:.85rem;margin-bottom:.3rem;">' +
      '&#9873; ' + kicker + '</div>' +
      '<div style="color:#f5ead6;font-weight:900;font-size:1.35rem;letter-spacing:.04em;margin-bottom:.3rem;">' +
      title + '</div>' +
      '<div style="font-size:.82rem;color:#b8ab8e;line-height:1.55;margin-bottom:.6rem;">' + sub + '</div>' +
      '<div id="pf-fh-steps"></div>' +
      '<div style="margin-top:.6rem;"><button type="button" id="pf-fh-dismiss" ' +
      'style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;' +
      'cursor:pointer;text-decoration:underline;">dismiss</button></div>';

    try {
      if (host.firstChild) host.insertBefore(card, host.firstChild);
      else host.appendChild(card);
    } catch (e3) { return; }
    try { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e4) {}

    active = {
      kind: kind, cellId: String(cellId), cellName: cellName,
      shared: kind === 'f' ? getFlag('pf_fh_shared_' + cellId) : false,
      checked: false, verified: false,
      coverOk: kind === 'j' ? getFlag('pf_fh_coverok_' + cellId) : true,
      recruited: false, baseline: 1, timer: null
    };

    var dis = null;
    try { dis = card.querySelector('#pf-fh-dismiss'); } catch (e5) {}
    if (dis) dis.onclick = function () {
      markDismissed(kind, active ? active.cellId : cellId);
      destroy();
    };

    /* First live read seeds checked/verified/baseline, then poll. */
    refresh();
    active.timer = setInterval(refresh, POLL_MS);
    var st0 = active;
    readMine(function (j) {
      if (!st0 || active !== st0) return;
      var c = j && findCell(j, st0.cellId);
      if (c && st0.kind === 'j') st0.baseline = Number(c.members) || 1;
    });
  }

  /* Manual taps on the real RECRUIT button also complete founder step 1 —
     the share-sheet opening is the action, wherever it starts. */
  document.addEventListener('click', function (e) {
    try {
      if (active && active.kind === 'f' && !active.shared &&
          e && e.target && e.target.id === 'cRecruit') {
        active.shared = true;
        setFlag('pf_fh_shared_' + active.cellId);
        renderCard();
      }
    } catch (e2) {}
  }, true);

  document.addEventListener('pf-cell-formed', function (e) {
    var cell = e && e.detail && e.detail.cell;
    if (!cell) return;
    setTimeout(function () { mount('f', cell); }, 600);
  });
  document.addEventListener('pf-cell-joined', function (e) {
    var cell = e && e.detail && e.detail.cell;
    if (!cell) return;
    setTimeout(function () { mount('j', cell); }, 600);
  });
})();
