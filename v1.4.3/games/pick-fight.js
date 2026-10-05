/* games/pick-fight.js  |  PF v1.4.3 | Pick-your-fight preference: onboarding issue-area picker
   2026-10-05 (Political HQ creation weaves #5): new users pick 1-3 issue
   areas at signup (callsign-claim flow, one screen after the state picker);
   the choice personalizes political creation + civic feed — Poster Forge
   political tab pre-filters, strike orders' political slot prefers
   fight-relevant tasks, ballot/civic snapshot prioritizes fight-relevant
   bills, nonprofit directory pre-filters to fight areas.
   CEO REQUIREMENTS (hard):
   - Max 3 picks, min 1 — but skippable ("Surprise me" -> no filter), same
     stateless pattern as the home-state picker. Skipping is first-class.
   - Changeable later (settings widget below), never a one-way door.
   - Never public: never displayed on leaderboards, never attached to a
     callsign publicly, never shared. Local preference only.
   - XP (2026-10-05 CEO directive, Economy Desk sign-off): +10 XP ONCE for a
     first real pick (null -> 1-3 non-empty), riding the existing
     enlistment-ranks onboarding track (award("fight",10,"once",{exempt:1}) —
     same class as quiz/bracket). Skip ("Surprise me") = 0 XP; changes and
     clears = 0 XP. Supersedes the earlier "No XP" requirement.
   STORAGE: localStorage "pf_pick_fight_v1" (JSON array of area ids).
   [] = skipped/no filter. Missing = never chosen.
   ISSUE AREAS = the 12 from the aligned-nonprofits master directory
   (research_notes/aligned-nonprofits-directory-20261005-0926/report.md).
   CONSUMER CONTRACT: PF.pickFight() -> ["voting","climate"] (copy; [] =
   no filter). Change events fire as CustomEvent('pf-pick-fight-changed',
   {detail:{fights:[...]}}). See PICK-FIGHT-CONSUMER-CONTRACT.md for the
   full release-train contract.
   KILL: ?pf_off=pick-fight  or  localStorage pf_disabled_v1='["pick-fight"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("pick-fight")) { return; }

  var LS = "pf_pick_fight_v1";
  var MAX = 3;

  /* The 12 issue areas from the nonprofit master directory. ids are stable. */
  var AREAS = [
    ["voting",     "Voting Rights & Democracy"],
    ["labor",      "Labor & Workers' Rights"],
    ["repro",      "Reproductive Rights"],
    ["climate",    "Climate & Environment"],
    ["racial",     "Racial Justice"],
    ["lgbtq",      "LGBTQ+ Rights"],
    ["immigrant",  "Immigrant Rights"],
    ["criminal",   "Criminal Justice Reform"],
    ["healthcare", "Healthcare Access"],
    ["housing",    "Housing & Tenants' Rights"],
    ["poverty",    "Anti-Poverty & Economic Justice"],
    ["watchdog",   "Watchdog & Accountability"]
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function validId(id) {
    for (var i = 0; i < AREAS.length; i++) { if (AREAS[i][0] === id) return true; }
    return false;
  }

  /* [] = skipped/no filter · null = never chosen */
  function get() {
    try {
      var raw = localStorage.getItem(LS);
      if (raw === null) return null;
      var arr;
      try { arr = JSON.parse(raw); } catch (e) { return null; }
      if (!Array.isArray(arr)) return null;
      var out = [];
      for (var i = 0; i < arr.length && out.length < MAX; i++) {
        var id = String(arr[i]);
        if (validId(id) && out.indexOf(id) === -1) out.push(id);
      }
      return out;
    } catch (e) { return null; }
  }

  function set(arr) {
    if (!Array.isArray(arr)) arr = [];
    var clean = [];
    for (var i = 0; i < arr.length && clean.length < MAX; i++) {
      var id = String(arr[i]);
      if (validId(id) && clean.indexOf(id) === -1) clean.push(id);
    }
    /* First-ever save? The XP hook below fires only on null -> non-empty. */
    var wasNeverChosen = false;
    try { wasNeverChosen = (localStorage.getItem(LS) === null); } catch (e) {}
    try { localStorage.setItem(LS, JSON.stringify(clean)); } catch (e) { /* private mode: keep going */ }
    try {
      document.dispatchEvent(new CustomEvent('pf-pick-fight-changed', { detail: { fights: clean.slice() } }));
    } catch (e2) {}
    /* XP hook (2026-10-05 CEO directive, Economy Desk sign-off): first REAL
       pick only (null -> 1-3 non-empty). Skip ([]) = 0 XP; re-saves and
       clears never re-fire. The enlistment track awards once under key
       "fight" via its existing once-rule guard (no double-grant). */
    if (wasNeverChosen && clean.length > 0) {
      try {
        document.dispatchEvent(new CustomEvent('pf-fight-picked', { detail: { fights: clean.slice() } }));
      } catch (e3) {}
    }
    renderSettings();
    return true;
  }

  function names(arr) {
    var out = [];
    for (var i = 0; i < AREAS.length; i++) {
      if (arr && arr.indexOf(AREAS[i][0]) !== -1) out.push(AREAS[i][1]);
    }
    return out;
  }

  function displayName(arr) {
    if (arr === null) return "Not set";
    if (arr.length === 0) return "All fights (no filter)";
    return names(arr).join(", ");
  }

  /* Public consumer contract — forge tab, strike orders, civic snapshot, nonprofits. */
  PF.pickFight = function () { var g = get(); return g === null ? [] : g.slice(); };
  PF.pickFightChosen = function () { return get() !== null; };
  PF.setPickFight = set;
  PF.pickFightNames = function () { return names(get() || []); };
  PF.pickFightOptions = function () { return AREAS.slice(); };

  var PRIVACY_COPY = "Only used to personalize your feed — suggested posters, " +
    "missions, bills, and ally orgs. Never public, never on leaderboards, never shared.";

  /* Checkbox grid HTML, shared by the claim box and the settings widget.
     prefix disambiguates element ids. */
  function gridHtml(selected, prefix) {
    var h = '<div role="group" aria-label="Pick your fights" style="display:grid;' +
      'grid-template-columns:1fr 1fr;gap:6px;margin:8px 0;">';
    for (var i = 0; i < AREAS.length; i++) {
      var id = prefix + "-" + AREAS[i][0];
      var on = selected && selected.indexOf(AREAS[i][0]) !== -1;
      h += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;' +
        'color:#d8cdb4;background:#0d0d0d;border:1px solid #3a2f1d;padding:8px;' +
        'min-height:44px;cursor:pointer;">' +
        '<input type="checkbox" class="pf-fight-cb" data-fid="' + esc(AREAS[i][0]) + '"' +
        (on ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#c1121f;">' +
        esc(AREAS[i][1]) + '</label>';
    }
    h += '</div>';
    return h;
  }

  function readGrid(container) {
    var boxes = container.querySelectorAll(".pf-fight-cb"), out = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) out.push(boxes[i].getAttribute("data-fid"));
    }
    return out;
  }

  /* Enforce the max-3 cap live: uncheck beyond MAX with a notice. */
  function capNotice(scope) {
    return scope.querySelector(".pf-fight-cap");
  }
  function wireCap(container) {
    var boxes = container.querySelectorAll(".pf-fight-cb");
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].addEventListener("change", function () {
        var checked = container.querySelectorAll(".pf-fight-cb:checked");
        var cap = capNotice(container);
        if (checked.length > MAX) {
          this.checked = false;
          if (cap) { cap.textContent = "Pick up to 3 fights."; cap.style.display = "block"; }
        } else if (cap) { cap.style.display = "none"; }
      });
    }
  }

  /* Populate the claim-flow picker (rendered by daily-orders.js claim box).
     Retry-bounded: the orders template mounts after this bundle runs. */
  var claimTries = 0;
  function wireClaimPicker() {
    var wrap = document.getElementById("oPickFight");
    if (!wrap) {
      if (++claimTries < 40) setTimeout(wireClaimPicker, 250);
      return;
    }
    if (wrap.getAttribute("data-wired")) return;
    wrap.setAttribute("data-wired", "1");
    var cur = get();
    wrap.innerHTML =
      '<div style="font-size:12px;color:#b8ab8e;margin:8px 0 0;">Pick your fights ' +
      '<span style="opacity:.7;">(up to 3 — personalizes posters, missions &amp; bills)</span></div>' +
      gridHtml(cur === null ? [] : cur, "oF") +
      '<div class="pf-fight-cap" style="display:none;font-size:11px;color:#e8b923;margin:-4px 0 4px;"></div>' +
      '<button type="button" id="oFightSkip" style="background:none;border:0;color:#e8b923;' +
      'cursor:pointer;font-size:12px;text-decoration:underline;padding:4px 8px;min-height:44px;">' +
      'Surprise me — skip this</button>' +
      '<div style="font-size:11px;color:#8a7f68;margin:2px 0 8px;">' + esc(PRIVACY_COPY) + '</div>';
    wireCap(wrap);
    var skip = document.getElementById("oFightSkip");
    if (skip) skip.onclick = function () {
      var boxes = wrap.querySelectorAll(".pf-fight-cb");
      for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
      var cap = capNotice(wrap); if (cap) cap.style.display = "none";
    };
  }

  /* Settings widget — changeable later, not a one-way door. Mounts right
     after the home-state settings widget when present (step two follows
     step one), otherwise after the claim area or into the PF holder. */
  function renderSettings() {
    var mount = document.getElementById("pfPickFightMount");
    if (!mount) {
      var anchor = document.getElementById("pfHomeStateMount") ||
                   document.getElementById("oClaimWrap");
      if (anchor && anchor.parentNode) {
        mount = document.createElement("div");
        mount.id = "pfPickFightMount";
        anchor.parentNode.insertBefore(mount, anchor.nextSibling);
      } else if (PF.holder) {
        try {
          mount = document.createElement("div");
          mount.id = "pfPickFightMount";
          PF.holder().appendChild(mount);
        } catch (e) { return; }
      } else return;
    }
    var cur = get();
    mount.innerHTML =
      '<div class="pf-wrap" style="margin:10px 0;padding:10px 12px;border:1px solid #3a2f1d;' +
      'background:#141007;font-family:Arial,sans-serif;max-width:420px;">' +
      '<div style="font-size:11px;letter-spacing:2px;color:#e8b923;font-weight:700;">MY FIGHTS</div>' +
      '<div style="margin:6px 0;font-size:14px;color:#f5f0e1;">' +
      '<span id="pfFightCurrent">' + esc(displayName(cur)) + '</span> ' +
      '<button id="pfFightChange" style="background:none;border:0;color:#e8b923;cursor:pointer;' +
      'font-size:12px;text-decoration:underline;padding:4px 8px;min-height:44px;">change</button></div>' +
      '<div id="pfFightPicker" style="display:none;margin-top:6px;">' +
      gridHtml(cur === null ? [] : cur, "pfF") +
      '<div class="pf-fight-cap" style="display:none;font-size:11px;color:#e8b923;margin:-4px 0 4px;"></div>' +
      '<div style="margin-top:8px;"><button id="pfFightSave" style="background:#c1121f;color:#fff;' +
      'border:0;font-weight:700;padding:10px 18px;min-height:44px;cursor:pointer;">Save</button> ' +
      '<button id="pfFightClear" style="background:none;border:1px solid #6b5f45;color:#d8cdb4;' +
      'padding:10px 14px;min-height:44px;cursor:pointer;">Clear filter</button> ' +
      '<span id="pfFightSaved" style="font-size:12px;color:#9db89a;margin-left:8px;"></span></div>' +
      '<div style="font-size:11px;color:#8a7f68;margin-top:8px;">' + esc(PRIVACY_COPY) + '</div>' +
      '</div></div>';
    wireCap(mount);
    var chg = document.getElementById("pfFightChange"),
        pkr = document.getElementById("pfFightPicker"),
        sv = document.getElementById("pfFightSave"),
        clr = document.getElementById("pfFightClear"),
        ok = document.getElementById("pfFightSaved");
    if (chg && pkr) chg.onclick = function () {
      pkr.style.display = pkr.style.display === "none" ? "block" : "none";
    };
    if (sv) sv.onclick = function () {
      if (set(readGrid(mount))) {
        if (ok) ok.textContent = "Saved.";
        pkr.style.display = "none";
      }
    };
    if (clr) clr.onclick = function () {
      if (set([])) {
        if (ok) ok.textContent = "Cleared — showing everything.";
        pkr.style.display = "none";
      }
    };
  }

  /* Keep the settings widget in sync when the claim flow saves fights. */
  try {
    document.addEventListener('pf-pick-fight-changed', function () { renderSettings(); });
  } catch (e) {}

  wireClaimPicker();
  /* Settings mount may arrive late (template mount order) — bounded retry. */
  var setTries = 0;
  (function wireSettings() {
    if (!document.getElementById("pfPickFightMount") &&
        !document.getElementById("pfHomeStateMount") &&
        !document.getElementById("oClaimWrap") && !(PF.holder && PF.holder())) {
      if (++setTries < 40) { setTimeout(wireSettings, 250); return; }
    }
    renderSettings();
  })();
})();
