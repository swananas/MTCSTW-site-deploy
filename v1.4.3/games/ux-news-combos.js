/* games/ux-news-combos.js  |  PF v1.4.3 | UX COMBINATION PLAY 3 — NEWS-CYCLE COMBOS
   (CEO approval 2026-10-06 ~14:35 CDT). Wires the news cycle into creation and
   engagement: the data machine's spikes feed the Create workshop, and the
   War Report feeds the Daily Orders candidate pool.

   THREE TRIGGERS:
     1. CPI SPIKE -> TEMPLATE SUGGESTION. When a People's CPI price card shows
        a significant week-over-week increase (delta_pct > SPIKE_THRESHOLD_PCT,
        see constant below), the card renders "MAKE A POSTER ABOUT THIS ->".
        Clicking stashes a pf_forge_prefill_v1 payload and deep-links to
        /create#pf-tool=poster-forge.
     2. ROBBERY REPORT -> POSTER. Robbery Report cards get "MAKE THIS A
        POSTER ->", one-tap into the workshop with the card's villain +
        figure + source line pre-filled. The card renderer does not exist yet
        in this tree (see GAP below), so this module ships a data-attribute
        decorator: any element carrying data-rr-villain + data-rr-figure (and
        optionally data-rr-source) gets the button wired on sweep, plus a
        public PF.newsCombos.decorateRobbery(el) hook for the renderer to call.
     3. WAR REPORT -> DAILY ORDER. The War Report's "NEXT WEEK — ORDERS:"
        bullets each get "MAKE THIS A DAILY ORDER ->", staging the item as a
        Daily Order candidate (same device-local staging the order pool will
        drain when the submission path lands — see TODO below).

   MECHANISM REUSE (nothing new invented):
     - Poster triggers reuse the EXISTING pf_forge_prefill_v1 stash contract
       (games/poster-forge.js reader, weave #2 2026-10-05): sessionStorage
       JSON {v:1, plugin_id, template_id, label, data, source, fetched_at,
       stashed_at}. The Forge reads the stash on /create load; until the
       data-poster template lands it stays staged with a toast — the exact
       fail-open behavior Ammo Finder's FORGE THIS buttons already ship.
     - The workshop deep-link #pf-tool=poster-forge is the workshop shell's
       own hash router (core/workshop.js PFWorkshop.route).
     - Daily Order candidates stage into localStorage 'pf_order_candidates_v1'
       (capped, device-local). TODO: when the backend lands a candidate
       submission endpoint (stats.js daily-orders rail has NO submit action
       today — get/checkin only, verified 2026-10-06), drain this queue there.
       NO backend contract is invented here; nothing is POSTed today.

   FAIL-OPEN EVERYWHERE: no data -> no button, never a broken button. Buttons
   render only when the combos engine is present AND the payload can be
   staged. If Poster Forge is killed (?pf_off=poster-forge), no poster
   buttons render at all. The module is silent when its hooks have nothing
   to decorate.

   ZERO XP, ZERO CURRENCIES: this module grants no XP, shows no XP, invents
   no currency. ZERO BACKEND SCHEMA CHANGES: read-only investigation only;
   the only storage writes are the pre-existing Forge stash (sessionStorage)
   and the device-local candidate queue (localStorage).

   KILL: ?pf_off=ux-combos (master) | ?pf_off=ux-combos-cpi |
         ?pf_off=ux-combos-robbery | ?pf_off=ux-combos-warreport
         or localStorage pf_disabled_v1='["ux-combos"]' etc.

   GAP (2026-10-06): core/robreport.js does not exist in this tree, and no
   backend robbery-report endpoint exists (verified: no "rob" actions in
   src/*.js). Trigger 2 ships as a ready-to-attach decorator + DOM sweep;
   when the Robbery Report module lands, it calls
   PF.newsCombos.decorateRobbery(cardEl) with data-rr-* attributes and the
   buttons light up with zero further changes. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (PF.newsCombos) return; /* additive facade: never reassign */

  /* ---------------- constants ---------------- */
  /* CPI SPIKE THRESHOLD: week-over-week median increase, in percent.
     A spike is "significant" when delta_pct is STRICTLY GREATER than this.
     Documented rationale: 5% weekly on a grocery basket is an honest shock
     number — big enough to be propaganda-worthy, small enough to actually
     happen in community-reported data. Tune in one place. */
  var SPIKE_THRESHOLD_PCT = 5;
  var FORGE_STASH_KEY = 'pf_forge_prefill_v1';
  var ORDER_QUEUE_KEY = 'pf_order_candidates_v1';
  var ORDER_QUEUE_MAX = 20;
  var PLUGIN_ID = 'ux-news-combos';
  var TEMPLATE_ID = 'data-poster';
  /* NOTE: 'data-poster' is the planned data-poster Forge template id. It
     does not exist yet; the Forge's prefill reader keeps the stash staged
     (with its own toast) until the template lands — the same fail-open
     Ammo Finder's FORGE THIS buttons ship with today. */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
    } catch (e2) {}
  }
  function killed(triggerKill) {
    try {
      if (PF.skip('ux-combos')) return true;
      if (triggerKill && PF.skip(triggerKill)) return true;
    } catch (e) {}
    return false;
  }
  /* Poster triggers are dead when the Forge itself is killed — never render
     a button that would land on a dead tool. */
  function forgeLive() {
    try { if (PF.skip('poster-forge')) return false; } catch (e) {}
    return true;
  }

  /* ---------------- shared brand button ---------------- */
  /* DEPLOY family: red on black, Arial, letterspaced caps. One style for
     all three triggers so the combo actions read as one machine. */
  function comboBtn(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-combo-btn';
    b.setAttribute('data-pf-combo-btn', '1');
    b.textContent = label;
    b.style.cssText = 'display:inline-block;margin-top:10px;background:#c1121f;' +
      'color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;' +
      'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;' +
      'text-transform:uppercase;min-height:44px;';
    return b;
  }

  /* ---------------- forge stash (existing contract, reused) ---------------- */
  /* Writes the pf_forge_prefill_v1 stash per the existing contract
     (games/poster-forge.js reader). Returns true when the payload was
     staged and the workshop can open it, false otherwise (no button should
     have been rendered). */
  function stashForgePayload(label, data) {
    if (!label || !data) return false;
    var payload = {
      v: 1,
      plugin_id: PLUGIN_ID,
      template_id: TEMPLATE_ID,
      label: label,
      data: data,
      source: PLUGIN_ID,
      fetched_at: Date.now(),
      stashed_at: Date.now(),
      /* Synergy-1 attribution hook (S-20): data-built cards have no maker —
         these stay empty; the Forge renders no credit line for them. */
      sourced_by: '',
      sourced_name: '',
      sourced_url: ''
    };
    try {
      sessionStorage.setItem(FORGE_STASH_KEY, JSON.stringify(payload));
      return true;
    } catch (e) { return false; }
  }
  /* Deep-link into the workshop's own hash router (core/workshop.js
     PFWorkshop.route): opens the Poster Forge tool directly. */
  function openForge() {
    try { window.location.href = '/create#pf-tool=poster-forge'; }
    catch (e) { toast('Payload staged — open the Create page to forge it.'); }
  }

  /* ---------------- trigger 1: CPI spike -> poster ---------------- */
  function cpiPoster(itemName, figure, deltaPct, range) {
    if (killed('ux-combos-cpi') || !forgeLive()) return;
    var head = String(itemName || 'THIS ITEM').toUpperCase() + ' UP ' +
      (Math.abs(Number(deltaPct) || 0)).toFixed(1) + '% IN A WEEK';
    var data = {
      kind: 'cpi-spike',
      headline: head,
      item: String(itemName || ''),
      figure: String(figure || ''),
      delta_pct: Number(deltaPct) || 0,
      source_line: "The People's CPI — community-reported · " + String(range || 'this week') +
        '. Not official data.'
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }

  /* ---------------- trigger 2: Robbery Report -> poster ---------------- */
  function robberyPoster(villain, figure, sourceLine) {
    if (killed('ux-combos-robbery') || !forgeLive()) return;
    var head = String(villain || 'THIS CORP').toUpperCase() + ' TAKES ' +
      String(figure || '').toUpperCase() + ' OFF YOU';
    var data = {
      kind: 'robbery-report',
      headline: head,
      villain: String(villain || ''),
      figure: String(figure || ''),
      source_line: String(sourceLine || 'The Robbery Report — estimated from their own filings.')
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }
  /* Decorator for Robbery Report cards. The card renderer (not yet in this
     tree — see GAP in the header) carries the card's data as
     data-rr-villain / data-rr-figure / data-rr-source attributes on the
     card element; this wires the button. Idempotent: already-decorated
     cards are skipped. Returns the number of buttons wired (0 = nothing
     to do, never a broken button). */
  function decorateRobbery(el) {
    if (killed('ux-combos-robbery') || !forgeLive()) return 0;
    try {
      if (!el || el.querySelector('[data-pf-combo-btn]')) return 0;
      var villain = el.getAttribute('data-rr-villain') || '';
      var figure = el.getAttribute('data-rr-figure') || '';
      var sourceLine = el.getAttribute('data-rr-source') || '';
      if (!villain.trim() || !figure.trim()) return 0; /* no data -> no button */
      var b = comboBtn('MAKE THIS A POSTER \u2192');
      b.onclick = function () { robberyPoster(villain, figure, sourceLine); };
      el.appendChild(b);
      return 1;
    } catch (e) { return 0; }
  }
  function sweepRobbery(root) {
    var n = 0;
    try {
      var cards = (root || document).querySelectorAll('[data-rr-villain]');
      for (var i = 0; i < cards.length; i++) n += decorateRobbery(cards[i]);
    } catch (e) {}
    return n;
  }
  function initRobberySweep() {
    if (killed('ux-combos-robbery')) return;
    try { sweepRobbery(document); } catch (e) {}
    /* Robbery cards may render late (lazy bundles, async fetches). The
       observer keeps the decorator live without touching the future
       renderer's code — fail-open: no anchors, nothing happens. */
    try {
      if (!window.MutationObserver) return;
      var mo = new MutationObserver(function (muts) {
        try {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node && node.nodeType === 1) {
                if (node.hasAttribute && node.hasAttribute('data-rr-villain')) decorateRobbery(node);
                sweepRobbery(node);
              }
            }
          }
        } catch (e2) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e3) {}
  }

  /* ---------------- trigger 3: War Report order -> Daily Order candidate ---------------- */
  /* TODO (backend): when the Daily Orders rail lands a candidate-submission
     endpoint (today stats.js handles only 'get' and 'checkin' — there is NO
     submit/suggest action, verified 2026-10-06), drain this queue into it
     here and clear the local rows on success. DO NOT invent a new action
     name or POST contract until the backend defines it — this queue is the
     contract boundary. */
  function readQueue() {
    try {
      var raw = localStorage.getItem(ORDER_QUEUE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeQueue(arr) {
    try { localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(arr.slice(0, ORDER_QUEUE_MAX))); }
    catch (e) {}
  }
  /* Stages a War Report order as a Daily Order candidate. Fail-open: the
     candidate inbox doesn't exist yet, so the queue keeps it on-device
     until the backend submission path lands (see TODO above). Zero XP —
     this is a candidate nomination, not an order completion. */
  function submitOrderCandidate(text) {
    if (killed('ux-combos-warreport')) return;
    var t = String(text || '').trim().slice(0, 280);
    if (!t) return;
    var q = readQueue();
    /* De-dupe: the same order text twice is one candidate. */
    for (var i = 0; i < q.length; i++) {
      if (q[i] && q[i].text === t) {
        toast('Already staged as a Daily Order candidate.');
        return;
      }
    }
    var id = '';
    try { id = window.PFCallsign ? (window.PFCallsign() || '') : ''; } catch (e) {}
    q.push({ text: t, source: 'war-report', callsign: id, staged_at: Date.now() });
    writeQueue(q);
    toast('Staged as a Daily Order candidate. The candidate inbox is not live ' +
      'yet — it is saved on your device for when the submission path lands.');
  }

  /* Parse the backend War Report body's "NEXT WEEK — ORDERS:" bullets.
     Returns an array of bullet strings; [] when unparseable (no data ->
     no buttons, never a broken button). */
  function parseWarOrders(body) {
    var out = [];
    try {
      var src = String(body || '');
      var idx = src.indexOf('NEXT WEEK — ORDERS:');
      if (idx < 0) return out;
      var rest = src.slice(idx + 'NEXT WEEK — ORDERS:'.length).split('\n');
      for (var i = 0; i < rest.length; i++) {
        var line = rest[i].replace(/^\s+|\s+$/g, '');
        if (!line) continue;
        /* Stop at the next section header (all-caps label ending in ':')
           or the sign-off line. */
        if (/^[A-Z][A-Z0-9 .,'\-]+:$/.test(line)) break;
        if (/^— MTCSTW/.test(line)) break;
        var m = /^[-•]\s+(.+)$/.exec(line);
        if (m && m[1]) out.push(m[1].slice(0, 280));
        else if (!/^[A-Z0-9 .,'\-]+:$/.test(line) && out.length) break;
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- init ---------------- */
  function init() {
    if (killed(null)) return;
    /* The Robbery Report card renderer does not exist yet — the sweep runs
       anyway so the buttons light up the moment its cards (with
       data-rr-* attributes) hit the DOM, whichever page they land on. */
    try { initRobberySweep(); } catch (e) { if (PF.error) PF.error('ux-news-combos', e); }
  }
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  } catch (e) { try { init(); } catch (e2) {} }

  PF.newsCombos = {
    v: '1.4.3',
    SPIKE_THRESHOLD_PCT: SPIKE_THRESHOLD_PCT,
    FORGE_STASH_KEY: FORGE_STASH_KEY,
    ORDER_QUEUE_KEY: ORDER_QUEUE_KEY,
    cpiPoster: cpiPoster,
    robberyPoster: robberyPoster,
    decorateRobbery: decorateRobbery,
    sweepRobbery: sweepRobbery,
    submitOrderCandidate: submitOrderCandidate,
    parseWarOrders: parseWarOrders,
    readQueue: readQueue,
    enabled: function (kill) { return !killed(kill); }
  };
})();
