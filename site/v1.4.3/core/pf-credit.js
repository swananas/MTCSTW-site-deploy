/* core/pf-credit.js | PF v1.4.3 | Synergy-1 attribution: the ONE reusable
   credit component. Every surface showing creator-sourced content or data
   renders its credit through PF.credit — one voice, everywhere, factual.

   CONTRACT (matches src/attribution.js on the backend):
     PF.credit(item) -> HTML string ('' when there is nothing to credit)
     item: {sourced_by, sourced_name, sourced_url}
           — also accepts a legacy {callsign} or a bare callsign string.
     sourced_by: creator callsign, the literal 'hq' (HQ-synthesized piece),
                 or '' (unknown -> renders NOTHING, never a guess).
     sourced_url: profile/catalog link — ONLY when the backend supplied one.
                  The component never fabricates a link.
     opts: {cls} — extra CSS class on the wrapper.

   RENDERED COPY (Brand Consistency tone bar: factual metadata, quiet voice):
     creator: SOURCED BY @callsign   (linked when sourced_url is present)
     hq:      MADE BY PROPAGANDA FACTORY HQ
     unknown: '' (honest empty — the caller renders no credit line at all)

   PF.creditData(d) — data-source variant for official-data surfaces
   (mirrors the S-11 stamp contract; S-11 keeps its own markup for now):
     d: {label, detail, url} -> 'DATA: <label> · <detail>' (+ linked label
     when url is present). '' when no label.

   KILL: ?pf_off=credit (or localStorage pf_disabled_v1='["credit"]') makes
   every PF.credit / PF.creditData call return '' — the credit lines vanish
   site-wide without touching callers.
   ZERO XP: display only. No ledger, no grants, no point-adjacent logic. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    /* Absolute http(s) or site-relative only — never javascript:, data:, etc. */
    if (/^https?:\/\//i.test(s)) return s;
    if (s.charAt(0) === '/' && s.charAt(1) !== '/') return s;
    return '';
  }
  function normCs(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === 'hq') return 'hq';
    return /^[a-z0-9_]{3,20}$/.test(s) ? s : '';
  }
  function killed() {
    try { return !!(PF.skip && PF.skip('credit')); } catch (e) { return false; }
  }

  /* Normalize the many shapes callers pass into the contract triple. */
  function readItem(item) {
    var o = { sourced_by: '', sourced_name: '', sourced_url: '' };
    if (typeof item === 'string') { o.sourced_by = normCs(item); return o; }
    if (!item || typeof item !== 'object') return o;
    o.sourced_by = normCs(item.sourced_by) || normCs(item.callsign);
    o.sourced_name = String(item.sourced_name || '').trim().slice(0, 80);
    o.sourced_url = safeUrl(item.sourced_url);
    return o;
  }

  PF.credit = function (item, opts) {
    if (killed()) return '';
    var it = readItem(item);
    if (!it.sourced_by) return ''; /* honest empty: no credit, no guess */
    var cls = 'pf-credit' + (opts && opts.cls ? ' ' + String(opts.cls).slice(0, 40) : '');
    var body;
    if (it.sourced_by === 'hq') {
      body = 'MADE BY PROPAGANDA FACTORY HQ';
    } else {
      var who = it.sourced_name
        ? esc(it.sourced_name) + ' (@' + esc(it.sourced_by) + ')'
        : '@' + esc(it.sourced_by);
      body = 'SOURCED BY ' + (it.sourced_url
        ? '<a href="' + esc(safeUrl(it.sourced_url)||'#') + '" class="pf-credit-link">' + who + '</a>'
        : who);
    }
    return '<div class="' + esc(cls) + '" data-pf-credit="' + esc(it.sourced_by) + '">' +
      body + '</div>';
  };

  PF.creditData = function (d, opts) {
    if (killed()) return '';
    d = d || {};
    var label = String(d.label || '').trim().slice(0, 120);
    if (!label) return ''; /* honest empty */
    var detail = String(d.detail || '').trim().slice(0, 160);
    var url = safeUrl(d.url);
    var cls = 'pf-credit pf-credit-data' + (opts && opts.cls ? ' ' + String(opts.cls).slice(0, 40) : '');
    var head = url
      ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="pf-credit-link">' +
        esc(label) + '</a>'
      : esc(label);
    return '<div class="' + esc(cls) + '">DATA: ' + head +
      (detail ? ' &middot; ' + esc(detail) : '') + '</div>';
  };
})();
