/* games/theater.js  |  PF v1.4.3 | Wave 5B (W5-1 / W5-9): THEATER RACK +
   ribbon chase strip + Frontline Streak + Theater Rank display.
   Self-mounting (no template): waits for #pf-ranks and #xBrief, then injects
   into the live widgets. Survives #xBrief's 3-minute re-renders via a
   MutationObserver that re-appends from cached data (no refetch storms).
   Reads are auth-gated via PF.authGetJSONP (callsign/device/auth_secret
   attached automatically). If an action 404s (backend not deployed yet) the
   surface renders a "Command is wiring this" placeholder — never a trace.
   Zero XP for viewing anything. All server strings escaped.
   KILL: ?pf_off=theater  or  localStorage pf_disabled_v1='["theater"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("theater")) { return; }
  var BACKEND = window.PF_BACKEND_URL;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function ident() {
    var cs = "", dev = "";
    try { cs = window.PFCallsign ? window.PFCallsign() : ""; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ""; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  /* Auth-gated JSONP read, copied from games/war-report.js. Falls back to a
     plain JSONP script tag if the shared helper is unavailable. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params || {}, cb); return; }
    } catch (e) {}
    var fn = "pfThCb" + Math.floor(Math.random() * 1e9);
    var s = document.createElement("script"), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e3) {}
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = "?action=" + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== "") q += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }
    q += "&callback=" + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* ---------- ribbon + system definitions (client mirror of server config) ---------- */
  var RIBBONS = [
    { key: "first_strike", name: "FIRST STRIKE", desc: "2 fronts in a week" },
    { key: "multi_front", name: "MULTI-FRONT", desc: "4 fronts in a week" },
    { key: "full_theater", name: "FULL THEATER", desc: "7 fronts in a week" },
    { key: "ambush_vet", name: "AMBUSH VET", desc: "3 ambush claims" },
    { key: "circuit_commander", name: "CIRCUIT COMMANDER", desc: "5 route marches" },
    { key: "ghost", name: "GHOST", desc: "assembled a Ticker Cipher" },
    { key: "all_fronts", name: "ALL FRONTS", desc: "event-only ribbon" }
  ];
  function ribbonName(key) {
    for (var i = 0; i < RIBBONS.length; i++) { if (RIBBONS[i].key === key) return RIBBONS[i].name; }
    return String(key).replace(/_/g, " ").toUpperCase();
  }
  function ribbonDesc(key) {
    for (var i = 0; i < RIBBONS.length; i++) { if (RIBBONS[i].key === key) return RIBBONS[i].desc; }
    return "theater honor";
  }
  var SYSTEMS = [
    { key: "route_march", name: "ROUTE MARCH", url: "/#pf-brief" },
    { key: "ambush", name: "AMBUSH", url: "/" },
    { key: "deaddrop", name: "DEAD DROP", url: "/" },
    { key: "podcast", name: "PODCAST", url: "https://rss.com/podcasts/the-propaganda-factory" },
    { key: "mystery", name: "MYSTERY", url: "/create" },
    { key: "postproof", name: "PROOF", url: "/create" },
    { key: "arcade", name: "ARCADE", url: "/arcade" },
    { key: "races", name: "RACES", url: "/sick-left-radicals" },
    { key: "siren", name: "SIREN", url: "/" },
    { key: "cells", name: "CELLS", url: "/cells" }
  ];

  /* ---------- Chicago-week helpers (ribbons are awarded on America/Chicago Mondays) ---------- */
  function chiNow() {
    try { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })); }
    catch (e) { return new Date(); }
  }
  function chiMonday(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function wkKey(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function wkLabel(d) { return MONTHS[d.getMonth()] + " " + d.getDate(); }
  function last8Mondays() {
    var m0 = chiMonday(chiNow()), out = [];
    for (var i = 0; i < 8; i++) { var x = new Date(m0.getTime()); x.setDate(x.getDate() - 7 * i); out.push(x); }
    return out;
  }
  /* Backend rack rows: {week_start, ribbon, ts}. Normalize week_start to a
     Chicago Monday key so format drift (ISO vs date-only) still matches. */
  function normWeek(ws) {
    try {
      var d = new Date(String(ws));
      if (!isNaN(d.getTime())) return wkKey(chiMonday(d));
    } catch (e) {}
    return String(ws || "");
  }

  /* ---------- shared styles (propaganda-poster: black/red/cream, Arial Black) ---------- */
  function css() {
    if (document.getElementById("pf-theater-css")) return;
    var s = document.createElement("style");
    s.id = "pf-theater-css";
    s.textContent =
      "#pf-ranks .th-rack{margin-top:22px;border-top:2px solid #c1121f;padding-top:18px;text-align:center}"
      + "#pf-ranks .th-head{font-size:22px;letter-spacing:4px;color:#c1121f;text-transform:uppercase;margin-bottom:4px}"
      + "#pf-ranks .th-sub{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:14px;letter-spacing:1px;line-height:1.5}"
      + "#pf-ranks .th-load{font-family:Arial,sans-serif;font-size:12px;color:#777;padding:12px}"
      + "#pf-ranks .th-gate{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;padding:14px;border:1px dashed #555;line-height:1.6}"
      + "#pf-ranks .th-wire{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;padding:14px;line-height:1.6;letter-spacing:1px}"
      + "#pf-ranks .th-wkrow{display:flex;align-items:center;gap:10px;margin-bottom:8px;text-align:left}"
      + "#pf-ranks .th-wk{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#c9bfa8;min-width:64px;text-transform:uppercase}"
      + "#pf-ranks .th-slots{display:flex;gap:6px;flex-wrap:wrap}"
      + "#pf-ranks .th-slot{width:30px;height:30px;line-height:26px;text-align:center;font-size:15px;border:2px dashed #333;background:#141414;color:#333;box-sizing:border-box;cursor:default}"
      + "#pf-ranks .th-slot.got{border:2px solid #ff5a00;background:#2a1503;color:#ff5a00;box-shadow:0 0 10px rgba(255,90,0,.45)}"
      + "#pf-ranks .th-slot.got.full{border-color:#f5ead6;background:#3a0a0d;color:#f5ead6;box-shadow:0 0 12px rgba(193,18,31,.6)}"
      + "#pf-ranks .th-legend{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:10px;line-height:1.6}"
      + "#pf-ranks .th-legend b{color:#ff5a00}"
      + "#pf-ranks .th-streak{display:inline-block;background:#c1121f;color:#fff;font-size:16px;letter-spacing:3px;padding:10px 26px;text-transform:uppercase;margin:4px 0 12px}"
      + "#pf-ranks .th-rank{margin:0 auto 12px;max-width:480px}"
      + "#pf-ranks .th-rankbadge{display:inline-block;background:#1a1a1a;border:3px solid #ff5a00;color:#ff5a00;font-size:20px;letter-spacing:3px;padding:8px 22px;text-transform:uppercase;margin-bottom:8px}"
      + "#pf-ranks .th-ladder{display:flex;gap:4px;margin-bottom:8px}"
      + "#pf-ranks .th-rung{flex:1;height:12px;background:#2a2a2a;border:1px solid #555}"
      + "#pf-ranks .th-rung.on{background:#ff5a00;border-color:#ff5a00}"
      + "#pf-ranks .th-rnext{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;letter-spacing:1px;margin-bottom:4px}"
      + "#pf-ranks .th-decay{font-family:Arial,sans-serif;font-size:12px;color:#ff6b6b;line-height:1.6;margin-top:6px}"
      + "#pf-brief .th-chase{margin:14px 0;padding:12px;border:2px solid #c1121f;background:#141414}"
      + "#pf-brief .th-chase-head{font:bold 14px monospace;color:#ff6b6b;letter-spacing:2px;margin-bottom:4px}"
      + "#pf-brief .th-chase-sub{font:12px monospace;color:#e8b64c;letter-spacing:1px;margin-bottom:10px}"
      + "#pf-brief .th-dots{display:flex;gap:8px;flex-wrap:wrap}"
      + "#pf-brief .th-dot{display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none;min-width:52px}"
      + "#pf-brief .th-pip{width:22px;height:22px;border-radius:50%;border:2px solid #555;background:#1a1a1a;box-sizing:border-box}"
      + "#pf-brief .th-pip.on{border-color:#ff5a00;background:#ff5a00;box-shadow:0 0 8px rgba(255,90,0,.6)}"
      + "#pf-brief .th-dlabel{font:9px monospace;color:#888;letter-spacing:1px;text-align:center}"
      + "#pf-brief .th-dot.got .th-dlabel{color:#e8b64c}"
      + "#pf-brief .th-chase-wire{font:12px monospace;color:#ff5a00;letter-spacing:1px}";
    document.head.appendChild(s);
  }

  var WIRING = "Command is wiring this — check back.";

  /* ---------- cached backend state ---------- */
  var RS = null, RS_ERR = false, RS_LOADING = true;   /* ribbon_status */
  var TS = null, TS_ERR = false, TS_LOADING = true;   /* theater_status */
  var GOT = {};                    /* weekKey -> {ribbonKey:true} */

  function rebuildGot() {
    GOT = {};
    if (!RS || !RS.rack) return;
    for (var i = 0; i < RS.rack.length; i++) {
      var row = RS.rack[i], k = normWeek(row.week_start), r = String(row.ribbon || "").toLowerCase();
      if (!k || !r) continue;
      if (!GOT[k]) GOT[k] = {};
      GOT[k][r] = true;
    }
  }

  /* ---------- THEATER RACK (inside #pf-ranks, below the XP ranks) ---------- */
  function rackShell() {
    var d = document.createElement("div");
    d.className = "th-rack";
    d.id = "thRack";
    d.innerHTML = '<div class="th-head">&#9733; THEATER RACK &#9733;</div>'
      + '<div class="th-sub">Weekly ribbons for fighting across every front. Earned ribbons stay forever — missed weeks leave holes that never fill.</div>'
      + '<div id="thStreakRank"><div class="th-load">Consulting command&hellip;</div></div>'
      + '<div id="thRackBody"><div class="th-load">Consulting command&hellip;</div></div>';
    return d;
  }
  function paintRack() {
    var body = document.getElementById("thRackBody");
    if (!body) return;
    var id = ident();
    if (!id.callsign) {
      body.innerHTML = '<div class="th-gate">Theater ribbons are awarded to callsigns. Claim yours in Enlistment Ranks above, then report back — the rack is waiting.</div>';
      return;
    }
    if (RS_ERR || !RS || !RS.ok) {
      body.innerHTML = '<div class="th-wire">' + esc(WIRING) + '</div>';
      return;
    }
    var weeks = last8Mondays(), h = "";
    for (var w = 0; w < weeks.length; w++) {
      var key = wkKey(weeks[w]), got = GOT[key] || {};
      h += '<div class="th-wkrow"><div class="th-wk">' + esc(wkLabel(weeks[w])) + '</div><div class="th-slots">';
      for (var r = 0; r < RIBBONS.length; r++) {
        var rb = RIBBONS[r];
        if (got[rb.key]) {
          var full = rb.key === "full_theater" || rb.key === "all_fronts";
          h += '<span class="th-slot got' + (full ? " full" : "") + '" title="' + esc(rb.name + " — " + rb.desc) + '">&#9733;</span>';
        } else {
          h += '<span class="th-slot" title="' + esc(rb.name + " — " + rb.desc) + '"></span>';
        }
      }
      h += '</div></div>';
    }
    h += '<div class="th-legend"><b>&#9733;</b> earned ribbons are permanent. <b>Dark holes</b> are weeks that slipped away — last 8 weeks shown.</div>';
    body.innerHTML = h;
  }
  var TIERS = ["IRREGULAR", "MILITIA", "GUARD", "BRIGADE", "CORPS", "ARMY GROUP"];
  function paintStreakRank() {
    var el = document.getElementById("thStreakRank");
    if (!el) return;
    var id = ident();
    if (!id.callsign) {
      el.innerHTML = '<div class="th-gate">Frontline streaks and theater ranks are tracked per callsign.</div>';
      return;
    }
    if (TS_ERR || !TS || !TS.ok) {
      el.innerHTML = '<div class="th-wire">' + esc(WIRING) + '</div>';
      return;
    }
    var days = Math.max(0, parseInt(TS.streak_days, 10) || 0);
    var rank = String(TS.rank || "IRREGULAR").toUpperCase();
    var idx = TIERS.indexOf(rank);
    if (idx < 0) idx = 0;
    var rp = TS.rank_progress || {};
    var h = '<div><span class="th-streak">&#128293; FRONTLINE STREAK: ' + days + ' DAY' + (days === 1 ? "" : "S") + '</span></div>';
    h += '<div class="th-rank"><span class="th-rankbadge">' + esc(rank) + '</span>';
    h += '<div class="th-ladder">';
    for (var i = 0; i < TIERS.length; i++) {
      h += '<div class="th-rung' + (i <= idx ? " on" : "") + '" title="' + esc(TIERS[i]) + '"></div>';
    }
    h += '</div>';
    if (rp.next) {
      h += '<div class="th-rnext">NEXT: ' + esc(String(rp.next).toUpperCase()) + ' — ' + esc(String(rp.need != null ? rp.need : "")) + '</div>';
    } else if (idx >= TIERS.length - 1) {
      h += '<div class="th-rnext">Highest theater rank. The machine salutes you.</div>';
    }
    if (TS.decay_warning) {
      h += '<div class="th-decay">&#9888; ' + esc(TS.decay_warning) + '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
  }
  function mountRack() {
    if (document.getElementById("thRack")) return;
    var host = document.getElementById("pf-ranks");
    if (!host) return;
    host.appendChild(rackShell());
    var id = ident();
    if (!id.callsign) { paintRack(); paintStreakRank(); return; }
    api("ribbon_status", { callsign: id.callsign, device: id.device }, function (j) {
      RS_LOADING = false;
      if (j && j.ok) { RS = j; rebuildGot(); } else { RS_ERR = true; }
      paintRack(); paintChase();
    });
    api("theater_status", { callsign: id.callsign, device: id.device }, function (j) {
      TS_LOADING = false;
      if (j && j.ok) { TS = j; } else { TS_ERR = true; }
      paintStreakRank(); paintChase();
    });
  }

  /* ---------- RIBBON CHASE STRIP (inside #xBrief) ---------- */
  function chaseNode() {
    var d = document.createElement("div");
    d.className = "th-chase";
    d.id = "thChase";
    var id = ident();
    if (!id.callsign) return null; /* brief gates content on callsign anyway */
    if (RS_LOADING && !RS_ERR) {
      d.innerHTML = '<div class="th-chase-wire">&#9733; RIBBON CHASE — consulting command&hellip;</div>';
      return d;
    }
    if (RS_ERR || !RS || !RS.ok) {
      d.innerHTML = '<div class="th-chase-wire">&#9733; RIBBON CHASE — ' + esc(WIRING) + '</div>';
      return d;
    }
    var breadth = Math.max(0, parseInt(RS.breadth, 10) || 0);
    var sys = RS.systems || {};
    var need = 7 - breadth;
    var head, sub;
    if (need <= 0) {
      head = "RIBBON CHASE — " + breadth + "/10 SYSTEMS";
      sub = "FULL THEATER SECURED. Fight to keep it.";
    } else {
      head = "RIBBON CHASE — " + breadth + "/10 SYSTEMS";
      sub = "FULL THEATER needs " + need + " more";
    }
    var h = '<div class="th-chase-head">&#9733; ' + esc(head) + '</div>'
      + '<div class="th-chase-sub">' + esc(sub) + '</div><div class="th-dots">';
    for (var i = 0; i < SYSTEMS.length; i++) {
      var sm = SYSTEMS[i], on = !!sys[sm.key];
      h += '<a class="th-dot' + (on ? " got" : "") + '" href="' + esc(sm.url) + '" title="' + esc(sm.name + (on ? " — hit this week" : " — not hit yet")) + '">'
        + '<span class="th-pip' + (on ? " on" : "") + '"></span>'
        + '<span class="th-dlabel">' + esc(sm.name) + '</span></a>';
    }
    h += '</div>';
    d.innerHTML = h;
    return d;
  }
  function paintChase() {
    var host = document.getElementById("xBrief");
    if (!host) return;
    var old = document.getElementById("thChase");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!ident().callsign) return;
    var node = chaseNode();
    if (node) host.appendChild(node);
  }
  function keepChaseAlive() {
    var host = document.getElementById("xBrief");
    if (!host || host._thObs) return;
    var guard = false;
    var mo = new MutationObserver(function () {
      if (guard) return;
      try {
        if (document.getElementById("thChase") || !ident().callsign) return;
        guard = true;
        var node = chaseNode();
        if (node) host.appendChild(node);
        guard = false;
      } catch (e) { guard = false; }
    });
    try { mo.observe(host, { childList: true }); host._thObs = true; } catch (e) {}
  }

  /* ---------- wait for the host widgets, then mount ---------- */
  function waitFor(sel, cb) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var el = null;
      try { el = document.querySelector(sel); } catch (e) {}
      if (el) { try { clearInterval(iv); } catch (e2) {} cb(el); return; }
      if (tries > 60) { try { clearInterval(iv); } catch (e3) {} }
    }, 500);
  }

  css();
  waitFor("#pf-ranks", function () { mountRack(); });
  waitFor("#xBrief", function () {
    /* V3 homepage (2026-10-07, fe/home-redesign "unclunk"): the consolidated
       brief block owns #xBrief — no injected chase strip. Rank display on v3
       is the daily-orders rank strip. (Dedicated-home move for the full
       theater rack pending Shane's call; kill switch intact.) */
    try { if (document.querySelector('#pf-v2 section[data-game="hero"]')) return; } catch (e) {}
    paintChase();
    keepChaseAlive();
  });
  /* periodic refresh (same cadence as the war-report widget) — no refetch
     when the tab is hidden, and never any XP for viewing. */
  setInterval(function () {
    try { if (window.PF && PF.hidden && PF.hidden()) return; } catch (e) {}
    var id = ident();
    if (!id.callsign) return;
    /* Only poll when at least one surface is actually on the page. */
    if (!document.getElementById("thRack") && !document.getElementById("thChase")) return;
    api("ribbon_status", { callsign: id.callsign, device: id.device }, function (j) {
      if (j && j.ok) { RS = j; RS_ERR = false; rebuildGot(); } else if (!RS) { RS_ERR = true; }
      paintRack(); paintChase();
    });
    api("theater_status", { callsign: id.callsign, device: id.device }, function (j) {
      if (j && j.ok) { TS = j; TS_ERR = false; } else if (!TS) { TS_ERR = true; }
      paintStreakRank();
    });
  }, 600000);
})();
