/* core/14-auth.js  |  PF v1.4.3 | Per-callsign auth wiring for the backend auth layer.
   - PF.getAuthSecret() / PF.saveAuthSecret(s): localStorage 'pf_auth_secret'
   - PF.authPost(backendUrl, bodyObj, cb): CORS POST with auth_secret attached.
     On 401/unauthorized with no stored secret, tries auth_claim once for the
     stored callsign, saves the secret, and retries the original request once.
   - PF.claimAuthSecret(callsign, cb): one-time claim for pre-auth users.
   - PF.authGetJSONP(backendUrl, action, params, cb, opts): authenticated JSONP
     GET with the same claim-retry self-heal as authPost (plus a 12s timeout).
     Legacy callsigns that cannot be claimed surface err:'legacy_callsign'.
   Backend contract: ~/workspace/mtcstw-api/src/auth.js
   KILL: ?pf_off=auth (disables the 401 auto-claim; secrets still attach) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.authWired) return;
  PF.authWired = true;

  var LS_SECRET = 'pf_auth_secret';

  PF.getAuthSecret = function () {
    try { return String(localStorage.getItem(LS_SECRET) || ''); } catch (e) { return ''; }
  };
  PF.saveAuthSecret = function (s) {
    try { if (s) localStorage.setItem(LS_SECRET, String(s)); } catch (e) {}
  };

  function callsign() {
    try { if (typeof window.PFCallsign === 'function') return String(window.PFCallsign() || '').toLowerCase(); } catch (e) {}
    try { return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || '').toLowerCase(); } catch (e) {}
    return '';
  }
  function deviceId() {
    try { if (typeof window.PFDeviceId === 'function') return String(window.PFDeviceId() || ''); } catch (e) {}
    return '';
  }

  /* Extract the acting callsign from a POST body for the claim-retry path.
     Mirrors the backend's actor-field priority loosely; falls back to the
     stored identity. */
  function actorFromBody(body) {
    var fields = ['callsign', 'from_cs', 'booster', 'creator', 'lender', 'subscriber', 'sponsor', 'requester'];
    for (var i = 0; i < fields.length; i++) {
      try {
        var v = String(body[fields[i]] || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (/^[a-z0-9_]{3,20}$/.test(v)) return v;
      } catch (e) {}
    }
    return callsign();
  }

  function rawPost(backendUrl, bodyObj, cb) {
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      /* 15s timeout: a hung POST must fail closed (done(null)) rather than
         hang the UI forever (e.g. the War Bonds claim button). */
      var ctl = null, timer = null, settled = false;
      function finish(j) { if (settled) return; settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        done(j); }
      try {
        if (window.AbortController) {
          ctl = new AbortController();
          timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) { ctl = null; timer = null; }
      var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) };
      if (ctl) opts.signal = ctl.signal;
      fetch(backendUrl, opts)
        .then(function (r) { return r.json(); })
        .then(function (j) { finish(j); })
        .catch(function () { finish(null); });
    } catch (e) { done(null); }
  }

  /* One-time claim for pre-auth callsigns. POST {type:'auth',auth_action:'auth_claim'} */
  PF.claimAuthSecret = function (cs, cb) {
    cs = String(cs || '').toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cs)) { try { cb({ ok: false, err: 'bad callsign' }); } catch (e) {} return; }
    var backend = '';
    try { backend = window.PF_BACKEND_URL || ''; } catch (e) {}
    if (!backend) { try { cb({ ok: false, err: 'no backend' }); } catch (e) {} return; }
    rawPost(backend, { type: 'auth', auth_action: 'auth_claim', callsign: cs, device: deviceId() }, function (j) {
      if (j && j.ok && j.auth_secret) PF.saveAuthSecret(j.auth_secret);
      try { cb(j); } catch (e) {}
    });
  };

  /* M1 (2026-10-03): honor the KILL via PF.skip — it covers both the
     ?pf_off=auth query param and localStorage pf_disabled_v1. */
  var authDisabled = false;
  try { authDisabled = PF.skip("auth"); } catch (e) {}

  /* Authenticated JSONP GET with claim-retry (2026-10-03). Mirrors the
     PF.authPost self-heal for read paths: attaches callsign/device/secret
     when available; on 'missing credentials' with no stored secret, performs
     a one-time auth_claim, stores the secret, and retries the read once.
     Legacy callsigns that cannot be claimed surface err:'legacy_callsign'
     (distinct code, no loop). 12s timeout so reads can't hang forever. */
  PF.authGetJSONP = function (backendUrl, action, params, cb, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeout || 12000;
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (!backendUrl || !action) { done(null); return; }
    function fire(p, cb2) {
      var q = "?action=" + encodeURIComponent(action);
      for (var k in p) { if (p[k] != null && p[k] !== "") q += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(p[k]); }
      var fn = "pfAJP" + Math.floor(Math.random() * 1e9);
      var s = document.createElement("script"), settled = false;
      function finish(j) {
        if (settled) return; settled = true;
        try { delete window[fn]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        cb2(j);
      }
      window[fn] = function (j) { finish(j); };
      s.onerror = function () { finish(null); };
      s.src = backendUrl + q + "&callback=" + fn;
      document.head.appendChild(s);
      setTimeout(function () { finish(null); }, timeoutMs);
    }
    var p = Object.assign({}, params || {});
    var cs = callsign();
    if (cs && !p.callsign) p.callsign = cs;
    var dev = deviceId();
    if (dev && !p.device) p.device = dev;
    var sec = PF.getAuthSecret();
    if (sec && !p.auth_secret) p.auth_secret = sec;
    fire(p, function (j) {
      /* Claim-retry: the backend said 'missing credentials' because this
         browser never stored a secret. One claim attempt, then one retry.
         Never loops: _retried is set on the retry, and a 'claim
         unavailable' claim response surfaces a distinct code instead. */
      /* Reads both `err` and `error` shapes — some backend actions return
         `error:` and the claim-retry must fire on either. */
      var ec = j && (j.err || j.error);
      var needClaim = j && !j.ok && !opts._retried && !authDisabled && !PF.getAuthSecret() &&
        (ec === 'missing credentials' || String(ec || '').indexOf('missing credentials') !== -1);
      if (needClaim) {
        var claimCs = String(p.callsign || cs || '').toLowerCase();
        if (claimCs) {
          PF.claimAuthSecret(claimCs, function (cj) {
            if (cj && cj.ok && cj.auth_secret) {
              var o2 = Object.assign({}, opts); o2._retried = true;
              PF.authGetJSONP(backendUrl, action, params, cb, o2);
            } else if (cj && String((cj.err || cj.error) || '').indexOf('claim unavailable') !== -1) {
              /* Legacy callsign: no secret can ever be issued for it —
                 distinct code so callers can show recovery copy, no loop. */
              done({ ok: false, err: 'legacy_callsign' });
            } else {
              done(j);
            }
          });
          return;
        }
      }
      done(j);
    });
  };

  /* Canonical authenticated POST. Attaches auth_secret; on 401/unauthorized
     with no stored secret, attempts a one-time auth_claim for the acting
     callsign and retries the original request once. */
  PF.authPost = function (backendUrl, bodyObj, cb, _retried) {
    if (!backendUrl) { try { cb({ ok: false, err: 'no backend' }); } catch (e) {} return; }
    /* Clone the caller's object — the secret is written into the clone, never
       the input (a silo may reuse or inspect its body object afterwards). */
    var body = Object.assign({}, bodyObj || {});
    var secret = PF.getAuthSecret();
    if (secret) body.auth_secret = secret;
    rawPost(backendUrl, body, function (j) {
      /* Claim-retry: fire when the callsign has no usable secret. Covers
         'unauthorized' (wrong secret), 'no secret issued' (never claimed),
         AND 'missing credentials' (nothing stored locally yet — the case
         for every pre-auth user, where no claim would ever otherwise fire,
         e.g. Armory buy/equip from a fresh browser). One attempt, then the
         original error stands. */
      var noStored = !PF.getAuthSecret();
      /* Both error shapes, same as authGetJSONP above. */
      var ec = j && (j.err || j.error);
      var needClaim = j && !j.ok && (
        ec === 'unauthorized' ||
        String(ec || '').indexOf('no secret issued') !== -1 ||
        (noStored && (ec === 'missing credentials' ||
          String(ec || '').indexOf('missing credentials') !== -1))
      ) && !_retried && !authDisabled;
      if (needClaim) {
        var cs = actorFromBody(body);
        if (cs) {
          PF.claimAuthSecret(cs, function (cj) {
            if (cj && cj.ok && cj.auth_secret) {
              /* Retry once with the fresh secret. */
              PF.authPost(backendUrl, body, cb, true);
            } else if (cj && String((cj.err || cj.error) || '').indexOf('claim unavailable') !== -1) {
              /* Legacy callsign that can never self-claim — surface the
                 stable 'legacy_callsign' code (same as authGetJSONP) so
                 every POST surface can render recovery copy, not raw
                 backend prose. */
              try { cb({ ok: false, err: 'legacy_callsign' }); } catch (e) {}
            } else {
              try { cb(j); } catch (e) {}
            }
          });
          return;
        }
      }
      try { cb(j); } catch (e) {}
    });
  };
})();
