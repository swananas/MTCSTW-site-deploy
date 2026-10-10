/* pages/climbers-teaser.js  |  PF v1.4.3 | A6 Biggest Climbers teaser card.
   Slim teaser injected right after the homepage Morning Briefing
   (#pf-brief): this week's top 3 climbers + a link to the full board on
   /war-report. Read-only (climber_board JSONP). Kept separate from
   games/briefing.js so the briefing silo itself is untouched.
   KILL: ?pf_off=climbers-teaser  or  localStorage pf_disabled_v1='["climbers-teaser"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('climbers-teaser')) { return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', MUTED = '#b8ab8e', GREEN = '#4caf50';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function apiGet(cb) {
    var backend = '';
    try { backend = window.PF_BACKEND_URL || ''; } catch (e) {}
    if (!backend) { cb(null); return; }
    var fn = 'pfClimbTz' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    s.src = backend + '?action=climber_board&callback=' + fn;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 10000);
  }

  function render(anchor, j) {
    if (!j || !j.ok || !j.entries || !j.entries.length) return; /* quiet when empty */
    var top = j.entries.slice(0, 3);
    var rows = top.map(function (e, i) {
      var d = Math.round(Number(e.delta) || 0);
      var arrow = d > 0
        ? ' <span style="color:' + GREEN + ';">&#9650;</span>'
        : (d < 0 ? ' <span style="color:#e53935;">&#9660;</span>' : '');
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:0.85rem;">'
        + '<span style="color:' + CREAM + ';font-weight:700;">' + (i + 1) + '. ' + esc(String(e.callsign || '').toUpperCase()) + arrow + '</span>'
        + '<span style="color:' + MUTED + ';">+' + Math.round(Number(e.gained) || 0) + ' XP</span></div>';
    }).join('');
    var el = document.createElement('div');
    el.id = 'pf-climbers-teaser';
    el.innerHTML = '<div style="background:#101010;border:2px solid ' + RED + ';padding:1rem 1.1rem;margin:0 0 1rem;box-sizing:border-box;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + '<div style="color:' + RED + ';font-weight:900;letter-spacing:0.24em;font-size:0.68rem;margin-bottom:0.5rem;">BIGGEST CLIMBERS — THIS WEEK</div>'
      + rows
      + '<div style="margin-top:0.6rem;"><a href="/war-report" style="color:' + RED + ';font-weight:900;letter-spacing:0.1em;font-size:0.8rem;text-decoration:none;border-bottom:2px solid ' + RED + ';">FULL BOARD &#8594;</a></div>'
      + '</div>';
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  }

  function mount() {
    /* Homepage only: the Morning Briefing block. Poll briefly — the brief
       instantiates async after bundle-sec1 stages its template. */
    var tries = 0;
    (function tick() {
      if (++tries > 40 || document.getElementById('pf-climbers-teaser')) return;
      var brief = document.getElementById('pf-brief');
      if (!brief) { setTimeout(tick, 750); return; }
      apiGet(function (j) {
        try { render(brief, j); } catch (e) {}
        try { PF.log('climbers-teaser', 'mounted'); } catch (e2) {}
      });
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
