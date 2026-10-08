/* core/trades-tab.js  |  PF v1.4.3 | FOLLOW THE MONEY — legislator money tab.
   PFTradesTab.mount(bioguideId, container): four STANDALONE elements plus the
   mandatory footer — facts shown side by side, the reader connects the dots.
     1. TRADES LOG — ?action=trades_legislator: ticker, buy/sell, amount RANGE,
        trade date, disclosure date, days-to-disclose, LATE badge (>45 days),
        VIEW FILING link per row.
     2. COMMITTEE ASSIGNMENTS — member.committees (v86, public
        unitedstates/congress-legislators dataset); honest "not available"
        when the array is empty — never invented.
     3. VOTE RECORD — ?action=scorecard_get: standalone list of recorded
        positions from the seeded roll-call tables.
     4. EIGA — honest empty state: pending CEO decision, not built.
   CEO DECISION 2026-10-05 (HOLD — do NOT build):
     - No "TRADED X DAYS BEFORE THE VOTE" card or any trade-before-vote
       computed juxtaposition element. We never publish the inference.
     - No trade-before-vote auto-draft trigger.
   MANDATORY verbatim footer on the tab (CEO 2026-10-05):
     "Public records shown side by side. A contribution/trade does not prove
      it caused a vote. Sources: [links]. Figures as of [date]."
   XP: viewing = 0 (no read leg fires — two public GETs only). SHARE rides
   the EXISTING PF.PHQShare flow ('phq-trades' painter); a verified share can
   still earn through the existing server-verified create_share leg (+5,
   2/day) — no new XP code, amounts, or keys anywhere on this tab.
   Fail-soft: endpoint down / malformed response -> the mount section hides
   itself entirely, never a broken widget.
   Integration hook (Release Eng wires this from the legislator money view;
   do NOT call it from this module):
     PFTradesTab.mount(bioguideId, document.getElementById('money-tab-slot'))
   KILL: ?pf_off=trades-tab  or  localStorage pf_disabled_v1='["trades-tab"]'
   Card kill: ?pf_off=trades-card hides the SHARE button (the painter itself
   guards in share-image-phq.js). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('trades-tab')) { return; }
  if (window.pfTradesTabDone) return;
  window.pfTradesTabDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-trades';
  /* Mandatory verbatim footer (CEO 2026-10-05). Sources + date filled in
     per response; the sentence itself is never reworded. */
  var FOOTER_A = 'Public records shown side by side. A contribution/trade does not prove it caused a vote. ';
  var EIGA_MSG = 'EIGA disclosure data is pending a CEO decision — this element is not built yet. No data shown rather than partial data.';

  var SRC_URLS = {
    'U.S. House Clerk (official STOCK Act filing)': 'https://disclosures-clerk.house.gov/',
    'QuantEngines (parsed from official STOCK Act filings)': 'https://quantengines.com/'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfTrCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
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
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  var CSS = [
    '.pf-tr{max-width:680px;margin:0 auto;padding:8px 0;color:#f5ead6}',
    '.pf-tr-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#c1121f;text-align:center;margin-bottom:8px}',
    '.pf-tr-name{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;text-align:center;margin:0 0 4px}',
    '.pf-tr-sub{font:700 15px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-bottom:14px}',
    '.pf-tr-sec{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:20px 18px;margin-bottom:14px}',
    '.pf-tr-sect{font:900 17px "Arial Black",Arial,sans-serif;color:#e8b923;letter-spacing:2px;margin:0 0 12px}',
    '.pf-tr-row{display:flex;gap:10px;align-items:baseline;padding:10px 0;border-top:1px solid #2a2a2a;font:400 14px Arial,sans-serif}',
    '.pf-tr-row:first-of-type{border-top:0}',
    '.pf-tr-tick{font:900 15px "Arial Black",Arial,sans-serif;color:#f5ead6;min-width:64px}',
    '.pf-tr-side{font:700 13px Arial,sans-serif;min-width:44px}',
    '.pf-tr-side.buy{color:#7fb069}.pf-tr-side.sell{color:#c1121f}',
    '.pf-tr-amt{font:700 14px Arial,sans-serif;color:#e8b923}',
    '.pf-tr-dates{color:#c9bfa8;font-size:13px}',
    '.pf-tr-late{display:inline-block;font:900 11px "Arial Black",Arial,sans-serif;background:#c1121f;color:#fff;border-radius:4px;padding:2px 7px;margin-left:8px}',
    '.pf-tr-file{font:700 13px Arial,sans-serif;color:#f5ead6}',
    '.pf-tr-asset{color:#c9bfa8;font-size:12px;margin-top:2px}',
    '.pf-tr-com{padding:7px 0;border-top:1px solid #2a2a2a;font:400 14px Arial,sans-serif}',
    '.pf-tr-com:first-of-type{border-top:0}',
    '.pf-tr-role{font:700 12px Arial,sans-serif;color:#c1121f;margin-left:8px}',
    '.pf-tr-vote{padding:8px 0;border-top:1px solid #2a2a2a;font:400 14px Arial,sans-serif}',
    '.pf-tr-vote:first-of-type{border-top:0}',
    '.pf-tr-pos{font:900 13px "Arial Black",Arial,sans-serif}',
    '.pf-tr-pos.Yea{color:#7fb069}.pf-tr-pos.Nay{color:#c1121f}',
    '.pf-tr-empty{font:400 15px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:18px 10px}',
    '.pf-tr-foot{font:400 13px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:14px 16px;border:1px dashed #3a3a3a;border-radius:8px}',
    '.pf-tr-foot a{color:#e8b923}',
    '.pf-tr-actions{display:flex;gap:10px;justify-content:center;margin:4px 0 14px}',
    '.pf-tr-btn{font:900 15px "Arial Black",Arial,sans-serif;background:#c1121f;color:#ffffff;border:0;border-radius:6px;padding:12px 26px;cursor:pointer}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-tr-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-tr-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function chamberLabel(m) {
    var ch = String((m && m.chamber) || '').toLowerCase();
    ch = ch === 'house' || ch === 'rep' ? 'U.S. HOUSE' : (ch === 'senate' || ch === 'sen' ? 'U.S. SENATE' : String((m && m.chamber) || '—'));
    return (ch + ' · ' + String((m && m.party) || '—') + ' · ' + String((m && m.state) || '—')).toUpperCase();
  }
  function shortDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return String(iso || '—');
    var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return MON[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  /* ---- element 1: trades log ---- */
  function tradesHtml(trades) {
    if (!trades.length)
      return '<div class="pf-tr-empty">No STOCK Act trades on file for this member.</div>';
    return trades.map(function (t) {
      var side = String(t.tx_type || '').toLowerCase() === 'sell' ? 'sell' : 'buy';
      var late = t.late_filing ? '<span class="pf-tr-late">LATE FILING</span>' : '';
      return '<div class="pf-tr-row"><div style="flex:1">' +
        '<span class="pf-tr-tick">' + esc(t.ticker || '—') + '</span> ' +
        '<span class="pf-tr-side ' + side + '">' + esc(side.toUpperCase()) + '</span>' +
        '<div class="pf-tr-amt">' + esc(t.amount_range) + '</div>' +
        '<div class="pf-tr-asset">' + esc(t.asset_name) + '</div>' +
        '<div class="pf-tr-dates">Traded ' + esc(shortDate(t.tx_date)) +
        ' · Disclosed ' + esc(shortDate(t.disclosure_date)) +
        (t.days_to_disclose != null ? ' · ' + t.days_to_disclose + ' days' : '') + late + '</div>' +
        '</div><div><a class="pf-tr-file" href="' + esc(t.filing_url) +
        '" target="_blank" rel="noopener">VIEW FILING</a></div></div>';
    }).join('');
  }

  /* ---- element 2: committee assignments ---- */
  function committeesHtml(committees) {
    committees = Array.isArray(committees) ? committees : [];
    if (!committees.length)
      return '<div class="pf-tr-empty">Committee assignments not available.</div>';
    return committees.map(function (c) {
      return '<div class="pf-tr-com">' + esc(c.name) +
        (c.role ? '<span class="pf-tr-role">' + esc(String(c.role).toUpperCase()) + '</span>' : '') + '</div>';
    }).join('');
  }

  /* ---- element 3: vote record ---- */
  function votesHtml(votes) {
    votes = Array.isArray(votes) ? votes : [];
    if (!votes.length)
      return '<div class="pf-tr-empty">No vote records on file.</div>';
    var shown = votes.slice(-8).reverse(); /* most recent first, cap 8 */
    var h = shown.map(function (v) {
      return '<div class="pf-tr-vote"><span class="pf-tr-pos ' + esc(v.position) + '">' +
        esc(v.position).toUpperCase() + '</span> — <b>' + esc(v.bill_id) + '</b> ' +
        '<span style="color:#c9bfa8">' + esc(shortDate(v.vote_date)) + '</span>' +
        '<div style="color:#c9bfa8;font-size:12px;margin-top:2px">' + esc(v.question) + '</div></div>';
    }).join('');
    if (votes.length > 8)
      h += '<div class="pf-tr-empty">+' + (votes.length - 8) + ' more on record.</div>';
    return h;
  }

  /* ---- mandatory verbatim footer ---- */
  function footerHtml(tradesJ, votesJ) {
    var links = [], seen = {};
    function add(url, label) {
      if (!url || seen[url]) return;
      seen[url] = 1;
      links.push('<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>');
    }
    /* trade sources actually present in the response */
    var srcs = String((tradesJ && tradesJ.source) || '').split(';');
    for (var i = 0; i < srcs.length; i++) {
      var s = srcs[i].trim();
      if (SRC_URLS[s]) add(SRC_URLS[s], s);
    }
    /* vote-record sources: the seeded roll calls come from the official
       Clerk/Senate XML (v80 header) — link the chamber(s) actually present */
    var chs = {};
    ((votesJ && votesJ.votes) || []).forEach(function (v) {
      chs[String(v.chamber || '').toLowerCase()] = 1;
    });
    if (chs.house) add('https://clerk.house.gov/', 'U.S. House Clerk roll-call records');
    if (chs.senate) add('https://www.senate.gov/', 'U.S. Senate roll-call records');
    var asOf = (tradesJ && tradesJ.retrieved_at) || '';
    var dstr = /^[0-9-]+$/.test(asOf) ? shortDate(asOf) : esc(asOf || '—');
    return '<div class="pf-tr-foot">' + esc(FOOTER_A) +
      'Sources: ' + (links.length ? links.join(', ') : '—') +
      '. Figures as of ' + dstr + '.</div>';
  }

  /* Endpoint trade rows -> phq-trades painter data. */
  function painterData(j) {
    var trades = Array.isArray(j.trades) ? j.trades : [];
    var m = j.member || {};
    var counts = {}, order = [];
    trades.forEach(function (t) {
      var tk = String(t.ticker || '').toUpperCase().trim();
      if (!tk) return;
      if (!counts[tk]) { counts[tk] = 0; order.push(tk); }
      counts[tk]++;
    });
    order.sort(function (a, b) { return counts[b] - counts[a]; });
    var dates = trades.map(function (t) { return String(t.tx_date || ''); })
      .filter(function (d) { return /^\d{4}-\d{2}-\d{2}/.test(d); }).sort();
    var srcs = String(j.source || '').split(';').map(function (s) { return s.trim(); })
      .filter(function (s) { return !!s; });
    return {
      name: m.name, chamber: m.chamber, party: m.party, state: m.state,
      tradeCount: trades.length,
      topTickers: order.slice(0, 4).map(function (tk) { return { ticker: tk, n: counts[tk] }; }),
      dateFrom: dates[0] || null, dateTo: dates[dates.length - 1] || null,
      sources: srcs.map(function (s) { return { label: s, url: SRC_URLS[s] || null }; }),
      asOf: j.retrieved_at || null
    };
  }

  function render(container, j, bioguideId) {
    cssOnce();
    var m = j.member || {};
    var root = document.createElement('div');
    root.className = 'pf-tr';
    var html = '<div class="pf-tr-kicker">FOLLOW THE MONEY</div>' +
      '<h3 class="pf-tr-name">' + esc(m.name || '—') + '</h3>' +
      '<div class="pf-tr-sub">' + esc(chamberLabel(m)) + '</div>';
    /* share — hidden when the card kill switch is on */
    if (!PF.skip('trades-card')) {
      html += '<div class="pf-tr-actions"><button type="button" class="pf-tr-btn" data-tr-share="1">SHARE PORTFOLIO CARD</button></div>';
    }
    html += '<div class="pf-tr-sec"><h4 class="pf-tr-sect">TRADES LOG</h4>' +
      tradesHtml(Array.isArray(j.trades) ? j.trades : []) + '</div>' +
      '<div class="pf-tr-sec"><h4 class="pf-tr-sect">COMMITTEE ASSIGNMENTS</h4>' +
      committeesHtml(m.committees) + '</div>';
    root.innerHTML = html;
    /* element 3: vote record — real elements (no querySelector needed) */
    var votesSec = document.createElement('div');
    votesSec.className = 'pf-tr-sec';
    votesSec.innerHTML = '<h4 class="pf-tr-sect">VOTE RECORD</h4>';
    var votesSlot = document.createElement('div');
    votesSlot.innerHTML = '<div class="pf-tr-empty">Loading vote record…</div>';
    votesSec.appendChild(votesSlot);
    root.appendChild(votesSec);
    /* element 4: EIGA honest empty state */
    var eigaSec = document.createElement('div');
    eigaSec.className = 'pf-tr-sec';
    eigaSec.innerHTML = '<h4 class="pf-tr-sect">EIGA DISCLOSURES</h4>' +
      '<div class="pf-tr-empty">' + esc(EIGA_MSG) + '</div>';
    root.appendChild(eigaSec);
    /* mandatory footer slot */
    var footSlot = document.createElement('div');
    root.appendChild(footSlot);
    container.innerHTML = '';
    container.appendChild(root);

    var pd = painterData(j);
    root.addEventListener('click', function (e) {
      var t = e && e.target;
      if (!t || !t.getAttribute || t.getAttribute('data-tr-share') == null) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });

    /* element 3 fills in async; footer renders once votes resolve */
    function finishVotes(vj) {
      var okVotes = vj && vj.ok && Array.isArray(vj.votes);
      try { votesSlot.innerHTML = votesHtml(okVotes ? vj.votes : []); } catch (e) {}
      try { footSlot.innerHTML = footerHtml(j, okVotes ? vj : null); } catch (e2) {}
    }
    api('scorecard_get', { bioguide_id: String(bioguideId || j.bioguide_id || '') }, function (vj) {
      try { finishVotes(vj); } catch (e) { finishVotes(null); }
    });
  }

  function mount(bioguideId, container) {
    if (!bioguideId || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-tr')) return true; /* already mounted */
    } catch (e) {}
    api('trades_legislator', { bioguide_id: String(bioguideId) }, function (j) {
      if (!j || !j.ok) { hide(container); return; }
      try { render(container, j, bioguideId); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFTradesTab = { mount: mount };
    PF.TradesTab = window.PFTradesTab;
  } catch (e) {}
})();
