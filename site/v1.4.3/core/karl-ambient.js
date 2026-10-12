/* core/karl-ambient.js | PF v1.4.3 | KARL AMBIENT — the sheet.
   Loaded ONLY on first tap of the Ask Karl pill (karl-ambient-loader.js
   carries the always-on footprint). Karl stops being a place you go:
   one tap opens him HERE, over the page you're on, already knowing
   what you're looking at.

   Contract: the same public ?action=karl_query&q=&context= the /karl
   page and karl-embed use — deterministic rails, NO LLM, every fact
   source-stamped (name · period · retrieved · stale badge). /karl
   stays the deep workspace; this is the front door, not a replacement.

   Context (auto, no re-typing): an inline #pf-karl-embed's declared
   context wins; else the page itself — extraction ?company=, town zip,
   campaign page, creator catalog (h1 + propaganda-score marker), and
   the creator hub (slug → creator_hub payload: stats + today's press
   pack ride along; the sheet can turn the top pack item into a post
   draft in place, from the pack's real fields).

   Distillation law: no settings, no modes to configure, no AI jargon.
   KILL: ?pf_off=karl-ambient */
(function () {
  'use strict';
  if (window.PFKarlAmbient && window.PFKarlAmbient._full) return;

  var BACKEND = window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev';

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (s.charAt(0) === '/') return s;
    try { var p = new URL(s, 'https://x.invalid').protocol; if (p === 'http:' || p === 'https:') return s; } catch (e) {}
    return '';
  }
  function qs(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function money(n) {
    n = Number(n);
    if (!isFinite(n)) return String(n);
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + n.toLocaleString('en-US');
  }
  function num(n) { n = Number(n); return isFinite(n) ? n.toLocaleString('en-US') : String(n); }

  /* ---------------- backend (JSONP, same as karl-embed) ---------------- */
  function api(params, cb) {
    var fn = 'pfKarlAmbCb' + Math.floor(Math.random() * 1e9);
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
  function apiJson(action, params, cb) {
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    fetch(BACKEND + '/' + q, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (j) { cb(j); })
      .catch(function () { cb(null); });
  }

  /* ---------------- context ---------------- */
  function ctxLabel(c) {
    if (!c) return '';
    if (c.creator) return c.name || 'your hub';
    if (c.zip) return 'your area ' + c.zip;
    if (c.name) return c.name;
    if (c.company) return c.company;
    if (c.entity) return c.entity;
    if (c.slug) return c.slug;
    if (c.page_type === 'campaign') return 'this campaign';
    return '';
  }

  function detectContext() {
    var path = location.pathname || '/';
    var out = { ctx: {}, mode: 'page', chips: [], slug: null };

    /* 1 — an inline embed already declared this page's context. */
    var emb = document.querySelector('#pf-karl-embed');
    if (emb) {
      try {
        var raw = emb.getAttribute('data-karl-context');
        if (raw) out.ctx = JSON.parse(raw) || {};
      } catch (e) {}
      ['zip', 'name', 'slug', 'company', 'entity'].forEach(function (k) {
        var v = emb.getAttribute('data-karl-' + k);
        if (v && out.ctx[k] == null) out.ctx[k] = v;
      });
      if (Object.keys(out.ctx).length) { out.mode = 'embed'; return finishCtx(out); }
    }

    /* 2 — creator hub / claim: Karl works for the creator here. */
    var slug = qs('slug');
    if ((/^\/creator-hub\/?$/.test(path) || /^\/join\/?$/.test(path)) && slug) {
      out.mode = 'creator';
      out.slug = slug;
      out.ctx = { creator: slug, page_type: 'creator_hub' };
      return finishCtx(out);
    }

    /* 3 — extraction / data pages carrying an entity in the URL. */
    var company = qs('company') || qs('entity');
    if (company) {
      out.ctx = { company: company, page_type: 'extraction' };
      out.mode = 'company';
      return finishCtx(out);
    }
    var zip = (qs('zip') || '').match(/\b\d{5}\b/);
    if (zip || /^\/town\/?$/.test(path)) {
      out.ctx = { zip: zip ? zip[0] : null, page_type: 'town' };
      out.mode = 'town';
      return finishCtx(out);
    }

    /* 4 — the live campaign page. */
    if (/fire-goofy-guifoyle/.test(path)) {
      out.ctx = { page_type: 'campaign' };
      out.mode = 'campaign';
      return finishCtx(out);
    }

    /* 5 — creator catalog pages: one-segment path, roster markers, h1 = name. */
    if (/^\/[a-z0-9-]+\/?$/.test(path) && path !== '/') {
      var bodyTxt = (document.body && document.body.textContent || '').toLowerCase();
      var h1 = document.querySelector('h1');
      var nm = h1 ? (h1.textContent || '').trim() : '';
      if (nm && nm.length <= 42 && bodyTxt.indexOf('propaganda score') !== -1) {
        out.ctx = { name: nm, page_type: 'creator_catalog' };
        out.mode = 'catalog';
        return finishCtx(out);
      }
    }

    out.ctx = { page_type: path.replace(/\//g, ' ').trim().split(' ')[0] || 'home' };
    return finishCtx(out);
  }

  function finishCtx(out) {
    var c = out.ctx;
    if (out.mode === 'company') {
      var co = c.company;
      out.chips = [
        { label: 'What did they do?', q: 'What did ' + co + ' do?' },
        { label: 'OSHA violations', q: 'What OSHA violations does ' + co + ' have?' },
        { label: 'Follow the money', q: 'Show me the money trail for ' + co }
      ];
    } else if (out.mode === 'town') {
      out.chips = [
        { label: 'Who funds my rep?', q: 'Who funds my rep?' },
        { label: 'What are people paying?', q: 'What are people paying in my area?' }
      ];
    } else if (out.mode === 'campaign') {
      out.chips = [
        { label: 'What is this campaign?', q: 'What is the Fire Goofy Guifoyle campaign?' },
        { label: 'How do I join?', q: 'How do I join the Fire Goofy Guifoyle campaign?' }
      ];
    } else if (out.mode === 'catalog') {
      out.chips = [
        { label: 'Who is ' + c.name + '?', q: 'Who is ' + c.name + '?' },
        { label: 'What do they post about?', q: 'What does ' + c.name + ' post about?' }
      ];
    } else if (out.mode === 'creator') {
      out.chips = [
        { label: 'What should I post today?', act: 'pack' },
        { label: 'Draft a post for me', act: 'draft' },
        { label: 'What did Amazon do?', q: 'What did Amazon do?' }
      ];
    } else if (out.mode === 'embed') {
      out.chips = [
        { label: 'What did they do?', q: 'What did ' + (c.name || c.company || c.entity || 'they') + ' do?' },
        { label: 'Follow the money', q: 'Show me the money trail' }
      ];
      if (c.zip) out.chips = [
        { label: 'Who funds my rep?', q: 'Who funds my rep?' },
        { label: 'What are people paying?', q: 'What are people paying in my area?' }
      ];
    } else {
      out.chips = [
        { label: 'What did Amazon do?', q: 'What OSHA violations does Amazon have?' },
        { label: 'The campaign', q: 'What is the Fire Goofy Guifoyle campaign?' },
        { label: 'Who funds my rep?', q: 'Who funds my rep?' }
      ];
    }
    return out;
  }

  /* ---------------- CSS (injected once, with the module) ---------------- */
  var cssDone = false;
  function cssOnce() {
    if (cssDone) return; cssDone = true;
    var st = document.createElement('style');
    st.textContent = [
      '.pf-ka-overlay{position:fixed;inset:0;background:rgba(10,10,10,.55);z-index:9700;opacity:0;transition:opacity .18s ease}',
      '.pf-ka-overlay.pf-ka-on{opacity:1}',
      '.pf-ka-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9701;background:#fffdf9;color:#1a1a1a;',
      'border-radius:18px 18px 0 0;box-shadow:0 -14px 44px rgba(0,0,0,.35);display:flex;flex-direction:column;',
      'max-height:86dvh;transform:translateY(14px);opacity:0;transition:transform .18s ease,opacity .18s ease;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
      '.pf-ka-sheet.pf-ka-on{transform:none;opacity:1}',
      '@media(min-width:760px){.pf-ka-sheet{left:auto;top:0;max-height:none;width:430px;border-radius:0;',
      'box-shadow:-14px 0 44px rgba(0,0,0,.35);transform:translateX(14px)}.pf-ka-sheet.pf-ka-on{transform:none}}',
      '.pf-ka-hd{display:flex;align-items:center;gap:10px;padding:15px 16px 10px;border-bottom:2px solid #1a1a1a}',
      '.pf-ka-dot{width:10px;height:10px;border-radius:50%;background:#c1121f;flex:0 0 auto;box-shadow:0 0 10px rgba(193,18,31,.55)}',
      '.pf-ka-name{font-weight:900;font-size:16px;letter-spacing:3px;margin:0}',
      '.pf-ka-ctx{font-size:12.5px;color:#8a8478;margin:2px 0 0}',
      '.pf-ka-x{margin-left:auto;background:none;border:0;font-size:24px;line-height:1;color:#5a564d;cursor:pointer;padding:6px 8px;min-width:44px;min-height:44px}',
      '.pf-ka-chips{display:flex;gap:8px;overflow-x:auto;padding:12px 16px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
      '.pf-ka-chips::-webkit-scrollbar{display:none}',
      '.pf-ka-chip{flex:0 0 auto;background:#fff;border:1.5px solid #1a1a1a;border-radius:999px;padding:9px 14px;',
      'font-size:13.5px;font-weight:700;color:#1a1a1a;cursor:pointer;white-space:nowrap}',
      '.pf-ka-chip:active{transform:scale(.96);background:#f7f2e7}',
      '.pf-ka-log{overflow-y:auto;padding:6px 16px 10px;-webkit-overflow-scrolling:touch}',
      '.pf-ka-q{font-weight:800;font-size:15.5px;margin:16px 0 8px;color:#1a1a1a}',
      '.pf-ka-q:before{content:"YOU — ";font-size:11px;letter-spacing:2px;color:#c1121f}',
      '.pf-ka-loading{border-radius:10px;padding:15px;color:#8a8478;font-size:13.5px;font-style:italic;',
      'background:linear-gradient(100deg,#f4f0e6 30%,#faf7ef 50%,#f4f0e6 70%);background-size:200% 100%;animation:pfka-sh 1.4s infinite linear}',
      '@keyframes pfka-sh{from{background-position:200% 0}to{background-position:-200% 0}}',
      '.pf-ka-err{background:#fdf4f4;border-left:4px solid #c1121f;border-radius:8px;padding:12px 14px;font-size:14px;color:#8a1414;margin:10px 0}',
      '.pf-ka-degraded{background:#fffaf0;border:1px solid #e8b923;border-radius:10px;padding:11px 14px;font-size:13px;color:#6b5a00;margin:10px 0}',
      '.pf-ka-entity .nm{font-family:Georgia,serif;font-weight:700;font-size:22px;margin:8px 0 2px}',
      '.pf-ka-entity .mt{font-size:13px;color:#5a564d}',
      '.pf-ka-fact{background:#fff;border:1px solid #e7e0d1;border-radius:12px;padding:13px 15px;margin:9px 0;box-shadow:0 4px 14px rgba(26,26,26,.05)}',
      '.pf-ka-fact .lb{font-size:11.5px;font-weight:700;color:#8a8478;letter-spacing:1.2px;margin-bottom:3px}',
      '.pf-ka-fact .vl{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1a1a1a;overflow-wrap:anywhere}',
      '.pf-ka-fact .nt{font-size:12.5px;color:#8a8478;margin-top:5px}',
      '.pf-ka-src{font-size:11.5px;color:#a09a8c;margin-top:9px;border-top:1px dashed #e2ddd0;padding-top:7px}',
      '.pf-ka-stale{color:#b35400;font-weight:700}',
      '.pf-ka-rail{margin:10px 0}',
      '.pf-ka-rail-t{font-size:11.5px;font-weight:900;letter-spacing:2px;color:#8a8478;margin-bottom:6px;text-transform:uppercase}',
      '.pf-ka-row{background:#fff;border:1px solid #e7e0d1;border-radius:10px;padding:11px 13px;margin:7px 0}',
      '.pf-ka-row .t{font-weight:800;font-size:14.5px}',
      '.pf-ka-row .m{font-size:12.5px;color:#5a564d;margin-top:3px}',
      '.pf-ka-row .bio{font-size:12.5px;color:#5a564d;margin-top:5px}',
      '.pf-ka-more{font-size:12.5px;color:#8a8478;margin:4px 0 2px}',
      '.pf-ka-empty{background:#fff;border:1px dashed #c9c2b2;border-radius:12px;padding:18px 15px;margin:10px 0;text-align:center;font-size:14px;color:#5a564d}',
      '.pf-ka-empty .big{font-family:Georgia,serif;font-weight:700;font-size:17px;color:#1a1a1a;margin-bottom:7px}',
      '.pf-ka-disamb button{display:block;width:100%;text-align:left;background:#fff;border:1px solid #d8d2c4;border-radius:10px;padding:12px 14px;margin:7px 0;font-size:14px;cursor:pointer;color:#1a1a1a}',
      '.pf-ka-adj{font-size:12.5px;color:#8a8478;font-style:italic;text-align:center;margin:11px 0}',
      '.pf-ka-doors{margin:12px 0 2px}',
      '.pf-ka-door{display:block;text-align:center;background:linear-gradient(135deg,#d61622,#a50e18);color:#fff!important;font-weight:900;letter-spacing:1.5px;font-size:13.5px;padding:13px;border-radius:12px;text-decoration:none;margin:8px 0}',
      '.pf-ka-door.alt{background:#1a1a1a}',
      '.pf-ka-callrep{background:#111;color:#f5f0e6;border-radius:12px;padding:14px 15px;margin:11px 0}',
      '.pf-ka-callrep .t{font-size:11px;font-weight:900;letter-spacing:2.5px;color:#e5383b;margin-bottom:5px}',
      '.pf-ka-callrep .who{font-family:Georgia,serif;font-size:18px;font-weight:700}',
      '.pf-ka-callrep .ph{display:inline-block;margin-top:9px;background:#c1121f;color:#fff;font-weight:900;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14.5px}',
      '.pf-ka-callrep .sc{font-size:13px;color:#c9c2b2;margin-top:10px;line-height:1.5}',
      '.pf-ka-draft{background:#fff;border:1.5px solid #1a1a1a;border-radius:12px;padding:14px 15px;margin:10px 0}',
      '.pf-ka-draft .t{font-size:11px;font-weight:900;letter-spacing:2.5px;color:#c1121f;margin-bottom:7px}',
      '.pf-ka-draft .body{font-size:14.5px;line-height:1.55;white-space:pre-wrap}',
      '.pf-ka-draft .src{font-size:11.5px;color:#a09a8c;margin-top:9px}',
      '.pf-ka-copy{margin-top:11px;background:#1a1a1a;color:#fff;border:0;border-radius:10px;padding:11px 18px;font-weight:800;font-size:13.5px;cursor:pointer}',
      '.pf-ka-srcline{font-size:11.5px;color:#a09a8c;margin:10px 0 2px}',
      '.pf-ka-full{display:block;text-align:center;font-size:13px;font-weight:700;color:#c1121f;margin:12px 0 4px;text-decoration:none;padding:8px}',
      '.pf-ka-form{display:flex;gap:8px;padding:11px 16px calc(13px + env(safe-area-inset-bottom,0px));border-top:1px solid #e7e0d1;background:#fffdf9}',
      '.pf-ka-input{flex:1;min-width:0;font-size:16px;padding:12px 14px;border:2px solid #1a1a1a;border-radius:12px;background:#fff;color:#1a1a1a;outline:none}',
      '.pf-ka-input:focus{border-color:#c1121f;box-shadow:0 0 0 3px rgba(193,18,31,.15)}',
      '.pf-ka-btn{background:linear-gradient(135deg,#d61622,#a50e18);color:#fff;border:0;border-radius:12px;padding:0 20px;font-weight:900;font-size:14.5px;letter-spacing:1px;cursor:pointer;white-space:nowrap}',
      '.pf-ka-btn:disabled{opacity:.55;cursor:wait}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------------- rendering ---------------- */
  function srcLine(s) {
    s = s || {};
    var bits = [];
    if (s.name) bits.push(esc(s.name));
    if (s.period) bits.push(esc(String(s.period)));
    var ret = '';
    if (s.retrieved_at) {
      /* Rails stamp retrieved_at as epoch ms OR ISO string — handle both. */
      var t = Number(s.retrieved_at);
      if (!isFinite(t)) t = Date.parse(s.retrieved_at);
      var d = new Date(t);
      if (!isNaN(d.getTime())) ret = 'retrieved ' + d.toISOString().slice(0, 10);
    }
    if (ret) bits.push(esc(ret));
    var stale = s.stale ? ' <span class="pf-ka-stale">&#9888; ' + esc(s.stale_note || 'stale') + '</span>' : '';
    return bits.join(' &middot; ') + stale;
  }

  var TITLE_KEYS = ['name', 'employer', 'company', 'donor_employer', 'title', 'headline', 'filer', 'candidate', 'organization'];
  var METRIC_KEYS = [
    ['followers_display', ''], ['propaganda_score', 'score '], ['total_violations', ' violations'],
    ['serious_cnt', ' serious'], ['total_penalties', ' penalties ', true], ['total_inspections', ' inspections'],
    ['fatalities', ' fatalities'], ['donations', ' donations'], ['total', '', true], ['amount', '', true],
    ['value', '', true], ['shares', ' shares'], ['price', ' @ ', true], ['count', ''], ['cases', ' cases']
  ];
  function railRowHtml(r) {
    if (!r || typeof r !== 'object') return '';
    var t = '';
    for (var i = 0; i < TITLE_KEYS.length; i++) {
      if (r[TITLE_KEYS[i]]) { t = String(r[TITLE_KEYS[i]]); break; }
    }
    if (!t) {
      for (var k in r) { if (typeof r[k] === 'string' && r[k].length > 1) { t = r[k]; break; } }
    }
    var ms = [];
    METRIC_KEYS.forEach(function (mk) {
      var v = r[mk[0]];
      if (v == null || v === '' || ms.length >= 3) return;
      ms.push(mk[1] + (mk[2] ? money(v) : (typeof v === 'number' ? num(v) : esc(String(v)))));
    });
    var bio = '';
    if (r.bio) bio = '<div class="bio">' + esc(String(r.bio).replace(/[#>*_`]/g, '').slice(0, 150)) + '&hellip;</div>';
    return '<div class="pf-ka-row"><div class="t">' + esc(t || 'Record') + '</div>' +
      (ms.length ? '<div class="m">' + ms.join(' &middot; ') + '</div>' : '') + bio + '</div>';
  }
  function humanize(t) {
    var s = String(t || 'records').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function factsHtml(r) {
    var h = '';
    (r.facts || []).forEach(function (f) {
      if (!f || typeof f !== 'object') return;
      if (f.label && f.value_display != null) {
        h += '<div class="pf-ka-fact"><div class="lb">' + esc(f.label) + '</div>' +
          '<div class="vl">' + esc(f.value_display) + '</div>' +
          (f.note ? '<div class="nt">' + esc(f.note) + '</div>' : '') +
          '<div class="pf-ka-src">' + srcLine(f.source) + '</div></div>';
        return;
      }
      /* Rail-shaped fact: {table, <plural>: [rows]} — summarize honestly. */
      var arrays = Object.keys(f).filter(function (k) { return Array.isArray(f[k]); });
      arrays.forEach(function (k) {
        var rows = f[k];
        if (!rows.length) return;
        h += '<div class="pf-ka-rail"><div class="pf-ka-rail-t">' + esc(humanize(f.table || k)) + '</div>';
        rows.slice(0, 4).forEach(function (row) { h += railRowHtml(row); });
        if (rows.length > 4) h += '<div class="pf-ka-more">+ ' + (rows.length - 4) + ' more — open in Karl for the full set &rarr;</div>';
        h += '</div>';
      });
      if (!arrays.length && f.note) h += '<div class="pf-ka-adj">' + esc(f.note) + '</div>';
    });
    return h;
  }

  function answerHtml(q, r) {
    var h = '';
    if (r.degraded) {
      h += '<div class="pf-ka-degraded">' + esc(r.degraded_note || 'Karl is resting — static answers only.') + '</div>';
    }
    if (r.template === 'faq' && r.faq && r.faq.length) {
      h += '<div class="pf-ka-empty"><div class="big">KARL</div>' + esc(r.faq[0].answer) + '</div>';
    }
    if (r.disambiguation && r.disambiguation.length) {
      h += '<div class="pf-ka-empty"><div class="big">More than one matched — pick one.</div>' +
        '<div class="pf-ka-disamb">' +
        r.disambiguation.map(function (o) {
          return '<button type="button" data-ka-name="' + esc(o.name) + '">' +
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
      h += '<div class="pf-ka-entity"><div class="nm">' + esc(r.entity.name || r.entity.zip || '') + '</div>' +
        (meta.length ? '<div class="mt">' + esc(meta.join(' · ')) + '</div>' : '') + '</div>';
    }
    h += factsHtml(r);
    if (r.adjacency_note) h += '<div class="pf-ka-adj">' + esc(r.adjacency_note) + '</div>';
    if (r.call_rep && r.call_rep.name) {
      var cr = r.call_rep;
      h += '<div class="pf-ka-callrep"><div class="t">DON\'T JUST READ IT — CALL</div>' +
        '<div class="who">' + esc(cr.name) + (cr.district ? ' — ' + esc(cr.district) : '') + '</div>' +
        (cr.phone_tel ? '<a class="ph" href="tel:' + esc(cr.phone_tel) + '">&#128222; ' + esc(cr.phone_display || cr.phone_tel) + '</a>' : '') +
        (cr.script ? '<div class="sc">' + esc(cr.script) + '</div>' : '') +
        (cr.cta_line ? '<div class="sc">' + esc(cr.cta_line) + '</div>' : '') + '</div>';
    }
    var hasContent = (r.facts || []).length || (r.disambiguation || []).length || (r.faq || []).length || r.call_rep;
    if (!hasContent) {
      h += '<div class="pf-ka-empty"><div class="big">I don\'t have data on that yet.</div>' +
        esc(r.empty_reason || 'That\'s a real answer — the rails are still building out.') + '</div>';
    }
    if ((r.sources_used || []).length) {
      h += '<div class="pf-ka-srcline">Rails: ' + r.sources_used.map(function (s) {
        return esc(typeof s === 'string' ? s : (s.name || s.id || ''));
      }).filter(Boolean).join(' &middot; ') + '</div>';
    }
    if ((r.related || []).length) {
      h += '<div class="pf-ka-doors">' +
        r.related.slice(0, 3).map(function (l, i) {
          var url = safeUrl(l.href);
          if (!url) return '';
          return '<a class="pf-ka-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' + esc(l.label) + ' &rarr;</a>';
        }).join('') + '</div>';
    }
    h += '<a class="pf-ka-full" href="/karl?q=' + encodeURIComponent(q) + '">OPEN IN KARL &rarr;</a>';
    return h;
  }

  /* ---------------- sheet ---------------- */
  var built = false, els = {}, state = null, hub = null, hubLoading = false;

  function build() {
    if (built) return; built = true;
    cssOnce();
    var ov = document.createElement('div');
    ov.className = 'pf-ka-overlay';
    ov.setAttribute('data-ka-overlay', '');
    var sh = document.createElement('section');
    sh.className = 'pf-ka-sheet';
    sh.setAttribute('role', 'dialog');
    sh.setAttribute('aria-label', 'Ask Karl');
    sh.innerHTML =
      '<div class="pf-ka-hd"><span class="pf-ka-dot"></span><div>' +
      '<h3 class="pf-ka-name">KARL</h3><p class="pf-ka-ctx" data-ka-ctx></p></div>' +
      '<button type="button" class="pf-ka-x" data-ka-close aria-label="Close Karl">&times;</button></div>' +
      '<div class="pf-ka-chips" data-ka-chips></div>' +
      '<div class="pf-ka-log" data-ka-log aria-live="polite"></div>' +
      '<form class="pf-ka-form" data-ka-form>' +
      '<input class="pf-ka-input" data-ka-q type="text" maxlength="300" autocomplete="off" enterkeyhint="go" autocapitalize="sentences" placeholder="Ask Karl anything&hellip;" aria-label="Ask Karl">' +
      '<button class="pf-ka-btn" type="submit">ASK</button></form>';
    document.body.appendChild(ov);
    document.body.appendChild(sh);
    els = {
      ov: ov, sh: sh,
      ctx: sh.querySelector('[data-ka-ctx]'),
      chips: sh.querySelector('[data-ka-chips]'),
      log: sh.querySelector('[data-ka-log]'),
      form: sh.querySelector('[data-ka-form]'),
      input: sh.querySelector('[data-ka-q]')
    };
    ov.addEventListener('click', close);
    sh.querySelector('[data-ka-close]').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = els.input.value.trim();
      if (q) ask(q);
    });
    els.log.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-ka-name],[data-ka-act],[data-ka-copy]') : null;
      if (!b) return;
      if (b.hasAttribute('data-ka-name')) {
        ask('Who funds ' + b.getAttribute('data-ka-name') + '?');
      } else if (b.hasAttribute('data-ka-act')) {
        creatorAction(b.getAttribute('data-ka-act'));
      } else if (b.hasAttribute('data-ka-copy')) {
        copyText(b.getAttribute('data-ka-copy-text') || '', b);
      }
    });
    els.chips.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-ka-chip]') : null;
      if (!b) return;
      if (b.getAttribute('data-ka-q')) ask(b.getAttribute('data-ka-q'));
      else if (b.getAttribute('data-ka-act')) creatorAction(b.getAttribute('data-ka-act'));
    });
  }

  function copyText(t, btn) {
    function done() { if (btn) { var o = btn.textContent; btn.textContent = 'COPIED ✓'; setTimeout(function () { btn.textContent = o; }, 1600); } }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(fallback);
    else fallback();
  }

  function renderChips() {
    els.chips.innerHTML = (state.chips || []).map(function (c) {
      if (c.act) return '<button type="button" class="pf-ka-chip" data-ka-chip data-ka-act="' + esc(c.act) + '">' + esc(c.label) + '</button>';
      return '<button type="button" class="pf-ka-chip" data-ka-chip data-ka-q="' + esc(c.q) + '">' + esc(c.label) + '</button>';
    }).join('');
  }

  function scrollLog() { try { els.log.scrollTop = els.log.scrollHeight; } catch (e) {} }

  function ask(q) {
    q = String(q || '').trim();
    if (!q) return;
    els.input.value = '';
    var turn = document.createElement('div');
    turn.innerHTML = '<div class="pf-ka-q">' + esc(q) + '</div><div class="pf-ka-loading">Querying the rails&hellip;</div>';
    els.log.appendChild(turn);
    scrollLog();
    var btn = els.form.querySelector('.pf-ka-btn');
    btn.disabled = true;
    api({ q: q, context: JSON.stringify(state.ctx || {}) }, function (r) {
      btn.disabled = false;
      var load = turn.querySelector('.pf-ka-loading');
      if (load) load.remove();
      var div = document.createElement('div');
      if (!r || (r.ok === false && !r.template)) {
        div.innerHTML = '<div class="pf-ka-err">The rails didn\'t answer. Check your connection and try again.</div>';
      } else {
        div.innerHTML = answerHtml(q, r);
      }
      turn.appendChild(div);
      scrollLog();
    });
  }

  /* ---------------- creator mode ---------------- */
  function loadHub(cb) {
    if (hub || hubLoading) { if (cb) cb(hub); return; }
    hubLoading = true;
    apiJson('creator_hub', { slug: state.slug }, function (j) {
      hubLoading = false;
      hub = j && j.ok ? j : null;
      if (hub && hub.name) {
        state.ctx.name = hub.name;
        els.ctx.textContent = 'Working for ' + hub.name + ' — your stats and today\'s press pack ride along.';
      }
      if (cb) cb(hub);
    });
  }
  function topPackItems() {
    var items = [];
    if (hub && hub.press_pack && hub.press_pack.pack && hub.press_pack.pack.rails) {
      hub.press_pack.pack.rails.forEach(function (r) {
        (r.items || []).forEach(function (it) { items.push({ rail: r.label || r.id, item: it }); });
      });
    }
    return items;
  }
  function packAnswer() {
    var turn = document.createElement('div');
    turn.innerHTML = '<div class="pf-ka-q">What should I post today?</div>';
    els.log.appendChild(turn);
    if (!hub) {
      var ld = document.createElement('div');
      ld.innerHTML = '<div class="pf-ka-loading">Pulling your hub&hellip;</div>';
      turn.appendChild(ld);
      loadHub(function () { ld.remove(); packAnswerInto(turn); });
      return;
    }
    packAnswerInto(turn);
  }
  function packAnswerInto(turn) {
    var div = document.createElement('div');
    var items = topPackItems();
    if (items.length) {
      var h = '<div class="pf-ka-adj" style="text-align:left;font-style:normal">From today\'s press pack — your strongest material:</div>';
      div.innerHTML = h + items.slice(0, 3).map(function (x) {
        var it = x.item;
        return '<div class="pf-ka-fact"><div class="lb">' + esc(x.rail || 'Press pack') + '</div>' +
          '<div class="vl" style="font-size:17px">' + esc(it.headline || '') + '</div>' +
          (it.figure != null && it.figure !== '' ? '<div class="nt" style="font-size:15px;color:#1a1a1a;font-weight:700">' + esc(it.figure) + '</div>' : '') +
          (it.take ? '<div class="nt">' + esc(it.take) + '</div>' : '') +
          (it.source_name ? '<div class="pf-ka-src">' + esc(it.source_name) + (it.as_of ? ' &middot; as of ' + esc(it.as_of) : '') + '</div>' : '') +
          '</div>';
      }).join('') +
      '<button type="button" class="pf-ka-copy" data-ka-act="draft">DRAFT A POST FROM THE TOP STORY</button>';
    } else {
      var st = hub && hub.press_pack ? hub.press_pack.state : null;
      div.innerHTML = '<div class="pf-ka-empty"><div class="big">No pack yet today.</div>' +
        (st === 'generated'
          ? 'Today\'s pack is built but carries no items on your rails yet — new material lands as the rails update.'
          : 'Today\'s free press pack hasn\'t been generated yet. It\'s one tap in your hub, right under this sheet — generate it, then ask me again and I\'ll work from it.') +
        '</div>';
    }
    turn.appendChild(div);
    scrollLog();
  }
  function draftAnswer() {
    var turn = document.createElement('div');
    turn.innerHTML = '<div class="pf-ka-q">Draft a post for me</div>';
    els.log.appendChild(turn);
    if (!hub) {
      var ld = document.createElement('div');
      ld.innerHTML = '<div class="pf-ka-loading">Pulling your hub&hellip;</div>';
      turn.appendChild(ld);
      loadHub(function () { ld.remove(); draftInto(turn); });
      return;
    }
    draftInto(turn);
  }
  function draftInto(turn) {
    var div = document.createElement('div');
    var items = topPackItems();
    if (!items.length) {
      div.innerHTML = '<div class="pf-ka-empty"><div class="big">Nothing to draft from yet.</div>Generate today\'s press pack in your hub first — then I\'ll turn its top story into a post.</div>';
      turn.appendChild(div); scrollLog(); return;
    }
    var it = items[0].item;
    var lines = [];
    if (it.headline) lines.push(it.headline);
    if (it.figure != null && it.figure !== '') lines.push(String(it.figure));
    if (it.take) lines.push(it.take);
    if (it.source_name) lines.push('Source: ' + it.source_name + (it.as_of ? ' (as of ' + it.as_of + ')' : ''));
    var draft = lines.join('\n');
    div.innerHTML = '<div class="pf-ka-draft"><div class="t">DRAFT — FROM TODAY\'S PRESS PACK</div>' +
      '<div class="body">' + esc(draft) + '</div>' +
      '<div class="src">Built from the pack item exactly as sourced. Edit freely — your voice, Karl\'s receipts.</div>' +
      '<button type="button" class="pf-ka-copy" data-ka-copy data-ka-copy-text="' + esc(draft) + '">COPY DRAFT</button></div>';
    turn.appendChild(div);
    scrollLog();
  }
  function creatorAction(act) {
    if (act === 'pack') packAnswer();
    else if (act === 'draft') draftAnswer();
  }

  /* ---------------- open / close ---------------- */
  function open(q) {
    build();
    if (!state) state = detectContext();
    var lbl = ctxLabel(state.ctx);
    els.ctx.textContent = state.mode === 'creator'
      ? 'Working for you — your hub rides along.'
      : (lbl ? 'You\'re looking at: ' + lbl : 'Karl answers from public records — never from memory.');
    renderChips();
    els.ov.style.display = 'block';
    els.sh.style.display = 'flex';
    /* force reflow so the transition runs */
    void els.sh.offsetWidth;
    els.ov.classList.add('pf-ka-on');
    els.sh.classList.add('pf-ka-on');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    if (state.mode === 'creator') loadHub();
    if (q) ask(q);
    else if (window.innerWidth >= 760) { try { els.input.focus({ preventScroll: true }); } catch (e) {} }
  }
  function close() {
    if (!built) return;
    els.ov.classList.remove('pf-ka-on');
    els.sh.classList.remove('pf-ka-on');
    try { document.body.style.overflow = ''; } catch (e) {}
    setTimeout(function () {
      els.ov.style.display = 'none';
      els.sh.style.display = 'none';
    }, 190);
  }

  window.PFKarlAmbient = {
    _full: true,
    open: open,
    ask: function (q) { open(q); },
    close: close,
    setContext: function (ctx) {
      state = state || detectContext();
      for (var k in ctx) state.ctx[k] = ctx[k];
      if (els.ctx) {
        var lbl = ctxLabel(state.ctx);
        if (lbl) els.ctx.textContent = 'You\'re looking at: ' + lbl;
      }
    }
  };
})();
