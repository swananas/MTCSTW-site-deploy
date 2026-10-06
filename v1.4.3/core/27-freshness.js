/* core/27-freshness.js  |  PF v1.4.3 | Cohesion §4 (2026-10-05): motion signals.
   Freshness gate for live counters. Binding honesty rules (spec §4):
   - "Happening now" / "LIVE" badges require data <= 15 minutes fresh.
     Hourly-cron data may NEVER wear a LIVE badge — label it "updated hourly".
   - If the freshest backing data is older than the label claims, degrade the
     label automatically ("today" -> "recently") rather than showing a stale
     "LIVE".
   - Zero states are honest: "No raids reported today — start one." Never hide
     the counter when it's 0.
   - No per-user surveillance: aggregates only (enforced server-side; this
     module only renders what the server sends).
   API:
     PF.freshBadge(asOfMs, opts) -> HTML string
       opts.label: base label, e.g. 'LIVE' (default). When data is stale the
         badge degrades to a "recently"/"updated HH:MM" chip instead.
       Returns '' when asOfMs is missing/unusable (fail-soft: no badge > lie).
     PF.degradedVintage(vintage, asOfMs) -> string
       'today' with asOf older than the current Chicago day -> 'recently';
       otherwise returns vintage unchanged.
     PF.honestZero(count, oneLine, zeroLine) -> string
       Picks the zeroLine copy when count is 0; never hides the counter.
   KILL: ?pf_off=27-freshness  or  localStorage pf_disabled_v1='["27-freshness"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('27-freshness')) return;

  var LIVE_MAX_MS = 15 * 60000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ageMs(asOf) {
    var t = Number(asOf);
    if (!isFinite(t) || t <= 0) return null;
    return Date.now() - t;
  }

  window.PF.freshBadge = function (asOfMs, opts) {
    opts = opts || {};
    var age = ageMs(asOfMs);
    if (age == null || age < 0) return ''; /* no data -> no badge, never a lie */
    var label = String(opts.label || 'LIVE');
    if (age <= LIVE_MAX_MS) {
      return '<span class="pf-live" style="background:#e10600;color:#fff;font-weight:800;' +
        'font-size:.72rem;letter-spacing:.1em;padding:.2rem .6rem;border-radius:2px;">' +
        '&#9679; ' + esc(label) + '</span>';
    }
    /* Stale: degrade to an honest recency chip instead of a LIVE badge. */
    var when;
    if (age < 3600000) when = Math.max(1, Math.round(age / 60000)) + 'm ago';
    else if (age < 86400000) when = Math.round(age / 3600000) + 'h ago';
    else when = Math.round(age / 86400000) + 'd ago';
    return '<span class="pf-stale" style="background:#3a3a3a;color:#b8ab8e;font-weight:700;' +
      'font-size:.72rem;letter-spacing:.1em;padding:.2rem .6rem;border-radius:2px;">' +
      'updated ' + esc(when) + '</span>';
  };

  window.PF.degradedVintage = function (vintage, asOfMs) {
    var v = String(vintage || '');
    var age = ageMs(asOfMs);
    if (age == null) return v;
    /* "today" claimed on data older than ~a day is stale — say "recently". */
    if (/today/i.test(v) && age > 20 * 3600000) return 'recently';
    if (/hour/i.test(v) && age > 90 * 60000) return 'recently';
    if (/15 min/i.test(v) && age > 30 * 60000) return 'recently';
    return v;
  };

  window.PF.honestZero = function (count, oneLine, zeroLine) {
    var n = Number(count) || 0;
    return n > 0 ? String(oneLine) : String(zeroLine);
  };
})();
