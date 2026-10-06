/* games/predgame.js  |  PF v1.4.3 | CALL IT. — staff-authored prediction questions.
   The bill game (predict.js, "CALL THE SHOT") is untouched by design; this is
   the parallel expansion module (spec: specs/prediction-game-expansion-20261005.md).
   BACKEND CONTRACT (built in parallel by the BE worker — code defensively):
     predict_qlist       GET: -> {ok, questions:[{id, title, category,
                             options:[{id,label}], status, lock_at, rules,
                             resolution:{outcome, source_label, source_url}|null}],
                             picks:[{question_id, option_id, correct}]}
     predict_qpick       POST (callsign auth): {question_id, option_id} -> {ok} | {err}
     predict_qleaderboard GET -> {ok, leaders:[{callsign, wins, losses, resolved}]}
   Defensive: if the backend or these actions don't exist yet, the section
   hides itself and logs — the page never breaks. Same fail-soft pattern as
   predict.js. No invented questions: renders only questions returned by
   predict_qlist. XP is backend-granted; the UI only advertises +25 XP.
   LAYERING: game silo. Self-contained engine (no inner <script> in the staged
   template — the engine lives in the outer IIFE, like ritual-calendar.js's
   self-mount). Reads via JSONP (self-contained api()), writes via CORS POST
   (self-contained post(), {type:'predictq', p_action:...} — mirrors the
   fan-vote/predict {type, p_action} convention). Never reaches into another
   silo's internals.
   MOUNT POINTS: /arcade (game hub, category 'all'), /political-hq (BALLOT hub
   via pages/political-hq.js ORDER + phq-hubs.js ballot order, 'elections'
   preselected), /money (self-mounts into #pf-money, 'economy' preselected).
   One section component; category preselect is detected per page, and the
   chips let the reader switch freely.
   COPY RULES (Psych gate): never "bet", "wager", "odds", "payout". Use
   "call", "pick", "right calls pay +25 XP". Economy questions carry the
   "Game only — not financial advice." disclaimer. Resolved questions show
   outcome + "RESOLVED — source: <label>" with link; unresolved questions
   never imply an outcome.
   KILL: ?pf_off=predgame  or  localStorage pf_disabled_v1='["predgame"]'
   PUBLIC API: window.PFPredgame.mount(el) — render the section into an
   element (used by page templates); window.PFPredgameMount(el) alias. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('predgame')) { return; }
  /* Staged once even if this file ships in two chunks on the same page. */
  if (document.getElementById('pf-ov-predgame')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-predgame">
<div class="fe-block pf-override-block pf-silo" id="pf-predgame">
<h2>CALL IT.</h2>
<div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div>
<div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div>
<style>
/* CALL IT. (2026-10-05) — prediction game expansion. Mobile-first, touch targets >= 44px. */
#pf-predgame .pq-row{margin:12px 0;padding:12px;border:2px solid #3a3a3a;background:#0d0d0d}
#pf-predgame .pq-title{font-weight:900;font-size:1rem;color:#f5f0e1;margin-bottom:6px;line-height:1.3}
#pf-predgame .pq-status{font-size:0.75rem;letter-spacing:0.14em;color:#b8ab8e;margin-bottom:8px}
#pf-predgame .pq-rules{font-size:0.85rem;color:#b8ab8e;line-height:1.45;margin:8px 0}
#pf-predgame .pq-picks{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}
#pf-predgame .pq-btn{flex:1 1 140px;min-height:48px;font-weight:900;font-size:0.95rem;letter-spacing:0.06em;cursor:pointer;border:2px solid var(--pf-red);background:#141414;color:#f5f0e1;font-family:inherit;padding:10px 12px;line-height:1.25}
#pf-predgame .pq-btn:active{background:var(--pf-red)}
#pf-predgame .pq-btn:disabled{opacity:0.55;cursor:default}
#pf-predgame .pq-xpline{font-size:0.8rem;color:var(--pf-red);font-weight:700;letter-spacing:0.08em;margin:8px 0 0}
#pf-predgame .pq-disclaim{font-size:0.75rem;color:#b8ab8e;font-style:italic;margin:6px 0 0}
#pf-predgame .pq-msg{min-height:1.4em;font-size:0.85rem;color:#b8ab8e;margin-top:8px}
#pf-predgame .pq-locked{border:2px solid var(--pf-red);background:#1a0505;padding:12px;font-weight:700;color:#f5f0e1}
#pf-predgame .pq-locked .pq-xpline{color:#f5f0e1}
#pf-predgame .pq-result{border:2px solid #4a4a4a;padding:12px}
#pf-predgame .pq-win{color:#7fd069;font-weight:900}
#pf-predgame .pq-loss{color:var(--pf-red);font-weight:900}
#pf-predgame .pq-void{border:2px dashed #4a4a4a;padding:12px;color:#b8ab8e;font-weight:700}
#pf-predgame .pq-src{font-size:0.85rem;color:#b8ab8e;margin-top:6px}
#pf-predgame .pq-src a{color:var(--pf-gold)}
#pf-predgame .pq-record{font-size:1rem;font-weight:900;letter-spacing:0.12em;color:#f5f0e1;margin:10px 0}
#pf-predgame .pq-record b{color:var(--pf-red)}
#pf-predgame .pq-board{margin-top:18px}
#pf-predgame .pq-board h3{letter-spacing:0.18em;font-size:0.95rem;color:var(--pf-red);margin:0 0 8px}
#pf-predgame .pq-lrow{display:flex;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid #2a2a2a;font-size:0.9rem;min-height:44px;box-sizing:border-box}
#pf-predgame .pq-lrank{width:2.2em;font-weight:900;color:#b8ab8e}
#pf-predgame .pq-lname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5f0e1}
#pf-predgame .pq-lwl{color:#b8ab8e;font-size:0.8rem}
#pf-predgame .pq-chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#pf-predgame .pq-chip{min-height:44px;padding:10px 16px;font-weight:900;font-size:0.8rem;letter-spacing:0.1em;cursor:pointer;border:2px solid #4a4a4a;background:#141414;color:#b8ab8e;font-family:inherit}
#pf-predgame .pq-chip[aria-pressed="true"]{border-color:var(--pf-red);color:#f5f0e1;background:#1a0505}
#pf-predgame .pq-cat{font-size:0.7rem;letter-spacing:0.16em;color:var(--pf-gold);font-weight:900;margin-bottom:6px}
#pf-predgame .pq-gate{border:2px dashed #4a4a4a;padding:14px;color:#b8ab8e;font-size:0.9rem}
</style>
</div>
</template>`);

  var BACKEND = window.PF_BACKEND_URL;
  var PFG = window.PFPredgame = window.PFPredgame || {};
  PFG.XP_REWARD = 25;
  var CATS = [
    ['all', 'ALL'],
    ['elections', 'ELECTIONS'],
    ['economy', 'ECONOMY'],
    ['movement', 'MOVEMENT']
  ];
  var CAT_LABEL = { elections: 'ELECTIONS', economy: 'ECONOMY', movement: 'MOVEMENT' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* JSONP GET — mirrors predict.js api(). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPqCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }
    q += '&callback=' + fn;
    s.src = BACKEND + q; document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }
  /* Authenticated JSONP GET — PF.authGetJSONP attaches callsign/device/
     auth_secret + claim-retry when available; falls back to raw api().
     Required: the BE's GET rail enforces the IDOR guard (auth when
     &callsign is present), so the secret must ride along. */
  function apiAuth(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, action, params || {}, cb);
        return;
      }
    } catch (e) {}
    api(action, params, cb);
  }
  function isAuthErr(j) {
    return /missing credentials|unauthorized|legacy_callsign|no secret issued/.test(String((j && (j.err || j.error)) || ''));
  }
  /* CORS POST — {type:'predictq', p_action:...}, same convention as
     predict.js's {type:'predict', p_action:...}. PF.authPost attaches
     auth_secret automatically when available. */
  function post(action, params, cb) {
    var body = { type: 'predictq', p_action: action };
    for (var k in params) { body[k] = params[k]; }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr }, c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) {}
      fetch(BACKEND, o)
        .then(function (r) { return r.json(); })
        .then(function (j) { if (t) { try { clearTimeout(t); } catch (e) {} } done(j); })
        .catch(function () { if (t) { try { clearTimeout(t); } catch (e) {} } done(null); });
    } catch (e) { done(null); }
  }
  function errMsg(j, dflt) {
    try { if (window.PF && PF.errCopy) return PF.errCopy(j, dflt); } catch (e) {}
    try { if (window.PF && PF.friendlyErr && PF.friendlyErr(j)) return PF.friendlyErr(j); } catch (e2) {}
    if (j && (j.err || j.error)) return String(j.err || j.error);
    return dflt;
  }

  /* ---- question normalization (tolerates the BE worker's key variants) ---- */
  function normQ(q, pickMap) {
    q = q || {};
    var id = q.id || q.question_id || q.qid || '';
    var title = q.title || q.question || q.text || 'Untitled question';
    var cat = String(q.category || q.cat || '').toLowerCase();
    if (CAT_LABEL[cat] == null) cat = '';
    var opts = q.options || q.choices || q.answers || [];
    if (!Array.isArray(opts)) opts = [];
    opts = opts.map(function (o) {
      o = o || {};
      return { id: String(o.id || o.option_id || o.value || ''), label: String(o.label || o.text || o.name || '') };
    }).filter(function (o) { return o.id && o.label; });
    var status = String(q.status || q.state || 'open').toLowerCase();
    if (['open', 'locked', 'resolved', 'voided'].indexOf(status) === -1) status = 'open';
    var lockAt = q.lock_at || q.lockAt || q.locks_at || q.closes_at || null;
    var rules = q.rules || q.question_rules || q.rules_text || '';
    var res = q.resolution || q.result || q.resolved || null;
    if (res && typeof res === 'object') {
      res = {
        outcome: String(res.outcome || res.winning_option || res.winner || ''),
        source_label: String(res.source_label || res.source || res.label || ''),
        source_url: String(res.source_url || res.url || res.link || '')
      };
    } else if (q.winning_option || q.source_label || q.source_url) {
      /* BE flat shape (publicQuestion): winning_option/source_label/source_url
         live at the question top level, not inside a resolution object. */
      res = {
        outcome: String(q.winning_option || ''),
        source_label: String(q.source_label || ''),
        source_url: String(q.source_url || '')
      };
    } else { res = null; }
    var pick = (pickMap && pickMap[String(id)]) || null;
    return {
      id: String(id), title: String(title), category: cat, options: opts,
      status: status, lock_at: lockAt, rules: String(rules), resolution: res,
      my_pick: pick ? String(pick.option_id || pick.optionId || '') : '',
      my_correct: pick ? normCorrect(pick) : null,
      raw: q
    };
  }
  /* BE sends correct as INTEGER 1/0/NULL (and voided as INTEGER flag).
     Normalize to true/false/null so the render states work. */
  function normCorrect(pick) {
    if (pick.voided === 1 || pick.voided === '1' || pick.voided === true) return null;
    var c = pick.correct;
    if (c === 1 || c === '1' || c === true) return true;
    if (c === 0 || c === '0' || c === false) return false;
    return null;
  }
  function isLocked(q) {
    if (q.status === 'locked' || q.status === 'resolved' || q.status === 'voided') return true;
    if (q.status === 'open' && q.lock_at) {
      var t = Date.parse(q.lock_at);
      if (!isNaN(t) && t <= Date.now()) return true;
    }
    return false;
  }
  function lockText(lockAt) {
    var t = Date.parse(lockAt);
    if (isNaN(t)) return 'LOCKS SOON';
    var ms = t - Date.now();
    if (ms <= 0) return 'LOCKED';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return 'LOCKS IN ' + d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return 'LOCKS IN ' + h + 'h ' + m + 'm';
    return 'LOCKS IN ' + m + 'm ' + (s % 60) + 's';
  }
  function optLabel(q, oid) {
    for (var i = 0; i < q.options.length; i++) {
      if (String(q.options[i].id) === String(oid)) return q.options[i].label;
    }
    return '';
  }

  /* ---- section state ---- */
  var state = { questions: [], leaders: [], cat: 'all', record: { wins: 0, losses: 0 }, hasPicks: false };

  function recordHTML() {
    return '<div class="pq-record">YOUR RECORD: <b>' + state.record.wins + 'W</b> &ndash; <b>' + state.record.losses + 'L</b></div>';
  }
  function chipsHTML() {
    var h = '<div class="pq-chips" role="group" aria-label="Filter by category">';
    for (var i = 0; i < CATS.length; i++) {
      var on = state.cat === CATS[i][0];
      h += '<button type="button" class="pq-chip" data-cat="' + CATS[i][0] + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + CATS[i][1] + '</button>';
    }
    return h + '</div>';
  }
  function questionHTML(q) {
    var h = '<div class="pq-row" data-q="' + esc(q.id) + '">';
    if (q.category && CAT_LABEL[q.category]) h += '<div class="pq-cat">' + CAT_LABEL[q.category] + '</div>';
    h += '<div class="pq-title">' + esc(q.title) + '</div>';
    if (q.rules) h += '<div class="pq-rules">' + esc(q.rules) + '</div>';

    if (q.status === 'voided') {
      h += '<div class="pq-void">VOIDED &mdash; this question could not resolve cleanly. No calls counted, no XP moved.</div>';
    } else if (q.status === 'resolved' && q.resolution) {
      /* resolved: outcome + source link, never implied */
      var winLabel = optLabel(q, q.resolution.outcome) || q.resolution.outcome;
      h += '<div class="pq-result"><div class="pq-status">RESOLVED</div>'
        + '<div>OUTCOME: <b>' + esc(winLabel) + '</b></div>';
      if (q.resolution.source_label || q.resolution.source_url) {
        h += '<div class="pq-src">RESOLVED &mdash; source: ';
        if (q.resolution.source_url) {
          h += '<a href="' + esc(q.resolution.source_url) + '" target="_blank" rel="noopener">' + esc(q.resolution.source_label || 'official source') + '</a>';
        } else {
          h += esc(q.resolution.source_label);
        }
        h += '</div>';
      }
      if (q.my_pick) {
        if (q.my_correct === true) {
          h += '<div class="pq-win">YOU CALLED IT. +' + PFG.XP_REWARD + ' XP.</div>';
        } else if (q.my_correct === false) {
          h += '<div class="pq-loss">MISSED IT. You called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b> &mdash; the next board is already open.</div>';
        } else {
          h += '<div class="pq-msg">You called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b>.</div>';
        }
      } else {
        h += '<div class="pq-msg">You made no call on this one. The next board is already open.</div>';
      }
      if (q.category === 'economy') h += '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>';
      h += '</div>';
    } else if (q.my_pick) {
      /* picked — locked in (no changing, matches the bill-game convention) */
      h += '<div class="pq-locked">LOCKED IN &mdash; you called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b>.'
        + '<div class="pq-xpline">Right call pays +' + PFG.XP_REWARD + ' XP.</div>'
        + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
        + '</div>';
    } else if (isLocked(q)) {
      h += '<div class="pq-locked">LOCKED &mdash; calls are closed on this one. The next board is already open.'
        + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
        + '</div>';
    } else {
      /* open pick */
      var cs = ident().callsign;
      h += '<div class="pq-status pq-countdown" data-lock="' + esc(String(q.lock_at || '')) + '">' + esc(lockText(q.lock_at)) + '</div>';
      if (!cs) {
        h += '<div class="pq-gate">You need a callsign to make the call. Enlist first, then pick your fights.</div>';
      } else if (!q.options.length) {
        h += '<div class="pq-msg">Options for this question are still being set. Check back soon.</div>';
      } else {
        h += '<div class="pq-picks">';
        for (var i = 0; i < q.options.length; i++) {
          h += '<button type="button" class="pq-btn" data-act="pick" data-opt="' + esc(q.options[i].id) + '">' + esc(q.options[i].label) + '</button>';
        }
        h += '</div>'
          + '<div class="pq-xpline">NAIL THE CALL: +' + PFG.XP_REWARD + ' XP. Wrong calls cost you nothing but pride.</div>'
          + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
          + '<div class="pq-msg"></div>';
      }
    }
    h += '</div>';
    return h;
  }
  function leaderboardHTML() {
    var h = '<div class="pq-board"><h3>TOP CALLERS</h3>';
    if (!state.leaders || !state.leaders.length) {
      h += '<div class="pq-msg">No calls on the board yet. Be the first to read the room.</div></div>';
      return h;
    }
    for (var i = 0; i < state.leaders.length && i < 25; i++) {
      var r = state.leaders[i] || {};
      var cs = r.callsign || r.name || 'UNKNOWN';
      var w = Number(r.wins || 0), l = Number(r.losses || 0);
      var res = Number(r.resolved || 0);
      h += '<div class="pq-lrow"><span class="pq-lrank">' + (i + 1) + '</span>'
        + '<span class="pq-lname">' + esc(cs) + '</span>'
        + '<span class="pq-lwl">' + w + 'W &ndash; ' + l + 'L' + (res ? ' &middot; ' + res + ' called' : '') + '</span></div>';
    }
    return h + '</div>';
  }
  function listHTML() {
    var qs = state.questions;
    var vis = qs.filter(function (q) { return state.cat === 'all' || q.category === state.cat; });
    var h = '';
    if (!vis.length) {
      h = '<div class="pq-msg">' + (qs.length
        ? 'No ' + esc(state.cat) + ' questions on the board right now. Try another category.'
        : 'No questions on the board right now. The machine never sleeps &mdash; check back.') + '</div>';
    } else {
      for (var i = 0; i < vis.length; i++) h += questionHTML(vis[i]);
    }
    return h;
  }
  function sectionHTML() {
    return chipsHTML() + recordHTML() + '<div class="pq-qlist">' + listHTML() + '</div>' + leaderboardHTML();
  }

  /* ---- binding ---- */
  function bindSection(root) {
    /* chips */
    var chips = root.querySelectorAll ? root.querySelectorAll('.pq-chip') : [];
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.onclick = function () {
          state.cat = chip.getAttribute('data-cat') || 'all';
          renderInto(root);
        };
      })(chips[i]);
    }
    /* pick buttons */
    var rows = root.querySelectorAll ? root.querySelectorAll('.pq-row') : [];
    for (var j = 0; j < rows.length; j++) {
      (function (row) {
        var qid = row.getAttribute('data-q');
        var btns = row.querySelectorAll('.pq-btn[data-act="pick"]');
        for (var k = 0; k < btns.length; k++) {
          (function (btn) {
            btn.onclick = function () {
              var oid = btn.getAttribute('data-opt');
              var idt = ident();
              if (!idt.callsign) { toast('Enlist first — you need a callsign.'); return; }
              for (var m = 0; m < btns.length; m++) btns[m].disabled = true;
              var msg = row.querySelector('.pq-msg');
              function say(t) { if (msg) { msg.textContent = t; } }
              post('predict_qpick', { callsign: idt.callsign, device: idt.device, question_id: qid, option_id: oid }, function (jj) {
                if (jj && jj.ok) {
                  toast('Call locked in. +' + PFG.XP_REWARD + ' XP if you nail it.');
                  /* mark the pick locally so re-render shows the locked state */
                  for (var n = 0; n < state.questions.length; n++) {
                    if (state.questions[n].id === qid) { state.questions[n].my_pick = oid; break; }
                  }
                  renderInto(root);
                } else {
                  say(errMsg(jj, 'Call failed — try again.'));
                  for (var p = 0; p < btns.length; p++) btns[p].disabled = false;
                }
              });
            };
          })(btns[k]);
        }
      })(rows[j]);
    }
  }
  function renderInto(root) {
    try {
      root.innerHTML = sectionHTML();
      bindSection(root);
    } catch (e) { failSoft(root, 'render failed (soft)'); }
  }
  /* Lock countdown ticker — one interval for the whole section. */
  var tickIv = null;
  function startTicker(root) {
    if (tickIv) return;
    try {
      tickIv = setInterval(function () {
        try {
          var els = root.querySelectorAll ? root.querySelectorAll('.pq-countdown') : [];
          var anyOpen = false;
          for (var i = 0; i < els.length; i++) {
            var lockAt = els[i].getAttribute('data-lock');
            els[i].textContent = lockText(lockAt);
            if (String(lockText(lockAt)).indexOf('LOCKS IN') === 0) anyOpen = true;
          }
          if (!anyOpen && tickIv) { clearInterval(tickIv); tickIv = null; }
        } catch (e) {}
      }, 30000);
    } catch (e) {}
  }

  function defaultCat() {
    try {
      if (document.getElementById('pf-political-hq')) return 'elections';
      if (document.getElementById('pf-money')) return 'economy';
    } catch (e) {}
    return 'all';
  }
  function failSoft(root, msg) {
    try { console.log('[predgame] ' + msg); } catch (e) {}
    try {
      /* hide the whole section shell so the page never shows a dead box */
      var shell = root.closest ? root.closest('section') : null;
      if (shell) { shell.style.display = 'none'; } else { root.style.display = 'none'; }
    } catch (e2) {}
  }

  function mountSectionInto(el) {
    var x = (el.querySelector && el.id === 'xPredgame') ? el : (el.querySelector ? el.querySelector('#xPredgame') : null);
    var root = x || el;
    function gone(msg) { failSoft(root, msg); }
    if (!BACKEND) { gone('no backend URL — section hidden'); return; }
    var idt = ident();
    /* Authed read: the BE's GET rail requires auth when &callsign is present
       (IDOR guard). apiAuth attaches the secret + claim-retry. If this
       browser's callsign has no usable secret (e.g. legacy callsign), fall
       back to the public board — questions show, my-picks don't. */
    apiAuth('predict_qlist', { callsign: idt.callsign, device: idt.device }, function (j) {
      if (j && j.ok === false && idt.callsign && isAuthErr(j)) {
        api('predict_qlist', {}, function (j2) { onQlist(j2); });
        return;
      }
      onQlist(j);
    });
    function onQlist(j) {
      /* Backend actions missing (parallel BE build not landed yet) or the
         request failed: the section hides itself, the page never breaks. */
      if (!j || j.ok === false) { gone('predict_qlist unavailable — section hidden'); return; }
      var qs = j.questions || j.rows || j.list || [];
      var picks = j.picks || j.my_picks || j.user_picks || [];
      var pickMap = {};
      for (var i = 0; i < picks.length; i++) {
        var p = picks[i] || {};
        var qid = p.question_id || p.questionId || p.qid || p.id;
        if (qid) pickMap[String(qid)] = p;
      }
      state.questions = qs.map(function (q) { return normQ(q, pickMap); });
      /* my-record strip: wins/losses from resolved picks the backend scored */
      var w = 0, l = 0;
      state.questions.forEach(function (q) {
        if (q.my_pick && q.my_correct === true) w++;
        else if (q.my_pick && q.my_correct === false) l++;
      });
      state.record = { wins: w, losses: l };
      state.hasPicks = state.questions.some(function (q) { return !!q.my_pick; });
      state.cat = defaultCat();
      api('predict_qleaderboard', {}, function (j2) {
        state.leaders = (j2 && (j2.leaders || j2.rows || j2.top || j2.board)) || [];
        try {
          renderInto(root);
          startTicker(root);
        } catch (e) { gone('render failed (soft)'); }
      });
    }
  }
  PFG.mount = mountSectionInto;
  window.PFPredgameMount = mountSectionInto;

  /* Auto-mount: (1) template-instantiated mounts — /arcade via page-mount.js
     PAGE_ORDERS, /political-hq via pages/political-hq.js ORDER — both leave
     #xPredgame in the DOM; (2) /money self-mount — #pf-money present, no
     template instantiation: build the section chrome ourselves and mount.
     Retry late in case page code stages after this bundle. */
  function moneySelfMount() {
    try {
      if (document.getElementById('xPredgame')) return; /* template path owns it */
      if (document.querySelector('.pf-predgame-self')) return;
      var host = document.getElementById('pf-money');
      if (!host) return;
      var target = host.querySelector('.pf-mp') || host;
      var sec = document.createElement('section');
      sec.className = 'pf-v2-game pf-predgame-self';
      sec.setAttribute('data-game', 'predgame');
      sec.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-predgame">'
        + '<h2>CALL IT.</h2>'
        + '<div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div>'
        + '<div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div>'
        + '</div>';
      target.appendChild(sec);
      var x = sec.querySelector('#xPredgame');
      if (x) { x.setAttribute('data-pf-predgame-mounted', '1'); mountSectionInto(x); }
    } catch (e) {
      try { console.log('[predgame] money self-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
  }
  function autoMount() {
    try {
      var els = document.querySelectorAll ? document.querySelectorAll('#xPredgame') : [];
      for (var i = 0; i < els.length; i++) {
        if (els[i].getAttribute('data-pf-predgame-mounted')) continue;
        els[i].setAttribute('data-pf-predgame-mounted', '1');
        mountSectionInto(els[i]);
      }
    } catch (e) {
      try { console.log('[predgame] auto-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
    moneySelfMount();
  }
  autoMount();
  setTimeout(autoMount, 1500);
  setTimeout(autoMount, 4000);
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  } catch (e) {}
})();
