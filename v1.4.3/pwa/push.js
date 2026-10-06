/* pwa/push.js  |  PF v1.4.3 | PUSH NOTIFICATION CLIENT (Phase A).
   Opt-in push for three topics (Daily Orders, draw results, event
   reminders). Mounted on the Political HQ page as a utility pane right
   after the "Control the Signal" (notify-prefs) pane — the account /
   notification-settings surface that already exists.
   HONESTY RULES (spec 2026-10-05, pwa-push):
   - The entire UI stays hidden unless a LIVE service-worker registration
     exists. In Phase A the cross-origin registration fails, so this file
     renders nothing — never promise push where the SW can't be registered
     (iOS needs the home-screen app + Phase B SW; Android/desktop need the
     Phase B SW too). API presence alone is not enough.
   - Notification.requestPermission() fires ONLY from an explicit user
     gesture on the ENABLE control.
   - Per-topic opt-ins, all default OFF. One-tap global off.
   - Copy is plain and honest — no engagement bait, no streak-shaming.
   - Zero XP anywhere near push. No XP mechanics touched.
   LAYERING: a self-contained silo. Touches only public globals
   (PF.toast, PF.errCopy, PF.authPost, PF.authGetJSONP, PFCallsign, PF_BACKEND_URL) and the
   Political HQ host div — never another silo's internals.
   BACKEND (separate build, spec section 4): actions push_vapid_public
   (public GET), push_subscribe / push_unsubscribe / push_prefs (callsign-
   authed POSTs). Until those exist the UI reports the backend error
   plainly instead of pretending to work.
   KILL: ?pf_off=pwa  or  localStorage pf_disabled_v1='["pwa"]' */
(function () {
  'use strict';
  var PF = window.PF || { skip: function () { return false; } };
  if (PF.skip('pwa')) { return; }

  /* ---------- support gate: hide everything where push cannot work ---------- */
  if (!('serviceWorker' in navigator)) { return; }
  if (!('PushManager' in window)) { return; }
  if (!('Notification' in window)) { return; }

  var BACKEND = window.PF_BACKEND_URL || null;

  /* ---------- tiny helpers (self-contained, no cross-silo reads) ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);'
        + 'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;'
        + 'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  function errCopy(j, fallback) {
    try { if (window.PF && PF.errCopy) { return PF.errCopy(j, fallback); } } catch (e) {}
    return (j && j.err) || fallback || 'Something went wrong.';
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  /* Backend push_prefs reads topic flags TOP-LEVEL (p.daily_orders etc.);
     a nested {prefs:{...}} is ignored and missing flags = read (silent
     no-op). Always send all three flags explicitly. */
  function flatPrefs(chosen) {
    chosen = chosen || {};
    return {
      callsign: CS,
      daily_orders: chosen.daily_orders ? 1 : 0,
      draw_results: chosen.draw_results ? 1 : 0,
      event_reminders: chosen.event_reminders ? 1 : 0
    };
  }
  /* JSONP GET (public actions) — mirrors games/notify-prefs.js api(). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPushCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) { return; }
      done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) { s.parentNode.removeChild(s); }
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') {
        q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }
  /* Authed POST — mirrors games/notify-prefs.js post().
     Contract (backend POST rail, src/index.js + src/auth.js TYPE_KEY):
     type:'push' + p_action (NOT push_action — the rail dispatches on
     d.p_action, resolved from the type via TYPE_KEY). */
  function post(action, params, cb) {
    var body = { type: 'push', p_action: action };
    for (var k in params) { body[k] = params[k]; }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e) { done(null); }
  }
  /* VAPID public key: base64url -> Uint8Array for pushManager.subscribe. */
  function b64ToU8(b64) {
    var b = String(b64).replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) { b += '='; }
    var raw = atob(b);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) { out[i] = raw.charCodeAt(i); }
    return out;
  }

  /* ---------- topics: plain language, default OFF ---------- */
  var TOPICS = [
    ['daily_orders', 'Daily Orders ready', 'A ping when today\u2019s Daily Orders post.'],
    ['draw_results', 'Draw results', 'A ping when a draw announces its winners.'],
    ['event_reminders', 'Event reminders', 'A ping before an event you follow starts.']
  ];

  var CS = '', REG = null, SUB = null, PREFS = null, PERM = 'default';

  /* ---------- mount: Political HQ utility pane, after notify-prefs ---------- */
  function placePane() {
    var host = document.getElementById('pf-political-hq');
    if (!host) { return null; }
    var pane = document.getElementById('pf-util-push');
    if (!pane) {
      pane = document.createElement('div');
      pane.id = 'pf-util-push';
      pane.className = 'pf-hub-util';
      host.appendChild(pane);
    }
    /* notify-prefs mounts its pane async (bundle-hq-deep chunk); slide in
       right after it whenever it appears. */
    var anchor = document.getElementById('pf-util-notify-prefs');
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
      if (document.getElementById('pf-util-notify-prefs') || tries > 40) { obs.disconnect(); }
    });
    try { obs.observe(host, { childList: true }); } catch (e) { obs.disconnect(); }
    setTimeout(function () { try { obs.disconnect(); } catch (e2) {} }, 20000);
  }

  /* ---------- render ---------- */
  function el() { return document.getElementById('xPushPrefs'); }

  function topicRow(t) {
    var k = t[0], on = PREFS && PREFS[k] ? 1 : 0;
    return '<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer;">'
      + '<input type="checkbox" class="ppTog" data-k="' + k + '"' + (on ? ' checked' : '')
      + ' style="margin-top:4px;transform:scale(1.3);" />'
      + '<span><b>' + t[1] + '</b><br><span class="c-dim" style="font-size:12px;">' + t[2] + '</span></span>'
      + '</label>';
  }

  function render() {
    var x = el();
    if (!x) { return; }
    if (!CS) {
      x.innerHTML = '<div class="c-box">Enlist first (pick a callsign) to manage push notifications.</div>';
      return;
    }
    if (PERM === 'denied') {
      x.innerHTML = '<div class="c-box">Notifications are blocked in this browser\u2019s site settings. '
        + 'Unblock them there if you want push alerts \u2014 nothing here will nag you about it.</div>';
      return;
    }
    var h = '';
    if (!SUB) {
      h += '<div class="c-box" style="margin-bottom:12px;">'
        + '<div class="c-sub">STATUS</div>'
        + '<div style="margin:6px 0;">Push is <b>off</b> for this browser.</div>'
        + '<div style="font-size:12px;margin:6px 0;">Your browser will ask for permission when you tap the button. '
        + 'Nothing is sent until you turn a topic on below.</div>'
        + '<button class="c-btn" id="ppEnable" type="button">ENABLE PUSH NOTIFICATIONS</button>'
        + '<span id="ppMsg" style="font-size:12px;margin-left:10px;"></span>'
        + '</div>'
        + '<div class="c-sub">TOPICS</div>';
      for (var i = 0; i < TOPICS.length; i++) { h += topicRow(TOPICS[i]); }
    } else {
      h += '<div class="c-box" style="margin-bottom:12px;">'
        + '<div class="c-sub">STATUS</div>'
        + '<div style="margin:6px 0;">Push is <b>on</b> for this browser.</div>'
        + '</div>'
        + '<div class="c-sub">TOPICS</div>';
      for (var i = 0; i < TOPICS.length; i++) { h += topicRow(TOPICS[i]); }
      h += '<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">'
        + '<button class="c-btn" id="ppSave" type="button">SAVE PUSH PREFS</button>'
        + '<a href="#" id="ppOffAll" style="font-size:12px;color:var(--pf-red);">Turn off all push</a>'
        + '<span id="ppMsg" style="font-size:12px;"></span>'
        + '</div>';
    }
    x.innerHTML = h;
    var en = document.getElementById('ppEnable');
    if (en) { en.addEventListener('click', enableFlow); }
    var sv = document.getElementById('ppSave');
    if (sv) { sv.addEventListener('click', savePrefs); }
    var off = document.getElementById('ppOffAll');
    if (off) {
      off.addEventListener('click', function (e) {
        e.preventDefault();
        if (!window.confirm('Turn off every push notification for this browser?')) { return; }
        globalOff();
      });
    }
  }

  function msg(t) { var m = document.getElementById('ppMsg'); if (m) { m.textContent = t; } }

  /* ---------- flows ---------- */
  /* Explicit user gesture -> permission -> VAPID -> subscribe -> register. */
  function enableFlow() {
    var btn = document.getElementById('ppEnable');
    if (!BACKEND) { msg('Command is unreachable. The wire is down \u2014 retry in a bit.'); return; }
    if (btn) { btn.disabled = true; }
    msg('Asking the browser\u2026');
    var pr = null;
    try { pr = Notification.requestPermission(); } catch (e) { pr = null; }
    /* Older browsers take a callback instead of returning a promise. */
    function onPerm(p) {
      PERM = p;
      if (p !== 'granted') {
        if (btn) { btn.disabled = false; }
        msg('');
        render(); /* 'denied' renders the blocked copy; 'default' re-renders. */
        return;
      }
      msg('Fetching the push key\u2026');
      api('push_vapid_public', {}, function (j) {
        var key = j && (j.vapid_public_key || j.publicKey || j.key);
        if (!j || !j.ok || !key) {
          if (btn) { btn.disabled = false; }
          msg('Could not reach Command. ' + errCopy(j, ''));
          return;
        }
        var sub;
        try {
          sub = REG.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
        } catch (e) {
          if (btn) { btn.disabled = false; }
          msg('This browser refused the subscription. ' + (e && e.message || ''));
          return;
        }
        sub.then(function (s) {
          var js = null;
          try { js = s.toJSON(); } catch (e2) { js = null; }
          if (!js || !js.endpoint) {
            if (btn) { btn.disabled = false; }
            msg('The subscription came back empty. Try again.');
            return;
          }
          msg('Registering this browser\u2026');
          post('push_subscribe', {
            callsign: CS,
            endpoint: js.endpoint,
            p256dh: (js.keys && js.keys.p256dh) || '',
            auth: (js.keys && js.keys.auth) || ''
          }, function (r) {
            if (btn) { btn.disabled = false; }
            if (!(r && r.ok)) {
              msg('Could not save. ' + errCopy(r, ''));
              try { s.unsubscribe(); } catch (e3) {}
              return;
            }
            SUB = s;
            msg('');
            toast('This browser will get push alerts.');
            /* Carry the pre-enable topic picks (default OFF) into prefs. */
            var chosen = {};
            var preTogs = document.querySelectorAll('.ppTog');
            for (var ti = 0; ti < preTogs.length; ti++) {
              chosen[preTogs[ti].getAttribute('data-k')] = preTogs[ti].checked ? 1 : 0;
            }
            post('push_prefs', flatPrefs(chosen), function () { loadPrefs(render); });
          });
        }, function (e4) {
          if (btn) { btn.disabled = false; }
          msg('Subscription failed. ' + (e4 && e4.message || ''));
        });
      });
    }
    if (pr && pr.then) { pr.then(onPerm, function () { onPerm('default'); }); }
    else {
      try {
        Notification.requestPermission(function (p) { onPerm(p); });
      } catch (e2) { onPerm('default'); }
    }
  }

  function savePrefs() {
    var prefs = {};
    var togs = document.querySelectorAll('.ppTog');
    for (var i = 0; i < togs.length; i++) {
      prefs[togs[i].getAttribute('data-k')] = togs[i].checked ? 1 : 0;
    }
    var b = document.getElementById('ppSave'), lbl = b ? b.textContent : '';
    if (b) { b.disabled = true; b.textContent = 'SAVING\u2026'; }
    msg('Saving\u2026');
    post('push_prefs', flatPrefs(prefs), function (j) {
      if (b) { b.disabled = false; b.textContent = lbl; }
      if (j && j.ok) { PREFS = j.prefs || prefs; toast('Push preferences saved.'); msg(''); render(); }
      else { msg('Could not save. ' + errCopy(j, '')); }
    });
  }

  /* One-tap global off (Psych §7): kill the subscription AND zero the topics. */
  function globalOff() {
    msg('Turning off\u2026');
    function zeroPrefs(done) {
      var all = {};
      for (var i = 0; i < TOPICS.length; i++) { all[TOPICS[i][0]] = 0; }
      post('push_prefs', flatPrefs(all), function (j) {
        PREFS = { daily_orders: 0, draw_results: 0, event_reminders: 0 };
        done();
      });
    }
    function dropSub(done) {
      var ep = '';
      try { ep = SUB ? SUB.endpoint : ''; } catch (e) {}
      var un = null;
      try { un = SUB ? SUB.unsubscribe() : null; } catch (e2) { un = null; }
      function tellServer() {
        if (!ep) { done(); return; }
        post('push_unsubscribe', { callsign: CS, endpoint: ep }, function () { done(); });
      }
      if (un && un.then) { un.then(tellServer, tellServer); }
      else { tellServer(); }
    }
    dropSub(function () {
      zeroPrefs(function () {
        SUB = null;
        msg('');
        toast('All push off for this browser.');
        render();
      });
    });
  }

  /* Authenticated prefs read — house pattern is PF.authGetJSONP (attaches
     callsign/device/auth_secret with claim-retry self-heal, core/14-auth.js).
     Falls back to the self-contained api() with a manually attached secret
     where authGetJSONP isn't wired. push_prefs GET is per-callsign private
     data — the backend auth-checks it, so an unauthenticated read always
     fails and the UI would sit on all-OFF. */
  function loadPrefs(cb) {
    function done(j) {
      if (j && j.ok && j.prefs) {
        PREFS = {
          daily_orders: j.prefs.daily_orders ? 1 : 0,
          draw_results: j.prefs.draw_results ? 1 : 0,
          event_reminders: j.prefs.event_reminders ? 1 : 0
        };
      } else {
        PREFS = { daily_orders: 0, draw_results: 0, event_reminders: 0 };
      }
      cb();
    }
    if (!BACKEND) { done(null); return; }
    if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, 'push_prefs', { callsign: CS }, done); return; }
    api('push_prefs', { callsign: CS, auth_secret: authSecret() }, done);
  }

  /* ---------- init ---------- */
  function init(reg) {
    REG = reg;
    CS = ident().callsign || '';
    try { PERM = Notification.permission || 'default'; } catch (e) { PERM = 'default'; }
    var pane = placePane();
    if (!pane) { return; }
    pane.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-push-prefs">'
      + '<a id="push-notifications" style="display:block;position:relative;top:-80px;"></a>'
      + '<h2>Push Notifications</h2>'
      + '<div class="c-tag">Phone-level alerts. Off by default \u2014 turn on only the topics you want.</div>'
      + '<div id="xPushPrefs"><div class="c-load">Checking push status&hellip;</div></div>'
      + '</div>';
    watchPlacement();
    if (!CS) { render(); return; }
    var gs = null;
    try { gs = reg.pushManager.getSubscription(); } catch (e) { gs = null; }
    function afterSub(s) {
      SUB = s || null;
      loadPrefs(render);
    }
    if (gs && gs.then) { gs.then(afterSub, function () { afterSub(null); }); }
    else { afterSub(null); }
  }

  /* ---------- boot: only with a LIVE service-worker registration ----------
     In Phase A the cross-origin registration fails, so getRegistration()
     resolves empty and this file renders nothing. That is the honest
     behavior — push controls appear only where push can actually work
     (Phase B: same-origin sw.js). */
  function boot() {
    var host = document.getElementById('pf-political-hq');
    if (!host) { return; }
    var gp = null;
    try { gp = navigator.serviceWorker.getRegistration(); } catch (e) { return; }
    if (!gp || !gp.then) { return; }
    gp.then(function (reg) {
      if (!reg) { return; }
      if (!reg.active && !reg.waiting && !reg.installing) { return; }
      init(reg);
    }).catch(function () {});
  }

  /* install.js loads this file only on the HQ page; the DOM is ready. */
  try { boot(); } catch (e) {}
})();
