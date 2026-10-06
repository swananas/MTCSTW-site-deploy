/* core/money-page.js  |  PF v1.4.3 | FOLLOW THE MONEY — page + tab shell.
   Context-aware mount for the money suite (phq-hub-ia-spec §4 — no code
   fork):
     - <div id="pf-money"> present        -> FULL-PAGE shell (the /follow-the-money page)
     - only <div id="pf-political-hq">     -> INTERIM MONEY TAB (compact, lazy)
     - PHQ context + money_page_url set   -> one-cycle REDIRECT CARD to /follow-the-money
   The /follow-the-money page itself is a CEO hand-step (Squarespace page + #pf-money
   Code block + nav entry; BLOSSOM M1 2026-10-06: /money redirects here). Until it exists, nothing here is blocked: the
   suite ships as the 6th hub tab inside /political-hq.
   Cutover: Release Eng sets the `money_page_url` site-config value (default
   empty) in the same push that adds the loader detection entry + the
   'pf-money' PAGE_ORDERS mapping. No silo-id changes — every ?pf_off= id
   below survives the move, so operator kill state carries over.
   Sections (kill ids): money-macro · money-fec-donors · money-vote · wallshame ·
   pac-alerts · trades-tab · money-small-dollar · corp-card · ledgers ·
   boycotts · money-deep8 (9 ids) · master kill: ?pf_off=money.
   Copy contract: "received $X from" enforced, never "bought by"; every
   figure carries SOURCE + DATA AS OF; juxtaposition cards always carry the
   correlation line. Hub mission + tab label copy is PROVISIONAL — Psych veto.
   No XP anywhere on this frontend (viewing = 0; shares ride the existing
   create_share: backend leg). War Bonds = 0 XP (standing rule).
   KILL: ?pf_off=money (master) or per-section ids above. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  /* Master kill: ?pf_off=money darkens the entire suite (FE review #8). */
  if (PF.skip('money')) { return; }
  if (window.pfMoneyPageDone) return;
  window.pfMoneyPageDone = true;

  /* Master kill helper (FE review #8): ?pf_off=money darkens everything. */
  function skip(id) { return PF.skip('money') || PF.skip(id); }

  var BACKEND = window.PF_BACKEND_URL;
  var PHQ = 'https://www.mtcstw.com/political-hq';
  var CREATE = 'https://www.mtcstw.com/create';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function err(m) { try { if (PF && PF.error) PF.error('money-page', m); } catch (e) {} }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
    } catch (e) {}
    return false;
  }

  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMoneyPageCb' + Math.floor(Math.random() * 1e9);
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

  function qs(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search || '');
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  var CSS = [
    '.pf-mp{max-width:960px;margin:0 auto;padding:8px 0 24px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-mp-kicker{font-weight:700;font-size:13px;letter-spacing:6px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-mp-title{font-weight:900;font-size:34px;text-align:center;margin:0 0 6px;letter-spacing:2px}',
    '.pf-mp-mission{font-size:15px;color:#c9bfa8;text-align:center;margin:0 0 20px;font-style:italic}',
    '.pf-mp-sec{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:18px;margin-bottom:14px}',
    '.pf-mp-sec h3{font-weight:900;font-size:19px;letter-spacing:2px;margin:0 0 4px;color:#f5ead6}',
    '.pf-mp-sec .pf-mp-sub{font-size:13px;color:#c9bfa8;margin:0 0 12px}',
    '.pf-mp-pick{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}',
    '.pf-mp-pick input{flex:1;min-width:180px;background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:6px;padding:10px 12px;font-size:15px}',
    '.pf-mp-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:900;letter-spacing:1px;cursor:pointer;font-size:14px}',
    '.pf-mp-btn.ghost{background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6}',
    '.pf-mp-cor{font-size:13px;color:#c9bfa8;border-top:1px solid #2a2a2a;margin-top:12px;padding-top:10px;font-style:italic}',
    '.pf-mp-share{display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap}',
    '.pf-mp-rail{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:18px 0 6px}',
    '.pf-mp-rail a{color:#e8b923;font-weight:700;font-size:14px;letter-spacing:1px;text-decoration:none;border:1px solid #3a3a3a;border-radius:6px;padding:10px 16px;background:#0d0d0d}',
    '.pf-mp-ac{display:block;text-align:center;margin:22px auto 0;max-width:420px;background:#c1121f;color:#fff;font-weight:900;letter-spacing:2px;font-size:16px;padding:14px;border-radius:8px;text-decoration:none}',
    '.pf-mp-gauge{height:26px;border-radius:4px;overflow:hidden;display:flex;margin:10px 0}',
    '.pf-mp-g-sm{background:#e8b923}.pf-mp-g-lg{background:#c1121f}',
    '.pf-mp-gleg{display:flex;justify-content:space-between;font-size:13px;color:#c9bfa8;font-weight:700;flex-wrap:wrap;gap:6px}',
    '.pf-mp-note{font-size:13px;color:#c9bfa8;text-align:center;padding:14px}',
    '.pf-mp-redirect{max-width:560px;margin:24px auto;background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:28px 22px;text-align:center;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-mp-redirect h3{font-weight:900;font-size:22px;letter-spacing:2px;margin:0 0 10px}',
    '.pf-mp-redirect p{color:#c9bfa8;font-size:14px;margin:0 0 16px}',
    '.pf-mp-redirect a{display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:2px;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mp-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mp-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* Shared picker state: one legislator + one bill drive the linked sections. */
  var state = { bioguide: qs('bioguide') || '', bill: qs('bill') || '' };

  function sectionShell(id, title, sub) {
    return '<section class="pf-mp-sec" id="money-' + esc(id) + '" data-sec="' + esc(id) + '">' +
      '<h3>' + esc(title) + '</h3>' +
      (sub ? '<p class="pf-mp-sub">' + esc(sub) + '</p>' : '') +
      '<div class="pf-mp-body"></div></section>';
  }

  /* ---- section 1: FEC donor files (element money-fec-donors) ---- */
  function mountFec(body) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="pf-mp-pick">' +
      '<input id="pf-mp-bio" placeholder="Bioguide ID — e.g. A000055" value="' + esc(state.bioguide) + '" aria-label="Legislator Bioguide ID">' +
      '<button class="pf-mp-btn" id="pf-mp-bio-go">PULL THE FILE</button></div>' +
      '<div class="pf-mp-slot"></div>' +
      '<p class="pf-mp-note">Donor files come straight from FEC filings. Type a Bioguide ID ' +
      '(find it on the legislator\u2019s directory page) — or open this page with <b>?bioguide=</b>.</p>';
    body.appendChild(wrap);
    var slot = wrap.querySelector('.pf-mp-slot');
    function load(bio) {
      if (!bio) return;
      state.bioguide = bio;
      slot.innerHTML = '';
      try {
        if (window.PFMoneyTab) PFMoneyTab.mount(bio, slot);
        else { slot.innerHTML = '<p class="pf-mp-note">Money module still loading — try again.</p>'; }
      } catch (e) { err('fec mount failed :: ' + (e && e.message || e)); }
      mountGauge(document.getElementById('pf-mp-gauge-slot'), bio);
    }
    wrap.querySelector('#pf-mp-bio-go').addEventListener('click', function () {
      load(wrap.querySelector('#pf-mp-bio').value.trim());
    });
    if (state.bioguide) load(state.bioguide);
  }

  /* ---- section 6: small-dollar ratio gauge (element money-small-dollar) ---- */
  function mountGauge(slot, bioguide) {
    if (!slot) return;
    if (skip('money-small-dollar')) { slot.innerHTML = ''; return; }
    if (!bioguide) {
      slot.innerHTML = '<p class="pf-mp-note">Pull a donor file above to see the small-dollar split.</p>';
      return;
    }
    api('money_legislator', { bioguide_id: bioguide }, function (j) {
      try {
        if (!j || !j.ok || j.empty || typeof j.small_dollar_pct !== 'number') {
          slot.innerHTML = '<p class="pf-mp-note">Small-dollar data isn\u2019t loaded yet — no figures shown rather than guesses.</p>';
          return;
        }
        var sm = Math.max(0, Math.min(100, j.small_dollar_pct));
        var lg = Math.max(0, Math.min(100, 100 - sm));
        var name = (j.member && j.member.name) || bioguide;
        slot.innerHTML =
          '<div class="pf-mp-gauge"><div class="pf-mp-g-sm" style="width:' + sm.toFixed(1) + '%"></div>' +
          '<div class="pf-mp-g-lg" style="width:' + lg.toFixed(1) + '%"></div></div>' +
          '<div class="pf-mp-gleg"><span>SMALL-DOLLAR: ' + sm.toFixed(1) + '%</span>' +
          '<span>LARGE-DOLLAR: ' + lg.toFixed(1) + '%</span></div>' +
          '<p class="pf-mp-note">SOURCE: FEC \u00b7 ' + esc(String(j.cycle || '')) + ' cycle \u00b7 ' +
          esc(String(name)) + '</p>';
      } catch (e) { slot.innerHTML = '<p class="pf-mp-note">Small-dollar data isn\u2019t loaded yet.</p>'; }
    });
  }

  /* ---- section 2+3: vote-vs-donor + wall of shame (bill-linked) ---- */
  function mountVote(body) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="pf-mp-pick">' +
      '<input id="pf-mp-bill" placeholder="Bill ID — e.g. H.R.3633" value="' + esc(state.bill) + '" aria-label="Bill ID">' +
      '<button class="pf-mp-btn" id="pf-mp-bill-go">FOLLOW THIS BILL</button></div>' +
      '<div class="pf-mp-slot"></div>' +
      '<div class="pf-mp-share" style="display:none">' +
      '<button class="pf-mp-btn ghost" data-act="share">SHARE THIS CARD</button>' +
      '<button class="pf-mp-btn ghost" data-act="forge">FORGE THIS</button></div>' +
      '<p class="pf-mp-cor">Donations and votes are separate public records. ' +
      'Donations don\u2019t prove motive \u2014 they show who\u2019s in the room.</p>' +
      '<p class="pf-mp-note">Tip: open this page with <b>?bill=</b> to deep-link a bill.</p>';
    body.appendChild(wrap);
    var slot = wrap.querySelector('.pf-mp-slot');
    var shareRow = wrap.querySelector('.pf-mp-share');
    var lastData = null;
    function load(bill) {
      if (!bill) return;
      state.bill = bill;
      slot.innerHTML = '';
      shareRow.style.display = 'none';
      lastData = null;
      try {
        if (window.PFMoneyVote) PFMoneyVote.mount(bill, slot);
        else { slot.innerHTML = '<p class="pf-mp-note">Money module still loading — try again.</p>'; }
      } catch (e) { err('vote mount failed :: ' + (e && e.message || e)); }
      /* Fetch the same endpoint for the share payload + wall mount. */
      api('money_vote_card', { bill_id: bill }, function (j) {
        try {
          if (j && j.ok && j.cards) { lastData = j; shareRow.style.display = 'flex'; }
        } catch (e) {}
      });
      mountWall(bill);
    }
    wrap.querySelector('#pf-mp-bill-go').addEventListener('click', function () {
      load(wrap.querySelector('#pf-mp-bill').value.trim());
    });
    shareRow.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.getAttribute ? ev.target.getAttribute('data-act') : null;
      if (!b || !lastData) return;
      var payload = votePosterPayload(lastData);
      if (b === 'share') {
        try {
          if (PF.PHQShare) PF.PHQShare.share('phq-votedonor', payload);
          else err('PHQShare missing for vote share');
        } catch (e) { err('vote share failed :: ' + (e && e.message || e)); }
      } else if (b === 'forge') {
        try {
          sessionStorage.setItem('pf_forge_prefill_v1', JSON.stringify({
            kind: 'money-vote', painter: 'phq-votedonor', data: payload,
            caption: 'THE MONEY BEHIND THE VOTE — ' + (payload.billTitle || '')
          }));
          window.location.href = CREATE;
        } catch (e) { err('forge stash failed :: ' + (e && e.message || e)); }
      }
    });
    if (state.bill) load(state.bill);
  }

  function votePosterPayload(j) {
    var cards = Array.isArray(j.cards) ? j.cards : [];
    var rows = cards.slice(0, 4).map(function (c) {
      var m = (c.money && c.money.industries && c.money.industries[0]) || null;
      return {
        name: c.name || '\u2014',
        copy: (m && m.copy) || '',
        vote: c.position || ''
      };
    });
    return {
      billTitle: (j.bill && j.bill.title) || j.bill_id || '',
      billId: (j.bill && j.bill.bill_id) || '',
      cycle: j.cycle || '',
      rows: rows,
      source: 'FEC (api.open.fec.gov)'
    };
  }

  function mountWall(bill) {
    var sec = document.querySelector('[data-sec="wallshame"] .pf-mp-body');
    if (!sec) return;
    if (skip('wallshame')) { sec.innerHTML = ''; return; }
    sec.innerHTML = '<div class="pf-mp-slot"></div>';
    try {
      if (window.PFWallShame) PFWallShame.mount(bill, sec.querySelector('.pf-mp-slot'));
    } catch (e) { err('wall mount failed :: ' + (e && e.message || e)); }
  }

  /* ---- section 7: corporate playbook ---- */
  function mountCorp(body) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="pf-mp-pick">' +
      '<input id="pf-mp-ticker" placeholder="Ticker — e.g. XOM" aria-label="Company ticker">' +
      '<button class="pf-mp-btn" id="pf-mp-ticker-go">PULL THE PLAYBOOK</button></div>' +
      '<div class="pf-mp-slot"></div>' +
      '<p class="pf-mp-note">Buybacks, tax rates, and lobbying spend — from SEC EDGAR 10-K filings ' +
      'and Senate lobbying disclosures. Shown: what filings prove.</p>';
    body.appendChild(wrap);
    var slot = wrap.querySelector('.pf-mp-slot');
    wrap.querySelector('#pf-mp-ticker-go').addEventListener('click', function () {
      var t = wrap.querySelector('#pf-mp-ticker').value.trim().toUpperCase();
      if (!t) return;
      slot.innerHTML = '';
      try {
        if (window.PFCorpCard) PFCorpCard.mount(t, slot);
        else { slot.innerHTML = '<p class="pf-mp-note">Money module still loading — try again.</p>'; }
      } catch (e) { err('corp mount failed :: ' + (e && e.message || e)); }
    });
  }

  /* ---- wiring: exits rail + AC return ---- */
  function exitsRail(root) {
    var nav = document.createElement('nav');
    nav.className = 'pf-mp-rail';
    nav.setAttribute('aria-label', 'Money suite exits');
    var links = [
      ['FIND YOUR REP', PHQ + '#phq-people'],
      ['BILL FILES', PHQ + '#phq-bills'],
      ['RACES', PHQ + '#phq-ballot'],
      ['PRESSURE CAMPAIGNS', PHQ + '#phq-action'],
      ['POSTER FORGE', CREATE],
      /* SPACE-AUDIT FIX 2 (2026-10-06): /fund was orphaned — inbound link
         from the money trail's exits rail. */
      ['PROPAGANDA FUND', '/fund']
    ];
    nav.innerHTML = links.map(function (l) {
      return '<a href="' + esc(l[1]) + '">' + esc(l[0]) + '</a>';
    }).join('');
    root.appendChild(nav);
    var ac = document.createElement('a');
    ac.className = 'pf-mp-ac';
    ac.href = PHQ + '#phq-action';
    ac.textContent = 'BACK TO ACTION CENTER \u2192';
    root.appendChild(ac);
  }

  /* ---- builders: full page vs interim tab ---- */
  var SECTIONS = [
    { key: 'macro', kill: 'money-macro', title: 'MACRO',
      sub: 'The headline numbers, straight from the Fed data vault.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFMacro) PFMacro.mount(d); } catch (e) { err('macro mount failed'); }
      } },
, 2026-10-06): CEO flagship data       product — per-item margin reverse-engineer from SEC filings. Self-mounts
       via window.PFRobReport; kill ?pf_off=robreport. Read-only, zero XP. */
    { key: 'robreport', kill: 'robreport', title: 'THE ROBBERY REPORT',
      sub: 'Here\u2019s what they took from you — from their own filings.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFRobReport) PFRobReport.mount(d); } catch (e) { err('robreport mount failed'); }
      } },
    /* FRED Everywhere Phase 1 (2026-10-05): "the economy they're governing"
       strip — policy transmission (Fed → mortgage), the real-wage read,
       labor-market health. Weekly cadence, Monday refresh note. */
    { key: 'governing', kill: 'money-governing', title: 'THE ECONOMY THEY\u2019RE GOVERNING',
      sub: 'The numbers behind the policies — who they serve, who they squeeze.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFGoverning) PFGoverning.mount(d); } catch (e) { err('governing mount failed'); }
      } },
    /* FRED Everywhere Phase 2 (2026-10-05): Tool 1 "Stack 'Em" — the full
       comparison builder on the MACRO page. Suggested matchups default,
       free pick guardrailed server-side. Kill: ?pf_off=money-stackem. */
    { key: 'stackem', kill: 'money-stackem', title: 'STACK \u2019EM',
      sub: 'STACK TWO NUMBERS. START AN ARGUMENT.', mount: function (body) {
        var d = document.createElement('div'); d.id = 'pf-stackem'; body.appendChild(d);
        try { if (window.PFStackEm) PFStackEm.mount(d); } catch (e) { err('stackem mount failed'); }
      } },
    /* FRED Everywhere Phase 2 (2026-10-05): Tool 2 explainer embedded in
       Follow the Money — "WHAT'S THIS COSTING YOU?" Topic-first, series
       picker ("nerd mode") one tap deeper. Kill: ?pf_off=money-explain. */
    { key: 'explain', kill: 'money-explain', title: 'WHAT\u2019S THIS COSTING YOU?',
      sub: 'You tell it what\u2019s hitting your wallet; it tells you what the numbers actually say.', mount: function (body) {
        var d = document.createElement('div'); d.id = 'pf-explain-money'; body.appendChild(d);
        try { if (window.PFExplain) PFExplain.mount(d, 'money'); } catch (e) { err('explain mount failed'); }
      } },
    /* P-14/P-16 (Wave A6/PW1): the macro wall — public gallery of everything
       made with FRED data + HQ model pieces. Display only, zero XP. */
    { key: 'gallery', kill: 'macro-gallery', title: 'THE MACRO WALL',
      sub: 'Made with official data. See it. Remix it. Post it.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFMacroGallery) PFMacroGallery.mount(d); } catch (e) { err('macro gallery mount failed'); }
      } },
    { key: 'fec', kill: 'money-fec-donors', title: 'FEC DONOR FILES',
      sub: 'Every legislator\u2019s money, straight from the filings.', mount: mountFec },
    { key: 'vote', kill: 'money-vote', title: 'THE MONEY BEHIND THE VOTE',
      sub: 'Who funded both sides of the fight.', mount: mountVote },
    { key: 'wallshame', kill: 'wallshame', title: 'WALL OF SHAME',
      sub: 'The votes against us, named and sourced.', mount: function (body) {
        body.innerHTML = '<p class="pf-mp-note">Pick a bill above — the wall fills with its worst votes.</p>';
      } },
    { key: 'pac', kill: 'pac-alerts', title: 'SUPER PAC ALERTS',
      sub: 'New money drops, as they land.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFPacAlerts) PFPacAlerts.mount(d); } catch (e) { err('pac mount failed'); }
      } },
    { key: 'trades', kill: 'trades-tab', title: 'TRADES ON THE HILL',
      sub: 'What they bought and sold while writing the rules.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFTrades) PFTrades.mount(d, { bioguideId: state.bioguide }); } catch (e) { err('trades mount failed'); }
      } },
    { key: 'gauge', kill: 'money-small-dollar', title: 'SMALL-DOLLAR RATIO',
      sub: 'People-powered or donor-powered?', mount: function (body) {
        var d = document.createElement('div'); d.id = 'pf-mp-gauge-slot'; body.appendChild(d);
        mountGauge(d, state.bioguide);
      } },
    { key: 'corp', kill: 'corp-card', title: 'CORPORATE PLAYBOOK',
      sub: 'Buybacks, tax dodges, lobbying — the filings don\u2019t lie.', mount: mountCorp },
    { key: 'ledgers', kill: 'ledgers', title: 'BILLIONAIRE LEDGERS',
      sub: 'The money behind the curtain, ledger by ledger.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFLedgers) PFLedgers.mount(d); } catch (e) { err('ledgers mount failed'); }
      } },
    { key: 'boycotts', kill: 'boycotts', title: 'DONOR BOYCOTTS',
      sub: 'They fund the opposition — here\u2019s the pressure.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFBoycotts) PFBoycotts.mount(d); } catch (e) { err('boycotts mount failed'); }
      } },
    { key: 'deep8', kill: null, title: 'THE REST OF THE MONEY MAP',
      sub: 'Eight more cuts, wiring up now.', mount: function (body) {
        var d = document.createElement('div'); body.appendChild(d);
        try { if (window.PFMoneyDeep) PFMoneyDeep.mount(d); } catch (e) { err('deep8 mount failed'); }
      } }
  ];

  function buildSections(root, lazy) {
    cssOnce();
    var frag = document.createDocumentFragment();
    SECTIONS.forEach(function (s) {
      if (s.kill && skip(s.kill)) return;
      var tmp = document.createElement('div');
      tmp.innerHTML = sectionShell(s.key, s.title, s.sub);
      var sec = tmp.firstChild;
      frag.appendChild(sec);
      var body = sec.querySelector('.pf-mp-body');
      if (lazy) {
        /* Interim tab: sections mount on first intersection (PHQ budget). */
        try {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) {
                try { io.disconnect(); } catch (e) {}
                try { s.mount(body); } catch (e) { err('lazy mount failed: ' + s.key); }
              }
            });
          }, { rootMargin: '200px' });
          io.observe(sec);
        } catch (e) { try { s.mount(body); } catch (e2) {} }
      } else {
        try { s.mount(body); } catch (e) { err('mount failed: ' + s.key + ' :: ' + (e && e.message || e)); }
      }
    });
    root.appendChild(frag);
  }

  function renderPage(host) {
    if (host.querySelector('.pf-mp')) return;
    var root = document.createElement('div');
    root.className = 'pf-mp';
    root.innerHTML =
      '<div class="pf-mp-kicker">MTCSTW.COM</div>' +
      '<h2 class="pf-mp-title">FOLLOW THE MONEY</h2>' +
      '<p class="pf-mp-mission">Follow the money. See who funds the votes.</p>';
    host.appendChild(root);
    buildSections(root, false);
    exitsRail(root);
  }

  function renderTab(host) {
    if (document.getElementById('phq-money')) return;
    var sec = document.createElement('section');
    sec.id = 'phq-money';
    sec.className = 'pf-hub';
    sec.setAttribute('data-hub', 'money');
    var root = document.createElement('div');
    root.className = 'pf-mp';
    root.innerHTML =
      '<div class="pf-mp-kicker">SECTION 06 \u2014 FOLLOW THE MONEY</div>' +
      '<h2 class="pf-mp-title">FOLLOW THE MONEY</h2>' +
      '<p class="pf-mp-mission">Follow the money. See who funds the votes.</p>';
    sec.appendChild(root);
    host.appendChild(sec);
    buildSections(root, true);
    exitsRail(root);
  }

  function renderRedirect(host, url) {
    if (document.getElementById('phq-money')) return;
    var sec = document.createElement('section');
    sec.id = 'phq-money';
    sec.className = 'pf-hub';
    sec.innerHTML =
      '<div class="pf-mp-redirect"><h3>FOLLOW THE MONEY</h3>' +
      '<p>The money war room moved to its own page.</p>' +
      '<a href="' + esc(url) + '">OPEN THE WAR ROOM \u2192</a></div>';
    host.appendChild(sec);
  }

  function boot() {
    if (isEditor()) return;
    var moneyDiv = document.getElementById('pf-money');
    var phqDiv = document.getElementById('pf-political-hq');
    function go(cfg) {
      var url = (cfg && cfg.money_page_url) || '';
      try {
        if (moneyDiv) { renderPage(moneyDiv); return; }
        if (phqDiv) {
          if (skip('money-tab')) return;
          if (url) renderRedirect(phqDiv, url);
          else renderTab(phqDiv);
        }
      } catch (e) { err('boot failed :: ' + (e && e.message || e)); }
    }
    try {
      if (PF.siteConfig && PF.siteConfig.ready) PF.siteConfig.ready(go);
      else go({});
    } catch (e) { go({}); }
  }

  try {
    window.PFMoney = { skip: skip, mountPage: renderPage, mountTab: renderTab };
  } catch (e) {}

  /* Self-mounting silo: runs at bundle time; idempotent. */
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) { err('init failed'); }
})();
