/* core/36-triggers.js  |  PF v1.4.3 | TRIGGER LAYER — event→notification wiring.
   PLAY 4 (UX Combination Plays Wave 2, CEO "Go all" 2026-10-06).
   The client-side half of the notification trigger layer. Any feature can
   emit one of the 8 trigger events; this dispatcher gates it client-side
   (opt-in, rate limit, dedupe) and POSTs to the backend push_trigger action,
   which validates against the server vocabulary (mtcstw-api
   src/trigger_events.js), requires the per-category opt-in, and enqueues a
   Web Push. The drain enforces quiet hours (defer, never drop), 3/day per
   category, and content-aware dedupe. Every trigger is actionable — tapping
   it deep-links to the relevant surface via the existing SW
   notificationclick routing (no SW change needed).

   EVENT VOCABULARY (server is authoritative for copy; this file mirrors the
   event -> category -> deep-link map for client-side gating):
     price_spike_area  price_alerts  /economy        People's CPI spike
     bounty_surge      price_alerts  /economy        thin area near you
     cell_needs_votes  cells         /cells          your cell is short
     rally_suggested   cells         /events         rally near you
     streak_at_risk    streaks       /               check-in lapsing
     order_expiring    games         /               Daily Orders window
     market_closing    games         /arcade         CALL IT. market locks
     proposal_closing  vote_alerts   /political-hq   proposal deadline

   EMIT CONTRACT (fail-open — if this module is absent or killed, game silos
   MUST guard the call and nothing breaks):
     if (window.PF && PF.triggers) PF.triggers.emit('order_expiring', { hours_left: 3 });
   emit() never throws; network failures are swallowed.

   HOOK POINTS (future wiring — NOT wired here; this file is the dispatcher):
     price_spike_area  inflation/CPI modules (economy bundle)
     bounty_surge      bounty fill / sparse-area scout targeting
     cell_needs_votes  cell competitions / cell HQ
     rally_suggested   events platform / War Room live ops
     streak_at_risk    streak tracker / Daily Orders
     order_expiring    Daily Orders window close
     market_closing    CALL IT. prediction markets
     proposal_closing  ballot / proposal deadlines

   RULES: zero XP anywhere near triggers. No XP mechanics touched, no new
   currencies. Copy is wire-service, never game-y, never streak-shaming.
   KILL: ?pf_off=triggers (or ?pf_off=36-triggers) or
         localStorage pf_disabled_v1='["triggers"]' */
(function () {
  'use strict';
  var PF = window.PF || { skip: function () { return false; } };
  if (PF.skip('triggers') || PF.skip('36-triggers')) { return; }
  if (window.PF && PF.triggers) { return; } /* never double-init */

  /* ---------- event vocabulary (client mirror; server authoritative) ---------- */
  var EVENTS = {
    price_spike_area:  { category: 'price_alerts', url: '/economy' },
    bounty_surge:      { category: 'price_alerts', url: '/economy' },
    cell_needs_votes:  { category: 'cells',        url: '/cells' },
    rally_suggested:   { category: 'cells',        url: '/events' },
    streak_at_risk:    { category: 'streaks',      url: '/' },
    order_expiring:    { category: 'games',        url: '/' },
    market_closing:    { category: 'games',        url: '/arcade' },
    proposal_closing:  { category: 'vote_alerts',  url: '/political-hq' }
  };
  /* User-facing opt-in categories (the per-category opt-in UI). All OFF. */
  var CATEGORIES = [
    ['price_alerts', 'Price intel', 'Price spikes in your area, and bounty surges near you.'],
    ['cells', 'Cell ops', 'Your cell needs votes; rallies suggested near you.'],
    ['streaks', 'Streak alerts', 'A heads-up before your streak lapses. Never shaming.'],
    ['games', 'Game timers', 'Daily Orders expiring; prediction markets closing.'],
    ['vote_alerts', 'Vote alerts', 'Proposals closing soon — get your vote on the record.']
  ];
  var MAX_PER_DAY = 3;
  var QH_DEFAULT = { start: 22, end: 7 }; /* America/Chicago; pushes wait till morning */

  /* ---------- tiny helpers (self-contained, fail-open) ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function lsGet(k, dflt) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? dflt : JSON.parse(v);
    } catch (e) { return dflt; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }
  function callsign() {
    try { return window.PFCallsign ? window.PFCallsign() : ''; } catch (e) { return ''; }
  }
  /* Chicago day key (YYYY-MM-DD) for the client-side rate limit. */
  function chiDay() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }
  }

  /* ---------- client-side gates (the server re-enforces all of these) ---------- */
  function optedIn(cat) {
    var prefs = lsGet('pf_trig_prefs', null);
    return !!(prefs && prefs[cat]);
  }
  function underCap(cat) {
    var day = chiDay();
    var rl = lsGet('pf_trig_rl', {});
    var e = rl[cat];
    if (!e || e.day !== day) { return true; }
    return (e.n || 0) < MAX_PER_DAY;
  }
  function bumpCap(cat) {
    var day = chiDay();
    var rl = lsGet('pf_trig_rl', {});
    var e = rl[cat];
    if (!e || e.day !== day) { e = { day: day, n: 0 }; }
    e.n = (e.n || 0) + 1;
    rl[cat] = e;
    lsSet('pf_trig_rl', rl);
  }
  function dedupeKey(event, params) {
    try {
      var p = params || {};
      var keys = Object.keys(p).filter(function (k) {
        return k !== 'url' && (typeof p[k] === 'string' || typeof p[k] === 'number');
      }).sort();
      var parts = [String(event)];
      for (var i = 0; i < keys.length; i++) {
        parts.push(keys[i] + '=' + String(p[keys[i]]).slice(0, 80));
      }
      return parts.join('|');
    } catch (e) { return String(event); }
  }
  function seenRecently(key) {
    var now = Date.now();
    var dd = lsGet('pf_trig_dedupe', {});
    var out = {}, changed = false, k;
    for (k in dd) {
      if (dd[k] > now - 86400000) { out[k] = dd[k]; } else { changed = true; }
    }
    if (changed) { lsSet('pf_trig_dedupe', out); }
    return !!out[key];
  }
  function markSeen(key) {
    var dd = lsGet('pf_trig_dedupe', {});
    dd[key] = Date.now();
    lsSet('pf_trig_dedupe', dd);
  }

  /* ---------- fail-open POST to push_trigger ---------- */
  function post(event, params) {
    try {
      var B = window.PF_BACKEND_URL;
      if (!B) { return; }
      var body = { type: 'push', p_action: 'push_trigger', event: event, params: params || {} };
      var cs = callsign();
      if (cs) { body.callsign = cs; }
      if (window.PF && PF.authPost) {
        try { PF.authPost(B, body, function () {}); } catch (e) {}
        return;
      }
      try {
        fetch(B, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(function () {});
      } catch (e) {}
    } catch (e) {}
  }

  /* ---------- THE DISPATCHER ---------- */
  function emit(event, params) {
    try {
      var spec = EVENTS[event];
      if (!spec) { return { ok: false, err: 'unknown event' }; }
      if (!optedIn(spec.category)) { return { ok: false, skipped: 'not opted in' }; }
      if (!underCap(spec.category)) { return { ok: false, skipped: 'rate limit' }; }
      var key = dedupeKey(event, params);
      if (seenRecently(key)) { return { ok: false, skipped: 'duplicate' }; }
      markSeen(key);
      bumpCap(spec.category);
      post(event, params);
      return { ok: true, queued: true };
    } catch (e) {
      /* Fail-open: a dispatcher failure never breaks the calling module. */
      return { ok: false, err: 'fail-open' };
    }
  }

  var api = {
    VERSION: '4.0',
    EVENTS: EVENTS,
    CATEGORIES: CATEGORIES,
    MAX_PER_DAY: MAX_PER_DAY,
    emit: emit,
    /* exposed for tests / debugging */
    _chiDay: chiDay,
    _dedupeKey: dedupeKey,
    mountPane: null /* set below */
  };
  PF.triggers = api;

  /* ---------- per-category opt-in UI (Political HQ utility pane) ---------- */
  function el(id) { return document.getElementById(id); }

  function placePane() {
    var host = document.getElementById('pf-political-hq');
    if (!host) { return null; }
    var pane = document.getElementById('pf-util-triggers');
    if (!pane) {
      pane = document.createElement('div');
      pane.id = 'pf-util-triggers';
      pane.className = 'pf-hub-util';
      host.appendChild(pane);
    }
    /* Slide in right after the push pane (pwa/push.js) whenever it appears. */
    var anchor = document.getElementById('pf-util-push');
    if (anchor && anchor.parentNode === host && pane.previousElementSibling !== anchor) {
      host.insertBefore(pane, anchor.nextSibling);
    }
    return pane;
  }
  function watchPlacement() {
    var host = document.getElementById('pf-political-hq');
    if (!host || !window.MutationObserver) { return; }
    var tries = 0;
    var obs = new MutationObserver(function () {
      tries++;
      placePane();
      if (document.getElementById('pf-util-push') || tries > 40) { obs.disconnect(); }
    });
    try { obs.observe(host, { childList: true }); } catch (e) { obs.disconnect(); }
    setTimeout(function () { try { obs.disconnect(); } catch (e2) {} }, 20000);
  }

  function catRow(c, on) {
    return '<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer;">'
      + '<input type="checkbox" class="ptTog" data-k="' + c[0] + '"' + (on ? ' checked' : '')
      + ' style="margin-top:4px;transform:scale(1.3);" />'
      + '<span><b>' + esc(c[1]) + '</b><br><span class="c-dim" style="font-size:12px;">'
      + esc(c[2]) + '</span></span>'
      + '</label>';
  }
  function hourOpts(sel) {
    var h = '';
    for (var i = 0; i < 24; i++) {
      var lbl = (i === 0 ? '12am' : i < 12 ? i + 'am' : i === 12 ? '12pm' : (i - 12) + 'pm');
      h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + lbl + '</option>';
    }
    return h;
  }

  var PREFS = null, QH = { start: 22, end: 7 };

  function render() {
    var x = el('xTrigPrefs');
    if (!x) { return; }
    var cs = callsign();
    if (!cs) {
      x.innerHTML = '<div class="c-box">Enlist first (pick a callsign) to manage alert triggers.</div>';
      return;
    }
    var h = '<div class="c-sub">TRIGGER CATEGORIES</div>'
      + '<div style="font-size:12px;margin:6px 0;" class="c-dim">Each category can ping you at most '
      + MAX_PER_DAY + '/day. Every alert deep-links straight to the action.</div>';
    for (var i = 0; i < CATEGORIES.length; i++) {
      h += catRow(CATEGORIES[i], PREFS && PREFS[CATEGORIES[i][0]]);
    }
    h += '<div class="c-sub" style="margin-top:12px;">QUIET HOURS (CHICAGO TIME)</div>'
      + '<div style="font-size:12px;margin:6px 0;" class="c-dim">No pushes inside this window — '
      + 'alerts wait until morning.</div>'
      + '<div style="display:flex;gap:10px;align-items:center;margin:8px 0;">'
      + '<label style="font-size:12px;">From <select id="ptQhStart" class="ptQh">'
      + hourOpts(QH.start) + '</select></label>'
      + '<label style="font-size:12px;">To <select id="ptQhEnd" class="ptQh">'
      + hourOpts(QH.end) + '</select></label>'
      + '</div>'
      + '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'
      + '<button class="c-btn" id="ptSave" type="button">SAVE TRIGGER PREFS</button>'
      + '<a href="#" id="ptOffAll" style="font-size:12px;color:var(--pf-red);">Turn off all triggers</a>'
      + '<span id="ptMsg" style="font-size:12px;"></span>'
      + '</div>';
    x.innerHTML = h;
    el('ptSave').addEventListener('click', savePrefs);
    el('ptOffAll').addEventListener('click', function (e) {
      e.preventDefault();
      if (!window.confirm('Turn off every alert trigger for this callsign?')) { return; }
      var all = {};
      for (var j = 0; j < CATEGORIES.length; j++) { all[CATEGORIES[j][0]] = 0; }
      writePrefs(all, QH.start, QH.end, function (okp) {
        if (okp) { toast('All alert triggers off.'); }
        loadPrefs(render);
      });
    });
  }

  function msg(t) { var m = el('ptMsg'); if (m) { m.textContent = t; } }

  function postPrefs(params, cb) {
    var B = window.PF_BACKEND_URL;
    var body = { type: 'push', p_action: 'push_prefs' };
    for (var k in params) { body[k] = params[k]; }
    var cs = callsign();
    if (cs) { body.callsign = cs; }
    function done(j) { try { cb(j || { ok: false }); } catch (e) {} }
    if (window.PF && PF.authPost) { try { PF.authPost(B, body, done); return; } catch (e) {} }
    try {
      fetch(B, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).then(done).catch(function () { done(null); });
    } catch (e) { done(null); }
  }

  function writePrefs(flags, qhs, qhe, cb) {
    var params = { qh_start: qhs, qh_end: qhe };
    for (var i = 0; i < CATEGORIES.length; i++) {
      params[CATEGORIES[i][0]] = flags[CATEGORIES[i][0]] ? 1 : 0;
    }
    msg('Saving…');
    postPrefs(params, function (j) {
      msg('');
      if (j && j.ok) {
        PREFS = {};
        for (var k = 0; k < CATEGORIES.length; k++) {
          PREFS[CATEGORIES[k][0]] = params[CATEGORIES[k][0]];
        }
        QH = {
          start: j.prefs && j.prefs.qh_start != null ? j.prefs.qh_start : qhs,
          end: j.prefs && j.prefs.qh_end != null ? j.prefs.qh_end : qhe
        };
        lsSet('pf_trig_prefs', PREFS);
        lsSet('pf_trig_qh', QH);
        cb(true);
      } else {
        msg('Could not save. ' + ((j && (j.err || j.error)) || ''));
        cb(false);
      }
    });
  }

  function savePrefs() {
    var flags = {};
    var togs = document.querySelectorAll('.ptTog');
    for (var i = 0; i < togs.length; i++) {
      flags[togs[i].getAttribute('data-k')] = togs[i].checked ? 1 : 0;
    }
    var qhs = parseInt(el('ptQhStart').value, 10);
    var qhe = parseInt(el('ptQhEnd').value, 10);
    if (!(qhs >= 0 && qhs <= 23)) { qhs = QH_DEFAULT.start; }
    if (!(qhe >= 0 && qhe <= 23)) { qhe = QH_DEFAULT.end; }
    var b = el('ptSave'), lbl = b ? b.textContent : '';
    if (b) { b.disabled = true; b.textContent = 'SAVING…'; }
    writePrefs(flags, qhs, qhe, function (okp) {
      if (b) { b.disabled = false; b.textContent = lbl; }
      if (okp) { toast('Trigger preferences saved.'); render(); }
    });
  }

  function loadPrefs(cb) {
    function done(j) {
      PREFS = {};
      QH = { start: QH_DEFAULT.start, end: QH_DEFAULT.end };
      if (j && j.ok && j.prefs) {
        for (var i = 0; i < CATEGORIES.length; i++) {
          PREFS[CATEGORIES[i][0]] = j.prefs[CATEGORIES[i][0]] ? 1 : 0;
        }
        var s = parseInt(j.prefs.qh_start, 10), e = parseInt(j.prefs.qh_end, 10);
        if (s >= 0 && s <= 23) { QH.start = s; }
        if (e >= 0 && e <= 23) { QH.end = e; }
      }
      /* Sync the client-side gates to the server (authoritative). */
      lsSet('pf_trig_prefs', PREFS);
      lsSet('pf_trig_qh', QH);
      cb();
    }
    var B = window.PF_BACKEND_URL;
    var cs = callsign();
    if (!B || !cs) { done(null); return; }
    if (window.PF && PF.authGetJSONP) {
      try { PF.authGetJSONP(B, 'push_prefs', { callsign: cs }, done); return; } catch (e) {}
    }
    var fn = 'pfTrigCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), finished = false;
    function fin(j) {
      if (finished) { return; }
      finished = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) { s.parentNode.removeChild(s); }
      done(j);
    }
    window[fn] = fin;
    s.onerror = function () { fin(null); };
    s.src = B + '?action=push_prefs&callsign=' + encodeURIComponent(cs) + '&callback=' + fn;
    document.head.appendChild(s);
    setTimeout(function () { fin(null); }, 12000);
  }

  function mountPane() {
    var pane = placePane();
    if (!pane) { return; }
    pane.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-triggers-prefs">'
      + '<a id="alert-triggers" style="display:block;position:relative;top:-80px;"></a>'
      + '<h2>Alert Triggers</h2>'
      + '<div class="c-tag">Phone-level pings from the games and intel you follow. '
      + 'Off by default — turn on only the categories you want.</div>'
      + '<div id="xTrigPrefs"><div class="c-load">Reading trigger prefs…</div></div>'
      + '</div>';
    watchPlacement();
    loadPrefs(render);
  }
  api.mountPane = mountPane;

  /* ---------- boot: Political HQ utility pane only ---------- */
  function boot() {
    if (!document.getElementById('pf-political-hq')) { return; }
    function go() { try { mountPane(); } catch (e) {} }
    if (document.readyState === 'loading') {
      try { document.addEventListener('DOMContentLoaded', go); } catch (e) { go(); }
    } else { go(); }
  }
  try { boot(); } catch (e) {}
})();
