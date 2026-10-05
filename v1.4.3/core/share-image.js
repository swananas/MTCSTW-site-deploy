/* core/share-image.js  |  PF v1.4.1 | THE SHARE/SAVE COMPANION. Guarantees EVERY v2 game section carries
   KILL: ?pf_off=share-image  or  localStorage pf_disabled_v1='["share-image"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('share-image')) { return; }
  if (window.pfShareImageDone) return;
  window.pfShareImageDone = true;

  /* 2026-10-04: a no-callsign sharer gets no "FIGHTING AS" strip with zero
     warning — flag it once per page at the user-initiated share entry point
     (not in stampCallsign itself, which also runs on plain downloads). */
  var _pfNoCsWarned = false;

  /* ------------------------------------------------------------------ */
  /* Per-game poster content. (No share/save flags: the pair is          */
  /* unconditional in v1.4.1 — every game gets both buttons.)             */
  /* ------------------------------------------------------------------ */
  var REG = {
    'fan-vote': {
      title: '\u2605 FAN VOTE \u2605', tag: 'Propagandist of the Week',
      lines: ['Vote for the week\u2019s top propagandist.', 'Polls close Sunday night.', 'Results drop Monday.'],
      cta: 'VOTE NOW'
    },
    'bracket-board': {
      title: '\u2620 THE LIQUIDATION BRACKET \u2620', tag: '16 billionaires. Head-to-head.',
      lines: ['Your votes decide who gets liquidated.', 'Pick your winners. Advance the class war.'],
      cta: 'VOTE THE BRACKET'
    },
    'daily-orders': {
      title: 'DAILY ORDERS', tag: 'Today\u2019s missions from the Factory',
      lines: ['Do things. Post proof.', 'Check in daily. Stack your streak.'],
      cta: 'GET ORDERS'
    },
    'do-meter': {
      title: '\u2697 THE DO METER \u2697', tag: 'NOT FOLLOWERS. NOT LIKES. THINGS DONE.',
      /* 2026-10-05: "Goal: 5 million things." was stale — the goal is dynamic
         (starts 1,000/week, scales x1.25 per detonation — games/do-meter.js).
         Evergreen line instead; never a hard number. */
      lines: ['The network counts every thing done.', 'The weekly target climbs 25% with every detonation.'],
      cta: 'DO A THING'
    },
    /* 2026-10-03: restored — the drop consolidated into briefing.js as the
       FEATURED DROP slot, but its share-image button pair must keep working. */
    'daily-drop': {
      title: '\u2605 THE DAILY DROP \u2605', tag: 'Fresh slop, daily',
      lines: ['A new drop every day of the offensive.', 'Claim it. Share it. Spread it.'],
      cta: 'CLAIM THE DROP'
    },
    'billionaire-supervillain': {
      title: 'BILLIONAIRE OR SUPERVILLAIN?', tag: 'One quote. Two monsters. You decide.',
      lines: ['A new quote every day.', 'Billionaire or supervillain \u2014 can you tell them apart?'],
      cta: 'PLAY TODAY'
    },
    'daily-interrogation': {
      title: 'THE DAILY INTERROGATION', tag: 'One question. Every day. No mercy.',
      lines: ['Test your propaganda literacy.', 'Streak or you\u2019re a liberal.'],
      cta: 'ANSWER NOW'
    },
    'caption-combat': {
      title: 'CAPTION COMBAT', tag: 'One template. One week. Infinite psyops.',
      lines: ['Caption the template. Funniest wins.', 'New round every week.'],
      cta: 'ENTER COMBAT'
    },
    'poster-forge': {
      title: 'THE POSTER FORGE', tag: 'Make propaganda. Download it.',
      lines: ['Forge your own poster in seconds.', 'Plaster the timeline.'],
      cta: 'FORGE ONE'
    },
    'enlistment-ranks': {
      title: 'ENLISTMENT RANKS', tag: 'Every action for the machine earns XP',
      lines: ['Climb from Sympathizer to Vanguard.', 'Earn weekly Service Medals.'],
      cta: 'ENLIST NOW'
    },
    'war-bonds': {
      /* 2026-10-05: replacement copy (PR desk). The bonds are $5/$10/$25/$50 —
         "Starting at $1" was flat wrong (product-explainers §15). */
      title: '$5 \u00b7 $10 \u00b7 $25 \u00b7 $50', tag: 'WAR BONDS \u2014 FOUR TIERS. REAL CHECKOUT.',
      lines: ['Half to the machine. Half split equally among the 62 creators.'],
      cta: 'BUY WAR BONDS'
    },
    /* 6A-R7: voter-pledge poster template. civic.js registers a custom
       painter (state-stamped) via PFShare.setPoster; this REG entry is the
       generic fallback for drawPoster('voter-pledge'). */
    'voter-pledge': {
      title: 'I PLEDGED TO VOTE', tag: 'One ballot. One soldier. Zero excuses.',
      lines: ['I took the voter pledge with the Propaganda Factory.', 'Your turn. Pledge, register, show up.'],
      cta: 'PLEDGE YOURS'
    },
    /* 2026-10-05: the 'casino' REG entry is RETIRED — the casino was unmounted
       in Phase A and its share surface moved to the redist-win custom painter
       (games/casino-exits.js). The dead games/casino.js still registers its
       own custom painter via PFShare.setPoster('casino', ...), so removing
       this static entry breaks nothing. Release Eng: delete games/casino.js
       at cleanup. */
    'slr-match-quiz': {
      title: '\u2691 FIND YOUR SLR MATCH \u2691', tag: 'What kind of propagandist are you?',
      lines: ['Take the 5-question quiz.', 'Get your archetype + 3 SLR matches.'],
      cta: 'TAKE THE QUIZ'
    },
    'creator-guess': {
      title: '\u25CE GUESS THE CREATOR \u25CE', tag: '5 questions. Zero mercy.',
      lines: ['How well do you know the Sick Left Radicals?', 'New set every day. Streaks rewarded.'],
      cta: 'PLAY NOW'
    },
    'boost-raid': {
      title: '\u2694 BOOST RAID \u2694', tag: 'One target. One day. The whole network.',
      lines: ['Like. Comment. Share. Report back.', 'Today\u2019s raid target is live now.'],
      cta: 'JOIN THE RAID'
    },
    /* ---------------------------------------------------------------- */
    /* STUDIO POSTER BATCH (2026-10-05): 9 new posters, copy verbatim    */
    /* from the PR desk package (~/workspace/hidden/studio-poster-copy.md). */
    /* These REG entries are STATIC templates — the generic drawPoster   */
    /* fallback. Every poster with dynamic fields gets a custom painter  */
    /* below (registered via PFShare.setPoster) — EXCEPT 'ammo-cite',    */
    /* whose painter is owned by games/ammo.js (branch                   */
    /* fix/studio-ammo-ux); this file registers no 'ammo-cite' painter   */
    /* so the two branches merge clean. The painter fills the bracketed  */
    /* fields from PFShare.posterState and takes precedence in the       */
    /* share/save flow whenever registered.                              */
    /* Keys match each silo's canonical game id (verified by grep):      */
    /*  first-wave / ammo-cite / top-stories — no silo in tree yet (big  */
    /*    update); news rail (wave-live-rails) is in QC, Ammo Finder     */
    /*    (wave-claim-support) in build.                                 */
    /*  markets — games/markets.js Frontline Forecasts (silo 'markets'). */
    /*  gambits — games/gambits.js (silo 'gambits').                     */
    /*  draw    — games/solidarity-draw.js (silo 'draw').                */
    /*  raid    — games/supply-raid.js (silo 'raid').                    */
    /*  nuke-detonation — core/17-nuke-strip.js detonation event (the    */
    /*    rally card keeps its own 'media-nuke' gameId / 'nuke-rally'     */
    /*    REG key — untouched).                                          */
    /*  enlisted-ceremony — core/rites.js ENLISTED ceremony share (the    */
    /*    rite card itself renders via the 'enlistment-ranks' poster).   */
    /* None are in ORDER: painters ship dormant and fire only when       */
    /* their silo wires a share/save button.                             */
    /* ---------------------------------------------------------------- */
    'first-wave': {
      title: 'YOU WERE HERE WHEN IT STARTED.', tag: '',
      lines: ['First Wave founder \u2014 [CALLSIGN].'],
      cta: 'ENLIST THIS WEEK. FOUNDERS ARE FOREVER.'
    },
    'ammo-cite': {
      title: '[CITED HEADLINE]', tag: 'SOURCED. VERIFIED. WEAPONIZED.',
      lines: ['via [OUTLET] \u2014 ammo pulled from the factory\u2019s verified feeds.'],
      cta: 'JOIN THE FIGHT.'
    },
    'top-stories': {
      title: '[STORY HEADLINE]', tag: 'FROM THE NEWS RAIL \u2014 READ FIRST. SHARE SECOND.',
      lines: ['via [OUTLET] \u2014 this is what we\u2019re reading today.'],
      cta: 'JOIN THE FIGHT.'
    },
    'markets': {
      title: '[MARKET TITLE]', tag: 'READ THE BOARD. BACK THE OUTCOME.',
      lines: ['[CALLSIGN] backs [POSITION] \u2014 winners split the pool, no house cut.'],
      cta: 'JOIN THE FIGHT.'
    },
    'gambits': {
      title: '[WINNER CALLSIGN] TOOK THE POT.', tag: 'THE GAMBIT \u2014 50/50. NO HOUSE.',
      lines: ['[POT] XP on one flip. 5% armed the war chest.'],
      cta: 'JOIN THE FIGHT.'
    },
    'draw': {
      title: '[WINNER CALLSIGN] DREW THE WEEK.', tag: 'THE SOLIDARITY DRAW \u2014 FORTUNE FAVORS THE COLLECTIVE.',
      lines: ['[WINNER XP] XP to the winner \u2014 [CHEST XP] XP to the war chest. Verifiable draw, round [N].'],
      cta: 'JOIN THE FIGHT.'
    },
    'raid': {
      title: '[CALLSIGN] EXFILTRATED AT [\u00d7MULTIPLIER].', tag: 'SUPPLY LINE RAID \u2014 THE LINE CLIMBS. THE NERVE HOLDS.',
      lines: ['[PAYOUT] XP out before the collapse. The line keeps its cut for the collective.'],
      cta: 'JOIN THE FIGHT.'
    },
    'nuke-detonation': {
      title: '[TIER NAME]', tag: '\u2605 DETONATION \u2605',
      lines: ['The blast is real. [CALLSIGN] was in the Detonation Crew.'],
      cta: 'JOIN THE FIGHT.'
    },
    'enlisted-ceremony': {
      title: 'YOU HAVE A NAME.', tag: '',
      lines: ['[CALLSIGN] is enlisted. Now get a squad.'],
      cta: 'GET A SQUAD \u2192'
    }
  };
  var ORDER = ['fan-vote', 'slr-match-quiz', 'creator-guess', 'bracket-board', 'daily-orders', 'boost-raid', 'do-meter', 'daily-drop',
               'billionaire-supervillain', 'daily-interrogation',
               'caption-combat', 'poster-forge', 'enlistment-ranks', 'war-bonds'];
  var SHARE_LABEL = 'SHARE IMAGE';
  var SAVE_LABEL = 'SAVE IMAGE TO PHONE';
  /* Custom per-game poster painters: silos register an async painter
     fn(done) via PFShare.setPoster(gameId, fn). The share/save buttons
     use it instead of the generic drawPoster when present. */
  var CUSTOM = {};

  /* ------------------------------------------------------------------ */
  /* Platform detection                                                  */
  /* ------------------------------------------------------------------ */
  function isIOS() {
    try {
      return /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* Branded poster renderer (1080x1350, black/red/cream)                */
  /* ------------------------------------------------------------------ */
  function wrap(x, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function dateStr() {
    try {
      return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return ''; }
  }
  /* Spread stamp: every auto-shared poster carries the callsign and the
     creator the user is spreading for (today's boost pick, Chicago day). */
  function chiDay() {
    try {
      var n = (PF && PF.chiNow) ? PF.chiNow() : new Date();
      var y = n.getFullYear(), m = n.getMonth() + 1, d = n.getDate();
      return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    } catch (e) { return ''; }
  }
  /* The user's callsign: identity store first, PFCallsign() fallback. */
  function callsignOf() {
    var cs = '';
    try {
      var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      if (id && id.callsign) cs = String(id.callsign).toUpperCase();
    } catch (e) {}
    if (!cs) { try { cs = String((window.PFCallsign && window.PFCallsign()) || '').toUpperCase(); } catch (e) {} }
    return cs;
  }
  function spreadStamp() {
    var cs = callsignOf(), who = '';
    try {
      var b = JSON.parse(localStorage.getItem('pf_boost_v1') || 'null');
      if (b && b.creator && b.date === chiDay()) {
        var r = (PF && PF.rosterBySlug) ? PF.rosterBySlug(b.creator) : null;
        who = ((r && r.name) ? String(r.name) : String(b.creator).replace(/-/g, ' ')).toUpperCase();
      }
    } catch (e) {}
    if (cs && who) return 'FIGHTING AS ' + cs + ' \u00b7 SPREADING FOR ' + who;
    if (cs) return 'FIGHTING AS ' + cs;
    if (who) return 'SPREADING FOR ' + who;
    return '';
  }
  /* stampCallsign(cv): paint the "FIGHTING AS <CALLSIGN>" attribution strip
     on ANY canvas. Idempotent via cv._pfStamped — painters that already
     render the callsign set the flag themselves and are left alone. Every
     image that leaves the site passes through here or a caller of it. */
  function stampCallsign(cv) {
    try {
      if (!cv || cv._pfStamped) return cv;
      cv._pfStamped = true;
      var cs = callsignOf();
      if (!cs) return cv;
      var x = cv.getContext('2d');
      if (!x) return cv;
      var W = cv.width || 0, H = cv.height || 0;
      if (W < 200 || H < 200) return cv;
      var fs = Math.max(18, Math.round(W * 0.024));
      var barH = Math.round(fs * 1.9);
      x.save();
      try { x.textAlign = 'center'; x.textBaseline = 'middle'; } catch (e) {}
      x.fillStyle = 'rgba(10,10,10,0.9)';
      x.fillRect(0, H - barH, W, barH);
      x.fillStyle = '#c1121f';
      x.fillRect(0, H - barH, W, Math.max(3, Math.round(fs * 0.14)));
      x.fillStyle = '#f5ead6';
      x.font = '700 ' + fs + 'px Arial,sans-serif';
      x.fillText('FIGHTING AS ' + cs, W / 2, H - barH / 2);
      x.restore();
    } catch (e) {}
    return cv;
  }
  /* R29 (2026-10-05): subscriber-exclusive poster frame option. Paints a
     gold double frame + a "\u2605 SUBSCRIBER \u2605" tag. Drawn ONLY when the
     caller passes {frame:'subscriber'} in drawPoster opts AND the shared
     PF.isSubscriber() helper confirms subscriber status — never for
     non-subscribers, so the frame stays a genuine subscriber perk.
     tagY = baseline for the tag (varies by layout). */
  function subFrame(x, W, H, tagY) {
    var sub = false;
    try { sub = !!(PF && PF.isSubscriber && PF.isSubscriber()); } catch (e) {}
    if (!sub) return;
    x.save();
    try { x.textAlign = 'center'; x.textBaseline = 'alphabetic'; } catch (e2) {}
    x.strokeStyle = '#d4af37'; x.lineWidth = 6; x.strokeRect(4, 4, W - 8, H - 8);
    x.lineWidth = 2; x.strokeRect(13, 13, W - 26, H - 26);
    x.fillStyle = '#d4af37'; x.font = '700 28px Arial,sans-serif';
    x.fillText('\u2605 SUBSCRIBER \u2605', W / 2, tagY);
    x.restore();
  }
  /* A9 (2026-10-04): 9:16 (1080x1920) story-safe poster layout. Composes the
     same REG entry (title/tag/lines/cta) as the classic poster — REG entries
     may also set storyPre (eyebrow line, e.g. the quiz's "MY SLR MATCH IS")
     and the caller may pass opts.linkLabel for the printed link-sticker
     hint. Story-safe: 120px side margins, top/bottom ~240px kept clear of
     platform chrome. */
  function drawStoryPoster(g, linkLabel, opts) {
    var W = 1080, H = 1920;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 300;
    x.fillStyle = '#f5ead6'; x.font = '700 36px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 150;
    if (g.storyPre) {
      x.fillStyle = '#c9bfa8'; x.font = '700 44px Arial,sans-serif';
      wrap(x, g.storyPre, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 60; });
      y += 20;
    }
    x.fillStyle = '#c1121f'; x.font = '900 104px "Arial Black",Arial,sans-serif';
    wrap(x, g.title, W - 240).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 120; });
    y += 30;
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    wrap(x, g.tag, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 58; });
    y += 40;
    x.fillStyle = '#c9bfa8'; x.font = '400 38px Arial,sans-serif';
    (g.lines || []).slice(0, 5).forEach(function (t) {
      wrap(x, t, W - 280).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
      y += 14;
    });
    y += 60;
    x.font = '900 46px "Arial Black",Arial,sans-serif';
    var tw = x.measureText(g.cta).width + 110;
    x.fillStyle = '#c1121f'; x.fillRect(W / 2 - tw / 2, y - 62, tw, 100);
    x.fillStyle = '#ffffff'; x.fillText(g.cta, W / 2, y + 10);
    var stamp = spreadStamp();
    if (stamp) {
      cv._pfStamped = true; /* story poster carries its own stamp */
      y += 110;
      x.fillStyle = '#c1121f'; x.font = '700 32px Arial,sans-serif';
      wrap(x, stamp, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 44; });
    }
    if (linkLabel) {
      y += 70;
      x.fillStyle = '#c9bfa8'; x.font = '700 32px Arial,sans-serif';
      wrap(x, 'LINK STICKER \u2192 ' + linkLabel, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 44; });
    }
    /* share-image CTA standard: JOIN THE FIGHT. with MTCSTW.COM. */
    x.fillStyle = '#c1121f'; x.font = '900 48px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 300);
    x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 236);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 180);
    /* R29 (2026-10-05): subscriber frame option, gated on subscriber status. */
    if (opts && opts.frame === 'subscriber') subFrame(x, W, H, 244);
    return cv;
  }
  /* size-aware renderer: 'story' -> 9:16 layout above; omitted/anything else
     keeps the 1080x1350 classic exactly as before. */
  function drawPoster(gameId, size, opts) {
    var g = REG[gameId] || REG['daily-orders'];
    if (size === 'story') return drawStoryPoster(g, opts && opts.linkLabel, opts);
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 160;
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 120;
    x.fillStyle = '#c1121f'; x.font = '900 86px "Arial Black",Arial,sans-serif';
    wrap(x, g.title, W - 170).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 100; });
    y += 24;
    x.fillStyle = '#f5ead6'; x.font = '700 42px Arial,sans-serif';
    wrap(x, g.tag, W - 170).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 56; });
    y += 34;
    x.fillStyle = '#c9bfa8'; x.font = '400 36px Arial,sans-serif';
    (g.lines || []).slice(0, 4).forEach(function (t) {
      wrap(x, t, W - 210).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 50; });
      y += 12;
    });
    y += 46;
    x.font = '900 42px "Arial Black",Arial,sans-serif';
    var tw = x.measureText(g.cta).width + 100;
    x.fillStyle = '#c1121f'; x.fillRect(W / 2 - tw / 2, y - 56, tw, 92);
    x.fillStyle = '#ffffff'; x.fillText(g.cta, W / 2, y + 8);
    var stamp = spreadStamp();
    if (stamp) {
      cv._pfStamped = true; /* generic poster carries its own stamp */
      y += 92;
      x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
      wrap(x, stamp, W - 170).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 42; });
    }
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 168);
    /* 2026-10-03: share-image CTA standard — every share image carries
       'JOIN THE FIGHT.' (red, bold) above/below MTCSTW.COM. */
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 108);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 58);
    /* R29 (2026-10-05): subscriber frame option, gated on subscriber status. */
    if (opts && opts.frame === 'subscriber') subFrame(x, W, H, 120);
    return cv;
  }

  /* ------------------------------------------------------------------ */
  /* STUDIO POSTER custom painters (2026-10-05). Copy verbatim from the */
  /* PR desk package — do not reword.                                   */
  /*                                                                    */
  /* REG vs custom: the REG entries above are static templates (generic  */
  /* drawPoster fallback). Each poster below has dynamic fields, so it  */
  /* gets a custom painter fn(done) following the voter-pledge          */
  /* (games/civic.js) / redist-win (games/casino-exits.js) pattern —    */
  /* with one exception: 'ammo-cite', whose painter is owned by         */
  /* games/ammo.js (branch fix/studio-ammo-ux) and is NOT registered     */
  /* here, so the two branches merge without a CUSTOM collision.        */
  /* Painters read their payload from PFShare.posterState(id): the silo */
  /* sets state, then calls PFShare.shareImage/saveImage with the       */
  /* painter's gameId. Missing/invalid state -> done(null), the         */
  /* established "Poster failed — try again." path. Nothing is invented:*/
  /* every number comes from the state the silo supplied.               */
  /* ------------------------------------------------------------------ */
  var POSTER_STATE = {};
  function posterState(id, data) {
    try {
      if (data === undefined) return POSTER_STATE[id] || null;
      if (data === null) delete POSTER_STATE[id];
      else POSTER_STATE[id] = data;
      return POSTER_STATE[id] || null;
    } catch (e) { return null; }
  }
  function fmtN(n) {
    try { var v = Number(n); if (isFinite(v)) return v.toLocaleString('en-US'); } catch (e) {}
    return String(n == null ? '' : n);
  }
  function nonEmpty(s) {
    if (typeof s === 'string') return s.trim();
    return (s == null ? '' : String(s).trim());
  }
  /* Studio layout: kicker, red headline, sub lines, optional CTA button,
     callsign stamp line, MTCSTW.COM + JOIN THE FIGHT. footer, date. Mirrors
     the classic drawPoster chrome so the batch reads as one family. */
  function paintStudio(o) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 170;
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    wrap(x, o.kicker, W - 170).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
    y += 70;
    x.fillStyle = '#c1121f'; x.font = '900 84px "Arial Black",Arial,sans-serif';
    wrap(x, o.headline, W - 170).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 98; });
    y += 30;
    x.fillStyle = '#f5ead6'; x.font = '400 38px Arial,sans-serif';
    (o.subs || []).slice(0, 4).forEach(function (t) {
      wrap(x, t, W - 190).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
      y += 16;
    });
    if (o.cta) {
      y += 40;
      x.font = '900 42px "Arial Black",Arial,sans-serif';
      var tw = x.measureText(o.cta).width + 100;
      x.fillStyle = '#c1121f'; x.fillRect(W / 2 - tw / 2, y - 56, tw, 92);
      x.fillStyle = '#ffffff'; x.fillText(o.cta, W / 2, y + 8);
      y += 92;
    }
    var stamp = spreadStamp();
    if (stamp) {
      cv._pfStamped = true; /* carries its own stamp, like drawPoster */
      y += 40;
      x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
      wrap(x, stamp, W - 170).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 42; });
    }
    /* Share-image CTA standard: MTCSTW.COM + JOIN THE FIGHT. (red, bold). */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 168);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 108);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 58);
    return cv;
  }
  function studioDone(done, cv) {
    try { done(cv || null); } catch (e) {}
  }
  /* 1. FIRST WAVE founder poster. State: {full_muster: bool}. Callsign from
     the identity store — founderhood is gated on a claimed callsign. */
  function firstWavePainter(done) {
    try {
      var cs = callsignOf();
      if (!cs) { studioDone(done, null); return; }
      var st = posterState('first-wave') || {};
      var full = st.full_muster === true;
      studioDone(done, paintStudio({
        kicker: '\u2605 THE PROPAGANDA FACTORY \u2605',
        headline: full ? 'FIRST WAVE \u2014 FULL MUSTER' : 'YOU WERE HERE WHEN IT STARTED.',
        subs: [full ? cs + ' stood the full muster. First wave, full strength.'
                    : 'First Wave founder \u2014 ' + cs],
        cta: 'ENLIST THIS WEEK. FOUNDERS ARE FOREVER.'
      }));
    } catch (e) { studioDone(done, null); }
  }
  /* 2. Ammo Finder citation poster — REG fallback only. The custom painter
     is owned by games/ammo.js (branch fix/studio-ammo-ux, which registers
     PFShare.setPoster('ammo-cite', ...) itself); this file must NOT register
     a second painter or the two branches collide at merge. CUSTOM['ammo-cite']
     set by ammo.js takes precedence at runtime; this REG entry is the
     generic drawPoster fallback. */
  /* 3. Top Stories share poster. State: {headline, outlet} — pulled from
     the news_top story payload, never invented. */
  function topStoriesPainter(done) {
    try {
      var st = posterState('top-stories') || {};
      var head = nonEmpty(st.headline), outlet = nonEmpty(st.outlet);
      if (!head || !outlet) { studioDone(done, null); return; }
      studioDone(done, paintStudio({
        kicker: 'FROM THE NEWS RAIL \u2014 READ FIRST. SHARE SECOND.',
        headline: head,
        subs: ['via ' + outlet + ' \u2014 this is what we\u2019re reading today.']
      }));
    } catch (e) { studioDone(done, null); }
  }
  /* 4. Frontline Forecasts poster (silo 'markets'). State: {market_title,
     position} — from the placed/settled position; battle-wager shares swap
     the wager terms into position. */
  function marketsPainter(done) {
    try {
      var st = posterState('markets') || {};
      var title = nonEmpty(st.market_title), pos = nonEmpty(st.position);
      var cs = callsignOf();
      if (!title || !pos || !cs) { studioDone(done, null); return; }
      studioDone(done, paintStudio({
        kicker: 'READ THE BOARD. BACK THE OUTCOME.',
        headline: title,
        subs: [cs + ' backs ' + pos + ' \u2014 winners split the pool, no house cut.']
      }));
    } catch (e) { studioDone(done, null); }
  }
  /* 5. The Gambit poster (silo 'gambits'). State: {won, winner_callsign,
     pot_xp}. Winner takes 1.9x (math-audit rule — never "double"); 5% of
     every pot tithes to the war chest. Loss variant needs no fields. */
  function gambitsPainter(done) {
    try {
      var st = posterState('gambits') || {};
      if (st.won === true) {
        var winner = nonEmpty(st.winner_callsign), pot = st.pot_xp;
        if (!winner || !(Number(pot) > 0)) { studioDone(done, null); return; }
        studioDone(done, paintStudio({
          kicker: 'THE GAMBIT \u2014 50/50. NO HOUSE.',
          headline: winner.toUpperCase() + ' TOOK THE POT.',
          subs: [fmtN(pot) + ' XP on one flip. 5% armed the war chest.']
        }));
      } else if (st.won === false) {
        studioDone(done, paintStudio({
          kicker: 'THE GAMBIT \u2014 50/50. NO HOUSE.',
          headline: 'THE POT GOT AWAY.',
          subs: ['Winner takes 1.9\u00d7. The war chest takes its cut \u2014 5% of every pot.']
        }));
      } else { studioDone(done, null); }
    } catch (e) { studioDone(done, null); }
  }
  /* 6. Solidarity Draw poster (silo 'draw'). State: {won, winner_callsign,
     winner_xp, chest_xp, round}. The 80/20 split is NOT hardcoded — the two
     XP fields are dynamic, so the copy survives a split change. Loser
     variant needs no fields. */
  function drawPainter(done) {
    try {
      var st = posterState('draw') || {};
      if (st.won === true) {
        var winner = nonEmpty(st.winner_callsign);
        var wxp = st.winner_xp, cxp = st.chest_xp, round = st.round;
        if (!winner || !(Number(wxp) >= 0) || !(Number(cxp) >= 0) || !(Number(round) > 0)) {
          studioDone(done, null); return;
        }
        studioDone(done, paintStudio({
          kicker: 'THE SOLIDARITY DRAW \u2014 FORTUNE FAVORS THE COLLECTIVE.',
          headline: winner.toUpperCase() + ' DREW THE WEEK.',
          subs: [fmtN(wxp) + ' XP to the winner \u2014 ' + fmtN(cxp) +
                 ' XP to the war chest. Verifiable draw, round ' + fmtN(round) + '.']
        }));
      } else if (st.won === false) {
        studioDone(done, paintStudio({
          kicker: 'THE SOLIDARITY DRAW \u2014 FORTUNE FAVORS THE COLLECTIVE.',
          headline: 'THE POT RIDES AGAIN.',
          subs: ['10 XP a ticket. Winner takes the lion\u2019s share \u2014 the war chest takes its cut.']
        }));
      } else { studioDone(done, null); }
    } catch (e) { studioDone(done, null); }
  }
  /* 7. Supply Line Raid poster (silo 'raid'). State: {won, multiplier,
     payout_xp, callsign?, cell_name?}. The CTA verb is EXFILTRATE — never
     "cash out". Unaffiliated loss: stake spoils to the network war chest. */
  function raidPainter(done) {
    try {
      var st = posterState('raid') || {};
      var cs = nonEmpty(st.callsign) || callsignOf();
      if (!cs) { studioDone(done, null); return; }
      cs = cs.toUpperCase();
      if (st.won === true) {
        var mult = nonEmpty(st.multiplier).replace(/^\u00d7/, '');
        var payout = st.payout_xp;
        if (!mult || !(Number(payout) > 0)) { studioDone(done, null); return; }
        studioDone(done, paintStudio({
          kicker: 'SUPPLY LINE RAID \u2014 THE LINE CLIMBS. THE NERVE HOLDS.',
          headline: cs + ' EXFILTRATED AT \u00d7' + mult + '.',
          subs: [fmtN(payout) + ' XP out before the collapse. The line keeps its cut for the collective.']
        }));
      } else if (st.won === false) {
        var cell = nonEmpty(st.cell_name);
        var treasury = cell ? cell + '\u2019s treasury' : 'the network war chest';
        studioDone(done, paintStudio({
          kicker: 'SUPPLY LINE RAID \u2014 THE LINE CLIMBS. THE NERVE HOLDS.',
          headline: 'THE LINE COLLAPSED.',
          subs: [cs + '\u2019s stake arms ' + treasury + '. Losers fund the squad.']
        }));
      } else { studioDone(done, null); }
    } catch (e) { studioDone(done, null); }
  }
  /* 8. Nuke detonation poster. State: {tier} — 1-4, "T1"-"T4", or the tier
     name verbatim. No outcome claims (no trending/pickup language); the
     binding honesty line rides the sub. Never a purchase mention. */
  var NUKE_TIER_NAMES = ['LOCAL SKIRMISH', 'REGIONAL SURGE', 'NATIONAL TAKEOVER', 'MEDIA BLITZ'];
  function nukeTierName(t) {
    try {
      if (typeof t === 'number' && NUKE_TIER_NAMES[t - 1]) return NUKE_TIER_NAMES[t - 1];
      var up = String(t == null ? '' : t).toUpperCase().trim();
      var m = up.match(/^T([1-4])$/);
      if (m) return NUKE_TIER_NAMES[Number(m[1]) - 1];
      if (NUKE_TIER_NAMES.indexOf(up) !== -1) return up;
    } catch (e) {}
    return '';
  }
  function nukeDetonationPainter(done) {
    try {
      var st = posterState('nuke-detonation') || {};
      var tierName = nukeTierName(st.tier);
      var cs = nonEmpty(st.callsign) || callsignOf();
      if (!tierName || !cs) { studioDone(done, null); return; }
      studioDone(done, paintStudio({
        kicker: '\u2605 DETONATION \u2605',
        headline: tierName,
        subs: ['The blast is real. ' + cs.toUpperCase() + ' was in the Detonation Crew.',
               'The meter proves we showed up, not that the algorithm obeyed.']
      }));
    } catch (e) { studioDone(done, null); }
  }
  /* 9. ENLISTED ceremony poster. The callsign IS the poster — zero XP
     language, one prescribed CTA. stampCallsign path reused via the
     share/save flow (paintStudio sets _pfStamped like drawPoster). */
  function enlistedCeremonyPainter(done) {
    try {
      var cs = callsignOf();
      if (!cs) { studioDone(done, null); return; }
      studioDone(done, paintStudio({
        kicker: '\u2605 THE PROPAGANDA FACTORY \u2605',
        headline: 'YOU HAVE A NAME.',
        subs: [cs + ' is enlisted. Now get a squad.'],
        cta: 'GET A SQUAD \u2192'
      }));
    } catch (e) { studioDone(done, null); }
  }

  /* ------------------------------------------------------------------ */
  /* Blob + delivery                                                     */
  /* ------------------------------------------------------------------ */
  /* P3 (2026-10-04): optional {format, quality} — defaults to PNG exactly as
     before, so every existing call site keeps working unchanged. */
  function canvasBlob(cv, cb, opts) {
    opts = opts || {};
    var format = opts.format || 'image/png';
    var quality = (opts.quality == null) ? 0.92 : opts.quality;
    try {
      if (cv.toBlob) { cv.toBlob(function (b) { cb(b); }, format, quality); return; }
      var u = cv.toDataURL(format, quality);
      fetch(u).then(function (r) { return r.blob(); }).then(cb).catch(function () { cb(null); });
    } catch (e) { cb(null); }
  }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} a.remove(); }, 4000);
  }
  /* A7 (2026-10-04): optional deep link — callers (e.g. the war-card BUILD A
     CELL variant) pass opts.link and it rides PF.shareUrl, so ?ref= stamps
     on top of the caller's ?cell= or other params. */
  function shareText(title, link){
    link=link||'https://www.mtcstw.com/';
    try{ if(window.PF&&typeof PF.shareUrl==='function') link=PF.shareUrl(link); }catch(e){}
    return title + ' via The Propaganda Factory — ' + link;
  }

  /* ------------------------------------------------------------------ */
  /* Share credit: one share-task per day per device. Whichever button    */
  /* (SHARE IMAGE or SAVE IMAGE TO PHONE) completes first credits the    */
  /* day. Fires pf-share-image so the Do Meter, ranks XP, medals tally   */
  /* and the site backend all count it exactly once. Never on cancel.    */
  /* ------------------------------------------------------------------ */
  function dayStr() {
    try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; }
  }
  function creditShare(gameId, kind) {
    try {
      var k = 'pf_shareimg_' + dayStr();
      var done = null;
      try { done = localStorage.getItem(k); } catch (e) {}
      if (done) return;
      try { localStorage.setItem(k, '1'); } catch (e) {}
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent('pf-share-image', {
        detail: { day: dayStr(), game: gameId || '', kind: kind || 'share' }
      }));
    } catch (e) {}
  }
  /* Expose the once-per-day share gate so game-local share buttons (e.g.
     Daily Orders' own card button) credit through the same gate instead of
     firing pf-share-image directly and double-counting the day. */
  try { if (PF) PF.creditShare = creditShare; } catch (e) {}
  try { window.pfCreditShare = creditShare; } catch (e) {}

  /* A10 (2026-10-04): callsign claim intercept — one inline component for
     all 19 poster generators, wired at the share/save chokepoint so every
     download path inherits it. Claimed users: zero change (the callback
     fires immediately). Unclaimed users: PF.requireCallsign shows the inline
     claim modal (the existing register flow — validate, POST register, save
     secret, 'pf-callsign-claimed' event; dedupe/claim-once unchanged).
     Claim -> proceed, and the poster stamps FIGHTING AS <CALLSIGN> via
     stampCallsign (idempotent). Dismiss (x) -> proceed unstamped — never
     trap the user. Fires once per session across all generators. */
  var _pfClaimShown = false;
  function claimGate(fn) {
    var cs = '';
    try { cs = callsignOf(); } catch (e) {}
    if (cs || _pfClaimShown) { try { fn(); } catch (e2) {} return; }
    _pfClaimShown = true;
    try {
      if (window.PF && typeof PF.requireCallsign === 'function') {
        PF.requireCallsign(function () { try { fn(); } catch (e3) {} },
          { context: 'to sign your work before it ships' });
        return;
      }
    } catch (e4) {}
    try { fn(); } catch (e5) {} /* claim flow unavailable — never wedge */
  }

  function shareImage(cv, filename, title, gameId, opts) {
    opts = opts || {};
    claimGate(function () { _shareImage(cv, filename, title, gameId, opts); });
  }
  function _shareImage(cv, filename, title, gameId, opts) {
    opts = opts || {};
    var format = opts.format || 'image/png';
    var quality = (opts.quality == null) ? 0.92 : opts.quality;
    try{
      if(!callsignOf()&&!_pfNoCsWarned){
        _pfNoCsWarned=true;
        toast('Heads up: no callsign claimed \u2014 this poster carries no attribution strip. Claim a callsign so shares credit you.');
      }
    }catch(e){}
    try { cv = stampCallsign(cv) || cv; } catch (e) {}
    canvasBlob(cv, function (blob) {
      if (!blob) { toast('Poster failed \u2014 try again.'); return; }
      var file = null;
      try { file = new File([blob], filename, { type: format }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({ files: [file], title: title, text: shareText(title, opts.link) }).then(
            function () { creditShare(gameId, 'share'); toast('Shared. Go spread the word.'); },
            function (err) {
              if (err && err.name === 'AbortError') { toast('Share cancelled.'); }
              else { creditShare(gameId, 'share'); downloadBlob(blob, filename); toast('Image downloaded.'); }
            });
        } catch (e) { creditShare(gameId, 'share'); downloadBlob(blob, filename); toast('Image downloaded.'); }
      } else {
        creditShare(gameId, 'share');
        downloadBlob(blob, filename);
        toast(isIOS() ? 'Image downloaded \u2014 open it, tap Share, then Save Image for Photos.'
                      : 'Image downloaded.');
      }
    }, opts); /* H3 (2026-10-04): forward format/quality — canvasBlob defaults to PNG otherwise, but the File above is typed from opts.format. */
  }

  function saveImage(cv, filename, gameId, opts) {
    opts = opts || {};
    claimGate(function () { _saveImage(cv, filename, gameId, opts); });
  }
  function _saveImage(cv, filename, gameId, opts) {
    opts = opts || {};
    var format = opts.format || 'image/png';
    var quality = (opts.quality == null) ? 0.92 : opts.quality;
    try { cv = stampCallsign(cv) || cv; } catch (e) {}
    canvasBlob(cv, function (blob) {
      if (!blob) { toast('Save failed \u2014 try again.'); return; }
      if (isIOS()) {
        /* iOS Safari ignores the download attribute — the share sheet is the
           only reliable route into Photos ("Save Image" is one tap). */
        var file = null;
        try { file = new File([blob], filename, { type: format }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            navigator.share({ files: [file], title: 'Save to Photos' }).then(
              function () { creditShare(gameId, 'save'); toast('Saved. Check your Photos.'); },
              function (err) {
                if (!(err && err.name === 'AbortError')) toast('Save cancelled \u2014 try again.');
              });
          } catch (e) { toast('Could not open save sheet \u2014 try again.'); }
          return;
        }
        /* No share API: open the image so the user can long-press to save. */
        try {
          var url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          creditShare(gameId, 'save');
          toast('Long-press the image \u2192 Save to Photos.');
        } catch (e) { toast('Save failed \u2014 try again.'); }
        return;
      }
      creditShare(gameId, 'save');
      downloadBlob(blob, filename);
      toast('Image saved to your phone.');
    }, opts); /* H3 (2026-10-04): forward format/quality — canvasBlob defaults to PNG otherwise, but the File above is typed from opts.format. */
  }

  function toast(msg) {
    try { if (PF && PF.toast) PF.toast(msg); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Button injection — unconditional pair per game section              */
  /* ------------------------------------------------------------------ */
  function mkBtn(label, solid, gameId, kind) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('data-pfshare', gameId + '-' + kind);
    b.style.cssText = 'display:inline-block;' +
      (solid ? 'background:#c1121f;border:2px solid #c1121f;color:#f5f0e1;'
             : 'background:transparent;border:2px solid #f5ead6;color:#f5f0e1;') +
      'padding:0.7rem 1.3rem;margin:0.4rem;font-size:0.8rem;font-weight:700;' +
      'letter-spacing:0.12em;cursor:pointer;font-family:inherit;';
    return b;
  }

  function busy(b, fn) {
    b.disabled = true;
    try { fn(); } catch (e) { if (PF) PF.error('share-image', e); }
    setTimeout(function () { b.disabled = false; }, 1500);
  }

  function rowIsCorrect(sec, gameId) {
    var row = sec.querySelector('[data-pfsharerow="' + gameId + '"]');
    if (!row) return false;
    var sb = row.querySelector('[data-pfshare="' + gameId + '-share"]');
    var vb = row.querySelector('[data-pfshare="' + gameId + '-save"]');
    return !!(sb && vb && sb.textContent === SHARE_LABEL && vb.textContent === SAVE_LABEL);
  }

  function ensureGame(gameId) {
    var g = REG[gameId];
    if (!g) return;
    var sec = document.querySelector('section[data-game="' + gameId + '"]');
    if (!sec) return; /* killed via ?pf_off=<silo>, or not mounted */
    if (rowIsCorrect(sec, gameId)) return; /* already has the exact pair — leave it */
    var stale = sec.querySelector('[data-pfsharerow="' + gameId + '"]');
    if (stale) stale.remove(); /* normalize: drop older rows (e.g. v1.4.0 labels) */
    var row = document.createElement('div');
    row.setAttribute('data-pfsharerow', gameId);
    row.style.cssText = 'text-align:center;margin:1.2rem 0 0.4rem;';
    var sb = mkBtn(SHARE_LABEL, true, gameId, 'share');
    sb.onclick = function () { busy(sb, function () {
      var cp = CUSTOM[gameId];
      if (cp) {
        try { cp(function (cv) {
          if (cv) {
            /* P3 (2026-10-04): photo-bearing painters set cv._pfPhoto — those
               ship as JPEG q0.85; everything else stays PNG as before. */
            var pj = !!(cv && cv._pfPhoto);
            shareImage(cv, 'pfn-' + gameId + (pj ? '.jpg' : '.png'), g.title, gameId,
              pj ? { format: 'image/jpeg', quality: 0.85 } : null);
          }
          else toast('Poster failed \u2014 try again.');
        }); } catch (e) { toast('Poster failed \u2014 try again.'); }
        return;
      }
      var cv = drawPoster(gameId);
      if (cv) shareImage(cv, 'pfn-' + gameId + '.png', g.title, gameId);
      else toast('Poster failed \u2014 try again.');
    }); };
    var vb = mkBtn(SAVE_LABEL, false, gameId, 'save');
    vb.onclick = function () { busy(vb, function () {
      var cp2 = CUSTOM[gameId];
      if (cp2) {
        try { cp2(function (cv) {
          if (cv) {
            var pj2 = !!(cv && cv._pfPhoto);
            saveImage(cv, 'pfn-' + gameId + (pj2 ? '.jpg' : '.png'), gameId,
              pj2 ? { format: 'image/jpeg', quality: 0.85 } : null);
          }
          else toast('Save failed \u2014 try again.');
        }); } catch (e) { toast('Save failed \u2014 try again.'); }
        return;
      }
      var cv = drawPoster(gameId);
      if (cv) saveImage(cv, 'pfn-' + gameId + '.png', gameId);
      else toast('Save failed \u2014 try again.');
    }); };
    row.appendChild(sb);
    row.appendChild(vb);
    sec.appendChild(row);
  }

  function ensureAll() {
    ORDER.forEach(ensureGame);
  }

  /* Public API — silos may override poster content later via PFShare.REG.
     poster(gameId, size, opts): opts.linkLabel (story only); opts.frame —
     'subscriber' paints the subscriber-exclusive gold frame, drawn only when
     PF.isSubscriber() confirms subscriber status (R29, 2026-10-05). */
  window.PFShare = {
    REG: REG,
    isIOS: isIOS,
    poster: drawPoster,
    posterStory: function (gameId, opts) { try { return drawPoster(gameId, 'story', opts); } catch (e) { return null; } },
    claimGate: claimGate,
    SIZES: { classic: [1080, 1350], story: [1080, 1920] },
    shareImage: shareImage,
    saveImage: saveImage,
    ensureAll: ensureAll,
    setPoster: function (id, fn) { try { if (id && typeof fn === 'function') CUSTOM[id] = fn; } catch (e) {} },
    /* Studio batch (2026-10-05): dynamic-poster state. Silos set
       PFShare.posterState(id, data) before shareImage/saveImage; the
       custom painter for that id reads it. posterState(id) reads,
       posterState(id, null) clears. */
    posterState: posterState,
    spreadStamp: spreadStamp,
    stampCallsign: stampCallsign
  };

  /* Studio poster batch (2026-10-05): register the dynamic-field painters.
     REG entries above stay as the generic drawPoster fallback. Painters ship
     dormant — they fire only when their silo sets posterState and calls
     shareImage/saveImage with the painter's gameId. */
  try {
    window.PFShare.setPoster('first-wave', firstWavePainter);
    /* 'ammo-cite': painter owned by games/ammo.js (fix/studio-ammo-ux) —
       intentionally NOT registered here; REG fallback above covers
       drawPoster('ammo-cite'). */
    window.PFShare.setPoster('top-stories', topStoriesPainter);
    window.PFShare.setPoster('markets', marketsPainter);
    window.PFShare.setPoster('gambits', gambitsPainter);
    window.PFShare.setPoster('draw', drawPainter);
    window.PFShare.setPoster('raid', raidPainter);
    window.PFShare.setPoster('nuke-detonation', nukeDetonationPainter);
    window.PFShare.setPoster('enlisted-ceremony', enlistedCeremonyPainter);
  } catch (e) {}

  /* Run now (sections are mounted — this file loads after home-v2.js) and
     re-scan for late-mounting sections. Idempotent: never duplicates. */
  try { ensureAll(); } catch (e) { if (PF) PF.error('share-image', e); }
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 2000);
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 6000);
})();
