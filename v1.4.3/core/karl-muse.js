/* core/karl-muse.js  |  PF v1.4.3 | KARL MUSE ENGINE.
   CEO directive 2026-10-07 ~14:09 CDT ("Make Karl the muse of the site").
   Engels is the muse of CODE (inspires builders). Karl is the muse of the
   SITE (inspires users). This file is the muse's brain on the frontend.

   What it does:
     1. STORY — narrative memory in localStorage (visits, pages, topics,
        milestones). Karl knows where you've been.
     2. USER STATE — reads the signals already on the page: callsign, XP,
        rank, streak, medals, missions, votes, calendar, cell. Never fetches;
        only reads what the page already knows.
     3. NEXT MOVE — ordered rules pick the single most meaningful action
        right now. Not a list. The move.
     4. TASTE — topic counters bias suggestion chips toward what THIS user
        actually cares about.
     5. MUSE CONTEXT — {muse:true, user_state, story} for the Karl worker's
        muse mode (pf-karl), so deep answers speak as a muse too.

   Contract: read-only, zero XP, no PII beyond the public callsign,
   fail-soft (every signal optional; the companion's static behavior is the
   fallback). KILL: ?pf_off=karl-muse */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('karl-muse')) { return; }
  try {
    if (String(window.location.search || '').indexOf('pf_off=karl-muse') !== -1) { return; }
  } catch (e) {}
  if (window.PFKarlMuse) { return; }

  var STORY_KEY = 'pf_karl_story_v1';
  var NUDGE_KEY = 'pf_karl_nudge_v1';
  var MAX_TOPICS = 24;

  /* Rank ladder — mirrors backend RANKS (mtcstw-api/src/briefing.js).
     Stretched 2026-10-02: 0/250/750/2000/5000/12000/25000. */
  var RANKS = [
    [0, 'SYMPATHIZER'], [250, 'AGITATOR'], [750, 'ORGANIZER'],
    [2000, 'OPERATIVE'], [5000, 'COMMANDER'], [12000, 'WARLORD'], [25000, 'VANGUARD']
  ];
  function nextRank(xp) {
    for (var i = 0; i < RANKS.length; i++) {
      if (xp < RANKS[i][0]) { return { rank: RANKS[i][1], at: RANKS[i][0], gap: RANKS[i][0] - xp, span: RANKS[i][0] - RANKS[i - 1][0] }; }
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function callsign() {
    try {
      if (window.PFCallsign) { return String(window.PFCallsign() || ''); }
      return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || '');
    } catch (e) { return ''; }
  }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function chicagoDay() {
    // 0=Sunday..6=Saturday, America/Chicago
    try {
      var s = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
      var d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[s];
      return (d == null) ? 3 : d;
    } catch (e) { return new Date().getDay(); }
  }
  function hourGreeting() {
    var h = new Date().getHours();
    if (h < 5) { return 'Up late, soldier.'; }
    if (h < 12) { return 'Morning. The fight is already moving.'; }
    if (h < 18) { return 'Afternoon. Time to make it count.'; }
    return 'Evening. Debrief o\u2019clock soon.';
  }

  /* ============ STORY — narrative memory ============ */
  function readStory() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORY_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object' || s.v !== 1) {
      s = { v: 1, firstSeen: Date.now(), visits: 0, pages: {}, topics: {}, milestones: [] };
    }
    return s;
  }
  function writeStory(s) {
    try { localStorage.setItem(STORY_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function milestone(s, m) {
    for (var i = 0; i < s.milestones.length; i++) {
      if (s.milestones[i].m === m) { return; }
    }
    s.milestones.push({ t: Date.now(), m: m });
    if (s.milestones.length > MAX_TOPICS) { s.milestones.shift(); }
  }
  function recordVisit() {
    try {
      var s = readStory();
      var path = '/';
      try { path = window.location.pathname || '/'; } catch (e) {}
      s.visits++;
      s.pages[path] = (s.pages[path] || 0) + 1;
      var cs = callsign();
      if (cs && !s.callsign) { s.callsign = cs; milestone(s, 'Claimed callsign ' + cs); }
      if (s.visits === 10) { milestone(s, '10 visits — a regular'); }
      writeStory(s);
    } catch (e) {}
  }

  /* Topic taxonomy for the taste model. */
  var TOPICS = {
    xp: ['xp', 'rank', 'level', 'points', 'earn', 'agitator', 'vanguard'],
    missions: ['mission', 'orders', 'daily', 'check', 'debrief', 'report back'],
    theory: ['marx', 'surplus', 'capital', 'theory', 'lenin', 'engels', 'karl marx', 'manifesto'],
    vote: ['vote', 'fan', 'ballot', 'favorite'],
    cell: ['cell', 'squad', 'team', 'nuke', 'join'],
    money: ['money', 'bank', 'war chest', 'warchest', 'fund', 'spend', 'economy', 'fred'],
    create: ['poster', 'meme', 'create', 'share', 'forge', 'make'],
    calendar: ['calendar', 'event', 'when', 'debrief', 'briefing'],
    intel: ['receipt', 'dossier', 'politician', 'rep', 'donor', 'pac', 'town', 'zip']
  };
  var TOPIC_CHIPS = {
    xp: 'How do I earn XP?',
    missions: 'Where are my missions?',
    theory: 'What is surplus value?',
    vote: 'How does fan vote work?',
    cell: 'How do I join a cell?',
    money: 'What is the war chest?',
    create: 'How do I make a poster?',
    calendar: 'What is on the calendar?',
    intel: 'Who funds my rep?'
  };
  function topicOf(q) {
    var lq = String(q || '').toLowerCase();
    var words = lq.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    var best = null, bestScore = 0, t, i;
    for (t in TOPICS) {
      var sc = 0, keys = TOPICS[t];
      for (i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (words.indexOf(k) !== -1) { sc += 2; }
        else if (k.length > 4 && lq.indexOf(k) !== -1) { sc += 1; }
      }
      if (sc > bestScore) { bestScore = sc; best = t; }
    }
    return bestScore >= 2 ? best : null;
  }
  function observeQuestion(q) {
    try {
      var t = topicOf(q);
      if (!t) { return; }
      var s = readStory();
      s.topics[t] = (s.topics[t] || 0) + 1;
      if (s.milestones.length === 1 || !hasMilestone(s, 'first-question')) {
        milestone(s, 'First question to Karl');
      }
      writeStory(s);
    } catch (e) {}
  }
  function hasMilestone(s, m) {
    for (var i = 0; i < s.milestones.length; i++) {
      if (s.milestones[i].m === m) { return true; }
    }
    return false;
  }
  function topTopics(n) {
    var s = readStory(), arr = [], t;
    for (t in s.topics) { arr.push([t, s.topics[t]]); }
    arr.sort(function (a, b) { return b[1] - a[1]; });
    return arr.slice(0, n || 2).map(function (x) { return x[0]; });
  }

  /* ============ USER STATE — read, never fetch ============ */
  function readUserState() {
    var st = {};
    try {
      st.callsign = callsign();
      // XP fallback: enlistment ranks ledger (dashboard ctx wins when present)
      try {
        var rl = JSON.parse(localStorage.getItem('pf_ranks_v1') || 'null');
        if (rl && typeof rl.xp === 'number') { st.xp = rl.xp; }
      } catch (e) {}
      // Medals (same shape the dashboard reads)
      try {
        var wk = (window.PF && PF.isoWeekKey && PF.chiNow) ? PF.isoWeekKey(PF.chiNow()) : '';
        var ms = JSON.parse(localStorage.getItem('pf_medals_v2') || 'null');
        if (ms && ms.m && (!wk || !ms.w || ms.w === wk)) {
          var got = 0, k;
          for (k in ms.m) { if (ms.m[k]) { got++; } }
          st.medals_got = got;
        }
      } catch (e) {}
      // Cell (nuke strip cache)
      try {
        var nc = JSON.parse(localStorage.getItem('pf_nuke_cell_v1') || 'null');
        if (nc && nc.cell && nc.cell.name) { st.cell_name = String(nc.cell.name); }
      } catch (e) {}
      // Dashboard context stashed by the ASK KARL dashboard section
      var dc = window.__pfKarlDashCtx || null;
      if (dc && typeof dc === 'object') {
        if (dc.xp != null) { st.xp = dc.xp; }
        if (dc.rank) { st.rank = dc.rank; }
        if (dc.streak != null) { st.streak = dc.streak; }
        if (dc.medals_this_week) { st.medals_week = dc.medals_this_week; }
        if (dc.reported_today != null) { st.reported_today = dc.reported_today; }
        if (dc.votes_this_week != null) { st.votes_week = dc.votes_this_week; }
        if (dc.upcoming) { st.upcoming = String(dc.upcoming).slice(0, 300); }
      }
      if (st.xp != null) {
        var nr = nextRank(st.xp);
        if (nr) { st.next_rank = nr.rank; st.xp_to_next = nr.gap; st.rank_span = nr.span; }
      }
    } catch (e) {}
    return st;
  }

  /* ============ NEXT MOVE — the single most meaningful action ============ */
  /* Each move: {id, headline, body, chip, href, link}. First match wins. */
  /* _movesList() is exposed for tests (ordered candidates, no nudge dedup). */
  function _movesList() {
    var st = readUserState();
    var cs = st.callsign;
    var moves = [];

    if (!cs) {
      moves.push({
        id: 'onboard',
        headline: 'New here? This is your enlistment.',
        body: 'Claim your callsign — one tap and you\u2019re in the fight. Everything runs through it: XP, ranks, cells, missions.',
        chip: 'How do I claim my callsign?',
        href: '/', link: 'CLAIM CALLSIGN'
      });
    }
    if (cs && st.streak > 0 && st.reported_today === 0) {
      moves.push({
        id: 'streak',
        headline: 'Your ' + st.streak + '-day streak is on the line.',
        body: 'Streaks die in silence. Check in and report back before the day turns — ' +
          (st.next_rank ? 'and you\u2019re ' + st.xp_to_next + ' XP from ' + st.next_rank + '.' : 'the chain holds.'),
        chip: 'How do I check in?',
        href: '/', link: 'CHECK IN'
      });
    }
    if (cs && st.xp != null && st.next_rank && st.xp_to_next <= Math.max(60, st.rank_span * 0.2)) {
      moves.push({
        id: 'rank',
        headline: st.xp_to_next + ' XP from ' + st.next_rank + '.',
        body: 'You can taste it. One mission, one check-in, one recruit — that\u2019s the gap. Close it today.',
        chip: 'How do I earn XP fast?',
        href: '/', link: 'EARN XP'
      });
    }
    if (cs && st.reported_today === 0) {
      moves.push({
        id: 'missions',
        headline: 'Today\u2019s missions are waiting.',
        body: 'The network runs on reported work. Do today\u2019s orders, report back, log it on the record.',
        chip: 'Where are my missions?',
        href: '/', link: 'TODAY\u2019S ORDERS'
      });
    }
    if (cs && st.votes_week === 0 && chicagoDay() >= 2) {
      moves.push({
        id: 'vote',
        headline: 'You haven\u2019t voted this week.',
        body: 'Fan vote closes Sunday. Back your propagandist — the crown is decided by people who show up.',
        chip: 'How does fan vote work?',
        href: '/', link: 'VOTE'
      });
    }
    if (cs && st.medals_got != null && st.medals_got < 16) {
      moves.push({
        id: 'medals',
        headline: (16 - st.medals_got) + ' medals still on the table this week.',
        body: 'The full weekly set is FULL DEPLOYMENT — +50 XP and your callsign on the Vanguard Wall.',
        chip: 'How do medals work?',
        href: '/arcade', link: 'THE ARCADE'
      });
    }
    if (cs && !st.cell_name) {
      moves.push({
        id: 'cell',
        headline: 'You\u2019re fighting alone.',
        body: 'Cells that press together win together. Find your squad — or build one and lead it.',
        chip: 'How do I join a cell?',
        href: '/cells', link: 'FIND A CELL'
      });
    }
    if (st.upcoming && /today/i.test(st.upcoming)) {
      var ev = st.upcoming.split(';')[0].trim();
      moves.push({
        id: 'event',
        headline: 'Today: ' + ev + '.',
        body: 'The calendar doesn\u2019t wait. Be there — the network notices who shows up.',
        chip: 'What is on the calendar?',
        href: '/', link: 'CALENDAR'
      });
    }
    /* The default: time-aware inspiration. Never empty. */
    var h = new Date().getHours();
    var insp = h < 12
      ? { headline: 'The fight is already moving.', body: 'Check in, take today\u2019s orders, make the morning count. Small actions, compounded, win wars.' }
      : h < 18
      ? { headline: 'The afternoon is yours.', body: 'Missions, votes, recruits — pick one and move. The network is watching the board.' }
      : { headline: 'Evening. Debrief o\u2019clock soon.', body: 'Report back what you did today. The record remembers, and so does your streak.' };
    moves.push({
      id: 'inspire',
      headline: insp.headline,
      body: insp.body,
      chip: 'What should I do today?',
      href: '/', link: 'MY HQ'
    });
    return moves;
  }
  function nextMove() {
    var moves = _movesList();
    var shown = [];
    try { shown = (JSON.parse(localStorage.getItem(NUDGE_KEY) || 'null') || {}).ids || []; } catch (e) {}
    var dk = dayKey();
    try {
      var nk = JSON.parse(localStorage.getItem(NUDGE_KEY) || 'null');
      if (!nk || nk.day !== dk) { shown = []; }
    } catch (e) { shown = []; }
    for (var i = 0; i < moves.length; i++) {
      if (shown.indexOf(moves[i].id) === -1) { return moves[i]; }
    }
    return moves[moves.length - 1];
  }
  function recordNudge(id) {
    try {
      var dk = dayKey(), nk = null;
      try { nk = JSON.parse(localStorage.getItem(NUDGE_KEY) || 'null'); } catch (e) {}
      if (!nk || nk.day !== dk) { nk = { day: dk, ids: [] }; }
      if (nk.ids.indexOf(id) === -1) { nk.ids.push(id); }
      localStorage.setItem(NUDGE_KEY, JSON.stringify(nk));
    } catch (e) {}
  }

  /* ============ MUSE SURFACES ============ */
  function museGreeting() {
    var cs = callsign();
    var move = nextMove();
    recordNudge(move.id);
    var g = 'I\u2019m <b>Karl</b> — the voice of this site. ' + esc(hourGreeting());
    if (cs) { g += '<br>You\u2019re ' + esc(cs) + ', and I\u2019ve been watching your war.'; }
    g += '<br><br><b>' + esc(move.headline) + '</b><br>' + esc(move.body);
    g += '<br><a class="pf-kc-go" href="' + esc(move.href) + '">' + esc(move.link) + '</a>';
    g += '<div class="sig">— Karl</div>';
    return g;
  }
  function museChips(pageChips) {
    var chips = [], seen = {};
    function push(c) {
      if (c && !seen[c] && chips.length < 3) { seen[c] = 1; chips.push(c); }
    }
    /* The move leads. */
    try { push(nextMove().chip); } catch (e) {}
    /* Taste: the user's top topics get a voice. */
    try {
      var tops = topTopics(2), i;
      for (i = 0; i < tops.length; i++) {
        if (TOPIC_CHIPS[tops[i]]) { push(TOPIC_CHIPS[tops[i]]); }
      }
    } catch (e) {}
    /* Page context fills the rest. */
    try {
      var pc = pageChips || [], j;
      for (j = 0; j < pc.length; j++) { push(pc[j]); }
    } catch (e) {}
    return chips;
  }
  function summarizeStory() {
    try {
      var s = readStory();
      var parts = [];
      parts.push(s.visits + ' visit' + (s.visits === 1 ? '' : 's'));
      if (s.firstSeen) {
        var d = new Date(s.firstSeen);
        parts.push('since ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
      var tops = topTopics(2);
      if (tops.length) { parts.push('asks about ' + tops.join(' and ')); }
      if (s.milestones.length) {
        parts.push('milestones: ' + s.milestones.slice(-3).map(function (m) { return m.m; }).join('; '));
      }
      return parts.join(' · ');
    } catch (e) { return ''; }
  }
  function museContext() {
    var st = readUserState();
    return {
      muse: true,
      user_state: {
        callsign: st.callsign || '',
        xp: st.xp != null ? st.xp : null,
        rank: st.rank || '',
        streak: st.streak != null ? st.streak : null,
        next_rank: st.next_rank || '',
        xp_to_next: st.xp_to_next != null ? st.xp_to_next : null,
        medals_week: st.medals_week || (st.medals_got != null ? st.medals_got + '/16' : ''),
        reported_today: st.reported_today != null ? st.reported_today : null,
        votes_week: st.votes_week != null ? st.votes_week : null,
        cell_name: st.cell_name || '',
        upcoming: st.upcoming || ''
      },
      story: summarizeStory()
    };
  }

  /* Record the visit on load (chunk loads after idle — still once per page). */
  try { recordVisit(); } catch (e) {}

  /* Convergence (2026-10-07): the pf:action protocol — user actions in one
     place ripple into Karl's story memory. Any silo can announce:
       document.dispatchEvent(new CustomEvent('pf:action', { detail: { action: 'mission-reported' } }))
     Known actions: mission-reported, vote-cast, checkin-done, callsign-claimed,
     cell-joined, price-reported, bounty-done. Unknown actions are still
     recorded (future-proof) but never trusted for numbers — Karl's guardrails
     only use real user_state numbers from the dashboard stash. */
  try {
    document.addEventListener('pf:action', function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        var a = String(d.action || '').slice(0, 60);
        if (!a) { return; }
        var s = readStory();
        var label = { 'mission-reported': 'Reported a mission',
          'vote-cast': 'Cast a fan vote', 'checkin-done': 'Checked in',
          'callsign-claimed': 'Claimed a callsign', 'cell-joined': 'Joined a cell',
          'price-reported': 'Reported a price', 'bounty-done': 'Completed a bounty'
        }[a] || ('Did: ' + a);
        milestone(s, label);
        writeStory(s);
      } catch (e2) {}
    });
  } catch (e3) {}

  window.PFKarlMuse = {
    readUserState: readUserState,
    readStory: readStory,
    nextMove: nextMove,
    museGreeting: museGreeting,
    museChips: museChips,
    museContext: museContext,
    observeQuestion: observeQuestion,
    topicOf: topicOf,
    storySummary: summarizeStory,
    /* Test hooks. */
    _ranks: RANKS,
    _nextRank: nextRank,
    _movesList: _movesList,
    _recordNudge: recordNudge,
    _topicOf: topicOf
  };
})();
