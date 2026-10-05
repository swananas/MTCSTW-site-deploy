/* core/share-image-phq-lazy.js  |  PF v1.4.3 | PHQ SHARE-POSTER LAZY LOADER.
   ~1.5KB stub bundled in pages/bundle-pages INSTEAD of the full
   core/share-image-phq.js (~87KB, 23 painters). Creates the PF.PHQShare
   facade (additive registry per the design-system spec §3) and injects the
   full painter module on the FIRST share/save/paint/pledgeData call — the
   ~99% of visitors who never share never pay for the painters.
   Queued share/save calls replay once the module registers; paint() before
   load returns null (honest: nothing painted yet); pledgeData() before load
   returns null (same fail-soft the silos already handle).
   The full module never reassigns this facade: it calls
   PF.PHQShare.registerPainters(), which merges, honors per-painter
   ?pf_off=phq-<painter> kills, sets F._route, and flushes the queue.
   KILL: ?pf_off=phq-share kills stub + module (first executable line). */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('phq-share')) { return; }
  if (window.pfPhqShareLazy || window.pfPhqShareDone) return;
  window.pfPhqShareLazy = true;

  var LOADING = false;

  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  /* Derive the versioned CDN base from an already-loaded bundle script,
     e.g. https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@<pin>/v1.4.3/pages/bundle-pages.js
     -> https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@<pin>/v1.4.3/ */
  function baseUrl() {
    try {
      var ss = document.getElementsByTagName('script');
      for (var i = ss.length - 1; i >= 0; i--) {
        var m = String(ss[i].src || '').match(/^(.*\/v\d+\.\d+\.\d+\/)/);
        if (m) return m[1];
      }
    } catch (e) {}
    return null;
  }
  function loadModule() {
    if (LOADING) return;
    var b = baseUrl();
    if (!b) { toast('Poster failed \u2014 try again.'); return; }
    LOADING = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = b + 'core/share-image-phq.js';
    s.onload = function () { LOADING = false; };
    s.onerror = function () { LOADING = false; toast('Poster failed \u2014 try again.'); };
    try { document.head.appendChild(s); } catch (e) { LOADING = false; }
  }
  function flushQueue(F) {
    var r = null;
    try { r = F._route; } catch (e) {}
    if (!r) return;
    var q = [];
    try { q = F._queue.splice(0, F._queue.length); } catch (e2) {}
    for (var i = 0; i < q.length; i++) {
      try { r[q[i].kind](q[i].id, q[i].data, q[i].opts); } catch (e3) {}
    }
  }
  function mkFacade() {
    var F = {
      ids: [],
      _paint: {},
      _titles: {},
      _route: null,
      _queue: [],
      _flushed: false,
      _ensure: loadModule,
      registerPainters: function (painters, titles) {
        for (var id in painters) {
          if (!painters.hasOwnProperty(id)) continue;
          var skip = false;
          try { skip = PF && PF.skip(id); } catch (e) {}
          if (skip) continue;                          /* per-painter kill */
          F._paint[id] = painters[id];
          if (titles && titles[id] && F._titles[id] == null) F._titles[id] = titles[id];
          if (F.ids.indexOf(id) === -1) F.ids.push(id);
        }
        if (!F._flushed) { F._flushed = true; flushQueue(F); }
        return F;
      },
      share: function (id, data, opts) {
        var r = null;
        try { r = F._route; } catch (e) {}
        if (r) return r.share(id, data, opts);
        F._queue.push({ kind: 'share', id: id, data: data, opts: opts });
        loadModule();
        return true;
      },
      save: function (id, data, opts) {
        var r = null;
        try { r = F._route; } catch (e) {}
        if (r) return r.save(id, data, opts);
        F._queue.push({ kind: 'save', id: id, data: data, opts: opts });
        loadModule();
        return true;
      },
      paint: function (id, data) {
        var r = null;
        try { r = F._route; } catch (e) {}
        if (r) return r.paint(id, data);
        loadModule();
        return null;
      },
      pledgeData: function (row) {
        var r = null;
        try { r = F._route; } catch (e) {}
        if (r && r.pledgeData) return r.pledgeData(row);
        loadModule();
        return null;
      }
    };
    return F;
  }
  try {
    if (!PF.PHQShare || typeof PF.PHQShare.registerPainters !== 'function') {
      /* The single facade-creation site in the bundle path. The full module
         (standalone mode) has its own guarded creation; exactly one wins. */
      PF.PHQShare = mkFacade();
    }
  } catch (e) {}
})();
