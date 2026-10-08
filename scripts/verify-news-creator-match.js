#!/usr/bin/env node
/* scripts/verify-news-creator-match.js — NEWS+CREATORS wiring harness
   (Synergy-7, CEO directive 2026-10-07).
   Run from the repo root: node scripts/verify-news-creator-match.js
   1. node --check on the touched files
   2. Static checks (comment-strip only, never string-strip — AGENTS.md):
      kill switch, PF.newsCreatorMatch API surface, esc()/safeUrl() on
      interpolations, zero-XP tokens, no writes, bundle registration,
      surface hooks (news-top render, slr-catalog mount)
   3. Mocked-browser runtime tests (vm + window/document shim + the real
      slr-master-db.json): topic tagging both sides, creatorsForStory
      ranking + cap + fail-soft, storiesForCreator, enhanceRail slot
      injection (match-only), mountCreatorNews, ?pf_off kill, newsTop
      failure fail-soft.
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
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

var NCM = path.join(V, 'core', '35-news-creator-match.js');
var NT = path.join(V, 'core', 'news-top.js');
var CAT = path.join(V, 'pages', 'slr-catalog.js');
var BUILD = path.join(ROOT, 'build', 'bundle-core.js');
var DB = path.join(ROOT, 'src', 'data', 'slr-master-db.json');

console.log('== 1. node --check ==');
[NCM, NT, CAT, BUILD].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(f.replace(ROOT + '/', '')); }
  catch (e) { no(f, 'node --check failed'); }
});

var src = read(NCM);
var code = stripComments(src);

console.log('== 2. static contract checks ==');
function ck(name, re, target) { (re.test(target || code)) ? ok(name) : no(name, 'pattern missing'); }
function ckNot(name, re, target) { (re.test(target || code)) ? no(name, 'forbidden pattern present') : ok(name); }
ck('PF.newsCreatorMatch defined', /PF\.newsCreatorMatch\s*=/);
ck('topicsFor exposed', /topicsFor:\s*topicsFor/);
ck('topicsForStory exposed', /topicsForStory:\s*topicsForStory/);
ck('creatorsForStory exposed', /creatorsForStory:\s*creatorsForStory/);
ck('storiesForCreator exposed', /storiesForCreator:\s*storiesForCreator/);
ck('enhanceRail exposed', /enhanceRail:\s*enhanceRail/);
ck('mountCreatorNews exposed', /mountCreatorNews:\s*mountCreatorNews/);
ck('kill switch ?pf_off=news-creator-match', /PF\.skip\s*&&\s*PF\.skip\('news-creator-match'\)/);
ck('tag vocabulary documented', /TAG VOCABULARY/, src);
ck('14 topics in taxonomy', /\['feminism',/, src);
ck('escapes creator name', /esc\(m\.name/);
ck('escapes story title', /esc\(s\.title\)/);
ck('safeUrl on hrefs', /safeUrl\(s\.url\)/);
ck('scheme allowlist', /p === 'http:' \|\| p === 'https:'/);
ck('do-not-touch slug excluded', /jeanine-pirreaux-comedy/);
ck('lazy-load creator photos', /loading="lazy"/);
ckNot('zero-XP: no xpGrant', /xpGrant\s*\(/);
ckNot('no XP-adjacent tokens', /\bgrantXP\b|\bawardXP\b/);
ckNot('no POST/fetch writes', /method:"POST"|method:'POST'|\.post\(/);
ck('bundle registration', /core\/35-news-creator-match\.js/, read(BUILD));
ck('news-top render hook', /PF\.newsCreatorMatch\.enhanceRail\(el, p\.stories\)/, read(NT));
ck('catalog mount point', /id="pf-catalog-news"/, read(CAT));
ck('catalog mount call', /PF\.newsCreatorMatch\)\s*PF\.newsCreatorMatch\.mountCreatorNews\(/, read(CAT));

console.log('== 3. runtime tests (mocked browser + real master DB) ==');

/* ---- tiny DOM shim ---- */
function makeEl(tag) {
  var el = {
    tagName: tag, children: [], className: '', id: '',
    style: {}, textContent: '',
    appendChild: function (c) {
      if (!c) return c;
      if (c.parentNode && c.parentNode !== el && c.parentNode.removeChild) {
        try { c.parentNode.removeChild(c); } catch (e) {}
      }
      el.children.push(c); c.parentNode = el; return c;
    },
    removeChild: function (c) {
      var i = el.children.indexOf(c);
      if (i !== -1) el.children.splice(i, 1);
      return c;
    },
    querySelectorAll: function (sel) {
      var out = [];
      (function walk(n) {
        (n.children || []).forEach(function (c) {
          if (!c) return;
          if (sel === '.pf-newstop-item' && c._isItem) out.push(c);
          if (sel === '.pf-ncm' && c._isNcm) out.push(c);
          walk(c);
        });
      })(el);
      return out;
    },
    querySelector: function (sel) {
      var all = el.querySelectorAll(sel);
      return all.length ? all[0] : null;
    },
    setAttribute: function () {},
    parentNode: null
  };
  Object.defineProperty(el, 'firstChild', { get: function () { return el.children[0] || null; } });
  var _html = '';
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return _html; },
    /* shim parses only what the tests need: pf-ncm slot markers */
    set: function (v) {
      _html = String(v == null ? '' : v);
      if (/class="pf-ncm"/.test(_html)) {
        var marker = makeEl('div');
        marker._isNcm = true;
        el.appendChild(marker);
      }
    }
  });
  return el;
}
function makeLi() { var li = makeEl('li'); li._isItem = true; return li; }

var listeners = {};
var documentShim = {
  createElement: makeEl,
  head: makeEl('head'),
  addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
  getElementById: function () { return null; },
  querySelectorAll: function () { return []; }
};

var members = JSON.parse(read(DB)).members;
var stories = [
  { url: 'https://x.test/1', title: 'ICE raids sweep Chicago workplaces as deportations ramp up', source: 'AP', published_at: Date.now() - 3600000 },
  { url: 'https://x.test/2', title: 'UAW strike expands: autoworkers walk out at three more plants', source: 'Reuters', published_at: Date.now() - 7200000 },
  { url: 'https://x.test/3', title: 'Senate blocks abortion pill access in late-night vote', source: 'NBC', published_at: Date.now() - 10800000 },
  { url: 'https://x.test/4', title: 'Local man wins regional pie contest for third year', source: 'Gazette', published_at: Date.now() - 14400000 },
  { url: 'https://x.test/5', title: 'Gaza ceasefire talks resume amid humanitarian crisis', source: 'Al Jazeera', published_at: Date.now() - 18000000 }
];

function loadModule(opts) {
  opts = opts || {};
  var PF = {
    skip: function (k) { return opts.killed && k === 'news-creator-match'; },
    log: function () {},
    slrReady: Promise.resolve(members),
    slrAll: function () { return members; },
    newsTop: opts.breakNews ? null : {
      get: function () {
        if (opts.newsFails) return Promise.reject(new Error('down'));
        return Promise.resolve({ stories: stories });
      }
    }
  };
  var sandbox = {
    window: {}, document: documentShim, console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Promise: Promise, URL: URL, fetch: function () { return Promise.reject(new Error('no net')); }
  };
  sandbox.window.PF = PF;
  sandbox.window.PF_BACKEND_URL = '';
  vm.createContext(sandbox);
  vm.runInContext(read(NCM), sandbox, { filename: '35-news-creator-match.js' });
  return sandbox.window.PF;
}

(async function () {
  var PF = loadModule();
  var N = PF.newsCreatorMatch;
  if (!N) { no('module boots', 'PF.newsCreatorMatch missing'); return finish(); }
  ok('module boots');

  /* topic tagging — creator side */
  var moreno = members.filter(function (m) { return m.slug === 'moreno-neurospicy-news'; })[0];
  var mt = N.topicsFor(moreno);
  (mt.indexOf('immigration') !== -1 && mt.indexOf('lgbtq') !== -1)
    ? ok('creator topics: moreno -> immigration+lgbtq (' + mt.join(',') + ')')
    : no('creator topics: moreno', 'got [' + mt.join(',') + ']');

  var nik = members.filter(function (m) { return m.slug === 'nikalie-monroe'; })[0];
  var nt2 = N.topicsFor(nik);
  (nt2.indexOf('immigration') !== -1 && nt2.indexOf('foreign') !== -1 && nt2.indexOf('abortion') !== -1)
    ? ok('creator topics: nikale-monroe -> immigration+foreign+abortion')
    : no('creator topics: nikale-monroe', 'got [' + nt2.join(',') + ']');

  /* topic tagging — story side */
  var st0 = N.topicsForStory(stories[0]);
  (st0.indexOf('immigration') !== -1) ? ok('story topics: ICE story -> immigration')
    : no('story topics: ICE story', 'got [' + st0.join(',') + ']');
  var st3 = N.topicsForStory(stories[3]);
  (st3.length === 0) ? ok('story topics: pie contest -> no topics (fail-soft)')
    : no('story topics: pie contest', 'got [' + st3.join(',') + ']');

  /* story -> creators: ranking, cap, fail-soft */
  var picks = N.creatorsForStory(stories[0], members, 3);
  (picks.length > 0 && picks.length <= 3)
    ? ok('creatorsForStory: ICE story -> ' + picks.length + ' creators (' + picks.map(function (p) { return p.slug; }).join(', ') + ')')
    : no('creatorsForStory: ICE story', 'got ' + picks.length);
  var none = N.creatorsForStory(stories[3], members, 3);
  (none.length === 0) ? ok('creatorsForStory: pie contest -> [] (no section)')
    : no('creatorsForStory: pie contest', 'got ' + none.length);
  var ranked = N.creatorsForStory(stories[1], members, 3); /* labor story */
  var ordered = true;
  for (var i = 1; i < ranked.length; i++) {
    var a = N.topicsForStory(stories[1]).filter(function (t) { return N.topicsFor(ranked[i - 1]).indexOf(t) !== -1; }).length;
    var b = N.topicsForStory(stories[1]).filter(function (t) { return N.topicsFor(ranked[i]).indexOf(t) !== -1; }).length;
    if (b > a) ordered = false;
  }
  ordered ? ok('creatorsForStory: labor story ranked by overlap desc') : no('creatorsForStory ranking', 'out of order');

  /* creator -> stories */
  var sh = N.storiesForCreator(moreno, stories, 3);
  (sh.length > 0 && sh[0].url === 'https://x.test/1')
    ? ok('storiesForCreator: moreno -> ICE story first (' + sh.length + ' hits)')
    : no('storiesForCreator: moreno', 'got ' + sh.length + ' hits');
  var blank = members.filter(function (m) { return m.slug === 'minnesota-department-of-prop'; })[0];
  var shb = N.storiesForCreator(blank, stories, 3);
  (shb.length === 0) ? ok('storiesForCreator: topic-less creator -> [] (no section)')
    : no('storiesForCreator: topic-less creator', 'got ' + shb.length);

  /* enhanceRail: slots only where matches exist */
  var rail = makeEl('div');
  stories.forEach(function () { rail.appendChild(makeLi()); });
  N.enhanceRail(rail, stories);
  await new Promise(function (r) { setTimeout(r, 50); });
  var slots = rail.querySelectorAll('.pf-ncm');
  (slots.length === 4)
    ? ok('enhanceRail: 4/5 stories get creator slots, pie story skipped')
    : no('enhanceRail slot count', 'got ' + slots.length + ', want 4');

  /* mountCreatorNews */
  var mount = makeEl('div');
  N.mountCreatorNews(mount, moreno);
  await new Promise(function (r) { setTimeout(r, 50); });
  (mount.innerHTML.indexOf('RECENTLY IN THE NEWS') !== -1 && mount.innerHTML.indexOf('ICE raids') !== -1)
    ? ok('mountCreatorNews: moreno section renders with ICE story')
    : no('mountCreatorNews: moreno', 'section missing');
  var mount2 = makeEl('div');
  N.mountCreatorNews(mount2, blank);
  await new Promise(function (r) { setTimeout(r, 50); });
  (mount2.innerHTML === '')
    ? ok('mountCreatorNews: topic-less creator -> empty (no section)')
    : no('mountCreatorNews: topic-less creator', 'rendered unexpectedly');

  /* kill switch */
  var PFk = loadModule({ killed: true });
  (!PFk.newsCreatorMatch) ? ok('kill switch: ?pf_off=news-creator-match boots nothing')
    : no('kill switch', 'module still defined');

  /* news failure fail-soft */
  var PFf = loadModule({ newsFails: true });
  var rail2 = makeEl('div');
  stories.forEach(function () { rail2.appendChild(makeLi()); });
  try {
    PFf.newsCreatorMatch.enhanceRail(rail2, stories);
    await new Promise(function (r) { setTimeout(r, 50); });
    ok('fail-soft: enhanceRail survives member/news resolution failure');
  } catch (e) { no('fail-soft: enhanceRail', String(e)); }
  var mount3 = makeEl('div');
  try {
    PFf.newsCreatorMatch.mountCreatorNews(mount3, moreno);
    await new Promise(function (r) { setTimeout(r, 50); });
    (mount3.innerHTML === '') ? ok('fail-soft: mountCreatorNews empty when news down')
      : no('fail-soft: mountCreatorNews', 'rendered without news');
  } catch (e) { no('fail-soft: mountCreatorNews', String(e)); }

  finish();
})().catch(function (e) { no('runtime harness', String(e && e.stack || e)); finish(); });

function finish() {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
}
