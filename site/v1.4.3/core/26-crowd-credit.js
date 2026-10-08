/* core/26-crowd-credit.js  |  PF v1.4.3 | Cohesion §2 (2026-10-05): fingerprint.
   Shared contributor-attribution renderer for data outputs (People's Index
   boards, trend cards, any crowd-sourced figure).
   Binding privacy rules (spec §2):
   - Aggregated counts ONLY — DISTINCT callsigns, server-computed. Per-user
     callsign lists, per-user report counts, and "top contributor"
     leaderboards are BANNED on data surfaces.
   - Every count render carries its vintage label ("trailing 30 days",
     "this week's index", "weekly"). A count without a vintage is a lie.
   - n == 0 -> honest "no contributors yet", never hidden, never faked.
   API:
     PF.crowdCredit(count, vintage, opts) -> HTML string
       opts.zero: override zero-state copy (default 'no contributors yet')
   KILL: ?pf_off=26-crowd-credit  or  localStorage pf_disabled_v1='["26-crowd-credit"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('26-crowd-credit')) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtN(n) {
    n = Math.floor(Number(n) || 0);
    return n.toLocaleString('en-US');
  }

  window.PF.crowdCredit = function (count, vintage, opts) {
    opts = opts || {};
    var v = vintage ? String(vintage) : '';
    var n = Math.floor(Number(count) || 0);
    var line;
    if (n <= 0) {
      line = esc(opts.zero || 'no contributors yet');
    } else {
      line = 'powered by <b>' + fmtN(n) + '</b> contributor' + (n === 1 ? '' : 's');
    }
    if (v) line += ' <span style="opacity:.75;">&middot; ' + esc(v) + '</span>';
    return '<span class="pf-crowd-credit" style="font-size:.78rem;color:#b8ab8e;' +
      'letter-spacing:.04em;">' + line + '</span>';
  };
})();
