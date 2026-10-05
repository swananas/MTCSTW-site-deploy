/* core/money-tab.js  |  PF v1.4.3 | FOLLOW THE MONEY — legislator money tab.
   Money tab for the legislator detail view: cycle totals, small-dollar vs
   large-dollar split, top-10 donors, top industries (with an
   "estimated from employer data" badge where estimated=1). DOWNLOAD + SHARE
   buttons wire through the EXISTING share flow —
   PF.PHQShare.save/.share('phq-money', {...}) — so the callsign-claim gate,
   the idempotent stamp, and the share plumbing all ride along. No new share
   plumbing, no XP anywhere on this frontend (XP rides existing backend legs
   only; viewing money data grants 0 XP and no read-XP leg anchors here —
   core/read-xp.js only fires on #pf-readxp / Top Stories / Ammo surfaces).
   Backend contract (LOCKED: be/follow-the-money @ dd9cab9 — the frontend
   adapts; the backend is never modified):
     ?action=money_legislator&bioguide_id=A000055 ->
     {ok, cycle, source:'FEC (api.open.fec.gov)', retrieved_at,
      member:{bioguide_id,fec_candidate_id,name,office,state,party},
      totals:{raised,spent,cash}, small_dollar_pct, large_dollar_pct,
      top_donors:[{name,employer,occupation,amount} x10],
      industries:[{industry,total,estimated}]}
   Tables empty until the FEC ingest runs -> {ok:true, empty:true, reason}.
   small_dollar_pct / large_dollar_pct arrive as percentages ALREADY
   (2.5 = 2.5%) — never multiply by 100. member.office is 'H'/'S' (FEC
   candidate office), not a chamber string. retrieved_at is an epoch-ms
   number as the ingest writes it.
   Fail-soft: endpoint down / {ok:false} / malformed response -> the mount
   section hides itself entirely, never a broken widget. ok:true but no
   totals -> the honest empty state ("Money data isn't loaded yet — no
   figures shown rather than guesses."). No invented figures — every number
   shown carries its source in the footer.
   Integration hook (Release Eng wires this from the legislator detail view;
   do NOT call it from this module):
     PFMoneyTab.mount('J000288', document.getElementById('legislator-money-slot'))
   KILL: ?pf_off=money-tab  or  localStorage pf_disabled_v1='["money-tab"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('money-tab')) { return; }
  if (window.pfMoneyTabDone) return;
  window.pfMoneyTabDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-money';
  var EMPTY_MSG = "Money data isn't loaded yet — no figures shown rather than guesses.";

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMoneyCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-mt{max-width:680px;margin:0 auto;padding:8px 0;color:#f5ead6}',
    '.pf-mt-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#e8b923;text-align:center;margin-bottom:10px}',
    '.pf-mt-name{font:900 32px "Arial Black",Arial,sans-serif;color:#f5ead6;text-align:center;margin:0 0 4px}',
    '.pf-mt-sub{font:700 15px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-bottom:16px}',
    '.pf-mt-totals{display:flex;gap:10px;justify-content:center;margin-bottom:18px;flex-wrap:wrap}',
    '.pf-mt-total{background:#0d0d0d;border:1px solid #c1121f;border-radius:8px;padding:12px 16px;text-align:center;min-width:140px}',
    '.pf-mt-tlabel{display:block;font:700 13px Arial,sans-serif;letter-spacing:2px;color:#c9bfa8;margin-bottom:6px}',
    '.pf-mt-tval{display:block;font:900 22px "Arial Black",Arial,sans-serif;color:#e8b923}',
    '.pf-mt-sect{background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px 16px;margin-bottom:14px}',
    '.pf-mt-sect h4{font:900 16px "Arial Black",Arial,sans-serif;color:#f5ead6;letter-spacing:2px;margin:0 0 10px}',
    '.pf-mt-barrow{display:flex;height:26px;border-radius:4px;overflow:hidden;margin:8px 0}',
    '.pf-mt-seg-sm{background:#e8b923}',
    '.pf-mt-seg-lg{background:#c1121f}',
    '.pf-mt-barlegend{display:flex;justify-content:space-between;font:700 13px Arial,sans-serif;color:#c9bfa8;flex-wrap:wrap;gap:6px}',
    '.pf-mt-list{list-style:none;margin:0;padding:0}',
    '.pf-mt-list li{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid #1e1e1e;font:400 15px Arial,sans-serif}',
    '.pf-mt-list li:last-child{border-bottom:0}',
    '.pf-mt-dname{color:#f5ead6;font-weight:700}',
    '.pf-mt-demployer{color:#c9bfa8;font-size:13px}',
    '.pf-mt-damt{margin-left:auto;color:#e8b923;font-weight:700;white-space:nowrap}',
    '.pf-mt-est{display:inline-block;font:700 11px Arial,sans-serif;letter-spacing:1px;color:#0d0d0d;background:#e8b923;border-radius:3px;padding:2px 6px;margin-left:6px}',
    '.pf-mt-actions{display:flex;gap:10px;justify-content:center;margin:16px 0}',
    '.pf-mt-btn{font:900 15px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:12px 22px;cursor:pointer}',
    '.pf-mt-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-mt-src{font:400 13px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:0 12px}',
    '.pf-mt-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mt-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mt-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function money(n) {
    if (n == null || isNaN(Number(n))) return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }
  /* BE member carries office:'H'/'S' (FEC candidate office), not a chamber
     string. Map it; keep house/senate/rep/sen variants for robustness. */
  function chamberLabel(leg) {
    var raw = String(leg.office || leg.chamber || '').toLowerCase();
    var ch = (raw === 'h' || raw === 'house' || raw === 'rep') ? 'U.S. HOUSE'
      : ((raw === 's' || raw === 'senate' || raw === 'sen') ? 'U.S. SENATE'
        : String(leg.office || leg.chamber || '—'));
    return (ch + ' · ' + String(leg.party || '—') + ' · ' + String(leg.state || '—')).toUpperCase();
  }
  /* The BE sends small_dollar_pct / large_dollar_pct as percentages ALREADY
     (Math.round((v / raised) * 1000) / 10) — pass through, never ×100. */
  function pctOf(f) {
    if (f == null || isNaN(Number(f))) return null;
    return Number(f);
  }
  function pctLabel(f) {
    var n = pctOf(f);
    if (n == null) return '—';
    return (Math.round(n * 10) / 10) + '%';
  }
  function retrDate(r) {
    /* The ingest writes retrieved_at as epoch ms (Date.now()); the BE passes
       it through. Format numeric epochs as a date; also parse YYYY-MM-DD. */
    if (typeof r === 'number' && r > 1e12) {
      try {
        var d = new Date(r);
        var MN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return MN[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
      } catch (e) {}
    }
    var s = String(r == null ? '' : r).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      var mi = parseInt(m[2], 10) - 1;
      if (mi >= 0 && mi < 12) return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
    }
    return s || '—';
  }
  function srcFooter(j) {
    return 'Source: FEC · ' + esc(j.cycle || '—') + ' cycle · retrieved ' + esc(retrDate(j.retrieved_at));
  }

  /* Endpoint response -> painter data object. Every pixel from the response;
     nothing invented, missing fields degrade to em-dash in the painter.
     Adapts the LOCKED BE contract to the painter's internal shape:
     BE totals.{raised,spent,cash}, member.office 'H'/'S' -> chamber string,
     retrieved_at (epoch ms) -> 'YYYY-MM-DD' for the painter's fullDate(),
     industries[].total -> painter's amount key. */
  function officeChamber(off) {
    var o = String(off || '').toUpperCase();
    return o === 'H' ? 'house' : (o === 'S' ? 'senate' : '');
  }
  function retrievedISO(r) {
    if (typeof r === 'number' && r > 1e12) {
      try {
        var d = new Date(r);
        return d.getUTCFullYear() + '-' +
          String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(d.getUTCDate()).padStart(2, '0');
      } catch (e) {}
    }
    return r;
  }
  function painterData(j) {
    var leg = j.member || {};
    var t = j.totals || {};
    var donors = Array.isArray(j.top_donors) ? j.top_donors.slice(0, 3) : [];
    var inds = Array.isArray(j.industries) ? j.industries.slice(0, 3) : [];
    return {
      bioguideId: leg.bioguide_id, name: leg.name, chamber: officeChamber(leg.office),
      party: leg.party, state: leg.state, cycle: j.cycle, retrieved: retrievedISO(j.retrieved_at),
      raised: t.raised, spent: t.spent, cash: t.cash,
      topDonors: donors.map(function (d) { return { name: d.name, employer: d.employer, amount: d.amount }; }),
      topIndustries: inds.map(function (d) { return { industry: d.industry, amount: d.total }; })
    };
  }

  function totalsRow(t) {
    var cells = [
      ['RAISED', money(t.raised)],
      ['SPENT', money(t.spent)],
      ['CASH ON HAND', money(t.cash)]
    ];
    return cells.map(function (c) {
      return '<div class="pf-mt-total"><span class="pf-mt-tlabel">' + esc(c[0]) +
        '</span><span class="pf-mt-tval">' + esc(c[1]) + '</span></div>';
    }).join('');
  }

  function splitBar(j) {
    var sm = pctOf(j.small_dollar_pct), lg = pctOf(j.large_dollar_pct);
    var head = '<h4>SMALL-DOLLAR VS LARGE-DOLLAR</h4>';
    if (sm == null && lg == null) return head + '<div class="pf-mt-barlegend"><span>—</span></div>';
    sm = sm == null ? 0 : sm; lg = lg == null ? 0 : lg;
    /* BE percentages pass straight through — no ×100. Clamp the bar to 100%. */
    var smW = Math.max(0, Math.min(100, sm)), lgW = Math.max(0, Math.min(100, lg));
    return head +
      '<div class="pf-mt-barrow">' +
        '<div class="pf-mt-seg-sm" style="width:' + smW + '%"></div>' +
        '<div class="pf-mt-seg-lg" style="width:' + lgW + '%"></div>' +
      '</div>' +
      '<div class="pf-mt-barlegend">' +
        '<span>SMALL-DOLLAR (&lt;$200): ' + pctLabel(sm) + '</span>' +
        '<span>LARGE-DOLLAR: ' + pctLabel(lg) + '</span>' +
      '</div>';
  }

  function donorList(donors) {
    var ds = Array.isArray(donors) ? donors.slice(0, 10) : [];
    var head = '<h4>TOP DONORS</h4>';
    if (!ds.length) return head + '<div class="pf-mt-barlegend"><span>—</span></div>';
    return head + '<ul class="pf-mt-list">' + ds.map(function (d) {
      var emp = d.employer ? '<span class="pf-mt-demployer">' + esc(d.employer) + '</span>' : '';
      return '<li><span class="pf-mt-dname">' + esc(d.name || '—') + '</span>' + emp +
        '<span class="pf-mt-damt">' + esc(money(d.amount)) + '</span></li>';
    }).join('') + '</ul>';
  }

  function industryList(inds) {
    var xs = Array.isArray(inds) ? inds : [];
    var head = '<h4>TOP INDUSTRIES</h4>';
    if (!xs.length) return head + '<div class="pf-mt-barlegend"><span>—</span></div>';
    return head + '<ul class="pf-mt-list">' + xs.map(function (d) {
      /* BE contract: {industry,total,estimated} — total, not amount. */
      var badge = d.estimated ? '<span class="pf-mt-est">ESTIMATED FROM EMPLOYER DATA</span>' : '';
      return '<li><span class="pf-mt-dname">' + esc(d.industry || '—') + '</span>' + badge +
        '<span class="pf-mt-damt">' + esc(money(d.total)) + '</span></li>';
    }).join('') + '</ul>';
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function render(container, j) {
    cssOnce();
    var leg = j.member || {};
    var t = j.totals || null;
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-mt';
    if (!t) {
      root.innerHTML = '<div class="pf-mt-empty">' + esc(EMPTY_MSG) + '</div>' +
        '<div class="pf-mt-src">' + srcFooter(j) + '</div>';
      container.appendChild(root);
      return;
    }
    root.innerHTML =
      '<div class="pf-mt-kicker">FOLLOW THE MONEY</div>' +
      '<h3 class="pf-mt-name">' + esc(leg.name || '—') + '</h3>' +
      '<div class="pf-mt-sub">' + esc(chamberLabel(leg)) + '</div>' +
      '<div class="pf-mt-totals">' + totalsRow(t) + '</div>' +
      '<div class="pf-mt-sect">' + splitBar(j) + '</div>' +
      '<div class="pf-mt-sect">' + donorList(j.top_donors) + '</div>' +
      '<div class="pf-mt-sect">' + industryList(j.industries) + '</div>' +
      '<div class="pf-mt-actions">' +
        '<button type="button" class="pf-mt-btn" data-mt-dl="1">DOWNLOAD</button>' +
        '<button type="button" class="pf-mt-btn pf-mt-btn-red" data-mt-sh="1">SHARE</button>' +
      '</div>' +
      '<div class="pf-mt-src">' + srcFooter(j) + '</div>';
    var pd = painterData(j);
    root.addEventListener('click', function (e) {
      var t = e && e.target;
      if (!t || !t.getAttribute) return;
      var dl = t.getAttribute('data-mt-dl'), sh = t.getAttribute('data-mt-sh');
      if (dl == null && sh == null) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        if (dl != null) PHQ.save(PAINTER, pd);
        else PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });
    container.appendChild(root);
  }

  function mount(bioguideId, container) {
    if (!bioguideId || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-mt')) return true; /* already mounted */
    } catch (e) {}
    api('money_legislator', { bioguide_id: String(bioguideId) }, function (j) {
      if (!j || !j.ok) { hide(container); return; }
      try { render(container, j); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFMoneyTab = { mount: mount };
    PF.MoneyTab = window.PFMoneyTab;
  } catch (e) {}
})();
