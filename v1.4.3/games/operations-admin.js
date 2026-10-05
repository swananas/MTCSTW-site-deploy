/* games/operations-admin.js  |  PF v1.4.3 | ALL FRONTS admin console.
   "LAUNCH ALL FRONTS" panel appended to the vault admin area (#xVault).
   DELIBERATELY a separate file from vault.js: it reads the admin secret
   from sessionStorage ('pf_admin_secret', set by the vault unlock) and
   implements its own admin POST, so it mounts with zero edits to vault.js
   and survives vault re-renders (re-mounts if wiped by vault load()).
   Mount conditions: #xVault exists + #vlLock present (vault unlocked) +
   panel not already mounted. Polls every 2s.
   Actions: operation_launch {name, theme, duration_hours, flash_multiplier,
   starts_at?}, operation_end. All ride X-Admin-Secret, same rail as
   flash_create. KILL: ?pf_off=allfronts_admin */
(function () {
  'use strict';
  if (!window.PF) return;
  try {
    var _h = String(window.location.href || '');
    if (_h.indexOf('pf_off=allfronts_admin') !== -1) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  var SECRET_KEY = 'pf_admin_secret';
  var PANEL_ID = 'pfAfAdmin';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function err(id, m) { var el = document.getElementById(id); if (el) el.textContent = m || ''; }
  function toast(m) { try { if (window.PF && window.PF.toast) { window.PF.toast(m); return; } } catch (e) {} }
  function errCopy(j, fb) { try { if (window.PF && window.PF.errCopy) return window.PF.errCopy(j, fb); } catch (e) {} return (j && (j.err || j.error)) || fb || 'Request failed.'; }
  function getSecret() { try { return sessionStorage.getItem(SECRET_KEY) || ''; } catch (e) { return ''; } }

  /* JSONP public read (same pattern as the allfronts banner). */
  function apiGet(action, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfAfAdCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e2) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    s.src = BACKEND + '?action=' + encodeURIComponent(action) + '&callback=' + fn;
    s.async = true;
    try { document.head.appendChild(s); } catch (e3) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000);
  }

  /* Admin POST on the X-Admin-Secret rail (mirrors vault.js post()). */
  function adminPost(cAction, params, cb) {
    var secret = getSecret();
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (!secret) { done({ ok: false, err: 'Vault is locked.' }); return; }
    var body = { type: 'operation', op_action: cAction };
    for (var k in params) body[k] = params[k];
    try {
      if (!body.callsign && window.PFCallsign) { var _cs = window.PFCallsign(); if (_cs) body.callsign = _cs; }
      if (window.PF && window.PF.getAuthSecret) { var _s = window.PF.getAuthSecret(); if (_s) body.auth_secret = _s; }
    } catch (e) {}
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret }, body: JSON.stringify(body) }, c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e2) {} }, 15000);
        }
      } catch (e3) {}
      fetch(BACKEND, o).then(function (r) { return r.json(); }).then(function (j) {
        if (t) try { clearTimeout(t); } catch (e4) {}
        done(j);
      }).catch(function () { if (t) try { clearTimeout(t); } catch (e5) {} done(null); });
    } catch (e6) { done(null); }
  }

  function fmtTs(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch (e) { return ''; }
  }

  function statusHtml(st) {
    if (!st || !st.ok || (!st.live && !st.upcoming && !st.scheduled)) {
      return '<div class="x-note">No operation live. Launch the next all-fronts offensive below.</div>';
    }
    var phase = st.live ? 'LIVE' : (st.upcoming ? 'INCOMING (<1h)' : 'SCHEDULED');
    return '<div class="x-note"><b>' + phase + ':</b> ' + esc(st.name) +
      (st.theme ? ' — ' + esc(st.theme) : '') +
      ' &bull; ' + esc(st.multiplier) + '× XP' +
      ' &bull; ends ' + esc(fmtTs(st.ends_at)) + '</div>';
  }

  function recentHtml(st) {
    var rows = (st && st.ok && st.recent) || [];
    if (!rows.length) return '';
    var h = '<div class="x-note" style="margin-top:8px"><b>Recent operations</b></div>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      h += '<div class="x-note">' + esc(r.name) + ' — ' + esc(r.status) +
        ' &bull; ' + esc(fmtTs(r.starts_at)) + ' &rarr; ' + esc(fmtTs(r.ends_at)) + '</div>';
    }
    return h;
  }

  function mount() {
    try {
      var vault = document.getElementById('xVault');
      if (!vault) return;
      if (!document.getElementById('vlLock')) return; /* vault not unlocked */
      if (document.getElementById(PANEL_ID)) return; /* already mounted */
      var wrap = document.createElement('div');
      wrap.id = PANEL_ID;
      wrap.innerHTML =
        '<div class="x-pane"><h4>All Fronts — operation control</h4>' +
        '<div class="x-note">One button launches a 48-hour site-wide operation: fires a ' +
        esc('flash_multiplier') + '× XP flash, publishes operation_status for ambush drops, ' +
        'recruit races, route march, ticker and siren to coordinate. ' +
        'One operation at a time — launching while one is live is rejected.</div>' +
        '<div id="pfAfStatus"><div class="x-note">Loading status…</div></div>' +
        '<div class="vl-form">' +
        '<input aria-label="Operation name" id="pfAfName" class="c-input pf-input-lg" placeholder="Operation name (e.g. RED DAWN)" >' +
        '<input aria-label="Theme" id="pfAfTheme" class="c-input pf-input-lg" placeholder="Theme (e.g. recruit surge — shown on banner)" >' +
        '<input aria-label="Duration hours" id="pfAfDur" class="c-input pf-input-sm" type="number" min="1" max="168" value="48" title="Duration (hours, 1-168)" >' +
        '<input aria-label="XP multiplier" id="pfAfMult" class="c-input pf-input-sm" type="number" min="1.25" max="5" step="0.25" value="2" title="XP multiplier (1.25-5)" >' +
        '<input aria-label="Launch at (optional)" id="pfAfStart" class="c-input pf-input-md" type="datetime-local" title="Launch at (optional — within 24h; blank = now)" >' +
        '<button class="c-btn" id="pfAfLaunch">LAUNCH ALL FRONTS</button>' +
        '<button class="c-btn c-btn-dim" id="pfAfEnd">END EARLY</button>' +
        '<div class="c-err" id="pfAfErr"></div></div>' +
        '<div id="pfAfRecent"></div></div>';
      vault.appendChild(wrap);

      document.getElementById('pfAfLaunch').onclick = function () {
        var b = this; b.disabled = true;
        var name = val('pfAfName');
        if (!name) { err('pfAfErr', 'Operation name required.'); b.disabled = false; return; }
        var sMs = val('pfAfStart') ? new Date(val('pfAfStart')).getTime() : 0;
        if (val('pfAfStart') && !(sMs > 0)) { err('pfAfErr', 'Bad launch date.'); b.disabled = false; return; }
        var p = {
          name: name,
          theme: val('pfAfTheme'),
          duration_hours: Number(val('pfAfDur')) || 48,
          flash_multiplier: Number(val('pfAfMult')) || 2
        };
        if (sMs > 0) p.starts_at = sMs;
        err('pfAfErr', '');
        adminPost('operation_launch', p, function (j) {
          b.disabled = false;
          if (!j || !j.ok) { err('pfAfErr', errCopy(j, 'Launch failed.')); return; }
          toast('ALL FRONTS live: ' + j.name + ' (' + j.multiplier + '× XP).');
          refresh();
        });
      };

      document.getElementById('pfAfEnd').onclick = function () {
        var b = this;
        if (!window.confirm('End the live operation now? The XP flash stops immediately.')) return;
        b.disabled = true;
        adminPost('operation_end', {}, function (j) {
          b.disabled = false;
          if (!j || !j.ok) { err('pfAfErr', errCopy(j, 'End failed.')); return; }
          toast('Operation ended: ' + (j.name || ''));
          refresh();
        });
      };

      refresh();
    } catch (e) { /* fail silent */ }
  }

  function refresh() {
    try {
      var stEl = document.getElementById('pfAfStatus');
      var rcEl = document.getElementById('pfAfRecent');
      if (!stEl) return;
      apiGet('operation_status', function (j) {
        try {
          if (document.getElementById('pfAfStatus')) {
            document.getElementById('pfAfStatus').innerHTML = statusHtml(j);
          }
          if (document.getElementById('pfAfRecent')) {
            document.getElementById('pfAfRecent').innerHTML = recentHtml(j);
          }
        } catch (e) {}
      });
    } catch (e2) {}
  }

  try {
    setInterval(mount, 2000);
    mount();
  } catch (e) {}
})();
