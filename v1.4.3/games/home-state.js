/* games/home-state.js  |  PF v1.4.3 | Home-state preference: onboarding state picker
   2026-10-05 (Political HQ integration #5): new users pick their state at
   signup (callsign-claim flow); the choice personalizes the civic feed —
   ballot deadlines, state bills, state-affiliated cells.
   CEO REQUIREMENTS (hard):
   - "Stateless" is the FIRST option, above all 50 states + DC. First-class
     choice, never a buried opt-out.
   - Changeable later (settings widget below), never a one-way door.
   - Never public: never displayed on leaderboards, never attached to a
     callsign publicly, never shared. Local preference only.
   - No XP. Read-only preference, zero write path to the backend.
   STORAGE: localStorage "pf_home_state_v1". "" = stateless chosen,
   null/absent = never chosen. No backend write, no tracking.
   CONSUMER CONTRACT: PF.homeState() -> "TX" | "" | null. Change events fire
   as CustomEvent('pf-home-state-changed', {detail:{state}}). Panes
   (ballot center, state bills, cell discovery) pre-select / scope from it.
   KILL: ?pf_off=home-state  or  localStorage pf_disabled_v1='["home-state"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("home-state")) { return; }

  var LS = "pf_home_state_v1";

  /* Stateless FIRST per CEO directive, then 50 states + DC. */
  var STATES = [
    ["", "Prefer not to say — stateless"],
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
    ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
    ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
    ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
    ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"],
    ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
    ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
    ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
    ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
    ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
    ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
    ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
    ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
    ["WI", "Wisconsin"], ["WY", "Wyoming"]
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function valid(code) {
    if (code === "") return true; /* stateless is always valid */
    for (var i = 0; i < STATES.length; i++) { if (STATES[i][0] === code) return true; }
    return false;
  }

  /* "" = stateless chosen · null = never chosen · "XX" = state chosen */
  function get() {
    try {
      var v = localStorage.getItem(LS);
      if (v === null) return null;
      return valid(v) ? v : null;
    } catch (e) { return null; }
  }

  function set(code) {
    if (code == null) code = "";
    code = String(code).toUpperCase();
    if (!valid(code)) return false;
    try { localStorage.setItem(LS, code); } catch (e) { /* private mode: keep going */ }
    try {
      document.dispatchEvent(new CustomEvent('pf-home-state-changed', { detail: { state: code } }));
    } catch (e2) {}
    renderSettings();
    return true;
  }

  function displayName(code) {
    if (code === null) return "Not set";
    if (code === "") return "Stateless";
    for (var i = 0; i < STATES.length; i++) { if (STATES[i][0] === code) return STATES[i][1]; }
    return "Not set";
  }

  function optionsHtml(selected) {
    var h = "";
    for (var i = 0; i < STATES.length; i++) {
      h += '<option value="' + esc(STATES[i][0]) + '"' +
        (STATES[i][0] === selected ? ' selected' : '') + '>' +
        esc(STATES[i][1]) + '</option>';
    }
    return h;
  }

  /* Public consumer contract — ballot center, state bills, cell discovery. */
  PF.homeState = get;
  PF.setHomeState = set;
  PF.homeStateName = function () { return displayName(get()); };
  PF.homeStateOptions = function () { return STATES.slice(); };

  var PRIVACY_COPY = "Only used to personalize your civic feed — ballot deadlines, " +
    "state bills, cells near you. Never public, never on leaderboards, never shared.";

  /* Populate the claim-flow picker (rendered by daily-orders.js claim box).
     Retry-bounded: the orders template mounts after this bundle runs. */
  var claimTries = 0;
  function wireClaimPicker() {
    var sel = document.getElementById("oHomeState");
    if (!sel) {
      if (++claimTries < 40) setTimeout(wireClaimPicker, 250);
      return;
    }
    if (sel.options.length === 0) sel.innerHTML = optionsHtml(get() === null ? "" : get());
  }

  /* Settings widget — changeable later, not a one-way door. Mounts after the
     claim area when present, otherwise into the PF holder. */
  function renderSettings() {
    var mount = document.getElementById("pfHomeStateMount");
    if (!mount) {
      var anchor = document.getElementById("oClaimWrap");
      if (anchor && anchor.parentNode) {
        mount = document.createElement("div");
        mount.id = "pfHomeStateMount";
        anchor.parentNode.insertBefore(mount, anchor.nextSibling);
      } else if (PF.holder) {
        try {
          mount = document.createElement("div");
          mount.id = "pfHomeStateMount";
          PF.holder().appendChild(mount);
        } catch (e) { return; }
      } else return;
    }
    var cur = get();
    mount.innerHTML =
      '<div class="hs-wrap" style="margin:10px 0;padding:10px 12px;border:1px solid #3a2f1d;' +
      'background:#141007;font-family:Arial,sans-serif;max-width:420px;">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#e8b923;font-weight:700;">HOME STATE</div>' +
      '<div style="margin:6px 0;font-size:14px;color:#f5f0e1;">' +
      '<span id="pfHsCurrent">' + esc(displayName(cur)) + '</span> ' +
      '<button id="pfHsChange" style="background:none;border:0;color:#e8b923;cursor:pointer;' +
      'font-size:12px;text-decoration:underline;padding:4px 8px;min-height:44px;">change</button></div>' +
      '<div id="pfHsPicker" style="display:none;margin-top:6px;">' +
      '<select id="pfHsSelect" aria-label="Home state" style="width:100%;min-height:44px;' +
      'background:#0d0d0d;color:#f5f0e1;border:1px solid #6b5f45;font-size:15px;padding:8px;">' +
      optionsHtml(cur === null ? "" : cur) + '</select>' +
      '<div style="margin-top:8px;"><button id="pfHsSave" style="background:#c1121f;color:#fff;' +
      'border:0;font-weight:700;padding:10px 18px;min-height:44px;cursor:pointer;">Save</button> ' +
      '<span id="pfHsSaved" style="font-size:12px;color:#9db89a;margin-left:8px;"></span></div>' +
      '<div style="font-size:11px;color:#8a7f68;margin-top:8px;">' + esc(PRIVACY_COPY) + '</div>' +
      '</div></div>';
    var chg = document.getElementById("pfHsChange"),
        pkr = document.getElementById("pfHsPicker"),
        sv = document.getElementById("pfHsSave"),
        sel2 = document.getElementById("pfHsSelect"),
        ok = document.getElementById("pfHsSaved");
    if (chg && pkr) chg.onclick = function () {
      pkr.style.display = pkr.style.display === "none" ? "block" : "none";
    };
    if (sv && sel2) sv.onclick = function () {
      if (set(sel2.value)) {
        if (ok) ok.textContent = "Saved.";
        pkr.style.display = "none";
      }
    };
  }

  /* Keep the settings widget in sync when the claim flow saves a state. */
  try {
    document.addEventListener('pf-home-state-changed', function () { renderSettings(); });
  } catch (e) {}

  wireClaimPicker();
  /* Settings mount may also arrive late (template mount order) — bounded retry. */
  var setTries = 0;
  (function wireSettings() {
    if (!document.getElementById("pfHomeStateMount") &&
        !document.getElementById("oClaimWrap") && !(PF.holder && PF.holder())) {
      if (++setTries < 40) { setTimeout(wireSettings, 250); return; }
    }
    renderSettings();
  })();
})();
