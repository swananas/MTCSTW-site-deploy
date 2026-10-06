/* games/fred-explain.js  |  PF v1.4.3 | TOOL 2 — "WHAT DOES THIS MEAN FOR ME?"
   Plain-English explainers on official FRED data. Two doors: 4 life-topic
   cards (Rent, Groceries, Job Hunt, Savings) or direct series pick
   ("nerd mode"). Fixed 5-beat structure, all copy server-generated
   (?action=fred_explain) under the banned/allowed phrasing lists.

   Mounts:
     PFExplain.mount(el, context) — full explainer. Contexts: 'money'
       (Follow the Money section, via money-page.js), 'economy', 'war',
       'brief'. Self-mounts on #pf-economy (Economy page, secondary),
       #xWarReport (one weekly explainer), #xBrief (Morning Briefing,
       rotating topic).
     Kills: money-explain · economy-explain · war-explain · brief-explain
       (master ?pf_off=fred).

   Binding honesty:
   - Exact disclaimer on every render, visible without scrolling (inside
     the always-visible beat-1 block); short form adjacent to every share
     button. Beats 2–5 collapse to accordions on mobile.
   - No predictions, no financial advice — enforced server-side; this file
     renders beats verbatim and never invents copy.
   - Every figure: 4-fact citation + staleness badge + ʳ marker.
   - Rent card is backed by the live CUUR0000SEHA rent series (Phase 3);
     the via-mortgage label is retired.
   Read-only, zero XP. Cross-links are user-initiated taps only — no
   auto-advance, no streak/XP pressure between tools. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (window.PFExplain) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function skip(id) { try { return PF.skip('fred') || PF.skip(id); } catch (e) { return false; } }

  var TOPICS = [
    /* Phase 3 (2026-10-06): the rent series is live — the card is backed
       by CUUR0000SEHA directly; the via-mortgage label is retired. */
    { key: 'rent', label: 'RENT', sub: 'What renters actually pay, from the CPI rent index' },
    { key: 'groceries', label: 'GROCERIES', sub: 'What food prices are doing' },
    { key: 'job-hunt', label: 'JOB HUNT', sub: 'How tight the job market is' },
    { key: 'savings', label: 'SAVINGS', sub: 'What your cash earns' }
  ];
  /* Phase 3 (2026-10-06): the 3 new series join the nerd-mode list. */
  var SERIES12 = ['FEDFUNDS', 'UNRATE', 'DGS10', 'DGS2', 'MORTGAGE30US',
    'CPIAUCNS', 'CPILFESL', 'PCEPI', 'GDP', 'CES0500000003', 'PAYEMS', 'CUUR0000SEHA',
    'DRCCLACBS', 'LES1252881600Q', 'CUSR0000SAF11'];
  var PLAIN = {
    FEDFUNDS: 'Fed funds rate', UNRATE: 'Unemployment rate',
    DGS10: '10-year Treasury yield', DGS2: '2-year Treasury yield',
    MORTGAGE30US: '30-year mortgage rate',
    CPIAUCNS: 'Consumer prices (CPI)', CPILFESL: 'Core consumer prices',
    PAYEMS: 'Nonfarm payrolls', PCEPI: 'PCE price index',
    GDP: 'Real GDP', CES0500000003: 'Average hourly earnings',
    CUUR0000SEHA: 'Rent of primary residence', DRCCLACBS: 'Credit-card delinquency',
    LES1252881600Q: 'Median weekly earnings (real)', CUSR0000SAF11: 'Food at home (CPI)'
  };
  var ROTATE = ['rent', 'groceries', 'job-hunt', 'savings'];

  function isoWeek() {
    try {
      var d = new Date();
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      var dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow + 3);
      var first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
      var fdow = (first.getUTCDay() + 6) % 7;
      first.setUTCDate(first.getUTCDate() - fdow + 3);
      return Math.round((d - first) / (7 * 24 * 3600 * 1000)) + 1;
    } catch (e) { return 1; }
  }

  var CSS = [
    '.pf-ex{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-ex-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-ex-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-ex-sub{font-size:13px;color:#c9bfa8;text-align:center;margin:0 0 14px}',
    '.pf-ex-topics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-ex-topics{grid-template-columns:1fr 1fr}}',
    '.pf-ex-tp{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:14px 8px;cursor:pointer;min-height:64px;color:#f5ead6;text-align:center}',
    '.pf-ex-tp.on{border-color:#c1121f;background:#160a0a}',
    '.pf-ex-tp b{display:block;font-size:15px;letter-spacing:1px;margin-bottom:4px}',
    '.pf-ex-tp span{font-size:11px;color:#8a8271;line-height:1.4;display:block}',
    '.pf-ex-nerd{display:block;text-align:center;margin:6px 0 12px;color:#e8b923;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;background:none;border:0;text-decoration:underline;min-height:44px;width:100%}',
    '.pf-ex-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;margin-bottom:6px;-webkit-overflow-scrolling:touch}',
    '.pf-ex-chip{flex:0 0 auto;min-height:48px;padding:0 16px;background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:24px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pf-ex-chip.on{background:#c1121f;border-color:#c1121f;color:#fff}',
    '.pf-ex-card{background:#0d0d0d;border:1px solid #2a2a2a;border-top:4px solid #c1121f;border-radius:8px;padding:16px;margin-top:10px}',
    '.pf-ex-fig{font-weight:900;font-size:34px;margin:0 0 2px;color:#f5ead6;line-height:1.2}',
    '.pf-ex-vin{font-size:12px;color:#c9bfa8;margin-bottom:8px}',
    '.pf-ex-dis{font-size:12px;color:#c9bfa8;background:#141414;border:1px solid #2a2a2a;border-radius:6px;padding:10px 12px;line-height:1.6;margin:10px 0;font-style:italic}',
    '.pf-ex-beat{border-top:1px solid #2a2a2a;margin:0}',
    '.pf-ex-beat summary{cursor:pointer;min-height:48px;display:flex;align-items:center;font-weight:900;font-size:12px;letter-spacing:2px;color:#e8b923;list-style:none;padding:6px 0}',
    '.pf-ex-beat summary::-webkit-details-marker{display:none}',
    '.pf-ex-beat summary::before{content:"+";margin-right:10px;font-size:16px}',
    '.pf-ex-beat[open] summary::before{content:"\\2212"}',
    '.pf-ex-beat p{font-size:14px;line-height:1.7;color:#f5ead6;margin:0 0 12px}',
    '.pf-ex-topicnote{font-size:11px;color:#8a8271;font-style:italic;margin:0 0 8px}',
    '.pf-ex-share{display:block;width:100%;background:#c1121f;color:#fff;border:0;border-radius:6px;min-height:52px;font-weight:900;font-size:14px;letter-spacing:2px;cursor:pointer;margin-top:10px}',
    '.pf-ex-sharedis{font-size:11px;color:#8a8271;text-align:center;margin-top:6px;font-style:italic}',
    '.pf-ex-follow{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:14px 0 4px}',
    '.pf-ex-fbtn{background:#1a1a1a;border:1px solid #3a3a3a;color:#e8b923;border-radius:6px;min-height:44px;padding:10px 16px;font-weight:700;font-size:13px;letter-spacing:1px;cursor:pointer;text-decoration:none;display:inline-block;line-height:22px}',
    '.pf-ex-xlinks{border-top:1px solid #2a2a2a;margin-top:14px;padding-top:12px;text-align:center;font-size:13px;color:#8a8271}',
    '.pf-ex-xlinks a{color:#e8b923;font-weight:700;text-decoration:none;margin:0 10px;letter-spacing:0.5px}',
    '.pf-ex-err{background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:14px;font-size:14px;color:#f5ead6;margin:10px 0}',
    '.pf-ex-loading{text-align:center;color:#8a8271;padding:30px 0;font-size:14px;letter-spacing:1px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-ex-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-ex-css'; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function xlinks() {
    return '<div class="pf-ex-xlinks">Translated it? Now ' +
      '<a href="https://www.mtcstw.com/money#pf-stackem">stack two numbers</a> · ' +
      '<a href="https://www.mtcstw.com/economy#pf-receipt">check the receipts</a></div>';
  }

  function wrapText(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function paintShare(j) {
    var W = 1080, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#c1121f'; x.fillRect(0, 0, W, 16);
    var cx = W / 2, y = 110;
    x.textAlign = 'center';
    x.fillStyle = '#e8b923'; x.font = '700 32px Arial,sans-serif';
    x.fillText('YOUR MONEY, EXPLAINED \u00B7 FRED', cx, y); y += 90;
    x.fillStyle = '#f5ead6'; x.font = '900 64px Arial,sans-serif';
    var fl = wrapText(x, (j.figure && j.figure.headline) || '', W - 140);
    for (var i = 0; i < fl.length && i < 3; i++) { x.fillText(fl[i], cx, y); y += 74; }
    y += 30;
    /* takeaway: beat 4, first sentence */
    var b4 = '';
    (j.beats || []).forEach(function (b) { if (b.n === 4) b4 = b.text; });
    b4 = String(b4).split(/\. /)[0] + '.';
    x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
    var tl = wrapText(x, b4, W - 160);
    for (var t2 = 0; t2 < tl.length && t2 < 4; t2++) { x.fillText(tl[t2], cx, y); y += 42; }
    y += 40;
    x.fillStyle = '#8a8271'; x.font = '400 24px Arial,sans-serif';
    var cite = (j.figure && j.figure.citation) || '';
    var cl = wrapText(x, cite, W - 160);
    for (var c2 = 0; c2 < cl.length && c2 < 2; c2++) { x.fillText(cl[c2], cx, y); y += 32; }
    y += 24;
    x.fillStyle = '#8a8271'; x.font = 'italic 400 26px Arial,sans-serif';
    x.fillText('Info, not advice. Data: FRED.', cx, y); y += 90;
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    x.fillText('MTCSTW.COM', cx, y); y += 58;
    x.fillStyle = '#c1121f'; x.font = '900 58px Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', cx, y);
    return cv;
  }

  function shareAsText(j) {
    var txt = ((j.figure && j.figure.headline) || '') + '\n' +
      ((j.figure && j.figure.citation) || '') +
      '\nInfo, not advice. Data: FRED.\nhttps://www.mtcstw.com/economy#pf-explain';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt);
        return 'Figure + source copied — paste it anywhere.';
      }
    } catch (e) {}
    return null;
  }

  function doShare(j, btn) {
    var cv = null;
    try { cv = paintShare(j); } catch (e) { cv = null; }
    if (!cv) {
      var msg = shareAsText(j);
      if (btn) btn.textContent = msg || 'SHARE FAILED — TRY AGAIN';
      return;
    }
    try {
      if (window.PFShare && typeof window.PFShare.shareImage === 'function') {
        window.PFShare.shareImage(cv, 'pf-explainer.png',
          (j.figure && j.figure.headline) || 'Explainer', 'explain',
          { text: ((j.figure && j.figure.headline) || '') + ' https://www.mtcstw.com/economy#pf-explain via The Propaganda Factory',
            link: 'https://www.mtcstw.com/economy#pf-explain' });
        return;
      }
    } catch (e) {}
    try {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = 'pf-explainer.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { try { a.parentNode.removeChild(a); } catch (e2) {} }, 500);
    } catch (e2) {
      var m2 = shareAsText(j);
      if (btn) btn.textContent = m2 || 'SHARE FAILED — TRY AGAIN';
    }
  }

  function cardHtml(j, F, opts) {
    opts = opts || {};
    var fig = j.figure || {};
    var h = '<div class="pf-ex-card">';
    h += '<div class="pf-ex-fig">' + esc(fig.headline || '') +
      (fig.revised ? '<sup class="pf-fred-rev" title="revised observation">ʳ</sup>' : '') + '</div>';
    h += '<div class="pf-ex-vin">' + esc(fig.period_label || '') + ' ' +
      (F ? F.staleBadge({ stale: fig.stale, days_old: fig.days_old, series_id: j.primary_series || j.series_id }) : '') + '</div>';
    /* Disclaimer placement rule: full disclaimer visible without scrolling,
       inside the always-visible beat-1 block. */
    h += '<div class="pf-ex-dis">' + esc(j.disclaimer || '') + '</div>';
    if (j.topic_note) h += '<p class="pf-ex-topicnote">' + esc(j.topic_note) + '</p>';
    (j.beats || []).forEach(function (b) {
      if (b.n === 1) return; /* beat 1 is the figure block above */
      h += '<details class="pf-ex-beat"' + (opts.openAll ? ' open' : '') + '>' +
        '<summary>' + esc(b.title || ('BEAT ' + b.n)) + '</summary>' +
        '<p>' + esc(b.text || '') + '</p></details>';
    });
    if (fig.citation) h += '<div class="pf-fred-cite">' + esc(fig.citation) + '</div>';
    h += '<button type="button" class="pf-ex-share" data-ex-act="share">PUT IT ON THEIR TIMELINE</button>';
    h += '<div class="pf-ex-sharedis">' + esc(j.disclaimer_short || '') + '</div>';
    if (!opts.noFollow) {
      h += '<div class="pf-ex-follow">';
      (j.followups || []).forEach(function (f) {
        h += '<a class="pf-ex-fbtn" href="' + esc(f.href || '#') + '">' + esc(f.label || '') + '</a>';
      });
      h += '</div>';
    }
    h += '</div>';
    if (!opts.noXlinks) h += xlinks();
    return h;
  }

  function mountInto(el, params, opts) {
    opts = opts || {};
    cssOnce();
    var F = window.PFFred;
    if (!F) {
      el.innerHTML = '<div class="pf-ex"><div class="pf-ex-err">The data toolkit isn\u2019t loaded yet — reload the page.</div></div>';
      return;
    }
    el.innerHTML = '<div class="pf-ex"><div class="pf-ex-loading">READING THE NUMBERS…</div></div>';
    F.api('fred_explain', params, function (j) {
      var box = el.querySelector('.pf-ex');
      if (!box) return;
      if (!j || j.ok !== true) {
        box.innerHTML = '<div class="pf-ex-err">' + esc((j && j.note) || 'Couldn\u2019t load this explainer — try another topic.') + '</div>';
        return;
      }
      box.innerHTML = cardHtml(j, F, opts);
      var sb = box.querySelector('[data-ex-act="share"]');
      if (sb) sb.addEventListener('click', function () { doShare(j, sb); });
    });
  }

  /* ---------- full explainer (topic cards + nerd mode) ---------- */
  function mount(el, context) {
    if (!el) return;
    var killId = { money: 'money-explain', economy: 'economy-explain',
      war: 'war-explain', brief: 'brief-explain' }[context || 'economy'] || 'economy-explain';
    if (skip(killId)) return;
    cssOnce();
    var F = window.PFFred;
    var titles = {
      money: ['WHAT\u2019S THIS COSTING YOU?', 'You tell it what\u2019s hitting your wallet; it tells you what the numbers actually say.'],
      economy: ['TRANSLATE THE ECONOMY.', 'The economy in words, not jargon.'],
      war: ['WHAT IT MEANS FOR YOU', 'This week\u2019s number, translated.'],
      brief: ['YOUR MONEY, IN 30 SECONDS.', 'One number, translated.']
    };
    var T = titles[context || 'economy'] || titles.economy;
    var deep = null;
    try {
      var m = /[?&#]series=([A-Z0-9]+)/i.exec(window.location.hash || '');
      if (m && PLAIN[m[1].toUpperCase()]) deep = m[1].toUpperCase();
    } catch (e) {}

    var h = '<div class="pf-ex"><div class="pf-se-kicker pf-ex-kicker">' +
      (context === 'money' ? 'FOLLOW THE MONEY' : context === 'war' ? 'WAR REPORT' : context === 'brief' ? 'MORNING BRIEFING' : 'ECONOMY') + '</div>' +
      '<h2 class="pf-ex-title">' + T[0] + '</h2><p class="pf-ex-sub">' + T[1] + '</p>';
    if (context === 'war' || context === 'brief') {
      /* One explainer, no picker: weekly rotation (war) / daily rotation (brief). */
      h += '<div data-ex-single></div></div>';
      el.innerHTML = h;
      var tk = ROTATE[isoWeek() % ROTATE.length];
      mountInto(el.querySelector('[data-ex-single]'), { topic: tk }, { noXlinks: true });
      return;
    }
    h += '<div class="pf-ex-topics">' + TOPICS.map(function (t, i) {
      return '<button type="button" class="pf-ex-tp' + ((deep && deep === t.key) || (!deep && i === 1) ? '' : '') +
        '" data-ex-topic="' + t.key + '"><b>' + t.label + '</b><span>' + esc(t.sub) + '</span></button>';
    }).join('') + '</div>';
    h += '<button type="button" class="pf-ex-nerd" data-ex-nerd>“I know what I\u2019m looking at” — pick the series directly</button>';
    h += '<div class="pf-ex-chips" data-ex-chips style="display:none">' +
      SERIES12.map(function (s) {
        return '<button type="button" class="pf-ex-chip" data-ex-sid="' + s + '">' + esc(PLAIN[s]) + '</button>';
      }).join('') + '</div>';
    h += '<div data-ex-out></div></div>';
    el.innerHTML = h;

    var out = el.querySelector('[data-ex-out]');
    function pickTopic(key) {
      el.querySelectorAll('[data-ex-topic]').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-ex-topic') === key);
      });
      mountInto(out, { topic: key }, {});
    }
    el.querySelectorAll('[data-ex-topic]').forEach(function (b) {
      b.addEventListener('click', function () {
        el.querySelector('[data-ex-chips]').style.display = 'none';
        pickTopic(b.getAttribute('data-ex-topic'));
      });
    });
    el.querySelector('[data-ex-nerd]').addEventListener('click', function () {
      var c = el.querySelector('[data-ex-chips]');
      c.style.display = c.style.display === 'none' ? '' : 'none';
    });
    el.querySelectorAll('[data-ex-sid]').forEach(function (b) {
      b.addEventListener('click', function () {
        el.querySelectorAll('[data-ex-sid]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        el.querySelectorAll('[data-ex-topic]').forEach(function (x) { x.classList.remove('on'); });
        mountInto(out, { series_id: b.getAttribute('data-ex-sid') }, {});
      });
    });
    /* Default: groceries topic, or the deep-linked series. */
    if (deep) {
      el.querySelector('[data-ex-chips]').style.display = '';
      var chip = el.querySelector('[data-ex-sid="' + deep + '"]');
      if (chip) chip.classList.add('on');
      mountInto(out, { series_id: deep }, {});
    } else {
      pickTopic('groceries');
    }
  }

  /* Self-mount: Economy page (secondary), War Report (weekly), Briefing. */
  function selfMount() {
    try {
      var eco = document.getElementById('pf-economy');
      if (eco && !document.getElementById('pf-explain') && !skip('economy-explain')) {
        var e = document.createElement('div');
        e.id = 'pf-explain';
        var rail = eco.querySelector('#pf-fred-rail') || document.getElementById('pf-inflation-trends');
        if (rail && rail.parentNode) rail.parentNode.insertBefore(e, rail.nextSibling);
        else eco.appendChild(e);
        mount(e, 'economy');
      }
      var wr = document.getElementById('xWarReport');
      if (wr && !document.getElementById('pf-war-explain') && !skip('war-explain')) {
        var w = document.createElement('div');
        w.id = 'pf-war-explain';
        wr.appendChild(w);
        mount(w, 'war');
      }
      var br = document.getElementById('xBrief');
      if (br && !document.getElementById('pf-brief-explain') && !skip('brief-explain')) {
        var b = document.createElement('div');
        b.id = 'pf-brief-explain';
        var fbrief = document.getElementById('pf-fred-briefing');
        if (fbrief && fbrief.parentNode) fbrief.parentNode.insertBefore(b, fbrief.nextSibling);
        else br.appendChild(b);
        mount(b, 'brief');
      }
    } catch (e) {}
  }

  try {
    window.PFExplain = { mount: mount };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', selfMount);
    } else { selfMount(); }
  } catch (e) {}
})();
