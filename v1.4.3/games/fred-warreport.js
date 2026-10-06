/* games/fred-warreport.js  |  PF v1.4.3 | WAR REPORT — THE WEEK IN NUMBERS.
   The weekly macro backdrop: max 7 series (UNRATE + Sahm, DGS10, DGS2,
   CPIAUCNS, LES1252881600Q, MORTGAGE30US, FEDFUNDS), one honest sentence
   each. Plus the week's curated matchup, rotated across departments.

   Rotation (CEO decision 3): pickForWeek(date) -> { department, matchup }.
   Departments: News Desk, Economy Desk, Psych, Propaganda Studio, PR,
   Brand Consistency, Docs & Comms. The 6 vetted matchups come from the
   design brief's suggested-matchups list. The weekly/editorial pick rotates
   across favorable, unfavorable, and neutral reads — no more than two
   consecutive curated matchups may frame the same directional grievance.

   Binding honesty:
   - Every figure: 4-fact citation. Stale figures render with the badge and
     the one-line note ("carrying last week's print") — never silently
     presented as current, never dropped without the note.
   - Sahm: coincident-only framing within one viewport (Prohibition 5),
     with the 2024 false-trigger note.
   - LES1252881600Q: median, inflation-adjusted — "the typical worker's
     paycheck" framing; no second-person "your paycheck/raise".
   - No predictions. Email wiring stays parked (Resend).
   Renderable module: window.PFWarNumbers.mount(container). war-report.js
   paint() hooks a slot with a double-mount guard.
   Read-only, zero XP. KILL: ?pf_off=war-numbers. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('war-numbers')) { return; }
  if (window.pfWarNumbersDone) return;
  window.pfWarNumbersDone = true;

  var ORDER = ['UNRATE', 'DGS10', 'DGS2', 'CPIAUCNS', 'LES1252881600Q', 'MORTGAGE30US', 'FEDFUNDS'];

  var DEPARTMENTS = ['News Desk', 'Economy Desk', 'Psych', 'Propaganda Studio', 'PR', 'Brand Consistency', 'Docs & Comms'];

  /* The 6 vetted matchups (design brief Tool 1 suggested matchups).
     Phase 3 (2026-10-06): wages-inflation re-points to the median series
     (LES1252881600Q) — the CES-average-based matchup is retired. */
  var MATCHUPS = [
    { id: 'wages-inflation', a: 'LES1252881600Q', b: 'CPIAUCNS', hook: 'Is the typical paycheck beating prices?' },
    { id: 'mortgage-fed', a: 'MORTGAGE30US', b: 'FEDFUNDS', hook: 'Who moved first?' },
    { id: 'jobs-unemployment', a: 'PAYEMS', b: 'UNRATE', hook: 'Hiring up, jobless up — how?' },
    { id: 'yield-curve', a: 'DGS10', b: 'DGS2', hook: "The market's fear gauge" },
    { id: 'inflation-gauges', a: 'CPIAUCNS', b: 'PCEPI', hook: "Headline vs the Fed's favorite" },
    { id: 'core-headline', a: 'CPILFESL', b: 'CPIAUCNS', hook: "What's really cooking underneath" }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Week number since a fixed epoch (Mon 2026-01-05). Deterministic across
     renders within the week. */
  function weekIndex(date) {
    try {
      var d = date ? new Date(date) : new Date();
      var epoch = Date.UTC(2026, 0, 5);
      var dow = (d.getUTCDay() + 6) % 7;
      var monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
      return Math.max(0, Math.floor((monday - epoch) / (7 * 24 * 3600 * 1000)));
    } catch (e) { return 0; }
  }
  function pickForWeek(date) {
    var w = weekIndex(date);
    return {
      week: w,
      department: DEPARTMENTS[w % DEPARTMENTS.length],
      matchup: MATCHUPS[w % MATCHUPS.length]
    };
  }

  var CSS = [
    '.pf-wrnum{color:#f5ead6;font-family:Arial,sans-serif;margin:14px 0}',
    '.pf-wrnum-kicker{font-weight:700;font-size:12px;letter-spacing:4px;color:#e8b923;margin-bottom:6px}',
    '.pf-wrnum-title{font-weight:900;font-size:18px;letter-spacing:1px;margin:0 0 10px}',
    '.pf-wrnum-line{border-top:1px solid #2a2a2a;padding:10px 0;min-height:44px}',
    '.pf-wrnum-fig{font-weight:900;font-size:15px;color:#f5ead6}',
    '.pf-wrnum-sent{font-size:13px;line-height:1.6;color:#e8dcc3;margin-top:4px}',
    '.pf-wrnum-match{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;margin:12px 0}',
    '.pf-wrnum-match h5{font-weight:900;font-size:12px;letter-spacing:2px;color:#f5c518;margin:0 0 6px}',
    '.pf-wrnum-match p{font-size:13px;line-height:1.6;margin:0 0 6px}',
    '.pf-wrnum-dept{font-size:10px;color:#8a8271;letter-spacing:1px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-wrnum-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-wrnum-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* One honest sentence per series. Figures cited; stale legs carry the
     badge + the one-line note. Past/present tense only. */
  function sentence(F, c, sahm) {
    var sid = c.series_id;
    var v = c.value_label != null ? c.value_label : '—';
    var per = F.fmtPeriod(c);
    var cite = F.citation(c);
    var staleNote = c.stale ? ' (carrying the last good print — ' + esc(c.stale_note || 'refresh pending') + ')' : '';
    function wrap(sent) {
      return '<div class="pf-wrnum-line"><div class="pf-wrnum-fig">' + esc(v) + F.revMark(c) +
        ' <span style="font-size:11px;color:#8a8271;font-weight:400">' + esc(F.PLAIN[sid] || sid) + F.saNsa(c) + '</span> ' +
        F.staleBadge(c) + '</div>' +
        '<div class="pf-wrnum-sent">' + sent + staleNote + '</div>' +
        '<div class="pf-fred-cite">' + esc(cite) + '</div></div>';
    }
    switch (sid) {
      case 'UNRATE': {
        var s = 'Unemployment is ' + v + ' (' + per + ').';
        if (sahm && sahm.current) {
          var spp = sahm.current.sahm_pp;
          var sppl = (typeof spp === 'number') ? spp.toFixed(2) + 'pp' : String(spp);
          s += ' The Sahm rule reads ' + sppl +
            (sahm.current.triggered ? ' — TRIGGERED' : ' — not triggered') +
            '. Coincident, not predictive: it flags conditions that look recessionary, and it can trigger without a recession, as it did in 2024.';
        }
        return wrap(esc(s));
      }
      case 'DGS10':
        return wrap(esc('The 10-year Treasury yields ' + v + ' (' + per + ') — the market\'s long-run read on growth and inflation.'));
      case 'DGS2':
        return wrap(esc('The 2-year Treasury yields ' + v + ' (' + per + ') — the market\'s vote on where the Fed funds rate is headed.'));
      case 'CPIAUCNS': {
        var ch = c.change_pct_label || c.change_label || '';
        return wrap(esc('Consumer prices ' + (ch ? 'are ' + ch + ' over the year' : 'sit at ' + v) + ' (' + per + ', CPI-U, NSA).'));
      }
      case 'LES1252881600Q': {
        /* Gate fix (2026-10-05): the paycheck line is the MEDIAN series —
           the CES-average-based line is retired. Median-grounded copy. */
        var cw = c.change_pct_label || c.change_label || '';
        var s = cw
          ? 'Median usual weekly real earnings ran ' + cw + ' to ' + per
          : 'Median usual weekly real earnings sit at ' + v + ' (' + per + ')';
        return wrap(esc(s + ' — the typical worker\u2019s paycheck, inflation-adjusted (1982\u201384 dollars).'));
      }
      case 'MORTGAGE30US':
        return wrap(esc('The 30-year fixed mortgage averages ' + v + ' (' + per + ') — a borrowing cost, not rent.'));
      case 'FEDFUNDS':
        return wrap(esc('The effective Fed funds rate is ' + v + ' (' + per + ') — the rate the Fed actually sets.'));
      default:
        return wrap(esc((F.PLAIN[sid] || sid) + ': ' + v + ' (' + per + ').'));
    }
  }

  function matchupHtml(F, pick, cards) {
    var m = pick.matchup;
    var ca = F.cardFor({ series: cards }, m.a);
    var cb = F.cardFor({ series: cards }, m.b);
    var line = esc(m.hook);
    if (ca && cb) {
      line += ' ' + esc((F.PLAIN[m.a] || m.a) + ' vs ' + (F.PLAIN[m.b] || m.b) + '.');
    }
    return '<div class="pf-wrnum-match"><h5>THIS WEEK\u2019S STACK</h5><p>' + line + '</p>' +
      '<div class="pf-wrnum-dept">CURATED BY THE ' + esc(pick.department.toUpperCase()) +
      ' · ROTATES WEEKLY · EMAIL WIRING PARKED</div></div>';
  }

  function render(container, j, sahmJ) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var cards = ORDER.map(function (id) { return byId[id]; }).filter(Boolean);
    var pick = pickForWeek();
    var sahm = null;
    try {
      if (sahmJ && sahmJ.ok) sahm = sahmJ;
    } catch (e) {}

    var inner;
    if (!live || !cards.length) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The week in numbers appears when the official feed connects.') + '</p></div>';
    } else {
      inner = cards.map(function (c) { return sentence(F, c, c.series_id === 'UNRATE' ? sahm : null); }).join('') +
        matchupHtml(F, pick, cards);
    }
    container.innerHTML = '<div class="pf-wrnum">' +
      '<div class="pf-wrnum-kicker">WAR REPORT</div>' +
      '<h4 class="pf-wrnum-title">THE WEEK IN NUMBERS</h4>' + inner + '</div>';
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-wrnum')) return true; /* double-mount guard */
    } catch (e) {}
    var F = window.PFFred;
    if (!F) return true;
    F.full(function (j) {
      F.api('fred_sahm', {}, function (sj) {
        try { render(container, (j && j.ok) ? j : null, sj); }
        catch (e) {}
      });
    });
    return true;
  }

  try { window.PFWarNumbers = { mount: mount, pickForWeek: pickForWeek }; } catch (e) {}
})();
