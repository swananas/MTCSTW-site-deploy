/* games/cell-briefing.js  |  PF v1.4.3 | Political HQ weave #5: "YOUR CELL'S FIGHT".
   One-time political briefing shown once after a member joins (or forms) a
   cell: the cell's state -> its 2 senators, a House-rep lookup link, the top
   active federal bills, open pressure campaigns, and the next ballot
   deadline. Stateless cells get the federal version. All data is pulled LIVE
   at display time from the member-only cell_briefing_get backend rail —
   nothing is invented here; sections with no data hide, never error.
   Dismisses permanently via localStorage (per-cell, same idiom as
   cell-first-hour). One screen — not a tour, not a multi-step flow.
   ZERO XP: this module grants nothing and triggers no XP legs. It only
   reads. (XP wiring table recorded in the weave #5 handoff.)
   KILL: ?pf_off=cell-briefing  or  localStorage pf_disabled_v1='["cell-briefing"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('cell-briefing')) { return; }
  if (window.pfCellBriefingDone) { return; }
  window.pfCellBriefingDone = true;

  var DIS_KEY = 'pf_cell_briefing_v1'; /* permanent dismissal: {b_<cellid>:1} */
  var CARD_ID = 'pf-cell-briefing';
  var MOUNT_MS = 1200; /* after cell-first-hour's 600ms — briefing lands on top */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Only http(s) URLs from the backend may become links. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (/^https?:\/\/[^\s<>"']+$/i.test(s)) return s;
    return null;
  }
  function loadDis() {
    try { return JSON.parse(localStorage.getItem(DIS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function dismissed(cellId) {
    try { return !!loadDis()['b_' + cellId]; } catch (e) { return false; }
  }
  function markDismissed(cellId) {
    try {
      var o = loadDis(); o['b_' + cellId] = 1;
      localStorage.setItem(DIS_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function myIdent() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function fetchBriefing(cellId, cb) {
    var BACKEND = window.PF_BACKEND_URL, id = myIdent();
    if (!BACKEND || !id.callsign || !cellId) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, 'cell_briefing_get',
          { callsign: id.callsign, device: id.device, cell_id: cellId }, cb);
        return;
      }
    } catch (e) {}
    cb(null);
  }
  function prettyStatus(st) {
    var s = String(st || '').replace(/-/g, ' ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  function dateLine(iso) {
    /* '2026-10-19' -> 'Oct 19, 2026'. Defensive: pass through on bad input. */
    try {
      var p = String(iso || '').split('-');
      if (p.length < 3) return esc(iso);
      var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var mi = parseInt(p[1], 10) - 1;
      if (mi < 0 || mi > 11) return esc(iso);
      return mo[mi] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
    } catch (e) { return esc(iso); }
  }

  function section(title, inner) {
    return '<div style="margin:.6rem 0;padding:.7rem .8rem;text-align:left;box-sizing:border-box;' +
      'border:2px solid #5a1518;background:#141010;">' +
      '<div style="font-weight:900;letter-spacing:.1em;font-size:.78rem;color:#f5f0e1;margin-bottom:.35rem;">' +
      esc(title) + '</div>' + inner + '</div>';
  }
  function linkBtn(href, label) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener" ' +
      'style="display:inline-block;margin-top:.35rem;background:#c1121f;border:2px solid #c1121f;' +
      'color:#fff;font-weight:900;letter-spacing:.1em;padding:.5rem 1rem;font-size:.74rem;text-decoration:none;">' +
      esc(label) + ' &rarr;</a>';
  }

  function render(j) {
    var state = j.state || null;
    var cellName = String(j.cell_name || 'YOUR CELL').toUpperCase();
    var kicker = state ? '&#9873; YOUR CELL\u2019S FIGHT' : '&#9873; THE FEDERAL FIGHT';
    var stateName = '';
    try {
      if (j.ballot && j.ballot.kind === 'state' && j.ballot.state_name) stateName = j.ballot.state_name;
    } catch (e) {}
    var sub = state
      ? 'Your cell flies the ' + esc(stateName || state) + ' flag. Here is the fight waiting for you there.'
      : 'Your cell flies no state flag yet. Here is the federal fight — the one every cell answers to.';

    var h = '';
    /* Senators — real directory rows, hidden when the table is not merged. */
    var sens = j.senators || [];
    if (sens.length) {
      var sh = '<div style="font-size:.8rem;color:#b8ab8e;line-height:1.7;">';
      for (var i = 0; i < sens.length; i++) {
        var s = sens[i] || {};
        var nm = esc(s.name || 'Unknown');
        if (s.party) nm += ' (' + esc(s.party) + ')';
        var who = nm;
        var u = safeUrl(s.url);
        if (u) who = '<a href="' + esc(u) + '" target="_blank" rel="noopener" style="color:#f5f0e1;font-weight:700;">' + nm + '</a>';
        sh += '<div>&#9733; ' + who;
        if (s.phone) sh += ' &middot; <a href="tel:' + esc(String(s.phone).replace(/[^0-9+]/g, '')) +
          '" style="color:#e8b4b8;">' + esc(s.phone) + '</a>';
        sh += '</div>';
      }
      sh += '</div>';
      h += section('YOUR SENATORS', sh);
    }
    /* House rep — lookup link (we never attribute a House rep: the member's
       district is unknown). */
    var hl = safeUrl(j.house_lookup_url);
    if (hl) {
      h += section('YOUR HOUSE REP',
        '<div style="font-size:.8rem;color:#b8ab8e;line-height:1.55;">We do not know your district, so we will not guess. Punch in your ZIP:</div>' +
        linkBtn(hl, 'FIND YOUR HOUSE REP'));
    }
    /* Bills — traced to congress.gov, hidden when the tracker is not merged. */
    var bills = j.bills || [];
    if (bills.length) {
      var bh = '<div style="font-size:.8rem;color:#b8ab8e;line-height:1.6;">';
      for (var b = 0; b < bills.length; b++) {
        var bill = bills[b] || {};
        bh += '<div style="margin:.25rem 0;">&#9670; <span style="color:#f5f0e1;font-weight:700;">' +
          esc(bill.title || bill.bill_id || '') + '</span>';
        if (bill.status) bh += ' <span style="color:#e8b4b8;">(' + esc(prettyStatus(bill.status)) + ')</span>';
        var su = safeUrl(bill.source_url);
        if (su) bh += '<br><a href="' + esc(su) + '" target="_blank" rel="noopener" style="color:#e8b4b8;font-size:.74rem;">Read the bill on congress.gov &rarr;</a>';
        bh += '</div>';
      }
      bh += '</div>';
      h += section('ON THE FLOOR RIGHT NOW', bh);
    }
    /* Pressure campaigns — open ones, hidden when none/merged-out. */
    var cps = j.campaigns || [];
    if (cps.length) {
      var ch = '<div style="font-size:.8rem;color:#b8ab8e;line-height:1.6;">';
      for (var c = 0; c < cps.length; c++) {
        var cp = cps[c] || {};
        ch += '<div style="margin:.25rem 0;">&#9670; <span style="color:#f5f0e1;font-weight:700;">' +
          esc(cp.title || '') + '</span>';
        if (cp.days_remaining != null) ch += ' <span style="color:#e8b4b8;">&middot; ' + esc(cp.days_remaining) + ' days left</span>';
        ch += '</div>';
      }
      ch += '<div style="font-size:.74rem;color:#b8ab8e;margin-top:.3rem;">Join one from Political HQ when you are ready — this briefing is read-only.</div></div>';
      h += section('OPEN PRESSURE CAMPAIGNS', ch);
    }
    /* Ballot deadline — hidden when the ballot table is not merged. */
    var bal = j.ballot || null;
    if (bal && bal.next_deadline && bal.next_deadline.date) {
      var dh = '<div style="font-size:.85rem;color:#f5f0e1;line-height:1.6;">' +
        '<span style="color:#c1121f;font-weight:900;">&#8987;</span> <strong>' +
        esc(bal.next_deadline.label || 'Next deadline') + ':</strong> ' +
        dateLine(bal.next_deadline.date) + '</div>';
      if (bal.register_url) {
        var ru = safeUrl(bal.register_url);
        if (ru) dh += linkBtn(ru, 'REGISTER TO VOTE');
      }
      h += section('NEXT BALLOT DEADLINE', dh);
    }
    return { kicker: kicker, title: 'WELCOME TO THE FIGHT, ' + esc(cellName), sub: sub, body: h };
  }

  function mount(cell) {
    var cellId = cell && (cell.id || cell.cell_id);
    if (!cellId) return;
    cellId = String(cellId);
    if (dismissed(cellId)) return;
    var host = null;
    try { host = document.getElementById('pf-cells'); } catch (e) {}
    if (!host) return;
    try { if (document.getElementById(CARD_ID)) return; } catch (e2) {}

    fetchBriefing(cellId, function (j) {
      if (!j || !j.ok) return; /* fail silent — the backend rail is missing or errored */
      try { if (document.getElementById(CARD_ID)) return; } catch (e3) {}
      var v = render(j);

      var card = document.createElement('div');
      card.id = CARD_ID;
      card.setAttribute('data-pf-cellbriefing', '1');
      card.style.cssText = 'border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;' +
        'padding:1.4rem 1.2rem;margin:0 0 1.2rem;text-align:center;box-sizing:border-box;' +
        'box-shadow:0 0 30px rgba(193,18,31,.4);font-family:inherit;';
      card.innerHTML =
        '<div style="color:#c1121f;font-weight:900;letter-spacing:.16em;font-size:.85rem;margin-bottom:.3rem;">' +
        v.kicker + '</div>' +
        '<div style="color:#f5ead6;font-weight:900;font-size:1.35rem;letter-spacing:.04em;margin-bottom:.3rem;">' +
        v.title + '</div>' +
        '<div style="font-size:.82rem;color:#b8ab8e;line-height:1.55;margin-bottom:.6rem;">' + v.sub + '</div>' +
        v.body +
        '<div style="margin-top:.6rem;"><button type="button" id="pf-cb-dismiss" ' +
        'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
        'font-weight:900;letter-spacing:.12em;padding:.7rem 1.4rem;font-size:.82rem;cursor:pointer;">' +
        'UNDERSTOOD &darr;</button></div>' +
        '<div style="margin-top:.4rem;"><button type="button" id="pf-cb-skip" ' +
        'style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;' +
        'cursor:pointer;text-decoration:underline;">dismiss</button></div>';

      try {
        if (host.firstChild) host.insertBefore(card, host.firstChild);
        else host.appendChild(card);
      } catch (e4) { return; }
      try { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e5) {}

      /* Shown once — mark dismissed at successful render. Never repeated. */
      markDismissed(cellId);

      function done() {
        markDismissed(cellId);
        try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e6) {}
      }
      var d1 = null, d2 = null;
      try { d1 = card.querySelector('#pf-cb-dismiss'); } catch (e7) {}
      try { d2 = card.querySelector('#pf-cb-skip'); } catch (e8) {}
      if (d1) d1.onclick = done;
      if (d2) d2.onclick = done;
    });
  }

  function onEvent(e) {
    var cell = e && e.detail && e.detail.cell;
    if (!cell) return;
    setTimeout(function () { mount(cell); }, MOUNT_MS);
  }
  document.addEventListener('pf-cell-formed', onEvent);
  document.addEventListener('pf-cell-joined', onEvent);
})();
