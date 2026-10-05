/* ============================================================================
   SILO: command/10-quests.js  |  PF v1.4.3 — Command Deck world map:
   quest/region content model + engine + world-events river + home routing.
   WHAT:
     - registerRegion(def): additive plug-in API on window.PFCommand. Wraps
       the existing registerTile contract, so quest packs compose with the
       dashboard branches (2-5) without touching their files.
     - Quest engine: reads quest definitions backend-first (?action=quests),
       bundled QUEST_SEED as fail-soft fallback. Data-driven: new quests
       never need code (schema v1, see ~/workspace/hidden/quest-model.md).
     - 5 region tiles (FIGHT / CREATE / SQUAD / WAR / INTEL), each with a
       live-status line from a REAL backend endpoint + its open quests.
     - World-events river: one registerRiver renderer fed by ?action=feed_list.
     - PFQuestRouting: homepage hero -> "ENTER COMMAND" takeover for
       logged-in users (callsign present). No redirect; public homepage
       stays the front door for new visitors and SEO.
   MODES (self-gating, one file):
     - Deck mode: #pf-command present (/command) -> regions + river.
     - Routing mode: homepage path, no #pf-command -> routing only.
     - Off: PF.skip('quests') / ?pf_off=quests / editor -> zero work.
   ECONOMY: this module mints ZERO XP. It contains no xpGrant call sites.
     Quest payoffs ride the target games' own existing award paths; the
     engine is orchestration, not a faucet. (XP table: quest-model.md §7,
     pending Economy Desk sign-off.)
   KILL: ?pf_off=quests  or  localStorage pf_disabled_v1='["quests"]'
         (inherits ?pf_off=command via the shell on /command).
   ============================================================================ */
(function () {
  'use strict';

  var NS = window.PFCommand || (window.PFCommand = {});

  /* ---------- kill switch + editor guard (die quietly) ---------- */
  function pfOff() {
    try {
      if (window.PF && typeof window.PF.skip === 'function' && window.PF.skip('quests')) return true;
    } catch (e) {}
    try {
      var m = (window.location.search || '').match(/[?&]pf_off=([^&]+)/);
      if (m) {
        var list = decodeURIComponent(m[1]).split(',');
        for (var i = 0; i < list.length; i++) if (list[i] === 'quests') return true;
      }
      var d = [];
      try { d = JSON.parse((window.localStorage && window.localStorage.getItem('pf_disabled_v1')) || '[]'); } catch (e2) {}
      return d.indexOf('quests') !== -1;
    } catch (e3) { return false; }
  }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && ((b.className || '').indexOf('sqs-edit') !== -1)) return true;
      return false;
    } catch (e) { return false; }
  }
  if (pfOff() || isEditor()) return;

  var esc = NS.esc || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var mkEl = NS.el || function (tag, cls, html) {
    var d = document.createElement(tag || 'div');
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  };
  function callsign() {
    try { return (NS.callsign ? NS.callsign() : ''); } catch (e) { return ''; }
  }

  /* ======================================================================
     QUEST SEED (schema v1) — bundled fallback. Backend ?action=quests wins
     when it answers {ok:true, quests:[...]}. Payoff legs named here are
     EXISTING legs awarded by the target games' own code paths — this file
     never awards XP itself.
     ====================================================================== */
  var QUEST_SEED = [
    {
      id: 'q-fight-choose', region: 'fight',
      title: 'Choose Your Fight',
      hook: 'Name your battles. The machine sharpens around them.',
      unlock: { callsign: false, cell: false, pickFight: null },
      steps: [
        { type: 'pledge', label: 'Pick 1–3 issue areas you fight for',
          target: { kind: 'flow', ref: 'pick-your-fight', fallback: '/political-hq' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'fight', xp: 10, cadence: 'once', note: 'in-flight branch fe/pick-your-fight, signed 2026-10-05' },
      proof: { template: 'I chose my fights as {{callsign}}. Name yours — JOIN THE FIGHT.' }
    },
    {
      id: 'q-fight-first-call', region: 'fight',
      title: 'First Contact',
      hook: 'Your rep works for you. Make them prove it.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'call', label: 'Call your rep about the bill on the floor',
          target: { kind: 'page', ref: '/political-hq' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'rep_contact', xp: 25, cadence: '2/day' },
      proof: { template: 'I called my rep as {{callsign}}. Your turn — JOIN THE FIGHT.' }
    },
    {
      id: 'q-create-first-forge', region: 'create',
      title: 'Forge Your First Weapon',
      hook: 'Memes are munitions. Forge one.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'forge', label: 'Forge a poster in the Studio',
          target: { kind: 'page', ref: '/create' } },
        { type: 'share', label: 'Share it with a proof link',
          target: { kind: 'page', ref: '/create' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'create_share', xp: 5, cadence: '2/day' },
      proof: { template: 'Fresh off the forge as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-create-bank-deposit', region: 'create',
      title: 'Feed the Armory',
      hook: 'Your best work belongs in the shared arsenal.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'forge', label: 'Create something worth keeping',
          target: { kind: 'page', ref: '/create' } },
        { type: 'pledge', label: 'Submit it to the Content Bank',
          target: { kind: 'page', ref: '/create' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'create_bank', xp: 10, cadence: 'on review acceptance' },
      proof: { template: 'My work entered the Content Bank as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-squad-enlist', region: 'squad',
      title: 'Find Your Squad',
      hook: 'Lone wolves starve. Cells eat.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'pledge', label: 'Join a cell or found your own',
          target: { kind: 'page', ref: '/cells' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: null, xp: 0, cadence: '—', note: 'recognition-only: no XP leg for joining' },
      proof: { template: 'I linked up with a cell as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-squad-recruit', region: 'squad',
      title: 'Bring a Comrade',
      hook: 'Every operative was recruited by someone. Be that someone.',
      unlock: { callsign: true, cell: true, pickFight: null },
      steps: [
        { type: 'recruit', label: 'Recruit a comrade with your link',
          target: { kind: 'flow', ref: 'referral', fallback: '/cells' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'recruit', xp: 25, cadence: 'per recruit' },
      proof: { template: 'I recruited a comrade as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-war-daily-muster', region: 'war',
      title: 'Daily Muster',
      hook: 'Report for duty. Streaks win wars.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'checkin', label: 'Check in with Daily Orders',
          target: { kind: 'page', ref: '/' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'checkin', xp: 2, cadence: 'daily' },
      proof: { template: 'Mustered for duty as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-war-fan-vote', region: 'war',
      title: 'Crown a Champion',
      hook: 'Vote Propagandist of the Week. Tallies stay secret; glory doesn\'t.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'pledge', label: 'Cast your fan vote for the week',
          target: { kind: 'anchor', ref: '/#pf-vote' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'fanvote', xp: 10, cadence: 'weekly' },
      proof: { template: 'I voted for Propagandist of the Week as {{callsign}} — JOIN THE FIGHT.' }
    },
    {
      id: 'q-intel-match', region: 'intel',
      title: 'Know Your Allies',
      hook: 'Find your propagandist archetype. Know your lane.',
      unlock: { callsign: false, cell: false, pickFight: null },
      steps: [
        { type: 'quiz', label: 'Take the Find Your SLR Match quiz',
          target: { kind: 'anchor', ref: '/#slr-quiz' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: 'quiz', xp: 15, cadence: 'once' },
      proof: { template: 'I found my lane as {{callsign}}. Find yours — JOIN THE FIGHT.' }
    },
    {
      id: 'q-intel-briefing', region: 'intel',
      title: 'Read the Briefing',
      hook: 'Read the War Report. Prove you read it.',
      unlock: { callsign: true, cell: false, pickFight: null },
      steps: [
        { type: 'quiz', label: 'Answer the briefing comprehension check',
          target: { kind: 'page', ref: '/war-report' } }
      ],
      completion: { kind: 'all_steps' },
      payoff: { leg: null, xp: 0, cadence: '—', note: 'PENDING-DATA: read-XP Phase-2 legs not yet named' },
      proof: { template: 'Briefing absorbed as {{callsign}} — JOIN THE FIGHT.' }
    }
  ];

  /* ======================================================================
     QUEST ENGINE
     ====================================================================== */
  var LS_Q = 'pf_quests_v1';
  function qStore() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_Q) || '{}');
      if (!s || typeof s !== 'object') s = {};
      if (!s.done) s.done = {};
      if (!s.dismissed) s.dismissed = {};
      return s;
    } catch (e) { return { done: {}, dismissed: {} }; }
  }
  function qSave(s) {
    try { localStorage.setItem(LS_Q, JSON.stringify(s)); } catch (e) {}
  }

  /* Backend-first quest definitions, bundled seed as fail-soft fallback. */
  var questsCache = null;
  function loadQuests() {
    if (questsCache) return questsCache;
    questsCache = new Promise(function (resolve) {
      var done = false;
      function useSeed() {
        if (done) return; done = true;
        resolve({ quests: QUEST_SEED.slice(), source: 'seed' });
      }
      try {
        if (!NS.jsonp) { useSeed(); return; }
        NS.jsonp('quests', {}).then(function (res) {
          try {
            if (res && res.ok && res.data && Array.isArray(res.data.quests) && res.data.quests.length) {
              if (done) return; done = true;
              resolve({ quests: res.data.quests, source: 'backend' });
              return;
            }
          } catch (e) {}
          useSeed();
        });
        /* Belt-and-braces: never leave the deck waiting on quest defs. */
        setTimeout(useSeed, 4000);
      } catch (e) { useSeed(); }
    });
    return questsCache;
  }

  /* --- unlock evaluation --- */
  function pickFights() {
    /* Guarded: fe/pick-your-fight is in-flight. Absent -> null (no filter). */
    try {
      if (window.PF && typeof window.PF.pickFight === 'function') {
        var f = window.PF.pickFight();
        return Array.isArray(f) ? f : null;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('pf_pick_fight_v1');
      if (raw === null) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e2) { return null; }
  }
  function inCell() {
    /* pf_cells_v1 {mult, cell_id, name, t} is written by the cells silo after
       a successful authed cell_mine. cell_id non-empty = in a cell. */
    try {
      var c = JSON.parse(localStorage.getItem('pf_cells_v1') || 'null');
      return !!(c && c.cell_id);
    } catch (e) { return false; }
  }
  function myCellName() {
    try {
      var c = JSON.parse(localStorage.getItem('pf_cells_v1') || 'null');
      return (c && c.name) ? String(c.name) : '';
    } catch (e) { return ''; }
  }

  function evalUnlock(q) {
    var u = q.unlock || {};
    if (u.callsign && !callsign()) return { open: false, reason: 'ENLIST TO UNLOCK' };
    if (u.cell && !inCell()) return { open: false, reason: 'JOIN A CELL TO UNLOCK' };
    if (u.pickFight && u.pickFight.length) {
      var f = pickFights();
      /* null = never chosen or module absent -> no filter -> gate passes. */
      if (f !== null) {
        var hit = false;
        for (var i = 0; i < u.pickFight.length; i++) {
          if (f.indexOf(u.pickFight[i]) !== -1) { hit = true; break; }
        }
        if (!hit) return { open: false, reason: 'OUTSIDE YOUR CHOSEN FIGHTS' };
      }
    }
    return { open: true, reason: '' };
  }

  /* --- step completion signals (best-effort, honest) --- */
  function got() {
    try { return JSON.parse(localStorage.getItem('pf_ranks_v1') || '{}').got || {}; } catch (e) { return {}; }
  }
  function chiToday() {
    try {
      var n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2);
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
  }
  function gotKeyStarts(g, prefixes) {
    for (var k in g) {
      if (!g.hasOwnProperty(k)) continue;
      for (var i = 0; i < prefixes.length; i++) {
        if (k === prefixes[i] || k.indexOf(prefixes[i]) === 0) return true;
      }
    }
    return false;
  }
  /* Returns 'done' | 'open' | 'unknown' (unknown = no verifiable signal yet). */
  function verifyStep(step) {
    try {
      var g = got(), today = chiToday();
      switch (step.type) {
        case 'checkin': {
          try {
            var d = JSON.parse(localStorage.getItem('pf_do_v1') || '{}');
            if (d && d.byType && d.byType['pf-checkin'] > 0) return 'done';
          } catch (e) {}
          return (g.checkin === today) ? 'done' : 'open';
        }
        case 'share':
          return (g.share === today) ? 'done' : 'open';
        case 'quiz':
          return gotKeyStarts(g, ['quiz', 'pfx-q']) ? 'done' : 'open';
        case 'pledge': {
          var ref = (step.target && step.target.ref) || '';
          if (ref.indexOf('pf-vote') !== -1) return gotKeyStarts(g, ['fanvote_', 'pfx-v']) ? 'done' : 'open';
          if (ref === 'pick-your-fight') {
            var f = pickFights();
            return (f && f.length) ? 'done' : 'open';
          }
          return 'unknown';
        }
        case 'recruit':
          try {
            if (localStorage.getItem('pf_recruit_logged_v1') || localStorage.getItem('pf_recruits_seen_v1')) return 'done';
          } catch (e) {}
          return 'open';
        case 'call':
        case 'forge':
        default:
          return 'unknown';
      }
    } catch (e) { return 'unknown'; }
  }

  function questState(q) {
    var s = qStore();
    var doneMap = s.done[q.id] || {};
    var steps = q.steps || [];
    var allDone = steps.length > 0;
    var anyUnknown = false;
    for (var i = 0; i < steps.length; i++) {
      if (doneMap[i]) continue;
      var v = verifyStep(steps[i]);
      if (v === 'done') { doneMap[i] = 1; }
      else if (v === 'unknown') { anyUnknown = true; allDone = false; }
      else { allDone = false; }
    }
    s.done[q.id] = doneMap;
    qSave(s);
    return { done: allDone && !anyUnknown, partial: !allDone, unknown: anyUnknown, doneMap: doneMap };
  }

  function proofText(q) {
    var t = (q.proof && q.proof.template) || 'Quest complete as {{callsign}} — JOIN THE FIGHT.';
    /* pick-your-fight areas are NEVER interpolated (never-public rule). */
    return t.split('{{callsign}}').join(callsign() || 'RECRUIT')
            .split('{{quest}}').join(q.title || '')
            .split('{{cell}}').join(myCellName() || 'UNASSIGNED');
  }

  function safePage(p) {
    p = String(p || '');
    return (/^\/[a-zA-Z0-9_\-\/]*$/.test(p) && p.length <= 80) ? p : '';
  }
  function stepHref(step) {
    try {
      var t = step.target || {};
      if (t.kind === 'anchor' || t.kind === 'page') return safePage(t.ref) || '/';
      if (t.kind === 'flow') {
        if (t.ref === 'pick-your-fight') {
          /* In-flight branch owns the flow UI; fallback deep-links to HQ. */
          return '/political-hq';
        }
        return safePage(t.fallback) || '/';
      }
      if (t.kind === 'pool') return safePage(t.ref) || '/';
    } catch (e) {}
    return '/';
  }

  /* ======================================================================
     registerRegion — additive plug-in API. Wraps registerTile so region
     cards ride the existing tile lifecycle (skeleton -> whenVisible ->
     auth gate -> fetch -> NS.jsonp -> render, error card with RETRY).
     ====================================================================== */
  NS.registerRegion = function (def) {
    if (!def || !def.id || typeof NS.registerTile !== 'function') return false;
    try {
      NS.registerTile({
        id: 'region-' + def.id,
        label: def.label || def.id,
        auth: !!def.auth,
        priority: (def.priority == null ? 10 : def.priority),
        fetch: function () {
          return { action: def.statusAction, params: def.statusParams || {} };
        },
        render: function (card, data) { renderRegionCard(card, def, data); }
      });
      return true;
    } catch (e) {
      try { NS.log('registerRegion:' + def.id, e); } catch (e2) {}
      return false;
    }
  };

  /* Live-status line per region — every value from the endpoint response,
     esc()'d. Endpoint down/empty -> honest quiet state, never invented. */
  function statusLine(def, data) {
    try {
      var d = data || {};
      switch (def.id) {
        case 'fight': {
          var evs = Array.isArray(d.events) ? d.events : [];
          var cutoff = Date.now() - 86400000;
          var civic = [];
          for (var i = 0; i < evs.length; i++) {
            var t = String((evs[i] && evs[i].type) || '');
            if (t.indexOf('civic.') === 0) {
              var ts = Number(evs[i].ts || evs[i].timestamp || 0);
              if (!ts || ts >= cutoff) civic.push(evs[i]);
            }
          }
          if (!civic.length) return 'QUIET ON THIS FRONT — NO CIVIC MOMENTS IN 24H';
          var latest = civic[0];
          var nm = esc(String(latest.name || latest.theme || latest.type || 'civic'));
          return civic.length + ' CIVIC MOMENT' + (civic.length === 1 ? '' : 'S') +
                 ' IN 24H — LATEST: ' + nm.slice(0, 60);
        }
        case 'create': {
          var lb = d.leaders || d.board || d.reviewers || d.rows || [];
          var n = Array.isArray(lb) ? lb.length : 0;
          if (!n) return 'THE POOL IS QUIET — NO REVIEWS ON THE BOARD';
          return n + ' REVIEWER' + (n === 1 ? '' : 'S') + ' ON THE BOARD RIGHT NOW';
        }
        case 'squad': {
          var cells = Array.isArray(d.cells) ? d.cells : [];
          if (!cells.length) return 'NO CELLS ON THE BOARD YET — FOUND THE FIRST';
          var top = cells[0] || {};
          var tn = esc(String(top.name || 'UNNAMED'));
          var st = Number(top.streak || 0);
          return cells.length + ' CELL' + (cells.length === 1 ? '' : 'S') +
                 ' ACTIVE — TOP: ' + tn.slice(0, 40) + ' (STREAK ' + st + ')';
        }
        case 'war': {
          var r = Number(d.raiders);
          if (!(r >= 0)) return 'WAR STATUS UNKNOWN — SIGNAL WEAK';
          if (r === 0) return 'NO RAIDERS YET TODAY — BE THE FIRST';
          return r + ' RAIDER' + (r === 1 ? '' : 'S') + ' IN TODAY\u2019S FIGHT';
        }
        case 'intel': {
          var head = String(d.head || '');
          if (!head) return 'TODAY\u2019S DROP INBOUND';
          return 'TODAY\u2019S DROP: ' + esc(head).slice(0, 90);
        }
        default:
          return 'STATUS: ' + esc(def.label || def.id);
      }
    } catch (e) { return 'STATUS UNAVAILABLE'; }
  }

  function renderRegionCard(card, def, data) {
    var cs = callsign();
    var html =
      '<div class="pfq-region-head"><span class="pfq-region-icon">' + esc(def.icon || '') + '</span> ' +
      '<span class="pfq-region-label">' + esc(def.label || def.id) + '</span></div>' +
      '<div class="pfq-region-status">' + statusLine(def, data) + '</div>' +
      '<div class="pfq-region-quests" data-pfq="quests"><div class="pfq-quiet">MUSTERING QUESTS\u2026</div></div>';
    card.innerHTML = html;
    card.className = 'pfc-tile pfq-region';

    /* Quests fill in async (backend-first, seed fallback) — status never waits. */
    loadQuests().then(function (res) {
      try {
        var host = card.querySelector('[data-pfq="quests"]');
        if (!host) return;
        var list = (res.quests || []).filter(function (q) { return q && q.region === def.id; });
        if (!list.length) {
          host.innerHTML = '<div class="pfq-quiet">NO OPEN QUESTS ON THIS FRONT RIGHT NOW.</div>';
          return;
        }
        var out = '';
        for (var i = 0; i < list.length; i++) {
          out += questHtml(list[i], cs);
        }
        host.innerHTML = out;
        wireQuestCtas(host);
      } catch (e) { try { NS.log('region-quests:' + def.id, e); } catch (e2) {} }
    });
  }

  function questHtml(q, cs) {
    var u = evalUnlock(q);
    var st = u.open ? questState(q) : null;
    var steps = q.steps || [];
    var cls = 'pfq-quest' + (u.open ? '' : ' pfq-locked') + (st && st.done ? ' pfq-done' : '');
    var h = '<div class="' + cls + '" data-pfq-id="' + esc(q.id) + '">';
    h += '<div class="pfq-q-title">' + esc(q.title || q.id) + '</div>';
    h += '<div class="pfq-q-hook">' + esc(q.hook || '') + '</div>';
    if (!u.open) {
      h += '<div class="pfq-q-lock">' + esc(u.reason || 'LOCKED') + '</div>';
    } else if (st && st.done) {
      h += '<div class="pfq-q-done">QUEST COMPLETE — ' + esc(proofText(q)).slice(0, 90) + '</div>';
      h += '<button type="button" class="pfq-q-share" data-pfq-share="' + esc(q.id) + '">SHARE PROOF</button>';
    } else {
      h += '<div class="pfq-q-steps">';
      for (var i = 0; i < steps.length; i++) {
        var done = st && st.doneMap && st.doneMap[i];
        var v = done ? 'done' : verifyStep(steps[i]);
        h += '<div class="pfq-q-step pfq-st-' + v + '">' +
             '<span class="pfq-st-mark">' + (v === 'done' ? '\u2713' : v === 'unknown' ? '?' : '\u25cb') + '</span> ' +
             '<span class="pfq-st-label">' + esc(steps[i].label || steps[i].type) + '</span> ';
        if (v !== 'done') {
          h += '<a class="pfq-st-cta" href="' + esc(stepHref(steps[i])) + '">' +
               (v === 'unknown' ? 'VERIFY IN THE GAME \u2192' : 'DO IT \u2192') + '</a>';
        }
        h += '</div>';
      }
      h += '</div>';
      if (q.payoff && q.payoff.leg) {
        h += '<div class="pfq-q-payoff">PAYOFF: ' + esc(q.payoff.leg) + ' +' + esc(String(q.payoff.xp)) +
             ' XP (' + esc(q.payoff.cadence || '') + ') — awarded by the game, not this deck</div>';
      } else if (q.payoff && q.payoff.note) {
        h += '<div class="pfq-q-payoff">' + esc(q.payoff.note).toUpperCase() + '</div>';
      }
    }
    h += '</div>';
    return h;
  }

  function wireQuestCtas(host) {
    try {
      var btns = host.querySelectorAll('[data-pfq-share]');
      for (var i = 0; i < btns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-pfq-share');
            loadQuests().then(function (res) {
              try {
                var qs = res.quests || [];
                for (var k = 0; k < qs.length; k++) {
                  if (qs[k] && qs[k].id === id) {
                    var txt = proofText(qs[k]);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(txt).catch(function () {});
                    }
                    if (window.PF && typeof window.PF.toast === 'function') {
                      try { window.PF.toast('PROOF COPIED — SPREAD IT'); } catch (e) {}
                    }
                    break;
                  }
                }
              } catch (e) {}
            });
          });
        })(btns[i]);
      }
    } catch (e) {}
  }

  /* --- the five regions --- */
  var REGIONS = [
    { id: 'fight', label: 'FIGHT — Political HQ', icon: '\u2694',
      statusAction: 'feed_list', statusParams: { limit: 50 }, auth: false, priority: 10 },
    { id: 'create', label: 'CREATE — Studio / Forge', icon: '\u2712',
      statusAction: 'review_leaderboard', statusParams: {}, auth: false, priority: 20 },
    { id: 'squad', label: 'SQUAD — Cells', icon: '\u25C8',
      statusAction: 'cell_leaderboard', statusParams: {}, auth: true, priority: 30 },
    { id: 'war', label: 'WAR — Games / Arena', icon: '\u2738',
      statusAction: 'raid_turnout', statusParams: {}, auth: false, priority: 40 },
    { id: 'intel', label: 'INTEL — News / Money', icon: '\u25C9',
      statusAction: 'daily_content', statusParams: {}, auth: false, priority: 50 }
  ];

  /* ======================================================================
     WORLD-EVENTS RIVER — one registerRiver renderer. Live moments from
     ?action=feed_list: entity refs + deep link + expiry. Copy is never
     invented; expired/empty -> the honest quiet state.
     ====================================================================== */
  function safeRiverPage(p) {
    p = String(p || '');
    return (/^\/[a-zA-Z0-9_\-\/]*$/.test(p) && p.length <= 80) ? p : '';
  }
  function riverEventHtml(ev) {
    var ref = (ev && ev.ref) || {};
    var page = safeRiverPage(ref.page);
    var label = String((ev && (ev.name || ev.theme || ev.type)) || 'signal');
    var ago = '';
    try {
      var ts = Number(ev.ts || ev.timestamp || 0);
      if (ts) {
        var m = Math.floor((Date.now() - ts) / 60000);
        ago = m < 1 ? 'now' : m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
      }
    } catch (e) {}
    var inner = '<span class="pfq-river-kind">' + esc(String(ev.type || 'event')) + '</span> ' +
                '<span class="pfq-river-label">' + esc(label).slice(0, 90) + '</span>' +
                (ago ? ' <span class="pfq-river-ago">' + esc(ago) + '</span>' : '');
    if (page) return '<a class="pfq-river-item" href="' + esc(page) + '">' + inner + ' \u2192</a>';
    return '<span class="pfq-river-item">' + inner + '</span>';
  }
  function renderRiver(box) {
    box.innerHTML = '<div class="pfc-sec-label">World Events</div>' +
                    '<div class="pfq-river-list"><div class="pfq-quiet">LISTENING FOR SIGNALS\u2026</div></div>';
    var list = box.querySelector('.pfq-river-list');
    function paint(evs) {
      if (!list) return;
      var now = Date.now(), out = '', n = 0;
      for (var i = 0; i < evs.length && n < 12; i++) {
        var ev = evs[i];
        if (!ev) continue;
        var exp = Number(ev.expires_at || 0);
        var ts = Number(ev.ts || ev.timestamp || 0);
        /* Expired (>24h old or past expires_at) -> filtered, never shown. */
        if (exp && exp < now) continue;
        if (ts && now - ts > 86400000) continue;
        out += riverEventHtml(ev);
        n++;
      }
      list.innerHTML = n ? out : '<div class="pfq-quiet">THE RIVER IS QUIET RIGHT NOW.</div>';
    }
    try {
      if (!NS.jsonp) { paint([]); return; }
      NS.jsonp('feed_list', { limit: 30 }).then(function (res) {
        try {
          if (res && res.ok && res.data && Array.isArray(res.data.events)) paint(res.data.events);
          else paint([]);
        } catch (e) { paint([]); }
      });
    } catch (e) { paint([]); }
  }

  /* Quest-deck styles — every selector scoped under #pf-command.
     Zero global leakage (shell convention). */
  var QCSS =
    '#pf-command .pfq-region-head{font-weight:900;letter-spacing:1px;text-transform:uppercase;font-size:14px;margin:0 0 6px;color:#f5f0e1;}\n' +
    '#pf-command .pfq-region-icon{color:#c1121f;}\n' +
    '#pf-command .pfq-region-status{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:11px;margin:0 0 10px;line-height:1.5;}\n' +
    '#pf-command .pfq-region-quests{border-top:1px solid #333;padding-top:8px;}\n' +
    '#pf-command .pfq-quiet{font-family:ui-monospace,Menlo,Consolas,monospace;color:#6d685c;font-size:11px;}\n' +
    '#pf-command .pfq-quest{border:1px solid #333;padding:8px;margin:0 0 8px;background:#0d0d10;}\n' +
    '#pf-command .pfq-quest.pfq-locked{opacity:.65;}\n' +
    '#pf-command .pfq-quest.pfq-done{border-color:#c1121f;}\n' +
    '#pf-command .pfq-q-title{font-weight:800;text-transform:uppercase;font-size:13px;letter-spacing:1px;}\n' +
    '#pf-command .pfq-q-hook{font-size:12px;color:#b9b3a6;margin:2px 0 6px;line-height:1.4;}\n' +
    '#pf-command .pfq-q-lock{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:11px;}\n' +
    '#pf-command .pfq-q-done{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:11px;margin:0 0 6px;}\n' +
    '#pf-command .pfq-q-step{font-size:12px;margin:4px 0;color:#f5f0e1;}\n' +
    '#pf-command .pfq-q-step.pfq-st-done{color:#6d685c;text-decoration:line-through;}\n' +
    '#pf-command .pfq-st-mark{color:#c1121f;font-weight:900;}\n' +
    '#pf-command .pfq-q-step.pfq-st-done .pfq-st-mark{color:#6d685c;}\n' +
    '#pf-command .pfq-st-cta{color:#f5a623;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;margin-left:6px;}\n' +
    '#pf-command .pfq-q-payoff{font-family:ui-monospace,Menlo,Consolas,monospace;color:#6d685c;font-size:10px;margin-top:6px;}\n' +
    '#pf-command .pfq-q-share{background:transparent;border:1px solid #c1121f;color:#f5f0e1;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;padding:6px 10px;cursor:pointer;}\n' +
    '#pf-command .pfq-river-list{display:flex;flex-direction:column;gap:6px;}\n' +
    '#pf-command .pfq-river-item{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#f5f0e1;text-decoration:none;border-left:3px solid #c1121f;padding:4px 8px;background:#111114;display:block;}\n' +
    '#pf-command a.pfq-river-item{color:#f5a623;}\n' +
    '#pf-command .pfq-river-kind{color:#c1121f;font-weight:700;}\n' +
    '#pf-command .pfq-river-ago{color:#6d685c;}\n';
  function injectQCSS() {
    try {
      if (document.querySelector('style[data-pf="quests"]')) return;
      var st = document.createElement('style');
      st.setAttribute('data-pf', 'quests');
      st.textContent = QCSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ======================================================================
     ROUTING — PFQuestRouting. Least-invasive "deck as home": on the public
     homepage ONLY, when a callsign is present, the START HERE hero block
     swaps to an ENTER COMMAND takeover. No redirect (rejected: breaks the
     Daily Orders habit loop, hijacks deep links, SEO risk). Logged-out
     users and crawlers see the normal hero. Never runs on /command.
     ====================================================================== */
  var RCSS =
    '#pf-quest-routing{margin:0 0 16px;}\n' +
    '#pf-quest-routing .pfqr-takeover{background:#0a0a0c;border:3px solid #c1121f;padding:28px 20px;text-align:center;}\n' +
    '#pf-quest-routing .pfqr-kicker{font-family:ui-monospace,Menlo,Consolas,monospace;color:#f5a623;font-size:12px;letter-spacing:2px;text-transform:uppercase;}\n' +
    '#pf-quest-routing .pfqr-title{font-size:30px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#f5f0e1;margin:8px 0;}\n' +
    '#pf-quest-routing .pfqr-sub{color:#b9b3a6;font-size:14px;margin:0 0 16px;}\n' +
    '#pf-quest-routing .pfqr-btn{display:inline-block;background:#c1121f;color:#fff;text-decoration:none;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:12px 26px;font-size:14px;}\n';
  function injectRCSS() {
    try {
      if (document.querySelector('style[data-pf="quest-routing"]')) return;
      var st = document.createElement('style');
      st.setAttribute('data-pf', 'quest-routing');
      st.textContent = RCSS;
      document.head.appendChild(st);
    } catch (e) {}
  }
  function runRouting() {
    /* Homepage only: path is / (or /home), no #pf-command mount anywhere. */
    var path = '';
    try { path = window.location.pathname || ''; } catch (e) {}
    if (path !== '/' && path !== '/home' && path !== '') return;
    try { if (document.getElementById('pf-command')) return; } catch (e) {}
    if (!callsign()) return; /* logged-out users + crawlers: untouched */
    /* Find the START HERE hero: first section header or the v2 shell top. */
    var hero = null;
    try {
      var heads = document.querySelectorAll('[data-pf-section="start-here"], .pf-sec-start-here, #pf-v2');
      if (heads && heads.length) hero = heads[0];
    } catch (e) {}
    if (!hero) return; /* no hero found -> do nothing, never break the page */
    try {
      injectRCSS();
      var wrap = document.createElement('div');
      wrap.id = 'pf-quest-routing';
      wrap.innerHTML =
        '<div class="pfqr-takeover">' +
        '<div class="pfqr-kicker">Welcome back, ' + esc(callsign()) + '</div>' +
        '<div class="pfqr-title">Command Deck</div>' +
        '<div class="pfqr-sub">Your five fronts are live. Missions are waiting.</div>' +
        '<a class="pfqr-btn" href="/command">ENTER COMMAND \u2192</a>' +
        '</div>';
      hero.parentNode.insertBefore(wrap, hero);
      /* Collapse (don't delete) the original hero so the funnel survives. */
      try { hero.style.display = 'none'; hero.setAttribute('data-pfqr-hidden', '1'); } catch (e2) {}
    } catch (e) {}
  }

  /* ======================================================================
     BOOT — mode detection
     ====================================================================== */
  function onCommandPage() {
    try { return !!document.getElementById('pf-command'); } catch (e) { return false; }
  }
  function boot() {
    try {
      if (onCommandPage()) {
        /* DECK MODE: needs the registry from 02-registry.js. If it isn't
           loaded (standalone script order), register late when it appears:
           mountLate() picks up post-boot registrations anyway. */
        injectQCSS();
        var ready = (typeof NS.registerTile === 'function' && typeof NS.registerRiver === 'function');
        var go = function () {
          try {
            for (var i = 0; i < REGIONS.length; i++) NS.registerRegion(REGIONS[i]);
            NS.registerRiver({ id: 'world-events', render: renderRiver });
          } catch (e) { try { NS.log('quests:boot', e); } catch (e2) {} }
        };
        if (ready) { go(); return; }
        /* Registry not present yet: poll briefly, then give up quietly. */
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          if (typeof NS.registerTile === 'function' && typeof NS.registerRiver === 'function') {
            try { clearInterval(t); } catch (e) {}
            go();
          } else if (tries > 40) {
            try { clearInterval(t); } catch (e2) {}
          }
        }, 250);
      } else {
        /* ROUTING MODE: homepage only. */
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runRouting);
        } else {
          runRouting();
        }
      }
    } catch (e) { try { NS.log('quests:boot', e); } catch (e2) {} }
  }

  /* Public surface (additive; never overwrites existing NS keys).
     NS.registerRegion is assigned above; NS._quests exposes the engine
     for tests and future quest packs. Assigned ONLY when the kill switch
     is off: ?pf_off=quests leaves zero quest surface behind. */
  if (!pfOff()) {
    NS._quests = {
      seed: QUEST_SEED,
      load: loadQuests,
      unlock: evalUnlock,
      verifyStep: verifyStep,
      proofText: proofText,
      regions: REGIONS,
      statusLine: statusLine
    };

    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    } catch (e) { /* never throw at load time */ }
  }
})();
