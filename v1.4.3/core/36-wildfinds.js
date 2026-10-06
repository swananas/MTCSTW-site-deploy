/* core/36-wildfinds.js  |  PF v1.4.3 | WILD FINDS type registry.
   CEO directive 2026-10-06: the wild-find types are FOLDED INTO the bounty
   type taxonomy — not a separate series. One source of truth, read by every
   user-prompt surface: the bounty board, the share-in photo picker, Daily
   Orders missions, and [data-pf-wildfind] launchers.

   PF.wildFinds:
     TYPES            bundled mirror of the backend WILDFIND_TYPES registry
     all()            array of {key,label,icon,prompt,hint,safety[]}
     get(key)         one type or null
     subtypeFromTargetKey(tk)  'street_art:downtown' -> 'street_art'
     missions()       3 rotating Daily-Orders missions from the registry
     safetyHTML(key)  global + per-type safety rules as HTML list
     openTypePicker(onPick)  modal type grid; onPick(key)
     refresh()        pull backend wildfind_types (public GET); backend wins
                      on key conflicts. Fail-open: bundled copy stands.
   Backend is canonical. Bundled copy is the fail-open fallback.
   ZERO XP: types pay the standard photo_evidence bounty XP — no new
   mechanics, no new amounts. Every string through esc().
   KILL: ?pf_off=wildfinds  or  localStorage pf_disabled_v1='["wildfinds"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wildfinds') || window.pfWildFindsDone) return;
  window.pfWildFindsDone = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Bundled mirror of backend WILDFIND_TYPES (2026-10-06). Keys MUST match
     the backend PHOTO_SUBTYPES exactly. Backend refresh() overrides. */
  var TYPES = {
    protest: { label: 'PROTEST SIGNS', icon: '\u270a',
      prompt: "That sign at the march that made you laugh out loud? Photograph it. The streets are writing our propaganda for us.",
      hint: 'Marches, rallies, demonstrations — the sharper the sign, the better.', safety: [] },
    street_art: { label: 'STREET ART', icon: '\uD83C\uDFA8',
      prompt: "Leftist street art in general. Murals, wheatpastes, stencils, graffiti with something to say — if it hits, shoot it.",
      hint: 'Walls, underpasses, alley pieces — art that fights back.', safety: [] },
    sticker: { label: 'STICKER SLAPS', icon: '\uD83D\uDCCC',
      prompt: "Leftist stickers in the wild. Mark the territory, document the territory.",
      hint: 'Lamp posts, bathroom stalls, skate parks — slaps with a message.', safety: [] },
    price_tag: { label: 'PRICE TAG PROOF', icon: '\uD83E\uDDFE',
      prompt: "The robbery, priced. Shrinkflation, $9 eggs, surge-priced basics — tag it.",
      hint: 'Shelf tags, receipts, menus — the number is the evidence.', safety: [] },
    landlord: { label: 'LANDLORD SPECIAL', icon: '\uD83C\uDFE0',
      prompt: "Absurd rent listings, eviction notices, luxury condos next to tents. Name the greed.",
      hint: 'Listings, notices, for-rent signs with insulting numbers.', safety: [] },
    mutual_aid: { label: 'MUTUAL AID SIGHTING', icon: '\u2764\uFE0F',
      prompt: "Community fridges, free pantries, blessing boxes. Photograph the world we're building.",
      hint: 'Fridges, pantries, free stores — the good stuff, documented.', safety: [] },
    union: { label: 'UNION YES', icon: '\uD83D\uDC6F',
      prompt: "Picket lines, strike signs, union stickers on hard hats. Labor's receipts.",
      hint: "Picket lines, strike HQ, union halls — the working class, organized.", safety: [] },
    billboard: { label: 'BILLBOARD LIES', icon: '\uD83D\uDCE2',
      prompt: "Corporate billboards photographed next to the reality they hide. Juxtapose them.",
      hint: 'The ad and the truth in one frame — irony welcome.', safety: [] },
    food_desert: { label: 'FOOD DESERT PROOF', icon: '\uD83C\uDFDC\uFE0F',
      prompt: "Three dollar stores, zero groceries. Show the map.",
      hint: 'Dollar stores, shuttered groceries, the distance between them.', safety: [] },
    marquee: { label: 'UNHINGED MARQUEES', icon: '\u26EA',
      prompt: "Church signs and marquees saying the quiet part loud. Read the room.",
      hint: 'Church boards, business marquees, hand-lettered absurdity.', safety: [] },
    ice_watch: { label: 'NO ICE', icon: '\uD83E\uDDCA',
      prompt: "Document ICE activity from a safe distance. \"I'll have a glass of humanity — with no ICE, please.\"",
      hint: 'Sightings only — never confront, never follow.',
      safety: ['Film from a safe distance. Do not follow vehicles or agents.',
        'Do not post names, badge numbers, license plates, or any identifiable face — agents or bystanders.',
        'Never interfere with law enforcement or emergency responders. Observing from public space is your right; obstructing is not.'] },
    event: { label: 'EVENT PROOF', icon: '\uD83D\uDCF8',
      prompt: "You were there. Prove it — the movement's receipts are its people.",
      hint: 'Rallies, town halls, actions — crowd shots, not single faces.', safety: [] },
    community: { label: 'COMMUNITY ACTION', icon: '\u270C\uFE0F',
      prompt: "Your cell in motion. Cleanups, food drives, canvassing — show the work.",
      hint: 'Actions your cell ran or joined. Faces only with consent.', safety: [] },
    evidence: { label: 'ON-THE-GROUND EVIDENCE', icon: '\uD83D\uDD0D',
      prompt: "Something happened and you saw it. Document it like it matters — it does.",
      hint: 'Damage, closures, confrontations, aftermath — the record.', safety: [] }
  };
  var SAFETY = [
    'Stay in public space. No trespassing, no climbing, no blocked roads.',
    'No identifiable faces of private people. Crowd shots are fine; single faces are not.',
    'If it puts you or anyone at risk, walk away. No photo is worth it.'
  ];

  function all() {
    return Object.keys(TYPES).map(function (k) {
      var t = TYPES[k];
      return { key: k, label: t.label, icon: t.icon, prompt: t.prompt, hint: t.hint, safety: t.safety || [] };
    });
  }
  function get(k) { return TYPES[k] ? { key: k, label: TYPES[k].label, icon: TYPES[k].icon, prompt: TYPES[k].prompt, hint: TYPES[k].hint, safety: TYPES[k].safety || [] } : null; }
  function subtypeFromTargetKey(tk) {
    var t = String(tk || ''), i = t.indexOf(':');
    var sub = i > 0 ? t.slice(0, i) : '';
    return TYPES[sub] ? sub : '';
  }
  function safetyFor(key) {
    var t = TYPES[key];
    return SAFETY.concat((t && t.safety) || []);
  }
  function safetyHTML(key) {
    return '<ul class="pf-wf-safety">' + safetyFor(key).map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('') + '</ul>';
  }
  /* Daily Orders missions: 3 rotating wild-find photo missions. */
  function missions() {
    var keys = Object.keys(TYPES);
    var d = new Date(), start = new Date(d.getFullYear(), 0, 0);
    var doy = Math.floor((d - start) / 864e5);
    var out = [];
    for (var i = 0; i < 3; i++) {
      var k = keys[(doy * 3 + i) % keys.length];
      var t = TYPES[k];
      out.push({
        t: 'WILD FIND — ' + t.prompt + ' Snap it, then claim the photo bounty on the bounty board.',
        wf: k
      });
    }
    return out;
  }

  /* Backend refresh: the backend registry is canonical. */
  var refreshed = false;
  function refresh(cb) {
    if (refreshed) { if (cb) cb(true); return; }
    refreshed = true;
    try {
      var BACKEND = window.PF_BACKEND_URL;
      if (!BACKEND) { if (cb) cb(false); return; }
      var fn = 'pfWfCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function finish(ok, j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        if (ok && j && j.ok && j.types) {
          Object.keys(j.types).forEach(function (k) {
            if (TYPES[k]) {
              var b = j.types[k];
              if (b.label) TYPES[k].label = String(b.label).slice(0, 64);
              if (b.prompt) TYPES[k].prompt = String(b.prompt).slice(0, 500);
              if (b.hint) TYPES[k].hint = String(b.hint).slice(0, 200);
              if (Array.isArray(b.safety)) TYPES[k].safety = b.safety.map(function (x) { return String(x).slice(0, 300); }).slice(0, 8);
            }
          });
          if (Array.isArray(j.safety) && j.safety.length) {
            SAFETY = j.safety.map(function (x) { return String(x).slice(0, 300); }).slice(0, 8);
          }
        }
        if (cb) cb(!!(ok && j && j.ok));
      }
      window[fn] = function (j) { finish(true, j); };
      s.onerror = function () { finish(false); };
      s.src = BACKEND + '?action=wildfind_types&callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { finish(false); }, 10000);
    } catch (e) { if (cb) cb(false); }
  }

  /* Shared type-picker modal. onPick(key). */
  function openTypePicker(onPick) {
    try {
      closePicker();
      var ov = document.createElement('div');
      ov.className = 'pf-wf-picker';
      ov.id = 'pf-wf-picker';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-label', 'Pick what you found');
      var h = '<div class="pf-wf-box"><div class="pf-wf-x" data-wf-x>&times;</div>' +
        '<h3>WHAT DID YOU FIND IN THE WILD?</h3>' +
        '<p class="pf-wf-sub">Pick the type. Your photo becomes movement action — shares, evidence, price data. Never sold, never ad inventory.</p>' +
        '<div class="pf-wf-grid">';
      all().forEach(function (t) {
        h += '<button type="button" class="pf-wf-card" data-wf-key="' + esc(t.key) + '">' +
          '<span class="pf-wf-ico">' + esc(t.icon) + '</span>' +
          '<span class="pf-wf-label">' + esc(t.label) + '</span>' +
          '<span class="pf-wf-hint">' + esc(t.hint) + '</span></button>';
      });
      h += '</div>' + safetyHTML('') +
        '<p class="pf-wf-note">Confirming a type means you attest the safety rules above. Ineligible photos are rejected with an explanation.</p></div>';
      ov.innerHTML = h;
      ov.addEventListener('click', function (ev) {
        var x = ev.target.closest ? ev.target.closest('[data-wf-x]') : null;
        if (x || ev.target === ov) { closePicker(); return; }
        var c = ev.target.closest ? ev.target.closest('[data-wf-key]') : null;
        if (c) {
          var k = c.getAttribute('data-wf-key');
          closePicker();
          if (onPick) { try { onPick(k); } catch (e) {} }
        }
      });
      document.body.appendChild(ov);
    } catch (e) {}
  }
  function closePicker() {
    try { var p = document.getElementById('pf-wf-picker'); if (p && p.parentNode) p.parentNode.removeChild(p); } catch (e) {}
  }

  /* Declarative launcher: <button data-pf-wildfind>FIND IT IN THE WILD</button> */
  function routeToBoard(key) {
    try {
      var host = document.getElementById('pf-data-bounties');
      if (host) {
        try {
          var url = new URL(window.location.href);
          url.hash = 'wf=' + encodeURIComponent(key);
          window.history.replaceState(null, '', url.toString());
        } catch (e) {}
        if (host.scrollIntoView) host.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { if (PF.toast) PF.toast('Bounty board — find the ' + (TYPES[key] ? TYPES[key].label : 'photo') + ' bounty and claim it.'); } catch (e) {}
        return;
      }
      window.location.href = '/create#wf=' + encodeURIComponent(key);
    } catch (e) {}
  }
  function wireLaunchers(root) {
    try {
      (root || document).querySelectorAll('[data-pf-wildfind]').forEach(function (el) {
        if (el._pfWfWired) return;
        el._pfWfWired = true;
        el.addEventListener('click', function () {
          openTypePicker(function (key) { routeToBoard(key); });
        });
      });
    } catch (e) {}
  }

  /* Minimal CSS (namespaced, additive). */
  var cssDone = false;
  function ensureCss() {
    if (cssDone) return;
    cssDone = true;
    try {
      var st = document.createElement('style');
      st.textContent =
        '.pf-wf-picker{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:99990;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:5vh 12px;}' +
        '.pf-wf-box{position:relative;background:#111;border:2px solid #d4af37;max-width:640px;width:100%;padding:22px;color:#f5ead6;font-family:inherit;}' +
        '.pf-wf-x{position:absolute;top:8px;right:12px;font-size:26px;cursor:pointer;color:#8a7f68;}' +
        '.pf-wf-box h3{margin:0 0 6px;color:#d4af37;letter-spacing:.06em;font-size:18px;}' +
        '.pf-wf-sub{font-size:13px;color:#b8ab8e;margin:0 0 14px;}' +
        '.pf-wf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px;}' +
        '.pf-wf-card{background:#1a1a1a;border:1px solid #6b5f45;color:#f5ead6;padding:10px;cursor:pointer;text-align:left;font-family:inherit;}' +
        '.pf-wf-card:hover{border-color:#d4af37;}' +
        '.pf-wf-ico{font-size:22px;display:block;margin-bottom:4px;}' +
        '.pf-wf-label{display:block;font-size:12px;font-weight:700;letter-spacing:.05em;color:#d4af37;margin-bottom:4px;}' +
        '.pf-wf-hint{display:block;font-size:11px;color:#8a7f68;line-height:1.35;}' +
        '.pf-wf-safety{font-size:11px;color:#b8ab8e;margin:0 0 8px;padding-left:18px;line-height:1.5;}' +
        '.pf-wf-note{font-size:11px;color:#8a7f68;margin:0;}' +
        '.pf-wf-strip{display:flex;gap:8px;overflow-x:auto;padding:10px 0;margin:6px 0;}' +
        '.pf-wf-type{flex:0 0 auto;background:#141414;border:1px solid #6b5f45;color:#f5ead6;padding:8px 10px;font-size:11px;cursor:pointer;font-family:inherit;max-width:190px;text-align:left;}' +
        '.pf-wf-type:hover{border-color:#d4af37;}' +
        '.pf-wf-type b{display:block;color:#d4af37;font-size:11px;letter-spacing:.05em;margin-bottom:3px;}' +
        '.pf-wf-type span{color:#8a7f68;line-height:1.35;}';
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Horizontal "WHAT WE'RE LOOKING FOR" strip for the bounty board. */
  function typeStripHTML() {
    var h = '<div class="pf-wf-stripwrap"><div class="pf-wf-striphead">WHAT WE\'RE LOOKING FOR</div><div class="pf-wf-strip">';
    all().forEach(function (t) {
      h += '<button type="button" class="pf-wf-type" data-wf-key="' + esc(t.key) + '">' +
        '<b>' + esc(t.icon + ' ' + t.label) + '</b><span>' + esc(t.prompt) + '</span></button>';
    });
    return h + '</div></div>';
  }

  PF.wildFinds = {
    TYPES: TYPES,
    all: all,
    get: get,
    subtypeFromTargetKey: subtypeFromTargetKey,
    safetyFor: safetyFor,
    safetyHTML: safetyHTML,
    missions: missions,
    openTypePicker: openTypePicker,
    closePicker: closePicker,
    routeToBoard: routeToBoard,
    typeStripHTML: typeStripHTML,
    refresh: refresh
  };

  try {
    ensureCss();
    wireLaunchers(document);
    if (window.MutationObserver) {
      new MutationObserver(function () { wireLaunchers(document); })
        .observe(document.documentElement, { childList: true, subtree: true });
    }
    /* Refresh the registry shortly after load; fail-open. */
    setTimeout(function () { try { refresh(); } catch (e) {} }, 2500);
  } catch (e) {}
})();
