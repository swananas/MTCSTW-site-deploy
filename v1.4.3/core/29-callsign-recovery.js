/* core/29-callsign-recovery.js  |  PF v1.4.3 | Callsign recovery (CEO directive 2026-10-06).
   Lost-device recovery via one-time recovery codes, closing the gap every
   "claim your callsign" prompt has today: no path for "I already have one
   on another device."
   - PF.recoverLinkHTML()        -> 'Already have one? Recover it →' markup,
     safe to embed in any claim prompt (delegated tap handler below).
   - PF.openCallsignRecovery()   -> the recovery modal (works from any page).
     Step: callsign + recovery code -> auth_recover -> saves the new
     auth_secret + callsign into pf_identity_v1 (the existing PF auth
     helpers), dispatches 'pf-callsign-claimed', refreshes page state.
   - PF.openRecoveryIssue()      -> "Get a recovery code" panel for the
     AUTHED device: auth_recovery_issue, then the write-it-down panel with
     the code in large typable groups, a copy button, and the warning that
     anyone with the code can move the callsign to their device.
   - PF.mountRecoveryEntry(el)   -> identity/settings entry point: mounts the
     "GET A RECOVERY CODE" button where a logged-in user sees their
     callsign (Enlistment Ranks #rWho), idempotent.
   Backend contract (be/callsign-recovery, ~/workspace/mtcstw-api/src/auth.js):
     issue:  POST {type:'auth', auth_action:'auth_recovery_issue', callsign, auth_secret}
             -> {ok, recovery_code:'XXXX-XXXX-XXXX-XXXX'}
     recover:POST {type:'auth', auth_action:'auth_recover', callsign, recovery_code, device}
             -> {ok, callsign, auth_secret}
   Copy rule: never leak which credential failed. The backend answers every
   bad recover with the same uniform error ('invalid recovery credentials');
   the UI mirrors that — a bad callsign, a bad code, and a lockout all read
   the same to the user.
   KILL: ?pf_off=29-callsign-recovery  or  localStorage pf_disabled_v1='["29-callsign-recovery"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('29-callsign-recovery') || PF.callsignRecoveryWired) return;
  PF.callsignRecoveryWired = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function myCallsign() {
    try { if (typeof window.PFCallsign === 'function') return String(window.PFCallsign() || ''); } catch (e) {}
    try { return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || ''); } catch (e) {}
    return '';
  }
  function deviceId() {
    try { if (typeof window.PFDeviceId === 'function') return String(window.PFDeviceId() || ''); } catch (e) {}
    return '';
  }
  function backend() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }
  function toast(m) { try { if (PF.toast) PF.toast(m); } catch (e) {} }

  /* 15s abort — a hung POST must fail closed, never wedge the modal. */
  function postJSON(body, cb) {
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    var url = backend();
    if (!url) { done(null); return; }
    var ctl = null, timer = null, settled = false;
    function finish(j) {
      if (settled) return; settled = true;
      if (timer) { clearTimeout(timer); timer = null; }
      done(j);
    }
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) { ctl = null; timer = null; }
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      if (ctl) o.signal = ctl.signal;
      fetch(url, o).then(function (r) { return r.json(); })
        .then(function (j) { finish(j); })
        .catch(function () { finish(null); });
    } catch (e) { finish(null); }
  }

  /* ---------- modal shell ----------
     BUTTER PASS 2026-10-07 (workstream 4): inline styles moved to the
     .pf-rec-* class library in core/02-design-system.css. IDs, ARIA,
     wiring, dismissal behavior — all unchanged, visual-only. */
  function overlayShell(label) {
    var old = document.getElementById('pf-recover-modal');
    if (old && old.parentNode) { try { old.parentNode.removeChild(old); } catch (e) {} }
    var overlay = document.createElement('div');
    overlay.id = 'pf-recover-modal';
    overlay.className = 'pf-rec-veil';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', label || 'Recover your callsign');
    var box = document.createElement('div');
    box.className = 'pf-rec-card';
    box.innerHTML = '<div class="pf-rec-x" data-pf-rec-x role="button" tabindex="0" aria-label="Close">&times;</div>' +
      '<div id="pf-rec-body"></div>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    function close() {
      try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
    }
    var x = box.querySelector('[data-pf-rec-x]');
    function dismiss() { close(); }
    if (x) {
      x.onclick = dismiss;
      x.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { dismiss(); } };
    }
    overlay.onclick = function (e) { if (e.target === overlay) dismiss(); };
    overlay.onkeydown = function (e) { if (e.key === 'Escape') dismiss(); };
    return { overlay: overlay, box: box, body: box.querySelector('#pf-rec-body'), close: close };
  }
  /* inputStyle/btnStyle retired in the 2026-10-07 butter pass: inputs and
     buttons now use .pf-rec-input / .pf-rec-btn classes from
     core/02-design-system.css. Kept as a comment so the contract stays visible. */

  /* ---------- the recovery modal ---------- */
  window.PF.openCallsignRecovery = function (opts) {
    opts = opts || {};
    var m = overlayShell('Recover your callsign');
    var b = m.body;
    var csHint = esc(myCallsign());
    b.innerHTML =
      '<div class="pf-rec-title">&#9733; RECOVER YOUR CALLSIGN &#9733;</div>' +
      '<div class="pf-rec-sub">' +
      'Got a callsign on another device? Type it plus your recovery code and it moves here &mdash; XP and all.</div>' +
      '<label for="pf-rec-cs" class="pf-rec-label">YOUR CALLSIGN</label>' +
      '<input id="pf-rec-cs" class="pf-rec-input" maxlength="20" placeholder="your_callsign" autocapitalize="off" autocomplete="off" ' +
      'autocorrect="off" spellcheck="false" value="' + csHint + '" />' +
      '<label for="pf-rec-code" class="pf-rec-label">RECOVERY CODE</label>' +
      '<input id="pf-rec-code" class="pf-rec-input pf-rec-input-mono" maxlength="24" placeholder="XXXX-XXXX-XXXX-XXXX" autocapitalize="characters" ' +
      'autocomplete="off" autocorrect="off" spellcheck="false" />' +
      '<div id="pf-rec-err" role="alert" class="pf-rec-err"></div>' +
      '<button id="pf-rec-btn" class="pf-rec-btn">RECOVER IT</button>' +
      '<div class="pf-rec-div">' +
      '<div class="pf-rec-title pf-rec-sect">FORGOT YOUR CALLSIGN?</div>' +
      '<div class="pf-rec-sub">Enter the email you signed up with:</div>' +
      '<input id="pf-rec-email" class="pf-rec-input" type="email" maxlength="128" placeholder="you@example.com" ' +
      'autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" />' +
      '<div id="pf-rec-email-err" role="alert" class="pf-rec-err"></div>' +
      '<button id="pf-rec-email-btn" class="pf-rec-btn pf-rec-btn-ghost">FIND MY CALLSIGN</button></div>' +
      '<div class="pf-rec-note">No code yet? ' +
      'On the device that has your callsign: <b>Enlistment Ranks &rarr; Get a recovery code</b>.</div>';
    var csEl = b.querySelector('#pf-rec-cs'), codeEl = b.querySelector('#pf-rec-code'),
        errEl = b.querySelector('#pf-rec-err'), btn = b.querySelector('#pf-rec-btn');
    function setErr(x) { if (errEl) errEl.textContent = x; }
    function setBusy(x) { try { btn.disabled = !!x; btn.style.opacity = x ? '.6' : '1'; } catch (e) {} }
    function doRecover() {
      var cs = String(csEl.value || '').trim().toLowerCase();
      var code = String(codeEl.value || '').trim();
      if (!/^[a-z0-9_]{3,20}$/.test(cs)) { setErr('Callsign: 3-20 chars, letters/numbers/underscore.'); return; }
      if (!code) { setErr('Enter your recovery code.'); return; }
      setErr('Recovering\u2026'); setBusy(true);
      /* The recover action needs no auth_secret — that's the point of it.
         The backend answers every failure with the same uniform error, and
         the copy below never distinguishes callsign/code/lockout. */
      postJSON({ type: 'auth', auth_action: 'auth_recover', callsign: cs,
        recovery_code: code, device: deviceId() }, function (j) {
        if (!j) { setErr('Network error. Try again.'); setBusy(false); return; }
        if (!j.ok || !j.auth_secret) {
          /* Uniform, non-leaking: bad callsign, bad code, lockout — same face. */
          setErr('That didn\u2019t check out. Double-check the callsign and code, then try again.');
          setBusy(false);
          return;
        }
        try { if (PF.saveAuthSecret) PF.saveAuthSecret(j.auth_secret); } catch (e) {}
        try {
          var ik = 'pf_identity_v1', cur = {};
          try { cur = JSON.parse(localStorage.getItem(ik) || '{}'); } catch (e2) {}
          cur.callsign = String(j.callsign || cs).toLowerCase();
          localStorage.setItem(ik, JSON.stringify(cur));
        } catch (e3) {}
        setErr('');
        b.innerHTML =
          '<div class="pf-rec-success">&#9733; RECOVERED &#9733;</div>' +
          '<div class="pf-rec-sub pf-rec-sub-bright">Welcome back, <b>' +
          esc(String(j.callsign || cs).toUpperCase()) + '</b>. Your name, XP, and rank are back on this device.</div>';
        try { document.dispatchEvent(new CustomEvent('pf-callsign-claimed', { detail: { callsign: String(j.callsign || cs) } })); } catch (e4) {}
        /* The old claim modal (pfClaimModal) may still be open underneath —
           clear it so the recovered state paints everywhere. */
        try {
          var oldClaim = document.getElementById('pf-cs-modal');
          if (oldClaim && oldClaim.parentNode) oldClaim.parentNode.removeChild(oldClaim);
        } catch (e5) {}
        toast('Callsign recovered. Welcome back, ' + String(j.callsign || cs).toUpperCase() + '.');
        setTimeout(function () { m.close(); try { location.reload(); } catch (e6) {} }, 1100);
      });
    }
    btn.onclick = doRecover;
    codeEl.onkeydown = function (e) { if (e.key === 'Enter') doRecover(); };
    csEl.onkeydown = function (e) { if (e.key === 'Enter') { try { codeEl.focus(); } catch (e2) {} } };
    /* Email-based callsign lookup (CEO directive 2026-10-07): "one email in,
       callsign out." Hits ?action=recover_callsign, fills the callsign field
       on success so the user can continue with recovery code flow. */
    var emailEl = b.querySelector('#pf-rec-email'), emailErrEl = b.querySelector('#pf-rec-email-err'),
        emailBtn = b.querySelector('#pf-rec-email-btn');
    function setEmailErr(x) { if (emailErrEl) emailErrEl.textContent = x; }
    function setEmailBusy(x) { try { emailBtn.disabled = !!x; emailBtn.style.opacity = x ? '.6' : '1'; } catch (e) {} }
    function doEmailLookup() {
      var em = String(emailEl.value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { setEmailErr('Enter a valid email address.'); return; }
      setEmailErr('Looking up\u2026'); setEmailBusy(true);
      var url = backend();
      if (!url) { setEmailErr('Network error. Try again.'); setEmailBusy(false); return; }
      fetch(url + '?action=recover_callsign&email=' + encodeURIComponent(em))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          setEmailBusy(false);
          if (j && j.ok && j.callsign) {
            var found = String(j.callsign);
            setEmailErr('');
            try { csEl.value = found; } catch (e) {}
            setEmailErr('');
            /* Show the found callsign prominently. */
            emailErrEl.style.color = '#7ddf8a';
            setEmailErr('Found: ' + found.toUpperCase() + ' \u2014 now enter your recovery code above.');
            try { codeEl.focus(); } catch (e2) {}
          } else if (j && j.error === 'rate_limited') {
            emailErrEl.style.color = '#ff6b6b';
            setEmailErr('Too many tries \u2014 wait 10 minutes.');
          } else {
            emailErrEl.style.color = '#ff6b6b';
            setEmailErr('No callsign found for that email.');
          }
        })
        .catch(function () { setEmailBusy(false); emailErrEl.style.color = '#ff6b6b'; setEmailErr('Network error. Try again.'); });
    }
    if (emailBtn) emailBtn.onclick = doEmailLookup;
    if (emailEl) emailEl.onkeydown = function (e) { if (e.key === 'Enter') doEmailLookup(); };
    try { (csHint ? codeEl : csEl).focus(); } catch (e) {}
  };

  /* ---------- the recovery-code display panel (authed device) ---------- */
  window.PF.openRecoveryIssue = function () {
    var m = overlayShell('Get a recovery code');
    var b = m.body;
    var cs = myCallsign();
    if (!cs) {
      b.innerHTML = '<div class="pf-rec-sub">You need a callsign on this device first. ' +
        'Claim or recover one, then come back for your code.</div>';
      return;
    }
    b.innerHTML =
      '<div class="pf-rec-title">&#9733; YOUR RECOVERY CODE &#9733;</div>' +
      '<div id="pf-rec-i-body"></div>';
    var ib = b.querySelector('#pf-rec-i-body');
    function issueView() {
      ib.innerHTML =
        '<div class="pf-rec-sub">' +
        'A recovery code moves <b class="pf-rec-b">' + esc(cs.toUpperCase()) +
        '</b> to a new phone, tablet, or browser &mdash; one code, one move.</div>' +
        '<div id="pf-rec-i-err" role="alert" class="pf-rec-err"></div>' +
        '<button id="pf-rec-i-btn" class="pf-rec-btn">GET A RECOVERY CODE</button>';
      var btn = ib.querySelector('#pf-rec-i-btn'), errEl = ib.querySelector('#pf-rec-i-err');
      btn.onclick = function () {
        errEl.textContent = 'Writing your code\u2026';
        btn.disabled = true; btn.style.opacity = '.6';
        /* Issue requires the current auth_secret — PF.authPost attaches it.
           The secret must be VALID for this callsign (that's the anchor). */
        function fired(j) {
          if (!j) { errEl.textContent = 'Network error. Try again.'; btn.disabled = false; btn.style.opacity = '1'; return; }
          if (!j.ok || !j.recovery_code) {
            var e = String((j && (j.err || j.error)) || '');
            if (/too many/i.test(e)) errEl.textContent = 'Too many codes issued \u2014 try again in 24h.';
            else if (/unauthorized/i.test(e)) errEl.textContent = 'This device isn\u2019t signed in as ' + cs.toUpperCase() + ' anymore. Re-claim your callsign, then try again.';
            else errEl.textContent = 'The code desk is down. Try again in a bit.';
            btn.disabled = false; btn.style.opacity = '1';
            return;
          }
          codeView(String(j.recovery_code));
        }
        try {
          if (PF.authPost) PF.authPost(backend(), { type: 'auth', auth_action: 'auth_recovery_issue', callsign: cs }, fired);
          else postJSON({ type: 'auth', auth_action: 'auth_recovery_issue', callsign: cs, auth_secret: (PF.getAuthSecret ? PF.getAuthSecret() : '') }, fired);
        } catch (e) {
          postJSON({ type: 'auth', auth_action: 'auth_recovery_issue', callsign: cs, auth_secret: (PF.getAuthSecret ? PF.getAuthSecret() : '') }, fired);
        }
      };
    }
    /* The write-it-down panel: the plaintext is shown ONCE and never stored
       in the page. Typable groups, copy button, hard warning. */
    function codeView(code) {
      ib.innerHTML =
        '<div class="pf-rec-title pf-rec-sect pf-rec-sect-cream">' +
        'WRITE THIS DOWN &mdash; IT WON\u2019T BE SHOWN AGAIN</div>' +
        '<div id="pf-rec-i-code" class="pf-rec-code">' + esc(code) + '</div>' +
        '<button id="pf-rec-i-copy" class="pf-rec-btn pf-rec-btn-ghost pf-rec-copybtn">COPY CODE</button>' +
        '<div id="pf-rec-i-copied" class="pf-rec-copy-ok"></div>' +
        '<div class="pf-rec-warn">&#9888; Anyone with this code can move your callsign to <i>their</i> device. ' +
        'Keep it secret &mdash; treat it like a password.</div>' +
        '<div class="pf-rec-note">Need another later? A new code cancels the old one.</div>';
      var copyBtn = ib.querySelector('#pf-rec-i-copy'), copiedEl = ib.querySelector('#pf-rec-i-copied');
      copyBtn.onclick = function () {
        function done() { try { copiedEl.textContent = 'Copied. Now write it down somewhere safe.'; } catch (e) {} }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done, function () { fallback(); });
          } else fallback();
        } catch (e) { fallback(); }
        function fallback() {
          try {
            var ta = document.createElement('textarea');
            ta.value = code; ta.style.cssText = 'position:fixed;opacity:0;';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta); done();
          } catch (e2) { try { copiedEl.textContent = 'Copy failed \u2014 write it down by hand.'; } catch (e3) {} }
        }
      };
    }
    issueView();
  };

  /* ---------- reusable link markup + identity entry point ---------- */
  /* Embeddable in ANY claim prompt: <button> (not <a>) so it needs no href,
     opens the modal, and never navigates. The delegated tap handler below
     owns it, so it works from banners, modals, game panes, and bundles. */
  window.PF.recoverLinkHTML = function () {
    return '<div class="pf-recover-row">' +
      '<button type="button" data-pf-recover-cs="1" class="pf-recover-link">' +
      'Already have one? Recover it &rarr;</button></div>';
  };

  /* Identity/settings entry point: mount once under a callsign display (e.g.
     Enlistment Ranks #rWho). Guarded + idempotent. */
  window.PF.mountRecoveryEntry = function (el) {
    try {
      var node = typeof el === 'string' ? document.querySelector(el) : el;
      if (!node || !myCallsign()) return false;
      if (node.querySelector && node.querySelector('[data-pf-recovery-entry]')) return true;
      var wrap = document.createElement('div');
      wrap.setAttribute('data-pf-recovery-entry', '1');
      wrap.className = 'pf-recovery-entry';
      wrap.innerHTML =
        '<button type="button" data-pf-recovery-issue="1" class="pf-rec-entrybtn">' +
        'GET A RECOVERY CODE</button>' +
        '<div class="pf-rec-entrysub">Move this callsign to a new device.</div>';
      node.appendChild(wrap);
      return true;
    } catch (e) { return false; }
  };

  /* ---------- delegated taps ---------- */
  document.addEventListener('click', function (e) {
    var t = null;
    try { t = (e.target && e.target.closest) ? e.target.closest('[data-pf-recover-cs],[data-pf-recovery-issue]') : null; } catch (_e) {}
    if (!t || !window.PF) return;
    try { e.preventDefault(); } catch (_e2) {}
    try {
      if (t.hasAttribute('data-pf-recovery-issue')) { PF.openRecoveryIssue(); return; }
      PF.openCallsignRecovery();
    } catch (_e3) {}
  });
})();
