/* PF v1.4.3 bundle-factgen-mount.js — Fact Generator mount shim (2026-10-08).
   The fact-generator.js UI (in bundle-create.js) stages its <template> but
   never instantiates it — this shim mounts it. Loads AFTER bundle-create.js.
   Mounts into #pf-factgen shell mount (/fact-generator route), else #pf-create
   (/create), else #main. Kill: ?pf_off=fact-generator (same as the UI). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('fact-generator')) { return; }
  try {
    if (document.getElementById('pf-factgen-mounted')) { return; }
    var path = (window.location && window.location.pathname) || '';
    var onFactGen = path.indexOf('/fact-generator') === 0;
    var onCreate = path.indexOf('/create') === 0;
    if (!onFactGen && !onCreate) { return; }
    var host = document.getElementById('pf-factgen') ||
               document.getElementById('pf-create') ||
               document.getElementById('main');
    var tpl = document.getElementById('pf-ov-factgen');
    if (!host || !tpl || !tpl.content) { return; }
    var frag = document.importNode(tpl.content, true);
    var wrap = document.createElement('div');
    wrap.id = 'pf-factgen-mounted';
    wrap.appendChild(frag);
    host.appendChild(wrap);
    var scripts = wrap.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { try { if (PF.error) PF.error('factgen-mount', 'inner script failed: ' + (e && e.message || e)); } catch (e2) {} }
      scripts[i].remove();
    }
  } catch (e) { try { if (PF && PF.error) PF.error('factgen-mount', 'mount failed: ' + (e && e.message || e)); } catch (e2) {} }
})();
