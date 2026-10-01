/* ============================================================================
   SILO: core/00-bus.js  |  PF v1.1.0
   WHAT: THE CONNECTOR LAYER. Loads first. Owns window.PF: the event bus every
         silo talks through, per-silo error attribution, kill-switches, and the
         post-mount queue that runs game companions after widgets are mounted.
   WHY: one place to see which silo failed, and one switch to isolate it fast.
   KILL: ?pf_off=game-id,other  or  localStorage pf_disabled_v1='["game-id"]'
   ============================================================================ */
(function () {
  'use strict';
  if (window.PF && window.PF.v) return; /* never double-init */
  var disabled = [];
  try { disabled = JSON.parse(localStorage.getItem('pf_disabled_v1') || '[]'); } catch (e) {}
  try {
    var m = location.search.match(/[?&]pf_off=([^&]+)/);
    if (m) disabled = disabled.concat(decodeURIComponent(m[1]).split(','));
  } catch (e) {}
  var mountQueue = [];
  function tag(silo, msg) { return '[PF:' + silo + '] ' + msg; }
  window.PF = {
    v: '1.1.0',
    disabled: disabled,
    skip: function (silo) { return disabled.indexOf(silo) !== -1; },
    log: function (silo, msg) { try { console.log(tag(silo, msg)); } catch (e) {} },
    error: function (silo, err) {
      var msg = err && err.message ? err.message : String(err);
      try { console.error(tag(silo, 'ERROR: ' + msg)); } catch (e) {}
    },
    on: function (evt, fn) {
      document.addEventListener(evt, function (e) {
        try { fn(e.detail, e); } catch (err) { window.PF.error('bus:on:' + evt, err); }
      });
    },
    emit: function (evt, detail) {
      try { document.dispatchEvent(new CustomEvent(evt, { detail: detail || {} })); }
      catch (e) { window.PF.error('bus:emit:' + evt, e); }
    },
    holder: function () {
      var h = document.getElementById('pf-silo-holder');
      if (!h) {
        h = document.createElement('div');
        h.id = 'pf-silo-holder'; h.style.display = 'none';
        (document.body || document.documentElement).appendChild(h);
      }
      return h;
    },
    afterMount: function (silo, fn) { mountQueue.push({ silo: silo, fn: fn }); },
    flushMount: function () {
      var q = mountQueue; mountQueue = [];
      q.forEach(function (item) {
        if (window.PF.skip(item.silo)) { window.PF.log(item.silo, 'skipped (disabled)'); return; }
        try { item.fn(); } catch (err) { window.PF.error(item.silo, err); }
      });
    },
    toast: function (msg) {
      /* canonical toast; core/04-ledger.js upgrades this when it loads */
      try {
        var t = document.createElement('div'); t.textContent = msg;
        t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
      } catch (e) {}
    },
    report: function (action) {
      /* canonical backend report; core/03-global.js owns the transport */
      try { if (typeof window.pfReportAction === 'function') window.pfReportAction(action); } catch (e) {}
    }
  };
  window.PF.log('bus', 'connector online; disabled=[' + disabled.join(',') + ']');
})();
