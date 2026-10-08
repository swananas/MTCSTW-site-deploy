/* core/16-footer.js  |  PF v1.4.3 | FOOTER DATA-RIGHTS LINK.
   Injects a "DELETE MY DATA" link into the site's footer element on every
   page. Click opens a confirmation dialog; confirm calls the backend
   privacy_erase endpoint for the full scope (callsign + device), wipes all
   site localStorage keys, then shows a success state.
   Works for logged-out visitors too (device-only erase).
   LAYERING: core-level UI injection, same pattern as the storage notice in
   core/03-global.js. No page dependency — runs on every page.
   KILL: ?pf_off=16-footer */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('16-footer')) { return; }
  var BACKEND = window.PF_BACKEND_URL;

  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) {
    try { if (PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { try { t.remove(); } catch (e2) {} }, 2800);
    } catch (e3) {}
  }
  function post(body, cb) {
    if (PF.authPost && BACKEND) { PF.authPost(BACKEND, body, cb); return; }
    /* Fallback: plain CORS POST (no auth self-heal). */
    try {
      fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) { cb(j || { ok: false, err: 'Network error.' }); })
        .catch(function () { cb(null); });
    } catch (e) { cb(null); }
  }

  /* ---- footer injection ---- */
  /* Store/product/privacy/terms pages render footers late and/or under
     different markup (Squarespace commerce + system pages), so the selector
     list is deliberately broad. */
  var FOOTER_SEL_ARR = [
    'footer',
    '.Footer',
    '#footer',
    '#footer-sections',
    '.Footer-inner',
    '.Footer-blocks',
    '.Footer-nav',
    '[role="contentinfo"]',
    '.site-footer',
    '#site-footer',
    '.footer-inner',
    'section[class*="footer"]',
    'section[class*="Footer"]',
    'div[class*="Footer"]',
    '[data-section-id*="footer" i]',
    'section[data-section-theme] footer',
    'section[data-section-theme][class*="footer" i]',
    'div[data-section-theme][class*="footer" i]'
  ];
  /* One bad selector in a comma list makes querySelectorAll throw and kills
     the whole lookup, so validate each selector once and keep only the
     ones this browser accepts (guards against Selectors-4 `i`-flag or
     quirks in older engines). */
  var FOOTER_SELS = FOOTER_SEL_ARR.filter(function (sel) {
    try { document.querySelectorAll(sel); return true; } catch (e) { return false; }
  }).join(', ');
  function findFooter() {
    var footers;
    try { footers = document.querySelectorAll(FOOTER_SELS); } catch (e) { return null; }
    if (footers && footers.length) return footers[0];
    return null;
  }
  /* DEFECT 1b (2026-10-04): the crossnav strip (19-crossnav, same bundle)
     prepends its own <nav class="pf-xn-nav"> as the footer's first child. A
     plain footer.querySelector('nav, ...') would match it first, dropping
     the DELETE MY DATA link into the "THE FRONT LINES" page-nav instead of
     next to the site's own footer links — on /store the late commerce
     footer re-render makes that the common outcome. The data-rights link
     must never live inside our injected strip, so skip any nav under
     #pf-crossnav here. */
  function footerNav(footer) {
    var navs = null;
    try { navs = footer.querySelectorAll('nav, .footer-nav, .Footer-nav, [class*="nav"]'); } catch (e) { return null; }
    for (var i = 0; i < navs.length; i++) {
      var p = navs[i], inside = false;
      try {
        while (p && p !== footer) {
          if (p.id === 'pf-crossnav') { inside = true; break; }
          p = p.parentNode;
        }
      } catch (e2) {}
      if (!inside) return navs[i];
    }
    return null;
  }
  var LINK_STYLE = 'color:#e5383b;font-weight:900;letter-spacing:0.12em;font-size:11px;text-decoration:underline;cursor:pointer;margin-left:14px;white-space:nowrap;';
  function makeLink() {
    var a = document.createElement('a');
    a.id = 'pf-delete-data-link';
    a.href = '#';
    a.textContent = 'DELETE MY DATA';
    a.setAttribute('aria-label', 'Delete my data');
    a.style.cssText = LINK_STYLE;
    a.addEventListener('click', function (e) { e.preventDefault(); openDialog(); });
    return a;
  }
  function injectLink() {
    if (done()) return;
    var footer = findFooter();
    if (!footer) return;
    var a = makeLink();
    /* Append at the end of the footer content, next to the other footer links. */
    var nav = footerNav(footer);
    if (nav) nav.appendChild(a); else footer.appendChild(a);
  }

  /* ---- confirmation dialog ---- */
  var dialogOpen = false;
  function openDialog() {
    if (dialogOpen) return;
    dialogOpen = true;
    var id = ident();
    var ov = document.createElement('div');
    ov.id = 'pf-delete-data-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    var box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.style.cssText = 'background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;max-width:520px;width:100%;padding:28px;font-family:"Helvetica Neue",Arial,sans-serif;line-height:1.6;box-sizing:border-box;';
    box.innerHTML =
      '<div style="color:#e5383b;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">BURN YOUR RECORD</div>' +
      '<p style="font-size:13px;margin:0 0 12px;">This wipes <b>everything</b> the Propaganda Factory holds on you' +
      (id.callsign ? ' under callsign <b>' + esc(id.callsign) + '</b>' : ' on this browser') +
      ': your XP, streaks, medals, votes, cells, referrals, contact info' +
      (id.callsign ? ', and the callsign itself' : '') +
      '. Your real-money War Bond purchases stay in our books (the law makes us keep those) but your name comes off them.</p>' +
      '<p style="font-size:13px;margin:0 0 18px;color:#b8ab8e;">This cannot be undone. There is no appeal, no undelete, no "oops".</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
      '<button id="pfDeleteConfirm" style="background:#c1121f;color:#fff;border:none;font-weight:900;letter-spacing:0.1em;font-size:12px;padding:12px 20px;cursor:pointer;font-family:inherit;">YES, ERASE IT ALL</button>' +
      '<button id="pfDeleteCancel" style="background:transparent;color:#f5f0e1;border:2px solid #f5f0e1;font-weight:900;letter-spacing:0.1em;font-size:12px;padding:10px 18px;cursor:pointer;font-family:inherit;">CANCEL</button>' +
      '</div>' +
      '<div id="pfDeleteMsg" style="font-size:12px;margin-top:12px;min-height:18px;"></div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close() {
      try { ov.parentNode.removeChild(ov); } catch (e) {}
      dialogOpen = false;
    }
    function dmsg(t) { var m = document.getElementById('pfDeleteMsg'); if (m) m.textContent = t; }
    document.getElementById('pfDeleteCancel').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.getElementById('pfDeleteConfirm').addEventListener('click', function () {
      var btn = document.getElementById('pfDeleteConfirm');
      btn.disabled = true;
      btn.textContent = 'BURNING\u2026';
      dmsg('');
      var body = { type: 'privacy', p_action: 'privacy_erase', callsign: id.callsign, device: id.device, scope: 'full' };
      post(body, function (j) {
        if (!(j && j.ok)) {
          btn.disabled = false;
          btn.textContent = 'RETRY';
          dmsg('Erase failed: ' + PF.errCopy(j, 'no reply from Command.') + ' Your data is untouched — try again.');
          return;
        }
        /* Server-side done. Now wipe every site key in this browser so the
           UI stops presenting as the deleted identity. */
        wipeLocal();
        box.innerHTML =
          '<div style="color:#e5383b;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">RECORD BURNED</div>' +
          '<p style="font-size:13px;margin:0;">' + esc((j && j.note) || 'All your data has been erased. Gone like it was never here.') + '</p>' +
          '<p style="font-size:12px;margin:12px 0 0;color:#b8ab8e;">This page will reload in a few seconds.</p>';
        toast('Data erased.');
        setTimeout(function () { try { location.reload(); } catch (e) {} }, 3000);
      });
    });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function wipeLocal() {
    try {
      var gone = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('pf_') === 0) gone.push(k);
      }
      gone.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) {}
    try {
      localStorage.removeItem('pf_identity_v1');
      localStorage.removeItem('pf_auth_secret');
      localStorage.removeItem('pf_device_v1');
    } catch (e2) {}
    /* GAP AUDIT v2 (2026-10-03): the footer wipe used to skip sessionStorage
       while the YOUR DATA panel's wipeLocalAll() swept it — the "identical
       wipe" claim was inexact. Now both paths clear pf_* session keys too. */
    try {
      var sgone = [];
      for (var j = 0; j < sessionStorage.length; j++) {
        var sk = sessionStorage.key(j);
        if (sk && sk.indexOf('pf_') === 0) sgone.push(sk);
      }
      sgone.forEach(function (k) { try { sessionStorage.removeItem(k); } catch (e3) {} });
    } catch (e4) {}
  }

  /* ---- boot: inject now, keep trying, watch the DOM, never be absent ----
     Squarespace lazy-renders footers (commerce + system pages render them
     last and sometimes very late), so:
       1. try immediately,
       2. poll every 500ms for up to 60s (120 tries),
       3. watch document.body with a MutationObserver for footer nodes added
          later (also moves the last-resort link INTO a footer if one lands),
       4. after the poll window, if no footer ever appeared, drop the link
          in a fixed bottom-corner position so the control is never missing.
     All paths converge on injectLink()/placeFixed(): a single link element
     (id pf-delete-data-link) is created once and moved, never duplicated. */
  /* R13 (2026-10-04): "claim your wall spot" card on /store. Path-gated —
     only renders on store pages; dismissible; never duplicates. The buyer
     wall itself lives on /ventures (#pf-bond-wall, the Movement Funds
     section; BLOSSOM M3 2026-10-06 folded /war-chest in). Receipt-page copy
     is Shane's hand-step; this card catches every store visitor. */
  function storeCard(){
    if(document.getElementById('pf-store-wall')) return;
    var p='';
    try{ p=String(location.pathname||''); }catch(e){}
    if(!/^\/store(\/|$)/.test(p)) return;
    try{
      var d=document.createElement('div');
      d.id='pf-store-wall';
      d.style.cssText='background:#0d0d0d;color:#f5ead6;border-bottom:3px solid #c1121f;'+
        'font:bold 13px/1.5 Arial,sans-serif;letter-spacing:1px;text-align:center;'+
        'padding:10px 44px 10px 12px;position:relative;z-index:9990;';
      d.innerHTML='BOUGHT A BOND? <a href="/ventures#pf-bond-wall" style="color:#fff;text-decoration:underline;">CLAIM YOUR WALL SPOT &rarr;</a>';
      var x=document.createElement('span');
      x.textContent='\u00d7';
      x.style.cssText='position:absolute;right:12px;top:8px;font-size:20px;cursor:pointer;color:#f5ead6;';
      x.onclick=function(){ d.remove(); };
      d.appendChild(x);
      if(document.body) document.body.insertBefore(d,document.body.firstChild);
    }catch(e2){}
  }

  /* FOOTER TEXT DE-COLLIDE (2026-10-07, fix/homepage-3-bugs): the live homepage
     footer showed Squarespace-native text ("MTCSTW Co. 2026 |", "Privacy Policy")
     overlapping a giant "mtcstw.com" heading — three text layers colliding.
     Both elements are editor blocks; this guard forces the footer's text blocks
     back into normal-flow stacking with breathing room so they can't sit on top
     of each other. Conservative: footer-scoped only, never hides content.
     NOTE: if the overlap comes from Fluid Engine grid areas dragged on top of
     each other in the editor, the editor remains the definitive fix. */
  function footerDecollide(){
    if (document.getElementById('pf-footer-decollide')) return;
    try{
      var css = document.createElement('style');
      css.id = 'pf-footer-decollide';
      css.textContent =
        'footer .sqs-block, .Footer .sqs-block{position:relative!important;}' +
        'footer .sqs-block-content, .Footer .sqs-block-content{position:relative!important;}' +
        'footer .sqs-layout .sqs-row + .sqs-row, .Footer .sqs-layout .sqs-row + .sqs-row{margin-top:16px;}';
      document.head.appendChild(css);
    }catch(e){}
  }
  function boot() {
    stripStaticFallback();
    footerDecollide();
    injectLink();
    try{ storeCard(); }catch(e){}
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      injectLink();
      if (done() || tries >= 120) {
        clearInterval(iv);
        if (!done()) placeFixed();
      }
    }, 500);
    /* MutationObserver: catch footers added after the poll (SPA navigations,
       lazy commerce footers, deferred system-page chrome). */
    var obs = null;
    try {
      obs = new MutationObserver(function () {
        /* If the fixed fallback is on screen and a real footer lands, move
           the link into the footer. Otherwise just retry the injection. */
        var f = findFooter();
        if (f && f.id !== 'pf-delete-fixed') {
          var link = document.getElementById('pf-delete-data-link');
          if (link && link.parentNode && link.parentNode.id === 'pf-delete-fixed') {
            moveIntoFooter(link, f);
          } else {
            injectLink();
          }
        } else if (!f) {
          injectLink();
        }
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }
  function done() {
    return !!document.getElementById('pf-delete-data-link');
  }
  /* 2026-10-05: strip the static "DELETE MY DATA" fallback anchor that the
     footer loader carried briefly (it linked /privacy and duplicated the
     functional injected link). Heals already-pasted footers on boot so no
     Squarespace re-paste is needed. Never touches our own injected link. */
  function stripStaticFallback() {
    try {
      var as = document.querySelectorAll('a[href="/privacy"]');
      for (var i = 0; i < as.length; i++) {
        var t = ((as[i].textContent || '').trim() || '').toUpperCase();
        if (t === 'DELETE MY DATA' && as[i].id !== 'pf-delete-data-link' && as[i].parentNode) {
          as[i].parentNode.removeChild(as[i]);
        }
      }
    } catch (e) {}
  }
  /* Last resort: fixed bottom-corner control, same look/behavior. */
  function placeFixed() {
    if (done()) return;
    try {
      var wrap = document.createElement('div');
      wrap.id = 'pf-delete-fixed';
      wrap.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;background:#0a0a0a;border:1px solid #c1121f;padding:8px 10px;';
      var a = makeLink();
      wrap.appendChild(a);
      document.body.appendChild(wrap);
    } catch (e) {}
  }
  /* Move the fixed fallback link into a real footer when one appears. */
  function moveIntoFooter(link, footer) {
    try {
      var wrap = document.getElementById('pf-delete-fixed');
      var nav = footerNav(footer);
      if (nav) nav.appendChild(link); else footer.appendChild(link);
      link.style.cssText = LINK_STYLE;
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
