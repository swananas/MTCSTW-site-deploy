/* core/wall-of-shame.js  |  PF v1.4.3 | WALL OF SHAME — bill-detail carousel.
   Swipeable legislator carousel for the bill detail view: one card per
   legislator the endpoint flags for recorded votes against the progressive
   position, each card with DOWNLOAD + SHARE buttons wired through the
   EXISTING share flow — PF.PHQShare.save/.share('phq-wallshame', {...}) —
   so the callsign-claim gate, the idempotent stamp, and the share plumbing
   all ride along. No new share plumbing, no XP anywhere on this frontend
   (XP rides existing backend legs only).
   Backend contract (parallel backend wave, be/wall-of-shame):
     ?action=wall_of_shame&bill_id=H.R.3633 ->
     {ok, bill:{bill_id,title}, progressive_position, method, total_against,
      cards:[{bioguide_id,name,chamber,party,state,against_votes,
              votes:[{vote_id,vote_date,question,position,source_url}]}]}
   Fail-soft: endpoint down / bill unknown / malformed response -> the mount
   section hides itself entirely, never a broken widget. Zero cards -> the
   honest empty state ("No recorded votes against the progressive position
   on this bill."). No invented votes/positions/photos — every pixel comes
   from the endpoint response; missing fields degrade to em-dash.
   Integration hook (Release Eng wires this when fe/legislation-tracker lands;
   do NOT call it from this module — the bill detail view is a sibling file):
     PFWallShame.mount(billId, document.getElementById('bill-wallshame-slot'))
   KILL: ?pf_off=wallshame  or  localStorage pf_disabled_v1='["wallshame"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wallshame')) { return; }
  if (window.pfWallShameDone) return;
  window.pfWallShameDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-wallshame';
  var EMPTY_MSG = 'No recorded votes against the progressive position on this bill.';
  var METHOD_DEFAULT = 'Ranked by recorded votes against the progressive position.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfWsCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-ws{max-width:680px;margin:0 auto;padding:8px 0}',
    '.pf-ws-head{text-align:center;margin-bottom:6px}',
    '.pf-ws-billtitle{font:700 18px Arial,sans-serif;color:#f5ead6}',
    '.pf-ws-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:4px 6px 10px}',
    '.pf-ws-card{flex:0 0 86%;scroll-snap-align:center;background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:26px 22px;color:#f5ead6;text-align:center}',
    '.pf-ws-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#e5383b;margin-bottom:10px}',
    '.pf-ws-bill{font:700 16px Arial,sans-serif;color:#e8b923;margin-bottom:12px}',
    '.pf-ws-name{font:900 34px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 6px}',
    '.pf-ws-sub{font:700 16px Arial,sans-serif;color:#c9bfa8;margin-bottom:14px}',
    '.pf-ws-vote{font:900 20px "Arial Black",Arial,sans-serif;color:#c1121f;margin-bottom:10px}',
    '.pf-ws-q{font:400 15px Arial,sans-serif;color:#f5ead6;margin-bottom:8px}',
    '.pf-ws-count{font:700 14px Arial,sans-serif;color:#e8b923;margin-bottom:16px}',
    '.pf-ws-actions{display:flex;gap:10px;justify-content:center}',
    '.pf-ws-btn{font:900 15px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:12px 22px;cursor:pointer}',
    '.pf-ws-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-ws-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:6px}',
    '.pf-ws-arrow{font:900 22px Arial,sans-serif;background:#1a1a1a;color:#f5ead6;border:1px solid #c1121f;border-radius:50%;width:44px;height:44px;cursor:pointer}',
    '.pf-ws-dots{display:flex;gap:8px}',
    '.pf-ws-dot{width:10px;height:10px;border-radius:50%;background:#3a3a3a;border:0;padding:0;cursor:pointer}',
    '.pf-ws-dot.on{background:#c1121f}',
    '.pf-ws-method{font:400 13px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-top:12px;padding:0 12px}',
    '.pf-ws-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-ws-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-ws-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function chamberLabel(card) {
    var ch = String(card.chamber || '').toLowerCase();
    ch = ch === 'house' ? 'U.S. HOUSE' : (ch === 'senate' ? 'U.S. SENATE' : String(card.chamber || '—'));
    return (ch + ' · ' + String(card.party || '—') + ' · ' + String(card.state || '—')).toUpperCase();
  }

  /* Endpoint card -> painter data object. Every pixel from the response;
     nothing invented, missing fields degrade to em-dash in the painter. */
  function painterData(bill, card) {
    var votes = Array.isArray(card.votes) ? card.votes : [];
    var v0 = votes[0] || {};
    var dates = [], seen = {};
    for (var i = 0; i < votes.length; i++) {
      var k = String(votes[i].vote_date || '');
      if (k && !seen[k]) { seen[k] = 1; dates.push(k); }
    }
    return {
      billId: bill.bill_id, billTitle: bill.title,
      name: card.name, chamber: card.chamber, party: card.party, state: card.state,
      againstVotes: card.against_votes,
      position: v0.position, question: v0.question,
      voteDates: dates.slice(0, 3), sourceUrl: v0.source_url
    };
  }

  function cardInner(bill, card, i) {
    var votes = Array.isArray(card.votes) ? card.votes : [];
    var v0 = votes[0] || {};
    var n = Math.max(0, parseInt(card.against_votes, 10) || 0);
    return '<div class="pf-ws-kicker">WALL OF SHAME</div>' +
      '<div class="pf-ws-bill">ON ' + esc(bill.bill_id) + ' — ' + esc(bill.title) + '</div>' +
      '<h3 class="pf-ws-name">' + esc(card.name) + '</h3>' +
      '<div class="pf-ws-sub">' + esc(chamberLabel(card)) + '</div>' +
      '<div class="pf-ws-vote">VOTED <b>' + esc(v0.position) + '</b> — AGAINST THE PROGRESSIVE POSITION</div>' +
      '<div class="pf-ws-q">ON: ' + esc(v0.question) + '</div>' +
      '<div class="pf-ws-count">' + n + (n === 1 ? ' VOTE' : ' VOTES') +
        ' AGAINST THE PROGRESSIVE POSITION ON RECORD</div>' +
      '<div class="pf-ws-actions">' +
        '<button type="button" class="pf-ws-btn" data-ws-dl="' + i + '">DOWNLOAD</button>' +
        '<button type="button" class="pf-ws-btn pf-ws-btn-red" data-ws-sh="' + i + '">SHARE</button>' +
      '</div>';
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function render(container, j) {
    cssOnce();
    var bill = j.bill || {};
    var cards = Array.isArray(j.cards) ? j.cards : [];
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-ws';
    if (!cards.length) {
      root.innerHTML = '<div class="pf-ws-empty">' + esc(EMPTY_MSG) + '</div>';
      container.appendChild(root);
      return;
    }
    var head = document.createElement('div');
    head.className = 'pf-ws-head';
    head.innerHTML = '<div class="pf-ws-kicker">WALL OF SHAME</div>' +
      '<div class="pf-ws-billtitle">' + esc(bill.bill_id) + ' — ' + esc(bill.title) + '</div>';
    root.appendChild(head);
    var track = document.createElement('div');
    track.className = 'pf-ws-track';
    var datas = [];
    for (var i = 0; i < cards.length; i++) {
      var art = document.createElement('article');
      art.className = 'pf-ws-card';
      art.setAttribute('data-ws-i', String(i));
      art.innerHTML = cardInner(bill, cards[i], i);
      track.appendChild(art);
      datas.push(painterData(bill, cards[i]));
    }
    root.appendChild(track);
    /* nav: prev/next + dot indicators */
    var nav = document.createElement('div');
    nav.className = 'pf-ws-nav';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'pf-ws-arrow'; prev.setAttribute('data-ws-prev', '1');
    prev.textContent = '‹';
    var dots = document.createElement('div');
    dots.className = 'pf-ws-dots';
    var dotBtns = [];
    for (i = 0; i < cards.length; i++) {
      var db = document.createElement('button');
      db.type = 'button'; db.className = 'pf-ws-dot' + (i === 0 ? ' on' : '');
      db.setAttribute('data-ws-dot', String(i));
      dots.appendChild(db); dotBtns.push(db);
    }
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'pf-ws-arrow'; next.setAttribute('data-ws-next', '1');
    next.textContent = '›';
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
    root.appendChild(nav);
    /* method caption under the carousel */
    var cap = document.createElement('div');
    cap.className = 'pf-ws-method';
    cap.textContent = 'METHOD: ' + (j.method || METHOD_DEFAULT);
    root.appendChild(cap);
    var cur = 0;
    function setDots(k) {
      cur = k;
      for (var q = 0; q < dotBtns.length; q++) dotBtns[q].className = 'pf-ws-dot' + (q === k ? ' on' : '');
    }
    function goTo(k) {
      k = Math.max(0, Math.min(dotBtns.length - 1, k));
      setDots(k);
      try { track.scrollTo({ left: k * (track.clientWidth || 320), behavior: 'smooth' }); } catch (e) {}
    }
    track.addEventListener('scroll', function () {
      try {
        var w = track.clientWidth || 1;
        setDots(Math.max(0, Math.min(dotBtns.length - 1, Math.round(track.scrollLeft / w))));
      } catch (e) {}
    });
    root.addEventListener('click', function (e) {
      var t = e && e.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute('data-ws-prev') != null) { goTo(cur - 1); return; }
      if (t.getAttribute('data-ws-next') != null) { goTo(cur + 1); return; }
      var di = t.getAttribute('data-ws-dot');
      if (di != null) { goTo(parseInt(di, 10) || 0); return; }
      var dl = t.getAttribute('data-ws-dl'), sh = t.getAttribute('data-ws-sh');
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

  function mount(billId, container) {
    if (!billId || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-ws')) return true; /* already mounted */
    } catch (e) {}
    api('wall_of_shame', { bill_id: String(billId) }, function (j) {
      if (!j || !j.ok || !j.bill) { hide(container); return; }
      try { render(container, j); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFWallShame = { mount: mount };
    PF.WallShame = window.PFWallShame;
  } catch (e) {}
})();
