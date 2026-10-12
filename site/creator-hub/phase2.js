/* Creator Suite Phase 2 — hub operating loop (2026-10-12, C5).
   NEW file; the Phase 1 hub page only gains a mount div + this script tag.
   Renders three cards from GET creator_phase2_hub (src/creator_phase2.js):
   1. This week's share kit — real card images (SVG from the API, JOIN THE
      FIGHT. standard), pre-written vote/campaign post text, copy + share.
   2. Your numbers & network — follower counts with honest as-of dates
      (stale labeled stale), synergy surfaces + newest crawled posts.
   3. Auto-fetch my posts (crawl-back) — one-tap consent; the domain then
      waits in Shane's single approval queue; status shown honestly.
   No vote tallies are ever shown (standing rule). */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escUrl(s) { return esc(String(s == null ? '' : s)); }
  var API = 'https://pf-api.mtcstw.workers.dev';
  function qs(n) { try { return new URLSearchParams(location.search).get(n) || ''; } catch (e) { return ''; } }
  function deviceId() { try { var k = 'pf_device_v1', id = localStorage.getItem(k); if (!id) { id = 'd-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem(k, id); } catch (e) {} } return id; } catch (e) { return ''; } }
  function getCallsign() { try { var cs = String((JSON.parse(localStorage.getItem('pf_identity_v1') || '{}')).callsign || ''); if (cs) return cs; } catch (e) {} try { return String(localStorage.getItem('pf_callsign') || ''); } catch (e) { return ''; } }
  function copyText(t, btn) {
    function done() { if (btn) { var o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(function () { btn.textContent = o; }, 1800); } }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done).catch(function () { done(); }); }
    else { try { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) {} done(); }
  }
  function shareText(t, url) {
    if (navigator.share) { navigator.share({ title: 'Sick Left Radicals', text: t, url: url || location.href }).catch(function () {}); }
    else copyText(t + (url ? ' ' + url : ''), null);
  }

  var slug = qs('slug');
  var root = document.getElementById('phase2-root');
  if (!slug || !root) return;

  function kitCard(d) {
    if (!d.kit) return '<div class="cc-card"><h2 style="color:#f5ead6;margin:0 0 8px">This week\'s share kit</h2><p class="cc-meta">Your kit generates every Monday on the Fan Favorite cycle. Nothing here yet for this week.</p></div>';
    var k = d.kit;
    var h = '<div class="cc-card"><h2 style="color:#f5ead6;margin:0 0 8px">This week\'s share kit</h2>';
    h += '<p class="cc-meta">Week of ' + esc(k.week) + (k.emailed ? ' · emailed to you ✓' : '') + '</p>';
    if (k.vote_card_url) h += '<img src="' + escUrl(k.vote_card_url) + '" alt="Vote for me card" style="width:100%;max-width:340px;display:block;margin:12px 0;border:1px solid #333">';
    h += '<p class="cc-meta" id="p2-vote-post">' + esc(k.vote_post || '') + '</p>';
    h += '<button type="button" class="cc-btn" id="p2-vote-copy">Copy vote post</button> ';
    h += '<button type="button" class="cc-btn secondary" id="p2-vote-share">Share vote post</button>';
    if (k.campaign_card_url) {
      h += '<h3 style="color:#f5ead6;margin:18px 0 8px">Campaign card' + (k.campaign_name ? ': ' + esc(k.campaign_name) : '') + '</h3>';
      h += '<img src="' + escUrl(k.campaign_card_url) + '" alt="Campaign card" style="width:100%;max-width:340px;display:block;margin:12px 0;border:1px solid #333">';
      h += '<p class="cc-meta">' + esc(k.campaign_post || '') + '</p>';
      h += '<button type="button" class="cc-btn" id="p2-camp-copy">Copy campaign post</button>';
    }
    h += '</div>';
    return h;
  }
  function numbersCard(d) {
    var h = '<div class="cc-card"><h2 style="color:#f5ead6;margin:0 0 8px">Your numbers &amp; network</h2>';
    if (d.stats && d.stats.length) {
      h += d.stats.map(function (s) {
        return '<div class="cc-row"><span>' + esc(s.platform || '') + '</span><span><strong>' + esc(s.followers_display || '') + '</strong>' +
          (s.as_of ? ' <span class="cc-small">as of ' + esc(s.as_of) + (s.stale ? ' · refresh queued' : '') + '</span>' : '') + '</span></div>';
      }).join('');
    } else h += '<p class="cc-meta">No verified counts on file yet — we keep them fresh, you never type them.</p>';
    if (d.synergy && d.synergy.surfaces && d.synergy.surfaces.length) {
      h += '<h3 style="color:#f5ead6;margin:16px 0 6px">Surfacing across the network</h3>';
      h += d.synergy.surfaces.map(function (s) { return '<div class="cc-row"><span>' + esc(s.surface) + '</span><span><strong>' + esc(String(s.count)) + '</strong></span></div>'; }).join('');
    }
    if (d.synergy && d.synergy.recent_items && d.synergy.recent_items.length) {
      h += '<h3 style="color:#f5ead6;margin:16px 0 6px">Latest posts we fetched for you</h3>';
      h += d.synergy.recent_items.map(function (it) {
        return '<div class="cc-row"><span>' + esc(it.title || it.id || '') + '</span><span>' + (it.as_of ? '<span class="cc-small">' + esc(it.as_of) + '</span>' : '') + '</span></div>';
      }).join('');
    }
    return h + '</div>';
  }
  function crawlCard(d) {
    var h = '<div class="cc-card"><h2 style="color:#f5ead6;margin:0 0 8px">Auto-fetch my posts</h2>';
    var doms = (d.crawl && d.crawl.domains) || [];
    if (doms.length) {
      h += doms.map(function (dm) {
        var st = dm.status === 'approved'
          ? ('<strong style="color:#7bc47f">Live</strong>' + (dm.last_crawled_as_of ? ' <span class="cc-small">last fetched ' + esc(dm.last_crawled_as_of) + '</span>' : ' <span class="cc-small">first fetch queued</span>'))
          : dm.status === 'pending' ? '<span class="cc-small">Waiting on Shane\'s one-tap approval</span>'
          : '<span class="cc-small">Not approved</span>';
        return '<div class="cc-row"><span>' + esc(dm.domain) + '</span><span>' + st + '</span></div>';
      }).join('');
    } else if (d.claimed) {
      h += '<p class="cc-meta">Say the word and we fetch your public posts from your own site into the network — you post like you already do, we do the carrying.</p>';
      h += '<input id="p2-domain" class="cc-input" type="text" placeholder="yoursite.com (optional — we can find it from your links)" style="margin:10px 0">';
      h += '<button type="button" class="cc-btn" id="p2-crawl-on">Turn on auto-fetch</button>';
    } else {
      h += '<p class="cc-meta">Claim your page to turn on auto-fetch — we fetch your public posts, you never touch a setting again.</p>';
    }
    h += '<div id="p2-crawl-msg" class="cc-msg" role="status" aria-live="polite"></div></div>';
    return h;
  }

  fetch(API + '/?action=creator_phase2_hub&slug=' + encodeURIComponent(slug) +
    '&callsign=' + encodeURIComponent(getCallsign()) + '&device=' + encodeURIComponent(deviceId()))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) return;
      root.innerHTML = kitCard(d) + numbersCard(d) + crawlCard(d);
      var vc = document.getElementById('p2-vote-copy');
      if (vc) vc.addEventListener('click', function () { copyText(d.kit.vote_post || '', vc); });
      var vs = document.getElementById('p2-vote-share');
      if (vs) vs.addEventListener('click', function () { shareText(d.kit.vote_post || '', d.kit.vote_card_url || ''); });
      var cc = document.getElementById('p2-camp-copy');
      if (cc) cc.addEventListener('click', function () { copyText(d.kit.campaign_post || '', cc); });
      var on = document.getElementById('p2-crawl-on');
      if (on) on.addEventListener('click', function () {
        var msg = document.getElementById('p2-crawl-msg');
        var dom = (document.getElementById('p2-domain') || {}).value || '';
        on.disabled = true; on.textContent = 'SENDING…';
        fetch(API + '/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'creator_crawl_consent', slug: slug, callsign: getCallsign(), device: deviceId(), domain: dom }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            msg.style.display = 'block';
            if (j && j.ok) { msg.className = 'cc-msg'; msg.textContent = 'Done — ' + j.domain + ' is in Shane\'s approval queue. One tap from him and fetching starts.'; on.style.display = 'none'; }
            else { msg.className = 'cc-msg err'; msg.textContent = 'Could not turn that on (' + ((j && (j.error || j.hint)) || 'error') + ').'; on.disabled = false; on.textContent = 'Turn on auto-fetch'; }
          })
          .catch(function () { msg.style.display = 'block'; msg.className = 'cc-msg err'; msg.textContent = 'Could not turn that on (network).'; on.disabled = false; on.textContent = 'Turn on auto-fetch'; });
      });
    })
    .catch(function () {});
})();
