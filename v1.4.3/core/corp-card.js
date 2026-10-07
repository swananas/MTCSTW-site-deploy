/* core/corp-card.js  |  PF v1.4.3 | CORPORATE PLAYBOOK — company facts card.
   One devastating card per company for the Follow-the-Money surface: stock
   buybacks vs income taxes paid side-by-side, the effective tax rate,
   lobbying spend, and the honest price-hike empty state — every figure
   labeled with its source and year, straight from public filings.
   DOWNLOAD + SHARE wire through the EXISTING share flow —
   PF.PHQShare.save/.share('phq-corp', {...}) — so the callsign-claim gate,
   the idempotent stamp, and the share plumbing all ride along. No new share
   plumbing, no XP anywhere on this frontend (XP rides existing backend
   legs only; Economy Desk sign-off PENDING for any card XP — currently none).
   Backend contract (parallel backend wave, be/corp-playbook):
     ?action=corp_card&ticker=XOM ->
     {ok, ticker, name, cik, year, buybacks, tax_paid, pretax_income,
      effective_rate, lobbying_spend,
      price_hikes:{empty:true, reason:'no public per-company source', note},
      sources:[{name, kind, ...}], retrieved_at}
   Sources: SEC EDGAR companyfacts (FY 10-K XBRL, public, no key) and the
   Senate LDA LD-2 filings API (public, anonymous). Price hikes: NO public
   per-company source exists — the endpoint returns an honest empty state
   and so does this card ("Per-company price data has no public source.
   Shown: what filings prove."). Never proxied with CPI, never guessed.
   Fail-soft: endpoint down / unknown ticker / malformed response -> the mount
   section hides itself entirely, never a broken widget. Missing money
   fields degrade to em-dash. No invented figures — every pixel comes from
   the endpoint response.
   Integration hook (Release Eng wires this when fe/follow-the-money lands;
   do NOT call it from this module — the company view is a sibling file):
     PFCorpCard.mount('XOM', document.getElementById('corp-card-slot'))
   KILL: ?pf_off=corp-card  or  localStorage pf_disabled_v1='["corp-card"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('corp-card')) { return; }
  if (window.pfCorpCardDone) return;
  window.pfCorpCardDone = true;

  var PAINTER = 'phq-corp';
  var EMPTY_MSG = 'No corporate facts on file for this ticker — yet.';
  var PRICE_EMPTY = 'Per-company price data has no public source. Shown: what filings prove.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* Whole-USD compact money: 19000000000 -> $19.0B. Null/invalid -> em-dash. */
  function money(v) {
    if (v == null) return '—';
    var n = Number(v);
    if (!isFinite(n)) return '—';
    var sign = n < 0 ? '−' : '';
    var a = Math.abs(n);
    if (a >= 1e9) return sign + '$' + (a / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(1) + 'K';
    return sign + '$' + Math.round(a);
  }
  function pct(v) {
    if (v == null) return '—';
    var n = Number(v);
    if (!isFinite(n)) return '—';
    return (n * 100).toFixed(1) + '%';
  }

  /* Source footer from the endpoint's sources[]: one label per public source,
     each with its year. Never invented — only what the endpoint reports. */
  function sourceLine(sources, year) {
    var seen = {}, parts = [];
    for (var i = 0; i < (sources || []).length; i++) {
      var s = sources[i] || {};
      var label = '';
      if (s.kind === 'edgar') label = 'SEC EDGAR · 10-K FY' + (s.fy || year);
      else if (s.kind === 'lda') label = 'LDA · ' + (s.year || year) + ' LD-2 FILINGS';
      else if (s.name) label = String(s.name).toUpperCase();
      if (label && !seen[label]) { seen[label] = 1; parts.push(label); }
    }
    return parts.length ? 'SOURCES: ' + parts.join(' · ') : 'SOURCES: PUBLIC FILINGS';
  }

  var CSS = [
    '.pf-cp{max-width:680px;margin:0 auto;padding:8px 0}',
    '.pf-cp-card{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:26px 22px;color:#f5ead6;text-align:center}',
    '.pf-cp-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#c1121f;margin-bottom:10px}',
    '.pf-cp-name{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 4px}',
    '.pf-cp-ticker{font:700 15px Arial,sans-serif;color:#e8b923;margin-bottom:16px}',
    '.pf-cp-vs{display:flex;gap:12px;margin-bottom:8px}',
    '.pf-cp-col{flex:1;background:#141414;border:1px solid #3a3a3a;border-radius:8px;padding:14px 8px}',
    '.pf-cp-lab{font:700 12px Arial,sans-serif;letter-spacing:2px;color:#c9bfa8;margin-bottom:8px}',
    '.pf-cp-amt{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6}',
    '.pf-cp-amt.red{color:#c1121f}',
    '.pf-cp-rate{font:900 22px "Arial Black",Arial,sans-serif;color:#e8b923;margin:14px 0 4px}',
    '.pf-cp-ratelab{font:700 12px Arial,sans-serif;letter-spacing:2px;color:#c9bfa8;margin-bottom:12px}',
    '.pf-cp-lob{font:700 16px Arial,sans-serif;color:#f5ead6;margin-bottom:4px}',
    '.pf-cp-loblab{font:700 12px Arial,sans-serif;letter-spacing:2px;color:#c9bfa8;margin-bottom:14px}',
    '.pf-cp-price{font:400 14px Arial,sans-serif;color:#c9bfa8;border:1px dashed #3a3a3a;border-radius:8px;padding:12px;margin:6px 0 14px}',
    '.pf-cp-src{font:400 12px Arial,sans-serif;color:#8a8272;margin-bottom:16px}',
    '.pf-cp-actions{display:flex;gap:10px;justify-content:center}',
    '.pf-cp-btn{font:900 15px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:12px 22px;cursor:pointer}',
    '.pf-cp-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-cp-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-cp-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-cp-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  /* Endpoint response -> painter data object. Every pixel from the response;
     missing fields degrade to em-dash in the painter, never invented. */
  function painterData(j) {
    return {
      ticker: j.ticker, name: j.name, year: j.year,
      buybacks: j.buybacks, taxPaid: j.tax_paid,
      effectiveRate: j.effective_rate, lobbyingSpend: j.lobbying_spend,
      sourceLine: sourceLine(j.sources, j.year)
    };
  }

  function render(container, j) {
    cssOnce();
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-cp';
    var ph = j.price_hikes || {};
    var note = (ph.empty && (ph.note || PRICE_EMPTY)) || PRICE_EMPTY;
    root.innerHTML =
      '<div class="pf-cp-card">' +
        '<div class="pf-cp-kicker">THEIR PLAYBOOK</div>' +
        '<h3 class="pf-cp-name">' + esc(j.name) + '</h3>' +
        '<div class="pf-cp-ticker">' + esc(j.ticker) + ' · FY' + esc(j.year) + '</div>' +
        '<div class="pf-cp-vs">' +
          '<div class="pf-cp-col">' +
            '<div class="pf-cp-lab">STOCK BUYBACKS</div>' +
            '<div class="pf-cp-amt">' + esc(money(j.buybacks)) + '</div>' +
            '<div class="pf-cp-ratelab">SEC EDGAR · FY' + esc(j.year) + '</div>' +
          '</div>' +
          '<div class="pf-cp-col">' +
            '<div class="pf-cp-lab">INCOME TAXES PAID</div>' +
            '<div class="pf-cp-amt red">' + esc(money(j.tax_paid)) + '</div>' +
            '<div class="pf-cp-ratelab">SEC EDGAR · FY' + esc(j.year) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pf-cp-rate">EFFECTIVE TAX RATE: ' + esc(pct(j.effective_rate)) + '</div>' +
        '<div class="pf-cp-ratelab">TAXES PAID ÷ PRETAX INCOME · SEC EDGAR · FY' + esc(j.year) + '</div>' +
        '<div class="pf-cp-lob">LOBBYING SPEND: ' + esc(money(j.lobbying_spend)) + '</div>' +
        '<div class="pf-cp-loblab">LDA LD-2 FILINGS · ' + esc(j.year) + ' · AS-FILED ESTIMATE</div>' +
        '<div class="pf-cp-price">PRICE HIKES: ' + esc(note) + '</div>' +
        '<div class="pf-cp-src">' + esc(sourceLine(j.sources, j.year)) + '</div>' +
        '<div class="pf-cp-actions">' +
          '<button type="button" class="pf-cp-btn" data-cp-dl="1">DOWNLOAD</button>' +
          '<button type="button" class="pf-cp-btn pf-cp-btn-red" data-cp-sh="1">SHARE</button>' +
        '</div>' +
      '</div>';
    var pd = painterData(j);
    root.addEventListener('click', function (e) {
      var t = e && e.target;
      if (!t || !t.getAttribute) return;
      var dl = t.getAttribute('data-cp-dl'), sh = t.getAttribute('data-cp-sh');
      if (dl == null && sh == null) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        if (dl != null) PHQ.save(PAINTER, pd);
        else PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });
    container.appendChild(root);
  }

  function mount(ticker, container) {
    if (!ticker || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-cp')) return true; /* already mounted */
    } catch (e) {}
    /* corp_card has no backend route — fail-soft: hide the section. */
    hide(container);
    return true;
  }

  try {
    window.PFCorpCard = { mount: mount };
    PF.CorpCard = window.PFCorpCard;
  } catch (e) {}
})();
