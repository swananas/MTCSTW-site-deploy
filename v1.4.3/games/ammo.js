/* games/ammo.js  |  PF v1.4.3 | AMMO FINDER — Creator HQ claim support.
   Type a claim, get leftist sources, data, and information to back it up.
   Propaganda ammunition: this FINDS sources. It does not generate claims,
   it does not verify truth. The honest label says so on the tin.
   Display/utility only — no experience-point calls, no point-adjacent
   logic anywhere in this file. The Ammo Finder invariant: copying a
   citation without attaching it stays zero-attribution — the per-card
   poster/bank buttons only transport data, they grant nothing.
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

  /* ---- BACKEND CONTRACT (CONFIRMED, 2026-10-05) ----
     wave-claim-support has landed in mtcstw-api. The type / actionKey /
     action strings below were verified matching against the live backend:
       PF.postAction('claimsupport', 'cs_action', 'claim_support_search',
                     {claim: claim}, cb)
     response:
       {ok:true, results:[{title, source, date, url, excerpt}],
        sources_down:[...names of unreachable sources...],
        terms:[...query terms the backend actually searched...]}
     `terms` renders as "searched for: …" under the results; when the
     backend omits it, the submitted claim is shown instead.
     ---- POLITICAL MODE CONTRACT (weave #2, 2026-10-05) ----
     be/ammo-political (src/ammo.js, per-callsign auth, POST-only, zero XP):
       PF.postAction('ammo', 'ammo_action', 'ammo_political_search',
                     {query: q}, cb)
       -> {ok, available, missing?, results:[{kind:'rep'|'bill'|'race',
           id, title, subtitle, meta}]}
       PF.postAction('ammo', 'ammo_action', 'ammo_political_detail',
                     {kind, id}, cb)
       -> {ok, available?, kind, id, title, detail:{...},
           forge_cards:[{plugin_id, template_id, label, data, source,
           fetched_at}]}
     available:false means the Political HQ tables have not merged yet —
     the tab renders "Political data not loaded yet" and never breaks.
     FORGE THIS: the card payload is stashed under the pf_forge_prefill_v1
     key (see pf_forge_prefill_v1 contract below) and the user is sent to
     /create. The Poster Forge reads the stash on load; if its political
     templates are not live yet it toasts and keeps the stash for later. */
  var CLAIM_TYPE = 'claimsupport';
  var CLAIM_ACTION_KEY = 'cs_action';
  var CLAIM_ACTION = 'claim_support_search';
  var POL_TYPE = 'ammo';
  var POL_ACTION_KEY = 'ammo_action';
  var POL_SEARCH = 'ammo_political_search';
  var POL_DETAIL = 'ammo_political_detail';

  /* Mount: Creator HQ. The dedicated <div id="pf-ammo"> is the REQUIRED
     mount — the Creator HQ page must include it for the Ammo Finder to
     appear. Legacy fallback: render right after #pf-war-card (the Creator
     HQ anchor) with a loud console.warn. Neither anchor anywhere → a
     visible error banner on the page. Never a silent no-op. */
  var mount = document.getElementById('pf-ammo');
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      try {
        console.warn('[PF ammo] #pf-ammo missing — the Creator HQ page must ' +
          'carry the dedicated <div id="pf-ammo"> mount. Fell back to the ' +
          '#pf-war-card anchor.');
      } catch (e0b) {}
      mount = document.createElement('div');
      mount.id = 'pf-ammo';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
    } else {
      try {
        var fail = document.createElement('div');
        fail.id = 'pf-ammo-missing';
        fail.setAttribute('role', 'alert');
        fail.style.cssText = 'background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;' +
          'font:bold 14px Arial,sans-serif;padding:16px;margin:12px;';
        fail.textContent = 'AMMO FINDER HAS NOWHERE TO MOUNT — ' +
          'add <div id="pf-ammo"></div> to the Creator HQ page.';
        if (document.body) document.body.insertBefore(fail, document.body.firstChild);
      } catch (e0c) {}
      return;
    }
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
  function copyText(txt, btn, msg) {
    function doneOk() {
      toast(msg || 'Citation copied. Go make it hurt.');
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
    '#pf-ammo .am-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 4px}' +
    '#pf-ammo .am-chips-l{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a}' +
    '#pf-ammo .am-chip{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:400 12px Arial;padding:6px 12px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo .am-chip:hover{border-color:#c1121f}' +
    '#pf-ammo .am-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:4px 0 14px;letter-spacing:.5px}' +
    '#pf-ammo .am-empty,#pf-ammo .am-load{font:400 14px/1.6 Arial;color:#b8a98a;padding:18px 4px}' +
    '#pf-ammo .am-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:16px;font:400 14px/1.6 Arial;margin:8px 0}' +
    '#pf-ammo .am-err button{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}' +
    '#pf-ammo .am-reshead{display:flex;justify-content:space-between;align-items:center;' +
      'gap:10px;flex-wrap:wrap;margin:6px 0 12px}' +
    '#pf-ammo .am-reshead h3{font:bold 13px Arial;letter-spacing:1px;color:#7cFF9b;margin:0}' +
    '#pf-ammo #am-copyall{background:#1a1a1a;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer}' +
    '#pf-ammo .am-down{font:400 12px/1.5 Arial;color:#e8b34b;margin:0 0 12px}' +
    '#pf-ammo .am-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;' +
      'padding:14px 16px;margin:0 0 12px}' +
    '#pf-ammo .am-head{font:bold 16px/1.4 Arial;color:#fff;text-decoration:none;display:block;margin-bottom:6px}' +
    '#pf-ammo a.am-head:hover{color:#ff6b6b}' +
    '#pf-ammo .am-meta{font:400 12px/1.4 Arial;color:#b8a98a;letter-spacing:.5px;margin-bottom:8px}' +
    '#pf-ammo .am-ex{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-ammo .am-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}' +
    '#pf-ammo .am-copybtn,#pf-ammo .am-posterbtn,#pf-ammo .am-bankbtn{background:transparent;' +
      'border:1px solid #555;color:#f5ead6;font:bold 11px Arial;letter-spacing:1px;' +
      'padding:8px 14px;cursor:pointer}' +
    '#pf-ammo .am-copybtn:hover,#pf-ammo .am-posterbtn:hover,#pf-ammo .am-bankbtn:hover{border-color:#c1121f}' +
    '#pf-ammo .am-copybtn:disabled,#pf-ammo .am-posterbtn:disabled,#pf-ammo .am-bankbtn:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-terms{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:2px 0 10px}' +
    '#pf-ammo .am-refine{display:flex;gap:10px;margin:0 0 6px;flex-wrap:wrap}' +
    '#pf-ammo #am-refine{flex:1;min-width:200px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:10px 14px;font-size:14px;border-radius:2px}' +
    '#pf-ammo #am-refine:focus{border-color:#c1121f;outline:none}' +
    '#pf-ammo #am-rerun{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo #am-rerun:hover{background:#c1121f}' +
    '#pf-ammo #am-rerun:disabled{opacity:.55;cursor:wait}' +
    /* POLITICAL mode (weave #2): mode tabs, kind badges, voting-record
       table, stale banner, forge buttons. Same house palette. */
    '#pf-ammo .am-modes{display:flex;gap:8px;margin:2px 0 10px;flex-wrap:wrap}' +
    '#pf-ammo .am-mode{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:bold 12px Arial;letter-spacing:2px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo .am-mode.on{border-color:#c1121f;background:rgba(193,18,31,.18);color:#fff}' +
    '#pf-ammo .am-kind{display:inline-block;background:#c1121f;color:#fff;' +
      'font:bold 10px Arial;letter-spacing:1px;padding:3px 8px;margin-right:8px;border-radius:2px}' +
    '#pf-ammo .am-kind.bill{background:#8a6d1c}#pf-ammo .am-kind.race{background:#1c5a8a}' +
    '#pf-ammo .am-poldetail{background:#141414;border:1px solid #3a3a3a;' +
      'border-left:4px solid #c1121f;padding:14px 16px;margin:0 0 12px}' +
    '#pf-ammo .am-poldetail h4{font:bold 15px Arial;color:#fff;margin:0 0 8px}' +
    '#pf-ammo .am-polmeta{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-ammo .am-votes{width:100%;border-collapse:collapse;margin:8px 0 10px;font:400 12px/1.5 Arial}' +
    '#pf-ammo .am-votes th{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a;' +
      'text-align:left;padding:6px 8px;border-bottom:1px solid #3a3a3a}' +
    '#pf-ammo .am-votes td{padding:6px 8px;border-bottom:1px solid #222;color:#d8cdb4;vertical-align:top}' +
    '#pf-ammo .am-pos-yea{color:#7cFF9b;font-weight:bold}' +
    '#pf-ammo .am-pos-nay{color:#ff6b6b;font-weight:bold}' +
    '#pf-ammo .am-pos-miss{color:#8a8a8a}' +
    '#pf-ammo .am-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:0 0 10px}' +
    '#pf-ammo .am-forgebtn{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '#pf-ammo .am-forgebtn:hover{background:#e01a28}' +
    '#pf-ammo .am-forgebtn:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-back{background:transparent;border:1px solid #555;color:#f5ead6;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer;margin-bottom:10px}' +
    '#pf-ammo .am-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}' +
    '@media(max-width:560px){#pf-ammo #am-go{width:100%}}';

  mount.innerHTML =
    '<div class="fe-block pf-override-block pf-silo">' +
    '<style>' + CSS + '</style>' +
    '<h2>Ammo Finder</h2>' +
    '<div class="c-tag">Type the claim. We dig up the sources.</div>' +
    '<div class="am-modes" role="tablist" aria-label="Ammo Finder mode">' +
    '<button type="button" class="am-mode on" id="am-mode-sources" role="tab" aria-selected="true">SOURCES</button>' +
    '<button type="button" class="am-mode" id="am-mode-political" role="tab" aria-selected="false">POLITICAL</button>' +
    '</div>' +
    '<div class="am-chips" id="am-chips" aria-label="Recent searches" style="display:none"></div>' +
    '<div class="am-row">' +
    '<input id="am-claim" type="text" maxlength="500" autocomplete="off" ' +
      'aria-label="Type the claim you want sources for" ' +
      'placeholder="e.g. billionaires paid less in taxes than nurses">' +
    '<button id="am-go" type="button" aria-label="Find sources for this claim">FIND AMMO</button>' +
    '</div>' +
    '<div class="am-honest">Sources to back your claim. You verify, you post.</div>' +
    '<div id="xAmmo" aria-live="polite"><div class="am-empty">Type a claim above and hit FIND AMMO. ' +
      'The armory does the digging.</div></div>' +
    '</div>';

  var claimInput = document.getElementById('am-claim');
  var goBtn = document.getElementById('am-go');
  var xAmmo = document.getElementById('xAmmo');
  var busy = false;
  var lastResults = [];
  var lastQuery = '';
  var lastSearchedAt = 0;

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

  /* Structured citation payload. Carried forward by the per-card actions
     (poster + Content Bank). The `token` field is reserved for the future
     signed citation token: the read/create XP spec's C2 chain prefers
     server-resolved signed tokens, but the backend doesn't issue them yet —
     so the full payload rides along now and the token slots in later. */
  function citationPayload(r) {
    return {
      url: safeUrl(r.url) || String(r.url || '').trim(),
      headline: String(r.title || 'Untitled').replace(/\s+/g, ' ').trim(),
      outlet: String(r.source || 'Unknown outlet').replace(/\s+/g, ' ').trim(),
      date: String(r.date || '').replace(/\s+/g, ' ').trim(),
      query: lastQuery,
      searched_at: lastSearchedAt,
      token: null /* signed citation token (future; null until issued) */
    };
  }

  /* Session-level recent searches (last 10) — clickable chips above the
     input; a chip re-runs that search. */
  var RECENT_KEY = 'pf_ammo_recent_v1';
  function readRecent() {
    try {
      var a = JSON.parse(sessionStorage.getItem(RECENT_KEY) || '[]');
      return (a && a.slice) ? a.slice(0, 10) : [];
    } catch (e) { return []; }
  }
  function pushRecent(q) {
    try {
      var a = readRecent().filter(function (x) { return x !== q; });
      a.unshift(q);
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 10)));
    } catch (e) {}
    renderChips();
  }
  function renderChips() {
    var box = null;
    try { box = document.getElementById('am-chips'); } catch (e) { return; }
    if (!box) return;
    var a = readRecent();
    if (!a.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    var h = '<span class="am-chips-l">RECENT:</span>';
    for (var i = 0; i < a.length; i++) {
      h += '<button type="button" class="am-chip" data-am-chip="' + i + '"' +
        ' aria-label="Search again for ' + esc(a[i]) + '">' + esc(a[i]) + '</button>';
    }
    box.innerHTML = h;
    box.style.display = '';
  }

  /* MAKE A POSTER: citation payload -> the PFShare poster pipeline (the
     real path — PFShare painters accept input through the setPoster
     closure and ship via PFShare.saveImage). Paints the citation as a
     1080x1350 poster in the house palette with the JOIN THE FIGHT. CTA
     standard, callsign-stamped, downloaded. Poster Forge on /create has no
     prefill API, so this paints the citation poster directly rather than
     pretending to prefill the Forge — the payload also rides in
     sessionStorage for the day the Forge accepts input. */
  function posterWrap(x, text, maxW) {
    var words = String(text == null ? '' : text).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else { line = t; }
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintCitationPoster(p) {
    var cv = null, x = null;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = 1080; cv.height = 1350;
    try { x = cv.getContext('2d'); } catch (e2) {}
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, 1048, 1318);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, 976, 1246);
    x.textAlign = 'center';
    var y = 170;
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('\u2605 AMMO FINDER \u2605', 540, y); y += 110;
    x.fillStyle = '#ffffff'; x.font = '900 68px "Arial Black",Arial,sans-serif';
    var lines = posterWrap(x, p.headline || 'UNTITLED', 910);
    for (var i = 0; i < Math.min(lines.length, 4); i++) { x.fillText(lines[i], 540, y); y += 84; }
    y += 30;
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    var byline = p.outlet + (p.date ? ', ' + p.date : '');
    var bl = posterWrap(x, byline, 910);
    for (var b = 0; b < Math.min(bl.length, 2); b++) { x.fillText(bl[b], 540, y); y += 54; }
    y += 24;
    x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
    var ul = posterWrap(x, p.url || '', 910);
    for (var u = 0; u < Math.min(ul.length, 3); u++) { x.fillText(ul[u], 540, y); y += 44; }
    /* share-image CTA standard: every share image carries JOIN THE FIGHT.
       above/below MTCSTW.COM. */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', 540, 1350 - 168);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1350 - 108);
    return cv;
  }
  function makePoster(i, btn) {
    var r = lastResults[i];
    if (!r) return;
    var p = citationPayload(r);
    var PS = null;
    try { PS = window.PFShare; } catch (e) {}
    if (!PS || !PS.setPoster || !PS.saveImage) {
      toast('Poster flow not loaded — open the Create page to forge one.');
      return;
    }
    if (btn) btn.disabled = true;
    function painter(done) {
      var cv = paintCitationPoster(p);
      try { if (cv && PS.stampCallsign) cv = PS.stampCallsign(cv) || cv; } catch (e2) {}
      try { done(cv); } catch (e3) {}
    }
    try { PS.setPoster('ammo-cite', painter); } catch (e4) {}
    try {
      painter(function (cv) {
        if (cv) { PS.saveImage(cv, 'pfn-ammo-citation.png', 'ammo-cite'); }
        else { toast('Poster failed — try again.'); }
        if (btn) btn.disabled = false;
      });
    } catch (e5) {
      if (btn) btn.disabled = false;
      toast('Poster failed — try again.');
    }
  }

  /* SUBMIT TO CONTENT BANK: no Content Bank submit UI exists in this
     branch's tree (the #pf-readxp-bank composer lives on the sibling
     branch wave-readcreate-fe). Until it lands, the button does what the
     spec allows: copies the structured citation bundle AND opens the
     Content Bank surface when one is present on the page. The signed-token
     chain (read/create XP spec C2) is wired below and stays dormant until
     the backend starts issuing tokens — the full payload rides along now. */
  var BANK_INBOX = 'pf_ammo_bank_inbox_v1';
  function stashBankPayload(p) {
    try {
      var a = [];
      try { a = JSON.parse(sessionStorage.getItem(BANK_INBOX) || '[]') || []; } catch (e) {}
      if (!a.slice) a = [];
      a.push(p);
      while (a.length > 20) a.shift();
      sessionStorage.setItem(BANK_INBOX, JSON.stringify(a));
    } catch (e2) {}
  }
  function submitToBank(i, btn) {
    var r = lastResults[i];
    if (!r) return;
    var p = citationPayload(r);
    stashBankPayload(p);
    var bundle = JSON.stringify({ kind: 'pf-citation', v: 1, citation: p }, null, 2);
    if (btn) {
      var o = btn.textContent;
      btn.textContent = 'STAGED';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
    }
    copyText(bundle, null, 'Citation bundle copied. Go make it hurt.');
    try {
      /* Signed-token chain: the C2 chain prefers server-resolved signed
         tokens. The backend doesn't issue them yet, so p.token is null and
         this stays dormant — structured for the token later. */
      var RX = null;
      try { RX = (window.PF && window.PF.readXP) || null; } catch (e0) {}
      if (RX && RX.citeTokens && p.token) {
        RX.citeTokens.push({ url: p.url, query: p.query, token: p.token,
          expires_at: null, headline: p.headline, outlet: p.outlet,
          date: p.date, searched_at: p.searched_at });
        while (RX.citeTokens.length > 20) RX.citeTokens.shift();
        try {
          document.dispatchEvent(new CustomEvent('pf-rx-cite-token',
            { detail: { url: p.url, token: p.token } }));
        } catch (e1) {}
      }
    } catch (e2) {}
    try {
      var bank = document.getElementById('pf-readxp-bank');
      if (bank && bank.scrollIntoView) {
        bank.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Citation staged — attach it in the Content Bank composer.');
        return;
      }
    } catch (e3) {}
    toast('Citation bundle copied. The Content Bank submit UI is not on this ' +
      'page yet — paste the bundle when it lands.');
  }

  /* ============ POLITICAL MODE (weave #2) ============
     Entity search across reps / bills / races from the Political HQ
     tables. Read-only, zero XP (Economy Desk sign-off): these buttons
     transport data, they grant nothing — creation downstream rides the
     existing Forge/readcreate legs exactly once.
     FORGE THIS stash contract (pf_forge_prefill_v1) — shared with the
     Poster Forge and the Studio plugin registry coordinator:
       sessionStorage['pf_forge_prefill_v1'] = JSON.stringify({
         v: 1, plugin_id, template_id, label, data, source, fetched_at,
         stashed_at: <ms epoch>,
         -- Synergy-1 attribution hook (S-20): creator-made templates carry
            their maker. Optional passthrough — the Forge hands these to
            PF.credit when the template renders. Absent = no credit line,
            never a guess. --
         sourced_by: <callsign|'hq'>, sourced_name: <display>, sourced_url: <profile> })
     The Forge reads it on /create load: if PFStudio.applyPrefill exists
     it is applied and the stash cleared; otherwise the Forge toasts and
     keeps the stash for when the political templates land. */
  var FORGE_STASH_KEY = 'pf_forge_prefill_v1';
  var mode = 'sources';
  var polResults = [];
  var polCards = [];
  var polDetail = null;

  function setMode(m) {
    mode = (m === 'political') ? 'political' : 'sources';
    var ms = null, mp = null;
    try {
      ms = document.getElementById('am-mode-sources');
      mp = document.getElementById('am-mode-political');
    } catch (e) {}
    if (ms) { ms.classList.toggle('on', mode === 'sources'); ms.setAttribute('aria-selected', mode === 'sources' ? 'true' : 'false'); }
    if (mp) { mp.classList.toggle('on', mode === 'political'); mp.setAttribute('aria-selected', mode === 'political' ? 'true' : 'false'); }
    if (claimInput) {
      try {
        claimInput.placeholder = (mode === 'political')
          ? 'e.g. Ted Cruz, HR-22, texas senate'
          : 'e.g. billionaires paid less in taxes than nurses';
        claimInput.setAttribute('aria-label', (mode === 'political')
          ? 'Search reps, bills, and races'
          : 'Type the claim you want sources for');
      } catch (e2) {}
    }
    if (goBtn) { try { goBtn.textContent = (mode === 'political') ? 'FIND TARGETS' : 'FIND AMMO'; } catch (e3) {} }
    /* Clear the results pane on mode switch — never mix the two modes. */
    xAmmo.innerHTML = (mode === 'political')
      ? '<div class="am-empty">Search a rep, a bill, or a race. Voting records, ' +
        'bill status, and ratings come straight from the Political HQ tables — ' +
        'verified positions only, nothing invented.</div>'
      : '<div class="am-empty">Type a claim above and hit FIND AMMO. ' +
        'The armory does the digging.</div>';
  }

  function renderPolLoading() {
    xAmmo.innerHTML = '<div class="am-load">Digging through the Political HQ tables…</div>';
  }
  function renderPolUnavailable(missing) {
    xAmmo.innerHTML = '<div class="am-empty">Political data not loaded yet — the ' +
      'Political HQ tables are still merging. Check back after the big update ships.' +
      (missing && missing.length ? '<br>Waiting on: ' + esc(missing.join(', ')) : '') + '</div>';
  }
  function kindBadge(k) {
    var cls = k === 'bill' ? 'bill' : (k === 'race' ? 'race' : '');
    var label = k === 'rep' ? 'REP' : (k === 'bill' ? 'BILL' : 'RACE');
    return '<span class="am-kind ' + cls + '">' + label + '</span>';
  }
  function renderPolResults(results, query) {
    polResults = results || [];
    var n = polResults.length;
    if (!n) {
      xAmmo.innerHTML = '<div class="am-empty">No reps, bills, or races matched ' +
        '“' + esc(query) + '”. Try a last name, a bill number (HR-22), or a state.</div>';
      return;
    }
    var h = '<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">' +
      n + ' target' + (n === 1 ? '' : 's') + ' locked in.</h3></div>';
    for (var i = 0; i < n; i++) {
      var r = polResults[i] || {};
      h += '<div class="am-card"><a class="am-head" href="#" data-am-pol="' + i + '">' +
        kindBadge(r.kind) + esc(r.title || 'Untitled') + '</a>' +
        '<div class="am-meta">' + esc(r.subtitle || '') + '</div></div>';
    }
    xAmmo.innerHTML = h;
    try {
      var rh = document.getElementById('am-reshead');
      if (rh && rh.focus) rh.focus();
    } catch (e) {}
  }
  function posClass(p) {
    if (p === 'Yea') return 'am-pos-yea';
    if (p === 'Nay') return 'am-pos-nay';
    return 'am-pos-miss';
  }
  function renderPolDetail(res) {
    polDetail = res;
    polCards = (res && res.forge_cards) || [];
    var d = (res && res.detail) || {};
    var kind = res.kind;
    var h = '<button type="button" class="am-back" id="am-polback">← BACK TO TARGETS</button>';
    h += '<div class="am-poldetail"><h4>' + kindBadge(kind) + esc(res.title || '') + '</h4>';
    if (kind === 'rep') {
      h += '<div class="am-polmeta">' + esc(d.chamber || '') + ' · Phone: ' + esc(d.phone || '—') +
        (d.url ? ' · <a href="' + esc(safeUrl(d.url)||"#") + '" target="_blank" rel="noopener" style="color:#7cFF9b">official site</a>' : '') + '</div>';
      h += '<table class="am-votes"><thead><tr><th>VOTE</th><th>BILL</th><th>POSITION</th></tr></thead><tbody>';
      var votes = d.votes || [];
      for (var i = 0; i < votes.length; i++) {
        var v = votes[i] || {};
        h += '<tr><td>' + esc(v.vote_date || '') + '<br>' + esc(v.question || '') + '</td>' +
          '<td>' + esc(v.bill_id || '') + ' — ' + esc(v.bill_title || '') + '</td>' +
          '<td class="' + posClass(v.position) + '">' + esc(v.position || '—') + '</td></tr>';
      }
      h += '</tbody></table>';
      h += '<div class="am-src">Source: ' + esc(d.source || '') + '. "—" means no verified position on record — never guessed.</div>';
    } else if (kind === 'bill') {
      h += '<div class="am-polmeta">Status: <b>' + esc(d.status || '—') + '</b>' +
        ' · Stuck in: ' + esc(d.stuck_in || '—') +
        ' · Sponsor: ' + esc(d.sponsor || '—') +
        (d.public_law && d.public_law !== '—' ? ' · ' + esc(d.public_law) : '') + '</div>';
      if (d.summary) h += '<p class="am-ex">' + esc(d.summary) + '</p>';
      var kp = d.key_players || [];
      if (kp.length) {
        h += '<div class="am-polmeta">Key players: ';
        for (var k = 0; k < kp.length; k++) {
          h += esc(kp[k].role || '') + ' — ' + esc(kp[k].name || '—') +
            ' (' + esc(kp[k].party || '—') + '-' + esc(kp[k].state || '—') + ')' +
            (k < kp.length - 1 ? '; ' : '');
        }
        h += '</div>';
      }
      h += '<div class="am-src">Source: ' + esc(d.source || '') +
        (d.source_url ? ' · <a href="' + esc(safeUrl(d.source_url)||"#") + '" target="_blank" rel="noopener" style="color:#7cFF9b">congress.gov</a>' : '') +
        (d.data_as_of && d.data_as_of !== '—' ? ' · data as of ' + esc(d.data_as_of) : '') + '</div>';
    } else if (kind === 'race') {
      if (d.stale) {
        h += '<div class="am-stale">⚠ STALE RATING — snapshot from ' + esc(d.source_date || 'unknown') +
          ', older than 14 days. Verify before posting.</div>';
      }
      h += '<div class="am-polmeta">Rating: <b>' + esc(d.rating || '—') + '</b>' +
        (d.poll_margin && d.poll_margin !== '—' ? ' · margin ' + esc(d.poll_margin) : '') + '</div>';
      if (d.stakes) h += '<p class="am-ex">' + esc(d.stakes) + '</p>';
      var cands = d.candidates || [];
      for (var c = 0; c < cands.length; c++) {
        h += '<div class="am-polmeta"><b>' + esc(cands[c].name || '—') + '</b> (' +
          esc(cands[c].party || '—') + ') — ' + esc(cands[c].funding || '—') + '</div>';
      }
      h += '<div class="am-src">Source: ' + esc(d.source_note || '') + '</div>';
    }
    if (polCards.length) {
      h += '<div class="am-actions" style="margin-top:10px">';
      for (var f = 0; f < polCards.length; f++) {
        h += '<button type="button" class="am-forgebtn" data-am-forge="' + f + '">' +
          esc(polCards[f].label || 'FORGE THIS') + '</button>';
      }
      h += '</div><div class="am-src">Forge cards pull live data at generation time and ' +
        'carry the source + date on the asset. Nothing auto-publishes.</div>';
    }
    h += '</div>';
    xAmmo.innerHTML = h;
  }
  function loadPolDetail(kind, id) {
    if (!(PF && PF.postAction)) { renderError(); return; }
    renderPolLoading();
    try {
      PF.postAction(POL_TYPE, POL_ACTION_KEY, POL_DETAIL, { kind: kind, id: id }, function (j) {
        if (j && j.ok && j.available === false) { renderPolUnavailable(j.missing); return; }
        if (j && j.ok && j.detail) { renderPolDetail(j); return; }
        renderError();
      });
    } catch (e) { renderError(); }
  }
  /* FORGE THIS: stash the card payload for the Poster Forge, then jump to
     /create. Zero XP here — the Forge's own creation/share legs grant
     exactly once downstream (Economy Desk sign-off). Fail-closed: if the
     stash cannot be written, the user stays put with a toast instead of
     landing on /create empty-handed. */
  function forgeThis(i, btn) {
    var card = polCards[i];
    if (!card) return;
    var payload = {
      v: 1,
      plugin_id: card.plugin_id,
      template_id: card.template_id,
      label: card.label,
      data: card.data,
      source: card.source,
      fetched_at: card.fetched_at,
      stashed_at: Date.now(),
      /* Synergy-1 attribution hook (S-20): passthrough for creator-made
         templates. Today's political cards are data-built (no maker), so
         these stay empty — the Forge renders no credit line for them. */
      sourced_by: card.sourced_by || '',
      sourced_name: card.sourced_name || '',
      sourced_url: card.sourced_url || ''
    };
    var okStash = false;
    try {
      sessionStorage.setItem(FORGE_STASH_KEY, JSON.stringify(payload));
      okStash = true;
    } catch (e) {}
    if (!okStash) { toast('Could not stage the payload — try again.'); return; }
    if (btn) { try { btn.disabled = true; btn.textContent = 'STAGED — OPENING FORGE…'; } catch (e2) {} }
    try { window.location.href = '/create'; }
    catch (e3) { toast('Payload staged — open the Create page to forge it.'); }
  }
  function submitPolitical() {
    if (busy) return;
    var query = '';
    try { query = String(claimInput.value || '').trim(); } catch (e) {}
    if (!query) { toast('Type a name, bill, or race first.'); return; }
    if (query.length > 80) query = query.slice(0, 80);
    if (!(PF && PF.postAction)) { renderError(); return; }
    lastQuery = query;
    lastSearchedAt = Date.now();
    setBusy(true);
    renderPolLoading();
    try {
      PF.postAction(POL_TYPE, POL_ACTION_KEY, POL_SEARCH, { query: query }, function (j) {
        setBusy(false);
        if (j && j.ok && j.available === false) { renderPolUnavailable(j.missing); return; }
        if (j && j.ok) {
          var results = (j.results && j.results.length) ? j.results : [];
          renderPolResults(results, query);
          return;
        }
        renderError();
      });
    } catch (e) {
      setBusy(false);
      renderError();
    }
  }

  function setBusy(on) {
    busy = on;
    if (goBtn) {
      goBtn.disabled = on;
      /* Mode-aware label — political mode never shows the sources label. */
      goBtn.textContent = on ? 'DIGGING…'
        : (mode === 'political' ? 'FIND TARGETS' : 'FIND AMMO');
    }
    try {
      var rr = document.getElementById('am-rerun');
      if (rr) rr.disabled = on;
    } catch (e) {}
  }
  function renderLoading() {
    /* Loading rides the aria-live region on #xAmmo — announced, not bare. */
    xAmmo.innerHTML = '<div class="am-load">Digging up ammo…</div>';
  }
  function renderError() {
    xAmmo.innerHTML = '<div class="am-err">Ammo dry right now. Try again in a bit.' +
      '<br><button type="button" data-am-retry="1" aria-label="Retry the search">RETRY</button></div>';
  }
  function renderNoResults() {
    xAmmo.innerHTML = '<div class="am-empty">No sources found — try fewer or broader words.</div>';
  }
  function renderResults(results, sourcesDown, terms, claim) {
    lastResults = results;
    var n = results.length;
    var h = '<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">' +
      n + ' source' + (n === 1 ? '' : 's') + ' locked in.</h3>' +
      '<button type="button" id="am-copyall" aria-label="Copy all citations">COPY ALL CITATIONS</button></div>';
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
        '<div class="am-actions">' +
        '<button type="button" class="am-copybtn" data-am-copy="' + i + '"' +
          ' aria-label="Copy citation for ' + esc(r.title || 'Untitled') + '">COPY CITATION</button>' +
        '<button type="button" class="am-posterbtn" data-am-poster="' + i + '"' +
          ' aria-label="Make a poster from this source">MAKE A POSTER</button>' +
        '<button type="button" class="am-bankbtn" data-am-bank="' + i + '"' +
          ' aria-label="Submit this citation to the Content Bank">SUBMIT TO CONTENT BANK</button>' +
        '</div></div>';
    }
    /* Query transparency: the terms the backend actually searched, plus a
       refine-and-retry input that re-runs with the refined claim. */
    var tline = (terms && terms.length) ? terms.join(', ') : claim;
    h += '<div class="am-terms">searched for: ' + esc(tline) + '</div>' +
      '<div class="am-refine">' +
      '<input id="am-refine" type="text" maxlength="500" autocomplete="off" ' +
        'aria-label="Refine the claim and search again" value="' + esc(claim) + '">' +
      '<button id="am-rerun" type="button" aria-label="Search again with the refined claim">REFINE + RETRY</button>' +
      '</div>';
    xAmmo.innerHTML = h;
    try {
      var rh = document.getElementById('am-reshead');
      if (rh && rh.focus) rh.focus();
    } catch (e) {}
  }

  function submit() {
    /* Political mode branches to the Political HQ tables; sources mode
       keeps the original claim-support flow. Never mixed. */
    if (mode === 'political') { submitPolitical(); return; }
    if (busy) return;
    var claim = '';
    try { claim = String(claimInput.value || '').trim(); } catch (e) {}
    if (!claim) { toast('Type a claim first.'); return; }
    if (claim.length > 500) claim = claim.slice(0, 500);
    if (!(PF && PF.postAction)) { renderError(); return; }
    lastQuery = claim;
    lastSearchedAt = Date.now();
    pushRecent(claim);
    setBusy(true);
    renderLoading();
    var body = { claim: claim };
    try {
      PF.postAction(CLAIM_TYPE, CLAIM_ACTION_KEY, CLAIM_ACTION, body, function (j) {
        setBusy(false);
        if (j && j.ok) {
          var results = (j.results && j.results.length) ? j.results : [];
          var down = (j.sources_down && j.sources_down.length) ? j.sources_down : [];
          var terms = (j.terms && j.terms.length) ? j.terms : null;
          if (!results.length) { renderNoResults(); return; }
          renderResults(results, down, terms, claim);
        } else {
          renderError();
        }
      });
    } catch (e) {
      setBusy(false);
      renderError();
    }
  }
  function doRefine() {
    var rv = null;
    try { rv = document.getElementById('am-refine'); } catch (e) {}
    if (rv && claimInput) {
      try { claimInput.value = rv.value; } catch (e2) {}
    }
    submit();
  }

  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    if (t.id === 'am-mode-sources') { setMode('sources'); return; }
    if (t.id === 'am-mode-political') { setMode('political'); return; }
    if (t.id === 'am-polback') { renderPolResults(polResults, lastQuery); return; }
    var fg = t.getAttribute('data-am-forge');
    if (fg !== null && fg !== '') { forgeThis(Number(fg), t); return; }
    var pl = t.getAttribute('data-am-pol');
    if ((pl === null || pl === '') && t.closest) {
      var anc = null;
      try { anc = t.closest('[data-am-pol]'); } catch (e) {}
      if (anc) pl = anc.getAttribute('data-am-pol');
    }
    if (pl !== null && pl !== '') {
      var pr = polResults[Number(pl)];
      if (pr) { loadPolDetail(pr.kind, pr.id); }
      if (ev && ev.preventDefault) ev.preventDefault();
      return;
    }
    if (t.id === 'am-go' || t.getAttribute('data-am-retry')) { submit(); return; }
    if (t.id === 'am-copyall') {
      if (lastResults.length) copyText(lastResults.map(citation).join('\n\n'), t);
      return;
    }
    if (t.id === 'am-rerun') { doRefine(); return; }
    var ci = t.getAttribute('data-am-copy');
    if (ci !== null && ci !== '') {
      var r = lastResults[Number(ci)];
      if (r) copyText(citation(r), t);
      return;
    }
    var pi = t.getAttribute('data-am-poster');
    if (pi !== null && pi !== '') { makePoster(Number(pi), t); return; }
    var bi = t.getAttribute('data-am-bank');
    if (bi !== null && bi !== '') { submitToBank(Number(bi), t); return; }
    var chi = t.getAttribute('data-am-chip');
    if (chi !== null && chi !== '') {
      var recent = readRecent();
      var q = recent[Number(chi)];
      if (q && claimInput) {
        try { claimInput.value = q; } catch (e) {}
        submit();
      }
    }
  });
  if (claimInput) {
    claimInput.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter') submit();
    });
  }
  if (xAmmo) {
    xAmmo.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter' && ev.target && ev.target.id === 'am-refine') doRefine();
    });
  }
  renderChips();
})();
