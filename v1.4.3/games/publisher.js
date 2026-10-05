/* games/publisher.js  |  PF v1.4.3 | ONE-BUTTON PUBLISHER: CEO compose surface.
   Phase 1: compose once, preview per platform, one PUSH fans out to every
   connected platform. Dry-run only until credentials land (see spec).
   Spec: ~/workspace/specs/one-button-publisher-20261005.md

   ADMIN-ONLY SURFACE: mounts ONLY into the vault admin area (#xVault) when
   the vault is unlocked (#vlLock present) AND the admin secret is readable
   from sessionStorage ('pf_admin_secret', set by the vault unlock). No admin
   secret -> the module refuses to mount (silent no-op; window.PF.publisherDenied
   records 'no-admin-secret' for diagnosability). It never touches public pages.

   BACKEND CONTRACT (fallback — Backend Pod may land publisher action names
   on the feature/one-button-publisher branch of the API repo; until then
   this module speaks the spec §2 post object + the standard {type, action}
   envelope idiom: {type:'publisher', publisher_action:'<action>'} on the
   X-Admin-Secret rail, mirroring operations-admin.js):
     publisher_status      -> {ok, dry_run:bool, live:{...}, connected:{...},
                              targets:{instagram:[{account_id,label,is_default,explicit}],...}}
                                (account inventory; @shanetheswan is never is_default)
     publisher_preview     in {title,body,link,image,targets} ->
                              {ok, previews:{discord:{text,chars,truncated}, ...,
                                             instagram:{..., placement:'feed|story'}},
                               banned:bool}
                                (the worker pins feed vs story at format time)
     publisher_push        in {id,title,body,link,image,platforms,targets,status,dry_run} ->
                              {ok, push_id, platforms:{discord:'queued',...}}
     publisher_push_status in {push_id} -> {ok, push_id,
                              platforms:{discord:'sent|failed|skipped|unknown|queued',...}}
                                (NO retries: unknown is terminal, needs manual
                                 reconciliation in the status board)
     publisher_reconcile   in {push_id, platform, outcome:'sent|failed'} ->
                              {ok} (manual reconciliation of an unknown outcome)
     publisher_history     -> {ok, rows:[{id,at,by,title_hash,dry_run,results:{...}}]}
   The War Report draft load reuses the EXISTING {type:'warreport',
   wr_action:'warreport_latest'} read (same as war-report.js) — no new contract.

   DISPLAY ONLY: no XP logic anywhere in this module (per pod rules).

   Banned terms: client-side pre-check on title+body+link before queueing
   ('donate' and the banned handle — the backend enforces the full list on
   queue; this gate fails open-visible, never silently mints a push).
   The account-target inventory (FALLBACK_TARGETS, backend publisher_status
   targets) is NOT site copy: it is a CEO-only admin selector. The boundary
   there is spec B3, not the banned-term list — @shanetheswan appears in the
   inventory (3rd linked account) but is NEVER a default (safeDefault skips
   explicit-flagged entries) and requires an explicit per-push checkbox before
   PUSH unlocks.
   KILL: ?pf_off=publisher  or  localStorage pf_disabled_v1='["publisher"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('publisher')) return;
  if (window.pfPublisherLoaded) return; window.pfPublisherLoaded = true;

  var BACKEND = window.PF_BACKEND_URL;
  var SECRET_KEY = 'pf_admin_secret';
  var PANEL_ID = 'pfPubAdmin';
  var POLL_MS = 3000, POLL_MAX = 60; /* ~3 min of status polling per push */

  /* ------------------------------------------------------------------
     Action names — one map so the Backend Pod's action names land in one
     place when their branch is up (spec §4 fallback contract above). */
  var PUB_ACTION = {
    status: 'publisher_status',
    preview: 'publisher_preview',
    push: 'publisher_push',
    pushStatus: 'publisher_push_status',
    reconcile: 'publisher_reconcile',
    history: 'publisher_history'
  };

  /* Platform formatter limits from spec §3 (client-side fallback only — the
     authoritative truncation runs in the worker's publisher_preview).
     targetKey = the post-object targets key for the platform. fallbackTargets
     is used only until the backend's publisher_status ships a real account
     inventory. IMPORTANT (spec B3): @shanetheswan is in the inventory (3rd
     linked account) but is NEVER a default — entries flagged explicit:true
     require an explicit per-push confirmation before PUSH unlocks. */
  var FALLBACK_TARGETS = {
    instagram: [
      { id: 'propfac', label: '@propfac', is_default: true },
      { id: 'mtcstw', label: '@mtcstw', is_default: false },
      { id: 'shanetheswan', label: '@shanetheswan', is_default: false, explicit: true }
    ],
    threads: [
      { id: 'propfac', label: '@propfac', is_default: true },
      { id: 'mtcstw', label: '@mtcstw', is_default: false }
    ],
    facebook: [
      { id: 'page1', label: 'MTCSTW (page)', is_default: true },
      { id: 'page2', label: 'The Propaganda Factory (page)', is_default: false }
    ],
    discord: [
      { id: 'default', label: 'Default webhook', is_default: true }
    ],
    substack: []
  };
  var PLATFORMS = [
    { key: 'discord',   label: 'Discord',   limit: 1800, targetKey: 'channel',    note: 'Code cap 1800 (real limit 2000).' },
    { key: 'instagram', label: 'Instagram', limit: 2200, targetKey: 'account_id', placement: true,
      note: 'Feed: 2200 chars. Requires an image — text-only posts need a share card.' },
    { key: 'threads',   label: 'Threads',   limit: 500,  targetKey: 'account_id', note: 'Hard cap 500 chars. Brevity is a weapon.' },
    { key: 'facebook',  label: 'Facebook',  limit: 1024, targetKey: 'page_id',    note: 'Pages: 1024 chars nonblank text. Media optional.' },
    { key: 'substack',  label: 'Substack',  limit: 0,     targetKey: '',           note: 'Email-to-post: subject = title, body = full text. No practical limit.' }
  ];

  /* Banned-term pre-check (client side). The backend enforces the full list
     before queueing; this stops obvious violations from ever leaving the
     browser. 'donate' is banned from all site copy; the removed handle
     stays off the site with no exceptions. */
  var BANNED = ['donate', 'donation', 'shanetheswan'];
  function bannedHit(text) {
    var t = String(text || '').toLowerCase();
    for (var i = 0; i < BANNED.length; i++) {
      if (t.indexOf(BANNED[i]) !== -1) return BANNED[i];
    }
    return '';
  }

  /* Client-side formatter fallback: truncation per spec §3 limits, matching
     the worker's publisher_preview semantics. Used only when the backend
     preview action is unreachable (belt-and-suspenders; flagged in the UI). */
  function localPreview(text, limit) {
    var t = String(text || '');
    if (limit > 0 && t.length > limit) return { text: t.slice(0, limit), chars: t.length, truncated: true };
    return { text: t, chars: t.length, truncated: false };
  }

  /* ---------------- tiny helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function toast(m) { try { if (PF.toast) { PF.toast(m); return; } } catch (e) {} }
  function errCopy(j, fb) {
    try { if (PF.errCopy) return PF.errCopy(j, fb); } catch (e) {}
    return (j && (j.err || j.error)) || fb || 'The wire fought back. Retry.';
  }
  function getAdminSecret() { try { return sessionStorage.getItem(SECRET_KEY) || ''; } catch (e) { return ''; } }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }

  /* ---------------- backend I/O ---------------- */
  /* Admin POST on the X-Admin-Secret rail (mirrors operations-admin.js). */
  function adminPost(cAction, params, cb) {
    var secret = getAdminSecret();
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (!secret) { done({ ok: false, err: 'Vault is locked.' }); return; }
    if (!BACKEND) { done({ ok: false, err: 'no backend' }); return; }
    var body = { type: 'publisher', publisher_action: cAction };
    for (var k in params) body[k] = params[k];
    try {
      var id = ident();
      if (!body.callsign && id.callsign) body.callsign = id.callsign;
      if (PF.getAuthSecret) { var s = PF.getAuthSecret(); if (s) body.auth_secret = s; }
    } catch (e) {}
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret }, body: JSON.stringify(body) };
      var c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e2) {} }, 15000);
        }
      } catch (e3) {}
      fetch(BACKEND, o).then(function (r) { return r.json(); }).then(function (j) {
        if (t) try { clearTimeout(t); } catch (e4) {}
        done(j);
      }).catch(function () { if (t) try { clearTimeout(t); } catch (e5) {} done(null); });
    } catch (e6) { done(null); }
  }

  /* War Report draft: reuses the EXISTING {type:'warreport',
     wr_action:'warreport_latest'} authenticated read (war-report.js). */
  function loadWarDraft(cb) {
    function done(j) { try { cb(j); } catch (e) {} }
    if (!BACKEND) { done(null); return; }
    try {
      var id = ident();
      if (PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, 'warreport_latest', { callsign: id.callsign }, done);
        return;
      }
    } catch (e) {}
    done(null);
  }

  /* ---------------- module state ---------------- */
  var state = {
    previewViewed: false,     /* PUSH requires the preview to have been viewed — no blind pushes */
    localFallback: false,     /* true when the preview came from the client-side fallback */
    toggles: { discord: true, instagram: true, threads: true, facebook: false, substack: false },
    connected: { discord: false, instagram: false, threads: false, facebook: false, substack: false },
    /* Per-platform targets (spec §2 targets block). Account IDs come from the
       backend inventory when available; safe defaults below (never @shanetheswan). */
    targets: {
      instagram: { account_id: 'propfac', placement: 'feed' },
      threads: { account_id: 'propfac' },
      facebook: { page_id: 'page1' },
      discord: { channel: 'default' },
      substack: {}
    },
    inventory: null,          /* backend account inventory from publisher_status; FALLBACK_TARGETS until then */
    explicitAck: {},          /* per-push explicit choice for explicit-flagged targets */
    dryRun: true,
    tab: 'discord',
    polling: false
  };

  /* Safe default target for a platform: the inventory's is_default entry, or
     the first non-explicit entry. NEVER an explicit-flagged target. */
  function safeDefault(key) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++) if (list[i].is_default && !list[i].explicit) return list[i].id;
    for (var j = 0; j < list.length; j++) if (!list[j].explicit) return list[j].id;
    return list.length ? list[0].id : '';
  }
  function targetLabel(key, id) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
    return id;
  }
  function targetExplicit(key, id) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return !!list[i].explicit;
    return false;
  }
  function currentTargetId(key) {
    var t = state.targets[key] || {};
    return t.account_id || t.page_id || t.channel || '';
  }

  /* ---------------- render ---------------- */
  function statusDot(s) {
    var c = '#888';
    if (s === 'sent') c = '#3fb950';
    else if (s === 'failed') c = '#c1121f';
    else if (s === 'skipped') c = '#d29922';
    else if (s === 'unknown') c = '#f0883e';
    else if (s === 'queued') c = '#58a6ff';
    var extra = (s === 'unknown') ? ' — reconcile manually' : '';
    return '<span style="color:' + c + ';font-weight:bold">&#9679;</span> ' + esc(s || 'unknown') + esc(extra);
  }

  function targetSelect(p) {
    if (!p.targetKey) return '';
    var list = state.inventory ? (state.inventory[p.key] || []) : (FALLBACK_TARGETS[p.key] || []);
    if (!list.length) return '';
    var cur = currentTargetId(p.key);
    var opts = list.map(function (t) {
      return '<option value="' + esc(t.id) + '"' + (t.id === cur ? ' selected' : '') + '>'
        + esc(t.label) + (t.explicit ? ' (personal)' : '') + '</option>';
    }).join('');
    return ' <select data-pub-target="' + p.key + '" aria-label="' + esc(p.label) + ' target">' + opts + '</select>';
  }

  function platformRow(p) {
    var on = !!state.toggles[p.key];
    var conn = !!state.connected[p.key];
    var toggle = conn
      ? '<button class="c-btn" data-pub-toggle="' + p.key + '" aria-pressed="' + on + '">' + (on ? 'ON' : 'OFF') + '</button>'
      : '<span class="x-note" style="color:#d29922">NOT CONNECTED</span>';
    var placement = (p.placement)
      ? ' <label class="x-note">placement <select data-pub-placement="instagram" aria-label="Instagram placement">'
        + '<option value="feed"' + (state.targets.instagram.placement === 'feed' ? ' selected' : '') + '>FEED</option>'
        + '<option value="story"' + (state.targets.instagram.placement === 'story' ? ' selected' : '') + '>STORY</option>'
        + '</select></label>'
      : '';
    var ack = '';
    if (targetExplicit(p.key, currentTargetId(p.key))) {
      var acked = !!state.explicitAck[p.key];
      ack = '<div class="x-note" style="color:#f0883e;margin-top:4px"><label>'
        + '<input type="checkbox" data-pub-explicit="' + p.key + '"' + (acked ? ' checked' : '') + '> '
        + 'EXPLICIT PER-PUSH CHOICE: ' + esc(targetLabel(p.key, currentTargetId(p.key)))
        + ' is a personal account, not a brand channel. I choose it deliberately for this push.</label></div>';
    }
    return '<div style="padding:6px 0;border-bottom:1px solid #333">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<b style="min-width:92px">' + esc(p.label) + '</b>'
      + '<span style="flex:1">' + toggle + '</span>'
      + '<span class="x-note">' + targetSelect(p) + placement + '</span></div>'
      + '<div class="x-note">' + esc(p.note) + '</div>'
      + ack + '</div>';
  }

  function previewTabs() {
    return PLATFORMS.map(function (p) {
      var active = state.tab === p.key;
      return '<button class="c-btn" data-pub-tab="' + p.key + '" aria-selected="' + active + '"'
        + (active ? ' style="border-color:#c1121f"' : '') + '>' + esc(p.label) + '</button>';
    }).join(' ');
  }

  function html() {
    return '<div class="x-pane" style="margin-top:14px">'
      + '<h4>&#128266; ONE-BUTTON PUBLISHER</h4>'
      + '<div class="x-note">Write once. The whole network hears it. One platform failing never fails the push.</div>'
      + '<div id="pubDryRun" class="c-err" style="margin:8px 0;display:none">DRY RUN &mdash; nothing publishes.</div>'
      + '<div style="margin-top:10px">'
      + '<label class="x-note" for="pubTitle">HEADLINE</label><br>'
      + '<input id="pubTitle" maxlength="220" placeholder="War Report &mdash; Week of Oct 5" aria-label="Post title"'
      + ' style="width:100%;max-width:560px;padding:8px;font:14px monospace" maxlength="220"></div>'
      + '<div style="margin-top:8px">'
      + '<label class="x-note" for="pubBody">THE WORD (MTCSTW voice &mdash; clean copy only)</label><br>'
      + '<textarea id="pubBody" rows="8" placeholder="Say it like it is. The fight is the headline." aria-label="Post body"'
      + ' style="width:100%;max-width:560px;padding:8px;font:14px monospace"></textarea></div>'
      + '<div style="margin-top:8px">'
      + '<label class="x-note" for="pubLink">LINK (optional)</label><br>'
      + '<input id="pubLink" maxlength="500" placeholder="https://mtcstw.com/..." aria-label="Link"'
      + ' style="width:100%;max-width:560px;padding:8px;font:14px monospace"></div>'
      + '<div style="margin-top:8px">'
      + '<label class="x-note" for="pubImage">IMAGE (optional share-card path under ~/workspace/)</label><br>'
      + '<input id="pubImage" maxlength="500" placeholder="your_files/share-cards/war-report-oct5.png" aria-label="Share card path"'
      + ' style="width:70%;max-width:400px;padding:8px;font:14px monospace"> '
      + '<label class="c-btn" style="cursor:pointer" for="pubImageFile">PICK FILE</label>'
      + '<input id="pubImageFile" type="file" accept="image/*" style="display:none" aria-label="Pick image file">'
      + '<div id="pubImgPrev" style="margin-top:6px"></div>'
      + '<div class="x-note">Instagram requires an image &mdash; a text-only post needs a share card. (Phase 2 auto-generates one.)</div></div>'
      + '<div style="margin-top:10px">'
      + '<button class="c-btn" id="pubLoadDraft">LOAD WAR REPORT DRAFT</button> '
      + '<button class="c-btn" id="pubPreviewBtn">PREVIEW ALL PLATFORMS</button></div>'
      + '<div class="c-err" id="pubErr" style="margin-top:8px"></div>'
      + '<div id="pubTabs" style="margin-top:12px">' + previewTabs() + '</div>'
      + '<div id="pubPreview" class="x-note" style="margin-top:8px">Press PREVIEW ALL PLATFORMS &mdash; no blind pushes. The button stays locked until the preview renders.</div>'
      + '<h4 style="margin-top:12px">FRONT LINES</h4>'
      + '<div id="pubToggles">' + PLATFORMS.map(platformRow).join('') + '</div>'
      + '<div style="margin-top:12px"><button class="c-btn" id="pubPush" disabled style="font-size:17px;padding:12px 34px">PUSH TO THE FRONT LINES</button></div>'
      + '<div id="pubBoard" style="margin-top:10px"></div>'
      + '<h4 style="margin-top:14px">PUBLISH HISTORY (audit log)</h4>'
      + '<div style="margin-bottom:6px"><button class="c-btn" id="pubHistBtn">REFRESH HISTORY</button></div>'
      + '<div id="pubHistory"><div class="x-note">Nothing published yet this session.</div></div>'
      + '</div>';
  }

  function currentPost() {
    var link = safeUrl(val('pubLink'));
    return {
      id: 'pub_' + Date.now() + '_' + Math.floor(Math.random() * 1e6).toString(36),
      title: val('pubTitle'),
      body: val('pubBody'),
      link: link,
      image: val('pubImage'),
      platforms: { discord: !!state.toggles.discord, instagram: !!state.toggles.instagram,
                   threads: !!state.toggles.threads, facebook: !!state.toggles.facebook,
                   substack: !!state.toggles.substack },
      /* spec §2 targets block: explicit per-platform account/page targets. */
      targets: {
        instagram: { account_id: currentTargetId('instagram'), placement: state.targets.instagram.placement },
        threads: { account_id: currentTargetId('threads') },
        facebook: { page_id: currentTargetId('facebook') },
        discord: { channel: currentTargetId('discord') },
        substack: {}
      },
      status: 'draft',
      dry_run: true
    };
  }

  function showErr(m) {
    var el = document.getElementById('pubErr');
    if (el) el.textContent = m || '';
  }

  /* Preview: backend publisher_preview first; client-side fallback (spec §3
     limits) only if the backend action is unreachable — flagged in the UI. */
  function runPreview() {
    showErr('');
    var post = currentPost();
    var hit = bannedHit(post.title + '\n' + post.body + '\n' + post.link);
    if (hit) { showErr('Banned term blocked. Clean the copy and preview again.'); return; }
    if (!post.title && !post.body) { showErr('Give the post a headline or some words first.'); return; }
    var btn = document.getElementById('pubPreviewBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'COMPOSING PREVIEWS\u2026'; }
    adminPost(PUB_ACTION.preview, { title: post.title, body: post.body, link: post.link, image: post.image, targets: post.targets }, function (j) {
      if (btn) { btn.disabled = false; btn.textContent = 'PREVIEW ALL PLATFORMS'; }
      if (j && j.ok && j.previews) {
        state.localFallback = false;
        renderPreviews(j.previews, post, false);
      } else {
        /* Backend preview action unreachable (Backend Pod may not have landed
           it yet) — fall back to the spec §3 client-side formatter so the CEO
           still sees per-platform text. Flagged as a local estimate. */
        state.localFallback = true;
        var fp = {
          discord: localPreview(post.title + '\n' + post.body + (post.link ? '\n' + post.link : ''), 1800),
          instagram: localPreview(post.title + '\n' + post.body + (post.link ? '\n' + post.link : ''), 2200),
          threads: localPreview((post.title ? post.title + '\n' : '') + post.body + (post.link ? '\n' + post.link : ''), 500),
          facebook: localPreview(post.title + '\n' + post.body + (post.link ? '\n' + post.link : ''), 1024),
          substack: localPreview('SUBJECT: ' + post.title + '\n\n' + post.body + (post.link ? '\n\n' + post.link : ''), 0)
        };
        /* Local fallback pins the IG placement the same way the worker would:
           the CEO's explicit choice when an image rides along; no placement
           when the post is text-only ("needs image", never send-discovered). */
        fp.instagram.placement = post.image ? state.targets.instagram.placement : '';
        renderPreviews(fp, post, true);
      }
    });
  }

  function renderPreviews(previews, post, isFallback) {
    state.previewViewed = true;
    var push = document.getElementById('pubPush');
    if (push) push.disabled = false;
    var html2 = isFallback
      ? '<div class="x-note" style="color:#d29922">Local estimate &mdash; the backend formatter is not reachable yet. Limits per spec &sect;3.</div>'
      : '<div class="x-note">Backend formatter output. Exactly what each platform will receive.</div>';
    PLATFORMS.forEach(function (p) {
      var pv = previews[p.key] || { text: '', chars: 0, truncated: false };
      var open = state.tab === p.key;
      /* B5: the preview pins the IG placement (feed vs story) at preview
         time; a text-only post shows "needs image" — never discovered at
         send time. */
      var placeLine = '';
      if (p.key === 'instagram') {
        if (!post.image) {
          placeLine = '<div class="x-note" style="color:#f0883e;font-weight:bold">NEEDS IMAGE &mdash; '
            + 'the IG adapter will skip with "needs image". Attach a share card or the post never rides Instagram.</div>';
        } else {
          var place = String(pv.placement || state.targets.instagram.placement || 'feed').toUpperCase();
          placeLine = '<div class="x-note">Placement pinned: <b>' + esc(place) + '</b> &mdash; decided at preview time.</div>';
        }
      }
      html2 += '<div data-pub-pane="' + p.key + '" style="display:' + (open ? 'block' : 'none')
        + ';margin-top:8px;border:1px solid #444;padding:8px">'
        + '<b>' + esc(p.label) + '</b> &mdash; <span class="x-note">'
        + pv.chars + ' chars' + (p.limit ? ' / ' + p.limit + ' cap' : '')
        + (pv.truncated ? ' &middot; TRUNCATED to fit' : '')
        + '</span>'
        + '<div class="x-note">target: <b>' + esc(targetLabel(p.key, currentTargetId(p.key))) + '</b></div>'
        + placeLine
        + '<div style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin-top:6px">' + esc(pv.text || '(empty)') + '</div>'
        + '</div>';
    });
    var el = document.getElementById('pubPreview');
    if (el) el.innerHTML = html2;
    toast('Preview locked. The PUSH button is live.');
  }

  function switchTab(key) {
    state.tab = key;
    state.previewViewed = true; /* viewing the preview satisfies the no-blind-push rule */
    var tabs = document.getElementById('pubTabs');
    if (tabs) tabs.innerHTML = previewTabs();
    var panes = document.querySelectorAll('[data-pub-pane]');
    for (var i = 0; i < panes.length; i++) {
      panes[i].style.display = (panes[i].getAttribute('data-pub-pane') === key) ? 'block' : 'none';
    }
    var push = document.getElementById('pubPush');
    if (push && document.getElementById('pubPreview') &&
        document.getElementById('pubPreview').querySelector('[data-pub-pane]')) push.disabled = false;
    wirePanel();
  }

  /* PUSH: banned-term scan first, then queue via publisher_push. Status board
     polls publisher_push_status per platform until all resolve. */
  function push() {
    showErr('');
    if (!state.previewViewed) { showErr('No blind pushes. Preview the post first.'); return; }
    var post = currentPost();
    var hit = bannedHit(post.title + '\n' + post.body + '\n' + post.link);
    if (hit) { showErr('Banned term blocked. The push is dead. Clean the copy and preview again.'); return; }
    var any = false, k;
    for (k in post.platforms) if (post.platforms[k]) { any = true; break; }
    if (!any) { showErr('Flip at least one platform ON before the push.'); return; }
    /* Spec B3: an explicit-flagged target (e.g. the personal account) needs
       an explicit per-push confirmation before the button unlocks. */
    var needAck = [];
    PLATFORMS.forEach(function (p) {
      if (post.platforms[p.key] && targetExplicit(p.key, currentTargetId(p.key)) && !state.explicitAck[p.key])
        needAck.push(p.label);
    });
    if (needAck.length) {
      showErr('Explicit choice required: ' + needAck.join(', ') + ' — tick the per-push confirmation under the platform first.');
      return;
    }
    var btn = document.getElementById('pubPush');
    if (btn) { btn.disabled = true; btn.textContent = 'QUEUEING\u2026'; }
    var board = document.getElementById('pubBoard');
    if (board) board.innerHTML = '<div class="x-note">Queueing the push&hellip;</div>';
    adminPost(PUB_ACTION.push, post, function (j) {
      if (!j || !j.ok) {
        if (btn) { btn.disabled = false; btn.textContent = 'PUSH TO THE FRONT LINES'; }
        showErr('Push refused: ' + errCopy(j, 'the backend said no.'));
        return;
      }
      var pid = j.push_id || post.id;
      var init = j.platforms || post.platforms;
      renderBoard(pid, init, true);
      pollStatus(pid, 0);
      refreshHistory();
    });
  }

  function renderBoard(pushId, platforms, queued) {
    var board = document.getElementById('pubBoard');
    if (!board) return;
    state.lastPushId = pushId;
    var rows = PLATFORMS.map(function (p) {
      var st = platforms[p.key];
      if (typeof st === 'boolean') st = st ? 'queued' : 'skipped';
      /* Spec B1: an unknown outcome is terminal — the adapter MUST NOT retry.
         The board surfaces it with a manual-reconciliation affordance. */
      var recon = (st === 'unknown')
        ? '<span style="margin-left:10px"><button class="c-btn" data-pub-reconcile="' + p.key + ':sent">MARK SENT</button> '
          + '<button class="c-btn" data-pub-reconcile="' + p.key + ':failed">MARK FAILED</button></span>'
          + '<span class="x-note" style="margin-left:6px">Check the platform yourself, then record the outcome. No retry — ever.</span>'
        : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #333">'
        + '<b style="min-width:92px">' + esc(p.label) + '</b>'
        + '<span>' + statusDot(st) + '</span>' + recon + '</div>';
    }).join('');
    board.innerHTML = '<div class="x-pane" style="margin-top:6px"><h4>PUSH STATUS</h4>'
      + '<div class="x-note">push_id ' + esc(pushId) + ' &mdash; one platform failing never fails the push.</div>'
      + rows
      + (queued ? '<div class="x-note" style="margin-top:6px">Watching the wire for final states&hellip;</div>' : '')
      + '</div>';
    wireReconcile();
  }

  /* Manual reconciliation of an unknown outcome: the CEO records what the
     platform actually did. No retry is ever issued. */
  function reconcile(platform, outcome) {
    var pid = state.lastPushId;
    if (!pid) return;
    adminPost(PUB_ACTION.reconcile, { push_id: pid, platform: platform, outcome: outcome }, function (j) {
      if (j && j.ok) {
        toast('Recorded: ' + platform + ' → ' + outcome + '.');
        adminPost(PUB_ACTION.pushStatus, { push_id: pid }, function (j2) {
          if (j2 && j2.ok && j2.platforms) renderBoard(pid, j2.platforms, false);
        });
      } else {
        showErr('Reconciliation refused: ' + errCopy(j, 'the backend said no.'));
      }
    });
  }
  function wireReconcile() {
    var btns = document.querySelectorAll('[data-pub-reconcile]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        if (b._wired) return; b._wired = true;
        b.onclick = function () {
          var parts = String(b.getAttribute('data-pub-reconcile') || '').split(':');
          if (parts.length === 2) reconcile(parts[0], parts[1]);
        };
      })(btns[i]);
    }
  }

  function pollStatus(pushId, n) {
    if (n >= POLL_MAX) { state.polling = false; rearmPush(); return; }
    state.polling = true;
    setTimeout(function () {
      adminPost(PUB_ACTION.pushStatus, { push_id: pushId }, function (j) {
        if (j && j.ok && j.platforms) {
          var done = true, k;
          for (k in j.platforms) {
            var st = j.platforms[k];
            /* Only 'queued' keeps the poll alive. 'unknown' is terminal by
               design (spec B1): the adapter must not retry, the CEO
               reconciles it by hand from the status board. */
            if (st === 'queued') { done = false; break; }
          }
          renderBoard(pushId, j.platforms, !done);
          if (done) { state.polling = false; rearmPush(); refreshHistory(); return; }
          pollStatus(pushId, n + 1);
        } else {
          state.polling = false; rearmPush();
        }
      });
    }, POLL_MS);
  }

  function rearmPush() {
    var btn = document.getElementById('pubPush');
    if (btn) { btn.disabled = !state.previewViewed; btn.textContent = 'PUSH TO THE FRONT LINES'; }
  }

  function fmtTs(ms) {
    try { var d = new Date(Number(ms)); if (!isNaN(d.getTime())) return d.toLocaleString(); } catch (e) {}
    return '';
  }

  function refreshHistory() {
    var el = document.getElementById('pubHistory');
    if (!el) return;
    adminPost(PUB_ACTION.history, {}, function (j) {
      if (!j || !j.ok || !j.rows || !j.rows.length) {
        el.innerHTML = '<div class="x-note">Nothing in the audit log yet.</div>';
        return;
      }
      var html2 = j.rows.slice(0, 20).map(function (r) {
        var res = r.results || {};
        var bits = PLATFORMS.map(function (p) {
          return esc(p.label) + ': ' + esc(res[p.key] || '—');
        }).join(' · ');
        return '<div style="padding:6px 0;border-bottom:1px solid #333">'
          + '<b>' + esc(fmtTs(r.at)) + '</b> &mdash; ' + esc(r.by || 'command')
          + ' &mdash; hash <span style="font-family:monospace">' + esc(r.title_hash || '') + '</span>'
          + (r.dry_run ? ' <span class="x-note">[DRY RUN]</span>' : ' <span class="c-err">[LIVE]</span>')
          + '<div class="x-note">' + bits + '</div></div>';
      }).join('');
      el.innerHTML = html2;
    });
  }

  /* Load the backend's credential/live flags: dry-run banner + toggles. */
  function loadStatus() {
    adminPost(PUB_ACTION.status, {}, function (j) {
      if (!j || !j.ok) return;
      if (j.connected) {
        var k;
        for (k in j.connected) state.connected[k] = !!j.connected[k];
        /* Unconnected platforms are forced off and unflippable. */
        for (k in state.toggles) {
          if (!state.connected[k]) state.toggles[k] = false;
        }
      }
      /* Spec B3: the backend ships the real account inventory. Apply safe
         defaults (never an explicit-flagged target) and re-render. */
      if (j.targets) {
        state.inventory = j.targets;
        PLATFORMS.forEach(function (p) {
          if (!p.targetKey || !state.targets[p.key]) return;
          var d = safeDefault(p.key);
          if (d) state.targets[p.key][p.targetKey] = d;
          state.explicitAck[p.key] = false;
        });
      }
      if (typeof j.dry_run === 'boolean') state.dryRun = j.dry_run;
      var banner = document.getElementById('pubDryRun');
      var anyLive = false, kk;
      if (j.live) for (kk in j.live) if (j.live[kk]) { anyLive = true; break; }
      if (banner) banner.style.display = (state.dryRun || !anyLive) ? 'block' : 'none';
      var tg = document.getElementById('pubToggles');
      if (tg) tg.innerHTML = PLATFORMS.map(platformRow).join('');
      wirePanel();
    });
  }

  /* ---------------- wiring ---------------- */
  function wirePanel() {
    var toggles = document.querySelectorAll('[data-pub-toggle]');
    for (var i = 0; i < toggles.length; i++) {
      (function (b) {
        b.onclick = function () {
          var key = b.getAttribute('data-pub-toggle');
          if (!state.connected[key]) return; /* unflippable */
          state.toggles[key] = !state.toggles[key];
          b.textContent = state.toggles[key] ? 'ON' : 'OFF';
          b.setAttribute('aria-pressed', state.toggles[key] ? 'true' : 'false');
        };
      })(toggles[i]);
    }
    var tabs = document.querySelectorAll('[data-pub-tab]');
    for (var t = 0; t < tabs.length; t++) {
      (function (b) {
        b.onclick = function () { switchTab(b.getAttribute('data-pub-tab')); };
      })(tabs[t]);
    }
    var file = document.getElementById('pubImageFile');
    if (file && !file._wired) {
      file._wired = true;
      file.onchange = function () {
        try {
          var f = file.files && file.files[0];
          if (!f) return;
          var rd = new FileReader();
          rd.onload = function () {
            var prev = document.getElementById('pubImgPrev');
            if (prev) prev.innerHTML = '<img src="' + String(rd.result || '').slice(0, 200000)
              + '" alt="image preview" style="max-width:180px;max-height:120px;border:1px solid #555">'
              + '<div class="x-note">Local preview only &mdash; put the share-card path in the IMAGE field so the backend can attach it.</div>';
          };
          rd.readAsDataURL(f);
        } catch (e) {}
      };
    }
    /* Target + placement + explicit-choice wiring (spec B3). Changing a
       target resets the per-push explicit acknowledgement. */
    var tsel = document.querySelectorAll('[data-pub-target]');
    for (var g = 0; g < tsel.length; g++) {
      (function (s) {
        if (s._wired) return; s._wired = true;
        s.onchange = function () {
          var key = s.getAttribute('data-pub-target');
          var tk = null;
          PLATFORMS.forEach(function (p) { if (p.key === key) tk = p.targetKey; });
          if (tk && state.targets[key]) state.targets[key][tk] = s.value;
          state.explicitAck[key] = false;
          state.previewViewed = false; /* new targeting -> re-preview before pushing */
          var tg = document.getElementById('pubToggles');
          if (tg) { tg.innerHTML = PLATFORMS.map(platformRow).join(''); wirePanel(); }
          var push2 = document.getElementById('pubPush');
          if (push2) push2.disabled = true;
        };
      })(tsel[g]);
    }
    var psel = document.querySelectorAll('[data-pub-placement]');
    for (var h = 0; h < psel.length; h++) {
      (function (s) {
        if (s._wired) return; s._wired = true;
        s.onchange = function () {
          state.targets.instagram.placement = s.value;
          state.previewViewed = false;
          var push3 = document.getElementById('pubPush');
          if (push3) push3.disabled = true;
        };
      })(psel[h]);
    }
    var acks = document.querySelectorAll('[data-pub-explicit]');
    for (var a = 0; a < acks.length; a++) {
      (function (c) {
        if (c._wired) return; c._wired = true;
        c.onchange = function () {
          state.explicitAck[c.getAttribute('data-pub-explicit')] = !!c.checked;
        };
      })(acks[a]);
    }
  }

  function wireRoot() {
    var draft = document.getElementById('pubLoadDraft');
    if (draft && !draft._wired) {
      draft._wired = true;
      draft.onclick = function () {
        draft.disabled = true; draft.textContent = 'PULLING THE DRAFT\u2026';
        loadWarDraft(function (j) {
          draft.disabled = false; draft.textContent = 'LOAD WAR REPORT DRAFT';
          if (j && j.ok && j.report) {
            var t = document.getElementById('pubTitle');
            var b = document.getElementById('pubBody');
            if (t && !t.value) t.value = String(j.report.subject || '');
            if (b && !b.value) b.value = String(j.report.body || '');
            toast('Draft loaded. Read it like the enemy will, then preview.');
          } else {
            showErr('No War Report draft on the wire. ' + errCopy(j, ''));
          }
        });
      };
    }
    var pv = document.getElementById('pubPreviewBtn');
    if (pv && !pv._wired) { pv._wired = true; pv.onclick = runPreview; }
    var pushBtn = document.getElementById('pubPush');
    if (pushBtn && !pushBtn._wired) { pushBtn._wired = true; pushBtn.onclick = push; }
    var hist = document.getElementById('pubHistBtn');
    if (hist && !hist._wired) { hist._wired = true; hist.onclick = refreshHistory; }
    wirePanel();
  }

  /* ---------------- mount: admin-gated ---------------- */
  function mount() {
    try {
      var vault = document.getElementById('xVault');
      if (!vault) return;
      if (!document.getElementById('vlLock')) return; /* vault not unlocked */
      if (document.getElementById(PANEL_ID)) return; /* already mounted */
      /* ADMIN GATE: no admin secret -> refuse to mount. This is the CEO-only
         rail; there is no public mount path and never will be. */
      if (!getAdminSecret()) {
        PF.publisherDenied = 'no-admin-secret';
        return;
      }
      var host = document.createElement('div');
      host.id = PANEL_ID;
      host.innerHTML = html();
      vault.appendChild(host);
      wireRoot();
      loadStatus();
      refreshHistory();
      PF.log('publisher', 'compose surface mounted (admin).');
    } catch (e) { PF.error('publisher', e); }
  }

  setInterval(mount, 2000);
  mount();
})();
