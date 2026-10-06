/* games/fred-stackem.js  |  PF v1.4.3 | TOOL 1 — "STACK 'EM" COMPARISON BUILDER.
   Pick two economic series + a time window -> chart + auto-generated
   plain-English read + share card. All pair math and honesty enforcement
   happens server-side (?action=fred_compare); this file renders.

   Mounts:
     PFStackEm.mount(el)        — full builder (Money suite MACRO section).
                                  money-page.js SECTIONS entry 'stackem'.
                                  Kill: ?pf_off=money-stackem.
     PFStackEm.mountCurated(el) — one curated matchup, read-only
                                  (War Report). Self-mounts into #xWarReport.
                                  Kill: ?pf_off=war-stack.
     PFStackEm.mountGuided(el)  — Academy guided mode: the 6 matchups one
                                  at a time with teaching copy; free pick
                                  unlocks after the guided set is complete
                                  ("learning before lab").
                                  Self-mounts after #pf-academy-hq.
                                  Kill: ?pf_off=academy-stackem.

   Binding honesty (News Desk §§2-4, remediated):
   - Every figure: 4-fact citation. Stale legs freeze the read server-side.
   - Dual-axis: the backend normalizes (YoY % / indexed-100); this file
     never draws raw dual axes.
   - Suggested matchups default; free pick is guardrailed server-side.
   - Headlines/read come from the backend generator (banned/allowed lists,
     0.5pp margin rule, finalized vintages only) — never composed here.
   - No predictions, no financial advice. Public identity MTCSTW only.
   Read-only, zero XP. Cross-links are user-initiated taps only — no
   auto-advance, no streak/XP pressure between tools. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (window.PFStackEm) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function skip(id) { try { return PF.skip('fred') || PF.skip(id); } catch (e) { return false; } }

  /* The 6 suggested matchups (Design brief, remediated hooks). */
  var MATCHUPS = [
    { sid1: 'CES0500000003', sid2: 'CPIAUCNS',
      hook: 'Wages vs Inflation', question: 'Are paychecks beating prices?',
      why: 'Wages vs prices is the real-raise question — both legs as 12-month change, so the units can\u2019t lie.' },
    { sid1: 'MORTGAGE30US', sid2: 'FEDFUNDS',
      hook: 'Mortgage rates vs Fed rate', question: 'Who moved first?',
      why: 'The Fed sets one rate; lenders charge another. The gap between them is the policy transmission chain.' },
    { sid1: 'PAYEMS', sid2: 'UNRATE',
      hook: 'Jobs vs Unemployment', question: 'Hiring up, jobless up — how?',
      why: 'Two surveys, two answers — payrolls count jobs, unemployment counts people looking for work.' },
    { sid1: 'DGS10', sid2: 'DGS2',
      hook: 'The Yield Curve', question: 'The market\u2019s fear gauge',
      why: 'The 10-year minus the 2-year is the market\u2019s fear gauge. It has called every recession in 50 years — and it also cries wolf. That\u2019s the lesson.' },
    { sid1: 'CPIAUCNS', sid2: 'PCEPI',
      hook: 'Inflation gauges', question: 'Headline vs the Fed\u2019s favorite',
      why: 'Two inflation baskets, two answers. The Fed watches PCE; you feel CPI. Same economy, different thermometers.' },
    { sid1: 'CPILFESL', sid2: 'CPIAUCNS',
      hook: 'Core vs Headline', question: 'What\u2019s really cooking underneath',
      why: 'Core strips food and energy to find the trend hiding under the noisy headline.' }
  ];

  var SERIES12 = ['FEDFUNDS', 'UNRATE', 'DGS10', 'DGS2', 'MORTGAGE30US',
    'CPIAUCNS', 'CPILFESL', 'PCEPI', 'GDP', 'CES0500000003', 'PAYEMS', 'CUUR0000SEHA'];
  var PLAIN = {
    FEDFUNDS: 'Fed funds rate', UNRATE: 'Unemployment rate',
    DGS10: '10-year Treasury yield', DGS2: '2-year Treasury yield',
    MORTGAGE30US: '30-year mortgage rate',
    CPIAUCNS: 'Consumer prices (CPI)', CPILFESL: 'Core consumer prices',
    PAYEMS: 'Nonfarm payrolls', PCEPI: 'PCE price index',
    GDP: 'Real GDP', CES0500000003: 'Average hourly earnings',
    CUUR0000SEHA: 'Rent of primary residence'
  };
  var WINDOWS = [['1y', '1Y'], ['3y', '3Y'], ['5y', '5Y'], ['10y', '10Y'], ['all', 'ALL']];
  var LEG_COLORS = ['#6aa5ff', '#e0685c', '#e8b923'];
  var DONE_KEY = 'pf-stackem-guided-done';

  function isoWeek() {
    try {
      var d = new Date();
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      var dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow + 3);
      var first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      var fdow = (first.getUTCDay() + 6) % 7;
      first.setUTCDate(first.getUTCDate() - fdow + 3);
      return Math.round((d - first) / (7 * 24 * 3600 * 1000)) + 1;
    } catch (e) { return 1; }
  }

  var CSS = [
    '.pf-se{max-width:980px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-se-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-se-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-se-sub{font-size:13px;color:#c9bfa8;text-align:center;margin:0 0 14px}',
    '.pf-se-modes{display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}',
    '.pf-se-mode{background:#1a1a1a;border:1px solid #3a3a3a;color:#c9bfa8;border-radius:6px;min-height:44px;padding:10px 18px;font-weight:700;font-size:13px;letter-spacing:1px;cursor:pointer}',
    '.pf-se-mode.on{background:#c1121f;border-color:#c1121f;color:#fff}',
    '.pf-se-matchups{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}',
    '@media (max-width:640px){.pf-se-matchups{grid-template-columns:1fr 1fr}}',
    '.pf-se-mu{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;cursor:pointer;min-height:44px;text-align:left;color:#f5ead6}',
    '.pf-se-mu.on{border-color:#c1121f;background:#160a0a}',
    '.pf-se-mu b{display:block;font-size:14px;letter-spacing:0.5px;margin-bottom:4px}',
    '.pf-se-mu span{font-size:12px;color:#c9bfa8;font-style:italic}',
    '.pf-se-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;margin-bottom:6px;-webkit-overflow-scrolling:touch}',
    '.pf-se-chip{flex:0 0 auto;min-height:48px;padding:0 16px;background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:24px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pf-se-chip.on{background:#c1121f;border-color:#c1121f;color:#fff}',
    '.pf-se-winrow{display:flex;gap:8px;justify-content:center;margin:10px 0;flex-wrap:wrap;align-items:center}',
    '.pf-se-winrow .pf-se-wlabel{font-size:12px;color:#8a8271;letter-spacing:1px}',
    '.pf-se-go{background:#c1121f;color:#fff;border:0;border-radius:6px;min-height:48px;padding:0 28px;font-weight:900;font-size:15px;letter-spacing:2px;cursor:pointer}',
    '.pf-se-out{margin-top:14px}',
    '.pf-se-head{font-weight:900;font-size:19px;line-height:1.4;margin:0 0 8px;color:#f5ead6}',
    '.pf-se-read{font-size:14px;line-height:1.65;color:#f5ead6;margin:0 0 6px}',
    '.pf-se-chartwrap{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:10px 6px 4px;margin:10px 0}',
    '.pf-se-legend{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:12px;color:#c9bfa8;padding:4px 8px 8px}',
    '.pf-se-legend i{display:inline-block;width:22px;height:3px;vertical-align:middle;margin-right:6px}',
    '.pf-se-axisnote{font-size:10px;color:#8a8271;text-align:center;letter-spacing:0.5px;padding:2px 8px 8px}',
    '.pf-se-dis{font-size:11px;color:#8a8271;line-height:1.6;border-left:3px solid #3a3a3a;padding:6px 10px;margin:8px 0}',
    '.pf-se-follow{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:14px 0}',
    '.pf-se-fbtn{background:#1a1a1a;border:1px solid #3a3a3a;color:#e8b923;border-radius:6px;min-height:44px;padding:10px 16px;font-weight:700;font-size:13px;letter-spacing:1px;cursor:pointer;text-decoration:none;display:inline-block;line-height:22px}',
    '.pf-se-share{display:block;width:100%;background:#c1121f;color:#fff;border:0;border-radius:6px;min-height:52px;font-weight:900;font-size:15px;letter-spacing:2px;cursor:pointer;margin-top:10px}',
    '.pf-se-xlinks{border-top:1px solid #2a2a2a;margin-top:16px;padding-top:12px;text-align:center;font-size:13px;color:#8a8271}',
    '.pf-se-xlinks a{color:#e8b923;font-weight:700;text-decoration:none;margin:0 10px;letter-spacing:0.5px}',
    '.pf-se-why{background:#101418;border:1px solid #2a3a4a;border-radius:8px;padding:12px;font-size:13px;line-height:1.6;color:#c9bfa8;margin:10px 0}',
    '.pf-se-why b{color:#e8b923;letter-spacing:1px}',
    '.pf-se-prog{text-align:center;font-size:12px;color:#8a8271;letter-spacing:2px;margin-bottom:8px}',
    '.pf-se-next{display:block;margin:12px auto 0;background:#c1121f;color:#fff;border:0;border-radius:6px;min-height:52px;padding:0 32px;font-weight:900;font-size:15px;letter-spacing:2px;cursor:pointer}',
    '.pf-se-lock{font-size:12px;color:#8a8271;text-align:center;margin-top:8px;font-style:italic}',
    '.pf-se-err{background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:14px;font-size:14px;color:#f5ead6;margin:10px 0}',
    '.pf-se-loading{text-align:center;color:#8a8271;padding:30px 0;font-size:14px;letter-spacing:1px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-se-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-se-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---------- SVG chart (single axis — the backend normalizes) ---------- */
  function chartSvg(j, F) {
    var legs = (j.legs || []).filter(function (l) {
      return l && l.points && l.points.length > 1;
    });
    if (!legs.length) return '';
    var W = 720, H = 260, PADL = 8, PADR = 8, PADT = 10, PADB = 26;
    var all = [];
    legs.forEach(function (l) {
      l.points.forEach(function (p) { if (isFinite(+p.value)) all.push(+p.value); });
    });
    if (all.length < 2) return '';
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    var span = hi - lo;
    /* Scale-honesty: the axis minimum is always labeled. */
    lo -= span * 0.04; hi += span * 0.04; span = hi - lo;
    function X(i, n) { return (PADL + (i / (n - 1)) * (W - PADL - PADR)).toFixed(1); }
    function Y(v) { return (PADT + (1 - (v - lo) / span) * (H - PADT - PADB)).toFixed(1); }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="display:block;width:100%;height:auto;min-height:240px" role="img" aria-label="comparison chart">';
    /* zero line when in range */
    if (lo < 0 && hi > 0) {
      svg += '<line x1="' + PADL + '" y1="' + Y(0) + '" x2="' + (W - PADR) + '" y2="' + Y(0) + '" stroke="#3a3a3a" stroke-width="1"/>';
    }
    var legend = '';
    legs.forEach(function (l, li) {
      var pts = l.points, n = pts.length;
      var d = pts.map(function (p, i) {
        return (i ? 'L' : 'M') + X(i, n) + ' ' + Y(+p.value);
      }).join(' ');
      var col = LEG_COLORS[li % LEG_COLORS.length];
      svg += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.5"/>';
      /* tap targets: up to 40 points per leg -> bottom sheet */
      var step = Math.max(1, Math.floor(n / 40));
      for (var i = 0; i < n; i += step) {
        (function (pt, leg, color) {
          svg += '<circle class="pf-se-pt" cx="' + X(pts.indexOf(pt), n) + '" cy="' + Y(+pt.value) +
            '" r="10" fill="transparent" data-sid="' + esc(leg.series_id) +
            '" data-v="' + esc(String(pt.value)) + '" data-p="' + esc(String(pt.period)) +
            '" data-c="' + esc(color) + '"/>';
        })(pts[i], l, col);
      }
      var nm = esc(l.title || l.series_id);
      legend += '<span><i style="background:' + col + '"></i>' + nm + '</span>';
    });
    /* y min/max labels */
    svg += '<text x="' + (W - PADR) + '" y="' + (PADT + 10) + '" fill="#8a8271" font-size="10" text-anchor="end">' + hi.toFixed(1) + '</text>';
    svg += '<text x="' + (W - PADR) + '" y="' + (H - PADB + 4) + '" fill="#8a8271" font-size="10" text-anchor="end">' + lo.toFixed(1) + '</text>';
    /* x first/last labels */
    var p0 = legs[0].points[0].period, p1 = legs[0].points[legs[0].points.length - 1].period;
    function shortP(p) {
      var m = /^(\d{4})-(\d{2})/.exec(String(p));
      if (m) return m[1];
      return String(p).slice(0, 10);
    }
    svg += '<text x="' + PADL + '" y="' + (H - 8) + '" fill="#8a8271" font-size="10">' + esc(shortP(p0)) + '</text>';
    svg += '<text x="' + (W - PADR) + '" y="' + (H - 8) + '" fill="#8a8271" font-size="10" text-anchor="end">' + esc(shortP(p1)) + '</text>';
    svg += '</svg>';
    var note = 'axis starts at ' + lo.toFixed(1) + ' — not zero';
    if (j.basis === 'yoy' || /% change/.test(j.legs[0].basis || '')) note += ' · ' + esc(j.legs[0].basis || '');
    return '<div class="pf-se-chartwrap"><div class="pf-se-legend">' + legend + '</div>' +
      svg + '<div class="pf-se-axisnote">' + note + '</div></div>';
  }

  function wirePoints(wrap, j, F) {
    try {
      var pts = wrap.querySelectorAll('.pf-se-pt');
      for (var i = 0; i < pts.length; i++) {
        (function (el) {
          el.addEventListener('click', function () {
            var sid = el.getAttribute('data-sid');
            var leg = null;
            (j.legs || []).forEach(function (l) { if (l.series_id === sid) leg = l; });
            if (!leg || !F) return;
            var v = parseFloat(el.getAttribute('data-v'));
            var card = {
              series_id: sid, title: leg.title,
              value_label: isFinite(v) ? v.toFixed(2) : '—',
              unit_label: leg.unit_label || '',
              period: el.getAttribute('data-p'),
              period_label: null,
              citation: (leg.latest && leg.latest.citation) || '',
              sa_nsa: leg.sa_nsa,
              source_url: (leg.latest && leg.latest.source_url) || ('https://fred.stlouisfed.org/series/' + sid),
              stale: leg.latest && leg.latest.stale,
              stale_note: leg.latest && leg.latest.stale_note
            };
            try { F.tapSheet(card); } catch (e) {}
          });
        })(pts[i]);
      }
    } catch (e) {}
  }

  /* ---------- output card ---------- */
  function outputHtml(j, F, opts) {
    opts = opts || {};
    var h = '';
    h += '<h3 class="pf-se-head">' + esc(j.headline || '') + '</h3>';
    (j.read || []).forEach(function (s) { h += '<p class="pf-se-read">' + esc(s) + '</p>'; });
    h += chartSvg(j, F);
    (j.disclosures || []).forEach(function (d) {
      h += '<div class="pf-se-dis">' + esc(d.text || '') + '</div>';
    });
    (j.citations || []).forEach(function (c) {
      if (c) h += '<div class="pf-fred-cite">' + esc(c) + '</div>';
    });
    if (!opts.noFollow) {
      h += '<div class="pf-se-follow">' +
        '<button type="button" class="pf-se-fbtn" data-se-act="flip">FLIP IT</button>' +
        '<button type="button" class="pf-se-fbtn" data-se-act="again">TRY A MATCHUP</button>' +
        '<a class="pf-se-fbtn" data-se-act="explain" href="https://www.mtcstw.com/economy#pf-explain">WHAT DOES THIS MEAN FOR ME?</a>' +
        '</div>';
    }
    h += '<button type="button" class="pf-se-share" data-se-act="share">SHARE THE RECEIPTS</button>';
    if (!opts.noXlinks) h += xlinks();
    return '<div class="pf-se-out">' + h + '</div>';
  }

  function xlinks() {
    return '<div class="pf-se-xlinks">Stacked it? Now ' +
      '<a href="https://www.mtcstw.com/economy#pf-explain">translate it</a> · ' +
      '<a href="https://www.mtcstw.com/economy#pf-receipt">check the receipts</a></div>';
  }

  /* ---------- share card (canvas 1080x1080) ---------- */
  function wrapText(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function paintShare(j) {
    var W = 1080, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, 16);
    var cx = W / 2, y = 92;
    x.textAlign = 'center';
    x.fillStyle = '#e8b923'; x.font = '700 32px Arial,sans-serif';
    x.fillText('STACK \u2019EM \u00B7 OFFICIAL DATA \u00B7 FRED', cx, y); y += 66;
    /* headline */
    x.fillStyle = '#f5ead6'; x.font = '900 46px Arial,sans-serif';
    var hl = wrapText(x, j.headline || '', W - 140);
    for (var i = 0; i < hl.length && i < 4; i++) { x.fillText(hl[i], cx, y); y += 56; }
    y += 16;
    /* mini chart: first two legs */
    var legs = (j.legs || []).filter(function (l) { return l.points && l.points.length > 1; }).slice(0, 2);
    if (legs.length) {
      var chX = 90, chW = W - 180, chY = y, chH = 240;
      var all = [];
      legs.forEach(function (l) { l.points.forEach(function (p) { if (isFinite(+p.value)) all.push(+p.value); }); });
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      x.strokeStyle = '#2a2a2a'; x.lineWidth = 2;
      x.strokeRect(chX, chY, chW, chH);
      legs.forEach(function (l, li) {
        var pts = l.points, n = pts.length;
        x.strokeStyle = LEG_COLORS[li % LEG_COLORS.length]; x.lineWidth = 4;
        x.beginPath();
        pts.forEach(function (p, pi) {
          var px = chX + (pi / (n - 1)) * chW;
          var py = chY + chH - ((+p.value - lo) / (hi - lo)) * chH;
          if (pi) x.lineTo(px, py); else x.moveTo(px, py);
        });
        x.stroke();
      });
      x.fillStyle = '#8a8271'; x.font = '400 24px Arial,sans-serif';
      x.fillText('axis starts at ' + lo.toFixed(1) + ' \u2014 not zero', cx, chY + chH + 34);
      y = chY + chH + 70;
      /* legend */
      x.font = '700 26px Arial,sans-serif';
      legs.forEach(function (l, li) {
        x.fillStyle = LEG_COLORS[li % LEG_COLORS.length];
        x.fillText('\u2014 ' + (l.title || l.series_id), cx, y);
        y += 36;
      });
      y += 10;
    }
    /* read: first two sentences */
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    var rs = (j.read || []).slice(0, 2).join(' ');
    var rl = wrapText(x, rs, W - 160);
    for (var r2 = 0; r2 < rl.length && r2 < 3; r2++) { x.fillText(rl[r2], cx, y); y += 40; }
    y += 24;
    /* source strips */
    x.fillStyle = '#8a8271'; x.font = '400 24px Arial,sans-serif';
    (j.citations || []).forEach(function (c) {
      if (!c) return;
      var cl = wrapText(x, String(c), W - 160);
      for (var c2 = 0; c2 < cl.length && c2 < 2; c2++) { x.fillText(cl[c2], cx, y); y += 32; }
    });
    y += 10;
    x.fillStyle = '#8a8271'; x.font = 'italic 400 26px Arial,sans-serif';
    x.fillText('Info, not advice. Data: FRED.', cx, y); y += 70;
    /* CTA */
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    x.fillText('MTCSTW.COM', cx, y); y += 58;
    x.fillStyle = '#c1121f'; x.font = '900 58px Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', cx, y);
    return cv;
  }

  function shareAsText(j) {
    var txt = (j.headline || '') + '\n' + (j.read || []).join(' ') + '\n' +
      (j.citations || []).filter(Boolean).join('\n') +
      '\nInfo, not advice. Data: FRED.\nhttps://www.mtcstw.com/money#pf-stackem';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt);
        return 'Headline + sources copied — paste it anywhere.';
      }
    } catch (e) {}
    return null;
  }

  function doShare(j, btn) {
    var cv = null;
    try { cv = paintShare(j); } catch (e) { cv = null; }
    if (!cv) {
      var msg = shareAsText(j);
      if (btn) btn.textContent = msg || 'SHARE FAILED — TRY AGAIN';
      return;
    }
    try {
      if (window.PFShare && typeof window.PFShare.shareImage === 'function') {
        window.PFShare.shareImage(cv, 'pf-stackem.png', j.headline || 'Stacked numbers',
          'stackem', { text: (j.headline || '') + ' https://www.mtcstw.com/money#pf-stackem via The Propaganda Factory',
            link: 'https://www.mtcstw.com/money#pf-stackem' });
        return;
      }
    } catch (e) {}
    try {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = 'pf-stackem.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { a.parentNode.removeChild(a); } catch (e2) {} }, 500);
    } catch (e2) {
      var m2 = shareAsText(j);
      if (btn) btn.textContent = m2 || 'SHARE FAILED — TRY AGAIN';
    }
  }

  /* ---------- full builder ---------- */
  function builderHtml(guided) {
    var h = '';
    if (!guided) {
      h += '<div class="pf-se-kicker">MONEY SUITE · MACRO</div>' +
        '<h2 class="pf-se-title">STACK \u2019EM</h2>' +
        '<p class="pf-se-sub">Pick two numbers. Pick a window. Start an argument — with receipts.</p>';
    }
    h += '<div class="pf-se-modes">' +
      '<button type="button" class="pf-se-mode on" data-se-mode="suggested">SUGGESTED MATCHUPS</button>' +
      '<button type="button" class="pf-se-mode" data-se-mode="free">FREE PICK</button>' +
      '</div>';
    h += '<div class="pf-se-matchups" data-se-matchups>' +
      MATCHUPS.map(function (m, i) {
        return '<button type="button" class="pf-se-mu' + (i === 0 ? ' on' : '') + '" data-se-mu="' + i + '">' +
          '<b>' + esc(m.hook) + '</b><span>' + esc(m.question) + '</span></button>';
      }).join('') + '</div>';
    h += '<div class="pf-se-chips" data-se-free style="display:none">' +
      SERIES12.map(function (s, i) {
        return '<button type="button" class="pf-se-chip" data-se-sid="' + esc(s) + '" data-se-slot="">' + esc(PLAIN[s] || s) + '</button>';
      }).join('') + '</div>';
    h += '<div class="pf-se-winrow"><span class="pf-se-wlabel">WINDOW</span>' +
      WINDOWS.map(function (w, i) {
        return '<button type="button" class="pf-se-chip' + (i === 2 ? ' on' : '') + '" data-se-win="' + w[0] + '">' + w[1] + '</button>';
      }).join('') + '</div>';
    h += '<div style="text-align:center"><button type="button" class="pf-se-go" data-se-act="go">STACK \u2019EM</button></div>';
    h += '<div data-se-out></div>';
    return h;
  }

  function mountBuilder(el, guided) {
    cssOnce();
    var F = window.PFFred;
    el.innerHTML = '<div class="pf-se">' + builderHtml(guided) + '</div>';
    var state = { mode: 'suggested', mu: 0, freeA: null, freeB: null, win: '5y', last: null };

    function q(s) { return el.querySelector(s); }
    function qa(s) { return el.querySelectorAll(s); }

    qa('[data-se-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        qa('[data-se-mode]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        state.mode = b.getAttribute('data-se-mode');
        q('[data-se-matchups]').style.display = state.mode === 'suggested' ? '' : 'none';
        q('[data-se-free]').style.display = state.mode === 'free' ? '' : 'none';
      });
    });
    qa('[data-se-mu]').forEach(function (b) {
      b.addEventListener('click', function () {
        qa('[data-se-mu]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        state.mu = parseInt(b.getAttribute('data-se-mu'), 10) || 0;
      });
    });
    qa('[data-se-win]').forEach(function (b) {
      b.addEventListener('click', function () {
        qa('[data-se-win]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        state.win = b.getAttribute('data-se-win');
      });
    });
    qa('[data-se-free] [data-se-sid]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sid = b.getAttribute('data-se-sid');
        if (state.freeA === sid) { state.freeA = null; }
        else if (state.freeB === sid) { state.freeB = null; }
        else if (!state.freeA) { state.freeA = sid; }
        else if (!state.freeB) { state.freeB = sid; }
        else { state.freeA = state.freeB; state.freeB = sid; }
        qa('[data-se-free] [data-se-sid]').forEach(function (x) {
          var s2 = x.getAttribute('data-se-sid');
          x.classList.toggle('on', s2 === state.freeA || s2 === state.freeB);
        });
      });
    });

    function renderOut(j) {
      var out = q('[data-se-out]');
      if (!j || j.ok !== true) {
        var msg = (j && (j.message || j.note)) ||
          (j && j.err === 'pair_not_approved'
            ? 'That pair isn\u2019t on the approved list — the 6 suggested matchups are the vetted set.'
            : "FRED's got nothing here for this window. Pick another.");
        out.innerHTML = '<div class="pf-se-err">' + esc(msg) + '</div>';
        return;
      }
      state.last = j;
      out.innerHTML = outputHtml(j, F, {});
      wirePoints(out, j, F);
      out.querySelectorAll('[data-se-act]').forEach(function (b) {
        b.addEventListener('click', function (ev) {
          var act = b.getAttribute('data-se-act');
          if (act === 'share') { doShare(j, b); }
          else if (act === 'flip') {
            var t = state.freeA; state.freeA = state.freeB; state.freeB = t;
            if (state.mode === 'suggested') {
              var m = MATCHUPS[state.mu];
              go({ sid1: m.sid2, sid2: m.sid1 });
            } else if (state.freeA && state.freeB) { go({ sid1: state.freeA, sid2: state.freeB }); }
          }
          else if (act === 'again') {
            try { q('[data-se-matchups]').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          }
          else if (act === 'explain') {
            try {
              var sid = (j.sid1 && j.sid1 !== 'SAHM') ? j.sid1 : j.sid2;
              b.href = 'https://www.mtcstw.com/economy#pf-explain?series=' + encodeURIComponent(sid);
            } catch (e) {}
          }
        });
      });
      try { out.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }

    function go(override) {
      if (!F) return;
      var params;
      if (override) {
        params = { sid1: override.sid1, sid2: override.sid2, window: state.win, mode: 'guided' };
      } else if (state.mode === 'suggested') {
        var m = MATCHUPS[state.mu];
        params = { sid1: m.sid1, sid2: m.sid2, window: state.win, mode: 'guided' };
      } else {
        if (!state.freeA || !state.freeB) {
          q('[data-se-out]').innerHTML = '<div class="pf-se-err">Pick two series first — tap any two chips above.</div>';
          return;
        }
        params = { sid1: state.freeA, sid2: state.freeB, window: state.win, mode: 'free' };
      }
      q('[data-se-out]').innerHTML = '<div class="pf-se-loading">PULLING THE NUMBERS…</div>';
      F.api('fred_compare', params, function (j) { renderOut(j); });
    }

    q('[data-se-act="go"]').addEventListener('click', function () { go(null); });
    /* Auto-run the default matchup on mount — the tool opens with a chart,
       not an empty picker. */
    go(null);
  }

  /* ---------- guided mode (Academy) ---------- */
  function mountGuided(el) {
    if (skip('academy-stackem')) return;
    cssOnce();
    var F = window.PFFred;
    var done = false;
    try { done = localStorage.getItem(DONE_KEY) === '1'; } catch (e) {}
    var h = '<div class="pf-se"><div class="pf-se-kicker">ACADEMY · GUIDED</div>' +
      '<h2 class="pf-se-title">LEARN TO READ THE NUMBERS THEY USE AGAINST YOU.</h2>';
    if (done) {
      h += '<p class="pf-se-sub">Guided set complete — free pick unlocked. Learning before lab.</p>' +
        '<div data-se-guidedfree></div></div>';
      el.innerHTML = h;
      try { mountBuilder(el.querySelector('[data-se-guidedfree]'), true); } catch (e) {}
      return;
    }
    h += '<p class="pf-se-sub">Six matchups, one at a time. Finish the set to unlock free pick.</p>' +
      '<div data-se-gbody></div></div>';
    el.innerHTML = h;
    var body = el.querySelector('[data-se-gbody]');
    var idx = 0;

    function step() {
      var m = MATCHUPS[idx];
      body.innerHTML = '<div class="pf-se-prog">MATCHUP ' + (idx + 1) + ' OF ' + MATCHUPS.length + '</div>' +
        '<h3 class="pf-se-head" style="text-align:center">' + esc(m.hook) + '</h3>' +
        '<p class="pf-se-sub">\u201C' + esc(m.question) + '\u201D</p>' +
        '<div class="pf-se-why"><b>WHY THIS PAIR — </b>' + esc(m.why) + '</div>' +
        '<div class="pf-se-loading">PULLING THE NUMBERS…</div>';
      F.api('fred_compare', { sid1: m.sid1, sid2: m.sid2, window: '5y', mode: 'guided' }, function (j) {
        if (!j || j.ok !== true) {
          body.innerHTML = '<div class="pf-se-err">Couldn\u2019t load this matchup — try the next one.</div>' +
            nextBtn();
          wireNext();
          return;
        }
        var out = outputHtml(j, F, { noXlinks: true });
        body.innerHTML = '<div class="pf-se-prog">MATCHUP ' + (idx + 1) + ' OF ' + MATCHUPS.length + '</div>' +
          '<h3 class="pf-se-head" style="text-align:center">' + esc(m.hook) + '</h3>' +
          '<p class="pf-se-sub">\u201C' + esc(m.question) + '\u201D</p>' +
          '<div class="pf-se-why"><b>WHY THIS PAIR — </b>' + esc(m.why) + '</div>' +
          out + nextBtn();
        wirePoints(body, j, F);
        body.querySelectorAll('[data-se-act]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (b.getAttribute('data-se-act') === 'share') doShare(j, b);
          });
        });
        wireNext();
        try { body.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      });
    }
    function nextBtn() {
      return idx + 1 < MATCHUPS.length
        ? '<button type="button" class="pf-se-next" data-se-gnext>NEXT MATCHUP \u2192</button>'
        : '<button type="button" class="pf-se-next" data-se-gnext>FINISH THE SET</button>';
    }
    function wireNext() {
      var b = body.querySelector('[data-se-gnext]');
      if (!b) return;
      b.addEventListener('click', function () {
        idx++;
        if (idx >= MATCHUPS.length) {
          try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {}
          mountGuided(el); /* re-render: free pick unlocked */
        } else { step(); }
      });
    }
    if (!F) { body.innerHTML = '<div class="pf-se-err">The data toolkit isn\u2019t loaded yet — reload the page.</div>'; return; }
    step();
  }

  /* ---------- curated mode (War Report) ---------- */
  function mountCurated(el) {
    if (skip('war-stack')) return;
    cssOnce();
    var F = window.PFFred;
    /* Department rotation: the weekly pick rotates mechanically across the
       6 vetted matchups by ISO week. Human editors may override the pick;
       the standing rule (no more than two consecutive curated matchups
       framing the same directional grievance) is editorial, not code. */
    var m = MATCHUPS[isoWeek() % MATCHUPS.length];
    el.innerHTML = '<div class="pf-se"><div class="pf-se-kicker">WAR REPORT</div>' +
      '<h2 class="pf-se-title">THIS WEEK\u2019S STACK</h2>' +
      '<p class="pf-se-sub">\u201C' + esc(m.question) + '\u201D — ' + esc(m.hook) + '</p>' +
      '<div class="pf-se-loading">PULLING THE NUMBERS…</div></div>';
    if (!F) return;
    F.api('fred_compare', { sid1: m.sid1, sid2: m.sid2, window: '5y', mode: 'guided' }, function (j) {
      var box = el.querySelector('.pf-se');
      if (!j || j.ok !== true || !box) return;
      box.innerHTML = '<div class="pf-se-kicker">WAR REPORT</div>' +
        '<h2 class="pf-se-title">THIS WEEK\u2019S STACK</h2>' +
        '<p class="pf-se-sub">\u201C' + esc(m.question) + '\u201D — ' + esc(m.hook) + '</p>' +
        outputHtml(j, F, { noFollow: true });
      wirePoints(box, j, F);
      box.querySelectorAll('[data-se-act]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.getAttribute('data-se-act') === 'share') doShare(j, b);
        });
      });
    });
  }

  function mount(el) {
    if (!el || skip('money-stackem')) return;
    try { mountBuilder(el, false); } catch (e) {}
  }

  /* Self-mount: War Report curated slot + Academy guided block. The Money
     suite mounts explicitly via money-page.js SECTIONS. */
  function selfMount() {
    try {
      var wr = document.getElementById('xWarReport');
      if (wr && !document.getElementById('pf-war-stack') && !skip('war-stack')) {
        var slot = document.createElement('div');
        slot.id = 'pf-war-stack';
        var anchor = wr.querySelector('#pf-wrnum');
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(slot, anchor.nextSibling);
        else wr.appendChild(slot);
        mountCurated(slot);
      }
      var ahq = document.getElementById('pf-academy-hq');
      if (ahq && !document.getElementById('pf-academy-stackem') && !skip('academy-stackem')) {
        var g = document.createElement('div');
        g.id = 'pf-academy-stackem';
        if (ahq.parentNode) ahq.parentNode.insertBefore(g, ahq.nextSibling);
        else document.body.appendChild(g);
        mountGuided(g);
      }
    } catch (e) {}
  }

  try {
    window.PFStackEm = { mount: mount, mountGuided: mountGuided, mountCurated: mountCurated };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', selfMount);
    } else { selfMount(); }
  } catch (e) {}
})();
