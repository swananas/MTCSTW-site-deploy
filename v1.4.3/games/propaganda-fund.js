/* games/propaganda-fund.js  |  PF v1.4.3 | THE PROPAGANDA FUND — /fund.
   STRUCTURE ONLY (Project Blossom C4, CTO-approved 2026-10-06): the page
   skeleton is live; the transparency report content is GATED on News Desk +
   Brand sign-off of the fund numbers. No figures publish until they are
   verified — empty honest beats invented, so this silo renders NO numbers,
   NO placeholder figures, NO projections. That is deliberate.
   SELF-MOUNTING SILO: renders into div#pf-fund at bundle time (the
   Squarespace /fund page carries the Code-block hand-step). page-mount.js
   positions it via the SELF registry; silent no-op when the div is absent.
   KILL: ?pf_off=fund (master). Spine phase: ORGANIZE.
   Next Move exit: /follow-the-money (the live money trail, today). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('fund')) { return; }
  try {
    var _href = window.location.href || '';
    if (_href.indexOf('/config/') !== -1) return;
    var _bd = document.body;
    if (_bd && (_bd.classList.contains('sqs-edit-mode') || _bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}
  var host = null;
  try { host = document.getElementById('pf-fund'); } catch (e) {}
  if (!host) { return; } /* not the /fund page — silent no-op */
  if (host.getAttribute('data-pf-fund-mounted')) return;
  host.setAttribute('data-pf-fund-mounted', '1');

  var RED = '#dc143c', PAPER = '#f5f0e6';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  try {
    if (!document.getElementById('pf-fund-css')) {
      var st = document.createElement('style');
      st.id = 'pf-fund-css';
      st.textContent = [
        '.pf-fund{max-width:760px;margin:0 auto;padding:4px 0 30px;color:' + PAPER + ';font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;}',
        '.pf-fund-panel{background:#0d0d0d;border:2px dashed #4a4a4a;border-radius:10px;padding:34px 26px;text-align:center;}',
        '.pf-fund-panel p{font-size:16px;line-height:1.7;color:#d8d0c0;margin:0 0 14px;}',
        '.pf-fund-kicker{font-size:12px;letter-spacing:5px;color:' + RED + ';font-weight:800;margin-bottom:10px;}',
        '.pf-fund-next{text-align:center;border:2px solid ' + RED + ';border-radius:10px;padding:22px;margin:22px 0 0;background:#12060a;}',
        '.pf-fund-btn{display:inline-block;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;font-size:15px;padding:14px 30px;border-radius:8px;text-decoration:none;}'
      ].join('\n');
      document.head.appendChild(st);
    }
  } catch (e) {}

  var root = document.createElement('div');
  root.className = 'pf-fund';
  root.innerHTML =
    '<div class="pf-fund-panel">' +
    '<div class="pf-fund-kicker">TRANSPARENCY REPORT</div>' +
    /* Empty-honest body — the exact approved copy. No figures until verified. */
    '<p>The transparency report is being compiled. No figures publish until they\u2019re verified \u2014 we\u2019d rather show you nothing than show you something shaky.</p>' +
    '<p style="font-size:14px;color:#a89e88;">When it lands, this page itemizes the Propaganda Fund: where the money comes from, where every cent goes, and the running ledger \u2014 coordinated with the live money trail below. Nothing here is estimated. Nothing here is seeded.</p>' +
    '</div>' +
    '<div class="pf-fund-next">' +
    '<div class="pf-fund-kicker">NEXT MOVE</div>' +
    '<div style="font-size:17px;font-weight:900;letter-spacing:1px;margin-bottom:6px;">FOLLOW THE MONEY, LIVE</div>' +
    '<div style="font-size:14px;color:#d8d0c0;margin-bottom:14px;line-height:1.6;">The money trail is already open \u2014 see who funds the votes while the fund report is compiled.</div>' +
    '<a class="pf-fund-btn" href="/follow-the-money">FOLLOW THE MONEY \u2192</a>' +
    '</div>' +
    /* Brand integration (2026-10-06, fix 5): cross-pillar handoffs — wired
       declaratively by the share-everywhere scanner. */
    '<div data-pf-handoff="share-intel"></div>' +
    '<div data-pf-handoff="take-cell"></div>';
  host.appendChild(root);
})();
