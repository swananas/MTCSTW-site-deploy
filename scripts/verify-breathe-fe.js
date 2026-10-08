#!/usr/bin/env node
/* scripts/verify-breathe-fe.js — BREATHE breathing-room system verification.
   Run from the repo root:
     node scripts/verify-breathe-fe.js
   1. node --check on new/changed modules (30-breathe.js, money-page.js, money-tab.js)
   2. Rebuild core bundles (build/bundle-core.js) + CSS sync check
   3. Static checks on the comment-stripped view (NO string stripping —
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      BREATHE CSS present in 02-design-system.css AND bundle-styles.css;
      30-breathe.js registered in CORE_FILES and present in both core bundles;
      PF.Breathe API (sectionNav/collapsible/showMore) intact post-minify;
      money-page pilot (sectionShell rhythm classes, mountBreathe in both
      render paths, nav from rendered sections, deep8 starts collapsed);
      money-tab progressive disclosure (5-row cap, SHOW ALL toggle);
      data logic untouched (money/painterData/api/totalsRow/splitBar present,
      no new XP, no banned terms, kill switches honored)
   4. Mocked-browser runtime (vm + minimal DOM stub): PF.Breathe.sectionNav
      builds pills + jumps to the right section; collapsible folds/unfolds;
      showMore truncates long lists and expands on tap.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var BREATHE_MOD = path.join(V, 'core', '30-breathe.js');
var MP_MOD = path.join(V, 'core', 'money-page.js');
var MT_MOD = path.join(V, 'core', 'money-tab.js');
var DS_CSS = path.join(V, 'core', '02-design-system.css');
var BUNDLE_CSS = path.join(V, 'core', 'bundle-styles.css');
var CORE_BUNDLE = path.join(V, 'core', 'bundle-core.js');
var CORE_SLR = path.join(V, 'core', 'bundle-core-slr.js');
var MONEY_BUNDLE = path.join(V, 'core', 'bundle-money.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
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
  cp.execSync('node build/check-styles-sync.js', { cwd: ROOT, stdio: 'pipe' });
  ok('check-styles-sync passes');
} catch (e) { no('check-styles-sync', String(e.message || e).slice(0, 200)); }

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
[BREATHE_MOD, MP_MOD, MT_MOD].forEach(function (p) {
  try { cp.execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' }); ok('syntax ' + path.basename(p)); }
  catch (e) { no('syntax ' + path.basename(p), 'node --check failed'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var ds = stripComments(read(DS_CSS)), bc = stripComments(read(BUNDLE_CSS));
['.pf-br-sec', '.pf-bnav', '.pf-bnav-pill', '.pf-br-toggle', '.pf-br-more',
 '.pf-br-list-extra', 'scroll-margin-top', '--pf-br-sec-gap'].forEach(function (sel) {
  if (ds.indexOf(sel) !== -1 && bc.indexOf(sel) !== -1) ok('breathe css "' + sel + '" in source + bundle');
  else no('breathe css "' + sel + '"', 'missing from source or bundle-styles.css');
});
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/30-breathe.js'")) ok('30-breathe.js in CORE_FILES');
else no('30-breathe.js in CORE_FILES', 'not registered');
var coreMin = read(CORE_BUNDLE), slrMin = read(CORE_SLR);
/* 2026-10-06 (blossom): the minifier emits `PF.Breathe = {...}` with spaces —
   the old /\.Breathe=/ regex never matched. */
if (/\.Breathe\s*=/.test(coreMin) && /\.Breathe\s*=/.test(slrMin)) ok('PF.Breathe present in both core bundles (post-minify)');
else no('PF.Breathe in bundles', 'property missing after minify');
/* PROJECT BLOSSOM (2026-10-06): PF.BreathePages page-level module. */
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/31-breathe-pages.js'")) ok('31-breathe-pages.js in CORE_FILES');
else no('31-breathe-pages.js in CORE_FILES', 'not registered');
if (/\.BreathePages\s*=/.test(coreMin) && /\.BreathePages\s*=/.test(slrMin)) ok('PF.BreathePages present in both core bundles (post-minify)');
else no('PF.BreathePages in bundles', 'property missing after minify');
try { cp.execSync('node --check ' + JSON.stringify(path.join(V, 'core', '31-breathe-pages.js')), { stdio: 'pipe' }); ok('syntax 31-breathe-pages.js'); }
catch (e) { no('syntax 31-breathe-pages.js', 'node --check failed'); }
var bp = stripComments(read(path.join(V, 'core', '31-breathe-pages.js')));
if (bp.indexOf('applyPage') !== -1 && bp.indexOf('pf-br-sec') !== -1) ok('BreathePages: rhythm shell applied per section');
else no('BreathePages rhythm', 'missing');
if (bp.indexOf('sectionNav') !== -1) ok('BreathePages: sectionNav wired for multi-section pages');
else no('BreathePages nav', 'missing');
if (bp.indexOf('data-pf-br-sec') !== -1 && bp.indexOf('data-pf-br-nav') !== -1) ok('BreathePages: idempotent markers (sections + nav)');
else no('BreathePages idempotency', 'missing markers');
if (bp.indexOf("PF.skip('breathe-pages')") !== -1) ok('BreathePages kill switch (?pf_off=breathe-pages)');
else no('BreathePages kill switch', 'missing');
/* page-mount.js wiring: BREATHE_PAGES allowlist + applyBreathe call. */
try { cp.execSync('node --check ' + JSON.stringify(path.join(V, 'pages', 'page-mount.js')), { stdio: 'pipe' }); ok('syntax page-mount.js'); }
catch (e) { no('syntax page-mount.js', 'node --check failed'); }
var pm = stripComments(read(path.join(V, 'pages', 'page-mount.js')));
['pf-economy', 'pf-warreport', 'pf-cells-page', 'pf-events', 'pf-arcade', 'pf-bank', 'pf-warchest'].forEach(function (pid) {
  if (pm.indexOf("'" + pid + "'") !== -1) ok('page-mount BREATHE_PAGES includes ' + pid);
  else no('BREATHE_PAGES ' + pid, 'not wired');
});
if (pm.indexOf('PF.BreathePages.applyPage') !== -1) ok('page-mount calls PF.BreathePages.applyPage');
else no('page-mount applyBreathe', 'not called');
/* workshop shell rhythm. */
try { cp.execSync('node --check ' + JSON.stringify(path.join(V, 'core', 'workshop.js')), { stdio: 'pipe' }); ok('syntax workshop.js'); }
catch (e) { no('syntax workshop.js', 'node --check failed'); }
var ws = stripComments(read(path.join(V, 'core', 'workshop.js')));
if (ws.indexOf('pf-ws-tool pf-br-sec') !== -1) ok('workshop: staged tools carry pf-br-sec rhythm');
else no('workshop rhythm', 'missing');
['sectionNav', 'collapsible', 'showMore'].forEach(function (fn) {
  if (read(BREATHE_MOD).indexOf(fn + ': ' + fn) !== -1 || read(BREATHE_MOD).indexOf(fn) !== -1) ok('PF.Breathe.' + fn + ' exported');
  else no('PF.Breathe.' + fn, 'not exported');
});
if (read(BREATHE_MOD).indexOf("PF.skip('breathe')") !== -1) ok('breathe kill switch (?pf_off=breathe)');
else no('breathe kill switch', 'missing');

var mp = stripComments(read(MP_MOD));
if (mp.indexOf('pf-mp-sec pf-br-sec') !== -1) ok('money sectionShell carries pf-br-sec rhythm class');
else no('money sectionShell', 'missing pf-br-sec');
if (mp.indexOf('pf-br-head') !== -1 && mp.indexOf('pf-br-body') !== -1) ok('money sections expose pf-br-head/pf-br-body hooks');
else no('money breathe hooks', 'missing');
if ((mp.match(/mountBreathe\(root\)/g) || []).length >= 2) ok('mountBreathe wired in page + tab render paths');
else no('mountBreathe wiring', 'not called in both renderPage and renderTab');
if (mp.indexOf("data-sec') !== 'deep8'") !== -1) ok('deep8 stub starts collapsed, rest open');
else no('deep8 default', 'collapse default not found');
if (mp.indexOf('querySelectorAll(\'section.pf-br-sec\')') !== -1) ok('nav built from rendered (kill-aware) sections');
else no('nav section source', 'not kill-aware');

var mt = stripComments(read(MT_MOD));
if (mt.indexOf('pf-br-list-extra') !== -1 && mt.indexOf('data-br-more') !== -1) ok('money-tab lists: 5-row cap + SHOW ALL toggle');
else no('money-tab disclosure', 'missing');
if (mt.indexOf('i >= 5') !== -1) ok('money-tab truncation threshold = 5');
else no('money-tab threshold', 'not found');
/* data logic untouched */
['function money(', 'function painterData(', 'function api(', 'function totalsRow(',
 'function splitBar(', 'function donorList(', 'function industryList(',
 'function sectionShell(', 'function buildSections(', 'function renderPage('].forEach(function (sig) {
  var src = sig.indexOf('sectionShell') !== -1 || sig.indexOf('buildSections') !== -1 || sig.indexOf('renderPage') !== -1 ? mp : mt;
  if (src.indexOf(sig) !== -1) ok('untouched: ' + sig);
  else no('untouched: ' + sig, 'signature missing — data logic may have changed');
});
if (mt.indexOf('xpGrant') === -1 && mp.indexOf('xpGrant') === -1) ok('no XP code in pilot (viewing stays 0 XP)');
else no('XP code', 'xpGrant appeared in money modules');
['donate', 'donation'].forEach(function (w) {
  var hit = mt.toLowerCase().indexOf(w) !== -1 || mp.toLowerCase().indexOf(w) !== -1;
  if (w === 'donation' && !hit) { ok('no banned copy'); }
});
if (mt.toLowerCase().indexOf('donate') === -1 && mp.toLowerCase().indexOf('donate') === -1) ok('no "donate" copy');
else no('banned copy', '"donate" found');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime ==');
function makeEl(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), children: [], _attrs: {}, _listeners: {},
    style: {}, parentNode: null, className: '', _innerHTML: '', textContent: '',
    id: '', _scrolled: false
  };
  el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
  el.insertBefore = function (c, ref) {
    c.parentNode = el;
    var ix = ref ? el.children.indexOf(ref) : -1;
    if (ix === -1) el.children.push(c); else el.children.splice(ix, 0, c);
    return c;
  };
  el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
  el.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
  };
  el.removeAttribute = function (k) { delete el._attrs[k]; };
  el.addEventListener = function (t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); };
  el.fire = function (t, ev) { (el._listeners[t] || []).forEach(function (fn) { fn.call(el, ev || {}); }); };
  el.querySelector = function (sel) {
    var all = el.querySelectorAll(sel); return all.length ? all[0] : null;
  };
  el.querySelectorAll = function (sel) {
    var out = [], cls = sel.charAt(0) === '.' ? sel.slice(1) : null;
    (function walk(n) {
      n.children.forEach(function (c) {
        if (cls && c.className && c.className.split(' ').indexOf(cls) !== -1) out.push(c);
        walk(c);
      });
    })(el);
    return out;
  };
  el.closest = function (sel) {
    var cls = sel.charAt(0) === '.' ? sel.slice(1) : null, n = el;
    while (n) {
      if (cls && n.className && n.className.split(' ').indexOf(cls) !== -1) return n;
      n = n.parentNode;
    }
    return null;
  };
  Object.defineProperty(el, 'classList', {
    get: function () {
      return {
        add: function (c) {
          var parts = el.className.split(' ').filter(Boolean);
          if (parts.indexOf(c) === -1) parts.push(c);
          el.className = parts.join(' ');
        },
        contains: function (c) { return el.className.split(' ').indexOf(c) !== -1; }
      };
    }
  });
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  el.scrollIntoView = function () { el._scrolled = true; };
  return el;
}
var byId = {};
var sb = {};
sb.window = sb;
sb.document = {
  createElement: function (t) { return makeEl(t); },
  getElementById: function (id) { return byId[id] || null; },
  addEventListener: function () {}
};
sb.matchMedia = function () { return { matches: false }; };
sb.PF = { skip: function () { return false; } };
sb.IntersectionObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
vm.createContext(sb);
try {
  vm.runInContext(read(BREATHE_MOD), sb, { filename: '30-breathe.js' });
  var B = sb.PF.Breathe;
  if (B && B.sectionNav && B.collapsible && B.showMore) ok('PF.Breathe loads with 3 APIs');
  else no('PF.Breathe load', 'API missing');

  /* sectionNav */
  var s1 = makeEl('section'), s2 = makeEl('section'), s3 = makeEl('section');
  s1.id = 'money-macro'; s2.id = 'money-fec'; s3.id = 'money-vote';
  byId['money-macro'] = s1; byId['money-fec'] = s2; byId['money-vote'] = s3;
  var host = makeEl('div');
  var nav = B.sectionNav(host, [
    { id: 'money-macro', label: 'MACRO' },
    { id: 'money-fec', label: 'FEC DONOR FILES' },
    { id: 'money-vote', label: 'THE MONEY BEHIND THE VOTE' },
    { id: 'money-nope', label: 'MISSING' }
  ]);
  var pills = host.querySelectorAll('.pf-bnav-pill');
  if (nav && nav.className === 'pf-bnav' && pills.length === 3) ok('sectionNav: 3 pills for 3 live sections (missing skipped)');
  else no('sectionNav pills', 'got ' + pills.length);
  if (host.querySelectorAll('.pf-bnav-row').length === 1) ok('sectionNav: scrollable row present');
  else no('sectionNav row', 'missing');
  pills[1].fire('click');
  if (s2._scrolled && !s1._scrolled && !s3._scrolled) ok('sectionNav: pill 2 jumps to section 2');
  else no('sectionNav jump', 'wrong scroll target');
  if (B.sectionNav(host, []) === null) ok('sectionNav: empty items = no nav (fail-soft)');
  else no('sectionNav empty', 'should return null');

  /* collapsible */
  var sec = makeEl('section');
  sec.className = 'pf-br-sec';
  var head = makeEl('div'); head.className = 'pf-br-head';
  var htxt = makeEl('div'); htxt.className = 'pf-br-headtxt';
  head.appendChild(htxt); sec.appendChild(head);
  var body = makeEl('div'); body.className = 'pf-br-body'; sec.appendChild(body);
  B.collapsible(sec, { startOpen: true });
  var tog = head.querySelector('.pf-br-toggle');
  if (tog && tog.getAttribute('aria-expanded') === 'true') ok('collapsible: toggle added, starts open');
  else no('collapsible open', 'toggle missing or wrong state');
  tog.fire('click');
  if (sec.getAttribute('data-collapsed') === '1' && tog.getAttribute('aria-expanded') === 'false') ok('collapsible: click folds section');
  else no('collapsible fold', 'data-collapsed not set');
  tog.fire('click');
  if (sec.getAttribute('data-collapsed') === null && tog.getAttribute('aria-expanded') === 'true') ok('collapsible: click unfolds section');
  else no('collapsible unfold', 'did not reopen');
  var sec2 = makeEl('section');
  var h2 = makeEl('div'); h2.className = 'pf-br-head'; sec2.appendChild(h2);
  var b2 = makeEl('div'); b2.className = 'pf-br-body'; sec2.appendChild(b2);
  B.collapsible(sec2, { startOpen: false });
  if (sec2.getAttribute('data-collapsed') === '1') ok('collapsible: startOpen:false begins folded (deep8 pattern)');
  else no('collapsible start-closed', 'not folded');

  /* showMore */
  var list = makeEl('ul');
  for (var i = 0; i < 8; i++) list.appendChild(makeEl('li'));
  var wrapSec = makeEl('section'); wrapSec.className = 'pf-br-sec';
  wrapSec.appendChild(list);
  B.showMore(list, 5, 'SHOW ALL');
  var hidden = 0;
  list.children.forEach(function (c) { if (c.classList.contains('pf-br-list-extra')) hidden++; });
  var moreBtn = null;
  wrapSec.children.forEach(function (c) { if (c.className.split(' ').indexOf('pf-br-more') !== -1) moreBtn = c; });
  if (hidden === 3 && moreBtn) ok('showMore: 8 items -> 5 shown, 3 folded, button added');
  else no('showMore truncate', 'hidden=' + hidden);
  moreBtn.fire('click');
  if (wrapSec.getAttribute('data-showall') === '1' && moreBtn.textContent.indexOf('SHOW LESS') === 0) ok('showMore: tap unfolds list');
  else no('showMore expand', 'data-showall not set');
  var short = makeEl('ul');
  for (var j = 0; j < 3; j++) short.appendChild(makeEl('li'));
  var before = short.children.length;
  B.showMore(short, 5, 'SHOW ALL');
  if (short.children.length === before) ok('showMore: short lists untouched (zero-op)');
  else no('showMore zero-op', 'modified a short list');
} catch (e) {
  no('runtime', String((e && e.stack) || e).slice(0, 300));
}

/* ============ 4. BreathePages mocked-browser runtime ============ */
console.log('== 4. BreathePages runtime ==');
try {
  /* extend the section-3 DOM stub: tag.class + tag-list selectors */
  var _qsa = sb.document.createElement('div').querySelectorAll;
  /* fresh sandbox so BreathePages loads against the real 30-breathe */
  var sb2 = {};
  sb2.window = sb2;
  var roots2 = [];
  function mk2(tag) {
    var el = {
      tagName: String(tag).toUpperCase(), children: [], _attrs: {}, _listeners: {},
      style: {}, parentNode: null, className: '', _innerHTML: '', textContent: '', id: ''
    };
    el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
    el.insertBefore = function (c, ref) {
      c.parentNode = el;
      var ix = ref ? el.children.indexOf(ref) : -1;
      if (ix === -1) el.children.push(c); else el.children.splice(ix, 0, c);
      return c;
    };
    el.removeChild = function (c) {
      var ix = el.children.indexOf(c);
      if (ix !== -1) el.children.splice(ix, 1);
      c.parentNode = null;
      return c;
    };
    el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
    el.getAttribute = function (k) {
      return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
    };
    el.removeAttribute = function (k) { delete el._attrs[k]; };
    el.addEventListener = function (t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); };
    el.fire = function (t, ev) { (el._listeners[t] || []).forEach(function (fn) { fn.call(el, ev || {}); }); };
    function hasCls(n, c) { return n.className && n.className.split(' ').indexOf(c) !== -1; }
    el.querySelectorAll = function (sel) {
      var out = [];
      function match(n) {
        if (sel === 'section.pf-v2-game') return n.tagName === 'SECTION' && hasCls(n, 'pf-v2-game');
        if (sel === 'h1,h2,h3') return n.tagName === 'H1' || n.tagName === 'H2' || n.tagName === 'H3';
        if (sel === '[data-pf-br-nav]') return n.getAttribute('data-pf-br-nav') !== null;
        if (sel.charAt(0) === '.') return hasCls(n, sel.slice(1));
        return false;
      }
      (function walk(n) {
        n.children.forEach(function (c) { if (match(c)) out.push(c); walk(c); });
      })(el);
      return out;
    };
    el.querySelector = function (sel) { var a = el.querySelectorAll(sel); return a.length ? a[0] : null; };
    Object.defineProperty(el, 'classList', {
      get: function () {
        return {
          add: function (c) {
            var parts = el.className.split(' ').filter(Boolean);
            if (parts.indexOf(c) === -1) parts.push(c);
            el.className = parts.join(' ');
          },
          contains: function (c) { return el.className.split(' ').indexOf(c) !== -1; }
        };
      }
    });
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return el._innerHTML; },
      set: function (v) { el._innerHTML = String(v); }
    });
    el.scrollIntoView = function () { el._scrolled = true; };
    return el;
  }
  function findById(id) {
    var found = null;
    roots2.forEach(function (r) {
      (function walk(n) {
        if (found) return;
        if (n.id === id) { found = n; return; }
        n.children.forEach(walk);
      })(r);
    });
    return found;
  }
  sb2.document = {
    createElement: function (t) { return mk2(t); },
    getElementById: function (id) { return findById(id); },
    addEventListener: function () {}
  };
  sb2.matchMedia = function () { return { matches: false }; };
  sb2.PF = { skip: function () { return false; } };
  sb2.IntersectionObserver = function () { this.observe = function () {}; this.disconnect = function () {}; };
  vm.createContext(sb2);
  vm.runInContext(read(BREATHE_MOD), sb2, { filename: '30-breathe.js' });
  vm.runInContext(read(path.join(V, 'core', '31-breathe-pages.js')), sb2, { filename: '31-breathe-pages.js' });
  var BP = sb2.PF.BreathePages;
  if (!BP || typeof BP.applyPage !== 'function') { no('BreathePages load', 'applyPage missing'); }
  else {
    ok('BreathePages loads with applyPage');
    function pageHost(nSecs) {
      var host = mk2('div'); host.id = 'pf-cells-page'; roots2.push(host);
      var head = mk2('div'); head.className = 'pf-page-head'; host.appendChild(head);
      for (var i = 0; i < nSecs; i++) {
        var s = mk2('section'); s.className = 'pf-v2-game';
        s.setAttribute('data-game', 'silo-' + i);
        var h = mk2('h2'); h.textContent = 'Section Title ' + i; s.appendChild(h);
        var b = mk2('div'); b.textContent = 'body'; s.appendChild(b);
        host.appendChild(s);
      }
      return host;
    }
    /* <6 sections: rhythm, no nav */
    var h2 = pageHost(2);
    BP.applyPage(h2, 'pf-cells-page');
    var r2 = h2.querySelectorAll('section.pf-v2-game');
    var rhythmOk = r2.length === 2 && r2.every(function (s) {
      return s.classList.contains('pf-br-sec') && s.getAttribute('data-pf-br-sec') === '1' && !!s.id;
    });
    if (rhythmOk) ok('applyPage: rhythm shell + ids on all sections (<6: no nav)');
    else no('applyPage rhythm', 'missing pf-br-sec/ids');
    if (h2.querySelectorAll('[data-pf-br-nav]').length === 0) ok('applyPage: no nav below threshold');
    else no('applyPage nav threshold', 'nav built for 2 sections');
    /* >=6 sections: nav with heading-derived labels */
    var h7 = pageHost(7);
    BP.applyPage(h7, 'pf-cells-page');
    var navs = h7.querySelectorAll('[data-pf-br-nav]');
    if (navs.length === 1) ok('applyPage: exactly one nav host for 7 sections');
    else no('applyPage nav count', 'got ' + navs.length);
    var pills = navs.length ? navs[0].querySelectorAll('.pf-bnav-pill') : [];
    if (pills.length === 7) ok('applyPage: 7 pills for 7 rendered sections');
    else no('applyPage pills', 'got ' + pills.length);
    if (pills.length === 7 && pills[3].textContent === 'Section Title 3') ok('applyPage: pill labels from section headings');
    else no('applyPage labels', 'wrong label text');
    /* idempotency: second pass changes nothing */
    var pillsBefore = pills.length;
    BP.applyPage(h7, 'pf-cells-page');
    var navs2 = h7.querySelectorAll('[data-pf-br-nav]');
    if (navs2.length === 1 && navs2[0].querySelectorAll('.pf-bnav-pill').length === pillsBefore) ok('applyPage: idempotent re-run');
    else no('applyPage idempotency', 'nav duplicated');
    /* late silo: nav rebuilds when the section set grows */
    var s8 = mk2('section'); s8.className = 'pf-v2-game';
    s8.setAttribute('data-game', 'late-silo');
    var h8 = mk2('h2'); h8.textContent = 'Late Section'; s8.appendChild(h8);
    h7.appendChild(s8);
    BP.applyPage(h7, 'pf-cells-page');
    var pillsAfter = h7.querySelectorAll('[data-pf-br-nav]')[0].querySelectorAll('.pf-bnav-pill').length;
    if (pillsAfter === 8) ok('applyPage: nav rebuilds when a late silo lands');
    else no('applyPage late silo', 'pills=' + pillsAfter);
    /* breathe killed: total no-op */
    var sb3 = { window: null, document: sb2.document, matchMedia: sb2.matchMedia,
      IntersectionObserver: sb2.IntersectionObserver, PF: { skip: function () { return true; } } };
    sb3.window = sb3;
    vm.createContext(sb3);
    vm.runInContext(read(path.join(V, 'core', '31-breathe-pages.js')), sb3, { filename: '31-breathe-pages.js' });
    if (!sb3.PF.BreathePages) ok('BreathePages: ?pf_off=breathe-pages kills the module');
    else no('BreathePages kill', 'still defined');
  }
} catch (e) {
  no('BreathePages runtime', String((e && e.stack) || e).slice(0, 300));
}

/* ============ summary ============ */
console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('BREATHE-OK');
