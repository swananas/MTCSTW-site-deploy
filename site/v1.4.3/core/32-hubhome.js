/* core/32-hubhome.js  |  PF v1.4.3 | HOMEPAGE HUB — teardown WS-1 redesign
   (CEO-approved 2026-10-06). Built visibly from the PF.patterns library
   (core/33-patterns.js): every surface is P1/P2/P3/P5/P6/P8, no bespoke
   chrome. One URL, two modes — decided device-locally, instantly, with
   zero backend calls for the mode decision:
     ANONYMOUS (no device-local callsign): #pf-anonhero — the P1 Briefing
       Hero (red caps kicker, one-line mission, single red JOIN THE FIGHT.
       button wired to the existing PF.requireCallsign claim modal) + the
       dense FRONT LINES grid. Every card carries the P6 Action Bar, so the
       funnel never dead-ends. ZERO backend reads in this mode — the public
       landing below is untouched (byte-identical).
     RECOGNIZED (device-local callsign): #pf-hubhero — YOUR CAMPAIGN leads:
       P1 hero (path-flavored kicker + mission) + P5 Progression Ring (XP
       ring + streak flame + rank — render-only, never mints) + the Next
       Move card (News Desk kicker "YOUR ORDERS →", CTA-family verbs) +
       Daily Orders / War Report intel cards + the FRONT LINES grid. Every
       card carries the P6 Action Bar. P8 proof line renders ONLY from a
       real read (cell member count) — otherwise suppressed, never inflated.
   PILLAR DOCK: the four-pillar bar is NOT rendered here. It mounts inside
   the HUD's YOUR CAMPAIGN strip (core/31-pillars.js) — one persistent nav,
   not two competing ones. This module keeps the pathNames kicker flavor
   via PF.pillars (fail-open when absent).
   FRONTEND-ONLY, ZERO NEW XP — reads only (xp_today, streak_status,
   cell_mine, dopamine_status), all fail-open with a 10s guard. Rank is
   device-local (pf_ranks_v1); absent = omitted, never guessed.
   FRONT LINES: every major feature the four pillars don't reach — CALL IT.,
   People's CPI, Robbery Report, Follow the Money, Cell War, Arcade, Create,
   Store, Fund, Governance, Academy, Data Bounties. Slugs per the CEO
   directive spec; destination pages mount their own silos — this module
   only links. Fail-open: plain anchors, zero XP, no writes.
   CTA DISCIPLINE: JOIN THE FIGHT. (enlistment only, red button) / DEPLOY →
   (action verb) / REPORT BACK → (close-the-loop). No donate-language.
   KILL: ?pf_off=hubhome  or  localStorage pf_disabled_v1='["hubhome"]'
   (patterns kill ?pf_off=patterns also fails this module open — the
   landing stays byte-identical). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('hubhome')) return;
  var P = PF.patterns;
  if (!P) return; /* patterns killed/absent: fail-open, landing untouched */
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

  function dailyTarget() {
    try {
      if (typeof window.PF_HUD_TARGET === 'number' && window.PF_HUD_TARGET > 0) return window.PF_HUD_TARGET;
      if (window.PF && typeof PF.hudDailyTarget === 'number' && PF.hudDailyTarget > 0) return PF.hudDailyTarget;
    } catch (e) {}
    return 100;
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

  /* Layout-only CSS: grid structure, zero colors/fonts (all styling lives in
     33-patterns.css). Inert without the module. */
  var CSS = [
    '#pf-hubhero,#pf-anonhero{max-width:740px;margin:0 auto;}',
    '#pf-fl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 12px;}',
    '#pf-fl-grid .pf-pat-intel{margin:0;}',
    '#pf-hub-2col{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px;}',
    '#pf-hub-2col .pf-pat-intel{margin:0;}',
    '@media (max-width:560px){',
    '#pf-fl-grid{grid-template-columns:repeat(2,1fr);}',
    '#pf-hub-2col{grid-template-columns:1fr;}',
    '}'
  ].join('');
  function injectCss() {
    try {
      if (document.getElementById('pf-hub-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-hub-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---- FRONT LINES ----------------------------------------------------
     Every major feature the four-pillar dock doesn't reach. Kicker taxonomy
     follows the pillar verb set (DATA pillar relabeled TRACK, CEO decision
     2026-10-06 — the kickers match). Slugs per the CEO directive spec;
     destination pages mount their own silos — this module only links. */
  var FRONT_LINES = [
    { k: 'PLAY',  t: 'Call it',          b: 'Call the outcome. Climb the board.',      h: '/call-it' },
    { k: 'TRACK', t: 'People\u2019s CPI', b: 'Track prices the people report.',         h: '/peoples-cpi' },
    { k: 'MONEY', t: 'Robbery Report',   b: 'The heist, with receipts.',                h: '/follow-the-money' },
    { k: 'MONEY', t: 'Follow the Money', b: 'Follow the money trail.',                 h: '/follow-the-money' },
    { k: 'SQUAD', t: 'Cell War',         b: 'Squad vs squad. Hold the line.',           h: '/cell-war' },
    { k: 'PLAY',  t: 'Arcade',           b: 'Nine games. One war.',                     h: '/arcade' },
    { k: 'MAKE',  t: 'Create',           b: 'Forge propaganda. Ship it.',               h: '/create' },
    { k: 'FUND',  t: 'Store',            b: 'Wear the war.',                            h: '/store' },
    { k: 'FUND',  t: 'Fund the fight',   b: 'Fuel the machine.',                        h: '/fund' },
    { k: 'ACT',   t: 'Governance',       b: 'Vote the movement\u2019s line.',            h: '/governance' },
    { k: 'LEARN', t: 'Academy',          b: 'Learn the tools. Fight forever.',          h: '/request-access#pf-academy-hq' },
    { k: 'TRACK', t: 'Data Bounties',    b: 'Open bounties. Real targets.',             h: '/data-bounties' }
  ];
  /* P6 on every card: SHARE THIS INTEL -> the feature page; TAKE THIS TO
     YOUR CELL -> /cells; REPORT BACK -> the daily check-in. The funnel
     never dead-ends. */
  function cardBar(href) {
    return P.actionBar({ shareUrl: href, cellUrl: '/cells', reportUrl: '/#pf-orders' });
  }
  function frontLinesHtml() {
    var h = '<div class="pf-pat"><p class="pf-pat-hero-kicker">Front lines</p>' +
      '<div id="pf-fl-grid">';
    for (var i = 0; i < FRONT_LINES.length; i++) {
      var c = FRONT_LINES[i];
      h += '<div>' + P.intelCard({ kicker: c.k, headline: c.t, dataLine: esc(c.b), href: c.h, verb: 'deploy' }) +
        cardBar(c.h) + '</div>';
    }
    return h + '</div></div>';
  }

  /* ---- ANONYMOUS: P1 Briefing Hero + FRONT LINES -----------------------
     Zero backend reads. P.hero renders the join anchor (href '/'); then
     wireAnonJoin() stamps data-pf-claim-cs on it, and the delegated
     [data-pf-claim-cs] click handler in 03-global.js owns the tap —
     preventDefault + PF.requireCallsign opens the enlistment modal.
     Load order matters: 33-patterns.js must evaluate before this module
     (build/bundle-core.js orders it so); otherwise `if (!P) return` kills
     the hub at load and this hero never renders. */
  function anonHeroHtml() {
    return '<div class="pf-pat" id="pf-anonhero">' +
      P.hero({
        kicker: 'The movement',
        mission: 'One machine. Four fights. Your callsign is your weapon.',
        sub: 'No name required to look around \u2014 claim one when you\u2019re ready to fight.',
        joinHref: '/'
      }) +
      frontLinesHtml() +
      '</div>';
  }
  function wireAnonJoin(root) {
    try {
      var btn = root.querySelector('.pf-pat-join');
      if (btn) {
        btn.setAttribute('data-pf-claim-cs', '1');
        btn.setAttribute('data-pf-claim-ctx', 'hub-anon-hero');
      }
    } catch (e) {}
  }

  /* ---- RECOGNIZED: YOUR CAMPAIGN --------------------------------------
     P1 (path-flavored kicker + mission) + P5 ring + next move + link cards
     + FRONT LINES. Every card carries the P6 Action Bar. */
  function kickerText() {
    var names = [];
    try {
      var Pl = window.PF && PF.pillars;
      if (Pl && typeof Pl.pathNames === 'function') names = Pl.pathNames();
    } catch (e) {}
    return (names.length && names.length < 4)
      ? names.join(' + ') + ' \u00B7 Your campaign'
      : 'Your campaign';
  }

  /* Compact Next Move: same priority reads as before; the CTA obeys the
     CTA family — DEPLOY → for actions, REPORT BACK → for the close-the-loop
     check-in. Kicker per the News Desk gate: "YOUR ORDERS →". */
  function nextMoveData(d) {
    if (d.streakRisk) {
      return { t: 'STREAK AT RISK', s: 'Keep it going \u2014 one check-in before midnight Chicago.', v: 'report', h: '/#pf-orders' };
    } else if (!d.lootClaimed) {
      return { t: 'THE CRATE IS LOADED', s: 'Your daily loot is waiting.', v: 'deploy', h: '/#pf-orders' };
    } else if (!d.inCell) {
      return { t: 'NO SQUAD YET', s: 'Five callsigns. One streak. Nobody gets left behind.', v: 'deploy', h: '/cells' };
    }
    return { t: 'TODAY\u2019S ORDERS', s: 'Missions are live. Report back when they\u2019re done.', v: 'deploy', h: '/#pf-orders' };
  }
  function nextMoveHtml(d) {
    var c = nextMoveData(d);
    return P.intelCard({ kicker: 'Your orders \u2192', headline: c.t, dataLine: esc(c.s), href: c.h, verb: c.v }) +
      cardBar(c.h);
  }

  function linkCardsHtml() {
    return '<div id="pf-hub-2col"><div>' +
      P.intelCard({ kicker: 'Daily orders', headline: 'Today\u2019s missions',
        dataLine: esc('Thirty seconds. Report back when done.'), href: '/#pf-orders', verb: 'deploy' }) +
      cardBar('/#pf-orders') + '</div><div>' +
      P.intelCard({ kicker: 'War report', headline: 'This week\u2019s dispatch',
        dataLine: esc('The war, distilled. Sixty seconds, then move.'), href: '/war-report', verb: 'deploy' }) +
      cardBar('/war-report') + '</div></div>';
  }

  function ringHtml(d) {
    return P.ring({ xp: d.xpToday, cap: dailyTarget(), streak: d.streak, rank: rankOf() });
  }

  function cellHtml(d) {
    if (d.inCell) {
      return '<p class="pat-gray" data-hub-cell>Fighting with <b>' + esc(d.cellName || 'your cell') + '</b>' +
        (d.cellChecked ? ' \u2014 checked in today \u2713' : ' \u2014 cell hasn\u2019t checked in yet today') + '</p>';
    }
    return '<p class="pat-gray" data-hub-cell>No cell yet. <b><a href="/cells">Find your squad \u2192</a></b></p>';
  }

  function renderShell(cs, anon) {
    var host = homeHost();
    if (!host) return null;
    injectCss();
    if (anon) {
      if (document.getElementById('pf-anonhero')) return null;
      var a = document.createElement('div');
      a.innerHTML = anonHeroHtml();
      var aEl = a.firstChild;
      if (host.firstChild) host.insertBefore(aEl, host.firstChild);
      else host.appendChild(aEl);
      wireAnonJoin(aEl);
      return aEl;
    }
    if (document.getElementById('pf-hubhero')) return null;
    /* A mid-session claim flips anonymous -> recognized: the anon hero
       stands down, the campaign takes the top slot. */
    try {
      var old = document.getElementById('pf-anonhero');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
    var w = document.createElement('div');
    w.innerHTML = '<div class="pf-pat" id="pf-hubhero">' +
      P.hero({ kicker: kickerText(), mission: 'Your war, your numbers, your next move — all in one place.' }) +
      '<div data-hub-ring>' + ringHtml({ xpToday: 0, streak: 0 }) + '</div>' +
      '<div data-hub-proof></div>' +
      '<div data-hub-cellwrap></div>' +
      '<div data-hub-next></div>' +
      linkCardsHtml() +
      frontLinesHtml() +
      /* PLAY 10 — WINS THAT ECHO (2026-10-06): WINS strip slot — filled by
         PF.wins.renderHubStrip in fill(). The bus hides the slot when muted
         or empty, so anonymous/quiet states render exactly as before. */
      '<div data-ph-wins data-pf-wins-slot="hubhero"></div>' +
      '<div class="ph-foot"><a href="#" data-ph-paths>Change your fights</a> \u00B7 the movement rolls on below</div>' +
      '</div>';
    var el = w.firstChild;
    if (host.firstChild) host.insertBefore(el, host.firstChild);
    else host.appendChild(el);
    return el;
  }

  function fill(el, d) {
    if (!el) return;
    try {
      var r = el.querySelector('[data-hub-ring]');
      if (r) r.innerHTML = ringHtml(d);
      /* P8: real figure or suppressed — cell member count from the live
         read only; never inflated, never guessed. */
      var pr = el.querySelector('[data-hub-proof]');
      if (pr) pr.innerHTML = (d.cellMembers > 0)
        ? P.proof({ count: d.cellMembers, text: 'soldiers in your cell' }) : '';
      var cw = el.querySelector('[data-hub-cellwrap]');
      if (cw) cw.innerHTML = cellHtml(d);
      var nx = el.querySelector('[data-hub-next]');
      if (nx) nx.innerHTML = nextMoveHtml(d);
      /* PLAY 10 — WINS THAT ECHO: the WINS strip. Fail-open — absent
         PF.wins leaves the slot hidden and the hero unchanged. */
      try {
        var wn = el.querySelector('[data-ph-wins]');
        if (wn && window.PF && PF.wins && typeof PF.wins.renderHubStrip === 'function') {
          PF.wins.renderHubStrip(wn);
        }
      } catch (e) {}
    } catch (e) {}
  }

  function boot() {
    var cs = callsign();
    var host = homeHost();
    if (!host) return;
    /* ANONYMOUS: the Briefing Hero + FRONT LINES render with zero backend
       reads — the public landing below stays byte-identical. */
    if (!cs) { renderShell('', true); return; }
    var el = renderShell(cs, false);
    if (!el) return;
    var d = { xpToday: 0, streak: 0, streakRisk: false, lootClaimed: true,
      inCell: false, cellChecked: false, cellName: '', cellMembers: 0 };
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
          var members = j.members || (cells.length && cells[0].members) || [];
          if (members && members.length) d.cellMembers = members.length;
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
