/* core/robreport.js  |  PF v1.4.3 | THE ROBBERY REPORT — Phase 1 (CEO flagship).
   "Here's what they took from you — from their own filings." Self-mounting
   figure cards + household baskets over the curated anchors in
   core/robreport-data.js (News Desk-verified 2026-10-06).
   READ-ONLY: no POST, no auth, ZERO XP. Self-mounts on div#pf-robreport
   (silent no-op when absent); money-page.js also calls PFRobReport.mount.
   CPI rail: card 10 lights up a live People's median via the existing
   price_board GET when min-n data exists, else the curated typical-retail
   price stands. Share: per-card/per-basket PFShare posters (no free text in
   pixels; 'JOIN THE FIGHT.' + MTCSTW.COM per the CTA standard).
   KILL: ?pf_off=robreport  or  localStorage pf_disabled_v1='["robreport"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('robreport')) { return; }
  var D = window.PFRobReportData;
  if (!D) { try { PF.error('robreport', 'data module missing'); } catch (e) {} return; }

  var CSS_DONE = false;
  function cssOnce() {
    if (CSS_DONE) return; CSS_DONE = true;
    var css =
      '.pf-rr{max-width:860px;margin:0 auto;color:#f5f0e6;font-family:Arial,Helvetica,sans-serif}' +
      '.pf-rr-head{text-align:center;margin:0 0 18px}' +
      '.pf-rr-head h3{font-size:30px;margin:6px 0;letter-spacing:1px}' +
      '.pf-rr-sub{color:#c9bfa8;font-size:15px;margin:0 0 6px}' +
      '.pf-rr-tag{color:#c9bfa8;font-size:13px;font-style:italic;margin:0 0 4px}' +
      '.pf-rr-fresh{color:#8f887a;font-size:12px;margin:0 0 14px}' +
      '.pf-rr-card{background:#141414;border:1px solid #333;border-left:5px solid #c1121f;border-radius:6px;padding:14px 16px;margin:0 0 12px}' +
      '.pf-rr-top{display:flex;align-items:center;gap:10px;margin-bottom:6px}' +
      '.pf-rr-num{color:#8f887a;font-size:12px;font-weight:700;min-width:26px}' +
      '.pf-rr-top h4{margin:0;font-size:18px;flex:1}' +
      '.pf-rr-chip{font-size:10px;font-weight:700;letter-spacing:1px;color:#f5f0e6;background:#2a2a2a;border:1px solid #c1121f;border-radius:10px;padding:3px 9px;white-space:nowrap}' +
      '.pf-rr-paid{font-size:14px;margin:0 0 8px}' +
      '.pf-rr-paid b{font-size:20px;color:#fff}' +
      '.pf-rr-tiny{color:#8f887a;font-size:11px}' +
      '.pf-rr-bar{display:flex;height:16px;border-radius:8px;overflow:hidden;background:#2a2a2a;margin:0 0 8px}' +
      '.pf-rr-seg{height:100%}' +
      '.pf-rr-cost{background:#5a5a5a}' +
      '.pf-rr-take{background:#c1121f}' +
      '.pf-rr-lay2{background:#8f2a33}' +
      '.pf-rr-take-line{font-size:15px;margin:0 0 6px}' +
      '.pf-rr-take-line b{color:#e8352e;font-size:19px}' +
      '.pf-rr-leg{font-size:12px;color:#c9bfa8;margin:0 0 4px}' +
      '.pf-rr-receipt{font-size:12px;color:#8f887a;margin:0 0 4px}' +
      '.pf-rr-receipt a{color:#e8a0a0;text-decoration:underline}' +
      '.pf-rr-cant{font-size:12px;color:#c9bfa8;margin:0 0 10px;border-top:1px solid #2a2a2a;padding-top:8px}' +
      '.pf-rr-cant b{color:#f5f0e6}' +
      '.pf-rr-share{background:#c1121f;color:#fff;border:none;border-radius:5px;font-weight:700;font-size:13px;letter-spacing:1px;padding:8px 18px;cursor:pointer}' +
      '.pf-rr-live{font-size:12px;color:#7CFC00;margin:0 0 8px}' +
      '.pf-rr-live a{color:#7CFC00;text-decoration:underline}' +
      '.pf-rr-note{font-size:12px;color:#8f887a;margin:0 0 4px}' +
      '.pf-rr-exc{background:#1a1a1a;border:1px dashed #555;border-radius:6px;padding:12px 16px;margin:0 0 18px;font-size:13px;color:#c9bfa8}' +
      '.pf-rr-exc b{color:#f5f0e6}' +
      '.pf-rr-basket{background:#101010;border:2px solid #c1121f;border-radius:8px;padding:16px;margin:0 0 14px}' +
      '.pf-rr-basket h4{margin:0 0 2px;font-size:20px}' +
      '.pf-rr-basket .pf-rr-sub{margin:0 0 8px}' +
      '.pf-rr-btot{font-size:15px;margin:0 0 8px}' +
      '.pf-rr-btot b{color:#e8352e;font-size:21px}' +
      '.pf-rr-basket details{margin:8px 0;font-size:13px;color:#c9bfa8}' +
      '.pf-rr-basket summary{cursor:pointer;color:#f5f0e6;font-weight:700}' +
      '.pf-rr-basket li{margin:3px 0}' +
      '.pf-rr-assump{font-size:11px;color:#8f887a;font-style:italic;margin:6px 0 0}';
    var st = document.createElement('style');
    st.setAttribute('data-pf', 'robreport');
    st.textContent = css;
    try { document.head.appendChild(st); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(x) { return '$' + Number(x).toFixed(2); }
  function err(m) { try { PF.error('robreport', m); } catch (e) {} }

  /* ---------------- CPI live-median chip (read-only GET, fail-soft) ---------------- */
  var BACKEND = window.PF_BACKEND_URL || '';
  function liveMedian(itemId, cb) {
    if (!BACKEND || typeof fetch !== 'function') { cb(null); return; }
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 12000);
      }
    } catch (e) {}
    var url = BACKEND + '?action=price_board&area_key=national&item_id=' + encodeURIComponent(itemId);
    var opts = { method: 'GET', headers: { 'Accept': 'application/json' } };
    if (ctl) opts.signal = ctl.signal;
    try {
      fetch(url, opts).then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.json();
      }).then(function (j) {
        if (timer) clearTimeout(timer);
        var it = null;
        try {
          var arr = (j && j.items) || [];
          for (var i = 0; i < arr.length; i++) {
            if (arr[i] && arr[i].item_id === itemId && arr[i].enough_data && arr[i].median_cents != null) { it = arr[i]; break; }
          }
        } catch (e) {}
        cb(it);
      }).catch(function () { if (timer) clearTimeout(timer); cb(null); });
    } catch (e) { if (timer) clearTimeout(timer); cb(null); }
  }

  /* ---------------- split bars (DOM only, no chart lib) ---------------- */
  function barHTML(segs, price) {
    var h = '<div class="pf-rr-bar" role="img">';
    for (var i = 0; i < segs.length; i++) {
      var w = price > 0 ? Math.max(0, Math.min(100, segs[i].amt / price * 100)) : 0;
      h += '<div class="pf-rr-seg ' + segs[i].cls + '" style="width:' + w.toFixed(1) + '%"></div>';
    }
    return h + '</div>';
  }
  function legendHTML(segs) {
    return '<p class="pf-rr-leg">' + segs.map(function (s) { return esc(s.label) + ' ' + money(s.amt); }).join(' · ') + '</p>';
  }

  /* ---------------- item card ---------------- */
  function cardHTML(it) {
    var h = '<article class="pf-rr-card" data-rr="' + esc(it.id) + '">';
    h += '<div class="pf-rr-top"><span class="pf-rr-num">#' + it.num + '</span><h4>' + esc(it.name) + '</h4>' +
         '<span class="pf-rr-chip">' + esc(it.cls) + '</span></div>';
    h += '<p class="pf-rr-paid">You paid <b>' + (it.price != null ? money(it.price) : '—') + '</b> ' +
         '<span class="pf-rr-tiny">' + esc(it.priceNote) + '</span></p>';
    h += '<div class="pf-rr-live" data-rr-live="' + esc(it.id) + '" style="display:none"></div>';

    if (it.cls === 'VALUE-CHAIN') {
      var segs = it.layers.map(function (l, i) {
        return { label: l.label, amt: l.amt, cls: i === 0 ? 'pf-rr-cost' : (i === 1 ? 'pf-rr-lay2' : 'pf-rr-take') };
      });
      h += barHTML(segs, it.price) + legendHTML(segs);
      var pct = Math.round(it.takeMid / it.price * 1000) / 10;
      h += '<p class="pf-rr-take-line">Total take ≈ <b>' + money(it.takeMid) + '</b> · ≈' + pct + '% of your ' +
           money(it.price) + ' · range ' + money(it.takeLo) + '–' + money(it.takeHi) +
           ' <span class="pf-rr-tiny">(' + esc(it.bandLabel) + ')</span></p>';
    } else if (it.id === 'gv-vs-folgers') {
      h += it.legs.map(function (l) {
        var w = Math.min(100, l.take / l.price * 100);
        return '<p class="pf-rr-paid" style="margin-bottom:2px">' + esc(l.name) + ' — you paid <b>' + money(l.price) + '</b></p>' +
               '<div class="pf-rr-bar"><div class="pf-rr-seg pf-rr-take" style="width:' + w.toFixed(1) + '%"></div></div>' +
               '<p class="pf-rr-leg">Their take ≈ ' + money(l.take) + ' · ' + esc(l.takePct) + '% ' + esc(l.bandLabel) + '</p>';
      }).join('');
      h += '<p class="pf-rr-take-line">Double-take under one roof: <b>' + money(it.segments[0].amt) + '</b> + <b>' +
           money(it.segments[1].amt) + '</b></p>';
    } else {
      var segs2 = it.segments.map(function (s, i) {
        return { label: s.label, amt: s.amt, cls: i === 0 ? 'pf-rr-cost' : (i === it.segments.length - 1 && it.segments.length > 2 ? 'pf-rr-cost' : 'pf-rr-take') };
      });
      /* Second segment is always their take; render it red explicitly. */
      if (segs2.length > 1) segs2[1].cls = 'pf-rr-take';
      h += barHTML(segs2, it.price) + legendHTML(segs2);
      h += '<p class="pf-rr-take-line">Their take ≈ <b>' + money(it.take) + '</b> · ' + esc(it.takePct) + '% ' +
           '<span class="pf-rr-tiny">(' + esc(it.bandLabel) + ')</span></p>';
    }

    (it.notes || []).forEach(function (n) { h += '<p class="pf-rr-note">' + esc(n) + '</p>'; });
    h += '<p class="pf-rr-receipt"><b style="color:#c9bfa8">The receipt:</b> ' +
         it.receipt.map(function (r) {
           return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.text.split('·')[0].trim()) + ' ↗</a>';
         }).join(' · ') + '</p>';
    h += '<p class="pf-rr-cant"><b>What this can\u2019t prove:</b> ' + esc(it.cantProve) + '</p>';
    h += '<p class="pf-rr-tiny" style="margin:0 0 10px"><i>' + esc(D.TAGLINE) + '</i></p>';
    h += '<button class="pf-rr-share" data-rr-share="item:' + esc(it.id) + '">SHARE IMAGE</button>';
    h += '</article>';
    return h;
  }

  /* ---------------- baskets ---------------- */
  function basketHTML(b) {
    var rows = b.items.map(function (bi) {
      var it = D.byId(bi.ref);
      if (!it) return '';
      var paid = it.price * bi.qty;
      var take = (it.cls === 'VALUE-CHAIN' ? it.takeMid : (it.id === 'gv-vs-folgers' ? it.legs[0].take : it.take)) * bi.qty;
      return '<li>' + esc(it.name) + ' × ' + bi.qty + ' (' + esc(bi.qtyLabel) + '): paid ' + money(paid) +
             ' · their take ≈ ' + money(take) + '</li>';
    }).join('');
    var h = '<div class="pf-rr-basket" data-rr-basket="' + esc(b.id) + '">';
    h += '<h4>' + esc(b.name) + '</h4><p class="pf-rr-sub">' + esc(b.sub) + '</p>';
    h += '<div class="pf-rr-bar"><div class="pf-rr-seg pf-rr-cost" style="width:' + (b.cost / b.paid * 100).toFixed(1) +
         '%"></div><div class="pf-rr-seg pf-rr-take" style="width:' + (b.take / b.paid * 100).toFixed(1) + '%"></div></div>';
    h += '<p class="pf-rr-btot">You paid <b style="color:#fff">' + money(b.paid) + '</b> · their take ≈ <b>' + money(b.take) +
         '</b> (' + esc(b.takePct) + '%)</p>';
    h += '<p class="pf-rr-tiny"><i>' + esc(D.TAGLINE) + '</i></p>';
    h += '<details><summary>Per-item breakdown</summary><ul>' + rows + '</ul></details>';
    h += '<p class="pf-rr-assump">' + esc(b.assumptions) + '</p>';
    h += '<button class="pf-rr-share" data-rr-share="basket:' + esc(b.id) + '">SHARE BASKET</button>';
    h += '</div>';
    return h;
  }

  /* ---------------- share posters (canvas, no free text in pixels) ---------------- */
  function basePoster(title, sub) {
    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, 1048, 1318);
    x.textAlign = 'center';
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', 540, 130);
    x.fillStyle = '#c1121f'; x.font = '900 76px "Arial Black",Arial,sans-serif';
    wrapText(x, 'THE ROBBERY REPORT', 910).forEach(function (l, i) { x.fillText(l, 540, 230 + i * 88); });
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    var y = 380;
    wrapText(x, title, 910).forEach(function (l) { x.fillText(l, 540, y); y += 54; });
    x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
    wrapText(x, sub, 910).forEach(function (l) { x.fillText(l, 540, y); y += 44; });
    return { cv: cv, x: x, y: y };
  }
  function wrapText(x, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else { line = t; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function footerPoster(p) {
    var x = p.x, cv = p.cv;
    x.textAlign = 'center';
    x.fillStyle = '#c9bfa8'; x.font = 'italic 400 30px Arial,sans-serif';
    x.fillText('Estimated from their own filings.', 540, 1080);
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1180);
    x.fillStyle = '#f5ead6'; x.font = '900 40px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', 540, 1240);
    try {
      x.fillStyle = '#8f887a'; x.font = '400 26px Arial,sans-serif';
      x.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(), 540, 1290);
    } catch (e) {}
    return cv;
  }
  function itemPainter(id) {
    return function (done) {
      try {
        var it = D.byId(id);
        if (!it) { done(null); return; }
        var takeLine, bar;
        if (it.cls === 'VALUE-CHAIN') {
          takeLine = 'THEIR TAKE \u2248 ' + money(it.takeMid) + '  (\u2248' + Math.round(it.takeMid / it.price * 1000) / 10 + '%)';
          bar = it.layers.map(function (l) { return l.amt; });
        } else if (it.id === 'gv-vs-folgers') {
          takeLine = 'THEIR TAKE \u2248 ' + money(it.legs[0].take) + ' + ' + money(it.legs[1].take);
          bar = [it.legs[0].take, it.legs[1].take];
        } else {
          takeLine = 'THEIR TAKE \u2248 ' + money(it.take) + '  (' + it.takePct + '%)';
          bar = [it.cost, it.take];
        }
        var p = basePoster(it.name.toUpperCase(), 'YOU PAID ' + (it.price != null ? money(it.price) : '—'));
        if (!p) { done(null); return; }
        var x = p.x, y = p.y + 40;
        x.fillStyle = '#e8352e'; x.font = '900 56px "Arial Black",Arial,sans-serif';
        wrapText(x, takeLine, 910).forEach(function (l) { x.fillText(l, 540, y); y += 68; });
        /* split bar */
        var total = bar.reduce(function (a, b) { return a + b; }, 0) || 1;
        var bx = 135, bw = 810, bh = 56, acc = 0;
        var cols = ['#5a5a5a', '#c1121f', '#8f2a33'];
        x.fillStyle = '#2a2a2a'; x.fillRect(bx, y + 20, bw, bh);
        bar.forEach(function (v, i) {
          var w = bw * (v / total);
          x.fillStyle = cols[Math.min(i, cols.length - 1)];
          x.fillRect(bx + acc, y + 20, w, bh);
          acc += w;
        });
        x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
        var band = it.cls === 'VALUE-CHAIN' ? it.bandLabel : it.bandLabel;
        x.fillText(it.takePct ? ('Margin ' + it.takePct + '% · ' + band) : band, 540, y + 140);
        done(footerPoster(p));
      } catch (e) { try { done(null); } catch (e2) {} }
    };
  }
  function basketPainter(id) {
    return function (done) {
      try {
        var b = null;
        for (var i = 0; i < D.BASKETS.length; i++) if (D.BASKETS[i].id === id) b = D.BASKETS[i];
        if (!b) { done(null); return; }
        var p = basePoster(b.name.toUpperCase(), b.sub.toUpperCase());
        if (!p) { done(null); return; }
        var x = p.x, y = p.y + 60;
        x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
        x.fillText('YOU PAID ' + money(b.paid), 540, y); y += 80;
        x.fillStyle = '#e8352e'; x.font = '900 64px "Arial Black",Arial,sans-serif';
        x.fillText('THEIR TAKE \u2248 ' + money(b.take), 540, y); y += 76;
        x.fillStyle = '#c9bfa8'; x.font = '400 34px Arial,sans-serif';
        x.fillText('\u2248' + b.takePct + '% of your ' + money(b.paid), 540, y);
        done(footerPoster(p));
      } catch (e) { try { done(null); } catch (e2) {} }
    };
  }
  function registerPainters() {
    try {
      if (!window.PFShare || !PFShare.setPoster) return;
      D.ITEMS.forEach(function (it) { PFShare.setPoster('robreport-' + it.id, itemPainter(it.id)); });
      D.BASKETS.forEach(function (b) { PFShare.setPoster('robreport-basket-' + b.id, basketPainter(b.id)); });
    } catch (e) {}
  }

  function wireShare(root) {
    var btns = root.querySelectorAll ? root.querySelectorAll('[data-rr-share]') : [];
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          try {
            var spec = String(btn.getAttribute('data-rr-share') || '');
            var parts = spec.split(':');
            var pid = parts[0] === 'basket' ? 'robreport-basket-' + parts[1] : 'robreport-' + parts[1];
            var P = window.PFShare;
            if (!P || !P.poster) return;
            var cv = P.poster(pid);
            if (!cv) return;
            var title = 'The Robbery Report — ' + pid;
            try { P.shareImage(cv, 'pfn-' + pid + '.png', title, 'robreport'); }
            catch (e) { try { P.saveImage(cv, 'pfn-' + pid + '.png', 'robreport'); } catch (e2) {} }
          } catch (e) { err('share failed'); }
        });
      })(btns[i]);
    }
  }

  /* ---------------- mount ---------------- */
  function mount(host) {
    if (!host || host.querySelector('.pf-rr')) return false;
    cssOnce();
    var h = '<div class="pf-rr">';
    h += '<div class="pf-rr-head">' +
         '<h3>THE ROBBERY REPORT</h3>' +
         '<p class="pf-rr-sub">Here\u2019s what they took from you — from their own filings.</p>' +
         '<p class="pf-rr-tag">' + esc(D.TAGLINE) + ' Their numbers, our division.</p>' +
         '<p class="pf-rr-fresh">Anchored to filings current as of Oct 2026. Re-anchor queued when Apple\u2019s FY2026 10-K lands (~late Oct). No company is accused of anything — every figure is labeled arithmetic on their announced numbers.</p>' +
         '</div>';
    D.ITEMS.forEach(function (it) { h += cardHTML(it); });
    h += '<div class="pf-rr-exc"><b>Why no Big Mac:</b> ' + esc(D.EXCLUDED.note.split(': ')[1] || D.EXCLUDED.note) + '</div>';
    D.BASKETS.forEach(function (b) { h += basketHTML(b); });
    h += '</div>';
    host.innerHTML = h;
    wireShare(host);
    registerPainters();
    /* CPI live chip for mapped cards only. */
    D.ITEMS.forEach(function (it) {
      if (!it.cpiSeries) return;
      liveMedian(it.cpiSeries, function (row) {
        if (!row) return;
        var el = host.querySelector('[data-rr-live="' + it.id + '"]');
        if (!el) return;
        var med = money(Number(row.median_cents) / 100);
        el.style.display = 'block';
        el.innerHTML = 'People\u2019s median (live): <b>' + esc(med) + '</b> · ' + esc(String(row.sample_count)) +
          ' reports · <a href="/economy#pf-inflation-trends">see the live price trend \u2192</a>';
      });
    });
    return true;
  }

  var AUTO_DONE = false;
  function autoMount() {
    if (AUTO_DONE) return; AUTO_DONE = true;
    try {
      var host = document.getElementById('pf-robreport');
      if (host) mount(host);
    } catch (e) {}
  }
  registerPainters();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else { autoMount(); }

  window.PFRobReport = { mount: mount, DATA: D };
})();
