/* games/cell-seasons.js  |  PF v1.4.3 | CELL SEASONS — rivalry seasons.
   Engagement Build-C item #5. Forecasting pools + bounties wrapped in
   seasons: visible trophy, rivalry board, season winner. Fixed-house spine:
   the purse is fixed-house, NOT parimutuel — members can't feed a pot, so
   there is no arms race and no zero-sum extraction. Trophy + board + crown
   are 0 XP display; the winner's purse (<=500 XP-equiv) pays through the
   existing prizawd_ backend leg.

   Psych binding (QC greps this surface — keep even comments free of the
   banned vocabulary; the exact lists live in specs/engagement-gates.md
   Item 5): the public board shows TOP 5 leaders (points > 0 only) + each
   cell's OWN position privately — never a full public table; real per-cell
   opt-in (founder/leader consent, never default-in); mandatory off-week
   between seasons; no challenge/dare framing; resolution celebrates the
   winner with "season wrapped" language — defeat language is banned.

   Mount: self-mounting section appended to #pf-cells-page (registered in
   pages/page-mount.js pf-cells-page order as ['cell-seasons', null]).
   Trophy decorator: when a wrapped season names a winner, a trophy badge
   is added to that cell's card in the cell-hq DOM (guarded, fail-soft —
   pure decorator, never touches cell-hq internals).
   KILL: ?pf_off=cell-seasons or localStorage pf_disabled_v1='["cell-seasons"]'.
   Copy: never "donate", never Shane. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('cell-seasons')) { return; }
  if (window.pfCellSeasonsDone) return;
  window.pfCellSeasonsDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var SEC_ID = 'pf-cell-seasons';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    return cs;
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  function toast(m) {
    try { if (PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfCSeasCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e) {}
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

  /* POST enrollment. Prefers PF.authPost; falls back to fetch. The backend
     enforces founder/leader consent — the frontend only hints. */
  function postEnroll(cellId, cb) {
    var body = { type: 'cseason', cs_action: 'cseason_enroll', callsign: ident(), cell_id: cellId };
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, done); return; }
    try {
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e) { done(null); }
  }

  var CSS = [
    '.pf-cseas{color:#f5ead6;font-family:Arial,sans-serif;margin:0 0 18px}',
    '.pf-cseas-card{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:18px}',
    '.pf-cseas-kicker{font-weight:700;font-size:12px;letter-spacing:5px;color:#e8b923;margin-bottom:6px}',
    '.pf-cseas-title{font-weight:900;font-size:22px;letter-spacing:2px;margin:0 0 4px}',
    '.pf-cseas-note{font-size:13px;color:#c9bfa8;margin:0 0 12px}',
    '.pf-cseas-board{margin:10px 0}',
    '.pf-cseas-row{display:flex;justify-content:space-between;align-items:center;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px;margin-bottom:6px}',
    '.pf-cseas-row.lead{border-color:#e8b923}',
    '.pf-cseas-rank{font-weight:900;color:#e8b923;margin-right:10px}',
    '.pf-cseas-name{font-weight:700;flex:1}',
    '.pf-cseas-pts{font-size:13px;color:#c9bfa8}',
    '.pf-cseas-own{background:#241d08;border:1px solid #e8b923;border-radius:8px;padding:10px 14px;margin:10px 0;font-size:14px}',
    '.pf-cseas-enroll{border-top:1px solid #2a2a2a;margin-top:12px;padding-top:12px}',
    '.pf-cseas-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:900;letter-spacing:1px;cursor:pointer;font-size:14px}',
    '.pf-cseas-btn.ghost{background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6}',
    '.pf-cseas-hist{margin-top:14px;border-top:1px solid #2a2a2a;padding-top:10px}',
    '.pf-cseas-hist h4{font-size:14px;letter-spacing:2px;margin:0 0 8px;color:#e8b923}',
    '.pf-cseas-trophy{font-size:15px;margin-bottom:6px}',
    '.pf-cseas-empty{font-size:14px;color:#c9bfa8;text-align:center;padding:14px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-cseas-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-cseas-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmtDate(ts) {
    try {
      return new Date(Number(ts)).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  function renderBoard(board) {
    if (!board || !board.length) {
      return '<div class="pf-cseas-empty">No scores on the board yet — the season is young.</div>';
    }
    var h = '<div class="pf-cseas-board">';
    var medals = ['&#129351;', '&#129352;', '&#129353;'];
    board.forEach(function (b, i) {
      h += '<div class="pf-cseas-row' + (i === 0 ? ' lead' : '') + '">' +
        '<span><span class="pf-cseas-rank">' + (medals[i] || ('#' + (i + 1))) + '</span>' +
        '<span class="pf-cseas-name">' + esc(b.cell_name) + '</span></span>' +
        '<span class="pf-cseas-pts">' + (b.points | 0) + ' pts</span></div>';
    });
    return h + '</div>';
  }

  function render(sec, cur, hist, mine) {
    var h = '<div class="pf-cseas-kicker">CELLS &middot; RIVALRY SEASONS</div>' +
      '<h3 class="pf-cseas-title">CELL SEASONS</h3>';
    if (!cur || !cur.season) {
      h += '<div class="pf-cseas-empty">No season is running right now. When the next one opens, founders can enter their cell — sitting out is always fine.</div>';
    } else {
      var s = cur.season;
      h += '<p class="pf-cseas-note"><b>' + esc(s.name) + '</b> &middot; ' +
        esc(fmtDate(s.starts_at)) + ' &ndash; ' + esc(fmtDate(s.ends_at)) + '<br>' +
        esc(s.note || '') + '</p>';
      h += renderBoard(cur.board);
      if (cur.own) {
        h += '<div class="pf-cseas-own">Your cell <b>' + esc(cur.own.cell_name) + '</b> sits #' +
          (cur.own.position | 0) + ' of ' + (cur.own.of | 0) + ' entered cells with ' +
          (cur.own.points | 0) + ' pts.</div>';
      }
      if (s.status === 'open') {
        h += '<div class="pf-cseas-enroll">';
        if (mine && mine.cell && mine.is_founder) {
          h += '<p class="pf-cseas-note">You lead <b>' + esc(mine.cell.name || mine.cell.id) + '</b>. Entering is your call — one season at a time, and every season is followed by a full off-week.</p>' +
            '<button class="pf-cseas-btn" data-cseas="enroll" data-cell="' + esc(mine.cell.id) + '">ENTER MY CELL</button>';
        } else if (mine && mine.cell) {
          h += '<p class="pf-cseas-note">Only your cell&rsquo;s founder or a leader can enter the cell. (You&rsquo;re a member of <b>' + esc(mine.cell.name || mine.cell.id) + '</b>.)</p>';
        } else {
          h += '<p class="pf-cseas-note">Found a cell or join one to enter a season — enrollment is always the founder&rsquo;s call.</p>';
        }
        h += '</div>';
      } else {
        h += '<p class="pf-cseas-note">Enrollment is closed for this season.</p>';
      }
    }
    if (hist && hist.seasons && hist.seasons.length) {
      h += '<div class="pf-cseas-hist"><h4>PAST SEASONS</h4>';
      hist.seasons.slice(0, 5).forEach(function (w) {
        h += '<div class="pf-cseas-trophy">&#127942; ' + esc(w.note || 'Season wrapped.') + '</div>';
      });
      h += '</div>';
    }
    sec.innerHTML = h;
    var eb = sec.querySelector('[data-cseas="enroll"]');
    if (eb) {
      eb.addEventListener('click', function () {
        eb.disabled = true;
        postEnroll(eb.getAttribute('data-cell'), function (j) {
          if (j && j.ok) { toast('Your cell is in. Good luck out there.'); load(sec); }
          else { toast((j && j.err) || 'Could not enter your cell.'); eb.disabled = false; }
        });
      });
    }
  }

  /* Trophy decorator: adds a trophy badge to the winning cell's card in the
     cell-hq DOM (buttons carry data-cell="<id>"). Guarded + fail-soft. */
  function decorateTrophy(winnerId, winnerName, attempt) {
    if (!winnerId) return;
    try {
      var done = false;
      var btns = document.querySelectorAll('button[data-cell="' + winnerId.replace(/"/g, '') + '"]');
      for (var i = 0; i < btns.length; i++) {
        var card = btns[i].closest ? btns[i].closest('.hq-card') : null;
        if (card && !card.querySelector('[data-cseas-trophy]')) {
          var hd = card.querySelector('h3');
          if (hd) {
            var sp = document.createElement('span');
            sp.setAttribute('data-cseas-trophy', '1');
            sp.className = 'hq-badge';
            sp.textContent = '\uD83C\uDFC6 SEASON CHAMPION';
            hd.appendChild(sp);
            done = true;
          }
        }
      }
      if (!done && (attempt || 0) < 20) {
        setTimeout(function () { decorateTrophy(winnerId, winnerName, (attempt || 0) + 1); }, 1000);
      }
    } catch (e) {}
  }

  function load(sec) {
    var cs = ident();
    var params = cs ? { callsign: cs, auth_secret: authSecret() } : {};
    api('cseason_current', params, function (cur) {
      api('cseason_history', {}, function (hist) {
        var doneMine = function (mine) {
          if (!cur || !cur.ok) {
            sec.innerHTML = '<div class="pf-cseas-empty">The seasons board is unreachable right now — try again soon.</div>';
            return;
          }
          render(sec, cur, hist && hist.ok ? hist : null, mine);
          if (hist && hist.ok && hist.seasons && hist.seasons.length && hist.seasons[0].winner_cell) {
            decorateTrophy(hist.seasons[0].winner_cell, hist.seasons[0].winner_name, 0);
          }
        };
        if (cs) {
          api('cell_mine', params, function (m) {
            doneMine(m && m.ok ? m : null);
          });
        } else { doneMine(null); }
      });
    });
  }

  function mount(attempt) {
    try {
      if (document.getElementById(SEC_ID)) return;
      var host = document.getElementById('pf-cells-page');
      if (!host) {
        if ((attempt || 0) < 20) setTimeout(function () { mount((attempt || 0) + 1); }, 500);
        return;
      }
      cssOnce();
      var wrap = document.createElement('div');
      wrap.className = 'pf-cseas';
      var sec = document.createElement('div');
      sec.className = 'pf-cseas-card';
      sec.id = SEC_ID;
      sec.innerHTML = '<div class="pf-cseas-empty">Raising the seasons board&hellip;</div>';
      wrap.appendChild(sec);
      host.appendChild(wrap);
      load(sec);
    } catch (e) {}
  }

  mount(0);
})();
