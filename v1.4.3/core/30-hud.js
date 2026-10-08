/* core/30-hud.js  |  PF v1.4.3 | THE HUD — one persistent progress marker.
   Cohesion P0 (2026-10-06): a slim persistent identity chip in the single
   sticky header — ring-avatar + callsign + tier + streak flame. Tapping the
   chip opens the YOUR CAMPAIGN strip as a dropdown panel (absolute under the
   header): the 5-phase journey rail ENLIST -> TRAIN -> FIGHT -> ORGANIZE ->
   LEAD with the user's current position.
   HEADER REDESIGN (2026-10-08, CEO directive): the old two-tier top
   (shell nav + separate fixed HUD bar at top:40px on desktop) is gone. The
   HUD bar, its unlabeled caret, and the SEARCH pill mount are deleted; the
   chip lives in #pf-topbar-user, the strip in #pf-topbar-panel, the search
   trigger is the header's own #pf-topbar-search (see 32-search.js). The
   bottom dock (nuke strip, ASK KARL, ticker) is untouched.
   FRONTEND-ONLY, ZERO NEW XP — pure routing + reads. No writes.
   Reads: ONE batched `hud` endpoint (auth-gated via PF.authGetJSONP, fail-open),
   replacing the 4-call page-load fan-out (xp_today + streak_status +
   academy_progress + cell_mine). Instant shell: renders immediately from
   localStorage (callsign + rank), patches numbers in when the call resolves.
   Rank is device-local (pf_ranks_v1, same tiers as
   games/enlistment-ranks.js); absent = rank omitted, never guessed.
   DAILY TARGET: window.PF_HUD_TARGET or PF.hudDailyTarget (default 100) —
   THIS IS MATH DEPT'S KNOB. The ring fills toward it; the HUD sets no values.
   VISUAL SYSTEM: styled through CSS custom properties (--pf-hud-*) so the
   breathing-room agent's visual system can re-skin without touching logic.
   Mount: inside the sticky header (#pf-topbar-user); panel drops from
   #pf-topbar-panel. Silent no-op when the header host is absent.
   KILL: ?pf_off=hud  or  localStorage pf_disabled_v1='["hud"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('hud')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  /* Breathing-room coordination: every color/spacing flows through these. */
  var CSS = [
    ':root{',
    '--pf-hud-bg:rgba(8,8,8,.94);--pf-hud-border:#2a2a2a;--pf-hud-accent:#c1121f;',
    '--pf-hud-text:#f5ead6;--pf-hud-dim:#a89e88;--pf-hud-gold:#e8b33c;}',
    /* the chip: one identity surface in the header */
    '#pf-userchip{display:flex;align-items:center;gap:8px;background:#141414;border:1px solid var(--pf-hud-border);',
    'border-radius:24px;padding:3px 12px 3px 3px;cursor:pointer;color:var(--pf-hud-text);font-family:Arial,sans-serif;',
    'max-width:210px;box-sizing:border-box;}',
    '#pf-userchip:hover{border-color:var(--pf-hud-accent);}',
    '#pf-userchip:focus-visible{outline:2px solid var(--pf-hud-accent);outline-offset:2px;}',
    '#pf-userchip .pf-uc-ring{flex:0 0 auto;display:block;}',
    '#pf-userchip .pf-uc-who{flex:1 1 auto;min-width:0;text-align:left;line-height:1.25;}',
    '#pf-userchip .pf-uc-cs{display:block;font-weight:900;font-size:12px;letter-spacing:.06em;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#pf-userchip .pf-uc-rank{display:block;font-size:9px;letter-spacing:.2em;color:var(--pf-hud-dim);font-weight:700;}',
    '#pf-userchip .pf-uc-streak{flex:0 0 auto;font-size:13px;font-weight:900;color:var(--pf-hud-gold);}',
    '@media(max-width:420px){#pf-userchip .pf-uc-rank{display:none;}#pf-userchip{max-width:150px;}}',
    'a#pf-userchip{text-decoration:none;}',
    /* the dropdown panel reuses the strip ids so 31-pillars.js keeps working */
    '#pf-hud-strip{max-width:720px;margin:0 auto;padding:14px 16px 18px;box-sizing:border-box;}',
    '#pf-hud-strip-title{font-size:10px;letter-spacing:4px;color:var(--pf-hud-accent);font-weight:800;',
    'text-align:center;margin-bottom:10px;}',
    '#pf-hud-phases{display:flex;gap:4px;}',
    '.pf-hud-phase{flex:1 1 0;text-align:center;padding:8px 2px;border:1px solid var(--pf-hud-border);',
    'background:#101010;box-sizing:border-box;}',
    '.pf-hud-phase .p-name{font-size:9px;letter-spacing:.12em;font-weight:900;color:var(--pf-hud-dim);}',
    '.pf-hud-phase .p-dot{width:10px;height:10px;border-radius:50%;margin:6px auto 0;background:#333;}',
    '.pf-hud-phase.done .p-dot{background:var(--pf-hud-accent);}',
    '.pf-hud-phase.done .p-name{color:var(--pf-hud-text);}',
    '.pf-hud-phase.current{border-color:var(--pf-hud-accent);}',
    '.pf-hud-phase.current .p-dot{background:var(--pf-hud-gold);box-shadow:0 0 8px var(--pf-hud-gold);}',
    '.pf-hud-phase.current .p-name{color:var(--pf-hud-gold);}',
    '#pf-hud-hint{text-align:center;font-size:12px;color:var(--pf-hud-dim);margin-top:10px;line-height:1.5;}',
    '#pf-hud-hint a{color:var(--pf-hud-text);font-weight:800;}'
  ].join('');
  try {
    var st = document.createElement('style');
    st.id = 'pf-hud-css'; st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) {}

  var TIERS = [['RECRUIT', 0], ['AGITATOR', 25], ['CADRE', 75], ['COMMISSAR', 150], ['ARCHITECT', 300]];
  function tierOf(xp) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) { if (xp >= TIERS[i][1]) t = TIERS[i]; }
    return t[0];
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    return cs;
  }
  function deviceRank() {
    try {
      var lr = JSON.parse(localStorage.getItem('pf_ranks_v1') || '{"xp":0}');
      return tierOf(Number(lr.xp) || 0);
    } catch (e) { return ''; }
  }
  function dailyTarget() {
    try {
      if (typeof window.PF_HUD_TARGET === 'number' && window.PF_HUD_TARGET > 0) return window.PF_HUD_TARGET;
      if (window.PF && typeof PF.hudDailyTarget === 'number' && PF.hudDailyTarget > 0) return PF.hudDailyTarget;
    } catch (e) {}
    return 100;
  }
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var fn = 'pfHudCb' + Math.floor(Math.random() * 1e9);
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

  var PHASES = [
    { key: 'ENLIST', hint: 'Claim your callsign — everything follows it.', href: '/' },
    { key: 'TRAIN', hint: 'Finish Basic Training in the Academy.', href: '/academy' },
    { key: 'FIGHT', hint: 'Run Daily Orders. The Blitz needs hands today.', href: '/#pf-orders' },
    { key: 'ORGANIZE', hint: 'Join a cell — or build your own and recruit.', href: '/cells' },
    { key: 'LEAD', hint: 'Recruit soldiers. Forge content. Run bounties.', href: '/cells' }
  ];
  function phaseStates(callsign, graduated, inCell) {
    /* done(i): ENLIST = has callsign; TRAIN = graduated; FIGHT = in a cell
       (fighting continues, but the gate to ORGANIZE is crossed). ORGANIZE and
       LEAD are horizons — always shown as next, never auto-completed. */
    var done = [
      !!callsign,
      !!graduated,
      !!inCell,
      false,
      false
    ];
    var cur = 0;
    for (var i = 0; i < done.length; i++) { if (!done[i]) { cur = i; break; } cur = i; }
    return { done: done, current: cur };
  }
  function ringSvg(frac, size) {
    var s = size || 30;
    var c = 2 * Math.PI * 15.5, off = c * (1 - Math.min(1, Math.max(0, frac)));
    return '<svg class="pf-uc-ring" width="' + s + '" height="' + s + '" viewBox="0 0 36 36" aria-hidden="true">' +
      '<circle cx="18" cy="18" r="15.5" fill="none" stroke="#2a2a2a" stroke-width="4"/>' +
      '<circle cx="18" cy="18" r="15.5" fill="none" stroke="#c1121f" stroke-width="4"' +
      ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"' +
      ' stroke-linecap="round" transform="rotate(-90 18 18)"/>' +
      '<text x="18" y="22" text-anchor="middle" fill="#f5ead6" font-size="10" font-weight="900" font-family="Arial">' +
      Math.round(Math.min(1, Math.max(0, frac)) * 100) + '</text></svg>';
  }
  function phaseHtml(callsign, graduated, inCell) {
    var ps = phaseStates(callsign, graduated, inCell);
    var ph = '';
    for (var i = 0; i < PHASES.length; i++) {
      var cls = 'pf-hud-phase' + (ps.done[i] ? ' done' : '') + (i === ps.current ? ' current' : '');
      ph += '<div class="' + cls + '"><div class="p-name">' + PHASES[i].key + '</div><div class="p-dot"></div></div>';
    }
    var cur = PHASES[ps.current] || PHASES[0];
    return { phases: ph, hint: esc(cur.hint) + ' <a href="' + esc(cur.href) + '">MOVE &rarr;</a>' };
  }
  function chipInner(callsign, xpToday, streakCount) {
    var target = dailyTarget();
    var rank = deviceRank();
    var who = callsign
      ? '<span class="pf-uc-who"><span class="pf-uc-cs">' + esc(callsign) + '</span>' +
        (rank ? '<span class="pf-uc-rank">' + esc(rank) + '</span>' : '') + '</span>'
      : '<span class="pf-uc-who"><span class="pf-uc-cs">ENLIST &rarr;</span>' +
        '<span class="pf-uc-rank">CLAIM CALLSIGN</span></span>';
    var streak = (streakCount > 0)
      ? '<span class="pf-uc-streak">&#128293;' + streakCount + '</span>' : '';
    return ringSvg(xpToday / target, 30) + who + streak;
  }
  function setPanel(open) {
    var panel = null, chip = null;
    try { panel = document.getElementById('pf-topbar-panel'); } catch (e) {}
    try { chip = document.getElementById('pf-userchip'); } catch (e2) {}
    if (!panel) return;
    try {
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    } catch (e3) {}
    try { if (chip) chip.setAttribute('aria-expanded', open ? 'true' : 'false'); } catch (e4) {}
  }
  function togglePanel() {
    var panel = null;
    try { panel = document.getElementById('pf-topbar-panel'); } catch (e) {}
    setPanel(!!(panel && panel.hasAttribute('hidden')));
  }
  function render(callsign, xpToday, streakCount, graduated, inCell) {
    var host = null;
    try { host = document.getElementById('pf-topbar-user'); } catch (e) {}
    if (!host || document.getElementById('pf-userchip')) return;
    var hh = phaseHtml(callsign, graduated, inCell);
    var label = callsign ? 'Your campaign — ' + callsign + '. Activate to open.' : 'Enlist — claim your callsign. Activate to open.';
    var chip;
    if (callsign) {
      chip = document.createElement('button');
      chip.type = 'button';
    } else {
      /* No callsign: the chip is the enlist CTA. */
      chip = document.createElement('a');
      chip.href = '/';
    }
    chip.id = 'pf-userchip';
    chip.setAttribute('aria-expanded', 'false');
    chip.setAttribute('aria-label', label);
    chip.innerHTML = chipInner(callsign, xpToday, streakCount);
    chip.addEventListener('click', function (ev) {
      if (chip.tagName === 'A') return; /* enlist link navigates */
      try { ev.preventDefault(); } catch (e2) {}
      togglePanel();
    });
    host.appendChild(chip);
    /* The strip keeps its ids so 31-pillars.js mounts unchanged. */
    var panel = null;
    try { panel = document.getElementById('pf-topbar-panel'); } catch (e3) {}
    if (panel && !document.getElementById('pf-hud-strip')) {
      panel.innerHTML =
        '<div id="pf-hud-strip"><div id="pf-hud-strip-title">YOUR CAMPAIGN</div>' +
        '<div id="pf-hud-phases">' + hh.phases + '</div>' +
        '<div id="pf-hud-hint">' + hh.hint + '</div></div>';
    }
    /* Outside-click + Esc close the panel. */
    try {
      document.addEventListener('click', function (ev) {
        var p = null, c = null;
        try { p = document.getElementById('pf-topbar-panel'); } catch (e4) {}
        try { c = document.getElementById('pf-userchip'); } catch (e5) {}
        if (!p || p.hasAttribute('hidden')) return;
        var t = ev.target;
        if (p.contains(t) || (c && c.contains(t))) return;
        setPanel(false);
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') setPanel(false);
      });
    } catch (e6) {}
  }

  function patchHud(callsign, xpToday, streakCount, graduated, inCell) {
    /* Patch values IN PLACE — never replace #pf-userchip or #pf-hud-strip.
       31-pillars.js mounts #pf-pillars into #pf-hud-strip exactly once
       (observer disconnects); destroying the host node orphaned it. */
    var chip = null;
    try { chip = document.getElementById('pf-userchip'); } catch (e) {}
    if (!chip) { render(callsign, xpToday, streakCount, graduated, inCell); return; }
    try { chip.innerHTML = chipInner(callsign, xpToday, streakCount); } catch (e2) {}
    try {
      var hh = phaseHtml(callsign, graduated, inCell);
      var phasesHost = document.getElementById('pf-hud-phases');
      if (phasesHost) phasesHost.innerHTML = hh.phases;
      var hint = document.getElementById('pf-hud-hint');
      if (hint) hint.innerHTML = hh.hint;
    } catch (e3) {}
  }

  function boot() {
    var cs = ident();
    render(cs, 0, 0, false, false);
    if (!cs) return; /* enlist chip stands alone; no backend call without identity */
    var done = false;
    function settle(j) {
      if (done) return; done = true;
      try {
        if (j && j.ok) {
          var xp = (j.xp_today !== undefined) ? (Number(j.xp_today) || 0) : 0;
          var streak = (j.streak && j.streak.count !== undefined) ? (Number(j.streak.count) || 0) : 0;
          patchHud(cs, xp, streak, !!j.graduated, !!j.in_cell);
        }
        /* else: fail-open — the instant shell stands with zeros. */
      } catch (e) {}
    }
    setTimeout(settle, 10000);
    /* ONE batched call (D1 structural 2026-10-06): auth attaches via
       PF.authGetJSONP (callsign/device/auth_secret) — same gating as the
       individual calls it replaces. Backend: src/hud.js `hud` action. */
    api('hud', { callsign: cs }, settle);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
