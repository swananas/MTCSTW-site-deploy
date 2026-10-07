#!/usr/bin/env node
/* scripts/verify-cross-data-flows-fe.js — cross-data flows frontend verification.
   CEO directive 2026-10-07 ~01:38 CDT "further integration via EMBEDDING".
   Run from the repo root:
     node scripts/verify-cross-data-flows-fe.js
   1. node --check on the four changed modules
   2. Static checks on the comment-stripped view (NO string stripping —
      the AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      Flow 1: receipt.js renders THEIR DISTRICT from sections.their_district,
        real town headlines, district zip links, full-report link, esc() on
        injected fields; share_log hook posts receipt:<slug>
      Flow 2: town-page.js calls town_reps, renders YOUR REPRESENTATIVES with
        /receipt/<slug> links only when receipt_ready, honest "dossier coming
        soon" otherwise, split-district note, source stamp
      Flow 3: bundle-extraction.js calls movement_feed, renders cross-rail
        cards linking back to source pages, skips empty rails honestly
      Flow 4: index-page.js kind-aware primary button (companies ->
        GET THE EXTRACTION FILE -> /extraction/<slug>; politicians ->
        GET THE FULL RECEIPT -> /receipt/<slug>), per-row deep links
      Global: zero XP (no xpGrant/pfReportAction), mobile-first CSS present,
        kill switches intact
   3. Mocked-browser runtime smoke (vm + minimal DOM stub): each silo loads
      without throwing; kill switch darkens; missing host = silent no-op.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MODS = {
  receipt: path.join(V, 'games', 'receipt.js'),
  town: path.join(V, 'core', 'town-page.js'),
  extraction: path.join(V, 'pages', 'bundle-extraction.js'),
  index: path.join(V, 'pages', 'index-page.js')
};
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
Object.keys(MODS).forEach(function (k) {
  try {
    cp.execSync('node --check ' + JSON.stringify(MODS[k]), { stdio: 'pipe' });
    ok('syntax: ' + k);
  } catch (e) { no('syntax: ' + k, 'node --check failed'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var R = stripComments(read(MODS.receipt));
var T = stripComments(read(MODS.town));
var E = stripComments(read(MODS.extraction));
var I = stripComments(read(MODS.index));

/* Flow 1 — receipt THEIR DISTRICT */
if (/function districtCard/.test(R) && /their_district/.test(R)) ok('F1: districtCard renders sections.their_district');
else no('F1: districtCard', 'missing districtCard or their_district read');
if (/THEIR DISTRICT/.test(R) && /SEE THE FULL TOWN REPORT/.test(R)) ok('F1: section title + full-report CTA');
else no('F1: title/CTA', 'missing');
if (/\/town\?zip=/.test(R)) ok('F1: district zip links to /town?zip=');
else no('F1: zip links', 'missing /town?zip= links');
if (/c\.headline/.test(R) && /c\.source\.name/.test(R)) ok('F1: real town headlines + source stamps rendered');
else no('F1: town data', 'not rendering town card headlines/sources');
if (/content_id: 'receipt:' \+ slug/.test(R) && /sp_action: 'share_log'/.test(R)) ok('F1: share_log hook posts receipt:<slug>');
else no('F1: share hook', 'missing share_log post');
/* esc discipline on the new receipt code */
var rNew = R.slice(R.indexOf('function districtCard'));
if (/esc\(td\.note/.test(rNew) && /esc\(c\.headline\)/.test(rNew) && /esc\(z\.zip5\)/.test(rNew)) ok('F1: esc() on injected district fields');
else no('F1: esc discipline', 'unescaped injection in districtCard');

/* Flow 2 — town YOUR REPRESENTATIVES */
if (/town_reps/.test(T) && /function renderReps/.test(T)) ok('F2: town_reps fetched + renderReps');
else no('F2: town_reps', 'missing');
if (/YOUR REPRESENTATIVES/.test(T)) ok('F2: section header');
else no('F2: header', 'missing');
if (/receipt_ready/.test(T) && /dossier coming soon/.test(T)) ok('F2: receipt link gated on receipt_ready, honest fallback');
else no('F2: link gating', 'missing');
if (/split_note/.test(T)) ok('F2: split-district note rendered');
else no('F2: split note', 'missing');
if (/data-tn-reps/.test(T)) ok('F2: mount point wired');
else no('F2: mount', 'missing data-tn-reps');

/* Flow 3 — extraction movement feed */
if (/movement_feed/.test(E) && /function loadMovement/.test(E)) ok('F3: movement_feed fetched + loadMovement');
else no('F3: movement_feed', 'missing');
if (/ACROSS THE MACHINE/.test(E)) ok('F3: cross-rail strip header');
else no('F3: strip header', 'missing');
if (/href="' \+ esc\(c\.url/.test(E)) ok('F3: cards link back to their source-page URL');
else no('F3: card links', 'mvCardHTML does not href the card url');
if (/sec\.status !== 'live'/.test(E)) ok('F3: empty rails skipped honestly');
else no('F3: honest-empty', 'missing status gate');

/* Flow 4 — index deep links */
if (/GET THE EXTRACTION FILE/.test(I) && /GET THE FULL RECEIPT/.test(I)) ok('F4: kind-aware primary button copy');
else no('F4: button copy', 'missing');
if (/kind === 'company'/.test(I)) ok('F4: company/politician branch');
else no('F4: kind branch', 'missing');
if (/\/extraction\/' \+ .*slug/.test(I) || /extraction_url/.test(I)) ok('F4: company -> /extraction/<slug>');
else no('F4: company link', 'missing');
if (/pf-idx-receipt.*\/receipt\//.test(I)) ok('F4: politician -> /receipt/<slug> (verified path)');
else no('F4: politician link', 'missing');
if (/EXTRACTION FILE →<\/a>/.test(I) && /GET THE RECEIPT →<\/a>/.test(I)) ok('F4: per-row deep links');
else no('F4: row links', 'missing');

/* Global */
[['receipt', R], ['town', T], ['extraction', E], ['index', I]].forEach(function (pair) {
  if (!/xpGrant|pfReportAction/.test(pair[1])) ok('zero-XP: ' + pair[0]);
  else no('zero-XP: ' + pair[0], 'XP call found');
});
if (/PF\.skip\('receipt'\)/.test(R) && /PF\.skip\('town'\)/.test(T) && /skip\('extraction'\)/.test(E)) ok('kill switches intact');
else no('kill switches', 'missing');
if (/@media|max-width/.test(T) && /max-width:760px/.test(E)) ok('mobile-first CSS present');
else no('mobile CSS', 'missing');

/* ============ 3. runtime smoke ============ */
console.log('== 3. runtime smoke (vm + DOM stub) ==');
function domStub() {
  var els = {};
  function mkEl(tag) {
    return {
      tagName: (tag || 'div').toUpperCase(), children: [], style: {},
      innerHTML: '', textContent: '', value: '', src: '',
      setAttribute: function () {}, getAttribute: function () { return null; },
      appendChild: function (c) { this.children.push(c); return c; },
      removeChild: function (c) { return c; },
      addEventListener: function () {}, removeEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      insertAdjacentHTML: function () {},
      classList: { contains: function () { return false; }, add: function () {} },
      parentNode: null
    };
  }
  var doc = {
    getElementById: function (id) { return els[id] || null; },
    createElement: function (t) { return mkEl(t); },
    querySelector: function () { return null; },
    addEventListener: function () {},
    readyState: 'complete',
    head: mkEl('head'), body: mkEl('body')
  };
  doc.head.appendChild = function () {};
  return { doc: doc, els: els, mkEl: mkEl };
}
function runSmoke(name, file, opts) {
  opts = opts || {};
  var s = domStub();
  if (opts.hostId) {
    var host = s.mkEl('div');
    host.querySelector = function () { return null; };
    host.querySelectorAll = function () { return []; };
    s.els[opts.hostId] = host;
  }
  var sandbox = {
    window: {}, document: s.doc, localStorage: { getItem: function () { return null; }, setItem: function () {} },
    navigator: {}, location: { href: 'https://www.mtcstw.com/', pathname: '/', search: '' },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    requestAnimationFrame: function (f) { return 0; },
    IntersectionObserver: function () { this.observe = function () {}; },
    fetch: function () { return Promise.reject(new Error('no net')); },
    console: console
  };
  sandbox.window = sandbox;
  sandbox.PF = { skip: function () { return opts.killed ? true : false; }, error: function () {} };
  sandbox.self = sandbox;
  try {
    vm.createContext(sandbox);
    vm.runInContext(read(file), sandbox, { filename: file, timeout: 5000 });
    ok('smoke: ' + name + ' loads' + (opts.killed ? ' (killed)' : ''));
  } catch (e) {
    no('smoke: ' + name, String((e && e.message) || e).slice(0, 120));
  }
}
runSmoke('receipt (no host)', MODS.receipt);
runSmoke('town (no host)', MODS.town);
runSmoke('extraction (no host)', MODS.extraction);
runSmoke('index (no host)', MODS.index);
runSmoke('receipt killed', MODS.receipt, { killed: true });
runSmoke('town killed', MODS.town, { killed: true });

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
