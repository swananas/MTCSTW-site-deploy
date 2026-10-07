/* core/town-page.js  |  PF v1.4.3 | WHO OWNS YOUR TOWN — Data Product 2.
   Self-mounting silo: renders into <div id="pf-town"></div> (Squarespace
   hand-step: the /town page + the #pf-town Code block + nav entry).
   Design (CEO 2026-10-07): clean card grid, light — no bloated layouts;
   cards lazy-load per rail; the page feels instant. Sticky web: every town
   report links to its natural neighbors — /receipt (local politicians),
   /extraction (companies operating here), /index (ranked entities). The UGC
   town-report-builder links back here via /town?zip=<zip>.
   Copy rules: "your area," never a pinpoint. Corporate entities and
   aggregates only. Heuristic matches labeled "likely corporate owner
   (estimated)." Every number source-stamped. Honest-empty for rails not
   yet live. Zero XP for viewing — no pfReportAction anywhere.
   KILL: ?pf_off=town (master). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('town')) { return; }
  if (window.pfTownPageDone) return;
  var host = document.getElementById('pf-town');
  if (!host) return;
  if (isEditor()) return;
  window.pfTownPageDone = true;

  var API = 'https://pf-api.mtcstw.workers.dev';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (s.charAt(0) === '/') return s;
    try { var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s; } catch (e) {}
    return '';
  }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }
  function err(m) { try { if (PF && PF.error) PF.error('town-page', m); } catch (e) {} }

  var CSS = [
    '.pf-tn{max-width:1020px;margin:0 auto;padding:10px 0 28px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-tn-kicker{font-weight:700;font-size:12px;letter-spacing:6px;color:#e8b923;text-align:center;margin-bottom:6px}',
    '.pf-tn-title{font-weight:900;font-size:30px;text-align:center;margin:0 0 6px;letter-spacing:2px}',
    '.pf-tn-sub{font-size:14px;color:#c9bfa8;text-align:center;margin:0 0 18px;font-style:italic}',
    '.pf-tn-hero{max-width:560px;margin:0 auto 22px;text-align:center}',
    '.pf-tn-ziprow{display:flex;gap:8px;justify-content:center}',
    '.pf-tn-ziprow input{flex:1;max-width:220px;background:#0d0d0d;border:1px solid #3a3a3a;color:#f5ead6;border-radius:8px;padding:12px 14px;font-size:18px;text-align:center;letter-spacing:4px}',
    '.pf-tn-btn{background:#c1121f;color:#fff;border:0;border-radius:8px;padding:12px 22px;font-weight:900;letter-spacing:2px;cursor:pointer;font-size:14px}',
    '.pf-tn-priv{font-size:12px;color:#8a8272;margin-top:10px}',
    '.pf-tn-area{font-size:13px;color:#e8b923;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:1px}',
    '.pf-tn-grid{display:grid;grid-template-columns:1fr;gap:12px}',
    '@media(min-width:720px){.pf-tn-grid{grid-template-columns:1fr 1fr}}',
    '.pf-tn-card{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:16px;min-height:120px}',
    '.pf-tn-card.empty{border-style:dashed;opacity:.85}',
    '.pf-tn-clabel{font-size:11px;letter-spacing:3px;color:#8a8272;font-weight:700;margin-bottom:6px}',
    '.pf-tn-head{font-weight:900;font-size:26px;color:#f5ead6;margin:0 0 2px}',
    '.pf-tn-head span{font-size:14px;font-weight:400;color:#c9bfa8}',
    '.pf-tn-lines{font-size:13px;color:#c9bfa8;margin:6px 0 0;line-height:1.45}',
    '.pf-tn-src{font-size:11px;color:#8a8272;margin-top:10px;border-top:1px solid #222;padding-top:8px}',
    '.pf-tn-stale{display:inline-block;font-size:10px;font-weight:900;letter-spacing:1px;border-radius:4px;padding:2px 7px;margin-left:8px;vertical-align:middle}',
    '.pf-tn-stale.fresh{background:#1d4d2b;color:#7cffa0}',
    '.pf-tn-stale.stale{background:#4d3a1d;color:#ffce7c}',
    '.pf-tn-stale.unknown{background:#333;color:#aaa}',
    '.pf-tn-links{margin-top:10px;display:flex;gap:10px;flex-wrap:wrap}',
    '.pf-tn-links a{font-size:12px;font-weight:700;color:#e8b923;text-decoration:none;letter-spacing:.5px}',
    '.pf-tn-links a:hover{text-decoration:underline}',
    '.pf-tn-rows{margin:8px 0 0;padding:0;list-style:none;font-size:13px;color:#c9bfa8}',
    '.pf-tn-rows li{padding:5px 0;border-bottom:1px solid #1e1e1e;display:flex;justify-content:space-between;gap:8px}',
    '.pf-tn-rows .est{font-size:10px;color:#8a8272;font-style:italic}',
    '.pf-tn-shimmer{background:linear-gradient(90deg,#141414 25%,#1e1e1e 50%,#141414 75%);background-size:200% 100%;animation:pfTnSh 1.2s infinite;border-radius:8px;height:14px;margin:8px 0}',
    '@keyframes pfTnSh{to{background-position:-200% 0}}',
    '.pf-tn-sticky{margin-top:20px;border:1px solid #2a2a2a;border-radius:10px;padding:18px;background:#0d0d0d}',
    '.pf-tn-sticky h4{margin:0 0 4px;font-size:15px;letter-spacing:2px;font-weight:900}',
    '.pf-tn-sticky p{font-size:13px;color:#c9bfa8;margin:0 0 12px}',
    '.pf-tn-sticky .pf-tn-links a{font-size:14px}',
    '.pf-tn-share{display:block;text-align:center;margin:22px auto 0;max-width:440px;background:#c1121f;color:#fff;font-weight:900;letter-spacing:2px;font-size:16px;padding:14px;border-radius:8px;border:0;cursor:pointer}',
    '.pf-tn-note{font-size:12px;color:#8a8272;text-align:center;margin-top:14px;font-style:italic}',
    '.pf-tn-err{max-width:560px;margin:0 auto;text-align:center;color:#ff8a8a;font-size:14px;padding:18px;border:1px solid #5a1a1a;border-radius:10px;background:#1a0505}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-tn-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-tn-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function api(action, params, cb) {
    var fn = 'pfTownCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = API + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 15000);
  }

  function qs(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search || '');
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  var ORDER = [
    ['landlords', 'CORPORATE OWNERS'],
    ['eviction', 'EVICTION RATE'],
    ['wages_rent', 'WAGES VS RENT'],
    ['pollution', 'POLLUTION'],
    ['federal', 'FEDERAL MONEY'],
    ['police', 'POLICE VIOLENCE'],
    ['hospitals', 'HOSPITAL PRICES']
  ];

  function staleBadge(st) {
    if (!st || !st.label) return '<span class="pf-tn-stale unknown">UNKNOWN</span>';
    var cls = st.label === 'FRESH' ? 'fresh' : (st.label === 'STALE' ? 'stale' : 'unknown');
    var days = (st.days != null && st.days >= 0) ? ' · ' + st.days + 'd' : '';
    return '<span class="pf-tn-stale ' + cls + '">' + esc(st.label) + days + '</span>';
  }

  function sourceStamp(src) {
    if (!src) return 'Source: not yet published';
    var bits = ['Source: ' + src.name];
    if (src.period) bits.push(src.period);
    if (src.retrieved && src.retrieved !== 'unknown') bits.push('retrieved ' + src.retrieved);
    return esc(bits.join(' · '));
  }

  function drillUrl(drill) {
    if (!drill || !drill.action) return '';
    var q = '?action=' + encodeURIComponent(drill.action);
    var p = drill.params || {};
    for (var k in p) q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    return API + q;
  }

  /* Sticky-web links per card: the natural neighbors. Sibling deep-link
     contract: /receipt?state=XX, /extraction?company=<name>, /index?entity=<name>. */
  function cardLinks(card) {
    var out = [];
    var L = card.links || {};
    if (L.receipt) out.push('<a href="' + esc(safeUrl(L.receipt)) + '">THE RECEIPT →</a>');
    if (L.extraction) out.push('<a href="' + esc(safeUrl(L.extraction)) + '">EXTRACTION ENGINE →</a>');
    if (L.index) out.push('<a href="' + esc(safeUrl(L.index)) + '">CORRUPTION INDEX →</a>');
    if (card.drill) {
      var u = drillUrl(card.drill);
      if (u) out.push('<a href="' + esc(u) + '" target="_blank" rel="noopener">SOURCE DATA →</a>');
    }
    return out.length ? '<div class="pf-tn-links">' + out.join('') + '</div>' : '';
  }

  function renderCard(card, label) {
    if (!card.live) {
      return '<div class="pf-tn-card empty">' +
        '<div class="pf-tn-clabel">' + esc(label) + '</div>' +
        '<div class="pf-tn-lines"><b style="color:#e8b923">NOT YET TRACKED</b><br>' +
        esc(card.note || 'Coming soon.') + '</div>' + cardLinks(card) + '</div>';
    }
    var rows = '';
    if (card.rows && card.rows.length) {
      rows = '<ul class="pf-tn-rows">' + card.rows.slice(0, 6).map(function (r) {
        if (r.name) {
          var nm = esc(r.name);
          if (r.extraction_url) nm = '<a href="' + esc(safeUrl(r.extraction_url)) + '" style="color:#e8b923;text-decoration:none">' + nm + '</a>';
          return '<li><span>' + nm + '<br><span class="est">' + esc(r.match || '') + '</span></span><span>' + esc(r.type || '') + '</span></li>';
        }
        if (r.chemical) return '<li><span>' + esc(r.chemical) + '</span><span>' + esc(r.lbs) + ' lbs</span></li>';
        if (r.hospital) return '<li><span>' + esc(r.hospital) + '</span><span>' + esc(r.city) + '</span></li>';
        return '';
      }).join('') + '</ul>';
    }
    return '<div class="pf-tn-card">' +
      '<div class="pf-tn-clabel">' + esc(label) + staleBadge(card.staleness) + '</div>' +
      '<div class="pf-tn-head">' + esc(card.headline) + ' <span>' + esc(card.headline_label || '') + '</span></div>' +
      '<div class="pf-tn-lines">' + (card.lines || []).map(function (l) { return esc(l); }).join('<br>') + '</div>' +
      rows +
      '<div class="pf-tn-src">' + sourceStamp(card.source) + '</div>' +
      cardLinks(card) + '</div>';
  }

  function skeletonCard(label) {
    return '<div class="pf-tn-card" data-skel="1">' +
      '<div class="pf-tn-clabel">' + esc(label) + '</div>' +
      '<div class="pf-tn-shimmer" style="width:60%"></div>' +
      '<div class="pf-tn-shimmer"></div><div class="pf-tn-shimmer" style="width:80%"></div>' +
      '</div>';
  }

  function renderSticky(sticky, area) {
    if (!sticky) return '';
    var comps = (sticky.companies || []).slice(0, 4).map(function (c) {
      return '<a href="' + esc(safeUrl(c.extraction_url)) + '">' + esc(c.name) +
        ' <span style="font-weight:400;font-size:12px">(' + esc(c.category) + ')</span></a>';
    }).join('');
    return '<div class="pf-tn-sticky">' +
      '<h4>FOLLOW THE THREAD</h4>' +
      '<p>Your area doesn\'t end at the county line. The power behind it doesn\'t either.</p>' +
      '<div class="pf-tn-links" style="margin-bottom:10px">' +
      (comps || '<span style="font-size:13px;color:#8a8272">No company stories pinned to this area yet.</span>') +
      '</div>' +
      '<div class="pf-tn-links">' +
      '<a href="' + esc(safeUrl(sticky.receipt || ('/receipt?state=' + (area ? area.state_code : '')))) + '">WHO FUNDS ' +
      esc(area ? area.state_name.toUpperCase() : 'YOUR STATE') + '\'S POLITICIANS →</a>' +
      '<a href="' + esc(safeUrl(sticky.extraction || '/extraction')) + '">EXTRACTION STORIES →</a>' +
      '<a href="' + esc(safeUrl(sticky.index || '/index')) + '">CORRUPTION INDEX →</a>' +
      '</div></div>';
  }

  /* ---------- share image: "THIS IS WHO OWNS [ZIP]" 1080x1350 ---------- */

  function drawShare(r) {
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, 14);
    x.fillRect(0, H - 14, W, 14);
    function line(t, y, size, color, weight, spacing) {
      x.font = (weight || 700) + ' ' + size + 'px Arial';
      x.fillStyle = color; x.textAlign = 'center';
      try { if (spacing) x.letterSpacing = spacing + 'px'; } catch (e) {}
      x.fillText(t, W / 2, y);
      try { x.letterSpacing = '0px'; } catch (e) {}
    }
    line('WHO OWNS YOUR TOWN', 110, 34, '#e8b923', 700, 8);
    var title = (r.share && r.share.title) || 'THIS IS WHO OWNS YOUR TOWN';
    x.font = '900 64px Arial'; x.fillStyle = '#f5ead6'; x.textAlign = 'center';
    wrap(x, title, W / 2, 190, 64, 900);
    if (r.area) line(r.area.coarse_area, 300, 30, '#c9bfa8', 400, 2);
    var findings = (r.share && r.share.lines) || [];
    var y = 420;
    x.textAlign = 'left';
    findings.slice(0, 4).forEach(function (f) {
      x.font = '900 54px Arial'; x.fillStyle = '#e8b923';
      x.fillText(f.headline || '', 90, y);
      x.font = '400 30px Arial'; x.fillStyle = '#c9bfa8';
      x.fillText((f.label || '').toUpperCase().slice(0, 60), 90, y + 46);
      y += 150;
    });
    if (!findings.length) {
      x.font = '400 32px Arial'; x.fillStyle = '#8a8272'; x.textAlign = 'center';
      x.fillText('Rails still landing for this area.', W / 2, 500);
    }
    x.strokeStyle = '#2a2a2a'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(90, H - 300); x.lineTo(W - 90, H - 300); x.stroke();
    line('JOIN THE FIGHT.', H - 210, 72, '#c1121f', 900, 4);
    line('MTCSTW.COM', H - 130, 44, '#f5ead6', 700, 10);
    line('Every figure sourced. mtcstw.com/town?zip=' + (r.zip || ''), H - 70, 24, '#8a8272', 400, 1);
    return cv;
  }

  function wrap(x, text, cx, y, size, weight) {
    var words = String(text).split(' '), lines = [], cur = '';
    x.font = weight + ' ' + size + 'px Arial';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (x.measureText(t).width > 900 && cur) { lines.push(cur); cur = w; }
      else cur = t;
    });
    if (cur) lines.push(cur);
    lines.forEach(function (l, i) { x.fillText(l, cx, y + i * (size + 12)); });
  }

  /* MAKE SHAREABLE (fe/make-shareable-inline, 2026-10-07): inline Studio
     creation panel on every town report — the report's own 1080x1350
     painter (drawShare) renders the preview, one tap publishes to the UGC
     feed + opens the native share sheet. No page navigation. */
  function openMakeShareable(r) {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M || !r) return;
    M.openPanel({
      kind: 'town', ref: r.zip || '',
      title: 'WHO OWNS ' + String(r.zip || 'YOUR TOWN').toUpperCase(),
      deep: '/town?zip=' + encodeURIComponent(r.zip || ''), game: 'town'
    });
  }
  function wireMakeShareable() {
    var M = null;
    try { M = window.PFMakeShareable; } catch (e) {}
    if (!M || M._pfTownWired) return;
    M._pfTownWired = true;
    M.registerResolver('town', function (unit, done) {
      var cv = null;
      try { if (lastReport) cv = drawShare(lastReport); } catch (e) {}
      try { done(cv); } catch (e2) {}
    });
  }

  function shareTown(r) {
    try {
      var cv = drawShare(r);
      cv.toBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], 'who-owns-' + (r.zip || 'town') + '.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'THIS IS WHO OWNS ' + (r.zip || '') })
            .catch(function () {});
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'who-owns-' + (r.zip || 'town') + '.png';
          document.body.appendChild(a); a.click();
          setTimeout(function () { try { a.remove(); } catch (e) {} }, 500);
        }
      }, 'image/png');
    } catch (e) { err('share failed: ' + e.message); }
  }

  /* ---------- page ---------- */

  var lastReport = null;

  function lookup(zip) {
    var grid = host.querySelector('[data-tn-grid]');
    grid.innerHTML = ORDER.map(function (o) { return skeletonCard(o[1]); }).join('');
    host.querySelector('[data-tn-area]').textContent = '';
    host.querySelector('[data-tn-sticky]').innerHTML = '';
    host.querySelector('[data-tn-sharewrap]').innerHTML = '';
    api('town_power', { zip: zip }, function (r) {
      if (!r || r.ok !== true) {
        grid.innerHTML = '<div class="pf-tn-err">Couldn\'t load this town. ' +
          '<button class="pf-tn-btn" style="margin-top:10px" onclick="location.reload()">Retry</button></div>';
        err('town_power failed for zip ' + zip);
        return;
      }
      lastReport = r;
      if (r.geo_live && r.area) {
        host.querySelector('[data-tn-area]').textContent = 'YOUR AREA: ' + r.area.coarse_area.toUpperCase();
      } else {
        host.querySelector('[data-tn-area]').textContent = esc(r.note || 'ZIP not recognized.');
      }
      /* Stagger fills for the per-rail lazy feel; DOM is instant. */
      var cards = ORDER.map(function (o) { return renderCard(r.cards[o[0]] || {}, o[1]); });
      cards.forEach(function (html, i) {
        setTimeout(function () {
          var sk = grid.querySelectorAll('[data-skel]');
          if (sk[i]) sk[i].outerHTML = html;
        }, i * 120);
      });
      setTimeout(function () {
        host.querySelector('[data-tn-sticky]').innerHTML = renderSticky(r.sticky, r.area);
        host.querySelector('[data-tn-sharewrap]').innerHTML =
          '<button class="pf-tn-share" data-tn-sharebtn>SHARE THIS TOWN</button>' +
          '<button class="pf-mss-btn" data-tn-mssbtn style="display:block;margin:10px auto 0;max-width:440px;width:100%">MAKE SHAREABLE</button>' +
          '<div class="pf-tn-note">Zero XP for viewing. Sharing spreads the intel.</div>';
        var btn = host.querySelector('[data-tn-sharebtn]');
        if (btn) btn.addEventListener('click', function () { shareTown(lastReport); });
        var mss = host.querySelector('[data-tn-mssbtn]');
        if (mss) mss.addEventListener('click', function () { openMakeShareable(lastReport); });
        try { history.replaceState(null, '', '/town?zip=' + encodeURIComponent(r.zip)); } catch (e) {}
      }, cards.length * 120 + 60);
    });
  }

  function mount() {
    cssOnce();
    host.innerHTML =
      '<div class="pf-tn">' +
      '<div class="pf-tn-hero">' +
      '<div class="pf-tn-ziprow">' +
      '<input data-tn-zip inputmode="numeric" maxlength="5" placeholder="70801" aria-label="5-digit ZIP code">' +
      '<button class="pf-tn-btn" data-tn-go>LOOK IT UP</button>' +
      '</div>' +
      '<div class="pf-tn-priv">Coarse only. Your zip never leaves the county bucket — we show &ldquo;your area,&rdquo; never a pinpoint. Corporate entities and aggregates only.</div>' +
      '</div>' +
      '<div class="pf-tn-area" data-tn-area></div>' +
      '<div class="pf-tn-grid" data-tn-grid></div>' +
      '<div data-tn-sticky></div>' +
      '<div data-tn-sharewrap></div>' +
      '</div>';
    var input = host.querySelector('[data-tn-zip]');
    var go = function () {
      var z = String(input.value || '').replace(/\D/g, '').slice(0, 5);
      if (!/^\d{5}$/.test(z)) {
        input.style.borderColor = '#c1121f';
        input.focus();
        return;
      }
      input.style.borderColor = '#3a3a3a';
      lookup(z);
    };
    host.querySelector('[data-tn-go]').addEventListener('click', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    var pre = qs('zip').replace(/\D/g, '').slice(0, 5);
    if (/^\d{5}$/.test(pre)) { input.value = pre; lookup(pre); }
  }

  mount();
  wireMakeShareable();
})();
