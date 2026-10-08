/* core/28-bsky-link.js  |  PF v1.4.3 | Pod 4 — "Sign in with Bluesky" (OAuth).
   Browser-side OAuth via the official @atproto/oauth-client-browser SDK.
   The SDK is ESM-only so it ships as a separate lazily-loaded IIFE
   (window.PFBlueskyOAuth, built by scripts/build-bsky-sdk.js) — fetched
   via <script> ONLY on user action or the OAuth callback landing, never
   on the homepage critical path. The OAuth session (tokens, DPoP keys)
   lives in the browser's IndexedDB, managed entirely by the SDK — it is
   NEVER sent to our backend. The backend stores ONLY the public
   (DID, handle) pair against the callsign (src/bskylink.js). Handle
   resolution goes through our own worker's XRPC proxy
   (pf-api /xrpc/com.atproto.identity.resolveHandle) — DNS is unavailable
   in browsers, so the SDK requires a backend handleResolver.

   Flow: [Sign in with Bluesky] -> handle input -> SDK resolves handle to
   the account's PDS -> redirect to Bluesky -> approve -> redirect back to
   https://www.mtcstw.com/?bsky_oauth=1 -> SDK completes the callback ->
   frontend POSTs {did, handle} to bsky_link (callsign+auth_secret gated).

   Scope: `atproto` ONLY (minimal — the link needs the DID from the
   session's `sub`, which the SDK verifies, plus the handle the visitor
   typed; no profile info is displayed so no profile scope is requested).

   API:
     PF.bsky.status(cb)   -> {ok, linked, did?, handle?} for this callsign
     PF.bsky.unlink(cb)   -> removes the link (auth-gated)
     PF.bsky.startLink(handle) -> begins the OAuth redirect (needs callsign)
     PF.bsky.mount(el)    -> renders the link card into el
   Mount: auto-mounts into #pf-bsky-link / [data-pf-bsky-link] placeholders,
   plus one default card at the end of the homepage (#pf-v2) when no
   placeholder exists. Re-renders on 'pf-callsign-claimed'.
   Copy presents the link as connecting to the MTCSTW network hub (@mtcstw.com).
   KILL: ?pf_off=28-bsky-link  or  localStorage pf_disabled_v1='["28-bsky-link"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('28-bsky-link')) return;
  if (PF.bsky) return;

  var CLIENT_ID = 'https://pf-api.mtcstw.workers.dev/oauth-client-metadata.json';
  /* Backend XRPC handle-resolver (src/bskylink.js bskyResolveProxy). DNS is
     unavailable in browsers, so the SDK README requires a backend
     handleResolver; given this base URL the SDK calls
     GET <base>/xrpc/com.atproto.identity.resolveHandle?handle=<h>. */
  var HANDLE_RESOLVER = 'https://pf-api.mtcstw.workers.dev';
  var SDK_FILE = 'core/bsky-oauth-sdk.js';
  var SDK_GLOBAL = 'PFBlueskyOAuth';
  var PENDING_KEY = 'pf_bsky_pending_handle';
  var HUB_HANDLE = '@mtcstw.com';

  var bsky = {};
  PF.bsky = bsky;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function callsign() {
    try { if (window.PFCallsign) return String(window.PFCallsign() || ''); } catch (e) {}
    try { return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || ''); } catch (e) {}
    return '';
  }
  function backend() { return window.PF_BACKEND_URL || ''; }
  function notify(msg) {
    try { if (PF.notify) { PF.notify('info', msg); return; } } catch (e) {}
    try { alert(msg); } catch (e2) {}
  }
  function normHandle(h) {
    var s = String(h || '').trim().toLowerCase();
    if (s.charAt(0) === '@') s = s.slice(1);
    if (s.length > 253 || s.indexOf('.') < 0) return '';
    if (!/^[a-z0-9]([a-z0-9.\-]{0,251}[a-z0-9])?$/.test(s)) return '';
    return s;
  }

  /* Lazy SDK loader — promise-cached, 20s timeout, fails soft.
     The SDK is ESM-only (no UMD/IIFE shipped), so it cannot ride the
     whole-file-concat build/bundle.js pipeline. It ships as a separate
     IIFE (window.PFBlueskyOAuth) built once per deploy by the additive
     scripts/build-bsky-sdk.js esbuild step, and is fetched here via
     <script> ONLY on user action or the OAuth callback landing — never
     on the homepage critical path. URL derivation follows the
     ownBase() pattern (core/money-chunk-loader.js): same CDN pin as the
     executing core bundle. */
  var sdkPromise = null;
  function sdkUrl() {
    try {
      var ss = document.getElementsByTagName('script');
      for (var i = ss.length - 1; i >= 0; i--) {
        var s2 = (ss[i] && ss[i].src) || '';
        var m = s2.match(/^(.*\/v1\.4\.3\/)core\/bundle-core(-slr)?\.js/);
        if (m) return m[1] + SDK_FILE;
      }
      /* Local dev / standalone demo: resolve relative to the page. */
      return new URL('v1.4.3/' + SDK_FILE, document.baseURI).toString();
    } catch (e) { return null; }
  }
  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      function bad(e) { reject(e || new Error('sdk load failed')); }
      try {
        var g = window[SDK_GLOBAL];
        if (g && g.BrowserOAuthClient) { resolve(g); return; }
        var url = sdkUrl();
        if (!url) { bad(new Error('no sdk url')); return; }
        var timer = setTimeout(function () { bad(new Error('sdk timeout')); }, 20000);
        var s = document.createElement('script');
        s.async = true;
        s.onload = function () {
          clearTimeout(timer);
          var g2 = window[SDK_GLOBAL];
          if (g2 && g2.BrowserOAuthClient) resolve(g2);
          else bad(new Error('sdk global missing'));
        };
        s.onerror = function () { clearTimeout(timer); bad(new Error('sdk script error')); };
        s.src = url;
        document.head.appendChild(s);
      } catch (e) { bad(e); }
    });
    return sdkPromise;
  }

  function isCallbackLanding() {
    try { return new URLSearchParams(location.search).get('bsky_oauth') === '1'; }
    catch (e) { return false; }
  }
  function cleanUrl() {
    try {
      var u = new URL(location.href);
      ['bsky_oauth', 'code', 'state', 'iss', 'error', 'error_description', 'error_uri']
        .forEach(function (k) { u.searchParams.delete(k); });
      var qs = u.searchParams.toString();
      history.replaceState(null, '', u.pathname + (qs ? '?' + qs : '') + u.hash);
    } catch (e) {}
  }
  function pendingHandle() {
    try { return normHandle(sessionStorage.getItem(PENDING_KEY)); } catch (e) { return ''; }
  }
  function clearPending() { try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {} }

  /* ---------- backend calls ---------- */
  bsky.status = function (cb) {
    function done(j) { try { cb(j || { ok: false }); } catch (e) {} }
    var cs = callsign();
    if (!cs || !backend() || !PF.authGetJSONP) { done({ ok: false, err: 'no callsign' }); return; }
    PF.authGetJSONP(backend(), 'bsky_status', { callsign: cs }, done);
  };
  bsky.unlink = function (cb) {
    function done(j) { try { cb(j || { ok: false }); } catch (e) {} }
    if (!callsign() || !backend() || !PF.authPost) { done({ ok: false }); return; }
    /* Test-plan D3: revoke the browser SDK session for the linked DID
       first (tokens live client-side, so revocation happens here), then
       remove the backend row. The backend unlink proceeds even if the
       revoke fails — the row is the source of truth. */
    function dropRow() {
      PF.authPost(backend(),
        { type: 'bskylink', bl_action: 'bsky_unlink', callsign: callsign() }, done);
    }
    bsky.status(function (st) {
      var did = st && st.ok && st.linked ? String(st.did || '') : '';
      if (!did) { dropRow(); return; }
      loadSdk().then(function (mod) {
        return mod.BrowserOAuthClient.load({ clientId: CLIENT_ID, handleResolver: HANDLE_RESOLVER });
      }).then(function (client) {
        return client.revoke(did);
      }).then(dropRow, dropRow);
    });
  };

  /* ---------- OAuth start ---------- */
  bsky.startLink = function (rawHandle) {
    if (!backend()) { notify('Backend unreachable — try again in a moment.'); return; }
    PF.requireCallsign(function (cs) {
      if (!cs) { notify('Claim a callsign first — the ledger needs a name.'); return; }
      var h = normHandle(rawHandle);
      if (!h) { notify('Enter your Bluesky handle, like you.bsky.social.'); return; }
      try { sessionStorage.setItem(PENDING_KEY, h); } catch (e) {}
      renderAll('working', 'Opening Bluesky…');
      loadSdk().then(function (mod) {
        return mod.BrowserOAuthClient.load({ clientId: CLIENT_ID, handleResolver: HANDLE_RESOLVER });
      }).then(function (client) {
        /* Redirects the browser to the account's PDS. This promise never
           resolves on success — the page navigates away. */
        return client.signIn(h, { scope: 'atproto' });
      }).then(function () {
        renderAll();
      }).catch(function () {
        clearPending();
        renderAll();
        notify('Could not start Bluesky sign-in — check your connection and try again.');
      });
    }, { context: 'to link your Bluesky account' });
  };

  /* ---------- OAuth callback (redirect landing) ---------- */
  function completeCallback() {
    var params;
    try { params = new URLSearchParams(location.search); }
    catch (e) { cleanUrl(); return; }
    var err = params.get('error');
    if (err) {
      /* User cancelled (access_denied) or the AS refused — never a link. */
      notify(err === 'access_denied'
        ? 'Bluesky sign-in cancelled — no link was made.'
        : 'Bluesky sign-in failed (' + err + ') — no link was made.');
      clearPending();
      cleanUrl();
      renderAll();
      return;
    }
    if (!params.get('code') && !params.get('state')) {
      /* Landed with ?bsky_oauth=1 but no OAuth response (bookmark/typo). */
      cleanUrl();
      renderAll();
      return;
    }
    renderAll('working', 'Completing Bluesky sign-in…');
    loadSdk().then(function (mod) {
      return mod.BrowserOAuthClient.load({ clientId: CLIENT_ID, handleResolver: HANDLE_RESOLVER });
    }).then(function (client) {
      /* init() auto-detects the OAuth response in the URL, validates
         state/PKCE/DPoP, and restores the session from IndexedDB. */
      return client.init();
    }).then(function (result) {
      var did = result && result.session ? String(result.session.did || '') : '';
      var handle = pendingHandle();
      if (!did) throw new Error('no session');
      if (!handle) throw new Error('no handle');
      if (!callsign()) throw new Error('no callsign');
      /* The ONLY thing we send the backend: the public DID + handle.
         Tokens stay in the browser's IndexedDB. */
      PF.authPost(backend(),
        { type: 'bskylink', bl_action: 'bsky_link', callsign: callsign(), did: did, handle: handle },
        function (j) {
          cleanUrl();
          clearPending();
          if (j && j.ok) {
            notify('Bluesky linked: @' + handle + ' — welcome to the hub.');
          } else {
            notify('Link failed: ' + ((j && (j.err || j.error)) || 'unknown error') +
              ' Your Bluesky sign-in itself worked — nothing was stored.');
          }
          renderAll();
        });
    }).catch(function (e) {
      cleanUrl();
      clearPending();
      renderAll();
      var msg = (e && e.message) || '';
      if (msg === 'no handle' || msg === 'no callsign') {
        notify('Sign-in completed, but we lost track of your handle — please start the link again.');
      } else {
        notify('Could not complete Bluesky sign-in — please try again. No link was made.');
      }
    });
  }

  /* ---------- card UI ---------- */
  var CARD_CSS = 'max-width:560px;margin:1rem auto;background:#0d0d0d;border:2px solid #1d9bf0;' +
    'color:#f5ead6;padding:1rem 1.25rem;text-align:center;font-family:Arial,sans-serif;box-sizing:border-box;';
  var BTN_CSS = 'background:#1d9bf0;color:#fff;border:none;font-family:inherit;font-weight:900;' +
    'letter-spacing:.1em;font-size:.85rem;padding:.7rem 1.6rem;cursor:pointer;margin-top:.6rem;';
  var INPUT_CSS = 'width:100%;background:#141414;color:#f5ead6;border:2px solid #1d9bf0;padding:.7rem;' +
    'font-size:1rem;font-family:inherit;box-sizing:border-box;margin-top:.6rem;text-align:center;';

  function cardShell(inner) {
    return '<div class="pf-bsky-card" style="' + CARD_CSS + '">' + inner + '</div>';
  }
  function headHtml() {
    return '<div style="font-size:.95rem;font-weight:900;letter-spacing:.12em;color:#1d9bf0;">' +
      '&#129419; LINK YOUR BLUESKY</div>' +
      '<div style="font-size:.78rem;color:#b8ab8e;margin:.4rem 0 .2rem;line-height:1.5;">' +
      'Connect your Bluesky account to your callsign and plug into the MTCSTW network hub (' +
      esc(HUB_HANDLE) + '). Bluesky handles the sign-in &mdash; we never see your password, ' +
      'and we store only your public handle and account ID. No XP, no funny business.</div>';
  }

  function renderInto(el, mode, msg) {
    if (!el) return;
    var cs = callsign();
    if (!cs) {
      /* No callsign yet — invitational, never a toll. The claim CTA owns
         the claim flow; we just point at it. */
      el.innerHTML = cardShell(headHtml() +
        '<div style="font-size:.8rem;color:#b8ab8e;margin-top:.6rem;">Claim a callsign first, then link your Bluesky.</div>' +
        /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
        (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })());
      return;
    }
    if (mode === 'working') {
      el.innerHTML = cardShell(headHtml() +
        '<div style="font-size:.85rem;color:#f5ead6;margin-top:.8rem;">' + esc(msg || 'Working…') + '</div>');
      return;
    }
    bsky.status(function (st) {
      if (st && st.ok && st.linked) {
        el.innerHTML = cardShell(
          '<div style="font-size:.95rem;font-weight:900;letter-spacing:.12em;color:#1d9bf0;">' +
          '&#129419; BLUESKY LINKED</div>' +
          '<div style="font-size:1rem;color:#f5ead6;margin:.5rem 0;">@' + esc(st.handle) + '</div>' +
          '<div style="font-size:.72rem;color:#b8ab8e;word-break:break-all;">' + esc(st.did) + '</div>' +
          '<div style="font-size:.72rem;color:#b8ab8e;margin-top:.4rem;">Signed in via Bluesky &mdash; ' +
          'your session stays in this browser.</div>' +
          '<button data-pf-bsky-unlink="1" style="' + BTN_CSS + 'background:#5a5a5a;">UNLINK</button>');
        var ub = el.querySelector('[data-pf-bsky-unlink]');
        if (ub) ub.onclick = function () {
          if (!window.confirm('Unlink your Bluesky account from this callsign?')) return;
          renderInto(el, 'working', 'Unlinking…');
          bsky.unlink(function () { renderAll(); notify('Bluesky unlinked.'); });
        };
      } else {
        el.innerHTML = cardShell(headHtml() +
          '<input data-pf-bsky-handle="1" maxlength="253" placeholder="you.bsky.social" ' +
          'autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" style="' + INPUT_CSS + '" />' +
          '<button data-pf-bsky-go="1" style="' + BTN_CSS + '">&#129419; SIGN IN WITH BLUESKY</button>');
        var go = el.querySelector('[data-pf-bsky-go]');
        var inp = el.querySelector('[data-pf-bsky-handle]');
        function submit() { bsky.startLink(inp ? inp.value : ''); }
        if (go) go.onclick = submit;
        if (inp) inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
        });
      }
    });
  }

  var mounted = [];
  function renderAll(mode, msg) {
    for (var i = 0; i < mounted.length; i++) {
      try { renderInto(mounted[i], mode, msg); } catch (e) {}
    }
  }
  bsky.mount = function (el) {
    var node = typeof el === 'string' ? document.querySelector(el) : el;
    if (!node || mounted.indexOf(node) >= 0) return false;
    mounted.push(node);
    renderInto(node);
    return true;
  };

  function autoMount() {
    var found = 0;
    try {
      var nodes = document.querySelectorAll('#pf-bsky-link, [data-pf-bsky-link]');
      for (var i = 0; i < nodes.length; i++) { if (bsky.mount(nodes[i])) found++; }
    } catch (e) {}
    /* Default placement: end of the homepage (#pf-v2) when no explicit
       placeholder exists. One line moves it: <div id="pf-bsky-link"></div>. */
    if (!found) {
      try {
        var home = document.getElementById('pf-v2');
        if (home && !document.getElementById('pf-bsky-auto')) {
          var wrap = document.createElement('div');
          wrap.id = 'pf-bsky-auto';
          home.appendChild(wrap);
          if (bsky.mount(wrap)) found++;
        }
      } catch (e2) {}
    }
    return found;
  }

  function boot() {
    autoMount();
    if (isCallbackLanding()) completeCallback();
  }
  bsky.boot = boot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  /* Re-render when identity changes (claim / switch). */
  try {
    document.addEventListener('pf-callsign-claimed', function () { renderAll(); });
  } catch (e) {}
})();
