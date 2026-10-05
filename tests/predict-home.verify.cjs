#!/usr/bin/env node
/* tests/predict-home.verify.cjs — smoke test for the predictions-home wiring
 * (v1.4.3/games/predict-home.js, fe/predictions-home 2026-10-05).
 *
 * DOM-shim: executes the file against a fake DOM and asserts:
 *   1. kill switch honored: PF.skip('predict') -> true => no DOM changes, no throw
 *   2. fail-soft: no #pf-predict in DOM => no throw, no changes
 *   3. hub anchor: mounted #pf-predict wrapper gets id="phq-ballot-predict",
 *      data-hub="ballot", data-slot="3.7" (#pf-predict itself untouched)
 *   4. hub header chrome: BALLOT kicker + AC-return rail (#pf-action-center)
 *   5. payoff exits rail: #cvCompBox, #pf-footprint, #pf-races links
 *   6. idempotency: double-run decorates exactly once
 *   7. no invented outcomes: chrome contains no results/odds/winner claims
 * Run: node tests/predict-home.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'predict-home.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- DOM shim ---------- */
function makeEl(tag, id) {
  var el = {
    tagName: (tag || 'div').toUpperCase(), id: id || '', className: '',
    innerHTML: '', textContent: '', firstChild: null, children: [],
    attrs: {}, parentNode: null,
    style: {},
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore: function (c, ref) {
      this.children.unshift(c); c.parentNode = this; return c;
    },
    closest: function () { return null; }
  };
  return el;
}
function makeDoc() {
  var els = {};
  var head = makeEl('head');
  var body = makeEl('body');
  return {
    _els: els, head: head, body: body, documentElement: makeEl('html'),
    getElementById: function (id) { return els[id] || null; },
    createElement: function (tag) { return makeEl(tag); },
    _register: function (el) { if (el.id) els[el.id] = el; }
  };
}
function runWith(PF, doc, mutate) {
  var sandbox = {
    window: { PF: PF }, PF: PF, document: doc,
    setTimeout: function (fn) { /* do not fire — synchronous assertions */ return 0; },
    MutationObserver: undefined,
    console: { log: function () {} }
  };
  sandbox.window.document = doc;
  var fn = new Function('window', 'document', 'setTimeout', 'MutationObserver', 'PF', 'console',
    src + '\n;return undefined;');
  fn.call(sandbox, sandbox.window, doc, sandbox.setTimeout, undefined, PF, sandbox.console);
  if (mutate) mutate();
}

/* ---------- 1. kill switch honored ---------- */
(function () {
  var doc = makeDoc();
  var inner = makeEl('div', 'pf-predict');
  doc._register(inner); doc.body.appendChild(inner);
  var changed = false;
  var origAppend = doc.head.appendChild.bind(doc.head);
  doc.head.appendChild = function (c) { changed = true; return origAppend(c); };
  runWith({ skip: function (id) { return id === 'predict'; } }, doc);
  ok('kill switch: PF.skip(predict)=true => no DOM changes', !changed &&
    inner.getAttribute('data-pf-predict-home') === null);
})();

/* ---------- 2. fail-soft: no #pf-predict ---------- */
(function () {
  var doc = makeDoc();
  var threw = false;
  try { runWith({ skip: function () { return false; } }, doc); }
  catch (e) { threw = true; }
  ok('fail-soft: missing #pf-predict never throws', !threw);
})();

/* ---------- 3–6. decorate path ---------- */
(function () {
  var doc = makeDoc();
  var wrap = makeEl('section'); wrap.className = 'pf-hq-section';
  wrap.setAttribute('data-game', 'predict');
  var inner = makeEl('div', 'pf-predict');
  inner.innerHTML = '<h2>Call the Shot</h2><div id="xPredict"></div>';
  inner.firstChild = makeEl('h2');
  inner.closest = function () { return wrap; };
  doc._register(inner); wrap.appendChild(inner); doc.body.appendChild(wrap);

  runWith({ skip: function () { return false; } }, doc);

  ok('hub anchor: wrapper id=phq-ballot-predict', wrap.getAttribute('id') === 'phq-ballot-predict');
  ok('hub anchor: data-hub=ballot', wrap.getAttribute('data-hub') === 'ballot');
  ok('hub anchor: data-slot=3.7', wrap.getAttribute('data-slot') === '3.7');
  ok('#pf-predict id untouched', doc.getElementById('pf-predict') === inner);

  var html = '';
  inner.children.forEach(function (c) { html += c.innerHTML + '|' + c.className + '|'; });
  ok('hub header: BALLOT kicker present', html.indexOf('BALLOT') !== -1);
  ok('hub header: AC-return rail -> #pf-action-center', html.indexOf('#pf-action-center') !== -1 &&
    html.indexOf('BACK TO ACTION CENTER') !== -1);
  ok('exits rail: cell competitions link', html.indexOf('#cvCompBox') !== -1);
  ok('exits rail: pressure footprint link', html.indexOf('#pf-footprint') !== -1);
  ok('exits rail: races link', html.indexOf('#pf-races') !== -1);
  ok('exits rail: NEXT MOVES label', html.indexOf('NEXT MOVES') !== -1);

  /* idempotency: run again — should not double-decorate */
  var before = inner.children.length;
  runWith({ skip: function () { return false; } }, doc);
  ok('idempotent: second run adds no duplicate chrome', inner.children.length === before);
})();

/* ---------- 7. no invented outcomes ---------- */
(function () {
  var banned = ['YOU CALLED IT', 'MISSED IT', 'WINNER', 'ODDS', 'called:', 'result:'];
  var bad = banned.filter(function (w) { return src.indexOf(w) !== -1; });
  ok('no invented outcomes in chrome copy', bad.length === 0, bad.join(','));
  ok('no XP grants in wiring file', !/award\(|xpGrant|xp_grant/.test(src));
})();

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
