/* pages/slr-roster.js  |  PF v1.4.2 | Sick Left Radicals roster, rebuilt from scratch.
   Pulls the 62-member master database (core/07-slr-db.js), shuffles the grid on
   every load, searchable by name/handle/focus. Each card: photo, name,
   propaganda score, follow count, link to the member's catalog page.
   Mounts on #pf-slr-roster, or auto-takes-over /sick-left-radicals (hides the
   old Squarespace content ONLY after the DB loads — on DB failure the old
   page stays up).
   KILL: ?pf_off=slr-roster  or  localStorage pf_disabled_v1='["slr-roster"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('slr-roster')) { return; }
  if (!PF.slrReady) { PF.error('slr-roster', 'slr-db not loaded'); return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function initials(name) {
    var w = String(name || '?').split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase();
  }
  function handlesLine(m) {
    var h = m.handles || {};
    var bits = [];
    ['tiktok', 'instagram', 'youtube', 'x'].forEach(function (p) {
      if (h[p]) bits.push(h[p]);
    });
    if (!bits.length && h.primary) bits.push(h.primary);
    return bits.join(' · ');
  }

  function cardHTML(m) {
    var img = m.picture
      ? '<img src="' + esc(m.picture) + '" alt="' + esc(m.image_alt || m.name) + '" loading="lazy" style="width:100%;height:180px;object-fit:cover;display:block;background:#1a1a1a;">'
      : '<div style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;border-bottom:3px solid ' + RED + ';">'
        + '<span style="font-size:3rem;font-weight:900;color:' + RED + ';">' + esc(initials(m.name)) + '</span></div>';
    return '<div class="pf-slr-card" data-search="' + esc((m.name + ' ' + handlesLine(m) + ' ' + (m.content_focus || '')).toLowerCase()) + '"'
      + ' style="background:' + BLACK + ';border:3px solid ' + RED + ';color:' + CREAM + ';font-family:\'Helvetica Neue\',Arial,sans-serif;overflow:hidden;display:flex;flex-direction:column;">'
      + img
      + '<div style="padding:0.9rem 1rem 1.1rem;display:flex;flex-direction:column;gap:0.35rem;flex:1;">'
      + '<div style="font-size:1.05rem;font-weight:900;letter-spacing:0.02em;">' + esc(m.name) + '</div>'
      + '<div style="font-size:0.8rem;color:' + MUTED + ';">' + esc(handlesLine(m)) + '</div>'
      + '<div style="display:flex;gap:0.6rem;align-items:baseline;margin-top:0.2rem;">'
      + '<span style="font-size:1.3rem;font-weight:900;color:' + RED + ';">' + esc(m.followers_display) + '</span>'
      + '<span style="font-size:0.75rem;color:' + MUTED + ';letter-spacing:0.08em;">FOLLOWERS' + (m.is_new ? ' · <span style="color:' + RED + ';font-weight:700;">NEW</span>' : '') + '</span>'
      + '</div>'
      + '<div data-eff-score="' + esc(m.slug) + '" style="font-size:0.8rem;color:' + MUTED + ';">Propaganda score <strong style="color:' + CREAM + ';">' + m.propaganda_score.toFixed(1) + '/10</strong></div>'
      + '<a href="' + esc(m.catalog_path) + '" style="margin-top:auto;padding-top:0.6rem;display:block;text-align:center;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:0.14em;font-size:0.85rem;padding:0.65rem;text-decoration:none;">VIEW PROFILE →</a>'
      + '</div></div>';
  }

  function render(root, members) {
    var order = shuffle(members);
    root.innerHTML =
      '<div style="max-width:1200px;margin:0 auto;padding:2rem 1rem;box-sizing:border-box;">'
      + '<div style="text-align:center;margin-bottom:0.4rem;font-size:0.8rem;letter-spacing:0.3em;color:' + RED + ';font-weight:700;">THE PROPAGANDA FACTORY</div>'
      + '<h1 style="text-align:center;color:' + CREAM + ';font-size:2.2rem;font-weight:900;letter-spacing:0.06em;margin:0 0 0.4rem;font-family:\'Helvetica Neue\',Arial,sans-serif;">SICK LEFT RADICALS</h1>'
      + '<div class="pf-slr-count" style="text-align:center;color:' + MUTED + ';font-size:0.95rem;margin-bottom:1.4rem;">'
      + members.length + ' affiliated propagandists · <span style="color:' + CREAM + ';font-weight:700;">' + totalFollowers(members) + '</span>&nbsp;combined reach</div>'
      + '<div id="pf-race-zone"></div>'
      + '<div style="max-width:520px;margin:0 auto 1.8rem;">'
      + '<input id="pf-slr-search" type="search" placeholder="Search the roster…" autocomplete="off"'
      + ' style="width:100%;padding:0.8rem 1rem;background:#141414;border:2px solid ' + RED + ';color:' + CREAM + ';font-size:1rem;font-family:inherit;box-sizing:border-box;">'
      + '</div>'
      + '<div class="pf-slr-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.2rem;">'
      + order.map(cardHTML).join('')
      + '</div>'
      + '<div class="pf-slr-empty" style="display:none;text-align:center;color:' + MUTED + ';padding:3rem 1rem;font-size:1.05rem;">No comrades match that search. Try another name.</div>'
      + '<div style="text-align:center;margin-top:2.5rem;"><a href="/creator-onboard" style="color:' + RED + ';font-weight:900;letter-spacing:0.12em;text-decoration:none;border-bottom:2px solid ' + RED + ';">WANT IN? JOIN THE SICK LEFT RADICALS →</a></div>'
      + '</div>';
    var input = root.querySelector('#pf-slr-search');
    var cards = root.querySelectorAll('.pf-slr-card');
    var empty = root.querySelector('.pf-slr-empty');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var hit = !q || cards[i].getAttribute('data-search').indexOf(q) !== -1;
        cards[i].style.display = hit ? '' : 'none';
        if (hit) shown++;
      }
      empty.style.display = shown ? 'none' : '';
    });
  }

  function totalFollowers(members) {
    var t = 0;
    for (var i = 0; i < members.length; i++) t += members[i].followers_total || 0;
    if (t >= 1e6) return (t / 1e6).toFixed(1) + 'M';
    if (t >= 1e3) return Math.round(t / 1e3) + 'K';
    return String(t);
  }

  function mountTakeover() {
    /* /sick-left-radicals with no #pf-slr-roster block: hide Squarespace
       content, render the roster in its place. Only called after DB loads. */
    var page = document.querySelector('main#page') || document.getElementById('page');
    var root = document.createElement('div');
    root.id = 'pf-slr-roster-root';
    root.style.cssText = 'background:#0a0a0a;';
    if (page && page.parentNode) {
      page.parentNode.insertBefore(root, page);
      page.style.display = 'none';
    } else {
      document.body.insertBefore(root, document.body.firstChild);
    }
    return root;
  }

  function boot() {
    var el = document.getElementById('pf-slr-roster');
    var isRosterPath = /^\/sick-left-radicals\/?$/.test(location.pathname);
    if (!el && !isRosterPath) return; /* not our page */
    PF.slrReady.then(function (members) {
      if (!members || !members.length) {
        /* DB failed: never hide existing content. Show a slim error only
           when we own an explicit mount block. */
        if (el) {
          el.innerHTML = '<div style="max-width:640px;margin:2rem auto;text-align:center;color:' + CREAM + ';font-family:Arial,sans-serif;">'
            + '<div style="font-weight:900;color:' + RED + ';">ROSTER OFFLINE</div>'
            + '<div style="color:' + MUTED + ';font-size:0.9rem;margin-top:0.5rem;">The roster database could not be reached. Reload to retry.</div></div>';
        }
        return;
      }
      var root = el || mountTakeover();
      render(root, members);
      try { raceZoneInit(root); } catch (e) { PF.error('slr-roster', 'race zone: ' + (e && e.message)); }
      PF.log('slr-roster', 'rendered ' + members.length + ' members (shuffled)');
      /* Efficiency Index: paint live computed scores into [data-eff-score] slots. */
      try {
        if (window.PF && PF.efficiency) PF.efficiency.paintScores(root);
        else document.addEventListener('pf-efficiency', function h() {
          document.removeEventListener('pf-efficiency', h);
          if (window.PF && PF.efficiency) PF.efficiency.paintScores(root);
        });
      } catch (e2) {}
    });
  }

  /* WAVE3-S3-START
     S3 Creator Recruit Races (2026-10-04): race banner + live leaderboard on
     /sick-left-radicals. Reads ?action=recruit_race (public JSONP), 60s poll
     per contracts §8. Operation "ends in" strip reuses window.PFOperation
     when present; otherwise a defensive cached operation_status reader
     (60s TTL, fail -> {live:false}). States: live race | last champion |
     next-race-soon — never an empty broken box. Guardrail §10.3: everything
     try/caught, never breaks the roster render. */
  var RR = { timer: null, champ: null, opCache: { at: 0, val: { live: false } } };

  function rrApi(cb) {
    try {
      var base = window.PF_BACKEND_URL;
      if (!base) { cb(null); return; }
      var fn = 'pfRaceCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function fin(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        try { cb(j); } catch (e2) {}
      }
      window[fn] = function (j) { fin(j); };
      s.onerror = function () { fin(null); };
      s.src = base + '?action=recruit_race&race_id=current&callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { fin(null); }, 12000);
    } catch (e) { try { cb(null); } catch (e2) {} }
  }

  /* Defensive operation_status read: window.PFOperation first (shared footer
     cache owns it), else our own cached JSONP read. Fail -> {live:false}. */
  function rrOpStatus(cb) {
    try {
      var P = window.PFOperation;
      if (P) {
        var s = null;
        if (typeof P.status === 'function') s = P.status();
        else if (P.status && typeof P.status === 'object') s = P.status;
        if (s && typeof s === 'object' && typeof s.live === 'boolean') {
          cb({ live: !!s.live, name: String(s.name || ''),
            seconds_left: Math.max(0, Number(s.seconds_left) || 0) });
          return;
        }
      }
    } catch (e) {}
    var now = Date.now();
    if (now - RR.opCache.at < 60000) { cb(RR.opCache.val); return; }
    try {
      var base = window.PF_BACKEND_URL;
      if (!base) { cb(RR.opCache.val); return; }
      var fn = 'pfOpCb' + Math.floor(Math.random() * 1e9);
      var s2 = document.createElement('script'), done2 = false;
      function fin2(j) {
        if (done2) return; done2 = true;
        try { delete window[fn]; } catch (e) {}
        if (s2.parentNode) s2.parentNode.removeChild(s2);
        var v = { live: false };
        try {
          if (j && typeof j.live === 'boolean')
            v = { live: !!j.live, name: String(j.name || ''),
              seconds_left: Math.max(0, Number(j.seconds_left) || 0) };
        } catch (e) {}
        RR.opCache = { at: Date.now(), val: v };
        cb(v);
      }
      window[fn] = function (j) { fin2(j); };
      s2.onerror = function () { fin2(null); };
      s2.src = base + '?action=operation_status&callback=' + fn;
      document.head.appendChild(s2);
      setTimeout(function () { fin2(null); }, 12000);
    } catch (e) { cb(RR.opCache.val); }
  }

  function rrFmtLeft(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    var d = Math.floor(sec / 86400); sec %= 86400;
    var h = Math.floor(sec / 3600); sec %= 3600;
    var m = Math.floor(sec / 60);
    var out = '';
    if (d > 0) out += d + 'd ';
    if (h > 0 || d > 0) out += h + 'h ';
    out += m + 'm';
    return out.trim();
  }

  /* RECRUIT CHAMPION poster: composes the PFShare generators (share-image
     CTA standard: JOIN THE FIGHT. in red above MTCSTW.COM). stampCallsign
     attribution rides inside PFShare.shareImage/saveImage. */
  function rrChampionPoster(done) {
    try {
      var c = RR.champ || {};
      var cv = document.createElement('canvas');
      cv.width = 1080; cv.height = 1350;
      var x = cv.getContext('2d');
      if (!x) { done(null); return; }
      x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
      x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(24, 24, 1032, 1302);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#c1121f';
      x.font = '900 92px Arial,sans-serif';
      x.fillText('RECRUIT', 540, 300);
      x.fillText('CHAMPION', 540, 400);
      x.fillStyle = '#f5ead6';
      x.font = '900 120px Arial,sans-serif';
      var who = String(c.winner || '?').toUpperCase();
      x.fillText(who.length > 16 ? who.slice(0, 16) : who, 540, 640);
      x.fillStyle = '#b8ab8e'; x.font = '700 44px Arial,sans-serif';
      x.fillText(String(c.race_name || '').toUpperCase().slice(0, 40), 540, 780);
      x.fillStyle = '#f5ead6'; x.font = '900 72px Arial,sans-serif';
      x.fillText(String(c.recruits || 0) + ' RECRUITS', 540, 900);
      x.fillStyle = '#c1121f'; x.font = '900 64px Arial,sans-serif';
      x.fillText('JOIN THE FIGHT.', 540, 1080);
      x.fillStyle = '#f5ead6'; x.font = '900 56px Arial,sans-serif';
      x.fillText('MTCSTW.COM', 540, 1150);
      done(cv);
    } catch (e) { try { done(null); } catch (e2) {} }
  }
  try {
    if (window.PFShare && PFShare.setPoster) PFShare.setPoster('recruit-champion', rrChampionPoster);
    else document.addEventListener('pf-share-ready', function h() {
      document.removeEventListener('pf-share-ready', h);
      try { if (window.PFShare && PFShare.setPoster) PFShare.setPoster('recruit-champion', rrChampionPoster); } catch (e) {}
    });
  } catch (e) {}

  function rrZoneHTML(state) {
    /* state: {mode:'live'|'champion'|'soon', race, board, total, champ, op} */
    var wrap = 'max-width:1200px;margin:0 auto 1.6rem;padding:1.4rem 1.2rem;background:#141414;'
      + 'border:3px solid ' + RED + ';color:' + CREAM + ';font-family:\'Helvetica Neue\',Arial,sans-serif;text-align:center;';
    var h = '<div style="' + wrap + '">';
    if (state.mode === 'live') {
      var r = state.race;
      h += '<div style="font-size:0.75rem;letter-spacing:0.3em;color:' + RED + ';font-weight:700;">RECRUIT RACE &mdash; LIVE</div>'
        + '<div style="font-size:1.7rem;font-weight:900;letter-spacing:0.04em;margin:0.3rem 0;">' + esc(r.name) + '</div>'
        + '<div style="color:' + MUTED + ';font-size:0.95rem;">ENDS IN <b style="color:' + CREAM + ';">' + esc(rrFmtLeft(r.seconds_left)) + '</b>'
        + ' &middot; ' + Number(state.total || 0) + ' recruits counted</div>';
      if (state.op && state.op.live) {
        h += '<div style="margin-top:0.5rem;font-size:0.85rem;color:' + CREAM + ';border:1px solid ' + RED
          + ';display:inline-block;padding:0.35rem 0.9rem;">ALL FRONTS'
          + (state.op.name ? ': ' + esc(state.op.name) : '')
          + ' &mdash; OPERATION ENDS IN ' + esc(rrFmtLeft(state.op.seconds_left)) + '</div>';
      }
      if (state.board && state.board.length) {
        h += '<div style="max-width:560px;margin:1rem auto 0;text-align:left;">';
        for (var i = 0; i < Math.min(state.board.length, 10); i++) {
          var row = state.board[i];
          var medal = i === 0 ? '&#129351; ' : (i === 1 ? '&#129352; ' : (i === 2 ? '&#129353; ' : ''));
          h += '<div style="display:flex;justify-content:space-between;padding:0.45rem 0.7rem;'
            + (i % 2 ? 'background:#0a0a0a;' : '') + '">'
            + '<span>' + medal + '<b style="color:' + CREAM + ';">' + esc(String(row.callsign).toUpperCase()) + '</b></span>'
            + '<span style="color:' + RED + ';font-weight:900;">' + Number(row.recruits) + ' RECRUITS</span></div>';
        }
        h += '</div>';
      } else {
        h += '<div style="color:' + MUTED + ';font-size:0.9rem;margin-top:0.8rem;">No recruits counted yet &mdash; post your enlist link and take the lead.</div>';
      }
      h += '<div style="color:' + MUTED + ';font-size:0.8rem;margin-top:0.9rem;">Recruits count once they claim a callsign and complete one Daily Orders mission.</div>';
    } else if (state.mode === 'champion') {
      var ch = state.champ;
      h += '<div style="font-size:0.75rem;letter-spacing:0.3em;color:' + RED + ';font-weight:700;">RECRUIT CHAMPION</div>'
        + '<div style="font-size:1.7rem;font-weight:900;margin:0.3rem 0;">' + esc(String(ch.winner).toUpperCase()) + '</div>'
        + '<div style="color:' + MUTED + ';font-size:0.95rem;">' + Number(ch.recruits || 0) + ' recruits &middot; ' + esc(ch.race_name || '') + '</div>'
        + '<div style="margin-top:1rem;display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;">'
        + '<button id="pf-rr-share" style="background:' + RED + ';color:#fff;font-weight:900;letter-spacing:0.1em;padding:0.7rem 1.4rem;border:none;cursor:pointer;">SHARE CHAMPION POSTER</button>'
        + '<button id="pf-rr-save" style="background:transparent;color:' + CREAM + ';font-weight:900;letter-spacing:0.1em;padding:0.7rem 1.4rem;border:2px solid ' + RED + ';cursor:pointer;">SAVE POSTER</button>'
        + '</div>';
    } else {
      h += '<div style="font-size:0.75rem;letter-spacing:0.3em;color:' + RED + ';font-weight:700;">RECRUIT RACES</div>'
        + '<div style="font-size:1.3rem;font-weight:900;margin:0.3rem 0;">THE NEXT RACE IS BEING PLANNED</div>'
        + '<div style="color:' + MUTED + ';font-size:0.9rem;">Rally your cell &mdash; the leaderboard goes live here when the next race starts.</div>';
    }
    return h + '</div>';
  }

  function rrRefresh(zone) {
    try {
      rrApi(function (j) {
        try {
          if (!j || !j.ok) return; /* read failed: keep the previous state, never a broken box */
          if (j.race && j.race.live) {
            rrOpStatus(function (op) {
              try {
                zone.innerHTML = rrZoneHTML({ mode: 'live', race: j.race,
                  board: j.leaderboard || [], total: j.total_recruits || 0, op: op });
              } catch (e) {}
            });
          } else if (j.champion && j.champion.winner) {
            /* Champion poster needs the recruit count: pull the ended race's board. */
            RR.champ = { winner: j.champion.winner, race_name: j.champion.race_name, recruits: 0 };
            zone.innerHTML = rrZoneHTML({ mode: 'champion', champ: RR.champ });
            rrBindPosterButtons(zone);
            rrApiChampCount(j.champion.race_id);
          } else {
            zone.innerHTML = rrZoneHTML({ mode: 'soon' });
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  function rrApiChampCount(raceId) {
    /* Fetch the ended race's final tally to stamp the champion's recruit count. */
    try {
      var base = window.PF_BACKEND_URL;
      if (!base || !raceId) return;
      var fn = 'pfRaceCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), done = false;
      function fin(j) {
        if (done) return; done = true;
        try { delete window[fn]; } catch (e) {}
        if (s.parentNode) s.parentNode.removeChild(s);
        try {
          if (j && j.ok && j.leaderboard && j.leaderboard.length && RR.champ
              && j.leaderboard[0].callsign === RR.champ.winner)
            RR.champ.recruits = Number(j.leaderboard[0].recruits) || 0;
        } catch (e) {}
      }
      window[fn] = function (j) { fin(j); };
      s.onerror = function () { fin(null); };
      s.src = base + '?action=recruit_race&race_id=' + encodeURIComponent(raceId) + '&callback=' + fn;
      document.head.appendChild(s);
      setTimeout(function () { fin(null); }, 12000);
    } catch (e) {}
  }

  function rrBindPosterButtons(zone) {
    try {
      var sh = zone.querySelector('#pf-rr-share'), sv = zone.querySelector('#pf-rr-save');
      function paint(cb2) {
        try {
          rrChampionPoster(function (cv) {
            if (!cv) { if (window.PF && PF.toast) PF.toast('Poster failed \u2014 try again.'); return; }
            try { cb2(cv); } catch (e) {}
          });
        } catch (e) {}
      }
      if (sh) sh.onclick = function () {
        paint(function (cv) {
          try {
            if (window.PFShare && PFShare.shareImage)
              PFShare.shareImage(cv, 'pfn-recruit-champion.png', 'Recruit Champion', 'recruit-champion');
          } catch (e) {}
        });
      };
      if (sv) sv.onclick = function () {
        paint(function (cv) {
          try {
            if (window.PFShare && PFShare.saveImage)
              PFShare.saveImage(cv, 'pfn-recruit-champion.png', 'recruit-champion');
          } catch (e) {}
        });
      };
    } catch (e) {}
  }

  function raceZoneInit(root) {
    try {
      var zone = root.querySelector('#pf-race-zone');
      if (!zone || zone._rrInit) return;
      zone._rrInit = true;
      rrRefresh(zone);
      if (RR.timer) { try { clearInterval(RR.timer); } catch (e) {} }
      RR.timer = setInterval(function () {
        try {
          if (window.PF && PF.hidden && PF.hidden()) return;
          if (!document.body.contains(zone)) { clearInterval(RR.timer); RR.timer = null; return; }
          rrRefresh(zone);
        } catch (e) {}
      }, 60000);
    } catch (e) {}
  }
  /* WAVE3-S3-END */

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
