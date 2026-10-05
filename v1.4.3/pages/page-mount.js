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
      title: 'THE ARCADE', sub: 'Nine games. Zero mercy. Play them all.',
      order: [
        /* REDISTRIBUTION LAYER (2026-10-05): the White Market / casino hall
           is unmounted. The 'markets' silo is rebranded as the War Room —
           Frontline Forecasts (with interim BATTLE WAGERS / RAID / DRAW
           panes inside it); the coin-flip UI moved to the new 'gambits'
           silo right below it. The retired casino.js keeps its
           ?pf_off=casino kill-switch vestigial (not rewired); its
           ['casino','pf-ov-casino'] entry was removed, not replaced. */
        ['markets', 'pf-ov-markets'],
        ['gambits', 'pf-ov-gambits'],
        ['caption-combat', 'pf-ov-caption'],
        ['creator-guess', 'pf-ov-guess'],
        ['daily-interrogation', 'pf-ov-interrogation'],
        ['billionaire-supervillain', 'pf-ov-billionaire'],
        ['bracket-board', 'pf-ov-bracket'],
        ['battles', 'pf-ov-battles'],
        ['infighting', 'pf-ov-infight'],
        ['slr-match-quiz', 'pf-ov-matchquiz']
      ]
    },
    'pf-cells-page': {
      title: 'CELLS', sub: 'Your squad, your war. Build it, run it, win it.',
      order: [
        ['cells', 'pf-ov-cells'],
        ['cell-hq', null], /* self-mounting: renders into #pf-cell-hq (kill: cellhq) */
        ['cell-war', 'pf-ov-cellwar'],
        ['diplo', 'pf-ov-diplo'],
        ['contracts', 'pf-ov-contracts'],
        /* W5-12 Frontlines: weekly territory war map (kill: war-map). */
        ['war-map', 'pf-ov-warmap'],
        /* REDISTRIBUTION LAYER Phase B (2026-10-05): Supply Line Raid —
           bespoke cell home (silo key 'raid'). Cell-scoped rounds; cell_id
           comes from the cell context the cells stack already loaded
           (never URL params). Non-members get the join-a-cell nudge. */
        ['raid', 'pf-ov-raid']
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
        ['earnings', 'pf-ov-earnings']
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
    'pf-economy': {
      title: 'THE ECONOMY', sub: 'Spend XP like it matters. Because it does.',
      order: [
        ['economy', 'pf-ov-economy']
      ]
    },
    /* money (fe/money-page, 2026-10-05): FOLLOW THE MONEY. Self-mounting
       silo — core/money-page.js renders itself into #pf-money (page mode)
       or the interim PHQ tab. Sub copy provisional — Psych veto. */
    'pf-money': {
      title: 'FOLLOW THE MONEY', sub: 'See who bought your government.',
      order: [
        ['money', null]
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
        ['ventures', 'pf-ov-ventures']
      ]
    },
    'pf-events': {
      title: 'BOOTS ON THE GROUND', sub: 'Digital is the rehearsal. The street is the show.',
      order: [
        ['irl', 'pf-ov-irl'],
        /* 2026-10-05 (fe/events-move): Town Hall Tracker + protest/event map
           moved here from Political HQ (wiring-map §7). Order: irl (existing
           page anchor) → town halls → protest map. Kill switches survive the
           move unchanged: ?pf_off=townhall / ?pf_off=civicevents. */
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
    'money': { div: 'pf-money', kill: 'money' }
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
    'pf-cells-page', 'pf-cell-hq',
    'pf-arcade', 'pf-create', 'pf-bank', 'pf-economy',
    'pf-warchest', 'pf-ventures', 'pf-events', 'pf-warreport',
    'pf-war-card', 'pf-academy-hq', 'pf-dash-hq', 'pf-hq-mission',
    'pf-political-hq', 'pf-slr-roster', 'pf-catalog', 'pf-money'
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
