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
    { p: '/money', t: 'FOLLOW THE MONEY', d: 'Follow the money. See who funds the votes.', k: ['money', 'donor', 'funds', 'pac', 'follow the money'] },
    { p: '/fund', t: 'THE PROPAGANDA FUND', d: 'Every cent, accounted for.', k: ['fund', 'propaganda fund'] },
    { p: '/war-chest', t: 'THE WAR CHEST', d: 'Fund the fight. Watch where every cent goes.', k: ['war chest', 'warchest', 'chest'] },
    { p: '/ventures', t: 'JOINT VENTURES', d: 'Pool up. Back creators. Share the spoils.', k: ['venture', 'ventures', 'invest', 'pool'] },
    { p: '/events', t: 'BOOTS ON THE GROUND', d: 'Digital is the rehearsal. The street is the show.', k: ['event', 'events', 'protest', 'irl', 'rally', 'street'] },
    { p: '/war-report', t: 'WAR REPORT', d: "The week in the war. Numbers, winners, what's next.", k: ['war report', 'report', 'weekly', 'week'] },
    { p: '/governance', t: 'GOVERNANCE', d: 'How the machine runs itself.', k: ['governance', 'rules', 'vote', 'govern'] },
    { p: '/karl', t: 'KARL', d: 'Plain questions. Sourced answers. Never a guess.', k: ['karl'] },
    { p: '/receipt', t: 'RECEIPTS', d: 'Politician dossiers — who they are, who funds them.', k: ['receipt', 'dossier', 'politician', 'rep'] },
    { p: '/town', t: 'YOUR TOWN', d: 'Power mapping for your zip code.', k: ['town', 'zip', 'local', 'my town'] },
    { p: '/sick-left-radicals', t: 'SICK LEFT RADICALS', d: 'The creator roster. Find your people.', k: ['roster', 'creator', 'sick left', 'radicals', 'affiliate'] },
    { p: '/creator-onboard', t: 'CREATOR ONBOARDING', d: 'Join the roster. Bring your audience.', k: ['onboard', 'join roster', 'become creator'] },
    { p: '/request-access', t: 'CREATOR HQ ACCESS', d: 'Request access to the members-only Creator HQ.', k: ['creator hq', 'request access', 'members'] },
    { p: '/academy', t: 'THE ACADEMY', d: 'Learn the craft. Graduate dangerous.', k: ['academy', 'learn', 'school', 'train'] },
    { p: '/political-hq', t: 'POLITICAL HQ', d: 'The political war room.', k: ['political', 'phq'] },
    { p: '/store', t: 'THE STORE', d: 'Gear that funds the fight.', k: ['store', 'shop', 'merch', 'gear'] },
    { p: '/podcast', t: 'THE PODCAST', d: 'The Propaganda Factory, in your ears.', k: ['podcast', 'listen', 'audio'] },
    { p: '/about', t: 'ABOUT', d: 'What this machine is and why it exists.', k: ['about', 'what is'] },
    { p: '/faqs', t: 'FAQS', d: 'Questions, answered straight.', k: ['faq', 'help', 'question'] },
    { p: '/privacy', t: 'PRIVACY', d: 'Your data, your rules. Aggregate by default, never sold.', k: ['privacy', 'data', 'policy'] },
    { p: '/terms', t: 'TERMS', d: 'The rules of the road.', k: ['terms', 'tos'] }
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
    '/economy': { label: 'The Economy', chips: ['How do I spend XP?', "Where is FRED's briefing?", 'What is the People\u2019s Bank?'] },
    '/bank': { label: "The People's Bank", chips: ['How do I spend XP?', 'How do I earn XP?'] },
    '/cells': { label: 'Cells', chips: ['How do I join a cell?', 'What is a cell war?', 'How do contracts work?'] },
    '/arcade': { label: 'The Arcade', chips: ['What games are there?', 'How do medals work?'] },
    '/war-report': { label: 'War Report', chips: ['Where is my history?', 'How is the winner picked?'] },
    '/call-it': { label: 'CALL IT.', chips: ['How do predictions work?', 'What is the War Room?'] },
    '/create': { label: 'Create', chips: ['How do I make a poster?', 'How do I share?'] },
    '/events': { label: 'Events', chips: ['Anything near me?', 'How do I host?'] },
    '/money': { label: 'Follow the Money', chips: ['Who funds my rep?', 'What is a dossier?'] },
    '/karl': { label: 'Karl', chips: ['Who funds my rep?', 'What did ExxonMobil do?'] },
    '/receipt': { label: 'Receipts', chips: ['Who funds my rep?', 'What is a dossier?'] },
    '/town': { label: 'Your Town', chips: ['Who owns my zip?', 'What is power mapping?'] }
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
    '.pf-kc-btn{position:fixed;right:14px;bottom:76px;z-index:9990;display:flex;align-items:center;gap:8px;',
    'background:#c81e1e;color:#fff;border:0;border-radius:999px;padding:13px 18px;font:900 14px/1 Arial,sans-serif;',
    'letter-spacing:1.5px;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.45);min-height:48px}',
    '.pf-kc-btn:active{transform:scale(.96)}',
    '.pf-kc-btn .dot{width:9px;height:9px;border-radius:50%;background:#fff;animation:pfkc-pulse 2s infinite}',
    '@keyframes pfkc-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
    '.pf-kc-panel{position:fixed;z-index:9991;right:10px;left:10px;bottom:70px;max-height:min(66vh,560px);',
    'background:#0d0d0d;color:#f5f0e6;border:1px solid #2a2a2a;border-radius:16px;display:none;flex-direction:column;',
    'box-shadow:0 12px 44px rgba(0,0,0,.6);overflow:hidden}',
    '@media(min-width:560px){.pf-kc-panel{left:auto;width:400px;right:14px}}',
    '.pf-kc-panel.open{display:flex}',
    '.pf-kc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #232323}',
    '.pf-kc-title{font:900 15px/1 Arial,sans-serif;letter-spacing:2.5px}',
    '.pf-kc-sub{font:400 11.5px/1.4 Arial,sans-serif;color:#9a937f;margin-top:3px}',
    '.pf-kc-x{background:none;border:0;color:#9a937f;font-size:22px;cursor:pointer;min-width:44px;min-height:44px}',
    '.pf-kc-log{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}',
    '.pf-kc-msg{max-width:88%;padding:10px 13px;border-radius:12px;font:400 14px/1.5 Arial,sans-serif;white-space:pre-wrap;word-wrap:break-word}',
    '.pf-kc-msg.karl{background:#1c1c1c;border:1px solid #2c2c2c;align-self:flex-start;border-bottom-left-radius:4px}',
    '.pf-kc-msg.user{background:#c81e1e;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
    '.pf-kc-msg .sig{color:#8a8478;font-size:11px;margin-top:6px}',
    '.pf-kc-go{display:inline-block;margin-top:8px;background:#c81e1e;color:#fff!important;font:900 12px/1 Arial,sans-serif;',
    'letter-spacing:1px;padding:10px 16px;border-radius:8px;text-decoration:none;min-height:40px}',
    '.pf-kc-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 10px}',
    '.pf-kc-chip{background:#1c1c1c;border:1px solid #3a3a3a;color:#f5f0e6;border-radius:20px;padding:9px 14px;',
    'font:400 13px/1 Arial,sans-serif;cursor:pointer;min-height:40px}',
    '.pf-kc-chip:active{background:#2a2a2a}',
    '.pf-kc-form{display:flex;gap:8px;padding:10px 12px 14px;border-top:1px solid #232323}',
    '.pf-kc-in{flex:1;min-width:0;background:#1c1c1c;border:1px solid #3a3a3a;border-radius:10px;color:#f5f0e6;',
    'font:400 16px/1.3 Arial,sans-serif;padding:12px 14px;outline:none}',
    '.pf-kc-in:focus{border-color:#c81e1e}',
    '.pf-kc-send{background:#c81e1e;color:#fff;border:0;border-radius:10px;font:900 14px/1 Arial,sans-serif;',
    'letter-spacing:1px;padding:0 18px;cursor:pointer;min-height:48px;min-width:64px}',
    '.pf-kc-typing{color:#8a8478;font:400 13px Arial,sans-serif;align-self:flex-start}'
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

  function submitQ(q) {
    q = String(q || '').trim();
    if (!q) { return; }
    addMsg('user', esc(q));
    chipsBox.innerHTML = '';
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
    var tp = document.createElement('div');
    tp.className = 'pf-kc-typing';
    tp.textContent = 'Karl is thinking\u2026';
    log.appendChild(tp);
    log.scrollTop = log.scrollHeight;
    var ctx = { page: pi.label, path: pi.path };
    var cs = callsign();
    if (cs) { ctx.callsign = cs; }
    askWorker(q, ctx).then(function (r) {
      try { tp.parentNode && tp.parentNode.removeChild(tp); } catch (e) {}
      if (r && r.ok && r.answer) {
        addMsg('karl', esc(String(r.answer)).replace(/\n/g, '<br>'));
      } else if (r && r.error === 'rate_limited') {
        addMsg('karl', 'I\u2019ve answered a lot this hour — I need a breather. The site index still works: ask me <i>where</i> something is or <i>how</i> to do it.<div class="sig">— Karl</div>');
      } else {
        addMsg('karl', 'The rails didn\u2019t answer just now. Ask me where something is or how it works — that part lives right here.<div class="sig">— Karl</div>');
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
