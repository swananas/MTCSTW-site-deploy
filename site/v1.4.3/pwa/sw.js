/* MTCSTW PWA service worker | PF v1.4.3
   Strategy:
   - API calls (pf-api.mtcstw.workers.dev): network-first, cache fallback
   - Static assets (jsdelivr CDN, images): cache-first, then network
   - Navigations: network-first, offline fallback page
   IMPORTANT: browsers require the service worker to be SAME-ORIGIN as the
   site. This file must be served from https://www.mtcstw.com/sw.js to take
   effect. See pwa/README.md for the hosting options. */

var CACHE = 'mtcstw-pwa-v1';
var API_HOST = 'pf-api.mtcstw.workers.dev';
var CDN_HOST = 'cdn.jsdelivr.net';

var OFFLINE_HTML = '<!DOCTYPE html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>MTCSTW — Offline</title>'
  + '<style>body{background:#0a0a0a;color:#eee;font-family:monospace,monospace;'
  + 'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'
  + 'text-align:center}h1{color:#c81e1e;letter-spacing:2px}p{color:#999}</style>'
  + '</head><body><div><h1>MTCSTW</h1>'
  + '<p>YOU ARE OFFLINE.</p>'
  + '<p>The factory reopens when you reconnect.</p></div></body></html>';

self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* PUSH (2026-10-05, fe/pwa): notification display + tap routing.
   Payload is title/body/url only — no PII, no XP amounts, no personal
   data. Icon/badge paths are relative to the SW script location: in
   Phase B (sw.js served from the site origin) the icons must be
   co-located at the origin root, or these fall back to no-icon
   (harmless — the notification still shows). */
self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = {}; }
  var title = data.title || 'MTCSTW';
  var body = data.body || 'Something new from the factory.';
  var url = data.url || '/';
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: url }
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  /* L-1 (2026-10-08): validate the push-payload URL before opening — a
     compromised push sender must not be able to navigate users off-site.
     Only same-origin (or mtcstw.com) targets are honored; anything else
     falls back to the app root. */
  try {
    var _t = new URL(url, self.registration.scope);
    var _ok = _t.origin === location.origin ||
      /(^|\.)mtcstw\.com$/.test(_t.hostname);
    if (!_ok) url = '/';
  } catch (err3) { url = '/'; }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      var i, c, cUrl, tUrl;
      try { tUrl = new URL(url, self.registration.scope); } catch (err) { tUrl = null; }
      for (i = 0; i < clients.length; i++) {
        c = clients[i];
        try {
          cUrl = new URL(c.url);
          if (tUrl && cUrl.pathname === tUrl.pathname && 'focus' in c) {
            return c.focus();
          }
        } catch (err2) {}
      }
      if (self.clients.openWindow) { return self.clients.openWindow(url); }
    })
  );
});

function isApi(url) { return url.host === API_HOST; }
function isStatic(url) {
  return url.host === CDN_HOST || /\.(png|jpe?g|gif|webp|svg|css|js|woff2?)(\?|$)/i.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // API: network-first, cache fallback
  if (isApi(url)) {
    /* FIX 2026-10-07 (fix/pwa-glitch): JSONP requests carry a random
       callback= name per call — caching them bloats Cache Storage with
       entries that can never be reused. Skip those, and only cache
       successful responses. */
    var cacheable = !/[?&]callback=/.test(url.search);
    e.respondWith(
      fetch(req).then(function (res) {
        if (cacheable && res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || Response.error();
        });
      })
    );
    return;
  }

  // Static assets: cache-first, then network
  if (isStatic(url)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigations: network-first, offline fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
  }
});
