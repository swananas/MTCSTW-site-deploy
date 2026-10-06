/* core/34-newsstats.js | PF v1.4.3 | NEWS + STATS WIRING.
   CEO directive 2026-10-06: "We need news wired with relevant stats."
   Every news surface carries live, relevant statistics from our own data
   machine — not just headlines. One stats-resolver module: given a news
   item's topic tags, returns the relevant live figures as Data Strips
   (figure + label + source + recency stamp, per the pattern library).
   Never a bare number without provenance — the honesty standard.

   TAG VOCABULARY (keyword-based, fail-open, no ML service):
     price:<item_id>  — CPI basket items, resolved via public GET price_board
                        (area_key=national). Keywords:
       eggs->eggs | milk->milk | bread|loaf->bread | beef|ground beef|hamburger->ground_beef
       chicken|poultry->chicken_breast | rice->white_rice | banana(s)->bananas
       butter->butter | coffee->coffee_12oz | gas|gasoline|pump price|fuel cost->gasoline
       electricity|power bill|utility bill->electricity | rent|landlord->rent_1br
     corp:<company>   — Robbery Report margins, resolved client-side from
                        PFRobReportData (core/robreport-data.js). Keywords:
       chipotle->Chipotle | apple|iphone|ipad|macbook->Apple | nike->Nike
       coca-cola|coke->Coca-Cola chain | procter|tide|pampers->Procter & Gamble
       walmart->Walmart | kraft|heinz->Kraft Heinz | general mills|cheerios|yoplait->General Mills
       kimberly-clark|kleenex|huggies->Kimberly-Clark | colgate|palmolive->Colgate-Palmolive
       unilever|dove|hellmann->Unilever | clorox->Clorox
     macro:<series>   — official macro, resolved via public GET fred_series. Keywords:
       unemployment|jobs report|jobless->UNRATE | inflation|cpi|consumer prices->CPIAUCNS
       mortgage|home loan->MORTGAGE30US | fed|federal reserve|interest rate|rate cut->FEDFUNDS
       wages|paycheck|earnings->LES1252881600Q | treasury|10-year|bond yield->DGS10
     race:<keyword>   — prediction markets, resolved via public GET predict_qlist
                        (title keyword match; figure is the LIVE market, never
                        a fabricated odd). Keywords:
       senate | house (of representatives) | governor | mayor | ballot measure | recall | primary

   STAT SHAPE: {figure, label, source, recency, kind}
     kind: 'price' | 'corp' | 'macro' | 'race'
   API:
     PF.newsStats.tag(text)              -> {price:[], corp:[], macro:[], race:[]}
     PF.newsStats.resolve(tags)          -> Promise<stats[]> (cached 5 min, fail-open [])
     PF.newsStats.stripHTML(stat)        -> Data Strip HTML string
     PF.newsStats.enhanceRail(el, stories)-> wires strips into a rendered news rail
     PF.newsStats.enhanceWarReport(el)   -> wires strips into war-report body blocks
   FAIL-OPEN EVERYWHERE: no matching tags -> no strips, story renders exactly
   as before. Any fetch failure -> []. No blanks, no errors, no layout shift
   (strips inject into reserved placeholder divs).
   ZERO XP. Zero writes. Display only. All endpoints used are public GET rails.
   KILL: ?pf_off=newsstats  (whole module). Per-surface kills still respected. */
(function () {
  'use strict';
  var PF = window.PF || (window.PF = {});
  if (!PF || PF.newsStats) return;
  try { if (PF.skip && PF.skip('newsstats')) return; } catch (e) {}

  var TTL_MS = 5 * 60 * 1000;
  var TIMEOUT_MS = 10000;
  var MAX_STRIPS_PER_STORY = 2;
  var MAX_WR_STRIPS = 6;

  function apiBase() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function timeAgo(ts) {
    try {
      var d = Date.now() - Number(ts || 0);
      if (d < 0) d = 0;
      var m = Math.floor(d / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    } catch (e) { return ''; }
  }
  function money(cents) {
    try { return '$' + (Number(cents) / 100).toFixed(2); } catch (e) { return ''; }
  }

  /* ---------- tag vocabulary ---------- */
  /* Each entry: [regex, tagValue]. First match per family wins. */
  var PRICE_VOCAB = [
    [/\beggs?\b/i, 'eggs'],
    [/\bmilk\b/i, 'milk'],
    [/\bbread\b|\bloaf\b|\bloaves\b/i, 'bread'],
    [/\bbeef\b|\bground beef\b|\bhamburger\b/i, 'ground_beef'],
    [/\bchicken\b|\bpoultry\b/i, 'chicken_breast'],
    [/\brice\b/i, 'white_rice'],
    [/\bbananas?\b/i, 'bananas'],
    [/\bbutter\b/i, 'butter'],
    [/\bcoffee\b/i, 'coffee_12oz'],
    [/\bgas\b|\bgasoline\b|\bpump price\b|\bfuel cost\b/i, 'gasoline'],
    [/\belectricity\b|\bpower bill\b|\butility bill\b/i, 'electricity'],
    [/\brent\b|\blandlord\b|\btenant\b/i, 'rent_1br']
  ];
  var PRICE_NAMES = { eggs: 'Eggs', milk: 'Milk', bread: 'Bread', ground_beef: 'Ground beef',
    chicken_breast: 'Chicken breast', white_rice: 'White rice', bananas: 'Bananas',
    butter: 'Butter', coffee_12oz: 'Coffee', gasoline: 'Gasoline', electricity: 'Electricity',
    rent_1br: 'Rent (1BR)' };
  var PRICE_UNITS = { eggs: 'dozen', milk: 'gallon', bread: 'loaf', ground_beef: 'lb',
    chicken_breast: 'lb', white_rice: 'lb', bananas: 'lb', butter: 'unit',
    coffee_12oz: 'bag', gasoline: 'gallon', electricity: 'kWh', rent_1br: 'month' };

  var CORP_VOCAB = [
    [/\bchipotle\b/i, 'Chipotle'],
    [/\bapple\b|\biphone\b|\bipad\b|\bmacbook\b/i, 'Apple'],
    [/\bnike\b/i, 'Nike'],
    [/\bcoca-cola\b|\bcoke\b/i, 'Coca-Cola chain'],
    [/\bprocter\b|\btide\b|\bpampers\b/i, 'Procter & Gamble'],
    [/\bwalmart\b/i, 'Walmart'],
    [/\bkraft\b|\bheinz\b/i, 'Kraft Heinz'],
    [/\bgeneral mills\b|\bcheerios\b|\byoplait\b/i, 'General Mills'],
    [/\bkimberly-clark\b|\bkleenex\b|\bhuggies\b/i, 'Kimberly-Clark'],
    [/\bcolgate\b|\bpalmolive\b/i, 'Colgate-Palmolive'],
    [/\bunilever\b|\bdove\b|\bhellmann/i, 'Unilever'],
    [/\bclorox\b/i, 'Clorox']
  ];

  var MACRO_VOCAB = [
    [/\bunemployment\b|\bjobs report\b|\bjobless\b/i, 'UNRATE'],
    [/\binflation\b|\bcpi\b|\bconsumer prices\b/i, 'CPIAUCNS'],
    [/\bmortgage\b|\bhome loan\b/i, 'MORTGAGE30US'],
    [/\bfed\b|\bfederal reserve\b|\binterest rate\b|\brate cut\b/i, 'FEDFUNDS'],
    [/\bwages?\b|\bpaycheck\b|\bearnings\b/i, 'LES1252881600Q'],
    [/\btreasury\b|\b10-year\b|\bbond yield\b/i, 'DGS10']
  ];
  var MACRO_TITLES = { UNRATE: 'UNEMPLOYMENT', CPIAUCNS: 'CONSUMER PRICES',
    MORTGAGE30US: '30-YR MORTGAGE', FEDFUNDS: 'FED FUNDS RATE',
    LES1252881600Q: 'REAL WEEKLY PAY', DGS10: '10-YR TREASURY' };

  var RACE_VOCAB = [
    [/\bsenate\b/i, 'senate'],
    [/\bhouse\b/i, 'house'],
    [/\bgovernor\b/i, 'governor'],
    [/\bmayor\b/i, 'mayor'],
    [/\bballot measure\b/i, 'ballot measure'],
    [/\brecall\b/i, 'recall'],
    [/\bprimary\b/i, 'primary']
  ];

  function tag(text) {
    var out = { price: [], corp: [], macro: [], race: [] };
    try {
      var t = String(text || '');
      if (!t) return out;
      var i, m;
      for (i = 0; i < PRICE_VOCAB.length; i++) {
        m = PRICE_VOCAB[i][0].exec(t);
        if (m) { out.price.push(PRICE_VOCAB[i][1]); break; }
      }
      for (i = 0; i < CORP_VOCAB.length; i++) {
        m = CORP_VOCAB[i][0].exec(t);
        if (m) { out.corp.push(CORP_VOCAB[i][1]); break; }
      }
      for (i = 0; i < MACRO_VOCAB.length; i++) {
        m = MACRO_VOCAB[i][0].exec(t);
        if (m) { out.macro.push(MACRO_VOCAB[i][1]); break; }
      }
      for (i = 0; i < RACE_VOCAB.length; i++) {
        m = RACE_VOCAB[i][0].exec(t);
        if (m) { out.race.push(RACE_VOCAB[i][1]); break; }
      }
    } catch (e) {}
    return out;
  }

  /* ---------- fetch helpers (JSONP, fail-open) ---------- */
  function getJSON(action, params) {
    return new Promise(function (resolve) {
      try {
        var base = apiBase();
        if (!base) { resolve(null); return; }
        var fn = 'pfNsCb' + Math.floor(Math.random() * 1e9);
        var s = document.createElement('script'), done = false;
        function fin(j) {
          if (done) return; done = true;
          try { delete window[fn]; } catch (e) {}
          try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e2) {}
          try { resolve(j || null); } catch (e3) { resolve(null); }
        }
        window[fn] = function (j) { fin(j); };
        s.onerror = function () { fin(null); };
        var q = '?action=' + encodeURIComponent(action);
        for (var k in params) {
          if (params[k] != null && params[k] !== '') {
            q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
          }
        }
        q += '&callback=' + fn;
        s.src = base + q;
        s.async = true;
        document.head.appendChild(s);
        setTimeout(function () { fin(null); }, TIMEOUT_MS);
      } catch (e) { resolve(null); }
    });
  }

  var CACHE = {}; /* key -> {at, stats} */
  function cacheGet(key) {
    try {
      var c = CACHE[key];
      if (c && (Date.now() - c.at) < TTL_MS) return c.stats;
    } catch (e) {}
    return null;
  }
  function cacheSet(key, stats) {
    try { CACHE[key] = { at: Date.now(), stats: stats }; } catch (e) {}
  }

  /* ---------- stat builders ---------- */
  function priceStat(itemId) {
    var key = 'price:' + itemId;
    var hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return getJSON('price_board', { area_key: 'national', item_id: itemId }).then(function (j) {
      var stats = [];
      try {
        if (j && j.ok && Array.isArray(j.items)) {
          for (var i = 0; i < j.items.length; i++) {
            var it = j.items[i];
            if (it && it.item_id === itemId && it.enough_data && it.median_cents) {
              var fig = money(it.median_cents);
              var delta = '';
              try {
                if (typeof it.delta_pct === 'number' && it.delta_pct !== 0) {
                  var d = it.delta_pct;
                  delta = (d > 0 ? 'up ' : 'down ') + Math.abs(d).toFixed(1) + '% vs last week';
                }
              } catch (e2) {}
              var n = Number(it.sample_count) || 0;
              stats.push({
                kind: 'price',
                figure: fig,
                label: (PRICE_NAMES[itemId] || itemId).toUpperCase() + ' · ' +
                  (PRICE_UNITS[itemId] || '').toUpperCase() + " — PEOPLE'S CPI" +
                  (delta ? ' · ' + delta : ''),
                source: "People's CPI (crowdsourced)",
                recency: (n ? n + ' reports · ' : '') + 'updated ' + timeAgo(j.period_end || Date.now())
              });
              break;
            }
          }
        }
      } catch (e) {}
      cacheSet(key, stats);
      return stats;
    });
  }

  function corpStat(company) {
    var stats = [];
    try {
      var RR = window.PFRobReportData;
      if (RR && Array.isArray(RR.ITEMS)) {
        for (var i = 0; i < RR.ITEMS.length; i++) {
          var it = RR.ITEMS[i];
          if (it && it.company === company) {
            var pct = it.takePct || null;
            if (!pct && it.takeMid && it.price) {
              pct = (Math.round((it.takeMid / it.price) * 1000) / 10).toFixed(1);
            }
            if (pct) {
              stats.push({
                kind: 'corp',
                figure: pct + '%',
                label: company.toUpperCase() + "'S TAKE — ROBBERY REPORT",
                source: 'Estimated from their own filings' +
                  (it.bandLabel ? ' · ' + it.bandLabel : ''),
                recency: 'Robbery Report · curated figures'
              });
            }
            break; /* first item per company is the flagship */
          }
        }
      }
    } catch (e) {}
    return Promise.resolve(stats);
  }

  function macroStat(seriesId) {
    var key = 'macro:' + seriesId;
    var hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return getJSON('fred_series', { series_id: seriesId, limit: 1 }).then(function (j) {
      var stats = [];
      try {
        if (j && j.ok && j.fred_live && Array.isArray(j.observations) && j.observations.length) {
          var o = j.observations[0];
          var fig = o.value_label || String(o.value != null ? o.value : '');
          if (fig && fig !== '—') {
            stats.push({
              kind: 'macro',
              figure: fig,
              label: (MACRO_TITLES[seriesId] || seriesId) + ' — FRED (OFFICIAL)',
              source: 'St. Louis Fed FRED',
              recency: 'period ' + (o.period || '') +
                (j.retrieved_at ? ' · pulled ' + timeAgo(j.retrieved_at) : '')
            });
          }
        }
      } catch (e) {}
      cacheSet(key, stats);
      return stats;
    });
  }

  function raceStat(keyword) {
    var key = 'race:' + keyword;
    var hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return getJSON('predict_qlist', {}).then(function (j) {
      var stats = [];
      try {
        if (j && j.ok && Array.isArray(j.questions)) {
          for (var i = 0; i < j.questions.length; i++) {
            var q = j.questions[i];
            if (q && q.status === 'open' && new RegExp(keyword, 'i').test(String(q.title || ''))) {
              var close = '';
              try {
                if (q.lock_at) close = ' · closes ' + new Date(Number(q.lock_at)).toLocaleDateString();
              } catch (e2) {}
              stats.push({
                kind: 'race',
                figure: 'LIVE',
                label: String(q.title).toUpperCase().slice(0, 60) + ' — CALL IT',
                source: 'Prediction market (game only, not financial advice)',
                recency: 'market open' + close
              });
              break; /* first matching open market */
            }
          }
        }
      } catch (e) {}
      cacheSet(key, stats);
      return stats;
    });
  }

  /* Resolve a tag set into stats, ordered price -> corp -> macro -> race.
     Never rejects; fail-open []. */
  function resolve(tags) {
    try {
      tags = tags || { price: [], corp: [], macro: [], race: [] };
      var jobs = [];
      (tags.price || []).slice(0, 1).forEach(function (id) { jobs.push(priceStat(id)); });
      (tags.corp || []).slice(0, 1).forEach(function (c) { jobs.push(corpStat(c)); });
      (tags.macro || []).slice(0, 1).forEach(function (s) { jobs.push(macroStat(s)); });
      (tags.race || []).slice(0, 1).forEach(function (k) { jobs.push(raceStat(k)); });
      if (!jobs.length) return Promise.resolve([]);
      return Promise.all(jobs).then(function (arr) {
        var out = [];
        for (var i = 0; i < arr.length; i++) {
          var s = arr[i] || [];
          for (var k = 0; k < s.length && out.length < MAX_STRIPS_PER_STORY; k++) out.push(s[k]);
        }
        return out;
      }).catch(function () { return []; });
    } catch (e) { return Promise.resolve([]); }
  }

  /* ---------- Data Strip render (pattern library: figure + label + source + recency) ---------- */
  var CSS_DONE = false;
  function cssOnce() {
    if (CSS_DONE) return; CSS_DONE = true;
    try {
      if (document.getElementById('pf-ns-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-ns-css';
      st.textContent =
        '.pf-ns-strip{display:flex;gap:12px;align-items:baseline;margin:8px 0 2px;' +
        'padding:8px 10px;background:#0d0d0d;border-top:2px solid #c1121f}' +
        '.pf-ns-fig{font:900 20px Arial,sans-serif;color:#f5ead6;white-space:nowrap}' +
        '.pf-ns-body{min-width:0}' +
        '.pf-ns-label{font:700 11px Arial,sans-serif;color:#c1121f;letter-spacing:1px}' +
        '.pf-ns-src{display:block;font:10px Arial,sans-serif;color:#8a8a8a;margin-top:2px}';
      document.head.appendChild(st);
    } catch (e) {}
  }

  function stripHTML(stat) {
    try {
      if (!stat || !stat.figure) return '';
      cssOnce();
      return '<div class="pf-ns-strip">' +
        '<div class="pf-ns-fig">' + esc(stat.figure) + '</div>' +
        '<div class="pf-ns-body"><div class="pf-ns-label">' + esc(stat.label) + '</div>' +
        '<span class="pf-ns-src">' + esc(stat.source) +
        (stat.recency ? ' · ' + esc(stat.recency) : '') + '</span></div></div>';
    } catch (e) { return ''; }
  }

  /* ---------- surface wiring ---------- */
  /* News rail: stories[i] <-> .pf-newstop-item[i]. Strips inject into a
     reserved placeholder so a failed/slow resolve never shifts layout. */
  function enhanceRail(el, stories) {
    try {
      if (!el || !Array.isArray(stories) || !stories.length) return;
      var items = el.querySelectorAll ? el.querySelectorAll('.pf-newstop-item') : [];
      var n = Math.min(items.length, stories.length);
      for (var i = 0; i < n; i++) {
        (function (li, story) {
          try {
            var tags = tag(story.title + ' ' + (story.source || ''));
            var hasTags = (tags.price.length || tags.corp.length || tags.macro.length || tags.race.length);
            if (!hasTags) return; /* no tags -> story renders exactly as before */
            var slot = document.createElement('div');
            slot.className = 'pf-ns-slot';
            li.appendChild(slot);
            resolve(tags).then(function (stats) {
              try {
                if (!stats.length) { slot.parentNode && slot.parentNode.removeChild(slot); return; }
                var h = '';
                for (var k = 0; k < stats.length; k++) h += stripHTML(stats[k]);
                slot.innerHTML = h;
              } catch (e) {}
            });
          } catch (e) {}
        })(items[i], stories[i]);
      }
    } catch (e) {}
  }

  /* War Report: tag each text block of the report body, append strips for
     blocks with matching stats. Cap total strips so the report stays readable. */
  function enhanceWarReport(el) {
    try {
      if (!el) return;
      var body = el.querySelector ? el.querySelector('.wr-body') : null;
      if (!body) return;
      /* Split the pre-wrapped text into blocks on blank lines. */
      var raw = body.textContent || '';
      var blocks = raw.split(/\n\s*\n/).filter(function (b) { return b.trim().length > 40; });
      if (!blocks.length) return;
      var remaining = MAX_WR_STRIPS;
      var jobs = [];
      blocks.forEach(function (b, bi) {
        if (remaining <= 0) return;
        var tags = tag(b);
        var hasTags = (tags.price.length || tags.corp.length || tags.macro.length || tags.race.length);
        if (!hasTags) return;
        remaining -= MAX_STRIPS_PER_STORY;
        jobs.push(resolve(tags).then(function (stats) { return { bi: bi, stats: stats }; }));
      });
      if (!jobs.length) return;
      Promise.all(jobs).then(function (done) {
        try {
          /* Re-split the live DOM on the same boundaries and append strips. */
          var html = body.innerHTML;
          /* Fallback: append strips at the end of the body block if we can't
             map blocks back to DOM nodes — still adjacent to the story. */
          var h = '';
          done.forEach(function (d) {
            (d.stats || []).forEach(function (s) { h += stripHTML(s); });
          });
          if (h) {
            var wrap = document.createElement('div');
            wrap.className = 'pf-ns-wr';
            wrap.innerHTML = h;
            body.appendChild(wrap);
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  PF.newsStats = {
    tag: tag,
    resolve: resolve,
    stripHTML: stripHTML,
    enhanceRail: enhanceRail,
    enhanceWarReport: enhanceWarReport,
    TAG_VOCAB: { price: PRICE_VOCAB.length, corp: CORP_VOCAB.length,
      macro: MACRO_VOCAB.length, race: RACE_VOCAB.length }
  };
})();
