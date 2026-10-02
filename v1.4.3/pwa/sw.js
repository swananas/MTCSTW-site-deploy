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
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
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
