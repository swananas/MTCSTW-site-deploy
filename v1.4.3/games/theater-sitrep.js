/* games/theater-sitrep.js  |  PF v1.4.3 | Wave 5B (W5-8): SITUATION REPORT pane.
   Self-mounting: waits for #xWarReport (war-report.js widget), then PREPENDS
   the Situation Report pane above the war report body. Survives the widget's
   10-minute re-renders via a MutationObserver that re-prepends from cached
   data (no refetch storms). sitrep_latest is auth-gated via PF.authGetJSONP.
   If the action 404s (backend not deployed yet) the pane renders a
   "Command is wiring this" placeholder — never a stack trace. Zero XP for
   viewing anything. All server strings escaped.
   Wave A5 S-08: a "state of the economy" one-liner (GDP + UNRATE, official
   via FRED) renders under the stats row — figures only, omitted when the
   macro wire is dead or figures are stale.
   KILL: ?pf_off=theater (or ?pf_off=theater-sitrep)  or
   localStorage pf_disabled_v1='["theater"]'
   ECONOMY LINE KILL: ?pf_off=sitrep-economy (pane stays up) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("theater") || PF.skip("theater-sitrep")) { return; }
  /* Wave A5 S-08: the economy one-liner has its own kill so the sitrep
     pane itself stays up if the macro line is killed. */
  var ECON_KILLED = false;
  try { ECON_KILLED = PF.skip("sitrep-economy"); } catch (e) {}
  var BACKEND = window.PF_BACKEND_URL;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function ident() {
    var cs = "", dev = "";
    try { cs = window.PFCallsign ? window.PFCallsign() : ""; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ""; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  /* Auth-gated JSONP read, copied from games/war-report.js. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params || {}, cb); return; }
    } catch (e) {}
    var fn = "pfSrCb" + Math.floor(Math.random() * 1e9);
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

  /* Deep links for missed-front routing (mirrors games/theater.js). */
  var SYSTEMS = [
    { key: "route_march", name: "ROUTE MARCH", url: "/#pf-brief" },
    { key: "ambush", name: "AMBUSH", url: "/" },
    { key: "deaddrop", name: "DEAD DROP", url: "/" },
    { key: "podcast", name: "PODCAST", url: "https://rss.com/podcasts/the-propaganda-factory" },
    { key: "mystery", name: "MYSTERY", url: "/create" },
    { key: "postproof", name: "PROOF", url: "/create" },
    { key: "arcade", name: "ARCADE", url: "/arcade" },
    { key: "races", name: "RACES", url: "/sick-left-radicals" },
    { key: "siren", name: "SIREN", url: "/" }
  ];
  function sysInfo(key) {
    for (var i = 0; i < SYSTEMS.length; i++) { if (SYSTEMS[i].key === key) return SYSTEMS[i]; }
    return { key: key, name: String(key).replace(/_/g, " ").toUpperCase(), url: "/" };
  }
  function gradeColor(g) {
    g = String(g || "").toUpperCase();
    if (g === "A") return "#4caf50";
    if (g === "B") return "#e8b64c";
    if (g === "C") return "#ff5a00";
    return "#c1121f";
  }

  function css() {
    if (document.getElementById("pf-sitrep-css")) return;
    var s = document.createElement("style");
    s.id = "pf-sitrep-css";
    s.textContent =
      "#pf-sitrep{margin-bottom:14px}"
      + "#pf-sitrep .sr-grade{display:inline-block;font-family:'Arial Black',Arial,sans-serif;font-size:30px;letter-spacing:2px;padding:6px 18px;border:3px solid;margin:6px 0 10px}"
      + "#pf-sitrep .sr-head{font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#f5ead6;margin:0 0 10px}"
      + "#pf-sitrep .sr-stats{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:10px}"
      + "#pf-sitrep .sr-stat{display:flex;flex-direction:column}"
      + "#pf-sitrep .sr-v{font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#ff5a00}"
      + "#pf-sitrep .sr-l{font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#c9bfa8;text-transform:uppercase}"
      + "#pf-sitrep .sr-missed{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:10px;line-height:2}"
      + "#pf-sitrep .sr-missed a{color:#ff5a00;text-decoration:none;border:1px solid #ff5a00;padding:4px 10px;margin-right:6px;letter-spacing:1px;font-size:11px;text-transform:uppercase}"
      + "#pf-sitrep .sr-missed a:hover{background:#ff5a00;color:#0d0d0d}"
      + "#pf-sitrep .sr-foot{font-family:Arial,sans-serif;font-size:12px;color:#777;letter-spacing:1px;line-height:1.6}"
      + "#pf-sitrep .sr-foot b{color:#c9bfa8}"
      + "#pf-sitrep .sr-wire{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;letter-spacing:1px;line-height:1.6}";
    document.head.appendChild(s);
  }

  var WIRING = "Command is wiring this — check back.";
  var SR = null, SR_ERR = false, SR_LOADING = true;
  /* Wave A5 S-08: "state of the economy" one-liner (GDP + UNRATE) from
     ?action=fred_context&surface=sitrep. Cached; omitted entirely when the
     call fails or figures are stale — never a placeholder, never invented. */
  var ECON = null, ECON_ERR = false;
  function econLine() {
    if (ECON_KILLED || ECON_ERR || !ECON || !ECON.ok || !ECON.fred_live) return "";
    var cards = ECON.cards || [], gdp = null, un = null, i;
    for (i = 0; i < cards.length; i++) {
      if (cards[i] && cards[i].series_id === "GDP") gdp = cards[i];
      if (cards[i] && cards[i].series_id === "UNRATE") un = cards[i];
    }
    if (!gdp || !un || gdp.stale || un.stale ||
        gdp.value == null || un.value == null) return "";
    /* Figures only: backend-computed labels, never recomputed here. */
    var gdpBit = "GDP " + (gdp.change_pct_label || gdp.change_label || "") +
      " (" + (gdp.period_label || gdp.period || "") + ")";
    var unBit = "UNEMPLOYMENT " +
      (un.value_label != null ? un.value_label : "") +
      (un.unit === "percent" ? "%" : "") +
      " (" + (un.period_label || un.period || "") + ")";
    return gdpBit + " \u00b7 " + unBit;
  }

  function paneNode() {
    var d = document.createElement("div");
    d.className = "x-pane";
    d.id = "pf-sitrep";
    var id = ident();
    var h = '<h4>&#9876; SITUATION REPORT</h4>';
    if (!id.callsign) {
      d.innerHTML = h + '<div class="sr-wire">Situation Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your debrief.</div>';
      return d;
    }
    if (SR_LOADING && !SR_ERR) {
      d.innerHTML = h + '<div class="sr-wire">Requesting your debrief&hellip;</div>';
      return d;
    }
    if (SR_ERR || !SR || !SR.ok) {
      d.innerHTML = h + '<div class="sr-wire">' + esc(WIRING) + '</div>';
      return d;
    }
    var g = String(SR.grade || "?").toUpperCase();
    h += '<div><span class="sr-grade" style="color:' + gradeColor(g) + ';border-color:' + gradeColor(g) + '">GRADE ' + esc(g) + '</span></div>';
    if (SR.week_start) h += '<div class="sr-foot" style="margin-bottom:8px">Week of ' + esc(SR.week_start) + '</div>';
    if (SR.headline) h += '<p class="sr-head">' + esc(SR.headline) + '</p>';
    h += '<div class="sr-stats">'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.circuits_completed != null ? SR.circuits_completed : "—") + '</span><span class="sr-l">Circuits</span></div>'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.ambush_claims != null ? SR.ambush_claims : "—") + '</span><span class="sr-l">Ambush claims</span></div>'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.breadth != null ? SR.breadth : "—") + '</span><span class="sr-l">Front breadth</span></div>'
      + '</div>';
    /* Wave A5 S-08: state-of-the-economy one-liner. Omitted when the
       macro wire is dead or figures are stale — no placeholders. */
    var econ = econLine();
    if (econ) h += '<div class="sr-foot" style="margin-bottom:10px"><b>STATE OF THE ECONOMY:</b> ' +
      esc(econ) + ' <span style="color:#777">\u00b7 OFFICIAL VIA FRED</span></div>';
    var missed = SR.missed_systems || [];
    if (missed.length) {
      h += '<div class="sr-missed">MISSED FRONTS — go take them:<br>';
      for (var i = 0; i < missed.length; i++) {
        var si = sysInfo(String(missed[i]).toLowerCase());
        h += '<a href="' + esc(si.url) + '">' + esc(si.name) + ' &rarr;</a>';
      }
      h += '</div>';
    }
    var foot = [];
    if (SR.ribbon_state) foot.push("<b>RIBBONS:</b> " + esc(SR.ribbon_state));
    if (SR.streak_state) foot.push("<b>STREAK:</b> " + esc(SR.streak_state));
    if (foot.length) h += '<div class="sr-foot">' + foot.join(" &nbsp;&middot;&nbsp; ") + '</div>';
    d.innerHTML = h;
    return d;
  }
  function paintSitrep() {
    var host = document.getElementById("xWarReport");
    if (!host) return;
    var old = document.getElementById("pf-sitrep");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    host.insertBefore(paneNode(), host.firstChild);
  }
  function keepAlive() {
    var host = document.getElementById("xWarReport");
    if (!host || host._srObs) return;
    var guard = false;
    var mo = new MutationObserver(function () {
      if (guard) return;
      try {
        if (document.getElementById("pf-sitrep")) return;
        guard = true;
        host.insertBefore(paneNode(), host.firstChild);
        guard = false;
      } catch (e) { guard = false; }
    });
    try { mo.observe(host, { childList: true }); host._srObs = true; } catch (e) {}
  }
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

  /* Wave A5 S-08: the economy line rides the pane's own cadence. Fail-soft:
     a dead macro wire hides the line; it never breaks the sitrep. */
  function loadEcon() {
    if (ECON_KILLED) return;
    api("fred_context", { surface: "sitrep" }, function (j) {
      try {
        if (j && j.ok && j.fred_live && (j.cards || []).length) { ECON = j; ECON_ERR = false; }
        else if (!ECON) { ECON_ERR = true; }
        paintSitrep();
      } catch (e) {}
    });
  }

  css();
  waitFor("#xWarReport", function () {
    paintSitrep();
    keepAlive();
    var id = ident();
    if (!id.callsign) return;
    api("sitrep_latest", { callsign: id.callsign, device: id.device }, function (j) {
      SR_LOADING = false;
      if (j && j.ok) { SR = j; } else { SR_ERR = true; }
      paintSitrep();
    });
    loadEcon();
  });
  /* Refresh on the widget's own cadence; skip when the tab is hidden. */
  setInterval(function () {
    try { if (window.PF && PF.hidden && PF.hidden()) return; } catch (e) {}
    if (!document.getElementById("pf-sitrep")) return;
    var id = ident();
    if (!id.callsign) return;
    api("sitrep_latest", { callsign: id.callsign, device: id.device }, function (j) {
      if (j && j.ok) { SR = j; SR_ERR = false; } else if (!SR) { SR_ERR = true; }
      paintSitrep();
    });
    loadEcon(); /* Wave A5 S-08: economy line refreshes on the same cadence. */
  }, 600000);
})();
