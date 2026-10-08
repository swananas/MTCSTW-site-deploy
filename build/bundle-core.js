#!/usr/bin/env node
/* build/bundle-core.js — Concatenate v1.4.3 core + page files into bundles.
 *
 * WHY: the footer loader was fetching 15 core files + 5 page files as 20
 * sequential blocking requests (async=false). Concatenation in loader order
 * is behavior-identical (order preserved) and cuts initial requests 23 -> 4.
 *
 * M34 (2026-10-03): core/07-slr-db-data.js (173KB raw, 41.6KB gzip — 71% of
 * the old bundle-core) NO LONGER ships in core/bundle-core.js. It lives in
 * core/bundle-core-slr.js instead: the identical core composition plus the
 * snapshot in the same position. The footer loader
 * (loader/footer_v143_final.html) picks bundle-core-slr.js on pages that
 * mount roster consumers (homepage, /arcade, /create, Creator HQ, SLR
 * roster/catalog) and the slim bundle-core.js everywhere else (/bank,
 * /economy, /war-chest, /ventures, /events, /war-report, /political-hq,
 * /cells never read the DB). Synchronous PF.ROSTER / PF.slrAll() consumers
 * keep working unchanged on SLR pages; on slim-core pages the DB loads on
 * demand via PF.ensureSLRDB() (core/07-slr-db.js) — promise-cached, deduped,
 * fails gracefully to [].
 *
 * SAFETY:
 * - 07-slr-db.js ownBase() matches 'bundle-core' in script src — also matches
 *   'bundle-core-slr.js' (substring), so the lazy data URL resolves on both.
 * - pwa/install.js pwaBase() matches any '/v1.4.3/' + 'MTCSTW-site-deploy'
 *   script — works with both bundle names.
 * - Kill switches (?pf_off=<silo>) are by silo name, not filename — preserved.
 * - Page files guard on DOM presence (getElementById checks) — safe to concat.
 *
 * Usage: node build/bundle-core.js [--debug]
 * Output: v1.4.3/core/bundle-core.js, v1.4.3/core/bundle-core-slr.js,
 *         v1.4.3/pages/bundle-pages.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var V143 = path.join(__dirname, '..', 'v1.4.3');
var DEBUG = process.argv.indexOf('--debug') !== -1;

/* The slim core composition. bundle-core-slr (below) = this list plus the
   173KB SLR snapshot, for pages that mount roster consumers. */
var CORE_FILES = [
  'core/00-bus.js',
  /* teardown patterns (WS-0, 2026-10-06): the 8-pattern brand library —
     PF.patterns render helpers (pure HTML strings, zero backend, zero XP,
     fail-open, no writes). Second: needs nothing but the PF bus (00-bus),
     and workstream modules (notably 32-hubhome.js) grab PF.patterns at
     EVAL time — anything ordered before this silently no-ops when patterns
     is absent. Every bundle that ships core includes it, so "last" buys
     nothing and "early" keeps load-time consumers alive.
     Kill: ?pf_off=patterns. */
  'core/33-patterns.js',
  'core/07-slr-db.js',
  /* LIVE STANDINGS (2026-10-07, CEO directive): weekly fan-vote tallies —
     PF.voteStandings. Live pull (public results action) with 8-min cache,
     pf-vote-live re-render event, zero XP, fail-soft. After slr-db (its
     companion SLR data rail); needs only the bus (00-bus) + PF_BACKEND_URL. */
  'core/43-vote-standings.js',
  'core/03-global.js',
  /* wave-live-rails (2026-10-05): site_config client — key dates, tuning
     knobs, small facts. Early: other modules read through PF.siteConfig. */
  'core/site-config.js',
  /* Synergy-1 attribution (2026-10-05): the ONE reusable credit component
     (PF.credit). Early — news-top, macro-gallery, and all later surfaces
     render their credit lines through it. */
  'core/pf-credit.js',
  /* wave-live-rails (2026-10-05): Top Stories rail client — one shared
     helper (PF.newsTop) so every section renders the same news cache. */
  'core/news-top.js',
  /* NEWS+STATS (2026-10-06, CEO directive): stats-resolver PF.newsStats —
     every news surface carries live figures from our own data machine.
     Right after news-top: it hooks PF.newsTop.render to wire strips into
     every rail (briefing, Political HQ, homepage). Display only, zero XP,
     fail-open. Kill: ?pf_off=newsstats. */
  'core/34-newsstats.js',
  /* creator-stats (2026-10-05): unified stats reader — PF.creatorStats.
     After 03-global (PF_BACKEND_URL); lazy, no load-time DOM/DB dependency. */
  'core/creator-stats.js',
  'core/14-auth.js',
  /* Pod 4 (2026-10-05): "Sign in with Bluesky" OAuth link card. After
     14-auth (needs PF.authPost/authGetJSONP + requireCallsign). */
  'core/28-bsky-link.js',
  'pwa/install.js',
  'core/04-ledger.js',
  'core/05-tally.js',
  'core/08-dopamine.js',
  /* UGC dopamine layer (CEO directive, 2026-10-06): celebration moments,
     quorum progress bars, contributor streaks, TOP HANDS spotlight strip,
     leaderboard pulses, stacked-leg apex celebrations. Cross-cutting hooks
     (bounty board, CPI price form, pledge wall) — core so every v2 page
     gets it. Fail-soft, DOM-fallback when the dopamine backend isn't live.
     Kill: ?pf_off=ugcdop. */
  'core/ugc-dopamine.js',
  /* CartLens borrows for the UGC dopamine layer (CEO directive, 2026-10-06):
     SCOUT badge for scout-priority bounties + "Check my photo" parse-assist
     hook on photo/price claims. Hooks the bounty board via MutationObserver
     only — does not modify the board's code. Fail-soft. Kill: ?pf_off=ugccartlens. */
  'core/ugc-cartlens.js',
  'core/09-referral.js',
  /* R26 (2026-10-04): shared power-up/shield inventory chip. Core so every
     page bundle can mount it via PF.mountInventoryChip. */
  'core/23-inventory.js',
  'core/10-convert.js',
  'core/11-xpledger.js',
  'core/12-notify.js',
  'core/13-flow.js',
  'core/15-seo.js',
  'core/campaign-data.js',
  'core/17-nuke-strip.js',
  'core/16-footer.js',
  /* crossnav: persistent 9-page cross-link strip + page CTAs (all pages). */
  'core/19-crossnav.js',
  /* nextop (S4, 2026-10-04): context-aware NEXT OP card, in-flow above the
     footer chrome on every page. Last: mounts before the footer element,
     so the chrome strips (crossnav/16-footer) sit below it. */
  'core/20-nextop.js',
  /* hud (Cohesion P0, 2026-10-06): persistent progress marker — callsign +
     rank, XP-today ring, streak — with the YOUR CAMPAIGN 5-phase strip on
     tap. After nextop (both are journey chrome); fixed-position, no footer
     dependency. */
  'core/30-hud.js',
  /* pillars (Four-pillar spine, 2026-10-06, CEO directive): the one-click
     action bar — SPREAD / DATA / ACT / ORGANIZE — mounted inside the HUD's
     YOUR CAMPAIGN strip, plus the adventure-path chooser (soft paths,
     device-local) that reorders the buttons, flavors the strip headline,
     and biases the Next Move ladder via PF.pillars.biasOps(). After the HUD
     (extends it; never rebuilds it). FRONTEND-ONLY, ZERO NEW XP. */
  'core/31-pillars.js',
  /* command search (PLAY 8, 2026-10-06): unified pillar-aware search across
     prices/creators/events/news/products/bounties — trigger in the HUD bar,
     command-palette overlay, Intel Card results grouped by pillar. After
     pillars (both extend the HUD; never rebuild it). FRONTEND-ONLY,
     ZERO NEW XP, no writes. Kill: ?pf_off=search. */
  'core/32-search.js',
  /* hubhome (User hub as true homepage, 2026-10-06, CEO directive): the
     homepage becomes the recognized user's campaign hub — YOUR CAMPAIGN
     hero (stats, Next Move, orders, cell, pillar bar, War Report teaser)
     for device-local callsigns; the public landing is untouched for
     anonymous visitors. Composes the HUD + pillars; duplicates neither.
     FRONTEND-ONLY, ZERO NEW XP. Kill: ?pf_off=hubhome */
  'core/32-hubhome.js',
  /* wins-echo (PLAY 10, 2026-10-06, CEO directive): the win-event bus —
     device-local recognition feed (cell-war victories, filled bounties,
     poster shares/deploys) rendered as a WINS strip in the hub hero and
     injected into the cell feed. After hubhome (its consumer). Zero XP,
     fail-open everywhere. Kill: ?pf_off=wins */
  'core/33-wins.js',
  /* allfronts (2026-10-04): ALL FRONTS operation banner — fixed-top strip
     while an operation is live or launching within the hour. */
  'core/21-allfronts.js',
  /* routemarch (S1, 2026-10-04): daily guided-circuit strip — STOP n OF 4
     + claim button on today's route stop pages. Last: mounts before the
     footer element, alongside nextop. */
  'core/22-routemarch.js',
  /* squadjoin (R19, 2026-10-04): post-claim "NOW GET A SQUAD." interstitial. */
  'core/22-squadjoin.js',
  /* rites (ENLISTED, 2026-10-05): post-claim enlistment ceremony (r0 claim
     arbitration). ORDER: must follow 22-squadjoin.js — both listen for
     'pf-callsign-claimed' with a 1200ms beat, and squadjoin's listener must
     register first so its beat sees r0='pending' and polls to a verdict. */
  'core/rites.js',
  /* first-minute (Spec 2, 2026-10-05): anonymous homepage first-60s mission.
     Page-conditional (self-gates on the #pf-v2 homepage shell + no
     callsign), like 22-routemarch.js — bundled in core, never shown off-page. */
  'core/24-first-minute.js',
  /* commend (W5-7, 2026-10-04): Battle Commendations — ticker-item kudos
     buttons + daily progress chip + standalone commend-a-callsign form. */
  'core/commend.js',
  /* oparc (W5-10, 2026-10-04): operation arc reader — PF.opArc(), no DOM. */
  'core/oparc.js',
  /* read-xp (read/create XP, 2026-10-05): article reader (visibility-aware
     heartbeats + comprehension quiz), Ammo Finder CITE THIS decorator,
     Content Bank composer, poster-share proof capture. Self-mounts only
     on explicit anchors (#pf-readxp / #pf-readxp-bank); decorates Top
     Stories surfaces and Ammo Finder cards via MutationObserver when
     those dependencies are present. Fail-soft everywhere. */
  'core/read-xp.js',
  /* dead-drop (A1, 2026-10-05): daily hidden XP cache. Riddle card injects
     into the Morning Briefing (#xBrief); tappable cache widget renders ONLY
     on the server-supplied hidden page, mounted above the footer. The claim
     POST validates server-side; the page is never hardcoded client-side.
     Was a dead file — written but never bundled. Kill: ?pf_off=deaddrop. */
  'core/22-dead-drop.js',
  /* claim-cta (Cohesion §3, 2026-10-05): shared non-blocking callsign claim
     CTA — PF.claimCTA / PF.mountClaimCTA. After 03-global (PF.requireCallsign
     + the delegated claim tap handler). Kill: ?pf_off=25-claim-cta. */
  'core/25-claim-cta.js',
  /* callsign-recovery (CEO directive, 2026-10-06): lost-device recovery —
     PF.openCallsignRecovery / PF.openRecoveryIssue / PF.recoverLinkHTML /
     PF.mountRecoveryEntry + the delegated recovery taps. After 25-claim-cta
     (claim prompts embed PF.recoverLinkHTML). Kill: ?pf_off=29-callsign-recovery. */
  'core/29-callsign-recovery.js',
  /* crowd-credit (Cohesion §2, 2026-10-05): PF.crowdCredit — aggregated
     contributor counts with mandatory vintage labels for data outputs.
     Kill: ?pf_off=26-crowd-credit. */
  'core/26-crowd-credit.js',
  /* FRED Everywhere Phase 1 (2026-10-05): window.PFFred — the single
     honest-render toolkit for every FRED surface (citations, staleness
     badges, sparklines, tap sheets, honest reads). Core so money, economy,
     war-report, briefing, and academy surfaces all share it. */
  'core/fred-shared.js',
  /* freshness (Cohesion §4, 2026-10-05): PF.freshBadge / PF.degradedVintage /
     PF.honestZero — LIVE badges only on <=15-min-fresh data, automatic label
     degradation, honest zero states. Kill: ?pf_off=27-freshness. */
  'core/27-freshness.js',
  /* PLAY 6 (UX Combination Plays Wave 2, 2026-10-06): YOUR WAR CHEST — the
     unified money view (personal balance, bounty earnings + surge, liberty
     bonds, cause-pool contributions, per-cell chests, War Bond movement
     aggregate). Read-only aggregation of existing GET endpoints; fail-open
     self-mounts on #pf-warchest-card / #pf-warchest-view / #pf-warchest-cell.
     Kill: ?pf_off=warchest (master) · warchest-card · warchest-full ·
     warchest-cell. */
  'core/warchest-view.js',
  /* teardown patterns was the LAST entry — moved to second (right after
     00-bus.js, 2026-10-06): 32-hubhome.js grabs PF.patterns at eval time and
     returns early when absent, so "last" silently killed the whole homepage
     hub in the shipped bundle (Google-QC: the anon hero CTA never fired). */
  /* PLAY 4 (UX Combination Plays Wave 2, 2026-10-06): notification trigger
     layer — PF.triggers.emit(event, params) client dispatcher + per-category
     opt-in UI (Alert Triggers pane on Political HQ). Fail-open everywhere;
     zero XP. Kill: ?pf_off=triggers (or ?pf_off=36-triggers). */
  'core/36-triggers.js',
  /* share-in (CEO directive, 2026-10-06): ?sharein=<url> deep link + PWA Web
     Share Target (GET) inbound draft composer — PF.shareIn. Site-wide: the
     share target can land on ANY page, so this lives in the core bundle,
     not a lazy chunk. Zero XP by design, device-local drafts only, no
     backend writes. Kill: ?pf_off=35-sharein. */
  'core/35-sharein.js',
  /* wild-finds (CEO directive, 2026-10-06): WILD FINDS folded into the
     bounty type taxonomy — PF.wildFinds registry (mirrors backend
     WILDFIND_TYPES), type picker, [data-pf-wildfind] launchers, Daily
     Orders missions. After 35-sharein (its photo picker reads the
     registry). Zero new XP. Kill: ?pf_off=wildfinds. */
  'core/36-wildfinds.js',
  /* one-prompt (CEO directive, 2026-10-06): THE ONE PROMPT first-run card +
     PF.popupQueue site-wide popup backstop (one overlay at a time, 3/session
     auto-fire budget) + inline first-moves checklist. Last in core: it
     orchestrates other modules' overlays, so it loads after them. Zero new
     XP, zero backend writes. Kill: ?pf_off=one-prompt. */
  'core/37-one-prompt.js',
  /* mobile-nav-trim (Homepage V3 "Unclunk", CEO directive 2026-10-07 ~11:33
     CDT): cap Squarespace's mobile hamburger menu at 5 top-level items max
     — IN CODE, not a Squarespace hand-step. Site chrome: also ships in
     bundle-footer-chrome (crossnav precedent). Last: touches only the nav
     list, no consumer deps. Kill: ?pf_off=42-mobile-nav-trim. */
  'core/42-mobile-nav-trim.js'
];

/* 2026-10-05 (fix/money-minified-rebuild): money suite lazy chunk. The 10
   money modules (was in CORE_FILES; +29KB weight waiver on the core bundle)
   now ship as minified core/bundle-money.js, loaded on demand by
   core/money-chunk-loader.js on #pf-money / #pf-political-hq only.
   Order preserved from the old core position (wall-of-shame first). */
var MONEY_FILES = [
  'core/wall-of-shame.js',
  /* THE ROBBERY REPORT (fe/robbery-report-r2, 2026-10-06): curated margin
     reverse-engineer figures (data + render). Rides the money chunk so it
     mounts on the /follow-the-money page (Follow the Money). Kill: ?pf_off=robreport. */
  'core/robreport-data.js',
  'core/robreport.js',
  /* SEC EDGAR live rail (be/edgar-rail + fe/edgar-live, 2026-10-06): live
     filing-validation pills for Robbery Report cards. Rides the money
     chunk with the report. Kill: ?pf_off=edgarlive. */
  'core/edgar-live.js',
  'core/money-tab.js',
  'core/money-vote-card.js',
  'core/ledger-list.js',
  'core/boycott-list.js',
  'core/corp-card.js',
  'core/money-page.js',
  'core/money-trades.js',
  'core/money-pac-alerts.js',
  'core/money-macro.js',
  /* FRED Everywhere Phase 1 (2026-10-05): the "economy they're governing"
     strip for the Follow the Money tab — policy transmission framing. */
  'core/fred-governing.js',
  /* FRED Everywhere Phase 2 (2026-10-05): Tool 1 "Stack 'Em" — the full
     comparison builder (MACRO section) + War Report curated + Academy
     guided modes. Self-mounts by DOM presence outside the money suite. */
  'games/fred-stackem.js',
  /* FRED Everywhere Phase 2 (2026-10-05): Tool 2 explainer — embedded in
     Follow the Money ("WHAT'S THIS COSTING YOU?"). Self-mounts by DOM
     presence on economy / war-report / briefing pages. */
  'games/fred-explain.js',
  'core/macro-share.js',
  'core/macro-gallery.js',
  'core/money-deep8.js',
  /* Engagement build D item #3 (2026-10-05): weekly ritual calendar rail.
     Same file as the homepage slot (games bundle) — self-mounts by DOM
     presence (#pf-money -> rail). Rendered directly, no template staging. */
  'games/ritual-calendar.js'
];

/* KARL query layer (fe/karl-page, 2026-10-07, Data Product 5): the /karl
   front door — self-mounting core/karl-page.js. Ships as the minified
   core/bundle-karl.js lazy chunk, loaded on demand by the footer JS_GAMES
   routing only when #pf-karl is present. Zero weight on every other page.
   Kill: ?pf_off=karl (honored before the chunk loads). */
var KARL_FILES = [
  'core/karl-page.js'
];

/* WHO OWNS YOUR TOWN (fe/town-page, 2026-10-07, Data Product 2): lazy chunk.
   Self-mounting silo (core/town-page.js -> #pf-town), fetched only on /town
   via the footer loader's isTown branch. RESTORED fe/ugc-town-report: the
   entry was dropped from this file by a later merge. Kill: ?pf_off=town. */
var TOWN_FILES = [
  'core/town-page.js'
];

/* UGC TOWN REPORT BUILDER (fe/ugc-town-report, 2026-10-07): lazy chunk.
   Self-mounting silo (core/town-report.js -> #pf-town-report), fetched only
   on /town-report via the footer loader's isTownReport branch. Zero weight
   on every other page. Kill: ?pf_off=townreport. */
var TOWNREPORT_FILES = [
  'core/town-report.js'
];

/* KARL COMPANION (fe/karl-companion, 2026-10-07): the site's voice — floating
   contextual assistant on every page. Lazy chunk, loaded sitewide after idle
   by the footer loader (jsCompanion). Local site index answers instantly;
   the Karl AI worker handles deep questions. Zero critical-path weight.
   Kill: ?pf_off=karl-companion. */
var COMPANION_FILES = [
  'core/karl-companion.js',
  /* KARL MUSE (fe/karl-muse, 2026-10-07): the muse engine — story memory,
     user-state reading, next-move rules, taste model, muse worker context.
     Same lazy chunk, same kill story. */
  'core/karl-muse.js'
];

/* FRED Everywhere Phase 2 (2026-10-05): the three user modeling tools —
   Tool 1 Stack 'Em, Tool 2 explainer, Tool 3 Receipt check. Lazy chunk
   (core/bundle-fred-tools.js) for non-money pages; the money page ships
   its two tools inside the money chunk instead. */
var FRED_TOOLS_FILES = [
  'games/fred-stackem.js',
  'games/fred-explain.js',
  'games/fred-receipt.js'
];

var BUNDLES = {
  'core/bundle-core': CORE_FILES.slice(),
  /* 2026-10-05 (fix/money-minified-rebuild): lazy money chunk — NOT in the
     critical path. Fetched only when a money surface is present. */
  'core/bundle-money': MONEY_FILES.slice(),
  /* KARL query layer (fe/karl-page, 2026-10-07): lazy Karl chunk — NOT in
     the critical path. Fetched only when #pf-karl is present (/karl). */
  'core/bundle-karl': KARL_FILES.slice(),
  /* WHO OWNS YOUR TOWN (fe/town-page): lazy chunk — NOT in the critical
     path. Fetched only on /town. */
  'core/bundle-town': TOWN_FILES.slice(),
  /* UGC TOWN REPORT BUILDER (fe/ugc-town-report): lazy chunk — NOT in the
     critical path. Fetched only on /town-report. */
  'core/bundle-town-report': TOWNREPORT_FILES.slice(),
  /* KARL COMPANION (fe/karl-companion): lazy chunk — NOT in the critical
     path. Loaded sitewide after idle via the footer loader's jsCompanion. */
  'core/bundle-karl-companion': COMPANION_FILES.slice(),
  /* FRED Everywhere Phase 2 (2026-10-05): the three user modeling tools as
     a lazy chunk — Tool 1 Stack 'Em (curated/guided/full), Tool 2 explainer,
     Tool 3 Receipt check. Fetched only when a tool host exists (#pf-economy,
     #xWarReport, #xBrief, #pf-academy-hq) via core/fred-tools-loader.js.
     The money page does NOT use this chunk: it ships fred-stackem.js +
     fred-explain.js inside the money chunk (blocking, synchronous with
     money-page.js section mounts). No page loads both chunks; every tool
     file is idempotent (window.PF* guard) regardless. */
  'core/bundle-fred-tools': FRED_TOOLS_FILES.slice(),
  /* M34: roster pages get the identical core PLUS the snapshot, in the same
     relative position the old bundle-core used (right after 00-bus.js). */
  'core/bundle-core-slr':
    ['core/00-bus.js', 'core/07-slr-db-data.js'].concat(CORE_FILES.slice(1)),
  'pages/bundle-pages': [
    'pages/home-v2.js',
    /* 2026-10-07 Project 3 (fe/home-personalize): My HQ user-activity
       personalization (hero CTA + rank greeting, streak nudge, voted-creator
       card). Fires on #pf-v2 only; anonymous visitors get the default
       homepage untouched. Kill: ?pf_off=home-personalize. */
    'pages/home-personalize.js',
    'pages/political-hq.js',
    'pages/slr-roster.js',
    'pages/slr-catalog.js',
    'pages/page-mount.js',
    'games/notify.js',
    /* A2 flash siren: site-wide banner, self-mounting + fail-silent. Global
       chrome (every v2 page) — was a dead file at 4ce7391, never bundled. */
    'games/flash-siren.js',
    /* ENGAGE-A #2 (2026-10-05): micro-reactions on data surfaces.
       Zero XP by design (one reaction/callsign/surface/day server-side,
       aggregate counts only). Self-mounts on [data-react-surface]; global
       chrome so it works on homepage (do-meter) and /war-report alike.
       Kill: ?pf_off=reactions. */
    'games/reactions.js',
    'core/06-pinups.js',
    'core/share-image.js',
    /* 2026-10-06 share-everywhere: territory map + sitewide UGC share bars.
       Right after share-image so PFShare is registered first. */
    'core/share-everywhere.js',
    /* 2026-10-07 make-shareable-inline: the inline Studio creation panel
       (MAKE SHAREABLE on every data page — /receipt, /town, /extraction,
       /index, /karl). Right after share-everywhere so PFShare.paintAsync
       exists; every v2 page gets it (panel is page-agnostic, products
       register their own painters). Kill: ?pf_off=make-shareable. */
    'core/40-make-shareable.js',
    /* 2026-10-07 corruption-index (Product 4 of 5): THE CORRUPTION INDEX
       /index page — self-mounting into #pf-index. Leaderboard, methodology,
       tap-to-expand breakdowns, phq-index-score share cards + MAKE SHAREABLE
       per score. Zero XP. Kill: ?pf_off=corruption-index. */
    'pages/index-page.js',
    /* PHQ share posters (2026-10-05, consolidated fe/phq-share-consolidation):
       ~1.5KB lazy stub ONLY. The full painter module
       (core/share-image-phq.js, 23 painters, ~87KB) loads on the first
       share/save/paint call via the stub's script injection — the ~99% of
       visitors who never share never pay for it (Performance gate).
       Right after share-image so PFShare is registered first; the stub
       creates the PF.PHQShare facade and the module registers into it
       via PFShare.setPoster with its own retry loop. */
    'core/share-image-phq-lazy.js',
    /* 2026-10-05 (fix/money-minified-rebuild): the money suite (~65KB raw,
       10 modules) moved to the lazy core/bundle-money.js chunk (MONEY_FILES
       below) — weight waiver: +29KB over budget on the core bundle. This
       ~1.5KB loader is all that stays in core: honors ?pf_off=money before
       fetching, loads the chunk only on #pf-money / #pf-political-hq. */
    'core/money-chunk-loader.js',
    /* FRED Everywhere Phase 2 (2026-10-05): the three user modeling tools
       (~1.2KB loader, same pattern as the money chunk loader). Loads
       core/bundle-fred-tools.js only when a tool host exists (#pf-economy,
       #xWarReport, #xBrief, #pf-academy-hq). Honors ?pf_off=fred before
       fetching; fail-soft. KILL: ?pf_off=fred. */
    'core/fred-tools-loader.js',
    /* creator-recruit: shared recruiting toolbar for roster cards + catalog
       pages. Last: needs PFShare (share-image.js) + the catalog renderers. */
    'pages/creator-recruit.js',
    /* Wave 6A R5 (2026-10-04): recruit-link -> guided first hour welcome card
       for ?creator= arrivals on /request-access. Needs the SLR roster
       (core) + PF.requireCallsign (core). */
    'pages/recruit-welcome.js'
  ],
  /* DEFECT 1 (2026-10-03): /store, /privacy, /terms and every other non-v2
     page route to the v1.1.0 silo set, which carries no footer chrome — the
     DELETE MY DATA link (16-footer) and the NUKE meter / RUN MISSION bar
     (17-nuke-strip) shipped only inside bundle-core.js (v2 pages). This slim
     bundle carries just the chrome plus its minimum runtime (PF bus, backend
     URL + identity helpers, authPost) so the loader can append it to the
     v1.1.0 branch. Double-load safe on v2 pages (00-bus/14-auth/16/17 all
     guard on existing state), but the loader only requests it off-v2. */
  'core/bundle-footer-chrome': [
    'core/00-bus.js',
    'core/18-footer-deps.js',
    /* callsign-recovery (CEO directive, 2026-10-06): the delegated recovery
       taps ([data-pf-recover-cs]) must be live BEFORE any claim prompt that
       embeds PF.recoverLinkHTML (17-nuke-strip, 20-nextop) renders — legacy
       pages (/privacy, /terms) otherwise get a dead link. After 00-bus /
       18-footer-deps (PF bus + identity helpers); all other deps optional-guarded. */
    'core/29-callsign-recovery.js',
    'core/14-auth.js',
    'core/17-nuke-strip.js',
    'core/16-footer.js',
    /* crossnav: persistent 9-page strip on v1.1.0-branch pages too. */
    'core/19-crossnav.js',
    /* nextop (S4, 2026-10-04): NEXT OP card on v1.1.0-branch pages too —
       every page ends with a next action, not just v2 pages. */
    'core/20-nextop.js',
    /* allfronts (2026-10-04): operation banner on v1.1.0-branch pages too. */
    'core/21-allfronts.js',
    /* routemarch (S1, 2026-10-04): route strip on v1.1.0-branch pages too —
       stop pages like /bank and /political-hq ride this bundle. */
    'core/22-routemarch.js',
    /* commend (W5-7, 2026-10-04): commend buttons + chip on v1.1.0 pages too. */
    'core/commend.js',
    /* oparc (W5-10, 2026-10-04): PF.opArc() reader on v1.1.0 pages too. */
    'core/oparc.js',
    /* mobile-nav-trim (CEO directive 2026-10-07 ~11:33 CDT): 5-item mobile
       nav cap on v1.1.0-branch pages too — the hamburger menu is site
       chrome, same precedent as crossnav. */
    'core/42-mobile-nav-trim.js'
  ]
};

function fail(msg) { console.error('BUNDLE FAIL: ' + msg); process.exit(1); }

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

Object.keys(BUNDLES).forEach(function (name) {
  var files = BUNDLES[name];
  var out = [];
  out.push('/* PF v1.4.3 ' + name + '.js — concatenated bundle, generated by build/bundle-core.js.');
  out.push('   DO NOT EDIT. Regenerate with: node build/bundle-core.js [--debug]');
  out.push('   Contains: ' + files.join(', '));
  out.push('   Each file keeps its own PF.skip() kill switch (?pf_off=<silo>). */');
  files.forEach(function (f) {
    var p = path.join(V143, f);
    if (!fs.existsSync(p)) fail('missing file: ' + f);
    var src = fs.readFileSync(p, 'utf8');
    out.push('\n/* ===== ' + f + ' ===== */');
    out.push(src);
    out.push(';');
  });
  var dest = path.join(V143, name + '.js');
  var raw = out.join('\n');
  var final = raw;
  if (TERSER) {
    try {
      final = cp.execSync(TERSER + ' --compress --mangle --toplevel', {
        input: raw, maxBuffer: 100 * 1024 * 1024
      }).toString();
    } catch (e) {
      console.error('BUNDLE WARN: terser failed on ' + name + ' — writing raw.');
      final = raw;
    }
  }
  fs.writeFileSync(dest, final);
  var bytes = fs.statSync(dest).size;
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
console.log('Core bundles built and validated.');
