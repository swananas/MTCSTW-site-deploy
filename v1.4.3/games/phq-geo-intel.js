/* games/phq-geo-intel.js  |  PF v1.4.3 | GEO CAMPAIGN INTELLIGENCE (B3, FE).
   Organizer-facing geographic rollups on /political-hq:
     U-09 SUPPORT INTENSITY (?action=geo_support_intensity) — per-state
          pledges / petition sigs / campaign participants / rep contacts.
     U-10 CAMPAIGN EFFECTIVENESS (?action=geo_campaign_effectiveness) —
          per-campaign per-state: participants, contacts, method mix,
          contacts-per-100-participants.
   ORGANIZER VIEW FIRST (map §U-09/U-10). Aggregates ONLY: state-level
   (coarse), minimum-N=5 per cell (thin cells suppressed server-side),
   no callsigns, no individuals, no targeting. Nothing here is sold.
   ZERO XP: display only — no xpGrant, no XP-adjacent mechanics.
   DESCRIPTIVE ONLY: intensity and ratios describe what happened; never
   predictions, never "who to pressure next" scoring.
   Self-mounts ONLY on /political-hq (host #pf-political-hq). Silent
   no-op elsewhere. Fail-soft: a dead read renders nothing.
   KILL: ?pf_off=geo-intel  (master: ?pf_off=political-hq)
   localStorage pf_disabled_v1='["geo-intel"]' also honored (PF.skip). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('geo-intel')) { return; }
  if (window.pfGeoIntelDone) { return; }
  window.pfGeoIntelDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfGiCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-gi{max-width:860px;margin:0 auto 14px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-gi-kicker{font-weight:700;font-size:12px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:6px}',
    '.pf-gi-title{font-weight:900;font-size:18px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-gi-sub{font-size:13px;color:#c9bfa8;text-align:center;margin-bottom:10px;line-height:1.5}',
    '.pf-gi-card{border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;margin-bottom:10px}',
    '.pf-gi-card h3{font-weight:900;font-size:13px;letter-spacing:1px;color:#e8b923;margin:0 0 8px}',
    '.pf-gi-bar-row{display:grid;grid-template-columns:44px 1fr 52px;gap:8px;align-items:center;margin:5px 0;font-size:12px}',
    '.pf-gi-bar-st{font-weight:800;color:#f5ead6}',
    '.pf-gi-bar-track{position:relative;height:14px;background:#1a1a1a;border-radius:3px;overflow:hidden}',
    '.pf-gi-bar-fill{position:absolute;left:0;top:0;bottom:0;background:#c1121f}',
    '.pf-gi-bar-n{text-align:right;color:#c9bfa8;font-weight:700}',
    '.pf-gi-table{width:100%;border-collapse:collapse;font-size:12px}',
    '.pf-gi-table th{text-align:left;color:#8a8271;font-weight:700;letter-spacing:1px;padding:4px 6px;border-bottom:1px solid #2a2a2a}',
    '.pf-gi-table td{padding:5px 6px;border-bottom:1px solid #1a1a1a;color:#f5ead6}',
    '.pf-gi-note{font-size:11px;color:#8a8271;line-height:1.55;margin-top:8px}',
    '.pf-gi-sel{background:#0d0d0d;color:#f5ead6;border:1px solid #3a3a3a;border-radius:6px;padding:8px 10px;font-size:14px;margin:0 auto 10px;display:block;max-width:100%}',
    '.pf-gi-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:18px 14px;text-align:center;font-size:14px;color:#c9bfa8}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-gi-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-gi-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmt(n) { return n == null ? '—' : String(n); }

  function intensityCard(states) {
    var live = states.filter(function (s) { return s.intensity != null; });
    if (!live.length) {
      return '<div class="pf-gi-empty">No state has enough supporters yet to show an intensity map ' +
        '(states publish at 5+ supporters). This fills in as the movement grows — nothing is estimated.</div>';
    }
    var max = Math.max.apply(null, live.map(function (s) { return s.intensity; }));
    var rows = live.sort(function (a, b) { return b.intensity - a.intensity; }).slice(0, 20)
      .map(function (s) {
        var pct = max ? Math.round(s.intensity / max * 100) : 0;
        return '<div class="pf-gi-bar-row"><span class="pf-gi-bar-st">' + esc(s.state) + '</span>' +
          '<span class="pf-gi-bar-track"><span class="pf-gi-bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="pf-gi-bar-n">' + fmt(s.intensity) + '</span></div>';
      }).join('');
    return '<div class="pf-gi-card"><h3>SUPPORT INTENSITY BY STATE</h3>' + rows +
      '<div class="pf-gi-note">Combined state actions: petition signatures + campaign participants + rep contacts. ' +
      'States with fewer than 5 supporters are suppressed (Security: no thin cells). ' +
      'Coarse state level only — no districts, no individuals.</div></div>';
  }

  function effectivenessCard(camp) {
    if (!camp) {
      return '<div class="pf-gi-empty">No campaign data yet for this selection.</div>';
    }
    var live = camp.states.filter(function (s) { return s.participants != null; });
    var rows = live.map(function (s) {
      var mix = s.method_mix ? Object.keys(s.method_mix).map(function (m) {
        return esc(m) + ' ' + s.method_mix[m];
      }).join(' · ') : '—';
      return '<tr><td><strong>' + esc(s.state) + '</strong></td>' +
        '<td>' + fmt(s.participants) + '</td>' +
        '<td>' + fmt(s.contacts) + '</td>' +
        '<td>' + fmt(s.contacts_per_100_participants) + '</td>' +
        '<td>' + mix + '</td></tr>';
    }).join('');
    return '<div class="pf-gi-card"><h3>CAMPAIGN EFFECTIVENESS — ' + esc(camp.title || camp.campaign_id) + '</h3>' +
      '<div class="pf-gi-sub" style="text-align:left;margin-bottom:8px;">' +
      'Participants: ' + fmt(camp.participants_total) + ' · Rep contacts: ' + fmt(camp.contacts_total) + '</div>' +
      (rows ? '<table class="pf-gi-table"><thead><tr><th>STATE</th><th>PARTICIPANTS</th><th>CONTACTS</th>' +
        '<th>CONTACTS / 100</th><th>METHOD MIX</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="pf-gi-empty">No state has 5+ participants yet — the table fills in as organizers grow it.</div>') +
      '<div class="pf-gi-note">Contacts-per-100 is a descriptive ratio of what already happened — ' +
      'not a target, not a score for anyone. Method mix publishes at 5+ contacts per state. ' +
      'Organizer intelligence, shown at the same coarse grain publicly.</div></div>';
  }

  function render(box, campId, campList, intensity, eff) {
    cssOnce();
    var opts = '<option value="">All campaigns</option>' + campList.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === campId ? ' selected' : '') + '>' +
        esc(c.title) + '</option>';
    }).join('');
    var sel = '<label class="pf-gi-sub" style="display:block;">CAMPAIGN</label>' +
      '<select id="pf-gi-camp" class="pf-gi-sel">' + opts + '</select>';
    var effCamp = null;
    if (eff && eff.campaigns) {
      for (var i = 0; i < eff.campaigns.length; i++) {
        if (!campId || eff.campaigns[i].campaign_id === campId) { effCamp = eff.campaigns[i]; break; }
      }
      if (!effCamp && eff.campaigns.length === 1) effCamp = eff.campaigns[0];
    }
    box.innerHTML = '<div class="pf-gi">' +
      '<div class="pf-gi-kicker">ORGANIZER VIEW</div>' +
      '<h3 class="pf-gi-title">WHERE THE PRESSURE IS HOTTEST</h3>' +
      '<div class="pf-gi-sub">State-level organizer aggregates. Suppressed where thin. ' +
      'No individuals, no targeting — ever.</div>' +
      sel +
      intensityCard(intensity && intensity.states ? intensity.states : []) +
      effectivenessCard(effCamp) +
      '</div>';
    var el = document.getElementById('pf-gi-camp');
    if (el) {
      el.onchange = function () { load(box, el.value || null, campList); };
    }
  }

  function load(box, campId, campList) {
    var p = campId ? { campaign_id: campId } : {};
    api('geo_support_intensity', p, function (j1) {
      api('geo_campaign_effectiveness', p, function (j2) {
        try {
          render(box, campId, campList || [],
            (j1 && j1.ok) ? j1 : null, (j2 && j2.ok) ? j2 : null);
        } catch (e) { try { box.innerHTML = ''; } catch (e2) {} }
      });
    });
  }

  try {
    var host = document.getElementById('pf-political-hq');
    if (!host) return; /* silent no-op elsewhere */
    var box = document.createElement('div');
    box.setAttribute('data-gi', 'geo-intel');
    host.appendChild(box);
    api('pressure_list', {}, function (j) {
      var camps = (j && j.ok && Array.isArray(j.campaigns)) ? j.campaigns : [];
      try { load(box, null, camps); } catch (e) {}
    });
  } catch (e) {}
})();
