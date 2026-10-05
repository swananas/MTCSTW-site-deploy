/* games/phq-jobs-panel.js  |  PF v1.4.3 | S-13 JOBS PANEL (Wave A5).
   Official jobs figures (FRED: UNRATE, PAYEMS) as a talking-points panel
   feeding pressure campaigns — DISPLAY ONLY. Each figure gets one
   quote-ready factual line ("UNEMPLOYMENT IS 4.2% (SEP 2026, SEASONALLY
   ADJUSTED) — UP 0.1 POINTS SINCE AUGUST"). Facts only: no editorial layer,
   no persuasive framing, no "what this means" commentary — persuasive copy
   is News Desk's call and none was supplied in this wave (constraint #5).
   PURE FIGURES: value, period, change vs prior period, SA/NSA label, source
   stamp, click-through to the FRED series page. Nothing is estimated,
   nothing is seeded, nothing is mocked.
   Never auto-mounts — civic.js calls PFJobsPanel.mount(container) into the
   #cvJobsPanel slot above the pressure-campaigns pane. Fail-soft: a dead
   read renders nothing and never breaks the civic page. No XP anywhere on
   this frontend (read-only official-data surface).
   KILL: ?pf_off=phq-jobs */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('phq-jobs')) { return; }
  if (window.pfJobsPanelDone) return;
  window.pfJobsPanelDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfJobsCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-jp{max-width:860px;margin:0 auto 14px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-jp-kicker{font-weight:700;font-size:12px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:6px}',
    '.pf-jp-title{font-weight:900;font-size:18px;text-align:center;margin:0 0 10px;letter-spacing:1px}',
    '.pf-jp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-jp-grid{grid-template-columns:1fr}}',
    '.pf-jp-card{border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px}',
    '.pf-jp-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px}',
    '.pf-jp-name{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923}',
    '.pf-jp-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px}',
    '.pf-jp-value{font-weight:900;font-size:24px;color:#f5ead6;margin:2px 0}',
    '.pf-jp-period{font-size:12px;color:#c9bfa8}',
    '.pf-jp-change{font-size:13px;font-weight:700;color:#f5ead6;margin:4px 0 8px}',
    '.pf-jp-stale{font-size:13px;color:#c9bfa8;line-height:1.5;margin:6px 0 10px;min-height:44px}',
    '.pf-jp-quote{border-left:4px solid #c1121f;background:#141414;padding:8px 10px;margin:8px 0;font-size:13px;line-height:1.5;color:#f5ead6}',
    '.pf-jp-quotelbl{font-size:10px;font-weight:700;letter-spacing:2px;color:#e8b923;margin-bottom:4px}',
    '.pf-jp-src{font-size:10px;color:#8a8271;letter-spacing:0.5px;border-top:1px solid #2a2a2a;padding-top:6px}',
    '.pf-jp-src a{color:#8a8271}',
    '.pf-jp-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-jp-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-jp-css';
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
    var link = s.source_url || ('https://fred.stlouisfed.org/series/' + sid);
    return 'FRED \u00b7 <a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(sid) + '</a>' +
      (ret ? ' \u00b7 RETRIEVED ' + ret : '');
  }

  /* Quote-ready factual line. No editorializing: the figure IS the talking
     point. Built only from backend-computed labels — never recomputed here. */
  function quoteLine(s) {
    if (s.stale) return null;
    var bits = [];
    var title = String(s.title || s.series_id || '').toUpperCase();
    var val = s.value_label != null ? String(s.value_label) : null;
    if (!val) return null;
    var period = s.period_label || s.period || '';
    var sa = String(s.sa_nsa || '').toUpperCase();
    bits.push(title + ' IS ' + val + (period ? ' (' + period.toUpperCase() : ''));
    if (sa) bits.push(', ' + sa);
    bits.push(')');
    var ch = s.change_label || s.change_pct_label;
    if (ch) bits.push(' \u2014 ' + String(ch).toUpperCase() + ' VS PRIOR PERIOD');
    return bits.join('');
  }

  function card(s) {
    var title = esc(s.title || s.series_id || '\u2014');
    var saNsa = esc(s.sa_nsa || '');
    var body;
    if (s.stale) {
      body = '<div class="pf-jp-stale">' + esc(s.stale_note || 'Last updated \u2014 refresh pending.') + '</div>';
    } else {
      body =
        '<div class="pf-jp-value">' + esc(s.value_label != null ? s.value_label : '\u2014') + '</div>' +
        '<div class="pf-jp-period">' + esc(s.period_label || s.period || '') + '</div>' +
        '<div class="pf-jp-change">' + esc(s.change_label || s.change_pct_label || '') + '</div>';
      var q = quoteLine(s);
      if (q) body += '<div class="pf-jp-quote"><div class="pf-jp-quotelbl">CITE THIS</div>' + esc(q) + '</div>';
    }
    return '<div class="pf-jp-card">' +
      '<div class="pf-jp-head"><span class="pf-jp-name">' + title + '</span>' +
      (saNsa ? '<span class="pf-jp-chip">' + saNsa + '</span>' : '') + '</div>' +
      body +
      '<div class="pf-jp-src">' + stamp(s) + '</div></div>';
  }

  function render(container, j) {
    cssOnce();
    var live = !!(j && j.fred_live);
    var cards = (j && Array.isArray(j.cards)) ? j.cards : [];
    /* Fail-soft: no data, dead wire, or 404ing action renders NOTHING —
       the civic page and pressure pane are untouched. */
    if (!live || !cards.length) { container.innerHTML = ''; return; }
    /* Backend contract order: UNRATE, PAYEMS. Rendered in order received. */
    container.innerHTML = '<div class="pf-jp">' +
      '<div class="pf-jp-kicker">OFFICIAL DATA</div>' +
      '<h3 class="pf-jp-title">THE JOBS NUMBERS \u2014 ARM YOURSELF</h3>' +
      '<div class="pf-jp-grid">' +
      cards.map(function (s) { return card(s || {}); }).join('') +
      '</div>' +
      '<div class="pf-jp-foot">OFFICIAL FIGURES VIA FRED \u00b7 CITE THEM IN YOUR PRESSURE-CAMPAIGN CALLS</div></div>';
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-jp')) return true;
    } catch (e) {}
    api('fred_context', { surface: 'jobs' }, function (j) {
      try {
        if (j && j.ok) render(container, j);
        else render(container, null);
      } catch (e) { try { render(container, null); } catch (e2) {} }
    });
    return true;
  }

  try { window.PFJobsPanel = { mount: mount }; } catch (e) {}
})();
