/* games/fred-macro-rail.js  |  PF v1.4.3 | ECONOMY PAGE — MACRO CONTEXT RAIL.
   The official-data rail beside the People's Price Index: the three official
   inflation reads as a family (CPIAUCNS + CPILFESL + PCEPI), average hourly
   earnings (CES0500000003, labeled "average"), and the cost of money
   (MORTGAGE30US + FEDFUNDS). Mounts right after #pf-inflation-trends.

   Binding honesty (News Desk §1(c)):
   - The People's Price Index and official CPI sit side by side, NEVER merged
     into one number. The methodological-difference caption is mandatory and
     always visible: crowdsourced basket vs BLS fixed basket.
   - The three inflation reads render AS A FAMILY so no one can cherry-pick one.
   - Each leg carries its SA/NSA label inline (Prohibition 2).
   - Every figure: 4-fact citation. Stale figures render with the badge.
   - CES0500000003: "average" adjacent; no second-person "your paycheck/raise".
   - Mortgage is a borrowing cost — never presented as rent.
   - Monthly cadence: this rail moves on CPI release day and sits still
     otherwise. The header carries the vintage month.
   Read-only, zero XP. No predictions, no financial advice.
   KILL: ?pf_off=economy-fred-rail (master: ?pf_off=economy-fred). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('economy-fred') || PF.skip('economy-fred-rail')) { return; }
  if (window.pfMacroRailDone) return;
  window.pfMacroRailDone = true;

  var ORDER = ['CPIAUCNS', 'CPILFESL', 'PCEPI', 'CES0500000003', 'MORTGAGE30US', 'FEDFUNDS'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CSS = [
    '.pf-mrail{max-width:1100px;margin:18px auto;padding:0 4px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-mrail-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-mrail-title{font-weight:900;font-size:20px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-mrail-note{font-size:12px;color:#8a8271;text-align:center;letter-spacing:1px;margin:0 0 12px}',
    '.pf-mrail-fam{border:1px solid #2a2a2a;border-radius:10px;background:#0d0d0d;padding:12px;margin-bottom:10px}',
    '.pf-mrail-famhead{font-weight:900;font-size:12px;letter-spacing:2px;color:#e8b923;margin-bottom:10px;text-align:center}',
    '.pf-mrail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
    '@media (max-width:640px){.pf-mrail-grid{grid-template-columns:1fr}}',
    '.pf-mrail-grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-mrail-grid2{grid-template-columns:1fr}}',
    '.pf-mrail-card{border:1px solid #2a2a2a;border-radius:8px;background:#111;padding:12px;min-height:44px;cursor:pointer}',
    '.pf-mrail-t{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923;margin-bottom:6px}',
    '.pf-mrail-v{font-weight:900;font-size:22px;margin:2px 0}',
    '.pf-mrail-u{font-size:11px;color:#c9bfa8;margin-bottom:4px}',
    '.pf-mrail-p{font-size:11px;color:#c9bfa8;margin-bottom:4px}',
    '.pf-mrail-method{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;font-size:13px;line-height:1.6;color:#f5ead6;margin:12px 0}',
    '.pf-mrail-method b{color:#f5c518;letter-spacing:1px}',
    '.pf-mrail-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mrail-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mrail-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function cardHtml(F, s) {
    var sid = s.series_id || '';
    var title = esc(s.title || F.PLAIN[sid] || sid);
    var unitLine = esc(s.unit_label || '');
    if (sid === 'CES0500000003' && unitLine.toLowerCase().indexOf('average') === -1) {
      unitLine = 'average ' + unitLine;
    }
    var change = s.change_basis === 'yoy'
      ? (s.change_pct_label || s.change_label)
      : (s.change_label || s.change_pct_label);
    return '<div class="pf-mrail-card pf-fred-tap" data-sid="' + esc(sid) + '" role="button" tabindex="0">' +
      '<div class="pf-mrail-t">' + title + ' ' + F.saNsa(s) + '</div>' +
      '<div class="pf-mrail-v">' + esc(s.value_label != null ? s.value_label : '—') + F.revMark(s) + '</div>' +
      (unitLine ? '<div class="pf-mrail-u">' + unitLine + '</div>' : '') +
      '<div class="pf-mrail-p">' + esc(F.fmtPeriod(s)) + '</div>' +
      (change ? '<div class="pf-mrail-u"><b>' + esc(change) + '</b></div>' : '') +
      '<div>' + F.staleBadge(s) + '</div>' +
      '<div class="pf-fred-cite">' + esc(F.citation(s)) + '</div></div>';
  }

  function render(host, j) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var fam = ['CPIAUCNS', 'CPILFESL', 'PCEPI'].map(function (id) { return byId[id]; }).filter(Boolean);
    var rest = ['CES0500000003', 'MORTGAGE30US', 'FEDFUNDS'].map(function (id) { return byId[id]; }).filter(Boolean);

    var inner;
    if (!live || (!fam.length && !rest.length)) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The official macro rail appears when the feed connects. Nothing here is estimated.') + '</p></div>';
    } else {
      inner =
        '<div class="pf-mrail-fam"><div class="pf-mrail-famhead">THE THREE OFFICIAL INFLATION READS — ONE FAMILY, NO CHERRY-PICKING</div>' +
        '<div class="pf-mrail-grid">' + fam.map(function (s) { return cardHtml(F, s); }).join('') + '</div></div>' +
        '<div class="pf-mrail-grid2">' + rest.map(function (s) { return cardHtml(F, s); }).join('') + '</div>' +
        '<div class="pf-mrail-method"><b>WHY THEY\u2019RE DIFFERENT:</b> ' +
        'The official number is a national average built from thousands of surveyed prices (BLS fixed basket). ' +
        'The People\u2019s Price Index above is what real people in this movement actually paid ' +
        '(crowdsourced basket). Different methods, different stories — both worth seeing. ' +
        'They are shown side by side and never merged into one number.</div>';
    }
    var el = document.createElement('div');
    el.className = 'pf-mrail';
    el.innerHTML =
      '<div class="pf-mrail-kicker">OFFICIAL CONTEXT</div>' +
      '<h4 class="pf-mrail-title">THE MACRO BEHIND THE PRICES</h4>' +
      '<p class="pf-mrail-note">MONTHLY CADENCE · MOVES ON CPI RELEASE DAY</p>' +
      inner +
      '<div class="pf-mrail-foot">OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA</div>';

    var anchor = document.getElementById('pf-inflation-trends');
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else anchor.parentNode.appendChild(el);
    } else if (host) {
      host.appendChild(el);
    }
    /* Tap → bottom sheet. */
    try {
      var cards = el.querySelectorAll('.pf-mrail-card');
      for (var i = 0; i < cards.length; i++) {
        (function (cd) {
          var sid = cd.getAttribute('data-sid');
          function open() { var c = byId[sid]; if (c) F.tapSheet(c); }
          cd.addEventListener('click', open);
          cd.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
          });
        })(cards[i]);
      }
    } catch (e) {}
  }

  function boot() {
    var F = window.PFFred;
    if (!F) return;
    /* Only on /economy (the trends anchor exists there). */
    var anchor = document.getElementById('pf-inflation-trends');
    if (!anchor) return;
    F.full(function (j) {
      try { render(null, (j && j.ok) ? j : null); }
      catch (e) {}
    });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) {}
})();
