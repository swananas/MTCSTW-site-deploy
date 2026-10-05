/* games/ambush-drop.js  |  PF v1.4.3 | S6 AMBUSH DROPS (Wave 3).
   Self-mounting: polls the backend for a live ambush drop and, when one is
   active, mounts a site-wide "INCOMING SUPPLY DROP" banner with the
   extraction countdown and slot counter. Tapping through opens the claim
   panel: one-tap claim -> rarity-styled reveal (matches the loot-crate
   reveal in games/dopamine.js). A spawn ping lands in the site bell inbox
   server-side; this module also nudges locally when it sees a new drop id.
   Reads:  GET ambush_status (public JSONP)   — {ok, live, drop:{id,ends_at,slot_cap,claims,claimed_by_you}}
   Writes: POST {type:"ambush",amb_action:"ambush_open"} (auth-gated, device-limited)
   KILL: ?pf_off=ambush  or  localStorage pf_disabled_v1='["ambush"]'
   GUARDRAILS: everything try/catch; never throws into the page render path.
   No real names, no @shanetheswan, no "donate" in copy. */
(function () {
  'use strict';
  try {
    var PF = window.PF;
    if (!PF || PF.skip('ambush')) { return; }

    var BACKEND = window.PF_BACKEND_URL;
    var POLL_MS = 60000;
    var SEEN_LS = 'pf_ambush_seen_v1';
    var RARITY = {
      common:    { c: '#9aa0a6', label: 'COMMON' },
      rare:      { c: '#4da3ff', label: 'RARE' },
      epic:      { c: '#b45cff', label: 'EPIC' },
      legendary: { c: '#e8b10c', label: 'LEGENDARY' }
    };

    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function ident() {
      var cs = '', dev = '';
      try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
      try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
      return { callsign: cs, device: dev };
    }
    function toast(m) {
      try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
      try {
        var t = document.createElement('div'); t.textContent = m;
        t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
          'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
          'border:2px solid #fff;z-index:100001';
        document.body.appendChild(t);
        setTimeout(function () { try { t.remove(); } catch (e2) {} }, 3200);
      } catch (e2) {}
    }

    /* JSONP GET (device is non-sensitive, rides in the query string). */
    function api(action, params, cb) {
      if (!BACKEND) { try { cb(null); } catch (e) {} return; }
      try {
        var fn = 'pfAmbCb' + Math.floor(Math.random() * 1e9), s = document.createElement('script'), done = false;
        function finish(j) {
          if (done) return; done = true;
          try { delete window[fn]; } catch (e) {}
          try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
          try { cb(j); } catch (e3) {}
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
      } catch (e) { try { cb(null); } catch (e2) {} }
    }

    /* CORS POST for the claim (through the shared auth layer when present). */
    function post(type, actionKey, action, params, cb) {
      var body = Object.assign({ type: type }, params || {});
      body[actionKey] = action;
      function done(j) {
        try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {}
      }
      try {
        if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, done); return; }
        var bodyStr = JSON.stringify(body);
        var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr }, c = null, t = null;
        try {
          if (window.AbortController) {
            c = new AbortController(); o.signal = c.signal;
            t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
          }
        } catch (e) {}
        fetch(BACKEND, o)
          .then(function (r) { return r.json(); })
          .then(function (j) { if (t) { try { clearTimeout(t); } catch (e) {} } done(j); })
          .catch(function () { if (t) { try { clearTimeout(t); } catch (e) {} } done(null); });
      } catch (e) { done(null); }
    }

    function css() {
      try {
        if (document.getElementById('pf-ambush-css')) return;
        var s = document.createElement('style'); s.id = 'pf-ambush-css';
        s.textContent =
          '#pfAmbushBar{position:fixed;left:0;right:0;bottom:0;z-index:99995;' +
            'background:#14060a;border-top:3px solid #c1121f;color:#f5ead6;' +
            'font-family:monospace;padding:10px 14px;display:flex;align-items:center;' +
            'gap:12px;box-shadow:0 -4px 18px rgba(193,18,31,.45);animation:ambpulse 1.6s ease-in-out infinite}' +
          '#pfAmbushBar .amb-tag{background:#c1121f;color:#fff;font-weight:bold;font-size:12px;' +
            'padding:4px 8px;letter-spacing:2px;white-space:nowrap}' +
          '#pfAmbushBar .amb-meta{font-size:12px;line-height:1.5;flex:1;min-width:0}' +
          '#pfAmbushBar .amb-meta b{color:#ffb3b3}' +
          '#pfAmbushBar button{background:#c1121f;color:#fff;border:2px solid #fff;font:bold 13px monospace;' +
            'padding:8px 16px;cursor:pointer;letter-spacing:2px;white-space:nowrap}' +
          '#pfAmbushBar button:disabled{opacity:.45;cursor:default}' +
          '@keyframes ambpulse{0%,100%{box-shadow:0 -4px 18px rgba(193,18,31,.45)}' +
            '50%{box-shadow:0 -4px 28px rgba(193,18,31,.85)}}' +
          '#pfAmbushModal{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.78);' +
            'display:flex;align-items:center;justify-content:center;padding:18px}' +
          '#pfAmbushModal .amb-card{background:#0d0d0d;border:3px solid #c1121f;max-width:360px;width:100%;' +
            'padding:22px 18px;text-align:center;color:#f5ead6;font-family:monospace}' +
          '#pfAmbushModal .amb-crate{font-size:64px;line-height:1}' +
          '#pfAmbushModal .amb-crate.amb-shake{animation:ambshake .6s ease-in-out}' +
          '#pfAmbushModal .amb-count{font-size:13px;color:#ffb3b3;margin:8px 0}' +
          '#pfAmbushModal .amb-slots{font-size:12px;color:#c9bfa8;margin:4px 0 12px}' +
          '#pfAmbushModal .amb-claim{background:#c1121f;color:#fff;border:2px solid #fff;' +
            'font:bold 15px monospace;padding:12px 22px;cursor:pointer;letter-spacing:2px}' +
          '#pfAmbushModal .amb-claim:disabled{opacity:.45;cursor:default}' +
          '#pfAmbushModal .amb-err{font-size:12px;color:#ff8080;margin-top:10px;min-height:16px}' +
          '#pfAmbushModal .amb-close{background:transparent;border:1px solid #5a1a1a;color:#c9bfa8;' +
            'font:12px monospace;padding:6px 12px;margin-top:10px;cursor:pointer}' +
          /* Loot-crate reveal styling (matches games/dopamine.js dp-reward). */
          '.amb-reward{margin:12px auto 0;max-width:320px;padding:14px;border:3px solid #9aa0a6;' +
            'background:#0d0d0d;text-align:center;animation:ambburst .5s ease-out}' +
          '.amb-reward .amb-rlabel{font:bold 12px monospace;letter-spacing:3px;margin-bottom:6px}' +
          '.amb-reward .amb-rxp{font:bold 34px monospace;color:#f5ead6}' +
          '.amb-reward .amb-rname{font:13px monospace;color:#c9bfa8;margin-top:4px}' +
          '.amb-reward.amb-burst{animation:ambburst .5s ease-out}' +
          '@keyframes ambburst{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes ambshake{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}' +
            '50%{transform:rotate(5deg)}75%{transform:rotate(-3deg)}}' +
          '@media (prefers-reduced-motion: reduce){#pfAmbushBar,.amb-crate.amb-shake,.amb-reward,.amb-reward.amb-burst{animation:none!important}}';
        document.head.appendChild(s);
      } catch (e) {}
    }

    var ST = null;       // latest ambush_status
    var tickTimer = null;

    function fmtLeft(ms) {
      ms = Math.max(0, ms);
      var s = Math.floor(ms / 1000);
      var m = Math.floor(s / 60), ss = s % 60;
      return (m < 10 ? '0' + m : '' + m) + ':' + (ss < 10 ? '0' + ss : '' + ss);
    }

    function removeBar() {
      try { var b = document.getElementById('pfAmbushBar'); if (b) b.remove(); } catch (e) {}
    }
    function removeModal() {
      try { var m = document.getElementById('pfAmbushModal'); if (m) m.remove(); } catch (e) {}
    }

    function renderBar() {
      removeBar();
      try {
        if (!ST || !ST.live || !ST.drop) return;
        var d = ST.drop;
        var left = d.ends_at - Date.now();
        if (left <= 0) return;
        if (d.claimed_by_you) return;
        var bar = document.createElement('div');
        bar.id = 'pfAmbushBar';
        bar.innerHTML =
          '<span class="amb-tag">INCOMING SUPPLY DROP</span>' +
          '<span class="amb-meta">Extraction in <b id="pfAmbLeft">' + esc(fmtLeft(left)) + '</b><br>' +
          '<span id="pfAmbSlots">' + Number(d.claims || 0) + '/' + Number(d.slot_cap || 200) + ' claimed</span></span>' +
          '<button id="pfAmbGo">GRAB IT</button>';
        document.body.appendChild(bar);
        var go = document.getElementById('pfAmbGo');
        if (go) go.onclick = function () { try { openModal(); } catch (e) {} };
      } catch (e) {}
    }

    function tick() {
      try {
        var el = document.getElementById('pfAmbLeft');
        if (el && ST && ST.live && ST.drop) {
          var left = ST.drop.ends_at - Date.now();
          if (left <= 0) { removeBar(); removeModal(); refresh(); return; }
          el.textContent = fmtLeft(left);
        }
        var m = document.getElementById('pfAmbCount');
        if (m && ST && ST.live && ST.drop) m.textContent = 'Extraction in ' + fmtLeft(ST.drop.ends_at - Date.now());
      } catch (e) {}
    }

    function openModal() {
      try {
        if (!ST || !ST.live || !ST.drop) return;
        removeModal();
        css();
        var d = ST.drop;
        var wrap = document.createElement('div');
        wrap.id = 'pfAmbushModal';
        wrap.innerHTML =
          '<div class="amb-card"><div class="amb-crate" id="ambCrate">&#128230;</div>' +
          '<div class="amb-count" id="pfAmbCount">Extraction in ' + esc(fmtLeft(d.ends_at - Date.now())) + '</div>' +
          '<div class="amb-slots"><span id="pfAmbSlotsM">' + Number(d.claims || 0) + '/' + Number(d.slot_cap || 200) + '</span> claimed — first come, first served.</div>' +
          '<div id="ambRewardSlot"></div>' +
          '<button class="amb-claim" id="ambClaimBtn">CLAIM THE DROP</button>' +
          '<div class="amb-err" id="ambErr"></div>' +
          '<button class="amb-close" id="ambCloseBtn">STAND DOWN</button></div>';
        document.body.appendChild(wrap);
        var close = document.getElementById('ambCloseBtn');
        if (close) close.onclick = removeModal;
        var btn = document.getElementById('ambClaimBtn');
        if (btn) btn.onclick = claim;
      } catch (e) {}
    }

    function claim() {
      try {
        var btn = document.getElementById('ambClaimBtn');
        var err = document.getElementById('ambErr');
        var crate = document.getElementById('ambCrate');
        var id = ident();
        if (!id.callsign || !id.device) {
          if (err) err.textContent = 'Claim a callsign in Enlistment Ranks first — the drop needs somewhere to go.';
          return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'CRACKING IT OPEN...'; }
        if (crate) { crate.classList.remove('amb-shake'); crate.classList.add('amb-shake'); }
        post('ambush', 'amb_action', 'ambush_open', { callsign: id.callsign, device: id.device }, function (j) {
          try {
            if (crate) crate.classList.remove('amb-shake');
            if (j && j.ok && j.reward) {
              var r = j.reward, rk = RARITY[r.rarity] || RARITY.common;
              var slot = document.getElementById('ambRewardSlot');
              if (slot) {
                slot.innerHTML = '<div class="amb-reward amb-burst" style="border-color:' + rk.c + '">' +
                  '<div class="amb-rlabel" style="color:' + rk.c + '">' + esc(j.consolation ? 'CONSOLATION' : (rk.label + (r.type === 'xp' ? '' : ' — ' + esc(String(r.type || '').toUpperCase())))) + '</div>' +
                  '<div class="amb-rxp">' + (r.xp > 0 ? '+' + Number(r.xp) + ' XP' : esc(String(r.label || 'EMPTY HANDS'))) + '</div>' +
                  '<div class="amb-rname">' + esc(String(r.label || '')) + '</div></div>';
              }
              if (btn) { btn.disabled = true; btn.textContent = 'CLAIMED'; }
              try { document.dispatchEvent(new CustomEvent('pf-ambush-claimed', { detail: { reward: r } })); } catch (e2) {}
              try {
                if (window.PF && PF.dope && (r.rarity === 'epic' || r.rarity === 'legendary')) {
                  PF.dope.confetti(document.getElementById('pfAmbushModal'), 40);
                  if (r.xp > 0) PF.dope.xpFloat(document.getElementById('pfAmbushModal'), '+' + Number(r.xp) + ' XP');
                }
              } catch (e3) {}
              /* Refresh the banner state so it doesn't re-offer a claimed drop. */
              setTimeout(refresh, 1500);
            } else {
              if (btn) { btn.disabled = false; btn.textContent = 'CLAIM THE DROP'; }
              var msg = 'The drop slipped away. Try again.';
              try {
                var e = String((j && j.err) || '');
                if (e === 'already claimed') msg = 'You already grabbed this drop. One per soldier.';
                else if (e === 'drop exhausted') msg = 'All slots claimed — extraction beat you to it.';
                else if (e === 'no drop live') msg = 'Extraction already happened. Watch for the next one.';
              } catch (e2) {}
              if (err) err.textContent = msg;
            }
          } catch (e) {}
        });
      } catch (e) {}
    }

    function seenId() {
      try { return localStorage.getItem(SEEN_LS) || ''; } catch (e) { return ''; }
    }
    function markSeen(id) {
      try { localStorage.setItem(SEEN_LS, id); } catch (e) {}
    }

    function refresh() {
      try {
        var id = ident();
        api('ambush_status', { device: id.device }, function (j) {
          try {
            if (!j || !j.ok) return;
            ST = j;
            /* Bell hook: a brand-new drop id pings locally (the server also
               drops an inbox notification, so the header bell lights up). */
            if (j.live && j.drop && j.drop.id) {
              var prev = seenId();
              if (prev && prev !== j.drop.id && !j.drop.claimed_by_you) {
                toast('INCOMING SUPPLY DROP — claim it before extraction!');
                try { document.dispatchEvent(new CustomEvent('pf-ambush-live', { detail: { drop: j.drop } })); } catch (e2) {}
              }
              markSeen(j.drop.id);
            }
            renderBar();
          } catch (e) {}
        });
      } catch (e) {}
    }

    function init() {
      try {
        css();
        refresh();
        try { setInterval(refresh, POLL_MS); } catch (e) {}
        try { tickTimer = setInterval(tick, 1000); } catch (e2) {}
        try {
          document.addEventListener('visibilitychange', function () {
            if (!document.hidden) refresh();
          });
        } catch (e3) {}
      } catch (e) {}
    }

    /* Site-wide self-mount: fire on DOMContentLoaded (or immediately if the
       document is already parsed). Never throw into the page. */
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { try { init(); } catch (e) {} });
      } else {
        init();
      }
    } catch (e) {}
  } catch (e) {}
})();
