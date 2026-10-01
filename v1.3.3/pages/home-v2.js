/* ============================================================================
   SILO: pages/home-v2.js  |  PF v1.3.3
   WHAT: Mounts 10 section templates wherever the <div id="pf-v2"></div> shell
         lives — the unlisted /v2-page scratch page today, the site homepage (/)
         once /v2-page is set as homepage. Detection is shell-based, not
         path-based, so the v2 set follows the shell wherever it goes.
         Sections render in the exact order they appear on the production
         homepage (reverse-engineered from the live page's section roots,
         Oct 2026):
           fan-vote -> bracket-board -> daily-orders -> do-meter ->
           daily-drop -> media-nuke -> caption-combat -> poster-forge ->
           enlistment-ranks -> war-bonds
         The shell page holds only the shell div — every visible section
         renders from GitHub silos. No native Squarespace blocks.
         Sections: the 7 games + Liquidation Bracket board, Enlistment Ranks
         (with Service Medals rack), War Bonds directory. Comrades stays out
         of the v2 set (silo exists in repo, unloaded on this page).
   PHASE: mount (shell page only; loads LAST in the v2 file set).
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]'
         (per-section ?pf_off=<silo> also respected here)
   ============================================================================ */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomeV2Done) return;
  if (PF && PF.skip('home-v2')) { PF.log('home-v2', 'disabled via kill-switch'); return; }
  var host = document.getElementById('pf-v2');
  if (!host) return; /* v2 mounts only where the shell lives — never on production pages */
  if (isEditor()) return; /* never mount inside the Squarespace editor */
  window.pfHomeV2Done = true;

  function err(msg, e) {
    if (PF) PF.error('home-v2', msg + ' :: ' + (e && e.message || e));
  }

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* Homepage order, verified against the live page's section roots. */
  var ORDER = [
    ['fan-vote', 'pf-ov-vote'],
    ['bracket-board', 'pf-ov-bracket'],
    ['daily-orders', 'pf-ov-orders'],
    ['do-meter', 'pf-ov-dometer'],
    ['daily-drop', 'pf-ov-drop'],
    ['media-nuke', 'pf-ov-nuke'],
    ['caption-combat', 'pf-ov-caption'],
    ['poster-forge', 'pf-ov-poster'],
    ['enlistment-ranks', 'pf-ov-ranks'],
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

  if (PF) PF.log('home-v2', 'v2 mount complete — 10 sections, GitHub only');
})();
