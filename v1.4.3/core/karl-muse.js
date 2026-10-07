/* core/karl-muse.js  |  PF v1.4.3 | KARL MUSE ENGINE v2.
   CEO directive 2026-10-07 ~14:09 CDT ("Make Karl the muse of the site").
   Butter sweep #2 2026-10-07: the user-modeling suite gets deeper.
   Engels is the muse of CODE (inspires builders). Karl is the muse of the
   SITE (inspires users). This file is the muse's brain on the frontend.

   What it does:
     1. STORY — narrative memory in localStorage (visits, visit STREAKS,
        favorite pages, story arcs, milestones). Karl knows where you've been.
     2. TASTE v2 — recency-weighted topic events: what you asked about
        LATELY counts more than what you asked about months ago. Topic
        affinities ("theory people often ask about intel") surface the
        related next thing, not just the same thing again.
     3. USER STATE — reads the signals already on the page: callsign, XP,
        rank, streak, medals, missions, votes, calendar, cell. Never fetches;
        only reads what the page already knows. Derives engagement tiers
        (new / active / veteran) and rank momentum.
     4. NEXT MOVE — ordered rules pick the single most meaningful action
        right now. Not a list. The move. Headlines rotate daily so Karl
        never sounds like a broken record. Fresh milestones get celebrated.
     5. MUSE CONTEXT — {muse:true, user_state, story, taste_profile} for the
        Karl worker's muse mode (pf-karl), so deep answers speak as a muse too.

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
  var MAX_TOPIC_EVENTS = 60;

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
  function dayMsAgo(n) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    return d.getTime() - n * 86400000;
  }
  function chicagoDay() {
    // 0=Sunday..6=Saturday, America/Chicago
    try {
      var s = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
      var d = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[s];
      return (d == null) ? 3 : d;
    } catch (e) { return new Date().getDay(); }
  }
  function dayOfYear() {
    var n = new Date();
    return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
  }
  /* Pick a variant by day — Karl never repeats the same line two days
     running. Stable within the day (no flicker between renders). */
  function variant(list) {
    if (!list || !list.length) { return ''; }
    return list[dayOfYear() % list.length];
  }
  function hourGreeting() {
    var h = new Date().getHours();
    if (h < 5) { return 'Up late, soldier.'; }
    if (h < 12) { return 'Morning. The fight is already moving.'; }
    if (h < 18) { return 'Afternoon. Time to make it count.'; }
    return 'Evening. Debrief o\u2019clock soon.';
  }

  /* ============ STORY v2 — narrative memory ============ */
  function blankStory() {
    return { v: 2, firstSeen: Date.now(), lastSeen: Date.now(), prevSeen: 0, visits: 0,
      days: {}, pages: {}, topics: {}, topicEvents: [], affin: {},
      milestones: [], _lastTopic: null };
  }
  function migrateStory(s) {
    var n = blankStory();
    if (s && typeof s === 'object') {
      if (s.firstSeen) { n.firstSeen = s.firstSeen; }
      if (s.visits) { n.visits = s.visits; }
      if (s.pages) { n.pages = s.pages; }
      if (s.topics) { n.topics = s.topics; }
      if (s.milestones) { n.milestones = s.milestones; }
      if (s.callsign) { n.callsign = s.callsign; }
      /* v1 topic counters become one aging event each (weight 0.5) so
         old taste fades gracefully instead of vanishing. */
      var t;
      for (t in n.topics) {
        n.topicEvents.push({ t: t, at: Date.now() - 40 * 86400000 });
      }
    }
    return n;
  }
  function readStory() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORY_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') { return blankStory(); }
    if (s.v === 2) { return s; }
    return migrateStory(s);
  }
  function writeStory(s) {
    try { localStorage.setItem(STORY_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function hasMilestone(s, m) {
    for (var i = 0; i < s.milestones.length; i++) {
      if (s.milestones[i].m === m) { return true; }
    }
    return false;
  }
  function milestone(s, m) {
    if (hasMilestone(s, m)) { return false; }
    s.milestones.push({ t: Date.now(), m: m });
    if (s.milestones.length > MAX_TOPICS) { s.milestones.shift(); }
    return true;
  }
  /* Consecutive days with at least one visit, ending today or yesterday. */
  function visitStreak(s) {
    var n = 0;
    for (var back = 0; back < 400; back++) {
      var d = new Date(dayMsAgo(back));
      var k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (s.days && s.days[k]) { n++; } else if (back === 0) { continue; } else { break; }
    }
    return n;
  }
  function favoritePage(s) {
    var best = null, bestN = 0, p;
    for (p in s.pages) {
      if (s.pages[p] > bestN) { bestN = s.pages[p]; best = p; }
    }
    return best;
  }
  function recordVisit() {
    try {
      var s = readStory();
      var now = Date.now();
      var path = '/';
      try { path = window.location.pathname || '/'; } catch (e) {}
      s.visits++;
      s.prevSeen = s.lastSeen || 0;
      s.lastSeen = now;
      var dk = dayKey();
      s.days[dk] = (s.days[dk] || 0) + 1;
      s.pages[path] = (s.pages[path] || 0) + 1;
      var cs = callsign();
      if (cs && !s.callsign) { s.callsign = cs; milestone(s, 'Claimed callsign ' + cs); }
      var vs = visitStreak(s);
      if (vs === 3) { milestone(s, '3-day visiting streak'); }
      if (vs === 7) { milestone(s, 'A week of showing up'); }
      if (vs === 30) { milestone(s, '30 days of showing up'); }
      if (s.visits === 10) { milestone(s, '10 visits — a regular'); }
      var daysSince = Math.floor((now - s.firstSeen) / 86400000);
      if (daysSince >= 7 && !hasMilestone(s, 'A week with the movement')) { milestone(s, 'A week with the movement'); }
      if (daysSince >= 30 && !hasMilestone(s, 'A month with the movement')) { milestone(s, 'A month with the movement'); }
      /* Trim the days map so localStorage stays small (keep ~120 days). */
      var keys = Object.keys(s.days || {}).sort();
      while (keys.length > 120) { delete s.days[keys.shift()]; }
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
  /* Where taste points when it becomes the move — the deep link for each
     appetite. Never a generic page; always the thing they actually want. */
  var TOPIC_LINKS = {
    theory: { href: '/academy', link: 'THE ACADEMY' },
    intel: { href: '/receipt', link: 'THE RECEIPT' },
    create: { href: '/create', link: 'CREATE' },
    money: { href: '/economy', link: 'THE ECONOMY' },
    calendar: { href: '/events', link: 'EVENTS' },
    cell: { href: '/cells', link: 'FIND A CELL' },
    vote: { href: '/#pf-vote', link: 'VOTE' },
    xp: { href: '/arcade', link: 'THE ARCADE' },
    missions: { href: '/', link: "TODAY\u2019S ORDERS" }
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
      var now = Date.now();
      s.topics[t] = (s.topics[t] || 0) + 1;
      s.topicEvents.push({ t: t, at: now });
      if (s.topicEvents.length > MAX_TOPIC_EVENTS) {
        s.topicEvents.splice(0, s.topicEvents.length - MAX_TOPIC_EVENTS);
      }
      /* Affinity: what do they ask about AFTER asking about t? */
      if (s._lastTopic && s._lastTopic !== t) {
        var ak = s._lastTopic + '|' + t;
        s.affin[ak] = (s.affin[ak] || 0) + 1;
      }
      s._lastTopic = t;
      milestone(s, 'First question to Karl');
      var qc = 0, i;
      for (i = 0; i < s.topicEvents.length; i++) { if (s.topicEvents[i]) { qc++; } }
      if (qc === 10) { milestone(s, '10 questions asked'); }
      if (qc === 50) { milestone(s, '50 questions asked — a thinker'); }
      writeStory(s);
    } catch (e) {}
  }
  /* Recency-weighted taste: last 7 days count double, last 30 count
     single, older counts half. What you're into NOW beats what you were
     into in June. */
  function topicScore(s, t) {
    var now = Date.now(), sc = 0, i, e;
    for (i = 0; i < (s.topicEvents || []).length; i++) {
      e = s.topicEvents[i];
      if (!e || e.t !== t) { continue; }
      var age = now - e.at;
      sc += (age < 7 * 86400000) ? 2 : (age < 30 * 86400000) ? 1 : 0.5;
    }
    return sc;
  }
  function topTopics(n) {
    var s = readStory(), arr = [], t;
    var seen = {};
    for (var i = 0; i < (s.topicEvents || []).length; i++) {
      t = s.topicEvents[i].t;
      if (!seen[t]) { seen[t] = 1; arr.push([t, topicScore(s, t)]); }
    }
    /* Fall back to raw counters when there are no events (v1 migration). */
    for (t in s.topics) {
      if (!seen[t]) { arr.push([t, (s.topics[t] || 0) * 0.5]); }
    }
    arr.sort(function (a, b) { return b[1] - a[1]; });
    return arr.slice(0, n || 2).map(function (x) { return x[0]; });
  }
  /* The related-next-thing: given the top topic, what do people like you
     ask about next? (affinity pairs from observed behavior.) */
  function relatedTopic(s, t) {
    var best = null, bestN = 0, k;
    for (k in s.affin) {
      var parts = String(k).split('|');
      if (parts[0] === t && s.affin[k] > bestN) { bestN = s.affin[k]; best = parts[1]; }
    }
    return best;
  }
  function freshMilestones() {
    /* Milestones earned in the last 24h — Karl celebrates them. */
    try {
      var s = readStory(), out = [], now = Date.now(), i;
      for (i = 0; i < s.milestones.length; i++) {
        if (now - s.milestones[i].t < 24 * 3600000) { out.push(s.milestones[i].m); }
      }
      return out;
    } catch (e) { return []; }
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
          st.medals_fd = !!ms.fd;
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
        if (nr) {
          st.next_rank = nr.rank; st.xp_to_next = nr.gap; st.rank_span = nr.span;
          st.rank_pct = Math.round(100 * (1 - nr.gap / nr.span));
        }
      }
      /* Engagement tier: how deep is this person in the war? */
      try {
        var s = readStory();
        var vs = visitStreak(s);
        st.visit_streak = vs;
        st.visits = s.visits || 0;
        if ((s.visits || 0) >= 25 || (st.xp != null && st.xp >= 2000)) { st.engagement = 'veteran'; }
        else if ((s.visits || 0) >= 3 || (st.xp != null && st.xp >= 100)) { st.engagement = 'active'; }
        else { st.engagement = 'new'; }
        if (st.medals_got != null && st.medals_got >= 13 && st.medals_got < 16 && !st.medals_fd) {
          st.close_to_fd = true;
        }
      } catch (e2) {}
    } catch (e) {}
    return st;
  }

  /* ============ NEXT MOVE — the single most meaningful action ============ */
  /* Each move: {id, headline, body, chip, href, link}. First match wins.
     Headlines rotate daily (variant()) so Karl never sounds canned. */
  /* _movesList() is exposed for tests (ordered candidates, no nudge dedup). */
  function _movesList() {
    var st = readUserState();
    var cs = st.callsign;
    var moves = [];
    var now = Date.now();

    if (!cs) {
      moves.push({
        id: 'onboard',
        headline: variant([
          'New here? This is your enlistment.',
          'Fresh boots. Let\u2019s get you enlisted.',
          'The door\u2019s open, soldier. One step.'
        ]),
        body: 'Claim your callsign — one tap and you\u2019re in the fight. Everything runs through it: XP, ranks, cells, missions.',
        chip: 'How do I claim my callsign?',
        href: '/', link: 'CLAIM CALLSIGN'
      });
    }
    /* Welcome back: away more than a week. Re-engage before anything else.
       (prevSeen: recordVisit() runs on load and refreshes lastSeen, so the
       pre-load value is what proves absence.) */
    try {
      var s0 = readStory();
      if (cs && s0.visits > 1 && s0.prevSeen && now - s0.prevSeen > 7 * 86400000) {
        var awayDays = Math.floor((now - s0.prevSeen) / 86400000);
        moves.push({
          id: 'welcome-back',
          headline: 'You\u2019ve been away ' + awayDays + ' days. The war kept moving.',
          body: 'Check in, report today\u2019s missions, and you\u2019re back in the chain. We notice who returns.',
          chip: 'What did I miss?',
          href: '/', link: 'CHECK IN'
        });
      }
    } catch (e) {}
    if (cs && st.streak > 0 && st.reported_today === 0) {
      moves.push({
        id: 'streak',
        headline: variant([
          'Your ' + st.streak + '-day streak is on the line.',
          st.streak + ' days straight. Don\u2019t let it die today.',
          'The streak wants to live. Feed it.'
        ]),
        body: 'Streaks die in silence. Check in and report back before the day turns — ' +
          (st.next_rank ? 'and you\u2019re ' + st.xp_to_next + ' XP from ' + st.next_rank + '.' : 'the chain holds.'),
        chip: 'How do I check in?',
        href: '/', link: 'CHECK IN'
      });
    }
    /* FULL DEPLOYMENT push: 13+/16 medals is close enough to taste. */
    if (cs && st.close_to_fd) {
      var need = 16 - st.medals_got;
      moves.push({
        id: 'fd-push',
        headline: need + ' medal' + (need === 1 ? '' : 's') + ' from FULL DEPLOYMENT.',
        body: 'The full weekly rack is +50 XP and your callsign on the Vanguard Wall. The arcade is where medals are minted.',
        chip: 'How do medals work?',
        href: '/arcade', link: 'THE ARCADE'
      });
    }
    if (cs && st.xp != null && st.next_rank && st.xp_to_next <= Math.max(60, st.rank_span * 0.2)) {
      moves.push({
        id: 'rank',
        headline: variant([
          st.xp_to_next + ' XP from ' + st.next_rank + '.',
          st.next_rank + ' is ' + st.xp_to_next + ' XP away. That\u2019s today\u2019s work.',
          'You\u2019re ' + (st.rank_pct != null ? st.rank_pct : '') + '% of the way to ' + st.next_rank + '.'
        ]),
        body: 'You can taste it. One mission, one check-in, one recruit — that\u2019s the gap. Close it today.',
        chip: 'How do I earn XP fast?',
        href: '/', link: 'EARN XP'
      });
    }
    if (cs && st.reported_today === 0) {
      moves.push({
        id: 'missions',
        headline: variant([
          'Today\u2019s missions are waiting.',
          'Orders are on the board. Nobody\u2019s taken them yet.',
          'The day has missions. Take them.'
        ]),
        body: 'The network runs on reported work. Do today\u2019s orders, report back, log it on the record.',
        chip: 'Where are my missions?',
        href: '/', link: 'TODAY\u2019S ORDERS'
      });
    }
    if (cs && st.votes_week === 0 && chicagoDay() >= 2) {
      var voteHead = variant([
        'You haven\u2019t voted this week.',
        'The ballot box is open and your name\u2019s not in it.'
      ]);
      if (chicagoDay() === 0) {
        voteHead = 'Fan vote closes TONIGHT.';
      } else if (chicagoDay() === 6) {
        voteHead = 'Fan vote closes tomorrow.';
      }
      moves.push({
        id: 'vote',
        headline: voteHead,
        body: 'Fan vote closes Sunday. Back your propagandist — the crown is decided by people who show up.',
        chip: 'How does fan vote work?',
        href: '/', link: 'VOTE'
      });
    }
    if (cs && st.medals_got != null && st.medals_got < 13) {
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
        headline: variant([
          'You\u2019re fighting alone.',
          'No cell. No squad. That\u2019s a choice you can unmake.'
        ]),
        body: 'Cells that press together win together. Find your squad — or build one and lead it.',
        chip: 'How do I join a cell?',
        href: '/cells', link: 'FIND A CELL'
      });
    }
    /* Taste-driven: what you actually care about gets a deep link. The move
       isn't generic — it's YOUR appetite, served. */
    try {
      var tops = topTopics(1);
      if (cs && tops.length && TOPIC_LINKS[tops[0]] && moves.length < 4) {
        var tl = TOPIC_LINKS[tops[0]];
        var rel = relatedTopic(readStory(), tops[0]);
        moves.push({
          id: 'taste',
          headline: 'You keep asking about ' + tops[0] + '. Go deeper.',
          body: (rel ? 'And when you\u2019re done — people into ' + tops[0] + ' usually get into ' + rel + ' next. ' : '') +
            'Your curiosity is the compass. Follow it.',
          chip: TOPIC_CHIPS[tops[0]] || 'Tell me more',
          href: tl.href, link: tl.link
        });
      }
    } catch (e) {}
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
    /* Welcome-back: returning soldiers get noticed. (Engagement sweep 2026-10-07) */
    try {
      var st0 = readStory();
      if (cs && st0.visits > 1) {
        var backs = ['Back again. Good — the fight needs regulars.',
          'You came back. That already puts you ahead of most.',
          'Another day, another front. Glad you\u2019re here.'];
        g += '<br>' + esc(backs[st0.visits % backs.length]);
      }
    } catch (e) {}
    if (cs) { g += '<br>You\u2019re ' + esc(cs) + ', and I\u2019ve been watching your war.'; }
    /* Fresh milestones get celebrated — Karl notices growth. */
    try {
      var fresh = freshMilestones().filter(function (m) {
        return m.indexOf('Claimed callsign') !== 0;
      });
      if (fresh.length) {
        g += '<br><b>' + esc(fresh[fresh.length - 1]) + '.</b> Noted on the record.';
      }
    } catch (e) {}
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
    /* Taste: the user's top topics get a voice — plus the related thing. */
    try {
      var s = readStory();
      var tops = topTopics(2), i;
      for (i = 0; i < tops.length; i++) {
        if (TOPIC_CHIPS[tops[i]]) { push(TOPIC_CHIPS[tops[i]]); }
      }
      if (tops.length && tops[0]) {
        var rel = relatedTopic(s, tops[0]);
        if (rel && TOPIC_CHIPS[rel]) { push(TOPIC_CHIPS[rel]); }
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
      var vs = visitStreak(s);
      if (vs >= 2) { parts.push(vs + '-day visiting streak'); }
      var fp = favoritePage(s);
      if (fp && fp !== '/') { parts.push('favorite page ' + fp); }
      var tops = topTopics(2);
      if (tops.length) { parts.push('asks about ' + tops.join(' and ')); }
      if (s.milestones.length) {
        parts.push('milestones: ' + s.milestones.slice(-3).map(function (m) { return m.m; }).join('; '));
      }
      return parts.join(' · ');
    } catch (e) { return ''; }
  }
  function tasteProfile() {
    try {
      var s = readStory();
      var prof = [], seen = {}, i;
      for (i = 0; i < (s.topicEvents || []).length; i++) {
        var t = s.topicEvents[i].t;
        if (!seen[t]) { seen[t] = 1; prof.push({ topic: t, score: Math.round(topicScore(s, t) * 10) / 10 }); }
      }
      prof.sort(function (a, b) { return b.score - a.score; });
      return prof.slice(0, 3);
    } catch (e) { return []; }
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
        rank_pct: st.rank_pct != null ? st.rank_pct : null,
        medals_week: st.medals_week || (st.medals_got != null ? st.medals_got + '/16' : ''),
        reported_today: st.reported_today != null ? st.reported_today : null,
        votes_week: st.votes_week != null ? st.votes_week : null,
        cell_name: st.cell_name || '',
        upcoming: st.upcoming || '',
        engagement: st.engagement || 'new',
        visit_streak: st.visit_streak != null ? st.visit_streak : 0
      },
      taste_profile: tasteProfile(),
      story: summarizeStory()
    };
  }

  /* Record the visit on load (chunk loads after idle — still once per page). */
  try { recordVisit(); } catch (e) {}

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
    tasteProfile: tasteProfile,
    /* Test hooks. */
    _ranks: RANKS,
    _nextRank: nextRank,
    _movesList: _movesList,
    _recordNudge: recordNudge,
    _topicOf: topicOf,
    _variant: variant,
    _topicScore: function (t) { try { return topicScore(readStory(), t); } catch (e) { return 0; } },
    _visitStreak: function () { try { return visitStreak(readStory()); } catch (e) { return 0; } },
    _relatedTopic: function (t) { try { return relatedTopic(readStory(), t); } catch (e) { return null; } },
    _freshMilestones: freshMilestones
  };
})();

