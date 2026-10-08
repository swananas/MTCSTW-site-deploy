/* core/35-sharein.js  |  PF v1.4.3 | SHARE-IN.
   CEO directive 2026-10-06: let the outside world flow INTO the site.
   Two doors, one composer:
     1. Deep link  — https://www.mtcstw.com/?sharein=<encoded-url>&text=...&title=...
        (&type=photo for a photo share; &type=receipt|price|propaganda skips the picker)
     2. PWA Web Share Target (GET) — action https://www.mtcstw.com/?sharein=1
        with params title/text/url (see pwa/manifest.json). File-share
        (method POST + share_target.files) is a documented follow-up, not
        this release — see docs/SHARE_IN.md.
   On load, if the params are present, they are stripped from the URL
   (history.replaceState, other params preserved) and the inbound draft
   composer opens. ALL inbound shares land as DRAFTS — nothing posts,
   publishes, or uploads without the user's explicit confirm tap. Drafts are
   device-local (localStorage pf_sharein_drafts_v1) until confirmed, and
   confirmed actions reuse existing flows only: the outward share pipeline
   (PFShareEverywhere.networks), the Create workshop (PFWorkshop.open), and
   device-local cell-feed drafts with a hand-off to /cells.
   ZERO XP by design: this module never touches the XP ledger, never calls
   postAction, never fetches. No backend writes, period.
   Fail-open: bad or missing params open the composer with empty fields —
   never a crash. Every string interpolated into markup goes through esc().
   KILL: ?pf_off=35-sharein  or  localStorage pf_disabled_v1='["35-sharein"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('35-sharein') || window.pfShareInDone) return;
  window.pfShareInDone = true;

  var DRAFT_KEY = 'pf_sharein_drafts_v1';
  var DRAFT_CAP = 25;
  /* Share-in params are consumed and stripped; everything else is preserved. */
  var CONSUME_KEYS = { sharein: 1, url: 1, text: 1, title: 1, type: 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(m) { try { if (PF.toast) PF.toast(m); } catch (e) {} }
  function tryst(fn, dflt) { try { var r = fn(); return r == null ? dflt : r; } catch (e) { return dflt; } }

  /* ---------- param parsing (fail-open) ---------- */
  function parseParams(qs) {
    var out = {};
    try {
      var q = String(qs == null ? window.location.search : qs);
      if (q.charAt(0) === '?') q = q.slice(1);
      q.split('&').forEach(function (pair) {
        if (!pair) return;
        var i = pair.indexOf('=');
        var k = i < 0 ? pair : pair.slice(0, i);
        var v = i < 0 ? '' : pair.slice(i + 1);
        try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { return; }
        try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { v = ''; }
        out[k] = v;
      });
    } catch (e) {}
    return out;
  }
  function looksUrl(s) { return /^(https?:\/\/|www\.)/i.test(String(s || '').trim()); }

  function parse(search) {
    var p = parseParams(search);
    if (!Object.prototype.hasOwnProperty.call(p, 'sharein')) return null;
    var raw = String(p.sharein || '');
    var url = '', text = String(p.text || ''), title = String(p.title || '');
    var type = String(p.type || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 20);
    if (raw === '1' || raw === '') {
      /* Web Share Target GET mode: the payload rides on title/text/url. */
      url = String(p.url || '');
      if (!url && looksUrl(text)) { url = text; text = ''; }
    } else {
      url = raw;
      if (!looksUrl(url) && looksUrl(text)) { var t = url; url = text; text = t; }
    }
    url = String(url || '').trim().slice(0, 2000);
    text = String(text || '').trim().slice(0, 500);
    title = String(title || '').trim().slice(0, 160);
    if (!looksUrl(url)) url = '';
    var kind = 'link';
    if (type === 'photo' || type === 'image') kind = 'photo';
    else if (type === 'receipt' || type === 'price' || type === 'propaganda') kind = 'photo';
    return { url: url, text: text, title: title, type: type, kind: kind };
  }

  /* Strip share-in params from the URL, preserving everything else. */
  function stripParams() {
    try {
      var p = parseParams(window.location.search);
      var kept = [];
      Object.keys(p).forEach(function (k) {
        if (!CONSUME_KEYS[k]) {
          kept.push(encodeURIComponent(k) + '=' + encodeURIComponent(p[k]));
        }
      });
      var base = String(window.location.pathname || '/');
      var hash = String(window.location.hash || '');
      var next = base + (kept.length ? '?' + kept.join('&') : '') + hash;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', next);
      }
    } catch (e) {}
  }

  /* ---------- drafts (device-local; no backend) ---------- */
  function readDrafts() {
    return tryst(function () {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(d) ? d : [];
    }, []);
  }
  function writeDrafts(ds) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify((ds || []).slice(0, DRAFT_CAP))); } catch (e) {}
  }
  function newId() {
    return 'si_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }
  function saveDraft(d) {
    if (!d) return null;
    var ds = readDrafts().filter(function (x) { return x && x.id !== d.id; });
    d.id = d.id || newId();
    d.savedAt = Date.now();
    ds.unshift(d);
    writeDrafts(ds);
    return d;
  }
  function deleteDraft(id) {
    writeDrafts(readDrafts().filter(function (x) { return x && x.id !== id; }));
  }

  /* ---------- modal shell ---------- */
  var CSS = [
    '.pf-sharein{position:fixed;inset:0;z-index:99990;font-family:Arial,Helvetica,sans-serif;}',
    '.pf-sharein-back{position:absolute;inset:0;background:rgba(0,0,0,.82);}',
    '.pf-sharein-sheet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);',
    ' width:min(92vw,460px);max-height:92vh;overflow-y:auto;background:#0a0a0a;color:#f2f2f2;',
    ' border:2px solid #c81e1e;border-radius:10px;padding:18px 16px 14px;box-sizing:border-box;}',
    '.pf-sharein-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}',
    '.pf-sharein-head h2{margin:0;color:#e5383b;font-size:1.05rem;letter-spacing:.12em;}',
    '.pf-sharein-x{background:none;border:1px solid #555;color:#ccc;border-radius:6px;',
    ' font-size:1rem;padding:2px 10px;cursor:pointer;}',
    '.pf-sharein-prev{background:#141414;border:1px solid #333;border-radius:8px;',
    ' padding:10px;margin-bottom:10px;font-size:.85rem;word-break:break-word;}',
    '.pf-sharein-prev .pf-sharein-title{color:#fff;font-weight:bold;display:block;margin-bottom:4px;}',
    '.pf-sharein-prev a{color:#e05252;}',
    '.pf-sharein-prev .pf-sharein-photo{font-size:2rem;}',
    '.pf-sharein label{display:block;font-size:.72rem;letter-spacing:.14em;color:#999;margin:8px 0 4px;}',
    '.pf-sharein textarea{width:100%;box-sizing:border-box;background:#161616;color:#eee;',
    ' border:1px solid #444;border-radius:8px;min-height:64px;padding:8px;font-family:Arial,sans-serif;}',
    '.pf-sharein-btns{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}',
    '.pf-sharein-btn{flex:1;min-width:130px;background:#c81e1e;color:#fff;border:0;border-radius:8px;',
    ' font-weight:bold;letter-spacing:.06em;padding:12px 8px;cursor:pointer;font-size:.85rem;}',
    '.pf-sharein-btn.ghost{background:#1c1c1c;border:1px solid #555;color:#ddd;}',
    '.pf-sharein-btn:disabled{opacity:.45;cursor:default;}',
    '.pf-sharein-note{margin-top:10px;font-size:.72rem;color:#888;letter-spacing:.04em;}',
    '.pf-sharein-note b{color:#e5383b;}',
    '.pf-sharein-drafts{margin-top:14px;border-top:1px solid #2a2a2a;padding-top:10px;}',
    '.pf-sharein-drafts h3{margin:0 0 8px;font-size:.75rem;letter-spacing:.14em;color:#999;}',
    '.pf-sharein-draft{display:flex;justify-content:space-between;align-items:center;',
    ' background:#141414;border:1px solid #2c2c2c;border-radius:8px;padding:8px;margin-bottom:6px;font-size:.78rem;}',
    '.pf-sharein-draft .pf-sharein-dtxt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;}',
    '.pf-sharein-draft button{background:none;border:1px solid #555;color:#ddd;border-radius:6px;',
    ' padding:4px 8px;cursor:pointer;font-size:.72rem;margin-left:6px;}',
    '.pf-sharein-pick{display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px;}',
    '.pf-sharein-step{margin-top:12px;}',
    '.pf-sharein-step h3{margin:0 0 6px;font-size:.8rem;letter-spacing:.1em;color:#e5383b;}',
    '.pf-sharein-step p{font-size:.82rem;color:#bbb;margin:0 0 8px;line-height:1.45;}'
  ].join('\n');

  function ensureCss() {
    try {
      if (document.getElementById('pf-sharein-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-sharein-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function close() {
    try { var m = document.getElementById('pf-sharein-modal'); if (m && m.parentNode) m.parentNode.removeChild(m); } catch (e) {}
  }

  /* Escape-to-close (workshop.js pattern): document-level, fires only while
     this modal is actually in the DOM. Backdrop click + X already call
     close(); this covers keyboard users. */
  try {
    document.addEventListener('keydown', function (e) {
      try {
        if (e && e.key === 'Escape' && document.getElementById('pf-sharein-modal')) close();
      } catch (e2) {}
    });
  } catch (e3) {}

  /* Outward pipeline hook: the SHARE PUBLIC card rides the existing
     share-everywhere networks row (intent links), prefilled with the
     user's own caption + URL. */
  function outwardNetworks(title, text, url) {
    try {
      var PSE = window.PFShareEverywhere;
      if (PSE && typeof PSE.networks === 'function') {
        return PSE.networks('sharein', title || 'Intel drop', url || '');
      }
    } catch (e) {}
    return null;
  }

  function workshopOpen(toolId, opts) {
    try {
      var WS = window.PFWorkshop;
      if (WS && typeof WS.get === 'function' && WS.get(toolId) && typeof WS.open === 'function') {
        WS.open(toolId, opts || {});
        return true;
      }
    } catch (e) {}
    return false;
  }

  function captionDefault(d) {
    var bits = [];
    if (d.text) bits.push(d.text);
    if (d.title && d.text !== d.title) bits.push(d.title);
    if (d.url) bits.push(d.url);
    return bits.join(' — ').slice(0, 500);
  }

  function photoHandoff(d, caption, kind) {
    /* kind: 'receipt' | 'price' | 'propaganda' | 'wildfind:<key>' — each
       requires an explicit confirm tap inside the composer; nothing
       uploads silently. */
    close();
    var wfKey = (/^wildfind:/.test(kind || '')) ? String(kind).slice(9) : '';
    var wfLabel = '';
    try {
      if (wfKey && window.PF && PF.wildFinds && PF.wildFinds.get(wfKey))
        wfLabel = 'WILD FIND — ' + PF.wildFinds.get(wfKey).label;
    } catch (e) {}
    var label = wfLabel ||
      { receipt: 'RECEIPT BOUNTY', price: 'PRICE REPORT', propaganda: 'PROPAGANDA UPLOAD' }[kind] || kind;
    toast('DRAFT SAVED — ' + label + '. Tap the hand-off when ready.');
    if (kind === 'propaganda') {
      if (workshopOpen('poster-forge', { from: 'sharein', caption: caption })) return;
      try { window.location.href = '/create'; } catch (e) {}
      return;
    }
    /* WILD FIND: route to the bounty board with the type preselected. */
    if (wfKey) {
      try {
        if (window.PF && PF.wildFinds) { PF.wildFinds.routeToBoard(wfKey); return; }
      } catch (e) {}
      try { window.location.href = '/create'; } catch (e) {}
      return;
    }
    if (kind === 'receipt') {
      if (workshopOpen('data-bounties', { from: 'sharein', caption: caption })) return;
      try {
        var el = document.getElementById('pf-inflation-checkin');
        if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('Receipt upload lives on this page — your draft is saved.'); return; }
      } catch (e) {}
      toast('Open the People\u2019s Index price check-in to attach your receipt draft.');
      return;
    }
    /* price */
    try {
      var el2 = document.getElementById('pf-inflation-checkin');
      if (el2 && el2.scrollIntoView) { el2.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('Attach the photo to your price check-in — draft saved.'); return; }
    } catch (e) {}
    toast('Open the People\u2019s Index and tap PRICE CHECK-IN — your photo draft is saved.');
  }

  /* ---------- the composer ---------- */
  function open(d) {
    try {
      close();
      ensureCss();
      d = d || {};
      var kind = d.kind === 'photo' ? 'photo' : 'link';
      var modal = document.createElement('div');
      modal.className = 'pf-sharein';
      modal.id = 'pf-sharein-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-label', 'Send this intel');

      var prevHTML;
      if (kind === 'photo') {
        prevHTML = '<span class="pf-sharein-photo">\uD83D\uDCF7</span>'
          + '<span class="pf-sharein-title">' + esc(d.title || 'SHARED PHOTO') + '</span>'
          + esc(d.text || 'A photo was shared in from outside the site.');
        if (d.url) prevHTML += '<br><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.url) + '</a>';
      } else {
        prevHTML = '<span class="pf-sharein-title">' + esc(d.title || 'SHARED LINK') + '</span>'
          + (d.text ? esc(d.text) + '<br>' : '')
          + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.url) + '</a>' : '');
      }

      var type = d.type || '';
      var declared = (type === 'receipt' || type === 'price' || type === 'propaganda') ? type : '';

      /* Shell is built with explicit DOM nodes (not innerHTML parsing) so
         later steps can hold direct references to the interactive parts. */
      function mk(tag, cls, txt) {
        var e2 = document.createElement(tag);
        if (cls) e2.className = cls;
        if (txt != null) e2.textContent = txt;
        return e2;
      }
      var back = mk('div', 'pf-sharein-back');
      back.onclick = close;
      var sheet = mk('div', 'pf-sharein-sheet');
      var head = mk('div', 'pf-sharein-head');
      var h2 = mk('h2', null, 'SEND THIS INTEL');
      var x = mk('button', 'pf-sharein-x', 'X');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close');
      x.onclick = close;
      head.appendChild(h2); head.appendChild(x);
      var prev = mk('div', 'pf-sharein-prev');
      prev.innerHTML = prevHTML;
      var body = mk('div', 'pf-sharein-body');
      var note = mk('div', 'pf-sharein-note');
      note.innerHTML = '<b>DRAFT ONLY.</b> Nothing posts, publishes, or uploads '
        + 'until you press a confirm button below. Drafts live on this device.';
      var draftsHost = mk('div', 'pf-sharein-drafts');
      sheet.appendChild(head); sheet.appendChild(prev); sheet.appendChild(body);
      sheet.appendChild(note); sheet.appendChild(draftsHost);
      modal.appendChild(back); modal.appendChild(sheet);

      document.body.appendChild(modal);

      function setStep(html) { if (body) body.innerHTML = html; }
      function btn(cls, label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-sharein-btn' + (cls ? ' ' + cls : '');
        b.textContent = label;
        return b;
      }
      function captionField(defVal) {
        var lab = document.createElement('label');
        lab.textContent = 'CAPTION (EDITABLE)';
        var ta = document.createElement('textarea');
        ta.value = defVal || '';
        ta.setAttribute('aria-label', 'Caption');
        return { lab: lab, ta: ta, val: function () { return String(ta.value || '').slice(0, 500); } };
      }

      function stepPickPhoto() {
        var wrap = document.createElement('div');
        wrap.className = 'pf-sharein-step';
        var h = document.createElement('h3'); h.textContent = 'WHERE SHOULD THIS PHOTO GO?';
        var p = document.createElement('p');
        p.textContent = 'Pick the context. Each one still needs your confirm tap — nothing uploads on its own.';
        var pick = document.createElement('div'); pick.className = 'pf-sharein-pick';
        var opts = [
          ['receipt', 'RECEIPT BOUNTY', 'Price receipts = data bounties.'],
          ['price', 'PRICE REPORT', 'Attach it to a price check-in.'],
          ['propaganda', 'PROPAGANDA UPLOAD', 'Forge it in the Create workshop.'],
          /* WILD FINDS (2026-10-06): the bounty taxonomy types, one source
             of truth (PF.wildFinds). Fail-open: option hidden if missing. */
          ['wildfind', 'WILD FIND \uD83D\uDCF8', 'Protest signs, street art, price tags — pick the type.']
        ];
        opts.forEach(function (o) {
          if (o[0] === 'wildfind' && !(window.PF && PF.wildFinds)) return;
          var b = btn('', o[1]);
          b.title = o[2];
          b.onclick = function () {
            if (o[0] === 'wildfind') {
              try {
                PF.wildFinds.openTypePicker(function (key) { stepPhotoConfirm('wildfind:' + key); });
              } catch (e) { stepPhotoConfirm('wildfind'); }
            } else { stepPhotoConfirm(o[0]); }
          };
          pick.appendChild(b);
        });
        wrap.appendChild(h); wrap.appendChild(p); wrap.appendChild(pick);
        setStep(''); body.appendChild(wrap);
      }

      function stepPhotoConfirm(kindPick) {
        var cap = captionField(d.text || d.title || '');
        var wrap = document.createElement('div');
        wrap.className = 'pf-sharein-step';
        var labels = { receipt: 'RECEIPT BOUNTY', price: 'PRICE REPORT', propaganda: 'PROPAGANDA UPLOAD' };
        var wfKey = (/^wildfind:/.test(kindPick || '')) ? String(kindPick).slice(9) : '';
        var h = document.createElement('h3');
        if (wfKey && window.PF && PF.wildFinds && PF.wildFinds.get(wfKey)) {
          var _wft = PF.wildFinds.get(wfKey);
          h.textContent = 'WILD FIND — ' + _wft.label;
        } else {
          h.textContent = labels[kindPick] || 'PHOTO';
        }
        var p = document.createElement('p');
        p.textContent = 'Confirm to hand this photo draft to the ' + (h.textContent) + '.';
        /* Wild-find safety: show the type's rules before confirm. */
        if (wfKey && window.PF && PF.wildFinds) {
          try {
            var sw = document.createElement('div');
            sw.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:#ff8080;font-weight:800;margin:8px 0 4px;">SAFETY RULES</div>' + PF.wildFinds.safetyHTML(wfKey);
            wrap.appendChild(sw);
          } catch (e) {}
        }
        var go = btn('', 'CONFIRM — HAND IT OFF');
        go.onclick = function () {
          saveDraft({ kind: 'photo', type: kindPick, url: d.url, text: d.text, title: d.title,
            caption: cap.val(), dest: kindPick, state: 'confirmed' });
          photoHandoff(d, cap.val(), kindPick);
        };
        var backBtn = btn('ghost', '\u2190 BACK');
        backBtn.onclick = stepPickPhoto;
        wrap.appendChild(h); wrap.appendChild(p);
        wrap.appendChild(cap.lab); wrap.appendChild(cap.ta);
        var row = document.createElement('div'); row.className = 'pf-sharein-btns';
        row.appendChild(go); row.appendChild(backBtn);
        wrap.appendChild(row);
        setStep(''); body.appendChild(wrap);
      }

      function stepLinkDest() {
        var cap = captionField(captionDefault(d));
        var wrap = document.createElement('div');
        wrap.className = 'pf-sharein-step';
        var p = document.createElement('p');
        p.textContent = 'This becomes a share-intel draft card. Pick where the draft goes:';
        var row = document.createElement('div'); row.className = 'pf-sharein-btns';
        var toCell = btn('', 'POST TO MY CELL');
        var toPublic = btn('', 'SHARE PUBLIC');
        toCell.onclick = function () {
          var dr = saveDraft({ kind: 'link', url: d.url, text: d.text, title: d.title,
            caption: cap.val(), dest: 'cell', state: 'confirmed' });
          stepConfirmed(dr, 'CELL FEED DRAFT SAVED',
            'Your cell feed draft is on this device. Open your cell to post it.',
            'OPEN MY CELL', '/cells');
        };
        toPublic.onclick = function () {
          var dr2 = saveDraft({ kind: 'link', url: d.url, text: d.text, title: d.title,
            caption: cap.val(), dest: 'public', state: 'confirmed' });
          stepOutward(dr2, cap.val());
        };
        row.appendChild(toCell); row.appendChild(toPublic);
        wrap.appendChild(p);
        wrap.appendChild(cap.lab); wrap.appendChild(cap.ta);
        wrap.appendChild(row);
        setStep(''); body.appendChild(wrap);
      }

      function stepConfirmed(dr, title, copy, cta, href) {
        var wrap = document.createElement('div');
        wrap.className = 'pf-sharein-step';
        var h = document.createElement('h3'); h.textContent = title;
        var p = document.createElement('p'); p.textContent = copy;
        var row = document.createElement('div'); row.className = 'pf-sharein-btns';
        var go = btn('', cta);
        go.onclick = function () { try { window.location.href = href; } catch (e) { close(); } };
        var done = btn('ghost', 'DONE');
        done.onclick = close;
        row.appendChild(go); row.appendChild(done);
        wrap.appendChild(h); wrap.appendChild(p); wrap.appendChild(row);
        setStep(''); body.appendChild(wrap);
        try {
          document.dispatchEvent(new CustomEvent('pf-sharein-confirmed', { detail: { id: dr && dr.id, dest: dr && dr.dest } }));
        } catch (e) {}
      }

      function stepOutward(dr, caption) {
        /* SHARE PUBLIC goes through the existing outward share pipeline
           as a user-authored card: the share-everywhere networks row,
           prefilled with the user's caption + URL. */
        var wrap = document.createElement('div');
        wrap.className = 'pf-sharein-step';
        var h = document.createElement('h3'); h.textContent = 'SHARE THIS OUT';
        var p = document.createElement('p');
        p.textContent = 'Your draft card is saved. Send it through the usual share rails:';
        wrap.appendChild(h); wrap.appendChild(p);
        var net = outwardNetworks(dr.title || 'Intel drop', caption, dr.url);
        if (net && net.appendChild) {
          wrap.appendChild(net);
        } else {
          var miss = document.createElement('p');
          miss.textContent = 'Share rails not loaded on this page — your draft is saved. Copy it from MY DRAFTS.';
          wrap.appendChild(miss);
        }
        var row = document.createElement('div'); row.className = 'pf-sharein-btns';
        var done = btn('ghost', 'DONE'); done.onclick = close;
        row.appendChild(done);
        wrap.appendChild(row);
        setStep(''); body.appendChild(wrap);
      }

      function renderMyDrafts() {
        var host = draftsHost;
        if (!host) return;
        var ds = readDrafts();
        if (!ds.length) { host.innerHTML = ''; return; }
        var h = document.createElement('h3');
        h.textContent = 'MY DRAFTS (' + ds.length + ')';
        host.innerHTML = '';
        host.appendChild(h);
        ds.slice(0, 8).forEach(function (dr) {
          var row = document.createElement('div');
          row.className = 'pf-sharein-draft';
          var txt = document.createElement('span');
          txt.className = 'pf-sharein-dtxt';
          txt.textContent = (dr.dest ? dr.dest.toUpperCase() : 'DRAFT') + ' — ' + (dr.caption || dr.title || dr.url || '(empty)');
          var openB = document.createElement('button'); openB.type = 'button'; openB.textContent = 'OPEN';
          openB.onclick = function () { open(dr); };
          var delB = document.createElement('button'); delB.type = 'button'; delB.textContent = 'DELETE';
          delB.onclick = function () { deleteDraft(dr.id); renderMyDrafts(); };
          row.appendChild(txt); row.appendChild(openB); row.appendChild(delB);
          host.appendChild(row);
        });
      }

      /* Entry routing: photo w/ declared type skips the picker. */
      if (kind === 'photo') {
        if (declared) stepPhotoConfirm(declared);
        else stepPickPhoto();
      } else {
        stepLinkDest();
      }
      renderMyDrafts();
    } catch (e) {
      /* fail-open: a broken composer must never crash the page. */
      try { console.warn('[PF:35-sharein] composer failed', e); } catch (e2) {}
    }
  }

  /* Public API — PF.shareIn.parse/_t are test seams; _t is not user UI. */
  window.PF.shareIn = {
    parse: parse,
    open: open,
    close: close,
    saveDraft: saveDraft,
    readDrafts: readDrafts,
    deleteDraft: deleteDraft,
    stripParams: stripParams,
    _t: { parseParams: parseParams, looksUrl: looksUrl }
  };

  /* Deep-link entry: consume + strip, then open the composer (once). */
  function boot() {
    try {
      var d = parse(window.location.search);
      if (!d) return;
      stripParams();
      /* Defer past first paint so the composer never blocks load. */
      setTimeout(function () {
        try { open(d); } catch (e) {}
      }, 350);
    } catch (e) {}
  }
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) {}
})();
