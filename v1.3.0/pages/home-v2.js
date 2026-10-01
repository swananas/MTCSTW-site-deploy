/* ============================================================================
   SILO: pages/home-v2.js  |  PF v1.3.0
   WHAT: Mounts the staged GitHub templates onto the fresh /v2 page, in order.
         The page itself holds only <div id="pf-v2"></div> — everything else
         renders from GitHub silos. No native Squarespace blocks required.
   PHASE: mount (v2 page only; loads right BEFORE core/06-override.js, which
          then flushes the companion queue on its non-homepage early-return).
   ORDER: the 7 games, then bracket-board, enlistment-ranks (provides the
          #pf-ranks host the Service Medals rack renders into), comrades,
          war-bonds.
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]'
         (per-silo ?pf_off=<silo> also respected here)
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

  /* The enlistment-ranks silo provides the #pf-ranks host the Service Medals
     rack renders into. Slim fallback only if that silo was kill-switched. */
  function ensureRanksHost() {
    if (document.getElementById('pf-ranks')) return;
    var ranks = document.createElement('div');
    ranks.id = 'pf-ranks';
    host.appendChild(ranks);
    if (PF) PF.log('home-v2', 'slim #pf-ranks fallback created (enlistment-ranks off)');
  }

  var ORDER = [
    ['daily-orders', 'pf-ov-orders'],
    ['fan-vote', 'pf-ov-vote'],
    ['do-meter', 'pf-ov-dometer'],
    ['media-nuke', 'pf-ov-nuke'],
    ['poster-forge', 'pf-ov-poster'],
    ['daily-drop', 'pf-ov-drop'],
    ['caption-combat', 'pf-ov-caption'],
    ['bracket-board', 'pf-ov-bracket'],
    ['enlistment-ranks', 'pf-ov-ranks'],
    ['comrades', 'pf-ov-comrades'],
    ['war-bonds', 'pf-ov-bonds']
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

  ensureRanksHost();

  if (PF) PF.log('home-v2', 'v2 mount complete — companions flush via 06-override');
})();
