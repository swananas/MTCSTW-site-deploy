/* core/commend.js  |  PF v1.4.3 | W5-7 BATTLE COMMENDATIONS.
   1/day peer kudos on War-Room ticker items; 5 gives in a Chicago week
   unlocks EARLIER ambush claim access (priority), nothing else. Zero XP
   anywhere — commendations are honor currency, soulbound, non-transferable.
   Mount: commend buttons attach to [data-ticker-item] elements carrying a
   data-callsign (ticker_item_id optional, from data-ticker-item-id); a
   standalone "commend a callsign" form rides the progress chip as fallback
   (the ticker frontend may not exist yet — the form covers that case).
   Daily progress chip: "COMMENDS 3/5 — 2 TO PRIORITY".
   Reads: commend_status (JSONP GET). Writes: commend_give (POST, auth-gated).
   KILL: ?pf_off=commend  or  localStorage pf_disabled_v1='["commend"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('commend')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  var CS_RE = /^[a-z0-9_]{3,20}$/;

  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function norm(s) { return String(s || '').toLowerCase().trim(); }

  /* JSONP GET (copy of the 20-nextop.js read path). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
      if (_sec && params && !params.auth_secret) params.auth_secret = _sec;
    } catch (e2) {}
    var fn = 'pfCmdCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* Friendly copy for backend error codes. Never exposes raw codes. */
  var ERR_COPY = {
    'daily used': "Today's commend is spent — a fresh one drops at midnight.",
    'pair cap': 'You already commended them this week — pick a new comrade.',
    'ring detected': 'Whoa — trade loops are for markets, not comrades. Commends go to fresh backs.',
    'self commend': "You can't commend yourself. The fight is a team sport.",
    'bad receiver': 'That callsign does not look right — 3 to 20 letters, numbers, underscores.',
    'unauthorized': 'Claim your callsign first, then commend away.',
    'missing credentials': 'Claim your callsign first, then commend away.',
    'legacy_callsign': "This callsign predates the new auth system — contact MTCSTW to recover it.",
    'db error': 'The line cut out — try the commend again.'
  };
  function errCopy(code) {
    var c = String(code || '');
    /* Raw fallback paths surface the backend's 'claim unavailable' prose —
       map it to the same recovery copy as the stable code. */
    if (c === 'legacy_callsign' || c.indexOf('claim unavailable') !== -1)
      return ERR_COPY['legacy_callsign'];
    return ERR_COPY[c] || 'The commend did not go through — try again.';
  }

  /* ---- state ---- */
  var ST = { used: false, gives: 0, priority: false, loaded: false, sent: {}, failed: false, legacy: false };

  function refreshStatus(cb) {
    var id = ident();
    api('commend_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          ST.used = !!j.used_today;
          ST.gives = Math.min(5, +j.gives_this_week || 0);
          ST.priority = !!j.priority;
          ST.failed = false;
          ST.legacy = false;
        } else {
          /* Fail-soft (2026-10-05 legacy auth fix): a failed or timed-out
             status read must NEVER leave the chip on "LOADING" forever.
             Mark loaded on ANY completed response and remember the shape. */
          ST.failed = true;
          var e = j ? String(j.err || j.error || '') : '';
          ST.legacy = (e === 'legacy_callsign' || e.indexOf('claim unavailable') !== -1);
        }
        ST.loaded = true;
      } catch (e) { ST.loaded = true; ST.failed = true; }
      renderChip();
      if (cb) cb();
    });
  }

  /* ---- progress chip + fallback form ---- */
  var chip = null, form = null;
  function ensureChrome() {
    if (chip) return;
    chip = document.createElement('div');
    chip.id = 'pf-commend-chip';
    chip.setAttribute('style',
      'position:fixed;right:12px;bottom:64px;z-index:9998;cursor:pointer;' +
      'background:#0a0a0a;color:#fff;border:1px solid #c1121f;border-radius:10px;' +
      'padding:8px 12px;font:700 11px/1.4 system-ui,Arial,sans-serif;letter-spacing:.06em;' +
      'box-shadow:0 4px 18px rgba(0,0,0,.5);max-width:220px;text-align:left;');
    chip.title = 'Tap to commend a callsign';
    chip.addEventListener('click', function () {
      /* Fail-soft tap behavior (2026-10-05 legacy auth fix): a failed status
         read retries on tap; a legacy-unclaimable callsign opens the form
         with recovery copy instead of hanging on LOADING. */
      if (ST.failed && !ST.legacy) { refreshStatus(function () { mountOnItems(); }); return; }
      toggleForm();
      if (ST.legacy) setFormMsg(ERR_COPY['legacy_callsign']);
    });
    document.body.appendChild(chip);

    form = document.createElement('div');
    form.id = 'pf-commend-form';
    form.style.cssText =
      'position:fixed;right:12px;bottom:112px;z-index:9999;display:none;' +
      'background:#111;border:1px solid #c1121f;border-radius:12px;padding:14px;' +
      'width:240px;font:400 12px/1.5 system-ui,Arial,sans-serif;color:#fff;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.6);';
    form.innerHTML =
      '<div style="font-weight:800;font-size:11px;letter-spacing:.08em;color:#ff5a5f;margin-bottom:8px;">COMMEND A COMRADE</div>' +
      '<div style="color:#bbb;margin-bottom:8px;">One per day, use-or-lose. No XP — just honor.</div>' +
      '<input id="pf-commend-input" placeholder="callsign" maxlength="20" ' +
      'style="width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid #444;background:#000;color:#fff;margin-bottom:8px;" />' +
      '<button id="pf-commend-send" style="width:100%;padding:9px;border:0;border-radius:8px;' +
      'background:#c1121f;color:#fff;font-weight:800;letter-spacing:.06em;cursor:pointer;">SEND COMMEND</button>' +
      '<div id="pf-commend-msg" style="margin-top:8px;color:#ff8a8a;display:none;"></div>';
    document.body.appendChild(form);
    var btn = form.querySelector('#pf-commend-send');
    btn.addEventListener('click', function () {
      var inp = form.querySelector('#pf-commend-input');
      give(norm(inp.value), '', function (msg) { setFormMsg(msg); });
    });
  }
  function toggleForm() {
    if (!form) return;
    form.style.display = (form.style.display === 'none' || !form.style.display) ? 'block' : 'none';
  }
  function setFormMsg(msg) {
    var m = form.querySelector('#pf-commend-msg');
    m.style.display = msg ? 'block' : 'none';
    m.textContent = msg || '';
  }
  function renderChip() {
    if (!chip) return;
    var label;
    if (ST.priority) {
      label = '<span style="color:#ff5a5f;">PRIORITY EARNED</span><br>AMBUSH EARLY ACCESS';
    } else if (!ST.loaded) {
      label = 'COMMENDS — LOADING';
    } else if (ST.failed && ST.legacy) {
      /* Legacy-unclaimable callsign: never LOADING, never a dead button —
         tap opens the form with recovery copy. */
      label = '<span style="color:#ff5a5f;">COMMENDS — RECOVER</span><br>TAP FOR HELP';
    } else if (ST.failed) {
      /* Network/backend failure: tap retries the status read. */
      label = 'COMMENDS — OFFLINE<br>TAP TO RETRY';
    } else if (ST.used) {
      label = 'COMMENDS ' + ST.gives + '/5 — BACK AT MIDNIGHT';
    } else {
      label = 'COMMENDS ' + ST.gives + '/5 — ' + (5 - ST.gives) + ' TO PRIORITY';
    }
    chip.innerHTML = label;
  }

  /* ---- give ---- */
  function give(receiver, tickerItemId, done) {
    if (!CS_RE.test(receiver)) { done(errCopy('bad receiver')); return; }
    var id = ident();
    if (!id.callsign) { done(errCopy('unauthorized')); return; }
    if (norm(receiver) === norm(id.callsign)) { done(errCopy('self commend')); return; }
    if (ST.sent[receiver]) { done(errCopy('pair cap')); return; }
    function post(retry) {
      var body = { type: 'commend', co_action: 'commend_give',
        callsign: id.callsign, device: id.device,
        receiver_callsign: receiver };
      if (tickerItemId) body.ticker_item_id = tickerItemId;
      try {
        PF.authPost(BACKEND, body, function (j) {
          handle(j, retry);
        });
      } catch (e) { done(errCopy('db error')); }
    }
    function handle(j, retry) {
      if (j && j.ok) {
        ST.used = true;
        ST.gives = Math.min(5, Math.max(ST.gives, j.week_gives || 0));
        if (j.priority) ST.priority = true;
        ST.sent[receiver] = 1;
        renderChip();
        done(j.priority
          ? 'COMMENDED — and that was the 5th. AMBUSH EARLY ACCESS unlocked this week.'
          : 'COMMENDED — no XP, just respect.');
      } else if (j && !retry && (j.err === 'missing credentials' || j.err === 'unauthorized')) {
        /* auth self-heal rail (14-auth.js): one retry after the claim-retry. */
        post(true);
      } else {
        if (j && j.err === 'daily used') ST.used = true;
        renderChip();
        done(errCopy(j && j.err));
      }
    }
    post(false);
  }

  /* ---- ticker item buttons ---- */
  function mountOnItems() {
    var items = [];
    try { items = document.querySelectorAll('[data-ticker-item]:not([data-pf-commend])'); } catch (e) {}
    for (var i = 0; i < items.length; i++) {
      (function (el) {
        el.setAttribute('data-pf-commend', '1');
        var recv = norm(el.getAttribute('data-callsign') || '');
        var itemId = el.getAttribute('data-ticker-item-id') || el.getAttribute('data-ticker-item') || '';
        if (!CS_RE.test(recv)) return;
        var b = document.createElement('button');
        b.className = 'pf-commend-btn';
        b.type = 'button';
        b.setAttribute('style',
          'display:inline-block;margin-left:8px;padding:3px 10px;border:1px solid #c1121f;' +
          'border-radius:999px;background:transparent;color:#ff5a5f;cursor:pointer;' +
          'font:700 10px/1.6 system-ui,Arial,sans-serif;letter-spacing:.08em;');
        b.textContent = 'COMMEND';
        b.title = 'Give today\'s commend to ' + recv + ' — 1/day, no XP, just honor';
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (b.disabled) return;
          b.disabled = true;
          give(recv, String(itemId || '').slice(0, 64), function (msg) {
            flash(b, msg, !msg.indexOf('COMMENDED'));
          });
        });
        try { el.appendChild(b); } catch (e2) {}
      })(items[i]);
    }
  }
  function flash(b, msg, ok) {
    var old = b.textContent;
    b.textContent = ok ? 'COMMENDED' : 'BLOCKED';
    b.style.background = ok ? '#c1121f' : 'transparent';
    b.style.color = ok ? '#fff' : '#ff8a8a';
    b.title = msg;
    /* One inline line under the button so the reason is visible in-flow. */
    var note = document.createElement('div');
    note.className = 'pf-commend-note';
    note.setAttribute('style',
      'font:400 10px/1.4 system-ui,Arial,sans-serif;color:' + (ok ? '#7CFF9B' : '#ff8a8a') + ';margin:2px 0 0 8px;');
    note.textContent = msg;
    try { b.parentNode.insertBefore(note, b.nextSibling); } catch (e) {}
    setTimeout(function () {
      b.textContent = old;
      b.style.background = 'transparent';
      b.style.color = '#ff5a5f';
      b.disabled = false;
      if (note.parentNode) note.parentNode.removeChild(note);
    }, 6000);
  }

  /* ---- boot ---- */
  ensureChrome();
  refreshStatus(function () { mountOnItems(); });
  var scans = 0;
  var obs = null;
  function scan() {
    mountOnItems();
    if (++scans > 120 && obs) { try { obs.disconnect(); } catch (e) {} }
  }
  var timer = setInterval(scan, 5000);
  try {
    obs = new MutationObserver(function () { mountOnItems(); });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setTimeout(function () { clearInterval(timer); }, 10 * 60 * 1000);
})();
