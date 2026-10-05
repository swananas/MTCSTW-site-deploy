/* Smoke test for games/pick-fight.js + claim-box integration.
   DOM-stubbed; run with: node scripts/verify-pick-fight-fe.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'v1.4.3', 'games');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; }
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
    onclick: null, checked: false,
    classList: { add() {}, remove() {} },
    getAttribute(n) { return this['_attr_' + n] || null; },
    setAttribute(n, v) { this['_attr_' + n] = String(v); },
    appendChild(c) { c.parentNode = el; return c; },
    insertBefore(c, r) { c.parentNode = el; return c; },
    addEventListener() {},
    querySelectorAll(sel) {
      // checkbox grid support: find pf-fight-cb "children" registered by test
      if (sel === '.pf-fight-cb') return Object.values(elements).filter(e => e['_cb'] === true);
      if (sel === '.pf-fight-cb:checked') return Object.values(elements).filter(e => e['_cb'] === true && e.checked);
      return [];
    },
    querySelector(sel) {
      if (sel === '.pf-fight-cap') return elements['capstub'] || null;
      return null;
    },
  };
  elements[id] = el;
  return el;
}
const documentStub = {
  getElementById(id) {
    if (elements[id]) return elements[id];
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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'pick-fight.js'), 'utf8'), sandbox, { filename: 'pick-fight.js' });
const PF = sandbox.window.PF;

/* ---- preference API ---- */
ok('PF.pickFight exposed', typeof PF.pickFight === 'function');
ok('PF.pickFightChosen exposed', typeof PF.pickFightChosen === 'function');
ok('PF.setPickFight exposed', typeof PF.setPickFight === 'function');
ok('PF.pickFightNames exposed', typeof PF.pickFightNames === 'function');
ok('PF.pickFightOptions exposed', typeof PF.pickFightOptions === 'function');

ok('unset -> pickFight []', JSON.stringify(PF.pickFight()) === '[]');
ok('unset -> chosen false', PF.pickFightChosen() === false);

ok('set 2 areas', PF.setPickFight(['voting', 'climate']) === true);
ok('get 2 areas', JSON.stringify(PF.pickFight()) === '["voting","climate"]');
ok('chosen true after set', PF.pickFightChosen() === true);
ok('names resolve', JSON.stringify(PF.pickFightNames()) === '["Voting Rights & Democracy","Climate & Environment"]');

/* ---- max-3 cap, dedupe, invalid ids ---- */
PF.setPickFight(['voting', 'labor', 'repro', 'climate', 'lgbtq']);
ok('capped at 3', PF.pickFight().length === 3);
PF.setPickFight(['voting', 'voting', 'labor']);
ok('deduped', JSON.stringify(PF.pickFight()) === '["voting","labor"]');
PF.setPickFight(['voting', 'bogus']);
ok('invalid ids dropped', JSON.stringify(PF.pickFight()) === '["voting"]');
PF.setPickFight([]);
ok('empty -> no filter', JSON.stringify(PF.pickFight()) === '[]' && PF.pickFightChosen() === true);

/* ---- 12 stable area ids ---- */
const opts = PF.pickFightOptions();
ok('12 areas', opts.length === 12);
ok('all expected ids', ['voting','labor','repro','climate','racial','lgbtq','immigrant','criminal','healthcare','housing','poverty','watchdog']
  .every(id => opts.some(o => o[0] === id)));

/* ---- change event ---- */
let fired = null;
documentStub.addEventListener('pf-pick-fight-changed', ev => { fired = ev.detail.fights; });
PF.setPickFight(['lgbtq']);
ok('pf-pick-fight-changed fires with fights', JSON.stringify(fired) === '["lgbtq"]');

/* ---- settings widget render (stacks after home-state widget) ---- */
mkEl('oClaimWrap');
mkEl('pfHomeStateMount'); // home-state widget exists -> fight widget goes after it
PF.setPickFight(['housing', 'poverty']); // triggers renderSettings via event
const mount = documentStub.getElementById('pfPickFightMount');
ok('settings mount created', !!mount);
ok('settings shows picks', mount && mount.innerHTML.includes('Housing') && mount.innerHTML.includes('Anti-Poverty'));
ok('settings has MY FIGHTS header', mount && mount.innerHTML.includes('MY FIGHTS'));
ok('settings has change button', mount && mount.innerHTML.includes('pfFightChange'));
ok('settings has privacy copy', mount && /Never public/.test(mount.innerHTML));
ok('settings has clear filter', mount && mount.innerHTML.includes('pfFightClear'));
ok('settings picker hidden by default', mount && mount.innerHTML.includes('display:none'));
ok('settings grid has 12 checkboxes', mount && (mount.innerHTML.match(/pf-fight-cb/g) || []).length === 12);

/* ---- claim-box integration (daily-orders.js template) ---- */
const src = fs.readFileSync(path.join(ROOT, 'daily-orders.js'), 'utf8');
ok('claim box has oPickFight mount', src.includes('id="oPickFight"'));
ok('claim box mount after home-state picker', src.indexOf('id="oPickFight"') > src.indexOf('id="oHomeState"'));
ok('claim handler saves via PF.setPickFight (guarded)', src.includes('PF.setPickFight'));
ok('claim save guarded for skipped module', src.includes('window.PF&&PF.setPickFight'));

/* ---- no backend writes, no XP ---- */
const pf = fs.readFileSync(path.join(ROOT, 'pick-fight.js'), 'utf8');
ok('no fetch/XHR in module', !/fetch\(|XMLHttpRequest/.test(pf));
ok('no xpGrant in module', !/xpGrant/.test(pf));
ok('kill switch present', pf.includes('PF.skip("pick-fight")'));
ok('uses own LS key', pf.includes('pf_pick_fight_v1'));
ok('max 3 enforced', /out\.length < MAX/.test(pf) || /checked\.length > MAX/.test(pf));

/* ---- pf-fight-picked XP hook (Economy Desk sign-off) ---- */
/* fresh storage for this section */
for (const k of Object.keys(store)) delete store[k];
let picked = null;
documentStub.addEventListener('pf-fight-picked', ev => { picked = ev.detail.fights; });
PF.setPickFight(['voting', 'climate']);
ok('first real pick fires pf-fight-picked', JSON.stringify(picked) === '["voting","climate"]');
picked = 'unset';
PF.setPickFight(['labor']); // re-save: no re-fire
ok('re-save does not re-fire pf-fight-picked', picked === 'unset');
PF.setPickFight([]); // clear: no fire
ok('clear does not fire pf-fight-picked', picked === 'unset');

for (const k of Object.keys(store)) delete store[k];
picked = null;
PF.setPickFight([]); // skip on fresh storage: no fire
ok('skip (empty) does not fire pf-fight-picked', picked === null);
ok('skip still marks chosen (no filter)', PF.pickFightChosen() === true);

const pf2 = fs.readFileSync(path.join(ROOT, 'pick-fight.js'), 'utf8');
ok('header no longer has the No-XP hard requirement bullet', !/- No XP\. Read-only/.test(pf2));
ok('header documents Economy Desk sign-off', pf2.includes('Economy Desk'));

/* ---- enlistment-ranks listener (existing onboarding leg) ---- */
const er = fs.readFileSync(path.join(ROOT, 'enlistment-ranks.js'), 'utf8');
ok('enlistment-ranks listens for pf-fight-picked', er.includes('pf-fight-picked'));
ok('award uses once rule + exempt', /award\("fight",\s*10,\s*"once",\s*\{exempt:1\}\)/.test(er));
ok('toast on grant', er.includes('FIGHTS CHOSEN'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
