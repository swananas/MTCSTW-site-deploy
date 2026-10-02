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
  // Served from jsDelivr this registration WILL fail with a SecurityError;
  // we catch it and run in manifest-only mode (iOS A2HS + install signals).
  // Full offline support needs sw.js at https://www.mtcstw.com/sw.js —
  // see pwa/README.md for the hosting options.
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register(BASE + 'sw.js').then(
        function () { if (window.console) console.log('[PF PWA] SW registered'); },
        function (err) { if (window.console) console.log('[PF PWA] SW unavailable (needs same-origin hosting):', err && err.message); }
      );
    } catch (e) {
      if (window.console) console.log('[PF PWA] SW registration blocked:', e && e.message);
    }
  }

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
})();
