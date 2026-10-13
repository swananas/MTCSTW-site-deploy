/* core/45-butter-sitewide.js | PF v1.4.3 | ZUCK BUTTER SITE-WIDE ENGINE (WS-A, dir-20261010-010215-1757).
   WS-D butter spec (zuck-butter-proposal-20261010.md §B1) as runtime behavior.
   - Ink ripple on every tap (touch-point origin, 400ms, DOM-removed on animationend, max 1 per tap)
   - Mount stagger on [data-butter-stagger] children — FIRST PAINT ONLY (sessionStorage marker; never replays on back-nav)
   - Tappable-figure auto-wire: [data-pf-fig] → dotted-underline convention + tap opens PF.drillSheet
   - PF.butter.toast (safe-area aware), PF.butter.burst (launch burst, 8-12 particles)
   - Honors prefers-reduced-motion (CSS kills motion; JS skips ripple/burst creation)
   Extends (does not duplicate) the Psych-cleared dopamine module (08-dopamine.js)
   and 44-button-butter.css tier system. Fail-open: never blocks navigation.
   KILL: ?pf_off=butter-sitewide or localStorage pf_disabled_v1='["butter-sitewide"]'
   -------------------------------------------------------------------------- */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('butter-sitewide')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var B = PF.butter = PF.butter || {};

  /* ---------------- toast (safe-area, ≤2.2s) ---------------- */
  var toastEl = null, toastT = null;
  B.toast = function (msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'bt-toast';
        toastEl.setAttribute('role', 'status');
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = String(msg == null ? '' : msg);
      toastEl.classList.add('bt-show');
      clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl.classList.remove('bt-show'); }, 2200);
    } catch (e) {}
  };

  /* ---------------- ink ripple: max 1 element per tap ---------------- */
  function spawnRipple(target, x, y) {
    if (reduced) return;
    try {
      var rect = target.getBoundingClientRect();
      var d = Math.max(rect.width, rect.height) * 1.1;
      var r = document.createElement('span');
      r.className = 'bt-ripple';
      r.style.width = r.style.height = d + 'px';
      r.style.left = (x - rect.left) + 'px';
      r.style.top = (y - rect.top) + 'px';
      if (getComputedStyle(target).position === 'static') target.classList.add('bt-ripple-host');
      target.appendChild(r);
      r.addEventListener('animationend', function () { r.remove(); });
      setTimeout(function () { try { r.remove(); } catch (e) {} }, 600); /* safety net */
    } catch (e) {}
  }

  /* ---------------- launch burst: 8-12 particles, DOM-removed ---------------- */
  B.burst = function (x, y, n) {
    if (reduced) return;
    try {
      n = Math.min(12, Math.max(8, n || 10));
      for (var i = 0; i < n; i++) {
        (function () {
          var p = document.createElement('span');
          p.className = 'bt-particle';
          var ang = (Math.PI * 2 * i) / n + Math.random() * .5;
          var dist = 40 + Math.random() * 50;
          p.style.left = x + 'px'; p.style.top = y + 'px';
          p.style.setProperty('--bt-dx', Math.cos(ang) * dist + 'px');
          p.style.setProperty('--bt-dy', (Math.sin(ang) * dist - 50) + 'px');
          document.body.appendChild(p);
          p.addEventListener('animationend', function () { p.remove(); });
          setTimeout(function () { try { p.remove(); } catch (e) {} }, 900);
        })();
      }
    } catch (e) {}
  };

  /* ---------------- confirm glow (≤300ms, never delays navigation) ---------------- */
  B.glow = function (el) {
    try {
      el.classList.remove('bt-glow');
      void el.offsetWidth; /* restart */
      el.classList.add('bt-glow');
      setTimeout(function () { el.classList.remove('bt-glow'); }, 320);
    } catch (e) {}
  };

  /* Tap handler: press state is CSS; ripple is JS (touch-point origin). */
  function isInteractive(el) {
    if (!el || !el.closest) return false;
    var t = el.closest('a,button,[role="button"],[data-pf-fig],input[type="submit"],input[type="button"]');
    return !!t;
  }
  document.addEventListener('pointerdown', function (e) {
    try {
      var t = isInteractive(e.target);
      if (!t) return;
      if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      spawnRipple(t, e.clientX, e.clientY);
    } catch (err) {}
  }, { passive: true });

  /* ---------------- mount stagger: first paint only ---------------- */
  function runStagger() {
    try {
      var hosts = document.querySelectorAll('[data-butter-stagger]');
      for (var i = 0; i < hosts.length; i++) {
        (function (h) {
          var key = 'bt_stagger_' + (location.pathname || '/');
          var done = false;
          try { done = sessionStorage.getItem(key) === '1'; } catch (e) {}
          if (done) { h.classList.add('bt-stagger-done'); return; }
          if (reduced) { h.classList.add('bt-stagger-done'); return; }
          var kids = h.children;
          for (var k = 0; k < kids.length && k < 8; k++) {
            kids[k].style.animationDelay = [0, 120, 200, 240, 320, 400, 480][Math.min(k, 6)] + 'ms';
          }
          try { sessionStorage.setItem(key, '1'); } catch (e) {}
          /* lock after first paint so back-nav never replays */
          setTimeout(function () { h.classList.add('bt-stagger-done'); }, 1400);
        })(hosts[i]);
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStagger);
  } else { runStagger(); }

  /* ---------------- tappable-figure auto-wire ----------------
     Convention: <span data-pf-fig="3.1B" data-pf-unit="..." data-pf-source="..."
     data-pf-chain="step1|step2" data-pf-ask="Boeing penalties"> → dotted
     underline + chevron, tap opens PF.drillSheet. No dotted underline =
     not tappable (WS-D global convention). Fail-open: if drillSheet is
     killed, figures render as plain text. */
  B.wireFigures = function (root) {
    try {
      var scope = root || document;
      var figs = scope.querySelectorAll('[data-pf-fig]');
      for (var i = 0; i < figs.length; i++) {
        (function (el) {
          if (el.getAttribute('data-butter-wired')) return;
          el.setAttribute('data-butter-wired', '1');
          el.classList.add('bt-tappable-fig');
          el.setAttribute('role', 'button');
          el.setAttribute('tabindex', '0');
          el.addEventListener('click', function (e) {
            e.stopPropagation();
            openFigSheet(el);
          });
          el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFigSheet(el); }
          });
        })(figs[i]);
      }
    } catch (e) {}
  };

  function openFigSheet(el) {
    if (!PF.drillSheet) return; /* fail-open: figure stays plain text */
    var d = el.dataset || {};
    var chain = String(d.pfChain || '').split('|').filter(function (s) { return s.trim(); });
    var splits = [];
    try { splits = JSON.parse(d.pfSplits || '[]'); } catch (e) {}
    PF.drillSheet.show({
      figure: d.pfFig || el.textContent.trim(),
      unit: d.pfUnit || '',
      asOf: d.pfAsOf || '',
      chain: chain,
      splits: splits,
      ask: d.pfAsk || '',
      deployText: d.pfDeployText || ''
    });
  }

  /* Observe late-mounted DOM (page modules render after bundle load). */
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var n = muts[i];
        if (n.type === 'childList') B.wireFigures(document);
      }
    });
    var startObs = function () {
      try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
      B.wireFigures(document);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObs);
    else startObs();
    /* debounce: wireFigures is idempotent (data-butter-wired guard) */
  } catch (e) { B.wireFigures(document); }

  /* Mark the butter context for CSS scoping on PF shells. */
  try {
    var boot = document.getElementById('pf-boot');
    if (boot) boot.setAttribute('data-butter', '1');
  } catch (e) {}
})();
