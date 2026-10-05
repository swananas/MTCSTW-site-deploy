/* games/publisher.js  |  PF v1.4.3 | ONE-BUTTON PUBLISHER: Substack-origin staging.
   Phase 2 (2026-10-05 CEO architecture flip): Substack is the ORIGIN. Shane
   publishes on Substack (subscribers get emailed automatically); the worker's
   hourly /feed RSS poll stages new posts as drafts with per-platform
   derivatives frozen at stage time; the CEO reviews the staged batch, checks
   the checklist, and hits one PUSH — site repost + social fan-out through
   the same outbox/drainer rails. Default is GATED (manual push). The
   site-origin compose surface is dropped; the Substack email-to-post rail
   is dead.
   Spec: ~/workspace/specs/one-button-publisher-20261005.md

   ADMIN-ONLY SURFACE: mounts ONLY into the vault admin area (#xVault) when
   the vault is unlocked (#vlLock present) AND the admin secret is readable
   from sessionStorage ('pf_admin_secret', set by the vault unlock). No admin
   secret -> the module refuses to mount (silent no-op; window.PF.publisherDenied
   records 'no-admin-secret' for diagnosability). It never touches public pages.

   BACKEND CONTRACT (publisher_* aliases on the X-Admin-Secret rail):
     publisher_status      -> {ok, dry_run, live, connected, targets}
     publisher_staged      -> {ok, staged:[{draft_id,title,link,image,platforms,
                              targets,derivatives,checklist,all_ok,created_at}]}
     publisher_poll        -> {ok, poll:{checked,staged,skipped,errors}}
     publisher_ingest      -> {ok, ingest:{staged,draft_id,reason}}
     publisher_draft_get   in {id} -> {ok, draft:{...,body_html,derivatives}}
     publisher_checklist   in {draft_id,platforms?,targets?} ->
                              {ok, checklist:[{key,label,ok,detail}], all_ok}
     publisher_enqueue     in {draft_id,platforms?,targets?} -> {ok, outbox_id}
     publisher_push        in {outbox_id} -> {ok, outbox_id, results, dry_run}
     publisher_push_status in {id} -> {ok, outbox:{results:{...}}}
     publisher_reconcile   in {outbox_id,platform,outcome} -> {ok}
     publisher_history     -> {ok, rows:[...]}

   DISPLAY ONLY: no XP logic anywhere in this module (per pod rules).
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
     Action names — one map so backend action names land in one place. */
  var PUB_ACTION = {
    status: 'publisher_status',
    staged: 'publisher_staged',
    poll: 'publisher_poll',
    draftGet: 'publisher_draft_get',
    checklist: 'publisher_checklist',
    enqueue: 'publisher_enqueue',
    push: 'publisher_push',
    pushStatus: 'publisher_push_status',
    reconcile: 'publisher_reconcile',
    history: 'publisher_history'
  };

  /* Account inventory (CEO-only admin selector). B3: @shanetheswan is in the
     inventory but NEVER a default — explicit:true entries require an explicit
     per-push confirmation before PUSH unlocks. */
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
    ]
  };
  var PLATFORMS = [
    { key: 'discord',   label: 'Discord',   limit: 1800, targetKey: 'channel',    note: 'Code cap 1800 (real limit 2000).' },
    { key: 'instagram', label: 'Instagram', limit: 2200, targetKey: 'account_id', placement: true,
      note: 'Feed: 2200 chars. Requires an image — text-only posts auto-generate a share card.' },
    { key: 'threads',   label: 'Threads',   limit: 500,  targetKey: 'account_id', note: 'Hard cap 500 chars. Brevity is a weapon.' },
    { key: 'facebook',  label: 'Facebook',  limit: 1024, targetKey: 'page_id',    note: 'Pages: 1024 chars nonblank text. Media optional.' }
  ];
  /* The site repost rides every push as the pseudo-platform 'site'. */

  var BANNED = ['donate', 'donation', 'shanetheswan'];
  function bannedHit(text) {
    var t = String(text || '').toLowerCase();
    for (var i = 0; i < BANNED.length; i++) if (t.indexOf(BANNED[i]) >= 0) return BANNED[i];
    return '';
  }

  var state = {
    staged: [], selected: null, detail: null, checklist: [], allOk: false,
    tab: 'threads', toggles: {}, targets: {}, explicitAck: {},
    connected: {}, live: {}, dryRun: true, inventory: null,
    outboxId: null, lastPushId: null, polling: false, busy: false,
    /* Psych (b): per-derivatives-tab viewed tracking. PUSH arms only when
       every preview tab has been viewed AND the server checklist is green. */
    viewed: {}
  };
  var VIEW_TABS = ['threads', 'facebook', 'instagram', 'discord', 'site'];
  function allTabsViewed() {
    for (var i = 0; i < VIEW_TABS.length; i++) {
      if (!state.viewed[VIEW_TABS[i]]) return false;
    }
    return true;
  }
  function renderViewed() {
    var el = document.getElementById('pubViewed');
    if (!el) return;
    var bits = VIEW_TABS.map(function (k) {
      return (state.viewed[k] ? '&#10003;' : '&#9675;') + ' ' + k;
    });
    el.innerHTML = 'Previewed tabs: ' + bits.join(' &middot; ')
      + (allTabsViewed() ? '' : ' <span style="color:#d29922">&mdash; open every tab to arm PUSH</span>');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return (/^https?:\/\//i.test(s)) ? s : '';
  }
  function toast(m) { try { if (PF.toast) { PF.toast(m); return; } } catch (e) {} }
  function errCopy(j, fb) {
    if (j && j.err) return j.err;
    if (j && j.error) return j.error;
    return fb || 'request failed';
  }
  function getAdminSecret() { try { return sessionStorage.getItem(SECRET_KEY) || ''; } catch (e) { return ''; } }
  function ident() {
    try { return sessionStorage.getItem('pf_callsign') || sessionStorage.getItem('pf_handle') || 'ceo'; }
    catch (e) { return 'ceo'; }
  }
  function adminPost(cAction, params, cb) {
    var xhr = new XMLHttpRequest();
    try { xhr.open('POST', BACKEND, true); } catch (e) { cb(null); return; }
    xhr.setRequestHeader('Content-Type', 'application/json');
    var sec = getAdminSecret();
    if (sec) xhr.setRequestHeader('X-Admin-Secret', sec);
    xhr.timeout = 25000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var j = null;
      try { j = JSON.parse(xhr.responseText || 'null'); } catch (e) {}
      cb(j);
    };
    xhr.onerror = function () { cb(null); };
    xhr.ontimeout = function () { cb(null); };
    var body = { type: 'publisher', publisher_action: cAction, _adminSecret: sec, _actor: ident() };
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) body[k] = params[k];
    try { xhr.send(JSON.stringify(body)); } catch (e) { cb(null); }
  }

  /* ---------------- target machinery (B3) ---------------- */
  function safeDefault(key) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++)
      if (list[i].is_default && !list[i].explicit) return list[i].id;
    for (var j = 0; j < list.length; j++)
      if (!list[j].explicit) return list[j].id;
    return list.length ? list[0].id : '';
  }
  function targetLabel(key, id) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
    return id || '';
  }
  function targetExplicit(key, id) {
    var list = state.inventory ? (state.inventory[key] || []) : (FALLBACK_TARGETS[key] || []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return !!list[i].explicit;
    return false;
  }
  function currentTargetId(key) {
    return (state.targets[key] && state.targets[key].id) || safeDefault(key);
  }
  function statusDot(s) {
    var c = '#888';
    if (s === 'sent') c = '#3fb950';
    else if (s === 'failed') c = '#c1121f';
    else if (s === 'skipped') c = '#d29922';
    else if (s === 'unknown') c = '#f0883e';
    else if (s === 'queued' || s === 'dry') c = '#58a6ff';
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
        + '<option value="feed"' + ((state.targets.instagram && state.targets.instagram.placement === 'feed') ? ' selected' : '') + '>FEED</option>'
        + '<option value="story"' + ((state.targets.instagram && state.targets.instagram.placement === 'story') ? ' selected' : '') + '>STORY</option>'
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
    var tabs = PLATFORMS.map(function (p) {
      var active = state.tab === p.key;
      return '<button class="c-btn" data-pub-tab="' + p.key + '" aria-selected="' + active + '"'
        + (active ? ' style="border-color:#c1121f"' : '') + '>' + esc(p.label) + '</button>';
    });
    var siteActive = state.tab === 'site';
    tabs.push('<button class="c-btn" data-pub-tab="site" aria-selected="' + siteActive + '"'
      + (siteActive ? ' style="border-color:#c1121f"' : '') + '>SITE</button>');
    return tabs.join(' ');
  }

  /* ---------------- share-card preview (canvas mirror of make-share-card.py) ---------------- */
  function wrapText(ctx, text, cx, y, maxW, lh) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, cx, y + i * lh); });
    return lines.length;
  }
  function drawShareCard(canvas, spec) {
    try {
      var S = 540, ctx = canvas.getContext('2d');
      canvas.width = S; canvas.height = S;
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#c1121f'; ctx.fillRect(0, 0, S, 14); ctx.fillRect(0, S - 14, S, 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Georgia, serif';
      var n = wrapText(ctx, '\u201C' + String(spec.quote || '') + '\u201D', S / 2, 150, S - 110, 44);
      var base = 150 + n * 44;
      ctx.fillStyle = '#c1121f';
      ctx.font = 'bold 38px Arial, sans-serif';
      ctx.fillText(String(spec.cta || 'JOIN THE FIGHT.'), S / 2, Math.min(base + 60, S - 96));
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(String(spec.brand || 'MTCSTW.COM'), S / 2, S - 52);
    } catch (e) {}
  }

  /* ---------------- staged queue ---------------- */
  function html() {
    return '<div class="x-pane" style="margin-top:14px">'
      + '<h4>&#128266; ONE-BUTTON PUBLISHER</h4>'
      + '<div class="x-note">Substack is the origin. You publish there; the worker stages the post here with every derivative pre-built. One platform failing never fails the push.</div>'
      + '<div id="pubDryRun" class="c-err" style="margin:8px 0;display:none">DRY RUN &mdash; nothing publishes.</div>'
      + '<div style="margin-top:10px">'
      + '<button class="c-btn" id="pubPollBtn">CHECK FOR NEW POSTS</button> '
      + '<button class="c-btn" id="pubStagedBtn">REFRESH STAGED</button>'
      + '<span class="x-note" id="pubPollNote" style="margin-left:8px"></span></div>'
      + '<div class="c-err" id="pubErr" style="margin-top:8px"></div>'
      + '<h4 style="margin-top:12px">STAGED FROM SUBSTACK</h4>'
      + '<div id="pubQueue"><div class="x-note">Loading staged drafts&hellip;</div></div>'
      + '<div id="pubDetail" style="margin-top:12px"></div>'
      + '<div id="pubBoard" style="margin-top:10px"></div>'
      + '<h4 style="margin-top:14px">PUBLISH HISTORY (audit log)</h4>'
      + '<div style="margin-bottom:6px"><button class="c-btn" id="pubHistBtn">REFRESH HISTORY</button></div>'
      + '<div id="pubHistory"><div class="x-note">Nothing published yet this session.</div></div>'
      + '</div>';
  }

  function showErr(m) {
    var el = document.getElementById('pubErr');
    if (el) el.textContent = m || '';
  }

  function loadStaged(cb) {
    adminPost(PUB_ACTION.staged, {}, function (j) {
      if (j && j.ok && j.staged) {
        state.staged = j.staged;
        renderQueue();
        if (cb) cb(true);
      } else {
        showErr('Staged queue unreachable: ' + errCopy(j, 'the backend said no.'));
        if (cb) cb(false);
      }
    });
  }
  function renderQueue() {
    var el = document.getElementById('pubQueue');
    if (!el) return;
    if (!state.staged.length) {
      el.innerHTML = '<div class="x-note">Nothing staged. Publish on Substack, then hit CHECK FOR NEW POSTS.</div>';
      return;
    }
    el.innerHTML = state.staged.map(function (s) {
      var sel = state.selected === s.draft_id;
      var badge = s.all_ok
        ? '<span style="color:#3fb950;font-weight:bold">READY</span>'
        : '<span style="color:#d29922;font-weight:bold">CHECK</span>';
      var threadNote = (s.derivatives && s.derivatives.threads && s.derivatives.threads.count)
        ? ' &middot; ' + esc(String(s.derivatives.threads.count)) + '-post thread' : '';
      return '<div style="padding:8px 0;border-bottom:1px solid #333">'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + '<b style="flex:1">' + esc(s.title || '(untitled)') + '</b>'
        + badge + ' '
        + '<button class="c-btn" data-pub-select="' + esc(s.draft_id) + '">' + (sel ? 'SELECTED' : 'REVIEW') + '</button>'
        + '</div>'
        + '<div class="x-note">staged ' + esc(fmtTs(s.created_at))
        + (s.link ? ' &middot; <a href="' + esc(s.link) + '" target="_blank" rel="noopener">view on Substack</a>' : '')
        + threadNote + '</div>'
        + '</div>';
    }).join('');
    var btns = el.querySelectorAll('[data-pub-select]');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        if (b._wired) return; b._wired = true;
        b.onclick = function () { selectDraft(b.getAttribute('data-pub-select')); };
      })(btns[i]);
    }
  }

  function pollNow() {
    var btn = document.getElementById('pubPollBtn');
    var note = document.getElementById('pubPollNote');
    if (btn) { btn.disabled = true; btn.textContent = 'CHECKING\u2026'; }
    if (note) note.textContent = '';
    showErr('');
    adminPost(PUB_ACTION.poll, {}, function (j) {
      if (btn) { btn.disabled = false; btn.textContent = 'CHECK FOR NEW POSTS'; }
      if (j && j.ok && j.poll) {
        var p = j.poll;
        var msg = 'Checked ' + p.checked + ' posts: ' + p.staged.length + ' staged, ' + p.skipped + ' already seen'
          + (p.errors && p.errors.length ? ' (' + p.errors.length + ' errors)' : '') + '.';
        if (note) note.textContent = msg;
        toast(msg);
        loadStaged();
      } else {
        showErr('Poll failed: ' + errCopy(j, 'the backend said no.'));
      }
    });
  }

  function selectDraft(id) {
    state.selected = id;
    state.detail = null;
    state.checklist = [];
    state.allOk = false;
    state.tab = 'threads';
    state.viewed = {};
    renderQueue();
    var el = document.getElementById('pubDetail');
    if (el) el.innerHTML = '<div class="x-note">Loading draft&hellip;</div>';
    adminPost(PUB_ACTION.draftGet, { id: id }, function (j) {
      if (!j || !j.ok || !j.draft) {
        if (el) el.innerHTML = '<div class="c-err">Draft not found.</div>';
        return;
      }
      var d = j.draft;
      try { if (typeof d.platforms === 'string') d.platforms = JSON.parse(d.platforms); } catch (e) {}
      try { if (typeof d.targets === 'string') d.targets = JSON.parse(d.targets); } catch (e) {}
      try { if (typeof d.derivatives === 'string') d.derivatives = JSON.parse(d.derivatives); } catch (e) {}
      state.detail = d;
      /* Toggles seed from the stage-time defaults; the CEO adjusts per push. */
      state.toggles = {};
      PLATFORMS.forEach(function (p) {
        state.toggles[p.key] = !!(d.platforms && d.platforms[p.key] !== undefined
          ? d.platforms[p.key] : (p.key !== 'facebook'));
      });
      state.targets = { instagram: { id: safeDefault('instagram'), placement: 'feed' },
        threads: { id: safeDefault('threads') }, facebook: { id: safeDefault('facebook') },
        discord: { id: safeDefault('discord') } };
      state.explicitAck = {};
      renderDetail();
      refreshChecklist();
    });
  }

  /* ---------------- detail: derivatives, checklist, PUSH ---------------- */
  function renderDetail() {
    var el = document.getElementById('pubDetail');
    if (!el || !state.detail) return;
    var d = state.detail;
    el.innerHTML = '<div class="x-pane" style="border:1px solid #555;padding:10px">'
      + '<h4 style="margin-top:0">' + esc(d.title || '(untitled)') + '</h4>'
      + '<div class="x-note">source: Substack'
      + (d.link ? ' &middot; <a href="' + esc(d.link) + '" target="_blank" rel="noopener">view original</a>' : '')
      + '</div>'
      + '<div id="pubTabs" style="margin-top:10px">' + previewTabs() + '</div>'
      + '<div id="pubPreview" style="margin-top:8px"></div>'
      + '<h4 style="margin-top:12px">PRE-FLIGHT CHECKLIST</h4>'
      + '<div id="pubChecklist"><div class="x-note">Checking&hellip;</div></div>'
      + '<h4 style="margin-top:12px">FRONT LINES</h4>'
      + '<div id="pubToggles">' + PLATFORMS.map(platformRow).join('') + '</div>'
      + '<div style="margin-top:12px"><button class="c-btn" id="pubPush" disabled style="font-size:17px;padding:12px 34px">PUSH TO THE FRONT LINES</button></div>'
      + '<div class="x-note" id="pubViewed" style="margin-top:6px"></div>'
      + '<div class="x-note" style="margin-top:6px">The site repost publishes to mtcstw.com with every push. Derivatives were frozen when the post was staged.</div>'
      + '</div>';
    renderDerivatives();
    /* The default tab is on screen at render — it counts as viewed. */
    state.viewed[state.tab] = true;
    renderViewed();
    armPush(state.allOk);
    wireDetail();
  }

  function blockedBadge(dv) {
    if (dv && dv.blocked) {
      return '<div class="c-err" style="font-weight:bold">BLOCKED — banned term: '
        + esc((dv.blocked_terms || []).join(', ')) + '. This platform is skipped at push.</div>';
    }
    return '';
  }

  function renderDerivatives() {
    var box = document.getElementById('pubPreview');
    if (!box || !state.detail) return;
    var derv = state.detail.derivatives || {};
    var d = state.detail;
    var html2 = '<div class="x-note">Derivatives frozen at stage time. Exactly what each platform will receive.</div>';
    var pane = function (key, inner) {
      return '<div data-pub-pane="' + key + '" style="display:' + (state.tab === key ? 'block' : 'none')
        + ';margin-top:8px;border:1px solid #444;padding:8px">' + inner + '</div>';
    };
    /* Threads */
    var th = derv.threads || {};
    var thHtml = '<b>Threads</b> &mdash; <span class="x-note">' + (th.count || 0) + ' posts'
      + (th.truncated ? ' &middot; TRUNCATED to fit' : '') + '</span>' + blockedBadge(th);
    (th.posts || []).forEach(function (p, i) {
      thHtml += '<div style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin-top:6px;border-top:1px dashed #444;padding-top:6px">'
        + '<b>' + (i + 1) + '/' + (th.count || 0) + '</b> (' + p.length + ' chars)<br>' + esc(p) + '</div>';
    });
    html2 += pane('threads', thHtml);
    /* Facebook */
    var fb = derv.facebook || {};
    html2 += pane('facebook', '<b>Facebook</b> &mdash; <span class="x-note">' + (fb.chars || 0)
      + ' chars' + (fb.truncated ? ' &middot; TRUNCATED to fit' : '') + '</span>' + blockedBadge(fb)
      + '<div style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin-top:6px">' + esc(fb.text || '(empty)') + '</div>');
    /* Instagram */
    var ig = derv.instagram || {};
    var igHtml = '<b>Instagram</b>' + blockedBadge(ig);
    if (ig.image) {
      igHtml += '<div class="x-note">attached image: ' + esc(ig.image) + '</div>';
    } else if (ig.share_card) {
      igHtml += '<div class="x-note">auto-generated pull-quote share card (rendered VM-side at push):</div>'
        + '<div class="x-note" style="color:#d29922;font-weight:bold">PREVIEW APPROXIMATION &mdash; this canvas is a layout mirror, not the final card. The drainer renders the shipped card from the frozen share-card spec.</div>'
        + '<canvas data-pub-card="1" style="width:270px;height:270px;border:1px solid #444;margin-top:6px"></canvas>';
    } else if (ig.needs_image) {
      igHtml += '<div class="x-note" style="color:#f0883e;font-weight:bold">NEEDS IMAGE &mdash; attach a share card before push or Instagram skips.</div>';
    }
    igHtml += '<div style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin-top:6px">' + esc(ig.caption || '(empty)') + '</div>';
    html2 += pane('instagram', igHtml);
    /* Discord */
    var dc = derv.discord || {};
    html2 += pane('discord', '<b>Discord</b> &mdash; <span class="x-note">' + (dc.chars || 0)
      + ' chars' + (dc.truncated ? ' &middot; TRUNCATED to fit' : '') + '</span>' + blockedBadge(dc)
      + '<div style="white-space:pre-wrap;font-family:monospace;font-size:13px;margin-top:6px">' + esc(dc.text || '(empty)') + '</div>');
    /* Site repost */
    var siteHtml = '<b>SITE</b> &mdash; <span class="x-note">the mtcstw.com article that publishes with this push</span>'
      + '<div style="margin-top:8px;border:1px solid #333;padding:10px;background:#111">'
      + '<h3 style="margin-top:0">' + esc(d.title || '') + '</h3>'
      + String(d.body_html || '<p>(no article body)</p>') + '</div>';
    html2 += pane('site', siteHtml);
    box.innerHTML = html2;
    /* Paint the share-card canvas after insertion. */
    var cvs = box.querySelectorAll('[data-pub-card]');
    for (var i = 0; i < cvs.length; i++) drawShareCard(cvs[i], ig.share_card || {});
    var tabs = document.getElementById('pubTabs');
    if (tabs) tabs.innerHTML = previewTabs();
    wireDetail();
  }

  function switchTab(key) {
    state.tab = key;
    /* Psych (b): viewing a tab is the gate — PUSH arms only after every
       derivatives tab has been opened. */
    state.viewed[key] = true;
    renderViewed();
    armPush(state.allOk);
    var tabs = document.getElementById('pubTabs');
    if (tabs) tabs.innerHTML = previewTabs();
    var panes = document.querySelectorAll('[data-pub-pane]');
    for (var i = 0; i < panes.length; i++) {
      panes[i].style.display = (panes[i].getAttribute('data-pub-pane') === key) ? 'block' : 'none';
    }
    /* Re-paint the card canvas — switching tabs doesn't re-render it. */
    var box = document.getElementById('pubPreview');
    if (box && key === 'instagram' && state.detail && state.detail.derivatives) {
      var ig = state.detail.derivatives.instagram || {};
      var cvs = box.querySelectorAll('[data-pub-pane="instagram"] [data-pub-card]');
      for (var j = 0; j < cvs.length; j++) drawShareCard(cvs[j], ig.share_card || {});
    }
    wireDetail();
  }

  function currentPlatforms() {
    var out = {};
    PLATFORMS.forEach(function (p) { out[p.key] = !!state.toggles[p.key]; });
    return out;
  }
  function currentTargets() {
    return {
      instagram: { account_id: currentTargetId('instagram'), placement: (state.targets.instagram && state.targets.instagram.placement) || 'feed' },
      threads: { account_id: currentTargetId('threads') },
      facebook: { page_id: currentTargetId('facebook') },
      discord: { channel: currentTargetId('discord') }
    };
  }

  function refreshChecklist() {
    var el = document.getElementById('pubChecklist');
    if (!el || !state.detail) return;
    el.innerHTML = '<div class="x-note">Checking&hellip;</div>';
    adminPost(PUB_ACTION.checklist,
      { draft_id: state.detail.id, platforms: currentPlatforms(), targets: currentTargets() },
      function (j) {
        if (!j || !j.ok) {
          el.innerHTML = '<div class="c-err">Checklist failed: ' + esc(errCopy(j, 'the backend said no.')) + '</div>';
          armPush(false);
          return;
        }
        state.checklist = j.checklist || [];
        state.allOk = !!j.all_ok;
        renderChecklist();
      });
  }
  function renderChecklist() {
    var el = document.getElementById('pubChecklist');
    if (!el) return;
    el.innerHTML = state.checklist.map(function (it) {
      var icon = it.ok ? '<span style="color:#3fb950">&#10003;</span>' : '<span style="color:#c1121f">&#10007;</span>';
      return '<div style="padding:3px 0">' + icon + ' <b>' + esc(it.label) + '</b>'
        + (it.detail ? ' <span class="x-note">&mdash; ' + esc(it.detail) + '</span>' : '') + '</div>';
    }).join('');
    armPush(state.allOk);
  }
  function armPush(ok) {
    var btn = document.getElementById('pubPush');
    /* Psych (b): PUSH arms only when the server checklist is green AND every
       derivatives tab has been viewed. */
    if (btn) { btn.disabled = !ok || state.busy || !allTabsViewed(); }
  }

  /* PUSH: banned-term scan, explicit-ack gate, then enqueue + push.
     Status board polls publisher_push_status until all resolve. */
  function push() {
    showErr('');
    if (!state.detail) { showErr('Select a staged draft first.'); return; }
    if (!state.allOk) { showErr('Checklist is not green. Fix the flagged items first.'); return; }
    if (!allTabsViewed()) { showErr('Review every preview tab before pushing.'); return; }
    var d = state.detail;
    var hit = bannedHit((d.title || '') + '\n' + (d.body_markdown || '') + '\n' + (d.link || ''));
    if (hit) { showErr('Banned term blocked. The push is dead.'); return; }
    var plats = currentPlatforms();
    var any = false, k;
    for (k in plats) if (plats[k]) { any = true; break; }
    if (!any) { showErr('Flip at least one platform ON before the push.'); return; }
    var needAck = [];
    PLATFORMS.forEach(function (p) {
      if (plats[p.key] && targetExplicit(p.key, currentTargetId(p.key)) && !state.explicitAck[p.key])
        needAck.push(p.label);
    });
    if (needAck.length) {
      showErr('Explicit choice required: ' + needAck.join(', ') + ' — tick the per-push confirmation under the platform first.');
      return;
    }
    var btn = document.getElementById('pubPush');
    if (btn) { btn.disabled = true; btn.textContent = 'QUEUEING\u2026'; }
    state.busy = true;
    var board = document.getElementById('pubBoard');
    if (board) board.innerHTML = '<div class="x-note">Queueing the push&hellip;</div>';
    adminPost(PUB_ACTION.enqueue, { draft_id: d.id, platforms: plats, targets: currentTargets() }, function (j) {
      if (!j || !j.ok) {
        state.busy = false;
        if (btn) { btn.disabled = false; btn.textContent = 'PUSH TO THE FRONT LINES'; }
        showErr('Enqueue refused: ' + errCopy(j, 'the backend said no.'));
        return;
      }
      var obid = j.outbox_id;
      state.outboxId = obid;
      if (btn) btn.textContent = 'PUSHING\u2026';
      adminPost(PUB_ACTION.push, { outbox_id: obid }, function (j2) {
        state.busy = false;
        if (!j2 || !j2.ok) {
          if (btn) { btn.disabled = false; btn.textContent = 'PUSH TO THE FRONT LINES'; }
          showErr('Push refused: ' + errCopy(j2, 'the backend said no.'));
          return;
        }
        var res = j2.results || {};
        var init = {};
        Object.keys(res).forEach(function (pl) { init[pl] = res[pl] && res[pl].status; });
        renderBoard(obid, init, true);
        pollStatus(obid, 0);
        refreshHistory();
        /* The draft is consumed — refresh the staged queue. */
        loadStaged();
      });
    });
  }

  function renderBoard(outboxId, platforms, queued) {
    var board = document.getElementById('pubBoard');
    if (!board) return;
    state.lastPushId = outboxId;
    var rows = PLATFORMS.map(function (p) {
      var st = platforms[p.key];
      if (typeof st === 'boolean') st = st ? 'queued' : 'skipped';
      /* An unknown outcome is terminal — the adapter MUST NOT retry. The
         board surfaces it with a manual-reconciliation affordance. */
      var recon = (st === 'unknown')
        ? '<span style="margin-left:10px"><button class="c-btn" data-pub-reconcile="' + p.key + ':sent">MARK SENT</button> '
          + '<button class="c-btn" data-pub-reconcile="' + p.key + ':failed">MARK FAILED</button></span>'
          + '<span class="x-note" style="margin-left:6px">Check the platform yourself, then record the outcome. No retry — ever.</span>'
        : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #333">'
        + '<b style="min-width:92px">' + esc(p.label) + '</b>'
        + '<span>' + statusDot(st) + '</span>' + recon + '</div>';
    }).join('');
    /* The site repost always rides the push. */
    var siteSt = platforms.site;
    if (typeof siteSt === 'boolean') siteSt = siteSt ? 'queued' : 'skipped';
    rows += '<div style="display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #333">'
      + '<b style="min-width:92px">Site</b><span>' + statusDot(siteSt) + '</span></div>';
    board.innerHTML = '<div class="x-pane" style="margin-top:6px"><h4>PUSH STATUS</h4>'
      + '<div class="x-note">outbox ' + esc(outboxId) + ' &mdash; one platform failing never fails the push.</div>'
      + rows
      + (queued ? '<div class="x-note" style="margin-top:6px">Watching the wire for final states&hellip;</div>' : '')
      + '</div>';
    wireReconcile();
  }

  function reconcile(platform, outcome) {
    var obid = state.lastPushId;
    if (!obid) return;
    adminPost(PUB_ACTION.reconcile, { outbox_id: obid, platform: platform, outcome: outcome }, function (j) {
      if (j && j.ok) {
        toast('Recorded: ' + platform + ' → ' + outcome + '.');
        adminPost(PUB_ACTION.pushStatus, { id: obid }, function (j2) {
          if (j2 && j2.ok && j2.outbox && j2.outbox.results) {
            var res = {};
            Object.keys(j2.outbox.results).forEach(function (pl) { res[pl] = j2.outbox.results[pl].status; });
            renderBoard(obid, res, false);
          }
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

  function pollStatus(outboxId, n) {
    if (n >= POLL_MAX) { state.polling = false; rearmPush(); return; }
    state.polling = true;
    setTimeout(function () {
      adminPost(PUB_ACTION.pushStatus, { id: outboxId }, function (j) {
        var res = (j && j.ok && j.outbox && j.outbox.results) ? j.outbox.results : null;
        if (res) {
          var flat = {}, done = true, k;
          for (k in res) {
            flat[k] = res[k] && res[k].status;
            /* Only 'queued' keeps the poll alive. 'unknown' is terminal by
               design: the adapter must not retry; the CEO reconciles it by
               hand from the status board. */
            if (flat[k] === 'queued') done = false;
          }
          renderBoard(outboxId, flat, !done);
          if (done) { state.polling = false; rearmPush(); refreshHistory(); return; }
          pollStatus(outboxId, n + 1);
        } else {
          state.polling = false; rearmPush();
        }
      });
    }, POLL_MS);
  }

  function rearmPush() {
    var btn = document.getElementById('pubPush');
    if (btn) { btn.disabled = !state.allOk || !allTabsViewed(); btn.textContent = 'PUSH TO THE FRONT LINES'; }
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
        var bits = Object.keys(res).map(function (pl) {
          return esc(pl) + ':' + esc(res[pl] && res[pl].status);
        }).join(' ');
        return '<div style="padding:4px 0;border-bottom:1px solid #333">'
          + '<span class="x-note">' + esc(fmtTs(r.at)) + ' &middot; by ' + esc(r.by || '?') + '</span><br>'
          + '<span style="font-family:monospace;font-size:12px">' + esc(r.title_hash || r.id || '') + '</span><br>'
          + '<span class="x-note">' + bits + (r.dry_run ? ' &middot; DRY RUN' : '') + '</span></div>';
      }).join('');
      el.innerHTML = html2;
    });
  }

  function loadStatus() {
    adminPost(PUB_ACTION.status, {}, function (j) {
      var dry = document.getElementById('pubDryRun');
      if (j && j.ok) {
        state.dryRun = j.dry_run !== false;
        state.connected = j.connected || {};
        state.live = j.live || {};
        if (j.targets) state.inventory = j.targets;
        if (dry) dry.style.display = state.dryRun ? 'block' : 'none';
        /* Re-render toggles with real connection state if a draft is open. */
        if (state.detail) renderDetail();
      } else if (dry) {
        dry.style.display = 'block';
      }
    });
  }

  /* ---------------- wiring ---------------- */
  function wireDetail() {
    var tabs = document.querySelectorAll('[data-pub-tab]');
    for (var i = 0; i < tabs.length; i++) {
      (function (b) {
        if (b._wired) return; b._wired = true;
        b.onclick = function () { switchTab(b.getAttribute('data-pub-tab')); };
      })(tabs[i]);
    }
    var toggles = document.querySelectorAll('[data-pub-toggle]');
    for (var t = 0; t < toggles.length; t++) {
      (function (b) {
        if (b._wired) return; b._wired = true;
        b.onclick = function () {
          var key = b.getAttribute('data-pub-toggle');
          state.toggles[key] = !state.toggles[key];
          b.setAttribute('aria-pressed', String(!!state.toggles[key]));
          b.textContent = state.toggles[key] ? 'ON' : 'OFF';
          refreshChecklist();
        };
      })(toggles[t]);
    }
    var sels = document.querySelectorAll('[data-pub-target]');
    for (var s = 0; s < sels.length; s++) {
      (function (sel) {
        if (sel._wired) return; sel._wired = true;
        sel.onchange = function () {
          var key = sel.getAttribute('data-pub-target');
          state.targets[key] = state.targets[key] || {};
          state.targets[key].id = sel.value;
          state.explicitAck[key] = false;
          /* Re-render rows so the explicit-ack checkbox appears/disappears. */
          var tg = document.getElementById('pubToggles');
          if (tg) { tg.innerHTML = PLATFORMS.map(platformRow).join(''); wireDetail(); }
          refreshChecklist();
        };
      })(sels[s]);
    }
    var place = document.querySelector('[data-pub-placement]');
    if (place && !place._wired) {
      place._wired = true;
      place.onchange = function () {
        state.targets.instagram = state.targets.instagram || {};
        state.targets.instagram.placement = place.value;
        refreshChecklist();
      };
    }
    var acks = document.querySelectorAll('[data-pub-explicit]');
    for (var a = 0; a < acks.length; a++) {
      (function (cb) {
        if (cb._wired) return; cb._wired = true;
        cb.onchange = function () {
          state.explicitAck[cb.getAttribute('data-pub-explicit')] = cb.checked;
        };
      })(acks[a]);
    }
    var push = document.getElementById('pubPush');
    if (push && !push._wired) { push._wired = true; push.onclick = push; }
  }

  function wirePanel() {
    var poll = document.getElementById('pubPollBtn');
    if (poll && !poll._wired) { poll._wired = true; poll.onclick = pollNow; }
    var rs = document.getElementById('pubStagedBtn');
    if (rs && !rs._wired) { rs._wired = true; rs.onclick = function () { loadStaged(); }; }
    var hb = document.getElementById('pubHistBtn');
    if (hb && !hb._wired) { hb._wired = true; hb.onclick = refreshHistory; }
  }

  function wireRoot() {
    var root = document.getElementById(PANEL_ID);
    if (root && !root._wired) { root._wired = true; wirePanel(); }
  }

  function mount() {
    /* Admin gate: vault unlocked + admin secret readable. */
    if (!getAdminSecret()) {
      window.PF.publisherDenied = 'no-admin-secret';
      return;
    }
    var host = document.getElementById('xVault');
    if (!host) return;
    var root = document.getElementById(PANEL_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = PANEL_ID;
      host.appendChild(root);
    }
    root.innerHTML = html();
    wirePanel();
    loadStatus();
    loadStaged();
    refreshHistory();
    /* Re-wire if the vault re-renders around us. */
    if (!mount._watching) {
      mount._watching = true;
      setInterval(wireRoot, 3000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
