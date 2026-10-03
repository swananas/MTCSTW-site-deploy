/* core/14-auth.js  |  PF v1.4.3 | Per-callsign auth wiring for the backend auth layer.
   - PF.getAuthSecret() / PF.saveAuthSecret(s): localStorage 'pf_auth_secret'
   - PF.authPost(backendUrl, bodyObj, cb): CORS POST with auth_secret attached.
     On 401/unauthorized with no stored secret, tries auth_claim once for the
     stored callsign, saves the secret, and retries the original request once.
   - PF.claimAuthSecret(callsign, cb): one-time claim for pre-auth users.
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
  PF.clearAuthSecret = function () {
    try { localStorage.removeItem(LS_SECRET); } catch (e) {}
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

  var authDisabled = false;
  try { authDisabled = (PF.disabled || []).indexOf('auth') !== -1; } catch (e) {}

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
      var needClaim = j && !j.ok &&
        (j.err === 'unauthorized' || String(j.err || '').indexOf('no secret issued') !== -1) &&
        !_retried && !authDisabled;
      if (needClaim) {
        var cs = actorFromBody(body);
        if (cs) {
          PF.claimAuthSecret(cs, function (cj) {
            if (cj && cj.ok && cj.auth_secret) {
              /* Retry once with the fresh secret. */
              PF.authPost(backendUrl, body, cb, true);
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
