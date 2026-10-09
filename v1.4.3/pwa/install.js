/* pwa/install.js  |  PF v1.4.3 | PWA bootstrap.
   Injects the web manifest + iOS meta tags, attempts service-worker
   registration, and surfaces an INSTALL APP prompt when the browser fires
   beforeinstallprompt (Android/Chrome) or when iOS A2HS is available.
   It never reaches into another silo's internals.
   KILL: ?pf_off=pwa  or  localStorage pf_disabled_v1='["pwa"]' */
(function () {
  'use strict';
  var PF = window.PF || { skip: function () { return false; } };
  if (PF.skip('pwa')) { return; }

  /* FIX 2026-10-07 (fix/pwa-glitch): install.js executes TWICE on v2 pages
     (once bundled inside bundle-core, once as the standalone pwa/install.js
     the footer loader appends). DOM-id guards stop duplicate buttons, but
     the iOS visit counter incremented twice per page view, defeating the
     "2nd visit" gate and nagging on the very first visit. */
  if (window.__pfPwaBooted) { return; }
  window.__pfPwaBooted = true;

  /* ---------- derive our own CDN base (pin-agnostic) ---------- */
  function pwaBase() {
    var scripts = document.getElementsByTagName('script');
    var fallback = null;
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i].src || '';
      /* FIX 2026-10-07 (fix/pwa-glitch): version-agnostic. The old code
         hardcoded '/v1.4.3/', so the entire PWA silently disabled itself
         on any version bump. */
      var m = s.match(/\/v\d+\.\d+\.\d+\//);
      if (!m) { continue; }
      var base = s.slice(0, s.indexOf(m[0]) + m[0].length) + 'pwa/';
      /* ZUCK 2026-10-09 (fe-zuck-pwa): prefer the jsDelivr pin script when
         both exist, but accept ANY versioned script src. The Cloudflare
         Pages shell loads origin-relative /v1.4.3/... scripts with no
         MTCSTW-site-deploy in the URL — the old host check bailed the
         entire PWA bootstrap (no SW, no install prompt) on the live site. */
      if (s.indexOf('MTCSTW-site-deploy') !== -1) { return base; }
      if (!fallback) { fallback = base; }
    }
    return fallback;
  }
  var BASE = pwaBase();
  if (!BASE) { return; }

  /* ---------- inject manifest + platform meta ---------- */
  function addLink(rel, href, extra) {
    if (document.querySelector('link[rel="' + rel + '"]')) { return; }
    var l = document.createElement('link');
    l.rel = rel; l.href = href;
    if (extra) { for (var k in extra) { l.setAttribute(k, extra[k]); } }
    document.head.appendChild(l);
  }
  function addMeta(name, content) {
    if (document.querySelector('meta[name="' + name + '"]')) { return; }
    var m = document.createElement('meta');
    m.name = name; m.content = content;
    document.head.appendChild(m);
  }
  /* FIX 2026-10-07 (fix/pwa-glitch): crossorigin="use-credentials" makes the
     manifest fetch credentialed, but jsDelivr answers ACAO:* with no
     ACAC:true — the browser rejects the manifest outright (CORS), killing
     the Android install prompt and iOS manifest metadata. Anonymous mode
     works with the wildcard ACAO. */
  addLink('manifest', BASE + 'manifest.json', { crossorigin: 'anonymous' });
  addLink('apple-touch-icon', BASE + 'apple-touch-icon.png');
  addMeta('theme-color', '#c1121f');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  addMeta('apple-mobile-web-app-title', 'MTCSTW');

  /* ---------- service worker (same-origin required) ---------- */
  // Browsers hard-require the SW script to be same-origin with the site.
  // Phase B (2026-10-05): try the origin-relative /sw.js FIRST (served by
  // the pf-sw Cloudflare worker on www.mtcstw.com); fall back to the CDN
  // copy, which WILL fail with a SecurityError — we catch it and run in
  // manifest-only mode (iOS A2HS + install signals).
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('/sw.js').then(
        function () { if (window.console) console.log('[PF PWA] SW registered (origin)'); },
        function () {
          navigator.serviceWorker.register(BASE + 'sw.js').then(
            function () { if (window.console) console.log('[PF PWA] SW registered (CDN)'); },
            function (err) { if (window.console) console.log('[PF PWA] SW unavailable (needs same-origin hosting):', err && err.message); }
          );
        }
      );
    } catch (e) {
      if (window.console) console.log('[PF PWA] SW registration blocked:', e && e.message);
    }
  }

  /* ---------- push prefs client (2026-10-05, fe/pwa) ---------- */
  // The push settings UI lives on the account/settings surface (Political
  // HQ, next to "Control the Signal"). push.js self-hides unless a live
  // service-worker registration exists (Phase B), so loading it is a no-op
  // everywhere else. Placed before the standalone bail so installed apps
  // (iOS home-screen — the only place iOS push works) also get it.
  try {
    if (BASE && document.getElementById('pf-political-hq')) {
      var pfPush = document.createElement('script');
      pfPush.src = BASE + 'push.js';
      pfPush.async = true;
      pfPush.onerror = function () {
        if (window.console) { console.log('[PF PWA] push.js failed to load'); }
      };
      document.head.appendChild(pfPush);
    }
  } catch (e) {}

  /* ---------- already installed? bail ---------- */
  var isStandalone = false;
  try {
    isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  } catch (e) {}
  if (isStandalone) { return; }
  try {
    if (sessionStorage.getItem('pf_pwa_dismissed') === '1') { return; }
  } catch (e) {}

  /* ---------- install-prompt gating (ZUCK 2026-10-09, fe-zuck-pwa) ----------
     Facebook-level polish means never interrupting a cold visitor. The
     prompt unlocks on the 2nd visit OR after the first real engagement
     (callsign claim / vote / order check-in / XP gain / meaningful scroll).
     A dismiss snoozes for 7 days; an accepted prompt buys 90 days of quiet
     even if the user cancels the OS sheet (no appinstalled ever fires). */
  var VISIT_KEY = 'pf_pwa_visits_v1';
  var ENGAGE_KEY = 'pf_pwa_engaged_v1';
  var SNOOZE_KEY = 'pf_pwa_snooze_v1';
  var ASKED_KEY = 'pf_pwa_asked_v1';
  var NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  function pwaVisits() {
    try { return Number(localStorage.getItem(VISIT_KEY) || 0); } catch (e) { return 0; }
  }
  function pwaEngaged() {
    try { return sessionStorage.getItem(ENGAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function pwaSnoozed() {
    try {
      var now = Date.now();
      var until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (until && now < until) { return true; }
      var asked = Number(localStorage.getItem(ASKED_KEY) || 0);
      if (asked && (now - asked) < NINETY_DAYS) { return true; }
      return false;
    } catch (e) { return false; }
  }
  function pwaGateOpen() {
    return pwaVisits() >= 2 || pwaEngaged();
  }
  function pwaSnooze(days) {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000)); } catch (e) {}
  }
  /* The single-boot guard above makes this increment once per page view. */
  try { localStorage.setItem(VISIT_KEY, String(pwaVisits() + 1)); } catch (e3) {}

  /* ---------- install prompt UI ---------- */
  var deferredPrompt = null;
  var btn = null;

  function toast(m) {
    try { if (PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2400);
    } catch (e2) {}
  }

  function dismiss(permanent) {
    if (btn && btn.parentNode) { btn.parentNode.removeChild(btn); btn = null; }
    if (permanent) { try { sessionStorage.setItem('pf_pwa_dismissed', '1'); } catch (e) {} }
  }

  function showButton(label, onTap) {
    if (btn) { return; }
    if (pwaSnoozed()) { return; }
    /* FIX 2026-10-06 (fix/pwa-install-ios-tap): install.js executes TWICE on
       v2 pages — once inside bundle-core[-slr].js and once as the standalone
       pwa/install.js the footer loader appends right after it (JS_PWA). The
       per-instance `btn` closure cannot see the other instance, so two
       identical #pf-pwa-install buttons stacked at the same spot: tapping the
       top one dismissed only that instance's button while the twin underneath
       stayed put, making the tap look like a no-op. Guard on the DOM id so
       only one button ever exists, whichever instance wins the race. */
    try {
      if (document.getElementById('pf-pwa-install')) { return; }
    } catch (e) {}
    btn = document.createElement('button');
    btn.id = 'pf-pwa-install';
    btn.setAttribute('aria-label', 'Install the MTCSTW app');
    btn.innerHTML = '<span style="font-size:16px;margin-right:8px">\u25BC</span>' + label
      + '<span id="pf-pwa-x" role="button" aria-label="Dismiss" style="margin-left:12px;opacity:.7;cursor:pointer">\u2715</span>';
    btn.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;'
      + 'background:#c1121f;color:#fff;border:2px solid #0a0a0a;border-radius:10px;'
      + 'font:bold 14px monospace;letter-spacing:1px;padding:12px 16px;cursor:pointer;'
      + 'box-shadow:0 4px 18px rgba(193,18,31,.55);'
      + 'animation:pfPwaIn .45s cubic-bezier(.2,.9,.25,1.2);';
    /* ZUCK 2026-10-09: the entrance keyframes ride with the button so the
       prompt pops instead of blinking in. One <style>, id-guarded. */
    try {
      if (!document.getElementById('pf-pwa-anim')) {
        var st = document.createElement('style');
        st.id = 'pf-pwa-anim';
        st.textContent = '@keyframes pfPwaIn{0%{transform:translateY(24px) scale(.92);opacity:0}'
          + '60%{transform:translateY(-4px) scale(1.02);opacity:1}'
          + '100%{transform:translateY(0) scale(1);opacity:1}}';
        document.head.appendChild(st);
      }
    } catch (e2) {}
    btn.addEventListener('click', function (e) {
      /* ZUCK 2026-10-09: a dismiss is a 7-day snooze, not a session nap —
         nagging every page load after an X tap is what made the old
         prompt feel cheap. */
      if (e.target && e.target.id === 'pf-pwa-x') { dismiss(true); pwaSnooze(7); return; }
      onTap();
    });
    document.body.appendChild(btn);
  }

  var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  /* ---------- Android/Chrome: gated beforeinstallprompt ---------- */
  function maybeShowAndroid() {
    if (!deferredPrompt || btn) { return; }
    if (pwaSnoozed()) { return; }
    if (!pwaGateOpen()) { return; }
    showButton('INSTALL APP', function () {
      if (!deferredPrompt) { return; }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          try { localStorage.setItem(ASKED_KEY, String(Date.now())); } catch (e) {}
          toast('Welcome to the factory.');
          dismiss(true);
        } else {
          /* Declined the OS sheet: 7-day snooze, not a session loop. */
          pwaSnooze(7);
          dismiss(false);
        }
        deferredPrompt = null;
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    maybeShowAndroid();
  });

  /* ---------- engagement unlocks the prompt ---------- */
  function markEngaged() {
    try {
      if (sessionStorage.getItem(ENGAGE_KEY) !== '1') {
        sessionStorage.setItem(ENGAGE_KEY, '1');
      }
    } catch (e) {}
    maybeShowAndroid();
    iosTryShow();
  }
  ['pf-callsign-claimed', 'pf-vote-cast', 'pf-order-checkin', 'pf-xp'].forEach(function (ev) {
    try { document.addEventListener(ev, markEngaged); } catch (e5) {}
  });
  /* A real scroll (past the fold) counts as engagement — one-shot. */
  try {
    var scrollArmed = true;
    window.addEventListener('scroll', function () {
      if (!scrollArmed) { return; }
      try {
        var y = window.scrollY || window.pageYOffset || 0;
        if (y > 300) { scrollArmed = false; markEngaged(); }
      } catch (e6) {}
    }, { passive: true });
  } catch (e7) {}

  /* FIX 2026-10-06 (fix/pwa-install-ios-tap): one-tap install is impossible
     on iOS — the Share -> Add to Home Screen guidance IS the feature. The old
     3-second toast was too easy to miss for 3-step instructions, so the tap
     now opens a persistent modal card: unmissable, self-contained (no PF
     dependency), dismissible via GOT IT or by tapping the backdrop. */
  function showIOSGuide() {
    try {
      if (document.getElementById('pf-pwa-ios-guide')) { return; }
      var wrap = document.createElement('div');
      wrap.id = 'pf-pwa-ios-guide';
      wrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;'
        + 'background:rgba(0,0,0,.74);display:flex;align-items:center;justify-content:center;'
        + 'padding:22px;box-sizing:border-box;'
        + 'animation:pfPwaFade .25s ease-out;';
      try {
        var st = document.getElementById('pf-pwa-anim');
        if (!st) {
          st = document.createElement('style');
          st.id = 'pf-pwa-anim';
          st.textContent = '@keyframes pfPwaFade{from{opacity:0}to{opacity:1}}';
          document.head.appendChild(st);
        } else if (st.textContent.indexOf('pfPwaFade') === -1) {
          st.textContent += '@keyframes pfPwaFade{from{opacity:0}to{opacity:1}}';
        }
      } catch (e8) {}
      var card = document.createElement('div');
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', 'Install the app');
      card.style.cssText = 'background:#0b0b0c;border:3px solid #c1121f;color:#f5ead6;'
        + 'font:14px/1.65 monospace;max-width:340px;width:100%;padding:22px;box-sizing:border-box;'
        + 'text-align:center;box-shadow:0 8px 44px rgba(0,0,0,.85);';
      card.innerHTML =
        '<div style="color:#c1121f;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">INSTALL THE APP</div>'
        + '<div style="text-align:left;margin-bottom:16px;">'
        + '<div style="margin-bottom:10px;"><span style="color:#c1121f;font-weight:bold;">1.</span>'
        + ' Tap the <b>Share</b> button in Safari\u2019s toolbar (the square with the arrow pointing up).</div>'
        + '<div style="margin-bottom:10px;"><span style="color:#c1121f;font-weight:bold;">2.</span>'
        + ' Scroll the share sheet down and tap <b>Add to Home Screen</b>.</div>'
        + '<div style="margin-bottom:2px;"><span style="color:#c1121f;font-weight:bold;">3.</span>'
        + ' Tap <b>Add</b> \u2014 the factory lands on your home screen.</div>'
        + '</div>'
        + '<button id="pf-pwa-ios-gotit" style="background:#c1121f;border:none;color:#fff;'
        + 'font:bold 14px monospace;letter-spacing:1px;padding:12px 30px;cursor:pointer;">GOT IT</button>';
      wrap.appendChild(card);
      function close() {
        try { if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); } } catch (e2) {}
      }
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap || (e.target && e.target.id === 'pf-pwa-ios-gotit')) { close(); }
      });
      (document.body || document.documentElement).appendChild(wrap);
    } catch (e) {}
  }

  // iOS has no beforeinstallprompt: show the manual A2HS hint once per session.
  // 2026-10-06 (one-prompt): NO LONGER t+4s on cold load — that stacked with
  // the first-run popups. Now: 2nd visit, or after first engagement
  // (callsign claim / vote / order check-in / XP gain).
  var iosShown = false;
  function iosTryShow() {
    if (iosShown || !isiOS) { return; }
    if (pwaSnoozed()) { return; }
    if (!pwaGateOpen()) { return; }
    iosShown = true;
    setTimeout(function () {
      showButton('INSTALL APP', function () {
        dismiss(false);
        /* FIX 2026-10-07 (fix/pwa-glitch): the old code removed the button
           for this page only, so it nagged again on every page load after
           the user had already seen the guide. Suppress for the session
           once the guide has been shown. */
        try { sessionStorage.setItem('pf_pwa_dismissed', '1'); } catch (e) {}
        showIOSGuide();
      });
    }, 4000);
  }
  window.addEventListener('load', function () { iosTryShow(); maybeShowAndroid(); });

  /* ---------- R32 (2026-10-04): appinstalled -> one-time grant + battle-alert handoff.
     On install, POST ?action=pwa_grant (W6B-1, idempotent) so the install is
     recorded server-side, then hand off to ENABLE BATTLE ALERTS (bell opt-in).
     One-time only per device. Zero XP — pure routing. */
  var GRANT_KEY = 'pf_pwa_grant_v1';
  function pwaGranted(){ try{ return localStorage.getItem(GRANT_KEY)==="1"; }catch(e){ return true; } }
  function pwaMarkGranted(){ try{ localStorage.setItem(GRANT_KEY,"1"); }catch(e){} }
  function pwaIdent(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function pwaPost(body,cb){
    function done(j){ try{ cb(j); }catch(e){} }
    try{
      var url=window.PF_BACKEND_URL;
      if(!url){ done(null); return; }
      if(window.PF&&PF.authPost){ PF.authPost(url,body,function(j){ done(j||null); }); return; }
      fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(function(j){ done(j||null); }).catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function showBattleAlertsCard(){
    try{
      if(document.getElementById("pf-pwa-alerts")) return;
      var card=document.createElement("div");
      card.id="pf-pwa-alerts";
      card.style.cssText="position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:99999;"
        +"background:#0b0b0c;border:3px solid #c1121f;color:#f5ead6;font:bold 14px monospace;"
        +"padding:18px 22px;max-width:340px;text-align:center;box-sizing:border-box;";
      card.innerHTML='<div style="color:#c1121f;letter-spacing:2px;margin-bottom:8px;">APP INSTALLED</div>'
        +'<div style="margin-bottom:12px;line-height:1.5;">The factory lives on your home screen now.<br>Want a ping when battles go live?</div>'
        +'<button id="pf-pwa-alerts-go" style="background:#c1121f;border:none;color:#fff;font:bold 13px monospace;letter-spacing:1px;padding:10px 18px;cursor:pointer;">ENABLE BATTLE ALERTS</button> '
        +'<button id="pf-pwa-alerts-no" style="background:none;border:1px solid #555;color:#888;font:12px monospace;padding:10px 14px;cursor:pointer;">LATER</button>';
      document.body.appendChild(card);
      function close(){ try{ if(card.parentNode) card.parentNode.removeChild(card); }catch(e){} }
      var no=document.getElementById("pf-pwa-alerts-no");
      if(no) no.onclick=close;
      var go=document.getElementById("pf-pwa-alerts-go");
      if(go) go.onclick=function(){
        go.disabled=true;
        var id=pwaIdent();
        /* Same contract as the bell's alert preferences (games/notify.js). */
        pwaPost({type:"notify",n_action:"notification_prefs",callsign:id.callsign,device:id.device,battles:1},function(j){
          close();
          toast((j&&j.ok)?"BATTLE ALERTS ON.":"Couldn't save — open the bell and set alerts there.");
        });
      };
    }catch(e){}
  }
  window.addEventListener("appinstalled", function(){
    if(pwaGranted()) return;
    pwaMarkGranted();
    var id=pwaIdent();
    /* pwa_grant is backend-owned and idempotent; the handoff runs regardless
       of the grant result so a backend hiccup never eats the opt-in moment. */
    pwaPost({action:"pwa_grant",callsign:id.callsign,device:id.device},function(){
      showBattleAlertsCard();
    });
    /* Backstop: if the POST hangs, still show the card (guarded: once). */
    setTimeout(showBattleAlertsCard, 8000);
  });
})();
