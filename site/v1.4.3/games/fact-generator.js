/* games/fact-generator.js  |  PF v1.4.3 | Fact Generator: type a claim, get sourced facts, share as a PFN poster
   CEO directive 2026-10-07 ~23:29 CDT.
   KILL: ?pf_off=fact-generator  or  localStorage pf_disabled_v1='["fact-generator"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('fact-generator')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-factgen">
<div class="fe-block pf-override-block" id="pf-factgen">
<style>
#pf-factgen{max-width:720px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;}
#pf-factgen .fg-kicker{font-size:0.8rem;letter-spacing:0.28em;color:#e5383b;font-weight:900;text-align:center;}
#pf-factgen h2{font-size:1.9rem;font-weight:900;letter-spacing:0.08em;color:#f5f0e1;text-align:center;margin:0.4rem 0 0.2rem;}
#pf-factgen .fg-sub{font-size:0.95rem;color:#b8ab8e;text-align:center;margin-bottom:1.2rem;}
#pf-factgen .fg-row{display:flex;gap:0.6rem;margin-bottom:0.8rem;}
#pf-factgen #fg-claim{flex:1;background:#141414;border:2px solid #3a3a3a;color:#f5f0e1;padding:0.7rem 0.9rem;font-size:1rem;font-family:inherit;border-radius:2px;}
#pf-factgen #fg-claim:focus{border-color:#c1121f;outline:none;}
#pf-factgen #fg-go{background:#c1121f;border:none;color:#fff;font-weight:900;letter-spacing:0.12em;padding:0.7rem 1.4rem;font-size:0.95rem;cursor:pointer;font-family:inherit;}
#pf-factgen #fg-go:disabled{opacity:0.5;cursor:wait;}
#pf-factgen .fg-chips{display:flex;flex-wrap:wrap;gap:0.45rem;justify-content:center;margin-bottom:1rem;}
#pf-factgen .fg-chip{background:#1a1a1a;border:1px solid #c1121f;color:#f5f0e1;font-size:0.8rem;padding:0.35rem 0.75rem;cursor:pointer;border-radius:20px;font-family:inherit;}
#pf-factgen .fg-chip:hover{background:rgba(193,18,31,0.25);}
#pf-factgen #fg-status{text-align:center;font-size:0.9rem;color:#b8ab8e;min-height:1.6em;margin-bottom:0.6rem;}
#pf-factgen #fg-results{display:grid;gap:0.8rem;margin-bottom:1rem;}
#pf-factgen .fg-fact{background:#141414;border:2px solid #2c2c2c;padding:1rem 1.1rem;cursor:pointer;transition:border-color 0.15s;}
#pf-factgen .fg-fact:hover{border-color:#666;}
#pf-factgen .fg-fact.sel{border-color:#c1121f;box-shadow:0 0 18px rgba(193,18,31,0.35);}
#pf-factgen .fg-figure{font-size:2rem;font-weight:900;color:#c1121f;letter-spacing:0.02em;}
#pf-factgen .fg-label{font-size:1rem;font-weight:700;color:#f5f0e1;margin:0.15rem 0;}
#pf-factgen .fg-detail{font-size:0.85rem;color:#b8ab8e;}
#pf-factgen .fg-src{font-size:0.75rem;color:#7a6f5c;margin-top:0.4rem;font-style:italic;}
#pf-factgen #fg-poster-wrap{text-align:center;margin:1rem 0;display:none;}
#pf-factgen #fg-poster{max-width:100%;height:auto;border:2px solid #c1121f;}
#pf-factgen .fg-actions{display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;}
#pf-factgen .fg-btn{background:#c1121f;border:none;color:#fff;font-weight:900;letter-spacing:0.1em;padding:0.7rem 1.5rem;font-size:0.9rem;cursor:pointer;font-family:inherit;}
#pf-factgen .fg-btn.ghost{background:transparent;border:2px solid #c1121f;color:#f5f0e1;}
#pf-factgen .fg-btn:disabled{opacity:0.5;cursor:wait;}
#pf-factgen .fg-note{font-size:0.78rem;color:#7a6f5c;text-align:center;margin-top:0.8rem;}
</style>
<div class="fg-kicker">&#9733; THE PROPAGANDA FACTORY &#9733;</div>
<h2>FACT GENERATOR</h2>
<div class="fg-sub">Type a claim. We find the receipts. You share the poster.</div>
<div class="fg-row">
  <input id="fg-claim" maxlength="300" placeholder="e.g. CEOs make 300x more than workers" autocomplete="off">
  <button id="fg-go">GENERATE</button>
</div>
<div class="fg-chips" id="fg-chips"></div>
<div id="fg-status"></div>
<div id="fg-results"></div>
<div id="fg-poster-wrap"><canvas id="fg-poster" width="1080" height="1350"></canvas></div>
<div class="fg-actions" id="fg-actions" style="display:none;">
  <button class="fg-btn" id="fg-share">SHARE POSTER</button>
  <button class="fg-btn ghost" id="fg-save">SAVE IMAGE</button>
</div>
<div class="fg-note">Figures pulled live from U.S. Census, BLS, BEA, World Bank, IMF &amp; SEC EDGAR.<br>Every poster carries its source. JOIN THE FIGHT.</div>
<script>
(function(){
  var API = (window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev');
  var claimEl = document.getElementById('fg-claim');
  var goBtn = document.getElementById('fg-go');
  var chipsEl = document.getElementById('fg-chips');
  var statusEl = document.getElementById('fg-status');
  var resultsEl = document.getElementById('fg-results');
  var posterWrap = document.getElementById('fg-poster-wrap');
  var cv = document.getElementById('fg-poster');
  var actionsEl = document.getElementById('fg-actions');
  var shareBtn = document.getElementById('fg-share');
  var saveBtn = document.getElementById('fg-save');
  var state = { claim: '', facts: [], selected: -1 };

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0d0d0d', MUTED = '#b8ab8e';

  function toast(m){ try { if (PF && PF.toast) PF.toast(m); } catch(e){} }
  function setStatus(m){ statusEl.textContent = m || ''; }

  /* ---- topic chips (from backend) ---- */
  function loadTopics(){
    fetch(API + '/?action=fact_topics')
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || !j.ok || !j.topics) return;
        chipsEl.innerHTML = '';
        j.topics.forEach(function(t){
          if (!t.live) return;
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'fg-chip'; b.textContent = t.label;
          b.onclick = function(){
            var ex = (t.examples && t.examples[0]) || t.label;
            claimEl.value = ex; generate();
          };
          chipsEl.appendChild(b);
        });
      })
      .catch(function(){});
  }

  /* ---- backend call ---- */
  function post(body){
    return fetch(API + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }

  function generate(){
    var claim = (claimEl.value || '').trim();
    if (!claim) { setStatus('Type a claim first.'); return; }
    goBtn.disabled = true;
    setStatus('Digging up the receipts\u2026');
    resultsEl.innerHTML = '';
    posterWrap.style.display = 'none';
    actionsEl.style.display = 'none';
    state.selected = -1;
    post({ type: 'factgen', fg_action: 'fact_generate', claim: claim })
      .then(function(j){
        goBtn.disabled = false;
        if (!j || !j.ok) {
          setStatus(j && j.error === 'rate_limited'
            ? 'Slow down, comrade \u2014 too many requests. Try again in a bit.'
            : 'Couldn\u2019t generate facts. Try again.');
          return;
        }
        state.claim = j.claim; state.facts = j.facts || [];
        if (!state.facts.length) {
          setStatus(j.note || 'No live data matched this claim yet.');
          return;
        }
        setStatus(state.facts.length + ' sourced fact' + (state.facts.length > 1 ? 's' : '') +
          ' found \u2014 tap one to make the poster.');
        renderFacts();
      })
      .catch(function(){
        goBtn.disabled = false;
        setStatus('Network error. Try again.');
      });
  }

  function renderFacts(){
    resultsEl.innerHTML = '';
    state.facts.forEach(function(f, i){
      var d = document.createElement('div');
      d.className = 'fg-fact';
      d.innerHTML =
        '<div class="fg-figure">' + esc(f.figure) + '</div>' +
        '<div class="fg-label">' + esc(f.label) + '</div>' +
        '<div class="fg-detail">' + esc(f.detail || '') + '</div>' +
        '<div class="fg-src">Source: ' + esc(f.source) + '</div>';
      d.onclick = function(){ selectFact(i); };
      resultsEl.appendChild(d);
    });
  }

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function selectFact(i){
    state.selected = i;
    var cards = resultsEl.querySelectorAll('.fg-fact');
    for (var k = 0; k < cards.length; k++) {
      cards[k].classList.toggle('sel', k === i);
    }
    drawPoster(state.facts[i]);
    posterWrap.style.display = 'block';
    actionsEl.style.display = 'flex';
    posterWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---- poster painter (1080x1350, PFN official fact-card) ---- */
  function wrapText(x, text, maxW){
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function(w){
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawPoster(f){
    var W = 1080, H = 1350;
    var x = cv.getContext('2d');
    if (!x) return;

    /* palette: ink, bone, oxblood red, muted gold */
    var RED = '#c1121f', RED_D = '#7d0b16', CREAM = '#f2ecdc',
        GOLD = '#c9a227', INK = '#0e0d0c', MUTED = '#a89a7d', FAINT = '#6f6350';

    /* ---- layered background: ink + pinstripe + vignette ---- */
    x.fillStyle = INK; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.032; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
    var d;
    for (d = -H; d < W + H; d += 26) {
      x.beginPath(); x.moveTo(d, 0); x.lineTo(d + H, H); x.stroke();
    }
    x.restore();
    var vg = x.createRadialGradient(W/2, H*0.40, H*0.16, W/2, H*0.50, H*0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    /* masthead bar */
    var bar = x.createLinearGradient(0, 0, 0, 14);
    bar.addColorStop(0, RED); bar.addColorStop(1, RED_D);
    x.fillStyle = bar; x.fillRect(0, 0, W, 10);
    /* giant watermark star behind the figure */
    x.save(); x.globalAlpha = 0.05; x.fillStyle = CREAM;
    x.font = '900 620px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText('\u2605', W/2, H*0.60);
    x.restore();

    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    var cx = W/2, y = 100, i;

    /* kicker */
    x.fillStyle = GOLD; x.font = '700 27px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch(e){}
    x.fillText('THE PROPAGANDA FACTORY', cx, y);
    try { x.letterSpacing = '0px'; } catch(e){}
    y += 36;
    x.strokeStyle = 'rgba(201,162,39,0.5)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(cx - 150, y); x.lineTo(cx + 150, y); x.stroke();
    y += 70;

    /* verified seal: double ring */
    x.strokeStyle = RED; x.lineWidth = 5;
    x.beginPath(); x.arc(cx, y, 52, 0, Math.PI*2); x.stroke();
    x.lineWidth = 2;
    x.beginPath(); x.arc(cx, y, 42, 0, Math.PI*2); x.stroke();
    x.fillStyle = CREAM; x.font = '900 19px Arial,sans-serif';
    x.fillText('VERIFIED', cx, y - 1);
    x.fillStyle = RED; x.font = '900 14px Arial,sans-serif';
    x.fillText('\u2605 \u2605 \u2605', cx, y + 22);
    y += 92;

    /* claim: editorial serif italic with quote flourish */
    var claim = String(state.claim || '');
    var cfs = 54, claimLines = [];
    for (;;) {
      x.font = 'italic 400 ' + cfs + 'px Georgia,"Times New Roman",serif';
      claimLines = wrapText(x, claim, W - 220).slice(0, 3);
      var tooWide = false;
      for (i = 0; i < claimLines.length; i++) {
        if (x.measureText(claimLines[i]).width > W - 220) { tooWide = true; break; }
      }
      if (!tooWide || cfs <= 34) break;
      cfs -= 2;
    }
    x.fillStyle = RED; x.font = '900 64px Georgia,serif';
    x.fillText('\u201C', cx, y);
    x.fillStyle = CREAM; y += cfs + 20;
    for (i = 0; i < claimLines.length; i++) { x.fillText(claimLines[i], cx, y); y += cfs + 14; }
    y += 20;

    /* red rule with diamond */
    x.strokeStyle = RED; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx - 190, y); x.lineTo(cx - 26, y); x.stroke();
    x.beginPath(); x.moveTo(cx + 26, y); x.lineTo(cx + 190, y); x.stroke();
    x.save(); x.translate(cx, y); x.rotate(Math.PI/4);
    x.fillStyle = RED; x.fillRect(-9, -9, 18, 18); x.restore();
    y += 54;

    /* THE FIGURE: monumental, gradient-filled, drop shadow */
    var fig = String(f.figure || '');
    var fsize = 176;
    x.font = '900 ' + fsize + 'px "Arial Black",Arial,sans-serif';
    while (x.measureText(fig).width > W - 170 && fsize > 64) {
      fsize -= 6;
      x.font = '900 ' + fsize + 'px "Arial Black",Arial,sans-serif';
    }
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.fillText(fig, cx + 5, y + 7);
    var fg = x.createLinearGradient(0, y - fsize, 0, y);
    fg.addColorStop(0, '#e63946'); fg.addColorStop(1, RED_D);
    x.fillStyle = fg;
    x.fillText(fig, cx, y);
    y += Math.round(fsize * 0.30);

    /* label: letterspaced caps */
    var lbl = String(f.label || '').toUpperCase();
    var lfs = 38;
    x.font = '700 ' + lfs + 'px Arial,sans-serif';
    while (x.measureText(lbl).width > W - 200 && lfs > 24) {
      lfs -= 2;
      x.font = '700 ' + lfs + 'px Arial,sans-serif';
    }
    try { x.letterSpacing = '6px'; } catch(e){}
    var lblLines = wrapText(x, lbl, W - 200).slice(0, 2);
    for (i = 0; i < lblLines.length; i++) { x.fillText(lblLines[i], cx, y); y += lfs + 14; }
    try { x.letterSpacing = '0px'; } catch(e){}
    y += 8;

    /* detail: quiet serif */
    x.fillStyle = MUTED; x.font = 'italic 400 28px Georgia,serif';
    var detLines = wrapText(x, String(f.detail || ''), W - 260).slice(0, 2);
    for (i = 0; i < detLines.length; i++) { x.fillText(detLines[i], cx, y); y += 42; }
    y += 28;

    /* source: hairline box */
    var srcText = 'SOURCE \u2014 ' + String(f.source || '').toUpperCase();
    x.font = '700 26px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch(e){}
    var sw = Math.min(x.measureText(srcText).width + 90, W - 160);
    var sy = y;
    x.strokeStyle = 'rgba(242,236,220,0.35)'; x.lineWidth = 1.5;
    x.strokeRect(cx - sw/2, sy, sw, 56);
    x.fillStyle = CREAM;
    x.fillText(srcText, cx, sy + 39);
    try { x.letterSpacing = '0px'; } catch(e){}
    y = sy + 90;
    /* citation */
    x.fillStyle = FAINT; x.font = '400 24px Georgia,serif';
    var citLines = wrapText(x, String(f.citation || ''), W - 280).slice(0, 2);
    for (i = 0; i < citLines.length; i++) { x.fillText(citLines[i], cx, y); y += 34; }

    /* ---- footer CTA ---- */
    var fy = H - 215;
    x.strokeStyle = 'rgba(201,162,39,0.45)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(120, fy); x.lineTo(W - 120, fy); x.stroke();
    fy += 58;
    x.font = '900 44px Arial,sans-serif';
    try { x.letterSpacing = '8px'; } catch(e){}
    var cta = 'JOIN THE FIGHT';
    var ctaW = x.measureText(cta).width;
    x.fillStyle = CREAM;
    x.fillText(cta, cx, fy);
    x.fillStyle = RED;
    x.fillText('.', cx + ctaW/2 - 4, fy);
    try { x.letterSpacing = '0px'; } catch(e){}
    fy += 52;
    x.fillStyle = RED; x.font = '900 32px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch(e){}
    x.fillText('MTCSTW.COM', cx, fy);
    try { x.letterSpacing = '0px'; } catch(e){}
    fy += 42;
    x.fillStyle = FAINT; x.font = '400 24px Arial,sans-serif';
    try {
      x.fillText(new Date().toLocaleDateString('en-US',
        { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(), cx, fy);
    } catch(e){}
    /* bottom masthead bar */
    var bar2 = x.createLinearGradient(0, H - 10, 0, H);
    bar2.addColorStop(0, RED_D); bar2.addColorStop(1, RED);
    x.fillStyle = bar2; x.fillRect(0, H - 10, W, 10);

    /* callsign stamp, rotated */
    try {
      var cs = '';
      var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      if (id && id.callsign) cs = String(id.callsign).toUpperCase();
      if (cs) {
        x.save(); x.translate(W - 210, H - 330); x.rotate(-0.14);
        x.strokeStyle = RED; x.lineWidth = 3;
        var st = 'FIGHTING AS ' + cs;
        x.font = '900 24px Arial,sans-serif';
        var stw = x.measureText(st).width + 44;
        x.strokeRect(-stw/2, -30, stw, 52);
        x.fillStyle = RED;
        x.fillText(st, 0, 6);
        x.restore();
      }
    } catch(e){}
  }

  /* ---- share / save ---- */
  function canvasFile(cb){
    try {
      cv.toBlob(function(blob){
        if (!blob) { toast('Poster failed \u2014 try again.'); return; }
        cb(blob);
      }, 'image/png', 0.92);
    } catch(e){ toast('Poster failed \u2014 try again.'); }
  }

  function sharePoster(){
    var f = state.facts[state.selected];
    if (!f) return;
    var filename = 'pfn-fact-' + Date.now() + '.png';
    canvasFile(function(blob){
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch(e){}
      var title = 'PFN Fact: ' + (f.label || '');
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({ files: [file], title: title,
            text: state.claim + ' \u2014 ' + f.figure + ' ' + f.label + ' (' + f.source + ')' })
            .then(function(){ toast('Shared. Go spread the word.'); },
              function(err){
                if (err && err.name === 'AbortError') toast('Share cancelled.');
                else downloadBlob(blob, filename);
              });
          return;
        } catch(e){}
      }
      downloadBlob(blob, filename);
    });
  }

  function downloadBlob(blob, filename){
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      toast('Image downloaded.');
    } catch(e){ toast('Download failed \u2014 try again.'); }
  }

  function savePoster(){
    var f = state.facts[state.selected];
    if (!f) return;
    var filename = 'pfn-fact-' + Date.now() + '.png';
    canvasFile(function(blob){
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch(e){}
      var isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
      if (isiOS && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          navigator.share({ files: [file], title: 'Save to Photos' })
            .then(function(){ toast('Saved. Check your Photos.'); },
              function(err){ if (!(err && err.name === 'AbortError')) toast('Save cancelled.'); });
          return;
        } catch(e){}
      }
      downloadBlob(blob, filename);
    });
  }

  /* ---- wire up ---- */
  goBtn.onclick = generate;
  claimEl.addEventListener('keydown', function(e){
    if (e.key === 'Enter') generate();
  });
  shareBtn.onclick = sharePoster;
  saveBtn.onclick = savePoster;
  loadTopics();

  /* Register with PFShare's custom painter system if present, so the
     site-wide share-image buttons can render fact posters too. */
  try {
    if (window.PFShare && PFShare.setPoster) {
      PFShare.setPoster('fact-generator', function(done){
        var f = state.facts[state.selected];
        if (!f) { done(null); return; }
        /* drawPoster paints the visible canvas; hand it back directly. */
        drawPoster(f);
        done(cv);
      });
    }
  } catch(e){}
})();
</script>
</div>
</template>`);

  /* ---- self-mount (2026-10-08): the template was staged but never
     instantiated — the UI existed in the bundle but rendered nowhere.
     Mount into the #pf-factgen shell mount when present (the dedicated
     /fact-generator route), else into #pf-create on /create, else main.
     Follows the phq-hubs.js importNode + execScripts pattern. */
  try {
    if (!document.getElementById('pf-factgen-mounted')) {
      var path = (window.location && window.location.pathname) || '';
      var onFactGen = path.indexOf('/fact-generator') === 0;
      var onCreate = path.indexOf('/create') === 0;
      if (onFactGen || onCreate) {
        var host = document.getElementById('pf-factgen') ||
                   document.getElementById('pf-create') ||
                   document.getElementById('main');
        var tpl = document.getElementById('pf-ov-factgen');
        if (host && tpl && tpl.content) {
          var frag = document.importNode(tpl.content, true);
          var wrap = document.createElement('div');
          wrap.id = 'pf-factgen-mounted';
          wrap.appendChild(frag);
          /* On /create, place after existing tools; on /fact-generator
             the shell mount is empty so append is correct. */
          host.appendChild(wrap);
          /* Execute the inner script (importNode clones don't run). */
          var scripts = wrap.querySelectorAll('script');
          for (var si = 0; si < scripts.length; si++) {
            try { (0, eval)(scripts[si].textContent); }
            catch (e) { try { if (PF && PF.error) PF.error('fact-generator', 'mount script failed: ' + (e && e.message || e)); } catch (e2) {} }
            scripts[si].remove();
          }
        }
      }
    }
  } catch (e) { try { if (PF && PF.error) PF.error('fact-generator', 'mount failed: ' + (e && e.message || e)); } catch (e2) {} }
})();
