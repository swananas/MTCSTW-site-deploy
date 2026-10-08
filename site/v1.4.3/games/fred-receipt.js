/* games/fred-receipt.js  |  PF v1.4.3 | TOOL 3 — "RECEIPT CHECK" BRIDGE.
   Official CPI vs the People's Price Index — side by side, never merged.
   Segmented toggle [OFFICIAL | PEOPLE'S | SIDE-BY-SIDE], two visual
   languages (blue-gray lines vs red-orange bars), fixed "why they're
   different" copy, gap described but never adjudicated, sample-count
   honesty (5 reports + 3 distinct callsigns minimum, backend-owned).

   Self-mounts on /economy as the hero module (prepended to #pf-economy).
   Read-only, zero XP.
   Kill: ?pf_off=economy-receipt (master ?pf_off=economy-fred).

   HARD SEPARATION (binding): no function here takes both datasets as
   inputs to one output. The official panel reads fred_series; the
   people's panel reads price_board. The gap strip is display arithmetic
   on the two independently fetched, separately labeled figures plus the
   fixed methodology line — never a blended index. There is no merged
   number in this file.

   Category picker (basket-scope rule, News Desk E7): a category ships
   only when both legs exist. v1: RENT (CUUR0000SEHA vs people's rent
   reports). Phase 3 (2026-10-06): GROCERIES enabled — official leg
   CUSR0000SAF11 verified and ingested; the people's leg has no grocery
   basket aggregate yet, so it renders the honest "building" state while
   the official panel shows. GAS enabled 2026-10-06 — official leg
   CUSR0000SETB01 (CPI: Gasoline (All Types) in U.S. City Average,
   monthly SA, BLS) wired by CEO ruling: the people's leg is per-gallon
   pump-price reports, and gasoline is what the official index tracks
   here — the correct basket match. The chip reads GAS; the citation
   names the series exactly.
   Kill: ?pf_off=receipt-groceries (groceries chip), ?pf_off=receipt-gas
   (gas chip). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (window.PFReceipt) return;
  function skip() {
    try { return PF.skip('fred') || PF.skip('economy-fred') || PF.skip('economy-receipt'); }
    catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Category map (Phase 3). A category ships only when its official leg
     exists; a missing people's leg renders the honest "building" state.
     GAS official leg: CUSR0000SETB01, wired by CEO ruling 2026-10-06
     (per-gallon pump prices = gasoline — the correct basket match). */
  var CATS = {
    rent: {
      label: 'RENT', official: 'CUUR0000SEHA', people: 'rent_1br',
      offPlain: 'rent of primary residence',
      pplFig: 'median reported 1BR rent', pplUnit: '/mo', pplDecimals: 0,
      gapWord: 'rents', gapOff: 'official rent CPI'
    },
    groceries: {
      label: 'GROCERIES', official: 'CUSR0000SAF11', people: null,
      offPlain: 'food at home (CPI)',
      pplThin: 'No people\u2019s grocery basket yet — item-level grocery ' +
        'reports (milk, eggs, bread\u2026) exist, but there\u2019s no aggregate ' +
        'to compare. Report prices to build it.'
    },
    gas: {
      label: 'GAS', official: 'CUSR0000SETB01', people: 'gasoline',
      offPlain: 'gasoline (all types, CPI)',
      pplFig: 'median reported gas price', pplUnit: '/gal', pplDecimals: 2,
      gapWord: 'gas prices', gapOff: 'the official gasoline index'
    }
  };

  var WHY_DIFFERENT = 'The official number is a national average built from ' +
    'thousands of surveyed prices. The people\u2019s number is what real people ' +
    'in this movement actually paid. Different methods, different stories — ' +
    'both worth seeing.';
  var PEOPLE_CAVEAT = 'Crowdsourced — not a statistical sample. Your receipts ' +
    'power the movement\u2019s intelligence.';
  var GAP_METHOD = 'Part of the gap is mechanical: the official basket weights ' +
    'items by a national formula and lets the basket substitute cheaper goods; ' +
    'the people\u2019s basket is what reporters actually bought, where they ' +
    'bought it. Neither is \u2018the\u2019 inflation — they\u2019re different ' +
    'baskets answering different questions.';

  var CSS = [
    '.pf-rc{max-width:980px;margin:0 auto 18px;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-rc-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-rc-title{font-weight:900;font-size:24px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-rc-sub{font-size:13px;color:#c9bfa8;text-align:center;margin:0 0 14px}',
    '.pf-rc-seg{display:flex;justify-content:center;margin-bottom:12px}',
    '.pf-rc-segwrap{display:inline-flex;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:8px;overflow:hidden}',
    '.pf-rc-seg button{background:transparent;border:0;color:#c9bfa8;min-height:48px;padding:0 20px;font-weight:900;font-size:13px;letter-spacing:1px;cursor:pointer}',
    '.pf-rc-seg button.on{background:#c1121f;color:#fff}',
    '.pf-rc-cats{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}',
    '.pf-rc-cat{background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:24px;min-height:48px;padding:0 20px;font-weight:700;font-size:13px;cursor:pointer}',
    '.pf-rc-cat.on{background:#c1121f;border-color:#c1121f;color:#fff}',
    '.pf-rc-cat:disabled{opacity:0.45;cursor:not-allowed}',
    '.pf-rc-cat small{display:block;font-size:10px;color:#8a8271;font-weight:400}',
    '.pf-rc-panels{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '@media (max-width:640px){.pf-rc-panels{grid-template-columns:1fr}}',
    '.pf-rc-panel{border-radius:10px;padding:14px;min-height:200px}',
    '.pf-rc-off{background:#10141a;border:1px solid #2a3a4a}',
    '.pf-rc-ppl{background:#1a100d;border:1px solid #4a2a1a}',
    '.pf-rc-badge{display:inline-block;font-weight:900;font-size:11px;letter-spacing:1.5px;padding:5px 10px;border-radius:4px;margin-bottom:10px}',
    '.pf-rc-off .pf-rc-badge{background:#2a3a4a;color:#9fc0e8}',
    '.pf-rc-ppl .pf-rc-badge{background:#4a2a1a;color:#f0a080}',
    '.pf-rc-fig{font-weight:900;font-size:32px;margin:0 0 2px}',
    '.pf-rc-off .pf-rc-fig{color:#cfe0f5}',
    '.pf-rc-ppl .pf-rc-fig{color:#f5cfae}',
    '.pf-rc-meta{font-size:12px;color:#8a8271;margin-bottom:8px}',
    '.pf-rc-bars{display:flex;gap:10px;align-items:flex-end;height:110px;margin:10px 0 4px;justify-content:center}',
    '.pf-rc-bar{width:64px;background:linear-gradient(to top,#c1121f,#f0a080);border-radius:4px 4px 0 0;position:relative;min-height:8px}',
    '.pf-rc-bar span{position:absolute;bottom:-20px;left:0;right:0;text-align:center;font-size:10px;color:#8a8271}',
    '.pf-rc-gap{background:#0d0d0d;border:1px dashed #3a3a3a;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.65}',
    '.pf-rc-gap b{color:#e8b923}',
    '.pf-rc-gap .pf-rc-method{font-size:12px;color:#8a8271;margin-top:8px;font-style:italic}',
    '.pf-rc-why{background:#101418;border:1px solid #2a3a4a;border-radius:8px;padding:12px 14px;margin:12px 0}',
    '.pf-rc-why b{color:#e8b923;letter-spacing:1px;font-size:12px}',
    '.pf-rc-why p{font-size:13px;line-height:1.6;color:#c9bfa8;margin:6px 0 0}',
    '.pf-rc-caveat{font-size:11px;color:#8a8271;font-style:italic;margin-top:8px}',
    '.pf-rc-thin{background:#1a100d;border:1px dashed #4a2a1a;border-radius:8px;padding:18px;text-align:center;font-size:14px;color:#c9bfa8;margin:12px 0}',
    '.pf-rc-share{display:block;width:100%;background:#c1121f;color:#fff;border:0;border-radius:6px;min-height:52px;font-weight:900;font-size:15px;letter-spacing:2px;cursor:pointer;margin-top:12px}',
    '.pf-rc-xlinks{border-top:1px solid #2a2a2a;margin-top:16px;padding-top:12px;text-align:center;font-size:13px;color:#8a8271}',
    '.pf-rc-xlinks a{color:#e8b923;font-weight:700;text-decoration:none;margin:0 10px;letter-spacing:0.5px}',
    '.pf-rc-err{background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:14px;font-size:14px;margin:10px 0}',
    '.pf-rc-loading{text-align:center;color:#8a8271;padding:30px 0;font-size:14px;letter-spacing:1px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-rc-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-rc-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function fmtMoney(cents) {
    var d = Number(cents) / 100;
    return '$' + d.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  /* People's figures are per-category: rent reports whole dollars/mo,
     gas reports dollars-and-cents/gal. The unit and decimals ride on the
     category so a publishing gasoline aggregate never renders as '$3'. */
  function fmtPpl(cents, cat) {
    var dec = (cat && cat.pplDecimals != null) ? cat.pplDecimals : 0;
    var d = Number(cents) / 100;
    return '$' + d.toLocaleString('en-US',
      { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  /* Official panel: blue-gray line chart of the FRED series. */
  function officialPanel(obs, F, stale, cat) {
    cat = cat || CATS.rent;
    var sid = cat.official;
    var pts = (obs || []).slice().reverse().slice(-12); /* oldest-first, last 12 */
    var W = 340, H = 120, PAD = 6;
    var vals = pts.map(function (p) { return +p.value; }).filter(isFinite);
    var svg = '';
    if (vals.length > 1) {
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      var d = pts.map(function (p, i) {
        var x = (PAD + (i / (vals.length - 1)) * (W - PAD * 2)).toFixed(1);
        var y = (PAD + (1 - ((+p.value - lo) / (hi - lo))) * (H - PAD * 2)).toFixed(1);
        return (i ? 'L' : 'M') + x + ' ' + y;
      }).join(' ');
      svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="display:block;width:100%;height:auto" role="img" aria-label="official ' + esc(cat.offPlain) + ' inflation trend">' +
        '<path d="' + d + '" fill="none" stroke="#6aa5ff" stroke-width="2.5"/></svg>';
    }
    var latest = (obs || [])[0];
    var yoy = null;
    if (obs && obs.length >= 13) {
      var a = +obs[0].value, b = +obs[12].value;
      if (b) yoy = ((a / b - 1) * 100);
    }
    var h = '<div class="pf-rc-panel pf-rc-off">' +
      '<span class="pf-rc-badge">OFFICIAL — U.S. BUREAU OF LABOR STATISTICS VIA FRED</span>' +
      '<div class="pf-rc-fig">' + (yoy == null ? '—' : (yoy >= 0 ? '+' : '−') + Math.abs(yoy).toFixed(1) + '%') + '</div>' +
      (stale && stale.stale && F && F.staleBadge ? F.staleBadge({ stale: true, days_old: stale.days_old, series_id: sid }) : '') +
      '<div class="pf-rc-meta">' + esc(cat.offPlain) + ', 12-month change' +
      (latest ? ' · ' + esc(F.fmtPeriod({ series_id: sid, period: latest.period })) : '') + '</div>' +
      svg;
    if (latest) {
      var card = { series_id: sid, retrieved_at: latest.retrieved_at, period: latest.period };
      h += '<div class="pf-fred-cite">' + esc(F.citation(card)) + '</div>';
    }
    h += '</div>';
    return { html: h, yoy: yoy };
  }

  /* People's panel: red-orange bars. enough_data is backend-owned
     (5 reports + 3 distinct callsigns). */
  function peoplePanel(item, cat) {
    cat = cat || CATS.rent;
    var h = '<div class="pf-rc-panel pf-rc-ppl">' +
      '<span class="pf-rc-badge">PEOPLE\u2019S — REPORTED BY THE MOVEMENT</span>';
    if (!item || !item.enough_data) {
      /* Groceries: no people's basket aggregate exists yet — honest
         "building" state instead of a silent gap. */
      var thin = cat.pplThin
        ? '<b>No people\u2019s grocery basket yet.</b><br><span style="font-size:12px">' + esc(cat.pplThin) + '</span>'
        : '<b>Not enough reports yet — add yours.</b><br>' +
          '<span style="font-size:12px">The people\u2019s panel publishes at 5 reports from 3+ callsigns.</span>';
      h += '<div class="pf-rc-thin">' + thin + '</div>';
      h += '<div class="pf-rc-caveat">' + esc(PEOPLE_CAVEAT) + '</div></div>';
      return { html: h, publishable: false };
    }
    var med = item.median_cents, ago = item.week_ago_median_cents;
    var d = item.delta_pct;
    var max = Math.max(med || 0, ago || 0, 1);
    function bar(v, label) {
      var ht = Math.max(8, Math.round((v / max) * 90));
      return '<div class="pf-rc-bar" style="height:' + ht + 'px"><span>' + esc(label) + '</span></div>';
    }
    h += '<div class="pf-rc-fig">' + fmtPpl(med, cat) +
      '<span style="font-size:14px;color:#8a8271">' + esc(cat.pplUnit || '/mo') + '</span></div>' +
      '<div class="pf-rc-meta">' + esc(cat.pplFig || 'median reported price') + ' · ' +
      (d == null ? 'no prior window' : (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + '% vs last month') +
      ' · ' + (item.sample_count || 0) + ' reports</div>' +
      '<div class="pf-rc-bars">' +
      (ago ? bar(ago, 'LAST MO') : '') + bar(med, 'THIS MO') +
      '</div><div style="height:22px"></div>' +
      '<div class="pf-rc-caveat">' + esc(PEOPLE_CAVEAT) + '</div></div>';
    return { html: h, publishable: true, delta: d, reports: item.sample_count };
  }

  /* (dead duplicate gapStrip removed 2026-10-05: keep one source of truth in render) */

  /* ---------- share card: BOTH panels or nothing ---------- */
  function wrapText(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function paintShare(off, ppl, gapText) {
    var W = 1080, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    /* ---- butter: editorial kit (factgen standard) ---- */
    var btR='#c1121f', btRD='#7d0b16', btC='#f2ecdc', btG='#c9a227',
        btM='#a89a7d', btF='#6f6350';
    x.fillStyle = '#0e0d0c'; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.032; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
    for (var btD = -H; btD < W + H; btD += 26) {
      x.beginPath(); x.moveTo(btD, 0); x.lineTo(btD + H, H); x.stroke();
    }
    x.restore();
    var btVg = x.createRadialGradient(W/2, H*0.40, H*0.16, W/2, H*0.50, H*0.85);
    btVg.addColorStop(0, 'rgba(0,0,0,0)'); btVg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = btVg; x.fillRect(0, 0, W, H);
    var btBar = x.createLinearGradient(0, 0, 0, 10);
    btBar.addColorStop(0, btR); btBar.addColorStop(1, btRD);
    x.fillStyle = btBar; x.fillRect(0, 0, W, 10);
    x.save(); x.globalAlpha = 0.05; x.fillStyle = btC;
    x.font = '900 620px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText('★', W/2, H*0.60); x.restore();
    var cx = W / 2, y = 110;
    x.textAlign = 'center';
    /* kicker: letterspaced gold */
    x.fillStyle = btG; x.font = '700 28px Arial,sans-serif';
    try { x.letterSpacing = '8px'; } catch (e) {}
    x.fillText('CHECK THE RECEIPTS \u00B7 TWO NUMBERS, TWO METHODS', cx, y); y += 70;
    try { x.letterSpacing = '0px'; } catch (e2) {}
    y += 36;
    x.strokeStyle = 'rgba(201,162,39,0.5)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(cx - 150, y); x.lineTo(cx + 150, y); x.stroke();
    y += 70;
    /* official panel (left) */
    x.textAlign = 'left';
    x.fillStyle = '#10141a'; x.fillRect(60, y, 460, 300);
    x.strokeStyle = 'rgba(159,192,232,0.35)'; x.lineWidth = 1.5;
    x.strokeRect(60, y, 460, 300);
    x.fillStyle = '#9fc0e8'; x.font = '700 24px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e3) {}
    x.fillText('OFFICIAL', 90, y + 44);
    try { x.letterSpacing = '0px'; } catch (e4) {}
    x.fillStyle = '#cfe0f5'; x.font = '900 70px Georgia,"Times New Roman",serif';
    x.fillText(off.fig || '—', 90, y + 140);
    x.fillStyle = '#8a8271'; x.font = 'italic 400 22px Georgia,serif';
    var ol = wrapText(x, off.cite || '', 400);
    for (var i = 0; i < ol.length && i < 3; i++) x.fillText(ol[i], 90, y + 180 + i * 30);
    /* people's panel (right) */
    x.fillStyle = '#1a100d'; x.fillRect(560, y, 460, 300);
    x.strokeStyle = 'rgba(240,160,128,0.35)'; x.lineWidth = 1.5;
    x.strokeRect(560, y, 460, 300);
    x.fillStyle = '#f0a080'; x.font = '700 24px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e5) {}
    x.fillText('PEOPLE\u2019S', 590, y + 44);
    try { x.letterSpacing = '0px'; } catch (e6) {}
    x.fillStyle = '#f5cfae'; x.font = '900 70px Georgia,"Times New Roman",serif';
    x.fillText(ppl.fig || '—', 590, y + 140);
    x.fillStyle = '#8a8271'; x.font = 'italic 400 22px Georgia,serif';
    var pl2 = wrapText(x, ppl.src || '', 400);
    for (var p2 = 0; p2 < pl2.length && p2 < 3; p2++) x.fillText(pl2[p2], 590, y + 180 + p2 * 30);
    y += 350;
    /* gap line + methodology */
    x.textAlign = 'center';
    x.fillStyle = btC; x.font = 'italic 700 34px Georgia,serif';
    var gl = wrapText(x, gapText || '', W - 140);
    for (var g2 = 0; g2 < gl.length && g2 < 3; g2++) { x.fillText(gl[g2], cx, y); y += 46; }
    y += 14;
    /* red diamond rule */
    x.strokeStyle = btR; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx - 150, y); x.lineTo(cx - 22, y); x.stroke();
    x.beginPath(); x.moveTo(cx + 22, y); x.lineTo(cx + 150, y); x.stroke();
    x.save(); x.translate(cx, y); x.rotate(Math.PI/4);
    x.fillStyle = btR; x.fillRect(-7, -7, 14, 14); x.restore();
    y += 44;
    x.fillStyle = btM; x.font = 'italic 400 24px Georgia,serif';
    var ml = wrapText(x, GAP_METHOD, W - 140);
    for (var m2 = 0; m2 < ml.length && m2 < 4; m2++) { x.fillText(ml[m2], cx, y); y += 32; }
    y += 30;
    x.fillStyle = btF; x.font = 'italic 400 26px Arial,sans-serif';
    x.fillText('Info, not advice. Data: FRED.', cx, y);
    /* ---- butter footer: CTA standard ---- */
    var fy = H - 190;
    x.strokeStyle = 'rgba(201,162,39,0.45)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(140, fy); x.lineTo(W - 140, fy); x.stroke();
    fy += 54;
    x.font = '900 42px Arial,sans-serif'; x.fillStyle = btC;
    try { x.letterSpacing = '8px'; } catch (e7) {}
    var btCta = 'JOIN THE FIGHT';
    var btCtaW = x.measureText(btCta).width;
    x.fillText(btCta, cx, fy);
    x.fillStyle = btR; x.fillText('.', cx + btCtaW/2 - 4, fy);
    try { x.letterSpacing = '0px'; } catch (e8) {}
    fy += 50;
    x.fillStyle = btR; x.font = '900 30px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch (e9) {}
    x.fillText('MTCSTW.COM', cx, fy);
    try { x.letterSpacing = '0px'; } catch (e10) {}
    var btBar2 = x.createLinearGradient(0, H - 10, 0, H);
    btBar2.addColorStop(0, btRD); btBar2.addColorStop(1, btR);
    x.fillStyle = btBar2; x.fillRect(0, H - 10, W, 10);
    return cv;
  }

  function shareAsText(off, ppl, gapText) {
    var txt = 'CHECK THE RECEIPTS — TWO NUMBERS, TWO METHODS.\n' +
      'Official: ' + (off.fig || '—') + ' (' + (off.cite || '') + ')\n' +
      'People\u2019s: ' + (ppl.fig || '—') + ' (' + (ppl.src || '') + ')\n' +
      (gapText || '') + '\nInfo, not advice. Data: FRED.\nhttps://www.mtcstw.com/economy#pf-receipt';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt);
        return 'Both numbers + sources copied — paste it anywhere.';
      }
    } catch (e) {}
    return null;
  }

  function doShare(state, btn) {
    var cv = null;
    try { cv = paintShare(state.off, state.ppl, state.gapText); } catch (e) { cv = null; }
    if (!cv) {
      var msg = shareAsText(state.off, state.ppl, state.gapText);
      if (btn) btn.textContent = msg || 'SHARE FAILED — TRY AGAIN';
      return;
    }
    try {
      if (window.PFShare && typeof window.PFShare.shareImage === 'function') {
        window.PFShare.shareImage(cv, 'pf-receipt-check.png', 'Check the receipts', 'receipt',
          { text: 'CHECK THE RECEIPTS — TWO NUMBERS, TWO METHODS. https://www.mtcstw.com/economy#pf-receipt via The Propaganda Factory',
            link: 'https://www.mtcstw.com/economy#pf-receipt' });
        return;
      }
    } catch (e) {}
    try {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = 'pf-receipt-check.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { a.parentNode.removeChild(a); } catch (e2) {} }, 500);
    } catch (e2) {
      var m2 = shareAsText(state.off, state.ppl, state.gapText);
      if (btn) btn.textContent = m2 || 'SHARE FAILED — TRY AGAIN';
    }
  }

  /* Category kill switches (Phase 3): ?pf_off=receipt-groceries,
     ?pf_off=receipt-gas. */
  function groceryKill() {
    try { return PF.skip('receipt-groceries'); } catch (e) { return false; }
  }
  function gasKill() {
    try { return PF.skip('receipt-gas'); } catch (e) { return false; }
  }

  /* Category buttons: every category ships — a missing people's leg
     renders the honest building state, never silence or a gate. */
  function catButtons(cur) {
    var out = '';
    ['rent', 'groceries', 'gas'].forEach(function (k) {
      var c = CATS[k];
      if (k === 'groceries' && groceryKill()) return;
      if (k === 'gas' && gasKill()) return;
      out += '<button type="button" class="pf-rc-cat' + (cur === k ? ' on' : '') + '"' +
        ' data-rc-cat="' + k + '">' + c.label + (k === 'groceries' ? '<small>NEW</small>' : '') + '</button>';
    });
    return out;
  }

  /* ---------- render ---------- */
  function render(el, view, catKey, data) {
    cssOnce();
    var F = window.PFFred;
    var cat = CATS[catKey] || CATS.rent;
    var h = '<div class="pf-rc"><div class="pf-rc-kicker">ECONOMY</div>' +
      '<h2 class="pf-rc-title">RECEIPT CHECK</h2>' +
      '<p class="pf-rc-sub">The government\u2019s number and the people\u2019s number — side by side, never blended.</p>';
    h += '<div class="pf-rc-seg"><div class="pf-rc-segwrap">' +
      ['official', 'peoples', 'side'].map(function (v) {
        var lbl = v === 'official' ? 'OFFICIAL' : v === 'peoples' ? 'PEOPLE\u2019S' : 'SIDE-BY-SIDE';
        return '<button type="button" data-rc-view="' + v + '" class="' + (view === v ? 'on' : '') + '">' + lbl + '</button>';
      }).join('') + '</div></div>';
    h += '<div class="pf-rc-cats">' + catButtons(catKey) + '</div>';

    var offStale = data.offStale || null;
    var off = officialPanel(data.obs, F, offStale, cat);
    var ppl = peoplePanel(data.item, cat);
    var showOff = view !== 'peoples', showPpl = view !== 'official';
    h += '<div class="pf-rc-panels"' + (view === 'side' ? '' : ' style="grid-template-columns:1fr"') + '>';
    if (showOff) h += off.html;
    if (showPpl) h += ppl.html;
    h += '</div>';

    /* Gap: renders ONLY when both panels have publishable data AND the
       official leg is fresh (staleness protocol: stale leg -> protocol line). */
    var gapText = '';
    if (offStale && offStale.stale && showOff && showPpl && ppl.publishable) {
      /* Comparison paused — same protocol copy fred_compare uses. */
      gapText = 'Comparison paused — ' + cat.official + ' is ' + (offStale.days_old == null ? '?' : offStale.days_old) +
        ' days past its expected refresh.';
      h += '<div class="pf-rc-gap"><b>THE GAP — </b>' + esc(gapText) +
        '<div class="pf-rc-method">' + esc(GAP_METHOD) + '</div></div>';
    } else if (showOff && showPpl && ppl.publishable && off.yoy != null && ppl.delta != null) {
      /* Horizon-honest: annualize the people's month-over-month delta before
         differencing against the official 12-month change. */
      var ann = (Math.pow(1 + ppl.delta / 100, 12) - 1) * 100;
      var gap = Math.abs(ann - off.yoy);
      var dir = ann >= off.yoy ? 'above' : 'below';
      gapText = 'People report ' + (cat.gapWord || 'prices') + ' moving ' + (ppl.delta >= 0 ? '+' : '−') + Math.abs(ppl.delta).toFixed(1) +
        '% this month — about a ' + (ann >= 0 ? '+' : '−') + Math.abs(ann).toFixed(1) +
        '% annual pace; ' + (cat.gapOff || 'the official index') + ' says ' + (off.yoy >= 0 ? '+' : '−') + Math.abs(off.yoy).toFixed(1) +
        '% over the year. That\u2019s roughly a ' + gap.toFixed(1) +
        '-point gap, with the people\u2019s number ' + dir + '.';
      h += '<div class="pf-rc-gap"><b>THE GAP — </b>' + esc(gapText) +
        '<div class="pf-rc-method">' + esc(GAP_METHOD) + '</div></div>';
    }

    h += '<div class="pf-rc-why"><b>WHY THEY\u2019RE DIFFERENT</b><p>' + esc(WHY_DIFFERENT) + '</p></div>';

    if (showOff && showPpl && ppl.publishable) {
      h += '<button type="button" class="pf-rc-share" data-rc-share>SHOW THE GAP</button>';
    }
    h += '<div class="pf-rc-xlinks">Checked the receipts? Now ' +
      '<a href="https://www.mtcstw.com/follow-the-money#pf-stackem">stack two numbers</a> · ' +
      '<a href="https://www.mtcstw.com/economy#pf-explain">translate the economy</a></div>';
    h += '</div>';
    el.innerHTML = h;

    el.querySelectorAll('[data-rc-view]').forEach(function (b) {
      b.addEventListener('click', function () { render(el, b.getAttribute('data-rc-view'), catKey, data); });
    });
    el.querySelectorAll('[data-rc-cat]').forEach(function (b) {
      b.addEventListener('click', function () { loadCat(el, view, b.getAttribute('data-rc-cat')); });
    });
    var sb = el.querySelector('[data-rc-share]');
    if (sb) sb.addEventListener('click', function () {
      doShare({
        off: { fig: off.yoy == null ? '—' : (off.yoy >= 0 ? '+' : '−') + Math.abs(off.yoy).toFixed(1) + '%',
               cite: 'BLS via FRED · ' + cat.official },
        ppl: { fig: data.item ? fmtPpl(data.item.median_cents, cat) + (cat.pplUnit || '/mo') : '—',
               src: (data.item ? data.item.sample_count + ' reports' : '') + ' · reported by the movement' },
        gapText: gapText
      }, sb);
    });
  }

  /* ---------- mount ---------- */
  function loadCat(el, view, catKey) {
    var cat = CATS[catKey] || CATS.rent;
    var F = window.PFFred;
    var obs = null, item = null, offMeta = null, done = 0;
    function maybe() {
      if (++done < 2) return;
      render(el, view, catKey, { obs: obs, item: item, offStale: offMeta });
    }
    F.api('fred_series', { series_id: cat.official, limit: 15 }, function (j) {
      obs = (j && j.ok && j.observations) || null;
      if (j && j.ok) offMeta = { stale: !!j.stale, days_old: j.days_old == null ? null : j.days_old, stale_note: j.stale_note || null };
      maybe();
    });
    /* People's panel: national board. enough_data is backend-owned
       (5 reports + 3 distinct callsigns). Categories with no people's
       leg (groceries) skip this call — the panel renders the honest
       "building" state. */
    if (!cat.people) { maybe(); }
    else {
      F.api('price_board', { area_key: 'national' }, function (j) {
        try {
          var items = (j && j.items) || [];
          for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].item_id === cat.people) { item = items[i]; break; }
          }
        } catch (e) {}
        maybe();
      });
    }
    /* Backstop: render whatever arrived after 15s. */
    setTimeout(function () {
      if (done < 2) { done = 2; render(el, view, catKey, { obs: obs, item: item, offStale: offMeta }); }
    }, 15000);
  }

  function mount() {
    if (skip()) return;
    var host = null;
    try { host = document.getElementById('pf-economy'); } catch (e) {}
    if (!host || document.getElementById('pf-receipt')) return;
    var F = window.PFFred;
    if (!F) return;
    var el = document.createElement('div');
    el.id = 'pf-receipt';
    if (host.firstChild) host.insertBefore(el, host.firstChild);
    else host.appendChild(el);
    el.innerHTML = '<div class="pf-rc"><div class="pf-rc-loading">CHECKING THE RECEIPTS…</div></div>';
    loadCat(el, 'side', 'rent');
  }

  try {
    window.PFReceipt = { mount: mount };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else { mount(); }
  } catch (e) {}
})();
