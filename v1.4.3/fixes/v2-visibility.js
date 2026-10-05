/* ============================================================================
   FIX: fixes/v2-visibility.js  |  PF v1.4.3
   WHAT: Slim visibility guard for V2 pages (homepage #pf-v2, the 9 section
   pages, /political-hq, SLR roster/catalog, Creator HQ). Ports the
   paint-level detection + repair of v1.1.0/fixes/article-visibility.js
   (P0 Branch 1 fix): transparent computed text color, transparent
   -webkit-text-fill-color, brightness(0)/contrast(0) filters, font-size:0
   on leaf carriers.
   WHY: V2 pages load ZERO visibility-guard code — the V1 set (which carries
   article-visibility.js) never runs on them. The DELETE MY DATA footer-link
   failure on the homepage had nothing to repair it.
   Restore-only + idempotent: it ONLY EVER RESTORES visibility, never hides
   anything. On a healthy page every check passes and it is a no-op. Never
   runs in the Squarespace editor.
   KILL: ?pf_off=article-visibility  or  localStorage pf_disabled_v1='["article-visibility"]'
   (same silo name as the V1 guard — one switch kills both)
   ============================================================================ */
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

  /* V2 mount registry (mirrors page-mount.js FE_MOUNT_IDS) + injected chrome
     roots. Any id absent from the page is simply skipped. */
  var ROOT_IDS = [
    'pf-v2', 'pf-cells-page', 'pf-cell-hq', 'pf-arcade', 'pf-create',
    'pf-bank', 'pf-economy', 'pf-warchest', 'pf-ventures', 'pf-events',
    'pf-warreport', 'pf-war-card', 'pf-academy-hq', 'pf-dash-hq',
    'pf-political-hq', 'pf-slr-roster', 'pf-catalog',
    /* Injected footer chrome (16-footer.js): the DELETE MY DATA link is the
       exact failure this file exists to repair. */
    'pf-delete-data-link'
  ];
  var CHROME_SELECTORS = 'footer, .pf-crossnav';

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
      return { w: r.width, h: r.height };
    } catch (e) { return null; }
  }

  /* Repair one element. Returns the number of repairs applied.
     Every repair is restore-only. */
  function fixEl(el, isRoot) {
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
    /* font-size:0 kills text rendering; repair on roots AND leaf text
       carriers (no children, holds text). Whitespace-collapse containers
       keep their exemption. */
    if ((c.fontSize === '0px' || c.fontSize === '0') &&
        (isRoot || (el.children && el.children.length === 0 && text))) {
      setImp(el, 'font-size', '16px'); fixed++;
    }
    /* Zero/tiny-height clipping: content exists but the box paints nothing. */
    try {
      var h = parseFloat(c.height), mh = parseFloat(c.maxHeight);
      var clipped = (c.overflow === 'hidden' || c.overflowX === 'hidden' || c.overflowY === 'hidden');
      if (text && clipped && ((!isNaN(h) && h < 4) || (!isNaN(mh) && mh < 4))) {
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
    /* scale(0) transform; opacity(0)/brightness(0)/contrast(0) filters.
       brightness(0)/contrast(0) paint text as solid black — invisible on the
       site's dark sections — while the element keeps area and computed
       "visible". */
    try {
      var t = c.transform || '';
      if (t && t !== 'none' && (/^matrix\(0,/.test(t) || /^matrix3d\(0,/.test(t))) {
        setImp(el, 'transform', 'none'); fixed++;
      }
      var f = c.filter || '';
      if (f && f !== 'none' && /(opacity|brightness|contrast)\(\s*0/.test(f)) {
        setImp(el, 'filter', 'none'); fixed++;
      }
      /* -webkit-text-fill-color: transparent paints no glyphs while keeping
         the box AND the accessibility tree intact. Restore the cascade's
         real text color via inherit (restore-only). */
      var tfc = String(c.webkitTextFillColor || '').replace(/\s+/g, '');
      var tfcZero = /^transparent$/i.test(tfc);
      if (!tfcZero) {
        var tfcm = tfc.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
        if (tfcm && tfcm[4] !== undefined && parseFloat(tfcm[4]) === 0) { tfcZero = true; }
      }
      if (tfcZero) { setImp(el, '-webkit-text-fill-color', 'inherit'); fixed++; }
    } catch (e4) {}
    return fixed;
  }

  /* Transparent INLINE text color is unambiguously an accident — strip it so
     the cascade applies. */
  function transparentInline(el) {
    var v = '';
    try { v = el.style.getPropertyValue('color') || ''; } catch (e) { return false; }
    if (!v) { return false; }
    if (/^transparent$/i.test(v.trim())) { return true; }
    var m = v.replace(/\s+/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
    return false;
  }
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
  /* Nearest ancestor with a non-zero-alpha computed color; falls back to the
     body computed color when nothing opaque exists in the chain. */
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
  function fixText(root, gated) {
    var fixed = 0, els = null, i = 0;
    try { els = root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,span,div,a,strong,em,button'); } catch (e) { return 0; }
    var n = Math.min(els.length, 3000);
    for (i = 0; i < n; i++) {
      if (transparentInline(els[i])) {
        try { els[i].style.removeProperty('color'); fixed++; } catch (e2) {}
      }
    }
    /* Computed-color repair (stylesheet-sourced transparency): only when the
       gate says this root is actually broken — on a healthy page intentional
       design transparency is left alone. */
    if (gated) {
      for (i = 0; i < n; i++) {
        try {
          var col = computedColor(els[i]);
          if (col && colorAlpha0(col)) {
            var oc = nearestOpaqueColor(els[i]);
            if (oc) { setImp(els[i], 'color', oc); fixed++; }
          }
        } catch (e3) {}
      }
    }
    return fixed;
  }

  /* Off-screen positioning from ANY source: root box fully outside the
     viewport but holds text → neutralize back into flow. */
  function fixOffscreen(root) {
    try {
      if (!hasText(root)) { return 0; }
      var r = root.getBoundingClientRect();
      var vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      if (!(r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh)) { return 0; }
      setImp(root, 'position', 'static');
      setImp(root, 'transform', 'none');
      setImp(root, 'margin', '0');
      setImp(root, 'left', 'auto');
      setImp(root, 'top', 'auto');
      return 1;
    } catch (e) { return 0; }
  }

  /* Full ancestor chain INCLUDING body and html. */
  function chain(root) {
    var els = [], el = root, guard = 0;
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

  /* ---- broken-state detection (paint-level aware) ---- */

  function elInvisible(el) {
    var c = cs(el);
    if (!c) { return false; }
    var op = parseFloat(c.opacity);
    if (!isNaN(op) && op < 0.01) { return true; }
    if (c.visibility === 'hidden' || c.visibility === 'collapse') { return true; }
    if (c.display === 'none') { return true; }
    return false;
  }

  /* Paint-level invisibility: computed text color with zero alpha (any
     source), transparent -webkit-text-fill-color, or a filter that renders
     glyphs as solid black. */
  function textPaintBroken(el) {
    var c = cs(el);
    if (!c) { return false; }
    var col = String(c.color || '').replace(/\s+/g, '');
    if (/^transparent$/i.test(col)) { return true; }
    var m = col.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m && m[4] !== undefined && parseFloat(m[4]) === 0) { return true; }
    var tfc = String(c.webkitTextFillColor || '').replace(/\s+/g, '');
    if (/^transparent$/i.test(tfc)) { return true; }
    var m2 = tfc.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
    if (m2 && m2[4] !== undefined && parseFloat(m2[4]) === 0) { return true; }
    var f = c.filter || '';
    if (f && f !== 'none' && /(brightness|contrast)\(\s*0/.test(f)) { return true; }
    return false;
  }

  function containerBroken(el) {
    try {
      if (!hasText(el)) { return false; }
      if (elInvisible(el)) { return true; }
      if (textPaintBroken(el)) { return true; }
      var a = rectArea(el);
      return !!(a && a.w === 0 && a.h === 0);
    } catch (e) { return false; }
  }

  /* V2 content containers: widget shells plus Squarespace blocks (the footer
     chrome and hero live in the latter). */
  var SPINE_SELECTORS = '.pf-silo, .pf-v2-game, .pf-card, .sqs-block, .sqs-block-content';

  function contentBroken(root) {
    try {
      if (!hasText(root)) { return false; }
      var a = rectArea(root);
      if (a && a.w === 0 && a.h === 0) { return true; }
      var cands = null;
      try { cands = root.querySelectorAll(SPINE_SELECTORS); } catch (e) { return false; }
      for (var i = 0; i < cands.length; i++) {
        if (containerBroken(cands[i])) { return true; }
      }
    } catch (e2) {}
    return false;
  }

  var lastDeepAt = 0;
  function fixDescendants(root) {
    var now = Date.now();
    if (now - lastDeepAt < 5000) { return 0; }
    lastDeepAt = now;
    var n = 0, els = null, i;
    try { els = root.getElementsByTagName('*'); } catch (e) { return 0; }
    /* Cap the walk; repairs are restore-only so a partial walk on a huge
       page can only under-repair, never harm. */
    var count = Math.min(els.length, 1500);
    for (i = 0; i < count; i++) {
      try { n += fixEl(els[i], false); } catch (e2) {}
    }
    return n;
  }

  function resolveRoots() {
    var roots = [], i, el;
    for (i = 0; i < ROOT_IDS.length; i++) {
      try { el = document.getElementById(ROOT_IDS[i]); } catch (e) { el = null; }
      if (el && roots.indexOf(el) === -1) { roots.push(el); }
    }
    try {
      var chrome = document.querySelectorAll(CHROME_SELECTORS);
      for (i = 0; i < chrome.length; i++) {
        if (roots.indexOf(chrome[i]) === -1) { roots.push(chrome[i]); }
      }
    } catch (e2) {}
    return roots;
  }

  var lastLogAt = 0;
  function run() {
    var roots = resolveRoots();
    var n = 0, i, j, els;
    for (i = 0; i < roots.length; i++) {
      var root = roots[i];
      els = chain(root);
      for (j = 0; j < els.length; j++) {
        try { n += fixEl(els[j], els[j] === root); } catch (e) {}
      }
      var broken = false;
      try { broken = contentBroken(root); } catch (e2) {}
      try { n += fixText(root, broken); } catch (e3) {}
      try { n += fixOffscreen(root); } catch (e4) {}
      /* Gated descendant repair: the culprit is BELOW the root. */
      try {
        if (broken) { n += fixDescendants(root); }
      } catch (e5) {}
      /* Diagnostic: content exists but still paints nothing. */
      try {
        var now = Date.now();
        if (contentBroken(root) && now - lastLogAt > 10000) {
          lastLogAt = now;
          PF.error('v2-visibility',
            'content still broken after repair @ ' + location.pathname +
            ' :: ' + snapshot(root));
        }
      } catch (e6) {}
    }
    try {
      var now2 = Date.now();
      if (n > 0 && PF && PF.log && now2 - lastLogAt > 10000) {
        lastLogAt = now2;
        PF.log('v2-visibility', 'restored visibility (' + n + ' repair(s)) @ ' + location.pathname);
      }
    } catch (e7) {}
  }

  /* Event-driven re-repair: any style/class/DOM mutation re-arms the guard
     (debounced), so a late-hiding script can never win the race. The fixed
     timeouts below are only a backstop. */
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
