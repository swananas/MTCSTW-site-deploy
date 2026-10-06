#!/usr/bin/env node
/* scripts/verify-ux-create-loop.js — UX COMBINATION PLAY 1 (fe/ux-create-loop).
   Behavioral + static checks for games/create-loop.js. All must pass.
   Run: node scripts/verify-ux-create-loop.js   (exit 0 = all green) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'v1.4.3', 'games', 'create-loop.js');
const BUNDLE_CFG = path.join(ROOT, 'build', 'bundle.js');
const BUNDLE_OUT = path.join(ROOT, 'v1.4.3', 'games', 'bundle-create.js');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  — ' + extra : '')); }
}

const src = fs.readFileSync(SRC, 'utf8');
const cfg = fs.readFileSync(BUNDLE_CFG, 'utf8');
const bundleOut = fs.existsSync(BUNDLE_OUT) ? fs.readFileSync(BUNDLE_OUT, 'utf8') : '';

console.log('\n== static ==');
check('module file exists', src.length > 1000);
check('kill switch ?pf_off=createloop honored at boot', /PF\.skip\(['"]createloop['"]\)/.test(src));
check('SHARE THIS INTEL button', src.includes('SHARE THIS INTEL'));
check('SUBMIT AS DAILY ORDER button', src.includes('SUBMIT AS DAILY ORDER'));
check('RALLY YOUR CELL button', src.includes('RALLY YOUR CELL'));
check('routes share through existing PFShare.shareImage pipeline',
  src.includes('PFShare.shareImage') && /typeof window\.PFShare\.shareImage/.test(src));
check('no NEW share plumbing invented (no navigator.share in code)',
  !src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').includes('navigator.share'));
check('order candidates queue device-locally (pf_createorder_queue_v1)',
  src.includes('pf_createorder_queue_v1'));
check('queue has TODO: no backend Daily Order endpoint invented',
  /TODO\(backend\): no Daily Order candidate endpoint exists/.test(src));
check('does NOT invent a backend order contract (no order_candidate/order_submit POST)',
  !/order_candidate|order_submit|['"]type['"]\s*:\s*['"]order/.test(src));
check('rally uses existing cell_mine read', src.includes('cell_mine'));
check('rally documents the gap (no cell-feed post contract; PFCellPrimaryId absent)',
  src.includes('window.PFCellPrimaryId does not exist'));
check('zero new XP: no XP-granting calls', !/\b(xpGrant|claimDayXp|awardXp|grantXp|PF\.dope\.xpFloat)\b/.test(src));
check('zero new currencies: no currency/token minting', !/\b(mint|currency|token_mint)\b/i.test(src.replace(/citation token|token\b/gi, '')));
check('fail-open: share infra missing -> button hides, no throw',
  /if\s*\(\s*shareOK\(\)\s*\)/.test(src) && /if \(!cv \|\| !shareOK\(\)\) return false/.test(src));
check('fail-open: rally hidden unless cell_mine confirms membership',
  /if \(!rallyCell \|\| !shareOK\(\)/.test(src));
check('reuses branded components: no new <style> injected, no CSS redefined',
  !src.includes('createElement(\'style\')') && !src.includes('createElement("style")'));
check('reuses forge .p-btn family', /className = 'p-btn/.test(src) || src.includes("className = 'p-btn'"));
check('build config registers create-loop.js', cfg.includes("'create-loop.js'"));
check('built bundle-create.js ships the module', bundleOut.includes('pf-create-loop') && bundleOut.includes('SHARE THIS INTEL'));

/* ---------------- behavioral harness ---------------- */
console.log('\n== behavioral ==');

function makeEnv(opts) {
  opts = opts || {};
  const toasts = [];
  const shares = [];
  const inserted = [];
  const observers = [];
  const local = { store: {}, getItem(k) { return this.store[k] == null ? null : this.store[k]; },
    setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } };
  function mkEl(tag) {
    return {
      tagName: tag, children: [], style: {}, attributes: {}, parentNode: null,
      className: '', id: '', textContent: '', value: '', onclick: null, src: '',
      appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
      insertBefore(n, ref) { inserted.push({ bar: n, ref: ref, parent: this }); n.parentNode = this; return n; },
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      addEventListener() {}, remove() {}
    };
  }
  const row = mkEl('div'); row.className = 'p-row';
  const poster = mkEl('div'); poster.id = 'pf-poster';
  const battle = mkEl('button'); battle.id = 'pBattle';
  battle.closest = function (sel) { return sel === '#pf-poster' ? poster : (sel === '.p-row' ? row : null); };
  const rowParent = mkEl('div'); row.parentNode = rowParent; row.nextSibling = null;
  const canvas = { width: 1080, height: 1350, getContext() { return { drawImage() {} }; } };
  const byId = { pBattle: battle, pCanvas: canvas, pTop: Object.assign(mkEl('input'), { value: 'TEST HEADLINE' }) };
  if (opts.noForge) delete byId.pBattle;
  const head = mkEl('head');
  const scriptHooks = [];
  const document = {
    documentElement: mkEl('html'), head: head, body: mkEl('body'),
    getElementById(id) { return byId[id] || null; },
    createElement(tag) {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext() { return { drawImage() {} }; },
          toDataURL() { return 'data:image/jpeg;base64,FAKE'; } };
      }
      if (tag === 'script') {
        const s = mkEl('script');
        let _src = '';
        Object.defineProperty(s, 'src', {
          get() { return _src; },
          set(v) {
            _src = v; scriptHooks.push(v);
            const m = /callback=([^&]+)/.exec(String(v));
            if (m && sandbox.window[m[1]] && opts.cellMine !== 'defer') {
              sandbox.window[m[1]](opts.cellMine === 'member'
                ? { ok: true, in_cell: true, cell: { id: 'c9', name: 'RED DAWN' } }
                : { ok: true });
            }
          }
        });
        return s;
      }
      return mkEl(tag);
    },
    addEventListener() {}
  };
  const killed = !!opts.killed;
  const win = {
    location: { href: 'https://www.mtcstw.com/create' },
    PF: {
      skip(id) { return killed && id === 'createloop'; },
      toast(m) { toasts.push(m); }
    },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    PFCallsign() { return 'TESTCALL'; },
    PFDeviceId() { return 'd-test'; }
  };
  if (opts.shareInfra !== false) {
    win.PFShare = { shareImage(cv, fname, title, gameId, o) { shares.push({ cv, fname, title, gameId, o }); } };
  }
  function MutationObserver(cb) { observers.push(cb); this.observe = function () {}; }
  const sandbox = { window: win, document: document, localStorage: local,
    MutationObserver: MutationObserver, setTimeout() { return 0; }, clearTimeout() {},
    console: console };
  sandbox.window.window = win;
  const ctx = vm.createContext(sandbox);
  return { ctx, sandbox, toasts, shares, inserted, observers, local, rowParent, row };
}

function runModule(env) {
  vm.runInContext(src, env.ctx, { filename: 'create-loop.js' });
  return env;
}
function barButtons(env) {
  const rec = env.inserted[0];
  if (!rec) return null;
  return rec.bar.children.map(function (b) { return b.textContent; });
}

/* 1: normal mount — share infra present, no cell membership -> 2 buttons */
(function () {
  const env = runModule(makeEnv({ cellMine: 'none' }));
  const labels = barButtons(env);
  check('mounts one action bar after the forge row', !!labels);
  check('bar has SHARE + SUBMIT when no cell (rally hidden)',
    !!labels && labels.length === 2 &&
    labels[0] === 'SHARE THIS INTEL' && labels[1] === 'SUBMIT AS DAILY ORDER',
    labels && labels.join(' | '));
})();

/* 2: cell member -> rally appears */
(function () {
  const env = runModule(makeEnv({ cellMine: 'member' }));
  const labels = barButtons(env);
  check('RALLY YOUR CELL appears for cell members',
    !!labels && labels.length === 3 && labels[2] === 'RALLY YOUR CELL',
    labels && labels.join(' | '));
})();

/* 3: SHARE THIS INTEL routes through PFShare.shareImage */
(function () {
  const env = runModule(makeEnv({ cellMine: 'none' }));
  const btn = env.inserted[0].bar.children[0];
  btn.onclick();
  const s = env.shares[0];
  check('SHARE THIS INTEL pushes through the existing share pipeline',
    env.shares.length === 1 && s.fname === 'pfn-propaganda-poster.png' &&
    s.title === 'TEST HEADLINE' && s.gameId === 'workshop-create',
    JSON.stringify(env.shares[0] && { fname: env.shares[0].fname, title: env.shares[0].title, gameId: env.shares[0].gameId }));
})();

/* 4: rally shares with locked cell caption */
(function () {
  const env = runModule(makeEnv({ cellMine: 'member' }));
  const btn = env.inserted[0].bar.children[2];
  btn.onclick();
  const s = env.shares[0];
  check('RALLY YOUR CELL shares with locked rally caption (cell name, no free-text)',
    env.shares.length === 1 && /RALLYING MY CELL/.test(s.o.text) && /RED DAWN/.test(s.o.text),
    s && s.o && s.o.text);
})();

/* 5: SUBMIT queues device-locally, capped, with confirm toast */
(function () {
  const env = runModule(makeEnv({ cellMine: 'none' }));
  const btn = env.inserted[0].bar.children[1];
  btn.onclick();
  let q = JSON.parse(env.local.getItem('pf_createorder_queue_v1') || '[]');
  const first = q[0] || {};
  check('SUBMIT queues the candidate device-locally',
    q.length === 1 && first.source === 'poster-forge' && first.title === 'TEST HEADLINE' &&
    first.callsign === 'TESTCALL' && /^data:image\/jpeg/.test(first.thumb));
  check('SUBMIT confirms with review toast (nothing auto-posts)',
    env.toasts.length === 1 && /ORDER QUEUE/.test(env.toasts[0]), env.toasts[0]);
  for (let i = 0; i < 60; i++) btn.onclick();
  q = JSON.parse(env.local.getItem('pf_createorder_queue_v1') || '[]');
  check('queue caps at 50 (oldest drops)', q.length === 50, 'len=' + q.length);
})();

/* 6: kill switch */
(function () {
  const env = runModule(makeEnv({ killed: true, cellMine: 'none' }));
  check('?pf_off=createloop: module fully no-ops', env.inserted.length === 0 && env.observers.length === 0);
})();

/* 7: fail-open — share infra missing */
(function () {
  const env = runModule(makeEnv({ shareInfra: false, cellMine: 'none' }));
  const labels = barButtons(env);
  check('fail-open: no PFShare -> SHARE hidden, SUBMIT still mounts',
    !!labels && labels.length === 1 && labels[0] === 'SUBMIT AS DAILY ORDER',
    labels && labels.join(' | '));
})();

/* 8: fail-open — no forge on page */
(function () {
  const env = runModule(makeEnv({ noForge: true, cellMine: 'none' }));
  check('fail-open: no #pBattle -> silent no-op, no throw', env.inserted.length === 0);
})();

/* 9: fail-open — storage blocked */
(function () {
  const env = makeEnv({ cellMine: 'none' });
  env.local.setItem = function () { throw new Error('denied'); };
  runModule(env);
  const btn = env.inserted[0].bar.children[1];
  let threw = false;
  try { btn.onclick(); } catch (e) { threw = true; }
  check('fail-open: storage denied -> no throw, honest toast', !threw && /storage blocked/.test(env.toasts.join(' ')));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed.');
if (fail) { console.log('Failures: ' + failures.join('; ')); process.exit(1); }
