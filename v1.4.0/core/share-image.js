/* ============================================================================
   SILO: core/share-image.js  |  PF v1.4.0
   WHAT: THE SHARE/SAVE COMPANION. Guarantees every v2 game section ends with
         a SHARE IMAGE button and a SAVE TO PHONE button, without editing the
         10 verified game silos. For games that already ship one or both
         buttons natively, only the missing ones are injected (never duplicated).
         Renders a branded 1080x1350 propaganda poster per game (black/red/
         cream), then routes it through the best path for the visitor's phone:
           SHARE IMAGE -> Web Share API with files (share sheet); falls back
                          to a download where sharing is unavailable.
           SAVE TO PHONE -> iPhone/iPad: share sheet (the only reliable route
                          into Photos — "Save Image" is one tap); Android/
                          desktop: direct PNG download.
   PHASE: companion (loads LAST in the v2 set, after pages/home-v2.js mounts
          the 10 sections; re-scans at 2s/6s for late-mounting silo buttons).
   KILL: ?pf_off=share-image  or  localStorage pf_disabled_v1='["share-image"]'
         (per-game ?pf_off=<silo> respected — killed games have no section).
   ============================================================================ */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('share-image')) { PF.log('share-image', 'disabled via kill-switch'); return; }
  if (window.pfShareImageDone) return;
  window.pfShareImageDone = true;

  /* ------------------------------------------------------------------ */
  /* Per-game registry. share/save = does the silo already ship that     */
  /* button natively? Only the missing ones get injected.                */
  /* ------------------------------------------------------------------ */
  var REG = {
    'fan-vote': {
      share: true, save: false,
      title: '\u2605 FAN VOTE \u2605', tag: 'Propagandist of the Week',
      lines: ['Vote for the week\u2019s top propagandist.', 'Polls close Sunday night.', 'Results drop Monday.'],
      cta: 'VOTE NOW'
    },
    'bracket-board': {
      share: false, save: false,
      title: '\u2620 THE LIQUIDATION BRACKET \u2620', tag: '16 billionaires. Head-to-head.',
      lines: ['Your votes decide who gets liquidated.', 'Pick your winners. Advance the class war.'],
      cta: 'VOTE THE BRACKET'
    },
    'daily-orders': {
      share: true, save: false,
      title: 'DAILY ORDERS', tag: 'Today\u2019s missions from the Factory',
      lines: ['Do things. Post proof.', 'Check in daily. Stack your streak.'],
      cta: 'GET ORDERS'
    },
    'do-meter': {
      share: true, save: true,
      title: '\u2697 THE DO METER \u2697', tag: 'NOT FOLLOWERS. NOT LIKES. THINGS DONE.',
      lines: ['The network counts every thing done.', 'Goal: 5 million things.'],
      cta: 'DO A THING'
    },
    'daily-drop': {
      share: true, save: false,
      title: '\u2605 THE DAILY DROP \u2605', tag: 'Fresh slop, daily',
      lines: ['A new drop every day of the offensive.', 'Claim it. Share it. Spread it.'],
      cta: 'CLAIM THE DROP'
    },
    'media-nuke': {
      share: false, save: false,
      title: 'THE MEDIA NUKE', tag: 'NETWORK COMMAND',
      lines: ['Drop synchronized content bombs.', 'One message. Every platform. At once.'],
      cta: 'ARM THE NUKE'
    },
    'caption-combat': {
      share: true, save: true,
      title: 'CAPTION COMBAT', tag: 'One template. One week. Infinite psyops.',
      lines: ['Caption the template. Funniest wins.', 'New round every week.'],
      cta: 'ENTER COMBAT'
    },
    'poster-forge': {
      share: true, save: true,
      title: 'THE POSTER FORGE', tag: 'Make propaganda. Download it.',
      lines: ['Forge your own poster in seconds.', 'Plaster the timeline.'],
      cta: 'FORGE ONE'
    },
    'enlistment-ranks': {
      share: true, save: true,
      title: 'ENLISTMENT RANKS', tag: 'Every action for the machine earns XP',
      lines: ['Climb from Sympathizer to Vanguard.', 'Earn weekly Service Medals.'],
      cta: 'ENLIST NOW'
    },
    'war-bonds': {
      share: false, save: false,
      title: '\u2605 WAR BONDS \u2605', tag: 'Buy a bond. Fund the machine.',
      lines: ['War Bonds fund 60% of all PF operations.', 'Starting at $1. Every dollar is ammunition.'],
      cta: 'BUY WAR BONDS'
    }
  };
  var ORDER = ['fan-vote', 'bracket-board', 'daily-orders', 'do-meter', 'daily-drop',
               'media-nuke', 'caption-combat', 'poster-forge', 'enlistment-ranks', 'war-bonds'];

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
  function drawPoster(gameId) {
    var g = REG[gameId] || REG['daily-orders'];
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
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 128);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 76);
    return cv;
  }

  /* ------------------------------------------------------------------ */
  /* Blob + delivery                                                     */
  /* ------------------------------------------------------------------ */
  function canvasBlob(cv, cb) {
    try {
      if (cv.toBlob) { cv.toBlob(function (b) { cb(b); }, 'image/png'); return; }
      var u = cv.toDataURL('image/png');
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
  function shareText(title) { return title + ' via The Propaganda Factory \u2014 mtcstw.com'; }

  function shareImage(cv, filename, title) {
    canvasBlob(cv, function (blob) {
      if (!blob) { toast('Poster failed \u2014 try again.'); return; }
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({ files: [file], title: title, text: shareText(title) }).then(
            function () { toast('Shared. Go spread the word.'); },
            function (err) {
              if (err && err.name === 'AbortError') { toast('Share cancelled.'); }
              else { downloadBlob(blob, filename); toast('Image downloaded.'); }
            });
        } catch (e) { downloadBlob(blob, filename); toast('Image downloaded.'); }
      } else {
        downloadBlob(blob, filename);
        toast(isIOS() ? 'Image downloaded \u2014 open it, tap Share, then Save Image for Photos.'
                      : 'Image downloaded.');
      }
    });
  }

  function saveImage(cv, filename) {
    canvasBlob(cv, function (blob) {
      if (!blob) { toast('Save failed \u2014 try again.'); return; }
      if (isIOS()) {
        /* iOS Safari ignores the download attribute — the share sheet is the
           only reliable route into Photos ("Save Image" is one tap). */
        var file = null;
        try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            navigator.share({ files: [file], title: 'Save to Photos' }).then(
              function () { toast('Saved. Check your Photos.'); },
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
          toast('Long-press the image \u2192 Save to Photos.');
        } catch (e) { toast('Save failed \u2014 try again.'); }
        return;
      }
      downloadBlob(blob, filename);
      toast('Image saved to your phone.');
    });
  }

  function toast(msg) {
    try { if (PF && PF.toast) PF.toast(msg); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Button injection                                                    */
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

  function domCoverage(sec) {
    var els = sec.querySelectorAll('button,a'), share = false, save = false, i, t;
    for (i = 0; i < els.length; i++) {
      t = els[i].textContent || '';
      if (/share/i.test(t)) share = true;
      if (/save|download/i.test(t)) save = true;
    }
    return { share: share, save: save };
  }

  function ensureGame(gameId) {
    var g = REG[gameId];
    if (!g) return;
    var sec = document.querySelector('section[data-game="' + gameId + '"]');
    if (!sec) return; /* killed via ?pf_off=<silo>, or not mounted */
    var dom = domCoverage(sec);
    var needShare = !g.share && !dom.share;
    var needSave = !g.save && !dom.save;
    if (!needShare && !needSave) return;
    var row = sec.querySelector('[data-pfsharerow="' + gameId + '"]');
    if (!row) {
      row = document.createElement('div');
      row.setAttribute('data-pfsharerow', gameId);
      row.style.cssText = 'text-align:center;margin:1.2rem 0 0.4rem;';
      sec.appendChild(row);
    }
    function busy(b, fn) {
      b.disabled = true;
      try { fn(); } catch (e) { if (PF) PF.error('share-image', e); }
      setTimeout(function () { b.disabled = false; }, 1500);
    }
    if (needShare && !row.querySelector('[data-pfshare="' + gameId + '-share"]')) {
      var sb = mkBtn('SHARE IMAGE', true, gameId, 'share');
      sb.onclick = function () { busy(sb, function () {
        var cv = drawPoster(gameId);
        if (cv) shareImage(cv, 'pfn-' + gameId + '.png', g.title);
        else toast('Poster failed \u2014 try again.');
      }); };
      row.appendChild(sb);
    }
    if (needSave && !row.querySelector('[data-pfshare="' + gameId + '-save"]')) {
      var vb = mkBtn('SAVE TO PHONE', false, gameId, 'save');
      vb.onclick = function () { busy(vb, function () {
        var cv = drawPoster(gameId);
        if (cv) saveImage(cv, 'pfn-' + gameId + '.png');
        else toast('Save failed \u2014 try again.');
      }); };
      row.appendChild(vb);
    }
    if (PF) PF.log('share-image', 'buttons ensured for ' + gameId +
      ' (share:' + (g.share || dom.share || needShare) + ' save:' + (g.save || dom.save || needSave) + ')');
  }

  function ensureAll() {
    ORDER.forEach(ensureGame);
  }

  /* Public API — silos may override poster content later via PFShare.REG. */
  window.PFShare = {
    REG: REG,
    isIOS: isIOS,
    poster: drawPoster,
    shareImage: shareImage,
    saveImage: saveImage,
    ensureAll: ensureAll
  };

  /* Run now (sections are mounted — this file loads after home-v2.js) and
     re-scan for late-mounting silo buttons. Idempotent: never duplicates. */
  try { ensureAll(); } catch (e) { if (PF) PF.error('share-image', e); }
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 2000);
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 6000);
  if (PF) PF.log('share-image', 'companion online — share/save coverage for 10 games');
})();
