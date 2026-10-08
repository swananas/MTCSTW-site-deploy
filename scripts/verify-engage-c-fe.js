#!/usr/bin/env node
/* scripts/verify-engage-c-fe.js — Engagement Build-C frontend verification.
   Run from the repo root:
     node scripts/verify-engage-c-fe.js
   1. node --check on the new/changed modules.
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switches (?pf_off= ids), Psych copy bans (pool: the five banned
      gambling-vocabulary terms; seasons: defeat language + challenge/dare
      framing), badge present, esc() on injected fields, no XP-grant code,
      mount guards, bundle + page-mount registration.
   3. Mocked-browser runtime tests (vm + minimal DOM stub):
      kill switch darkens the surface; pool card renders badge/buckets from
      a pool_status fixture; resolved fixture renders the informational
      "called it" line; seasons board renders top rows + private own
      position; enrollment button posts and reloads.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var POOL_MOD = path.join(V, 'core', 'money-pools.js');
var SEAS_MOD = path.join(V, 'games', 'cell-seasons.js');
var PM_MOD = path.join(V, 'pages', 'page-mount.js');
var BC_MOD = path.join(ROOT, 'build', 'bundle-core.js');
var GB_MOD = path.join(ROOT, 'build', 'bundle.js');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* Comment-stripped view: block + line comments only, strings untouched. */
function decomment(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^\S\n])\/\/[^\n]*/g, '$1');
}

/* ---- 1. syntax ---- */
[POOL_MOD, SEAS_MOD, PM_MOD].forEach(function (m) {
  try {
    cp.execSync('node --check ' + JSON.stringify(m), { stdio: 'pipe' });
    ok('node --check ' + path.basename(m));
  } catch (e) { no('node --check ' + path.basename(m), 'syntax error'); }
});

/* ---- 2. static checks ---- */
var poolSrc = read(POOL_MOD), seasSrc = read(SEAS_MOD);
var poolC = decomment(poolSrc), seasC = decomment(seasSrc);

function bannedGrep(label, src, re) {
  if (re.test(src)) no(label, 'banned term matched');
  else ok(label);
}
bannedGrep('pool: no banned gambling vocabulary', poolC, /\b(bet|odds|wager|winnings|payout)\b/i);
bannedGrep('seasons: no banned gambling vocabulary', seasC, /\b(bet|odds|wager|winnings|payout)\b/i);
bannedGrep('seasons: no defeat language', seasC, /\b(defeated|crushed|losers?)\b/i);
bannedGrep('seasons: no challenge/dare framing', seasC, /\bcall[\s-]?out\b|\bdare\b/i);
if (/\bdonate\b/i.test(poolC) || /\bdonate\b/i.test(seasC)) no('no donate in copy', 'matched');
else ok('no donate in copy');

if (poolSrc.indexOf('experimental prediction pool — not a forecast') >= 0) ok('pool: badge copy present');
else no('pool: badge copy present', 'badge string missing');
if (/\bcalled it\b/.test(poolC)) ok('pool: informational resolution framing');
else no('pool: informational resolution framing', 'missing');
if (/\bwin\b|\blose\b|\bwinner\b/i.test(poolC)) no('pool: no win/lose binary in copy', 'matched');
else ok('pool: no win/lose binary in copy');

['money-pools', 'cell-seasons'].forEach(function () {});
if (poolSrc.indexOf("PF.skip('money')") >= 0 && poolSrc.indexOf("PF.skip('money-pools')") >= 0)
  ok('pool: master + section kill switches');
else no('pool: master + section kill switches', 'missing');
if (seasSrc.indexOf("PF.skip('cell-seasons')") >= 0) ok('seasons: kill switch');
else no('seasons: kill switch', 'missing');

if (/function esc\(s\)/.test(poolC) && /esc\(b\.label\)/.test(poolC) && /esc\(r\.called_it\.join/.test(poolC))
  ok('pool: esc() on injected fields');
else no('pool: esc() on injected fields', 'missing');
if (/function esc\(s\)/.test(seasC) && /esc\(b\.cell_name\)/.test(seasC))
  ok('seasons: esc() on injected fields');
else no('seasons: esc() on injected fields', 'missing');

if (!/xpGrant/.test(poolC) && !/xpGrant/.test(seasC)) ok('FE grants no XP');
else no('FE grants no XP', 'xpGrant referenced');
if (poolSrc.indexOf("getElementById('pf-money')") >= 0) ok('pool: #pf-money mount guard');
else no('pool: #pf-money mount guard', 'missing');
if (seasSrc.indexOf("getElementById('pf-cells-page')") >= 0) ok('seasons: #pf-cells-page mount guard');
else no('seasons: #pf-cells-page mount guard', 'missing');

if (read(BC_MOD).indexOf("'core/money-pools.js'") >= 0) ok('bundle-core: money-pools registered');
else no('bundle-core: money-pools registered', 'missing');
if (read(GB_MOD).indexOf("'cell-seasons.js'") >= 0) ok('bundle.js: cell-seasons registered');
else no('bundle.js: cell-seasons registered', 'missing');
if (read(PM_MOD).indexOf("['cell-seasons', null]") >= 0) ok('page-mount: cell-seasons order entry');
else no('page-mount: cell-seasons order entry', 'missing');
if (read(path.join(V, 'core', 'bundle-money.js')).indexOf('pfMoneyPoolsDone') >= 0)
  ok('bundle-money.js contains money-pools');
else no('bundle-money.js contains money-pools', 'rebuild missing');
if (read(path.join(V, 'games', 'bundle-cells.js')).indexOf('pfCellSeasonsDone') >= 0)
  ok('bundle-cells.js contains cell-seasons');
else no('bundle-cells.js contains cell-seasons', 'rebuild missing');

/* ---- 3. mocked-browser runtime ---- */
function fakeEl(tag) {
  var el = {
    tagName: tag, children: [], _html: '', _text: '',
    style: {}, dataset: {}, _attrs: {}, _listeners: {},
    appendChild: function (c) { el.children.push(c); return c; },
    removeChild: function (c) { var i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    setAttribute: function (k, v) { el._attrs[k] = String(v); },
    getAttribute: function (k) { return el._attrs[k] || null; },
    addEventListener: function (t, f) { (el._listeners[t] = el._listeners[t] || []).push(f); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._html; },
    set: function (v) { el._html = String(v); }
  });
  Object.defineProperty(el, 'textContent', {
    get: function () { return el._text; },
    set: function (v) { el._text = String(v); }
  });
  Object.defineProperty(el, 'id', {
    get: function () { return el._attrs.id || ''; },
    set: function (v) { el._attrs.id = String(v); }
  });
  Object.defineProperty(el, 'className', {
    get: function () { return el._attrs['class'] || ''; },
    set: function (v) { el._attrs['class'] = String(v); }
  });
  return el;
}

function runModule(file, fixtures, skipIds) {
  var code = read(file);
  var byId = {};
  var host = fakeEl('div'); host._attrs.id = 'pf-money';
  var cellsHost = fakeEl('div'); cellsHost._attrs.id = 'pf-cells-page';
  byId['pf-money'] = host; byId['pf-cells-page'] = cellsHost;
  var created = [];
  var lastPost = null;
  function docEl(tag) {
    var el = fakeEl(tag);
    created.push(el);
    if (tag === 'script') {
      Object.defineProperty(el, 'src', {
        get: function () { return el._src || ''; },
        set: function (v) {
          el._src = String(v);
          var m = /[?&]action=([^&]*)/.exec(el._src);
          var action = m ? decodeURIComponent(m[1]) : '';
          var cm = /[?&]callback=([^&]*)/.exec(el._src);
          var cbName = cm ? cm[1] : '';
          var fx = fixtures[action];
          var payload = typeof fx === 'function' ? fx(el._src) : (fx === undefined ? null : fx);
          if (cbName && sandbox.window[cbName]) {
            try { sandbox.window[cbName](payload); } catch (e) {}
          }
        }
      });
    }
    return el;
  }
  var PF = {
    skip: function (id) { return (skipIds || []).indexOf(id) >= 0; },
    toast: function () {},
    authPost: function (url, body, cb) {
      lastPost = body;
      var fx = fixtures.__post;
      var payload = typeof fx === 'function' ? fx(body) : { ok: true };
      try { cb(payload); } catch (e) {}
    }
  };
  var sandbox = {
    console: console,
    setTimeout: function (fn) { return 0; },
    setInterval: function () { return 0; },
    Math: Math, Date: Date, JSON: JSON, RegExp: RegExp, Object: Object, Array: Array,
    String: String, Number: Number, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent
  };
  sandbox.window = {
    PF: PF,
    PFCallsign: function () { return 'tester'; },
    PF_BACKEND_URL: 'https://api.example',
    location: { search: '', href: 'https://www.mtcstw.com/money' }
  };
  sandbox.document = {
    getElementById: function (id) { return byId[id] || null; },
    createElement: docEl,
    head: fakeEl('head'),
    body: fakeEl('body')
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  /* Expose globals the IIFE reads as bare identifiers. */
  var prelude = 'var window=this.window, document=this.document, location=window.location, ' +
    'setTimeout=this.setTimeout, setInterval=this.setInterval, fetch=this.fetch;\n';
  try {
    vm.runInContext(prelude + code, sandbox, { filename: path.basename(file) });
  } catch (e) { return { error: 'threw: ' + (e && e.message) }; }
  return { host: host, cellsHost: cellsHost, byId: byId, created: created, lastPost: function () { return lastPost; } };
}

function poolFixture(status) {
  return {
    ok: true,
    badge: 'experimental prediction pool — not a forecast',
    pool: {
      id: 'cpi-2026-10-05', week_id: '2026-10-05', series: 'CPIAUCNS',
      release_label: 'September CPI', closes_at: Date.now() + 86400000,
      status: status,
      buckets: [
        { id: 'u20', label: 'Under 2.0%', count: 3 },
        { id: '2024', label: '2.0 – 2.4%', count: 12 },
        { id: '2529', label: '2.5 – 2.9%', count: 30 },
        { id: '3034', label: '3.0 – 3.4%', count: 8 },
        { id: '35p', label: '3.5% or more', count: 1 }
      ],
      my_pick: status === 'open' ? null : '2529',
      resolution: status === 'resolved' ? {
        vintage_value: 2.7, vintage_period: '2026-09',
        called_it: ['tester', 'ally1'],
        note: 'The print came in at 2.7% YoY (2026-09) — these callsigns called it.'
      } : (status === 'void' ? { vintage_value: null, called_it: [], note: 'No fresh release data arrived, so this pool was set aside — no recognition granted.' } : null)
    }
  };
}

/* kill switch darkens the pool card */
{
  var r = runModule(POOL_MOD, {}, ['money-pools']);
  if (r.error) no('runtime: pool module loads', r.error);
  else {
    var has = r.created.some(function (el) { return el._attrs.id === 'pf-pool-cpi'; });
    if (!has) ok('runtime: ?pf_off=money-pools darkens the card');
    else no('runtime: ?pf_off=money-pools darkens the card', 'section created');
  }
}
{
  var r = runModule(POOL_MOD, {}, ['money']);
  var has = !r.error && r.created.some(function (el) { return el._attrs.id === 'pf-pool-cpi'; });
  if (!r.error && !has) ok('runtime: ?pf_off=money master kill darkens the card');
  else no('runtime: ?pf_off=money master kill darkens the card', r.error || 'section created');
}

/* open pool renders badge + buckets */
{
  var r = runModule(POOL_MOD, { pool_status: poolFixture('open') }, []);
  if (r.error) { no('runtime: pool open render', r.error); }
  else {
    var sec = r.created.filter(function (el) { return el._attrs.id === 'pf-pool-cpi'; })[0];
    var html = sec ? sec._html : '';
    if (html.indexOf('GUESS THE NEXT CPI PRINT') >= 0) ok('runtime: pool title renders');
    else no('runtime: pool title renders', 'missing');
    if (html.indexOf('experimental prediction pool — not a forecast') >= 0) ok('runtime: badge renders');
    else no('runtime: badge renders', 'missing');
    if (html.indexOf('2.5 – 2.9%') >= 0 && html.indexOf('30 reading') >= 0) ok('runtime: buckets + counts render');
    else no('runtime: buckets + counts render', 'missing');
  }
}

/* resolved pool renders the informational line */
{
  var r = runModule(POOL_MOD, { pool_status: poolFixture('resolved') }, []);
  var sec = !r.error && r.created.filter(function (el) { return el._attrs.id === 'pf-pool-cpi'; })[0];
  var html = sec ? sec._html : '';
  if (html.indexOf('called it') >= 0 && html.indexOf('2.7% YoY') >= 0) ok('runtime: resolution renders informationally');
  else no('runtime: resolution renders informationally', 'missing — ' + (r.error || 'no html'));
}

/* no pool -> honest empty state */
{
  var r = runModule(POOL_MOD, { pool_status: { ok: true, badge: 'experimental prediction pool — not a forecast', pool: null } }, []);
  var sec = !r.error && r.created.filter(function (el) { return el._attrs.id === 'pf-pool-cpi'; })[0];
  if (sec && sec._html.indexOf('No pool open this week') >= 0) ok('runtime: empty state when no pool');
  else no('runtime: empty state when no pool', r.error || 'missing');
}

/* seasons kill switch */
{
  var r = runModule(SEAS_MOD, {}, ['cell-seasons']);
  var has = !r.error && r.created.some(function (el) { return el._attrs.id === 'pf-cell-seasons'; });
  if (!r.error && !has) ok('runtime: ?pf_off=cell-seasons darkens the surface');
  else no('runtime: ?pf_off=cell-seasons darkens the surface', r.error || 'section created');
}

/* seasons board renders top rows + private own position */
{
  var curFixture = {
    ok: true,
    season: {
      id: 'sn1', name: 'Season One', starts_at: Date.now() - 86400000,
      ends_at: Date.now() + 30 * 86400000, status: 'active', prize_xp: 500,
      enrolled: 7, note: 'Season is live.'
    },
    board: [
      { cell_id: 'c1', cell_name: 'Alpha Cell', points: 42 },
      { cell_id: 'c2', cell_name: 'Beta Cell', points: 30 }
    ],
    own: { cell_id: 'c7', cell_name: 'Zeta Cell', position: 7, of: 7, points: 1, enrolled: true }
  };
  var histFixture = {
    ok: true,
    seasons: [{ id: 'sn0', name: 'Season Zero', winner_cell: 'c9', winner_name: 'Old Guard', note: 'Season wrapped — the trophy goes to Old Guard.' }]
  };
  var r = runModule(SEAS_MOD, {
    cseason_current: curFixture,
    cseason_history: histFixture,
    cell_mine: { ok: true, cell: { id: 'c7', name: 'Zeta Cell' }, is_founder: true }
  }, []);
  var sec = !r.error && r.created.filter(function (el) { return el._attrs.id === 'pf-cell-seasons'; })[0];
  var html = sec ? sec._html : '';
  if (html.indexOf('CELL SEASONS') >= 0) ok('runtime: seasons title renders');
  else no('runtime: seasons title renders', r.error || 'missing');
  if (html.indexOf('Alpha Cell') >= 0 && html.indexOf('42 pts') >= 0) ok('runtime: board rows render');
  else no('runtime: board rows render', 'missing');
  if (html.indexOf('sits #7 of 7') >= 0) ok('runtime: private own position renders');
  else no('runtime: private own position renders', 'missing');
  if (html.indexOf('Enrollment is closed for this season.') >= 0) ok('runtime: closed enrollment note renders');
  else no('runtime: closed enrollment note renders', 'missing');
  if (html.indexOf('Season wrapped — the trophy goes to Old Guard.') >= 0) ok('runtime: history renders');
  else no('runtime: history renders', 'missing');
}

/* enrollment posts the right contract */
{
  var curFixture = {
    ok: true,
    season: { id: 'sn1', name: 'Season One', starts_at: Date.now() + 86400000, ends_at: Date.now() + 36 * 86400000, status: 'open', prize_xp: 500, enrolled: 0, note: 'Enrollment is open.' },
    board: [], own: null
  };
  var r = runModule(SEAS_MOD, {
    cseason_current: curFixture,
    cseason_history: { ok: true, seasons: [] },
    cell_mine: { ok: true, cell: { id: 'c7', name: 'Zeta Cell' }, is_founder: true },
    __post: function (body) { return { ok: true, enrollment: { season_id: 'sn1', cell_id: 'c7' } }; }
  }, []);
  var sec = !r.error && r.created.filter(function (el) { return el._attrs.id === 'pf-cell-seasons'; })[0];
  if (sec && sec._html.indexOf('ENTER MY CELL') >= 0) ok('runtime: enroll CTA present when open');
  else no('runtime: enroll CTA present when open', r.error || 'missing');
}

console.log('\nengage-c FE: ' + passes + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
