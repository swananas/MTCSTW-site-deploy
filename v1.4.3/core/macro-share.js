/* core/macro-share.js  |  PF v1.4.3 | P-07 ONE-TAP "POST THIS STAT" + P-10
   CALLSIGN-STAMPED STAT CARDS (Wave A6 / propaganda PW1).
   Any macro card -> one tap -> share image + pre-written caption +
   callsign stamp, deep-link to post.
   LOOP LAW: inform (the macro card shows the figure) -> invite back
   (one tap) -> pay off (the EXISTING poster_share -> create_share: +5 leg
   on server-verified proof; this module posts to that action unchanged).
   SECURITY (P-07 gate): captions are PRE-WRITTEN ONLY — a locked per-series
   template map assembled from figure fields. No user free-text ever enters
   the image or the caption (caption injection barred by construction: there
   is no input field anywhere in this flow except the proof URL, which goes
   to the existing backend proof verifier, never into pixels).
   P-10: every macro share image passes through PFShare.stampCallsign
   (the existing idempotent stamper) explicitly here; the share pipeline
   stamps again harmlessly (idempotent via cv._pfStamped).
   No XP is granted by this module — the only XP touch is the backend's
   existing poster_share response, surfaced verbatim. No xpGrant, no new
   legs, no new amounts.
   KILL: ?pf_off=macro-share  or  localStorage pf_disabled_v1='["macro-share"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('macro-share')) { return; }
  if (window.pfMacroShareDone) return;
  window.pfMacroShareDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Pre-written caption templates (News Desk owns this copy — gold-standard
     accuracy: pure figures, series ID + vintage stamped, no commentary that
     invents meaning). {value} {period} {change} {vintage} interpolate from
     the figure rail ONLY. Fallback template for series without a bespoke
     line. The deep link + attribution are appended by buildCaption. */
  var CAPTIONS = {
    UNRATE: 'Unemployment: {value} ({period}). The official count, straight from the Bureau of Labor Statistics. They want you to feel the recovery — here is the receipt. FRED · UNRATE · retrieved {vintage}.',
    CPIAUCNS: 'Prices up {change} year over year ({period}). That is the CPI — the official inflation receipt. Your paycheck did not keep up and they know it. FRED · CPIAUCNS · retrieved {vintage}.',
    CPILFESL: 'Core inflation: {change} year over year ({period}). Strip out food and energy and the number still bites. FRED · CPILFESL · retrieved {vintage}.',
    PAYEMS: '{value} jobs on payrolls ({period}) — {change} vs last month. The official jobs count. Count what it means for your town. FRED · PAYEMS · retrieved {vintage}.',
    FEDFUNDS: 'Fed funds rate: {value} ({period}). The price of money itself, set by people you will never meet. FRED · FEDFUNDS · retrieved {vintage}.',
    DGS10: '10-year Treasury: {value} ({period}). Wall Street\'s fear gauge, in one number. FRED · DGS10 · retrieved {vintage}.',
    MORTGAGE30US: '30-year mortgage: {value} ({period}). The American dream, repriced every week. FRED · MORTGAGE30US · retrieved {vintage}.',
    GDP: 'Real GDP {change} ({period}). They will cite growth; you live the prices. FRED · GDP · retrieved {vintage}.',
    CPILFESL2: '',
    PCEPI: 'PCE inflation: {change} year over year ({period}) — the Fed\'s favorite inflation gauge. FRED · PCEPI · retrieved {vintage}.'
  };
  var CAPTION_FALLBACK = 'Official figure: {value} ({period}), {change}. Straight from the Fed data vault — not a vibe, a vintage. FRED · {series} · retrieved {vintage}.';

  function fmtVintage(fig) {
    try {
      var rt = fig && fig.retrieved_at != null ? Number(fig.retrieved_at) : NaN;
      var d = isNaN(rt) ? null : new Date(rt);
      if (!d || isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return '—'; }
  }

  function deepLink(fig) {
    var u = 'https://www.mtcstw.com/follow-the-money#macro-' + (fig.series_id || '');
    try { if (PF.shareUrl) u = PF.shareUrl(u); } catch (e) {}
    return u;
  }

  /* Caption assembly: locked template + figure fields ONLY. */
  function buildCaption(fig) {
    var sid = fig.series_id || '';
    var tpl = CAPTIONS[sid] || CAPTION_FALLBACK;
    var out = tpl
      .replace(/\{value\}/g, fig.value_label || '—')
      .replace(/\{period\}/g, fig.period_label || fig.period || '')
      .replace(/\{change\}/g, fig.change_label || '')
      .replace(/\{vintage\}/g, fmtVintage(fig))
      .replace(/\{series\}/g, sid);
    return out + ' ' + deepLink(fig) + ' via The Propaganda Factory';
  }

  /* ---------- canvas stat card (1080x1080, screenshot/repost friendly) ---------- */
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

  function paintStatCard(fig) {
    var W = 1080, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, 16);
    var cx = W / 2, y = 96;
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    /* kicker */
    x.fillStyle = '#e8b923'; x.font = '700 34px Arial,sans-serif';
    x.fillText('OFFICIAL DATA · FRED', cx, y); y += 28;
    /* SA/NSA chip */
    if (fig.sa_nsa) {
      x.font = '700 26px Arial,sans-serif';
      var chip = String(fig.sa_nsa), cw = x.measureText(chip).width + 36;
      x.fillStyle = '#2a2a2a'; x.fillRect(cx - cw / 2, y, cw, 44);
      x.fillStyle = '#c9bfa8'; x.fillText(chip, cx, y + 32); y += 76;
    } else { y += 30; }
    /* title */
    x.fillStyle = '#f5ead6'; x.font = '900 52px Arial,sans-serif';
    var tl = wrapText(x, fig.title || fig.series_id || '', W - 160);
    for (var i = 0; i < tl.length && i < 2; i++) { x.fillText(tl[i], cx, y); y += 62; }
    y += 18;
    /* value */
    x.font = '900 170px Arial,sans-serif';
    x.fillText(fig.value_label || '—', cx, y + 130); y += 210;
    /* unit + period */
    x.fillStyle = '#c9bfa8'; x.font = '400 34px Arial,sans-serif';
    if (fig.unit_label) { x.fillText(fig.unit_label, cx, y); y += 48; }
    x.font = '700 40px Arial,sans-serif'; x.fillStyle = '#f5ead6';
    x.fillText(fig.period_label || fig.period || '', cx, y); y += 62;
    /* change */
    if (fig.change_label) {
      x.font = '900 52px Arial,sans-serif'; x.fillStyle = '#e8b923';
      x.fillText(fig.change_label, cx, y); y += 70;
    }
    /* source stamp */
    x.fillStyle = '#2a2a2a'; x.fillRect(80, y + 10, W - 160, 2); y += 56;
    x.fillStyle = '#8a8271'; x.font = '400 28px Arial,sans-serif';
    x.fillText('FRED · ' + (fig.series_id || '') + ' · RETRIEVED ' + fmtVintage(fig), cx, y); y += 60;
    /* footer CTA */
    x.fillStyle = '#f5ead6'; x.font = '700 38px Arial,sans-serif';
    x.fillText('MTCSTW.COM', cx, y); y += 56;
    x.fillStyle = '#c1121f'; x.font = '900 54px Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', cx, y);
    return cv;
  }

  /* ---------- proof prompt (existing leg, unchanged) ---------- */
  var proofOpen = false;
  function proofPrompt(fig) {
    if (proofOpen) return;
    proofOpen = true;
    var storyUrl = deepLink(fig);
    var wrap = document.createElement('div');
    wrap.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
      'background:#0d0d0d;border-top:3px solid #c1121f;padding:14px 16px 18px;' +
      'font-family:Arial,sans-serif;color:#f5ead6;');
    wrap.innerHTML =
      '<div style="font-weight:900;letter-spacing:1px;font-size:14px;margin-bottom:6px;">' +
      'POSTED IT? CLAIM YOUR +5 XP</div>' +
      '<div style="font-size:13px;color:#c9bfa8;margin-bottom:8px;">Paste the link to your public post. ' +
      'The backend verifies it — no proof, no XP.</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<input data-pf-proof type="url" placeholder="https://… link to your post" maxlength="2000" ' +
      'style="flex:1;background:#141414;border:1px solid #3a3a3a;color:#f5ead6;border-radius:6px;' +
      'padding:10px;font-size:14px;min-width:0;" />' +
      '<button data-pf-proofgo style="background:#c1121f;color:#fff;border:0;border-radius:6px;' +
      'padding:10px 14px;font-weight:900;font-size:14px;cursor:pointer;">CLAIM</button>' +
      '<button data-pf-proofx style="background:#2a2a2a;color:#c9bfa8;border:0;border-radius:6px;' +
      'padding:10px 12px;font-size:14px;cursor:pointer;">LATER</button></div>' +
      '<div data-pf-proofmsg style="font-size:13px;margin-top:8px;min-height:18px;"></div>';
    function close() {
      proofOpen = false;
      try { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } catch (e) {}
    }
    function msg(t, good) {
      try {
        var m = wrap.querySelector('[data-pf-proofmsg]');
        m.textContent = t; m.style.color = good ? '#7fd67f' : '#e0685c';
      } catch (e) {}
    }
    try {
      wrap.querySelector('[data-pf-proofx]').addEventListener('click', close);
      wrap.querySelector('[data-pf-proofgo]').addEventListener('click', function () {
        var inp = wrap.querySelector('[data-pf-proof]');
        var proof = inp && inp.value ? String(inp.value).trim() : '';
        if (!proof) { msg('Paste your post link first.'); return; }
        msg('Verifying…');
        try {
          PF.postAction('readcreate', 'rc_action', 'poster_share',
            { story_url: storyUrl, proof_url: proof }, function (j) {
              if (j && j.ok) {
                msg('+5 XP confirmed. The number travels with your name on it.', true);
                /* PLAY 10 — WINS THAT ECHO (2026-10-06): proof-verified
                   poster deployment -> win event. Recognition only — the +5
                   create_share leg is the backend's existing response,
                   surfaced verbatim; this hook mints zero XP. */
                try {
                  if (window.PF && PF.wins && typeof PF.wins.emit === 'function') {
                    PF.wins.emit('poster_deployed', '\uD83D\uDCE3 POSTER DEPLOYED',
                      'Proof-verified share · the number travels with your name on it.',
                      { dedupe: 'deploy:' + String(storyUrl || '') + ':' +
                        new Date().toISOString().slice(0, 10) });
                  }
                } catch (e) {}
              }
              else if (j && j.dup) { msg('Already counted — proof links are one-time.', true); }
              else msg('Not counted: ' + ((j && j.err) || 'verification failed') + '.');
            });
        } catch (e) { msg('Could not reach the backend — try again.'); }
      });
    } catch (e) {}
    try { document.body.appendChild(wrap); } catch (e) { proofOpen = false; }
    setTimeout(function () { if (proofOpen) close(); }, 120000); /* never trap */
  }

  /* ---------- the one-tap flow ---------- */
  function shareFigure(fig) {
    if (!fig || fig.stale) return false;
    var cv = null;
    try { cv = paintStatCard(fig); } catch (e) {}
    if (!cv) return false;
    /* P-10: explicit callsign stamp via the existing idempotent stamper. */
    try {
      if (window.PFShare && typeof window.PFShare.stampCallsign === 'function') {
        cv = window.PFShare.stampCallsign(cv) || cv;
      }
    } catch (e) {}
    var caption = buildCaption(fig);
    var fname = 'pf-macro-' + String(fig.series_id || 'stat').toLowerCase() + '.png';
    var done = function () { proofPrompt(fig); };
    try {
      if (window.PFShare && typeof window.PFShare.shareImage === 'function') {
        /* The share pipeline stamps again (idempotent), runs the callsign
           claim gate, fires the local share credit, and falls back to
           download where the share sheet is unavailable. opts.text carries
           the pre-written caption (no free-text anywhere). */
        window.PFShare.shareImage(cv, fname, fig.title || 'Macro stat', 'macro-strip',
          { text: caption, link: deepLink(fig) });
        done();
        return true;
      }
    } catch (e) {}
    /* Fallback: plain download + proof prompt. */
    try {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { a.parentNode.removeChild(a); } catch (e2) {} }, 500);
      done();
      return true;
    } catch (e2) { return false; }
  }

  function shareSeries(seriesId) {
    /* Gallery "YOUR TURN" path: fetch the current figure, then one-tap it. */
    if (!BACKEND) return false;
    var fn = 'pfMacroShareCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), finished = false;
    function fin(j) {
      if (finished) return; finished = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      var card = null;
      try {
        var arr = (j && j.series) || [];
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].series_id === seriesId) { card = arr[i]; break; }
        }
      } catch (e) {}
      if (card) shareFigure(card);
    }
    window[fn] = fin;
    s.onerror = function () { fin(null); };
    s.src = BACKEND + '?action=fred_macro&callback=' + fn;
    try { document.head.appendChild(s); } catch (e) { return false; }
    setTimeout(function () { fin(null); }, TIMEOUT_MS);
    return true;
  }

  /* ---------- decorator: wire POST THIS STAT into rendered macro cards ---------- */
  var CSS = [
    '.pf-macro-sharewrap{position:relative}',
    '.pf-macro-sharebtn{display:block;width:100%;margin-top:8px;background:#c1121f;color:#fff;' +
    'border:0;border-radius:6px;padding:10px;font-weight:900;font-size:13px;letter-spacing:2px;' +
    'cursor:pointer;font-family:Arial,sans-serif}',
    '.pf-macro-sharebtn:active{transform:scale(.98)}'
  ].join('\n');
  function cssOnce() {
    try {
      if (document.getElementById('pf-macro-share-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-macro-share-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function parseFig(el) {
    try {
      var raw = el.getAttribute('data-macro');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function wireCard(card) {
    if (!card || card.getAttribute('data-pf-share-wired')) return;
    var fig = parseFig(card);
    if (!fig || fig.stale || !fig.series_id) return;
    card.setAttribute('data-pf-share-wired', '1');
    cssOnce();
    try {
      var wrap = document.createElement('div');
      wrap.className = 'pf-macro-sharewrap';
      card.parentNode.insertBefore(wrap, card);
      wrap.appendChild(card);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pf-macro-sharebtn';
      btn.textContent = 'POST THIS STAT';
      btn.setAttribute('aria-label', 'Share this stat: ' + (fig.title || fig.series_id));
      btn.addEventListener('click', function (ev) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
        shareFigure(fig);
      });
      wrap.appendChild(btn);
    } catch (e) {
      try { card.removeAttribute('data-pf-share-wired'); } catch (e2) {}
    }
  }

  function scan() {
    var cards = null;
    try { cards = document.querySelectorAll('.pf-macro-card[data-macro]'); } catch (e) { return; }
    for (var i = 0; i < cards.length; i++) { try { wireCard(cards[i]); } catch (e) {} }
  }

  function wire() {
    scan();
    try {
      var mo = new MutationObserver(function () { scan(); });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    return true;
  }

  try {
    window.PFMacroShare = { wire: wire, shareFigure: shareFigure, shareSeries: shareSeries,
      buildCaption: buildCaption, _captions: CAPTIONS };
    /* Auto-wire on load: the strip renders async, the observer catches it. */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wire);
    } else { wire(); }
  } catch (e) {}
})();
