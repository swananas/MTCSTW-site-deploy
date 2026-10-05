/* games/bank-fred-context.js  |  PF v1.4.3 | S-06 BORROW & SAVE CONTEXT (Wave A5).
   Official U.S. rates (FRED: FEDFUNDS, DGS10, MORTGAGE30US) alongside the
   People's Bank in-game savings rate — context, never a comparison of
   equivalents. The in-game bank pays XP interest WEEKLY; official rates are
   ANNUAL dollar rates. The two blocks are labeled separately and the module
   states plainly that one is a game and the other is the official economy.
   The 30-yr mortgage card carries the BORROW BENCHMARK label (renter/buyer
   frame) — factual, no commentary (constraint #5).
   PURE FIGURES: value, period, change vs prior period, SA/NSA label, source
   stamp, click-through to the FRED series page. No predictions, no
   financial-advice copy, no "what this means for you". Nothing is estimated,
   nothing is seeded, nothing is mocked.
   Never auto-mounts — peoplesbank.js calls PFBankFred.mount(container,
   gameRatePct) from the vault tab. No XP anywhere on this frontend
   (read-only official-data surface).
   KILL: ?pf_off=bank-fred  (master: ?pf_off=bank) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('bank') || PF.skip('bank-fred')) { return; }
  if (window.pfBankFredDone) return;
  window.pfBankFredDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;
  var EMPTY_HEAD = 'OFFICIAL RATES CONNECTING';
  var EMPTY_BODY = 'The official rates feed is being wired to live FRED ' +
    'figures. Nothing here is estimated or seeded — the rate cards appear ' +
    'the moment the official feed is connected.';
  var WAITING_HEAD = 'FEED CONNECTED \u2014 FIRST REFRESH PENDING';
  var WAITING_BODY = 'The official feed is connected and the first data ' +
    'refresh is still on its way. Nothing here is estimated or seeded.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfBankFredCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-bf{max-width:860px;margin:14px auto 0;padding:0 8px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-bf-kicker{font-weight:700;font-size:12px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:6px}',
    '.pf-bf-title{font-weight:900;font-size:18px;text-align:center;margin:0 0 10px;letter-spacing:1px}',
    '.pf-bf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-bf-grid{grid-template-columns:1fr}}',
    '.pf-bf-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;color:#f5ead6;text-decoration:none}',
    '.pf-bf-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}',
    '.pf-bf-name{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923}',
    '.pf-bf-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px}',
    '.pf-bf-tag{display:inline-block;background:#c1121f;color:#fff;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-bottom:6px}',
    '.pf-bf-value{font-weight:900;font-size:24px;color:#f5ead6;margin:2px 0}',
    '.pf-bf-unit{font-size:11px;color:#c9bfa8;margin-bottom:6px}',
    '.pf-bf-period{font-size:12px;color:#c9bfa8}',
    '.pf-bf-change{font-size:13px;font-weight:700;color:#f5ead6;margin:4px 0 8px}',
    '.pf-bf-stale{font-size:13px;color:#c9bfa8;line-height:1.5;margin:6px 0 10px;min-height:44px}',
    '.pf-bf-src{font-size:10px;color:#8a8271;letter-spacing:0.5px;border-top:1px solid #2a2a2a;padding-top:6px}',
    '.pf-bf-game{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:12px;margin-bottom:10px}',
    '.pf-bf-glabel{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923;margin-bottom:6px}',
    '.pf-bf-gval{font-weight:900;font-size:20px;color:#f5ead6}',
    '.pf-bf-note{font-size:12px;color:#c9bfa8;line-height:1.5;margin-top:8px}',
    '.pf-bf-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}',
    '.pf-bf-empty h4{font-weight:900;font-size:16px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-bf-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-bf-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin:6px 0 2px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-bf-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-bf-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmtRetrieved(s) {
    try {
      var rt = s && s.retrieved_at != null ? Number(s.retrieved_at) : NaN;
      var d = isNaN(rt) ? null : new Date(rt);
      if (!d || isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }

  function stamp(s) {
    var sid = s.series_id || '';
    var ret = fmtRetrieved(s);
    return 'FRED \u00b7 ' + sid + (ret ? ' \u00b7 RETRIEVED ' + ret : '');
  }

  function card(s) {
    var title = esc(s.title || s.series_id || '\u2014');
    var saNsa = esc(s.sa_nsa || '');
    var link = esc(s.source_url || ('https://fred.stlouisfed.org/series/' + (s.series_id || '')));
    /* Renter/buyer frame: the 30-yr mortgage card is the BORROW BENCHMARK. */
    var tag = (s.series_id === 'MORTGAGE30US')
      ? '<div><span class="pf-bf-tag">BORROW BENCHMARK</span></div>' : '';
    var body;
    if (s.stale) {
      body = '<div class="pf-bf-stale">' + esc(s.stale_note || 'Last updated \u2014 refresh pending.') + '</div>';
    } else {
      var change = s.change_label || s.change_pct_label;
      body =
        '<div class="pf-bf-value">' + esc(s.value_label != null ? s.value_label : '\u2014') + '</div>' +
        '<div class="pf-bf-unit">' + esc(s.unit_label || '') + '</div>' +
        '<div class="pf-bf-period">' + esc(s.period_label || s.period || '') + '</div>' +
        '<div class="pf-bf-change">' + esc(change || '') + '</div>';
    }
    return '<a class="pf-bf-card" href="' + link + '" target="_blank" rel="noopener">' + tag +
      '<div class="pf-bf-head"><span class="pf-bf-name">' + title + '</span>' +
      (saNsa ? '<span class="pf-bf-chip">' + saNsa + '</span>' : '') + '</div>' +
      body +
      '<div class="pf-bf-src">' + esc(stamp(s)) + '</div></a>';
  }

  function emptyBlock(head, body) {
    return '<div class="pf-bf-empty"><h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }

  function gameBlock(ratePct) {
    var r = Number(ratePct);
    var rateLine = isFinite(r) && r > 0
      ? 'Earning <span class="pf-bf-gval">' + r + '%/week</span> XP interest in the vault.'
      : 'Vault rate unavailable right now.';
    return '<div class="pf-bf-game"><div class="pf-bf-glabel">YOUR BANK (IN-GAME)</div>' +
      '<div>' + rateLine + '</div>' +
      '<div class="pf-bf-note">Game rates pay XP, not dollars. The official rates ' +
      'above are the real economy\u2019s annual rates \u2014 context, not a comparison.</div></div>';
  }

  function render(container, ratePct, j) {
    cssOnce();
    var live = !!(j && j.fred_live);
    var cards = (j && Array.isArray(j.cards)) ? j.cards : [];
    var inner;
    if (!live || !cards.length) {
      var head = !live ? EMPTY_HEAD : WAITING_HEAD;
      var body = (j && j.note) || (!live ? EMPTY_BODY : WAITING_BODY);
      inner = emptyBlock(head, body);
    } else {
      /* Backend contract order: FEDFUNDS, DGS10, MORTGAGE30US. Rendered in
         the order received. */
      inner = '<div class="pf-bf-grid">' +
        cards.map(function (s) { return card(s || {}); }).join('') +
        '</div>';
    }
    container.innerHTML = '<div class="pf-bf">' +
      '<div class="pf-bf-kicker">OFFICIAL DATA</div>' +
      '<h3 class="pf-bf-title">BORROW &amp; SAVE \u2014 THE OFFICIAL RATES</h3>' +
      inner + gameBlock(ratePct) +
      '<div class="pf-bf-foot">OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH GAME RATES</div></div>';
  }

  /* ---------- Wave B3: M-03 yield-curve spread + M-06 policy stance ----------
     Treasury-context model cards, appended below the official rate cards.
     Each carries a MODEL chip and its own methodology — official figures,
     descriptive only, no predictions. KILL: ?pf_off=yield-spread |
     ?pf_off=policy-stance (master: ?pf_off=bank-fred). */
  function modelCard(title, modelTag, valueHTML, noteHTML, stamps) {
    return '<div class="pf-bf-card">' +
      '<div class="pf-bf-head"><span class="pf-bf-name">' + esc(title) + '</span>' +
      '<span class="pf-bf-chip">' + esc(modelTag) + '</span></div>' +
      valueHTML +
      '<div class="pf-bf-note">' + noteHTML + '</div>' +
      '<div class="pf-bf-src">' + stamps + '</div></div>';
  }

  function renderModels(host) {
    function draw() {
      try {
        var grid = host.querySelector('.pf-bf-grid');
        if (!grid) return;
        var extra = document.createElement('div');
        extra.setAttribute('data-bf-models', '1');
        extra.className = 'pf-bf-grid';
        extra.style.marginTop = '10px';
        grid.parentNode.insertBefore(extra, grid.nextSibling);
        function add(html) {
          try { extra.insertAdjacentHTML('beforeend', html); } catch (e) {}
        }
        if (!PF.skip('yield-spread')) {
          api('fred_yield_spread', { limit: 1 }, function (j) {
            if (!j || !j.ok || !j.fred_live || !j.spread_live || j.stale || j.spread_bp == null) return;
            var val = (j.spread_bp > 0 ? '+' : j.spread_bp < 0 ? '\u2212' : '') +
              Math.abs(j.spread_bp) + ' bp';
            var note = j.inverted
              ? 'Inverted — the 10-year yield sits below the 2-year. A mechanical reading of the curve, not a forecast.'
              : 'Normal — the 10-year yield sits above the 2-year. A mechanical reading of the curve, not a forecast.';
            /* REGIME_DRAFT equivalent: News Desk owns final copy. */
            add(modelCard('YIELD-CURVE SPREAD (10Y \u2212 2Y)', 'MODEL · M-03',
              '<div class="pf-bf-value">' + esc(val) + '</div>' +
              '<div class="pf-bf-period">' + esc(j.history && j.history[0] ? j.history[0].period_label : '') + '</div>',
              esc(note) + ' <span class="pf-bf-chip">DRAFT COPY</span>',
              'FRED \u00b7 DGS10 \u2212 DGS2 \u00b7 ' +
              (j.retrieved_at ? 'RETRIEVED ' + esc(fmtRetrieved(j)) : '')));
          });
        }
        if (!PF.skip('policy-stance')) {
          api('fred_policy_stance', { limit: 1 }, function (j) {
            if (!j || !j.ok || !j.fred_live || !j.stance_live || j.stale || j.real_rate == null) return;
            var copy = j.regime_copy_draft || '';
            add(modelCard('HOW RESTRICTIVE IS THE FED?', 'MODEL · M-06',
              '<div class="pf-bf-value">' + esc(j.real_rate_label || '') + '</div>' +
              '<div class="pf-bf-period">' + esc(String(j.regime || '').toUpperCase()) + ' \u00b7 ' +
              esc(j.period_label || '') + '</div>',
              esc(copy) + ' <span class="pf-bf-chip">DRAFT COPY</span>',
              'FRED \u00b7 FEDFUNDS \u2212 PCEPI YoY \u00b7 regimes: \u2265+2% restrictive / 0–2% neutral / &lt;0% accommodative'));
          });
        }
      } catch (e) {}
    }
    /* The rates grid renders async — retry once after mount settles. */
    var tries = 0;
    (function wait() {
      tries++;
      try {
        if (host.querySelector('.pf-bf-grid')) { draw(); return; }
      } catch (e) {}
      if (tries < 10) setTimeout(wait, 500);
    })();
  }

  function mount(container, gameRatePct) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-bf')) return true;
    } catch (e) {}
    api('fred_context', { surface: 'bank_rates' }, function (j) {
      try {
        if (j && j.ok) render(container, gameRatePct, j);
        else render(container, gameRatePct, null);
        renderModels(container);
      } catch (e) { try { render(container, gameRatePct, null); } catch (e2) {} }
    });
    return true;
  }

  try { window.PFBankFred = { mount: mount }; } catch (e) {}
})();
