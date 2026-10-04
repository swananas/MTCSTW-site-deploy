/* pages/creator-recruit.js  |  PF v1.4.3 | Creator catalog recruiting tools.
   ONE shared component for every SLR catalog render (roster cards +
   individual catalog pages) — no per-creator bespoke code. Auto-mounts:
   - Roster: scans #pf-slr-roster-root .pf-slr-card, resolves each member from
     the card's VIEW PROFILE link (catalog_path -> slug -> PF.slrMember).
   - Catalog page: scans #pf-catalog / #pf-catalog-root, resolves the member
     from data-slug or the URL path.
   Per creator it adds:
   (a) RECRUIT button: mints a shareable creator poster (1080x1350, black/red,
       name, photo, propaganda score, follower count, red bold "JOIN THE FIGHT."
       CTA, MTCSTW.COM branding) and opens the native share sheet via
       PFShare.shareImage (navigator.share with files; download fallback on
       browsers without Web Share API file support). The "FIGHTING AS
       <CALLSIGN>" strip is applied by PFShare.stampCallsign (idempotent).
       The photo is loaded crossOrigin="anonymous" (images.squarespace-cdn.com
       sends ACAO:*) — if it fails, a monogram fallback renders instead, so
       the canvas can never be tainted by a non-CORS image.
   (b) COPY ENLIST LINK button: referral/enlist link per creator
       (https://www.mtcstw.com/request-access?creator=<slug>) run through
       PF.shareUrl so the visitor's callsign rides along as ?ref=<callsign>;
       copy-to-clipboard with a textarea fallback for iOS.
   (c) Catalog pages only: a compact "BRING THEM IN" panel linking at
       /request-access with the creator pre-referenced via ?creator=<slug>.
   Share credit flows through PFShare's once-per-day gate (pf-share-image) so
   the Do Meter / XP ledger count it exactly once. Rescans a few times after
   load because the roster/catalog renderers finish asynchronously once the
   SLR DB resolves; every mount is guarded by data-recruit so it is idempotent.
   KILL: ?pf_off=creator-recruit  or  localStorage pf_disabled_v1='["creator-recruit"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('creator-recruit')) { return; }
  if (window.pfCreatorRecruitDone) { return; }
  window.pfCreatorRecruitDone = true;

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';
  var SITE = 'https://www.mtcstw.com';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function initials(name) {
    var w = String(name || '?').split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase();
  }
  function toast(msg) {
    try { if (PF && PF.toast) { PF.toast(msg); return; } } catch (e) {}
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);background:#c1121f;' +
        'color:#fff;font:bold 14px monospace;padding:12px 20px;border:2px solid #fff;z-index:99999;' +
        'max-width:86vw;text-align:center;box-sizing:border-box;';
      document.body.appendChild(d);
      setTimeout(function () { try { d.remove(); } catch (e2) {} }, 2800);
    } catch (e3) {}
  }
  function enlistUrl(member) {
    var u = SITE + '/request-access?creator=' + encodeURIComponent(member.slug);
    try {
      if (PF && typeof PF.shareUrl === 'function') return PF.shareUrl(u);
    } catch (e) {}
    return u;
  }
  function copyText(str, okMsg) {
    function done() { toast(okMsg || 'Copied.'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).then(done, function () { legacy(); });
        return;
      }
    } catch (e) {}
    legacy();
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = str;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
        document.body.appendChild(ta);
        try { ta.focus(); ta.select(); } catch (e2) {}
        try { ta.setSelectionRange(0, ta.value.length); } catch (e3) {}
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e4) {}
        ta.remove();
        if (ok) done();
        else toast('Copy failed \u2014 long-press the link to copy it.');
      } catch (e4) { toast('Copy failed \u2014 long-press the link to copy it.'); }
    }
  }

  /* ---- (a) creator poster (1080x1350, black/red/cream) ---- */
  function wrap(x, text, maxW, maxLines) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) lines.push(line);
    return lines.slice(0, maxLines || 3);
  }
  /* CORS-safe photo: only resolve an image loaded with crossOrigin set. The
     Squarespace CDN sends Access-Control-Allow-Origin: *; anything else (or
     any failure) resolves null and the monogram fallback keeps the canvas
     untainted. */
  function loadPhoto(url) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(img) { if (!done) { done = true; resolve(img); } }
      if (!url) { fin(null); return; }
      try {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () { fin(img); };
        img.onerror = function () { fin(null); };
        img.src = url;
        setTimeout(function () { fin(null); }, 8000);
      } catch (e) { fin(null); }
    });
  }
  function drawPoster(member, photo) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    function center(t, y, font, fill) {
      x.font = font; x.fillStyle = fill; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.fillText(t, W / 2, y);
    }
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = RED; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = CREAM; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);

    var y = 150;
    center('\u2605 THE PROPAGANDA FACTORY \u2605', y, '700 34px Arial,sans-serif', CREAM);
    y += 64;
    center('SICK LEFT RADICALS', y, '700 30px Arial,sans-serif', RED);
    y += 62;

    /* Creator name, red bold, up to 2 lines with auto-shrink so long names
       stay inside the frame instead of overflowing. */
    var nameUpper = String(member.name || 'A COMRADE').toUpperCase();
    var nameSize = 72, nameF = '', nameLines = [], nlh = 84;
    while (nameSize >= 44) {
      nameF = '900 ' + nameSize + 'px "Arial Black",Arial,sans-serif';
      nlh = Math.round(nameSize * 1.18);
      x.font = nameF;
      nameLines = wrap(x, nameUpper, W - 170, 2);
      var fits = true, li;
      for (li = 0; li < nameLines.length; li++) {
        if (x.measureText(nameLines[li]).width > W - 170) { fits = false; break; }
      }
      if (fits) break;
      nameSize -= 8;
    }
    nameLines.forEach(function (l) { center(l, y, nameF, RED); y += nlh; });

    /* Photo: centered square, cover-fit, red frame. Size adapts to the name
       block so the fixed bottom stack below never shifts. Monogram fallback
       keeps the canvas untainted when no CORS-clean photo loads. */
    var py = y + 28;
    var photoMaxBottom = H - 420;
    var PS = Math.min(560, Math.max(300, photoMaxBottom - py));
    var px = (W - PS) / 2;
    x.fillStyle = '#141414'; x.fillRect(px, py, PS, PS);
    if (photo && photo.naturalWidth > 0) {
      try {
        var iw = photo.naturalWidth, ih = photo.naturalHeight, s = Math.max(PS / iw, PS / ih);
        var dw = iw * s, dh = ih * s;
        x.save();
        x.beginPath(); x.rect(px, py, PS, PS); x.clip();
        x.drawImage(photo, px - (dw - PS) / 2, py - (dh - PS) / 2, dw, dh);
        x.restore();
      } catch (e) { drawMonogram(); }
    } else { drawMonogram(); }
    function drawMonogram() {
      x.fillStyle = RED; x.font = '900 ' + Math.round(PS * 0.38) + 'px "Arial Black",Arial,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(initials(member.name), W / 2, py + PS / 2);
      x.textBaseline = 'alphabetic';
    }
    x.strokeStyle = RED; x.lineWidth = 6; x.strokeRect(px, py, PS, PS);

    /* Fixed bottom stack (above the ~70px stamp-clear zone at the very
       bottom, reserved for PFShare.stampCallsign's strip). */
    y = H - 380;
    var labelF = '700 28px Arial,sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    var score = Number(member.propaganda_score || 0).toFixed(1) + '/10';
    x.font = labelF; x.fillStyle = MUTED;
    var label = 'PROPAGANDA SCORE: ';
    var lw = x.measureText(label).width;
    var valF = '900 52px "Arial Black",Arial,sans-serif';
    x.font = valF;
    var vw = x.measureText(score).width;
    x.font = labelF; x.fillStyle = MUTED;
    x.fillText(label, W / 2 - (lw + vw) / 2 + lw / 2, y);
    x.font = valF; x.fillStyle = RED;
    x.fillText(score, W / 2 - (lw + vw) / 2 + lw + vw / 2, y + 6);

    center(String(member.followers_display || '').toUpperCase() + ' FOLLOWERS', H - 304,
      '900 42px "Arial Black",Arial,sans-serif', RED);

    /* Red bold CTA, then MTCSTW.COM branding. */
    var cta = 'JOIN THE FIGHT.';
    var ctaF = '900 40px "Arial Black",Arial,sans-serif';
    x.font = ctaF;
    var tw = x.measureText(cta).width + 110;
    x.fillStyle = RED;
    x.fillRect(W / 2 - tw / 2, H - 268, tw, 84);
    center(cta, H - 214, ctaF, '#ffffff');
    center('MTCSTW.COM', H - 128, '900 46px "Arial Black",Arial,sans-serif', RED);
    return cv;
  }

  function busyOn(btn, label) {
    try {
      btn.disabled = true;
      if (!btn._pfLabel) btn._pfLabel = btn.textContent;
      btn.textContent = label || 'MINTING\u2026';
    } catch (e) {}
  }
  function busyOff(btn) {
    try {
      btn.disabled = false;
      if (btn._pfLabel) btn.textContent = btn._pfLabel;
    } catch (e) {}
  }

  function handleRecruit(btn, member) {
    if (!window.PFShare || typeof window.PFShare.shareImage !== 'function') {
      toast('Share engine still loading \u2014 tap again in a second.');
      return;
    }
    busyOn(btn);
    loadPhoto(member.picture).then(function (photo) {
      var cv = null;
      try { cv = drawPoster(member, photo); } catch (e) { cv = null; }
      busyOff(btn);
      if (!cv) { toast('Poster failed \u2014 try again.'); return; }
      try {
        window.PFShare.shareImage(cv,
          'slr-recruit-' + String(member.slug || 'creator') + '.png',
          (member.name || 'A Sick Left Radical') + ' \u2014 Sick Left Radicals',
          'slr-recruit');
      } catch (e) { toast('Share unavailable here.'); }
    });
  }

  function mkBtn(label, solid) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('data-recruit-btn', '1');
    b.style.cssText = 'display:inline-block;' +
      (solid ? 'background:' + RED + ';border:2px solid ' + RED + ';color:#ffffff;'
             : 'background:transparent;border:2px solid ' + CREAM + ';color:' + CREAM + ';') +
      'padding:0.65rem 1.1rem;margin:0.35rem;font-size:0.78rem;font-weight:900;' +
      'letter-spacing:0.12em;cursor:pointer;font-family:inherit;-webkit-appearance:none;';
    return b;
  }

  /* Toolbar: [RECRUIT] [COPY ENLIST LINK] — shared by cards and pages. */
  function mountToolbar(host, member) {
    if (!host || host.querySelector('[data-recruit-bar]')) return;
    var bar = document.createElement('div');
    bar.setAttribute('data-recruit-bar', '1');
    bar.style.cssText = 'text-align:center;margin:1rem 0 0.4rem;';
    var r = mkBtn('RECRUIT', true);
    r.onclick = function () { handleRecruit(r, member); };
    var c = mkBtn('COPY ENLIST LINK', false);
    c.onclick = function () {
      copyText(enlistUrl(member), 'Enlist link copied \u2014 share it anywhere.');
    };
    bar.appendChild(r);
    bar.appendChild(c);
    host.appendChild(bar);
  }

  /* (c) compact BRING THEM IN panel — catalog pages only. */
  function mountBringThemIn(root, member) {
    if (!root || root.querySelector('[data-bring-them-in]')) return;
    var box = document.createElement('div');
    box.setAttribute('data-bring-them-in', '1');
    box.style.cssText = 'border:3px solid ' + RED + ';background:#141010;padding:1.4rem 1.2rem;' +
      'text-align:center;margin:2.2rem auto 0;max-width:560px;box-sizing:border-box;';
    var inner =
      '<div style="color:' + RED + ';font-weight:900;letter-spacing:0.14em;font-size:1rem;margin-bottom:0.5rem;">' +
      '\u2691 BRING THEM IN</div>' +
      '<div style="color:' + CREAM + ';font-size:0.92rem;line-height:1.55;margin-bottom:1rem;">' +
      'Know a propagandist who belongs on this roster? Send them the enlistment link with ' +
      '<strong>' + esc(member.name) + '</strong> as your reference.</div>' +
      '<a href="' + esc(enlistUrl(member)) + '" style="display:inline-block;background:' + RED + ';color:#fff;' +
      'font-weight:900;letter-spacing:0.12em;font-size:0.9rem;padding:0.8rem 1.8rem;text-decoration:none;">' +
      'GET THE ENLIST LINK \u2192</a>';
    box.innerHTML = inner;
    var container = root.querySelector('div[style*="max-width:720px"]') || root;
    container.appendChild(box);
  }

  /* ---- Roster cards ---- */
  function slugFromPath(p) {
    var seg = String(p || '').split('?')[0].replace(/^\/|\/$/g, '').split('/').pop();
    return seg || '';
  }
  function enhanceCards() {
    var root = document.getElementById('pf-slr-roster-root') || document.getElementById('pf-slr-roster');
    if (!root) return;
    if (typeof PF.slrMember !== 'function') return;
    var cards = root.querySelectorAll('.pf-slr-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute('data-recruit')) continue;
      card.setAttribute('data-recruit', '1');
      var a = card.querySelector('a[href]');
      var member = a ? PF.slrMember(slugFromPath(a.getAttribute('href'))) : null;
      if (!member) continue;
      var body = a.parentNode || card;
      var bar = document.createElement('div');
      bar.setAttribute('data-recruit-bar', '1');
      bar.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.6rem;';
      var r = mkBtn('RECRUIT', true);
      r.style.cssText += 'flex:1;margin:0;font-size:0.72rem;padding:0.6rem 0.5rem;';
      var c = mkBtn('\u2398', false);
      c.title = 'Copy enlist link';
      c.setAttribute('aria-label', 'Copy enlist link for ' + member.name);
      c.style.cssText += 'flex:0 0 auto;margin:0;font-size:0.85rem;padding:0.6rem 0.8rem;';
      (function (m, rb, cb) {
        rb.onclick = function () { handleRecruit(rb, m); };
        cb.onclick = function () { copyText(enlistUrl(m), 'Enlist link copied \u2014 share it anywhere.'); };
      })(member, r, c);
      bar.appendChild(r);
      bar.appendChild(c);
      body.appendChild(bar);
    }
  }

  /* ---- Catalog page ---- */
  function enhanceCatalogPage() {
    var root = document.getElementById('pf-catalog-root') || document.getElementById('pf-catalog');
    if (!root || root.getAttribute('data-recruit')) return;
    if (typeof PF.slrMember !== 'function') return;
    var el = document.getElementById('pf-catalog');
    var slug = (el && el.getAttribute('data-slug')) || slugFromPath(location.pathname);
    var member = slug ? PF.slrMember(slug) : null;
    if (!member) return;
    root.setAttribute('data-recruit', '1');
    var h1 = root.querySelector('h1');
    var wrap2 = document.createElement('div');
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(wrap2, h1.nextSibling);
    else root.appendChild(wrap2);
    mountToolbar(wrap2, member);
    mountBringThemIn(root, member);
  }

  function scan() {
    try { enhanceCards(); } catch (e) { try { PF.error('creator-recruit', e); } catch (e2) {} }
    try { enhanceCatalogPage(); } catch (e3) { try { PF.error('creator-recruit', e3); } catch (e4) {} }
  }

  /* The roster/catalog renderers fire asynchronously once the SLR DB
     resolves (snapshot, lazy script, or JSON fallback — up to ~15s). Scan
     now and on a bounded backoff so we catch late renders without a
     permanent observer. */
  [0, 1500, 4000, 8000, 16000].forEach(function (ms) {
    setTimeout(scan, ms);
  });

  /* Public surface for any other silo that renders catalog content later. */
  try {
    PF.creatorRecruit = {
      scan: scan,
      enlistUrl: enlistUrl,
      recruitPoster: function (member, photo) { return drawPoster(member, photo); }
    };
  } catch (e) {}
})();
