/* games/nuke-themes.js | PF v1.4.3 | Nuke detonation theme banner
   (fe/nuke-political-themes, 2026-10-05).
   When the legislation tracker has a REAL scheduled floor vote today, the
   Media Nuke's daily theme becomes that bill: this silo mounts a banner at
   the top of the Do Meter's #slr-nuke block with the headline, 2-3 key
   facts, and two CTAs — "DETONATE ON THIS" (primary: scrolls to and
   highlights the REAL nuke press button in the same block, so the
   existing press payoff fires untouched) and "FORGE THIS" (secondary:
   Forge deep-link via the pf-forge-launch contract below). Every button
   lands somewhere real; no dead ends.
   Themed payoff: when the strip reports pressed=true while the theme is
   active, the banner shows the themed confirmation line (display only —
   reuses the strip's pressed record; no new XP, no new visuals invented).
   HONESTY: the backend (nuke_theme_get) only goes ACTIVE on a real
   scheduled date in tracker data — the banner renders ONLY on
   {active:true}. On {active:false} (or any fetch failure) NOTHING
   renders: zero visual change on non-political days.
   Read-only, fail-soft, once/day cache (pf_nuke_theme_v1 keyed by Chicago
   day). No XP — this silo never calls xpGrant or any POST.
   KILL: ?pf_off=nuke-themes  or  localStorage pf_disabled_v1='["nuke-themes"]'
   (also respects the do-meter kill-switch: no #slr-nuke, no banner). */

/* pf-forge-launch CONTRACT (defined here for the Forge owner):
   The FORGE THIS button dispatches a CANCELABLE event:
     var ev = new CustomEvent("pf-forge-launch", {detail:{
       tab:"political", bill_id:"HR-22", bill_number:"H.R. 22",
       bill_title:"...", key_facts:["..."], source:"nuke-theme"},
       cancelable:true});
     var handled = !document.dispatchEvent(ev); // true when the Forge
     // pre-loaded the bill (it calls ev.preventDefault() to say so)
   and scrolls #pf-poster (the Poster Forge block) into view. The Forge
   adopts this by listening for the event, pre-loading the POLITICAL tab
   with the bill, and calling preventDefault(). Until then the button only
   scrolls — it NEVER claims a pre-load that didn't happen.
   forge_link (backend field, URL-param fallback) is used only when the
   Forge block isn't on the page. */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('nuke-themes') || PF.skip('do-meter')) { return; }

  var SILO = 'nuke-themes';
  var LS = 'pf_nuke_theme_v1';
  var CSS_ID = 'pf-nuke-theme-css';
  var BANNER_ID = 'pf-nuke-theme';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function chiDay() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function log(msg) { try { PF.log(SILO, msg); } catch (e) {} }

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(LS) || 'null');
      if (c && c.day === chiDay() && c.payload) return c.payload;
    } catch (e) {}
    return null;
  }
  function writeCache(payload) {
    try { localStorage.setItem(LS, JSON.stringify({ day: chiDay(), payload: payload })); }
    catch (e) {}
  }

  /* Read-only JSONP GET of ?action=nuke_theme_get. Fail-soft: any error,
     timeout, or malformed payload -> cb(null) -> no banner. */
  function fetchTheme(cb) {
    var done = false, burl = '';
    try { burl = window.PF_BACKEND_URL; } catch (e) {}
    function fin(d) { if (done) return; done = true; try { cb(d); } catch (e) {} }
    if (!burl) { fin(null); return; }
    try {
      var cbn = 'pfNukeThemeCb' + Date.now();
      var sc = document.createElement('script');
      function cleanup() {
        try { delete window[cbn]; } catch (e) {}
        try { if (sc.parentNode) sc.parentNode.removeChild(sc); } catch (e2) {}
      }
      window[cbn] = function (d) {
        cleanup();
        fin(d && d.ok ? d : null);
      };
      sc.async = true;
      sc.src = burl + '?action=nuke_theme_get&callback=' + cbn;
      sc.onerror = function () { cleanup(); fin(null); };
      document.head.appendChild(sc);
      /* 12s backstop — a hung request must not freeze anything. */
      setTimeout(function () { if (window[cbn]) { cleanup(); fin(null); } }, 12000);
    } catch (e) { fin(null); }
  }

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var css = '#' + BANNER_ID + '{background:#1c0d0d;border:2px solid #c1121f;' +
      'margin:0 0 14px;padding:12px 14px;text-align:left;font-family:Arial,sans-serif}' +
      '#' + BANNER_ID + ' .pnt-kicker{font:bold 11px monospace;letter-spacing:2px;' +
      'color:#e8b923;margin-bottom:6px}' +
      '#' + BANNER_ID + ' .pnt-head{font:900 17px \'Arial Black\',Arial,sans-serif;' +
      'color:#fff;letter-spacing:.5px;margin-bottom:8px;line-height:1.3}' +
      '#' + BANNER_ID + ' .pnt-head .pnt-num{color:#ff5a5a}' +
      '#' + BANNER_ID + ' .pnt-facts{margin:0 0 10px 18px;padding:0;color:#f5ead6;' +
      'font-size:13px;line-height:1.55}' +
      '#' + BANNER_ID + ' .pnt-row{display:flex;gap:10px;align-items:center;' +
      'flex-wrap:wrap;margin-bottom:8px}' +
      '#' + BANNER_ID + ' .pnt-detonate{background:#c1121f;color:#fff;border:0;' +
      'font:700 13px Arial,sans-serif;letter-spacing:2px;padding:10px 18px;' +
      'cursor:pointer;text-transform:uppercase}' +
      '#' + BANNER_ID + ' .pnt-detonate:hover{background:#e01420}' +
      '#' + BANNER_ID + ' .pnt-forge{background:transparent;color:#ffe9a8;' +
      'border:2px solid #e8b923;font:700 12px Arial,sans-serif;letter-spacing:2px;' +
      'padding:8px 14px;cursor:pointer;text-transform:uppercase}' +
      '#' + BANNER_ID + ' .pnt-forge:hover{background:rgba(232,185,35,.15)}' +
      '#' + BANNER_ID + ' .pnt-src{font:11px monospace;color:#8a8172;' +
      'letter-spacing:1px;text-decoration:underline}' +
      '#' + BANNER_ID + ' .pnt-honest{font-size:11px;color:#8a8172;font-style:italic;' +
      'line-height:1.5}' +
      '#' + BANNER_ID + ' .pnt-confirm{display:none;margin-top:8px;padding:8px 10px;' +
      'background:#1a4d1a;border:1px solid #7CFC00;color:#eaffea;' +
      'font:bold 12px Arial,sans-serif;letter-spacing:1px}' +
      /* DETONATE ON THIS target highlight: the real press button pulses so
         the user lands on the nuke action itself. Removed after 4s. */
      '#slr-nuke .slr-nuke-btn.pnt-target{outline:3px solid #e8b923;' +
      'outline-offset:3px;animation:pntpulse 1s infinite}' +
      '@keyframes pntpulse{0%,100%{box-shadow:0 0 0 0 rgba(232,185,35,.7)}' +
      '50%{box-shadow:0 0 16px 4px rgba(232,185,35,.9)}}' +
      '@media (prefers-reduced-motion:reduce)' +
      '{#slr-nuke .slr-nuke-btn.pnt-target{animation:none}}';
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  function renderBanner(nuke, theme) {
    if (document.getElementById(BANNER_ID)) return; /* idempotent */
    var bill = theme.bill || {};
    injectCss();
    var facts = (bill.key_facts || []).slice(0, 3).map(function (f) {
      return '<li>' + esc(f) + '</li>';
    }).join('');
    var html = '<div id="' + BANNER_ID + '">' +
      '<div class="pnt-kicker">&#127919; TODAY&rsquo;S TARGET</div>' +
      '<div class="pnt-head"><span class="pnt-num">' + esc(bill.number || bill.id || 'A bill') +
      '</span> &mdash; floor vote today</div>' +
      (facts ? '<ul class="pnt-facts">' + facts + '</ul>' : '') +
      '<div class="pnt-row">' +
      '<button type="button" class="pnt-detonate" id="pnt-detonate">&#9889; Detonate on this</button>' +
      '<button type="button" class="pnt-forge" id="pnt-forge">&#9874; Forge this</button>' +
      (bill.url ? '<a class="pnt-src" href="' + esc(bill.url) +
        '" target="_blank" rel="noopener">congress.gov &#8599;</a>' : '') +
      '</div>' +
      '<div class="pnt-confirm" id="pnt-confirm"></div>' +
      '<div class="pnt-honest">Target set from the legislation tracker&rsquo;s ' +
      'verified floor-vote schedule &mdash; never invented. ' +
      (bill.title ? 'Full title: ' + esc(bill.title) + '.' : '') + '</div>' +
      '</div>';
    nuke.insertAdjacentHTML('afterbegin', html);
    var det = document.getElementById('pnt-detonate');
    if (det) det.addEventListener('click', function () { detonateOnThis(theme); });
    var btn = document.getElementById('pnt-forge');
    if (btn) btn.addEventListener('click', function () { forgeThis(theme); });
    armThemedConfirmation(theme);
    log('theme active: ' + (bill.id || '?'));
  }

  /* DETONATE ON THIS (primary CTA): lands the user on the REAL nuke press
     action inside this same #slr-nuke block — smooth-scrolls the press
     button into view, pulses it, focuses it. The user then taps the actual
     press button, so the existing payoff fires untouched: +50 charge,
     PF.dope.ping("+50 CHARGE — THE BLAST GROWS"), the CHARGED ✓ + streak
     button state, the "Your press landed" line, the charge-bar fill and
     tier milestones, and the pf-nuke-update event. No new XP, no new
     visuals invented here — the theme just aims the existing blast.
     The button never auto-presses: the user's tap on the real button is
     the consent. */
  function detonateOnThis(theme) {
    var nuke = null;
    try { nuke = document.getElementById('slr-nuke'); } catch (e) {}
    function pressBtn() {
      try {
        var pw = document.getElementById('slr-nuke-press');
        return pw ? pw.querySelector('[data-nuke-press="1"]') : null;
      } catch (e2) { return null; }
    }
    function go(b) {
      if (b) {
        try { b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) { try { b.scrollIntoView(); } catch (e2) {} }
        try { b.classList.add('pnt-target'); } catch (e3) {}
        setTimeout(function () {
          try { b.classList.remove('pnt-target'); } catch (e4) {}
        }, 4000);
        try { b.focus({ preventScroll: true }); }
        catch (e5) { try { b.focus(); } catch (e6) {} }
      } else if (nuke) {
        try { nuke.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch (e7) { try { nuke.scrollIntoView(); } catch (e8) {} }
      }
    }
    var b0 = pressBtn();
    if (b0) { go(b0); return; }
    /* Press button not painted yet — brief poll, then fall back to the
       block itself. Every path lands somewhere real. */
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var b2 = pressBtn();
      if (b2 || tries >= 10) { clearInterval(iv); go(b2); }
    }, 300);
  }

  /* Themed detonation confirmation: when the strip reports pressed=true
     (pf-nuke-update) while the theme is active, the banner shows the
     themed confirmation line. Pure display — reuses the strip's pressed
     record (pf_nuke_press_v1, same Chicago-day key); no XP, no writes
     beyond the once/day shown-flag. */
  function armThemedConfirmation(theme) {
    var bill = theme.bill || {};
    var KEY = 'pf_nuke_theme_pressed_v1';
    function shownToday() {
      try {
        var s = JSON.parse(localStorage.getItem(KEY) || 'null');
        return !!(s && s.day === chiDay() && s.bill === bill.id);
      } catch (e) { return false; }
    }
    function stripPressedToday() {
      try {
        var s = JSON.parse(localStorage.getItem('pf_nuke_press_v1') || 'null');
        return !!(s && s.d === chiDay() && s.pressed);
      } catch (e) { return false; }
    }
    function show() {
      var el = document.getElementById('pnt-confirm');
      if (!el) return;
      el.textContent = '\u26A1 CHARGE COMMITTED \u2014 your +50 is aimed at ' +
        (bill.number || bill.id || 'today\u2019s target') + ' today.';
      el.style.display = 'block';
      try { localStorage.setItem(KEY, JSON.stringify({ day: chiDay(), bill: bill.id })); }
      catch (e) {}
    }
    if (shownToday() || stripPressedToday()) { show(); return; }
    function h(ev) {
      var d = ev && ev.detail;
      if (d && d.pressed === true) {
        show();
        try { document.removeEventListener('pf-nuke-update', h); } catch (e) {}
      }
    }
    try { document.addEventListener('pf-nuke-update', h); } catch (e) {}
  }

  function forgeThis(theme) {
    var bill = theme.bill || {};
    var detail = {
      tab: 'political',
      bill_id: bill.id || '',
      bill_number: bill.number || '',
      bill_title: bill.title || '',
      key_facts: bill.key_facts || [],
      source: 'nuke-theme'
    };
    var handled = false;
    try {
      var ev = new CustomEvent('pf-forge-launch', { detail: detail, cancelable: true });
      handled = !document.dispatchEvent(ev); /* Forge preventDefault()s when it pre-loads */
    } catch (e) {}
    if (handled) {
      /* The Forge pre-loaded the bill — honest confirmation only because
         the Forge said so (copy draft in LOOP_COPY.md, Psych PENDING). */
      try {
        if (window.PF && PF.toast) {
          PF.toast((bill.number || 'Bill') + ' loaded in the POLITICAL tab \u2014 make it loud.');
        }
      } catch (e2) {}
    }
    var forge = null;
    try { forge = document.getElementById('pf-poster'); } catch (e3) {}
    if (forge) {
      try { forge.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e4) { try { forge.scrollIntoView(); } catch (e5) {} }
    } else if (theme.forge_link) {
      /* Forge block not on this page — URL-param fallback. */
      try { window.location.href = theme.forge_link; } catch (e6) {}
    }
  }

  function boot(nuke) {
    var cached = readCache();
    if (cached) {
      if (cached.active) renderBanner(nuke, cached);
      return; /* once/day granularity — no refetch */
    }
    fetchTheme(function (theme) {
      if (!theme) return; /* fail-soft: no banner */
      writeCache(theme);
      if (theme.active) renderBanner(nuke, theme);
      /* active:false -> zero visual change */
    });
  }

  /* Mount: the banner lives inside do-meter's #slr-nuke block. Fast path
     when it's already mounted, otherwise a bounded poll (15s) — the
     do-meter kill-switch means #slr-nuke never appears and we stay silent. */
  function tryMount() {
    var nuke = null;
    try { nuke = document.getElementById('slr-nuke'); } catch (e) {}
    if (nuke) { boot(nuke); return true; }
    return false;
  }
  if (!tryMount()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (tryMount() || tries >= 30) clearInterval(iv);
    }, 500);
  }
})();
