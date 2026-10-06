/* core/30-breathe.js  |  PF v1.4.3 | BREATHE — shared breathing-room helpers.
   Companion to the BREATHE section in core/02-design-system.css (mirrored in
   core/bundle-styles.css). Pilot consumer: /follow-the-money (core/money-page.js).
   Rollout: /economy, /war-report, /money, ... — every data-dense surface uses
   these instead of inventing its own nav/collapse/show-more.
   API:
     PF.Breathe.sectionNav(host, items)   — sticky scrollspy jump nav.
        host: element to receive the <nav>. items: [{id, label}]. Sections must
        exist in the DOM with matching ids. Fail-soft: no items = no nav.
     PF.Breathe.collapsible(secEl, opts)  — collapse toggle in the section head.
        opts: {startOpen:true, label:'Collapse section'}. Expects .pf-br-head >
        .pf-br-headtxt and .pf-br-body inside secEl; creates them if missing.
        Sets data-collapsed on the section; toggle is a 44px tap target.
     PF.Breathe.showMore(listEl, limit, label) — progressive disclosure for lists.
        Hides children beyond `limit` (adds .pf-br-list-extra), appends a
        .pf-br-more button that toggles data-showall on the closest .pf-br-sec
        (falls back to the list's parent). Zero-op when children <= limit.
   No data logic here — presentation and navigation only. No XP.
   KILL: ?pf_off=breathe */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('breathe')) { return; }
  if (PF.Breathe) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* Sticky scrollspy nav. Pills jump to sections; the pill for the section
     nearest the viewport top carries aria-current="true". */
  function sectionNav(host, items) {
    if (!host || !items || !items.length) return null;
    try {
      var nav = document.createElement('nav');
      nav.className = 'pf-bnav';
      nav.setAttribute('aria-label', 'Page sections');
      var row = document.createElement('div');
      row.className = 'pf-bnav-row';
      var pills = [];
      items.forEach(function (it) {
        if (!it || !it.id) return;
        var target = null;
        try { target = document.getElementById(it.id); } catch (e) {}
        if (!target) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-bnav-pill';
        b.textContent = it.label || it.id;
        b.setAttribute('data-br-target', it.id);
        b.addEventListener('click', function () {
          try {
            var t = document.getElementById(it.id);
            if (!t) return;
            if (t.scrollIntoView) {
              t.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
            } else if (t.scrollIntoView === undefined) { window.location.hash = it.id; }
          } catch (e) { try { window.location.hash = it.id; } catch (e2) {} }
        });
        row.appendChild(b);
        pills.push({ btn: b, id: it.id });
      });
      if (!pills.length) return null;
      nav.appendChild(row);
      host.appendChild(nav);
      /* Scrollspy: the section whose top edge is nearest (but above) the
         nav line wins. rootMargin carves a band just under the sticky nav. */
      function setCurrent(id) {
        pills.forEach(function (p) {
          if (p.id === id) p.btn.setAttribute('aria-current', 'true');
          else p.btn.removeAttribute('aria-current');
        });
      }
      try {
        var seen = {};
        var io = new IntersectionObserver(function (entries) {
          var best = null, bestTop = Infinity;
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              var top = Math.abs(en.boundingClientRect.top);
              if (top < bestTop) { bestTop = top; best = en.target; }
            }
          });
          if (best && best.id && seen[best.id] !== false) setCurrent(best.id);
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
        pills.forEach(function (p) {
          try {
            var t = document.getElementById(p.id);
            if (t) { seen[p.id] = true; io.observe(t); }
          } catch (e) {}
        });
      } catch (e) { /* scrollspy is enhancement-only */ }
      return nav;
    } catch (e) { return null; }
  }

  /* Collapse toggle. Adds a chevron button to .pf-br-head (or the first
     heading found), toggling data-collapsed on the section. */
  function collapsible(secEl, opts) {
    if (!secEl) return;
    opts = opts || {};
    var startOpen = opts.startOpen !== false;
    try {
      var head = secEl.querySelector('.pf-br-head');
      var body = secEl.querySelector('.pf-br-body');
      if (!head || !body) return;
      if (head.querySelector('.pf-br-toggle')) return; /* already wired */
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-br-toggle';
      btn.setAttribute('aria-expanded', startOpen ? 'true' : 'false');
      btn.setAttribute('aria-label', opts.label || 'Collapse section');
      btn.innerHTML = '<span class="pf-br-chev">\u25B2</span>';
      btn.addEventListener('click', function () {
        var collapsed = secEl.getAttribute('data-collapsed') === '1';
        if (collapsed) {
          secEl.removeAttribute('data-collapsed');
          btn.setAttribute('aria-expanded', 'true');
        } else {
          secEl.setAttribute('data-collapsed', '1');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
      head.appendChild(btn);
      if (!startOpen) {
        secEl.setAttribute('data-collapsed', '1');
        btn.setAttribute('aria-expanded', 'false');
      }
    } catch (e) {}
  }

  /* Progressive disclosure for long lists. */
  function showMore(listEl, limit, label) {
    if (!listEl) return;
    limit = limit || 5;
    try {
      var kids = listEl.children;
      if (!kids || kids.length <= limit) return;
      for (var i = limit; i < kids.length; i++) {
        try { kids[i].classList.add('pf-br-list-extra'); } catch (e) {}
      }
      var scope = listEl;
      try {
        var sec = listEl.closest ? listEl.closest('.pf-br-sec') : null;
        if (sec) scope = sec;
      } catch (e) {}
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-br-more';
      var total = kids.length;
      function paint() {
        var open = scope.getAttribute('data-showall') === '1';
        btn.textContent = open ? 'SHOW LESS \u25B2'
          : ('SHOW ALL ' + total + ' \u25BC');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      btn.addEventListener('click', function () {
        if (scope.getAttribute('data-showall') === '1') scope.removeAttribute('data-showall');
        else scope.setAttribute('data-showall', '1');
        paint();
      });
      paint();
      if (listEl.parentNode) listEl.parentNode.insertBefore(btn, listEl.nextSibling);
    } catch (e) {}
  }

  try { PF.Breathe = { sectionNav: sectionNav, collapsible: collapsible, showMore: showMore }; }
  catch (e) {}
})();
