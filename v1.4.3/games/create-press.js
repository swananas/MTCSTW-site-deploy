/* games/create-press.js  |  PF v1.4.3 | TEARDOWN WS-4 (2026-10-06): CREATE — THE PRINT SHOP.
   Template-first creation per the section-teardown proposal PART 2 §4
   (CEO-approved 2026-10-06). The workshop is the print shop: cause-loaded
   template kits — the press, already inked. Creation is "swap one line,
   tap share."

   FLOW: P1 Briefing Hero -> template picker ORGANIZED BY FIGHT (not format)
   -> slot-filling editor (the user edits the MESSAGE, never the layout) ->
   instant full-screen preview -> P6 Action Bar
   (SHARE THIS INTEL · TAKE THIS TO YOUR CELL · REPORT BACK).

   NEVER a blank canvas: the picker is the only entry point. The painter only
   runs from a chosen kit; there is no empty-editor path in this module.

   MASTERY PATH (Psych): visible progression — KIT UNLOCKS -> ADVANCED TRACKS
   -> SPOTLIGHT SLOTS. Progress is a device-local run count
   ('pf_press_runs_v1'); the P5 ring is render-only. Zero XP mechanics
   (no xpGrant, no pf-xp dispatch, no creditLocal), zero backend writes
   (no fetch/XHR/beacon/authPost — this module never touches the network).

   GATES: Brand CTA discipline — the create action is DEPLOY -> (red
   deployBtn, the only red button in the module); kit cards use text links.
   JOIN THE FIGHT. appears only in the hero (enlistment) and on the painted
   poster per the share-image CTA standard. News Desk red-button rule —
   dismissals/backs render ghost (never red). P8 social proof: real
   device-local count or suppressed.

   KILL: ?pf_off=create-press  or  localStorage pf_disabled_v1='["create-press"]'
   Fail-open: the module renders nothing on any failure, never throws. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('create-press')) { return; }

  function err(m) { try { PF.error('create-press', m); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* fail-open wrapper: helpers render nothing on failure, never throw */
  function safe(fn, name) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (e) { err(name + ' failed: ' + (e && e.message)); return null; }
    };
  }

  var P = PF.patterns; /* PF.patterns is upstream of this module in bundle-core */

  /* ============ 1. TEMPLATES ORGANIZED BY FIGHT (not format) ============ */
  /* A kit = fixed layout + editable message slots. The user edits the slots;
     the layout is never editable. 'adv' kits are ADVANCED TRACKS (gated by
     the mastery path); 'base' kits are the starting armory. */
  var FIGHTS = [
    {
      id: 'call-your-rep', name: 'CALL YOUR REP',
      desc: 'Scripts and vote trackers. Ring the phone off the hook.',
      kits: [
        { id: 'rep-script', name: 'THE SCRIPT', adv: false,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'CALL YOUR REP' },
            { key: 'headline', label: 'Headline', def: 'THEY VOTE. YOU PAY.' },
            { key: 'rep', label: 'Rep + number', def: 'REP [NAME] — (202) [NUMBER]' },
            { key: 'script', label: 'Your script', def: 'Hi, I am a constituent. Vote NO on the billionaire bailout. I am watching.' }
          ] },
        { id: 'name-the-vote', name: 'NAME THE VOTE', adv: true,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'ON THE RECORD' },
            { key: 'headline', label: 'Headline', def: '[BILL NAME]' },
            { key: 'verdict', label: 'How they voted', def: 'YOUR REP VOTED YES.' },
            { key: 'line', label: 'The line', def: 'THEY CHOSE THE LOBBYISTS. REMEMBER IN NOVEMBER.' }
          ] }
      ]
    },
    {
      id: 'price-spike', name: 'PRICE SPIKE',
      desc: 'Receipts from the robbery. Photograph the gouging.',
      kits: [
        { id: 'the-receipt', name: 'THE RECEIPT', adv: false,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'PRICE SPIKE' },
            { key: 'headline', label: 'The item', def: 'EGGS' },
            { key: 'old', label: 'Used to cost', def: '$2.99' },
            { key: 'new', label: 'Costs now', def: '$5.49' },
            { key: 'line', label: 'The line', def: 'THEY CALL IT INFLATION. IT IS PRICE GOUGING.' }
          ] },
        { id: 'gas-gouge', name: 'GAS GOUGE', adv: true,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'AT THE PUMP' },
            { key: 'headline', label: 'Price per gallon', def: '$3.89' },
            { key: 'line', label: 'The line', def: 'PROFITS UP. YOUR TANK EMPTY.' }
          ] }
      ]
    },
    {
      id: 'cell-recruit', name: 'CELL RECRUIT',
      desc: 'Bring people in. Five callsigns, one streak.',
      kits: [
        { id: 'join-the-squad', name: 'JOIN THE SQUAD', adv: false,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'CELL RECRUIT' },
            { key: 'headline', label: 'Headline', def: 'FIVE PEOPLE. ONE STREAK.' },
            { key: 'pitch', label: 'The pitch', def: 'WE MEET THURSDAYS. WE SHOW UP. WE WIN.' },
            { key: 'line', label: 'The line', def: 'NOBODY GETS LEFT BEHIND.' }
          ] },
        { id: 'bring-a-friend', name: 'BRING A FRIEND', adv: true,
          slots: [
            { key: 'kicker', label: 'Kicker', def: 'RECRUIT' },
            { key: 'headline', label: 'Headline', def: 'FORWARD THIS TO ONE PERSON.' },
            { key: 'line', label: 'The line', def: 'THE MOVEMENT IS ONE TEXT AWAY.' }
          ] }
      ]
    }
  ];

  /* ============ 2. MASTERY PATH (display-only, device-local) ============ */
  var LS_RUNS = 'pf_press_runs_v1';
  var TIERS = [
    { min: 0,  name: 'PRESS OPERATIVE', desc: 'KIT UNLOCKS — two press kits per fight.' },
    { min: 3,  name: 'PRESS SERGEANT',  desc: 'ADVANCED TRACKS — the full armory opens.' },
    { min: 10, name: 'SPOTLIGHT ELIGIBLE', desc: 'SPOTLIGHT SLOTS — show a cell leader your work.' }
  ];
  function runs() {
    try { return Math.max(0, parseInt(localStorage.getItem(LS_RUNS) || '0', 10) || 0); }
    catch (e) { return 0; }
  }
  function bumpRuns() {
    try { localStorage.setItem(LS_RUNS, String(runs() + 1)); } catch (e) {}
  }
  function tierFor(n) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) { if (n >= TIERS[i].min) t = TIERS[i]; }
    return t;
  }
  function nextTier(n) {
    for (var i = 0; i < TIERS.length; i++) { if (n < TIERS[i].min) return TIERS[i]; }
    return null;
  }
  function kitUnlocked(kit, n) { return !kit.adv || n >= TIERS[1].min; }

  function masteryHtml() {
    var n = runs(), tier = tierFor(n), next = nextTier(n);
    var h = '<div class="pf-press-path">';
    h += '<p class="pf-press-path-k">MASTERY PATH</p>';
    h += '<div class="pf-press-path-row">' +
      '<div>' + P.ring({ xp: n, cap: next ? next.min : (n + 1), rank: tier.name, size: 84 }) + '</div>' +
      '<div class="pf-press-path-steps">';
    for (var i = 0; i < TIERS.length; i++) {
      var on = n >= TIERS[i].min;
      h += '<p class="pf-press-step' + (on ? ' on' : '') + '"><b>' + esc(TIERS[i].name) + '</b><br>' +
        esc(TIERS[i].desc) + '</p>';
    }
    h += '</div></div>';
    /* P8: real count or suppressed — the device-local run count is a real number */
    h += P.proof({ count: n, text: 'press runs on this device' });
    h += '</div>';
    return h;
  }

  /* ============ 3. POSTER PAINTER (fixed layout; message slots only) ============ */
  var W = 1080, H = 1350;
  function paint(kit, values, photo) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    /* ground */
    x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, W, H);
    /* photo background, darkened so the ink stays readable */
    if (photo) {
      try {
        var s = Math.max(W / photo.width, H / photo.height);
        var dw = photo.width * s, dh = photo.height * s;
        x.globalAlpha = 0.42;
        x.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
        x.globalAlpha = 1;
      } catch (e) {}
    }
    /* red top rule — the brand's unit of thought */
    x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, 26);
    x.fillStyle = '#f5ead6'; x.textAlign = 'center';
    /* kicker */
    var val = function (k) { return String(values[k] == null ? '' : values[k]).trim(); };
    x.font = '800 44px Arial, sans-serif';
    x.fillStyle = '#c1121f';
    wrap(x, val('kicker') || kit.slots[0].def, W / 2, 120, W - 160, 52);
    /* headline — the dominant figure */
    x.fillStyle = '#f5ead6';
    x.font = '900 118px "Arial Black", Arial, sans-serif';
    var size = fitHead(x, val('headline') || kit.slots[1].def, W - 140, 300, 118);
    x.font = '900 ' + size + 'px "Arial Black", Arial, sans-serif';
    wrap(x, val('headline') || kit.slots[1].def, W / 2, 300, W - 140, size * 1.12);
    /* remaining slots as body lines */
    x.font = '700 44px Arial, sans-serif';
    var y = 660;
    for (var i = 2; i < kit.slots.length; i++) {
      y = wrap(x, val(kit.slots[i].key) || kit.slots[i].def, W / 2, y, W - 160, 58) + 56;
      if (y > 1060) break;
    }
    /* share-image CTA standard: JOIN THE FIGHT. (red, bold) + MTCSTW.COM */
    x.fillStyle = '#c1121f';
    x.font = '900 52px Arial, sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, 1170);
    x.fillStyle = '#f5ead6';
    x.font = '800 56px Arial, sans-serif';
    x.fillText('MTCSTW.COM', W / 2, 1240);
    return cv;
  }
  function wrap(x, text, cx, y, maxW, lh) {
    var words = String(text).split(/\s+/), lines = [''], li = 0;
    for (var i = 0; i < words.length; i++) {
      var t = (lines[li] + ' ' + words[i]).trim();
      if (x.measureText(t).width > maxW && lines[li]) { lines.push(words[i]); li++; }
      else lines[li] = t;
    }
    for (var j = 0; j < lines.length; j++) x.fillText(lines[j], cx, y + j * lh);
    return y + (lines.length - 1) * lh;
  }
  function fitHead(x, text, maxW, maxSize, minSize) {
    var s = maxSize;
    while (s > minSize) {
      x.font = '900 ' + s + 'px "Arial Black", Arial, sans-serif';
      if (x.measureText(text).width <= maxW) return s;
      s -= 6;
    }
    return minSize;
  }

  /* ============ 4. VIEWS: picker -> editor -> full-screen preview ============ */
  var CSS_INJECTED = false;
  function injectCss() {
    if (CSS_INJECTED) return; CSS_INJECTED = true;
    var css =
      '.pf-press{font-family:Arial,sans-serif;color:#f5ead6;max-width:720px;margin:0 auto;padding:0 12px 40px}' +
      '.pf-press-fight{margin:26px 0}' +
      '.pf-press-fight-k{font-size:12px;letter-spacing:5px;color:#c1121f;font-weight:800;margin:0 0 4px}' +
      '.pf-press-fight-d{font-size:13px;color:#8a8a8a;margin:0 0 12px;line-height:1.5}' +
      '.pf-press-kits{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.pf-press-kit{background:#0a0a0a;border:2px solid #2a2a2a;border-top:4px solid #c1121f;padding:16px 12px;text-align:center;min-height:44px}' +
      '.pf-press-kit b{display:block;font-family:"Arial Black",Arial,sans-serif;font-size:14px;letter-spacing:2px;margin-bottom:6px}' +
      '.pf-press-kit.locked{opacity:.55;border-top-color:#2a2a2a}' +
      '.pf-press-kit .lockline{font-size:11px;color:#8a8a8a;margin-top:8px;line-height:1.5}' +
      '.pf-press-path{margin:18px 0;border:1px solid #2a2a2a;background:#0a0a0a;padding:14px}' +
      '.pf-press-path-k{font-size:11px;letter-spacing:4px;color:#c1121f;font-weight:800;margin:0 0 10px}' +
      '.pf-press-path-row{display:flex;gap:14px;align-items:flex-start}' +
      '.pf-press-step{font-size:12px;color:#8a8a8a;line-height:1.45;margin:0 0 8px}' +
      '.pf-press-step.on{color:#f5ead6}' +
      '.pf-press-ed label{display:block;margin:14px 0 4px;font-size:12px;letter-spacing:2px;color:#8a8a8a;font-weight:800}' +
      '.pf-press-ed textarea{width:100%;box-sizing:border-box;background:#141414;color:#f5ead6;border:2px solid #3a3a3a;border-radius:3px;font-size:18px;line-height:1.4;padding:12px;min-height:64px;font-family:Arial,sans-serif}' +
      '.pf-press-ed textarea:focus{border-color:#c1121f;outline:none}' +
      '.pf-press-photo{display:block;width:100%;box-sizing:border-box;background:#141414;border:2px dashed #3a3a3a;color:#f5ead6;font-size:16px;padding:18px;text-align:center;cursor:pointer;margin-top:14px;min-height:44px}' +
      '.pf-press-ov{position:fixed;inset:0;z-index:99990;background:rgba(5,5,5,.97);overflow-y:auto;padding:18px 12px 40px;box-sizing:border-box}' +
      '.pf-press-ov canvas{display:block;width:100%;max-width:520px;height:auto;margin:0 auto 18px;border:2px solid #2a2a2a}' +
      '.pf-press-ov .pf-pat-actions{max-width:520px;margin:0 auto}' +
      '.pf-press-ghost{display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5ead6;font-weight:800;letter-spacing:2px;padding:10px 18px;cursor:pointer;border-radius:3px;min-height:44px;font-family:Arial,sans-serif}' +
      '.pf-press-runrow{margin:22px 0;text-align:center}';
    try {
      var st = document.createElement('style');
      st.setAttribute('data-pf-press', '1');
      st.textContent = css;
      document.head.appendChild(st);
    } catch (e) { err('css inject failed'); }
  }

  function findKit(id) {
    for (var f = 0; f < FIGHTS.length; f++)
      for (var k = 0; k < FIGHTS[f].kits.length; k++)
        if (FIGHTS[f].kits[k].id === id) return FIGHTS[f].kits[k];
    return null;
  }

  var mount = safe(function (section) {
    if (!section || !P || !P.hero || !P.actionBar) return; /* fail-open */
    injectCss();
    renderPicker(section);
  }, 'mount');

  /* ---- stage 1: template picker, organized by FIGHT ---- */
  var renderPicker = safe(function (section) {
    var n = runs();
    var h = P.hero({
      kicker: 'CREATE — THE PRINT SHOP',
      mission: 'Grab a press kit. Swap one line. Pump it everywhere.',
      joinHref: '/#pf-ranks'
    });
    h += masteryHtml();
    for (var f = 0; f < FIGHTS.length; f++) {
      var fg = FIGHTS[f];
      h += '<div class="pf-press-fight">' +
        '<p class="pf-press-fight-k">' + esc(fg.name) + '</p>' +
        '<p class="pf-press-fight-d">' + esc(fg.desc) + '</p>' +
        '<div class="pf-press-kits">';
      for (var k = 0; k < fg.kits.length; k++) {
        var kit = fg.kits[k], un = kitUnlocked(kit, n);
        if (un) {
          /* card action = text link (CTA discipline) */
          h += '<div class="pf-press-kit"><b>' + esc(kit.name) + '</b>' +
            P.textLink('#pf-press-kit-' + kit.id, 'USE THIS KIT') + '</div>';
        } else {
          var need = TIERS[1].min - n;
          h += '<div class="pf-press-kit locked"><b>' + esc(kit.name) + '</b>' +
            '<p class="lockline">ADVANCED TRACK — run ' + need + ' more press' +
            (need === 1 ? '' : 'es') + ' to unlock.</p></div>';
        }
      }
      h += '</div></div>';
    }
    section.innerHTML = '<div class="pf-press">' + h + '</div>';
  }, 'renderPicker');

  /* ---- stage 2: slot-filling editor (message only, never layout) ---- */
  var currentKit = null, currentVals = {}, currentPhoto = null;
  var renderEditor = safe(function (section, kit) {
    currentKit = kit; currentVals = {}; currentPhoto = null;
    var coarse = false;
    try { coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches; } catch (e) {}
    var h = '<div class="pf-press pf-press-ed">' +
      '<p class="pf-press-fight-k">' + esc(kit.name) + '</p>' +
      '<p class="pf-press-fight-d">Edit the message. The layout is already inked.</p>';
    for (var i = 0; i < kit.slots.length; i++) {
      var s = kit.slots[i];
      h += '<label for="pfp-' + esc(s.key) + '">' + esc(s.label.toUpperCase()) + '</label>' +
        '<textarea id="pfp-' + esc(s.key) + '" data-slot="' + esc(s.key) + '">' +
        esc(s.def) + '</textarea>';
    }
    /* camera-first on mobile: capture opens the camera; desktop gets a picker */
    h += '<label class="pf-press-photo" for="pfp-photo">' +
      (coarse ? '&#128247; ADD A PHOTO (camera first)' : '&#128247; ADD A PHOTO (optional)') +
      '<input type="file" id="pfp-photo" accept="image/*"' +
      (coarse ? ' capture="environment"' : '') + ' style="display:none"></label>';
    /* DEPLOY -> = the create action (red deployBtn — the only red button here) */
    h += '<div class="pf-press-runrow">' +
      P.deployBtn('#pf-press-run', 'RUN THE PRESS') + '</div>';
    /* News Desk red-button rule: backs and dismissals render ghost, never red */
    h += '<div style="text-align:center"><button type="button" class="pf-press-ghost" ' +
      'data-back="1">BACK TO KITS</button></div>';
    h += '</div>';
    section.innerHTML = h;
    var photo = section.querySelector('#pfp-photo');
    if (photo) photo.addEventListener('change', function () {
      var f = photo.files && photo.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () { currentPhoto = img; try { URL.revokeObjectURL(img.src); } catch (e) {} };
      try { img.src = URL.createObjectURL(f); } catch (e) {}
    });
  }, 'renderEditor');

  /* ---- stage 3: instant full-screen preview + P6 Action Bar ---- */
  var renderPreview = safe(function (section) {
    if (!currentKit) return;
    /* gather slot values */
    var vals = {};
    for (var i = 0; i < currentKit.slots.length; i++) {
      var el = section.querySelector('[data-slot="' + currentKit.slots[i].key + '"]');
      vals[currentKit.slots[i].key] = el ? el.value : currentKit.slots[i].def;
    }
    var cv = paint(currentKit, vals, currentPhoto);
    if (!cv) return; /* fail-open: no poster, no preview */
    bumpRuns(); /* a completed press run — device-local only */
    var ov = document.createElement('div');
    ov.className = 'pf-press-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Press preview');
    ov.appendChild(cv);
    /* P6 Action Bar: SHARE THIS INTEL (native share sheet) · TAKE THIS TO
       YOUR CELL -> /cells · REPORT BACK -> the daily check-in (a press run
       that completes a mission closes the loop there) */
    var bar = document.createElement('div');
    bar.innerHTML = P.actionBar({
      shareUrl: '#pf-press-share',
      cellUrl: '/cells',
      reportUrl: '/#pf-orders'
    });
    ov.appendChild(bar);
    var close = document.createElement('div');
    close.style.cssText = 'text-align:center;margin-top:16px';
    close.innerHTML = '<button type="button" class="pf-press-ghost">BACK TO KITS</button>';
    ov.appendChild(close);
    document.body.appendChild(ov);
    currentVals = vals;
  }, 'renderPreview');

  /* native share sheet for the painted poster; download fallback */
  function sharePoster(cv, title) {
    var done = function () {};
    try {
      if (cv.toBlob) {
        cv.toBlob(function (blob) {
          if (!blob) return;
          var file = null;
          try { file = new File([blob], 'pfn-press.png', { type: 'image/png' }); } catch (e) {}
          if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ title: title, text: title + ' — via The Propaganda Factory', files: [file] })
              .catch(function () {});
            return;
          }
          if (file && navigator.share && !navigator.canShare) {
            navigator.share({ title: title, text: title + ' — via The Propaganda Factory' }).catch(function () {});
            return;
          }
          /* fallback: download the poster */
          try {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'pfn-press.png';
            document.body.appendChild(a); a.click();
            setTimeout(function () { try { document.body.removeChild(a); } catch (e) {} }, 4000);
          } catch (e) {}
        }, 'image/png');
      }
    } catch (e) { err('share failed: ' + (e && e.message)); }
    return done;
  }

  /* delegated clicks: kit links, RUN THE PRESS, share, backs */
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document && t.tagName !== 'A' && t.tagName !== 'BUTTON') t = t.parentNode;
    if (!t || t === document) return;
    var href = t.getAttribute && t.getAttribute('href');
    var section = document.querySelector('.pf-press');
    var host = section && section.parentNode;
    /* kit pick (text link -> editor) */
    if (href && href.indexOf('#pf-press-kit-') === 0) {
      e.preventDefault();
      var kit = findKit(href.slice('#pf-press-kit-'.length));
      if (kit && host) renderEditor(host, kit);
      return;
    }
    /* RUN THE PRESS (DEPLOY ->) -> full-screen preview */
    if (href === '#pf-press-run') {
      e.preventDefault();
      if (host) renderPreview(host);
      return;
    }
    /* SHARE THIS INTEL -> native share sheet */
    if (href === '#pf-press-share') {
      e.preventDefault();
      var ov = t;
      while (ov && !ov.classList.contains('pf-press-ov')) ov = ov.parentNode;
      var cv = ov && ov.querySelector('canvas');
      sharePoster(cv, currentKit ? currentKit.name : 'THE PRINT SHOP');
      return;
    }
    /* ghost backs (News Desk red-button rule: never red) */
    if (t.getAttribute && t.getAttribute('data-back') === '1') {
      if (host) renderPicker(host);
      return;
    }
    if (t.classList && t.classList.contains('pf-press-ghost')) {
      var ov2 = t;
      while (ov2 && !ov2.classList.contains('pf-press-ov')) ov2 = ov2.parentNode;
      if (ov2 && ov2.parentNode) ov2.parentNode.removeChild(ov2);
      return;
    }
  });

  /* public mount API for the workshop adapter (pages/workshop-create.js) */
  window.PFPress = { mount: mount, _fights: FIGHTS, _tiers: TIERS, _runs: runs };
})();
