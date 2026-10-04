/* ============================================================================
   SILO: fixes/article-visibility.js  |  PF v1.1.0
   WHAT: Article visibility guard for legacy article pages (/privacy, /terms)
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=article-visibility  or  localStorage pf_disabled_v1='["article-visibility"]'
   ============================================================================ */
/* DEFECT 2 (2026-10-03): a live crawl found /privacy and /terms painting
   visually BLANK (nav header only) even though the article content is fully
   present in the DOM and the accessibility tree. Code review of the entire
   v1.1.0 set found no silo that hides article content (all CSS is
   widget-scoped; no DOM rewrites touch article), so the blank comes from a
   computed-style failure mode on the article subtree — the exact modes that
   keep nodes in the accessibility tree while painting nothing: opacity:0,
   visibility:hidden, zero-height clipping, clip-path, font-size:0, or a fully
   transparent inline text color.
   This guard re-asserts visibility on the article container, its ancestors
   (up to <body>), and its text — idempotently, and it ONLY EVER RESTORES
   visibility; it never hides anything. On a healthy page every check passes
   and it is a complete no-op. Never runs in the Squarespace editor. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('article-visibility')) { return; }
  if (window.top !== window.self) { return; }
  if (/\/config\//.test(location.href)) { return; }
  try {
    if (document.body && (document.body.classList.contains('sqs-edit-mode') ||
        document.body.classList.contains('sqs-editing'))) { return; }
  } catch (e) {}

  function cs(el) {
    try { return window.getComputedStyle(el); } catch (e) { return null; }
  }
  function setImp(el, prop, val) {
    try { el.style.setProperty(prop, val, 'important'); } catch (e) {}
  }
  function clearProps(el, props) {
    for (var i = 0; i < props.length; i++) {
      try { el.style.removeProperty(props[i]); } catch (e) {}
    }
  }

  /* Repair the article host and every ancestor up to <body>. These elements
     are block-level page structure; restoring block/visible/opacity-1 on
     them cannot break widget layout (widgets live in their own subtrees). */
  function fixChain(el) {
    var fixed = 0;
    while (el && el !== document.body && el.nodeType === 1) {
      var c = cs(el);
      if (!c) { el = el.parentElement; continue; }
      var hasText = (el.textContent || '').trim().length > 0;
      if (c.opacity === '0' || c.opacity === '0.0') { setImp(el, 'opacity', '1'); fixed++; }
      if (c.visibility === 'hidden' || c.visibility === 'collapse') { setImp(el, 'visibility', 'visible'); fixed++; }
      if (c.display === 'none') { setImp(el, 'display', 'block'); fixed++; }
      if (c.fontSize === '0px' || c.fontSize === '0') { setImp(el, 'font-size', '16px'); fixed++; }
      /* Zero-height clipping: content exists (scrollHeight > 0) but the box
         paints nothing. Clear the constraints, don't guess a size. */
      var h0 = (c.height === '0px' || c.maxHeight === '0px');
      var clipped = (c.overflow === 'hidden' || c.overflowX === 'hidden' || c.overflowY === 'hidden');
      if (hasText && h0 && clipped) {
        try {
          var sh = el.scrollHeight || 0;
          if (sh > 0) {
            setImp(el, 'height', 'auto'); setImp(el, 'max-height', 'none');
            setImp(el, 'overflow', 'visible'); fixed++;
          }
        } catch (e2) {}
      }
      /* Full clip-path / legacy clip rectangle. */
      try {
        var cp = c.clipPath || c.webkitClipPath || '';
        if (cp && cp !== 'none' && /inset\(\s*100%/.test(cp)) { setImp(el, 'clip-path', 'none'); fixed++; }
        var clip = c.clip || '';
        if (clip && /rect\(\s*0/.test(clip)) { setImp(el, 'clip', 'auto'); fixed++; }
      } catch (e3) {}
      el = el.parentElement;
    }
    return fixed;
  }

  /* Transparent INLINE text color inside the article is unambiguously an
     accident (stylesheet-level transparency is left alone as intentional
     design). Removing the inline declaration falls back to the cascade. */
  function transparentInline(el) {
    var v = '';
    try { v = el.style.getPropertyValue('color') || ''; } catch (e) { return false; }
    if (!v) { return false; }
    /* rgba()/hsla() with alpha 0, or the keyword 'transparent'. */
    if (/^transparent$/i.test(v.trim())) { return true; }
    var m = v.replace(/\s+/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
    var m2 = v.replace(/\s+/g, '').match(/^hsla?\(\d+,\d+%?,\d+%?,([\d.]+)\)$/i);
    if (m2 && parseFloat(m2[1]) === 0) { return true; }
    return false;
  }
  function fixText(host) {
    var fixed = 0, els = null;
    try { els = host.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,span,div,a,strong,em'); } catch (e) { return 0; }
    for (var i = 0; i < els.length; i++) {
      if (transparentInline(els[i])) {
        try { els[i].style.removeProperty('color'); fixed++; } catch (e2) {}
      }
    }
    return fixed;
  }

  /* Off-screen inline positioning on the host itself (e.g. left:-9999px as
     an inline style). Stylesheet-driven positioning is left untouched. */
  function fixOffscreen(host) {
    try {
      var r = host.getBoundingClientRect();
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      var off = (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh);
      if (!off) { return 0; }
      var st = host.style;
      var px = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
      if (px(st.left) < -vw || px(st.top) < -vh || px(st.marginLeft) < -vw) {
        clearProps(host, ['left', 'top', 'margin-left', 'margin-top', 'transform']);
        return 1;
      }
    } catch (e) {}
    return 0;
  }

  function run() {
    var host = null;
    try { host = document.querySelector('main article') || document.querySelector('article'); } catch (e) {}
    if (!host) { return; }
    var n = 0;
    try { n += fixChain(host); } catch (e) {}
    try { n += fixText(host); } catch (e2) {}
    try { n += fixOffscreen(host); } catch (e3) {}
    if (n > 0 && PF && PF.log) { PF.log('article-visibility', 'restored visibility on ' + n + ' node(s) @ ' + location.pathname); }
  }

  function init() {
    try { run(); } catch (e) {}
    /* Multi-pass: late-enhancing scripts/styles can re-break visibility
       after first paint; re-assert a few times, then stop. */
    setTimeout(run, 1500);
    setTimeout(run, 4000);
    setTimeout(run, 9000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
