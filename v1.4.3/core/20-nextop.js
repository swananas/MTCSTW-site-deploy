/* core/20-nextop.js  |  PF v1.4.3 | NEXT OP (S4) — context-aware next-action card.
   Every page ends with the single best thing to do next, personalized to
   what the visitor hasn't done today. No page is a dead end.
   FRONTEND-ONLY, ZERO NEW XP — pure routing. Reads compose the existing
   reads: dopamine_status (loot + streak + flash), streak_status,
   cell_mine, xp_today. No new backend actions, no writes of any kind.
   Mount: inserted in-flow immediately BEFORE the site footer element, i.e.
   below the page's primary content and above the injected footer chrome
   (crossnav strip / DELETE MY DATA / nuke meter). Retries until a footer
   lands (Squarespace lazy-renders footers on commerce + system pages).
   LAYERING: core-level UI injection, same pattern as 16-footer.js /
   19-crossnav.js. No page dependency — runs on every page, v2 and v1.1.0.
   (On v1.1.0-branch pages it ships in core/bundle-footer-chrome.js, which
   carries the same minimum runtime: PF bus + backend URL + identity.)
   KILL: ?pf_off=nextop  or  localStorage pf_disabled_v1='["nextop"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('nextop')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET for reads. Routed through PF.authGetJSONP when present (gated
     reads self-heal auth like the other silos); plain JSONP fallback. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
      if (_sec && params && !params.auth_secret) params.auth_secret = _sec;
    } catch (e2) {}
    var fn = 'pfNoCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* ---- page detection: mount-div ids first, path fallback ---- */
  var PAGE_IDS = ['pf-v2', 'pf-arcade', 'pf-cells-page', 'pf-create', 'pf-bank',
    'pf-economy', 'pf-warchest', 'pf-ventures', 'pf-events', 'pf-warreport',
    'pf-catalog', 'pf-slr-roster', 'pf-war-card', 'pf-political-hq'];
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
        '/sick-left-radicals': 'pf-slr-roster' };
      if (map[p]) return map[p];
    } catch (e) {}
    return 'default';
  }

  /* ---- op catalog: {ready, done} evaluated against state; first not-done wins ---- */
  var OPS = {
    streakrisk: {
      title: 'STREAK AT RISK', cta: 'SAVE IT \u2192', href: '/',
      ready: function (st) { return st.streakRisk !== null; },
      done: function (st) { return !st.streakRisk; },
      sub: function (st) { return 'Last chance \u2014 check in before midnight Chicago or the streak breaks.'; }
    },
    loot: {
      title: 'THE CRATE IS LOADED', cta: 'OPEN THE CRATE \u2192', href: '/',
      ready: function (st) { return st.lootClaimed !== null; },
      done: function (st) { return st.lootClaimed; },
      sub: function (st) { return 'Today\u2019s supply crate sits unclaimed. Midnight Chicago, it resets.'; }
    },
    streak: {
      title: 'PROTECT THE STREAK', cta: 'CHECK IN \u2192', href: '/',
      ready: function (st) { return st.streakChecked !== null; },
      done: function (st) { return st.streakChecked; },
      sub: function (st) {
        return (st.streakCount > 0 ? st.streakCount + '-day streak. ' : '') +
          'One tap keeps it alive.';
      }
    },
    /* W2-D4 (Wave 6B): "cells hiring" rule — cell-less users get a cells op.
       (The cellnone rule already existed; retitled to the hiring framing.) */
    cellnone: {
      title: 'CELLS ARE HIRING', cta: 'FIND YOUR CELL \u2192', href: '/cells',
      ready: function (st) { return st.cellIn !== null; },
      done: function (st) { return st.cellIn; },
      sub: function (st) { return 'No cell, no squad XP. Join one or build your own.'; }
    },
    cellcheck: {
      title: 'YOUR CELL NEEDS YOU', cta: 'CHECK IN \u2192', href: '/cells',
      ready: function (st) { return st.cellIn !== null && st.cellChecked !== null; },
      done: function (st) { return !st.cellIn || st.cellChecked; },
      sub: function (st) { return 'Your cell hasn\u2019t checked in today. First tap starts the cell streak.'; }
    },
    xpzero: {
      title: 'ZERO XP ON THE BOARD', cta: 'MAKE SOMETHING \u2192', href: '/create',
      ready: function (st) { return st.xpToday !== null; },
      done: function (st) { return st.xpToday > 0; },
      sub: function (st) { return 'The meter is counting and you\u2019re flat. Forge one poster.'; }
    },
    flash: {
      title: 'FLASH MULTIPLIER LIVE', cta: 'RIDE THE FLASH \u2192', href: '/',
      ready: function (st) { return st.flashKnown; },
      done: function (st) { return !st.flash; },
      sub: function (st) {
        return st.flash ? esc(st.flash.label || 'Flash event') + ' \u00D7' + (st.flash.mult || 2) +
          ' \u2014 ride it before it burns out.' : '';
      }
    },
    matchquiz: {
      title: 'FIND YOUR SLR MATCH', cta: 'TAKE THE QUIZ \u2192', href: '/arcade',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '5 questions. 3 creator matches. Know your lane.'; }
    },
    roster: {
      title: 'SCOUT THE ROSTER', cta: 'MEET THE RADICALS \u2192', href: '/sick-left-radicals',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '62 fighters strong. Find the one you\u2019d go to war with.'; }
    },
    recruit: {
      title: 'RECRUIT ONE SOLDIER', cta: 'GET YOUR LINK \u2192', href: '/cells',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '+75 XP per recruit. Your cell grows, your war chest grows.'; }
    }
  };
  /* Per-page priority lists. Ops whose read failed are skipped (fail-open to
     the next op); circulation ops (matchquiz/roster/recruit) are always
     ready, so the card can never be a dead end. */
  var ORDER = {
    'pf-v2': ['streakrisk', 'loot', 'streak', 'cellcheck', 'cellnone', 'flash', 'xpzero', 'matchquiz'],
    'pf-arcade': ['streakrisk', 'loot', 'streak', 'matchquiz', 'cellcheck', 'xpzero'],
    'pf-cells-page': ['cellnone', 'cellcheck', 'streakrisk', 'streak', 'loot', 'recruit'],
    'pf-create': ['xpzero', 'streakrisk', 'loot', 'streak', 'cellcheck', 'matchquiz'],
    'pf-bank': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'pf-economy': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'pf-warchest': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'roster'],
    'pf-ventures': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'pf-events': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'pf-warreport': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'pf-catalog': ['streakrisk', 'loot', 'streak', 'matchquiz', 'roster'],
    'pf-slr-roster': ['matchquiz', 'roster', 'streakrisk', 'loot', 'streak'],
    'pf-war-card': ['cellcheck', 'cellnone', 'streakrisk', 'loot', 'recruit'],
    'pf-political-hq': ['streakrisk', 'loot', 'streak', 'cellcheck', 'xpzero', 'matchquiz'],
    'default': ['streakrisk', 'loot', 'streak', 'cellcheck', 'cellnone', 'xpzero', 'matchquiz']
  };
  function pickOp(st) {
    var order = ORDER[pageKey()] || ORDER['default'];
    for (var i = 0; i < order.length; i++) {
      var op = OPS[order[i]];
      if (!op) continue;
      try {
        if (op.ready(st) && !op.done(st)) return op;
      } catch (e) {}
    }
    return OPS.matchquiz;
  }

  /* ---- state assembly (reads only; every failure degrades to a skipped op) ---- */
  function loadState(id, cb) {
    var st = {
      lootClaimed: null, streakCount: 0, streakChecked: null, streakRisk: null,
      cellIn: null, cellChecked: null, xpToday: null, flash: null, flashKnown: false
    };
    var pending = 4, guarded = false;
    /* Terminal: never leave the card waiting — every read path converges
       here exactly once, failures included (skipped ops fail open). */
    function fin() { if (guarded) return; guarded = true; cb(st); }
    function one() { if (--pending <= 0) fin(); }
    setTimeout(fin, 12000);
    api('dopamine_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          if (j.loot && j.loot.claimed_today !== undefined) st.lootClaimed = !!j.loot.claimed_today;
          if (j.streak) {
            st.streakCount = Number(j.streak.count || 0);
            st.streakRisk = !!j.streak.at_risk;
          }
          st.flashKnown = true;
          if (j.flash && j.flash.length) st.flash = { label: j.flash[0].label, mult: j.flash[0].multiplier };
        }
      } catch (e) {}
      one();
    });
    api('streak_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok && j.checked_in_today !== undefined) st.streakChecked = !!j.checked_in_today;
        if (j && j.ok && st.streakRisk === null && j.at_risk !== undefined) st.streakRisk = !!j.at_risk;
      } catch (e) {}
      one();
    });
    api('cell_mine', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          st.cellIn = !!j.in_cell;
          var cells = j.cells || [];
          if (cells.length && cells[0].checked_today !== undefined) st.cellChecked = !!cells[0].checked_today;
          else if (j.members) {
            for (var i = 0; i < j.members.length; i++) {
              if (String(j.members[i].callsign || '').toLowerCase() === String(id.callsign).toLowerCase() &&
                  j.members[i].checked_today !== undefined) {
                st.cellChecked = !!j.members[i].checked_today; break;
              }
            }
          }
        }
      } catch (e) {}
      one();
    });
    api('xp_today', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok && j.xp_today !== undefined) st.xpToday = Number(j.xp_today) || 0;
      } catch (e) {}
      one();
    });
  }

  /* ---- card ---- */
  function cardHtml(op, st) {
    return '<div id="pf-nextop" style="max-width:720px;margin:28px auto;padding:0;background:#0a0a0a;' +
      'border:1px solid #333;border-top:4px solid #c1121f;box-sizing:border-box;' +
      'font-family:Arial,sans-serif;text-align:center;">' +
      '<div style="padding:20px 18px 18px;">' +
      '<div style="font-size:11px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;">NEXT OP</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:22px;letter-spacing:1px;' +
      'color:#f5ead6;margin:0 0 8px;">' + esc(op.title) + '</div>' +
      '<div style="font-size:14px;color:#a89e88;line-height:1.55;margin:0 0 14px;">' + esc(op.sub(st)) + '</div>' +
      '<a href="' + esc(op.href) + '" style="display:inline-block;background:#c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:0.12em;font-size:13px;text-decoration:none;' +
      'padding:12px 26px;border:2px solid #c1121f;">' + esc(op.cta) + '</a>' +
      '</div></div>';
  }

  /* ---- mount: in-flow, immediately before the site footer ---- */
  var FOOTER_SEL_ARR = [
    'footer', '.Footer', '#footer', '#footer-sections', '.Footer-inner',
    '.Footer-blocks', '[role="contentinfo"]', '.site-footer', '#site-footer',
    'section[class*="footer"]', 'section[class*="Footer"]',
    'div[class*="Footer"]', '[data-section-id*="footer" i]'
  ];
  var FOOTER_SELS = FOOTER_SEL_ARR.filter(function (sel) {
    try { document.querySelectorAll(sel); return true; } catch (e) { return false; }
  }).join(', ');
  function findFooter() {
    try {
      var fs = document.querySelectorAll(FOOTER_SELS);
      if (fs && fs.length) return fs[0];
    } catch (e) {}
    return null;
  }
  function place(html) {
    if (document.getElementById('pf-nextop')) return true;
    var footer = findFooter();
    if (!footer || !footer.parentNode) return false;
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var card = wrap.firstChild;
    try { footer.parentNode.insertBefore(card, footer); } catch (e) { return false; }
    return true;
  }
  function mount(html) {
    if (place(html)) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (place(html) || tries >= 120) clearInterval(iv);
    }, 500);
    /* MutationObserver: catch footers added after the poll (SPA navigations,
       lazy commerce footers, deferred system-page chrome). */
    try {
      var obs = new MutationObserver(function () {
        if (place(html) && obs) { try { obs.disconnect(); } catch (e2) {} }
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    } catch (e2) {}
  }

  /* ---- boot ---- */
  function boot(op) {
    try { mount(cardHtml(op, op.__st)); }
    catch (e) { try { PF.error('nextop', 'mount failed :: ' + (e && e.message || e)); } catch (e2) {} }
  }
  var id = ident();
  if (!id.callsign) {
    /* Anonymous: no reads at all — one enlist op, no dead end. */
    var enlist = {
      title: 'YOUR FIRST OP: ENLIST', cta: 'ENLIST \u2192', href: '/',
      sub: function () { return 'Claim your callsign. Your XP follows it everywhere.'; }
    };
    enlist.__st = {};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(enlist); });
    else boot(enlist);
    return;
  }
  loadState(id, function (st) {
    var op = pickOp(st);
    op.__st = st;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(op); });
    else boot(op);
  });
})();
