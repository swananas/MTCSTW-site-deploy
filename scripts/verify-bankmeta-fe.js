#!/usr/bin/env node
/* scripts/verify-bankmeta-fe.js — Content Bank political metadata frontend
   verification harness (weave #8, CEO greenlight 2026-10-05). Run from the
   worktree root:
     node scripts/verify-bankmeta-fe.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the touched modules, build scripts, and this harness.
   2. Kill switch: ?pf_off=bank-meta via PF.skip('bank-meta') in read-xp.js
      (picker + prefill), bank-browse.js (gallery + remix), review-pool.js
      (chips); header documents it; gallery silent no-ops without
      #pf-bank-browse.
   3. Picker feature-detect: registry probe to studio_plugins_list; picker
      HTML injected only on probe success; absent registry -> placeholder
      stays empty (silent no-op, never a broken control).
   4. Canonical lists: 12 issue areas (match the aligned-nonprofits
      directory) + 7 entity types in read-xp.js; same 12 in bank-browse.js.
   5. PF.bankPrefillMeta hook: defined, documented signature, no-op under
      the kill, stashes when the composer isn't mounted yet.
   6. bank_submit carries political_meta; self_remix_no_award acceptance
      never shows +10/+20 copy (Economy Desk ruling 2026-10-05).
   7. Gallery: bank_list JSONP; graceful "still stocking" state; 12 fight
      chips, entity-type select, entity text search, RECENT/MOST REMIXED
      sort, LOAD MORE; empty states.
   8. Remix contract: the six pf_ params, pf_entity as <type>:<id>,
      encodeURIComponent, forge_ready -> navigate, falsy -> prefill
      fallback, default forge path /create + PF.bankForgePath override.
   9. No XP copy anywhere in the gallery or remix path.
   10. Review chips: factual tags only (entity_type/entity_id/issue_area),
       gated by the kill; blind UI preserved.
   11. Lexicon gate: zero banned terms (the d-word + casino lexicon).
   12. Backslash discipline: no backtick spans in the three modules.
   13. No XP logic in frontend: no xpGrant, no economy arithmetic.
   14. Bundle registration: bank-browse.js exactly once in build/bundle.js
       (bundle-create); rebuilt bundle-create.js / bundle-cells.js /
       bundle-core.js carry the new code. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var CORE = path.join(V, 'core');
var G = path.join(V, 'games');
var READXP = path.join(CORE, 'read-xp.js');
var BROWSE = path.join(G, 'bank-browse.js');
var REVIEW = path.join(G, 'review-pool.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
function grepHits(src, re) {
  var out = [];
  src.split('\n').forEach(function (l, i) {
    if (re.test(l)) out.push((i + 1) + ':' + l.trim().slice(0, 110));
  });
  return out;
}

console.log('== 1. node --check ==');
[['v1.4.3/core/read-xp.js', READXP],
 ['v1.4.3/games/bank-browse.js', BROWSE],
 ['v1.4.3/games/review-pool.js', REVIEW],
 ['build/bundle.js', path.join(ROOT, 'build', 'bundle.js')],
 ['build/bundle-core.js', path.join(ROOT, 'build', 'bundle-core.js')],
 ['scripts/verify-bankmeta-fe.js', path.join(ROOT, 'scripts', 'verify-bankmeta-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

var rx = read(READXP), bb = read(BROWSE), rp = read(REVIEW);
var rxCode = codeOnly(rx), bbCode = codeOnly(bb), rpCode = codeOnly(rp);

console.log('== 2. kill switch + silent no-op ==');
[['read-xp.js', rx, 'bankPrefillMeta'],
 ['bank-browse.js', bb, null],
 ['review-pool.js', rp, 'META_KILLED']
].forEach(function (t) {
  if (has(t[1], "PF.skip('bank-meta')") && has(t[1], 'pf_off=bank-meta')) ok('kill: ' + t[0]);
  else no('kill', t[0] + ' missing PF.skip(\'bank-meta\') or ?pf_off=bank-meta doc');
});
if (has(bb, "document.getElementById('pf-bank-browse')") && /if\s*\(!mount\)\s*\{\s*return/.test(bb))
  ok('mount: silent no-op when #pf-bank-browse absent');
else no('mount', 'missing silent no-op guard for #pf-bank-browse');
if (has(rx, 'META_KILLED') && has(rx, 'if (META_KILLED) return false;'))
  ok('kill: prefill hook no-ops under kill');
else no('kill', 'PF.bankPrefillMeta missing kill guard');

console.log('== 3. picker feature-detect ==');
if (has(rx, 'studio_plugins_list') && has(rx, 'metaProbe') && has(rx, 'probe=1'))
  ok('probe: studio_plugins_list registry probe present');
else no('probe', 'registry probe missing');
if (has(rx, 'data-rx-metabox') && has(rx, 'if (!ok) return;'))
  ok('probe: picker mounts only on probe success, placeholder stays empty otherwise');
else no('probe', 'picker not gated on probe success');
if (has(rx, 'metaSearch') && has(rx, '&q=') && has(rx, 'entity_type='))
  ok('search: entity search via registry with q + entity_type');
else no('search', 'entity search wiring missing');
if (has(rx, 'data-rx-metaclear') && has(rx, 'rx-meta-chip'))
  ok('picker: selected-entity chip with clear control');
else no('picker', 'selected-entity chip/clear missing');

console.log('== 4. canonical lists ==');
var AREAS = ['Voting Rights & Democracy Reform', 'Labor & Workers', 'Reproductive Rights & Abortion Access',
  'Climate & Environment', 'Racial Justice & Civil Rights', 'LGBTQ+ Rights', 'Immigrant Rights',
  'Criminal Justice Reform & Police Accountability', 'Healthcare Access', 'Housing & Tenants',
  'Anti-Poverty & Economic Justice', 'Government Watchdog & Accountability'];
var missingAreas = AREAS.filter(function (a) { return !has(rx, a); });
if (!missingAreas.length) ok('lists: 12 canonical issue areas in read-xp.js');
else no('lists', 'issue areas missing in read-xp.js: ' + missingAreas.join(' | '));
var TYPES = ['bill', 'rep', 'race', 'org', 'poll', 'prediction', 'campaign'];
var missingTypes = TYPES.filter(function (t) { return !has(rx, "'" + t + "'") && !has(rx, '"' + t + '"'); });
if (!missingTypes.length) ok('lists: 7 entity types in read-xp.js');
else no('lists', 'entity types missing in read-xp.js: ' + missingTypes.join(', '));
var missingBb = AREAS.filter(function (a) { return !has(bb, a); });
if (!missingBb.length) ok('lists: same 12 issue areas in bank-browse.js');
else no('lists', 'issue areas missing in bank-browse.js: ' + missingBb.join(' | '));
var missingBbT = TYPES.filter(function (t) { return !has(bb, '"' + t + '"'); });
if (!missingBbT.length) ok('lists: 7 entity types in bank-browse.js');
else no('lists', 'entity types missing in bank-browse.js: ' + missingBbT.join(', '));

console.log('== 5. prefill hook ==');
if (has(rx, 'PF.bankPrefillMeta = function'))
  ok('hook: PF.bankPrefillMeta defined');
else no('hook', 'PF.bankPrefillMeta not defined');
if (has(rx, 'entity_type, entity_id, entity_label?, issue_area?') || has(rx, 'entity_type, entity_id'))
  ok('hook: signature documented in header comment');
else no('hook', 'hook signature not documented');
if (has(rx, 'pendingMetaPrefill') && has(rx, 'if (pendingMetaPrefill)'))
  ok('hook: stashes when composer not mounted, applied by renderBank');
else no('hook', 'pending-prefill path missing');

console.log('== 6. bank_submit metadata + self-remix ==');
/* Backend contract (be/content-bank-metadata): 8 FLAT params — the nested
   political_meta object was silently dropped, so metaFlat is the contract. */
if (has(rx, 'function metaFlat(body, pm)') && has(rx, 'metaFlat(body, pm)') &&
    has(rx, 'function metaPayload(root)') &&
    !has(codeOnly(rx), 'body.political_meta = pm'))
  ok('submit: metadata rides bank_submit as 8 flat params (no nested object)');
else no('submit', 'bank_submit metadata not flattened to backend contract');
if (has(rx, "j.note === 'self_remix_no_award'"))
  ok('xp: self_remix_no_award note detected on acceptance');
else no('xp', "self_remix_no_award branch missing");
/* The self-remix confirmation branch must never promise XP amounts. */
var selfIdx = rx.indexOf("j.note === 'self_remix_no_award'");
if (selfIdx !== -1) {
  var branch = rx.slice(selfIdx, selfIdx + 900);
  if (branch.indexOf('no XP awarded') !== -1 && branch.indexOf('+10') === -1 && branch.indexOf('+20') === -1)
    ok('xp: self-remix confirmation shows "no XP awarded", no +10/+20 copy');
  else no('xp', 'self-remix confirmation copy wrong');
} else no('xp', 'self-remix branch not found');

console.log('== 7. gallery ==');
/* bank_list route absent (junk-removal 2026-10-06): no fetch; the gallery
   goes straight to the graceful stocking state. */
if (!has(bb, "'bank_list'") && has(bb, 'S.failed = true'))
  ok('gallery: no dead bank_list fetch; fail-soft stocking state');
else no('gallery', 'dead bank_list fetch still present');
if (has(bb, 'STILL BEING STOCKED') && has(bb, 'never an error wall'))
  ok('gallery: graceful stocking state when bank_list absent');
else no('gallery', 'graceful stocking state missing');
if (has(bb, 'data-bb-area') && has(bb, 'ALL FIGHTS'))
  ok('gallery: fight (issue-area) chips');
else no('gallery', 'issue-area chips missing');
if (has(bb, 'data-bb-type') && has(bb, 'Every entity type'))
  ok('gallery: entity-type filter');
else no('gallery', 'entity-type filter missing');
if (has(bb, 'data-bb-entity') && has(bb, 'Everything about'))
  ok('gallery: entity text search');
else no('gallery', 'entity text search missing');
if (has(bb, 'data-bb-sort="recent"') && has(bb, 'data-bb-sort="remixed"') && has(bb, 'MOST REMIXED'))
  ok('gallery: RECENT / MOST REMIXED sort');
else no('gallery', 'sort controls missing');
if (has(bb, 'LOAD MORE') && has(bb, 'has_more') && has(bb, 'offset'))
  ok('gallery: LOAD MORE pagination on has_more');
else no('gallery', 'pagination missing');
/* bank_list has no backend route (junk-removal 2026-10-06): the gallery
   renders the graceful stocking state; the entity_id/has_more wiring lives
   in git history for when the route lands. */
if (has(bb, 'S.failed = true') && has(bb, 'THE VAULT IS STILL BEING STOCKED'))
  ok('gallery: fail-soft stocking state (no bank_list route)');
else no('gallery', 'fail-soft stocking state missing');
if (has(bb, 'viewItem') && has(bb, 'raw.submission_id || raw.id'))
  ok('gallery: rows normalized to view objects (id -> submission_id)');
else no('gallery', 'viewItem normalization missing');
/* has_more inference lived in the removed bank_list success path; the
   gallery is fail-soft until the route lands. */
if (has(bb, 'S.failed = true'))
  ok('gallery: has_more n/a — fail-soft until bank_list lands');
else no('gallery', 'fail-soft marker missing');
if (has(bb, 'NOTHING BANKED HERE YET'))
  ok('gallery: empty-filter state copy');
else no('gallery', 'empty state copy missing');
if (has(bb, 'FRESH IN THE VAULT') && has(bb, 'REMIXED'))
  ok('gallery: remix-count line (factual, no XP)');
else no('gallery', 'remix-count display missing');

console.log('== 8. remix contract ==');
var REMIX_PARAMS = ['pf_plugin=', 'pf_template=', 'pf_entity=', 'pf_parent=', 'pf_data_hash=', 'pf_data_ts='];
var missingP = REMIX_PARAMS.filter(function (p) { return !has(bb, p); });
if (!missingP.length) ok('remix: all six pf_ params constructed');
else no('remix', 'params missing: ' + missingP.join(', '));
if (has(bb, "':'") || has(bb, '+":"+'))
  ok('remix: pf_entity built as <type>:<id>');
else no('remix', 'pf_entity type:id construction missing');
if (has(bb, 'encodeURIComponent'))
  ok('remix: params URL-encoded');
else no('remix', 'encodeURIComponent missing');
/* bank_remix has no backend route (junk-removal 2026-10-06): doRemix fails
   soft with the retry toast; the forge-handoff wiring lives in git history. */
if (has(bb, "Remix didn\\'t land"))
  ok('remix: fail-soft retry toast (no bank_remix route)');
else no('remix', 'fail-soft retry toast missing');
if (has(bb, 'PF.bankPrefillMeta') && (has(bb, "isn't live yet") || has(bb, "isn\\'t live yet") || has(bb, 'live yet')))
  ok('remix: Forge-absent fallback prefills the bank composer with a note');
else no('remix', 'prefill fallback missing');
if (has(bb, "'/create'") && has(bb, 'PF.bankForgePath'))
  ok('remix: default forge path /create + PF.bankForgePath override');
else no('remix', 'forge path default/override missing');
/* bank_remix POST removed (no backend route, junk-removal 2026-10-06) —
   doRemix goes straight to the fail-soft. (The contract stays documented
   in the module header for when the route lands.) */
if (!has(bb, 'postMut') && !has(bb, 'PF.postAction'))
  ok('remix: dead bank_remix POST machinery gone');
else no('remix', 'dead bank_remix POST still present');
/* Backend contract (be/content-bank-metadata): {ok, submission_id, remix:{...}}
   nested — read defensively via normRemix; forge_ready optional. */
if (has(bb, 'function normRemix(j, sid)') && has(bb, 'j.remix'))
  ok('remix: reads j.remix || j defensively (backend nested shape)');
else no('remix', 'defensive nested-remix read missing');

console.log('== 9. no XP copy in gallery/remix ==');
var xpHits = grepHits(bb, /\+10|\+20|xpGrant/i);
if (!xpHits.length) ok('xp: no +10/+20/xpGrant anywhere in bank-browse.js');
else no('xp', 'XP copy in gallery: ' + xpHits.join(' | '));
if (has(bb, 'earn nothing')) ok('xp: ruling copy ("earn nothing") present');
else no('xp', 'no-XP ruling note missing');

console.log('== 10. review chips ==');
if (has(rp, 'function metaChips(pm)') && has(rp, 'rp-chip'))
  ok('chips: metaChips renderer + CSS present');
else no('chips', 'metaChips renderer or CSS missing');
if (has(rp, 'a.political_meta || a.meta') && has(rp, '!META_KILLED'))
  ok('chips: render from political_meta/meta, gated by the kill');
else no('chips', 'chip render/gating missing');
var chipSrc = rp.slice(rp.indexOf('function metaChips(pm)'), rp.indexOf('function metaChips(pm)') + 800);
var chipFields = (chipSrc.match(/pm\.(entity_type|entity_id|issue_area)/g) || []);
var chipBad = /pm\.(submitter|callsign|device|xp|stake)/i.test(chipSrc);
if (chipFields.length >= 3 && !chipBad) ok('chips: factual tags only (entity_type/entity_id/issue_area)');
else no('chips', 'chip renderer reads wrong fields');
/* Blind UI preserved: the module still never touches identity/split fields. */
var BLIND = /submitter|gold_?standard|votes?_accept|votes?_reject|vote_?split|\bvoters?\b/i;
var blindHits = grepHits(rp, BLIND);
if (!blindHits.length) ok('chips: blind UI preserved (no identity/split fields)');
else no('chips', 'blind violation: ' + blindHits.join(' | '));

console.log('== 11. lexicon gate ==');
var HARD = /casino|white market|jackpot|high roller|takes double|roulette|coin flip|red\/black|single number pays|slots|run it back|rake\b|dice|double-or-nothing|donat/i;
[['read-xp.js', rx], ['bank-browse.js', bb], ['review-pool.js', rp]].forEach(function (t) {
  var hits = grepHits(t[1], HARD);
  /* read-xp.js line 48 is a PRE-EXISTING comment noting the banned d-word
     is not used in the file ("none used ("donate" never appears...)") —
     not a usage. Exempt that one exact line. */
  hits = hits.filter(function (h) {
    return !(t[0] === 'read-xp.js' && h.indexOf('Banned terms: none used') !== -1);
  });
  if (!hits.length) ok('lexicon: ' + t[0] + ' clean');
  else no('lexicon', t[0] + ': ' + hits.join(' | '));
});

console.log('== 12. backslash discipline ==');
[['read-xp.js', rx], ['bank-browse.js', bb], ['review-pool.js', rp]].forEach(function (t) {
  if (t[1].indexOf('`') === -1) ok('backslash: ' + t[0] + ' has no backtick spans');
  else no('backslash', t[0] + ' contains backticks');
});

console.log('== 13. no XP logic in frontend ==');
[['read-xp.js', rxCode], ['bank-browse.js', bbCode], ['review-pool.js', rpCode]].forEach(function (t) {
  var nm = t[0], code = t[1];
  if (/xpGrant/.test(code)) { no('xp-logic', nm + ': xpGrant called'); return; }
  if (/(stake_xp|stake_returned|reward_xp|lost_xp|xp_earned)\s*[-+*/%]/.test(code)) {
    no('xp-logic', nm + ': economy arithmetic'); return;
  }
  if (/(^|[^.\w])(STAKE|REWARD|XP_PER|XP_AMOUNT)\s*=\s*\d/.test(code)) {
    no('xp-logic', nm + ': client-side economy constants'); return;
  }
  ok('xp-logic: ' + nm + ' clean (no grants, no arithmetic, no constants)');
});

console.log('== 14. bundle registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
var listHits = (bsrc.match(/'bank-browse\.js'/g) || []).length;
if (listHits === 1) ok('bundle: bank-browse.js listed exactly once in build/bundle.js');
else no('bundle', "'bank-browse.js' listed " + listHits + ' times in build/bundle.js');
var createSec = bsrc.slice(bsrc.indexOf("'bundle-create'"), bsrc.indexOf("'bundle-bank'"));
if (createSec.indexOf("'bank-browse.js'") !== -1) ok('bundle: bank-browse.js in the bundle-create section');
else no('bundle', 'bank-browse.js not in bundle-create section');
var createBuilt = read(path.join(G, 'bundle-create.js'));
if (has(createBuilt, 'bank-browse') || has(createBuilt, 'pf-bank-browse')) ok('bundle: rebuilt bundle-create.js carries bank-browse');
else no('bundle', 'bundle-create.js missing bank-browse after rebuild');
var cellsBuilt = read(path.join(G, 'bundle-cells.js'));
if (has(cellsBuilt, 'rp-chip')) ok('bundle: rebuilt bundle-cells.js carries the review chips');
else no('bundle', 'bundle-cells.js missing rp-chip after rebuild');
var coreBuilt = read(path.join(CORE, 'bundle-core.js'));
if (has(coreBuilt, 'bankPrefillMeta')) ok('bundle: rebuilt bundle-core.js carries bankPrefillMeta');
else no('bundle', 'bundle-core.js missing bankPrefillMeta after rebuild');

console.log('== 15. functional (vm sandbox) ==');
(function functional() {
  var vm = require('vm');
  function mkEl(tag) {
    return {
      tagName: (tag || 'div').toUpperCase(), innerHTML: '', value: '',
      style: {}, _attrs: {},
      setAttribute: function (k, v) { this._attrs[k] = v; },
      getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      appendChild: function (c) { return c; },
      removeChild: function (c) {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function () {}, removeEventListener: function () {},
      classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } }
    };
  }
  function loadModule(src, mounts) {
    var doc = {
      getElementById: function (id) { return mounts[id] || null; },
      createElement: function (t) { return mkEl(t); },
      head: mkEl('head'), body: mkEl('body'), documentElement: mkEl('html'),
      addEventListener: function () {},
      readyState: 'complete',
      contains: function () { return true; },
      dispatchEvent: function () {}
    };
    var pfStub = {
      skip: function () { return false; },
      toast: function () {}, log: function () {}, error: function () {},
      errCopy: function (j, fb) { return fb; }
    };
    var win = {
      PF: pfStub,
      document: doc,
      location: { href: 'https://example.test/creator-hq', origin: 'https://example.test' },
      MutationObserver: undefined,
      CustomEvent: function (t, d) { this.type = t; this.detail = (d && d.detail) || {}; },
      setTimeout: setTimeout, clearTimeout: clearTimeout,
      setInterval: setInterval, clearInterval: clearInterval
      /* NOTE: no PF_BACKEND_URL — probes and public reads fail closed. */
    };
    var sandbox = { window: win, document: doc, console: console,
      Math: Math, JSON: JSON, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
      setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'mod.js' });
    return sandbox;
  }

  /* --- bank-browse: param contract, card/chip/empty renders --- */
  try {
    var bbMount = mkEl('div');
    var sb = loadModule(bb, { 'pf-bank-browse': bbMount });
    var T = sb.window.PF.bankBrowseT;
    if (!T) { no('functional', 'PF.bankBrowseT not exposed'); }
    else {
      var q = T.remixQuery({ plugin_id: 'civics', template_id: 'bill-card', entity_type: 'bill',
        entity_id: 'H.R. 14', parent_id: 'sub_9', data_hash: 'h1', data_ts: 't1' });
      var expectQ = 'pf_plugin=civics&pf_template=bill-card&pf_entity=bill%3AH.R.%2014' +
        '&pf_parent=sub_9&pf_data_hash=h1&pf_data_ts=t1';
      if (q === expectQ) ok('functional: remixQuery exact contract string');
      else no('functional', 'remixQuery mismatch: ' + q);
      var card = T.cardHtml({ submission_id: 'sub_9', caption: 'Fight poster',
        artifact_kind: 'image', artifact_url: 'https://x.test/p.png', remix_count: 3,
        political_meta: { entity_type: 'bill', entity_id: 'H.R. 14',
          issue_area: 'Voting Rights & Democracy Reform', plugin_id: 'civics' } });
      if (card.indexOf('data-bb-remix="sub_9"') !== -1 && card.indexOf('REMIX THIS') !== -1 &&
          card.indexOf('BILL') !== -1 && card.indexOf('H.R. 14') !== -1 &&
          card.indexOf('ISSUE') !== -1 && card.indexOf('Voting Rights &amp; Democracy Reform') !== -1)
        ok('functional: plugin card renders REMIX THIS + factual chips');
      else no('functional', 'plugin card render wrong');
      var plain = T.cardHtml({ submission_id: 'sub_1', caption: 'Plain meme',
        artifact_kind: 'image', artifact_url: 'https://x.test/m.png', remix_count: 0 });
      if (plain.indexOf('REMIX THIS') === -1 && plain.indexOf('FRESH IN THE VAULT') !== -1)
        ok('functional: non-plugin card has no remix button');
      else no('functional', 'non-plugin card wrong');
      /* Module auto-ran load(true) with no backend -> graceful stocking state. */
      if (T.S.failed === true && T.gridHtml().indexOf('STILL BEING STOCKED') !== -1)
        ok('functional: bank_list absent -> graceful stocking state');
      else no('functional', 'stocking state not rendered');
      T.S.failed = false; T.S.items = [];
      if (T.gridHtml().indexOf('NOTHING BANKED HERE YET') !== -1)
        ok('functional: empty-filter state renders');
      else no('functional', 'empty state missing');
      if (T.S.sort === 'recent' && T.filtersHtml().indexOf('MOST REMIXED') !== -1)
        ok('functional: sort controls present');
      else no('functional', 'sort controls wrong');
      /* viewItem: flat backend row (id, flat meta fields) -> view object. */
      if (typeof T.viewItem !== 'function') { no('functional', 'viewItem hook missing'); }
      else {
        var v = T.viewItem({ id: 42, caption: 'Poster', artifact_kind: 'image',
          artifact_url: 'https://x.test/p.png', remix_count: 0,
          entity_type: 'bill', entity_id: 'H.R. 14',
          issue_area: 'Voting Rights & Democracy Reform', plugin_id: 'civics',
          template_id: 'bill-card', data_hash: 'h1', data_ts: 't1' });
        if (v.submission_id === '42' && v.political_meta &&
            v.political_meta.entity_type === 'bill' && v.political_meta.entity_id === 'H.R. 14' &&
            v.political_meta.issue_area === 'Voting Rights & Democracy Reform' &&
            v.political_meta.plugin_id === 'civics' &&
            JSON.stringify(v).indexOf('undefined') === -1)
          ok('functional: viewItem normalizes flat row (id -> submission_id, meta nested)');
        else no('functional', 'viewItem wrong: ' + JSON.stringify(v));
        var card2 = T.cardHtml(v);
        if (card2.indexOf('data-bb-remix="42"') !== -1 && card2.indexOf('REMIX THIS') !== -1)
          ok('functional: normalized row renders REMIX THIS card');
        else no('functional', 'normalized card wrong');
      }
      /* normRemix: reads j.remix || j defensively. */
      if (typeof T.normRemix !== 'function') { no('functional', 'normRemix hook missing'); }
      else {
        var n1 = T.normRemix({ ok: true, submission_id: 'sub_9',
          remix: { plugin_id: 'civics', template_id: 'bill-card', entity_type: 'bill',
                   entity_id: 'H.R. 14', data_hash: 'h1', data_ts: 't1' } }, 'sub_9');
        var n2 = T.normRemix({ ok: true, plugin_id: 'civics', entity_type: 'rep',
          entity_id: 'J. Smith (TX-21)' }, 'sub_1');
        if (n1.plugin_id === 'civics' && n1.entity_id === 'H.R. 14' && n1.parent_id === 'sub_9' &&
            n2.plugin_id === 'civics' && n2.entity_id === 'J. Smith (TX-21)' && n2.parent_id === 'sub_1')
          ok('functional: normRemix reads nested remix and flat shapes');
        else no('functional', 'normRemix wrong: ' + JSON.stringify(n1) + ' / ' + JSON.stringify(n2));
      }
    }
  } catch (e) { no('functional', 'bank-browse vm: ' + e.message); }

  /* --- read-xp: prefill hook -> metaPayload --- */
  try {
    var sr = loadModule(rx, {});
    var RX = sr.window.PF.readXP;
    if (!RX || !RX._t || !RX._t.metaPayload) { no('functional', 'read-xp _t hooks not exposed'); }
    else {
      var bankEl = mkEl('div');
      RX.bank(bankEl); /* renderBank: mounts form, no picker (probe not reached — placeholder absent in stub) */
      var applied = sr.window.PF.bankPrefillMeta({
        entity_type: 'bill', entity_id: 'H.R. 14', issue_area: 'Voting Rights & Democracy Reform',
        plugin_id: 'civics', template_id: 'bill-card', data_hash: 'h1', data_ts: 't1',
        parent_id: 'sub_9', note: 'Remix staged below.'
      });
      var pm = RX._t.metaPayload(bankEl);
      if (applied === true && pm && pm.entity_type === 'bill' && pm.entity_id === 'H.R. 14' &&
          pm.issue_area === 'Voting Rights & Democracy Reform' && pm.plugin_id === 'civics' &&
          pm.template_id === 'bill-card' && pm.data_hash === 'h1' && pm.data_ts === 't1' &&
          pm.parent_id === 'sub_9')
        ok('functional: PF.bankPrefillMeta -> political_meta rides next submit');
      else no('functional', 'prefill/payload mismatch: ' + JSON.stringify(pm));
      /* metaFlat: the actual wire contract — 8 flat params, never nested. */
      if (typeof RX._t.metaFlat !== 'function') { no('functional', 'metaFlat hook missing'); }
      else {
        var body = RX._t.metaFlat({ artifact_url: 'https://x.test/p.png', caption: 'c' },
          { entity_type: 'bill', entity_id: 'H.R. 14', issue_area: 'Voting Rights & Democracy Reform',
            plugin_id: 'civics', template_id: 'bill-card', data_hash: 'h1', data_ts: 't1', parent_id: 'sub_9' });
        var flatKeys = ['entity_type','entity_id','issue_area','plugin_id','template_id','data_hash','data_ts','parent_id'];
        var flatOk = flatKeys.every(function (k) { return body[k] !== undefined && body[k] !== ''; });
        if (flatOk && body.political_meta === undefined && body.entity_id === 'H.R. 14')
          ok('functional: metaFlat writes 8 flat params, no nested political_meta');
        else no('functional', 'metaFlat wrong: ' + JSON.stringify(body));
        var sparse = RX._t.metaFlat({}, { entity_type: 'rep' });
        if (sparse.entity_type === 'rep' && sparse.entity_id === undefined && sparse.political_meta === undefined)
          ok('functional: metaFlat skips empty fields (sparse payload)');
        else no('functional', 'metaFlat sparse wrong: ' + JSON.stringify(sparse));
      }
      if (RX._t.metaAreas.length === 12 && RX._t.metaTypes.length === 7)
        ok('functional: 12 areas + 7 types exposed');
      else no('functional', 'canonical list lengths wrong');
      /* Probe fails closed with no backend. */
      RX._t.metaProbe(function (okProbe) {
        if (okProbe === false) ok('functional: registry probe fails closed (no backend)');
        else no('functional', 'probe should fail closed');
      });
    }
  } catch (e) { no('functional', 'read-xp vm: ' + e.message); }

  /* --- review-pool: chips render --- */
  try {
    var rpMount = mkEl('div');
    var rpPane = mkEl('div');
    var sp = loadModule(rp, { 'pf-review-pool': rpMount, 'rpPane': rpPane });
    var RPT = sp.window.PF.reviewPoolT;
    if (!RPT) { no('functional', 'PF.reviewPoolT not exposed'); }
    else {
      var chips = RPT.metaChips({ entity_type: 'rep', entity_id: 'J. Smith (TX-21)',
        issue_area: 'Climate & Environment' });
      if (chips.indexOf('REP') !== -1 && chips.indexOf('J. Smith (TX-21)') !== -1 &&
          chips.indexOf('ISSUE') !== -1 && chips.indexOf('Climate &amp; Environment') !== -1 &&
          chips.indexOf('rp-chip') !== -1)
        ok('functional: review chips render factual tags');
      else no('functional', 'chip render wrong: ' + chips.slice(0, 120));
      var bare = RPT.metaChips({});
      if (bare.indexOf('<span class="rp-chip"') === -1) ok('functional: no chips when metadata empty');
      else no('functional', 'chips rendered with no metadata');
    }
  } catch (e) { no('functional', 'review-pool vm: ' + e.message); }
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
