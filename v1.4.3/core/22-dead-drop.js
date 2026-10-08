/* core/22-dead-drop.js  |  PF v1.4.3 | DEAD DROP (A1) — daily hidden XP cache.
   Every Chicago day a bonus XP cache hides on one of 16 pages. The Morning
   Briefing publishes a riddle, never the page name. Find the cache, tap it,
   claim it: base 15 XP + 5 per consecutive-find day, capped at 40.
   Miss it and it is gone at midnight Chicago time.
   Two surfaces, both driven by the dead_drop_status read (public):
   (1) a riddle card injected into the Morning Briefing (#xBrief), and
   (2) a tappable DEAD DROP cache widget that renders ONLY on today's hidden
   page — the page comes from the server, never hardcoded client-side.
   The claim (POST {type:'deaddrop', dd_action:'drop_find'}) validates
   server-side that the page is today's page; wrong page = clean rejection.
   Cheat-proofing lives in src/deaddrop.js; this file is presentation only.
   LAYERING: core silo — ships in bundle-core(.slr) on every page, like
   20-nextop.js. No page dependency.
   KILL: ?pf_off=deaddrop  or  localStorage pf_disabled_v1='["deaddrop"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('deaddrop')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* Friendly copy for claim failures (2026-10-05): raw backend strings
     like 'missing credentials' are never shown as UI copy. Mirrors the
     pattern in games/war-report.js, games/poster-forge.js, games/reserve.js. */
  function ddErrCopy(e) {
    e = String(e || '');
    if (e.indexOf('claim unavailable') !== -1 || e === 'legacy_callsign')
      return 'Could not reach Command. This callsign predates the new auth system and can\'t reconnect on its own — contact MTCSTW to recover it.';
    if (e === 'missing credentials' || e === 'unauthorized' ||
        e === 'bad callsign' || e.indexOf('missing credentials') !== -1)
      return 'The cache needs a callsign to crack. Claim yours in Enlistment Ranks (one tap), then crack it open.';
    return 'The cache jammed. Try again.';
  }
  /* JSONP GET for the public status read. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfDdCb' + Math.floor(Math.random() * 1e9);
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
    setTimeout(function () { finish(null); }, 12000);
  }
  /* CORS POST for the claim (auth-gated server-side). */
  function claimPost(id, page, cb) {
    var body = { type: 'deaddrop', dd_action: 'drop_find',
      callsign: id.callsign, device: id.device, page: page };
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e) { done(null); }
  }

  /* ---- self-contained styles (no dependency on dopamine CSS) ---- */
  var CSS = '.dd-card{border:2px solid #c1121f;background:#0d0d0f;color:#f2f2f2;' +
    'border-radius:10px;padding:16px 18px;margin:14px 0;position:relative;overflow:hidden}' +
    '.dd-kicker{font:700 11px/1.4 monospace;letter-spacing:.18em;color:#c1121f;margin-bottom:6px}' +
    '.dd-riddle{font:700 17px/1.45 Georgia,serif;font-style:italic;margin:6px 0 10px}' +
    '.dd-meta{font:12px/1.6 monospace;color:#bdbdbd}' +
    '.dd-meta b{color:#ffd166}' +
    '.dd-cache{display:flex;gap:14px;align-items:center}' +
    '.dd-box{font-size:44px;line-height:1;filter:drop-shadow(0 0 12px rgba(193,18,31,.55));' +
    'transition:transform .25s}' +
    '.dd-box.dd-shake{animation:ddshake .5s}' +
    '@keyframes ddshake{0%,100%{transform:translateX(0) rotate(0)}' +
    '25%{transform:translateX(-7px) rotate(-8deg)}50%{transform:translateX(6px) rotate(6deg)}' +
    '75%{transform:translateX(-4px) rotate(-4deg)}}' +
    '.dd-box.dd-burst{animation:ddburst .6s forwards}' +
    '@keyframes ddburst{0%{transform:scale(1)}40%{transform:scale(1.35) rotate(10deg)}' +
    '100%{transform:scale(1.1)}}' +
    '.dd-cta{margin-top:12px}' +
    '.dd-reward{text-align:center;padding:8px 0 2px}' +
    '.dd-rxp{font:800 34px/1.2 monospace;color:#ffd166}' +
    '.dd-rsub{font:12px/1.6 monospace;color:#bdbdbd;margin-top:4px}' +
    '.dd-err{font:12px/1.5 monospace;color:#ff6b6b;margin-top:8px}';
  function injectCss() {
    if (document.getElementById('pf-dd-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-dd-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---- (1) briefing riddle card ---- */
  function briefingCardHtml(st) {
    var h = '<section class="br-sec" data-game="dead-drop" id="pf-deaddrop-card">' +
      '<div class="dd-card"><div class="dd-kicker">\u25C8 DEAD DROP</div>';
    h += '<div class="dd-riddle">&ldquo;' + esc(st.riddle || 'The briefing is assembling&hellip;') + '&rdquo;</div>';
    if (st.found_today) {
      h += '<div class="dd-meta">Cache cracked. Streak: <b>' + Number(st.streak || 0) +
        '</b> day' + (Number(st.streak) === 1 ? '' : 's') +
        '. New cache drops at midnight.</div>';
    } else {
      h += '<div class="dd-meta">Somewhere on this site a cache waits. Find it before midnight.' +
        ' Pays <b>+' + Number(st.next_payout || 15) + ' XP</b>' +
        (st.streak > 0 ? ' &middot; streak <b>' + Number(st.streak) + '</b>' : '') + '.</div>';
    }
    h += '</div></section>';
    return h;
  }
  function injectBriefingCard(st) {
    if (document.getElementById('pf-deaddrop-card')) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var host = document.getElementById('xBrief');
      /* The briefing renders .br-sec sections; inject after it assembles. */
      if (host && (host.querySelector('.br-sec') || tries > 40)) {
        clearInterval(iv);
        if (document.getElementById('pf-deaddrop-card')) return;
        try {
          var first = host.querySelector('.br-sec');
          if (first) first.insertAdjacentHTML('beforebegin', briefingCardHtml(st));
          else host.insertAdjacentHTML('beforeend', briefingCardHtml(st));
        } catch (e) {}
      }
      if (tries > 60) clearInterval(iv);
    }, 500);
  }

  /* ---- (2) cache widget on today's hidden page ---- */
  var FOOT_SELS = ['footer', '.Footer', '#footer', '#footer-sections', '.Footer-inner',
    '.Footer-blocks', '[role="contentinfo"]', '.site-footer', '#site-footer',
    'section[class*="footer"]', 'section[class*="Footer"]',
    'div[class*="Footer"]', '[data-section-id*="footer" i]'];
  function findFooter() {
    for (var i = 0; i < FOOT_SELS.length; i++) {
      try {
        var el = document.querySelector(FOOT_SELS[i]);
        if (el) return el;
      } catch (e) {}
    }
    return null;
  }
  function widgetHtml(st, id) {
    var h = '<div class="dd-card" id="pf-deaddrop"><div class="dd-kicker">\u25C8 DEAD DROP</div>' +
      '<div class="dd-cache"><div class="dd-box" id="pf-dd-box">\uD83D\uDCE6</div><div>' +
      '<div class="dd-riddle" style="margin:0">&ldquo;' + esc(st.riddle) + '&rdquo;</div>' +
      '<div class="dd-meta">You followed the riddle. The cache is real.</div>' +
      '</div></div>';
    if (st.found_today) {
      h += '<div class="dd-meta" style="margin-top:10px">Already cracked today. Streak: <b>' +
        Number(st.streak || 0) + '</b>. New cache at midnight.</div>';
    } else if (!id.callsign) {
      h += '<div class="dd-meta" style="margin-top:10px">Claim a callsign in Enlistment Ranks to crack it open ' +
        'for <b>+' + Number(st.next_payout || 15) + ' XP</b>.</div>' +
        /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
        (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })();
    } else {
      h += '<div class="dd-meta" style="margin-top:10px">Pays <b>+' + Number(st.next_payout || 15) +
        ' XP</b>' + (st.streak > 0 ? ' &middot; streak <b>' + Number(st.streak) + '</b>' : '') +
        '. Gone at midnight.</div>' +
        '<div class="dd-cta"><button class="c-btn" id="pf-dd-claim">CRACK IT OPEN</button>' +
        '<div class="dd-err" id="pf-dd-err"></div></div>';
    }
    h += '</div>';
    return h;
  }
  function placeWidget(html) {
    if (document.getElementById('pf-deaddrop')) return true;
    var f = findFooter();
    var host = document.createElement('div');
    host.innerHTML = html;
    var node = host.firstChild;
    if (f && f.parentNode) { f.parentNode.insertBefore(node, f); return true; }
    return false;
  }
  function mountWidget(st, id) {
    var html = widgetHtml(st, id);
    function wire() {
      var btn = document.getElementById('pf-dd-claim');
      if (!btn) return;
      btn.onclick = function () {
        var err = document.getElementById('pf-dd-err');
        var box = document.getElementById('pf-dd-box');
        btn.disabled = true; btn.textContent = 'CRACKING IT OPEN...';
        if (box) { box.classList.remove('dd-burst'); box.classList.add('dd-shake'); }
        claimPost(id, st.page, function (j) {
          if (box) box.classList.remove('dd-shake');
          if (j && j.ok) {
            var card = document.getElementById('pf-deaddrop');
            if (box) box.classList.add('dd-burst');
            var xp = Number(j.xp || 0), streak = Number(j.streak || 0);
            if (card) {
              card.innerHTML = '<div class="dd-kicker">\u25C8 DEAD DROP \u2014 CRACKED</div>' +
                '<div class="dd-reward"><div class="dd-rxp">+' + xp + ' XP</div>' +
                '<div class="dd-rsub">Cache secured. Streak: <b>' + streak + '</b> day' +
                (streak === 1 ? '' : 's') + '.' +
                (j.already ? ' (already claimed)' : '') +
                '<br>New cache drops at midnight. Read the briefing.</div></div>';
            }
            try {
              if (window.PF && PF.dope) {
                PF.dope.confetti(document.getElementById('pf-deaddrop'), 40);
                PF.dope.xpFloat(document.getElementById('pf-deaddrop'), '+' + xp + ' XP');
              }
            } catch (e) {}
            try { document.dispatchEvent(new CustomEvent('pf-combo-hit')); } catch (e2) {}
            toast(j.already ? 'Cache already cracked. +' + xp + ' XP banked.' : '+' + xp + ' XP. The machine provides.');
          } else {
            btn.disabled = false; btn.textContent = 'CRACK IT OPEN';
            var msg = (j && j.err === 'not here') ? 'Cold trail. The cache moved on.'
              : ddErrCopy(j && (j.err || j.error));
            if (err) err.textContent = msg;
          }
        });
      };
    }
    if (placeWidget(html)) { wire(); return; }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (placeWidget(html) || tries >= 120) { clearInterval(iv); wire(); }
    }, 500);
  }

  /* ---- boot ---- */
  function boot() {
    injectCss();
    var id = ident();
    var path = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    api('dead_drop_status', { device: id.device }, function (st) {
      if (!st || !st.ok) return;
      injectBriefingCard(st);
      /* Widget renders ONLY on today's hidden page (server-supplied). */
      if (path === String(st.page || '')) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () { mountWidget(st, id); });
        } else mountWidget(st, id);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
