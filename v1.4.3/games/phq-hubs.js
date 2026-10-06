/* games/phq-hubs.js  |  PF v1.4.3 | /political-hq SECTION HUBS.
   Implements the Design Team PHQ hub IA spec (phq-hub-ia-spec-20261005.md):
   sticky sub-nav (#pf-hq-subnav) + 5 section hubs + interim FOLLOW THE MONEY
   tab, hash deep-links, scroll-spy, mobile strip, per-hub lazy-mount on first
   intersection, per-silo kill switches, fail-soft hub hiding.
   CIVIC SPLIT STATUS (2026-10-05): the 10 civic.js panes still share the one
   `civic` kill switch (split lands post-merge). Interim per spec §5.2: hubs
   are a virtual nav layer — the civic section mounts once as a strip under
   the sub-nav, its panes get phq-pane-* ids, and hub tabs deep-scroll to
   them. Set window.PF_PHQ_SPLIT=true when the per-pane split lands and the
   hub map below flips to per-pane silo ids automatically.
   COPY: hub missions/tab labels below are PROVISIONAL — Psych veto pending
   (see hidden/design-team/phq-cta-copy-20261005.md). No new XP, no new
   currencies, no "donate" anywhere.
   KILL: ?pf_off=phq-hubnav (hides the bar; hubs stack plainly) or any
   ?pf_off=<silo> from the spec §7 kill strings; a hub hides when ALL its
   silos are killed or fail to mount. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || window.pfPhqHubsDone) return;
  window.pfPhqHubsDone = true;

  function isEditor() {
    try {
      var h = window.location.href || '';
      if (h.indexOf('/config/') !== -1) return true;
      var b = document.body;
      if (b && (b.classList.contains('sqs-edit-mode') || b.classList.contains('sqs-editing'))) return true;
      return false;
    } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* ================= HUB CONFIG (spec §2–§4, §7) =================
     silos   = target per-pane ids (post-split, spec §5.1)
     interim = pre-split kill-check ids (spec §7 interim strings)
     order   = ORDER-table ids mounted into this hub pre-split
     panes   = civic pane kinds deep-linked from this hub's tab (spec §5.2) */
  var HUBS = [
    { id: 'action', sec: '01', tab: 'TAKE ACTION', title: 'Take Action',
      mission: 'Stop reading. Start hitting.', /* [PSYCH] */
      silos: ['action-center', 'civic-pressure', 'civic-petitions', 'civic-pledges',
              'civic-callpractice', 'footprint', 'vote-alerts', 'civic-duty', 'civic-sharekits'],
      interim: ['action-center', 'civic', 'footprint', 'vote-alerts', 'civic-duty'],
      order: ['action-center', 'footprint', 'vote-alerts'],
      panes: ['petitions', 'pressure', 'callpractice', 'pledges', 'sharekits'],
      alertRow: true },
    { id: 'people', sec: '02', tab: 'PEOPLE', title: 'People',
      mission: 'Know the players. Your reps, their grades, your statehouse.', /* [PSYCH] */
      silos: ['civic-directory', 'civic-scorecards', 'stateleg', 'wallshame'],
      interim: ['civic', 'stateleg', 'wallshame'],
      order: ['stateleg'],
      panes: ['directory', 'reps', 'scorecards'],
      wallshame: true },
    { id: 'bills', sec: '03', tab: 'BILLS & COURTS', title: 'Bills & Courts',
      mission: 'Read the battlefield. Bills, rulings, and orders — decoded.', /* [PSYCH] */
      silos: ['legislation', 'courts', 'eo', 'governance', 'wallshame'],
      interim: ['legislation', 'courts', 'eo', 'governance', 'wallshame'],
      order: ['legislation', 'courts', 'eo', 'governance'],
      panes: [],
      wallshame: true },
    { id: 'ballot', sec: '04', tab: 'BALLOT', title: 'Ballot',
      mission: 'Your ballot, your races, your countdown.', /* [PSYCH] */
      silos: ['civic-ballot', 'ballotcd', 'races', 'measures', 'civic-votercheck'],
      interim: ['civic', 'ballotcd', 'races', 'measures'],
      /* 2026-10-05 (fe/predict-game): CALL IT. prediction game joins the
         BALLOT hub ('elections' preselected); 'predict' (Call the Shot)
         stays untouched. */
      order: ['races', 'measures', 'predict', 'predgame'],
      panes: ['ballot', 'voter', 'votercheck', 'countdown'] },
    { id: 'intel', sec: '05', tab: 'INTEL', title: 'Intel',
      mission: 'Know more than they do.', /* [PSYCH] */
      silos: ['intel', 'civic-polls', 'nonprofits', 'labor'],
      interim: ['intel', 'civic', 'nonprofits'],
      order: ['intel', 'nonprofits'],
      panes: ['polls'] },
    { id: 'money', sec: '06', tab: 'FOLLOW THE MONEY', title: 'Follow the Money', /* [PSYCH] tab label */
      mission: 'Follow the money. See who funds the votes.', /* [PSYCH] P5 */
      silos: ['money-tab', 'money-vote', 'pac-alerts', 'trades-tab', 'corp-card', 'ledgers', 'boycotts'],
      interim: ['money-tab', 'money-vote', 'pac-alerts', 'trades-tab', 'corp-card', 'ledgers', 'boycotts'],
      order: [],
      panes: [],
      moneySlot: true }
  ];
  var SPLIT = (typeof window.PF_PHQ_SPLIT !== 'undefined') ? !!window.PF_PHQ_SPLIT : false;

  /* civic pane heading -> pane kind (generalizes the Action Center's
     tagCivicPanes/ac-pane-* technique per spec §5.2) */
  function paneKindForHeading(text) {
    var t = String(text || '').toLowerCase();
    if (t.indexOf('petition') !== -1) return 'petitions';
    if (t.indexOf('scorecard') !== -1 || t.indexOf('grade') !== -1) return 'scorecards';
    if (t.indexOf('directory') !== -1 || t.indexOf('rep') !== -1 || t.indexOf('congress') !== -1) return 'directory';
    if (t.indexOf('ballot center') !== -1 || t.indexOf('ballot') !== -1) return 'ballot';
    if (t.indexOf('voter') !== -1 || t.indexOf('regist') !== -1) return 'voter';
    if (t.indexOf('countdown') !== -1) return 'countdown';
    if (t.indexOf('pressure') !== -1 || t.indexOf('campaign') !== -1) return 'pressure';
    if (t.indexOf('call practice') !== -1 || t.indexOf('call script') !== -1) return 'callpractice';
    if (t.indexOf('pledge') !== -1) return 'pledges';
    if (t.indexOf('poll') !== -1) return 'polls';
    if (t.indexOf('share kit') !== -1) return 'sharekits';
    return null;
  }
  function hubForPaneKind(kind) {
    for (var i = 0; i < HUBS.length; i++) {
      if (HUBS[i].panes.indexOf(kind) !== -1) return HUBS[i].id;
    }
    return null;
  }
  function hubById(id) {
    for (var i = 0; i < HUBS.length; i++) if (HUBS[i].id === id) return HUBS[i];
    return null;
  }
  /* ORDER silo id -> hub id (pre-split uses hub.order; post-split uses hub.silos) */
  function hubForSilo(silo) {
    for (var i = 0; i < HUBS.length; i++) {
      var list = SPLIT ? HUBS[i].silos : HUBS[i].order;
      if (list.indexOf(silo) !== -1) return HUBS[i].id;
    }
    return null;
  }
  function hubKillIds(hub) { return SPLIT ? hub.silos : hub.interim; }

  /* ============ mount-one-silo (mirrors pages/political-hq.js mountSilos) ============ */
  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) {
        if (PF) PF.error('phq-hubs', 'inner script failed in ' + label + ' :: ' + (e && e.message || e));
        try {
          var loads = root.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
          for (var j = 0; j < loads.length; j++) {
            var d = document.createElement('div');
            d.style.cssText = 'border:2px solid var(--pf-red);background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;';
            d.innerHTML = 'This widget failed to start. ' +
              '<button style="background:var(--pf-red);color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;" onclick="location.reload()">Reload</button>';
            if (loads[j].parentNode) loads[j].parentNode.replaceChild(d, loads[j]);
          }
        } catch (e2) {}
      }
      scripts[i].remove();
    }
  }
  /* returns true when the silo actually mounted */
  function mountOneSilo(silo, tplId, hostEl) {
    try {
      if (PF.skip(silo)) return false;
      var tpl = document.getElementById(tplId);
      if (!tpl || !tpl.content) return false;
      var frag = document.importNode(tpl.content, true);
      var section = document.createElement('section');
      section.className = 'pf-v2-game pf-hq-section';
      section.setAttribute('data-game', silo);
      section.id = 'phq-silo-' + silo; /* deep-link anchor (AC/Deck/War Report) */
      section.appendChild(frag);
      hostEl.appendChild(section);
      execScripts(section, tplId);
      return true;
    } catch (e) {
      if (PF) PF.error('phq-hubs', 'mount failed: ' + silo + ' :: ' + (e && e.message || e));
      return false;
    }
  }

  var mountedHubs = {};   /* hubId -> true once its silos have mounted */
  var hubHasSilos = {};   /* hubId -> count of actually-mounted silos */
  var mountedSilos = {};  /* 'hubId:silo' -> true (deep-chunk remount guard) */
  var hubMissing = {};    /* hubId -> [[silo, tplId]] missing on first pass */
  /* 2026-10-05 (fe/political-hq-optimize): hubId -> [[silo, tplId], ...]
     silos skipped on first pass because their template wasn't staged yet
     (their code rides the async bundle-hq-deep chunk). phqDeepReady()
     re-mounts exactly these once the deep chunk lands. */

  function hubSectionEl(hub) { return document.getElementById('phq-' + hub.id); }

  function renderSubnav(host) {
    if (PF.skip('phq-hubnav')) return null;
    if (document.getElementById('pf-hq-subnav')) return document.getElementById('pf-hq-subnav');
    var nav = document.createElement('nav');
    nav.id = 'pf-hq-subnav';
    nav.setAttribute('aria-label', 'Political HQ sections');
    var tabs = document.createElement('div');
    tabs.className = 'pf-hq-tabs';
    tabs.setAttribute('role', 'tablist');
    for (var i = 0; i < HUBS.length; i++) {
      (function (hub) {
        var b = document.createElement('button');
        b.className = 'pf-hq-tab';
        b.setAttribute('role', 'tab');
        b.setAttribute('data-hub', hub.id);
        b.setAttribute('aria-controls', 'phq-' + hub.id);
        b.textContent = hub.tab;
        b.addEventListener('click', function () { goHub(hub.id, true); });
        tabs.appendChild(b);
      })(HUBS[i]);
    }
    nav.appendChild(tabs);
    host.insertBefore(nav, host.firstChild);
    return nav;
  }

  function renderHubShells(host) {
    for (var i = 0; i < HUBS.length; i++) {
      (function (hub, idx) {
        if (document.getElementById('phq-' + hub.id)) return;
        var sec = document.createElement('section');
        sec.id = 'phq-' + hub.id;
        sec.className = 'pf-hub';
        sec.setAttribute('data-hub', hub.id);
        var next = HUBS[(idx + 1) % HUBS.length];
        var h = '<header class="pf-hub-head">' +
          '<span class="pf-hub-kicker">SECTION ' + hub.sec + ' — ' + esc(hub.tab) + '</span>' +
          '<h2>' + esc(hub.title) + '</h2>' +
          '<p class="pf-hub-mission">' + esc(hub.mission) + '</p>' +
          (hub.alertRow
            ? '<p class="pf-hub-alertrow"><a href="#pf-util-notify-prefs" data-hub-go="__notify">Alert settings</a> — manage your vote &amp; case alerts.</p>'
            : '') +
          '</header>' +
          '<div class="pf-hub-silos"><div class="pf-hub-loading">Loading ' + esc(hub.title) + '&hellip;</div></div>' +
          '<footer class="pf-hub-exits">' +
          '<a href="#phq-' + next.id + '" data-hub-go="' + next.id + '">Next: ' + esc(next.title) + ' &rarr;</a>' +
          '<a href="#phq-action" data-hub-go="action">&larr; Back to Take Action</a>' +
          '</footer>';
        sec.innerHTML = h;
        host.appendChild(sec);
      })(HUBS[i], i);
    }
  }

  /* tag civic panes for the §5.2 virtual nav layer */
  function tagHubPanes() {
    try {
      var panes = document.querySelectorAll('#pf-phq-civicstrip .x-pane, #pf-political-hq .x-pane');
      for (var i = 0; i < panes.length; i++) {
        var h4 = panes[i].querySelector('h4');
        if (!h4) continue;
        var kind = paneKindForHeading(h4.textContent);
        if (!kind) continue;
        var hubId = hubForPaneKind(kind);
        if (!hubId) continue;
        if (!panes[i].id && !document.getElementById('phq-pane-' + kind)) panes[i].id = 'phq-pane-' + kind;
        panes[i].setAttribute('data-phq-hub', hubId);
        panes[i].setAttribute('data-phq-pane', kind);
      }
    } catch (e) {}
  }
  /* 2026-10-05 (P4 pane anchors): civic paints its .x-pane elements async
     (JSONP fan-in), after mount-time tagHubPanes() already ran. Re-tag on
     every civic paint — tagHubPanes() is idempotent. */
  try {
    document.addEventListener('pf-civic-panes', function () { try { tagHubPanes(); } catch (e) {} });
  } catch (e) {}

  function clearLoading(hub) {
    var sec = hubSectionEl(hub);
    if (!sec) return;
    var l = sec.querySelector('.pf-hub-loading');
    if (l && l.parentNode) l.parentNode.removeChild(l);
  }

  function refreshTabs() {
    var nav = document.getElementById('pf-hq-subnav');
    if (!nav) return;
    var tabs = nav.querySelectorAll('.pf-hq-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (b) {
        var hub = hubById(b.getAttribute('data-hub'));
        if (!hub) return;
        var sec = hubSectionEl(hub);
        var hidden = !sec || sec.style.display === 'none';
        /* 2026-10-05 (SURGE-2 FAIL 2): spec §5.2 virtual nav — keep the tab
           visible when the civic strip holds tagged panes for this hub, even
           if the hub section itself mounted zero silos. TAKE ACTION's panes
           (Pressure campaigns, Petitions, …) live in the strip until its
           dedicated silos (action-center, footprint, vote-alerts) merge;
           hiding the tab defeats the deep-scroll nav. The section stays
           hidden (no empty shell); goHub scrolls to the tagged panes. */
        if (hidden) {
          try {
            hidden = document.querySelectorAll('[data-phq-hub="' + hub.id + '"]').length === 0;
          } catch (e) { /* keep hidden on query failure (fail-soft) */ }
        }
        b.style.display = hidden ? 'none' : '';
        b.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      })(tabs[i]);
    }
  }

  /* Wall of Shame dual-mount slots (PEOPLE + BILLS) — fail-soft until the
     wall-of-shame branch merges (held OUT of merge until the bill-detail
     mount hook exists — data-map merge gate). */
  function mountWallShameSlot(hub) {
    if (!hub.wallshame || PF.skip('wallshame')) return false;
    var sec = hubSectionEl(hub);
    if (!sec) return false;
    var silos = sec.querySelector('.pf-hub-silos');
    if (!silos) return false;
    /* 2026-10-05 (fe/political-hq-optimize): remount guard — phqDeepReady()
       re-runs mountHub for hubs with late templates; never double-slot. */
    if (silos.querySelector('[data-wallshame-slot="' + hub.id + '"]')) return true;
    try {
      var api = (window.PFWallShame && window.PFWallShame.mount) ? window.PFWallShame
        : (PF.WallShame && PF.WallShame.mount) ? PF.WallShame : null;
      if (!api) return false; /* not merged yet — fail soft, no skeleton */
      var slot = document.createElement('div');
      slot.setAttribute('data-wallshame-slot', hub.id);
      silos.appendChild(slot);
      api.mount(null, slot); /* people pane: no bill context; bill pane binds post-split */
      return true;
    } catch (e) {
      if (PF) PF.error('phq-hubs', 'wallshame slot failed (' + hub.id + ') :: ' + (e && e.message || e));
      return false;
    }
  }

  /* Money interim tab slot — mounts when the money-tab shell contract exists
     (PFMoneyTab.mountTab); hidden until then (fail-soft per spec §1). */
  function mountMoneySlot(hub) {
    if (!hub.moneySlot || PF.skip('money-tab')) return false;
    var sec = hubSectionEl(hub);
    if (!sec) return false;
    var silos = sec.querySelector('.pf-hub-silos');
    if (!silos) return false;
    /* 2026-10-05 (fe/political-hq-optimize): remount guard — same as wallshame. */
    if (silos.querySelector('[data-money-slot]')) return true;
    try {
      var api = (window.PFMoneyTab && window.PFMoneyTab.mountTab) ? window.PFMoneyTab
        : (PF.MoneyTab && PF.MoneyTab.mountTab) ? PF.MoneyTab : null;
      if (!api) return false; /* money suite not merged yet — tab stays hidden */
      var slot = document.createElement('div');
      slot.setAttribute('data-money-slot', 'tab');
      silos.appendChild(slot);
      api.mountTab(slot);
      return true;
    } catch (e) {
      if (PF) PF.error('phq-hubs', 'money slot failed :: ' + (e && e.message || e));
      return false;
    }
  }

  function mountHub(hub, orderPairs) {
    if (mountedHubs[hub.id]) return hubHasSilos[hub.id] || 0;
    mountedHubs[hub.id] = true;
    var sec = hubSectionEl(hub);
    var silosBox = sec ? sec.querySelector('.pf-hub-silos') : null;
    var n = 0;
    /* 2026-10-05 (fe/political-hq-optimize): templates missing on this pass
       (deep-chunk silo not staged yet) are recorded for the phqDeepReady()
       retry — EXCEPT kill-switched silos, which are intentional no-mounts. */
    var missing = (hubMissing[hub.id] = []);
    try {
      if (silosBox) {
        for (var i = 0; i < orderPairs.length; i++) {
          var silo = orderPairs[i][0], tplId = orderPairs[i][1];
          if (hubForSilo(silo) !== hub.id) continue;
          if (mountedSilos[hub.id + ':' + silo]) { n++; continue; }
          if (!PF.skip(silo) && !document.getElementById(tplId)) { missing.push([silo, tplId]); continue; }
          if (mountOneSilo(silo, tplId, silosBox)) { mountedSilos[hub.id + ':' + silo] = true; n++; }
        }
        if (mountWallShameSlot(hub)) n++;
        if (mountMoneySlot(hub)) n++;
      }
    } catch (e) {
      if (PF) PF.error('phq-hubs', 'hub mount failed: ' + hub.id + ' :: ' + (e && e.message || e));
    }
    hubHasSilos[hub.id] = n;
    clearLoading(hub);
    tagHubPanes();
    /* FAIL-SOFT (spec §1): hub hides when all its silos are killed or fail to mount.
       2026-10-05 (hub-visibility fix): when the deep-chunk re-mount succeeds
       (n>0), restore display — the first-pass fail-soft hide must not stick
       forever, or people/bills/intel stay invisible after phqDeepReady(). */
    if (n === 0 && sec) {
      sec.style.display = 'none';
      if (PF) PF.error('phq-hubs', 'hub ' + hub.id + ' has no mountable silos — hidden (fail-soft)');
    } else if (n > 0 && sec && sec.style.display === 'none') {
      sec.style.display = '';
    }
    refreshTabs();
    return n;
  }

  function mountCivicStrip(orderPairs) {
    if (PF.skip('civic')) return;
    if (document.getElementById('pf-phq-civicstrip')) return;
    var host = document.getElementById('pf-political-hq');
    var nav = document.getElementById('pf-hq-subnav');
    if (!host) return;
    for (var i = 0; i < orderPairs.length; i++) {
      if (orderPairs[i][0] !== 'civic') continue;
      var strip = document.createElement('div');
      strip.id = 'pf-phq-civicstrip';
      /* insert directly under the sub-nav (above the TAKE ACTION hub) */
      if (nav && nav.parentNode === host) host.insertBefore(strip, nav.nextSibling);
      else host.insertBefore(strip, host.firstChild);
      if (mountOneSilo('civic', orderPairs[i][1], strip)) tagHubPanes();
      return;
    }
  }

  function mountNotifyPrefs(orderPairs) {
    if (PF.skip('notify-prefs')) return;
    if (document.getElementById('pf-util-notify-prefs')) return;
    var host = document.getElementById('pf-political-hq');
    if (!host) return;
    for (var i = 0; i < orderPairs.length; i++) {
      if (orderPairs[i][0] !== 'notify-prefs') continue;
      /* 2026-10-05 (fe/political-hq-optimize): the notify-prefs template now
         stages with the async bundle-hq-deep chunk. Bail BEFORE creating the
         util div so phqDeepReady() can re-run this cleanly on deep load —
         a pre-created empty div would trip the early-return guard above and
         the pane would never mount. */
      var tpl = document.getElementById(orderPairs[i][1]);
      if (!tpl || !tpl.content) return;
      var util = document.createElement('div');
      util.id = 'pf-util-notify-prefs';
      util.className = 'pf-hub-util';
      host.appendChild(util); /* utility pane after the hubs (spec §6) */
      mountOneSilo('notify-prefs', orderPairs[i][1], util);
      return;
    }
  }

  /* ============ navigation: hash deep-links + scroll-spy ============ */
  var spyTargets = []; /* {el, hub} */
  function collectSpyTargets() {
    spyTargets = [];
    try {
      for (var i = 0; i < HUBS.length; i++) {
        var sec = hubSectionEl(HUBS[i]);
        if (sec && sec.style.display !== 'none') spyTargets.push({ el: sec, hub: HUBS[i].id });
      }
      var panes = document.querySelectorAll('[data-phq-hub]');
      for (var j = 0; j < panes.length; j++) {
        spyTargets.push({ el: panes[j], hub: panes[j].getAttribute('data-phq-hub') });
      }
    } catch (e) {}
  }
  function setActiveTab(hubId) {
    var nav = document.getElementById('pf-hq-subnav');
    if (!nav) return;
    var tabs = nav.querySelectorAll('.pf-hq-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (b) {
        var on = b.getAttribute('data-hub') === hubId;
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      })(tabs[i]);
    }
  }
  function initScrollSpy() {
    collectSpyTargets();
    if (!('IntersectionObserver' in window) || !spyTargets.length) return;
    var active = null;
    var obs = new IntersectionObserver(function (entries) {
      var best = null, bestTop = Infinity;
      for (var k = 0; k < entries.length; k++) {
        var en = entries[k];
        if (en && en.isIntersecting) {
          var top = en.boundingClientRect ? en.boundingClientRect.top : 0;
          if (top < bestTop) { bestTop = top; best = en.target; }
        }
      }
      if (best) {
        var hub = best.getAttribute('data-hub') || best.getAttribute('data-phq-hub');
        if (hub && hub !== active) { active = hub; setActiveTab(hub); }
      }
    }, { rootMargin: '-20% 0px -60% 0px' });
    try {
      for (var m = 0; m < spyTargets.length; m++) obs.observe(spyTargets[m].el);
    } catch (e) {}
    try { window.pfPhqHubSpyRefresh = collectSpyTargets; } catch (e2) {}
  }

  function scrollTargetFor(hubId) {
    /* prefer the hub's first tagged pane (virtual nav, spec §5.2), else the hub section */
    try {
      var panes = document.querySelectorAll('[data-phq-hub="' + hubId + '"]');
      for (var i = 0; i < panes.length; i++) {
        if (panes[i].offsetParent !== null) return panes[i];
      }
    } catch (e) {}
    var hub = hubById(hubId);
    return hub ? hubSectionEl(hub) : null;
  }
  function goHub(hubId, pushHash) {
    if (hubId === '__notify') {
      var n = document.getElementById('pf-util-notify-prefs');
      if (n && n.scrollIntoView) n.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    var hub = hubById(hubId);
    if (!hub) return;
    if (!mountedHubs[hubId] && window.pfPhqHubOrder) mountHub(hub, window.pfPhqHubOrder);
    collectSpyTargets();
    var t = scrollTargetFor(hubId);
    if (t && t.scrollIntoView) {
      try { t.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (e) {}
    }
    setActiveTab(hubId);
    if (pushHash !== false) {
      try { history.replaceState(null, '', '#phq-' + hubId); } catch (e) {}
    }
  }

  /* ============ deep-chunk async loader (fe/political-hq-optimize) ============
     bundle-hq-deep.js carries the below-fold silo code (stateleg, legislation,
     governance, notify-prefs, intel, predict, predict-home, ballot-countdown,
     nonprofits). It is NOT in the blocking footer sequence — this loader
     injects it async once the hub shells render, so 152KB of code never
     blocks first paint. PF.phqDeepReady() re-mounts any hub/silo whose
     template was missing on the first pass (recorded in hubMissing), then
     re-runs the notify-prefs utility mount, refreshes tabs, and re-collects
     scroll-spy targets. Idempotent and fail-soft: if the deep chunk fails
     (one retry), hubs stay hidden per the spec §1 fail-soft rule and a
     PF.error is logged — never a spinner forever. */
  var deepState = { tried: false, done: false };
  function deepUrl() {
    try {
      var ss = document.scripts || document.getElementsByTagName('script');
      for (var i = 0; i < ss.length; i++) {
        var src = String(ss[i].src || '');
        var m = src.match(/^(.*\/)games\/bundle-hq\.js(\?|#|$)/);
        if (m) return m[1] + 'games/bundle-hq-deep.js';
      }
    } catch (e) {}
    return null;
  }
  function phqDeepReady() {
    if (deepState.done) return;
    deepState.done = true;
    try {
      var orderPairs = window.pfPhqHubOrder || [];
      for (var i = 0; i < HUBS.length; i++) {
        var miss = hubMissing[HUBS[i].id];
        if (miss && miss.length) {
          delete mountedHubs[HUBS[i].id];
          mountHub(HUBS[i], orderPairs);
          hubMissing[HUBS[i].id] = [];
        }
      }
      mountNotifyPrefs(orderPairs);
      refreshTabs();
      try { if (window.pfPhqHubSpyRefresh) window.pfPhqHubSpyRefresh(); } catch (e2) {}
    } catch (e) { if (PF) PF.error('phq-hubs', 'deep ready failed :: ' + (e && e.message || e)); }
  }
  function loadDeepChunk() {
    if (deepState.tried) return;
    deepState.tried = true;
    var url = deepUrl();
    if (!url) { if (PF) PF.error('phq-hubs', 'deep chunk: could not resolve bundle-hq.js URL — deep silos skipped'); return; }
    var attempts = 0;
    function attempt() {
      attempts++;
      try {
        var s = document.createElement('script');
        s.src = url; s.async = true;
        s.onload = function () { phqDeepReady(); };
        s.onerror = function () {
          if (attempts < 2) { setTimeout(attempt, 5000); }
          else if (PF) PF.error('phq-hubs', 'deep chunk failed to load after retry — below-fold silos unavailable');
        };
        (document.head || document.documentElement).appendChild(s);
      } catch (e) { if (PF) PF.error('phq-hubs', 'deep chunk inject failed :: ' + (e && e.message || e)); }
    }
    attempt();
  }
  PF.phqDeepReady = phqDeepReady;

  /* ============ main entry: PF.mountHubSilos(ORDER) ============ */
  function mountHubSilos(ORDER) {
    try {
      var host = document.getElementById('pf-political-hq');
      if (!host || isEditor()) return;
      window.pfPhqHubOrder = ORDER;
      var navKilled = PF.skip('phq-hubnav');

      var nav = navKilled ? null : renderSubnav(host);
      renderHubShells(host);
      /* 2026-10-05 (fe/political-hq-optimize): kick the async deep chunk
         now — below-fold silo code must not block first paint. */
      loadDeepChunk();
      mountCivicStrip(ORDER);
      mountNotifyPrefs(ORDER);

      /* delegate in-hub link clicks (next-hub, AC-return, alert settings) */
      if (!window.pfPhqHubDelegated) {
        window.pfPhqHubDelegated = true;
        document.addEventListener('click', function (e) {
          var t = e && e.target;
          while (t && t !== document) {
            if (t.getAttribute && t.getAttribute('data-hub-go')) {
              e.preventDefault();
              goHub(t.getAttribute('data-hub-go'), true);
              return;
            }
            t = t.parentNode;
          }
        });
      }

      var hashHub = null;
      try {
        var m = String(window.location.hash || '').match(/^#phq-(people|bills|ballot|action|intel|money)$/);
        if (m) hashHub = m[1];
      } catch (e) {}

      if (navKilled) {
        /* graceful degradation: plain stacked page, everything mounts now */
        for (var d = 0; d < HUBS.length; d++) mountHub(HUBS[d], ORDER);
        initScrollSpy();
        return;
      }

      /* immediate: civic strip is above the fold; PEOPLE hub; hash target */
      var immediate = { people: true };
      if (hashHub) immediate[hashHub] = true;
      for (var i = 0; i < HUBS.length; i++) {
        if (immediate[HUBS[i].id]) mountHub(HUBS[i], ORDER);
      }

      /* lazy-mount below the fold on first intersection (spec §1 — REQUIRED) */
      var pending = [];
      for (var j = 0; j < HUBS.length; j++) {
        if (!mountedHubs[HUBS[j].id]) pending.push(HUBS[j]);
      }
      function mountIfNear() {
        try {
          var vh = window.innerHeight || 800;
          for (var k = pending.length - 1; k >= 0; k--) {
            var sec = hubSectionEl(pending[k]);
            if (!sec) { pending.splice(k, 1); continue; }
            var r = sec.getBoundingClientRect();
            if (r.top < vh * 1.5) { mountHub(pending[k], ORDER); pending.splice(k, 1); }
          }
        } catch (e) {}
      }
      mountIfNear();
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (es) {
          for (var k = 0; k < es.length; k++) {
            if (es[k] && es[k].isIntersecting) {
              for (var p = pending.length - 1; p >= 0; p--) {
                if (hubSectionEl(pending[p]) === es[k].target) {
                  mountHub(pending[p], ORDER);
                  pending.splice(p, 1);
                }
              }
              try { obs.unobserve(es[k].target); } catch (e) {}
            }
          }
        }, { rootMargin: '800px' }); /* preload margin matches the footer jsLazy() */
        try {
          for (var q = 0; q < pending.length; q++) {
            var s2 = hubSectionEl(pending[q]);
            if (s2) obs.observe(s2);
          }
        } catch (e) { mountIfNear(); }
      } else {
        for (var z = pending.length - 1; z >= 0; z--) { mountHub(pending[z], ORDER); pending.splice(z, 1); }
      }
      /* safety net (parity with jsLazy): 15s timeout mounts everything */
      setTimeout(function () {
        try {
          for (var k = pending.length - 1; k >= 0; k--) { mountHub(pending[k], ORDER); pending.splice(k, 1); }
          initScrollSpy();
        } catch (e) {}
      }, 15000);

      initScrollSpy();
      tagHubPanes();
      refreshTabs();

      /* deep-link on load */
      if (hashHub) {
        setTimeout(function () { goHub(hashHub, false); }, 600);
      }
    } catch (e) {
      if (PF) PF.error('phq-hubs', 'mountHubSilos failed :: ' + (e && e.message || e));
    }
  }

  PF.mountHubSilos = mountHubSilos;
  PF.phqGoHub = goHub;
  /* test seam: pure helpers for the verify script */
  PF.phqHubTest = {
    hubs: HUBS, paneKindForHeading: paneKindForHeading,
    hubForPaneKind: hubForPaneKind, hubForSilo: hubForSilo, hubKillIds: hubKillIds,
    deepUrl: deepUrl, phqDeepReady: phqDeepReady, hubMissing: hubMissing
  };
})();
