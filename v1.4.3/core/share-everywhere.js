/* core/share-everywhere.js  |  PF v1.4.3 | SHARE EVERYWHERE.
   CEO directive 2026-10-06: the territory map had no way to share — fix it
   first, then standardize sitewide. Every UGC surface gets share-to-socials
   + save-to-phone, all carrying the recruiting CTA.
   Builds on core/share-image.js (PFShare): REG templates, custom painters
   via PFShare.setPoster, shareImage/saveImage delivery (Web Share API +
   download fallback), stampCallsign, claimGate. Extends, never reinvents.
   KILL: ?pf_off=share-everywhere  or  localStorage pf_disabled_v1='["share-everywhere"]'
   Take-cell finer kill (UX Combination Play 2, 2026-10-06, fe/ux-take-to-cell):
   ?pf_off=takecell — the TAKE THIS TO YOUR CELL buttons stay inert/hidden
   while the rest of the share pipeline keeps running. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('share-everywhere')) { return; }
  if (window.pfShareEverywhereDone) return;
  window.pfShareEverywhereDone = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  function callsignOf() {
    var cs = '';
    try {
      var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      if (id && id.callsign) cs = String(id.callsign).toUpperCase();
    } catch (e) {}
    if (!cs) { try { cs = String((window.PFCallsign && window.PFCallsign()) || '').toUpperCase(); } catch (e) {} }
    return cs;
  }
  function shareUrl(u) {
    u = u || 'https://www.mtcstw.com/';
    try { if (PF && typeof PF.shareUrl === 'function') u = PF.shareUrl(u); } catch (e) {}
    return u;
  }
  function dateStr() {
    try {
      return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return ''; }
  }

  /* ------------------------------------------------------------------ */
  /* REG templates for the newly-covered surfaces. CTA standard: every   */
  /* poster carries MTCSTW.COM + JOIN THE FIGHT. (red, bold) via the      */
  /* generic renderer. Raid cards keep JOIN THE RAID; war cards keep     */
  /* JOIN MY CELL / BUILD YOUR CELL (their painters are untouched).      */
  /* ------------------------------------------------------------------ */
  var NEW_REG = {
    'territory-map': {
      title: '\u2694 TERRITORY MAP \u2694', tag: 'Cells 2.0 turf war, state by state',
      lines: ['Every state held by the cell that earned it.', 'Plant your flag. Hold your turf.'],
      cta: 'HOLD TURF'
    },
    'war-map': {
      title: '\u2694 FRONTLINES \u2694', tag: 'Weekly cell war standings',
      lines: ['Cross-system actions score territory points.', 'Top cell takes the week.'],
      cta: 'JOIN THE WAR'
    },
    'cell-war-front': {
      title: '\u2694 CELL WAR FRONT \u2694', tag: 'Where cells collide',
      lines: ['Battles, raids, and turf on the line.', 'Bring your cell. Leave with ground.'],
      cta: 'JOIN THE FIGHT'
    },
    'cell-hq': {
      title: '\u2605 CELL HQ \u2605', tag: 'Your cell, your headquarters',
      lines: ['Organize. Mobilize. Win.', 'Every cell is an army.'],
      cta: 'JOIN MY CELL'
    },
    'cell-identity': {
      title: '\u2605 CELL IDENTITY \u2605', tag: 'Stamped. Sworn. Deployed.',
      lines: ['This is my cell. This is my fight.', 'Find your people.'],
      cta: 'BUILD YOUR CELL'
    },
    'predictions': {
      title: '\u25c9 CALL IT. \u25c9', tag: 'Call the shot. Right calls pay.',
      lines: ['Every bill on the board. Call pass or fail.', 'Put your call on record.'],
      cta: 'MAKE THE CALL'
    },
    'pledge-wall': {
      title: '\u270a THE PLEDGE WALL \u270a', tag: 'Names on the wall. Boots on the ground.',
      lines: ['Thousands pledged. The wall remembers.', 'Add your name.'],
      cta: 'TAKE THE PLEDGE'
    },
    'checkin': {
      title: '\u2713 CHECKED IN \u2713', tag: 'Showed up. Counted.',
      lines: ['Daily check-in: done.', 'Streaks are built one day at a time.'],
      cta: 'CHECK IN'
    },
    'content-bank': {
      title: '\u25a4 CONTENT BANK \u25a4', tag: 'The movement\u2019s shared arsenal',
      lines: ['Memes, posters, clips — take and spread.', 'The bank never closes.'],
      cta: 'OPEN THE BANK'
    },
    'achievements': {
      title: '\u2605 SERVICE MEDALS \u2605', tag: 'Earned. Not given.',
      lines: ['Weekly medals for weekly work.', 'Full deployment or nothing.'],
      cta: 'EARN YOURS'
    },
    'enlistment-papers': {
      title: 'ENLISTMENT PAPERS', tag: 'Signed. Sworn. In.',
      lines: ['I enlisted in the Propaganda Factory.', 'Your papers are waiting.'],
      cta: 'ENLIST NOW'
    },
    /* ---- Brand-integration pass (2026-10-06, fe/brand-integration): ---- */
    'robreport': {
      title: 'THE ROBBERY REPORT', tag: "Here's what they took — from their own filings.",
      lines: ['29 items. 4 household baskets.', 'Their numbers, our division.'],
      cta: 'JOIN THE FIGHT'
    },
    'robreport-basket': {
      title: 'THE ROBBERY REPORT', tag: 'The household basket, itemized.',
      lines: ['Your whole cart, their whole take.', 'Estimated from their own filings.'],
      cta: 'JOIN THE FIGHT'
    },
    'war-report': {
      title: '\u2694 WAR REPORT \u2694', tag: 'The week that was, straight from Command.',
      lines: ['Read it. Now move.', 'The report lives here.'],
      cta: 'READ THE REPORT'
    },
    'inflation-board': {
      title: "PEOPLE\u2019S CPI", tag: 'Prices we reported ourselves.',
      lines: ['Community-reported medians vs official numbers.', 'Join the count.'],
      cta: 'JOIN THE COUNT'
    },
    'stackem': {
      title: "STACK \u2019EM", tag: 'Two series. One chart. The truth.',
      lines: ['Pick two economic series, see who wins.', 'The read writes itself.'],
      cta: 'STACK YOURS'
    },
    'fred-economy': {
      title: 'THE ECONOMY, READ', tag: 'Official data, honest framing.',
      lines: ['FRED series, source-stamped.', 'No predictions. Just receipts.'],
      cta: 'READ THE NUMBERS'
    },
    'data-bounties': {
      title: 'DATA BOUNTIES', tag: 'Your content becomes movement action.',
      lines: ['Claim bounties. Confirm intel.', 'Never sold. Never ad inventory.'],
      cta: 'TAKE A BOUNTY'
    },
    'political-hq': {
      title: '\u2605 POLITICAL HQ \u2605', tag: 'Every theater of the political war.',
      lines: ['Civic action. Legislation. Intel.', 'Pick your front.'],
      cta: 'JOIN THE FIGHT'
    },
    'academy': {
      title: 'THE ACADEMY', tag: 'Trained. Not born.',
      lines: ['Courses that make agitators.', 'Graduate. Then organize.'],
      cta: 'START TRAINING'
    },
    /* ---- Share-out gap audit (2026-10-06, fe/share-out-gaps): ---- */
    'callit': {
      title: '\u25c9 CALL IT. \u25c9', tag: 'Staff board. My call, on record.',
      lines: ['My call is locked in.', 'Right calls pay. Wrong calls cost pride.'],
      cta: 'MAKE THE CALL'
    },
    'cellwar-standings': {
      title: '\u2694 CELL WAR \u2694', tag: 'This week\u2019s standings, live.',
      lines: ['Top cell Sunday midnight takes the crown.', 'Every XP feeds your cell\u2019s war score.'],
      cta: 'JOIN THE WAR'
    },
    'war-bonds': {
      title: '\u2605 I BACKED THE FIGHT \u2605', tag: 'War Bonds: real money, real machine.',
      lines: ['50% funds the network. 50% to the creator pool.', 'Bonds grant no XP, ever.'],
      cta: 'JOIN THE FIGHT'
    },
    'bank-deposit': {
      title: '\u25c8 VAULT SECURED \u25c8', tag: 'XP in the vault. Slow and steady.',
      lines: ['Deposits build the war chest.', 'The vault never sleeps.'],
      cta: 'JOIN THE FIGHT'
    },
    'event-rsvp': {
      title: 'I\u2019M GOING', tag: 'Boots on the ground.',
      lines: ['RSVP\u2019d. Now show up.', 'The street is the show.'],
      cta: 'JOIN THE FIGHT'
    },
    'gov-result': {
      title: '\u2696 ASSEMBLY DECIDED \u2696', tag: 'The ranks voted. The record stands.',
      lines: ['Power from the ranks, not from above.', 'Rally your cell around the result.'],
      cta: 'JOIN THE FIGHT'
    },
    'ventures': {
      title: 'JOINT VENTURES', tag: 'Shareholder war funds.',
      lines: ['Pool the war chest. Split the spoils.', 'Victories recruit.'],
      cta: 'JOIN THE FIGHT'
    },
    'arcade-blackout': {
      title: 'BLACKOUT', tag: 'The op went dark. The debrief is public.',
      lines: ['Signal returned. Receipts kept.', 'Next op: be there.'],
      cta: 'JOIN THE FIGHT'
    },
    'arcade-ambush': {
      title: 'SUPPLY DROP', tag: 'Claimed the drop. First come, first served.',
      lines: ['Extraction complete.', 'The next drop is already inbound.'],
      cta: 'JOIN THE FIGHT'
    },
    'hall-of-proof': {
      title: '\u2605 HALL OF PROOF \u2605', tag: 'Earned. Pinned. On the wall.',
      lines: ['This week\u2019s soldiers earned the wall.', 'March the circuit. Earn your pin.'],
      cta: 'JOIN THE FIGHT'
    },
    'master-calendar': {
      title: 'WAR CALENDAR', tag: 'Every front, one calendar.',
      lines: ['Mobilizations, ops, votes, drops.', 'Never miss a front.'],
      cta: 'JOIN THE FIGHT'
    },
    /* Reserved REG for surfaces landing later — the bar works day one. */
    'shrinkflation': {
      title: 'SHRINKFLATION WATCH', tag: 'Same price. Less product.',
      lines: ['Spot it. Report it.', 'The bag got lighter.'],
      cta: 'JOIN THE FIGHT'
    },
    'utilities': {
      title: 'UTILITY WATCH', tag: 'The bills they bury.',
      lines: ['Power, water, gas — tracked.', 'Read the meter.'],
      cta: 'JOIN THE FIGHT'
    },
    'war-report-archive': {
      title: 'WAR REPORT ARCHIVE', tag: 'Every week, on record.',
      lines: ['The war, week by week.', 'History with receipts.'],
      cta: 'READ THE REPORT'
    },
    'peoples-cpi-methodology': {
      title: "PEOPLE\u2019S CPI \u2014 METHOD", tag: 'How the count works.',
      lines: ['Community-reported. Honestly labeled.', 'Read the method.'],
      cta: 'JOIN THE COUNT'
    }
  };

  function registerReg() {
    try {
      if (!window.PFShare || !PFShare.REG) return false;
      var k;
      for (k in NEW_REG) { if (!PFShare.REG[k]) PFShare.REG[k] = NEW_REG[k]; }
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* Poster footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) + date.     */
  /* Every custom painter calls this.                                    */
  /* ------------------------------------------------------------------ */
  function paintFooter(x, W, H) {
    x.textAlign = 'center';
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 108);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 52);
    x.fillStyle = '#c9bfa8'; x.font = '400 26px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 18);
  }
  function paintFrame(x, W, H) {
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
  }
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

  /* ------------------------------------------------------------------ */
  /* Territory map painter: serialize the live SVG tile map into the     */
  /* branded poster. Async (done callback) per PFShare.setPoster.        */
  /* Falls back to the generic template when the SVG is absent.          */
  /* ------------------------------------------------------------------ */
  function paintTerritoryMap(done) {
    function fallback() {
      try {
        var cv = PFShare.poster('territory-map');
        done(cv);
      } catch (e) { done(null); }
    }
    try {
      var svg = document.querySelector('#pf-territory-map svg.tm-map');
      if (!svg) { fallback(); return; }
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '1200');
      clone.setAttribute('height', '1000');
      var str = new XMLSerializer().serializeToString(clone);
      var blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      var timer = setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} fallback(); }, 8000);
      img.onload = function () {
        clearTimeout(timer);
        try { URL.revokeObjectURL(url); } catch (e) {}
        try {
          var W = 1080, H = 1350;
          var cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          var x = cv.getContext('2d');
          if (!x) { fallback(); return; }
          paintFrame(x, W, H);
          var y = 150;
          x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
          x.fillText('\u2605 CELLS 2.0 \u2605', W / 2, y); y += 96;
          x.fillStyle = '#c1121f'; x.font = '900 80px "Arial Black",Arial,sans-serif';
          x.fillText('TERRITORY MAP', W / 2, y); y += 64;
          /* week line from the live DOM */
          var week = '';
          try {
            var wEl = document.querySelector('#pf-territory-map .tm-week');
            if (wEl) week = wEl.textContent.trim().toUpperCase();
          } catch (e) {}
          if (week) {
            x.fillStyle = '#e8b923'; x.font = '700 30px Arial,sans-serif';
            x.fillText(week, W / 2, y); y += 20;
          }
          /* map: 600x500 viewBox -> 840 wide, centered */
          var mw = 840, mh = Math.round(mw * 500 / 600);
          x.drawImage(img, (W - mw) / 2, y, mw, mh);
          y += mh + 30;
          /* top-5 legend from the live DOM */
          var legs = [];
          try {
            var els = document.querySelectorAll('#pf-territory-map .tm-leg');
            for (var i = 0; i < els.length && legs.length < 5; i++) {
              var nm = els[i].querySelector('.tm-lname');
              var sb = els[i].querySelector('.tm-lsub');
              if (nm) legs.push({ n: nm.textContent.trim(), s: sb ? sb.textContent.trim() : '' });
            }
          } catch (e) {}
          x.textAlign = 'left';
          for (var l = 0; l < legs.length; l++) {
            if (y > H - 190) break;
            x.fillStyle = l === 0 ? '#e8b923' : '#f5ead6';
            x.font = '700 30px Arial,sans-serif';
            var label = (l + 1) + '. ' + legs[l].n.toUpperCase();
            if (legs[l].s) label += ' \u2014 ' + legs[l].s.toUpperCase();
            var lines = wrap(x, label, W - 200);
            x.fillText(lines[0], 100, y);
            y += 44;
          }
          x.textAlign = 'center';
          paintFooter(x, W, H);
          try { if (PFShare.stampCallsign) PFShare.stampCallsign(cv); } catch (e) {}
          done(cv);
        } catch (e2) { fallback(); }
      };
      img.onerror = function () {
        clearTimeout(timer);
        try { URL.revokeObjectURL(url); } catch (e) {}
        fallback();
      };
      img.src = url;
    } catch (e) { fallback(); }
  }

  /* ------------------------------------------------------------------ */
  /* War map painter: leaderboard poster from the live standings DOM.    */
  /* ------------------------------------------------------------------ */
  function paintWarMap(done) {
    function fallback() {
      try { done(PFShare.poster('war-map')); } catch (e) { done(null); }
    }
    try {
      var rows = [];
      try {
        var els = document.querySelectorAll('#pf-war-map .wm-row');
        for (var i = 0; i < els.length && rows.length < 5; i++) {
          var nm = els[i].querySelector('.wm-name');
          var pt = els[i].querySelector('.wm-pts');
          if (nm) rows.push({ n: nm.textContent.trim(), p: pt ? pt.textContent.trim().split('\n')[0] : '' });
        }
      } catch (e) {}
      if (!rows.length) { fallback(); return; }
      var W = 1080, H = 1350;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      if (!x) { fallback(); return; }
      paintFrame(x, W, H);
      var y = 170;
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      x.fillText('\u2694 CELLS 2.0 \u2694', W / 2, y); y += 100;
      x.fillStyle = '#c1121f'; x.font = '900 84px "Arial Black",Arial,sans-serif';
      wrap(x, 'FRONTLINES', W - 170).forEach(function (l) { x.fillText(l, W / 2, y); y += 100; });
      y += 20;
      var week = '';
      try {
        var wEl = document.querySelector('#pf-war-map .wm-week');
        if (wEl) week = wEl.textContent.trim().toUpperCase();
      } catch (e) {}
      if (week) {
        x.fillStyle = '#e8b923'; x.font = '700 30px Arial,sans-serif';
        x.fillText(week, W / 2, y); y += 60;
      }
      y += 20;
      for (var r = 0; r < rows.length; r++) {
        var ry = y + r * 120;
        if (ry > H - 260) break;
        if (r === 0) {
          x.fillStyle = '#2a1503';
          x.fillRect(90, ry - 62, W - 180, 104);
          x.strokeStyle = '#e8b923'; x.lineWidth = 3;
          x.strokeRect(90, ry - 62, W - 180, 104);
        }
        x.textAlign = 'left';
        x.fillStyle = r === 0 ? '#e8b923' : '#c1121f';
        x.font = '900 52px "Arial Black",Arial,sans-serif';
        x.fillText(String(r + 1), 120, ry);
        x.fillStyle = '#f5ead6'; x.font = '800 40px Arial,sans-serif';
        var nl = wrap(x, rows[r].n.toUpperCase(), W - 480);
        x.fillText(nl[0], 210, ry);
        x.textAlign = 'right';
        x.fillStyle = '#e8b923'; x.font = '700 36px Arial,sans-serif';
        x.fillText(rows[r].p, W - 120, ry);
        x.textAlign = 'center';
      }
      paintFooter(x, W, H);
      try { if (PFShare.stampCallsign) PFShare.stampCallsign(cv); } catch (e) {}
      done(cv);
    } catch (e) { fallback(); }
  }

  /* ------------------------------------------------------------------ */
  /* Cell War standings painter (share-out gap #4): leaderboard poster  */
  /* from the live #xCellWar standings DOM. Top cells + week.           */
  /* ------------------------------------------------------------------ */
  function paintCellWarStandings(done) {
    function fallback() {
      try { done(PFShare.poster('cellwar-standings')); } catch (e) { done(null); }
    }
    try {
      var rows = [];
      try {
        var els = document.querySelectorAll('#xCellWar .cw-row');
        for (var i = 0; i < els.length && rows.length < 5; i++) {
          var nm = els[i].querySelector('.cw-name');
          var pt = els[i].querySelector('.cw-xp');
          if (!nm) continue;
          /* .cw-name may carry a nested YOUR CELL tag — strip it. */
          var nEl = nm.cloneNode(true);
          var tag = nEl.querySelector('.cw-mine-tag');
          if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
          rows.push({ n: nEl.textContent.trim(), p: pt ? pt.textContent.trim() : '' });
        }
      } catch (e) {}
      if (!rows.length) { fallback(); return; }
      var W = 1080, H = 1350;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      if (!x) { fallback(); return; }
      paintFrame(x, W, H);
      var y = 170;
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      x.fillText('\u2694 CELLS 2.0 \u2694', W / 2, y); y += 100;
      x.fillStyle = '#c1121f'; x.font = '900 84px "Arial Black",Arial,sans-serif';
      x.fillText('CELL WAR', W / 2, y); y += 60;
      var week = '';
      try {
        var wEl = document.querySelector('#xCellWar .cw-week');
        if (wEl) week = wEl.textContent.trim().toUpperCase();
      } catch (e) {}
      if (week) {
        x.fillStyle = '#e8b923'; x.font = '700 30px Arial,sans-serif';
        x.fillText(week, W / 2, y); y += 60;
      }
      y += 20;
      for (var r = 0; r < rows.length; r++) {
        var ry = y + r * 120;
        if (ry > H - 260) break;
        if (r === 0) {
          x.fillStyle = '#2a1503';
          x.fillRect(90, ry - 62, W - 180, 104);
          x.strokeStyle = '#e8b923'; x.lineWidth = 3;
          x.strokeRect(90, ry - 62, W - 180, 104);
        }
        x.textAlign = 'left';
        x.fillStyle = r === 0 ? '#e8b923' : '#c1121f';
        x.font = '900 52px "Arial Black",Arial,sans-serif';
        x.fillText(String(r + 1), 120, ry);
        x.fillStyle = '#f5ead6'; x.font = '800 40px Arial,sans-serif';
        var nl = wrap(x, rows[r].n.toUpperCase(), W - 480);
        x.fillText(nl[0], 210, ry);
        x.textAlign = 'right';
        x.fillStyle = '#e8b923'; x.font = '700 36px Arial,sans-serif';
        x.fillText(rows[r].p, W - 120, ry);
        x.textAlign = 'center';
      }
      paintFooter(x, W, H);
      try { if (PFShare.stampCallsign) PFShare.stampCallsign(cv); } catch (e) {}
      done(cv);
    } catch (e) { fallback(); }
  }

  /* ------------------------------------------------------------------ */
  /* War Bonds painter (share-out gap #3): "I BACKED THE FIGHT" card.   */
  /* Reads the live war-ledger strip (#pf-wb-stats) when present.       */
  /* ------------------------------------------------------------------ */
  function paintWarBonds(done) {
    function fallback() {
      try { done(PFShare.poster('war-bonds')); } catch (e) { done(null); }
    }
    try {
      var W = 1080, H = 1350;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      if (!x) { fallback(); return; }
      paintFrame(x, W, H);
      var y = 190;
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, y); y += 110;
      x.fillStyle = '#c1121f'; x.font = '900 92px "Arial Black",Arial,sans-serif';
      wrap(x, 'I BACKED THE FIGHT', W - 170).forEach(function (l) { x.fillText(l, W / 2, y); y += 110; });
      y += 30;
      /* live ledger line, fail-open */
      var ledger = '';
      try {
        var sEl = document.querySelector('#pf-wb-stats');
        if (sEl) ledger = sEl.textContent.replace(/\s+/g, ' ').trim().toUpperCase();
      } catch (e) {}
      if (ledger) {
        x.fillStyle = '#e8b923'; x.font = '700 32px Arial,sans-serif';
        wrap(x, ledger, W - 180).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
        y += 20;
      }
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      ['50% FUNDS THE NETWORK.', '50% TO THE CREATOR POOL, SPLIT EQUALLY.', 'BONDS GRANT NO XP, EVER.'].forEach(function (l) {
        x.fillText(l, W / 2, y); y += 54;
      });
      paintFooter(x, W, H);
      try { if (PFShare.stampCallsign) PFShare.stampCallsign(cv); } catch (e) {}
      done(cv);
    } catch (e) { fallback(); }
  }

  /* Surfaces with dedicated DOM-reading painters — terminal() never     */
  /* clobbers these with the generic detail painter.                     */
  var DEDICATED = { 'territory-map': 1, 'war-map': 1, 'cellwar-standings': 1, 'war-bonds': 1 };

  function registerPainters() {
    try {
      if (!window.PFShare || !PFShare.setPoster) return false;
      PFShare.setPoster('territory-map', paintTerritoryMap);
      PFShare.setPoster('war-map', paintWarMap);
      PFShare.setPoster('cellwar-standings', paintCellWarStandings);
      PFShare.setPoster('war-bonds', paintWarBonds);
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* Network intent row: X / Facebook / Bluesky / Threads + copy link.   */
  /* Pre-written captions only — no free text anywhere.                  */
  /* ------------------------------------------------------------------ */
  var NETWORKS = [
    { id: 'x', label: 'X', url: function (t, u) {
        return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t + ' ' + u); } },
    { id: 'fb', label: 'FACEBOOK', url: function (t, u) {
        return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u); } },
    { id: 'bsky', label: 'BLUESKY', url: function (t, u) {
        return 'https://bsky.app/intent/compose?text=' + encodeURIComponent(t + ' ' + u); } },
    { id: 'threads', label: 'THREADS', url: function (t, u) {
        return 'https://www.threads.net/intent/post?text=' + encodeURIComponent(t + ' ' + u); } }
  ];

  function captionFor(gameId, title) {
    var cs = callsignOf();
    var base = title + ' — via The Propaganda Factory';
    if (cs) base += ' (fighting as ' + cs + ')';
    return base;
  }

  /* Butter pass (workstream 5, 2026-10-07): premium share-out chrome.
     Visual-only — every share target, caption, and fallback below is
     untouched; this only styles the buttons the user taps. */
  var _seCssDone = false;
  function seCssOnce() {
    if (_seCssDone) return;
    _seCssDone = true;
    try {
      var st = document.createElement('style');
      st.setAttribute('data-pf-se-css', '1');
      st.textContent = [
        '.pf-se-kicker{color:#e5383b;font-weight:900;letter-spacing:.28em;font-size:.68rem;',
        'margin:0 0 .55rem;font-family:Arial,Helvetica,sans-serif}',
        '.pf-se-net{display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;',
        'padding:.6rem 1.05rem;margin:.25rem;font-size:.7rem;font-weight:900;letter-spacing:.14em;',
        'text-decoration:none;cursor:pointer;font-family:Arial,Helvetica,sans-serif;border-radius:3px;',
        'box-shadow:0 2px 10px rgba(193,18,31,.35);',
        'transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease}',
        '.pf-se-net:hover{background:#e01424;border-color:#e01424;transform:translateY(-1px);',
        'box-shadow:0 7px 20px rgba(193,18,31,.5)}',
        '.pf-se-net:active{transform:translateY(0) scale(.97)}',
        '.pf-se-net:focus-visible{outline:3px solid #f5ead6;outline-offset:2px}',
        '.pf-se-btn{display:inline-block;padding:.8rem 1.45rem;margin:.4rem;font-size:.8rem;font-weight:900;',
        'letter-spacing:.14em;cursor:pointer;font-family:Arial,Helvetica,sans-serif;border-radius:3px;',
        'transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease}',
        '.pf-se-share{background:#c1121f;border:2px solid #c1121f;color:#fff;',
        'box-shadow:0 3px 14px rgba(193,18,31,.4)}',
        '.pf-se-share:hover{background:#e01424;border-color:#e01424;transform:translateY(-1px);',
        'box-shadow:0 8px 24px rgba(193,18,31,.55)}',
        '.pf-se-share:active{transform:scale(.97)}',
        '.pf-se-save{background:transparent;border:2px solid #c1121f;color:#e5383b}',
        '.pf-se-save:hover{background:rgba(193,18,31,.14);transform:translateY(-1px);',
        'box-shadow:0 4px 14px rgba(193,18,31,.25)}',
        '.pf-se-save:active{transform:scale(.97)}',
        '.pf-se-btn:focus-visible{outline:3px solid #f5ead6;outline-offset:2px}',
        '.pf-se-btn:disabled{opacity:.55;cursor:wait;transform:none;box-shadow:none}',
        '@media(prefers-reduced-motion:reduce){.pf-se-net,.pf-se-btn{transition:none}}',
        '@media(prefers-reduced-motion:reduce){.pf-se-net:hover,.pf-se-share:hover,.pf-se-save:hover{transform:none}}'
      ].join('\n');
      document.head.appendChild(st);
    } catch (e) {}
  }

  function networksRow(gameId, title, link) {
    seCssOnce();
    var wrap = document.createElement('div');
    wrap.setAttribute('data-pfshare-networks', gameId);
    wrap.className = 'pf-se-nets';
    wrap.style.cssText = 'text-align:center;margin:0.6rem 0;';
    var kick = document.createElement('div');
    kick.className = 'pf-se-kicker';
    kick.textContent = '\u26a1 SPREAD THE WORD';
    wrap.appendChild(kick);
    var cap = captionFor(gameId, title);
    var url = shareUrl(link);
    NETWORKS.forEach(function (n) {
      var a = document.createElement('a');
      a.href = n.url(cap, url);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = n.label;
      a.setAttribute('aria-label', 'Share on ' + n.label);
      a.className = 'pf-se-net';
      wrap.appendChild(a);
    });
    var cp = document.createElement('button');
    cp.type = 'button';
    cp.textContent = 'COPY LINK';
    cp.className = 'pf-se-net';
    cp.setAttribute('aria-label', 'Copy link');
    cp.addEventListener('click', function () {
      function done2(ok) { toast(ok ? 'Link copied. Go recruit.' : 'Copy failed \u2014 long-press the URL.'); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { done2(true); }, function () { done2(false); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta); ta.select();
          var ok2 = false;
          try { ok2 = document.execCommand('copy'); } catch (e) {}
          ta.remove(); done2(ok2);
        }
      } catch (e) { done2(false); }
    });
    wrap.appendChild(cp);
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Universal share bar: SHARE IMAGE / SAVE IMAGE TO PHONE + networks.  */
  /* Idempotent per host+gameId. Mirrors share-image.js button styling.  */
  /* ------------------------------------------------------------------ */
  function mkBtn(label, solid) {
    seCssOnce();
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = 'pf-se-btn ' + (solid ? 'pf-se-share' : 'pf-se-save');
    return b;
  }

  function gameTitle(gameId) {
    try {
      if (PFShare.REG[gameId] && PFShare.REG[gameId].title) return PFShare.REG[gameId].title;
    } catch (e) {}
    return 'The Propaganda Factory';
  }

  function bar(host, gameId, opts) {
    opts = opts || {};
    if (!host || !window.PFShare) return false;
    try {
      if (host.querySelector('[data-pfshare-bar="' + gameId + '"]')) return true; /* already wired */
      var row = document.createElement('div');
      row.setAttribute('data-pfshare-bar', gameId);
      row.style.cssText = 'text-align:center;margin:1.2rem 0 0.4rem;';
      var title = opts.title || gameTitle(gameId);
      var filename = 'pfn-' + gameId + '.png';
      var link = opts.link || null;
      var sb = mkBtn('SHARE IMAGE', true);
      sb.setAttribute('data-pfshare', gameId + '-share');
      sb.addEventListener('click', function () {
        sb.disabled = true;
        setTimeout(function () { sb.disabled = false; }, 1500);
        try {
          /* null canvas + _painter: wrapPipeline resolves via the custom
             painter (or generic poster) for this gameId first. */
          PFShare.shareImage(null, filename, title, gameId,
            { text: captionFor(gameId, title) + ' ' + shareUrl(link), link: link, _painter: gameId });
        } catch (e) { toast('Share failed \u2014 try again.'); }
      });
      var vb = mkBtn('SAVE IMAGE TO PHONE', false);
      vb.setAttribute('data-pfshare', gameId + '-save');
      vb.addEventListener('click', function () {
        vb.disabled = true;
        setTimeout(function () { vb.disabled = false; }, 1500);
        try {
          PFShare.saveImage(null, filename, gameId, { _painter: gameId });
        } catch (e) { toast('Save failed \u2014 try again.'); }
      });
      row.appendChild(sb);
      row.appendChild(vb);
      host.appendChild(row);
      host.appendChild(networksRow(gameId, title, link));
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* Pillar handoffs: story-continuation moments, not extra steps.        */
  /* Three presets — SHARE THIS INTEL (data→propaganda), TAKE THIS TO    */
  /* YOUR CELL (data→organize), REPORT BACK (activism→data) — plus a     */
  /* generic builder. Declarative: <div data-pf-handoff="<kind>">.       */
  /* ------------------------------------------------------------------ */
  function safeHref(u) {
    try {
      var s = String(u || '').trim();
      if (/^(\/|#)/.test(s)) return s;
      if (/^https?:\/\//i.test(s)) return s;
    } catch (e) {}
    return '/';
  }
  var HANDOFFS = {
    'share-intel': {
      kicker: '\u26a1 SHARE THIS INTEL',
      line: 'This number is ammunition. Put it in someone\u2019s feed.',
      links: [{ label: 'MAKE IT A POSTER', href: '/create' }]
    },
    'take-cell': {
      kicker: '\u2605 TAKE THIS TO YOUR CELL',
      line: 'Your cell fights harder with real numbers.',
      links: [{ label: 'OPEN YOUR CELL', href: '/cells' }]
    },
    'report-back': {
      kicker: '\u2713 REPORT BACK',
      line: 'Did the work? Log it. The movement counts what gets done.',
      links: [{ label: 'LOG IT', href: '/data-bounties' }]
    }
  };
  function handoff(host, kind, opts) {
    opts = opts || {};
    if (!host) return false;
    var def = HANDOFFS[kind];
    if (!def) return false;
    try {
      if (host.querySelector('[data-pf-handoff="' + kind + '"]')) return true; /* already placed */
      var d = document.createElement('div');
      d.setAttribute('data-pf-handoff', kind);
      d.style.cssText = 'border:2px solid #c1121f;background:#0d0d0d;max-width:680px;margin:1.2rem auto;' +
        'padding:0.9rem 1rem;text-align:center;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;';
      var k = document.createElement('div');
      k.style.cssText = 'color:#e5383b;font-weight:900;letter-spacing:0.22em;font-size:0.72rem;margin-bottom:0.4rem;';
      k.textContent = opts.kicker || def.kicker;
      var l = document.createElement('div');
      l.style.cssText = 'color:#c9bfa8;font-size:0.85rem;margin-bottom:0.7rem;line-height:1.5;';
      l.textContent = opts.line || def.line;
      d.appendChild(k);
      d.appendChild(l);
      /* UX Combination Play 2 (fe/ux-take-to-cell): a take-cell handoff with
         a card payload (data-pf-tc-* on the host, or opts.payload) renders
         the posting button instead of the legacy /cells anchor — same
         styling, same label, now carrying title + figure + link. */
      if (kind === 'take-cell') {
        var tcpl = opts.payload || tcPayloadFromHost(host);
        if (tcpl && !takecellOff()) {
          var tcb = document.createElement('button');
          tcb.type = 'button';
          tcb.textContent = 'TAKE THIS TO YOUR CELL';
          tcb.style.cssText = 'display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:0.72rem;' +
            'letter-spacing:0.14em;padding:0.6rem 1.1rem;margin:0.25rem;text-decoration:none;cursor:pointer;border:0;';
          tcb.addEventListener('click', function () { takeToCell(tcpl); });
          d.appendChild(tcb);
          host.appendChild(d);
          refreshTcVisibility(d);
          return true;
        }
      }
      var links = opts.links || def.links;
      for (var i = 0; i < links.length; i++) {
        var a = document.createElement('a');
        a.href = safeHref(links[i].href);
        a.textContent = links[i].label;
        a.style.cssText = 'display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:0.72rem;' +
          'letter-spacing:0.14em;padding:0.6rem 1.1rem;margin:0.25rem;text-decoration:none;cursor:pointer;';
        d.appendChild(a);
      }
      host.appendChild(d);
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ */
  /* TAKE THIS TO YOUR CELL — payload-carrying handoff (UX Combination   */
  /* Play 2, 2026-10-06, fe/ux-take-to-cell). Extends the take-cell      */
  /* preset above: the button now carries the card payload (title + key  */
  /* figure + link back) into the member's primary cell context.         */
  /*   Mechanism: the primary cell resolves through the EXISTING         */
  /*   cell_mine read channel (same JSONP contract as games/cell-hq.js   */
  /*   — no new endpoint, no second posting mechanism). When the cells   */
  /*   surface registers its feed writer (window.PFCellFeed.post), the   */
  /*   payload posts direct. Otherwise it is staged in sessionStorage    */
  /*   and the member is routed to /cells, where the staged-drop         */
  /*   receiver offers the post.                                         */
  /*   Fail-open: no callsign / no cell / lookup failure -> the per-card  */
  /*   buttons hide; nothing ever throws.                                */
  /*   KILL: ?pf_off=takecell. Zero XP — this only moves intel.          */
  /* ------------------------------------------------------------------ */
  function takecellOff() {
    try { return PF.skip('takecell'); } catch (e) { return false; }
  }
  function tcPayloadFromHost(host) {
    if (!host || !host.getAttribute) return null;
    var t = host.getAttribute('data-pf-tc-title');
    if (!t) return null;
    return {
      title: t,
      figure: host.getAttribute('data-pf-tc-figure') || '',
      link: host.getAttribute('data-pf-tc-link') || '/',
      kind: host.getAttribute('data-pf-tc-kind') || 'intel'
    };
  }
  function tcPayloadFromOpts(opts) {
    opts = opts || {};
    if (!opts.title) return null;
    return {
      title: String(opts.title),
      figure: String(opts.figure || ''),
      link: String(opts.link || '/'),
      kind: String(opts.kind || 'intel')
    };
  }
  /* Primary cell via the existing cell_mine read (cell-hq.js contract:
     j.cell = { id, name }). Cached 10 min, single in-flight request. */
  var _tcCell = null, _tcCellAt = 0, _tcCellQ = null;
  function primaryCell(cb) {
    cb = cb || function () {};
    try {
      if (window.PFCellPrimary && window.PFCellPrimary.id) {
        cb({ id: String(window.PFCellPrimary.id), name: String(window.PFCellPrimary.name || 'your cell') });
        return;
      }
    } catch (e) {}
    var now = Date.now();
    if (_tcCellAt > 0 && now - _tcCellAt < 600000) { cb(_tcCell); return; }
    if (_tcCellQ) { _tcCellQ.push(cb); return; }
    _tcCellQ = [cb];
    function done(cell) {
      _tcCell = cell; _tcCellAt = Date.now();
      var q = _tcCellQ; _tcCellQ = null;
      for (var i = 0; i < q.length; i++) { try { q[i](cell); } catch (e) {} }
    }
    try {
      var BACKEND = window.PF_BACKEND_URL;
      if (!BACKEND) { done(null); return; }
      var fn = 'pfTcCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script'), finished = false;
      function fin(cell) {
        if (finished) return; finished = true;
        try { delete window[fn]; } catch (e) {}
        try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
        done(cell);
      }
      window[fn] = function (j) {
        var cell = null;
        try {
          var c = j && j.cell;
          if (c && c.id) cell = { id: String(c.id), name: String(c.name || 'your cell') };
        } catch (e) {}
        fin(cell);
      };
      s.onerror = function () { fin(null); };
      var q = '?action=cell_mine&callback=' + fn;
      try {
        var sec = (PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
        if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
      } catch (e) {}
      try {
        var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
        if (id && id.callsign) q += '&callsign=' + encodeURIComponent(id.callsign);
      } catch (e) {}
      s.src = BACKEND + q;
      document.head.appendChild(s);
      setTimeout(function () { fin(_tcCell); }, 12000);
    } catch (e) { done(null); }
  }
  function stagedDrop(p) {
    try {
      sessionStorage.setItem('pf_takecell_drop', JSON.stringify({ p: p, ts: Date.now() }));
    } catch (e) {}
    try { location.href = '/cells#pf-takecell'; } catch (e) {}
  }
  function clearDrop() { try { sessionStorage.removeItem('pf_takecell_drop'); } catch (e) {} }
  function takeToCell(payload) {
    payload = payload || {};
    if (takecellOff()) return false;
    var cs = callsignOf();
    if (!cs) { toast('Claim your callsign first \u2014 your cell needs to know it\u2019s you.'); return false; }
    var p = {
      title: String(payload.title || 'Intel drop').slice(0, 140),
      figure: String(payload.figure || '').slice(0, 200),
      link: safeHref(payload.link || '/'),
      kind: String(payload.kind || 'intel').slice(0, 40)
    };
    /* Direct post when the cells surface has registered its feed writer —
       the one posting mechanism, extended, not duplicated. */
    try {
      if (window.PFCellFeed && typeof window.PFCellFeed.post === 'function') {
        primaryCell(function (cell) {
          if (!cell) { stagedDrop(p); return; }
          try {
            window.PFCellFeed.post({
              cell_id: cell.id, title: p.title, figure: p.figure,
              link: p.link, kind: p.kind,
              context: 'Shared from ' + p.link + ' by ' + cs
            }, function (ok) {
              if (ok) toast('Dropped in ' + cell.name + '.');
              else stagedDrop(p);
            });
          } catch (e) { stagedDrop(p); }
        });
        return true;
      }
    } catch (e) {}
    stagedDrop(p);
    return true;
  }

  /* Outward share for the standardized bar: card hook first, Web Share /
     clipboard fallback otherwise. Never throws. */
  function shareIntel(opts) {
    opts = opts || {};
    try {
      if (typeof opts.onShare === 'function') { opts.onShare(); return; }
    } catch (e) {}
    var title = String(opts.title || 'Propaganda Factory intel');
    var figure = String(opts.figure || '');
    var url = shareUrl(safeHref(opts.link || '/'));
    var text = title + (figure ? ' \u2014 ' + figure : '');
    try {
      if (navigator.share) { navigator.share({ title: title, text: text, url: url }); return; }
    } catch (e) {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text + ' ' + url).then(
          function () { toast('Copied \u2014 paste it anywhere.'); },
          function () { toast('Copy blocked \u2014 long-press to copy.'); });
        return;
      }
    } catch (e) {}
    try { toast(url); } catch (e) {}
  }

  /* Standardized action bar — same labels, same order, same branded
     styling on every card: SHARE THIS INTEL · TAKE THIS TO YOUR CELL ·
     REPORT BACK. Declarative: <div data-pf-actionbar data-pf-tc-title="…"
     data-pf-tc-figure="…" data-pf-tc-link="…" data-pf-tc-kind="…"
     data-pf-share-own="1">. Cards that already own share UI pass
     shareOwn (or carry [data-pf-share]) — the share button is skipped,
     the remaining two keep their order. */
  var TC_BAR_CSS = 'border:2px solid #c1121f;background:#0d0d0d;max-width:680px;margin:1rem auto;' +
    'padding:0.7rem 0.8rem;text-align:center;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;';
  var TC_BTN_CSS = 'display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:0.72rem;' +
    'letter-spacing:0.14em;padding:0.55rem 1rem;margin:0.2rem;text-decoration:none;cursor:pointer;border:0;' +
    'font-family:Arial,Helvetica,sans-serif;';
  var TC_GHOST_CSS = 'display:inline-block;background:transparent;color:#c9bfa8;font-weight:900;font-size:0.72rem;' +
    'letter-spacing:0.14em;padding:0.55rem 1rem;margin:0.2rem;text-decoration:none;cursor:pointer;' +
    'border:1px solid #c1121f;font-family:Arial,Helvetica,sans-serif;';
  var _tcCssDone = false;
  function tcCssOnce() {
    if (_tcCssDone) return;
    _tcCssDone = true;
    try {
      var st = document.createElement('style');
      st.setAttribute('data-pf-tc-css', '1');
      st.textContent = '.pf-tc-btn{display:inline-block;background:#c1121f;color:#fff;font-weight:900;' +
        'font-size:.72rem;letter-spacing:.14em;padding:.55rem 1rem;margin:.2rem .2rem .2rem 0;' +
        'text-decoration:none;cursor:pointer;border:0;font-family:Arial,Helvetica,sans-serif}' +
        '.pf-tc-btn:hover{background:#e01424}';
      document.head.appendChild(st);
    } catch (e) {}
  }
  function setTcAttrs(el, p) {
    try {
      el.setAttribute('data-pf-tc-title', String(p.title || ''));
      el.setAttribute('data-pf-tc-figure', String(p.figure || ''));
      el.setAttribute('data-pf-tc-link', String(p.link || '/'));
      el.setAttribute('data-pf-tc-kind', String(p.kind || 'intel'));
    } catch (e) {}
  }
  function actionBar(host, opts) {
    opts = opts || {};
    if (!host) return null;
    try {
      tcCssOnce();
      /* Idempotent: the declarative scanner and programmatic callers share
         this builder. data-pf-actionbar-built marks a finished bar. */
      if (host.getAttribute('data-pf-actionbar-built')) return host;
      var p = tcPayloadFromOpts(opts);
      if (!p) return null;
      host.setAttribute('data-pf-actionbar-built', '1');
      host.style.cssText = TC_BAR_CSS;
      var shareOwn = !!opts.shareOwn;
      try { if (!shareOwn && host.querySelector('[data-pf-share]')) shareOwn = true; } catch (e) {}
      if (!shareOwn) {
        var sh = document.createElement('button');
        sh.type = 'button';
        sh.style.cssText = TC_GHOST_CSS;
        sh.textContent = '\u26a1 SHARE THIS INTEL';
        sh.addEventListener('click', function () { shareIntel(opts); });
        host.appendChild(sh);
      }
      var tc = document.createElement('button');
      tc.type = 'button';
      tc.style.cssText = TC_BTN_CSS;
      tc.textContent = '\u2605 TAKE THIS TO YOUR CELL';
      tc.setAttribute('data-pf-takecell', '');
      setTcAttrs(tc, p);
      tc.setAttribute('data-pf-takecell-wired', '1');
      tc.addEventListener('click', function (ev) {
        try { ev.preventDefault(); takeToCell(p); } catch (e) {}
      });
      host.appendChild(tc);
      var rb = document.createElement('a');
      rb.href = '/data-bounties';
      rb.style.cssText = TC_GHOST_CSS;
      rb.textContent = '\u2713 REPORT BACK';
      host.appendChild(rb);
      refreshTcVisibility(host);
      return host;
    } catch (e) { return null; }
  }

  /* Fail-open visibility: the take-cell action is member-only. No callsign
     -> hide now. Members -> one async primary-cell check; no cell -> hide. */
  var _tcVisChecked = false;
  function refreshTcVisibility(root) {
    try {
      if (takecellOff()) return;
      var scope = root || document;
      if (!scope.querySelectorAll) return;
      var btns = scope.querySelectorAll('[data-pf-takecell]');
      if (!btns.length) return;
      if (!callsignOf()) {
        for (var i = 0; i < btns.length; i++) { btns[i].style.display = 'none'; }
        return;
      }
      if (_tcVisChecked) return;
      _tcVisChecked = true;
      primaryCell(function (cell) {
        if (cell) return;
        for (var j = 0; j < btns.length; j++) {
          try { if (document.contains(btns[j])) btns[j].style.display = 'none'; } catch (e) {}
        }
      });
    } catch (e) {}
  }

  /* Staged-drop receiver: /cells#pf-takecell with a sessionStorage payload
     renders the review-before-posting strip on the cell surface. */
  function scanTakecellDrop() {
    try {
      if (window.pfTakecellDropDone) return;
      if (String(location.hash || '').indexOf('pf-takecell') < 0) return;
      var raw = null;
      try { raw = sessionStorage.getItem('pf_takecell_drop'); } catch (e) {}
      if (!raw) return;
      var drop = null;
      try { drop = JSON.parse(raw); } catch (e) {}
      var p = (drop && drop.p) || null;
      if (!p || !p.title) return;
      window.pfTakecellDropDone = true;
      renderDropStrip(p);
    } catch (e) {}
  }
  function renderDropStrip(p) {
    try {
      var d = document.createElement('div');
      d.setAttribute('data-pf-takecell-drop', '1');
      d.style.cssText = 'border:2px solid #c1121f;background:#0d0d0d;max-width:680px;margin:1rem auto;' +
        'padding:0.9rem 1rem;text-align:center;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;';
      var k = document.createElement('div');
      k.style.cssText = 'color:#e5383b;font-weight:900;letter-spacing:0.22em;font-size:0.72rem;margin-bottom:0.4rem;';
      k.textContent = '\u2605 INTEL DROP \u2014 REVIEW BEFORE POSTING';
      var t = document.createElement('div');
      t.style.cssText = 'color:#f5ead6;font-weight:900;font-size:1rem;margin-bottom:0.25rem;';
      t.textContent = String(p.title || 'Intel drop');
      d.appendChild(k);
      d.appendChild(t);
      if (p.figure) {
        var f = document.createElement('div');
        f.style.cssText = 'color:#e8b923;font-weight:700;font-size:0.9rem;margin-bottom:0.4rem;';
        f.textContent = String(p.figure);
        d.appendChild(f);
      }
      var l = document.createElement('div');
      l.style.cssText = 'color:#c9bfa8;font-size:0.8rem;margin-bottom:0.7rem;';
      l.textContent = 'From ' + String(p.link || '/');
      d.appendChild(l);
      var hasFeed = false;
      try { hasFeed = !!(window.PFCellFeed && typeof window.PFCellFeed.post === 'function'); } catch (e) {}
      if (hasFeed) {
        var post = document.createElement('button');
        post.type = 'button';
        post.style.cssText = TC_BTN_CSS;
        post.textContent = 'POST TO MY CELL';
        post.addEventListener('click', function () {
          primaryCell(function (cell) {
            if (!cell) { toast('Join a cell first \u2014 your intel is staged.'); return; }
            try {
              window.PFCellFeed.post({
                cell_id: cell.id, title: p.title, figure: p.figure,
                link: p.link, kind: p.kind,
                context: 'Intel drop from ' + p.link
              }, function (ok) {
                if (ok) { toast('Dropped in ' + cell.name + '.'); clearDrop(); d.remove(); }
                else toast('Drop failed \u2014 try again.');
              });
            } catch (e) { toast('Drop failed \u2014 try again.'); }
          });
        });
        d.appendChild(post);
      } else {
        /* Fail-open: no feed mechanism -> no post button, no error. The
           intel stays staged; the member's cell HQ is right below. */
        var n = document.createElement('div');
        n.style.cssText = 'color:#c9bfa8;font-size:0.82rem;margin-bottom:0.6rem;line-height:1.5;';
        n.textContent = 'Cell feeds aren\u2019t wired yet \u2014 your intel is staged. Drop it in your cell HQ below.';
        d.appendChild(n);
      }
      var x = document.createElement('button');
      x.type = 'button';
      x.style.cssText = TC_GHOST_CSS;
      x.textContent = 'DISCARD';
      x.addEventListener('click', function () { clearDrop(); try { d.remove(); } catch (e) {} });
      d.appendChild(x);
      var anchor = null;
      try { anchor = document.getElementById('pf-cells-page') || document.getElementById('pf-cell-hq'); } catch (e) {}
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(d, anchor);
      else if (document.body) document.body.insertBefore(d, document.body.firstChild);
    } catch (e) {}
  }
  /* Declarative per-card buttons + action-bar hosts, wired by the scan. */
  function scanTakecell() {
    var btns = null, i, b;
    try { btns = document.querySelectorAll('[data-pf-takecell]'); } catch (e) { return; }
    var off = takecellOff();
    for (i = 0; i < btns.length; i++) {
      try {
        b = btns[i];
        if (off) { b.style.display = 'none'; continue; }
        if (!b.getAttribute('data-pf-takecell-wired')) {
          b.setAttribute('data-pf-takecell-wired', '1');
          (function (btn) {
            btn.addEventListener('click', function (ev) {
              try { ev.preventDefault(); takeToCell(tcPayloadFromHost(btn) || {}); } catch (e) {}
            });
          })(b);
        }
      } catch (e) {}
    }
    var bars = null;
    try { bars = document.querySelectorAll('[data-pf-actionbar]'); } catch (e) { bars = null; }
    if (bars) {
      for (i = 0; i < bars.length; i++) {
        try {
          b = bars[i];
          if (b.getAttribute('data-pf-actionbar-wired')) continue;
          b.setAttribute('data-pf-actionbar-wired', '1');
          var p = tcPayloadFromHost(b);
          if (!p) continue;
          /* Build the bar in place — the declarative host becomes the bar. */
          actionBar(b, {
            title: p.title, figure: p.figure, link: p.link, kind: p.kind,
            shareOwn: b.getAttribute('data-pf-share-own') === '1'
          });
        } catch (e) {}
      }
    }
    refreshTcVisibility();
    scanTakecellDrop();
  }

  /* The share pipeline needs the painter-resolved canvas. Wrap PFShare's
     shareImage/saveImage so a null canvas resolves via the custom painter
     (or generic poster) for this gameId first. Installed once. */
  var _wrapped = false;
  function wrapPipeline() {
    if (_wrapped) return;
    _wrapped = true;
    try {
      if (!window.PFShare) return;
      var origShare = PFShare.shareImage;
      var origSave = PFShare.saveImage;
      PFShare.shareImage = function (cv, filename, title, gameId, opts) {
        opts = opts || {};
        if (!cv && opts._painter) {
          var gid = opts._painter;
          resolvePoster(gid, function (c2) {
            if (c2) origShare.call(PFShare, c2, filename, title, gameId, opts);
            else toast('Poster failed \u2014 try again.');
          });
          return;
        }
        return origShare.call(PFShare, cv, filename, title, gameId, opts);
      };
      PFShare.saveImage = function (cv, filename, gameId, opts) {
        opts = opts || {};
        if (!cv && opts._painter) {
          var gid = opts._painter;
          resolvePoster(gid, function (c2) {
            if (c2) origSave.call(PFShare, c2, filename, gameId, opts);
            else toast('Save failed \u2014 try again.');
          });
          return;
        }
        return origSave.call(PFShare, cv, filename, gameId, opts);
      };
    } catch (e) {}
  }

  /* Resolve a poster canvas for a gameId: custom painter first, generic
     template fallback. Async via done(). */
  function resolvePoster(gameId, done) {
    try {
      /* custom painters are registered in share-image's CUSTOM map; probe
         via a sentinel: share-image exposes setPoster but not CUSTOM, so
         we keep our own registry mirror. */
      var fn = PAINTERS[gameId];
      if (fn) { try { fn(done); return; } catch (e) {} }
      try {
        var cv = PFShare.poster(gameId);
        done(cv);
      } catch (e) { done(null); }
    } catch (e) { done(null); }
  }
  var PAINTERS = {
    'territory-map': paintTerritoryMap,
    'war-map': paintWarMap,
    'cellwar-standings': paintCellWarStandings,
    'war-bonds': paintWarBonds
  };

  /* External painter registration: silos with their own custom painters
     (e.g. the Robbery Report's per-card painters) register here so
     resolvePoster finds them even when share-image's CUSTOM map isn't
     consulted (PFShare.poster is the generic renderer). Idempotent. */
  function registerPainter(gameId, fn) {
    try {
      if (gameId && typeof fn === 'function') { PAINTERS[gameId] = fn; return true; }
    } catch (e) {}
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Game-over share hook (share-out gap audit, fe/share-out-gaps).      */
  /* Arcade games and terminal moments dispatch                          */
  /*   document.dispatchEvent(new CustomEvent('pf:terminal', {detail:{   */
  /*     gameId, title?, result?, score?, lines?, link?, host?, kicker?  */
  /*   }}))                                                             */
  /* or call PFShareEverywhere.terminal(detail) directly. The handler   */
  /* renders a result panel + the site-wide share bar into detail.host  */
  /* (or a [data-pf-terminal="<gameId>"] slot), painting the poster     */
  /* from the detail itself — every terminal surface gets its OWN       */
  /* painter, never a borrowed one. Fail-open; never throws.            */
  /* KILL: ?pf_off=share-terminal (in addition to share-everywhere).    */
  /* ------------------------------------------------------------------ */
  var TERMINAL_DATA = {};
  function terminalGameId(d) {
    var g = String((d && d.gameId) || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return g || 'arcade';
  }
  /* Detail-driven painter factory: one branded poster per terminal      */
  /* surface, rendered from TERMINAL_DATA[gameId]. Canvas fillText is    */
  /* injection-safe; the DOM panel uses textContent only.                */
  function paintTerminalFor(gameId) {
    return function (done) {
      function fallback() {
        try { done(PFShare.poster(gameId)); } catch (e) { done(null); }
      }
      try {
        var d = TERMINAL_DATA[gameId] || {};
        var W = 1080, H = 1350;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var x = cv.getContext('2d');
        if (!x) { fallback(); return; }
        paintFrame(x, W, H);
        var y = 160;
        var kick = d.kicker || (PFShare.REG[gameId] && PFShare.REG[gameId].title) || 'THE PROPAGANDA FACTORY';
        x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
        wrap(x, String(kick).toUpperCase(), W - 180).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
        y += 40;
        var title = d.title || gameTitle(gameId);
        x.fillStyle = '#c1121f'; x.font = '900 76px "Arial Black",Arial,sans-serif';
        wrap(x, String(title).toUpperCase(), W - 170).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 92; });
        y += 20;
        if (d.result) {
          x.fillStyle = '#e8b923'; x.font = '800 40px Arial,sans-serif';
          wrap(x, String(d.result).toUpperCase(), W - 180).slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 56; });
          y += 10;
        }
        if (d.score) {
          x.fillStyle = '#f5ead6'; x.font = '900 54px "Arial Black",Arial,sans-serif';
          x.fillText(String(d.score).toUpperCase(), W / 2, y); y += 80;
        }
        if (d.lines && d.lines.length) {
          x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
          d.lines.slice(0, 3).forEach(function (ln) {
            wrap(x, String(ln), W - 200).slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 44; });
          });
        }
        paintFooter(x, W, H);
        try { if (PFShare.stampCallsign) PFShare.stampCallsign(cv); } catch (e) {}
        done(cv);
      } catch (e) { fallback(); }
    };
  }
  function terminal(detail) {
    detail = detail || {};
    try { if (PF.skip('share-terminal')) return false; } catch (e) {}
    var gameId = terminalGameId(detail);
    TERMINAL_DATA[gameId] = {
      title: String(detail.title || ''),
      result: String(detail.result || ''),
      score: String(detail.score || ''),
      lines: Array.isArray(detail.lines) ? detail.lines.slice(0, 3).map(function (s) { return String(s); }) : [],
      kicker: String(detail.kicker || '')
    };
    /* Dedicated DOM painters keep theirs; everything else gets the      */
    /* detail-driven poster (its OWN painter, never a borrowed one).     */
    if (!DEDICATED[gameId]) registerPainter(gameId, paintTerminalFor(gameId));
    var host = null;
    try {
      if (detail.host && detail.host.nodeType === 1) { host = detail.host; }
      else {
        var slot = document.querySelector('[data-pf-terminal="' + gameId + '"]:not([data-pf-terminal-wired])');
        if (slot) { host = slot; slot.setAttribute('data-pf-terminal-wired', '1'); }
      }
    } catch (e) { host = null; }
    if (!host) return true; /* painter data registered; no panel without a host */
    try {
      var old = host.querySelector('[data-pf-terminal-panel="' + gameId + '"]');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var p = document.createElement('div');
      p.setAttribute('data-pf-terminal-panel', gameId);
      p.style.cssText = 'border:2px solid #c1121f;background:#0d0d0d;margin:1rem auto;' +
        'padding:1rem 1.2rem;text-align:center;max-width:640px;box-sizing:border-box;';
      var k = document.createElement('div');
      k.style.cssText = 'color:#c9bfa8;font-size:0.7rem;letter-spacing:0.24em;font-weight:700;margin-bottom:0.35rem;';
      k.textContent = 'RESULT ON RECORD';
      var t = document.createElement('div');
      t.style.cssText = 'color:#f5ead6;font-family:"Arial Black",Arial,sans-serif;font-size:1.25rem;letter-spacing:0.06em;margin-bottom:0.3rem;';
      t.textContent = TERMINAL_DATA[gameId].title || gameTitle(gameId);
      p.appendChild(k); p.appendChild(t);
      if (TERMINAL_DATA[gameId].result) {
        var r = document.createElement('div');
        r.style.cssText = 'color:#e8b923;font-weight:800;font-size:1rem;margin-bottom:0.25rem;';
        r.textContent = TERMINAL_DATA[gameId].result;
        p.appendChild(r);
      }
      if (TERMINAL_DATA[gameId].score) {
        var s = document.createElement('div');
        s.style.cssText = 'color:#f5ead6;font-weight:700;font-size:0.95rem;margin-bottom:0.25rem;';
        s.textContent = TERMINAL_DATA[gameId].score;
        p.appendChild(s);
      }
      host.appendChild(p);
      bar(p, gameId, { link: detail.link || null, title: TERMINAL_DATA[gameId].title || gameTitle(gameId) });
    } catch (e) {}
    return true;
  }
  /* Bridge existing silo events into pf:terminal (additive — the silos   */
  /* themselves are untouched). Currently: ambush drop claim.            */
  function bridgeSiloEvents() {
    try {
      document.addEventListener('pf-ambush-claimed', function (e) {
        try {
          if (PF.skip('share-terminal')) return;
          var d = (e && e.detail) || {};
          var r = d.reward || {};
          var label = (Number(r.xp) > 0) ? ('+' + Number(r.xp) + ' XP') : String(r.label || 'CLAIMED');
          var host = null;
          try { host = document.getElementById('pfAmbushModal'); } catch (e2) {}
          terminal({
            gameId: 'arcade-ambush', title: 'SUPPLY DROP CLAIMED',
            result: (String(r.rarity || '').toUpperCase() + ' HAUL').trim(),
            score: label,
            lines: ['Extraction complete.', 'The next drop is already inbound.'],
            link: '/arcade', host: host, kicker: '\u2605 SUPPLY DROP \u2605'
          });
        } catch (e2) {}
      });
    } catch (e) {}
    try {
      document.addEventListener('pf:terminal', function (e) {
        try { terminal((e && e.detail) || {}); } catch (e2) {}
      });
    } catch (e) {}
  }
  /* Pull painters a silo exposed for late registration (the money chunk may
     load after this module). Currently: PFRobReport._painters. */
  function drainExternalPainters() {
    try {
      var ext = window.PFRobReport && window.PFRobReport._painters;
      if (ext) {
        for (var k in ext) {
          if (ext.hasOwnProperty(k) && !PAINTERS[k] && typeof ext[k] === 'function') PAINTERS[k] = ext[k];
        }
      }
    } catch (e) {}
  }
  /* Per-item Robbery Report REG entries (dynamic: 29 items + 4 baskets live
     in PFRobReportData). Idempotent — only fills missing keys. */
  function registerDynamicReg() {
    try {
      var D = window.PFRobReportData;
      if (!D || !window.PFShare || !PFShare.REG) return;
      var i;
      if (D.ITEMS) for (i = 0; i < D.ITEMS.length; i++) {
        var it = D.ITEMS[i], k = 'robreport-' + it.id;
        if (!PFShare.REG[k]) PFShare.REG[k] = {
          title: 'THE ROBBERY REPORT', tag: String(it.name || ''),
          lines: ['Their take, from their own filings.', 'Estimated from SEC EDGAR filings.'],
          cta: 'JOIN THE FIGHT'
        };
      }
      if (D.BASKETS) for (i = 0; i < D.BASKETS.length; i++) {
        var b = D.BASKETS[i], k2 = 'robreport-basket-' + b.id;
        if (!PFShare.REG[k2]) PFShare.REG[k2] = {
          title: 'THE ROBBERY REPORT', tag: String(b.name || ''),
          lines: ['The household basket, itemized.', 'Estimated from their own filings.'],
          cta: 'JOIN THE FIGHT'
        };
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Declarative scan: any [data-pf-share="<gameId>"] host gets the bar. */
  /* mode="nets" (data-pf-share-mode) renders the network intent row only, */
  /* for surfaces that already own their share/save buttons.              */
  /* [data-pf-handoff="<kind>"] hosts get the pillar handoff block.       */
  /* Surfaces opt in with one attribute; late renders are caught by the   */
  /* MutationObserver.                                                    */
  /* ------------------------------------------------------------------ */
  function scan() {
    drainExternalPainters();
    registerDynamicReg();
    var hosts = null, i, h, gid;
    try { hosts = document.querySelectorAll('[data-pf-share]'); } catch (e) { return; }
    for (i = 0; i < hosts.length; i++) {
      try {
        h = hosts[i];
        gid = h.getAttribute('data-pf-share');
        if (!gid || h.getAttribute('data-pf-share-wired')) continue;
        h.setAttribute('data-pf-share-wired', '1');
        var link = h.getAttribute('data-pf-share-link') || null;
        if (h.getAttribute('data-pf-share-mode') === 'nets') {
          if (!h.querySelector('[data-pfshare-networks="' + gid + '"]')) {
            h.appendChild(networksRow(gid, gameTitle(gid), link));
          }
        } else {
          bar(h, gid, { link: link });
        }
      } catch (e) {}
    }
    var hh = null;
    try { hh = document.querySelectorAll('[data-pf-handoff]'); } catch (e) { hh = null; }
    if (hh) {
      for (i = 0; i < hh.length; i++) {
        try {
          h = hh[i];
          gid = h.getAttribute('data-pf-handoff');
          if (!gid || h.getAttribute('data-pf-handoff-wired')) continue;
          h.setAttribute('data-pf-handoff-wired', '1');
          handoff(h, gid, {});
        } catch (e) {}
      }
    }
    /* UX Combination Play 2: per-card take-cell buttons, declarative
       action-bar hosts, and the staged-drop receiver. */
    try { scanTakecell(); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    var regOk = registerReg();
    if (!regOk) {
      /* PFShare not ready yet (load order) — retry; never break the page. */
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (registerReg() && registerPainters()) { clearInterval(t); wrapPipeline(); bridgeSiloEvents(); scan(); }
        else if (tries > 20) { clearInterval(t); }
      }, 500);
      return;
    }
    registerPainters();
    wrapPipeline();
    bridgeSiloEvents();
    scan();
    try {
      var mo = new MutationObserver(function () { scan(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    setTimeout(scan, 2000);
    setTimeout(scan, 6000);
  }

  try {
    window.PFShareEverywhere = {
      bar: bar,
      networks: networksRow,
      handoff: handoff,
      /* UX Combination Play 2 (fe/ux-take-to-cell): the take-cell action,
         the standardized action bar, and the primary-cell resolver. */
      takeToCell: takeToCell,
      actionBar: actionBar,
      primaryCell: primaryCell,
      registerPainter: registerPainter,
      resolvePoster: resolvePoster,
      terminal: terminal,
      REG: NEW_REG,
      NETWORKS: NETWORKS,
      scan: scan
    };
  } catch (e) {}

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) {}
})();
