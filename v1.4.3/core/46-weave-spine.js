/* core/46-weave-spine.js | PF v1.4.3 | THE SPINE WEAVE (fe/weave-spine-20261010).
   The Karl feed is the spine of the site: every page connects back to it — no dead
   ends, no orphan pages. Runs on every bundle-core / bundle-core-slr page (all routes;
   the zero-JS Karl homepage IS the feed, so it is skipped there).
   (1) Injects a "FROM THE FEED — RELATED ROBBERIES" rail above the footer chrome:
       curated related feed discoveries for this page; each item links to its
       deep page (feed discovery -> deep page).
   (2) Rail footer carries the spine link "<- THE ROBBERY REPORT" -> /#kh-feed
       (the Karl feed), so every deep page reaches the feed in one tap.
   Companion contract (9-rail feed, WS-B): window.PFWeave.cardDeepUrl(rail, cardId)
   resolves a card's deep link from the canonical rail -> deep-page map. Feed card
   renderers call this helper; shape agreement at
   ~/workspace/hidden/siteint-weave-20261010/ninerail-feed-contract-20261010.md.
   READ-ONLY: no POST, no auth, ZERO XP, no network. Kill: ?pf_off=weave */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('weave')) { return; }

  /* Canonical rail -> deep-page map (mirrors the connection map). */
  var RAIL_DEEP = {
    colleges: '/follow-the-money',
    prisons: '/corruption-index',
    rent: '/peoples-cpi',
    bills: '/peoples-cpi',
    evictions: '/economy',
    billionaires: '/money',
    labor: '/economy',
    hospitals: '/follow-the-money',
    economy: '/economy',
    margins: '/follow-the-money',   /* Robbery Report curated cards */
    creators: '/sick-left-radicals'  /* SLR roster discoveries */
  };

  /* Curated feed discoveries: {id, rail, t:title, s:outrage stat}. */
  var DISCOVERIES = [
    { id: 'boeing', rail: 'labor', t: 'Boeing paid $2.5B in fraud penalties — then spent $13.3M lobbying the same regulators.', s: '188:1 return on corruption' },
    { id: 'geo', rail: 'prisons', t: 'GEO Group runs 19 private prisons; 4 disclosed contracts worth $330M/yr — 26 more hidden.', s: '$330M/yr disclosed' },
    { id: 'colleges', rail: 'colleges', t: '2,261 for-profit schools collected federal aid while only 54 were ever flagged for fraud.', s: '2.4% ever flagged' },
    { id: 'billionaires', rail: 'billionaires', t: '1,653 billionaires hold $6.45T — more than the GDP of Japan.', s: '$6.45T combined' },
    { id: 'fec', rail: 'economy', t: 'The average House member takes 68% of campaign funds from outside their district.', s: '176,870 contributions' },
    { id: 'evict-er', rail: 'evictions', t: '59,717 eviction estimates pile up while hospital ER markups hit 12×.', s: '12× ER markup' },
    { id: 'contractors', rail: 'labor', t: 'Defense contractors paid $5.44B in penalties across 20 cases — while insiders traded their own stock.', s: '$5.44B fines' },
    { id: 'iphone', rail: 'margins', t: 'Your iPhone: $999 price, ~$351 their take. From Apple’s own 10-K.', s: '36.8% margin' },
    { id: 'burrito', rail: 'margins', t: 'Your Chipotle burrito: $10.25, their take $2.50. From their own 8-K.', s: '25.4% margin' },
    { id: 'nikeshoe', rail: 'margins', t: 'Your Nike Pegasus: $150 price, $45 their take. From their own 10-K.', s: '42.9% margin' },
    { id: 'rentcpi', rail: 'rent', t: 'Rent is the people’s CPI heavyweight — neighbors report the prices landlords charge.', s: 'live people’s median' },
    { id: 'creators', rail: 'creators', t: '62 Sick Left Radicals, 8M+ reach. Find your propagandist.', s: '62 affiliates' }
  ];

  /* Page prefix -> discovery ids. First match wins; fallback = first four. */
  var PAGE_MAP = [
    { p: '/money', ids: ['billionaires', 'iphone', 'burrito', 'contractors'] },
    { p: '/war-chest', ids: ['billionaires', 'contractors', 'fec', 'iphone'] },
    { p: '/bank', ids: ['billionaires', 'fec', 'contractors', 'evict-er'] },
    { p: '/follow-the-money', ids: ['boeing', 'geo', 'iphone', 'nikeshoe'] },
    { p: '/dossier', ids: ['geo', 'boeing', 'fec', 'colleges'] },
    { p: '/economy', ids: ['fec', 'evict-er', 'rentcpi', 'burrito'] },
    { p: '/peoples-cpi', ids: ['rentcpi', 'evict-er', 'burrito', 'iphone'] },
    { p: '/corruption-index', ids: ['geo', 'boeing', 'fec', 'contractors'] },
    { p: '/create', ids: ['iphone', 'burrito', 'nikeshoe', 'creators'] },
    { p: '/sick-left-radicals', ids: ['creators', 'fec', 'billionaires', 'geo'] },
    { p: '/cells', ids: ['geo', 'boeing', 'contractors', 'colleges'] },
    { p: '/cell-war', ids: ['geo', 'boeing', 'contractors', 'colleges'] },
    { p: '/dashboard', ids: ['boeing', 'billionaires', 'iphone', 'creators'] },
    { p: '/arcade', ids: ['boeing', 'geo', 'contractors', 'burrito'] },
    { p: '/call-it', ids: ['fec', 'billionaires', 'contractors', 'boeing'] },
    { p: '/liquidation', ids: ['billionaires', 'contractors', 'boeing', 'fec'] },
    { p: '/karl', ids: ['boeing', 'geo', 'colleges', 'billionaires'] }
  ];

  var FEED_HREF = '/#kh-feed'; /* the Karl feed — the spine */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) {
    for (var i = 0; i < DISCOVERIES.length; i++) if (DISCOVERIES[i].id === id) return DISCOVERIES[i];
    return null;
  }
  function relatedFor(path) {
    for (var i = 0; i < PAGE_MAP.length; i++) {
      if (path === PAGE_MAP[i].p || path.indexOf(PAGE_MAP[i].p + '/') === 0) {
        var out = [];
        for (var j = 0; j < PAGE_MAP[i].ids.length; j++) {
          var d = byId(PAGE_MAP[i].ids[j]);
          if (d) out.push(d);
        }
        return out;
      }
    }
    return DISCOVERIES.slice(0, 4);
  }
  /* WS-B contract helper: canonical card -> deep page. */
  function cardDeepUrl(rail) {
    return RAIL_DEEP[String(rail || '').toLowerCase()] || '/follow-the-money';
  }

  function cssOnce() {
    if (document.getElementById('pf-weave-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-weave-css';
    st.textContent =
      '#pf-weave{max-width:860px;margin:0 auto;padding:26px 14px 8px;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif}' +
      '#pf-weave .pf-wv-kick{color:#ff4d5e;font-weight:900;letter-spacing:.24em;font-size:10px;margin:0 0 4px}' +
      '#pf-weave .pf-wv-head{color:#f5f0e6;font-size:20px;font-weight:900;letter-spacing:.04em;margin:0 0 12px}' +
      '#pf-weave .pf-wv-item{background:#0a0a0a;border:1px solid #2a2a2a;border-left:3px solid #c1121f;border-radius:4px;padding:12px 14px;margin:0 0 10px}' +
      '#pf-weave .pf-wv-t{font-size:14px;line-height:1.45;color:#f5f0e6;margin:0 0 6px}' +
      '#pf-weave .pf-wv-s{font-size:12px;color:#c9bfa8;margin:0 0 8px}' +
      '#pf-weave .pf-wv-s b{color:#ff4d5e}' +
      '#pf-weave .pf-wv-a{font-size:13px;font-weight:700;color:#fff;text-decoration:underline;text-underline-offset:3px}' +
      '#pf-weave .pf-wv-foot{margin:16px 0 4px;padding-top:14px;border-top:1px solid #2a2a2a;text-align:center}' +
      '#pf-weave .pf-wv-spine{display:inline-block;color:#ff4d5e;font-weight:900;letter-spacing:.1em;font-size:13px;text-decoration:none;border:2px solid #c1121f;padding:10px 18px;border-radius:4px}';
    document.head.appendChild(st);
  }

  function itemHTML(d) {
    return '<div class="pf-wv-item" data-rail="' + esc(d.rail) + '" data-card-id="' + esc(d.id) + '">' +
      '<p class="pf-wv-t">' + esc(d.t) + '</p>' +
      '<p class="pf-wv-s">▸ <b>' + esc(d.s) + '</b></p>' +
      '<a class="pf-wv-a" href="' + esc(cardDeepUrl(d.rail)) + '">DIG IN &rarr;</a></div>';
  }

  function mount() {
    /* The Karl homepage IS the feed — nothing to weave there. */
    if (document.getElementById('pf-weave') || document.getElementById('kh-feed')) return;
    cssOnce();
    var path = (window.location && window.location.pathname) || '/';
    var items = relatedFor(path);
    var h = '<section id="pf-weave" aria-label="From the feed">' +
      '<p class="pf-wv-kick">FROM THE FEED</p>' +
      '<h2 class="pf-wv-head">RELATED ROBBERIES</h2>';
    for (var i = 0; i < items.length; i++) h += itemHTML(items[i]);
    h += '<div class="pf-wv-foot"><a class="pf-wv-spine" href="' + FEED_HREF + '">&larr; THE ROBBERY REPORT</a></div></section>';
    var sec = document.createElement('div');
    sec.innerHTML = h;
    var node = sec.firstChild;
    var anchor = document.getElementById('pf-crossnav');
    if (anchor && anchor.parentNode) { anchor.parentNode.insertBefore(node, anchor); return; }
    var footers = document.getElementsByTagName('footer');
    if (footers.length) { footers[0].parentNode.insertBefore(node, footers[0]); return; }
    document.body.appendChild(node);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else { mount(); }

  window.PFWeave = {
    version: 1,
    railDeep: RAIL_DEEP,
    relatedFor: relatedFor,
    cardDeepUrl: cardDeepUrl
  };
})();
