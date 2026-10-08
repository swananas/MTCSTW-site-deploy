/* core/38-dock.js  |  PF v1.4.3 | BOTTOM DOCK MANAGER (butter P0 #4, 2026-10-06).
   WHAT: one stacked container owns every bottom-fixed PF element on the page.
   Before this, 8+ fixed elements piled into the same mobile bottom corner —
   two at PIXEL-IDENTICAL coordinates (pwa/install.js #pf-pwa-install and
   16-footer.js #pf-delete-fixed, both right:14px;bottom:14px;z-index:99998),
   plus the HUD (bottom:0), the nuke strip (bottom:0), the storage notice
   (bottom:0), the floating SHARE button (bottom:24px;right:24px), the boost
   receipt (bottom:18px), the flow chip (bottom:76px) and the read-XP dock
   (bottom:0). Native footer links were unreachable behind the pile on mobile.
   HOW:
   - #pf-dock: one fixed bottom container (pointer-events:none; children
     re-enable). Two lanes: .pf-dock-full (full-width bars stacked vertically
     with gap — storage notice, nuke strip, HUD, boost receipt, read-XP dock)
     and .pf-dock-corner (right-aligned wrapping row — install button,
     delete-fixed chip, share button, flow chip). Stacked, never overlapping:
     the install/delete coordinate collision is structurally impossible.
   - Modules hand their element over via PF.dockSlot(el, 'full'|'corner').
     The dock strips the element's fixed positioning inline and adopts it.
     If the dock is killed (?pf_off=dock) or never loads, dockSlot is
     undefined and every module falls back to its legacy fixed positioning —
     fail-soft, zero behavior change.
   - The HUD's old MutationObserver that jumped it above the nuke strip is
     gone: the strip and the HUD are both dock lanes, the dock reflows as one
     unit, no jumping.
   - Body padding-bottom compensation: the dock measures its own rendered
     height and pads <body> by exactly that, so footer links stay reachable.
     Recomputed on dock mutations, resizes, and ResizeObserver ticks.
   - The floating SHARE button is prepended to the corner lane so sharing
     keeps its prominence — first chip in the row, never buried.
   SITE-WIDE: ships in the core bundle (every v2 page) AND the footer-chrome
   bundle (v1.1.0-branch pages: /store, /privacy, /terms, 404) — every page
   with bottom-fixed PF chrome gets the dock.
   KILL: ?pf_off=dock  or  localStorage pf_disabled_v1='["dock"]'
   --------------------------------------------------------------------------
   REGISTER (integrator — do NOT edit build/bundle-core.js in a worker lane):
     1. build/bundle-core.js CORE_FILES: add 'core/38-dock.js' AFTER
        'core/36-wildfinds.js' (load after the modules it adopts; runtime
        calls, so order is not load-critical, but keep it late).
     2. build/bundle-core.js bundle-footer-chrome list: add 'core/38-dock.js'
        AFTER 'core/16-footer.js' (dedupes #pf-delete-fixed / #pf-nuke-stick
        on v1.1.0-branch pages).
   Modules call window.PF.dockSlot(el, slot) defensively — safe when the
   dock never loads (falls back to legacy fixed positioning). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('dock')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* Elements the dock knows by id, for the boot sweep (modules that rendered
     before the dock booted). pf-hud is viewport-conditional (mobile only) —
     30-hud.js owns that decision and calls dockSlot itself; the sweep skips
     it. pf-share-float is prepended to the corner lane (sharing prominence). */
  var SWEEP = {
    'pf-nuke-stick': 'full',
    'pf-storage-notice': 'full',
    'pfBoostReceipt': 'full',
    'pf-rx-dock': 'full',
    'pf-share-float': 'corner',
    'pf-pwa-install': 'corner',
    'pf-delete-fixed': 'corner',
    'pf-flow-chip': 'corner'
  };

  var CSS = [
    '#pf-dock{position:fixed;left:0;right:0;bottom:0;z-index:99990;pointer-events:none;',
    'display:flex;flex-direction:column;gap:8px;padding:0 0 calc(8px + env(safe-area-inset-bottom,0px));}',
    '#pf-dock .pf-dock-full{display:flex;flex-direction:column;gap:8px;pointer-events:none;}',
    '#pf-dock .pf-dock-full>*{pointer-events:auto;}',
    '#pf-dock .pf-dock-corner{display:flex;justify-content:flex-end;align-items:flex-end;',
    'gap:8px;flex-wrap:wrap;padding:0 14px;pointer-events:none;}',
    '#pf-dock .pf-dock-corner>*{pointer-events:auto;margin:0;}',
    '#pf-dock .pf-dock-full:empty{display:none;}',
    '#pf-dock .pf-dock-corner:empty{display:none;}'
  ].join('');
  try {
    var st = document.createElement('style');
    st.id = 'pf-dock-css'; st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) {}

  var dock = null, fullLane = null, cornerLane = null;

  function build() {
    if (dock || !document.body) return false;
    dock = document.createElement('div');
    dock.id = 'pf-dock';
    dock.setAttribute('aria-hidden', 'false');
    fullLane = document.createElement('div');
    fullLane.className = 'pf-dock-full';
    cornerLane = document.createElement('div');
    cornerLane.className = 'pf-dock-corner';
    dock.appendChild(fullLane);
    dock.appendChild(cornerLane);
    document.body.appendChild(dock);
    return true;
  }

  /* Adopt an element: strip its fixed positioning, drop it in a lane.
     Returns true when the dock owns the element (module must NOT apply
     legacy fixed styles). Idempotent. */
  function dockSlot(el, slot) {
    try {
      if (!el || !dock) return !!(el && el.getAttribute && el.getAttribute('data-pf-dock') === '1');
      if (el.getAttribute('data-pf-dock') === '1') return true;
      el.setAttribute('data-pf-dock', '1');
      /* Neutralize fixed positioning; the lane owns layout now. Inline
         wins over the modules' stylesheets, so the old bottom/right/z-index
         rules stop applying. display/visibility/hidden-attr untouched. */
      el.style.position = 'static';
      el.style.left = 'auto'; el.style.right = 'auto';
      el.style.top = 'auto'; el.style.bottom = 'auto';
      el.style.transform = 'none';
      el.style.zIndex = 'auto';
      el.style.margin = '0';
      var lane = (slot === 'corner') ? cornerLane : fullLane;
      /* Sharing prominence: the floating SHARE button leads the corner row. */
      if (slot === 'corner' && el.id === 'pf-share-float' && lane.firstChild) {
        lane.insertBefore(el, lane.firstChild);
      } else {
        lane.appendChild(el);
      }
      padSoon();
      return true;
    } catch (e) { return false; }
  }

  /* Release an element back to its module (viewport changes, e.g. the HUD
     going desktop top-fixed). Clears the inline overrides the dock set so
     the module's stylesheet rules take over again. */
  function dockRelease(el) {
    try {
      if (!el || el.getAttribute('data-pf-dock') !== '1') return false;
      el.removeAttribute('data-pf-dock');
      el.style.position = ''; el.style.left = ''; el.style.right = '';
      el.style.top = ''; el.style.bottom = ''; el.style.transform = '';
      el.style.zIndex = ''; el.style.margin = '';
      padSoon();
      return true;
    } catch (e) { return false; }
  }
  function isDocked(el) {
    try { return !!(el && el.getAttribute && el.getAttribute('data-pf-dock') === '1'); }
    catch (e) { return false; }
  }

  /* ---- body padding-bottom compensation: footer links stay reachable ---- */
  var padT = null;
  function pad() {
    try {
      padT = null;
      if (!dock || !document.body) return;
      var h = dock.offsetHeight || 0;
      /* Ignore sub-pixel rounding; only touch the style when it changes. */
      var want = h > 2 ? Math.ceil(h) + 'px' : '';
      if (document.body.style.paddingBottom !== want) {
        document.body.style.paddingBottom = want;
      }
    } catch (e) {}
  }
  function padSoon() {
    try {
      if (padT) return;
      padT = setTimeout(pad, 60);
    } catch (e) {}
  }

  function sweep() {
    try {
      for (var id in SWEEP) {
        if (!SWEEP.hasOwnProperty(id)) continue;
        var el = document.getElementById(id);
        if (el && !isDocked(el)) dockSlot(el, SWEEP[id]);
      }
    } catch (e) {}
    padSoon();
  }

  function boot() {
    if (!build()) return;
    try {
      /* Re-pad whenever the dock's contents change (dismissals, toggles,
         HUD strip expand/collapse, late arrivals). */
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { padSoon(); });
        ro.observe(dock);
      }
      var mo = new MutationObserver(function () { padSoon(); });
      mo.observe(dock, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['hidden', 'style', 'class'] });
      window.addEventListener('resize', padSoon);
      window.addEventListener('orientationchange', padSoon);
    } catch (e) {}
    sweep();
    /* Late arrivals: modules create their elements on events/long polls.
       They call dockSlot directly, but sweep again shortly after boot in
       case anything rendered between parse and dock build. */
    try { setTimeout(sweep, 1500); } catch (e2) {}
    try { setTimeout(sweep, 5000); } catch (e3) {}
    padSoon();
  }

  try { PF.dockSlot = dockSlot; } catch (e) {}
  try { PF.dockRelease = dockRelease; } catch (e) {}
  try { PF.dockSweep = sweep; } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  /* If body wasn't ready at parse, retry once shortly after. */
  try {
    setTimeout(function () { if (!dock) boot(); }, 800);
  } catch (e) {}
})();
