/* core/share-image.js  |  PF v1.4.1 | THE SHARE/SAVE COMPANION. Guarantees EVERY v2 game section carries
   KILL: ?pf_off=share-image  or  localStorage pf_disabled_v1='["share-image"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('share-image')) { return; }
  if (window.pfShareImageDone) return;
  window.pfShareImageDone = true;

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
    'media-nuke': {
      title: 'THE MEDIA NUKE', tag: 'NETWORK COMMAND',
      lines: ['Drop synchronized content bombs.', 'One message. Every platform. At once.'],
      cta: 'ARM THE NUKE'
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
    }
  };
  var ORDER = ['fan-vote', 'bracket-board', 'daily-orders', 'do-meter', 'daily-drop',
               'billionaire-supervillain', 'daily-interrogation',
               'media-nuke', 'caption-combat', 'poster-forge', 'enlistment-ranks', 'war-bonds'];
  var SHARE_LABEL = 'SHARE IMAGE';
  var SAVE_LABEL = 'SAVE IMAGE TO PHONE';

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

  function shareImage(cv, filename, title, gameId) {
    canvasBlob(cv, function (blob) {
      if (!blob) { toast('Poster failed \u2014 try again.'); return; }
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({ files: [file], title: title, text: shareText(title) }).then(
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
    });
  }

  function saveImage(cv, filename, gameId) {
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
    });
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
      var cv = drawPoster(gameId);
      if (cv) shareImage(cv, 'pfn-' + gameId + '.png', g.title, gameId);
      else toast('Poster failed \u2014 try again.');
    }); };
    var vb = mkBtn(SAVE_LABEL, false, gameId, 'save');
    vb.onclick = function () { busy(vb, function () {
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
     re-scan for late-mounting sections. Idempotent: never duplicates. */
  try { ensureAll(); } catch (e) { if (PF) PF.error('share-image', e); }
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 2000);
  setTimeout(function () { try { ensureAll(); } catch (e) {} }, 6000);
})();
