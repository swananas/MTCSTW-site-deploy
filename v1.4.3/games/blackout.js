/* games/blackout.js  |  PF v1.4.3 | W5-11 BLACKOUT OP (Wave 5D) — frontend.
   While a blackout op is live the backend redacts the ticker (feed_list
   renders callsigns as blocks, text as [REDACTED]); this silo owns the
   three frontend faces of the op:
     1. SIREN COUNTDOWN — when a blackout op is scheduled/upcoming, a fixed
        banner counts down to starts_at (client-side tick, 30s state TTL).
     2. REVEAL MONTAGE — when a blackout op ended within the last 24h, the
        homepage PROOF area shows a "DEBRIEF" montage: the unredacted ticker
        events from the blackout window (the flag has cleared, so feed_list
        serves full text again). Event TYPE was preserved through the
        redaction, so the montage reads as the op's after-action reel.
     3. (Shadow NEXT OP mode lives in core/20-nextop.js.)
   The montage trigger is transition-based, not `recent`-based: while a
   blackout is live/upcoming we persist {id,name,starts_at,ends_at} to
   localStorage; when the op disappears from operation_status and its
   ends_at is within the last 24h, the debrief mounts. No backend `recent`
   shape required — robust to the conductor's pending schema work.
   SELF-MOUNTING + READ-ONLY (ZERO XP — pure narrative). Fail-silent
   everywhere: a dead read or render throw never breaks the page.
   KILL: ?pf_off=blackout  or  localStorage pf_disabled_v1='["blackout"]' */
(function () {
  'use strict';
  try { init(); } catch (e) {}

  function init() {
    var PF = window.PF;
    if (!PF || PF.skip('blackout')) return;
    var href = ''; try { href = window.location.href || ''; } catch (e) {}
    if (/\/config\//.test(href)) return;
    try {
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
    } catch (e) {}

    var BACKEND = window.PF_BACKEND_URL;
    var KILL = 'blackout';
    var POLL_MS = 30000;
    var SEEN_KEY = 'pf_blackout_last_v1';
    var _opCache = { t: 0, v: null };
    var bannerOn = false, montageOn = false, tickIv = null;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function $(id) { return document.getElementById(id); }

    /* JSONP GET helper. Mirrors games/flash-siren.js. */
    function api(action, params, cb) {
      try {
        if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
      } catch (e) {}
      if (!BACKEND) { cb(null); return; }
      var fn = 'pfBoCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function finish(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e2) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        try { cb(j); } catch (e3) {}
      }
      window[fn] = function (j) { finish(j); };
      s.onerror = function () { finish(null); };
      var q = '?action=' + encodeURIComponent(action);
      try {
        for (var k in params) q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      } catch (e4) {}
      q += '&callback=' + fn;
      s.src = BACKEND + q;
      s.async = true;
      try { document.head.appendChild(s); } catch (e5) { finish(null); return; }
      setTimeout(function () { finish(null); }, 12000);
    }

    /* Defensive flags read (conductor contract: flags JSON text or object,
       preset 'blackout'). Works before AND after the schema lands. */
    function opFlags(op) {
      try {
        var fl = op && op.flags;
        if (typeof fl === 'string') { try { fl = JSON.parse(fl); } catch (e) { fl = {}; } }
        return (fl && typeof fl === 'object') ? fl : {};
      } catch (e) { return {}; }
    }
    function isBlackoutOp(op) {
      try {
        if (!op || typeof op !== 'object') return false;
        var fl = opFlags(op);
        if (fl.blackout === true) return true;
        if (String(op.preset || '') === 'blackout') return true;
        /* Name fallback (never guessed — only the canonical op name). */
        if (/blackout/i.test(String(op.name || ''))) return true;
        return false;
      } catch (e) { return false; }
    }

    /* operation_status read: PFOperation shared cache first (flash-siren
       contract), else a defensive cached reader. */
    function readOpStatus(cb) {
      try {
        var PO = window.PFOperation;
        if (PO) {
          var v = null;
          if (typeof PO.status === 'function') v = PO.status();
          else if (typeof PO.getStatus === 'function') v = PO.getStatus();
          else if (PO.latest) v = PO.latest;
          if (v) { cb(v); return; }
        }
      } catch (e) {}
      var now = Date.now();
      if (_opCache.v && (now - _opCache.t) < POLL_MS) { cb(_opCache.v); return; }
      api('operation_status', {}, function (j) {
        var out = { live: false, upcoming: false, scheduled: false };
        try { if (j && typeof j === 'object') out = j; } catch (e2) {}
        _opCache.t = Date.now(); _opCache.v = out;
        cb(out);
      });
    }

    function loadSeen() {
      try {
        var raw = null;
        try { raw = window.localStorage.getItem(SEEN_KEY); } catch (e) {}
        if (!raw) return null;
        var o = JSON.parse(raw);
        if (!o || !o.id || !(o.ends_at > 0)) return null;
        return o;
      } catch (e) { return null; }
    }
    function saveSeen(op) {
      try {
        window.localStorage.setItem(SEEN_KEY, JSON.stringify({
          id: String(op.id || ''), name: String(op.name || 'BLACKOUT'),
          starts_at: Number(op.starts_at) || 0, ends_at: Number(op.ends_at) || 0,
          t: Date.now()
        }));
      } catch (e) {}
    }

    function fmtLeft(ms) {
      if (!(ms > 0)) return '00:00:00';
      var s = Math.floor(ms / 1000);
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      function p(n) { return (n < 10 ? '0' : '') + n; }
      return p(h) + ':' + p(m) + ':' + p(ss);
    }

    /* ---- 1. siren countdown banner (scheduled/upcoming blackout) ---- */
    function showBanner(startsAt) {
      if (bannerOn) return;
      var bar = document.createElement('div');
      bar.id = 'pf-blackout-bar';
      bar.innerHTML =
        '<style>' +
        '#pf-blackout-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;' +
        'background:#0a0a0a;border-bottom:3px solid #c1121f;color:#f5ead6;' +
        'font-family:Arial,sans-serif;text-align:center;padding:10px 12px;' +
        'font-size:14px;letter-spacing:1px;box-sizing:border-box}' +
        '#pf-blackout-bar .bo-k{color:#e5383b;font-weight:800;letter-spacing:3px;' +
        'font-size:11px;display:block;margin-bottom:2px}' +
        '#pf-blackout-bar .bo-t{font-family:\'Arial Black\',Arial,sans-serif;' +
        'font-size:16px;letter-spacing:2px}' +
        '#pf-blackout-bar .bo-c{color:#e5383b;font-weight:800}' +
        '</style>' +
        '<span class="bo-k">\uD83D\uDEA8 INCOMING TRANSMISSION</span>' +
        '<span class="bo-t">BLACKOUT OP</span> — the wire goes dark in ' +
        '<span class="bo-c" id="pf-bo-count">--:--:--</span>';
      try { document.body.appendChild(bar); } catch (e) { return; }
      bannerOn = true;
      function tick() {
        var el = $('pf-bo-count');
        var left = Number(startsAt) - Date.now();
        if (left <= 0) { hideBanner(); refresh(); return; }
        if (el) el.textContent = fmtLeft(left);
      }
      tick();
      tickIv = setInterval(tick, 1000);
    }
    function hideBanner() {
      try {
        var bar = $('pf-blackout-bar');
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      } catch (e) {}
      if (tickIv) { clearInterval(tickIv); tickIv = null; }
      bannerOn = false;
    }

    /* ---- 2. reveal montage (blackout ended within 24h) ---- */
    function ago(ts) {
      var d = Date.now() - Number(ts);
      if (!(d >= 0)) return 'now';
      if (d < 60000) return 'now';
      if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
      if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
      return Math.floor(d / 86400000) + 'd ago';
    }
    function copyFor(ev) {
      var cs = ev.callsign ? esc(ev.callsign) : '';
      var name = esc(ev.name), theme = esc(ev.theme);
      switch (ev.type) {
        case 'operation_launch':
          return '\uD83D\uDEA8 OPERATION ' + name + ' LAUNCHED';
        case 'operation_end':
          return '\uD83C\uDFC1 OPERATION ' + name + ' ENDED';
        case 'full_deployment':
          return '\u2694\uFE0F ' + cs + ' completed FULL DEPLOYMENT';
        case 'war_bond': {
          var tier = ev.meta && ev.meta.tier ? Number(ev.meta.tier) : 0;
          return '\uD83D\uDCB0 ' + (cs || 'A comrade') + ' funded the fight' +
            (tier > 0 ? ' — $' + tier + ' War Bond' : '');
        }
        case 'nuke_blast':
          return '\uD83D\uDCA5 ' + (cs || 'The network') + ' nuked the meter';
        case 'cell_war_declare':
          return '\u2694\uFE0F Cell ' + name + ' declared war on ' + theme;
        case 'rally_claim':
          return '\uD83D\uDD25 ' + (cs || 'A cell') + ' rallied the cell';
        case 'ambush_grab':
          return '\uD83D\uDCE6 ' + (cs || 'Someone') + ' grabbed the ambush drop';
        default: {
          var label = esc(String(ev.type || '').replace(/_/g, ' '));
          return '\u2022 ' + (cs ? cs + ' — ' : '') + label;
        }
      }
    }
    function mountMontage(seen, events) {
      if (montageOn) return;
      /* Homepage PROOF area only. Anchor on the PROOF section header;
         fall back to the end of the homepage mount. */
      var parent = null, ref = null;
      try {
        var h = $('pf-v2');
        if (!h) return;
        parent = h;
        var ph = h.querySelector('.pf-section-head[data-sec="proof"]');
        if (ph) ref = ph.nextSibling;
      } catch (e) { return; }
      if (!parent) return;
      var evs = (events || []).filter(function (ev) {
        var ts = Number(ev.ts) || 0;
        return ts >= (seen.starts_at || 0) && ts <= (seen.ends_at || 0);
      }).slice(0, 24);
      if (!evs.length) return;
      var h2 = '';
      for (var i = 0; i < evs.length; i++) {
        h2 += '<div class="bo-item"><span class="bo-copy">' + copyFor(evs[i]) +
          '</span><span class="bo-ago">' + ago(evs[i].ts) + '</span></div>';
      }
      var el = document.createElement('div');
      el.id = 'pf-blackout-debrief';
      el.innerHTML =
        '<style>' +
        '#pf-blackout-debrief{background:#0a0a0a;border:3px solid #c1121f;' +
        'padding:22px 20px;max-width:680px;margin:18px auto;color:#f5ead6;' +
        'font-family:Arial,sans-serif;box-sizing:border-box}' +
        '#pf-blackout-debrief .bo-k{font-size:12px;letter-spacing:4px;' +
        'color:#e5383b;font-weight:800}' +
        '#pf-blackout-debrief .bo-title{font-family:\'Arial Black\',Arial,sans-serif;' +
        'font-size:22px;letter-spacing:2px;text-transform:uppercase;margin:4px 0 6px}' +
        '#pf-blackout-debrief .bo-sub{font-size:13px;color:#a89e88;margin-bottom:14px}' +
        '#pf-blackout-debrief .bo-item{display:flex;align-items:baseline;gap:10px;' +
        'padding:9px 10px;border-top:1px solid #2a2a2a;font-size:14px}' +
        '#pf-blackout-debrief .bo-copy{flex:1;line-height:1.4}' +
        '#pf-blackout-debrief .bo-ago{font-size:11px;color:#a89e88;white-space:nowrap}' +
        '@media(max-width:520px){#pf-blackout-debrief{padding:16px 12px}' +
        '#pf-blackout-debrief .bo-title{font-size:18px}}' +
        '</style>' +
        '<div class="bo-k">AFTER-ACTION</div>' +
        '<div class="bo-title">Debrief: ' + esc(seen.name || 'Blackout') + '</div>' +
        '<div class="bo-sub">The wire was dark. Here is what moved while nobody could see it.</div>' +
        h2;
      try {
        if (ref) parent.insertBefore(el, ref);
        else parent.appendChild(el);
        montageOn = true;
        /* share-out gaps #2: the debrief is a game-over moment — share it. */
        try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(el,'arcade-blackout',{link:'/'}); }catch(e){}
      } catch (e) {}
    }
    function maybeMontage() {
      if (montageOn) return;
      var seen = loadSeen();
      if (!seen) return;
      var now = Date.now();
      /* Only while the op ended within the last 24h. */
      if (!(seen.ends_at <= now && now - seen.ends_at < 86400000)) return;
      api('feed_list', { limit: 50 }, function (j) {
        try {
          if (j && j.ok && j.events) mountMontage(seen, j.events);
        } catch (e) {}
      });
    }

    /* ---- state evaluation ---- */
    function evaluate(op) {
      var now = Date.now();
      var bo = isBlackoutOp(op);
      var live = bo && op.live === true;
      var upcoming = bo && (op.upcoming === true || op.scheduled === true);
      if (live || upcoming) {
        saveSeen(op); /* keep the debrief record fresh while the op runs */
        if (upcoming && Number(op.starts_at) > now) showBanner(op.starts_at);
        else hideBanner();
      } else {
        hideBanner();
        maybeMontage();
      }
    }
    function refresh() {
      try {
        if (window.PF && PF.hidden && PF.hidden()) return;
        readOpStatus(function (op) { try { evaluate(op || {}); } catch (e) {} });
      } catch (e) {}
    }

    refresh();
    setInterval(refresh, POLL_MS);

    /* Cross-silo hook (W5-11): lets the mystery-bounty UI ask "is a blackout
       live right now?" without duplicating the flags contract. */
    try {
      window.PFBlackout = window.PFBlackout || {};
      window.PFBlackout.isLive = function (cb) {
        try { readOpStatus(function (op) { try { cb(!!(op && op.live && isBlackoutOp(op))); } catch (e) { cb(false); } }); }
        catch (e) { try { cb(false); } catch (e2) {} }
      };
    } catch (e) {}
  }
})();
