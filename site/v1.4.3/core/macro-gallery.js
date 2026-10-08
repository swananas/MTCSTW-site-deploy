/* core/macro-gallery.js  |  PF v1.4.3 | P-14 MACRO GALLERY / REMIX WALL
   (Wave A6 / propaganda PW1). The social-proof engine: everything made with
   official FRED data, in one public wall.
   - "Made with FRED data" badge on every piece; sortable by series;
     remix chains visible (REMIX OF #id); "YOUR TURN" CTA on every piece.
   - P-16 HQ model pieces render inline (hq_model:true): "HQ MODEL — here
     is what good looks like" + "REMIX THE MODEL" CTA into the one-tap
     share flow, so day one is never empty.
   - Featured pieces carry the HQ imprimatur ("HQ FEATURED" badge) — the
     flag is server-set only (gallery_feature, admin-gated); this module
     never trusts a client-set flag, it only renders what the rail sends.
   - DISPLAY ONLY. Zero XP anywhere in this module: no credit events, no
     postAction, no xpGrant. (The remix CTA hands off to PFMacroShare —
     any XP from a subsequent share flows through that module's existing
     leg, never from the gallery.)
   - Every number traceable to a FRED vintage: stamps render
     FRED · <series> · VINTAGE <date> from the rail's stamp fields.
     Official/crowd separation: the wall shows official-data pieces and
     creator captions as two labeled lines — never one blended number.
   - Fail-soft: no key / no rows -> honest empty states, never mock pieces.
   KILL: ?pf_off=macro-gallery  or  localStorage pf_disabled_v1='["macro-gallery"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('macro-gallery')) { return; }
  if (window.pfMacroGalleryDone) return;
  window.pfMacroGalleryDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;
  var SERIES_ORDER = ['FEDFUNDS', 'UNRATE', 'DGS10', 'MORTGAGE30US',
    'CPIAUCNS', 'CPILFESL', 'PAYEMS', 'PCEPI', 'GDP'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* SECURITY (2026-10-06 pre-ship hardening): scheme allowlist for URLs
     rendered into href/src. Only http(s) or relative URLs pass;
     javascript:, data:, vbscript: etc. are rejected. */
  function safeUrl(u){
    var s=String(u==null?'':u).trim();
    if(!s) return '';
    try{ var p=new URL(s,'https://x.invalid').protocol;
      if(p==='http:'||p==='https:') return s; }catch(e){}
    return '';
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfGalCb' + Math.floor(Math.random() * 1e9);
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
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  var CSS = [
    '.pf-mgal{max-width:960px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-mgal-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-mgal-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 6px;letter-spacing:1px}',
    '.pf-mgal-sub{font-size:13px;color:#c9bfa8;text-align:center;margin:0 0 12px}',
    '.pf-mgal-tools{display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:12px;flex-wrap:wrap}',
    '.pf-mgal-tools label{font-size:12px;letter-spacing:1px;color:#8a8271;font-weight:700}',
    '.pf-mgal-tools select{background:#141414;color:#f5ead6;border:1px solid #3a3a3a;border-radius:6px;padding:8px;font-size:14px}',
    '.pf-mgal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}',
    '@media (max-width:720px){.pf-mgal-grid{grid-template-columns:1fr}}',
    '.pf-mgal-card{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;overflow:hidden;display:flex;flex-direction:column}',
    '.pf-mgal-card.hq{border-top:6px solid #e8b923}',
    '.pf-mgal-card.feat{border-top:6px solid #c1121f}',
    '.pf-mgal-visual{min-height:180px;display:flex;align-items:center;justify-content:center;background:#111;padding:18px 14px;text-align:center}',
    '.pf-mgal-visual img{max-width:100%;height:auto;display:block}',
    '.pf-mgal-badges{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px 0}',
    '.pf-mgal-badge{font-size:10px;font-weight:900;letter-spacing:1px;padding:3px 8px;border-radius:3px}',
    '.pf-mgal-badge.data{background:#1d3a1d;color:#7fd67f}',
    '.pf-mgal-badge.hq{background:#3a2f10;color:#e8b923}',
    '.pf-mgal-badge.featb{background:#3a1010;color:#ff8a7a}',
    '.pf-mgal-badge.series{background:#2a2a2a;color:#c9bfa8}',
    '.pf-mgal-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px;flex:1}',
    '.pf-mgal-fig{font-weight:900;font-size:26px;color:#f5ead6}',
    '.pf-mgal-fig small{display:block;font-size:12px;color:#c9bfa8;font-weight:400;margin-top:4px}',
    '.pf-mgal-cap{font-size:13px;color:#c9bfa8;line-height:1.45}',
    '.pf-mgal-meta{font-size:11px;color:#8a8271;letter-spacing:.5px}',
    '.pf-mgal-chain{font-size:11px;color:#e8b923;letter-spacing:.5px}',
    '.pf-mgal-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:8px}',
    '.pf-mgal-cta{margin-top:auto;display:flex;gap:8px}',
    '.pf-mgal-btn{flex:1;background:#c1121f;color:#fff;border:0;border-radius:6px;padding:10px;font-weight:900;font-size:12px;letter-spacing:1px;cursor:pointer}',
    '.pf-mgal-btn.ghost{background:#2a2a2a;color:#f5ead6}',
    '.pf-mgal-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:26px 16px;text-align:center}',
    '.pf-mgal-empty h4{font-weight:900;font-size:17px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-mgal-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-mgal-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:10px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mgal-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mgal-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Vintage stamp: 'FRED · UNRATE · VINTAGE SEP 2026'. null-safe. */
  function stampOf(it) {
    var s = 'FRED · ' + (it.stamp_series || it.series_id || '');
    var v = it.stamp_vintage || (it.figure && it.figure.vintage_date) || '';
    if (v) {
      var m = /^(\d{4})-(\d{2})/.exec(String(v));
      if (m) {
        var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        s += ' · VINTAGE ' + MON[parseInt(m[2], 10) - 1] + ' ' + m[1];
      }
    }
    return s;
  }

  /* HQ model visual: distinct per-layout render from the figure payload.
     All numbers come from the rail — nothing invented here. */
  function modelVisual(it) {
    var f = it.figure || {};
    var val = esc(f.value_label || '—');
    var per = esc(f.period_label || f.period || '');
    var chg = esc(f.change_label || f.change_pct_label || '');
    var title = esc(f.title || it.series_id || '');
    var lay = it.layout || 'stat';
    var inner = '';
    if (lay === 'duel') {
      inner = '<div><div style="font-size:12px;letter-spacing:2px;color:#e8b923;font-weight:700;">THIS PRINT</div>' +
        '<div class="pf-mgal-fig">' + val + '</div>' +
        '<div style="font-size:12px;letter-spacing:2px;color:#8a8271;font-weight:700;margin-top:10px;">PRIOR</div>' +
        '<div style="font-weight:900;font-size:20px;color:#c9bfa8;">' + esc(f.prior_value != null ? String(f.prior_value) : '—') + '</div>' +
        (chg ? '<div style="font-weight:700;font-size:14px;color:#e8b923;margin-top:6px;">' + chg + '</div>' : '') +
        '<div class="pf-mgal-fig"><small>' + per + '</small></div></div>';
    } else if (lay === 'banner') {
      inner = '<div><div class="pf-mgal-fig" style="font-size:40px;">' + val + '</div>' +
        '<div style="font-size:15px;color:#c9bfa8;margin-top:8px;">' + title + ' · ' + per + '</div>' +
        (chg ? '<div style="font-weight:900;font-size:18px;color:#c1121f;margin-top:8px;">' + chg + '</div>' : '') + '</div>';
    } else if (lay === 'ticker') {
      inner = '<div style="width:100%;"><div style="display:flex;justify-content:space-between;align-items:baseline;">' +
        '<span style="font-weight:900;font-size:15px;letter-spacing:1px;color:#e8b923;">' + title + '</span>' +
        '<span style="font-weight:900;font-size:34px;color:#f5ead6;">' + val + '</span></div>' +
        '<div style="height:6px;background:#2a2a2a;border-radius:3px;margin:10px 0;">' +
        '<div style="height:6px;width:62%;background:#c1121f;border-radius:3px;"></div></div>' +
        '<div style="font-size:12px;color:#8a8271;">' + per + (chg ? ' · ' + chg : '') + '</div></div>';
    } else if (lay === 'quote') {
      inner = '<div><div style="font-size:44px;color:#c1121f;font-weight:900;line-height:1;">&ldquo;</div>' +
        '<div class="pf-mgal-fig">' + val + '</div>' +
        '<div style="font-size:14px;color:#c9bfa8;margin-top:8px;">' + title + ', ' + per + '</div></div>';
    } else { /* stat */
      inner = '<div><div style="font-size:12px;letter-spacing:3px;color:#e8b923;font-weight:700;">' + title + '</div>' +
        '<div class="pf-mgal-fig" style="font-size:44px;">' + val + '</div>' +
        (chg ? '<div style="font-weight:700;font-size:15px;color:#e8b923;margin-top:6px;">' + chg + '</div>' : '') +
        '<div class="pf-mgal-fig"><small>' + per + '</small></div></div>';
    }
    return '<div class="pf-mgal-visual">' + inner + '</div>';
  }

  function badges(it) {
    var b = '<span class="pf-mgal-badge data">MADE WITH FRED DATA</span>';
    if (it.hq_model) b += '<span class="pf-mgal-badge hq">HQ MODEL</span>';
    if (it.featured && !it.hq_model) b += '<span class="pf-mgal-badge featb">HQ FEATURED</span>';
    if (it.series_id) b += '<span class="pf-mgal-badge series">' + esc(it.series_id) + '</span>';
    return '<div class="pf-mgal-badges">' + b + '</div>';
  }

  function card(it) {
    var cls = 'pf-mgal-card' + (it.hq_model ? ' hq' : '') + ((it.featured && !it.hq_model) ? ' feat' : '');
    var visual, bodyMeta;
    /* Synergy-1 attribution: credit lines render through the shared
       PF.credit component (same voice everywhere; honest empty when the
       backend sent no attribution). Defensive — the component may be
       kill-switched or absent on a stale bundle. */
    function creditFor(src) {
      try { return (window.PF && window.PF.credit) ? window.PF.credit(src) : ''; }
      catch (e) { return ''; }
    }
    if (it.hq_model) {
      visual = modelVisual(it);
      bodyMeta = '<div class="pf-mgal-meta">HQ MODEL — here is what good looks like. ' +
        'The figure is the live official vintage; remix it and make it yours.</div>' +
        creditFor({ sourced_by: it.sourced_by || 'hq' });
    } else {
      var _mau=safeUrl(it.artifact_url); visual = _mau
        ? '<div class="pf-mgal-visual"><img src="' + esc(_mau) + '" alt="' +
          esc('Macro piece by ' + (it.callsign || 'a creator')) + '" loading="lazy" /></div>'
        : '<div class="pf-mgal-visual"><span style="color:#3a3a3a;font-size:40px;">—</span></div>';
      bodyMeta = creditFor({ sourced_by: it.sourced_by || it.callsign }) +
        (it.caption ? '<div class="pf-mgal-cap">' + esc(it.caption).slice(0, 280) + '</div>' : '');
    }
    var chain = it.remix_of
      ? '<div class="pf-mgal-chain">REMIX OF ' + esc(it.remix_of) + ' — the chain stays visible.</div>'
      : '';
    var cta;
    if (it.hq_model) {
      cta = '<div class="pf-mgal-cta"><button class="pf-mgal-btn" data-act="remix-model" data-sid="' +
        esc(it.series_id || '') + '">REMIX THE MODEL</button></div>';
    } else {
      cta = '<div class="pf-mgal-cta"><button class="pf-mgal-btn" data-act="your-turn" data-sid="' +
        esc(it.series_id || '') + '">YOUR TURN</button></div>';
    }
    return '<div class="' + cls + '" data-mgal-id="' + esc(it.id || '') + '">' +
      badges(it) + visual +
      '<div class="pf-mgal-body">' + bodyMeta + chain +
      '<div class="pf-mgal-stamp">' + esc(stampOf(it)) + '</div>' + cta + '</div></div>';
  }

  function shell(inner) {
    return '<div class="pf-mgal">' +
      '<div class="pf-mgal-kicker">SOCIAL PROOF</div>' +
      '<h3 class="pf-mgal-title">THE MACRO WALL</h3>' +
      '<p class="pf-mgal-sub">Everything made with official FRED data. See it. Remix it. Post it.</p>' +
      inner +
      '<div class="pf-mgal-foot">OFFICIAL FIGURES VIA FRED · CREATOR WORDS ARE THEIR OWN</div></div>';
  }

  function emptyBlock(head, body) {
    return '<div class="pf-mgal-empty"><h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }

  var state = { items: [], filter: 'ALL', live: false };

  function render(container) {
    cssOnce();
    if (!state.live) {
      container.innerHTML = shell(emptyBlock('WALL OFFLINE',
        'The gallery feed is not connected. Nothing here is estimated or seeded — pieces appear once the feed lands.'));
      return;
    }
    var items = state.items;
    var f = state.filter;
    var shown = f === 'ALL' ? items : items.filter(function (it) { return it.series_id === f; });
    var opts = ['<option value="ALL">ALL SERIES</option>'].concat(SERIES_ORDER.map(function (s) {
      return '<option value="' + s + '"' + (f === s ? ' selected' : '') + '>' + s + '</option>';
    })).join('');
    var grid = shown.length
      ? '<div class="pf-mgal-grid">' + shown.map(card).join('') + '</div>'
      : emptyBlock('THE WALL IS EMPTY', 'No pieces for this series yet. Be the first — grab a stat and post it.');
    container.innerHTML = shell(
      '<div class="pf-mgal-tools"><label for="pf-mgal-f">SERIES</label>' +
      '<select id="pf-mgal-f" data-mgal-filter>' + opts + '</select></div>' + grid);
    try {
      var sel = container.querySelector('[data-mgal-filter]');
      if (sel) sel.addEventListener('change', function () {
        state.filter = sel.value || 'ALL';
        render(container);
      });
      var btns = container.querySelectorAll('[data-act]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.addEventListener('click', function () {
            var sid = b.getAttribute('data-sid') || '';
            var act = b.getAttribute('data-act');
            try {
              if ((act === 'remix-model' || act === 'your-turn') &&
                  window.PFMacroShare && typeof window.PFMacroShare.shareSeries === 'function') {
                window.PFMacroShare.shareSeries(sid);
              }
            } catch (e) {}
          });
        })(btns[i]);
      }
    } catch (e) {}
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-mgal')) return true;
    } catch (e) {}
    api('fred_gallery', {}, function (j) {
      try {
        if (j && j.ok && Array.isArray(j.items)) {
          state.items = j.items;
          state.live = !!j.fred_live;
          render(container);
        } else {
          cssOnce();
          container.innerHTML = shell(emptyBlock('WALL OFFLINE',
            'The gallery feed is not connected. Nothing here is estimated or seeded — pieces appear once the feed lands.'));
        }
      } catch (e) {
        try {
          cssOnce();
          container.innerHTML = shell(emptyBlock('WALL OFFLINE', 'The gallery could not load.'));
        } catch (e2) {}
      }
    });
    return true;
  }

  try { window.PFMacroGallery = { mount: mount }; } catch (e) {}
})();
