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
  /* 2026-10-05 (audit #4): a missing mount div used to be a silent no-op —
     log PF.error so a misconfigured page is visible instead of invisible. */
  if (!host) { if (PF) PF.error('political-hq', 'mount div #pf-political-hq missing — skipping'); return; }
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
      catch (e) {
        if (PF) PF.error('political-hq', 'inner script failed in ' + label + ' :: ' + (e && e.message || e));
        /* TERMINAL STATE (2026-10-05, audit #1 — parity with the
           pages/page-mount.js fix): a dead inner script must never leave
           its "Mobilizing…" skeleton spinning forever. Swap any loading
           placeholders in this section for an explicit error + reload. */
        try {
          var loads = root.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
          for (var j = 0; j < loads.length; j++) {
            var d = document.createElement('div');
            d.style.cssText = 'border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;';
            d.innerHTML = 'This widget failed to start. ' +
              '<button style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;" onclick="location.reload()">Reload</button>';
            if (loads[j].parentNode) loads[j].parentNode.replaceChild(d, loads[j]);
          }
        } catch (e2) {}
      }
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

  /* EMPTY-BOX SWEEP (2026-10-03): a content-less .pf-silo renders as a dead
     empty black box with a red border. Collapse any .pf-silo under
     #pf-political-hq that is PROVABLY empty — no text and no media/form/
     interactive children. Runs after mount + late paints; every legitimate
     silo carries its h2/c-tag/loader text from t=0, so this can only ever
     remove a genuinely dead container, never real content. */
  function sweepEmptySilos(){
    try{
      var h=document.getElementById('pf-political-hq'); if(!h) return;
      var silos=h.querySelectorAll('.pf-silo'), n=0;
      for(var i=0;i<silos.length;i++){
        var s=silos[i];
        var hasText=s.textContent.replace(/\s+/g,'').length>0;
        var hasContent=s.querySelector('img,iframe,canvas,video,input,textarea,select,button,a')!==null;
        if(!hasText&&!hasContent){
          var sec=s.closest?s.closest('section'):null;
          if(sec) sec.style.display='none'; else s.style.display='none';
          n++;
        }
      }
      if(n&&PF) PF.error('political-hq','swept '+n+' empty silo container(s)');
    }catch(e){}
  }
  setTimeout(sweepEmptySilos,5000);

})();
