/* pages/political-hq.js  |  PF v1.4.3 | Political HQ dedicated page.
   Mounts civic action + governance silos on <div id="pf-political-hq"></div>.
   These were removed from the homepage to give them room to breathe.
   KILL: ?pf_off=political-hq  or  localStorage pf_disabled_v1='["political-hq"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfPoliticalHqDone) return;
  if (PF && PF.skip('political-hq')) { return; }
  var host = document.getElementById('pf-political-hq');
  if (!host) return; /* only mounts on the Political HQ page */
  if (isEditor()) return;
  window.pfPoliticalHqDone = true;

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* Political HQ order: civic action first, then governance —
     Know Your Enemy (intel) moved here 2026-10-03 from the homepage. */
  var ORDER = [
    ['civic', 'pf-ov-civic'],
    ['notify-prefs', 'pf-ov-notify-prefs'],
    ['governance', 'pf-ov-gov'],
    ['intel', 'pf-ov-intel']
  ];

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { if (PF) PF.error('political-hq', 'inner script failed in ' + label + ' :: ' + (e && e.message || e)); }
      scripts[i].remove();
    }
  }

  var mounted = {};
  function mountSilos() {
    var h = document.getElementById('pf-political-hq');
    if (!h || isEditor()) return 0;
    var n = 0;
    ORDER.forEach(function (pair) {
      var silo = pair[0], tplId = pair[1];
      if (mounted[silo]) return;
      if (PF && PF.skip(silo)) { mounted[silo] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) return;
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game pf-hq-section';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        h.appendChild(section);
        execScripts(section, tplId);
        mounted[silo] = 1;
        n++;
      } catch (e) {
        if (PF) PF.error('political-hq', 'mount failed: ' + silo + ' :: ' + (e && e.message || e));
        mounted[silo] = 1;
      }
    });
    return n;
  }

  if (PF && !PF.mountPoliticalHq) PF.mountPoliticalHq = mountSilos;
  mountSilos();

})();
