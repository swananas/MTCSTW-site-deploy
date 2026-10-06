/* core/32-hubhome.js  |  PF v1.4.3 | USER HUB AS TRUE HOMEPAGE.
   CEO directive 2026-10-06: "We need the user hub to be the true homepage."
   One URL, two modes — decided device-locally, instantly, with zero backend
   calls for the mode decision:
     ANONYMOUS (no device-local callsign): this module returns before touching
       the DOM. The public movement landing is unchanged in spirit.
     RECOGNIZED (device-local callsign): inserts #pf-hubhero as the first
       child of #pf-v2 — the YOUR CAMPAIGN hero: callsign + rank, XP-today
       ring, streak, cell status, compact Next Move, today's Daily Orders
       link, the four-pillar action bar (via PF.pillars.go — composes the
       pillar-spine work, duplicates nothing), and a War Report teaser.
       Public sections stay on the page below the fold; the movement is
       still visible, but THEIR campaign leads. A returning user never sees
       the join pitch as if they were new.
   Adventure-path flavoring: when PF.pillars is present, the hero kicker
   carries the chosen path names ("PROPAGANDIST + DATA SCOUT · YOUR
   CAMPAIGN"); the pillar bar order follows the same path ordering as the
   HUD bar (chosen paths first).
   FRONTEND-ONLY, ZERO NEW XP — reads only, all fail-open with a 10s guard:
   xp_today, streak_status, cell_mine, dopamine_status. Rank is device-local
   (pf_ranks_v1, same tiers as the HUD); absent = omitted, never guessed.
   QUALITY BAR: low friction (reads in seconds), accurate (every figure from
   a real read or omitted), condensed (one hero, no walls).
   KILL: ?pf_off=hubhome  or  localStorage pf_disabled_v1='["hubhome"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('hubhome')) return;
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* Homepage only: #pf-v2 is the homepage shell marker (pages/home-v2.js). */
  function homeHost() {
    try { return document.getElementById('pf-v2'); } catch (e) { return null; }
  }

  function callsign() {
    try { if (window.PFCallsign) return String(window.PFCallsign() || ''); } catch (e) {}
    try {
      return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || '');
    } catch (e) {}
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var BACKEND = window.PF_BACKEND_URL;
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var fn = 'pfHubCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      window[fn] = function (j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e2) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        cb(j);
      };
      s.onerror = function () {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e2) {}
        cb(null);
      };
      var q = '?action=' + encodeURIComponent(action);
      for (var k in params) {
        if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }
      q += '&callback=' + fn;
      s.src = BACKEND + q;
      document.head.appendChild(s);
      setTimeout(function () {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e2) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        cb(null);
      }, 10000);
    } catch (e) { cb(null); }
  }

  var TIERS = [['RECRUIT', 0], ['AGITATOR', 25], ['CADRE', 75], ['COMMISSAR', 150], ['ARCHITECT', 300]];
  function tierOf(xp) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) { if (xp >= TIERS[i][1]) t = TIERS[i]; }
    return t[0];
  }

  function rankOf() {
    try {
      var lr = JSON.parse(localStorage.getItem('pf_ranks_v1') || '{"xp":0}');
      return tierOf(Number(lr.xp) || 0);
    } catch (e) { return ''; }
  }

  function ringSvg(frac, size) {
    var sz = size || 44, r = sz / 2 - 3, c = 2 * Math.PI * r;
    var f = Math.min(1, Math.max(0, frac)), off = c * (1 - f);
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 ' + sz + ' ' + sz + '">' +
      '<circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke="#2a2a2a" stroke-width="4"/>' +
      '<circle cx="' + sz / 2 + '" cy="' + sz / 2 + '" r="' + r + '" fill="none" stroke="#c1121f" stroke-width="4"' +
      ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"' +
      ' stroke-linecap="round" transform="rotate(-90 ' + sz / 2 + ' ' + sz / 2 + ')"/>' +
      '<text x="' + sz / 2 + '" y="' + (sz / 2 + 4) + '" text-anchor="middle" fill="#f5ead6" font-size="11" font-weight="900" font-family="Arial">' +
      Math.round(f * 100) + '</text></svg>';
  }

  var CSS = [
    '#pf-hubhero{background:#0a0a0a;border:2px solid #c1121f;border-radius:6px;',
    'padding:18px 16px;margin:0 0 18px;font-family:Arial,sans-serif;color:#f5ead6;}',
    '#pf-hubhero .ph-kick{font-size:10px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:8px;}',
    '#pf-hubhero .ph-head{display:flex;align-items:center;gap:14px;margin-bottom:12px;}',
    '#pf-hubhero .ph-who{flex:1 1 auto;min-width:0;}',
    '#pf-hubhero .ph-cs{font-family:"Arial Black",Arial,sans-serif;font-size:24px;letter-spacing:2px;',
    'color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#pf-hubhero .ph-rank{font-size:10px;letter-spacing:.22em;color:#a89e88;font-weight:700;margin-top:2px;}',
    '#pf-hubhero .ph-streak{font-size:13px;font-weight:900;color:#e8b33c;white-space:nowrap;}',
    '#pf-hubhero .ph-cell{font-size:12px;color:#a89e88;margin-bottom:12px;line-height:1.5;}',
    '#pf-hubhero .ph-cell b{color:#f5ead6;}',
    '#pf-hubhero .ph-next{background:#141414;border:1px solid #2a2a2a;border-radius:4px;',
    'padding:12px;margin-bottom:12px;}',
    '#pf-hubhero .ph-next .n-k{font-size:9px;letter-spacing:3px;color:#c1121f;font-weight:800;margin-bottom:6px;}',
    '#pf-hubhero .ph-next .n-t{font-size:16px;font-weight:900;color:#fff;margin-bottom:4px;}',
    '#pf-hubhero .ph-next .n-s{font-size:12px;color:#a89e88;margin-bottom:8px;line-height:1.5;}',
    '#pf-hubhero .ph-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:14px;',
    'padding:12px 26px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:44px;}',
    '#pf-hubhero .ph-cta:active{background:#8f0d17;}',
    '#pf-hubhero .ph-row{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;}',
    '#pf-hubhero .ph-linkcard{flex:1 1 140px;background:#141414;border:1px solid #2a2a2a;border-radius:4px;',
    'padding:10px 12px;text-decoration:none;color:#f5ead6;}',
    '#pf-hubhero .ph-linkcard .l-k{font-size:9px;letter-spacing:3px;color:#c1121f;font-weight:800;margin-bottom:4px;}',
    '#pf-hubhero .ph-linkcard .l-t{font-size:13px;font-weight:800;}',
    '#pf-hubhero .ph-pillars{display:flex;gap:6px;margin-bottom:4px;}',
    '#pf-hubhero .ph-pillar{flex:1 1 0;background:#141414;border:1px solid #2a2a2a;border-radius:4px;',
    'padding:10px 4px;color:#f5ead6;text-align:center;cursor:pointer;font-family:Arial,sans-serif;}',
    '#pf-hubhero .ph-pillar .pp-l{display:block;font-size:12px;font-weight:900;letter-spacing:.06em;}',
    '#pf-hubhero .ph-pillar .pp-s{display:block;font-size:8px;letter-spacing:.14em;color:#a89e88;margin-top:2px;}',
    '#pf-hubhero .ph-pillar:active{border-color:#c1121f;}',
    '#pf-hubhero .ph-foot{font-size:11px;color:#a89e88;text-align:center;}',
    '#pf-hubhero .ph-foot a{color:#f5ead6;font-weight:800;}'
  ].join('');

  function injectCss() {
    try {
      if (document.getElementById('pf-hubhero-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-hubhero-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Pillar bar: composes PF.pillars (labels, order, go handlers). Fail-open:
     no pillars module -> no bar (the HUD bar still mounts on its own). */
  function pillarBarHtml() {
    try {
      var P = window.PF && PF.pillars;
      if (!P || !P.pillars || typeof P.go !== 'function') return '';
      var list = P.pillars.slice();
      /* Chosen adventure paths first — same ordering contract as the HUD bar. */
      var paths = (typeof P.getPaths === 'function') ? P.getPaths() : [];
      list.sort(function (a, b) {
        var ai = paths.indexOf(a.path), bi = paths.indexOf(b.path);
        ai = ai === -1 ? 99 : ai; bi = bi === -1 ? 99 : bi;
        return ai - bi;
      });
      var h = '<div class="ph-pillars" id="pf-hub-pillars">';
      for (var i = 0; i < list.length; i++) {
        h += '<button type="button" class="ph-pillar" data-ph-go="' + esc(list[i].key) + '">' +
          '<span class="pp-l">' + esc(list[i].label) + '</span>' +
          '<span class="pp-s">' + esc(list[i].sub) + '</span></button>';
      }
      return h + '</div>';
    } catch (e) { return ''; }
  }

  function wirePillars(root) {
    try {
      var P = window.PF && PF.pillars;
      if (!P || typeof P.go !== 'function') return;
      var btns = root.querySelectorAll('[data-ph-go]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.addEventListener('click', function () {
            try { P.go(b.getAttribute('data-ph-go')); } catch (e) {}
          });
        })(btns[i]);
      }
    } catch (e) {}
  }

  function kickerHtml() {
    var names = [];
    try {
      var P = window.PF && PF.pillars;
      if (P && typeof P.pathNames === 'function') names = P.pathNames();
    } catch (e) {}
    var t = (names.length && names.length < 4)
      ? names.join(' + ') + ' \u00B7 YOUR CAMPAIGN'
      : 'YOUR CAMPAIGN';
    return '<div class="ph-kick">' + esc(t) + '</div>';
  }

  /* Compact Next Move: a small priority ladder over the same reads the HUD
     makes. This is the hub's at-a-glance card; the full nextop ladder still
     mounts at page end. Fail-open: unknown state -> orders link. */
  function nextMoveHtml(d) {
    var card;
    if (d.streakRisk) {
      card = { t: 'STREAK AT RISK', s: 'Keep it going — one check-in before midnight Chicago.', c: 'SAVE IT \u2192', h: '/#pf-orders' };
    } else if (!d.lootClaimed) {
      card = { t: 'THE CRATE IS LOADED', s: 'Your daily loot is waiting.', c: 'OPEN THE CRATE \u2192', h: '/#pf-orders' };
    } else if (!d.inCell) {
      card = { t: 'NO SQUAD YET', s: 'Five callsigns. One streak. Nobody gets left behind.', c: 'FIND YOUR CELL \u2192', h: '/cells' };
    } else {
      card = { t: "TODAY'S ORDERS", s: 'Missions are live. Report back when they\u2019re done.', c: 'VIEW ORDERS \u2192', h: '/#pf-orders' };
    }
    return '<div class="ph-next"><div class="n-k">NEXT MOVE</div>' +
      '<div class="n-t">' + esc(card.t) + '</div>' +
      '<div class="n-s">' + esc(card.s) + '</div>' +
      '<a class="ph-cta" href="' + esc(card.h) + '">' + esc(card.c) + '</a></div>';
  }

  function cellHtml(d) {
    if (d.inCell) {
      return '<div class="ph-cell">FIGHTING WITH <b>' + esc(d.cellName || 'YOUR CELL') + '</b>' +
        (d.cellChecked ? ' — checked in today \u2713' : ' — cell hasn\u2019t checked in yet today') + '</div>';
    }
    return '<div class="ph-cell">No cell yet. <b><a href="/cells" style="color:#f5ead6;">Find your squad \u2192</a></b></div>';
  }

  function ordersHtml() {
    return '<a class="ph-linkcard" href="/#pf-orders"><div class="l-k">DAILY ORDERS</div>' +
      '<div class="l-t">Today\u2019s missions \u2192</div></a>';
  }

  function warReportHtml() {
    return '<a class="ph-linkcard" href="/war-report"><div class="l-k">WAR REPORT</div>' +
      '<div class="l-t">This week\u2019s dispatch \u2192</div></a>';
  }

  function renderShell(cs) {
    var host = homeHost();
    if (!host || document.getElementById('pf-hubhero')) return null;
    injectCss();
    var el = document.createElement('div');
    el.id = 'pf-hubhero';
    el.innerHTML =
      kickerHtml() +
      '<div class="ph-head">' + ringSvg(0) +
      '<div class="ph-who"><div class="ph-cs">' + esc(cs) + '</div>' +
      '<div class="ph-rank" data-ph-rank></div></div>' +
      '<div class="ph-streak" data-ph-streak></div></div>' +
      '<div data-ph-cell></div>' +
      '<div data-ph-next></div>' +
      '<div class="ph-row">' + ordersHtml() + warReportHtml() + '</div>' +
      pillarBarHtml() +
      '<div class="ph-foot"><a href="#" data-ph-paths>Change your fights</a> \u00B7 the movement rolls on below</div>';
    if (host.firstChild) host.insertBefore(el, host.firstChild);
    else host.appendChild(el);
    wirePillars(el);
    try {
      var ch = el.querySelector('[data-ph-paths]');
      if (ch) ch.addEventListener('click', function (ev) {
        try { ev.preventDefault(); } catch (e) {}
        try {
          var P = window.PF && PF.pillars;
          if (P && typeof P.openChooser === 'function') P.openChooser();
        } catch (e) {}
      });
    } catch (e) {}
    return el;
  }

  function fill(el, d) {
    if (!el) return;
    try {
      var r = rankOf();
      var rk = el.querySelector('[data-ph-rank]');
      if (rk && r) rk.textContent = r;
      var st = el.querySelector('[data-ph-streak]');
      if (st && d.streak > 0) st.innerHTML = '&#128293;' + d.streak;
      var ring = el.querySelector('.ph-head svg');
      if (ring) {
        var wrap = document.createElement('span');
        wrap.innerHTML = ringSvg(d.xpToday / 100);
        ring.parentNode.replaceChild(wrap.firstChild, ring);
      }
      var cn = el.querySelector('[data-ph-cell]');
      if (cn) cn.innerHTML = cellHtml(d);
      var nx = el.querySelector('[data-ph-next]');
      if (nx) nx.innerHTML = nextMoveHtml(d);
    } catch (e) {}
  }

  function boot() {
    var cs = callsign();
    /* ANONYMOUS: the public landing is untouched — hub only for the recognized. */
    if (!cs) return;
    var host = homeHost();
    if (!host) return;
    var el = renderShell(cs);
    if (!el) return;
    var d = { xpToday: 0, streak: 0, streakRisk: false, lootClaimed: true, inCell: false, cellChecked: false, cellName: '' };
    var pending = 4, done = false;
    function fin() { if (done) return; done = true; fill(el, d); }
    function one() { if (--pending <= 0) fin(); }
    setTimeout(fin, 10000);
    api('xp_today', { callsign: cs }, function (j) {
      try { if (j && j.ok && j.xp_today !== undefined) d.xpToday = Number(j.xp_today) || 0; } catch (e) {}
      one();
    });
    api('streak_status', { callsign: cs }, function (j) {
      try {
        if (j && j.ok) {
          if (j.count !== undefined) d.streak = Number(j.count) || 0;
          if (j.at_risk !== undefined) d.streakRisk = !!j.at_risk;
        }
      } catch (e) {}
      one();
    });
    api('cell_mine', { callsign: cs }, function (j) {
      try {
        if (j && j.ok) {
          d.inCell = !!j.in_cell;
          var cells = j.cells || [];
          if (cells.length) {
            if (cells[0].name) d.cellName = String(cells[0].name);
            if (cells[0].checked_today !== undefined) d.cellChecked = !!cells[0].checked_today;
          }
        }
      } catch (e) {}
      one();
    });
    api('dopamine_status', { callsign: cs }, function (j) {
      try {
        if (j && j.ok && j.loot && j.loot.claimed_today !== undefined) d.lootClaimed = !!j.loot.claimed_today;
        if (j && j.ok && j.streak && d.streakRisk === false && j.streak.at_risk !== undefined) d.streakRisk = !!j.streak.at_risk;
      } catch (e) {}
      one();
    });
  }

  var booted = false;
  function bootOnce() {
    if (booted) return; booted = true; boot();
  }
  /* A visitor who claims a callsign mid-session flips anonymous -> recognized
     without a reload (same contract as the Bluesky card). */
  try {
    document.addEventListener('pf-callsign-claimed', function () { booted = false; bootOnce(); });
  } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnce);
  else bootOnce();
})();
