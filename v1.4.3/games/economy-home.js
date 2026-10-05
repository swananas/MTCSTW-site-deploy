/* games/economy-home.js  |  PF v1.4.3 | /economy PRICE-INDEX HOME (A1 integration).
   Mount/integration layer for the People's Price Index on /economy.
   Built AGAINST origin/fe/inflation-tracker (the A1 frontend branch, in QC)
   — this file does not fork, copy, or modify any A1 code. It stages the
   three A1 mount divs in bundle order BEFORE inflation-tracker.js runs, so
   the self-mounting widgets land instead of silent no-op.

   Surfaces staged (A1 owns the widgets; this file owns the home):
     #pf-inflation-checkin — price-report widget (the core crowdsource loop)
     #pf-inflation-board   — area price board
     #pf-inflation-trends  — People's Index vs official CPI-U (SVG/DOM only)
   Exits wired here:
     - AC-return cross-nav rail -> /political-hq#pf-action-center (hub contract)
     - Deep-link anchors (#pf-inflation-checkin etc.) for the HP widget,
       Daily Briefing, War Report section, and Deck INTEL tile.
   Feeders (built in this branch unless noted):
     - HP widget: games/inflation-teaser.js (FUND section)
     - Daily Briefing: ECON CALENDAR row in games/briefing.js
     - War Report Price Index section: backend spec handed to the War Report
       owner (src/warreport.js — not built here; War Report Monday risk)
     - Deck INTEL: deep-link contract handed to the Deck team
   Ethical rails (CEO directive, non-negotiable; Psych's A1 copy conditions
   apply verbatim to every line of copy below):
     transparent consent at collection, aggregated by default, coarse
     location only (ZIP-or-city, never address), never sold, no individual
     manipulation scoring.
   ZERO ECONOMY: price reports grant 0 XP (Economy Desk APPROVE) —
   recognition only. No new currencies. This file shows, grants, and
   promises no XP.
   Perf: fits the /economy 220 KB budget (this file ~6 KB raw; SVG/DOM
   sparklines only — no chart library anywhere in the A1 stack).
   KILL: ?pf_off=economy-home  or  localStorage pf_disabled_v1='["economy-home"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('economy-home')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var host = null;
  try { host = document.getElementById('pf-economy'); } catch (e) {}
  if (!host) { return; } /* not the /economy page — silent no-op */

  if (document.getElementById('pf-inflation-home')) { return; } /* double-run safe */

  var CSS =
    'font-family:Arial,Helvetica,sans-serif;color:#f5f0e6;box-sizing:border-box;';
  var KICKER =
    'font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;';
  var TITLE =
    "font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:2px;" +
    'color:#f5f0e6;text-transform:uppercase;margin:0 0 8px;';
  var SUB = 'font-size:15px;color:#d8d0c0;line-height:1.55;max-width:640px;';
  var ETHIC =
    'font-size:12.5px;color:#a89e88;line-height:1.6;margin-top:10px;max-width:640px;';
  var RAIL =
    'margin:26px auto 8px;max-width:760px;text-align:center;' + CSS +
    'border-top:2px solid #c1121f;padding-top:18px;';
  var RAIL_A =
    'display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:13px;' +
    'letter-spacing:.14em;padding:12px 26px;text-decoration:none;';
  /* QW-14 (2026-10-05): bridge strip between the People's CPI and the XP
     economy game — anchors both ways (#pf-inflation-checkin above,
     #pf-xp-economy = the XP economy block id in games/economy.js). */
  var BRIDGE =
    'margin:22px auto 8px;max-width:760px;text-align:center;' + CSS +
    'border:2px dashed #c1121f;padding:16px;';

  var sec = document.createElement('div');
  sec.id = 'pf-inflation-home';
  sec.className = 'fe-block pf-override-block pf-silo';
  sec.setAttribute('style', CSS + 'margin:0 0 8px;');
  sec.innerHTML =
    '<div style="text-align:center;margin:6px auto 20px;max-width:720px;">' +
    '<div style="' + KICKER + '">THE PEOPLE\u2019S PRICE INDEX</div>' +
    '<h2 style="' + TITLE + '">We\u2019re Building Our Own Inflation Number</h2>' +
    '<div style="' + SUB + '">The government won\u2019t give us an honest inflation ' +
    'number, so we\u2019re building our own. Report what groceries, gas, and rent ' +
    'actually cost you \u2014 <b>join the count</b>.</div>' +
    /* Ethical rails, surfaced at the home level (Psych A1 conditions verbatim):
       transparent ("your activity powers the movement's intelligence"),
       aggregated by default, coarse location only, never sold. */
    '<div style="' + ETHIC + '">Your activity powers the movement\u2019s intelligence. ' +
    'Reports become <b>anonymous community medians</b> \u2014 aggregated by default, ' +
    '<b>never sold</b>. Location is coarse only: ZIP or city, <b>never your address, ' +
    'never your name</b>. No individual scoring, ever. ' +
    'Recognition only \u2014 price reports earn <b>0 XP</b>.</div>' +
    '</div>' +
    /* A1 mount divs. Must exist BEFORE inflation-tracker.js runs in this bundle;
       that file self-mounts into these ids and silent no-ops when absent. */
    '<div id="pf-inflation-checkin"></div>' +
    '<div id="pf-inflation-board"></div>' +
    '<div id="pf-inflation-trends"></div>' +
    /* AC-return cross-nav rail (hub contract): every silo carries the way back. */
    '<div style="' + RAIL + '">' +
    '<a style="' + RAIL_A + '" href="/political-hq#pf-action-center">' +
    '\u2190 BACK TO ACTION CENTER</a>' +
    '<div style="font-size:12px;color:#a89e88;margin-top:10px;line-height:1.5;">' +
    'Turned the index into action? The Action Center routes every fight: ' +
    'calls, campaigns, petitions, ballots.</div>' +
    '</div>' +
    /* QW-14 bridge strip: sits at the end of the CPI section, right before
       the XP economy block on the stacked /economy page. Zero XP, zero
       endpoints — pure anchor links. */
    '<div style="' + BRIDGE + '">' +
    '<div style="' + KICKER + '">THE LOOP CLOSES</div>' +
    '<div style="' + SUB + 'margin-left:auto;margin-right:auto;">' +
    '<b>YOUR CHECK-INS POWER THE INDEX</b> &mdash; every price you report sharpens ' +
    'the People\u2019s CPI. Play the economy. Feed the intel.</div>' +
    '<div style="margin-top:12px;">' +
    '<a style="' + RAIL_A + 'margin:0 6px 8px;" href="#pf-inflation-checkin">' +
    'FEED THE INDEX</a>' +
    '<a style="' + RAIL_A + 'margin:0 6px 8px;" href="#pf-xp-economy">' +
    'PLAY THE ECONOMY</a>' +
    '</div></div>';

  /* Lead section: the Price Index is the home's flagship, so it stages first —
     page-mount's header insertBefore keeps the page hero on top regardless
     of which runs first. */
  try {
    if (host.firstChild) host.insertBefore(sec, host.firstChild);
    else host.appendChild(sec);
  } catch (e) { return; }

  /* Deep-link landing: #pf-inflation-checkin / #pf-inflation-board /
     #pf-inflation-trends from the HP widget, Briefing, War Report, Deck.
     Widgets render async, so retry the scroll a few beats. */
  function deepLink() {
    var h = '';
    try { h = String(window.location.hash || ''); } catch (e) {}
    if (h !== '#pf-inflation-checkin' && h !== '#pf-inflation-board' &&
        h !== '#pf-inflation-trends') { return; }
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var el = null;
      try { el = document.getElementById(h.slice(1)); } catch (e) {}
      var settled = el && el.firstChild;
      if (el && (settled || tries >= 8)) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch (e2) { try { el.scrollIntoView(); } catch (e3) {} }
        clearInterval(t);
      } else if (tries >= 8) { clearInterval(t); }
    }, 500);
  }
  try { deepLink(); } catch (e) {}
})();
