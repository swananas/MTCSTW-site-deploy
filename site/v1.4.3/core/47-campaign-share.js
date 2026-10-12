/*PF-CAMPAIGN-SHARE*/
/* 47-campaign-share.js — Campaign share cards (2026-10-12).
   Canvas-rendered 1080x1080 share cards for Propaganda Factory campaigns.
   API: PFCampaignShare.makeCard(type, opts) -> HTMLCanvasElement (or null).
   Types: 'wanted' | 'quote' | 'stats'. Text slots are fully templated so
   future campaigns reuse the same renderers:
     makeCard('wanted', { campaign:'fire-goofy-guifoyle',
                          title:'GOOFY GUIFOYLE',
                          subtitle:'TOO GOOFY FOR THE JOB',
                          accent:'FIRE HIM' })
   FIGHT face: dark ground, #c1121f red, cream type. Every card carries the
   share-image CTA standard: 'JOIN THE FIGHT.' (red, bold) + MTCSTW.COM.
   No donate copy. No real names — campaign targets are fictional only.
   Sharing: Web Share API w/ file support; fallback = download on desktop,
   share-sheet-or-new-tab on iOS Safari (download attribute ignored there).
   Standalone: works without the bundle; registers painters on window.PFShare
   when present (PFShare.setPoster) so macro-share flows can call it too. */
(function () {
  'use strict';
  if (window.PFCampaignShare) return;

  var W = 1080, H = 1080;
  var RED = '#c1121f', RED2 = '#a30e19', DARK = '#0b0b0c', CREAM = '#f5ead6',
      DIM = '#c9bfa8', FAINT = '#8a8471';
  var HEAD = '"Arial Black",Arial,sans-serif';
  var BODY = 'Arial,sans-serif';
  var SERIF = 'Georgia,"Times New Roman",serif';

  /* Campaign slot defaults. Slots: title / subtitle / accent.
     'accent' is the red stamp line ('wanted'), a dispatch tag ('quote'),
     or the rally line ('stats'). */
  var CAMPAIGNS = {
    'fire-goofy-guifoyle': {
      label: 'FIRE GOOFY GUIFOYLE',
      file: 'fire-goofy-guifoyle',
      wanted: {
        title: 'GOOFY GUIFOYLE',
        subtitle: 'TOO GOOFY FOR THE JOB',
        accent: 'FIRE HIM'
      },
      quote: {
        title: 'Goofy Guifoyle has exactly two job skills: showing up late and messing up loud.',
        subtitle: 'THE PROPAGANDA FACTORY',
        accent: 'DISPATCH #001'
      },
      stats: {
        title: 'JOIN THE FIGHT.',
        subtitle: 'FIRE GOOFY GUIFOYLE',
        accent: "THE PEOPLE'S VERDICT"
      }
    }
  };
  var DEFAULT_CAMPAIGN = 'fire-goofy-guifoyle';

  function slotsFor(type, opts) {
    opts = opts || {};
    var cid = opts.campaign || DEFAULT_CAMPAIGN;
    var base = (CAMPAIGNS[cid] && CAMPAIGNS[cid][type]) || {};
    return {
      campaign: cid,
      title: (opts.title != null) ? String(opts.title) : (base.title || ''),
      subtitle: (opts.subtitle != null) ? String(opts.subtitle) : (base.subtitle || ''),
      accent: (opts.accent != null) ? String(opts.accent) : (base.accent || '')
    };
  }

  /* ---------------------------------------------------------------- */
  /* Type helpers                                                      */
  /* ---------------------------------------------------------------- */
  function wrap(x, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '', i, t;
    for (i = 0; i < words.length; i++) {
      t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else { line = t; }
    }
    if (line) lines.push(line);
    return lines;
  }
  /* Shrink the font until text fits maxW; returns the px used. */
  function fit(x, text, maxW, base, weight, family) {
    var px = base;
    x.font = weight + ' ' + px + 'px ' + family;
    while (px > 16 && x.measureText(text).width > maxW) {
      px -= 4;
      x.font = weight + ' ' + px + 'px ' + family;
    }
    return px;
  }
  /* Manual letterspacing (canvas letterSpacing is not universal). */
  function track(x, text, cx, y, ls) {
    var chars = String(text).split(''), ws = [], total = 0, i, w, pen, prev = x.textAlign;
    for (i = 0; i < chars.length; i++) { w = x.measureText(chars[i]).width; ws.push(w); total += w; }
    total += ls * Math.max(0, chars.length - 1);
    pen = cx - total / 2;
    x.textAlign = 'left';
    for (i = 0; i < chars.length; i++) { x.fillText(chars[i], pen, y); pen += ws[i] + ls; }
    x.textAlign = prev;
  }

  /* ---------------------------------------------------------------- */
  /* FIGHT face: ground, masthead, footer                              */
  /* ---------------------------------------------------------------- */
  function ground(x) {
    x.fillStyle = DARK;
    x.fillRect(0, 0, W, H);
    /* Red glow low-center, like stage light on the fight. */
    var rg = x.createRadialGradient(W / 2, H * 0.72, 60, W / 2, H * 0.72, 760);
    rg.addColorStop(0, 'rgba(193,18,31,0.22)');
    rg.addColorStop(0.55, 'rgba(193,18,31,0.07)');
    rg.addColorStop(1, 'rgba(193,18,31,0)');
    x.fillStyle = rg;
    x.fillRect(0, 0, W, H);
    /* Vignette. */
    var vg = x.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);
    /* Red rules top and bottom. */
    x.fillStyle = RED;
    x.fillRect(0, 0, W, 14);
    x.fillRect(0, H - 14, W, 14);
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
  }
  function mast(x, y) {
    x.fillStyle = DIM;
    x.font = '700 30px ' + BODY;
    var tw = track(x, 'THE PROPAGANDA FACTORY', W / 2, y, 8);
    x.fillStyle = RED;
    var pts = [[W / 2 - tw / 2 - 48, y], [W / 2 + tw / 2 + 48, y]], i;
    for (i = 0; i < pts.length; i++) {
      x.save();
      x.translate(pts[i][0], pts[i][1] - 10);
      x.rotate(Math.PI / 4);
      x.fillRect(-7, -7, 14, 14);
      x.restore();
    }
  }
  /* Share-image CTA standard: 'JOIN THE FIGHT.' (red, bold) + MTCSTW.COM. */
  function foot(x) {
    var ctaY = H - 116, siteY = H - 62;
    var rg = x.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, 'rgba(201,191,168,0)');
    rg.addColorStop(0.5, '#5a5344');
    rg.addColorStop(1, 'rgba(201,191,168,0)');
    x.fillStyle = rg;
    x.fillRect(W * 0.16, ctaY - 78, W * 0.68, 2);
    x.fillStyle = RED;
    x.font = '900 52px ' + HEAD;
    x.fillText('JOIN THE FIGHT.', W / 2, ctaY);
    x.fillStyle = CREAM;
    x.font = '700 36px ' + BODY;
    track(x, 'MTCSTW.COM', W / 2, siteY, 10);
  }
  function divider(x, y) {
    var rg = x.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, 'rgba(193,18,31,0)');
    rg.addColorStop(0.5, RED);
    rg.addColorStop(1, 'rgba(193,18,31,0)');
    x.fillStyle = rg;
    x.fillRect(W * 0.24, y, W * 0.52, 4);
  }

  /* ---------------------------------------------------------------- */
  /* Card 1 — WANTED                                                   */
  /* ---------------------------------------------------------------- */
  function paintWanted(x, s) {
    var y = 150;
    mast(x, y); y += 110;
    x.fillStyle = CREAM;
    x.font = '700 44px ' + BODY;
    track(x, '\u2605 WANTED \u2605', W / 2, y, 12);
    y += 130;
    x.fillStyle = CREAM;
    var px = fit(x, s.title, W - 140, 150, '900', HEAD);
    x.fillText(s.title, W / 2, y);
    y += px * 0.95;
    if (s.subtitle) {
      x.fillStyle = RED;
      var spx = fit(x, s.subtitle, W - 200, 72, '900', HEAD);
      x.fillText(s.subtitle, W / 2, y);
      y += spx * 1.05;
    }
    divider(x, y); y += 90;
    /* Red rubber-stamp: rotated double frame, distressed edges. */
    if (s.accent) {
      x.save();
      x.translate(W / 2, y + 90);
      x.rotate(-0.16);
      x.font = '900 118px ' + HEAD;
      var tw = x.measureText(s.accent).width;
      var bw = tw + 110, bh = 176;
      x.strokeStyle = RED; x.lineWidth = 10;
      x.strokeRect(-bw / 2, -bh / 2, bw, bh);
      x.lineWidth = 3;
      x.strokeRect(-bw / 2 + 18, -bh / 2 + 18, bw - 36, bh - 36);
      /* Distress: knock a few dark slashes through the stamp. */
      x.fillStyle = DARK;
      var i;
      for (i = 0; i < 7; i++) {
        var sx = -bw / 2 + ((i * 173) % bw);
        x.save();
        x.translate(sx, 0);
        x.rotate(0.3);
        x.fillRect(-4, -bh / 2 - 10, 8, bh + 20);
        x.restore();
      }
      x.fillStyle = RED;
      x.fillText(s.accent, 0, 42);
      x.restore();
    }
    foot(x);
  }

  /* ---------------------------------------------------------------- */
  /* Card 2 — QUOTE                                                    */
  /* ---------------------------------------------------------------- */
  function paintQuote(x, s) {
    var y = 150;
    mast(x, y); y += 120;
    /* Giant red quotation mark. */
    x.fillStyle = RED;
    x.font = '900 260px ' + SERIF;
    x.fillText('\u201C', W / 2, y + 150);
    y += 190;
    /* The savage one-liner. */
    x.fillStyle = CREAM;
    x.font = 'italic bold 56px ' + SERIF;
    var lines = wrap(x, s.title, W - 220).slice(0, 5), i;
    for (i = 0; i < lines.length; i++) {
      x.fillText(lines[i], W / 2, y);
      y += 76;
    }
    y += 36;
    divider(x, y); y += 80;
    /* Attribution. */
    if (s.subtitle) {
      x.fillStyle = DIM;
      x.font = '700 34px ' + BODY;
      track(x, '\u2014 ' + s.subtitle + ' \u2014', W / 2, y, 4);
      y += 60;
    }
    if (s.accent) {
      x.fillStyle = FAINT;
      x.font = '400 28px ' + BODY;
      track(x, s.accent, W / 2, y, 6);
    }
    foot(x);
  }

  /* ---------------------------------------------------------------- */
  /* Card 3 — STATS (rally card)                                       */
  /* ---------------------------------------------------------------- */
  function paintStats(x, s) {
    var y = 150;
    mast(x, y); y += 120;
    if (s.accent) {
      x.fillStyle = RED;
      x.font = '700 38px ' + BODY;
      track(x, s.accent, W / 2, y, 8);
      y += 80;
    }
    /* Title — default is the big red JOIN THE FIGHT. */
    x.fillStyle = RED;
    var tpx = fit(x, s.title, W - 120, 108, '900', HEAD);
    var tlines = wrap(x, s.title, W - 120).slice(0, 2), i;
    for (i = 0; i < tlines.length; i++) {
      x.fillText(tlines[i], W / 2, y);
      y += tpx * 1.02;
    }
    y += 30;
    divider(x, y); y += 90;
    /* Campaign tagline, cream. */
    x.fillStyle = CREAM;
    var spx = fit(x, s.subtitle, W - 160, 92, '900', HEAD);
    var slines = wrap(x, s.subtitle, W - 160).slice(0, 3);
    for (i = 0; i < slines.length; i++) {
      x.fillText(slines[i], W / 2, y);
      y += spx * 1.02;
    }
    /* Fist mark under the tagline. */
    y += 50;
    x.fillStyle = RED;
    x.font = '900 90px ' + BODY;
    x.fillText('\u270A', W / 2, y);
    foot(x);
  }

  var PAINTERS = { wanted: paintWanted, quote: paintQuote, stats: paintStats };

  /* ---------------------------------------------------------------- */
  /* Public: makeCard                                                  */
  /* ---------------------------------------------------------------- */
  function makeCard(type, opts) {
    var painter = PAINTERS[type];
    if (!painter) return null;
    var s = slotsFor(type, opts);
    var cv;
    try {
      cv = document.createElement('canvas');
    } catch (e) { return null; }
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    try {
      ground(x);
      painter(x, s);
    } catch (e) {
      try { if (window.PF && PF.error) PF.error('campaign-share', e); } catch (e2) {}
      return null;
    }
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Sharing: Web Share API w/ download fallback (iOS-Safari aware)    */
  /* ---------------------------------------------------------------- */
  function isIOS() {
    try {
      return /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
  }
  function toast(msg) {
    try { if (window.PF && PF.toast) PF.toast(msg); } catch (e) {}
  }
  function fileNameFor(type, opts) {
    var cid = ((opts && opts.campaign) || DEFAULT_CAMPAIGN);
    var c = CAMPAIGNS[cid];
    return 'pf-' + (c ? c.file : 'campaign') + '-' + type + '.png';
  }
  function shareTextFor(type, opts) {
    var cid = ((opts && opts.campaign) || DEFAULT_CAMPAIGN);
    var c = CAMPAIGNS[cid];
    return (c ? c.label : 'JOIN THE FIGHT.') + ' \u2014 JOIN THE FIGHT. mtcstw.com';
  }
  function canvasToBlob(cv, done) {
    try {
      if (cv.toBlob) { cv.toBlob(done, 'image/png'); return; }
      /* Ancient fallback: dataURL -> blob. */
      var du = cv.toDataURL('image/png');
      var parts = du.split(','), mime = parts[0].match(/:(.*?);/)[1],
          bin = atob(parts[1]), arr = new Uint8Array(bin.length), i;
      for (i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      done(new Blob([arr], { type: mime }));
    } catch (e) { done(null); }
  }
  function downloadBlob(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {}
      }, 4000);
    } catch (e) {
      toast('Download blocked \u2014 try a different browser.');
    }
  }
  /* Share a card. Must be called from a user gesture. */
  function shareCard(type, opts, shareOpts) {
    shareOpts = shareOpts || {};
    var cv = makeCard(type, opts);
    if (!cv) { toast('Card failed \u2014 try again.'); return; }
    /* Callsign stamp when PFShare is on the page (matches share-image.js). */
    try { if (window.PFShare && PFShare.stampCallsign) cv = PFShare.stampCallsign(cv) || cv; } catch (e) {}
    var filename = fileNameFor(type, opts);
    canvasToBlob(cv, function (blob) {
      if (!blob) { toast('Card failed \u2014 try again.'); return; }
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({
            files: [file],
            title: shareOpts.title || 'Propaganda Factory',
            text: shareOpts.text || shareTextFor(type, opts)
          }).then(
            function () { toast('Shared. Go spread the word.'); },
            function (err) {
              if (err && err.name === 'AbortError') { toast('Share cancelled.'); return; }
              downloadBlob(blob, filename);
              toast('Image downloaded.');
            });
        } catch (e) {
          downloadBlob(blob, filename);
          toast('Image downloaded.');
        }
        return;
      }
      if (isIOS()) {
        /* iOS Safari ignores the download attribute: open the image so the
           user can long-press -> Save to Photos, one tap into the camera roll. */
        try {
          var url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          toast('Long-press the image \u2192 Save to Photos.');
        } catch (e) { toast('Share unavailable \u2014 try again.'); }
        return;
      }
      downloadBlob(blob, filename);
      toast('Image downloaded.');
    });
  }
  function downloadCard(type, opts) {
    var cv = makeCard(type, opts);
    if (!cv) { toast('Card failed \u2014 try again.'); return; }
    try { if (window.PFShare && PFShare.stampCallsign) cv = PFShare.stampCallsign(cv) || cv; } catch (e) {}
    var filename = fileNameFor(type, opts);
    canvasToBlob(cv, function (blob) {
      if (!blob) { toast('Card failed \u2014 try again.'); return; }
      if (isIOS()) {
        var file = null;
        try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            navigator.share({ files: [file], title: 'Save to Photos' }).then(
              function () { toast('Saved. Check your Photos.'); },
              function () { toast('Save cancelled \u2014 try again.'); });
          } catch (e) { toast('Could not open save sheet \u2014 try again.'); }
          return;
        }
        try { window.open(URL.createObjectURL(blob), '_blank'); toast('Long-press the image \u2192 Save to Photos.'); }
        catch (e) { toast('Save failed \u2014 try again.'); }
        return;
      }
      downloadBlob(blob, filename);
      toast('Image saved to your phone.');
    });
  }

  /* ---------------------------------------------------------------- */
  /* Widget: preview + Share + Download buttons (FIGHT face)           */
  /* ---------------------------------------------------------------- */
  var WIDGET_CSS = [
    '.pf-cs-widget{max-width:560px;margin:24px auto;text-align:center}',
    '.pf-cs-tabs{margin:0 0 14px}',
    '.pf-cs-tab{background:none;border:2px solid #5a5344;color:#c9bfa8;font:700 13px ' + BODY + ';letter-spacing:2px;padding:10px 16px;margin:0 4px;cursor:pointer;text-transform:uppercase}',
    '.pf-cs-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}',
    '.pf-cs-canvas{max-width:100%;height:auto;border:2px solid #c1121f;display:block;margin:0 auto;background:#0b0b0c}',
    '.pf-cs-btns{margin-top:14px}',
    '.pf-cs-btn{display:inline-block;background:#c1121f;color:#fff;border:0;padding:14px 28px;font:900 15px ' + HEAD + ';letter-spacing:2px;cursor:pointer;text-transform:uppercase;margin:5px;text-decoration:none}',
    '.pf-cs-btn.ghost{background:none;border:2px solid #f5ead6;color:#f5ead6}',
    '.pf-cs-note{color:#8a8471;font:400 13px ' + BODY + ';margin-top:10px}'
  ].join('\n');

  function mountWidget(el, type, opts) {
    if (!el) return;
    opts = opts || {};
    if (!document.getElementById('pf-cs-style')) {
      var st = document.createElement('style');
      st.id = 'pf-cs-style';
      st.textContent = WIDGET_CSS;
      document.head.appendChild(st);
    }
    var tabs = ['wanted', 'quote', 'stats'];
    var tabNames = { wanted: 'Wanted', quote: 'Quote', stats: 'Rally' };
    var cur = PAINTERS[type] ? type : 'wanted';
    var box = document.createElement('div');
    box.className = 'pf-cs-widget';
    var tabRow = document.createElement('div');
    tabRow.className = 'pf-cs-tabs';
    var i;
    for (i = 0; i < tabs.length; i++) {
      (function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-cs-tab' + (t === cur ? ' on' : '');
        b.textContent = tabNames[t];
        b.setAttribute('data-cs-tab', t);
        b.onclick = function () {
          cur = t;
          var bs = tabRow.querySelectorAll('.pf-cs-tab'), j;
          for (j = 0; j < bs.length; j++) bs[j].classList.toggle('on', bs[j].getAttribute('data-cs-tab') === t);
          render();
        };
        tabRow.appendChild(b);
      })(tabs[i]);
    }
    box.appendChild(tabRow);
    var cvWrap = document.createElement('div');
    box.appendChild(cvWrap);
    var btnRow = document.createElement('div');
    btnRow.className = 'pf-cs-btns';
    var shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'pf-cs-btn';
    shareBtn.textContent = 'Share';
    shareBtn.onclick = function () { shareCard(cur, opts); };
    var dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'pf-cs-btn ghost';
    dlBtn.textContent = 'Download';
    dlBtn.onclick = function () { downloadCard(cur, opts); };
    btnRow.appendChild(shareBtn);
    btnRow.appendChild(dlBtn);
    box.appendChild(btnRow);
    var note = document.createElement('div');
    note.className = 'pf-cs-note';
    note.textContent = 'Pick a card, share it everywhere. JOIN THE FIGHT.';
    box.appendChild(note);
    el.innerHTML = '';
    el.appendChild(box);
    function render() {
      var cv = makeCard(cur, opts);
      cvWrap.innerHTML = '';
      if (cv) {
        cv.className = 'pf-cs-canvas';
        cvWrap.appendChild(cv);
      } else {
        cvWrap.textContent = 'Card failed \u2014 try again.';
      }
    }
    render();
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */
  window.PFCampaignShare = {
    makeCard: makeCard,
    shareCard: shareCard,
    downloadCard: downloadCard,
    mountWidget: mountWidget,
    CAMPAIGNS: CAMPAIGNS,
    SIZES: { card: [W, H] },
    /* Register painters on PFShare so macro-share flows can reach them. */
    register: function () {
      try {
        if (window.PFShare && PFShare.setPoster) {
          var types = ['wanted', 'quote', 'stats'], i;
          for (i = 0; i < types.length; i++) {
            (function (t) {
              PFShare.setPoster('campaign-' + t, function (done) {
                try { done(makeCard(t, {})); } catch (e) { try { done(null); } catch (e2) {} }
              });
            })(types[i]);
          }
        }
      } catch (e) {}
    }
  };

  /* Auto-mount: any element with [data-pf-campaign-share] gets the widget.
     data-campaign-card="wanted|quote|stats" selects the starting card. */
  function autoMount() {
    var els = document.querySelectorAll('[data-pf-campaign-share]'), i;
    for (i = 0; i < els.length; i++) {
      (function (el) {
        if (el.getAttribute('data-pf-cs-mounted')) return;
        el.setAttribute('data-pf-cs-mounted', '1');
        mountWidget(el, el.getAttribute('data-campaign-card') || 'wanted', {});
      })(els[i]);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.PFCampaignShare.register();
      autoMount();
    });
  } else {
    window.PFCampaignShare.register();
    autoMount();
  }
})();
