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
   flash_create. KILL: ?pf_off=allfronts_admin
   --- Wave 5D CONDUCTOR extension (2026-10-04) appended below: the vault op
   console — active op + stage + countdown, upcoming ops, preset picker
   (All Fronts / Blackout / Midnight Briefing stub) with confirm gate,
   dry-run preview rendering op_preview, launch/end. KILL: ?pf_off=conductor */
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

/* ===== WAVE 5D CONDUCTOR — vault op console + preset launcher =====
   Appended 2026-10-04. Extends the All Fronts console above (same file, no
   duplication): active op + current stage + countdown, upcoming scheduled
   ops, preset picker with confirm gate, dry-run preview. All writes ride
   X-Admin-Secret; the module gates itself server-side too. */
(function () {
  'use strict';
  if (!window.PF) return;
  try {
    var _hc = String(window.location.href || '');
    if (_hc.indexOf('pf_off=conductor') !== -1) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  var SECRET_KEY = 'pf_admin_secret';
  var PANEL_ID = 'pfConductor';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function err(id, m) { var el = document.getElementById(id); if (el) el.textContent = m || ''; }
  function toast(m) { try { if (window.PF && window.PF.toast) { window.PF.toast(m); return; } } catch (e) {} }
  function errCopy(j, fb) { try { if (window.PF && window.PF.errCopy) return window.PF.errCopy(j, fb); } catch (e) {} return (j && (j.err || j.error)) || fb || 'Request failed.'; }
  function getSecret() { try { return sessionStorage.getItem(SECRET_KEY) || ''; } catch (e) { return ''; } }

  /* Admin GET with the secret in the X-Admin-Secret header (JSONP cannot
     carry headers, so op_console rides fetch like the POSTs). */
  function adminGet(action, cb) {
    var secret = getSecret();
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (!BACKEND) { done(null); return; }
    if (!secret) { done({ ok: false, err: 'Vault is locked.' }); return; }
    var t = setTimeout(function () { done(null); }, 12000);
    fetch(BACKEND + '?action=' + encodeURIComponent(action), {
      headers: { 'X-Admin-Secret': secret }
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(t); done(j);
    }).catch(function () { clearTimeout(t); done(null); });
  }

  /* Orchestrator POST: { type:'orchestrate', or_action, ...params }. */
  function adminPostO(orAction, params, cb) {
    var secret = getSecret();
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (!secret) { done({ ok: false, err: 'Vault is locked.' }); return; }
    var body = { type: 'orchestrate', or_action: orAction };
    for (var k in params) body[k] = params[k];
    try {
      if (!body.callsign && window.PFCallsign) { var _cs = window.PFCallsign(); if (_cs) body.callsign = _cs; }
    } catch (e) {}
    var o = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret }, body: JSON.stringify(body) };
    var t = setTimeout(function () { done(null); }, 20000);
    fetch(BACKEND, o).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(t); done(j);
    }).catch(function () { clearTimeout(t); done(null); });
  }

  function fmtTs(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch (e) { return ''; }
  }

  function stageRow(s) {
    var fired = s.fired ? '<b style="color:#7c5">[FIRED]</b> ' : '';
    return '<div class="x-note">' + fired + esc(s.when || '') + ' &mdash; <b>' +
      esc(s.action) + '</b>' + (s.at ? ' <span class="x-dim">(' + esc(s.at) + ')</span>' : '') +
      (s.note ? '<br><span class="x-dim">' + esc(s.note) + '</span>' : '') + '</div>';
  }

  var cdEndsAt = 0;
  function tickCount() {
    try {
      var el = document.getElementById('pfCdCount');
      if (!el || !cdEndsAt) return;
      var s = Math.max(0, Math.floor((cdEndsAt - Date.now()) / 1000));
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      el.textContent = h + 'h ' + m + 'm ' + (s % 60) + 's';
    } catch (e) {}
  }

  function consoleHtml(c) {
    if (!c || !c.ok) return '<div class="x-note">Console unavailable (' + esc(errCopy(c, '')) + ').</div>';
    var h = '';
    if (!c.op) {
      h += '<div class="x-note">No operation live. Preview a preset below and launch when ready.</div>';
    } else {
      var o = c.op;
      var phase = o.live ? 'LIVE' : (o.upcoming ? 'INCOMING' : 'ENDED?');
      cdEndsAt = o.live ? o.ends_at : 0;
      h += '<div class="x-note"><b>' + phase + ':</b> ' + esc(o.name) +
        (o.preset ? ' <span class="x-dim">[' + esc(o.preset) + ']</span>' : '') +
        (o.flags && o.flags.blackout ? ' <b style="color:#c33">BLACKOUT</b>' : '') +
        ' &bull; ' + esc(o.multiplier) + '&times; XP' +
        (o.live ? ' &bull; <b id="pfCdCount">--</b> left' : ' &bull; launches ' + esc(fmtTs(o.starts_at))) +
        '</div>';
      if (o.current_stage) h += '<div class="x-note">Current stage: ' + esc(o.current_stage.action) + ' &mdash; ' + esc(o.current_stage.when) + '</div>';
      if (o.next_stage) h += '<div class="x-note">Next stage: <b>' + esc(o.next_stage.action) + '</b> &mdash; ' + esc(o.next_stage.when) + '</div>';
      h += '<div class="x-note">' + o.stages_fired + '/' + o.stages_total + ' stages fired.</div>';
      if (o.flags && Object.keys(o.flags).length)
        h += '<div class="x-note x-dim">flags: ' + esc(JSON.stringify(o.flags)) + '</div>';
    }
    if (c.upcoming && c.upcoming.length) {
      h += '<div class="x-note" style="margin-top:8px"><b>Upcoming</b></div>';
      for (var i = 0; i < c.upcoming.length; i++) {
        var u = c.upcoming[i];
        h += '<div class="x-note">' + esc(u.name) + (u.preset ? ' [' + esc(u.preset) + ']' : '') + ' &mdash; ' + esc(u.launches) + '</div>';
      }
    }
    return h;
  }

  function previewHtml(pv) {
    if (!pv || !pv.ok) return '<div class="c-err">' + esc(errCopy(pv, 'Preview failed.')) + '</div>';
    if (pv.stub) {
      var h = '<div class="x-note"><b>' + esc(pv.preset) + '</b> — stub preset (Wave 5A). ' + esc(pv.reason || '') + '</div>';
      h += '<div class="x-note">Window: ' + esc(pv.window.start) + '&ndash;' + esc(pv.window.end) + ' ' + esc(pv.tz) +
        ', daily. Siren ' + esc(pv.siren_lead_minutes) + ' min lead.</div>';
      (pv.next_runs || []).forEach(function (r) {
        h += '<div class="x-note">Next run: ' + esc(r.when) + '</div>';
      });
      h += '<div class="x-note">Launch is disabled until Wave 5A ships <span class="x-dim">op_briefing</span>.</div>';
      return h;
    }
    var out = '<div class="x-note"><b>DRY-RUN — nothing created.</b> ' + esc(pv.name) +
      ' [' + esc(pv.preset) + '] &bull; ' + esc(pv.window.duration_hours) + 'h &bull; ' +
      esc(pv.window.multiplier) + '&times; XP<br>Window: ' + esc(pv.window.starts) + ' &rarr; ' + esc(pv.window.ends) +
      (pv.flags && Object.keys(pv.flags).length ? '<br>flags: ' + esc(JSON.stringify(pv.flags)) : '') + '</div>';
    (pv.stages || []).forEach(function (s) { out += stageRow(s); });
    return out;
  }

  function collectParams() {
    var p = { preset: val('pfCdPreset') };
    if (val('pfCdName')) p.name = val('pfCdName');
    if (val('pfCdTheme')) p.theme = val('pfCdTheme');
    if (val('pfCdDur')) p.duration_hours = Number(val('pfCdDur'));
    if (val('pfCdMult')) p.flash_multiplier = Number(val('pfCdMult'));
    if (val('pfCdStart')) {
      var ms = new Date(val('pfCdStart')).getTime();
      if (!(ms > 0)) return { bad: 'Bad launch date.' };
      p.starts_at = ms;
    }
    return p;
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
        '<div class="x-pane"><h4>Conductor — op scheduler + presets</h4>' +
        '<div class="x-note">One admin surface that fires multiple systems on a schedule. An operation is a <i>score</i>; the existing systems are the <i>instruments</i>. Stages fire once each via the hourly cron. Preview is a dry-run — nothing is created until you launch.</div>' +
        '<div id="pfCdConsole"><div class="x-note">Loading console…</div></div>' +
        '<div class="vl-form">' +
        '<select aria-label="Preset" id="pfCdPreset" class="c-input pf-input-lg">' +
        '<option value="all_fronts">ALL FRONTS (48h)</option>' +
        '<option value="blackout">BLACKOUT (24h)</option>' +
        '<option value="midnight_briefing">MIDNIGHT BRIEFING (daily — stub)</option>' +
        '</select>' +
        '<input aria-label="Op name" id="pfCdName" class="c-input pf-input-lg" placeholder="Op name (blank = preset default)" >' +
        '<input aria-label="Theme" id="pfCdTheme" class="c-input pf-input-lg" placeholder="Theme" >' +
        '<input aria-label="Hours" id="pfCdDur" class="c-input pf-input-sm" type="number" min="1" max="168" placeholder="Hrs" title="Duration hours (blank = preset default)" >' +
        '<input aria-label="Multiplier" id="pfCdMult" class="c-input pf-input-sm" type="number" min="1.25" max="5" step="0.25" placeholder="&times;" title="XP multiplier (blank = 2)" >' +
        '<input aria-label="Launch at (optional)" id="pfCdStart" class="c-input pf-input-md" type="datetime-local" title="Launch at (optional — within 24h; blank = now)" >' +
        '<button class="c-btn c-btn-dim" id="pfCdPreview">PREVIEW (DRY-RUN)</button>' +
        '<button class="c-btn" id="pfCdLaunch">LAUNCH PRESET</button>' +
        '<div class="c-err" id="pfCdErr"></div></div>' +
        '<div id="pfCdStages"></div></div>';
      /* Mount right after the All Fronts panel when present, else the vault. */
      var af = document.getElementById('pfAfAdmin');
      if (af && af.parentNode === vault) vault.insertBefore(wrap, af.nextSibling);
      else vault.appendChild(wrap);

      document.getElementById('pfCdPreview').onclick = function () {
        var b = this; b.disabled = true;
        var p = collectParams();
        if (p.bad) { err('pfCdErr', p.bad); b.disabled = false; return; }
        err('pfCdErr', '');
        adminPostO('op_preview', p, function (j) {
          b.disabled = false;
          document.getElementById('pfCdStages').innerHTML = previewHtml(j);
        });
      };

      document.getElementById('pfCdLaunch').onclick = function () {
        var b = this;
        var p = collectParams();
        if (p.bad) { err('pfCdErr', p.bad); return; }
        var sel = document.getElementById('pfCdPreset');
        var label = sel.options[sel.selectedIndex].text;
        if (!window.confirm('Launch preset "' + label + '" as "' + (p.name || 'preset default') + '"? Stages fire on schedule once launched.')) return;
        b.disabled = true;
        err('pfCdErr', '');
        adminPostO('op_preset_launch', p, function (j) {
          b.disabled = false;
          if (!j || !j.ok) { err('pfCdErr', errCopy(j, 'Launch failed.')); return; }
          toast('Op live: ' + j.name + ' (' + (j.stages || []).length + ' stages).');
          document.getElementById('pfCdStages').innerHTML = '';
          refresh();
        });
      };

      refresh();
      setInterval(tickCount, 1000);
    } catch (e) { /* fail silent */ }
  }

  function refresh() {
    try {
      var el = document.getElementById('pfCdConsole');
      if (!el) return;
      adminGet('op_console', function (j) {
        try {
          var el2 = document.getElementById('pfCdConsole');
          if (el2) el2.innerHTML = consoleHtml(j);
          tickCount();
        } catch (e) {}
      });
    } catch (e2) {}
  }

  try {
    setInterval(mount, 2000);
    mount();
  } catch (e) {}
})();
