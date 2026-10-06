/* core/robreport.js  |  PF v1.4.3 | THE ROBBERY REPORT — Phase 1 (CEO flagship).
   "Here's what they took from you — from their own filings." Card-ified
   exposés (teardown WS-5, 2026-10-06): every item/basket = P2 Intel Card +
   P4 Data Strip via window.PF.patterns (fail-open: equivalent legacy markup
   when the patterns module is killed). One villain, ONE outrage number huge,
   plain-English mechanism one-liner — readable in 3 seconds. Every figure
   carries its source line ("estimated from their own filings") + recency
   stamp — the honesty signature; fail-closed: a figure without source and
   recency renders nothing. The wonks' data table (split bar, receipt links,
   can't-prove) sits one tap deep in <details> — never the lead. Share:
   per-card/per-basket PFShare posters (no free text in pixels; 'JOIN THE
   FIGHT.' + MTCSTW.COM per the share CTA standard). Card actions are text
   links only (News Desk red-button rule: no red buttons, no enlistment CTAs
   in card code). The integration-audit loop closers are preserved:
   "REPORT THE PRICE YOU PAID ->" -> /economy#pf-inflation-checkin and
   "FOLLOW THEIR MONEY ->" -> /follow-the-money, text-link style.
   CPI rail: card 10 lights up a live People's median via the existing
   price_board GET when min-n data exists (P8 proof line carries the REAL
   sample count — suppressed without one), else the curated typical-retail
   price stands.
   READ-ONLY: no POST, no auth, ZERO XP. Self-mounts on div#pf-robreport
   (silent no-op when absent); money-page.js also calls PFRobReport.mount.
   KILL: ?pf_off=robreport  or  localStorage pf_disabled_v1='["robreport"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('robreport')) { return; }
  var D = window.PFRobReportData;
  if (!D || !D.ITEMS) { try { PF.error('robreport', 'data module missing'); } catch (e) {} return; }
  /* Fail-open: when the patterns module is killed (?pf_off=patterns) the
     section still renders with equivalent legacy markup below. */
  var PAT = (window.PF && window.PF.patterns) ? window.PF.patterns : null;

  /* News Desk anchor stamp: every curated figure verified against filings
     current as of Oct 2026. The red-button rule lives here — anything that
     loses its anchor loses its figure (fail-closed strip below). */
  var RECENCY = 'Oct 2026';

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
      /* spacing for the pattern cards inside this section */
      '.pf-rr article.pf-pat-intel{margin:0 0 16px}' +
      '.pf-rr .pf-pat-data{margin:12px 0 4px}' +
      /* P2 fallback (patterns killed): same contract, legacy classes */
      '.pf-rr-card{background:#0a0a0a;border:1px solid #2a2a2a;border-top:3px solid #c1121f;border-radius:4px;padding:16px;margin:0 0 16px}' +
      '.pf-rr-kicker{color:#c1121f;text-transform:uppercase;letter-spacing:2px;font-size:12px;font-weight:700;margin:0 0 6px}' +
      '.pf-rr-h{font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:17px;color:#fff;margin:0 0 8px;line-height:1.3}' +
      '.pf-rr-mech{font-size:14px;color:#fff;margin:0 0 12px;line-height:1.45}' +
      /* P4 fallback (patterns killed): same contract, legacy classes */
      '.pf-rr-dstrip{text-align:center;padding:18px 12px;margin:12px 0}' +
      '.pf-rr-dfig{font-size:44px;font-weight:bold;color:#fff;line-height:1.1;margin:0}' +
      '.pf-rr-dlabel{color:#c1121f;text-transform:uppercase;letter-spacing:2px;font-size:11px;font-weight:bold;margin:8px 0 0}' +
      '.pf-rr-dsrc{color:#8a8a8a;font-size:11px;line-height:1.5;margin:12px 0 0}' +
      '.pf-rr-dtime{color:#8a8a8a;font-size:11px;letter-spacing:1px;margin:2px 0 0}' +
      /* the wonks' table: one tap deep, never the lead */
      '.pf-rr-more{margin:10px 0 4px;border:1px solid #2a2a2a;border-radius:4px}' +
      '.pf-rr-more summary{cursor:pointer;color:#f5f0e6;font-weight:700;font-size:13px;padding:10px 12px}' +
      '.pf-rr-more-body{padding:0 12px 12px}' +
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
      '.pf-rr-note{font-size:12px;color:#8f887a;margin:0 0 4px}' +
      '.pf-rr-paid{font-size:14px;margin:0 0 8px}' +
      '.pf-rr-paid b{font-size:20px;color:#fff}' +
      '.pf-rr-tiny{color:#8f887a;font-size:11px}' +
      /* card actions: text links only (red-button rule) */
      '.pf-rr-actions{margin:12px 0 4px;display:flex;flex-wrap:wrap;gap:8px 20px}' +
      '.pf-rr-next-a{color:#fff;font-size:13px;text-decoration:underline;text-underline-offset:3px}' +
      '.pf-rr-next-a:hover{color:#8a8a8a}' +
      '.pf-rr-live{font-size:12px;color:#7CFC00;margin:8px 0}' +
      '.pf-rr-live a{color:#7CFC00;text-decoration:underline}' +
      '.pf-rr-proof{font-size:12px;color:#8a8a8a;margin:4px 0 0}' +
      '.pf-rr-proof b{color:#fff}' +
      '.pf-rr-exc{background:#1a1a1a;border:1px dashed #555;border-radius:6px;padding:12px 16px;margin:0 0 18px;font-size:13px;color:#c9bfa8}' +
      '.pf-rr-exc b{color:#f5f0e6}' +
      '.pf-rr-assump{font-size:11px;color:#8f887a;font-style:italic;margin:6px 0 0}' +
      '.pf-rr-more ul{margin:6px 0;padding-left:20px}' +
      '.pf-rr-more li{margin:3px 0;font-size:13px}';
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

  /* ---------------- P2 Intel Card shell ----------------
     PAT.intelCard renders the shell (one action max); the card composes
     strip + wonks + actions around it. Fail-open legacy shell when the
     patterns module is killed. dataLine is esc()'d by us (the helper
     inserts it raw). */
  function intelShell(o) {
    if (PAT && PAT.intelCard) {
      var full = PAT.intelCard({ kicker: o.kicker, headline: o.headline, dataLine: esc(o.dataLine) });
      var i = full ? full.lastIndexOf('</article>') : -1;
      if (i > 0) {
        var open = full.slice(0, i).replace('<article', '<article data-rr="' + esc(o.id) + '"');
        return { open: open, close: '</article>' };
      }
    }
    return {
      open: '<article class="pf-rr-card" data-rr="' + esc(o.id) + '">' +
        (o.kicker ? '<p class="pf-rr-kicker">' + esc(o.kicker) + '</p>' : '') +
        '<h3 class="pf-rr-h">' + esc(o.headline) + '</h3>' +
        (o.dataLine ? '<p class="pf-rr-mech">' + esc(o.dataLine) + '</p>' : ''),
      close: '</article>'
    };
  }

  /* ---------------- P4 Data Strip ----------------
     FAIL-CLOSED: figure + label + source + recency ALL required. A figure
     without its source line and recency stamp renders NOTHING — the
     movement's whole pitch is "we count what they hide," and an unsourced
     number is a lie. (Mirrors PF.patterns.dataStrip's own fail-closed.) */
  function stripHTML(o) {
    var fig = String(o.figure == null ? '' : o.figure).trim();
    var label = String(o.label == null ? '' : o.label).trim();
    var source = String(o.source == null ? '' : o.source).trim();
    var updated = String(o.updated == null ? '' : o.updated).trim();
    if (!fig || !label || !source || !updated) { err('strip fail-closed: missing field'); return ''; }
    if (PAT && PAT.dataStrip) {
      var s = PAT.dataStrip({ figure: fig, label: label, source: source, updated: updated });
      if (s) return s;
    }
    return '<div class="pf-rr-dstrip">' +
      '<p class="pf-rr-dfig">' + esc(fig) + '</p>' +
      '<p class="pf-rr-dlabel">' + esc(label) + '</p>' +
      '<p class="pf-rr-dsrc">' + esc(source) + '</p>' +
      '<p class="pf-rr-dtime">updated ' + esc(updated) + '</p></div>';
  }

  /* ---------------- card actions: text links ONLY ----------------
     Red-button rule: no pf-pat-deploy-red / pf-pat-join / red buttons in
     card code. The two integration-audit loop closers are preserved here,
     text-link style per the rogue-verb map. The helper doubles as the
     CTA-verb guard: a refused label renders nothing. */
  var CTA_REPORT = { href: '/economy#pf-inflation-checkin', label: 'REPORT THE PRICE YOU PAID \u2192' };
  var CTA_FOLLOW = { href: '/follow-the-money', label: 'FOLLOW THEIR MONEY \u2192' };
  function tlink(href, label, attrs) {
    if (PAT && PAT.textLink && !PAT.textLink(href, label)) { err('cta refused: ' + label); return ''; }
    var cls = (PAT && PAT.textLink) ? 'pf-pat-textlink' : 'pf-rr-next-a';
    return '<a class="' + cls + '" href="' + esc(href) + '"' + (attrs ? ' ' + attrs : '') + '>' +
           esc(label) + '</a>';
  }
  function cardActions(shareSpec) {
    var h = '<nav class="pf-rr-actions">';
    h += tlink('#pf-robreport', 'SHARE THIS INTEL \u2192', 'data-rr-share="' + esc(shareSpec) + '"');
    h += tlink(CTA_REPORT.href, CTA_REPORT.label);
    h += tlink(CTA_FOLLOW.href, CTA_FOLLOW.label);
    return h + '</nav>';
  }

  /* ---------------- honesty signature builders ---------------- */
  /* Source line per card: the tagline + each EDGAR filing's short ref and
     its filed date, straight from the curated receipt text. */
  function sourceLine(it) {
    var refs = (it.receipt || []).map(function (r) {
      var parts = String(r.text).split('·');
      var filing = (parts[0] || '').trim();
      var filed = '';
      for (var i = 1; i < parts.length; i++) {
        var m = parts[i].match(/filed\s+[^·]+/i);
        if (m) { filed = m[0].trim(); break; }
      }
      return (filing + (filed ? ' · ' + filed : '')).trim();
    }).filter(function (x) { return !!x; });
    var tag = String(D.TAGLINE || 'Estimated from their own filings.').replace(/\.\s*$/, '');
    if (!refs.length) return ''; /* no anchor, no figure: fail-closed */
    return tag + ' — ' + refs.join(' · ');
  }
  /* The ONE outrage number per card + its label. */
  function takeFigure(it) {
    if (it.cls === 'VALUE-CHAIN') return { fig: '\u2248 ' + money(it.takeMid), of: 'of your ' + money(it.price) };
    if (it.id === 'gv-vs-folgers') return { fig: '\u2248 ' + money(it.legs[0].take + it.legs[1].take), of: 'both coffees' };
    return { fig: '\u2248 ' + money(it.take), of: 'of your ' + money(it.price) };
  }
  /* Plain-English mechanism one-liner: HOW they take it, not the number.
     Data-driven from the card's class + margin names — the number lives in
     the strip below, the caveats one tap deeper. */
  function mechanismLine(it) {
    var m = it.math || {};
    if (it.cls === 'DIRECT') {
      return 'Chipotle reports its own ' + (m.takeRatioName || 'profit margin') + ' at ' + it.takePct +
        '% — straight from their 8-K, applied to your ' + money(it.price) + '.';
    }
    if (it.cls === 'VALUE-CHAIN') {
      var layers = (it.layers || []).map(function (l) { return String(l.label).replace(/\s*\(.*?\)\s*/g, ''); });
      return 'Three margins stack in one bottle — ' + layers.join(', ') + ' — each from its own filing.';
    }
    if (it.cls === 'RETAIL') {
      return 'Walmart\u2019s own ' + (m.rName || 'gross profit rate') + ' is ' + it.takePct +
        '% — one blended margin across everything it sells.';
    }
    if (it.id === 'gv-vs-folgers') {
      return 'Same Walmart blended margin on both prices — their take under one roof, twice.';
    }
    var kind = it.cls === 'SEGMENT' ? 'true segment margin' : 'company-wide blended margin';
    return it.company + '\u2019s own ' + (m.gName || 'gross margin') + ' is ' + it.takePct + '% (' + kind +
      ') — applied to the ' + money(it.price) + ' shelf price, for scale.';
  }

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

  /* ---------------- wonks' table: one tap deep, never the lead ---------------- */
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
  function wonksHTML(it) {
    var h = '<details class="pf-rr-more"><summary>The receipts &amp; the math</summary><div class="pf-rr-more-body">';
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
    /* UX Combination Play 2 (fe/ux-take-to-cell): per-card take-to-cell —
       title + key figure + link back into the member's primary cell.
       Wired by share-everywhere's [data-pf-takecell] scan. Kill: ?pf_off=robreport. */
    var rrTake = (it.takeMid != null) ? it.takeMid : it.take;
    h += '<button type="button" class="pf-tc-btn" data-pf-takecell data-pf-tc-kind="robreport"' +
         ' data-pf-tc-title="THE ROBBERY REPORT \u2014 ' + esc(it.name) + '"' +
         ' data-pf-tc-figure="' + esc(rrTake != null ? ('Their take \u2248 ' + money(rrTake)) : 'Their take, from their own filings') + '"' +
         ' data-pf-tc-link="/money">&#9733; TAKE THIS TO YOUR CELL</button>';
    return h + '</div></details>';
  }

  /* ---------------- item card: P2 Intel + P4 Strip ---------------- */
  function cardHTML(it) {
    var shell = intelShell({
      id: it.id,
      kicker: String(it.company).toUpperCase(), /* the villain */
      headline: it.name,
      dataLine: mechanismLine(it) /* plain-English mechanism, one line */
    });
    var tf = takeFigure(it);
    var h = shell.open;
    h += stripHTML({
      figure: tf.fig, /* the ONE outrage number, huge */
      label: 'their take · ' + tf.of,
      source: sourceLine(it),
      updated: RECENCY
    });
    h += '<div class="pf-rr-live" data-rr-live="' + esc(it.id) + '" style="display:none"></div>';
    h += wonksHTML(it);
    h += cardActions('item:' + it.id);
    return h + shell.close;
  }

  /* ---------------- basket card: P2 Intel + P4 Strip ---------------- */
  function basketHTML(b) {
    var shell = intelShell({
      id: 'basket:' + b.id,
      kicker: 'HOUSEHOLD BASKET · ' + String(b.sub).toUpperCase(),
      headline: b.name,
      dataLine: b.tagline
    });
    var rows = b.items.map(function (bi) {
      var it = D.byId(bi.ref);
      if (!it) return '';
      var paid = it.price * bi.qty;
      var take = (it.cls === 'VALUE-CHAIN' ? it.takeMid : (it.id === 'gv-vs-folgers' ? it.legs[0].take : it.take)) * bi.qty;
      return '<li>' + esc(it.name) + ' × ' + bi.qty + ' (' + esc(bi.qtyLabel) + '): paid ' + money(paid) +
             ' · their take ≈ ' + money(take) + '</li>';
    }).join('');
    var h = shell.open;
    h += stripHTML({
      figure: '\u2248 ' + money(b.take),
      label: 'their take · ' + b.sub,
      source: String(D.TAGLINE || 'Estimated from their own filings.').replace(/\.\s*$/, '') +
              ' — sums of the item receipts above',
      updated: RECENCY
    });
    h += '<details class="pf-rr-more"><summary>Per-item breakdown</summary><div class="pf-rr-more-body"><ul>' +
         rows + '</ul>' +
         '<p class="pf-rr-assump">' + esc(b.assumptions) + '</p></div></details>';
    h += cardActions('basket:' + b.id);
    /* UX Combination Play 2 (fe/ux-take-to-cell): per-basket take-to-cell. */
    h += '<button type="button" class="pf-tc-btn" data-pf-takecell data-pf-tc-kind="robreport"' +
         ' data-pf-tc-title="THE ROBBERY REPORT \u2014 ' + esc(b.name) + '"' +
         ' data-pf-tc-figure="' + esc('Their take \u2248 ' + money(b.take) + ' (' + b.takePct + '%)') + '"' +
         ' data-pf-tc-link="/money">&#9733; TAKE THIS TO YOUR CELL</button>';
    return h + shell.close;
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
        x.fillText(it.takePct ? ('Margin ' + it.takePct + '% · ' + it.bandLabel) : it.bandLabel, 540, y + 140);
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
        btn.addEventListener('click', function (ev) {
          try { if (ev && ev.preventDefault) ev.preventDefault(); } catch (e) {}
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
    /* Pillar handoffs (brand-integration): data→propaganda + data→organize.
       Declarative — share-everywhere's scan renders them when it loads.
       UX Combination Play 2 (fe/ux-take-to-cell): the take-cell handoff now
       carries the section payload (title + figure + link) into the cell. */
    h += '<div data-pf-handoff="share-intel"></div>' +
         '<div data-pf-handoff="take-cell" data-pf-tc-kind="robreport"' +
         ' data-pf-tc-title="THE ROBBERY REPORT"' +
         ' data-pf-tc-figure="29 items. 4 household baskets. Their numbers, our division."' +
         ' data-pf-tc-link="/money"></div>';
    h += '</div>';
    host.innerHTML = h;
    wireShare(host);
    registerPainters();
    /* CPI live chip for mapped cards only: P8 proof carries the REAL sample
       count — suppressed without one (fail-closed by construction). */
    D.ITEMS.forEach(function (it) {
      if (!it.cpiSeries) return;
      liveMedian(it.cpiSeries, function (row) {
        if (!row) return;
        var el = host.querySelector('[data-rr-live="' + it.id + '"]');
        if (!el) return;
        var med = money(Number(row.median_cents) / 100);
        var n = Number(row.sample_count);
        var proof = '';
        if (PAT && PAT.proof) proof = PAT.proof({ count: n, text: 'neighbors reported this price' });
        else if (isFinite(n) && n > 0) {
          proof = '<p class="pf-rr-proof"><b>' + esc(Math.floor(n).toLocaleString('en-US')) +
                  '</b> neighbors reported this price</p>';
        }
        el.style.display = 'block';
        el.innerHTML = 'People\u2019s median (live): <b>' + esc(med) + '</b>' + proof +
          ' <a href="/economy#pf-inflation-trends">see the live price trend \u2192</a>';
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
