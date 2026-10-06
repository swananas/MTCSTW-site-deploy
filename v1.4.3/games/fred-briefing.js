/* games/fred-briefing.js  |  PF v1.4.3 | MORNING BRIEFING — 6 NUMBERS, 30 SECONDS.
   The FRED Everywhere morning read: DGS10, DGS2, FEDFUNDS (+ market-implied
   direction), UNRATE (+ Sahm status), CPIAUCNS, MORTGAGE30US.
   Self-mounts into #xBrief (below the war-plan block) on weekdays only.

   Binding honesty:
   - Weekdays only. Never carry a daily briefing on monthly numbers alone —
     if nothing daily moved, the market reads (DGS10/DGS2) lead.
   - Stale series are skipped with a one-line note, never silently presented
     as current ("Mortgage data delayed this week — carrying last week's print").
   - Fedwatch direction: derived from the DGS2–FEDFUNDS spread (News Desk
     Pair 8) and attributed honestly to the 2-year Treasury — there is no
     fed-funds futures feed, so "per fed-funds futures" is never claimed.
     Past/present tense only: "traders are pricing in". Banned: "the Fed
     will", "a cut is coming", "expect the Fed to".
   - Sahm: coincident-only framing within one viewport + the 2024 note.
   - Every figure: 4-fact citation. CES is not on this surface.
   Read-only, zero XP. No predictions, no financial advice.
   KILL: ?pf_off=fred-briefing. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('fred-briefing')) { return; }
  if (window.pfFredBriefingDone) return;
  window.pfFredBriefingDone = true;

  var ORDER = ['DGS10', 'DGS2', 'FEDFUNDS', 'UNRATE', 'CPIAUCNS', 'MORTGAGE30US'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Weekdays only (Mon–Fri, viewer-local). */
  function isWeekday() {
    try { var d = new Date().getDay(); return d >= 1 && d <= 5; } catch (e) { return true; }
  }

  var CSS = [
    '.pf-fbrief{color:#f5ead6;font-family:Arial,sans-serif;margin:12px 0}',
    '.pf-fbrief-kicker{font-weight:700;font-size:12px;letter-spacing:4px;color:#e8b923;margin-bottom:6px}',
    '.pf-fbrief-title{font-weight:900;font-size:18px;letter-spacing:1px;margin:0 0 4px}',
    '.pf-fbrief-date{font-size:11px;color:#8a8271;letter-spacing:1px;margin-bottom:10px}',
    '.pf-fbrief-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '@media (max-width:640px){.pf-fbrief-grid{grid-template-columns:repeat(2,1fr)}}',
    '.pf-fbrief-card{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:10px;min-height:44px;cursor:pointer}',
    '.pf-fbrief-t{font-weight:900;font-size:10px;letter-spacing:1px;color:#e8b923;margin-bottom:4px}',
    '.pf-fbrief-v{font-weight:900;font-size:20px;margin:2px 0}',
    '.pf-fbrief-s{font-size:12px;line-height:1.5;color:#e8dcc3;margin-top:4px}',
    '.pf-fbrief-skip{font-size:12px;color:#8a8271;font-style:italic;padding:8px 0}',
    '.pf-fbrief-fedwatch{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:10px;margin:10px 0;font-size:13px;line-height:1.6}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-fbrief-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-fbrief-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function todayLabel() {
    try {
      var d = new Date();
      var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return WD[d.getDay()] + ', ' + MO[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) { return ''; }
  }

  /* One-line read per series. Stale legs: skipped here (note below). */
  function lineFor(F, c, ctx) {
    var sid = c.series_id;
    var v = c.value_label != null ? c.value_label : '—';
    var per = F.fmtPeriod(c);
    var sent = '';
    switch (sid) {
      case 'DGS10':
        sent = 'The 10-year yields ' + v + ' — what markets did overnight, in one number.'; break;
      case 'DGS2':
        sent = 'The 2-year yields ' + v + ' — the market\'s vote on where rates head next.'; break;
      case 'FEDFUNDS':
        sent = 'The Fed funds rate sits at ' + v + ' (' + per + ').'; break;
      case 'UNRATE': {
        sent = 'Unemployment is ' + v + ' (' + per + ').';
        if (ctx.sahm && ctx.sahm.current) {
          sent += ' Sahm rule: ' + (ctx.sahm.current.triggered ? 'TRIGGERED' : 'not triggered') +
            ' — a coincident read, not a forecast (it cried wolf in 2024).';
        }
        break;
      }
      case 'CPIAUCNS': {
        var ch = c.change_pct_label || c.change_label || '';
        sent = ch ? 'Consumer prices ' + ch + ' YoY (' + per + ') — the number driving today\'s takes.'
                  : 'Consumer prices: ' + v + ' (' + per + ').';
        break;
      }
      case 'MORTGAGE30US':
        sent = 'The 30-year mortgage averages ' + v + ' (' + per + ') — the household read.'; break;
      default:
        sent = (F.PLAIN[sid] || sid) + ': ' + v + ' (' + per + ').';
    }
    return '<div class="pf-fbrief-card pf-fred-tap" data-sid="' + esc(sid) + '" role="button" tabindex="0">' +
      '<div class="pf-fbrief-t">' + esc(F.PLAIN[sid] || c.title || sid) + ' ' + F.saNsa(c) + '</div>' +
      '<div class="pf-fbrief-v">' + esc(v) + F.revMark(c) + '</div>' +
      '<div class="pf-fbrief-s">' + esc(sent) + '</div>' +
      '<div>' + F.staleBadge(c) + '</div>' +
      '<div class="pf-fred-cite">' + esc(F.citation(c)) + '</div></div>';
  }

  /* Fedwatch direction from the DGS2–FEDFUNDS spread (Pair 8). Attributed to
     the 2-year Treasury — never to a futures feed we don't have. */
  function fedwatchHtml(F, cards) {
    var dgs2 = F.cardFor({ series: cards }, 'DGS2');
    var fed = F.cardFor({ series: cards }, 'FEDFUNDS');
    if (!dgs2 || !fed || dgs2.stale || fed.stale) return '';
    var y2 = Number(dgs2.value), ff = Number(fed.value);
    if (!isFinite(y2) || !isFinite(ff)) return '';
    var spread = y2 - ff;
    var dir;
    if (spread <= -0.5) dir = 'traders are pricing in cuts';
    else if (spread >= 0.5) dir = 'traders are pricing in hikes — or stubborn inflation';
    else dir = 'traders are pricing in a hold';
    return '<div class="pf-fbrief-fedwatch"><b style="color:#f5c518;letter-spacing:1px">FEDWATCH — VIA THE 2-YEAR TREASURY</b><br>' +
      'The 2-year yields ' + esc(dgs2.value_label) + ' against a Fed funds rate of ' + esc(fed.value_label) +
      ' — ' + esc(dir) + '. ' +
      '<span style="color:#8a8271">Read off the DGS2–FEDFUNDS spread (FRED DGS2, FEDFUNDS); not futures data.</span></div>';
  }

  function render(slot, j, sahmJ) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var sahm = (sahmJ && sahmJ.ok && !sahmJ.stale) ? sahmJ : null;

    var cards = [], skipped = [];
    ORDER.forEach(function (id) {
      var c = byId[id];
      if (!c) return;
      /* Briefings skip stale series with a note (protocol §4) — except the
         daily market reads, which carry the badge visibly instead. */
      if (c.stale && (F.FREQ[id] === 'm' || F.FREQ[id] === 'w' || F.FREQ[id] === 'q')) {
        skipped.push(c);
        return;
      }
      cards.push(c);
    });

    /* Never carry a daily briefing on monthly numbers alone: if no daily
       series is fresh, lead with the note, not a reheated CPI. */
    var dailyFresh = cards.some(function (c) { return F.FREQ[c.series_id] === 'd' && !c.stale; });

    var inner;
    if (!live || !cards.length) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The morning numbers appear when the official feed connects.') + '</p></div>';
    } else {
      inner = '';
      if (!dailyFresh) {
        inner += '<div class="pf-fbrief-skip">Markets are quiet — no fresh daily read this morning. ' +
          'Below are the latest prints, each with its vintage.</div>';
      }
      inner += fedwatchHtml(F, cards);
      inner += '<div class="pf-fbrief-grid">' +
        cards.map(function (c) { return lineFor(F, c, { sahm: c.series_id === 'UNRATE' ? sahm : null }); }).join('') +
        '</div>';
      skipped.forEach(function (c) {
        inner += '<div class="pf-fbrief-skip">' + esc((F.PLAIN[c.series_id] || c.series_id) +
          ' delayed — carrying the last good print (' + F.fmtPeriod(c) + '). ' +
          (c.stale_note || '')) + '</div>';
      });
    }
    slot.innerHTML = '<div class="pf-fbrief">' +
      '<div class="pf-fbrief-kicker">MORNING BRIEFING</div>' +
      '<h4 class="pf-fbrief-title">6 NUMBERS, 30 SECONDS</h4>' +
      '<div class="pf-fbrief-date">' + esc(todayLabel().toUpperCase()) + ' · WEEKDAYS</div>' +
      inner + '</div>';
    /* Tap → bottom sheet. */
    try {
      var els = slot.querySelectorAll('.pf-fbrief-card');
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

  function boot() {
    if (!isWeekday()) return; /* weekdays only */
    var host = document.getElementById('xBrief');
    if (!host || document.getElementById('pf-fred-briefing')) return;
    var slot = document.createElement('div');
    slot.id = 'pf-fred-briefing';
    /* Insert after the war-plan block when present, else at the top. */
    var inserted = false;
    try {
      var kids = host.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].className && kids[i].className.indexOf('br-sec') !== -1) {
          if (kids[i + 1]) host.insertBefore(slot, kids[i + 1]);
          else host.appendChild(slot);
          inserted = true;
          break;
        }
      }
    } catch (e) {}
    if (!inserted) {
      try {
        if (host.firstChild) host.insertBefore(slot, host.firstChild);
        else host.appendChild(slot);
      } catch (e) { return; }
    }
    var F = window.PFFred;
    if (!F) return;
    F.full(function (j) {
      F.api('fred_sahm', {}, function (sj) {
        try { render(slot, (j && j.ok) ? j : null, sj); }
        catch (e) {}
      });
    });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) {}
})();
