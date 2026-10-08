#!/usr/bin/env node
/* scripts/verify-phq-command-deck-fe.js — Political HQ Command Deck verification.
   Run from the repo root:
     node scripts/verify-phq-command-deck-fe.js
   1. node --check on phq-hubs.js + political-hq.js
   2. Static checks: masthead (+kill), spine phase, Next Move fail-soft,
      BREATHE classes, arrival pulse, nav offset, no "donate" in code,
      no new XP, esc hygiene, CSS presence + styles sync
   3. vm runtime tests with a fake DOM: mount (masthead/nav/shells/spine/
      nextmove slots), masthead kill, Next Move present/absent, nav offset
      with season bar, goHub hash + arrival, strip behavior
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'games', 'phq-hubs.js');
var PHQ = path.join(V, 'pages', 'political-hq.js');
var CSS = path.join(V, 'core', '02-design-system.css');
var BUNDLECSS = path.join(V, 'core', 'bundle-styles.css');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('phq-hubs.js syntax'); }
catch (e) { no('syntax', 'phq-hubs.js node --check failed'); }
try { cp.execSync('node --check ' + PHQ, { stdio: 'pipe' }); ok('political-hq.js syntax'); }
catch (e) { no('syntax', 'political-hq.js node --check failed'); }

var src = read(MOD);
var code = stripComments(src);

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');

/* 2a. masthead */
if (has(MOD, 'function renderMasthead') && has(MOD, "pf-hq-masthead") &&
    has(MOD, "pf_off=phq-masthead") && has(MOD, "PF.skip('phq-masthead')")) ok('masthead + kill switch');
else no('masthead', 'renderMasthead / pf-hq-masthead / kill switch missing');
if (has(MOD, 'pf-hq-status-ballot') && has(MOD, 'PF.ballotCountdowns')) ok('HQ status strip (ballot countdown read)');
else no('status', 'HQ status strip or ballotCountdowns read missing');

/* 2b. spine phase declaration (cohesion gate rule) */
if (has(MOD, "data-pf-spine-phase") && has(MOD, "'fight'")) ok('spine phase declared (fight)');
else no('spine', 'data-pf-spine-phase=fight missing');

/* 2c. Next Move fail-soft */
if (has(MOD, 'pf-hub-nextmove') && has(MOD, 'renderHubNextMoves') &&
    code.indexOf('PF.nextMove') !== -1 && has(MOD, '!nm || !nm.render')) ok('Next Move exit slots (fail-soft)');
else no('nextmove', 'exit slots or fail-soft guard missing');

/* 2d. BREATHE consumption */
if (has(MOD, 'pf-br-sec') && has(MOD, 'pf-br-head') && has(MOD, 'pf-br-kicker') &&
    has(MOD, 'pf-br-title') && has(MOD, 'pf-br-sub')) ok('BREATHE section rhythm consumed');
else no('breathe', 'pf-br-* classes missing from hub shells');

/* 2e. arrival pulse + nav offset */
if (has(MOD, 'pf-hq-arrived') && has(MOD, 'fixNavOffset') && has(MOD, 'pf-seasonbar')) ok('arrival pulse + season-bar nav offset');
else no('arrival', 'pf-hq-arrived / fixNavOffset / seasonbar handling missing');

/* 2f. no "donate" in code (comments may carry the compliance note) */
if (/donate/i.test(code)) no('donate', '"donate" appears in code');
else ok('no "donate" in code');

/* 2g. no new XP */
if (/pf-xp|xpGrant|dispatchXP/i.test(code)) no('xp', 'XP emission found in phq-hubs.js');
else ok('no new XP');

/* 2h. esc hygiene on interpolated hub strings */
if (has(MOD, 'esc(hub.title)') && has(MOD, 'esc(hub.mission)') && has(MOD, 'esc(hub.tab)')) ok('esc() on hub strings');
else no('esc', 'hub title/mission/tab not escaped');

/* 2i. CSS presence */
var css = read(BUNDLECSS);
var need = ['.pf-hq-masthead', '.pf-hq-status', '@keyframes pfHqArrive', '.pf-hq-arrived',
  '.pf-hub-nextmove', '.pf-phq-striphead', 'scroll-margin-top', '.pf-hub-exitlinks'];
var missing = need.filter(function (s) { return css.indexOf(s) === -1; });
if (!missing.length) ok('Command Deck CSS in served bundle');
else no('css', 'missing from bundle-styles.css: ' + missing.join(', '));

/* 2j. styles sync */
try {
  cp.execSync('node build/check-styles-sync.js', { cwd: ROOT, stdio: 'pipe' });
  ok('check-styles-sync clean');
} catch (e) { no('sync', 'check-styles-sync failed'); }

/* ============ 3. vm runtime tests ============ */
console.log('== 3. vm runtime tests ==');

var ORDER = [
  ['civic', 'pf-ov-civic'], ['legislation', 'pf-ov-legislation'],
  ['predict', 'pf-ov-predict'], ['predgame', 'pf-ov-predgame'],
  ['stateleg', 'pf-ov-stateleg'], ['notify-prefs', 'pf-ov-notify-prefs'],
  ['governance', 'pf-ov-gov'], ['intel', 'pf-ov-intel'], ['nonprofits', 'pf-ov-nonprofits']
];

function fakeDom(opts) {
  opts = opts || {};
  var registry = {}, all = [];
  function markAttached(el) {
    (function walk(n) {
      n._attached = true;
      if (n._id) registry[n._id] = n;
      for (var i = 0; i < n.children.length; i++) walk(n.children[i]);
    })(el);
  }
  function isAttached(el) {
    var n = el;
    while (n) { if (n._attached) return true; n = n.parentNode; }
    return false;
  }
  function mkEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(), children: [],
      style: { setProperty: function (k, v) { this[k] = v; } },
      attrs: {}, _id: '', className: '', textContent: '', innerHTML: '',
      parentNode: null, offsetParent: {}, offsetHeight: 40, _attached: false,
      classList: null,
      get id() { return this._id; },
      set id(v) { this._id = v; }, /* registered only on attach (real DOM semantics) */
      setAttribute: function (k, v) { this.attrs[k] = v; },
      getAttribute: function (k) { return this.attrs[k] || null; },
      appendChild: function (c) {
        c.parentNode = this; this.children.push(c);
        if (isAttached(this)) markAttached(c);
        return c;
      },
      insertBefore: function (c, ref) {
        c.parentNode = this;
        var i = this.children.indexOf(ref);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        if (isAttached(this)) markAttached(c);
        return c;
      },
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      scrollIntoView: function () {}
    };
    el.classList = {
      add: function (c) { if (el.className.indexOf(c) === -1) el.className += (el.className ? ' ' : '') + c; },
      remove: function (c) { el.className = el.className.split(' ').filter(function (x) { return x !== c; }).join(' '); },
      contains: function (c) { return el.className.split(' ').indexOf(c) !== -1; }
    };
    all.push(el);
    return el;
  }
  var host = mkEl('div'); host.id = 'pf-political-hq'; markAttached(host);
  var skipped = opts.skipped || [];
  var replaced = [];
  var doc = {
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (t) { return mkEl(t); },
    querySelectorAll: function (sel) {
      if (sel === '#pf-political-hq .pf-hub-nextmove') {
        return all.filter(function (e) {
          return e._attached && (e.className || '').indexOf('pf-hub-nextmove') !== -1;
        });
      }
      return [];
    },
    addEventListener: function () {},
    body: mkEl('body'),
    scripts: []
  };
  markAttached(doc.body);
  var win = {
    PF: {
      skip: function (s) { return skipped.indexOf(s) !== -1; },
      error: function () {}
    },
    location: { href: 'https://www.mtcstw.com/political-hq', hash: opts.hash || '', search: '' },
    history: { replaceState: function (a, b, h) { replaced.push(h); } },
    matchMedia: function () { return { matches: false }; },
    setTimeout: function () { return 0; }, /* deferred work not executed in tests */
    document: doc
  };
  if (opts.nextMove) {
    win.PF.nextMove = {
      calls: [],
      render: function (slot, ctx) { this.calls.push({ slot: slot, ctx: ctx }); }
    };
  }
  if (opts.seasonbar) {
    var sb = mkEl('div'); sb.id = 'pf-seasonbar';
    sb.style.display = ''; sb.offsetHeight = 36; sb.offsetParent = {};
    markAttached(sb); /* season bar lives on document.body in production */
  }
  win.window = win;
  return { win: win, doc: doc, host: host, replaced: replaced, registry: registry, all: all, mkEl: mkEl };
}

function loadInVm(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(read(MOD), ctx, { filename: 'phq-hubs.js' });
  return env.win.PF;
}

/* 3a. full mount: masthead, nav, shells, spine, slots */
try {
  var env = fakeDom();
  var PFt = loadInVm(env);
  if (!PFt.mountHubSilos) { no('vm-mount', 'PF.mountHubSilos missing'); }
  else {
    PFt.mountHubSilos(ORDER);
    var checks = [
      ['masthead', !!env.doc.getElementById('pf-hq-masthead')],
      ['subnav', !!env.doc.getElementById('pf-hq-subnav')],
      ['spine=fight', env.host.getAttribute('data-pf-spine-phase') === 'fight'],
      ['6 hub shells', ['action', 'people', 'bills', 'ballot', 'intel', 'money']
        .every(function (id) { return !!env.doc.getElementById('phq-' + id); })],
      /* fake DOM doesn't parse innerHTML — verify the slot markup in the shell HTML */
      ['6 nextmove slots in shell HTML', ['action', 'people', 'bills', 'ballot', 'intel', 'money']
        .every(function (id) {
          var s = env.doc.getElementById('phq-' + id);
          return s && s.innerHTML.indexOf('pf-hub-nextmove') !== -1 &&
            s.innerHTML.indexOf('data-phq-nm="' + id + '"') !== -1;
        })],
      ['hub shells carry pf-br-sec', ['action', 'people'].every(function (id) {
        var s = env.doc.getElementById('phq-' + id);
        return s && s.className.indexOf('pf-br-sec') !== -1;
      })]
    ];
    var bad = checks.filter(function (c) { return !c[1]; });
    if (!bad.length) ok('mount: masthead/nav/6 shells/spine/slots/BREATHE');
    else no('vm-mount', 'failed: ' + bad.map(function (c) { return c[0]; }).join(', '));
  }
} catch (e) { no('vm-mount', 'threw: ' + (e && e.message)); }

/* 3b. masthead kill */
try {
  var envK = fakeDom({ skipped: ['phq-masthead'] });
  var PK = loadInVm(envK);
  PK.mountHubSilos(ORDER);
  if (!envK.doc.getElementById('pf-hq-masthead')) ok('?pf_off=phq-masthead hides masthead');
  else no('masthead-kill', 'masthead rendered despite kill');
} catch (e) { no('masthead-kill', 'threw: ' + (e && e.message)); }

/* 3c. Next Move absent → no throw, slots untouched */
try {
  var envN = fakeDom();
  var PN = loadInVm(envN);
  PN.mountHubSilos(ORDER);
  var r = PN.phqHubTest.renderHubNextMoves();
  if (r === 0) ok('Next Move absent: fail-soft, 0 renders');
  else no('nm-absent', 'expected 0 renders, got ' + r);
} catch (e) { no('nm-absent', 'threw: ' + (e && e.message)); }

/* 3d. Next Move present → contextual renders on real slot elements.
   (Fake DOM doesn't parse innerHTML, so slots are created explicitly.) */
try {
  var envM = fakeDom({ nextMove: true });
  var PM = loadInVm(envM);
  ['action', 'ballot'].forEach(function (id) {
    var slot = envM.mkEl('div');
    slot.className = 'pf-hub-nextmove';
    slot.setAttribute('data-phq-nm', id);
    envM.host.appendChild(slot);
  });
  var n = PM.phqHubTest.renderHubNextMoves();
  var calls = envM.win.PF.nextMove.calls;
  var ctxs = calls.map(function (c) { return c.ctx; }).sort();
  if (n === 2 && calls.length === 2 && ctxs[0] === 'phq-hub-action' && ctxs[1] === 'phq-hub-ballot') {
    ok('Next Move present: contextual renders on slots');
  } else no('nm-present', 'expected 2 phq-hub-* renders, got ' + JSON.stringify(ctxs));
  /* idempotent: second call renders nothing new */
  var n2 = PM.phqHubTest.renderHubNextMoves();
  if (n2 === 0 && calls.length === 2) ok('Next Move slots render once (idempotent)');
  else no('nm-idempotent', 're-render leaked: ' + n2 + ' / ' + calls.length);
} catch (e) { no('nm-present', 'threw: ' + (e && e.message)); }

/* 3e. nav offset with season bar */
try {
  var envS = fakeDom({ seasonbar: true });
  var PS = loadInVm(envS);
  PS.mountHubSilos(ORDER);
  var nav = envS.doc.getElementById('pf-hq-subnav');
  if (nav && nav.style.top === '36px') ok('nav offset clears season bar (top=36px)');
  else no('nav-offset', 'nav.style.top=' + (nav && nav.style.top));
} catch (e) { no('nav-offset', 'threw: ' + (e && e.message)); }

/* 3f. goHub: hash + arrival pulse, no throw */
try {
  var envG = fakeDom();
  var PG = loadInVm(envG);
  PG.mountHubSilos(ORDER);
  PG.phqHubTest.goHub('ballot', true);
  var hashOk = envG.replaced[envG.replaced.length - 1] === '#phq-ballot';
  if (hashOk) ok('goHub: hash deep-link + arrival (no throw)');
  else no('gohub', 'hash not replaced: ' + JSON.stringify(envG.replaced));
} catch (e) { no('gohub', 'threw: ' + (e && e.message)); }

/* 3g. civic strip: no template → no strip, no throw */
try {
  var envC = fakeDom();
  var PC = loadInVm(envC);
  PC.mountHubSilos(ORDER);
  if (!envC.doc.getElementById('pf-phq-civicstrip')) ok('civic strip absent when template missing (no orphan header)');
  else no('strip', 'strip rendered without template');
} catch (e) { no('strip', 'threw: ' + (e && e.message)); }

/* ============ summary ============ */
console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { process.exit(1); }
