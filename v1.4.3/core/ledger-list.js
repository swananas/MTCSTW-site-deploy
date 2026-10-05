/* core/ledger-list.js  |  PF v1.4.3 | BILLIONAIRE LEDGERS — Follow-the-Money.
   The ledger: billionaire net worth (Forbes 2026, hand-transcribed) vs
   political spending (FEC, name-matched), ranked by net worth DESC with the
   ratio as a bar. PFLedgers.mount(container) — JSONP fetch of
   ?action=ledger_list, one ranked row per billionaire: name, net worth,
   political spending, the ratio bar. Caveat line under EVERY figure
   ("Forbes Mar 1, 2026" / "FEC name-matched — identity unverified").
   Per-row DOWNLOAD + SHARE wired through the EXISTING share flow —
   PF.PHQShare.save/.share('phq-ledger', {...}) — so the callsign-claim gate,
   the idempotent stamp, and the share plumbing all ride along. No new share
   plumbing, no XP anywhere on this frontend (XP rides existing backend legs
   only; viewing this ledger grants 0 — Economy Desk sign-off pending).
   Backend contract (parallel backend wave, be/billionaire-ledgers):
     ?action=ledger_list ->
     {ok, methodology, list:{forbes_list_url, forbes_snapshot_date,
      transcribed_date, spending_status, spending_note, refresh_policy},
      total, entries:[{name, rank, net_worth_b, net_worth_usd, net_worth_as_of,
      net_worth_source_url, net_worth_label, political_spending,
      spending_cycle, match_note, spending_status, spending_label,
      spending_ratio}]}
   Fail-soft: endpoint down / malformed response -> the mount section hides
   itself entirely, never a broken widget. Zero rows -> the honest empty
   state. Pre-FEC-key: every spending figure is NULL and each row says so —
   no invented figures, ever; missing fields degrade to em-dash.
   Integration hook (Release Eng wires this when the Political HQ surface
   lands; do NOT call it from this module — never auto-mounts):
     PFLedgers.mount(document.getElementById('ledger-slot'))
   KILL: ?pf_off=ledgers  or  localStorage pf_disabled_v1='["ledgers"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ledgers')) { return; }
  if (window.pfLedgersDone) return;
  window.pfLedgersDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-ledger';
  var EMPTY_MSG = 'The ledger is empty — no billionaire rows returned.';
  var SPENDING_PENDING = 'FEC data not yet loaded — no figures shown rather than invented.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfLedgerCb' + Math.floor(Math.random() * 1e9);
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

  var CSS = [
    '.pf-ledger{max-width:680px;margin:0 auto;padding:8px 0}',
    '.pf-ledger-head{text-align:center;margin-bottom:10px}',
    '.pf-ledger-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#c1121f;margin-bottom:8px}',
    '.pf-ledger-title{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 6px}',
    '.pf-ledger-sub{font:400 14px Arial,sans-serif;color:#c9bfa8;margin-bottom:4px}',
    '.pf-ledger-row{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:20px 20px 18px;margin:0 0 14px;color:#f5ead6}',
    '.pf-ledger-rank{font:700 13px Arial,sans-serif;color:#e8b923;letter-spacing:3px;margin-bottom:6px}',
    '.pf-ledger-name{font:900 26px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 10px}',
    '.pf-ledger-fig{font:900 19px "Arial Black",Arial,sans-serif;color:#f5ead6}',
    '.pf-ledger-fig.gold{color:#e8b923}',
    '.pf-ledger-fig.dim{color:#c9bfa8;font:400 15px Arial,sans-serif}',
    '.pf-ledger-caveat{font:400 12px Arial,sans-serif;color:#c9bfa8;margin:2px 0 10px}',
    '.pf-ledger-barwrap{background:#1a1a1a;border:1px solid #3a3a3a;border-radius:6px;height:22px;position:relative;margin:8px 0 4px;overflow:hidden}',
    '.pf-ledger-bar{background:#c1121f;height:100%;min-width:3px}',
    '.pf-ledger-ratio{font:700 13px Arial,sans-serif;color:#e8b923;margin-bottom:12px}',
    '.pf-ledger-actions{display:flex;gap:10px;justify-content:center;margin-top:6px}',
    '.pf-ledger-btn{font:900 14px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:11px 20px;cursor:pointer}',
    '.pf-ledger-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-ledger-method{font:400 12px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-top:12px;padding:0 12px;line-height:1.5}',
    '.pf-ledger-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}'
  ].join('\n');

  var cssDone = false;
  function cssOnce() {
    if (cssDone) return; cssDone = true;
    try {
      var st = document.createElement('style');
      st.type = 'text/css'; st.appendChild(document.createTextNode(CSS));
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmtB(b) {
    var n = Number(b);
    if (!isFinite(n)) return '—';
    return '$' + (Math.round(n * 10) / 10) + 'B';
  }
  function fmtUSD(n) {
    var v = Number(n);
    if (!isFinite(v)) return '—';
    return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtPct(ratio) {
    var r = Number(ratio);
    if (!isFinite(r) || r < 0) return '—';
    var pct = r * 100;
    if (pct >= 1) return (Math.round(pct * 100) / 100) + '%';
    if (pct >= 0.01) return (Math.round(pct * 1000) / 1000) + '%';
    return pct.toPrecision(2) + '%';
  }
  function forbesDate(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '—';
    var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return MON[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function painterData(e) {
    return {
      name: e.name, rank: e.rank,
      netWorthB: e.net_worth_b, netWorthAsOf: e.net_worth_as_of,
      spending: e.political_spending, spendingCycle: e.spending_cycle,
      ratio: e.spending_ratio, matchNote: e.match_note
    };
  }

  function rowInner(e, i) {
    var spendLoaded = e.spending_status === 'loaded' && e.political_spending != null;
    var barW = 0, ratioLine = '';
    if (spendLoaded && isFinite(Number(e.spending_ratio)) && Number(e.spending_ratio) > 0) {
      barW = Math.max(0.4, Math.min(100, Number(e.spending_ratio) * 100));
      ratioLine = '<div class="pf-ledger-ratio">' + esc(fmtPct(e.spending_ratio)) +
        ' OF NET WORTH SPENT ON FEDERAL ELECTIONS</div>';
    }
    return '<div class="pf-ledger-rank">#' + esc(e.rank) + ' — FORBES 2026</div>' +
      '<h3 class="pf-ledger-name">' + esc(e.name) + '</h3>' +
      '<div class="pf-ledger-fig">NET WORTH ' + esc(fmtB(e.net_worth_b)) + '</div>' +
      '<div class="pf-ledger-caveat">Forbes ' + esc(forbesDate(e.net_worth_as_of)) +
        ' snapshot · published-list-snapshot</div>' +
      (spendLoaded
        ? '<div class="pf-ledger-fig gold">SPENT ' + esc(fmtUSD(e.political_spending)) +
          ' ON FEDERAL ELECTIONS</div>' +
          '<div class="pf-ledger-caveat">FEC Schedule A, ' + esc(e.spending_cycle) +
          ' cycle · name-matched — identity unverified</div>' +
          '<div class="pf-ledger-barwrap"><div class="pf-ledger-bar" style="width:' +
          barW.toFixed(2) + '%"></div></div>' + ratioLine
        : '<div class="pf-ledger-fig dim">' + esc(SPENDING_PENDING) + '</div>' +
          '<div class="pf-ledger-caveat">No figures shown rather than invented.</div>') +
      '<div class="pf-ledger-actions">' +
        '<button type="button" class="pf-ledger-btn" data-ledger-dl="' + i + '">DOWNLOAD</button>' +
        '<button type="button" class="pf-ledger-btn pf-ledger-btn-red" data-ledger-sh="' + i + '">SHARE</button>' +
      '</div>';
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function render(container, j) {
    cssOnce();
    var list = j.list || {};
    var entries = Array.isArray(j.entries) ? j.entries : [];
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-ledger';
    if (!entries.length) {
      root.innerHTML = '<div class="pf-ledger-empty">' + esc(EMPTY_MSG) + '</div>';
      container.appendChild(root);
      return;
    }
    var head = document.createElement('div');
    head.className = 'pf-ledger-head';
    head.innerHTML = '<div class="pf-ledger-kicker">FOLLOW THE MONEY</div>' +
      '<h2 class="pf-ledger-title">THE LEDGER</h2>' +
      '<div class="pf-ledger-sub">Billionaire net worth vs. political spending — ranked by net worth</div>';
    root.appendChild(head);
    var datas = [];
    for (var i = 0; i < entries.length; i++) {
      var art = document.createElement('article');
      art.className = 'pf-ledger-row';
      art.setAttribute('data-ledger-i', String(i));
      art.innerHTML = rowInner(entries[i], i);
      root.appendChild(art);
      datas.push(painterData(entries[i]));
    }
    var cap = document.createElement('div');
    cap.className = 'pf-ledger-method';
    cap.textContent = 'METHOD: ' + (j.methodology ||
      'Net worths hand-transcribed from Forbes\' published 2026 list; spending from FEC Schedule A (name-matched).');
    root.appendChild(cap);
    root.addEventListener('click', function (ev) {
      var t = ev && ev.target;
      if (!t || !t.getAttribute) return;
      var dl = t.getAttribute('data-ledger-dl'), sh = t.getAttribute('data-ledger-sh');
      if (dl == null && sh == null) return;
      var idx = parseInt(dl != null ? dl : sh, 10) || 0;
      var pd = datas[idx];
      if (!pd) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        if (dl != null) PHQ.save(PAINTER, pd);
        else PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });
    container.appendChild(root);
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-ledger')) return true; /* already mounted */
    } catch (e) {}
    api('ledger_list', {}, function (j) {
      if (!j || !j.ok || !Array.isArray(j.entries)) { hide(container); return; }
      try { render(container, j); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFLedgers = { mount: mount };
    PF.Ledgers = window.PFLedgers;
  } catch (e) {}
})();
