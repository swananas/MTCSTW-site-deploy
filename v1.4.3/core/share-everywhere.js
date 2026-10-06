/* core/share-everywhere.js  |  PF v1.4.3 | SHARE EVERYWHERE.
   CEO directive 2026-10-06: the territory map had no way to share — fix it
   first, then standardize sitewide. Every UGC surface gets share-to-socials
   + save-to-phone, all carrying the recruiting CTA.
   Builds on core/share-image.js (PFShare): REG templates, custom painters
   via PFShare.setPoster, shareImage/saveImage delivery (Web Share API +
   download fallback), stampCallsign, claimGate. Extends, never reinvents.
   KILL: ?pf_off=share-everywhere  or  localStorage pf_disabled_v1='["share-everywhere"]' */
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

  function registerPainters() {
    try {
      if (!window.PFShare || !PFShare.setPoster) return false;
      PFShare.setPoster('territory-map', paintTerritoryMap);
      PFShare.setPoster('war-map', paintWarMap);
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

  function networksRow(gameId, title, link) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-pfshare-networks', gameId);
    wrap.style.cssText = 'text-align:center;margin:0.6rem 0;';
    var cap = captionFor(gameId, title);
    var url = shareUrl(link);
    NETWORKS.forEach(function (n) {
      var a = document.createElement('a');
      a.href = n.url(cap, url);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = n.label;
      a.setAttribute('aria-label', 'Share on ' + n.label);
      a.style.cssText = 'display:inline-block;background:transparent;border:1px solid #8a8a8a;color:#c9bfa8;' +
        'padding:0.45rem 0.8rem;margin:0.25rem;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;' +
        'text-decoration:none;cursor:pointer;font-family:inherit;';
      wrap.appendChild(a);
    });
    var cp = document.createElement('button');
    cp.type = 'button';
    cp.textContent = 'COPY LINK';
    cp.style.cssText = 'display:inline-block;background:transparent;border:1px solid #8a8a8a;color:#c9bfa8;' +
      'padding:0.45rem 0.8rem;margin:0.25rem;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;' +
      'cursor:pointer;font-family:inherit;';
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
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'display:inline-block;' +
      (solid ? 'background:#c1121f;border:2px solid #c1121f;color:#f5f0e1;'
             : 'background:transparent;border:2px solid #f5ead6;color:#f5f0e1;') +
      'padding:0.7rem 1.3rem;margin:0.4rem;font-size:0.8rem;font-weight:700;' +
      'letter-spacing:0.12em;cursor:pointer;font-family:inherit;';
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
    'war-map': paintWarMap
  };

  /* ------------------------------------------------------------------ */
  /* Declarative scan: any [data-pf-share="<gameId>"] host gets the bar. */
  /* Surfaces opt in with one attribute; late renders are caught by the  */
  /* MutationObserver.                                                   */
  /* ------------------------------------------------------------------ */
  function scan() {
    var hosts = null;
    try { hosts = document.querySelectorAll('[data-pf-share]'); } catch (e) { return; }
    for (var i = 0; i < hosts.length; i++) {
      try {
        var h = hosts[i];
        var gid = h.getAttribute('data-pf-share');
        if (!gid || h.getAttribute('data-pf-share-wired')) continue;
        h.setAttribute('data-pf-share-wired', '1');
        bar(h, gid, { link: h.getAttribute('data-pf-share-link') || null });
      } catch (e) {}
    }
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
        if (registerReg() && registerPainters()) { clearInterval(t); wrapPipeline(); scan(); }
        else if (tries > 20) { clearInterval(t); }
      }, 500);
      return;
    }
    registerPainters();
    wrapPipeline();
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
      resolvePoster: resolvePoster,
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
