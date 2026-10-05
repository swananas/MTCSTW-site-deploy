/* core/21-allfronts.js  |  PF v1.4.3 | ALL FRONTS operation banner.
   Site-wide fixed-top strip shown while an operation is live, or within
   1 hour of a scheduled launch (the INCOMING warning). Polls the public
   operation_status read every 60s; the countdown itself ticks client-side
   every second from the server timestamps. Links to the Morning Briefing.
   FRONTEND-ONLY, ZERO NEW XP — pure awareness. Dismiss persists per
   session (sessionStorage); the banner returns next session while live.
   Fail-silent everywhere: a dead read or a render throw must never break
   the page. Follows the 20-nextop.js footer-bundle module pattern.
   KILL: ?pf_off=allfronts  or  localStorage pf_disabled_v1='["allfronts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('allfronts')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  var DISMISS_KEY = 'pf_allfronts_dismissed';
  var POLL_MS = 60000;
  var state = null; /* last operation_status payload */
  var dismissedFor = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET for the public read. Mirrors the 20-nextop.js api() helper. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    var fn = 'pfAfCb' + Math.floor(Math.random() * 1e9);
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

  function fmtClock(totalSec) {
    totalSec = Math.max(0, Math.floor(totalSec));
    var h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(s);
  }

  function dismissed(id) {
    try { return sessionStorage.getItem(DISMISS_KEY) === id; } catch (e) { return false; }
  }

  function ensureCss() {
    if (document.getElementById('pf-af-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-af-css';
    st.textContent =
      '#pf-af-bar{position:fixed;top:0;left:0;right:0;z-index:9001;' +
      'background:#c1121f;color:#f5ead6;font-family:monospace;' +
      'border-bottom:2px solid #7a0c14;box-shadow:0 4px 18px rgba(0,0,0,.5);' +
      'font-size:13px;line-height:1.4;padding:8px 44px 8px 12px;text-align:center}' +
      '#pf-af-bar.pf-af-incoming{background:#7a0c14;border-bottom-color:#ffcc00}' +
      '#pf-af-bar a{color:#ffcc00;font-weight:bold;text-decoration:underline;white-space:nowrap}' +
      '#pf-af-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);' +
      'background:none;border:1px solid #f5ead6;color:#f5ead6;cursor:pointer;' +
      'font-size:14px;line-height:1;padding:2px 8px;border-radius:3px}' +
      '@media(max-width:600px){#pf-af-bar{font-size:11px;padding:6px 40px 6px 8px}}';
    try { document.head.appendChild(st); } catch (e) {}
  }

  function render() {
    try {
      var bar = document.getElementById('pf-af-bar');
      var show = false, html = '', cls = '';
      if (state && state.ok && state.id && !dismissed(state.id)) {
        var nowMs = Date.now();
        if (state.live) {
          show = true;
          var left = Math.max(0, Math.floor(((state.ends_at || 0) - nowMs) / 1000));
          html = 'ALL FRONTS: OPERATION <b>' + esc(state.name) + '</b>' +
            (state.theme ? ' — ' + esc(state.theme) : '') +
            ' — <b>' + esc(state.multiplier) + '× XP</b> site-wide' +
            ' — ends in <b data-af="left">' + fmtClock(left) + '</b>' +
            ' <a href="/#pf-brief">DETAILS &#8594;</a>';
        } else if (state.upcoming) {
          show = true; cls = 'pf-af-incoming';
          var toGo = Math.max(0, Math.floor(((state.starts_at || 0) - nowMs) / 1000));
          html = 'INCOMING: OPERATION <b>' + esc(state.name) + '</b>' +
            ' — <b>' + esc(state.multiplier) + '× XP</b> launches in ' +
            '<b data-af="togo">' + fmtClock(toGo) + '</b>' +
            ' <a href="/#pf-brief">GET READY &#8594;</a>';
        }
      }
      if (!show) {
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        try { document.body.style.paddingTop = ''; } catch (e2) {}
        return;
      }
      ensureCss();
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pf-af-bar';
        bar.setAttribute('role', 'alert');
        var x = document.createElement('button');
        x.id = 'pf-af-x';
        x.setAttribute('aria-label', 'Dismiss');
        x.textContent = '×';
        x.onclick = function () {
          try { sessionStorage.setItem(DISMISS_KEY, state.id); } catch (e3) {}
          dismissedFor = state.id;
          render();
        };
        bar.appendChild(x);
        var span = document.createElement('span');
        span.id = 'pf-af-msg';
        bar.insertBefore(span, x);
        try { document.body.insertBefore(bar, document.body.firstChild); } catch (e4) { return; }
        try { document.body.style.paddingTop = bar.offsetHeight + 'px'; } catch (e5) {}
      }
      if (cls) bar.className = cls; else bar.className = '';
      var msg = document.getElementById('pf-af-msg');
      if (msg) msg.innerHTML = html;
    } catch (e6) { /* fail silent — never break the page */ }
  }

  /* Per-second countdown tick: recompute from server timestamps, no re-read. */
  function tick() {
    try {
      var bar = document.getElementById('pf-af-bar');
      if (!bar || !state || !state.ok) return;
      var nowMs = Date.now(), el;
      if (state.live) {
        el = bar.querySelector('[data-af="left"]');
        if (el) el.textContent = fmtClock(((state.ends_at || 0) - nowMs) / 1000);
        if (nowMs > (state.ends_at || 0)) refresh(); /* rolled past the end */
      } else if (state.upcoming) {
        el = bar.querySelector('[data-af="togo"]');
        if (el) el.textContent = fmtClock(((state.starts_at || 0) - nowMs) / 1000);
        if (nowMs >= (state.starts_at || 0)) refresh(); /* go-live */
      }
    } catch (e) {}
  }

  function refresh() {
    try {
      if (window.PF && PF.hidden && PF.hidden()) return; /* background tab: skip */
    } catch (e) {}
    api('operation_status', {}, function (j) {
      state = (j && j.ok) ? j : { ok: true, live: false };
      render();
    });
  }

  try {
    refresh();
    setInterval(refresh, POLL_MS);
    setInterval(tick, 1000);
  } catch (e) {}
})();
