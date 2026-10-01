/* ============================================================================
   SILO: pages/home-v2.js  |  PF v1.3.1
   WHAT: Mounts the 7 game templates onto the fresh /v2 scratch page, in the
         exact order they appear on the production homepage (reverse-engineered
         from the live page's game section roots, Oct 2026):
           fan-vote -> daily-orders -> do-meter -> daily-drop ->
           media-nuke -> caption-combat -> poster-forge
         The page itself holds only <div id="pf-v2"></div> — every visible
         section renders from GitHub silos. No native Squarespace blocks.
         Games only: no ranks, no bracket board, no war bonds, no comrades.
   PHASE: mount (v2 page only; loads LAST in the v2 file set).
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]'
         (per-game ?pf_off=<game> also respected here)
   ============================================================================ */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomeV2Done) return;
  if (PF && PF.skip('home-v2')) { PF.log('home-v2', 'disabled via kill-switch'); return; }
  if (!/^\/v2(\/)?(\?.*)?$/.test(location.pathname)) return;
  window.pfHomeV2Done = true;

  function err(msg, e) {
    if (PF) PF.error('home-v2', msg + ' :: ' + (e && e.message || e));
  }

  var host = document.getElementById('pf-v2');
  if (!host) { err('no #pf-v2 shell on page — add a Code Block with <div id="pf-v2"></div>'); return; }

  /* Homepage order, verified against the live page's game section roots. */
  var ORDER = [
    ['fan-vote', 'pf-ov-vote'],
    ['daily-orders', 'pf-ov-orders'],
    ['do-meter', 'pf-ov-dometer'],
    ['daily-drop', 'pf-ov-drop'],
    ['media-nuke', 'pf-ov-nuke'],
    ['caption-combat', 'pf-ov-caption'],
    ['poster-forge', 'pf-ov-poster']
  ];

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { err('inner script failed in ' + label, e); }
      scripts[i].remove();
    }
  }

  ORDER.forEach(function (pair) {
    var silo = pair[0], tplId = pair[1];
    if (PF && PF.skip(silo)) { PF.log('home-v2', silo + ' skipped (disabled)'); return; }
    try {
      var tpl = document.getElementById(tplId);
      if (!tpl || !tpl.content) { err('staged template missing: ' + tplId + ' (was ' + silo + ' killed?)'); return; }
      var frag = document.importNode(tpl.content, true);
      var section = document.createElement('section');
      section.className = 'pf-v2-game';
      section.setAttribute('data-game', silo);
      section.appendChild(frag);
      host.appendChild(section);
      execScripts(section, tplId);
      if (PF) PF.log('home-v2', 'mounted ' + silo);
    } catch (e) { err('mount failed: ' + silo, e); }
  });

  if (PF) PF.log('home-v2', 'v2 mount complete — 7 games, GitHub only');
})();
