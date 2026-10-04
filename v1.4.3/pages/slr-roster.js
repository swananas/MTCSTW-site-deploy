/* pages/slr-roster.js  |  PF v1.4.2 | Sick Left Radicals roster, rebuilt from scratch.
   Pulls the 62-member master database (core/07-slr-db.js), shuffles the grid on
   every load, searchable by name/handle/focus. Each card: photo, name,
   propaganda score, follow count, link to the member's catalog page.
   Mounts on #pf-slr-roster, or auto-takes-over /sick-left-radicals (hides the
   old Squarespace content ONLY after the DB loads — on DB failure the old
   page stays up).
   KILL: ?pf_off=slr-roster  or  localStorage pf_disabled_v1='["slr-roster"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('slr-roster')) { return; }
  if (!PF.slrReady) { PF.error('slr-roster', 'slr-db not loaded'); return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function initials(name) {
    var w = String(name || '?').split(/\s+/).filter(Boolean);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase();
  }
  function handlesLine(m) {
    var h = m.handles || {};
    var bits = [];
    ['tiktok', 'instagram', 'youtube', 'x'].forEach(function (p) {
      if (h[p]) bits.push(h[p]);
    });
    if (!bits.length && h.primary) bits.push(h.primary);
    return bits.join(' · ');
  }

  function cardHTML(m) {
    var img = m.picture
      ? '<img src="' + esc(m.picture) + '" alt="' + esc(m.image_alt || m.name) + '" loading="lazy" style="width:100%;height:180px;object-fit:cover;display:block;background:#1a1a1a;">'
      : '<div style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;border-bottom:3px solid ' + RED + ';">'
        + '<span style="font-size:3rem;font-weight:900;color:' + RED + ';">' + esc(initials(m.name)) + '</span></div>';
    return '<div class="pf-slr-card" data-search="' + esc((m.name + ' ' + handlesLine(m) + ' ' + (m.content_focus || '')).toLowerCase()) + '"'
      + ' style="background:' + BLACK + ';border:3px solid ' + RED + ';color:' + CREAM + ';font-family:\'Helvetica Neue\',Arial,sans-serif;overflow:hidden;display:flex;flex-direction:column;">'
      + img
      + '<div style="padding:0.9rem 1rem 1.1rem;display:flex;flex-direction:column;gap:0.35rem;flex:1;">'
      + '<div style="font-size:1.05rem;font-weight:900;letter-spacing:0.02em;">' + esc(m.name) + '</div>'
      + '<div style="font-size:0.8rem;color:' + MUTED + ';">' + esc(handlesLine(m)) + '</div>'
      + '<div style="display:flex;gap:0.6rem;align-items:baseline;margin-top:0.2rem;">'
      + '<span style="font-size:1.3rem;font-weight:900;color:' + RED + ';">' + esc(m.followers_display) + '</span>'
      + '<span style="font-size:0.75rem;color:' + MUTED + ';letter-spacing:0.08em;">FOLLOWERS' + (m.is_new ? ' · <span style="color:' + RED + ';font-weight:700;">NEW</span>' : '') + '</span>'
      + '</div>'
      + '<div data-eff-score="' + esc(m.slug) + '" style="font-size:0.8rem;color:' + MUTED + ';">Propaganda score <strong style="color:' + CREAM + ';">' + m.propaganda_score.toFixed(1) + '/10</strong></div>'
      + '<a href="' + esc(m.catalog_path) + '" style="margin-top:auto;padding-top:0.6rem;display:block;text-align:center;background:' + RED + ';color:#fff;font-weight:900;letter-spacing:0.14em;font-size:0.85rem;padding:0.65rem;text-decoration:none;">VIEW PROFILE →</a>'
      + '</div></div>';
  }

  function render(root, members) {
    var order = shuffle(members);
    root.innerHTML =
      '<div style="max-width:1200px;margin:0 auto;padding:2rem 1rem;box-sizing:border-box;">'
      + '<div style="text-align:center;margin-bottom:0.4rem;font-size:0.8rem;letter-spacing:0.3em;color:' + RED + ';font-weight:700;">THE PROPAGANDA FACTORY</div>'
      + '<h1 style="text-align:center;color:' + CREAM + ';font-size:2.2rem;font-weight:900;letter-spacing:0.06em;margin:0 0 0.4rem;font-family:\'Helvetica Neue\',Arial,sans-serif;">SICK LEFT RADICALS</h1>'
      + '<div class="pf-slr-count" style="text-align:center;color:' + MUTED + ';font-size:0.95rem;margin-bottom:1.4rem;">'
      + members.length + ' affiliated propagandists · <span style="color:' + CREAM + ';font-weight:700;">' + totalFollowers(members) + '</span>&nbsp;combined reach</div>'
      + '<div style="max-width:520px;margin:0 auto 1.8rem;">'
      + '<input id="pf-slr-search" type="search" placeholder="Search the roster…" autocomplete="off"'
      + ' style="width:100%;padding:0.8rem 1rem;background:#141414;border:2px solid ' + RED + ';color:' + CREAM + ';font-size:1rem;font-family:inherit;box-sizing:border-box;">'
      + '</div>'
      + '<div class="pf-slr-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.2rem;">'
      + order.map(cardHTML).join('')
      + '</div>'
      + '<div class="pf-slr-empty" style="display:none;text-align:center;color:' + MUTED + ';padding:3rem 1rem;font-size:1.05rem;">No comrades match that search. Try another name.</div>'
      + '<div style="text-align:center;margin-top:2.5rem;"><a href="/creator-onboard" style="color:' + RED + ';font-weight:900;letter-spacing:0.12em;text-decoration:none;border-bottom:2px solid ' + RED + ';">WANT IN? JOIN THE SICK LEFT RADICALS →</a></div>'
      + '</div>';
    var input = root.querySelector('#pf-slr-search');
    var cards = root.querySelectorAll('.pf-slr-card');
    var empty = root.querySelector('.pf-slr-empty');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      for (var i = 0; i < cards.length; i++) {
        var hit = !q || cards[i].getAttribute('data-search').indexOf(q) !== -1;
        cards[i].style.display = hit ? '' : 'none';
        if (hit) shown++;
      }
      empty.style.display = shown ? 'none' : '';
    });
  }

  function totalFollowers(members) {
    var t = 0;
    for (var i = 0; i < members.length; i++) t += members[i].followers_total || 0;
    if (t >= 1e6) return (t / 1e6).toFixed(1) + 'M';
    if (t >= 1e3) return Math.round(t / 1e3) + 'K';
    return String(t);
  }

  function mountTakeover() {
    /* /sick-left-radicals with no #pf-slr-roster block: hide Squarespace
       content, render the roster in its place. Only called after DB loads. */
    var page = document.querySelector('main#page') || document.getElementById('page');
    var root = document.createElement('div');
    root.id = 'pf-slr-roster-root';
    root.style.cssText = 'background:#0a0a0a;';
    if (page && page.parentNode) {
      page.parentNode.insertBefore(root, page);
      page.style.display = 'none';
    } else {
      document.body.insertBefore(root, document.body.firstChild);
    }
    return root;
  }

  function boot() {
    var el = document.getElementById('pf-slr-roster');
    var isRosterPath = /^\/sick-left-radicals\/?$/.test(location.pathname);
    if (!el && !isRosterPath) return; /* not our page */
    PF.slrReady.then(function (members) {
      if (!members || !members.length) {
        /* DB failed: never hide existing content. Show a slim error only
           when we own an explicit mount block. */
        if (el) {
          el.innerHTML = '<div style="max-width:640px;margin:2rem auto;text-align:center;color:' + CREAM + ';font-family:Arial,sans-serif;">'
            + '<div style="font-weight:900;color:' + RED + ';">ROSTER OFFLINE</div>'
            + '<div style="color:' + MUTED + ';font-size:0.9rem;margin-top:0.5rem;">The roster database could not be reached. Reload to retry.</div></div>';
        }
        return;
      }
      var root = el || mountTakeover();
      render(root, members);
      PF.log('slr-roster', 'rendered ' + members.length + ' members (shuffled)');
      /* Efficiency Index: paint live computed scores into [data-eff-score] slots. */
      try {
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
