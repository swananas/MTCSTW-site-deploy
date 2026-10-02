/* core/00-bus.js  |  PF v1.4.2 | THE CONNECTOR LAYER. Loads first. Owns window.PF: the event bus every
   KILL: ?pf_off=game-id,other  or  localStorage pf_disabled_v1='["game-id"]' */
(function () {
  'use strict';
  if (window.PF && window.PF.v) return; /* never double-init */
  var disabled = [];
  try { disabled = JSON.parse(localStorage.getItem('pf_disabled_v1') || '[]'); } catch (e) {}
  try {
    var m = location.search.match(/[?&]pf_off=([^&]+)/);
    if (m) disabled = disabled.concat(decodeURIComponent(m[1]).split(','));
  } catch (e) {}
  function tag(silo, msg) { return '[PF:' + silo + '] ' + msg; }
  window.PF = {
    v: '1.4.2',
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
    /* Event naming: legacy flat names ('pf-share-image') keep working.
       New cross-silo events use namespaced form 'pf:domain:action'
       (pf:battle:won, pf:loot:opened, pf:streak:milestone, pf:recruit:activated).
       Rules: producers fire-and-forget, consumers fail silently (see on/emit
       above), no consumer touches financial settlement or auth. */
    holder: function () {
      var h = document.getElementById('pf-silo-holder');
      if (!h) {
        h = document.createElement('div');
        h.id = 'pf-silo-holder'; h.style.display = 'none';
        (document.body || document.documentElement).appendChild(h);
      }
      return h;
    },
    toast: function (msg) {
      /* canonical global toast — bottom-center, ~3s, propaganda poster
         aesthetic (black bg, red border, cream text). Core loads before
         every silo, so all games can call PF.toast directly. */
      try {
        var t = document.createElement('div'); t.textContent = msg;
        t.style.cssText = 'position:fixed;left:50%;bottom:8%;transform:translateX(-50%);background:#0a0a0a;color:#f5f0e1;font:bold 15px monospace;padding:12px 22px;border:2px solid #c1121f;z-index:99999;max-width:90vw;text-align:center;box-sizing:border-box';
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000);
      } catch (e) {}
    },
    report: function (action) {
      /* canonical backend report; core/03-global.js owns the transport */
      try { if (typeof window.pfReportAction === 'function') window.pfReportAction(action); } catch (e) {}
    },
    /* Shared date helpers (single copies; games must not redefine these).
       chiNow: now in America/Chicago. mondayOf: Monday 00:00 of d's week.
       isoWeekKey: 'YYYY-Www' ISO week key for weekly localStorage buckets. */
    chiNow: function () { try { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })); } catch (e) { return new Date(); } },
    mondayOf: function (d) { var x = new Date(d); var day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x; },
    isoWeekKey: function (d) { var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); var day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3); var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4)); var fday = (first.getUTCDay() + 6) % 7; first.setUTCDate(first.getUTCDate() - fday + 3); var w = 1 + Math.round((t - first) / (7 * 864e5)); return t.getUTCFullYear() + '-W' + String(w).padStart(2, '0'); },
    /* Daily XP economy: every comrade caps at 50 XP per day (America/Chicago)
       from daily tasks. Weekly tasks, one-time bonuses, recruit bounties, and
       the weekly FULL DEPLOYMENT medal are exempt — they're bounded by
       week/event already. All daily XP awards MUST route through claimDayXp
       so the cap holds no matter what order tasks are completed in. */
    DAILY_XP_CAP: 50,
    _xpDayKey: 'pf_xpday_v1',
    _xpDayStr: function () { try { var n = this.chiNow(); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); } catch (e) { return ''; } },
    dayXpEarned: function () {
      try {
        var s = JSON.parse(localStorage.getItem(this._xpDayKey) || 'null');
        if (s && s.d === this._xpDayStr()) return s.xp || 0;
      } catch (e) {}
      return 0;
    },
    claimDayXp: function (want) {
      /* Returns the XP actually allowed (0..want) and records it. */
      want = Math.max(0, Math.floor(Number(want) || 0));
      var t = this._xpDayStr(), s = null;
      try { s = JSON.parse(localStorage.getItem(this._xpDayKey) || 'null'); } catch (e) {}
      if (!s || s.d !== t) s = { d: t, xp: 0 };
      var room = Math.max(0, this.DAILY_XP_CAP - (s.xp || 0));
      var allow = Math.min(want, room);
      s.xp = (s.xp || 0) + allow;
      try { localStorage.setItem(this._xpDayKey, JSON.stringify(s)); } catch (e) {}
      return allow;
    },
    seedDayXp: function (force) {
      /* Cross-device 50/day: when the user has a callsign, ask the backend how
         much pool XP that callsign already earned today (America/Chicago) and
         raise the local bucket to match — so phone + laptop share one pool.
         Once per day; silent on failure. The backend counts only pool-routed
         action types, so exempt bonuses never shrink anyone's room. */
      try {
        var id = null;
        try { id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}'); } catch (e) {}
        var cs = id && id.callsign ? String(id.callsign) : '';
        if (!cs || !window.PF_BACKEND_URL) return;
        var t = this._xpDayStr(), flag = 'pf_xpseed_v1';
        try { if (localStorage.getItem(flag) === t) return; } catch (e) {}
        if (!force) {
          try { if (window.sessionStorage && sessionStorage.getItem(flag) === t) return; } catch (e) {}
          try { if (window.sessionStorage) sessionStorage.setItem(flag, t); } catch (e) {}
        }
        var self = this;
        var fn = 'pfSeedCb' + Math.floor(Math.random() * 1e9);
        window[fn] = function (j) {
          try { delete window[fn]; } catch (e) {}
          try {
            if (j && j.ok && typeof j.xp_today === 'number' && j.xp_today > 0) {
              var s = null;
              try { s = JSON.parse(localStorage.getItem(self._xpDayKey) || 'null'); } catch (e) {}
              if (!s || s.d !== t) s = { d: t, xp: 0 };
              if (j.xp_today > (s.xp || 0)) {
                s.xp = Math.min(self.DAILY_XP_CAP, Math.floor(j.xp_today));
                try { localStorage.setItem(self._xpDayKey, JSON.stringify(s)); } catch (e) {}
              }
            }
            try { localStorage.setItem(flag, t); } catch (e) {}
          } catch (e) {}
        };
        var sc = document.createElement('script');
        sc.onerror = function () { try { delete window[fn]; } catch (e) {} };
        sc.src = window.PF_BACKEND_URL + '?action=xp_today&callsign=' + encodeURIComponent(cs) + '&callback=' + fn;
        document.head.appendChild(sc);
      } catch (e) {}
    },
    /* JSONP batching: fire multiple backend GETs in parallel, resolve as one.
       PF.batchGet([{action:'briefing',params:{callsign:cs}},{action:'flash_active'}])
         .then(function(results){ // results[i] = {action, ok, data} }) */
    batchGet: function (calls) {
      var self = this;
      if (!self.jsonp) return Promise.resolve((calls || []).map(function () { return { ok: false, data: null }; }));
      var ps = (calls || []).map(function (c) {
        return self.jsonp(c.action, c.params || {}).then(function (data) {
          return { action: c.action, ok: !!(data && data.ok !== false), data: data };
        });
      });
      return Promise.all(ps);
    },
    /* Single JSONP GET returning a Promise. Shared transport for batchGet. */
    jsonp: function (action, params) {
      var self = this;
      return new Promise(function (resolve) {
        try {
          var base = window.PF_BACKEND_URL;
          if (!base) { resolve(null); return; }
          var fn = 'pfBatchCb' + Math.floor(Math.random() * 1e9);
          var s = document.createElement('script'), done = false;
          function finish(j) {
            if (done) return; done = true;
            try { delete window[fn]; } catch (e) {}
            if (s.parentNode) s.parentNode.removeChild(s);
            resolve(j || null);
          }
          window[fn] = function (j) { finish(j); };
          s.onerror = function () { finish(null); };
          var q = '?action=' + encodeURIComponent(action);
          var p = params || {};
          for (var k in p) {
            if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
          }
          q += '&callback=' + fn;
          s.src = base + q;
          document.head.appendChild(s);
          setTimeout(function () { finish(null); }, 12000);
        } catch (e) { resolve(null); }
      });
    }
  };
})();
