/* games/flash-siren.js  |  PF v1.4.3 | A2 Flash Siren (Wave 3).
   Site-wide siren banner before flash XP multipliers go live (warning
   window from flash_create.siren_minutes, default 15 min) plus the
   operation pre-launch siren. Contracts ALLFRONTS_CONTRACTS.md §5/§8/§10:
   the operation `upcoming` flag is the single source of truth (never
   recomputed from starts_at); the operation siren wins the banner slot
   over standalone flash sirens; at operation go-live the siren hands off
   to the operation banner (never double-renders with #pf-af-bar).
   One siren at a time, ever. FRONTEND-ONLY, ZERO NEW XP — the recruit
   bounty doubling is server-side (referral_activate via xpGrant caps).
   Countdown ticks client-side from starts_at (re-reads at 30s TTL only
   refresh state). Bell ping once per siren id (localStorage seen list).
   Fail-silent everywhere: a dead read or render throw never breaks the page.
   KILL: ?pf_off=siren  or  localStorage pf_disabled_v1='["siren"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('siren')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev';
  var POLL_MS = 30000;      /* re-read state at 30s TTL — refresh only, never the ticking number */
  var SEEN_KEY = 'pf_siren_seen_v1';
  var DISMISS_KEY = 'pf_siren_dismissed';
  var SEEN_CAP = 50;

  var flashState = null;    /* last flash_list payload */
  var siren = null;         /* current siren {kind:'op'|'flash', id, name, starts_at} or null */
  var padSet = false;
  var _opCache = { t: 0, v: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET helper. Mirrors core/21-allfronts.js. */
  function api(action, params, cb) {
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    var fn = 'pfSirenCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e3) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    try {
      for (var k in params) q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    } catch (e4) {}
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    s.async = true;
    try { document.head.appendChild(s); } catch (e5) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000); /* 12s backstop */
  }

  /* operation_status read: reuse window.PFOperation when present (contract
     §8 shared cache), else a defensive cached reader. Any failure degrades
     to {live:false, upcoming:false} — missing-partner no-op. */
  function readOpStatus(cb) {
    try {
      var PO = window.PFOperation;
      if (PO) {
        var v = null;
        if (typeof PO.status === 'function') v = PO.status();
        else if (typeof PO.getStatus === 'function') v = PO.getStatus();
        else if (PO.latest) v = PO.latest;
        if (v) { cb(v); return; }
      }
    } catch (e) {}
    var now = Date.now();
    if (_opCache.v && (now - _opCache.t) < POLL_MS) { cb(_opCache.v); return; }
    api('operation_status', {}, function (j) {
      var out = { live: false, upcoming: false };
      try { if (j && typeof j === 'object') out = j; } catch (e2) {}
      _opCache.t = Date.now(); _opCache.v = out;
      cb(out);
    });
  }

  function normOp(j) {
    var live = false, upcoming = false, name = '', startsAt = 0;
    try {
      if (j && typeof j === 'object') {
        live = j.live === true;
        upcoming = j.upcoming === true; /* single source of truth — never recomputed */
        name = String(j.name || '');
        startsAt = Number(j.starts_at) || 0;
      }
    } catch (e) {}
    if (live) upcoming = false; /* contract §10.8: live wins over upcoming */
    return { live: live, upcoming: upcoming, name: name, starts_at: startsAt };
  }

  /* Standalone flash siren pick: backend `siren` flags are authoritative;
     fall back to client derivation only for pre-A2 backends. One siren at
     a time — soonest starts_at wins. */
  function pickFlashSiren(now) {
    try {
      var ev = (flashState && flashState.events) || [];
      var best = null;
      for (var i = 0; i < ev.length; i++) {
        var r = ev[i] || {};
        var isSiren = (r.siren === true);
        if (r.siren !== true && r.siren !== false) {
          var sm = (r.siren_minutes == null) ? 15 :
            Math.max(0, Math.min(60, Number(r.siren_minutes) || 0));
          isSiren = r.starts_at > now && r.starts_at <= now + sm * 60000;
        }
        if (!isSiren) continue;
        if (!best || (r.starts_at || 0) < (best.starts_at || 0)) best = r;
      }
      if (!best) return null;
      return { kind: 'flash',
        id: 'flash:' + String(best.id || best.title || ''),
        name: best.title || 'FLASH EVENT',
        starts_at: Number(best.starts_at) || now };
    } catch (e) { return null; }
  }

  function seenIds() {
    try {
      var a = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
      return (a && a.length) ? a : [];
    } catch (e) { return []; }
  }
  function markSeen(id) {
    try {
      var a = seenIds();
      if (a.indexOf(id) === -1) {
        a.push(id);
        while (a.length > SEEN_CAP) a.shift();
        localStorage.setItem(SEEN_KEY, JSON.stringify(a));
      }
    } catch (e) {}
  }

  function bellPing() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e2) {}
      var t = ctx.currentTime;
      for (var i = 0; i < 3; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = 740;
        var t0 = t + i * 0.28;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.26);
      }
    } catch (e) {}
  }

  function fmtLeft(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return (h > 0 ? h + ':' + p(m) : p(m)) + ':' + p(sec);
  }

  function dismissed(id) {
    try { return sessionStorage.getItem(DISMISS_KEY) === id; } catch (e) { return false; }
  }

  /* The operation banner owns the slot while visible — never double-render. */
  function afBarVisible() {
    try {
      var b = document.getElementById('pf-af-bar');
      return !!(b && b.offsetHeight > 0);
    } catch (e) { return false; }
  }

  function setPad(on) {
    try {
      if (on) {
        var bar = document.getElementById('pf-siren-bar');
        if (bar) { document.body.style.paddingTop = bar.offsetHeight + 'px'; padSet = true; }
      } else if (padSet) {
        document.body.style.paddingTop = '';
        padSet = false;
      }
    } catch (e) {}
  }

  function ensureCss() {
    if (document.getElementById('pf-siren-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-siren-css';
    st.textContent =
      '#pf-siren-bar{position:fixed;top:0;left:0;right:0;z-index:9002;' +
      'background:#2b0a0a;color:#ffd166;font-family:monospace;' +
      'border-bottom:2px solid #c1121f;box-shadow:0 4px 18px rgba(193,18,31,.55);' +
      'font-size:13px;line-height:1.4;padding:8px 44px 8px 12px;text-align:center;' +
      'animation:pfSirenPulse 1.2s ease-in-out infinite}' +
      '@keyframes pfSirenPulse{0%,100%{box-shadow:0 4px 18px rgba(193,18,31,.35)}' +
      '50%{box-shadow:0 4px 26px rgba(193,18,31,.8)}}' +
      '#pf-siren-bar b{color:#ff595e}' +
      '#pf-siren-bar a{color:#ffd166;font-weight:bold;text-decoration:underline;white-space:nowrap}' +
      '#pf-siren-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);' +
      'background:none;border:1px solid #ffd166;color:#ffd166;cursor:pointer;' +
      'font-size:14px;line-height:1;padding:2px 8px;border-radius:3px}' +
      '@media(max-width:600px){#pf-siren-bar{font-size:11px;padding:6px 40px 6px 8px}}';
    try { document.head.appendChild(st); } catch (e) {}
  }

  function copyFor(c) {
    var clock = '<b data-siren="left">' + fmtLeft(c.starts_at - Date.now()) + '</b>';
    if (c.kind === 'op') {
      return '&#9888; FLASH SIREN — OPERATION <b>' + esc(c.name) + '</b> LAUNCHES IN ' + clock +
        ' <a href="/#pf-brief">RALLY YOUR CELL &#8594;</a>';
    }
    return '&#9888; FLASH SIREN — <b>' + esc(c.name) + '</b> IN ' + clock +
      ' <a href="/#pf-brief">GET READY &#8594;</a>';
  }

  function render() {
    try {
      var bar = document.getElementById('pf-siren-bar');
      var show = !!(siren && !dismissed(siren.id) && !afBarVisible());
      if (!show) {
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        setPad(false);
        return;
      }
      ensureCss();
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pf-siren-bar';
        bar.setAttribute('role', 'alert');
        var x = document.createElement('button');
        x.id = 'pf-siren-x';
        x.setAttribute('aria-label', 'Dismiss');
        x.textContent = '×';
        x.onclick = function () {
          try { if (siren) sessionStorage.setItem(DISMISS_KEY, siren.id); } catch (e3) {}
          render();
        };
        bar.appendChild(x);
        var span = document.createElement('span');
        span.id = 'pf-siren-msg';
        bar.insertBefore(span, x);
        try { document.body.insertBefore(bar, document.body.firstChild); } catch (e4) { return; }
      }
      var msg = document.getElementById('pf-siren-msg');
      if (msg) msg.innerHTML = copyFor(siren);
      setPad(true);
    } catch (e5) { /* fail silent — never break the page */ }
  }

  function setSiren(cand) {
    try {
      var prevId = siren ? siren.id : null;
      var nextId = cand ? cand.id : null;
      siren = cand;
      if (nextId && nextId !== prevId) {
        /* new siren started — ping once per id */
        if (seenIds().indexOf(nextId) === -1) {
          bellPing();
          markSeen(nextId);
        }
      }
      render();
    } catch (e) {}
  }

  /* Per-second tick: countdown recomputed client-side from starts_at.
     Rolled past go-live → re-read state (the siren is over, hand off). */
  function tick() {
    try {
      if (!siren) return;
      var bar = document.getElementById('pf-siren-bar');
      if (!bar || dismissed(siren.id)) { render(); return; }
      var el = bar.querySelector('[data-siren="left"]');
      if (el) el.textContent = fmtLeft(siren.starts_at - Date.now());
      if (Date.now() >= siren.starts_at) refresh();
    } catch (e) {}
  }

  function decide() {
    try {
      var op = _lastOp || { live: false, upcoming: false, name: '', starts_at: 0 };
      if (op.live) { setSiren(null); return; }       /* go-live: hand off to the operation banner */
      var cand = null;
      if (op.upcoming) {
        /* contract §5: operation siren wins the banner slot */
        cand = { kind: 'op',
          id: 'op:' + String(op.name) + ':' + String(op.starts_at),
          name: op.name || 'OPERATION',
          starts_at: op.starts_at || Date.now() };
      } else {
        cand = pickFlashSiren(Date.now());
      }
      setSiren(cand);
    } catch (e) { setSiren(null); }
  }

  var _lastOp = { live: false, upcoming: false, name: '', starts_at: 0 };

  function refresh() {
    try {
      if (window.PF && PF.hidden && PF.hidden()) return; /* background tab: skip */
    } catch (e) {}
    var got = 0;
    function maybe() { got++; if (got >= 2) decide(); }
    api('flash_list', {}, function (j) {
      try { flashState = (j && typeof j === 'object') ? j : null; } catch (e2) {}
      maybe();
    });
    readOpStatus(function (j) {
      try { _lastOp = normOp(j); } catch (e3) { _lastOp = { live: false, upcoming: false, name: '', starts_at: 0 }; }
      maybe();
    });
  }

  try {
    refresh();
    setInterval(refresh, POLL_MS);
    setInterval(tick, 1000);
  } catch (e) {}
})();
