/* ============================================================================
   SILO: command/02-registry.js  |  PF v1.4.3 — Command Dashboard registry
   WHAT: the plug-in contract the other dashboard branches build against.
     NS.registerTile({id, label, auth, priority, fetch, render,
                      skeleton, loggedOut})   -> slot: tiles grid
     NS.registerCTA({id, render})              -> CTA slot
     NS.registerFront({id, render})            -> fronts section
     NS.registerRiver({id, render})            -> river section
   Tile lifecycle: skeleton -> whenVisible (staggered) -> auth gate ->
     fetch() returns {action, params} (existing backend actions ONLY —
     no new endpoints) -> NS.jsonp (cap 6, 12s fail-soft) ->
     render(card, data) | error card with RETRY (never breaks neighbors).
   RECRUIT MODE: when fewer than 3 tiles have data after the first settle,
     the tiles grid renders the first-mission sequence instead:
     claim callsign -> check in -> join cell / quiz (deep links to the
     existing homepage, /cells, /arcade — no new endpoints, no XP grants).
   KILL: inherits the shell kill (?pf_off=command).
   ============================================================================ */
(function () {
  'use strict';
  var NS = window.PFCommand || (window.PFCommand = {});
  var shell = NS._shell;

  var tiles = [], ctas = [], fronts = [], river = [];
  NS.registerTile = function (def) { if (def && def.id) { tiles.push(def); mountLate('tiles', def); } };
  NS.registerCTA = function (def) { if (def && def.id) { ctas.push(def); mountLate('cta', def); } };
  NS.registerFront = function (def) { if (def && def.id) { fronts.push(def); mountLate('fronts', def); } };
  NS.registerRiver = function (def) { if (def && def.id) { river.push(def); mountLate('river', def); } };

  var booted = false;
  var wrapEl = null, slotEls = {};
  var pendingTiles = 0, tilesWithData = 0, recruitChecked = false;
  NS._tilesWithData = function () { return tilesWithData; };
  NS._pendingTiles = function () { return pendingTiles; };

  function firstChildByClass(root, cls) {
    var kids = root.children || [];
    for (var i = 0; i < kids.length; i++) {
      if ((' ' + (kids[i].className || '') + ' ').indexOf(' ' + cls + ' ') !== -1) return kids[i];
    }
    return null;
  }

  /* ---------- callsign card ---------- */
  function renderCallsignCard(root) {
    var card = firstChildByClass(wrapEl, 'pfc-callsign');
    if (!card) return;
    var cs = NS.callsign();
    if (cs) {
      card.innerHTML =
        '<div class="pfc-cs-name">' + NS.esc(cs) + '</div>' +
        '<div class="pfc-cs-data">XP TODAY: <span class="pfc-xp">···</span> // ' +
        'STATUS: <span class="pfc-status">ONLINE</span></div>';
      NS.jsonp('xp_today', { callsign: cs }).then(function (res) {
        try {
          var v = (res.ok && res.data && typeof res.data.xp_today === 'number')
            ? String(Math.floor(res.data.xp_today)) : '—';
          card.innerHTML =
            '<div class="pfc-cs-name">' + NS.esc(cs) + '</div>' +
            '<div class="pfc-cs-data">XP TODAY: <span class="pfc-xp">' + NS.esc(v) +
            '</span> // STATUS: <span class="pfc-status">ONLINE</span></div>';
        } catch (e) {}
      });
    } else {
      card.innerHTML =
        '<div class="pfc-cs-name">UNENLISTED</div>' +
        '<div class="pfc-cs-data">STATUS: <span class="pfc-status">RECRUIT</span> // ' +
        'CLAIM A CALLSIGN TO LIGHT UP THIS DECK</div>';
    }
  }

  /* ---------- tiles ---------- */
  function defaultSkeleton(card, def) {
    card.innerHTML =
      '<div class="pfc-tile-title">' + NS.esc(def.label || def.id) + '</div>' +
      '<div class="pfc-tile-body">ESTABLISHING UPLINK···</div>';
  }

  function renderLocked(card, def) {
    card.className = 'pfc-tile pfc-tile-locked';
    if (typeof def.loggedOut === 'function') { try { def.loggedOut(card); return; } catch (e) {} }
    card.innerHTML =
      '<div class="pfc-tile-title">' + NS.esc(def.label || def.id) + '</div>' +
      '<div class="pfc-tile-body">ENLIST TO UNLOCK — <a href="/" style="color:#f5a623">CLAIM CALLSIGN</a></div>';
  }

  function renderError(card, def, err) {
    card.className = 'pfc-tile pfc-tile-error';
    card.innerHTML =
      '<div class="pfc-tile-title">' + NS.esc(def.label || def.id) + '</div>' +
      '<div class="pfc-tile-body">SIGNAL LOST (' + NS.esc(err || 'fetch-failed') + ')</div>' +
      '<button type="button" class="pfc-retry">RETRY</button>';
    try {
      var btn = card.children[card.children.length - 1];
      if (btn && btn.addEventListener) btn.addEventListener('click', function () { startTile(card, def, true); });
    } catch (e) {}
  }

  function startTile(card, def, retry) {
    card.className = 'pfc-tile pfc-tile-loading';
    if (def.auth && !NS.callsign()) { renderLocked(card, def); settleTile(false); return; }
    var spec = null;
    try { spec = (typeof def.fetch === 'function') ? def.fetch() : null; } catch (e) { spec = null; }
    if (!spec || !spec.action) { renderError(card, def, 'no-action'); settleTile(false); return; }
    NS.jsonp(spec.action, spec.params || {}).then(function (res) {
      if (res && res.ok) {
        try {
          card.className = 'pfc-tile';
          def.render(card, res.data);
          settleTile(true);
        } catch (e) { NS.log('tile:' + def.id, e); renderError(card, def, 'render-error'); settleTile(false); }
      } else {
        renderError(card, def, res && res.error);
        settleTile(false);
      }
    });
  }

  function mountTile(def) {
    var grid = slotEls.tiles;
    if (!grid) return;
    var card = NS.el('div', 'pfc-tile pfc-tile-loading');
    try {
      if (typeof def.skeleton === 'function') def.skeleton(card);
      else defaultSkeleton(card, def);
    } catch (e) { defaultSkeleton(card, def); }
    grid.appendChild(card);
    pendingTiles++;
    NS.whenVisible(card, function () { startTile(card, def, false); });
  }

  function settleTile(hadData) {
    if (hadData) tilesWithData++;
    pendingTiles--;
    if (pendingTiles <= 0 && !recruitChecked) {
      recruitChecked = true;
      maybeRecruitMode();
    }
  }

  /* ---------- recruit mode ---------- */
  function maybeRecruitMode() {
    var grid = slotEls.tiles;
    if (!grid || tilesWithData >= 3) return;
    grid.innerHTML = '';
    var seq = NS.el('div', 'pfc-recruit');
    seq.innerHTML =
      '<div class="pfc-mission">' +
        '<div class="pfc-m-num">MISSION 01 // IDENTITY</div>' +
        '<h3>Claim your callsign</h3>' +
        '<p>Every operative needs a name. Enlist on the homepage and your command deck lights up.</p>' +
        '<div class="pfc-m-links"><a class="pfc-btn" href="/">Enlist →</a></div>' +
      '</div>' +
      '<div class="pfc-mission">' +
        '<div class="pfc-m-num">MISSION 02 // DUTY</div>' +
        '<h3>Check in</h3>' +
        '<p>Report for duty with Daily Orders. One check-in a day keeps your streak — and your rank — alive.</p>' +
        '<div class="pfc-m-links"><a class="pfc-btn" href="/">Daily Orders →</a></div>' +
      '</div>' +
      '<div class="pfc-mission">' +
        '<div class="pfc-m-num">MISSION 03 // DEPLOY</div>' +
        '<h3>Join the fight</h3>' +
        '<p>Link up with a cell for coordinated ops, or take the quiz to find your propagandist archetype.</p>' +
        '<div class="pfc-m-links">' +
          '<a class="pfc-btn" href="/cells">Join a cell →</a>' +
          '<a class="pfc-btn pfc-btn-ghost" href="/arcade">Take the quiz →</a>' +
        '</div>' +
      '</div>';
    grid.appendChild(seq);
  }

  /* ---------- other slots ---------- */
  function mountSimple(slot, def) {
    var host = slotEls[slot];
    if (!host) return;
    var box = NS.el('div', 'pfc-' + slot + '-item');
    host.appendChild(box);
    NS.whenVisible(box, function () {
      try { def.render(box); } catch (e) { NS.log(slot + ':' + def.id, e); }
    });
  }

  function mountLate(slot, def) {
    /* Registrations that arrive after boot (later script bundles) mount on
       the fly instead of being dropped. */
    if (!booted) return;
    try {
      if (slot === 'tiles') mountTile(def);
      else mountSimple(slot, def);
    } catch (e) { NS.log('mountLate:' + slot, e); }
  }

  /* ---------- boot ---------- */
  function boot() {
    if (booted) return;
    /* Kill switch: hide the whole mount, do zero work, throw zero errors. */
    if (shell.pfOff() || shell.isEditor()) {
      var m = shell.mountRoot();
      if (m) { try { m.innerHTML = ''; m.style.display = 'none'; } catch (e) {} }
      return;
    }
    var root = shell.mountRoot();
    if (!root) return;
    try {
      shell.injectTheme(root);
      wrapEl = shell.buildSkeleton(root);
      var kids = wrapEl.children || [];
      slotEls = {
        callsign: firstChildByClass(wrapEl, 'pfc-callsign'),
        tiles: firstChildByClass(wrapEl, 'pfc-tiles'),
        cta: firstChildByClass(wrapEl, 'pfc-cta'),
        fronts: firstChildByClass(wrapEl, 'pfc-fronts'),
        river: firstChildByClass(wrapEl, 'pfc-river')
      };
      booted = true;
      renderCallsignCard(root);
      /* Tiles first (priority order), then CTA / fronts / river. */
      var ordered = tiles.slice().sort(function (a, b) {
        return (a.priority || 99) - (b.priority || 99);
      });
      ordered.forEach(mountTile);
      ctas.forEach(function (d) { mountSimple('cta', d); });
      fronts.forEach(function (d) { mountSimple('fronts', d); });
      river.forEach(function (d) { mountSimple('river', d); });
      /* No tiles registered yet (branches 2-5 not merged) → run the recruit
         check on the next tick so recruit mode renders by default. */
      if (pendingTiles === 0 && !recruitChecked) {
        setTimeout(function () {
          if (!recruitChecked && pendingTiles === 0) { recruitChecked = true; maybeRecruitMode(); }
        }, 0);
      }
    } catch (e) { NS.log('boot', e); }
  }

  NS.boot = boot;

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch (e) { /* never throw at load time */ }
})();
