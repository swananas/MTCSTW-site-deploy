/* games/fred-ticker.js  |  PF v1.4.3 | S-35 War-room ticker (Wave B5).
   Macro release feed for cell HQs — release-day events with the fresh
   official figure, honest "as of" stamps, steady hourly refresh.
   READ-ONLY, ZERO XP (no XP calls anywhere in this file).
   Backend: ?action=fred_ticker (cell-member-gated, mirrors propbounty_list;
   feed built in src/fred.js from fred_releases + fred_macro).
   Mounts: <div id="pf-fred-ticker"></div> when present; otherwise appends
   after #pf-cell-hq (cell HQ pages); silent no-op everywhere else.
   cell_id comes from the cell_mine primary-cell read (mounting context
   only) — never from URL params, never from user input. There is no
   location.search / URLSearchParams / hash read anywhere in this file.
   Copy contract (News Desk + Psych gates, binding):
     - never "live" / "now" — header reads "figures update daily from FRED";
     - every item carries "as of <retrieved_at>";
     - steady labels only; no red-flashing doom formatting, no animation;
     - no countdown-to-next-release (release dates are observed, never
       predicted — the backend never sends one);
     - stale items get a STALE badge + last-good as-of, never banner-less.
   Refresh: worker caches 6h; this client polls at most once per hour
   (POLL_MS = 60min — never faster).
   KILL: ?pf_off=fred_ticker  or  localStorage pf_disabled_v1='["fred_ticker"]' */
(function () {
  'use strict';
  try { init(); } catch (e) {}

  var KILL = 'fred_ticker';
  var POLL_MS = 60 * 60 * 1000; /* hourly — never faster (Psych gate) */
  var FETCH_TIMEOUT = 12000;

  function init() {
    var PF = window.PF;
    if (!PF || PF.skip(KILL)) return;
    var href = '';
    try { href = window.location.href || ''; } catch (e) {}
    if (/\/config\//.test(href)) return;
    try {
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
    } catch (e) {}

    var BACKEND = window.PF_BACKEND_URL;
    if (!BACKEND) return;

    var mount = document.getElementById('pf-fred-ticker');
    if (!mount) {
      var hq = document.getElementById('pf-cell-hq');
      if (!hq || !hq.parentNode) return; /* not a cell HQ page — silent no-op */
      mount = document.createElement('div');
      mount.id = 'pf-fred-ticker';
      hq.parentNode.insertBefore(mount, hq.nextSibling);
    }
    if (mount.getAttribute('data-pf-mounted')) return;
    mount.setAttribute('data-pf-mounted', '1');

    var id = ident();
    if (!id.callsign) {
      mount.innerHTML = shell(note('Claim a callsign to see the war-room ticker.'));
      return;
    }
    /* Primary cell from the same cell_mine read the HQ silo already loads
       for this viewer (supply-raid pattern). */
    api(BACKEND, 'cell_mine', { callsign: id.callsign, device: id.device }, function (j) {
      var cellId = (j && j.ok !== false && j.in_cell && j.cell && j.cell.id)
        ? String(j.cell.id) : '';
      if (!cellId) {
        mount.innerHTML = shell(note('Join a cell to see the war-room ticker.'));
        return;
      }
      paint(mount, BACKEND, id, cellId);
      setInterval(function () {
        try { paint(mount, BACKEND, id, cellId); } catch (e) {}
      }, POLL_MS);
    });
  }

  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET for reads. cell_mine is a private read — auto-attach the
     callsign session secret (same IDOR pattern as cell-hq.js). */
  function api(backend, action, params, cb) {
    if (action === 'cell_mine') {
      try {
        var _wpf = window.PF || null;
        var _sec = (_wpf && _wpf.getAuthSecret) ? _wpf.getAuthSecret() : '';
        if (_sec && params && !params.auth_secret) params.auth_secret = _sec;
      } catch (e) {}
    }
    var fn = 'pfTickCb' + Math.floor(Math.random() * 1e9);
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
      if (params[k] != null && params[k] !== '') {
        q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }
    }
    q += '&callback=' + fn;
    s.src = backend + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, FETCH_TIMEOUT);
  }

  function asOfDate(ms) {
    try {
      var t = Number(ms);
      if (!t) return '';
      return new Date(t).toISOString().slice(0, 10);
    } catch (e) { return ''; }
  }

  function shell(inner) {
    return '<div class="pf-ticker">' +
      '<div class="pf-ticker-head"><h3>WAR-ROOM TICKER</h3>' +
      '<div class="pf-ticker-sub">Macro releases, straight from FRED &mdash; ' +
      'figures update daily from FRED.</div></div>' +
      '<div class="pf-ticker-body">' + inner + '</div></div>';
  }

  function note(t) { return '<div class="pf-ticker-note">' + esc(t) + '</div>'; }

  function item(e) {
    var h = '<div class="pf-ticker-row">';
    h += '<div class="pf-ticker-line"><span class="pf-ticker-label">' +
      esc(e.label || e.series_id) + '</span>';
    if (e.stale) {
      h += ' <span class="pf-ticker-stale">STALE</span>';
    }
    h += '</div>';
    if (e.stale) {
      h += '<div class="pf-ticker-fig dim">Last good figure as of ' +
        esc(asOfDate(e.as_of)) + ' &mdash; refresh pending.</div>';
    } else {
      h += '<div class="pf-ticker-fig">' + esc(e.value_label || '') +
        (e.change_note ? ' <span class="pf-ticker-chg">(' + esc(e.change_note) + ')</span>' : '') +
        '</div>';
    }
    h += '<div class="pf-ticker-meta">' + esc(e.period_label || e.period || '') +
      ' &middot; as of ' + esc(asOfDate(e.as_of)) +
      ' &middot; <a href="' + esc(e.source_url) + '" target="_blank" rel="noopener">' +
      'FRED: ' + esc(e.series_id) + '</a></div>';
    h += '</div>';
    return h;
  }

  function paint(mount, backend, id, cellId) {
    api(backend, 'fred_ticker',
      { cell_id: cellId, callsign: id.callsign, device: id.device }, function (j) {
        try {
          if (!j || j.ok === false) {
            mount.innerHTML = shell(note("Couldn't reach the ticker — check back soon."));
            return;
          }
          var evs = (j && j.events) || [];
          var inner;
          if (!evs.length) {
            inner = note(j.note || 'No macro releases in the last 30 days.');
          } else {
            inner = evs.map(item).join('');
            if (j.ticker_as_of) {
              inner += '<div class="pf-ticker-foot">Ticker as of ' +
                esc(asOfDate(j.ticker_as_of)) + '.</div>';
            }
          }
          mount.innerHTML = shell(inner);
        } catch (e) {
          try { mount.innerHTML = shell(note("Couldn't reach the ticker — check back soon.")); } catch (e2) {}
        }
      });
  }
})();
