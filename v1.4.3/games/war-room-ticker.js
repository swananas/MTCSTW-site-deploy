/* games/war-room-ticker.js  |  PF v1.4.3 | S5 Live War-Room Ticker (Wave 3).
   Live activity feed — "X just nuked the meter", "Y completed FULL DEPLOYMENT",
   "OPERATION Z LAUNCHED — 2x XP ALL FRONTS". Proof the network is moving while
   you read it. Your callsign on the ticker is its own status hit.
   SELF-MOUNTING + READ-ONLY (ZERO XP — pure visibility economy).
   Mounts: homepage PROOF section (after the fan-vote widget) + /cells page
   (after the cell-war standings widget). If a mount point is missing, fails
   silent — the ticker never breaks page render. ~30s JSONP poll of feed_list.
   "LIVE" badge + events-in-last-hour count. Items deep-link via the event's
   ref.page (relative paths only, validated). Everything wrapped in try/catch.
   KILL: ?pf_off=warrticker  or  localStorage pf_disabled_v1='["warrticker"]' */
(function () {
  'use strict';
  try { init(); } catch (e) {}

  function init() {
    var PF = window.PF;
    if (!PF || PF.skip('warrticker')) return;
    var href = ''; try { href = window.location.href || ''; } catch (e) {}
    if (/\/config\//.test(href)) return;
    try {
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
    } catch (e) {}

    var BACKEND = window.PF_BACKEND_URL;
    var KILL = 'warrticker';
    var mounted = false, timer = null, cursor = '', lastHour = 0;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function $(id) { return document.getElementById(id); }
    function safePage(p) {
      p = String(p || '');
      return /^\/[a-zA-Z0-9_\-\/]*$/.test(p) && p.length <= 80 ? p : '';
    }
    function ago(ts) {
      var d = Date.now() - Number(ts);
      if (!(d >= 0)) return 'now';
      if (d < 60000) return 'now';
      if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
      if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
      return Math.floor(d / 86400000) + 'd ago';
    }
    function tagFor(theme) {
      var t = String(theme || '').toLowerCase()
        .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 40);
      return t ? '#' + t : '';
    }
    function opMult() {
      try {
        var os = window.PFOperation && window.PFOperation.status;
        var m = os ? Number(os.flash_multiplier) : 0;
        return m > 1 ? m : 0;
      } catch (e) { return 0; }
    }

    /* Event copy — punchy, combative, never invented data. Every value comes
       from the feed_list response (server-sanitized) and is esc()ed. */
    function copyFor(ev) {
      /* W2-D17 (2026-10-04): the actor's equipped custom title rides the
         ticker byline. Backend flag (W6B-1): feed_list events carry title. */
      var ttl = ev.title ? esc(String(ev.title)).slice(0,40) : '';
      var byline = ttl ? ' \u00AB' + ttl + '\u00BB' : '';
      var cs = ev.callsign ? esc(ev.callsign) + byline : '';
      var name = esc(ev.name), theme = esc(ev.theme);
      var tag = tagFor(ev.theme);
      switch (ev.type) {
        case 'operation_launch': {
          var m = opMult();
          var t = '\uD83D\uDEA8 OPERATION ' + name + ' LAUNCHED' +
            (m ? ' — ' + m + '\u00D7 XP ALL FRONTS' : '');
          return { text: t, tag: tag, hot: true };
        }
        case 'operation_end':
          return { text: '\uD83C\uDFC1 OPERATION ' + name + ' ENDED', tag: tag, hot: true };
        case 'full_deployment':
          return { text: '\u2694\uFE0F ' + cs + ' completed FULL DEPLOYMENT', tag: '' };
        case 'war_bond': {
          var tier = ev.meta && ev.meta.tier ? Number(ev.meta.tier) : 0;
          return { text: '\uD83D\uDCB0 ' + (cs || 'A comrade') + ' funded the fight' +
            (tier > 0 ? ' — $' + tier + ' War Bond' : ''), tag: '' };
        }
        case 'nuke_blast':
          return { text: '\uD83D\uDCA5 ' + (cs || 'The network') + ' just nuked the meter', tag: '' };
        case 'cell_war_declare':
          return { text: '\u2694\uFE0F Cell ' + name + ' declared war on ' + theme, tag: '' };
        case 'rally_claim':
          return { text: '\uD83D\uDD25 ' + (cs || 'A cell') + ' rallied the cell', tag: '' };
        case 'ambush_grab':
          return { text: '\uD83D\uDCE6 ' + (cs || 'Someone') + ' grabbed the ambush drop', tag: '' };
        /* 6A-R4/R7: narration-bus types — the headline rides ev.name
           (server-sanitized), rendered verbatim so economic wins and civic
           acts narrate exactly as the backend wrote them. */
        case 'econ.auction_won':
          return { text: '\uD83D\uDD28 ' + name, tag: '' };
        case 'econ.stake_claimed':
          return { text: '\uD83D\uDCB0 ' + name, tag: '' };
        case 'econ.venture_resolved':
          return { text: '\uD83C\uDFED ' + name, tag: '' };
        case 'econ.dividend_paid':
          return { text: '\uD83E\uDD1D ' + name, tag: '' };
        case 'econ.contract_claimed':
          return { text: '\uD83D\uDCDC ' + name, tag: '' };
        case 'econ.savings_milestone':
          return { text: '\uD83C\uDFE6 ' + name, tag: '' };
        case 'econ.bond_redeemed':
          return { text: '\uD83C\uDF96\uFE0F ' + name, tag: '' };
        case 'econ.cell_challenge_won':
          return { text: '\uD83C\uDFC6 ' + name, tag: '' };
        case 'civic.intel_confirmed':
          return { text: '\uD83D\uDCE1 ' + name, tag: '', hot: true };
        case 'civic.petition_milestone':
          return { text: '\u270D\uFE0F ' + name, tag: '' };
        case 'civic.proposal_closed':
          return { text: '\uD83D\uDDF3\uFE0F ' + name, tag: '' };
        case 'civic.pledge_made':
          return { text: '\u2705 ' + name, tag: '' };
        case 'civic.index_mover':
          return { text: '\uD83D\uDCC8 ' + name, tag: '' };
        /* 6A-R9: cell treasury -> cause sponsorship. Headline rides ev.name
           (server-sanitized via narrate.js), rendered verbatim. */
        case 'cell.sponsored':
          return { text: '\uD83C\uDFDB\uFE0F ' + name, tag: '' };
        /* R29 (2026-10-04): subscription -> ticker event. Backend emitter
           (W6B-1, flagged): feed_list type subscription/subscribe with meta
           {creator, amount_per_week}. Perk mechanics need Shane's call. */
        case 'subscription':
        case 'subscribe': {
          var creator = esc((ev.meta && ev.meta.creator) || ev.name || 'a creator');
          var perWk = (ev.meta && ev.meta.amount_per_week) ? Number(ev.meta.amount_per_week) : 0;
          return { text: '\uD83D\uDCB0 ' + (cs || 'A comrade') + ' is now funding ' + creator +
            (perWk > 0 ? ' \u2014 ' + perWk.toLocaleString() + ' XP/week' : ''), tag: '' };
        }
        /* Redistribution Layer (2026-10-05): settlement + spoils events.
           Copies verbatim from the redistribution spec §1.10 — every number
           rides ev.meta (emitted by the backend); the ticker never invents. */
        case 'gambit_settled': {
          var gwin = esc((ev.meta && ev.meta.winner) || ev.callsign || 'A fighter');
          var gtithe = (ev.meta && ev.meta.tithe != null) ? Number(ev.meta.tithe) : 0;
          return { text: '\u2694\uFE0F ' + gwin + ' won the gambit — ' +
            gtithe.toLocaleString() + ' XP tithed to the war chest', tag: '' };
        }
        case 'raid_spoils': {
          var rcell = esc((ev.meta && ev.meta.cell) || ev.name || 'A cell');
          var ramt = (ev.meta && ev.meta.amount != null) ? Number(ev.meta.amount) : 0;
          return { text: '\uD83D\uDCE6 ' + rcell + ' left ' + ramt.toLocaleString() +
            ' XP on the line — spoils to the cell treasury', tag: '' };
        }
        case 'draw_won': {
          var dwin = esc((ev.meta && ev.meta.winner) || ev.callsign || 'A fighter');
          var dshare = (ev.meta && ev.meta.winnerShare != null) ? Number(ev.meta.winnerShare) : 0;
          var dchest = (ev.meta && ev.meta.chestShare != null) ? Number(ev.meta.chestShare) : 0;
          return { text: '\uD83C\uDF97\uFE0F ' + dwin + ' won the Solidarity Draw — ' +
            dshare.toLocaleString() + ' XP, ' + dchest.toLocaleString() +
            ' XP to the war chest', tag: '' };
        }
        case 'forecast_settled': {
          var fpool = (ev.meta && ev.meta.pool != null) ? Number(ev.meta.pool) : 0;
          return { text: '\uD83D\uDCCA ' + name + ' resolved — ' +
            fpool.toLocaleString() + ' XP redistributed to the winners', tag: '' };
        }
        default: {
          var label = String(ev.type || '').replace(/_/g, ' ');
          return { text: '\u2022 ' + (cs ? cs + ' — ' : '') + esc(label), tag: '' };
        }
      }
    }

    function api(cb) {
      if (!BACKEND) { cb(null); return; }
      var fn = 'pfWrtCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function finish(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        cb(j);
      }
      window[fn] = function (j) { finish(j); };
      s.onerror = function () { finish(null); };
      var q = '?action=feed_list&limit=20' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      s.src = BACKEND + q + '&callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { finish(null); }, 12000);
    }

    function paint(j) {
      var root = $('pf-warrticker');
      if (!root) return;
      var list = $('pf-wrt-list'), cnt = $('pf-wrt-hour');
      if (!j || !j.ok) {
        if (list && !list.children.length)
          list.innerHTML = '<div class="wrt-empty">Ticker unreachable — retrying</div>';
        return;
      }
      lastHour = Number(j.hour_count) || 0;
      if (cnt) cnt.textContent = lastHour + ' in the last hour';
      var evs = (j.events || []).slice(0, 12);
      if (!evs.length && !list.children.length) {
        list.innerHTML = '<div class="wrt-empty">Quiet on the front — for now.</div>';
        return;
      }
      var h = '';
      for (var i = 0; i < evs.length; i++) {
        var ev = evs[i], c = copyFor(ev);
        var page = ev.ref ? safePage(ev.ref.page) : '';
        var open = page ? '<a class="wrt-item" href="' + page + '">' : '<span class="wrt-item">';
        var close = page ? '</a>' : '</span>';
        h += open +
          '<span class="wrt-copy">' + c.text +
          (c.tag ? ' <span class="wrt-tag">' + esc(c.tag) + '</span>' : '') + '</span>' +
          '<span class="wrt-ago">' + ago(ev.ts) + '</span>' +
          close;
      }
      list.innerHTML = h;
    }

    function tick() {
      try {
        if (window.PF && PF.hidden && PF.hidden()) return;
        api(paint);
      } catch (e) {}
    }

    /* Keep the ticker glued after its anchor widget even when that widget
       lazy-mounts after us (fail-silent if the anchor never appears). */
    function reposition() {
      try {
        var el = $('pf-warrticker');
        if (!el || !el.parentNode) return;
        var h = document.getElementById('pf-v2');
        if (h) {
          var fv = h.querySelector('section[data-game="fan-vote"]');
          if (fv && fv.nextSibling !== el) h.insertBefore(el, fv.nextSibling);
          return;
        }
        var cp = document.getElementById('pf-cells-page');
        if (cp) {
          var cw = cp.querySelector('section[data-game="cell-war"]');
          if (cw && cw.nextSibling !== el) cp.insertBefore(el, cw.nextSibling);
        }
      } catch (e) {}
    }

    function tryMount() {
      if (mounted) { reposition(); return true; }
      var parent = null, ref = null;
      var h = document.getElementById('pf-v2');
      if (h) {
        /* Homepage: PROOF section. Anchor on the fan-vote widget; fall back
           to right after the PROOF section header until it lazy-mounts. */
        var ph = h.querySelector('.pf-section-head[data-sec="proof"]');
        if (!ph) return false;
        parent = h;
        var fv = h.querySelector('section[data-game="fan-vote"]');
        ref = fv ? fv.nextSibling : ph.nextSibling;
      } else {
        var cp = document.getElementById('pf-cells-page');
        if (!cp) return false;
        parent = cp;
        /* /cells "sidebar" slot: alongside the cell-war standings. Falls back
           to the end of the page mount until standings mount. */
        var cw = cp.querySelector('section[data-game="cell-war"]');
        ref = cw ? cw.nextSibling : null;
      }
      var el = document.createElement('div');
      el.id = 'pf-warrticker';
      el.innerHTML =
        '<style>' +
        '#pf-warrticker{background:#0a0a0a;border:3px solid #c1121f;padding:22px 20px;' +
        'max-width:680px;margin:18px auto;color:#f5ead6;font-family:Arial,sans-serif;box-sizing:border-box}' +
        '#pf-warrticker .wrt-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}' +
        '#pf-warrticker .wrt-kicker{font-size:12px;letter-spacing:4px;color:#c1121f;font-weight:800}' +
        '#pf-warrticker .wrt-title{font-family:\'Arial Black\',Arial,sans-serif;font-size:22px;' +
        'letter-spacing:2px;text-transform:uppercase}' +
        '#pf-warrticker .wrt-live{display:inline-flex;align-items:center;gap:6px;background:#c1121f;' +
        'color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;padding:3px 10px}' +
        '#pf-warrticker .wrt-dot{width:8px;height:8px;border-radius:50%;background:#4caf50;' +
        'animation:wrtPulse 2s infinite}' +
        '@keyframes wrtPulse{0%,100%{opacity:1}50%{opacity:.35}}' +
        '#pf-warrticker .wrt-hour{margin-left:auto;font-size:12px;color:#a89e88}' +
        '#pf-warrticker .wrt-sub{font-size:13px;color:#a89e88;margin-bottom:14px}' +
        '#pf-warrticker .wrt-item{display:flex;align-items:baseline;gap:10px;padding:9px 10px;' +
        'border-top:1px solid #2a2a2a;color:#f5ead6;text-decoration:none;font-size:14px}' +
        '#pf-warrticker a.wrt-item:hover{background:#161616}' +
        '#pf-warrticker .wrt-copy{flex:1;line-height:1.4}' +
        '#pf-warrticker .wrt-tag{color:#c1121f;font-weight:700}' +
        '#pf-warrticker .wrt-ago{font-size:11px;color:#a89e88;white-space:nowrap}' +
        '#pf-warrticker .wrt-empty{padding:16px 4px;color:#a89e88;font-size:14px;text-align:center}' +
        '@media(max-width:520px){#pf-warrticker{padding:16px 12px}#pf-warrticker .wrt-title{font-size:18px}}' +
        '@media(prefers-reduced-motion:reduce){#pf-warrticker .wrt-dot{animation:none}}' +
        '</style>' +
        '<div class="wrt-head">' +
        '<span class="wrt-kicker">WAR-ROOM</span>' +
        '<span class="wrt-title">Live Ticker</span>' +
        '<span class="wrt-live"><span class="wrt-dot" aria-hidden="true"></span>LIVE</span>' +
        '<span class="wrt-hour" id="pf-wrt-hour"></span>' +
        '</div>' +
        '<div class="wrt-sub">The network, moving. Make the reel.</div>' +
        '<div id="pf-wrt-list"><div class="wrt-empty">Tuning the wire&hellip;</div></div>';
      if (ref) parent.insertBefore(el, ref);
      else parent.appendChild(el);
      mounted = true;
      tick();
      if (!timer) {
        timer = setInterval(function () {
          try {
            if (window.PF && PF.hidden && PF.hidden()) return;
            reposition();
            api(paint);
          } catch (e) {}
        }, 30000);
      }
      return true;
    }

    /* Mount when our slot exists; the 30s poller doubles as the retry loop
       for lazy-mounting pages. Nothing ever throws into the page. */
    try { if (!tryMount()) {
      setInterval(function () { try { tryMount(); } catch (e) {} }, 30000);
    } } catch (e) {}
  }
})();
