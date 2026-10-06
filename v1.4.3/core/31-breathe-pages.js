/* core/31-breathe-pages.js  |  PF v1.4.3 | BREATHE for dedicated pages.
   Page-level application of the BREATHE system (companion to
   core/30-breathe.js) on the dedicated v2 app/hub pages. Called by
   pages/page-mount.js after each page's silos mount — and on its retry
   passes, so late-mounted (lazy) silos get it too. Idempotent: sections
   are marked data-pf-br-sec, the nav data-pf-br-nav; re-runs only touch
   new sections and rebuild the nav when the section count changed.
   What it does per page:
     rhythm — every section.pf-v2-game gets .pf-br-sec (38px/30px rhythm,
              anchor scroll-margin-top). Silo structural CSS is untouched:
              BREATHE owns spacing only.
     nav    — pages with >= NAV_MIN sections get the sticky scrollspy
              section nav (PF.Breathe.sectionNav), built from the sections
              that actually rendered (kill-switch aware — dead silos never
              mount, so they never get pills).
   Deliberately NOT restyled: silo headings keep their own hierarchy
   (.pf-silo h2 — red, 28px, uppercase); forcing .pf-br-title over them
   would be a visual downgrade. Collapse toggles are a per-page opt-in
   where the head/body structure exists (the /follow-the-money pilot has
   them); generic v2 sections don't get restructured.
   Scope (Project Blossom rollout phases 1-3): economy, war-report, cells,
   events, arcade, bank, war-chest. /follow-the-money pilots its own wiring
   (core/money-page.js); /create's workshop shell gets rhythm in
   core/workshop.js. Other pages: add their mount id to BREATHE_PAGES in
   pages/page-mount.js.
   KILL: ?pf_off=breathe (PF.Breathe absent -> total no-op). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('breathe-pages')) { return; }
  if (PF.BreathePages) return;

  function navMinFor(pageId) {
    try {
      var m = window.PF_BREATHE_NAV_MIN;
      if (m && typeof m[pageId] === 'number') return m[pageId];
    } catch (e) {}
    return 6; /* rollout: nav only where sections exceed ~5 */
  }

  function humanize(s) {
    return String(s || 'section').replace(/[-_]+/g, ' ').trim().toUpperCase() || 'SECTION';
  }

  function sectionLabel(sec) {
    try {
      var h = sec.querySelector('h1,h2,h3');
      if (h && h.textContent) {
        var t = h.textContent.replace(/\s+/g, ' ').trim();
        if (t) return t.length > 30 ? t.slice(0, 30) + '…' : t;
      }
    } catch (e) {}
    return humanize(sec.getAttribute('data-game'));
  }

  function ensureId(sec, pageId, key, used) {
    var base = 'pf-br-' + pageId + '-' + String(key || 'sec').replace(/[^a-z0-9-]+/gi, '').toLowerCase();
    if (!base || base === 'pf-br-' + pageId + '-') base = 'pf-br-' + pageId + '-sec';
    var id = base, i = 2;
    while (used[id] || document.getElementById(id)) { id = base + '-' + (i++); }
    used[id] = 1;
    sec.id = id;
    return id;
  }

  /* One pass over a page host. Returns the section count. */
  function applyPage(host, pageId) {
    if (!host || !pageId) return 0;
    var B = null;
    try { B = window.PF && PF.Breathe; } catch (e) {}
    if (!B) return 0; /* ?pf_off=breathe -> module never defined */
    var secs = [];
    try {
      var all = host.querySelectorAll('section.pf-v2-game');
      for (var i = 0; i < all.length; i++) secs.push(all[i]);
    } catch (e2) { return 0; }
    if (!secs.length) return 0;
    var used = {}, fresh = 0;
    secs.forEach(function (sec, ix) {
      try {
        if (sec.getAttribute('data-pf-br-sec') === '1') return;
        sec.classList.add('pf-br-sec');
        ensureId(sec, pageId, sec.getAttribute('data-game') || ('s' + (ix + 1)), used);
        sec.setAttribute('data-pf-br-sec', '1');
        fresh++;
      } catch (e3) {}
    });
    /* Nav: build once we have enough sections; rebuild if the section set
       changed since the nav was built (lazy silos landing late). */
    try {
      var min = navMinFor(pageId);
      var navHost = host.querySelector('[data-pf-br-nav]');
      var count = secs.length;
      var builtFor = navHost ? Number(navHost.getAttribute('data-pf-br-nav-count') || 0) : -1;
      if (count >= min && (!navHost || builtFor !== count)) {
        if (navHost && navHost.parentNode) navHost.parentNode.removeChild(navHost);
        var wrap = document.createElement('div');
        wrap.setAttribute('data-pf-br-nav', '1');
        wrap.setAttribute('data-pf-br-nav-count', String(count));
        var items = secs.map(function (sec) {
          return { id: sec.id, label: sectionLabel(sec) };
        });
        var head = null;
        try {
          var kids = host.children || [];
          for (var k = 0; k < kids.length; k++) {
            if (kids[k].className && String(kids[k].className).split(' ').indexOf('pf-page-head') !== -1) { head = kids[k]; break; }
          }
        } catch (e4) {}
        if (head && head.parentNode) head.parentNode.insertBefore(wrap, head.nextSibling);
        else host.insertBefore(wrap, host.firstChild);
        B.sectionNav(wrap, items);
      }
    } catch (e5) {}
    return secs.length;
  }

  try { PF.BreathePages = { applyPage: applyPage }; } catch (e) {}
})();
