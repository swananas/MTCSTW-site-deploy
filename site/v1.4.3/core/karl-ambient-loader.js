/* core/karl-ambient-loader.js | PF v1.4.3 | KARL AMBIENT — loader.
   CEO directive 2026-10-12: "Karl doesn't need to be a place you go.
   Karl just needs to be something that can be interacted with in a
   very simple easy way."

   This is the ENTIRE always-on footprint: one slim "Ask Karl" pill.
   Karl's real weight (karl-ambient.js, ~15KB with its CSS) loads ONLY
   on first tap — zero cost for everyone who never taps.

   Self-contained on purpose: no window.PF dependency (pf-faces.js
   overwrites window.PF on some pages). Injected right after the
   pf-faces.js tag on every page (scripts/inject-karl-ambient.py).

   Skips: /karl itself (the deep workspace IS Karl — no door needed on
   the room you're standing in), editor/config paths, and pages with
   #pf-karl-home (the homepage already carries Karl + its own fab —
   there the API below scrolls to it instead of stacking a second pill).
   KILL: ?pf_off=karl-ambient or localStorage pf_disabled_v1 ∋ 'karl-ambient'.

   API: window.PFKarlAmbient.open(question?) / .ask(question) / .close()
   Any element with [data-karl-ask] (optionally data-karl-ask="question")
   opens Karl on click — future surfaces hook in with one attribute. */
(function () {
  'use strict';
  if (window.PFKarlAmbient) return;

  function disabled() {
    try {
      if (/[?&]pf_off=[^&]*karl-ambient/.test(location.search)) return true;
      var d = JSON.parse(localStorage.getItem('pf_disabled_v1') || '[]');
      if (d && d.indexOf && d.indexOf('karl-ambient') !== -1) return true;
    } catch (e) {}
    return false;
  }
  if (disabled()) return;

  var path = location.pathname || '/';
  if (/^\/karl(\/|$)/.test(path)) return;
  if (path.indexOf('/config/') !== -1) return;

  var modPromise = null;
  function loadModule() {
    if (window.PFKarlAmbient && window.PFKarlAmbient._full) return Promise.resolve();
    if (modPromise) return modPromise;
    modPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = '/v1.4.3/core/karl-ambient.js';
      s.onload = function () { res(); };
      s.onerror = function () { modPromise = null; rej(new Error('karl-ambient load failed')); };
      document.head.appendChild(s);
    });
    return modPromise;
  }

  function open(q) {
    var home = document.querySelector('#pf-karl-home');
    if (home && !document.querySelector('.pf-ka-pill')) {
      /* Homepage: Karl already lives here — go to him, don't stack UI. */
      try { home.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      var inp = home.querySelector('textarea, input[type="text"]');
      if (inp) { try { inp.focus({ preventScroll: true }); } catch (e) {} if (q) inp.value = q; }
      return;
    }
    loadModule().then(function () {
      if (window.PFKarlAmbient && window.PFKarlAmbient._full) window.PFKarlAmbient.open(q);
    }).catch(function () {});
  }

  window.PFKarlAmbient = {
    open: open,
    ask: function (q) { open(q); },
    close: function () {
      if (window.PFKarlAmbient && window.PFKarlAmbient._full) window.PFKarlAmbient.close();
    }
  };

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-karl-ask]') : null;
    if (t) { e.preventDefault(); open(t.getAttribute('data-karl-ask') || undefined); }
  });

  function renderPill() {
    if (document.querySelector('#pf-karl-home')) return; /* homepage has its own */
    if (document.querySelector('.pf-ka-pill')) return;
    var st = document.createElement('style');
    st.textContent =
      '.pf-ka-pill{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 76px);z-index:9400;' +
      'display:flex;align-items:center;gap:8px;background:#141414;color:#f5f0e6;border:1px solid #2c2c2c;' +
      'border-radius:999px;padding:11px 17px 11px 14px;font:700 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;' +
      'letter-spacing:.4px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.42);touch-action:manipulation;' +
      '-webkit-tap-highlight-color:rgba(255,255,255,.15);transform:translateZ(0)}' +
      '.pf-ka-pill:active{transform:scale(.95)}' +
      '.pf-ka-pill .dot{width:9px;height:9px;border-radius:50%;background:#e5383b;flex:0 0 auto;' +
      'box-shadow:0 0 9px rgba(229,56,59,.75)}' +
      '@media(min-width:760px){.pf-ka-pill{bottom:22px;right:20px}}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-ka-pill';
    b.setAttribute('aria-label', 'Ask Karl');
    b.innerHTML = '<span class="dot"></span>Ask Karl';
    b.addEventListener('click', function () { open(); });
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPill);
  else renderPill();
})();
