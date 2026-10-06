/* core/19-crossnav.js  |  PF v1.4.3 | CROSS-PAGE NAV WIRING (2026-10-03).
   One shared component, shipped in BOTH footer-chrome paths:
   - the V3 core bundles (core/bundle-core.js, core/bundle-core-slr.js —
     built from this source file at release time)
   - the slim chrome bundle (core/bundle-footer-chrome.js) for the v1.1.0
     branch pages (/store, /privacy, /terms, any other non-v2 page)
   What it does:
   1. PERSISTENT CROSS-LINK STRIP: links to all 9 dedicated pages
      (Arcade, Cells, Create, Bank, Economy, War Chest, Ventures, Events,
      War Report) — prepended IN-FLOW into the site footer element, using
      the proven broad selector list from 16-footer. In-flow by design:
      zero collision with the fixed-bottom nuke strip / do-mini ticker /
      RUN MISSION bar, and no new body-padding compensation needed.
   2. PAGE-LEVEL ENGAGEMENT WIRING (V3 pages only, keyed on mount-div ids):
      - #pf-v2 (homepage): 3-card DEPLOY CTA grid after the PROOF section
      - #pf-cells-page: recruit prompt pointing at the cell card's RECRUIT
        button (id #cRecruit, rendered by games/cells.js — this file only
        scrolls to it, never touches it)
      - #pf-bank <-> #pf-economy: mutual cross-link banners
      - #pf-arcade: highlighted War Room entry card, scrolls to the
        mounted forecasts section (section[data-game="markets"])
   Double-run safe (window flag + element-id guards). No backend calls,
   no dependency on any game bundle. Never runs inside the editor.
   KILL: ?pf_off=19-crossnav  or  localStorage pf_disabled_v1='["19-crossnav"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('19-crossnav')) { return; }
  if (window.pfCrossnavDone) { return; }
  window.pfCrossnavDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }
  if (isEditor()) { return; }

  /* Brand-integration (2026-10-06): /bounty 404s — retarget to /data-bounties.
     Crossnav ships in both chrome bundles (v2 + v1.1.0 slim), so this fires
     on the Squarespace 404 page too, where the footer chrome still loads. */
  try {
    var _pth = String(window.location.pathname || '');
    if (_pth === '/bounty' || _pth === '/bounty/') {
      window.location.replace('/data-bounties' + (window.location.search || '') + (window.location.hash || ''));
      return;
    }
  } catch (e) {}

  /* ---- shared stylesheet (single tag, hover + mobile rules) ---- */
  function ensureCss() {
    if (document.getElementById('pf-crossnav-css')) { return; }
    var st = document.createElement('style');
    st.id = 'pf-crossnav-css';
    st.textContent =
      '#pf-crossnav{border-top:3px solid #c1121f;border-bottom:3px solid #c1121f;background:#0a0a0a;' +
      'padding:14px 10px 12px;margin:0 0 22px;text-align:center;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}' +
      '#pf-crossnav .pf-xn-kicker{color:#c1121f;font-weight:900;letter-spacing:.28em;font-size:10px;margin-bottom:10px}' +
      '#pf-crossnav .pf-xn-nav{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}' +
      '#pf-crossnav .pf-xn-nav a{color:#f5ead6;font-weight:700;font-size:11px;letter-spacing:.16em;text-decoration:none;' +
      'border:1px solid #3d3d3d;padding:9px 12px;background:#141414;display:inline-block;box-sizing:border-box}' +
      '#pf-crossnav .pf-xn-nav a:hover{border-color:#c1121f;color:#fff;background:#1d0b0b}' +
      '.pf-xn-banner{border:2px solid #c1121f;background:#0d0d0d;color:#f5ead6;text-align:center;' +
      'padding:16px 14px;margin:0 auto 20px;max-width:760px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;cursor:pointer}' +
      '.pf-xn-banner .pf-xn-bt{font-family:\'Arial Black\',Arial,sans-serif;font-size:17px;letter-spacing:.12em;color:#ff4d5e;margin-bottom:6px}' +
      '.pf-xn-banner .pf-xn-bs{font-size:13px;color:#c9bfa8;line-height:1.5}' +
      '.pf-xn-banner .pf-xn-bl{display:inline-block;margin-top:10px;background:#c1121f;color:#fff;font-weight:900;' +
      'font-size:12px;letter-spacing:.14em;padding:11px 22px;text-decoration:none}' +
      '#pf-xn-deploy{margin:26px auto;max-width:880px;text-align:center;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;padding:0 12px}' +
      '#pf-xn-deploy .pf-xn-dk{color:#c1121f;font-weight:900;letter-spacing:.3em;font-size:11px;margin-bottom:8px}' +
      '#pf-xn-deploy .pf-xn-dt{font-family:\'Arial Black\',Arial,sans-serif;font-size:26px;letter-spacing:.08em;color:#f5ead6;margin-bottom:6px}' +
      '#pf-xn-deploy .pf-xn-ds{font-size:13px;color:#a89e88;margin-bottom:16px}' +
      '#pf-xn-deploy .pf-xn-dg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}' +
      '#pf-xn-deploy .pf-xn-dc{border:2px solid #c1121f;background:#0d0d0d;padding:18px 14px;box-sizing:border-box}' +
      '#pf-xn-deploy .pf-xn-dch{font-family:\'Arial Black\',Arial,sans-serif;font-size:16px;letter-spacing:.1em;color:#ff4d5e;margin-bottom:8px}' +
      '#pf-xn-deploy .pf-xn-dcp{font-size:12.5px;color:#c9bfa8;line-height:1.55;margin-bottom:12px;min-height:58px}' +
      '#pf-xn-deploy .pf-xn-dca{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:12px;' +
      'letter-spacing:.14em;padding:11px 20px;text-decoration:none}' +
      '#pf-xn-deploy .pf-xn-dcsub{display:block;margin-top:10px;font-size:11.5px;color:#c9bfa8;text-decoration:underline;letter-spacing:.06em}' +
      '@media (max-width:640px){#pf-xn-deploy .pf-xn-dg{grid-template-columns:1fr}' +
      '#pf-xn-deploy .pf-xn-dcp{min-height:0}' +
      '#pf-crossnav .pf-xn-nav a{font-size:10px;padding:8px 9px;letter-spacing:.1em}}' +
      '.pf-xn-pulse{animation:pfxnpulse 2.2s ease-in-out infinite}' +
      '@keyframes pfxnpulse{0%,100%{box-shadow:0 0 0 0 rgba(193,18,31,.55)}50%{box-shadow:0 0 22px 4px rgba(193,18,31,.55)}}' +
      '@media (prefers-reduced-motion:reduce){.pf-xn-pulse{animation:none}}';
    try { document.head.appendChild(st); } catch (e) {}
  }

  function scrollToEl(el) {
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
  }

  /* ============ 1. PERSISTENT FOOTER CROSS-LINK STRIP ============ */
  var PAGES = [
    ['ARCADE', '/arcade'],
    ['CELLS', '/cells'],
    ['CREATE', '/create'],
    ['BANK', '/bank'],
    ['ECONOMY', '/economy'],
 (2026-10-06): /fund was orphaned — zero inbound
       links. FRONT LINES grid is the canonical inbound path (fix 9). */
    ['FUND', '/fund'],
    /* BLOSSOM M3 (2026-10-06): /war-chest folds into /ventures — the
       VENTURES entry now covers the Movement Funds section; no duplicate. */
/* SPACE-AUDIT FIX 6 (2026-10-06): WAR CHEST pointed at /war-chest, which
       live-redirects to /ventures — wrong theater. The war chest (personal
       bank / XP) lives on /bank now; point straight there. */
    ['WAR CHEST', '/bank'],
    ['VENTURES', '/ventures'],
    ['EVENTS', '/events'],
    ['WAR REPORT', '/war-report'],
    /* SPACE-AUDIT FIX 3 (2026-10-06): /governance was shadowed under ACT
       (goPillar picks /call-it) — the FRONT LINES grid gives it its own
       inbound path from every page footer. */
    ['GOVERNANCE', '/governance']
  ];

  /* SPACE-AUDIT FIX 2 (2026-10-06): /fund joins the pillar spine as an
     ORGANIZE destination. This module runs on every page (core bundle), so
     the registration is global — unlike the fund silo, which only loads on
     /fund. Secondary only: /cells is re-registered right after so it stays
     the primary ORGANIZE landing (registerDestination takes the front). */
  try {
    if (window.PF && PF.pillars && PF.pillars.registerDestination) {
      PF.pillars.registerDestination('organize', { url: '/fund', mount: 'pf-fund' });
      PF.pillars.registerDestination('organize', { url: '/cells', mount: 'pf-cells-page' });
    }
  } catch (e) {}

  /* Proven footer selector list, copied from 16-footer (covers commerce +
     system pages where Squarespace renders footers late / differently). */
  var FOOTER_SEL_ARR = [
    'footer',
    '.Footer',
    '#footer',
    '#footer-sections',
    '.Footer-inner',
    '.Footer-blocks',
    '.Footer-nav',
    '[role="contentinfo"]',
    '.site-footer',
    '#site-footer',
    '.footer-inner',
    'section[class*="footer"]',
    'section[class*="Footer"]',
    'div[class*="Footer"]',
    '[data-section-id*="footer" i]',
    'section[data-section-theme] footer',
    'section[data-section-theme][class*="footer" i]',
    'div[data-section-theme][class*="footer" i]'
  ];
  var FOOTER_SELS = FOOTER_SEL_ARR.filter(function (sel) {
    try { document.querySelectorAll(sel); return true; } catch (e) { return false; }
  }).join(', ');

  function findFooter() {
    var fs;
    try { fs = document.querySelectorAll(FOOTER_SELS); } catch (e) { return null; }
    return (fs && fs.length) ? fs[0] : null;
  }

  function buildStrip() {
    var d = document.createElement('div');
    d.id = 'pf-crossnav';
    var k = document.createElement('div');
    k.className = 'pf-xn-kicker';
    k.textContent = 'THE FRONT LINES \u2014 EVERY THEATER OF THE WAR';
    var nav = document.createElement('nav');
    nav.className = 'pf-xn-nav';
    nav.setAttribute('aria-label', 'Propaganda Factory sections');
    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.href = p[1];
      a.textContent = p[0];
      nav.appendChild(a);
    });
    d.appendChild(k);
    d.appendChild(nav);
    return d;
  }

  function injectStrip() {
    if (document.getElementById('pf-crossnav')) { return true; }
    var f = findFooter();
    if (!f) { return false; }
    try { f.insertBefore(buildStrip(), f.firstChild); } catch (e) { return false; }
    return true;
  }

  /* ============ 2. PAGE-LEVEL ENGAGEMENT WIRING ============ */
  /* Insert el right after the page header when it exists; otherwise wait a
     few beats (page-mount adds the header after the chrome loads), then
     fall back to the top of the host. */
  function placeAfterHead(hostId, el, state) {
    if (document.getElementById(el.id)) { return true; }
    var host = document.getElementById(hostId);
    if (!host) { return false; }
    var head = null;
    try { head = host.querySelector(':scope > .pf-page-head'); } catch (e) {}
    if (head) {
      try {
        if (head.nextSibling) host.insertBefore(el, head.nextSibling);
        else host.appendChild(el);
        return true;
      } catch (e) { return false; }
    }
    state.tries = (state.tries || 0) + 1;
    if (state.tries > 10) {
      try { host.insertBefore(el, host.firstChild); return true; }
      catch (e) { return false; }
    }
    return false; /* not yet — page header still coming */
  }

  function makeBanner(id, title, sub, ctaLabel, ctaHref, onTap) {
    var d = document.createElement('div');
    d.id = id;
    d.className = 'pf-xn-banner';
    var t = document.createElement('div');
    t.className = 'pf-xn-bt';
    t.textContent = title;
    var s = document.createElement('div');
    s.className = 'pf-xn-bs';
    s.textContent = sub;
    d.appendChild(t);
    d.appendChild(s);
    if (ctaLabel) {
      var a = document.createElement('a');
      a.className = 'pf-xn-bl';
      a.textContent = ctaLabel;
      if (ctaHref) { a.href = ctaHref; }
      else { a.href = '#'; a.addEventListener('click', function (e) { e.preventDefault(); }); }
      if (onTap) { a.addEventListener('click', function (e) { e.preventDefault(); onTap(); }); }
      d.appendChild(a);
    } else if (onTap) {
      d.addEventListener('click', onTap);
    }
    return d;
  }

  function scrollToWarRoom() {
    var sec = null;
    try { sec = document.querySelector('section[data-game="markets"]'); } catch (e) {}
    if (!sec) { try { sec = document.getElementById('pf-forecasts'); } catch (e2) {} }
    if (sec) { scrollToEl(sec); return; }
    try { window.location.href = '/arcade#pf-forecasts'; } catch (e) {}
  }

  function scrollToRecruit() {
    var btn = null;
    try { btn = document.getElementById('cRecruit'); } catch (e) {}
    if (btn) { scrollToEl(btn); return; }
    var sec = null;
    try { sec = document.querySelector('section[data-game="cells"]'); } catch (e) {}
    if (sec) { scrollToEl(sec); }
  }

  var pageJobs = [
    /* Homepage: prominent 3-card DEPLOY grid after the PROOF section. */
    {
      id: 'pf-xn-deploy', host: 'pf-v2', tries: 0,
      build: function () {
        var wrap = document.createElement('div');
        wrap.id = 'pf-xn-deploy';
        var k = document.createElement('div');
        k.className = 'pf-xn-dk';
        k.textContent = 'DEPLOY \u2014 PICK YOUR THEATER';
        var t = document.createElement('div');
        t.className = 'pf-xn-dt';
        t.textContent = 'THE WAR DOESN\u2019T WIN ITSELF';
        var s = document.createElement('div');
        s.className = 'pf-xn-ds';
        s.textContent = 'You scrolled this far. Now pick a weapon.';
        var g = document.createElement('div');
        g.className = 'pf-xn-dg';
        var cards = [
          {
            h: 'FIGHT WITH A CELL',
            p: 'No soldier fights alone. Join a cell, stack daily streaks, multiply your XP.',
            a: 'JOIN A CELL', href: '/cells', sub: null
          },
          {
            h: 'RUN THE WAR ECONOMY',
            p: 'Your XP, weaponized. Bank it, grow it \u2014 then spend it like it matters.',
            a: 'OPEN THE BANK', href: '/bank', sub: ['Spend it in the Economy \u2192', '/economy']
          },
          {
            h: 'THE WAR ROOM PAYS IN XP',
            p: 'Nine games. Zero mercy. The collective always wins.',
            a: 'ENTER THE ARCADE', href: '/arcade', sub: null
          }
        ];
        cards.forEach(function (c) {
          var cd = document.createElement('div');
          cd.className = 'pf-xn-dc';
          var ch = document.createElement('div');
          ch.className = 'pf-xn-dch';
          ch.textContent = c.h;
          var cp = document.createElement('div');
          cp.className = 'pf-xn-dcp';
          cp.textContent = c.p;
          var ca = document.createElement('a');
          ca.className = 'pf-xn-dca';
          ca.href = c.href;
          ca.textContent = c.a;
          cd.appendChild(ch);
          cd.appendChild(cp);
          cd.appendChild(ca);
          if (c.sub) {
            var cs = document.createElement('a');
            cs.className = 'pf-xn-dcsub';
            cs.href = c.sub[1];
            cs.textContent = c.sub[0];
            cd.appendChild(cs);
          }
          g.appendChild(cd);
        });
        wrap.appendChild(k);
        wrap.appendChild(t);
        wrap.appendChild(s);
        wrap.appendChild(g);
        return wrap;
      },
      place: function (el) {
        if (document.getElementById('pf-xn-deploy')) { return true; }
        var anchor = null;
        try { anchor = document.querySelector('#pf-v2 .pf-section-head[data-sec="proof"]'); } catch (e) {}
        if (anchor && anchor.parentNode) {
          try {
            if (anchor.nextSibling) anchor.parentNode.insertBefore(el, anchor.nextSibling);
            else anchor.parentNode.appendChild(el);
            return true;
          } catch (e) { return false; }
        }
        return false; /* homepage sections still building */
      }
    },
    /* /cells: recruit prompt — points at the cell card's RECRUIT button. */
    {
      id: 'pf-xn-recruit', host: 'pf-cells-page', tries: 0,
      build: function () {
        return makeBanner(
          'pf-xn-recruit',
          'YOUR CELL GROWS WHEN YOU GROW IT',
          'Hit RECRUIT on your cell card and put the poster on your socials. ' +
          'Every recruit is +25 XP and one more fighter in the war.',
          'FIND THE RECRUIT BUTTON', null, scrollToRecruit
        );
      },
      place: function (el) { return placeAfterHead('pf-cells-page', el, this); }
    },
    /* /bank -> /economy cross-link. */
    {
      id: 'pf-xn-toeconomy', host: 'pf-bank', tries: 0,
      build: function () {
        return makeBanner(
          'pf-xn-toeconomy',
          'SPEND IT LIKE IT MATTERS',
          'The People\u2019s Bank grows your XP. The Economy is where it becomes firepower.',
          'ENTER THE ECONOMY', '/economy', null
        );
      },
      place: function (el) { return placeAfterHead('pf-bank', el, this); }
    },
    /* /economy -> /bank cross-link. */
    {
      id: 'pf-xn-tobank', host: 'pf-economy', tries: 0,
      build: function () {
        return makeBanner(
          'pf-xn-tobank',
          'STACK IT BEFORE YOU SPEND IT',
          'The Economy burns XP fast. The People\u2019s Bank grows it while you fight \u2014 park your war funds first.',
          'OPEN THE BANK', '/bank', null
        );
      },
      place: function (el) { return placeAfterHead('pf-economy', el, this); }
    },
    /* /arcade: highlighted War Room entry card. */
    {
      id: 'pf-xn-warroom', host: 'pf-arcade', tries: 0,
      build: function () {
        var b = makeBanner(
          'pf-xn-warroom',
          '\u2605 THE WAR ROOM PAYS IN XP \u2605',
          'Stakes, gambits, and nerve. Your XP is the chip \u2014 ' +
          'and the collective always wins.',
          'READ THE BOARD', null, scrollToWarRoom
        );
        b.classList.add('pf-xn-pulse');
        return b;
      },
      place: function (el) { return placeAfterHead('pf-arcade', el, this); }
    }
  ];

  function runPageJobs() {
    var pending = false;
    pageJobs.forEach(function (job) {
      var done = false;
      try { done = !!document.getElementById(job.id); } catch (e) {}
      if (done) { return; }
      var hostPresent = false;
      try { hostPresent = !!document.getElementById(job.host); } catch (e) {}
      if (!hostPresent) { return; } /* not this page */
      pending = true;
      var el = null;
      try { el = job.build(); } catch (e) { return; }
      try {
        if (job.place.call(job, el)) { /* placed */ }
        else {
          /* build() created a fresh node that place() rejected — drop it so
             the next retry builds a clean one (no detached-node leaks). */
          el = null;
        }
      } catch (e) {}
    });
    return pending;
  }

  /* ---- boot ---- */
  function boot() {
    try { ensureCss(); } catch (e) {}
    try { injectStrip(); } catch (e) {}
    try { runPageJobs(); } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  /* Squarespace renders footers (and page content) late: poll + watch. */
  var stripTries = 0, jobTries = 0, stripOk = false;
  var iv = setInterval(function () {
    try {
      if (!stripOk) {
        stripOk = injectStrip();
        if (!stripOk && ++stripTries >= 120) { stripOk = true; } /* stop polling; observer keeps watch */
      }
      jobTries++;
      var pending = runPageJobs();
      if (!pending || jobTries >= 60) { clearInterval(iv); }
    } catch (e) {}
  }, 1000);
  try {
    var obs = new MutationObserver(function () {
      try {
        if (!document.getElementById('pf-crossnav')) { injectStrip(); }
      } catch (e) {}
    });
    if (document.body) { obs.observe(document.body, { childList: true, subtree: true }); }
    else { document.addEventListener('DOMContentLoaded', function () {
      try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    }); }
  } catch (e) {}
})();
