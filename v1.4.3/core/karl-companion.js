/* core/karl-companion.js  |  PF v1.4.3 | KARL COMPANION — the site's voice.
   CEO directive 2026-10-07 ~13:54 CDT ("Fully integrated into the site.
   It's so much information"): Karl is not a page or a button — Karl is the
   site's voice. The dashboard is the body, Karl is the brain.

   Self-mounting sitewide silo (no div needed): injects a floating
   "ASK KARL" launcher + chat panel on every page.

   What it does:
     1. KNOWS EVERYTHING (local): an embedded site index answers
        "where is X / how do I Y / what is Z" instantly — no network,
        no rate-limit burn.
     2. CONTEXTUAL: every question carries {page, path, callsign} to the
        Karl worker, so answers know where you are.
     3. PROACTIVE: first open per session greets with contextual suggestion
        chips (page-aware, time-aware, onboarding-aware).
     4. DEEP: anything the index can't answer goes to the Karl AI worker
        (POST /karl/ask — theory + evidence, signed "— Karl"), 30/hr/IP.

   Contract: zero XP, read-only, no PII (callsign only, it's public),
   fail-soft (worker down -> honest message, never a spinner forever).
   KILL: ?pf_off=karl-companion */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('karl-companion')) { return; }
  if (window.__pfKarlCompanionDone) { return; }
  window.__pfKarlCompanionDone = true;

  var ASK_URL = 'https://pf-karl.mtcstw.workers.dev/karl/ask';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) { return ''; }
    if (s.charAt(0) === '/') { return s; }
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') { return s; }
    } catch (e) {}
    return '';
  }
  function isEditor() {
    try {
      if ((window.location.href || '').indexOf('/config/') !== -1) { return true; }
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) { return true; }
    } catch (e) {}
    return false;
  }
  function callsign() {
    try {
      if (window.PFCallsign) { return String(window.PFCallsign() || ''); }
      return String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || '');
    } catch (e) { return ''; }
  }
  if (isEditor()) { return; }

  /* ============ THE SITE INDEX — Karl knows everything (local, instant) ============ */
  var PAGES = [
    { p: '/', t: 'MY HQ', d: 'Your war, your numbers, your next move — everything within two taps.', k: ['home', 'homepage', 'dashboard', 'hq', 'main'] },
    { p: '/arcade', t: 'THE ARCADE', d: 'Six games. Zero mercy. Play them all.', k: ['arcade', 'games', 'play', 'game'] },
    { p: '/call-it', t: 'CALL IT.', d: 'Predictions. Call it before it happens.', k: ['predict', 'prediction', 'call it', 'forecast', 'markets', 'war room'] },
    { p: '/liquidation', t: 'LIQUIDATION RECORDS', d: 'The brackets. The carnage. The receipts.', k: ['bracket', 'liquidation', 'tournament'] },
    { p: '/cells', t: 'CELLS', d: 'Your squad, your war. Build it, run it, win it.', k: ['cell', 'cells', 'squad', 'team', 'join'] },
    { p: '/create', t: 'CREATE', d: 'The propaganda workshop. Make it. Ship it.', k: ['create', 'make', 'poster', 'meme', 'workshop', 'forge'] },
    { p: '/bank', t: "THE PEOPLE'S BANK", d: 'Your XP, weaponized. Save it, move it, grow it.', k: ['bank', 'save', 'xp bank'] },
    { p: '/economy', t: 'THE ECONOMY', d: 'Spend XP like it matters. Because it does. FRED briefs here.', k: ['economy', 'fred', 'briefing', 'spend'] },
    { p: '/follow-the-money', t: 'FOLLOW THE MONEY', d: 'Follow the money. See who funds the votes.', k: ['money', 'donor', 'funds', 'pac', 'follow the money'] },
    { p: '/fund', t: 'THE PROPAGANDA FUND', d: 'Every cent, accounted for.', k: ['fund', 'propaganda fund'] },
    { p: '/war-chest', t: 'THE WAR CHEST', d: 'Fund the fight. Watch where every cent goes.', k: ['war chest', 'warchest', 'chest'] },
    { p: '/ventures', t: 'JOINT VENTURES', d: 'Pool up. Back creators. Share the spoils.', k: ['venture', 'ventures', 'invest', 'pool'] },
    { p: '/events', t: 'BOOTS ON THE GROUND', d: 'Digital is the rehearsal. The street is the show.', k: ['event', 'events', 'protest', 'irl', 'rally', 'street'] },
    { p: '/war-report', t: 'WAR REPORT', d: "The week in the war. Numbers, winners, what's next.", k: ['war report', 'report', 'weekly', 'week'] },
    { p: '/governance', t: 'GOVERNANCE', d: 'The machine runs itself — and you get a vote in how.', k: ['governance', 'rules', 'vote', 'govern'] },
    { p: '/karl', t: 'KARL', d: 'Plain questions. Sourced answers. Never a guess.', k: ['karl'] },
    { p: '/receipt', t: 'RECEIPTS', d: 'Politician dossiers — who they are, who funds them.', k: ['receipt', 'dossier', 'politician', 'rep'] },
    { p: '/town', t: 'YOUR TOWN', d: 'Who owns your zip code? Power-mapping, street by street.', k: ['town', 'zip', 'local', 'my town'] },
    { p: '/sick-left-radicals', t: 'SICK LEFT RADICALS', d: 'The creator roster. Find your people.', k: ['roster', 'creator', 'sick left', 'radicals', 'affiliate'] },
    { p: '/creator-onboard', t: 'CREATOR ONBOARDING', d: 'Join the roster. Bring your audience.', k: ['onboard', 'join roster', 'become creator'] },
    { p: '/request-access', t: 'CREATOR HQ ACCESS', d: 'Request access to the members-only Creator HQ.', k: ['creator hq', 'request access', 'members'] },
    { p: '/academy', t: 'THE ACADEMY', d: 'Learn the craft. Graduate dangerous.', k: ['academy', 'learn', 'school', 'train'] },
    { p: '/political-hq', t: 'POLITICAL HQ', d: 'The war room for the political fight. Strategy lives here.', k: ['political', 'phq'] },
    { p: '/store', t: 'THE STORE', d: 'Gear that funds the fight.', k: ['store', 'shop', 'merch', 'gear'] },
    { p: '/podcast', t: 'THE PODCAST', d: 'The Propaganda Factory, in your ears.', k: ['podcast', 'listen', 'audio'] },
    { p: '/about', t: 'ABOUT', d: 'What this machine is and why it exists.', k: ['about', 'what is'] },
    { p: '/faqs', t: 'FAQS', d: 'Questions, answered straight.', k: ['faq', 'help', 'question'] },
    { p: '/privacy', t: 'PRIVACY', d: 'Your data, your rules. Aggregate by default, never sold.', k: ['privacy', 'data', 'policy'] },
    { p: '/terms', t: 'TERMS', d: 'The rules of the road.', k: ['terms', 'tos'] },
    { p: '/dossier', t: 'DOSSIER BUILDER', d: 'Pick a Receipt. Add your context. Publish the page.', k: ['dossier', 'dossier builder', 'publish'] },
    { p: '/town-report', t: 'MY TOWN REPORTS', d: 'Your town\u2019s data. What you\u2019ve seen. Publish the page.', k: ['town report', 'my town reports', 'publish'] },
    { p: '/extraction', t: 'THE EXTRACTION ENGINE', d: 'Who got paid. What they did. Who got hurt. Every number sourced.', k: ['extraction', 'extraction engine', 'who got paid'] },
    { p: '/war-room', t: 'THE WAR ROOM', d: 'Debate nights. Election night. History, live.', k: ['war room', 'debate', 'election night', 'live'] },
    { p: '/remix', t: 'STORY REMIXER', d: 'Sourced stories, citizen evidence. Remix the facts into propaganda.', k: ['remix', 'story remixer', 'remix story'] },
    { p: '/peoples-cpi', t: "THE PEOPLE'S PRICE INDEX", d: 'Crowdsourced prices. The real cost of living.', k: ['cpi', 'price index', 'prices', 'inflation', 'cost of living'] },
    { p: '/cell-war', t: 'CELL WAR', d: 'Cell versus cell. Winner takes the week.', k: ['cell war', 'cell battle', 'war'] },
    { p: '/my-hq', t: 'MY HQ', d: 'Your war, your numbers, your next move — everything within two taps.', k: ['my hq', 'dashboard', 'hq'] }
  ];

  var HOWTOS = [
    { k: ['earn', 'xp', 'points', 'level'], a: 'Earn XP by doing the work: daily check-in, Daily Orders missions, games, posts, recruits. Ranks run SYMPATHIZER to VANGUARD.', h: '/', l: 'OPEN MY HQ' },
    { k: ['callsign', 'claim', 'sign up', 'join', 'enlist', 'new here', 'start'], a: 'Claim your callsign — one prompt, one tap, and you are in the fight. It is your identity across every game and mission.', h: '/', l: 'CLAIM CALLSIGN' },
    { k: ['check in', 'checkin', 'daily'], a: 'Check in from the TODAY strip on My HQ. Streaks stack — do not break the chain.', h: '/', l: 'CHECK IN' },
    { k: ['delete', 'data', 'erase', 'privacy', 'remove my'], a: 'Your data, your call. Hit DELETE MY DATA in the MY DATA section of your dashboard or the footer link — it burns your record.', h: '/', l: 'MY DATA' },
    { k: ['cell', 'squad', 'team', 'join a'], a: 'Cells are squads. Join one or build your own — then run missions together and press the nuke as a unit.', h: '/cells', l: 'FIND A CELL' },
    { k: ['mission', 'daily orders', 'orders'], a: 'Daily Orders drop fresh missions every day. Do them, report back, log the XP.', h: '/', l: "TODAY'S ORDERS" },
    { k: ['nuke'], a: 'The nuke charges when the movement acts. Press it daily from your dashboard — cells that press together win together.', h: '/', l: 'PRESS THE NUKE' },
    { k: ['vote', 'fan vote', 'fan favorite'], a: 'Fan vote runs weekly — back your favorite propagandist. Winner is crowned FAN FAVORITE on Monday.', h: '/', l: 'VOTE' },
    { k: ['war report'], a: 'The War Report lands weekly: the numbers, the winners, what is next. Your personal history lives there too.', h: '/war-report', l: 'WAR REPORT' },
    { k: ['share', 'poster', 'make shareable'], a: 'Every answer and every win can be made shareable — posters built for the feed, stamped JOIN THE FIGHT.', h: '/create', l: 'CREATE' },
    { k: ['install', 'app', 'pwa', 'homescreen', 'home screen'], a: 'Install the app: open the menu and Add to Home Screen. It runs like a native app from there.', h: '/', l: 'MY HQ' },
    { k: ['medal'], a: 'Service medals drop weekly per game. Collect the full weekly set for FULL DEPLOYMENT — +50 XP and your callsign on the Vanguard Wall.', h: '/', l: 'MY HQ' },
    { k: ['calendar'], a: 'The master calendar lives on your dashboard — debriefs, briefings, votes, war reports. Never miss a beat.', h: '/', l: 'CALENDAR' },
    { k: ['karl'], a: 'That is me. I am the site\u2019s voice — ask me where things are, how they work, or what the data says.', h: '/karl', l: 'FULL KARL PAGE' }
  ];

  var PAGE_CTX = {
    '/': { label: 'My HQ dashboard', chips: ['How do I earn XP?', 'Where are my missions?', 'What is the nuke?'] },
    '/my-hq': { label: 'My HQ dashboard', chips: ['How do I earn XP?', 'Where are my missions?', 'What is the nuke?'] },
    '/economy': { label: 'The Economy', chips: ['How do I spend XP?', "Where is FRED's briefing?", 'What is the People\u2019s Bank?'] },
    '/bank': { label: "The People's Bank", chips: ['How do I spend XP?', 'How do I earn XP?'] },
    '/cells': { label: 'Cells', chips: ['How do I join a cell?', 'What is a cell war?', 'How do contracts work?'] },
    '/cell-war': { label: 'Cell War', chips: ['How does cell war work?', 'How do I join a cell?'] },
    '/arcade': { label: 'The Arcade', chips: ['What games are there?', 'How do medals work?'] },
    '/war-report': { label: 'War Report', chips: ['Where is my history?', 'How is the winner picked?'] },
    '/call-it': { label: 'CALL IT.', chips: ['How do predictions work?', 'What is the War Room?'] },
    '/war-room': { label: 'The War Room', chips: ['What is the war room?', 'How do predictions work?'] },
    '/create': { label: 'Create', chips: ['How do I make a poster?', 'How do I share?'] },
    '/remix': { label: 'Story Remixer', chips: ['How do I remix a story?', 'Where do stories come from?'] },
    '/events': { label: 'Events', chips: ['Anything near me?', 'How do I host?'] },
    '/follow-the-money': { label: 'Follow the Money', chips: ['Who funds my rep?', 'What is a dossier?'] },
    '/karl': { label: 'Karl', chips: ['Who funds my rep?', 'What did ExxonMobil do?'] },
    '/receipt': { label: 'Receipts', chips: ['Who funds my rep?', 'What is a dossier?'] },
    '/dossier': { label: 'Dossier Builder', chips: ['How do I build a dossier?', 'What is a receipt?'] },
    '/town': { label: 'Your Town', chips: ['Who owns my zip?', 'What is power mapping?'] },
    '/town-report': { label: 'My Town Reports', chips: ['How do I publish a report?', 'What goes in a town report?'] },
    '/extraction': { label: 'The Extraction Engine', chips: ['Who got paid?', 'How are numbers sourced?'] },
    '/peoples-cpi': { label: "The People's Price Index", chips: ['How do I submit a price?', 'What is the CPI?'] },
    '/liquidation': { label: 'Liquidation Records', chips: ['What is liquidation?', 'How do brackets work?'] },
    '/governance': { label: 'Governance', chips: ['How does the machine run?', 'Where do I vote?'] },
    '/fund': { label: 'The Propaganda Fund', chips: ['Where does the money go?', 'How is it funded?'] },
    '/ventures': { label: 'Joint Ventures', chips: ['How do ventures work?', 'How do I back a creator?'] },
    '/war-chest': { label: 'The War Chest', chips: ['Where does the money go?', 'How do I contribute?'] },
    '/store': { label: 'The Store', chips: ['What funds the fight?', 'What is a war bond?'] },
    '/sick-left-radicals': { label: 'Sick Left Radicals', chips: ['How do I join the roster?', 'Who are the affiliates?'] },
    '/creator-onboard': { label: 'Creator Onboarding', chips: ['How do I join?', 'What are the requirements?'] },
    '/request-access': { label: 'Creator HQ Access', chips: ['How do I get access?', 'What is Creator HQ?'] },
    '/academy': { label: 'The Academy', chips: ['What do I learn?', 'How do I graduate?'] },
    '/political-hq': { label: 'Political HQ', chips: ['What happens here?', 'How do I plug in?'] },
    '/podcast': { label: 'The Podcast', chips: ['Where do I listen?', 'What is the show about?'] },
    '/about': { label: 'About', chips: ['What is this machine?', 'Why does it exist?'] },
    '/faqs': { label: 'FAQs', chips: ['How do I start?', 'How do I earn XP?'] },
    /* Synthetic key: set by pageInfo() div-detection for catalog + roster pages. */
    'roster': { label: 'Sick Left Radicals', chips: ['How do I join the roster?', 'Who are the affiliates?'] }
  };

  var STOP = { the: 1, and: 1, 'for': 1, are: 1, with: 1, you: 1, your: 1, this: 1, that: 1, from: 1, what: 1, how: 1, where: 1, when: 1, who: 1, why: 1, can: 1, all: 1, any: 1, out: 1, its: 1, our: 1, has: 1, have: 1, had: 1, was: 1, were: 1, will: 1, would: 1, there: 1, their: 1, them: 1, then: 1, than: 1, into: 1, over: 1, such: 1, does: 1 };
  function tokens(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; });
  }
  /* Local intent match: keyword overlap scoring. Returns {text, href, link} or null. */
  function matchLocal(q) {
    var tq = tokens(q);
    if (!tq.length) { return null; }
    var best = null, bestScore = 0;
    function scoreKeys(keys) {
      var s = 0;
      for (var i = 0; i < keys.length; i++) {
        var k = String(keys[i]).toLowerCase();
        for (var j = 0; j < tq.length; j++) {
          if (tq[j] === k || (k.length > 4 && tq[j].indexOf(k) === 0) || (tq[j].length > 4 && k.indexOf(tq[j]) === 0)) { s += 2; break; }
        }
        if (q.toLowerCase().indexOf(k) !== -1) { s += 1; }
      }
      return s;
    }
    var i, e, sc;
    var isWhere = /where|find|locate|go to|take me/.test(q.toLowerCase());
    var isHow = /how|what do|help/.test(q.toLowerCase());
    for (i = 0; i < PAGES.length; i++) {
      e = PAGES[i];
      sc = scoreKeys(e.k.concat(tokens(e.t)));
      if (isWhere) { sc += 1; }
      if (sc > bestScore) { bestScore = sc; best = { text: e.t + ' — ' + e.d, href: e.p, link: 'GO THERE' }; }
    }
    for (i = 0; i < HOWTOS.length; i++) {
      e = HOWTOS[i];
      sc = scoreKeys(e.k);
      if (isHow) { sc += 1; }
      if (sc > bestScore) { bestScore = sc; best = { text: e.a, href: e.h, link: e.l }; }
    }
    return bestScore >= 3 ? best : null;
  }

  function pageInfo() {
    var path = '/';
    try { path = window.location.pathname || '/'; } catch (e) {}
    var key = PAGE_CTX[path] ? path : '/';
    if (path !== '/' && !PAGE_CTX[path]) { key = 'other'; }
    /* SWEEP 2026-10-07: catalog + roster pages get roster context via mount-div
       detection — covers all 62 affiliate pages without enumerating slugs. */
    if (key === 'other') {
      try {
        if (document.getElementById('pf-catalog') || document.getElementById('pf-slr-roster')) {
          key = 'roster';
        }
      } catch (e) {}
    }
    var ctx = PAGE_CTX[key] || { label: 'the site', chips: ['What can I do here?', 'How do I earn XP?', 'Where is the war report?'] };
    return { path: path, label: ctx.label, chips: ctx.chips };
  }

  /* ============ WORKER (deep answers) ============ */
  var rl429until = 0;
  function askWorker(q, ctx) {
    return new Promise(function (resolve) {
      if (Date.now() < rl429until) {
        resolve({ ok: false, error: 'rate_limited' });
        return;
      }
      var payload = { question: String(q).slice(0, 500), context: ctx };
      var done = false;
      function fin(r) { if (!done) { done = true; resolve(r); } }
      try {
        fetch(ASK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (r) {
          if (r.status === 429) { rl429until = Date.now() + 3600 * 1000; fin({ ok: false, error: 'rate_limited' }); return; }
          r.json().then(function (j) { fin(j); }, function () { fin({ ok: false, error: 'bad_json' }); });
        }, function () { fin({ ok: false, error: 'network' }); });
      } catch (e) { fin({ ok: false, error: 'network' }); }
      setTimeout(function () { fin({ ok: false, error: 'timeout' }); }, 20000);
    });
  }

  /* ============ UI ============ */
  var CSS = [
    /* Launcher — soft red glow, springy hover. */
    '.pf-kc-btn{position:fixed;right:14px;bottom:76px;z-index:9990;display:flex;align-items:center;gap:9px;',
    'background:linear-gradient(135deg,#d61622 0%,#a50e18 100%);color:#fff;border:0;border-radius:999px;',
    'padding:14px 20px;font:900 14px/1 Arial,sans-serif;letter-spacing:1.5px;cursor:pointer;',
    'box-shadow:0 10px 30px rgba(193,18,31,.35),0 3px 10px rgba(0,0,0,.45);min-height:48px;',
    'transition:transform .18s cubic-bezier(.2,.7,.3,1.2),box-shadow .18s ease}',
    '.pf-kc-btn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(193,18,31,.45),0 4px 12px rgba(0,0,0,.5)}',
    '.pf-kc-btn:active{transform:scale(.96)}',
    '.pf-kc-btn:focus-visible,.pf-kc-chip:focus-visible{outline:2px solid #e8b33c;outline-offset:2px}',
    '.pf-kc-btn .dot{width:9px;height:9px;border-radius:50%;background:#fff;animation:pfkc-pulse 2s infinite}',
    '@keyframes pfkc-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(255,255,255,.5)}50%{opacity:.4;box-shadow:0 0 0 6px rgba(255,255,255,0)}}',
    /* Panel — layered war-room comms channel. */
    '.pf-kc-panel{position:fixed;z-index:9991;right:10px;left:10px;bottom:70px;max-height:min(66vh,560px);',
    'background:linear-gradient(180deg,#151515 0%,#0d0d0d 100%);color:#f5f0e6;border:1px solid #2e2e2e;',
    'border-radius:18px;display:none;flex-direction:column;overflow:hidden;',
    'box-shadow:0 28px 70px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.07)}',
    '@media(min-width:560px){.pf-kc-panel{left:auto;width:400px;right:14px}}',
    '.pf-kc-panel.open{display:flex;animation:pfkc-in .28s cubic-bezier(.2,.9,.25,1.12) both}',
    '@keyframes pfkc-in{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}',
    '.pf-kc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;',
    'border-bottom:1px solid #262626;background:linear-gradient(180deg,rgba(193,18,31,.10),transparent)}',
    '.pf-kc-title{font:900 15px/1 Arial,sans-serif;letter-spacing:3px}',
    '.pf-kc-title::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;',
    'background:#c1121f;margin-right:9px;box-shadow:0 0 10px rgba(193,18,31,.9)}',
    '.pf-kc-sub{font:400 11.5px/1.5 Arial,sans-serif;color:#a39c8b;margin-top:4px}',
    '.pf-kc-x{background:none;border:0;border-radius:50%;color:#9a937f;font-size:22px;cursor:pointer;',
    'min-width:44px;min-height:44px;transition:background .15s ease,color .15s ease}',
    '.pf-kc-x:hover{background:#242424;color:#f5f0e6}',
    '.pf-kc-log{flex:1;overflow-y:auto;padding:16px 16px 12px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}',
    '.pf-kc-log::-webkit-scrollbar{width:8px}',
    '.pf-kc-log::-webkit-scrollbar-thumb{background:#333;border-radius:8px}',
    '.pf-kc-log::-webkit-scrollbar-track{background:transparent}',
    '.pf-kc-msg{max-width:88%;padding:11px 14px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;',
    'animation:pfkc-m .24s cubic-bezier(.2,.8,.3,1.1) both;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
    '@keyframes pfkc-m{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '@media(prefers-reduced-motion:reduce){.pf-kc-panel.open,.pf-kc-msg{animation:none}.pf-kc-btn .dot{animation:none}.pf-kc-btn:hover{transform:none}.pf-kc-td i{animation:none}}',
    /* Karl speaks in serif — the voice of the site. */
    '.pf-kc-msg.karl{background:linear-gradient(180deg,#1e1e1e,#191919);border:1px solid #333;',
    'align-self:flex-start;border-bottom-left-radius:5px;',
    'font-family:Georgia,"Times New Roman",serif;font-size:14.5px;line-height:1.62;color:#f2ecdf}',
    '.pf-kc-msg.karl b{color:#fff}',
    '.pf-kc-mv-h{font-family:Georgia,serif;font-weight:700;font-size:15.5px;color:#fff;letter-spacing:.2px}',
    '.pf-kc-mv-b{font-family:Georgia,serif;font-size:14.5px;line-height:1.62}',
    '.pf-kc-msg.user{background:linear-gradient(135deg,#d61622 0%,#a50e18 100%);color:#fff;',
    'align-self:flex-end;border-bottom-right-radius:5px;font:400 14px/1.55 Arial,sans-serif}',
    '.pf-kc-msg .sig{color:#8a8478;font-family:Arial,sans-serif;font-size:11px;margin-top:7px;letter-spacing:.5px}',
    '.pf-kc-go{display:inline-block;margin-top:9px;background:linear-gradient(135deg,#d61622,#a50e18);color:#fff!important;',
    'font:900 12px/1 Arial,sans-serif;letter-spacing:1.2px;padding:11px 18px;border-radius:9px;text-decoration:none;',
    'min-height:40px;box-shadow:0 4px 14px rgba(193,18,31,.35);transition:transform .15s ease,box-shadow .15s ease}',
    '.pf-kc-go:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(193,18,31,.45)}',
    '.pf-kc-chips{display:flex;gap:8px;flex-wrap:wrap;padding:2px 16px 12px}',
    '.pf-kc-chip{background:linear-gradient(180deg,#222,#1a1a1a);border:1px solid #3d3d3d;color:#f5f0e6;',
    'border-radius:20px;padding:10px 15px;font:400 13px/1 Arial,sans-serif;cursor:pointer;min-height:40px;',
    'transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}',
    '.pf-kc-chip:hover{transform:translateY(-1px);border-color:#c1121f;box-shadow:0 4px 14px rgba(193,18,31,.25)}',
    '.pf-kc-chip:active{background:#2a2a2a;transform:none}',
    '.pf-kc-form{display:flex;gap:8px;padding:12px 12px 16px;border-top:1px solid #232323;background:rgba(0,0,0,.25)}',
    '.pf-kc-in{flex:1;min-width:0;background:#1c1c1c;border:1px solid #3a3a3a;border-radius:12px;color:#f5f0e6;',
    'font:400 16px/1.3 Arial,sans-serif;padding:13px 15px;outline:none;transition:border-color .15s ease,box-shadow .15s ease}',
    '.pf-kc-in:focus{border-color:#c1121f;box-shadow:0 0 0 3px rgba(193,18,31,.22)}',
    '.pf-kc-send{background:linear-gradient(135deg,#d61622,#a50e18);color:#fff;border:0;border-radius:12px;',
    'font:900 14px/1 Arial,sans-serif;letter-spacing:1.2px;padding:0 20px;cursor:pointer;min-height:48px;min-width:68px;',
    'box-shadow:0 4px 14px rgba(193,18,31,.35);transition:transform .15s ease,box-shadow .15s ease}',
    '.pf-kc-send:hover{box-shadow:0 6px 18px rgba(193,18,31,.5)}',
    '.pf-kc-send:active{transform:scale(.96)}',
    /* Typing — Karl working, not a cheap spinner: bubble + bouncing dots. */
    '.pf-kc-typing{display:flex;align-items:center;gap:10px;align-self:flex-start;background:#1a1a1a;',
    'border:1px solid #2c2c2c;border-radius:14px;border-bottom-left-radius:5px;padding:11px 15px;',
    'color:#a39c8b;font:italic 400 13px Georgia,serif}',
    '.pf-kc-td{display:inline-flex;gap:5px}',
    '.pf-kc-td i{width:7px;height:7px;border-radius:50%;background:#c1121f;animation:pfkc-td 1.1s infinite ease-in-out}',
    '.pf-kc-td i:nth-child(2){animation-delay:.15s}',
    '.pf-kc-td i:nth-child(3){animation-delay:.3s}',
    '@keyframes pfkc-td{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-4px);opacity:1}}'
  ];

  var btn, panel, log, form, input, chipsBox;
  var greeted = false;
  try { greeted = sessionStorage.getItem('pf_kc_greeted') === '1'; } catch (e) {}

  function style() {
    var st = document.createElement('style');
    st.textContent = CSS.join('\n');
    document.head.appendChild(st);
  }

  function hourGreeting() {
    var h = new Date().getHours();
    if (h < 5) { return 'Up late, soldier.'; }
    if (h < 12) { return 'Morning. The fight is already moving.'; }
    if (h < 18) { return 'Afternoon. Time to make it count.'; }
    return 'Evening. Debrief o\u2019clock soon.';
  }

  function suggestionChips() {
    /* Muse: dynamic chips — the next move leads, taste biases the rest. */
    try {
      if (window.PFKarlMuse && PFKarlMuse.museChips) {
        var mc = PFKarlMuse.museChips(pageInfo().chips);
        if (mc && mc.length) { return mc; }
      }
    } catch (e) {}
    var pi = pageInfo();
    return pi.chips.slice(0, 3);
  }

  function addMsg(kind, html) {
    var d = document.createElement('div');
    d.className = 'pf-kc-msg ' + kind;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function addChips(list) {
    chipsBox.innerHTML = '';
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pf-kc-chip';
      b.textContent = c;
      b.addEventListener('click', function () { submitQ(c); });
      chipsBox.appendChild(b);
    });
  }

  function greet() {
    /* Muse: the proactive greeting — who you are, where you stand, the move. */
    try {
      if (window.PFKarlMuse && PFKarlMuse.museGreeting) {
        addMsg('karl', PFKarlMuse.museGreeting());
        addChips(suggestionChips());
        return;
      }
    } catch (e) {}
    var cs = callsign();
    var pi = pageInfo();
    var g;
    if (!cs) {
      g = 'I\u2019m <b>Karl</b> — the voice of this site. ' + esc(hourGreeting()) +
        '<br><br>New here? <b>Claim your callsign</b> — one tap and you\u2019re in the fight.' +
        '<br><a class="pf-kc-go" href="/">CLAIM CALLSIGN</a>' +
        '<div class="sig">— Karl</div>';
    } else {
      g = 'I\u2019m <b>Karl</b>. ' + esc(hourGreeting()) +
        '<br>You\u2019re on <b>' + esc(pi.label) + '</b>, ' + esc(cs) +
        '. Ask me where things are, how they work — or what the data says.' +
        '<div class="sig">— Karl</div>';
    }
    addMsg('karl', g);
    addChips(suggestionChips());
  }

  /* ============ CONVERSATION MEMORY (engagement sweep 2026-10-07) ============
     Karl remembers the thread. Last 3 Q&A pairs ride in sessionStorage and
     go to the worker as context.history — so Karl builds on what was just
     said instead of answering every question like it's the first. */
  var HIST_KEY = 'pf_kc_hist_v1';
  function readHistory() {
    try {
      var h = JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]');
      return (h && h.length) ? h.slice(-3) : [];
    } catch (e) { return []; }
  }
  function pushHistory(q, a) {
    try {
      var h = readHistory();
      h.push({ q: String(q).slice(0, 200), a: String(a).slice(0, 500) });
      sessionStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-3)));
    } catch (e) {}
  }

  /* ============ TOPIC-AWARE FOLLOW-UPS (engagement sweep retry 2026-10-07)
     The old code always offered one generic "Tell me more about that".
     Derive the follow-up from the question's topic so it reads like Karl
     listening, not a button factory. */
  function followUpFor(q) {
    var t = String(q || '').toLowerCase();
    function has() {
      for (var i = 0; i < arguments.length; i++) {
        if (t.indexOf(arguments[i]) !== -1) { return true; }
      }
      return false;
    }
    if (has('marx','lenin','trotsky','mao','fanon','luxemburg','che','engels','capital','surplus','theory','communis','socialis','imperialis')) {
      return 'Who else wrote about this?';
    }
    if (has('xp','rank','streak','medal','mission','vote','level')) {
      return 'What\u2019s my fastest path forward?';
    }
    if (has('price','inflation','cpi','shrink','economy','wage','rent','cost of','grocery')) {
      return 'How do I report a price?';
    }
    if (has('how do i','how to','where is','where\u2019s','where do')) {
      return 'What should I do first?';
    }
    if (has('news','happening','trump','biden','congress','election','protest')) {
      return 'What\u2019s the move on this?';
    }
    return 'Tell me more about that';
  }

  /* ============ REWARD FEEDBACK (engagement sweep retry 2026-10-07) ============
     The karl_engage loop granted XP server-side but the user never saw it —
     an invisible reward is no reward. The worker now returns the engage
     outcome ({xp, lucky, capped, milestone, milestone_xp, streak, tier}).
     Surface it: XP float on the answer, milestone pings. All guarded,
     all fail-soft — a missing PF.dope never breaks the chat. */
  function rewardNudge(msgEl, eng) {
    if (!eng || typeof eng !== 'object') { return; }
    try {
      var dope = (window.PF && PF.dope) ? PF.dope : null;
      if (!dope) { return; }
      if (eng.xp > 0 && msgEl && dope.xpFloat) {
        dope.xpFloat(msgEl, '+' + eng.xp + ' XP');
      }
      if (eng.lucky && dope.ping && panel) {
        dope.ping(panel, 'LUCKY QUESTION \u2014 DOUBLE XP');
      }
      if (eng.milestone && eng.milestone_xp > 0 && dope.ping && panel) {
        dope.ping(panel, eng.milestone + '-DAY KARL STREAK \u2014 +' + eng.milestone_xp + ' XP');
      }
    } catch (e) {}
  }
  /* ============ STAGED TYPING (engagement sweep 2026-10-07) ============
     9 seconds of "Karl is thinking…" feels broken on a phone. Rotating
     personality lines make the wait feel like Karl working — because he is. */
  var THINK_LINES = [
    'Karl is thinking\u2026',
    'Checking the rails\u2026',
    'Consulting the canon\u2026',
    'Asking around\u2026',
    'Sharpening the answer\u2026'
  ];
  function stagedTyping() {
    var tp = document.createElement('div');
    tp.className = 'pf-kc-typing';
    var think = document.createElement('span');
    think.textContent = THINK_LINES[0];
    var dots = document.createElement('span');
    dots.className = 'pf-kc-td';
    dots.innerHTML = '<i></i><i></i><i></i>';
    tp.appendChild(think);
    tp.appendChild(dots);
    log.appendChild(tp);
    log.scrollTop = log.scrollHeight;
    var i = 0;
    var iv = setInterval(function () {
      i++;
      if (i >= THINK_LINES.length) { clearInterval(iv); return; }
      try { think.textContent = THINK_LINES[i]; } catch (e) { clearInterval(iv); }
    }, 2200);
    return { el: tp, stop: function () { clearInterval(iv); try { tp.parentNode && tp.parentNode.removeChild(tp); } catch (e) {} } };
  }

  function submitQ(q) {
    q = String(q || '').trim();
    if (!q) { return; }
    addMsg('user', esc(q));
    chipsBox.innerHTML = '';
    /* Muse: the question is a signal — feed the taste model. */
    try { if (window.PFKarlMuse && PFKarlMuse.observeQuestion) { PFKarlMuse.observeQuestion(q); } } catch (e) {}
    var pi = pageInfo();
    /* 1. Local index first — instant, no rate limit. */
    var local = matchLocal(q);
    if (local) {
      var html = esc(local.text);
      if (local.href && safeUrl(local.href)) {
        html += '<br><a class="pf-kc-go" href="' + esc(local.href) + '">' + esc(local.link || 'GO THERE') + '</a>';
      }
      html += '<div class="sig">— Karl</div>';
      setTimeout(function () {
        addMsg('karl', html);
        addChips(suggestionChips());
      }, 350);
      return;
    }
    /* 2. Worker — the deep brain. */
    var typing = stagedTyping();
    var ctx = { page: pi.label, path: pi.path };
    var cs = callsign();
    if (cs) { ctx.callsign = cs; }
    /* Conversation memory: the thread goes with the question. */
    var hist = readHistory();
    if (hist.length) { ctx.history = hist; }
    /* Muse mode: the worker answers as the muse — inspirational, narrative-
       aware, one clear next step. The user state travels with the question. */
    try {
      if (window.PFKarlMuse && PFKarlMuse.museContext) {
        var mc = PFKarlMuse.museContext();
        for (var mk in mc) { ctx[mk] = mc[mk]; }
      }
    } catch (e) {}
    askWorker(q, ctx).then(function (r) {
      typing.stop();
      if (r && r.ok && r.answer) {
        var ansHtml = esc(String(r.answer)).replace(/\n/g, '<br>');
        var msgEl = addMsg('karl', ansHtml);
        /* Remember the thread — next question builds on this one. */
        pushHistory(q, r.answer);
        /* Engagement sweep (retry): the follow-up used to be wiped by the
           unconditional addChips() after this block — it never survived.
           Chips are now set exactly once per branch. */
        var followChips = [followUpFor(q)];
        try {
          var sc = suggestionChips();
          for (var fi = 0; fi < sc.length && followChips.length < 3; fi++) {
            if (followChips.indexOf(sc[fi]) === -1) { followChips.push(sc[fi]); }
          }
        } catch (e) {}
        addChips(followChips);
        /* Reward feedback: the invisible +2 XP is now visible. */
        rewardNudge(msgEl, r.engage);
        return;
      }
      if (r && r.error === 'rate_limited') {
        addMsg('karl', 'I\u2019ve been talking a lot this hour — even comrades need a breather. The site index still works though: ask me <i>where</i> something is or <i>how</i> to do it, and I\u2019ll point you there instantly.<div class="sig">— Karl</div>');
      } else {
        addMsg('karl', 'The deep brain didn\u2019t pick up just now — the connection dropped somewhere between us. But I still know this site cold: ask me <i>where</i> something is or <i>how</i> to do it.<div class="sig">— Karl</div>');
      }
      addChips(suggestionChips());
    });
  }

  function build() {
    style();
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-kc-btn';
    btn.setAttribute('aria-label', 'Ask Karl');
    btn.innerHTML = '<span class="dot"></span>ASK KARL';
    panel = document.createElement('div');
    panel.className = 'pf-kc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask Karl');
    panel.innerHTML =
      '<div class="pf-kc-head"><div><div class="pf-kc-title">KARL</div>' +
      '<div class="pf-kc-sub">The voice of the site. Ask anything.</div></div>' +
      '<button type="button" class="pf-kc-x" aria-label="Close">&times;</button></div>' +
      '<div class="pf-kc-log"></div>' +
      '<div class="pf-kc-chips"></div>' +
      '<form class="pf-kc-form"><input class="pf-kc-in" type="text" maxlength="300" autocomplete="off" ' +
      'placeholder="Where is\u2026? How do I\u2026?" aria-label="Ask Karl">' +
      '<button type="submit" class="pf-kc-send">ASK</button></form>';
    log = panel.querySelector('.pf-kc-log');
    chipsBox = panel.querySelector('.pf-kc-chips');
    form = panel.querySelector('.pf-kc-form');
    input = panel.querySelector('.pf-kc-in');
    var x = panel.querySelector('.pf-kc-x');

    function toggle(force) {
      var open = typeof force === 'boolean' ? force : !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      if (open) {
        if (!greeted) {
          greeted = true;
          try { sessionStorage.setItem('pf_kc_greeted', '1'); } catch (e) {}
          greet();
        }
        setTimeout(function () { try { input.focus(); } catch (e) {} }, 120);
      }
    }
    btn.addEventListener('click', function () { toggle(); });
    x.addEventListener('click', function () { toggle(false); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = input.value;
      input.value = '';
      submitQ(v);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && panel.classList.contains('open')) { toggle(false); }
    });

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    window.PFKarlCompanion = {
      open: function () { toggle(true); },
      close: function () { toggle(false); },
      ask: function (q) { toggle(true); if (q) { submitQ(q); } },
      /* Test hook: local intent matcher (PAGES/HOWTOS). */
      _match: matchLocal,
      _pages: PAGES.length,
      _howtos: HOWTOS.length
    };
  }

  /* Boot after DOM is ready — the chunk itself loads after idle, so the
     body is long available. */
  function boot() {
    try {
      if (!document.body) { setTimeout(boot, 200); return; }
      build();
    } catch (e) {
      try { if (PF && PF.error) { PF.error('karl-companion', String(e && e.message || e)); } } catch (e2) {}
    }
  }
  boot();
})();
