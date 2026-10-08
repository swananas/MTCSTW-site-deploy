#!/usr/bin/env node
/* scripts/verify-blossom-craft-fe.js — PROJECT BLOSSOM routine-craft verification.
   Run from the repo root:
     node scripts/verify-blossom-craft-fe.js
   Covers the fe/blossom-craft build items:
     F1 catalog two-track exits (follow-the-creator / join-the-movement,
        callsign ENLIST entry, fail-soft PF.nextMove slot, no dead ends)
     F2 real related creators (affinity matching: platforms + content_focus
        + score + reach; deterministic; never the old identical trio)
     F3 score single source of truth (roster + catalog read PF.slrScoreText)
     F4 catalog breadcrumbs (Home / Sick Left Radicals / {Name})
     M4 PHQ money tab: redirect card replaced by a plain tab-rail link to
        /follow-the-money (anchor survives phq-hubs refreshTabs)
   1. node --check on changed modules
   2. Static checks on the comment-stripped view (NO string stripping —
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind)
   3. Mocked-browser runtime (vm + minimal DOM stub): the real 07-slr-db.js
      loads against the real src/data/slr-master-db.json; affinity is
      exercised for determinism/sanity; slr-catalog.js and slr-roster.js
      render against the real DB and their HTML is asserted; money-page.js
      runs its redirect path and the rail tab becomes a link.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var DB_MOD = path.join(V, 'core', '07-slr-db.js');
var CAT_MOD = path.join(V, 'pages', 'slr-catalog.js');
var ROS_MOD = path.join(V, 'pages', 'slr-roster.js');
var MP_MOD = path.join(V, 'core', 'money-page.js');
var PHQ_MOD = path.join(V, 'games', 'phq-hubs.js');
var PM_MOD = path.join(V, 'pages', 'page-mount.js');
var DB_JSON = path.join(ROOT, 'src', 'data', 'slr-master-db.json');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('bundle-core rebuilt');
} catch (e) { no('bundle-core rebuild', String(e.message || e).slice(0, 200)); }
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('bundle (games/pages) rebuilt');
} catch (e) { no('bundle rebuild', String(e.message || e).slice(0, 200)); }

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
[DB_MOD, CAT_MOD, ROS_MOD, MP_MOD, PHQ_MOD].forEach(function (p) {
  try { cp.execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' }); ok('syntax ' + path.basename(p)); }
  catch (e) { no('syntax ' + path.basename(p), 'node --check failed'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var db = stripComments(read(DB_MOD));
var cat = stripComments(read(CAT_MOD));
var ros = stripComments(read(ROS_MOD));
var mp = stripComments(read(MP_MOD));
var phq = stripComments(read(PHQ_MOD));

/* ---- F1: two-track exits ---- */
if (cat.indexOf('TRACK 01') !== -1 && cat.indexOf('TRACK 02') !== -1) ok('F1: two-track block present');
else no('F1 two-track', 'TRACK 01/02 markers missing');
if (cat.indexOf('WANT IN? JOIN THE SICK LEFT RADICALS') === -1) ok('F1: old single CTA link removed');
else no('F1 old CTA', 'still present');
if (cat.indexOf('href="/creator-onboard"') !== -1) ok('F1: Track 02 routes to /creator-onboard');
else no('F1 track B target', 'missing /creator-onboard');
if (cat.indexOf('pf-cat-follow') !== -1) ok('F1: Track 01 anchors to the follow-links section');
else no('F1 track A anchor', 'missing');
if (cat.indexOf('href="/sick-left-radicals"') !== -1) ok('F1: no dead ends (fallback target present)');
else no('F1 fallback', 'missing');
if (cat.indexOf('PF.mountClaimCTA') !== -1) ok('F1: callsign ENLIST entry via PF.mountClaimCTA');
else no('F1 claim CTA', 'missing');
if (cat.indexOf('PF.nextMove') !== -1 && cat.indexOf("typeof PF.nextMove.render === 'function'") !== -1) ok('F1: PF.nextMove.render used fail-soft (absent-safe)');
else no('F1 nextMove', 'not guarded');
if (cat.toLowerCase().indexOf('donate') === -1) ok('F1: no "donate" copy');
else no('F1 banned copy', '"donate" found');

/* ---- F2: real related creators ---- */
if (db.indexOf('PF.slrRelated') !== -1) ok('F2: PF.slrRelated defined in the shared DB layer');
else no('F2 slrRelated', 'missing');
if (cat.indexOf('PF.slrRelated') !== -1) ok('F2: catalog page consumes PF.slrRelated');
else no('F2 catalog wiring', 'missing');
if (cat.indexOf('nearest scores') === -1) ok('F2: old nearest-score sort removed');
else no('F2 old sort', 'still present');

/* ---- F3: score single source of truth ---- */
if (db.indexOf('PF.slrScoreText') !== -1 && db.indexOf('PF.slrScore') !== -1) ok('F3: PF.slrScore/PF.slrScoreText defined once in 07-slr-db.js');
else no('F3 getters', 'missing');
if (cat.indexOf('PF.slrScoreText(m.slug)') !== -1) ok('F3: catalog reads PF.slrScoreText');
else no('F3 catalog', 'not using the shared getter');
if (ros.indexOf('PF.slrScoreText(m.slug)') !== -1) ok('F3: roster reads PF.slrScoreText');
else no('F3 roster', 'not using the shared getter');
if (cat.indexOf('propaganda_score.toFixed') === -1 && ros.indexOf('propaganda_score.toFixed') === -1) ok('F3: no direct propaganda_score.toFixed in either page');
else no('F3 direct reads', 'a page still formats the DB field itself');

/* ---- F4: breadcrumbs ---- */
if (cat.indexOf('aria-label="Breadcrumb"') !== -1) ok('F4: breadcrumb nav present');
else no('F4 breadcrumb', 'missing');
if (cat.indexOf('aria-current="page"') !== -1) ok('F4: current page marked');
else no('F4 aria-current', 'missing');
if (cat.indexOf('>Home<') !== -1 && cat.indexOf('Sick Left Radicals</a>') !== -1) ok('F4: Home / Sick Left Radicals trail');
else no('F4 trail', 'incomplete');

/* ---- M4: PHQ money tab rail link ---- */
if (mp.indexOf('The money war room moved') === -1) ok('M4: redirect card copy gone');
else no('M4 redirect card', 'still present');
if (mp.indexOf('.pf-mp-redirect') === -1) ok('M4: redirect card styles removed');
else no('M4 redirect styles', 'dead CSS remains');
if (mp.indexOf('railLinkTab') !== -1) ok('M4: railLinkTab converts the money tab');
else no('M4 railLinkTab', 'missing');
if (mp.indexOf('/follow-the-money') !== -1) ok('M4: tab-rail link targets /follow-the-money');
else no('M4 target', 'missing');
if (phq.indexOf("b.tagName === 'A'") !== -1) ok('M4: phq-hubs refreshTabs skips anchor tabs');
else no('M4 refreshTabs guard', 'missing');
if (mp.toLowerCase().indexOf('donate') === -1) ok('M4: no "donate" copy');
else no('M4 banned copy', '"donate" found');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime ==');
var DB = JSON.parse(read(DB_JSON));

/* ---- shared harness: real 07-slr-db.js against the real DB ---- */
function loadDB() {
  var sb = { window: null };
  sb.window = sb;
  sb.document = {
    currentScript: null,
    getElementsByTagName: function () { return []; },
    createElement: function () { return { setAttribute: function () {}, }; },
    head: { appendChild: function () {} },
    addEventListener: function () {}
  };
  sb.localStorage = { getItem: function () { return null; }, setItem: function () {} };
  sb.PF = { skip: function () { return false; }, log: function () {}, error: function () {} };
  sb.window.PF_SLR_DB_SNAPSHOT = DB;
  vm.createContext(sb);
  vm.runInContext(read(DB_MOD), sb, { filename: '07-slr-db.js' });
  return sb.window.PF;
}
var PF = null;
try {
  PF = loadDB();
  if (PF && typeof PF.slrRelated === 'function' && typeof PF.slrScoreText === 'function') ok('DB layer loads: slrRelated + slrScoreText present');
  else no('DB layer load', 'getters missing');
} catch (e) { no('DB layer load', String((e && e.stack) || e).slice(0, 200)); }

if (PF) {
  /* F2 runtime: determinism, validity, diversity */
  try {
    var bad = 0, selfRef = 0, short = 0, sameOld = 0;
    DB.members.forEach(function (m) {
      var r1 = PF.slrRelated(m.slug, 3), r2 = PF.slrRelated(m.slug, 3);
      if (r1.length !== 3) short++;
      if (r1.some(function (x) { return x.slug === m.slug; })) selfRef++;
      if (!r1.every(function (x) { return x && x.slug && x.catalog_path; })) bad++;
      if (r1.map(function (x) { return x.slug; }).join(',') !==
          r2.map(function (x) { return x.slug; }).join(',')) bad++;
      var old = DB.members.filter(function (x) { return x.slug !== m.slug; })
        .sort(function (a, b) { return Math.abs(a.propaganda_score - m.propaganda_score) - Math.abs(b.propaganda_score - m.propaganda_score); })
        .slice(0, 3).map(function (x) { return x.slug; }).join(',');
      if (r1.map(function (x) { return x.slug; }).join(',') === old) sameOld++;
    });
    if (short === 0) ok('F2 runtime: 3 related for all 62 members');
    else no('F2 related count', short + ' members short');
    if (selfRef === 0) ok('F2 runtime: never self-referential');
    else no('F2 self ref', selfRef + ' hits');
    if (bad === 0) ok('F2 runtime: deterministic, all slugs valid with catalog paths');
    else no('F2 validity', bad + ' bad');
    if (sameOld === 0) ok('F2 runtime: 0/62 pages keep the old identical trio');
    else no('F2 diversity', sameOld + ' pages unchanged vs old algorithm');
    /* unknown slug -> [] (fail-soft) */
    if (PF.slrRelated('no-such-creator', 3).length === 0) ok('F2 runtime: unknown slug returns []');
    else no('F2 unknown slug', 'not fail-soft');
  } catch (e) { no('F2 runtime', String((e && e.stack) || e).slice(0, 200)); }

  /* F3 runtime: single source == DB for every member */
  try {
    var drift = 0;
    DB.members.forEach(function (m) {
      if (PF.slrScoreText(m.slug) !== Number(m.propaganda_score).toFixed(1)) drift++;
      if (Math.abs(PF.slrScore(m.slug) - Number(m.propaganda_score)) > 1e-9) drift++;
    });
    if (drift === 0) ok('F3 runtime: PF.slrScoreText == DB value for all 62 members (zero drift)');
    else no('F3 drift', drift + ' mismatches');
    if (PF.slrScoreText('the-antifascist-frog') === '9.0') ok('F3 runtime: the-antifascist-frog resolves 9.0 (the desync case)');
    else no('F3 frog', 'got ' + PF.slrScoreText('the-antifascist-frog'));
    if (PF.slrScoreText('nope') === '0.0') ok('F3 runtime: unknown slug degrades to 0.0');
    else no('F3 unknown slug', 'not fail-soft');
  } catch (e) { no('F3 runtime', String((e && e.stack) || e).slice(0, 200)); }
}

/* ---- catalog page render harness ---- */
function renderCatalog(slug) {
  var sb = { window: null };
  sb.window = sb;
  sb.location = { pathname: '/' + slug, href: 'https://www.mtcstw.com/' + slug, search: '' };
  function mkEl(tag) {
    var el = { tagName: String(tag).toUpperCase(), children: [], _attrs: {}, _html: '',
      style: {}, parentNode: null, className: '', textContent: '' };
    el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
    el.getAttribute = function (k) {
      return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
    };
    el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.insertBefore = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.querySelector = function () { return null; };
    el.querySelectorAll = function () { return []; };
    el.addEventListener = function () {};
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return el._html; },
      set: function (v) { el._html = String(v); }
    });
    return el;
  }
  var catEl = mkEl('div');
  catEl.setAttribute('data-slug', slug);
  sb.document = {
    readyState: 'complete',
    createElement: function (t) { return mkEl(t); },
    getElementById: function (id) { return id === 'pf-catalog' ? catEl : null; },
    head: { appendChild: function () {} },
    body: mkEl('body'),
    addEventListener: function () {},
    getElementsByTagName: function () { return []; }
  };
  sb.localStorage = { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = String(v); } };
  sb.setTimeout = function () { return 0; };
  sb.clearTimeout = function () {};
  sb.PF = { skip: function () { return false; }, log: function () {}, error: function () {} };
  sb.window.PF_SLR_DB_SNAPSHOT = DB;
  vm.createContext(sb);
  vm.runInContext(read(DB_MOD), sb, { filename: '07-slr-db.js' });
  vm.runInContext(read(CAT_MOD), sb, { filename: 'slr-catalog.js' });
  return new Promise(function (resolve) {
    setImmediate(function () { setImmediate(function () { resolve(catEl.innerHTML); }); });
  });
}

/* ---- roster page render harness ---- */
function renderRoster() {
  var sb = { window: null };
  sb.window = sb;
  sb.location = { pathname: '/sick-left-radicals', href: 'https://www.mtcstw.com/sick-left-radicals', search: '' };
  function mkEl(tag) {
    var el = { tagName: String(tag).toUpperCase(), children: [], _attrs: {}, _html: '',
      style: {}, parentNode: null, className: '', textContent: '' };
    el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
    el.getAttribute = function (k) {
      return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
    };
    el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.insertBefore = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.querySelector = function (sel) {
      /* slr-roster wires the search input + empty state post-render */
      var s = mkEl('input');
      s.style = {};
      return s;
    };
    el.querySelectorAll = function () { return []; };
    el.addEventListener = function () {};
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return el._html; },
      set: function (v) { el._html = String(v); }
    });
    return el;
  }
  var rosEl = mkEl('div');
  sb.document = {
    readyState: 'complete',
    createElement: function (t) { return mkEl(t); },
    getElementById: function (id) { return id === 'pf-slr-roster' ? rosEl : null; },
    head: { appendChild: function () {} },
    body: mkEl('body'),
    addEventListener: function () {},
    getElementsByTagName: function () { return []; }
  };
  sb.localStorage = { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = String(v); } };
  sb.setTimeout = function () { return 0; };
  sb.clearTimeout = function () {};
  sb.setInterval = function () { return 0; };
  sb.PF = { skip: function () { return false; }, log: function () {}, error: function () {}, hidden: function () { return false; } };
  sb.window.PF_SLR_DB_SNAPSHOT = DB;
  vm.createContext(sb);
  vm.runInContext(read(DB_MOD), sb, { filename: '07-slr-db.js' });
  vm.runInContext(read(ROS_MOD), sb, { filename: 'slr-roster.js' });
  return new Promise(function (resolve) {
    setImmediate(function () { setImmediate(function () { resolve(rosEl.innerHTML); }); });
  });
}

/* ---- money-page M4 harness: the rail tab becomes a link ---- */
function renderMoneyRedirect() {
  var sb = { window: null };
  sb.window = sb;
  sb.location = { pathname: '/political-hq', href: 'https://www.mtcstw.com/political-hq', search: '' };
  function mkEl(tag) {
    var el = { tagName: String(tag).toUpperCase(), children: [], _attrs: {}, _html: '',
      style: {}, parentNode: null, className: '', textContent: '' };
    el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
    el.getAttribute = function (k) {
      return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
    };
    el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.insertBefore = function (c, ref) {
      c.parentNode = el;
      var ix = ref ? el.children.indexOf(ref) : -1;
      if (ix === -1) el.children.push(c); else el.children.splice(ix, 0, c);
      return c;
    };
    el.replaceChild = function (nn, oo) {
      var ix = el.children.indexOf(oo);
      if (ix !== -1) el.children[ix] = nn;
      nn.parentNode = el; oo.parentNode = null;
      return oo;
    };
    el.querySelector = function () { return null; };
    el.querySelectorAll = function () { return []; };
    el.addEventListener = function () {};
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return el._html; },
      set: function (v) { el._html = String(v); }
    });
    return el;
  }
  /* PHQ host with a rendered subnav (blocking bundle-hq ran first) */
  var host = mkEl('div'); host.setAttribute('id', 'pf-political-hq');
  var nav = mkEl('nav'); nav.setAttribute('id', 'pf-hq-subnav');
  ['action', 'people', 'money'].forEach(function (id) {
    var b = mkEl('button');
    b.className = 'pf-hq-tab';
    b.setAttribute('data-hub', id);
    b.textContent = id.toUpperCase();
    nav.appendChild(b);
  });
  host.appendChild(nav);
  var byId = { 'pf-political-hq': host, 'pf-hq-subnav': nav };
  function findDeep(n, id) {
    if (n.id === id) return n;
    for (var i = 0; i < n.children.length; i++) {
      var f = findDeep(n.children[i], id);
      if (f) return f;
    }
    return null;
  }
  sb.document = {
    readyState: 'complete',
    createElement: function (t) { return mkEl(t); },
    getElementById: function (id) { return byId[id] || findDeep(host, id) || null; },
    querySelector: function (sel) {
      if (sel === '#pf-hq-subnav a[data-hub="money"]') {
        for (var i = 0; i < nav.children.length; i++) {
          var c = nav.children[i];
          if (c.tagName === 'A' && c.getAttribute('data-hub') === 'money') return c;
        }
        return null;
      }
      if (sel === '#pf-hq-subnav .pf-hq-tab[data-hub="money"]') {
        for (var j = 0; j < nav.children.length; j++) {
          var d = nav.children[j];
          if (d.tagName !== 'A' && d.className.split(' ').indexOf('pf-hq-tab') !== -1 &&
              d.getAttribute('data-hub') === 'money') return d;
        }
        return null;
      }
      return null;
    },
    head: { appendChild: function () {} },
    body: mkEl('body'),
    addEventListener: function () {},
    getElementsByTagName: function () { return []; }
  };
  sb.localStorage = { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = String(v); } };
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.clearTimeout = function () {};
  sb.PF = {
    skip: function () { return false; },
    log: function () {}, error: function () {},
    siteConfig: { ready: function (cb) { cb({ money_page_url: '/follow-the-money' }); } }
  };
  vm.createContext(sb);
  vm.runInContext(read(MP_MOD), sb, { filename: 'money-page.js' });
  return { nav: nav, byId: byId };
}

(function runAsync() {
  var done = 0;
  function maybeFinish() {
    if (++done < 3) return;
    runChainChecks();
    console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
    if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
    console.log('BLOSSOM-CRAFT-OK');
  }
  /* catalog render: joman */
  renderCatalog('joman').then(function (html) {
    try {
      if (!html) { no('catalog render', 'empty HTML'); return maybeFinish(); }
      ok('catalog renders HTML for /joman');
      [['F1 two-track block', 'CHOOSE YOUR TRACK'],
       ['F1 track A', 'TRACK 01'], ['F1 track B', 'TRACK 02'],
       ['F1 /creator-onboard', 'href="/creator-onboard"'],
       ['F1 follow anchor', 'id="pf-cat-follow"'],
       ['F1 claim slot', 'pf-cat-claimslot'], ['F1 nextMove slot', 'pf-cat-nextmove'],
       ['F4 breadcrumb', 'aria-label="Breadcrumb"'], ['F4 current page', 'aria-current="page"'],
       ['F3 score 9.6', '9.6/10'],
       ['F2 related block', 'RELATED CREATORS']
      ].forEach(function (c) {
        if (html.indexOf(c[1]) !== -1) ok('catalog: ' + c[0]);
        else no('catalog: ' + c[0], 'missing "' + c[1] + '"');
      });
      if (html.indexOf('WANT IN? JOIN THE SICK LEFT RADICALS') === -1) ok('catalog: old single CTA gone from render');
      else no('catalog old CTA', 'still rendered');
      /* related creators are real members with affinity (not the old trio) */
      var relNames = (html.match(/RELATED CREATORS<\/h2>[\s\S]*$/) || [''])[0];
      if (relNames.indexOf('Vandala') !== -1 || relNames.indexOf('vandala-effect') !== -1) ok('catalog: joman related includes affinity match');
      else no('catalog affinity', 'expected affinity names missing');
      if (html.toLowerCase().indexOf('donate') === -1) ok('catalog render: no "donate" copy');
      else no('catalog banned copy', 'found');
    } catch (e) { no('catalog render', String((e && e.stack) || e).slice(0, 200)); }
    maybeFinish();
  });
  /* roster render */
  renderRoster().then(function (html) {
    try {
      if (!html) { no('roster render', 'empty HTML'); return maybeFinish(); }
      var cards = (html.match(/pf-slr-card/g) || []).length;
      if (cards === 62) ok('roster renders all 62 cards');
      else no('roster card count', 'got ' + cards);
      if (html.indexOf('data-eff-score="the-antifascist-frog"') !== -1 && html.indexOf('9.0/10') !== -1) ok('roster: antifascist frog shows 9.0 (F3 desync fixed)');
      else no('roster frog score', 'missing');
    } catch (e) { no('roster render', String((e && e.stack) || e).slice(0, 200)); }
    maybeFinish();
  });
  /* M4: rail tab becomes a link */
  try {
    var r = renderMoneyRedirect();
    var kids = r.nav.children, link = null, btnLeft = false;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName === 'A' && kids[i].getAttribute('data-hub') === 'money') link = kids[i];
      if (kids[i].tagName === 'BUTTON' && kids[i].getAttribute('data-hub') === 'money') btnLeft = true;
    }
    if (link && link.href === '/follow-the-money') ok('M4 runtime: money tab is now <a href="/follow-the-money">');
    else no('M4 rail link', 'anchor missing or wrong href');
    if (link && link.textContent === 'FOLLOW THE MONEY') ok('M4 runtime: rail link keeps the tab label');
    else no('M4 rail label', 'wrong text');
    if (!btnLeft) ok('M4 runtime: old money button replaced (no duplicate)');
    else no('M4 duplicate tab', 'button still present');
    var markerFound = null;
    (function walk(n) {
      if (markerFound) return;
      if (n.id === 'phq-money') { markerFound = n; return; }
      n.children.forEach(walk);
    })(r.byId['pf-political-hq']);
    if (markerFound) ok('M4 runtime: marker id phq-money keeps the once-guard');
    else no('M4 marker', 'missing');
    var cardLeft = false;
    (function walk(n) {
      if (cardLeft) return;
      if (n._html && n._html.indexOf('money war room moved') !== -1) cardLeft = true;
      n.children.forEach(walk);
    })(r.byId['pf-political-hq']);
    if (!cardLeft) ok('M4 runtime: no redirect card mounted');
    else no('M4 redirect card', 'still mounted');
  } catch (e) { no('M4 runtime', String((e && e.stack) || e).slice(0, 200)); }
  maybeFinish();
/* ============ 4. page mount-chain verification (BREATHE pre-check) ============
   Project Blossom: BREATHE is only applied to pages that actually render
   substantive content. For every Phase 1-3 page this verifies the full
   mount chain statically: PAGE_ORDERS entry -> staged template id ->
   template staged by a silo file -> silo file shipped in a built bundle ->
   silo has a loading state AND a fail-soft (error/empty) path. A page
   failing this check is listed as BLOCKED and must not be polished. */
function runChainChecks() {
console.log('== 4. page mount-chain (BREATHE pre-check) ==');
try {
  var pmSrc = read(PM_MOD);
  var bundleBuildSrc = read(path.join(ROOT, 'build', 'bundle.js'));
  var bundleCoreBuildSrc = read(path.join(ROOT, 'build', 'bundle-core.js'));
  function fileToBundleRel(f) {
    /* 'v1.4.3/games/x.js' -> 'games/x.js' as listed in build manifests
       (handles absolute paths too). */
    return String(f).replace(/^.*v1\.4\.3\//, '');
  }
  function isBundled(f) {
    /* build/bundle.js lists games files bare ('caption-combat.js') and
       core/pages files as '../core/x.js'; build/bundle-core.js lists
       'core/x.js' / 'pages/x.js'. */
    var base = f.split('/').pop();
    var rel = fileToBundleRel(f);
    return bundleBuildSrc.indexOf("'" + base + "'") !== -1 ||
           bundleBuildSrc.indexOf("'../" + rel + "'") !== -1 ||
           bundleCoreBuildSrc.indexOf("'" + rel + "'") !== -1;
  }
  function templateFile(tpl) {
    var files = [];
    ['v1.4.3/games', 'v1.4.3/core'].forEach(function (dir) {
      fs.readdirSync(path.join(ROOT, dir)).forEach(function (f) {
        if (!/\.js$/.test(f) || f.indexOf('bundle-') === 0) return;
        var p = path.join(ROOT, dir, f);
        try {
          var s = read(p);
          if (s.indexOf('template id=\\"' + tpl + '\\"') !== -1 ||
              s.indexOf('template id="' + tpl + '"') !== -1) files.push(p);
        } catch (e) {}
      });
    });
    return files;
  }
  var PAGES = {
    'pf-economy': ['pf-ov-economy'],
    'pf-warreport': ['pf-ov-warreport'],
    'pf-cells-page': ['pf-ov-cells', 'pf-ov-cellwar', 'pf-ov-diplo', 'pf-ov-contracts',
      'pf-ov-warmap', 'pf-ov-territory-map', 'pf-ov-cellcomp-seasons', 'pf-ov-raid'],
    'pf-events': ['pf-ov-mastercal', 'pf-ov-events', 'pf-ov-townhall', 'pf-ov-civicevents'],
    'pf-arcade': ['pf-ov-markets', 'pf-ov-gambits', 'pf-ov-caption', 'pf-ov-guess',
      'pf-ov-interrogation', 'pf-ov-billionaire', 'pf-ov-bracket', 'pf-ov-battles',
      'pf-ov-infight', 'pf-ov-matchquiz', 'pf-ov-predgame'],
    'pf-bank': ['pf-ov-peoplesbank', 'pf-ov-reserve'],
    'pf-warchest': ['pf-ov-movement']
  };
  var blocked = [];
  Object.keys(PAGES).forEach(function (pageId) {
    var tpls = PAGES[pageId];
    if (pmSrc.indexOf("'" + pageId + "'") === -1) {
      blocked.push(pageId + ': no PAGE_ORDERS entry');
      no('chain ' + pageId, 'no PAGE_ORDERS entry');
      return;
    }
    var pageOk = true;
    tpls.forEach(function (tpl) {
      var files = templateFile(tpl);
      if (!files.length) { pageOk = false; no('chain ' + pageId + ' ' + tpl, 'template not staged by any silo file'); return; }
      var f = files[0];
      if (!isBundled(f)) { pageOk = false; no('chain ' + pageId + ' ' + tpl, fileToBundleRel(f) + ' not in any built bundle'); return; }
      var src = stripComments(read(f));
      /* Substantive content = a real heading in the template. Silos that
         call the backend additionally need a fail-soft (error/empty)
         path; static shells (teasers, game boards) render their content
         immediately. */
      var hasContent = /<h[123][\s>]/.test(src) || />[^<>{}]{24,400}</.test(src);
      var callsBackend = src.indexOf('PF_BACKEND_URL') !== -1;
      var hasFailSoft = /failed|empty|try again|Reload|error|offline|AWAITING/i.test(src);
      if (!hasContent) { pageOk = false; no('chain ' + pageId + ' ' + tpl, 'no substantive content in template'); }
      else if (callsBackend && !hasFailSoft) { pageOk = false; no('chain ' + pageId + ' ' + tpl, 'backend calls without fail-soft path'); }
    });
    if (pageOk) ok('chain ' + pageId + ': ' + tpls.length + ' silos staged, bundled, fail-soft');
    else blocked.push(pageId);
  });
  /* pf-create: workshop shell owns the page */
  (function () {
    var wf = path.join(V, 'core', 'workshop.js');
    var okW = false;
    try {
      okW = fs.existsSync(wf) && isBundled(wf) &&
        stripComments(read(wf)).indexOf('pfWorkshopClaimed') !== -1;
    } catch (e) {}
    if (okW) ok('chain pf-create: workshop shell staged, bundled, claims the page');
    else { blocked.push('pf-create'); no('chain pf-create', 'workshop shell missing/unbundled'); }
  })();
  /* /money: the BREATHE pilot (self-mounting money-page.js) */
  (function () {
    var okM = stripComments(read(MP_MOD)).indexOf('mountBreathe(root)') !== -1 &&
      isBundled(path.join(V, 'core', 'money-page.js'));
    if (okM) ok('chain pf-money: pilot wiring intact (mountBreathe in render paths)');
    else { blocked.push('pf-money'); no('chain pf-money', 'pilot wiring missing'); }
  })();
  if (blocked.length) {
    console.log('BLOCKED PAGES (do not polish): ' + blocked.join(', '));
  } else {
    ok('no blocked pages: all Phase 1-3 pages render substantive content');
  }
} catch (e) {
  no('page mount-chain', String((e && e.stack) || e).slice(0, 300));
}
}

})();
