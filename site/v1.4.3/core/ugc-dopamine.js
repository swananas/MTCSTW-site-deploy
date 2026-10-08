/* core/ugc-dopamine.js | PF v1.4.3 | UGC DOPAMINE LAYER.
   CEO directive 2026-10-06 (spec: ugc-dopamine-ranking-20261006.md §2):
   every contribution should FEEL rewarding in the moment. This module is the
   presentation layer for that — celebration moments, quorum progress bars,
   contributor streaks, the TOP HANDS spotlight strip, leaderboard pulses,
   and the stacked-leg apex celebration (§7b).

   CEO priority addenda baked in:
   - GAS IS THE FLAGSHIP (spec §3a/§3a-i): gas-price lock-ins get the richest
     single-action celebration — fullest "LOCKED IN" moment, streak bump
     shown immediately, and the confirmer's final confirmation gets its own
     mini-celebration ("YOU SEALED IT"). Copy stays honest: the celebration
     echoes the reporter's OWN price back to them, never aggregates.
   - STACKED LEGS (spec §7b): one political action fills stacked bounty legs
     (the action / the proof / the intel / the cell showing). When a user's
     legs complete, the stack renders as ONE moment — "RALLY COMPLETE: 4/4
     legs" — the apex celebration, instead of four disconnected toasts.

   Self-contained IIFE. Exposes PF.UGCDopamine. Hooks (all fail-soft):
     - #pf-data-bounties board: observes claim/confirm outcomes via
       MutationObserver (does NOT modify data-bounties.js), injects quorum
       progress bars into claim rows, captures claim form values at click
       time so celebrations can echo the user's own data back.
     - CPI price form: listens for inflation-tracker's 'pf:price-reported'.
     - Pledge wall: listens for campaign.js's 'pf-campaign-pledge'.
     - Fan vote: listens for 'pf-vote-cast'.
   Backend (be/ugc-dopamine-rank workstream): polls GET ugc_dopamine_feed /
   GET ugc_value_rank via JSONP. If the backend isn't live yet, every surface
   renders from DOM data attributes + localStorage and the feed is skipped —
   fail-soft, never a broken page.

   Copy rules (hard): no "donate", no XP numbers (use "earns XP" if ever
   needed — this module sets no amounts), honest plain copy, no fake urgency
   (Psych gate §2f noted — copy is plain by construction).
   Visual: BREATHE tokens via var(--pf-*, hardcoded fallback).
   Mobile-first: dismiss buttons are 44px tap targets.
   Reduced motion: honors prefers-reduced-motion (no confetti, no animation).
   KILL: ?pf_off=ugcdop */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ugcdop')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  /* ---------------- utils ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function myCallsign() { try { return window.PFCallsign ? window.PFCallsign() : ''; } catch (e) { return ''; } }
  function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function lsGet(k, dflt) { try { var v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  /* Chicago-day key (spec §2c: consecutive Chicago days). offset 0 = today. */
  function chiDay(offset) {
    try {
      var t = Date.now() - (offset || 0) * 864e5;
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(t);
      var y = '', m = '', d = '';
      parts.forEach(function (p) { if (p.type === 'year') y = p.value; else if (p.type === 'month') m = p.value; else if (p.type === 'day') d = p.value; });
      return y + '-' + m + '-' + d;
    } catch (e) {
      var dd = new Date(Date.now() - (offset || 0) * 864e5);
      return dd.getFullYear() + '-' + ('0' + (dd.getMonth() + 1)).slice(-2) + '-' + ('0' + dd.getDate()).slice(-2);
    }
  }
  function fmtPrice(cents) {
    var n = Number(cents);
    if (!isFinite(n) || n < 0) return '';
    return '$' + (n / 100).toFixed(2);
  }

  /* ---------------- kinds ---------------- */
  var KNOWN_KINDS = ['gas_price', 'commodity_confirm', 'crowd_confirm', 'cpi_price', 'photo_evidence',
    'prediction_resolve', 'intel_corroborate', 'raid_report', 'review_needed',
    'event_attendance', 'roster_correction'];
  /* bounty id pattern: db_<kind>_<target>_<yyyy-mm-dd> */
  function kindFromBountyId(bid) {
    var s = String(bid || '');
    if (s.indexOf('db_') !== 0) return '';
    var rest = s.slice(3);
    for (var i = 0; i < KNOWN_KINDS.length; i++) {
      if (rest === KNOWN_KINDS[i] || rest.indexOf(KNOWN_KINDS[i] + '_') === 0) return KNOWN_KINDS[i];
    }
    return '';
  }
  function actionKeyFromBountyId(bid, title) {
    var k = kindFromBountyId(bid), s = String(bid || '');
    var rest = s.indexOf('db_') === 0 ? s.slice(3 + (k ? k.length + 1 : 0)) : '';
    rest = rest.replace(/_\d{4}-\d{2}-\d{2}$/, '').replace(/^_+|_+$/g, '');
    if (rest) return rest.toLowerCase();
    if (title) return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 28) || 'solo';
    return 'solo';
  }
  var NOUN = {
    gas_price: 'gas price', commodity_confirm: 'commodity report', crowd_confirm: 'crowd report',
    cpi_price: 'price report', photo_evidence: 'photo', prediction_resolve: 'outcome confirm',
    intel_corroborate: 'intel report', raid_report: 'raid report', review_needed: 'review',
    event_attendance: 'check-in', roster_correction: 'roster fix'
  };
  function noun(kind) { return NOUN[kind] || 'report'; }
  function isGasKind(kind) { return kind === 'gas_price'; }

  /* Stacked legs (spec §7b). Four legs, honest states. */
  var LEGS = [
    { id: 'action', label: 'The action', hint: 'you checked in' },
    { id: 'proof',  label: 'The proof',  hint: 'your photos' },
    { id: 'intel',  label: 'The intel',  hint: 'crowd confirm' },
    { id: 'cell',   label: 'The cell showing', hint: 'your crew' }
  ];
  function legForKind(kind) {
    if (kind === 'event_attendance') return 'action';
    if (kind === 'photo_evidence') return 'proof';
    if (kind === 'crowd_confirm') return 'intel';
    return '';
  }

  /* ---------------- CSS (BREATHE tokens, fallbacks) ---------------- */
  var CSS =
    '.ugd-cel{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:2147483000;' +
    'max-width:min(92vw,440px);width:max-content;background:var(--pf-dark-2,#1a1a1a);color:var(--pf-cream,#f5ead6);' +
    'border:3px solid var(--pf-red,#c1121f);border-radius:6px;padding:14px 44px 14px 16px;' +
    'font-family:var(--pf-font-body,Arial,sans-serif);box-shadow:0 8px 40px rgba(0,0,0,.7);' +
    'animation:ugdpop .35s cubic-bezier(.2,1.4,.4,1)}' +
    '@keyframes ugdpop{0%{opacity:0;transform:translateX(-50%) translateY(24px) scale(.92)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}' +
    '.ugd-cel.ugd-gas{border-color:var(--pf-gold,#e8b923);box-shadow:0 8px 44px rgba(232,185,35,.25),0 8px 40px rgba(0,0,0,.7)}' +
    '.ugd-cel.ugd-apex{border-width:4px;border-color:var(--pf-gold,#e8b923);' +
    'box-shadow:0 0 0 4px var(--pf-dark,#0d0d0d),0 0 0 8px var(--pf-gold,#e8b923),0 12px 60px rgba(0,0,0,.8)}' +
    '.ugd-kicker{font-size:10px;letter-spacing:4px;color:var(--pf-red-bright,#dc143c);font-weight:800;margin-bottom:4px}' +
    '.ugd-gas .ugd-kicker,.ugd-apex .ugd-kicker{color:var(--pf-gold,#e8b923)}' +
    '.ugd-title{font-family:var(--pf-font-display,"Arial Black",Arial,sans-serif);font-size:22px;letter-spacing:2px;margin:0 0 6px}' +
    '.ugd-sub{font-size:14px;line-height:1.5;color:var(--pf-cream,#f5ead6);margin:0 0 8px}' +
    '.ugd-next{font-size:12.5px;line-height:1.5;color:var(--pf-muted,#c9bfa8)}' +
    '.ugd-x{position:absolute;top:6px;right:6px;min-width:44px;min-height:44px;background:transparent;border:0;' +
    'color:var(--pf-muted,#c9bfa8);font-size:18px;cursor:pointer}' +
    '.ugd-x:hover{color:#fff}' +
    '.ugd-confetti{position:absolute;top:-10px;width:8px;height:12px;z-index:5;pointer-events:none;' +
    'animation-name:ugdfall;animation-timing-function:linear;animation-fill-mode:forwards}' +
    '@keyframes ugdfall{to{transform:translateY(420px) rotate(680deg);opacity:0}}' +
    '.ugd-legs{margin:8px 0 4px;text-align:left}' +
    '.ugd-leg{display:flex;gap:8px;align-items:baseline;font-size:13.5px;padding:5px 0;border-top:1px solid var(--pf-border,#333)}' +
    '.ugd-leg b{color:var(--pf-cream,#f5ead6)}' +
    '.ugd-leg .st{margin-left:auto;font-size:12px;color:var(--pf-muted,#c9bfa8);white-space:nowrap}' +
    '.ugd-leg.done .st{color:#7fd67f}.ugd-leg.wait .st{color:var(--pf-gold,#e8b923)}' +
    '.ugd-qbar{margin:8px 0 4px;background:var(--pf-dark,#0d0d0d);border:1px solid var(--pf-border,#333);border-radius:4px;padding:8px 10px}' +
    '.ugd-qtrack{height:10px;background:#000;border-radius:5px;overflow:hidden;margin-bottom:6px}' +
    '.ugd-qfill{height:100%;background:linear-gradient(90deg,var(--pf-red,#c1121f),var(--pf-red-bright,#dc143c));border-radius:5px;transition:width .5s ease}' +
    '.ugd-gas .ugd-qfill,.ugd-qbar.ugd-gasbar .ugd-qfill{background:linear-gradient(90deg,var(--pf-gold,#e8b923),#f5d76e)}' +
    '.ugd-qt{font-size:12.5px;color:var(--pf-muted,#c9bfa8);line-height:1.45}' +
    '.ugd-streak{display:inline-flex;align-items:center;gap:6px;background:var(--pf-dark-2,#1a1a1a);' +
    'border:2px solid var(--pf-orange,#ff5a00);border-radius:20px;padding:6px 14px;min-height:44px;box-sizing:border-box;' +
    'font-size:13px;color:var(--pf-cream,#f5ead6);font-family:var(--pf-font-body,Arial,sans-serif)}' +
    '.ugd-streak b{font-size:16px}' +
    '.ugd-streak .ugd-streak-l{color:var(--pf-muted,#c9bfa8);font-size:11px;letter-spacing:1px}' +
    '.ugd-tophands{margin:0 0 14px;border:2px solid var(--pf-border-light,#555);border-radius:4px;padding:12px;background:var(--pf-dark-3,#141414)}' +
    '.ugd-th-t{font-size:11px;letter-spacing:3px;color:var(--pf-gold,#e8b923);font-weight:800;margin-bottom:8px}' +
    '.ugd-th-row{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--pf-muted,#c9bfa8);padding:6px 4px;border-radius:3px;min-height:32px}' +
    '.ugd-th-row .r{font-weight:800;color:var(--pf-cream,#f5ead6);min-width:28px}' +
    '.ugd-th-row.me{background:rgba(193,18,31,.18);border:1px solid var(--pf-red,#c1121f)}' +
    '.ugd-th-note{font-size:11.5px;color:var(--pf-dim,#777);margin-top:8px;line-height:1.5}' +
    '.ugd-pulse{animation:ugdpulse 1.1s ease 2}' +
    '@keyframes ugdpulse{0%{box-shadow:0 0 0 0 rgba(232,185,35,.7)}70%{box-shadow:0 0 0 12px rgba(232,185,35,0)}100%{box-shadow:0 0 0 0 rgba(232,185,35,0)}}' +
    '@media (prefers-reduced-motion: reduce){.ugd-cel{animation:none}.ugd-qfill{transition:none}.ugd-pulse{animation:none}.ugd-confetti{display:none}}';
  try {
    if (!document.getElementById('pf-ugdop-css')) {
      var st = document.createElement('style');
      st.id = 'pf-ugdop-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
  } catch (e) {}

  /* ---------------- celebration tray ---------------- */
  var tray = null;  function ensureTray() {
    if (tray) return tray;
    tray = document.createElement('div');
    tray.id = 'ugd-tray';
    tray.setAttribute('aria-live', 'polite');
    document.body.appendChild(tray);
    return tray;
  }
  function confettiBurst(host, n) {
    /* Confetti-lite, self-contained (spec §2a): CSS pieces, reduced-motion
       safe. Deliberately NOT PF.dope.confetti — its pf-dope-host class sets
       position:relative, which would break this fixed-position card. */
    try {
      if (reduced() || !host || !host.appendChild) return;
      var colors = ['#c1121f', '#e8b923', '#f5ead6', '#dc143c'];
      n = Math.max(0, Math.min(60, n | 0 || 20));
      for (var i = 0; i < n; i++) {
        var p = document.createElement('div');
        p.className = 'ugd-confetti';
        p.style.left = (Math.random() * 100) + '%';
        p.style.background = colors[i % colors.length];
        p.style.animationDuration = (1.1 + Math.random() * 1.4) + 's';
        p.style.animationDelay = (Math.random() * 0.35) + 's';
        host.appendChild(p);
        (function (node) {
          setTimeout(function () { try { if (node.parentNode) node.parentNode.removeChild(node); } catch (e) {} }, 3200);
        })(p);
      }
    } catch (e) {}
  }
  /* Dedup: never celebrate the same event twice (refresh-safe). */
  function seen(key) {
    var s = lsGet('pf_ugd_seen_v1', []);
    if (s.indexOf(key) !== -1) return true;
    s.push(key);
    lsSet('pf_ugd_seen_v1', s.slice(-80));
    return false;
  }
  /* tier: 'std' | 'gas' | 'apex' */
  function celebrate(opts) {
    opts = opts || {};
    if (opts.dedupe && seen(opts.dedupe)) return null;
    var host;
    try {
      host = ensureTray();
      var el = document.createElement('div');
      el.className = 'ugd-cel' + (opts.tier === 'gas' ? ' ugd-gas' : '') + (opts.tier === 'apex' ? ' ugd-apex' : '');
      el.setAttribute('role', 'status');
      var h = '<div class="ugd-kicker">MTCSTW.COM</div>' +
        '<div class="ugd-title">' + esc(opts.title || 'LOCKED IN') + '</div>';
      if (opts.sub) h += '<div class="ugd-sub">' + opts.sub + '</div>';
      if (opts.legsHTML) h += '<div class="ugd-legs">' + opts.legsHTML + '</div>';
      if (opts.next) h += '<div class="ugd-next">' + opts.next + '</div>';
      h += '<button class="ugd-x" aria-label="Dismiss">&#10005;</button>';
      el.innerHTML = h;
      var x = el.querySelector('.ugd-x');
      function kill() { try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {} }
      if (x) x.addEventListener('click', kill);
      host.appendChild(el);
      confettiBurst(el, opts.tier === 'apex' ? 48 : opts.tier === 'gas' ? 36 : 20);
      setTimeout(kill, opts.tier === 'apex' ? 12000 : 8000);
      /* keep the tray to the latest two celebrations */
      while (host.children.length > 2) { try { host.removeChild(host.firstChild); } catch (e) { break; } }
      return el;
    } catch (e) { return null; }
  }

  /* ---------------- contributor streak (Chicago days) ---------------- */
  var MILESTONES = [7, 14, 30];
  function streak() {
    var days = lsGet('pf_ugc_days_v1', []);
    var set = {};
    days.forEach(function (d) { set[d] = 1; });
    var n = 0;
    while (set[chiDay(n)]) n++;
    return n;
  }
  /* Returns {streak, milestone} — milestone set when a milestone was JUST hit. */
  function recordContribution(kind) {
    try {
      var today = chiDay(0);
      var days = lsGet('pf_ugc_days_v1', []);
      var before = streak();
      if (days.indexOf(today) === -1) { days.push(today); lsSet('pf_ugc_days_v1', days.slice(-60)); }
      var now = streak();
      var ms = 0;
      for (var i = 0; i < MILESTONES.length; i++) {
        if (now === MILESTONES[i] && before < MILESTONES[i]) ms = MILESTONES[i];
      }
      if (ms) {
        celebrate({
          title: 'CONTRIBUTOR STREAK: ' + ms + ' DAYS',
          sub: 'That\u2019s ' + ms + ' days in a row of building the movement\u2019s data.',
          next: 'No pressure — the streak is a record of showing up, not a chain to protect.',
          tier: ms >= 30 ? 'apex' : 'std',
          dedupe: 'mstreak:' + ms + ':' + today
        });
      }
      refreshStreakChips();
      return { streak: now, milestone: ms, kind: kind || '' };
    } catch (e) { return { streak: 0, milestone: 0, kind: kind || '' }; }
  }
  function streakChipHTML() {
    var n = streak();
    return '<span class="ugd-streak" title="Contributor streak \u2014 days in a row with at least one contribution. Separate from your daily check-in streak.">' +
      '\uD83D\uDD25 <b>' + n + '</b><span class="ugd-streak-l">CONTRIBUTOR STREAK</span></span>';
  }
  function streakNextLine(kindNoun) {
    var n = streak();
    return '\uD83D\uDD25 ' + n + '-day contributor streak \u2014 today\u2019s ' + (kindNoun || 'contribution') + ' kept it alive.';
  }
  function refreshStreakChips() {
    try {
      var chips = document.querySelectorAll('.ugd-streak');
      for (var i = 0; i < chips.length; i++) {
        var tmp = document.createElement('div');
        tmp.innerHTML = streakChipHTML();
        chips[i].parentNode.replaceChild(tmp.firstChild, chips[i]);
      }
    } catch (e) {}
  }
  /* Mount the streak chip next to the HUD and on the bounty board. */
  function mountStreakChips() {
    try {
      var spots = [];
      var hud = document.querySelector('#pf-hud,[data-pf-hud]');
      if (hud && !hud.querySelector('.ugd-streak')) spots.push(hud);
      var head = document.querySelector('#pf-data-bounties .db-head');
      if (head && !head.querySelector('.ugd-streak')) spots.push(head);
      spots.forEach(function (s) {
        var d = document.createElement('div');
        d.innerHTML = streakChipHTML();
        d.style.margin = '8px 0';
        s.appendChild(d.firstChild);
      });
    } catch (e) {}
  }

  /* ---------------- quorum progress bars ---------------- */
  function progressHTML(confirms, quorum, kind) {
    confirms = Math.max(0, Math.floor(Number(confirms) || 0));
    quorum = Math.max(1, Math.floor(Number(quorum) || 2));
    var pct = Math.min(100, Math.round(confirms / quorum * 100));
    var n = NOUN[kind] || 'report';
    var left = quorum - confirms;
    var line;
    if (left <= 0) line = 'Locked in \u2014 confirmed.';
    else if (left === 1) line = '1 more confirmation and your ' + esc(n) + ' locks in!';
    else line = left + ' more confirmations and your ' + esc(n) + ' locks in!';
    return '<div class="ugd-qbar' + (isGasKind(kind) ? ' ugd-gasbar' : '') + '" role="progressbar" ' +
      'aria-valuemin="0" aria-valuemax="' + quorum + '" aria-valuenow="' + confirms + '" ' +
      'aria-label="Confirmation progress for your ' + esc(n) + '">' +
      '<div class="ugd-qtrack"><div class="ugd-qfill" style="width:' + pct + '%"></div></div>' +
      '<div class="ugd-qt">' + esc(line) + '</div></div>';
  }
  /* Parse "N/M confirms" from a claim row's .db-conf span. */
  function parseConf(text) {
    var m = /(\d+)\s*\/\s*(\d+)\s*confirms?/i.exec(String(text || ''));
    return m ? { confirms: Number(m[1]), quorum: Number(m[2]) } : null;
  }
  /* Inject bars into every claim row on the board (idempotent). */
  function renderBarsFromDOM(host) {
    try {
      host = host || $('pf-data-bounties');
      if (!host) return 0;
      var me = (myCallsign() || '').toUpperCase();
      var rows = host.querySelectorAll('.db-claimrow');
      var count = 0;
      for (var i = 0; i < rows.length; i++) {
        (function (row) {
          var old = row.querySelector('.ugd-qbar');
          if (old && old.parentNode) old.parentNode.removeChild(old);
          var confEl = row.querySelector('.db-conf');
          var pc = parseConf(confEl ? confEl.textContent : '');
          if (!pc) return;
          var card = row.closest ? row.closest('.db-card') : null;
          var kind = card ? kindFromBountyId(card.getAttribute('data-b')) : '';
          row.insertAdjacentHTML('beforeend', progressHTML(pc.confirms, pc.quorum, kind));
          count++;
          /* Honest lock-in: my claim reached quorum in the DOM. */
          try {
            var csEl = row.querySelector('.db-cs');
            var cs = csEl ? (csEl.textContent || '').trim().toUpperCase() : '';
            if (me && cs === me && pc.confirms >= pc.quorum && card) {
              onMyClaimFilled(card.getAttribute('data-b'), kind, card);
            }
          } catch (e2) {}
        })(rows[i]);
      }
      return count;
    } catch (e) { return 0; }
  }
  function cardTitle(card) {
    try { var t = card.querySelector('.db-title'); return t ? t.textContent.trim() : ''; } catch (e) { return ''; }
  }
  function inCellContext(card) {
    try {
      if (card.closest && card.closest('#pf-db-cellstrip')) return true;
      return !!(card.querySelector && card.querySelector('[data-cell]'));
    } catch (e) { return false; }
  }

  /* ---------------- stacked legs (spec §7b) ---------------- */
  function legsStore() { return lsGet('pf_ugc_legs_v1', {}); }
  function saveLegs(s) { lsSet('pf_ugc_legs_v1', s); }
  /* My own claims (price etc. captured at click) — lets the lock-in
     celebration echo the reporter's OWN data back honestly, later. */
  function myClaims() { return lsGet('pf_ugd_myclaims_v1', {}); }
  function saveMyClaim(bid, data) {
    try {
      var m = myClaims();
      m[bid] = { kind: data.kind || '', price_cents: data.price_cents || '', area_key: data.area_key || '', ts: Date.now() };
      var keys = Object.keys(m);
      if (keys.length > 60) { delete m[keys[0]]; }
      lsSet('pf_ugd_myclaims_v1', m);
    } catch (e) {}
  }
  /* Mutate one stack inside the store and persist — the store object, not
     the stack, is what gets saved (a stack is not a store). */
  function mutateStack(ak, title, fn) {
    var s = legsStore();
    if (!s[ak]) s[ak] = { title: title || ak, legs: {}, updated: Date.now() };
    if (title && !s[ak].title) s[ak].title = title;
    s[ak].updated = Date.now();
    try { fn(s[ak]); } catch (e) {}
    saveLegs(s);
    return s[ak];
  }
  function getStack(actionKey) {
    var s = legsStore();
    return s[actionKey] || null;
  }
  function touchStack(actionKey, title) {
    var s = legsStore();
    if (!s[actionKey]) s[actionKey] = { title: title || actionKey, legs: {}, updated: Date.now() };
    if (title && !s[actionKey].title) s[actionKey].title = title;
    s[actionKey].updated = Date.now();
    saveLegs(s);
    return s[actionKey];
  }
  /* Mark one of MY legs filled (honest: only from real fill evidence). */
  function markLegFilled(bountyId, legId, meta) {
    meta = meta || {};
    var ak = actionKeyFromBountyId(bountyId, meta.title);
    var st = mutateStack(ak, meta.title, function (s) {
      var leg = s.legs[legId] || {};
      if (leg.state !== 'filled') { leg.state = 'filled'; leg.ts = Date.now(); s.legs[legId] = leg; }
      /* Cell leg rolls up: a fill in cell context also credits the cell leg. */
      if (meta.cell && legId !== 'cell') {
        s.legs.cell = s.legs.cell || {};
        s.legs.cell.state = 'filled'; s.legs.cell.ts = Date.now();
      }
    });
    maybeStackCelebrate(ak);
    return st;
  }
  function markLegClaimed(bountyId, legId, meta) {
    meta = meta || {};
    var ak = actionKeyFromBountyId(bountyId, meta.title);
    return mutateStack(ak, meta.title, function (s) {
      var leg = s.legs[legId] || {};
      if (!leg.state) { leg.state = 'claimed'; leg.ts = Date.now(); s.legs[legId] = leg; }
    });
  }
  function stackLegsHTML(ak) {
    var st = getStack(ak);
    var legs = (st && st.legs) || {};
    var h = '';
    LEGS.forEach(function (L) {
      var s = (legs[L.id] && legs[L.id].state) || 'open';
      var cls = s === 'filled' ? 'done' : (s === 'claimed' ? 'wait' : '');
      var txt = s === 'filled' ? '\u2713 locked in' : (s === 'claimed' ? '\u25F7 awaiting confirmations' : '\u25CB not yet');
      h += '<div class="ugd-leg ' + cls + '"><b>' + esc(L.label) + '</b><span>' + esc(L.hint) + '</span>' +
        '<span class="st">' + txt + '</span></div>';
    });
    return h;
  }
  function stackFilledCount(ak) {
    var st = getStack(ak);
    var n = 0;
    if (st) LEGS.forEach(function (L) { if (st.legs[L.id] && st.legs[L.id].state === 'filled') n++; });
    return n;
  }
  /* The apex moment: ≥2 legs filled renders the stack as ONE moment.
     4/4 = full apex treatment. Honest: only real leg states shown. */
  function maybeStackCelebrate(ak) {
    try {
      var n = stackFilledCount(ak);
      if (n < 2) return;
      var st = getStack(ak);
      var title = (st && st.title) || ak;
      if (n >= 4) {
        celebrate({
          tier: 'apex',
          title: 'RALLY COMPLETE: 4/4 LEGS',
          sub: esc(title) + ' \u2014 every leg locked in. That\u2019s a full political action, documented and confirmed.',
          legsHTML: stackLegsHTML(ak),
          next: 'The stack is the point: one action, four kinds of proof, all movement data. Nothing here is sold.',
          dedupe: 'stackapex:' + ak
        });
      } else {
        celebrate({
          tier: n >= 3 ? 'gas' : 'std',
          title: 'RALLY: ' + n + ' OF 4 LEGS',
          sub: esc(title) + ' \u2014 ' + n + ' of 4 legs locked in.',
          legsHTML: stackLegsHTML(ak),
          next: 'Each leg needs its own proof and its own confirmations \u2014 that\u2019s what makes the stack real.',
          dedupe: 'stack:' + ak + ':' + n
        });
      }
    } catch (e) {}
  }

  /* My claim reached quorum — the claimant's lock-in moment.
     Gas gets the flagship treatment: the fullest LOCKED IN, streak bump
     shown immediately, and the reporter's OWN price echoed back (from the
     claim stash — never aggregates, never invented figures). */
  function onMyClaimFilled(bid, kind, card) {
    try {
      if (seen('mylock:' + bid)) return;
      var mc = myClaims()[bid] || {};
      var price = fmtPrice(mc.price_cents);
      var title = card ? cardTitle(card) : '';
      var leg = legForKind(kind);
      if (leg) markLegFilled(bid, leg, { title: title, cell: card ? inCellContext(card) : false });
      recordContribution('locked:' + (kind || 'bounty'));
      if (isGasKind(kind)) {
        celebrate({
          tier: 'gas',
          title: 'GAS PRICE LOCKED IN',
          sub: (price ? price + '/gal' : 'Your gas price') + ' \u2014 confirmed and locked in. Your report is movement data now.',
          next: streakNextLine('gas report') + ' Gas is the flagship data \u2014 fresh prices keep the People\u2019s Index honest.'
        });
      } else {
        celebrate({
          title: 'LOCKED IN',
          sub: 'Your ' + noun(kind) + ' is confirmed \u2014 it\u2019s movement data now.',
          next: streakNextLine(noun(kind))
        });
      }
    } catch (e) {}
  }

  /* ---------------- data-bounties board wire ---------------- */
  var pendingClaim = {};   /* bountyId -> {kind, price_cents, area_key} captured at click */
  var pendingConfirm = {}; /* bountyId -> {kind} captured at click */
  function wireBoard() {
    var host = $('pf-data-bounties');
    if (!host) return;
    /* Capture form values at claim click — lets the celebration echo the
       user's OWN data (price) back honestly. Capture phase: runs before
       data-bounties' own handler. */
    host.addEventListener('click', function (ev) {
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var act = t.getAttribute('data-act');
        if (!act) return;
        var card = t.closest ? t.closest('.db-card') : null;
        if (!card) return;
        var bid = card.getAttribute('data-b') || '';
        var kind = kindFromBountyId(bid);
        if (act === 'claim') {
          var form = card.querySelector('.db-claim');
          var data = { kind: kind };
          if (form) {
            var inps = form.querySelectorAll('.db-in');
            for (var i = 0; i < inps.length; i++) {
              var f = inps[i].getAttribute('data-f'), v = (inps[i].value || '').trim();
              if (f && v) data[f] = v;
            }
          }
          pendingClaim[bid] = data;
          saveMyClaim(bid, data);
        } else if (act === 'confirm') {
          pendingConfirm[bid] = { kind: kind, claimId: t.getAttribute('data-claim') };
        }
      } catch (e) {}
    }, true);
    /* Observe outcome messages — data-bounties writes .db-msg text on
       claim/confirm resolution. We react without touching its code. */
    var seenMsgs = [];
    function processMsg(msg) {
      try {
        if (!msg || msg.getAttribute('data-ugd-seen')) return;
        var txt = (msg.textContent || '').trim();
        if (!txt || msg.className.indexOf('ok') === -1) return;
        if (seenMsgs.indexOf(txt + msg) !== -1) return;
        msg.setAttribute('data-ugd-seen', '1');
        seenMsgs.push(txt + msg);
        if (seenMsgs.length > 40) seenMsgs.shift();
        var card = msg.closest ? msg.closest('.db-card') : null;
        var bid = card ? (card.getAttribute('data-b') || '') : '';
        var kind = kindFromBountyId(bid);
        var title = card ? cardTitle(card) : '';
        var leg = legForKind(kind);
        if (/Submitted/.test(txt) && /awaiting confirmation/.test(txt)) {
          /* Claim received — the "RECEIVED" moment. Gas gets flagship copy. */
          var pc = pendingClaim[bid] || {};
          delete pendingClaim[bid];
          var price = fmtPrice(pc.price_cents);
          recordContribution('claim:' + (kind || 'bounty'));
          if (leg) markLegClaimed(bid, leg, { title: title, cell: card ? inCellContext(card) : false });
          if (isGasKind(kind)) {
            celebrate({
              tier: 'gas',
              title: 'GAS REPORT RECEIVED',
              sub: (price ? price + '/gal' : 'Your price') + ' is in. Confirmations needed before it locks in \u2014 we\u2019ll ping you.',
              next: streakNextLine('gas report'),
              dedupe: 'claim:' + bid
            });
          } else {
            celebrate({
              title: 'RECEIVED',
              sub: 'Your ' + noun(kind) + ' is in. Confirmations needed before it locks in \u2014 we\u2019ll ping you.',
              next: streakNextLine(noun(kind)),
              dedupe: 'claim:' + bid
            });
          }
        } else if (/bounty filled/.test(txt)) {
          /* A confirmation closed the bounty — confirmer's moment.
             Gas close = "YOU SEALED IT" mini-celebration. */
          var cinfo = pendingConfirm[bid] || {};
          delete pendingConfirm[bid];
          recordContribution('confirm:' + (kind || 'bounty'));
          if (isGasKind(kind)) {
            celebrate({
              tier: 'gas',
              title: 'YOU SEALED IT',
              sub: 'Your confirmation locked in this gas price. That\u2019s the one that closed it.',
              next: streakNextLine('confirmation'),
              dedupe: 'sealed:' + bid + ':' + (cinfo.claimId || 'x')
            });
          } else {
            celebrate({
              title: 'CONFIRMATION ACCEPTED',
              sub: 'Your confirmation locked this one in. The claimant gets the moment too.',
              next: streakNextLine('confirmation'),
              dedupe: 'cfilled:' + bid + ':' + (cinfo.claimId || 'x')
            });
          }
        } else if (/Confirmation recorded/.test(txt)) {
          recordContribution('confirm:' + (kind || 'bounty'));
          celebrate({
            title: 'CONFIRMATION ACCEPTED',
            sub: 'Recorded \u2014 thanks for verifying.',
            next: streakNextLine('confirmation'),
            dedupe: 'crec:' + bid + ':' + Date.now()
          });
        }
      } catch (e) {}
    }
    function scan() {
      try {
        var msgs = host.querySelectorAll('.db-msg');
        for (var i = 0; i < msgs.length; i++) processMsg(msgs[i]);
        renderBarsFromDOM(host);
        mountStreakChips();
      } catch (e) {}
    }
    var MO = window.MutationObserver;
    if (MO) {
      var deb = null;
      try {
        new MO(function () {
          if (deb) return;
          deb = setTimeout(function () { deb = null; scan(); }, 120);
        }).observe(host, { childList: true, subtree: true, characterData: true });
      } catch (e) {}
    }
    setTimeout(scan, 400);
  }

  /* ---------------- backend feed (be/ugc-dopamine-rank) ---------------- */
  var BACKEND = '';
  try { BACKEND = window.PF_BACKEND_URL || ''; } catch (e) {}
  var jsonpSeq = 0;
  function jsonp(action, params, timeoutMs, cb) {
    var done = false;
    function finish(j) {
      if (done) return; done = true;
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      try { delete window[fn]; } catch (e) {}
      try { cb(j); } catch (e) {}
    }
    if (!BACKEND) { setTimeout(function () { finish(null); }, 0); return; }
    var fn = 'pfUgdCb' + (++jsonpSeq) + '_' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script');
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }
    q += '&callback=' + fn;
    try { s.src = BACKEND + q; document.head.appendChild(s); } catch (e) { finish(null); return; }
    setTimeout(function () { finish(null); }, timeoutMs || 8000);
  }
  function feedPoll() {
    var host = $('pf-data-bounties');
    if (!host || !document.body.contains(host)) return;
    jsonp('ugc_dopamine_feed', {}, 8000, function (j) {
      if (!j || !j.ok) return; /* backend not live yet — DOM fallback already rendered */
      try {
        /* Quorum progress from the feed (authoritative when present). */
        if (j.claims && j.claims.length) {
          var rows = host.querySelectorAll('.db-claimrow');
          for (var i = 0; i < rows.length; i++) {
            (function (row) {
              var btn = row.querySelector('[data-claim]');
              var cid = btn ? btn.getAttribute('data-claim') : '';
              for (var c = 0; c < j.claims.length; c++) {
                var fc = j.claims[c];
                if (String(fc.claim_id) === String(cid)) {
                  var old = row.querySelector('.ugd-qbar');
                  if (old && old.parentNode) old.parentNode.removeChild(old);
                  row.insertAdjacentHTML('beforeend', progressHTML(fc.confirms, fc.quorum, fc.kind || kindFromBountyId(row.closest('.db-card').getAttribute('data-b'))));
                }
              }
            })(rows[i]);
          }
        }
        /* Server-side streak is cross-device truth; show it when present. */
        if (j.my && j.my.streak_days != null) {
          try {
            var chips = document.querySelectorAll('.ugd-streak b');
            for (var b = 0; b < chips.length; b++) chips[b].textContent = String(Math.max(0, Math.floor(Number(j.my.streak_days) || 0)));
          } catch (e2) {}
        }
        /* Stack states from the backend (authoritative). */
        if (j.stacks && j.stacks.length) {
          j.stacks.forEach(function (stk) {
            if (!stk || !stk.action_key) return;
            var ak = String(stk.action_key);
            var before = stackFilledCount(ak);
            mutateStack(ak, stk.title, function (s) {
              ['action', 'proof', 'intel', 'cell'].forEach(function (lid) {
                var fs = stk.legs && stk.legs[lid];
                if (fs && fs.state === 'filled' && (!s.legs[lid] || s.legs[lid].state !== 'filled')) {
                  s.legs[lid] = { state: 'filled', ts: Date.now() };
                }
              });
            });
            if (stackFilledCount(ak) > before) maybeStackCelebrate(ak);
          });
        }
      } catch (e) {}
    });
    jsonp('ugc_value_rank', {}, 8000, function (j) {
      if (j && j.ok) renderTopHands(j);
    });
  }
  /* TOP HANDS spotlight strip (spec §2d) — from ugc_value_rank, cohort-banded. */
  function renderTopHands(j) {
    try {
      var host = $('pf-data-bounties');
      if (!host) return;
      var head = host.querySelector('.db-head');
      if (!head) return;
      var old = $('ugd-tophands');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var top = (j && j.top) || [];
      if (!top.length) return; /* fail-soft: no data, no strip, no invented names */
      var me = (j.my_callsign || myCallsign() || '').toUpperCase();
      var prevRank = lsGet('pf_ugd_rank_v1', null);
      var myRank = j.my_rank != null ? Number(j.my_rank) : null;
      var h = '<div class="ugd-tophands" id="ugd-tophands"><div class="ugd-th-t">TOP HANDS</div>';
      top.slice(0, 5).forEach(function (r, i) {
        var cs = String(r.callsign || 'anon').toUpperCase();
        var isMe = me && cs === me;
        var rank = r.rank != null ? Number(r.rank) : i + 1;
        h += '<div class="ugd-th-row' + (isMe ? ' me' : '') + '" data-cs="' + esc(cs) + '" data-rank="' + rank + '">' +
          '<span class="r">#' + rank + '</span><span>' + esc(cs) + '</span>' +
          (r.cohort ? '<span style="font-size:11px;color:var(--pf-dim,#777)">\u00B7 ' + esc(r.cohort) + '</span>' : '') +
          '</div>';
      });
      h += '<div class="ugd-th-note">Top value contributors this week \u2014 ranked by what the movement gained, not likes. ' +
        'Banded by rank tier, so new hands can win too.</div></div>';
      head.insertAdjacentHTML('afterend', h);
      /* Leaderboard pulse: my row animates when my rank climbs in-session. */
      if (myRank != null) {
        if (prevRank != null && myRank < prevRank) {
          var row = document.querySelector('#ugd-tophands .ugd-th-row.me');
          if (row) { row.classList.add('ugd-pulse'); setTimeout(function () { row.classList.remove('ugd-pulse'); }, 2600); }
        }
        lsSet('pf_ugd_rank_v1', myRank);
      }
    } catch (e) {}
  }

  /* ---------------- CPI price form wire ---------------- */
  function wirePriceForm() {
    try {
      document.addEventListener('pf:price-reported', function (ev) {
        try {
          var d = (ev && ev.detail) || {};
          var cents = Number(d.price_cents);
          var price = fmtPrice(cents);
          var itemId = String(d.item_id || '');
          var itemName = String(d.item_name || 'that item');
          var isGas = itemId === 'gasoline' || /gas/i.test(itemId) || /gasoline/i.test(itemName);
          var area = String(d.area_key || '');
          recordContribution(isGas ? 'price:gasoline' : 'price:' + (itemId || 'cpi'));
          if (isGas) {
            /* Gas on the CPI surface: rich treatment, streak bump immediate,
               reporter's OWN price echoed — never aggregates. */
            celebrate({
              tier: 'gas',
              title: 'GAS PRICE LOGGED',
              sub: (price ? price + '/gal \u2014 ' : '') + esc(itemName) + (area ? ' in ' + esc(area) : '') + '.',
              next: streakNextLine('gas report') + ' Gas is the flagship data \u2014 fresh prices keep the People\u2019s Index honest.',
              dedupe: 'cpi:' + (d.report_id != null ? d.report_id : Date.now())
            });
          } else {
            celebrate({
              title: 'PRICE LOGGED',
              sub: (price ? price + ' \u2014 ' : '') + esc(itemName) + (area ? ' in ' + esc(area) : '') + '. One report per item per day.',
              next: streakNextLine('price report'),
              dedupe: 'cpi:' + (d.report_id != null ? d.report_id : Date.now())
            });
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  /* ---------------- pledge wall wire ---------------- */
  function wirePledge() {
    try {
      document.addEventListener('pf-campaign-pledge', function () {
        recordContribution('pledge');
        celebrate({
          title: 'PLEDGE ETCHED',
          sub: 'Your name is on the wall \u2014 newest first, permanent.',
          next: 'Get your cell to match it. ' + streakNextLine('pledge')
        });
      });
    } catch (e) {}
  }

  /* ---------------- fan vote wire ---------------- */
  function wireVote() {
    try {
      document.addEventListener('pf-vote-cast', function () {
        recordContribution('vote');
        celebrate({
          title: 'VOTE CAST',
          sub: 'Locked in for the week. Tallies stay private \u2014 the winner surfaces Monday as FAN FAVORITE.',
          next: streakNextLine('vote')
        });
      });
    } catch (e) {}
  }

  /* ---------------- public API ---------------- */
  PF.UGCDopamine = {
    version: '1.0.0',
    celebrate: celebrate,
    recordContribution: recordContribution,
    streak: streak,
    streakChipHTML: streakChipHTML,
    progressHTML: progressHTML,
    markLegFilled: markLegFilled,
    markLegClaimed: markLegClaimed,
    stackHTML: stackLegsHTML,
    stackFilledCount: stackFilledCount,
    refreshFeed: feedPoll,
    renderTopHands: renderTopHands,
    /* test-only surface */
    _t: {
      chiDay: chiDay, kindFromBountyId: kindFromBountyId, actionKeyFromBountyId: actionKeyFromBountyId,
      parseConf: parseConf, fmtPrice: fmtPrice, noun: noun, legForKind: legForKind,
      getStack: getStack, touchStack: touchStack, legsStore: legsStore, seen: seen,
      renderBarsFromDOM: renderBarsFromDOM, reduced: reduced
    }
  };

  /* ---------------- boot ---------------- */
  try {
    wireBoard();
    wirePriceForm();
    wirePledge();
    wireVote();
    mountStreakChips();
    /* Feed poll: once shortly after boot, then every 60s while visible.
       Fail-soft: DOM fallback already rendered; a dead endpoint changes nothing. */
    setTimeout(feedPoll, 2500);
    setInterval(function () {
      try { if (document.visibilityState !== 'hidden') feedPoll(); } catch (e) {}
    }, 60000);
  } catch (e) {}
})();
