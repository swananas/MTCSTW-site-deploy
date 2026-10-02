/* pages/home-v2.js  |  PF v1.4.1 | Mounts 12 section templates wherever the <div id="pf-v2"></div> shell
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

  /* Homepage order, verified against the live page's section roots.
     Daily Orders leads: it's the stickiest dopamine lynchpin. */
  /* 2026-10-02: homepage reorganized into 7 funnel sections —
     START HERE (hook→daily loop→identity) → PLAY (games) → BELONG (cells) →
     CREATE (creator tools) → FUND (economy) → ACT (action/intel) → PROOF.
     Each section flows into the next; related products stay together.
     vault (admin) and dash (creator analytics) removed from homepage —
     vault via direct URL, dash belongs in Creator HQ. */
  var ORDER = [
    /* ——— SECTION 1: START HERE — hook & daily loop ——— */
    ['brief', 'pf-ov-brief'],
    ['do-meter', 'pf-ov-dometer'],
    ['daily-orders', 'pf-ov-orders'],
    ['dopa', 'pf-ov-dopa'],
    ['enlistment-ranks', 'pf-ov-ranks'],
    ['notify', 'pf-ov-notify'],
    ['socialproof', 'pf-ov-socialproof'],
    /* ——— SECTION 2: PLAY — games arcade, quick wins first ——— */
    ['caption-combat', 'pf-ov-caption'],
    ['creator-guess', 'pf-ov-guess'],
    ['slr-match-quiz', 'pf-ov-matchquiz'],
    ['daily-interrogation', 'pf-ov-interrogation'],
    ['billionaire-supervillain', 'pf-ov-billionaire'],
    ['bracket-board', 'pf-ov-bracket'],
    ['boost-raid', 'pf-ov-raid'],
    ['daily-drop', 'pf-ov-drop'],
    ['battles', 'pf-ov-battles'],
    ['infighting', 'pf-ov-infight'],
    ['media-nuke', 'pf-ov-nuke'],
    ['casino', 'pf-ov-casino'],
    /* ——— SECTION 3: BELONG — cells & squads lifecycle ——— */
    ['cells', 'pf-ov-cells'],
    ['cell-war', 'pf-ov-cellwar'],
    ['diplo', 'pf-ov-diplo'],
    ['contracts', 'pf-ov-contracts'],
    ['referral', 'pf-ov-referral'],
    ['governance', 'pf-ov-gov'],
    /* ——— SECTION 4: CREATE — creator tools journey ——— */
    ['academy', 'pf-ov-academy'],
    ['assist', 'pf-ov-assist'],
    ['poster-forge', 'pf-ov-poster'],
    ['video', 'pf-ov-video'],
    ['feed', 'pf-ov-feed'],
    ['amplify', 'pf-ov-amplify'],
    ['hq-nudge', 'pf-ov-hq-nudge'],
    /* ——— SECTION 5: FUND — economy & money ——— */
    ['peoplesbank', 'pf-ov-peoplesbank'],
    ['economy', 'pf-ov-economy'],
    ['war-bonds', 'pf-ov-bonds'],
    ['movement', 'pf-ov-movement'],
    ['earnings', 'pf-ov-earnings'],
    ['bounties', 'pf-ov-bounties'],
    ['ventures', 'pf-ov-ventures'],
    /* ——— SECTION 6: ACT — action & intel ——— */
    ['campaign', 'pf-ov-campaign'],
    ['alerts', 'pf-ov-alerts'],
    ['irl', 'pf-ov-irl'],
    ['intel', 'pf-ov-intel'],
    ['archive', 'pf-ov-archive'],
    ['civic', 'pf-ov-civic'],
    /* ——— SECTION 7: PROOF — social validation closer ——— */
    ['fan-vote', 'pf-ov-vote']
  ];

  /* === SECTION HEADERS (2026-10-02) ===
     The 7 funnel sections, rendered as visible headers. Each entry names
     the first widget silo of its section; the header is injected before it. */
  var SECTIONS = [
    { id: 'start-here', num: 1, ico: '\uD83D\uDD30', title: 'START HERE',
      sub: 'Your daily briefing, missions, and rank. Begin here every day.',
      first: 'brief' },
    { id: 'play', num: 2, ico: '\uD83C\uDFAE', title: 'PLAY',
      sub: 'Twelve games. Quick wins first, rabbit holes last.',
      first: 'caption-combat' },
    { id: 'belong', num: 3, ico: '\uD83C\uDFF4', title: 'BELONG',
      sub: 'Join a cell. Fight the war. Recruit your friends.',
      first: 'cells' },
    { id: 'create', num: 4, ico: '\uD83D\uDEE0\uFE0F', title: 'CREATE',
      sub: 'Learn, build, publish. The propaganda workshop.',
      first: 'academy' },
    { id: 'fund', num: 5, ico: '\uD83D\uDCB0', title: 'FUND',
      sub: 'The people\u2019s economy. Fund the fight, see where it goes.',
      first: 'peoplesbank' },
    { id: 'act', num: 6, ico: '\u26A1', title: 'ACT',
      sub: 'Campaigns, alerts, and intel. The fight off-screen.',
      first: 'campaign' },
    { id: 'proof', num: 7, ico: '\uD83D\uDCE3', title: 'PROOF',
      sub: 'The network is real. Vote, and see it move.',
      first: 'fan-vote' }
  ];

  /* === COMPANION LINKS (2026-10-02) ===
     "Next up" cross-links per widget: silo -> [[link text, target silo], ...].
     Injected centrally so no widget file needs editing. Targets are silo keys
     (smooth-scrolled via PF.gotoSilo); a target starting with '/' is a URL. */
  var NEXT_LINKS = {
    'brief': [['Get your missions \u2192', 'daily-orders'], ['See the network total \u2192', 'do-meter']],
    'do-meter': [['Add to the total \u2192', 'daily-orders'], ['See who\u2019s moving \u2192', 'socialproof']],
    'daily-orders': [['Claim your loot \u2192', 'dopa']],
    'dopa': [['Protect the streak \u2192', 'daily-orders'], ['Check your rank \u2192', 'enlistment-ranks']],
    'enlistment-ranks': [['Recruit and rank up faster \u2192', 'referral'], ['Join a cell \u2192', 'cells']],
    'notify': [['Set your missions \u2192', 'daily-orders']],
    'socialproof': [['Vote for your favorite \u2192', 'fan-vote'], ['Join the action \u2192', 'daily-orders']],
    'caption-combat': [['Turn it into a meme \u2192', 'poster-forge'], ['Battle it head-to-head \u2192', 'battles']],
    'creator-guess': [['Find your match \u2192', 'slr-match-quiz'], ['Test your knowledge \u2192', 'daily-interrogation']],
    'slr-match-quiz': [['Meet your match \u2192', 'fan-vote'], ['Follow them off-site \u2192', 'feed']],
    'daily-interrogation': [['Level up \u2192', 'academy'], ['Guess the creator \u2192', 'creator-guess']],
    'billionaire-supervillain': [['Liquidate one \u2192', 'bracket-board'], ['Share the verdict \u2192', 'media-nuke']],
    'bracket-board': [['Raid for your pick \u2192', 'boost-raid'], ['Vote daily \u2192', 'fan-vote']],
    'boost-raid': [['Make a poster for the raid \u2192', 'poster-forge'], ['Nuke it across platforms \u2192', 'media-nuke']],
    'daily-drop': [['Discuss the drop \u2192', 'feed'], ['Forge a response \u2192', 'poster-forge']],
    'battles': [['Forge a better poster \u2192', 'poster-forge'], ['Make it a video \u2192', 'video']],
    'infighting': [['Back your fighter \u2192', 'fan-vote'], ['Boost the signal \u2192', 'boost-raid']],
    'media-nuke': [['Track the blast \u2192', 'do-meter'], ['Make more ammo \u2192', 'poster-forge']],
    'casino': [['Deposit your winnings \u2192', 'peoplesbank'], ['Take a break, do a mission \u2192', 'daily-orders']],
    'cells': [['See the war \u2192', 'cell-war'], ['Find allies \u2192', 'diplo']],
    'cell-war': [['Coordinate with allies \u2192', 'diplo'], ['Recruit fighters \u2192', 'referral']],
    'diplo': [['Back it with a contract \u2192', 'contracts'], ['Return to your cell \u2192', 'cells']],
    'contracts': [['Get paid \u2192', 'peoplesbank'], ['Post a bounty \u2192', 'bounties']],
    'referral': [['Watch them rank up \u2192', 'enlistment-ranks'], ['Bring them to your cell \u2192', 'cells']],
    'academy': [['Use what you learned \u2192', 'assist'], ['Test yourself \u2192', 'daily-interrogation']],
    'assist': [['Forge a poster \u2192', 'poster-forge'], ['Plan your week \u2192', 'feed']],
    'poster-forge': [['Battle it \u2192', 'battles'], ['Amplify it \u2192', 'amplify']],
    'video': [['Share the cut \u2192', 'media-nuke'], ['Post it \u2192', 'feed']],
    'feed': [['Amplify a post \u2192', 'amplify'], ['Boost the raid \u2192', 'boost-raid']],
    'amplify': [['Forge something to boost \u2192', 'poster-forge'], ['Check the economy \u2192', 'economy']],
    'hq-nudge': [['See what you\u2019d unlock \u2192', '/request-access']],
    'peoplesbank': [['Fund the fight \u2192', 'war-bonds'], ['Back a venture \u2192', 'movement']],
    'economy': [['Spend your XP \u2192', 'casino'], ['Check your balance \u2192', 'peoplesbank']],
    'war-bonds': [['Manage your bonds \u2192', 'peoplesbank'], ['See where it goes \u2192', 'movement']],
    'movement': [['Buy a bond \u2192', 'war-bonds'], ['Earn by doing \u2192', 'bounties']],
    'earnings': [['Start earning \u2192', 'bounties'], ['Open a bank account \u2192', 'peoplesbank']],
    'bounties': [['Get paid \u2192', 'peoplesbank'], ['Bigger jobs \u2192', 'contracts']],
    'campaign': [['Get the alert \u2192', 'alerts'], ['Take it to the streets \u2192', 'irl']],
    'alerts': [['Know the terrain \u2192', 'intel'], ['Make a poster \u2192', 'poster-forge']],
    'irl': [['Log it for XP \u2192', 'daily-orders'], ['Report back \u2192', 'feed']],
    'intel': [['Act on it \u2192', 'alerts'], ['Brief your cell \u2192', 'cells']],
    'archive': [['Remix one \u2192', 'poster-forge'], ['Nuke a classic \u2192', 'media-nuke']],
    'fan-vote': [['See live activity \u2192', 'socialproof'], ['Back your pick in battle \u2192', 'infighting']]
  };

  /* Inject section headers before each section's first widget.
     Idempotent: skips sections that already have a header. */
  function mountHeaders() {
    var h = document.getElementById('pf-v2');
    if (!h || isEditor()) return;
    SECTIONS.forEach(function (s) {
      if (h.querySelector('.pf-section-head[data-sec="' + s.id + '"]')) return;
      var anchor = h.querySelector('section[data-game="' + s.first + '"]');
      if (!anchor) return; /* first widget not mounted yet — try next pass */
      var div = document.createElement('div');
      div.className = 'pf-section-head';
      div.setAttribute('data-sec', s.id);
      var kicker = document.createElement('div');
      kicker.className = 'pf-sh-kicker';
      kicker.textContent = 'Section ' + s.num + ' of ' + SECTIONS.length;
      var title = document.createElement('div');
      title.className = 'pf-sh-title';
      var ico = document.createElement('span');
      ico.className = 'pf-sh-ico';
      ico.textContent = s.ico;
      title.appendChild(ico);
      title.appendChild(document.createTextNode(s.title));
      var rule = document.createElement('div');
      rule.className = 'pf-sh-rule';
      var sub = document.createElement('div');
      sub.className = 'pf-sh-sub';
      sub.textContent = s.sub;
      div.appendChild(kicker); div.appendChild(title);
      div.appendChild(rule); div.appendChild(sub);
      h.insertBefore(div, anchor);
    });
  }

  /* Inject "Next up" companion links into each mounted widget.
     Idempotent: skips widgets that already have .pf-next. */
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
      /* Append inside the widget card (first child div) so it reads as
         part of the widget; fall back to the section itself. */
      var card = sec.firstElementChild;
      if (card && card.tagName === 'DIV') card.appendChild(box);
      else sec.appendChild(box);
    });
  }

  /* Click delegation for companion links — one listener for the whole page. */
  function bindNextLinks() {
    var h = document.getElementById('pf-v2');
    if (!h || h._pfNextBound) return;
    h._pfNextBound = true;
    h.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('.pf-next-link[data-goto]') : null;
      if (!a) return;
      ev.preventDefault();
      var target = a.getAttribute('data-goto');
      if (target && window.PF && PF.gotoSilo) PF.gotoSilo(target);
    });
  }

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { err('inner script failed in ' + label, e); }
      scripts[i].remove();
    }
  }

  /* Idempotent mounter — safe to call repeatedly. Lazy bundles call
     PF.mountSilos() after staging their templates so newly-available
     silos mount in ORDER without re-mounting existing ones.
     Missing templates are normal (bundle not loaded yet / silo killed). */
  var mounted = {};
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
        if (!tpl || !tpl.content) return; /* bundle not staged yet — try next call */
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        h.appendChild(section);
        execScripts(section, tplId);
        mounted[silo] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[silo] = 1; }
    });
    return n;
  }

  /* Expose for lazy bundles. Guarded: only defined once. */
  if (PF && !PF.mountSilos) PF.mountSilos = mountSilos;
  mountSilos();
  try { bindNextLinks(); mountHeaders(); mountNextLinks(); } catch (e) {}

  /* Race-condition guard: if lazy bundles staged templates before this file
     defined PF.mountSilos, the loader's onload skipped the mount. Retry until
     all ORDER silos are mounted (or 30s elapses). */
  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountSilos(); } catch(e){}
      try { mountHeaders(); mountNextLinks(); } catch(e){}
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
