/* pages/page-mount.js  |  PF v1.4.3 | Generic mounter for the new dedicated pages.
   Each new Squarespace page (/arcade, /cells, /create, /bank, /economy,
   /war-chest, /ventures, /events, /war-report) carries a Code block with a
   mount div, e.g. <div id="pf-arcade"></div>. This file stages each page's
   silo templates (from PF.holder()) into its mount div in PAGE_ORDERS
   order and execs inner scripts — mirroring pages/home-v2.js's approach —
   plus a page header (title + sub) at the top. Idempotent: safe to call
   repeatedly; already-mounted silos are skipped.
   SELF-MOUNTING SILOS: an entry with a null template id (currently only
   cell-hq) renders itself into its own div at bundle time instead of
   staging a template. For those, the page must ALSO carry the silo's mount
   div as a Code block in the page HTML (e.g. <div id="pf-cell-hq"></div>
   on /cells) BEFORE the footer loader runs; page-mount relocates it into
   the ordered flow and marks it done.
   KILL: ?pf_off=page-mount  or  localStorage pf_disabled_v1='["page-mount"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfPageMountDone) return;
  if (PF && PF.skip('page-mount')) { return; }
  if (isEditor()) return;
  window.pfPageMountDone = true;

  function err(msg, e) {
    if (PF) PF.error('page-mount', msg + ' :: ' + (e && e.message || e));
  }

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* Mount div id -> { title, sub, order }.
     order entries are [siloKey, templateId]; templateId null = self-mounting
     silo (see header note). Template ids verified against each silo file's
     staged <template id="pf-ov-*">. */
  var PAGE_ORDERS = {
    'pf-arcade': {
      /* BLOSSOM S1 (2026-10-06): the arcade trims to its 6 casual games.
         markets -> /call-it (CALL IT.), bracket-board -> /liquidation
         (LIQUIDATION RECORDS), battles retired from the hub, slr-match-quiz
         -> homepage (home-v2), predgame -> /call-it. */
      title: 'THE ARCADE', sub: 'Six games. Zero mercy. Play them all.',
      phase: 'fight',
      order: [
        ['gambits', 'pf-ov-gambits'],
        ['caption-combat', 'pf-ov-caption'],
        ['creator-guess', 'pf-ov-guess'],
        ['daily-interrogation', 'pf-ov-interrogation'],
        ['billionaire-supervillain', 'pf-ov-billionaire'],
        ['infighting', 'pf-ov-infight'],
        /* Supply Line Raid (silo key 'raid', games/bundle-raid.js): the
           cells-stack game plays from the arcade too — plan S2 sends it home
           here. Cell-scoped rounds (cell_id from the loaded cell context,
           never URL params); non-members get the join-a-cell nudge.
           Entry[3] = the cell-scoped label banner injected above the section.
           Kill: ?pf_off=raid. */
        ['raid', 'pf-ov-raid', null, 'CELL-SCOPED · YOUR CELL RUNS THE LINE']
      ]
    },
    /* BLOSSOM S1 (2026-10-06): CALL IT. — the prediction layer's own home,
       split out of /arcade (plan S1). predgame (CALL IT. proper) +
       markets (the War Room — Frontline Forecasts). Ship-time hand-steps:
       Squarespace page /call-it + <div id="pf-call-it"></div>.
       Kill: ?pf_off=predgame / ?pf_off=markets. Next Move exits to /cells
       (FIGHT→ORGANIZE). */
    'pf-call-it': {
      title: 'CALL IT.', sub: 'Predictions. Call it before it happens.',
      phase: 'fight',
      exit: { text: 'NEXT MOVE →', href: '/cells' },
      order: [
        ['predgame', 'pf-ov-predgame'],
        /* SPACE-AUDIT FIX 7 (2026-10-06): lazy — /call-it no longer loads the
           full bundle-arcade.js synchronously for this one silo. */
        ['markets', 'pf-ov-markets', 'games/bundle-markets.js']
      ]
    },
    /* BLOSSOM S1 (2026-10-06): LIQUIDATION RECORDS — the bracket's own home,
       split out of /arcade (plan S1). Live /liquidation is an ACTIVE BLOG —
       it is NOT this page. The bracket records live on the NEW route
       /liquidation-bracket. Squarespace hand-step (separate): create the
       /liquidation-bracket page carrying <div id="pf-liquidation"></div>.
       Fail-soft: mounts only when #pf-liquidation exists, so nothing renders
       until that page exists. Kill: ?pf_off=bracket-board.
       Next Move exits to /cells (FIGHT→ORGANIZE). */
    'pf-liquidation': {
      title: 'LIQUIDATION RECORDS', sub: 'The brackets. The carnage. The receipts.',
      phase: 'fight',
      exit: { text: 'NEXT MOVE →', href: '/cells' },
      order: [
        ['bracket-board', 'pf-ov-bracket']
      ]
    },
    'pf-cells-page': {
      /* BLOSSOM S2 (2026-10-06): /cells is browse + HQ now. Cell War gameplay,
         the territory maps and competition seasons moved to /cell-war;
         Supply Line Raid moved to /arcade (WS-A). */
      title: 'CELLS', sub: 'Your squad, your people. Find it, found it, run it.',
      order: [
        ['cells', 'pf-ov-cells'],
        ['cell-hq', null], /* self-mounting: renders into #pf-cell-hq (kill: cellhq) */
        ['diplo', 'pf-ov-diplo'],
        ['contracts', 'pf-ov-contracts']
      ]
    },
    /* BLOSSOM S2 (2026-10-06): CELL WAR — the war gameplay page, split off
       /cells. War map + territory map + competition seasons mount here;
       battles stages from games/bundle-arcade.js (footer isCellWar loads
       both bundles). Hand-step: Squarespace page /cell-war carrying
       <div id="pf-cell-war"></div> (redirect queue). */
    'pf-cell-war': {
      title: 'CELL WAR', sub: 'Hold ground. Take theirs.',
      phase: 'organize',
      next: { href: '/events', label: 'NEXT MOVE →' },
      order: [
        ['cell-war', 'pf-ov-cellwar'],
        /* W5-12 Frontlines: weekly territory war map (kill: war-map). */
        ['war-map', 'pf-ov-warmap'],
        /* CELLS 2.0 (2026-10-05): territory map (kill: cell-territory-map)
           + competition seasons (kill: cell-comp-seasons). Moved here from
           /cells in the Blossom S2 split. */
        ['cell-territory-map', 'pf-ov-territory-map'],
        ['cell-comp-seasons', 'pf-ov-cellcomp-seasons'],
        /* Battles (kill: battles) — silo ships in bundle-arcade.js for /arcade,
           and lazy-loads via games/bundle-battles.js on /cell-war (SPACE-AUDIT
           FIX 7, 2026-10-06: no more full arcade bundle for one silo). */
        ['battles', 'pf-ov-battles', 'games/bundle-battles.js']
      ]
    },
    'pf-create': {
      title: 'CREATE', sub: 'The propaganda workshop. Make it. Ship it.',
      order: [
        ['poster-forge', 'pf-ov-poster'],
        ['feed', 'pf-ov-feed'],
        /* GAP AUDIT v2 F1/F2 (2026-10-03): armory + earnings were orphaned in
           the 410991b reorg (staged by games/bundle-create.js, mounted
           nowhere). Remounted here on /create — armory was CREATE-section
           before the reorg ('armory':'create' map), and earnings ("Get Paid
           to Agitate") is creator tooling: revenue_claim is only callable
           from earnings.js, so this is where creators claim revenue. */
        ['armory', 'pf-ov-armory'],
        ['earnings', 'pf-ov-earnings'],
        /* DATA BOUNTIES (2026-10-06): self-mount board — legacy stacked
           path only; the workshop shell owns /create normally. */
        ['data-bounties', null]
      ]
    },
    'pf-bank': {
      title: "THE PEOPLE'S BANK", sub: 'Your XP, weaponized. Save it, move it, grow it.',
      order: [
        ['peoplesbank', 'pf-ov-peoplesbank'],
        /* Federal Reserve (2026-10-04): monetary policy dashboard mounts
           below the retail bank — Bank is retail, Reserve is monetary
           policy; they belong together on /bank. */
        ['reserve', 'pf-ov-reserve']
      ]
    },
    /* BLOSSOM S3 (2026-10-06): THE PEOPLE'S ASSEMBLY — governance gets its
       own home, split off /bank (its own LEAD magnet). games/governance.js
       (also in bundle-hq-deep for /political-hq) loads on /governance via
       the footer isGovernance JS_GAMES entry. Hand-step: Squarespace page
       /governance carrying <div id="pf-governance"></div> (redirect queue). */
    'pf-governance': {
      title: "THE PEOPLE'S ASSEMBLY", sub: 'Propose. Vote. The network governs itself.',
      phase: 'organize',
      next: { href: '/follow-the-money', label: 'NEXT MOVE →' },
      order: [
        ['governance', 'pf-ov-gov']
      ]
    },
    'pf-economy': {
      title: 'THE ECONOMY', sub: 'Spend XP like it matters. Because it does.',
      order: [
        ['economy', 'pf-ov-economy']
      ]
    },
    /* S4/C1 (2026-10-06, Project Blossom): /peoples-cpi — the public
       People's Price Index page (spec peoples-cpi-public-20261006.md).
       Self-mounting silo (games/peoples-cpi.js renders into #pf-peoples-cpi);
       spine phase FIGHT; Next Move exit -> /economy#pf-inflation-checkin.
       Kill: ?pf_off=peoples-cpi. Squarespace hand-steps: page + the
       #pf-peoples-cpi Code block. */
    'pf-peoples-cpi': {
      title: "THE PEOPLE'S PRICE INDEX",
      sub: "The real cost of living, tracked by the people. Two ways of counting. Two separate lines. Never merged.",
      spine: 'FIGHT',
      order: [
        ['peoples-cpi', null]
      ]
    },
    /* money (fe/money-page, 2026-10-05): FOLLOW THE MONEY. Self-mounting
       silo — core/money-page.js renders itself into #pf-money (page mode)
       or the interim PHQ tab. Sub copy provisional — Psych veto. */
    'pf-money': {
      title: 'FOLLOW THE MONEY', sub: 'Follow the money. See who funds the votes.',
      order: [
        ['money', null]
      ]
    },
    /* C4 (2026-10-06, Project Blossom): /fund — THE PROPAGANDA FUND.
       STRUCTURE ONLY: the transparency-report content is gated on News Desk
       + Brand sign-off, so the silo renders an empty-honest body — no
       figures, no placeholders, deliberately. Spine phase ORGANIZE; Next
       Move exit -> /follow-the-money. Kill: ?pf_off=fund. Squarespace
       hand-steps: page + the #pf-fund Code block. */
    'pf-fund': {
      title: 'THE PROPAGANDA FUND', sub: 'Every cent, accounted for.',
      spine: 'ORGANIZE',
      next: { href: '/follow-the-money', label: 'NEXT MOVE →' },
      order: [
        ['fund', null]
      ]
    },
    'pf-warchest': {
      title: 'THE WAR CHEST', sub: 'Fund the fight. Watch where every cent goes.',
      order: [
        ['movement', 'pf-ov-movement']
      ]
    },
    'pf-ventures': {
      title: 'JOINT VENTURES', sub: 'Pool up. Back creators. Share the spoils.',
      order: [
        ['ventures', 'pf-ov-ventures'],
        /* BLOSSOM M3 (2026-10-06): /war-chest folds into /ventures as the
           "Movement Funds" section — same movement silo, same
           pf-ov-movement template, new home. The loader ships
           games/bundle-warchest.js on #pf-ventures so the template stages. */
        ['movement', 'pf-ov-movement']
      ]
    },
    'pf-events': {
      title: 'BOOTS ON THE GROUND', sub: 'Digital is the rehearsal. The street is the show.',
      order: [
        /* 2026-10-05 (fe/master-calendar): the War Calendar mounts first —
           it aggregates every dated thing (IRL, draw, routines, deadlines).
           Kill ?pf_off=mastercal. */
        ['mastercal', 'pf-ov-mastercal'],
        /* 2026-10-05 (fe/events-platform): new events-platform silo —
           listings + RSVP, #e=<id> detail, field-report wall, photo
           check-ins. Zero XP. Kill ?pf_off=events. */
        ['events', 'pf-ov-events'],
        ['townhall', 'pf-ov-townhall'],
        /* Lazy entry: entry[2] names the on-demand chunk. The template stages
           only when games/bundle-events-map.js loads (loader jsLazy()
           observes the placeholder below); mountPage skips until then and the
           retry loop picks it up. Hard ban: no tile-map SDK may ever ride in
           this chunk (OSM link-outs only — civic-events.js contract). */
        ['civicevents', 'pf-ov-civicevents', 'games/bundle-events-map.js']
      ]
    },
    'pf-warreport': {
      title: 'WAR REPORT', sub: "The week in the war. Numbers, winners, what's next.",
      order: [
        ['war-report', 'pf-ov-warreport']
      ]
    },
    /* 2026-10-05 (fe/liveops): War Room — live ops pages for debate nights,
       election night, breaking events. ?event=<slug> selects the event;
       no param renders the schedule. Ship-time hand-step: the Squarespace
       page needs <div id="pf-warroom"></div>. Kill: ?pf_off=liveops. */
    'pf-warroom': {
      title: 'WAR ROOM', sub: 'Debate nights. Election night. History, live.',
      order: [
        ['liveops', 'pf-ov-liveops']
      ]
    }
  };

  /* Self-mounting silos: silo key -> { div, kill }. The silo's IIFE renders
     into div#<div> at bundle time; page-mount only positions it. */
  var SELF = {
    'cell-hq': { div: 'pf-cell-hq', kill: 'cellhq' },
    /* Synergy-2 mission control (2026-10-05): Creator HQ payoff dashboard.
       Self-mounts into #pf-hq-mission (Dashboard Code-block hand-step). */
    'hq-mission': { div: 'pf-hq-mission', kill: 'hq-mission' },
    /* money (fe/money-page, 2026-10-05): the Follow-the-Money suite renders
       itself into #pf-money (core/money-page.js, context-aware mount).
       Kill: ?pf_off=money (master). */
    'money': { div: 'pf-money', kill: 'money' },
    /* data bounties (2026-10-06): the content-to-action intake valve.
       Self-mounts into #pf-data-bounties (games/data-bounties.js). */
    'data-bounties': { div: 'pf-data-bounties', kill: 'databounties' },
    /* S4/C1 (2026-10-06, Project Blossom): the public People's Price Index
       renders itself into #pf-peoples-cpi. Kill: ?pf_off=peoples-cpi. */
    'peoples-cpi': { div: 'pf-peoples-cpi', kill: 'peoples-cpi' },
    /* C4 (2026-10-06, Project Blossom): the Propaganda Fund structure page
       renders itself into #pf-fund. Kill: ?pf_off=fund. */
    'fund': { div: 'pf-fund', kill: 'fund' }
  };

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) {
        err('inner script failed in ' + label, e);
        /* TERMINAL STATE (2026-10-04): a dead inner script must never leave
           its loading skeleton spinning forever — e.g. the cells.js 'Arial'
           syntax error froze "Raising the cell network…" and the cell
           leaderboard on "Loading…" with no error path. Swap any loading
           placeholders in this section for an explicit error + reload. */
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

  /* Page header: kicker + title + sub, injected once at the top of the
     mount div. Inline styles keep it independent of theme CSS. */
  function mountHeader(host, cfg) {
    if (host.querySelector(':scope > .pf-page-head')) return;
    var head = document.createElement('div');
    head.className = 'pf-page-head';
    /* BLOSSOM integration: spine phase declaration on the page header
       (cohesion gate rule — plan §8). Accepts both WS-A/B `phase:` and
       WS-C `spine:` declaration shapes. Set only when declared, so legacy
       pages are never mislabeled. */
    try { var _sp = cfg.phase || cfg.spine; if (_sp) head.setAttribute('data-pf-spine-phase', _sp); } catch (e) {}
    /* CONTRAST FIX (2026-10-04): the hero carries its own dark band so the
       near-white title is never at the mercy of the Squarespace section
       background — /economy, /arcade and /war-chest ship light-gray section
       backgrounds, which washed #f5ead6 out to ~1.4–2.0:1 (verified below).
       On this dark band the title hits 16.3:1 and the sub 7.3:1 (both AAA).
       Red top/bottom bars keep the red/black propaganda treatment. */
    /* NAV OFFSET (2026-10-04): the band is the first content on all 9 injected
       pages and sat under the fixed nav, clipping the top of the hero title.
       80px top margin matches the homepage HERO FIX (01-styles.css) and clears
       the fixed header on every injected page via this one shared mount. */
    head.style.cssText = 'text-align:center;margin:80px auto 22px;max-width:720px;font-family:Arial,sans-serif;' +
      'background:linear-gradient(180deg,#141414 0%,#0b0b0b 100%);' +
      'border:1px solid #333;border-top:4px solid #c1121f;border-bottom:4px solid #c1121f;' +
      'padding:24px 18px 20px;box-sizing:border-box;border-radius:3px;';
    var kicker = document.createElement('div');
    kicker.style.cssText = 'font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;';
    kicker.textContent = 'MTCSTW.COM';
    var title = document.createElement('div');
    title.style.cssText = "font-family:'Arial Black',Arial,sans-serif;font-size:34px;letter-spacing:3px;color:#f5ead6;text-transform:uppercase;margin:0 0 8px;";
    title.textContent = cfg.title;
    var rule = document.createElement('div');
    rule.style.cssText = 'height:3px;width:120px;background:#c1121f;margin:0 auto 10px;';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:15px;color:#a89e88;line-height:1.5;';
    sub.textContent = cfg.sub;
    head.appendChild(kicker); head.appendChild(title);
    head.appendChild(rule); head.appendChild(sub);
    /* BLOSSOM (2026-10-06): spine phase on the injected header — pages
       declare cfg.phase ('organize' etc.); unset pages carry no attribute. */
    if (cfg.phase) { try { head.setAttribute('data-pf-spine-phase', cfg.phase); } catch (e2) {} }
    host.insertBefore(head, host.firstChild);
  }

  /* Position a self-mounting silo's div inside the page flow, in order.
     Moves an existing div (Squarespace Code block) into the mount div at
     the current append point; creates it if the page forgot it. Moving a
     node preserves its rendered content and listeners. */
  function mountSelf(host, silo, selfCfg) {
    if (PF && PF.skip(selfCfg.kill)) { return true; }
    var div = document.getElementById(selfCfg.div);
    if (!div) {
      div = document.createElement('div');
      div.id = selfCfg.div;
      err('self-mount div #' + selfCfg.div + ' missing from page HTML — created empty; ' +
          silo + ' renders itself only when its div exists before bundles load', null);
    }
    /* Append at the current ordered position. Entries mount in PAGE_ORDERS
       order, so the end of the mount div is always the right slot; moving
       an existing node preserves its rendered content and listeners. */
    host.appendChild(div);
    return true;
  }

  /* BLOSSOM S1 (2026-10-06): Next Move exit — every new page has an exit
     (plan §2: no dead ends). Re-appended on every mountPage call so it stays
     below late-mounting sections; idempotent. Fail-soft: skipped when the
     PAGE_ORDER entry declares no exit. */
  function mountExit(h, cfg) {
    try {
      /* BLOSSOM integration: accept both WS-A (exit:{text,href}) and
         WS-B (next:{href,label}) declaration shapes. */
      var e = cfg.exit || cfg.next;
      if (!e || !e.href) return;
      var x = h.querySelector(':scope > .pf-next-move');
      if (!x) {
        x = document.createElement('a');
        x.className = 'pf-next-move';
        x.style.cssText = 'display:block;text-align:center;margin:26px auto 60px;max-width:720px;' +
          'font-family:Arial,sans-serif;font-size:15px;font-weight:800;letter-spacing:3px;' +
          'color:#f5ead6;text-decoration:none;border:2px solid #c1121f;padding:14px 18px;' +
          'background:rgba(193,18,31,.12);border-radius:3px;box-sizing:border-box;';
        x.href = e.href;
        var sp = document.createElement('span');
        sp.textContent = e.text || e.label || 'NEXT MOVE →';
        x.appendChild(sp);
      }
      h.appendChild(x); /* move to bottom */
    } catch (e) { /* exit is best-effort */ }
  }

  var mounted = {};
  /* 2026-10-05 (fe/events-move): tracks injected lazy-bundle anchors so a
     lazy entry's placeholder is created exactly once per page/silo. */
  var lazyAnchored = {};
  /* DEFECT 3 (2026-10-03; root cause corrected 2026-10-04; generalized
     2026-10-04): force PF mount points' Fluid Engine block wrappers to full
     content width — on EVERY v2 page, not just /economy.
     TRUE mechanism (verified against live /economy, /cells, /request-access
     HTML): Squarespace emits a static <style> tag per FE section with
     per-block grid placement, e.g. .fe-block-yui_...{grid-area:1/2/7/10} —
     a narrow column span. There are NO inline layout styles and FE JS does
     not rewrite geometry at runtime; the 2026-10-03 width-only fix failed
     because a grid item's size comes from grid-area/grid-column, not width.
     grid-column:1/-1!important (see .pf-fe-full in core/01-styles.css) spans
     the block across the full grid and beats the static grid-area rule.
     The editor is off-limits, so the mount stamps .pf-fe-full on the
     .fe-block ancestor of every PF mount div.
     FE_MOUNT_IDS is the single registry: PAGE_ORDERS page mounts, the
     self-mount HQ divs, and the homepage / political-hq / SLR mounts. A new
     page or silo adds its mount div id here — no per-page ifs, no
     whack-a-mole. (war-card.js / academy.js keep their own .pf-fe-hq
     stamping: that class also carries height:auto and the /request-access
     row-overlap fix, which .pf-fe-full must not subsume.)
     KILL: ?pf_off=fe-widen or localStorage pf_disabled_v1='["fe-widen"]'.
     Best-effort: never throws, never breaks the mount. */
  var FE_MOUNT_IDS = [
    'pf-v2',
    'pf-cells-page', 'pf-cell-hq', 'pf-cell-war', 'pf-governance',
    'pf-arcade', 'pf-call-it', 'pf-liquidation',
    'pf-create', 'pf-bank', 'pf-economy', 'pf-peoples-cpi',
    'pf-warchest', 'pf-ventures', 'pf-events', 'pf-warreport',
    'pf-war-card', 'pf-academy-hq', 'pf-dash-hq', 'pf-hq-mission',
    'pf-political-hq', 'pf-slr-roster', 'pf-catalog', 'pf-money',
    'pf-data-bounties', 'pf-fund'
  ];
  function feWiden(host) {
    try {
      if (PF && PF.skip('fe-widen')) return;
      var b = host && host.closest ? host.closest('.fe-block') : null;
      if (b && b.classList && !b.classList.contains('pf-fe-full')) {
        b.classList.add('pf-fe-full');
      }
    } catch (e) { /* layout best-effort only */ }
  }
  function feWidenAll() {
    try {
      for (var i = 0; i < FE_MOUNT_IDS.length; i++) {
        var el = document.getElementById(FE_MOUNT_IDS[i]);
        if (el) feWiden(el);
      }
    } catch (e) { /* layout best-effort only */ }
  }
  /* Exposed for silos / debugging. Guarded: only defined once. */
  if (PF && !PF.feWiden) PF.feWiden = feWiden;
  function mountPage(pageId) {
    var cfg = PAGE_ORDERS[pageId];
    if (!cfg) return 0;
    var h = document.getElementById(pageId);
    if (!h || isEditor()) return 0;
    try { mountHeader(h, cfg); } catch (e) {}
    /* DEFECT 3 (generalized 2026-10-04): every dedicated page's mount block
       goes full width — same narrow-column root cause as /economy's
       incident, now handled by the shared registry above. */
    feWiden(h);
    /* WORKSHOP SHELL (2026-10-05): /create is owned by the workshop shell
       (core/workshop.js, first in bundle-create) unless the shell is killed
       via ?pf_off=workshop. The shell renders its own header + tool rail and
       lazy-mounts tools on demand; the legacy stacked layout below is the
       regression path and runs ONLY when the shell is killed — or when the
       shell failed to claim the page (window.pfWorkshopClaimed unset), e.g.
       bundle-create failed to load. Guard is PF.skip('workshop') inverted. */
    if (pageId === 'pf-create' && PF && !PF.skip('workshop') && window.pfWorkshopClaimed) {
      cfg.order.forEach(function (entry) { mounted[pageId + '::' + entry[0]] = 1; });
      return 0;
    }
    var n = 0;
    cfg.order.forEach(function (entry) {
      var silo = entry[0], tplId = entry[1], lazyBundle = entry[2];
      var key = pageId + '::' + silo;
      if (mounted[key]) return;
      if (tplId === null || tplId === undefined) {
        /* Self-mounting silo. */
        var selfCfg = SELF[silo];
        if (!selfCfg) { err('no SELF config for ' + silo, null); mounted[key] = 1; return; }
        try { mountSelf(h, silo, selfCfg); } catch (e) { err('self-mount failed: ' + silo, e); }
        mounted[key] = 1;
        n++;
        return;
      }
      if (PF && PF.skip(silo)) { mounted[key] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) {
          /* 2026-10-05 (fe/events-move): LAZY ENTRY. The chunk hasn't staged
             its template yet — inject a loader anchor placeholder (once) at
             this ordered position so the footer loader's jsLazy() fetches the
             chunk when the section scrolls near. Fail-soft: plain skip when
             there is no lazy bundle for this entry (next retry call tries
             again, as before). */
          if (lazyBundle && !lazyAnchored[key]) {
            lazyAnchored[key] = 1;
            try {
              var anchor = document.createElement('div');
              anchor.className = 'pf-sec-anchor pf-lazy-skel';
              anchor.setAttribute('data-bundle', lazyBundle);
              anchor.setAttribute('data-lazy-silo', silo);
              anchor.innerHTML = '<div class="c-load">Mobilizing&hellip;</div>';
              h.appendChild(anchor);
              /* Fail-soft: if the lazy chunk never arrives (load error,
                 blocked CDN), the skeleton must not spin forever. After 25s
                 with no mount, swap it for an explicit message + reload. */
              setTimeout(function () {
                try {
                  if (mounted[key]) return;
                  var a = h.querySelector('[data-lazy-silo="' + silo + '"]');
                  if (!a || a.getAttribute('data-pf-mounted')) return;
                  a.innerHTML = '<div style="border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;">' +
                    'This section failed to load. ' +
                    '<button style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;" onclick="location.reload()">Reload</button></div>';
                } catch (e2) {}
              }, 25000);
            } catch (e3) { err('lazy anchor failed: ' + silo, e3); }
          }
          return; /* bundle not staged yet — try next call */
        }
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        /* BLOSSOM S1 (2026-10-06): optional entry[3] = a label banner
           injected at the top of the section (e.g. the raid's CELL-SCOPED
           kicker). Fail-soft: skipped when the entry has no label. */
        try {
          if (entry[3]) {
            var lbl = document.createElement('div');
            lbl.className = 'pf-sec-label';
            lbl.style.cssText = 'font-family:Arial,sans-serif;font-size:11px;font-weight:800;' +
              'letter-spacing:3px;color:#dc143c;text-align:center;margin:0 0 10px;';
            lbl.textContent = entry[3];
            section.appendChild(lbl);
          }
        } catch (e5) { /* label is best-effort */ }
        section.appendChild(frag);
        /* A lazy entry's placeholder anchor (if any) is replaced by the real
           section — no orphaned skeletons, no dead mount divs. */
        try {
          var old = h.querySelector('[data-lazy-silo="' + silo + '"]');
          if (old && old.parentNode) {
            old.setAttribute('data-pf-mounted', '1');
            old.parentNode.replaceChild(section, old);
          } else {
            h.appendChild(section);
          }
        } catch (e4) { h.appendChild(section); }
        execScripts(section, tplId);
        mounted[key] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[key] = 1; }
    });
    /* BLOSSOM S1: Next Move exit sits below every section, repositioned on
       each (re)mount so late-mounting silos never strand it mid-page. */
    mountExit(h, cfg);
    return n;
  }

  function mountAll() {
    var total = 0;
    Object.keys(PAGE_ORDERS).forEach(function (pageId) {
      try { total += mountPage(pageId); } catch (e) {}
    });
    return total;
  }

  /* Expose for late bundles / debugging. Guarded: only defined once. */
  if (PF && !PF.mountPageSilos) PF.mountPageSilos = mountAll;

  mountAll();

  /* DEFECT 3 (generalized): widen every PF mount div present on this page —
     covers mounts outside PAGE_ORDERS (homepage #pf-v2, HQ #pf-war-card,
     /political-hq, SLR roster/catalog) in the same blocking sequence. */
  try { feWidenAll(); } catch (e) {}

  /* Race-condition guard: if a game bundle staged its templates after this
     file ran (shouldn't happen — games load blocking before pages — but
     cheap insurance), retry until every page's order is mounted. */
  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountAll(); } catch(e){}
      var allDone = true;
      Object.keys(PAGE_ORDERS).forEach(function (pageId) {
        if (!document.getElementById(pageId)) return;
        PAGE_ORDERS[pageId].order.forEach(function (entry) {
          if (!mounted[pageId + '::' + entry[0]]) allDone = false;
        });
      });
      if (allDone || tries >= 15 || (n === 0 && tries >= 5)) {
        clearInterval(iv);
      }
    }, 2000);
  })();

})();
