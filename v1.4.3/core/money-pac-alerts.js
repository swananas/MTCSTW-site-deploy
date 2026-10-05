/* core/money-pac-alerts.js  |  PF v1.4.3 | SUPER PAC ALERTS.
   Alert-card for the Follow-the-Money suite (element id pac-alerts;
   /money page + interim PHQ money tab). Never auto-mounts — the money-page
   shell calls PFPacAlerts.mount(container).
   STALENESS SUPPRESSION (FE review §4): an alert asserts recency. A super
   PAC alert whose underlying filing data is stale does not render as a
   card at all — it falls back to the empty-state track. No endpoint exists
   yet (?action=money_pac_alerts is reserved); until it lands, the honest
   empty state renders. Never invent a PAC, a filing, a date, or a dollar.
   Expected contract (reserved):
     ?action=money_pac_alerts ->
     {ok, source:'FEC (api.open.fec.gov)', retrieved_at,
      alerts:[{pac_name, filing_date, amount, race, summary, source_url}]}
   Alert cards suppress when (now - filing_date) > 30 days. The source-line
   always carries "DATA AS OF <Mon YYYY>".
   No XP anywhere on this frontend (viewing = 0; sharing rides the existing
   create_share: backend leg only when real data is present).
   KILL: ?pf_off=pac-alerts (master: ?pf_off=money) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money') || PF.skip('pac-alerts')) { return; }
  if (window.pfPacAlertsDone) return;
  window.pfPacAlertsDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var STALE_DAYS = 30; /* alert-cards assert recency; older than this, suppress */
  var HOLD_MSG = 'AWAITING PUBLIC DATA — The super PAC wire is being connected. New filings will land here the moment the feed is live.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPacCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-pa{max-width:680px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-pa-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-pa-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 12px;letter-spacing:1px}',
    '.pf-pa-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center}',
    '.pf-pa-empty .pf-pa-dash{font-size:40px;color:#3a3a3a;display:block;margin-bottom:8px}',
    '.pf-pa-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-pa-empty p{font-size:14px;color:#c9bfa8;margin:0 0 6px;line-height:1.5}',
    '.pf-pa-alert{border:1px solid #c1121f;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:14px 16px;margin-bottom:12px}',
    '.pf-pa-new{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:12px;letter-spacing:2px;padding:3px 8px;border-radius:3px;margin-bottom:8px}',
    '.pf-pa-amt{font-weight:900;font-size:28px;color:#e8b923;margin:4px 0}',
    '.pf-pa-name{font-weight:900;font-size:17px;color:#f5ead6;margin:0 0 4px}',
    '.pf-pa-sum{font-size:14px;color:#c9bfa8;margin:0 0 8px;line-height:1.5}',
    '.pf-pa-src{font-size:12px;color:#c9bfa8}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-pa-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-pa-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function money(n) {
    if (n == null || isNaN(Number(n))) return '\u2014';
    return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function emptyState(container) {
    cssOnce();
    container.innerHTML =
      '<div class="pf-pa">' +
      '<div class="pf-pa-kicker">SUPER PAC WIRE</div>' +
      '<h3 class="pf-pa-title">SUPER PAC ALERTS</h3>' +
      '<div class="pf-pa-empty"><span class="pf-pa-dash">\u2014</span>' +
      '<h4>AWAITING PUBLIC DATA</h4>' +
      '<p>' + esc(HOLD_MSG) + '</p></div>' +
      '<div class="pf-pa-src" style="font-size:12px;color:#c9bfa8;text-align:center;margin-top:10px">SOURCE: FEC</div>' +
      '</div>';
  }

  function isFresh(filingDate) {
    var t = Date.parse(filingDate);
    if (isNaN(t)) return false;
    return (Date.now() - t) <= STALE_DAYS * 864e5;
  }

  function render(container, j) {
    cssOnce();
    var alerts = (j.alerts || []).filter(function (a) { return a && isFresh(a.filing_date); });
    /* Suppression, not banner: stale alerts never render as cards. */
    if (!alerts.length) { emptyState(container); return; }
    var src = j.source || 'FEC (api.open.fec.gov)';
    var asof = '';
    try {
      var rt = j.retrieved_at;
      var d = new Date(typeof rt === 'number' ? rt : Date.parse(rt));
      if (!isNaN(d)) asof = ' \u00b7 DATA AS OF ' + d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    } catch (e) {}
    var html = '<div class="pf-pa">' +
      '<div class="pf-pa-kicker">SUPER PAC WIRE</div>' +
      '<h3 class="pf-pa-title">SUPER PAC ALERTS</h3>' +
      alerts.slice(0, 5).map(function (a) {
        return '<div class="pf-pa-alert"><span class="pf-pa-new">NEW FILING</span>' +
          '<div class="pf-pa-amt">' + esc(money(a.amount)) + '</div>' +
          '<div class="pf-pa-name">' + esc(a.pac_name || '\u2014') + '</div>' +
          '<p class="pf-pa-sum">' + esc(a.summary || '') + '</p>' +
          '<div class="pf-pa-src">SOURCE: ' + esc(src) + asof + '</div></div>';
      }).join('') + '</div>';
    container.innerHTML = html;
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-pa')) return true;
    } catch (e) {}
    api('money_pac_alerts', {}, function (j) {
      try {
        if (j && j.ok && Array.isArray(j.alerts)) render(container, j);
        else emptyState(container);
      } catch (e) { emptyState(container); }
    });
    return true;
  }

  try { window.PFPacAlerts = { mount: mount }; } catch (e) {}
})();
