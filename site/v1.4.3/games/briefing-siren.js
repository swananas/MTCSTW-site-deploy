/* games/briefing-siren.js  |  PF v1.4.3 | W5-2 MIDNIGHT BRIEFING siren banner.
   Site-wide countdown banner for the daily briefing window: siren phase
   ("MIDNIGHT BRIEFING IN 14:32") before the window opens and a live variant
   ("MIDNIGHT BRIEFING LIVE — 1:12:44 LEFT") while it runs. Composes with
   the Wave 3 Flash Siren (games/flash-siren.js) — it does NOT touch it:
   own element id (#pf-briefing-bar), own CSS, and it yields the top slot
   whenever #pf-siren-bar is visible (A2 contract: one siren at a time).
   Reads: GET op_briefing_status (public JSONP) — server evaluates the
   window in America/Chicago; the banner NEVER trusts client time. Countdown
   ticks client-side from starts_in_s / ends_in_s; re-reads at 30s TTL only
   refresh state. Bell ping once per Chicago day per phase (localStorage
   seen list). FRONTEND-ONLY, ZERO NEW XP.
   Deploy: self-mounting site-wide chrome — ship it in the same slot as
   games/flash-siren.js (coordinator: add to the footer loader / sitewide
   bundle list alongside flash-siren.js).
   KILL: ?pf_off=briefing  or  localStorage pf_disabled_v1='["briefing"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('briefing')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL ;
  var POLL_MS = 30000;      /* re-read state at 30s TTL — refresh only, never the ticking number */
  var SEEN_KEY = 'pf_briefing_seen_v1';
  var DISMISS_KEY = 'pf_briefing_dismissed';
  var SEEN_CAP = 30;

  var phase = null;   /* 'siren' | 'live' | null */
  var leftS = 0;      /* seconds remaining in the phase, ticked client-side */
  var padSet = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET helper. Mirrors games/flash-siren.js. */
  function api(action, params, cb) {
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    var fn = 'pfBriefingCb' + Math.floor(Math.random() * 1e9);
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
      for (var i = 0; i < 2; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = 880;
        var t0 = t + i * 0.35;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.32);
      }
    } catch (e) {}
  }

  function fmtLeft(s) {
    s = Math.max(0, Math.ceil(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return (h > 0 ? h + ':' + p(m) : p(m)) + ':' + p(sec);
  }

  function chiDateStr() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago',
        year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) { return ''; }
  }

  function phaseId() {
    return 'briefing:' + chiDateStr() + ':' + (phase || 'none');
  }

  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === phaseId(); } catch (e) { return false; }
  }

  /* The Wave 3 siren owns the top slot while visible — yield to it. */
  function sirenBarVisible() {
    try {
      var b = document.getElementById('pf-siren-bar');
      return !!(b && b.offsetHeight > 0);
    } catch (e) { return false; }
  }

  function setPad(on) {
    try {
      if (on) {
        var bar = document.getElementById('pf-briefing-bar');
        if (bar) { document.body.style.paddingTop = bar.offsetHeight + 'px'; padSet = true; }
      } else if (padSet) {
        document.body.style.paddingTop = '';
        padSet = false;
      }
    } catch (e) {}
  }

  function ensureCss() {
    if (document.getElementById('pf-briefing-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-briefing-css';
    st.textContent =
      '#pf-briefing-bar{position:fixed;top:0;left:0;right:0;z-index:9001;' +
      'background:#160b06;color:#ffd166;font-family:monospace;' +
      'border-bottom:2px solid #ff8c00;box-shadow:0 4px 18px rgba(255,140,0,.5);' +
      'font-size:13px;line-height:1.4;padding:8px 44px 8px 12px;text-align:center;' +
      'animation:pfBriefPulse 1.4s ease-in-out infinite}' +
      '@keyframes pfBriefPulse{0%,100%{box-shadow:0 4px 18px rgba(255,140,0,.3)}' +
      '50%{box-shadow:0 4px 26px rgba(255,140,0,.75)}}' +
      '#pf-briefing-bar.live{background:#2b0a0a;border-bottom-color:#c1121f;' +
      'box-shadow:0 4px 18px rgba(193,18,31,.55)}' +
      '#pf-briefing-bar b{color:#ff595e}' +
      '#pf-briefing-bar a{color:#ffd166;font-weight:bold;text-decoration:underline;white-space:nowrap}' +
      '#pf-briefing-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);' +
      'background:none;border:1px solid #ffd166;color:#ffd166;cursor:pointer;' +
      'font-size:14px;line-height:1;padding:2px 8px;border-radius:3px}' +
      '@media(max-width:600px){#pf-briefing-bar{font-size:11px;padding:6px 40px 6px 8px}}';
    try { document.head.appendChild(st); } catch (e) {}
  }

  function copyFor() {
    var clock = '<b data-briefing="left">' + esc(fmtLeft(leftS)) + '</b>';
    if (phase === 'live') {
      return '&#128293; MIDNIGHT BRIEFING <b>LIVE</b> — ' + clock + ' LEFT — ' +
        'ambush drop + dead-drop riddle + night patrol ' +
        '<a href="/#pf-brief">CLAIM TONIGHT &#8594;</a>';
    }
    return '&#9888; MIDNIGHT BRIEFING IN ' + clock + ' — ' +
      'ambush drop + night patrol open at briefing time ' +
      '<a href="/#pf-brief">GET READY &#8594;</a>';
  }

  function render() {
    try {
      var bar = document.getElementById('pf-briefing-bar');
      var show = !!(phase && !dismissed() && !sirenBarVisible());
      if (!show) {
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        setPad(false);
        return;
      }
      ensureCss();
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pf-briefing-bar';
        bar.setAttribute('role', 'alert');
        var x = document.createElement('button');
        x.id = 'pf-briefing-x';
        x.setAttribute('aria-label', 'Dismiss');
        x.textContent = '×';
        x.onclick = function () {
          try { sessionStorage.setItem(DISMISS_KEY, phaseId()); } catch (e3) {}
          render();
        };
        bar.appendChild(x);
        var span = document.createElement('span');
        span.id = 'pf-briefing-msg';
        bar.insertBefore(span, x);
        try { document.body.insertBefore(bar, document.body.firstChild); } catch (e4) { return; }
      }
      bar.className = (phase === 'live') ? 'live' : '';
      var msg = document.getElementById('pf-briefing-msg');
      if (msg) msg.innerHTML = copyFor();
      setPad(true);
    } catch (e5) { /* fail silent — never break the page */ }
  }

  function setPhase(p, left) {
    try {
      var prev = phase;
      phase = p;
      leftS = Math.max(0, Math.round(Number(left) || 0));
      var id = phaseId();
      if (p && p !== prev) {
        /* new phase started — ping once per Chicago day per phase */
        if (seenIds().indexOf(id) === -1) {
          bellPing();
          markSeen(id);
        }
      }
      render();
    } catch (e) {}
  }

  /* Per-second tick: countdown recomputed client-side from the server's
     starts_in_s / ends_in_s. Rolling past the phase end re-reads state
     (siren hands off to live; live hands off to off). */
  function tick() {
    try {
      if (!phase) return;
      var bar = document.getElementById('pf-briefing-bar');
      if (!bar || dismissed()) { render(); return; }
      var el = bar.querySelector('[data-briefing="left"]');
      if (el) el.textContent = fmtLeft(leftS);
      if (leftS <= 0) { refresh(); return; }
      leftS -= 1;
    } catch (e) {}
  }

  function decide(j) {
    try {
      if (j && j.ok === true) {
        if (j.live === true) { setPhase('live', j.ends_in_s); return; }
        if (j.siren === true) { setPhase('siren', j.starts_in_s); return; }
      }
      setPhase(null, 0);
    } catch (e) { setPhase(null, 0); }
  }

  function refresh() {
    try {
      if (window.PF && PF.hidden && PF.hidden()) return; /* background tab: skip */
    } catch (e) {}
    api('op_briefing_status', {}, decide);
  }

  try {
    refresh();
    setInterval(refresh, POLL_MS);
    setInterval(tick, 1000);
  } catch (e) {}
})();
