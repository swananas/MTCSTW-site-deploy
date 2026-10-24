/* ==========================================================================
   pf-chrome.js — shared chrome behavior for mtcstw.com (2026-10-24)

   Bottom nav (.pf-bnav) scroll collapse, per CEO order:
   scrolling DOWN collapses the bar to just the Home (Feed) button;
   scrolling UP — or reaching the top — pops it back to full width.
   The panic button was removed site-wide in the same pass.

   No-ops on pages without .pf-bnav. Holds no state, sends nothing.
   ========================================================================== */
(function () {
  var nav = document.querySelector('.pf-bnav');
  if (!nav || nav.dataset.pfChrome) return;
  nav.dataset.pfChrome = '1';

  var home = nav.querySelector('a[data-p="/"]') || nav.querySelector('a[href="/"]');
  if (home) home.classList.add('pf-bnav-home');

  var lastY = window.scrollY || 0;
  var ticking = false;

  function apply() {
    ticking = false;
    var y = window.scrollY || 0;
    var dy = y - lastY;
    if (y <= 80) {
      nav.classList.remove('pf-collapsed');
    } else if (dy >= 5) {
      nav.classList.add('pf-collapsed');
    } else if (dy <= -5) {
      nav.classList.remove('pf-collapsed');
    }
    lastY = y;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  }, { passive: true });

  /* Keyboard / tap focus inside the bar always re-opens it. */
  nav.addEventListener('focusin', function () {
    nav.classList.remove('pf-collapsed');
  });
})();
