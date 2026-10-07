/* core/37-touch.js  |  PF v1.4.3 | TOUCH-TARGET FLOOR (butter P0 #5, 2026-10-06).
   WHAT: site-wide 44px minimum tap-target floor for PF-owned interactive
   elements, applied ONLY on coarse-pointer (touch) devices so desktop
   layouts are byte-identical. Follows the predgame.js pattern
   (min-height:44px;box-sizing:border-box) as a floor, never a fixed height.
   WHY: the P0 audit named share-everywhere.js, 19-crossnav.js, 33-patterns
   text CTAs and modal close buttons — the CEO scope expansion (2026-10-06)
   takes it site-wide: EVERY CTA, link and button. Hundreds of PF buttons
   are created via inline style.cssText across dozens of modules; a single
   injected stylesheet floors them all without touching each call site.
   SCOPE SAFETY:
   - pointer:coarse media query — touch devices only; desktop untouched.
   - PF-namespaced selectors only ([id*="pf-"], [class*="pf-"], pf_ variants)
     so Squarespace's native chrome is never restyled.
   - min-height/min-width are floors: elements already >=44px don't move;
     inline elements (paragraph links) ignore min-height, so body copy flow
     is undisturbed. Per CSS, min-height also clamps any inline height:NNpx.
   - display:inline-flex + align/justify center keeps single-line labels
     vertically centered as their box grows (visually identical, roomier).
   Named P0 targets also get direct min-height edits in their source files
   (share-everywhere.js, 19-crossnav.js, 33-patterns.css, modal close
   buttons) — this module is the backstop that catches everything else.
   KILL: ?pf_off=touch  or  localStorage pf_disabled_v1='["touch"]'
   --------------------------------------------------------------------------
   REGISTER (integrator — do NOT edit build/bundle-core.js in a worker lane):
     1. build/bundle-core.js CORE_FILES: add 'core/37-touch.js' AFTER
        'core/36-wildfinds.js' (before 38-dock.js).
     2. build/bundle-core.js bundle-footer-chrome list: add 'core/37-touch.js'
        AFTER 'core/16-footer.js' (crossnav/footer links on v1.1.0 pages). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('touch')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* PF-namespaced interactive elements. Buttons/links/role=button with
     pf- or pf_ in id or class. Attribute-substring keeps this working for
     elements created via inline style.cssText (no class hooks needed). */
  var SEL = [
    'a[id*="pf-"]', 'a[class*="pf-"]', 'a[id*="pf_"]', 'a[class*="pf_"]',
    'button[id*="pf-"]', 'button[class*="pf-"]', 'button[id*="pf_"]', 'button[class*="pf_"]',
    '[role="button"][id*="pf-"]', '[role="button"][class*="pf-"]',
    '[role="button"][id*="pf_"]', '[role="button"][class*="pf_"]',
    'input[type="submit"][id*="pf-"]', 'input[type="submit"][class*="pf-"]',
    'input[type="button"][id*="pf-"]', 'input[type="button"][class*="pf-"]',
    'select[id*="pf-"]', 'select[class*="pf-"]',
    /* Chrome containers whose inner controls don't carry pf- markers
       (e.g. the nuke strip's pns-* buttons live inside #pf-nuke-stick). */
    '#pf-dock button', '#pf-dock a', '#pf-dock [role="button"]',
    '#pf-nuke-stick button', '#pf-nuke-stick a',
    '#pf-nextop a', '#pf-nextop button'
  ].join(',');
  var CSS =
    '@media (pointer:coarse){' +
    /* Size floor only — no display changes here. Forcing a display value
       globally would shrink-wrap display:block buttons and break flex
       layouts; the named P0 targets get inline-flex centering in their own
       source files where the context is controlled. min-height on
       inline-block buttons grows the box symmetrically around existing
       padding; inline elements (paragraph links) ignore it entirely. */
    SEL + '{min-height:44px;min-width:44px;box-sizing:border-box;}' +
    '}';
  try {
    if (document.getElementById('pf-touch-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-touch-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) {}
})();
