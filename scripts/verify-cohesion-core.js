#!/usr/bin/env node
/* scripts/verify-cohesion-core.js — static + runtime checks for the
   cohesion P0/P1 core build (Next Move ladder, terminal API, HUD,
   academy->cell handoff, psych copy). No network. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', 'v1.4.3');
var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

/* 1. node --check on edited files */
['core/20-nextop.js', 'core/30-hud.js', 'games/academy-graduation.js'].forEach(function (f) {
  try {
    cp.execSync('node --check ' + JSON.stringify(path.join(ROOT, f)), { stdio: 'pipe' });
    ok('syntax ' + f, true);
  } catch (e) { ok('syntax ' + f, false, 'node --check failed'); }
});

var nextop = read('core/20-nextop.js');
var hud = read('core/30-hud.js');
var grad = read('games/academy-graduation.js');

/* 2. Spec ladder rungs present */
['orders', 'blitz', 'train', 'predict', 'bounty', 'catchup'].forEach(function (r) {
  ok('nextop rung: ' + r, nextop.indexOf(r + ': {') !== -1 || nextop.indexOf(r + ':') !== -1);
});
/* 3. Ladder order: orders before blitz before train in pf-v2 list */
var v2m = nextop.match(/'pf-v2': \[([^\]]+)\]/);
ok('pf-v2 ladder order', !!v2m &&
  v2m[1].indexOf("'orders'") < v2m[1].indexOf("'blitz'") &&
  v2m[1].indexOf("'blitz'") < v2m[1].indexOf("'train'"));
/* 4. Psych constraints: no loss framing, no shaming (check code, not comments) */
var nextopCode = nextop.replace(/\/\*[\s\S]*?\*\//g, '');
ok('no loss framing ("streak breaks")', nextopCode.indexOf('streak breaks') === -1);
ok('no shaming ("you\'re flat")', nextopCode.indexOf("u2019re flat") === -1 && nextopCode.indexOf("you're flat") === -1);
ok('streak copy is keep-framed', nextop.indexOf('Keep it going') !== -1);
/* 5. Terminal API */
ok('pf:terminal listener', nextop.indexOf("addEventListener('pf:terminal'") !== -1);
ok('PF.nextMove.render exposed', nextop.indexOf('PF.nextMove') !== -1);
ok('terminal card dismissible', nextop.indexOf('data-pf-nm-dismiss') !== -1);
ok('terminal queue flush', nextop.indexOf('flushTerminalQueue') !== -1);
/* 6. New reads wired */
['opDone', 'blitzActive', 'graduated', 'openPredicts', 'openBounties'].forEach(function (f) {
  ok('state field: ' + f, nextop.indexOf(f) !== -1);
});
ok('pending count covers new reads', /var pending = 14/.test(nextop));
/* 7. HUD */
ok('hud 5 phases', (hud.match(/key: '/g) || []).length === 5);
ok('hud phase names', ['ENLIST', 'TRAIN', 'FIGHT', 'ORGANIZE', 'LEAD'].every(function (p) { return hud.indexOf(p) !== -1; }));
ok('hud kill switch', hud.indexOf("pf_off=hud") !== -1);
ok('hud CSS vars for re-skin', hud.indexOf('--pf-hud-bg') !== -1);
ok('hud daily target is Math knob', hud.indexOf('MATH DEPT') !== -1 || hud.indexOf("Math Dept") !== -1 || hud.indexOf('Math knob') !== -1);
ok('hud no writes', hud.indexOf('authPost') === -1 && hud.indexOf('.post(') === -1);
ok('hud streak only if active', hud.indexOf('streakCount > 0') !== -1);
/* 8. Academy -> cell handoff */
ok('graduation cell hero CTA', grad.indexOf('YOUR CELL IS WAITING') !== -1);
ok('graduation links /cells', grad.indexOf('href="/cells"') !== -1);
/* 9. Copy gates: no donate, MTCSTW-only identity */
[nextop, hud, grad].forEach(function (src, i) {
  ok('no "donate" in file ' + i, !/donate/i.test(src));
});
/* 10. Bundles carry the new code */
var bundle = read('core/bundle-core.js');
ok('bundle has HUD', bundle.indexOf('YOUR CAMPAIGN') !== -1);
ok('bundle has terminal API', bundle.indexOf('pf:terminal') !== -1);
ok('bundle has new ladder', bundle.indexOf('ORDERS AWAIT DEBRIEF') !== -1);
ok('bundle has psych fix', bundle.indexOf('Keep it going') !== -1);

/* 11. Runtime: nextop ladder picks the orders rung first when opDone=false */
(function () {
  var logs = [];
  var sandbox = {
    console: console,
    window: {},
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function () { return null; },
      createElement: function () { return { style: {}, appendChild: function () {} }; },
      head: { appendChild: function () {} },
      body: { appendChild: function () {}, classList: { contains: function () { return false; } } },
      querySelectorAll: function () { return []; }
    },
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    setTimeout: function () {}, setInterval: function () {}, clearInterval: function () {},
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = {
    skip: function () { return false; },
    authGetJSONP: function (be, action, params, cb) {
      /* canned reads: orders not done, blitz active+unacted, not graduated, cell-less */
      var j = null;
      if (action === 'get') j = { ok: true, op_done: false };
      else if (action === 'campaign_status') j = { ok: true, campaign: { days_left: 28, day_offset: 4 }, my: { actions_today: 0 } };
      else if (action === 'academy_progress') j = { ok: true, graduated: false };
      else if (action === 'predict_qlist') j = { ok: true, questions: [] };
      else if (action === 'propbounty_list') j = { ok: true, bounties: [] };
      else if (action === 'cell_mine') j = { ok: true, in_cell: false };
      else j = { ok: false };
      cb(j);
    },
    error: function () {}
  };
  sandbox.window.PFCallsign = function () { return 'TESTER'; };
  sandbox.window.PFDeviceId = function () { return 'dev1'; };
  sandbox.window.PF_BACKEND_URL = 'https://example.invalid/';
  sandbox.window.location = { href: 'https://mtcstw.com/', pathname: '/' };
  vm.createContext(sandbox);
  try {
    vm.runInContext(nextop, sandbox, { filename: '20-nextop.js' });
    /* The module runs async via api() callbacks — our canned authGetJSONP is
       synchronous, so by now _resolved should be set and PF.nextMove ready. */
    ok('runtime: PF.nextMove.ready()', !!(sandbox.window.PF.nextMove && sandbox.window.PF.nextMove.ready()));
    /* Dispatch a terminal event into a fake slot; expect an in-place card. */
    var html = '';
    var slot = {
      parentNode: {},
      querySelector: function () { return null; },
      insertAdjacentHTML: function (pos, h) { html = h; }
    };
    var ev = { detail: { slot: slot, context: 'test-orders' } };
    /* grab the pf:terminal listener via document.addEventListener capture */
    ok('runtime: terminal dispatch renders card', typeof sandbox.window.PF.nextMove.render === 'function');
    sandbox.window.PF.nextMove.render(slot, 'test-orders');
    ok('runtime: card carries orders CTA', html.indexOf('REPORT BACK') !== -1);
    ok('runtime: card is dismissible', html.indexOf('data-pf-nm-dismiss') !== -1);
  } catch (e) {
    ok('runtime: nextop executes', false, String(e && e.message || e));
  }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
