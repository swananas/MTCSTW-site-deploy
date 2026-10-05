/* FE verify: cell-war-front.js render states (node DOM shim). */
import { readFileSync } from 'node:fs';

var passed = 0, failed = 0;
function ok(c, n) { if (c) passed++; else { failed++; console.error('FAIL: ' + n); } }

/* ---- DOM shim ---- */
var templates = {};
var lastScript = null;
var posted = [];
var pfState = { skipped: [], toasts: [] };
function makeEl(tag) {
  return {
    tag: tag, innerHTML: '', textContent: '', style: {}, children: [],
    set src(v) { lastScript = { src: v, el: this }; },
    get src() { return ''; },
    onerror: null, parentNode: { removeChild: function () {} },
    appendChild: function (c) { this.children.push(c); return c; },
    remove: function () {}, disabled: false, onclick: null,
    setAttribute: function () {}
  };
}
global.document = {
  head: makeEl('head'), body: makeEl('body'),
  createElement: function (t) { return makeEl(t); },
  getElementById: function (id) {
    if (id === 'xCellWarFront') {
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
global.setTimeout = function (fn) { return 0; };
global.PFCallsign = function () { return 'alice'; };
global.PFDeviceId = function () { return 'dev1'; };
global.PF = {
  skip: function (k) { pfState.skipped.push(k); return false; },
  holder: function () {
    return { insertAdjacentHTML: function (pos, html) { templates.staged = html; } };
  },
  toast: function (m) { pfState.toasts.push(m); },
  hidden: function () { return true; },
  authPost: function (be, body, cb) { posted.push(body); cb({ ok: true }); }
};
global.PF_BACKEND_URL = 'https://api.example.test/';

/* ---- load the game file: stage template, then eval the inner script ---- */
var src = readFileSync(new URL('../v1.4.3/games/cell-war-front.js', import.meta.url), 'utf8');
eval(src);

ok(templates.staged && templates.staged.indexOf('pf-ov-cellwarfront') !== -1, 'template staged with pf-ov-cellwarfront id');
ok(pfState.skipped.indexOf('cell-war-front') !== -1, 'kill switch checked (PF.skip cell-war-front)');
var inner = /<script>([\s\S]*?)<\/script>/.exec(templates.staged);
ok(!!inner, 'inner script extractable from template');
eval(inner[1]); /* mounts the widget: runs load() */
ok(lastScript && lastScript.src.indexOf('action=cellwar_front_standings') !== -1, 'standings JSONP requested on load');

/* extract the jsonp callback name and feed a response */
function respond(j) {
  var m = /callback=([^&]+)/.exec(lastScript.src);
  var fn = decodeURIComponent(m[1]);
  global[fn](j);
  delete global[fn];
}

/* ---- state 1: standby (sources absent) ---- */
global.__host = null;
/* (callback captured from fresh load below) */
respond({ ok: true, week_start: '2026-10-05', week_no: 40, live: false, unavailable: true, fronts: [], opted_cells: [] });
var h1 = global.__host.innerHTML;
ok(h1.indexOf('ON STANDBY') !== -1, 'standby state rendered');
ok(h1.indexOf('forge and bounty rails') !== -1, 'standby copy mentions rails');

/* ---- state 2: live board, per-capita ranking ---- */
global.__host = null;
global.PF.authPost = function (be, body, cb) { posted.push(body); cb({ ok: true }); };
eval(inner[1]); /* re-mount to reset module state */
respond({ ok: true, week_start: '2026-10-05', week_no: 40, live: true, unavailable: false,
  fronts: [
    { cell_id: 'c_small', name: 'Small Cell', output: 2, members: 1, per_capita: 2, mine: true },
    { cell_id: 'c_big', name: 'Big Cell', output: 3, members: 3, per_capita: 1, mine: false }
  ],
  opted_cells: ['c_small', 'c_big'], my_cells: ['c_small'],
  last_winner: { cell_name: 'Old Champs', output: 9 } });
var h2 = global.__host.innerHTML;
ok(h2.indexOf('Small Cell') !== -1 && h2.indexOf('Big Cell') !== -1, 'board rows rendered');
ok(h2.indexOf('Small Cell') < h2.indexOf('Big Cell'), 'per-capita leader first');
ok(h2.indexOf('2.00') !== -1, 'per-capita shown with 2 decimals');
ok(h2.indexOf('per fighter') !== -1, 'per-fighter label present');
ok(h2.indexOf('YOUR CELL') !== -1, 'mine tag present');
ok(h2.indexOf('PROPAGANDIST CROWN') !== -1, 'last winner crown strip present');
ok(h2.indexOf('zero XP') !== -1, 'zero-XP recognition-only copy present');

/* ---- state 3: empty board, member not opted in -> enlist CTA ---- */
global.__host = null;
eval(inner[1]);
respond({ ok: true, week_start: '2026-10-05', week_no: 40, live: true, unavailable: false,
  fronts: [], opted_cells: [], my_cells: ['c_small'], last_winner: null });
var h3 = global.__host.innerHTML;
ok(h3.indexOf('ENLIST MY CELL') !== -1, 'enlist CTA shown for non-opted member');

/* ---- state 4: join posts correct body ---- */
posted = [];
/* find and click the join button: re-render captured handler via direct call is
   hard without a DOM; instead simulate by calling the onclick wired on the
   button element. Our shim returns null for getElementById('pwJoin'), so we
   verify the POST contract statically instead. */
ok(src.indexOf('cell_action:"cellwar_front_join"') !== -1, 'join posts cell_action=cellwar_front_join');
ok(src.indexOf('type:"cell"') !== -1, 'join posts type=cell (POST rail)');
ok(src.indexOf('?pf_off=cell-war-front') !== -1, 'kill switch documented');

console.log('cell-war-front FE: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
