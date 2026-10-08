/* core/20-nextop.js  |  PF v1.4.3 | NEXT OP (S4) — context-aware next-action card.
   Every page ends with the single best thing to do next, personalized to
   what the visitor hasn't done today. No page is a dead end.
   2026-10-06 COHESION P0: upgraded to the spec's Next Move ladder
   (orders report-back -> blitz mission -> phase nudge -> predictions ->
   bounties -> streak -> circulation); psych copy constraints applied
   (no loss framing, no shaming); terminal-state API added — surfaces
   dispatch `pf:terminal` (or call PF.nextMove.render) for in-place cards
   at game-over / certificate / vote / quiz / RSVP / pledge states.
   FRONTEND-ONLY, ZERO NEW XP — pure routing. Reads compose the existing
   reads: dopamine_status (loot + streak + flash), streak_status,
   cell_mine, xp_today, plus W5-2 briefing reads: op_briefing_status
   (60s client-side cache), ambush_status, warword_status, circuit_status.
   No new backend actions, no writes of any kind.
   Mount: inserted in-flow immediately BEFORE the site footer element, i.e.
   below the page's primary content and above the injected footer chrome
   (crossnav strip / DELETE MY DATA / nuke meter). Retries until a footer
   lands (Squarespace lazy-renders footers on commerce + system pages).
   LAYERING: core-level UI injection, same pattern as 16-footer.js /
   19-crossnav.js. No page dependency — runs on every page, v2 and v1.1.0.
   (On v1.1.0-branch pages it ships in core/bundle-footer-chrome.js, which
   carries the same minimum runtime: PF bus + backend URL + identity.)
   KILL: ?pf_off=nextop  or  localStorage pf_disabled_v1='["nextop"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('nextop')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  /* W5-2 Midnight Briefing (2026-10-04): module-level 60s client-side
     cache for op_briefing_status — the live flag is the time-window
     routing rule's switch. */
  var _briefCache = { t: 0, v: null };
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* JSONP GET for reads. Routed through PF.authGetJSONP when present (gated
     reads self-heal auth like the other silos); plain JSONP fallback. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params, cb); return; }
    } catch (e) {}
    try {
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
      if (_sec && params && !params.auth_secret) params.auth_secret = _sec;
    } catch (e2) {}
    var fn = 'pfNoCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* ---- page detection: mount-div ids first, path fallback ---- */
  var PAGE_IDS = ['pf-v2', 'pf-arcade', 'pf-cells-page', 'pf-create', 'pf-bank',
    'pf-economy', 'pf-warchest', 'pf-ventures', 'pf-events', 'pf-warreport',
    'pf-catalog', 'pf-slr-roster', 'pf-war-card', 'pf-political-hq'];
  function pageKey() {
    try {
      for (var i = 0; i < PAGE_IDS.length; i++) {
        if (document.getElementById(PAGE_IDS[i])) return PAGE_IDS[i];
      }
      var p = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
      var map = { '/': 'pf-v2', '/arcade': 'pf-arcade', '/cells': 'pf-cells-page',
        '/create': 'pf-create', '/bank': 'pf-bank', '/economy': 'pf-economy',
        '/war-chest': 'pf-warchest', '/ventures': 'pf-ventures',
        '/events': 'pf-events', '/war-report': 'pf-warreport',
        '/sick-left-radicals': 'pf-slr-roster' };
      if (map[p]) return map[p];
    } catch (e) {}
    return 'default';
  }

  /* ---- op catalog: {ready, done} evaluated against state; first not-done wins ---- */
  var OPS = {
    streakrisk: {
      /* Cohesion §5 copy standard (Psych, binding): streaks never feel like
         punishment. The run is still standing — the check-in is the
         fighter's own move. Never "or the streak breaks" threat framing. */
      title: 'YOUR RUN IS STILL STANDING', cta: 'KEEP IT ROLLING \u2192', href: '/',
      ready: function (st) { return st.streakRisk !== null; },
      done: function (st) { return !st.streakRisk; },
      /* Cohesion P0 (2026-10-06): psych constraint — never loss-framed.
         "Keep it going", never "don't lose it". */
      sub: function (st) { return 'Keep it going — one check-in before midnight Chicago.'; }
    },
    loot: {
      title: 'THE CRATE IS LOADED', cta: 'OPEN THE CRATE \u2192', href: '/',
      ready: function (st) { return st.lootClaimed !== null; },
      done: function (st) { return st.lootClaimed; },
      sub: function (st) { return 'Today\u2019s supply crate sits unclaimed. Midnight Chicago, it resets.'; }
    },
    streak: {
      /* §5: invitational, not protection-racket framing. */
      title: 'KEEP THE RUN ROLLING', cta: 'CHECK IN \u2192', href: '/',
      ready: function (st) { return st.streakChecked !== null; },
      done: function (st) { return st.streakChecked; },
      sub: function (st) {
        return (st.streakCount > 0 ? st.streakCount + '-day run. ' : '') +
          'One tap keeps it rolling.';
      }
    },
    /* W2-D4 (Wave 6B): "cells hiring" rule — cell-less users get a cells op.
       (The cellnone rule already existed; retitled to the hiring framing.) */
    cellnone: {
      title: 'CELLS ARE HIRING', cta: 'FIND YOUR CELL \u2192', href: '/cells',
      ready: function (st) { return st.cellIn !== null; },
      done: function (st) { return st.cellIn; },
      sub: function (st) { return 'No cell, no squad XP. Join one or build your own.'; }
    },
    cellcheck: {
      title: 'YOUR CELL NEEDS YOU', cta: 'CHECK IN \u2192', href: '/cells',
      ready: function (st) { return st.cellIn !== null && st.cellChecked !== null; },
      done: function (st) { return !st.cellIn || st.cellChecked; },
      sub: function (st) { return 'Your cell hasn\u2019t checked in today. First tap starts the cell streak.'; }
    },
    /* ---- Cohesion P0 (2026-10-06): spec-ladder rungs. First match wins.
       Priority: orders report-back -> blitz mission -> phase nudge ->
       predictions -> bounties -> streak -> circulation. Zero new XP —
       every rung routes to an existing faucet. ---- */
    orders: {
      title: 'ORDERS AWAIT DEBRIEF', cta: 'REPORT BACK \u2192', href: '/#pf-orders',
      ready: function (st) { return st.opDone !== null; },
      done: function (st) { return !!st.opDone; },
      sub: function () { return 'Today\u2019s missions are done. Report back to log them on the record.'; }
    },
    blitz: {
      title: 'BLITZ MISSION LIVE', cta: 'TODAY\u2019S MISSION \u2192', href: '/',
      ready: function (st) { return st.blitzActive === true && st.blitzActed !== null; },
      done: function (st) { return !!st.blitzActed; },
      sub: function (st) {
        return 'Day ' + (st.blitzDay || '?') + ' of the Midterm Blitz. One mission moves the line.';
      }
    },
    train: {
      title: 'FINISH BASIC TRAINING', cta: 'NEXT LESSON \u2192', href: '/academy',
      ready: function (st) { return st.graduated !== null; },
      done: function (st) { return !!st.graduated; },
      sub: function () { return 'Learn the tools once, fight forever. Pick up where you left off.'; }
    },
    predict: {
      title: 'THE BOARD IS OPEN', cta: 'MAKE THE CALL \u2192', href: '/follow-the-money',
      ready: function (st) { return st.openPredicts !== null && st.openPredicts > 0; },
      done: function () { return false; },
      sub: function (st) {
        return st.openPredicts + ' open question' + (st.openPredicts === 1 ? '' : 's') +
          ' on the board. Call it like you see it.';
      }
    },
    bounty: {
      title: 'OPEN BOUNTY ON THE BOARD', cta: 'EARN IT \u2192', href: '/data-bounties',
      ready: function (st) { return st.openBounties !== null && st.openBounties > 0; },
      done: function () { return false; },
      sub: function (st) {
        return st.openBounties + ' open bount' + (st.openBounties === 1 ? 'y' : 'ies') +
          ' — the movement needs hands, not just eyes.';
      }
    },
    catchup: {
      title: 'CATCH UP ON THE WAR', cta: 'READ THE REPORT \u2192', href: '/war-report',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return 'This week in the fight, distilled. Thirty seconds, then move.'; }
    },
    xpzero: {
      title: 'FIRST POINTS TODAY', cta: 'MAKE SOMETHING \u2192', href: '/create',
      ready: function (st) { return st.xpToday !== null; },
      done: function (st) { return st.xpToday > 0; },
      /* Cohesion P0 (2026-10-06): psych — no shaming ("you're flat" cut). */
      sub: function (st) { return 'Put the first points on the board — forge one poster.'; }
    },
    flash: {
      title: 'FLASH MULTIPLIER LIVE', cta: 'RIDE THE FLASH \u2192', href: '/',
      ready: function (st) { return st.flashKnown; },
      done: function (st) { return !st.flash; },
      sub: function (st) {
        return st.flash ? esc(st.flash.label || 'Flash event') + ' \u00D7' + (st.flash.mult || 2) +
          ' \u2014 ride it before it burns out.' : '';
      }
    },
    /* W5-2 Midnight Briefing ops: unclaimed briefing-window systems, routed
       above the normal priority list while op_briefing_status reports live.
       Spec order: ambush drop -> riddle refresh -> route march night leg. */
    briefambush: {
      title: 'TONIGHT\u2019S AMBUSH DROP', cta: 'CLAIM THE DROP \u2192', href: '/',
      ready: function (st) { return st.briefLive === true && st.ambushLive === true; },
      done: function (st) { return st.ambushClaimed === true; },
      sub: function () { return 'Limited claim slots — gone at 22:00 Chicago whether you move or not.'; }
    },
    briefriddle: {
      title: 'DEAD-DROP RIDDLE ROTATED', cta: 'CRACK THE RIDDLE \u2192', href: '/',
      ready: function (st) { return st.briefLive === true && st.riddleActive === true; },
      done: function (st) { return st.riddleClaimed === true; },
      sub: function () { return 'Tonight\u2019s warword expires at 22:00 Chicago. Speak it.'; }
    },
    briefnight: {
      title: 'NIGHT PATROL: BONUS STOP', cta: 'PATROL THE NIGHT \u2192', href: '/',
      ready: function (st) { return st.briefLive === true && st.nightLeg === false; },
      done: function (st) { return st.nightLeg === true; },
      sub: function () { return 'Briefing-window bonus stop — hard expiry 22:00 Chicago.'; }
    },
    matchquiz: {
      title: 'FIND YOUR SLR MATCH', cta: 'TAKE THE QUIZ \u2192', href: '/arcade',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '5 questions. 3 creator matches. Know your lane.'; }
    },
    roster: {
      title: 'SCOUT THE ROSTER', cta: 'MEET THE RADICALS \u2192', href: '/sick-left-radicals',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '62 fighters strong. Find the one you\u2019d go to war with.'; }
    },
    recruit: {
      title: 'RECRUIT ONE SOLDIER', cta: 'GET YOUR LINK \u2192', href: '/cells',
      ready: function () { return true; },
      done: function () { return false; },
      sub: function () { return '+75 XP per recruit. Your cell grows, your war chest grows.'; }
    }
  };
  /* Per-page priority lists. Ops whose read failed are skipped (fail-open to
     the next op); circulation ops (matchquiz/roster/recruit) are always
     ready, so the card can never be a dead end. */
  /* Per-page priority lists. Cohesion P0 (2026-10-06): reordered to the spec
     ladder — orders report-back -> blitz mission -> phase nudge (train /
     cellnone) -> predictions -> bounties -> streak -> circulation.
     Ops whose read failed are skipped (fail-open to the next op);
     circulation ops (matchquiz/catchup) are always ready, so the card can
     never be a dead end. */
  var ORDER = {
    'pf-v2': ['orders', 'blitz', 'train', 'cellnone', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'loot', 'flash', 'xpzero', 'catchup', 'matchquiz'],
    'pf-arcade': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'pf-cells-page': ['orders', 'cellnone', 'cellcheck', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'catchup', 'recruit'],
    'pf-create': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'xpzero', 'cellcheck', 'catchup', 'matchquiz'],
    'pf-bank': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'pf-economy': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'pf-warchest': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'roster'],
    'pf-ventures': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'pf-events': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'pf-warreport': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'catchup', 'matchquiz'],
    'pf-catalog': ['orders', 'blitz', 'train', 'cellnone', 'predict', 'bounty', 'streakrisk', 'streak', 'catchup', 'roster'],
    'pf-slr-roster': ['orders', 'blitz', 'train', 'cellnone', 'predict', 'bounty', 'streakrisk', 'streak', 'catchup', 'matchquiz', 'roster'],
    'pf-war-card': ['orders', 'cellcheck', 'cellnone', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'catchup', 'recruit'],
    'pf-political-hq': ['orders', 'blitz', 'train', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz'],
    'default': ['orders', 'blitz', 'train', 'cellnone', 'predict', 'bounty', 'streakrisk', 'streak', 'cellcheck', 'xpzero', 'catchup', 'matchquiz']
  };
  /* W5-2 Midnight Briefing: while the window is live, unclaimed
     briefing-window systems route above the normal priority list. */
  var BRIEF_ORDER = ['briefambush', 'briefriddle', 'briefnight'];
  function pickOp(st) {
    if (st.briefLive === true) {
      for (var bi = 0; bi < BRIEF_ORDER.length; bi++) {
        var bop = OPS[BRIEF_ORDER[bi]];
        if (!bop) continue;
        try {
          if (bop.ready(st) && !bop.done(st)) return bop;
        } catch (e) {}
      }
    }
    var order = ORDER[pageKey()] || ORDER['default'];
    /* Pillar spine (2026-10-06, CEO directive): adventure-path bias. When the
       user has picked a fight, their path's ops bubble to the front of the
       ladder (stable — relative order preserved, briefing ops already
       returned above). Fail-open: PF.pillars absent or no path = no bias. */
    try {
      var _bias = (window.PF && PF.pillars && typeof PF.pillars.biasOps === 'function')
        ? PF.pillars.biasOps() : null;
      if (_bias && _bias.length) {
        var _bset = {}, _bfront = [], _brest = [];
        for (var _bi = 0; _bi < _bias.length; _bi++) _bset[_bias[_bi]] = 1;
        for (var _oi = 0; _oi < order.length; _oi++) {
          if (_bset[order[_oi]]) _bfront.push(order[_oi]); else _brest.push(order[_oi]);
        }
        if (_bfront.length) order = _bfront.concat(_brest);
      }
    } catch (e) {}
    for (var i = 0; i < order.length; i++) {
      var op = OPS[order[i]];
      if (!op) continue;
      try {
        if (op.ready(st) && !op.done(st)) return op;
      } catch (e) {}
    }
    return OPS.matchquiz;
  }

  /* ---- state assembly (reads only; every failure degrades to a skipped op) ---- */
  function loadState(id, cb) {
    var st = {
      lootClaimed: null, streakCount: 0, streakChecked: null, streakRisk: null,
      cellIn: null, cellChecked: null, xpToday: null, flash: null, flashKnown: false,
      /* Cohesion P0 (2026-10-06): spec-ladder reads. All fail open (null =
         unknown = op skipped) so a dead backend never dead-ends the card. */
      opDone: null, blitzActive: null, blitzActed: null, blitzDay: null,
      graduated: null, openPredicts: null, openBounties: null,
      /* W5-2 Midnight Briefing. briefLive===true flips pickOp into
         briefing-priority mode. Per-system claim fields stay null on read
         failure so their ops fail open (skipped) — never assumed done. */
      briefLive: null, ambushLive: null, ambushClaimed: null,
      riddleActive: null, riddleClaimed: null, nightLeg: null,
      blackoutLive: false
    };
    var pending = 14, guarded = false;
    /* Terminal: never leave the card waiting — every read path converges
       here exactly once, failures included (skipped ops fail open). */
    function fin() { if (guarded) return; guarded = true; cb(st); }
    function one() { if (--pending <= 0) fin(); }
    setTimeout(fin, 12000);
    api('dopamine_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          if (j.loot && j.loot.claimed_today !== undefined) st.lootClaimed = !!j.loot.claimed_today;
          if (j.streak) {
            st.streakCount = Number(j.streak.count || 0);
            st.streakRisk = !!j.streak.at_risk;
          }
          st.flashKnown = true;
          if (j.flash && j.flash.length) st.flash = { label: j.flash[0].label, mult: j.flash[0].multiplier };
        }
      } catch (e) {}
      one();
    });
    api('streak_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok && j.checked_in_today !== undefined) st.streakChecked = !!j.checked_in_today;
        if (j && j.ok && st.streakRisk === null && j.at_risk !== undefined) st.streakRisk = !!j.at_risk;
      } catch (e) {}
      one();
    });
    api('cell_mine', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          st.cellIn = !!j.in_cell;
          var cells = j.cells || [];
          if (cells.length && cells[0].checked_today !== undefined) st.cellChecked = !!cells[0].checked_today;
          else if (j.members) {
            for (var i = 0; i < j.members.length; i++) {
              if (String(j.members[i].callsign || '').toLowerCase() === String(id.callsign).toLowerCase() &&
                  j.members[i].checked_today !== undefined) {
                st.cellChecked = !!j.members[i].checked_today; break;
              }
            }
          }
        }
      } catch (e) {}
      one();
    });
    api('xp_today', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok && j.xp_today !== undefined) st.xpToday = Number(j.xp_today) || 0;
      } catch (e) {}
      one();
    });
    /* W5-2 Midnight Briefing reads. op_briefing_status rides the 60s
       module-level cache (the window moves slowly); the claim reads are
       fresh every load. All four fail open to skipped ops. */
    var _bcNow = Date.now();
    if (_briefCache.v !== null && (_bcNow - _briefCache.t) < 60000) {
      st.briefLive = _briefCache.v;
      one();
    } else {
      api('op_briefing_status', {}, function (j) {
        try {
          if (j && j.ok) {
            st.briefLive = !!j.live;
            _briefCache.t = Date.now(); _briefCache.v = !!j.live;
          }
        } catch (e) {}
        one();
      });
    }
    api('ambush_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          st.ambushLive = !!j.live;
          st.ambushClaimed = !!(j.drop && j.drop.claimed_by_you);
        }
      } catch (e) {}
      one();
    });
    api('warword_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        if (j && j.ok) {
          st.riddleActive = !!j.active;
          st.riddleClaimed = !!j.claimed;
        }
      } catch (e) {}
      one();
    });
    api('circuit_status', { callsign: id.callsign, device: id.device }, function (j) {
      try {
        /* night_leg_claimed lands with the circuit worker's contract
           (see /tmp/wave5a/nightleg_contract.txt); absent = unknown,
           so the night-patrol op stays skipped until then. */
        if (j && j.ok && j.night_leg_claimed !== undefined)
          st.nightLeg = !!j.night_leg_claimed;
      } catch (e) {}
      one();
    });
    /* Cohesion P0 (2026-10-06): spec-ladder reads. Every one fails open —
       unknown means the rung is skipped, never assumed done. */
    api('get', { callsign: id.callsign }, function (j) {
      try {
        if (j && j.ok && j.op_done !== undefined) st.opDone = !!j.op_done;
      } catch (e) {}
      one();
    });
    api('campaign_status', {}, function (j) {
      try {
        if (j && j.ok && j.campaign) {
          st.blitzActive = Number(j.campaign.days_left || 0) > 0;
          st.blitzDay = Number(j.campaign.day_offset || 0) + 1;
          if (j.my && j.my.actions_today !== undefined)
            st.blitzActed = Number(j.my.actions_today || 0) > 0;
          else st.blitzActed = false;
        }
      } catch (e) {}
      one();
    });
    api('academy_progress', { callsign: id.callsign }, function (j) {
      try {
        if (j && j.ok && j.graduated !== undefined) st.graduated = !!j.graduated;
      } catch (e) {}
      one();
    });
    api('predict_qlist', {}, function (j) {
      try {
        if (j && j.ok && j.questions) {
          var open = 0;
          for (var i = 0; i < j.questions.length; i++) {
            if (!j.questions[i].locked && !j.questions[i].resolved) open++;
          }
          st.openPredicts = open;
        } else if (j && j.ok) { st.openPredicts = 0; }
      } catch (e) {}
      one();
    });
    api('propbounty_list', {}, function (j) {
      try {
        if (j && j.ok && j.bounties) {
          var n = 0;
          for (var i = 0; i < j.bounties.length; i++) {
            if (j.bounties[i].status === 'open') n++;
          }
          st.openBounties = n;
        } else if (j && j.ok) { st.openBounties = 0; }
      } catch (e) {}
      one();
    });
    /* W5-11 Blackout: shadow mode — while a blackout op is live the NEXT OP
       card switches copy (no routing change, zero XP). Defensive flags read:
       works before and after the conductor's preset/flags schema lands. */
    api('operation_status', {}, function (j) {
      try {
        if (j && j.live === true) {
          var fl = j.flags;
          if (typeof fl === 'string') { try { fl = JSON.parse(fl); } catch (e) { fl = {}; } }
          fl = (fl && typeof fl === 'object') ? fl : {};
          st.blackoutLive = fl.blackout === true || String(j.preset || '') === 'blackout' ||
            /blackout/i.test(String(j.name || ''));
        }
      } catch (e) {}
      one();
    });
  }

  /* ---- card ---- */
  function cardHtml(op, st) {
    return '<div id="pf-nextop" style="max-width:720px;margin:28px auto;padding:0;background:#0a0a0a;' +
      'border:1px solid #333;border-top:4px solid #c1121f;box-sizing:border-box;' +
      'font-family:Arial,sans-serif;text-align:center;">' +
      '<div style="padding:20px 18px 18px;">' +
      '<div style="font-size:11px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;">NEXT OP</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:22px;letter-spacing:1px;' +
      'color:#f5ead6;margin:0 0 8px;">' + esc(op.title) + '</div>' +
      '<div style="font-size:14px;color:#a89e88;line-height:1.55;margin:0 0 14px;">' + esc(op.sub(st)) + '</div>' +
      '<a href="' + esc(op.href) + '" style="display:inline-block;background:#c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:0.12em;font-size:13px;text-decoration:none;' +
      'padding:12px 26px;border:2px solid #c1121f;">' + esc(op.cta) + '</a>' +
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path.
         Scoped to the enlist card (the claim prompt), not every nextop. */
      (function(){ try{ return (op.__claimPrompt && window.PF && window.PF.recoverLinkHTML) ? window.PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })() +
      '</div></div>';
  }

  /* ---- mount: in-flow, immediately before the site footer ---- */
  var FOOTER_SEL_ARR = [
    'footer', '.Footer', '#footer', '#footer-sections', '.Footer-inner',
    '.Footer-blocks', '[role="contentinfo"]', '.site-footer', '#site-footer',
    'section[class*="footer"]', 'section[class*="Footer"]',
    'div[class*="Footer"]', '[data-section-id*="footer" i]'
  ];
  var FOOTER_SELS = FOOTER_SEL_ARR.filter(function (sel) {
    try { document.querySelectorAll(sel); return true; } catch (e) { return false; }
  }).join(', ');
  function findFooter() {
    try {
      var fs = document.querySelectorAll(FOOTER_SELS);
      if (fs && fs.length) return fs[0];
    } catch (e) {}
    return null;
  }
  function place(html) {
    if (document.getElementById('pf-nextop')) return true;
    var footer = findFooter();
    if (!footer || !footer.parentNode) return false;
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var card = wrap.firstChild;
    try { footer.parentNode.insertBefore(card, footer); } catch (e) { return false; }
    return true;
  }
  function mount(html) {
    if (place(html)) return;
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (place(html) || tries >= 120) clearInterval(iv);
    }, 500);
    /* MutationObserver: catch footers added after the poll (SPA navigations,
       lazy commerce footers, deferred system-page chrome). */
    try {
      var obs = new MutationObserver(function () {
        if (place(html) && obs) { try { obs.disconnect(); } catch (e2) {} }
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    } catch (e2) {}
  }

  /* ---- Cohesion P0 (2026-10-06): terminal-state API.
     Surfaces at terminal states (game over, certificate earned, vote cast,
     quiz result, RSVP confirmed, pledge confirmed) dispatch:
       document.dispatchEvent(new CustomEvent('pf:terminal', {
         detail: { slot: <element>, context: 'game-over' }
       }));
     nextop renders the current best op as an in-place card inside the slot —
     one action, dismissible, never a menu. Also exposed as
     PF.nextMove.render(slot, context) for direct calls.
     Psych constraints (binding): skippable everywhere; degrades to nothing
     (not a fallback menu) if the op state isn't loaded yet. */
  var _resolved = null; /* {op, st} once loadState completes */
  var _terminalQueue = [];
  function terminalCardHtml(op, st, ctx) {
    return '<div class="pf-nextmove-terminal" data-pf-nm-ctx="' + esc(ctx || '') + '" style="max-width:560px;margin:18px auto;padding:16px 14px;background:#0a0a0a;' +
      'border:1px solid #333;border-left:4px solid #c1121f;box-sizing:border-box;position:relative;' +
      'font-family:Arial,sans-serif;text-align:center;">' +
      '<button type="button" data-pf-nm-dismiss="1" aria-label="Dismiss" style="position:absolute;top:6px;right:8px;' +
      'background:none;border:none;color:#777;font-size:16px;cursor:pointer;padding:4px 8px;">\u00d7</button>' +
      '<div style="font-size:10px;letter-spacing:4px;color:#dc143c;font-weight:800;margin-bottom:6px;">NEXT MOVE</div>' +
      '<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:18px;letter-spacing:1px;' +
      'color:#f5ead6;margin:0 0 6px;">' + esc(op.title) + '</div>' +
      '<div style="font-size:13px;color:#a89e88;line-height:1.5;margin:0 0 12px;">' + esc(op.sub(st)) + '</div>' +
      '<a href="' + esc(op.href) + '" style="display:inline-block;background:#c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:0.12em;font-size:12px;text-decoration:none;' +
      'padding:10px 22px;border:2px solid #c1121f;">' + esc(op.cta) + '</a>' +
      '</div>';
  }
  function renderTerminal(slot, ctx) {
    try {
      if (!slot || !slot.parentNode) return false;
      if (slot.querySelector('.pf-nextmove-terminal')) return true; /* idempotent */
      var dk = 'pf_nm_dismiss_' + String(ctx || 'terminal');
      try { if (sessionStorage.getItem(dk) === '1') return true; } catch (e) {}
      if (!_resolved || !_resolved.op) return false; /* not loaded yet — caller re-queues */
      slot.insertAdjacentHTML('beforeend', terminalCardHtml(_resolved.op, _resolved.st, ctx));
      var btn = slot.querySelector('[data-pf-nm-dismiss]');
      if (btn) btn.addEventListener('click', function () {
        try { sessionStorage.setItem(dk, '1'); } catch (e) {}
        var card = slot.querySelector('.pf-nextmove-terminal');
        if (card && card.parentNode) card.parentNode.removeChild(card);
      });
      return true;
    } catch (e) { return false; }
  }
  try {
    document.addEventListener('pf:terminal', function (ev) {
      var d = (ev && ev.detail) || {};
      if (!renderTerminal(d.slot, d.context)) {
        _terminalQueue.push({ slot: d.slot, context: d.context });
      }
    });
  } catch (e) {}
  try {
    if (window.PF) {
      window.PF.nextMove = window.PF.nextMove || {};
      window.PF.nextMove.render = function (slot, ctx) {
        if (!renderTerminal(slot, ctx)) _terminalQueue.push({ slot: slot, context: ctx });
      };
      window.PF.nextMove.ready = function () { return !!(_resolved && _resolved.op); };
    }
  } catch (e) {}
  function flushTerminalQueue() {
    if (!_terminalQueue.length) return;
    var q = _terminalQueue; _terminalQueue = [];
    for (var i = 0; i < q.length; i++) renderTerminal(q[i].slot, q[i].context);
  }

  /* ---- boot ---- */
  function boot(op) {
    try { mount(cardHtml(op, op.__st)); }
    catch (e) { try { PF.error('nextop', 'mount failed :: ' + (e && e.message || e)); } catch (e2) {} }
  }
  var id = ident();
  if (!id.callsign) {
    /* Anonymous: no reads at all — one enlist op, no dead end. */
    var enlist = {
      title: 'YOUR FIRST OP: ENLIST', cta: 'ENLIST \u2192', href: '/',
      sub: function () { return 'Claim your callsign. Your XP follows it everywhere.'; }
    };
    enlist.__claimPrompt = true; /* 2026-10-06: this card is a claim prompt —
      cardHtml adds the recovery link for it. */
    enlist.__st = {};
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(enlist); });
    else boot(enlist);
    return;
  }
  loadState(id, function (st) {
    var op;
    if (st.blackoutLive) {
      /* Shadow mode: the wire is dark — on-brand copy, no real names. */
      op = {
        title: 'SOMETHING IS HAPPENING', cta: 'READ THE BRIEFING \u2192', href: '/',
        sub: function () {
          return 'The ticker went dark. Dead Drops pay double and sealed bounties ' +
            'get one re-roll — move quiet, then read the debrief.';
        }
      };
    } else {
      op = pickOp(st);
    }
    op.__st = st;
    /* Cohesion P0: publish the resolved op for terminal-state renders. */
    _resolved = { op: op, st: st };
    try { flushTerminalQueue(); } catch (e) {}
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(op); });
    else boot(op);
  });
})();
