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
  /* R3 (2026-10-04): no vote chip for Jeanine Pirreaux Comedy (do-not-touch).
     FUND_SKIP_SLUGS-style exclusion on the vote CTA. */
  var VOTE_SKIP_SLUGS = ['jeanine-pirreaux-comedy'];

  /* A5 (2026-10-05): ROSTER ROULETTE — NEXT FIGHTER. Jumps to a random
     DIFFERENT creator's catalog page, drawn from the real roster data (no
     invented entries). Jeanine Pirreaux Comedy is do-not-touch: excluded
     from the rotation entirely — the link never lands on her. */
  var ROULETTE_SKIP_SLUGS = ['jeanine-pirreaux-comedy'];
  function nextFighter(m, all) {
    var pool = (all || []).filter(function (x) {
      return x && x.slug && x.catalog_path && x.slug !== m.slug &&
             ROULETTE_SKIP_SLUGS.indexOf(x.slug) === -1;
    });
    if (!pool.length) return '';
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return '<div style="text-align:center;margin:2.4rem 0 0.6rem;">'
      + '<a href="' + esc(pick.catalog_path) + '" style="display:inline-block;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:0.14em;font-size:1rem;text-decoration:none;padding:0.9rem 2.4rem;">NEXT FIGHTER &rarr;</a>'
      + '<div style="color:' + MUTED + ';font-size:0.78rem;letter-spacing:0.06em;margin-top:0.6rem;">THE ROSTER ROULETTE &mdash; A RANDOM FIGHTER, EVERY SPIN</div></div>';
  }

  /* A5 (2026-10-05): SCOUT CIRCUIT — distinct creator catalog views,
     persistent across sessions. 6 distinct slugs fires pf-scout-earned;
     service-medals.js awards the SCOUT medal as a non-weekly achievement
     (it never counts toward FULL DEPLOYMENT). Jeanine is do-not-touch:
     excluded from the view count. */
  function trackScoutView(slug) {
    if (!slug || ROULETTE_SKIP_SLUGS.indexOf(slug) !== -1) return;
    var SK = 'pf_scout_views_v1', AK = 'pf_scout_awarded_v1', seen = {};
    try {
      (JSON.parse(localStorage.getItem(SK) || '[]') || []).forEach(function (s2) { seen[String(s2)] = 1; });
    } catch (e) {}
    if (seen[slug]) return;
    seen[slug] = 1;
    var arr = Object.keys(seen);
    try { localStorage.setItem(SK, JSON.stringify(arr)); } catch (e2) {}
    if (arr.length < 6) return;
    var awarded = null;
    try { awarded = localStorage.getItem(AK); } catch (e3) {}
    if (awarded) return;
    try { localStorage.setItem(AK, '1'); } catch (e4) {}
    try { document.dispatchEvent(new CustomEvent('pf-scout-earned')); } catch (e5) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Compact follower formatter: 12600 -> "12.6K", 1200000 -> "1.2M". */
  function fmtCount(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    var v;
    if (n >= 1e6) {
      v = n / 1e6;
      return (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace(/\.0$/, '')) + 'M';
    }
    if (n >= 1e3) {
      v = n / 1e3;
      return (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace(/\.0$/, '')) + 'K';
    }
    return String(n);
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
      /* AUTO-UPDATE (2026-10-07): show per-platform follower counts from the
         master DB (followers_by_platform), so "find all their platforms" is
         visible on every catalog page without hand-edits. Handles both the
         flat {platform: count} and nested {platform: {count}} shapes. */
      var pc = '';
      try {
        var fbp = m.followers_by_platform || {};
        var key = String(l.platform || '').toLowerCase().replace(/[^a-z]/g, '');
        var raw = fbp[key];
        if (raw == null) {
          /* try common aliases: tiktok_2 -> tiktok, etc. */
          var base = key.replace(/_\d+$/, '');
          raw = fbp[base];
        }
        var n = (raw && typeof raw === 'object') ? raw.count : raw;
        n = Math.round(Number(n) || 0);
        if (n > 0) pc = ' <span style="color:' + MUTED + ';font-weight:400;font-size:0.85em;">· ' + esc(fmtCount(n)) + '</span>';
      } catch (e_pc) {}
      return '<li style="margin:0 0 0.5rem;"><a href="' + esc(l.url) + '" target="_blank" rel="noopener" style="color:' + RED + ';font-weight:700;text-decoration:none;border-bottom:2px solid ' + RED + ';">' + esc(l.platform) + '</a>' + pc + '</li>';
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
      /* R31: aggregate reputation line — filled by repLine() below. */
      + '<div id="pf-repline" style="text-align:center;margin-bottom:0.4rem;font-size:0.95rem;color:' + MUTED + ';min-height:0;"></div>'
      /* LIVE STANDINGS (2026-10-07): weekly fan-vote line — filled by
         PF.voteStandings.paint(); renders the count per creator and the
         ★ LEADING THIS WEEK badge on the frontrunner. Empty until the
         live pull resolves; skipped slugs render nothing. */
      + '<div data-pf-votestandings style="text-align:center;margin-bottom:0.4rem;min-height:0;"></div>'
      /* Unified stats (2026-10-05): data-pf-fc is painted live by
         PF.creatorStats.paint(); the snapshot followers_display stays as
         pre-live fallback text only. */
      + '<div style="text-align:center;margin-bottom:1.6rem;font-size:1.1rem;"><strong data-pf-fc="' + esc(m.slug) + '" style="color:' + RED + ';">' + esc(m.followers_display) + '</strong> <span style="color:' + MUTED + ';font-size:0.85rem;letter-spacing:0.1em;">FOLLOWERS</span></div>'
      + (VOTE_SKIP_SLUGS.indexOf(m.slug) === -1 ? '<div style="text-align:center;margin:0 0 1.6rem;"><a href="/#pf-vote?for=' + esc(m.slug) + '" style="display:inline-block;border:2px solid ' + RED + ';color:' + RED + ';font-weight:900;letter-spacing:0.14em;font-size:0.9rem;text-decoration:none;padding:0.7rem 1.6rem;">VOTE FOR ' + esc(m.name) + ' &rarr;</a></div>' : '')
      /* QW-7 (2026-10-05, fixed Psych pre-ship): CTA routes catalog visitors
         to the /create feed. The feed has NO creator filter, so the label
         promises only the feed itself — no creator-specific delivery claim.
         Skipped for the do-not-touch slug (Jeanine Pirreaux Comedy). */
      + (VOTE_SKIP_SLUGS.indexOf(m.slug) === -1 ? '<div style="text-align:center;margin:0 0 1.6rem;"><a href="/create#pf-feed?creator=' + encodeURIComponent(m.slug) + '" style="color:' + MUTED + ';font-size:0.8rem;letter-spacing:0.1em;text-decoration:none;border-bottom:1px solid ' + MUTED + ';">THE CREATE FEED &rarr;</a></div>' : '')
      + para(m.bio)
      + (offer ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">What they offer</h2><ul style="padding-left:1.2rem;margin:0;">' + offer + '</ul>' : '')
      + (links ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">Find them here</h2><ul style="list-style:none;padding:0;margin:0;">' + links + '</ul>' : '')
      + (strengths ? '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">Key strengths</h2><ul style="padding-left:1.2rem;margin:0;">' + strengths + '</ul>' : '')
      /* Roster Beat Pages (2026-10-05): "THEIR FIGHT" mount. pages/creator-beat.js
         fills it from the public beat_get read; the mount is removed entirely
         when the beat is hidden, has no data, or the read fails. Never renders
         an empty section. */
      + '<div id="pf-beat" data-beat-slug="' + esc(m.slug) + '"></div>'
      + '<div style="text-align:center;margin-top:2.5rem;"><a href="/creator-onboard" style="color:' + RED + ';font-weight:900;letter-spacing:0.12em;text-decoration:none;border-bottom:2px solid ' + RED + ';">WANT IN? JOIN THE SICK LEFT RADICALS →</a></div>'
      + fundBlock(m, RED, CREAM, MUTED)
      + (related ? '<h2 style="color:' + MUTED + ';font-size:1rem;font-weight:700;letter-spacing:0.1em;margin:2.5rem 0 0.8rem;">RELATED CREATORS</h2><div style="display:flex;flex-direction:column;gap:0.5rem;">' + related + '</div>' : '')
      + nextFighter(m, all)
      + '</div></div>';
  }

  /* S7 FUND THEIR FIGHT (2026-10-04): after the enlist links — one click
     from admiration to money. /ventures?creator=<slug> preloads this
     creator in the subscribe UI (BLOSSOM M3 2026-10-06: was /war-chest,
     now the Movement Funds section); /create?for=<slug> filters the bounty
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
      + '<div><a href="/ventures?creator=' + slug + '" style="display:inline-block;background:' + red + ';color:#fff;'
      + 'font-weight:900;letter-spacing:0.12em;font-size:0.85rem;text-decoration:none;padding:0.8rem 1.6rem;'
      + 'border:2px solid ' + red + ';">FUND THEIR FIGHT \u2192</a></div>'
      + '<div style="margin-top:0.8rem;"><a href="/create?for=' + slug + '" style="color:' + muted + ';'
      + 'font-size:0.8rem;letter-spacing:0.08em;text-decoration:none;border-bottom:1px solid ' + muted + ';">'
      + 'or fill one of their open bounties \u2192</a></div>'
      + '</div>';
  }

  /* R31 (2026-10-04): reputation votes -> catalog rep line. reputation_get
     is per-callsign; roster slugs map to callsign format (dashes become
     underscores). Renders "BACKED BY N FIGHTERS" when the backend returns net
     upvotes; the line stays empty (invisible) until the read resolves, so a
     missing action degrades silently. Template-level, like the score itself. */
  function repKey(slug){
    return String(slug||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,20);
  }
  function repLine(root, m){
    var host=null;
    try{ host=root.querySelector("#pf-repline"); }catch(e){}
    if(!host||!m||!m.slug) return;
    var key=repKey(m.slug);
    if(!/^[a-z0-9_]{3,20}$/.test(key)) return;
    var api=(window.PF_BACKEND_URL);
    var fn="pfRepCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){
      if(done) return; done=true;
      try{ delete window[fn]; }catch(e){}
      if(s.parentNode) s.parentNode.removeChild(s);
      try{
        if(j&&j.ok&&Number(j.net)>0){
          host.innerHTML='BACKED BY <strong style="color:#c1121f;">'+Number(j.net)+'</strong> FIGHTERS';
        }
      }catch(e2){}
    }
    window[fn]=finish;
    s.onerror=function(){ finish(null); };
    s.src=api+"?action="+encodeURIComponent("reputation_get")+"&callsign="+encodeURIComponent(key)+"&callback="+fn;
    document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
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
      /* AUTO-UPDATE (2026-10-07): when live master DB data arrives after the
         snapshot render, re-render with fresh counts. Fail-soft throughout. */
      try {
        document.addEventListener('pf-slr-live', function onLive() {
          try {
            var fresh = PF.slrMember ? PF.slrMember(slug) : null;
            if (fresh && fresh.followers_as_of !== member.followers_as_of) {
              member = fresh;
              var all2 = PF.slrAll ? PF.slrAll() : members;
              render(root, member, all2);
              PF.log('slr-catalog', 're-rendered ' + slug + ' with live data');
              try {
                if (window.PF && PF.creatorStats) PF.creatorStats.ready(function () {
                  try { PF.creatorStats.paint(root); } catch (e_lp) {}
                });
              } catch (e_lp2) {}
            }
          } catch (e_lr) {}
        });
      } catch (e_ll) {}
      /* Unified stats (2026-10-05): paint the live follower count over the
         snapshot fallback text. Fail-soft inside the helper. */
      try {
        if (window.PF && PF.creatorStats) PF.creatorStats.ready(function () {
          try { PF.creatorStats.paint(root); } catch (e) {}
        });
      } catch (e_cs) {}
      /* A5 (2026-10-05): SCOUT CIRCUIT — record this distinct creator view. */
      try { trackScoutView(slug); } catch (e_scout) {}
      /* R31: paint the aggregate reputation line. */
      try{ repLine(root, member); }catch(e_rep){}
      /* LIVE STANDINGS (2026-10-07): paint the weekly fan-vote line —
         live pull with cache fallback (core/43-vote-standings.js), and
         auto re-render on the pf-vote-live event. Fail-soft throughout;
         skipped slugs (Jeanine, do-not-touch) render nothing. */
      try {
        if (window.PF && PF.voteStandings) {
          var paintVS = function () { try { PF.voteStandings.paint(root, slug); } catch (e_vsp) {} };
          paintVS();
          PF.voteStandings.ensure().then(paintVS);
          document.addEventListener('pf-vote-live', paintVS);
        }
      } catch (e_vs) {}
      /* Efficiency Index: site-pull beacon (one ping per slug per session) +
         paint the live computed score into the [data-eff-score] slot.
         P0: pageview is POST-only — use fetch, not image beacon. */
      try {
        var pvDone = window.__pfPvDone || (window.__pfPvDone = {});
        if (!pvDone[slug]) {
          pvDone[slug] = 1;
          var api = (window.PF_BACKEND_URL );
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
