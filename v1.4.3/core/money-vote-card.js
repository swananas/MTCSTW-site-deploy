/* core/money-vote-card.js  |  PF v1.4.3 | FOLLOW THE MONEY — vote-vs-donor card.
   Vote-vs-donor card for the bill detail view: one row per legislator with
   a recorded vote, showing their vote plus the top donor industries behind
   each side. Copy discipline is strict: the header reads "Who funded both
   sides", per-row body copy reads "received $X from [industry]", and the
   methodology caption is always shown verbatim:
     "Donations are correlated with votes, not proof of cause."
   Causation claims are never rendered — correlation is shown, cause is never
   claimed. Members whose money block is null render vote-only rows (never
   hidden).
   Backend contract (parallel backend wave, be/follow-the-money):
     ?action=money_vote_card&bill_id=H.R.3633 ->
     {ok, bill:{bill_id,title}, methodology, rows:[
       {bioguide_id,name,chamber,party,state,vote,
        money:{industries:[{industry,amount}]} | money:null}]}
   Fail-soft: endpoint down / {ok:false} / malformed response -> the mount
   section hides itself entirely, never a broken widget. ok:true with zero
   rows -> the honest empty state ("No vote records returned for this bill.").
   No invented figures — every number shown comes from the response.
   Integration hook (Release Eng wires this from the bill detail view on the
   fe/legislation-tracker sibling branch; do NOT call it from this module):
     PFMoneyVote.mount('H.R.3633', document.getElementById('bill-money-slot'))
   KILL: ?pf_off=money-vote  or  localStorage pf_disabled_v1='["money-vote"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('money-vote')) { return; }
  if (window.pfMoneyVoteDone) return;
  window.pfMoneyVoteDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var HEADER = 'Who funded both sides';
  var METHOD = 'Donations are correlated with votes, not proof of cause.';
  var EMPTY_MSG = 'No vote records returned for this bill.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMvCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-mv{max-width:680px;margin:0 auto;padding:8px 0;color:#f5ead6}',
    '.pf-mv-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#e8b923;text-align:center;margin-bottom:10px}',
    '.pf-mv-title{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;text-align:center;margin:0 0 6px}',
    '.pf-mv-bill{font:700 15px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-bottom:16px}',
    '.pf-mv-row{background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px 16px;margin-bottom:12px}',
    '.pf-mv-name{font:900 20px "Arial Black",Arial,sans-serif;color:#f5ead6}',
    '.pf-mv-sub{display:block;font:700 13px Arial,sans-serif;color:#c9bfa8;margin-top:4px}',
    '.pf-mv-vote{font:700 15px Arial,sans-serif;color:#e8b923;margin:8px 0}',
    '.pf-mv-vote b{color:#c1121f}',
    '.pf-mv-inds{list-style:none;margin:0;padding:0}',
    '.pf-mv-inds li{font:400 15px Arial,sans-serif;color:#c9bfa8;padding:4px 0}',
    '.pf-mv-inds li b{color:#f5ead6}',
    '.pf-mv-inds li .pf-mv-amt{color:#e8b923;font-weight:700}',
    '.pf-mv-method{font:400 13px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-top:12px;padding:0 12px;font-style:italic}',
    '.pf-mv-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mv-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mv-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function money(n) {
    if (n == null || isNaN(Number(n))) return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }
  function chamberLabel(r) {
    var ch = String(r.chamber || '').toLowerCase();
    ch = ch === 'house' ? 'U.S. HOUSE' : (ch === 'senate' ? 'U.S. SENATE' : String(r.chamber || '—'));
    return (ch + ' · ' + String(r.party || '—') + ' · ' + String(r.state || '—')).toUpperCase();
  }

  /* One legislator row. money:null -> vote-only row, never hidden. */
  function rowHtml(r) {
    var inds = (r.money && Array.isArray(r.money.industries)) ? r.money.industries.slice(0, 3) : [];
    var indHtml = '';
    if (r.money) {
      if (inds.length) {
        indHtml = '<ul class="pf-mv-inds">' + inds.map(function (d) {
          return '<li>received <span class="pf-mv-amt">' + esc(money(d.amount)) + '</span> from <b>' +
            esc(d.industry || '—') + '</b></li>';
        }).join('') + '</ul>';
      } else {
        indHtml = '<ul class="pf-mv-inds"><li>No industry donor data reported.</li></ul>';
      }
    }
    return '<article class="pf-mv-row">' +
      '<div class="pf-mv-name">' + esc(r.name || '—') +
        '<span class="pf-mv-sub">' + esc(chamberLabel(r)) + '</span></div>' +
      '<div class="pf-mv-vote">VOTED <b>' + esc(r.vote || '—') + '</b></div>' +
      indHtml +
      '</article>';
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function render(container, j) {
    cssOnce();
    var bill = j.bill || {};
    var rows = Array.isArray(j.rows) ? j.rows : [];
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-mv';
    if (!rows.length) {
      root.innerHTML = '<div class="pf-mv-empty">' + esc(EMPTY_MSG) + '</div>';
      container.appendChild(root);
      return;
    }
    var html = '<div class="pf-mv-kicker">FOLLOW THE MONEY</div>' +
      '<h3 class="pf-mv-title">' + esc(HEADER) + '</h3>' +
      '<div class="pf-mv-bill">' + esc(bill.bill_id || '—') + ' — ' + esc(bill.title || '—') + '</div>';
    for (var i = 0; i < rows.length; i++) html += rowHtml(rows[i] || {});
    html += '<div class="pf-mv-method">' + esc(j.methodology || METHOD) + '</div>';
    root.innerHTML = html;
    container.appendChild(root);
  }

  function mount(billId, container) {
    if (!billId || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-mv')) return true; /* already mounted */
    } catch (e) {}
    api('money_vote_card', { bill_id: String(billId) }, function (j) {
      if (!j || !j.ok) { hide(container); return; }
      try { render(container, j); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFMoneyVote = { mount: mount };
    PF.MoneyVote = window.PFMoneyVote;
  } catch (e) {}
})();
