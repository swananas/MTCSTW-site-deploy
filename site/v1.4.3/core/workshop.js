/* core/workshop.js  |  PF v1.4.3 | THE WORKSHOP SHELL — /create unification.
   /create becomes one consistent workshop: one shared header + tool rail,
   ONE active tool mounted at a time, tools lazy-mount on first open,
   consistent open/run/close, hash deep-links (#pf-tool=<tool-id>).

   ADAPTER, NOT REWRITE: existing tools keep their files and internals. Thin
   adapters (pages/workshop-create.js) register each tool via PFWorkshop.register;
   the shell is chrome + mounting only. Two mount flavors:
     - template tools: the shell clones the tool's staged <template id="pf-ov-*">
       into the active pane and execs its inner scripts (page-mount.js's
       approach). Truly lazy: nothing renders until first open.
     - self-mount tools (academy, creator-assist, ammo, forged-tray): their
       IIFEs run at bundle load and need a host div to exist. The shell
       pre-creates each host div in a hidden dock at boot (only when the tool
       isn't killed), so the module mounts silently into the dock instead of
       firing its missing-anchor fallbacks; opening the tool relocates the
       rendered node into the active pane (moving a node preserves listeners —
       same technique as page-mount.js mountSelf). Closing parks it back.

   CONTRACT:
     PFWorkshop.register({ id, title, tagline, templateId|null, selfMount|null, kill, mount })
       Additive registry — never reassignment; duplicate ids are rejected.
       `kill` is the tool's ?pf_off id; killed tools never register.
     PFWorkshop.open(id) / PFWorkshop.close() — one active tool; close returns
       to the tool rail. Back button + Escape close the active tool.
     PFWorkshop.route() — read the initial URL (#pf-tool=<id>, ?for=<slug>)
       and open the matching tool. Called once by the adapters file after
       registration.

   KILL: ?pf_off=workshop  or  localStorage pf_disabled_v1='["workshop"]'
     The shell never boots; page-mount.js falls back to the legacy stacked
     layout (the regression path). window.pfWorkshopClaimed is the claim flag
     page-mount checks — if this file loads but fails before claiming, the
     legacy layout still runs.
   XP: none. This file grants no XP and changes no tool behavior. */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.PFWorkshop) return; /* additive facade: never reassign */
  if (!PF) return;
  /* Master kill: never boot; legacy stacked layout owns /create. */
  if (PF.skip('workshop')) return;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }
  if (isEditor()) return;

  /* The shell owns /create only. Everywhere else (Creator HQ, homepage,
     catalog pages) the tool modules keep their existing mount behavior. */
  var host = document.getElementById('pf-create');
  if (!host) return;

  function err(msg, e) {
    if (PF) PF.error('workshop', msg + ' :: ' + (e && e.message || e));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ============ chrome ============ */
  var CSS =
    '.pf-ws-rail{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));' +
    'gap:10px;margin:0 0 18px}' +
    '.pf-ws-tab{display:block;text-align:left;background:#141414;border:2px solid #3a3a3a;' +
    'border-radius:3px;padding:14px 14px 12px;cursor:pointer;color:#f5ead6;' +
    'font-family:Arial,sans-serif;min-height:44px}' +
    '.pf-ws-tab:hover{border-color:#c1121f}' +
    '.pf-ws-tab[aria-current="true"]{border-color:#c1121f;background:#1d0d0d;' +
    'box-shadow:0 0 0 1px #c1121f}' +
    '.pf-ws-tab-t{display:block;font-family:"Arial Black",Arial,sans-serif;font-size:14px;' +
    'letter-spacing:2px;color:#f5ead6;margin-bottom:6px}' +
    '.pf-ws-tab[aria-current="true"] .pf-ws-tab-t{color:#e8b923}' +
    '.pf-ws-tab-s{display:block;font-size:12.5px;line-height:1.45;color:#a89e88}' +
    '.pf-ws-stagebar{margin:0 0 12px}' +
    '.pf-ws-back{background:transparent;border:2px solid #c1121f;color:#f5ead6;' +
    'font:bold 13px Arial,sans-serif;letter-spacing:2px;padding:10px 18px;' +
    'cursor:pointer;border-radius:3px;min-height:44px}' +
    '.pf-ws-back:hover{background:#c1121f;color:#fff}' +
    '.pf-ws-tool{margin:0 0 8px}' +
    /* TERMINAL STATE block (spec section 4b): identical visual spec to the
       page-mount top-level catch — red border, dark band, cream text. */
    '.pf-ws-err{border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;' +
    'padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px}' +
    '.pf-ws-err button{background:#c1121f;color:#fff;border:0;font-weight:700;' +
    'padding:8px 14px;cursor:pointer;margin-top:8px;min-height:44px}' +
    /* Empty state (spec section 4c): cream/gold on dark, no red border. */
    '.pf-ws-empty{border:2px solid #6b5f3a;background:#141414;color:#f5ead6;' +
    'padding:16px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5}' +
    '.pf-ws-empty .pf-ws-empty-t{color:#e8b923;font-weight:800;letter-spacing:2px;' +
    'margin-bottom:8px}' +
    '.pf-ws-empty button{background:#c1121f;color:#fff;border:0;font-weight:700;' +
    'padding:10px 18px;cursor:pointer;margin-top:10px;min-height:44px;' +
    'font-family:Arial,sans-serif;letter-spacing:1px}';
  try {
    var style = document.createElement('style');
    style.setAttribute('data-pf-ws', '1');
    style.textContent = CSS;
    document.head.appendChild(style);
  } catch (e) { err('css inject failed', e); }

  /* Shared page header — same block pattern as page-mount.js mountHeader
     (kicker + title + rule + sub on the dark band), so /create keeps its
     header while the shell owns the page. */
  function buildHeader() {
    if (host.querySelector(':scope > .pf-page-head')) return;
    var head = document.createElement('div');
    head.className = 'pf-page-head';
    head.style.cssText = 'text-align:center;margin:80px auto 22px;max-width:720px;font-family:Arial,sans-serif;' +
      'background:linear-gradient(180deg,#141414 0%,#0b0b0b 100%);' +
      'border:1px solid #333;border-top:4px solid #c1121f;border-bottom:4px solid #c1121f;' +
      'padding:24px 18px 20px;box-sizing:border-box;border-radius:3px;';
    var kicker = document.createElement('div');
    kicker.style.cssText = 'font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;';
    kicker.textContent = 'MTCSTW.COM';
    var title = document.createElement('div');
    title.style.cssText = "font-family:'Arial Black',Arial,sans-serif;font-size:34px;letter-spacing:3px;color:#f5ead6;text-transform:uppercase;margin:0 0 8px;";
    title.textContent = 'CREATE';
    var rule = document.createElement('div');
    rule.style.cssText = 'height:3px;width:120px;background:#c1121f;margin:0 auto 10px;';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:15px;color:#a89e88;line-height:1.5;';
    sub.textContent = 'The propaganda workshop. Make it. Ship it.';
    head.appendChild(kicker); head.appendChild(title);
    head.appendChild(rule); head.appendChild(sub);
    host.insertBefore(head, host.firstChild);
  }

  /* Hidden dock: self-mount host divs live here at bundle time; parked tool
     sections return here on close. display:none keeps them out of layout
     while remaining in the DOM (modules find their divs by id). */
  var dock = document.createElement('div');
  dock.id = 'pf-ws-dock';
  dock.setAttribute('aria-hidden', 'true');
  dock.style.cssText = 'display:none;';
  host.appendChild(dock);

  var rail = document.createElement('nav');
  rail.className = 'pf-ws-rail';
  rail.setAttribute('aria-label', 'Workshop tools');
  host.appendChild(rail);

  var stage = document.createElement('div');
  stage.id = 'pf-ws-stage';
  stage.setAttribute('role', 'region');
  stage.setAttribute('aria-label', 'Active workshop tool');
  stage.style.display = 'none';
  var stagebar = document.createElement('div');
  stagebar.className = 'pf-ws-stagebar';
  var backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'pf-ws-back';
  backBtn.textContent = '\u2190 ALL TOOLS';
  backBtn.setAttribute('aria-label', 'Close tool and return to the tool rail');
  backBtn.onclick = function () { close(); };
  stagebar.appendChild(backBtn);
  var pane = document.createElement('div');
  pane.id = 'pf-ws-pane';
  stage.appendChild(stagebar);
  stage.appendChild(pane);
  host.appendChild(stage);

  buildHeader();

  /* Bundle-load-order primer: self-mount modules (ammo, creator-assist,
     forged-tray) run their IIFEs at bundle load — long before any tool is
     opened — and need their host div to exist, or they fire their
     missing-anchor fallbacks (ammo's error banner, creator-assist's S7
     append, forged-tray's fallback chain). Pre-create each host in the dock
     NOW, while this file is still first in bundle-create (unless the tool is
     killed — a killed module never looks for its host). This list must stay
     in sync with the selfMount adapters in pages/workshop-create.js; the
     adapters' own dockHost() calls are belt-and-braces for late
     registration paths. */
  var SELF_MOUNT_HOSTS = [
    ['pf-ammo', 'ammo'],
    ['pf-creator-assist', 'creator-assist'],
    ['pf-forged-tray', 'forged-tray'],
    /* DATA BOUNTY PROMPTS (2026-10-06): host for games/data-bounties.js */
    ['pf-data-bounties', 'databounties']
  ];
  for (var phi = 0; phi < SELF_MOUNT_HOSTS.length; phi++) {
    ensureDockHost(SELF_MOUNT_HOSTS[phi][0], SELF_MOUNT_HOSTS[phi][1]);
  }

  /* Self-mount modules run their IIFEs at bundle load — BEFORE any tool is
     opened — and need their host div to exist or they fire their
     missing-anchor fallbacks (ammo's error banner, creator-assist's S7
     append, forged-tray's fallback chain). Pre-create each host in the dock
     now, unless the tool is killed (a killed module never looks for it).
     Called by adapters at registration time. */
  function ensureDockHost(id, killId) {
    if (killId && PF.skip(killId)) return null;
    var d = document.getElementById(id);
    if (d) { if (d.parentNode !== dock) dock.appendChild(d); return d; }
    d = document.createElement('div');
    d.id = id;
    dock.appendChild(d);
    return d;
  }

  /* ============ registry (additive, never reassignment) ============ */
  var tools = {};   /* id -> def */
  var order = [];   /* registration order = rail order */
  var mounted = {}; /* id -> section element (lazy-mount-once) */
  var active = null;

  function renderRail() {
    /* Rebuild rail buttons in registration order. Cheap; registrations only
       happen at bundle load. */
    while (rail.firstChild) rail.removeChild(rail.firstChild);
    for (var i = 0; i < order.length; i++) {
      (function (id) {
        var def = tools[id];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-ws-tab';
        b.setAttribute('data-ws-tool', id);
        b.setAttribute('aria-controls', 'pf-ws-stage');
        if (active === id) b.setAttribute('aria-current', 'true');
        var t = document.createElement('span');
        t.className = 'pf-ws-tab-t';
        t.textContent = def.title;
        var s = document.createElement('span');
        s.className = 'pf-ws-tab-s';
        s.textContent = def.tagline || '';
        b.appendChild(t); b.appendChild(s);
        b.onclick = function () { open(id); };
        rail.appendChild(b);
      })(order[i]);
    }
  }

  function register(def) {
    if (!def || typeof def.id !== 'string' || !def.id) {
      err('register rejected: missing id', null); return false;
    }
    if (tools[def.id]) {
      err('register rejected: duplicate id "' + def.id + '" — registry is additive, never reassignment', null);
      return false;
    }
    if (!def.title) { err('register rejected: "' + def.id + '" missing title', null); return false; }
    /* Per-tool kill switch: a killed tool never reaches the rail. */
    if (def.kill && PF.skip(def.kill)) return false;
    if (!def.templateId && !def.selfMount && typeof def.mount !== 'function') {
      err('register rejected: "' + def.id + '" needs templateId, selfMount, or mount()', null);
      return false;
    }
    tools[def.id] = {
      id: def.id, title: def.title, tagline: def.tagline || '',
      templateId: def.templateId || null, selfMount: def.selfMount || null,
      kill: def.kill || null, mount: (typeof def.mount === 'function') ? def.mount : null
    };
    order.push(def.id);
    renderRail();
    return true;
  }

  /* ============ mount mechanics ============ */

  /* execScripts: page-mount.js's approach — eval each inner script in global
     scope so the tool's IIFE runs as if the template had been server-rendered. */
  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { err('inner script failed in ' + label, e); throw e; }
      scripts[i].remove();
    }
  }

  /* TERMINAL STATE (spec section 4b): a dead tool mount must never leave a
     loading skeleton spinning — swap it for the explicit error + Reload. */
  function terminalError(section, what) {
    try {
      var loads = section.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
      for (var j = 0; j < loads.length; j++) {
        if (loads[j].parentNode) loads[j].parentNode.removeChild(loads[j]);
      }
    } catch (e) {}
    var d = document.createElement('div');
    d.className = 'pf-ws-err';
    d.setAttribute('role', 'alert');
    var msg = document.createElement('div');
    msg.textContent = what + ' failed to start.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reload';
    btn.onclick = function () { location.reload(); };
    d.appendChild(msg); d.appendChild(btn);
    section.appendChild(d);
    err('terminal: ' + what, null);
  }

  function mountTemplate(def, section) {
    var tpl = document.getElementById(def.templateId);
    if (!tpl || !tpl.content) {
      throw new Error('template #' + def.templateId + ' not staged');
    }
    var frag = document.importNode(tpl.content, true);
    section.appendChild(frag);
    execScripts(section, def.templateId);
  }

  function mountSelf(def, section) {
    /* The module rendered into its dock host at bundle time; relocate the
       node into the tool section. Moving preserves listeners. */
    var node = document.getElementById(def.selfMount);
    if (!node) throw new Error('self-mount host #' + def.selfMount + ' missing');
    section.appendChild(node);
  }

  function firstMount(def) {
    var section = document.createElement('section');
    section.className = 'pf-ws-tool';
    section.setAttribute('data-ws-tool', def.id);
    section.setAttribute('tabindex', '-1');
    section.setAttribute('aria-label', def.title);
    try {
      if (def.mount) def.mount(section, def);
      else if (def.templateId) mountTemplate(def, section);
      else if (def.selfMount) mountSelf(def, section);
    } catch (e) {
      terminalError(section, def.title);
    }
    return section;
  }

  /* ============ open / close ============ */
  function setHash(id) {
    try {
      var h = '#pf-tool=' + encodeURIComponent(id);
      if ((window.location.hash || '') !== h) window.location.hash = h;
    } catch (e) {}
  }
  function clearHash() {
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {}
  }
  function readHash() {
    try {
      var m = String(window.location.hash || '').match(/[#&]pf-tool=([A-Za-z0-9-]+)/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }

  function open(id, opts) {
    var def = tools[id];
    if (!def) return false;
    if (def.kill && PF.skip(def.kill)) {
      try { PF.toast('That tool is offline.'); } catch (e) {}
      return false;
    }
    if (active === id) return true; /* idempotent: re-open is a no-op */
    if (active) close({ fromHash: true, keepHash: true });
    active = id;
    var section = mounted[id] || (mounted[id] = firstMount(def));
    /* Self-mount tools: close() parks the rendered node back in the dock;
       re-attach it to the tool section on every open. */
    if (def.selfMount) {
      try {
        var reNode = document.getElementById(def.selfMount);
        if (reNode && reNode.parentNode !== section) section.appendChild(reNode);
      } catch (e) {}
    }
    pane.appendChild(section); /* move into the visible stage */
    stage.style.display = '';
    renderRail();
    var fromHash = opts && opts.fromHash;
    if (!fromHash) setHash(id);
    /* Focus the back control so keyboard users land at the top of the tool;
       Escape / Back returns here. */
    try { backBtn.focus(); } catch (e) {}
    return true;
  }

  function close(opts) {
    if (!active) return;
    var id = active;
    active = null;
    var section = mounted[id];
    if (section && section.parentNode === pane) {
      /* Self-mount nodes return to the dock host position: if the tool's
         section directly wraps its self-mount node, unwrap it back into the
         dock so the module's host div keeps its canonical home. */
      var def = tools[id];
      if (def && def.selfMount) {
        var node = section.querySelector('#' + def.selfMount) || document.getElementById(def.selfMount);
        if (node && node.parentNode === section) dock.appendChild(node);
      }
      dock.appendChild(section);
    }
    /* Clear the pane of any adapter-added extras (empty states etc. live
       inside the section, so they park with it — nothing to do here). */
    while (pane.firstChild) pane.removeChild(pane.firstChild);
    stage.style.display = 'none';
    renderRail();
    var o = opts || {};
    if (!o.fromHash && !o.keepHash) clearHash();
    /* Return focus to the rail tab for the tool just closed. */
    try {
      var btn = rail.querySelector('[data-ws-tool="' + id + '"]');
      if (btn) btn.focus();
    } catch (e) {}
  }

  /* Back button: open() sets location.hash, which pushes a history entry.
     Back reverts the hash → hashchange → close. Idempotent handlers make
     the round-trip loop-free. */
  window.addEventListener('hashchange', function () {
    var id = readHash();
    if (id && tools[id]) { open(id, { fromHash: true }); return; }
    if (id && !tools[id]) {
      /* Unknown tool hash: don't strand the user on an empty page. */
      try { PF.toast('Unknown workshop tool.'); } catch (e) {}
    }
    if (active) close({ fromHash: true });
  });

  /* Escape closes the active tool, returning to the rail. */
  document.addEventListener('keydown', function (e) {
    try {
      if (e && e.key === 'Escape' && active) { close(); }
    } catch (e2) {}
  });

  /* Initial route: #pf-tool=<id> deep-link, or ?for=<slug> (catalog pages
     deep-link to /create?for=<slug> for that creator's bounty board). */
  function route() {
    var id = readHash();
    if (id && tools[id]) { open(id, { fromHash: true }); return true; }
    if (id && !tools[id]) { try { PF.toast('Unknown workshop tool.'); } catch (e) {} }
    try {
      var m = String(window.location.search || '').match(/[?&]for=([a-z0-9_-]{1,60})/i);
      if (m && tools['creator-assist']) { open('creator-assist', { fromHash: true }); return true; }
    } catch (e) {}
    return false;
  }

  /* Claim the page BEFORE page-mount.js runs (bundle-pages loads after
     bundle-create): page-mount skips its legacy stacked mount for pf-create
     when this flag is set. If this file loads but throws before this line,
     the flag stays unset and the legacy layout runs — the regression path. */
  window.pfWorkshopClaimed = true;

  window.PFWorkshop = {
    v: '1.4.3',
    register: register,
    open: open,
    close: close,
    route: route,
    ensureDockHost: ensureDockHost,
    active: function () { return active; },
    list: function () { return order.slice(); },
    /* Introspection for adapters / debugging. */
    get: function (id) { return tools[id] || null; }
  };
})();
