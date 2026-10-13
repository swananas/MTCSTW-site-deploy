/* core/money-pools.js  |  PF v1.4.3 | PREDICTION POOL — "guess the next CPI print".
   Engagement Build-C item #1. Weekly free-pick pool on /money: pick a range
   for the next CPI year-over-year print. The free, social sibling of the
   S-22 CPI arcade game — guess, talk, resolve, honor. NO stakes, NO escrow,
   NO shared pot (deliberately not a market: a social pool with a pot would
   teach zero-sum extraction).

   XP: placing a pick = 0 XP. Correct reads earn a fixed +25 XP recognition
   through the existing predict_win_ backend leg (NO_MULT/NO_COMM,
   daily-cap counted, Economy-signed). Resolution reads the FRED CPIAUCNS
   vintage; a missing/stale vintage voids the pool (0 XP, fail-closed).

   Psych binding (QC greps this surface — keep even comments free of the
   banned vocabulary; the exact list lives in specs/engagement-gates.md
   Item 1): informational resolution framing ("the print came in at X —
   these callsigns called it"), never win/lose binary; the "experimental
   prediction pool — not a forecast" badge ships; fixed weekly cadence.

   Mount: appends a section to #pf-money (the /money full page). Fail-soft
   everywhere else. Master kill ?pf_off=money darkens it via PF.skip.
   KILL: ?pf_off=money (master) or ?pf_off=money-pools.
   Copy: never "donate", never Shane. JOIN THE FIGHT standard untouched. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('money') || PF.skip('money-pools')) { return; }
  if (window.pfMoneyPoolsDone) return;
  window.pfMoneyPoolsDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var SEC_ID = 'pf-pool-cpi';

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

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPoolCb' + Math.floor(Math.random() * 1e9);
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

  /* POST a pick. Prefers PF.authPost (session-aware); falls back to fetch
     (same pattern as games/predict.js). */
  function postPick(poolId, bucket, cb) {
    var body = { type: 'pool', p_action: 'pool_pick', callsign: ident(), pool_id: poolId, range_bucket: bucket };
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
    '.pf-pool{max-width:960px;margin:0 auto 14px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-pool-sec{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:18px}',
    '.pf-pool-kicker{font-weight:700;font-size:12px;letter-spacing:5px;color:#e8b923;margin-bottom:6px}',
    '.pf-pool-title{font-weight:900;font-size:22px;letter-spacing:2px;margin:0 0 4px}',
    '.pf-pool-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;color:#0d0d0d;background:#e8b923;border-radius:4px;padding:3px 8px;margin:6px 0 10px}',
    '.pf-pool-sub{font-size:13px;color:#c9bfa8;margin:0 0 12px}',
    '.pf-pool-grid{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
    '.pf-pool-bkt{flex:1;min-width:120px;background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:8px;padding:12px 8px;cursor:pointer;text-align:center}',
    '.pf-pool-bkt b{display:block;font-size:15px;margin-bottom:4px}',
    '.pf-pool-bkt span{font-size:12px;color:#c9bfa8}',
    '.pf-pool-bkt.mine{border-color:#e8b923;background:#241d08}',
    '.pf-pool-bkt:disabled{cursor:default;opacity:.85}',
    '.pf-pool-note{font-size:13px;color:#c9bfa8;margin-top:10px}',
    '.pf-pool-res{border-top:1px solid #2a2a2a;margin-top:12px;padding-top:10px;font-size:14px}',
    '.pf-pool-res b{color:#e8b923}',
    '.pf-pool-empty{font-size:14px;color:#c9bfa8;text-align:center;padding:16px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-pool-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-pool-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmtClose(ts) {
    try {
      var d = new Date(Number(ts));
      return d.toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT';
    } catch (e) { return ''; }
  }

  function render(sec, st) {
    var p = st && st.pool;
    if (!p) {
      sec.innerHTML =
        '<div class="pf-pool-kicker">FOLLOW THE MONEY &middot; COMMUNITY POOL</div>' +
        '<div class="pf-pool-empty">No pool open this week — check back when the next print approaches.</div>';
      return;
    }
    var now = Date.now(), closed = now >= Number(p.closes_at) || p.status !== 'open';
    var h = '<div class="pf-pool-kicker">FOLLOW THE MONEY &middot; COMMUNITY POOL</div>' +
      '<h3 class="pf-pool-title">GUESS THE NEXT CPI PRINT</h3>' +
      '<span class="pf-pool-badge">' + esc(st.badge || 'experimental prediction pool — not a forecast') + '</span>' +
      '<p class="pf-pool-sub">' + esc(p.release_label || 'Next CPI release') +
      ' &middot; picks close ' + esc(fmtClose(p.closes_at)) + '.</p>' +
      '<div class="pf-pool-grid">';
    p.buckets.forEach(function (b) {
      var mine = p.my_pick === b.id ? ' mine' : '';
      var dis = (closed || p.my_pick) ? ' disabled' : '';
      h += '<button class="pf-pool-bkt' + mine + '"' + dis + ' data-bkt="' + esc(b.id) + '">' +
        '<b>' + esc(b.label) + '</b><span>' + (b.count | 0) + ' reading' + ((b.count | 0) === 1 ? '' : 's') + '</span></button>';
    });
    h += '</div>';
    if (p.my_pick) {
      var lbl = '';
      p.buckets.forEach(function (b) { if (b.id === p.my_pick) lbl = b.label; });
      h += '<div class="pf-pool-note">Your read is locked in: <b>' + esc(lbl) + '</b>. One read per callsign per pool.</div>';
    } else if (!closed) {
      h += '<div class="pf-pool-note">Tap a range to lock in your read. Free to enter — correct reads earn +25 XP recognition when the print lands.</div>';
    } else {
      h += '<div class="pf-pool-note">Picks are closed for this pool.</div>';
    }
    if (p.resolution) {
      var r = p.resolution;
      h += '<div class="pf-pool-res">';
      if (p.status === 'resolved' && r.vintage_value != null) {
        h += 'The print came in at <b>' + esc(Number(r.vintage_value).toFixed(1)) + '% YoY</b> (' + esc(r.vintage_period || '') + ') — ' +
          (r.called_it && r.called_it.length
            ? 'these callsigns called it: <b>' + esc(r.called_it.join(', ')) + '</b>.'
            : 'nobody called this one.');
      } else {
        h += esc(r.note || 'This pool was set aside — no recognition granted.');
      }
      h += '</div>';
    }
    sec.innerHTML = h;
    if (!closed && !p.my_pick) {
      var btns = sec.querySelectorAll('[data-bkt]');
      for (var i = 0; i < btns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var cs = ident();
            if (!cs) { toast('Sign in with your callsign to lock in a read.'); return; }
            btn.disabled = true;
            postPick(p.id, btn.getAttribute('data-bkt'), function (j) {
              if (j && j.ok) { load(sec); }
              else { toast((j && j.err) || 'Could not lock in your read.'); btn.disabled = false; }
            });
          });
        })(btns[i]);
      }
    }
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

  function load(sec) {
    var cs = ident();
    var params = cs ? { callsign: cs, auth_secret: authSecret() } : {};
    api('pool_status', params, function (st) {
      if (!st || !st.ok) {
        sec.innerHTML = '<div class="pf-pool-empty">The pool board is unreachable right now — try again soon.</div>';
        return;
      }
      render(sec, st);
    });
  }

  function mount(attempt) {
    try {
      if (document.getElementById(SEC_ID)) return;
      var host = document.getElementById('pf-money');
      if (!host) {
        if ((attempt || 0) < 20) setTimeout(function () { mount((attempt || 0) + 1); }, 500);
        return;
      }
      cssOnce();
      var wrap = document.createElement('div');
      wrap.className = 'pf-pool';
      var sec = document.createElement('div');
      sec.className = 'pf-pool-sec';
      sec.id = SEC_ID;
      sec.innerHTML = '<div class="pf-pool-empty">Reading the room&hellip;</div>';
      wrap.appendChild(sec);
      host.appendChild(wrap);
      load(sec);
    } catch (e) {}
  }

  mount(0);
})();
