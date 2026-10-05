/* pages/creator-beat.js | PF v1.4.3 | Roster Beat Pages — "THEIR FIGHT".
   Renders the political beat section on SLR catalog pages: the creator's
   issue areas (derived from their public political creations), their latest
   political creations, and their Call-the-Shot prediction record.
   Fills the #pf-beat mount that slr-catalog.js renders (or self-boots on a
   catalog page if the mount already exists).

   DATA RULES (no invented records):
   - Everything comes from the public beat_get JSONP read (creator_beat.js).
     predictions = aggregate counts only (already public via leaderboard);
     creations = accepted Content Bank submissions WITH political metadata
     (pre-metadata-weave the row is null and hides — non-political items
     are never labeled as "their fight");
     issues = derived from the creations' own tags (NEVER the private
     pick-your-fight preference — that contract forbids public display).
   - Any row with no data hides. The whole section hides when hidden=true
     (creator opt-out), when there is no data at all, or on any read
     failure. Never renders an empty "THEIR FIGHT" box.
   - No cross-creator comparisons, no leaderboard here — only this
     creator's own activity.
   - Jeanine Pirreaux Comedy is do-not-touch: the section never renders
     on her catalog page (BEAT_SKIP_SLUGS).

   CREATOR CONTROL: when the visitor's callsign matches the catalog member
   (slug -> callsign via repKey, the reputation_get precedent), a small
   toggle offers "HIDE MY POLITICAL BEAT" (default visible, one tap off).
   When hidden, the creator still sees a slim "beat hidden" bar with a
   one-tap "SHOW" — otherwise they could never unhide it. The write is an
   authed POST (beat:beat_optout_set); the module requires target == actor.
   Display preference only — ZERO XP in this module.

   Roster index cards are untouched (no political badges on the grid).

   KILL: ?pf_off=creator-beat or localStorage pf_disabled_v1='["creator-beat"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('creator-beat')) { return; }

  var RED = '#c1121f', CREAM = '#f5f0e1', BLACK = '#0a0a0a', MUTED = '#b8ab8e';
  var BEAT_SKIP_SLUGS = ['jeanine-pirreaux-comedy'];

  /* The 12 stable issue-area ids (pick-your-fight consumer contract —
     ids must not be renamed; labels are display-only). */
  var AREA_LABELS = {
    voting: 'Voting Rights', labor: 'Labor', repro: 'Reproductive Rights',
    climate: 'Climate', racial: 'Racial Justice', lgbtq: 'LGBTQ+ Rights',
    immigrant: 'Immigrant Rights', criminal: 'Criminal Justice',
    healthcare: 'Healthcare', housing: 'Housing', poverty: 'Anti-Poverty',
    watchdog: 'Watchdog'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function repKey(slug) {
    return String(slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '').slice(0, 20);
  }
  function myCs() {
    try {
      if (window.PFCallsign) return String(window.PFCallsign() || '').toLowerCase();
    } catch (e) {}
    return '';
  }
  function fmtDate(ts) {
    try {
      var d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function kindLabel(c) {
    var t = String(c.entity_type || '').toLowerCase();
    if (t === 'bill') return 'BILL';
    if (t === 'rep' || t === 'representative') return 'REP';
    if (t === 'race') return 'RACE';
    if (t === 'poll') return 'POLL';
    if (t === 'campaign') return 'CAMPAIGN';
    if (t === 'org' || t === 'nonprofit') return 'ALLY ORG';
    if (t === 'prediction') return 'PREDICTION';
    return t ? t.toUpperCase().slice(0, 12) : 'CREATION';
  }

  function sectionHead() {
    return '<h2 style="color:' + RED + ';font-size:1.25rem;font-weight:900;letter-spacing:0.04em;margin:2rem 0 0.8rem;">Their fight</h2>';
  }

  function issuesHtml(issues) {
    if (!issues || !issues.length) return '';
    var chips = issues.map(function (id) {
      var label = AREA_LABELS[String(id).toLowerCase()] || String(id);
      return '<span style="display:inline-block;border:1px solid ' + RED + ';color:' + CREAM + ';'
        + 'font-size:0.78rem;font-weight:700;letter-spacing:0.08em;padding:0.35rem 0.7rem;margin:0 0.4rem 0.4rem 0;">'
        + esc(label.toUpperCase()) + '</span>';
    }).join('');
    return '<div style="margin:0 0 1rem;">' + chips + '</div>';
  }

  function creationsHtml(creations) {
    if (!creations || !creations.length) return '';
    var items = creations.map(function (c) {
      var title = esc(c.title || 'Untitled creation');
      var inner = c.url
        ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener" style="color:' + CREAM + ';font-weight:700;text-decoration:none;border-bottom:1px solid ' + RED + ';">' + title + '</a>'
        : '<span style="color:' + CREAM + ';font-weight:700;">' + title + '</span>';
      var meta = kindLabel(c) + (c.ts ? ' · ' + esc(fmtDate(c.ts)) : '');
      return '<li style="color:' + MUTED + ';margin:0 0 0.7rem;line-height:1.55;font-size:0.92rem;">'
        + inner + '<div style="font-size:0.75rem;letter-spacing:0.06em;">' + esc(meta) + '</div></li>';
    }).join('');
    return '<div style="color:' + MUTED + ';font-size:0.8rem;letter-spacing:0.12em;margin:0 0 0.5rem;">LATEST POLITICAL CREATIONS</div>'
      + '<ul style="list-style:none;padding:0;margin:0 0 1rem;">' + items + '</ul>';
  }

  function predictionsHtml(p) {
    if (!p || !p.calls) return '';
    var bits = p.calls + (p.calls === 1 ? ' call' : ' calls');
    if (p.resolved) bits += ' · ' + p.wins + ' won';
    if (p.rate != null) bits += ' · ' + p.rate + '% called it';
    return '<div style="border-top:1px solid #2a2a2a;padding-top:1rem;margin-top:0.4rem;">'
      + '<div style="color:' + MUTED + ';font-size:0.8rem;letter-spacing:0.12em;margin-bottom:0.35rem;">CALL THE SHOT RECORD</div>'
      + '<div style="color:' + CREAM + ';font-size:1.05rem;font-weight:700;">' + esc(bits) + '</div></div>';
  }

  function toggleHtml(hidden) {
    var label = hidden ? 'SHOW MY POLITICAL BEAT' : 'HIDE MY POLITICAL BEAT';
    return '<div style="margin-top:1.2rem;"><button id="pf-beat-toggle" style="background:none;border:1px solid ' + MUTED
      + ';color:' + MUTED + ';font-size:0.72rem;letter-spacing:0.12em;padding:0.5rem 1rem;cursor:pointer;">'
      + label + '</button>'
      + '<div style="color:' + MUTED + ';font-size:0.72rem;margin-top:0.4rem;">Only you see this control.</div></div>';
  }

  function hiddenBarHtml() {
    return '<div style="margin:2rem 0 0.8rem;padding:1rem;border:1px dashed ' + MUTED + ';text-align:center;">'
      + '<div style="color:' + MUTED + ';font-size:0.8rem;letter-spacing:0.1em;margin-bottom:0.6rem;">YOUR POLITICAL BEAT IS HIDDEN FROM VISITORS</div>'
      + toggleHtml(true) + '</div>';
  }

  function setBeat(mount, slug, j) {
    var isOwner = false;
    try { isOwner = !!myCs() && myCs() === repKey(slug); } catch (e) {}
    if (j.hidden && !isOwner) { removeMount(mount); return; }
    if (j.hidden && isOwner) { mount.innerHTML = hiddenBarHtml(); wireToggle(mount, slug, true); return; }
    var hasData = (j.predictions && j.predictions.calls) || (j.creations && j.creations.length);
    if (!hasData) { removeMount(mount); return; }
    mount.innerHTML = sectionHead() + issuesHtml(j.issues) + creationsHtml(j.creations)
      + predictionsHtml(j.predictions) + (isOwner ? toggleHtml(false) : '');
    if (isOwner) wireToggle(mount, slug, false);
  }

  function removeMount(mount) {
    try { if (mount && mount.parentNode) mount.parentNode.removeChild(mount); } catch (e) {}
  }

  function wireToggle(mount, slug, currentlyHidden) {
    var btn = null;
    try { btn = mount.querySelector('#pf-beat-toggle'); } catch (e) {}
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var cs = myCs();
      var body = {
        type: 'beat', beat_action: 'beat_optout_set',
        callsign: cs, target_callsign: cs,
        hidden: currentlyHidden ? 0 : 1
      };
      function done(j) {
        if (j && j.ok) {
          /* Re-read so the section reflects the new state. */
          loadBeat(mount, slug);
        } else {
          btn.disabled = false;
          try { btn.textContent = 'TRY AGAIN'; } catch (e2) {}
        }
      }
      try {
        if (PF.authPost && window.PF_BACKEND_URL) { PF.authPost(window.PF_BACKEND_URL, body, done); return; }
      } catch (e3) {}
      done(null);
    });
  }

  function loadBeat(mount, slug) {
    var cs = repKey(slug);
    if (!cs || !/^[a-z0-9_]{3,20}$/.test(cs)) { removeMount(mount); return; }
    var api = '';
    try { api = window.PF_BACKEND_URL || ''; } catch (e) {}
    if (!api) { removeMount(mount); return; }
    var fn = 'pfBeatCb' + Math.floor(Math.random() * 1e9), done = false;
    var s = document.createElement('script');
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try {
        if (j && j.ok) setBeat(mount, slug, j);
        else removeMount(mount);
      } catch (e3) { removeMount(mount); }
    }
    window[fn] = finish;
    s.onerror = function () { finish(null); };
    s.src = api + '?action=' + encodeURIComponent('beat_get')
      + '&callsign=' + encodeURIComponent(cs)
      + '&callback=' + fn;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  function boot() {
    var mount = document.getElementById('pf-beat');
    if (!mount) return;
    var slug = mount.getAttribute('data-beat-slug') || '';
    if (!slug || BEAT_SKIP_SLUGS.indexOf(slug) !== -1) { removeMount(mount); return; }
    loadBeat(mount, slug);
  }

  /* slr-catalog.js fires pf-catalog-beat when it renders the mount (module
     may load before or after the catalog render). */
  document.addEventListener('pf-catalog-beat', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
