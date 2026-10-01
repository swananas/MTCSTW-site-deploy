/* core/00-bus.js  |  PF v1.4.1 | THE CONNECTOR LAYER. Loads first. Owns window.PF: the event bus every
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
    v: '1.4.1',
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
    }
  };
})();
