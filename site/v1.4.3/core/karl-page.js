/* core/karl-page.js  |  PF v1.4.3 | KARL — the query layer front door.
   CEO directive 2026-10-07 "Let it blossom" (Design Direction):
   clean, light, the input is the hero. Fact-set cards are minimal —
   sourced numbers, no clutter. Karl is the FRONT DOOR; the products are
   the rooms: every answer deep-links into Receipt dossiers, town
   reports, extraction stories, and index scores. Karl's answers are a
   natural entry point to the whole data web, never a dead end.

   Self-mounting silo: <div id="pf-karl"></div> present (the /karl page,
   CEO hand-step: Squarespace page + #pf-karl Code block + nav entry)
   -> full-page shell. Rides the lazy core/bundle-karl.js chunk
   (build/bundle-core.js KARL_FILES), loaded on demand by the footer
   JS_GAMES routing — zero weight on other pages.

   Backend: ?action=karl_query&q=<natural language>&context={zip?,name?}
   (be/karl-query-layer). Zero XP on this frontend — querying is not an
   action; shares route through existing share mechanics only.
   KILL: ?pf_off=karl */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('karl')) { return; }
  if (window.pfKarlPageDone) return;
  window.pfKarlPageDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var host = document.getElementById('pf-karl');
  if (!host) { return; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s;
    } catch (e) {}
    return '';
  }
  function err(m) { try { if (PF && PF.error) PF.error('karl-page', m); } catch (e) {} }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }
  if (isEditor()) return;

  function api(params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfKarlCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=karl_query';
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 15000);
  }

  var CSS = [
    '.pf-karl{background:#faf8f3;color:#1a1a1a;font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:18px 16px 48px;line-height:1.5}',
    '.pf-karl-hero{text-align:center;padding:34px 10px 22px}',
    '.pf-karl-kicker{font-weight:700;font-size:12px;letter-spacing:6px;color:#c1121f;margin-bottom:10px}',
    '.pf-karl-title{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:46px;letter-spacing:8px;margin:0 0 8px}',
    '.pf-karl-sub{font-size:15px;color:#5a564d;margin:0 0 22px}',
    '.pf-karl-form{display:flex;gap:8px;margin:0 0 12px}',
    '.pf-karl-input{flex:1;min-width:0;font-size:17px;padding:15px 18px;border:2px solid #1a1a1a;border-radius:14px;',
    'background:#fff;color:#1a1a1a;outline:none;box-shadow:0 6px 20px rgba(26,26,26,.08);',
    'transition:border-color .15s ease,box-shadow .15s ease}',
    '.pf-karl-input:focus{border-color:#c1121f;box-shadow:0 6px 20px rgba(26,26,26,.08),0 0 0 4px rgba(193,18,31,.12)}',
    '.pf-karl-btn{background:linear-gradient(135deg,#d61622,#a50e18);color:#fff;border:0;border-radius:14px;',
    'padding:0 24px;font-weight:900;font-size:16px;letter-spacing:1.2px;cursor:pointer;white-space:nowrap;',
    'box-shadow:0 6px 18px rgba(193,18,31,.3);transition:transform .15s ease,box-shadow .15s ease}',
    '.pf-karl-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(193,18,31,.4)}',
    '.pf-karl-btn:active{transform:scale(.97)}',
    '.pf-karl-btn:disabled{opacity:.55;cursor:wait;transform:none}',
    '.pf-karl-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 0 8px}',
    '.pf-karl-chip{background:#fff;border:1px solid #d8d2c4;border-radius:22px;padding:10px 17px;font-size:13.5px;',
    'color:#5a564d;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}',
    '.pf-karl-chip:hover{border-color:#c1121f;color:#1a1a1a;transform:translateY(-1px);box-shadow:0 4px 12px rgba(193,18,31,.12)}',
    '.pf-karl-chip:active{background:#f0ece2;transform:none}',
    '.pf-karl-note{font-size:12px;color:#8a8478;text-align:center;margin:0 0 4px}',
    '.pf-karl-degraded{background:#fffaf0;border:1px solid #e8b923;border-radius:10px;padding:12px 16px;font-size:13px;color:#6b5a00;margin:0 0 14px}',
    '.pf-karl-err{background:#fdf4f4;border:0;border-left:4px solid #c1121f;border-radius:8px;',
    'padding:13px 16px;font-size:14px;color:#8a1414;margin:0 0 14px;box-shadow:0 4px 14px rgba(193,18,31,.08)}',
    /* Loading — a labeled skeleton, intentional rather than cheap. */
    '.pf-karl-loading{margin:8px 0 0;text-align:center}',
    '.pf-karl-loading .lb{font-size:13px;color:#8a8478;font-style:italic}',
    '.pf-karl-loading .sk{height:120px;border-radius:12px;margin-top:10px;',
    'background:linear-gradient(100deg,#efe9db 30%,#f8f4ea 50%,#efe9db 70%);background-size:200% 100%;',
    'animation:pfk-shimmer 1.4s infinite linear}',
    '@keyframes pfk-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}',
    '.pf-karl-entity{text-align:center;margin:18px 0 6px}',
    '.pf-karl-entity .nm{font-family:Georgia,serif;font-weight:700;font-size:26px;letter-spacing:.5px}',
    '.pf-karl-entity .mt{font-size:13px;color:#5a564d;margin-top:2px}',
    '.pf-karl-fact{background:#fff;border:1px solid #e7e0d1;border-radius:12px;padding:16px 18px;margin:10px 0;',
    'box-shadow:0 4px 16px rgba(26,26,26,.05);transition:transform .15s ease,box-shadow .15s ease}',
    '.pf-karl-fact:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(26,26,26,.08)}',
    '.pf-karl-fact .lb{font-size:11.5px;font-weight:700;color:#8a8478;letter-spacing:1.2px;margin-bottom:4px}',
    '.pf-karl-fact .vl{font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1a1a1a}',
    '.pf-karl-fact .nt{font-size:12.5px;color:#8a8478;margin-top:5px}',
    '.pf-karl-src{font-size:11.5px;color:#a09a8c;margin-top:9px;border-top:1px dashed #e2ddd0;padding-top:7px}',
    '.pf-karl-stale{color:#b35400;font-weight:700}',
    '.pf-karl-adj{font-size:12.5px;color:#8a8478;font-style:italic;text-align:center;margin:14px 0}',
    '.pf-karl-empty{background:#fff;border:1px dashed #c9c2b2;border-radius:12px;padding:24px 18px;margin:12px 0;',
    'text-align:center;font-size:15px;color:#5a564d}',
    '.pf-karl-empty .big{font-family:Georgia,serif;font-weight:700;font-size:19px;color:#1a1a1a;margin-bottom:8px}',
    '.pf-karl-disamb button{display:block;width:100%;text-align:left;background:#fff;border:1px solid #d8d2c4;',
    'border-radius:10px;padding:13px 15px;margin:7px 0;font-size:14px;cursor:pointer;color:#1a1a1a;',
    'transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}',
    '.pf-karl-disamb button:hover{border-color:#c1121f;box-shadow:0 4px 12px rgba(193,18,31,.12);transform:translateY(-1px)}',
    '.pf-karl-rail{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:16px 0 4px}',
    '.pf-karl-rail span{font-size:11.5px;border-radius:14px;padding:5px 12px;background:#f0ece2;color:#8a8478}',
    '.pf-karl-rail span.live{background:#e9f5e9;color:#2e7d32;box-shadow:0 2px 8px rgba(46,125,50,.15)}',
    '.pf-karl-doors{margin:20px 0 4px}',
    '.pf-karl-doors .hd{font-size:12px;font-weight:700;letter-spacing:3.5px;color:#8a8478;text-align:center;margin-bottom:10px}',
    '.pf-karl-door{display:block;text-align:center;background:linear-gradient(135deg,#d61622,#a50e18);color:#fff!important;',
    'font-weight:900;letter-spacing:1.5px;font-size:14px;padding:15px;border-radius:12px;text-decoration:none;margin:9px 0;',
    'box-shadow:0 6px 18px rgba(193,18,31,.25);transition:transform .15s ease,box-shadow .15s ease}',
    '.pf-karl-door:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(193,18,31,.35)}',
    '.pf-karl-door.alt{background:#1a1a1a;box-shadow:0 6px 18px rgba(0,0,0,.18)}',
    '@media(min-width:520px){.pf-karl-form{max-width:560px;margin-left:auto;margin-right:auto}}'
  ];

  function render(html) { host.innerHTML = '<style>' + CSS.join('\n') + '</style><div class="pf-karl">' + html + '</div>'; }
  function hero(q) {
    return '<div class="pf-karl-hero">' +
      '<div class="pf-karl-kicker">ASK THE RAILS</div>' +
      '<h1 class="pf-karl-title">KARL</h1>' +
      '<p class="pf-karl-sub">Plain questions. Sourced answers. Never a guess.</p>' +
      '<form id="pf-karl-form" class="pf-karl-form">' +
      '<input id="pf-karl-q" class="pf-karl-input" type="text" maxlength="300" autocomplete="off"' +
      ' placeholder="Who funds your rep?" value="' + esc(q || '') + '" aria-label="Ask Karl">' +
      '<button class="pf-karl-btn" type="submit">ASK</button></form>' +
      '<div class="pf-karl-chips">' +
      '<button type="button" class="pf-karl-chip" data-q="Who funds my rep?">who funds my rep?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="Who owns 70801?">who owns 70801?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="What did ExxonMobil do?">what did ExxonMobil do?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="What\'s the latest on housing?">latest on housing?</button>' +
      '</div>' +
      '<p class="pf-karl-note">County-level areas only. Karl answers from public records — never from memory.</p>' +
      '</div>';
  }

  function wire() {
    var form = document.getElementById('pf-karl-form');
    var input = document.getElementById('pf-karl-q');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = String(input.value || '').trim();
      if (!q) { input.focus(); return; }
      ask(q);
    });
    var chips = host.querySelectorAll('.pf-karl-chip');
    for (var i = 0; i < chips.length; i++) {
      (function (c) {
        c.addEventListener('click', function () {
          input.value = c.getAttribute('data-q');
          ask(c.getAttribute('data-q'));
        });
      })(chips[i]);
    }
  }

  function ask(q) {
    render(hero(q) + '<div class="pf-karl-loading"><span class="lb">Querying the rails&hellip;</span><div class="sk"></div></div>');
    wire();
    api({ q: q }, function (r) {
      if (!r || r.ok === false && !r.template) {
        render(hero(q) + '<div class="pf-karl-err">The rails didn\'t answer. Check your connection and try again.</div>');
        wire();
        return;
      }
      render(hero(q) + answerHtml(q, r));
      wire();
      wireMakeShareable(q, r);
      bindDisamb(q);
      try { document.getElementById('pf-karl-res').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    });
  }

  function srcLine(s) {
    s = s || {};
    var bits = [];
    if (s.name) bits.push(esc(s.name));
    if (s.period) bits.push(esc(String(s.period)));
    var ret = '';
    if (s.retrieved_at) {
      try { ret = 'retrieved ' + new Date(Number(s.retrieved_at)).toISOString().slice(0, 10); }
      catch (e) { ret = ''; }
    }
    if (ret) bits.push(esc(ret));
    var stale = s.stale ? ' <span class="pf-karl-stale">&#9888; ' + esc(s.stale_note || 'stale') + '</span>' : '';
    return bits.join(' &middot; ') + stale;
  }

  /* MAKE SHAREABLE (fe/make-shareable-inline, 2026-10-07): inline Studio
     creation panel on every Karl answer. The answer's own 1080x1350 painter
     (paintKarlAnswer) renders the preview — facts + source stamps only, no
     prose, per the Karl copy rules. One tap publishes to the UGC feed +
     opens the native share sheet. No page navigation. Zero XP for viewing. */
  var lastAnswer = null;
  function hashQ(s) {
    var h = 0; s = String(s || '');
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(36);
  }
  function kWrap(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintKarlAnswer(a) {
    var W = 1080, H = 1350, cv, x;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = W; cv.height = H;
    try { x = cv.getContext('2d'); } catch (e) { return null; }
    if (!x) return null;
    var r = a.r || {}, facts = (r.facts || []).slice(0, 3);
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center';
    var y = 150;
    x.fillStyle = '#f5ead6'; x.font = '700 32px Arial,sans-serif';
    x.fillText('\u2605 KARL \u2605', W / 2, y); y += 52;
    x.fillStyle = '#c9bfa8'; x.font = '700 28px Arial,sans-serif';
    x.fillText('ASK THE RAILS', W / 2, y); y += 80;
    x.fillStyle = '#ffffff'; x.font = '900 56px "Arial Black",Arial,sans-serif';
    kWrap(x, String(a.q || '').toUpperCase(), W - 170).slice(0, 3).forEach(function (l) {
      x.fillText(l, W / 2, y); y += 68;
    });
    y += 30;
    facts.forEach(function (f) {
      x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
      kWrap(x, String(f.label || '').toUpperCase(), W - 170).slice(0, 1).forEach(function (l) {
        x.fillText(l, W / 2, y); y += 42;
      });
      x.fillStyle = '#ffffff'; x.font = '900 64px "Arial Black",Arial,sans-serif';
      kWrap(x, String(f.value_display || ''), W - 170).slice(0, 2).forEach(function (l) {
        x.fillText(l, W / 2, y); y += 76;
      });
      y += 26;
    });
    var src = facts.length && facts[0].source ? facts[0].source : null;
    if (src && src.name) {
      x.fillStyle = '#8a8172'; x.font = '400 26px Arial,sans-serif';
      kWrap(x, 'Source: ' + src.name + (src.period ? ' \u00b7 ' + src.period : ''), W - 170)
        .slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 36; });
      y += 20;
    }
    /* share-image CTA standard: JOIN THE FIGHT. red bold above MTCSTW.COM */
    x.fillStyle = '#c1121f'; x.font = '900 52px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 210);
    x.fillStyle = '#f5ead6'; x.font = '900 40px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', W / 2, H - 148);
    x.fillStyle = '#8a8172'; x.font = '400 26px Arial,sans-serif';
    x.fillText('mtcstw.com/karl', W / 2, H - 96);
    return cv;
  }
  function wireMakeShareable(q, r) {
    lastAnswer = { q: q, r: r };
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (M && !M._pfKarlWired) {
      M._pfKarlWired = true;
      M.registerResolver('karl', function (unit, done) {
        var cv = null;
        try { if (lastAnswer) cv = paintKarlAnswer(lastAnswer); } catch (e) {}
        try { done(cv); } catch (e2) {}
      });
      try {
        if (window.PFShare && PFShare.setPoster) {
          PFShare.setPoster('karl-answer', function (done) {
            var c2 = null;
            try { if (lastAnswer) c2 = paintKarlAnswer(lastAnswer); } catch (e) {}
            try { done(c2); } catch (e2) {}
          });
        }
      } catch (e) {}
    }
    if (!M) return;
    var b = host.querySelector('[data-karl-mss]');
    if (b) {
      b.addEventListener('click', function () {
        M.openPanel({
          kind: 'karl', ref: 'q-' + hashQ(q),
          title: 'KARL ANSWERED: ' + String(q || '').slice(0, 80),
          deep: '/karl?q=' + encodeURIComponent(q), game: 'karl'
        });
      });
    }
  }

  function answerHtml(q, r) {
    var h = '<div id="pf-karl-res">';
    if (r.degraded) {
      h += '<div class="pf-karl-degraded">' + esc(r.degraded_note || 'Karl is resting — static answers only.') + '</div>';
    }
    if (r.template === 'faq' && r.faq && r.faq.length) {
      h += '<div class="pf-karl-empty"><div class="big">KARL</div>' + esc(r.faq[0].answer) + '</div>';
    }
    if (r.disambiguation && r.disambiguation.length) {
      h += '<div class="pf-karl-empty"><div class="big">More than one matched — pick one.</div>' +
        '<div class="pf-karl-disamb">' +
        r.disambiguation.map(function (o) {
          return '<button type="button" data-name="' + esc(o.name) + '">' +
            '<b>' + esc(o.name) + '</b><br><span style="font-size:12.5px;color:#8a8478">' +
            esc([o.office, o.state, o.party].filter(Boolean).join(' · ')) + '</span></button>';
        }).join('') + '</div><div class="nt" style="font-size:12px;color:#8a8478;margin-top:8px">Karl never guesses — you choose.</div></div>';
    }
    if (r.entity) {
      var meta = [];
      if (r.entity.office) meta.push(r.entity.office);
      if (r.entity.state || r.entity.state_code) meta.push(r.entity.state || r.entity.state_code);
      if (r.entity.party) meta.push(r.entity.party);
      if (r.entity.label) meta.push(r.entity.label);
      h += '<div class="pf-karl-entity"><div class="nm">' + esc(r.entity.name || r.entity.zip || '') + '</div>' +
        (meta.length ? '<div class="mt">' + esc(meta.join(' · ')) + '</div>' : '') + '</div>';
    }
    (r.facts || []).forEach(function (f) {
      h += '<div class="pf-karl-fact"><div class="lb">' + esc(f.label) + '</div>' +
        '<div class="vl">' + esc(f.value_display) + '</div>' +
        (f.note ? '<div class="nt">' + esc(f.note) + '</div>' : '') +
        '<div class="pf-karl-src">' + srcLine(f.source) + '</div></div>';
    });
    if (r.adjacency_note) h += '<div class="pf-karl-adj">' + esc(r.adjacency_note) + '</div>';
    if (!(r.facts || []).length && !(r.disambiguation || []).length && !(r.faq || []).length) {
      h += '<div class="pf-karl-empty"><div class="big">I don\'t have data on that yet.</div>' +
        esc(r.empty_reason || 'That\'s a real answer — the rails are still building out.') + '</div>';
    }
    /* Rail status: what's tracked, what's not. */
    if ((r.rail_status || []).length) {
      h += '<div class="pf-karl-rail">' + r.rail_status.map(function (s2) {
        return '<span class="' + (s2.live ? 'live' : '') + '">' +
          (s2.live ? '&#9679; ' : '&#9675; ') + esc(s2.rail) +
          (s2.live || !s2.note ? '' : ' — ' + esc(s2.note)) + '</span>';
      }).join('') + '</div>';
    }
    /* The sticky web: every answer is a front door to the rooms. */
    if ((r.related || []).length) {
      h += '<div class="pf-karl-doors"><div class="hd">GO DEEPER</div>' +
        r.related.map(function (l, i) {
          var url = safeUrl(l.href);
          if (!url) return '';
          return '<a class="pf-karl-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' + esc(l.label) + ' &rarr;</a>';
        }).join('') + '</div>';
    }
    /* MAKE SHAREABLE: inline creation panel on every answer with facts. */
    if ((r.facts || []).length) {
      h += '<div style="text-align:center;margin:16px 0 6px" data-mss-slot>' +
        '<button type="button" class="pf-mss-btn" data-karl-mss>MAKE SHAREABLE</button></div>';
    }
    h += '</div>';
    return h;
  }

  function bindDisamb() {
    var btns = host.querySelectorAll('.pf-karl-disamb button');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var nm = b.getAttribute('data-name');
          var input = document.getElementById('pf-karl-q');
          var q = 'who funds ' + nm + '?';
          if (input) input.value = q;
          api({ q: q, context: JSON.stringify({ name: nm }) }, function (r2) {
            if (!r2) { err('disambiguation query failed'); return; }
            render(hero(q) + answerHtml(q, r2));
            wire();
            wireMakeShareable(q, r2);
          });
        });
      })(btns[i]);
    }
  }

  /* Self-mount (page-mount SELF config runs us; we also render on direct
     presence so the page never depends on mount order). */
  render(hero(''));
  wire();
  /* Deep-link support: /karl?q=who+funds+my+rep */
  try {
    var m = /[?&]q=([^&#]*)/.exec(window.location.search || '');
    if (m && decodeURIComponent(m[1]).trim()) {
      var dq = decodeURIComponent(m[1]).trim().slice(0, 300);
      var inp = document.getElementById('pf-karl-q');
      if (inp) inp.value = dq;
      ask(dq);
    }
  } catch (e) {}
  /* feWiden: full-width mount block like every dedicated page. */
  try { if (PF && PF.feWiden) PF.feWiden(host); } catch (e) {}
})();
