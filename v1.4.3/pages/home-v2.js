/* pages/home-v2.js  |  PF v1.4.3 | Homepage v3 "Unclunk" (2026-10-07):
   7 blocks, not 31 widgets. Each block is a consolidated surface; the full
   widgets live on their dedicated pages (see HOMEPAGE-V3-SPEC.md for the
   disposition map).
   Blocks: hero → socialproof → brief → daily-orders → slr-match-quiz →
   fan-vote → closer.
   KILL: ?pf_off=home-v2  or  localStorage pf_disabled_v1='["home-v2"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfHomeV2Done) return;
  if (PF && PF.skip('home-v2')) { return; }
  var host = document.getElementById('pf-v2');
  if (!host) return; /* v2 mounts only where the shell lives — never on production pages */
  if (isEditor()) return; /* never mount inside the Squarespace editor */
  window.pfHomeV2Done = true;

  function err(msg, e) {
    if (PF) PF.error('home-v2', msg + ' :: ' + (e && e.message || e));
  }

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* === HERO (v3, 2026-10-07) ===
     One H1, one subhead, one CTA. First-time visitor knows what this is
     in 3 seconds. Static — no backend, no XP, cannot fail. */
  function heroHTML(){
    return '' +
    '<div id="pf-hero" style="max-width:min(860px,94vw);margin:0 auto;padding:56px 20px 40px;text-align:center;box-sizing:border-box;">' +
      '<div style="font-size:12px;letter-spacing:5px;color:#e5383b;font-weight:800;margin-bottom:14px;">THE PROPAGANDA FACTORY</div>' +
      '<h1 style="font-family:\'Arial Black\',Arial,sans-serif;font-size:clamp(2rem,8vw,3.6rem);letter-spacing:2px;color:#f5ead6;margin:0 0 14px;text-transform:uppercase;line-height:1.1;">Join the Propaganda Factory</h1>' +
      '<p style="font-size:clamp(1rem,3.5vw,1.25rem);color:#b8ab8e;line-height:1.6;margin:0 0 26px;max-width:600px;margin-left:auto;margin-right:auto;">62 sick radicals. Real data on the billionaires. Daily missions. Enlist in 30 seconds — free forever.</p>' +
      '<a href="#" id="pf-hero-cta" style="display:inline-block;min-height:44px;line-height:44px;background:#c1121f;color:#fff;font-weight:800;font-size:17px;padding:6px 38px;text-decoration:none;letter-spacing:2px;border:2px solid #fff;">CLAIM YOUR CALLSIGN &rarr;</a>' +
      '<div style="margin-top:16px;"><a href="#pf-brief" id="pf-hero-how" style="color:#b8ab8e;font-size:14px;text-decoration:underline;">See how it works &darr;</a></div>' +
    '</div>';
  }

  /* === CLOSER (v3, 2026-10-07) ===
     "Explore the machine" — link-card grid to every dedicated page.
     Replaces the sitemap widget. Static — no backend, no XP. */
  function closerHTML(){
    var cards = [
      ['/arcade', '\uD83C\uDFAE', 'ARCADE', 'Six propaganda games. Play daily, earn XP.'],
      ['/cells', '\uD83C\uDFF4', 'CELLS', 'Join a cell or build your own.'],
      ['/create', '\uD83D\uDEE0\uFE0F', 'CREATE', 'Forge posters, join the content pool.'],
      ['/bank', '\uD83D\uDCB0', 'BANK', 'War Bonds. Fund the fight.'],
      ['/economy', '\uD83D\uDCC8', 'ECONOMY', "The People's Price Index. Report prices."],
      ['/war-report', '\uD83D\uDCF0', 'WAR REPORT', 'Every Monday: what we won.'],
      ['/events', '\uD83E\uDD7E', 'EVENTS', 'Boots on the ground. RSVP, earn XP.'],
      ['/sick-left-radicals', '\u2605', 'ROSTER', 'Meet all 62 Sick Left Radicals.'],
      ['/request-access', '\uD83D\uDE80', 'CREATOR HQ', 'For creators: unlock the workshop.']
    ];
    var h = '<div id="pf-closer" style="max-width:min(860px,94vw);margin:0 auto;padding:40px 20px 60px;box-sizing:border-box;">' +
      '<div style="font-size:12px;letter-spacing:5px;color:#e5383b;font-weight:800;margin-bottom:10px;text-align:center;">EXPLORE THE MACHINE</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:clamp(1.4rem,5vw,2rem);color:#f5ead6;text-align:center;margin:0 0 24px;text-transform:uppercase;letter-spacing:1px;">Pick your front</div>' +
      '<div id="pf-closer-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      h += '<a href="' + c[0] + '" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;background:#141414;border:2px solid #3a0d0d;color:#f5ead6;text-decoration:none;padding:18px 12px;box-sizing:border-box;text-align:center;">' +
        '<span style="font-size:28px;margin-bottom:8px;">' + c[1] + '</span>' +
        '<span style="font-weight:800;font-size:14px;letter-spacing:2px;margin-bottom:6px;">' + c[2] + '</span>' +
        '<span style="font-size:12px;color:#a89e88;line-height:1.4;">' + c[3] + '</span></a>';
    }
    h += '</div></div>';
    return h;
  }

  /* === HOMEPAGE_INIT BATCH HELPER (v3, 2026-10-07) ===
     Batches the homepage's API calls into 1 composite backend call.
     Tries the `homepage_init` GET action first; falls back to parallel
     individual calls. Result cached 60s. Widgets use this instead of
     firing their own fetches on load. */
  (function initBatchHelper(){
    if (!window.PF) return;
    var cache = null, cacheAt = 0, inflight = null;
    function beUrl(){
      try {
        if (window.PF && PF.beUrl) return PF.beUrl();
      } catch(e){}
      return 'https://pf-api.mtcstw.workers.dev';
    }
    function jsonp(action, params){
      return new Promise(function(resolve){
        try {
          var url = beUrl() + '?action=' + encodeURIComponent(action);
          if (params) Object.keys(params).forEach(function(k){
            url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
          });
          var cb = 'pfHi' + Math.random().toString(36).slice(2);
          url += '&callback=' + cb;
          var done = false;
          window[cb] = function(d){ done = true; try{ delete window[cb]; }catch(e){} s.remove(); resolve(d||null); };
          var s = document.createElement('script');
          s.src = url; s.async = true;
          s.onerror = function(){ if(!done){ done = true; try{ delete window[cb]; }catch(e){} resolve(null); } };
          document.head.appendChild(s);
          setTimeout(function(){ if(!done){ done = true; try{ delete window[cb]; }catch(e){} try{ s.remove(); }catch(e2){} resolve(null); } }, 15000);
        } catch(e){ resolve(null); }
      });
    }
    /* Individual fallbacks, keyed by what each homepage block needs. These
       fire only when the homepage_init composite itself is unreachable —
       each is a real public GET the block used before the composite. */
    var FALLBACKS = {
      briefing: ['daily_content', {}],
      orders: ['raid_turnout', {}],
      stats: ['social_proof', {}],
      tribes: ['quiz_tribes', {}],
      vote: ['results', {}]
    };
    window.PF.homepageInit = function(force){
      var now = Date.now();
      if (!force && cache && (now - cacheAt) < 60000) return Promise.resolve(cache);
      if (inflight) return inflight;
      inflight = jsonp('homepage_init', {}).then(function(d){
        if (d && (d.briefing || d.orders || d.stats)) {
          cache = d; cacheAt = Date.now(); inflight = null;
          return d;
        }
        /* Composite missing/empty — fan out in parallel. */
        var keys = Object.keys(FALLBACKS);
        return Promise.all(keys.map(function(k){
          var f = FALLBACKS[k];
          return jsonp(f[0], f[1]).then(function(r){ return [k, r]; });
        })).then(function(pairs){
          var out = {};
          pairs.forEach(function(p){ out[p[0]] = p[1]; });
          cache = out; cacheAt = Date.now(); inflight = null;
          return out;
        });
      }).catch(function(){
        inflight = null;
        return cache || {};
      });
      return inflight;
    };
    /* Pre-warm the composite on page init: one call on load, shared by every
       block via the 60s cache + inflight dedup. */
    try { if (!isEditor()) window.PF.homepageInit(); } catch (e) {}
  })();

  /* === HOMEPAGE ORDER (v3) ===
     7 blocks. Moved widgets live on dedicated pages (see spec).
     Integrated widgets render compact inline inside their parent block. */
  var ORDER = [
    ['hero', 'pf-ov-hero'],
    ['socialproof', 'pf-ov-socialproof'],
    ['brief', 'pf-ov-brief'],
    ['daily-orders', 'pf-ov-orders'],
    ['slr-match-quiz', 'pf-ov-matchquiz'],
    ['fan-vote', 'pf-ov-vote'],
    ['closer', 'pf-ov-closer']
  ];

  /* === SECTION HEADERS (v3) ===
     3 flow groups. No "Section N of 7" kickers, no rules — just clean titles.
     bundle = lazy bundle the footer loader fetches (sec1 already critical). */
  var SECTIONS = [
    { id: 'start', title: '',
      sub: '',
      first: 'hero', bundle: 'games/bundle-sec1.js' },
    { id: 'discover', title: 'DISCOVER',
      sub: 'Find your fight.',
      first: 'slr-match-quiz', bundle: 'games/bundle-home.js' },
    { id: 'proof', title: 'PROOF',
      sub: 'The network is real.',
      first: 'fan-vote', bundle: 'games/bundle-home.js' }
  ];

  /* === COMPANION LINKS (v3) ===
     "Next up" cross-links per block. Targets are silo keys (smooth-scrolled
     via PF.gotoSilo); a target starting with '/' is a URL. */
  var NEXT_LINKS = {
    'hero': [['See how it works \u2192', 'brief']],
    'socialproof': [['Vote for your favorite \u2192', 'fan-vote'], ['Get your missions \u2192', 'daily-orders']],
    'brief': [['Get your missions \u2192', 'daily-orders']],
    'daily-orders': [['Find your match \u2192', 'slr-match-quiz'], ['Explore the machine \u2192', 'closer']],
    'slr-match-quiz': [['Meet all 62 fighters \u2192', '/sick-left-radicals'], ['Play the full arcade \u2192', '/arcade']],
    'fan-vote': [['Explore the machine \u2192', 'closer']],
    'closer': []
  };

  /* Silo -> section id. */
  var SILO_SEC = {
    'hero': 'start',
    'socialproof': 'start',
    'brief': 'start',
    'daily-orders': 'start',
    'slr-match-quiz': 'discover',
    'fan-vote': 'proof',
    'closer': 'proof'
  };

  /* Templates for the two static blocks (hero, closer). Widget templates
     come from their bundles; these two are defined here. */
  var STATIC_TEMPLATES = {
    'hero': 'pf-ov-hero',
    'closer': 'pf-ov-closer'
  };

  function stageStaticTemplates() {
    var holder = (PF && PF.holder) ? PF.holder() : document.body;
    if (!document.getElementById('pf-ov-hero')) {
      holder.insertAdjacentHTML('beforeend',
        '<template id="pf-ov-hero"><div class="fe-block pf-override-block">' + heroHTML() + '<' + '/div></template>');
    }
    if (!document.getElementById('pf-ov-closer')) {
      holder.insertAdjacentHTML('beforeend',
        '<template id="pf-ov-closer"><div class="fe-block pf-override-block">' + closerHTML() + '<' + '/div></template>');
    }
  }

  /* Build the 3 section blocks at init: header + lazy-load anchor each. */
  function initSections() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    if (h.querySelector('.pf-section-head')) return;
    SECTIONS.forEach(function (s) {
      if (!s.title) {
        /* start section: no header, just the anchor */
        var a0 = document.createElement('div');
        a0.className = 'pf-sec-anchor';
        a0.setAttribute('data-sec', s.id);
        a0.setAttribute('data-bundle', s.bundle);
        a0.style.cssText = 'height:1px;width:1px;';
        h.appendChild(a0);
        return;
      }
      var div = document.createElement('div');
      div.className = 'pf-section-head';
      div.setAttribute('data-sec', s.id);
      var title = document.createElement('div');
      title.className = 'pf-sh-title';
      title.textContent = s.title;
      var sub = document.createElement('div');
      sub.className = 'pf-sh-sub';
      sub.textContent = s.sub;
      div.appendChild(title); div.appendChild(sub);
      h.appendChild(div);
      var a = document.createElement('div');
      a.className = 'pf-sec-anchor';
      a.setAttribute('data-sec', s.id);
      a.setAttribute('data-bundle', s.bundle);
      a.style.cssText = 'height:1px;width:1px;';
      h.appendChild(a);
    });
  }

  /* Boots-on-the-Ground nudge card: static, minimal. Injected after fan-vote. */
  function mountEventsNudge() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    if (h.querySelector('.pf-events-nudge')) return;
    var card = document.createElement('div');
    card.className = 'pf-events-nudge';
    card.style.cssText = 'max-width:min(680px,94vw);margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;' +
      'background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);' +
      'border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;';
    card.innerHTML =
      '<div style="font-size:12px;letter-spacing:4px;color:#e5383b;font-weight:800;margin-bottom:6px;">BOOTS ON THE GROUND</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:24px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;">Take it to the streets.</div>' +
      '<div style="font-size:14px;color:#a89e88;line-height:1.5;margin-bottom:14px;">Phonebanks, canvasses, protests, meetups — the fight isn\u2019t only online. +50 XP per RSVP.</div>' +
      '<a href="/events" style="display:inline-block;min-height:44px;line-height:44px;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:0 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">SEE WHAT\u2019S HAPPENING \u2192</a>';
    var voteSec = h.querySelector('section[data-game="fan-vote"]');
    if (voteSec && voteSec.parentNode === h) {
      voteSec.parentNode.insertBefore(card, voteSec.nextSibling);
    } else {
      var closerSec = h.querySelector('section[data-game="closer"]');
      if (closerSec) h.insertBefore(card, closerSec);
      else h.appendChild(card);
    }
  }

  function mountHeaders() { try { initSections(); } catch (e) {} }

  /* Inject "Next up" companion links into each mounted block. */
  function mountNextLinks() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    Object.keys(NEXT_LINKS).forEach(function (silo) {
      var sec = h.querySelector('section[data-game="' + silo + '"]');
      if (!sec || sec.querySelector(':scope > .pf-next, :scope > div > .pf-next')) return;
      var links = NEXT_LINKS[silo];
      if (!links || !links.length) return;
      var box = document.createElement('div');
      box.className = 'pf-next';
      var label = document.createElement('div');
      label.className = 'pf-next-label';
      label.textContent = 'Next up';
      box.appendChild(label);
      links.forEach(function (pair) {
        var text = pair[0], target = pair[1];
        var a = document.createElement('a');
        a.className = 'pf-next-link';
        a.textContent = text;
        if (target.charAt(0) === '/') {
          a.href = target;
        } else {
          a.href = '#';
          a.setAttribute('data-goto', target);
        }
        box.appendChild(a);
      });
      var card = sec.firstElementChild;
      if (card && card.tagName === 'DIV') card.appendChild(box);
      else sec.appendChild(box);
    });
  }

  function bindNextLinks() {
    var h = document.getElementById('pf-v2');
    if (!h || h._pfNextBound) return;
    h._pfNextBound = true;
    h.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('.pf-next-link[data-goto]') : null;
      if (a) {
        ev.preventDefault();
        var target = a.getAttribute('data-goto');
        if (target && window.PF && PF.gotoSilo) PF.gotoSilo(target);
        return;
      }
      /* Hero CTA: open the callsign claim flow. */
      var cta = ev.target && ev.target.closest ? ev.target.closest('#pf-hero-cta') : null;
      if (cta) {
        ev.preventDefault();
        try {
          if (window.PF && PF.requireCallsign) { PF.requireCallsign(); return; }
        } catch (e) {}
        window.location.href = '/request-access';
        return;
      }
      /* Hero "how it works": smooth scroll to brief. */
      var how = ev.target && ev.target.closest ? ev.target.closest('#pf-hero-how') : null;
      if (how) {
        ev.preventDefault();
        try {
          var b = h.querySelector('section[data-game="brief"]');
          if (b && b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth' });
        } catch (e) {}
      }
    });
  }

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) {
        err('inner script failed in ' + label, e);
        try {
          var loads = root.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
          for (var j = 0; j < loads.length; j++) {
            var d = document.createElement('div');
            d.style.cssText = 'border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;';
            d.innerHTML = 'This widget failed to start. ' +
              '<button style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;min-height:44px;" onclick="location.reload()">Reload</button>';
            if (loads[j].parentNode) loads[j].parentNode.replaceChild(d, loads[j]);
          }
        } catch (e2) {}
      }
      scripts[i].remove();
    }
  }

  var mounted = {};
  function placeWidget(h, section, silo) {
    try {
      var secId = SILO_SEC[silo];
      var idx = -1;
      for (var i = 0; i < SECTIONS.length; i++) {
        if (SECTIONS[i].id === secId) { idx = i; break; }
      }
      if (idx >= 0 && idx + 1 < SECTIONS.length) {
        var nextHead = h.querySelector('.pf-section-head[data-sec="' +
          SECTIONS[idx + 1].id + '"]');
        if (nextHead) { h.insertBefore(section, nextHead); return; }
      }
      h.appendChild(section);
    } catch (e) { try { h.appendChild(section); } catch (e2) {} }
  }
  function mountSilos() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return 0;
    var n = 0;
    ORDER.forEach(function (pair) {
      var silo = pair[0], tplId = pair[1];
      if (mounted[silo]) return;
      if (PF && PF.skip(silo)) { mounted[silo] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) return;
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        placeWidget(h, section, silo);
        execScripts(section, tplId);
        mounted[silo] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[silo] = 1; }
    });
    return n;
  }

  if (PF && !PF.mountSilos) PF.mountSilos = mountSilos;
  try { stageStaticTemplates(); } catch (e) {}
  try { initSections(); } catch (e) {}
  mountSilos();
  try { bindNextLinks(); mountNextLinks(); mountEventsNudge(); } catch (e) {}
  /* Hero network reach (P0 fix 2026-10-05): paint live creator/network counts
     over the [data-pf-fc-total] snapshot fallback in the hero. Fail-soft —
     snapshot text stays if the backend is unreachable. Mirrors slr-roster. */
  try {
    if (window.PF && PF.creatorStats) PF.creatorStats.ready(function () {
      try { PF.creatorStats.paint(document); } catch (e) {}
    });
  } catch (e2) {}

  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountSilos(); } catch(e){}
      try { mountHeaders(); mountNextLinks(); mountEventsNudge(); } catch(e){}
      var allDone = true;
      for (var i = 0; i < ORDER.length; i++) {
        if (!mounted[ORDER[i][0]]) { allDone = false; break; }
      }
      if (allDone || tries >= 15 || n === 0 && tries >= 5) {
        clearInterval(iv);
      }
    }, 2000);
  })();

})();
