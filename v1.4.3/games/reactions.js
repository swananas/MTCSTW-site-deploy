/* games/reactions.js  |  PF v1.4.3 | REACTIONS: emoji micro-reactions on data surfaces
   Curated emoji micro-reactions (allowlist) that mount on any stat card or
   chart via <div data-react-surface="do-meter"></div>. Aggregate counts
   only — individual reactors are never listed (reaction privacy).

   ZERO XP, BY DESIGN (engagement-payoff-review.md item 2, APPROVED):
   this module never touches the ledger, never calls PF.creditLocal, never
   emits XP. Tap-farming is pointless: the backend allows one reaction per
   callsign per surface per day (re-tap changes the emoji) and hard-caps
   30 taps/day per callsign. This module adds a 10s client tap throttle
   per surface for display snappiness; the server is the real enforcer.

   Generic contract — other games mount it, no cross-game dependencies:
     PF.reactions.mount(el, surfaceId)   — mount on an element
     PF.reactions.EMOJI                  — the allowlist
   Auto-mounts every [data-react-surface] on DOM ready (guarded against
   double-mount by data-react-mounted).

   Kill switch honored client-side: ?pf_off=reactions or localStorage
   pf_disabled_v1='["reactions"]' (PF.skip("reactions")).
   KILL: ?pf_off=reactions  or  localStorage pf_disabled_v1='["reactions"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("reactions")) { return; }
  if (window.PFReactions) { return; } /* single instance */

  var BACKEND = window.PF_BACKEND_URL;
  var EMOJI = ['🔥', '📈', '💪', '🎯', '👀', '✊'];
  var TAP_THROTTLE_MS = 10 * 1000;
  var lastTap = {};

  /* Self-contained styles (games own their CSS; injected once). */
  (function injectCss() {
    if (document.getElementById("pf-reactions-css")) return;
    var st = document.createElement("style");
    st.id = "pf-reactions-css";
    st.textContent = ".pf-reactions{margin:10px 0}" +
      ".pf-reactions .r-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
      ".pf-reactions .r-btn{background:#141414;border:1px solid #3a3a3a;border-radius:18px;" +
      "padding:4px 10px;cursor:pointer;font-size:16px;line-height:1.4;color:#f5ead6}" +
      ".pf-reactions .r-btn:hover{border-color:#c1121f}" +
      ".pf-reactions .r-btn:disabled{opacity:.5;cursor:default}" +
      ".pf-reactions .r-btn.r-mine{border-color:#c1121f;background:#2a0f0f}" +
      ".pf-reactions .r-n{font:700 12px monospace;color:#c9bfa8;margin-left:4px}" +
      "@media (prefers-reduced-motion:reduce){.pf-reactions .r-btn{transition:none}}";
    try { document.head.appendChild(st); } catch (e) {}
  })();

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* Read-only counts: JSONP GET react_counts (public aggregate). */
  function getCounts(surface, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, "react_counts", { surface: surface }, cb); return; }
    } catch (e) {}
    var _cr = new Uint32Array(1);
    try { if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(_cr); else _cr[0] = Math.floor(Math.random() * 4294967295); } catch (e2) { _cr[0] = Math.floor(Math.random() * 4294967295); }
    var fn = "pfReactCb" + _cr[0];
    var s = document.createElement("script"), done = false, timer = null;
    function finish(j) {
      if (done) return; done = true;
      if (timer) { clearTimeout(timer); timer = null; }
      window[fn] = function () {};
      try { delete window[fn]; } catch (e3) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    timer = setTimeout(function () { finish(null); }, 12000);
    s.src = BACKEND + "?action=react_counts&surface=" + encodeURIComponent(surface) + "&callback=" + fn;
    document.head.appendChild(s);
  }

  /* Write: POST-only (P0 CSRF rule) + callsign auth. */
  function postReact(surface, emoji, cb) {
    var id = ident();
    var body = { type: "react", react_action: "react", callsign: id.callsign, device: id.device, surface: surface, emoji: emoji };
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    if (window.PF && PF.postAction) { PF.postAction("react", "react_action", "react", { callsign: id.callsign, device: id.device, surface: surface, emoji: emoji }, cb); return; }
    cb({ ok: false, err: "Network error." });
  }

  function render(el, surface, counts, mine) {
    var h = '<div class="r-row" role="group" aria-label="Reactions">';
    for (var i = 0; i < EMOJI.length; i++) {
      var e = EMOJI[i];
      var n = counts && counts[e] ? Number(counts[e]) : 0;
      var cls = (mine === e) ? "r-btn r-mine" : "r-btn";
      h += '<button class="' + cls + '" data-emoji="' + esc(e) + '" title="React ' + esc(e) + '">' +
        '<span class="r-e">' + esc(e) + '</span>' +
        (n > 0 ? '<span class="r-n">' + n + '</span>' : '') + '</button>';
    }
    h += '</div>';
    el.innerHTML = h;
  }

  function refresh(el, surface, mine) {
    getCounts(surface, function (j) {
      var counts = {};
      try { counts = (j && j.ok && j.reactions && j.reactions[surface] && j.reactions[surface].counts) || {}; } catch (e) {}
      render(el, surface, counts, mine);
    });
  }

  function mount(el, surface) {
    if (!el || el.getAttribute("data-react-mounted")) return;
    el.setAttribute("data-react-mounted", "1");
    surface = String(surface || el.getAttribute("data-react-surface") || "").slice(0, 80);
    if (!/^[a-z0-9_\-/:]{1,80}$/.test(surface)) return;
    el.className += " pf-reactions";
    refresh(el, surface, null);
    el.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest("button[data-emoji]") : null;
      if (!btn) return;
      var id = ident();
      if (!id.callsign) {
        /* No callsign: gate, don't fake. Same PF.gateHTML idiom as cells. */
        try { el.innerHTML = PF.gateHTML("Reactions ride on callsigns.", "to react"); } catch (e) { toast("Claim a callsign to react."); }
        return;
      }
      var emoji = btn.getAttribute("data-emoji");
      if (EMOJI.indexOf(emoji) < 0) return;
      var now = Date.now();
      if (lastTap[surface] && now - lastTap[surface] < TAP_THROTTLE_MS) return;
      lastTap[surface] = now;
      btn.disabled = true;
      postReact(surface, emoji, function (j) {
        btn.disabled = false;
        if (!j || !j.ok) { toast((j && j.err) || "Reaction failed."); return; }
        refresh(el, surface, emoji);
      });
    });
  }

  function autoMount() {
    var els = document.querySelectorAll("[data-react-surface]");
    for (var i = 0; i < els.length; i++) mount(els[i], els[i].getAttribute("data-react-surface"));
  }

  var api = { mount: mount, EMOJI: EMOJI.slice(), refresh: refresh };
  window.PFReactions = api;
  PF.reactions = api;

  function boot() {
    autoMount();
    /* Late-rendered surfaces (games mount their templates after DOM ready):
       observe for new [data-react-surface] nodes; the data-react-mounted
       guard keeps this idempotent. */
    try {
      var mo = new MutationObserver(function () { autoMount(); });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 60000);
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
