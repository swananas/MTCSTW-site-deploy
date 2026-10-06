/* core/fred-shared.js  |  PF v1.4.3 | FRED EVERYWHERE shared client.
   window.PFFred — the single honest-render toolkit for every FRED surface
   (Money MACRO, Follow the Money, Economy rail, War Report, Academy
   footers, Morning Briefing).

   Binding contract (News Desk §§2-4, remediated — never re-litigated here):
   - Every figure carries 4 facts: series ID, source agency, observation
     period, retrieval date. `citation()` builds the exact string:
     `{Agency} via FRED · {SERIES_ID} · {period} · retrieved {Mon D, YYYY}`.
     Any fact missing → `citation()` returns '' (no partial citations).
   - Stale figures STILL RENDER with the adjacent badge
     `⚠ {n} days old — expected {daily|weekly|monthly|quarterly}`.
   - Revisions carry the ʳ marker.
   - CES0500000003 surfaces say "average" adjacent to the figure; second-
     person "your paycheck/raise" is banned against it.
   - Honest reads below are the remediated News Desk Pair 1/2/3/4/7/8/9
     reads + neutralized Pair 5/6. Copy may paraphrase; it may not invert.
     Phase 3 (2026-10-06): Pair 1's read is REWRITTEN against the median
     series (LES1252881600Q) — the CES-average-based read is retired.
     CES stays available for the average-vs-median inequality lesson.
   - Mobile: 44px touch targets, no hover-only info, tap→bottom-sheet.
   Read-only: JSONP GETs against the existing fred_* actions. No XP, no
   predictions, no financial advice. Public identity MTCSTW only.
   KILL: ?pf_off=fred (master for all FRED Everywhere surfaces). */
(function () {
  'use strict';
  if (window.PFFred) return;
  var PF = window.PF;
  if (PF && PF.skip && PF.skip('fred')) return;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* SECURITY (2026-10-06 pre-ship hardening): scheme allowlist for URLs
     rendered into href/src. Only http(s) or relative URLs pass;
     javascript:, data:, vbscript: etc. are rejected. */
  function safeUrl(u){
    var s=String(u==null?'':u).trim();
    if(!s) return '';
    try{ var p=new URL(s,'https://x.invalid').protocol;
      if(p==='http:'||p==='https:') return s; }catch(e){}
    return '';
  }

  /* ---------- JSONP ---------- */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFredCb' + Math.floor(Math.random() * 1e9);
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
    params = params || {};
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    try { document.head.appendChild(s); } catch (e) { finish(null); return; }
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  /* ---------- Series metadata (News Desk §0 — copy exactly) ----------
     Phase 3 (2026-10-06): DRCCLACBS, LES1252881600Q, CUSR0000SAF11,
     CUSR0000SETB01, CUUR0000SEHA added (all verified on
     fred.stlouisfed.org 2026-10-06; CUSR0000SAF11 is SA — the spec's
     NSA label was corrected; CUSR0000SETB01 wired as the Receipt check
     gas official leg by CEO ruling). */
  var AGENCY = {
    FEDFUNDS: 'Board of Governors', DGS10: 'Board of Governors', DGS2: 'Board of Governors',
    DRCCLACBS: 'Board of Governors',
    UNRATE: 'BLS', CPIAUCNS: 'BLS', CPILFESL: 'BLS', PAYEMS: 'BLS', CES0500000003: 'BLS',
    LES1252881600Q: 'BLS', CUSR0000SAF11: 'BLS', CUSR0000SETB01: 'BLS', CUUR0000SEHA: 'BLS',
    PCEPI: 'BEA', GDP: 'BEA',
    MORTGAGE30US: 'Freddie Mac'
  };
  var PLAIN = {
    FEDFUNDS: 'Fed funds rate', UNRATE: 'Unemployment rate',
    DGS10: '10-year Treasury yield', DGS2: '2-year Treasury yield',
    MORTGAGE30US: '30-year mortgage rate',
    CPIAUCNS: 'Consumer prices (CPI)', CPILFESL: 'Core consumer prices',
    PAYEMS: 'Nonfarm payrolls', PCEPI: 'PCE price index',
    GDP: 'Real GDP', CES0500000003: 'Average hourly earnings',
    CUUR0000SEHA: 'Rent of primary residence', DRCCLACBS: 'Credit-card delinquency',
    LES1252881600Q: 'Median weekly earnings (real)', CUSR0000SAF11: 'Food at home (CPI)',
    CUSR0000SETB01: 'Gasoline (all types, CPI)'
  };
  var FREQ_WORD = { d: 'daily', w: 'weekly', m: 'monthly', q: 'quarterly' };
  var FREQ = {
    FEDFUNDS: 'm', UNRATE: 'm', DGS10: 'd', MORTGAGE30US: 'w',
    CPIAUCNS: 'm', CPILFESL: 'm', PAYEMS: 'm', PCEPI: 'm', GDP: 'q',
    CES0500000003: 'm', DGS2: 'd',
    CUUR0000SEHA: 'm', CUSR0000SAF11: 'm', CUSR0000SETB01: 'm', DRCCLACBS: 'q', LES1252881600Q: 'q'
  };
  var SA_NSA = {
    FEDFUNDS: 'NSA', UNRATE: 'SA', DGS10: 'NSA', MORTGAGE30US: 'NSA',
    CPIAUCNS: 'NSA', CPILFESL: 'SA', PAYEMS: 'SA', PCEPI: 'SA',
    GDP: 'SA', CES0500000003: 'SA', DGS2: 'NSA',
    CUUR0000SEHA: 'NSA', CUSR0000SAF11: 'SA', CUSR0000SETB01: 'SA', DRCCLACBS: 'SA', LES1252881600Q: 'SA'
  };

  /* ---------- Date / period formatting ---------- */
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtRetrieved(ms) {
    try {
      var d = new Date(Number(ms));
      if (!d || isNaN(d.getTime())) return null;
      return MO[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) { return null; }
  }
  /* Observation period for the citation: monthly 'Sep 2026', weekly
     'week ending Oct 1, 2026', daily 'Oct 2, 2026', quarterly 'Q3 2026'. */
  function fmtPeriod(card) {
    var sid = card && card.series_id;
    var freq = FREQ[sid] || 'm';
    var p = String((card && (card.period_label || card.period)) || '');
    if (freq === 'q') {
      var m = /^(\d{4})-(\d{2})/.exec(p);
      if (m) return m[1] + ' Q' + (Math.floor((parseInt(m[2], 10) - 1) / 3) + 1);
    }
    if (freq === 'w') {
      var wm = /^(\d{4})-(\d{2})-(\d{2})/.exec(p);
      if (wm) {
        var wd = new Date(Date.UTC(+wm[1], +wm[2] - 1, +wm[3]));
        if (!isNaN(wd.getTime())) return 'week ending ' + MO[wd.getUTCMonth()] + ' ' + wd.getUTCDate() + ', ' + wd.getUTCFullYear();
      }
    }
    var dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(p);
    if (dm) {
      var dd = new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3]));
      if (!isNaN(dd.getTime())) {
        if (freq === 'd') return MO[dd.getUTCMonth()] + ' ' + dd.getUTCDate() + ', ' + dd.getUTCFullYear();
        return MO[dd.getUTCMonth()] + ' ' + dd.getUTCFullYear();
      }
    }
    return p || '—';
  }

  /* ---------- The 4-fact citation ----------
     Null-if-missing (mirrors BE src/fred.js citationString): when ANY of
     the four facts — series ID, agency, period, retrieval date — is
     missing, emit nothing. A broken card never renders a partial citation. */
  function citation(card) {
    if (!card) return '';
    if (card.citation) return String(card.citation);
    var sid = card.series_id;
    var agency = sid ? AGENCY[sid] : null;
    var period = fmtPeriod(card);
    var ret = fmtRetrieved(card.retrieved_at);
    if (!sid || !agency || !period || period === '—' || !ret) return '';
    return agency + ' via FRED · ' + sid + ' · ' + period + (card.revised ? 'ʳ' : '') +
      ' · retrieved ' + ret;
  }

  /* Staleness badge (News Desk §4, exact wording). Adjacent to the figure,
     never in a footnote. */
  function staleBadge(card) {
    if (!card || !card.stale) return '';
    var n = card.days_old;
    var freq = FREQ_WORD[FREQ[card.series_id]] || 'monthly';
    var txt = (typeof n === 'number' && n >= 0)
      ? '⚠ ' + n + ' day' + (n === 1 ? '' : 's') + ' old — expected ' + freq
      : '⚠ refresh pending — expected ' + freq;
    return '<span class="pf-fred-stale">' + esc(txt) + '</span>';
  }

  /* ʳ marker for revised observations. */
  function revMark(card) {
    return (card && card.revised) ? '<sup class="pf-fred-rev" title="revised observation">ʳ</sup>' : '';
  }

  /* Inline SA/NSA legend label (Prohibition 2). */
  function saNsa(card) {
    var v = (card && card.sa_nsa) || SA_NSA[card && card.series_id] || '';
    return v ? '<span class="pf-fred-sansa">' + esc(v) + '</span>' : '';
  }

  /* "average" adjacent to CES0500000003 figures (News Desk transition rule).
     Pass any figure-adjacent label through this before rendering. */
  function cesLabel(text) {
    return String(text || '').replace(/CES0500000003/g, 'CES0500000003 (average)');
  }

  /* ---------- Sparkline (SVG, 26 pts oldest-first) ---------- */
  function sparkline(spark, opts) {
    opts = opts || {};
    var pts = Array.isArray(spark) ? spark : [];
    var W = opts.w || 220, H = opts.h || 48, PAD = 3;
    if (pts.length < 2) return '<div class="pf-fred-nospark">—</div>';
    var vals = pts.map(function (p) { return Number(p.value); }).filter(function (v) { return isFinite(v); });
    if (vals.length < 2) return '<div class="pf-fred-nospark">—</div>';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = hi - lo;
    /* Prohibition 8: if the axis is truncated (doesn't start at zero for a
       level chart), badge it. For rate/% series the zero line is drawn. */
    var truncated = lo > 0 && span > 0 && (opts.zeroLine === false);
    if (span === 0) { lo -= 1; hi += 1; span = 2; }
    var step = (W - PAD * 2) / (vals.length - 1);
    var d = vals.map(function (v, i) {
      var x = (PAD + i * step).toFixed(1);
      var y = (H - PAD - ((v - lo) / span) * (H - PAD * 2)).toFixed(1);
      return (i ? 'L' : 'M') + x + ' ' + y;
    }).join(' ');
    var last = vals[vals.length - 1], first = vals[0];
    var color = last >= first ? '#3fae5a' : '#d64545';
    var html = '<svg class="pf-fred-spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="trend sparkline">' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
      '<circle cx="' + (W - PAD).toFixed(1) + '" cy="' + (H - PAD - ((last - lo) / span) * (H - PAD * 2)).toFixed(1) + '" r="3" fill="' + color + '"/>' +
      '</svg>';
    if (truncated) html += '<span class="pf-fred-axisbadge">axis truncated</span>';
    return html;
  }

  /* ---------- Tap → bottom sheet (mobile-first data inspection) ---------- */
  var sheetEl = null;
  function cssOnce() {
    if (document.getElementById('pf-fred-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-fred-css';
    st.textContent = CSS;
    try { document.head.appendChild(st); } catch (e) {}
  }
  function tapSheet(card) {
    cssOnce();
    closeSheet();
    var sh = document.createElement('div');
    sh.className = 'pf-fred-sheetwrap';
    sh.innerHTML =
      '<div class="pf-fred-sheet">' +
      '<div class="pf-fred-sheetgrab"></div>' +
      '<div class="pf-fred-sheett">' + esc(PLAIN[card.series_id] || card.title || card.series_id) + ' ' + revMark(card) + '</div>' +
      '<div class="pf-fred-sheetv">' + esc(card.value_label != null ? card.value_label : '—') + ' <span>' + esc(card.unit_label || '') + '</span></div>' +
      '<div class="pf-fred-sheetp">' + esc(fmtPeriod(card)) + ' ' + saNsa(card) + '</div>' +
      '<div class="pf-fred-sheetc">' + esc(citation(card)) + '</div>' +
      (card.stale ? '<div class="pf-fred-sheetstale">' + esc(card.stale_note || 'refresh pending') + '</div>' : '') +
      '<a class="pf-fred-sheetlink" href="' + esc(safeUrl(card.source_url) || ('https://fred.stlouisfed.org/series/' + card.series_id)) + '" target="_blank" rel="noopener">OPEN ON FRED ↗</a>' +
      '<button class="pf-fred-sheetx" type="button">CLOSE</button>' +
      '</div>';
    function close() { closeSheet(); }
    sh.addEventListener('click', function (ev) {
      if (ev.target === sh || ev.target.className === 'pf-fred-sheetx') close();
    });
    document.body.appendChild(sh);
    sheetEl = sh;
  }
  function closeSheet() {
    if (sheetEl && sheetEl.parentNode) sheetEl.parentNode.removeChild(sheetEl);
    sheetEl = null;
  }

  /* ---------- Honest reads (News Desk §2, remediated) ----------
     Phase 3 (2026-10-06): pair1 RETIRED against CES and REWRITTEN against
     the median series (LES1252881600Q). The retired copy is below the
     divider — kept as a tombstone, never rendered. */
  var READS = {
    pair1: 'Median usual weekly earnings vs prices: the typical paycheck\u2019s purchasing power, up or down in real terms over the year. The median is the middle worker\u2019s pay, not an average — executive raises pull the average up and leave this untouched. If the median falls in real terms, the typical paycheck buys less than it did last year.',
    /* RETIRED 2026-10-06 (Phase 3): the CES-average-based Pair 1 read.
       "Average wages are up X% over the year; prices are up Y%. The
       difference is the average raise in real terms — if it's negative,
       the average paycheck buys less than it did last year."
       Replaced by the median read above. CES stays for the average-vs-
       median inequality lesson only. */
    pair2: 'The Fed sets X%; lenders charge Y%. The gap is where banks and bond markets insert themselves between policy and your mortgage.',
    pair3: 'When the 10-year pays less than the 2-year, the market is pricing in future rate cuts — which usually means it expects the economy to weaken. It has preceded every US recession in 50 years, and it also cries wolf.',
    pair4: 'The Sahm rule flags conditions that look recessionary — it\'s a coincident signal, not a forecast. It has a near-perfect historical record, but it can trigger without a recession, as it did in 2024 when labor-force growth distorted the signal. It tells you conditions look recessionary, not that a recession is certified.',
    pair5: 'PCE and core CPI weight housing and healthcare differently than headline CPI, and PCE lets consumers substitute cheaper goods. That\'s why the Fed\'s number can read cool while your cart reads hot — both are measuring real things; they\'re measuring different baskets.',
    pair6: 'Payrolls count jobs; unemployment counts people looking for work. They come from different surveys and can diverge for months — usually because the labor force grew faster than hiring. Neither is lying; they\'re answering different questions.',
    pair7: 'Real GDP already strips out inflation, so 2% real growth means the economy produced 2% more stuff — but GDP counts corporate profits, investment, and government spending alongside your paycheck, and it\'s deflated by a different price index than the CPI on your groceries. Growth and your lived experience can move in opposite directions for years, because they were never the same thing.',
    pair8: 'The 2-year yield is the market\'s vote on where the Fed Funds rate is headed. When it sits well below the Funds rate, traders are pricing in cuts; well above, they expect hikes or stubborn inflation.',
    pair9: 'A 7% mortgage with 3% inflation costs about 4% in real terms. Nominal rates tell you the payment; the real rate tells you the burden — and it hides in plain sight because nobody quotes it. That\'s the backward-looking real rate — against inflation that already happened, not the next 30 years\'.'
  };

  /* ---------- Shared CSS ---------- */
  var CSS = [
    '.pf-fred-stale{display:inline-block;background:#3a2a00;color:#f5c518;font-weight:700;font-size:11px;letter-spacing:0.5px;padding:4px 8px;border-radius:4px;margin:4px 4px 4px 0;min-height:24px;line-height:1.6}',
    '.pf-fred-rev{color:#f5c518;font-size:0.7em}',
    '.pf-fred-sansa{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-fred-cite{font-size:10px;color:#8a8271;letter-spacing:0.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:6px;line-height:1.5}',
    '.pf-fred-spark{display:block;width:100%;height:auto;min-height:48px;margin:6px 0}',
    '.pf-fred-nospark{color:#3a3a3a;font-size:20px;text-align:center;padding:12px 0}',
    '.pf-fred-axisbadge{display:inline-block;font-size:9px;color:#8a8271;border:1px solid #3a3a3a;border-radius:3px;padding:1px 5px;letter-spacing:0.5px}',
    '.pf-fred-sheetwrap{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:flex-end;justify-content:center}',
    '.pf-fred-sheet{background:#111;border-top:3px solid #c1121f;border-radius:12px 12px 0 0;padding:14px 18px 24px;width:100%;max-width:480px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-fred-sheetgrab{width:48px;height:5px;border-radius:3px;background:#3a3a3a;margin:0 auto 12px}',
    '.pf-fred-sheett{font-weight:900;font-size:16px;letter-spacing:1px;color:#e8b923;margin-bottom:6px}',
    '.pf-fred-sheetv{font-weight:900;font-size:30px;margin:4px 0}',
    '.pf-fred-sheetv span{font-size:13px;color:#c9bfa8;font-weight:400}',
    '.pf-fred-sheetp{font-size:13px;color:#c9bfa8;margin-bottom:8px}',
    '.pf-fred-sheetc{font-size:11px;color:#8a8271;line-height:1.6;margin-bottom:8px}',
    '.pf-fred-sheetstale{font-size:12px;color:#f5c518;margin-bottom:8px}',
    '.pf-fred-sheetlink{display:inline-block;min-height:44px;line-height:44px;color:#e8b923;font-weight:700;font-size:14px;letter-spacing:1px;margin-right:12px}',
    '.pf-fred-sheetx{display:inline-block;min-height:44px;min-width:44px;padding:0 20px;background:#2a2a2a;color:#f5ead6;border:0;border-radius:6px;font-weight:700;font-size:14px}',
    '.pf-fred-tap{min-height:44px;cursor:pointer}',
    '.pf-fred-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center;color:#c9bfa8;font-family:Arial,sans-serif}',
    '.pf-fred-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-fred-empty p{font-size:14px;margin:0;line-height:1.5}'
  ].join('\n');

  /* Fetch scope=full&spark=1 once and cache for the page (all surfaces
     share one request). */
  var fullCache = null, fullWaiters = [];
  function full(cb) {
    if (fullCache) { cb(fullCache); return; }
    fullWaiters.push(cb);
    if (fullWaiters.length > 1) return;
    api('fred_macro', { scope: 'full', spark: 1 }, function (j) {
      fullCache = j || null;
      var w = fullWaiters; fullWaiters = [];
      for (var i = 0; i < w.length; i++) { try { w[i](fullCache); } catch (e) {} }
    });
  }
  function cardFor(j, sid) {
    var s = (j && Array.isArray(j.series)) ? j.series : [];
    for (var i = 0; i < s.length; i++) if (s[i] && s[i].series_id === sid) return s[i];
    return null;
  }

  try {
    window.PFFred = {
      api: api, full: full, cardFor: cardFor,
      citation: citation, staleBadge: staleBadge, revMark: revMark,
      saNsa: saNsa, cesLabel: cesLabel,
      sparkline: sparkline, tapSheet: tapSheet, cssOnce: cssOnce,
      fmtPeriod: fmtPeriod, fmtRetrieved: fmtRetrieved,
      READS: READS, AGENCY: AGENCY, PLAIN: PLAIN, FREQ: FREQ, SA_NSA: SA_NSA,
      esc: esc
    };
  } catch (e) {}
})();
