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

  /* ---------- derive our own CDN base (pin-agnostic) ---------- */
  function pwaBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i].src || '';
      var idx = s.indexOf('/v1.4.3/');
      if (idx > -1 && s.indexOf('MTCSTW-site-deploy') > -1) {
        return s.slice(0, idx + 8) + 'pwa/';
      }
    }
    return null;
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
  addLink('manifest', BASE + 'manifest.json', { crossorigin: 'use-credentials' });
  addLink('apple-touch-icon', BASE + 'apple-touch-icon.png');
  addMeta('theme-color', '#c81e1e');
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
    btn = document.createElement('button');
    btn.id = 'pf-pwa-install';
    btn.innerHTML = '<span style="font-size:16px;margin-right:8px">\u25BC</span>' + label
      + '<span id="pf-pwa-x" style="margin-left:12px;opacity:.7;cursor:pointer">\u2715</span>';
    btn.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;'
      + 'background:#c1121f;color:#fff;border:2px solid #0a0a0a;border-radius:10px;'
      + 'font:bold 14px monospace;letter-spacing:1px;padding:12px 16px;cursor:pointer;'
      + 'box-shadow:0 4px 18px rgba(193,18,31,.55)';
    btn.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'pf-pwa-x') { dismiss(true); return; }
      onTap();
    });
    document.body.appendChild(btn);
  }

  var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showButton('INSTALL APP', function () {
      if (!deferredPrompt) { return; }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          toast('Welcome to the factory.');
          dismiss(true);
        } else {
          dismiss(false);
        }
        deferredPrompt = null;
      });
    });
  });

  // iOS has no beforeinstallprompt: show the manual A2HS hint once per session.
  if (isiOS && !('serviceWorker' in navigator && false)) {
    window.addEventListener('load', function () {
      setTimeout(function () {
        showButton('INSTALL APP', function () {
          dismiss(false);
          toast('Tap Share \u2192 Add to Home Screen.');
        });
      }, 4000);
    });
  }

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
