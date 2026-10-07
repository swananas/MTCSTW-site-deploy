/* core/30-hud.js  |  PF v1.4.3 | THE HUD — one persistent progress marker.
   Cohesion P0 (2026-10-06): a slim persistent bar showing callsign + rank,
   today's XP ring, and streak flame. Tapping opens the YOUR CAMPAIGN strip
   (P1): the 5-phase journey rail ENLIST -> TRAIN -> FIGHT -> ORGANIZE -> LEAD
   with the user's current position. This replaces scattered per-page XP
   displays with one voice; surfaces keep their local flavor, the HUD is
   the constant.
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
   Mount: fixed — bottom on mobile (thumb-reachable), top on desktop.
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
    '#pf-hud{position:fixed;left:0;right:0;bottom:0;z-index:9990;background:var(--pf-hud-bg);',
    'border-top:1px solid var(--pf-hud-border);font-family:Arial,sans-serif;',
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}',
    '@media(min-width:820px){#pf-hud{top:var(--pf-hud-top,40px);bottom:auto;border-top:none;border-bottom:1px solid var(--pf-hud-border);}}',
    '#pf-hud-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;',
    'max-width:720px;margin:0 auto;box-sizing:border-box;min-height:52px;}',
    '#pf-hud-ring{flex:0 0 auto;}',
    '#pf-hud-who{flex:1 1 auto;min-width:0;}',
    '#pf-hud-cs{font-weight:900;font-size:13px;letter-spacing:.08em;color:var(--pf-hud-text);',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#pf-hud-rank{font-size:10px;letter-spacing:.22em;color:var(--pf-hud-dim);font-weight:700;}',
    '#pf-hud-streak{flex:0 0 auto;font-size:13px;font-weight:900;color:var(--pf-hud-gold);}',
    '#pf-hud-caret{flex:0 0 auto;color:var(--pf-hud-dim);font-size:12px;}',
    '#pf-hud-strip{display:none;border-top:1px solid var(--pf-hud-border);padding:12px 14px 14px;}',
    '#pf-hud.open #pf-hud-strip{display:block;}',
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
  function ringSvg(frac) {
    var c = 2 * Math.PI * 15.5, off = c * (1 - Math.min(1, Math.max(0, frac)));
    return '<svg id="pf-hud-ring" width="34" height="34" viewBox="0 0 36 36">' +
      '<circle cx="18" cy="18" r="15.5" fill="none" stroke="#2a2a2a" stroke-width="4"/>' +
      '<circle cx="18" cy="18" r="15.5" fill="none" stroke="#c1121f" stroke-width="4"' +
      ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"' +
      ' stroke-linecap="round" transform="rotate(-90 18 18)"/>' +
      '<text x="18" y="22" text-anchor="middle" fill="#f5ead6" font-size="10" font-weight="900" font-family="Arial">' +
      Math.round(Math.min(1, Math.max(0, frac)) * 100) + '</text></svg>';
  }
  function render(callsign, xpToday, streakCount, graduated, inCell) {
    if (document.getElementById('pf-hud')) return;
    var target = dailyTarget();
    var hh = phaseHtml(callsign, graduated, inCell);
    var rank = '';
    try {
      var lr = JSON.parse(localStorage.getItem('pf_ranks_v1') || '{"xp":0}');
      rank = tierOf(Number(lr.xp) || 0);
    } catch (e) {}
    var who = callsign
      ? '<div id="pf-hud-cs">' + esc(callsign) + '</div>' +
        (rank ? '<div id="pf-hud-rank">' + esc(rank) + '</div>' : '')
      : '<div id="pf-hud-cs"><a href="/" style="color:#f5ead6;">ENLIST &rarr;</a></div>' +
        '<div id="pf-hud-rank">CLAIM CALLSIGN</div>';
    var streak = (streakCount > 0)
      ? '<div id="pf-hud-streak">&#128293;' + streakCount + '</div>' : '';
    var el = document.createElement('div');
    el.id = 'pf-hud';
    el.innerHTML =
      '<div id="pf-hud-bar">' + ringSvg(xpToday / target) +
      '<div id="pf-hud-who">' + who + '</div>' + streak +
      '<div id="pf-hud-caret">&#9650;</div></div>' +
      '<div id="pf-hud-strip"><div id="pf-hud-strip-title">YOUR CAMPAIGN</div>' +
      '<div id="pf-hud-phases">' + hh.phases + '</div>' +
      '<div id="pf-hud-hint">' + hh.hint + '</div></div>';
    document.body.appendChild(el);
    var bar = document.getElementById('pf-hud-bar');
    if (bar) bar.addEventListener('click', function () {
      var h = document.getElementById('pf-hud');
      if (h) h.classList.toggle('open');
    });
    /* QC HOLD fix (2026-10-06): the nuke strip (#pf-nuke-stick, z-9000) is
       also bottom-fixed on mobile — the HUD (z-9990) buried its CHARGE /
       RALLY actions. Stack the HUD above the strip whenever the strip is
       visible; drop back to bottom:0 when it's dismissed. Desktop HUD is
       top-fixed, so the offset only applies below the 820px breakpoint. */
    try { watchNukeStrip(el); } catch (e) {}
  }

  function nukeVisibleHeight() {
    try {
      var n = document.getElementById('pf-nuke-stick');
      if (!n || n.hasAttribute('hidden')) return 0;
      var h = n.offsetHeight || 0;
      return h > 0 ? h : 0;
    } catch (e) { return 0; }
  }
  function watchNukeStrip(hudEl) {
    function apply() {
      try {
        var mobile = window.innerWidth < 820;
        hudEl.style.bottom = (mobile && nukeVisibleHeight() > 0)
          ? nukeVisibleHeight() + 'px' : '';
      } catch (e) {}
    }
    apply();
    try {
      var obs = new MutationObserver(function () { apply(); });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['hidden', 'style', 'class'] });
    } catch (e) {}
    try {
      window.addEventListener('resize', apply);
    } catch (e2) {}
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

  function patchHud(callsign, xpToday, streakCount, graduated, inCell) {
    /* QC fix (2026-10-06): patch values IN PLACE — never replace #pf-hud.
       31-pillars.js mounts #pf-pillars into #pf-hud-strip exactly once
       (observer disconnects); destroying the host node orphaned it. */
    var h = null;
    try { h = document.getElementById('pf-hud'); } catch (e) {}
    if (!h) { render(callsign, xpToday, streakCount, graduated, inCell); return; }
    var target = dailyTarget();
    try {
      var oldRing = document.getElementById('pf-hud-ring');
      if (oldRing && oldRing.parentNode) {
        var tmp = document.createElement('div');
        tmp.innerHTML = ringSvg(xpToday / target);
        if (tmp.firstChild) oldRing.parentNode.replaceChild(tmp.firstChild, oldRing);
      }
    } catch (e2) {}
    try {
      var bar = document.getElementById('pf-hud-bar');
      var oldStreak = document.getElementById('pf-hud-streak');
      if (streakCount > 0) {
        var sTmp = document.createElement('div');
        sTmp.innerHTML = '<div id="pf-hud-streak">&#128293;' + streakCount + '</div>';
        var newStreak = sTmp.firstChild;
        if (newStreak) {
          if (oldStreak && oldStreak.parentNode) oldStreak.parentNode.replaceChild(newStreak, oldStreak);
          else if (bar) {
            var caret = document.getElementById('pf-hud-caret');
            if (caret && caret.parentNode === bar) bar.insertBefore(newStreak, caret);
            else bar.appendChild(newStreak);
          }
        }
      } else if (oldStreak && oldStreak.parentNode) {
        oldStreak.parentNode.removeChild(oldStreak);
      }
    } catch (e3) {}
    try {
      var hh = phaseHtml(callsign, graduated, inCell);
      var phasesHost = document.getElementById('pf-hud-phases');
      if (phasesHost) phasesHost.innerHTML = hh.phases;
      var hint = document.getElementById('pf-hud-hint');
      if (hint) hint.innerHTML = hh.hint;
    } catch (e4) {}
    /* The who-block (callsign + device-local rank) is identical between the
       instant shell and the patch — no touch needed. */
  }

  function boot() {
    var cs = ident();
    if (!cs) { render('', 0, 0, false, false); return; }
    /* Instant shell: paint immediately from localStorage so the HUD is never
       the thing the user waits on; the single batched call patches in. */
    render(cs, 0, 0, false, false);
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
