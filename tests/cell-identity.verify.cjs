#!/usr/bin/env node
/* tests/cell-identity.verify.cjs — CELL IDENTITY (2026-10-05): structured
   unique qualities for cells. CEO directive (Factory Mobilization, extends
   Engagement item #4).
   Run from the repo root:
     node tests/cell-identity.verify.cjs
   1. node build/bundle.js rebuild (only the bundle-cells outputs change)
   2. node --check on cell-identity.js, cells.js, cell-hq.js, build/bundle.js
   3. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      PFCellIdentity contract, ?pf_off=cell-identity kill, guided-founding
      gating (NEXT disabled until the core is defined), esc() on injected
      fields, zero-XP everywhere, banned terms (donate / real names),
      bundle registration before consumers, host integrations in cells.js +
      cell-hq.js (wizard mounts, backfill, discovery filters, identity cards,
      detail block, apply flow)
   4. Mocked-browser runtime (vm + minimal DOM stub):
      enabled() default true / false under PF.skip('cell-identity');
      mountWizard renders 6 step dots with NEXT disabled on step 1;
      cardIdentityHTML: complete profile -> tags + why-line + activity band,
      incomplete -> honest PROFILE INCOMPLETE (never invented qualities);
      filterRowHTML carries the quality selects; joinAffordanceHTML follows
      entry style (APPLICATION -> APPLY, code -> JOIN, full -> FULL).
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var CI = path.join(ROOT, 'v1.4.3', 'games', 'cell-identity.js');
var CELLS = path.join(ROOT, 'v1.4.3', 'games', 'cells.js');
var HQ = path.join(ROOT, 'v1.4.3', 'games', 'cell-hq.js');
var BB = path.join(ROOT, 'build', 'bundle.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function stat(src, code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing: ' + re));
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[CI, CELLS, HQ, BB].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var ci = read(CI), ciC = stripComments(ci);
var cells = read(CELLS), cellsC = stripComments(cells);
var hq = read(HQ), hqC = stripComments(hq);
var bb = read(BB);

/* ============ 2. cell-identity.js static ============ */
console.log('== 2. cell-identity.js static ==');
stat(ci, ciC, 'CI contract mountWizard', /mountWizard\s*:\s*mountWizard/);
stat(ci, ciC, 'CI contract mountKit', /mountKit\s*:\s*mountKit/);
stat(ci, ciC, 'CI contract backfillBannerHTML', /backfillBannerHTML\s*:\s*backfillBannerHTML/);
stat(ci, ciC, 'CI contract filterRowHTML', /filterRowHTML\s*:\s*filterRowHTML/);
stat(ci, ciC, 'CI contract cardIdentityHTML', /cardIdentityHTML\s*:\s*cardIdentityHTML/);
stat(ci, ciC, 'CI contract joinAffordanceHTML', /joinAffordanceHTML\s*:\s*joinAffordanceHTML/);
stat(ci, ciC, 'CI contract detailIdentityHTML', /detailIdentityHTML\s*:\s*detailIdentityHTML/);
stat(ci, ciC, 'CI contract loadIdentity', /loadIdentity\s*:\s*loadIdentity/);
stat(ci, ciC, 'CI contract applyToCell', /applyToCell\s*:\s*applyToCell/);
/* QC FIX (2026-10-05, Finding 2): founder review contract. */
stat(ci, ciC, 'CI contract listApplications', /listApplications\s*:\s*listApplications/);
stat(ci, ciC, 'CI contract reviewApplication', /reviewApplication\s*:\s*reviewApplication/);
stat(ci, ciC, 'CI contract applicationReviewHTML', /applicationReviewHTML\s*:\s*applicationReviewHTML/);
stat(ci, ciC, 'CI contract mountApplicationReview', /mountApplicationReview\s*:\s*mountApplicationReview/);
stat(ci, ciC, 'CI review lists via cell_applications_list', /cell_applications_list/);
stat(ci, ciC, 'CI review posts cell_application_review', /post\("cell_application_review"/);
stat(ci, ciC, 'CI review approve/deny buttons', /data-idapprove/);
stat(ci, ciC, 'CI review deny button', /data-iddeny/);
stat(ci, ciC, 'CI kill ?pf_off=cell-identity', /PF\.skip\(['"]cell-identity['"]\)/);
stat(ci, ciC, 'CI enabled() exposed', /enabled\s*:\s*enabled/);
stat(ci, ciC, 'CI 6-step wizard', /W\.step<6|step===6/);
stat(ci, ciC, 'CI NEXT disabled until core defined', /data-idnav="next".*disabled|stepValid\(\)\?"":" disabled/);
stat(ci, ciC, 'CI no-identity-no-founding copy', /a cell with no identity can't/i);
stat(ci, ciC, 'CI create requires full core', /Define the full identity to form the cell/);
stat(ci, ciC, 'CI esc defined', /function esc\(s\)/);
if ((ciC.match(/[^a-zA-Z]esc\(/g) || []).length >= 10) ok('CI esc() used on injected fields');
else no('CI esc() used', 'esc() called fewer than 10 times');
stat(ci, ciC, 'CI honest incomplete copy', /PROFILE INCOMPLETE/);
if (/never invented qualities/i.test(ci)) ok('CI never-invented-qualities invariant documented');
else no('CI never invented qualities', 'invariant not documented in module');
if (/never self-reported/i.test(ci)) ok('CI activity never-self-reported invariant documented');
else no('CI activity never self-reported', 'invariant not documented in module');
stat(ci, ciC, 'CI coarse location only', /coarse only/i);
stat(ci, ciC, 'CI stampCallsign kit', /PFShare\.stampCallsign/);
stat(ci, ciC, 'CI curated palettes (no free color)', /PALETTES\.map/);
stat(ci, ciC, 'CI wizard posts cell_create', /post\("cell_create"/);
stat(ci, ciC, 'CI edit posts cell_identity_set', /post\("cell_identity_set"/);
stat(ci, ciC, 'CI apply posts cell_apply', /post\("cell_apply"/);
stat(ci, ciC, 'CI emits pf-cell-formed', /pf-cell-formed/);
stat(ci, ciC, 'CI 16 causes curated', /"racial-justice","Racial Justice"/);
stat(ci, ciC, 'CI 5 specialties', /"data-collection","Data Collection"/);
if (!/xpGrant|xp_grant|postAction|PF\.postAction/i.test(ciC)) ok('CI zero-XP (no XP code)');
else no('CI zero-XP', 'XP-adjacent code found');
if (!/donate/i.test(ciC)) ok('CI banned term "donate" absent'); else no('CI donate', 'banned term found');
if (!/\+ ?\d+ ?XP/i.test(ciC)) ok('CI no XP-amount copy'); else no('CI XP copy', 'XP-amount copy found');

/* ============ 3. cells.js integration ============ */
console.log('== 3. cells.js integration ==');
stat(cells, cellsC, 'cells wizard mount guarded', /window\.PFCellIdentity\s*&&\s*window\.PFCellIdentity\.enabled\(\)/);
stat(cells, cellsC, 'cells wizard host', /cIdentWizard/);
stat(cells, cellsC, 'cells kill fallback keeps blank form', /identEnabled\(\)\s*\?\s*'[^']*cIdentWizard/);
stat(cells, cellsC, 'cells wizard create calls onDone refresh', /mountWizard\(wz/);
stat(cells, cellsC, 'cells backfill placeholder', /cIdentBackfill/);
stat(cells, cellsC, 'cells backfill banner', /backfillBannerHTML/);
stat(cells, cellsC, 'cells edit-mode wizard', /mode:"edit"|mode:\s*['"]edit['"]/);
/* QC FIX (2026-10-05, Finding 3): lobby sort wired. */
stat(cells, cellsC, 'cells lobby sort select', /id="cSort"/);
stat(cells, cellsC, 'cells lobby passes sort to cell_search', /sort:selVal\("cSort"\)/);
/* QC FIX (2026-10-05, Finding 1): lobby affordance follows entry style. */
stat(cells, cellsC, 'cells lobby entry-aware affordance', /joinAffordanceHTML\(cc\)/);
stat(cells, cellsC, 'cells lobby wires APPLY buttons', /button\[data-idapply\]/);

/* ============ 4. cell-hq.js integration ============ */
console.log('== 4. cell-hq.js integration ==');
stat(hq, hqC, 'hq wizard mount on MY CELLS', /hqIdentWizard/);
stat(hq, hqC, 'hq quality filter selects', /hqIdfCause.*hqIdfVibe|hqIdfCause/);
stat(hq, hqC, 'hq filters passed to cell_search', /cause:\s*S\.idfCause/);
stat(hq, hqC, 'hq identity cards in search', /cardIdentityHTML/);
stat(hq, hqC, 'hq delegation intercept before data-hq walk', /data-idjoin/);
stat(hq, hqC, 'hq apply flow', /data-idapply/);
stat(hq, hqC, 'hq detail identity block', /hqIdentDetail/);
stat(hq, hqC, 'hq detail kit mount', /mountKit/);
stat(hq, hqC, 'hq founder edit entry', /hqIdentityToInitial/);
stat(hq, hqC, 'hq wizard onDone refreshes mine', /refreshMineThen\('mine'\)/);
/* QC FIX (2026-10-05, Finding 2): founder review panel, founder-gated. */
stat(hq, hqC, 'hq founder review panel', /hqAppReview/);
stat(hq, hqC, 'hq review shows pending count', /pending_applications/);
stat(hq, hqC, 'hq review mounts founder-gated', /isFounder && \(ident2\.entry_style/);
stat(hq, hqC, 'hq mounts application review', /mountApplicationReview/);
/* QC FIX (2026-10-05, Finding 3): HQ browse sort wired. */
stat(hq, hqC, 'hq browse sort select', /hqIdfSort/);
stat(hq, hqC, 'hq doSearch passes sort', /sort:\s*S\.idfSort/);
stat(hq, hqC, 'hq persists sort choice', /S\.idfSort = strIn\('hqIdfSort'\)/);

/* ============ 5. bundle registration ============ */
console.log('== 5. bundle registration ==');
if (/'cell-identity\.js'/.test(bb)) ok('bundle lists cell-identity.js'); else no('bundle cell-identity', 'not in build/bundle.js');
var ciPos = bb.indexOf("'cell-identity.js'");
/* Order within each bundle list (indexOf on the whole file hits other
   bundles' 'cells.js' first). */
function orderInBundle(bundleKey, first, second) {
  var start = bb.indexOf("'" + bundleKey + "'");
  if (start < 0) return false;
  var end = bb.indexOf('],', start);
  var seg = bb.slice(start, end < 0 ? start + 8000 : end);
  var p1 = seg.indexOf("'" + first + "'"), p2 = seg.indexOf("'" + second + "'");
  return p1 >= 0 && p2 >= 0 && p1 < p2;
}
if (orderInBundle('bundle-cells-h', 'cell-identity.js', 'cells.js')) ok('cell-identity.js before cells.js (bundle-cells-h)');
else no('bundle order', 'cell-identity.js not before cells.js in bundle-cells-h');
if (ciPos >= 0 && orderInBundle('bundle-cells', 'cell-identity.js', 'cell-hq.js')) ok('cell-identity.js before cell-hq.js (bundle-cells)');
else no('bundle order', 'cell-identity.js not before cell-hq.js in bundle-cells');
if (/cell-identity/.test(read(path.join(ROOT, 'v1.4.3', 'games', 'bundle-cells.js')))) ok('bundle-cells.js built with module');
else no('bundle-cells.js', 'module missing from built bundle');
if (/cell-identity/.test(read(path.join(ROOT, 'v1.4.3', 'games', 'bundle-cells-h.js')))) ok('bundle-cells-h.js built with module');
else no('bundle-cells-h.js', 'module missing from built bundle');

/* ============ 6. mocked-browser runtime ============ */
console.log('== 6. mocked-browser runtime ==');
function makeSandbox(skipIdent) {
  var store = {};
  function mkEl() {
    var el = {
      innerHTML: '', textContent: '', style: {}, dataset: {},
      disabled: false, value: '',
      setAttribute: function () {}, removeAttribute: function () {},
      getAttribute: function () { return null; },
      appendChild: function (c) { return c; }, removeChild: function () {},
      click: function () {},
      querySelector: function () { return mkEl(); },
      querySelectorAll: function () { return []; },
      addEventListener: function () {}, removeEventListener: function () {}
    };
    return el;
  }
  var head = mkEl();
  var sandbox = {
    console: console,
    window: null,
    document: {
      head: head,
      createElement: function () { return mkEl(); },
      getElementById: function (id) { return store[id] || null; },
      querySelector: function () { return null; },
      addEventListener: function () {}
    },
    PF: {
      skip: function (k) { return skipIdent && k === 'cell-identity'; },
      toast: function () {}
    },
    PF_BACKEND_URL: '',
    localStorage: { getItem: function () { return null; }, setItem: function () {} }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox._store = store;
  sandbox._mkEl = mkEl;
  return sandbox;
}
function loadCI(skipIdent) {
  var sb = makeSandbox(skipIdent);
  vm.createContext(sb);
  vm.runInContext(read(CI), sb, { filename: 'cell-identity.js' });
  return sb;
}

(function runtimeEnabled() {
  var sb = loadCI(false);
  var PFI = sb.window.PFCellIdentity;
  if (!PFI) { no('RT module exposed', 'window.PFCellIdentity missing'); return; }
  ok('RT module exposed');
  if (PFI.enabled() === true) ok('RT enabled() true by default'); else no('RT enabled()', 'expected true, got ' + PFI.enabled());

  var host = sb._mkEl();
  var r = PFI.mountWizard(host, { stateOptsHTML: '<option value="">x</option>' });
  if (r === true) ok('RT mountWizard mounts when enabled'); else no('RT mountWizard', 'returned ' + r);
  if (/id-dot/.test(host.innerHTML) && (host.innerHTML.match(/id-dot/g) || []).length >= 6) ok('RT wizard renders 6 step dots');
  else no('RT wizard dots', 'expected 6 step dots');
  if (/data-idnav="next"[^>]*disabled/.test(host.innerHTML)) ok('RT step-1 NEXT disabled (name empty)');
  else no('RT NEXT gating', 'NEXT not disabled on empty step 1');
  if (/FORM CELL/.test(host.innerHTML) === false) ok('RT submit only on step 6');
  else no('RT submit gating', 'submit visible on step 1');

  var card = PFI.cardIdentityHTML({
    profile_complete: true, causes: ['Labor', 'Housing'], vibes: ['Meme Warfare'],
    specialties: ['Propaganda'], why: 'Labor + Housing · Propaganda crew · Blazing this week',
    activity: 'BLAZING', entry_style: 'open'
  });
  if (/Labor/.test(card) && /Meme Warfare/.test(card) && /BLAZING/.test(card) && /Labor \+ Housing/.test(card)) ok('RT complete card shows tags + why + activity');
  else no('RT complete card', 'missing tags/why/activity: ' + card.slice(0, 120));
  var inc = PFI.cardIdentityHTML({ profile_complete: false });
  if (/PROFILE INCOMPLETE/.test(inc)) ok('RT incomplete card honest (never invented)');
  else no('RT incomplete card', 'missing PROFILE INCOMPLETE');

  var fr = PFI.filterRowHTML({});
  if (/idFCause/.test(fr) && /idFVibe/.test(fr) && /idFSpec/.test(fr) && /idFEntry/.test(fr) && /idFAct/.test(fr)) ok('RT filter row carries all quality selects');
  else no('RT filter row', 'missing quality selects');
  if (/Labor/.test(fr) && /Propaganda/.test(fr)) ok('RT filter row uses curated sets');
  else no('RT filter curated', 'curated options missing');

  var ja = PFI.joinAffordanceHTML({ id: 'c1', member_count: 3, entry_style: 'application' });
  if (/data-idapply="c1"/.test(ja) && /APPLY/.test(ja)) ok('RT application entry -> APPLY');
  else no('RT apply affordance', 'got: ' + ja.slice(0, 80));
  var jo = PFI.joinAffordanceHTML({ id: 'c2', member_count: 2, entry_style: 'open', invite_code: 'ABCD12' });
  if (/data-idjoin="ABCD12"/.test(jo) && /JOIN/.test(jo)) ok('RT open entry + code -> JOIN');
  else no('RT join affordance', 'got: ' + jo.slice(0, 80));
  var jf = PFI.joinAffordanceHTML({ id: 'c3', member_count: 5, entry_style: 'open', invite_code: 'ZZZZ99' });
  if (/FULL/.test(jf)) ok('RT full cell -> FULL'); else no('RT full', 'got: ' + jf.slice(0, 80));
  var jinv = PFI.joinAffordanceHTML({ id: 'c4', member_count: 1, entry_style: 'invite' });
  if (/invite only/.test(jinv)) ok('RT invite-only without code -> honest note');
  else no('RT invite-only', 'got: ' + jinv.slice(0, 80));

  var bb2 = PFI.backfillBannerHTML('Test Cell');
  if (/Test Cell/.test(bb2) && /data-idbackfill/.test(bb2) && !/shame|penalty|punish/i.test(bb2)) ok('RT backfill banner invitational');
  else no('RT backfill banner', 'copy problem');

  var det = PFI.detailIdentityHTML(
    { id: 'c1', name: 'Test Cell', state: 'LA', motto: 'Fight hard', palette: 0, causes: ['Labor'], activity: 'ACTIVE' },
    { profile_complete: true, causes: [{ key: 'labor', label: 'Labor' }], vibes: [], specialties: [],
      why: 'Labor crew · Active this week', cadence_label: 'Weekly', entry_label: 'Open',
      region: 'Gulf Coast', size_band: '3/5', activity: 'ACTIVE', charter: 'We fight.',
      trophies: [{ label: 'Week-one streak', detail: 'Checked in 7 days straight' }] },
    true);
  if (/Gulf Coast/.test(det) && /coarse/.test(det) && /Week-one streak/.test(det) && /EDIT IDENTITY/.test(det)) ok('RT detail shows coarse region + trophies + founder edit');
  else no('RT detail', 'missing region/trophies/edit: ' + det.slice(0, 120));
  var detInc = PFI.detailIdentityHTML({ name: 'X' }, null, false);
  if (/PROFILE INCOMPLETE/.test(detInc)) ok('RT detail incomplete honest for non-founder');
  else no('RT detail incomplete', 'missing honest state');

  /* QC FIX (2026-10-05, Finding 2): founder review panel runtime. */
  var rev = PFI.applicationReviewHTML([
    { callsign: 'hopeful3', note: 'Door-knocker, Gulf Coast.', ts: 1791240000000 },
    { callsign: 'quiet_one', note: '', ts: 0 }
  ]);
  if (/hopeful3/.test(rev) && /Door-knocker/.test(rev) && /quiet_one/.test(rev)) ok('RT review lists callsign + note per application');
  else no('RT review list', 'missing callsign/note: ' + rev.slice(0, 120));
  if (/data-idapprove="hopeful3"/.test(rev) && /data-iddeny="hopeful3"/.test(rev)) ok('RT review approve/deny buttons carry the callsign');
  else no('RT review buttons', 'missing data attributes');
  var revX = PFI.applicationReviewHTML([{ callsign: '<script>alert(1)</script>', note: '<b>x</b>', ts: 1 }]);
  if (/&lt;script&gt;/.test(revX) && !/<script>alert/.test(revX) && /&lt;b&gt;/.test(revX)) ok('RT review escapes applicant fields');
  else no('RT review esc', 'unescaped applicant content');
  var revEmpty = PFI.applicationReviewHTML([]);
  if (/No pending applications/.test(revEmpty)) ok('RT review empty state honest');
  else no('RT review empty', 'got: ' + revEmpty.slice(0, 80));
  if (PFI.mountApplicationReview(null, 'c1') === false) ok('RT review mount null-host safe');
  else no('RT review mount null', 'should return false');
  var revHost = sb._mkEl();
  if (PFI.mountApplicationReview(revHost, 'c1') === true) ok('RT review mount returns true');
  else no('RT review mount', 'returned non-true');
  /* No backend in the sandbox (PF_BACKEND_URL='') -> the list call fails
     honest, never spins. */
  if (/Network error/.test(revHost.innerHTML)) ok('RT review mount fails honest with no backend');
  else no('RT review mount fail', 'got: ' + String(revHost.innerHTML).slice(0, 80));
})();

(function runtimeKilled() {
  var sb = loadCI(true);
  var PFI = sb.window.PFCellIdentity;
  if (!PFI) { no('RT-kill module exposed', 'missing'); return; }
  if (PFI.enabled() === false) ok('RT kill: enabled() false under ?pf_off=cell-identity');
  else no('RT kill enabled()', 'expected false');
  var host = sb._mkEl();
  if (PFI.mountWizard(host, {}) === false && host.innerHTML === '') ok('RT kill: mountWizard no-ops');
  else no('RT kill mountWizard', 'did not no-op');
})();

/* ============ done ============ */
console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('CELL IDENTITY FE VERIFY: ALL GREEN');
