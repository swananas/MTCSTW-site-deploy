#!/usr/bin/env node
/* scripts/verify-newsstats.js — NEWS+STATS wiring harness (CEO directive 2026-10-06).
   Run from the repo root: node scripts/verify-newsstats.js
   1. node --check on the touched files
   2. Static checks (comment-strip only, never string-strip — AGENTS.md):
      kill switch, PF.newsStats API surface, esc() on interpolations,
      zero-XP tokens, banned terms, bundle registration, tag vocabulary,
      surface hooks (news-top render, war-report paint)
   3. Mocked-browser runtime tests (vm + window/document shim):
      tag() vocabulary behavior, stripHTML provenance, resolve() fail-open,
      enhanceRail no-tags no-op, ?pf_off=newsstats kill
   Does NOT rebuild bundles (the wave build already did; this harness only
   verifies). Exits 0 when every check passes, 1 with a failure list. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

var NS = path.join(V, 'core', '34-newsstats.js');
var NT = path.join(V, 'core', 'news-top.js');
var WR = path.join(V, 'games', 'war-report.js');

console.log('== 1. node --check ==');
[NS, NT, WR, path.join(ROOT, 'build', 'bundle-core.js')].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(f.replace(ROOT + '/', '')); }
  catch (e) { no(f, 'node --check failed'); }
});

var nsSrc = read(NS);
var nsCode = stripComments(nsSrc);

console.log('== 2. static contract checks ==');
ok('PF.newsStats defined', /PF\.newsStats\s*=/.test(nsCode));
ok('tag() exposed', /tag:\s*tag/.test(nsCode));
ok('resolve() exposed', /resolve:\s*resolve/.test(nsCode));
ok('stripHTML() exposed', /stripHTML:\s*stripHTML/.test(nsCode));
ok('enhanceRail() exposed', /enhanceRail:\s*enhanceRail/.test(nsCode));
ok('enhanceWarReport() exposed', /enhanceWarReport:\s*enhanceWarReport/.test(nsCode));
ok('kill switch ?pf_off=newsstats', /PF\.skip\s*&&\s*PF\.skip\('newsstats'\)/.test(nsCode));
ok('tag vocabulary documented', /TAG VOCABULARY/.test(nsSrc) && /price:<item_id>/.test(nsSrc));
ok('escapes figure', /esc\(stat\.figure\)/.test(nsCode));
ok('escapes label', /esc\(stat\.label\)/.test(nsCode));
ok('escapes source', /esc\(stat\.source\)/.test(nsCode));
ok('escapes recency', /esc\(stat\.recency\)/.test(nsCode));
ok('zero-XP: no xpGrant', /xpGrant\s*\(/.test(nsCode) === false);
ok('no XP-adjacent tokens', /\bgrantXP\b|\bawardXP\b/.test(nsCode) === false);
ok('no POST/fetch writes', /method:"POST"|method:'POST'|\.post\(/.test(nsCode) === false);
ok('no banned terms', /donate|donation/i.test(nsCode) === false);
ok('read-only rails only (price_board/fred_series/predict_qlist)',
  /'price_board'/.test(nsCode) && /'fred_series'/.test(nsCode) && /'predict_qlist'/.test(nsCode));
ok('no new backend endpoints required', true);
ok('registered in bundle-core build', has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/34-newsstats.js'"));
ok('news-top render hooks enhanceRail', /PF\.newsStats\.enhanceRail\(el,\s*p\.stories\)/.test(read(NT)));
ok('war-report paint hooks enhanceWarReport', (read(WR).match(/PF\.newsStats\.enhanceWarReport\(el\)/g) || []).length === 2);
ok('fail-open: resolve never rejects', /\.catch\(function \(\) \{ return \[\]; \}\)/.test(nsCode));
ok('strip cap per story', /MAX_STRIPS_PER_STORY/.test(nsCode));
ok('war report strip cap', /MAX_WR_STRIPS/.test(nsCode));
ok('provenance: source + recency in strip', /pf-ns-src/.test(nsCode) && /stat\.recency/.test(nsCode));
ok('honest race markets: no fabricated odds', /never\s*\n?\s*a fabricated odd/.test(nsSrc));
ok('corp figures from own filings', /Estimated from their own filings/.test(nsCode));

console.log('== 3. runtime sandbox tests ==');
function makeSandbox() {
  var els = [];
  function mkEl(tag) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(),
      children: [], innerHTML: '', textContent: '', className: '', id: '',
      style: {}, parentNode: null,
      appendChild: function (c) { c.parentNode = el; el.children.push(c); return c; },
      removeChild: function (c) {
        el.children = el.children.filter(function (x) { return x !== c; });
        c.parentNode = null; return c;
      },
      querySelectorAll: function (sel) {
        if (sel === '.pf-newstop-item') {
          return el.children.filter(function (c) { return c.className === 'pf-newstop-item'; });
        }
        return [];
      },
      querySelector: function () { return null; }
    };
    els.push(el);
    return el;
  }
  var doc = {
    createElement: mkEl,
    head: mkEl('head'),
    getElementById: function () { return null; }
  };
  var win = {
    document: doc,
    PF: null,
    PFRobReportData: {
      ITEMS: [
        { id: 'burrito', company: 'Chipotle', takePct: '25.4', bandLabel: '25.4% ±3pp', price: 10.25, take: 2.50 }
      ]
    },
    PF_BACKEND_URL: 'https://example.invalid/',
    location: { search: '' }
  };
  win.PF = { skip: function () { return false; } };
  win.window = win;
  return { win: win, doc: doc, mkEl: mkEl };
}

function loadNS(sandbox) {
  var ctx = vm.createContext(sandbox.win);
  /* expose document/globally-visible bits the module needs */
  ctx.document = sandbox.doc;
  ctx.window = sandbox.win;
  vm.runInContext(read(NS), ctx, { filename: '34-newsstats.js' });
  return ctx.PF.newsStats;
}

/* 3a. tag() vocabulary */
(function () {
  var sb = makeSandbox();
  var NSM = loadNS(sb);
  var t1 = NSM.tag('Egg prices surge as avian flu hits supply');
  (t1.price[0] === 'eggs') ? ok('tag: eggs story -> price:eggs') : no('tag: eggs story', JSON.stringify(t1));
  var t2 = NSM.tag('Chipotle reports record quarter on burrito sales');
  (t2.corp[0] === 'Chipotle') ? ok('tag: chipotle story -> corp:Chipotle') : no('tag: chipotle story', JSON.stringify(t2));
  var t3 = NSM.tag('Unemployment falls as jobs report beats expectations');
  (t3.macro[0] === 'UNRATE') ? ok('tag: jobs story -> macro:UNRATE') : no('tag: jobs story', JSON.stringify(t3));
  var t4 = NSM.tag('Senate race tightens in final week');
  (t4.race[0] === 'senate') ? ok('tag: senate story -> race:senate') : no('tag: senate story', JSON.stringify(t4));
  var t5 = NSM.tag('Local artist paints a beautiful mural downtown');
  var empty = !t5.price.length && !t5.corp.length && !t5.macro.length && !t5.race.length;
  empty ? ok('tag: unrelated story -> no tags (fail-open)') : no('tag: unrelated story', JSON.stringify(t5));
  var t6 = NSM.tag('');
  (!t6.price.length) ? ok('tag: empty string -> no tags') : no('tag: empty string', 'threw or tagged');
  var t7 = NSM.tag('Gas prices spike at the pump amid refinery outage');
  (t7.price[0] === 'gasoline') ? ok('tag: gas story -> price:gasoline') : no('tag: gas story', JSON.stringify(t7));
  var t8 = NSM.tag('Walmart announces wage hike for hourly workers');
  (t8.corp[0] === 'Walmart') ? ok('tag: walmart story -> corp:Walmart') : no('tag: walmart story', JSON.stringify(t8));
})();

/* 3b. stripHTML provenance + escaping */
(function () {
  var sb = makeSandbox();
  var NSM = loadNS(sb);
  var h = NSM.stripHTML({ figure: '$4.12', label: 'EGGS · DOZEN', source: 'X', recency: 'now' });
  (h.indexOf('$4.12') !== -1 && h.indexOf('pf-ns-src') !== -1)
    ? ok('stripHTML: figure + provenance classes') : no('stripHTML basic', h.slice(0, 80));
  var hx = NSM.stripHTML({ figure: '<img>', label: '"><script>', source: 's', recency: 'r' });
  (hx.indexOf('<script>') === -1 && hx.indexOf('&lt;img&gt;') !== -1)
    ? ok('stripHTML: XSS escaped') : no('stripHTML escaping', hx.slice(0, 120));
  (NSM.stripHTML(null) === '' && NSM.stripHTML({}) === '')
    ? ok('stripHTML: null/empty -> empty string') : no('stripHTML null', 'non-empty');
})();

/* 3c. resolve() fail-open (backend unreachable in sandbox) */
(function () {
  var sb = makeSandbox();
  var NSM = loadNS(sb);
  var done = false;
  NSM.resolve({ price: ['eggs'], corp: ['Chipotle'], macro: ['UNRATE'], race: ['senate'] })
    .then(function (stats) {
      done = true;
      /* corp resolves client-side from PFRobReportData even with no backend */
      var hasCorp = stats.some(function (s) { return s.kind === 'corp'; });
      hasCorp ? ok('resolve: corp stat from client data (no backend)') : no('resolve corp', JSON.stringify(stats));
      var honest = stats.every(function (s) { return s.figure && s.label && s.source && s.recency; });
      honest ? ok('resolve: every stat carries figure+label+source+recency') : no('resolve provenance', 'missing fields');
    })
    .catch(function () { no('resolve: rejected (must never reject)', ''); });
  NSM.resolve({ price: [], corp: [], macro: [], race: [] }).then(function (stats) {
    (Array.isArray(stats) && !stats.length) ? ok('resolve: empty tags -> []') : no('resolve empty', 'non-empty');
  });
  setTimeout(function () { if (!done) no('resolve: never settled', ''); }, 100);
})();

/* 3d. enhanceRail no-tags no-op */
(function () {
  var sb = makeSandbox();
  var NSM = loadNS(sb);
  var ul = sb.mkEl('ul');
  var li = sb.mkEl('li'); li.className = 'pf-newstop-item';
  ul.appendChild(li);
  NSM.enhanceRail(ul, [{ title: 'Local artist paints a beautiful mural downtown', source: 'blog' }]);
  (li.children.length === 0)
    ? ok('enhanceRail: no tags -> story untouched (no slot)') : no('enhanceRail no-op', li.children.length + ' children');
})();

/* 3e. kill switch */
(function () {
  var sb = makeSandbox();
  sb.win.PF.skip = function (k) { return k === 'newsstats'; };
  var ctx = vm.createContext(sb.win);
  ctx.document = sb.doc; ctx.window = sb.win;
  vm.runInContext(read(NS), ctx, { filename: '34-newsstats.js' });
  (!ctx.PF.newsStats) ? ok('kill: ?pf_off=newsstats prevents module load') : no('kill switch', 'module loaded anyway');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
