#!/usr/bin/env node
/* build/bundle.js — Concatenate v1.4.3 game silos into per-page bundles.
 *
 * WHY WHOLE-FILE CONCAT: each game file is a self-contained IIFE that (1)
 * checks PF.skip() for its kill switch, then (2) stages a <template> into
 * PF.holder() (or self-mounts). Concatenating whole files preserves both
 * behaviors exactly. Extracting inner scripts would break the staging
 * mechanism. Each file is its own namespace guard (IIFE) so concatenation
 * is collision-safe.
 *
 * BUNDLES (2026-10-03): one per page/destination after the homepage
 * slimming (see pages/home-v2.js ORDER + pages/page-mount.js PAGE_ORDERS).
 * Homepage = bundle-sec1 in the critical path + bundle-home lazy-loaded
 * as ONE bundle for the PLAY/BELONG/CREATE/FUND/ACT/PROOF sections.
 * Dedicated pages (/arcade, /cells, /create, /bank, /economy, /war-chest,
 * /ventures, /events, /war-report, SLR roster/catalog) fetch only the
 * bundle(s) they mount. /political-hq fetches bundle-hq.
 * Cache win: change one widget → only its page bundle invalidates.
 *
 * Minification: terser (node_modules) with --compress --mangle. Falls back
 * to raw on error. Pass --debug to write unminified bundles instead.
 *
 * Usage: node build/bundle.js [--debug]
 * Output: v1.4.3/games/bundle-*.js (one per page/destination; bundle-hq.js
 * = HQ-only silos for /political-hq, loaded on demand by the footer
 * loader, never in the homepage critical path or lazy set.)
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');
var DEBUG = process.argv.indexOf('--debug') !== -1;

/* Bundle -> silo files. Mirrors pages/home-v2.js ORDER (homepage) and
   pages/page-mount.js PAGE_ORDERS (dedicated pages). Every game .js file
   lives in exactly one bundle — the build enforces this below. */
var SECTIONS = {
  'bundle-sec1': [
    /* HOMEPAGE V3 START (2026-10-07, fe/home-redesign "unclunk"): the critical
       path is ONLY what the first viewport needs — the brief block and the
       social-proof bar. (Hero is a static template in pages/home-v2.js, no
       game file.) Everything else that used to ride sec1 moves to
       bundle-home (lazy, 800px pre-load margin). Target: critical JS <150KB
       gzip (audit 2026-10-07). */
    'briefing.js',
    'social-proof.js'
    /* notify.js is global chrome (header bell) — it ships in
       pages/bundle-pages.js via build/bundle-core.js, not a page bundle. */
  ],
  'bundle-home': [
    /* HOMEPAGE V3 (2026-10-07, fe/home-redesign "unclunk"): daily-orders is
       the first lazy block — the 800px IO pre-load margin in the footer
       loader pulls bundle-home while the visitor reads the brief, so the
       orders block is mounted by the time they scroll to it. */
    'daily-orders.js',
    /* V3 legacy (2026-10-07): these 13 files rode bundle-sec1 (critical) for
       the OLD homepage. None is needed for the v3 first paint; all move to
       the lazy bundle. Absorbed widgets (do-meter, civic-snapshot, dopamine,
       enlistment-ranks) survive as inline integrations in the v3 blocks and
       are inert here (mount points absent). fred-briefing + theater carry
       v3 guards (no injection into the consolidated brief block). Kill
       switches all preserved. */
    'fred-briefing.js',
    'do-meter.js',
    'home-state.js',
    'pick-fight.js',
    'guided-onboarding.js',
    'political-hq-nudge.js',
    'civic-snapshot.js',
    'ritual-calendar.js',
    'dopamine.js',
    'enlistment-ranks.js',
    'theater.js',
    'service-medals.js',
    'first-wave.js',
    /* HOMEPAGE PLAY/BELONG/CREATE/FUND/ACT/PROOF — lazy-loaded as one bundle
       when those sections scroll near. Dedicated pages (/arcade, /cells,
       /create) fetch the slim bundle-arcade-h / bundle-cells-h /
       bundle-create-h bundles instead of this one.
       2026-10-06 (fe/homepage-decondense, CEO directive): homepage
       de-condensing — spotlight / slr-match-quiz / infighting / cells /
       poster-forge / feed are now static TEASER CARDS (-> /arcade, /cells,
       /create); their full files ship ONLY via the slim-dup bundles for
       the dedicated pages (see SLIM_ONLY below). */
    'spotlight.js',
    'slr-match-quiz-teaser.js',
    'infighting-teaser.js',
    'cells-teaser.js',
    'referral.js',
    'poster-forge-teaser.js',
    'feed-teaser.js',
    /* TEARDOWN WS-9 (2026-10-06): the QUARTERMASTER store wall — 3-tier
       War Bond ladder (BACKER / PATRON / QUARTERMASTER) on PF.patterns.
       Leads the store surface; war-bonds.js (one-time bonds + war-chest
       directory) follows. Kill: ?pf_off=quartermaster. */
    'store-quartermaster.js',
    'war-bonds.js',
    /* A1 home (2026-10-05): /economy Price-Index Home coordinator —
       HP feeder widget for the People's Price Index (FUND section).
       Compact card, no backend calls; deep-links to /economy. */
    'inflation-teaser.js',
    /* 2026-10-06 (fe/homepage-sitemap, CEO directive): SITE MAP / FIND YOUR
       FRONT — the homepage directory block. Pure static, no backend, no XP.
       Registered directly before campaign.js so it mounts first in ACT,
       above the 32-Day Offensive. Kill: ?pf_off=sitemap. */
    'sitemap.js',
    'campaign.js',
    /* 2026-10-06 (fe/war-timeline, PLAY 5): war-timeline-strip.js — compact
       "next 3" strip self-mounting after the YOUR CAMPAIGN (#pf-campaign)
       block. Ships in bundle-home (lazy) next to its mount point; the full
       timeline (war-timeline.js) rides bundle-events. Kill:
       ?pf_off=wartimeline-strip. */
    'war-timeline-strip.js',
    'alerts.js',
    /* Engagement build D item #8 (2026-10-05): FB group missions — on-site
       check-in for manually-posted group missions (ACT section). */
    'fb-missions.js',
    'fan-vote.js',
    /* W5-11 Blackout Op (2026-10-04): siren countdown + debrief reveal. */
    'blackout.js',
    /* W5-6 Hall of Proof (2026-10-04): public winners wall, PROOF section. */
    'hall-of-proof.js',
    /* Wave 3 files (registered by Wave 5C integration 2026-10-04 to unblock
       the build gate; Wave 6B 2026-10-04 registered S5 war-room ticker
       (self-mounting, fail-silent; homepage PROOF + /cells) and A2 flash
       siren here too. Union of both sides — 'hall-of-proof.js' confirmed
       present in the merged tree. */
    'ambush-drop.js',
    'war-room-ticker.js',
    'flash-siren.js',
    'briefing-siren.js',
    /* REDISTRIBUTION LAYER Phase B (2026-10-05): The Solidarity Draw's
       bespoke home (silo key 'draw'), mounted in the Hall of Proof section
       on the homepage (pages/home-v2.js PROOF ORDER). Pre-draw secret
       commitment + post-draw revealed-secret verify. */
    'solidarity-draw.js',
    /* Homepage new surfaces (2026-10-05): War Report Monday card (#11),
       podcast LISTEN card (#13), SLR roster teaser (#14) — PROOF section. */
    'home-new-surfaces.js',
    /* BLUESKY EMBEDS (2026-10-05, Component 2): "THE WIRE" — the SLR
       generator feed + hand-picked posts rendered natively in house
       styling. Homepage PROOF closer (last). Builds against a stub
       generator URI until Component 1 publishes; fail-soft hides the
       section until the feed is live. No XP, read-only. */
    'bluesky-feed.js'
  ],
  /* SLIM DEDICATED-PAGE BUNDLES (2026-10-04, M1 dead-weight fix): /arcade,
     /cells and /create used to fetch the full bundle-home (~83KB gz) to get
     a handful of its games. These three slim bundles re-list silos that
     also live in bundle-home; the loader's JS_GAMES map fetches the slim
     bundle INSTEAD of bundle-home on those pages, so no page ever loads the
     same silo twice. bundle-home stays intact as the homepage's single lazy
     bundle for PLAY/BELONG/CREATE/FUND/ACT/PROOF (zero homepage change).
     The uniqueness check below skips these bundles on purpose. */
  'bundle-arcade-h': [
    /* /arcade — the 5 arcade games that lived in bundle-home. */
    'creator-guess.js',
    'daily-interrogation.js',
    'billionaire-supervillain.js',
    'slr-match-quiz.js',
    'infighting.js'
  ],
  'bundle-cells-h': [
    /* CELL IDENTITY (2026-10-05): structured cell profiles — guided founding
       wizard, quality filters, identity kit. Before its consumers
       (cells.js stages pf-ov-cells with the wizard). Kill: ?pf_off=cell-identity. */
    'cell-identity.js',
    /* /cells — cells.js stages pf-ov-cells for the main Cells widget.
       cell-first-hour.js (CELLS wave G1, 2026-10-04): the guided first hour —
       extends R19's post-claim interstitial; mounts the founder checklist /
       joiner induction on pf-cell-formed / pf-cell-joined. */
    'cells.js',
    'cell-first-hour.js',
    /* S5 war-room ticker /cells leg (slim dup — the loader fetches this
       INSTEAD of bundle-home on /cells, never both). */
    'war-room-ticker.js',
    /* LAUNCH WEEK (2026-10-05): FIRST WAVE /cells leg — circuit card after
       the cell-war standings + the fixed banner bar (war-room mount).
       Slim dup of bundle-sec1's copy; loader fetches this INSTEAD of
       bundle-home on /cells, never both — no double-mount. */
    'first-wave.js'
  ],
  'bundle-create-h': [
    /* /create — poster-forge + feed (the Propaganda Feed workshop). */
    'poster-forge.js',
    /* Slim dup of bundle-home's copy: political tab rides along. */
    'poster-forge-political.js',
    'feed.js'
  ],
  'bundle-arcade': [
    /* TEARDOWN WS-2 (2026-10-06): the games table — lobby cards for /arcade,
       /call-it and /liquidation. First: it mounts first in the page orders
       below, and bundle-arcade.js loads on all three pages. */
    'arcade-cards.js',
    /* /arcade — the 3 arcade games not already in bundle-home. */
    'caption-combat.js',
    'bracket-board.js',
    'battles.js',
    /* THE GAMBIT (2026-10-05): flip create/open/join UI moved out of the
       retired casino template. Silo key 'gambits'; mounts on /arcade via
       page-mount.js, right after the War Room section. */
    'gambits.js',
    /* Redistribution layer de-isolation: exit routing, win-share poster,
       sweep-to-vault, stake tracking. Hooks into the layer settlements
       (markets.js zones, gambits.js) — event name 'pf-wm-settled' stays. */
    'casino-exits.js',
    /* THE WAR ROOM — FRONTLINE FORECASTS (rebranded 2026-10-05 from the
       White Market lobby): the layer's front door + markets panel + the
       Phase-A interim BATTLE WAGERS / RAID / DRAW zones. Mounts on /call-it
       via page-mount.js (moved off /arcade in BLOSSOM S1, 2026-10-06). */
    'markets.js',
    /* A3 Deployment Tracker (2026-10-04): /arcade lobby deep-links into
       unplayed medal games. Coordinator: rebuild bundles to ship. */
    'deploy-tracker.js'
    /* Phase B (built 2026-10-05; extracted to bundle-raid 2026-10-06):
       'supply-raid.js' (silo key 'raid', own bundle now, mounted on
       pf-cells-page AND pf-arcade) and 'solidarity-draw.js' (silo key
       'draw', bundle-home, mounted in the Hall of Proof section on the
       homepage). */
  ],
  /* 2026-10-05 (fe/predict-game): CALL IT. — the prediction-game expansion.
     Standalone page bundle (silo key 'predgame'): the footer fetches it on
     /arcade, /political-hq and /money, so one section component serves all
     three mounts with per-page category preselect. Kill: ?pf_off=predgame. */
  'bundle-predgame': [
    'predgame.js'
  ],
  /* SPACE-AUDIT FIX 7 (2026-10-06): slim dupes so /call-it and /cell-war stop
     loading the full 127KB bundle-arcade.js for a single silo. markets.js
     lazy-loads on /call-it; battles.js lazy-loads on /cell-war. Both stay in
     bundle-arcade.js for /arcade itself. Kill: ?pf_off=markets / ?pf_off=battles. */
  'bundle-markets': [
    'markets.js'
  ],
  'bundle-battles': [
    'battles.js'
  ],
  'bundle-cells': [
    /* CELL IDENTITY (2026-10-05): structured cell profiles — guided founding
       wizard, discovery-on-qualities, identity kit, founder backfill.
       Before its consumers (cell-hq.js, cells.js mounts).
       Kill: ?pf_off=cell-identity. Zero XP on every surface here. */
    'cell-identity.js',
    /* /cells (+ Creator HQ) — the cell lifecycle. */
    'cell-hq.js',
    /* Engagement build D item #7 (2026-10-05): new-cell starter kits —
       founder bounty + 3 starter missions, first 48h. Mounts into
       #pf-cell-hq; server is the granter (no device-local awards). */
    'cell-starter-kit.js',
    /* Cells G7 (2026-10-04): standalone treasury UI (fund/spend/trajectory). */
    'treasury.js',
    'cell-war.js',
    /* Propaganda Front (2026-10-05): opt-in political side front for the
       Cell War — per-capita political asset output, recognition-only crown,
       zero XP. Standby state when the forge/bounty rails aren't live. */
    'cell-war-front.js',
    'diplomacy.js',
    'contracts.js',
    'war-card.js',
    /* W5-12 Frontlines: the weekly territory war map. */
    'war-map.js',
    /* CELLS 2.0 (2026-10-05): territory map + competition seasons. Mount on
       /cells next to the war map (page-mount.js). Kill switches:
       ?pf_off=cell-territory-map / ?pf_off=cell-comp-seasons. Zero XP. */
    'cell-territory-map.js',
    'cell-comp-seasons.js',
    /* COMMUNITY REVIEW WAVE (2026-10-05): Review Pool — community review of
       Content Bank submissions (SOP v2). Silo key 'review-pool'; self-mounts
       into #pf-review-pool on Creator HQ / Studio, silent no-op elsewhere.
       Kill: ?pf_off=review-pool. */
    'review-pool.js'
  ],
  /* BLOSSOM S1 (2026-10-06): Supply Line Raid (silo key 'raid', template
     id pf-ov-raid) extracts to its own bundle — it plays on /cells AND
     /arcade (plan S2 sends the game home to the arcade). Standalone:
     supply-raid.js reads cell_mine itself (backend call), no cells-stack
     dependency. The footer loads this bundle on both pages. */
  'bundle-raid': [
    'supply-raid.js'
  ],
  'bundle-create': [
    /* /create (+ Creator HQ) — creator tooling.
       WORKSHOP SHELL (2026-10-05): core/workshop.js is FIRST so its hidden
       dock hosts (#pf-ammo, #pf-creator-assist, #pf-forged-tray) exist before
       the self-mount modules' IIFEs run — otherwise ammo fires its error
       banner and creator-assist's S7 appends straight into #pf-create.
       pages/workshop-create.js is LAST: it registers every tool adapter with
       the shell and runs the initial route. Both ship here, NOT in
       bundle-create-h (the slim /create bundle stays poster-forge + feed). */
    '../core/workshop.js',
    /* UX COMBINATION PLAY 1 (2026-10-06, fe/ux-create-loop): close the
       creation loop — injects SHARE THIS INTEL / SUBMIT AS DAILY ORDER /
       RALLY YOUR CELL onto the Poster Forge finished-piece screen.
       Lazy MutationObserver injector; mounts whenever the forge's #pBattle
       row lands in the DOM (workshop shell template clone or legacy mount).
       Kill: ?pf_off=createloop. Zero XP, fail-open everywhere. */
    'create-loop.js',
    'academy.js',
    /* Wave 6A R1 (2026-10-04): graduation -> daily-loop induction card.
       Hooks academy.js's pf-lesson-complete event; mounts on /request-access
       + homepage wherever the academy mounts. */
    'academy-graduation.js',
    'creator-assist.js',
    /* Wave claim-support FE (2026-10-05): Ammo Finder — Creator HQ claim
       support. Type a claim, get leftist sources to back it up. Self-mounts
       into #pf-ammo / #pf-war-card. Display-only, no XP. Backend action
       `claim_support_search` CONFIRMED on wave-claim-support (2026-10-05). */
    'ammo.js',
    /* Wave A3 FRED creator surfaces (2026-10-05): S-11 official-figure
       citations + S-28 release-day prompts. Self-mounts right after
       #pf-ammo (ammo.js runs first so the anchor exists). Display-only,
       zero XP. Kills: ?pf_off=ammo-figures / ?pf_off=release-prompts.
       Backend actions `fred_citations` + `fred_release_prompts` CONFIRMED
       on be/fred-creator. */
    'ammo-citations.js',
    'armory.js',
    'dashboard.js',
    'earnings.js',
    /* Synergy-2 mission control (2026-10-05): Creator HQ payoff dashboard —
       synergy map + read-only earnings + the wire (S-28 prompts). Self-mounts
       into #pf-hq-mission (Dashboard Code-block hand-step); silent no-op
       elsewhere. Display-only, zero XP. Kill: ?pf_off=hq-mission.
       Psych spec-review PASS WITH FIXES (all applied); Brand Consistency owns
       the tone bar on the provisional copy. */
    'hq-mission.js',
    /* CONTENT BANK POLITICAL METADATA (2026-10-05, weave #8): Bank Browse —
       the Content Bank gallery (filters, sort, load more, REMIX THIS).
       Silo key 'bank-browse'; self-mounts into #pf-bank-browse on the
       Creator HQ Content Bank area, silent no-op elsewhere.
       Kill: ?pf_off=bank-meta. No XP anywhere in this module. */
    'bank-browse.js',
    /* DATA BOUNTY PROMPTS (2026-10-06, CEO directive): the intake valve of
       the content-to-action machine — system-generated bounties for
       user-confirmed data + PHOTO bounties (user-taken pictures: protests,
       events, price tags, community actions, evidence). Self-mounts into
       #pf-data-bounties (workshop dock host, pre-created by the shell);
       registers as a /create workshop tool; pins cell-targeted bounties on
       #pf-cell-hq. Kill: ?pf_off=databounties. */
    'data-bounties.js',
    /* TEARDOWN WS-4 (2026-10-06, fe/teardown-create): CREATE — THE PRINT SHOP.
       Template-first creation: template picker organized by fight, slot-filling
       editor, full-screen preview, P6 Action Bar. Exposes window.PFPress.mount
       for the workshop adapter below; must load before it. Kill:
       ?pf_off=create-press. Zero XP, fail-open. */
    'create-press.js',
    /* WORKSHOP SHELL adapters (2026-10-05): last in the bundle — registers
       all nine /create tool adapters with PFWorkshop and runs the initial
       #pf-tool= / ?for= route. */
    '../pages/workshop-create.js'
  ],
  'bundle-bank': [
    /* /bank — the People's Bank. */
    'peoplesbank.js',
    /* Wave A5 S-06: official-rates borrow & save context (FRED). After
       peoplesbank so the vault tab can call PFBankFred.mount. */
    'bank-fred-context.js',
    'vault.js',
    /* allfronts admin (2026-10-04): operation console mounts beside the vault. */
    'operations-admin.js',
    /* One-Button Publisher FE (2026-10-05, fe/publisher-compose-ui): CEO compose
       surface, mounts in the vault admin area only. Admin-gated at mount. */
    'publisher.js',
    /* Federal Reserve frontend (2026-10-04): monetary policy dashboard —
       Bank is retail, Reserve is monetary; they belong together on /bank. */
    'reserve.js'
  ],
  'bundle-economy': [
    /* /economy — Run the Economy. */
    'economy.js',
    /* A1 home (2026-10-05): /economy Price-Index Home coordinator.
       economy-home.js stages the #pf-inflation-* mount divs in DOM order
       BEFORE inflation-tracker.js runs, so the self-mounting widgets land
       instead of silent no-op. */
    'economy-home.js',
    /* UX COMBINATION PLAY 3 (2026-10-06, fe/ux-news-combos): news-cycle
       combos engine — CPI spike + Robbery Report poster triggers, War Report
       order candidates. Must load before inflation-tracker.js so the spike
       buttons read the engine at render time. Zero XP. */
    'ux-news-combos.js',
    /* A1 (2026-10-05): the people's CPI — community-reported prices.
       Self-mounts into #pf-inflation-checkin / #pf-inflation-board /
       #pf-inflation-trends; silent no-op elsewhere. Zero XP. */
    'inflation-tracker.js',
    /* Receipt uploads v1 (2026-10-05, fe/receipt-uploads): optional receipt
       photo step in the check-in flow (attach-at-check-in only), My receipts
       history, and the reviewer surface (orientation → calibration quiz →
       assigned queue). Listens for inflation-tracker's 'pf:price-reported'
       event. Zero XP. Kills: ?pf_off=receipt_uploads. */
    'receipt-uploads.js',
    /* W4 A4 (2026-10-05): FRED /economy deepening — Fed-watch cards (S-05),
       housing context (S-07), official trend line (S-14), wage-vs-CPI gap
       (M-01), Sahm-rule recession watch (S-26). Self-mounts after the A1
       trends widget on /economy only; silent no-op elsewhere. Read-only
       official data, zero XP. Kills: ?pf_off=economy-fred (master) or
       fed-watch | housing-context | official-trend | wage-gap | sahm. */
    'fred-economy.js',
    /* FRED Everywhere Phase 1 (2026-10-05): the official macro context rail
       beside the People's Price Index — inflation family + earnings + cost
       of money. Self-mounts after #pf-inflation-trends on /economy only;
       silent no-op elsewhere. Read-only official data, zero XP.
       Kill: ?pf_off=economy-fred-rail (master ?pf_off=economy-fred). */
    'fred-macro-rail.js',
  ],
  /* 2026-10-06 (fe/blossom-s4): /peoples-cpi — the public People's Price
     Index (spec peoples-cpi-public-20261006.md). Self-mounting silo
     (games/peoples-cpi.js renders into #pf-peoples-cpi); silent no-op
     elsewhere. Read-only JSONP, zero XP. Kill: ?pf_off=peoples-cpi. */
  'bundle-peoples-cpi': [
    'peoples-cpi.js'
  ],
  /* 2026-10-06 (fe/teardown-fund, WS-10): /fund — THE PROPAGANDA FUND, the
     treasury (teardown PART 2 §10 on PF.patterns: P1 hero, P4 raised/goal
     strip, P7 allocation + burn ledgers, P5 ring recognition, P6 action
     bar). Figures stay gated on News Desk/Brand sign-off (FUND.verified);
     unverified → fail-closed empty-honest. Kill: ?pf_off=fund. */
  'bundle-fund': [
    'propaganda-fund.js'
  ],
  'bundle-warchest': [
    /* Movement Finance (games/movement.js) — mounted on /war-chest AND,
       since BLOSSOM M3 (2026-10-06), on /ventures as the "Movement Funds"
       section (loader ships this bundle for isVentures too). */
    'movement.js'
  ],
  'bundle-ventures': [
    /* /ventures — Joint Ventures. */
    'ventures.js'
  ],
  'bundle-events': [
    /* /events — Boots on the Ground. */
    /* 2026-10-05 (fe/master-calendar): the War Calendar — master calendar
       silo, first on /events. Kill ?pf_off=mastercal. */
    'master-calendar.js',
    /* 2026-10-06 (fe/war-timeline, PLAY 5): the War Timeline — mission-board
       timeline aggregating every time-bound thing (events, governance
       closes, prediction locks, streak resets, season end, daily orders).
       Mounts on /events right after the month grid. Kill ?pf_off=wartimeline. */
    'war-timeline.js',
    'irl.js',
    /* 2026-10-05 (fe/events-move): Town Hall Tracker moved from Political HQ
       (was fe/townhall-tracker's bundle-hq slot) to /events. Mounted by
       pages/page-mount.js PAGE_ORDERS['pf-events']; kill ?pf_off=townhall. */
    'townhall.js',
    /* 2026-10-05 (fe/events-platform): new events-platform silo — listings +
       RSVP, #e=<id> detail, field-report wall, photo check-ins. Zero XP.
       Mounted by pages/page-mount.js PAGE_ORDERS['pf-events'];
       kill ?pf_off=events. */
    'events.js'
  ],
  /* 2026-10-05 (fe/events-move): /events LAZY map chunk. The protest/event
     map (civic-events.js — OSM link-outs, NO tile-map SDK, hard ban honored)
     loads on demand when its section scrolls near (loader jsLazy() +
     .pf-sec-anchor[data-bundle] placeholder injected by page-mount.js),
     15s backstop; fail-soft skeleton if the chunk fails. Keeps the initial
     /events payload at the irl+townhall weight (FITS-WITH-LAZY per the
     2026-10-05 load assessment). Never fetched on any other page. */
  'bundle-events-map': [
    /* /events — protest/event map (moved from Political HQ, fe/civic-events).
       Kill ?pf_off=civicevents — honored before the anchor is even injected. */
    'civic-events.js'
  ],
  /* 2026-10-05 (fe/liveops): /war-room — live ops pages (debate nights,
     election night, breaking events). One reusable template per event.
     Kill ?pf_off=liveops. Never fetched on any other page. */
  'bundle-warroom': [
    'liveops.js'
  ],
  /* 2026-10-06 (fe/live-event-mode, PLAY 9): LIVE EVENT MODE — fused live
     surface (live board + open calls + the wire + cell rally + countdown).
     Read-only composition of existing GET rails, zero writes, zero XP.
     Standalone bundle (like bundle-predgame): fetched only on /war-room
     and wherever a #pf-live mount div sits. Kill: ?pf_off=livemode. */
  'bundle-livemode': [
    'livemode.js'
  ],
  'bundle-warreport': [
    /* /war-report — the weekly digest. */
    'war-report.js',
    /* UX COMBINATION PLAY 3 (2026-10-06, fe/ux-news-combos): news-cycle
       combos engine — War Report order -> Daily Order candidate wiring
       (war-report.js paint() calls PF.newsCombos at render time). Zero XP. */
    'ux-news-combos.js',
    /* FRED Everywhere Phase 1 (2026-10-05): "The week in numbers" — max 7
       series, one honest sentence each + the week's curated matchup
       (department rotation). Renderable module; email wiring stays parked.
       war-report.js paint() hooks a slot with a double-mount guard.
       Read-only, zero XP. Kill: ?pf_off=war-numbers. */
    'fred-warreport.js',
    /* Wave 5B (2026-10-04): Situation Report pane, prepended into #xWarReport. */
    'theater-sitrep.js'
  ],
  /* USER DASHBOARD HUB (2026-10-07, fe/user-dashboard): /dashboard — the hub.
     One silo, one composite call. The hub routes; it never embeds. */
  'bundle-userdash': [
    'user-dashboard.js'
  ],
  'bundle-roster': [
    /* SLR roster/catalog pages — the live Efficiency Index painter. */
    'efficiency.js'
  ],
  /* 2026-10-07 (fe/data-receipt): THE RECEIPT — the politician money
     dossier (Data Products Product 1). Self-mounting silo into #pf-receipt;
     fetched only on /receipt. Read-only, zero XP for viewing; the share
     painter runs on tap only (butter rule). Kill: ?pf_off=receipt. */
  'bundle-receipt': [
    'receipt.js'
  ],
  /* 2026-10-07 (fe/ugc-dossier-builder): UGC DOSSIER BUILDER — the builder
     + published /dossier/<slug> pages + published feed. Self-mounting silo
     into #pf-dossier; fetched only on /dossier. Read-only, zero XP for
     viewing; the 1080x1350 share painter runs on tap only (butter rule).
     Kill: ?pf_off=dossier. */
  'bundle-dossier': [
    'dossier.js'
  ],
};

/* HQ bundle: civic, governance, notify-prefs mount ONLY on /political-hq
   (pages/political-hq.js) — plus Know Your Enemy (intel.js), moved here
   2026-10-03 from the homepage ACT section, plus Ally Organizations
   (nonprofits.js), added 2026-10-05, plus the legislation tracker
   (legislation.js, 2026-10-05) — bill cards with stage progress, key
   players, cell tallies, founder-only cell voting. Loaded by the footer
   loader only when #pf-political-hq is present — never on the homepage or
   other pages. */
var HQ_BUNDLES = {
  /* 2026-10-05 (fe/political-hq-optimize): bundle-hq is the CRITICAL path —
     only what first paint / the above-the-fold civic strip need. Everything
     else rides bundle-hq-deep, injected async by phq-hubs.js (below-fold
     hub silos lazy-mount on intersection anyway, so their code never needed
     to block first paint). Critical ≈ civic strip (civic.js stages
     pf-ov-civic immediately) + jobs panel (mounted by civic.js) +
     civic-duty (event listener, rides civic actions) + the hub runtime. */
  'bundle-hq': [
    /* 2026-10-05 (fe/phq-hub-nav): the section-hub runtime MUST stay first —
       it defines PF.mountHubSilos before pages/political-hq.js delegates. */
    'phq-hubs.js',
    'civic.js',
    /* Wave A5 S-13: official jobs panel (FRED UNRATE/PAYEMS), mounted by
       civic.js above the pressure-campaigns pane. */
    'phq-jobs-panel.js',
    'civic-duty.js'
  ],
  /* 2026-10-05 (fe/political-hq-optimize): DEEP chunk — below-fold hub silos.
     Loaded async by phq-hubs.js after the hub shells render; PF.phqDeepReady()
     re-mounts any hub whose silos were missing their templates at first pass.
     phq-hubs.js MUST stay first in bundle-hq (not here) — it owns the loader. */
  'bundle-hq-deep': [
    /* 2026-10-05 (fe/state-legislatures): state legislature directory. */
    'stateleg.js',
    /* 2026-10-05 (fe/legislation-tracker): bill tracker. */
    'legislation.js',
    'governance.js',
    'notify-prefs.js',
    'intel.js',
    /* 2026-10-05: Call the Shot prediction game (fe/predict-share-call) —
       bill widgets + section + SHARE YOUR CALL poster hook. */
    'predict.js',
    /* 2026-10-05 (fe/predictions-home): predictions home wiring — BALLOT hub
       slot 3.7 chrome for the CALL THE SHOT section. Decorates #pf-predict at
       runtime; fail-soft without predict.js. */
    'predict-home.js',
    /* Ballot Countdown Cards (2026-10-05): Forged-for-You ballot drafts tray
       + phq-ballot forge/share/pledge loop. Kill ?pf_off=ballotcd. */
    'ballot-countdown.js',
    /* Ally Organizations directory (fe/nonprofits-directory, 2026-10-05). */
    'nonprofits.js'
  ]
};

var ALL = {};
Object.keys(SECTIONS).forEach(function (k) { ALL[k] = SECTIONS[k]; });
Object.keys(HQ_BUNDLES).forEach(function (k) { ALL[k] = HQ_BUNDLES[k]; });

/* COMMAND DASHBOARD (2026-10-05, fe/command-shell): shell + request infra for
   the /command page. Sources live in v1.4.3/command/ (NOT v1.4.3/games/), so
   the "every game file in exactly one bundle" enforcement below never sees
   them. bundle-command is a STANDALONE page bundle — NEVER homepage: the
   HOMEPAGE_EXCLUDE check fails the build if any command file ever lands in
   bundle-sec1 or bundle-home. */
var COMMAND_ROOT = path.join(__dirname, '..', 'v1.4.3', 'command');
var COMMAND_FILES = ['00-shell.js', '01-request.js', '02-registry.js'];
ALL['bundle-command'] = COMMAND_FILES;
var COMMAND_BUNDLE_ROOT = { 'bundle-command': COMMAND_ROOT };

/* Homepage exclusion: command-dashboard files must NEVER ship in the
   homepage critical path (bundle-sec1) or the homepage lazy bundle
   (bundle-home). */
['bundle-sec1', 'bundle-home'].forEach(function (b) {
  SECTIONS[b].forEach(function (f) {
    if (COMMAND_FILES.indexOf(f) !== -1) fail('command file ' + f + ' in homepage bundle ' + b);
  });
});

function fail(msg) { console.error('BUNDLE FAIL: ' + msg); process.exit(1); }

/* Every game .js file must live in exactly one page or HQ bundle — or in
   GLOBAL_CHROME, which ships via build/bundle-core.js (pages/bundle-pages.js
   loads on every v2 page) instead of a page bundle. */
var allFiles = fs.readdirSync(ROOT).filter(function (f) { return f.slice(-3) === '.js'; });
/* Every game .js file must live in exactly one page or HQ bundle — except the
   three SLIM_DUP bundles above, which intentionally re-list silos from
   bundle-home (the loader fetches slim INSTEAD of bundle-home, never both). */
var SLIM_DUP = ['bundle-arcade-h', 'bundle-cells-h', 'bundle-create-h', 'bundle-markets', 'bundle-battles'];
/* Shared engines intentionally registered in exactly two page bundles.
   ux-news-combos.js (UX Combination Play 3, CEO 2026-10-06): pure engine, no
   self-mount — CPI-spike + Robbery-Report triggers need it in bundle-economy
   (before inflation-tracker.js); War Report order-candidate trigger needs it
   in bundle-warreport. Both call sites guard on window.PF.newsCombos, so the
   ~7KB minified duplication is the deliberate cost of keeping both surfaces
   live. Any other file in two bundles is still a build failure. */
var SHARED_ENGINES = ['ux-news-combos.js'];
var bundled = [];
var sharedSeen = {};
Object.keys(ALL).forEach(function (b) {
  if (SLIM_DUP.indexOf(b) !== -1) return; /* see note above */
  ALL[b].forEach(function (f) {
    if (bundled.indexOf(f) !== -1) {
      if (SHARED_ENGINES.indexOf(f) !== -1 && !sharedSeen[f]) { sharedSeen[f] = 1; bundled.push(f); return; }
      fail('file in two bundles: ' + f);
    }
    bundled.push(f);
  });
});
/* Dead code, intentionally excluded from every bundle:
   - bank.js superseded by peoplesbank.js.
   - casino.js RETIRED 2026-10-05 (Redistribution Layer Phase A): unmounted
     from the /arcade page order and the manifest; the file stays in repo
     (history). Its ?pf_off=casino kill-switch is vestigial — not rewired.
   - 2026-10-03 homepage slimming consolidated daily-drop, daily-fire,
     boost-raid, media-nuke, video, amplify, archive, bounties, assist into
     other silos — their files are being deleted; the build must not fail
     on their absence (or their presence, mid-migration). */
var DEAD = ['bank.js', 'casino.js', 'daily-drop.js', 'daily-fire.js', 'boost-raid.js',
  'media-nuke.js', 'video.js', 'amplify.js', 'archive.js', 'bounties.js',
  'assist.js'];
/* 2026-10-06 (fe/homepage-decondense): these silos ship ONLY via the slim-dup
   bundles for their dedicated pages (never in bundle-home) — creator-guess,
   daily-interrogation, billionaire-supervillain, slr-match-quiz, infighting
   via bundle-arcade-h (/arcade); cells + cell-first-hour via bundle-cells-h
   (/cells); poster-forge + poster-forge-political + feed via
   bundle-create-h (/create). Their homepage teaser counterparts
   (*-teaser.js) live in bundle-home instead. Excluded from the
   unbundled-file gate like SLIM_DUP. */
var SLIM_ONLY = ['creator-guess.js', 'daily-interrogation.js',
  'billionaire-supervillain.js', 'slr-match-quiz.js', 'infighting.js',
  'cells.js', 'cell-first-hour.js', 'poster-forge.js',
  'poster-forge-political.js', 'feed.js'];
/* Global chrome: notify.js (header bell) + flash-siren.js (A2 site-wide siren
   banner) are bundled by build/bundle-core.js into pages/bundle-pages.js —
   intentionally excluded from page bundles. */
var GLOBAL_CHROME = ['notify.js', 'flash-siren.js',
  /* ENGAGE-A #2 (2026-10-05): reactions.js — cross-page micro-reactions,
     bundled into pages/bundle-pages.js (every v2 page) via bundle-core.js. */
  'reactions.js',
  /* FRED Everywhere Phase 2 (2026-10-05): the three user modeling tools —
     fred-stackem.js (Stack 'Em), fred-explain.js (explainer),
     fred-receipt.js (Receipt check). They ship via build/bundle-core.js as
     the lazy core/bundle-fred-tools.js chunk (non-money pages) and inside
     core/bundle-money.js (money page) — intentionally excluded from page
     bundles. */ 
  'fred-stackem.js', 'fred-explain.js', 'fred-receipt.js'];
var unbundled = allFiles.filter(function (f) {
  return bundled.indexOf(f) === -1 && f.indexOf('bundle-') !== 0 &&
    DEAD.indexOf(f) === -1 && SLIM_ONLY.indexOf(f) === -1 &&
    GLOBAL_CHROME.indexOf(f) === -1;
});
if (unbundled.length) fail('unbundled game files: ' + unbundled.join(', '));

/* Inner-script syntax gate (2026-10-05): widget silos stage <template> HTML
   containing inner <script> blocks inside template literals. node --check
   only sees the OUTER file — the inner script the browser receives exists
   only after template-literal escape processing, and a SyntaxError there
   kills the whole widget at runtime (MORNING BRIEFING + Solidarity Draw,
   2026-10-05). Check every shipped silo's inner scripts BEFORE bundling. */
try {
  cp.execFileSync(process.execPath,
    [path.join(__dirname, '..', 'scripts', 'check-inner-scripts.js')]
      /* bundle-command silos live under v1.4.3/command/, not v1.4.3/games/. */
      .concat(bundled.map(function (f) {
        return path.join(ALL['bundle-command'].indexOf(f) !== -1 ? COMMAND_ROOT : ROOT, f);
      })),
    { stdio: 'inherit' });
} catch (e) { fail('inner <script> syntax check failed'); }

/* Resolve terser: local node_modules first, then global, then give up. */
function terserBin() {
  var local = path.join(__dirname, '..', 'node_modules', '.bin', 'terser');
  if (fs.existsSync(local)) return local;
  try { cp.execSync('which terser', { stdio: 'pipe' }); return 'terser'; } catch (e) {}
  return null;
}
var TERSER = DEBUG ? null : terserBin();
if (!DEBUG && !TERSER) {
  console.error('BUNDLE WARN: terser not found — writing unminified bundles. Run: npm install terser');
}

var totalRaw = 0, totalOut = 0;
Object.keys(ALL).forEach(function (name) {
  var files = ALL[name];
  var out = [];
  out.push('/* PF v1.4.3 ' + name + '.js — concatenated bundle, generated by build/bundle.js.');
  out.push('   DO NOT EDIT. Regenerate with: node build/bundle.js [--debug]');
  out.push('   Contains: ' + files.join(', '));
  out.push('   Each silo keeps its own PF.skip() kill switch (?pf_off=<silo>). */');
  files.forEach(function (f) {
    var p = path.join(COMMAND_BUNDLE_ROOT[name] || ROOT, f);
    if (!fs.existsSync(p)) fail('missing file: ' + f);
    var src = fs.readFileSync(p, 'utf8');
    out.push('\n/* ===== ' + f + ' ===== */');
    out.push(src);
    /* Semicolon guard: ensure files can't bleed into each other. */
    out.push(';');
  });
  var dest = path.join(ROOT, name + '.js');
  var raw = out.join('\n');
  totalRaw += raw.length;
  var final = raw;
  if (TERSER) {
    try {
      final = cp.execSync(TERSER + ' --compress --mangle --toplevel', {
        input: raw, maxBuffer: 100 * 1024 * 1024
      }).toString();
    } catch (e) {
      console.error('BUNDLE WARN: terser failed on ' + name + ' — writing raw. ' + (e.message || e));
      final = raw;
    }
  }
  fs.writeFileSync(dest, final);
  totalOut += final.length;
  var bytes = fs.statSync(dest).size;

  /* Validate: node --check + new Function parse. */
  try {
    cp.execSync('node --check ' + dest, { stdio: 'pipe' });
  } catch (e) { fail(name + ' failed node --check'); }
  try {
    new Function(fs.readFileSync(dest, 'utf8'));
  } catch (e) { fail(name + ' failed new Function parse: ' + e.message); }

  var saved = raw.length ? Math.round((1 - final.length / raw.length) * 100) : 0;
  console.log(name + '.js: ' + files.length + ' files, ' + (bytes / 1024).toFixed(1) +
    ' KB (' + saved + '% smaller than raw) — OK');
});
console.log('All game bundles built and validated.' +
  (totalRaw ? ' Total: ' + (totalRaw / 1024).toFixed(0) + ' KB raw -> ' +
  (totalOut / 1024).toFixed(0) + ' KB shipped.' : ''));
