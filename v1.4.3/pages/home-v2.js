/* pages/home-v2.js  |  PF v1.4.1 | Mounts 12 section templates wherever the <div id="pf-v2"></div> shell
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomeV2Done) return;
  if (PF && PF.skip('home-v2')) { return; }
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

  /* Homepage order, verified against the live page's section roots.
     Daily Orders leads: it's the stickiest dopamine lynchpin. */
  var ORDER = [
    ['daily-orders', 'pf-ov-orders'],
    ['campaign', 'pf-ov-campaign'],
    ['referral', 'pf-ov-referral'],
    ['feed', 'pf-ov-feed'],
    ['bounties', 'pf-ov-bounties'],
    ['academy', 'pf-ov-academy'],
    ['assist', 'pf-ov-assist'],
    ['alerts', 'pf-ov-alerts'],
    ['archive', 'pf-ov-archive'],
    ['irl', 'pf-ov-irl'],
    ['intel', 'pf-ov-intel'],
    ['cells', 'pf-ov-cells'],
    ['contracts', 'pf-ov-contracts'],
    ['fan-vote', 'pf-ov-vote'],
    ['infighting', 'pf-ov-infight'],
    ['slr-match-quiz', 'pf-ov-matchquiz'],
    ['creator-guess', 'pf-ov-guess'],
    ['bracket-board', 'pf-ov-bracket'],
    ['boost-raid', 'pf-ov-raid'],
    ['do-meter', 'pf-ov-dometer'],
    ['daily-drop', 'pf-ov-drop'],
    ['billionaire-supervillain', 'pf-ov-billionaire'],
    ['daily-interrogation', 'pf-ov-interrogation'],
    ['media-nuke', 'pf-ov-nuke'],
    ['caption-combat', 'pf-ov-caption'],
    ['poster-forge', 'pf-ov-poster'],
    ['battles', 'pf-ov-battles'],
    ['casino', 'pf-ov-casino'],
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
    if (PF && PF.skip(silo)) return;
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
    } catch (e) { err('mount failed: ' + silo, e); }
  });

})();
