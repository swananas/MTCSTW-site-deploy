/* pages/bundle-extraction.js | PF v1.4.3 | THE EXTRACTION ENGINE (Data Product 3)
   Auto-generated, fully-sourced stories of corporate extraction.
   Squarespace page /extraction carries <div id="pf-extraction"></div>
   (CEO hand-step: create the page + Code block).
   Modes:  ?c=<slug>  -> company profile
           (default)  -> card feed, newest first, lazy-loaded
   Generate mode lives on the feed: "LOOK UP ANY COMPANY" runs
   extraction_generate on demand.
   ZERO XP for viewing — this silo never touches XP mechanics.
   Design: clean card feed, light. Headline numbers first; timeline and
   details expand on tap. Every profile links to its natural neighbors
   (/receipt, /town, /index) — the sticky web, not the maze.
   Kill: ?pf_off=extraction or localStorage pf_disabled_v1='["extraction"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfExtractionDone) return;
  if (PF && PF.skip('extraction')) return;
  var host = document.getElementById('pf-extraction');
  if (!host) return;
  if (isEditor()) return;
  window.pfExtractionDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      return !!(b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing')));
    } catch (e) { return false; }
  }
  function err(m, e) { try { PF && PF.error('extraction', m + ' :: ' + (e && e.message || e)); } catch (x) {} }

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

  /* ---------- backend (JSONP, public reads, same rail contract) ---------- */
  var BACKEND = null;
  try { BACKEND = window.PF_BACKEND_URL; } catch (e) {}
  function get(action, params, cb) {
    var done = false;
    function fin(d) { if (!done) { done = true; try { cb(d); } catch (e) { err('cb', e); } } }
    if (!BACKEND) { fin(null); return; }
    var name = 'pfExCb' + Math.floor(Math.random() * 1e9);
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

  /* ---------- shared CSS (mobile-first, light cards) ---------- */
  var CSS =
    '.pf-ex{font-family:Arial,Helvetica,sans-serif;color:#f5ead6;max-width:760px;margin:0 auto}' +
    '.pf-ex-head{text-align:center;margin:6px 0 14px}' +
    '.pf-ex-kick{font:700 11px Arial;letter-spacing:3px;color:#c1121f;text-transform:uppercase}' +
    '.pf-ex-title{font:900 26px "Arial Black",Arial,sans-serif;color:#fff;margin:4px 0}' +
    '.pf-ex-sub{font-size:13px;color:#c9bfa8}' +
    '.pf-ex-card{background:#141414;border:1px solid #2a2a2a;border-left:4px solid #c1121f;' +
    'border-radius:8px;padding:14px;margin:0 0 12px}' +
    '.pf-ex-co{font:900 18px "Arial Black",Arial,sans-serif;color:#fff;margin:0 0 8px}' +
    '.pf-ex-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}' +
    '.pf-ex-num{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:6px;padding:8px 4px;text-align:center}' +
    '.pf-ex-fig{font:900 17px Arial,sans-serif;color:#fff}' +
    '.pf-ex-lab{font-size:10px;letter-spacing:1px;color:#c9bfa8;text-transform:uppercase;margin-top:3px}' +
    '.pf-ex-src{font-size:11px;color:#8f8672;margin-top:8px;line-height:1.4}' +
    '.pf-ex-link{display:inline-block;margin-top:8px;color:#c1121f;font:700 13px Arial;text-decoration:none;letter-spacing:1px}' +
    '.pf-ex-link:hover{text-decoration:underline}' +
    '.pf-ex-story{font-size:15px;line-height:1.55;color:#f5ead6;background:#1a0505;' +
    'border:1px solid #c1121f;border-radius:8px;padding:14px;margin:12px 0}' +
    '.pf-ex details{background:#101010;border:1px solid #2a2a2a;border-radius:8px;margin:0 0 10px}' +
    '.pf-ex summary{cursor:pointer;padding:12px 14px;font:700 13px Arial;letter-spacing:2px;color:#f5ead6;list-style:none}' +
    '.pf-ex summary::-webkit-details-marker{display:none}' +
    '.pf-ex summary:before{content:"▸ ";color:#c1121f}' +
    '.pf-ex details[open] summary:before{content:"▾ ";color:#c1121f}' +
    '.pf-ex .ex-body{padding:0 14px 14px;font-size:13px;line-height:1.5;color:#d8cfb8}' +
    '.pf-ex table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}' +
    '.pf-ex th{color:#c1121f;text-align:left;font-size:10px;letter-spacing:1px;padding:4px}' +
    '.pf-ex td{padding:4px;border-top:1px solid #222;color:#f5ead6}' +
    '.pf-ex .ex-badge{display:inline-block;font:700 10px Arial;letter-spacing:1px;padding:2px 7px;border-radius:10px;margin-left:6px}' +
    '.pf-ex .ex-v{background:#0d3b1e;color:#7ee2a0}.pf-ex .ex-u{background:#3b2a0d;color:#f0c060}' +
    '.pf-ex .ex-stale{color:#f0c060;font-size:11px}' +
    '.pf-ex .ex-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}' +
    '.pf-ex .ex-chip{background:#1a0505;border:1px solid #c1121f;color:#f5ead6;border-radius:16px;' +
    'padding:7px 14px;font:700 12px Arial;text-decoration:none}' +
    '.pf-ex .ex-web{background:#0d0d0d;border:1px dashed #c1121f;border-radius:8px;padding:12px 14px;margin:12px 0}' +
    '.pf-ex .ex-web h4{margin:0 0 6px;font:700 12px Arial;letter-spacing:2px;color:#c1121f}' +
    '.pf-ex .ex-gen{background:#101010;border:1px solid #2a2a2a;border-radius:8px;padding:14px;margin:0 0 14px}' +
    '.pf-ex .ex-gen input{width:100%;box-sizing:border-box;background:#0d0d0d;border:1px solid #444;color:#fff;' +
    'border-radius:6px;padding:11px;font-size:15px;margin:8px 0}' +
    '.pf-ex .ex-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;font:900 14px Arial;' +
    'letter-spacing:2px;padding:12px 22px;cursor:pointer;width:100%}' +
    '.pf-ex .ex-btn:disabled{opacity:.5}' +
    '.pf-ex .ex-btn2{background:#1a0505;color:#f5ead6;border:1px solid #c1121f;border-radius:6px;' +
    'font:700 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer;margin-top:10px}' +
    '.pf-ex .ex-note{font-size:12px;color:#8f8672;line-height:1.5;margin:8px 0}' +
    '.pf-ex .ex-confbar{height:6px;background:#2a2a2a;border-radius:3px;margin-top:4px;overflow:hidden}' +
    '.pf-ex .ex-confbar i{display:block;height:100%;background:#c1121f}' +
    '.pf-ex .ex-sentinel{height:2px}' +
    '.pf-ex .ex-load{text-align:center;color:#8f8672;font-size:13px;padding:14px}' +
    /* Flow 3 (cross-data): the movement feed — cross-rail cards. */
    '.pf-ex .ex-mv{margin:0 0 16px}' +
    '.pf-ex .ex-mv-rail{font:900 12px Arial;letter-spacing:3px;color:#e8b923;margin:14px 0 8px}' +
    '.pf-ex .ex-mv-card{display:block;background:#101010;border:1px solid #2a2a2a;border-left:4px solid #e8b923;' +
    'border-radius:8px;padding:12px 14px;margin:0 0 10px;text-decoration:none;color:#f5ead6}' +
    '.pf-ex .ex-mv-card:active{transform:scale(.99)}' +
    '.pf-ex .ex-mv-t{font:900 16px Arial,sans-serif;color:#fff;margin:0 0 4px}' +
    '.pf-ex .ex-mv-h{font:700 13px Arial;color:#e8b923;margin:0 0 2px}' +
    '.pf-ex .ex-mv-s{font-size:12px;color:#c9bfa8;line-height:1.45}' +
    '.pf-ex .ex-mv-src{font-size:10px;color:#8f8672;margin-top:6px}' +
    '.pf-ex .ex-mv-go{font:700 12px Arial;color:#c1121f;letter-spacing:1px;margin-top:6px}';

  function staleBadge(p) {
    if (!p || !p.live || !p.matched || p.days_old == null) return '';
    if (!p.stale) return '';
    return ' <span class="ex-stale">⚠ ' + fmtInt(p.days_old) + ' days old</span>';
  }

  /* ---------- headline numbers block (cards + profile share one) ---------- */
  function headlineNums(h) {
    function cell(fig, lab) {
      return '<div class="pf-ex-num"><div class="pf-ex-fig">' + fig + '</div><div class="pf-ex-lab">' + lab + '</div></div>';
    }
    return '<div class="pf-ex-nums">' +
      cell(h.contracts_usd != null ? fmtUsd(h.contracts_usd) : '—', 'Federal awards') +
      cell(h.osha_violations != null ? fmtInt(h.osha_violations) : '—', 'OSHA violations') +
      cell(h.wagetheft_usd != null ? fmtUsd(h.wagetheft_usd) : '—', 'Wage-theft back pay') +
      '</div>';
  }
  function sourceLine(h) {
    var bits = [];
    if (h.contracts_citation) bits.push(h.contracts_citation);
    if (h.osha_citation) bits.push(h.osha_citation);
    if (h.wagetheft_citation) bits.push(h.wagetheft_citation);
    return bits.length ? bits.join('<br>') : 'No sourced figures on file yet.';
  }

  /* ---------- feed card ---------- */
  function cardHTML(item) {
    var h = item.headlines || {};
    return '<div class="pf-ex-card">' +
      '<div class="pf-ex-kick">The Extraction Engine</div>' +
      '<h3 class="pf-ex-co">' + esc(item.company) + '</h3>' +
      headlineNums(h) +
      '<div class="pf-ex-src">' + sourceLine(h) + '</div>' +
      '<a class="pf-ex-link" href="' + esc(item.profile_url || ('/extraction?c=' + encodeURIComponent(item.slug))) + '">FULL DOSSIER →</a>' +
      '</div>';
  }

  /* ---------- Flow 3 (cross-data): THE MOVEMENT FEED ----------
     The extraction feed becomes the movement's front page: cross-rail
     cards (Receipt dossiers, town reports, Index entities) above the
     company ledger. Each card links back to its source page. Empty rails
     render nothing — honest-empty lives in the backend sections. */
  var MV_RAILS = [
    ['receipts', 'HOT RECEIPTS'],
    ['towns', 'TOWN REPORTS'],
    ['index', 'MOST CAPTURED']
  ];
  function mvCardHTML(c) {
    var go = c.rail === 'receipt' ? 'GET THE RECEIPT →'
      : c.rail === 'town' ? 'READ THE REPORT →'
      : c.rail === 'index' ? (c.kind === 'company' ? 'EXTRACTION FILE →' : 'GET THE RECEIPT →')
      : 'OPEN →';
    return '<a class="ex-mv-card" href="' + esc(c.url || '#') + '">' +
      '<div class="ex-mv-t">' + esc(c.title || '') + '</div>' +
      (c.headline ? '<div class="ex-mv-h">' + esc(c.headline) + '</div>' : '') +
      (c.sub ? '<div class="ex-mv-s">' + esc(c.sub) + '</div>' : '') +
      (c.source ? '<div class="ex-mv-src">SOURCE: ' + esc(c.source) + '</div>' : '') +
      '<div class="ex-mv-go">' + go + '</div></a>';
  }
  function loadMovement() {
    var mv = document.getElementById('exMovement');
    if (!mv) return;
    get('movement_feed', { limit: 4 }, function (d) {
      if (!d || !d.ok || !d.sections) return;
      var html = '', any = false;
      MV_RAILS.forEach(function (r) {
        var sec = d.sections[r[0]];
        if (!sec || sec.status !== 'live' || !(sec.cards || []).length) return;
        any = true;
        html += '<div class="ex-mv-rail">' + r[1] + '</div>';
        sec.cards.forEach(function (c) { html += mvCardHTML(c); });
      });
      if (!any) {
        html = '<div class="ex-note" style="text-align:center">The movement feed is warming up — ' +
          'cross-rail highlights appear here as the rails land.</div>';
      } else {
        html = '<div class="ex-mv-rail" style="color:#c1121f">ACROSS THE MACHINE</div>' + html;
      }
      mv.innerHTML = '<div class="ex-mv">' + html + '</div>';
    });
  }

  /* ---------- feed ---------- */
  var feedState = { offset: 0, loading: false, done: false, listEl: null, sentEl: null };
  function renderFeed() {
    host.innerHTML =
      '<div class="pf-ex"><div class="pf-ex-head">' +
      '<div class="pf-ex-kick">Data Product 3</div>' +
      '<div class="pf-ex-title">THE EXTRACTION ENGINE</div>' +
      '<div class="pf-ex-sub">Who got paid. What they did. Who got hurt. Every number sourced.</div>' +
      '</div>' +
      '<div class="pf-ex-gen"><div class="pf-ex-kick">Generate mode</div>' +
      '<div class="pf-ex-sub" style="margin:4px 0">Look up any company — the engine assembles its profile on demand.</div>' +
      '<input id="exGenQ" type="text" placeholder="Company name…" autocomplete="off">' +
      '<button class="ex-btn" id="exGenGo">RUN THE ENGINE</button>' +
      '<div id="exGenOut"></div></div>' +
      '<div id="exMovement"></div>' +
      '<div id="exFeedList"></div>' +
      '<div class="ex-sentinel" id="exSentinel"></div>' +
      '<div class="ex-load" id="exFeedMsg">Loading the ledger…</div></div>';
    feedState.listEl = document.getElementById('exFeedList');
    feedState.sentEl = document.getElementById('exSentinel');
    var go = document.getElementById('exGenGo');
    go.addEventListener('click', runGenerate);
    document.getElementById('exGenQ').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runGenerate();
    });
    loadFeedPage();
    loadMovement(); /* Flow 3: cross-rail movement feed above the ledger. */
    try {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) loadFeedPage();
      }, { rootMargin: '600px' });
      io.observe(feedState.sentEl);
    } catch (e) { /* no IO: feed still loads first page; scroll note */ }
  }
  function loadFeedPage() {
    if (feedState.loading || feedState.done) return;
    feedState.loading = true;
    get('extraction_feed', { limit: 12, offset: feedState.offset }, function (d) {
      feedState.loading = false;
      var msg = document.getElementById('exFeedMsg');
      if (!d || !d.ok) {
        if (msg) msg.textContent = 'The ledger is unreachable right now — check back.';
        return;
      }
      (d.items || []).forEach(function (it) {
        var div = document.createElement('div');
        div.innerHTML = cardHTML(it);
        feedState.listEl.appendChild(div.firstChild);
      });
      feedState.offset += (d.items || []).length;
      if (!d.has_more || !(d.items || []).length) {
        feedState.done = true;
        if (msg) msg.textContent = d.items && d.items.length || feedState.offset ?
          'End of the ledger — for now.' : 'No companies published yet.';
        if (d.note && !feedState.offset && msg) msg.textContent = d.note;
      }
    });
  }

  /* ---------- generate mode ---------- */
  function runGenerate() {
    var q = document.getElementById('exGenQ');
    var out = document.getElementById('exGenOut');
    var name = q ? q.value.trim() : '';
    if (!name) return;
    out.innerHTML = '<div class="ex-load">Running entity resolution…</div>';
    get('extraction_generate', { company: name }, function (d) {
      if (!d || !d.ok) {
        out.innerHTML = '<div class="ex-note">The engine is unreachable right now — try again.</div>';
        return;
      }
      out.innerHTML = '<div style="margin-top:12px">' + profileHTML(d, true) + '</div>' +
        editorialHTML(d.editorial) + resolutionHTML(d.links);
      wireProfile(out, d);
    });
  }
  function editorialHTML(e) {
    if (!e) return '';
    var cls = e.publishable ? 'ex-v' : (e.blocklisted ? 'ex-u' : 'ex-u');
    return '<div class="ex-note">Editorial: <span class="ex-badge ' + cls + '">' +
      (e.blocklisted ? 'BLOCKLISTED' : e.allowlisted ? 'ALLOWLISTED' : 'NOT ALLOWLISTED') +
      '</span> ' + esc(e.note || '') + '</div>';
  }
  function resolutionHTML(links) {
    if (!links || !links.length)
      return '<div class="ex-note">No rail records matched above the confidence threshold (0.70). ' +
        'Low-confidence links are dropped, never shown.</div>';
    var h = '<div class="ex-note"><b>Entity resolution</b> — each link scored 0–1; below 0.70 is dropped:</div>';
    links.forEach(function (l) {
      h += '<div class="ex-note" style="margin:4px 0"><b>' + esc(l.rail) + '</b>: ' + esc(l.rail_name || l.rail_key) +
        ' <span class="ex-badge ' + (l.verified ? 'ex-v' : 'ex-u') + '">' +
        (l.verified ? 'VERIFIED' : 'UNVERIFIED') + '</span> ' + (Math.round(l.confidence * 100)) + '%' +
        ' <span style="color:#5f5847">(' + esc(l.basis || '') + ')</span>' +
        '<div class="ex-confbar"><i style="width:' + Math.round(l.confidence * 100) + '%"></i></div></div>';
    });
    return h;
  }

  /* ---------- full profile ---------- */
  function profileHTML(d, embedded) {
    var e = d.entity || {}, h = d.headlines || {}, p = d.panels || {}, web = d.web || {};
    var html = '<div class="pf-ex-card">' +
      (embedded ? '' : '<div class="pf-ex-kick">The Extraction Engine</div>') +
      '<h3 class="pf-ex-co">' + esc(e.display_name || 'Unknown company') + '</h3>' +
      headlineNums(h) +
      '<div class="pf-ex-src">' + sourceLine(h) + '</div>' +
      '</div>' +
      '<div class="pf-ex-story">' + esc(d.story || '') + '</div>';
    html += '<details><summary>TIMELINE &amp; DETAILS</summary><div class="ex-body">' + detailsHTML(p) + '</div></details>';
    html += '<details><summary>ENTITY RESOLUTION</summary><div class="ex-body">' + resolutionHTML(d.links) + '</div></details>';
    html += stickyWebHTML(web, p);
    html += '<button class="ex-btn2" data-ex-share="1">SHARE THIS DOSSIER</button>';
    if (!embedded) html += '<div style="margin-top:10px"><a class="pf-ex-link" href="/extraction">← BACK TO THE FEED</a></div>';
    return html;
  }
  function detailsHTML(p) {
    var h = '';
    if (p.osha && p.osha.live && p.osha.matched) {
      h += '<b>OSHA violations by year</b>' + staleBadge(p.osha) +
        '<table><tr><th>Year</th><th>Violations</th></tr>' +
        (p.osha.by_year || []).map(function (r) {
          return '<tr><td>' + esc(r.year) + '</td><td>' + fmtInt(r.violations) + '</td></tr>';
        }).join('') + '</table>' +
        '<div class="ex-note">' + fmtInt(p.osha.serious) + ' serious · ' + fmtInt(p.osha.willful) +
        ' willful · ' + fmtUsd(p.osha.penalties_usd) + ' current penalties. ' +
        esc((p.osha.citation || {}).text || '') + '</div>';
    }
    if (p.wagetheft && p.wagetheft.live && p.wagetheft.matched) {
      h += '<b>Wage-theft back pay by year</b>' + staleBadge(p.wagetheft) +
        '<table><tr><th>Year</th><th>Cases</th><th>Back wages</th></tr>' +
        (p.wagetheft.by_year || []).map(function (r) {
          return '<tr><td>' + esc(r.year) + '</td><td>' + fmtInt(r.cases) + '</td><td>' +
            fmtUsd(r.backwages_usd) + '</td></tr>';
        }).join('') + '</table>';
      var rc = (p.wagetheft.recent || []).slice(0, 5);
      if (rc.length) {
        h += '<b>Recent cases</b><table><tr><th>Employer</th><th>Where</th><th>Back wages</th></tr>' +
          rc.map(function (r) {
            return '<tr><td>' + esc(r.employer || '') + '</td><td>' +
              esc((r.city || '') + (r.state ? ', ' + r.state : '')) + '</td><td>' +
              fmtUsd(r.backwages_usd) + '</td></tr>';
          }).join('') + '</table>';
      }
      h += '<div class="ex-note">' + esc((p.wagetheft.citation || {}).text || '') + '</div>';
    }
    if (p.corporate && p.corporate.live && p.corporate.matched) {
      h += '<b>Corporate structure</b><div class="ex-note">' + esc(p.corporate.name || '') +
        (p.corporate.state ? ' — ' + esc(p.corporate.state) : '') +
        (p.corporate.entity_type ? ' · ' + esc(p.corporate.entity_type) : '') +
        (p.corporate.status ? ' · ' + esc(p.corporate.status) : '') + '<br>' +
        esc((p.corporate.citation || {}).text || '') + '</div>';
    }
    [['donations', 'Political donations'], ['pollution', 'Pollution'], ['financials', 'SEC filings']].forEach(function (pair) {
      var pan = p[pair[0]];
      if (pan && !pan.live) h += '<div class="ex-note"><b>' + pair[1] + ':</b> ' + esc(pan.note || 'not yet tracked') + '</div>';
    });
    return h || '<div class="ex-note">No detailed figures on file yet.</div>';
  }
  /* Sticky web: every profile links to its natural neighbors. */
  function stickyWebHTML(web, p) {
    var h = '<div class="ex-web"><h4>FOLLOW THE MONEY</h4>';
    var any = false;
    if (web.town_links && web.town_links.length) {
      any = true;
      h += '<div class="ex-note" style="margin:0 0 4px">Where they operate:</div><div class="ex-chips">' +
        web.town_links.map(function (t) {
          return '<a class="ex-chip" href="' + esc(t.url) + '">/town · ' + esc(t.state) + ' →</a>';
        }).join('') + '</div>';
    }
    if (web.index_url) {
      any = true;
      h += '<div class="ex-chips"><a class="ex-chip" href="' + esc(web.index_url) + '">Corruption Index score →</a></div>';
    }
    if (p.donations && p.donations.live && web.receipt_links && web.receipt_links.length) {
      any = true;
      h += '<div class="ex-note" style="margin:0 0 4px">They gave to:</div><div class="ex-chips">' +
        web.receipt_links.map(function (r) {
          return '<a class="ex-chip" href="' + esc(r.url) + '">/receipt · ' + esc(r.name) + ' →</a>';
        }).join('') + '</div>';
    } else {
      h += '<div class="ex-note">Donation-recipient links appear here once the FEC employer-donation rail lands — ' +
        'each recipient opens their /receipt dossier.</div>';
    }
    if (!any) h += '<div class="ex-note">No neighbor links yet.</div>';
    h += '</div>';
    return h;
  }

  function renderProfile(slug) {
    host.innerHTML = '<div class="pf-ex"><div class="ex-load">Assembling the dossier…</div></div>';
    get('extraction_profile', { company: slug }, function (d) {
      if (!d || !d.ok) {
        host.innerHTML = '<div class="pf-ex"><div class="ex-load">Dossier unavailable right now.</div>' +
          '<a class="pf-ex-link" href="/extraction">← Back to the feed</a></div>';
        return;
      }
      host.innerHTML = '<div class="pf-ex">' + profileHTML(d, false) + '</div>';
      wireProfile(host, d);
    });
  }

  /* ---------- share image: 1080x1350 per-company extraction card ---------- */
  function wrap(x, text, maxW) {
    var words = String(text || '').split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t2 = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t2).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = t2;
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintPoster(d) {
    var cv, x;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = 1080; cv.height = 1350;
    try { x = cv.getContext('2d'); } catch (e2) { return null; }
    if (!x) return null;
    var e = d.entity || {}, h = d.headlines || {};
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, 1048, 1318);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, 976, 1246);
    x.textAlign = 'center';
    var y = 170;
    x.fillStyle = '#c1121f'; x.font = '700 34px Arial,sans-serif';
    x.fillText('★ THE EXTRACTION ENGINE ★', 540, y); y += 100;
    x.fillStyle = '#ffffff'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    var nl = wrap(x, (e.display_name || 'UNKNOWN').toUpperCase(), 900);
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
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    var sl = wrap(x, 'Every number sourced. mtcstw.com' + (d.web && d.web.profile_url ? d.web.profile_url : '/extraction'), 900);
    for (var s2 = 0; s2 < Math.min(sl.length, 2); s2++) { x.fillText(sl[s2], 540, y); y += 44; }
    /* share-image CTA standard: JOIN THE FIGHT. above/below MTCSTW.COM */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', 540, 1350 - 168);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1350 - 108);
    return cv;
  }
  function shareProfile(d) {
    var cv = paintPoster(d);
    if (!cv) return;
    var e = d.entity || {};
    var title = 'Extraction: ' + (e.display_name || 'company');
    function download() {
      try {
        var a = document.createElement('a');
        a.download = 'extraction-' + (e.slug || 'company') + '.png';
        a.href = cv.toDataURL('image/png');
        document.body.appendChild(a); a.click();
        setTimeout(function () { a.parentNode && a.parentNode.removeChild(a); }, 500);
      } catch (ex) { err('download', ex); }
    }
    try {
      if (navigator.share) {
        cv.toBlob(function (blob) {
          if (!blob) { download(); return; }
          var file = new File([blob], 'extraction-' + (e.slug || 'company') + '.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: title,
              text: (e.display_name || '') + ' — every number sourced. mtcstw.com/extraction' })
              .catch(function () { download(); });
          } else download();
        }, 'image/png');
      } else download();
    } catch (ex) { download(); }
  }
  function wireProfile(root, d) {
    var btns = root.querySelectorAll ? root.querySelectorAll('[data-ex-share]') : [];
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.addEventListener('click', function () { shareProfile(d); });
      })(btns[i]);
    }
  }

  /* ---------- boot ---------- */
  try {
    var css = document.createElement('style');
    css.textContent = CSS;
    (document.head || document.documentElement).appendChild(css);
    var qs = {};
    try {
      (location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) qs[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    } catch (e) {}
    if (qs.c) renderProfile(qs.c);
    else renderFeed();
  } catch (e) { err('boot', e); }
})();
