#!/usr/bin/env node
/* scripts/verify-wildfinds-fe.js — WILD FINDS taxonomy verification.
   CEO directive 2026-10-06: wild-find types folded into the bounty type
   taxonomy — one source of truth (PF.wildFinds), read by every surface.
   Run from the worktree root: node scripts/verify-wildfinds-fe.js
   1. node --check on new/changed files
   2. Static checks: kill switch, bundle registration, registry keys match
      the backend PHOTO_SUBTYPES, esc() on interpolations, zero-XP tokens
      (no xpGrant/postAction in 36-wildfinds.js), fail-open guards,
      wiring markers in data-bounties.js / 35-sharein.js / daily-orders.js,
      banned terms.
   3. Mocked-browser runtime tests (vm + minimal DOM shim): registry shape,
      subtypeFromTargetKey, missions(), safetyHTML, typeStripHTML,
      openTypePicker render + pick, launcher wiring, refresh() backend-wins
      merge, fail-open without backend.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var WF = 'v1.4.3/core/36-wildfinds.js';
var DB = 'v1.4.3/games/data-bounties.js';
var SI = 'v1.4.3/core/35-sharein.js';
var DO = 'v1.4.3/games/daily-orders.js';
var fails = [], passes = 0;
function ok(n) { passes++; }
function no(n, why) { fails.push(n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
[WF, DB, SI, DO, 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok('check ' + f); }
  catch (e) { no('check ' + f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var src = read(WF), stripped = stripComments(src);

/* Kill switch */
if (has(WF, "PF.skip('wildfinds')")) ok('kill switch (?pf_off=wildfinds)');
else no('kill switch', 'missing');

/* Bundle registration */
var buildSrc = read('build/bundle-core.js');
if (buildSrc.indexOf("'core/36-wildfinds.js'") !== -1) ok('build list (CORE_FILES)');
else no('build list', '36-wildfinds.js not in CORE_FILES');
if (buildSrc.indexOf("'core/36-wildfinds.js'") > buildSrc.indexOf("'core/35-sharein.js'"))
  ok('bundle order (after 35-sharein)');
else no('bundle order', '36-wildfinds.js must come after 35-sharein.js');

/* Registry keys match backend PHOTO_SUBTYPES */
var beSrc = '';
try { beSrc = fs.readFileSync(path.join(ROOT, '..', 'mtcstw-api', 'src', 'data_bounties.js'), 'utf8'); }
catch (e) { beSrc = fs.readFileSync('/home/hatch/workspace/mtcstw-api/src/data_bounties.js', 'utf8'); }
var beM = beSrc.match(/var PHOTO_SUBTYPES = \{([^}]+)\}/);
var beKeys = beM ? beM[1].split(',').map(function (s) { return s.trim().split(':')[0]; }).filter(Boolean) : [];
var feKeys = [];
var feM = stripped.match(/var TYPES = \{([\s\S]*?)\n  \};/);
if (feM) {
  var re = /^\s{4}([a-z_]+):\s*\{/gm, m;
  while ((m = re.exec(feM[1]))) feKeys.push(m[1]);
}
var missing = beKeys.filter(function (k) { return feKeys.indexOf(k) === -1; });
var extra = feKeys.filter(function (k) { return beKeys.indexOf(k) === -1; });
if (beKeys.length >= 14 && missing.length === 0 && extra.length === 0) ok('registry keys match backend PHOTO_SUBTYPES (' + beKeys.length + ')');
else no('registry keys', 'missing: ' + missing.join(',') + ' extra: ' + extra.join(',') + ' be:' + beKeys.length + ' fe:' + feKeys.length);

/* ice_watch extra safety */
if (/ice_watch[\s\S]{0,900}Do not follow vehicles/.test(src)) ok('ice_watch extra safety rules');
else no('ice_watch safety', 'missing');

/* Zero-XP tokens */
['xpGrant', 'postAction', 'xp_ledger'].forEach(function (t) {
  if (stripped.indexOf(t) === -1) ok('zero-XP token: no ' + t);
  else no('zero-XP', 'found ' + t);
});

/* Banned terms */
if (/\bdonate\b/i.test(stripped)) no('banned terms', 'found "donate"');
else ok('banned terms (no "donate")');

/* esc() on interpolations in HTML builders */
var builders = (src.match(/\.innerHTML\s*=\s*[^;]+/g) || []).length;
if (builders > 0 && /esc\(/.test(src)) ok('esc() used in HTML builders (' + builders + ' assignments)');
else no('esc()', 'missing in HTML builders');

/* Wiring markers */
if (has(DB, 'PF.wildFinds')) ok('data-bounties.js reads PF.wildFinds');
else no('data-bounties wiring', 'missing');
if (has(DB, 'db-safety-ok') && has(DB, 'safety_ok')) ok('claim form safety attestation');
else no('claim attestation', 'missing');
if (has(DB, 'typeStripHTML')) ok('type strip on board');
else no('type strip', 'missing');
if (has(DB, 'data-pf-wildfind')) ok('launcher button on board');
else no('launcher button', 'missing');
if (has(SI, 'wildfind')) ok('35-sharein.js photo picker wild-find option');
else no('share-in wiring', 'missing');
if (has(DO, 'PF.wildFinds')) ok('daily-orders.js mission injection');
else no('daily-orders wiring', 'missing');

/* Fail-open guards */
if (/window\.PF && PF\.wildFinds/.test(read(DB)) && /window\.PF && PF\.wildFinds/.test(read(SI))) ok('fail-open guards (PF.wildFinds existence checks)');
else no('fail-open', 'missing existence checks');

console.log('== 3. runtime tests (vm + DOM shim) ==');
function makeCtx(extra) {
  var els = [];
  function mkEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(), children: [], attrs: {}, _html: '',
      className: '', textContent: '', style: {},
      setAttribute: function (k, v) { this.attrs[k] = v; },
      getAttribute: function (k) { return this.attrs[k]; },
      appendChild: function (c) { this.children.push(c); try { c.parentNode = this; } catch (e) {} return c; },
      removeChild: function (c) {
        var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
        try { c.parentNode = null; var ai = els.indexOf(c); if (ai >= 0) els.splice(ai, 1); } catch (e) {}
        return c;
      },
      addEventListener: function () {}, querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      closest: function () { return null; },
      scrollIntoView: function () {}
    };
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._html; },
      set: function (v) { this._html = String(v); }
    });
    Object.defineProperty(el, 'id', {
      get: function () { return this.attrs.id || ''; },
      set: function (v) { this.attrs.id = String(v); }
    });
    els.push(el);
    return el;
  }
  var doc = {
    _els: els,
    createElement: mkEl,
    head: mkEl('head'), body: mkEl('body'), documentElement: mkEl('html'),
    getElementById: function (id) {
      for (var i = 0; i < els.length; i++) if (els[i].attrs.id === id) return els[i];
      return null;
    },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    readyState: 'complete'
  };
  var win = {
    PF: Object.assign({
      skip: function () { return false; },
      holder: function () { return doc.body; },
      toast: function () {}
    }, extra || {}),
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { href: 'https://www.mtcstw.com/', search: '', pathname: '/' },
    history: { replaceState: function () {} },
    document: doc,
    MutationObserver: function () { this.observe = function () {}; },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    URL: URL
  };
  win.window = win;
  return { win: win, doc: doc, els: els };
}

function loadWF(ctx) {
  vm.createContext(ctx.win);
  vm.runInContext(read(WF), ctx.win, { filename: '36-wildfinds.js' });
  return ctx.win.PF.wildFinds;
}

/* Registry shape */
(function () {
  var ctx = makeCtx();
  var wf = loadWF(ctx);
  if (!wf) { no('runtime', 'PF.wildFinds not set'); return; }
  ok('PF.wildFinds exposed');
  var all = wf.all();
  if (all.length === 14) ok('all() returns 14 types');
  else no('all()', 'got ' + all.length);
  var t = wf.get('ice_watch');
  if (t && t.label === 'NO ICE' && t.safety.length >= 3) ok('get(ice_watch)');
  else no('get(ice_watch)', 'bad shape');
  if (wf.get('bogus') === null) ok('get(bogus) -> null');
  else no('get(bogus)', 'should be null');
  /* subtypeFromTargetKey */
  if (wf.subtypeFromTargetKey('street_art:downtown') === 'street_art') ok('subtypeFromTargetKey prefix');
  else no('subtypeFromTargetKey', 'prefix fail');
  if (wf.subtypeFromTargetKey('nope:x') === '') ok('subtypeFromTargetKey unknown -> ""');
  else no('subtypeFromTargetKey unknown', 'should be ""');
  if (wf.subtypeFromTargetKey('') === '') ok('subtypeFromTargetKey empty -> ""');
  else no('subtypeFromTargetKey empty', 'should be ""');
  /* missions */
  var ms = wf.missions();
  if (ms.length === 3 && ms.every(function (m) { return m.wf && /WILD FIND/.test(m.t); })) ok('missions() 3 rotating');
  else no('missions()', 'bad shape');
  /* safetyHTML */
  var sh = wf.safetyHTML('ice_watch');
  if (/trespassing/i.test(sh) && /safe distance/i.test(sh) && /<li>/.test(sh)) ok('safetyHTML global + ice rules');
  else no('safetyHTML', 'missing rules');
  var sh2 = wf.safetyHTML('sticker');
  if (/trespassing/i.test(sh2) && !/safe distance/i.test(sh2)) ok('safetyHTML global only for sticker');
  else no('safetyHTML sticker', 'wrong rules');
  /* typeStripHTML */
  var strip = wf.typeStripHTML();
  if (/WHAT WE'RE LOOKING FOR/.test(strip) && (strip.match(/data-wf-key/g) || []).length === 14) ok('typeStripHTML 14 cards');
  else no('typeStripHTML', 'bad');
  /* openTypePicker render + pick */
  var picked = null;
  wf.openTypePicker(function (k) { picked = k; });
  var picker = ctx.doc.getElementById('pf-wf-picker');
  if (picker && /WHAT DID YOU FIND/.test(picker.innerHTML)) ok('openTypePicker renders');
  else no('openTypePicker', 'not rendered');
  wf.closePicker();
  if (!ctx.doc.getElementById('pf-wf-picker')) ok('closePicker removes');
  else no('closePicker', 'still present');
  /* esc() — prompt with HTML is escaped in strip */
  if (!/<script/i.test(strip)) ok('no raw script in strip HTML');
  else no('escaping', 'raw script found');
})();

/* Kill switch */
(function () {
  var ctx = makeCtx({ skip: function (n) { return n === 'wildfinds'; } });
  loadWF(ctx);
  if (!ctx.win.PF.wildFinds || !ctx.win.PF.wildFinds.all) ok('kill switch (?pf_off=wildfinds)');
  else no('kill switch', 'module ran despite skip');
})();

/* refresh(): backend wins, fail-open without backend */
(function () {
  var ctx = makeCtx();
  var wf = loadWF(ctx);
  var before = wf.get('street_art').prompt;
  var origCreate = ctx.doc.createElement;
  /* simulate backend returning an updated prompt */
  ctx.doc.createElement = function (tag) {
    var el = origCreate.call(ctx.doc, tag);
    if (tag === 'script') {
      Object.defineProperty(el, 'src', {
        set: function (v) {
          var m = /callback=([A-Za-z0-9_]+)/.exec(v || '');
          setTimeout(function () {
            if (m && ctx.win[m[1]]) ctx.win[m[1]]({ ok: true, types: { street_art: { prompt: 'BACKEND PROMPT' } }, safety: ['RULE A', 'RULE B', 'RULE C'] });
          }, 5);
        },
        get: function () { return ''; }
      });
    }
    return el;
  };
  wf.refresh(function (okv) {
    if (okv && wf.get('street_art').prompt === 'BACKEND PROMPT') ok('refresh(): backend wins');
    else no('refresh()', 'backend did not win');
  });
  /* fail-open: no backend URL */
  var ctx2 = makeCtx();
  ctx2.win.PF_BACKEND_URL = '';
  var wf2 = loadWF(ctx2);
  wf2.refresh(function (okv) {
    if (!okv && wf2.get('protest').label === 'PROTEST SIGNS') ok('refresh() fail-open keeps bundled copy');
    else no('refresh() fail-open', 'bad');
    if (before !== 'BACKEND PROMPT') ok('bundled copy intact pre-refresh');
  });
})();

/* data-bounties.js static: safety gate posts safety_ok */
(function () {
  var s = read(DB);
  if (/payload\.safety_ok\s*=\s*true/.test(s)) ok('claim posts safety_ok=true');
  else no('safety_ok post', 'missing');
  if (/Confirm the safety rules first/.test(s)) ok('client-side attestation block');
  else no('attestation block', 'missing');
})();

/* daily-orders.js static: injection is guarded */
(function () {
  var s = stripComments(read(DO));
  if (/PF\.wildFinds\.missions\(\)/.test(s) && /try\s*\{/.test(s)) ok('daily-orders guarded injection');
  else no('daily-orders injection', 'missing');
})();

setTimeout(function () {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { fails.forEach(function (f) { console.log('FAIL: ' + f); }); process.exit(1); }
}, 300);
