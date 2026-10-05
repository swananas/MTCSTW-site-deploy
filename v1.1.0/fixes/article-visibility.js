/* ============================================================================
   SILO: fixes/article-visibility.js  |  PF v1.1.0
   WHAT: Content visibility guard for legacy Squarespace pages (/privacy, /terms)
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=article-visibility  or  localStorage pf_disabled_v1='["article-visibility"]'
   ============================================================================ */
/* DEFECT 2 (2026-10-03): a live crawl found /privacy and /terms painting
   visually BLANK (nav header only) even though the content is fully present
   in the DOM and the accessibility tree.
   ROOT CAUSE (2026-10-04): /privacy and /terms are regular Squarespace 7.1
   PAGES (collection typeName "page", verified via ?format=json) — they render
   content in <section> blocks inside <main>, with NO <article> element. The
   v1 guard resolved its host with `main article || article`, which NEVER
   matches on these pages, so it hit `if (!host) return;` and repaired
   NOTHING — a silent no-op. The "fine at c96e8ed" sighting was the
   intermittent good state, not the guard working: served PF bytes on these
   pages are byte-identical between the c96e8ed and c10b02c pins (the V1 file
   set, the CSS, and the footer-chrome bundle all md5-match the local tree),
   so no release delta could have caused the recurrence.
   This rewrite:
   - resolves the REAL content host with a fallback chain (article -> main ->
     #page -> body) and NEVER silently no-ops: if no host resolves it logs a
     loud PF error naming the pathname, so a future breakage is visible;
   - repairs a wider set of invisible-but-in-DOM failure modes: opacity ~0,
     visibility hidden/collapse, display none, content-visibility hidden,
     font-size 0, zero/tiny-height clipping, full clip-path / legacy clip,
     scale(0) transforms, opacity(0) filters, off-screen positioning from ANY
     source (stylesheet or inline), transparent inline text color;
   - re-asserts via MutationObserver (event-driven) instead of relying on
     fixed timeouts, so a late-hiding script can never win the race;
   - repairs the FULL ancestor chain INCLUDING body and html (the v1 loop
     stopped before body);
   - stays restore-only and idempotent: it ONLY EVER RESTORES visibility,
     never hides anything. On a healthy page every check passes and it is a
     complete no-op. Never runs in the Squarespace editor.
   HOTFIX 2026-10-04 (worker 1): descendant blind spot. The rewrite above
   repairs the resolved host (article#page-regions) and everything ABOVE it
   (main, body, html) — but on Squarespace 7.1 pages the text lives several
   levels BELOW the host:
     article#page-regions > section.region > section.page-section >
     .content-wrapper > .fluid-engine > .fe-block > .sqs-block >
     .sqs-block-content > text
   /privacy's failure happened to be at/above the host, so the rewrite fixed
   it; /terms' invisibility originates BELOW the host, on that content spine,
   which the guard never inspected — the page stayed blank with the full text
   in the DOM. Fix: a broken-state-gated descendant repair pass. When text is
   in the DOM but nothing paints (host zero-area, or a text-bearing content
   container computing invisible/zero-area), the same restore-only repairs
   are applied down the host's descendant tree. Gated + throttled so healthy
   pages never pay for it and never see a repair. */
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

  /* Squarespace 7.1 page markup: content lives in <section> blocks inside
     <main id="page">. Blog items use <article>; regular pages do NOT.
     Resolve the deepest sensible host first, fall back outward. */
  var HOST_SELECTORS = [
    'main article',
    'article',
    'main',
    '#page',
    '.page-content',
    'body'
  ];

  function resolveHost() {
    for (var i = 0; i < HOST_SELECTORS.length; i++) {
      var el = null;
      try { el = document.querySelector(HOST_SELECTORS[i]); } catch (e) {}
      if (el) { return el; }
    }
    return null;
  }

  function cs(el) {
    try { return window.getComputedStyle(el); } catch (e) { return null; }
  }
  function setImp(el, prop, val) {
    try { el.style.setProperty(prop, val, 'important'); } catch (e) {}
  }

  function hasText(el) {
    try { return (el.textContent || '').trim().length > 0; } catch (e) { return false; }
  }

  function rectArea(el) {
    try {
      var r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, r: r };
    } catch (e) { return null; }
  }

  /* Standard gradient-text technique (background-clip:text +
     -webkit-text-fill-color:transparent) is legitimate design, not
     brokenness: the background gradient paints the glyphs. Exempt such
     elements from paint-level detection AND repair so the guard never
     "fixes" intentional gradient text.

     SUBTREE-AWARE (fixup round 2): -webkit-text-fill-color and color
     INHERIT, but background-clip does NOT. A descendant of a gradient-text
     element therefore computes transparent fill with
     background-clip:border-box — element-local detection would miss the
     exemption and "repair" the intentional design (false positive
     cascade). So check the element itself AND walk up to 8 ancestors for
     background-clip:text / -webkit-background-clip:text; a hit on ANY
     node in the chain exempts the element. */
  function isGradientText(el) {
    try {
      var depth = 0, node = el;
      while (node && node.nodeType === 1 && depth <= 8) {
        var c = cs(node);
        if (c && (c.backgroundClip === 'text' || c.webkitBackgroundClip === 'text')) { return true; }
        node = node.parentElement;
        depth++;
      }
    } catch (e) {}
    return false;
  }

  /* Repair one element in the content chain. Returns the number of repairs
     applied. Every repair is restore-only. */
  function fixEl(el, isHost) {
    var fixed = 0;
    var c = cs(el);
    if (!c) { return 0; }
    var text = hasText(el);

    var op = parseFloat(c.opacity);
    if (!isNaN(op) && op < 0.01) { setImp(el, 'opacity', '1'); fixed++; }
    if (c.visibility === 'hidden' || c.visibility === 'collapse') {
      setImp(el, 'visibility', 'visible'); fixed++;
    }
    if (c.display === 'none') { setImp(el, 'display', 'block'); fixed++; }
    try {
      if ((c.contentVisibility === 'hidden' || c.contentVisibility === 'auto') && text) {
        var a = rectArea(el);
        if (a && a.w === 0 && a.h === 0) { setImp(el, 'content-visibility', 'visible'); fixed++; }
      }
    } catch (e) {}
    /* font-size:0 kills text rendering; repair on the host itself AND on leaf
       text carriers (no children, holds text). Ancestors that use
       font-size:0 for whitespace collapsing keep their exemption. */
    if ((c.fontSize === '0px' || c.fontSize === '0') &&
        (isHost || (el.children && el.children.length === 0 && text))) {
      setImp(el, 'font-size', '16px'); fixed++;
    }
    /* Zero/tiny-height clipping: content exists (scrollHeight > 0) but the
       box paints nothing. Clear the constraints, don't guess a size. */
    try {
      var h = parseFloat(c.height), mh = parseFloat(c.maxHeight);
      var clipped = (c.overflow === 'hidden' || c.overflowX === 'hidden' || c.overflowY === 'hidden');
      if (text && clipped && (( !isNaN(h) && h < 4) || (!isNaN(mh) && mh < 4))) {
        if ((el.scrollHeight || 0) > 0) {
          setImp(el, 'height', 'auto'); setImp(el, 'max-height', 'none');
          setImp(el, 'overflow', 'visible'); fixed++;
        }
      }
    } catch (e2) {}
    /* Full clip-path / legacy clip rectangle. */
    try {
      var cp = c.clipPath || c.webkitClipPath || '';
      if (cp && cp !== 'none' && /inset\(\s*100%/.test(cp)) { setImp(el, 'clip-path', 'none'); fixed++; }
      var clip = c.clip || '';
      if (clip && clip !== 'auto' && /rect\(\s*0/.test(clip)) { setImp(el, 'clip', 'auto'); fixed++; }
    } catch (e3) {}
    /* scale(0) transform or opacity(0)/brightness(0)/contrast(0) filter:
       paints nothing, stays in DOM. brightness(0)/contrast(0) render text
       as solid black — invisible on the site's dark sections — while the
       element keeps area and computed "visible", so the old opacity-only
       regex missed them entirely. */
    try {
      var t = c.transform || '';
      if (t && t !== 'none' && (/^matrix\(0,/.test(t) || /^matrix3d\(0,/.test(t))) {
        setImp(el, 'transform', 'none'); fixed++;
      }
      var f = c.filter || '';
      /* True-zero anchoring: brightness(0)/contrast(0)/opacity(0) only.
         brightness(0.5) etc. are legitimate dimming, never repair them. */
      if (f && f !== 'none' && /(opacity|brightness|contrast)\(\s*0(\.0+)?\s*\)/.test(f)) {
        setImp(el, 'filter', 'none'); fixed++;
      }
      /* -webkit-text-fill-color: transparent paints no glyphs while keeping
         the box AND the accessibility tree intact — the classic "text in DOM,
         selectable, but paints nothing" mechanism. Restore the cascade's
         real text color via inherit (restore-only). Gradient text
         (background-clip:text) is exempt: the background paints the
         glyphs, so transparent fill is the design, not breakage. */
      var tfc = String(c.webkitTextFillColor || '').replace(/\s+/g, '');
      var tfcZero = /^transparent$/i.test(tfc);
      if (!tfcZero) {
        var tfcm = tfc.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
        if (tfcm && tfcm[4] !== undefined && parseFloat(tfcm[4]) === 0) { tfcZero = true; }
      }
      if (tfcZero && !isGradientText(el)) { setImp(el, '-webkit-text-fill-color', 'inherit'); fixed++; }
    } catch (e4) {}
    return fixed;
  }

  /* Transparent INLINE text color inside the content host is unambiguously an
     accident — removing the inline declaration falls back to the cascade.
     Stylesheet-level transparency is repaired too (by the computed-color
     loop in fixText), but ONLY when the gate sees the content as actually
     broken; on a healthy page intentional design transparency is left
     alone. */
  function transparentInline(el) {
    var v = '';
    try { v = el.style.getPropertyValue('color') || ''; } catch (e) { return false; }
    if (!v) { return false; }
    if (/^transparent$/i.test(v.trim())) { return true; }
    var m = v.replace(/\s+/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
    var m2 = v.replace(/\s+/g, '').match(/^hsla?\(\d+,\d+%?,\d+%?,([\d.]+)\)$/i);
    if (m2 && parseFloat(m2[1]) === 0) { return true; }
    return false;
  }
  function fixText(host) {
    var fixed = 0, els = null, i = 0;
    try { els = host.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,span,div,a,strong,em'); } catch (e) { return 0; }
    /* Cap the scan so a body-level host can't turn this into a long walk. */
    var n = Math.min(els.length, 3000);
    for (i = 0; i < n; i++) {
      /* Honor the gradient-text exemption here too: stripping inline
         color:transparent from a gradient-text element (or one of its
         descendants, which inherit the transparent fill) would set the
         glyph fill back to a solid inherited color over the clipped
         background and destroy the intentional design. */
      if (transparentInline(els[i]) && !isGradientText(els[i])) {
        try { els[i].style.removeProperty('color'); fixed++; } catch (e2) {}
      }
    }
    /* Computed-color repair: stylesheet-sourced transparent text that
       inline-stripping can't reach. For elements whose COMPUTED color alpha
       is 0, pin the nearest opaque ancestor's computed color !important;
       if no opaque ancestor exists, fall back to the body computed color.
       Gated on contentBroken() so healthy pages (where transparency is
       intentional design) never pay for the scan and never see a repair.
       Gradient-text subtrees are exempt: transparent computed color is the
       design there (the background paints the glyphs), and pinning an
       opaque color !important would overwrite the transparent fill —
       a false-positive cascade. */
    try {
      if (contentBroken(host)) {
        for (i = 0; i < n; i++) {
          try {
            var col = computedColor(els[i]);
            if (col && colorAlpha0(col) && !isGradientText(els[i])) {
              var oc = nearestOpaqueColor(els[i]);
              if (oc) { setImp(els[i], 'color', oc); fixed++; }
            }
          } catch (e3) {}
        }
      }
    } catch (e4) {}
    return fixed;
  }

  /* ---- computed-color helpers (Fix C) ---- */
  function computedColor(el) {
    try {
      var c = window.getComputedStyle(el);
      return String((c && c.color) || '').replace(/\s+/g, '');
    } catch (e) { return ''; }
  }
  function colorAlpha0(col) {
    if (/^transparent$/i.test(col)) { return true; }
    var m = col.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
    return false;
  }
  /* Nearest ancestor (walking outward from the element's parent) whose
     computed color has non-zero alpha. Falls back to the body computed
     color when nothing opaque exists in the chain. */
  function nearestOpaqueColor(el) {
    var p = null, guard = 0, col = '';
    try { p = el.parentElement; } catch (e) { p = null; }
    while (p && p.nodeType === 1 && guard < 32) {
      col = computedColor(p);
      if (col && !colorAlpha0(col)) { return col; }
      p = p.parentElement;
      guard++;
    }
    try { return computedColor(document.body); } catch (e2) { return ''; }
  }

  /* Off-screen positioning from ANY source (stylesheet or inline): if the
     content host's box is fully outside the viewport but it holds text,
     neutralize the positioning. */
  function fixOffscreen(host) {
    try {
      if (!hasText(host)) { return 0; }
      var r = host.getBoundingClientRect();
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      var off = (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh);
      if (!off) { return 0; }
      setImp(host, 'position', 'static');
      setImp(host, 'transform', 'none');
      setImp(host, 'margin', '0');
      setImp(host, 'left', 'auto');
      setImp(host, 'top', 'auto');
      return 1;
    } catch (e) { return 0; }
  }

  /* Full ancestor chain INCLUDING body and html. */
  function chain(host) {
    var els = [], el = host, guard = 0;
    while (el && el.nodeType === 1 && guard < 32) {
      els.push(el);
      if (el === document.documentElement) { break; }
      el = el.parentElement;
      guard++;
    }
    return els;
  }

  function snapshot(el) {
    var c = cs(el);
    if (!c) { return '?'; }
    return 'opacity=' + c.opacity + ' visibility=' + c.visibility +
      ' display=' + c.display + ' height=' + c.height +
      ' overflow=' + c.overflow + ' transform=' + c.transform +
      ' contentVisibility=' + (c.contentVisibility || '?') +
      ' color=' + c.color +
      ' webkitTextFillColor=' + (c.webkitTextFillColor || '?') +
      ' filter=' + c.filter +
      ' mixBlendMode=' + (c.mixBlendMode || '?');
  }

  /* ---- Descendant blind-spot repair (hotfix 2026-10-04) ---- */

  /* Computed-invisible regardless of layout area (an opacity:0 or
     visibility:hidden container keeps its box, so zero-area alone is not
     a sufficient broken-state signal). */
  function elInvisible(el) {
    var c = cs(el);
    if (!c) { return false; }
    var op = parseFloat(c.opacity);
    if (!isNaN(op) && op < 0.01) { return true; }
    if (c.visibility === 'hidden' || c.visibility === 'collapse') { return true; }
    if (c.display === 'none') { return true; }
    return false;
  }

  /* Paint-level invisibility: computed text color with zero alpha (from ANY
     source, not just inline), transparent -webkit-text-fill-color, or a
     filter that renders glyphs as solid black (brightness(0)/contrast(0) —
     invisible on the site's dark sections). The gate previously only saw
     box-level brokenness (opacity/visibility/display/zero-area); paint-level
     hiding never triggered it, so the descendant repair pass never ran. */
  function textPaintBroken(el) {
    var c = cs(el);
    if (!c) { return false; }
    /* Gradient text (background-clip:text) paints its glyphs from the
       background — color/tfc transparency is the design, not breakage.
       The filter check still applies: brightness(0) on gradient text
       paints nothing genuinely. */
    if (!isGradientText(el)) {
      var col = String(c.color || '').replace(/\s+/g, '');
      if (/^transparent$/i.test(col)) { return true; }
      var m = col.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
      if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
      var tfc = String(c.webkitTextFillColor || '').replace(/\s+/g, '');
      if (/^transparent$/i.test(tfc)) { return true; }
      var m2 = tfc.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
      if (m2 && m2[4] !== undefined && parseFloat(m2[4]) === 0) { return true; }
    }
    var f = c.filter || '';
    /* True-zero anchoring: brightness(0.5) is legitimate dimming. */
    if (f && f !== 'none' && /(brightness|contrast)\(\s*0(\.0+)?\s*\)/.test(f)) { return true; }
    return false;
  }

  /* A content container is broken when it holds text but paints nothing:
     computed invisible, paint-level invisible, or zero painted area. */
  function containerBroken(el) {
    try {
      if (!hasText(el)) { return false; }
      if (elInvisible(el)) { return true; }
      if (textPaintBroken(el)) { return true; }
      var a = rectArea(el);
      return !!(a && a.w === 0 && a.h === 0);
    } catch (e) { return false; }
  }

  /* The Squarespace 7.1 content spine between the resolved host and the
     text. Any of these levels can be the invisible parent the ancestor
     pass never sees. */
  var SPINE_SELECTORS =
    'section[data-test="page-section"], section.region, ' +
    '.content-wrapper, .fluid-engine, .fe-block, .sqs-block, .sqs-block-content';

  function contentBroken(host) {
    try {
      if (!hasText(host)) { return false; }
      var a = rectArea(host);
      if (a && a.w === 0 && a.h === 0) { return true; }
      var cands = null;
      try { cands = host.querySelectorAll(SPINE_SELECTORS); } catch (e) { return false; }
      for (var i = 0; i < cands.length; i++) {
        if (containerBroken(cands[i])) { return true; }
      }
    } catch (e2) {}
    return false;
  }

  var lastDeepAt = 0;
  function fixDescendants(host) {
    var now = Date.now();
    if (now - lastDeepAt < 5000) { return 0; }
    lastDeepAt = now;
    var n = 0, els = null, i;
    try { els = host.getElementsByTagName('*'); } catch (e) { return 0; }
    /* Cap the walk; repairs are restore-only so a partial walk on a huge
       page can only under-repair, never harm. */
    var count = Math.min(els.length, 1500);
    for (i = 0; i < count; i++) {
      try { n += fixEl(els[i], false); } catch (e2) {}
    }
    /* Off-screen content containers paint nothing even when "visible":
       neutralize the worst offenders back into flow. */
    var spine = null;
    try { spine = host.querySelectorAll(SPINE_SELECTORS); } catch (e3) { spine = null; }
    if (spine) {
      for (i = 0; i < spine.length; i++) {
        try { n += fixOffscreen(spine[i]); } catch (e4) {}
      }
    }
    return n;
  }

  var lastLogAt = 0;
  function run() {
    var host = resolveHost();
    if (!host) {
      /* LOUD failure: never silently no-op again. */
      try { PF.error('article-visibility', 'no content host resolved on ' + location.pathname); } catch (e) {}
      return;
    }
    var els = chain(host);
    var n = 0, i;
    for (i = 0; i < els.length; i++) {
      try { n += fixEl(els[i], els[i] === host); } catch (e) {}
    }
    try { n += fixText(host); } catch (e2) {}
    try { n += fixOffscreen(host); } catch (e3) {}
    var now = Date.now();
    if (n > 0 && PF && PF.log && now - lastLogAt > 10000) {
      lastLogAt = now;
      PF.log('article-visibility', 'restored visibility (' + n + ' repair(s)) @ ' + location.pathname);
    }
    /* Descendant blind-spot repair: if the content is still broken after
       the ancestor pass, the culprit is BELOW the host — walk down the
       content spine and repair there too. */
    try {
      if (contentBroken(host)) {
        var dn = fixDescendants(host);
        n += dn;
        if (dn > 0 && PF && PF.log && now - lastLogAt > 10000) {
          lastLogAt = now;
          PF.log('article-visibility',
            'descendant repair (' + dn + ' repair(s)) @ ' + location.pathname);
        }
      }
    } catch (e5) {}
    /* Diagnostic: content exists but still paints nothing — report the
       computed snapshot so the next incident arrives with data. */
    try {
      var a = rectArea(host);
      if (a && a.w === 0 && a.h === 0 && hasText(host) && now - lastLogAt > 10000) {
        lastLogAt = now;
        PF.error('article-visibility',
          'host still zero-area after repair @ ' + location.pathname + ' :: ' + snapshot(host));
      }
    } catch (e4) {}
    try {
      if (contentBroken(host) && now - lastLogAt > 10000) {
        lastLogAt = now;
        PF.error('article-visibility',
          'content still broken after descendant repair @ ' + location.pathname +
          ' :: ' + snapshot(host));
      }
    } catch (e6) {}
  }

  /* Event-driven re-repair: any style/class/DOM mutation re-arms the guard
     (debounced), so a late-hiding script can never win the race. This is the
     mechanism — the fixed timeouts below are only a backstop. */
  var dirty = false, scheduled = false;
  function schedule() {
    if (scheduled) { return; }
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      if (!dirty) { return; }
      dirty = false;
      try { run(); } catch (e) {}
    }, 400);
  }
  function init() {
    try { run(); } catch (e) {}
    /* Backstop passes in case the observer misses anything. */
    setTimeout(run, 2000);
    setTimeout(run, 8000);
    setTimeout(run, 20000);
    try {
      if (window.MutationObserver && document.documentElement) {
        var obs = new window.MutationObserver(function () { dirty = true; schedule(); });
        obs.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          childList: true,
          subtree: true
        });
      }
    } catch (e2) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
