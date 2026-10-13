/* games/peoples-cpi.js  |  PF v1.4.3 | THE PEOPLE'S PRICE INDEX — public page.
   The press-scale public face of the crowdsourced inflation tracker:
   headline composite -> two-lines chart -> methodology -> basket spotlight ->
   submit CTA -> shareables -> official FRED context rail. /economy stays the
   working hub (report prices, boards, deep-dives); this page is read-first,
   share-first.
   SELF-MOUNTING SILO: renders into div#pf-peoples-cpi at bundle time (the
   Squarespace /peoples-cpi page carries the Code-block hand-step). page-mount.js
   positions it via the SELF registry; silent no-op when the div is absent.
   BACKEND (read-only JSONP, no auth, no XP):
     price_board   ?area_key=national            -> trailing-30d item medians
     price_trends  ?item_id=X&area_key=national&weeks=N -> buckets + peoples_index
       CONTRACT GAP (spec §6.3): price_trends currently REJECTS area_key=national
       (normalizeArea -> invalid_area). The national composite probe below is
       forward-compatible: when the backend lands the extension, the headline
       and chart legs light up with zero FE changes. Until then the honest
       wiring panel renders — never a guess, never an estimate.
     cpi_compare   (no params)                  -> official baseline rows + note
     fred_series   ?series_id=CPIAUCNS&limit=N   -> official monthly observations
   DATA HONESTY (binding, spec §2):
     - A single constants module (CPI_LABELS) owns every badge/label string;
       no inline badge strings anywhere below it.
     - The dual chart is built from two independently fetched series objects;
       renderDualChart FAILS CLOSED (honest panel) if either series' `kind`
       label is missing.
     - Minimum-n is enforced client-side as well as server-side: a figure
       renders only when enough_data && sample_count>=5 && contributors>=3.
     - Null trend buckets BREAK the SVG line — never interpolated, never
       zero-filled.
     - Official null -> "official baseline pending — check back". Every official
       figure carries series ID + vintage + source link. Stale official legs
       render the last good vintage + badge, and the comparison pauses.
     - NEVER invented data: every number on this page arrives in a JSONP
       response. Empty responses -> honest empty panels, never flat lines.
   ZERO ECONOMY: no XP anywhere in this module — recognition only.
   KILL: ?pf_off=peoples-cpi (master) or ?pf_off=peoples-cpi-chart /
   ?pf_off=peoples-cpi-share (section kills). Spine phase: FIGHT.
   WS-6 TEARDOWN (2026-10-06, proposal PART 2 §6): the national headline is a
   Data Strip (P4) at hero scale; basket-spotlight movers are price cards —
   sparkline trend + recency badge + report count (P8 proof) + one-tap
   confirm as REPORT BACK (P3) into /economy#pf-inflation-checkin/<item>.
   Trend colors are gray/white ONLY (red never means up/down). Every figure
   renders through stripFigure(): figure + label + source + recency stamp,
   fail-closed. Confirms mint zero XP (zero XP awarded anywhere on the confirm
   path); published aggregates stay callsign-gated in the existing
   inflation-tracker report rail, which this module does not bypass. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('peoples-cpi')) { return; }
  try {
    var _href = window.location.href || '';
    if (_href.indexOf('/config/') !== -1) return;
    var _bd = document.body;
    if (_bd && (_bd.classList.contains('sqs-edit-mode') || _bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}
  var host = null;
  try { host = document.getElementById('pf-peoples-cpi'); } catch (e) {}
  if (!host) { return; } /* not the /peoples-cpi page — silent no-op */
  if (host.getAttribute('data-pf-cpi-mounted')) return;
  host.setAttribute('data-pf-cpi-mounted', '1');

  /* ============ CPI_LABELS — the single label module (spec §2.2).
     Every badge/label string on this page comes from here. ============ */
  var CPI_LABELS = {
    COMMUNITY_BADGE: 'CROWDSOURCED',
    COMMUNITY_FULL: "PEOPLE'S PRICE INDEX \u2014 crowdsourced, not official.",
    COMMUNITY_SUB: 'Reported by {N} people over {window}. Community medians, not a government statistic.',
    OFFICIAL_BADGE: 'OFFICIAL',
    OFFICIAL_FULL: 'OFFICIAL CPI \u2014 BLS via FRED \u00b7 CPIAUCNS',
    RAIL_LABEL: 'OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA',
    DUAL_HEADER: 'Two ways of counting. Two separate lines. Never merged.',
    OFFICIAL_CONNECTING: 'OFFICIAL DATA CONNECTING \u2014 nothing here is estimated',
    OFFICIAL_PENDING: 'Official baseline pending \u2014 check back',
    ETHICS: 'Your reports become anonymous community medians. Never sold. ZIP or city only \u2014 never your address, never your name. Recognition only: 0 XP.',
    METHODOLOGY_NOTE: 'The official number is a national average built from thousands of surveyed prices (BLS fixed basket). The People\u2019s Price Index above is what real people in this movement actually paid (crowdsourced basket). Different methods, different stories \u2014 both worth seeing. They are shown side by side and never merged into one number.'
  };

  var BACKEND = window.PF_BACKEND_URL;
  var RED = '#dc143c', PAPER = '#f5f0e6', INK = '#141414';

  /* Basket ids VERIFIED against the backend v99 seed ids (milk, eggs, bread,
     ground_beef, chicken_breast, white_rice, bananas, butter, coffee_12oz,
     gasoline, electricity, rent_1br). */
  var BASKET = [
    { id: 'milk', name: 'Milk', unit: 'gallon' },
    { id: 'eggs', name: 'Eggs', unit: 'dozen' },
    { id: 'bread', name: 'Bread', unit: 'loaf' },
    { id: 'ground_beef', name: 'Ground beef', unit: 'lb' },
    { id: 'chicken_breast', name: 'Chicken breast', unit: 'lb' },
    { id: 'white_rice', name: 'White rice', unit: 'lb' },
    { id: 'bananas', name: 'Bananas', unit: 'lb' },
    { id: 'butter', name: 'Butter', unit: 'lb' },
    { id: 'coffee_12oz', name: 'Coffee', unit: '12oz bag' },
    { id: 'gasoline', name: 'Gasoline', unit: 'gallon' },
    { id: 'electricity', name: 'Electricity', unit: 'kWh' },
    { id: 'rent_1br', name: 'Rent (1BR)', unit: 'month' }
  ];
  function itemById(id) {
    for (var i = 0; i < BASKET.length; i++) if (BASKET[i].id === id) return BASKET[i];
    return { id: id, name: String(id), unit: '' };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(cents) {
    if (cents == null || isNaN(cents)) return '\u2014';
    return '$' + (Number(cents) / 100).toFixed(2);
  }
  /* WS-6 pattern access (fail-open: null when ?pf_off=patterns). */
  function patterns() {
    try { return (window.PF && PF.patterns) || null; } catch (e) { return null; }
  }
  /* Trend line colors — gray/white ONLY. Red never means up/down. */
  var LINE_COMM = '#f5f0e6', LINE_OFF = '#8a8a8a';
  /* Relative recency stamp for the trust line ("40 min ago", "3 h ago"). */
  function relTime(ts) {
    var t = Number(ts);
    if (!isFinite(t) || t <= 0) return '';
    if (t < 1e12) t *= 1000; /* seconds -> ms */
    var diff = Date.now() - t;
    if (diff < 0) diff = 0;
    var m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    var d = Math.floor(h / 24);
    if (d < 7) return d + ' d ago';
    return fmtD(t);
  }
  function weekLabelCPI(ws) {
    try {
      var d = new Date(typeof ws === 'number' ? ws : String(ws) + 'T12:00:00');
      if (isNaN(d.getTime())) return '';
      return MONTHS[d.getMonth()] + ' ' + d.getDate();
    } catch (e) { return ''; }
  }
  /* Recency for a price_board payload: real timestamp when the backend
     supplies one, else the board window label — never empty, so the Data
     Strip's recency stamp is always present. */
  function boardRecency(b) {
    var ts = (b && (b.updated_at || b.retrieved_at)) || null;
    var rel = relTime(ts);
    if (rel) return rel;
    var we = (b && (b.week_end || b.end || b.week_start || b.start)) || null;
    if (we) {
      var lbl = weekLabelCPI(we);
      if (lbl) return 'week of ' + lbl;
    }
    return 'this week';
  }
  /* WS-6 trust-stamp primitive: figure + label + source + recency, routed
     through PF.patterns.dataStrip (P4) when available. FAIL-CLOSED: returns
     '' unless all four trust elements are present — a figure without its
     source line and recency stamp renders NOTHING. When the patterns module
     is killed (?pf_off=patterns), the same four elements render in manual
     markup instead of blanking the page. */
  function stripFigure(o) {
    var pt = patterns();
    if (pt && pt.dataStrip) return pt.dataStrip(o);
    var fig = String(o.figure == null ? '' : o.figure).trim();
    var label = String(o.label == null ? '' : o.label).trim();
    var src = String(o.source == null ? '' : o.source).trim();
    var upd = String(o.updated == null ? '' : o.updated).trim();
    if (!fig || !label || !src || !upd) return '';
    return '<div class="pf-pat pf-pat-data">' +
      '<p class="pf-pat-data-fig">' + esc(fig) + '</p>' +
      '<p class="pf-pat-data-label">' + esc(label) + '</p>' +
      '<div class="pf-pat-data-rule"></div>' +
      '<p class="pf-pat-data-src">' + esc(src) + '</p>' +
      '<p class="pf-pat-data-time">updated ' + esc(upd) + '</p></div>';
  }
  /* Inline 12-week sparkline — gray/white only. Null buckets break the
     line; fewer than 2 live points -> the caller drops the slot. */
  function sparkSVG(pts) {
    var W = 220, H = 52, PL = 4, PR = 4, PT = 6, PB = 6;
    var iw = W - PL - PR, ih = H - PT - PB;
    var live = pts.filter(function (v) { return v != null; });
    var mn = Math.min.apply(null, live), mx = Math.max.apply(null, live);
    if (mx === mn) mx = mn + 1;
    function sx(i) { return PL + (pts.length < 2 ? iw / 2 : (i / (pts.length - 1)) * iw); }
    function sy(v) { return PT + ih - ((v - mn) / (mx - mn)) * ih; }
    var d = '', pen = false;
    for (var k = 0; k < pts.length; k++) {
      if (pts[k] == null) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + sx(k).toFixed(1) + ' ' + sy(pts[k]).toFixed(1) + ' ';
      pen = true;
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" role="img" aria-label="12-week trend">' +
      '<path d="' + d + '" fill="none" stroke="#d8d0c0" stroke-width="2"/></svg>';
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtD(ts) {
    var d = new Date(Number(ts)); if (isNaN(d)) return '';
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }
  function fmtDL(ts) {
    var d = new Date(Number(ts)); if (isNaN(d)) return '';
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }
  function err(m) { try { if (PF && PF.error) PF.error('peoples-cpi', m); } catch (e) {} }

  /* JSONP read rail — public actions, no auth, 12s fail-soft timeout. */
  function jsonp(action, params, cb) {
    var done = false;
    var s = document.createElement('script');
    var fn = 'pfCpiCb' + Math.floor(Math.random() * 1e9);
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
      try { cb(j); } catch (e3) { err('cb threw: ' + (e3 && e3.message)); }
    }
    if (!BACKEND) { setTimeout(function () { finish(null); }, 0); return; }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    try { document.head.appendChild(s); } catch (e) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000);
  }

  /* Honesty gate (client-side mirror of the backend minimum-n rule):
     a figure renders ONLY when the backend says enough_data AND the raw
     counts clear n>=5 with >=3 distinct contributors. */
  function okFigure(b) {
    return !!(b && b.enough_data && Number(b.sample_count) >= 5 && Number(b.contributors) >= 3);
  }
  function okIndexWeek(p) {
    return !!(p && p.value != null && Number(p.items_with_data) > 0);
  }

  /* ============ shell ============ */
  function cssOnce() {
    try {
      if (document.getElementById('pf-cpi-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-cpi-css';
      st.textContent = [
        '.pf-cpi{max-width:980px;margin:0 auto;padding:4px 0 30px;color:' + PAPER + ';font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;}',
        '.pf-cpi-sec{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:20px;margin:0 0 16px;}',
        '.pf-cpi-kicker{font-size:12px;letter-spacing:5px;color:' + RED + ';font-weight:800;margin-bottom:8px;}',
        '.pf-cpi-h2{font-size:22px;letter-spacing:2px;font-weight:900;margin:0 0 6px;color:' + PAPER + ';}',
        '.pf-cpi-sub{font-size:14px;color:#d8d0c0;line-height:1.55;margin:0 0 14px;}',
        '.pf-cpi-badge{display:inline-block;font-size:11px;font-weight:900;letter-spacing:2px;padding:4px 10px;border-radius:3px;margin:2px 4px 2px 0;}',
        '.pf-cpi-badge.crowd{background:' + RED + ';color:#fff;}',
        '.pf-cpi-badge.off{background:#3a3a3a;color:' + PAPER + ';border:1px solid #6a6a6a;}',
        '.pf-cpi-big{font-size:64px;font-weight:900;color:#fff;letter-spacing:1px;line-height:1;margin:8px 0 4px;}',
        '.pf-cpi-meta{font-size:13px;color:#b8b0a0;line-height:1.6;}',
        '.pf-cpi-empty{border:2px dashed #4a4a4a;border-radius:8px;padding:22px;text-align:center;color:#d8d0c0;font-size:15px;line-height:1.6;}',
        '.pf-cpi-btn{display:inline-block;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:2px;font-size:15px;padding:14px 30px;border-radius:8px;text-decoration:none;border:0;cursor:pointer;}',
        '.pf-cpi-btn.ghost{background:#1a1a1a;border:1px solid #3a3a3a;color:' + PAPER + ';}',
        '.pf-cpi-ethic{font-size:13px;color:#a89e88;line-height:1.65;margin-top:14px;max-width:640px;}',
        '.pf-cpi select{background:#1a1a1a;border:1px solid #3a3a3a;color:' + PAPER + ';border-radius:6px;padding:8px 10px;font-size:14px;margin:0 8px 8px 0;}',
        '.pf-cpi input{background:#1a1a1a;border:1px solid #3a3a4a;color:' + PAPER + ';border-radius:6px;padding:8px 10px;font-size:14px;margin:0 8px 8px 0;}',
        '.pf-cpi-legend{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 6px;font-size:13px;color:#d8d0c0;align-items:center;}',
        '.pf-cpi-swatch{display:inline-block;width:26px;height:0;border-top:4px solid #f5f0e6;vertical-align:middle;margin-right:6px;}',
        '.pf-cpi-swatch.off{border-top:4px dashed #8a8a8a;}',
        '.pf-cpi-tapline{font-size:13px;color:#e8c96a;min-height:20px;margin-top:6px;}',
        /* WS-6: hero-scale Data Strip (P4) for the national headline. */
        '.pf-cpi-hero{margin:6px 0 4px;}',
        '.pf-cpi-hero .pf-pat-data{padding:10px 8px;}',
        '.pf-cpi-hero .pf-pat-data-fig{font-size:68px;line-height:1;}',
        /* WS-6: price-card grid (basket spotlight). */
        '.pf-cpi-cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:14px 0;}',
        '.pf-cpi-cardgrid .pf-pat-intel{margin:0;}',
        '.pf-cpi-spark{margin:10px 0 4px;}',
        '.pf-cpi-delta{font-size:13px;font-weight:700;color:#d8d0c0;margin:6px 0;}',
        '.pf-cpi-recency{display:inline-block;font-size:10px;font-weight:800;letter-spacing:1.5px;background:#1a1a1a;border:1px solid #3a3a3a;color:#d8d0c0;padding:4px 9px;border-radius:3px;margin:8px 4px 0 0;}',
        '.pf-cpi-capline{font-size:12px;color:#8f887a;margin:10px 0 8px;}',
        '.pf-cpi-railcard{background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin:0 0 10px;}',
        '.pf-cpi-railcard .v{font-size:28px;font-weight:900;color:#fff;}',
        '.pf-cpi-stale{display:inline-block;background:#3a2a00;color:#e8c96a;font-size:12px;font-weight:700;padding:3px 8px;border-radius:3px;margin-left:8px;}',
        '.pf-cpi-cap{width:100%;background:#1a1a1a;border:1px solid #3a3a3a;color:#d8d0c0;border-radius:6px;padding:10px;font-size:13px;line-height:1.5;font-family:Arial,sans-serif;}',
        '.pf-cpi-sharecard{background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin:0 0 12px;}',
        '.pf-cpi-next{text-align:center;border:2px solid ' + RED + ';border-radius:10px;padding:22px;margin:26px 0 0;background:#12060a;}',
        '.pf-cpi-load{color:#b8b0a0;font-size:14px;padding:14px 0;}',
        '.pf-cpi-fine{font-size:12px;color:#8f887a;line-height:1.6;margin-top:10px;}',
        '.pf-cpi a{color:#e8a0a0;}'
      ].join('\n');
      document.head.appendChild(st);
    } catch (e) {}
  }

  cssOnce();
  /* WS-6: P6 Action Bar — every surface ends with the same three handoffs. */
  var _pt0 = patterns();
  var _actionBar = (_pt0 && _pt0.actionBar)
    ? _pt0.actionBar({ shareUrl: '#pf-cpi-share', cellUrl: '/cells', reportUrl: '/economy#pf-inflation-checkin' })
    : '';
  var root = document.createElement('div');
  root.className = 'pf-cpi';
  root.innerHTML =
    '<div class="pf-cpi-sec" id="pf-cpi-headline"><div class="pf-cpi-load">Counting the people\u2019s prices&hellip;</div></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-chart"><div class="pf-cpi-load">Drawing the two lines&hellip;</div></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-method"></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-spot"><div class="pf-cpi-load">Scanning the basket&hellip;</div></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-cta"></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-share"><div class="pf-cpi-load">Loading shareables&hellip;</div></div>' +
    '<div class="pf-cpi-sec" id="pf-cpi-rail"><div class="pf-cpi-load">Pulling the official numbers&hellip;</div></div>' +
    '<div class="pf-cpi-next">' +
    '<div class="pf-cpi-kicker">NEXT MOVE</div>' +
    '<div style="font-size:17px;font-weight:900;letter-spacing:1px;margin-bottom:6px;">FEED THE INDEX</div>' +
    '<div class="pf-cpi-sub" style="text-align:center;max-width:560px;margin-left:auto;margin-right:auto;">The index is only as sharp as its reporters. Report what you paid this week \u2014 it takes a minute.</div>' +
    '<a class="pf-cpi-btn" href="/economy#pf-inflation-checkin">REPORT A PRICE \u2192</a>' +
    '<div style="margin-top:10px;"><a href="/economy" style="font-size:13px;">FULL TOOLKIT \u2192 /economy</a></div>' +
    '</div>' + _actionBar;
  host.appendChild(root);
  function sec(id) { return document.getElementById(id); }

  var state = { weeks: 12, bItem: 'eggs', bWeeks: 12, board: null, trends: null, trendsGap: false, fred: null, fredLive: true, compare: null };

  /* ============ 1. HEADLINE BLOCK ============ */
  function paintHeadline() {
    var el = sec('pf-cpi-headline');
    if (!el) return;
    var badge = '<span class="pf-cpi-badge crowd">' + CPI_LABELS.COMMUNITY_BADGE + '</span>';
    function shell(inner) {
      return '<div class="pf-cpi-kicker">THE PEOPLE\u2019S PRICE INDEX \u2014 NATIONAL</div>' +
        '<div style="font-size:15px;color:#d8d0c0;margin-bottom:6px;">' + CPI_LABELS.COMMUNITY_FULL + '</div>' + inner;
    }
    /* Backend gap (spec §6.3): price_trends rejects area_key=national. The
       probe below detects error=invalid_area and renders the wiring panel —
       honest about the pending backend update, never a figure. */
    if (state.trends === null && !state.trendsGap) {
      el.innerHTML = shell('<div class="pf-cpi-load">Counting the people\u2019s prices&hellip;</div>');
      return;
    }
    if (state.trendsGap) {
      el.innerHTML = shell('<div class="pf-cpi-empty">The national composite is still being wired into the backend \u2014 the national board below is live. ' +
        'Report a price and be part of the first count.<br><br><a class="pf-cpi-btn" href="/economy#pf-inflation-checkin">REPORT A PRICE</a></div>');
      return;
    }
    var idx = (state.trends && state.trends.peoples_index) || [];
    var last = null;
    for (var i = idx.length - 1; i >= 0; i--) { if (okIndexWeek(idx[i])) { last = idx[i]; break; } }
    if (!last) {
      /* Honest empty state (spec §1.3.1) — never a figure, never an estimate.
         ZUCK BUTTER (WS-A, WS-D A2.9): ship the affordance, not the numbers —
         a tappable skeleton trains the tap-a-number gesture before the data
         lands. The sheet explains honestly what will live here. */
      el.innerHTML = shell('<div class="pf-cpi-empty">' + badge +
        '<div style="margin:10px 0;">Not enough reports yet to publish a national number. Report a price and be part of the first count.</div>' +
        '<div style="margin:14px auto;max-width:340px;"><div class="bt-shimmer" style="height:44px;border-radius:10px;" ' +
        'data-pf-fig="\u2014" data-pf-unit="people\u2019s median (national composite)" ' +
        'data-pf-source="crowdsourced price reports" data-pf-asOf="not yet" ' +
        'data-pf-chain="This is where the people\u2019s median will land|Comrades report prices they paid in stores|The median of real reports becomes the number \u2014 no estimates, ever|Report a price below and be part of the first count"></div>' +
        '<div style="font-size:11px;color:#8f887a;margin-top:6px;letter-spacing:.08em;">TAP THE SKELETON \u2014 THIS IS WHERE THE NUMBER LIVES</div></div>' +
        '<a class="pf-cpi-btn" href="/economy#pf-inflation-checkin">REPORT A PRICE</a></div>');
      return;
    }
    /* Rebase to 100 at the first week with data (spec §4.3). Rounding: 1 decimal. */
    var first = null;
    for (var k = 0; k < idx.length; k++) { if (okIndexWeek(idx[k])) { first = idx[k]; break; } }
    var val = Math.round((100 * last.value / first.value) * 10) / 10;
    var b = state.board, items = (b && b.items) || [];
    var live = items.filter(function (r) { return r && r.enough_data && r.median_cents != null; });
    var samples = 0, reporters = 0;
    live.forEach(function (r) { samples += Number(r.sample_count) || 0; reporters = Math.max(reporters, Number(r.contributors) || 0); });
    var sub = CPI_LABELS.COMMUNITY_SUB.replace('{N}', String(reporters)).replace('{window}', 'the trailing 30 days');
    /* WS-6: national headline = Data Strip (P4) at hero scale. Fail-closed:
       stripFigure returns '' without figure+label+source+recency — the page
       then shows the honest panel, never a naked figure. */
    var strip = stripFigure({
      figure: val.toFixed(1),
      label: 'THE PEOPLE\u2019S PRICE INDEX \u2014 NATIONAL',
      source: sub,
      updated: boardRecency(b)
    });
    if (strip) {
      el.innerHTML = shell(badge +
        '<div class="pf-cpi-hero">' + strip + '</div>' +
        '<div class="pf-cpi-meta">week of ' + esc(fmtD(last.week_start)) + ' \u2014 ' + esc(fmtD(last.week_start + 6 * 864e5)) +
        ' &nbsp;\u00b7&nbsp; ' + esc(String(last.items_with_data)) + ' of 12 items with data' +
        (live.length ? ' &nbsp;\u00b7&nbsp; ' + esc(String(samples)) + ' reports \u00b7 ' + esc(String(reporters)) + ' reporters (trailing 30 days, national board)' : '') + '</div>' +
        '<div style="margin-top:14px;"><a class="pf-cpi-btn" href="/economy#pf-inflation-checkin">REPORT A PRICE \u2192</a></div>');
      return;
    }
    el.innerHTML = shell('<div class="pf-cpi-empty">' + badge +
      '<div style="margin:10px 0;">The index is missing its trust stamp (source or recency) \u2014 no figure shown until the feed is complete.</div></div>');
  }

  /* ============ 2. THE TWO LINES (Chart A) ============ */
  /* Fail-closed dual renderer: refuses to draw unless BOTH series carry
     their `kind` label (spec §2.2). Returns false and paints the honest
     panel on violation. */
  function renderDualChart(el, community, official, opts) {
    if (!community || community.kind !== 'community' || !official || official.kind !== 'official') {
      el.innerHTML = '<div class="pf-cpi-empty">The chart needs both labeled series to draw honestly. ' +
        'Something arrived unlabeled \u2014 no line drawn. <a href="/economy#pf-inflation-trends">See the /economy trends</a>.</div>';
      err('dual chart refused: missing kind label');
      return false;
    }
    var weeks = opts.weeks, W = 660, H = 330, ML = 46, MR = 14, MT = 16, MB = 36;
    var iw = W - ML - MR, ih = H - MT - MB;
    var cpts = community.points, opts2 = official.points;
    /* Rebase: community 100 at first week with data; official 100 at the
       observation covering the first week of the window (spec §4.3). */
    var cb = null, ob = null, i;
    for (i = 0; i < cpts.length; i++) if (cpts[i].v != null) { cb = cpts[i].v; break; }
    for (i = 0; i < opts2.length; i++) if (opts2[i].v != null) { ob = opts2[i].v; break; }
    var c = cpts.map(function (p) { return { x: p.x, v: p.v == null || cb == null ? null : Math.round(100 * p.v / cb * 10) / 10, items: p.items }; });
    var o = opts2.map(function (p) { return { x: p.x, v: p.v == null || ob == null ? null : Math.round(100 * p.v / ob * 10) / 10, period: p.period, revised: p.revised, monthly: true }; });
    var all = [];
    c.forEach(function (p) { if (p.v != null) all.push(p.v); });
    o.forEach(function (p) { if (p.v != null) all.push(p.v); });
    if (!all.length) {
      el.innerHTML = '<div class="pf-cpi-empty">No data in this window yet \u2014 no line drawn.</div>';
      return true;
    }
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
    var pad = Math.max(0.4, (mx - mn) * 0.12); mn -= pad; mx += pad;
    function sx(idx) { return ML + (c.length < 2 ? iw / 2 : (idx / (c.length - 1)) * iw); }
    function sy(v) { return MT + ih - ((v - mn) / (mx - mn)) * ih; }
    function path(pts) {
      var d = '', pen = false;
      for (var k = 0; k < pts.length; k++) {
        if (pts[k].v == null) { pen = false; continue; } /* null bucket BREAKS the line */
        d += (pen ? 'L' : 'M') + sx(k).toFixed(1) + ' ' + sy(pts[k].v).toFixed(1) + ' ';
        pen = true;
      }
      return d;
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" role="img" aria-label="People\u2019s Price Index vs official CPI-U, rebased to 100">';
    /* gridlines + y labels */
    for (var g = 0; g <= 4; g++) {
      var gv = mn + (mx - mn) * g / 4, gy = sy(gv);
      s += '<line x1="' + ML + '" y1="' + gy.toFixed(1) + '" x2="' + (W - MR) + '" y2="' + gy.toFixed(1) + '" stroke="#2a2a2a" stroke-width="1"/>';
      s += '<text x="' + (ML - 6) + '" y="' + (gy + 4).toFixed(1) + '" fill="#8f887a" font-size="11" text-anchor="end">' + gv.toFixed(1) + '</text>';
    }
    /* x labels — thinned on narrow windows (spec §4.1 mobile rule) */
    var step = weeks <= 12 ? 2 : (weeks <= 26 ? 4 : 8);
    for (var xi = 0; xi < c.length; xi += step) {
      s += '<text x="' + sx(xi).toFixed(1) + '" y="' + (H - 10) + '" fill="#8f887a" font-size="11" text-anchor="middle">' + esc(fmtD(c[xi].x)) + '</text>';
    }
    var op = path(o);
    /* WS-6: trend colors gray/white ONLY — red never means up/down. */
    if (op) s += '<path d="' + op + '" fill="none" stroke="' + LINE_OFF + '" stroke-width="2.5" stroke-dasharray="7 5"/>';
    var cp = path(c);
    if (cp) s += '<path d="' + cp + '" fill="none" stroke="' + LINE_COMM + '" stroke-width="3"/>';
    /* hollow markers on monthly official observations (never drawn as weekly measurements) */
    o.forEach(function (p, k) {
      if (p.v == null || !p.monthly) return;
      s += '<circle cx="' + sx(k).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="4.5" fill="' + INK + '" stroke="' + LINE_OFF + '" stroke-width="2"><title>Monthly observation: ' + esc(String(p.period)) + '</title></circle>';
    });
    /* tap targets — no hover dependency (spec §4.1) */
    c.forEach(function (p, k) {
      if (p.v == null) return;
      s += '<circle class="pf-cpi-dot" data-k="' + k + '" cx="' + sx(k).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="9" fill="transparent" style="cursor:pointer;"/>';
      s += '<circle cx="' + sx(k).toFixed(1) + '" cy="' + sy(p.v).toFixed(1) + '" r="3.5" fill="' + LINE_COMM + '"/>';
    });
    s += '</svg>';
    var baseWeek = c.length ? fmtDL(c[0].x) : '';
    var html =
      '<div class="pf-cpi-kicker">THE TWO LINES</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:2px;">' + CPI_LABELS.DUAL_HEADER + '</div>' +
      '<div class="pf-cpi-sub" style="margin-bottom:4px;">Both series rebased to 100 at ' + esc(baseWeek) + ' for visual comparison. Rebased values are not official index levels.</div>' +
      '<div><label style="font-size:13px;color:#b8b0a0;">WINDOW </label>' +
      '<select id="pf-cpi-wks">' +
      [12, 26, 52].map(function (w) { return '<option value="' + w + '"' + (w === weeks ? ' selected' : '') + '>' + w + ' weeks</option>'; }).join('') +
      '</select></div>' +
      '<div class="pf-cpi-legend">' +
      '<span><span class="pf-cpi-swatch"></span>' + esc(CPI_LABELS.COMMUNITY_FULL) + ' <span class="pf-cpi-badge crowd">' + CPI_LABELS.COMMUNITY_BADGE + '</span></span>' +
      '<span><span class="pf-cpi-swatch off"></span>' + esc(CPI_LABELS.OFFICIAL_FULL) + ' <span class="pf-cpi-badge off">' + CPI_LABELS.OFFICIAL_BADGE + '</span></span>' +
      '</div>' + s +
      '<div class="pf-cpi-tapline" id="pf-cpi-tap">Tap a white point to inspect it.</div>' +
      '<div class="pf-cpi-fine">Hollow markers = monthly official observations (forward-filled to weeks \u2014 never presented as weekly measurements). Gaps in the red line = weeks with too few reports; we don\u2019t guess. ' + CPI_LABELS.METHODOLOGY_NOTE + '</div>';
    el.innerHTML = html;
    /* tap-to-inspect */
    var dots = el.querySelectorAll('.pf-cpi-dot');
    var tap = el.querySelector('#pf-cpi-tap');
    for (var d = 0; d < dots.length; d++) {
      (function (dot) {
        dot.addEventListener('click', function () {
          var k = Number(dot.getAttribute('data-k'));
          var p = c[k], q = o[k] || {};
          var t = 'Week of ' + fmtDL(p.x) + ' \u2014 People\u2019s ' + p.v.toFixed(1) + ' (crowdsourced' +
            (p.items != null ? ', ' + p.items + ' items' : '') + ')' +
            (q.v != null ? ' \u00b7 Official ' + q.v.toFixed(1) + ' (monthly obs' + (q.period ? ', ' + q.period : '') + (q.revised ? ' \u02b3' : '') + ')' : ' \u00b7 official: no observation yet');
          if (tap) tap.textContent = t;
        });
      })(dots[d]);
    }
    var wk = el.querySelector('#pf-cpi-wks');
    if (wk) wk.onchange = function () { state.weeks = Number(wk.value) || 12; loadWindow(); };
    return true;
  }

  /* ============ chart data assembly ============ */
  /* Official monthly observations forward-filled to weekly buckets.
     Forward-filled points carry the monthly flag (hollow marker + note) —
     never drawn as weekly measurements (spec §4.3). */
  function officialWeekly(obs, weekStarts) {
    var sorted = (obs || []).slice().sort(function (a, b) {
      return String(a.period) < String(b.period) ? -1 : 1;
    });
    var out = [];
    for (var w = 0; w < weekStarts.length; w++) {
      var best = null;
      for (var i = 0; i < sorted.length; i++) {
        var p = String(sorted[i].period || '');
        var t = Date.parse(p.length <= 7 ? p + '-01' : p);
        if (!isNaN(t) && t <= weekStarts[w]) {
          best = { v: Number(sorted[i].value), period: p, revised: !!sorted[i].revised };
        }
      }
      out.push({ x: weekStarts[w], v: best && isFinite(best.v) ? best.v : null, period: best ? best.period : null, revised: best && best.revised });
    }
    return out;
  }

  function paintChart() {
    var el = sec('pf-cpi-chart');
    if (!el) return;
    if (PF.skip('peoples-cpi-chart')) { el.innerHTML = ''; return; }
    var weeks = state.weeks;
    if (!state.trends && !state.trendsGap) {
      el.innerHTML = '<div class="pf-cpi-load">Drawing the two lines&hellip;</div>';
      return;
    }
    /* Shared x-domain: both legs draw against the same week buckets, so a
       missing leg never collapses the axis. */
    var t = state.trends;
    var wstarts = (t && t.peoples_index ? t.peoples_index : []).map(function (p) { return p.week_start; });
    if (!wstarts.length) {
      /* No community window — derive week starts from Monday UTC buckets. */
      var nowW = Date.now(), baseW = weekMondayUTC(nowW) - (weeks - 1) * 7 * 864e5;
      wstarts = [];
      for (var w0 = 0; w0 < weeks; w0++) wstarts.push(baseW + w0 * 7 * 864e5);
    }
    /* Official leg: fred_series CPIAUCNS. fred_live:false -> the approved
       connecting copy; official null -> pending copy. Never estimated. */
    var fred = state.fred;
    var official = null;
    var officialNote = '';
    if (!fred) {
      officialNote = '<div class="pf-cpi-empty">' + esc(CPI_LABELS.OFFICIAL_CONNECTING) + '</div>';
    } else if (fred.ok === false || fred.fred_live === false) {
      officialNote = '<div class="pf-cpi-empty">' + esc(CPI_LABELS.OFFICIAL_CONNECTING) + '</div>';
    } else if (!fred.observations || !fred.observations.length) {
      officialNote = '<div class="pf-cpi-empty">' + esc(CPI_LABELS.OFFICIAL_PENDING) + ' \u2014 we won\u2019t draw a line we don\u2019t have.</div>';
    } else {
      official = { kind: 'official', label: CPI_LABELS.OFFICIAL_FULL, points: officialWeekly(fred.observations, wstarts) };
    }
    /* Community leg: national composite probe (forward-compatible with the
       §6.3 backend extension; fail-soft until it lands). */
    var community = null;
    var commNote = '';
    if (state.trendsGap || !state.trends || state.trends.ok === false) {
      commNote = '<div class="pf-cpi-empty" style="margin-top:10px;">The community leg is still being wired (backend update needed) \u2014 the official line stands alone below. Report a price to speed it up: <a href="/economy#pf-inflation-checkin">report a price</a>.</div>';
      /* Same x-domain as the official leg (null values) — axis stays honest. */
      community = {
        kind: 'community', label: CPI_LABELS.COMMUNITY_FULL,
        points: wstarts.map(function (x) { return { x: x, v: null, items: 0 }; })
      };
    } else {
      var idx = state.trends.peoples_index || [];
      community = {
        kind: 'community', label: CPI_LABELS.COMMUNITY_FULL,
        points: idx.map(function (p) {
          return { x: p.week_start, v: okIndexWeek(p) ? Number(p.value) : null, items: p.items_with_data };
        })
      };
    }
    var anyCommunity = community.points.some(function (p) { return p.v != null; });
    if (!anyCommunity && !state.trendsGap) {
      /* Empty community window -> honest empty panel on the community side;
         the official line still renders alone (spec §7.2). */
      commNote = '<div class="pf-cpi-empty" style="margin-top:10px;">Not enough reports yet to draw the people\u2019s line \u2014 never a flat line, never a guess. <a href="/economy#pf-inflation-checkin">Report a price</a> and be part of the first count.</div>';
    }
    var staleBadge = '';
    if (official && fred && (fred.stale || Number(fred.days_old) > 45)) {
      var days = Number(fred.days_old) || 0;
      staleBadge = '<div style="margin:8px 0;"><span class="pf-cpi-stale">\u26a0 ' + esc(String(days)) + ' days old \u2014 expected monthly</span>' +
        '<div class="pf-cpi-fine">Comparison paused \u2014 CPIAUCNS is ' + esc(String(days)) + ' days past its expected refresh. The official line shows its last good vintage.</div></div>';
    }
    if (!official && !anyCommunity) {
      el.innerHTML = '<div class="pf-cpi-kicker">THE TWO LINES</div>' + officialNote + commNote;
      return;
    }
    /* When the official leg is missing, render the community chart alone
       with the official note; when the community leg is missing, the
       official line renders alone with the community note. The dual
       renderer still demands both KIND labels — fail-closed on unlabeled. */
    var drawEl = document.createElement('div');
    var fakeOfficial = official || { kind: 'official', label: CPI_LABELS.OFFICIAL_FULL, points: (community.points || []).map(function (p) { return { x: p.x, v: null }; }) };
    var fakeCommunity = (anyCommunity || state.trendsGap) ? community : { kind: 'community', label: CPI_LABELS.COMMUNITY_FULL, points: (official ? official.points : []).map(function (p) { return { x: p.x, v: null }; }) };
    var ok = renderDualChart(drawEl, fakeCommunity, fakeOfficial, { weeks: weeks });
    el.innerHTML = '';
    if (ok) el.appendChild(drawEl);
    else el.appendChild(drawEl);
    var note = document.createElement('div');
    if (!official) note.innerHTML = officialNote;
    else if (!anyCommunity) note.innerHTML = commNote;
    else if (state.trendsGap) note.innerHTML = commNote;
    if (staleBadge) {
      var sb = document.createElement('div');
      sb.innerHTML = staleBadge;
      el.appendChild(sb);
    }
    if (note.innerHTML) el.appendChild(note);
    /* Vintage stamps: series ID + vintage + source link on the official leg. */
    if (official && fred) {
      var vs = document.createElement('div');
      vs.className = 'pf-cpi-fine';
      var srcUrl = 'https://fred.stlouisfed.org/series/CPIAUCNS';
      vs.innerHTML = 'Official series: CPIAUCNS \u00b7 vintage ' + esc(String(fred.vintage_date || fred.retrieved_at || 'unknown')) +
        ' \u00b7 source <a href="' + srcUrl + '" target="_blank" rel="noopener">fred.stlouisfed.org/series/CPIAUCNS</a>' +
        ' \u00b7 community vintage: week of ' + esc(fmtD((state.trends && state.trends.period_start) || Date.now()));
      el.appendChild(vs);
    }
    /* The chart share-card unlocks once the chart drew — repaint shareables. */
    try { paintShare(); } catch (e) {}
  }
  function weekMondayUTC(ts) {
    var d = new Date(Number(ts));
    var dow = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * 864e5;
  }

  /* ============ 3. METHODOLOGY EXPLAINER ============ */
  /* Press-written summary of spec §3. REVIEW GATE (spec §3.5, binding):
     Brand Consistency + News Desk must sign off this copy and the §2.1
     label strings before ship — recorded in the ship log. This build ships
     the copy for review; the gate is enforced at ship time, not in code. */
  function paintMethod() {
    var el = sec('pf-cpi-method');
    if (!el) return;
    el.innerHTML =
      '<div class="pf-cpi-kicker">HOW IT\u2019S COUNTED</div>' +
      '<div class="pf-cpi-h2">METHODOLOGY</div>' +
      '<div class="pf-cpi-sub">Short enough to quote. The full basket, collection, and aggregation rules \u2014 nothing hidden.</div>' +
      '<div class="pf-cpi-meta" style="line-height:1.75;">' +
      '<b style="color:#fff;">THE BASKET.</b> 12 everyday items: milk, eggs, bread, ground beef, chicken breast, white rice, bananas, butter, coffee, gasoline, electricity, 1BR rent. Fixed basket; changes are versioned and announced, never silent.<br>' +
      '<b style="color:#fff;">COLLECTION.</b> Anyone with a callsign reports what they paid \u2014 price + ZIP (5-digit) or \u201cCity, ST\u201d only. No names, no addresses, no stores. One report per person \u00d7 item \u00d7 area per day. \u201cNot sure\u201d reports are accepted and marked \u2014 an honest approximate beats a fabricated exact.<br>' +
      '<b style="color:#fff;">AGGREGATION.</b> Per item, per week (Monday 00:00 UTC), the published figure is the median of published reports. Minimum-n rule: fewer than 5 reports from fewer than 3 distinct people \u2192 no figure is published, and the page says so. Outliers beyond 3\u03c3 (once n\u226510) or outside sanity ranges are held for human review.<br>' +
      '<b style="color:#fff;">THE INDEX.</b> Each week\u2019s item median is divided by that item\u2019s median in the first week of the chart window, and the ratios are averaged across items with data that week. Rebased so the window starts at 100. It is relative and window-dependent \u2014 only the movement within the window means anything.<br>' +
      '<b style="color:#fff;">THE OFFICIAL LINE.</b> Consumer Price Index for All Urban Consumers (CPI-U), all items, not seasonally adjusted \u2014 series CPIAUCNS, published by the U.S. Bureau of Labor Statistics via FRED. Monthly cadence; each figure carries its vintage and a direct source link. Rebased to 100 at the window start for visual comparison only.<br>' +
      '<b style="color:#fff;">LIMITATIONS.</b> Crowdsourced data skews toward the movement\u2019s geography and shopping habits \u2014 it is not a representative national sample and is never presented as one. Sparse areas show no number rather than a noisy one. Rent and electricity lag; they enter the index only in weeks with enough data. Receipt-verified reports (\ud83d\udcf8) count 1\u00d7 like all others \u2014 the badge marks provenance, not weight.' +
      '</div>' +
      '<div class="pf-cpi-fine" style="border-left:3px solid ' + RED + ';padding-left:10px;">' + esc(CPI_LABELS.METHODOLOGY_NOTE) + '</div>' +
      '<div class="pf-cpi-fine"><a href="/economy#pf-inf-method">Full methodology on /economy \u2192</a></div>';
  }

  /* ============ 4. BASKET SPOTLIGHT — price cards (WS-6) ============ */
  /* Every price card: sparkline trend + recency badge + report count (P8) +
     one-tap confirm. The confirm is a REPORT BACK (P3) into the /economy
     check-in flow with the item pre-scoped — it feeds the same
     callsign-authed report rail that publishes the aggregates. Zero XP:
     nothing awarded anywhere on this path. */
  function priceCard(r) {
    var it = itemById(r.item_id);
    var pt = patterns();
    var n = Math.floor(Number(r.sample_count) || 0);
    var stamp = boardRecency(state.board);
    var strip = stripFigure({
      figure: money(r.median_cents),
      label: it.name.toUpperCase() + ' / ' + it.unit.toUpperCase() + ' \u2014 NATIONAL MEDIAN',
      source: 'Community medians, not a government statistic.',
      updated: stamp
    });
    var figHTML = strip ||
      '<div class="pf-cpi-empty">Figure withheld \u2014 missing trust stamp.</div>';
    var d = Number(r.delta_pct);
    var deltaTxt = (!isNaN(d) && r.week_ago_median_cents)
      ? (d > 0 ? '\u25b2 ' : (d < 0 ? '\u25bc ' : '\u25aa ')) + Math.abs(d).toFixed(1) + '% vs last wk'
      : 'no last-week data';
    /* P8: real count or suppressed — never invented. */
    var proof = (pt && pt.proof) ? pt.proof({ count: n, text: 'reports this week' }) : '';
    var dataLine = figHTML +
      '<div class="pf-cpi-spark" data-cpi-spark="' + esc(r.item_id) + '"></div>' +
      '<div class="pf-cpi-delta">' + esc(deltaTxt) + '</div>' +
      proof +
      '<div style="margin-top:8px;"><span class="pf-cpi-recency">UPDATED ' + esc(stamp.toUpperCase()) + '</span></div>' +
      '<div class="pf-cpi-capline">Paid this price? One tap puts it on the board.</div>';
    var href = '/economy#pf-inflation-checkin/' + r.item_id;
    if (pt && pt.intelCard) {
      return pt.intelCard({
        kicker: 'BASKET SPOTLIGHT',
        headline: it.name + ' / ' + it.unit,
        dataLine: dataLine,
        verb: 'report', href: href, label: 'REPORT BACK'
      });
    }
    /* patterns killed — same card, manual markup, same trust elements. */
    return '<article class="pf-pat pf-pat-intel">' +
      '<p class="pf-pat-intel-kicker">BASKET SPOTLIGHT</p>' +
      '<h3 class="pf-pat-intel-head">' + esc(it.name + ' / ' + it.unit) + '</h3>' +
      '<div class="pf-pat-intel-data">' + dataLine + '</div>' +
      '<div class="pf-pat-intel-actions"><a class="pf-pat-report" href="' + esc(href) + '">REPORT BACK \u2192</a></div></article>';
  }
  /* Per-item national sparklines ride the §6.3 contract gap (price_trends
     rejects area_key=national) — fail-soft: the card is complete without
     the sparkline; it lights up when the backend lands the extension. */
  function loadSpark(itemId) {
    jsonp('price_trends', { item_id: itemId, area_key: 'national', weeks: 12 }, function (j) {
      var slot = null;
      try { slot = document.querySelector('[data-cpi-spark="' + itemId + '"]'); } catch (e) {}
      if (!slot || !slot.isConnected) return;
      var buckets = (j && j.ok !== false && Array.isArray(j.buckets)) ? j.buckets : [];
      var pts = buckets.map(function (bk) {
        return (bk && bk.enough_data && bk.median_cents != null && Number(bk.sample_count) >= 5)
          ? Number(bk.median_cents) : null;
      });
      var live = pts.filter(function (v) { return v != null; });
      if (live.length < 2) { try { slot.remove(); } catch (e2) {} return; }
      slot.innerHTML = sparkSVG(pts);
    });
  }
  function paintSpot() {
    var el = sec('pf-cpi-spot');
    if (!el) return;
    var b = state.board;
    if (!b) { el.innerHTML = '<div class="pf-cpi-load">Scanning the basket&hellip;</div>'; return; }
    if (b.ok === false) {
      el.innerHTML = '<div class="pf-cpi-kicker">BASKET SPOTLIGHT</div><div class="pf-cpi-empty">The basket board is unavailable right now. Try again later.</div>';
      return;
    }
    var items = (b.items || []).filter(function (r) { return r && r.enough_data && r.median_cents != null; });
    var movers = items.slice().sort(function (a, c) { return Math.abs(Number(c.delta_pct) || 0) - Math.abs(Number(a.delta_pct) || 0); }).slice(0, 4);
    var h = '<div class="pf-cpi-kicker">BASKET SPOTLIGHT</div>' +
      '<div class="pf-cpi-h2">THIS WEEK\u2019S MOVERS</div>' +
      '<div class="pf-cpi-sub">Biggest median moves on the national board \u2014 community-reported, minimum-n enforced. Every card carries its trust stamp: figure, source, recency, and report count.</div>';
    if (!movers.length) {
      h += '<div class="pf-cpi-empty">Not enough reports yet to name movers. <a href="/economy#pf-inflation-checkin">Report a price</a>.</div>';
    } else {
      h += '<div class="pf-cpi-cardgrid">' + movers.map(priceCard).join('') + '</div>';
    }
    h += '<div style="margin-top:12px;"><a class="pf-cpi-btn ghost" href="/economy#pf-inflation-board">FULL BOARD \u2192</a></div>';
    /* Compact per-item chart (spec §4.2 Chart B): single community line. */
    h += '<div style="margin-top:22px;border-top:1px solid #2a2a2a;padding-top:16px;">' +
      '<div class="pf-cpi-h2" style="font-size:17px;">ONE ITEM, OVER TIME</div>' +
      '<div><select id="pf-cpi-b-item">' +
      BASKET.map(function (it) { return '<option value="' + esc(it.id) + '"' + (it.id === state.bItem ? ' selected' : '') + '>' + esc(it.name) + ' \u2014 ' + esc(it.unit) + '</option>'; }).join('') +
      '</select><select id="pf-cpi-b-wks">' +
      [12, 26, 52].map(function (w) { return '<option value="' + w + '"' + (w === state.bWeeks ? ' selected' : '') + '>' + w + ' weeks</option>'; }).join('') +
      '</select></div>' +
      '<div id="pf-cpi-b-out"><div class="pf-cpi-load">Pick an item to see its line.</div></div>' +
      '<div class="pf-cpi-fine">Sparse series (rent, electricity): gaps are missing data, not zero change \u2014 we don\u2019t guess.</div></div>';
    el.innerHTML = h;
    movers.forEach(function (r) { loadSpark(r.item_id); });
    var bi = el.querySelector('#pf-cpi-b-item'), bw = el.querySelector('#pf-cpi-b-wks');
    if (bi) bi.onchange = function () { state.bItem = bi.value; loadChartB(); };
    if (bw) bw.onchange = function () { state.bWeeks = Number(bw.value) || 12; loadChartB(); };
    loadChartB();
  }

  function loadChartB() {
    var out = document.getElementById('pf-cpi-b-out');
    if (!out) return;
    out.innerHTML = '<div class="pf-cpi-load">Loading ' + esc(itemById(state.bItem).name) + '&hellip;</div>';
    /* National per-item trends ride the same §6.3 contract gap as the
       composite; fail-soft with a link to the /economy trends widget. */
    jsonp('price_trends', { item_id: state.bItem, area_key: 'national', weeks: state.bWeeks }, function (j) {
      if (!out.isConnected) return;
      if (!j || j.ok === false) {
        var why = (j && j.error === 'invalid_area')
          ? 'Per-item national trends are still being wired (backend update needed).'
          : 'Trends unavailable right now.';
        out.innerHTML = '<div class="pf-cpi-empty">' + esc(why) + ' <a href="/economy#pf-inflation-trends">See /economy trends \u2192</a></div>';
        return;
      }
      var buckets = j.buckets || [];
      var it = itemById(state.bItem);
      var vals = buckets.map(function (b) { return okFigure(b) ? Number(b.median_cents) : null; });
      if (!vals.some(function (v) { return v != null; })) {
        out.innerHTML = '<div class="pf-cpi-empty">Not enough reports yet for ' + esc(it.name) + ' \u2014 no line drawn, never a guess.</div>';
        return;
      }
      var W = 620, H = 220, ML = 56, MR = 10, MT = 10, MB = 28;
      var iw = W - ML - MR, ih = H - MT - MB;
      var vv = vals.filter(function (v) { return v != null; });
      var mn = Math.min.apply(null, vv), mx = Math.max.apply(null, vv);
      var pad = Math.max(1, (mx - mn) * 0.15); mn -= pad; mx += pad;
      function sx(i) { return ML + (vals.length < 2 ? iw / 2 : (i / (vals.length - 1)) * iw); }
      function sy(v) { return MT + ih - ((v - mn) / (mx - mn)) * ih; }
      var d = '', pen = false;
      for (var k = 0; k < vals.length; k++) {
        if (vals[k] == null) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + sx(k).toFixed(1) + ' ' + sy(vals[k]).toFixed(1) + ' ';
        pen = true;
      }
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" role="img" aria-label="' + esc(it.name) + ' weekly medians">';
      for (var g = 0; g <= 3; g++) {
        var gv = mn + (mx - mn) * g / 3, gy = sy(gv);
        s += '<line x1="' + ML + '" y1="' + gy.toFixed(1) + '" x2="' + (W - MR) + '" y2="' + gy.toFixed(1) + '" stroke="#2a2a2a"/>';
        s += '<text x="' + (ML - 6) + '" y="' + (gy + 4).toFixed(1) + '" fill="#8f887a" font-size="11" text-anchor="end">' + esc(money(Math.round(gv))) + '</text>';
      }
      var step = state.bWeeks <= 12 ? 2 : (state.bWeeks <= 26 ? 4 : 8);
      for (var xi = 0; xi < buckets.length; xi += step) {
        s += '<text x="' + sx(xi).toFixed(1) + '" y="' + (H - 8) + '" fill="#8f887a" font-size="11" text-anchor="middle">' + esc(fmtD(buckets[xi].week_start)) + '</text>';
      }
      s += '<path d="' + d + '" fill="none" stroke="' + LINE_COMM + '" stroke-width="3"/>';
      s += '</svg>';
      out.innerHTML = '<div style="margin:6px 0;"><span class="pf-cpi-badge crowd">' + CPI_LABELS.COMMUNITY_BADGE + '</span>' +
        '<span style="font-size:13px;color:#d8d0c0;">Weekly medians \u2014 ' + esc(it.name) + ' / ' + esc(it.unit) + ', national</span></div>' + s;
    });
  }

  /* ============ 5. SUBMIT CTA ============ */
  function paintCta() {
    var el = sec('pf-cpi-cta');
    if (!el) return;
    /* Ethics line VERBATIM (spec §1.3.5). Check-in stays on /economy —
       one crowdsource loop, no fork. */
    el.innerHTML =
      '<div class="pf-cpi-kicker">YOUR TURN</div>' +
      '<div class="pf-cpi-h2">MAKE THE INDEX SHARPER</div>' +
      '<div class="pf-cpi-sub">One crowdsource loop \u2014 check-in lives on /economy. Report what groceries, gas, and rent actually cost you.</div>' +
      '<a class="pf-cpi-btn" href="/economy#pf-inflation-checkin">REPORT A PRICE \u2192</a>' +
      '<div class="pf-cpi-ethic">' + esc(CPI_LABELS.ETHICS) + '</div>';
  }

  /* ============ 6. SHAREABLES ============ */
  /* Three graphics (§5), client-side canvas via the existing PFShare flow.
     Badge + vintage + JOIN THE FIGHT. + MTCSTW.COM + /peoples-cpi are drawn
     INTO THE PIXELS — a bare screenshot stays honest. Captions are
     pre-written templates only (macro-share contract) — no user free-text in
     pixels or captions. Caption wording is News-Desk-owned; the templates
     below carry figures, series ID + vintage, and no invented meaning. */
  /* Caption templates are composed from CPI_LABELS — no inline badge
     strings anywhere outside the module (spec §2.2 enforcement). */
  var SHARE_CAPS = {
    headline: 'THE ' + CPI_LABELS.COMMUNITY_FULL + ' {value} (rebased 100, week of {window}). {items} items with data. Community medians, not a government statistic. mtcstw.com/peoples-cpi',
    chart: CPI_LABELS.DUAL_HEADER + ' People\u2019s Price Index (crowdsourced) vs ' + CPI_LABELS.OFFICIAL_FULL + ' (rebased to 100 at {date} for visual comparison). mtcstw.com/peoples-cpi',
    item: '{item}: {median}/{unit} \u2014 national, trailing 30 days. Reported by {n} people. Community medians, not a government statistic. mtcstw.com/peoples-cpi'
  };
  function shareCanvas(cv, fname, title, caption) {
    try {
      if (window.PFShare && typeof window.PFShare.stampCallsign === 'function') {
        cv = window.PFShare.stampCallsign(cv) || cv;
      }
    } catch (e) {}
    try {
      if (window.PFShare && typeof window.PFShare.shareImage === 'function') {
        window.PFShare.shareImage(cv, fname, title, 'peoples-cpi', { text: caption });
        return;
      }
    } catch (e) {}
    cv.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e2) {} }, 4000);
    }, 'image/png');
  }
  function baseCard() {
    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    var x = cv.getContext('2d');
    /* ---- butter: editorial kit (factgen standard) ---- */
    x.fillStyle = '#0e0d0c'; x.fillRect(0, 0, 1080, 1350);
    x.save(); x.globalAlpha = 0.032; x.strokeStyle = '#ffffff'; x.lineWidth = 1;
    for (var btD = -1350; btD < 2430; btD += 26) {
      x.beginPath(); x.moveTo(btD, 0); x.lineTo(btD + 1350, 1350); x.stroke();
    }
    x.restore();
    var btVg = x.createRadialGradient(540, 540, 216, 540, 675, 1147);
    btVg.addColorStop(0, 'rgba(0,0,0,0)'); btVg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = btVg; x.fillRect(0, 0, 1080, 1350);
    var btBar = x.createLinearGradient(0, 0, 0, 10);
    btBar.addColorStop(0, RED); btBar.addColorStop(1, '#7d0b16');
    x.fillStyle = btBar; x.fillRect(0, 0, 1080, 10);
    x.save(); x.globalAlpha = 0.05; x.fillStyle = '#f2ecdc';
    x.font = '900 620px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText('★', 540, 810); x.restore();
    return { cv: cv, x: x };
  }
  function cardFooter(x, vintage) {
    x.textAlign = 'center';
    x.fillStyle = '#6f6350'; x.font = 'italic 400 24px Georgia,serif';
    x.fillText(String(vintage).slice(0, 90), 540, 1120);
    x.fillStyle = '#a89a7d'; x.font = '700 22px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e) {}
    x.fillText(CPI_LABELS.COMMUNITY_FULL, 540, 1158);
    try { x.letterSpacing = '0px'; } catch (e2) {}
    /* ---- butter footer: CTA standard ---- */
    var fy = 1196;
    x.strokeStyle = 'rgba(201,162,39,0.45)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(120, fy); x.lineTo(960, fy); x.stroke();
    fy += 56;
    x.font = '900 44px Arial,sans-serif'; x.fillStyle = '#f2ecdc';
    try { x.letterSpacing = '8px'; } catch (e3) {}
    var btCta = 'JOIN THE FIGHT';
    var btCtaW = x.measureText(btCta).width;
    x.fillText(btCta, 540, fy);
    x.fillStyle = RED; x.fillText('.', 540 + btCtaW/2 - 4, fy);
    try { x.letterSpacing = '0px'; } catch (e4) {}
    fy += 52;
    x.fillStyle = RED; x.font = '900 32px Arial,sans-serif';
    try { x.letterSpacing = '10px'; } catch (e5) {}
    x.fillText('MTCSTW.COM/peoples-cpi', 540, fy);
    try { x.letterSpacing = '0px'; } catch (e6) {}
    var btBar2 = x.createLinearGradient(0, 1340, 0, 1350);
    btBar2.addColorStop(0, '#7d0b16'); btBar2.addColorStop(1, RED);
    x.fillStyle = btBar2; x.fillRect(0, 1340, 1080, 10);
  }
  function cardBadge(x, y) {
    x.fillStyle = RED;
    var label = CPI_LABELS.COMMUNITY_BADGE;
    x.font = '700 26px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e) {}
    var wpx = x.measureText(label).width + 56;
    try { x.letterSpacing = '0px'; } catch (e2) {}
    x.fillRect(540 - wpx / 2, y, wpx, 44);
    x.fillStyle = '#fff'; x.textAlign = 'center';
    x.font = '700 26px Arial,sans-serif';
    try { x.letterSpacing = '4px'; } catch (e3) {}
    x.fillText(label, 540, y + 31);
    try { x.letterSpacing = '0px'; } catch (e4) {}
  }
  function paintShare() {
    var el = sec('pf-cpi-share');
    if (!el) return;
    if (PF.skip('peoples-cpi-share')) { el.innerHTML = ''; return; }
    var b = state.board;
    if (!b) { el.innerHTML = '<div class="pf-cpi-load">Loading shareables&hellip;</div>'; return; }
    var t = state.trends;
    var idx = (t && t.peoples_index) || [];
    var last = null;
    for (var i = idx.length - 1; i >= 0; i--) { if (okIndexWeek(idx[i])) { last = idx[i]; break; } }
    var first = null;
    for (var k = 0; k < idx.length; k++) { if (okIndexWeek(idx[k])) { first = idx[k]; break; } }
    var hval = (last && first) ? (Math.round(100 * last.value / first.value * 10) / 10).toFixed(1) : null;
    var items = (b.items || []).filter(function (r) { return r && r.enough_data && r.median_cents != null; });
    var mover = items.slice().sort(function (a, c) { return Math.abs(Number(c.delta_pct) || 0) - Math.abs(Number(a.delta_pct) || 0); })[0] || null;
    var chartSvg = null;
    try { chartSvg = sec('pf-cpi-chart').querySelector('svg path[d]'); } catch (e) {}
    var cards = [
      { id: 'headline', name: 'HEADLINE INDEX CARD', desc: 'The national composite + its window + the crowdsourced badge.' },
      { id: 'chart', name: 'TWO-LINES CHART CARD', desc: 'A snapshot of the dual chart \u2014 both series, both badges.' },
      { id: 'item', name: 'ITEM SPOTLIGHT CARD', desc: 'This week\u2019s biggest mover, with sample count.' }
    ];
    var h = '<div class="pf-cpi-kicker">SHARE THE INDEX</div>' +
      '<div class="pf-cpi-h2">TAKE IT TO THE FEED</div>' +
      '<div class="pf-cpi-sub">One tap to share or download. Captions are pre-written (News-Desk-owned) \u2014 figures, series ID + vintage, no invented meaning.</div>';
    h += cards.map(function (cd, n) {
      /* The chart card unlocks only when the dual chart actually drew. */
      var ready = cd.id === 'headline' ? !!hval : (cd.id === 'item' ? !!mover : !!chartSvg);
      var cap = '';
      if (cd.id === 'headline' && hval) {
        cap = SHARE_CAPS.headline.replace('{value}', hval)
          .replace('{window}', fmtD(last.week_start) + ' \u2014 ' + fmtD(last.week_start + 6 * 864e5))
          .replace('{items}', String(last.items_with_data));
      } else if (cd.id === 'chart') {
        cap = SHARE_CAPS.chart.replace('{date}', fmtDL((t && t.period_start) || Date.now()));
      } else if (cd.id === 'item' && mover) {
        var it = itemById(mover.item_id);
        cap = SHARE_CAPS.item.replace('{item}', it.name.toUpperCase()).replace('{median}', money(mover.median_cents))
          .replace('{unit}', it.unit).replace('{n}', String(mover.contributors || 0));
      }
      return '<div class="pf-cpi-sharecard">' +
        '<div style="font-weight:900;letter-spacing:1px;margin-bottom:4px;">' + (n + 1) + '. ' + esc(cd.name) + '</div>' +
        '<div class="pf-cpi-meta" style="margin-bottom:10px;">' + esc(cd.desc) + '</div>' +
        (ready && cap
          ? '<textarea class="pf-cpi-cap" rows="3" readonly id="pf-cpi-cap-' + cd.id + '">' + esc(cap) + '</textarea>' +
            '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="pf-cpi-btn" data-share="' + cd.id + '">SHARE IMAGE</button>' +
            '<button class="pf-cpi-btn ghost" data-copycap="' + cd.id + '">COPY CAPTION</button>' +
            /* UX Combination Play 2 (fe/ux-take-to-cell): per-card take-to-cell.
               Wired by share-everywhere's [data-pf-takecell] scan. Kill: ?pf_off=peoples-cpi. */
            '<button type="button" class="pf-tc-btn" data-pf-takecell data-pf-tc-kind="peoples-cpi"' +
            ' data-pf-tc-title="PEOPLE\u2019S CPI \u2014 ' + esc(cd.name) + '"' +
            ' data-pf-tc-figure="' + esc(String(cap || cd.desc || '').replace(/\s+/g, ' ').slice(0, 140)) + '"' +
            ' data-pf-tc-link="/economy">&#9733; TAKE THIS TO YOUR CELL</button></div>'
          : '<div class="pf-cpi-empty">Not enough data yet for this graphic \u2014 it unlocks when the index does.</div>') +
        '</div>';
    }).join('');
    el.innerHTML = h;
    var btns = el.querySelectorAll('[data-share]');
    for (var bi2 = 0; bi2 < btns.length; bi2++) {
      (function (btn) {
        btn.addEventListener('click', function () { drawShareCard(btn.getAttribute('data-share')); });
      })(btns[bi2]);
    }
    var cps = el.querySelectorAll('[data-copycap]');
    for (var ci = 0; ci < cps.length; ci++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var ta = document.getElementById('pf-cpi-cap-' + btn.getAttribute('data-copycap'));
          if (!ta) return;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value);
            else { ta.select(); document.execCommand('copy'); }
            btn.textContent = 'COPIED';
            setTimeout(function () { btn.textContent = 'COPY CAPTION'; }, 1800);
          } catch (e) {}
        });
      })(cps[ci]);
    }
  }
  function drawShareCard(which) {
    var t = state.trends, b = state.board;
    var idx = (t && t.peoples_index) || [];
    var last = null, first = null, i;
    for (i = idx.length - 1; i >= 0; i--) { if (okIndexWeek(idx[i])) { last = idx[i]; break; } }
    for (i = 0; i < idx.length; i++) { if (okIndexWeek(idx[i])) { first = idx[i]; break; } }
    if (which === 'headline' && last && first) {
      var c = baseCard(), x = c.x;
      var val = (Math.round(100 * last.value / first.value * 10) / 10).toFixed(1);
      x.textAlign = 'center'; x.fillStyle = '#c9a227';
      x.font = '700 34px Arial,sans-serif';
      try { x.letterSpacing = '8px'; } catch (e) {}
      x.fillText('THE PEOPLE\u2019S PRICE INDEX', 540, 150);
      try { x.letterSpacing = '0px'; } catch (e2) {}
      x.strokeStyle = 'rgba(201,162,39,0.5)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(390, 176); x.lineTo(690, 176); x.stroke();
      cardBadge(x, 210);
      /* the figure: monumental gold gradient, drop shadow */
      x.font = '900 190px Georgia,"Times New Roman",serif';
      x.fillStyle = 'rgba(0,0,0,0.55)';
      x.fillText(val, 545, 527);
      var btGg = x.createLinearGradient(0, 340, 0, 520);
      btGg.addColorStop(0, '#f0d060'); btGg.addColorStop(1, '#8a6d1c');
      x.fillStyle = btGg;
      x.fillText(val, 540, 520);
      x.fillStyle = '#a89a7d'; x.font = 'italic 400 32px Georgia,serif';
      x.fillText('rebased 100 \u00b7 week of ' + fmtD(last.week_start) + ' \u2014 ' + fmtD(last.week_start + 6 * 864e5), 540, 600);
      x.fillText(last.items_with_data + ' of 12 items with data', 540, 650);
      cardFooter(x, 'vintage: week of ' + fmtD(last.week_start));
      var cap = document.getElementById('pf-cpi-cap-headline');
      shareCanvas(c.cv, 'peoples-cpi-headline.png', 'THE PEOPLE\u2019S PRICE INDEX', cap ? cap.value : '');
      return;
    }
    if (which === 'item') {
      var items = (b.items || []).filter(function (r) { return r && r.enough_data && r.median_cents != null; });
      var mover = items.slice().sort(function (a, z) { return Math.abs(Number(z.delta_pct) || 0) - Math.abs(Number(a.delta_pct) || 0); })[0];
      if (!mover) return;
      var it = itemById(mover.item_id);
      var c2 = baseCard(), x2 = c2.x;
      x2.textAlign = 'center'; x2.fillStyle = '#c9a227';
      x2.font = '700 34px Arial,sans-serif';
      try { x2.letterSpacing = '8px'; } catch (e3) {}
      x2.fillText('ITEM SPOTLIGHT', 540, 150);
      try { x2.letterSpacing = '0px'; } catch (e4) {}
      cardBadge(x2, 210);
      x2.fillStyle = '#f2ecdc'; x2.font = '900 80px Georgia,"Times New Roman",serif';
      x2.fillText(it.name.toUpperCase(), 540, 420);
      /* the figure: monumental gold gradient, drop shadow */
      x2.font = '900 130px Georgia,"Times New Roman",serif';
      var btFig2 = money(mover.median_cents);
      x2.fillStyle = 'rgba(0,0,0,0.55)';
      x2.fillText(btFig2, 545, 597);
      var btGg2 = x2.createLinearGradient(0, 470, 0, 590);
      btGg2.addColorStop(0, '#f0d060'); btGg2.addColorStop(1, '#8a6d1c');
      x2.fillStyle = btGg2;
      x2.fillText(btFig2, 540, 590);
      x2.fillStyle = '#a89a7d'; x2.font = 'italic 400 32px Georgia,serif';
      x2.fillText('per ' + it.unit, 540, 645);
      x2.fillText('reported by ' + (mover.contributors || 0) + ' people \u00b7 national, trailing 30 days', 540, 700);
      var d = Number(mover.delta_pct);
      if (!isNaN(d) && mover.week_ago_median_cents) {
        /* WS-6: trend colors gray/white only — the arrow carries direction. */
        x2.fillStyle = '#d8d0c0';
        x2.font = 'bold 40px system-ui, sans-serif';
        x2.fillText((d > 0 ? '\u25b2 +' : '\u25bc ') + Math.abs(d).toFixed(1) + '% vs last week', 540, 770);
      }
      cardFooter(x2, 'vintage: trailing 30 days');
      var cap2 = document.getElementById('pf-cpi-cap-item');
      shareCanvas(c2.cv, 'peoples-cpi-item.png', 'ITEM SPOTLIGHT', cap2 ? cap2.value : '');
      return;
    }
    /* chart card: serialize the live dual-chart SVG onto canvas. */
    try {
      var svg = sec('pf-cpi-chart').querySelector('svg');
      if (!svg) return;
      var str = new XMLSerializer().serializeToString(svg);
      var img = new Image();
      img.onload = function () {
        try {
          var c3 = baseCard(), x3 = c3.x;
          x3.textAlign = 'center'; x3.fillStyle = '#c9a227';
          x3.font = '700 34px Arial,sans-serif';
          try { x3.letterSpacing = '8px'; } catch (e5) {}
          x3.fillText('TWO WAYS OF COUNTING', 540, 120);
          try { x3.letterSpacing = '0px'; } catch (e6) {}
          x3.font = 'italic 400 28px Georgia,serif'; x3.fillStyle = '#a89a7d';
          x3.fillText('Two separate lines. Never merged.', 540, 168);
          var cw = 940, chh = cw * 330 / 660;
          x3.drawImage(img, 70, 210, cw, chh);
          cardBadge(x3, 210 + chh + 30);
          cardFooter(x3, 'vintage: week of ' + fmtD((state.trends && state.trends.period_start) || Date.now()));
          var cap3 = document.getElementById('pf-cpi-cap-chart');
          shareCanvas(c3.cv, 'peoples-cpi-chart.png', 'THE TWO LINES', cap3 ? cap3.value : '');
        } catch (e) {}
      };
      img.onerror = function () {};
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
    } catch (e) {}
  }

  /* ============ 7. OFFICIAL CONTEXT RAIL ============ */
  /* Labeled, separate, never blended (spec §1.3.7). Reuses the FRED rail
     pattern: series ID + vintage + source link + staleness on every figure. */
  function paintRail() {
    var el = sec('pf-cpi-rail');
    if (!el) return;
    var j = state.compare;
    if (!j) { el.innerHTML = '<div class="pf-cpi-load">Pulling the official numbers&hellip;</div>'; return; }
    var head = '<div class="pf-cpi-kicker">OFFICIAL CONTEXT \u2014 WHAT WASHINGTON SAYS</div>' +
      '<div class="pf-cpi-h2">THE OFFICIAL NUMBERS</div>' +
      '<div style="font-size:13px;letter-spacing:1px;color:#d8d0c0;margin-bottom:12px;font-weight:700;">' + esc(CPI_LABELS.RAIL_LABEL) + '</div>';
    if (j.ok === false) {
      el.innerHTML = head + '<div class="pf-cpi-empty">' + esc(CPI_LABELS.OFFICIAL_CONNECTING) + '</div>';
      return;
    }
    var off = j.official;
    if (!off) {
      el.innerHTML = head + '<div class="pf-cpi-empty"><span class="pf-cpi-badge off">' + CPI_LABELS.OFFICIAL_BADGE + '</span> ' +
        esc(CPI_LABELS.OFFICIAL_PENDING) + ' \u2014 nothing here is estimated or seeded.</div>';
      return;
    }
    function card(title, seriesId, o, extra) {
      var body;
      if (!o || o.value == null) {
        body = '<div class="pf-cpi-meta">' + esc(CPI_LABELS.OFFICIAL_PENDING) + '</div>';
      } else {
        body = '<div class="v">' + esc(String(o.value)) + '</div>' +
          '<div class="pf-cpi-meta">period ' + esc(String(o.period || 'unknown')) +
          (o.unit ? ' \u00b7 ' + esc(String(o.unit)) : '') +
          '<br>vintage ' + esc(String(o.source_date || 'unknown')) +
          ' \u00b7 <a href="https://fred.stlouisfed.org/series/' + esc(seriesId) + '" target="_blank" rel="noopener">fred.stlouisfed.org/series/' + esc(seriesId) + '</a></div>';
      }
      return '<div class="pf-cpi-railcard"><span class="pf-cpi-badge off">' + CPI_LABELS.OFFICIAL_BADGE + '</span>' +
        '<div style="font-weight:900;letter-spacing:1px;margin:6px 0 2px;">' + esc(title) + '</div>' + body +
        (extra || '') + '</div>';
    }
    var coreCard = '';
    if (state.fredCore) {
      var fc = state.fredCore;
      if (fc.ok !== false && fc.fred_live !== false && fc.observations && fc.observations.length) {
        var latest = fc.observations.slice().sort(function (a, b) { return String(a.period) < String(b.period) ? 1 : -1; })[0];
        var stale = fc.stale || Number(fc.days_old) > 45;
        coreCard = card('CORE CPI (EX FOOD & ENERGY)', 'CPILFESL',
          { value: latest.value, period: latest.period, unit: fc.unit, source_date: fc.vintage_date || fc.retrieved_at },
          stale ? '<span class="pf-cpi-stale">\u26a0 ' + esc(String(fc.days_old || 0)) + ' days old \u2014 expected monthly</span>' : '');
      }
    }
    el.innerHTML = head +
      card('CPI-U, ALL ITEMS', 'CPIAUCNS', off.cpi_u_all_items) +
      coreCard +
      card('FOOD AT HOME', 'CPIAUCNS', off.cpi_food_at_home) +
      '<div class="pf-cpi-fine">The official number is a national average built from thousands of surveyed prices. Shown side by side with the people\u2019s line \u2014 never merged into one number.</div>';
  }

  /* ============ boot ============ */
  function loadWindow() {
    /* Parallel, independent, fail-soft: each section paints from whatever
       arrives; nothing blocks on anything else. */
    jsonp('price_board', { area_key: 'national' }, function (j) {
      state.board = j || { ok: false };
      paintHeadline(); paintSpot(); paintShare();
    });
    jsonp('price_trends', { item_id: 'milk', area_key: 'national', weeks: state.weeks }, function (j) {
      if (j && j.ok === false && j.error === 'invalid_area') { state.trendsGap = true; state.trends = null; }
      else { state.trendsGap = false; state.trends = j; }
      paintHeadline(); paintChart(); paintShare();
    });
    jsonp('cpi_compare', {}, function (j) {
      state.compare = j || { ok: false };
      paintRail();
    });
    jsonp('fred_series', { series_id: 'CPIAUCNS', limit: Math.ceil(state.weeks / 4) + 10 }, function (j) {
      state.fred = j;
      paintChart();
    });
    jsonp('fred_series', { series_id: 'CPILFESL', limit: 2 }, function (j) {
      state.fredCore = j;
      paintRail();
    });
  }

  paintMethod();
  paintCta();
  loadWindow();
})();
