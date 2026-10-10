#!/usr/bin/env node
/* tests/verify-weave-spine.js — verification harness for
 * v1.4.3/core/46-weave-spine.js (WS-C, fe/weave-spine-20261010).
 * DOM-shim: loads the module source, executes it against a fake DOM, and asserts:
 *   1. kill-switch (?pf_off=weave / PF.skip) exposes nothing
 *   2. mount injects #pf-weave with RELATED ROBBERIES rail + spine link -> /#kh-feed
 *   3. no-op when #kh-feed already present (the Karl homepage IS the feed)
 *   4. relatedFor returns 4 items for known pages, fallback for unknown
 *   5. every 9-rail id + margins + creators resolves via cardDeepUrl to an
 *      INTERNAL path (no external URLs — orphan guard)
 *   6. no-XP / no-network / no-auth grep assertions on the module source
 *   7. rebuilt bundles (bundle-core.js, bundle-core-slr.js) contain the module
 *   8. every rail deep page is a known site route
 * Run: node tests/verify-weave-spine.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var CORE = path.join(ROOT, 'v1.4.3', 'core');
var SRC = fs.readFileSync(path.join(CORE, '46-weave-spine.js'), 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- fake DOM ---------- */
function makeEl(tag) {
  var el = {
    tag: tag, children: [], attrs: {}, style: {}, _html: '', id: '',
    parentNode: null,
    setAttribute: function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore: function (n, r) { n.parentNode = this; var i = this.children.indexOf(r); this.children.splice(i < 0 ? this.children.length : i, 0, n); return n; },
    addEventListener: function () {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) {
      this._html = String(v);
      this.firstChild = null;
      var m = String(v).match(/id="([^"]+)"/);
      if (m) { var c = makeEl('div'); c.id = m[1]; c._html = String(v); c.parentNode = this; this.children.push(c); this.firstChild = c; }
    }
  });
  return el;
}
function makeDoc(opts) {
  opts = opts || {};
  var body = makeEl('body');
  var head = makeEl('head');
  var byId = {};
  var doc = {
    readyState: 'complete',
    head: head, body: body,
    createElement: function (t) { return makeEl(t); },
    getElementById: function (id) { return byId[id] || null; },
    getElementsByTagName: function (t) { return t === 'footer' ? [] : []; },
    addEventListener: function () {},
    _register: function (el) { if (el.id) byId[el.id] = el; }
  };
  if (opts.crossnav) { var xn = makeEl('div'); xn.id = 'pf-crossnav'; doc._register(xn); body.appendChild(xn); }
  if (opts.khfeed) { var kf = makeEl('div'); kf.id = 'kh-feed'; doc._register(kf); body.appendChild(kf); }
  /* keep registry in sync when the module appends */
  var origAppend = body.appendChild.bind(body);
  body.appendChild = function (c) { var r = origAppend(c); if (c.id) byId[c.id] = c; return r; };
  var origInsert = body.insertBefore.bind(body);
  body.insertBefore = function (n, r) { var x = origInsert(n, r); if (n.id) byId[n.id] = n; return x; };
  return doc;
}
function runModule(disabled, docOpts, pathname) {
  var doc = makeDoc(docOpts);
  var sandbox = {
    window: { PF: { skip: function (s) { return disabled.indexOf(s) !== -1; } }, location: { pathname: pathname || '/money' } },
    document: doc
  };
  sandbox.window.PFWeave = undefined;
  /* NOTE: new Function bodies do not return completion values — only
     explicit `return` does. So the module's export is read off the sandbox. */
  var code = 'var window = __w; var document = __d;\n' + SRC;
  new Function('__w', '__d', code)(sandbox.window, doc);
  return { api: sandbox.window.PFWeave, doc: doc };
}

/* 1. kill switch */
var killed = runModule(['weave'], {}, '/money');
ok('kill switch suppresses module (PFWeave undefined)', killed.api === undefined);
ok('kill switch suppresses DOM injection', killed.doc.getElementById('pf-weave') === null);

/* 2. mount injects rail + spine link */
var live = runModule([], { crossnav: true }, '/money');
ok('module exposes PFWeave', !!live.api);
var weave = live.doc.getElementById('pf-weave');
ok('injects #pf-weave', !!weave);
var html = weave ? weave.innerHTML : '';
ok('rail kicker FROM THE FEED', html.indexOf('FROM THE FEED') !== -1);
ok('rail head RELATED ROBBERIES', html.indexOf('RELATED ROBBERIES') !== -1);
ok('spine link to /#kh-feed', html.indexOf('href="/#kh-feed"') !== -1);
ok('spine link copy', html.indexOf('THE ROBBERY REPORT') !== -1);
ok('4 related items on /money', (html.match(/pf-wv-item/g) || []).length >= 4);
ok('items carry data-rail + data-card-id', html.indexOf('data-rail="billionaires"') !== -1);

/* 3. no-op on the Karl homepage */
var home = runModule([], { khfeed: true }, '/');
ok('no-op when #kh-feed present', home.doc.getElementById('pf-weave') === null);

/* 4. relatedFor coverage */
var api = live.api;
ok('relatedFor(/cells) = 4 items', api.relatedFor('/cells').length === 4);
ok('relatedFor(/sick-left-radicals/slug) prefix match', api.relatedFor('/sick-left-radicals/joman').length === 4);
ok('relatedFor(unknown) falls back to 4', api.relatedFor('/some-new-page').length === 4);

/* 5. rail -> deep page: all internal, all 9 rails + margins + creators */
var NINE = ['colleges', 'prisons', 'rent', 'bills', 'evictions', 'billionaires', 'labor', 'hospitals', 'economy'];
var ALL = NINE.concat(['margins', 'creators']);
var allInternal = ALL.every(function (r) {
  var u = api.cardDeepUrl(r);
  return typeof u === 'string' && u.charAt(0) === '/' && u.indexOf('://') === -1;
});
ok('all 11 rail ids resolve to internal deep pages', allInternal);
ok('cardDeepUrl fallback is internal', api.cardDeepUrl('bogus').charAt(0) === '/');

/* 6. no XP / no network / no auth in module */
ok('no xpGrant / XP minting', !/xpGrant|mintXP|awardXP/i.test(SRC));
ok('no fetch / XHR / WebSocket', !/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/.test(SRC));
ok('no auth/secret touch', !/AUTH_MAP|authGate|localStorage|sessionStorage|document\.cookie/i.test(SRC));
ok('has PF.skip kill switch', /PF\.skip\('weave'\)/.test(SRC));

/* 7. rebuilt bundles contain the module (runtime marker: terser strips the
   "Contains:" header comment, so assert on a string literal from the module) */
['bundle-core.js', 'bundle-core-slr.js'].forEach(function (b) {
  var p = path.join(CORE, b);
  var exists = fs.existsSync(p);
  var has = exists && fs.readFileSync(p, 'utf8').indexOf('RELATED ROBBERIES') !== -1;
  ok(b + ' contains 46-weave-spine', has, exists ? 'module marker missing' : 'bundle file missing');
});

/* 8. deep pages are known site routes */
var routes = ['/follow-the-money', '/corruption-index', '/peoples-cpi', '/economy', '/money', '/sick-left-radicals'];
var known = ALL.every(function (r) { return routes.indexOf(api.cardDeepUrl(r)) !== -1; });
ok('every deepUrl is a known site route', known);

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
