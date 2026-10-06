/* FE verify: cells-2.0 render smoke test (node DOM shim).
   Territory map + competition seasons: stage template, eval inner script,
   feed mock JSONP responses, assert rendered states.
   Run: node tests/cells-2.0.verify.mjs  (from the worktree root) */
import { readFileSync } from 'node:fs';

var passed = 0, failed = 0;
function ok(c, n) { if (c) passed++; else { failed++; console.error('FAIL: ' + n); } }

/* ---- DOM shim ---- */
var templates = {};
var scripts = [];
var pfState = { skipped: [], toasts: [] };
var skipAll = false;
function makeEl(tag) {
  var el = {
    tag: tag, innerHTML: '', textContent: '', style: {}, children: [],
    onerror: null, parentNode: { removeChild: function () {} },
    appendChild: function (c) { this.children.push(c); return c; },
    remove: function () {}, disabled: false, onclick: null,
    setAttribute: function () {}, focus: function () {}, select: function () {}
  };
  Object.defineProperty(el, 'src', {
    set: function (v) { scripts.push({ src: v, el: el }); },
    get: function () { return ''; }
  });
  return el;
}
global.document = {
  head: makeEl('head'), body: makeEl('body'),
  createElement: function (t) { return makeEl(t); },
  getElementById: function (id) {
    if (id === 'xTerritoryMap' || id === 'xCellCompSeasons') {
      if (!global.__host) global.__host = makeEl('div');
      return global.__host;
    }
    return null;
  }
};
global.window = global;
global.Intl = Intl;
global.setInterval = function () { return 0; };
global.clearInterval = function () {};
global.setTimeout = function () { return 0; };
global.PFCallsign = function () { return 'alice'; };
global.PFDeviceId = function () { return 'dev1'; };
global.PF = {
  skip: function (k) { pfState.skipped.push(k); return skipAll; },
  holder: function () {
    return { insertAdjacentHTML: function (pos, html) { templates.staged = html; } };
  },
  toast: function (m) { pfState.toasts.push(m); },
  hidden: function () { return true; }
};
global.PF_BACKEND_URL = 'https://api.example.test/';

function loadModule(file) {
  templates = {}; scripts = []; global.__host = null;
  var src = readFileSync(new URL(file, import.meta.url), 'utf8');
  eval(src);
  var inner = /<script>([\s\S]*?)<\/script>/.exec(templates.staged || '');
  ok(!!inner, file + ': inner script extractable from staged template');
  if (inner) eval(inner[1]);
  return src;
}
function respondTo(action, j) {
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf('action=' + action) !== -1 && !scripts[i].done) {
      scripts[i].done = true;
      var m = /callback=([^&]+)/.exec(scripts[i].src);
      var fn = decodeURIComponent(m[1]);
      global[fn](j);
      delete global[fn];
      return true;
    }
  }
  return false;
}

/* ================= TERRITORY MAP ================= */
console.log('-- territory map --');
loadModule('../v1.4.3/games/cell-territory-map.js');
ok(templates.staged && templates.staged.indexOf('pf-ov-territory-map') !== -1, 'template staged with pf-ov-territory-map id');
ok(pfState.skipped.indexOf('cell-territory-map') !== -1, 'kill switch checked (PF.skip cell-territory-map)');
ok(respondTo('territory_map_status', null) || scripts.length > 0, 'territory_map_status JSONP requested on load');

/* state 1: live map, 3 claimed states + mine */
global.__host = null; templates = {}; scripts = [];
loadModule('../v1.4.3/games/cell-territory-map.js');
ok(respondTo('territory_map_status', {
  ok: true, week_id: '2026-10-05',
  regions: [
    { state: 'TX', cell_id: 'cellA', cell_name: 'Lone Star Cell', points: 128 },
    { state: 'CA', cell_id: 'cellB', cell_name: 'Golden Cell', points: 96 },
    { state: 'NY', cell_id: 'cellC', cell_name: 'Empire Cell', points: 64 }
  ],
  mine: { state: 'TX', cell_id: 'cellA' }
}), 'territory response delivered');
var h1 = global.__host.innerHTML;
var rects = (h1.match(/<rect /g) || []).length;
ok(rects === 51, '51 state tiles rendered (got ' + rects + ')');
var gray = (h1.match(/fill="#3a3a3a"/g) || []).length;
ok(gray === 48, '48 unclaimed states neutral gray (got ' + gray + ')');
ok(h1.indexOf('Lone Star Cell') !== -1 && h1.indexOf('Golden Cell') !== -1, 'legend lists leading cells');
ok(h1.indexOf('MY CELL') !== -1, 'MY CELL highlight on viewer cell');
ok(h1.indexOf('stroke="#ffd700"') !== -1, 'gold highlight stroke on my-cell tile');
ok(h1.indexOf('WEEK OF 2026-10-05') !== -1, 'week line rendered');
ok(h1.indexOf('never XP') !== -1, 'honorific never-XP copy present');
ok(h1.indexOf('alice') === -1, 'no user-level data (callsign) in output');

/* state 2: offline backend -> fail-soft */
global.__host = null; templates = {}; scripts = [];
loadModule('../v1.4.3/games/cell-territory-map.js');
respondTo('territory_map_status', null);
var h2 = global.__host.innerHTML;
ok(h2.indexOf('offline right now') !== -1, 'offline state rendered fail-soft');

/* state 3: empty week -> all gray + honest copy */
global.__host = null; templates = {}; scripts = [];
loadModule('../v1.4.3/games/cell-territory-map.js');
respondTo('territory_map_status', { ok: true, week_id: '2026-10-05', regions: [], mine: null });
var h3 = global.__host.innerHTML;
ok(h3.indexOf('No territory claimed yet') !== -1, 'empty-week honest state');

/* ================= COMPETITION SEASONS ================= */
console.log('-- competition seasons --');
global.__host = null; templates = {}; scripts = [];
loadModule('../v1.4.3/games/cell-comp-seasons.js');
ok(templates.staged && templates.staged.indexOf('pf-ov-cellcomp-seasons') !== -1, 'template staged with pf-ov-cellcomp-seasons id');
ok(pfState.skipped.indexOf('cell-comp-seasons') !== -1, 'kill switch checked (PF.skip cell-comp-seasons)');
var gotStatus = scripts.some(function (s) { return s.src.indexOf('action=cellcomp_season_status') !== -1; });
var gotHist = scripts.some(function (s) { return s.src.indexOf('action=cellcomp_season_history') !== -1; });
ok(gotStatus && gotHist, 'both season actions requested on load');

/* state 1: live season + one sealed season */
ok(respondTo('cellcomp_season_status', {
  ok: true, season_id: '2026-10-05', week_no: 2, weeks_total: 4,
  metrics: [{
    metric: 'weekly_checkins',
    rows: [
      { cell_id: 'c1', cell_name: 'Alpha Cell', weekly_wins: 3, total_cnt: 120 },
      { cell_id: 'c2', cell_name: 'Beta Cell', weekly_wins: 2, total_cnt: 150 }
    ]
  }]
}), 'season status delivered');
ok(respondTo('cellcomp_season_history', {
  ok: true,
  seasons: [{ season_id: '2026-09-07', champion_cell_id: 'c9', champion_cell_name: 'Old Guard', sealed_at: 1759363200 }]
}), 'season history delivered');
var s1 = global.__host.innerHTML;
ok(s1.indexOf('WEEK 2 OF 4') !== -1, 'season progress week 2 of 4');
ok(s1.indexOf('WEEKLY CHECKINS') !== -1, 'per-metric standings header');
ok(s1.indexOf('Alpha Cell') !== -1 && s1.indexOf('Beta Cell') !== -1, 'standings rows rendered');
ok(s1.indexOf('Alpha Cell') < s1.indexOf('Beta Cell'), 'leader (weekly wins) ranked first');
ok(s1.indexOf('SEASON PTS') !== -1, 'weekly-win season points labeled');
ok(s1.indexOf('tiebreak') !== -1, 'tiebreak totals labeled');
ok(s1.indexOf('Old Guard') !== -1, 'past champion rendered from history');
ok(s1.indexOf('never mint XP') !== -1, 'zero-XP honorific copy present');

/* state 2: both reads fail -> fail-soft */
global.__host = null; templates = {}; scripts = [];
loadModule('../v1.4.3/games/cell-comp-seasons.js');
respondTo('cellcomp_season_status', null);
respondTo('cellcomp_season_history', null);
var s2 = global.__host.innerHTML;
ok(s2.indexOf('offline right now') !== -1, 'seasons offline state rendered fail-soft');

/* state 3: kill switch suppresses the module entirely */
skipAll = true; templates = {}; scripts = [];
var ksrc = readFileSync(new URL('../v1.4.3/games/cell-territory-map.js', import.meta.url), 'utf8');
eval(ksrc);
ok(!templates.staged, 'kill switch: module stages nothing when PF.skip true');
skipAll = false;

console.log('\ncells-2.0 render smoke: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
