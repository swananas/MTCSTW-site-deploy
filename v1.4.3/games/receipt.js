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

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';
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
    return '<div class="pf-receipt" style="max-width:760px;margin:0 auto;' + FONT + 'color:' + CREAM + ';">'
      + '<div style="text-align:center;margin:6px 0 18px;">'
      + '<div style="font-size:13px;letter-spacing:5px;color:' + RED + ';font-weight:800;margin-bottom:10px;">FOLLOW THE MONEY</div>'
      + '<div style="font-size:22px;font-weight:900;letter-spacing:1px;margin-bottom:8px;">WHO DO YOU WANT THE RECEIPT ON?</div>'
      + '<div style="font-size:14px;color:' + MUTED + ';line-height:1.5;">Type a politician\u2019s name. Get the money dossier.<br>Every figure sourced. Nothing estimated. Nothing invented.</div>'
      + '</div>'
      + '<div style="position:relative;max-width:520px;margin:0 auto;">'
      + '<input id="pf-receipt-q" type="text" autocomplete="off" placeholder="e.g. Bernie Sanders" aria-label="Politician name"'
      + ' style="width:100%;box-sizing:border-box;background:#141414;border:2px solid ' + RED + ';color:' + CREAM
      + ';padding:14px 16px;font-size:17px;border-radius:3px;outline:none;">'
      + '<div id="pf-receipt-ta" style="position:absolute;top:100%;left:0;right:0;z-index:20;display:none;background:#141414;border:2px solid #333;border-top:0;border-radius:0 0 3px 3px;overflow:hidden;"></div>'
      + '</div>'
      + '<div style="text-align:center;margin-top:12px;">'
      + '<button id="pf-receipt-go" type="button" style="background:' + RED + ';border:2px solid ' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;padding:12px 34px;font-size:15px;cursor:pointer;border-radius:3px;">PULL THE RECEIPT</button>'
      + '</div>'
      + '<div id="pf-receipt-out" style="margin-top:22px;"></div>'
      + '</div>';
  }

  function sectionCard(title, inner, stamp) {
    return '<section style="background:' + BLACK + ';border:2px solid #2a2a2a;border-top:4px solid ' + RED
      + ';border-radius:3px;padding:16px 18px;margin:0 0 14px;">'
      + '<div style="font-size:12px;font-weight:900;letter-spacing:3px;color:' + RED + ';margin-bottom:10px;">' + esc(title) + '</div>'
      + inner
      + (stamp ? '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #2a2a2a;font-size:11px;color:' + MUTED + ';line-height:1.6;">'
        + '<div>SOURCE: ' + esc(stamp.source || '') + '</div>'
        + '<div>' + esc(stamp.staleness || '') + (stamp.rail ? ' · ' + esc(stamp.rail) : '') + '</div></div>' : '')
      + '</section>';
  }
  function emptyCard(title, sec) {
    var note = sec.note || 'Not yet tracked — coming soon.';
    return sectionCard(title,
      '<div style="font-size:14px;color:' + MUTED + ';line-height:1.6;">'
      + '<div style="font-size:13px;font-weight:800;letter-spacing:2px;color:' + CREAM + ';margin-bottom:6px;">NOT YET TRACKED — COMING SOON</div>'
      + esc(note) + '</div>',
      { source: sec.source, staleness: sec.staleness, rail: sec.rail_status });
  }
  function moneyLine(label, val) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #1e1e1e;font-size:14px;">'
      + '<span style="color:' + MUTED + ';">' + esc(label) + '</span>'
      + '<span style="font-weight:800;color:' + CREAM + ';">' + esc(val == null ? '—' : val) + '</span></div>';
  }

  /* ---------------------------------------------------------------- */
  /* Dossier render (sections stagger on idle — butter rule)           */
  /* ---------------------------------------------------------------- */
  var lastDossier = null;

  function renderHeadline(host, d) {
    var r = d.resolved, h = d.headline;
    var party = r.party ? ' · ' + r.party : '';
    var office = r.office === 'S' ? 'U.S. Senate' : r.office === 'H' ? 'U.S. House' : '';
    var html = '<div style="background:linear-gradient(180deg,#161616,#0b0b0b);border:3px solid ' + RED
      + ';border-radius:3px;padding:20px;text-align:center;margin-bottom:16px;">'
      + '<div style="font-size:12px;letter-spacing:4px;color:' + RED + ';font-weight:800;margin-bottom:8px;">THE RECEIPT</div>'
      + '<div style="font-size:26px;font-weight:900;letter-spacing:1px;">' + esc(r.display_name).toUpperCase() + '</div>'
      + '<div style="font-size:13px;color:' + MUTED + ';margin:6px 0 14px;">' + esc(office + (r.state ? ' · ' + r.state : '') + party) + '</div>';
    if (h.money_live && h.total_raised_display) {
      html += '<div style="font-size:15px;color:' + MUTED + ';margin-bottom:4px;">RAISED IN ' + 2026 + '</div>'
        + '<div style="font-size:38px;font-weight:900;color:' + RED + ';">' + esc(h.total_raised_display) + '</div>';
    } else {
      html += '<div style="font-size:14px;color:' + MUTED + ';">Fundraising figures not yet live — the FEC key hand-step is still open.</div>';
    }
    html += '</div>';
    host.insertAdjacentHTML('beforeend', html);
  }

  function renderSections(host, d) {
    var S = d.sections, cards = [];
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
      if (i >= cards.length) { renderShareBtn(host, d); return; }
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
    var html = '<div style="text-align:center;margin:8px 0 30px;">'
      + '<button id="pf-receipt-share" type="button"' + btnAttrs + '>'
      + 'GET THE RECEIPT</button>'
      + (canShare ? '' : '<div style="font-size:13px;color:' + MUTED + ';margin-top:8px;">Nothing to share yet — the dossier is still all honest-empty.</div>')
      + '</div>';
    host.insertAdjacentHTML('beforeend', html);
    var btn = host.querySelector('#pf-receipt-share');
    if (btn && canShare) {
      btn.addEventListener('click', function () { shareReceipt(d); });
    }
  }

  function renderDisambiguation(host, d) {
    var html = '<div style="background:' + BLACK + ';border:2px solid ' + RED + ';border-radius:3px;padding:18px;margin-bottom:14px;">'
      + '<div style="font-size:14px;font-weight:900;letter-spacing:2px;margin-bottom:10px;">DID YOU MEAN…</div>';
    d.disambiguation.forEach(function (m) {
      html += '<button type="button" data-pf-receipt-pick="' + esc(m.display_name) + '"'
        + ' style="display:block;width:100%;text-align:left;background:#141414;border:1px solid #333;color:' + CREAM
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
        + ' style="background:transparent;border:2px solid ' + RED + ';color:' + CREAM + ';padding:10px 22px;margin:5px;font-size:15px;font-weight:700;cursor:pointer;border-radius:3px;">'
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
              + ' style="display:block;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #2a2a2a;color:' + CREAM
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
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 150;
    x.fillStyle = '#f5ead6'; x.font = '700 32px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 64;
    x.fillStyle = '#c1121f'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    x.fillText('THE RECEIPT', W / 2, y); y += 110;
    x.fillStyle = '#f5ead6'; x.font = '900 72px "Arial Black",Arial,sans-serif';
    wrap(x, r.display_name.toUpperCase(), W - 170).slice(0, 2).forEach(function (l) {
      x.fillText(l, W / 2, y); y += 84;
    });
    var sub = (r.office === 'S' ? 'U.S. SENATE' : r.office === 'H' ? 'U.S. HOUSE' : '')
      + (r.state ? ' \u00b7 ' + r.state : '') + (r.party ? ' \u00b7 ' + r.party : '');
    y += 6;
    x.fillStyle = '#b8ab8e'; x.font = '700 34px Arial,sans-serif';
    x.fillText(sub, W / 2, y); y += 90;

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
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    lines.forEach(function (l) {
      wrap(x, l, W - 200).slice(0, 2).forEach(function (wl) { x.fillText(wl, W / 2, y); y += 54; });
      y += 14;
    });
    y += 30;
    x.fillStyle = '#b8ab8e'; x.font = '400 28px Arial,sans-serif';
    x.fillText('* cycle-wide industry totals, estimated —', W / 2, y); y += 40;
    x.fillText('candidate-level breakdowns not yet tracked.', W / 2, y); y += 60;
    var src = S.money_in.source || 'FEC';
    x.fillStyle = '#8a8172'; x.font = '400 26px Arial,sans-serif';
    wrap(x, 'Sources: ' + src, W - 200).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 38; });

    /* CTA standard: JOIN THE FIGHT. red bold above MTCSTW.COM */
    x.fillStyle = '#c1121f'; x.font = '900 58px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 220);
    x.fillStyle = '#f5ead6'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 150);
    x.fillStyle = '#b8ab8e'; x.font = '400 28px Arial,sans-serif';
    x.fillText('mtcstw.com/receipt/' + slugify(r.display_name), W / 2, H - 96);
    return cv;
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
