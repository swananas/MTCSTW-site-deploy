/* Smoke test for games/home-state.js + claim-box integration.
   DOM-stubbed; run with: node scripts/verify-home-state-fe.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; /* console.log('  ok - ' + name); */ }
  else { fail++; console.log('  FAIL - ' + name); }
}

/* ---- minimal DOM stub ---- */
const store = {};
const listeners = {};
const elements = {};
function mkEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', value: '', style: {},
    options: [], parentNode: null, nextSibling: null,
    onclick: null,
    appendChild(c) { c.parentNode = el; return c; },
    insertBefore(c, r) { c.parentNode = el; return c; },
    addEventListener() {},
  };
  elements[id] = el;
  return el;
}
const documentStub = {
  getElementById(id) {
    if (elements[id]) return elements[id];
    // elements created via createElement get their id assigned later —
    // scan for a live id match like a real DOM would.
    const all = Object.values(elements);
    for (let i = 0; i < all.length; i++) { if (all[i].id === id) return all[i]; }
    return null;
  },
  createElement() { return mkEl('dyn' + Math.random()); },
  addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
  dispatchEvent(ev) {
    (listeners[ev.type] || []).forEach(fn => fn(ev));
    return true;
  },
};
function CustomEvent(type, o) { this.type = type; this.detail = (o && o.detail) || {}; }

const sandbox = {
  console,
  setTimeout: (fn) => 0, // don't run retries in test; wire manually
  clearTimeout: () => {},
  document: documentStub,
  CustomEvent,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  window: {},
};
sandbox.window.PF = {
  skip: () => false,
  holder: () => mkEl('pf-holder'),
  error: () => {},
};
sandbox.window.localStorage = sandbox.localStorage;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'home-state.js'), 'utf8'), sandbox, { filename: 'home-state.js' });
const PF = sandbox.window.PF;

/* ---- preference API ---- */
ok('PF.homeState exposed', typeof PF.homeState === 'function');
ok('PF.setHomeState exposed', typeof PF.setHomeState === 'function');
ok('PF.homeStateName exposed', typeof PF.homeStateName === 'function');
ok('PF.homeStateOptions exposed', typeof PF.homeStateOptions === 'function');

ok('unset -> null', PF.homeState() === null);
ok('unset name -> "Not set"', PF.homeStateName() === 'Not set');

ok('set TX -> true', PF.setHomeState('TX') === true);
ok('get TX', PF.homeState() === 'TX');
ok('name TX -> Texas', PF.homeStateName() === 'Texas');

ok('lowercase normalized', PF.setHomeState('ca') === true && PF.homeState() === 'CA');
ok('stateless "" valid', PF.setHomeState('') === true);
ok('get stateless -> ""', PF.homeState() === '');
ok('name stateless -> "Stateless"', PF.homeStateName() === 'Stateless');

ok('invalid code rejected', PF.setHomeState('XX') === false);
ok('invalid code does not clobber', PF.homeState() === '');
ok('null -> stateless', PF.setHomeState(null) === true && PF.homeState() === '');

/* ---- stateless-first ordering ---- */
const opts = PF.homeStateOptions();
ok('53 options (stateless + 50 + DC)', opts.length === 52);
ok('first option is stateless', opts[0][0] === '' && /stateless/i.test(opts[0][1]));
ok('DC present', opts.some(o => o[0] === 'DC'));

/* ---- change event ---- */
let fired = null;
documentStub.addEventListener('pf-home-state-changed', ev => { fired = ev.detail.state; });
PF.setHomeState('LA');
ok('pf-home-state-changed fires with state', fired === 'LA');

/* ---- settings widget render ---- */
mkEl('oClaimWrap');
PF.setHomeState('TX'); // triggers renderSettings via event listener
const mount = documentStub.getElementById('pfHomeStateMount');
ok('settings mount created', !!mount);
ok('settings shows Texas', mount && mount.innerHTML.includes('Texas'));
ok('settings has change button', mount && mount.innerHTML.includes('pfHsChange'));
ok('settings has privacy copy', mount && /Never public/.test(mount.innerHTML));
ok('settings picker hidden by default', mount && mount.innerHTML.includes('display:none'));

/* ---- claim-box integration (daily-orders.js template) ---- */
const src = fs.readFileSync(path.join(ROOT, 'daily-orders.js'), 'utf8');
ok('claim box has oHomeState select', src.includes('id="oHomeState"'));
ok('claim box has privacy note', src.includes('Never public, never on leaderboards'));
ok('claim handler saves via PF.setHomeState (guarded)', src.includes('PF.setHomeState'));
ok('claim save guarded for skipped module', src.includes('window.PF&&PF.setHomeState'));

/* ---- no backend writes, no XP ---- */
const hs = fs.readFileSync(path.join(ROOT, 'home-state.js'), 'utf8');
ok('no fetch/XHR in module', !/fetch\(|XMLHttpRequest/.test(hs));
ok('no xpGrant in module', !/xpGrant/.test(hs));
ok('kill switch present', hs.includes('PF.skip("home-state")'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
