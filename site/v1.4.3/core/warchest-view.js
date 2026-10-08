/* core/warchest-view.js  |  PF v1.4.3 | YOUR WAR CHEST — the unified money view.
   PLAY 6 (UX Combination Plays Wave 2, 2026-10-06, CEO "Go all"): the ledger
   as money glue. One read-only aggregation view:
     - personal war chest balance .............. xp_balance (live)
     - bounty earnings + surge multipliers ..... xp_history (client-side agg)
     - liberty bonds held ...................... bond_list (live)
     - cause-pool contributions ................ xp_history (client-side agg)
     - per-cell war chest totals + my share .... warchest_status (via cell_mine)
     - cell treasury (cell dashboard) .......... treasury_balance (live)
     - War Bonds, movement aggregate (USD) .... bond_stats (live, aggregate)
   READ-ONLY aggregation of EXISTING endpoints only. No new backend endpoints,
   no money movement, no schema changes. Viewing grants 0 XP; this module
   never calls an XP grant/write leg. War Bonds grant 0 XP (standing rule).
   OMITTED rows (fail-open — no endpoint exists, so nothing is invented):
     - per-callsign store / War Bond purchase history (bond_stats is
       aggregate-only; war_bond_purchases rows are not exposed per-callsign)
     - per-callsign store order history (no endpoint)
   Security: aggregates only. warchest_status leaderboard/history rows are
   never rendered per-transaction — only the caller's own contribution and
   the cell totals are shown.
   Surfaces (explicit slots only — the module never guesses at Squarespace DOM):
     #pf-warchest-card  compact homepage card (YOUR CAMPAIGN area — Code Block
                        hand-step); links to the full view
     #pf-warchest-view  full unified view (/war-chest — Squarespace hand-step)
     #pf-warchest-cell  cell dashboard section (data-cell-id optional; cell
                        dashboard hand-step)
   Fail-open everywhere: backend down / {ok:false} / malformed -> the surface
   hides itself, never a broken widget. No callsign -> enlist prompt on the
   card; public rows only in the full view.
   KILL: ?pf_off=warchest (master) | ?pf_off=warchest-card |
         ?pf_off=warchest-full | ?pf_off=warchest-cell */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('warchest')) { return; }
  if (window.pfWarChestDone) { return; }
  window.pfWarChestDone = true;

  function skip(id) { try { return PF.skip('warchest') || PF.skip(id); } catch (e) { return true; } }

  var BACKEND = '';
  try { BACKEND = window.PF_BACKEND_URL || ''; } catch (e) { BACKEND = ''; }
  var FULL_URL = '/war-chest';
  try { if (window.PF_WARCHEST_URL) FULL_URL = window.PF_WARCHEST_URL; } catch (e) {}
  var TIMEOUT_MS = 12000;
  var HIST_LIMIT = 100;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(n) {
    try { return Math.round(Number(n) || 0).toLocaleString('en-US'); } catch (e) { return '0'; }
  }
  function usd(n) {
    try {
      return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) { return '$0.00'; }
  }
  function timeAgo(ts) {
    try {
      var d = Date.now() - Number(ts || 0);
      if (!(d > 0)) return 'just now';
      var m = Math.floor(d / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    } catch (e) { return ''; }
  }
  function cs() {
    try { return window.PFCallsign ? (window.PFCallsign() || '') : ''; } catch (e) { return ''; }
  }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }
  function hide(el) { try { el.style.display = 'none'; } catch (e) {} }

  /* Auth-gated GETs (IDOR rule — same PF.getAuthSecret() pattern as cell-hq). */
  var AUTHED = { xp_history: 1, cell_mine: 1 };

  /* JSONP GET — read-only, mirrors core/ledger-list.js api(). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var p = {};
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) p[k] = params[k]; }
    if (AUTHED[action]) {
      try {
        var sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
        if (sec && !p.auth_secret) p.auth_secret = sec;
      } catch (e) {}
    }
    var fn = 'pfWcCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
      try { cb(j); } catch (e3) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k2 in p) {
      if (p[k2] != null && p[k2] !== '') q += '&' + encodeURIComponent(k2) + '=' + encodeURIComponent(p[k2]);
    }
    q += '&callback=' + fn;
    try {
      s.src = BACKEND + q;
      document.head.appendChild(s);
    } catch (e) { finish(null); return; }
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  /* ---------- client-side aggregation of xp_history entries ---------- */
  function isBountyKey(key) {
    var k = String(key || '');
    return k.indexOf('bounty_') === 0 || k.indexOf('databounty_') === 0 || k.indexOf('cellbounty_') === 0;
  }
  function surgeOf(reason) {
    var r = String(reason || '');
    var m = /\(surge x([\d.]+)\)/i.exec(r);
    if (m) return Number(m[1]) || 0;
    var m2 = /\((\d+)x roll\)/i.exec(r);
    if (m2) return Number(m2[1]) || 0;
    return 0;
  }
  function bountyAgg(entries) {
    var total = 0, surged = 0, best = 0, latest = 0, n = 0;
    for (var i = 0; i < (entries || []).length; i++) {
      var e = entries[i] || {};
      var d = Number(e.delta) || 0;
      if (d <= 0) continue;
      if (!isBountyKey(e.key) && !/bounty/i.test(String(e.reason || ''))) continue;
      total += d; n++;
      var sg = surgeOf(e.reason);
      if (sg > 1) { surged++; if (sg > best) best = sg; }
      var t = Number(e.ts) || 0;
      if (t > latest) latest = t;
    }
    return { total: total, count: n, surged: surged, best: best, latest: latest };
  }
  function causeAgg(entries) {
    var total = 0, latest = 0, n = 0;
    for (var i = 0; i < (entries || []).length; i++) {
      var e = entries[i] || {};
      var d = Number(e.delta) || 0;
      if (d >= 0) continue;
      var k = String(e.key || '');
      if (k.indexOf('cause_') !== 0 && !/cause/i.test(String(e.reason || ''))) continue;
      total += Math.abs(d); n++;
      var t = Number(e.ts) || 0;
      if (t > latest) latest = t;
    }
    return { total: total, count: n, latest: latest };
  }

  var CSS = [
    '.pf-wc{max-width:680px;margin:0 auto;padding:8px 4px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-wc-kicker{font-weight:700;font-size:13px;letter-spacing:6px;color:#e5383b;text-align:center;margin-bottom:8px}',
    '.pf-wc-title{font-weight:900;font-size:32px;text-align:center;margin:0 0 6px;letter-spacing:2px;color:#f5ead6}',
    '.pf-wc-sub{font-size:14px;color:#c9bfa8;text-align:center;margin:0 0 18px}',
    '.pf-wc-herofig{font-weight:900;font-size:44px;text-align:center;color:#e8b923;margin:2px 0 4px}',
    '.pf-wc-herosrc{font-size:12px;color:#8a7f68;text-align:center;margin-bottom:14px}',
    '.pf-wc-sec{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:16px 16px 6px;margin-bottom:14px}',
    '.pf-wc-sec h3{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 10px;color:#f5ead6}',
    '.pf-wc-line{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:9px 0;border-top:1px solid #222}',
    '.pf-wc-line:first-of-type{border-top:0}',
    '.pf-wc-what{font-weight:700;font-size:14px;color:#f5ead6;letter-spacing:1px}',
    '.pf-wc-sub2{font-weight:400;font-size:12px;color:#8a7f68;margin-top:3px;letter-spacing:0}',
    '.pf-wc-fig{font-weight:900;font-size:17px;color:#f5ead6;white-space:nowrap;text-align:right}',
    '.pf-wc-fig.hot{color:#e0352f}',
    '.pf-wc-fig.gold{color:#e8b923}',
    '.pf-wc-note{font-size:13px;color:#c9bfa8;text-align:center;padding:16px 12px;border:1px dashed #3a3a3a;border-radius:8px}',
    '.pf-wc-cta{display:block;text-align:center;margin:16px auto 0;max-width:420px;background:#c1121f;color:#fff;font-weight:900;letter-spacing:2px;font-size:15px;padding:14px;border-radius:8px;text-decoration:none}',
    '.pf-wc-card{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:22px 20px 20px;color:#f5ead6;font-family:Arial,sans-serif;text-align:center}',
    '.pf-wc-card .pf-wc-title{font-size:26px}',
    '.pf-wc-foot{font-size:11px;color:#8a7f68;text-align:center;margin-top:12px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-wc-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-wc-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Ledger Line: left = what, right = figure, red when it matters. */
  function line(label, figHTML, opts) {
    opts = opts || {};
    var h = '<div class="pf-wc-line"><div class="pf-wc-what">' + label;
    if (opts.sub) h += '<div class="pf-wc-sub2">' + opts.sub + '</div>';
    h += '</div><div class="pf-wc-fig' + (opts.hot ? ' hot' : '') + (opts.gold ? ' gold' : '') + '">' + figHTML + '</div></div>';
    return h;
  }
  function emdash() { return '&mdash;'; }

  /* ---------- compact homepage card ---------- */
  function mountCard(el) {
    if (!el) return false;
    cssOnce();
    var me = cs();
    if (!BACKEND) { hide(el); return false; }
    if (!me) {
      el.innerHTML = '<div class="pf-wc-card"><div class="pf-wc-kicker">YOUR CAMPAIGN &middot; MONEY</div>' +
        '<div class="pf-wc-title">YOUR WAR CHEST</div>' +
        '<div class="pf-wc-sub">One ledger for every credit and contribution.</div>' +
        '<div class="pf-wc-note">Claim a callsign in Daily Orders to unlock your war chest.</div></div>';
      return true;
    }
    var R = {}, need = 2, done = 0;
    function each() {
      done++;
      if (done < need) return;
      paintCard(el, R);
    }
    api('xp_balance', { callsign: me }, function (j) { R.bal = j; each(); });
    api('cell_mine', { callsign: me }, function (j) { R.mine = j; each(); });
    return true;
  }

  function paintCard(el, R) {
    var me = cs();
    var balOk = R.bal && typeof R.bal.balance === 'number';
    var cells = (R.mine && R.mine.ok && R.mine.cells) || [];
    var first = cells[0] || null;
    /* Need the first cell's chest total — one more read, then paint. */
    function finish(chestTotal, chestName, chestOk) {
      if (!balOk && !chestOk) { hide(el); return; }
      var h = '<div class="pf-wc-card"><div class="pf-wc-kicker">YOUR CAMPAIGN &middot; MONEY</div>' +
        '<div class="pf-wc-title">YOUR WAR CHEST</div>';
      h += '<div class="pf-wc-herofig' + (balOk ? ' gold' : '') + '">' +
        (balOk ? esc(num(R.bal.balance)) + ' <span style="font-size:18px">XP</span>' : emdash()) + '</div>';
      h += '<div class="pf-wc-herosrc">Source: xp_balance &middot; live</div>';
      h += '<div class="pf-wc-sec" style="text-align:left;margin-top:6px">';
      if (chestOk) {
        h += line('CELL WAR CHEST &middot; ' + esc(String(chestName || 'your cell').toUpperCase()),
          esc(num(chestTotal)) + ' XP', { sub: 'Source: warchest_status &middot; live' });
      } else {
        h += '<div class="pf-wc-note">Join a cell to open a cell war chest.</div>';
      }
      h += '</div>';
      h += '<a class="pf-wc-cta" href="' + esc(FULL_URL) + '#pf-warchest-view">OPEN YOUR WAR CHEST &rarr;</a>';
      h += '</div>';
      try { el.innerHTML = h; } catch (e) { hide(el); }
    }
    if (first && first.id) {
      api('warchest_status', { cell_id: first.id }, function (j) {
        if (j && j.ok && typeof j.total === 'number') finish(j.total, j.cell_name || first.name, true);
        else finish(0, '', false);
      });
    } else {
      finish(0, '', false);
    }
  }

  /* ---------- full unified view ---------- */
  function mountFull(el) {
    if (!el) return false;
    cssOnce();
    if (!BACKEND) { hide(el); return false; }
    var me = cs();
    var R = {}, need = 5, done = 0;
    function each() {
      done++;
      if (done < need) return;
      paintFull(el, R, me);
    }
    if (me) {
      api('xp_balance', { callsign: me }, function (j) { R.bal = j; each(); });
      api('xp_history', { callsign: me, limit: HIST_LIMIT }, function (j) { R.hist = j; each(); });
      api('bond_list', { callsign: me }, function (j) { R.bonds = j; each(); });
      api('cell_mine', { callsign: me }, function (j) { R.mine = j; each(); });
    } else {
      R.bal = null; R.hist = null; R.bonds = null; R.mine = null;
      done += 4;
    }
    api('bond_stats', {}, function (j) { R.wb = j; each(); });
    return true;
  }

  function paintFull(el, R, me) {
    var rows = [];
    var histOk = R.hist && R.hist.ok && Array.isArray(R.hist.entries);
    var histSrc = 'Source: xp_history &middot; last ' + HIST_LIMIT + ' entries';

    if (R.bal && typeof R.bal.balance === 'number') {
      rows.push(line('PERSONAL WAR CHEST', esc(num(R.bal.balance)) + ' XP',
        { gold: true, sub: 'Your XP reserve &middot; Source: xp_balance &middot; live' }));
    }
    if (histOk) {
      var ba = bountyAgg(R.hist.entries);
      rows.push(line('BOUNTY EARNINGS', esc(num(ba.total)) + ' XP',
        { sub: esc(histSrc) + (ba.latest ? ' &middot; latest ' + esc(timeAgo(ba.latest)) : '') }));
      rows.push(line('SURGE MULTIPLIERS EARNED',
        ba.surged > 0 ? esc(String(ba.surged)) + ' surged &middot; best &times;' + esc(String(ba.best)) : 'None yet',
        { sub: 'Bounties paid above base rate &middot; ' + esc(histSrc) }));
      var ca = causeAgg(R.hist.entries);
      rows.push(line('CAUSE-POOL CONTRIBUTIONS', esc(num(ca.total)) + ' XP',
        { hot: true, sub: esc(histSrc) + (ca.latest ? ' &middot; latest ' + esc(timeAgo(ca.latest)) : '') }));
    }
    if (R.bonds && R.bonds.ok && Array.isArray(R.bonds.bonds)) {
      var held = 0;
      for (var i = 0; i < R.bonds.bonds.length; i++) {
        var b = R.bonds.bonds[i];
        if (!b.redeemed) held += Number(b.amount) || 0;
      }
      rows.push(line('LIBERTY BONDS HELD', esc(num(held)) + ' XP',
        { sub: 'Unredeemed &middot; Source: bond_list &middot; live' }));
    }

    var wbOk = R.wb && R.wb.ok;
    var wbHTML = '';
    if (wbOk) {
      wbHTML = line('WAR BONDS &mdash; MOVEMENT TOTAL', esc(usd(R.wb.total_revenue)),
        { hot: true, sub: esc(num(R.wb.purchases)) + ' purchases &middot; Source: bond_stats &middot; live &middot; all buyers, aggregate' });
    }

    var cellRows = [];
    var cells = (R.mine && R.mine.ok && Array.isArray(R.mine.cells)) ? R.mine.cells : [];

    function finishCells() {
      var h = '<div class="pf-wc"><div class="pf-wc-kicker">MONEY GLUE</div>' +
        '<div class="pf-wc-title">YOUR WAR CHEST</div>' +
        '<div class="pf-wc-sub">One ledger for every credit and contribution. Aggregates only.</div>';
      if (rows.length) {
        h += '<div class="pf-wc-sec"><h3>PERSONAL</h3>' + rows.join('') + '</div>';
      } else if (me) {
        h += '<div class="pf-wc-note">No personal figures returned — the backend is quiet or unreachable.</div>';
      } else {
        h += '<div class="pf-wc-note">Claim a callsign in Daily Orders to unlock your personal war chest.</div>';
      }
      if (cellRows.length) {
        h += '<div class="pf-wc-sec"><h3>CELLS</h3>' + cellRows.join('') + '</div>';
      }
      if (wbHTML) {
        h += '<div class="pf-wc-sec"><h3>MOVEMENT</h3>' + wbHTML + '</div>';
      }
      if (!rows.length && !cellRows.length && !wbHTML) { hide(el); return; }
      h += '<div class="pf-wc-foot">War Bonds grant 0 XP. Real money is delinked from XP.</div></div>';
      try { el.innerHTML = h; } catch (e) { hide(el); }
    }

    if (!cells.length) { finishCells(); return; }
    var ci = 0, meLow = String(me || '').toLowerCase();
    function nextCell() {
      if (ci >= cells.length) { finishCells(); return; }
      var c = cells[ci++];
      var cid = c && c.id;
      if (!cid) { nextCell(); return; }
      api('warchest_status', { cell_id: cid }, function (j) {
        if (j && j.ok && typeof j.total === 'number') {
          var mine = 0;
          var lb = j.leaderboard || [];
          for (var li = 0; li < lb.length; li++) {
            if (String(lb[li].callsign || '').toLowerCase() === meLow) { mine = Number(lb[li].xp) || 0; break; }
          }
          cellRows.push(line('CELL WAR CHEST &middot; ' + esc(String(j.cell_name || c.name || 'cell').toUpperCase()),
            esc(num(j.total)) + ' XP' + (j.goal_hit ? ' &middot; GOAL HIT' : ''),
            { hot: !!j.goal_hit, sub: 'You put in ' + esc(num(mine)) + ' XP &middot; Source: warchest_status &middot; live' }));
        }
        nextCell();
      });
    }
    nextCell();
  }

  /* ---------- cell dashboard section (cell-scoped) ---------- */
  function mountCell(el, opts) {
    if (!el) return false;
    cssOnce();
    opts = opts || {};
    if (!BACKEND) { hide(el); return false; }
    var me = cs();
    var cid = '';
    try { cid = String(el.getAttribute('data-cell-id') || opts.cell_id || ''); } catch (e) {}
    function go(cellId, cellName) {
      if (!cellId) { hide(el); return; }
      var R = {}, need = 2, done = 0;
      function each() {
        done++;
        if (done < need) return;
        paintCell(el, R, cellId, cellName, me);
      }
      api('warchest_status', { cell_id: cellId }, function (j) { R.w = j; each(); });
      api('treasury_balance', { cell_id: cellId }, function (j) { R.t = j; each(); });
    }
    if (cid) { go(cid, ''); return true; }
    if (!me) { hide(el); return false; }
    api('cell_mine', { callsign: me }, function (j) {
      var cells = (j && j.ok && Array.isArray(j.cells)) ? j.cells : [];
      if (cells[0] && cells[0].id) go(cells[0].id, cells[0].name);
      else hide(el);
    });
    return true;
  }

  function paintCell(el, R, cellId, cellName, me) {
    var wOk = R.w && R.w.ok && typeof R.w.total === 'number';
    var tOk = R.t && R.t.ok && typeof R.t.balance === 'number';
    if (!wOk && !tOk) { hide(el); return; }
    var name = (R.w && R.w.cell_name) || cellName || 'your cell';
    var h = '<div class="pf-wc-sec" style="max-width:680px;margin:0 auto"><h3>CELL WAR CHEST &middot; ' +
      esc(String(name).toUpperCase()) + '</h3>';
    if (wOk) {
      var meLow = String(me || '').toLowerCase(), mine = 0;
      var lb = R.w.leaderboard || [];
      for (var i = 0; i < lb.length; i++) {
        if (String(lb[i].callsign || '').toLowerCase() === meLow) { mine = Number(lb[i].xp) || 0; break; }
      }
      h += line('WAR CHEST TOTAL', esc(num(R.w.total)) + ' XP' + (R.w.goal_hit ? ' &middot; GOAL HIT' : ''),
        { hot: !!R.w.goal_hit, sub: 'Source: warchest_status &middot; live' });
      if (me) {
        h += line('YOUR CONTRIBUTION', esc(num(mine)) + ' XP',
          { sub: 'Source: warchest_status &middot; live' });
      }
    }
    if (tOk) {
      h += line('CELL TREASURY', esc(num(R.t.balance)) + ' XP',
        { sub: 'Source: treasury_balance &middot; live' });
    }
    h += '</div>';
    try { el.innerHTML = h; } catch (e) { hide(el); }
  }

  window.PFWarChest = { mountCard: mountCard, mountFull: mountFull, mountCell: mountCell };

  /* Self-mount by explicit slot presence only. */
  function auto() {
    try {
      if (isEditor()) return;
      var c = null, v = null, d = null;
      try { c = document.getElementById('pf-warchest-card'); } catch (e) {}
      try { v = document.getElementById('pf-warchest-view'); } catch (e) {}
      try { d = document.getElementById('pf-warchest-cell'); } catch (e) {}
      if (c && !skip('warchest-card')) mountCard(c);
      if (v && !skip('warchest-full')) mountFull(v);
      if (d && !skip('warchest-cell')) mountCell(d, {});
    } catch (e) {}
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
    else auto();
  } catch (e) { try { auto(); } catch (e2) {} }
})();
