/* games/inflation-tracker.js  |  PF v1.4.3 | THE PEOPLE'S CPI — community-reported
   prices vs official numbers. CEO directive (2026-10-05); honesty-first build.
   Three self-contained widgets, each silent no-op when its mount div is absent:
     #pf-inflation-checkin — price check-in (item picker + price + coarse area)
     #pf-inflation-board   — area price board (medians, deltas, area vs national)
     #pf-inflation-trends  — weekly trends + People's Index vs official CPI-U
   Backend contract (verified against the real be/inflation-tracker backend:
   src/auth.js TYPE_KEY 'price'->pr_action, src/index.js
   `d.type === 'price' && d.pr_action`, src/inflation.js response shapes).
   Every endpoint is defensive: a 404/network failure renders a fail-soft
   state, never a broken widget.
     POST report_price  BODY {type:'price', pr_action:'report_price',
       item_id, price_cents, area_key, is_approximate, callsign, device}
       (callsign-authed)
       The POST rail dispatches on the JSON BODY ONLY — a bare ?action=
       query param is NOT consulted by dispatch. The old doc claimed
       "action rides in the query string AND the body"; that was false and
       the bare-body POST resolved to {type:'bare'} -> "unknown action".
       -> {ok:true, duplicate:false,
           report:{id, item_id, price_cents, area_key, reported_at,
             status:'published'|'flagged', is_approximate},
           week_count, flagged} |
          {ok:true, duplicate:true, note:'already reported today', report,
           week_count}  (same-day re-report — NOT a status string) |
          {ok:false, error}
       status lives on j.report; the re-report flag is top-level j.duplicate.
       week_count = published reports this Chicago week for item+area.
       flagged = (status === 'flagged'). is_approximate (0/1, from the
       "not sure" toggle) is always sent and honored.
     GET  ?action=price_board   {area_key, item_id?}
       -> per-item {median_cents, trimmed_mean_cents, sample_count,
          week_ago_median_cents, delta_pct, enough_data} or {enough_data:false}
     GET  ?action=price_trends  {item_id, area_key, weeks}
       -> {weeks: <NUMBER of weeks requested>,
           buckets: [{week_start, week_end, median_cents|null, sample_count,
             enough_data}],
           peoples_index: [{week_start, value, ...}]}
          buckets is the series array — weeks is a NUMBER, never the series.
          (The old doc claimed the array rode on j.weeks; that was false and
          the trends widget always rendered "No trend data yet".)
          peoples_index is rebased to the first week of the requested
          window — the index level is relative, not absolute.
          price_trends does NOT return the official baseline.
     GET  ?action=cpi_compare
       -> {official: {cpi_u_all_items: {series, period, value, unit,
          source_url, source_date} | null, cpi_food_at_home: ...} | null,
          official_note?} (fail-soft: a 404 or null official leaves the
       honest "official baseline pending — check back" copy in place)
   HONESTY RULES (Psych audits this file): community data is NEVER presented
   as official. Every number the board/trends render carries a
   "community-reported" label with its date range. n<5 samples -> the card
   shows "not enough reports yet" and NO number. Null trend buckets break the
   line — never interpolate. Official null -> "official baseline pending —
   check back", never a flat line.
   PRIVACY: coarse location only — ZIP5 or "City, ST". The area field
   placeholder says "ZIP or city — never your address". No PII, no precise
   location anywhere.
   LOOP LAW: check-in success -> "see your area's board" (scrolls to the
   board, presets the area) -> board tabs [YOUR AREA | NATIONAL | COMPARE]
   -> share card ("PRICES IN <AREA>" poster via the existing PFShare flow).
   Every step informs, invites back, pays off.
   MOTIVATION DESIGN (Psych, ~/workspace/hidden/data-strategy/motivation-
   design.md §§1,2,4 — red lines binding): cause-framing header ("the
   government won't give us an honest inflation number, so we're building
   our own" / "Join the count." / identity anchor "I fight with receipts."),
   plain "actually" prompt, honest-norm + authorship lines, red-line-#6
   consent ("Your activity powers the movement's intelligence." + plain-
   language "how we use this" anchored to the methodology footnote),
   week_count receipt payoff, graceful "not sure" approximate toggle,
   area pre-fill + display-only last-reported reference (NEVER pre-filled
   into the input — pre-filled inputs get submitted unexamined). Recognition
   only: no streak mechanics, no leaderboard mechanics, no per-user counts,
   no guilt copy, zero economy as before.
   ZERO ECONOMY: this build grants no XP, shows no XP, promises no XP.
   KILL: ?pf_off=inflation (master) | ?pf_off=inflation-checkin |
         ?pf_off=inflation-board | ?pf_off=inflation-trends |
         ?pf_off=flywheel-credit (all contributor-credit lines)
         or localStorage pf_disabled_v1='["inflation"]' etc.
   Mounts: <div id="pf-inflation-checkin"></div>,
           <div id="pf-inflation-board"></div>,
           <div id="pf-inflation-trends"></div>,
           <div id="pf-nowcast-credit"></div> (dormant until U-02 ships).
   Needs: core/00-bus.js (PF, PF.skip), core/03-global.js (PF_BACKEND_URL).
   Share: core/share-image.js (window.PFShare) when present — poster is drawn
   locally on canvas and handed to PFShare.shareImage; plain download is the
   fallback. No new share pipeline. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('inflation')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL || '';

  /* ---------------- shared helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard (official.source_url): http(s) only. */
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  function money(cents) {
    if (cents == null || isNaN(cents)) return '—';
    return '$' + (Number(cents) / 100).toFixed(2);
  }
  function weekLabel(ws) {
    try {
      var d = new Date(String(ws) + 'T12:00:00');
      if (isNaN(d.getTime())) return String(ws);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return String(ws); }
  }
  function todayChicago() {
    try { return new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }); }
    catch (e) { return new Date().toLocaleDateString('en-US'); }
  }

  /* ---------------- basket (matches backend seeds) ---------------- */
  var BASKET = [
    { id: 'milk',             name: 'Milk',              unit: 'gallon' },
    { id: 'eggs',             name: 'Eggs',              unit: 'dozen' },
    { id: 'bread',            name: 'Bread',             unit: 'loaf' },
    { id: 'ground_beef',      name: 'Ground beef',       unit: 'lb' },
    { id: 'chicken_breast',   name: 'Chicken breast',    unit: 'lb' },
    { id: 'white_rice',       name: 'White rice',        unit: 'lb' },
    { id: 'bananas',          name: 'Bananas',           unit: 'lb' },
    { id: 'butter',           name: 'Butter',            unit: 'lb' },
    { id: 'coffee_12oz',      name: 'Coffee',            unit: '12oz bag' },
    { id: 'gasoline',       name: 'Gasoline (regular)', unit: 'gallon' },
    { id: 'electricity',      name: 'Electricity',       unit: 'kWh' },
    { id: 'rent_1br',         name: 'Rent (1BR)',        unit: 'month' }
  ];
  function itemById(id) {
    for (var i = 0; i < BASKET.length; i++) if (BASKET[i].id === id) return BASKET[i];
    return null;
  }

  /* ---------------- validation ---------------- */
  var ZIP_RE = /^\d{5}$/;
  var CITY_RE = /^[A-Za-z][A-Za-z .'\-]*,\s*[A-Za-z]{2}$/;
  /* Returns the normalized area string, or '' when invalid. Coarse only. */
  function validArea(v) {
    var s = String(v == null ? '' : v).trim();
    if (ZIP_RE.test(s)) return s;
    if (CITY_RE.test(s)) {
      var parts = s.split(',');
      var city = parts[0].replace(/\s+/g, ' ').trim();
      var st = parts[1].trim().toUpperCase();
      return city + ', ' + st;
    }
    return '';
  }
  /* dollars.cents string -> integer cents, or -1 when invalid. */
  function parsePriceCents(v) {
    var s = String(v == null ? '' : v).trim().replace(/^\$/, '').replace(/,/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return -1;
    var cents = Math.round(parseFloat(s) * 100);
    if (!(cents >= 1 && cents <= 9999999)) return -1;
    return cents;
  }

  /* ---------------- network (fail-soft everywhere) ---------------- */
  function getJSON(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    var opts = { method: 'GET', headers: { 'Accept': 'application/json' } };
    if (ctl) opts.signal = ctl.signal;
    try {
      fetch(BACKEND + q, opts)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* POST report_price: the backend POST rail dispatches on the JSON BODY
     ONLY (src/auth.js TYPE_KEY 'price'->pr_action; src/index.js
     `d.type === 'price' && d.pr_action`) — a bare ?action= query param is
     ignored by dispatch. The report rides type:'price' + pr_action, the
     canonical contract. */
  function postReport(params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    var body = { type: 'price', pr_action: 'report_price', item_id: params.item_id, price_cents: params.price_cents, area_key: params.area_key };
    /* Graceful uncertainty (anti-gaming note #6): always a clear 0/1 —
       the backend reads and stores it on the report. */
    body.is_approximate = params.is_approximate ? 1 : 0;
    if (id.callsign) body.callsign = id.callsign;
    if (id.device) body.device = id.device;
    if (sec) body.auth_secret = sec;
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    if (ctl) opts.signal = ctl.signal;
    try {
      fetch(BACKEND + '?action=report_price', opts)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }

  /* ---------------- shared state ---------------- */
  /* Area persists across visits (anti-gaming note #2: make honesty easier
     than lying). Old key pf_inflation_area_v1 is read once as a fallback
     for continuity, then migrated on the next successful report. */
  var AREA_LS = 'pf_inflation_area';
  var AREA_LS_OLD = 'pf_inflation_area_v1';
  function lastArea() {
    try { return localStorage.getItem(AREA_LS) || localStorage.getItem(AREA_LS_OLD) || ''; }
    catch (e) { return ''; }
  }
  function saveArea(a) { try { localStorage.setItem(AREA_LS, a); } catch (e) {} }

  /* Last-reported price per item — REFERENCE ONLY, display never. The
     reference line shows it ("last reported: $X on <date>"); it is NEVER
     pre-filled into the price input (pre-filled inputs get submitted
     unexamined). Keyed pf_inflation_last_<item_id> -> {cents, date}. */
  var LAST_LS = 'pf_inflation_last_';
  function lastReport(id) {
    try {
      var raw = localStorage.getItem(LAST_LS + id);
      if (!raw) return null;
      var j = JSON.parse(raw);
      if (j && Number(j.cents) > 0 && j.date) return { cents: Number(j.cents), date: String(j.date) };
    } catch (e) {}
    return null;
  }
  function saveLastReport(id, cents) {
    try { localStorage.setItem(LAST_LS + id, JSON.stringify({ cents: cents, date: todayChicago() })); }
    catch (e) {}
  }

  var CSS = 'background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;';
  var BTN = 'background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;';
  var BTN_GHOST = 'background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;';
  var INPUT = 'width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:16px;';
  var SMALL = 'font-size:12px;color:#b8b0a0;';
  var HONEST = 'font-size:11px;color:#8f887a;margin-top:10px;';

  /* ================= FLYWHEEL CREDIT (synergy-flywheel) =================
     "Attribution meets data": honest, labeled contributor counts on every
     crowd-data surface. Rules: counts are FACTUAL aggregates (distinct
     callsigns) — never per-user tallies; every count labels WHAT it counts
     + its VINTAGE; 0 → "no contributors yet" (never a fake zero);
     null/unavailable → '' (render nothing, fail-soft). Display-only; grants nothing.
     Kill: ?pf_off=flywheel-credit gates every credit line below. */
  function creditOff() { try { return PF.skip('flywheel-credit'); } catch (e) { return false; } }
  /* crowdCredit(n, what, vintage) -> escaped HTML. Shared helper for all
     crowd-data surfaces (price boards, local indices, spike alerts U-03). */
  function crowdCredit(n, what, vintage) {
    if (creditOff()) return '';
    if (n == null || isNaN(Number(n))) return '';
    var nn = Number(n);
    if (nn <= 0) return '<span style="' + SMALL + '">no ' + esc(what) + ' yet</span>';
    return '<span style="' + SMALL + '">' + esc(String(nn)) + ' ' + esc(what) +
      (vintage ? ' · ' + esc(vintage) : '') + '</span>';
  }
  /* poweredBy(n, vintage, cta) -> "powered by N contributors · vintage" line
     for index/board headlines; honest empty state carries a report CTA. */
  function poweredBy(n, vintage, cta) {
    if (creditOff()) return '';
    if (n == null || isNaN(Number(n))) return '';
    var nn = Number(n);
    if (nn > 0) {
      return '<div style="' + SMALL + 'margin:2px 0 10px;">powered by <b>' +
        esc(String(nn)) + '</b> contributors · ' + esc(vintage) + '</div>';
    }
    return '<div style="' + SMALL + 'margin:2px 0 10px;">no contributors yet' +
      (cta ? ' — ' + esc(cta) : '') + '</div>';
  }
  try { PF.crowdCredit = crowdCredit; PF.poweredBy = poweredBy; } catch (e) {}

  /* ================= 1. PRICE CHECK-IN ================= */
  function mountCheckin() {
    if (PF.skip('inflation-checkin')) return;
    var mount = document.getElementById('pf-inflation-checkin');
    if (!mount) return; /* silent no-op */

    var opts = BASKET.map(function (it) {
      return '<option value="' + esc(it.id) + '">' + esc(it.name) + ' — ' + esc(it.unit) + '</option>';
    }).join('');

    mount.innerHTML =
      '<div style="' + CSS + '" id="pf-inf-ci">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE\u2019S PRICE CHECK-IN</h2>' +
      '<div style="font-size:16px;font-weight:bold;color:#f5f0e6;margin-bottom:2px;">The government won\u2019t give us an honest inflation number, so we\u2019re building our own.</div>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:14px;">Join the count.</div>' +
      '<div id="pf-inf-ci-body">' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label>' +
      '<select id="pf-inf-ci-item" style="' + INPUT + 'margin-bottom:10px;">' + opts + '</select>' +
      '<label id="pf-inf-ci-price-label" style="display:block;font-size:13px;margin-bottom:4px;"></label>' +
      '<input id="pf-inf-ci-price" inputmode="decimal" placeholder="4.29" style="' + INPUT + 'margin-bottom:2px;">' +
      '<div id="pf-inf-ci-refl" style="' + SMALL + 'margin-bottom:8px;"></div>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">WHERE (coarse only)</label>' +
      '<input id="pf-inf-ci-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'margin-bottom:6px;" value="' + esc(lastArea()) + '">' +
      '<div style="' + SMALL + 'margin-bottom:10px;">ZIP code or "City, ST" only. Never your street, never your name.</div>' +
      '<label style="display:block;font-size:13px;margin-bottom:12px;cursor:pointer;">' +
      '<input type="checkbox" id="pf-inf-ci-approx" style="margin-right:6px;vertical-align:middle;">I\u2019m not sure of the exact price</label>' +
      '<div style="' + SMALL + 'margin-bottom:12px;">Most reports this week come from actual grocery receipts.</div>' +
      '<div style="font-size:13px;color:#d8d0c0;margin-bottom:12px;">Your receipt is building the People\u2019s Price Index.</div>' +
      '<button id="pf-inf-ci-go" style="' + BTN + '">REPORT PRICE</button>' +
      '<div style="' + SMALL + 'margin-top:10px;">Your activity powers the movement\u2019s intelligence. <a href="#pf-inf-method" style="color:#e8a0a0;">How we use this</a>.</div>' +
      '<div id="pf-inf-ci-msg" style="margin-top:12px;font-size:14px;"></div>' +
      '</div>' +
      '<div id="pf-inf-method" style="' + HONEST + '">How we use this: your reports are aggregated into anonymous community medians on the board. We never sell your data. Your area is always coarse — ZIP or city, never an address, never a name. One report per item per day.</div>' +
      '<div style="' + HONEST + 'color:#c98f8f;margin-top:6px;">I fight with receipts.</div>' +
      '</div>';

    var itemEl = document.getElementById('pf-inf-ci-item');
    var priceEl = document.getElementById('pf-inf-ci-price');
    var priceLabelEl = document.getElementById('pf-inf-ci-price-label');
    var reflEl = document.getElementById('pf-inf-ci-refl');
    var areaEl = document.getElementById('pf-inf-ci-area');
    var approxEl = document.getElementById('pf-inf-ci-approx');
    var msgEl = document.getElementById('pf-inf-ci-msg');
    var goBtn = document.getElementById('pf-inf-ci-go');
    function msg(html) { msgEl.innerHTML = html; }

    /* Per-item prompt + display-only reference line (anti-gaming #1, #2). */
    function pricePrompt(it) {
      return 'What did ' + it.name.toLowerCase() + ' actually cost you this week?';
    }
    function updateRefLine(it) {
      var rec = it.id ? lastReport(it.id) : null;
      reflEl.innerHTML = rec
        ? 'last reported: ' + money(rec.cents) + ' on ' + esc(rec.date)
        : '';
    }
    function updatePricePrompt() {
      var it = itemById(itemEl.value) || { name: 'that item', id: '' };
      priceLabelEl.textContent = pricePrompt(it);
      updateRefLine(it);
    }
    itemEl.onchange = updatePricePrompt;
    updatePricePrompt();

    /* Receipt payoff (payoff map §2): instant acknowledgment + this week's
       sample count when the backend returns week_count. Defensive: absent,
       null, or non-numeric week_count falls back to the thanks line. */
    function receiptHTML(it, cents, area, j) {
      var wc = j && j.week_count != null && isFinite(Number(j.week_count)) ? Number(j.week_count) : null;
      if (wc != null) {
        return 'Report logged \u2014 that\u2019s #' + wc.toLocaleString('en-US') +
          ' for ' + esc(it.name.toLowerCase()) + ' in ' + esc(area) + ' this week.';
      }
      return 'Report logged \u2014 thanks for building the index.';
    }

    goBtn.onclick = function () {
      var itemId = itemEl.value;
      var item = itemById(itemId) || { name: 'that item' };
      var cents = parsePriceCents(priceEl.value);
      if (cents < 0) { msg('<span style="color:#e8a0a0;">Enter a real price, like 4.29.</span>'); return; }
      var area = validArea(areaEl.value);
      if (!area) { msg('<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — nothing more specific.</span>'); return; }
      var id = ident();
      if (!id.callsign) {
        msg('You need a callsign to report — claim one in Enlistment Ranks (one tap), then come back.');
        return;
      }
      var approx = approxEl.checked ? 1 : 0;
      goBtn.disabled = true; goBtn.style.opacity = '0.5';
      msg('<span style="color:#b8b0a0;">Sending…</span>');
      postReport({ item_id: itemId, price_cents: cents, area_key: area, is_approximate: approx }, function (j) {
        goBtn.disabled = false; goBtn.style.opacity = '1';
        if (!j || j.ok === false) {
          /* Fail-soft: the endpoint may not exist yet — never a broken form. */
          msg('Price check-in unavailable right now. Your price is safe with you — try again later.');
          return;
        }
        saveArea(area);
        /* Real backend response shape: {ok, duplicate, report:{...status},
           week_count, flagged}. A same-day re-report comes back as
           duplicate:true — NOT a status string — so the reader checks
           j.duplicate FIRST, then reads the status off j.report. The old
           reader looked for a top-level status field on the response, which
           is never set, so every success fell through to the "unavailable"
           copy. */
        var rep = (j && j.report) || {};
        var status = rep.status;
        if (j.duplicate === true) {
          msg('You already reported ' + esc(item.name.toLowerCase()) + ' today. Come back tomorrow.');
        } else if (status === 'published') {
          saveLastReport(itemId, cents);
          updateRefLine(item);
          var board = document.getElementById('pf-inflation-board');
          var seeBoard = board ? '<br><button id="pf-inf-ci-seeboard" style="' + BTN_GHOST + 'margin-top:10px;">SEE YOUR AREA\u2019S BOARD →</button>' : '';
          msg('<span style="color:#9fd6a0;">' + receiptHTML(item, cents, area, j) + '</span>' +
            '<br><span style="' + SMALL + '">One report per item per day — come back tomorrow with the next one.</span>' + seeBoard);
          priceEl.value = '';
          var sb = document.getElementById('pf-inf-ci-seeboard');
          if (sb) sb.onclick = function () {
            try { board.setAttribute('data-pf-inf-area', area); } catch (e) {}
            if (window.PF && PF.refreshInflationBoard) { try { PF.refreshInflationBoard(area); } catch (e) {} }
            try { board.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
          };
        } else if (status === 'flagged') {
          msg('Thanks — flagged for review. A human takes a look before it counts. Nothing alarming; outliers get eyeballs.');
        } else {
          msg('Price check-in unavailable right now. Try again later.');
        }
      });
    };
  }

  /* ================= 2. AREA PRICE BOARD ================= */
  function normBoardItems(j) {
    /* Defensive: backend may return items as a map or an array. */
    var out = [];
    if (!j) return out;
    var raw = j.items || j.data || j;
    if (Array.isArray(raw)) {
      raw.forEach(function (r) { if (r && r.item_id) out.push(r); });
    } else if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) {
        var r = raw[k];
        if (r && typeof r === 'object') { r = Object.assign({ item_id: k }, r); out.push(r); }
      });
    }
    return out.filter(function (r) { return itemById(r.item_id); });
  }
  function boardRange(j) {
    var a = j && (j.week_start || j.start), b = j && (j.week_end || j.end);
    if (a && b) return weekLabel(a) + ' – ' + weekLabel(b);
    if (b) return 'week of ' + weekLabel(b);
    return 'this week';
  }
  function deltaHTML(r) {
    var d = r.delta_pct;
    if (d == null || isNaN(d) || !r.week_ago_median_cents) return '<span style="' + SMALL + '">no last-week data</span>';
    var dn = Number(d);
    var arrow = dn > 0 ? '\u25B2' : (dn < 0 ? '\u25BC' : '\u25AA');
    var color = dn > 0 ? '#c98f8f' : (dn < 0 ? '#9fc98f' : '#b8b0a0');
    var word = dn > 0 ? 'up' : (dn < 0 ? 'down' : 'flat');
    return '<span style="color:' + color + ';font-weight:bold;">' + arrow + ' ' + Math.abs(dn).toFixed(1) + '%</span>' +
      ' <span style="' + SMALL + '">' + word + ' vs last week</span>';
  }
  function cardHTML(r, range) {
    var item = itemById(r.item_id);
    var head = '<div style="font-size:15px;font-weight:bold;">' + esc(item.name) +
      ' <span style="font-weight:normal;color:#b8b0a0;">/ ' + esc(item.unit) + '</span></div>';
    var honest = '<div style="' + HONEST + 'margin-top:8px;">community-reported · ' + esc(range) + '</div>';
    if (!r.enough_data || r.median_cents == null) {
      /* n<5 (or no median): NEVER a number. Contributor count is an
         aggregate, not a figure — honest either way. */
      var thinCredit = crowdCredit(r.contributors, 'contributors', 'trailing 30 days');
      var thinLine = (r.contributors != null && Number(r.contributors) > 0)
        ? 'We need at least 5 reports before we show a number. Report one above.'
        : 'Report one above and start it.';
      return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">' +
        head + '<div style="margin-top:10px;color:#b8b0a0;font-size:14px;">Not enough reports yet.</div>' +
        '<div style="' + SMALL + 'margin-top:4px;">' + (thinCredit ? thinCredit + '<br>' : '') + esc(thinLine) + '</div>' + honest + '</div>';
    }
    var cardCredit = crowdCredit(r.contributors, 'contributors', 'trailing 30 days');
    return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">' +
      head +
      '<div style="font-size:30px;font-weight:bold;margin:6px 0 2px;">' + money(r.median_cents) + '</div>' +
      '<div style="' + SMALL + '">median of ' + esc(String(r.sample_count)) + ' reports' +
      (cardCredit ? ' · ' + cardCredit : '') +
      (r.trimmed_mean_cents != null ? ' · trimmed avg ' + money(r.trimmed_mean_cents) : '') + '</div>' +
      '<div style="margin-top:8px;font-size:14px;">' + deltaHTML(r) + '</div>' +
      honest + '</div>';
  }

  function mountBoard() {
    if (PF.skip('inflation-board')) return;
    var mount = document.getElementById('pf-inflation-board');
    if (!mount) return; /* silent no-op */

    var area = mount.getAttribute('data-pf-inf-area') || lastArea();
    var view = 'area'; /* area | national | compare */
    var cache = { area: null, national: null };

    function tabBtn(label, v) {
      var on = view === v;
      return '<button data-pf-inf-view="' + v + '" style="' + (on ? BTN : BTN_GHOST) + 'margin-right:8px;margin-bottom:8px;">' + label + '</button>';
    }
    function render() {
      var h = '<div style="' + CSS + '">' +
        '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE\u2019S PRICE BOARD</h2>' +
        '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">What the people are actually paying. Not the official numbers — ours.</div>' +
        '<div style="margin-bottom:12px;">' + tabBtn('YOUR AREA', 'area') + tabBtn('NATIONAL', 'national') + tabBtn('COMPARE', 'compare') + '</div>' +
        '<div style="margin-bottom:12px;">' +
        '<input id="pf-inf-bd-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'max-width:280px;display:inline-block;" value="' + esc(area) + '">' +
        ' <button id="pf-inf-bd-go" style="' + BTN + '">LOAD</button></div>' +
        '<div id="pf-inf-bd-out"><div style="color:#b8b0a0;">Loading the board…</div></div>' +
        '</div>';
      mount.innerHTML = h;
      document.getElementById('pf-inf-bd-go').onclick = function () {
        var a = validArea(document.getElementById('pf-inf-bd-area').value);
        if (!a) { document.getElementById('pf-inf-bd-out').innerHTML = '<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST".</span>'; return; }
        area = a; saveArea(a); cache.area = null;
        load();
      };
      var tabs = mount.querySelectorAll('[data-pf-inf-view]');
      for (var i = 0; i < tabs.length; i++) {
        (function (el) {
          el.onclick = function () { view = el.getAttribute('data-pf-inf-view'); render(); };
        })(tabs[i]);
      }
      load();
    }
    function boardHTML(j, label) {
      var items = normBoardItems(j);
      var range = boardRange(j);
      if (!items.length) {
        return '<h3 style="margin:12px 0 8px;font-size:16px;">' + esc(label) + '</h3>' +
          '<div style="color:#b8b0a0;">No board data for this area yet. Report a price and start it.</div>';
      }
      var cards = items.map(function (r) { return cardHTML(r, range); }).join('');
      var shareBtn = (view === 'area' || view === 'compare')
        ? '<div style="margin-top:12px;"><button id="pf-inf-bd-share" style="' + BTN_GHOST + '">SHARE THIS BOARD</button></div>' : '';
      return '<h3 style="margin:12px 0 8px;font-size:16px;">' + esc(label) +
        ' <span style="' + SMALL + '">community-reported · ' + esc(range) + '</span></h3>' +
        poweredBy(j.contributors, 'trailing 30 days', 'report a price and start it') +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">' + cards + '</div>' + shareBtn;
    }
    function wireShare(j) {
      var sb = document.getElementById('pf-inf-bd-share');
      if (!sb) return;
      sb.onclick = function () { sharePoster(area, normBoardItems(j), boardRange(j)); };
    }
    function load() {
      var out = document.getElementById('pf-inf-bd-out');
      if (view === 'area' && !area) {
        out.innerHTML = '<span style="color:#b8b0a0;">Enter your ZIP or city above, then hit LOAD.</span>';
        return;
      }
      out.innerHTML = '<div style="color:#b8b0a0;">Loading the board…</div>';
      if (view === 'area') {
        if (cache.area) { out.innerHTML = boardHTML(cache.area, 'PRICES IN ' + area.toUpperCase()); wireShare(cache.area); return; }
        getJSON('price_board', { area_key: area }, function (j) {
          if (!j || j.ok === false) { out.innerHTML = '<span style="color:#e8a0a0;">The price board is unavailable right now. Try again later.</span>'; return; }
          cache.area = j;
          out.innerHTML = boardHTML(j, 'PRICES IN ' + area.toUpperCase()); wireShare(j);
        });
      } else if (view === 'national') {
        if (cache.national) { out.innerHTML = boardHTML(cache.national, 'NATIONAL — COMMUNITY-REPORTED'); return; }
        getJSON('price_board', { area_key: 'national' }, function (j) {
          if (!j || j.ok === false) { out.innerHTML = '<span style="color:#e8a0a0;">The national board is unavailable right now. Try again later.</span>'; return; }
          cache.national = j;
          out.innerHTML = boardHTML(j, 'NATIONAL — COMMUNITY-REPORTED');
        });
      } else { /* compare: your area vs national, side by side */
        getJSON('price_board', { area_key: area }, function (ja) {
          getJSON('price_board', { area_key: 'national' }, function (jn) {
            if ((!ja || ja.ok === false) && (!jn || jn.ok === false)) {
              out.innerHTML = '<span style="color:#e8a0a0;">Comparison unavailable right now. Try again later.</span>'; return;
            }
            if (ja && ja.ok !== false) cache.area = ja;
            if (jn && jn.ok !== false) cache.national = jn;
            var h = '';
            h += ja && ja.ok !== false ? boardHTML(ja, 'YOUR AREA — ' + area.toUpperCase())
              : '<div style="color:#e8a0a0;">Your area\u2019s board is unavailable right now.</div>';
            h += jn && jn.ok !== false ? boardHTML(jn, 'NATIONAL — COMMUNITY-REPORTED')
              : '<div style="color:#e8a0a0;margin-top:12px;">The national board is unavailable right now.</div>';
            out.innerHTML = h; wireShare(ja || { items: [] });
          });
        });
      }
    }
    /* Loop-law entry: the check-in widget calls this to preset the area. */
    try { PF.refreshInflationBoard = function (a) { area = a || area; view = 'area'; cache.area = null; render(); }; } catch (e) {}
    render();
  }

  /* ================= SHARE CARD ================= */
  /* "PRICES IN <AREA>" poster, drawn locally on canvas and handed to the
     EXISTING PFShare pipeline (claim gate, native share / download
     fallback, callsign stamp). No new share pipeline. */
  function sharePoster(area, items, range) {
    var shown = items.filter(function (r) { return r.enough_data && r.median_cents != null; }).slice(0, 6);
    function draw() {
      var cv = document.createElement('canvas');
      cv.width = 1080; cv.height = 1350;
      var x = cv.getContext('2d');
      x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
      x.fillStyle = '#c1121f'; x.fillRect(0, 0, 1080, 26);
      x.fillStyle = '#c1121f'; x.fillRect(0, 1324, 1080, 26);
      x.textAlign = 'center';
      x.fillStyle = '#f5f0e6';
      x.font = 'bold 76px system-ui, sans-serif';
      x.fillText('PRICES IN ' + String(area).toUpperCase().slice(0, 24), 540, 150);
      x.font = 'bold 30px system-ui, sans-serif'; x.fillStyle = '#c1121f';
      x.fillText('THE PEOPLE\u2019S PRICE BOARD', 540, 205);
      x.font = '24px system-ui, sans-serif'; x.fillStyle = '#b8b0a0';
      x.fillText('community-reported · ' + String(range).slice(0, 48), 540, 245);
      var y = 330;
      if (!shown.length) {
        x.fillStyle = '#b8b0a0'; x.font = '30px system-ui, sans-serif';
        x.fillText('Not enough reports yet.', 540, y + 40);
        x.fillText('Report a price at MTCSTW.COM', 540, y + 90);
      } else {
        shown.forEach(function (r) {
          var item = itemById(r.item_id);
          x.textAlign = 'left'; x.fillStyle = '#f5f0e6'; x.font = 'bold 34px system-ui, sans-serif';
          x.fillText(item.name + ' / ' + item.unit, 90, y);
          x.textAlign = 'right'; x.fillStyle = '#ffffff'; x.font = 'bold 44px system-ui, sans-serif';
          x.fillText(money(r.median_cents), 990, y);
          var d = Number(r.delta_pct);
          if (!isNaN(d) && r.week_ago_median_cents) {
            x.fillStyle = d > 0 ? '#c98f8f' : (d < 0 ? '#9fc98f' : '#b8b0a0');
            x.font = '28px system-ui, sans-serif';
            var arrow = d > 0 ? '\u25B2' : (d < 0 ? '\u25BC' : '\u25AA');
            x.fillText(arrow + ' ' + Math.abs(d).toFixed(1) + '% vs last wk', 990, y + 40);
          }
          x.strokeStyle = '#2a2a2a'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(90, y + 62); x.lineTo(990, y + 62); x.stroke();
          y += 118;
        });
      }
      x.textAlign = 'center';
      x.fillStyle = '#8f887a'; x.font = '22px system-ui, sans-serif';
      x.fillText('Community-reported prices — not official data.', 540, 1150);
      x.fillStyle = '#c1121f'; x.font = 'bold 54px system-ui, sans-serif';
      x.fillText('JOIN THE FIGHT.', 540, 1215);
      x.fillStyle = '#f5f0e6'; x.font = 'bold 34px system-ui, sans-serif';
      x.fillText('MTCSTW.COM', 540, 1270);
      return cv;
    }
    try {
      var cv = draw();
      var fname = 'prices-' + String(area).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      if (window.PFShare && PFShare.shareImage) {
        PFShare.shareImage(cv, fname, 'PRICES IN ' + String(area).toUpperCase(), 'inflation-tracker', {});
      } else {
        /* Share pipeline absent — plain download, never a dead button. */
        cv.toBlob(function (blob) {
          if (!blob) { toast('Poster failed — try again.'); return; }
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = fname;
          document.body.appendChild(a); a.click();
          setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 4000);
          toast('Image downloaded.');
        }, 'image/png');
      }
    } catch (e) { toast('Poster failed — try again.'); }
  }

  /* ================= 3. TRENDS + PEOPLE'S INDEX ================= */
  function mountTrends() {
    if (PF.skip('inflation-trends')) return;
    var mount = document.getElementById('pf-inflation-trends');
    if (!mount) return; /* silent no-op */

    var itemId = 'eggs';
    var area = lastArea();
    var weeks = 12;

    function render() {
      var opts = BASKET.map(function (it) {
        return '<option value="' + esc(it.id) + '"' + (it.id === itemId ? ' selected' : '') + '>' +
          esc(it.name) + ' — ' + esc(it.unit) + '</option>';
      }).join('');
      mount.innerHTML =
        '<div style="' + CSS + '">' +
        '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">TRENDS & THE PEOPLE\u2019S INDEX</h2>' +
        '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Weekly medians from community reports — next to the official numbers, honestly labeled.</div>' +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label>' +
        '<select id="pf-inf-tr-item" style="' + INPUT + 'margin-bottom:10px;">' + opts + '</select>' +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">AREA <span style="' + SMALL + '">(blank = national)</span></label>' +
        '<input id="pf-inf-tr-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'margin-bottom:10px;" value="' + esc(area) + '">' +
        '<button id="pf-inf-tr-go" style="' + BTN + '">SHOW TRENDS</button>' +
        '<div id="pf-inf-tr-out" style="margin-top:14px;"><div style="color:#b8b0a0;">Pick an item and hit SHOW TRENDS.</div></div>' +
        '</div>';
      document.getElementById('pf-inf-tr-item').onchange = function () { itemId = this.value; };
      document.getElementById('pf-inf-tr-go').onclick = load;
    }
    function barsHTML(buckets, moneyMode) {
      /* Null buckets render as gaps — never interpolate. */
      var vals = buckets.map(function (b) { return (b.median_cents != null || b.value != null) ? Number(b.median_cents != null ? b.median_cents : b.value) : null; });
      var max = 0;
      vals.forEach(function (v) { if (v != null && v > max) max = v; });
      if (!max) max = 1;
      var cols = buckets.map(function (b, i) {
        var v = vals[i];
        var lbl = weekLabel(b.week_start);
        if (v == null) {
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;">' +
            '<div title="No reports that week" style="width:70%;height:8px;border:2px dashed #444;border-radius:3px;"></div>' +
            '<div style="' + SMALL + 'font-size:10px;margin-top:4px;white-space:nowrap;">' + esc(lbl) + '</div></div>';
        }
        var hgt = Math.max(6, Math.round((v / max) * 110));
        var val = moneyMode ? money(v) : String(v);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;">' +
          '<div style="font-size:10px;color:#d8d0c0;margin-bottom:2px;white-space:nowrap;">' + esc(val) + '</div>' +
          '<div title="' + esc(lbl) + ': ' + esc(val) + '" style="width:70%;height:' + hgt + 'px;background:#c1121f;border-radius:3px 3px 0 0;"></div>' +
          '<div style="' + SMALL + 'font-size:10px;margin-top:4px;white-space:nowrap;">' + esc(lbl) + '</div></div>';
      }).join('');
      return '<div style="display:flex;align-items:flex-end;gap:4px;height:190px;">' + cols + '</div>';
    }
    /* ---- Official CPI-U baseline: it comes from its own endpoint
       (?action=cpi_compare -> {official: {cpi_u_all_items: {...} | null,
       ...} | null}), NOT from price_trends. Render value + period +
       retrieval date so users see when the baseline was pulled.
       Fail-soft: a 404/null leaves the honest pending copy in place. ---- */
    function officialPendingHTML() {
      return '<div style="color:#b8b0a0;font-size:14px;">Official baseline pending — check back. We won\u2019t draw a line we don\u2019t have.</div>';
    }
    function officialHTML(off) {
      var src = safeUrl(off.source_url) || 'https://www.bls.gov/cpi/';
      /* The backend calls it source_date; retrieval_date is accepted too. */
      var rd = off.retrieval_date || off.source_date;
      var line = off.period
        ? 'CPI-U, ' + esc(String(off.period)) +
          (off.unit ? ' (' + esc(String(off.unit)) + ')' : '') + ' · source: '
        : 'CPI-U · release period unknown — verify the latest release at ';
      return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;">' +
        '<div style="font-size:26px;font-weight:bold;">' + esc(String(off.value)) + '</div>' +
        '<div style="' + SMALL + '">' + line +
        '<a href="' + esc(src) + '" target="_blank" rel="noopener" style="color:#e8a0a0;">bls.gov</a>' +
        (off.period ? '' : '.') +
        (rd ? '<br>Baseline pulled ' + esc(String(rd)) + '.' : '') +
        '</div></div>';
    }
    function load() {
      var out = document.getElementById('pf-inf-tr-out');
      var aRaw = document.getElementById('pf-inf-tr-area').value.trim();
      var aKey = aRaw ? validArea(aRaw) : 'national';
      if (aRaw && !aKey) { out.innerHTML = '<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — or leave it blank for national.</span>'; return; }
      if (aKey && aKey !== 'national') { area = aKey; saveArea(aKey); }
      out.innerHTML = '<div style="color:#b8b0a0;">Loading trends…</div>';
      getJSON('price_trends', { item_id: itemId, area_key: aKey, weeks: weeks }, function (j) {
        if (!j || j.ok === false) {
          out.innerHTML = '<span style="color:#e8a0a0;">Trends unavailable right now. Try again later.</span>';
          return;
        }
        var item = itemById(itemId);
        /* Real backend shape: weeks is a NUMBER (the window length); the
           series array rides on buckets. Reading j.weeks as the array —
           the old doc's shape — always rendered "No trend data yet." */
        var buckets = Array.isArray(j.buckets) ? j.buckets : [];
        var n = 0;
        buckets.forEach(function (b) { n += Number(b.sample_count) || 0; });
        var h = '<h3 style="margin:4px 0 8px;font-size:16px;">' + esc(item.name) + ' / ' + esc(item.unit) +
          ' — weekly medians <span style="' + SMALL + '">community-reported, n=' + n + ' reports</span></h3>' +
          poweredBy(j.contributors, 'trailing ' + weeks + ' weeks', 'report a price and start it');
        if (!buckets.length) {
          h += '<div style="color:#b8b0a0;">No trend data yet for this item. Report a price to start it.</div>';
        } else {
          h += barsHTML(buckets, true);
          h += '<div style="' + HONEST + '">Weekly medians of community-reported prices. Empty slots = no reports that week — we don\u2019t guess.</div>';
        }
        /* ---- People's Index vs official ---- */
        h += '<h3 style="margin:18px 0 8px;font-size:16px;">PEOPLE\u2019S INDEX vs OFFICIAL CPI-U</h3>';
        var pi = Array.isArray(j.peoples_index) ? j.peoples_index : [];
        if (pi.length) {
          /* Suppression respected: the "powered by" headline renders only
             when the index has >=1 data point this window. */
          var piHasData = pi.some(function (p) { return p.value != null; });
          h += '<div style="font-size:13px;font-weight:bold;margin-bottom:4px;">People\u2019s Index</div>' +
            (piHasData ? poweredBy(j.contributors, 'trailing ' + weeks + ' weeks', 'report a price and start it') : '');
          h += barsHTML(pi.map(function (p) { return { week_start: p.week_start, value: p.value }; }), false);
        } else {
          h += '<div style="color:#b8b0a0;font-size:14px;">People\u2019s Index: not enough community data yet.</div>';
        }
        h += '<div style="font-size:13px;font-weight:bold;margin:12px 0 4px;">Official CPI-U <span style="' + SMALL + '">(BLS — the official number)</span></div>';
        /* Render the honest pending copy FIRST; the cpi_compare call below
           swaps in the real baseline if the backend has one. A 404 or a
           null official leaves this copy in place — fail-soft. */
        h += '<div id="pf-inf-tr-official">' + officialPendingHTML() + '</div>';
        h += '<div style="' + HONEST + '">How to read this: the People\u2019s Index is the weekly median of community-reported prices across our 12-item basket (groceries, gas, electricity, rent). The official CPI-U covers all-items — housing is about 36% of it, plus services and transport we don\u2019t track. These are genuinely different baskets, so compare the direction, not the digits. The People\u2019s Index is rebased to the first week of your window, so its level is relative, not absolute. Community numbers are never presented as official.</div>';
        out.innerHTML = h;
        getJSON('cpi_compare', {}, function (c) {
          var box = document.getElementById('pf-inf-tr-official');
          if (!box) return;
          var off = (c && c.official) || null;
          /* cpi_compare nests the baseline per series; the headline
             all-items series is the official number we render. A flat
             {value, period, ...} official is also accepted. */
          if (off && off.value == null)
            off = off.cpi_u_all_items || off.cpi_food_at_home || null;
          if (off && off.value != null) { box.innerHTML = officialHTML(off); }
          /* else: keep the pending fallback — never draw a line we don't have. */
        });
      });
    }
    render();
  }

  /* ================= 4. NOWCAST CROWD CREDIT (dormant until U-02 ships) ====
     Consumer contract — the U-02 producer must emit this shape:
       nowcast: { week_start, value|null,
                  hit_rate: {correct, total} | null,
                  reports_n, contributors_n, window_label, experimental: true }
     Sources (first hit wins): #pf-nowcast-credit[data-pf-nowcast] JSON →
       window.__PF_NOWCAST__ → `nowcast` field on cpi_compare
       (include_nowcast=1). Absent everywhere → renders nothing (dormant,
       never a fake credit).
     Copy: "based on N community price reports from M contributors" + hit-rate
     honesty ("called the direction right X of last Y") or "backtesting in
     progress — no hit rate yet." Display-only; grants nothing. */
  function mountNowcastCredit() {
    if (creditOff()) return;
    var mount = document.getElementById('pf-nowcast-credit');
    if (!mount) return; /* silent no-op */

    function pick(obj) {
      if (!obj || typeof obj !== 'object') return null;
      var nc = obj.nowcast || obj;
      if (!nc || typeof nc !== 'object') return null;
      if (nc.reports_n == null && nc.contributors_n == null && !nc.hit_rate) return null;
      return nc;
    }
    function render(nc) {
      if (!nc) { mount.innerHTML = ''; return; } /* dormant */
      var rn = Number(nc.reports_n), cn = Number(nc.contributors_n);
      var vintage = nc.window_label ? String(nc.window_label) : 'recent weeks';
      var credit = (!isNaN(rn) && !isNaN(cn) && (rn > 0 || cn > 0))
        ? 'based on ' + esc(String(rn)) + ' community price reports from ' +
          esc(String(cn)) + ' contributors (' + esc(vintage) + ')'
        : 'no contributors yet';
      var hr = nc.hit_rate, hrLine;
      if (hr && !isNaN(Number(hr.correct)) && !isNaN(Number(hr.total)) && Number(hr.total) > 0) {
        hrLine = 'Hit rate: called the direction right ' + esc(String(hr.correct)) +
          ' of the last ' + esc(String(hr.total)) + ' CPI releases.';
      } else {
        hrLine = 'Backtesting in progress — no hit rate yet.';
      }
      mount.innerHTML =
        '<div style="' + CSS + '">' +
        '<h3 style="margin:0 0 4px;font-size:16px;letter-spacing:1px;">EXPERIMENTAL NOWCAST</h3>' +
        '<div style="' + SMALL + '">' + credit + '</div>' +
        '<div style="' + HONEST + '">' + hrLine +
        ' The nowcast is experimental — compare the direction, not the digits.</div>' +
        '</div>';
    }
    var fromAttr = null;
    try {
      var raw = mount.getAttribute('data-pf-nowcast');
      fromAttr = raw ? pick(JSON.parse(raw)) : null;
    } catch (e) { fromAttr = null; }
    if (fromAttr) { render(fromAttr); return; }
    var fromWin = null;
    try { fromWin = pick(window.__PF_NOWCAST__); } catch (e) {}
    if (fromWin) { render(fromWin); return; }
    /* Last resort: ask the backend (U-02 will serve `nowcast` on cpi_compare
       with include_nowcast=1). Fail-soft: absence keeps the mount empty. */
    getJSON('cpi_compare', { include_nowcast: '1' }, function (c) {
      try { if (!mount.isConnected) return; } catch (e) {}
      render(pick(c && c.nowcast));
    });
  }

  /* ---------------- init ---------------- */
  try { mountCheckin(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
  try { mountBoard(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
  try { mountTrends(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
  try { mountNowcastCredit(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
})();
