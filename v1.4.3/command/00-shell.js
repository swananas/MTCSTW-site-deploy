/* ============================================================================
   SILO: command/00-shell.js  |  PF v1.4.3 — Command Dashboard shell
   WHAT: #pf-command mount, ?pf_off=command kill switch, dark command-deck
         theme (ALL selectors scoped under #pf-command — zero global
         leakage), skeleton for callsign card → tiles → CTA slot →
         fronts → river (DOM order = mobile 390px stack order).
   WHY: branch 1 of the Command Dashboard build — the shell + request
         infrastructure the tile/front/river/CTA branches (2-5) plug into.
   KILL: ?pf_off=command  or  localStorage pf_disabled_v1='["command"]'
   ============================================================================ */
(function () {
  'use strict';

  /* Kill switch: honors PF.skip('command') when the core bus loaded, else
     parses ?pf_off= / pf_disabled_v1 directly (shell must die quietly even
     without the bus). */
  function pfOff() {
    try {
      if (window.PF && typeof window.PF.skip === 'function') return window.PF.skip('command');
    } catch (e) {}
    try {
      var m = (window.location.search || '').match(/[?&]pf_off=([^&]+)/);
      if (m) {
        var list = decodeURIComponent(m[1]).split(',');
        for (var i = 0; i < list.length; i++) if (list[i] === 'command') return true;
      }
      var d = [];
      try { d = JSON.parse((window.localStorage && window.localStorage.getItem('pf_disabled_v1')) || '[]'); } catch (e) {}
      return d.indexOf('command') !== -1;
    } catch (e) { return false; }
  }

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && ((b.className || '').indexOf('sqs-edit') !== -1)) return true;
      return false;
    } catch (e) { return false; }
  }

  function mountRoot() {
    try { return document.getElementById('pf-command'); } catch (e) { return null; }
  }

  /* DARK COMMAND-DECK THEME. Every selector is rooted at #pf-command.
     Extractable for the theme-scoping test: wrapped in PFCMD-CSS markers. */
  var CSS =
    '/*PFCMD-CSS-START*/\n' +
    '#pf-command{background:#0a0a0c;color:#f5f0e1;font-family:"Helvetica Neue",Arial,sans-serif;padding:24px 16px;box-sizing:border-box;}\n' +
    '#pf-command .pfc-wrap{max-width:1100px;margin:0 auto;box-sizing:border-box;}\n' +
    '#pf-command .pfc-head{border-bottom:3px solid #c1121f;padding:0 0 12px;margin:0 0 16px;}\n' +
    '#pf-command .pfc-head h2{margin:0;font-size:34px;letter-spacing:2px;text-transform:uppercase;font-weight:900;color:#f5f0e1;}\n' +
    '#pf-command .pfc-head .pfc-sub{margin:6px 0 0;color:#f5a623;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:1px;text-transform:uppercase;}\n' +
    '#pf-command .pfc-callsign{background:#111114;border:2px solid #c1121f;border-left:8px solid #c1121f;padding:14px 16px;margin:0 0 16px;}\n' +
    '#pf-command .pfc-callsign .pfc-cs-name{font-size:22px;font-weight:900;letter-spacing:1px;text-transform:uppercase;}\n' +
    '#pf-command .pfc-callsign .pfc-cs-data{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:13px;margin-top:6px;}\n' +
    '#pf-command .pfc-callsign .pfc-cs-data .pfc-status{color:#f5a623;}\n' +
    '#pf-command .pfc-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:0 0 16px;}\n' +
    '#pf-command .pfc-tile{background:#111114;border:1px solid #333;border-top:3px solid #c1121f;padding:12px;min-height:120px;}\n' +
    '#pf-command .pfc-tile .pfc-tile-title{font-weight:800;letter-spacing:1px;text-transform:uppercase;font-size:14px;margin:0 0 8px;color:#f5f0e1;}\n' +
    '#pf-command .pfc-tile .pfc-tile-body{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:12px;}\n' +
    '#pf-command .pfc-tile.pfc-tile-loading{opacity:.55;}\n' +
    '#pf-command .pfc-tile.pfc-tile-error{border-top-color:#555;}\n' +
    '#pf-command .pfc-tile.pfc-tile-error .pfc-tile-body{color:#8a8578;}\n' +
    '#pf-command .pfc-tile.pfc-tile-locked{border-top-color:#f5a623;min-height:0;}\n' +
    '#pf-command .pfc-tile .pfc-retry{background:transparent;border:1px solid #c1121f;color:#f5f0e1;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;padding:6px 10px;cursor:pointer;margin-top:8px;}\n' +
    '#pf-command .pfc-cta{margin:0 0 16px;}\n' +
    '#pf-command .pfc-cta:empty{display:none;}\n' +
    '#pf-command .pfc-fronts{margin:0 0 16px;border-top:3px solid #c1121f;padding-top:12px;}\n' +
    '#pf-command .pfc-fronts:empty{display:none;}\n' +
    '#pf-command .pfc-river{margin:0 0 16px;border-top:3px solid #c1121f;padding-top:12px;}\n' +
    '#pf-command .pfc-river:empty{display:none;}\n' +
    '#pf-command .pfc-sec-label{font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;color:#f5f0e1;}\n' +
    '#pf-command .pfc-recruit{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 16px;}\n' +
    '#pf-command .pfc-mission{background:#111114;border:2px solid #c1121f;padding:16px;}\n' +
    '#pf-command .pfc-mission .pfc-m-num{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:12px;letter-spacing:2px;}\n' +
    '#pf-command .pfc-mission h3{margin:8px 0;font-size:20px;text-transform:uppercase;letter-spacing:1px;color:#f5f0e1;}\n' +
    '#pf-command .pfc-mission p{font-size:13px;color:#b9b3a6;margin:0 0 12px;line-height:1.5;}\n' +
    '#pf-command .pfc-mission .pfc-m-links{display:flex;gap:8px;flex-wrap:wrap;}\n' +
    '#pf-command .pfc-btn{display:inline-block;background:#c1121f;color:#fff;text-decoration:none;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:10px 18px;font-size:13px;}\n' +
    '#pf-command .pfc-btn.pfc-btn-ghost{background:transparent;border:2px solid #c1121f;color:#f5f0e1;}\n' +
    '#pf-command .pfc-footnote{font-family:ui-monospace,Menlo,Consolas,monospace;color:#6d685c;font-size:11px;margin:12px 0 0;letter-spacing:1px;text-transform:uppercase;}\n' +
    '@media (max-width:480px){\n' +
    '#pf-command{padding:16px 10px;}\n' +
    '#pf-command .pfc-head h2{font-size:26px;}\n' +
    '#pf-command .pfc-tiles{grid-template-columns:1fr;}\n' +
    '#pf-command .pfc-recruit{grid-template-columns:1fr;}\n' +
    '}\n' +
    '/*PFCMD-CSS-END*/';

  function injectTheme(root) {
    var st = document.createElement('style');
    try { st.setAttribute('data-pf', 'command-theme'); } catch (e) {}
    st.textContent = CSS;
    root.appendChild(st);
  }

  /* Skeleton: DOM order = mobile 390px stack order
     (callsign card → tiles → CTA slot → fronts → river). */
  function buildSkeleton(root) {
    var wrap = document.createElement('div');
    wrap.className = 'pfc-wrap';
    wrap.innerHTML =
      '<div class="pfc-head"><h2>Command Deck</h2>' +
      '<div class="pfc-sub">SITREP // ALL FRONTS // LIVE</div></div>' +
      '<div class="pfc-callsign"></div>' +
      '<div class="pfc-tiles"></div>' +
      '<div class="pfc-cta"></div>' +
      '<div class="pfc-fronts"></div>' +
      '<div class="pfc-river"></div>' +
      '<div class="pfc-footnote">PROPAGANDA FACTORY COMMAND // JOIN THE FIGHT.</div>';
    root.appendChild(wrap);
    return wrap;
  }

  var NS = window.PFCommand || (window.PFCommand = {});
  NS._shell = {
    pfOff: pfOff,
    isEditor: isEditor,
    mountRoot: mountRoot,
    CSS: CSS,
    injectTheme: injectTheme,
    buildSkeleton: buildSkeleton
  };
})();
