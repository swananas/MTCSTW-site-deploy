/* games/receipt.js  |  PF v1.4.3 | THE RECEIPT — the money dossier.
   Data Products Product 1 (CEO "Go on all" 2026-10-07). Type a politician's
   name, get the full money dossier as a shareable image.
   Self-mounting silo: renders into #pf-receipt (Squarespace page /receipt
   carries <div id="pf-receipt"></div> as a Code block — CEO hand-step).
   page-mount.js PAGE_ORDERS['pf-receipt'] gives it the page header + widen.
   Backend: ?action=receipt_search (typeahead) / ?action=receipt_dossier
   (server-side rail fan-out). Public JSONP, read-only, 0 XP for viewing;
   the GET THE RECEIPT share routes through the existing share XP mechanics
   (pf-share-image -> creditShare).
   DESIGN (CEO direction 2026-10-07 "Let it blossom"): CLEAN, LIGHT receipt
   paper. No bloated dossier layouts — the headline (total raised, top
   industries, trade count) is immediately visible; sections are native
   <details> cards, collapsed by default on mobile, open on desktop.
   STICKY WEB: every dossier ends in a KEEP DIGGING strip — real links to
   the natural neighbors: /town (their district's backyard), /index (their
   corruption-index score, ?name=<slug> when the index supports it),
   /extraction (extraction stories). Receipt -> Town -> Index through
   relevance, not funnels. Deep-link contract for the UGC dossier-builder:
   /receipt/<slug>, slug = lowercase-hyphenated display name
   (e.g. /receipt/bernie-sanders).
   BUTTER RULE: hero + headline paint first; dossier sections stagger-render
   on idle so first paint stays light. The 1080x1350 share painter runs ONLY
   on tap — the ~99% who never share never pay for it.
   COPY RULE: "took $X from [industry]" / "raised $X" are donation facts;
   "sold their vote" never appears. Sections are adjacent facts with dates.
   KILL: ?pf_off=receipt */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('receipt')) { return; }
  if (window.pfReceiptDone) return;
  window.pfReceiptDone = true;

  /* Light receipt-paper palette (CEO: clean, light — no bloated layouts). */
  var RED = '#c1121f', PAPER = '#fdfdfa', INK = '#1a1814', MUTED = '#8a8474',
    HAIR = '#e7e1d0', DASH = '#d8d2bd', MONO = "'SF Mono',Menlo,Consolas,monospace";
  var BACKEND = window.PF_BACKEND_URL;
  var FONT = "font-family:'Helvetica Neue',Arial,sans-serif;";

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function slugify(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function unslugify(slug) {
    return String(slug || '').replace(/-/g, ' ');
  }
  function err(m) { try { if (PF && PF.error) PF.error('receipt', m); } catch (e) {} }
  function isMobile() {
    try { return window.matchMedia && window.matchMedia('(max-width: 640px)').matches; }
    catch (e) { return false; }
  }

  /* JSONP, same contract as core/00-bus.js seedDayXp. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfReceiptCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    s.async = true;
    try { document.head.appendChild(s); } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 15000); /* fail-soft timeout */
  }

  /* ---------------------------------------------------------------- */
  /* Shell                                                             */
  /* ---------------------------------------------------------------- */
  function shellHTML() {
    return '<div class="pf-receipt" style="max-width:680px;margin:0 auto;' + FONT + 'color:' + INK + ';">'
      + '<div style="text-align:center;margin:6px 0 18px;">'
      + '<div style="font-size:12px;letter-spacing:5px;color:' + RED + ';font-weight:800;margin-bottom:10px;">FOLLOW THE MONEY</div>'
      + '<div style="font-size:24px;font-weight:900;letter-spacing:.5px;margin-bottom:8px;">WHO DO YOU WANT THE RECEIPT ON?</div>'
      + '<div style="font-size:14px;color:' + MUTED + ';line-height:1.6;">Type a politician\u2019s name. Get the money dossier.<br>Every figure sourced. Nothing estimated. Nothing invented.</div>'
      + '</div>'
      + '<div style="position:relative;max-width:520px;margin:0 auto;">'
      + '<input id="pf-receipt-q" type="text" autocomplete="off" placeholder="e.g. Bernie Sanders" aria-label="Politician name"'
      + ' style="width:100%;box-sizing:border-box;background:#fff;border:2px solid ' + INK + ';color:' + INK
      + ';padding:14px 16px;font-size:17px;border-radius:3px;outline:none;">'
      + '<div id="pf-receipt-ta" style="position:absolute;top:100%;left:0;right:0;z-index:20;display:none;background:#fff;border:2px solid ' + HAIR + ';border-top:0;border-radius:0 0 3px 3px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.08);"></div>'
      + '</div>'
      + '<div style="text-align:center;margin-top:12px;">'
      + '<button id="pf-receipt-go" type="button" style="background:' + RED + ';border:2px solid ' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;padding:12px 34px;font-size:15px;cursor:pointer;border-radius:3px;">PULL THE RECEIPT</button>'
      + '</div>'
      + '<div id="pf-receipt-out" style="margin-top:22px;"></div>'
      + '</div>';
  }

  /* Receipt-paper section card: native <details>, collapsed on mobile. */
  var MOBILE_COLLAPSE = isMobile();
  function sectionCard(title, inner, stamp) {
    return '<details' + (MOBILE_COLLAPSE ? '' : ' open') + ' style="background:' + PAPER
      + ';border:1px solid ' + HAIR + ';border-radius:3px;margin:0 0 10px;overflow:hidden;">'
      + '<summary style="list-style:none;cursor:pointer;padding:13px 16px;font-size:12px;font-weight:900;letter-spacing:3px;color:' + RED
      + ';border-bottom:2px dashed ' + DASH + ';outline:none;">'
      + '<span class="pf-r-chev" style="display:inline-block;margin-right:8px;transition:transform .15s;color:' + MUTED + ';">\u25b8</span>' + esc(title) + '</summary>'
      + '<div style="padding:14px 16px;">' + inner
      + (stamp ? '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed ' + DASH + ';font-size:11px;color:' + MUTED + ';line-height:1.6;">'
        + '<div>SOURCE: ' + esc(stamp.source || '') + '</div>'
        + '<div>' + esc(stamp.staleness || '') + (stamp.rail ? ' · ' + esc(stamp.rail) : '') + '</div></div>' : '')
      + '</div></details>';
  }
  function emptyCard(title, sec) {
    var note = sec.note || 'Not yet tracked — coming soon.';
    return sectionCard(title,
      '<div style="font-size:13px;font-weight:800;letter-spacing:2px;color:' + MUTED + ';margin-bottom:6px;">NOT YET TRACKED — COMING SOON</div>'
      + '<div style="font-size:14px;color:' + MUTED + ';line-height:1.6;">' + esc(note) + '</div>',
      { source: sec.source, staleness: sec.staleness, rail: sec.rail_status });
  }
  function moneyLine(label, val) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed ' + DASH + ';font-size:14px;">'
      + '<span style="color:' + MUTED + ';">' + esc(label) + '</span>'
      + '<span style="font-weight:800;color:' + INK + ';font-family:' + MONO + ';">' + esc(val == null ? '—' : val) + '</span></div>';
  }
  function wireDetails(host) {
    /* Chevron rotation on toggle (cosmetic only — native <details> does the work). */
    host.querySelectorAll('details').forEach(function (el) {
      el.addEventListener('toggle', function () {
        var ch = el.querySelector('.pf-r-chev');
        if (ch) ch.style.transform = el.open ? 'rotate(90deg)' : 'rotate(0deg)';
        try {
          var s = el.querySelector('summary');
          if (s) s.setAttribute('aria-expanded', el.open ? 'true' : 'false');
        } catch (e) {}
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Dossier render — headline first (always visible), sections stagger */
  /* ---------------------------------------------------------------- */
  var lastDossier = null;

  function renderHeadline(host, d) {
    var r = d.resolved, h = d.headline;
    var party = r.party ? ' · ' + r.party : '';
    var office = r.office === 'S' ? 'U.S. Senate' : r.office === 'H' ? 'U.S. House' : '';
    var html = '<div style="background:' + PAPER + ';border:1px solid ' + HAIR + ';border-top:4px solid ' + RED
      + ';border-radius:3px;padding:22px 20px;text-align:center;margin-bottom:12px;">'
      + '<div style="font-size:11px;letter-spacing:4px;color:' + RED + ';font-weight:800;margin-bottom:10px;">ITEMIZED RECEIPT</div>'
      + '<div style="font-size:27px;font-weight:900;letter-spacing:.5px;">' + esc(r.display_name) + '</div>'
      + '<div style="font-size:13px;color:' + MUTED + ';margin:6px 0 16px;">' + esc(office + (r.state ? ' · ' + r.state : '') + party) + '</div>'
      + '<div style="border-top:2px dashed ' + DASH + ';border-bottom:2px dashed ' + DASH + ';padding:14px 0;margin:0 -20px 16px;">';
    if (h.money_live && h.total_raised_display) {
      html += '<div style="font-size:12px;letter-spacing:3px;color:' + MUTED + ';margin-bottom:6px;">RAISED · 2026 CYCLE</div>'
        + '<div style="font-size:44px;font-weight:900;color:' + RED + ';font-family:' + MONO + ';letter-spacing:-1px;">' + esc(h.total_raised_display) + '</div>';
    } else {
      html += '<div style="font-size:14px;color:' + MUTED + ';font-family:' + MONO + ';">FUNDRAISING — NOT YET LIVE<br><span style="font-size:12px;">the FEC key hand-step is still open</span></div>';
    }
    html += '</div>';
    /* Top industries — always headline-visible, honestly labeled. */
    if (h.top_industries && h.top_industries.length) {
      html += '<div style="text-align:left;margin-bottom:14px;">'
        + '<div style="font-size:11px;letter-spacing:3px;color:' + RED + ';font-weight:800;margin-bottom:6px;">TOP INDUSTRIES</div>';
      h.top_industries.forEach(function (t) {
        html += '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed ' + DASH + ';font-size:13px;">'
          + '<span>' + esc(t.industry) + ' <span style="color:' + MUTED + ';">(est.)</span></span>'
          + '<span style="font-weight:800;font-family:' + MONO + ';">' + esc(t.total_receipts_display || '?') + '</span></div>';
      });
      html += '<div style="font-size:11px;color:' + MUTED + ';margin-top:6px;line-height:1.5;">Cycle-wide totals, estimated — the national money picture, not this person.</div></div>';
    }
    /* Trade count — honest when the rail is parked. */
    html += '<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding-top:2px;">'
      + '<span style="color:' + MUTED + ';">STOCK TRADES</span>'
      + '<span style="font-weight:800;color:' + MUTED + ';font-family:' + MONO + ';">not yet tracked</span></div>'
      + '</div>';
    host.insertAdjacentHTML('beforeend', html);
  }

  /* Sticky web: the dossier's natural neighbors. Receipt -> Town -> Index
     through relevance, not funnels. */
  function renderNeighbors(host, d) {
    var r = d.resolved, slug = slugify(r.display_name);
    var name = esc(r.display_name);
    function linkCard(href, icon, title, copy) {
      return '<a href="' + href + '" style="display:block;background:' + PAPER + ';border:1px solid ' + HAIR
        + ';border-radius:3px;padding:14px 16px;margin:0 0 10px;text-decoration:none;color:' + INK + ';">'
        + '<div style="font-size:12px;font-weight:900;letter-spacing:2px;color:' + RED + ';margin-bottom:6px;">'
        + icon + ' ' + esc(title) + '</div>'
        + '<div style="font-size:14px;line-height:1.5;">' + copy + '</div>'
        + '<div style="font-size:12px;color:' + MUTED + ';margin-top:6px;">' + esc(href) + ' \u2192</div></a>';
    }
    var html = '<div style="margin:4px 0 16px;">'
      + '<div style="font-size:12px;letter-spacing:4px;color:' + MUTED + ';font-weight:800;text-align:center;margin-bottom:12px;">KEEP DIGGING</div>'
      + linkCard('/town', '\uD83C\uDFD8\uFE0F', 'WHO OWNS YOUR TOWN',
        'Power starts local. Type a zip — see who owns the backyard '
        + (r.state ? 'back in <strong>' + esc(r.state) + '</strong>' : 'back home') + '.')
      + linkCard('/index?name=' + encodeURIComponent(slug), '\uD83D\uDCCA', 'THE CORRUPTION INDEX',
        'How captured is <strong>' + name + '</strong> by money? See the score.')
      + linkCard('/extraction', '\uD83C\uDFED', 'THE EXTRACTION ENGINE',
        'The companies behind the money — extraction stories, fully sourced.')
      + linkCard('/dossier', '\uD83D\uDCDD', 'BUILD A DOSSIER',
        'Add your context to this Receipt — publish your own annotated dossier page.')
      + '</div>';
    host.insertAdjacentHTML('beforeend', html);
  }

  /* ---------------------------------------------------------------- */
  /* Flow 1 (cross-data): THEIR DISTRICT — the dossier embeds real town  */
  /* data for the politician's turf (backend section their_district).     */
  /* ---------------------------------------------------------------- */
  var TOWN_CARD_ORDER = ['wages_rent', 'landlords', 'eviction', 'police',
    'pollution', 'hospitals', 'federal'];

  function districtCard(d) {
    var td = d.sections ? d.sections.their_district : null;
    if (!td) return '';
    var title = td.district_label
      ? 'THEIR DISTRICT — ' + td.district_label
      : 'THEIR STATE — ' + (d.resolved && d.resolved.state ? d.resolved.state : '');
    if (td.status !== 'live' || !td.town) {
      return emptyCard(title, {
        note: (td.note || 'District town data is not available yet.') +
          ' The district crosswalk fills this in automatically — nothing estimated.',
        source: td.source, staleness: td.staleness, rail_status: td.rail_status
      });
    }
    var t = td.town;
    var area = t.area ? t.area.coarse_area : '';
    var inner = '<div style="font-size:14px;line-height:1.6;margin-bottom:10px;">' +
      esc(td.note || '') + '</div>';
    /* Top live town findings — real town_power data, source-stamped. */
    var shown = 0;
    TOWN_CARD_ORDER.forEach(function (k) {
      if (shown >= 3) return;
      var c = t.cards ? t.cards[k] : null;
      if (!c || !c.live || !c.headline) return;
      shown++;
      var src = c.source
        ? esc(c.source.name + (c.source.period ? ' · ' + c.source.period : '') +
          (c.source.retrieved && c.source.retrieved !== 'unknown' ? ' · retrieved ' + c.source.retrieved : ''))
        : 'Source: not yet published';
      inner += '<div style="border-top:1px dashed ' + DASH + ';padding:10px 0;">' +
        '<div style="font-size:11px;letter-spacing:2px;color:' + MUTED + ';font-weight:800;">' +
        esc((c.headline_label || k).toUpperCase()) + '</div>' +
        '<div style="font-size:22px;font-weight:900;font-family:' + MONO + ';margin:2px 0;">' +
        esc(c.headline) + '</div>' +
        '<div style="font-size:11px;color:' + MUTED + ';">' + src + '</div></div>';
    });
    if (!shown) {
      inner += '<div style="font-size:13px;color:' + MUTED + ';">Town rails are still landing for this area — ' +
        'the district is mapped, the numbers are coming.</div>';
    }
    /* Other district zips + full town report link. */
    var zips = (td.zips || []).map(function (z) {
      return '<a href="' + esc(z.town_url || ('/town?zip=' + z.zip5)) + '"' +
        ' style="display:inline-block;margin:4px 6px 0 0;padding:8px 14px;border:1px solid ' + HAIR +
        ';border-radius:3px;font-size:13px;font-weight:700;color:' + INK + ';text-decoration:none;' +
        (z.primary ? 'background:' + PAPER + ';border:2px solid ' + RED + ';' : 'background:#fff;') + '">' +
        esc(z.zip5) + (z.primary ? ' ★' : '') + '</a>';
    }).join('');
    inner += '<div style="margin-top:10px;"><div style="font-size:11px;letter-spacing:2px;color:' + MUTED +
      ';font-weight:800;margin-bottom:4px;">DISTRICT ZIPS' + (area ? ' · ' + esc(area) : '') + '</div>' + zips + '</div>';
    inner += '<div style="margin-top:12px;text-align:center;"><a href="/town?zip=' + esc(td.zips[0].zip5) + '"' +
      ' style="display:inline-block;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;' +
      'padding:12px 26px;font-size:14px;text-decoration:none;border-radius:3px;">SEE THE FULL TOWN REPORT →</a></div>';
    return sectionCard(title, inner,
      { source: td.source, staleness: td.staleness, rail: td.rail_status });
  }

  function renderSections(host, d) {
    var S = d.sections, cards = [];
    /* Flow 1: their district first — the dossier shows their backyard. */
    cards.push(districtCard(d));
    /* Money in */
    if (S.money_in.status === 'live') {
      var m = S.money_in.data;
      cards.push(sectionCard('MONEY IN — FUNDRAISING',
        '<div style="font-size:15px;font-weight:800;margin-bottom:8px;">' + esc(m.headline || '') + '</div>'
        + moneyLine('Raised', m.receipts_display)
        + moneyLine('Spent', m.disbursements_display)
        + moneyLine('Cash on hand', m.cash_on_hand_display),
        { source: S.money_in.source, staleness: S.money_in.staleness, rail: S.money_in.rail_status }));
    } else {
      cards.push(emptyCard('MONEY IN — FUNDRAISING', S.money_in));
    }
    /* Industries */
    if (S.industries.status === 'live') {
      var rows = S.industries.data.top.map(function (x) {
        return moneyLine(x.industry + ' (est.)', x.total_receipts_display);
      }).join('');
      cards.push(sectionCard('TOP INDUSTRIES — CYCLE-WIDE',
        '<div style="font-size:13px;color:' + MUTED + ';margin-bottom:8px;line-height:1.5;">'
        + 'The national money picture this cycle. Candidate-level industry breakdowns are not yet tracked — '
        + 'these figures describe the whole cycle, <strong>not this person</strong>.</div>' + rows,
        { source: S.industries.source, staleness: S.industries.staleness, rail: S.industries.rail_status }));
    } else {
      cards.push(emptyCard('TOP INDUSTRIES', S.industries));
    }
    /* Wave-3 honest empties */
    cards.push(emptyCard('LOBBYIST TIES', S.lobbying));
    cards.push(emptyCard('STOCK TRADES', S.trades));
    cards.push(emptyCard('VOTES', S.votes));
    cards.push(emptyCard('BILLS SPONSORED', S.bills));

    /* Stagger on idle: hero + headline paint first, sections stream in. */
    var i = 0;
    function next() {
      if (i >= cards.length) {
        renderNeighbors(host, d);
        renderShareBtn(host, d);
        wireDetails(host);
        return;
      }
      host.insertAdjacentHTML('beforeend', cards[i++]);
      if (window.requestIdleCallback) { window.requestIdleCallback(next, { timeout: 800 }); }
      else { setTimeout(next, 60); }
    }
    next();
  }

  function renderShareBtn(host, d) {
    var h = d.headline;
    var canShare = h.money_live || (h.top_industries && h.top_industries.length);
    var btnAttrs = canShare
      ? ' style="background:' + RED + ';border:2px solid ' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;padding:14px 40px;font-size:16px;cursor:pointer;border-radius:3px;"'
      : ' disabled style="opacity:.45;cursor:not-allowed;background:' + RED + ';border:2px solid ' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;padding:14px 40px;font-size:16px;border-radius:3px;"';
    var html = '<div style="text-align:center;margin:8px 0 30px;" data-mss-slot>'
      + '<button id="pf-receipt-share" type="button"' + btnAttrs + '>'
      + 'GET THE RECEIPT</button>'
      + (canShare ? ' <button id="pf-receipt-mss" type="button" class="pf-mss-btn">MAKE SHAREABLE</button>' : '')
      + (canShare ? '' : '<div style="font-size:13px;color:' + MUTED + ';margin-top:8px;">Nothing to share yet — the dossier is still all honest-empty.</div>')
      + '</div>';
    host.insertAdjacentHTML('beforeend', html);
    var btn = host.querySelector('#pf-receipt-share');
    if (btn && canShare) {
      btn.addEventListener('click', function () { shareReceipt(d); });
    }
    /* MAKE SHAREABLE (fe/make-shareable-inline, 2026-10-07): inline Studio
       creation panel on every dossier — preview via this dossier's own
       1080x1350 painter, caption line, one-tap publish to the UGC feed +
       native share sheet. No page navigation. */
    var mss = host.querySelector('#pf-receipt-mss');
    if (mss && canShare) {
      mss.addEventListener('click', function () { openMakeShareable(d); });
    }
  }

  function openMakeShareable(d) {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M || !d || !d.resolved) return;
    var slug = slugify(d.resolved.display_name);
    M.openPanel({
      kind: 'receipt', ref: slug,
      title: 'THE RECEIPT: ' + d.resolved.display_name,
      deep: '/receipt/' + slug, game: 'receipt'
    });
  }

  /* Register this product's painter with the inline panel (once): the
     resolver closes over lastDossier — one dossier is live at a time. */
  function wireMakeShareable() {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M || M._pfReceiptWired) return;
    M._pfReceiptWired = true;
    M.registerResolver('receipt', function (unit, done) {
      var d = lastDossier;
      if (!d || !d.resolved) { try { done(null); } catch (e) {} return; }
      var cv = null;
      try { cv = paintReceipt(d); } catch (e) {}
      try { done(cv); } catch (e2) {}
    });
  }

  function renderDisambiguation(host, d) {
    var html = '<div style="background:' + PAPER + ';border:2px solid ' + RED + ';border-radius:3px;padding:18px;margin-bottom:14px;">'
      + '<div style="font-size:14px;font-weight:900;letter-spacing:2px;margin-bottom:10px;color:' + RED + ';">DID YOU MEAN…</div>';
    d.disambiguation.forEach(function (m) {
      html += '<button type="button" data-pf-receipt-pick="' + esc(m.display_name) + '"'
        + ' style="display:block;width:100%;text-align:left;background:#fff;border:1px solid ' + HAIR + ';color:' + INK
        + ';padding:10px 12px;margin:6px 0;font-size:15px;cursor:pointer;border-radius:3px;">'
        + esc(m.display_name) + ' <span style="color:' + MUTED + ';font-size:12px;">'
        + esc((m.office === 'S' ? 'Senate' : m.office === 'H' ? 'House' : '') + (m.state ? ' · ' + m.state : '')) + '</span></button>';
    });
    html += '</div>';
    host.insertAdjacentHTML('beforeend', html);
    host.querySelectorAll('[data-pf-receipt-pick]').forEach(function (b) {
      b.addEventListener('click', function () { loadDossier(b.getAttribute('data-pf-receipt-pick')); });
    });
  }

  function renderSuggestions(host, d) {
    if (!d.suggestions || !d.suggestions.length) {
      host.insertAdjacentHTML('beforeend',
        '<div style="text-align:center;color:' + MUTED + ';font-size:14px;padding:18px;">'
        + 'No match in the index yet. The name index grows as the FEC rail ingests — check back.</div>');
      return;
    }
    var html = '<div style="text-align:center;color:' + MUTED + ';font-size:14px;margin-bottom:8px;">No exact match. Did you mean…</div>';
    d.suggestions.forEach(function (m) {
      html += '<div style="text-align:center;"><button type="button" data-pf-receipt-pick="' + esc(m.display_name) + '"'
        + ' style="background:' + PAPER + ';border:2px solid ' + RED + ';color:' + INK + ';padding:10px 22px;margin:5px;font-size:15px;font-weight:700;cursor:pointer;border-radius:3px;">'
        + esc(m.display_name) + '</button></div>';
    });
    host.insertAdjacentHTML('beforeend', html);
    host.querySelectorAll('[data-pf-receipt-pick]').forEach(function (b) {
      b.addEventListener('click', function () { loadDossier(b.getAttribute('data-pf-receipt-pick')); });
    });
  }

  function loadDossier(name) {
    var out = document.getElementById('pf-receipt-out');
    if (!out) return;
    out.innerHTML = '<div style="text-align:center;color:' + MUTED + ';font-size:14px;padding:26px;">Pulling the receipt…</div>';
    try {
      var slug = slugify(name);
      var url = '/receipt/' + slug;
      if (window.history && window.history.replaceState && location.pathname !== url) {
        window.history.replaceState(null, '', url);
      }
    } catch (e) {}
    api('receipt_dossier', { name: name }, function (d) {
      if (!d || !d.ok) {
        out.innerHTML = '<div style="text-align:center;color:' + MUTED + ';font-size:14px;padding:26px;">'
          + 'The receipt machine hiccuped. <button type="button" id="pf-receipt-retry" style="background:' + RED
          + ';border:0;color:#fff;font-weight:800;padding:8px 18px;cursor:pointer;border-radius:3px;">RETRY</button></div>';
        var rb = document.getElementById('pf-receipt-retry');
        if (rb) rb.addEventListener('click', function () { loadDossier(name); });
        return;
      }
      lastDossier = d;
      out.innerHTML = '';
      if (d.disambiguation) { renderDisambiguation(out, d); return; }
      if (!d.resolved) { renderSuggestions(out, d); return; }
      renderHeadline(out, d);
      renderSections(out, d);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Typeahead                                                         */
  /* ---------------------------------------------------------------- */
  function wireTypeahead() {
    var input = document.getElementById('pf-receipt-q');
    var ta = document.getElementById('pf-receipt-ta');
    var go = document.getElementById('pf-receipt-go');
    if (!input || !ta || !go) return;
    var timer = null, lastQ = '';
    function hide() { ta.style.display = 'none'; ta.innerHTML = ''; }
    function pick(name) { hide(); input.value = name; loadDossier(name); }
    go.addEventListener('click', function () {
      var v = input.value.trim();
      if (v) pick(v);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var v = input.value.trim(); if (v) pick(v); }
      if (e.key === 'Escape') hide();
    });
    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < 2 || q === lastQ) { if (q.length < 2) hide(); return; }
      timer = setTimeout(function () {
        lastQ = q;
        api('receipt_search', { q: q }, function (r) {
          if (!r || !r.ok || !r.matches || !r.matches.length) { hide(); return; }
          if (document.activeElement !== input) return;
          var html = '';
          r.matches.slice(0, 7).forEach(function (m) {
            html += '<button type="button" data-pf-ta="' + esc(m.display_name) + '"'
              + ' style="display:block;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px dashed ' + DASH + ';color:' + INK
              + ';padding:11px 14px;font-size:15px;cursor:pointer;">' + esc(m.display_name)
              + ' <span style="color:' + MUTED + ';font-size:12px;">'
              + esc((m.office === 'S' ? 'Senate' : m.office === 'H' ? 'House' : '') + (m.state ? ' · ' + m.state : '')) + '</span></button>';
          });
          ta.innerHTML = html;
          ta.style.display = 'block';
          ta.querySelectorAll('[data-pf-ta]').forEach(function (b) {
            b.addEventListener('mousedown', function (e) {
              e.preventDefault();
              pick(b.getAttribute('data-pf-ta'));
            });
          });
        });
      }, 220);
    });
    document.addEventListener('click', function (e) {
      try { if (!ta.contains(e.target) && e.target !== input) hide(); } catch (x) { hide(); }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Share image — 1080x1350 canvas, client-side from the dossier JSON */
  /* ---------------------------------------------------------------- */
  function wrap(x, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function paintReceipt(d) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    var r = d.resolved, h = d.headline, S = d.sections;
    /* ---- butter: editorial kit (factgen standard) ---- */
    var btR='#c1121f', btRD='#7d0b16', btC='#f2ecdc', btG='#c9a227',
        btM='#a89a7d', btF='#6f6350';
    x.fillStyle = '#0e0d0c'; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.032; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
    for (var btD = -H; btD < W + H; btD += 26) {
      x.beginPath(); x.moveTo(btD, 0); x.lineTo(btD + H, H); x.stroke();
    }
    x.restore();
    var btVg = x.createRadialGradient(W/2, H*0.40, H*0.16, W/2, H*0.50, H*0.85);
    btVg.addColorStop(0, 'rgba(0,0,0,0)'); btVg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = btVg; x.fillRect(0, 0, W, H);
    var btBar = x.createLinearGradient(0, 0, 0, 10);
    btBar.addColorStop(0, btR); btBar.addColorStop(1, btRD);
    x.fillStyle = btBar; x.fillRect(0, 0, W, 10);
    x.save(); x.globalAlpha = 0.05; x.fillStyle = btC;
    x.font = '900 620px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText('★', W/2, H*0.60); x.restore();
    x.textAlign = 'center';
    var y = 130;
    /* kicker: letterspaced gold */
    x.fillStyle = btG; x.font = '700 27px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch (e) {}
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 64;
    try { x.letterSpacing = '0px'; } catch (e2) {}
    y += 30;
    x.strokeStyle = 'rgba(201,162,39,0.5)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(W/2 - 150, y); x.lineTo(W/2 + 150, y); x.stroke();
    y += 78;
    /* masthead: monumental serif, red gradient */
    x.font = '900 68px Georgia,"Times New Roman",serif';
    var btFg = x.createLinearGradient(0, y - 68, 0, y);
    btFg.addColorStop(0, '#e63946'); btFg.addColorStop(1, btRD);
    x.fillStyle = btFg;
    x.fillText('THE RECEIPT', W / 2, y); y += 112;
    x.fillStyle = btC; x.font = '900 74px Georgia,"Times New Roman",serif';
    wrap(x, r.display_name.toUpperCase(), W - 170).slice(0, 2).forEach(function (l) {
      x.fillText(l, W / 2, y); y += 84;
    });
    var sub = (r.office === 'S' ? 'U.S. SENATE' : r.office === 'H' ? 'U.S. HOUSE' : '')
      + (r.state ? ' \u00b7 ' + r.state : '') + (r.party ? ' \u00b7 ' + r.party : '');
    y += 10;
    x.fillStyle = btM; x.font = '700 30px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e3) {}
    x.fillText(sub, W / 2, y);
    try { x.letterSpacing = '0px'; } catch (e4) {}
    y += 96;
    /* red diamond rule */
    x.strokeStyle = btR; x.lineWidth = 2;
    x.beginPath(); x.moveTo(W/2 - 190, y); x.lineTo(W/2 - 26, y); x.stroke();
    x.beginPath(); x.moveTo(W/2 + 26, y); x.lineTo(W/2 + 190, y); x.stroke();
    x.save(); x.translate(W/2, y); x.rotate(Math.PI/4);
    x.fillStyle = btR; x.fillRect(-9, -9, 18, 18); x.restore();
    y += 64;

    /* Top 5 lines: money facts first, then industries. */
    var lines = [];
    if (h.money_live && h.total_raised_display) {
      lines.push('RAISED ' + h.total_raised_display + ' IN 2026');
    }
    if (S.money_in.status === 'live' && S.money_in.data) {
      var m = S.money_in.data;
      if (m.cash_on_hand_display) lines.push('SITTING ON ' + m.cash_on_hand_display + ' CASH');
      if (m.disbursements_display) lines.push('SPENT ' + m.disbursements_display);
    }
    (h.top_industries || []).slice(0, 3).forEach(function (t) {
      lines.push('TOOK ' + (t.total_receipts_display || '?') + ' FROM ' + String(t.industry).toUpperCase() + '*');
    });
    lines = lines.slice(0, 5);
    x.fillStyle = btC; x.font = '700 40px Georgia,"Times New Roman",serif';
    lines.forEach(function (l) {
      wrap(x, l, W - 200).slice(0, 2).forEach(function (wl) { x.fillText(wl, W / 2, y); y += 56; });
      y += 14;
    });
    y += 26;
    x.fillStyle = btM; x.font = 'italic 400 28px Georgia,serif';
    x.fillText('* cycle-wide industry totals, estimated —', W / 2, y); y += 42;
    x.fillText('candidate-level breakdowns not yet tracked.', W / 2, y); y += 62;
    /* source citation: hairline box */
    var src = S.money_in.source || 'FEC';
    x.font = '700 24px Arial,sans-serif';
    try { x.letterSpacing = '3px'; } catch (e5) {}
    var btSrc = 'SOURCES: ' + String(src).toUpperCase().slice(0, 40);
    var btSw = Math.min(x.measureText(btSrc).width + 90, W - 200);
    x.strokeStyle = 'rgba(242,236,220,0.35)'; x.lineWidth = 1.5;
    x.strokeRect(W/2 - btSw/2, y, btSw, 54);
    x.fillStyle = btC;
    x.fillText(btSrc, W / 2, y + 37);
    try { x.letterSpacing = '0px'; } catch (e6) {}
    y += 96;

    /* ---- butter footer: CTA standard ---- */
    var fy = H - 235;
    x.strokeStyle = 'rgba(201,162,39,0.45)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(120, fy); x.lineTo(W - 120, fy); x.stroke();
    fy += 58;
    x.font = '900 44px Arial,sans-serif'; x.fillStyle = btC;
    try { x.letterSpacing = '8px'; } catch (e7) {}
    var btCta = 'JOIN THE FIGHT';
    var btCtaW = x.measureText(btCta).width;
    x.fillText(btCta, W / 2, fy);
    x.fillStyle = btR; x.fillText('.', W / 2 + btCtaW/2 - 4, fy);
    try { x.letterSpacing = '0px'; } catch (e8) {}
    fy += 52;
    x.fillStyle = btR; x.font = '900 32px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch (e9) {}
    x.fillText('MTCSTW.COM', W / 2, fy);
    try { x.letterSpacing = '0px'; } catch (e10) {}
    fy += 40;
    x.fillStyle = btF; x.font = '400 26px Arial,sans-serif';
    x.fillText('mtcstw.com/receipt/' + slugify(r.display_name), W / 2, fy);
    var btBar2 = x.createLinearGradient(0, H - 10, 0, H);
    btBar2.addColorStop(0, btRD); btBar2.addColorStop(1, btR);
    x.fillStyle = btBar2; x.fillRect(0, H - 10, W, 10);
    return cv;
  }
  /* Flow 3 (cross-data): log the dossier share so the movement feed can
     rank "top Receipt dossiers by shares". Best-effort, fail-soft, never
     blocks the share; uses the existing share_log POST (spread rail). */
  function logReceiptShare(slug) {
    try {
      var cs = '';
      try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
      var body = JSON.stringify({ type: 'spread', sp_action: 'share_log',
        content_id: 'receipt:' + slug, sharer: cs || 'anon', cell_id: '' });
      var post = function () {
        try {
          if (window.PF && window.PF.authPost && cs) {
            window.PF.authPost(BACKEND, JSON.parse(body), function () {});
            return;
          }
          fetch(BACKEND, { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: body,
            keepalive: true }).catch(function () {});
        } catch (e) {}
      };
      if (document.readyState === 'complete') post();
      else { try { window.addEventListener('load', post); } catch (e) { post(); } }
    } catch (e) {}
  }

  function shareReceipt(d) {
    var cv = paintReceipt(d);
    if (!cv) { try { if (PF && PF.toast) PF.toast('Poster failed — try again.'); } catch (e) {} return; }
    var slug = slugify(d.resolved.display_name);
    try {
      if (window.PFShare && window.PFShare.shareImage) {
        /* Native share sheet w/ download fallback; fires pf-share-image so
           the share counts through the existing XP mechanics. */
        window.PFShare.shareImage(cv, 'pfn-receipt-' + slug + '.png',
          'THE RECEIPT: ' + d.resolved.display_name, 'receipt');
        logReceiptShare(slug);
      }
    } catch (e) { err('share failed: ' + (e && e.message)); }
  }

  /* ---------------------------------------------------------------- */
  /* Mount                                                             */
  /* ---------------------------------------------------------------- */
  function mount() {
    var host = document.getElementById('pf-receipt');
    if (!host || host.getAttribute('data-pf-receipt-mounted')) return;
    host.setAttribute('data-pf-receipt-mounted', '1');
    host.insertAdjacentHTML('afterbegin', shellHTML());
    wireTypeahead();
    wireMakeShareable();
    /* Deep link: /receipt/<slug> auto-loads that dossier. */
    try {
      var m = (location.pathname || '').match(/\/receipt\/([a-z0-9-]+)\/?$/);
      if (m && m[1]) {
        var q = document.getElementById('pf-receipt-q');
        var name = unslugify(m[1]);
        if (q) q.value = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        loadDossier(name);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  /* Late-mount guard: the footer loader may inject #pf-receipt after us. */
  setTimeout(mount, 1500);
})();
