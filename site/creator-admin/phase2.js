/* Creator Suite Phase 2 — admin surface (2026-10-12, C5).
   NEW file; the Phase 1 creator-admin page only gains this script tag.
   One queue for Shane: crawl-back domain approvals (one tap each), plus
   this week's kit run + campaign participation counts + the last
   stats-refresh result. Reads the admin secret from the same
   sessionStorage key the Phase 1 admin page uses (pf_admin_secret);
   renders nothing until the page is unlocked. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var API = 'https://pf-api.mtcstw.workers.dev';
  function sec() { try { return sessionStorage.getItem('pf_admin_secret') || ''; } catch (e) { return ''; } }

  var root = document.getElementById('phase2-admin-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'phase2-admin-root';
    document.body.appendChild(root);
  }

  function render(d) {
    var h = '<div class="cc-card" style="max-width:860px;margin:18px auto"><h2 style="color:#f5ead6;margin:0 0 8px">Phase 2 — operating loop</h2>';
    h += '<p class="cc-meta">Share kits, week of ' + esc(d.kits.week) + ': <strong>' + esc(String(d.kits.generated)) + '</strong> generated, <strong>' + esc(String(d.kits.emailed)) + '</strong> emailed.</p>';
    if (d.campaign_participants && d.campaign_participants.length) {
      h += d.campaign_participants.map(function (p) {
        return '<div class="cc-row"><span>Campaign ' + esc(p.campaign_id) + '</span><span><strong>' + esc(String(p.creators_in)) + '</strong> creators in</span></div>';
      }).join('');
    }
    if (d.stats_refresh) {
      var sd = d.stats_refresh.detail || {};
      h += '<p class="cc-meta">Stats refresh: ' + esc(String(sd.rows_refreshed || 0)) + ' rows reconciled' +
        (sd.stale && sd.stale.length ? '; stale flags: ' + esc(sd.stale.join(', ')) : '') + '</p>';
    }
    h += '<h3 style="color:#f5ead6;margin:16px 0 6px">Crawl-back approvals — one tap</h3>';
    if (d.crawl_pending && d.crawl_pending.length) {
      h += d.crawl_pending.map(function (p) {
        return '<div class="cc-row"><span><strong>' + esc(p.slug) + '</strong> · ' + esc(p.domain) + '</span><span>' +
          '<button type="button" class="cc-btn" data-approve="' + esc(p.slug) + '|' + esc(p.domain) + '">Approve crawl</button> ' +
          '<button type="button" class="cc-btn secondary" data-reject="' + esc(p.slug) + '|' + esc(p.domain) + '">Reject</button></span></div>';
      }).join('');
    } else h += '<p class="cc-meta">No domains waiting. Claimed creators\' crawl consents land here.</p>';
    h += '<div id="p2-admin-msg" class="cc-msg" role="status" aria-live="polite"></div></div>';
    root.innerHTML = h;
    root.querySelectorAll('[data-approve],[data-reject]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = (btn.getAttribute('data-approve') || btn.getAttribute('data-reject')).split('|');
        var action = btn.hasAttribute('data-approve') ? 'creator_crawl_approve' : 'creator_crawl_reject';
        btn.disabled = true;
        fetch(API + '/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action, slug: parts[0], domain: parts[1], approved_by: 'shane', _adminSecret: sec() }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var msg = document.getElementById('p2-admin-msg');
            msg.style.display = 'block';
            if (j && j.ok) { msg.textContent = (action === 'creator_crawl_approve' ? 'Approved — crawl queued for ' : 'Rejected ') + parts[1] + '.'; load(); }
            else { msg.className = 'cc-msg err'; msg.textContent = 'Failed (' + ((j && j.error) || 'error') + ').'; btn.disabled = false; }
          })
          .catch(function () { btn.disabled = false; });
      });
    });
  }
  function load() {
    if (!sec()) return;
    fetch(API + '/?action=creator_phase2_admin_queue&_adminSecret=' + encodeURIComponent(sec()))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok) render(d); })
      .catch(function () {});
  }
  load();
  setInterval(load, 15000);
})();
