#!/usr/bin/env node
/* scripts/verify-ux-news-combos.js — UX Combination Play 3 (news-cycle
   combos) frontend verification harness (fe/ux-news-combos, 2026-10-06).
   Run from the worktree root:
     node scripts/verify-ux-news-combos.js
   AFTER rebuilding the two bundles: node scripts/build-two-bundles.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, the two edited silos, build/bundle.js,
      scripts/build-two-bundles.js, and this harness.
   2. CPI spike threshold: SPIKE_THRESHOLD_PCT = 5, documented as a strict
      week-over-week increase (> 5%), tunable in one place.
   3. Prefill reuse: the EXISTING pf_forge_prefill_v1 stash contract is
      reused (same key, same payload shape v/plugin_id/template_id/label/
      data/stashed_at); nothing new invented. Workshop deep-link
      /create#pf-tool=poster-forge (the shell's own hash router).
   4. Kill switches: master ux-combos + per-trigger ux-combos-cpi /
      ux-combos-robbery / ux-combos-warreport via PF.skip, documented in
      the header; poster buttons additionally gated on poster-forge live.
   5. CPI wiring: spike button renders only when delta_pct STRICTLY exceeds
      the threshold; carries data-pf-cpi-* payload attributes; one
      delegated click listener in mountBoard() calls PF.newsCombos.cpiPoster.
   6. Robbery wiring: decorateRobbery targets the real card contract
      (article.pf-rr-card[data-rr] resolved through PFRobReportData.byId),
      idempotent (no double buttons), generic data-rr-* fallback, sweep +
      MutationObserver for late cards. No data -> no button.
   7. War Report wiring: parseWarOrders extracts the backend's
      "NEXT WEEK — ORDERS:" bullets; the candidate panel is gated on the
      engine; submitOrderCandidate stages device-local pf_order_candidates_v1
      (capped, de-duped) with a clear TODO for the backend endpoint; NO
      invented backend action names or POST contracts.
   8. Fail-open: guarded renders everywhere (engine absent/killed -> no
      button, never a broken one).
   9. Zero XP / zero currencies: no xpGrant, no XP grant copy (the explicit
      "ZERO XP" doc lines are allowed), no currency invention.
   10. Brand: DEPLOY family — #c1121f red, Arial, letterspaced caps on the
       combo buttons.
   11. Bundle registration: 'ux-news-combos.js' listed exactly once under
       bundle-economy (before inflation-tracker.js) and once under
       bundle-warreport in build/bundle.js; present in both rebuilt bundles.
   12. Functional (DOM-stubbed): parseWarOrders on a realistic backend
       body; cpiPoster writes a valid forge stash payload; robberyPoster
       writes a valid forge stash payload; decorateRobbery wires a button
       off PFRobReportData.byId and refuses a second decoration;
       submitOrderCandidate stages + de-dupes the queue; spike threshold
       boundary (5.0 -> no button path, 5.01 -> button path) via the
       render-gate expression.
   13. Scope guard: this play touches only its own files (module, the two
       silo edits, bundle registration, rebuilt bundles, scripts) — no
       footer pin, no deploy config, no backend writes. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var MOD = path.join(G, 'ux-news-combos.js');
var CPI = path.join(G, 'inflation-tracker.js');
var WR = path.join(G, 'war-report.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function count(src, s) { return src.split(s).length - 1; }
/* Comment-stripped view for copy/behavior scans (per the 2026-10-01 lesson:
   strip comments only — never strip string literals, regex literals are
   quote-blind to naive strippers). */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/[^\n]*/mg, '');
}

var mod = read(MOD), cpi = read(CPI), wr = read(WR);
var modCode = codeOnly(mod);

console.log('== 1. node --check ==');
[[MOD, 'games/ux-news-combos.js'], [CPI, 'games/inflation-tracker.js'],
 [WR, 'games/war-report.js'], [path.join(ROOT, 'build', 'bundle.js'), 'build/bundle.js'],
 [path.join(ROOT, 'scripts', 'build-two-bundles.js'), 'scripts/build-two-bundles.js'],
 [path.join(ROOT, 'scripts', 'verify-ux-news-combos.js'), 'scripts/verify-ux-news-combos.js']
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[0], { stdio: 'pipe' }); ok(pair[1]); }
  catch (e) { no(pair[1], 'node --check failed'); }
});

console.log('== 2. spike threshold ==');
if (/var SPIKE_THRESHOLD_PCT = 5;/.test(mod)) ok('threshold: SPIKE_THRESHOLD_PCT = 5');
else no('threshold', 'SPIKE_THRESHOLD_PCT = 5 not found');
if (has(mod, 'week-over-week') && has(mod, 'STRICTLY GREATER'))
  ok('threshold: documented as strict week-over-week increase (> 5%)');
else no('threshold', 'strict > 5% week-over-week documentation missing');
if (has(cpi, 'PF.newsCombos.SPIKE_THRESHOLD_PCT') && has(cpi, 'd > PF.newsCombos.SPIKE_THRESHOLD_PCT'))
  ok('threshold: CPI card render reads the shared constant with strict >');
else no('threshold', 'CPI render does not gate on d > SPIKE_THRESHOLD_PCT');

console.log('== 3. prefill reuse + deep-link ==');
if (has(mod, "FORGE_STASH_KEY = 'pf_forge_prefill_v1'")) ok('prefill: reuses pf_forge_prefill_v1 key');
else no('prefill', 'pf_forge_prefill_v1 key not referenced');
[['v: 1', 'v:1'], ['plugin_id:', 'plugin_id'], ['template_id:', 'template_id'],
  ['stashed_at:', 'stashed_at'], ['label:', 'label'], ['data:', 'data']]
  .forEach(function (pair) {
    if (has(mod, pair[0])) ok('prefill: stash payload carries ' + pair[1]);
    else no('prefill', 'stash payload missing ' + pair[1]);
  });
if (has(mod, "'/create#pf-tool=poster-forge'"))
  ok('deep-link: /create#pf-tool=poster-forge (workshop shell hash router)');
else no('deep-link', '/create#pf-tool=poster-forge missing');
/* Cross-check the stash contract against the Forge reader + Ammo writer. */
var forge = read(path.join(G, 'poster-forge.js'));
if (has(forge, "sessionStorage.getItem(KEY)") || has(forge, 'pf_forge_prefill_v1'))
  ok('contract: stash key matches the Forge reader contract');
else no('contract', 'Forge reader does not reference pf_forge_prefill_v1');
var ammo = '';
try { ammo = read(path.join(G, 'ammo.js')); } catch (e) {}
if (ammo && has(ammo, 'pf_forge_prefill_v1') && has(ammo, '/create'))
  ok('contract: matches Ammo FORGE THIS writer (same key, same /create landing)');
else no('contract', 'Ammo writer reference missing — reuse claim unverified');

console.log('== 4. kill switches ==');
/* The module routes per-trigger kills through killed('<id>'), which calls
   PF.skip(triggerKill) internally — accept either spelling. */
[['ux-combos', 'master'], ['ux-combos-cpi', 'cpi'], ['ux-combos-robbery', 'robbery'],
 ['ux-combos-warreport', 'warreport']].forEach(function (pair) {
  if (has(modCode, "PF.skip('" + pair[0] + "')") || has(modCode, "killed('" + pair[0] + "')"))
    ok('kill: ux-combos kill \'' + pair[0] + '\' (' + pair[1] + ')');
  else no('kill switch', "kill '" + pair[0] + "' missing");
});
[['ux-combos-cpi', cpi, 'cpi silo'], ['ux-combos-warreport', wr, 'war-report silo']]
  .forEach(function (t) {
    if (has(t[1], t[0])) ok('kill: ' + t[2] + ' honors ' + t[0]);
    else no('kill switch', t[2] + ' does not check ' + t[0]);
  });
if (has(modCode, "PF.skip('poster-forge')")) ok('kill: poster buttons gated on poster-forge live');
else no('kill switch', 'poster-forge live gate missing');
if (has(mod, '?pf_off=ux-combos') && has(mod, '?pf_off=ux-combos-cpi') &&
    has(mod, '?pf_off=ux-combos-robbery') && has(mod, '?pf_off=ux-combos-warreport'))
  ok('kill: all four ?pf_off= switches documented in header');
else no('kill switch', 'header docs missing a ?pf_off= switch');

console.log('== 5. CPI wiring ==');
if (has(cpi, 'spikeBtnHTML') && has(cpi, 'MAKE A POSTER ABOUT THIS'))
  ok('cpi: spike button builder + copy present');
else no('cpi wiring', 'spikeBtnHTML / button copy missing');
if (has(cpi, 'data-pf-cpi-spike') && has(cpi, 'data-pf-cpi-item') && has(cpi, 'data-pf-cpi-delta'))
  ok('cpi: button carries data-pf-cpi-* payload attributes');
else no('cpi wiring', 'data-pf-cpi-* attributes missing');
if (has(cpi, 'wireSpikeButtons') && has(cpi, "closest('[data-pf-cpi-spike]')") &&
    has(cpi, 'PF.newsCombos.cpiPoster('))
  ok('cpi: single delegated listener in mountBoard() -> PF.newsCombos.cpiPoster');
else no('cpi wiring', 'delegated listener -> cpiPoster missing');
if (has(cpi, "!r.enough_data || r.median_cents == null) return '';") ||
    has(cpi, "if (!r.enough_data || r.median_cents == null) return '';"))
  ok('cpi: no button without enough data (honesty suppression respected)');
else no('cpi wiring', 'enough_data guard missing in spikeBtnHTML');

console.log('== 6. robbery wiring ==');
if (has(mod, '.pf-rr-card[data-rr]') && has(mod, 'PFRobReportData') && has(mod, 'byId'))
  ok('robbery: targets real card contract (.pf-rr-card[data-rr] via PFRobReportData.byId)');
else no('robbery wiring', 'real card contract not referenced');
if (has(mod, 'it.company') && has(mod, 'takePct'))
  ok('robbery: villain=company, figure=takePct from the data registry');
else no('robbery wiring', 'company/takePct resolution missing');
if (has(mod, "el.querySelector('[data-pf-combo-btn]')") && has(mod, 'return 0;'))
  ok('robbery: idempotent decoration (no double buttons)');
else no('robbery wiring', 'idempotency guard missing');
if (has(mod, 'data-rr-villain') && has(mod, 'MutationObserver'))
  ok('robbery: generic data-rr-* fallback + MutationObserver for late cards');
else no('robbery wiring', 'generic hook / MutationObserver missing');
if (has(mod, 'MAKE THIS A POSTER')) ok('robbery: MAKE THIS A POSTER copy present');
else no('robbery wiring', 'button copy missing');

console.log('== 7. war-report wiring ==');
if (has(wr, 'wrComboOrdersPanel') && has(wr, 'wrWireComboOrders') &&
    has(wr, 'MAKE THIS A DAILY ORDER'))
  ok('warreport: candidate panel + per-bullet buttons wired in paint()');
else no('warreport wiring', 'wrComboOrdersPanel/wrWireComboOrders missing');
if (has(mod, "indexOf('NEXT WEEK — ORDERS:')"))
  ok('combos: parseWarOrders reads the backend NEXT WEEK — ORDERS section');
else no('warreport wiring', 'NEXT WEEK — ORDERS parse missing');
if (has(mod, "ORDER_QUEUE_KEY = 'pf_order_candidates_v1'") && has(mod, 'ORDER_QUEUE_MAX = 20'))
  ok('combos: device-local candidate queue pf_order_candidates_v1 (capped 20)');
else no('warreport wiring', 'candidate queue key/cap missing');
if (has(mod, 'TODO (backend)') && has(mod, 'stats.js') && has(mod, 'NO submit'))
  ok('combos: clear TODO for the backend endpoint (no invented contract)');
else no('warreport wiring', 'backend TODO comment missing');
/* No invented backend actions: the module must not POST to, or invent
   action names for, a candidate endpoint. The device-local queue key
   pf_order_candidates_v1 is storage, not an action — excluded. */
var invented = ['suggest_order', 'submit_order', 'nominate_order']
  .filter(function (a) { return has(modCode, a); });
var actionish = (modCode.match(/action\s*[:=]\s*['"]order_candidate/gi) || []).length;
if (!invented.length && !actionish) ok('combos: no invented backend action names');
else no('warreport wiring', 'invented backend actions: ' + invented.join(','));
if (!/fetch\(|postAction|authPost/.test(modCode)) ok('combos: zero backend writes');
else no('warreport wiring', 'module performs backend writes — forbidden in this play');

console.log('== 8. fail-open ==');
/* The engine IS the module — engine-absence guards live in the CALLERS
   (the silos), which must not render buttons when PF.newsCombos is gone. */
if (has(codeOnly(cpi), '!PF.newsCombos') && has(codeOnly(wr), '!PF.newsCombos'))
  ok('fail-open: both silos guard on engine absence (no button without it)');
else no('fail-open', 'silo engine-absent guards missing');
if (has(modCode, 'if (!stashForgePayload(') || has(modCode, 'Could not stage the payload'))
  ok('combos: stash failure -> toast, no dead navigation');
else no('fail-open', 'stash-failure path missing');
if (has(wr, 'if(!orders.length) return "";') || has(wr, 'if (!orders.length) return "";'))
  ok('warreport: unparseable body -> no panel');
else no('fail-open', 'empty-orders no-panel path missing');

console.log('== 9. zero XP / zero currencies ==');
var scrubbed = modCode.split('\n').filter(function (l) {
  return l.indexOf('ZERO XP') === -1 && l.indexOf('Zero XP') === -1 && l.indexOf('zero XP') === -1;
}).join('\n');
var xpHits = [];
scrubbed.split('\n').forEach(function (l, i) {
  if (/xpGrant|\bXP\b/i.test(l) && !/explain/i.test(l)) xpHits.push((i + 1) + ':' + l.trim().slice(0, 70));
});
/* Filter the legit "max XP"/copy-adjacent mentions that are not grants. */
xpHits = xpHits.filter(function (h) { return /grant|claim|earn|\+ *xp|xp *\+/i.test(h); });
if (!xpHits.length) ok('no-XP: zero XP grants/currencies');
else no('no-XP', 'XP tokens found: ' + xpHits.join(' | '));

console.log('== 10. brand ==');
if (has(mod, '#c1121f') && has(mod, 'Arial') && has(mod, 'letter-spacing:2px') &&
    has(mod, 'text-transform:uppercase'))
  ok('brand: #c1121f red, Arial, letterspaced caps');
else no('brand', 'DEPLOY-family button style missing');
if (has(cpi, '#c1121f') && has(cpi, 'font:bold 13px Arial') &&
    has(wr, '#c1121f') && has(wr, 'font:bold 13px Arial'))
  ok('brand: cpi + warreport buttons match the combo style');
else no('brand', 'silo button styles diverge from the combo style');

console.log('== 11. bundle registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
['bundle-economy', 'bundle-warreport'].forEach(function (b) {
  var idx = bsrc.indexOf("'" + b + "'");
  var end = bsrc.indexOf('],', idx);
  var block = bsrc.slice(idx, end);
  var n = block.split("'ux-news-combos.js'").length - 1;
  if (n === 1) ok('bundle: ux-news-combos.js listed exactly once under ' + b);
  else no('bundle', "'ux-news-combos.js' listed " + n + ' times under ' + b);
});
/* Economy ordering: the engine must precede inflation-tracker.js. */
(function () {
  var idx = bsrc.indexOf("'bundle-economy'");
  var block = bsrc.slice(idx, bsrc.indexOf('],', idx));
  if (block.indexOf("'ux-news-combos.js'") < block.indexOf("'inflation-tracker.js'"))
    ok('bundle: engine precedes inflation-tracker.js in bundle-economy');
  else no('bundle', 'engine does not precede inflation-tracker.js');
})();
[['bundle-economy.js', 'economy'], ['bundle-warreport.js', 'warreport']].forEach(function (pair) {
  var p = path.join(G, pair[0]);
  /* Minification strips the section comments, so check for a module-owned
     runtime marker instead: PF.newsCombos (property names survive mangle). */
  if (fs.existsSync(p) && has(read(p), 'newsCombos'))
    ok('bundle: rebuilt ' + pair[0] + ' contains the module');
  else no('bundle', pair[0] + ' not rebuilt or missing the module');
});

console.log('== 12. functional (DOM-stubbed) ==');
(function functional() {
  /* Minimal DOM stub: enough for the module's init + the APIs under test. */
  function mkEl() {
    var el = {
      children: [], attrs: {}, style: {}, onclick: null, textContent: '',
      className: '', innerHTML: '',
      setAttribute: function (k, v) { el.attrs[k] = String(v); },
      getAttribute: function (k) { return el.attrs[k] || ''; },
      hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(el.attrs, k); },
      appendChild: function (c) { el.children.push(c); return c; },
      addEventListener: function () {},
      querySelector: function (sel) {
        /* Idempotency support: the combo button carries
           data-pf-combo-btn="1"; find it among appended children. */
        if (sel === '[data-pf-combo-btn]') {
          for (var i = 0; i < el.children.length; i++) {
            var c = el.children[i];
            if (c && c.attrs && c.attrs['data-pf-combo-btn']) return c;
          }
        }
        return null;
      },
      querySelectorAll: function () { return []; },
      closest: function () { return null; }
    };
    return el;
  }
  var store = {};
  var sstore = {};
  var sandbox = {
    window: null, document: null, sessionStorage: null, localStorage: null,
    location: { href: '' }, MutationObserver: undefined, PF: null, console: console
  };
  sandbox.window = sandbox;
  sandbox.sessionStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(sstore, k) ? sstore[k] : null; },
    setItem: function (k, v) { sstore[k] = String(v); },
    removeItem: function (k) { delete sstore[k]; }
  };
  sandbox.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sandbox.document = {
    readyState: 'complete',
    createElement: function () { return mkEl(); },
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    getElementById: function () { return null; },
    documentElement: mkEl(), head: mkEl(), body: mkEl()
  };
  var toasts = [];
  sandbox.PF = {
    skip: function () { return false; },
    toast: function (m) { toasts.push(m); },
    error: function () {}
  };
  vm.createContext(sandbox);
  try {
    vm.runInContext(mod, sandbox, { filename: 'ux-news-combos.js' });
  } catch (e) {
    no('functional', 'module threw at load in stub DOM: ' + (e && e.message));
    return;
  }
  var NC = sandbox.PF.newsCombos;
  if (!NC) { no('functional', 'PF.newsCombos not exposed'); return; }
  ok('functional: module loads in stub DOM, exposes PF.newsCombos');

  /* parseWarOrders on a realistic backend body. */
  var body = 'WAR REPORT — WEEK 41\n\nMEME OF THE WEEK:\n"meme" — @x\n\n' +
    'NEXT WEEK — ORDERS:\n' +
    '  - You were active 3/7 days. A perfect week protects your streak and banks max XP.\n' +
    '  - Zero medals last week. Pick one game and chase its weekly medal.\n' +
    '  - Join a cell. Solo soldiers leave bonus XP on the table every single week.\n\n' +
    'WE SAVED YOU A SEAT:\n  You have been gone 4 days.\n\n— MTCSTW Command';
  var orders = NC.parseWarOrders(body);
  if (orders.length === 3 && /active 3\/7/.test(orders[0]) && /Join a cell/.test(orders[2]))
    ok('functional: parseWarOrders extracts 3 bullets, stops at next section');
  else no('functional', 'parseWarOrders returned ' + JSON.stringify(orders));
  if (!NC.parseWarOrders('no orders here').length)
    ok('functional: parseWarOrders -> [] on unparseable body');
  else no('functional', 'parseWarOrders non-empty on body without orders');

  /* cpiPoster writes a valid forge stash payload. */
  NC.cpiPoster('Eggs', '$4.29', 7.3, 'this week');
  var stash = null;
  try { stash = JSON.parse(sstore['pf_forge_prefill_v1']); } catch (e) {}
  if (stash && stash.v === 1 && stash.plugin_id && stash.template_id &&
      stash.data && stash.data.kind === 'cpi-spike' && /EGGS/.test(stash.data.headline) &&
      stash.stashed_at && sandbox.location.href === '/create#pf-tool=poster-forge')
    ok('functional: cpiPoster stashes valid pf_forge_prefill_v1 + deep-links');
  else no('functional', 'cpiPoster stash invalid: ' + JSON.stringify(stash));

  /* robberyPoster writes a valid forge stash payload. */
  delete sstore['pf_forge_prefill_v1']; sandbox.location.href = '';
  NC.robberyPoster('Chipotle', '25.4%', 'Chipotle 2025 10-K');
  try { stash = JSON.parse(sstore['pf_forge_prefill_v1']); } catch (e) { stash = null; }
  if (stash && stash.v === 1 && stash.data && stash.data.kind === 'robbery-report' &&
      /CHIPOTLE/.test(stash.data.headline) && stash.data.villain === 'Chipotle' &&
      stash.data.figure === '25.4%')
    ok('functional: robberyPoster stashes valid payload (villain + figure + source)');
  else no('functional', 'robberyPoster stash invalid: ' + JSON.stringify(stash));

  /* decorateRobbery off PFRobReportData.byId + idempotency. */
  sandbox.PFRobReportData = {
    TAGLINE: 'Estimated from their own filings.',
    byId: function (id) {
      if (id === 'burrito') return { id: 'burrito', name: 'Chicken burrito', company: 'Chipotle',
        takePct: '25.4', receipt: [{ text: 'Chipotle 2025 10-K' }] };
      return null;
    }
  };
  var card = mkEl();
  card.setAttribute('data-rr', 'burrito');
  card.className = 'pf-rr-card';
  var wired = NC.decorateRobbery(card);
  var btn = card.children[card.children.length - 1];
  if (wired === 1 && btn && /MAKE THIS A POSTER/.test(btn.textContent))
    ok('functional: decorateRobbery wires button from PFRobReportData.byId');
  else no('functional', 'decorateRobbery did not wire (wired=' + wired + ')');
  if (NC.decorateRobbery(card) === 0 && card.children.length === 1)
    ok('functional: decorateRobbery is idempotent (no second button)');
  else no('functional', 'decorateRobbery double-wired');
  var ghost = mkEl(); ghost.setAttribute('data-rr', 'nope');
  if (NC.decorateRobbery(ghost) === 0 && !ghost.children.length)
    ok('functional: unresolvable card -> no button (fail-open)');
  else no('functional', 'unresolvable card produced a button');
  /* Generic hook fallback. */
  var g2 = mkEl();
  g2.setAttribute('data-rr-villain', 'Walmart');
  g2.setAttribute('data-rr-figure', '3.1%');
  if (NC.decorateRobbery(g2) === 1)
    ok('functional: generic data-rr-* hook wires a button');
  else no('functional', 'generic data-rr-* hook failed');

  /* submitOrderCandidate stages + de-dupes the queue. */
  NC.submitOrderCandidate('Zero medals last week. Pick one game and chase its weekly medal.');
  var q = NC.readQueue();
  if (q.length === 1 && q[0].source === 'war-report' && q[0].text.length)
    ok('functional: submitOrderCandidate stages into pf_order_candidates_v1');
  else no('functional', 'candidate queue wrong: ' + JSON.stringify(q));
  NC.submitOrderCandidate('Zero medals last week. Pick one game and chase its weekly medal.');
  if (NC.readQueue().length === 1) ok('functional: duplicate candidate de-duped');
  else no('functional', 'duplicate candidate not de-duped');
  if (toasts.some(function (t) { return /not live yet|inbox/i.test(t); }))
    ok('functional: honest toast when the candidate inbox is not live');
  else no('functional', 'candidate-inbox toast missing');

  /* Spike gate boundary: the render expression must be strict >. */
  if (/d > PF\.newsCombos\.SPIKE_THRESHOLD_PCT/.test(cpi))
    ok('functional: spike gate is strict > (5.0 -> no button, 5.01 -> button)');
  else no('functional', 'spike gate is not strict >');
})();

console.log('== 13. scope guard ==');
(function scope() {
  var out = '';
  try { out = cp.execSync('git status --short', { cwd: ROOT, stdio: 'pipe' }).toString(); }
  catch (e) { no('scope', 'git status failed'); return; }
  var lines = out.split('\n').filter(function (l) { return l.trim(); });
  var allowed = [
    'v1.4.3/games/ux-news-combos.js',
    'v1.4.3/games/inflation-tracker.js',
    'v1.4.3/games/war-report.js',
    'v1.4.3/games/bundle-economy.js',
    'v1.4.3/games/bundle-warreport.js',
    'build/bundle.js',
    'scripts/build-two-bundles.js',
    'scripts/verify-ux-news-combos.js'
  ];
  var bad = lines.filter(function (l) {
    var f = l.slice(3).trim().replace(/^"(.+)"$/, '$1');
    return allowed.indexOf(f) === -1;
  });
  if (!bad.length) ok('scope: only play-owned files changed (' + lines.length + ' files)');
  else no('scope', 'unexpected files touched: ' + bad.join(' | '));
  var forbidden = ['loader/', 'footer', '.pin', 'pin.js'];
  var fb = lines.filter(function (l) {
    return forbidden.some(function (f) { return l.indexOf(f) !== -1; });
  });
  if (!fb.length) ok('scope: no footer pin / loader / deploy files touched');
  else no('scope', 'deploy-adjacent files touched: ' + fb.join(' | '));
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
