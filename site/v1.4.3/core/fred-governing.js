/* core/fred-governing.js  |  PF v1.4.3 | FOLLOW THE MONEY — THE ECONOMY THEY'RE GOVERNING.
   The policy strip for Political HQ's Follow the Money tab: FEDFUNDS,
   MORTGAGE30US, CPIAUCNS, CES0500000003, PAYEMS, GDP, UNRATE.
   Framing: policy transmission (Fed rate → mortgage), the real-wage read,
   labor-market health vs the narrative. Weekly cadence — the strip carries
   a Monday refresh note and sits still otherwise.

   Binding honesty:
   - Every figure: 4-fact citation. Stale figures render with the badge.
   - Mortgage is a borrowing cost — NEVER presented as rent.
   - CES0500000003: "average" adjacent; no second-person "your paycheck/raise".
   - GDP is real (inflation-adjusted) — the word "real" stays adjacent.
   - Honest reads: News Desk Pairs 1 (wages vs prices — Phase 3 re-points
     the pair to the MEDIAN series LES1252881600Q; the CES-average-based
     read is retired, not edited), 2 (Fed → mortgage),
     6 (payrolls vs unemployment, neutralized), 7 (real GDP).
   - No predictions, no financial advice. Public identity MTCSTW only.
   Read-only, zero XP. Mounts via money-page SECTIONS ('governing').
   KILL: ?pf_off=money-governing (master: ?pf_off=money). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money') || PF.skip('money-governing')) { return; }
  if (window.pfGoverningDone) return;
  window.pfGoverningDone = true;

  var ORDER = ['FEDFUNDS', 'MORTGAGE30US', 'CPIAUCNS', 'CES0500000003', 'PAYEMS', 'UNRATE', 'GDP'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CSS = [
    '.pf-gov{max-width:1100px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-gov-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-gov-title{font-weight:900;font-size:20px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-gov-note{font-size:12px;color:#8a8271;text-align:center;letter-spacing:1px;margin:0 0 12px}',
    '.pf-gov-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:12px}',
    '@media (max-width:900px){.pf-gov-grid{grid-template-columns:repeat(4,1fr)}}',
    '@media (max-width:640px){.pf-gov-grid{grid-template-columns:repeat(2,1fr)}}',
    '.pf-gov-card{border:1px solid #2a2a2a;border-top:4px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:10px;color:#f5ead6;min-height:44px;cursor:pointer}',
    '.pf-gov-t{font-weight:900;font-size:10px;letter-spacing:1px;color:#e8b923;margin-bottom:6px}',
    '.pf-gov-v{font-weight:900;font-size:20px;margin:2px 0}',
    '.pf-gov-p{font-size:11px;color:#c9bfa8;margin-bottom:4px}',
    '.pf-gov-reads{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}',
    '@media (max-width:640px){.pf-gov-reads{grid-template-columns:1fr}}',
    '.pf-gov-read{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:12px}',
    '.pf-gov-read h5{font-weight:900;font-size:12px;letter-spacing:2px;color:#e8b923;margin:0 0 8px}',
    '.pf-gov-read p{font-size:13px;line-height:1.6;color:#f5ead6;margin:0}',
    '.pf-gov-read .pf-gov-pair{font-size:10px;color:#8a8271;letter-spacing:1px;margin-top:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-gov-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-gov-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Monday-of-this-week label for the weekly refresh note. */
  function mondayLabel() {
    try {
      var d = new Date();
      var dow = (d.getDay() + 6) % 7; /* Monday=0 */
      d.setDate(d.getDate() - dow);
      var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return MO[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) { return ''; }
  }

  function cardHtml(F, s) {
    var sid = s.series_id || '';
    var title = esc(s.title || F.PLAIN[sid] || sid);
    var unitLine = esc(s.unit_label || '');
    if (sid === 'CES0500000003' && unitLine.toLowerCase().indexOf('average') === -1) {
      unitLine = 'average ' + unitLine;
    }
    if (sid === 'GDP' && unitLine.toLowerCase().indexOf('real') === -1) {
      unitLine = 'real ' + unitLine;
    }
    return '<div class="pf-gov-card pf-fred-tap" data-sid="' + esc(sid) + '" role="button" tabindex="0">' +
      '<div class="pf-gov-t">' + title + ' ' + F.saNsa(s) + '</div>' +
      '<div class="pf-gov-v">' + esc(s.value_label != null ? s.value_label : '—') + F.revMark(s) + '</div>' +
      (unitLine ? '<div class="pf-gov-p">' + unitLine + '</div>' : '') +
      '<div class="pf-gov-p">' + esc(F.fmtPeriod(s)) + '</div>' +
      '<div>' + F.staleBadge(s) + '</div>' +
      '<div class="pf-fred-cite">' + esc(F.citation(s)) + '</div></div>';
  }

  /* Framing reads — parameterized with live figures where the backend
     supplies them; the template sentences are the remediated News Desk
     honest reads (Pairs 1/2/6/7). Past/present tense only. */
  function readsHtml(F, cards) {
    function get(sid) { return F.cardFor({ series: cards }, sid); }
    var fed = get('FEDFUNDS'), mort = get('MORTGAGE30US');
    var cpi = get('CPIAUCNS'), med = get('LES1252881600Q');
    var pay = get('PAYEMS'), unr = get('UNRATE'), gdp = get('GDP');
    var out = '';

    /* Policy transmission: Fed rate → mortgage. */
    var trans = F.READS.pair2;
    if (fed && mort && fed.value_label && mort.value_label) {
      trans = 'The Fed sets ' + fed.value_label + '; lenders charge ' + mort.value_label +
        ' for a 30-year mortgage. The gap is where banks and bond markets insert themselves between policy and the mortgage.';
    }
    out += '<div class="pf-gov-read"><h5>POLICY → YOUR BORROWING COST</h5><p>' + esc(trans) +
      ' A mortgage is a borrowing cost — it is not rent.</p>' +
      '<div class="pf-gov-pair">FEDFUNDS → MORTGAGE30US · each figure cited on its card</div></div>';

    /* Real-wage read: MEDIAN earnings vs CPI, YoY vs YoY (Phase 3 —
       the CES-average-based read is retired, not edited; the retired copy
       is tombstoned in F.READS, never rendered). */
    var wage = F.READS.pair1;
    if (med && cpi) {
      var mw = med.change_pct_label || med.change_label || '';
      var cp = cpi.change_pct_label || cpi.change_label || '';
      if (mw && cp) {
        wage = 'Median usual weekly earnings are ' + (med.value_label || '') +
          ' (1982\u201384 dollars) \u2014 ' + mw.replace('+', '') +
          ' in real terms over the year. Consumer prices are up ' +
          cp.replace('+', '') + ' over the year. The median is the typical ' +
          'worker\u2019s paycheck, not an average: executive raises pull the ' +
          'average up and leave this untouched.';
      }
    }
    out += '<div class="pf-gov-read"><h5>THE REAL-WAGE READ</h5><p>' + esc(wage) + '</p>' +
      '<div class="pf-gov-pair">LES1252881600Q (MEDIAN) vs CPIAUCNS \u00b7 YoY vs YoY \u00b7 quarterly vs monthly \u00b7 SA vs NSA labeled on cards</div></div>';

    /* Labor health: payrolls vs unemployment. */
    var labor = F.READS.pair6;
    if (pay && unr && pay.change_label && unr.value_label) {
      labor = 'Payrolls ' + pay.change_label + ' while unemployment sits at ' + unr.value_label +
        '. Payrolls count jobs; unemployment counts people looking for work. They come from different surveys and can diverge for months — usually because the labor force grew faster than hiring. Neither is lying; they\'re answering different questions.';
    }
    out += '<div class="pf-gov-read"><h5>LABOR: HEALTH VS NARRATIVE</h5><p>' + esc(labor) + '</p>' +
      '<div class="pf-gov-pair">PAYEMS vs UNRATE · both SA, both BLS</div></div>';

    /* GDP: what growth means and doesn't. */
    out += '<div class="pf-gov-read"><h5>THE HEADLINE THEY QUOTE</h5><p>' + esc(F.READS.pair7) + '</p>' +
      '<div class="pf-gov-pair">GDP (REAL, chained 2017$) vs CPIAUCNS</div></div>';

    return '<div class="pf-gov-reads">' + out + '</div>';
  }

  function render(container, j) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var cards = ORDER.map(function (id) { return byId[id]; }).filter(Boolean);
    var inner;
    if (!live || !cards.length) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The governing strip appears when the official feed connects. Nothing here is estimated.') + '</p></div>';
    } else {
      inner = '<div class="pf-gov-grid">' +
        cards.map(function (s) { return cardHtml(F, s); }).join('') + '</div>' +
        readsHtml(F, cards);
    }
    container.innerHTML = '<div class="pf-gov">' +
      '<div class="pf-gov-kicker">FOLLOW THE MONEY</div>' +
      '<h4 class="pf-gov-title">THE ECONOMY THEY\u2019RE GOVERNING</h4>' +
      '<p class="pf-gov-note">WEEKLY READ · REFRESHED MONDAY' +
      (mondayLabel() ? ' · WEEK OF ' + esc(mondayLabel().toUpperCase()) : '') + '</p>' +
      inner + '</div>';
    /* Tap → bottom sheet. */
    try {
      var els = container.querySelectorAll('.pf-gov-card');
      for (var i = 0; i < els.length; i++) {
        (function (el) {
          var sid = el.getAttribute('data-sid');
          function open() { var c = byId[sid]; if (c) F.tapSheet(c); }
          el.addEventListener('click', open);
          el.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
          });
        })(els[i]);
      }
    } catch (e) {}
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-gov')) return true;
    } catch (e) {}
    var F = window.PFFred;
    if (!F) return true;
    F.full(function (j) {
      try { render(container, (j && j.ok) ? j : null); }
      catch (e) { try { render(container, null); } catch (e2) {} }
    });
    return true;
  }

  try { window.PFGoverning = { mount: mount }; } catch (e) {}
})();
