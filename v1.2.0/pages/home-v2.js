/* ============================================================================
   SILO: pages/home-v2.js  |  PF v1.2.0
   WHAT: Mounts the 7 staged game templates onto the fresh /v2 page, in order.
         The page itself holds only <div id="pf-v2"></div> — everything else
         renders from GitHub silos. No native Squarespace blocks required.
   PHASE: mount (v2 page only; loads right BEFORE core/06-override.js, which
          then flushes the companion queue on its non-homepage early-return).
   ORDER: daily-orders, fan-vote, do-meter, media-nuke, poster-forge,
          daily-drop, caption-combat, then the #pf-ranks anchor (Service Medals
          rack renders there; the full Enlistment Ranks ledger stays native).
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

  /* Slim ranks host so the Service Medals rack (GitHub code) has a mount point.
     The full Enlistment Ranks ledger UI is native-only and stays on the main page. */
  var ranks = document.getElementById('pf-ranks');
  if (!ranks) {
    ranks = document.createElement('div');
    ranks.id = 'pf-ranks';
    host.appendChild(ranks);
  }

  var ORDER = [
    ['daily-orders', 'pf-ov-orders'],
    ['fan-vote', 'pf-ov-vote'],
    ['do-meter', 'pf-ov-dometer'],
    ['media-nuke', 'pf-ov-nuke'],
    ['poster-forge', 'pf-ov-poster'],
    ['daily-drop', 'pf-ov-drop'],
    ['caption-combat', 'pf-ov-caption']
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
      host.insertBefore(section, ranks);
      execScripts(section, tplId);
      if (PF) PF.log('home-v2', 'mounted ' + silo);
    } catch (e) { err('mount failed: ' + silo, e); }
  });

  if (PF) PF.log('home-v2', 'v2 mount complete — companions flush via 06-override');
})();
