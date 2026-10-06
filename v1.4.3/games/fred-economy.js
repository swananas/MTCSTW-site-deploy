/* games/fred-economy.js  |  PF v1.4.3 | FRED /economy DEEPENING (W4 A4).
   Read-only official-data surfaces on /economy — the flagship comparison
   surface, deepened (S-05, S-07, S-14, M-01, S-26). All figures come from
   the FRED read rail (?action=fred_fedwatch / fred_housing / fred_wage_gap /
   fred_sahm / fred_series) + the public price_trends rail (S-14 community
   line). Official vs crowdsourced are NEVER blended: two labeled lines,
   separate methodologies, every number source-stamped.
   ZERO XP: this module shows, grants, and promises no XP — no xpGrant,
   no XP-adjacent mechanics, no staking/betting on figures.
   DESCRIPTIVE ONLY: figures, never predictions. No "what this means"
   commentary — News Desk owns labels/copy (drafts below are flagged for
   their review); Psych reviews framing (no doom copy on S-26/M-01).
   HONESTY: SA/NSA chips on every figure; vintage/retrieval stamps; stale
   figures suppressed server-side (never a banner-less stale number);
   no key or no rows -> the honest "connecting" note, never an invented
   figure. Source links are http(s)-only (safeUrl).
   Self-mounts ONLY on /economy (host #pf-economy), after the A1 trends
   widget when present. Silent no-op everywhere else.
   SVG/DOM charts only — no chart library (page weight budget).
   KILL: ?pf_off=economy-fred (master) or per-section:
     ?pf_off=fed-watch | housing-context | official-trend | wage-gap | sahm
   localStorage pf_disabled_v1='["<silo>"]' also honored (PF.skip). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('economy-fred')) { return; }
  if (window.pfFredEconomyDone) { return; }
  window.pfFredEconomyDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard: http(s) only. Anything else -> null
     (the link is dropped, never rendered). */
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
    var fn = 'pfFeCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-fe{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,Helvetica,sans-serif}',
    '.pf-fe-sec{margin:0 0 26px}',
    '.pf-fe-kicker{font-weight:800;font-size:12px;letter-spacing:5px;color:#dc143c;margin-bottom:6px}',
    '.pf-fe-h2{font-family:"Arial Black",Arial,sans-serif;font-size:22px;letter-spacing:1px;color:#f5f0e6;margin:0 0 4px;text-transform:uppercase}',
    '.pf-fe-sub{font-size:14px;color:#d8d0c0;margin-bottom:12px;line-height:1.5;max-width:680px}',
    '.pf-fe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media (max-width:640px){.pf-fe-grid{grid-template-columns:1fr}}',
    '.pf-fe-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;color:#f5ead6}',
    '.pf-fe-card h3{font-weight:900;font-size:13px;letter-spacing:1px;color:#e8b923;margin:0 0 8px}',
    '.pf-fe-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:6px 0}',
    '.pf-fe-lbl{font-size:12px;color:#c9bfa8}',
    '.pf-fe-val{font-weight:900;font-size:20px;color:#f5ead6;white-space:nowrap}',
    '.pf-fe-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-fe-gap{font-size:15px;font-weight:800;color:#f5ead6;margin:8px 0 4px}',
    '.pf-fe-note{font-size:13px;color:#c9bfa8;line-height:1.55;margin:6px 0}',
    '.pf-fe-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:8px;line-height:1.6}',
    '.pf-fe-stamp a{color:#e8a0a0}',
    '.pf-fe-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}',
    '.pf-fe-empty h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-fe-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-fe-chart{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-top:8px}',
    '.pf-fe-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#d8d0c0;margin-bottom:6px}',
    '.pf-fe-sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}',
    '.pf-fe-ep{font-size:13px;color:#d8d0c0;margin:4px 0}',
    '.pf-fe-state{font-weight:900;font-size:15px;letter-spacing:1px;margin:8px 0 4px}',
    '.pf-fe-gauge{position:relative;height:22px;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:4px;margin:10px 0 4px;overflow:hidden}',
    '.pf-fe-bar{position:absolute;left:0;top:0;bottom:0;background:#e8b923}',
    '.pf-fe-trig{position:absolute;top:-2px;bottom:-2px;width:3px;background:#c1121f}',
    '.pf-fe-scale{display:flex;justify-content:space-between;font-size:10px;color:#8a8271}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-fe-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-fe-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---------- shared bits ---------- */
  function sectionShell(kicker, title, sub) {
    return '<section class="pf-fe-sec"><div class="pf-fe-kicker">' + esc(kicker) + '</div>' +
      '<h2 class="pf-fe-h2">' + esc(title) + '</h2>' +
      (sub ? '<div class="pf-fe-sub">' + sub + '</div>' : '') +
      '<div class="pf-fe-body"><div style="color:#b8b0a0;font-size:14px;">Loading official figures&hellip;</div></div></section>';
  }
  function emptyHTML(head, body) {
    return '<div class="pf-fe-empty"><h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }
  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  var EMPTY_BODY = 'The official feed is being wired to live FRED figures. ' +
    'Nothing here is estimated or seeded — the numbers appear the moment the feed is connected.';
  function stampHTML(c, extra) {
    /* Source stamp: series title, SA/NSA, retrieval date, FRED link. */
    if (!c) return '';
    var bits = [];
    bits.push(esc(c.title || c.series_id || 'FRED series'));
    if (c.sa_nsa) bits.push(esc(c.sa_nsa));
    var rt = fmtRetrieved(c.retrieved_at);
    if (rt) bits.push('retrieved ' + esc(rt));
    if (c.vintage_date) bits.push('vintage ' + esc(String(c.vintage_date)));
    var url = safeUrl(c.source_url);
    var link = url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">fred.stlouisfed.org</a>' : '';
    return '<div class="pf-fe-stamp">' + bits.join(' · ') + link +
      (extra ? '<br>' + extra : '') + '</div>';
  }
  function chip(sa) {
    return sa ? '<span class="pf-fe-chip">' + esc(sa) + '</span>' : '';
  }

  /* ---------- SVG two-line chart (no library) ---------- */
  function monthTick(ms) {
    var d = new Date(ms);
    return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  }
  function svgLine(series, o) {
    o = o || {};
    var W = 620, H = 250, L = 52, R = 14, T = 14, B = 30;
    var tmin = Infinity, tmax = -Infinity, ymin = Infinity, ymax = -Infinity, n = 0;
    series.forEach(function (s) {
      s.pts.forEach(function (p) {
        if (p.t == null) return;
        if (p.t < tmin) tmin = p.t;
        if (p.t > tmax) tmax = p.t;
        if (p.y != null && isFinite(p.y)) {
          if (p.y < ymin) ymin = p.y;
          if (p.y > ymax) ymax = p.y;
          n++;
        }
      });
    });
    if (!n) return '';
    if (ymax === ymin) { ymax += 1; ymin -= 1; }
    var pad = (ymax - ymin) * 0.12;
    ymin -= pad; ymax += pad;
    function X(t) { return L + (t - tmin) / ((tmax - tmin) || 1) * (W - L - R); }
    function Y(v) { return T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B); }
    var g = '';
    for (var i = 0; i <= 3; i++) {
      var gv = ymin + (ymax - ymin) * i / 3;
      var gy = Y(gv);
      g += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="#2a2a2a" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + (gy + 4).toFixed(1) + '" fill="#8a8271" font-size="10" text-anchor="end">' +
        esc((o.yfmt || function (v) { return v.toFixed(1) + '%'; })(gv)) + '</text>';
    }
    for (var xi = 0; xi <= 3; xi++) {
      var xt = tmin + (tmax - tmin) * xi / 3;
      g += '<text x="' + X(xt).toFixed(1) + '" y="' + (H - 10) + '" fill="#8a8271" font-size="10" text-anchor="middle">' +
        esc(monthTick(xt)) + '</text>';
    }
    var paths = '';
    series.forEach(function (s) {
      var d = '', pen = false;
      var pts = s.pts.slice().sort(function (a, b) { return a.t - b.t; });
      pts.forEach(function (p) {
        if (p.y == null || !isFinite(p.y)) { pen = false; return; } /* gaps, never interpolate */
        d += (pen ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.y).toFixed(1) + ' ';
        pen = true;
      });
      if (d) paths += '<path d="' + d.trim() + '" fill="none" stroke="' + esc(s.color) + '" stroke-width="2.5"/>';
    });
    var legend = '<div class="pf-fe-legend">' + series.map(function (s) {
      return '<span><span class="pf-fe-sw" style="background:' + esc(s.color) + ';"></span>' + esc(s.label) + '</span>';
    }).join('') + '</div>';
    return legend + '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">' + g + paths + '</svg>';
  }
  function pctSince(pts) {
    /* Rebase a level series to % change since its first point. null-safe. */
    if (!pts.length || pts[0].y == null || !pts[0].y) return pts.map(function (p) {
      return { t: p.t, y: null };
    });
    var v0 = pts[0].y;
    return pts.map(function (p) {
      return { t: p.t, y: (p.y == null || !v0) ? null : Math.round((p.y / v0 - 1) * 1000) / 10 };
    });
  }

  /* ---------- S-05: Fed-watch cards ---------- */
  function mountFedWatch(root) {
    if (PF.skip('fed-watch')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('FED WATCH — THE OFFICIAL NUMBERS', 'What the Fed watches',
      'Two official inflation gauges, side by side. Figures only — no commentary.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_fedwatch', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (!j.core && !j.headline && !j.pce) {
        body.innerHTML = emptyHTML('FIGURES PENDING', j.note || 'The feed is connected — figures appear once the first ingest runs.');
        return;
      }
      function card(title, rows, foot) {
        return '<div class="pf-fe-card"><h3>' + esc(title) + '</h3>' + rows + foot + '</div>';
      }
      function figRow(label, c, valHTML) {
        if (!c) return '';
        if (c.stale) {
          return '<div class="pf-fe-row"><span class="pf-fe-lbl">' + esc(label) + chip(c.sa_nsa) +
            '</span><span class="pf-fe-val" style="font-size:14px;color:#c9bfa8;">stale — refresh pending</span></div>';
        }
        return '<div class="pf-fe-row"><span class="pf-fe-lbl">' + esc(label) + chip(c.sa_nsa) + '<br>' +
          '<span style="font-size:11px;color:#8a8271;">' + esc(c.period_label || '') + '</span></span>' +
          '<span class="pf-fe-val">' + valHTML + '</span></div>';
      }
      var h = '<div class="pf-fe-grid">';
      /* Card 1: core vs headline gap. News Desk owns final label copy. */
      var gapLine = j.gap_pp != null
        ? '<div class="pf-fe-gap">Gap: ' + esc(j.gap_label || '') + '</div>'
        : '<div class="pf-fe-note">Gap unavailable — one of the two gauges is stale or pending.</div>';
      h += card('WHAT THE FED ACTUALLY WATCHES',
        figRow('Core CPI (ex food & energy)', j.core, j.core && j.core.yoy != null ? esc(j.core.yoy_label || '') : '—') +
        figRow('Headline CPI (all items)', j.headline, j.headline && j.headline.yoy != null ? esc(j.headline.yoy_label || '') : '—') +
        gapLine +
        '<div class="pf-fe-note">Core strips out food and energy — the volatile parts. The Fed watches core for the underlying trend.</div>',
        stampHTML(j.core) + stampHTML(j.headline));
      /* Card 2: the Fed's favorite number. */
      var pceVal = (j.pce && !j.pce.stale && j.pce.yoy != null) ? esc(j.pce.yoy_label || '') : null;
      h += card('THE FED\u2019S FAVORITE INFLATION NUMBER',
        (j.pce ? figRow('PCE price index', j.pce, pceVal || '—')
          : '<div class="pf-fe-note">PCE figures pending — check back.</div>') +
        '<div class="pf-fe-note">The Fed\u2019s stated target is 2% PCE inflation — this is the gauge policymakers cite most.</div>',
        stampHTML(j.pce));
      h += '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-07: housing context ---------- */
  function mountHousing(root) {
    if (PF.skip('housing-context')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('HOUSING — THE HEAVYWEIGHT', 'Why housing moves the index',
      'Shelter is the biggest slice of the CPI basket. News Desk owns final copy.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_housing', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (!j.mortgage && !j.cpi) {
        body.innerHTML = emptyHTML('FIGURES PENDING', j.note || 'The feed is connected — figures appear once the first ingest runs.');
        return;
      }
      var m = j.mortgage, c = j.cpi;
      var mVal = (m && !m.stale && m.value != null) ? esc(m.value_label || '') : null;
      var h = '<div class="pf-fe-card"><h3>SHELTER WEIGHT, IN CONTEXT</h3>';
      h += '<div class="pf-fe-row"><span class="pf-fe-lbl">30-yr fixed mortgage' + chip(m && m.sa_nsa) + '<br>' +
        '<span style="font-size:11px;color:#8a8271;">' + esc((m && m.period_label) || '') + '</span></span>' +
        '<span class="pf-fe-val">' + (mVal || 'stale — refresh pending') + '</span></div>';
      if (c && !c.stale && c.yoy != null) {
        h += '<div class="pf-fe-row"><span class="pf-fe-lbl">CPI, all items (YoY)' + chip(c.sa_nsa) + '<br>' +
          '<span style="font-size:11px;color:#8a8271;">' + esc(c.period_label || '') + '</span></span>' +
          '<span class="pf-fe-val">' + esc(c.yoy_label || '') + '</span></div>';
      }
      /* Shelter-weight explainer — News Desk owns final copy; kept factual. */
      h += '<div class="pf-fe-note">Shelter is about <b>36% of the CPI</b> — the single biggest weight in the ' +
        'index. When housing costs move, the whole index moves with them. The 30-year mortgage rate sets the ' +
        'price of buying; landlords watch it when they set rent. That is why the official inflation number ' +
        'breathes with the housing market.</div>';
      h += stampHTML(m) + stampHTML(c) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-14: official trend line (extends S-02) ---------- */
  function mountOfficialTrend(root) {
    if (PF.skip('official-trend')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('OFFICIAL TREND — CPI-U, MULTI-MONTH', 'The official line, over time',
      'The multi-month official CPI line S-02\u2019s headline was missing — next to the community line, honestly labeled.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    /* Two rails in parallel: official CPI (fred_series) + community index
       (price_trends, national — the same default view as the A1 widget). */
    var cpiJ = null, piJ = null, done = 0;
    function maybe() {
      if (++done < 2) return;
      renderTrend();
    }
    function renderTrend() {
      var obs = (cpiJ && cpiJ.ok && Array.isArray(cpiJ.observations)) ? cpiJ.observations : [];
      if (!cpiJ || cpiJ.ok === false || (cpiJ.fred_live && !obs.length)) {
        body.innerHTML = emptyHTML('OFFICIAL TREND PENDING',
          'Official trend pending — check back. We won\u2019t draw a line we don\u2019t have.');
        return;
      }
      if (!cpiJ.fred_live) {
        body.innerHTML = emptyHTML(EMPTY_HEAD, (cpiJ && cpiJ.note) || EMPTY_BODY);
        return;
      }
      /* Official CPI-U: index -> % change since first month in window. */
      var cpiPts = obs.slice().reverse().map(function (o) {
        var t = Date.parse(o.period + '-01T00:00:00Z');
        return { t: isNaN(t) ? null : t, y: Number(o.value) };
      }).filter(function (p) { return p.t != null && isFinite(p.y); });
      var cpiReb = pctSince(cpiPts);
      var series = [{ label: 'Official CPI-U (BLS)', color: '#c1121f', pts: cpiReb }];
      var piNote = '';
      var pi = (piJ && piJ.ok && Array.isArray(piJ.peoples_index)) ? piJ.peoples_index : [];
      if (pi.length) {
        var piPts = pi.map(function (p) {
          var t = Date.parse(String(p.week_start).slice(0, 10) + 'T00:00:00Z');
          return { t: isNaN(t) ? null : t, y: Number(p.value) };
        }).filter(function (p) { return p.t != null && isFinite(p.y); });
        if (piPts.length > 1) {
          series.unshift({ label: 'People\u2019s Index (community-reported)', color: '#e8b923', pts: pctSince(piPts) });
        } else {
          piNote = 'People\u2019s Index: not enough community data yet — showing the official line alone.';
        }
      } else {
        piNote = 'People\u2019s Index: not enough community data yet — showing the official line alone.';
      }
      var chart = svgLine(series, {});
      var h = '<div class="pf-fe-chart">' + chart +
        (piNote ? '<div class="pf-fe-note">' + esc(piNote) + '</div>' : '') +
        '<div class="pf-fe-note">How to read this: two labeled lines, two different baskets — never one ' +
        'blended number. The People\u2019s Index is weekly community-reported prices across our 12-item basket. ' +
        'The official CPI-U covers all items — housing is about 36% of it, plus services and transport we ' +
        'don\u2019t track. Both lines are rebased to 0% at the start of the window, so compare the direction, ' +
        'not the digits. Community numbers are never presented as official.</div>' +
        stampHTML(cpiJ.fred_live ? {
          title: cpiJ.title, sa_nsa: cpiJ.sa_nsa, source_url: cpiJ.source_url,
          retrieved_at: cpiJ.retrieved_at, vintage_date: cpiJ.vintage_date
        } : null) + '</div>';
      body.innerHTML = h;
    }
    api('fred_series', { series_id: 'CPIAUCNS', limit: 15 }, function (j) { cpiJ = j; maybe(); });
    /* price_trends is A1's public rail — same default view as its widget. */
    api('price_trends', { item_id: 'eggs', area_key: 'national', weeks: 24 }, function (j) { piJ = j; maybe(); });
  }

  /* ---------- M-01: median-paycheck-vs-CPI gap (Phase 3: re-pointed
     from the CES average to the median series LES1252881600Q) ---------- */
  function mountWageGap(root) {
    if (PF.skip('wage-gap')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('WAGES VS PRICES', 'Is the typical paycheck keeping up?',
      'Median real earnings growth vs price growth, year over year. The median is the middle worker\u2019s pay, not an average — executive raises pull the average up and leave this untouched. Psych: neutral framing — no doom copy.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_wage_gap', { limit: 24 }, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      /* Stub state: series contracted, ingest not yet landed — wire on arrival. */
      if (!j.wage_live) {
        body.innerHTML = emptyHTML('WAGE DATA CONNECTING',
          j.note || 'Median usual weekly earnings not ingested yet — this panel lights up once the earnings series lands.');
        return;
      }
      if (j.stale) {
        body.innerHTML = emptyHTML('FIGURES STALE', j.stale_note || 'Latest figures are stale — refresh pending. No stale numbers shown.');
        return;
      }
      var hist = Array.isArray(j.history) ? j.history : [];
      if (!hist.length || j.gap_pp == null) {
        body.innerHTML = emptyHTML('GAP PENDING', 'Not enough history yet to draw the gap — check back after the next releases.');
        return;
      }
      var gapTxt = j.gap_pp === 0 ? 'even — wages matching prices'
        : (j.gap_pp > 0 ? '+' : '\u2212') + Math.abs(j.gap_pp).toFixed(1) + ' pp — wages ' +
          (j.gap_pp > 0 ? 'ahead of' : 'behind') + ' prices';
      var pts = hist.slice().reverse().map(function (r) {
        return { t: Date.parse(r.period + '-01T00:00:00Z'), w: r.wage_yoy, c: r.cpi_yoy };
      }).filter(function (p) { return !isNaN(p.t); });
      var chart = svgLine([
        { label: 'Median real earnings growth (SA)', color: '#e8b923',
          pts: pts.map(function (p) { return { t: p.t, y: p.w }; }) },
        { label: 'Price growth — CPI-U (NSA)', color: '#c1121f',
          pts: pts.map(function (p) { return { t: p.t, y: p.c }; }) }
      ], {});
      var h = '<div class="pf-fe-chart">' +
        '<div class="pf-fe-gap">Gap: ' + esc(gapTxt) + ' <span style="font-size:12px;font-weight:400;color:#c9bfa8;">(' +
        esc(j.period_label || '') + ')</span></div>' + chart +
        '<div class="pf-fe-note">Year-over-year growth, by quarter for earnings and 3-month CPI average for prices. Positive gap = the typical paycheck growing faster than ' +
        'prices; negative = prices growing faster. Earnings are median usual weekly earnings of full-time workers, in 1982\u201384 dollars, ' +
        'seasonally adjusted (BLS) — the typical worker\u2019s paycheck, not an average. Prices are CPI-U, all items (BLS). Two labeled lines — never blended.</div>' +
        stampHTML(j.wage) + stampHTML(j.cpi) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-26: Sahm-rule recession watch ---------- */
  function mountSahm(root) {
    if (PF.skip('sahm')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('RECESSION WATCH — THE SAHM RULE', 'A mechanical check on the job market',
      'Off the official unemployment rate. Descriptive only — never a forecast. Psych: no doom framing.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_sahm', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (j.stale || !j.current) {
        body.innerHTML = emptyHTML('FIGURES STALE', j.stale_note || 'Unemployment data is stale — refresh pending. No stale numbers shown.');
        return;
      }
      var cur = j.current;
      var trig = !!cur.triggered;
      /* Gauge: value bar vs the 0.5 pp trigger line. Mechanical, not alarmist. */
      var scale = Math.max(1.0, cur.sahm_pp * 1.25);
      var barW = Math.max(0, Math.min(100, cur.sahm_pp / scale * 100));
      var trigX = 0.5 / scale * 100;
      var h = '<div class="pf-fe-card"><h3>SAHM RULE — CURRENT READING</h3>' +
        '<div class="pf-fe-state" style="color:' + (trig ? '#c1121f' : '#e8b923') + ';">' +
        (trig ? 'TRIGGERED' : 'NOT TRIGGERED') + '</div>' +
        '<div class="pf-fe-note" style="margin-top:0;">Sahm value <b>' + esc(cur.sahm_pp.toFixed(2)) +
        ' pp</b> vs trigger <b>0.50 pp</b> · 3-mo avg unemployment ' +
        esc(cur.three_mo_avg.toFixed(1)) + '% · 12-mo low ' + esc(cur.twelve_mo_low.toFixed(1)) +
        '% · ' + esc(cur.period_label || '') + '</div>' +
        '<div class="pf-fe-gauge"><div class="pf-fe-bar" style="width:' + barW.toFixed(1) + '%;"></div>' +
        '<div class="pf-fe-trig" style="left:' + trigX.toFixed(1) + '%;"></div></div>' +
        '<div class="pf-fe-scale"><span>0 pp</span><span>trigger 0.5 pp</span><span>' +
        esc(scale.toFixed(1)) + ' pp</span></div>' +
        /* rule_plain is backend-drafted; News Desk owns the final copy. */
        '<div class="pf-fe-note">' + esc(j.rule_plain || '') + '</div>';
      var eps = Array.isArray(j.episodes) ? j.episodes : [];
      if (eps.length) {
        h += '<div class="pf-fe-note" style="font-weight:700;color:#f5ead6;">Past triggers (from the data itself):</div>';
        eps.slice().reverse().forEach(function (e) {
          var range = e.start_label + (e.end_label && e.end_label !== e.start_label ? ' \u2013 ' + e.end_label : '');
          h += '<div class="pf-fe-ep">\u25aa ' + esc(range) + ' · peak ' + esc(Number(e.peak_pp).toFixed(2)) + ' pp</div>';
        });
      } else {
        h += '<div class="pf-fe-note">No past triggers in the available history window.</div>';
      }
      h += '<div class="pf-fe-note">The rule flags deterioration already underway in the job market. ' +
        'It says nothing about how deep or long — and it is not a prediction.</div>';
      h += stampHTML(j.unrate) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- init ---------- */
  try {
    cssOnce();
    var host = null;
    try { host = document.getElementById('pf-economy'); } catch (e) {}
    if (!host) return; /* not the /economy page — silent no-op */
    /* Never mount inside the Squarespace editor. */
    try {
      var href = window.location.href || '';
      if (href.indexOf('/config/') !== -1) return;
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
    } catch (e) {}
    var root = document.createElement('div');
    root.id = 'pf-fred-economy';
    root.className = 'pf-fe';
    try {
      var trends = document.getElementById('pf-inflation-trends');
      if (trends && trends.parentNode) trends.parentNode.insertBefore(root, trends.nextSibling);
      else host.appendChild(root);
    } catch (e) { host.appendChild(root); }
    try { mountFedWatch(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountHousing(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountOfficialTrend(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountWageGap(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountSahm(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
  } catch (e) {
    try { if (PF && PF.error) PF.error('fred-economy', e); } catch (e2) {}
  }
})();
