/* games/casino-exits.js  |  PF v1.4.3 | REDISTRIBUTION LAYER DE-ISOLATION
   (2026-10-05: rewired off the retired casino hall onto the War Room).
   File name keeps "casino-exits" for stability (build + kill-switch history);
   every UI string was reframed — nothing called "casino" renders on screen.
   Wires the redistribution layer into the rest of the site — four integrations:
   1. EXITS: after a layer event settles (win or loss), render a NEXT OP-style
      routing card (config + priority, links + one-tap actions). Win -> vault /
      forecasts / war chest. Loss -> forecasts / arcade / briefing. The only
      XP writes are VAULT IT (bank deposit) and FUND THE FIGHT (war-chest
      donate) — everything else is links.
   2. SERVICE MEDAL: every settlement dispatches 'pf-wm-settled' — the
      settled-event signal the medal layer listens on (service-medals on the
      homepage, deploy-tracker on /arcade). The first settled redistribution-
      layer event each week (forecast, gambit, raid, or draw — win or loss)
      earns the Market Maker medal, required for FULL DEPLOYMENT.
      (Stale note corrected 2026-10-05: no "High Roller medal" exists in code;
      it was renamed to Market Maker in wave-predict. Event name stays
      'pf-wm-settled' for stability.)
   3. WIN-SHARE POSTER: on wins with a real payout, offer a share poster via
      PFShare.setPoster('redist-win') + PFShare.shareImage — standard
      JOIN THE FIGHT. CTA + MTCSTW.COM footer. Amounts are real backend
      grants, never invented.
   4. VAULT IT: one-tap real deposit of the win into the People's Bank
      vault (6A-R2 pattern — existing bank deposit action, fail-closed
      xpGrant, weekly deposit cap, idempotency key). No new backend actions.
   Settlement hooks are called by the new layer surfaces (markets.js zones,
   gambits.js); the event name 'pf-wm-settled' is unchanged.
   LAYERING: game silo, /arcade page (ships in bundle-arcade, right after
   markets.js). Reads via JSONP (self-contained api()); the ONLY read is
   notification_list on draw round transitions. Writes: VAULT IT (bank
   deposit) and FUND THE FIGHT (treasury_donate, cell_id='network').
   KILL: ?pf_off=casino-exits  or  localStorage pf_disabled_v1='["casino-exits"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('casino-exits')) { return; }

  var BACKEND = window.PF_BACKEND_URL;
  var BET_LS = 'pf_wm_bets_v1';    /* tracked open bets awaiting settlement */
  var LOT_LS = 'pf_wm_lotto_v1';   /* last draw round seen + tickets held */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* JSONP GET for reads (same pattern as the other silos). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfWmCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
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

  /* ---- VAULT IT (6A-R2 real-deposit pattern): CORS POST for bank writes —
     same backend action as the /bank vault's DEPOSIT button (fail-closed
     xpGrant, weekly deposit cap, idempotency key). One-taps winnings into
     the vault without leaving the win screen. No new backend actions. ---- */
  function postBank(bAction, params, cb) {
    var body = { type: 'bank', b_action: bAction };
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) body[k] = params[k]; }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr };
      var c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) {}
      fetch(BACKEND, o)
        .then(function (r) { return r.json(); })
        .then(function (j) { if (t) { try { clearTimeout(t); } catch (e2) {} } done(j); })
        .catch(function () { if (t) { try { clearTimeout(t); } catch (e3) {} } done(null); });
    } catch (e4) { done(null); }
  }
  /* ---- FUND THE FIGHT: CORS POST for war-chest donations.
     Existing backend action treasury_donate (verified against
     wave-redistribute src/sinks.js): {type:'treasury',
     t_action:'treasury_donate', callsign, device, cell_id, amount}.
     The network war chest is the treasury row with cell_id='network' —
     same shape as a cell donation, no new backend actions. ---- */
  function postTreasury(tAction, params, cb) {
    var body = { type: 'treasury', t_action: tAction };
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) body[k] = params[k]; }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr };
      var c2 = null, t2 = null;
      try {
        if (window.AbortController) {
          c2 = new AbortController(); o.signal = c2.signal;
          t2 = setTimeout(function () { try { c2.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) {}
      fetch(BACKEND, o)
        .then(function (r) { return r.json(); })
        .then(function (j) { if (t2) { try { clearTimeout(t2); } catch (e2) {} } done(j); })
        .catch(function () { if (t2) { try { clearTimeout(t2); } catch (e3) {} } done(null); });
    } catch (e4) { done(null); }
  }
  function vaultIt(btn) {
    var amt = Math.round(Number(btn.getAttribute('data-wm-vaultit')) || 0);
    if (!(amt > 0)) { toast('Nothing to vault.'); return; }
    var id = ident();
    if (!id.callsign) { toast('Enlist a callsign first — the vault needs an owner.'); return; }
    var key = id.device + ':vaultit:redist:' + amt + ':' + Date.now();
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML = '<div class="wmx-rt">VAULTING...</div>';
    postBank('deposit', { callsign: id.callsign, device: id.device, amount: amt, key: key }, function (j) {
      if (!j || !j.ok) {
        btn.disabled = false; btn.innerHTML = orig;
        var msg = 'Vault deposit failed.';
        try { if (window.PF && PF.errCopy) msg = PF.errCopy(j, msg); } catch (e5) {}
        toast(msg); return;
      }
      btn.innerHTML = '<div class="wmx-rt">VAULTED &#10003;</div>' +
        '<div class="wmx-rs">' + amt.toLocaleString() + ' XP in the vault.</div>';
      toast('+' + amt.toLocaleString() + ' XP in the vault.');
      try { document.dispatchEvent(new CustomEvent('pf-do-update')); } catch (e6) {}
    });
  }
  function fundFight(btn) {
    var amt = Math.round(Number(btn.getAttribute('data-wm-fund')) || 0);
    if (!(amt > 0)) { toast('Nothing to send.'); return; }
    var id = ident();
    if (!id.callsign) { toast('Enlist a callsign first — the war chest needs a donor.'); return; }
    btn.disabled = true;
    var orig = btn.innerHTML;
    btn.innerHTML = '<div class="wmx-rt">ARMING THE WAR CHEST...</div>';
    postTreasury('treasury_donate', { callsign: id.callsign, device: id.device, cell_id: 'network', amount: amt }, function (j) {
      if (!j || !j.ok) {
        btn.disabled = false; btn.innerHTML = orig;
        var msg = 'Donation failed.';
        try { if (window.PF && PF.errCopy) msg = PF.errCopy(j, msg); } catch (e5) {}
        toast(msg); return;
      }
      btn.innerHTML = '<div class="wmx-rt">FUNDED &#10003;</div>' +
        '<div class="wmx-rs">' + amt.toLocaleString() + ' XP armed the war chest.</div>';
      toast(amt.toLocaleString() + ' XP to the war chest. The fight thanks you.');
      try { document.dispatchEvent(new CustomEvent('pf-do-update')); } catch (e6) {}
    });
  }

  /* ---- bet tracking (device-local; lets resolutions settle win/loss) ---- */
  function betLoad() {
    try {
      var b = JSON.parse(localStorage.getItem(BET_LS) || 'null');
      if (b && b.bets && Array.isArray(b.bets)) return b.bets;
    } catch (e) {}
    return [];
  }
  function betSave(bets) {
    try {
      /* cap: drop oldest exited first, then oldest overall */
      while (bets.length > 80) {
        var ei = -1;
        for (var i = 0; i < bets.length; i++) { if (bets[i].exited) { ei = i; break; } }
        bets.splice(ei === -1 ? 0 : ei, 1);
      }
      localStorage.setItem(BET_LS, JSON.stringify({ bets: bets }));
    } catch (e) {}
  }
  /* Layer surfaces call this when a stake is placed (wager_place / crash_bet). */
  function wmBetPlaced(bet) {
    try {
      if (!bet || !bet.game) return;
      var bets = betLoad();
      bet.ts = Date.now(); bet.exited = false;
      bets.push(bet);
      betSave(bets);
    } catch (e) {}
  }

  /* ---- the settled-bet signal: one event drives exits + medal + poster ---- */
  function wmSettled(detail) {
    try {
      document.dispatchEvent(new CustomEvent('pf-wm-settled', { detail: detail || {} }));
    } catch (e) {}
  }

  /* Resolved wager rows (markets.js BATTLE WAGERS zone). Settles tracked
     stakes by matching side against the winning side label (backend sets
     outcome to the winning side; payout mirrors the backend parimutuel
     formula). */
  function wmWagerResolved(w) {
    try {
      var bets = betLoad(), changed = false, wid = String((w && w.id) || '');
      if (!wid) return;
      for (var i = 0; i < bets.length; i++) {
        var b = bets[i];
        if (b.game !== 'wager' || b.exited || String(b.wid) !== wid) continue;
        var won = String(b.side) === String(w.outcome || '');
        var payout = 0;
        if (won) {
          var pool = Number(w.total_pool) || 0, winTotal = 0, sides = w.sides || [];
          for (var s = 0; s < sides.length; s++) {
            if (String(sides[s].side) === String(w.outcome)) { winTotal = Number(sides[s].total_bet) || 0; break; }
          }
          if (pool > 0 && winTotal > 0) payout = Math.round((Number(b.amount) || 0) * pool / winTotal);
        }
        b.exited = true; changed = true;
        wmSettled({ game: 'wager', won: won, amount: Number(b.amount) || 0, payout: payout,
          side: String(b.side || ''), outcome: String(w.outcome || ''), desc: String(w.description || '') });
      }
      if (changed) betSave(bets);
    } catch (e) {}
  }

  /* gambits.js: flip_join settled. Payout mirrors the backend grant exactly:
     pot = 2x stake, 5% tithe to the war chest — the winner takes 1.9x. */
  function wmFlipSettled(fid, iWon, flips) {
    try {
      var amt = 0;
      for (var i = 0; i < (flips || []).length; i++) {
        if (String(flips[i].id) === String(fid)) { amt = Number(flips[i].amount) || 0; break; }
      }
      var payout = (iWon && amt > 0) ? (2 * amt - Math.round(2 * amt * 0.05)) : 0;
      wmSettled({ game: 'flip', won: !!iWon, amount: amt, payout: payout });
    } catch (e) {}
  }

  /* markets.js raid zone: crash_cashout settled (an exfiltration is always a
     win — the line never drops below 1x while the round is live). */
  function wmCrashSettled(payout) {
    try {
      var bets = betLoad(), amt = 0, changed = false;
      for (var i = bets.length - 1; i >= 0; i--) {
        var b = bets[i];
        if (b.game === 'crash' && !b.exited) { amt = Number(b.amount) || 0; b.exited = true; changed = true; break; }
      }
      if (changed) betSave(bets);
      wmSettled({ game: 'crash', won: true, amount: amt, payout: Number(payout) || 0 });
    } catch (e) {}
  }

  /* markets.js raid poll: the line collapsed with our stake still on it — a
     settled loss. Deduped by the exited flag (poll fires every 5s). */
  function wmCrashCrashed(roundId) {
    try {
      var bets = betLoad(), changed = false;
      for (var i = 0; i < bets.length; i++) {
        var b = bets[i];
        if (b.game === 'crash' && !b.exited && String(b.round_id) === String(roundId)) {
          b.exited = true; changed = true;
          wmSettled({ game: 'crash', won: false, amount: Number(b.amount) || 0, payout: 0 });
        }
      }
      if (changed) betSave(bets);
    } catch (e) {}
  }

  /* markets.js draw zone: lottery_status round seen. A round-id change with
     tickets held in the previous round = that round resolved. The win signal
     is the backend's lottery-win notification (existing read, no new writes). */
  function lotLoad() {
    try {
      var s = JSON.parse(localStorage.getItem(LOT_LS) || 'null');
      if (s && s.round_id) return s;
    } catch (e) {}
    return null;
  }
  function lotSave(s) { try { localStorage.setItem(LOT_LS, JSON.stringify(s)); } catch (e) {} }
  function wmLotterySeen(r) {
    try {
      var id = ident();
      if (!id.callsign || !r) return;
      var rid = String(r.id || ''), mine = Number(r.my_tickets) || 0;
      if (!rid) return;
      var s = lotLoad();
      if (!s) { lotSave({ round_id: rid, tickets: mine }); return; }
      if (s.round_id === rid) {
        if (mine !== Number(s.tickets)) lotSave({ round_id: rid, tickets: mine });
        return;
      }
      /* round changed — the previous round resolved */
      var prevTickets = Number(s.tickets) || 0;
      lotSave({ round_id: rid, tickets: mine });
      if (prevTickets <= 0) return;
      api('notification_list', { callsign: id.callsign }, function (j) {
        if (!j || !j.ok) return; /* read failed — no card rather than a false loss */
        var win = 0;
        try {
          var ns = j.notifications || [];
          for (var i = 0; i < ns.length; i++) {
            var n = ns[i];
            if (String(n.type || '').toLowerCase() !== 'lottery') continue;
            if (Date.now() - (Number(n.ts) || 0) > 8 * 86400000) continue;
            var m = /you won ([\d,]+) xp/i.exec(String(n.body || '') + ' ' + String(n.title || ''));
            if (m) { win = Math.round(Number(String(m[1]).replace(/,/g, '')) || 0); break; }
          }
        } catch (e) {}
        wmSettled({ game: 'lottery', won: win > 0, amount: prevTickets * 10, payout: win });
      });
    } catch (e) {}
  }

  /* Expose the hooks for the layer surfaces (guarded one-liners there call these). */
  try {
    PF.wmBetPlaced = wmBetPlaced;
    PF.wmSettled = wmSettled;
    PF.wmWagerResolved = wmWagerResolved;
    PF.wmFlipSettled = wmFlipSettled;
    PF.wmCrashSettled = wmCrashSettled;
    PF.wmCrashCrashed = wmCrashCrashed;
    PF.wmLotterySeen = wmLotterySeen;
  } catch (e) {}

  /* ---- exit routing: NEXT OP-style config + priority.
     Psych audit: RUN IT BACK is demoted — VAULT IT leads the win card,
     STAKE IT FORWARD rides second, FUND THE FIGHT closes it. ---- */
  var GAME_LBL = { flip: 'THE GAMBIT', crash: 'SUPPLY LINE RAID', wager: 'WAGER', lottery: 'THE SOLIDARITY DRAW', market: 'FORECAST' };
  /* Forecasts section anchor (games/markets.js). Falls back to /arcade itself. */
  function marketsHref() {
    try {
      if (document.getElementById('pf-forecasts')) return '#pf-forecasts';
    } catch (e) {}
    return '/arcade#pf-forecasts';
  }
  var EXITS = {
    win: [
      { id: 'vault', title: 'VAULT IT', cta: 'VAULT IT', sweep: true,
        sub: 'Move the win to the People\'s Bank vault. Interest lands every Monday.',
        href: '/bank' },
      { id: 'stakeit', title: 'STAKE IT FORWARD', cta: 'STAKE IT FORWARD',
        sub: 'Winnings ride again — back the next forecast on the War Room board.',
        href: '/arcade#pf-forecasts' },
      { id: 'fund', title: 'FUND THE FIGHT', cta: 'FUND THE FIGHT', fund: true,
        sub: 'Send the win straight to the war chest.',
        href: '/war-chest' }
    ],
    loss: [
      { id: 'board', title: 'READ THE BOARD', cta: 'READ THE BOARD',
        sub: 'Study the forecasts — stake the next one smarter.',
        href: '/arcade#pf-forecasts' },
      { id: 'fight', title: 'BACK TO THE FIGHT', cta: 'BACK TO THE FIGHT',
        sub: 'Shake it off. The board is open.',
        href: '/arcade' },
      { id: 'brief', title: 'GET INTEL', cta: 'READ THE BRIEFING',
        sub: 'The Briefing never loses. Intel first, stakes second.',
        href: '/#pf-brief' }
    ]
  };

  var lastWin = null; /* {game, payout} — feeds the win-share painter */

  var CSS = '#pf-wm-exits{margin:14px 0}' +
    '.wmx-card{max-width:720px;margin:0 auto;padding:0;background:#0a0a0a;border:1px solid #333;' +
    'border-top:4px solid #c1121f;box-sizing:border-box;font-family:Arial,sans-serif;text-align:center}' +
    '.wmx-kick{font-size:11px;letter-spacing:5px;color:#dc143c;font-weight:800;margin:0;padding:16px 18px 0}' +
    '.wmx-head{font-family:\'Arial Black\',Arial,sans-serif;font-size:21px;letter-spacing:1px;color:#f5ead6;margin:8px 18px}' +
    '.wmx-head .w{color:#7CFC00}.wmx-head .l{color:#ff4d5e}' +
    '.wmx-sub{font-size:13px;color:#a89e88;margin:0 18px 12px;line-height:1.5}' +
    '.wmx-route{display:block;width:100%;font:inherit;color:inherit;background:none;border:none;border-top:1px solid #222;padding:12px 18px;text-align:left;cursor:pointer}' +
    '.wmx-route:hover{background:#160808}' +
    '.wmx-rt{font-family:\'Arial Black\',Arial,sans-serif;font-size:14px;letter-spacing:2px;color:#f5ead6}' +
    '.wmx-rs{font-size:12px;color:#a89e88;margin:4px 0 8px;line-height:1.5}' +
    '.wmx-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:.12em;' +
    'font-size:12px;text-decoration:none;padding:10px 22px;border:2px solid #c1121f}' +
    '.wmx-cta.ghost{background:transparent;border-color:#f5ead6;color:#f5ead6}' +
    '.wmx-row{border-top:1px solid #222;padding:12px 18px}' +
    '.wmx-x{display:block;text-align:center;margin:10px 0 14px;background:none;border:none;cursor:pointer;' +
    'color:#555;font-size:11px;letter-spacing:2px;font-family:Arial,sans-serif}';
  function ensureCss() {
    if (document.getElementById('pf-wm-exits-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-wm-exits-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function fmt(n) {
    try { return Number(n).toLocaleString('en-US'); } catch (e) { return String(n); }
  }

  function cardHtml(d) {
    var won = !!d.won;
    var gl = GAME_LBL[d.game] || 'WAR ROOM';
    var fig = won ? (Number(d.payout) || 0) : (Number(d.amount) || 0);
    var head = gl + ' — ' + (won
      ? '<span class="w">WON' + (fig > 0 ? ' +' + fmt(fig) + ' XP' : '') + '</span>'
      : '<span class="l">LOST' + (fig > 0 ? ' ' + fmt(fig) + ' XP' : '') + '</span>');
    var sub = won
      ? 'The board pays out. Pick your exit, soldier.'
      : 'The line keeps that one. Pick your exit, soldier.';
    var h = '<div class="wmx-card"><div class="wmx-kick">AFTER ACTION · THE WAR ROOM</div>' +
      '<div class="wmx-head">' + head + '</div>' +
      '<div class="wmx-sub">' + esc(sub) + '</div>';
    var routes = EXITS[won ? 'win' : 'loss'];
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var href = (typeof r.href === 'function') ? r.href() : r.href;
      var sub2 = r.id === 'vault' && won && fig > 0
        ? 'Vault ' + fmt(fig) + ' XP to the People\'s Bank vault. Interest lands every Monday.'
        : (r.id === 'fund' && won && fig > 0
          ? 'Send ' + fmt(fig) + ' XP straight to the war chest.'
          : r.sub);
      /* VAULT IT / FUND THE FIGHT: one-tap actions, no nav. */
      var inner = '<div class="wmx-rt">' + esc(r.title) + '</div>' +
        '<div class="wmx-rs">' + esc(sub2) + '</div>' +
        '<span class="wmx-cta">' + esc(r.cta) + ' &rarr;</span>';
      if (r.sweep && won && fig > 0) {
        h += '<button type="button" class="wmx-route" data-wm-vaultit="' + fig + '">' + inner + '</button>';
      } else if (r.fund && won && fig > 0) {
        h += '<button type="button" class="wmx-route" data-wm-fund="' + fig + '">' + inner + '</button>';
      } else {
        h += '<a class="wmx-route" href="' + esc(href) + '">' + inner + '</a>';
      }
    }
    if (won && fig > 0 && window.PFShare && PFShare.shareImage) {
      h += '<div class="wmx-row"><button type="button" class="wmx-cta ghost" data-wm-share="1">' +
        'SHARE THE WIN</button>' +
        '<div class="wmx-sub" style="margin:8px 0 0">Poster your payout. The timeline is a battlefield.</div></div>';
    }
    h += '<button type="button" class="wmx-x" data-wm-dismiss="1">DISMISS</button></div>';
    return h;
  }

  function tray() {
    var t = document.getElementById('pf-wm-exits');
    if (t) return t;
    /* Anchor: the War Room forecasts section first, then the gambits silo,
       then the page mounts. The retired casino mount (#xCasino) is gone. */
    var anchor = null;
    try {
      anchor = document.getElementById('pf-forecasts') || document.getElementById('pf-gambits');
      if (!anchor) anchor = document.getElementById('pf-arcade') || document.body;
    } catch (e) { anchor = document.body; }
    if (!anchor) return null;
    t = document.createElement('div');
    t.id = 'pf-wm-exits';
    try { anchor.appendChild(t); }
    catch (e) { return null; }
    t.addEventListener('click', function (ev) {
      try {
        var el = ev.target && ev.target.closest ? ev.target.closest('[data-wm-vaultit],[data-wm-fund],[data-wm-dismiss],[data-wm-share]') : null;
        if (!el) return;
        if (el.hasAttribute('data-wm-vaultit')) {
          vaultIt(el);
        } else if (el.hasAttribute('data-wm-fund')) {
          fundFight(el);
        } else if (el.hasAttribute('data-wm-dismiss')) {
          t.innerHTML = ''; lastWin = null;
        } else if (el.hasAttribute('data-wm-share')) {
          shareWin(el);
        }
      } catch (e3) {}
    });
    return t;
  }

  document.addEventListener('pf-wm-settled', function (e) {
    try {
      var d = (e && e.detail) || {};
      if (!d.game) return;
      ensureCss();
      lastWin = (d.won && (Number(d.payout) || 0) > 0) ? { game: d.game, payout: Number(d.payout) } : null;
      var t = tray();
      if (t) t.innerHTML = cardHtml(d);
    } catch (err) {}
  });

  /* ---- win-share poster: PFShare.setPoster('redist-win') ---- */
  function wmWrap(x, text, maxW) {
    var words = String(text == null ? '' : text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function wmWinPainter(done) {
    try {
      var w = lastWin;
      if (!w || !(Number(w.payout) > 0)) { done(null); return; }
      var W = 1080, H = 1350, cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      if (!x) { done(null); return; }
      var gl = GAME_LBL[w.game] || 'WAR ROOM';
      x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
      x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
      x.textAlign = 'center';
      var y = 170;
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 110;
      x.fillStyle = '#c1121f'; x.font = '900 84px "Arial Black",Arial,sans-serif';
      wmWrap(x, 'THE WAR ROOM', W - 170).forEach(function (l) { x.fillText(l, W / 2, y); y += 98; });
      y += 20;
      x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
      x.fillText('THE BOARD PAYS OUT', W / 2, y); y += 110;
      x.fillStyle = '#7CFC00'; x.font = '900 120px "Arial Black",Arial,sans-serif';
      x.fillText('+' + fmt(w.payout) + ' XP', W / 2, y); y += 110;
      x.fillStyle = '#c9bfa8'; x.font = '700 38px Arial,sans-serif';
      x.fillText(gl + ' WIN', W / 2, y); y += 130;
      x.font = '900 42px "Arial Black",Arial,sans-serif';
      var cta = 'BACK THE NEXT ONE', tw = x.measureText(cta).width + 100;
      x.fillStyle = '#c1121f'; x.fillRect(W / 2 - tw / 2, y - 56, tw, 92);
      x.fillStyle = '#ffffff'; x.fillText(cta, W / 2, y + 8);
      /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — share-image CTA standard. */
      x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
      x.fillText('MTCSTW.COM', W / 2, H - 168);
      x.font = '900 44px "Arial Black",Arial,sans-serif';
      x.fillText('JOIN THE FIGHT.', W / 2, H - 108);
      x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
      try {
        x.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(), W / 2, H - 58);
      } catch (e) {}
      done(cv);
    } catch (err) { try { done(null); } catch (e2) {} }
  }
  try {
    if (window.PFShare && PFShare.setPoster) PFShare.setPoster('redist-win', wmWinPainter);
  } catch (e) {}
  /* Late PFShare (share-image loads in core bundle, this in a page bundle —
     normally core first; re-register once in case order flipped). */
  setTimeout(function () {
    try { if (window.PFShare && PFShare.setPoster) PFShare.setPoster('redist-win', wmWinPainter); } catch (e) {}
  }, 3000);

  function shareWin(btn) {
    try {
      if (!(window.PFShare && PFShare.shareImage)) { toast('Share is offline right now.'); return; }
      if (btn) btn.disabled = true;
      wmWinPainter(function (cv) {
        try { if (btn) btn.disabled = false; } catch (e) {}
        if (cv) PFShare.shareImage(cv, 'pfn-redist-win.png', 'The War Room win', 'redist-win');
        else toast('Poster failed — try again.');
      });
    } catch (e) { try { if (btn) btn.disabled = false; } catch (e2) {} }
  }
})();
