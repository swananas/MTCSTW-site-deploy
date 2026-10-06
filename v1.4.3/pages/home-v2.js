/* pages/home-v2.js  |  PF v1.4.3 | Mounts the slimmed homepage (2026-10-03):
   18 widgets across the 7 funnel sections wherever the <div id="pf-v2"></div>
   shell lives. The rest of the library moved to dedicated pages
   (see pages/page-mount.js). Notify lives in the site header now (games/notify.js).
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomeV2Done) return;
  if (PF && PF.skip('home-v2')) { return; }
  var host = document.getElementById('pf-v2');
  if (!host) return; /* v2 mounts only where the shell lives — never on production pages */
  if (isEditor()) return; /* never mount inside the Squarespace editor */
  window.pfHomeV2Done = true;

  function err(msg, e) {
    if (PF) PF.error('home-v2', msg + ' :: ' + (e && e.message || e));
  }

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* Homepage order, verified against the live page's section roots.
     Daily Orders leads the habit loop: it's the stickiest dopamine lynchpin. */
  /* 2026-10-03: homepage slimmed to 18 widgets across the same 7 funnel
     sections — START HERE (hook→daily loop→identity) → PLAY (arcade
     teasers) → BELONG → CREATE → FUND → ACT → PROOF. Full versions live
     on dedicated pages: /arcade, /cells, /create, /bank, /economy,
     /war-chest, /ventures, /events, /war-report. Notify moved to the
     site header (games/notify.js); intel moved to /political-hq. */
  var ORDER = [
    /* ——— SECTION 1: START HERE — hook & daily loop ——— */
    ['socialproof', 'pf-ov-socialproof'],
    ['brief', 'pf-ov-brief'],
    ['daily-orders', 'pf-ov-orders'],
    /* P1#6 (2026-10-05): hq-nudge promoted to START HERE — the flagship's
       front door sits directly after the daily loop, not buried in CREATE. */
    ['hq-nudge', 'pf-ov-hq-nudge'],
    /* 2026-10-05 (fe/civic-snapshot): civic snapshot card, after hq-nudge. */
    ['civicsnap', 'pf-ov-civicsnap'],
    /* 2026-10-05 (engagement build D, item #3): weekly ritual calendar slot
       (CPI/jobs/Fed moments). Compact mode here; full rail on /money. */
    ['ritual-calendar', 'pf-ov-ritual'],
    ['dopa', 'pf-ov-dopa'],
    ['do-meter', 'pf-ov-dometer'],
    ['enlistment-ranks', 'pf-ov-ranks'],
    /* ——— SECTION 2: PLAY — arcade teasers; the full arcade lives at /arcade ——— */
    ['spotlight', 'pf-ov-spotlight'],
    ['slr-match-quiz', 'pf-ov-matchquiz'],
    ['infighting', 'pf-ov-infight'],
    /* ——— SECTION 3: BELONG — cells & squads ——— */
    ['cells', 'pf-ov-cells'],
    ['referral', 'pf-ov-referral'],
    /* ——— SECTION 4: CREATE — creator tools ——— */
    ['poster-forge', 'pf-ov-poster'],
    ['feed', 'pf-ov-feed'],
    /* ——— SECTION 5: FUND — economy ——— */
    /* TEARDOWN WS-9 (2026-10-06): the QUARTERMASTER store wall leads the
       FUND section — 3-tier War Bond ladder (BACKER / PATRON /
       QUARTERMASTER). One-time bonds + war-chest directory follow. */
    ['quartermaster', 'pf-ov-quartermaster'],
    ['war-bonds', 'pf-ov-bonds'],
    /* A1 home (2026-10-05): People's Price Index HP feeder -> /economy. */
    ['inflation-teaser', 'pf-ov-inflation-teaser'],
    /* ——— SECTION 6: ACT — action ——— */
    /* 2026-10-06 (fe/homepage-sitemap): SITE MAP sits first in ACT, directly
       above the 32-Day Offensive. */
    ['sitemap', 'pf-ov-sitemap'],
    ['campaign', 'pf-ov-campaign'],
    ['alerts', 'pf-ov-alerts'],
    /* 2026-10-05 (engagement build D, item #8): FB group missions — on-site
       check-in for missions posted manually to the 84K group. */
    ['fb-missions', 'pf-ov-fbmissions'],
    /* ——— SECTION 7: PROOF — social validation closer ——— */
    ['fan-vote', 'pf-ov-vote'],
    /* 2026-10-05, Phase 3 #11: War Report Monday card — the weekly ritual's
       front door. Hides entirely when there is no issue or the fetch fails. */
    ['warreport-card', 'pf-ov-warreport-card'],
    /* 2026-10-05, Phase 3 #14: SLR roster teaser — 3 featured fighters
       (top propaganda scores, MTCSTW house entry excluded) -> /sick-left-radicals. */
    ['roster-teaser', 'pf-ov-roster-teaser'],
    /* W5-6 Hall of Proof (2026-10-04): winners wall closes the PROOF section. */
    ['hall', 'pf-ov-hall'],
    /* REDISTRIBUTION LAYER Phase B (2026-10-05): The Solidarity Draw's
       bespoke home (silo key 'draw') — draw pot, tickets, pre-draw secret
       commitment + post-draw verify. Lives inside the Hall of Proof section. */
    ['draw', 'pf-ov-draw'],
    /* 2026-10-05, Phase 3 #13: static podcast LISTEN card — media closer
       at the end of the PROOF section. Pure static, cannot fail. */
    ['podcast-card', 'pf-ov-podcast-card'],
    /* 2026-10-05, Bluesky Component 2: "THE WIRE" — the SLR generator feed
       + hand-picked posts, native house styling. PROOF closer, last. Builds
       against a stub generator URI until Pod 1 publishes; fail-soft hides
       the section until the feed is live. Kill: ?pf_off=bluesky-feed. */
    ['bluesky', 'pf-ov-bsky']
  ];

  /* === SECTION HEADERS (2026-10-03) ===
     The 7 funnel sections, rendered as visible headers. Each entry names
     the first widget silo of its section; the header is injected before it.
     bundle = the lazy bundle the footer loader fetches for the section
     (bundle-sec1.js is already in the critical path). */
  var SECTIONS = [
    { id: 'start-here', num: 1, ico: '🔰', title: 'START HERE',
      sub: 'Your daily briefing, missions, and rank. Begin here every day.',
      first: 'socialproof', bundle: 'games/bundle-sec1.js' },
    { id: 'play', num: 2, ico: '🎮', title: 'PLAY',
      sub: 'A taste of the arcade — the full nine-game lineup lives at /arcade.',
      first: 'spotlight', bundle: 'games/bundle-home.js' },
    { id: 'belong', num: 3, ico: '🏴', title: 'BELONG',
      sub: 'Join a cell. Fight the war. Recruit your friends.',
      first: 'cells', bundle: 'games/bundle-home.js' },
    { id: 'create', num: 4, ico: '🛠️', title: 'CREATE',
      sub: 'Learn, build, publish. The propaganda workshop.',
      first: 'poster-forge', bundle: 'games/bundle-home.js' },
    { id: 'fund', num: 5, ico: '💰', title: 'FUND',
      sub: 'The people\u2019s economy. Fund the fight, see where it goes.',
      first: 'war-bonds', bundle: 'games/bundle-home.js' },
    { id: 'act', num: 6, ico: '⚡', title: 'ACT',
      sub: 'Campaigns, alerts, and boots on the ground.',
      first: 'campaign', bundle: 'games/bundle-home.js' },
    { id: 'proof', num: 7, ico: '📣', title: 'PROOF',
      sub: 'The network is real. Vote, and see it move.',
      first: 'fan-vote', bundle: 'games/bundle-home.js' }
  ];

  /* === COMPANION LINKS (2026-10-03) ===
     "Next up" cross-links per widget: silo -> [[link text, target silo], ...].
     Injected centrally so no widget file needs editing. Targets are silo keys
     (smooth-scrolled via PF.gotoSilo); a target starting with '/' is a URL.
     Silos that moved to dedicated pages point at their page URL. */
  var NEXT_LINKS = {
    'socialproof': [['Vote for your favorite \u2192', 'fan-vote'], ['Join the action \u2192', 'daily-orders']],
    'brief': [['Get your missions \u2192', 'daily-orders'], ['See the network total \u2192', 'do-meter']],
    'daily-orders': [['Claim your loot \u2192', 'dopa']],
    'dopa': [['Protect the streak \u2192', 'daily-orders'], ['Check your rank \u2192', 'enlistment-ranks']],
    'do-meter': [['Add to the total \u2192', 'daily-orders'], ['See who\u2019s moving \u2192', 'socialproof']],
    'enlistment-ranks': [['Recruit and rank up faster \u2192', 'referral'], ['Join a cell \u2192', '/cells'], ['See what you\u2019d unlock \u2192', '/request-access']],
    'spotlight': [['Play it full-size \u2192', '/arcade'], ['Find your match \u2192', 'slr-match-quiz']],
    'slr-match-quiz': [['Meet your match \u2192', 'fan-vote'], ['Play the full arcade \u2192', '/arcade']],
    'infighting': [['Back your fighter \u2192', 'fan-vote'], ['Enter the arena \u2192', '/arcade']],
    'cells': [['Manage your cell \u2192', '/cells'], ['Recruit fighters \u2192', 'referral']],
    'referral': [['Watch them rank up \u2192', 'enlistment-ranks'], ['Bring them to your cell \u2192', '/cells']],
    /* 2026-10-06 (fe/homepage-decondense): poster-forge + feed are teasers now —
       companion links route out to the full workshop instead of scrolling
       between teaser cards. */
    'poster-forge': [['Open the full workshop \u2192', '/create'], ['See the whole machine \u2192', '/network']],
    'feed': [['Forge a poster \u2192', 'poster-forge'], ['Open the full workshop \u2192', '/create']],
    'hq-nudge': [['See what you\u2019d unlock \u2192', '/request-access']],
    'war-bonds': [['Manage your bonds \u2192', '/bank'], ['See where it goes \u2192', '/war-chest']],
    /* A1 home (2026-10-05): Price Index feeder exits. */
    'inflation-teaser': [['Report a price \u2192', '/economy#pf-inflation-checkin'], ['See the full index \u2192', '/economy']],
    /* 2026-10-06 (fe/homepage-sitemap): the site map's companion exits. */
    'sitemap': [['Find your match \u2192', 'slr-match-quiz'], ['Join a cell \u2192', '/cells']],
    'campaign': [['Get the alert \u2192', 'alerts'], ['Take it to the streets \u2192', '/events']],
    'alerts': [['Know the terrain \u2192', '/political-hq'], ['Make a poster \u2192', 'poster-forge']],
    'fan-vote': [['See live activity \u2192', 'socialproof'], ['Back your pick in battle \u2192', '/arcade']],
    'warreport-card': [['Read the full archive \u2192', '/war-report'], ['Vote for your favorite \u2192', 'fan-vote']],
    'roster-teaser': [['Meet all 62 fighters \u2192', '/sick-left-radicals'], ['Find your match \u2192', 'slr-match-quiz']],
    'podcast-card': [['Read this week\u2019s report \u2192', '/war-report']],
    'draw': [['See the winners wall \\u2192', 'hall'], ['Vote for your favorite \\u2192', 'fan-vote']],
    /* 2026-10-05, Bluesky Component 2: THE WIRE — final PROOF closer. */
    'bluesky': [['Find the roster \\u2192', '/sick-left-radicals']]
  };

  /* Silo -> section id. Used to insert each widget's <section> in funnel
     order even as bundles arrive out of order, and to map lazy bundles. */
  var SILO_SEC = {
    'socialproof':'start-here','brief':'start-here','daily-orders':'start-here',
    'hq-nudge':'start-here', /* P1#6 (2026-10-05): promoted with ORDER move */
    'dopa':'start-here','do-meter':'start-here','enlistment-ranks':'start-here',
    'spotlight':'play','slr-match-quiz':'play','infighting':'play',
    'cells':'belong','referral':'belong',
    'poster-forge':'create','feed':'create',
    'war-bonds':'fund',
    /* A1 home (2026-10-05): Price Index HP feeder lives in FUND. */
    'inflation-teaser':'fund',
    'campaign':'act','alerts':'act',
    /* 2026-10-06 (fe/homepage-sitemap): site map lives in ACT, above campaign. */
    'sitemap':'act',
    'fan-vote':'proof',
    /* W5-6 Hall of Proof (2026-10-04). */
    'hall':'proof',
    /* REDISTRIBUTION LAYER Phase B (2026-10-05): Solidarity Draw. */
    'draw':'proof',
    /* 2026-10-05, Phase 3 #11/#13/#14: new PROOF surfaces. */
    'warreport-card':'proof','roster-teaser':'proof','podcast-card':'proof',
    /* 2026-10-05, Bluesky Component 2: THE WIRE closes PROOF. */
    'bluesky':'proof'
  };

  /* Build the 7 section blocks at init: header + lazy-load anchor each.
     Widgets mount BETWEEN their section's anchor and the next section's
     anchor, so funnel order holds no matter what order bundles arrive in.
     Idempotent: skips if sections already exist (re-init safe). */
  function initSections() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    if (h.querySelector('.pf-section-head')) return;
    SECTIONS.forEach(function (s) {
      var div = document.createElement('div');
      div.className = 'pf-section-head';
      div.setAttribute('data-sec', s.id);
      var kicker = document.createElement('div');
      kicker.className = 'pf-sh-kicker';
      kicker.textContent = 'Section ' + s.num + ' of ' + SECTIONS.length;
      var title = document.createElement('div');
      title.className = 'pf-sh-title';
      var ico = document.createElement('span');
      ico.className = 'pf-sh-ico';
      ico.textContent = s.ico;
      title.appendChild(ico);
      title.appendChild(document.createTextNode(s.title));
      var rule = document.createElement('div');
      rule.className = 'pf-sh-rule';
      var sub = document.createElement('div');
      sub.className = 'pf-sh-sub';
      sub.textContent = s.sub;
      div.appendChild(kicker); div.appendChild(title);
      div.appendChild(rule); div.appendChild(sub);
      h.appendChild(div);
      /* Lazy-load anchor: the loader observes these and fetches each
         section's bundle as the user scrolls near it. data-bundle names
         the bundle file; sec1 is already in the critical path. */
      var a = document.createElement('div');
      a.className = 'pf-sec-anchor';
      a.setAttribute('data-sec', s.id);
      a.setAttribute('data-bundle', s.bundle);
      a.style.cssText = 'height:1px;width:1px;';
      h.appendChild(a);
    });
  }

  /* Boots-on-the-Ground nudge card (2026-10-03): the homepage keeps only a
     static nudge — the full event board moved to /events (games/irl.js).
     Injected at the end of the ACT section, after alerts. Idempotent. */
  function mountEventsNudge() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    if (h.querySelector('.pf-events-nudge')) return;
    var card = document.createElement('div');
    card.className = 'pf-events-nudge';
    card.style.cssText = 'max-width:680px;margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;' +
      'background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);' +
      'border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;';
    card.innerHTML =
      '<div style="font-size:12px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:6px;">BOOTS ON THE GROUND</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:24px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;">Take it to the streets.</div>' +
      '<div style="font-size:14px;color:#a89e88;line-height:1.5;margin-bottom:14px;">Phonebanks, canvasses, protests, meetups — the fight isn\u2019t only online. +50 XP per RSVP.</div>' +
      '<a href="/events" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">SEE WHAT\u2019S HAPPENING \u2192</a> ' +
      '<a href="/events#pf-mastercal" style="display:inline-block;color:#f5ead6;font-weight:800;font-size:13px;padding:13px 18px;text-decoration:none;letter-spacing:1px;">WAR CALENDAR \u2192</a>';
    var alertsSec = h.querySelector('section[data-game="alerts"]');
    if (alertsSec && alertsSec.parentNode === h) {
      alertsSec.parentNode.insertBefore(card, alertsSec.nextSibling);
    } else {
      /* alerts not mounted (or killed) — pin to the end of the ACT section. */
      var proofHead = h.querySelector('.pf-section-head[data-sec="proof"]');
      if (proofHead) h.insertBefore(card, proofHead);
      else h.appendChild(card);
    }
  }

  /* Kept for the retry loop's call signature; headers now build at init. */
  function mountHeaders() { try { initSections(); } catch (e) {} }

  /* Inject "Next up" companion links into each mounted widget.
     Idempotent: skips widgets that already have .pf-next. */
  function mountNextLinks() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    Object.keys(NEXT_LINKS).forEach(function (silo) {
      var sec = h.querySelector('section[data-game="' + silo + '"]');
      if (!sec || sec.querySelector(':scope > .pf-next, :scope > div > .pf-next')) return;
      var links = NEXT_LINKS[silo];
      if (!links || !links.length) return;
      var box = document.createElement('div');
      box.className = 'pf-next';
      var label = document.createElement('div');
      label.className = 'pf-next-label';
      label.textContent = 'Next up';
      box.appendChild(label);
      links.forEach(function (pair) {
        var text = pair[0], target = pair[1];
        var a = document.createElement('a');
        a.className = 'pf-next-link';
        a.textContent = text;
        if (target.charAt(0) === '/') {
          a.href = target;
        } else {
          a.href = '#';
          a.setAttribute('data-goto', target);
        }
        box.appendChild(a);
      });
      /* Append inside the widget card (first child div) so it reads as
         part of the widget; fall back to the section itself. */
      var card = sec.firstElementChild;
      if (card && card.tagName === 'DIV') card.appendChild(box);
      else sec.appendChild(box);
    });
  }

  /* Click delegation for companion links — one listener for the whole page. */
  function bindNextLinks() {
    var h = document.getElementById('pf-v2');
    if (!h || h._pfNextBound) return;
    h._pfNextBound = true;
    h.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('.pf-next-link[data-goto]') : null;
      if (!a) return;
      ev.preventDefault();
      var target = a.getAttribute('data-goto');
      if (target && window.PF && PF.gotoSilo) PF.gotoSilo(target);
    });
  }

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) {
        err('inner script failed in ' + label, e);
        /* TERMINAL STATE (2026-10-04): a dead inner script must never leave
           its loading skeleton spinning forever (see the cells.js 'Arial'
           syntax error). Swap loading placeholders for an explicit error. */
        try {
          var loads = root.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
          for (var j = 0; j < loads.length; j++) {
            var d = document.createElement('div');
            d.style.cssText = 'border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;';
            d.innerHTML = 'This widget failed to start. ' +
              '<button style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;" onclick="location.reload()">Reload</button>';
            if (loads[j].parentNode) loads[j].parentNode.replaceChild(d, loads[j]);
          }
        } catch (e2) {}
      }
      scripts[i].remove();
    }
  }

  /* Idempotent mounter — safe to call repeatedly. Lazy bundles call
     PF.mountSilos() after staging their templates so newly-available
     silos mount in ORDER without re-mounting existing ones.
     Missing templates are normal (bundle not loaded yet / silo killed). */
  var mounted = {};
  /* Insert a widget <section> in funnel order: right after its own
     section anchor (and its section's already-mounted widgets), i.e.
     before the NEXT section's header. Falls back to appendChild. */
  function placeWidget(h, section, silo) {
    try {
      var secId = SILO_SEC[silo];
      var idx = -1;
      for (var i = 0; i < SECTIONS.length; i++) {
        if (SECTIONS[i].id === secId) { idx = i; break; }
      }
      if (idx >= 0 && idx + 1 < SECTIONS.length) {
        var nextHead = h.querySelector('.pf-section-head[data-sec="' +
          SECTIONS[idx + 1].id + '"]');
        if (nextHead) { h.insertBefore(section, nextHead); return; }
      }
      h.appendChild(section);
    } catch (e) { try { h.appendChild(section); } catch (e2) {} }
  }
  function mountSilos() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return 0;
    var n = 0;
    ORDER.forEach(function (pair) {
      var silo = pair[0], tplId = pair[1];
      if (mounted[silo]) return;
      if (PF && PF.skip(silo)) { mounted[silo] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) return; /* bundle not staged yet — try next call */
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        placeWidget(h, section, silo);
        execScripts(section, tplId);
        mounted[silo] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[silo] = 1; }
    });
    return n;
  }

  /* Expose for lazy bundles. Guarded: only defined once. */
  if (PF && !PF.mountSilos) PF.mountSilos = mountSilos;
  try { initSections(); } catch (e) {}
  mountSilos();
  try { bindNextLinks(); mountNextLinks(); mountEventsNudge(); } catch (e) {}

  /* Race-condition guard: if lazy bundles staged templates before this file
     defined PF.mountSilos, the loader's onload skipped the mount. Retry until
     all ORDER silos are mounted (or 30s elapses). */
  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountSilos(); } catch(e){}
      try { mountHeaders(); mountNextLinks(); mountEventsNudge(); } catch(e){}
      var allDone = true;
      for (var i = 0; i < ORDER.length; i++) {
        if (!mounted[ORDER[i][0]]) { allDone = false; break; }
      }
      if (allDone || tries >= 15 || n === 0 && tries >= 5) {
        clearInterval(iv);
      }
    }, 2000);
  })();

})();
