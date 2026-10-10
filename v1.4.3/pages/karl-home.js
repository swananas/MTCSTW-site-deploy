/* pages/karl-home.js  |  PF v1.4.3 | KARL AS HOMEPAGE (CEO dir-20261010-005226-17270).
   The mtcstw.com homepage IS the Karl experience: dark war-room, mobile-first.
   Sticky MTCSTW header (home button) + live indicator, "Who's robbing you?"
   hero with ask composer + fill-and-ask chips, THE ROBBERY REPORT live feed
   (lead inference card with KARL NOTICED badge), expandable proof exhibits,
   DEPLOY share buttons, live footer stats.

   Self-mounting silo: renders into <div id="pf-karl-home"></div>
   (CEO hand-step: Squarespace Code block on the homepage; home-v2.js stays
   dormant without its #pf-v2 shell — no home-v2 edit needed).

   Backend: JSONP GET ?action=karl_query&q=<nl> and ?action=karl_stats
   (pf-api, public read-only). karl_stats drives footer stats + the lead
   inference card; karl_query drives the ask flow. Fail closed: honest-empty
   over invented data; no card renders from a failed fetch.

   DEPLOY = SHARE ACTION ONLY (native share sheet -> clipboard fallback).
   ZERO XP on this frontend — querying is not an action; Economy Desk
   sign-off required before any XP wiring (fail closed).

   Standing engagement bar: fixed bottom pillar strip — one-click access to
   the four mission pillars (CREATE / CONNECT / COORDINATE / CAPITAL); the
   page never traps the visitor. core/20-nextop.js still mounts the Next
   Move exit above the footer chrome.

   Supersedes the fe/karl-homepage-button floating "K" FAB (never deployed):
   the full-page Karl experience absorbs its job; no duplication.

   KILL: ?pf_off=karl-home  or  localStorage pf_disabled_v1='["karl-home"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('karl-home')) { return; }
  if (window.pfKarlHomeDone) return;
  window.pfKarlHomeDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var host = document.getElementById('pf-karl-home');
  if (!host) { return; }

  function err(m) { try { if (PF && PF.error) PF.error('karl-home', m); } catch (e) {} }
  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }
  if (isEditor()) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (!s) return '';
    try {
      var p = new URL(s, 'https://x.invalid').protocol;
      if (p === 'http:' || p === 'https:') return s;
    } catch (e) {}
    return '';
  }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function timeAgo(ts) {
    var t = Number(ts || 0);
    if (!t) return '';
    if (t < 1e12) t = t * 1000;
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  }
  function srcName(s) {
    s = s || {};
    return s.name || s.rail || s.endpoint || 'KARL';
  }

  /* JSONP GET — same transport as core/karl-page.js (public read-only actions). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfKarlHomeCb' + Math.floor(Math.random() * 1e9);
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
    setTimeout(function () { finish(null); }, 15000);
  }

  /* ---------------- seed discoveries (design base — News Desk may kill figures) ---------------- */
  var SEED = [
    { q: "Which defense contractor stole the most?",
      a: "Boeing paid <b>$2.5B</b> for the 737 MAX fraud conspiracy — the largest penalty in the contractor ledger.",
      rows: [["737 MAX fraud conspiracy", "$2.5B"], ["Defense contract fraud", "$615M"], ["Total Boeing penalties", "$3.3B"]],
      src: "RECEIPTS — DOJ, SEC filings", deploys: 1284, when: "2m" },
    { q: "Is my hospital price-gouging?",
      a: "The average ER visit is billed at <b>$2,200</b> but costs the hospital <b>$180</b> to deliver. 27K hospitals tracked.",
      rows: [["Avg ER billed charge", "$2,200"], ["Avg ER actual cost", "$180"], ["Markup", "12×"]],
      src: "RECEIPTS — CMS hospital price transparency", deploys: 862, when: "9m" },
    { q: "Who funds my congressman?",
      a: "<b>176K</b> itemized FEC contributions tracked. The average House member takes <b>68%</b> of funds from outside their district.",
      rows: [["Itemized contributions", "176,870"], ["Avg out-of-district share", "68%"], ["Top donor industry", "Finance"]],
      src: "RECEIPTS — FEC filings", deploys: 743, when: "14m" },
    { q: "Biggest private prison operator?",
      a: "GEO Group runs <b>19</b> of 30 tracked facilities. Four disclosed contracts total <b>$330M/yr</b> — most values are hidden.",
      rows: [["GEO Group facilities", "19"], ["CoreCivic facilities", "9"], ["Disclosed contract value", "$330M/yr"]],
      src: "RECEIPTS — BOP, SEC 10-K", deploys: 591, when: "31m" },
    { q: "Worst for-profit college?",
      a: "<b>2,261</b> for-profit schools tracked. 54 flagged for fraud or enforcement action. $1.2M+ students enrolled.",
      rows: [["Schools tracked", "2,261"], ["Flagged for fraud", "54"], ["Students enrolled", "1.2M"]],
      src: "RECEIPTS — Dept. of Education", deploys: 428, when: "48m" },
    { q: "How rich are the billionaires?",
      a: "<b>1,653</b> billionaires tracked with a combined <b>$6.45T</b> — more than the GDP of Japan.",
      rows: [["Billionaires tracked", "1,653"], ["Combined net worth", "$6.45T"], ["Avg net worth", "$3.9B"]],
      src: "RECEIPTS — Forbes, SEC 13F", deploys: 1107, when: "1h" }
  ];

  /* Fallback inference pool (design base) — used only when karl_stats is unreachable. */
  var INFERENCES = [
    { q: "Boeing paid $2.5B in fraud penalties — then spent $13.3M lobbying the same regulators.",
      a: "That's a <b>188:1 return</b> on corruption. For every $1 Boeing spends lobbying, they dodge $188 in accountability. The revolving door isn't a metaphor — it's a business model.",
      rows: [["737 MAX fraud conspiracy penalty", "$2.5B"], ["Boeing 2025 lobbying spend", "$13.3M"], ["DoD → Boeing revolving-door hires", "27"]],
      src: "RECEIPTS — DOJ case files · LDA filings · LittleSis", deploys: 2147, when: "just now", inference: true },
    { q: "2,261 for-profit schools collected federal aid while only 54 were ever flagged for fraud.",
      a: "That's <b>2.4%</b> flagged — which means the scam isn't the exception, it's the business model. 1.2M students enrolled, billions in federal dollars, almost nobody watching.",
      rows: [["For-profit schools tracked", "2,261"], ["Flagged for fraud", "54"], ["Students enrolled", "1.2M"]],
      src: "RECEIPTS — Dept. of Education", deploys: 986, when: "just now", inference: true },
    { q: "GEO Group runs 19 private prisons. Four disclosed contracts are worth $330M/yr — the other 26 are hidden.",
      a: "If 4 contracts are worth <b>$330M</b>, the 26 they won't disclose are worth billions. Your tax dollars fund cages, and they won't even tell you the price.",
      rows: [["GEO Group facilities", "19"], ["Disclosed contract value", "$330M/yr"], ["Undisclosed contracts", "26"]],
      src: "RECEIPTS — BOP · SEC 10-K", deploys: 1104, when: "just now", inference: true },
    { q: "1,653 billionaires hold $6.45T — more than the entire GDP of Japan.",
      a: "The average billionaire is worth <b>$3.9B</b>. A worker earning $60K would need 65,000 years to catch up. This isn't wealth — it's a separate economy.",
      rows: [["Billionaires tracked", "1,653"], ["Combined net worth", "$6.45T"], ["Avg net worth", "$3.9B"]],
      src: "RECEIPTS — Forbes · SEC 13F", deploys: 1893, when: "just now", inference: true },
    { q: "The average House member takes 68% of campaign funds from outside their district.",
      a: "You're the audience, not the customer. <b>176,870</b> itemized contributions tracked — and the money comes from finance, not from your neighbors.",
      rows: [["Itemized contributions", "176,870"], ["Avg out-of-district share", "68%"], ["Top donor industry", "Finance"]],
      src: "RECEIPTS — FEC filings", deploys: 1302, when: "just now", inference: true },
    { q: "59,717 eviction estimates pile up while hospital ER markups hit 12×.",
      a: "You're being robbed coming and going — displaced from your home while hospitals bill <b>$2,200</b> for care that costs <b>$180</b>. Two datasets, one story.",
      rows: [["County eviction estimates", "59,717"], ["Avg ER billed charge", "$2,200"], ["Avg ER actual cost", "$180"]],
      src: "RECEIPTS — Eviction Lab · CMS price transparency", deploys: 1587, when: "just now", inference: true },
    { q: "Defense contractors paid $5.44B in penalties across 20 cases — while insiders traded their own stock 71 times.",
      a: "They knew. <b>20</b> misconduct cases, <b>$5.44B</b> in fines — and executives were buying and selling their own shares the whole time.",
      rows: [["Contractor penalties", "$5.44B"], ["Misconduct cases", "20"], ["Insider trades tracked", "71"]],
      src: "RECEIPTS — DOJ · SEC Form 4", deploys: 1755, when: "just now", inference: true }
  ];

  var CHIPS = [
    "Which defense contractor stole the most?",
    "Is my hospital price-gouging?",
    "Who funds my congressman?",
    "Worst for-profit college?",
    "Biggest private prison operator?"
  ];

  /* Four mission pillars — one click, never a trap. */
  var PILLARS = [
    ["CREATE", "/create"],
    ["CONNECT", "/sick-left-radicals"],
    ["COORDINATE", "/cells"],
    ["CAPITAL", "/bank"]
  ];

  /* ---------------- styles (dark war-room, scoped) ---------------- */
  var CSS = [
    '.kh-wrap{background:#0a0a0a;color:#f5f0e6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;min-height:100vh;-webkit-font-smoothing:antialiased;line-height:1.5;padding-bottom:96px}',
    '.kh-topbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:rgba(10,10,10,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #232323}',
    '.kh-wordmark{font-family:Georgia,serif;font-weight:700;letter-spacing:.35em;font-size:15px;color:#f5f0e6;text-decoration:none}',
    '.kh-wordmark b{color:#e5383b;font-weight:700}',
    '.kh-live{display:flex;align-items:center;gap:7px;font-size:12px;color:#8a8478;font-variant-numeric:tabular-nums;letter-spacing:.08em}',
    '.kh-live .dot{width:7px;height:7px;border-radius:50%;background:#5a554b}',
    '.kh-live.on .dot{background:#2fbf71;box-shadow:0 0 8px #2fbf71;animation:khblink 2.2s infinite}',
    '.kh-live.on{color:#8a8478}',
    '@keyframes khblink{0%,100%{opacity:1}50%{opacity:.35}}',
    '.kh-ask{padding:34px 20px 10px}',
    '.kh-ask h1{font-family:Georgia,serif;font-size:34px;line-height:1.15;font-weight:700;margin:0 0 18px;letter-spacing:-.01em;color:#f5f0e6}',
    '.kh-ask h1 em{color:#e5383b;font-style:normal}',
    '.kh-composer{background:#141414;border:1px solid #232323;border-radius:16px;padding:4px;transition:border-color .2s,box-shadow .2s}',
    '.kh-composer:focus-within{border-color:#c1121f;box-shadow:0 0 0 3px rgba(193,18,31,.18)}',
    '.kh-composer textarea{width:100%;background:transparent;border:0;outline:0;resize:none;color:#f5f0e6;font-size:17px;padding:14px 14px 6px;min-height:64px;font-family:inherit;line-height:1.45}',
    '.kh-composer textarea::placeholder{color:#5a554b}',
    '.kh-composer-foot{display:flex;align-items:center;justify-content:space-between;padding:6px 10px 10px 14px}',
    '.kh-composer-hint{font-size:12px;color:#5a554b}',
    '.kh-ask-btn{background:#c1121f;color:#fff;border:0;border-radius:999px;padding:11px 26px;font-size:15px;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:transform .12s,background .2s,box-shadow .2s;box-shadow:0 4px 18px rgba(193,18,31,.35);touch-action:manipulation}',
    '.kh-ask-btn:active{transform:scale(.95)}',
    '.kh-ask-btn:disabled{opacity:.55;box-shadow:none}',
    '.kh-chips{display:flex;gap:8px;overflow-x:auto;padding:14px 20px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
    '.kh-chips::-webkit-scrollbar{display:none}',
    '.kh-chip{flex:0 0 auto;background:#111;border:1px solid #232323;color:#f5f0e6;border-radius:999px;padding:9px 15px;font-size:13.5px;cursor:pointer;transition:border-color .2s,transform .12s;white-space:nowrap;touch-action:manipulation}',
    '.kh-chip:active{transform:scale(.95);border-color:#c1121f}',
    '.kh-feed-head{display:flex;align-items:baseline;justify-content:space-between;padding:26px 20px 4px}',
    '.kh-feed-head h2{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8a8478;font-weight:700;margin:0}',
    '.kh-feed-head .tick{font-size:11px;color:#5a554b;display:flex;align-items:center;gap:6px;letter-spacing:.1em}',
    '.kh-feed-head .tick i{width:6px;height:6px;border-radius:50%;background:#2fbf71;display:inline-block;animation:khblink 2.2s infinite}',
    '.kh-feed{padding:10px 14px 30px;display:flex;flex-direction:column;gap:12px}',
    '.kh-card{background:#111;border:1px solid #232323;border-radius:16px;padding:16px 16px 13px;cursor:pointer;transition:transform .12s,border-color .2s;animation:khrise .45s cubic-bezier(.2,.9,.3,1.15) both}',
    '.kh-card:active{transform:scale(.985)}',
    '@keyframes khrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '.kh-card .q{font-size:15px;font-weight:600;margin-bottom:8px;color:#f5f0e6}',
    '.kh-card .a{font-size:14px;color:#8a8478;line-height:1.55}',
    '.kh-card .a b{color:#e5383b;font-weight:700}',
    '.kh-card-meta{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px dashed #232323;font-size:12px;color:#5a554b}',
    '.kh-deploys{display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}',
    '.kh-deploys .n{color:#f5f0e6;font-weight:700}',
    '.kh-src{font-family:ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.06em}',
    '.kh-proof{display:none;margin-top:12px;border-top:1px solid #232323;padding-top:12px}',
    '.kh-card.open .kh-proof{display:block;animation:khrise .3s ease both}',
    '.kh-card.kh-inference{border-color:rgba(193,18,31,.55);box-shadow:0 0 0 1px rgba(193,18,31,.25),0 6px 24px rgba(193,18,31,.12)}',
    '.kh-kbadge{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;font-weight:700;letter-spacing:.18em;color:#e5383b;border:1px solid #c1121f;border-radius:999px;padding:5px 12px;margin-bottom:10px;background:rgba(193,18,31,.08)}',
    '.kh-thinking{display:flex;flex-direction:column;gap:10px}',
    '.kh-thinking .tline{font-size:14px;color:#8a8478;font-style:italic;display:flex;align-items:center;gap:8px}',
    '.kh-thinking .pulse-dot{width:8px;height:8px;border-radius:50%;background:#e5383b;animation:khblink 1s infinite}',
    '.kh-shimmer{height:14px;border-radius:7px;margin:6px 0;background:linear-gradient(90deg,#1a1a1a 25%,#262626 50%,#1a1a1a 75%);background-size:200% 100%;animation:khshim 1.1s infinite linear}',
    '@keyframes khshim{to{background-position:-200% 0}}',
    '.kh-proof .exhibit{font-size:10.5px;letter-spacing:.22em;color:#e5383b;font-weight:700;margin-bottom:10px}',
    '.kh-proof-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-top:1px dashed #232323;font-size:14px}',
    '.kh-proof-row .k{color:#8a8478}',
    '.kh-proof-row .v{color:#e5383b;font-weight:800;font-size:17px;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.kh-proof .receipts{margin-top:10px;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;color:#5a554b;letter-spacing:.05em}',
    '.kh-deploy-btn{width:100%;margin-top:12px;background:transparent;color:#e5383b;border:1.5px solid #c1121f;border-radius:12px;padding:13px;font-size:14px;font-weight:800;letter-spacing:.14em;cursor:pointer;transition:background .2s,color .2s,transform .12s;touch-action:manipulation}',
    '.kh-deploy-btn:active{transform:scale(.98)}',
    '.kh-deploy-btn.done{background:#c1121f;color:#fff}',
    '.kh-fact{background:#141414;border:1px solid #232323;border-radius:10px;padding:14px 16px;margin:10px 0}',
    '.kh-fact .lb{font-size:13px;font-weight:700;color:#8a8478;letter-spacing:.5px;margin-bottom:2px}',
    '.kh-fact .vl{font-size:24px;font-weight:900;color:#f5f0e6}',
    '.kh-fact .nt{font-size:12.5px;color:#8a8478;margin-top:4px}',
    '.kh-fact .srcline{font-size:11.5px;color:#5a554b;margin-top:8px;border-top:1px dashed #232323;padding-top:6px}',
    '.kh-fact .srcline .stale{color:#e5383b;font-weight:700}',
    '.kh-entity{text-align:center;margin:14px 0 4px}',
    '.kh-entity .nm{font-weight:900;font-size:22px;letter-spacing:1px;color:#f5f0e6}',
    '.kh-entity .mt{font-size:13px;color:#8a8478}',
    '.kh-rail{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:14px 0 4px}',
    '.kh-rail span{font-size:11.5px;border-radius:12px;padding:4px 10px;background:#1a1a1a;color:#8a8478}',
    '.kh-rail span.live{background:#0f2a1a;color:#2fbf71}',
    '.kh-doors{margin:18px 0 4px}',
    '.kh-doors .hd{font-size:12px;font-weight:700;letter-spacing:3px;color:#8a8478;text-align:center;margin-bottom:8px}',
    '.kh-door{display:block;text-align:center;background:#c1121f;color:#fff!important;font-weight:900;letter-spacing:1.5px;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;margin:8px 0}',
    '.kh-door.alt{background:#1a1a1a;border:1px solid #232323}',
    '.kh-disamb button{display:block;width:100%;text-align:left;background:#141414;border:1px solid #232323;border-radius:8px;padding:12px 14px;margin:6px 0;font-size:14px;cursor:pointer;color:#f5f0e6}',
    '.kh-empty{background:#111;border:1px dashed #2a2a2a;border-radius:10px;padding:18px;margin:10px 0;text-align:center;font-size:15px;color:#8a8478}',
    '.kh-empty .big{font-weight:900;font-size:17px;color:#f5f0e6;margin-bottom:6px}',
    '.kh-degraded{background:#1a1408;border:1px solid #8a6d1a;border-radius:8px;padding:10px 14px;font-size:13px;color:#d8b23a;margin:0 0 12px}',
    '.kh-err{background:#111;border:1px solid #c1121f;border-radius:8px;padding:12px 14px;font-size:14px;color:#e5383b;margin:0 0 12px}',
    '.kh-adj{font-size:12.5px;color:#8a8478;font-style:italic;text-align:center;margin:12px 0}',
    '.kh-promptq{display:block;width:100%;text-align:left;background:#141414;border:1px solid #232323;border-radius:10px;padding:12px 14px;margin:8px 0;cursor:pointer;color:#f5f0e6}',
    '.kh-promptq .ex{display:block;font-size:12px;color:#8a8478;margin-top:4px}',
    '.kh-foot{padding:8px 20px 26px;text-align:center;color:#5a554b;font-size:12px;display:flex;justify-content:center;gap:22px;flex-wrap:wrap}',
    '.kh-foot b{color:#f5f0e6;font-variant-numeric:tabular-nums}',
    '.kh-powered{text-align:center;padding:0 20px 30px;color:#5a554b;font-size:11px;letter-spacing:.14em}',
    '.kh-powered b{color:#8a8478}',
    '.kh-pillars{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;background:rgba(10,10,10,.96);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid #232323;padding-bottom:env(safe-area-inset-bottom,0px)}',
    '.kh-pillars a{flex:1 1 0;text-align:center;color:#8a8478;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.12em;padding:13px 4px;touch-action:manipulation}',
    '.kh-pillars a:active{color:#fff;background:#1a1a1a}',
    '.kh-pillars a span{display:block;font-size:9px;font-weight:400;letter-spacing:.2em;color:#5a554b;margin-top:2px}',
    '.kh-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 76px);transform:translateX(-50%) translateY(80px);background:#c1121f;color:#fff;font-weight:700;font-size:14px;padding:13px 24px;border-radius:999px;z-index:99;opacity:0;transition:transform .3s cubic-bezier(.2,.9,.3,1.2),opacity .3s;box-shadow:0 8px 30px rgba(193,18,31,.5);white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}',
    '.kh-toast.show{transform:translateX(-50%) translateY(0);opacity:1}'
  ];

  var toastEl = null, toastT = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------------- shell ---------------- */
  function shellHtml() {
    return '<style>' + CSS.join('\n') + '</style>' +
      '<div class="kh-wrap">' +
      '<div class="kh-topbar">' +
      '<a class="kh-wordmark" href="/" aria-label="MTCSTW home">MTCS<b>TW</b></a>' +
      '<div class="kh-live" id="kh-live"><span class="dot"></span><span id="kh-live-txt">CONNECTING</span></div>' +
      '</div>' +
      '<div class="kh-ask">' +
      '<h1>Who&rsquo;s <em>robbing</em> you?</h1>' +
      '<div class="kh-composer">' +
      '<textarea id="kh-q" rows="2" placeholder="Ask anything&hellip;" aria-label="Ask Karl"></textarea>' +
      '<div class="kh-composer-foot">' +
      '<span class="kh-composer-hint" id="kh-hint">sourced answers</span>' +
      '<button class="kh-ask-btn" id="kh-ask">ASK</button>' +
      '</div></div></div>' +
      '<div class="kh-chips" id="kh-chips">' +
      CHIPS.map(function (c) { return '<button type="button" class="kh-chip">' + esc(c) + '</button>'; }).join('') +
      '</div>' +
      '<div class="kh-feed-head"><h2>The Robbery Report</h2>' +
      '<span class="tick"><i></i>LIVE</span></div>' +
      '<div class="kh-feed" id="kh-feed"></div>' +
      '<div class="kh-foot" id="kh-foot">' +
      '<span><b id="kh-st-wealth">&middot;&middot;&middot;</b> tracked</span>' +
      '<span><b id="kh-st-rows">&middot;&middot;&middot;</b> records</span>' +
      '<span><b id="kh-st-creators">&middot;&middot;&middot;</b> creators</span>' +
      '</div>' +
      '<div class="kh-powered">POWERED BY <b>KARL</b> &middot; KOMRADE ARTIFICIAL REVOLUTIONARY LABORER</div>' +
      '</div>' +
      '<div class="kh-pillars" role="navigation" aria-label="Mission pillars">' +
      PILLARS.map(function (p) {
        return '<a href="' + p[1] + '">' + p[0] + '<span>TAP</span></a>';
      }).join('') +
      '</div>' +
      '<div class="kh-toast" id="kh-toast" role="status"></div>';
  }

  /* ---------------- cards ---------------- */
  function srcLine(s) {
    s = s || {};
    var bits = [];
    if (s.name) bits.push(esc(s.name));
    if (s.period) bits.push(esc(String(s.period)));
    var ret = '';
    if (s.retrieved_at) {
      try { ret = 'retrieved ' + new Date(Number(s.retrieved_at)).toISOString().slice(0, 10); } catch (e) { ret = ''; }
    }
    if (ret) bits.push(esc(ret));
    var stale = s.stale ? ' <span class="stale">&#9888; ' + esc(s.stale_note || 'stale') + '</span>' : '';
    return bits.join(' &middot; ') + stale;
  }

  function markDeployed(btn, nEl, d) {
    btn.classList.add('done');
    btn.textContent = 'DEPLOYED \u2713';
    d.deploys = (d.deploys || 0) + 1;
    if (nEl) nEl.textContent = fmt(d.deploys);
    showToast('Deployed — the robbery report grows');
  }

  /* DEPLOY = share action. Native share sheet -> clipboard fallback.
     Reconciles 46673830 (site/ line). ZERO XP — fail closed. */
  function bindDeploy(btn, nEl, d) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (btn.classList.contains('done')) return;
      var plainA = String(d.a || '').replace(/<[^>]*>/g, '');
      if (!plainA && d.facts) {
        plainA = d.facts.map(function (f) { return f.label + ': ' + f.value_display; }).join('\n');
      }
      var shareText = d.q + '\n\n' + plainA + '\n\n— via KARL at mtcstw.com';
      function done() { markDeployed(btn, nEl, d); }
      try {
        if (navigator.share) {
          navigator.share({ title: 'KARL Discovery', text: shareText, url: 'https://mtcstw.com/' })
            .then(done, function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).then(function () { done(); showToast('Copied — paste it anywhere'); }, done);
        } else { done(); }
      } catch (ex) { done(); }
    });
  }

  function cardEl(d, feed) {
    var el = document.createElement('div');
    el.className = 'kh-card' + (d.inference ? ' kh-inference' : '');
    if (d.seed) { try { el.setAttribute('data-seed', '1'); } catch (e) {} }
    var badge = d.inference ? '<div class="kh-kbadge">\uD83E\uDDE0 KARL NOTICED</div>' : '';
    var rows = (d.rows || []).map(function (r) {
      return '<div class="kh-proof-row"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>';
    }).join('');
    var door = '';
    var href = safeUrl(d.href);
    if (href) door = '<a class="kh-door" href="' + esc(href) + '">OPEN THE RECEIPT &rarr;</a>';
    el.innerHTML = badge +
      '<div class="q">' + esc(d.q) + '</div>' +
      '<div class="a">' + (d.a || '') + '</div>' +
      '<div class="kh-proof">' +
      '<div class="exhibit">\u25B8 EXHIBIT — VERIFIED</div>' + rows +
      '<div class="receipts">' + esc(d.src || '') + '</div>' + door +
      '<button type="button" class="kh-deploy-btn">DEPLOY</button>' +
      '</div>' +
      '<div class="kh-card-meta">' +
      '<span class="kh-deploys"><span class="n">' + fmt(d.deploys) + '</span> deployed</span>' +
      '<span><span class="kh-src">' + esc(String(d.src || '').split('\u2014')[0].trim()) + '</span> &middot; ' + esc(d.when || '') + '</span>' +
      '</div>';
    el.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('kh-deploy-btn')) return;
      el.classList.toggle('open');
    });
    bindDeploy(el.querySelector('.kh-deploy-btn'), el.querySelector('.kh-deploys .n'), d);
    return el;
  }

  /* Live answer card from a karl_query response. All API strings escaped —
     the backend is NO_PROSE/deterministic; we render facts, never prose. */
  function answerCard(q, r) {
    var el = document.createElement('div');
    el.className = 'kh-card open';
    var h = '<div class="q">' + esc(q) + '</div>';
    if (r.degraded) {
      h += '<div class="kh-degraded">' + esc(r.degraded_note || 'Karl is resting — static answers only.') + '</div>';
    }
    if (r.template === 'faq' && r.faq && r.faq.length) {
      h += '<div class="kh-empty"><div class="big">KARL</div>' + esc(r.faq[0].answer) + '</div>';
    }
    if (r.prompt && r.prompt.heading) {
      h += '<div class="kh-empty"><div class="big">' + esc(r.prompt.heading) + '</div>';
      (r.prompt.questions || []).forEach(function (pq) {
        h += '<button type="button" class="kh-promptq" data-ex="' + esc(pq.example || '') + '">' +
          esc(pq.label || '') + '<span class="ex">try: ' + esc(pq.example || '') + '</span></button>';
      });
      h += '<div class="nt" style="font-size:12px;color:#8a8478;margin-top:8px">Karl never guesses — you choose.</div></div>';
    }
    if (r.disambiguation && r.disambiguation.length) {
      h += '<div class="kh-empty"><div class="big">More than one matched — pick one.</div><div class="kh-disamb">' +
        r.disambiguation.map(function (o) {
          return '<button type="button" data-name="' + esc(o.name) + '">' +
            '<b>' + esc(o.name) + '</b><br><span style="font-size:12.5px;color:#8a8478">' +
            esc([o.office, o.state, o.party].filter(Boolean).join(' \u00B7 ')) + '</span></button>';
        }).join('') + '</div><div style="font-size:12px;color:#8a8478;margin-top:8px">Karl never guesses — you choose.</div></div>';
    }
    if (r.entity) {
      var meta = [];
      if (r.entity.office) meta.push(r.entity.office);
      if (r.entity.state || r.entity.state_code) meta.push(r.entity.state || r.entity.state_code);
      if (r.entity.party) meta.push(r.entity.party);
      if (r.entity.label) meta.push(r.entity.label);
      h += '<div class="kh-entity"><div class="nm">' + esc(r.entity.name || r.entity.zip || '') + '</div>' +
        (meta.length ? '<div class="mt">' + esc(meta.join(' \u00B7 ')) + '</div>' : '') + '</div>';
    }
    (r.facts || []).forEach(function (f) {
      h += '<div class="kh-fact"><div class="lb">' + esc(f.label) + '</div>' +
        '<div class="vl">' + esc(f.value_display) + '</div>' +
        (f.note ? '<div class="nt">' + esc(f.note) + '</div>' : '') +
        '<div class="srcline">' + srcLine(f.source) + '</div></div>';
    });
    if (r.adjacency_note) h += '<div class="kh-adj">' + esc(r.adjacency_note) + '</div>';
    if (!(r.facts || []).length && !(r.disambiguation || []).length && !(r.faq || []).length && !(r.prompt && r.prompt.heading)) {
      h += '<div class="kh-empty"><div class="big">I don&rsquo;t have data on that yet.</div>' +
        esc(r.empty_reason || 'That\u2019s a real answer — the rails are still building out.') + '</div>';
    }
    if ((r.rail_status || []).length) {
      h += '<div class="kh-rail">' + r.rail_status.map(function (s2) {
        return '<span class="' + (s2.live ? 'live' : '') + '">' +
          (s2.live ? '\u25CF ' : '\u25CB ') + esc(s2.rail) +
          (s2.live || !s2.note ? '' : ' — ' + esc(s2.note)) + '</span>';
      }).join('') + '</div>';
    }
    if ((r.related || []).length) {
      h += '<div class="kh-doors"><div class="hd">GO DEEPER</div>' +
        r.related.map(function (l, i) {
          var url = safeUrl(l.href);
          if (!url) return '';
          return '<a class="kh-door' + (i ? ' alt' : '') + '" href="' + esc(url) + '">' + esc(l.label) + ' &rarr;</a>';
        }).join('') + '</div>';
    }
    h += '<div class="kh-proof" style="display:block;border-top:1px solid #232323;margin-top:12px;padding-top:12px">' +
      '<button type="button" class="kh-deploy-btn">DEPLOY</button></div>' +
      '<div class="kh-card-meta"><span class="kh-deploys"><span class="n">0</span> deployed</span>' +
      '<span><span class="kh-src">KARL QUERY</span> &middot; now</span></div>';
    el.innerHTML = h;
    el.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('kh-deploy-btn')) return;
      el.classList.toggle('open');
    });
    var dd = { q: q, a: '', facts: r.facts || [], deploys: 0 };
    bindDeploy(el.querySelector('.kh-deploy-btn'), el.querySelector('.kh-deploys .n'), dd);
    /* disambiguation + prompt-example buttons re-ask */
    var dis = el.querySelectorAll('.kh-disamb button');
    for (var i = 0; i < dis.length; i++) {
      (function (b) {
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var nm = b.getAttribute('data-name');
          var input = document.getElementById('kh-q');
          var nq = 'who funds ' + nm + '?';
          if (input) input.value = nq;
          doAsk(nq, { name: nm });
        });
      })(dis[i]);
    }
    var pqs = el.querySelectorAll('.kh-promptq');
    for (var j = 0; j < pqs.length; j++) {
      (function (b) {
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var ex2 = b.getAttribute('data-ex');
          if (!ex2) return;
          var input = document.getElementById('kh-q');
          if (input) input.value = ex2;
          doAsk(ex2);
        });
      })(pqs[j]);
    }
    return el;
  }

  /* ---------------- mount + wiring ---------------- */
  var feed, askBtn, qInput;

  function render() {
    host.innerHTML = shellHtml();
    toastEl = document.getElementById('kh-toast');
    feed = document.getElementById('kh-feed');
    askBtn = document.getElementById('kh-ask');
    qInput = document.getElementById('kh-q');

    SEED.forEach(function (d, i) {
      d.seed = true;
      var c = cardEl(d, feed);
      c.style.animationDelay = (i * 0.06) + 's';
      feed.appendChild(c);
    });

    document.getElementById('kh-chips').addEventListener('click', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('kh-chip')) return;
      qInput.value = t.textContent;
      qInput.focus();
      doAsk(t.textContent);
    });
    askBtn.addEventListener('click', function () { doAsk(qInput.value.trim()); });
    qInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doAsk(qInput.value.trim()); }
    });

    bootLive();
  }

  /* ---------------- live: stats + lead inference ---------------- */
  function setLive(on) {
    var l = document.getElementById('kh-live');
    if (!l) return;
    l.classList.toggle('on', !!on);
    var t = document.getElementById('kh-live-txt');
    if (t) t.textContent = on ? 'LIVE' : 'OFFLINE';
  }

  function liveInferenceCard(st) {
    var w = st.wealth_display || '', rows = st.rows_display || '', cr = st.creators;
    var frame = (Date.now() % 2 === 0) ? 0 : 1;
    var d;
    if (frame === 0) {
      d = {
        q: "Karl noticed: " + w + " in tracked wealth across " + rows + " records.",
        a: "That's not an economy — it's a crime scene with a spreadsheet. <b>" + esc(String(cr || '')) + "</b> creators are documenting the robbery in real time. Every number below is live from the bank.",
        rows: [["Wealth tracked", w], ["Records in the bank", rows], ["Creators documenting", fmt(cr)]],
        src: "RECEIPTS — karl_stats · live D1", deploys: 0, when: "just now", inference: true
      };
    } else {
      d = {
        q: "Karl noticed: " + rows + " records and counting — the machine runs on receipts, not vibes.",
        a: "<b>" + w + "</b> in tracked wealth. <b>" + esc(String(cr || '')) + "</b> creators feeding the bank. Ask it anything — if the data exists, Karl finds it. If it doesn't, he says so.",
        rows: [["Records in the bank", rows], ["Wealth tracked", w], ["Creators documenting", fmt(cr)]],
        src: "RECEIPTS — karl_stats · live D1", deploys: 0, when: "just now", inference: true
      };
    }
    return d;
  }

  /* Map a karl_robbery lead/item onto the feed card shape. All BE strings
     are escaped here — the card renderer trusts only hardcoded seeds. */
  function robberyLeadCard(lead) {
    var rows = lead.amount_display ? [["Amount", lead.amount_display]] : [];
    var src = "RECEIPTS \u2014 " + srcName(lead.source) +
      (lead.computed_from ? " \u00B7 " + lead.computed_from : "");
    return {
      q: lead.headline, a: esc(lead.detail || ""), rows: rows, src: src,
      href: lead.href, deploys: 0, when: "just now", inference: true
    };
  }
  function robberyItemCard(it) {
    var rows = it.amount_display ? [["Amount", it.amount_display]] : [];
    return {
      q: it.title, a: esc(it.detail || ""), rows: rows,
      src: "RECEIPTS \u2014 " + srcName(it.source),
      href: it.href, deploys: 0, when: timeAgo(it.published_at) || "today"
    };
  }

  function bootLive() {
    /* Lead inference: "connecting the dots" shimmer, then the live card. */
    var think = document.createElement('div');
    think.className = 'kh-card kh-thinking';
    think.innerHTML = '<div class="tline"><span class="pulse-dot"></span>Karl is connecting the dots&hellip;</div>' +
      '<div class="kh-shimmer"></div><div class="kh-shimmer" style="width:62%"></div>';
    feed.insertBefore(think, feed.firstChild);

    var t0 = Date.now();
    var st = null, rb = null, settled = 0;
    function maybeRender() {
      if (++settled < 2) return;
      var wait = Math.max(0, 800 - (Date.now() - t0));
      setTimeout(function () {
        /* Footer stats + hint + live indicator from karl_stats. */
        var statsOk = st && st.ok && st.wealth_display && st.rows_display;
        if (statsOk) {
          setLive(true);
          var hint = document.getElementById('kh-hint');
          if (hint) hint.textContent = st.rows_display + ' records \u00B7 sourced answers';
          var sw = document.getElementById('kh-st-wealth'); if (sw) sw.textContent = st.wealth_display;
          var sr = document.getElementById('kh-st-rows'); if (sr) sr.textContent = st.rows_display;
          var sc = document.getElementById('kh-st-creators'); if (sc) sc.textContent = fmt(st.creators);
        } else {
          setLive(false);
          err('karl_stats failed — stats stay placeholder, inference degrades');
        }
        /* Lead card: karl_robbery lead (contractually first) > stats-generated
           inference > canned pool. Until the BE deploys, karl_robbery is
           "unknown action" and the fallbacks carry the feed. */
        var pick;
        if (rb && rb.ok && rb.lead && rb.lead.headline) {
          pick = robberyLeadCard(rb.lead);
        } else if (statsOk) {
          pick = liveInferenceCard(st);
        } else {
          pick = INFERENCES[Math.floor(Math.random() * INFERENCES.length)];
          pick = Object.assign({}, pick, { when: 'just now' });
        }
        var elc = cardEl(pick, feed);
        think.replaceWith(elc);
        /* Live feed: karl_robbery items replace the seed cards when present. */
        if (rb && rb.ok && rb.items && rb.items.length) {
          try {
            var seeds = feed.querySelectorAll('[data-seed]');
            for (var i = 0; i < seeds.length; i++) {
              if (seeds[i].parentNode) seeds[i].parentNode.removeChild(seeds[i]);
            }
          } catch (e) {}
          rb.items.forEach(function (it, j) {
            if (!it || !it.title) return;
            var c = cardEl(robberyItemCard(it), feed);
            c.style.animationDelay = (j * 0.06) + 's';
            feed.appendChild(c);
          });
        } else if (rb && rb.ok) {
          err('karl_robbery empty — seed feed retained (' + (rb.empty_reason || 'no reason') + ')');
        }
      }, wait);
    }
    api('karl_stats', {}, function (r) { st = r; maybeRender(); });
    api('karl_robbery', {}, function (r) { rb = r; maybeRender(); });
  }

  /* ---------------- ask flow ---------------- */
  function doAsk(text, context) {
    text = String(text || '').trim();
    if (!text || !askBtn || askBtn.disabled) return;
    askBtn.disabled = true;
    askBtn.textContent = '\u2026';

    var load = document.createElement('div');
    load.className = 'kh-card';
    load.innerHTML = '<div class="q">' + esc(text) + '</div>' +
      '<div class="kh-shimmer"></div><div class="kh-shimmer" style="width:70%"></div>';
    feed.insertBefore(load, feed.firstChild);
    try { load.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}

    var params = { q: text };
    if (context) { try { params.context = JSON.stringify(context); } catch (e) {} }
    api('karl_query', params, function (r) {
      var done = function () {
        askBtn.disabled = false;
        askBtn.textContent = 'ASK';
        qInput.value = '';
      };
      if (!r || (r.ok === false && !r.template && !r.facts)) {
        load.innerHTML = '<div class="q">' + esc(text) + '</div>' +
          '<div class="kh-err">The rails didn&rsquo;t answer. Check your connection and try again.</div>';
        done();
        err('karl_query failed for: ' + text.slice(0, 60));
        return;
      }
      var elc = answerCard(text, r);
      load.replaceWith(elc);
      try { elc.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e2) {}
      showToast('Answer ready — tap DEPLOY to spread it');
      done();
    });
  }

  render();
  /* Full-width mount block like every dedicated page. */
  try { if (PF && PF.feWiden) PF.feWiden(host); } catch (e) {}
})();
