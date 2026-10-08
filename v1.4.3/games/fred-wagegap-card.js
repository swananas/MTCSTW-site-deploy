/* games/fred-wagegap-card.js  |  PF v1.4.3 | S-29 WAGE VS PRICES (2026-10-05).
   The standalone/shareable wage-vs-CPI chart card ("Are paychecks keeping
   up?"). Reads ONLY ?action=fred_wagegap — the presentation wrapper over
   M-01's proven math. /economy's M-01 explorer stays canonical; this card
   never re-implements the math, never diverges from it (QC byte-match at
   build time), and is the share surface + the S-23 macro-wagegap consumer.
   IIFE. NEVER auto-mounts — exposes window.PFWageGap.mount(container, opts)
   for the standalone surface the phase-3 pitch decides (e.g. /wages or the
   S-19 /macro page's first panel). Silent no-op without a container.
   ZERO XP: this module shows, grants, and promises no XP — no xpGrant,
   no XP-adjacent mechanics, no staking/betting on figures.
   DESCRIPTIVE ONLY: the badge is arithmetic ("paychecks grew Xpp faster /
   slower than prices over the last 12 months"), never a verdict and never
   a forecast. No "what this means" commentary — News Desk owns labels/copy.
   copy_review: 'pending' — badge wording + axis labels are drafts for News
   Desk's label review (their sign-off flips this to 'approved'); the
   shipped copy stays live behind the pending flag like A3's S-28.
   HONESTY: SA/NSA chips on both legs; source stamps (both series + vintage
   dates); FRED click-throughs are http(s)-only (safeUrl); stale figures are
   suppressed server-side — never a banner-less stale number; no key or no
   rows -> the locked empty copy, never an invented figure.
   SHARE HOOK: the SHARE button calls the S-23 painter's 'macro-wagegap'
   template (window.PFMacroCards.render('macro-wagegap', cardEl)). S-23 is
   not built yet — the call is guarded and fail-softs to an inline note.
   SVG/DOM chart only — no chart library (page weight budget).
   KILL: ?pf_off=wagegap (PF.skip). Inherits the host surface's kill. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (window.PFWageGap) { return; }

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

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
    var fn = 'pfWgcCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-wgc{max-width:640px;margin:0 auto;color:#f5ead6;font-family:Arial,Helvetica,sans-serif}',
    '.pf-wgc-card{border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:14px}',
    '.pf-wgc-kicker{font-weight:800;font-size:11px;letter-spacing:4px;color:#dc143c;margin-bottom:6px}',
    '.pf-wgc-h2{font-family:"Arial Black",Arial,sans-serif;font-size:20px;letter-spacing:1px;color:#f5f0e6;margin:0 0 2px;text-transform:uppercase}',
    '.pf-wgc-sub{font-size:14px;color:#d8d0c0;margin-bottom:10px;line-height:1.5}',
    '.pf-wgc-badge{font-weight:900;font-size:26px;letter-spacing:1px;margin:10px 0 2px}',
    '.pf-wgc-badge small{display:block;font-size:12px;font-weight:400;color:#c9bfa8;letter-spacing:0;margin-top:4px;line-height:1.5}',
    '.pf-wgc-rows{margin:8px 0}',
    '.pf-wgc-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:6px 0}',
    '.pf-wgc-lbl{font-size:12px;color:#c9bfa8}',
    '.pf-wgc-val{font-weight:900;font-size:18px;color:#f5ead6;white-space:nowrap}',
    '.pf-wgc-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-wgc-chart{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:10px;margin-top:8px}',
    '.pf-wgc-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#d8d0c0;margin-bottom:6px}',
    '.pf-wgc-sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}',
    '.pf-wgc-note{font-size:12px;color:#c9bfa8;line-height:1.55;margin:6px 0}',
    '.pf-wgc-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:8px;line-height:1.6}',
    '.pf-wgc-stamp a{color:#e8a0a0}',
    '.pf-wgc-actions{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}',
    '.pf-wgc-share{background:#c1121f;color:#fff;font-weight:900;font-size:13px;letter-spacing:2px;border:none;border-radius:6px;padding:10px 18px;cursor:pointer}',
    '.pf-wgc-share:active{transform:scale(.97)}',
    '.pf-wgc-hint{font-size:12px;color:#8a8271;align-self:center}',
    '.pf-wgc-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}',
    '.pf-wgc-empty h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-wgc-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}'
  ].join('\n');

  var cssDone = false;
  function cssOnce() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  function emptyHTML(head, body) {
    return '<div class="pf-wgc"><div class="pf-wgc-empty"><h4>' + esc(head) +
      '</h4><p>' + esc(body) + '</p></div></div>';
  }
  /* Slim stamp from the S-29 contract (series_id + source_url +
     vintage_date + sa_nsa). The M-01 explorer carries the full META
     detail; this card carries what a share surface needs. */
  function stampHTML(card, fallbackId) {
    if (!card) return '';
    var sid = esc(card.series_id || fallbackId || '');
    var url = safeUrl(card.source_url);
    var link = url ? '<a href="' + url + '" target="_blank" rel="noopener">FRED · ' + sid + '</a>'
      : 'FRED · ' + sid;
    var vin = card.vintage_date ? ' · vintage ' + esc(card.vintage_date) : '';
    var chip = card.sa_nsa ? '<span class="pf-wgc-chip">' + esc(card.sa_nsa) + '</span>' : '';
    return '<div class="pf-wgc-stamp">' + link + vin + chip + '</div>';
  }

  /* Compact two-line SVG chart (newest-first input, drawn oldest->newest).
     No library — page weight budget. */
  function svgChart(points, opts) {
    opts = opts || {};
    var W = 600, H = 220, PADL = 44, PADR = 10, PADT = 12, PADB = 26;
    var ys = [];
    points.forEach(function (p) { ys.push(p.w); ys.push(p.c); });
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (!(hi > lo)) { hi = lo + 1; }
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    function X(i) { return PADL + (W - PADL - PADR) * (i / Math.max(1, points.length - 1)); }
    function Y(v) { return PADT + (H - PADT - PADB) * (1 - (v - lo) / (hi - lo)); }
    function path(key) {
      return points.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(p[key]).toFixed(1);
      }).join(' ');
    }
    /* zero line when the range straddles 0 */
    var zero = '';
    if (lo < 0 && hi > 0) {
      zero = '<line x1="' + PADL + '" x2="' + (W - PADR) + '" y1="' + Y(0).toFixed(1) +
        '" y2="' + Y(0).toFixed(1) + '" stroke="#3a3a3a" stroke-width="1" stroke-dasharray="4 4"/>';
    }
    /* sparse x labels: first / middle / last month */
    var lbls = '';
    var idx = [0, Math.floor((points.length - 1) / 2), points.length - 1];
    idx.forEach(function (i) {
      if (i < 0 || i >= points.length) return;
      lbls += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) +
        '" font-size="10" fill="#8a8271" text-anchor="middle">' +
        esc(points[i].label) + '</text>';
    });
    var y1 = '<text x="6" y="' + (Y(hi) + 3).toFixed(1) + '" font-size="10" fill="#8a8271">' +
      esc(hi.toFixed(1)) + '%</text>';
    var y2 = '<text x="6" y="' + (Y(lo) + 3).toFixed(1) + '" font-size="10" fill="#8a8271">' +
      esc(lo.toFixed(1)) + '%</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img" ' +
      'aria-label="Wage growth versus price growth, year over year">' +
      zero + lbls + y1 + y2 +
      '<path d="' + path('w') + '" fill="none" stroke="#e8b923" stroke-width="2.5"/>' +
      '<path d="' + path('c') + '" fill="none" stroke="#c1121f" stroke-width="2.5"/>' +
      '</svg>';
  }

  var MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortLabel(period) {
    /* 'YYYY-MM' -> 'MMM YY' */
    var m = parseInt(String(period).slice(5, 7), 10);
    return MONTH_ABBR[m - 1] + ' ' + String(period).slice(2, 4);
  }

  function signPP(x) { return x > 0 ? '+' : (x < 0 ? '−' : ''); }

  /* Badge wording — NEWS DESK LABEL REVIEW PENDING (copy_review:'pending').
     Draft: arithmetic only, no verdict, no forecast. */
  function badgeHTML(gap) {
    var txt, sub;
    if (gap === 0) {
      txt = 'EVEN';
      sub = 'Paychecks and prices grew at the same pace over the last 12 months.';
    } else {
      var dir = gap > 0;
      txt = (dir ? '+' : '−') + Math.abs(gap).toFixed(1) + 'pp ' + (dir ? 'AHEAD' : 'BEHIND');
      sub = 'Paychecks grew ' + Math.abs(gap).toFixed(1) +
        ' percentage points ' + (dir ? 'faster' : 'slower') +
        ' than prices over the last 12 months.';
    }
    var color = gap === 0 ? '#e8b923' : (gap > 0 ? '#e8b923' : '#c1121f');
    return '<div class="pf-wgc-badge" style="color:' + color + ';">' + esc(txt) +
      '<small>' + esc(sub) + ' Year-over-year growth, by month — arithmetic, not a forecast.</small></div>';
  }

  function mount(container, opts) {
    /* Kill switch: ?pf_off=wagegap (PF.skip). Inherits the host surface's kill. */
    if (PF.skip('wagegap')) { return; }
    var root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) { return; }
    opts = opts || {};
    cssOnce();
    root.innerHTML = '<div class="pf-wgc"><div class="pf-wgc-empty"><h4>' +
      esc(EMPTY_HEAD) + '</h4><p>Loading the official wage and price figures…</p></div></div>';

    api('fred_wagegap', {}, function (j) {
      if (!j || j.ok === false) {
        root.innerHTML = emptyHTML('FEED ERROR',
          'The official wage-and-price feed failed to load. Nothing here is estimated — try again later.');
        return;
      }
      if (!j.fred_live) {
        root.innerHTML = emptyHTML(EMPTY_HEAD, j.note ||
          'The official feed is being wired to live FRED figures. Nothing here is estimated or seeded.');
        return;
      }
      if (j.stale) {
        root.innerHTML = emptyHTML('FIGURES STALE',
          j.stale_note || 'Latest figures are stale — refresh pending. No stale numbers shown.');
        return;
      }
      if (!j.latest || j.latest.gap_pp == null) {
        root.innerHTML = emptyHTML('GAP PENDING', j.note ||
          'Not enough shared history yet — the wage and price series need 12 overlapping months.');
        return;
      }
      var L = j.latest;
      var series = Array.isArray(j.series) ? j.series : [];
      var pts = series.slice().reverse().map(function (r) {
        return { label: shortLabel(r.period), w: r.wage_yoy_pct, c: r.cpi_yoy_pct };
      }).filter(function (p) {
        return typeof p.w === 'number' && typeof p.c === 'number';
      });
      var chart = pts.length > 1 ? svgChart(pts) :
        '<div class="pf-wgc-note">Chart needs more history — figures below are current.</div>';
      var ret = fmtRetrieved(j.retrieved_at);
      var cardEl = document.createElement('div');
      cardEl.className = 'pf-wgc';
      cardEl.innerHTML =
        '<div class="pf-wgc-card" data-pf-wgc="1">' +
        '<div class="pf-wgc-kicker">OFFICIAL · FRED</div>' +
        '<h2 class="pf-wgc-h2">WAGES VS PRICES</h2>' +
        '<div class="pf-wgc-sub">Are paychecks keeping up?</div>' +
        badgeHTML(L.gap_pp) +
        '<div class="pf-wgc-rows">' +
        '<div class="pf-wgc-row"><span class="pf-wgc-lbl">Wage growth — avg hourly earnings' +
        '<span class="pf-wgc-chip">SA</span></span>' +
        '<span class="pf-wgc-val">' + esc(signPP(L.wage_yoy_pct) + Math.abs(L.wage_yoy_pct).toFixed(1) + '%') + '</span></div>' +
        '<div class="pf-wgc-row"><span class="pf-wgc-lbl">Price growth — CPI-U, all items' +
        '<span class="pf-wgc-chip">NSA</span></span>' +
        '<span class="pf-wgc-val">' + esc(signPP(L.cpi_yoy_pct) + Math.abs(L.cpi_yoy_pct).toFixed(1) + '%') + '</span></div>' +
        '<div class="pf-wgc-row"><span class="pf-wgc-lbl">Latest month</span>' +
        '<span class="pf-wgc-val" style="font-size:14px;">' + esc(L.period_label || L.period || '') + '</span></div>' +
        '</div>' +
        '<div class="pf-wgc-chart">' +
        '<div class="pf-wgc-legend">' +
        '<span><span class="pf-wgc-sw" style="background:#e8b923"></span>WAGE GROWTH</span>' +
        '<span><span class="pf-wgc-sw" style="background:#c1121f"></span>PRICE GROWTH</span>' +
        '</div>' + chart +
        '<div class="pf-wgc-note">Year-over-year growth, by month. Earnings are average hourly earnings of all ' +
        'private employees, seasonally adjusted (BLS). Prices are CPI-U, all items (BLS). Two labeled lines — never blended.</div>' +
        '</div>' +
        stampHTML(L.wage_series, 'CES0500000003') +
        stampHTML(L.cpi_series, 'CPIAUCNS') +
        (ret ? '<div class="pf-wgc-stamp">Retrieved ' + esc(ret) + '</div>' : '') +
        '<div class="pf-wgc-actions">' +
        '<button type="button" class="pf-wgc-share" data-pf-wgc-share="1">SHARE THIS CHART</button>' +
        '<span class="pf-wgc-hint" data-pf-wgc-sharehint="1"></span>' +
        '</div>' +
        '</div>';
      root.innerHTML = '';
      root.appendChild(cardEl);
      var btn = cardEl.querySelector('[data-pf-wgc-share]');
      var hint = cardEl.querySelector('[data-pf-wgc-sharehint]');
      btn.addEventListener('click', function () {
        /* S-23 hook: the macro-wagegap template paints this card's figure.
           S-23 is not built yet — guarded, fail-soft, honest. */
        var P = window.PFMacroCards;
        if (P && typeof P.render === 'function') {
          try { P.render('macro-wagegap', cardEl); return; }
          catch (e) { /* fall through to the honest note */ }
        }
        hint.textContent = 'Share cards arrive with the macro-cards build — check back soon.';
      });
    });
  }

  window.PFWageGap = { mount: mount };
})();
