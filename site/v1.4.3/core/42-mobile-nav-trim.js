/* core/42-mobile-nav-trim.js  |  PF v1.4.3 | MOBILE NAV TRIM (2026-10-07).
   Homepage V3 "Unclunk" push (CEO directive 2026-10-07 ~11:33 CDT): cut
   Squarespace's mobile hamburger menu to 5 top-level items max — IN CODE,
   not a Squarespace hand-step.
   - Mobile viewports only: matchMedia('(max-width: 767px)'). Desktop nav
     is never touched (viewport change back to desktop restores all items).
   - Squarespace 7.1 mobile nav list selectors tried in order:
     .header-menu-nav-list > .header-menu-nav-item (folders count as one
     top-level item), then legacy fallbacks #mobileNav, .MobileNav,
     [data-nc-group="mobile"].
   - Keeps the FIRST 5 top-level items in DOM order, hides the rest via
     display:none. Never hardcodes item names (nav changes in the editor).
   - MutationObserver + short retry loop: Squarespace re-renders the menu
     when it opens, so the trim re-applies on DOM mutations.
   - No-JS fallback in core/42-mobile-nav-trim.css (:nth-child(n+6) under
     the same mobile media query).
   Double-run safe (window flag + marker attribute). No backend calls,
   no dependency on any other bundle. Never runs inside the editor.
   KILL: ?pf_off=42-mobile-nav-trim  or  localStorage pf_disabled_v1='["42-mobile-nav-trim"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('42-mobile-nav-trim')) { return; }
  if (window.pfMobileNavTrimDone) { return; }
  window.pfMobileNavTrimDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) { return true; }
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) { return true; }
      return false;
    } catch (e) { return false; }
  }
  if (isEditor()) { return; }

  var MAX_ITEMS = 5;
  var MARK = 'data-pf-navtrimmed';

  var MQ = '(max-width: 767px)';
  function isMobile() {
    try { return window.matchMedia(MQ).matches; }
    catch (e) { return false; } /* fail closed: no matchMedia, no trim */
  }

  /* Candidate top-level item collections, in priority order. Folders are
     single top-level items (the <li> wraps the folder toggle + sublist). */
  function findItemLists() {
    var lists = [];
    try {
      var l71 = document.querySelector('.header-menu-nav-list');
      if (l71) { lists.push(l71.querySelectorAll(':scope > .header-menu-nav-item')); }
      var legacy = document.querySelectorAll('#mobileNav, .MobileNav, [data-nc-group="mobile"]');
      for (var i = 0; i < legacy.length; i++) {
        var nav = legacy[i];
        /* direct list children, or the nav itself when items are direct */
        var items = nav.querySelectorAll(':scope > .header-menu-nav-item, :scope > .MobileNav-item, :scope > li, :scope > a');
        if (items && items.length) { lists.push(items); }
      }
    } catch (e) {}
    return lists;
  }

  function hide(el) {
    try {
      if (!el.hasAttribute(MARK)) {
        el.setAttribute(MARK, '1');
        el.style.display = 'none';
      }
    } catch (e) {}
  }

  function restore(el) {
    try {
      if (el.hasAttribute(MARK)) {
        el.removeAttribute(MARK);
        el.style.display = '';
      }
    } catch (e) {}
  }

  function trim() {
    if (!isMobile()) { return false; }
    var lists = findItemLists();
    if (!lists.length) { return false; }
    var found = false;
    lists.forEach(function (items) {
      for (var i = 0; i < items.length; i++) {
        found = true;
        if (i < MAX_ITEMS) { restore(items[i]); }
        else { hide(items[i]); }
      }
    });
    return found;
  }

  function restoreAll() {
    var els;
    try { els = document.querySelectorAll('[' + MARK + ']'); } catch (e) { return; }
    for (var i = 0; i < els.length; i++) { restore(els[i]); }
  }

  /* ---- boot ---- */
  function boot() {
    try { trim(); } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Squarespace renders the mobile menu late (and re-renders on open):
     retry for ~30s, then let the observer carry it. */
  var tries = 0;
  var iv = setInterval(function () {
    try {
      if (trim()) { tries++; }
      else { tries++; }
      if (tries >= 30) { clearInterval(iv); }
    } catch (e) {}
  }, 1000);

  /* Viewport crossing: desktop restores everything; mobile re-trims. */
  try {
    var mql = window.matchMedia(MQ);
    var onChange = function () {
      try {
        if (isMobile()) { trim(); } else { restoreAll(); }
      } catch (e) {}
    };
    if (typeof mql.addEventListener === 'function') { mql.addEventListener('change', onChange); }
    else if (typeof mql.addListener === 'function') { mql.addListener(onChange); }
  } catch (e) {}

  /* Menu re-render guard (debounced). */
  var pending = false;
  try {
    var obs = new MutationObserver(function () {
      if (pending) { return; }
      pending = true;
      setTimeout(function () {
        pending = false;
        try { if (isMobile()) { trim(); } } catch (e) {}
      }, 150);
    });
    var watch = function () {
      try { if (document.body) { obs.observe(document.body, { childList: true, subtree: true }); } } catch (e) {}
    };
    if (document.body) { watch(); }
    else { document.addEventListener('DOMContentLoaded', watch); }
  } catch (e) {}
})();
