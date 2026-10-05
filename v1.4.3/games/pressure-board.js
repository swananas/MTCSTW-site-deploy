/* games/pressure-board.js  |  PF v1.4.3 | A2 CIVIC PRESSURE INDEX — PRESSURE BOARD.
   Public READ-ONLY surface inside Political HQ: weekly per-rep pressure
   ranking + per-state pressure table, fed by backend ?action=pressure_board
   (GET, JSONP); methodology footer rendered from ?action=pressure_method
   (GET, JSONP) at runtime — never hardcoded.
   Gold contract (Psych + Security reviewed):
     pressure_board -> {ok, week, by_rep:[{rep_key, display, calls, sigs, pressure, n}],
                        by_state:[{state, calls, pledges}], suppressed_count}
     pressure = calls + sigs; n = distinct contributors behind the row.
     display is the title-cased, sanitized rep label — may be null, which we
     render as "Unlabeled rep". alert_driven is deliberately OMITTED from gold
     (no honest data source yet) — never displayed, never a zero.
     Rows with n < 10 are suppressed server-side; suppressed_count tells how
     many cells were held back.
   Suppressed/low-data cells render "not enough reports yet" — never a number,
   never a zero that pretends there's no pressure.
   FIXTURE (below): clearly-marked stand-in while be/pressure-index is
   undeployed. Live-first: the real board renders when the endpoint returns a
   valid board AND valid methodology text; the fixture renders ONLY behind an
   unmissable DEMO banner. ?pf_demo=pressure forces fixture mode (QC aid).
   READ-ONLY: zero XP, zero writes, zero POSTs.
   KILL: ?pf_off=pressure (contract) or ?pf_off=pressure-board (convention). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (PF.skip('pressure') || PF.skip('pressure-board')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-pressure-board">
<div class="fe-block pf-override-block pf-silo" id="pf-pressure-board">
<h2>The Pressure Board</h2>
<div class="c-tag">Who&rsquo;s catching heat this week &mdash; and who&rsquo;s skating free. Every call and signature the movement logged, counted every Monday.</div>
<div class="c-note">Your activity powers the movement&rsquo;s intelligence.</div>
<div id="xPressureBoard"><div class="c-load">Tallying the heat&hellip;</div></div>
</div>
<script>
(function () {
'use strict';
var host = document.getElementById('xPressureBoard');
if (!host) return;
var BACKEND = window.PF_BACKEND_URL;
var K_MIN = 10;
var UNLABELED = 'Unlabeled rep';

/* ===== FIXTURE — clearly-marked stand-in. be/pressure-index not yet live.
   Every value below is invented for shape-testing only and renders ONLY
   behind the DEMO banner. Rep names are obviously fake on purpose. ===== */
var FIXTURE_BOARD = {
  ok: true,
  week: 'Sep 28 \u2013 Oct 4, 2026',
  by_rep: [
    { rep_key: 'demo-rep-1', display: 'Sen. Demo Hawthorne', calls: 214, sigs: 96, pressure: 310, n: 58 },
    { rep_key: 'demo-rep-2', display: 'Rep. Sample Okafor', calls: 187, sigs: 61, pressure: 248, n: 44 },
    { rep_key: 'demo-rep-3', display: null, calls: 150, sigs: 40, pressure: 190, n: 31 },
    { rep_key: 'demo-rep-4', display: 'Sen. Placeholder Vance', calls: 98, sigs: 22, pressure: 120, n: 17 }
  ],
  by_state: [
    { state: 'LA', calls: 412, pledges: 88 },
    { state: 'TX', calls: 388, pledges: 71 },
    { state: 'FL', calls: 201, pledges: 44 }
  ],
  suppressed_count: 9
};
/* FIXTURE methodology — approximates the real pressure_method copy (the five
   key lines it must carry are below). Renders ONLY in demo mode. */
var FIXTURE_METHOD =
  'The Pressure Board tallies anonymized rep contacts logged in the Action Center (calls), ' +
  'petition signatures from the past 7 days, refreshed every Monday. ' +
  'Pressure = calls + signatures. n = the distinct voices behind each row.\n\n' +
  'Calls from members who haven\'t pledged a state count toward rep totals, not state totals. ' +
  'If your state\'s numbers look light, pledge your state in the Action Center and they land in ' +
  'the right column next week.\n\n' +
  'Rep labels are community-typed, so a label can be wrong while the count behind it is right ' +
  '\u2014 labels get scrubbed every cycle. Rows with fewer than 10 distinct voices (k\u226510) never ' +
  'make the board; they show as \u2018not enough reports yet\u2019 \u2014 never a number, never a zero ' +
  'that pretends there\u2019s no pressure.\n\n' +
  'Your activity powers the movement\u2019s intelligence. Delete your data any time \u2014 it removes ' +
  'your personal records. Weekly numbers are recomputed daily, so recent weeks stop reflecting ' +
  'deleted activity within one refresh cycle; older published weekly aggregates keep their ' +
  'historical counts \u2014 they\u2019re anonymous and can\u2019t be un-counted.\n\n' +
  'These numbers are community-reported and unofficial \u2014 our count of the movement\u2019s heat, ' +
  'not an official record.';

function esc(s) {
  /* quote-free escaper: split/join keeps static regex-literal checks honest */
  return String(s == null ? '' : s)
    .split('&').join('&amp;').split('<').join('&lt;')
    .split('>').join('&gt;').split('"').join('&quot;');
}
function fmt(n) {
  n = Math.round(Number(n) || 0);
  try { return n.toLocaleString('en-US'); } catch (e) { return String(n); }
}
function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

function isValidBoard(j) {
  return !!(j && j.ok === true && Array.isArray(j.by_rep) && Array.isArray(j.by_state));
}
function methodText(j) {
  if (!j || j.ok !== true) return null;
  var t = j.text != null ? j.text : (j.method != null ? j.method : j.copy);
  return (typeof t === 'string' && t.length) ? t : null;
}

function jsonp(action, cb) {
  if (!BACKEND) { cb(null); return; }
  var fn = 'pfPbCb' + Math.floor(Math.random() * 1e9);
  var s = document.createElement('script'), done = false;
  function finish(j) {
    if (done) return; done = true;
    try { delete window[fn]; } catch (e) {}
    if (s.parentNode) s.parentNode.removeChild(s);
    cb(j);
  }
  window[fn] = function (j) { finish(j); };
  s.onerror = function () { finish(null); };
  s.src = BACKEND + '?action=' + encodeURIComponent(action) + '&callback=' + fn;
  document.head.appendChild(s);
  setTimeout(function () { finish(null); }, 12000);
}

var TBL = 'width:100%;border-collapse:collapse;font:13px/1.45 Arial,sans-serif;margin:10px 0;';
var TH = 'text-align:left;padding:8px 10px;background:#220606;color:#ffb3ab;font-size:11px;letter-spacing:1px;border-bottom:2px solid #c1121f;';
var TD = 'padding:8px 10px;border-bottom:1px solid #3a1010;color:#f5f0e1;';
var TDN = TD + 'text-align:right;font-variant-numeric:tabular-nums;';

function repRows(board) {
  /* defensive: backend suppresses n<10 server-side, but never trust the wire —
     fold any straggler into suppressed, never render its numbers. */
  var kept = [], extra = 0, i, r;
  var rows = board.by_rep || [];
  for (i = 0; i < rows.length; i++) {
    r = rows[i] || {};
    if (num(r.n) < K_MIN) { extra++; continue; }
    kept.push(r);
  }
  kept.sort(function (a, b) { return num(b.pressure) - num(a.pressure); });
  return { kept: kept, extra: extra };
}

function renderBoard(h, board, methodTxt, isDemo) {
  var rr = repRows(board), kept = rr.kept, i, r;
  var states = Array.isArray(board.by_state) ? board.by_state.slice() : [];
  states.sort(function (a, b) { return num(b.calls) - num(a.calls); });
  var suppressed = num(board.suppressed_count) + rr.extra;
  var totalPressure = 0;
  for (i = 0; i < kept.length; i++) totalPressure += num(kept[i].pressure);

  var html = '';
  if (isDemo) {
    html += '<div class="c-box" style="border:2px dashed #ffb000;background:#241a05;color:#ffe1a8;margin:10px 0;">' +
      '<b>DEMO BOARD</b> \u2014 the pressure pipeline isn\u2019t live yet, so these numbers are ' +
      'placeholders showing the board\u2019s shape. Zero real calls behind them. The real weekly ' +
      'heat lands the moment the backend goes live.</div>';
  }

  var quiet = kept.length === 0 && states.length === 0;
  if (quiet && !isDemo) {
    html += '<div class="c-box">The board is quiet \u2014 not enough reports this week to name ' +
      'names. Log a call and put your rep on it.</div>';
  } else {
    if (kept.length) {
      var maxP = 0;
      for (i = 0; i < kept.length; i++) maxP = Math.max(maxP, num(kept[i].pressure));
      html += '<h3 style="color:#ffb3ab;margin:14px 0 4px;font:700 14px Arial;letter-spacing:1px;">REPS FEELING THE HEAT</h3>';
      html += '<div style="overflow-x:auto;"><table style="' + TBL + '" aria-label="Weekly rep pressure ranking">' +
        '<thead><tr><th scope="col" style="' + TH + '">#</th><th scope="col" style="' + TH + '">REP</th>' +
        '<th scope="col" style="' + TH + ';text-align:right">CALLS</th>' +
        '<th scope="col" style="' + TH + ';text-align:right">SIGS</th>' +
        '<th scope="col" style="' + TH + ';text-align:right">PRESSURE</th></tr></thead><tbody>';
      for (i = 0; i < kept.length; i++) {
        r = kept[i];
        var name = (r.display != null && String(r.display).trim() !== '') ? String(r.display) : UNLABELED;
        var w = maxP > 0 ? Math.max(4, Math.round(100 * num(r.pressure) / maxP)) : 4;
        html += '<tr><td style="' + TDN + '">' + (i + 1) + '</td>' +
          '<td style="' + TD + '"><b>' + esc(name) + '</b><br>' +
          '<span style="color:#ffb3ab;font-size:11px;">' + fmt(r.n) + ' voices</span>' +
          '<span style="display:block;height:4px;background:#3a1010;margin-top:4px;max-width:140px;">' +
          '<span style="display:block;height:4px;width:' + w + '%;background:#c1121f;"></span></span></td>' +
          '<td style="' + TDN + '">' + fmt(r.calls) + '</td>' +
          '<td style="' + TDN + '">' + fmt(r.sigs) + '</td>' +
          '<td style="' + TDN + '"><b style="color:#ffb3ab;">' + fmt(r.pressure) + '</b></td></tr>';
      }
      html += '</tbody></table></div>';
    }
    if (states.length) {
      html += '<h3 style="color:#ffb3ab;margin:14px 0 4px;font:700 14px Arial;letter-spacing:1px;">PRESSURE BY STATE</h3>';
      html += '<div style="overflow-x:auto;"><table style="' + TBL + '" aria-label="Weekly pressure by state">' +
        '<thead><tr><th scope="col" style="' + TH + '">STATE</th>' +
        '<th scope="col" style="' + TH + ';text-align:right">CALLS</th>' +
        '<th scope="col" style="' + TH + ';text-align:right">PLEDGES</th></tr></thead><tbody>';
      for (i = 0; i < states.length; i++) {
        var st = states[i] || {};
        html += '<tr><td style="' + TD + '"><b>' + esc(st.state) + '</b></td>' +
          '<td style="' + TDN + '">' + fmt(st.calls) + '</td>' +
          '<td style="' + TDN + '">' + fmt(st.pledges) + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }
    if (suppressed > 0) {
      html += '<div class="c-note" style="margin:8px 0;">' + fmt(suppressed) +
        ' more on the watchlist \u2014 not enough reports yet (fewer than 10 voices). ' +
        'We don\u2019t print guesses.</div>';
    }
  }

  html += '<div style="margin:12px 0;"><a class="c-btn" href="#pf-civic">LOG A CALL \u2014 ADD YOUR PRESSURE \u2192</a></div>';

  /* Methodology footer: body comes from pressure_method at runtime (or the
     fixture approximation in demo mode) — never hardcoded here. */
  var paras = String(methodTxt || '').split(/\n\s*\n/);
  var mHtml = '';
  for (i = 0; i < paras.length; i++) {
    if (paras[i].trim() !== '') mHtml += '<p style="margin:8px 0;">' + esc(paras[i]) + '</p>';
  }
  var weekLine = 'Week: ' + esc(board.week != null && String(board.week) !== '' ? String(board.week) : 'updating') +
    ' \u00b7 ' + fmt(totalPressure) + ' pressure actions counted' +
    ' \u00b7 ' + fmt(kept.length) + ' reps \u00b7 ' + fmt(states.length) + ' states' +
    ' \u00b7 ' + fmt(suppressed) + ' cells held back (k\u226510)' +
    (isDemo ? ' \u00b7 demo data' : '');
  html += '<details style="margin-top:12px;border-top:1px solid #3a1010;padding-top:8px;">' +
    '<summary style="cursor:pointer;color:#ffb3ab;font:700 12px Arial;letter-spacing:1px;">METHODOLOGY \u2014 HOW THIS BOARD WORKS</summary>' +
    '<div class="c-note" style="margin-top:6px;">' + mHtml +
    '<p style="margin:8px 0;color:#f5f0e1;">' + weekLine + '</p></div></details>';

  h.innerHTML = html;
}

function boot() {
  var forceDemo = false;
  try { forceDemo = new URLSearchParams(location.search).get('pf_demo') === 'pressure'; } catch (e) {}
  function goDemo() { renderBoard(host, FIXTURE_BOARD, FIXTURE_METHOD, true); }
  if (forceDemo || !BACKEND) { goDemo(); return; }
  var board = null, method = null, settled = 0;
  function maybe() {
    if (++settled < 2) return;
    if (isValidBoard(board) && methodText(method)) {
      renderBoard(host, board, methodText(method), false);
    } else {
      /* Backend not live or half-live: fixture behind the demo banner.
         A half-live board without methodology would violate the trust rules. */
      goDemo();
    }
  }
  jsonp('pressure_board', function (j) { board = j; maybe(); });
  jsonp('pressure_method', function (j) { method = j; maybe(); });
}
boot();

/* Test seam for the frontend verify harness (no production consumer). */
try { window.PFPressureBoard = { render: renderBoard, fixtureBoard: FIXTURE_BOARD, fixtureMethod: FIXTURE_METHOD, isValidBoard: isValidBoard, methodText: methodText }; } catch (e) {}
})();
</script>
</template>`);
})();
