/* core/money-trades.js  |  PF v1.4.3 | CONGRESSIONAL STOCK TRADES.
   Person-card + trade-timeline for the Follow-the-Money suite
   (element id money-stock-trades; /money page + interim PHQ money tab).
   Never auto-mounts — the money-page shell calls PFTrades.mount(container,
   {bioguideId}).
   LEGAL HOLD: congressional trade disclosures are financial-disclosure data
   under the narrow commercial-use hold — until the hold resolves, this card
   renders ONLY the honest empty state.
   BACKEND RAIL (2026-10-07 contract-gap fix): ?action=trades_legislator
   (the old ?action=money_trades was a reserved name that never existed).
   LOCKED BE contract (be/stock-trades; STOCK-TRADES-FE-INTEGRATION.md) —
   the frontend adapts to the backend, never vice versa:
     ?action=trades_legislator&bioguide_id=J000288 ->
     {ok, bioguide_id,
      member:{bioguide_id,name,chamber,party,state,committees:[]},
      trades:[{ticker,tx_type,amount_range,asset_name,tx_date,
               disclosure_date,days_to_disclose,late_filing,filing_url}],
      empty, reason:'disclosure_hold', note, source, source_url,
      retrieved_at:'YYYY-MM-DD',
      eiga:{empty:true,reason:'pending_ceo_decision',note}}
   Params: bioguide_id is REQUIRED — the backend rejects without it, so the
   mount only queries when a legislator is picked. Under the hold trades is
   ALWAYS [] (reason:'disclosure_hold') -> the honest empty state below.
   Trade items carry tx_type ('buy'|'sell'), NOT 'type'.
   Fail-soft: endpoint down / {ok:false} / malformed -> the honest empty
   state ("AWAITING PUBLIC DATA"). Never a blank card, never a spinner that
   spins forever, never "0" standing in for unknown.
   No XP anywhere on this frontend (viewing = 0; sharing rides the existing
   create_share: backend leg only when real data is present).
   KILL: ?pf_off=money-stock-trades (master: ?pf_off=money) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money') || PF.skip('money-stock-trades')) { return; }
  if (window.pfTradesDone) return;
  window.pfTradesDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var HOLD_MSG = 'AWAITING PUBLIC DATA — Trade disclosures are being wired up. This card goes live the moment the feed connects.';
  var EMPTY_MSG = 'NO PUBLIC RECORDS FOUND — Searched House/Senate financial disclosures. Nothing filed under this name.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfTradesCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-tr{max-width:680px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-tr-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-tr-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 12px;letter-spacing:1px}',
    '.pf-tr-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center}',
    '.pf-tr-empty .pf-tr-dash{font-size:40px;color:#3a3a3a;display:block;margin-bottom:8px}',
    '.pf-tr-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-tr-empty p{font-size:14px;color:#c9bfa8;margin:0 0 6px;line-height:1.5}',
    '.pf-tr-empty .pf-tr-act{color:#e8b923;font-weight:700}',
    '.pf-tr-list{list-style:none;margin:0;padding:0}',
    '.pf-tr-list li{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:15px}',
    '.pf-tr-list li:last-child{border-bottom:0}',
    '.pf-tr-tk{font-weight:900;color:#e8b923}',
    '.pf-tr-ty{font-weight:700;color:#f5ead6;text-transform:uppercase}',
    '.pf-tr-am{margin-left:auto;color:#c9bfa8}',
    '.pf-tr-src{font-size:12px;color:#c9bfa8;text-align:center;margin-top:10px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-tr-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-tr-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function emptyState(container, msg, track) {
    cssOnce();
    container.innerHTML =
      '<div class="pf-tr">' +
      '<div class="pf-tr-kicker">STOCK TRADES</div>' +
      '<h3 class="pf-tr-title">TRADES ON THE HILL</h3>' +
      '<div class="pf-tr-empty"><span class="pf-tr-dash">\u2014</span>' +
      '<h4>' + esc(track === 'none' ? 'NO PUBLIC RECORDS FOUND' : 'AWAITING PUBLIC DATA') + '</h4>' +
      '<p>' + esc(msg) + '</p>' +
      '<p class="pf-tr-act">Check back after the next filing window.</p></div>' +
      '<div class="pf-tr-src">SOURCE: House/Senate Financial Disclosures</div>' +
      '</div>';
  }

  function render(container, j, bioguideId) {
    /* Real data path — the hold keeps trades:[] server-side, so this lights
       up with zero frontend changes when the hold lifts. Every figure
       carries its source; missing fields are em-dash. Trade items carry
       tx_type ('buy'|'sell') per the locked contract. */
    cssOnce();
    var trades = (j && Array.isArray(j.trades)) ? j.trades : [];
    if (!trades.length) { emptyState(container, EMPTY_MSG, 'none'); return; }
    var member = (j && j.member) || {};
    var name = member.name || '\u2014';
    var src = (j && j.source) || 'House/Senate Financial Disclosures';
    var asof = '';
    try {
      var rt = j.retrieved_at;
      if (rt) asof = ' \u00b7 FIGURES AS OF ' + String(rt).slice(0, 10).toUpperCase();
    } catch (e) {}
    var html = '<div class="pf-tr">' +
      '<div class="pf-tr-kicker">STOCK TRADES</div>' +
      '<h3 class="pf-tr-title">TRADES ON THE HILL \u2014 ' + esc(String(name).toUpperCase()) + '</h3>' +
      '<ul class="pf-tr-list">' +
      trades.slice(0, 10).map(function (t) {
        t = t || {};
        return '<li><span class="pf-tr-tk">' + esc(t.ticker || '\u2014') + '</span> ' +
          '<span class="pf-tr-ty">' + esc(t.tx_type || '\u2014') + '</span> ' +
          '<span class="pf-tr-am">' + esc(t.amount_range || '\u2014') + '</span></li>';
      }).join('') +
      '</ul><div class="pf-tr-src">SOURCE: ' + esc(src) + asof + '</div></div>';
    container.innerHTML = html;
  }

  function mount(container, opts) {
    if (!container) return false;
    opts = opts || {};
    try {
      if (container.querySelector && container.querySelector('.pf-tr')) return true;
    } catch (e) {}
    var bioguideId = opts.bioguideId || '';
    /* The disclosure hold stands server-side (trades:[] + reason:
       'disclosure_hold'), but the rail is real: query trades_legislator and
       let the backend's honest empty state drive the card. Without a
       legislator picked, the backend rejects — skip the call and render the
       empty state directly. */
    if (!bioguideId) { emptyState(container, HOLD_MSG, 'hold'); return true; }
    api('trades_legislator', { bioguide_id: bioguideId }, function (j) {
      try {
        if (j && j.ok && Array.isArray(j.trades) && j.trades.length) render(container, j, bioguideId);
        else emptyState(container, HOLD_MSG, 'hold');
      } catch (e) { emptyState(container, HOLD_MSG, 'hold'); }
    });
    return true;
  }

  try { window.PFTrades = { mount: mount }; } catch (e) {}
})();
