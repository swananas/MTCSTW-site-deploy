/* pages/slr-catalog.js  |  PF v1.4.2 | SLR catalog page renderer.
   Renders any member's full catalog page from the master database
   (core/07-slr-db.js): photo, propaganda score, bio, what-they-offer,
   follow links, key strengths, related creators.
   Mounts on #pf-catalog[data-slug], or auto-detects the member slug from the
   URL path and takes over the page — hiding the old Squarespace-built content
   ONLY after the DB loads and the slug resolves. On DB failure or unknown
   slug it does nothing: the existing page stays up.
   KILL: ?pf_off=slr-catalog  or  localStorage pf_disabled_v1='["slr-catalog"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('slr-catalog')) { return; }
  if (!PF.slrReady) { PF.error('slr-catalog', 'slr-db not loaded'); return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function initials(name) {
    var w = String(name || '?').split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase();
  }
  function para(text) {
    return String(text || '').split(/\n+/).filter(function (p) { return p.trim(); })
      .map(function (p) { return '<p style="color:' + CREAM + ';line-height:1.65;font-size:1rem;margin:0 0 1rem;">' + esc(p.trim()) + '</p>'; })
      .join('');
  }

  function render(root, m, all) {
    var img = m.picture
      ? '<img src="' + esc(m.picture) + '" alt="' + esc(m.image_alt || (m.name + ', SLR propagandist')) + '" style="width:100%;max-width:520px;height:auto;display:block;margin:0 auto;border:3px solid ' + RED + ';">'
      : '<div style="width:100%;max-width:520px;margin:0 auto;height:300px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;border:3px solid ' + RED + ';">'
        + '<span style="font-size:4.5rem;font-weight:900;color:' + RED + ';">' + esc(initials(m.name)) + '</span></div>';

    var handles = m.handles || {};
    var handleBits = [];
    ['tiktok', 'instagram', 'youtube', 'x'].forEach(function (p) { if (handles[p]) handleBits.push(handles[p]); });
    if (!handleBits.length && handles.primary) handleBits.push(handles.primary);

    var offer = (m.offer || []).map(function (o) {
      return '<li style="color:' + CREAM + ';margin:0 0 0.6rem;line-height:1.55;">' + esc(o) + '</li>';
    }).join('');
    var strengths = (m.key_strengths || []).map(function (s) {
      return '<li style="color:' + CREAM + ';margin:0 0 0.6rem;line-height:1.55;">' + esc(s) + '</li>';
    }).join('');
    var links = (m.links || []).map(function (l) {
      return '<li style="margin:0 0 0.5rem;"><a href="' + esc(l.url) + '" target="_blank" rel="noopener" style="color:' + RED + ';font-weight:700;text-decoration:none;border-bottom:2px solid ' + RED + ';">' + esc(l.platform) + '</a></li>';
    }).join('');

    /* 3 related creators: nearest scores, deterministic-ish pick */
    var others = all.filter(function (x) { return x.slug !== m.slug; });
    others.sort(function (a, b) { return Math.abs(a.propaganda_score - m.propaganda_score) - Math.abs(b.propaganda_score - m.propaganda_score); });
    var related = others.slice(0, 3).map(function (x) {
      return '<div><a href="' + esc(x.catalog_path) + '" style="color:' + CREAM + ';text-decoration:none;font-weight:700;">• ' + esc(x.name) + '</a>'
        + ' <span style="color:' + MUTED + ';font-size:0.85rem;">— ' + x.propaganda_score.toFixed(1) + '/10</span></div>';
    }).join('');

    root.innerHTML =
      '<div style="background:' + BLACK + ';padding:2.5rem 1rem 3rem;box-sizing:border-box;">'
      + '<div style="max-width:720px;margin:0 auto;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      + '<div style="text-align:center;margin-bottom:0.5rem;"><a href="/sick-left-radicals" style="color:' + MUTED + ';font-size:0.8rem;letter-spacing:0.2em;text-decoration:none;">← ALL SICK LEFT RADICALS</a></div>'
      + img
      + '<h1 style="text-align:center;color:' + CREAM + ';font-size:2rem;font-weight:900;margin:1.4rem 0 0.2rem;">' + esc(m.name) + '</h1>'
      + (handleBits.length ? '<div style="text-align:center;color:' + MUTED + ';font-size:0.9rem;margin-bottom:0.6rem;">' + esc(handleBits.join(' · ')) + '</div>' : '')
      + '<div data-eff-score="' + esc(m.slug) + '" style="text-align:center;margin-bottom:0.4rem;font-size:1.05rem;color:' + CREAM + ';">Propaganda Score: <strong style="color:' + RED + ';">' + m.propaganda_score.toFixed(1) + '/10</strong>'
      + (m.score_provisional ? ' <span style="font-size:0.7rem;color:' + MUTED + ';">(provisional)</span>' : '') + '</div>'
      + '<div style="text-align:center;margin-bottom:1.6rem;font-size:1.1rem;"><strong style="color:' + RED + ';">' + esc(m.followers_display) + '</strong> <span style="color:' + MUTED + ';font-size:0.85rem;letter-spacing:0.1em;">FOLLOWERS</span></div>'
      + para(m.bio)
      + (offer ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">What they offer</h2><ul style="padding-left:1.2rem;margin:0;">' + offer + '</ul>' : '')
      + (links ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">Find them here</h2><ul style="list-style:none;padding:0;margin:0;">' + links + '</ul>' : '')
      + (strengths ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">Key strengths</h2><ul style="padding-left:1.2rem;margin:0;">' + strengths + '</ul>' : '')
      + '<div style="text-align:center;margin-top:2.5rem;"><a href="/creator-onboard" style="color:' + RED + ';font-weight:900;letter-spacing:0.12em;text-decoration:none;border-bottom:2px solid ' + RED + ';">WANT IN? JOIN THE SICK LEFT RADICALS →</a></div>'
      + fundBlock(m, RED, CREAM, MUTED)
      + (related ? '<h2 style="color:' + MUTED + ';font-size:1rem;font-weight:700;letter-spacing:0.1em;margin:2.5rem 0 0.8rem;">RELATED CREATORS</h2><div style="display:flex;flex-direction:column;gap:0.5rem;">' + related + '</div>' : '')
      + rouletteBlock(m, all)
      + '</div></div>';
  }

  /* S7 FUND THEIR FIGHT (2026-10-04): after the enlist links — one click
     from admiration to money. /war-chest?creator=<slug> preloads this
     creator in the subscribe UI; /create?for=<slug> filters the bounty
     board to their open bounties. Skipped for Jeanine Pirreaux Comedy
     (do-not-touch). */
  var FUND_SKIP_SLUGS = ['jeanine-pirreaux-comedy'];
  function fundBlock(m, red, cream, muted) {
    if (!m || !m.slug || FUND_SKIP_SLUGS.indexOf(m.slug) !== -1) return '';
    var slug = encodeURIComponent(m.slug);
    return '<div style="margin:2rem auto 0;max-width:560px;background:#140808;border:2px solid ' + red + ';'
      + 'padding:1.4rem 1rem;text-align:center;box-sizing:border-box;">'
      + '<div style="color:' + red + ';font-weight:900;letter-spacing:0.28em;font-size:0.72rem;margin-bottom:0.6rem;">FUND THEIR FIGHT</div>'
      + '<div style="color:' + cream + ';font-size:0.95rem;line-height:1.6;margin-bottom:1rem;">Back ' + esc(m.name)
      + ' directly \u2014 tip XP or subscribe weekly. No platform takes a cut.</div>'
      + '<div><a href="/war-chest?creator=' + slug + '" style="display:inline-block;background:' + red + ';color:#fff;'
      + 'font-weight:900;letter-spacing:0.12em;font-size:0.85rem;text-decoration:none;padding:0.8rem 1.6rem;'
      + 'border:2px solid ' + red + ';">FUND THEIR FIGHT \u2192</a></div>'
      + '<div style="margin-top:0.8rem;"><a href="/create?for=' + slug + '" style="color:' + muted + ';'
      + 'font-size:0.8rem;letter-spacing:0.08em;text-decoration:none;border-bottom:1px solid ' + muted + ';">'
      + 'or fill one of their open bounties \u2192</a></div>'
      + '</div>';
  }

  /* A5 ROSTER ROULETTE (2026-10-04): "NEXT FIGHTER →" weighted-random deep
     link to another creator, closing every catalog page's dead end.
     Weight = followers_total (bigger reach surfaces slightly more often,
     but every creator stays in the pool). Excludes the current page and
     Jeanine Pirreaux Comedy (do-not-touch). Never invents creators — the
     pick always comes from the master DB. Pure routing: zero XP. */
  var ROULETTE_SKIP_SLUGS = ['jeanine-pirreaux-comedy'];
  function pickNextFighter(m, all) {
    var pool = (all || []).filter(function (x) {
      return x && x.slug && x.slug !== m.slug && x.catalog_path &&
        ROULETTE_SKIP_SLUGS.indexOf(x.slug) === -1 && (x.followers_total || 0) > 0;
    });
    if (!pool.length) return null;
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].followers_total || 1);
    var r = Math.random() * total, acc = 0;
    for (i = 0; i < pool.length; i++) {
      acc += (pool[i].followers_total || 1);
      if (r <= acc) return pool[i];
    }
    return pool[pool.length - 1];
  }
  function rouletteBlock(m, all) {
    /* Host-page guard: the block never renders on Jeanine Pirreaux Comedy's
       page (do-not-touch) — the scout-circuit note below still tracks the
       visit for the SCOUT medal, but no roulette UI is injected. */
    if (!m || !m.slug || ROULETTE_SKIP_SLUGS.indexOf(m.slug) !== -1) return '';
    var next = pickNextFighter(m, all);
    if (!next) return '';
    return '<div style="margin:2.5rem auto 0;max-width:560px;background:#0d0d0d;border:2px dashed ' + RED + ';'
      + 'padding:1.6rem 1rem;text-align:center;box-sizing:border-box;">'
      + '<div style="color:' + MUTED + ';font-weight:700;letter-spacing:0.3em;font-size:0.7rem;margin-bottom:0.5rem;">ROSTER ROULETTE</div>'
      + '<div style="color:' + CREAM + ';font-size:1rem;margin-bottom:0.3rem;">The network is bigger than one fighter.</div>'
      + '<div style="color:' + MUTED + ';font-size:0.85rem;margin-bottom:1rem;">Next up: <strong style="color:' + CREAM + ';">' + esc(next.name) + '</strong>'
      + (next.followers_display ? ' · ' + esc(next.followers_display) + ' followers' : '') + '</div>'
      + '<a href="' + esc(next.catalog_path) + '" style="display:inline-block;background:' + RED + ';color:#fff;'
      + 'font-weight:900;letter-spacing:0.12em;font-size:0.9rem;text-decoration:none;padding:0.9rem 2rem;">NEXT FIGHTER \u2192</a>'
      + '<div style="margin-top:0.7rem;color:' + MUTED + ';font-size:0.75rem;letter-spacing:0.08em;">6 catalog visits in a week earns the SCOUT medal</div>'
      + '</div>';
  }

  /* A5 SCOUT CIRCUIT tracking (2026-10-04): unique catalog slugs viewed
     this Chicago week, device-local (pf_scout_v1: {w, slugs[], claimed}).
     The claim itself is validated server-side (scout_claim checks each
     slug against this week's pageview beacon). */
  function chiMondayKey() {
    var d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    var dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function scoutTrack(slug) {
    try {
      var wk = chiMondayKey(), s = null;
      try { s = JSON.parse(localStorage.getItem('pf_scout_v1') || 'null'); } catch (e) {}
      if (!s || s.w !== wk) s = { w: wk, slugs: [], claimed: false };
      if (s.slugs.indexOf(slug) === -1) {
        s.slugs.push(slug);
        try { localStorage.setItem('pf_scout_v1', JSON.stringify(s)); } catch (e2) {}
        try { document.dispatchEvent(new CustomEvent('pf-scout-progress', { detail: { count: s.slugs.length, week: wk } })); } catch (e3) {}
      }
    } catch (e4) {}
  }

  function takeoverMount() {
    var page = document.querySelector('main#page') || document.getElementById('page');
    var root = document.createElement('div');
    root.id = 'pf-catalog-root';
    if (page && page.parentNode) {
      page.parentNode.insertBefore(root, page);
      page.style.display = 'none';
    } else {
      document.body.insertBefore(root, document.body.firstChild);
    }
    return root;
  }

  function boot() {
    var el = document.getElementById('pf-catalog');
    var slug = el && el.getAttribute('data-slug');
    if (!slug) {
      var m = location.pathname.replace(/^\/|\/$/g, '');
      if (m && m.indexOf('/') === -1) slug = decodeURIComponent(m);
    }
    if (!slug) return; /* not a catalog page */
    PF.slrReady.then(function (members) {
      if (!members || !members.length) return; /* DB failed: leave page alone */
      var member = null;
      for (var i = 0; i < members.length; i++) {
        if (members[i].slug === slug) { member = members[i]; break; }
      }
      if (!member) return; /* unknown slug: not our page, leave it alone */
      var root = el || takeoverMount();
      render(root, member, members);
      PF.log('slr-catalog', 'rendered ' + slug);
      /* A5 SCOUT CIRCUIT: record this catalog view for the weekly circuit. */
      try { scoutTrack(slug); } catch (eS) {}
      /* Efficiency Index: site-pull beacon (one ping per slug per session) +
         paint the live computed score into the [data-eff-score] slot.
         P0: pageview is POST-only — use fetch, not image beacon. */
      try {
        var pvDone = window.__pfPvDone || (window.__pfPvDone = {});
        if (!pvDone[slug]) {
          pvDone[slug] = 1;
          var api = (window.PF_BACKEND_URL || 'https://pf-api.mtcstw.workers.dev');
          try {
            fetch(api, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({type: 'stats', s_action: 'pageview', slug: slug})
            }).catch(function(){});
          } catch (e3) {}
        }
        if (window.PF && PF.efficiency) PF.efficiency.paintScores(root);
        else document.addEventListener('pf-efficiency', function h() {
          document.removeEventListener('pf-efficiency', h);
          if (window.PF && PF.efficiency) PF.efficiency.paintScores(root);
        });
      } catch (e2) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
