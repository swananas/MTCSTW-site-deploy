/* core/pac-alerts.js  |  PF v1.4.3 | SUPER PAC ALERTS — Follow-the-Money spike list.
   Renders the backend's ?action=pac_spikes feed as MONEY BOMB cards: one per
   committee spending at a spike multiple vs its prior-cycle baseline.
   Each card shows spender, amount, target candidate, support/oppose,
   vs-baseline multiple, and the FEC source + retrieval date — every pixel
   comes from the endpoint response; nothing is estimated or seeded.
   Backend contract (parallel backend wave, be/superpac-alerts):
     ?action=pac_spikes&state=TX[&district=15] ->
     {ok, state, district, cycle, fec_live, retrieved_at, method, source,
      source_url, note, spikes:[{committee_id, committee_name, candidate_name,
        office, state, district, support_oppose, recent_30d_total,
        prior_cycle_total, prior_cycle_daily_avg, spike_multiple, spike,
        baseline, cycle, source, retrieved_at}]}
   Cards carry DOWNLOAD + SHARE buttons wired through the EXISTING share
   flow — PF.PHQShare.save/.share('phq-pac', {...}) — so the callsign-claim
   gate, the idempotent stamp, and the share plumbing all ride along.
   No new share plumbing, no XP anywhere on this frontend (viewing = 0 XP,
   sharing rides the existing create_share: leg, opt-in = 0 XP).
   Alert opt-in toggle: DOCUMENTED STUB. Persists to localStorage
   (pf_pac_alert_optin_<STATE>) and renders the preference honestly, but no
   push alert fires — the backend subscription rail (subscriber list +
   pac_alert_log writers + notify() fan-out) does not exist yet, and the
   notification_prefs backend has no pac_spike column, so wiring the toggle
   to it would silently drop the field. See docs/superpac-alerts.md
   (backend repo) for the gap analysis.
   Empty states: fec_live=false -> the honest "no FEC data yet" state
   (FEC API key hand-step open); zero spikes with live data -> the backend's
   geo note. Network failure / malformed response -> the mount section hides
   itself, never a broken widget.
   Integration hook (Release Eng wires this when the Political HQ money
   surface lands; do NOT call it from this module):
     PFPacAlerts.mount('TX', document.getElementById('pf-pacalerts-slot'))
   KILL: ?pf_off=pac-alerts  or  localStorage pf_disabled_v1='["pac-alerts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('pac-alerts')) { return; }
  if (window.pfPacAlertsDone) return;
  window.pfPacAlertsDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var PAINTER = 'phq-pac';
  var EMPTY_NOKEY = 'No FEC data yet — the FEC API key hand-step is still open. ' +
    'Nothing here is estimated or seeded; figures appear once ingest runs.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  function fmtMoney(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return '—';
    try { return '$' + Math.round(v).toLocaleString('en-US'); }
    catch (e) { return '$' + Math.round(v); }
  }
  function fmtDate(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return '—'; }
  }

  /* JSONP GET — mirrors core/20-nextop.js api(): backend + action + params +
     callback script tag, 12s timeout, null on any failure. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPaCb' + Math.floor(Math.random() * 1e9);
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
    '.pf-pa{max-width:680px;margin:0 auto;padding:8px 0}',
    '.pf-pa-head{text-align:center;margin-bottom:6px}',
    '.pf-pa-kicker{font:700 15px Arial,sans-serif;letter-spacing:6px;color:#c1121f;margin-bottom:10px}',
    '.pf-pa-title{font:900 26px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 4px}',
    '.pf-pa-sub{font:400 14px Arial,sans-serif;color:#c9bfa8;margin-bottom:10px}',
    '.pf-pa-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:4px 6px 10px}',
    '.pf-pa-card{flex:0 0 86%;scroll-snap-align:center;background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:26px 22px;color:#f5ead6;text-align:center}',
    '.pf-pa-amount{font:900 44px "Arial Black",Arial,sans-serif;color:#e8b923;margin:0 0 6px}',
    '.pf-pa-spender{font:900 24px "Arial Black",Arial,sans-serif;color:#f5ead6;margin:0 0 6px}',
    '.pf-pa-target{font:700 16px Arial,sans-serif;color:#c9bfa8;margin-bottom:6px}',
    '.pf-pa-mult{font:900 20px "Arial Black",Arial,sans-serif;color:#c1121f;margin-bottom:10px}',
    '.pf-pa-src{font:400 13px Arial,sans-serif;color:#c9bfa8;margin-bottom:16px}',
    '.pf-pa-actions{display:flex;gap:10px;justify-content:center}',
    '.pf-pa-btn{font:900 15px "Arial Black",Arial,sans-serif;background:#f5ead6;color:#0d0d0d;border:0;border-radius:6px;padding:12px 22px;cursor:pointer}',
    '.pf-pa-btn-red{background:#c1121f;color:#ffffff}',
    '.pf-pa-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:6px}',
    '.pf-pa-arrow{font:900 22px Arial,sans-serif;background:#1a1a1a;color:#f5ead6;border:1px solid #c1121f;border-radius:50%;width:44px;height:44px;cursor:pointer}',
    '.pf-pa-dots{display:flex;gap:8px}',
    '.pf-pa-dot{width:10px;height:10px;border-radius:50%;background:#3a3a3a;border:0;padding:0;cursor:pointer}',
    '.pf-pa-dot.on{background:#c1121f}',
    '.pf-pa-method{font:400 13px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-top:12px;padding:0 12px}',
    '.pf-pa-empty{font:400 16px Arial,sans-serif;color:#c9bfa8;text-align:center;padding:28px 12px;border:1px dashed #3a3a3a;border-radius:8px}',
    '.pf-pa-optin{display:flex;align-items:center;justify-content:center;gap:10px;margin:12px 0 4px}',
    '.pf-pa-optin label{font:700 14px Arial,sans-serif;color:#f5ead6;cursor:pointer}',
    '.pf-pa-optin input{width:20px;height:20px;cursor:pointer}',
    '.pf-pa-optin-note{font:400 12px Arial,sans-serif;color:#c9bfa8;text-align:center;margin-bottom:8px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-pa-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-pa-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function optinKey(state) { return 'pf_pac_alert_optin_' + String(state || '').toUpperCase(); }
  function optinGet(state) {
    try { return localStorage.getItem(optinKey(state)) === '1'; } catch (e) { return false; }
  }
  function optinSet(state, on) {
    try { localStorage.setItem(optinKey(state), on ? '1' : '0'); } catch (e) {}
  }

  function geoLabel(j) {
    var g = String(j.state || '');
    if (j.district) g += '-' + j.district;
    return g;
  }

  function multLine(s) {
    if (s.baseline === 'none') return 'NEW SPENDER — NO PRIOR-CYCLE BASELINE';
    if (s.spike_multiple == null) return '—';
    return Number(s.spike_multiple).toFixed(1) + '× THE OLD DAILY PACE — SPIKE';
  }

  /* Endpoint spike -> painter data object. Every pixel from the response;
     missing fields degrade to em-dash in the painter. */
  function painterData(s) {
    return {
      state: s.state, district: s.district, cycle: s.cycle,
      amount: s.recent_30d_total, spender: s.committee_name,
      target: s.candidate_name, supportOppose: s.support_oppose,
      spikeMultiple: s.spike_multiple, baseline: s.baseline,
      sourceDate: fmtDate(s.retrieved_at)
    };
  }

  function cardInner(s) {
    var so = String(s.support_oppose || '').toUpperCase() === 'OPPOSE' ? 'OPPOSES' : 'SUPPORTS';
    return '<div class="pf-pa-kicker">MONEY BOMB</div>' +
      '<div class="pf-pa-amount">' + esc(fmtMoney(s.recent_30d_total)) + '</div>' +
      '<h3 class="pf-pa-spender">' + esc(s.committee_name) + '</h3>' +
      '<div class="pf-pa-target">' + so + ' ' + esc(s.candidate_name) +
        ' (' + esc(s.office) + '-' + esc(s.state) + (s.district ? '-' + esc(s.district) : '') + ')</div>' +
      '<div class="pf-pa-mult">' + esc(multLine(s)) + '</div>' +
      '<div class="pf-pa-src">SOURCE: FEC — INDEPENDENT EXPENDITURES (SCHEDULE E) · ' +
        'RETRIEVED ' + esc(fmtDate(s.retrieved_at)) + ' · ' + esc(s.cycle) + ' CYCLE</div>' +
      '<div class="pf-pa-actions">' +
        '<button type="button" class="pf-pa-btn" data-pa-dl="1">DOWNLOAD</button>' +
        '<button type="button" class="pf-pa-btn pf-pa-btn-red" data-pa-sh="1">SHARE</button>' +
      '</div>';
  }

  function hide(container) {
    try { container.style.display = 'none'; container.innerHTML = ''; } catch (e) {}
  }

  function renderOptin(root, state) {
    var wrap = document.createElement('div');
    wrap.className = 'pf-pa-optin';
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'pf-pa-optin-cb';
    cb.checked = optinGet(state);
    var lb = document.createElement('label');
    lb.setAttribute('for', 'pf-pa-optin-cb');
    lb.textContent = 'ALERT ME TO MONEY BOMBS IN ' + String(state || '').toUpperCase();
    wrap.appendChild(cb); wrap.appendChild(lb);
    root.appendChild(wrap);
    var note = document.createElement('div');
    note.className = 'pf-pa-optin-note';
    note.textContent = 'Push alerts go live once the backend subscription rail ships — ' +
      'your preference is saved on this device meanwhile. No XP for opting in.';
    root.appendChild(note);
    cb.addEventListener('change', function () {
      optinSet(state, cb.checked);
      toast(cb.checked ? 'Money-bomb alerts: ON (this device).' : 'Money-bomb alerts: OFF.');
    });
  }

  function render(container, j, state) {
    cssOnce();
    var spikes = Array.isArray(j.spikes) ? j.spikes : [];
    container.innerHTML = '';
    var root = document.createElement('div');
    root.className = 'pf-pa';
    var head = document.createElement('div');
    head.className = 'pf-pa-head';
    head.innerHTML = '<div class="pf-pa-kicker">FOLLOW THE MONEY</div>' +
      '<h2 class="pf-pa-title">SUPER PAC ALERTS — ' + esc(geoLabel(j)) + '</h2>' +
      '<div class="pf-pa-sub">' + esc(j.cycle) + ' CYCLE · ' + esc(j.source || 'FEC') + '</div>';
    root.appendChild(head);
    renderOptin(root, state);
    if (!j.fec_live) {
      var empty0 = document.createElement('div');
      empty0.className = 'pf-pa-empty';
      empty0.textContent = EMPTY_NOKEY;
      root.appendChild(empty0);
      container.appendChild(root);
      return;
    }
    if (!spikes.length) {
      var empty1 = document.createElement('div');
      empty1.className = 'pf-pa-empty';
      empty1.textContent = j.note || 'No independent expenditures in the last 30 days on file for this race.';
      root.appendChild(empty1);
      container.appendChild(root);
      return;
    }
    var track = document.createElement('div');
    track.className = 'pf-pa-track';
    var datas = [];
    for (var i = 0; i < spikes.length; i++) {
      var art = document.createElement('article');
      art.className = 'pf-pa-card';
      art.setAttribute('data-pa-i', String(i));
      art.innerHTML = cardInner(spikes[i]);
      track.appendChild(art);
      datas.push(painterData(spikes[i]));
    }
    root.appendChild(track);
    /* nav: prev/next + dot indicators */
    var nav = document.createElement('div');
    nav.className = 'pf-pa-nav';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'pf-pa-arrow'; prev.setAttribute('data-pa-prev', '1');
    prev.textContent = '‹';
    var dots = document.createElement('div');
    dots.className = 'pf-pa-dots';
    var dotBtns = [];
    for (i = 0; i < spikes.length; i++) {
      var db = document.createElement('button');
      db.type = 'button'; db.className = 'pf-pa-dot' + (i === 0 ? ' on' : '');
      db.setAttribute('data-pa-dot', String(i));
      dots.appendChild(db); dotBtns.push(db);
    }
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'pf-pa-arrow'; next.setAttribute('data-pa-next', '1');
    next.textContent = '›';
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
    root.appendChild(nav);
    /* method caption under the carousel */
    var cap = document.createElement('div');
    cap.className = 'pf-pa-method';
    cap.textContent = 'METHOD: ' + (j.method || 'Spike = spending at >3x the prior-cycle daily pace over 30 days.');
    root.appendChild(cap);
    var cur = 0;
    function setDots(k) {
      cur = k;
      for (var q = 0; q < dotBtns.length; q++) dotBtns[q].className = 'pf-pa-dot' + (q === k ? ' on' : '');
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
      if (t.getAttribute('data-pa-prev') != null) { goTo(cur - 1); return; }
      if (t.getAttribute('data-pa-next') != null) { goTo(cur + 1); return; }
      var di = t.getAttribute('data-pa-dot');
      if (di != null) { goTo(parseInt(di, 10) || 0); return; }
      var card = t;
      while (card && card.getAttribute && card.getAttribute('data-pa-i') == null) card = card.parentNode;
      var idx = card ? parseInt(card.getAttribute('data-pa-i'), 10) || 0 : 0;
      var isDl = t.getAttribute('data-pa-dl') != null, isSh = t.getAttribute('data-pa-sh') != null;
      if (!isDl && !isSh) return;
      var pd = datas[idx];
      if (!pd) return;
      try {
        var PHQ = PF.PHQShare;
        if (!PHQ) { toast('Share is still loading — try again.'); return; }
        if (isDl) PHQ.save(PAINTER, pd);
        else PHQ.share(PAINTER, pd);
      } catch (e2) { toast('Poster failed — try again.'); }
    });
    container.appendChild(root);
  }

  function mount(state, container) {
    if (!state || !container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-pa')) return true; /* already mounted */
    } catch (e) {}
    api('pac_spikes', { state: String(state) }, function (j) {
      if (!j || !j.ok) { hide(container); return; }
      try { render(container, j, state); } catch (e) { hide(container); }
    });
    return true;
  }

  try {
    window.PFPacAlerts = { mount: mount };
    PF.PacAlerts = window.PFPacAlerts;
  } catch (e) {}
})();
