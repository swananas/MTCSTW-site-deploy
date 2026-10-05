/* core/22-routemarch.js  |  PF v1.4.3 | ROUTE MARCH (S1) — daily guided-circuit strip.
   Each stop page of today's route shows a "STOP n OF 4" progress strip with
   which stops are done; the final stop carries the claim button for the
   escalating consecutive-day bonus (day 1: 10 XP -> day 7: 75 XP).
   Reads circuit_status (auth-gated per-callsign GET), writes via
   {type:'circuit', c_action:'circuit_claim'} through PF.authPost.
   Lightweight: one JSONP read per page load, no polling — completing the
   page's action auto-verifies server-side (existing action logs), and the
   strip reflects it on the next page load.
   Mount: in-flow immediately BEFORE the site footer element, same pattern as
   core/20-nextop.js (retries until the footer lands). Renders ONLY when the
   current path is one of today's 4 route stops.
   KILL: ?pf_off=routemarch  or  localStorage pf_disabled_v1='["routemarch"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('routemarch')) { return; }
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

  /* JSONP GET for reads. circuit_status is a gated per-callsign read —
     route through PF.authGetJSONP when present (claim-retry self-heal),
     plain JSONP fallback. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
      if (_sec && params && !params.auth_secret) params.auth_secret = _sec;
    } catch (e2) {}
    var fn = 'pfRmCb' + Math.floor(Math.random() * 1e9);
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

  function normPath() {
    var p = '/';
    try { p = window.location.pathname || '/'; } catch (e) {}
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
    return p.toLowerCase();
  }

  function rmCss() {
    if (document.getElementById('pf-rm-css')) return;
    var s = document.createElement('style');
    s.id = 'pf-rm-css';
    s.textContent =
      '#pf-routemarch{max-width:1100px;margin:18px auto;padding:14px 16px;border:2px solid #c1121f;background:#0d0d0d;font-family:monospace}'
      + '#pf-routemarch .pf-rm-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}'
      + '#pf-routemarch .pf-rm-title{font:bold 14px monospace;color:#fff;letter-spacing:2px}'
      + '#pf-routemarch .pf-rm-title b{color:#ff6b6b}'
      + '#pf-routemarch .pf-rm-day{font:bold 11px monospace;color:#e8b64c;letter-spacing:1px;white-space:nowrap}'
      + '#pf-routemarch .pf-rm-stops{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}'
      + '#pf-routemarch .pf-rm-stop{flex:1 1 120px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #444;background:#141414;color:#bbb;text-decoration:none;font:12px monospace}'
      + '#pf-routemarch .pf-rm-stop.done{border-color:#2f7a3d;color:#7ddf8a}'
      + '#pf-routemarch .pf-rm-stop.cur{border-color:#c1121f;color:#fff;background:#1a0505}'
      + '#pf-routemarch .pf-rm-dot{font-weight:bold}'
      + '#pf-routemarch .pf-rm-name{font:bold 11px monospace;color:#ff6b6b;letter-spacing:1px;margin-bottom:6px}'
      + '#pf-routemarch .pf-rm-claim{margin-top:10px;text-align:center}'
      + '#pf-routemarch .pf-rm-note{margin-top:8px;font:12px monospace;color:#888;text-align:center}'
      + '#pf-routemarch .c-btn{background:#c1121f;color:#fff;border:0;font:bold 14px monospace;letter-spacing:1px;padding:12px 26px;cursor:pointer}'
      + '#pf-routemarch .c-btn:disabled{opacity:.55;cursor:default}';
    document.head.appendChild(s);
  }

  var FOOTER_SELS = [
    'footer', '.Footer', '#footer', '#footer-sections', '.Footer-inner',
    '.Footer-blocks', '[role="contentinfo"]', '.site-footer', '#site-footer',
    'section[class*="footer"]', 'section[class*="Footer"]',
    'div[class*="Footer"]'
  ];
  function findFooter() {
    for (var i = 0; i < FOOTER_SELS.length; i++) {
      var sel = FOOTER_SELS[i], els = null;
      try { els = document.querySelectorAll(sel); } catch (e) { continue; }
      if (els && els.length) return els[0];
    }
    return null;
  }

  function build(j, stopIdx) {
    rmCss();
    var stops = j.stops;
    var sd = Number(j.streak_day || 1);
    var el = document.createElement('div');
    el.id = 'pf-routemarch';
    var h = '<div class="pf-rm-name">' + esc(String(j.route_name || 'ROUTE MARCH')) + '</div>'
      + '<div class="pf-rm-bar"><span class="pf-rm-title">⚔ STOP <b>' + (stopIdx + 1) + '</b> OF ' + stops.length + '</span>'
      + '<span class="pf-rm-day">DAY ' + sd + ' &bull; NEXT +' + Number(j.next_payout || 10) + ' XP</span></div>'
      + '<div class="pf-rm-stops">';
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      var cls = 'pf-rm-stop' + (s.done ? ' done' : '') + (i === stopIdx ? ' cur' : '');
      h += '<a class="' + cls + '" href="' + esc(s.page || '/') + '">'
        + '<span class="pf-rm-dot">' + (s.done ? '✓' : (i + 1)) + '</span>'
        + '<span>' + esc(s.action_label || '') + '</span></a>';
    }
    h += '</div>';
    var isFinal = (stopIdx === stops.length - 1);
    if (j.claimed) {
      h += '<div class="pf-rm-note">✓ MARCH COMPLETE — DAY ' + sd + ' &bull; +' + Number(j.payout || 0)
        + ' XP claimed. Miss a day and the streak resets.</div>';
    } else if (isFinal && j.can_claim) {
      h += '<div class="pf-rm-claim"><button class="c-btn" id="pf-rm-claimbtn">CLAIM +'
        + Number(j.next_payout || 10) + ' XP — DAY ' + sd + '</button></div>';
    } else {
      h += '<div class="pf-rm-note">' + Number(j.completed || 0) + ' of ' + stops.length
        + ' stops done. Finish the march to claim +' + Number(j.next_payout || 10) + ' XP.</div>';
    }
    el.innerHTML = h;
    /* claim wiring */
    try {
      var btn = el.querySelector('#pf-rm-claimbtn');
      if (btn) {
        btn.onclick = function () {
          btn.disabled = true; btn.textContent = 'CLAIMING...';
          var id = ident();
          var body = { type: 'circuit', c_action: 'circuit_claim',
            callsign: id.callsign, device: id.device };
          function done2(r) {
            if (r && r.ok) {
              el.innerHTML = '<div class="pf-rm-note" style="color:#7ddf8a;font-weight:bold">✓ ROUTE MARCH COMPLETE. +'
                + Number(r.payout || 0) + ' XP — DAY ' + Number(r.streak_day || 1)
                + '. Tomorrow pays +' + Number(r.next_payout || 0) + ' XP.</div>';
              try { if (window.PF && PF.toast) PF.toast('ROUTE MARCH COMPLETE. +' + Number(r.payout || 0) + ' XP.'); } catch (e) {}
            } else {
              var msg = 'Claim failed.';
              try { msg = (window.PF && PF.errCopy) ? PF.errCopy(r, msg) : String((r && (r.err || r.error)) || msg); } catch (e2) {}
              try { if (window.PF && PF.toast) PF.toast(msg); } catch (e3) {}
              btn.disabled = false; btn.textContent = 'CLAIM BONUS';
            }
          }
          try {
            if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, done2); }
            else { done2({ ok: false, err: 'auth unavailable' }); }
          } catch (e) { done2({ ok: false, err: 'network error' }); }
        };
      }
    } catch (e) {}
    return el;
  }

  function tryMount(j, stopIdx) {
    if (document.getElementById('pf-routemarch')) return true;
    var footer = findFooter();
    if (!footer || !footer.parentNode) return false;
    var card = build(j, stopIdx);
    try { footer.parentNode.insertBefore(card, footer); } catch (e) { return false; }
    return true;
  }

  function boot() {
    var id = ident();
    if (!id.callsign) return; /* progress is per-callsign; briefing card covers anonymous */
    api('circuit_status', { callsign: id.callsign, device: id.device }, function (j) {
      if (!j || !j.ok || !j.stops || !j.stops.length) return;
      var cur = normPath(), stopIdx = -1;
      for (var i = 0; i < j.stops.length; i++) {
        if (String(j.stops[i].page || '/').toLowerCase() === cur) { stopIdx = i; break; }
      }
      if (stopIdx < 0) return; /* not a stop page — stay out of the way */
      var tries = 0;
      (function retry() {
        if (tryMount(j, stopIdx)) return;
        tries++;
        if (tries < 40) setTimeout(retry, 500);
      })();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
