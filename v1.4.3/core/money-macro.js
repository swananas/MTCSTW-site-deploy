/* core/money-macro.js  |  PF v1.4.3 | FRED MACRO STRIP (V5, official data).
   8 headline macro cards from the FRED read rail (?action=fred_macro).
   Official U.S. macro figures only — never blended with crowdsourced
   People's Index figures (proposal §5 rule 2).
   PURE FIGURES: current value, period, change vs prior period, source
   stamp, SA/NSA label, click-through to the FRED series page. No
   predictions, no "what this means" commentary — Psych reviews this
   surface. Nothing is estimated, nothing is seeded, nothing is mocked.
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

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;
  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  var EMPTY_BODY = 'The macro strip is being wired to live FRED figures. ' +
    'Nothing here is estimated or seeded — the 8 headline cards appear the ' +
    'moment the official feed is connected.';
  var WAITING_HEAD = 'FEED CONNECTED \u2014 FIRST REFRESH PENDING';
  var WAITING_BODY = 'The official feed is connected and the first data ' +
    'refresh is still on its way. Nothing here is estimated or seeded.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMacroCb' + Math.floor(Math.random() * 1e9);
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
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  var CSS = [
    '.pf-macro{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-macro-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-macro-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 12px;letter-spacing:1px}',
    '.pf-macro-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-macro-grid{grid-template-columns:repeat(2,1fr)}}',
    '.pf-macro-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px 12px 10px;color:#f5ead6;text-decoration:none}',
    '.pf-macro-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}',
    '.pf-macro-title{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923}',
    '.pf-macro-sa{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px}',
    '.pf-macro-value{font-weight:900;font-size:24px;color:#f5ead6;margin:2px 0}',
    '.pf-macro-unit{font-size:11px;color:#c9bfa8;margin-bottom:6px}',
    '.pf-macro-period{font-size:12px;color:#c9bfa8}',
    '.pf-macro-change{font-size:13px;font-weight:700;color:#f5ead6;margin:4px 0 8px}',
    '.pf-macro-stale{font-size:13px;color:#c9bfa8;line-height:1.5;margin:6px 0 10px;min-height:44px}',
    '.pf-macro-src{font-size:10px;color:#8a8271;letter-spacing:0.5px;border-top:1px solid #2a2a2a;padding-top:6px}',
    '.pf-macro-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center}',
    '.pf-macro-empty .pf-macro-dash{font-size:40px;color:#3a3a3a;display:block;margin-bottom:8px}',
    '.pf-macro-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-macro-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-macro-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}'
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

  /* Epoch-ms retrieved_at -> 'OCT 5, 2026'. null when unparseable (never
     render a guessed date). */
  function fmtRetrieved(s) {
    try {
      var rt = s && s.retrieved_at != null ? Number(s.retrieved_at) : NaN;
      var d = isNaN(rt) ? null : new Date(rt);
      if (!d || isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }

  /* Source stamp per the locked contract: FRED · [series] · retrieved [date]. */
  function stamp(s) {
    var sid = s.series_id || '';
    var ret = fmtRetrieved(s);
    return 'FRED \u00b7 ' + sid + (ret ? ' \u00b7 RETRIEVED ' + ret : '');
  }

  function card(s) {
    var title = esc(s.title || s.series_id || '\u2014');
    var saNsa = esc(s.sa_nsa || '');
    var link = esc(s.source_url || ('https://fred.stlouisfed.org/series/' + (s.series_id || '')));
    /* P-07 (Wave A6/PW1): machine-readable figure payload for the one-tap
       share decorator (macro-share.js). Attribute-escaped; stale cards carry
       the flag so the decorator skips them. */
    var figAttr = '';
    try {
      /* Stale cards: figure fields stay EMPTY (the stale-suppression
         invariant — no figure may leak, not even into data attributes).
         The decorator skips stale cards via the stale flag. */
      var staleFig = !!s.stale;
      figAttr = ' data-macro="' + esc(JSON.stringify({
        series_id: s.series_id || '', title: s.title || s.series_id || '',
        value_label: staleFig ? '' : (s.value_label != null ? s.value_label : ''),
        unit_label: staleFig ? '' : (s.unit_label || ''),
        period_label: staleFig ? '' : (s.period_label || s.period || ''),
        change_label: staleFig ? '' : (s.change_basis === 'yoy'
          ? (s.change_pct_label || s.change_label || '')
          : (s.change_label || s.change_pct_label || '')),
        sa_nsa: s.sa_nsa || '', source_url: s.source_url || '',
        retrieved_at: s.retrieved_at != null ? s.retrieved_at : null,
        vintage_date: s.vintage_date || null, stale: staleFig
      })) + '"';
    } catch (e) {}
    var body;
    if (s.stale) {
      /* Stale-suppression: figure hidden, the backend's honest note shows. */
      body = '<div class="pf-macro-stale">' + esc(s.stale_note || 'Last updated \u2014 refresh pending.') + '</div>';
    } else {
      /* Pure figures only. YoY cards lead with the YoY label the backend
         computed; rates/payrolls/GDP lead with the per-period change label. */
      var change = s.change_basis === 'yoy'
        ? (s.change_pct_label || s.change_label)
        : (s.change_label || s.change_pct_label);
      body =
        '<div class="pf-macro-value">' + esc(s.value_label != null ? s.value_label : '\u2014') + '</div>' +
        '<div class="pf-macro-unit">' + esc(s.unit_label || '') + '</div>' +
        '<div class="pf-macro-period">' + esc(s.period_label || s.period || '') + '</div>' +
        '<div class="pf-macro-change">' + esc(change || '') + '</div>';
    }
    return '<a class="pf-macro-card"' + figAttr + ' href="' + link + '" target="_blank" rel="noopener">' +
      '<div class="pf-macro-head"><span class="pf-macro-title">' + title + '</span>' +
      (saNsa ? '<span class="pf-macro-sa">' + saNsa + '</span>' : '') + '</div>' +
      body +
      '<div class="pf-macro-src">' + esc(stamp(s)) + '</div></a>';
  }

  function shell(inner) {
    return '<div class="pf-macro">' +
      '<div class="pf-macro-kicker">OFFICIAL DATA</div>' +
      '<h3 class="pf-macro-title">THE MACRO STRIP</h3>' + inner +
      '<div class="pf-macro-foot">OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA</div></div>';
  }

  function emptyBlock(head, body) {
    return '<div class="pf-macro-empty"><span class="pf-macro-dash">\u2014</span>' +
      '<h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }

  function render(container, j) {
    cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    if (!live) {
      /* No key / no data: honest empty. Never mock data, never estimates. */
      container.innerHTML = shell(emptyBlock(EMPTY_HEAD, (j && j.note) || EMPTY_BODY));
      return;
    }
    if (!series.length) {
      /* Connected, first ingest still pending — a distinct honest state. */
      container.innerHTML = shell(emptyBlock(WAITING_HEAD, (j && j.note) || WAITING_BODY));
      return;
    }
    /* Backend contract order: FEDFUNDS, UNRATE, DGS10, MORTGAGE30US,
       CPIAUCNS, CPILFESL, PAYEMS, GDP. Rendered in the order received. */
    container.innerHTML = shell(
      '<div class="pf-macro-grid">' +
      series.map(function (s) { return card(s || {}); }).join('') +
      '</div>');
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-macro')) return true;
    } catch (e) {}
    api('fred_macro', {}, function (j) {
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
