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
  var FOOTER_SELS = 'footer, .Footer, #footer, [role="contentinfo"], .site-footer';
  function findFooter() {
    try { return document.querySelector(FOOTER_SELS); } catch (e) { return null; }
  }
  function injectLink() {
    if (document.getElementById('pf-delete-data-link')) return;
    var footer = findFooter();
    if (!footer) return;
    var a = document.createElement('a');
    a.id = 'pf-delete-data-link';
    a.href = '#';
    a.textContent = 'DELETE MY DATA';
    a.setAttribute('aria-label', 'Delete my data');
    a.style.cssText = 'color:#c1121f;font-weight:900;letter-spacing:0.12em;font-size:11px;text-decoration:underline;cursor:pointer;margin-left:14px;white-space:nowrap;';
    a.addEventListener('click', function (e) { e.preventDefault(); openDialog(); });
    /* Append at the end of the footer content, next to the other footer links. */
    var nav = null;
    try { nav = footer.querySelector('nav, .footer-nav, .Footer-nav, [class*="nav"]'); } catch (e2) {}
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
      '<div style="color:#c1121f;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">BURN YOUR RECORD</div>' +
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
          dmsg('Erase failed: ' + ((j && j.err) || 'no reply from Command.') + ' Your data is untouched — try again.');
          return;
        }
        /* Server-side done. Now wipe every site key in this browser so the
           UI stops presenting as the deleted identity. */
        wipeLocal();
        box.innerHTML =
          '<div style="color:#c1121f;font-weight:900;letter-spacing:0.1em;font-size:15px;margin-bottom:12px;">RECORD BURNED</div>' +
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
  }

  /* ---- boot: inject now or when the footer lands ---- */
  function boot() {
    injectLink();
    /* Squarespace lazy-renders footers; retry a few times. */
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      injectLink();
      if (document.getElementById('pf-delete-data-link') || tries > 20) clearInterval(iv);
    }, 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
