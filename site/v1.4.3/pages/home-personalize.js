/* pages/home-personalize.js  |  PF v1.4.3 | Project 3: user-activity personalization
   for the My HQ homepage (v2, 7 blocks). Replaces the same-for-everyone hero
   and nudges with signals from the visitor's OWN activity:

     1. Hero CTA + rank greeting — callsign holders get "CONTINUE THE FIGHT"
        (scrolls to Daily Orders) instead of the claim prompt, plus a
        "WELCOME BACK, <callsign> — <rank> · <xp> XP" line.
     2. Streak nudge — when the callsign has NOT checked in today (server
        truth), a slim red banner lands above the daily-orders block
        ("DAY N STREAK — CHECK IN" / "STREAK AT RISK — NH LEFT").
     3. "BECAUSE YOU VOTED FOR <name>" — this week's fan-vote pick (device
        localStorage, same key fan-vote.js writes) gets a card after the
        fan-vote block linking to the creator's catalog page.

   Anonymous / no-callsign visitors: module exits immediately, homepage is
   byte-for-byte the default. All fetches are fail-soft (timeout + null on
   any error): on failure nothing is injected and the defaults stand.

   ETHICS (standing): personalization shows the user's OWN data back to THEM
   only. No cross-user data, no manipulation scoring, no third-party sharing.
   The fan-vote pick is device-local by backend design (device-hashed, never
   callsign-linked server-side) — the "because you voted" card reads the same
   localStorage the vote widget itself wrote. See /privacy.

   BACKEND READS (no new endpoints needed):
     ?action=xp_balance&callsign=X          (public GET, no auth) -> {balance}
     ?action=hud&callsign=X&auth_secret=...  (auth-gated JSONP, self-heals
        via PF.authGetJSONP claim-retry) -> {ok, xp_today,
        streak:{count, checked_in_today, at_risk, hours_left}, in_cell}
   Rank ladder: the existing PF.homepageInit() composite (ranks.ladder),
   already pre-warmed by home-v2 on page load.

   EVENT PATTERN (mirrors the SLR fetchLive catalog work): fetch once, fire
   document 'pf-personalize' with the activity payload; injections listen on
   the event and retry idempotently until their mount points exist
   (bounded: 20 tries x 1.5s via MutationObserver on #pf-v2).

   KILL: ?pf_off=home-personalize  or  localStorage pf_disabled_v1='["home-personalize"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomePersonalizeDone) return;
  if (PF && PF.skip('home-personalize')) { return; }
  if (isEditor()) return;
  var host = document.getElementById('pf-v2');
  if (!host) return; /* homepage shell only */

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }
  function err(msg, e) {
    try { if (PF) PF.error('home-personalize', msg + ' :: ' + (e && e.message || e)); } catch (e2) {}
  }

  /* === 1. Callsign (own state only) === */
  function callsign() {
    try {
      if (typeof window.PFCallsign === 'function') {
        var c = String(window.PFCallsign() || '').toLowerCase();
        if (/^[a-z0-9_]{3,20}$/.test(c)) return c;
      }
    } catch (e) {}
    try {
      var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      var c2 = String(id.callsign || '').toLowerCase();
      if (/^[a-z0-9_]{3,20}$/.test(c2)) return c2;
    } catch (e) {}
    return '';
  }

  var CS = callsign();
  if (!CS) return; /* anonymous: default homepage, untouched */
  window.pfHomePersonalizeDone = true;

  /* === 2. Fetch helpers (JSONP, timeout, fail-soft) === */
  function beUrl() {
    try { if (PF && PF.beUrl) return PF.beUrl(); } catch (e) {}
    return 'https://pf-api.mtcstw.workers.dev';
  }
  function jsonp(action, params, timeoutMs) {
    return new Promise(function (resolve) {
      try {
        var url = beUrl() + '?action=' + encodeURIComponent(action);
        if (params) Object.keys(params).forEach(function (k) {
          if (params[k] != null && params[k] !== '') url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        });
        var cb = 'pfHp' + Math.random().toString(36).slice(2);
        url += '&callback=' + cb;
        var done = false, s = null;
        function finish(d) {
          if (done) return; done = true;
          try { delete window[cb]; } catch (e) {}
          try { if (s && s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
          resolve(d || null);
        }
        window[cb] = function (d) { finish(d); };
        s = document.createElement('script');
        s.onerror = function () { finish(null); };
        s.src = url; s.async = true;
        document.head.appendChild(s);
        setTimeout(function () { finish(null); }, timeoutMs || 10000);
      } catch (e) { resolve(null); }
    });
  }

  /* hud via the proven auth-gated reader (claim-retry self-heal). Falls back
     to a plain JSONP attach of callsign+stored secret if unavailable. */
  function fetchHud() {
    return new Promise(function (resolve) {
      var settled = false;
      function done(d) { if (!settled) { settled = true; resolve(d || null); } }
      setTimeout(function () { done(null); }, 11000);
      try {
        if (PF && PF.authGetJSONP) {
          PF.authGetJSONP(beUrl(), 'hud', {}, function (j) { done(j); }, { timeout: 10000 });
        } else {
          var sec = '';
          try { sec = String(localStorage.getItem('pf_auth_secret') || ''); } catch (e) {}
          jsonp('hud', { callsign: CS, auth_secret: sec }, 10000).then(done);
        }
      } catch (e) { done(null); }
    });
  }

  /* Rank from the already-prewarmed homepageInit composite (ranks.ladder). */
  function rankFor(xp, ladder) {
    try {
      if (!ladder || !ladder.length) return '';
      var name = '';
      for (var i = 0; i < ladder.length; i++) {
        if (Number(ladder[i].xp) <= xp) name = String(ladder[i].name || '');
        else break;
      }
      return name;
    } catch (e) { return ''; }
  }

  /* This week's fan-vote pick, device-local — same key fan-vote.js writes
     (weekKey = YEAR-W<isoWeek>, storeKey = 'slr-vote-' + weekKey).
     Uses PF.chiNow() like fan-vote.js when available (Chicago week
     boundary), and fan-vote.js's exact isoWeek implementation. */
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / 6048e5);
  }
  function votedSlug() {
    try {
      var now = null;
      try { if (PF && typeof PF.chiNow === 'function') now = PF.chiNow(); } catch (e) {}
      if (!now || !(now instanceof Date) || isNaN(now.getTime())) now = new Date();
      var key = 'slr-vote-' + now.getFullYear() + '-W' + isoWeek(now);
      var raw = localStorage.getItem(key);
      if (!raw) return '';
      var v = JSON.parse(raw);
      return String((v && v.slug) || '');
    } catch (e) { return ''; }
  }

  function fmtXp(n) {
    try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return String(n || 0); }
  }

  /* === 3. Fetch activity, fire the event === */
  var activity = { callsign: CS, xp: 0, rank: '', xpToday: 0, streak: null, inCell: false, votedSlug: votedSlug() };

  function pull() {
    var xpP = jsonp('xp_balance', { callsign: CS }, 10000);
    var hudP = fetchHud();
    var rankP = new Promise(function (resolve) {
      try {
        if (PF && PF.homepageInit) {
          PF.homepageInit().then(function (d) {
            resolve((d && d.ranks && d.ranks.ladder) || null);
          }).catch(function () { resolve(null); });
        } else resolve(null);
      } catch (e) { resolve(null); }
    });
    Promise.all([xpP, hudP, rankP]).then(function (res) {
      var xpJ = res[0], hud = res[1], ladder = res[2];
      try {
        if (xpJ && typeof xpJ.balance === 'number') {
          activity.xp = Math.round(xpJ.balance);
          activity.rank = rankFor(activity.xp, ladder);
        }
        if (hud && hud.ok) {
          activity.xpToday = Number(hud.xp_today) || 0;
          activity.streak = hud.streak || null;
          activity.inCell = !!hud.in_cell;
        }
      } catch (e) { err('activity parse', e); }
      try {
        document.dispatchEvent(new CustomEvent('pf-personalize', { detail: activity }));
      } catch (e) { apply(activity); }
      apply(activity); /* immediate first pass in case event ordering lags */
    });
  }

  /* === 4. Injections (idempotent, section-aware) === */
  function el(tag, cls, css, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (css) d.style.cssText = css;
    if (html != null) d.innerHTML = html;
    return d;
  }
  var CSS_BASE = 'font-family:Arial,sans-serif;box-sizing:border-box;';

  /* 4a. Hero: CTA swap + rank greeting. */
  function injectHero(a) {
    var hero = document.getElementById('pf-hero');
    if (!hero || hero.getAttribute('data-hp-hero')) return;
    hero.setAttribute('data-hp-hero', '1');
    var cta = hero.querySelector('#pf-hero-cta');
    if (cta) {
      cta.textContent = 'CONTINUE THE FIGHT \u2192';
      cta.setAttribute('href', '#pf-orders');
      cta.addEventListener('click', function (ev) {
        ev.preventDefault();
        try {
          var tgt = document.querySelector('section[data-game="daily-orders"]');
          if (tgt && tgt.scrollIntoView) { tgt.scrollIntoView({ behavior: 'smooth' }); return; }
          if (PF && PF.gotoSilo) { PF.gotoSilo('daily-orders'); return; }
        } catch (e) {}
        window.location.hash = '#pf-orders';
      });
    }
    var line = el('div', 'pf-hp-greet', CSS_BASE +
      'margin-top:14px;font-size:13px;letter-spacing:2px;color:#c1121f;font-weight:800;');
    var txt = 'WELCOME BACK, ' + a.callsign.toUpperCase();
    if (a.rank) txt += ' \u2014 ' + a.rank.toUpperCase();
    txt += ' \u00B7 ' + fmtXp(a.xp) + ' XP';
    if (a.xpToday > 0) txt += ' (+' + fmtXp(a.xpToday) + ' TODAY)';
    line.textContent = txt;
    try {
      var sub = hero.querySelector('p');
      if (sub && sub.parentNode) sub.parentNode.insertBefore(line, sub.nextSibling);
      else hero.appendChild(line);
    } catch (e) {}
  }

  /* 4b. Streak nudge banner above the daily-orders block. */
  function injectStreak(a) {
    var st = a.streak;
    if (!st || st.checked_in_today) return; /* no nudge when already checked in */
    var h = document.getElementById('pf-v2');
    var sec = h && h.querySelector('section[data-game="daily-orders"]');
    if (!sec || sec.getAttribute('data-hp-streak')) return;
    sec.setAttribute('data-hp-streak', '1');
    var count = Number(st.count) || 0;
    var headline, sub;
    if (st.at_risk) {
      var hrs = Math.max(1, Math.ceil((Number(st.hours_left) || 0) / 3600000));
      headline = 'STREAK AT RISK \u2014 ' + hrs + 'H LEFT';
      sub = 'Day ' + count + ' on the line. Check in before midnight Chicago or it breaks.';
    } else if (count > 0) {
      headline = 'DAY ' + count + ' STREAK \u2014 KEEP IT ALIVE';
      sub = 'Today\u2019s orders are waiting. One check-in holds the line.';
    } else {
      headline = 'START YOUR STREAK TODAY';
      sub = 'Check in once and the count begins. Small actions, compounded, win wars.';
    }
    var card = el('div', 'pf-hp-streak', CSS_BASE +
      'max-width:min(680px,94vw);margin:0 auto 14px;padding:16px 18px;text-align:center;' +
      'background:#1c0707;border:2px solid #c1121f;color:#f5ead6;');
    card.innerHTML =
      '<div style="font-size:12px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:6px;">YOUR WAR</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:19px;letter-spacing:1px;margin:0 0 6px;">' +
      headline.replace(/</g, '&lt;') + '</div>' +
      '<div style="font-size:13px;color:#a89e88;margin-bottom:12px;">' + sub.replace(/</g, '&lt;') + '</div>' +
      '<button class="pf-hp-streak-go" style="min-height:44px;background:#c1121f;color:#fff;border:2px solid #fff;' +
      'font-weight:800;font-size:14px;letter-spacing:2px;padding:0 28px;cursor:pointer;">CHECK IN \u2192</button>';
    card.querySelector('.pf-hp-streak-go').addEventListener('click', function () {
      try {
        if (sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth' });
      } catch (e) {}
    });
    try { sec.parentNode.insertBefore(card, sec); } catch (e) {}
  }

  /* 4c. "Because you voted for <name>" card after the fan-vote block. */
  function injectVote(a) {
    if (!a.votedSlug) return;
    var member = null;
    try { if (PF && typeof PF.slrMember === 'function') member = PF.slrMember(a.votedSlug); } catch (e) {}
    if (!member || !member.name) return;
    var h = document.getElementById('pf-v2');
    var sec = h && h.querySelector('section[data-game="fan-vote"]');
    if (!sec || sec.getAttribute('data-hp-vote')) return;
    sec.setAttribute('data-hp-vote', '1');
    var href = String(member.catalog_path || '/sick-left-radicals');
    var name = String(member.name).replace(/</g, '&lt;');
    var score = member.propaganda_score != null ? ' \u00B7 PROPAGANDA SCORE ' + member.propaganda_score : '';
    var card = el('div', 'pf-hp-vote', CSS_BASE +
      'max-width:min(680px,94vw);margin:14px auto 0;padding:16px 18px;text-align:center;' +
      'background:#0d0d0d;border:2px solid #3a0d0d;color:#f5ead6;');
    card.innerHTML =
      '<div style="font-size:12px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:6px;">BECAUSE YOU BACKED THEM</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:20px;letter-spacing:1px;margin:0 0 4px;">' +
      name + '</div>' +
      (score ? '<div style="font-size:12px;color:#a89e88;margin-bottom:10px;">' + score.replace(/</g, '&lt;') + '</div>' : '') +
      '<a href="' + href.replace(/"/g, '&quot;') + '" style="display:inline-block;min-height:44px;line-height:44px;' +
      'background:#c1121f;color:#fff;font-weight:800;font-size:14px;padding:0 26px;text-decoration:none;letter-spacing:1px;">VISIT THEIR CATALOG \u2192</a>';
    try {
      if (sec.parentNode) sec.parentNode.insertBefore(card, sec.nextSibling);
    } catch (e) {}
  }

  function apply(a) {
    try { injectHero(a); } catch (e) { err('injectHero', e); }
    try { injectStreak(a); } catch (e) { err('injectStreak', e); }
    try { injectVote(a); } catch (e) { err('injectVote', e); }
  }

  /* Event-driven re-render: any later consumer can re-fire pf-personalize.
     Mounts are async (lazy bundles), so watch for the sections and retry. */
  document.addEventListener('pf-personalize', function (ev) {
    try { apply((ev && ev.detail) || activity); } catch (e) { err('event apply', e); }
  });

  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    try { apply(activity); } catch (e) {}
    var heroOk = !!document.querySelector('#pf-hero[data-hp-hero]');
    var streakDone = activity.streak && activity.streak.checked_in_today;
    var streakOk = streakDone || !!document.querySelector('section[data-game="daily-orders"][data-hp-streak]') ||
      !document.querySelector('section[data-game="daily-orders"]');
    var voteOk = !!document.querySelector('section[data-game="fan-vote"][data-hp-vote]') ||
      !activity.votedSlug ||
      !document.querySelector('section[data-game="fan-vote"]');
    if ((heroOk && streakOk && voteOk) || tries >= 20) clearInterval(iv);
  }, 1500);

  pull();
})();
