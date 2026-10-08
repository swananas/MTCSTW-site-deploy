/* core/31-pillars.js  |  PF v1.4.3 | THE FOUR-PILLAR SPINE (2026-10-06, CEO directive).
   Product spine = four pillars, each ONE CLICK from anywhere:
     1) SPREAD PROPAGANDA — the fastest share sheet for the current page via PFShare
     2) TRACK DATA       — the price-report / bounty quick-capture (existing gated flows)
     3) POLITICAL ACTIVISM — the top activism action: call/event
     4) ORGANIZE         — cell join/create
   EXTENDS the cohesion HUD (core/30-hud.js) — does NOT rebuild it. The pillar
   row mounts inside the HUD's YOUR CAMPAIGN strip: one tap from the persistent
   HUD bar, which is on every page. The strip stays the HUD's; pillars add a row.
   ADVENTURE-PATH CHOOSER (multi-select, 2026-10-06 ~12:44 CDT CEO directive):
   2026-10-06 (one-prompt): first-run AUTO-FIRE removed — the chooser opens
   only via the HUD-strip tap ([data-pf-path-change]). Anytime after that,
   the user picks any combination of
   PROPAGANDIST, DATA SCOUT, ACTIVIST, ORGANIZER — checkboxes, not radio;
   all four is valid. Stored device-local only (localStorage
   pf_adventure_path_v1, JSON array; bare-string v1 values migrate to
   [value]). The chosen paths (a) reorder the four pillar buttons (selected
   first, in path order), (b) bias the Next Move engine (core/20-nextop.js
   reads PF.pillars.biasOps() — union of biases, deduped, fail-open), and
   (c) flavor the HUD strip headline. Never locks, never shames, never
   loss-frames: the daily XP cap is the SOLE governor on activity — paths
   are identity/flavor, never permission. The user can do everything
   regardless, and the paths can be changed or cleared at any time.
   FRONTEND-ONLY, ZERO NEW XP — pure routing + reads. No writes of any kind
   (no backend writes, no XP minted, no XP promised). DATA routes to the
   existing gated capture flows; nothing is bypassed — quorum/claim gates on
   the destination pages do their own enforcement.
   CROSS-PILLAR HANDOFFS (integration, not friction — the story continuing):
     - SPREAD on a card context: cards declare data-pf-share-game="<PFShare REG id>"
       and SPREAD pre-loads that card's poster (fallback: page map).
     - DATA / ACT / ORGANIZE resolve through the DESTINATION REGISTRY below
       (pillar -> current landing page): page silos register themselves at load,
       so when Blossom adds /peoples-cpi, /call-it, /cell-war, /governance etc.
       the HUD picks them up with no rebuild and no edit to this file.
   CEO STANDING RULE (2026-10-06): new pages are pre-authorized as natural
   expansion — they stay optimized for engagement by meeting the bar: one-click
   pillar access (this row), a Next Move exit (20-nextop.js mounts on every
   page), low friction / accurate / condensed.
   Share-image CTA standards (Pattern P-5): posters come from PFShare.REG —
   existing painters, existing CTAs (JOIN THE FIGHT., JOIN THE RAID, etc.);
   this module invents no poster copy.
   THEME: every color flows through CSS custom properties (--pf-p-*), defaulting
   to the --pf-hud-* set so the visual system can re-skin without touching logic.
   Mount: inside #pf-hud's strip (bottom on mobile = thumb-reachable, top on
   desktop — inherits the HUD's position). Silent no-op when the HUD host is
   absent; every read fail-open.
   KILL: ?pf_off=pillars  or  localStorage pf_disabled_v1='["pillars"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('pillars')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* ---- adventure paths ---- */
  var PATHS = {
    propagandist: {
      name: 'PROPAGANDIST',
      glyph: '\uD83D\uDCE3',
      blurb: 'Spread the word. Make it loud.',
      headline: 'PROPAGANDIST \u00B7 YOUR CAMPAIGN',
      pillar: 'spread',
      /* nextop op keys this path cares about (20-nextop.js OPS catalog). */
      bias: ['orders', 'bounty', 'recruit', 'matchquiz', 'loot']
    },
    data: {
      name: 'DATA SCOUT',
      glyph: '\uD83D\uDCCA',
      blurb: 'Feed the machine real numbers.',
      headline: 'DATA SCOUT \u00B7 YOUR CAMPAIGN',
      pillar: 'data',
      bias: ['predict', 'bounty', 'catchup']
    },
    activist: {
      name: 'ACTIVIST',
      glyph: '\u270A',
      blurb: 'Show up. Call. March.',
      headline: 'ACTIVIST \u00B7 YOUR CAMPAIGN',
      pillar: 'act',
      bias: ['blitz', 'orders', 'bounty']
    },
    organizer: {
      name: 'ORGANIZER',
      glyph: '\uD83E\uDD1D',
      blurb: 'Build the crew. Hold the line.',
      headline: 'ORGANIZER \u00B7 YOUR CAMPAIGN',
      pillar: 'organize',
      bias: ['cellnone', 'cellcheck', 'recruit']
    }
  };
  var PATH_KEYS = ['propagandist', 'data', 'activist', 'organizer'];

  /* ---- pillars ---- */
  var PILLARS = [
    { key: 'spread',   path: 'propagandist', label: 'SPREAD',   sub: 'PROPAGANDA', glyph: '\uD83D\uDCE3' },
    { key: 'data',     path: 'data',         label: 'TRACK',    sub: 'PRICES',     glyph: '\uD83D\uDCCA' },
    { key: 'act',      path: 'activist',     label: 'ACT',      sub: 'SHOW UP',    glyph: '\u270A' },
    { key: 'organize', path: 'organizer',    label: 'ORGANIZE', sub: 'CELLS',      glyph: '\uD83E\uDD1D' }
  ];

  /* ---- device-local state (preference only — never a gate) ----
     pf_adventure_path_v1 holds a JSON array of path keys. v1 bare-string
     values (e.g. "data") migrate to ["data"] on read. */
  var LS_PATH = 'pf_adventure_path_v1';
  var LS_SEEN = 'pf_pillars_seen_v1';
  function getPaths() {
    try {
      var raw = localStorage.getItem(LS_PATH);
      if (!raw) return [];
      var arr;
      try { arr = JSON.parse(raw); }
      catch (e) { arr = [raw]; } /* v1 bare-string was never JSON: migrate */
      if (typeof arr === 'string') arr = [arr];
      if (!arr || Object.prototype.toString.call(arr) !== '[object Array]') return [];
      var out = [];
      for (var i = 0; i < PATH_KEYS.length; i++) {
        if (arr.indexOf(PATH_KEYS[i]) !== -1) out.push(PATH_KEYS[i]);
      }
      return out;
    } catch (e) { return []; }
  }
  function getPath() { /* compat: first selected path, or '' */
    var p = getPaths();
    return p.length ? p[0] : '';
  }
  function setPaths(paths) {
    try {
      var clean = [];
      (paths || []).forEach(function (p) {
        if (PATHS[p] && clean.indexOf(p) === -1) clean.push(p);
      });
      if (clean.length) localStorage.setItem(LS_PATH, JSON.stringify(clean));
      else localStorage.removeItem(LS_PATH);
    } catch (e) {}
    try { localStorage.setItem(LS_SEEN, '1'); } catch (e2) {}
    applyPath();
  }
  function setPath(p) { /* compat: single pick replaces the set */
    setPaths(p ? [p] : []);
  }
  function togglePath(p) {
    var cur = getPaths(), i = cur.indexOf(p);
    if (i === -1) { if (PATHS[p]) cur.push(p); }
    else cur.splice(i, 1);
    setPaths(cur);
  }
  function clearPath() { setPaths([]); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }

  /* ---- page detection (mirrors 20-nextop.js pageKey; standalone copy so
     this module never depends on nextop's internals) ---- */
  var PAGE_IDS = ['pf-v2', 'pf-arcade', 'pf-cells-page', 'pf-create', 'pf-bank',
    'pf-economy', 'pf-warchest', 'pf-ventures', 'pf-events', 'pf-warreport',
    'pf-catalog', 'pf-slr-roster', 'pf-war-card', 'pf-political-hq', 'pf-money'];
  function pageKey() {
    try {
      for (var i = 0; i < PAGE_IDS.length; i++) {
        if (document.getElementById(PAGE_IDS[i])) return PAGE_IDS[i];
      }
      var p = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
      var map = { '/': 'pf-v2', '/arcade': 'pf-arcade', '/cells': 'pf-cells-page',
        '/create': 'pf-create', '/bank': 'pf-bank', '/economy': 'pf-economy',
        '/war-chest': 'pf-warchest', '/ventures': 'pf-ventures',
        '/events': 'pf-events', '/war-report': 'pf-warreport',
        '/follow-the-money': 'pf-money', '/money': 'pf-money',
        '/sick-left-radicals': 'pf-slr-roster' };
      if (map[p]) return map[p];
    } catch (e) {}
    return 'default';
  }

  /* ---- SPREAD: fastest share sheet for the current page via PFShare ----
     Card contexts declare data-pf-share-game="<REG id>" (contract for the
     robbery-report card and friends); otherwise the page map; otherwise the
     generic daily-orders poster. REG fallback inside drawPoster keeps this
     fail-open even for unregistered ids. */
  var PAGE_POSTER = {
    'pf-v2': 'daily-orders', 'pf-arcade': 'fan-vote', 'pf-cells-page': 'supply-raid',
    'pf-create': 'poster-forge', 'pf-bank': 'war-bonds', 'pf-economy': 'do-meter',
    'pf-warchest': 'war-bonds', 'pf-ventures': 'war-bonds', 'pf-events': 'irl-going',
    'pf-warreport': 'daily-orders', 'pf-catalog': 'slr-match-quiz',
    'pf-slr-roster': 'slr-match-quiz', 'pf-war-card': 'vanguard-wall',
    'pf-political-hq': 'voter-pledge', 'pf-money': 'do-meter', 'default': 'daily-orders'
  };
  function spreadGame() {
    try {
      var card = document.querySelector('[data-pf-share-game]');
      if (card) {
        var g = String(card.getAttribute('data-pf-share-game') || '').trim();
        if (g) return g;
      }
    } catch (e) {}
    return PAGE_POSTER[pageKey()] || PAGE_POSTER['default'];
  }
  function spreadGo() {
    try {
      var PS = window.PFShare;
      if (!PS || typeof PS.poster !== 'function' || typeof PS.shareImage !== 'function') {
        toast('Share tools still loading \u2014 one more second.');
        return;
      }
      var game = spreadGame();
      var cv = null;
      try { cv = PS.poster(game); } catch (e) {}
      if (!cv) { toast('Could not paint the poster \u2014 try again.'); return; }
      var reg = (PS.REG && PS.REG[game]) || {};
      var title = reg.title || 'THE PROPAGANDA FACTORY';
      /* P-5: the caption carries the CTA standard; REG owns the poster copy. */
      var caption = String(title).replace(/\s+/g, ' ') +
        ' \u2014 JOIN THE FIGHT. mtcstw.com' + String(window.location.pathname || '');
      var fname = 'pf-' + String(game).replace(/[^a-z0-9-]/gi, '') + '.png';
      PS.shareImage(cv, fname, title, game, { text: caption, link: window.location.href });
    } catch (e) {
      try { toast('Share hiccup \u2014 try again.'); } catch (e2) {}
    }
  }

  /* ---- pillar destination registry ----
     Pillar -> ordered candidate landing pages. Built-in defaults (registered
     first = lowest priority) point at today's pages; PAGE SILOS register
     themselves — typically at load — to become the current landing page for
     their pillar. Blossom pattern:
       PF.pillars.registerDestination('data',     { url:'/peoples-cpi', mount:'pf-peoples-cpi' });
       PF.pillars.registerDestination('act',      { url:'/call-it',   mount:'pf-call-it' });
       PF.pillars.registerDestination('organize', { url:'/cell-war',   mount:'pf-cell-war' });
       PF.pillars.registerDestination('act',      { url:'/governance', mount:'pf-governance' });
     Later registrations take priority, so a page silo that knows its own
     mount div wins over the default — no rebuild, no edit to this file.
     Page silos should guard: if (window.PF && PF.pillars) PF.pillars.registerDestination(...)
     Resolution at tap time: first candidate whose mount div exists in-page
     gets scrolled to (+focus); otherwise navigate to the top candidate's url.
     Contract for new pages (CEO bar, 2026-10-06): one-click pillar access
     (this row), a Next Move exit (20-nextop.js mounts on every page),
     low friction / accurate / condensed copy.
     NAV CEILING (CEO standing principle, 2026-10-06): six top-level nav items
     is the ceiling — new pages slot underneath as sub-nav or footer, NEVER as
     new top-level items (a 7th means something else gets demoted first; the
     test is a new visitor gets it in five seconds). This registry maps each
     pillar's landing into the EXISTING nav — registered destinations must
     already be reachable under it. The four-pillar bar is a HUD shortcut
     layer, not nav: it must never become a second competing nav.
     dest: { url:'/path' (same-origin path, required),
             mount:'div-id' (optional — scrolled to when present in-page),
             focus:'input-id' (optional — focused after the scroll) } */
  var DESTS = { spread: [], data: [], act: [], organize: [] };
  function validPillarKey(k) {
    return k === 'spread' || k === 'data' || k === 'act' || k === 'organize';
  }
  function registerDestination(pillarKey, dest) {
    try {
      if (!validPillarKey(pillarKey) || !dest || typeof dest !== 'object') return false;
      var url = String(dest.url || '');
      if (url.charAt(0) !== '/') return false; /* same-origin paths only */
      var d = { url: url };
      if (dest.mount) d.mount = String(dest.mount);
      if (dest.focus) d.focus = String(dest.focus);
      /* Dedupe by url; newest registration wins the front of the list. */
      var list = DESTS[pillarKey];
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].url === d.url) list.splice(i, 1);
      }
      list.unshift(d);
      return true;
    } catch (e) { return false; }
  }
  function destinations(pillarKey) {
    try { return (DESTS[pillarKey] || []).slice(); } catch (e) { return []; }
  }
  function goPillar(key) {
    var list = destinations(key);
    if (!list.length) { toast('Nothing on that front yet.'); return; }
    for (var i = 0; i < list.length; i++) {
      var m = list[i].mount, el = null;
      if (m) { try { el = document.getElementById(m); } catch (e) {} }
      if (el) {
        scrollToEl(el);
        (function (f) {
          if (!f) return;
          setTimeout(function () {
            try {
              var inp = document.getElementById(f);
              if (inp && inp.focus) inp.focus({ preventScroll: true });
            } catch (e) {}
          }, 450);
        })(list[i].focus);
        return;
      }
    }
    /* Not on any candidate page: go to the current landing page. */
    var first = list[0];
    nav(first.url + (first.mount ? '#' + first.mount : ''));
  }
  /* Built-in defaults (lowest priority — page silos register over these).
     DATA on /follow-the-money: the People's CPI quick-capture on /economy
     is the movement's data bounty — the money page's own data surface can
     register itself when it lands. */
  registerDestination('data', { url: '/economy', mount: 'pf-inflation-checkin', focus: 'pf-inf-ci-price' });
  /* BLOSSOM (2026-10-06): /peoples-cpi is the primary DATA destination;
     registered after /economy so it takes the front of the list (newest
     registration wins). /economy stays as the fallback. */
  registerDestination('data', { url: '/peoples-cpi', mount: 'pf-peoples-cpi' });
  registerDestination('act', { url: '/events', mount: 'pf-events' });
  registerDestination('organize', { url: '/cells', mount: 'pf-cells-page' });

  /* ---- DATA: the price-report / bounty quick-capture ----
     Always routes to the existing gated flow via the registry; this module
     never submits a report itself and never bypasses quorum/claim gates. */
  function dataGo() { goPillar('data'); }

  /* ---- ACT: the top activism action — call/event ---- */
  function actGo() { goPillar('act'); }

  /* ---- ORGANIZE: cell join/create ---- */
  function organizeGo() { goPillar('organize'); }

  var GO = { spread: spreadGo, data: dataGo, act: actGo, organize: organizeGo };

  function scrollToEl(el) {
    try {
      if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else el.scrollIntoView();
    } catch (e) {}
  }
  function nav(url) {
    try { window.location.href = url; } catch (e) {}
  }

  /* ---- theme: CSS custom properties (--pf-p-*), defaulting to the --pf-hud-* set ---- */
  var CSS = [
    ':root{',
    '--pf-p-bg:var(--pf-hud-bg,rgba(8,8,8,.94));--pf-p-border:var(--pf-hud-border,#2a2a2a);',
    '--pf-p-accent:var(--pf-hud-accent,#c1121f);--pf-p-text:var(--pf-hud-text,#f5ead6);',
    '--pf-p-dim:var(--pf-hud-dim,#a89e88);--pf-p-gold:var(--pf-hud-gold,#e8b33c);}',
    '#pf-pillars{border-bottom:1px solid var(--pf-p-border);padding:10px 10px 8px;}',
    '#pf-pillars-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}',
    '.pf-pillar{display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'gap:2px;min-height:56px;padding:8px 2px;background:#101010;border:1px solid var(--pf-p-border);',
    'border-radius:6px;cursor:pointer;font-family:Arial,sans-serif;color:var(--pf-p-text);}',
    '.pf-pillar:active{transform:scale(.97);}',
    '.pf-pillar .pp-g{font-size:18px;line-height:1;}',
    '.pf-pillar .pp-l{font-size:10px;font-weight:900;letter-spacing:.08em;}',
    '.pf-pillar .pp-s{font-size:8px;letter-spacing:.18em;color:var(--pf-p-dim);font-weight:700;}',
    '.pf-pillar.is-path{border-color:var(--pf-p-accent);box-shadow:0 0 0 1px var(--pf-p-accent);}',
    '.pf-pillar.is-path .pp-l{color:var(--pf-p-gold);}',
    '#pf-pillars-path{margin-top:8px;text-align:center;}',
    '#pf-pillars-path a{font-size:10px;letter-spacing:.22em;color:var(--pf-p-dim);font-weight:700;',
    'text-decoration:none;cursor:pointer;}',
    '#pf-pillars-path a:active{color:var(--pf-p-text);}',
    /* ---- adventure-path chooser ---- */
    '#pf-path-chooser{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;',
    'justify-content:center;padding:22px;box-sizing:border-box;background:rgba(0,0,0,.78);',
    'font-family:Arial,sans-serif;}',
    '#pf-path-chooser[hidden]{display:none;}',
    '.ppc-card{width:100%;max-width:420px;background:#0d0d0d;border:1px solid var(--pf-p-border);',
    'border-top:4px solid var(--pf-p-accent);padding:20px 16px 16px;box-sizing:border-box;text-align:center;}',
    '.ppc-k{font-size:10px;letter-spacing:5px;color:var(--pf-p-accent);font-weight:800;margin-bottom:6px;}',
    '.ppc-card h3{font-family:\'Arial Black\',Arial,sans-serif;font-size:22px;letter-spacing:1px;',
    'color:var(--pf-p-text);margin:0 0 6px;}',
    '.ppc-sub{font-size:13px;color:var(--pf-p-dim);line-height:1.55;margin:0 0 14px;}',
    '.ppc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}',
    '.ppc-path{background:#101010;border:1px solid var(--pf-p-border);border-radius:6px;padding:12px 6px;',
    'cursor:pointer;color:var(--pf-p-text);font-family:Arial,sans-serif;}',
    '.ppc-path:active{transform:scale(.97);border-color:var(--pf-p-accent);}',
    '.ppc-path .pp-g{font-size:24px;display:block;margin-bottom:6px;}',
    '.ppc-path .pp-n{font-size:11px;font-weight:900;letter-spacing:.06em;display:block;margin-bottom:4px;}',
    '.ppc-path .pp-b{font-size:11px;color:var(--pf-p-dim);line-height:1.4;display:block;}',
    '.ppc-path.is-sel{border-color:var(--pf-p-accent);box-shadow:0 0 0 1px var(--pf-p-accent);}',
    '.ppc-path.is-sel .pp-n{color:var(--pf-p-gold);}',
    '.ppc-path.is-sel .pp-n::after{content:" \\2713";color:var(--pf-p-gold);}',
    '.ppc-go{display:block;width:100%;margin:2px 0 6px;padding:11px;background:var(--pf-p-accent);',
    'border:none;border-radius:6px;color:#fff;font-size:12px;font-weight:900;letter-spacing:.18em;',
    'cursor:pointer;font-family:Arial,sans-serif;}',
    '.ppc-go:active{transform:scale(.98);}',
    '.ppc-skip{background:none;border:none;color:var(--pf-p-dim);font-size:11px;letter-spacing:.18em;',
    'font-weight:700;cursor:pointer;padding:8px;font-family:Arial,sans-serif;}',
    '.ppc-x{position:absolute;top:8px;right:10px;background:none;border:none;color:#777;font-size:18px;',
    'cursor:pointer;padding:6px 10px;}'
  ].join('');
  function injectCss() {
    if (document.getElementById('pf-pillars-css')) return;
    try {
      var st = document.createElement('style');
      st.id = 'pf-pillars-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---- pillar row: selected paths' pillars first (path order), then the rest ---- */
  function orderedPillars() {
    var paths = getPaths(), seen = {}, out = [];
    for (var i = 0; i < paths.length; i++) {
      var pk = PATHS[paths[i]] ? PATHS[paths[i]].pillar : null;
      if (pk) seen[pk] = 1;
    }
    for (var j = 0; j < PILLARS.length; j++) {
      if (seen[PILLARS[j].key]) out.push(PILLARS[j]);
    }
    for (var k = 0; k < PILLARS.length; k++) {
      if (!seen[PILLARS[k].key]) out.push(PILLARS[k]);
    }
    return out;
  }
  function pathNames() {
    var paths = getPaths(), out = [];
    for (var i = 0; i < paths.length; i++) out.push(PATHS[paths[i]].name);
    return out;
  }
  function renderRow() {
    var paths = getPaths(), names = pathNames();
    var html = '<div id="pf-pillars"><div id="pf-pillars-row">';
    var ps = orderedPillars();
    for (var i = 0; i < ps.length; i++) {
      var pl = ps[i];
      var isPath = paths.indexOf(pl.path) !== -1;
      html += '<button type="button" class="pf-pillar' + (isPath ? ' is-path' : '') +
        '" data-pf-pillar="' + esc(pl.key) + '" aria-label="' + esc(pl.label + ' — ' + pl.sub) + '">' +
        '<span class="pp-g" aria-hidden="true">' + esc(pl.glyph) + '</span>' +
        '<span class="pp-l">' + esc(pl.label) + '</span>' +
        '<span class="pp-s">' + esc(pl.sub) + '</span></button>';
    }
    html += '</div><div id="pf-pillars-path">' +
      (names.length
        ? '<a data-pf-path-change="1">FIGHTING AS ' + esc(names.join(' + ')) + ' \u00B7 CHANGE PATHS</a>'
        : '<a data-pf-path-change="1">PICK YOUR FIGHTS \u00B7 CHOOSE PATHS</a>') +
      '</div></div>';
    return html;
  }
  function applyPath() {
    /* Re-render the row (order + highlight) and flavor the HUD strip headline. */
    try {
      var row = document.getElementById('pf-pillars');
      if (row) {
        var wrap = document.createElement('div');
        wrap.innerHTML = renderRow();
        var fresh = wrap.firstChild;
        if (fresh && row.parentNode) row.parentNode.replaceChild(fresh, row);
        wireRow();
      }
    } catch (e) {}
    try {
      var t = document.getElementById('pf-hud-strip-title');
      if (t) {
        var names = pathNames();
        t.textContent = (names.length && names.length < PATH_KEYS.length)
          ? names.join(' + ') + ' \u00B7 YOUR CAMPAIGN'
          : 'YOUR CAMPAIGN';
      }
    } catch (e2) {}
  }
  function wireRow() {
    try {
      var btns = document.querySelectorAll('#pf-pillars [data-pf-pillar]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.addEventListener('click', function (ev) {
            try { ev.stopPropagation(); } catch (e) {}
            var k = b.getAttribute('data-pf-pillar');
            if (GO[k]) { try { GO[k](); } catch (e2) {} }
          });
        })(btns[i]);
      }
      var ch = document.querySelector('#pf-pillars [data-pf-path-change]');
      if (ch) ch.addEventListener('click', function (ev) {
        try { ev.stopPropagation(); } catch (e) {}
        openChooser();
      });
    } catch (e) {}
  }
  function mountRow(hudEl) {
    try {
      if (document.getElementById('pf-pillars')) return true;
      var strip = document.getElementById('pf-hud-strip');
      if (!strip) return false;
      var wrap = document.createElement('div');
      wrap.innerHTML = renderRow();
      var row = wrap.firstChild;
      if (!row) return false;
      /* Row first: the four pillars are the thumb-first targets. */
      if (strip.firstChild) strip.insertBefore(row, strip.firstChild);
      else strip.appendChild(row);
      wireRow();
      applyPath(); /* headline flavors in one pass */
      return true;
    } catch (e) { return false; }
  }

  /* ---- adventure-path chooser (multi-select checkboxes + confirm) ---- */
  function chooserHtml() {
    var sel = {};
    var cur = getPaths();
    for (var i = 0; i < cur.length; i++) sel[cur[i]] = 1;
    var h = '<div id="pf-path-chooser" role="dialog" aria-label="Pick your fights">' +
      '<div class="ppc-card" style="position:relative;">' +
      '<button type="button" class="ppc-x" data-pf-path-x="1" aria-label="Close">\u00d7</button>' +
      '<div class="ppc-k">ADVENTURE PATHS</div><h3>PICK YOUR FIGHTS</h3>' +
      '<p class="ppc-sub">Pick any combination \u2014 one, two, three, or all four. ' +
      'This just tunes what you see first. You can do everything, ' +
      'anytime. Change it whenever.</p><div class="ppc-grid">';
    for (var j = 0; j < PATH_KEYS.length; j++) {
      var p = PATHS[PATH_KEYS[j]];
      h += '<button type="button" class="ppc-path' + (sel[PATH_KEYS[j]] ? ' is-sel' : '') +
        '" data-pf-path-pick="' + esc(PATH_KEYS[j]) + '" aria-pressed="' +
        (sel[PATH_KEYS[j]] ? 'true' : 'false') + '">' +
        '<span class="pp-g" aria-hidden="true">' + esc(p.glyph) + '</span>' +
        '<span class="pp-n">' + esc(p.name) + '</span>' +
        '<span class="pp-b">' + esc(p.blurb) + '</span></button>';
    }
    h += '</div><button type="button" class="ppc-go" data-pf-path-confirm="1">LOCK IT IN \u2192</button>' +
      '<button type="button" class="ppc-skip" data-pf-path-skip="1">' +
      'JUST LOOKING AROUND \u2192</button></div></div>';
    return h;
  }
  function setSelVisual(b, on) {
    try {
      var c = String(b.getAttribute('class') || '');
      c = c.replace(/\s*\bis-sel\b/g, '');
      if (on) c += ' is-sel';
      b.setAttribute('class', c.replace(/^\s+|\s+$/g, ''));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    } catch (e) {}
  }
  function openChooser() {
    try {
      if (document.getElementById('pf-path-chooser')) return;
      /* 2026-10-06 (one-prompt): one overlay at a time via PF.popupQueue. */
      try {
        if (window.PF && PF.popupQueue && !PF.popupQueue.request('pillars-chooser', 'user')) return;
      } catch (e2) {}
      injectCss();
      var wrap = document.createElement('div');
      wrap.innerHTML = chooserHtml();
      var c = wrap.firstChild;
      if (!c || !document.body) {
        try { if (window.PF && PF.popupQueue) PF.popupQueue.release('pillars-chooser'); } catch (e4) {}
        return;
      }
      document.body.appendChild(c);
      var sel = {};
      var cur = getPaths();
      for (var i = 0; i < cur.length; i++) sel[cur[i]] = 1;
      function close() {
        try { if (c.parentNode) c.parentNode.removeChild(c); } catch (e) {}
        try { if (window.PF && PF.popupQueue) PF.popupQueue.release('pillars-chooser'); } catch (e3) {}
      }
      var picks = c.querySelectorAll('[data-pf-path-pick]');
      for (var j = 0; j < picks.length; j++) {
        (function (b) {
          b.addEventListener('click', function () {
            var k = b.getAttribute('data-pf-path-pick');
            if (!PATHS[k]) return;
            sel[k] = !sel[k];
            setSelVisual(b, !!sel[k]);
          });
        })(picks[j]);
      }
      var go = c.querySelector('[data-pf-path-confirm]');
      if (go) go.addEventListener('click', function () {
        var out = [];
        for (var n = 0; n < PATH_KEYS.length; n++) {
          if (sel[PATH_KEYS[n]]) out.push(PATH_KEYS[n]);
        }
        setPaths(out);
        close();
      });
      var sk = c.querySelector('[data-pf-path-skip]');
      if (sk) sk.addEventListener('click', function () {
        try { localStorage.setItem(LS_SEEN, '1'); } catch (e) {}
        close();
      });
      var x = c.querySelector('[data-pf-path-x]');
      if (x) x.addEventListener('click', function () {
        try { localStorage.setItem(LS_SEEN, '1'); } catch (e) {}
        close();
      });
    } catch (e) {}
  }

  /* ---- public API (20-nextop.js reads biasOps(): union of selected
     path biases, deduped, in path order — flavor only, never a gate) ---- */
  function biasOps() {
    try {
      var seen = {}, out = [];
      var paths = getPaths();
      for (var i = 0; i < paths.length; i++) {
        var bs = PATHS[paths[i]].bias || [];
        for (var j = 0; j < bs.length; j++) {
          if (!seen[bs[j]]) { seen[bs[j]] = 1; out.push(bs[j]); }
        }
      }
      return out;
    } catch (e) { return []; }
  }
  try {
    PF.pillars = {
      getPath: getPath,
      getPaths: getPaths,
      setPath: setPath,
      setPaths: setPaths,
      togglePath: togglePath,
      clearPath: clearPath,
      biasOps: biasOps,
      openChooser: openChooser,
      /* hubhome (2026-10-06): adventure-path display names for headline
         flavoring (e.g. "PROPAGANDIST + DATA SCOUT · YOUR CAMPAIGN"). */
      pathNames: pathNames,
      /* hubhome (2026-10-06): fire a pillar's one-click action from an
         external surface (the homepage hub hero). Same GO handlers as the
         HUD bar — no duplication. */
      go: function (k) { try { if (GO[k]) { GO[k](); return true; } } catch (e) {} return false; },
      /* Destination registry: page silos register their pillar landing
         pages at load (see the registry contract above). */
      registerDestination: registerDestination,
      destinations: destinations,
      pillars: PILLARS.map(function (pl) {
        return { key: pl.key, path: pl.path, label: pl.label, sub: pl.sub };
      })
    };
  } catch (e) {}

  /* ---- boot: extend the HUD strip once the host exists ----
     The HUD renders async (backend reads, 10s fail-open), so we watch for it.
     Hard stop at ~90s: silent no-op when the host is absent. */
  function boot() {
    injectCss();
    var hudEl = null; /* HEADER REDESIGN 2026-10-08: strip now lives in #pf-topbar-panel */
    try { hudEl = document.getElementById('pf-hud-strip'); } catch (e) {}
    if (hudEl && mountRow(hudEl)) { maybeFirstRun(); return; }
    var done = false, tries = 0;
    function found() {
      if (done) return; done = true;
      try { obs.disconnect(); } catch (e) {}
      /* The adventure-path chooser rides the HUD host: no host, no chooser —
         silent no-op per the module contract. */
      if (mountRow(document.getElementById('pf-hud-strip'))) maybeFirstRun();
    }
    var obs = null;
    try {
      obs = new MutationObserver(function () {
        try {
          if (document.getElementById('pf-hud-strip')) found();
        } catch (e) {}
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    var iv = setInterval(function () {
      tries++;
      try {
        if (document.getElementById('pf-hud-strip')) { clearInterval(iv); found(); return; }
      } catch (e2) {}
      if (tries >= 180) { /* ~90s: host absent — silent no-op */
        clearInterval(iv);
        try { if (obs) obs.disconnect(); } catch (e3) {}
      }
    }, 500);
  }
  var _firstRunFired = false;
  function maybeFirstRun() {
    /* 2026-10-06 (one-prompt): auto-fire REMOVED. The adventure chooser now
       opens only via the HUD-strip tap ([data-pf-path-change] in wireRow).
       THE ONE PROMPT owns first-run. */
    if (_firstRunFired) return; _firstRunFired = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
