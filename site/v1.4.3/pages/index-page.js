/* pages/index-page.js | PF v1.4.3 | THE CORRUPTION INDEX (/index).
   CEO directive 2026-10-07 "Let it blossom" — Product 4 of 5.
   Design direction: clean leaderboard, light. Scores and methodology
   immediately clear; input breakdowns expand on tap. No bloated pages.

   STICKY WEB (not a maze): every score links to its natural neighbors —
   the full Receipt dossier is ONE prominent tap away (primary neighbor),
   plus the entity's town (/town) and related extraction story
   (/extraction/<slug> for companies).

   Mounts into <div id="pf-index"></div> on the Squarespace /index page.
   JSONP reads of index_scores / index_entity / index_methodology
   (be/data-corruption-index, v172) — public, read-only, ZERO XP.
   Copy rules: scores describe capture ("highly captured"), never accuse;
   vote-money is "alignment" only. No entity scores below the data
   threshold — otherwise the honest "insufficient data" state.

   KILL: ?pf_off=corruption-index or localStorage pf_disabled_v1.
   Deep link: /index#<slug> expands that entity. */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfCorruptionIndexDone) return;
  if (PF && PF.skip('corruption-index')) return;
  var host = document.getElementById('pf-index');
  if (!host) { if (PF) PF.error('corruption-index', 'mount div #pf-index missing — skipping'); return; }
  if (isEditor()) return;
  window.pfCorruptionIndexDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function apiBase() {
    try { return window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev'; }
    catch (e) { return 'https://pf-api.mtcstw.workers.dev'; }
  }
  var cbN = 0;
  function jsonp(action, params, done) {
    var fn = 'pfIdxCb' + (++cbN) + '_' + Date.now();
    var q = '?action=' + encodeURIComponent(action) + '&callback=' + fn;
    for (var k in params) {
      if (params[k] != null) q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    var timer = null, finished = false;
    window[fn] = function (data) {
      if (finished) return; finished = true;
      clearTimeout(timer);
      try { delete window[fn]; } catch (e) { window[fn] = null; }
      done(data);
    };
    timer = setTimeout(function () {
      if (finished) return; finished = true;
      try { delete window[fn]; } catch (e) { window[fn] = null; }
      done(null);
    }, 12000);
    var s = document.createElement('script');
    s.async = true;
    s.onerror = function () { if (!finished) { finished = true; clearTimeout(timer); done(null); } };
    s.src = apiBase() + q;
    try { document.head.appendChild(s); } catch (e) { done(null); }
  }

  /* ---------- styles: light, airy, mobile-first ---------- */
  function injectCSS() {
    if (document.getElementById('pf-idx-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-idx-css';
    st.textContent =
      '#pf-index{font-family:Arial,Helvetica,sans-serif;color:#f5ead6;max-width:720px;margin:0 auto;padding:0 12px 40px;box-sizing:border-box}' +
      '.pf-idx-head{text-align:center;padding:26px 8px 6px}' +
      '.pf-idx-kicker{font-size:11px;letter-spacing:.32em;color:#c1121f;font-weight:800}' +
      '.pf-idx-head h1{font-family:"Arial Black",Arial,sans-serif;font-size:30px;margin:8px 0 6px;letter-spacing:.02em}' +
      '.pf-idx-sub{color:#a89e88;font-size:14px;line-height:1.5;max-width:520px;margin:0 auto}' +
      '.pf-idx-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0 4px}' +
      '.pf-idx-chip{font-size:11px;font-weight:700;letter-spacing:.06em;background:#161616;border:1px solid #333;border-radius:20px;padding:7px 13px;color:#c9bfa8}' +
      '.pf-idx-meth{margin:12px auto 0;max-width:640px;background:#111;border:1px solid #2a2a2a;border-radius:10px}' +
      '.pf-idx-meth>summary{cursor:pointer;padding:13px 16px;font-size:13px;font-weight:800;letter-spacing:.08em;color:#e8b923;list-style:none}' +
      '.pf-idx-meth>summary::-webkit-details-marker{display:none}' +
      '.pf-idx-meth .pf-idx-methbody{padding:0 16px 16px;font-size:13px;line-height:1.65;color:#c9bfa8}' +
      '.pf-idx-meth table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}' +
      '.pf-idx-meth td,.pf-idx-meth th{border-bottom:1px solid #2a2a2a;padding:7px 6px;text-align:left;vertical-align:top}' +
      '.pf-idx-meth th{color:#e8b923;font-size:11px;letter-spacing:.08em}' +
      '.pf-idx-tabs{display:flex;gap:8px;justify-content:center;margin:20px 0 6px}' +
      '.pf-idx-tab{flex:1;max-width:220px;text-align:center;padding:11px 0;font-size:13px;font-weight:900;letter-spacing:.12em;background:#161616;border:1px solid #333;border-radius:8px;color:#a89e88;cursor:pointer}' +
      '.pf-idx-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
      '.pf-idx-vint{text-align:center;font-size:11px;color:#a89e88;letter-spacing:.1em;margin:8px 0 4px}' +
      '.pf-idx-list{margin:0;padding:0;list-style:none}' +
      '.pf-idx-row{border-bottom:1px solid #222;padding:14px 6px;cursor:pointer}' +
      '.pf-idx-row:active{background:#141414}' +
      '.pf-idx-top{display:flex;align-items:center;gap:12px}' +
      '.pf-idx-rank{font-family:"Arial Black",Arial,sans-serif;font-size:15px;color:#a89e88;min-width:30px;text-align:center}' +
      '.pf-idx-who{flex:1;min-width:0}' +
      '.pf-idx-name{font-size:16px;font-weight:800;color:#f5ead6;line-height:1.25}' +
      '.pf-idx-meta{font-size:11px;color:#a89e88;letter-spacing:.06em;margin-top:3px}' +
      '.pf-idx-score{text-align:right}' +
      '.pf-idx-num{font-family:"Arial Black",Arial,sans-serif;font-size:30px;color:#e8b923;line-height:1}' +
      '.pf-idx-label{font-size:10px;font-weight:800;letter-spacing:.14em;color:#c1121f;margin-top:4px}' +
      '.pf-idx-bars{display:flex;gap:4px;margin-top:10px}' +
      '.pf-idx-bar{flex:1;height:5px;border-radius:3px;background:#2a2a2a;overflow:hidden}' +
      '.pf-idx-bar i{display:block;height:100%;background:#c1121f}' +
      '.pf-idx-bar.off i{background:transparent}' +
      '.pf-idx-detail{display:none;padding:14px 2px 6px}' +
      '.pf-idx-row.open .pf-idx-detail{display:block}' +
      '.pf-idx-in{border-top:1px dashed #333;padding:10px 0}' +
      '.pf-idx-in-t{display:flex;justify-content:space-between;gap:10px;font-size:13px;font-weight:800}' +
      '.pf-idx-in-t .w{color:#e8b923;font-weight:700;font-size:11px}' +
      '.pf-idx-in-v{font-size:13px;color:#f5ead6;margin-top:4px}' +
      '.pf-idx-in-e{font-size:12px;color:#a89e88;margin-top:4px;font-style:italic}' +
      '.pf-idx-in-s{font-size:10px;color:#8f887a;letter-spacing:.06em;margin-top:5px}' +
      '.pf-idx-in-s a{color:#8f887a}' +
      '.pf-idx-receipt{display:block;text-align:center;background:#c1121f;color:#fff;font-weight:900;letter-spacing:.1em;font-size:14px;padding:14px;border-radius:8px;margin:14px 0 8px;text-decoration:none}' +
      '.pf-idx-receipt:active{transform:scale(.98)}' +
      '.pf-idx-web{display:flex;gap:8px;margin:0 0 6px}' +
      '.pf-idx-web a{flex:1;text-align:center;font-size:12px;font-weight:700;letter-spacing:.06em;color:#c9bfa8;border:1px solid #333;border-radius:8px;padding:10px 4px;text-decoration:none;background:#141414}' +
      '.pf-idx-share{display:block;width:100%;background:none;border:1px solid #444;color:#e8b923;font-weight:800;letter-spacing:.1em;font-size:12px;padding:10px;border-radius:8px;margin:8px 0 2px;cursor:pointer}' +
      '.pf-idx-empty{text-align:center;padding:30px 16px;color:#a89e88}' +
      '.pf-idx-empty h3{color:#f5ead6;font-family:"Arial Black",Arial,sans-serif;font-size:18px;margin:0 0 10px}' +
      '.pf-idx-empty p{font-size:13px;line-height:1.6;max-width:480px;margin:0 auto 14px}' +
      '.pf-idx-rails{display:inline-block;text-align:left;font-size:12px;line-height:2;background:#111;border:1px solid #2a2a2a;border-radius:10px;padding:12px 18px;margin:0 auto}' +
      '.pf-idx-load{text-align:center;color:#a89e88;padding:40px 0;font-size:14px}' +
      '.pf-idx-err{text-align:center;color:#f5ead6;background:#1a0505;border:2px solid #c1121f;border-radius:10px;padding:18px;margin:20px 0;font-size:14px}';
    try { document.head.appendChild(st); } catch (e) {}
  }
  injectCSS();

  var state = { tab: 'politicians', scores: null, meth: null, detailCache: {} };

  function vintageLine(w) {
    if (!w) return '';
    var m = String(w).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return esc(w);
    var MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return 'WEEK OF ' + MON[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function methodologyHTML() {
    var m = state.meth;
    if (!m) return '<div class="pf-idx-methbody">Methodology loading…</div>';
    function wrows(list) {
      return list.map(function (r) {
        return '<tr><td><b>' + esc(r.title) + '</b><br><span style="color:#8f887a">' + esc(r.desc || '') + '</span></td>' +
          '<td>' + Math.round(r.weight * 100) + '%</td><td>' + esc(r.source || '') + '</td></tr>';
      }).join('');
    }
    return '<div class="pf-idx-methbody">' +
      '<p>' + esc(m.subtitle || '') + ' ' + esc(m.what || '') + '</p>' +
      '<table><tr><th>Politician input</th><th>Weight</th><th>Source</th></tr>' + wrows(m.weights.politician) + '</table>' +
      '<table><tr><th>Company input</th><th>Weight</th><th>Source</th></tr>' + wrows(m.weights.company) + '</table>' +
      '<p><b>Data threshold:</b> politicians — ' + esc(m.threshold.politicians) + '; companies — ' + esc(m.threshold.companies) +
      '. Below the threshold: <i>insufficient data</i>, never a score.</p>' +
      '<p><b>Display band:</b> ' + esc(m.band) + '</p>' +
      '<p><b>Vintage:</b> ' + esc(m.vintage_policy) + '</p>' +
      '<p><b>Copy rules:</b> ' + m.copy_rules.map(esc).join(' ') + '</p></div>';
  }

  function metaLine(r) {
    if (state.tab === 'companies') return esc(r.industry || 'COMPANY');
    var bits = [];
    if (r.office) bits.push(r.office.toUpperCase());
    if (r.state) bits.push(r.state);
    if (r.party) bits.push(r.party);
    return esc(bits.join(' · '));
  }

  function rowHTML(r) {
    var bars = '';
    /* input mini-bars: live count filled; exact norms arrive on expand */
    for (var i = 0; i < r.inputs_total; i++) {
      bars += '<div class="pf-idx-bar' + (i < r.inputs_live ? '' : ' off') + '"><i style="width:' +
        (i < r.inputs_live ? '100' : '0') + '%"></i></div>';
    }
    /* Flow 4 (cross-data): every score deep-links — politicians to their
       Receipt dossier, companies to their extraction profile (Receipts
       don't apply to companies). */
    var deep = '';
    if (r.kind === 'company' && r.extraction_url) {
      deep = '<div class="pf-idx-meta"><a href="' + esc(r.extraction_url) +
        '" style="color:#e8b923;font-weight:700;text-decoration:none">EXTRACTION FILE →</a></div>';
    } else if (r.receipt_url) {
      deep = '<div class="pf-idx-meta"><a href="' + esc(r.receipt_url) +
        '" style="color:#e8b923;font-weight:700;text-decoration:none">GET THE RECEIPT →</a></div>';
    } else if (r.kind !== 'company' && r.slug) {
      deep = '<div class="pf-idx-meta"><a href="/receipt/' + esc(r.slug) +
        '" style="color:#e8b923;font-weight:700;text-decoration:none">GET THE RECEIPT →</a></div>';
    }
    return '<li class="pf-idx-row" data-slug="' + esc(r.slug) + '" data-key="' + esc(r.entity_key) + '">' +
      '<div class="pf-idx-top">' +
      '<div class="pf-idx-rank">#' + r.rank + '</div>' +
      '<div class="pf-idx-who"><div class="pf-idx-name">' + esc(r.name) + '</div>' +
      '<div class="pf-idx-meta">' + metaLine(r) + '</div>' + deep + '</div>' +
      '<div class="pf-idx-score"><div class="pf-idx-num">' + esc(String(r.score)) + '</div>' +
      '<div class="pf-idx-label">' + esc(r.label) + '</div></div></div>' +
      '<div class="pf-idx-bars">' + bars + '</div>' +
      '<div class="pf-idx-detail" id="pf-idx-d-' + esc(r.slug) + '"><div class="pf-idx-load">Loading breakdown…</div></div>' +
      '</li>';
  }

  function inputRowHTML(inp) {
    var v = inp.live && inp.raw_display
      ? '<div class="pf-idx-in-v">' + esc(inp.raw_display) + '</div>'
      : '<div class="pf-idx-in-e">' + esc(inp.status_note || 'not yet tracked') + '</div>';
    var src = inp.source ? '<div class="pf-idx-in-s">SOURCE: ' + esc(inp.source) +
      (inp.cycle ? ' · ' + esc(inp.cycle) : '') +
      (inp.source_url ? ' · <a href="' + esc(inp.source_url) + '" target="_blank" rel="noopener">verify</a>' : '') + '</div>' : '';
    return '<div class="pf-idx-in"><div class="pf-idx-in-t"><span>' + esc(inp.title) + '</span>' +
      '<span class="w">WEIGHT ' + Math.round((inp.weight || 0) * 100) + '%</span></div>' + v + src + '</div>';
  }

  function detailHTML(det) {
    var ins = (det.inputs || []).map(inputRowHTML).join('');
    var shareBtn = det.scored
      ? '<button class="pf-idx-share" data-share="' + esc(det.entity.slug) + '">SHARE THIS SCORE</button>' : '';
    var mssBtn = det.scored
      ? '<button class="pf-mss-btn" data-mss-index="' + esc(det.entity.slug) + '" style="width:100%;margin:8px 0 2px">MAKE SHAREABLE</button>' : '';
    var web = '';
    if (det.neighbors) {
      var links = '';
      if (det.neighbors.town_url) links += '<a href="/town">THEIR TOWN →</a>';
      if (links) web = '<div class="pf-idx-web">' + links + '</div>';
    }
    /* Flow 4 (cross-data): the primary deep-link is kind-aware. Politicians
       -> GET THE FULL RECEIPT (verified: neighbors.receipt_url is
       /receipt/<slug> and the receipt page deep-links it). Companies ->
       GET THE EXTRACTION FILE (Receipts don't apply to companies). */
    var isCo = det.entity && det.entity.kind === 'company';
    var primary = isCo
      ? '<a class="pf-idx-receipt" href="' + esc(det.neighbors && det.neighbors.extraction_url ? det.neighbors.extraction_url : ('/extraction/' + det.entity.slug)) + '">GET THE EXTRACTION FILE →</a>'
      : '<a class="pf-idx-receipt" href="' + esc(det.neighbors && det.neighbors.receipt_url ? det.neighbors.receipt_url : ('/receipt/' + det.entity.slug)) + '">GET THE FULL RECEIPT →</a>';
    var head = det.scored
      ? ''
      : '<div class="pf-idx-in-e" style="margin-bottom:10px">INSUFFICIENT DATA — needs ' + esc(det.threshold || '') + '.</div>';
    return head + ins + primary + web + shareBtn + mssBtn;
  }

  function render() {
    var sc = state.scores;
    var list = state.tab === 'companies' ? (sc ? sc.companies : []) : (sc ? sc.politicians : []);
    var tabBtns = '<div class="pf-idx-tabs">' +
      '<div class="pf-idx-tab' + (state.tab === 'politicians' ? ' on' : '') + '" data-tab="politicians">POLITICIANS</div>' +
      '<div class="pf-idx-tab' + (state.tab === 'companies' ? ' on' : '') + '" data-tab="companies">COMPANIES</div></div>';
    var html = '<div class="pf-idx-head"><div class="pf-idx-kicker">DATA PRODUCT · WEEKLY</div>' +
      '<h1>THE CORRUPTION INDEX</h1>' +
      '<div class="pf-idx-sub">How captured is this entity by moneyed interests. Descriptive scores from public records — never accusations.</div></div>' +
      '<div class="pf-idx-chips">' +
      '<span class="pf-idx-chip">SCORE BAND 7.6–9.8</span>' +
      '<span class="pf-idx-chip">3 OF 4 INPUTS MINIMUM</span>' +
      '<span class="pf-idx-chip">' + (sc && sc.vintage_week ? vintageLine(sc.vintage_week) : 'WEEKLY VINTAGE') + '</span>' +
      '</div>' +
      '<details class="pf-idx-meth"><summary>METHODOLOGY — WEIGHTS, PEERS, RULES +</summary>' +
      methodologyHTML() + '</details>' + tabBtns;
    if (!sc) {
      html += '<div class="pf-idx-load">Loading the index…</div>';
    } else if (!list.length) {
      html += emptyHTML(sc);
    } else {
      html += '<div class="pf-idx-vint">' + vintageLine(sc.vintage_week) + ' · METHODOLOGY ' + esc(sc.methodology_version || 'v1') + '</div>' +
        '<ul class="pf-idx-list">' + list.map(rowHTML).join('') + '</ul>';
    }
    host.innerHTML = html;
    wire();
    deepLink();
  }

  function emptyHTML(sc) {
    var rails = sc.rail_status || {};
    var names = { fec: 'FEC fundraising', lda: 'LDA lobbying', stock_act: 'STOCK Act trades', congress: 'Congress.gov votes', usaspending: 'USAspending contracts', osha: 'OSHA violations', dol: 'DOL wage theft' };
    var items = Object.keys(names).map(function (k) {
      var live = rails[k];
      return '<div>' + (live ? '🟢' : '⚪') + ' ' + esc(names[k]) + (live ? ' — live' : ' — not yet tracked') + '</div>';
    }).join('');
    return '<div class="pf-idx-empty"><h3>NO SCORES YET</h3>' +
      '<p>No entity clears the data threshold yet — politicians need 3 of 4 inputs live, companies need 3 of 3. ' +
      'No scores are shown below the threshold, ever. The index activates as the data rails land:</p>' +
      '<div class="pf-idx-rails">' + items + '</div>' +
      '<p style="margin-top:14px">The methodology above is final. The leaderboard fills in rail by rail.</p></div>';
  }

  function wire() {
    var tabs = host.querySelectorAll('.pf-idx-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].onclick = function () {
        state.tab = this.getAttribute('data-tab');
        render();
      };
    }
    var rows = host.querySelectorAll('.pf-idx-row');
    for (var j = 0; j < rows.length; j++) {
      rows[j].onclick = function (ev) {
        if (ev.target && (ev.target.tagName === 'A' || ev.target.tagName === 'BUTTON')) return;
        toggleRow(this);
      };
    }
    var shares = host.querySelectorAll('[data-share]');
    for (var k = 0; k < shares.length; k++) {
      shares[k].onclick = function (ev) {
        ev.stopPropagation();
        shareScore(this.getAttribute('data-share'));
      };
    }
  }

  function toggleRow(row) {
    var wasOpen = row.classList.contains('open');
    var all = host.querySelectorAll('.pf-idx-row.open');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('open');
    if (wasOpen) { history.replaceState(null, '', location.pathname); return; }
    row.classList.add('open');
    var key = row.getAttribute('data-key');
    var slug = row.getAttribute('data-slug');
    history.replaceState(null, '', '#' + slug);
    loadDetail(row, key, slug);
  }

  function loadDetail(row, key, slug) {
    var box = row.querySelector('.pf-idx-detail');
    if (!box) return;
    if (state.detailCache[key]) {
      box.innerHTML = detailHTML(state.detailCache[key]);
      wireShares(box);
      return;
    }
    box.innerHTML = '<div class="pf-idx-load">Loading breakdown…</div>';
    jsonp('index_entity', { entity_key: key }, function (det) {
      if (!det || !det.ok) {
        box.innerHTML = '<div class="pf-idx-err">Could not load the breakdown. Try again.</div>';
        return;
      }
      state.detailCache[key] = det;
      box.innerHTML = detailHTML(det);
      wireShares(box);
    });
  }

  function wireShares(root) {
    var btns = root.querySelectorAll('[data-share]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function (ev) {
        ev.stopPropagation();
        shareScore(this.getAttribute('data-share'));
      };
    }
    var mss = root.querySelectorAll('[data-mss-index]');
    for (var j = 0; j < mss.length; j++) {
      mss[j].onclick = function (ev) {
        ev.stopPropagation();
        openIndexShareable(this.getAttribute('data-mss-index'));
      };
    }
  }

  function findRow(slug) {
    var sc = state.scores;
    if (!sc) return null;
    var all = sc.politicians.concat(sc.companies);
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i];
    return null;
  }

  function scoreCardData(slug) {
    var r = findRow(slug);
    if (!r) return null;
    var det = null;
    for (var k in state.detailCache) {
      if (state.detailCache[k].entity && state.detailCache[k].entity.slug === slug) det = state.detailCache[k];
    }
    var topInputs = det ? det.inputs.filter(function (x) { return x.live && x.raw_display; }).slice(0, 3)
      .map(function (x) { return { title: x.title, display: x.raw_display }; }) : [];
    var sub = state.tab === 'companies' || r.industry ? (r.industry || 'COMPANY')
      : [r.office, r.state, r.party].filter(Boolean).join(' · ');
    return { name: r.name, sub: sub, score: r.score, label: r.label,
      topInputs: topInputs, vintage: vintageLine(state.scores.vintage_week),
      methodology: state.scores.methodology_version || 'v1' };
  }

  function shareScore(slug) {
    var data = scoreCardData(slug);
    if (!data) return;
    try {
      if (PF && PF.PHQShare && PF.PHQShare.share('phq-index-score', data, { link: '/index#' + slug })) return;
    } catch (e) {}
    try {
      if (PF) PF.toast('Poster failed — try again.');
    } catch (e2) {}
  }

  /* MAKE SHAREABLE (fe/make-shareable-inline, 2026-10-07): inline Studio
     creation panel on every score. The score's own 1080x1350 painter
     (phq-index-score, lazy PHQ module) renders the preview — the resolver
     polls until the module lands, so first-tap never wedges. One tap
     publishes to the UGC feed + opens the native share sheet. No page
     navigation. Zero XP for viewing. */
  function openIndexShareable(slug) {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M) return;
    var r = findRow(slug);
    M.openPanel({
      kind: 'index', ref: slug,
      title: 'CORRUPTION INDEX: ' + (r && r.name ? r.name : slug),
      deep: '/index#' + slug, game: 'index'
    });
  }
  function wireMakeShareableIndex() {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M || M._pfIndexWired) return;
    M._pfIndexWired = true;
    M.registerResolver('index', function (unit, done) {
      var d = null;
      try { d = scoreCardData(unit.ref); } catch (e) {}
      if (!d) { try { done(null); } catch (e2) {} return; }
      var PH = null;
      try { PH = PF && PF.PHQShare; } catch (e) {}
      if (!PH || typeof PH.paint !== 'function') { try { done(null); } catch (e2) {} return; }
      try { if (typeof PH._ensure === 'function') PH._ensure(); } catch (e) {}
      var tries = 0;
      (function poll() {
        var cv = null;
        try { cv = PH.paint('phq-index-score', d); } catch (e) {}
        if (cv) { try { done(cv); } catch (e2) {} return; }
        if (++tries > 80) { try { done(null); } catch (e2) {} return; }
        setTimeout(poll, 100);
      })();
    });
  }

  function deepLink() {
    try {
      var h = String(location.hash || '').replace('#', '');
      if (!h) return;
      var row = host.querySelector('.pf-idx-row[data-slug="' + h.replace(/"/g, '') + '"]');
      if (row) {
        row.classList.add('open');
        loadDetail(row, row.getAttribute('data-key'), h);
        setTimeout(function () {
          try { row.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }, 300);
      }
    } catch (e) {}
  }

  function fail(msg) {
    host.innerHTML = '<div class="pf-idx-head"><div class="pf-idx-kicker">DATA PRODUCT</div>' +
      '<h1>THE CORRUPTION INDEX</h1></div>' +
      '<div class="pf-idx-err">' + esc(msg || 'The index is unreachable right now. Try again in a bit.') + '</div>';
  }

  /* boot: scores + methodology in parallel */
  wireMakeShareableIndex();
  jsonp('index_scores', {}, function (sc) {
    if (!sc || !sc.ok) { fail(); return; }
    state.scores = sc;
    jsonp('index_methodology', {}, function (m) {
      if (m && m.ok) state.meth = m;
      render();
    });
  });
})();
