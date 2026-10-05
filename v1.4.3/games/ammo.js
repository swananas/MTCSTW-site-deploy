/* games/ammo.js  |  PF v1.4.3 | AMMO FINDER — Creator HQ claim support.
   Type a claim, get leftist sources, data, and information to back it up.
   Propaganda ammunition: this FINDS sources. It does not generate claims,
   it does not verify truth. The honest label says so on the tin.
   Display/utility only — no experience-point calls, no point-adjacent
   logic anywhere in this file.
   KILL: ?pf_off=ammo  or  localStorage pf_disabled_v1='["ammo"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ammo')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href0 = window.location.href || '';
    if (href0.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  /* ---- BACKEND CONTRACT (PENDING, 2026-10-05) ----
     The parallel branch `wave-claim-support` has NOT landed in mtcstw-api
     yet: no such branch exists and no claim_support action exists on the
     backend. This module is built against the contract handed to the
     frontend wave:
       PF.postAction('claimsupport', 'cs_action', 'claim_support_search',
                     {claim: claim}, cb)
     expected response:
       {ok:true, results:[{title, source, date, url, excerpt}],
        sources_down:[...names of unreachable sources...]}
     When the backend lands, confirm the exact type / actionKey / action
     strings and update CLAIM_TYPE / CLAIM_ACTION_KEY / CLAIM_ACTION below.
     Until then the call below is the stub shape and the section shows its
     friendly error state against the live backend. */
  var CLAIM_TYPE = 'claimsupport';
  var CLAIM_ACTION_KEY = 'cs_action';
  var CLAIM_ACTION = 'claim_support_search';

  /* Mount: Creator HQ. Dedicated <div id="pf-ammo"> if the page has one,
     otherwise render right after #pf-war-card (the Creator HQ anchor).
     Nowhere else — this is HQ tooling, not a public-page widget. */
  var mount = document.getElementById('pf-ammo');
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      mount = document.createElement('div');
      mount.id = 'pf-ammo';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
    } else { return; }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* Clipboard, same two-tier pattern as the armory: navigator.clipboard
     first, hidden-textarea execCommand fallback. No copy tracking — this
     module keeps no ledger and awards nothing. */
  function copyText(txt, btn) {
    function doneOk() {
      toast('Citation copied. Go make it hurt.');
      if (btn) {
        var o = btn.textContent;
        btn.textContent = 'COPIED';
        btn.disabled = true;
        setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
      } else { fallback(); }
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }

  var CSS =
    '#pf-ammo{font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-ammo .am-row{display:flex;gap:10px;margin:14px 0 6px;flex-wrap:wrap}' +
    '#pf-ammo #am-claim{flex:1;min-width:220px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:14px 16px;font-size:16px;border-radius:2px}' +
    '#pf-ammo #am-claim:focus{border-color:#c1121f;outline:none}' +
    '#pf-ammo #am-go{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 15px Arial;letter-spacing:2px;padding:14px 26px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo #am-go:hover{background:#e01a28}' +
    '#pf-ammo #am-go:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:4px 0 14px;letter-spacing:.5px}' +
    '#pf-ammo .am-empty,#pf-ammo .am-load{font:400 14px/1.6 Arial;color:#b8a98a;padding:18px 4px}' +
    '#pf-ammo .am-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:16px;font:400 14px/1.6 Arial;margin:8px 0}' +
    '#pf-ammo .am-err button{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}' +
    '#pf-ammo .am-reshead{display:flex;justify-content:space-between;align-items:center;' +
      'gap:10px;flex-wrap:wrap;margin:6px 0 12px}' +
    '#pf-ammo .am-reshead span{font:bold 13px Arial;letter-spacing:1px;color:#7cFF9b}' +
    '#pf-ammo #am-copyall{background:#1a1a1a;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer}' +
    '#pf-ammo .am-down{font:400 12px/1.5 Arial;color:#e8b34b;margin:0 0 12px}' +
    '#pf-ammo .am-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;' +
      'padding:14px 16px;margin:0 0 12px}' +
    '#pf-ammo .am-head{font:bold 16px/1.4 Arial;color:#fff;text-decoration:none;display:block;margin-bottom:6px}' +
    '#pf-ammo a.am-head:hover{color:#ff6b6b}' +
    '#pf-ammo .am-meta{font:400 12px/1.4 Arial;color:#b8a98a;letter-spacing:.5px;margin-bottom:8px}' +
    '#pf-ammo .am-ex{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-ammo .am-copybtn{background:transparent;border:1px solid #555;color:#f5ead6;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '#pf-ammo .am-copybtn:hover{border-color:#c1121f}' +
    '@media(max-width:560px){#pf-ammo #am-go{width:100%}}';

  mount.innerHTML =
    '<div class="fe-block pf-override-block pf-silo">' +
    '<style>' + CSS + '</style>' +
    '<h2>Ammo Finder</h2>' +
    '<div class="c-tag">Type the claim. We dig up the sources.</div>' +
    '<div class="am-row">' +
    '<input id="am-claim" type="text" maxlength="500" autocomplete="off" ' +
      'placeholder="e.g. billionaires paid less in taxes than nurses">' +
    '<button id="am-go" type="button">FIND AMMO</button>' +
    '</div>' +
    '<div class="am-honest">Sources to back your claim. You verify, you post.</div>' +
    '<div id="xAmmo"><div class="am-empty">Type a claim above and hit FIND AMMO. ' +
      'The armory does the digging.</div></div>' +
    '</div>';

  var claimInput = document.getElementById('am-claim');
  var goBtn = document.getElementById('am-go');
  var xAmmo = document.getElementById('xAmmo');
  var busy = false;
  var lastResults = [];

  /* Plain-text citation. No markdown, ever: `Headline — Outlet, Date`
     on one line, the URL on the next. */
  function citation(r) {
    var head = String(r.title || 'Untitled').replace(/\s+/g, ' ').trim();
    var src = String(r.source || 'Unknown outlet').replace(/\s+/g, ' ').trim();
    var date = String(r.date || '').replace(/\s+/g, ' ').trim();
    var url = String(r.url || '').trim();
    return head + ' — ' + src + (date ? ', ' + date : '') + '\n' + url;
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function setBusy(on) {
    busy = on;
    if (goBtn) {
      goBtn.disabled = on;
      goBtn.textContent = on ? 'DIGGING…' : 'FIND AMMO';
    }
  }
  function renderLoading() {
    xAmmo.innerHTML = '<div class="am-load">Digging up ammo…</div>';
  }
  function renderError() {
    xAmmo.innerHTML = '<div class="am-err">Ammo dry right now. Try again in a bit.' +
      '<br><button type="button" data-am-retry="1">RETRY</button></div>';
  }
  function renderNoResults() {
    xAmmo.innerHTML = '<div class="am-empty">No sources found — try fewer or broader words.</div>';
  }
  function renderResults(results, sourcesDown) {
    lastResults = results;
    var n = results.length;
    var h = '<div class="am-reshead"><span>' + n + ' source' + (n === 1 ? '' : 's') +
      ' locked in.</span>' +
      '<button type="button" id="am-copyall">COPY ALL CITATIONS</button></div>';
    if (sourcesDown && sourcesDown.length) {
      h += '<div class="am-down">Some sources are down right now — showing what we could dig up.</div>';
    }
    for (var i = 0; i < n; i++) {
      var r = results[i] || {};
      var url = safeUrl(r.url);
      var headHtml = url
        ? '<a class="am-head" href="' + esc(url) + '" target="_blank" rel="noopener">' +
          esc(r.title || 'Untitled') + '</a>'
        : '<span class="am-head">' + esc(r.title || 'Untitled') + '</span>';
      h += '<div class="am-card">' + headHtml +
        '<div class="am-meta">' + esc(r.source || 'Unknown outlet') +
        (r.date ? ' — ' + esc(r.date) : '') + '</div>' +
        (r.excerpt ? '<p class="am-ex">' + esc(r.excerpt) + '</p>' : '') +
        '<button type="button" class="am-copybtn" data-am-copy="' + i + '">COPY CITATION</button>' +
        '</div>';
    }
    xAmmo.innerHTML = h;
  }

  function submit() {
    if (busy) return;
    var claim = '';
    try { claim = String(claimInput.value || '').trim(); } catch (e) {}
    if (!claim) { toast('Type a claim first.'); return; }
    if (claim.length > 500) claim = claim.slice(0, 500);
    if (!(PF && PF.postAction)) { renderError(); return; }
    setBusy(true);
    renderLoading();
    var body = { claim: claim };
    try {
      PF.postAction(CLAIM_TYPE, CLAIM_ACTION_KEY, CLAIM_ACTION, body, function (j) {
        setBusy(false);
        if (j && j.ok) {
          var results = (j.results && j.results.length) ? j.results : [];
          var down = (j.sources_down && j.sources_down.length) ? j.sources_down : [];
          if (!results.length) { renderNoResults(); return; }
          renderResults(results, down);
        } else {
          renderError();
        }
      });
    } catch (e) {
      setBusy(false);
      renderError();
    }
  }

  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    if (t.id === 'am-go' || t.getAttribute('data-am-retry')) { submit(); return; }
    if (t.id === 'am-copyall') {
      if (lastResults.length) copyText(lastResults.map(citation).join('\n\n'), t);
      return;
    }
    var ci = t.getAttribute('data-am-copy');
    if (ci !== null && ci !== '') {
      var r = lastResults[Number(ci)];
      if (r) copyText(citation(r), t);
    }
  });
  if (claimInput) {
    claimInput.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter') submit();
    });
  }
})();
