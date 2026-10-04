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
     complete no-op. Never runs in the Squarespace editor. */
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
    /* font-size:0 kills text rendering; repair on the host itself (ancestors
       may use font-size:0 legitimately for whitespace collapsing). */
    if (isHost && (c.fontSize === '0px' || c.fontSize === '0')) {
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
    /* scale(0) transform or opacity(0) filter: paints nothing, stays in DOM. */
    try {
      var t = c.transform || '';
      if (t && t !== 'none' && (/^matrix\(0,/.test(t) || /^matrix3d\(0,/.test(t))) {
        setImp(el, 'transform', 'none'); fixed++;
      }
      var f = c.filter || '';
      if (f && f !== 'none' && /opacity\(\s*0/.test(f)) { setImp(el, 'filter', 'none'); fixed++; }
    } catch (e4) {}
    return fixed;
  }

  /* Transparent INLINE text color inside the content host is unambiguously an
     accident (stylesheet-level transparency is left alone as intentional
     design). Removing the inline declaration falls back to the cascade. */
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
      if (transparentInline(els[i])) {
        try { els[i].style.removeProperty('color'); fixed++; } catch (e2) {}
      }
    }
    return fixed;
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
      ' contentVisibility=' + (c.contentVisibility || '?');
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
        var obs = new MutationObserver(function () { dirty = true; schedule(); });
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
