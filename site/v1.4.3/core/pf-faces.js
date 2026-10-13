/* pf-faces.js — FaceSwitcher, CorePulse, Stat, CoreBadge, PackCard
   No framework, no build step. Load with `defer`.

   Put this inline in <head> BEFORE any CSS so the accent never flashes:
   <script>(function(p){var f=/^\/api(\/|$)/.test(p)?"build":/^\/enterprise(\/|$)/.test(p)?"scale":"fight";document.documentElement.setAttribute("data-face",f);try{localStorage.setItem("pf_face",f)}catch(e){}})(location.pathname)</script>

   Markup hooks (auto-initialised on DOMContentLoaded):
     <nav data-pf-faces class="pf-faces pf-faces--topbar"></nav>
     <nav data-pf-faces class="pf-faces pf-faces--mobile"></nav>
     <section data-pf-pulse></section>
     <div data-pf-corebadge data-table="fact_osha_violations" data-rows="412300"
          data-updated="2026-10-12T14:02:00Z" data-query-id="q_osha_parent_12m"></div>

   If no [data-pf-faces] element exists, the switcher is auto-injected
   after .pf-topbar (or at the top of <body> as fallback).
*/
(function () {
  "use strict";

  var PULSE_URL = "https://pf-api.mtcstw.workers.dev/v1/core/pulse.json";
  var POLL_MS = 45000;
  var STALE_MS = 10 * 60 * 1000;

  var FACES = [
    { id: "fight", name: "FIGHT", sub: "Movement", href: "/" },
    { id: "build", name: "BUILD", sub: "Developer", href: "/api/" },
    { id: "scale", name: "SCALE", sub: "Enterprise", href: "/enterprise/" }
  ];

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nf = new Intl.NumberFormat("en-US");

  function faceFor(path) {
    if (/^\/api(\/|$)/.test(path)) return "build";
    if (/^\/enterprise(\/|$)/.test(path)) return "scale";
    return "fight";
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function ago(iso) {
    var t = Date.parse(iso);
    if (!t) return "";
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  }

  /* ---------- Stat: animated number, tabular numerals ---------- */
  function Stat(node, value) {
    node.classList.add("pf-stat");
    var from = Number(node.getAttribute("data-value")) || 0;
    var to = Number(value) || 0;
    node.setAttribute("data-value", String(to));
    if (reduced || from === to || !from) { node.textContent = nf.format(to); return; }
    var start = null, dur = 600;
    function step(ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      k = 1 - Math.pow(1 - k, 3);
      node.textContent = nf.format(Math.round(from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- FaceSwitcher ---------- */
  function FaceSwitcher(nav) {
    var current = document.documentElement.getAttribute("data-face") || faceFor(location.pathname);
    nav.setAttribute("aria-label", "Switch site section");
    nav.textContent = "";
    FACES.forEach(function (f) {
      var a = el("a");
      a.href = f.href;
      a.setAttribute("data-face-id", f.id);
      if (f.id === current) a.setAttribute("aria-current", "page");
      a.appendChild(el("span", "pf-faces__name", f.name));
      a.appendChild(el("span", "pf-faces__sub", f.sub));
      nav.appendChild(a);
    });
    // Arrow-key roving between the three links
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
      var i = links.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = (i + (e.key === "ArrowRight" ? 1 : -1) + links.length) % links.length;
      links[n].focus();
    });
  }

  /* Homepage rework 20261013 (CEO): the FIGHT/BUILD/SCALE switcher moved
     into the sidenav. A page sets window.__PF_NO_FACE_SWITCHER before this
     file loads to opt out of the switcher entirely (bar + auto-inject);
     Stat / CorePulse / CoreBadge / PackCard are unaffected. */
  function facesOff() { return !!window.__PF_NO_FACE_SWITCHER; }

  /* Auto-inject switcher when page has no [data-pf-faces] markup */
  function autoInjectSwitcher() {
    if (facesOff()) return;
    if (document.querySelector("[data-pf-faces]")) return;
    var nav = el("nav", "pf-faces pf-faces--auto");
    nav.setAttribute("data-pf-faces", "");
    var topbar = document.querySelector(".pf-topbar, header");
    if (topbar && topbar.parentNode) {
      topbar.parentNode.insertBefore(nav, topbar.nextSibling);
    } else if (document.body) {
      document.body.insertBefore(nav, document.body.firstChild);
    }
    FaceSwitcher(nav);
  }

  /* ---------- CorePulse ---------- */
  function CorePulse(root) {
    root.classList.add("pf-pulse");
    root.setAttribute("aria-label", "Data core status");
    root.setAttribute("data-open", "false");

    var toggle = el("button", "pf-pulse__toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    var tSummary = el("span", null, "Data core");
    toggle.appendChild(tSummary);

    var bar = el("div", "pf-pulse__bar");
    bar.id = "pf-pulse-bar-" + Math.random().toString(36).slice(2, 8);
    toggle.setAttribute("aria-controls", bar.id);

    function item(label) {
      var w = el("span", "pf-pulse__item");
      var b = el("b");
      w.appendChild(b);
      w.appendChild(document.createTextNode(" " + label));
      bar.appendChild(w);
      return b;
    }
    var rows = item("rows in the core");
    var ugc = item("contributions, 24h");
    var api = item("API queries, 24h");
    var health = el("span", "pf-pulse__health");
    health.appendChild(el("span", "pf-pulse__dot"));
    var hText = el("span", null, "Checking…");
    health.appendChild(hText);
    bar.appendChild(health);

    root.textContent = "";
    root.appendChild(toggle);
    root.appendChild(bar);

    toggle.addEventListener("click", function () {
      var open = root.getAttribute("data-open") !== "true";
      root.setAttribute("data-open", String(open));
      toggle.setAttribute("aria-expanded", String(open));
    });

    var HEALTH_TEXT = { ok: "Operational", degraded: "Degraded", down: "Offline", stale: "Updates paused" };

    function render(d) {
      var stale = !d.generated_at || Date.now() - Date.parse(d.generated_at) > STALE_MS;
      var state = stale ? "stale" : (HEALTH_TEXT[d.health] ? d.health : "degraded");
      Stat(rows, d.core_rows);
      Stat(ugc, d.ugc_24h);
      Stat(api, d.api_queries_24h);
      health.setAttribute("data-state", state);
      hText.textContent = HEALTH_TEXT[state] + (stale && d.generated_at ? " · as of " + ago(d.generated_at) : "");
      tSummary.textContent = nf.format(Number(d.core_rows) || 0) + " rows · " + HEALTH_TEXT[state];
    }

    var timer = null;
    function poll() {
      fetch(PULSE_URL, { credentials: "omit" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(render)
        .catch(function () {
          health.setAttribute("data-state", "stale");
          hText.textContent = HEALTH_TEXT.stale;
        });
    }
    function start() { if (!timer) { poll(); timer = setInterval(poll, POLL_MS); } }
    function stop() { clearInterval(timer); timer = null; }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
    start();
    // Exposed so ContributionPulse can tick +1 locally
    root.pfBump = function (key) {
      var n = { ugc: ugc, api: api, rows: rows }[key];
      if (n) Stat(n, (Number(n.getAttribute("data-value")) || 0) + 1);
    };
  }

  /* ---------- CoreBadge ---------- */
  function CoreBadge(node) {
    var table = node.getAttribute("data-table") || "";
    var rowsN = Number(node.getAttribute("data-rows")) || 0;
    var updated = node.getAttribute("data-updated") || "";
    var qid = node.getAttribute("data-query-id");
    node.className = "pf-corebadge";
    node.textContent = "";
    var src = el("span", null, "Source: ");
    src.appendChild(el("code", null, table));
    node.appendChild(src);
    node.appendChild(el("span", null, nf.format(rowsN) + " rows"));
    if (updated) {
      var t = el("time", null, "Updated " + ago(updated));
      t.setAttribute("datetime", updated);
      node.appendChild(t);
    }
    if (qid) {
      var b = el("button", "pf-corebadge__copy", "Copy query ID");
      b.type = "button";
      b.addEventListener("click", function () {
        var done = function () {
          b.textContent = "Copied";
          setTimeout(function () { b.textContent = "Copy query ID"; }, 2000);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(qid).then(done, function () {});
      });
      node.appendChild(b);
    }
  }

  /* ---------- PackCard ----------
     PF.PackCard(container, { name, desc, price_month, endpoints, rows, href, cta })
     Prices come from the data you pass. This component never sets them. */
  function PackCard(container, p) {
    var card = el("article", "pf-pack");
    card.appendChild(el("h3", "pf-pack__name", p.name));
    if (p.desc) card.appendChild(el("p", "pf-pack__desc", p.desc));
    var price = el("div", "pf-pack__price", "$" + nf.format(p.price_month));
    price.appendChild(el("small", null, " /mo"));
    card.appendChild(price);
    var live = el("div", "pf-pack__live");
    var e1 = el("span"); var b1 = el("b"); e1.appendChild(b1); e1.appendChild(document.createTextNode(" endpoints"));
    var e2 = el("span"); var b2 = el("b"); e2.appendChild(b2); e2.appendChild(document.createTextNode(" rows"));
    live.appendChild(e1); live.appendChild(e2);
    Stat(b1, p.endpoints); Stat(b2, p.rows);
    card.appendChild(live);
    var a = el("a", "pf-pack__cta", p.cta || "Start 7-day trial");
    a.href = p.href;
    card.appendChild(a);
    container.appendChild(card);
    return card;
  }

  function init() {
    if (!facesOff()) {
      autoInjectSwitcher();
      Array.prototype.forEach.call(document.querySelectorAll("[data-pf-faces]"), function (nav) {
        if (!nav.hasAttribute("data-pf-init")) { nav.setAttribute("data-pf-init", "1"); FaceSwitcher(nav); }
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-pf-pulse]"), CorePulse);
    Array.prototype.forEach.call(document.querySelectorAll("[data-pf-corebadge]"), CoreBadge);
  }

  window.PF = { Stat: Stat, FaceSwitcher: FaceSwitcher, CorePulse: CorePulse, CoreBadge: CoreBadge, PackCard: PackCard, faceFor: faceFor };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
