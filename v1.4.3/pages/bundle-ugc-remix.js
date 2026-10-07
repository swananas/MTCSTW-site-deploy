/* pages/bundle-ugc-remix.js | PF v1.4.3 | UGC STORY REMIXER (fe/ugc-story-remixer)
   CEO directive 2026-10-07 "Let it blossom": users take Extraction Engine
   stories and add their own evidence + commentary, then publish a
   shareable page.
   Squarespace page /remix carries <div id="pf-ugc-remix"></div>
   (CEO hand-step: create the page + Code block).
   Modes:  ?r=<rx_id> -> shareable remix page (frozen facts + evidence + opinion)
           (default)  -> published-remix feed + composer
   RULES (load-bearing):
   - Extraction data is IMMUTABLE. The remix page renders the server-frozen
     snapshot (story text, headline numbers, citations) as uneditable
     "SOURCED FACTS". The client never submits story/headline values; the
     backend re-freezes from a live extraction_profile at publish time.
   - Evidence MUST be linked/sourced: every item requires an http(s) URL.
     Unsourced claims are never presented as fact — sections are labeled
     "USER-SOURCED EVIDENCE" and commentary is always "OPINION".
   - ZERO XP for viewing, remixing, or sharing — this silo never touches
     XP mechanics.
   - Sticky web: every remix page links back to the source extraction story
     and its related Receipts/town/index neighbors.
   Design: mobile-first, clean, PF red-on-black matching the Extraction
   Engine. Kill: ?pf_off=ugcremix or localStorage pf_disabled_v1='["ugcremix"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfUgcRemixDone) return;
  if (PF && PF.skip('ugcremix')) return;
  var host = document.getElementById('pf-ugc-remix');
  if (!host) return;
  if (isEditor()) return;
  window.pfUgcRemixDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      return !!(b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing')));
    } catch (e) { return false; }
  }
  function err(m, e) { try { PF && PF.error('ugcremix', m + ' :: ' + (e && e.message || e)); } catch (x) {} }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtUsd(n) {
    n = Number(n);
    if (!isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtInt(n) {
    n = Number(n);
    return isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
  }
  function fmtDate(ms) {
    try { return new Date(Number(ms)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function validUrl(v) {
    var s = String(v || '').trim();
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s) ? s : null;
  }

  /* ---------- backend (JSONP reads + JSON POSTs, same rail contract) ---------- */
  var BACKEND = null;
  try { BACKEND = window.PF_BACKEND_URL; } catch (e) {}
  function get(action, params, cb) {
    var done = false;
    function fin(d) { if (!done) { done = true; try { cb(d); } catch (e) { err('cb', e); } } }
    if (!BACKEND) { fin(null); return; }
    var name = 'pfRxCb' + Math.floor(Math.random() * 1e9);
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + name;
    var s = document.createElement('script');
    window[name] = function (d) { cleanup(); fin(d); };
    s.onerror = function () { cleanup(); fin(null); };
    function cleanup() { try { delete window[name]; } catch (e) {} if (s.parentNode) s.parentNode.removeChild(s); }
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { cleanup(); fin(null); }, 12000);
  }
  function post(body, cb) {
    try {
      if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, function (d) { try { cb(d); } catch (e) {} }); return; }
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) { try { cb(d); } catch (e) {} })
        .catch(function () { cb(null); });
    } catch (e) { cb(null); }
  }

  /* ---------- CSS (mobile-first, clean, PF red-on-black) ---------- */
  var CSS =
    '.pf-rx{font-family:Arial,Helvetica,sans-serif;color:#f5ead6;max-width:760px;margin:0 auto}' +
    '.pf-rx-h{text-align:center;margin:6px 0 14px}' +
    '.pf-rx-k{font:700 11px Arial;letter-spacing:3px;color:#c1121f;text-transform:uppercase}' +
    '.pf-rx-t{font:900 26px "Arial Black",Arial,sans-serif;color:#fff;margin:4px 0}' +
    '.pf-rx-s{font-size:13px;color:#c9bfa8;line-height:1.5}' +
    '.pf-rx-card{background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin:0 0 12px}' +
    '.pf-rx-co{font:900 18px "Arial Black",Arial,sans-serif;color:#fff;margin:0 0 6px}' +
    '.pf-rx-xc{font-size:14px;color:#d8cfb8;line-height:1.55}' +
    '.pf-rx-meta{font-size:11px;color:#8f8672;margin-top:8px}' +
    '.pf-rx-link{display:inline-block;margin-top:8px;color:#c1121f;font:700 13px Arial;text-decoration:none;letter-spacing:1px}' +
    '.pf-rx-link:hover{text-decoration:underline}' +
    '.pf-rx-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;font:900 14px Arial;' +
    'letter-spacing:2px;padding:13px 22px;cursor:pointer;width:100%;margin:8px 0}' +
    '.pf-rx-btn:disabled{opacity:.55;cursor:wait}' +
    '.pf-rx-btn2{background:#1a0505;color:#f5ead6;border:1px solid #c1121f;border-radius:6px;' +
    'font:700 12px Arial;letter-spacing:1px;padding:11px 16px;cursor:pointer;margin:8px 0;width:100%}' +
    '.pf-rx-btn3{background:transparent;color:#8f8672;border:1px solid #2a2a2a;border-radius:6px;' +
    'font:700 12px Arial;padding:9px 14px;cursor:pointer}' +
    '.pf-rx-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}' +
    '.pf-rx-num{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:6px;padding:8px 4px;text-align:center}' +
    '.pf-rx-fig{font:900 17px Arial,sans-serif;color:#fff}' +
    '.pf-rx-lab{font-size:10px;letter-spacing:1px;color:#c9bfa8;text-transform:uppercase;margin-top:3px}' +
    '.pf-rx-src{font-size:11px;color:#8f8672;margin-top:8px;line-height:1.4}' +
    '.pf-rx-story{font-size:15px;line-height:1.55;color:#f5ead6;background:#1a0505;' +
    'border:1px solid #c1121f;border-radius:8px;padding:14px;margin:12px 0}' +
    '.pf-rx-lock{font:700 10px Arial;letter-spacing:2px;color:#c1121f;text-transform:uppercase;margin:0 0 8px}' +
    '.pf-rx-lock:before{content:"LOCKED: "}' +
    '.pf-rx-op{font:700 10px Arial;letter-spacing:2px;color:#e8b64c;text-transform:uppercase;margin:0 0 8px}' +
    '.pf-rx-ev{font:700 10px Arial;letter-spacing:2px;color:#7ec8e3;text-transform:uppercase;margin:0 0 8px}' +
    '.pf-rx-evi{background:#101010;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin:0 0 10px}' +
    '.pf-rx-evt{font:700 14px Arial;color:#fff;margin:0 0 4px}' +
    '.pf-rx-evn{font-size:13px;color:#d8cfb8;line-height:1.5;margin:6px 0 0}' +
    '.pf-rx-chip{display:inline-block;font:700 10px Arial;letter-spacing:1px;padding:2px 8px;' +
    'border-radius:10px;margin:0 6px 4px 0;text-transform:uppercase}' +
    '.pf-rx-k-link{background:#0d3b1e;color:#7ee2a0}.pf-rx-k-doc{background:#0d2b3b;color:#7ec8e3}.pf-rx-k-photo{background:#3b2a0d;color:#f0c060}' +
    '.pf-rx-web{background:#0d0d0d;border:1px dashed #c1121f;border-radius:8px;padding:12px 14px;margin:12px 0}' +
    '.pf-rx-web h4{margin:0 0 8px;font:700 12px Arial;letter-spacing:2px;color:#c1121f}' +
    '.pf-rx-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.pf-rx-chipbtn{background:#1a0505;border:1px solid #c1121f;color:#f5ead6;border-radius:16px;' +
    'padding:8px 14px;font:700 12px Arial;text-decoration:none}' +
    '.pf-rx-f textarea,.pf-rx-f input,.pf-rx-f select{width:100%;box-sizing:border-box;background:#0d0d0d;' +
    'border:1px solid #444;color:#fff;border-radius:6px;padding:11px;font-size:15px;margin:6px 0}' +
    '.pf-rx-f label{font:700 11px Arial;letter-spacing:2px;color:#c9bfa8;text-transform:uppercase;display:block;margin:10px 0 2px}' +
    '.pf-rx-step{font:700 11px Arial;letter-spacing:2px;color:#c1121f;margin:14px 0 4px;text-transform:uppercase}' +
    '.pf-rx-err{color:#ff6b6b;font-size:13px;margin:8px 0;line-height:1.4}' +
    '.pf-rx-ok{color:#7ee2a0;font-size:13px;margin:8px 0;line-height:1.4}' +
    '.pf-rx-note{font-size:12px;color:#8f8672;line-height:1.5;margin:8px 0}' +
    '.pf-rx-spin{text-align:center;color:#8f8672;padding:28px 0;font-size:13px}' +
    '.pf-rx-quote{border-left:4px solid #e8b64c;background:#151310;border-radius:0 8px 8px 0;' +
    'padding:14px;margin:12px 0;font-size:15px;line-height:1.55;color:#f5ead6}' +
    '.pf-rx-flag{font-size:12px;color:#8f8672;text-align:center;margin:14px 0 0}' +
    '.pf-rx-flag a{color:#8f8672;text-decoration:underline;cursor:pointer}';
  function injectCss() {
    if (document.getElementById('pf-rx-css')) return;
    var s = document.createElement('style');
    s.id = 'pf-rx-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px Arial;padding:12px 22px;border:2px solid #fff;z-index:99999;border-radius:6px';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }

  /* ---------- shared bits ---------- */
  function header() {
    return '<div class="pf-rx-h"><div class="pf-rx-k">THE PROPAGANDA FACTORY</div>' +
      '<div class="pf-rx-t">STORY REMIXER</div>' +
      '<div class="pf-rx-s">Sourced stories, citizen evidence. The facts are frozen — the fight is yours.</div></div>';
  }
  function numRow(h) {
    return '<div class="pf-rx-nums">' +
      '<div class="pf-rx-num"><div class="pf-rx-fig">' + fmtUsd(h.contracts_usd) + '</div><div class="pf-rx-lab">Federal awards</div></div>' +
      '<div class="pf-rx-num"><div class="pf-rx-fig">' + fmtInt(h.osha_violations) + '</div><div class="pf-rx-lab">OSHA violations</div></div>' +
      '<div class="pf-rx-num"><div class="pf-rx-fig">' + fmtUsd(h.wagetheft_usd) + '</div><div class="pf-rx-lab">Wage theft</div></div></div>';
  }
  function citeLines(h) {
    var out = '';
    if (h.contracts_citation) out += '<div class="pf-rx-src">SOURCE: ' + esc(h.contracts_citation) + '</div>';
    if (h.osha_citation) out += '<div class="pf-rx-src">SOURCE: ' + esc(h.osha_citation) + '</div>';
    if (h.wagetheft_citation) out += '<div class="pf-rx-src">SOURCE: ' + esc(h.wagetheft_citation) + '</div>';
    return out;
  }
  function kindChip(k) {
    var cls = k === 'doc' ? 'pf-rx-k-doc' : (k === 'photo' ? 'pf-rx-k-photo' : 'pf-rx-k-link');
    return '<span class="pf-rx-chip ' + cls + '">' + esc(k) + '</span>';
  }
  function qs(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search || '');
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  /* ================= FEED + COMPOSER ================= */
  function renderFeed() {
    host.innerHTML = header() +
      '<button class="pf-rx-btn" id="rx-start">REMIX A STORY</button>' +
      '<div id="rx-feed"><div class="pf-rx-spin">Loading published remixes...</div></div>';
    var startBtn = document.getElementById('rx-start');
    if (startBtn) startBtn.onclick = function () { renderComposer(); };
    get('remix_feed', { limit: 20 }, function (d) {
      var feed = document.getElementById('rx-feed');
      if (!feed) return;
      if (!d || !d.ok) {
        feed.innerHTML = '<div class="pf-rx-card"><div class="pf-rx-note">Couldn\'t load the remix feed right now. Tap REMIX A STORY to start one anyway.</div></div>';
        return;
      }
      var items = d.items || [];
      if (!items.length) {
        feed.innerHTML = '<div class="pf-rx-card"><div class="pf-rx-note">' +
          esc(d.note || 'No remixes published yet — be the first.') + '</div>' +
          '<button class="pf-rx-btn2" id="rx-start2">PUBLISH THE FIRST REMIX</button></div>';
        var b2 = document.getElementById('rx-start2');
        if (b2) b2.onclick = function () { renderComposer(); };
        return;
      }
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var it = items[i], ev = it.evidence || [];
        html += '<div class="pf-rx-card">' +
          '<div class="pf-rx-co">' + esc(it.company) + '</div>' +
          numRow(it.headlines || {}) +
          '<div class="pf-rx-meta">' + esc(String(ev.length)) + ' piece' + (ev.length === 1 ? '' : 's') +
          ' of user evidence' + (it.callsign ? ' · remixed by ' + esc(it.callsign) : '') +
          ' · ' + esc(fmtDate(it.created_at)) + '</div>' +
          (it.commentary ? '<div class="pf-rx-xc" style="margin-top:8px">&ldquo;' + esc(String(it.commentary).slice(0, 220)) +
            (it.commentary.length > 220 ? '…' : '') + '&rdquo;</div>' : '') +
          '<a class="pf-rx-link" href="/remix?r=' + esc(it.id) + '">VIEW THE REMIX</a></div>';
      }
      feed.innerHTML = html;
    });
  }

  /* ---- composer: story pick -> evidence -> take -> publish ---- */
  var C = null; /* composer state */
  function renderComposer() {
    C = { step: 1, stories: [], story: null, evidence: [], commentary: '', callsign: '' };
    host.innerHTML = header() + '<div id="rx-c"></div>';
    step1();
  }
  function composerErr(m) {
    var e = document.getElementById('rx-cerr');
    if (e) e.textContent = m || '';
  }
  function step1() {
    var el = document.getElementById('rx-c');
    if (!el) return;
    el.innerHTML =
      '<div class="pf-rx-step">STEP 1 — PICK AN EXTRACTION STORY</div>' +
      '<div class="pf-rx-f"><label>Published stories</label>' +
      '<select id="rx-sel"><option value="">— pick a story —</option></select>' +
      '<div class="pf-rx-note">Or look up any company on the spot:</div>' +
      '<input id="rx-lookup" placeholder="Company name" maxlength="120"/>' +
      '<button class="pf-rx-btn2" id="rx-gobtn">LOOK UP</button>' +
      '<div id="rx-cerr" class="pf-rx-err"></div>' +
      '<div id="rx-preview"></div>' +
      '<div id="rx-nav1"></div></div>';
    get('extraction_feed', { limit: 50 }, function (d) {
      var sel = document.getElementById('rx-sel');
      if (!sel) return;
      var items = (d && d.ok && d.items) || [];
      C.stories = items;
      for (var i = 0; i < items.length; i++) {
        var o = document.createElement('option');
        o.value = items[i].slug;
        o.textContent = items[i].company;
        sel.appendChild(o);
      }
    });
    var sel = document.getElementById('rx-sel');
    sel.onchange = function () {
      composerErr('');
      var s = null;
      for (var i = 0; i < C.stories.length; i++) if (C.stories[i].slug === sel.value) s = C.stories[i];
      if (s) pickStory({ slug: s.slug, display_name: s.company, story: s.story, headlines: s.headlines || {} });
    };
    document.getElementById('rx-gobtn').onclick = function () {
      var q = document.getElementById('rx-lookup').value.trim();
      if (!q) { composerErr('Type a company name to look up.'); return; }
      var pv = document.getElementById('rx-preview');
      pv.innerHTML = '<div class="pf-rx-spin">Running extraction...</div>';
      get('extraction_generate', { company: q }, function (d) {
        if (!d || !d.ok || !d.entity) {
          pv.innerHTML = '';
          composerErr('Couldn\'t extract that company. Try another name.');
          return;
        }
        pv.innerHTML = '';
        pickStory({ slug: d.entity.slug, display_name: d.entity.display_name, story: d.story, headlines: d.headlines || {} });
      });
    };
  }
  function pickStory(s) {
    C.story = s;
    var pv = document.getElementById('rx-preview');
    var nav = document.getElementById('rx-nav1');
    pv.innerHTML = '<div class="pf-rx-card" style="margin-top:12px">' +
      '<div class="pf-rx-lock">Frozen sourced facts — you can\'t edit these</div>' +
      '<div class="pf-rx-co">' + esc(s.display_name) + '</div>' +
      numRow(s.headlines || {}) +
      '<div class="pf-rx-story" style="font-size:14px">' + esc(s.story || 'No sourced figures yet.') + '</div></div>';
    nav.innerHTML = '<button class="pf-rx-btn" id="rx-to2">ADD MY EVIDENCE</button>';
    document.getElementById('rx-to2').onclick = step2;
  }
  function step2() {
    C.step = 2;
    if (C.evidence.length === 0) C.evidence.push({ kind: 'link', url: '', title: '', note: '' });
    drawEvidence();
  }
  function drawEvidence() {
    var el = document.getElementById('rx-c');
    if (!el) return;
    var html = '<div class="pf-rx-step">STEP 2 — ADD YOUR EVIDENCE (ALL MUST BE LINKED)</div>' +
      '<div class="pf-rx-note">Links, documents, photos — each needs a source URL. No URL, no publish.</div>' +
      '<div id="rx-evlist"></div>' +
      '<button class="pf-rx-btn2" id="rx-addev">+ ADD ANOTHER (' + C.evidence.length + '/8)</button>' +
      '<div id="rx-cerr" class="pf-rx-err"></div>' +
      '<button class="pf-rx-btn" id="rx-to3">WRITE MY TAKE</button>' +
      '<button class="pf-rx-btn3" id="rx-back1">BACK</button>';
    el.innerHTML = html;
    var list = document.getElementById('rx-evlist');
    function redraw() {
      list.innerHTML = '';
      for (var i = 0; i < C.evidence.length; i++) (function (i) {
        var e = C.evidence[i];
        var d = document.createElement('div');
        d.className = 'pf-rx-evi pf-rx-f';
        d.innerHTML = '<div class="pf-rx-ev">Evidence ' + (i + 1) + '</div>' +
          '<label>Kind</label><select data-k="kind">' +
          '<option value="link"' + (e.kind === 'link' ? ' selected' : '') + '>Link</option>' +
          '<option value="doc"' + (e.kind === 'doc' ? ' selected' : '') + '>Document</option>' +
          '<option value="photo"' + (e.kind === 'photo' ? ' selected' : '') + '>Photo</option></select>' +
          '<label>URL (required)</label><input data-k="url" placeholder="https://…" value="' + esc(e.url) + '" maxlength="500"/>' +
          '<label>Title (required)</label><input data-k="title" placeholder="What is this evidence?" value="' + esc(e.title) + '" maxlength="140"/>' +
          '<label>Note (optional)</label><input data-k="note" placeholder="What did you find here?" value="' + esc(e.note) + '" maxlength="300"/>' +
          (C.evidence.length > 1 ? '<button class="pf-rx-btn3" data-rm="1">Remove this</button>' : '');
        var fields = d.querySelectorAll('[data-k]');
        for (var f = 0; f < fields.length; f++) {
          (function (fld) {
            fld.oninput = fld.onchange = function () { e[fld.getAttribute('data-k')] = fld.value; };
          })(fields[f]);
        }
        var rm = d.querySelector('[data-rm]');
        if (rm) rm.onclick = function () { C.evidence.splice(i, 1); redraw(); drawEvidenceCount(); };
        list.appendChild(d);
      })(i);
    }
    function drawEvidenceCount() {
      var b = document.getElementById('rx-addev');
      if (b) b.textContent = '+ ADD ANOTHER (' + C.evidence.length + '/8)';
    }
    redraw();
    document.getElementById('rx-addev').onclick = function () {
      if (C.evidence.length >= 8) { composerErr('Max 8 evidence items per remix.'); return; }
      composerErr('');
      C.evidence.push({ kind: 'link', url: '', title: '', note: '' });
      redraw(); drawEvidenceCount();
    };
    document.getElementById('rx-back1').onclick = function () { C.step = 1; renderComposerKeep(); };
    document.getElementById('rx-to3').onclick = function () {
      for (var i = 0; i < C.evidence.length; i++) {
        var e = C.evidence[i];
        if (!validUrl(e.url)) { composerErr('Evidence ' + (i + 1) + ' needs a valid http(s) URL.'); return; }
        if (!String(e.title).trim()) { composerErr('Evidence ' + (i + 1) + ' needs a title.'); return; }
      }
      composerErr('');
      step3();
    };
  }
  function renderComposerKeep() {
    var el = document.getElementById('rx-c');
    if (!el) return;
    step1();
    if (C.story) pickStory(C.story);
  }
  function step3() {
    C.step = 3;
    var el = document.getElementById('rx-c');
    if (!el) return;
    el.innerHTML =
      '<div class="pf-rx-step">STEP 3 — YOUR TAKE (OPINION)</div>' +
      '<div class="pf-rx-note">This is labeled as your opinion on the published page — not a verified fact.</div>' +
      '<div class="pf-rx-f">' +
      '<label>Your take</label>' +
      '<textarea id="rx-take" rows="5" maxlength="1500" placeholder="What does this evidence add to the story?">' +
      esc(C.commentary) + '</textarea>' +
      '<label>Callsign (optional — how you\'ll be credited)</label>' +
      '<input id="rx-cs" placeholder="e.g. FACTCHECK-7" maxlength="40" value="' + esc(C.callsign) + '"/>' +
      '<div id="rx-cerr" class="pf-rx-err"></div>' +
      '<button class="pf-rx-btn" id="rx-pub">PUBLISH MY REMIX</button>' +
      '<button class="pf-rx-btn3" id="rx-back2">BACK</button></div>';
    document.getElementById('rx-back2').onclick = step2;
    document.getElementById('rx-pub').onclick = function () {
      var take = document.getElementById('rx-take').value.trim();
      C.callsign = document.getElementById('rx-cs').value.trim();
      if (!take) { composerErr('Write your take — it\'s required.'); return; }
      var btn = document.getElementById('rx-pub');
      btn.disabled = true; btn.textContent = 'PUBLISHING...';
      post({ type: 'remix', remix_action: 'remix_submit',
        story_slug: C.story.slug, evidence: C.evidence,
        commentary: take, callsign: C.callsign }, function (d) {
        if (!d || !d.ok) {
          btn.disabled = false; btn.textContent = 'PUBLISH MY REMIX';
          composerErr(d && d.err ? d.err : 'Publish failed — try again.');
          return;
        }
        toast('LOCKED IN — your remix is live.');
        setTimeout(function () {
          try { window.location.href = d.share_url; } catch (e) {}
        }, 600);
      });
    };
  }

  /* ================= SHAREABLE REMIX PAGE ================= */
  function renderRemix(id) {
    host.innerHTML = header() + '<div id="rx-page"><div class="pf-rx-spin">Loading remix...</div></div>';
    get('remix_get', { id: id }, function (d) {
      var pg = document.getElementById('rx-page');
      if (!pg) return;
      if (!d || !d.ok) {
        pg.innerHTML = '<div class="pf-rx-card"><div class="pf-rx-note">Remix not found. It may have been removed.</div>' +
          '<a class="pf-rx-link" href="/remix">BACK TO THE REMIX FEED</a></div>';
        return;
      }
      var it = d.item, h = it.headlines || {}, ev = it.evidence || [];
      var html =
        /* --- immutable sourced facts --- */
        '<div class="pf-rx-card">' +
        '<div class="pf-rx-lock">Sourced facts — frozen from the Extraction Engine, can\'t be changed</div>' +
        '<div class="pf-rx-co">' + esc(it.company) + '</div>' +
        numRow(h) +
        '<div class="pf-rx-story">' + esc(it.story || 'No sourced figures on file yet.') + '</div>' +
        citeLines(h) +
        '<a class="pf-rx-link" href="' + esc(it.profile_url) + '">READ THE FULL EXTRACTION STORY</a></div>' +
        /* --- user evidence --- */
        '<div class="pf-rx-card">' +
        '<div class="pf-rx-ev">User-sourced evidence — added by the community, not verified by PF</div>' +
        evidenceHtml(ev) +
        '</div>' +
        /* --- opinion --- */
        '<div class="pf-rx-card">' +
        '<div class="pf-rx-op">Opinion — this is the remixer\'s take, not a verified fact</div>' +
        '<div class="pf-rx-quote">&ldquo;' + esc(it.commentary) + '&rdquo;</div>' +
        '<div class="pf-rx-meta">' + (it.callsign ? 'Remixed by ' + esc(it.callsign) + ' · ' : '') +
        esc(fmtDate(it.created_at)) + '</div></div>' +
        /* --- sticky web --- */
        '<div id="rx-web"></div>' +
        /* --- share --- */
        '<button class="pf-rx-btn" id="rx-share">SHARE THIS REMIX</button>' +
        '<a class="pf-rx-link" href="/remix" style="display:block;text-align:center">ALL REMIXES</a>' +
        '<div class="pf-rx-flag">See a problem? <a id="rx-flag">Flag this remix</a></div>';
      pg.innerHTML = html;
      document.getElementById('rx-share').onclick = function () { sharePoster(it); };
      document.getElementById('rx-flag').onclick = function () {
        var reason = '';
        try { reason = String(window.prompt('Why are you flagging this remix?', '') || '').slice(0, 200); } catch (e) {}
        if (!reason.trim()) return;
        post({ type: 'remix', remix_action: 'remix_report', id: it.id, reason: reason.trim() }, function (r) {
          toast(r && r.ok ? 'Flag recorded — thank you.' : 'Couldn\'t record the flag.');
        });
      };
      loadStickyWeb(it);
    });
  }
  function evidenceHtml(ev) {
    if (!ev.length) return '<div class="pf-rx-note">No evidence items.</div>';
    var html = '';
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      html += '<div class="pf-rx-evi">' + kindChip(e.kind || 'link') +
        '<div class="pf-rx-evt">' + esc(e.title) + '</div>' +
        '<a class="pf-rx-link" style="margin-top:4px" href="' + esc(e.url) +
        '" target="_blank" rel="noopener">' + esc(String(e.url).slice(0, 60)) +
        (String(e.url).length > 60 ? '...' : '') + '</a>' +
        (e.note ? '<div class="pf-rx-evn">' + esc(e.note) + '</div>' : '') + '</div>';
    }
    return html;
  }
  function loadStickyWeb(it) {
    var chips = '<a class="pf-rx-chipbtn" href="/receipt">RECEIPTS</a>' +
      '<a class="pf-rx-chipbtn" href="/extraction">EXTRACTION ENGINE</a>';
    get('extraction_profile', { company: it.story_slug }, function (d) {
      var links = (d && d.ok && d.web) ? d.web : null;
      var inner = chips;
      if (links && links.town_links && links.town_links.length) {
        for (var i = 0; i < Math.min(links.town_links.length, 4); i++) {
          inner += '<a class="pf-rx-chipbtn" href="' + esc(links.town_links[i].url) + '">' +
            esc(links.town_links[i].state) + ' TOWN</a>';
        }
      }
      if (links && links.index_url) inner += '<a class="pf-rx-chipbtn" href="' + esc(links.index_url) + '">CORRUPTION INDEX</a>';
      var w = document.getElementById('rx-web');
      if (w) w.innerHTML = '<div class="pf-rx-web"><h4>STICKY WEB</h4><div class="pf-rx-chips">' + inner + '</div></div>';
    });
  }

  /* ---------- remix share poster (1080x1350) ---------- */
  function wrap(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = (line ? line + ' ' : '') + words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintRemixPoster(it) {
    var cv, x;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = 1080; cv.height = 1350;
    try { x = cv.getContext('2d'); } catch (e2) { return null; }
    if (!x) return null;
    var h = it.headlines || {}, ev = it.evidence || [];
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, 1048, 1318);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, 976, 1246);
    x.textAlign = 'center';
    var y = 170;
    x.fillStyle = '#c1121f'; x.font = '700 34px Arial,sans-serif';
    x.fillText('STORY REMIX', 540, y); y += 100;
    x.fillStyle = '#ffffff'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    var nl = wrap(x, String(it.company || 'UNKNOWN').toUpperCase(), 900);
    for (var i = 0; i < Math.min(nl.length, 3); i++) { x.fillText(nl[i], 540, y); y += 80; }
    y += 40;
    var rows = [
      ['FEDERAL AWARDS', h.contracts_usd != null ? fmtUsd(h.contracts_usd) : '—'],
      ['OSHA VIOLATIONS', h.osha_violations != null ? fmtInt(h.osha_violations) : '—'],
      ['WAGE-THEFT BACK PAY', h.wagetheft_usd != null ? fmtUsd(h.wagetheft_usd) : '—']
    ];
    for (var r = 0; r < rows.length; r++) {
      x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
      x.fillText(rows[r][0], 540, y); y += 62;
      x.fillStyle = '#ffffff'; x.font = '900 84px "Arial Black",Arial,sans-serif';
      x.fillText(rows[r][1], 540, y); y += 120;
    }
    /* user's evidence highlight */
    x.fillStyle = '#7ec8e3'; x.font = '700 28px Arial,sans-serif';
    x.fillText('USER-SOURCED EVIDENCE x' + ev.length, 540, y); y += 56;
    if (ev.length) {
      x.fillStyle = '#f5ead6'; x.font = '400 30px Arial,sans-serif';
      var tl = wrap(x, '"' + (ev[0].title || '') + '"', 900);
      for (var t2 = 0; t2 < Math.min(tl.length, 2); t2++) { x.fillText(tl[t2], 540, y); y += 44; }
    }
    /* share-image CTA standard: JOIN THE FIGHT. above/below MTCSTW.COM */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', 540, 1350 - 168);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1350 - 108);
    return cv;
  }
  function sharePoster(it) {
    var cv = paintRemixPoster(it);
    if (!cv) { toast('Poster failed — try again.'); return; }
    var fname = 'remix-' + (it.story_slug || 'story') + '.png';
    function download() {
      try {
        var a = document.createElement('a');
        a.download = fname;
        a.href = cv.toDataURL('image/png');
        document.body.appendChild(a); a.click();
        setTimeout(function () { a.parentNode && a.parentNode.removeChild(a); }, 500);
      } catch (ex) { err('download', ex); }
    }
    try {
      if (navigator.share) {
        cv.toBlob(function (blob) {
          if (!blob) { download(); return; }
          var file = new File([blob], fname, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Story Remix: ' + (it.company || ''),
              text: (it.company || '') + ' — sourced story, citizen evidence. mtcstw.com/remix?r=' + it.id })
              .catch(function () { download(); });
          } else download();
        }, 'image/png');
      } else download();
    } catch (ex) { download(); }
  }

  /* ================= boot ================= */
  injectCss();
  var rid = qs('r');
  if (rid) renderRemix(rid);
  else renderFeed();
})();
