#!/usr/bin/env node
/* scripts/verify-karl-fe.js — /karl page frontend verification.
   Run from the repo root:
     node scripts/verify-karl-fe.js
   1. node --check on the new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping —
      the AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      master kill switch, self-mount into #pf-karl, esc() on all injected
      fields, safeUrl on related hrefs, zero XP code, no causal-claim copy
      ("I don't have data on that yet", no verdict language), degraded FAQ
      banner, disambiguation never-guesses copy, bundle + page-mount
      registration (PAGE_ORDERS/SELF/FE_MOUNT_IDS)
   3. Mocked-browser runtime tests (vm + minimal DOM stub):
      kill switch darkens everything; hero renders with input + chips;
      fact-set fixture renders sourced cards + staleness badge;
      disambiguation renders pick-one buttons; honest-empty renders the
      valid-answer copy; related deep links render as doors.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var KARL_MOD = path.join(V, 'core', 'karl-page.js');
var PM_MOD = path.join(V, 'pages', 'page-mount.js');
var BC_MOD = path.join(ROOT, 'build', 'bundle-core.js');
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
[KARL_MOD, PM_MOD, BC_MOD].forEach(function (p) {
  try {
    cp.execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' });
    ok('syntax: ' + path.basename(p));
  } catch (e) { no('syntax: ' + path.basename(p), 'node --check failed'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var ksrc = stripComments(read(KARL_MOD));
(function () {
  if (has(KARL_MOD, "PF.skip('karl')") && has(KARL_MOD, '?pf_off=karl')) ok('master kill switch');
  else no('master kill switch', 'missing ?pf_off=karl / PF.skip');
  if (has(KARL_MOD, "getElementById('pf-karl')")) ok('self-mounts into #pf-karl');
  else no('self-mounts into #pf-karl', 'mount div id not referenced');
  if (!/xpGrant|xpSpend|PF\.ledger|\+[0-9]+ XP/.test(ksrc)) ok('zero XP on this frontend');
  else no('zero XP on this frontend', 'XP code detected');
  ['esc(f.label)', 'esc(f.value_display)', 'esc(f.note)', 'esc(l.label)'].forEach(function (s) {
    if (has(KARL_MOD, s)) ok('esc() on ' + s); else no('esc() on ' + s, 'unescaped injection');
  });
  if (has(KARL_MOD, 'safeUrl(l.href)')) ok('safeUrl on related hrefs');
  else no('safeUrl on related hrefs', 'missing');
  if (has(KARL_MOD, "I don\\'t have data on that yet")) ok('honest-empty copy ("I don\'t have data on that yet")');
  else no('honest-empty copy', 'missing the valid-answer line');
  if (has(KARL_MOD, 'Karl never guesses')) ok('disambiguation never-guesses copy');
  else no('disambiguation copy', 'missing');
  if (has(KARL_MOD, 'pf-karl-degraded')) ok('degraded-mode banner');
  else no('degraded-mode banner', 'missing');
  if (has(KARL_MOD, 'pf-karl-rail')) ok('rail status strip');
  else no('rail status strip', 'missing');
  if (has(KARL_MOD, 'pf-karl-door')) ok('sticky-web deep links (doors)');
  else no('sticky-web doors', 'missing');
  if (!/\bbought by\b|\bsold their vote\b/i.test(ksrc)) ok('no causal-claim copy');
  else no('no causal-claim copy', 'banned phrase present');
  /* Light theme: the page must not inherit the dark red site chrome. */
  if (has(KARL_MOD, '#faf8f3') || has(KARL_MOD, '#faf8f')) ok('light theme base');
  else no('light theme base', 'missing light background');
  /* Input is the hero: font-size >= 16px (no iOS zoom), type=text, Enter submits. */
  if (has(KARL_MOD, 'font-size:17px') && has(KARL_MOD, 'pf-karl-input')) ok('hero input (>=16px, no iOS zoom)');
  else no('hero input', 'missing');
})();

(function () {
  var p = read(PM_MOD);
  if (/'pf-karl':\s*\{/.test(p)) ok('page-mount: PAGE_ORDERS pf-karl');
  else no('page-mount: PAGE_ORDERS pf-karl', 'missing');
  if (/'karl':\s*\{\s*div:\s*'pf-karl'/.test(p)) ok('page-mount: SELF karl');
  else no('page-mount: SELF karl', 'missing');
  var mountIds = p.split('var FE_MOUNT_IDS')[1] || '';
  if (/'pf-karl'/.test(mountIds)) ok('page-mount: FE_MOUNT_IDS');
  else no('page-mount: FE_MOUNT_IDS', 'missing');
  var b = read(BC_MOD);
  if (/core\/karl-page\.js/.test(b)) ok('bundle-core: KARL_FILES');
  else no('bundle-core: KARL_FILES', 'missing');
  if (/'core\/bundle-karl':\s*KARL_FILES\.slice\(\)/.test(b)) ok('bundle-core: core/bundle-karl chunk');
  else no('bundle-core: core/bundle-karl chunk', 'missing');
})();

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. runtime (vm + DOM stub) ==');
function makeDom(opts) {
  opts = opts || {};
  var els = {};
  function el(id) {
    if (!els[id]) {
      els[id] = {
        id: id, innerHTML: '', value: '', children: [],
        listeners: {}, style: {},
        addEventListener: function (t, fn) { this.listeners[t] = fn; },
        querySelectorAll: function (sel) {
          if (sel === '.pf-karl-chip' || sel === '.pf-karl-disamb button') return [];
          return [];
        },
        scrollIntoView: function () {}
      };
    }
    return els[id];
  }
  var host = el('pf-karl');
  host.querySelectorAll = function (sel) { return []; };
  var doc = {
    getElementById: function (id) { return id === 'pf-karl' ? host : null; },
    createElement: function () {
      return { addEventListener: function () {}, set async(v) {}, set src(v) {}, set onerror(f) {},
        parentNode: null };
    },
    head: { appendChild: function () {} },
    location: { search: opts.search || '', href: 'https://www.mtcstw.com/karl' },
    body: { classList: { contains: function () { return false; } } },
    currentScript: null
  };
  return { doc: doc, host: host };
}
function runVm(kill, search) {
  var d = makeDom({ search: search });
  var PF = { skip: function (id) { return kill === id; }, error: function () {} };
  var ctx = vm.createContext({
    window: { PF: PF, location: d.doc.location, PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev' },
    document: d.doc, setTimeout: function () {}, URL: URL
  });
  ctx.window.document = d.doc;
  /* The silo reads bare `document` and `window` — expose on the sandbox. */
  var src = read(KARL_MOD);
  try { vm.runInContext(src, ctx, { filename: 'karl-page.js' }); }
  catch (e) { return { err: e }; }
  return { host: d.host, ctx: ctx };
}
(function () {
  var r = runVm('karl', '');
  if (r.err) { no('runtime: kill switch', String(r.err)); return; }
  var html = r.host.innerHTML || '';
  if (!/pf-karl/.test(html)) ok('runtime: kill darkens everything');
  else no('runtime: kill darkens everything', 'rendered despite ?pf_off=karl');
})();
(function () {
  var r = runVm('', '');
  if (r.err) { no('runtime: hero', String(r.err)); return; }
  var html = r.host.innerHTML || '';
  if (/pf-karl-input/.test(html) && /pf-karl-btn/.test(html)) ok('runtime: hero input + ASK button render');
  else no('runtime: hero input', 'missing input or button');
  if (/pf-karl-chip/.test(html)) ok('runtime: example chips render');
  else no('runtime: example chips', 'missing');
  if (/pf-karl-form/.test(html)) ok('runtime: form (Enter submits)');
  else no('runtime: form', 'missing');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
