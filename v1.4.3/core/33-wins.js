/* core/33-wins.js  |  PF v1.4.3 | PLAY 10 — WINS THAT ECHO.
   CEO directive 2026-10-06 (Wave 3 of UX combination plays): when a win
   happens — a cell wins a war, a confirmed bounty moves the CPI, a user's
   poster gets shared/deployed — emit a win event that surfaces (a) in the
   user's hub (the YOUR CAMPAIGN hero, 32-hubhome.js) and (b) in the cell
   feed (cell dashboard modules).

   ARCHITECTURE: a lightweight win-event bus.
     - PF.wins.emit(type, title, detail, opts) — the only write path.
       Device-local (localStorage pf_wins_v1, cap 60, newest first), with a
       24h dedupe window per dedupe key (default: type|title).
     - Detectors are tiny hooks on existing success callbacks (they live in
       their own modules and only CALL PF.wins.emit — this module never
       patches them):
         cell-war.js / cell-war-front.js render()  -> cellwar_win
         macro-share.js poster_share proof (j.ok)  -> poster_deployed
         share-image.js pf-share-image event       -> poster_shared (listened below)
         backend wins_recent poll (wins.js)        -> bounty_filled / cellwar_win / poster_deployed
       Any module may also dispatch a 'pf-win' CustomEvent
       {type, title, detail} — listened below, zero coupling.
     - Display: PF.wins.renderHubStrip(slot) (called by 32-hubhome.js fill())
       and PF.wins.injectCellFeed(mount) (called by cell-hq.js on mount).
       Celebration styling per brand: red/black, condensed, no confetti.
     - Mute: device-local pf_wins_muted, user-mutable toggle on the strip.
   RECOGNITION ONLY — ZERO NEW XP. No xpGrant, no legs, no amounts anywhere
   in this module. Wins that carry XP (cell-war prize +150/+50, bounty legs)
   are paid by their own systems under the locked XP table
   (specs/xp-locked-table-retuned-20261006.md — §4.7 war prize NO_MULT;
   §1 bounty legs); this module only echoes them.
   FAIL-OPEN EVERYWHERE: no localStorage -> memory-only; no backend ->
   device-local only; no wins -> strips hide themselves (never empty boxes).
   KILL: ?pf_off=wins  or  localStorage pf_disabled_v1='["wins"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wins')) return;

  var LS_WINS = 'pf_wins_v1';
  var LS_BE = 'pf_wins_be_v1';
  var LS_MUTE = 'pf_wins_muted';
  var MAX_LOCAL = 60;
  var DEDUPE_MS = 24 * 3600 * 1000;
  var BE_TTL_MS = 5 * 60 * 1000;
  var BACKEND = window.PF_BACKEND_URL;

  var TYPES = { cellwar_win: 1, bounty_filled: 1, poster_shared: 1, poster_deployed: 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function now() { return Date.now(); }

  function loadLocal() {
    try {
      var a = JSON.parse(localStorage.getItem(LS_WINS) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveLocal(a) {
    try { localStorage.setItem(LS_WINS, JSON.stringify(a.slice(0, MAX_LOCAL))); }
    catch (e) { /* private mode — memory only below */ }
  }
  var memFallback = [];

  function emit(type, title, detail, opts) {
    try {
      if (!TYPES[type]) return false;
      title = String(title || '').slice(0, 140);
      if (!title) return false;
      detail = String(detail || '').slice(0, 280);
      opts = opts || {};
      var t = now();
      var wins = loadLocal();
      var key = String(opts.dedupe || (type + '|' + title));
      for (var i = 0; i < wins.length; i++) {
        var w = wins[i];
        if (w && w.dedupe === key && (t - (w.ts || 0)) < DEDUPE_MS) return false;
      }
      var ev = { type: type, title: title, detail: detail, ts: t,
        dedupe: key, source: opts.source || 'you' };
      wins.unshift(ev);
      saveLocal(wins);
      memFallback.unshift(ev);
      if (memFallback.length > MAX_LOCAL) memFallback.length = MAX_LOCAL;
      ping();
      return true;
    } catch (e) { return false; }
  }

  /* Backend poll: read-only wins_recent (JSONP). Fail-open — any failure
     leaves the device-local feed intact. Cached 5 min. */
  var beCache = null, beInFlight = false;
  function pollBackend(cb) {
    cb = cb || function () {};
    try {
      var c = null;
      try { c = JSON.parse(localStorage.getItem(LS_BE) || 'null'); } catch (e) {}
      if (c && c.at && (now() - c.at) < BE_TTL_MS && Array.isArray(c.wins)) {
        beCache = c.wins; cb(c.wins); return;
      }
    } catch (e) {}
    if (beCache) { cb(beCache); }
    if (beInFlight || !BACKEND) { if (!BACKEND) cb([]); return; }
    beInFlight = true;
    try {
      var fn = 'pfWinsCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function fin(j) {
        if (done) return; done = true; beInFlight = false;
        try { delete window[fn]; } catch (e2) {}
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e3) {}
        var wins = (j && j.ok && Array.isArray(j.wins)) ? j.wins : [];
        beCache = wins;
        try { localStorage.setItem(LS_BE, JSON.stringify({ at: now(), wins: wins })); } catch (e4) {}
        cb(wins);
        if (wins.length) ping();
      }
      window[fn] = fin;
      s.onerror = function () { fin(null); };
      s.src = BACKEND + '?action=wins_recent&callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { fin(null); }, 8000);
    } catch (e) { beInFlight = false; cb([]); }
  }

  /* Merged feed: local wins (source 'you') + backend wins (source
     'network'), newest first, deduped on type|title|ts. */
  function recent(n) {
    n = n || 8;
    var seen = {}, out = [];
    function push(w, source) {
      if (!w || !w.title) return;
      var ts = Number(w.ts) || 0;
      var k = (w.type || '') + '|' + w.title + '|' + ts;
      if (seen[k]) return; seen[k] = 1;
      out.push({ type: w.type, title: w.title, detail: w.detail || '',
        ts: ts, source: w.source || source || 'network' });
    }
    var local = loadLocal();
    if (!local.length && memFallback.length) local = memFallback;
    for (var i = 0; i < local.length; i++) push(local[i], 'you');
    var be = beCache;
    if (!be) { try { var c = JSON.parse(localStorage.getItem(LS_BE) || 'null'); if (c && Array.isArray(c.wins)) be = c.wins; } catch (e) {} }
    if (be) for (var j = 0; j < be.length; j++) push(be[j], 'network');
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out.slice(0, n);
  }

  function muted() {
    try { return localStorage.getItem(LS_MUTE) === '1'; } catch (e) { return false; }
  }
  function setMuted(b) {
    try { localStorage.setItem(LS_MUTE, b ? '1' : '0'); } catch (e) {}
    ping();
  }

  /* Re-render every mounted strip when the feed changes (emit, mute,
     backend poll landing). Fail-open: a dead listener never breaks emit. */
  function ping() {
    try { document.dispatchEvent(new CustomEvent('pf-wins-updated')); } catch (e) {}
  }
  try {
    document.addEventListener('pf-wins-updated', function () {
      try {
        var slots = document.querySelectorAll('[data-pf-wins-slot]');
        for (var i = 0; i < slots.length; i++) renderStrip(slots[i]);
      } catch (e) {}
    });
  } catch (e) {}

  function ago(ts) {
    var d = now() - (Number(ts) || 0);
    if (d < 0) d = 0;
    var m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var dd = Math.floor(h / 24);
    return dd + 'd ago';
  }

  var CSS = [
    '.pf-wins{margin:10px 0 12px;}',
    '.pf-wins .pw-kick{font-size:10px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;}',
    '.pf-wins .pw-mute{background:none;border:1px solid #3a3a3a;color:#a89e88;font-size:9px;letter-spacing:2px;padding:3px 8px;border-radius:3px;cursor:pointer;font-weight:700;}',
    '.pf-wins .pw-mute:active{border-color:#c1121f;color:#f5ead6;}',
    '.pf-wins .pw-row{border-left:3px solid #c1121f;background:#141414;padding:8px 10px;margin-bottom:6px;border-radius:0 4px 4px 0;}',
    '.pf-wins .pw-t{font-size:13px;font-weight:900;letter-spacing:.04em;color:#f5ead6;}',
    '.pf-wins .pw-d{font-size:11.5px;color:#a89e88;margin-top:2px;line-height:1.45;}',
    '.pf-wins .pw-m{font-size:9px;letter-spacing:2px;color:#c1121f;font-weight:800;margin-top:3px;}',
    '.pf-wins .pw-m.net{color:#e8b923;}'
  ].join('');
  function injectCss() {
    try {
      if (document.getElementById('pf-wins-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-wins-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* The WINS strip. ownFirst: hub shows the user's own wins first;
     the cell feed leads with network wins. Hidden when muted or empty —
     never an empty box. */
  function renderStrip(slot, ownFirst) {
    if (!slot) return;
    try {
      if (muted()) { slot.style.display = 'none'; slot.innerHTML = ''; return; }
      var wins = recent(ownFirst === false ? 8 : 5);
      if (!wins.length) { slot.style.display = 'none'; slot.innerHTML = ''; return; }
      if (ownFirst === false) {
        wins.sort(function (a, b) {
          var as = a.source === 'network' ? 0 : 1, bs = b.source === 'network' ? 0 : 1;
          return (as - bs) || (b.ts - a.ts);
        });
      }
      injectCss();
      var h = '<div class="pf-wins"><div class="pw-kick"><span>WINS THAT ECHO</span>' +
        '<button type="button" class="pw-mute" data-pw-mute>MUTE WINS</button></div>';
      for (var i = 0; i < wins.length; i++) {
        var w = wins[i];
        h += '<div class="pw-row"><div class="pw-t">' + esc(w.title) + '</div>' +
          (w.detail ? '<div class="pw-d">' + esc(w.detail) + '</div>' : '') +
          '<div class="pw-m' + (w.source === 'network' ? ' net' : '') + '">' +
          esc(w.source === 'network' ? 'NETWORK' : 'YOURS') + ' · ' + esc(ago(w.ts)) + '</div></div>';
      }
      slot.innerHTML = h + '</div>';
      slot.style.display = '';
      var btn = slot.querySelector('[data-pw-mute]');
      if (btn) btn.addEventListener('click', function (ev) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
        setMuted(true);
        try { if (PF.toast) PF.toast('Wins muted. Unmute anytime from a WINS strip.'); } catch (e2) {}
      });
    } catch (e) { /* fail-open: leave the slot as it was */ }
  }

  function renderHubStrip(slot) { renderStrip(slot, true); }

  /* Cell feed injection: idempotent — one #pf-wins-cellfeed per mount. */
  function injectCellFeed(mount) {
    try {
      if (!mount || muted()) return;
      if (document.getElementById('pf-wins-cellfeed')) return;
      var d = document.createElement('div');
      d.id = 'pf-wins-cellfeed';
      d.setAttribute('data-pf-wins-slot', 'cellfeed');
      if (mount.firstChild) mount.insertBefore(d, mount.firstChild);
      else mount.appendChild(d);
      renderStrip(d, false);
      pollBackend(function () { renderStrip(d, false); });
    } catch (e) {}
  }

  /* ---- Detectors that need no edits to other modules ---- */
  /* Share pipeline success: share-image.js creditShare() dispatches
     pf-share-image {day, game, kind} once per day. */
  try {
    document.addEventListener('pf-share-image', function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        if (String(d.kind || 'share') !== 'share') return;
        var game = String(d.game || '').replace(/[-_]+/g, ' ').trim().toUpperCase();
        emit('poster_shared', '\uD83D\uDCE3 POSTER SHARED',
          game ? 'Deployed from ' + game.slice(0, 40) : 'A poster went out into the wild.',
          { dedupe: 'share:' + String(d.day || '') + ':' + String(d.game || '') });
      } catch (e) {}
    });
  } catch (e) {}
  /* Generic escape hatch: any module can dispatch a pf-win CustomEvent
     {type, title, detail} and the bus carries it. Types outside the
     allowlist are dropped. */
  try {
    document.addEventListener('pf-win', function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        emit(d.type, d.title, d.detail, { dedupe: d.dedupe, source: d.source });
      } catch (e) {}
    });
  } catch (e) {}

  /* Prime the backend feed lazily (one poll per page load, 5-min cache). */
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { pollBackend(function () {}); });
    } else {
      setTimeout(function () { pollBackend(function () {}); }, 1500);
    }
  } catch (e) {}

  PF.wins = {
    emit: emit,
    recent: recent,
    muted: muted,
    setMuted: setMuted,
    renderHubStrip: renderHubStrip,
    renderCellFeed: renderStrip,
    injectCellFeed: injectCellFeed,
    pollBackend: pollBackend,
    TYPES: TYPES
  };
})();
