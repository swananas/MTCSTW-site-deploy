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
      lines: ['The network counts every thing done.', 'Goal: 5 million things.'],
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
      title: '\u2605 WAR BONDS \u2605', tag: 'Buy a bond. Fund the machine.',
      lines: ['War Bonds fund 60% of all PF operations.', 'Starting at $1. Every dollar is ammunition.'],
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
    /* 6A-R2: The White Market cashout poster. The dynamic "I JUST CASHED
       OUT +N XP" card was painted by the retired casino silo's custom
       painter (PFShare.setPoster('casino', ...)); the live painter is now
       PFShare.setPoster('redist-win', ...) in games/casino-exits.js. This
       REG entry is the generic fallback template — rebranded 2026-10-05.
       The 'casino' key stays (stability). */
    'casino': {
      title: '\u2605 THE WAR ROOM \u2605', tag: 'The redistribution layer',
      lines: ['I just pulled spoils off the board.', 'The board pays out — the house is us, and the house shares.'],
      cta: 'READ THE BOARD'
    },
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
    /* QW-11 (2026-10-05): painter templates for the six game result moments.
       Battles, supply-raid, solidarity-draw, irl, academy-graduation and
       vanguard-wall register their own share buttons against these ids. */
    'poster-battles': {
      title: '\u2620 POSTER BATTLES \u2620', tag: 'Head-to-head propaganda war.',
      lines: ['Vote the matchups. Crown the killers.', 'New battles every week.'],
      cta: 'VOTE THE BATTLES'
    },
    'supply-raid': {
      title: '\u26A1 SUPPLY LINE RAID \u26A1', tag: 'Hit the line. Take their cut.',
      lines: ['Raids pay out to the cell.', 'Join the next raid.'],
      cta: 'JOIN THE RAID'
    },
    'academy-grad': {
      title: '\u2605 ACADEMY GRADUATE \u2605', tag: 'Trained. Tested. Deployed.',
      lines: ['Graduated the Propaganda Academy.', 'The war needs graduates.'],
      cta: 'START THE ACADEMY'
    },
    'solidarity-draw': {
      title: '\u2764 SOLIDARITY DRAW \u2764', tag: 'The pot feeds the fighters.',
      lines: ['Every ticket funds the network.', 'Draws every week.'],
      cta: 'GET TICKETS'
    },
    'irl-going': {
      title: '\uD83D\uDCCD IRL MOBILIZATION \uD83D\uDCCD', tag: 'Touch grass. Raise hell.',
      lines: ['I\u2019m showing up. Are you?', 'Find your mobilization.'],
      cta: 'FIND YOURS'
    },
    'vanguard-wall': {
      title: '\u2605 VANGUARD WALL \u2605', tag: 'Etched in the machine.',
      lines: ['The architects. The legends.', 'Climb the ranks. Get etched.'],
      cta: 'CLIMB THE RANKS'
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
  /* BUTTER PASS (2026-10-07) — editorial paint kit: NYT infographic meets
     propaganda poster. Ink-black gradient ground, serif headlines, tracked
     authority labels, PFN red reserved for moments that matter, gold accents.
     Visual-only: REG data, wrap, stamps, frames, share plumbing untouched. */
  function butterGround(x, W, H, hairY) {
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#131316'); g.addColorStop(0.5, '#0a0a0c'); g.addColorStop(1, '#060607');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var v = x.createRadialGradient(W / 2, H * 0.32, 90, W / 2, H / 2, H * 0.62);
    v.addColorStop(0, 'rgba(245,234,214,0.035)'); v.addColorStop(1, 'rgba(0,0,0,0.32)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    /* red gradient hairline — the one structural red accent */
    var rg = x.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, 'rgba(193,18,31,0)'); rg.addColorStop(0.5, '#c1121f'); rg.addColorStop(1, 'rgba(193,18,31,0)');
    x.fillStyle = rg; x.fillRect(W * 0.08, hairY == null ? 34 : hairY, W * 0.84, 5);
    x.strokeStyle = '#33302a'; x.lineWidth = 2; x.strokeRect(52, 52, W - 104, H - 104);
  }
  /* Manual letterspacing (canvas letterSpacing isn't universal): draws each
     char, centered as a whole; returns total width. */
  function butterTrack(x, text, cx, y, ls) {
    var chars = String(text).split(''), ws = [], total = 0, i, w;
    for (i = 0; i < chars.length; i++) { w = x.measureText(chars[i]).width; ws.push(w); total += w; }
    total += ls * Math.max(0, chars.length - 1);
    var pen = cx - total / 2, prev = x.textAlign;
    x.textAlign = 'left';
    for (i = 0; i < chars.length; i++) { x.fillText(chars[i], pen, y); pen += ws[i] + ls; }
    x.textAlign = prev;
    return total;
  }
  /* Masthead: letterspaced authority label with flanking red diamonds. */
  function butterMast(x, W, y) {
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    var tw = butterTrack(x, 'THE PROPAGANDA FACTORY', W / 2, y, 8);
    x.fillStyle = '#c1121f';
    [[W / 2 - tw / 2 - 48, y], [W / 2 + tw / 2 + 48, y]].forEach(function (p) {
      x.save(); x.translate(p[0], p[1] - 10); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore();
    });
  }
  function butterSerif(x, px) { x.font = 'bold ' + px + 'px Georgia, "Times New Roman", serif'; }
  /* Footer stack: hairline rule, CTA, source line. Every poster carries its
     source citation (here: the network itself + generation date). */
  function butterFoot(x, W, H, ctaY, siteY, srcY) {
    var rg = x.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, 'rgba(201,191,168,0)'); rg.addColorStop(0.5, '#5a5344'); rg.addColorStop(1, 'rgba(201,191,168,0)');
    x.fillStyle = rg; x.fillRect(W * 0.16, ctaY - 118, W * 0.68, 2);
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    butterTrack(x, 'MTCSTW.COM', W / 2, siteY, 10);
    /* 2026-10-03: share-image CTA standard — 'JOIN THE FIGHT.' (red, bold). */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, ctaY);
    x.fillStyle = '#8a8471'; x.font = '400 28px Arial,sans-serif';
    x.fillText(dateStr() + ' \u00b7 THE PROPAGANDA FACTORY NETWORK', W / 2, srcY);
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
    butterGround(x, W, H, 120);
    x.textAlign = 'center';
    var y = 300;
    butterMast(x, W, y); y += 150;
    if (g.storyPre) {
      x.fillStyle = '#e8b923'; x.font = '700 40px Arial,sans-serif';
      wrap(x, g.storyPre, W - 240).slice(0, 2).forEach(function (l) { butterTrack(x, l, W / 2, y, 4); y += 60; });
      y += 20;
    }
    x.fillStyle = '#c1121f'; butterSerif(x, 100);
    wrap(x, g.title, W - 240).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 118; });
    y += 30;
    x.fillStyle = '#f5ead6'; x.font = 'italic bold 44px Georgia, "Times New Roman", serif';
    wrap(x, g.tag, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 60; });
    y += 40;
    x.fillStyle = '#c9bfa8'; x.font = '400 38px Arial,sans-serif';
    (g.lines || []).slice(0, 5).forEach(function (t) {
      wrap(x, t, W - 280).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
      y += 14;
    });
    y += 60;
    x.font = '900 46px "Arial Black",Arial,sans-serif';
    var tw = x.measureText(g.cta).width + 110;
    var bg = x.createLinearGradient(0, y - 62, 0, y + 38);
    bg.addColorStop(0, '#d81f2c'); bg.addColorStop(1, '#a30e19');
    x.fillStyle = bg; x.fillRect(W / 2 - tw / 2, y - 62, tw, 100);
    x.fillStyle = '#ffffff'; x.fillText(g.cta, W / 2, y + 10);
    var stamp = spreadStamp();
    if (stamp) {
      cv._pfStamped = true; /* story poster carries its own stamp */
      y += 110;
      x.fillStyle = '#e8b923'; x.font = '700 32px Arial,sans-serif';
      wrap(x, stamp, W - 240).slice(0, 2).forEach(function (l) { butterTrack(x, l, W / 2, y, 3); y += 44; });
    }
    if (linkLabel) {
      y += 70;
      x.fillStyle = '#c9bfa8'; x.font = '700 32px Arial,sans-serif';
      wrap(x, 'LINK STICKER \u2192 ' + linkLabel, W - 240).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 44; });
    }
    /* share-image CTA standard: JOIN THE FIGHT. with MTCSTW.COM. */
    butterFoot(x, W, H, H - 300, H - 376, H - 244);
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
    butterGround(x, W, H);
    x.textAlign = 'center';
    var y = 160;
    butterMast(x, W, y); y += 120;
    x.fillStyle = '#c1121f'; butterSerif(x, 84);
    wrap(x, g.title, W - 170).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 98; });
    y += 24;
    x.fillStyle = '#f5ead6'; x.font = 'italic bold 42px Georgia, "Times New Roman", serif';
    wrap(x, g.tag, W - 170).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 58; });
    y += 34;
    x.fillStyle = '#c9bfa8'; x.font = '400 36px Arial,sans-serif';
    (g.lines || []).slice(0, 4).forEach(function (t) {
      wrap(x, t, W - 210).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 50; });
      y += 12;
    });
    y += 46;
    x.font = '900 42px "Arial Black",Arial,sans-serif';
    var tw = x.measureText(g.cta).width + 100;
    var bg = x.createLinearGradient(0, y - 56, 0, y + 36);
    bg.addColorStop(0, '#d81f2c'); bg.addColorStop(1, '#a30e19');
    x.fillStyle = bg; x.fillRect(W / 2 - tw / 2, y - 56, tw, 92);
    x.fillStyle = '#ffffff'; x.fillText(g.cta, W / 2, y + 8);
    var stamp = spreadStamp();
    if (stamp) {
      cv._pfStamped = true; /* generic poster carries its own stamp */
      y += 92;
      x.fillStyle = '#e8b923'; x.font = '700 30px Arial,sans-serif';
      wrap(x, stamp, W - 170).slice(0, 2).forEach(function (l) { butterTrack(x, l, W / 2, y, 3); y += 42; });
    }
    /* 2026-10-03: share-image CTA standard — every share image carries
       'JOIN THE FIGHT.' (red, bold) above/below MTCSTW.COM. */
    butterFoot(x, W, H, H - 168, H - 236, H - 116);
    /* R29 (2026-10-05): subscriber frame option, gated on subscriber status. */
    if (opts && opts.frame === 'subscriber') subFrame(x, W, H, 120);
    return cv;
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
          /* P-07 (Wave A6/PW1): opts.text carries a pre-written caption
             (macro-share.js locked template map — no free-text). Falls back
             to the standard shareText when absent. */
          var shareTxt = (opts.text != null && opts.text !== '') ? String(opts.text) : shareText(title, opts.link);
          navigator.share({ files: [file], title: title, text: shareTxt }).then(
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

  /* fe/make-shareable-inline (2026-10-07): paintAsync(gameId, done) —
     resolves the product's OWN painter for the inline Studio panel.
     Custom painters registered via PFShare.setPoster (the CUSTOM registry)
     are async by contract (fn(done)); REG ids paint synchronously through
     drawPoster. One API for both, so the panel never duplicates image code
     and never has to know which kind a painter is. done(canvas|null). */
  function paintAsync(gameId, done) {
    done = (typeof done === 'function') ? done : function () {};
    var cp = null;
    try { cp = CUSTOM[gameId]; } catch (e) {}
    if (cp) {
      try { cp(done); } catch (e) { try { done(null); } catch (e2) {} }
      return true;
    }
    try { done(drawPoster(gameId)); } catch (e) { try { done(null); } catch (e2) {} }
    return true;
  }

  /* Public API — silos may override poster content later via PFShare.REG.
     poster(gameId, size, opts): opts.linkLabel (story only); opts.frame —
     'subscriber' paints the subscriber-exclusive gold frame, drawn only when
     PF.isSubscriber() confirms subscriber status (R29, 2026-10-05).
     paintAsync(gameId, done): CUSTOM painters first, REG fallback (above). */
  window.PFShare = {
    REG: REG,
    isIOS: isIOS,
    poster: drawPoster,
    paintAsync: paintAsync,
    posterStory: function (gameId, opts) { try { return drawPoster(gameId, 'story', opts); } catch (e) { return null; } },
    claimGate: claimGate,
    SIZES: { classic: [1080, 1350], story: [1080, 1920] },
    shareImage: shareImage,
    saveImage: saveImage,
    ensureAll: ensureAll,
    setPoster: function (id, fn) { try { if (id && typeof fn === 'function') CUSTOM[id] = fn; } catch (e) {} },
    spreadStamp: spreadStamp,
    stampCallsign: stampCallsign
  };

  /* Run now (sections are mounted — this file loads after home-v2.js) and
     re-scan for late-mounting sections. Idempotent: never duplicates. */
  try { ensureAll(); } catch (e) { if (PF) PF.error('share-image', e); }
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 2000);
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 6000);
})();
