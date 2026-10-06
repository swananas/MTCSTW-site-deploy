/* core/edgar-live.js | PF v1.4.3 | SEC EDGAR live pills for THE ROBBERY REPORT.
   Reads ?action=edgar_margins (be/edgar-rail) and fills the per-card
   [data-rr-live] placeholders that core/robreport.js already renders.

   WHAT THE PILLS MEAN (methodology honesty, per margin spec §3):
   - confirmed   (green): live EDGAR blended margin matches our curated
                 figure within 0.5pp — the filing backs the card.
   - new_filing  (amber): a newer 10-K/20-F exists — figures under review.
   - drift       (amber): live read differs >0.5pp — under review, the
                 curated (human-verified) figure stands.
   - uncomparable(gray):  live figure is a different concept (company-wide
                 blend vs segment/retail) — shown for context only.
   - stale/unavailable: no pill. The curated card renders exactly as
                 before — never a blank, never a fabricated number.

   Fail-open everywhere: fetch failure, bad payload, or missing PF.bus
   leaves every card untouched. Kill: ?pf_off=edgarlive (also honors
   ?pf_off=robreport via the host module). Zero XP, zero writes, no auth. */
(function () {
  'use strict';
  var ROOT = (typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this);

  function qs(name) {
    try {
      var m = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)').exec(String(ROOT.location && ROOT.location.search || ''));
      return m ? decodeURIComponent((m[2] || '').replace(/\+/g, ' ')) : null;
    } catch (e) { return null; }
  }
  if (qs('pf_off') === 'edgarlive') return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Pill styles — injected with the module so cards never render unstyled
     pills (fail-open: if injection fails, pills simply don't show). */
  function injectCSS() {
    try {
      var doc = ROOT.document;
      if (!doc || doc.getElementById('pf-edgar-css')) return;
      var st = doc.createElement('style');
      st.id = 'pf-edgar-css';
      st.textContent =
        '.pf-edgar-pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;' +
        'padding:4px 10px;border-radius:20px;margin:2px 4px 2px 0;border:1px solid #444}' +
        '.pf-edgar-pill a{color:inherit;text-decoration:none}' +
        '.pf-edgar-ok{background:#0e2a14;color:#7ee787;border-color:#1f5c2e}' +
        '.pf-edgar-warn{background:#2a1e0e;color:#f0b429;border-color:#6b4d1c}' +
        '.pf-edgar-dim{background:#1c1c1c;color:#8f887a;border-color:#333}';
      doc.head.appendChild(st);
    } catch (e) {}
  }
  injectCSS();

  /* Robbery Report item id -> EDGAR company key(s). Mirrors
     v1.4.3/core/robreport-data.js company fields. */
  var ITEM_COMPANIES = {
    'burrito': ['chipotle'], 'chips-guac': ['chipotle'],
    'iphone': ['apple'], 'airpods': ['apple'],
    'pegasus': ['nike'],
    'coke-2l': ['walmart', 'coca-cola-consolidated', 'coca-cola'],
    'coke-12pk': ['walmart', 'coca-cola-consolidated', 'coca-cola'],
    'tide': ['pg'], 'pampers': ['pg'],
    'gv-coffee': ['walmart'], 'gv-vs-folgers': ['walmart'],
    'ketchup': ['kraft-heinz'], 'mac-cheese': ['kraft-heinz'], 'philly': ['kraft-heinz'],
    'cheerios': ['general-mills'], 'yoplait': ['general-mills'], 'cake-mix': ['general-mills'],
    'kleenex': ['kimberly-clark'], 'scott-tp': ['kimberly-clark'], 'huggies': ['kimberly-clark'],
    'colgate': ['colgate'], 'palmolive': ['colgate'], 'irish-spring': ['colgate'],
    'dove': ['unilever'], 'hellmanns': ['unilever'], 'axe': ['unilever'],
    'bleach': ['clorox'], 'wipes': ['clorox'], 'glad': ['clorox']
  };

  function fmtDate(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
    if (!m) return String(ymd || '');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
  }

  function pillHTML(co) {
    var live = co && co.live;
    if (!live) return '';
    var st = co.status;
    var url = esc(live.edgar_url || '');
    var linkOpen = url ? '<a href="' + url + '" target="_blank" rel="noopener" style="color:inherit">' : '<span>';
    var linkClose = url ? '</a>' : '</span>';
    var cite = esc(live.form) + ' FY' + esc(String(live.period_end || '').slice(0, 4)) +
               ' filed ' + esc(fmtDate(live.filed));
    if (st === 'confirmed') {
      return '<span class="pf-edgar-pill pf-edgar-ok">' + linkOpen +
             '● LIVE FROM EDGAR · ' + esc(live.margin_pct) + '% · ' + cite + ' ↗' + linkClose + '</span>';
    }
    if (st === 'new_filing') {
      return '<span class="pf-edgar-pill pf-edgar-warn">' + linkOpen +
             '▲ NEW FILING · ' + cite + ' — figures under review ↗' + linkClose + '</span>';
    }
    if (st === 'drift') {
      var cur = co.curated && co.curated.margin_pct != null ? co.curated.margin_pct + '%' : 'n/a';
      return '<span class="pf-edgar-pill pf-edgar-warn">' + linkOpen +
             '◆ UNDER REVIEW · EDGAR reads ' + esc(live.margin_pct) + '% vs our ' + esc(cur) + ' ↗' + linkClose + '</span>';
    }
    if (st === 'uncomparable') {
      return '<span class="pf-edgar-pill pf-edgar-dim">' + linkOpen +
             '○ EDGAR company-wide: ' + esc(live.margin_pct) + '% · ' + cite + ' ↗' + linkClose + '</span>';
    }
    return ''; /* stale / unavailable: no pill, curated card stands alone */
  }

  function fill(byKey) {
    var doc = ROOT.document;
    if (!doc) return 0;
    var filled = 0;
    var nodes = doc.querySelectorAll('[data-rr-live]');
    for (var i = 0; i < nodes.length; i++) {
      var id = nodes[i].getAttribute('data-rr-live');
      var keys = ITEM_COMPANIES[id];
      if (!keys) continue;
      var pills = [];
      for (var k = 0; k < keys.length; k++) {
        var co = byKey[keys[k]];
        if (!co) continue;
        var p = pillHTML(co);
        if (p) pills.push(p);
      }
      if (pills.length) {
        nodes[i].innerHTML = pills.join(' ');
        nodes[i].style.display = 'block';
        filled++;
      }
    }
    return filled;
  }

  function boot() {
    var PF = ROOT.PF;
    if (!PF || !PF.bus || typeof PF.bus.jsonp !== 'function') return; /* fail-open */
    if (PF.skip && PF.skip('edgarlive')) return;
    var holders = (ROOT.document && ROOT.document.querySelectorAll('[data-rr-live]')) || [];
    if (!holders.length) return; /* no Robbery Report on this page */
    PF.bus.jsonp('edgar_margins', {}).then(function (data) {
      if (!data || data.ok === false || !data.edgar_live || !data.companies) return; /* fail-open */
      var byKey = {};
      for (var i = 0; i < data.companies.length; i++) byKey[data.companies[i].key] = data.companies[i];
      try { fill(byKey); } catch (e) { /* never break the cards */ }
    });
  }

  var api = { ITEM_COMPANIES: ITEM_COMPANIES, pillHTML: pillHTML, fill: fill, fmtDate: fmtDate, boot: boot };
  if (ROOT.PF) ROOT.PF.edgarLive = api; else ROOT.PFEdgarLive = api;

  /* Boot after the report renders (robreport.js mounts on DOMContentLoaded;
     we run on window load + a MutationObserver fallback for late mounts). */
  function start() {
    try { boot(); } catch (e) {}
    try {
      if (ROOT.document && ROOT.MutationObserver) {
        var seen = 0;
        var mo = new ROOT.MutationObserver(function () {
          var n = ROOT.document.querySelectorAll('[data-rr-live]').length;
          if (n > seen) { seen = n; try { boot(); } catch (e) {} }
          if (seen > 0) { try { mo.disconnect(); } catch (e) {} }
        });
        mo.observe(ROOT.document.documentElement, { childList: true, subtree: true });
        setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
  }
  if (ROOT.document && ROOT.document.readyState === 'complete') start();
  else if (ROOT.addEventListener) ROOT.addEventListener('load', start);
  else start();
})();
