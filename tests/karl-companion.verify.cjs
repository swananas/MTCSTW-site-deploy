/* tests/karl-companion.verify.cjs — Karl companion local index smoke test.
   Runs karl-companion.js under a minimal DOM stub and asserts the local
   intent matcher answers site-navigation questions correctly. */
'use strict';
const fs = require('fs');
const path = require('path');

let failures = 0;
function ok(cond, name) {
  if (cond) { console.log('  PASS ' + name); }
  else { failures++; console.log('  FAIL ' + name); }
}

/* Minimal DOM stub. */
function makeEl() {
  const el = {
    children: [], className: '', innerHTML: '', textContent: '', value: '',
    style: {}, scrollTop: 0, scrollHeight: 0,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i > -1) this.children.splice(i, 1); return c; },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    focus() {}
  };
  return el;
}
const bodyEl = makeEl();
global.document = {
  head: makeEl(), body: bodyEl,
  createElement() { return makeEl(); },
  getElementById() { return null; },
  addEventListener() {},
  location: { href: 'https://www.mtcstw.com/' }
};
global.window = {
  PF: { skip() { return false; }, error() {} },
  location: { href: 'https://www.mtcstw.com/', pathname: '/' },
  localStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } },
  sessionStorage: { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } },
  PFCallsign: () => ''
};
global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.sessionStorage;
try { global.navigator = {}; } catch (e) {}

const src = fs.readFileSync(path.join(__dirname, '..', 'v1.4.3', 'core', 'karl-companion.js'), 'utf8');
try {
  new Function('window', 'document', 'localStorage', 'sessionStorage', 'navigator', src)(
    global.window, global.document, global.localStorage, global.sessionStorage, global.navigator);
} catch (e) {
  console.log('  FAIL file threw on boot: ' + e.message);
  process.exit(1);
}
const K = global.window.PFKarlCompanion;
ok(!!K, 'PFKarlCompanion API exposed');
ok(K._pages >= 20, 'site index has 20+ pages (got ' + K._pages + ')');
ok(K._howtos >= 10, 'how-to index has 10+ entries (got ' + K._howtos + ')');

function answered(q) { const r = K._match(q); return r && r.text; }
function href(q) { const r = K._match(q); return r && r.href; }

ok(answered('where is the war report'), 'where is the war report -> answered');
ok(href('where is the war report') === '/war-report', 'war report deep link correct');
ok(answered('how do I earn XP'), 'how do I earn XP -> answered');
ok(answered('how do i join a cell'), 'how do i join a cell -> answered');
ok(href('how do i join a cell') === '/cells', 'cell deep link correct');
ok(answered('where do I delete my data'), 'delete my data -> answered');
ok(answered('what is the nuke'), 'what is the nuke -> answered');
ok(answered('how do I install the app'), 'install app -> answered');
ok(answered('where is the arcade'), 'where is the arcade -> answered');
ok(answered('take me to the economy'), 'take me to the economy -> answered');
ok(!K._match('what is the theory of surplus value'), 'theory question NOT answered locally (goes to worker)');
ok(!K._match('xyzzy plugh qqq'), 'gibberish not answered locally');

/* SWEEP 2026-10-07: new data pages indexed, /follow-the-money canonical path. */
ok(answered('where is the dossier builder'), 'dossier page -> answered');
ok(href('where is the dossier builder') === '/dossier', 'dossier deep link correct');
ok(answered('where is the extraction engine'), 'extraction page -> answered');
ok(href('where is the extraction engine') === '/extraction', 'extraction deep link correct');
ok(answered('take me to the war room'), 'war room -> answered');
ok(href('take me to the war room') === '/war-room', 'war room deep link correct');
ok(answered('where is follow the money'), 'follow the money -> answered');
ok(href('where is follow the money') === '/follow-the-money', 'follow-the-money canonical path (not /money)');
ok(answered('what is the peoples price index'), 'peoples cpi -> answered');
ok(href('what is the peoples price index') === '/peoples-cpi', 'peoples-cpi deep link correct');
ok(answered('where is the story remixer'), 'remix page -> answered');
ok(href('where is the story remixer') === '/remix', 'remix deep link correct');

console.log(failures === 0 ? '\nKARL-COMPANION: all checks passed' : '\nKARL-COMPANION: ' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
