/* games/hq-mission.js | PF v1.4.3 | CREATOR HQ MISSION CONTROL.
   The visible payoff loop: one screen answering three questions —
   1. WHERE IT'S SURFACING (per-creator synergy map, consumes the Creator API
      synergy engine contract via public ?api_action=synergy_by_creator);
   2. WHAT IT EARNED (read-only XP + visibility stats);
   3. THE WIRE (release-day prompts, consumes S-28 ?action=fred_release_prompts).

   Self-mounts into #pf-hq-mission (Squarespace Code block on the Creator HQ
   Dashboard page — HAND-STEP, not in this branch). Silent no-op everywhere else.
   Ships in games/bundle-create.js (Creator HQ bundle).

   DESIGN RULES (Psych spec-review 2026-10-05, PASS WITH FIXES — all applied):
   - Attribution factual, NEVER ranked: fixed canonical surface order, no
     leaderboards, no comparisons, no percentiles. D-4 exception not invoked.
   - No status-anxiety copy: counts are facts, never deficits; empty states
     explain how the system fills in, never shame.
   - No grind framing: the wire is information, not a quota. No streaks, no
     "don't miss", no urgency language. DISMISS is neutral and session-persisted.
   - No perverse incentives: ZERO XP anywhere in this module — no grants, no
     legs, no XP-adjacent counters (Psych F1: no prompt-compliance tracking).
   - Absolute numbers only (Psych F2): no deltas, no growth framing.
   - Honest empties + fail-soft everywhere. Nothing invented, ever.
   COPY: provisional — Brand Consistency owns the tone bar.
   KILL: ?pf_off=hq-mission or localStorage pf_disabled_v1='["hq-mission"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('hq-mission')) { return; }
  var host = document.getElementById('pf-hq-mission');
  if (!host) { return; } /* silent no-op: the Dashboard hand-step isn't placed yet */

  var BACKEND = window.PF_BACKEND_URL || '';
  var TIMEOUT_MS = 12000;
  var SLUG_KEY = 'pf_mission_slug';
  var DISMISS_KEY = 'pf_wire_dismissed_v1';

  /* Canonical synergy surfaces — fixed order, never ranked by count. */
  var SURFACES = [
    { id: 'catalog',      label: 'CATALOG PAGE' },
    { id: 'roster',       label: 'SICK LEFT RADICALS ROSTER' },
    { id: 'ammo-finder',  label: 'AMMO FINDER CITATIONS' },
    { id: 'briefing',     label: 'THE BRIEFING' },
    { id: 'news-rail',    label: 'NEWS RAIL' },
    { id: 'political-hq', label: 'POLITICAL HQ' },
    { id: 'money-macro',  label: 'MONEY: MACRO WALL' },
    { id: 'economy-trends', label: 'ECONOMY TRENDS' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : null;
  }
  function validSlug(s) { return /^[a-z0-9_-]{1,64}$/.test(String(s || '')); }
  function fmtNum(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('en-US');
  }
  function G(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function S(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(m) {
    try { if (PF.toast) { PF.toast(m); return; } } catch (e) {}
  }

  /* JSONP GET. kind='action' -> ?action= ; kind='api' -> ?api_action= (public API namespace). */
  function api(kind, action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMcCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j || null);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = kind === 'api' ? '?api_action=' + encodeURIComponent(action)
                           : '?action=' + encodeURIComponent(action);
    var p = params || {};
    for (var k in p) {
      if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  function copyText(txt, okMsg) {
    function doneOk() { toast(okMsg || 'Copied.'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
        return;
      }
      fallback();
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }

  /* ---------------- identity ---------------- */
  function urlCreator() {
    try {
      var m = (window.location.search || '').match(/[?&]creator=([^&]+)/);
      var v = m ? decodeURIComponent(m[1]) : '';
      return validSlug(v) ? v : '';
    } catch (e) { return ''; }
  }
  function rosterMembers() {
    try {
      if (PF.slrAll) { var a = PF.slrAll(); if (a && a.length) return a; }
    } catch (e) {}
    return [];
  }
  function memberName(slug) {
    var ms = rosterMembers();
    for (var i = 0; i < ms.length; i++) {
      if (ms[i] && ms[i].slug === slug) return ms[i].name || slug;
    }
    return slug;
  }
  function resolveSlug() {
    var u = urlCreator();
    if (u) { S(SLUG_KEY, u); return u; }
    var s = G(SLUG_KEY);
    return validSlug(s) ? s : '';
  }

  /* ---------------- render: shell ---------------- */
  var CSS =
    '#pf-hq-mission{font-family:Arial,sans-serif;color:#f5ead6;max-width:860px;margin:0 auto}' +
    '#pf-hq-mission .mc-shell{border:1px solid #3a3a3a;border-top:4px solid #c1121f;background:#0d0d0d;padding:20px 18px;margin:0 0 18px}' +
    '#pf-hq-mission h2{font:bold 22px Arial;letter-spacing:3px;color:#fff;margin:0 0 4px}' +
    '#pf-hq-mission .mc-sub{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 14px}' +
    '#pf-hq-mission .mc-who{font:700 13px Arial;color:#f5ead6;letter-spacing:1px;margin:0 0 14px}' +
    '#pf-hq-mission .mc-who button{background:none;border:1px solid #6b6250;color:#b8a98a;font:700 11px Arial;letter-spacing:1px;padding:4px 10px;margin-left:10px;cursor:pointer}' +
    '#pf-hq-mission .mc-panel{border:1px solid #2c2c2c;background:#111;padding:16px;margin:0 0 14px}' +
    '#pf-hq-mission .mc-panel h3{font:bold 15px Arial;letter-spacing:2px;color:#dc143c;margin:0 0 4px}' +
    '#pf-hq-mission .mc-panel .mc-note{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-hq-mission .mc-row{display:flex;justify-content:space-between;align-items:center;padding:9px 2px;border-bottom:1px solid #222;font:400 14px Arial}' +
    '#pf-hq-mission .mc-row:last-child{border-bottom:0}' +
    '#pf-hq-mission .mc-row .mc-lab{color:#f5ead6;letter-spacing:1px;font-size:12px;font-weight:700}' +
    '#pf-hq-mission .mc-row .mc-n{font:bold 18px Arial;color:#fff}' +
    '#pf-hq-mission .mc-row a.mc-go{font:700 11px Arial;letter-spacing:1px;color:#dc143c;text-decoration:none;border:1px solid #dc143c;padding:4px 10px}' +
    '#pf-hq-mission .mc-empty{border:1px dashed #3a3a3a;padding:22px 14px;text-align:center}' +
    '#pf-hq-mission .mc-empty h4{font:bold 14px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}' +
    '#pf-hq-mission .mc-empty p{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-hq-mission .mc-empty a{color:#dc143c;font-weight:700}' +
    '#pf-hq-mission .mc-load{color:#b8a98a;font:400 13px Arial;padding:14px 2px}' +
    '#pf-hq-mission .mc-err{border:1px solid #c1121f;background:#1a0505;color:#f5ead6;padding:12px;font:400 13px/1.6 Arial}' +
    '#pf-hq-mission .mc-err button{background:#c1121f;color:#fff;border:0;font:700 12px Arial;padding:6px 14px;margin-left:10px;cursor:pointer}' +
    '#pf-hq-mission .mc-prompt{border:1px solid #2c2c2c;border-left:4px solid #dc143c;background:#141414;padding:14px;margin:0 0 10px}' +
    '#pf-hq-mission .mc-prompt h4{font:bold 14px Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}' +
    '#pf-hq-mission .mc-prompt .mc-fig{font:bold 20px Arial;color:#dc143c;margin:0 0 6px}' +
    '#pf-hq-mission .mc-prompt p{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-hq-mission .mc-prompt .mc-actions{display:flex;gap:8px;flex-wrap:wrap}' +
    '#pf-hq-mission .mc-prompt button{font:700 11px Arial;letter-spacing:1px;padding:7px 14px;cursor:pointer;border:1px solid #dc143c}' +
    '#pf-hq-mission .mc-prompt .mc-copy{background:#dc143c;color:#fff}' +
    '#pf-hq-mission .mc-prompt .mc-dis{background:none;color:#b8a98a;border-color:#6b6250}' +
    '#pf-hq-mission .mc-picker input{width:100%;box-sizing:border-box;background:#0d0d0d;border:1px solid #3a3a3a;color:#f5ead6;font:400 14px Arial;padding:10px;margin:0 0 10px}' +
    '#pf-hq-mission .mc-picker .mc-plist{max-height:260px;overflow-y:auto;border:1px solid #2c2c2c}' +
    '#pf-hq-mission .mc-picker .mc-pick{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #222;color:#f5ead6;font:400 14px Arial;padding:10px 12px;cursor:pointer}' +
    '#pf-hq-mission .mc-picker .mc-pick:hover{background:#1a1a1a}' +
    '#pf-hq-mission .mc-kv{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #222;font:400 14px Arial}' +
    '#pf-hq-mission .mc-kv:last-child{border-bottom:0}' +
    '#pf-hq-mission .mc-kv .mc-k{color:#b8a98a;font-size:12px;letter-spacing:1px}' +
    '#pf-hq-mission .mc-kv .mc-v{font:bold 16px Arial;color:#fff}' +
    '#pf-hq-mission .mc-cta{display:inline-block;margin-top:10px;color:#dc143c;font:700 12px Arial;letter-spacing:1px;text-decoration:none;border:1px solid #dc143c;padding:8px 16px}' +
    '@media (max-width:640px){#pf-hq-mission .mc-shell{padding:14px 12px}#pf-hq-mission .mc-row{flex-wrap:wrap}}' +
    '@media (prefers-reduced-motion:reduce){#pf-hq-mission *{transition:none!important;animation:none!important}}';

  function shell(title, sub) {
    return '<style>' + CSS + '</style>' +
      '<div class="mc-shell"><h2>' + esc(title) + '</h2>' +
      '<p class="mc-sub">' + esc(sub) + '</p><div id="mc-body"></div></div>';
  }

  /* ---------------- panel 1: synergy map ---------------- */
  function surfaceLink(id, slug) {
    /* Deep links only where the destination is known-good. Other surfaces
       render the count without a link until the engine ships surface_refs. */
    if (id === 'roster') return '/sick-left-radicals';
    if (id === 'political-hq') return '/political-hq';
    if (id === 'catalog') {
      try {
        var m = PF.slrMember ? PF.slrMember(slug) : null;
        if (m && m.catalog_path && safeUrl(m.catalog_path)) return m.catalog_path;
        if (m && m.catalog_path && m.catalog_path.charAt(0) === '/') return m.catalog_path;
      } catch (e) {}
      return '';
    }
    if (id === 'ammo-finder' && document.getElementById('pf-ammo')) return '#pf-ammo';
    return '';
  }

  function renderMap(el, slug) {
    el.innerHTML = '<div class="mc-panel"><h3>WHERE IT\'S SURFACING</h3>' +
      '<p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p>' +
      '<div class="mc-load">Reading the map…</div></div>';
    var panel = el.firstChild;
    api('api', 'synergy_by_creator', { slug: slug }, function (j) {
      if (!j || j.ok !== true || !Array.isArray(j.surfaces)) {
        /* Engine not live (or unreachable): the honest connecting state. */
        panel.innerHTML = '<h3>WHERE IT\'S SURFACING</h3>' +
          '<div class="mc-empty"><h4>SYNERGY MAP CONNECTING</h4>' +
          '<p>The engine that traces your work across the network is still being wired up. ' +
          'Nothing is lost — the map lights up automatically when it lands.</p></div>';
        return;
      }
      var counts = {};
      j.surfaces.forEach(function (s) {
        if (s && s.surface) counts[s.surface] = Number(s.count) || 0;
      });
      var total = SURFACES.reduce(function (a, s) { return a + (counts[s.id] || 0); }, 0);
      if (total === 0) {
        panel.innerHTML = '<h3>WHERE IT\'S SURFACING</h3>' +
          '<div class="mc-empty"><h4>NOTHING ON THE MAP YET</h4>' +
          '<p>The map fills in as your catalog items get cited, briefed, and remixed. ' +
          'Push your first catalog update and come back — this page will show it.</p>' +
          (document.getElementById('pf-ammo')
            ? '<a href="#pf-ammo">OPEN THE AMMO FINDER →</a>'
            : '') +
          '</div>';
        return;
      }
      var h = '<h3>WHERE IT\'S SURFACING</h3>' +
        '<p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p>';
      SURFACES.forEach(function (sf) {
        var n = counts[sf.id] || 0;
        var link = surfaceLink(sf.id, slug);
        h += '<div class="mc-row"><span class="mc-lab">' + esc(sf.label) + '</span>' +
          '<span><span class="mc-n">' + fmtNum(n) + '</span>' +
          (link ? ' <a class="mc-go" href="' + esc(link) + '">OPEN →</a>' : '') +
          '</span></div>';
      });
      panel.innerHTML = h;
    });
  }

  /* ---------------- panel 2: earnings (read-only) ---------------- */
  function deviceXp() {
    try {
      var r = G('pf_ranks_v1') || {};
      return Math.round(Number(r.xp) || 0);
    } catch (e) { return 0; }
  }
  function callsign() {
    try { return (window.PFCallsign && window.PFCallsign()) || ''; } catch (e) { return ''; }
  }

  function renderEarnings(el, slug) {
    el.innerHTML = '<div class="mc-panel"><h3>WHAT IT EARNED</h3>' +
      '<p class="mc-note">Read-only. This screen never grants XP.</p>' +
      '<div class="mc-load">Tallying…</div></div>';
    var panel = el.firstChild;
    var cs = callsign();
    var done = 0, bal = null, stats = null;
    function fin() {
      done++;
      if (done < 2) return;
      var h = '<h3>WHAT IT EARNED</h3>' +
        '<p class="mc-note">Read-only. This screen never grants XP.</p>';
      /* XP — absolute numbers only, never deltas (Psych F2). */
      h += '<div class="mc-kv"><span class="mc-k">AGITATOR\'S LEDGER (THIS DEVICE)</span>' +
        '<span class="mc-v">' + fmtNum(deviceXp()) + ' XP</span></div>';
      if (cs && bal !== null) {
        h += '<div class="mc-kv"><span class="mc-k">SERVER BALANCE (' + esc(cs) + ')</span>' +
          '<span class="mc-v">' + fmtNum(bal) + ' XP</span></div>';
      } else if (!cs) {
        h += '<div class="mc-kv"><span class="mc-k">SERVER BALANCE</span>' +
          '<span class="mc-v" style="font-size:12px;color:#b8a98a">CLAIM A CALLSIGN TO SYNC</span></div>';
      }
      /* Visibility — citations + followers where available. */
      var cites = null;
      try {
        if (stats && stats.synergy && typeof stats.synergy['ammo-finder'] === 'number')
          cites = stats.synergy['ammo-finder'];
      } catch (e) {}
      h += '<div class="mc-kv"><span class="mc-k">AMMO FINDER CITATIONS</span>' +
        '<span class="mc-v">' + (cites === null ? '—' : fmtNum(cites)) + '</span></div>';
      var fol = null;
      try {
        if (stats && Array.isArray(stats.followers)) {
          fol = stats.followers.reduce(function (a, r) { return a + (Number(r.followers) || 0); }, 0);
        }
      } catch (e) {}
      h += '<div class="mc-kv"><span class="mc-k">FOLLOWERS (ALL PLATFORMS)</span>' +
        '<span class="mc-v">' + (fol === null ? '—' : fmtNum(fol)) + '</span></div>';
      /* Views/remixes: no endpoint exists — honest, never invented. */
      h += '<p class="mc-note" style="margin-top:10px">Views and remix counts aren\'t tracked yet — ' +
        'the map shows citations and surfaces instead.</p>';
      if (document.getElementById('pf-dash')) {
        h += '<a class="mc-cta" href="#pf-dash">FULL LEDGER IN COMMAND CENTER →</a>';
      }
      panel.innerHTML = h;
    }
    if (cs) {
      api('action', 'xp_balance', { callsign: cs }, function (j) {
        if (j && typeof j.balance === 'number') bal = j.balance;
        fin();
      });
    } else { fin(); }
    /* Synergy citations + followers ride one panel; synergy may be connecting. */
    api('api', 'synergy_by_creator', { slug: slug }, function (j) {
      stats = stats || {};
      if (j && j.ok === true && Array.isArray(j.surfaces)) {
        stats.synergy = {};
        j.surfaces.forEach(function (s) { if (s && s.surface) stats.synergy[s.surface] = Number(s.count) || 0; });
      }
      api('action', 'creator_stats_get', { slugs: slug }, function (j2) {
        if (j2 && j2.ok === true && Array.isArray(j2.stats)) stats.followers = j2.stats;
        fin();
      });
    });
  }

  /* ---------------- panel 3: the wire ---------------- */
  function dismissed() {
    var d = G(DISMISS_KEY);
    return Array.isArray(d) ? d : [];
  }
  function isDismissed(p) {
    var id = (p.kind || '') + ':' + (p.series_id || '');
    return dismissed().indexOf(id) !== -1;
  }
  function dismissPrompt(p) {
    var d = dismissed();
    var id = (p.kind || '') + ':' + (p.series_id || '');
    if (d.indexOf(id) === -1) d.push(id);
    S(DISMISS_KEY, d);
  }

  function renderWire(el) {
    el.innerHTML = '<div class="mc-panel"><h3>THE WIRE</h3>' +
      '<p class="mc-note">Release-calendar prompts only — the topic-trend models aren\'t live yet, ' +
      'so this wire runs on the official release calendar, not on what\'s trending.</p>' +
      '<div class="mc-load">Checking the wire…</div></div>';
    var panel = el.firstChild;
    var note = '<p class="mc-note">Release-calendar prompts only — the topic-trend models aren\'t live yet, ' +
      'so this wire runs on the official release calendar, not on what\'s trending.</p>';
    api('action', 'fred_release_prompts', {}, function (j) {
      var prompts = (j && Array.isArray(j.prompts)) ? j.prompts.filter(function (p) { return !isDismissed(p); }) : [];
      if (!prompts.length) {
        /* Honest empty = absence. Never a "no releases today" banner, never fake urgency. */
        panel.innerHTML = '<h3>THE WIRE</h3>' + note;
        return;
      }
      var h = '<h3>THE WIRE</h3>' + note;
      prompts.forEach(function (p, i) {
        var figLine = (p.headline || '') + ' — ' + (p.figure || '') +
          (p.period_label ? ' (' + p.period_label + ')' : '') +
          (p.source_url ? ' ' + p.source_url : '');
        h += '<div class="mc-prompt" data-wi="' + i + '">' +
          '<h4>' + esc(p.headline || 'FRESH PRINT') + '</h4>' +
          (p.figure ? '<div class="mc-fig">' + esc(p.figure) + '</div>' : '') +
          '<p>' + esc(p.copy || '') + '</p>' +
          '<div class="mc-actions">' +
          '<button class="mc-copy" data-a="copy">COPY FIGURE</button>' +
          '<button class="mc-dis" data-a="dismiss">DISMISS</button>' +
          '</div></div>';
        /* Psych F1: no compliance tracking — prompts are inform-only. */
        p._figLine = figLine;
      });
      panel.innerHTML = h;
      var cards = panel.querySelectorAll('.mc-prompt');
      for (var i = 0; i < cards.length; i++) {
        (function (card, p) {
          card.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            if (b.getAttribute('data-a') === 'copy') copyText(p._figLine, 'Figure copied.');
            else if (b.getAttribute('data-a') === 'dismiss') {
              dismissPrompt(p);
              card.parentNode.removeChild(card);
              if (!panel.querySelector('.mc-prompt')) {
                panel.innerHTML = '<h3>THE WIRE</h3>' + note;
              }
            }
          });
        })(cards[i], prompts[i]);
      }
    });
  }

  /* ---------------- picker ---------------- */
  function renderPicker(el) {
    var ms = rosterMembers();
    var h = '<div class="mc-panel mc-picker"><h3>WHOSE MAP IS THIS?</h3>' +
      '<p class="mc-note">Pick your roster profile once — this device remembers. ' +
      'The map shows public surfacing counts only.</p>';
    if (!ms.length) {
      h += '<div class="mc-err">Roster list unavailable on this page. ' +
        'Add ?creator=&lt;your-slug&gt; to the URL instead.</div></div>';
      el.innerHTML = h;
      return;
    }
    h += '<input id="mc-q" type="text" placeholder="Type your name…" autocomplete="off">' +
      '<div class="mc-plist" id="mc-plist"></div></div>';
    el.innerHTML = h;
    var q = el.querySelector('#mc-q'), list = el.querySelector('#mc-plist');
    function draw(filter) {
      var f = String(filter || '').toLowerCase(), out = '', n = 0;
      for (var i = 0; i < ms.length && n < 60; i++) {
        var m = ms[i];
        if (!m || !validSlug(m.slug)) continue;
        var nm = m.name || m.slug;
        if (f && nm.toLowerCase().indexOf(f) === -1 && String(m.slug).indexOf(f) === -1) continue;
        out += '<button class="mc-pick" data-slug="' + esc(m.slug) + '">' + esc(nm) + '</button>';
        n++;
      }
      list.innerHTML = out || '<div class="mc-load">No matches.</div>';
    }
    draw('');
    q.addEventListener('input', function () { draw(q.value); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.mc-pick');
      if (!b) return;
      var slug = b.getAttribute('data-slug');
      if (!validSlug(slug)) return;
      S(SLUG_KEY, slug);
      boot();
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    host.innerHTML = shell('MISSION CONTROL', 'Your work, where it\'s landing, and what\'s on the wire.');
    var body = host.querySelector('#mc-body');
    var slug = resolveSlug();
    if (!slug) { renderPicker(body); return; }
    var who = document.createElement('p');
    who.className = 'mc-who';
    who.innerHTML = 'WATCHING: ' + esc(memberName(slug)) +
      '<button id="mc-switch">SWITCH</button>';
    body.appendChild(who);
    who.querySelector('#mc-switch').addEventListener('click', function () {
      try { localStorage.removeItem(SLUG_KEY); } catch (e) {}
      boot();
    });
    var p1 = document.createElement('div'), p2 = document.createElement('div'),
        p3 = document.createElement('div');
    body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);
    renderMap(p1, slug);
    renderEarnings(p2, slug);
    renderWire(p3);
  }

  boot();
})();
