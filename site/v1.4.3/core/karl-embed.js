/* core/karl-embed.js  |  PF v1.4.3 | KARL EMBEDDED — inline query boxes for the data pages.
   CEO directive 2026-10-07 ~01:38 CDT ("further integration via EMBEDDING"):
   every data product page gets an inline Karl query box so users ask about
   what they're seeing without navigating to /karl.

   Mount contract (self-mounting silo — add the div, done):
     <div id="pf-karl-embed"
          data-karl-title="Ask about your town"
          data-karl-placeholder="Who owns the biggest employer here?"
          data-karl-context='{"zip":"70801"}'></div>

   Per-page wiring (context auto-filled from the page; endpoint contract:
   ?action=karl_query&q=&context={zip?,name?} — extra keys are harmless):
     /receipt    (fe/data-receipt branch) — data-karl-title="Ask about this politician",
                   data-karl-context='{"name":"<dossier name>","slug":"<dossier slug>"}'
                   → fans out to receipt_dossier + related rails.
     /town       (core/town-page.js, wired) — data-karl-title="Ask about your town",
                   data-karl-context='{"zip":"<zip>"}' → fans out to town_power + related.
     /extraction (Extraction Engine page) — data-karl-title="Ask about this company",
                   data-karl-context='{"company":"<company slug>"}' → fans out to extraction_profile.
     /index      (fe/corruption-index branch, pages/index-page.js) — data-karl-title="Ask about this score",
                   data-karl-context='{"entity":"<entity name>"}' → fans out to index_entity.

   Individual attrs also work: data-karl-zip / data-karl-name / data-karl-slug /
   data-karl-company / data-karl-entity (explicit data-karl-context JSON wins).

   Behavior: compact input + ASK, minimal fact-set cards (NOT the full /karl
   UI), results inline + collapsible, "OPEN IN KARL →" deep-link to the full
   /karl page for complex queries, sticky-web deep-links from the endpoint's
   `related` array. Zero XP — querying is not an action. Mobile-first. Clean,
   light (CEO design direction — Karl surfaces are light even on dark pages).

   Backend: the existing ?action=karl_query&q=&context= endpoint (BE 61594cb,
   contract ~/workspace/hidden/products/data-products/KARL-CONTRACT.md).
   The context param already exists — no new backend needed. Public JSONP
   GET, read-only, 0 XP, 30/hour per IP (degraded → static FAQ, never error).

   API: window.PFKarlEmbed.mountAll() (scan + mount), .setContext(ctx, host?)
   (update context live — e.g. /town calls this after every zip lookup).

   Additive: the widget never replaces page content — it sits alongside it.
   KILL: ?pf_off=karl-embed */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('karl-embed')) { return; }
  if (window.pfKarlEmbedDone) return;
  window.pfKarlEmbedDone = true;

  var BACKEND = window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (s.charAt(0) === '/') return s;
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s;
    } catch (e) {}
    return '';
  }
  function err(m) { try { if (PF && PF.error) PF.error('karl-embed', m); } catch (e) {} }
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

  /* ---------- CSS (once) ---------- */
  var cssDone = false;
  function cssOnce() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent = [
      '.pf-ke{background:#fffdf9;color:#1a1a1a;font-family:Arial,sans-serif;border:1px solid #e7e0d1;',
      'border-radius:14px;padding:20px 16px;margin:24px auto;max-width:640px;line-height:1.5;',
      'box-shadow:0 12px 32px rgba(26,26,26,.08)}',
      '.pf-ke-hd{display:flex;align-items:center;gap:11px;margin-bottom:8px}',
      '.pf-ke-dot{width:10px;height:10px;border-radius:50%;background:#c1121f;flex:0 0 auto;box-shadow:0 0 10px rgba(193,18,31,.5)}',
      '.pf-ke-title{font-weight:900;font-size:15px;letter-spacing:2.5px;margin:0}',
      '.pf-ke-ctx{font-size:12.5px;color:#8a8478;margin:0 0 12px}',
      '.pf-ke-form{display:flex;gap:8px}',
      '.pf-ke-input{flex:1;min-width:0;font-size:16px;padding:13px 15px;border:2px solid #1a1a1a;border-radius:12px;',
      'background:#fff;color:#1a1a1a;outline:none;transition:border-color .15s ease,box-shadow .15s ease}',
      '.pf-ke-input:focus{border-color:#c1121f;box-shadow:0 0 0 3px rgba(193,18,31,.15)}',
      '.pf-ke-btn{background:linear-gradient(135deg,#d61622,#a50e18);color:#fff;border:0;border-radius:12px;',
      'padding:0 22px;font-weight:900;font-size:15px;letter-spacing:1px;cursor:pointer;white-space:nowrap;',
      'box-shadow:0 4px 14px rgba(193,18,31,.3);transition:transform .15s ease,box-shadow .15s ease}',
      '.pf-ke-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(193,18,31,.4)}',
      '.pf-ke-btn:active{transform:scale(.97)}',
      '.pf-ke-btn:disabled{opacity:.55;cursor:wait;transform:none}',
      '.pf-ke-note{font-size:11.5px;color:#a09a8c;margin:9px 0 0}',
      /* Loading — a shimmer card, intentional rather than cheap. */
      '.pf-ke-loading{margin:14px 0 0;border-radius:10px;padding:16px;text-align:left;color:#8a8478;font-size:13.5px;',
      'font-style:italic;background:linear-gradient(100deg,#f4f0e6 30%,#faf7ef 50%,#f4f0e6 70%);',
      'background-size:200% 100%;animation:pfke-shimmer 1.4s infinite linear}',
      '@keyframes pfke-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}',
      /* Errors are graceful: soft red, left rule, no alarm. */
      '.pf-ke-err{background:#fdf4f4;border:0;border-left:4px solid #c1121f;border-radius:8px;',
      'padding:13px 15px;font-size:14px;color:#8a1414;margin:14px 0 0;box-shadow:0 4px 14px rgba(193,18,31,.08)}',
      '.pf-ke-degraded{background:#fffaf0;border:1px solid #e8b923;border-radius:10px;padding:12px 15px;',
      'font-size:13px;color:#6b5a00;margin:14px 0 0}',
      '.pf-ke-res{margin:14px 0 0;border-top:2px solid #1a1a1a;padding-top:12px}',
      '.pf-ke-resbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
      '.pf-ke-resbar .t{font-weight:900;font-size:11.5px;letter-spacing:3.5px;color:#8a8478}',
      '.pf-ke-toggle{background:none;border:0;color:#c1121f;font-weight:700;font-size:13px;cursor:pointer;padding:8px 6px;min-height:40px}',
      '.pf-ke-entity .nm{font-family:Georgia,serif;font-weight:700;font-size:23px;letter-spacing:.5px;margin:10px 0 3px}',
      '.pf-ke-entity .mt{font-size:13px;color:#5a564d}',
      '.pf-ke-fact{background:#fff;border:1px solid #e7e0d1;border-radius:12px;padding:14px 16px;margin:9px 0;',
      'box-shadow:0 4px 14px rgba(26,26,26,.05);transition:transform .15s ease,box-shadow .15s ease}',
      '.pf-ke-fact:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(26,26,26,.08)}',
      '.pf-ke-fact .lb{font-size:11.5px;font-weight:700;color:#8a8478;letter-spacing:1.2px;margin-bottom:3px}',
      '.pf-ke-fact .vl{font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1a1a1a}',
      '.pf-ke-fact .nt{font-size:12.5px;color:#8a8478;margin-top:5px}',
      '.pf-ke-src{font-size:11.5px;color:#a09a8c;margin-top:9px;border-top:1px dashed #e2ddd0;padding-top:7px}',
      '.pf-ke-stale{color:#b35400;font-weight:700}',
      '.pf-ke-empty{background:#fff;border:1px dashed #c9c2b2;border-radius:12px;padding:20px 16px;margin:10px 0;',
      'text-align:center;font-size:14px;color:#5a564d}',
      '.pf-ke-empty .big{font-family:Georgia,serif;font-weight:700;font-size:18px;color:#1a1a1a;margin-bottom:8px}',
      '.pf-ke-disamb button{display:block;width:100%;text-align:left;background:#fff;border:1px solid #d8d2c4;',
      'border-radius:10px;padding:13px 15px;margin:7px 0;font-size:14px;cursor:pointer;color:#1a1a1a;',
      'transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}',
      '.pf-ke-disamb button:hover{border-color:#c1121f;box-shadow:0 4px 12px rgba(193,18,31,.12);transform:translateY(-1px)}',
      '.pf-ke-adj{font-size:12.5px;color:#8a8478;font-style:italic;text-align:center;margin:12px 0}',
      '.pf-ke-doors{margin:14px 0 2px}',
      '.pf-ke-door{display:block;text-align:center;background:linear-gradient(135deg,#d61622,#a50e18);color:#fff!important;',
      'font-weight:900;letter-spacing:1.5px;font-size:13.5px;padding:13px;border-radius:12px;text-decoration:none;margin:9px 0;',
      'box-shadow:0 4px 14px rgba(193,18,31,.25);transition:transform .15s ease,box-shadow .15s ease}',
      '.pf-ke-door:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(193,18,31,.35)}',
      '.pf-ke-door.alt{background:#1a1a1a;box-shadow:0 4px 14px rgba(0,0,0,.2)}',
      '.pf-ke-full{display:block;text-align:center;font-size:13px;font-weight:700;color:#c1121f;margin:12px 0 2px;',
      'text-decoration:none;padding:8px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- backend (JSONP, same contract as karl-page) ---------- */
  function api(params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfKarlEmbedCb' + Math.floor(Math.random() * 1e9);
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

  /* ---------- context ---------- */
  function readContext(el) {
    var ctx = {};
    try {
      var raw = el.getAttribute('data-karl-context');
      if (raw) ctx = JSON.parse(raw) || {};
    } catch (e) { ctx = {}; }
    var singles = ['zip', 'name', 'slug', 'company', 'entity'];
    singles.forEach(function (k) {
      var v = el.getAttribute('data-karl-' + k);
      if (v && ctx[k] == null) ctx[k] = v;
    });
    return ctx;
  }
  function ctxLabel(ctx) {
    if (ctx.zip) return 'your area ' + ctx.zip;
    if (ctx.name) return ctx.name;
    if (ctx.company) return ctx.company;
    if (ctx.entity) return ctx.entity;
    if (ctx.slug) return ctx.slug;
    return '';
  }

  /* ---------- answer rendering (minimal fact-set cards) ---------- */
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
    var stale = s.stale ? ' <span class="pf-ke-stale">&#9888; ' + esc(s.stale_note || 'stale') + '</span>' : '';
    return bits.join(' &middot; ') + stale;
  }

  function answerHtml(q, r) {
    var h = '<div class="pf-ke-resbar"><span class="t">ANSWER</span>' +
      '<button type="button" class="pf-ke-toggle" data-ke-toggle>collapse &#9650;</button></div>' +
      '<div data-ke-body>';
    if (r.degraded) {
      h += '<div class="pf-ke-degraded">' + esc(r.degraded_note || 'Karl is resting — static answers only.') + '</div>';
    }
    if (r.template === 'faq' && r.faq && r.faq.length) {
      h += '<div class="pf-ke-empty"><div class="big">KARL</div>' + esc(r.faq[0].answer) + '</div>';
    }
    if (r.disambiguation && r.disambiguation.length) {
      h += '<div class="pf-ke-empty"><div class="big">More than one matched — pick one.</div>' +
        '<div class="pf-ke-disamb">' +
        r.disambiguation.map(function (o) {
          return '<button type="button" data-ke-name="' + esc(o.name) + '">' +
            '<b>' + esc(o.name) + '</b><br><span style="font-size:12.5px;color:#8a8478">' +
            esc([o.office, o.state, o.party].filter(Boolean).join(' · ')) + '</span></button>';
        }).join('') + '</div><div style="font-size:12px;color:#8a8478;margin-top:8px">Karl never guesses — you choose.</div></div>';
    }
    if (r.entity) {
      var meta = [];
      if (r.entity.office) meta.push(r.entity.office);
      if (r.entity.state || r.entity.state_code) meta.push(r.entity.state || r.entity.state_code);
      if (r.entity.party) meta.push(r.entity.party);
      if (r.entity.label) meta.push(r.entity.label);
      h += '<div class="pf-ke-entity"><div class="nm">' + esc(r.entity.name || r.entity.zip || '') + '</div>' +
        (meta.length ? '<div class="mt">' + esc(meta.join(' · ')) + '</div>' : '') + '</div>';
    }
    (r.facts || []).forEach(function (f) {
      h += '<div class="pf-ke-fact"><div class="lb">' + esc(f.label) + '</div>' +
        '<div class="vl">' + esc(f.value_display) + '</div>' +
        (f.note ? '<div class="nt">' + esc(f.note) + '</div>' : '') +
        '<div class="pf-ke-src">' + srcLine(f.source) + '</div></div>';
    });
    if (r.adjacency_note) h += '<div class="pf-ke-adj">' + esc(r.adjacency_note) + '</div>';
    if (!(r.facts || []).length && !(r.disambiguation || []).length && !(r.faq || []).length) {
      h += '<div class="pf-ke-empty"><div class="big">I don\'t have data on that yet.</div>' +
        esc(r.empty_reason || 'That\'s a real answer — the rails are still building out.') + '</div>';
    }
    /* Sticky web: the endpoint's deep-links into the rooms. */
    if ((r.related || []).length) {
      h += '<div class="pf-ke-doors">' +
        r.related.slice(0, 3).map(function (l, i) {
          var url = safeUrl(l.href);
          if (!url) return '';
          return '<a class="pf-ke-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' + esc(l.label) + ' &rarr;</a>';
        }).join('') + '</div>';
    }
    h += '</div>'; /* /data-ke-body */
    /* Complex queries ride the full /karl front door. */
    h += '<a class="pf-ke-full" href="/karl?q=' + encodeURIComponent(q) + '">OPEN IN KARL &rarr;</a>';
    return h;
  }

  /* ---------- mount ---------- */
  function mount(el) {
    if (!el || el.getAttribute('data-pf-ke-mounted')) return;
    el.setAttribute('data-pf-ke-mounted', '1');
    cssOnce();

    var title = el.getAttribute('data-karl-title') || 'Ask Karl';
    var placeholder = el.getAttribute('data-karl-placeholder') || 'Ask about what you\'re seeing…';

    function ctxLineHtml(c) {
      var lbl = ctxLabel(c);
      return lbl ? 'About: <b>' + esc(lbl) + '</b>' : 'Karl answers from public records — never from memory.';
    }

    el.innerHTML =
      '<div class="pf-ke">' +
      '<div class="pf-ke-hd"><span class="pf-ke-dot"></span><h3 class="pf-ke-title">' + esc(title).toUpperCase() + '</h3></div>' +
      '<p class="pf-ke-ctx" data-ke-ctxline>' + ctxLineHtml(readContext(el)) + '</p>' +
      '<form class="pf-ke-form" data-ke-form>' +
      '<input class="pf-ke-input" data-ke-q type="text" maxlength="300" autocomplete="off" placeholder="' + esc(placeholder) + '" aria-label="' + esc(title) + '">' +
      '<button class="pf-ke-btn" type="submit">ASK</button></form>' +
      '<p class="pf-ke-note">Sourced from public records. Zero XP — asking is free.</p>' +
      '<div data-ke-out></div>' +
      '</div>';

    var form = el.querySelector('[data-ke-form]');
    var input = el.querySelector('[data-ke-q]');
    var out = el.querySelector('[data-ke-out]');

    function runQuery(q, ctxOverride) {
      var btn = form.querySelector('.pf-ke-btn');
      btn.disabled = true;
      out.innerHTML = '<div class="pf-ke-loading">Querying the rails&hellip;</div>';
      var c = readContext(el);
      if (ctxOverride) { for (var k in ctxOverride) c[k] = ctxOverride[k]; }
      api({ q: q, context: JSON.stringify(c) }, function (r) {
        btn.disabled = false;
        if (!r || (r.ok === false && !r.template)) {
          out.innerHTML = '<div class="pf-ke-err">The rails didn\'t answer. Check your connection and try again.</div>';
          err('karl_query failed');
          return;
        }
        out.innerHTML = '<div class="pf-ke-res">' + answerHtml(q, r) + '</div>';
        wireResult(out, q);
        try { out.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
      });
    }

    function wireResult(scope, q) {
      var tgl = scope.querySelector('[data-ke-toggle]');
      var body = scope.querySelector('[data-ke-body]');
      if (tgl && body) {
        tgl.addEventListener('click', function () {
          var hidden = body.style.display === 'none';
          body.style.display = hidden ? '' : 'none';
          tgl.innerHTML = hidden ? 'collapse &#9650;' : 'expand &#9660;';
        });
      }
      var ds = scope.querySelectorAll('[data-ke-name]');
      for (var i = 0; i < ds.length; i++) {
        (function (b) {
          b.addEventListener('click', function () {
            var nm = b.getAttribute('data-ke-name');
            var q2 = 'who funds ' + nm + '?';
            input.value = q2;
            runQuery(q2, { name: nm });
          });
        })(ds[i]);
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = String(input.value || '').trim();
      if (!q) { input.focus(); return; }
      runQuery(q);
    });

    /* Live context updates (e.g. /town calls setContext after each lookup). */
    el._pfKeRefreshCtx = function () {
      var line = el.querySelector('[data-ke-ctxline]');
      if (line) line.innerHTML = ctxLineHtml(readContext(el));
    };
  }

  function mountAll() {
    var els = document.querySelectorAll('#pf-karl-embed');
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  function setContext(ctx, host) {
    var targets = [];
    if (host) {
      targets = [host];
    } else {
      var els = document.querySelectorAll('#pf-karl-embed');
      for (var i = 0; i < els.length; i++) targets.push(els[i]);
    }
    targets.forEach(function (el) {
      if (!el.getAttribute('data-pf-ke-mounted')) mount(el);
      var cur = readContext(el);
      for (var k in ctx) { cur[k] = ctx[k]; }
      el.setAttribute('data-karl-context', JSON.stringify(cur));
      if (typeof el._pfKeRefreshCtx === 'function') el._pfKeRefreshCtx();
    });
  }

  window.PFKarlEmbed = { mountAll: mountAll, setContext: setContext };

  /* Boot: mount what's present; watch for late-added divs (pages render hosts after chunk load). */
  function boot() {
    mountAll();
    try {
      var mo = new MutationObserver(function () { mountAll(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
