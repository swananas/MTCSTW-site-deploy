/* games/treasury.js  |  PF v1.4.3 | CELLS wave G7: standalone cell treasury panel.
   FUND THE TREASURY + SPEND + balance trajectory for ONE cell (the viewer's
   own cell). Composes with games/cell-hq.js: the TREASURY tab renders a
   <div id="hqTreasuryPanel"> container and calls window.PFTreasury.mount()
   with the cell context; cell-hq keeps its dividend-payout and R9
   sponsor-a-cause cards below this panel.

   DEDUPE (dedupe check 2026-10-04): 6A's economy.js "Cell Treasury" pane
   (THROW DOWN / SPEND / balance / recent list, any-cell-id input on
   /war-chest) is left untouched — this module is the cell-scoped,
   callsign-aware standalone panel with the G7 balance trajectory and the
   spend-destination chooser. It does NOT duplicate the economy.js widget.

   WHAT'S NEW vs 6A:
   1. Standalone panel module composing with cell-hq (own mount contract).
   2. Balance trajectory — daily snapshots from the new `treasury_history`
      backend action (GET cell_id+days, derived from treasury_log, no new
      table). Renders as an inline SVG sparkline; fail-soft if the action
      isn't registered yet (balance stays live, trajectory says so honestly).
   3. Spend destinations: free-form purpose (treasury_spend) AND
      "SPONSOR A CAUSE ->" deep-linking to the 6A-R9 cause-sponsorship UI
      at /war-chest?cell=<id>&sponsor=1 (movement.js owns that surface —
      reused, not rebuilt).

   COPY RULE: "FUND THE TREASURY". The d-word is banned everywhere here.
   Money moves use native confirm(). Officers-only spend is enforced
   server-side (treasury_spend); the UI mirrors the gate honestly.
   Mounts into <div id="pf-treasury"></div> for standalone use (resolves the
   viewer's primary cell via cell_mine), or via PFTreasury.mount(el, ctx).
   KILL: ?pf_off=treasury  or  localStorage pf_disabled_v1='["treasury"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('treasury')) { return; }
  if (window.pfTreasuryLoaded) { return; }
  window.pfTreasuryLoaded = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TRAJ_DAYS = 30;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { PF.toast(m); } catch (e) {} }
  function fmt(n) { try { return Number(n || 0).toLocaleString(); } catch (e) { return String(n || 0); } }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }

  /* JSONP GET — read-only treasury reads. 12s timeout, same as every silo. */
  function api(action, params, cb) {
    function done(j) { try { cb(j); } catch (e) {} }
    if (!BACKEND) { done(null); return; }
    var fn = 'pfTrzCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), finished = false;
    function finish(j) {
      if (finished) return; finished = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      done(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* Treasury mutations route {type:'treasury', t_action} -> treasuryDispatch.
     PF.postAction attaches the auth secret; fetch fallback mirrors cell-hq. */
  function postTreas(tAction, params, cb) {
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    var id = ident();
    var p = { callsign: id.callsign, device: id.device };
    for (var k in (params || {})) p[k] = params[k];
    if (window.PF && PF.postAction) { PF.postAction('treasury', 't_action', tAction, p, cb); return; }
    if (!BACKEND) { done(null); return; }
    try {
      var body = { type: 'treasury', t_action: tAction };
      for (var k2 in p) body[k2] = p[k2];
      var sec = '';
      try { sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) {}
      if (sec) body.auth_secret = sec;
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) {}
      fetch(BACKEND, o).then(function (r) { return r.json(); })
        .then(function (j) { if (t) try { clearTimeout(t); } catch (e) {} done(j); })
        .catch(function () { if (t) try { clearTimeout(t); } catch (e) {} done(null); });
    } catch (e) { done(null); }
  }

  /* Scoped styles — self-contained so the panel works standalone (outside
     cell-hq's hq-* stylesheet) and inside the TREASURY tab alike. */
  var CSS_DONE = false;
  function ensureCSS() {
    if (CSS_DONE) return; CSS_DONE = true;
    var css = '.trz-panel{max-width:860px;margin:0 auto;font-family:inherit;color:#f5f0e6}' +
      '.trz-card{background:#141414;border:2px solid #2e2e2e;margin:0 0 12px;padding:12px}' +
      '.trz-card.hot{border-color:#c9a227}' +
      '.trz-card h3{margin:0 0 6px;font-size:17px;letter-spacing:.5px}' +
      '.trz-note{font-size:12.5px;opacity:.8;line-height:1.5}' +
      '.trz-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
      '.trz-bal{font-size:30px;font-weight:900;color:#c9a227;margin:2px 0 6px}' +
      '.trz-stat{font-size:13px;background:#1c1c1c;border:1px solid #333;padding:5px 10px;margin:3px 6px 3px 0;display:inline-block}' +
      '.trz-btn{background:#c1121f;color:#fff;border:0;font-weight:700;padding:9px 14px;font-size:14px;cursor:pointer;margin:4px 4px 4px 0}' +
      '.trz-btn.ghost{background:#1c1c1c;border:2px solid #c1121f}' +
      '.trz-btn.sm{padding:6px 10px;font-size:12px}' +
      '.trz-btn:disabled{opacity:.45;cursor:default}' +
      '.trz-in{background:#0a0a0a;color:#f5f0e6;border:2px solid #444;padding:9px 10px;font-size:16px;margin:4px 4px 4px 0;max-width:100%}' +
      '.trz-in.sm{width:110px}' +
      '.trz-bar{height:10px;background:#222;margin:4px 0 6px;position:relative;border-radius:5px;overflow:hidden}' +
      '.trz-bar>div{height:10px;background:linear-gradient(90deg,#c9a227,#f5d76e)}' +
      '.trz-pill{background:#1c1c1c;border:2px solid #3a3a3a;color:#f5f0e6;font-weight:700;font-size:13px;padding:8px 12px;cursor:pointer;margin:4px 4px 4px 0}' +
      '.trz-pill.on{background:#c1121f;border-color:#c1121f}' +
      '.trz-act{display:flex;justify-content:space-between;gap:8px;padding:7px 2px;border-bottom:1px solid #222;font-size:13px}' +
      '.trz-act:last-child{border-bottom:0}' +
      '.trz-pos{color:#7CFC00;font-weight:700}' +
      '.trz-neg{color:#ff8a8a;font-weight:700}' +
      '.trz-err{color:#ff6b6b;font-size:13px;margin-top:6px}' +
      '.trz-ok{color:#7CFC00;font-size:13px;margin-top:6px}' +
      '@media(max-width:560px){.trz-bal{font-size:24px}}';
    var st = document.createElement('style');
    st.type = 'text/css';
    if (st.styleSheet) st.styleSheet.cssText = css; else st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function kindLabel(kind, amount) {
    var k = String(kind || '');
    if (k === 'donate') return 'funded';
    if (k === 'sponsor') return 'sponsored a cause';
    if (k === 'dividend') return 'dividend payout';
    if (k.indexOf('spend:') === 0) return 'spent — ' + k.slice(6).trim();
    if (k.indexOf('spend') === 0) return 'spent';
    return k || 'move';
  }

  /* Inline SVG sparkline. Points: [{date, balance}]. No libs — hand-rolled
     like every other chart on the site. */
  function sparkline(points) {
    var W = 320, H = 110, PAD = 8;
    if (!points || points.length < 2) return '';
    var vals = points.map(function (p) { return Math.max(0, Number(p.balance) || 0); });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn) { mx = mn + 1; }
    function X(i) { return (PAD + (W - 2 * PAD) * (i / (vals.length - 1))).toFixed(1); }
    function Y(v) { return (H - PAD - (H - 2 * PAD) * ((v - mn) / (mx - mn))).toFixed(1); }
    var line = vals.map(function (v, i) { return X(i) + ',' + Y(v); }).join(' ');
    var area = X(0) + ',' + (H - PAD) + ' ' + line + ' ' + X(vals.length - 1) + ',' + (H - PAD);
    var first = points[0].date || '', last = points[points.length - 1].date || '';
    var delta = vals[vals.length - 1] - vals[0];
    var dcol = delta >= 0 ? '#7CFC00' : '#ff8a8a';
    var dsign = delta >= 0 ? '+' : '';
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" style="width:100%;height:auto;display:block" role="img" aria-label="Treasury balance trajectory">' +
      '<polygon points="' + area + '" fill="#c9a227" opacity="0.18"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#c9a227" stroke-width="2.5"/>' +
      '<circle cx="' + X(vals.length - 1) + '" cy="' + Y(vals[vals.length - 1]) + '" r="3.5" fill="#c9a227"/>' +
      '<text x="' + PAD + '" y="' + (H + 12) + '" fill="#f5f0e6" font-size="9" opacity="0.7">' + esc(first) + '</text>' +
      '<text x="' + (W - PAD) + '" y="' + (H + 12) + '" fill="#f5f0e6" font-size="9" opacity="0.7" text-anchor="end">' + esc(last) + '</text>' +
      '<text x="' + PAD + '" y="' + (H + 21) + '" fill="' + dcol + '" font-size="10" font-weight="bold">' + dsign + fmt(delta) + ' XP / ' + TRAJ_DAYS + 'd</text>' +
      '<text x="' + (W - PAD) + '" y="' + (H + 21) + '" fill="#f5f0e6" font-size="10" opacity="0.7" text-anchor="end">peak ' + fmt(mx) + '</text>' +
      '</svg>';
  }

  /* ---------- the panel ---------- */
  function mount(container, ctx) {
    ensureCSS();
    ctx = ctx || {};
    var cellId = String(ctx.cell_id || '');
    var cellName = String(ctx.cell_name || ctx.cell_id || 'your cell');
    var isOfficer = !!ctx.is_officer;
    var uid = 't' + Math.floor(Math.random() * 1e9);
    function gid(n) { return 'trz_' + n + '_' + uid; }

    if (!ident().callsign) {
      container.innerHTML = '<div class="trz-panel"><div class="trz-card"><h3>Claim a callsign first</h3>' +
        '<div class="trz-note">Treasury tools move real XP. Claim your callsign in Daily Orders first.</div></div></div>';
      return;
    }
    if (!cellId) {
      container.innerHTML = '<div class="trz-panel"><div class="trz-card"><h3>Cell Treasury</h3>' +
        '<div class="trz-note">Join a cell to fund its treasury and watch the war chest grow.</div></div></div>';
      return;
    }

    var R = { bal: null, hist: null };
    container.innerHTML = '<div class="trz-panel"><div class="trz-card"><div class="trz-note">Opening the vault&hellip;</div></div></div>';
    var done = 0;
    function each() { done++; if (done >= 2) paint(); }
    api('treasury_balance', { cell_id: cellId }, function (j) { R.bal = j; each(); });
    api('treasury_history', { cell_id: cellId, days: TRAJ_DAYS }, function (j) { R.hist = j; each(); });

    function paint() {
      var b = R.bal, h = R.hist;
      if (!b || !b.ok) {
        container.innerHTML = '<div class="trz-panel"><div class="trz-card"><h3>Cell Treasury</h3>' +
          '<div class="trz-err">The vault would not open. Check your connection and try again.</div></div></div>';
        return;
      }
      var bal = Math.round(Number(b.balance) || 0);
      var cap = Math.round(Number(b.capacity) || 10000);
      var tier = b.prestige_tier || '';
      var pct = cap > 0 ? Math.min(100, Math.round(bal / cap * 100)) : 0;
      var recent = b.recent || [];

      var out = '<div class="trz-panel">';

      /* 1. HEADER — balance + capacity. */
      out += '<div class="trz-card hot"><h3>&#9876; CELL TREASURY <span class="trz-note">' + esc(cellName) + '</span></h3>' +
        '<div class="trz-bal">' + fmt(bal) + ' XP</div>' +
        '<div class="trz-bar"><div style="width:' + pct + '%"></div></div>' +
        '<div class="trz-note"><b>' + fmt(bal) + ' / ' + fmt(cap) + ' XP</b> capacity' +
        (tier ? ' &middot; ' + esc(tier) + ' tier' : '') +
        ' &middot; every XP here is member-funded, officer-spent.</div></div>';

      /* 2. TRAJECTORY — G7's time-series view. */
      out += '<div class="trz-card"><h3>BALANCE TRAJECTORY <span class="trz-note">last ' + TRAJ_DAYS + ' days</span></h3>';
      if (h && h.ok && h.points && h.points.length >= 2) {
        out += sparkline(h.points);
        out += '<div class="trz-note" style="margin-top:4px">Reconstructed from the treasury ledger — quiet days carry forward.</div>';
      } else if (h && h.ok === false && h.err === 'no treasury') {
        out += '<div class="trz-note">No ledger history yet — the first funding starts the line.</div>';
      } else {
        out += '<div class="trz-note">Trajectory unavailable right now — the balance above is live. It comes online with the next backend push.</div>';
      }
      out += '</div>';

      /* 3. FUND THE TREASURY — copy rule: never the d-word. */
      out += '<div class="trz-card" style="border-color:#7CFC00"><h3>FUND THE TREASURY</h3>' +
        '<div class="trz-note">Throw XP into the cell war chest. Officers spend it on the fight — prizes, bounties, causes.</div>' +
        '<div class="trz-row" style="margin-top:8px">' +
        [25, 50, 100, 250].map(function (a) {
          return '<button class="trz-btn sm ghost" data-trz="chip" data-amt="' + a + '">+' + a + '</button>';
        }).join('') +
        '<input class="trz-in sm" id="' + gid('fundAmt') + '" type="number" min="1" inputmode="numeric" placeholder="XP">' +
        '<button class="trz-btn" data-trz="fund">FUND THE TREASURY</button></div>' +
        '<div class="trz-err" id="' + gid('fundMsg') + '" style="display:none"></div></div>';

      /* 4. SPEND — destinations: free-form purpose AND sponsor-a-cause
         deep-link (6A-R9 pattern: /war-chest?cell=<id>&sponsor=1 — the
         sponsorship surface lives in movement.js; reused, not rebuilt). */
      out += '<div class="trz-card"><h3>SPEND <span class="trz-note">treasury &#8594; the fight</span></h3>';
      if (isOfficer) {
        out += '<div class="trz-note">Where does it go?</div>' +
          '<div class="trz-row" style="margin:6px 0">' +
          '<button class="trz-pill on" data-trz="dest" data-d="free">FREE-FORM PURPOSE</button>' +
          '<button class="trz-pill" data-trz="dest" data-d="cause">SPONSOR A CAUSE &rarr;</button></div>' +
          '<div id="' + gid('destFree') + '">' +
          '<div class="trz-row"><input class="trz-in sm" id="' + gid('spAmt') + '" type="number" min="1" inputmode="numeric" placeholder="XP">' +
          '<input class="trz-in" id="' + gid('spPurp') + '" maxlength="200" placeholder="purpose (e.g. poster prize)" style="flex:1;min-width:180px">' +
          '<button class="trz-btn" data-trz="spend">SPEND</button></div></div>' +
          '<div id="' + gid('destCause') + '" style="display:none">' +
          '<div class="trz-note" style="margin-bottom:6px">Deploy idle treasury XP to a cause pool — strike fund, bail fund, mutual aid. ' +
          'The cell&#39;s name rides the pool as sponsor and hits the war-room ticker.</div>' +
          '<div class="trz-row"><a class="trz-btn" style="text-decoration:none;display:inline-block" ' +
          'href="/war-chest?cell=' + esc(cellId) + '&amp;sponsor=1">SPONSOR A CAUSE &rarr;</a></div></div>' +
          '<div class="trz-err" id="' + gid('spMsg') + '" style="display:none"></div>';
      } else {
        out += '<div class="trz-note">Only the founder and officers can spend from the treasury. The backend enforces it — this panel shows the gate honestly.</div>';
      }
      out += '</div>';

      /* 5. RECENT ACTIVITY — last 10 ledger rows. */
      out += '<div class="trz-card"><h3>RECENT ACTIVITY</h3>';
      if (recent.length) {
        recent.slice(0, 10).forEach(function (r) {
          var amt = Math.round(Number(r.amount) || 0);
          var cls = amt >= 0 ? 'trz-pos' : 'trz-neg';
          var ds = '';
          try { ds = new Date(Number(r.ts) || 0).toLocaleDateString(); } catch (e) {}
          out += '<div class="trz-act"><span>' + esc(r.callsign || '?') + ' ' + esc(kindLabel(r.kind, amt)) + '</span>' +
            '<span><span class="' + cls + '">' + (amt >= 0 ? '+' : '') + fmt(amt) + ' XP</span> <span class="trz-note">' + esc(ds) + '</span></span></div>';
        });
      } else {
        out += '<div class="trz-note">No moves yet. Fund the treasury and the ledger starts writing.</div>';
      }
      out += '</div></div>';

      container.innerHTML = out;
      wire();
    }

    function msg(id, text, ok) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.display = text ? 'block' : 'none';
      el.className = ok ? 'trz-ok' : 'trz-err';
      el.textContent = text || '';
    }

    function refresh() { mount(container, ctx); }

    function wire() {
      container.addEventListener('click', onClick);
      function onClick(e) {
        var t = e.target, btn = null;
        while (t && t !== container) { if (t.getAttribute && t.getAttribute('data-trz')) { btn = t; break; } t = t.parentNode; }
        if (!btn) return;
        var kind = btn.getAttribute('data-trz');
        if (kind === 'chip') {
          var inp = document.getElementById(gid('fundAmt'));
          if (inp) inp.value = btn.getAttribute('data-amt');
          return;
        }
        if (kind === 'dest') {
          var d = btn.getAttribute('data-d');
          var pills = container.querySelectorAll('[data-trz="dest"]');
          for (var i = 0; i < pills.length; i++) pills[i].classList.toggle('on', pills[i] === btn);
          document.getElementById(gid('destFree')).style.display = d === 'free' ? 'block' : 'none';
          document.getElementById(gid('destCause')).style.display = d === 'cause' ? 'block' : 'none';
          return;
        }
        if (kind === 'fund') {
          var amt = Math.round(Number(document.getElementById(gid('fundAmt')).value) || 0);
          msg(gid('fundMsg'), '', true);
          if (amt <= 0) { msg(gid('fundMsg'), 'Enter an amount of XP.'); return; }
          if (!window.confirm('Fund the treasury with ' + fmt(amt) + ' XP from your balance?')) return;
          btn.disabled = true;
          postTreas('treasury_donate', { cell_id: cellId, amount: amt }, function (j) {
            btn.disabled = false;
            if (!j || !j.ok) {
              msg(gid('fundMsg'), (j && j.err) ? String(j.err) : 'Transfer failed.');
              return;
            }
            toast('FUNDED ' + fmt(amt) + ' XP. The war chest grows.');
            refresh();
          });
          return;
        }
        if (kind === 'spend') {
          var samt = Math.round(Number(document.getElementById(gid('spAmt')).value) || 0);
          var purp = String(document.getElementById(gid('spPurp')).value || '').trim().slice(0, 200);
          msg(gid('spMsg'), '', true);
          if (samt <= 0) { msg(gid('spMsg'), 'Enter an amount.'); return; }
          if (!purp) { msg(gid('spMsg'), 'Give the spend a purpose.'); return; }
          if (!window.confirm('Spend ' + fmt(samt) + ' XP from the cell treasury on: ' + purp + '?')) return;
          btn.disabled = true;
          postTreas('treasury_spend', { cell_id: cellId, amount: samt, purpose: purp }, function (j) {
            btn.disabled = false;
            if (!j || !j.ok) {
              var er = (j && j.err) ? String(j.err) : 'Spend failed.';
              msg(gid('spMsg'), er === 'officers only' ? 'Officers only — the backend said no.' : er);
              return;
            }
            toast('SPENT ' + fmt(samt) + ' XP — ' + purp + '.');
            refresh();
          });
          return;
        }
      }
    }
  }

  window.PFTreasury = { mount: mount };

  /* Standalone auto-mount: <div id="pf-treasury"></div> anywhere on the
     page. Resolves the viewer's primary cell via cell_mine (auth-attached
     like cell-hq), then mounts with the officer gate from the response. */
  function autoMount() {
    try {
      if (window.location.href.indexOf('/config/') !== -1) return;
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
      var el = document.getElementById('pf-treasury');
      if (!el || el.getAttribute('data-trz-mounted')) return;
      el.setAttribute('data-trz-mounted', '1');
      var id = ident();
      if (!id.callsign) {
        mount(el, {});
        return;
      }
      var sec = '';
      try { sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) {}
      api('cell_mine', { callsign: id.callsign, device: id.device, auth_secret: sec }, function (j) {
        var cell = j && j.ok && j.cell ? j.cell : null;
        var cellId = '';
        try { cellId = String((j && j.cell && (j.cell.id || j.cell.cell_id)) || ''); } catch (e) {}
        var cellName = '';
        try { cellName = String((j && j.cell && j.cell.name) || ''); } catch (e) {}
        mount(el, {
          cell_id: cellId,
          cell_name: cellName || cellId,
          is_officer: !!(j && (j.is_founder || j.is_officer))
        });
      });
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    setTimeout(autoMount, 0);
  }
})();
