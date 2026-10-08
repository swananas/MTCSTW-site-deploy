/* games/create-loop.js  |  PF v1.4.3 | UX COMBINATION PLAY 1 — CLOSE THE CREATION LOOP
   (CEO approval 2026-10-06 ~14:35 CDT).

   The Poster Forge finished-piece screen (the #pBattle action row) is a dead
   end: a finished piece goes nowhere. This module injects ONE action row
   beneath the forge's own buttons so every finished piece becomes
   engagement fuel:

     [SHARE THIS INTEL]   — pushes the piece through the EXISTING share
                            pipeline (window.PFShare.shareImage — the same
                            chokepoint every poster generator uses: callsign
                            stamping, claim gate, navigator.share fallback,
                            creditShare once-per-day gate). Zero new XP: the
                            pf-share-image event it fires belongs to the
                            existing pipeline; this module mints nothing.
     [SUBMIT AS DAILY ORDER] — queues the piece as a Daily Order candidate.
                            Read-only investigation (2026-10-06): there is NO
                            Daily Order candidate endpoint in v1.4.3 and NO
                            client-side order-pool/review-queue submit path.
                            The closest existing contract is readcreate /
                            bank_submit, but it requires an http(s)
                            artifact_url — a fresh forge canvas has no URL,
                            and inventing an upload contract is forbidden.
                            So the candidate is queued DEVICE-LOCALLY
                            (localStorage 'pf_createorder_queue_v1', capped)
                            with a clear TODO below. Nothing is posted, no
                            backend contract is invented.
     [RALLY YOUR CELL]      — shares the piece with a cell-rally caption.
                            Read-only investigation (2026-10-06): there is NO
                            cell-feed posting mechanism in v1.4.3. The
                            'window.PFCellPrimaryId' pattern named in the
                            task brief does NOT exist anywhere in this tree;
                            cell context lives in window.PFCellIdentity +
                            the cell_mine read. No cell_feed_post action
                            exists on the backend. So this button is hidden
                            unless cell_mine confirms membership, and it
                            routes through the existing share pipeline with
                            a locked rally caption. TODO below: when a true
                            cell-feed post contract lands, post there.

   STYLING: zero new CSS. The bar mounts INSIDE #pf-poster and reuses the
   forge's own .p-btn / .p-btn.ghost family (red/black, Arial Black) — the
   same DEPLOY → / REPORT BACK → CTA language as the rest of the page.

   MOUNTING: the forge is a lazy template (#pf-ov-poster) cloned by the
   workshop shell (or the legacy stacked mount) — the module cannot assume
   bundle-load order. A MutationObserver catches the first #pBattle in the
   DOM and injects once (data-pf-createloop marker); a 2s/6s scan backstop
   covers forges mounted before the observer attaches.

   FAIL-OPEN EVERYWHERE: each button self-gates on its infra. If PFShare is
   missing, SHARE/RALLY hide. If the canvas is tainted or storage is
   unavailable, SUBMIT hides. If cell_mine fails or shows no membership,
   RALLY hides. Nothing ever throws out of this module.

   XP: none. No XP calls, no XP events, no currencies.
   KILL: ?pf_off=createloop  or  localStorage pf_disabled_v1='["createloop"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('createloop')) return;
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var QUEUE_KEY = 'pf_createorder_queue_v1';
  var QUEUE_CAP = 50;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px Arial,sans-serif;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999;max-width:86vw;text-align:center';
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e2) {} }, 3200);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function shareOK() {
    try { return !!(window.PFShare && typeof window.PFShare.shareImage === 'function'); }
    catch (e) { return false; }
  }
  /* Forge context, read from the mounted DOM only (the forge's `state` var
     is module-private — never reach into another module's closure). */
  function forgeTitle() {
    try {
      var inp = document.getElementById('pTop');
      var t = inp && inp.value ? String(inp.value).trim() : '';
      if (!t) t = 'Poster Forge intel';
      return t.slice(0, 120);
    } catch (e) { return 'Poster Forge intel'; }
  }
  function forgeCanvas() {
    try { return document.getElementById('pCanvas'); }
    catch (e) { return null; }
  }
  /* Small JPEG thumb for the device-local order queue — mirrors the forge's
     own battle-thumb sizing (540w @ q0.72). A tainted canvas throws here; the
     caller must fail open. */
  function forgeThumb() {
    var src = forgeCanvas();
    if (!src || !src.getContext) return '';
    var c2 = document.createElement('canvas');
    var w = 540, h = Math.round(540 * src.height / src.width);
    c2.width = w; c2.height = h;
    c2.getContext('2d').drawImage(src, 0, 0, w, h);
    return c2.toDataURL('image/jpeg', 0.72);
  }

  /* ---- cell_mine read: does this browser belong to a cell? ----
     Existing, documented, read-only contract (GET ?action=cell_mine,
     cell-hq.js convention). Returns {ok, in_cell, cell:{id,name,...}}.
     Fail-open: any failure keeps the RALLY button hidden. */
  function cellMine(cb) {
    var done = false;
    function finish(cell) {
      if (done) return; done = true;
      try { cb(cell || null); } catch (e) {}
    }
    try {
      var BE = window.PF_BACKEND_URL;
      var id = ident();
      if (!BE || !id.callsign) { finish(null); return; }
      /* Route through the shared auth GET when available (cell-hq.js does
         the same via PF.authGetJSONP); raw JSONP is the backstop. */
      if (PF && typeof PF.authGetJSONP === 'function') {
        PF.authGetJSONP(BE, 'cell_mine', { callsign: id.callsign, device: id.device }, function (j) {
          var cell = (j && j.ok && j.in_cell && j.cell && j.cell.id)
            ? { id: String(j.cell.id), name: String(j.cell.name || 'your cell') } : null;
          finish(cell);
        });
        setTimeout(function () { finish(null); }, 13000);
        return;
      }
      var fn = 'pfCLCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script');
      window[fn] = function (j) {
        finish((j && j.ok && j.in_cell && j.cell && j.cell.id)
          ? { id: String(j.cell.id), name: String(j.cell.name || 'your cell') } : null);
      };
      s.onerror = function () { finish(null); };
      var q = '?action=cell_mine&callsign=' + encodeURIComponent(id.callsign) +
        '&device=' + encodeURIComponent(id.device);
      try {
        var sec = (PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
        if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
      } catch (e2) {}
      q += '&callback=' + fn;
      s.src = BE + q;
      document.head.appendChild(s);
      setTimeout(function () { try { delete window[fn]; } catch (e3) {} finish(null); }, 12000);
    } catch (e) { finish(null); }
  }

  /* ---- device-local order-candidate queue ----
     TODO(backend): no Daily Order candidate endpoint exists in v1.4.3.
     Do NOT invent a POST contract. When the order-candidate action lands
     (or the Studio SOP adds a drain for this queue into the review pool),
     drain QUEUE_KEY there: [{id, ts, callsign, device, title, thumb,
     source:'poster-forge'}]. Until then, candidates sit on the device —
     MTCSTW reviews them on the user's browser via the Review Pool. */
  function queueLoad() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function queuePush(entry) {
    try {
      var q = queueLoad();
      q.push(entry);
      while (q.length > QUEUE_CAP) q.shift(); /* oldest drops first */
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      return true;
    } catch (e) { return false; }
  }

  function sharePiece(opts) {
    /* Routes the finished piece through the EXISTING share pipeline —
       PFShare.shareImage: claim gate, callsign stamping, navigator.share
       fallback, creditShare once-per-day gate. Returns false if the infra
       vanished (fail-open: the caller hides the button). */
    try {
      var cv = forgeCanvas();
      if (!cv || !shareOK()) return false;
      window.PFShare.shareImage(cv, 'pfn-propaganda-poster.png',
        forgeTitle(), 'workshop-create', opts || {});
      return true;
    } catch (e) { return false; }
  }

  function buildBar(row) {
    /* The forge's own row uses .p-row > .p-btn — same classes, same paint. */
    var bar = document.createElement('div');
    bar.className = 'p-row';
    bar.id = 'pf-create-loop';
    bar.setAttribute('aria-label', 'Ship this piece');

    var bShare = document.createElement('button');
    bShare.type = 'button';
    bShare.className = 'p-btn';
    bShare.textContent = 'SHARE THIS INTEL';
    bShare.onclick = function () {
      if (!sharePiece({})) {
        try { bShare.style.display = 'none'; } catch (e) {}
      }
    };
    if (shareOK()) bar.appendChild(bShare);

    var bOrder = document.createElement('button');
    bOrder.type = 'button';
    bOrder.className = 'p-btn ghost';
    bOrder.textContent = 'SUBMIT AS DAILY ORDER';
    bOrder.onclick = function () {
      var thumb = '';
      try { thumb = forgeThumb(); }
      catch (e) { thumb = ''; }
      if (!thumb) {
        try { bOrder.style.display = 'none'; } catch (e2) {}
        toast('Could not capture the piece — try Download, then submit again.');
        return;
      }
      var id = ident();
      var entry = {
        id: 'clq_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
        ts: Date.now(),
        callsign: id.callsign || '',
        device: id.device || '',
        title: forgeTitle(),
        thumb: thumb,
        source: 'poster-forge'
      };
      if (queuePush(entry)) {
        toast('IN THE ORDER QUEUE. MTCSTW reviews candidates — nothing posts until he approves.');
      } else {
        toast('Queue is full or storage blocked — the piece stays on your device.');
      }
    };
    bar.appendChild(bOrder);

    /* Empty bar = every button was hidden by fail-open; mount nothing. */
    if (!bar.children.length) return null;
    return bar;
  }

  function buildRally(bar, rallyCell) {
    /* RALLY YOUR CELL: appended only when cell_mine confirmed membership.
       Routes through the existing share pipeline with a locked rally
       caption — no free-text, no new surface for abuse.
       TODO(backend): there is no cell-feed post contract in v1.4.3 (no
       cell_feed_post action, and window.PFCellPrimaryId does not exist in
       this tree). When one lands, post the piece to the member's cell feed
       directly instead of share-routing. */
    if (!rallyCell || !shareOK() || !bar) return;
    try {
      var bRally = document.createElement('button');
      bRally.type = 'button';
      bRally.className = 'p-btn ghost';
      bRally.textContent = 'RALLY YOUR CELL';
      var cellName = rallyCell.name || 'your cell';
      bRally.onclick = function () {
        var caption = 'RALLYING MY CELL — ' + cellName +
          '. Fresh intel, straight from the forge. Share it. Plaster it. ' +
          'JOIN THE FIGHT. MTCSTW.COM';
        if (!sharePiece({ text: caption })) {
          try { bRally.style.display = 'none'; } catch (e) {}
        }
      };
      bar.appendChild(bRally);
    } catch (e) {}
  }

  function mount(row) {
    try {
      if (!row || row.getAttribute('data-pf-createloop')) return;
      row.setAttribute('data-pf-createloop', '1');
      /* Mount immediately so SHARE / SUBMIT never wait on the cell read.
         The rally button upgrades in only if cell_mine confirms
         membership — the cell read is async and fail-open. */
      var bar = buildBar(row);
      if (bar && row.parentNode) row.parentNode.insertBefore(bar, row.nextSibling);
      if (bar) {
        cellMine(function (cell) {
          if (cell && bar.parentNode) buildRally(bar, cell);
        });
      }
    } catch (e) {}
  }

  function scan() {
    try {
      var btn = document.getElementById('pBattle');
      if (!btn) return;
      var poster = btn.closest ? btn.closest('#pf-poster') : null;
      if (!poster) return;
      var row = btn.closest ? btn.closest('.p-row') : null;
      if (!row) return;
      mount(row);
    } catch (e) {}
  }

  /* The forge mounts lazily (workshop shell template clone) — observe. */
  try {
    var obs = new MutationObserver(function () { scan(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  scan();
  setTimeout(scan, 2000);
  setTimeout(scan, 6000);
})();
