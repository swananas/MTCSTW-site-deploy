/* core/money-pac-alerts.js  |  PF v1.4.3 | SUPER PAC ALERTS.
   Alert-card for the Follow-the-Money suite (element id pac-alerts;
   /money page + interim PHQ money tab). Never auto-mounts — the money-page
   shell calls PFPacAlerts.mount(container, {state}).
   BACKEND RAIL (2026-10-07 contract-gap fix): ?action=pac_spikes&state=XX
   (the old ?action=money_pac_alerts was a reserved name that never existed).
   LOCKED BE contract (be/superpac-alerts; SUPERPAC-ALERTS-FE-INTEGRATION.md)
   — the frontend adapts to the backend, never vice versa:
     ?action=pac_spikes&state=TX[&district=15][&cycle=2026] ->
     {ok, state, district, cycle, fec_live, retrieved_at (epoch ms),
      method, source, source_url, note,
      spikes:[{committee_id, committee_name, candidate_name, office,
               state, district, support_oppose, recent_30d_total,
               prior_cycle_total, prior_cycle_daily_avg, spike_multiple,
               spike, baseline:'prior'|'none', cycle, source, retrieved_at}]}
   Params: state is REQUIRED (2-letter) — the backend rejects without it, so
   mount() takes opts.state (money-page passes ?state=). Without a state the
   honest empty state renders (never a guess).
   Staleness is enforced server-side (7d -> spikes:[] + note) — a stale alert
   is misinformation and never renders as a card. Until the FEC_API_KEY
   hand-step is done, fec_live:false + spikes:[] -> the honest "no data yet"
   empty state. No endpoint inventing: {ok:false}/transport failure ->
   honest empty state, never a broken widget.
   Copy rules (BE doc section 4): committees "spent $X" supporting/opposing —
   never "bought by", never causal framing. Every card carries
   SOURCE: <source> · RETRIEVED <date> · <cycle> CYCLE. method rendered
   verbatim under the cards.
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
  /* STALE_DAYS: defense-in-depth — the backend is the primary staleness
     enforcer (7d -> spikes:[] + note; a stale alert is misinformation), but
     the FE also suppresses any spike whose retrieved_at is older than this.
     Matches the backend STALE_MS. */
  var STALE_DAYS = 7;
  var STATE_MSG = 'PICK A STATE \u2014 Super PAC spikes are state-scoped. Link this page with ?state=TX (any 2-letter code) to light up the wire.';

  function cleanState(s) {
    s = String(s == null ? '' : s).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(s) ? s : '';
  }
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
    '.pf-pa-src{font-size:12px;color:#c9bfa8}',
    '.pf-pa-method{font-size:12px;color:#c9bfa8;margin-top:10px;line-height:1.5;text-align:center;max-width:680px}'
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

  function emptyState(container, msg) {
    cssOnce();
    container.innerHTML =
      '<div class="pf-pa">' +
      '<div class="pf-pa-kicker">SUPER PAC WIRE</div>' +
      '<h3 class="pf-pa-title">SUPER PAC ALERTS</h3>' +
      '<div class="pf-pa-empty"><span class="pf-pa-dash">\u2014</span>' +
      '<h4>AWAITING PUBLIC DATA</h4>' +
      '<p>' + esc(msg || HOLD_MSG) + '</p></div>' +
      '<div class="pf-pa-src" style="font-size:12px;color:#c9bfa8;text-align:center;margin-top:10px">SOURCE: FEC</div>' +
      '</div>';
  }

  function fmtRetr(rt) {
    try {
      var d = new Date(typeof rt === 'number' ? rt : Date.parse(rt));
      if (!isNaN(d)) return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    } catch (e) {}
    return '\u2014';
  }

  /* One spike card. Copy: committees "spent $X" supporting/opposing —
     never "bought by", never causal. NEW SPENDER (baseline 'none') renders
     the no-baseline badge, never an estimated multiple. */
  function spikeCard(s, cycle) {
    s = s || {};
    var amt = money(s.recent_30d_total);
    var so = String(s.support_oppose || '').toUpperCase();
    var soWord = so === 'OPPOSE' ? 'opposing' : (so === 'SUPPORT' ? 'supporting' : String(s.support_oppose || ''));
    var geo = String(s.state || '') + (s.district ? '-' + s.district : '');
    var subj = esc(s.candidate_name || 'the race') + (geo ? ' (' + esc(geo) + ')' : '');
    var badge = (s.baseline === 'none' || s.spike_multiple == null)
      ? '<span class="pf-pa-new">NEW SPENDER \u2014 NO PRIOR-CYCLE BASELINE</span>'
      : '<span class="pf-pa-new">' + esc(String(s.spike_multiple)) + '\u00d7 PRIOR PACE</span>';
    var srcLine = 'SOURCE: ' + esc(s.source || 'FEC \u2014 INDEPENDENT EXPENDITURES (SCHEDULE E)') +
      ' \u00b7 RETRIEVED ' + esc(fmtRetr(s.retrieved_at)) + ' \u00b7 ' + esc(String(cycle)) + ' CYCLE';
    return '<div class="pf-pa-alert">' + badge +
      '<div class="pf-pa-amt">' + esc(amt) + '</div>' +
      '<div class="pf-pa-name">' + esc(s.committee_name || '\u2014') + '</div>' +
      '<p class="pf-pa-sum">Spent ' + esc(amt) + ' ' + esc(soWord) + ' ' + subj + '.</p>' +
      '<div class="pf-pa-src">' + srcLine + '</div></div>';
  }

  function render(container, j) {
    cssOnce();
    var spikes = Array.isArray(j.spikes) ? j.spikes : [];
    /* Suppression, not banner: no spikes (stale / pre-ingest / quiet state)
       falls back to the honest empty state with the backend's note.
       Defense-in-depth: also drop any spike older than STALE_DAYS here —
       the backend enforces the same rule server-side. */
    var cutoff = Date.now() - STALE_DAYS * 864e5;
    spikes = spikes.filter(function (s) {
      if (!s) return false;
      var rt = s.retrieved_at;
      var t = (typeof rt === 'number') ? rt : Date.parse(rt);
      return !isNaN(t) && t >= cutoff;
    });
    if (!spikes.length) { emptyState(container, j.note || null); return; }
    var cycle = j.cycle || 2026;
    var html = '<div class="pf-pa">' +
      '<div class="pf-pa-kicker">SUPER PAC WIRE</div>' +
      '<h3 class="pf-pa-title">SUPER PAC ALERTS</h3>' +
      spikes.slice(0, 5).map(function (s) { return spikeCard(s, cycle); }).join('') +
      (j.method ? '<div class="pf-pa-method">' + esc(j.method) + '</div>' : '') +
      '</div>';
    container.innerHTML = html;
  }

  function mount(container, opts) {
    if (!container) return false;
    opts = opts || {};
    try {
      if (container.querySelector && container.querySelector('.pf-pa')) return true;
    } catch (e) {}
    /* state is REQUIRED by the backend — never guess one. Without it the
       honest empty state renders (same as before the rail existed). */
    var state = cleanState(opts.state);
    if (!state) { emptyState(container, STATE_MSG); return true; }
    api('pac_spikes', { state: state }, function (j) {
      try {
        if (j && j.ok) render(container, j);
        else emptyState(container);
      } catch (e) { emptyState(container); }
    });
    return true;
  }

  try { window.PFPacAlerts = { mount: mount }; } catch (e) {}
})();
