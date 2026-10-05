/* games/studio-drafts-tray.js  |  PF v1.4.3 | FORGED FOR YOU — Studio draft tray.
   Auto-generated draft assets (Political HQ creation-plugins) land in this
   tray for review. NOTHING AUTO-PUBLISHES — every post is an explicit user
   tap on POST / SAVE, and every tap rides the exact same PF.PHQShare entry
   points a fresh generation uses.

   Mount: Creator HQ — dedicated <div id="pf-forged-tray"> honored first,
   else right after the Ammo Finder (#pf-ammo), else right after #pf-war-card.
   Silent no-op everywhere else (visible error banner when no anchor exists,
   same pattern as ammo.js).

   Backend contract (parallel workstream — UNCONFIRMED until it lands):
     GET  ?action=studio_drafts_get  (auth, owner-only)
       -> {ok:true, drafts:[{id, plugin, template, title, data_snapshot, created, read}]}
     POST {type:'studio', studio_action:'studio_drafts_dismiss', id, callsign, auth_secret}
       -> {ok:true}
   If the backend is down, unauthenticated, or the action is unknown, the
   tray shows the empty state gracefully — never a crash, never a spinner
   that never resolves.

   Preview: PF.PHQShare.paint(template, data_snapshot) (core/share-image-phq.js,
   parallel workstream). Unknown template id or missing painters ->
   title + "preview unavailable", Post/Save disabled — never crash.

   XP INVARIANT (CEO directive, 2026-10-05): the draft itself grants ZERO XP.
   Post/Save call PF.PHQShare.share/save DIRECTLY — no wrapper — so the
   once-per-day share credit gate (share-image.js creditShare ->
   'pf-share-image') fires at most once per post action, exactly as for a
   fresh generation. Dismiss and preview grant ZERO XP. This file contains
   no XP calls of any kind: no creditShare, no award(), no xpGrant, no
   'pf-share-image' dispatch, no postAction except studio_drafts_dismiss.

   Edit: stashes the payload in sessionStorage 'pf_forge_edit_v1' + fires a
   'pf-forge-edit' CustomEvent. If the Poster Forge (#pf-poster) is on this
   page it is pre-filled in place (political tab if one exists, else the
   poster tab); otherwise the user is taken to /create where the forge
   mounts. Edit never publishes — it only opens and pre-fills.

   Read state: opening a preview marks the draft read for this session only.
   Drafts are never cached across sessions — every refresh is a fresh fetch
   under the current callsign's auth secret (owner-only, enforced server-side).

   Refresh: on mount, on the 'pf-drafts-changed' CustomEvent, and a 60s poll
   gated on tray visibility (IntersectionObserver + document.hidden).

   KILL: ?pf_off=forged-tray  or  localStorage pf_disabled_v1='["forged-tray"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('forged-tray')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href0 = window.location.href || '';
    if (href0.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  var EMPTY_COPY = 'Nothing forged for you yet \u2014 take a civic action and the machine will draft your victory lap.';
  var READ_MARKS = {}; /* draft id -> true; session-only, never persisted */

  /* ---------------- mount ---------------- */
  var tray = document.getElementById('pf-forged-tray');
  if (!tray) {
    var ammo = document.getElementById('pf-ammo');
    var warCard = document.getElementById('pf-war-card');
    var anchor = (ammo && ammo.parentNode) ? ammo : (warCard && warCard.parentNode ? warCard : null);
    if (anchor) {
      tray = document.createElement('div');
      tray.id = 'pf-forged-tray';
      try {
        anchor.parentNode.insertBefore(tray, anchor.nextSibling);
      } catch (e1) { tray = null; }
    }
  }
  if (!tray) {
    try {
      var fail = document.createElement('div');
      fail.id = 'pf-forged-tray-missing';
      fail.setAttribute('role', 'alert');
      fail.style.cssText = 'background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;' +
        'font:bold 14px Arial,sans-serif;padding:16px;margin:12px;';
      fail.textContent = 'FORGED FOR YOU HAS NOWHERE TO MOUNT \u2014 ' +
        'add <div id="pf-forged-tray"></div> to the Creator HQ page.';
      if (document.body) document.body.insertBefore(fail, document.body.firstChild);
    } catch (e2) {}
    return;
  }

  /* ---------------- tiny DOM helpers (no innerHTML with data) ---------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e) {} }, 2600);
    } catch (e2) {}
  }
  function friendly(j, fallback) {
    try {
      if (PF && PF.friendlyErr) { var s = PF.friendlyErr(j); if (s) return s; }
      if (j && (j.err || j.error || j.message)) return String(j.err || j.error || j.message);
    } catch (e) {}
    return fallback;
  }
  function phqShare() {
    try { return (PF && PF.PHQShare) ? PF.PHQShare : null; } catch (e) { return null; }
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }

  /* ---------------- styles ---------------- */
  (function styles() {
    try {
      var st = document.createElement('style');
      st.textContent =
        '#pf-forged-tray{max-width:860px;margin:0 auto;padding:10px 4px;font-family:inherit}' +
        '#pf-forged-tray .fft-head{display:flex;align-items:center;gap:10px;margin:6px 0 10px}' +
        '#pf-forged-tray .fft-title{font:900 26px "Arial Black",Arial,sans-serif;color:#f5ead6;letter-spacing:2px;margin:0}' +
        '#pf-forged-tray .fft-unread{background:#c1121f;color:#fff;font:700 13px Arial,sans-serif;border-radius:999px;min-width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;padding:0 7px}' +
        '#pf-forged-tray .fft-sub{color:#c9bfa8;font-size:13px;margin:0 0 10px}' +
        '#pf-forged-tray .fft-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;color:#f5ead6;padding:10px 12px;margin:0 0 8px;cursor:pointer;font-family:inherit}' +
        '#pf-forged-tray .fft-row:hover{border-color:#c1121f}' +
        '#pf-forged-tray .fft-dot{width:10px;height:10px;border-radius:50%;background:#c1121f;flex:0 0 auto}' +
        '#pf-forged-tray .fft-dot.seen{background:#3a3a3a}' +
        '#pf-forged-tray .fft-t{flex:1 1 auto;min-width:0}' +
        '#pf-forged-tray .fft-t b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '#pf-forged-tray .fft-meta{display:flex;gap:8px;align-items:center;margin-top:4px}' +
        '#pf-forged-tray .fft-plugin{font:700 11px Arial,sans-serif;background:#2a0a0a;border:1px solid #c1121f;color:#ffb3b3;padding:2px 8px;border-radius:3px;letter-spacing:1px}' +
        '#pf-forged-tray .fft-age{font-size:12px;color:#c9bfa8}' +
        '#pf-forged-tray .fft-empty{background:#141414;border:1px dashed #3a3a3a;color:#c9bfa8;padding:26px 18px;text-align:center;font-size:14px;line-height:1.6}' +
        '#pf-forged-tray .fft-review{background:#0d0d0d;border:2px solid #c1121f;padding:14px}' +
        '#pf-forged-tray .fft-review h3{margin:0 0 4px;font:900 20px "Arial Black",Arial,sans-serif;color:#f5ead6}' +
        '#pf-forged-tray .fft-src{color:#c9bfa8;font-size:12px;margin:0 0 10px}' +
        '#pf-forged-tray .fft-cvwrap{background:#000;border:1px solid #3a3a3a;margin:0 0 10px}' +
        '#pf-forged-tray .fft-cvwrap canvas{display:block;width:100%;height:auto}' +
        '#pf-forged-tray .fft-unavail{color:#ffb3b3;font-size:14px;padding:22px 12px;text-align:center;background:#1a0505;border:1px solid #c1121f;margin:0 0 10px}' +
        '#pf-forged-tray .fft-btns{display:flex;gap:8px;flex-wrap:wrap}' +
        '#pf-forged-tray .fft-btn{flex:1 1 auto;min-width:110px;border:2px solid #c1121f;background:#c1121f;color:#fff;font:700 14px Arial,sans-serif;padding:10px 12px;cursor:pointer;letter-spacing:1px}' +
        '#pf-forged-tray .fft-btn.ghost{background:transparent;color:#f5ead6;border-color:#3a3a3a}' +
        '#pf-forged-tray .fft-btn.danger{background:transparent;color:#ff8a8a;border-color:#7a1010}' +
        '#pf-forged-tray .fft-btn[disabled]{opacity:.35;cursor:default}' +
        '#pf-forged-tray .fft-note{color:#c9bfa8;font-size:12px;margin:8px 0 0}';
      (document.head || document.getElementsByTagName('head')[0]).appendChild(st);
    } catch (e) {}
  })();

  /* ---------------- state ---------------- */
  var drafts = [];        /* normalized, newest first */
  var reviewId = null;    /* id currently under review, or null for list */
  var fetching = false;

  function tsOf(v) {
    try {
      if (typeof v === 'number' && isFinite(v)) return v < 1e12 ? v * 1000 : v;
      if (typeof v === 'string' && v) { var t = Date.parse(v); return isFinite(t) ? t : 0; }
    } catch (e) {}
    return 0;
  }
  function ageStr(ts) {
    try {
      var s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (!ts || s < 60) return 'just now';
      var m = Math.floor(s / 60);
      if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    } catch (e) { return ''; }
  }
  function normDraft(r) {
    if (!r || typeof r !== 'object') return null;
    var id = String(r.id == null ? '' : r.id);
    if (!id) return null;
    var data = r.data_snapshot;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }
    if (!data || typeof data !== 'object') data = {};
    return {
      id: id,
      plugin: String(r.plugin || 'studio'),
      template: String(r.template || ''),
      title: String(r.title || 'Untitled draft'),
      data: data,
      created: tsOf(r.created),
      read: !!r.read || !!READ_MARKS[id]
    };
  }
  function byId(id) {
    for (var i = 0; i < drafts.length; i++) if (drafts[i].id === id) return drafts[i];
    return null;
  }
  function unreadCount() {
    var n = 0;
    for (var i = 0; i < drafts.length; i++) if (!drafts[i].read) n++;
    return n;
  }

  /* ---------------- backend ---------------- */
  function fetchDrafts(done) {
    done = done || function () {};
    if (fetching) return;
    var backend = '';
    try { backend = window.PF_BACKEND_URL || ''; } catch (e) {}
    if (!backend || !PF.authGetJSONP) { setDrafts([]); done(false); return; }
    fetching = true;
    var idn = ident();
    var params = {};
    if (idn.callsign) params.callsign = idn.callsign;
    if (idn.device) params.device = idn.device;
    try {
      PF.authGetJSONP(backend, 'studio_drafts_get', params, function (j) {
        fetching = false;
        if (j && j.ok && Array.isArray(j.drafts)) {
          var list = [];
          for (var i = 0; i < j.drafts.length; i++) {
            var d = normDraft(j.drafts[i]);
            if (d) list.push(d);
          }
          list.sort(function (a, b) { return b.created - a.created; });
          setDrafts(list);
          done(true);
        } else {
          /* backend down / action unknown / not authed -> empty, gracefully */
          setDrafts([]);
          done(false);
        }
      }, { timeout: 12000 });
    } catch (e) { fetching = false; setDrafts([]); done(false); }
  }
  function setDrafts(list) {
    drafts = list || [];
    if (reviewId && !byId(reviewId)) reviewId = null; /* reviewed draft vanished */
    render();
  }
  function dismissDraft(id) {
    var d = byId(id);
    if (!d) return;
    var idn = ident();
    var params = { id: id };
    if (idn.callsign) params.callsign = idn.callsign;
    var fail = function () { toast('Dismiss failed \u2014 try again.'); };
    try {
      PF.postAction('studio', 'studio_action', 'studio_drafts_dismiss', params, function (j) {
        if (j && j.ok) {
          /* Dismiss grants ZERO XP — just remove the row. */
          drafts = drafts.filter(function (x) { return x.id !== id; });
          delete READ_MARKS[id];
          if (reviewId === id) reviewId = null;
          render();
          toast('Draft dismissed.');
        } else {
          toast(friendly(j, 'Dismiss failed \u2014 try again.'));
        }
      });
    } catch (e) { fail(); }
  }

  /* ---------------- render: list ---------------- */
  function clearTray() {
    try { while (tray.firstChild) tray.removeChild(tray.firstChild); } catch (e) {}
  }
  function renderHead() {
    var head = el('div', 'fft-head');
    head.appendChild(el('h2', 'fft-title', '\u2692 FORGED FOR YOU'));
    var n = unreadCount();
    if (n > 0) head.appendChild(el('span', 'fft-unread', n > 99 ? '99+' : String(n)));
    tray.appendChild(head);
    tray.appendChild(el('p', 'fft-sub',
      'The machine drafts your victory lap. Review it, edit it, post it \u2014 nothing ships without your tap.'));
  }
  function renderList() {
    renderHead();
    if (!drafts.length) {
      tray.appendChild(el('div', 'fft-empty', EMPTY_COPY));
      return;
    }
    for (var i = 0; i < drafts.length; i++) (function (d) {
      var row = el('button', 'fft-row');
      row.setAttribute('type', 'button');
      row.setAttribute('data-did', d.id);
      var dot = el('span', 'fft-dot' + (d.read ? ' seen' : ''));
      var t = el('span', 'fft-t');
      t.appendChild(el('b', null, d.title));
      var meta = el('span', 'fft-meta');
      meta.appendChild(el('span', 'fft-plugin', d.plugin.toUpperCase()));
      meta.appendChild(el('span', 'fft-age', ageStr(d.created)));
      t.appendChild(meta);
      row.appendChild(dot);
      row.appendChild(t);
      row.addEventListener('click', function () { openReview(d.id); });
      tray.appendChild(row);
    })(drafts[i]);
  }

  /* ---------------- render: review ---------------- */
  function openReview(id) {
    var d = byId(id);
    if (!d) return;
    if (!d.read) { d.read = true; READ_MARKS[id] = true; }
    reviewId = id;
    render();
  }
  function closeReview() { reviewId = null; render(); }

  /* Paint once; returns the canvas or null. Never throws, never invents. */
  function paintDraft(d) {
    var S = phqShare();
    if (!S || typeof S.paint !== 'function') return null;
    try {
      var cv = S.paint(d.template, d.data);
      return (cv && cv.getContext) ? cv : null;
    } catch (e) { return null; }
  }

  function renderReview() {
    var d = byId(reviewId);
    if (!d) { reviewId = null; renderList(); return; }
    renderHead();
    var box = el('div', 'fft-review');
    box.appendChild(el('h3', null, d.title));
    box.appendChild(el('p', 'fft-src',
      'Forged by ' + d.plugin.toUpperCase() + ' \u00b7 ' + ageStr(d.created)));
    var cv = paintDraft(d);
    if (cv) {
      var wrap = el('div', 'fft-cvwrap');
      try { cv.style.width = '100%'; cv.style.height = 'auto'; } catch (e) {}
      wrap.appendChild(cv);
      box.appendChild(wrap);
    } else {
      box.appendChild(el('div', 'fft-unavail',
        'Preview unavailable \u2014 this draft\u2019s template isn\u2019t on this device. ' +
        'You can still edit it in the Forge or dismiss it.'));
    }
    var btns = el('div', 'fft-btns');
    var canPost = !!cv;
    var bPost = el('button', 'fft-btn', 'POST');
    bPost.setAttribute('type', 'button');
    if (!canPost) bPost.setAttribute('disabled', 'disabled');
    bPost.addEventListener('click', function () { postDraft(d); });
    var bSave = el('button', 'fft-btn ghost', 'SAVE');
    bSave.setAttribute('type', 'button');
    if (!canPost) bSave.setAttribute('disabled', 'disabled');
    bSave.addEventListener('click', function () { saveDraft(d); });
    var bEdit = el('button', 'fft-btn ghost', 'EDIT');
    bEdit.setAttribute('type', 'button');
    bEdit.addEventListener('click', function () { editDraft(d); });
    var bDis = el('button', 'fft-btn danger', 'DISMISS');
    bDis.setAttribute('type', 'button');
    bDis.addEventListener('click', function () { dismissDraft(d.id); });
    var bBack = el('button', 'fft-btn ghost', '\u2190 TRAY');
    bBack.setAttribute('type', 'button');
    bBack.addEventListener('click', closeReview);
    btns.appendChild(bPost); btns.appendChild(bSave); btns.appendChild(bEdit);
    btns.appendChild(bDis); btns.appendChild(bBack);
    box.appendChild(btns);
    if (!canPost) {
      box.appendChild(el('p', 'fft-note',
        'Post/Save need this template\u2019s painter on the device. Edit opens the Forge anyway.'));
    }
    tray.appendChild(box);
  }
  function render() {
    clearTray();
    if (reviewId) renderReview();
    else renderList();
  }

  /* ---------------- actions ----------------
     POST / SAVE: direct calls into the exact PF.PHQShare entry points a
     fresh generation uses — NO wrapper. The once-per-day share credit gate
     lives inside the share flow itself, so each explicit tap credits at
     most once, exactly as normal. This tray adds nothing. */
  function postDraft(d) {
    var S = phqShare();
    if (!S || typeof S.share !== 'function') { toast('Share unavailable \u2014 try again.'); return; }
    var ok = false;
    try { ok = S.share(d.template, d.data); } catch (e) { ok = false; }
    if (ok === false) toast('This draft can\u2019t post from here \u2014 open it in the Forge.');
  }
  function saveDraft(d) {
    var S = phqShare();
    if (!S || typeof S.save !== 'function') { toast('Save unavailable \u2014 try again.'); return; }
    var ok = false;
    try { ok = S.save(d.template, d.data); } catch (e) { ok = false; }
    if (ok === false) toast('This draft can\u2019t save from here \u2014 open it in the Forge.');
  }

  /* EDIT: open the Poster Forge with plugin/template pre-selected and data
     pre-filled. Never publishes — pre-fill only. */
  function editDraft(d) {
    var payload = {
      plugin: d.plugin, template: d.template, title: d.title,
      data: d.data, draft_id: d.id, source: 'forged-tray'
    };
    try { sessionStorage.setItem('pf_forge_edit_v1', JSON.stringify(payload)); } catch (e) {}
    try { window.PF.studioDraftEdit = payload; } catch (e2) {}
    try { document.dispatchEvent(new CustomEvent('pf-forge-edit', { detail: payload })); } catch (e3) {}
    /* Same-page forge: pre-fill what we can. */
    var forge = null;
    try { forge = document.getElementById('pf-poster'); } catch (e4) {}
    if (forge) {
      var done = prefillForge(forge, payload);
      try { forge.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e5) {}
      toast(done ? 'Draft loaded into the Forge \u2014 review and post when ready.'
                 : 'Forge found \u2014 your draft is queued for it.');
      return;
    }
    /* Forge lives on /create — take the user there with the payload waiting
       in sessionStorage. */
    toast('Opening the Poster Forge with your draft\u2026');
    setTimeout(function () {
      try { window.location.href = '/create'; } catch (e6) {}
    }, 650);
  }
  function prefillForge(forge, payload) {
    var filled = false;
    try {
      /* Political tab if a workstream has added one; else the poster tab. */
      var ptab = forge.querySelector('.p-tab[data-ptab="political"]');
      if (ptab && ptab.click) { ptab.click(); filled = true; }
    } catch (e) {}
    try {
      var head = forge.querySelector('#pHead');
      if (head && payload.title) { head.value = String(payload.title).slice(0, 60); filled = true; }
      var top = forge.querySelector('#pTop');
      if (top && payload.data && payload.data.kicker) { top.value = String(payload.data.kicker).slice(0, 40); filled = true; }
    } catch (e2) {}
    return filled;
  }

  /* ---------------- refresh: mount + event + visible-only poll ---------------- */
  var visible = true;
  try {
    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(function (entries) {
        try { visible = !!(entries && entries[0] && entries[0].isIntersecting); } catch (e) {}
      }, { threshold: 0.02 });
      io.observe(tray);
    }
  } catch (e) {}
  function refresh() {
    if (fetching) return;
    fetchDrafts(function () {});
  }
  try {
    document.addEventListener('pf-drafts-changed', function () { refresh(); });
  } catch (e) {}
  try {
    setInterval(function () {
      if (!visible) return;
      try { if (document.hidden) return; } catch (e) {}
      refresh();
    }, 60000);
  } catch (e2) {}

  /* ---------------- init ---------------- */
  renderList();       /* instant empty state; never a spinner */
  fetchDrafts(function () {});
})();
