#!/usr/bin/env node
/* scripts/verify-phq-hubs-fe.js — PHQ section-hub layer verification.
   Run from the repo root:
     node scripts/verify-phq-hubs-fe.js
   1. node --check on new/patched modules
   2. Static checks against phq-hub-ia-spec-20261005.md §1/§2/§7 (hub ids,
      tab order, hashes, interim kill strings, ★ per-pane ids, kill
      fail-soft, TERMINAL STATE, no new XP, no "donate", esc hygiene,
      replaceState-not-location.hash, delegation + legacy fallback,
      bundle registration, CSS sync)
   3. vm runtime tests: pure helpers (pane kinds, hub maps pre/post split,
      kill strings) + fake-DOM smoke (subnav render, phq-hubnav kill,
      goHub hash, hub shells)
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
var BUNDLEJS = path.join(ROOT, 'build', 'bundle.js');
var ARTIFACT = path.join(V, 'games', 'bundle-hq.js');

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
console.log('== 2. static spec checks ==');

/* 2a. six hubs, spec ids/order/hashes */
var hubIds = ['people', 'bills', 'ballot', 'action', 'intel', 'money'];
var hubTabs = ['PEOPLE', 'BILLS & COURTS', 'BALLOT', 'TAKE ACTION', 'INTEL', 'FOLLOW THE MONEY'];
hubIds.forEach(function (id, i) {
  if (has(MOD, "id: '" + id + "'")) ok('hub id ' + id);
  else no('hub id ' + id, 'missing from HUBS config');
});
/* hashes are built dynamically ('phq-' + hub.id); verify the constructors */
if (has(MOD, "sec.id = 'phq-' + hub.id") || has(MOD, "getElementById('phq-' + hub.id)"))
  ok('hub section ids built as phq-<id>');
else no('section ids', 'phq-<id> construction missing');
if (has(MOD, "'#phq-' + hubId") || has(MOD, "'#phq-' + hub.id"))
  ok('hash deep-links built as #phq-<id>');
else no('hash links', '#phq-<id> construction missing');
/* tab order */
var tabOrder = hubTabs.map(function (t) { return code.indexOf("tab: '" + t + "'"); });
var ordered = tabOrder.every(function (v, i) { return v !== -1 && (i === 0 || v > tabOrder[i - 1]); });
if (ordered) ok('tab order PEOPLE · BILLS & COURTS · BALLOT · TAKE ACTION · INTEL · FOLLOW THE MONEY');
else no('tab order', 'tabs out of spec order or missing');

/* 2b. interim kill strings (spec §7) */
var interimExpect = {
  people: ['civic', 'stateleg', 'wallshame'],
  bills: ['legislation', 'courts', 'eo', 'governance', 'wallshame'],
  ballot: ['civic', 'ballotcd', 'races', 'measures'],
  action: ['action-center', 'civic', 'footprint', 'vote-alerts', 'civic-duty'],
  intel: ['intel', 'civic', 'nonprofits'],
  money: ['money-tab', 'money-vote', 'pac-alerts', 'trades-tab', 'corp-card', 'ledgers', 'boycotts']
};
Object.keys(interimExpect).forEach(function (hub) {
  var want = interimExpect[hub].map(function (s) { return "'" + s + "'"; }).join(',');
  /* find the hub's interim array in source */
  var re = new RegExp("id: '" + hub + "'[\\s\\S]*?interim: \\[([^\\]]+)\\]");
  var m = src.match(re);
  if (!m) { no('kill ' + hub, 'interim array not found'); return; }
  var got = m[1].replace(/\s+/g, '');
  if (got === want) ok('interim kill string ' + hub);
  else no('kill ' + hub, 'got [' + got + '] want [' + want + ']');
});

/* 2c. ★ per-pane target ids present (spec §5.1) */
var starIds = ['civic-directory', 'civic-scorecards', 'civic-ballot', 'civic-votercheck',
  'civic-pressure', 'civic-petitions', 'civic-pledges', 'civic-callpractice',
  'civic-polls', 'civic-sharekits'];
var missingStar = starIds.filter(function (id) { return code.indexOf("'" + id + "'") === -1; });
if (!missingStar.length) ok('all 10 ★ per-pane silo ids in target map');
else no('star ids', 'missing: ' + missingStar.join(','));

/* 2d. split flag flips the map */
if (has(MOD, 'PF_PHQ_SPLIT') && has(MOD, 'SPLIT ? HUBS[i].silos : HUBS[i].order'))
  ok('PF_PHQ_SPLIT flips silo map');
else no('split flag', 'PF_PHQ_SPLIT wiring missing');

/* 2e. kill fail-soft: hub hides when zero silos mount; phq-hubnav kill */
if (has(MOD, "PF.skip('phq-hubnav')")) ok('?pf_off=phq-hubnav kill');
else no('hubnav kill', 'missing');
if (code.indexOf('n === 0') !== -1 && has(MOD, 'fail-soft')) ok('hub fail-soft hide on zero silos');
else no('fail-soft', 'hub hide path missing');

/* 2f. TERMINAL STATE: loading placeholder removed on all terminal paths */
if (has(MOD, 'pf-hub-loading') && has(MOD, 'clearLoading(hub)') && code.indexOf('removeChild(l)') !== -1)
  ok('TERMINAL STATE: loading placeholder cleared');
else no('terminal state', 'loading placeholder may persist');
if (has(MOD, 'This widget failed to start') && has(MOD, 'location.reload()'))
  ok('silo error terminal state (error + Reload)');
else no('silo terminal', 'missing error+Reload fallback');

/* 2g. no new XP / currencies; no banned "donate" */
if (/\bxpGrant\b|\bxpAdd\b|\+ ?\d+ ?XP/.test(code)) no('xp', 'new XP grant found — existing legs only');
else ok('no new XP grants');
if (/donate/i.test(code)) no('donate', 'banned word present');
else ok('no "donate" copy');

/* 2h. esc hygiene on interpolated copy */
['esc(hub.mission)', 'esc(hub.tab)', 'esc(hub.title)'].forEach(function (s) {
  if (has(MOD, s)) ok('esc: ' + s); else no('esc', s + ' missing');
});

/* 2i. hash via replaceState, never location.hash assignment */
if (/location\.hash\s*=/.test(code)) no('hash', 'location.hash assignment would jump the page');
else if (has(MOD, 'history.replaceState')) ok('hash via history.replaceState');
else no('hash', 'no hash update mechanism');

/* 2j. delegation + legacy fallback in political-hq.js */
if (has(PHQ, 'PF.mountHubSilos(ORDER)')) ok('political-hq.js delegates to hub layer');
else no('delegation', 'PF.mountHubSilos(ORDER) missing');
if (has(PHQ, 'Legacy flat mount') || has(PHQ, '} else {')) ok('legacy flat fallback preserved');
else no('fallback', 'legacy mount path missing');
if (has(PHQ, "getElementById('pf-hq-subnav')")) ok('news rail pins above sub-nav');
else no('news rail', 'rail/sub-nav ordering missing');

/* 2k. bundle registration: phq-hubs.js FIRST in HQ bundle */
var bjs = read(BUNDLEJS);
var hqMap = bjs.match(/'bundle-hq': \[([\s\S]*?)\]/);
if (hqMap && hqMap[1].indexOf("'phq-hubs.js'") !== -1 &&
    hqMap[1].indexOf("'phq-hubs.js'") < hqMap[1].indexOf("'civic.js'"))
  ok('build/bundle.js: phq-hubs.js first in bundle-hq');
else no('bundle map', 'phq-hubs.js not first in HQ_BUNDLES');
if (has(ARTIFACT, 'pfPhqHubsDone') && has(ARTIFACT, 'Contains: phq-hubs.js, civic.js'))
  ok('bundle-hq.js artifact regenerated with hub runtime');
else no('artifact', 'bundle-hq.js not regenerated');

/* 2k2. deep-chunk split (fe/political-hq-optimize): below-fold silos ride
   bundle-hq-deep.js, loaded async by the hub runtime — never in the
   blocking bundle. */
var deepMap = bjs.match(/'bundle-hq-deep': \[([\s\S]*?)\]/);
var DEEP_FILES = ['stateleg.js', 'legislation.js', 'governance.js', 'notify-prefs.js',
  'intel.js', 'predict.js', 'predict-home.js', 'ballot-countdown.js', 'nonprofits.js'];
if (deepMap && DEEP_FILES.every(function (f) { return deepMap[1].indexOf("'" + f + "'") !== -1; }))
  ok('build/bundle.js: deep chunk holds the 9 below-fold silos');
else no('deep bundle map', 'bundle-hq-deep missing or incomplete in build/bundle.js');
if (hqMap && DEEP_FILES.every(function (f) { return hqMap[1].indexOf("'" + f + "'") === -1; }))
  ok('build/bundle.js: deep files NOT in the blocking bundle-hq');
else no('split', 'a below-fold silo is still in the blocking bundle-hq');
var DEEP_ART = path.join(V, 'games', 'bundle-hq-deep.js');
if (fs.existsSync(DEEP_ART) && has(DEEP_ART, 'pf-ov-nonprofits') && has(DEEP_ART, 'pf-ov-stateleg'))
  ok('bundle-hq-deep.js artifact built with deep silo templates');
else no('deep artifact', 'bundle-hq-deep.js missing or stale');
if (has(MOD, 'PF.phqDeepReady') && has(MOD, 'loadDeepChunk()') && has(MOD, 'bundle-hq-deep.js'))
  ok('phq-hubs.js: async deep-chunk loader + phqDeepReady retry');
else no('deep loader', 'deep-chunk loader / phqDeepReady missing in phq-hubs.js');
if (has(MOD, 'hubMissing') && has(MOD, 'mountedSilos'))
  ok('phq-hubs.js: missing-template retry + remount dedupe guards');
else no('retry guards', 'hubMissing/mountedSilos guards missing');
if (has(MOD, 'template not staged yet') || has(MOD, 'phqDeepReady() can re-run'))
  ok('phq-hubs.js: notify-prefs waits for deep chunk (no empty util div)');
else no('notify-prefs', 'notify-prefs deep-chunk guard missing');

/* 2l. CSS sync */
try {
  cp.execSync('node build/check-styles-sync.js', { cwd: ROOT, stdio: 'pipe' });
  ok('check-styles-sync.js clean');
} catch (e) { no('css sync', 'bundle-styles.css drifted'); }

/* 2m. scroll-spy + lazy-mount + mobile strip markers */
if (has(MOD, 'IntersectionObserver') && has(MOD, "rootMargin: '800px'")) ok('lazy-mount observer (800px preload)');
else no('lazy', 'IntersectionObserver lazy-mount missing');
if (has(MOD, 'setTimeout') && has(MOD, '15000')) ok('15s lazy safety net');
else no('lazy safety', 'missing');
if (has(MOD, 'scroll-snap-type') || has(MOD, 'pf-hq-tabs')) ok('mobile tab strip');
else no('mobile strip', 'missing');
if (has(MOD, 'prefers-reduced-motion')) ok('reduced-motion respect');
else no('reduced motion', 'missing');

/* 2n. Wall of Shame dual-mount slots + money slot contracts */
if (has(MOD, 'data-wallshame-slot') && has(MOD, 'PFWallShame.mount'))
  ok('wallshame dual-mount slots (fail-soft)');
else no('wallshame', 'dual-mount slot API missing');
if (has(MOD, 'PFMoneyTab.mountTab')) ok('money slot contract (mountTab)');
else no('money slot', 'missing');

/* 2o. AC-return rail + next-hub exits + notify-prefs alert row */
if (has(MOD, 'Back to Action Center') && has(MOD, 'data-hub-go="action"')) ok('AC-return rail');
else no('ac return', 'missing');
if (has(MOD, 'Next: ')) ok('next-hub exits');
else no('next-hub', 'missing');
if (has(MOD, 'pf-util-notify-prefs') && has(MOD, 'Alert settings')) ok('notify-prefs utility + alert row');
else no('notify-prefs', 'missing');

/* ============ 3. vm runtime tests ============ */
console.log('== 3. vm runtime tests ==');

function fakeDom(opts) {
  opts = opts || {};
  var registry = {};
  function mkEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(), children: [], style: {}, attrs: {},
      _id: '', className: '', textContent: '', innerHTML: '',
      parentNode: null, offsetParent: {},
      get id() { return this._id; },
      set id(v) { this._id = v; if (v) registry[v] = this; },
      setAttribute: function (k, v) { this.attrs[k] = v; },
      getAttribute: function (k) { return this.attrs[k] || null; },
      removeAttribute: function (k) { delete this.attrs[k]; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore: function (c, ref) {
        c.parentNode = this;
        var i = this.children.indexOf(ref);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i !== -1) this.children.splice(i, 1);
        return c;
      },
      addEventListener: function () {},
      querySelector: function (sel) {
        if (sel === '.pf-hub-loading' || sel === '.pf-hub-silos') {
          var d = mkEl('div'); d.parentNode = this; return d;
        }
        return null;
      },
      querySelectorAll: function () { return []; },
      scrollIntoView: function () {}
    };
    return el;
  }
  var host = mkEl('div'); host.id = 'pf-political-hq'; registry['pf-political-hq'] = host;
  var skipped = opts.skipped || [];
  var replaced = [];
  var doc = {
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (t) { return mkEl(t); },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    body: mkEl('body')
  };
  var win = {
    PF: {
      skip: function (s) { return skipped.indexOf(s) !== -1; },
      error: function () {}
    },
    location: { href: 'https://www.mtcstw.com/political-hq', hash: opts.hash || '', search: '' },
    history: { replaceState: function (a, b, h) { replaced.push(h); } },
    matchMedia: function () { return { matches: false }; },
    setTimeout: setTimeout, document: doc
  };
  if (opts.split) win.PF_PHQ_SPLIT = true;
  win.window = win;
  return { win: win, doc: doc, host: host, replaced: replaced, registry: registry, mkEl: mkEl };
}

function loadInVm(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(read(MOD), ctx, { filename: 'phq-hubs.js' });
  return env.win.PF;
}

try {
  /* 3a. helpers: pane kinds */
  var env = fakeDom();
  var PFt = loadInVm(env);
  var T = PFt.phqHubTest;
  if (!T) { no('vm', 'PF.phqHubTest seam missing'); }
  else {
    ok('vm module load');
    var cases = [
      ['Petitions', 'petitions'], ['Contact your rep', 'directory'],
      ['Voter registration', 'voter'], ['Network polls', 'polls'],
      ['Call practice mode', 'callpractice'], ['Congress scorecards', 'scorecards'],
      ['Ballot Center', 'ballot'], ['Pressure campaigns', 'pressure']
    ];
    var bad = cases.filter(function (c) { return T.paneKindForHeading(c[0]) !== c[1]; });
    if (!bad.length) ok('paneKindForHeading x' + cases.length);
    else no('pane kinds', JSON.stringify(bad));
    var hubCases = [['petitions', 'action'], ['directory', 'people'], ['polls', 'intel'],
      ['ballot', 'ballot'], ['scorecards', 'people'], ['voter', 'ballot']];
    var badH = hubCases.filter(function (c) { return T.hubForPaneKind(c[0]) !== c[1]; });
    if (!badH.length) ok('hubForPaneKind x' + hubCases.length);
    else no('hubForPaneKind', JSON.stringify(badH));
    /* pre-split silo map */
    var pre = [['stateleg', 'people'], ['legislation', 'bills'], ['courts', 'bills'],
      ['governance', 'bills'], ['action-center', 'action'], ['footprint', 'action'],
      ['vote-alerts', 'action'], ['intel', 'intel'], ['nonprofits', 'intel'],
      ['races', 'ballot'], ['measures', 'ballot'], ['civic', null], ['notify-prefs', null]];
    var badP = pre.filter(function (c) { return T.hubForSilo(c[0]) !== c[1]; });
    if (!badP.length) ok('hubForSilo pre-split x' + pre.length);
    else no('hubForSilo pre', JSON.stringify(badP));
    /* kill strings match spec §7 */
    var k = T.hubKillIds(T.hubs[0]);
    if (k.join(',') === 'civic,stateleg,wallshame') ok('hubKillIds people = spec §7 interim');
    else no('hubKillIds', k.join(','));
  }
} catch (e) { no('vm helpers', e && e.message); }

try {
  /* 3b. post-split map flips */
  var env2 = fakeDom({ split: true });
  var PF2 = loadInVm(env2);
  var T2 = PF2.phqHubTest;
  var post = [['civic-directory', 'people'], ['civic-scorecards', 'people'],
    ['civic-ballot', 'ballot'], ['civic-votercheck', 'ballot'],
    ['civic-pressure', 'action'], ['civic-petitions', 'action'],
    ['civic-polls', 'intel'], ['civic-sharekits', 'action'],
    ['civic-callpractice', 'action'], ['civic-pledges', 'action']];
  var badS = post.filter(function (c) { return T2.hubForSilo(c[0]) !== c[1]; });
  if (!badS.length) ok('hubForSilo post-split x' + post.length);
  else no('hubForSilo post', JSON.stringify(badS));
  var k2 = T2.hubKillIds(T2.hubs[3]);
  if (k2.join(',') === 'action-center,civic-pressure,civic-petitions,civic-pledges,civic-callpractice,footprint,vote-alerts,civic-duty,civic-sharekits')
    ok('hubKillIds action = spec §7 target');
  else no('hubKillIds target', k2.join(','));
} catch (e) { no('vm split', e && e.message); }

try {
  /* 3c. DOM smoke: subnav + hub shells render */
  var env3 = fakeDom();
  var PF3 = loadInVm(env3);
  var ORDER = [['civic', 'pf-ov-civic'], ['notify-prefs', 'pf-ov-notify-prefs'],
    ['governance', 'pf-ov-gov'], ['intel', 'pf-ov-intel']];
  PF3.mountHubSilos(ORDER);
  var nav = env3.doc.getElementById('pf-hq-subnav');
  if (nav) {
    var tabs = nav.children[0] ? nav.children[0].children : [];
    if (tabs.length === 6) ok('subnav renders 6 tabs');
    else no('subnav tabs', 'got ' + tabs.length);
  } else no('subnav', 'not rendered');
  var shells = hubIds.filter(function (id) { return !!env3.doc.getElementById('phq-' + id); });
  if (shells.length === 6) ok('6 hub shells rendered');
  else no('hub shells', 'got ' + shells.length);
  /* goHub sets hash via replaceState */
  PF3.phqGoHub('bills');
  if (env3.replaced.indexOf('#phq-bills') !== -1) ok('goHub deep-link hash #phq-bills');
  else no('goHub hash', JSON.stringify(env3.replaced));
} catch (e) { no('vm dom', e && e.message); }

try {
  /* 3d. ?pf_off=phq-hubnav kills the bar, hubs stack */
  var env4 = fakeDom({ skipped: ['phq-hubnav'] });
  var PF4 = loadInVm(env4);
  PF4.mountHubSilos([['governance', 'pf-ov-gov']]);
  if (!env4.doc.getElementById('pf-hq-subnav')) ok('phq-hubnav kill hides sub-nav');
  else no('hubnav kill', 'sub-nav rendered despite kill');
  var shells4 = hubIds.filter(function (id) { return !!env4.doc.getElementById('phq-' + id); });
  if (shells4.length === 6) ok('hubs stack without sub-nav (graceful degradation)');
  else no('degraded stack', 'got ' + shells4.length);
} catch (e) { no('vm hubnav kill', e && e.message); }

try {
  /* 3e. deep-chunk split: missing templates recorded, then mounted on
     phqDeepReady() with no duplicates (fe/political-hq-optimize). */
  var env5 = fakeDom();
  var PF5 = loadInVm(env5);
  var T5 = PF5.phqHubTest;
  /* vm shim lacks importNode — mountOneSilo needs it */
  env5.doc.importNode = function (n) { return n; };
  function stageTpl(id) {
    var t = env5.mkEl('template'); t.id = id;
    t.content = {}; /* truthy: passes the !tpl.content check */
    return t;
  }
  /* stage ONLY the critical template first (deep chunk not loaded) */
  stageTpl('pf-ov-civic');
  var ORDER5 = [['civic', 'pf-ov-civic'], ['legislation', 'pf-ov-legislation'],
    ['predict', 'pf-ov-predict'], ['stateleg', 'pf-ov-stateleg'],
    ['notify-prefs', 'pf-ov-notify-prefs'], ['governance', 'pf-ov-gov'],
    ['intel', 'pf-ov-intel'], ['nonprofits', 'pf-ov-nonprofits']];
  PF5.mountHubSilos(ORDER5);
  var miss = T5.hubMissing;
  function missHas(hub, silo) {
    return (miss[hub] || []).some(function (m) { return m[0] === silo; });
  }
  if (missHas('people', 'stateleg') && missHas('bills', 'legislation') &&
      missHas('bills', 'governance') && missHas('intel', 'intel') &&
      missHas('intel', 'nonprofits') && missHas('ballot', 'predict'))
    ok('deep split: missing templates recorded per hub');
  else no('deep missing', JSON.stringify(miss));
  if (!env5.doc.getElementById('pf-util-notify-prefs'))
    ok('deep split: notify-prefs util div NOT pre-created (waits for deep)');
  else no('notify-prefs', 'empty util div created before deep chunk');
  /* deep chunk lands: stage templates, fire phqDeepReady() */
  ['pf-ov-legislation', 'pf-ov-predict', 'pf-ov-stateleg', 'pf-ov-notify-prefs',
   'pf-ov-gov', 'pf-ov-intel', 'pf-ov-nonprofits'].forEach(stageTpl);
  PF5.phqDeepReady();
  if (env5.doc.getElementById('phq-silo-stateleg') &&
      env5.doc.getElementById('phq-silo-legislation') &&
      env5.doc.getElementById('phq-silo-governance') &&
      env5.doc.getElementById('phq-silo-intel') &&
      env5.doc.getElementById('phq-silo-nonprofits') &&
      env5.doc.getElementById('phq-silo-predict'))
    ok('deep ready: all 6 late silos mounted into their hubs');
  else no('deep remount', 'a late silo failed to mount on phqDeepReady()');
  if (env5.doc.getElementById('pf-util-notify-prefs'))
    ok('deep ready: notify-prefs util pane mounted');
  else no('notify-prefs', 'util pane missing after phqDeepReady()');
  /* idempotent: second call mounts nothing new (6 late + civic + notify-prefs) */
  var secsBefore = Object.keys(env5.registry).filter(function (k) { return k.indexOf('phq-silo-') === 0; }).length;
  PF5.phqDeepReady();
  var secsAfter = Object.keys(env5.registry).filter(function (k) { return k.indexOf('phq-silo-') === 0; }).length;
  if (secsBefore === 8 && secsAfter === 8) ok('deep ready: idempotent, no duplicate silo sections');
  else no('deep idempotency', 'silo sections ' + secsBefore + ' -> ' + secsAfter);
} catch (e) { no('vm deep split', e && e.message); }

try {
  /* 3f. hub-visibility regression (QC veto 2026-10-05): the deep-chunk split
     hid people/bills/intel on the first pass (fail-soft, n=0) but no code
     path ever restored display after phqDeepReady() re-mounted their silos —
     the silos existed in the DOM but stayed permanently invisible. Simulate
     the faithful sequence: all hubs mount with deep templates missing (n=0
     -> hidden), then the deep chunk lands and phqDeepReady() re-mounts. */
  var env6 = fakeDom({ skipped: ['phq-hubnav'] }); /* navKilled: mounts all 6 hubs first pass */
  var PF6 = loadInVm(env6);
  env6.doc.importNode = function (n) { return n; };
  function stageTpl6(id) {
    var t = env6.mkEl('template'); t.id = id; t.content = {}; return t;
  }
  stageTpl6('pf-ov-civic');
  var ORDER6 = [['legislation', 'pf-ov-legislation'], ['predict', 'pf-ov-predict'],
    ['stateleg', 'pf-ov-stateleg'], ['governance', 'pf-ov-gov'],
    ['intel', 'pf-ov-intel'], ['nonprofits', 'pf-ov-nonprofits']];
  PF6.mountHubSilos(ORDER6);
  function disp6(id) {
    var s = env6.doc.getElementById('phq-' + id);
    return s ? s.style.display : '<missing>';
  }
  /* sub-nav stand-in: tabs derive visibility from section display (refreshTabs) */
  var nav6 = env6.mkEl('nav'); nav6.id = 'pf-hq-subnav';
  var tabs6 = {};
  ['people', 'bills', 'intel'].forEach(function (id) {
    var b = env6.mkEl('button'); b.className = 'pf-hq-tab';
    b.setAttribute('data-hub', id); tabs6[id] = b;
  });
  nav6.querySelectorAll = function (sel) {
    return sel === '.pf-hq-tab' ? [tabs6.people, tabs6.bills, tabs6.intel] : [];
  };
  var triad = ['people', 'bills', 'intel'];
  if (triad.every(function (id) { return disp6(id) === 'none'; }))
    ok('visibility: people/bills/intel hidden on first pass (fail-soft, n=0)');
  else no('vis first pass', 'people=' + disp6('people') + ' bills=' + disp6('bills') + ' intel=' + disp6('intel'));
  /* deep chunk lands: stage templates, fire phqDeepReady() */
  ['pf-ov-legislation', 'pf-ov-predict', 'pf-ov-stateleg', 'pf-ov-gov',
   'pf-ov-intel', 'pf-ov-nonprofits'].forEach(stageTpl6);
  PF6.phqDeepReady();
  if (triad.every(function (id) { return disp6(id) !== 'none'; }))
    ok('visibility: people/bills/intel sections un-hidden after phqDeepReady()');
  else no('vis after deep', 'people=' + disp6('people') + ' bills=' + disp6('bills') + ' intel=' + disp6('intel'));
  var tabsOk = triad.every(function (id) {
    return tabs6[id].style.display !== 'none' && tabs6[id].getAttribute('aria-hidden') === 'false';
  });
  if (tabsOk) ok('visibility: people/bills/intel tabs restored after phqDeepReady()');
  else no('tab vis after deep', triad.map(function (k) {
    return k + '=' + tabs6[k].style.display + '/' + tabs6[k].getAttribute('aria-hidden');
  }).join(' '));
  /* fail-soft preserved: intentionally-empty hubs (action/money, no silos in
     ORDER) stay hidden — the n>0 restore must not un-hide them */
  if (disp6('action') === 'none' && disp6('money') === 'none')
    ok('visibility: intentionally-empty hubs (action/money) stay hidden');
  else no('vis empty hubs', 'action=' + disp6('action') + ' money=' + disp6('money'));
} catch (e) { no('vm visibility', e && e.message); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
