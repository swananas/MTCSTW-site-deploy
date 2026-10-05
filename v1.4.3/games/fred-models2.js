/* games/fred-models2.js  |  PF v1.4.3 | FRED MODELS WAVE 2 (B3, FE).
   Read-only derived surfaces on /economy:
     M-04 RENT-BURDEN ESTIMATOR (?action=fred_rent_burden) — the rent/mortgage
          squeeze explainer card. Extends A4's S-07 housing context.
     U-01 LOCAL INFLATION INDICES (?action=geo_local_inflation) — per-area
          weekly medians for a basket item; sample counts on every point,
          n<5 medians suppressed (line breaks, never interpolates).
   Official vs crowdsourced NEVER blended: the M-04 block reads ONLY FRED
   (official side); the U-01 block reads ONLY community reports (crowd side),
   each labeled separately with its own methodology.
   ZERO XP: this module shows, grants, and promises no XP — no xpGrant,
   no XP-adjacent mechanics, no staking/betting on figures.
   DESCRIPTIVE ONLY: figures, never predictions. News Desk owns final copy
   (explainer/regime drafts below are flagged for their review); Psych
   reviews framing (no doom copy).
   HONESTY: SA/NSA chips, vintage/retrieval stamps; stale figures suppressed
   server-side; no key or no rows -> honest "connecting" note; nothing
   estimated, nothing seeded, nothing mocked. Source links http(s)-only.
   SVG/DOM charts only — no chart library (page weight budget).
   Self-mounts ONLY on /economy (host #pf-economy). Silent no-op elsewhere.
   KILL: ?pf_off=rent-burden | local-indices (master: ?pf_off=economy-fred)
   localStorage pf_disabled_v1='["<silo>"]' also honored (PF.skip). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('economy-fred') || PF.skip('rent-burden') && PF.skip('local-indices')) { return; }
  if (window.pfFredModels2Done) { return; }
  window.pfFredModels2Done = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    try {
      var s = String(u || '').trim();
      if (/^https?:\/\//i.test(s)) return s;
    } catch (e) {}
    return null;
  }
  function fmtRetrieved(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFm2Cb' + Math.floor(Math.random() * 1e9);
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

  var BASKET = [
    { id: 'milk',          name: 'Milk',               unit: 'gallon' },
    { id: 'eggs',          name: 'Eggs',               unit: 'dozen' },
    { id: 'bread',         name: 'Bread',              unit: 'loaf' },
    { id: 'ground_beef',   name: 'Ground beef',        unit: 'lb' },
    { id: 'chicken_breast',name: 'Chicken breast',     unit: 'lb' },
    { id: 'white_rice',    name: 'White rice',         unit: 'lb' },
    { id: 'bananas',       name: 'Bananas',            unit: 'lb' },
    { id: 'butter',        name: 'Butter',             unit: 'lb' },
    { id: 'coffee_12oz',   name: 'Coffee',             unit: '12oz bag' },
    { id: 'gasoline',      name: 'Gasoline (regular)', unit: 'gallon' },
    { id: 'electricity',   name: 'Electricity',        unit: 'kWh' },
    { id: 'rent_1br',      name: 'Rent (1BR)',         unit: 'month' }
  ];

  var CSS = [
    '.pf-fm2{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,Helvetica,sans-serif}',
    '.pf-fm2-sec{margin:0 0 26px}',
    '.pf-fm2-kicker{font-weight:800;font-size:12px;letter-spacing:5px;color:#dc143c;margin-bottom:6px}',
    '.pf-fm2-h2{font-family:"Arial Black",Arial,sans-serif;font-size:22px;letter-spacing:1px;color:#f5f0e6;margin:0 0 4px;text-transform:uppercase}',
    '.pf-fm2-sub{font-size:14px;color:#d8d0c0;margin-bottom:12px;line-height:1.5;max-width:680px}',
    '.pf-fm2-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media (max-width:640px){.pf-fm2-grid{grid-template-columns:1fr}}',
    '.pf-fm2-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;color:#f5ead6}',
    '.pf-fm2-card h3{font-weight:900;font-size:13px;letter-spacing:1px;color:#e8b923;margin:0 0 8px}',
    '.pf-fm2-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:6px 0}',
    '.pf-fm2-lbl{font-size:12px;color:#c9bfa8}',
    '.pf-fm2-val{font-weight:900;font-size:20px;color:#f5ead6;white-space:nowrap}',
    '.pf-fm2-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-fm2-note{font-size:13px;color:#c9bfa8;line-height:1.55;margin:6px 0}',
    '.pf-fm2-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:8px;line-height:1.6}',
    '.pf-fm2-stamp a{color:#e8a0a0}',
    '.pf-fm2-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}',
    '.pf-fm2-empty h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-fm2-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-fm2-chart{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-top:8px}',
    '.pf-fm2-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#d8d0c0;margin-bottom:6px}',
    '.pf-fm2-sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}',
    '.pf-fm2-sel{background:#0d0d0d;color:#f5ead6;border:1px solid #3a3a3a;border-radius:6px;padding:8px 10px;font-size:14px;margin-bottom:10px;max-width:100%}',
    '.pf-fm2-side{display:inline-block;background:#0d3a1a;color:#9fd8a8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-fm2-side-crowd{display:inline-block;background:#3a2a0d;color:#e8c96a;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-fm2-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-fm2-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function emptyHTML(head, body) {
    return '<div class="pf-fm2-empty"><h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }
  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  var EMPTY_BODY = 'The official feed is being wired to live FRED figures. ' +
    'Nothing here is estimated or seeded — the numbers appear the moment the feed is connected.';
  function stampHTML(c) {
    if (!c) return '';
    var bits = [];
    bits.push(esc(c.title || c.series_id || 'FRED series'));
    if (c.sa_nsa) bits.push(esc(c.sa_nsa));
    var rt = fmtRetrieved(c.retrieved_at);
    if (rt) bits.push('retrieved ' + esc(rt));
    if (c.vintage_date) bits.push('vintage ' + esc(String(c.vintage_date)));
    var url = safeUrl(c.source_url);
    var link = url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">fred.stlouisfed.org</a>' : '';
    return '<div class="pf-fm2-stamp">' + bits.join(' · ') + link + '</div>';
  }

  /* ---------- M-04: rent-burden estimator ---------- */
  function rentCard(title, c, extra) {
    var body;
    if (!c) {
      body = '<div class="pf-fm2-note">Not ingested yet — appears once the feed refreshes.</div>';
    } else if (c.stale) {
      body = '<div class="pf-fm2-note">' + esc(c.stale_note || 'Refresh pending.') + '</div>';
    } else {
      body = '<div class="pf-fm2-row"><span class="pf-fm2-lbl">' + esc(c.period_label || '') +
        '</span><span class="pf-fm2-val">' + esc(c.value_label != null ? c.value_label : '—') + '</span></div>' +
        (c.yoy_label ? '<div class="pf-fm2-row"><span class="pf-fm2-lbl">Change</span><span class="pf-fm2-val" style="font-size:16px;">' +
          esc(c.yoy_label) + '</span></div>' : '');
    }
    return '<div class="pf-fm2-card"><h3>' + esc(title) +
      (c && c.sa_nsa ? '<span class="pf-fm2-chip">' + esc(c.sa_nsa) + '</span>' : '') + '</h3>' +
      body + (extra || '') + stampHTML(c) + '</div>';
  }

  function renderRentBurden(box, j) {
    cssOnce();
    var live = !!(j && j.fred_live);
    var html;
    if (!live) {
      html = emptyHTML(EMPTY_HEAD, (j && j.note) || EMPTY_BODY);
    } else {
      var contrib = j.shelter_contribution_label ?
        '<div class="pf-fm2-card"><h3>SHELTER\u2019S SHARE OF INFLATION</h3>' +
        '<div class="pf-fm2-val" style="font-size:26px;">' + esc(j.shelter_contribution_label) + '</div>' +
        '<div class="pf-fm2-note">Shelter is ' + esc(String(j.shelter_weight_pct)) + '% of the CPI ' +
        '(' + esc(j.shelter_weight_source || 'BLS') + '). This is arithmetic — weight × rent growth — ' +
        'not a model of anything.</div></div>' :
        '<div class="pf-fm2-card"><h3>SHELTER\u2019S SHARE OF INFLATION</h3>' +
        '<div class="pf-fm2-note">Rent figures still connecting — this card fills in once the rent index lands.</div></div>';
      /* EXPLAINER_DRAFT: News Desk owns final copy; Psych reviews framing
         (no doom copy). Rendered with a DRAFT chip until signed. */
      html = '<div class="pf-fm2-grid">' +
        rentCard('30-YEAR MORTGAGE RATE', j.mortgage) +
        rentCard('RENT OF PRIMARY RESIDENCE', j.rent) +
        contrib +
        '<div class="pf-fm2-card"><h3>WHY HOUSING MOVES THE INDEX</h3>' +
        '<div class="pf-fm2-note">' + esc(j.explainer_draft || '') +
        ' <span class="pf-fm2-chip">DRAFT COPY</span></div></div>' +
        '</div>';
    }
    box.innerHTML =
      '<section class="pf-fm2-sec"><div class="pf-fm2-kicker">OFFICIAL DATA<span class="pf-fm2-side">OFFICIAL SIDE</span></div>' +
      '<h2 class="pf-fm2-h2">THE RENT/MORTGAGE SQUEEZE</h2>' +
      '<div class="pf-fm2-sub">Why housing moves the whole inflation number — from official FRED figures. ' +
      'Never blended with community reports.</div>' +
      '<div class="pf-fm2-body">' + html + '</div></section>';
  }

  function mountRentBurden(host) {
    if (PF.skip('rent-burden')) return;
    var box = document.createElement('div');
    box.className = 'pf-fm2';
    box.setAttribute('data-fm2', 'rent-burden');
    host.appendChild(box);
    box.innerHTML = '<div class="pf-fm2-note">Loading official figures&hellip;</div>';
    api('fred_rent_burden', {}, function (j) {
      try { renderRentBurden(box, (j && j.ok) ? j : null); }
      catch (e) { try { renderRentBurden(box, null); } catch (e2) {} }
    });
  }

  /* ---------- U-01: local inflation indices ---------- */
  var COLORS = ['#e8b923', '#dc143c', '#4da3ff', '#7dd87d', '#c77dff', '#ff9f4d',
                '#4dd8d8', '#ff6db3', '#a8ff4d', '#8a8271', '#ffffff', '#e8a0a0'];

  function fmtCents(c) {
    if (c == null) return '—';
    return '$' + (c / 100).toFixed(2);
  }

  function lineChart(areas, weeks) {
    /* Multi-area weekly-median SVG. Suppressed (null) points break the
       polyline — never interpolated. Sample counts on hover title. */
    var W = 760, H = 240, PL = 52, PR = 12, PT = 10, PB = 28;
    var vals = [];
    areas.forEach(function (a) {
      a.buckets.forEach(function (b) { if (b.median_cents != null) vals.push(b.median_cents); });
    });
    if (!vals.length) return '';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi = lo + 1; }
    function x(i) { return PL + (W - PL - PR) * i / Math.max(1, weeks - 1); }
    function y(v) { return PT + (H - PT - PB) * (1 - (v - lo) / (hi - lo)); }
    var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">';
    /* gridlines: lo / mid / hi */
    [lo, (lo + hi) / 2, hi].forEach(function (v) {
      h += '<line x1="' + PL + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y(v).toFixed(1) +
        '" stroke="#2a2a2a" stroke-width="1"/>' +
        '<text x="' + (PL - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" fill="#8a8271" font-size="10" text-anchor="end">' +
        esc(fmtCents(Math.round(v))) + '</text>';
    });
    areas.forEach(function (a, ai) {
      var col = COLORS[ai % COLORS.length];
      /* split into runs of consecutive non-null points */
      var run = [];
      function flush() {
        if (run.length > 1) {
          h += '<polyline fill="none" stroke="' + col + '" stroke-width="2" points="' +
            run.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
        } else if (run.length === 1) {
          h += '<circle cx="' + run[0][0].toFixed(1) + '" cy="' + run[0][1].toFixed(1) +
            '" r="3" fill="' + col + '"/>';
        }
        run = [];
      }
      a.buckets.forEach(function (b, i) {
        if (b.median_cents != null) {
          run.push([x(i), y(b.median_cents)]);
        } else flush();
      });
      flush();
      /* dots with sample-count titles */
      a.buckets.forEach(function (b, i) {
        if (b.median_cents != null) {
          h += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(b.median_cents).toFixed(1) + '" r="3" fill="' + col + '">' +
            '<title>' + esc(a.label) + ' · ' + esc(b.week_start_label) + ' · median ' + esc(fmtCents(b.median_cents)) +
            ' · n=' + b.sample_count + '</title></circle>';
        }
      });
    });
    h += '</svg>';
    return h;
  }

  function renderLocalIndices(box, j, itemId) {
    cssOnce();
    var item = null;
    for (var i = 0; i < BASKET.length; i++) if (BASKET[i].id === itemId) item = BASKET[i];
    var opts = BASKET.map(function (it) {
      return '<option value="' + esc(it.id) + '"' + (it.id === itemId ? ' selected' : '') + '>' +
        esc(it.name) + ' — per ' + esc(it.unit) + '</option>';
    }).join('');
    var sel = '<label class="pf-fm2-lbl" style="display:block;margin-bottom:4px;">ITEM</label>' +
      '<select id="pf-fm2-li-item" class="pf-fm2-sel">' + opts + '</select>';
    var body;
    if (!j || !j.ok || !j.areas || !j.areas.length) {
      body = emptyHTML('NO COMMUNITY REPORTS YET',
        'Nobody has reported prices for ' + esc(item ? item.name : itemId) +
        ' in the last ' + (j && j.weeks ? j.weeks : 12) + ' weeks. Check in a price and this chart comes alive. ' +
        'Nothing here is estimated or seeded.');
    } else {
      var areas = j.areas;
      var legend = areas.map(function (a, ai) {
        return '<span><span class="pf-fm2-sw" style="background:' + COLORS[ai % COLORS.length] + '"></span>' +
          esc(a.label) + ' <span style="color:#8a8271">(n=' + a.sample_total + ')</span></span>';
      }).join('');
      body = '<div class="pf-fm2-legend">' + legend + '</div>' +
        '<div class="pf-fm2-chart">' + lineChart(areas, j.weeks) + '</div>' +
        '<div class="pf-fm2-note">Weekly medians of published community reports. ' +
        'Weeks with fewer than ' + j.min_n + ' reports are suppressed — the line breaks, never guesses. ' +
        'Sample counts ride on every point (hover). Aggregates only — no reporter identities.</div>';
    }
    box.innerHTML =
      '<section class="pf-fm2-sec"><div class="pf-fm2-kicker">COMMUNITY DATA<span class="pf-fm2-side-crowd">CROWD SIDE</span></div>' +
      '<h2 class="pf-fm2-h2">IS IT JUST YOUR TOWN?</h2>' +
      '<div class="pf-fm2-sub">Local price indices from community check-ins — area by area, week by week. ' +
      'Never blended with official figures; this is our side of the story.</div>' +
      sel + '<div class="pf-fm2-body">' + body + '</div></section>';
    var el = document.getElementById('pf-fm2-li-item');
    if (el) {
      el.onchange = function () {
        box.innerHTML = '<div class="pf-fm2-note">Loading&hellip;</div>';
        api('geo_local_inflation', { item_id: el.value, weeks: 12 }, function (jj) {
          try { renderLocalIndices(box, (jj && jj.ok) ? jj : null, el.value); }
          catch (e) { try { renderLocalIndices(box, null, el.value); } catch (e2) {} }
        });
      };
    }
  }

  function mountLocalIndices(host) {
    if (PF.skip('local-indices')) return;
    var box = document.createElement('div');
    box.className = 'pf-fm2';
    box.setAttribute('data-fm2', 'local-indices');
    host.appendChild(box);
    api('geo_local_inflation', { item_id: 'eggs', weeks: 12 }, function (j) {
      try { renderLocalIndices(box, (j && j.ok) ? j : null, 'eggs'); }
      catch (e) { try { renderLocalIndices(box, null, 'eggs'); } catch (e2) {} }
    });
  }

  /* ---------- boot: /economy only ---------- */
  try {
    var host = document.getElementById('pf-economy');
    if (!host) return; /* silent no-op elsewhere */
    mountRentBurden(host);
    mountLocalIndices(host);
  } catch (e) {}
})();
