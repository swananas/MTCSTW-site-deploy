/* core/karl-page.js  |  PF v1.4.3 | KARL — the intelligence terminal.
   REDESIGN (2026-10-09, "full butter"): Karl is an intelligence, not a search box.
   War room aesthetic — dark, focused, premium. The answer is the hero.
   Every interaction deliberate and smooth.

   Self-mounting silo: <div id="pf-karl"></div> present (the /karl page)
   -> full-page shell. Rides the lazy core/bundle-karl.js chunk.

   Backend: ?action=karl_query&q=<natural language>&context={zip?,name?}
   Zero XP on this frontend — querying is not an action; shares route
   through existing share mechanics only.
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
    var q = '?action=karl_query';
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    var url = BACKEND + q;
    var done = false;
    function finish(j) {
      if (done) return; done = true;
      cb(j);
    }
    try {
      var ctrl = null;
      var timeoutId = null;
      if (typeof AbortController !== 'undefined') {
        ctrl = new AbortController();
        timeoutId = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 15000);
      } else {
        timeoutId = setTimeout(function () { finish(null); }, 15000);
      }
      fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) {
          if (!r || !r.ok) throw new Error('http ' + (r && r.status));
          return r.json();
        })
        .then(function (j) {
          if (timeoutId) clearTimeout(timeoutId);
          finish(j);
        })
        .catch(function () {
          if (timeoutId) clearTimeout(timeoutId);
          finish(null);
        });
    } catch (e) {
      finish(null);
    }
  }

  /* ============ WAR ROOM CSS ============ */
  var CSS = [
    /* Kill any page-mount header above our hero */
    '#pf-karl .pf-page-head,#pf-karl .pf-hero-top,#pf-karl header{display:none!important}',
    '.pf-karl{background:#0a0a0a;color:#f5f0e6;font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:0 18px 64px;line-height:1.6;-webkit-font-smoothing:antialiased}',

    /* --- HERO --- */
    '.pf-karl-hero{text-align:center;padding:40px 8px 24px;position:relative;border-top:4px solid #c1121f;border-bottom:4px solid #c1121f;background:linear-gradient(180deg,#141414 0%,#0b0b0b 100%);margin:0 0 8px}',
    '.pf-karl-brand{font-size:12px;letter-spacing:6px;color:#dc143c;font-weight:800;margin-bottom:10px;font-family:Arial,sans-serif}',
    '.pf-karl-kicker{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:11px;letter-spacing:7px;color:#c1121f;margin:26px 0 14px;text-transform:uppercase}',
    '.pf-karl-kicker .pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#c1121f;margin-right:8px;animation:pfk-pulse 2.2s infinite}',
    '@keyframes pfk-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(193,18,31,.5)}50%{opacity:.5;box-shadow:0 0 0 7px rgba(193,18,31,0)}}',
    '.pf-karl-title{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:54px;letter-spacing:14px;margin:0 0 6px;color:#f5f0e6;text-indent:14px}',
    '.pf-karl-fullname{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:13px;letter-spacing:3px;color:#e5383b;margin:0 0 10px;text-transform:uppercase;font-weight:700}',
    '.pf-karl-rule{height:3px;width:120px;background:#c1121f;margin:0 auto 12px}',
    '.pf-karl-title-sub{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:5px;color:#5a554a;margin:0 0 14px;text-transform:uppercase}',
    '.pf-karl-sub{font-family:Georgia,serif;font-style:italic;font-size:16px;color:#a39c8b;margin:0 0 18px;line-height:1.5}',
    '.pf-karl-sub b{color:#f5f0e6;font-style:normal}',
    /* live data ticker — the scale of the arsenal */
    '.pf-karl-arsenal{display:flex;justify-content:center;gap:26px;margin:0 0 30px;flex-wrap:wrap}',
    '.pf-karl-arsenal div{text-align:center}',
    '.pf-karl-arsenal .n{font-family:Georgia,serif;font-weight:700;font-size:21px;color:#e5383b;line-height:1.2}',
    '.pf-karl-arsenal .t{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:9.5px;letter-spacing:2px;color:#5a554a;text-transform:uppercase;margin-top:3px}',

    /* --- INPUT: briefing an analyst --- */
    '.pf-karl-form{position:relative;max-width:600px;margin:0 auto 10px}',
    '.pf-karl-inputwrap{position:relative;display:flex;align-items:stretch;background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;transition:border-color .2s ease,box-shadow .2s ease}',
    '.pf-karl-inputwrap:focus-within{border-color:#c1121f;box-shadow:0 0 0 3px rgba(193,18,31,.18),0 8px 32px rgba(0,0,0,.4)}',
    '.pf-karl-prompt{font-family:"SF Mono",Menlo,Consolas,monospace;color:#c1121f;font-size:18px;padding:0 0 0 18px;display:flex;align-items:center;user-select:none}',
    '.pf-karl-input{flex:1;min-width:0;background:transparent;border:0;color:#f5f0e6;font-size:17px;padding:17px 12px 17px 10px;outline:none;font-family:Arial,sans-serif}',
    '.pf-karl-input::placeholder{color:#5a554a;font-style:italic}',
    '.pf-karl-btn{background:linear-gradient(135deg,#d61622,#8f0c14);color:#fff;border:0;padding:0 26px;',
    'font:900 14px/1 Arial,sans-serif;letter-spacing:2px;cursor:pointer;white-space:nowrap;',
    'transition:filter .15s ease,transform .1s ease;min-height:58px}',
    '.pf-karl-btn:hover{filter:brightness(1.18);box-shadow:0 6px 24px rgba(193,18,31,.4)}',
    '.pf-karl-btn:active{transform:scale(.94);filter:brightness(1.3)}',
    '.pf-karl-btn:disabled{opacity:.5;cursor:wait;filter:none;transform:none}',
    /* trigger flash on submit */
    '.pf-karl-inputwrap.firing{border-color:#e5383b;box-shadow:0 0 0 4px rgba(229,56,59,.28),0 8px 32px rgba(193,18,31,.3)}',
    '.pf-karl-inputwrap.firing .pf-karl-btn{background:linear-gradient(135deg,#ff2a35,#b30d16)}',
    '.pf-karl-hint{text-align:center;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:11px;color:#5a554a;margin:0 0 6px;letter-spacing:.5px}',

    /* --- EXAMPLE CHIPS: suggested intel requests --- */
    '.pf-karl-chips-label{text-align:center;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:3px;color:#5a554a;margin:22px 0 10px;text-transform:uppercase}',
    '.pf-karl-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 0 6px}',
    '.pf-karl-chip{background:#141414;border:1px solid #2a2a2a;border-radius:20px;padding:11px 18px;font-size:13.5px;',
    'color:#b8b0a0;cursor:pointer;min-height:44px;transition:all .18s ease;font-family:Arial,sans-serif}',
    '.pf-karl-chip:hover{border-color:#c1121f;color:#f5f0e6;transform:translateY(-1px);box-shadow:0 4px 16px rgba(193,18,31,.2)}',
    '.pf-karl-chip:active{transform:scale(.97)}',
    '.pf-karl-note{font-size:12px;color:#5a554a;text-align:center;margin:14px 0 0;font-style:italic}',

    /* --- LOADING: Karl working --- */
    '.pf-karl-loading{margin:36px auto 0;max-width:600px;text-align:center}',
    '.pf-karl-loading .lb{font-family:Georgia,serif;font-style:italic;font-size:15px;color:#a39c8b}',
    '.pf-karl-loading .td{display:inline-flex;gap:6px;margin-left:10px;vertical-align:middle}',
    '.pf-karl-loading .td i{width:7px;height:7px;border-radius:50%;background:#c1121f;animation:pfk-td 1.1s infinite ease-in-out}',
    '.pf-karl-loading .td i:nth-child(2){animation-delay:.15s}',
    '.pf-karl-loading .td i:nth-child(3){animation-delay:.3s}',
    '@keyframes pfk-td{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}',

    /* --- ANSWER: the intelligence briefing --- */
    '#pf-karl-res{max-width:640px;margin:0 auto}',
    '.pf-karl-brief{margin:32px 0 0;animation:pfk-briefin .45s cubic-bezier(.2,.8,.25,1) both}',
    '@keyframes pfk-briefin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
    '.pf-karl-brief-q{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:12px;color:#5a554a;letter-spacing:1px;margin-bottom:14px}',
    '.pf-karl-brief-q::before{content:"> ";color:#c1121f}',
    '.pf-karl-entity{margin:0 0 18px}',
    '.pf-karl-entity .nm{font-family:Georgia,serif;font-weight:700;font-size:30px;color:#f5f0e6;letter-spacing:.3px;line-height:1.2}',
    '.pf-karl-entity .mt{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:12px;color:#8a8478;margin-top:6px;letter-spacing:.5px}',

    /* Fact cards: numbers pop, hierarchy clear */
    '.pf-karl-fact{background:#111;border:1px solid #222;border-radius:14px;padding:20px 22px;margin:12px 0;',
    'animation:pfk-factin .4s cubic-bezier(.2,.8,.3,1) both;position:relative;overflow:hidden}',
    '.pf-karl-fact:nth-child(2){animation-delay:.06s}.pf-karl-fact:nth-child(3){animation-delay:.12s}',
    '.pf-karl-fact:nth-child(4){animation-delay:.18s}.pf-karl-fact:nth-child(5){animation-delay:.24s}',
    '@keyframes pfk-factin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '@media(prefers-reduced-motion:reduce){.pf-karl-fact,.pf-karl-brief{animation:none}.pf-karl-kicker .pulse,.pf-karl-loading .td i{animation:none}}',
    '.pf-karl-fact::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#c1121f,transparent)}',
    '.pf-karl-fact .lb{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;font-weight:700;color:#8a8478;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase}',
    '.pf-karl-fact .lb::before{content:"EXHIBIT";display:inline-block;color:#c1121f;margin-right:8px}',
    '.pf-karl-fact .vl{font-family:Georgia,serif;font-size:32px;font-weight:700;color:#fff;line-height:1.15}',
    '.pf-karl-fact .vl b{color:#fff}',
    '.pf-karl-fact .vl .num{color:#ff2a35;text-shadow:0 0 24px rgba(229,56,59,.35)}',
    '.pf-karl-fact .nt{font-size:13.5px;color:#a39c8b;margin-top:8px;line-height:1.55}',
    '.pf-karl-fact .nt b{color:#d8d2c4}',
    '.pf-karl-src{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;color:#7a7466;margin-top:12px;padding-top:10px;border-top:1px solid #1e1e1e;letter-spacing:.3px}',
    '.pf-karl-src::before{content:"▸ RECEIPTS — ";color:#c1121f;font-weight:700}',
    '.pf-karl-stale{color:#e8a33d;font-weight:700}',
    '.pf-karl-adj{font-size:13px;color:#8a8478;font-style:italic;text-align:center;margin:18px 0;font-family:Georgia,serif}',

    /* Empty / error states */
    '.pf-karl-empty{background:#111;border:1px dashed #333;border-radius:14px;padding:32px 22px;margin:24px 0;text-align:center}',
    '.pf-karl-empty .big{font-family:Georgia,serif;font-weight:700;font-size:20px;color:#f5f0e6;margin-bottom:10px}',
    '.pf-karl-empty{font-size:14.5px;color:#a39c8b;line-height:1.6}',
    '.pf-karl-err{background:rgba(193,18,31,.08);border:1px solid rgba(193,18,31,.3);border-left:4px solid #c1121f;border-radius:10px;',
    'padding:16px 18px;font-size:14px;color:#e8a0a0;margin:24px 0}',
    '.pf-karl-degraded{background:rgba(232,185,35,.07);border:1px solid rgba(232,185,35,.3);border-radius:10px;padding:14px 18px;font-size:13px;color:#d8b94a;margin:24px 0}',

    /* Disambiguation */
    '.pf-karl-disamb button{display:block;width:100%;text-align:left;background:#141414;border:1px solid #2a2a2a;',
    'border-radius:12px;padding:15px 18px;margin:8px 0;font-size:14.5px;cursor:pointer;color:#f5f0e6;min-height:56px;',
    'transition:border-color .15s ease,transform .15s ease}',
    '.pf-karl-disamb button:hover{border-color:#c1121f;transform:translateY(-1px)}',
    '.pf-karl-disamb button b{color:#fff}',
    '.pf-karl-disamb button span{font-size:12.5px;color:#8a8478}',

    /* Rail badges: subtle, elegant */
    '.pf-karl-verdict{text-align:center;margin:26px auto 4px;max-width:520px}',
    '.pf-karl-verdict .vline{font-family:Georgia,serif;font-style:italic;font-size:15px;color:#d8d2c4;line-height:1.6}',
    '.pf-karl-verdict .vline b{color:#ff2a35;font-style:normal}',
    '.pf-karl-rail{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 4px}',
    '.pf-karl-rail span{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10px;letter-spacing:1px;color:#5a554a;',
    'border:1px solid #222;border-radius:4px;padding:4px 9px;text-transform:uppercase}',
    '.pf-karl-rail span.live{color:#7bc47f;border-color:rgba(123,196,127,.3)}',

    /* Deep links */
    '.pf-karl-doors{margin:26px 0 4px}',
    '.pf-karl-doors .hd{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:4px;color:#5a554a;text-align:center;margin-bottom:12px;text-transform:uppercase}',
    '.pf-karl-door{display:block;text-align:center;background:linear-gradient(135deg,#d61622,#8f0c14);color:#fff!important;',
    'font-weight:900;letter-spacing:2px;font-size:13.5px;padding:16px;border-radius:12px;text-decoration:none;margin:10px 0;',
    'transition:transform .15s ease,filter .15s ease;min-height:56px}',
    '.pf-karl-door:hover{transform:translateY(-1px);filter:brightness(1.1)}',
    '.pf-karl-door.alt{background:#1a1a1a;border:1px solid #2a2a2a}',
    '.pf-karl-door span{font-size:11px;opacity:.75;font-weight:400;letter-spacing:.5px}',

    /* MAKE SHAREABLE: natural next step */
    '.pf-mss-wrap{text-align:center;margin:30px 0 8px;padding:22px 18px 6px;border-top:1px solid #1a1a1a;background:linear-gradient(180deg,rgba(193,18,31,.05),transparent 70%);border-radius:0 0 14px 14px}',
    '.pf-mss-label{font-family:"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:3px;color:#c1121f;margin-bottom:12px;text-transform:uppercase;font-weight:700}',
    '.pf-mss-btn{background:transparent;border:1.5px solid #c1121f;color:#e5383b;border-radius:12px;',
    'font:900 13px/1 Arial,sans-serif;letter-spacing:2px;padding:16px 36px;cursor:pointer;min-height:52px;',
    'transition:all .18s ease}',
    '.pf-mss-btn:hover{background:#c1121f;color:#fff;box-shadow:0 6px 24px rgba(193,18,31,.35);transform:translateY(-1px)}',
    '.pf-mss-btn:active{transform:scale(.97)}',

    /* Hide competing chrome on this page */
    '#pf-nuke-stick,#pf-commend-chip,.pf-kc-btn{display:none!important}',

    /* Mobile tuning */
    '@media(max-width:480px){',
    '.pf-karl{padding:0 14px 48px}',
    '.pf-karl-hero{padding:32px 4px 20px}',
    '.pf-karl-title{font-size:42px;letter-spacing:10px;text-indent:10px}',
    '.pf-karl-fullname{font-size:11px;letter-spacing:2px}',
    '.pf-karl-sub{font-size:14.5px}',
    '.pf-karl-input{font-size:16px;padding:15px 10px 15px 8px}',
    '.pf-karl-btn{padding:0 20px;min-height:56px}',
    '.pf-karl-fact{padding:18px}',
    '.pf-karl-fact .vl{font-size:25px}',
    '.pf-karl-entity .nm{font-size:25px}',
    '}'
  ];

  function render(html) { host.innerHTML = '<style>' + CSS.join('\n') + '</style><div class="pf-karl">' + html + '</div>'; }

  function hero(q) {
    /* UNIFIED HERO (2026-10-09): one hero, one breath — brand kicker, title,
       full backronym, codename, tagline, arsenal, ask indicator. The generic
       page-mount header is skipped for pf-karl (selfHero) so this is the
       ONLY hero on the page. */
    return '<div class="pf-karl-hero">' +
      '<div class="pf-karl-brand">MTCSTW.COM</div>' +
      '<h1 class="pf-karl-title">KARL</h1>' +
      '<div class="pf-karl-fullname">Komrade Artificial Revolutionary Laborer</div>' +
      '<div class="pf-karl-rule"></div>' +
      '<div class="pf-karl-title-sub">Codename // Open-Source Intelligence</div>' +
      '<p class="pf-karl-sub">This is not trivia. It is <b>ammunition</b>.</p>' +
      '<div class="pf-karl-arsenal">' +
      '<div><div class="n">$6.4T+</div><div class="t">penalties tracked</div></div>' +
      '<div><div class="n">954K</div><div class="t">tables of receipts</div></div>' +
      '<div><div class="n">62</div><div class="t">creators armed</div></div>' +
      '</div>' +
      '<div class="pf-karl-kicker"><span class="pulse"></span>Ask the rails</div>' +
      '<form id="pf-karl-form" class="pf-karl-form" autocomplete="off">' +
      '<div class="pf-karl-inputwrap">' +
      '<span class="pf-karl-prompt">&gt;</span>' +
      '<input id="pf-karl-q" class="pf-karl-input" type="text" maxlength="300" autocomplete="off"' +
      ' enterkeyhint="go" autocapitalize="sentences" spellcheck="false"' +
      ' placeholder="Brief me: which CEO stole the most? who owns my town?" value="' + esc(q || '') + '" aria-label="Ask Karl">' +
      '<button class="pf-karl-btn" type="submit">ASK</button>' +
      '</div></form>' +
      '<p class="pf-karl-hint">natural language — no keywords needed</p>' +
      '<div class="pf-karl-chips-label">Load a round</div>' +
      '<div class="pf-karl-chips">' +
      '<button type="button" class="pf-karl-chip" data-q="Which defense contractor paid the most in penalties?">worst defense contractor?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="Who is MTCSTW?">who is MTCSTW?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="What did ExxonMobil do?">what did ExxonMobil do?</button>' +
      '<button type="button" class="pf-karl-chip" data-q="Which for-profit college defrauded the most students?">worst for-profit college?</button>' +
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
    var ccBtns = host.querySelectorAll('[data-cc-query]');
    for (var j = 0; j < ccBtns.length; j++) {
      (function (b) {
        b.addEventListener('click', function () {
          var q = b.getAttribute('data-cc-query');
          if (q) { input.value = q; ask(q); }
        });
      })(ccBtns[j]);
    }
  }

  var _asking = false;
  function ask(q) {
    if (_asking) { return; }
    _asking = true;
    /* trigger flash — the round is loaded */
    try {
      var _iw = document.querySelector('.pf-karl-inputwrap');
      if (_iw) { _iw.classList.add('firing'); setTimeout(function(){ _iw.classList.remove('firing'); }, 450); }
    } catch (e) {}
    render(hero(q) +
      '<div class="pf-karl-loading"><span class="lb">Karl is working the rails</span>' +
      '<span class="td"><i></i><i></i><i></i></span></div>');
    wire();
    var _btn = document.querySelector('.pf-karl-btn');
    if (_btn) { _btn.disabled = true; _btn.textContent = 'WORKING'; }
    api({ q: q }, function (r) {
      _asking = false;
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

  /* MAKE SHAREABLE: canvas painter + share panel wiring (unchanged logic). */
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

  /* Highlight big numbers in prose values: wrap $ amounts and large figures. */
  function richNum(s) {
    return esc(s).replace(/(\$[\d,]+(?:\.\d+)?[BMK]?)/g, '<span class="num">$1</span>');
  }

  function answerHtml(q, r) {
    var h = '<div id="pf-karl-res"><div class="pf-karl-brief">';
    h += '<div class="pf-karl-brief-q">' + esc(q) + '</div>';
    if (r.degraded) {
      h += '<div class="pf-karl-degraded">' + esc(r.degraded_note || 'Karl is resting — static answers only.') + '</div>';
    }
    if (r.template === 'faq' && r.faq && r.faq.length) {
      h += '<div class="pf-karl-empty"><div class="big">KARL</div>' + esc(r.faq[0].answer) + '</div>';
    }
    if (r.template === 'prompt' && r.prompt) {
      h += '<div class="pf-karl-empty"><div class="big">' + esc(r.prompt.heading) + '</div>' +
        '<div class="pf-karl-disamb">' +
        r.prompt.questions.map(function (qq) {
          return '<button type="button" data-example="' + esc(qq.example) + '">' +
            '<b>' + esc(qq.label) + '</b><br><span>' +
            esc('Try: "' + qq.example + '"') + (qq.hint ? ' — ' + esc(qq.hint) : '') + '</span></button>';
        }).join('') + '</div><div class="nt" style="font-size:12px;color:#8a8478;margin-top:8px">Karl never guesses — help me get it right.</div></div>';
    }
    if (r.disambiguation && r.disambiguation.length) {
      h += '<div class="pf-karl-empty"><div class="big">More than one matched — pick one.</div>' +
        '<div class="pf-karl-disamb">' +
        r.disambiguation.map(function (o) {
          return '<button type="button" data-name="' + esc(o.name) + '">' +
            '<b>' + esc(o.name) + '</b><br><span>' +
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
      /* Creator roster */
      if (f.creators && f.creators.length) {
        f.creators.forEach(function (c) {
          h += '<div class="pf-karl-fact"><div class="lb">Creator</div>' +
            '<div class="vl">' + esc(c.name || '') + '</div>' +
            '<div class="nt">Propaganda score <b>' + esc(String(c.propaganda_score || '')) + '</b>' +
            (c.primary_platform ? ' · ' + esc(c.primary_platform) : '') +
            (c.followers_display ? ' · ' + esc(c.followers_display) + ' followers' : '') + '</div>' +
            (c.bio ? '<div class="nt">' + esc(String(c.bio).slice(0, 300)) + '</div>' : '') +
            '<div class="pf-karl-src">Sick Left Radicals roster</div></div>';
        });
        return;
      }
      /* Insider trades */
      if (f.trades && f.trades.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Insider trades</div>';
        f.trades.slice(0, 5).forEach(function (t, ti) {
          h += '<div style="padding:' + (ti ? '10px 0 0' : '4px 0 0') + ';' + (ti ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(t.filer || '') + '</b>' +
            '<div class="nt">' + esc(t.company || '') + ' · ' + esc(String(t.shares || '')) + ' shares @ $' + esc(String(t.price || '')) +
            (t.transaction_date ? ' · ' + esc(String(t.transaction_date).slice(0, 10)) : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">SEC Form 4 filings</div></div>';
        return;
      }
      /* Board interlocks */
      if (f.positions && f.positions.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Board positions</div>';
        f.positions.slice(0, 8).forEach(function (p, pi) {
          h += '<div style="padding:' + (pi ? '10px 0 0' : '4px 0 0') + ';' + (pi ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(p.person_name || p.name || '') + '</b>' +
            '<div class="nt">' + esc(p.org_name || '') + (p.title ? ' — ' + esc(p.title) : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">LittleSis</div></div>';
        return;
      }
      /* 13F holdings */
      if (f.holdings && f.holdings.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Institutional holdings</div>';
        f.holdings.slice(0, 8).forEach(function (hh, hi) {
          var _v = Number(hh.value_usd);
          var _vTxt = _v >= 1e9 ? '$' + (_v/1e9).toFixed(1) + 'B' : _v >= 1e6 ? '$' + (_v/1e6).toFixed(1) + 'M' : '$' + _v;
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (hi ? '10px 0 0' : '4px 0 0') + ';' + (hi ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(hh.company_name || '') + '</b><div class="nt">' + esc(hh.manager_name || '') + '</div></div>' +
            '<div class="vl" style="font-size:22px;white-space:nowrap"><span class="num">' + _vTxt + '</span></div></div>';
        });
        h += '<div class="pf-karl-src">SEC 13F filings</div></div>';
        return;
      }
      /* For-profit colleges */
      if (f.colleges && f.colleges.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — for-profit colleges</div>';
        f.colleges.slice(0, 8).forEach(function (c, ci) {
          h += '<div style="padding:' + (ci ? '10px 0 0' : '4px 0 0') + ';' + (ci ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(c.school_name || '') + '</b>' +
            '<div class="nt">' + esc(c.parent_company || '') +
            (c.enrollment ? ' · ' + Number(c.enrollment).toLocaleString() + ' students' : '') +
            (c.fraud_allegations ? ' · <span style="color:#ff2a35">fraud flagged</span>' : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — Dept. of Education data</div></div>';
        return;
      }
      /* Private prisons */
      if (f.prisons && f.prisons.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — private prisons</div>';
        f.prisons.slice(0, 8).forEach(function (p, pi) {
          var _cv = Number(p.contract_value_usd);
          var _cvTxt = _cv >= 1e6 ? '$' + (_cv/1e6).toFixed(1) + 'M' : _cv ? '$' + _cv.toLocaleString() : '—';
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (pi ? '10px 0 0' : '4px 0 0') + ';' + (pi ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(p.facility_name || '') + '</b><div class="nt">' +
            esc(p.operator || '') + ' · ' + esc(p.location_state || '') +
            (p.capacity ? ' · ' + Number(p.capacity).toLocaleString() + ' beds' : '') + '</div></div>' +
            '<div class="vl" style="font-size:20px;white-space:nowrap"><span class="num">' + _cvTxt + '</span></div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — prison contract records</div></div>';
        return;
      }
      /* Fair market rents */
      if (f.rents && f.rents.length) {
        var _r = f.rents[0];
        if (_r.areas) {
          h += '<div class="pf-karl-fact"><div class="lb">Exhibit — fair market rents</div>' +
            '<div class="vl"><span class="num">' + Number(_r.areas).toLocaleString() + '</span> areas tracked</div>' +
            '<div class="nt">Latest data: FY' + esc(String(_r.latest_fy || '')) + ' · HUD Fair Market Rents</div>' +
            '<div class="pf-karl-src">▸ Receipts — HUD FMR data</div></div>';
        } else {
          h += '<div class="pf-karl-fact"><div class="lb">Exhibit — fair market rents</div>';
          f.rents.slice(0, 5).forEach(function (r, ri) {
            h += '<div style="padding:' + (ri ? '10px 0 0' : '4px 0 0') + ';' + (ri ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
              '<b style="color:#fff">' + esc(r.area_name || r.county || '') + '</b>' +
              '<div class="nt">2BR: <span class="num">$' + Number(r.fmr_2 || 0).toLocaleString() + '</span>/mo · FY' + esc(String(r.fy || '')) + '</div></div>';
          });
          h += '<div class="pf-karl-src">▸ Receipts — HUD FMR data</div></div>';
        }
        return;
      }
      /* Bills */
      if (f.bills && f.bills.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — federal bills</div>';
        f.bills.slice(0, 5).forEach(function (b, bi) {
          h += '<div style="padding:' + (bi ? '10px 0 0' : '4px 0 0') + ';' + (bi ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(b.bill_id || '') + '</b>' +
            '<div class="nt">' + esc(String(b.title || '').slice(0, 120)) + '</div>' +
            '<div class="nt">' + esc(b.status || '') + (b.sponsor_name ? ' · ' + esc(b.sponsor_name) : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — congressional records</div></div>';
        return;
      }
      /* Evictions */
      if (f.evictions && f.evictions.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — eviction filings</div>';
        f.evictions.slice(0, 8).forEach(function (e, ei) {
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (ei ? '10px 0 0' : '4px 0 0') + ';' + (ei ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(e.county_name || '') + '</b><div class="nt">' +
            esc(e.state_name || '') + ' · ' + esc(String(e.year || '')) + '</div></div>' +
            '<div class="vl" style="font-size:20px;white-space:nowrap"><span class="num">' +
            Number(e.filings_estimate || 0).toLocaleString() + '</span></div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — eviction lab estimates</div></div>';
        return;
      }
      /* Billionaires */
      if (f.billionaires && f.billionaires.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — billionaire wealth</div>';
        f.billionaires.slice(0, 8).forEach(function (b, bi) {
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (bi ? '10px 0 0' : '4px 0 0') + ';' + (bi ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(b.name || '') + '</b>' +
            (b.political_spending ? '<div class="nt">Political spending: $' + Number(b.political_spending).toLocaleString() + '</div>' : '') + '</div>' +
            '<div class="vl" style="font-size:22px;white-space:nowrap"><span class="num">$' +
            Number(b.net_worth_b || 0).toFixed(1) + 'B</span></div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — wealth tracking data</div></div>';
        return;
      }
      /* Labor */
      if (f.labor && f.labor.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — union elections</div>';
        f.labor.slice(0, 8).forEach(function (l, li) {
          var _total = Number(l.votes_for || 0) + Number(l.votes_against || 0);
          var _pct = _total ? Math.round(Number(l.votes_for || 0) / _total * 100) : 0;
          h += '<div style="padding:' + (li ? '10px 0 0' : '4px 0 0') + ';' + (li ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(l.employer || l.series_id || '') + '</b>' +
            '<div class="nt">' + (l.union_1 ? esc(l.union_1) + ' · ' : '') + esc(String(l.election_year || l.period || '')) +
            (_total ? ' · <span class="num">' + _pct + '%</span> voted yes' : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — NLRB / BLS data</div></div>';
        return;
      }
      /* Hospital prices */
      if (f.hospitals && f.hospitals.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — hospital prices</div>';
        f.hospitals.slice(0, 8).forEach(function (hh2, hi2) {
          h += '<div style="padding:' + (hi2 ? '10px 0 0' : '4px 0 0') + ';' + (hi2 ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<b style="color:#fff">' + esc(hh2.procedure_desc || hh2.hospital_name || '') + '</b>' +
            '<div class="nt">Avg charge: <span class="num">$' + Number(hh2.avg_charge || hh2.avg_covered_charges || 0).toLocaleString() +
            '</span>' + (hh2.city ? ' · ' + esc(hh2.city) + ', ' + esc(hh2.state || '') : '') + '</div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — CMS hospital data</div></div>';
        return;
      }
      /* Economy */
      if (f.economy && f.economy.length) {
        h += '<div class="pf-karl-fact"><div class="lb">Exhibit — economic indicators</div>';
        f.economy.slice(0, 8).forEach(function (e2, ei2) {
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (ei2 ? '10px 0 0' : '4px 0 0') + ';' + (ei2 ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(e2.series || e2.series_id || '') + '</b>' +
            '<div class="nt">' + esc(String(e2.period || '')) + '</div></div>' +
            '<div class="vl" style="font-size:20px;white-space:nowrap"><span class="num">' +
            esc(String(e2.value)) + (e2.unit ? ' ' + esc(e2.unit) : '') + '</span></div></div>';
        });
        h += '<div class="pf-karl-src">▸ Receipts — FRED / CPI data</div></div>';
        return;
      }
      /* Enforcement ledger */
      if (f.top_cases && f.top_cases.length) {
        var _tname = String(f.table || 'enforcement').replace(/_/g, ' ');
        h += '<div class="pf-karl-fact"><div class="lb">' + esc(_tname) + ' — top penalties</div>';
        f.top_cases.forEach(function (c, ci) {
          var _pen = Number(c.penalty);
          var _penTxt = _pen >= 1000000 ? '$' + (_pen / 1000000).toFixed(1) + 'M' :
            _pen >= 1000 ? '$' + Math.round(_pen / 1000) + 'K' : '$' + _pen;
          h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:' +
            (ci ? '12px 0 0' : '4px 0 0') + ';' + (ci ? 'border-top:1px solid #1e1e1e;' : '') + '">' +
            '<div><b style="color:#fff">' + esc(c.name) + '</b><div class="nt">' + esc(c.type || '') +
            (c.date ? ' · ' + esc(String(c.date).slice(0, 10)) : '') + '</div></div>' +
            '<div class="vl" style="font-size:22px;white-space:nowrap"><span class="num">' + _penTxt + '</span></div></div>';
        });
        h += '<div class="pf-karl-src">Public enforcement records</div></div>';
        return;
      }
      /* Generic fact */
      h += '<div class="pf-karl-fact"><div class="lb">' + esc(f.label || 'Finding') + '</div>' +
        '<div class="vl">' + richNum(f.value_display || '') + '</div>' +
        (f.note ? '<div class="nt">' + esc(f.note) + '</div>' : '') +
        '<div class="pf-karl-src">' + srcLine(f.source) + '</div></div>';
    });
    if (r.adjacency_note) h += '<div class="pf-karl-adj">' + esc(r.adjacency_note) + '</div>';
    if (!(r.facts || []).length && !(r.disambiguation || []).length && !(r.faq || []).length) {
      h += '<div class="pf-karl-empty"><div class="big">Nothing on the rails for that yet.</div>' +
        esc(r.empty_reason || 'That\'s an honest answer — the rails are still being built out.') + '</div>';
    }
    /* Rail badges: subtle, elegant */
    if ((r.rail_status || []).length) {
      h += '<div class="pf-karl-rail">' + r.rail_status.map(function (s2) {
        return '<span class="' + (s2.live ? 'live' : '') + '">' +
          esc(s2.rail) + '</span>';
      }).join('') + '</div>';
    }
    /* Deep links */
    if ((r.corruption_cards || []).length) {
      h += '<div class="pf-karl-doors"><div class="hd">Follow the corruption</div>' +
        r.corruption_cards.map(function (c, i) {
          if (c.href) {
            var url = safeUrl(c.href);
            if (!url) return '';
            return '<a class="pf-karl-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' +
              esc(c.label) + ' &rarr;<br><span>' + esc(c.hint || '') + '</span></a>';
          }
          return '<button type="button" class="pf-karl-door' + (i ? ' alt' : '') + '" data-cc-query="' + esc(c.query || '') + '" style="width:100%;border:0;cursor:pointer">' +
            esc(c.label) + '<br><span>' + esc(c.hint || '') + '</span></button>';
        }).join('') + '</div>';
    }
    if ((r.related || []).length) {
      h += '<div class="pf-karl-doors"><div class="hd">Go deeper</div>' +
        r.related.map(function (l, i) {
          var url = safeUrl(l.href);
          if (!url) return '';
          return '<a class="pf-karl-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' + esc(l.label) + ' &rarr;</a>';
        }).join('') + '</div>';
    }
    /* MAKE SHAREABLE: natural next step */
    if ((r.facts || []).length) {
      h += '<div class="pf-mss-wrap"><div class="pf-mss-label">Deploy this intel</div>' +
        '<div data-mss-slot><button type="button" class="pf-mss-btn" data-karl-mss>DEPLOY</button></div></div>';
    }
    /* verdict line — the case is built */
    if ((r.facts || []).length) {
      h += '<div class="pf-karl-verdict"><div class="vline">The case is <b>built</b>. The receipts are <b>in</b>.</div></div>';
    }
    h += '</div></div>';
    return h;
  }

  function bindDisamb() {
    var btns = host.querySelectorAll('.pf-karl-disamb button');
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          var nm = b.getAttribute('data-name');
          var ex = b.getAttribute('data-example');
          var input = document.getElementById('pf-karl-q');
          if (ex) {
            if (input) { input.value = ex; input.focus(); }
            return;
          }
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

  render(hero(''));
  wire();
  try {
    var m = /[?&]q=([^&#]*)/.exec(window.location.search || '');
    if (m && decodeURIComponent(m[1]).trim()) {
      var dq = decodeURIComponent(m[1]).trim().slice(0, 300);
      var inp = document.getElementById('pf-karl-q');
      if (inp) inp.value = dq;
      ask(dq);
    }
  } catch (e) {}
  try { if (PF && PF.feWiden) PF.feWiden(host); } catch (e) {}
})();
