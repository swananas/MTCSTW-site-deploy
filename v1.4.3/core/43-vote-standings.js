/* core/43-vote-standings.js  |  PF v1.4.3 | Live weekly fan-vote standings.
   CEO directive 2026-10-07: show live weekly fan-vote counts on creator
   catalog pages, with a "LEADING THIS WEEK" badge on the frontrunner.

   Pattern (proven model from creator-DB / core/07-slr-db.js):
   1. One source of truth — the worker's public `results` action
      (GET ?action=results&week=YYYY-W## → {week, votes:{slug:total}}),
      the same endpoint the ballot (games/fan-vote.js) reads. No new
      backend endpoint, no worker deploy, no @main data push.
   2. Live pull with fallback — JSONP fetchLive() with a 3s timeout,
      client-side cache (memory + localStorage, 8 min TTL); on any
      failure the standings line simply renders nothing (fail-soft).
   3. Auto re-render — custom `pf-vote-live` event; consumers repaint on
      arrival. No manual sync.

   Read-only: zero XP, zero writes anywhere. Fan votes never grant XP
   (standing rule) and this module never casts one.
   R3 (2026-10-04): Jeanine Pirreaux Comedy is do-not-touch — excluded
   from the standings display, mirroring VOTE_SKIP_SLUGS on the catalog.
   API: PF.voteStandings.ensure() (promise), PF.voteStandings.count(slug),
        PF.voteStandings.leader() ({slug, votes} | null),
        PF.voteStandings.paint(root, slug) (idempotent DOM paint).
   KILL: ?pf_off=vote-standings  or  localStorage pf_disabled_v1='["vote-standings"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('vote-standings')) { return; }

  var RED = '#c1121f', MUTED = '#b8ab8e';
  var SKIP_SLUGS = ['jeanine-pirreaux-comedy'];
  var CACHE_KEY = 'pf_vote_standings_v1';
  var CACHE_TTL_MS = 8 * 60 * 1000; /* 8 min: live-ish, cheap on D1 */
  var LIVE_TIMEOUT_MS = 3000;

  var _mem = null;   /* {week, ts, tallies:{slug:votes}, total} */
  var _pending = null;

  function apiBase() {
    var u = '';
    try { u = window.PF_BACKEND_URL || ''; } catch (e) {}
    return u || 'https://pf-api.mtcstw.workers.dev';
  }

  /* Current Chicago ISO week key 'YYYY-W##' — same algorithm as the ballot
     (games/fan-vote.js) and the backend voteWeek(); prefer PF.isoWeekKey
     when the bus offers it. */
  function weekKey() {
    try {
      if (PF.isoWeekKey && PF.chiNow) return PF.isoWeekKey(PF.chiNow());
    } catch (e) {}
    var d = new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    var w = 1 + Math.round((t - first) / 6048e5);
    return t.getUTCFullYear() + '-W' + (w < 10 ? '0' + w : String(w));
  }

  function normTallies(votes) {
    var out = {}, total = 0;
    if (votes && typeof votes === 'object') {
      for (var k in votes) {
        if (!Object.prototype.hasOwnProperty.call(votes, k)) continue;
        var n = Math.max(0, Math.round(Number(votes[k]) || 0));
        out[String(k).toLowerCase()] = n;
        total += n;
      }
    }
    return { tallies: out, total: total };
  }

  function readCache(wk) {
    if (_mem && _mem.week === wk && (Date.now() - _mem.ts) < CACHE_TTL_MS) return _mem;
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        var c = JSON.parse(raw);
        if (c && c.week === wk && c.tallies && (Date.now() - (c.ts || 0)) < CACHE_TTL_MS) {
          _mem = c;
          return c;
        }
      }
    } catch (e) {}
    return null;
  }

  function writeCache(rec) {
    _mem = rec;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(rec)); } catch (e) {}
  }

  /* fetchLive(): JSONP pull of the public results action, 3s timeout —
     the same transport the ballot and repLine use for PF_BACKEND_URL reads. */
  function fetchLive(wk) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(rec) {
        if (done) return; done = true;
        resolve(rec || null);
      }
      try {
        var cb = 'pfVsCb' + Math.floor(Math.random() * 1e9);
        var s = document.createElement('script');
        var to = setTimeout(function () { fin(null); cleanup(); }, LIVE_TIMEOUT_MS);
        function cleanup() {
          try { delete window[cb]; } catch (e) {}
          try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
        }
        window[cb] = function (data) {
          clearTimeout(to);
          try {
            var votes = data && data.votes;
            var n = normTallies(votes);
            var rec = { week: String((data && data.week) || wk), ts: Date.now(), tallies: n.tallies, total: n.total };
            if (rec.total >= 0) { fin(rec); } else { fin(null); }
          } catch (e) { fin(null); }
          cleanup();
        };
        s.onerror = function () { clearTimeout(to); fin(null); cleanup(); };
        s.async = true;
        s.src = apiBase() + '?action=' + encodeURIComponent('results')
          + '&week=' + encodeURIComponent(wk) + '&callback=' + cb;
        document.head.appendChild(s);
      } catch (e) { fin(null); }
    });
  }

  function ensure() {
    var wk = weekKey();
    var hit = readCache(wk);
    if (hit) return Promise.resolve(hit);
    if (_pending) return _pending;
    _pending = new Promise(function (resolve) {
      fetchLive(wk).then(function (rec) {
        _pending = null;
        if (rec) {
          writeCache(rec);
          PF.log && PF.log('vote-standings', 'live tallies applied: week ' + rec.week + ', ' + rec.total + ' votes');
          try { document.dispatchEvent(new CustomEvent('pf-vote-live')); } catch (e) {}
          resolve(rec);
        } else {
          PF.error && PF.error('vote-standings', 'live fetch missed; no standings');
          resolve(null);
        }
      });
    });
    return _pending;
  }

  function isSkip(slug) {
    return SKIP_SLUGS.indexOf(String(slug || '').toLowerCase()) !== -1;
  }

  function count(slug) {
    var s = String(slug || '').toLowerCase();
    if (isSkip(s) || !_mem || !_mem.tallies) return null;
    var v = _mem.tallies[s];
    return (typeof v === 'number') ? v : 0;
  }

  /* Frontrunner: highest total among non-skipped slugs; ties break by
     slug alphabetically (deterministic). Null when nobody has votes yet. */
  function leader() {
    if (!_mem || !_mem.tallies || _mem.total <= 0) return null;
    var best = null, bestVotes = 0;
    for (var k in _mem.tallies) {
      if (!Object.prototype.hasOwnProperty.call(_mem.tallies, k)) continue;
      if (isSkip(k)) continue;
      var v = _mem.tallies[k];
      if (v > bestVotes || (v === bestVotes && v > 0 && (best === null || k < best))) {
        best = k; bestVotes = v;
      }
    }
    return best ? { slug: best, votes: bestVotes } : null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Idempotent paint into [data-pf-votestandings] (one line, "show less,
     mean more"): the frontrunner gets the ★ LEADING THIS WEEK badge;
     every other creator shows only their count when > 0; anything
     unknown or skipped renders nothing. */
  function paint(root, slug) {
    var host = null;
    try { host = (root || document).querySelector('[data-pf-votestandings]'); } catch (e) {}
    if (!host) return;
    var s = String(slug || '').toLowerCase();
    var html = '';
    try {
      var n = count(s);
      if (n !== null) {
        var L = leader();
        var isLeader = !!(L && L.slug === s && n > 0);
        if (isLeader) {
          html = '<span style="display:inline-block;background:' + RED + ';color:#fff;'
            + 'font-weight:900;letter-spacing:0.16em;font-size:0.78rem;'
            + 'padding:0.32rem 0.9rem;">&#9733; LEADING THIS WEEK</span>'
            + '<div style="margin-top:0.35rem;font-size:0.85rem;color:' + MUTED + ';letter-spacing:0.06em;">'
            + esc(n) + ' VOTES THIS WEEK</div>';
        } else if (n > 0) {
          html = '<span style="font-size:0.85rem;color:' + MUTED + ';letter-spacing:0.06em;">'
            + esc(n) + ' VOTES THIS WEEK</span>';
        }
      }
    } catch (e2) { html = ''; }
    try { host.innerHTML = html; } catch (e3) {}
  }

  PF.voteStandings = {
    ensure: ensure,
    count: count,
    leader: leader,
    paint: paint,
    week: weekKey,
    skipSlugs: SKIP_SLUGS.slice()
  };

  /* Warm the cache on load so catalog pages paint fast; paint itself is
     driven by the page + the pf-vote-live event. Fail-soft throughout. */
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ensure(); });
    else setTimeout(function () { ensure(); }, 0);
  } catch (e) {}
})();
