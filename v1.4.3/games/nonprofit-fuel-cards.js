/* games/nonprofit-fuel-cards.js  |  PF v1.4.3 | "FUEL THEIR FIGHT" cards.
   Weave #9 (Political Cards Expansion). Share-image cards for the 72 ally
   organizations in the Ally Organizations directory (be/nonprofits-directory,
   v82 migration). Two surfaces, both inside the Ally Organizations pane of
   Political HQ:
     1. Every org card gets a FUEL CARD button (preview + download/share).
     2. A FUEL CARD GENERATOR entry: browse by issue area, pick an ally,
        fuel them.
   Painter: phq-nonprofit (core/share-image-phq.js) — 1080x1350, JOIN THE
   FIGHT standard, FIGHTING AS <CALLSIGN> stamp, no-callsign funnel fallback.
   Every pixel traces to the directory row: name, issue area, one-line
   mission, sanitized external link, disclosure marker (flagged orgs only),
   source + compiled date. Missing fields render '—' — nothing invented.
   COPY (non-negotiable): fuel / support / back their fight. Solicitation
   slang is banned from all site copy — grep the stripped source for it.
   XP: card generation = 0 XP (no create_* leg covers generation — do NOT
   invent one). Card shares ride the EXISTING create_share: leg through the
   existing POSTER SHARE proof flow (poster_share {story_url, proof_url} ->
   +5 XP fixed faucet, NO_MULT family, 2/day, server-derived idempotency key
   create_share:<cshash8>:<devhash8>:<proofhash8>:<chi_day>). No new ledger
   prefixes, no new XP mechanics — the modal links to the existing flow.
   FAIL-SOFT: directory down/empty (v82 not merged yet) -> the generator shows
   "Ally directory unavailable." + RETRY and NO fuel buttons inject — never a
   broken card. Card engine killed/missing -> same treatment, no crash.
   KILL: ?pf_off=card-nonprofit  or  localStorage pf_disabled_v1='["card-nonprofit"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('card-nonprofit')) { return; }
  if (window.pfFuelCardsDone) return;
  window.pfFuelCardsDone = true;

  /* ---- constants (traceable) ---- */
  /* 12 issue areas — exact labels from the directory spec (games/nonprofits.js). */
  var ISSUES = [
    "Voting Rights & Democracy Reform",
    "Labor & Workers' Rights",
    "Reproductive Rights & Abortion Access",
    "Climate & Environment",
    "Racial Justice & Civil Rights",
    "LGBTQ+ Rights",
    "Immigrant Rights",
    "Criminal Justice Reform & Police Accountability",
    "Healthcare Access",
    "Housing & Tenants' Rights",
    "Anti-Poverty & Economic Justice",
    "Government Watchdog & Accountability"
  ];
  /* Source line — the directory itself. Compiled date from the v82 migration
     header + src/nonprofits.js (report compiled 2026-10-05). */
  var DIR_SOURCE = 'THE PROPAGANDA FACTORY ALLY DIRECTORY';
  var DIR_COMPILED = 'OCTOBER 5, 2026';

  var BACKEND = window.PF_BACKEND_URL;

  /* ---- utils ---- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /* EXACT mirror of the pane's npSafeUrl — the card link sanitizer. */
  function fuelSafeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return 'https://' + s;
    return '';
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
  }
  function disclosureOf(r) {
    var d = r.disclosure != null && String(r.disclosure).trim() ? String(r.disclosure).trim()
      : (r.flag != null && String(r.flag).trim() ? String(r.flag).trim()
      : (r.honesty_flag != null && String(r.honesty_flag).trim() ? String(r.honesty_flag).trim() : ''));
    return d;
  }
  function firstIssue(r) {
    var a = String(r.issue_areas == null ? '' : r.issue_areas);
    return a.split(';')[0].trim();
  }
  /* Card data — directory fields only. */
  function cardData(r) {
    return {
      name: String(r.name == null ? '' : r.name),
      issue: firstIssue(r),
      mission: String(r.mission == null ? '' : r.mission),
      website: fuelSafeUrl(r.website),
      disclosure: disclosureOf(r),
      compiled: DIR_COMPILED,
      source: DIR_SOURCE
    };
  }
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFcCb' + Math.floor(Math.random() * 1e9);
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

  /* ---- state ---- */
  var ORGS = null;      /* name -> row */
  var ORG_LIST = [];    /* raw rows, name ASC */
  var LOAD_ERR = false;

  var PAINT_OK = null; /* cached paintability of phq-nonprofit */
  function paintable() {
    if (PAINT_OK !== null) return PAINT_OK;
    try {
      var P = PF.PHQShare;
      if (!P || !P.paint) { PAINT_OK = false; return false; }
      var cv = P.paint('phq-nonprofit', { name: '\u2014', issue: '\u2014', mission: '', website: '', disclosure: '' });
      PAINT_OK = !!cv;
    } catch (e) { PAINT_OK = false; }
    return PAINT_OK;
  }

  /* ---- preview modal ---- */
  function closeModal() {
    try {
      var m = document.getElementById('pf-fc-modal');
      if (m && m.parentNode) m.parentNode.removeChild(m);
    } catch (e) {}
  }
  function openModal(row) {
    closeModal();
    var data = cardData(row);
    var nm = String(row.name || 'Unnamed organization');
    var cv = null;
    try { cv = PF.PHQShare.paint('phq-nonprofit', data); } catch (e) {}
    var imgHtml;
    if (cv) {
      var url = '';
      try { url = cv.toDataURL('image/png'); } catch (e) {}
      imgHtml = url
        ? '<img src="' + url + '" alt="Fuel card for ' + esc(nm) + '" style="width:100%;max-width:420px;display:block;margin:0 auto;border:2px solid #c1121f">'
        : '<div class="pf-fc-note">Card engine hiccup — try again.</div>';
    } else {
      imgHtml = '<div class="pf-fc-note">Card engine unavailable.</div>';
    }
    var wrap = document.createElement('div');
    wrap.id = 'pf-fc-modal';
    wrap.innerHTML =
      '<div class="pf-fc-back"></div>' +
      '<div class="pf-fc-sheet" role="dialog" aria-label="Fuel card preview">' +
      '<div class="pf-fc-head">FUEL CARD <button type="button" class="pf-fc-x" aria-label="Close">\u00d7</button></div>' +
      '<div class="pf-fc-org">' + esc(nm) + '</div>' +
      imgHtml +
      '<div class="pf-fc-btns">' +
      '<button type="button" class="c-btn pf-fc-dl">DOWNLOAD</button>' +
      '<button type="button" class="c-btn pf-fc-sh">SHARE</button>' +
      '</div>' +
      '<div class="pf-fc-note">Fuel their fight. Posted your card publicly? ' +
      'Submit your proof in Creator HQ \u2192 TURN IT INTO AMMUNITION \u2192 POSTER SHARE ' +
      '\u2014 +5 XP per verified share (2/day). XP has no cash value. Stakes are final.</div>' +
      '<div class="pf-fc-src">SOURCE: ' + esc(DIR_SOURCE) + ' \u00b7 COMPILED ' + esc(DIR_COMPILED) + '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    function q(sel) { return wrap.querySelector(sel); }
    q('.pf-fc-x').addEventListener('click', closeModal);
    q('.pf-fc-back').addEventListener('click', closeModal);
    var dl = q('.pf-fc-dl'), sh = q('.pf-fc-sh');
    if (cv && dl) dl.addEventListener('click', function () {
      try { PF.PHQShare.save('phq-nonprofit', data); } catch (e) { toast('Save failed \u2014 try again.'); }
    });
    if (cv && sh) sh.addEventListener('click', function () {
      try { PF.PHQShare.share('phq-nonprofit', data); } catch (e) { toast('Share failed \u2014 try again.'); }
    });
  }

  /* ---- surface 1: decorate the directory's org cards ---- */
  function decorate(pane) {
    if (!paintable()) return; /* engine killed — no buttons, no broken cards */
    var cards = pane.querySelectorAll('.np-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        if (card.getAttribute('data-fc')) return;
        card.setAttribute('data-fc', '1');
        var nmEl = card.querySelector('.np-name');
        var nm = nmEl ? String(nmEl.textContent || '').trim() : '';
        var row = nm && ORGS ? ORGS[nm] : null;
        if (!row) return;
        var b = document.createElement('div');
        b.className = 'np-fuel';
        b.innerHTML = '<button type="button" class="c-btn np-t44 np-fuel-btn">FUEL CARD \u26a1</button>';
        b.querySelector('button').addEventListener('click', function () { openModal(row); });
        var visit = card.querySelector('.np-visit');
        if (visit && visit.parentNode) visit.parentNode.insertBefore(b, visit.nextSibling);
        else card.appendChild(b);
      })(cards[i]);
    }
  }

  /* ---- surface 2: the FUEL CARD GENERATOR (browse by issue area) ---- */
  function genHtml(err) {
    var h = '<div id="pf-fc-gen">' +
      '<h3>FUEL CARD GENERATOR</h3>' +
      '<div class="c-tag">Pick a fight. Fuel an ally.</div>';
    if (err) {
      h += '<div class="pf-fc-note">Ally directory unavailable. ' +
        '<button type="button" class="c-btn np-t44 pf-fc-retry">RETRY</button></div>';
    } else {
      h += '<div class="np-chips" role="group" aria-label="Fuel cards by issue area">';
      for (var i = 0; i < ISSUES.length; i++) {
        h += '<button type="button" class="np-chip" data-fc-issue="' + esc(ISSUES[i]) + '" aria-pressed="false">' + esc(ISSUES[i]) + '</button>';
      }
      h += '</div><div class="pf-fc-orgs"></div>';
    }
    return h + '</div>';
  }
  function mountGenerator(pane) {
    if (document.getElementById('pf-fc-gen')) return;
    var tag = pane.querySelector('.c-tag');
    var d = document.createElement('div');
    d.innerHTML = genHtml(!ORG_LIST.length);
    var gen = d.firstChild;
    if (tag && tag.parentNode) tag.parentNode.insertBefore(gen, tag.nextSibling);
    else pane.insertBefore(gen, pane.firstChild);
    wireGenerator(gen);
  }
  function wireGenerator(gen) {
    var retry = gen.querySelector('.pf-fc-retry');
    if (retry) {
      /* Retry re-fetches the directory, then rebuilds the generator shell. */
      retry.addEventListener('click', function () {
        retry.disabled = true;
        retry.textContent = 'RETRYING\u2026';
        loadDirectory(function () {
          var fresh = document.createElement('div');
          fresh.innerHTML = genHtml(!ORG_LIST.length);
          var nu = fresh.firstChild;
          gen.parentNode.replaceChild(nu, gen);
          wireGenerator(nu);
          var pane = null;
          try { pane = document.getElementById('pf-nonprofits'); } catch (e) {}
          if (pane && ORG_LIST.length && !LOAD_ERR) decorate(pane);
        });
      });
      return;
    }
    var chips = gen.querySelectorAll('[data-fc-issue]');
    var out = gen.querySelector('.pf-fc-orgs');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          for (var j = 0; j < chips.length; j++) chips[j].setAttribute('aria-pressed', 'false');
          chip.setAttribute('aria-pressed', 'true');
          var iss = chip.getAttribute('data-fc-issue') || '';
          var rows = [];
          for (var k = 0; k < ORG_LIST.length; k++) {
            if (firstIssue(ORG_LIST[k]) === iss) rows.push(ORG_LIST[k]);
          }
          var h = '<div class="pf-fc-grid">';
          for (var m = 0; m < rows.length; m++) {
            h += '<button type="button" class="np-chip pf-fc-pick" data-fc-org="' + esc(String(rows[m].name || '')) + '">' +
              esc(String(rows[m].name || 'Unnamed')) + '</button>';
          }
          h += '</div>' + (rows.length ? '' : '<div class="pf-fc-note">No allies filed under this fight yet.</div>');
          out.innerHTML = h;
          var picks = out.querySelectorAll('.pf-fc-pick');
          for (var n = 0; n < picks.length; n++) {
            (function (pk) {
              pk.addEventListener('click', function () {
                var nm = pk.getAttribute('data-fc-org') || '';
                if (ORGS && ORGS[nm]) openModal(ORGS[nm]);
              });
            })(picks[n]);
          }
        });
      })(chips[i]);
    }
  }

  /* ---- styles ---- */
  function mountStyles() {
    if (document.getElementById('pf-fc-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-fc-css';
    st.textContent =
      '#pf-fc-gen{border:1px solid #c1121f;padding:12px;margin:12px 0}' +
      '#pf-fc-gen h3{font-weight:900;font-size:16px;letter-spacing:1px;margin:0 0 4px}' +
      '#pf-fc-gen .np-chip{min-height:44px}' +
      '.pf-fc-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
      '.pf-fc-pick{flex:1 1 40%;text-align:left}' +
      '.pf-fc-note{font-size:13px;color:#c9bfa8;margin:12px 0}' +
      '.pf-fc-src{font-size:11px;color:#8a8378;margin-top:10px}' +
      '.np-fuel{margin-top:8px}' +
      '.np-fuel-btn{width:100%;min-height:44px;font-weight:900;letter-spacing:1px}' +
      '#pf-fc-modal{position:fixed;inset:0;z-index:99999}' +
      '#pf-fc-modal .pf-fc-back{position:absolute;inset:0;background:rgba(0,0,0,.85)}' +
      '#pf-fc-modal .pf-fc-sheet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'width:min(480px,94vw);max-height:92vh;overflow:auto;background:#141414;border:2px solid #c1121f;padding:14px}' +
      '#pf-fc-modal .pf-fc-head{display:flex;justify-content:space-between;align-items:center;' +
      'font-weight:900;letter-spacing:1px;margin-bottom:8px}' +
      '#pf-fc-modal .pf-fc-x{background:none;border:1px solid #f5ead6;color:#f5ead6;' +
      'font-size:20px;min-width:44px;min-height:44px;cursor:pointer}' +
      '#pf-fc-modal .pf-fc-org{font-weight:900;margin-bottom:10px;overflow-wrap:anywhere}' +
      '#pf-fc-modal .pf-fc-btns{display:flex;gap:8px;margin-top:12px}' +
      '#pf-fc-modal .pf-fc-btns .c-btn{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center}';
    document.head.appendChild(st);
  }

  /* ---- data load (fail-soft) ---- */
  function loadDirectory(cb) {
    api('nonprofits_list', {}, function (j) {
      var rows = null;
      if (j && j.ok && j.nonprofits && j.nonprofits.length) rows = j.nonprofits;
      else if (j && j.ok && j.orgs && j.orgs.length) rows = j.orgs;
      ORG_LIST = rows || [];
      ORGS = {};
      for (var i = 0; i < ORG_LIST.length; i++) {
        var nm = String(ORG_LIST[i].name || '').trim();
        if (nm && !ORGS[nm]) ORGS[nm] = ORG_LIST[i];
      }
      LOAD_ERR = !ORG_LIST.length;
      cb();
    });
  }

  /* ---- boot ---- */
  function mount(pane) {
    mountStyles();
    mountGenerator(pane);
    decorate(pane);
    /* Filter/search re-renders replace #xNonprofits content — re-decorate. */
    try {
      var list = document.getElementById('xNonprofits');
      if (list && window.MutationObserver && !list.getAttribute('data-fc-obs')) {
        list.setAttribute('data-fc-obs', '1');
        new MutationObserver(function () { decorate(pane); }).observe(list, { childList: true, subtree: true });
      }
    } catch (e) {}
  }
  function boot(force) {
    var tries = 0;
    (function tick() {
      tries++;
      var pane = null;
      try { pane = document.getElementById('pf-nonprofits'); } catch (e) {}
      var engine = paintable();
      if (pane && engine && ORG_LIST.length && !LOAD_ERR) { mount(pane); return; }
      if (pane && engine && ORG_LIST.length === 0 && LOAD_ERR) {
        /* directory failed — generator shows "unavailable", no fuel buttons */
        mountStyles();
        mountGenerator(pane);
        return;
      }
      if (pane && !engine && tries > 6) {
        /* card engine missing/killed — show the generator shell anyway so the
           failure is visible, not silent; buttons stay hidden. */
        mountStyles();
        mountGenerator(pane);
        return;
      }
      if (tries < 60) setTimeout(tick, 500);
    })();
  }

  /* The pane mounts from bundle-hq on /political-hq; poll for it. */
  var waited = 0;
  (function waitPane() {
    waited++;
    var pane = null;
    try { pane = document.getElementById('pf-nonprofits'); } catch (e) {}
    if (pane && !ORG_LIST.length && !LOAD_ERR) {
      loadDirectory(function () { boot(); });
      return;
    }
    if (waited < 60) setTimeout(waitPane, 500);
  })();
})();
