/* core/40-make-shareable.js  |  PF v1.4.3 | MAKE SHAREABLE — inline Studio creation panel.
   CEO directive 2026-10-07 ~01:38 CDT ("further integration via EMBEDDING"):
   Studio creation tools on every data page. One-click "make shareable" from
   any data view — no separate trip to /studio or /create required.

   ONE module, five data products (/receipt, /town, /extraction, /index, /karl):
   - Pages register shareable units — one per dossier / town report / story /
     score / answer — via PFMakeShareable.units([...]). Units may also be
     declared in markup: any element with [data-mss] is picked up by the
     scanner (data-mss-kind, data-mss-ref, data-mss-painter, data-mss-title,
     data-mss-deep, data-mss-game).
   - The module injects a MAKE SHAREABLE button into each unit (once;
     a MutationObserver re-scans for async-rendered cards, so late mounts
     and feed pages are covered).
   - One tap opens an INLINE bottom-sheet panel (never a page navigation):
     the product's OWN 1080x1350 painter renders the preview (no duplicate
     image code — resolution via PFShare.paintAsync or a page-registered
     resolver), the user can add a caption/context line, and one PUBLISH
     tap sends the piece to the UGC feed (the builders' PFUgcCreate contract)
     AND opens the native share sheet.

   RULES (standing):
   - Inline panel, never a page. The user never leaves the data view.
   - Zero XP for viewing — this module never touches the XP ledger.
     Publishing routes through PFShare.shareImage (claimGate + creditShare),
     i.e. the existing share mechanics — nothing new invented.
   - Mobile-first: the sheet is thumb-reachable, PUBLISH is a 52px target
     pinned at the bottom of the sheet.
   - Clean, light (CEO design direction): white sheet, ink text, red CTA.

   Painter resolution per unit (first hit wins):
     1. resolvers[kind](unit, done) — registered by the page when its painter
        needs live JSON held in a module closure (receipt dossier, town
        report, extraction profile, karl answer).
     2. PFShare.paintAsync(unit.painter, done) — custom painters registered
        via PFShare.setPoster, or REG ids via the generic renderer.

   UGC publish contract (specs/mss-ugc-publish-contract-20261007.md):
     window.PFUgcCreate.publish({kind, ref, title, caption, deepLink,
       imageBlob, gameId}) -> Promise<{ok, slug?, url?}>.
   Fail-soft: a builder that hasn't landed yet is NOT a wedge — the piece is
   queued device-local (pf_mss_queue_v1, cap 25, metadata only — the image
   re-paints from the unit's painter when the builder consumes the queue)
   and the native share sheet still opens. Events 'pf-mss-published' and
   'pf-mss-queued' fire on document for builders/observers.

   KILL: ?pf_off=make-shareable  or  localStorage pf_disabled_v1='["make-shareable"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('make-shareable')) { return; }
  if (window.pfMakeShareableDone) return;
  window.pfMakeShareableDone = true;

  var QUEUE_KEY = 'pf_mss_queue_v1';
  var QUEUE_CAP = 25;
  var CAPTION_MAX = 140;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  function err(m) { try { if (PF && PF.error) PF.error('make-shareable', m); } catch (e) {} }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }
  if (isEditor()) return;

  function safeRef(r) {
    return String(r == null ? 'item' : r).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }
  function absUrl(deep) {
    var d = String(deep || '/');
    if (/^https?:\/\//i.test(d)) return d;
    if (d.charAt(0) !== '/') d = '/' + d;
    return 'https://www.mtcstw.com' + d;
  }
  function callsign() {
    try { return window.PFCallsign ? String(window.PFCallsign() || '') : ''; } catch (e) { return ''; }
  }

  /* ---------------------------------------------------------------- */
  /* CSS — clean, light sheet. Mobile-first, thumb-reachable.           */
  /* ---------------------------------------------------------------- */
  function cssOnce() {
    if (document.getElementById('pf-mss-css')) return;
    var css = [
      '.pf-mss-btn{display:inline-block;background:#fff;border:2px solid #c1121f;color:#c1121f;',
      'font-weight:900;letter-spacing:2px;font-size:13px;padding:12px 22px;border-radius:8px;',
      'cursor:pointer;min-height:44px;font-family:Arial,sans-serif;margin:10px 0 2px}',
      '.pf-mss-btn:hover{background:#c1121f;color:#fff}',
      '.pf-mss-btn:active{transform:scale(.98)}',
      '.pf-mss-btn:focus-visible{outline:3px solid #c1121f;outline-offset:2px}',
      /* Butter pass (workstream 5): premium bottom-sheet chrome — drag
         grip, PFN-red top accent, lifted PUBLISH with hover states. */
      '.pf-mss-grip{width:44px;height:5px;border-radius:3px;background:#d8d2bd;margin:10px auto 2px}',
      '.pf-mss-x:hover{color:#c1121f}',
      '.pf-mss-pub{box-shadow:0 3px 14px rgba(193,18,31,.4);',
      'transition:background .15s ease,transform .12s ease,box-shadow .15s ease}',
      '.pf-mss-pub:hover:not(:disabled){background:#e01424;transform:translateY(-1px);',
      'box-shadow:0 8px 22px rgba(193,18,31,.5)}',
      '.pf-mss-pub:active:not(:disabled){transform:scale(.98)}',
      '.pf-mss-pub:focus-visible{outline:3px solid #1a1814;outline-offset:2px}',
      '@media(prefers-reduced-motion:reduce){.pf-mss-sheet{animation:none}.pf-mss-pub:hover{transform:none}}',
      '.pf-mss-scrim{position:fixed;inset:0;background:rgba(10,8,6,.55);z-index:2147483000;}',
      '.pf-mss-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2147483001;background:#fdfdfa;',
      'border-top:4px solid #c1121f;',
      'border-radius:16px 16px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,.35);max-width:560px;margin:0 auto;',
      'max-height:92vh;display:flex;flex-direction:column;font-family:Arial,sans-serif;color:#1a1814;',
      'animation:pfMssUp .22s ease-out}',
      '@keyframes pfMssUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}',
      '.pf-mss-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;',
      'border-bottom:2px dashed #e7e1d0}',
      '.pf-mss-title{font-weight:900;letter-spacing:3px;font-size:14px;color:#c1121f}',
      '.pf-mss-x{background:none;border:0;font-size:22px;line-height:1;color:#8a8474;cursor:pointer;',
      'min-width:44px;min-height:44px;padding:8px}',
      '.pf-mss-body{padding:14px 18px;overflow-y:auto;-webkit-overflow-scrolling:touch}',
      '.pf-mss-prevwrap{text-align:center;margin-bottom:12px}',
      '.pf-mss-prev{max-width:100%;max-height:38vh;border:1px solid #e7e1d0;border-radius:8px;background:#fff}',
      '.pf-mss-loading{padding:34px 0;color:#8a8474;font-size:14px;text-align:center}',
      '.pf-mss-err{padding:20px 0;color:#c1121f;font-size:14px;text-align:center}',
      '.pf-mss-caplabel{font-size:11px;letter-spacing:3px;font-weight:900;color:#c1121f;margin:4px 0 6px}',
      '.pf-mss-cap{width:100%;box-sizing:border-box;background:#fff;border:2px solid #1a1814;color:#1a1814;',
      'padding:12px 14px;font-size:16px;border-radius:8px;outline:none;font-family:Arial,sans-serif}',
      '.pf-mss-cap:focus{border-color:#c1121f}',
      '.pf-mss-note{font-size:12px;color:#8a8474;margin:10px 0 0;line-height:1.5;text-align:center}',
      '.pf-mss-foot{padding:12px 18px 18px;border-top:1px solid #e7e1d0;background:#fdfdfa}',
      '.pf-mss-pub{display:block;width:100%;background:#c1121f;border:0;color:#fff;font-weight:900;',
      'letter-spacing:2px;font-size:16px;padding:16px;border-radius:10px;cursor:pointer;min-height:52px}',
      '.pf-mss-pub:disabled{opacity:.55;cursor:wait}',
      '@media(prefers-reduced-motion:reduce){.pf-mss-pub{transition:none}}'
    ];
    var st = document.createElement('style');
    st.id = 'pf-mss-css';
    st.textContent = css.join('\n');
    document.head.appendChild(st);
  }

  /* ---------------------------------------------------------------- */
  /* Unit registry                                                     */
  /* ---------------------------------------------------------------- */
  /* unit: {el, kind, ref, title, deep, game, painter} */
  var unitList = [];
  var resolvers = {};

  function unitKey(u) {
    return String(u.kind || '') + '|' + String(u.ref || '');
  }
  var seenKeys = {};

  function addUnits(units) {
    if (!units || !units.length) return;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (!u || !u.el || !u.kind) continue;
      var k = unitKey(u);
      if (seenKeys[k]) continue;
      seenKeys[k] = 1;
      unitList.push(u);
      injectButton(u);
    }
  }

  function scanDeclarative(root) {
    var els = null;
    try { els = (root || document).querySelectorAll('[data-mss]:not([data-mss-wired])'); }
    catch (e) { return; }
    var found = [];
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.setAttribute('data-mss-wired', '1');
        var kind = el.getAttribute('data-mss-kind') || 'ugc';
        found.push({
          el: el,
          kind: kind,
          ref: el.getAttribute('data-mss-ref') || '',
          title: el.getAttribute('data-mss-title') || 'The Propaganda Factory',
          deep: el.getAttribute('data-mss-deep') || '/',
          game: el.getAttribute('data-mss-game') || kind,
          painter: el.getAttribute('data-mss') || null
        });
      })(els[i]);
    }
    addUnits(found);
  }

  /* ---------------------------------------------------------------- */
  /* MAKE SHAREABLE button injection                                   */
  /* ---------------------------------------------------------------- */
  function injectButton(u) {
    try {
      var el = u.el;
      if (!el || el.querySelector(':scope > .pf-mss-btn')) return;
      var slot = null;
      try { slot = el.querySelector('[data-mss-slot]'); } catch (e) {}
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pf-mss-btn';
      b.textContent = 'MAKE SHAREABLE';
      b.setAttribute('aria-label', 'Make this shareable — open the creation panel');
      b.addEventListener('click', function (ev) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
        openPanel(u);
      });
      if (slot) slot.appendChild(b);
      else el.appendChild(b);
      u.btn = b;
    } catch (e) { err('inject failed'); }
  }

  /* ---------------------------------------------------------------- */
  /* Painting — the product's own painter, never duplicated.           */
  /* ---------------------------------------------------------------- */
  function paintUnit(u, done) {
    done = (typeof done === 'function') ? done : function () {};
    var r = null;
    try { r = resolvers[u.kind]; } catch (e) {}
    if (typeof r === 'function') {
      try { r(u, done); } catch (e) { try { done(null); } catch (e2) {} }
      return;
    }
    var P = null;
    try { P = window.PFShare; } catch (e) {}
    if (P && typeof P.paintAsync === 'function' && u.painter) {
      try { P.paintAsync(u.painter, done); } catch (e) { try { done(null); } catch (e2) {} }
      return;
    }
    if (P && typeof P.poster === 'function' && u.painter) {
      var cv = null;
      try { cv = P.poster(u.painter); } catch (e) {}
      try { done(cv); } catch (e2) {}
      return;
    }
    try { done(null); } catch (e) {}
  }

  function canvasToBlob(cv, cb) {
    try {
      if (cv.toBlob) { cv.toBlob(function (b) { cb(b); }, 'image/png'); return; }
      var u = cv.toDataURL('image/png');
      fetch(u).then(function (r) { return r.blob(); }).then(cb).catch(function () { cb(null); });
    } catch (e) { cb(null); }
  }

  /* ---------------------------------------------------------------- */
  /* UGC publish — the builders' contract, fail-soft.                  */
  /* ---------------------------------------------------------------- */
  function queueDraft(p) {
    var q = [];
    try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { q = []; }
    if (!Array.isArray(q)) q = [];
    q.push({
      kind: p.kind, ref: p.ref, title: p.title, caption: p.caption,
      deepLink: p.deepLink, gameId: p.gameId, ts: Date.now()
    });
    while (q.length > QUEUE_CAP) q.shift();
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent('pf-mss-queued', {
        detail: { kind: p.kind, ref: p.ref, queued: q.length }
      }));
    } catch (e) {}
  }

  /* One PUBLISH tap: UGC feed first, then the native share sheet.
     The sheet is never held hostage by the feed — a feed failure still
     shares the image. */
  function publish(unit, caption, cv, ui) {
    var filename = 'pfn-' + safeRef(unit.kind) + '-' + safeRef(unit.ref) + '.png';
    var shareTxt = caption ? (caption + '\n' + absUrl(unit.deep)) : null;

    function openSheet() {
      var P = null;
      try { P = window.PFShare; } catch (e) {}
      try {
        if (ui && ui.done) ui.done();
      } catch (e) {}
      if (P && typeof P.shareImage === 'function') {
        /* claimGate + creditShare ride inside shareImage — the existing
           share mechanics, zero new XP plumbing. */
        try { P.shareImage(cv, filename, unit.title, unit.game, shareTxt ? { text: shareTxt } : null); }
        catch (e) {
          try { P.saveImage(cv, filename, unit.game); } catch (e2) {}
          toast('Image saved — share it from your photos.');
        }
      } else {
        toast('Share unavailable — try again.');
      }
    }

    function feedThenSheet() {
      var payload = {
        kind: unit.kind, ref: unit.ref, title: unit.title,
        caption: caption, deepLink: unit.deep, imageBlob: null, gameId: unit.game
      };
      canvasToBlob(cv, function (blob) {
        payload.imageBlob = blob;
        var P = null;
        try { P = window.PFUgcCreate; } catch (e) {}
        var publishFn = (P && typeof P.publish === 'function') ? P.publish : null;
        if (!publishFn) {
          /* Builder not landed yet: queue device-local, never wedge. */
          payload.imageBlob = null; /* blobs don't serialize — repaints on consume */
          queueDraft(payload);
          toast('Saved to your share queue — feed publish lands with the builder.');
          openSheet();
          return;
        }
        var settled = false;
        function finish(ok) {
          if (settled) return; settled = true;
          try {
            document.dispatchEvent(new CustomEvent('pf-mss-published', {
              detail: { kind: unit.kind, ref: unit.ref, ok: !!ok }
            }));
          } catch (e) {}
          if (ok) toast('Published to the feed. Now spread it.');
          else toast('Feed hiccuped — sharing the image anyway.');
          openSheet();
        }
        try {
          var r = publishFn(payload);
          if (r && typeof r.then === 'function') {
            r.then(function (res) { finish(res && res.ok); }, function () { finish(false); });
            setTimeout(function () { finish(false); }, 20000); /* never wedge */
          } else { finish(!!r); }
        } catch (e) { finish(false); }
      });
    }

    /* UGC publish routes through the callsign — the builders require one.
       Dismissed claim: skip the feed silently, still open the sheet —
       never trap the user, never a misleading "hiccup" toast. */
    if (!callsign() && PF && typeof PF.requireCallsign === 'function') {
      try {
        PF.requireCallsign(function () {
          if (callsign()) feedThenSheet();
          else openSheet();
        }, {
          context: 'to publish your shareable to the feed'
        });
        return;
      } catch (e) { /* fall through to feed-then-sheet */ }
    }
    feedThenSheet();
  }

  /* ---------------------------------------------------------------- */
  /* Inline panel — bottom sheet, never a page navigation.              */
  /* ---------------------------------------------------------------- */
  var openState = null;

  function closePanel() {
    try {
      if (openState && openState.root && openState.root.parentNode) {
        openState.root.parentNode.removeChild(openState.root);
      }
    } catch (e) {}
    openState = null;
  }

  function openPanel(unit) {
    if (!unit) return;
    closePanel();
    cssOnce();
    var root = document.createElement('div');
    root.innerHTML =
      '<div class="pf-mss-scrim" data-mss-close></div>' +
      '<div class="pf-mss-sheet" role="dialog" aria-modal="true" aria-label="Make shareable">' +
      '<div class="pf-mss-grip" aria-hidden="true"></div>' +
      '<div class="pf-mss-head"><div class="pf-mss-title">MAKE SHAREABLE</div>' +
      '<button class="pf-mss-x" type="button" data-mss-close aria-label="Close">&times;</button></div>' +
      '<div class="pf-mss-body">' +
      '<div class="pf-mss-prevwrap" data-mss-prev><div class="pf-mss-loading">Painting your image&hellip;</div></div>' +
      '<div class="pf-mss-caplabel">YOUR CONTEXT LINE (OPTIONAL)</div>' +
      '<input class="pf-mss-cap" type="text" maxlength="' + CAPTION_MAX + '" data-mss-cap ' +
      'placeholder="Add your take — one line, your words&hellip;" aria-label="Caption or context line">' +
      '<div class="pf-mss-note">Publishes to the UGC feed, then opens your share sheet.<br>' +
      'Zero XP for viewing — sharing counts through the usual share mechanics.</div>' +
      '</div>' +
      '<div class="pf-mss-foot"><button class="pf-mss-pub" type="button" data-mss-pub disabled>PUBLISH</button></div>' +
      '</div>';
    document.body.appendChild(root);
    openState = { root: root, unit: unit, canvas: null };

    function wireClose() {
      var closers = root.querySelectorAll('[data-mss-close]');
      for (var i = 0; i < closers.length; i++) {
        closers[i].addEventListener('click', closePanel);
      }
    }
    wireClose();
    try {
      document.addEventListener('keydown', function esc2(e) {
        if (e && e.key === 'Escape' && openState && openState.root === root) {
          closePanel();
          document.removeEventListener('keydown', esc2);
        }
      });
    } catch (e) {}

    var prevWrap = root.querySelector('[data-mss-prev]');
    var pubBtn = root.querySelector('[data-mss-pub]');
    var capInput = root.querySelector('[data-mss-cap]');

    paintUnit(unit, function (cv) {
      if (!openState || openState.root !== root) return; /* panel closed meanwhile */
      if (!cv) {
        prevWrap.innerHTML = '<div class="pf-mss-err">Couldn\u2019t paint the preview.' +
          ' <button type="button" class="pf-mss-btn" data-mss-retry>RETRY</button></div>';
        var rb = prevWrap.querySelector('[data-mss-retry]');
        if (rb) rb.addEventListener('click', function () {
          prevWrap.innerHTML = '<div class="pf-mss-loading">Painting your image&hellip;</div>';
          openPanel(unit);
        });
        return;
      }
      openState.canvas = cv;
      var img = document.createElement('img');
      img.className = 'pf-mss-prev';
      img.alt = 'Share image preview';
      try { img.src = cv.toDataURL('image/png'); } catch (e) { img.src = ''; }
      prevWrap.innerHTML = '';
      prevWrap.appendChild(img);
      pubBtn.disabled = false;
      try { capInput.focus({ preventScroll: true }); } catch (e) {}
    });

    pubBtn.addEventListener('click', function () {
      if (!openState || !openState.canvas || pubBtn.disabled) return;
      pubBtn.disabled = true;
      pubBtn.textContent = 'PUBLISHING\u2026';
      var caption = '';
      try { caption = String(capInput.value || '').trim().slice(0, CAPTION_MAX); } catch (e) {}
      publish(unit, caption, openState.canvas, { done: closePanel });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Scan — initial + MutationObserver for async renders.              */
  /* ---------------------------------------------------------------- */
  var scanTimer = null;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      try { scanDeclarative(document); } catch (e) {}
    }, 350);
  }
  function observe() {
    try {
      var mo = new MutationObserver(function () { scheduleScan(); });
      mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */
  window.PFMakeShareable = {
    units: addUnits,
    registerResolver: function (kind, fn) {
      try { if (kind && typeof fn === 'function') resolvers[String(kind)] = fn; } catch (e) {}
    },
    openPanel: openPanel,
    closePanel: closePanel,
    scan: function () { try { scanDeclarative(document); } catch (e) {} },
    version: '1.4.3-mss1'
  };

  /* Boot: scan now (some units render before us) and watch for the rest. */
  try { scanDeclarative(document); } catch (e) {}
  observe();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      try { scanDeclarative(document); } catch (e) {}
    });
  }
  setTimeout(function () { try { scanDeclarative(document); } catch (e) {} }, 2500);
})();
