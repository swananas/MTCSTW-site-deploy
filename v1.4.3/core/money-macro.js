/* core/money-macro.js  |  PF v1.4.3 | FRED MACRO DASHBOARD (FRED Everywhere P1).
   The full macro dashboard from ?action=fred_macro&scope=full&spark=1:
   Phase 3 (2026-10-06) adds 5 cards — rent (CUUR0000SEHA), credit-card
   delinquency (DRCCLACBS), median weekly earnings (LES1252881600Q),
   food at home (CUSR0000SAF11), gasoline (CUSR0000SETB01) — for 16 series total.
   Each card: latest figure, change, sparkline, per-series staleness badge,
   4-fact citation ({Agency} via FRED · {SERIES_ID} · {period} · retrieved {date}).
   Rolling refresh per News Desk §1(a): daily series daily, weekly weekly,
   monthly on release day, quarterly on release day — the per-series staleness
   badge (§4) is the refresh signal, not a single "last updated" line.

   Honesty contract (binding):
   - Stale figures STILL RENDER with the adjacent badge — never suppressed.
   - Revisions carry the ʳ marker.
   - CES0500000003 surfaces say "average" adjacent to the figure; second-person
     "your paycheck/raise" is banned against it.
   - Official U.S. macro figures only — never blended with crowdsourced
     People's Index figures. Pure figures, no predictions, no advice.
   - Tap a card → bottom sheet (value, period, source, retrieval date).
   Never auto-mounts — the money-page shell calls PFMacro.mount(container).
   No XP anywhere on this frontend (read-only official-data surface).
   KILL: ?pf_off=money-macro (master: ?pf_off=money) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money') || PF.skip('money-macro')) { return; }
  if (window.pfMacroDone) return;
  window.pfMacroDone = true;

  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  var EMPTY_BODY = 'The macro dashboard is being wired to live FRED figures. ' +
    'Nothing here is estimated or seeded — the 16 series cards appear the ' +
    'moment the official feed is connected.';
  var WAITING_HEAD = 'FEED CONNECTED \u2014 FIRST REFRESH PENDING';
  var WAITING_BODY = 'The official feed is connected and the first data ' +
    'refresh is still on its way. Nothing here is estimated or seeded.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CSS = [
    '.pf-macro{max-width:1100px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-macro-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-macro-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-macro-sub{font-size:12px;color:#8a8271;text-align:center;letter-spacing:1px;margin:0 0 12px}',
    '.pf-macro-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:900px){.pf-macro-grid{grid-template-columns:repeat(3,1fr)}}',
    '@media (max-width:640px){.pf-macro-grid{grid-template-columns:repeat(2,1fr)}}',
    '.pf-macro-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px 12px 10px;color:#f5ead6;text-decoration:none;min-height:44px}',
    '.pf-macro-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}',
    '.pf-macro-t{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923}',
    '.pf-macro-value{font-weight:900;font-size:24px;color:#f5ead6;margin:2px 0}',
    '.pf-macro-unit{font-size:11px;color:#c9bfa8;margin-bottom:6px}',
    '.pf-macro-period{font-size:12px;color:#c9bfa8}',
    '.pf-macro-change{font-size:13px;font-weight:700;color:#f5ead6;margin:4px 0 2px}',
    '.pf-macro-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}',
    '.pf-macro-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center}',
    '.pf-macro-empty .pf-macro-dash{font-size:40px;color:#3a3a3a;display:block;margin-bottom:8px}',
    '.pf-macro-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-macro-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-macro-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-macro-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function cardHtml(F, s) {
    var sid = s.series_id || '';
    var title = esc(s.title || F.PLAIN[sid] || sid);
    var link = esc(s.source_url || ('https://fred.stlouisfed.org/series/' + sid));
    /* YoY cards lead with the YoY label; rates/payrolls/GDP lead with the
       per-period change label. */
    var change = s.change_basis === 'yoy'
      ? (s.change_pct_label || s.change_label)
      : (s.change_label || s.change_pct_label);
    /* CES0500000003: "average" adjacent to the figure, always. */
    var unitLine = esc(s.unit_label || '');
    if (sid === 'CES0500000003' && unitLine.toLowerCase().indexOf('average') === -1) {
      unitLine = 'average ' + unitLine;
    }
    var body =
      '<div class="pf-macro-value">' + esc(s.value_label != null ? s.value_label : '—') + F.revMark(s) + '</div>' +
      (unitLine ? '<div class="pf-macro-unit">' + unitLine + '</div>' : '') +
      '<div class="pf-macro-period">' + esc(F.fmtPeriod(s)) + '</div>' +
      (change ? '<div class="pf-macro-change">' + esc(change) + '</div>' : '') +
      F.sparkline(s.spark) +
      '<div>' + F.staleBadge(s) + '</div>' +
      '<div class="pf-fred-cite">' + esc(F.citation(s)) + '</div>';
    return '<div class="pf-macro-card pf-fred-tap" data-sid="' + esc(sid) + '" role="button" tabindex="0">' +
      '<div class="pf-macro-head"><span class="pf-macro-t">' + title + '</span>' + F.saNsa(s) + '</div>' +
      body + '</div>';
  }

  function wireTaps(F, container, cards) {
    try {
      var els = container.querySelectorAll('.pf-macro-card');
      for (var i = 0; i < els.length; i++) {
        (function (el) {
          var sid = el.getAttribute('data-sid');
          var c = null;
          for (var k = 0; k < cards.length; k++) if (cards[k].series_id === sid) { c = cards[k]; break; }
          function open() { if (c) F.tapSheet(c); }
          el.addEventListener('click', open);
          el.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
          });
        })(els[i]);
      }
    } catch (e) {}
  }

  function shell(inner) {
    return '<div class="pf-macro">' +
      '<div class="pf-macro-kicker">OFFICIAL DATA</div>' +
      '<h3 class="pf-macro-title">THE MACRO DASHBOARD</h3>' +
      '<p class="pf-macro-sub">16 SERIES · ROLLING REFRESH · TAP ANY CARD FOR THE FULL CITATION</p>' + inner +
      '<div class="pf-macro-foot">OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA</div></div>';
  }

  function emptyBlock(head, body) {
    return '<div class="pf-macro-empty"><span class="pf-macro-dash">\u2014</span>' +
      '<h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }

  function render(container, j) {
    cssOnce();
    var F = window.PFFred;
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    if (!F) { container.innerHTML = shell(emptyBlock(EMPTY_HEAD, EMPTY_BODY)); return; }
    F.cssOnce();
    if (!live) {
      container.innerHTML = shell(emptyBlock(EMPTY_HEAD, (j && j.note) || EMPTY_BODY));
      return;
    }
    if (!series.length) {
      container.innerHTML = shell(emptyBlock(WAITING_HEAD, (j && j.note) || WAITING_BODY));
      return;
    }
    /* Backend FULL_ORDER (Phase 3, 16): FEDFUNDS, UNRATE, DGS10,
       MORTGAGE30US, CPIAUCNS, CPILFESL, PAYEMS, PCEPI, GDP, CES0500000003,
       DGS2, CUUR0000SEHA, CUSR0000SAF11, CUSR0000SETB01, DRCCLACBS,
       LES1252881600Q.
       Rendered in order. */
    container.innerHTML = shell(
      '<div class="pf-macro-grid">' +
      series.map(function (s) { return cardHtml(F, s || {}); }).join('') +
      '</div>');
    wireTaps(F, container, series);
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-macro')) return true;
    } catch (e) {}
    var F = window.PFFred;
    if (!F) { render(container, null); return true; }
    F.full(function (j) {
      try {
        if (j && j.ok) render(container, j);
        else render(container, null);
        renderModelCards(container);
      } catch (e) { try { render(container, null); } catch (e2) {} }
    });
    return true;
  }

  /* ---------- Wave B3: M-03 + M-06 strip model cards ----------
     Two derived-model cards appended to the macro strip (money page).
     MODEL chip + methodology on each; descriptive only, no predictions.
     Each card has its own kill switch; they ride the money-macro master. */
  function modelCard(title, modelTag, valueHTML, periodLabel, note, stampHTML) {
    return '<div class="pf-macro-card">' +
      '<div class="pf-macro-head"><span class="pf-macro-title">' + esc(title) + '</span>' +
      '<span class="pf-macro-sa">' + esc(modelTag) + '</span></div>' +
      valueHTML +
      '<div class="pf-macro-period">' + esc(periodLabel || '') + '</div>' +
      '<div class="pf-macro-src">' + note + stampHTML + '</div></div>';
  }

  function renderModelCards(container) {
    try {
      var grid = container.querySelector('.pf-macro-grid');
      if (!grid) return;
      var extra = document.createElement('div');
      extra.className = 'pf-macro-grid';
      extra.style.marginTop = '10px';
      extra.setAttribute('data-macro-models', '1');
      grid.parentNode.insertBefore(extra, grid.nextSibling);
      function add(html) {
        try { extra.insertAdjacentHTML('beforeend', html); } catch (e) {}
      }
      if (!PF.skip('yield-spread')) {
        api('fred_yield_spread', { limit: 1 }, function (j) {
          if (!j || !j.ok || !j.fred_live || !j.spread_live || j.stale || j.spread_bp == null) return;
          var val = (j.spread_bp > 0 ? '+' : j.spread_bp < 0 ? '\u2212' : '') +
            Math.abs(j.spread_bp) + ' bp';
          add(modelCard('YIELD-CURVE SPREAD (10Y \u2212 2Y)', 'MODEL M-03',
            '<div class="pf-macro-value">' + esc(val) + '</div>' +
            '<div class="pf-macro-unit">' + (j.inverted ? 'INVERTED' : 'NORMAL') + '</div>',
            (j.history && j.history[0] ? j.history[0].period_label : ''),
            'Spread of official Treasury yields. Descriptive only — not a forecast. ',
            'FRED \u00b7 DGS10 \u2212 DGS2'));
        });
      }
      if (!PF.skip('policy-stance')) {
        api('fred_policy_stance', { limit: 1 }, function (j) {
          if (!j || !j.ok || !j.fred_live || !j.stance_live || j.stale || j.real_rate == null) return;
          add(modelCard('FED POLICY STANCE', 'MODEL M-06',
            '<div class="pf-macro-value">' + esc(j.real_rate_label || '') + '</div>' +
            '<div class="pf-macro-unit">' + esc(String(j.regime || '').toUpperCase()) + '</div>',
            esc(j.period_label || ''),
            'Real rate = Fed funds \u2212 PCE inflation. Descriptive only — never a forecast of Fed action. ',
            'FRED \u00b7 FEDFUNDS \u2212 PCEPI'));
        });
      }
    } catch (e) {}
  }

  try { window.PFMacro = { mount: mount }; } catch (e) {}
})();
