#!/usr/bin/env node
/* scripts/verify-cell-dash-eco-fe.js — Cell Dashboard Ecosystem frontend verification.
   Run from the repo root: node scripts/verify-cell-dash-eco-fe.js
   1. node --check on the touched silos + rebuilt bundles
   2. Static checks: governance card wiring, data-bounty card + surge markers,
      rally handoffs, cell-id publish, zero new XP, banned terms
   3. Mocked-browser runtime tests (vm + DOM shim): pf:cell-ready publish,
      governance card render (open votes, vote CTA, hidden when empty),
      data-bounty card render (cell-targeted only, gold surge marker),
      war/treasury handoff divs present.
*/
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

var HQ = 'v1.4.3/games/cell-hq.js';
var DB = 'v1.4.3/games/data-bounties.js';

console.log('== 1. node --check ==');
[HQ, DB, 'v1.4.3/games/bundle-cells.js', 'v1.4.3/games/bundle-create.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var hq = read(HQ), db = read(DB);
var hqBare = stripComments(hq), dbBare = stripComments(db);

if (/proposal_list:1/.test(hq) && /databounty_list:1/.test(hq)) ok('READ map: proposal_list + databounty_list');
else no('READ map', 'proposal_list/databounty_list missing from cell-hq READ map');
if (/hqGovCard/.test(hq) && /hqDbCard/.test(hq) && /paintGovCard/.test(hq) && /paintDbCard/.test(hq))
  ok('governance + data-bounty cards wired into renderMine');
else no('cards', 'hqGovCard/hqDbCard placeholders or painters missing');
if (/\/governance#gv-prop-/.test(hq)) ok('vote CTA deep-links to /governance#gv-prop-<id>');
else no('vote CTA', 'governance card vote CTA missing');
if (/hqSurgeTag/.test(hq) && /hq-surge/.test(hq)) ok('gold surge marker helper in cell-hq (hqSurgeTag/.hq-surge)');
else no('surge helper', 'hqSurgeTag missing from cell-hq.js');
if (/data-pf-handoff=\\"share-intel\\"/.test(hq) || /data-pf-handoff="share-intel"/.test(hq))
  ok('rally handoffs present in cell-hq (share-intel)');
else no('handoffs', 'no share-intel handoff in cell-hq.js');
if (/data-pf-handoff="report-back"/.test(hq)) ok('report-back handoff in cell-hq (treasury)');
else no('report-back', 'treasury report-back handoff missing');
if (/PFCellPrimaryId/.test(hq) && /pf:cell-ready/.test(hq)) ok('primary cell id published (PFCellPrimaryId + pf:cell-ready)');
else no('cell publish', 'cell-id publish missing from cell-hq.js');
if (!/xpGrant/.test(hqBare)) ok('zero new XP: cell-hq adds no XP grants');
else no('xp', 'unexpected xpGrant in cell-hq.js');
if (!/donate/i.test(hqBare)) ok('no "donate" copy in cell-hq');
else no('banned term', '"donate" appears in cell-hq copy');
if (/surgeTag\(b\)/.test(db) && /pf-db-cellstrip/.test(db)) ok('data-bounties: surge marker in cell strip');
else no('strip surge', 'strip surgeTag(b) missing');
if (/PFCellPrimaryId/.test(db) && /pf:cell-ready/.test(db)) ok('data-bounties: cell-scoped list + re-scope listener');
else no('strip scope', 'cell scoping missing from data-bounties.js');
if (/Cell data bounties/i.test(db) || /CELL DATA BOUNTIES/.test(db)) ok('strip header copy present');
else no('strip copy', 'CELL DATA BOUNTIES header missing');
if (read('v1.4.3/games/bundle-cells.js').indexOf('hqGovCard') !== -1)
  ok('bundle-cells.js contains the new HQ code');
else no('bundle-cells', 'rebuilt bundle missing hqGovCard');
if (read('v1.4.3/games/bundle-create.js').indexOf('pf-db-cellstrip') !== -1)
  ok('bundle-create.js contains the strip code');
else no('bundle-create', 'rebuilt bundle missing pf-db-cellstrip');

console.log('== 3. runtime (vm + DOM shim) ==');
/* Minimal DOM: innerHTML setter registers id="..." stubs so
   getElementById works after a render. */
function makeEnv() {
  var els = {};
  function registerIds(html, host) {
    var re = /id="([a-zA-Z0-9_-]+)"/g, m;
    while ((m = re.exec(html))) {
      if (!els[m[1]]) els[m[1]] = mkEl(m[1]);
    }
  }
  function mkEl(id) {
    var el = {
      id: id || '', children: [], _html: '', textContent: '', style: {},
      dataset: {}, className: '', _listeners: {},
      classList: { contains: function () { return false; }, add: function () {}, toggle: function () {} },
      appendChild: function (c) { this.children.push(c); return c; },
      insertBefore: function (c) { this.children.unshift(c); registerIds(c._html || '', c); return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function (t, f) { this._listeners[t] = f; },
      removeEventListener: function () {},
      setAttribute: function () {}, getAttribute: function () { return null; },
      closest: function () { return null; }
    };
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._html; },
      set: function (v) { this._html = String(v); registerIds(this._html, this); }
    });
    if (id) els[id] = el;
    return el;
  }
  var jsonpHandlers = {};
  var doc = {
    _els: els,
    _dispatched: [],
    getElementById: function (id) { return els[id] || null; },
    createElement: function (tag) {
      if (tag === 'script') {
        var el = mkEl('');
        var srcVal = '';
        Object.defineProperty(el, 'src', {
          get: function () { return srcVal; },
          set: function (u) {
            srcVal = u;
            var m = /[?&]action=([^&]+)/.exec(u);
            var cbm = /[?&]callback=([^&]+)/.exec(u);
            var action = m && decodeURIComponent(m[1]);
            var fn = cbm && cbm[1];
            var h = jsonpHandlers[action];
            if (h && fn && win[fn]) { try { win[fn](h(u)); } catch (e) {} }
            else if (fn && win[fn]) { try { win[fn](null); } catch (e) {} }
          }
        });
        el.onerror = null;
        return el;
      }
      return mkEl('');
    },
    createEvent: function () { return { initEvent: function () {} }; },
    addEventListener: function (t, f) { (this._listeners = this._listeners || {})[t] = f; },
    dispatchEvent: function (ev) { this._dispatched.push(ev); return true; },
    head: null, body: null
  };
  doc.head = mkEl('head'); doc.body = mkEl('body');
  var win = {
    document: doc,
    location: { href: 'https://www.mtcstw.com/cells' },
    PF: {
      skip: function () { return false; },
      toast: function () {}, error: function () {},
      postAction: null, getAuthSecret: function () { return ''; },
      holder: function () { return doc.body; }
    },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev/',
    PFCallsign: function () { return 'tester1'; },
    PFDeviceId: function () { return 'dev1'; },
    CustomEvent: function (t, o) { this.type = t; this.detail = (o && o.detail) || {}; },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    JSON: JSON, Math: Math, Date: Date, Number: Number, String: String,
    Array: Array, Object: Object, RegExp: RegExp, Error: Error,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent
  };
  win.window = win;
  return { win: win, doc: doc, mkEl: mkEl, jsonpHandlers: jsonpHandlers };
}

function cannedMine() {
  return { ok: true, in_cell: true, is_founder: true, checked_today: false,
    cell: { id: 'cellA', name: 'Test Cell', streak: 3, members: 4, active_week: 3 },
    members: [] };
}
function cannedGov() {
  return { ok: true, proposals: [
    { id: 'prop-1', title: 'Fund the flyer run', description: 'd', proposer: 'boss1',
      created_at: Date.now() - 1000, closes_at: Date.now() + 2 * 86400000,
      status: 'open', result: null, yes_weight: 12, no_weight: 3, voter_count: 5 },
    { id: 'prop-0', title: 'Old business', description: 'd', proposer: 'boss1',
      created_at: Date.now() - 90000000, closes_at: Date.now() - 1000,
      status: 'closed', result: 'passed', yes_weight: 20, no_weight: 1, voter_count: 8 }
  ] };
}
function cannedBounties() {
  return { ok: true, bounties: [
    { id: 'b1', kind: 'cpi_price', title: 'Milk price — gulf', xp_amount: 5,
      cell_id: 'cellA', quorum: 2, surge: 1.5, claims: [] },
    { id: 'b2', kind: 'photo_evidence', title: 'Rally photo', xp_amount: 10,
      cell_id: '', quorum: 2, surge: 1, claims: [] },
    { id: 'b3', kind: 'review_needed', title: 'Other cell target', xp_amount: 15,
      cell_id: 'cellZ', quorum: 2, surge: 2, claims: [] }
  ] };
}

(function runtime() {
  var env = makeEnv();
  env.mkEl('pf-cell-hq');
  env.jsonpHandlers.cell_mine = cannedMine;
  env.jsonpHandlers.proposal_list = cannedGov;
  env.jsonpHandlers.databounty_list = cannedBounties;
  var ctx = vm.createContext(env.win);
  try {
    vm.runInContext(read(HQ), ctx, { filename: 'cell-hq.js' });
  } catch (e) { no('mount', 'cell-hq threw on mount: ' + e.message); return; }
  ok('cell-hq mounts without throwing');
  if (env.win.PFCellPrimaryId === 'cellA') ok('PFCellPrimaryId published = cellA');
  else no('cell publish', 'PFCellPrimaryId = ' + env.win.PFCellPrimaryId);
  if (env.doc._dispatched.length > 0) ok('pf:cell-ready dispatched');
  else no('cell-ready', 'no event dispatched on document');

  var gov = env.doc.getElementById('hqGovCard');
  var govHtml = gov ? gov.innerHTML : '';
  if (/Fund the flyer run/.test(govHtml)) ok('gov card lists the open proposal');
  else no('gov card', 'open proposal title missing: ' + govHtml.slice(0, 120));
  if (/Old business/.test(govHtml)) no('gov card', 'closed proposal leaked into open list');
  else ok('gov card hides closed proposals');
  if (/\/governance#gv-prop-prop-1/.test(govHtml) && /VOTE/.test(govHtml)) ok('gov card vote CTA -> /governance#gv-prop-prop-1');
  else no('gov vote CTA', 'vote CTA link missing');
  if (/YES 12/.test(govHtml) && /NO 3/.test(govHtml)) ok('gov card shows yes/no weights');
  else no('gov weights', 'tally weights missing');
  if (/data-pf-handoff="share-intel"/.test(govHtml)) ok('gov card carries share-intel handoff');
  else no('gov handoff', 'share-intel missing from gov card');

  var db = env.doc.getElementById('hqDbCard');
  var dbHtml = db ? db.innerHTML : '';
  if (/Milk price/.test(dbHtml)) ok('bounty card lists the cell-targeted bounty');
  else no('bounty card', 'cell-targeted bounty missing: ' + dbHtml.slice(0, 120));
  if (/Other cell target/.test(dbHtml) || /Rally photo/.test(dbHtml))
    no('bounty card', 'non-cell bounties leaked into the cell card');
  else ok('bounty card excludes global/other-cell bounties');
  if (/SURGE/.test(dbHtml) && /hq-surge/.test(dbHtml)) ok('gold surge marker renders in the cell card');
  else no('surge marker', 'hq-surge marker missing from bounty card');
  if (/\/create\?tab=bounties/.test(dbHtml)) ok('bounty card links to the bounty board');
  else no('bounty CTA', 'board link missing');

  /* empty states: cards hide themselves */
  var env2 = makeEnv();
  env2.mkEl('pf-cell-hq');
  env2.jsonpHandlers.cell_mine = cannedMine;
  env2.jsonpHandlers.proposal_list = function () { return { ok: true, proposals: [] }; };
  env2.jsonpHandlers.databounty_list = function () { return { ok: true, bounties: [] }; };
  var ctx2 = vm.createContext(env2.win);
  vm.runInContext(read(HQ), ctx2, { filename: 'cell-hq.js' });
  var g2 = env2.doc.getElementById('hqGovCard'), d2 = env2.doc.getElementById('hqDbCard');
  if (g2 && g2.style.display === 'none') ok('gov card hides when no open proposals');
  else no('gov empty', 'gov card did not hide');
  if (d2 && d2.style.display === 'none') ok('bounty card hides when no cell bounties');
  else no('bounty empty', 'bounty card did not hide');

  /* war tab + treasury handoffs are in the renderers (static assert above);
     spot-check the war paint path via source: standings card keeps its id. */
  if (/hqWarBody/.test(read(HQ))) ok('war tab body intact');
  else no('war tab', 'hqWarBody missing');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { fails.forEach(function (f) { console.log('FAILED: ' + f); }); process.exit(1); }
