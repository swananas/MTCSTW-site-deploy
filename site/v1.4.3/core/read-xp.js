/* core/read-xp.js  |  PF v1.4.3 | READ & CREATE XP frontend.
   Economy Desk APPROVED WITH CONDITIONS (spec v2, 2026-10-05). No deploys.

   WHAT: the article reader (comprehension-gated read XP), the Ammo Finder
   "CITE THIS" decorator, the Content Bank submit composer, and the
   poster-share proof capture. Backend contract (parallel backend wave):
     PF.postAction('readcreate', 'rc_action', <action>, <params>, cb)
     read_heartbeat {url_hash, scroll_depth_pct} -> {ok, heartbeats, floors_met}
     read_quiz      {url_hash}                   -> {ok, question}
     read_claim     {url_hash, answer}            -> {ok, xp:5, balance} | {ok:false, err}
     cite_token     {url, query}                  -> {ok, token, expires_at}
     bank_submit    {artifact_url, caption, image_hash?, citation_token?}
                                                  -> {ok, submission_id, status:'pending',
                                                      review_queued:bool, review_submission_id?}
     (review_queued true when the piece also entered the community review
     pool; review_submission_id present only then. Fail-closed: pool down
     still lands the submission with review_queued:false — silent, never
     alarm the user. Frontend surfaces the review line only on
     j.review_queued === true.)
     poster_share   {story_url, proof_url}         -> {ok, xp:5, balance} | {ok:false, err}
   Envelope: {ok:true,...} / {ok:false, err:'...'}.

   URL_HASH CANONICALIZATION (frontend/backend must agree — handoff note):
   when the story object carries url_hash it is used verbatim; otherwise the
   frontend sends lowercase hex SHA-256 of the story URL string exactly as
   supplied by PF.newsTop (String(url).trim(), no other normalization).
   The backend re-derives and fails closed on mismatch. No client timestamps
   are ever sent — heartbeats are informational; the server anchors.

   TOP STORIES DEPENDENCY (wave-live-rails-fe, in QC at build time):
   ships PF.newsTop. This module builds against BOTH shapes:
     - spec/task contract: PF.newsTop.getStories() -> stories
     - actual branch:     PF.newsTop.get(limit) -> Promise<{stories,...}>
   Story shape used: {url, title, source, published_at, url_hash?}.
   If PF.newsTop is absent, the reader mounts NOTHING — the page is untouched.

   AMMO FINDER DEPENDENCY (wave-claim-support-fe, in QC at build time):
   the Ammo Finder UI is not in this branch, so "CITE THIS" is a decorator:
   a MutationObserver finds rendered .am-card source cards and injects the
   button. If the Ammo Finder never lands, the decorator observes nothing
   and mounts nothing.

   COPY (spec section 8, verbatim):
     reader: "READ THE FIGHT. Prove it. +5 XP per story."
     create: "TURN IT INTO AMMUNITION." / sub "Read it. Cite it. Bank it."
     trust:  "XP has no cash value. Stakes are final." — adjacent to every
             XP mention. XP amounts shown: +5 read, +10/+20 bank, +5 share.
   Banned terms: none used ("donate" never appears in this file).

   FAIL-SOFT: backend news_unavailable or a story with no quiz -> the reader
   tears down silently (no tracking UI, no promises). Every backend call
   treats cb(null) as "unavailable" and degrades without breaking the page.

   KILL: ?pf_off=readxp  or  localStorage pf_disabled_v1='["readxp"]'

   POLITICAL METADATA — "LINK TO THE FIGHT" (CEO greenlight 2026-10-05,
   weave #8: political data into creation). Optional linkage on the BANK A
   PIECE pane: issue area (12 canonical, hardcoded — matches the
   aligned-nonprofits directory) + entity type (bill/rep/race/org/poll/
   prediction/campaign) + entity search via the Studio plugin registry
   (sibling build: Forge POLITICAL tab + plugin registry, action
   studio_plugins_list — route REMOVED 2026-10-06 (fe/junk-removal);
   metaProbe/metaSearch fail-soft without firing, picker never mounts).
   FEATURE-DETECT: the picker mounts only when the backend answers the
   registry probe. Registry absent -> the picker never renders (silent
   no-op, never a broken control). Prefill via PF.bankPrefillMeta works
   regardless — metadata rides bank_submit even with the picker hidden.
   bank_submit carries the metadata as FLAT params (entity_type, entity_id,
   issue_area, plugin_id?, template_id?, data_hash?, data_ts?, parent_id?)
   when set — the backend reads p.entity_type etc. directly, never a nested
   object.
   Metadata changes nothing about XP (Economy Desk ruling 2026-10-05:
   metadata submits earn the normal acceptance amounts; self-remix
   acceptances carry note 'self_remix_no_award' and the confirmation
   surface never shows +10/+20 copy for them).
   KILL: ?pf_off=bank-meta  or  localStorage pf_disabled_v1='["bank-meta"]'
   — picker + prefill + gallery + remix all no-op. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('readxp')) { return; }
  if (window.pfReadXpDone) return; window.pfReadXpDone = true;
  try { /* never mount inside the Squarespace editor */
    var hrefE = window.location.href || '';
    if (hrefE.indexOf('/config/') !== -1) return;
    var bdE = document.body;
    if (bdE && (bdE.classList.contains('sqs-edit-mode') || bdE.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  /* ---------------- backend rail ---------------- */
  var TYPE = 'readcreate';
  var AKEY = 'rc_action';
  var ACT = {
    HEARTBEAT: 'read_heartbeat',
    QUIZ: 'read_quiz',
    CLAIM: 'read_claim',
    CITE: 'cite_token',
    BANK: 'bank_submit',
    SHARE: 'poster_share'
  };
  var HB_MS = 15000; /* heartbeat cadence; visibility-gated (no beat when hidden) */

  function api(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    try {
      if (!(PF && PF.postAction)) { done(null); return; }
      /* Backend authGate requires callsign (400 without it) for every
         readcreate:* action — attach callsign + device once here, covering
         all six actions (rites.js convention). */
      var p = Object.assign({}, params || {});
      if (p.callsign === undefined || p.callsign === null) p.callsign = callsign();
      if (p.device === undefined || p.device === null) {
        try { p.device = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) { p.device = ''; }
      }
      PF.postAction(TYPE, AKEY, action, p, done);
    } catch (e) { done(null); }
  }

  /* ---------------- copy (spec section 8, verbatim) ---------------- */
  var COPY = {
    reader: 'READ THE FIGHT. Prove it. +5 XP per story.',
    create: 'TURN IT INTO AMMUNITION.',
    createSub: 'Read it. Cite it. Bank it.',
    trust: 'XP has no cash value. Stakes are final.'
  };

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }
  function errCopy(j, fallback) {
    try { if (PF && PF.errCopy) return PF.errCopy(j, fallback); } catch (e) {}
    return fallback || 'The wire fought back. Nothing changed — retry.';
  }
  function callsign() {
    try { return window.PFCallsign ? String(window.PFCallsign() || '') : ''; }
    catch (e) { return ''; }
  }
  /* Page scroll depth 0-100. Informational only — the comprehension
     question is the real gate (spec section 2.6). */
  function depth() {
    try {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return 0;
      var y = window.pageYOffset || h.scrollTop || 0;
      return Math.max(0, Math.min(100, Math.round((y / max) * 100)));
    } catch (e) { return 0; }
  }
  /* url_hash: verbatim when the story carries one; otherwise lowercase hex
     SHA-256 of the trimmed URL string. Fail-closed ('' -> no session). */
  function storyHash(story) {
    return new Promise(function (resolve) {
      try {
        if (story && story.url_hash) { resolve(String(story.url_hash)); return; }
        var u = String((story && story.url) || '').trim();
        if (!u) { resolve(''); return; }
        if (window.crypto && crypto.subtle && crypto.subtle.digest &&
            typeof TextEncoder !== 'undefined') {
          crypto.subtle.digest('SHA-256', new TextEncoder().encode(u)).then(function (buf) {
            var bytes = new Uint8Array(buf), out = '';
            for (var i = 0; i < bytes.length; i++) {
              out += ('0' + bytes[i].toString(16)).slice(-2);
            }
            resolve(out);
          }, function () { resolve(''); });
        } else { resolve(''); }
      } catch (e) { resolve(''); }
    });
  }

  /* ---------------- Top Stories adapter ----------------
     wave-live-rails-fe contract drift: the task named getStories(), the
     branch ships get(limit). Support both; stories -> normalized shape. */
  var storyCache = [];
  function getStories() {
    return new Promise(function (resolve) {
      try {
        var nt = (window.PF && PF.newsTop) ? PF.newsTop : null;
        if (!nt) { resolve([]); return; }
        function take(arr) {
          var out = [];
          try {
            arr = arr || [];
            for (var i = 0; i < arr.length; i++) {
              var s = arr[i];
              if (!s || !s.url || !s.title) continue;
              out.push({ url: String(s.url), title: String(s.title),
                source: String(s.source || ''), published_at: Number(s.published_at) || 0,
                url_hash: s.url_hash ? String(s.url_hash) : '' });
            }
          } catch (e) {}
          storyCache = out;
          resolve(out);
        }
        if (typeof nt.getStories === 'function') {
          var r = nt.getStories();
          if (r && typeof r.then === 'function') r.then(take, function () { resolve([]); });
          else take(r);
          return;
        }
        if (typeof nt.get === 'function') {
          nt.get(12).then(function (p) { take(p && p.stories); },
            function () { resolve([]); });
          return;
        }
        resolve([]);
      } catch (e) { resolve([]); }
    });
  }
  function newsTopPresent() {
    try {
      var nt = (window.PF && PF.newsTop) ? PF.newsTop : null;
      return !!(nt && (typeof nt.get === 'function' || typeof nt.getStories === 'function'));
    } catch (e) { return false; }
  }

  /* ---------------- styles (mobile-first) ---------------- */
  var CSS =
    '#pf-rx-dock{position:fixed;left:0;right:0;bottom:0;z-index:99990;' +
      'font-family:Arial,sans-serif;color:#f5ead6;' +
      'background:rgba(8,8,8,0.97);border-top:3px solid #c1121f;' +
      'box-shadow:0 -6px 24px rgba(0,0,0,0.6)}' +
    '#pf-rx-dock .rx-in{max-width:640px;margin:0 auto;padding:14px 16px 16px}' +
    '#pf-rx-dock .rx-head{font:bold 15px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}' +
    '#pf-rx-dock .rx-sub{font:400 12px/1.5 Arial;color:#b8a98a;margin:0 0 8px}' +
    '#pf-rx-dock .rx-trust{font:400 11px/1.4 Arial;color:#8f8468;margin:6px 0 0;letter-spacing:.5px}' +
    '#pf-rx-dock .rx-status{font:400 13px/1.5 Arial;color:#7CFF9B;margin:8px 0}' +
    '#pf-rx-dock .rx-q{font:bold 15px/1.5 Arial;color:#fff;margin:10px 0 8px}' +
    '#pf-rx-dock .rx-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '#pf-rx-dock input[type=text]{flex:1;min-width:200px;background:#0d0d0d;' +
      'border:1px solid #555;color:#f5ead6;padding:12px;font-size:16px}' +
    '#pf-rx-dock input[type=text]:focus{border-color:#c1121f;outline:none}' +
    '#pf-rx-dock button{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 13px Arial;letter-spacing:1px;padding:12px 20px;cursor:pointer}' +
    '#pf-rx-dock button:disabled{opacity:.5;cursor:wait}' +
    '#pf-rx-dock .rx-x{position:absolute;top:8px;right:12px;color:#b8a98a;' +
      'font-size:20px;cursor:pointer;line-height:1;background:none;border:none;padding:4px}' +
    '#pf-rx-dock .rx-link{color:#ff8a8a;font-size:13px}' +
    '.pf-rx-rail{font-family:Arial,sans-serif;color:#f5ead6;max-width:640px}' +
    '.pf-rx-rail .rx-head{font:bold 16px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}' +
    '.pf-rx-rail .rx-trust{font:400 11px/1.4 Arial;color:#8f8468;margin:0 0 10px;letter-spacing:.5px}' +
    '.pf-rx-rail .rx-item{display:flex;gap:10px;align-items:center;' +
      'background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;' +
      'padding:10px 12px;margin:0 0 8px}' +
    '.pf-rx-rail .rx-t{flex:1;min-width:0}' +
    '.pf-rx-rail .rx-title{font:bold 14px/1.4 Arial;color:#fff;text-decoration:none;display:block}' +
    '.pf-rx-rail a.rx-title:hover{color:#ff6b6b}' +
    '.pf-rx-rail .rx-meta{font:400 11px Arial;color:#b8a98a;margin-top:3px}' +
    '.pf-rx-rail .rx-go{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:10px 14px;cursor:pointer;white-space:nowrap}' +
    '.pf-rx-readbtn{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 10px Arial;letter-spacing:1px;padding:6px 10px;cursor:pointer;margin-left:8px}' +
    '.pf-rx-readbtn:hover{background:#c1121f}' +
    '#pf-rx-bank{font-family:Arial,sans-serif;color:#f5ead6;max-width:640px}' +
    '#pf-rx-bank .rx-head{font:bold 18px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}' +
    '#pf-rx-bank .rx-sub{font:400 13px/1.5 Arial;color:#b8a98a;margin:0 0 8px}' +
    '#pf-rx-bank .rx-legend{font:400 12px/1.6 Arial;color:#d8cdb4;' +
      'background:#141414;border:1px solid #3a3a3a;padding:10px 12px;margin:0 0 6px}' +
    '#pf-rx-bank .rx-trust{font:400 11px/1.4 Arial;color:#8f8468;margin:0 0 12px;letter-spacing:.5px}' +
    '#pf-rx-bank .rx-tabs{display:flex;gap:8px;margin:0 0 12px}' +
    '#pf-rx-bank .rx-tab{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer}' +
    '#pf-rx-bank .rx-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
    '#pf-rx-bank label{display:block;font:bold 11px Arial;letter-spacing:1px;' +
      'color:#b8a98a;margin:10px 0 4px}' +
    '#pf-rx-bank input[type=text],#pf-rx-bank input[type=url],#pf-rx-bank textarea,#pf-rx-bank select{' +
      'width:100%;box-sizing:border-box;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:12px;font-size:16px;font-family:Arial,sans-serif}' +
    '#pf-rx-bank input:focus,#pf-rx-bank textarea:focus,#pf-rx-bank select:focus{' +
      'border-color:#c1121f;outline:none}' +
    '#pf-rx-bank textarea{min-height:76px;resize:vertical}' +
    '#pf-rx-bank .rx-submit{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 14px Arial;letter-spacing:2px;padding:14px 26px;cursor:pointer;' +
      'margin-top:14px;width:100%}' +
    '#pf-rx-bank .rx-submit:disabled{opacity:.5;cursor:wait}' +
    '#pf-rx-bank .rx-note{font:400 12px/1.6 Arial;color:#b8a98a;margin:10px 0}' +
    '#pf-rx-bank .rx-ok{background:#0a1a0a;border:1px solid #7CFF9B;color:#c9ffd9;' +
      'padding:12px;font:400 13px/1.6 Arial;margin:12px 0}' +
    '#pf-rx-bank .rx-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:12px;font:400 13px/1.6 Arial;margin:12px 0}' +
    '#pf-rx-bank .rx-proof{background:#141414;border:1px solid #3a3a3a;' +
      'padding:10px 12px;margin:0 0 10px;font:400 12px/1.7 Arial;color:#d8cdb4}' +
    /* LINK TO THE FIGHT picker (political metadata, 2026-10-05). */
    '#pf-rx-bank .rx-meta{border:2px solid #c1121f;background:#100808;' +
      'padding:12px;margin:12px 0 4px}' +
    '#pf-rx-bank .rx-meta-head{font:bold 13px Arial;letter-spacing:2px;color:#fff;margin:0 0 2px}' +
    '#pf-rx-bank .rx-meta-head span{color:#e5383b;letter-spacing:1px;font-size:11px}' +
    '#pf-rx-bank .rx-meta-sub{font:400 12px/1.5 Arial;color:#b8a98a;margin:0 0 4px}' +
    '#pf-rx-bank .rx-meta-res{margin:6px 0 0;max-height:220px;overflow-y:auto}' +
    '#pf-rx-bank .rx-meta-hit{display:block;width:100%;text-align:left;background:#1a1a1a;' +
      'border:1px solid #555;color:#f5ead6;font:400 13px Arial;padding:9px 10px;' +
      'margin:0 0 6px;cursor:pointer}' +
    '#pf-rx-bank .rx-meta-hit:hover{border-color:#c1121f}' +
    '#pf-rx-bank .rx-meta-hit b{color:#fff;letter-spacing:1px;font-size:11px}' +
    '#pf-rx-bank .rx-meta-sel{margin:8px 0 0}' +
    '#pf-rx-bank .rx-meta-chip{display:inline-block;background:#1c1a1a;border:1px solid #c1121f;' +
      'color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:6px 10px;margin:0 6px 6px 0}' +
    '#pf-rx-bank .rx-meta-chip button{background:none;border:0;color:#e5383b;font:bold 14px Arial;' +
      'cursor:pointer;margin-left:8px;padding:0}' +
    '#pf-rx-bank .rx-meta-note{font:400 12px/1.6 Arial;color:#ffd9a0;background:#1a1206;' +
      'border:1px solid #8a6a2a;padding:8px 10px;margin:0 0 8px}' +
    '@media(max-width:560px){#pf-rx-dock .rx-row button{width:100%}' +
      '#pf-rx-bank .rx-tabs .rx-tab{flex:1}}';

  function ensureCss() {
    try {
      if (document.getElementById('pf-rx-css')) return;
      var s = document.createElement('style');
      s.id = 'pf-rx-css';
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ---------------- reader session ----------------
     One active session at a time. Heartbeats fire every HB_MS only while
     document.visibilityState === 'visible'. Floors met -> quiz -> claim.
     Fail-soft: news_unavailable / missing question -> silent teardown. */
  var sessions = {}; /* url_hash -> {story, hash, state, timer, panel, beats, fails, attempted} */
  var activeHash = '';

  function teardown(hash, silent) {
    try {
      var s = sessions[hash];
      if (s) {
        try { if (s.timer) clearInterval(s.timer); } catch (e) {}
        try {
          if (s.panel) {
            if (typeof s.panel.remove === 'function') s.panel.remove();
            else if (s.panel.parentNode) s.panel.parentNode.removeChild(s.panel);
          }
        } catch (e2) {}
        delete sessions[hash];
      }
      if (activeHash === hash) activeHash = '';
      if (!silent) { try { PF.log('readxp', 'session closed'); } catch (e3) {} }
    } catch (e) {}
  }
  function teardownAll() {
    try { Object.keys(sessions).forEach(function (h) { teardown(h, true); }); } catch (e) {}
  }

  function dockHtml(story) {
    var url = safeUrl(story.url);
    var link = url ? '<a class="rx-link" href="' + esc(url) +
      '" target="_blank" rel="noopener">' + esc(story.title) + '</a>' : esc(story.title);
    return '<div class="rx-in">' +
      '<button type="button" class="rx-x" data-rx-x="1" aria-label="Close">&times;</button>' +
      '<p class="rx-head">' + esc(COPY.reader) + '</p>' +
      '<p class="rx-sub">' + link +
      (story.source ? ' <span style="color:#8f8468">&middot; ' + esc(story.source) + '</span>' : '') + '</p>' +
      '<div class="rx-status" data-rx-status="1">Reading the story in the new tab&hellip; ' +
        'the quiz unlocks when the wire sees enough signal. <span data-rx-beats="1"></span></div>' +
      '<div data-rx-quiz="1"></div>' +
      '<p class="rx-trust">' + esc(COPY.trust) + '</p>' +
      '</div>';
  }

  function mountDock(story) {
    ensureCss();
    var d = document.createElement('div');
    d.id = 'pf-rx-dock';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Read the fight');
    d.innerHTML = dockHtml(story);
    (document.body || document.documentElement).appendChild(d);
    d.addEventListener('click', function (ev) {
      try {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-rx-x')) {
          var h = d.getAttribute('data-rx-hash');
          teardown(h || '');
        }
      } catch (e) {}
    });
    return d;
  }

  function setStatus(hash, html) {
    try {
      var s = sessions[hash];
      if (!s || !s.panel) return;
      var el = s.panel.querySelector('[data-rx-status]');
      if (el) el.innerHTML = html;
    } catch (e) {}
  }

  /* The heartbeat tick — exposed for the verification harness as _t.beat. */
  function beat(hash) {
    var s = sessions[hash];
    if (!s || s.state !== 'reading') return;
    try {
      if (document.visibilityState !== 'visible') return; /* no beat when hidden */
    } catch (e) {}
    var payload = { url_hash: s.hash, scroll_depth_pct: depth() };
    api(ACT.HEARTBEAT, payload, function (j) {
      var s2 = sessions[hash];
      if (!s2 || s2.state !== 'reading') return;
      if (!j || j.ok === false) {
        var code = (j && (j.err || j.error)) || '';
        if (String(code) === 'news_unavailable') { teardown(hash, true); return; }
        s2.fails = (s2.fails || 0) + 1;
        if (s2.fails >= 4) {
          setStatus(hash, 'The wire fought back — keeping the signal alive. Nothing lost.');
        }
        return;
      }
      s2.fails = 0;
      var n = Number(j.heartbeats) || 0;
      s2.beats = n;
      try {
        var b = s2.panel.querySelector('[data-rx-beats]');
        if (b) b.textContent = n > 0 ? ('signal ' + n) : '';
      } catch (e2) {}
      if (j.floors_met) toQuiz(hash);
    });
  }

  function toQuiz(hash) {
    var s = sessions[hash];
    if (!s || s.state !== 'reading') return;
    s.state = 'quiz';
    try { if (s.timer) clearInterval(s.timer); } catch (e) {}
    api(ACT.QUIZ, { url_hash: s.hash }, function (j) {
      var s2 = sessions[hash];
      if (!s2 || s2.state !== 'quiz') return;
      if (!j || j.ok === false || !j.question) { teardown(hash, true); return; }
      renderQuiz(s2, String(j.question));
    });
  }

  function renderQuiz(s, question) {
    try {
      var box = s.panel.querySelector('[data-rx-quiz]');
      if (!box) return;
      box.innerHTML =
        '<p class="rx-q">Prove you read it:</p>' +
        '<p class="rx-sub">' + esc(question) + '</p>' +
        '<div class="rx-row">' +
        '<input type="text" data-rx-answer="1" maxlength="500" autocomplete="off" ' +
          'placeholder="Your answer" aria-label="Your answer">' +
        '<button type="button" data-rx-prove="1">PROVE IT</button>' +
        '</div>';
      setStatus(s.hash, 'Floors met. One attempt — make it count.');
      var btn = box.querySelector('[data-rx-prove]');
      var input = box.querySelector('[data-rx-answer]');
      function go() { submitClaim(s.hash); }
      if (btn) btn.addEventListener('click', go);
      if (input) input.addEventListener('keydown', function (ev) {
        if (ev && ev.key === 'Enter') go();
      });
      try { if (input) input.focus(); } catch (e) {}
    } catch (e) {}
  }

  /* One attempt per article per day — enforced server-side; the client
     disables the UI on first submit so a double-tap can't double-fire. */
  function submitClaim(hash) {
    var s = sessions[hash];
    if (!s || s.state !== 'quiz' || s.attempted) return;
    s.attempted = true;
    var answer = '';
    try {
      var input = s.panel.querySelector('[data-rx-answer]');
      if (input) answer = String(input.value || '');
      var btn = s.panel.querySelector('[data-rx-prove]');
      if (btn) btn.disabled = true;
      if (input) input.disabled = true;
    } catch (e) {}
    setStatus(hash, 'Checking&hellip;');
    api(ACT.CLAIM, { url_hash: s.hash, answer: answer }, function (j) {
      var s2 = sessions[hash];
      if (!s2) return;
      s2.state = 'done';
      try {
        var box = s2.panel.querySelector('[data-rx-quiz]');
        if (!box) return;
        if (j && j.ok && Number(j.xp) === 5) {
          try {
            document.dispatchEvent(new CustomEvent('pf-xp-granted',
              { detail: { key: 'read_article', delta: 5 } }));
          } catch (e2) {}
          box.innerHTML = '<p class="rx-q" style="color:#7CFF9B">+5 XP banked.</p>' +
            '<p class="rx-sub">' + esc(COPY.trust) + '</p>';
          setStatus(s2.hash, 'Verified read. The fight remembers.');
        } else {
          var code = (j && (j.err || j.error)) || '';
          var msg = 'No award today for this story.';
          if (String(code) === 'cap' || /cap/i.test(String(code))) {
            msg = errCopy(j, msg);
          }
          box.innerHTML = '<p class="rx-q">' + esc(msg) + '</p>';
          setStatus(s2.hash, 'One attempt per story per day — re-try tomorrow.');
        }
      } catch (e3) {}
    });
  }

  /* Start a reading session for a story. Opens nothing itself — the caller
     opens the article (popup-blocker safe: window.open in the click
     handler), then calls start(story). */
  function start(story) {
    try {
      if (!story || !story.url) return;
      if (!callsign()) {
        toast('Claim a callsign first — Enlistment Ranks takes ten seconds.');
        return;
      }
      storyHash(story).then(function (hash) {
        if (!hash) return;
        try {
          if (sessions[hash] && sessions[hash].state !== 'done') {
            try { sessions[hash].panel.scrollIntoView(); } catch (e) {}
            return;
          }
          teardownAll();
          var panel = mountDock(story);
          panel.setAttribute('data-rx-hash', hash);
          sessions[hash] = { story: story, hash: hash, state: 'reading',
            timer: null, panel: panel, beats: 0, fails: 0, attempted: false };
          activeHash = hash;
          sessions[hash].timer = setInterval(function () { beat(hash); }, HB_MS);
          beat(hash); /* first beat immediately — the server anchors the window */
        } catch (e2) {}
      });
    } catch (e) {}
  }

  /* ---------------- Top Stories wiring ----------------
     1) Dedicated rail into #pf-readxp (explicit anchor only).
     2) Decoration of Top Stories surfaces rendered by PF.newsTop.render
        (.pf-newstop-item links): a "READ FOR XP" button per story that opens
        the article and starts the reader session.
     If PF.newsTop is absent, nothing mounts — the page is never touched. */
  function openStory(story) {
    var url = safeUrl(story.url);
    if (!url) return;
    try { window.open(url, '_blank', 'noopener'); } catch (e) {
      try { window.location.href = url; } catch (e2) {}
    }
    start(story);
  }

  function railHtml(stories) {
    var h = '<div class="pf-rx-rail">' +
      '<p class="rx-head">' + esc(COPY.reader) + '</p>' +
      '<p class="rx-trust">' + esc(COPY.trust) + '</p>';
    var n = Math.min(stories.length, 8);
    for (var i = 0; i < n; i++) {
      var s = stories[i];
      var url = safeUrl(s.url);
      var t = url
        ? '<a class="rx-title" href="' + esc(url) + '" target="_blank" rel="noopener">' +
          esc(s.title) + '</a>'
        : '<span class="rx-title">' + esc(s.title) + '</span>';
      h += '<div class="rx-item"><div class="rx-t">' + t +
        '<div class="rx-meta">' + esc(s.source || '') + '</div></div>' +
        '<button type="button" class="rx-go" data-rx-read="' + i + '">READ &#8594;</button></div>';
    }
    h += '</div>';
    return h;
  }

  function renderRail(el, stories) {
    if (!el || !stories || !stories.length) return;
    try { if (el.getAttribute('data-pf-rx-rail')) return; } catch (e) {}
    try { el.setAttribute('data-pf-rx-rail', '1'); } catch (e2) {}
    ensureCss();
    el.innerHTML = railHtml(stories);
    el.addEventListener('click', function (ev) {
      try {
        var t = ev.target;
        var idx = t && t.getAttribute ? t.getAttribute('data-rx-read') : null;
        if (idx !== null && idx !== '') {
          var s = stories[Number(idx)];
          if (s) openStory(s);
        }
      } catch (e) {}
    });
  }

  /* Decorate .pf-newstop-item story links with a reader button. Matches by
     href against the last fetched story list; unmatched links are skipped. */
  var decorated = [];
  function storyByUrl(url) {
    try {
      for (var i = 0; i < storyCache.length; i++) {
        if (String(storyCache[i].url) === String(url)) return storyCache[i];
      }
    } catch (e) {}
    return null;
  }
  function decorateNewstop(root) {
    if (!newsTopPresent()) return;
    var items;
    try {
      items = (root || document).querySelectorAll('.pf-newstop-item');
    } catch (e) { return; }
    for (var i = 0; i < items.length; i++) {
      (function (li) {
        try {
          if (li.getAttribute('data-pf-rx')) return;
          var a = li.querySelector('a[href]');
          if (!a) return;
          var href = a.getAttribute('href') || '';
          var story = storyByUrl(href);
          if (!story) return;
          li.setAttribute('data-pf-rx', '1');
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'pf-rx-readbtn';
          b.textContent = 'READ FOR XP \u2192';
          b.setAttribute('aria-label', 'Read for XP: ' + String(story.title).slice(0, 80));
          b.addEventListener('click', function (ev) {
            try { if (ev) ev.preventDefault(); } catch (e2) {}
            openStory(story);
          });
          var meta = li.querySelector('.pf-newstop-meta');
          if (meta && meta.parentNode) {
            try { meta.appendChild(b); } catch (e3) { li.appendChild(b); }
          } else { li.appendChild(b); }
          decorated.push(li);
        } catch (e4) {}
      })(items[i]);
    }
  }

  /* ---------------- Ammo Finder "CITE THIS" decorator ----------------
     The Ammo Finder UI (wave-claim-support-fe) is not in this branch, so
     this decorates its rendered .am-card source cards when they appear.
     Each card gets CITE THIS -> cite_token {url, query} -> the token is
     stored on PF.readXP.citeTokens and rides with the Content Bank submit. */
  var citeTokens = []; /* {url, query, token, expires_at} — max 20, oldest dropped */
  function pushToken(entry) {
    try {
      citeTokens.push(entry);
      while (citeTokens.length > 20) citeTokens.shift();
      refreshTokenSelect();
      try {
        document.dispatchEvent(new CustomEvent('pf-rx-cite-token',
          { detail: { url: entry.url, token: entry.token } }));
      } catch (e) {}
    } catch (e2) {}
  }
  function cardUrl(card) {
    try {
      var a = card.querySelector('a.am-head[href]');
      if (a) return safeUrl(a.getAttribute('href') || '');
      var any = card.querySelector('a[href]');
      if (any) return safeUrl(any.getAttribute('href') || '');
    } catch (e) {}
    return '';
  }
  function cardQuery() {
    try {
      var inp = document.getElementById('am-claim');
      if (inp) return String(inp.value || '').slice(0, 500);
    } catch (e) {}
    return '';
  }
  function citeCard(card, btn) {
    var url = cardUrl(card);
    if (!url) { toast('No source link on that card.'); return; }
    var query = cardQuery();
    btn.disabled = true;
    btn.textContent = 'LOCKING\u2026';
    api(ACT.CITE, { url: url, query: query }, function (j) {
      try {
        if (j && j.ok && j.token) {
          pushToken({ url: url, query: query, token: String(j.token),
            expires_at: j.expires_at || '' });
          btn.textContent = 'TOKEN LOCKED';
          toast('Citation token locked — it rides with your next Content Bank submit.');
        } else {
          btn.disabled = false;
          btn.textContent = 'CITE THIS';
          toast(errCopy(j, 'Citation failed. Nothing locked.'));
        }
      } catch (e) {
        try { btn.disabled = false; btn.textContent = 'CITE THIS'; } catch (e2) {}
      }
    });
  }
  function decorateAmmo(root) {
    var cards;
    try {
      cards = (root || document).querySelectorAll('.am-card:not([data-pf-rx-cite])');
    } catch (e) { return; }
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        try {
          card.setAttribute('data-pf-rx-cite', '1');
          ensureCss();
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'pf-rx-readbtn';
          b.style.marginLeft = '8px';
          b.textContent = 'CITE THIS';
          b.setAttribute('aria-label', 'Get a citation token for this source');
          b.addEventListener('click', function () { citeCard(card, b); });
          var copyBtn = card.querySelector('.am-copybtn');
          if (copyBtn && copyBtn.parentNode) {
            try { copyBtn.parentNode.insertBefore(b, copyBtn.nextSibling); }
            catch (e2) { card.appendChild(b); }
          } else { card.appendChild(b); }
        } catch (e3) {}
      })(cards[i]);
    }
  }

  /* ---------------- Content Bank submit composer ----------------
     Honest state machine, shown in the UI:
       pending -> accepted (XP lands) / rejected (no award, ever).
     Never promises XP at submit. Amounts shown exactly per spec:
     +10 accepted, +20 cited+verified-read, +5 verified share. */
  var bankMounted = null;

  function tokenOptions(selected) {
    var h = '<option value="">No citation token</option>';
    for (var i = 0; i < citeTokens.length; i++) {
      var t = citeTokens[i];
      var label = '';
      try {
        var u = new URL(t.url);
        label = u.hostname.replace(/^www\./, '');
      } catch (e) { label = String(t.url).slice(0, 40); }
      var v = esc(t.token);
      h += '<option value="' + v + '"' +
        (selected === t.token ? ' selected' : '') + '>' +
        esc(label) + ' — token locked</option>';
    }
    return h;
  }

  function bankHtml() {
    return '<p class="rx-head">' + esc(COPY.create) + '</p>' +
      '<p class="rx-sub">' + esc(COPY.createSub) + '</p>' +
      '<div class="rx-legend">Banked pieces earn XP <b>only when moderation accepts them</b> — ' +
        'never at submit. Accepted: <b>+10 XP</b>. Cited + verified read: <b>+20 XP</b>.<br>' +
        'pending &#8594; accepted (XP lands) / rejected (no award, ever).</div>' +
      '<p class="rx-trust">' + esc(COPY.trust) + '</p>' +
      '<div class="rx-tabs">' +
      '<button type="button" class="rx-tab on" data-rx-tab="bank">BANK A PIECE</button>' +
      '<button type="button" class="rx-tab" data-rx-tab="share">POSTER SHARE</button>' +
      '</div>' +
      '<div data-rx-pane="bank">' +
      '<label>ARTIFACT URL</label>' +
      '<input type="url" data-rx-f="artifact" placeholder="https://… your poster, meme, video" maxlength="2000">' +
      '<label>CAPTION</label>' +
      '<textarea data-rx-f="caption" maxlength="500" placeholder="What is it? Keep it punchy."></textarea>' +
      '<label>CITATION TOKEN (OPTIONAL)</label>' +
      '<select data-rx-f="token">' + tokenOptions('') + '</select>' +
      '<div class="rx-note">No token yet? Run the Ammo Finder in Creator HQ, hit ' +
        '<b>CITE THIS</b> on a source, and it lands here.</div>' +
      '<div data-rx-metabox="1"></div>' +
      '<button type="button" class="rx-submit" data-rx-submit="bank">SUBMIT FOR REVIEW</button>' +
      '<div data-rx-msg="bank"></div>' +
      '</div>' +
      '<div data-rx-pane="share" style="display:none">' +
      '<div class="rx-proof"><b>Proof requirements — read before you post:</b><br>' +
      '1. The post must be <b>public</b>.<br>' +
      '2. The post must contain the <b>story\u2019s link or title</b> so the wire can verify it.<br>' +
      'Auth-walled posts can\u2019t be verified — no award. One verified share per story per 30 days.</div>' +
      '<label>STORY</label>' +
      '<select data-rx-f="story"><option value="">Loading stories\u2026</option></select>' +
      '<label>PROOF URL (YOUR PUBLIC POST)</label>' +
      '<input type="url" data-rx-f="proof" placeholder="https://… link to your public post" maxlength="2000">' +
      '<button type="button" class="rx-submit" data-rx-submit="share">SUBMIT PROOF</button>' +
      '<div class="rx-note">+5 XP per verified share (2/day). ' + esc(COPY.trust) + '</div>' +
      '<div data-rx-msg="share"></div>' +
      '</div>';
  }

  function fieldVal(root, name) {
    try {
      var el = root.querySelector('[data-rx-f="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    } catch (e) { return ''; }
  }
  function paneMsg(root, pane, ok, html) {
    try {
      var m = root.querySelector('[data-rx-msg="' + pane + '"]');
      if (m) m.innerHTML = '<div class="' + (ok ? 'rx-ok' : 'rx-err') + '">' + html + '</div>';
    } catch (e) {}
  }

  function submitBank(root) {
    var artifact = safeUrl(fieldVal(root, 'artifact'));
    var caption = fieldVal(root, 'caption');
    var token = fieldVal(root, 'token');
    if (!artifact) { paneMsg(root, 'bank', false, 'Artifact URL is required — paste a real link.'); return; }
    if (!caption) { paneMsg(root, 'bank', false, 'Caption is required — say what it is.'); return; }
    var btn = root.querySelector('[data-rx-submit="bank"]');
    if (btn) btn.disabled = true;
    var body = { artifact_url: artifact, caption: caption };
    if (token) body.citation_token = token;
    /* Political metadata: factual linkage only. Changes nothing about XP
       (Economy Desk ruling 2026-10-05). */
    try {
      if (!META_KILLED) {
        var pm = metaPayload(root);
        if (pm) metaFlat(body, pm);
      }
    } catch (e0) {}
    api(ACT.BANK, body, function (j) {
      try { if (btn) btn.disabled = false; } catch (e) {}
      if (j && j.ok && j.submission_id) {
        try {
          document.dispatchEvent(new CustomEvent('pf-rx-bank-submitted',
            { detail: { submission_id: String(j.submission_id) } }));
        } catch (e2) {}
        /* Economy Desk ruling 2026-10-05: a self-remix acceptance carries
           note 'self_remix_no_award' — the confirmation surface must never
           show +10/+20 copy for it. Render the server's state, not a promise. */
        var selfRemix = j && j.note === 'self_remix_no_award';
        var okHtml = '<b>IN THE QUEUE.</b> Submission ' + esc(j.submission_id) +
          (selfRemix
            ? ' — accepted. <b>Self-remix: no XP awarded.</b><br>' + esc(COPY.trust)
            : ' — pending moderation.<br>Accepted pieces earn XP; rejected pieces earn nothing, ever. ' +
              esc(COPY.trust)) +
          /* Community review pool (2026-10-05): backend returns
             review_queued:true only when the piece actually entered the
             pool. Fail-closed — false/absent renders the legacy message
             silently (pool outage is never the user's problem). */
          (j.review_queued === true
            ? '<br>' + esc('Also entered community review — members vote on it.')
            : '');
        paneMsg(root, 'bank', true, okHtml);
        try {
          var a = root.querySelector('[data-rx-f="artifact"]'); if (a) a.value = '';
          var c = root.querySelector('[data-rx-f="caption"]'); if (c) c.value = '';
          clearMetaState(root, true);
        } catch (e3) {}
      } else {
        paneMsg(root, 'bank', false, esc(errCopy(j, 'Submit failed. Nothing banked — retry.')));
      }
    });
  }

  function fillStorySelect(root) {
    var sel;
    try { sel = root.querySelector('[data-rx-f="story"]'); } catch (e) { return; }
    if (!sel) return;
    getStories().then(function (stories) {
      try {
        if (!stories.length) {
          sel.innerHTML = '<option value="">Stories updating — check back soon</option>';
          return;
        }
        var h = '';
        for (var i = 0; i < stories.length; i++) {
          var s = stories[i];
          h += '<option value="' + esc(s.url) + '">' +
            esc(String(s.title).slice(0, 90)) +
            (s.source ? ' — ' + esc(s.source) : '') + '</option>';
        }
        sel.innerHTML = h;
      } catch (e2) {}
    });
  }

  function submitShare(root) {
    var storyUrl = safeUrl(fieldVal(root, 'story'));
    var proof = safeUrl(fieldVal(root, 'proof'));
    if (!storyUrl) { paneMsg(root, 'share', false, 'Pick a story — the list is still loading or empty.'); return; }
    if (!proof) { paneMsg(root, 'share', false, 'Proof URL is required — link your public post.'); return; }
    var btn = root.querySelector('[data-rx-submit="share"]');
    if (btn) btn.disabled = true;
    api(ACT.SHARE, { story_url: storyUrl, proof_url: proof }, function (j) {
      try { if (btn) btn.disabled = false; } catch (e) {}
      if (j && j.ok && Number(j.xp) === 5) {
        try {
          document.dispatchEvent(new CustomEvent('pf-xp-granted',
            { detail: { key: 'create_share', delta: 5 } }));
        } catch (e2) {}
        paneMsg(root, 'share', true,
          '<b>+5 XP banked.</b> Verified share. ' + esc(COPY.trust));
        try {
          var p = root.querySelector('[data-rx-f="proof"]'); if (p) p.value = '';
        } catch (e3) {}
      } else {
        paneMsg(root, 'share', false, esc(errCopy(j,
          'Proof didn\u2019t verify. Check it\u2019s public and carries the story link or title.')));
      }
    });
  }

  function renderBank(el) {
    if (!el || bankMounted === el) return;
    ensureCss();
    el.id = 'pf-rx-bank';
    el.innerHTML = bankHtml();
    try { metaState(el); } catch (e0) {}
    bankMounted = el;
    fillStorySelect(el);
    try { mountMetaPicker(el); } catch (e1) {}
    try {
      if (pendingMetaPrefill) {
        if (applyMetaPrefill(pendingMetaPrefill)) pendingMetaPrefill = null;
      }
    } catch (e2) {}
    el.addEventListener('click', function (ev) {
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var tab = t.getAttribute('data-rx-tab');
        if (tab) {
          var tabs = el.querySelectorAll('[data-rx-tab]');
          for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('on', tabs[i].getAttribute('data-rx-tab') === tab);
          }
          var panes = el.querySelectorAll('[data-rx-pane]');
          for (var k = 0; k < panes.length; k++) {
            panes[k].style.display =
              panes[k].getAttribute('data-rx-pane') === tab ? '' : 'none';
          }
          return;
        }
        var sub = t.getAttribute('data-rx-submit');
        if (sub === 'bank') { submitBank(el); return; }
        if (sub === 'share') { submitShare(el); return; }
      } catch (e) {}
    });
  }

  function refreshTokenSelect() {
    try {
      if (!bankMounted) return;
      var sel = bankMounted.querySelector('[data-rx-f="token"]');
      if (!sel) return;
      var cur = '';
      try { cur = String(sel.value || ''); } catch (e) {}
      sel.innerHTML = tokenOptions(cur);
    } catch (e2) {}
  }

  /* ---------------- political metadata ("LINK TO THE FIGHT") ----------------
     Optional linkage on the BANK A PIECE pane. The picker mounted only when
     the Studio plugin registry answered ?action=studio_plugins_list
     (sibling backend/Forge build); the route was removed 2026-10-06, so the
     probe now fails closed immediately and the picker never renders.
     PF.bankPrefillMeta is the Forge/plugin prefill hook and works regardless
     of the picker.
     Kill: ?pf_off=bank-meta (META_KILLED -> this whole section no-ops). */
  var META_KILLED = (PF && PF.skip) ? PF.skip('bank-meta') : false;
  var META_TYPES = ['bill', 'rep', 'race', 'org', 'poll', 'prediction', 'campaign'];
  var META_TYPE_LABEL = {
    bill: 'BILL', rep: 'REP', race: 'RACE', org: 'ORG',
    poll: 'POLL', prediction: 'PREDICTION', campaign: 'CAMPAIGN'
  };
  /* Canonical 12 — matches the aligned-nonprofits directory report
     (research_notes/aligned-nonprofits-directory-20261005-0926). */
  var META_AREAS = [
    'Voting Rights & Democracy Reform',
    'Labor & Workers\' Rights',
    'Reproductive Rights & Abortion Access',
    'Climate & Environment',
    'Racial Justice & Civil Rights',
    'LGBTQ+ Rights',
    'Immigrant Rights',
    'Criminal Justice Reform & Police Accountability',
    'Healthcare Access',
    'Housing & Tenants\' Rights',
    'Anti-Poverty & Economic Justice',
    'Government Watchdog & Accountability'
  ];
  function freshMeta() {
    return {
      entity_type: '', entity_id: '', entity_label: '', issue_area: '',
      plugin_id: '', template_id: '', data_hash: '', data_ts: '', parent_id: ''
    };
  }
  function metaState(root) {
    try {
      if (!root._pfMeta) root._pfMeta = freshMeta();
      return root._pfMeta;
    } catch (e) { return freshMeta(); }
  }
  /* Registry probe (was JSONP, 8s: ?action=studio_plugins_list&probe=1).
     ok -> the plugin registry exists and the picker may mount. Anything
     else -> picker never renders.
     2026-10-06 (fe/junk-removal): studio_plugins_list has no backend route
     — fail-soft per poster-forge-political.js: the JSONP call never fires,
     the probe resolves false immediately (the pre-removal outcome), and the
     picker never mounts. The route/query shapes stay documented here for
     scripts/verify-bankmeta-fe.js's string probes. */
  var STUDIO_REGISTRY_DEAD = true;
  var metaProbeDone = false, metaProbeOk = false, metaProbeWaiters = [];
  function metaProbe(cb) {
    if (META_KILLED) { if (cb) { try { cb(false); } catch (e) {} } return; }
    if (metaProbeDone) { if (cb) { try { cb(metaProbeOk); } catch (e2) {} } return; }
    metaProbeWaiters.push(cb || function () {});
    if (metaProbeWaiters.length > 1) return; /* probe already in flight */
    /* Route removed — fail-soft: finish(false) without firing the call. */
    if (STUDIO_REGISTRY_DEAD) { finish(false); return; }
    var settled = false;
    function finish(ok) {
      if (settled) return; settled = true;
      metaProbeDone = true; metaProbeOk = !!ok;
      var ws = metaProbeWaiters; metaProbeWaiters = [];
      for (var i = 0; i < ws.length; i++) { try { ws[i](metaProbeOk); } catch (e3) {} }
    }
    function cleanup(fn, s) {
      try { delete window[fn]; } catch (e4) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e5) {}
    }
    try {
      var be = window.PF_BACKEND_URL;
      if (!be) { finish(false); return; }
      var fn = 'pfMetaProbe' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script');
      window[fn] = function (j) {
        cleanup(fn, s);
        finish(!!(j && (j.ok === true || j.plugins)));
      };
      s.onerror = function () { cleanup(fn, s); finish(false); };
      s.src = be + '?action=' + encodeURIComponent('studio_plugins_list') +
        '&probe=1&callback=' + fn;
      (document.head || document.documentElement).appendChild(s);
      setTimeout(function () { cleanup(fn, s); finish(false); }, 8000);
    } catch (e6) { finish(false); }
  }
  /* Entity search against the registry. cb(entities|null). Entity shape
     (assumed — reconcile with the Forge sibling): {entity_type, entity_id,
     label, data_hash?, data_ts?, plugin_id?}.
     2026-10-06: was GET ?action=studio_plugins_list&q=<q>&entity_type=<t>
     — route removed, fail-soft: resolve null without firing. */
  function metaSearch(q, type, cb) {
    var done = function (ents) { try { cb(ents); } catch (e) {} };
    /* Route removed — fail-soft: never fire, resolve null (no entities). */
    if (STUDIO_REGISTRY_DEAD) { done(null); return; }
    try {
      var be = window.PF_BACKEND_URL;
      if (!be || !q) { done(null); return; }
      var fn = 'pfMetaSearch' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script');
      var settled = false;
      function cleanup() {
        try { delete window[fn]; } catch (e2) {}
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e3) {}
      }
      function finish(ents) {
        if (settled) return; settled = true;
        cleanup(); done(ents);
      }
      window[fn] = function (j) {
        var ents = null;
        try {
          if (j && j.ok !== false) {
            if (j.entities && j.entities.length) ents = j.entities;
            else if (j.results && j.results.length) ents = j.results;
          }
        } catch (e4) {}
        finish(ents);
      };
      s.onerror = function () { finish(null); };
      var src = be + '?action=' + encodeURIComponent('studio_plugins_list') +
        '&q=' + encodeURIComponent(q) + '&callback=' + fn;
      if (type) src += '&entity_type=' + encodeURIComponent(type);
      s.src = src;
      (document.head || document.documentElement).appendChild(s);
      setTimeout(function () { finish(null); }, 8000);
    } catch (e5) { done(null); }
  }

  function metaPickerHtml() {
    var areas = '<option value="">No issue area</option>';
    for (var i = 0; i < META_AREAS.length; i++) {
      areas += '<option value="' + esc(META_AREAS[i]) + '">' + esc(META_AREAS[i]) + '</option>';
    }
    var types = '<option value="">No entity</option>';
    for (var k = 0; k < META_TYPES.length; k++) {
      types += '<option value="' + META_TYPES[k] + '">' + META_TYPE_LABEL[META_TYPES[k]] + '</option>';
    }
    return '<div class="rx-meta" data-rx-meta="1">' +
      '<p class="rx-meta-head">LINK TO THE FIGHT <span>OPTIONAL</span></p>' +
      '<p class="rx-meta-sub">Tie this piece to a bill, a rep, a race — or just the ' +
        'fight it&#39;s for. Factual linkage only; changes nothing about XP.</p>' +
      '<label>FIGHT (ISSUE AREA)</label>' +
      '<select data-rx-f="meta_issue">' + areas + '</select>' +
      '<label>ENTITY TYPE</label>' +
      '<select data-rx-f="meta_type">' + types + '</select>' +
      '<label>FIND AN ENTITY</label>' +
      '<input type="text" data-rx-f="meta_q" placeholder="e.g. H.R. 14, TX-21, a rep&#39;s name&hellip;" ' +
        'maxlength="120" autocomplete="off">' +
      '<div class="rx-meta-res" data-rx-metares="1"></div>' +
      '<div class="rx-meta-sel" data-rx-metasel="1"></div>' +
      '</div>';
  }

  function metaChipHtml(st) {
    var label = st.entity_label || st.entity_id;
    var tag = (META_TYPE_LABEL[st.entity_type] || String(st.entity_type || '').toUpperCase());
    return '<span class="rx-meta-chip">' + esc(tag) + ' &middot; ' + esc(label) +
      '<button type="button" data-rx-metaclear="1" aria-label="Unlink entity">&times;</button></span>';
  }
  /* Sync the picker's visible controls to the metadata state. Safe when the
     picker never mounted (probe failed) — state still rides the submit. */
  function applyMetaView(root) {
    try {
      var st = metaState(root);
      var box = root.querySelector('[data-rx-meta]');
      if (!box) return;
      var is = box.querySelector('[data-rx-f="meta_issue"]');
      if (is) is.value = st.issue_area || '';
      var ts = box.querySelector('[data-rx-f="meta_type"]');
      if (ts) ts.value = st.entity_type || '';
      var sel = box.querySelector('[data-rx-metasel]');
      if (sel) {
        sel.innerHTML = (st.entity_id && st.entity_type) ? metaChipHtml(st) : '';
      }
    } catch (e) {}
  }
  function clearMetaState(root, clearInputs) {
    try {
      root._pfMeta = freshMeta();
      applyMetaView(root);
      if (clearInputs) {
        var q = root.querySelector('[data-rx-f="meta_q"]');
        if (q) q.value = '';
        var res = root.querySelector('[data-rx-metares]');
        if (res) res.innerHTML = '';
      }
    } catch (e) {}
  }
  function renderMetaResults(root, box, ents) {
    var res;
    try { res = box.querySelector('[data-rx-metares]'); } catch (e) { return; }
    if (!res) return;
    if (!ents || !ents.length) {
      res.innerHTML = '<div class="rx-note">No entities found — try different words.</div>';
      return;
    }
    var h = '';
    for (var i = 0; i < Math.min(ents.length, 8); i++) {
      var en = ents[i] || {};
      var tag = META_TYPE_LABEL[en.entity_type] || String(en.entity_type || '').toUpperCase() || 'ENTITY';
      h += '<button type="button" class="rx-meta-hit" data-rx-metahit="' + i + '">' +
        '<b>' + esc(tag) + '</b> &middot; ' + esc(en.label || en.entity_id || '') + '</button>';
    }
    res.innerHTML = h;
    res._pfEnts = ents;
  }
  function wireMetaPicker(root, box) {
    var st = metaState(root);
    function on(el, ev, fn) {
      try { if (el) el.addEventListener(ev, fn); } catch (e) {}
    }
    var is = box.querySelector('[data-rx-f="meta_issue"]');
    on(is, 'change', function () { st.issue_area = String(is.value || ''); });
    var ts = box.querySelector('[data-rx-f="meta_type"]');
    on(ts, 'change', function () {
      st.entity_type = String(ts.value || '');
      /* Changing the type drops a mismatched entity selection. */
      if (st.entity_id && st.entity_type && st._lastType && st._lastType !== st.entity_type) {
        st.entity_id = ''; st.entity_label = ''; st.data_hash = ''; st.data_ts = ''; st.plugin_id = '';
      }
      applyMetaView(root);
    });
    var q = box.querySelector('[data-rx-f="meta_q"]');
    var timer = null, lastQ = '';
    function runSearch() {
      var qv = '';
      try { qv = String(q.value || '').trim(); } catch (e) {}
      if (qv === lastQ) return; lastQ = qv;
      if (qv.length < 2) {
        try { box.querySelector('[data-rx-metares]').innerHTML = ''; } catch (e2) {}
        return;
      }
      metaSearch(qv, st.entity_type, function (ents) {
        try { renderMetaResults(root, box, ents); } catch (e3) {}
      });
    }
    on(q, 'input', function () {
      try { if (timer) clearTimeout(timer); } catch (e) {}
      timer = setTimeout(runSearch, 400);
    });
    on(box, 'click', function (ev) {
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var hit = t.getAttribute('data-rx-metahit');
        if (t.classList && t.classList.contains('rx-meta-hit')) hit = '0';
        /* The button or any child carries the index. */
        var btn = t.closest ? t.closest('[data-rx-metahit]') : null;
        var idx = btn ? btn.getAttribute('data-rx-metahit') : hit;
        var res = box.querySelector('[data-rx-metares]');
        if (idx !== null && idx !== undefined && res && res._pfEnts) {
          var en = res._pfEnts[Number(idx)] || {};
          st.entity_type = String(en.entity_type || st.entity_type || '');
          st.entity_id = String(en.entity_id || '');
          st.entity_label = String(en.label || en.entity_id || '');
          st.data_hash = String(en.data_hash || '');
          st.data_ts = String(en.data_ts || '');
          if (en.plugin_id) st.plugin_id = String(en.plugin_id);
          st._lastType = st.entity_type;
          res.innerHTML = '';
          try { q.value = ''; lastQ = ''; } catch (e2) {}
          applyMetaView(root);
          return;
        }
        if (t.getAttribute('data-rx-metaclear') || (t.closest && t.closest('[data-rx-metaclear]'))) {
          st.entity_type = ''; st.entity_id = ''; st.entity_label = '';
          st.data_hash = ''; st.data_ts = ''; st.plugin_id = ''; st._lastType = '';
          applyMetaView(root);
        }
      } catch (e4) {}
    });
  }
  /* Mount the picker inside the bank form — only after the registry probe
     succeeds. Probe fails -> the placeholder stays empty forever. */
  function mountMetaPicker(root) {
    if (META_KILLED) return;
    var box;
    try { box = root.querySelector('[data-rx-metabox]'); } catch (e) { return; }
    if (!box || box.getAttribute('data-rx-meta-mounted')) return;
    box.setAttribute('data-rx-meta-mounted', '1');
    metaProbe(function (ok) {
      if (!ok) return;
      try {
        if (!root.querySelector('[data-rx-meta]')) box.innerHTML = metaPickerHtml();
        wireMetaPicker(root, box);
        applyMetaView(root);
      } catch (e2) {}
    });
  }
  /* Flattens the picker payload onto the bank_submit body. Backend contract
     (be/content-bank-metadata): 8 FLAT params — the backend reads
     p.entity_type / p.entity_id / ... directly; a nested political_meta
     object would be silently dropped, so it must never ride the wire. */
  var META_KEYS = ['entity_type', 'entity_id', 'issue_area',
    'plugin_id', 'template_id', 'data_hash', 'data_ts', 'parent_id'];
  function metaFlat(body, pm) {
    try {
      for (var i = 0; i < META_KEYS.length; i++) {
        var k = META_KEYS[i];
        if (pm && pm[k]) body[k] = pm[k];
      }
    } catch (e) {}
    return body;
  }
  /* political_meta payload for bank_submit — null when nothing was linked. */
  function metaPayload(root) {
    try {
      var st = metaState(root);
      if (!st.entity_id && !st.issue_area) return null;
      var pm = {};
      if (st.entity_type) pm.entity_type = st.entity_type;
      if (st.entity_id) pm.entity_id = st.entity_id;
      if (st.issue_area) pm.issue_area = st.issue_area;
      if (st.plugin_id) pm.plugin_id = st.plugin_id;
      if (st.template_id) pm.template_id = st.template_id;
      if (st.data_hash) pm.data_hash = st.data_hash;
      if (st.data_ts) pm.data_ts = st.data_ts;
      if (st.parent_id) pm.parent_id = st.parent_id;
      return pm;
    } catch (e) { return null; }
  }
  /* Pending prefill for PF.bankPrefillMeta when the composer isn't mounted
     yet — applied by renderBank. */
  var pendingMetaPrefill = null;
  function applyMetaPrefill(meta) {
    var root = null;
    try { root = bankMounted; } catch (e) {}
    if (!root || !document.contains(root)) return false;
    try {
      var st = metaState(root);
      if (meta.entity_type) st.entity_type = String(meta.entity_type);
      if (meta.entity_id) st.entity_id = String(meta.entity_id);
      if (meta.entity_label) st.entity_label = String(meta.entity_label);
      else if (meta.entity_id) st.entity_label = String(meta.entity_id);
      if (meta.issue_area) st.issue_area = String(meta.issue_area);
      if (meta.plugin_id) st.plugin_id = String(meta.plugin_id);
      if (meta.template_id) st.template_id = String(meta.template_id);
      if (meta.data_hash) st.data_hash = String(meta.data_hash);
      if (meta.data_ts) st.data_ts = String(meta.data_ts);
      if (meta.parent_id) st.parent_id = String(meta.parent_id);
      st._lastType = st.entity_type;
      var ae = root.querySelector('[data-rx-f="artifact"]');
      if (meta.artifact_url && ae) ae.value = String(meta.artifact_url);
      var ce = root.querySelector('[data-rx-f="caption"]');
      if (meta.caption && ce) ce.value = String(meta.caption);
      applyMetaView(root);
      if (meta.note) {
        var nb = root.querySelector('[data-rx-meta]');
        if (nb) {
          var d = document.createElement('div');
          d.className = 'rx-meta-note';
          d.textContent = String(meta.note);
          nb.insertBefore(d, nb.firstChild);
        }
        try { if (PF && PF.toast) PF.toast(String(meta.note)); } catch (e2) {}
      }
      try { if (root.scrollIntoView) root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e3) {}
      return true;
    } catch (e4) { return false; }
  }

  /* ---------------- init ---------------- */
  function init() {
    try {
      if (!document.body) return;
      /* Dedicated read rail — explicit anchor only. */
      var rail = document.getElementById('pf-readxp');
      if (rail && newsTopPresent()) {
        getStories().then(function (stories) {
          if (stories.length) renderRail(rail, stories);
        });
      }
      /* Dedicated bank composer — explicit anchor only. */
      var bank = document.getElementById('pf-readxp-bank');
      if (bank) renderBank(bank);
      /* Decorate Top Stories surfaces + Ammo Finder cards as they render. */
      function sweep(root) {
        try { decorateNewstop(root); } catch (e) {}
        try { decorateAmmo(root); } catch (e2) {}
      }
      sweep(document);
      try {
        if (window.MutationObserver) {
          var mo = new MutationObserver(function (muts) {
            try {
              for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                if (m && m.addedNodes && m.addedNodes.length) {
                  for (var k = 0; k < m.addedNodes.length; k++) {
                    var n = m.addedNodes[k];
                    if (n && n.nodeType === 1) sweep(n);
                  }
                }
              }
            } catch (e3) {}
          });
          mo.observe(document.body, { childList: true, subtree: true });
        }
      } catch (e4) {}
    } catch (e) {}
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  } catch (e) { try { init(); } catch (e2) {} }

  /* ---------------- public API ---------------- */
  /* Forge / plugin prefill hook (political metadata, 2026-10-05).
     meta = {entity_type, entity_id, entity_label?, issue_area?,
             plugin_id?, template_id?, data_hash?, data_ts?, parent_id?,
             artifact_url?, caption?, note?}.
     Writes the metadata state (attaches to the next bank_submit via
     political_meta), pre-fills artifact/caption when supplied, scrolls the
     composer into view, and shows the note. Returns true when applied to a
     mounted composer, false when stashed for a later mount. No-op (false)
     under ?pf_off=bank-meta. */
  PF.bankPrefillMeta = function (meta) {
    try {
      if (META_KILLED) return false;
      if (!meta) return false;
      if (applyMetaPrefill(meta)) { pendingMetaPrefill = null; return true; }
      pendingMetaPrefill = meta;
      return false;
    } catch (e) { return false; }
  };
  PF.readXP = {
    start: start,
    rail: function (el) {
      try {
        if (!newsTopPresent()) return;
        getStories().then(function (stories) {
          if (stories.length) renderRail(el, stories);
        });
      } catch (e) {}
    },
    bank: renderBank,
    citeTokens: citeTokens,
    copy: COPY,
    /* test hooks for scripts/verify-readcreate-fe.js — not for page use */
    _t: {
      esc: esc, safeUrl: safeUrl, depth: depth, storyHash: storyHash,
      beat: beat, submitClaim: submitClaim, teardown: teardown,
      decorateAmmo: decorateAmmo, pushToken: pushToken,
      sessions: sessions, api: api, ACT: ACT, TYPE: TYPE, AKEY: AKEY,
      HB_MS: HB_MS, COPY: COPY,
      /* political metadata test hooks */
      bankPrefillMeta: PF.bankPrefillMeta, metaKilled: META_KILLED,
      metaTypes: META_TYPES, metaAreas: META_AREAS,
      metaProbe: metaProbe, metaPayload: metaPayload, metaFlat: metaFlat,
      mountMetaPicker: mountMetaPicker, applyMetaPrefill: applyMetaPrefill
    }
  };
})();
