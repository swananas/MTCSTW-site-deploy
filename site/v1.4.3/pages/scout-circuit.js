/* pages/scout-circuit.js  |  PF v1.4.3 | A5 Scout Circuit claim UI.
   6 unique catalog views in a Chicago week = SCOUT medal + 25 XP.
   Views are tracked device-locally by pages/slr-catalog.js (pf_scout_v1);
   this module renders the progress/claim panel on the roster page
   (/sick-left-radicals) and calls scout_claim (server-validated against
   the pageview beacon, idempotent per week+callsign, fail-closed caps).
   The routing itself grants zero XP — only the medal claim pays.
   KILL: ?pf_off=scout-circuit  or  localStorage pf_disabled_v1='["scout-circuit"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('scout-circuit')) { return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', MUTED = '#b8ab8e';
  var BACKEND = function () { try { return window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev'; } catch (e) { return 'https://pf-api.mtcstw.workers.dev'; } };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function chiMondayKey() {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    var dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function scoutState() {
    var wk = chiMondayKey(), s = null;
    try { s = JSON.parse(localStorage.getItem('pf_scout_v1') || 'null'); } catch (e) {}
    if (!s || s.w !== wk) s = { w: wk, slugs: [], claimed: false };
    return s;
  }
  function saveScout(s) {
    try { localStorage.setItem('pf_scout_v1', JSON.stringify(s)); } catch (e) {}
  }
  function callsign() {
    try { return String(JSON.parse(localStorage.getItem('pf_identity_v1') || '{}').callsign || '').toLowerCase(); }
    catch (e) { return ''; }
  }
  function friendlyErr(e) {
    e = String(e || '');
    if (e.indexOf('need 6') === 0) return 'Not there yet — keep scouting the roster.';
    if (e.indexOf('unverified views') === 0) return 'Some visits could not be verified yet. Give the wire a minute and retry.';
    if (e === 'unauthorized' || e.indexOf('missing credentials') !== -1 || e.indexOf('no secret issued') !== -1)
      return 'Your callsign needs to reconnect — re-claim it in Enlistment Ranks, then retry.';
    return 'Could not reach Command. The wire is down — retry in a bit.';
  }

  function panelInner() {
    var s = scoutState(), n = Math.min(6, s.slugs.length), inner;
    if (s.claimed) {
      inner = '<div style="color:#7fd67f;font-weight:900;letter-spacing:0.12em;font-size:0.9rem;">★ SCOUT MEDAL EARNED — +25 XP banked. New circuit Monday.</div>';
    } else if (n >= 6) {
      inner = '<div style="color:' + CREAM + ';font-weight:700;margin-bottom:0.7rem;font-size:0.95rem;">Scout circuit complete: <strong style="color:' + RED + ';">6/6</strong> catalogs visited this week.</div>'
        + '<button id="pf-scout-claim" style="background:' + RED + ';color:#fff;border:0;font-weight:900;letter-spacing:0.12em;padding:0.85rem 1.9rem;cursor:pointer;font-size:0.9rem;font-family:inherit;">CLAIM SCOUT MEDAL (+25 XP)</button>'
        + '<div id="pf-scout-msg" style="margin-top:0.6rem;font-size:0.85rem;color:' + MUTED + ';"></div>';
    } else {
      inner = '<div style="color:' + MUTED + ';font-size:0.85rem;letter-spacing:0.06em;">Visit <strong style="color:' + CREAM + ';">' + n + '/6</strong> unique catalogs this week to earn the <strong style="color:' + CREAM + ';">SCOUT</strong> medal (+25 XP)</div>'
        + '<div style="margin:0.7rem auto 0;max-width:380px;height:8px;background:#1a1a1a;border:1px solid #333;box-sizing:border-box;">'
        + '<div id="pf-scout-bar" style="height:100%;width:' + Math.round(n / 6 * 100) + '%;background:' + RED + ';transition:width 0.4s;"></div></div>';
    }
    return '<div style="color:' + RED + ';font-weight:900;letter-spacing:0.3em;font-size:0.7rem;margin-bottom:0.6rem;">SCOUT CIRCUIT</div>' + inner;
  }

  function panelShell() {
    return '<div style="max-width:640px;margin:0 auto 1.8rem;background:#101010;border:2px dashed ' + RED + ';padding:1.2rem 1rem;text-align:center;box-sizing:border-box;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + panelInner() + '</div>';
  }

  function doClaim(panel) {
    var s = scoutState();
    var cs = callsign();
    var msg = panel.querySelector('#pf-scout-msg');
    var btn = panel.querySelector('#pf-scout-claim');
    function say(t) { if (msg) msg.textContent = t; }
    if (!cs) { say('Claim a callsign first (Daily Orders widget) — the medal needs a name.'); return; }
    if (s.slugs.length < 6) { say('Not there yet — ' + s.slugs.length + '/6 catalogs.'); return; }
    if (btn) btn.disabled = true;
    say('Claiming…');
    var body = { type: 'stats', s_action: 'scout_claim', callsign: cs, slugs: s.slugs };
    try { if (window.PFDeviceId) body.device = window.PFDeviceId() || ''; } catch (e) {}
    function done(j) {
      if (j && j.ok) {
        s.claimed = true;
        saveScout(s);
        try {
          if (window.PF && PF.dope) {
            PF.dope.confetti(panel, 60);
            PF.dope.ping(panel, 'SCOUT MEDAL EARNED');
            PF.dope.xpFloat(panel, j.dup ? 'ALREADY CLAIMED' : '+25 XP');
          }
        } catch (e2) {}
        try { document.dispatchEvent(new CustomEvent('pf-do-update')); } catch (e3) {}
        panel.innerHTML = panelShell();
        wireClaim(panel);
      } else {
        if (btn) btn.disabled = false;
        say('Claim failed: ' + friendlyErr(j && (j.err || j.error)));
      }
    }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND(), body, done); return; }
    /* Fallback: raw POST with secret if available. */
    try {
      var sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
      if (sec) body.auth_secret = sec;
    } catch (e4) {}
    try {
      fetch(BACKEND(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e5) { done(null); }
  }

  function wireClaim(panel) {
    var btn = panel.querySelector('#pf-scout-claim');
    if (btn) btn.onclick = function () { doClaim(panel); };
  }

  function mount() {
    /* Roster page only: the roster grid renders async after the DB loads.
       Poll briefly, mount the panel right above the grid, once. */
    var tries = 0;
    (function tick() {
      if (++tries > 40) return;
      var grid = document.querySelector('.pf-slr-grid');
      if (!grid || document.getElementById('pf-scout-panel')) { setTimeout(tick, 750); return; }
      var panel = document.createElement('div');
      panel.id = 'pf-scout-panel';
      panel.innerHTML = panelShell();
      grid.parentNode.insertBefore(panel, grid);
      wireClaim(panel);
      /* Live progress while scouting (event fires from slr-catalog.js). */
      document.addEventListener('pf-scout-progress', function () {
        try {
          var s = scoutState();
          if (s.claimed) return;
          var bar = panel.querySelector('#pf-scout-bar');
          if (bar) bar.style.width = Math.round(Math.min(6, s.slugs.length) / 6 * 100) + '%';
        } catch (e2) {}
      });
      try { PF.log('scout-circuit', 'panel mounted'); } catch (e3) {}
    })();
  }

  /* If the roster re-renders mid-week and the circuit completes, swap the
     panel into its claim state. */
  document.addEventListener('pf-scout-progress', function () {
    var panel = document.getElementById('pf-scout-panel');
    if (!panel) return;
    var s = scoutState();
    if (!s.claimed && s.slugs.length >= 6 && !panel.querySelector('#pf-scout-claim')) {
      panel.innerHTML = panelShell();
      wireClaim(panel);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
