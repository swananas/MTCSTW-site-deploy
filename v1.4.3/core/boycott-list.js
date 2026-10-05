/* core/boycott-list.js  |  PF v1.4.3 | DONOR BOYCOTT LIST.
   Ranked employer list for the Follow-the-Money expansion: top corporate
   employers by employee FEC contributions, each row linked into pressure
   campaigns — "They fund the opposition — here's the campaign pressuring
   them." Ranked list, amounts, linked campaign cards with JOIN buttons,
   per-employer DOWNLOAD/SHARE through the EXISTING share flow —
   PF.PHQShare.save/.share('phq-boycott', {...}) — so the callsign-claim
   gate, the idempotent stamp, and the share plumbing all ride along.
   No new share plumbing, no XP anywhere on this frontend (viewing = 0;
   sharing rides existing create_share:; campaign joins ride the existing
   pressure-join leg on Political HQ).
   Backend contract (parallel backend wave, be/donor-boycotts):
     ?action=boycott_list ->
     {ok, employers:[{employer, total_donated, cycle, contributions,
                      headline, linked_campaigns:[{id,title,status}],
                      source:'FEC'}],
      total_employers, cycle_scope, disclaimer, method, source:'FEC'}
     money tables absent -> {ok:true, empty:true, reason:'donor data pending'}
   JOIN buttons deep-link to the Political HQ pressure pane where the
   EXISTING campaign join flow lives (fe/pressure-campaigns) — reuse, not
   a rebuild. The join flow is not duplicated here.
   Copy rule (hard): rows render the endpoint headline ("Employees of X gave
   $Y (FEC)") and the disclaimer is prominent — corporations cannot donate
   directly; these are employee aggregates. Never "the company donated".
   Fail-soft: endpoint down / malformed -> the mount section hides itself
   entirely, never a broken widget. empty:true -> the honest empty state.
   No invented employers/amounts/links — every pixel comes from the
   endpoint response.
   Integration hook (Release Eng wires this; do NOT call it from this
   module — the Political HQ money surface is a sibling file):
     PFBoycotts.mount(document.getElementById('phq-boycott-slot'))
   KILL: ?pf_off=boycotts  or  localStorage pf_disabled_v1='["boycotts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('boycotts')) { return; }
  if (window.pfBoycottsDone) return;
  window.pfBoycottsDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-boycott';
  var HQ_URL = 'https://www.mtcstw.com/political-hq';
  var PENDING_MSG = 'Donor data pending — the money tables are still loading. Check back soon.';
  var EMPTY_MSG = 'No donor data yet.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  function fmtMoney(n) {
    try { return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
    catch (e) { return '$' + String(n); }
  }

  /* JSONP GET — mirrors core/wall-of-shame.js api(): backend + action +
     params + callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfBcCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-bc{max-width:680px;margin:0 auto;padding:8px 0}',
    '.pf-bc-head{text-align:center;margin-bottom:10px}',
    '.pf-bc-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#e8b923;margin-bottom:8px}',
    '.pf-bc-title{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 4px}',
    '.pf-bc-sub{font:400 14px Arial,sans-serif;color:#c9bfa8;margin-bottom:10px}',
    '.pf-bc-disc{background:#1a1206;border:2px solid #e8b923;border-radius:8px;padding:12px 14px;font:700 13px Arial,sans-serif;color:#e8b923;text-align:center;margin:0 6px 14px;line-height:1.5}',
    '.pf-bc-row{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:20px 18px;color:#f5ead6;margin:0 6px 14px}',
    '.pf-bc-rank{font:700 13px Arial,sans-serif;color:#c9bfa8;letter-spacing:3px;margin-bottom:6px}',
    '.pf-bc-emp{font:900 30px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 6px;line-height:1.1}',
    '.pf-bc-amt{font:900 20px "Arial Black",Arial,sans-serif;color:#c1121f;margin-bottom:4px}',
    '.pf-bc-cyc{font:400 13px Arial,sans-serif;color:#c9bfa8;margin-bottom:12px}',
    '.pf-bc-camp{background:#161616;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:10px}',
    '.pf-bc-camp-t{font:700 15px Arial,sans-serif;color:#f5ead6;margin-bottom:4px}',
    '.pf-bc-camp-s{font:400 12px Arial,sans-serif;color:#c9bfa8;margin-bottom:10px}',
    '.pf-bc-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}',
    '.pf-bc-btn{font:900 14px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:11px 20px;cursor:pointer;text-decoration:none;display:inline-block}',
    '.pf-bc-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-bc-btn-gold{background:#e8b923;color:#0d0d0d}',
    '.pf-bc-nocamp{font:400 13px Arial,sans-serif;color:#c9bfa8;font-style:italic;margin-bottom:4px}',
    '.pf-bc-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}',
    '.pf-bc-method{font:400 12px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-top:12px;padding:0 12px;line-height:1.5}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-bc-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-bc-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function hqLink() {
    var u = HQ_URL;
    try { if (window.PF && typeof PF.shareUrl === 'function') u = PF.shareUrl(u); } catch (e) {}
    return u;
  }

  /* Endpoint row -> painter data object. Every pixel from the response;
     missing fields degrade to em-dash in the painter. */
  function painterData(row) {
    var camps = Array.isArray(row.linked_campaigns) ? row.linked_campaigns : [];
    var c0 = camps[0] || {};
    return {
      employer: row.employer, amount: row.total_donated, cycle: row.cycle,
      campaignTitle: c0.title || '', campaignId: c0.id || ''
    };
  }

  function campHTML(camps) {
    if (!camps.length) {
      return '<div class="pf-bc-nocamp">No linked pressure campaign yet.</div>';
    }
    var h = '';
    for (var i = 0; i < camps.length; i++) {
      var c = camps[i] || {};
      var st = String(c.status || '').toUpperCase();
      h += '<div class="pf-bc-camp">' +
        '<div class="pf-bc-camp-t">' + esc(c.title || c.id || 'Pressure campaign') + '</div>' +
        (st ? '<div class="pf-bc-camp-s">STATUS: ' + esc(st) + '</div>' : '') +
        '<a class="pf-bc-btn pf-bc-btn-gold" data-bc-join="1" href="' + esc(hqLink()) +
        '" target="_blank" rel="noopener">JOIN THE PRESSURE</a>' +
        '</div>';
    }
    return h;
  }

  function render(container, j) {
    cssOnce();
    var rows = Array.isArray(j.employers) ? j.employers : [];
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-bc';
    var head = document.createElement('div');
    head.className = 'pf-bc-head';
    head.innerHTML = '<div class="pf-bc-kicker">FOLLOW THE MONEY &rarr; JOIN THE FIGHT</div>' +
      '<h2 class="pf-bc-title">DONOR BOYCOTT LIST</h2>' +
      '<div class="pf-bc-sub">Top employers by employee FEC contributions' +
      (j.cycle_scope ? ' &middot; ' + esc(j.cycle_scope) + ' cycle' : '') + '</div>';
    root.appendChild(head);
    /* The disclaimer is prominent — above the list, not buried. */
    var disc = document.createElement('div');
    disc.className = 'pf-bc-disc';
    disc.textContent = j.disclaimer ||
      'Totals aggregate individual employee contributions reported to the FEC. ' +
      'Corporations cannot donate directly — an employer here means its employees gave, not the company.';
    root.appendChild(disc);
    if (!rows.length) {
      var em = document.createElement('div');
      em.className = 'pf-bc-empty';
      em.textContent = (j.empty && j.reason === 'donor data pending') ? PENDING_MSG : EMPTY_MSG;
      root.appendChild(em);
      container.appendChild(root);
      return;
    }
    var datas = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var camps = Array.isArray(r.linked_campaigns) ? r.linked_campaigns : [];
      var art = document.createElement('article');
      art.className = 'pf-bc-row';
      art.innerHTML =
        '<div class="pf-bc-rank">#' + (i + 1) + '</div>' +
        '<h3 class="pf-bc-emp">' + esc(r.employer || '—') + '</h3>' +
        '<div class="pf-bc-amt">' + esc(r.headline || ('Employees gave ' + fmtMoney(r.total_donated) + ' (FEC)')) + '</div>' +
        '<div class="pf-bc-cyc">' + esc(r.cycle || '') + (r.cycle ? ' cycle' : '') +
          ' &middot; ' + (parseInt(r.contributions, 10) || 0) + ' reported contributions &middot; source: FEC</div>' +
        campHTML(camps) +
        '<div class="pf-bc-actions">' +
          '<button type="button" class="pf-bc-btn" data-bc-dl="' + i + '">DOWNLOAD</button>' +
          '<button type="button" class="pf-bc-btn pf-bc-btn-red" data-bc-sh="' + i + '">SHARE</button>' +
        '</div>';
      root.appendChild(art);
      datas.push(painterData(r));
    }
    if (j.method) {
      var cap = document.createElement('div');
      cap.className = 'pf-bc-method';
      cap.textContent = 'METHOD: ' + j.method;
      root.appendChild(cap);
    }
    root.addEventListener('click', function (e) {
      var t = e && e.target;
      if (!t || !t.getAttribute) return;
      var dl = t.getAttribute('data-bc-dl'), sh = t.getAttribute('data-bc-sh');
      if (dl == null && sh == null) return;
      var idx = parseInt(dl != null ? dl : sh, 10) || 0;
      var pd = datas[idx];
      if (!pd) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        if (dl != null) PHQ.save(PAINTER, pd);
        else PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });
    container.appendChild(root);
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-bc')) return true; /* already mounted */
    } catch (e) {}
    api('boycott_list', {}, function (j) {
      if (!j || !j.ok) { hide(container); return; }
      try { render(container, j); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFBoycotts = { mount: mount };
    PF.Boycotts = window.PFBoycotts;
  } catch (e) {}
})();
