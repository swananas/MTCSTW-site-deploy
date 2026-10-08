/* games/first-wave.js  |  PF v1.4.3 | LAUNCH WEEK — "FIRST WAVE".
   Pre-launch countdown banner (T-3d -> T-0), live-week banner, founder badge
   ("FIRST WAVE" / "You were here when it started."), the 7-day launch
   circuit card, and the public founder roll board.
   READ-ONLY. ZERO XP — this module mints nothing, multiplies nothing, moves
   no XP (Economy Desk sign-off condition). Circuit progress is derived
   server-side; the module writes nothing. Founder markers are status-only
   (rendered from launchweek_status, no ribbon-table writes in v1).
   Backend contract (src/launchweek.js, parallel wave):
     launchweek_status (auth: own callsign) -> {launched, founder, circuit:[7],
       cohort_size, full_muster, launch_ts, phase?}
     launchweek_roll   (public, capped 200) -> {founders:[{callsign,
       full_muster}], ...}
   CONTRACT DEVIATION (frontend side, for the backend wave): the pre-launch
   countdown is an explicit requirement, but launched:false means dormant.
   This module resolves it as: launched:false + launch_ts set and within
   T-3d..T-0 -> countdown banner; launched:false + launch_ts absent/0 ->
   render nothing, exit. The backend must therefore return launch_ts in
   launchweek_status even before launch. N is computed client-side from
   launch_ts vs now (America/Chicago) when the server does not send
   countdown_days. Grammar deviation: "{N} DAY." when N==1.
   Banners follow the existing siren/banner pattern (cf. briefing-siren.js):
   fixed top bar, site-wide, additive — never a modal, never a funnel
   hijack. The first-60-seconds mission keeps priority for anonymous
   visitors; this banner layers alongside it.
   KILL: ?pf_off=first-wave  or  localStorage pf_disabled_v1='["first-wave"]' */
(function () {
  'use strict';
  var PF = window.PF;
  var KILL = 'first-wave';
  if (!PF || PF.skip(KILL)) { return; }
  try {
    var href = window.location.href || '';
    if (/\/config\//.test(href)) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  var DAY = 86400000;
  var PHASE = null;           /* 'countdown' | 'live' | 'ended' */
  var STATUS = null;          /* launchweek_status payload */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: String(cs || '').toLowerCase(), device: String(dev || '') };
  }

  /* Mirror core/rites.js serverCompleted: dispatch pair
     ('launchweek','lw_action'), POST via PF.postAction, 6s cap. */
  function postStatus(params, cb) {
    var done = false;
    function fin(j) { if (done) return; done = true; try { cb(j); } catch (e) {} }
    try {
      if (!(window.PF && PF.postAction)) { fin(null); return; }
      var to = setTimeout(function () { fin(null); }, 6000);
      PF.postAction('launchweek', 'lw_action', 'launchweek_status', params || {}, function (j) {
        try { clearTimeout(to); } catch (e2) {}
        fin(j);
      });
    } catch (e) { fin(null); }
  }

  /* Resolve the launch phase. Backend `phase` is authoritative when present;
     otherwise derive from launch_ts vs now. Countdown surface only
     T-3d..T-0 per spec; window is 7 days from launch_ts. */
  function resolvePhase(j) {
    try {
      if (j && (j.phase === 'countdown' || j.phase === 'live' || j.phase === 'ended')) return j.phase;
    } catch (e) {}
    var ts = 0;
    try { ts = Number(j && j.launch_ts) || 0; } catch (e2) {}
    if (!ts) return 'dormant';
    var now = Date.now();
    if (j && j.launched === true) {
      return now > ts + 7 * DAY ? 'ended' : 'live';
    }
    if (now < ts - 3 * DAY) return 'dormant';
    if (now < ts) return 'countdown';
    if (now <= ts + 7 * DAY) return 'live';
    return 'ended';
  }

  /* N from launch_ts vs now (America/Chicago). Countdown only shows in the
     T-3d..T-0 window, so diff is positive and <= 3 days here. */
  function countdownDays(ts) {
    var diff = Number(ts) - Date.now();
    var n = Math.ceil(diff / DAY);
    if (n < 1) n = 1;
    if (n > 3) n = 3;
    return n;
  }

  /* ---------- Banner (countdown + live) ---------- */
  function renderBanner() {
    if ($('pf-firstwave-bar')) return;
    var head = '', sub = '';
    if (PHASE === 'countdown') {
      var ts = 0, n = 3;
      try {
        if (STATUS && STATUS.countdown_days != null) { n = Math.max(1, Math.min(3, Number(STATUS.countdown_days) || 1)); }
        else { ts = Number(STATUS.launch_ts) || 0; n = countdownDays(ts); }
      } catch (e) {}
      head = 'THE FIRST WAVE LANDS IN ' + n + ' DAY' + (n === 1 ? '.' : 'S.');
      sub = 'Be here when the first shot fires.';
    } else {
      head = 'THE FIRST WAVE IS HERE.';
      sub = 'Enlist this week. Founders are forever.';
    }
    var bar = document.createElement('div');
    bar.id = 'pf-firstwave-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-label', 'First Wave launch banner');
    bar.innerHTML =
      '<div style="max-width:1100px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-sizing:border-box;">'
      + '<span style="color:#e5383b;font-weight:900;letter-spacing:0.25em;font-size:0.7rem;">&#9733; FIRST WAVE &#9733;</span>'
      + '<span style="color:#f5ead6;font-weight:900;font-size:1.05rem;letter-spacing:0.06em;">' + esc(head) + '</span>'
      + '<span style="color:#c9bfa8;font-size:0.9rem;">' + esc(sub) + '</span>'
      + '</div>';
    try {
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99990;background:#0b0b0c;'
        + 'border-bottom:3px solid #c1121f;font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;'
        + 'box-shadow:0 2px 18px rgba(193,18,31,0.45);';
      document.body.insertBefore(bar, document.body.firstChild);
    } catch (e) {}
  }

  /* ---------- Founder badge ---------- */
  function renderFounder() {
    if (!$('pf-firstwave-founder')) {
      /* Clearly-marked slot: the founder badge lives here. Other surfaces
         (enlistment papers, profile widgets) can relocate or clone this
         slot's content; this module never touches their markup. */
      var host = $('pf-ranks');
      if (host && host.parentNode) {
        try {
          var slot = document.createElement('div');
          slot.id = 'pf-firstwave-founder';
          slot.setAttribute('data-founder-slot', 'first-wave');
          slot.innerHTML =
            '<div style="display:inline-block;background:#0b0b0c;border:2px solid #c1121f;'
            + 'padding:10px 18px;margin:10px auto;font-family:\'Helvetica Neue\',Arial,sans-serif;text-align:center;">'
            + '<div style="color:#e5383b;font-weight:900;letter-spacing:0.3em;font-size:0.72rem;">FIRST WAVE</div>'
            + '<div style="color:#c9bfa8;font-size:0.85rem;margin-top:4px;">You were here when it started.</div>'
            + '</div>';
          host.parentNode.insertBefore(slot, host.nextSibling);
        } catch (e) {}
      }
    }
    /* Signal for other surfaces (enlistment papers area, profiles, walls):
       a founder is on the page. Listeners mount their own rendering — this
       module does not duplicate the ENLISTED ceremony or claim flow. */
    try {
      var id = ident();
      var ev = new CustomEvent('pf-firstwave-founder', {
        detail: {
          callsign: id.callsign,
          fullMuster: !!(STATUS && STATUS.full_muster),
          cohortSize: (STATUS && STATUS.cohort_size) || 0
        }
      });
      window.dispatchEvent(ev);
    } catch (e2) {}
  }

  /* ---------- Circuit card ---------- */
  var CIRCUIT = [
    { day: 1, name: 'ENLIST', sub: 'Claim your callsign. Take the name.', url: '/', key: 'enlist' },
    { day: 2, name: 'REPORT FOR DAILY ORDERS', sub: 'Complete today\u2019s missions.', url: '/', key: 'daily-orders' },
    { day: 3, name: 'JOIN A CELL', sub: 'No lone wolves. Get a squad.', url: '/cells', key: 'cells' },
    { day: 4, name: 'CAST THE FAN VOTE', sub: 'Back your propagandist of the week.', url: '/', key: 'fan-vote' },
    { day: 5, name: 'WALK THE ROUTE MARCH', sub: 'Hit today\u2019s march stops.', url: null, key: 'route-march' },
    { day: 6, name: 'RECRUIT A FIGHTER', sub: 'Share your recruit link. Bring them in.', url: '/', key: 'recruit' },
    { day: 7, name: 'FUND THE FIGHT', sub: 'Put money on the movement.', url: '/ventures', key: 'ventures' }
  ];
  /* Deep links verified against the merged tree (2026-10-05): '/' = homepage
     (enlistment-ranks claim, Daily Orders, referral share, fan-vote all mount
     there), '/cells' = rites.js ENLISTED CTA href, '/ventures' =
     bundle-warchest movement finance page (BLOSSOM M3 2026-10-06: the
     movement silo now mounts on /ventures as the Movement Funds section).
     Day 5 resolves at runtime from the route-march circuit_status read
     (same action core/22-routemarch.js uses);
     fallback '/events'. No invented URLs. */
  function rmLink(cb) {
    function done(url) { try { cb(url || '/events'); } catch (e) {} }
    try {
      if (!BACKEND) { done(null); return; }
      var fn = 'pfFwRmCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), fin = false;
      function finish(j) {
        if (fin) return; fin = true;
        try { delete window[fn]; } catch (e2) {}
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e3) {}
        var url = null;
        try {
          var stops = (j && j.ok && j.stops) || [];
          var id = ident();
          for (var i = 0; i < stops.length; i++) {
            if (stops[i] && stops[i].page && !stops[i].done) { url = stops[i].page; break; }
          }
          if (!url && stops.length && stops[0] && stops[0].page) url = stops[0].page;
        } catch (e4) {}
        done(url);
      }
      window[fn] = function (j) { finish(j); };
      s.onerror = function () { finish(null); };
      var id2 = ident(), q = '?action=' + encodeURIComponent('circuit_status');
      if (id2.callsign) q += '&callsign=' + encodeURIComponent(id2.callsign);
      if (id2.device) q += '&device=' + encodeURIComponent(id2.device);
      try {
        var sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
        if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
      } catch (e5) {}
      q += '&callback=' + fn;
      s.src = BACKEND + q;
      document.head.appendChild(s);
      setTimeout(function () { finish(null); }, 12000);
    } catch (e6) { done(null); }
  }

  function renderCircuit() {
    if ($('pf-firstwave-circuit')) return;
    var states = [];
    try {
      var c = (STATUS && STATUS.circuit) || [];
      for (var i = 0; i < 7; i++) states.push(!!c[i]);
    } catch (e) { for (var k = 0; k < 7; k++) states.push(false); }
    var allDone = states.every(function (b) { return b; });

    function mountCard(rmUrl) {
      if ($('pf-firstwave-circuit')) return;
      var rows = '';
      for (var d = 0; d < 7; d++) {
        var day = CIRCUIT[d], doneD = states[d];
        var url = (day.key === 'route-march') ? rmUrl : day.url;
        /* Day 5 resolves asynchronously from circuit_status; the row renders
           immediately with the fallback and upgrades when the read lands. */
        var linkId = (day.key === 'route-march') ? ' id="pf-fw-day5-link"' : '';
        var tag = doneD
          ? '<span style="color:#7ddf8a;font-weight:900;">&#10003; DONE</span>'
          : '<span style="color:#e5383b;font-weight:900;">&#9679; OPEN</span>';
        var stake = (day.key === 'ventures')
          ? '<div style="color:#8a8172;font-size:0.72rem;margin-top:6px;">XP has no cash value. Stakes are final.</div>'
          : '';
        rows +=
          '<div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-top:1px solid #2a2a2a;">'
          + '<div style="min-width:44px;color:#e5383b;font-weight:900;font-size:0.8rem;letter-spacing:0.1em;">DAY ' + day.day + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<a' + linkId + ' href="' + esc(url) + '" style="color:#f5ead6;font-weight:900;font-size:0.95rem;text-decoration:none;letter-spacing:0.04em;">' + esc(day.name) + ' &rarr;</a>'
          + '<div style="color:#a89e88;font-size:0.8rem;margin-top:2px;">' + esc(day.sub) + '</div>'
          + stake
          + '</div>'
          + '<div style="font-size:0.75rem;letter-spacing:0.08em;white-space:nowrap;">' + tag + '</div>'
          + '</div>';
      }
      var head = allDone
        ? '<div style="color:#7ddf8a;font-weight:900;letter-spacing:0.2em;font-size:0.78rem;">&#9733; FIRST WAVE &#8212; FULL MUSTER &#9733;</div>'
          + '<div style="color:#f5ead6;font-weight:900;font-size:1.25rem;margin-top:6px;letter-spacing:0.05em;">YOU STOOD ALL SEVEN.</div>'
        : '<div style="color:#e5383b;font-weight:900;letter-spacing:0.25em;font-size:0.78rem;">&#9733; THE FIRST WAVE CIRCUIT &#9733;</div>'
          + '<div style="color:#f5ead6;font-weight:900;font-size:1.25rem;margin-top:6px;letter-spacing:0.05em;">SEVEN DAYS. SEVEN ACTIONS. FOUNDERS FINISH.</div>';
      var el = document.createElement('div');
      el.id = 'pf-firstwave-circuit';
      el.innerHTML =
        '<div style="background:#0b0b0c;border:3px solid #c1121f;padding:18px 16px;max-width:680px;margin:18px auto;'
        + 'color:#f5ead6;font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;">'
        + head
        + '<div style="color:#a89e88;font-size:0.85rem;margin-top:6px;">One prescribed action per day. The window closes &#8212; what\u2019s done is done.</div>'
        + '<div style="margin-top:10px;">' + rows + '</div>'
        + '</div>';
      /* Homepage leg: just after the START HERE header; /cells leg: after
         the cell-war standings (war-room mount, mirrors war-room-ticker.js). */
      try {
        var h = $('pf-v2');
        if (h) {
          var ph = h.querySelector('.pf-section-head[data-sec="start-here"]');
          if (ph && ph.parentNode) { ph.parentNode.insertBefore(el, ph.nextSibling); return; }
          h.insertBefore(el, h.firstChild); return;
        }
        var cp = $('pf-cells-page');
        if (cp) {
          var cw = cp.querySelector('section[data-game="cell-war"]');
          if (cw && cw.parentNode) { cw.parentNode.insertBefore(el, cw.nextSibling); return; }
          cp.appendChild(el); return;
        }
      } catch (e2) {}
    }

    /* Day 5 resolves from the route-march circuit_status read; render the
       card immediately with the fallback and upgrade the link when it
       lands (bounded, fail-silent). */
    var rmUrl = '/events';
    mountCard(rmUrl);
    rmLink(function (url) {
      try {
        if (!url || url === rmUrl) return;
        var a = $('pf-fw-day5-link');
        if (a) a.setAttribute('href', url);
      } catch (e2) {}
    });
  }

  /* ---------- Roll board ---------- */
  function renderRoll() {
    function paint(founders) {
      try {
        if ($('pf-firstwave-roll')) return;
        var list = (founders || []).slice(0, 200);
        var rows = '';
        for (var i = 0; i < list.length; i++) {
          var f = list[i] || {};
          var cs = String(f.callsign || '').toUpperCase();
          if (!cs) continue;
          var fm = !!f.full_muster;
          rows += '<div style="display:flex;align-items:baseline;gap:10px;padding:7px 4px;border-top:1px solid #2a2a2a;">'
            + '<span style="color:#f5ead6;font-weight:800;font-size:0.9rem;letter-spacing:0.06em;">' + esc(cs) + '</span>'
            + (fm ? '<span style="color:#7ddf8a;font-size:0.72rem;font-weight:900;letter-spacing:0.12em;">&#9733; FULL MUSTER</span>' : '')
            + '</div>';
        }
        var el = document.createElement('div');
        el.id = 'pf-firstwave-roll';
        el.innerHTML =
          '<div style="background:#0a0a0a;border-top:3px solid #c1121f;border-bottom:3px solid #c1121f;'
          + 'padding:22px 16px;max-width:1100px;margin:18px auto;color:#f5ead6;'
          + 'font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;text-align:center;">'
          + '<div style="color:#e5383b;font-weight:900;letter-spacing:0.3em;font-size:0.72rem;">&#9733; THE FOUNDER ROLL &#9733;</div>'
          + '<div style="color:#f5ead6;font-weight:900;font-size:1.3rem;margin:8px 0 4px;letter-spacing:0.05em;">THEY WERE HERE WHEN IT STARTED.</div>'
          + '<div style="color:#a89e88;font-size:0.85rem;margin-bottom:10px;">This roll is closed forever. No late entries. No exceptions.</div>'
          + '<div style="max-width:560px;margin:0 auto;text-align:left;">' + (rows || '<div style="color:#a89e88;font-size:0.9rem;text-align:center;">The roll is being written. Enlist during the First Wave and your name lands here.</div>') + '</div>'
          + '</div>';
        /* Hall-of-Proof-adjacent: after #pf-hallofproof, else the PROOF
           section header (mirrors war-room-ticker.js anchoring). */
        var h = $('pf-v2');
        if (h) {
          var hop = $('pf-hallofproof');
          if (hop && hop.parentNode) { hop.parentNode.insertBefore(el, hop.nextSibling); return; }
          var ph = h.querySelector('.pf-section-head[data-sec="proof"]');
          if (ph && ph.parentNode) { ph.parentNode.insertBefore(el, ph.nextSibling); return; }
          h.appendChild(el); return;
        }
      } catch (e) {}
    }
    try {
      if (!(window.PF && PF.postAction)) { paint([]); return; }
      var to = setTimeout(function () { paint([]); }, 6000);
      PF.postAction('launchweek', 'lw_action', 'launchweek_roll', {}, function (j) {
        try { clearTimeout(to); } catch (e) {}
        var founders = [];
        try { founders = (j && (j.founders || j.roll)) || []; } catch (e2) {}
        paint(founders);
      });
    } catch (e3) { paint([]); }
  }

  /* ---------- Boot ---------- */
  function boot() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
        return;
      }
    } catch (e) {}
    var id = ident();
    postStatus({ callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (!j || !j.ok) return; /* dead read: render nothing */
        STATUS = j;
        PHASE = resolvePhase(j);
        if (PHASE === 'dormant') return; /* launched:false, no launch_ts: exit */
        if (PHASE === 'countdown' || PHASE === 'live') renderBanner();
        if (PHASE === 'live' || PHASE === 'ended') {
          /* Post-week: markers + roll persist (legacy); circuit unmounts. */
          if (j.founder === true) renderFounder();
          if (PHASE === 'live') renderCircuit();
          renderRoll();
        }
      } catch (e2) {}
    });
  }
  try { boot(); } catch (e) {}
})();
