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
  /* 2026-10-02: homepage reorganized into 7 funnel sections —
     START HERE (hook→daily loop→identity) → PLAY (games) → BELONG (cells) →
     CREATE (creator tools) → FUND (economy) → ACT (action/intel) → PROOF.
     Each section flows into the next; related products stay together.
     vault (admin) and dash (creator analytics) removed from homepage —
     vault via direct URL, dash belongs in Creator HQ. */
  var ORDER = [
    /* ——— SECTION 1: START HERE — hook & daily loop ——— */
    ['brief', 'pf-ov-brief'],
    ['do-meter', 'pf-ov-dometer'],
    ['daily-orders', 'pf-ov-orders'],
    ['dopa', 'pf-ov-dopa'],
    ['enlistment-ranks', 'pf-ov-ranks'],
    ['notify', 'pf-ov-notify'],
    ['socialproof', 'pf-ov-socialproof'],
    /* ——— SECTION 2: PLAY — games arcade, quick wins first ——— */
    ['caption-combat', 'pf-ov-caption'],
    ['creator-guess', 'pf-ov-guess'],
    ['slr-match-quiz', 'pf-ov-matchquiz'],
    ['daily-interrogation', 'pf-ov-interrogation'],
    ['billionaire-supervillain', 'pf-ov-billionaire'],
    ['bracket-board', 'pf-ov-bracket'],
    ['boost-raid', 'pf-ov-raid'],
    ['daily-drop', 'pf-ov-drop'],
    ['battles', 'pf-ov-battles'],
    ['infighting', 'pf-ov-infight'],
    ['media-nuke', 'pf-ov-nuke'],
    ['casino', 'pf-ov-casino'],
    /* ——— SECTION 3: BELONG — cells & squads lifecycle ——— */
    ['cells', 'pf-ov-cells'],
    ['cell-war', 'pf-ov-cellwar'],
    ['diplo', 'pf-ov-diplo'],
    ['contracts', 'pf-ov-contracts'],
    ['referral', 'pf-ov-referral'],
    /* ——— SECTION 4: CREATE — creator tools journey ——— */
    ['academy', 'pf-ov-academy'],
    ['assist', 'pf-ov-assist'],
    ['poster-forge', 'pf-ov-poster'],
    ['video', 'pf-ov-video'],
    ['feed', 'pf-ov-feed'],
    ['hq-nudge', 'pf-ov-hq-nudge'],
    /* ——— SECTION 5: FUND — economy & money ——— */
    ['peoplesbank', 'pf-ov-peoplesbank'],
    ['economy', 'pf-ov-economy'],
    ['war-bonds', 'pf-ov-bonds'],
    ['movement', 'pf-ov-movement'],
    ['earnings', 'pf-ov-earnings'],
    ['bounties', 'pf-ov-bounties'],
    /* ——— SECTION 6: ACT — action & intel ——— */
    ['campaign', 'pf-ov-campaign'],
    ['alerts', 'pf-ov-alerts'],
    ['irl', 'pf-ov-irl'],
    ['intel', 'pf-ov-intel'],
    ['archive', 'pf-ov-archive'],
    /* ——— SECTION 7: PROOF — social validation closer ——— */
    ['fan-vote', 'pf-ov-vote']
  ];

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { err('inner script failed in ' + label, e); }
      scripts[i].remove();
    }
  }

  /* Idempotent mounter — safe to call repeatedly. Lazy bundles call
     PF.mountSilos() after staging their templates so newly-available
     silos mount in ORDER without re-mounting existing ones.
     Missing templates are normal (bundle not loaded yet / silo killed). */
  var mounted = {};
  function mountSilos() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return 0;
    var n = 0;
    ORDER.forEach(function (pair) {
      var silo = pair[0], tplId = pair[1];
      if (mounted[silo]) return;
      if (PF && PF.skip(silo)) { mounted[silo] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) return; /* bundle not staged yet — try next call */
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        h.appendChild(section);
        execScripts(section, tplId);
        mounted[silo] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[silo] = 1; }
    });
    return n;
  }

  /* Expose for lazy bundles. Guarded: only defined once. */
  if (PF && !PF.mountSilos) PF.mountSilos = mountSilos;
  mountSilos();

  /* Race-condition guard: if lazy bundles staged templates before this file
     defined PF.mountSilos, the loader's onload skipped the mount. Retry until
     all ORDER silos are mounted (or 30s elapses). */
  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountSilos(); } catch(e){}
      var allDone = true;
      for (var i = 0; i < ORDER.length; i++) {
        if (!mounted[ORDER[i][0]]) { allDone = false; break; }
      }
      if (allDone || tries >= 15 || n === 0 && tries >= 5) {
        clearInterval(iv);
      }
    }, 2000);
  })();

})();
