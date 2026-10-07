#!/usr/bin/env node
/* scripts/verify-townreport-fe.js — /town-report page frontend verification.
   Run from the repo root:
     node scripts/verify-townreport-fe.js
   1. node --check on the new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping —
      the AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      master kill switch, self-mount into #pf-town-report, esc() on all
      injected user fields, safeUrl on photo srcs + sticky hrefs, zero XP,
      user-content labels, immutable-data copy, share painter tap-only +
      JOIN THE FIGHT. CTA, light theme, bundle + page-mount + loader
      registration (PAGE_ORDERS/SELF/FE_MOUNT_IDS), town-page builder link
   3. Mocked-browser runtime tests (vm + minimal DOM stub):
      kill switch darkens everything; feed renders; builder renders with
      ?new=1 and ?zip= prefill; published view shows the loading state.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var TR_MOD = path.join(V, 'core', 'town-report.js');
var TR_BUNDLE = path.join(V, 'core', 'bundle-town-report.js');
var TOWN_SRC = path.join(V, 'core', 'town-page.js');
var TOWN_BUNDLE = path.join(V, 'core', 'bundle-town.js');
var PM_MOD = path.join(V, 'pages', 'page-mount.js');
var BC_MOD = path.join(ROOT, 'build', 'bundle-core.js');
var LOADER = path.join(ROOT, 'loader', 'footer_v144_final.html');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
[TR_MOD, TOWN_SRC, PM_MOD, BC_MOD].forEach(function (p) {
  try {
    cp.execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' });
    ok('syntax: ' + path.basename(p));
  } catch (e) { no('syntax: ' + path.basename(p), 'node --check failed'); }
});
/* The loader is HTML, not JS — node --check cannot parse it. Validate the
   edited script region instead: extract <script> bodies and check those. */
(function () {
  var html = read(LOADER);
  var bodies = [];
  var re = /<script[^>]*>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(html))) { if (m[1].trim()) bodies.push(m[1]); }
  if (!bodies.length) { no('loader: script extraction', 'no <script> bodies found'); return; }
  var bad = 0;
  bodies.forEach(function (b, i) {
    try { new (require('vm').Script)(b, { filename: 'footer-script-' + i + '.js' }); }
    catch (e) { bad++; }
  });
  if (!bad) ok('loader: embedded <script> bodies parse (' + bodies.length + ' blocks)');
  else no('loader: embedded <script> parse', bad + ' block(s) failed');
})();

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var tsrc = stripComments(read(TR_MOD));
(function () {
  if (has(TR_MOD, "PF.skip('townreport')") && has(TR_MOD, '?pf_off=townreport')) ok('master kill switch');
  else no('master kill switch', 'missing ?pf_off=townreport / PF.skip');
  if (has(TR_MOD, "getElementById('pf-town-report')")) ok('self-mounts into #pf-town-report');
  else no('self-mounts into #pf-town-report', 'mount div id not referenced');
  if (!/xpGrant|xpSpend|PF\.ledger|\+[0-9]+ XP/.test(tsrc)) ok('zero XP on this frontend');
  else no('zero XP on this frontend', 'XP code detected');
  ['esc(doc.title)', 'esc(doc.story)', 'esc(r.title)', 'esc(r.excerpt)',
   'esc(doc.author_callsign', 'esc(r.author_callsign)'].forEach(function (s) {
    if (has(TR_MOD, s)) ok('esc() on ' + s); else no('esc() on ' + s, 'unescaped injection');
  });
  if (has(TR_MOD, 'safeUrl(u)') && has(TR_MOD, 'safeUrl(st.town_url)')) ok('safeUrl on photo srcs + sticky hrefs');
  else no('safeUrl on photo srcs + sticky hrefs', 'missing');
  if (has(TR_MOD, 'USER ADDED') && has(TR_MOD, 'USER-GENERATED')) ok('user content clearly labeled');
  else no('user content labels', 'missing USER ADDED / USER-GENERATED');
  if (has(TR_MOD, 'NOT EDITABLE') && has(TR_MOD, 'cannot be edited')) ok('immutable town-data copy');
  else no('immutable town-data copy', 'missing');
  if (has(TR_MOD, 'JOIN THE FIGHT.') && has(TR_MOD, 'MTCSTW.COM')) ok('share CTA standard');
  else no('share CTA standard', 'missing JOIN THE FIGHT. / MTCSTW.COM');
  if (/function shareReport[\s\S]{0,400}paintReport\(doc\)/.test(tsrc)) ok('share painter runs only on tap');
  else no('share painter tap-only', 'paintReport not confined to shareReport');
  if (has(TR_MOD, 'THIS IS MY TOWN: ')) ok('"THIS IS MY TOWN: [ZIP]" share title');
  else no('share title', 'missing');
  if (has(TR_MOD, "'#fdfdfa'") || has(TR_MOD, '#fdfdfa')) ok('light paper theme');
  else no('light paper theme', 'missing #fdfdfa');
  if (has(TR_MOD, "qs('id')") && has(TR_MOD, "qs('new')") && has(TR_MOD, "qs('zip')")) ok('deep-link routing (?id= / ?new= / ?zip=)');
  else no('deep-link routing', 'missing');
  if (has(TR_MOD, 'requireCallsign')) ok('callsign claim surfacing on publish');
  else no('callsign claim', 'missing PF.requireCallsign');
  if (has(TR_MOD, "tr_action', 'town_report_publish'") || has(TR_MOD, "tr_action: 'town_report_publish'") || has(TR_MOD, "'town_report_publish'")) ok('publish posts town_report_publish');
  else no('publish action', 'missing');
  if (has(TR_MOD, "'town_report_delete'")) ok('author delete posts town_report_delete');
  else no('delete action', 'missing');
  if (!/\bwhitehouse\b|\bsold their vote\b/i.test(tsrc)) ok('no causal-claim copy');
  else no('no causal-claim copy', 'banned phrase present');
})();

(function () {
  var p = read(PM_MOD);
  if (/'pf-town-report':\s*\{/.test(p)) ok('page-mount: PAGE_ORDERS pf-town-report');
  else no('page-mount: PAGE_ORDERS pf-town-report', 'missing');
  if (/'townreport':\s*\{\s*div:\s*'pf-town-report'/.test(p)) ok('page-mount: SELF townreport');
  else no('page-mount: SELF townreport', 'missing');
  if (/'pf-town':\s*\{/.test(p)) ok('page-mount: PAGE_ORDERS pf-town restored');
  else no('page-mount: PAGE_ORDERS pf-town', 'missing (dropped by town-page merge)');
  if (/'town':\s*\{\s*div:\s*'pf-town'/.test(p)) ok('page-mount: SELF town restored');
  else no('page-mount: SELF town', 'missing');
  var mountIds = p.split('var FE_MOUNT_IDS')[1] || '';
  if (/'pf-town-report'/.test(mountIds) && /'pf-town'/.test(mountIds)) ok('page-mount: FE_MOUNT_IDS (+town, +town-report)');
  else no('page-mount: FE_MOUNT_IDS', 'missing');
  var b = read(BC_MOD);
  if (/core\/town-report\.js/.test(b)) ok('bundle-core: TOWNREPORT_FILES');
  else no('bundle-core: TOWNREPORT_FILES', 'missing');
  if (/'core\/bundle-town-report':\s*TOWNREPORT_FILES\.slice\(\)/.test(b)) ok('bundle-core: core/bundle-town-report chunk');
  else no('bundle-core: core/bundle-town-report chunk', 'missing');
  if (/core\/town-page\.js/.test(b) && /'core\/bundle-town':\s*TOWN_FILES\.slice\(\)/.test(b)) ok('bundle-core: TOWN_FILES restored');
  else no('bundle-core: TOWN_FILES', 'missing');
  var l = read(LOADER);
  if (/isTownReport=!!document\.getElementById\('pf-town-report'\)/.test(l)) ok('loader: isTownReport flag');
  else no('loader: isTownReport flag', 'missing');
  if (/\|\|isTownReport;/.test(l)) ok('loader: onV2 includes isTownReport');
  else no('loader: onV2', 'missing');
  if (/isTownReport\?\['core\/bundle-town-report\.js'\]/.test(l)) ok('loader: JS_GAMES routes bundle-town-report.js');
  else no('loader: JS_GAMES routing', 'missing');
})();

(function () {
  if (!fs.existsSync(TR_BUNDLE)) { no('built bundle: core/bundle-town-report.js', 'missing'); return; }
  ok('built bundle: core/bundle-town-report.js exists');
  var raw = fs.readFileSync(TR_MOD, 'utf8').length;
  var min = fs.readFileSync(TR_BUNDLE, 'utf8').length;
  if (min < raw * 0.75) ok('built bundle: minified (' + (min / 1024).toFixed(1) + 'KB)');
  else no('built bundle: minified', 'not minified? ' + min + ' vs ' + raw);
  if (min < 100 * 1024) ok('built bundle: under 100KB page-weight budget');
  else no('page-weight budget', min + ' bytes');
  if (has(TOWN_SRC, '/town-report?zip=')) ok('town-page: builder deep link (/town-report?zip=)');
  else no('town-page: builder link', 'missing');
  try {
    cp.execSync('node --check ' + JSON.stringify(TR_BUNDLE), { stdio: 'pipe' });
    ok('built bundle: node --check');
  } catch (e) { no('built bundle: node --check', 'failed'); }
})();

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. runtime (vm + DOM stub) ==');
function makeEl() {
  var kids = {};
  var el = {
    innerHTML: '', value: '', textContent: '', style: {},
    setAttribute: function () {}, getAttribute: function () { return null; },
    addEventListener: function () {}, appendChild: function () {},
    querySelector: function (sel) {
      if (!kids[sel]) kids[sel] = makeEl();
      return kids[sel];
    },
    querySelectorAll: function () { return []; },
    getContext: function () { return null; },
    click: function () {}, remove: function () {},
    /* test seam: full subtree HTML */
    _html: function () {
      var h = el.innerHTML || '';
      Object.keys(kids).forEach(function (k) { h += kids[k]._html(); });
      return h;
    }
  };
  return el;
}
function runVm(kill, search) {
  var host = makeEl(); host.id = 'pf-town-report';
  var loc = { search: search || '', href: 'https://www.mtcstw.com/town-report', pathname: '/town-report' };
  var doc = {
    getElementById: function (id) { return id === 'pf-town-report' ? host : null; },
    createElement: function () { return makeEl(); },
    head: { appendChild: function () {} },
    body: { classList: { contains: function () { return false; } }, appendChild: function () {} },
    addEventListener: function () {},
    readyState: 'complete', location: loc
  };
  var PF = { skip: function (id) { return kill === id; }, error: function () {} };
  var ctx = vm.createContext({
    window: { PF: PF, location: loc, PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev', PFCallsign: function () { return ''; } },
    document: doc, setTimeout: function () { return 0; }, URL: URL, File: function () {}, AbortController: function () {}
  });
  ctx.window.document = doc;
  try { vm.runInContext(read(TR_MOD), ctx, { filename: 'town-report.js' }); }
  catch (e) { return { err: e }; }
  return { host: host, ctx: ctx };
}
(function () {
  var r = runVm('townreport', '');
  if (r.err) { no('runtime: kill switch', String(r.err)); return; }
  if (!/MY TOWN REPORTS/.test(r.host.innerHTML || '')) ok('runtime: kill darkens everything');
  else no('runtime: kill darkens everything', 'rendered despite ?pf_off=townreport');
})();
(function () {
  var r = runVm('', '');
  if (r.err) { no('runtime: feed', String(r.err)); return; }
  var html = r.host.innerHTML || '';
  if (/MY TOWN REPORTS/.test(html) && /WRITE YOUR TOWN/.test(html)) ok('runtime: feed renders header + builder CTA');
  else no('runtime: feed', 'missing header/CTA');
  if (/PUBLISHED REPORTS/.test(html)) ok('runtime: feed section renders');
  else no('runtime: feed section', 'missing');
})();
(function () {
  var r = runVm('', '?new=1');
  if (r.err) { no('runtime: builder', String(r.err)); return; }
  var html = r.host._html();
  if (/STEP 1/.test(html) && /pf-tr-zip/.test(html)) ok('runtime: builder step 1 renders (?new=1)');
  else no('runtime: builder (?new=1)', 'missing step 1 / zip input');
})();
(function () {
  var r = runVm('', '?zip=70801');
  if (r.err) { no('runtime: builder zip', String(r.err)); return; }
  var html = r.host._html();
  if (/value="70801"/.test(html)) ok('runtime: builder prefills ?zip= (deep-link contract)');
  else no('runtime: builder ?zip= prefill', 'missing value="70801"');
})();
(function () {
  var r = runVm('', '?id=tr_abc123');
  if (r.err) { no('runtime: published', String(r.err)); return; }
  var html = r.host.innerHTML || '';
  if (/Pulling the report/.test(html)) ok('runtime: published view loading state (?id=)');
  else no('runtime: published (?id=)', 'missing loading state');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
