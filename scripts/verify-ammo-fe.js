#!/usr/bin/env node
/* scripts/verify-ammo-fe.js — Ammo Finder frontend verification harness.
   Run from the worktree root:
     node scripts/verify-ammo-fe.js
   1. node --check on the touched files
   2. Static checks (kill switch, backend contract shape, honest copy,
      no-XP, banned terms, bundle marker)
   3. Mocked-browser runtime tests (vm + minimal DOM shim): mount paths,
      input validation, states, card rendering, citation format,
      kill-switch behavior, error state.
   Rebuilds bundles first via build/bundle.js. Exits 0 when every check
   passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }

console.log('== 1. node --check ==');
['v1.4.3/games/ammo.js', 'build/bundle.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var src = read(path.join(V, 'games', 'ammo.js'));
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]ammo['"]\)/.test(src)) ok('kill switch PF.skip("ammo") wired');
else no('kill switch', 'PF.skip("ammo") not found');
if (src.indexOf('?pf_off=ammo') !== -1) ok('KILL comment documents ?pf_off=ammo');
else no('kill comment', '?pf_off=ammo missing from header');

['claimsupport', 'cs_action', 'claim_support_search'].forEach(function (s) {
  if (src.indexOf(s) !== -1) ok('contract string present: ' + s);
  else no('contract string', s + ' missing');
});
if (/PENDING/.test(src) && src.indexOf('wave-claim-support') !== -1)
  ok('backend contract marked PENDING (wave-claim-support not landed)');
else no('contract PENDING marker', 'missing PENDING / wave-claim-support note');

if (src.indexOf('Sources to back your claim. You verify, you post.') !== -1)
  ok('honest label copy exact');
else no('honest label', 'exact honest-label copy missing');
if (src.indexOf('Ammo dry right now. Try again in a bit.') !== -1)
  ok('error state copy exact (no stack trace)');
else no('error copy', 'friendly backend-down copy missing');
if (src.indexOf('No sources found — try fewer or broader words.') !== -1)
  ok('no-results copy exact');
else no('no-results copy', 'no-results copy missing');
if (src.indexOf('target="_blank"') !== -1 && src.indexOf('rel="noopener"') !== -1)
  ok('result links open in new tab (target=_blank + noopener)');
else no('link target', 'new-tab link attrs missing');
if (src.indexOf("Headline — Outlet") === -1) { /* citation built from parts */ }
if (/\bcitation\b/.test(code) && code.indexOf("' — '") !== -1 && code.indexOf("'\\n'") !== -1)
  ok('citation format: "Headline — Outlet, Date\\nURL"');
else no('citation format', 'citation() shape not found');

if (!/\bxp\b/i.test(code)) ok('no XP calls / XP-adjacent logic in code');
else no('no-XP rule', 'found xp-like token in code: ' +
  (code.match(/\S{0,20}\bxp\b\S{0,20}/i) || ['?'])[0]);
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in ammo.js');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane" in ammo.js');

var bundleCreate = read(path.join(V, 'games', 'bundle-create.js'));
if (bundleCreate.indexOf('pf-ammo') !== -1) ok('ammo marker in rebuilt bundle-create.js');
else no('bundle marker', 'pf-ammo missing from bundle-create.js');
if (has(path.join(ROOT, 'build', 'bundle.js'), "'ammo.js'"))
  ok('ammo.js registered in build/bundle.js (bundle-create)');
else no('bundle registration', 'ammo.js not in SECTIONS');

/* ================= mocked browser ================= */
var VOID = { input: 1, br: 1, img: 1, hr: 1, meta: 1, link: 1 };
function El(tag) {
  this.tagName = String(tag).toUpperCase();
  this.children = [];
  this.parentNode = null;
  this.attrs = {};
  this.listeners = {};
  this.style = {};
  this.value = '';
  this._classes = [];
  this._raw = '';
}
El.prototype.getAttribute = function (n) {
  return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
};
El.prototype.setAttribute = function (n, v) {
  this.attrs[n] = String(v);
  if (n === 'class') this._classes = String(v).split(/\s+/).filter(Boolean);
};
Object.defineProperty(El.prototype, 'id', {
  get: function () { return this.attrs.id || ''; },
  set: function (v) { this.attrs.id = String(v); }
});
Object.defineProperty(El.prototype, 'nextSibling', {
  get: function () {
    if (!this.parentNode) return null;
    var s = this.parentNode.children, i = s.indexOf(this);
    return s[i + 1] || null;
  }
});
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.insertBefore = function (n, ref) {
  n.parentNode = this;
  var i = this.children.indexOf(ref);
  if (i === -1) this.children.push(n); else this.children.splice(i, 0, n);
  return n;
};
El.prototype.remove = function () {
  if (this.parentNode) {
    var i = this.parentNode.children.indexOf(this);
    if (i !== -1) this.parentNode.children.splice(i, 1);
    this.parentNode = null;
  }
};
El.prototype.addEventListener = function (t, fn) {
  (this.listeners[t] = this.listeners[t] || []).push(fn);
};
El.prototype.select = function () {};
Object.defineProperty(El.prototype, 'classList', {
  get: function () {
    var self = this;
    return {
      add: function (c) { if (self._classes.indexOf(c) === -1) self._classes.push(c); },
      remove: function (c) { self._classes = self._classes.filter(function (x) { return x !== c; }); },
      contains: function (c) { return self._classes.indexOf(c) !== -1; }
    };
  }
});
Object.defineProperty(El.prototype, 'textContent', {
  get: function () {
    var s = '';
    for (var i = 0; i < this.children.length; i++) {
      var c = this.children[i];
      s += c.isText ? c.text : c.textContent;
    }
    return s;
  },
  set: function (v) { this.children = [{ isText: true, text: String(v), parentNode: this }]; }
});
function parseHTML(html) {
  var root = { children: [] };
  var stack = [root];
  var re = /<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z_:][\w:.-]*(?:\s*=\s*"[^"]*")?)*\s*\/?>|[^<]+/g;
  var m;
  while ((m = re.exec(html))) {
    var tok = m[0];
    if (tok.charAt(0) !== '<') {
      stack[stack.length - 1].children.push({ isText: true, text: tok, parentNode: stack[stack.length - 1] });
      continue;
    }
    if (tok.indexOf('<!--') === 0) continue;
    var isClose = tok.charAt(1) === '/';
    var nm = tok.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
    if (!nm) continue;
    var name = nm[1].toLowerCase();
    if (isClose) {
      while (stack.length > 1) { var p = stack.pop(); if (p.tagName === name.toUpperCase()) break; }
      continue;
    }
    var el = new El(name);
    var attrStr = tok.slice(tok.indexOf(nm[1]) + nm[1].length);
    var are = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*"([^"]*)")?/g, am;
    while ((am = are.exec(attrStr))) el.attrs[am[1]] = am[2] === undefined ? '' : am[2];
    if (el.attrs['class']) el._classes = el.attrs['class'].split(/\s+/).filter(Boolean);
    el.parentNode = stack[stack.length - 1];
    stack[stack.length - 1].children.push(el);
    if (!(/\/>$/.test(tok) || VOID[name])) stack.push(el);
  }
  return root.children;
}
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._raw; },
  set: function (h) {
    this._raw = String(h);
    this.children = [];
    var kids = parseHTML(this._raw);
    for (var i = 0; i < kids.length; i++) this.appendChild(kids[i]);
  }
});
function matchSel(el, sel) {
  var rest = sel, tag = null, id = null, classes = [], attr = null, attrVal;
  var m = rest.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (m) { tag = m[1].toUpperCase(); rest = rest.slice(m[0].length); }
  var mm;
  while (rest) {
    if (rest.charAt(0) === '#') { mm = rest.match(/^#([\w-]+)/); id = mm[1]; rest = rest.slice(mm[0].length); }
    else if (rest.charAt(0) === '.') { mm = rest.match(/^\.([\w-]+)/); classes.push(mm[1]); rest = rest.slice(mm[0].length); }
    else if (rest.charAt(0) === '[') {
      mm = rest.match(/^\[([\w-]+)(?:="([^"]*)")?\]/); attr = mm[1]; attrVal = mm[2]; rest = rest.slice(mm[0].length);
    } else break;
  }
  if (tag && el.tagName !== tag) return false;
  if (id && el.id !== id) return false;
  for (var i = 0; i < classes.length; i++) if (el._classes.indexOf(classes[i]) === -1) return false;
  if (attr) {
    var v = el.getAttribute(attr);
    if (v === null) return false;
    if (attrVal !== undefined && v !== attrVal) return false;
  }
  return true;
}
El.prototype.querySelectorAll = function (sel) {
  var out = [];
  (function walk(n) {
    for (var i = 0; i < n.children.length; i++) {
      var c = n.children[i];
      if (!c.isText) { if (matchSel(c, sel)) out.push(c); walk(c); }
    }
  })(this);
  return out;
};
El.prototype.querySelector = function (sel) { var r = this.querySelectorAll(sel); return r[0] || null; };
function findById(n, id) {
  if (!n.isText && n.id === id) return n;
  for (var i = 0; i < (n.children || []).length; i++) {
    var r = findById(n.children[i], id);
    if (r) return r;
  }
  return null;
}
function makeDocument() {
  var root = new El('html');
  var body = new El('body');
  root.appendChild(body);
  return {
    _root: root, body: body,
    createElement: function (t) { return new El(t); },
    getElementById: function (id) { return findById(root, id); },
    execCommand: function () { return true; }
  };
}
function fire(el, type, props) {
  var ev = { type: type, target: el, preventDefault: function () {} };
  if (props) for (var k in props) ev[k] = props[k];
  var node = el;
  while (node) {
    var ls = node.listeners[type] || [];
    for (var i = 0; i < ls.length; i++) ls[i].call(node, ev);
    node = node.parentNode;
  }
}
function makeEnv(opts) {
  opts = opts || {};
  var doc = makeDocument();
  if (opts.dedicated) {
    var d = doc.createElement('div'); d.setAttribute('id', 'pf-ammo'); doc.body.appendChild(d);
  }
  if (opts.warcard) {
    var w = doc.createElement('div'); w.setAttribute('id', 'pf-war-card'); doc.body.appendChild(w);
  }
  var toasts = [], clips = [], postCalls = [], postCb = null, pfGets = [];
  var skipIds = opts.skip || [];
  var timers = [];
  var PF = {
    skip: function (s) { return skipIds.indexOf(s) !== -1; },
    toast: function (m) { toasts.push(m); },
    postAction: function (t, ak, a, params, cb) {
      postCalls.push({ type: t, actionKey: ak, action: a, params: params });
      postCb = cb;
    }
  };
  var PFproxy = new Proxy(PF, {
    get: function (t, k) {
      if (typeof k === 'string') pfGets.push(k);
      var v = t[k];
      return (typeof v === 'function') ? v.bind(t) : v;
    }
  });
  var nav = {};
  if (opts.clipboard !== false) {
    nav.clipboard = { writeText: function (txt) { clips.push(txt); return Promise.resolve(txt); } };
  }
  var sandbox = {
    window: {}, document: doc, navigator: nav,
    setTimeout: function (cb) { timers.push(cb); return timers.length; },
    clearTimeout: function () {},
    console: console
  };
  sandbox.window.PF = PFproxy;
  sandbox.window.location = { href: 'https://mtcstw.com/' };
  sandbox.window.PF_BACKEND_URL = 'https://pf-api.mtcstw.workers.dev';
  return {
    doc: doc, sandbox: sandbox, toasts: toasts, clips: clips,
    postCalls: postCalls, pfGets: pfGets, timers: timers,
    getPostCb: function () { return postCb; },
    runTimers: function () { var t = timers.splice(0); t.forEach(function (cb) { cb(); }); }
  };
}
function loadModule(env) {
  vm.runInNewContext(read(path.join(V, 'games', 'ammo.js')), env.sandbox, { filename: 'ammo.js' });
}
var RES1 = { title: 'Headline One', source: 'The Outlet', date: 'Oct 4 2026', url: 'https://example.com/one', excerpt: 'Excerpt one.' };
var RES2 = { title: 'Headline Two', source: 'Other Paper', date: 'Oct 3 2026', url: 'https://example.com/two', excerpt: 'Excerpt two.' };
var CIT1 = 'Headline One — The Outlet, Oct 4 2026\nhttps://example.com/one';
var CIT2 = 'Headline Two — Other Paper, Oct 3 2026\nhttps://example.com/two';

function searchFlow(env) {
  /* returns after loading state, before backend responds */
  loadModule(env);
  var doc = env.doc;
  doc.getElementById('am-claim').value = 'billionaires paid less tax than nurses';
  fire(doc.getElementById('am-go'), 'click');
  return doc;
}

async function main() {
  console.log('== 3. mocked-browser runtime ==');

  /* kill switch */
  (function () {
    var env = makeEnv({ warcard: true, skip: ['ammo'] });
    loadModule(env);
    if (!env.doc.getElementById('pf-ammo')) ok('kill switch: ?pf_off=ammo leaves no section');
    else no('kill switch', '#pf-ammo mounted despite skip');
    if (env.postCalls.length === 0) ok('kill switch: no backend call attempted');
    else no('kill switch', 'postAction fired despite skip');
  })();

  /* mount: Creator HQ fallback after #pf-war-card */
  (function () {
    var env = makeEnv({ warcard: true });
    loadModule(env);
    var doc = env.doc, ammo = doc.getElementById('pf-ammo');
    if (ammo && ammo.parentNode === doc.body && doc.getElementById('pf-war-card').nextSibling === ammo)
      ok('mounts on Creator HQ right after #pf-war-card');
    else no('HQ mount', '#pf-ammo not placed after #pf-war-card');
    var honest = ammo && ammo.querySelector('.am-honest');
    if (honest && honest.textContent === 'Sources to back your claim. You verify, you post.')
      ok('honest label rendered under input');
    else no('honest label', 'missing or wrong text');
    var empty = doc.getElementById('xAmmo').querySelector('.am-empty');
    if (empty && /Type a claim above/.test(empty.textContent)) ok('empty state prompts for a claim');
    else no('empty state', 'empty prompt missing');
  })();

  /* mount: dedicated div when present, no HQ fallback needed */
  (function () {
    var env = makeEnv({ dedicated: true });
    loadModule(env);
    var ammo = env.doc.getElementById('pf-ammo');
    if (ammo && ammo.querySelector('#am-go')) ok('mounts into dedicated #pf-ammo');
    else no('dedicated mount', 'did not mount into #pf-ammo');
  })();

  /* mount: nowhere to mount -> silent no-op */
  (function () {
    var env = makeEnv({});
    try { loadModule(env); ok('no mount div: silent no-op (no throw)'); }
    catch (e) { no('no mount div', 'threw: ' + e.message); }
  })();

  /* input validation */
  (function () {
    var env = makeEnv({ warcard: true });
    loadModule(env);
    fire(env.doc.getElementById('am-go'), 'click');
    if (env.postCalls.length === 0) ok('empty claim: no backend call');
    else no('validation', 'postAction fired on empty claim');
    if (env.toasts.indexOf('Type a claim first.') !== -1) ok('empty claim: toast prompts for input');
    else no('validation toast', 'missing "Type a claim first." toast');
  })();

  /* loading state */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    var go = doc.getElementById('am-go');
    if (go.disabled === true && go.textContent === 'DIGGING…') ok('loading: button disabled + DIGGING…');
    else no('loading button', 'button not in loading state');
    var l = doc.getElementById('xAmmo').querySelector('.am-load');
    if (l && /Digging up ammo/.test(l.textContent)) ok('loading: "Digging up ammo…" shown');
    else no('loading copy', 'loading indicator missing');
    if (env.postCalls.length === 1) {
      var c = env.postCalls[0];
      if (c.type === 'claimsupport' && c.actionKey === 'cs_action' && c.action === 'claim_support_search' &&
          c.params && c.params.claim === 'billionaires paid less tax than nurses')
        ok('backend call: PF.postAction(claimsupport, cs_action, claim_support_search, {claim})');
      else no('backend call', 'wrong call shape: ' + JSON.stringify(c));
    } else no('backend call', 'postAction not called once');
  })();

  /* results + card rendering */
  var envR = makeEnv({ warcard: true });
  var docR = searchFlow(envR);
  envR.getPostCb()({ ok: true, results: [RES1, RES2], sources_down: [] });
  (function () {
    var cards = docR.getElementById('xAmmo').querySelectorAll('.am-card');
    if (cards.length === 2) ok('results: 2 source cards rendered');
    else no('results', 'expected 2 cards, got ' + cards.length);
    var a = cards[0].querySelector('a.am-head');
    if (a && a.getAttribute('href') === 'https://example.com/one' &&
        a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener' &&
        a.textContent === 'Headline One') ok('card: headline link opens in new tab');
    else no('card link', 'headline link malformed');
    var meta = cards[0].querySelector('.am-meta');
    if (meta && /The Outlet/.test(meta.textContent) && /Oct 4 2026/.test(meta.textContent))
      ok('card: outlet + date shown');
    else no('card meta', 'outlet/date missing');
    var ex = cards[0].querySelector('.am-ex');
    if (ex && ex.textContent === 'Excerpt one.') ok('card: excerpt shown');
    else no('card excerpt', 'excerpt missing');
    var all = docR.getElementById('am-copyall');
    if (all && all.textContent === 'COPY ALL CITATIONS') ok('"copy all" button present above results');
    else no('copy all button', 'missing');
  })();

  /* copy citation — exact plain-text format, no markdown */
  await (async function () {
    var btn = docR.getElementById('xAmmo').querySelector('[data-am-copy="0"]');
    fire(btn, 'click');
    await new Promise(function (r) { setImmediate(r); });
    if (envR.clips[0] === CIT1) ok('copy citation: exact "Headline — Outlet, Date\\nURL"');
    else no('copy citation', 'got: ' + JSON.stringify(envR.clips[0]));
    var t = envR.clips[0] || '';
    if (t.indexOf('**') === -1 && t.indexOf('](') === -1 && !/^#/m.test(t) && t.indexOf('*') === -1)
      ok('copy citation: plain text, no markdown');
    else no('citation markdown', 'markdown detected in citation');
  })();

  /* copy all */
  await (async function () {
    fire(docR.getElementById('am-copyall'), 'click');
    await new Promise(function (r) { setImmediate(r); });
    var last = envR.clips[envR.clips.length - 1];
    if (last === CIT1 + '\n\n' + CIT2) ok('copy all: every citation joined by blank lines');
    else no('copy all', 'got: ' + JSON.stringify(last));
  })();

  /* XSS escaping */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    env.getPostCb()({ ok: true, results: [{
      title: '<script>alert(1)</script>', source: 'Evil <b>Outlet</b>',
      date: 'today', url: 'javascript:alert(2)', excerpt: '<img src=x onerror=alert(3)>'
    }], sources_down: [] });
    var raw = doc.getElementById('xAmmo').innerHTML;
    if (raw.indexOf('&lt;script&gt;') !== -1 && raw.indexOf('<script>alert') === -1)
      ok('backend HTML is escaped (no raw tags)');
    else no('escaping', 'raw HTML leaked into cards');
    var links = doc.getElementById('xAmmo').querySelectorAll('a.am-head');
    if (links.length === 0) ok('non-http(s) URL is not rendered as a link');
    else no('url safety', 'javascript: URL became a link');
  })();

  /* no-results */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    env.getPostCb()({ ok: true, results: [], sources_down: [] });
    var e = doc.getElementById('xAmmo').querySelector('.am-empty');
    if (e && e.textContent === 'No sources found — try fewer or broader words.')
      ok('no-results state copy exact');
    else no('no-results', 'wrong or missing copy');
  })();

  /* error state + retry */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    env.getPostCb()(null); /* network fail */
    var e = doc.getElementById('xAmmo').querySelector('.am-err');
    if (e && e.textContent.indexOf('Ammo dry right now. Try again in a bit.') !== -1)
      ok('error state: friendly copy, no stack trace');
    else no('error state', 'wrong or missing error copy');
    var raw = doc.getElementById('xAmmo').innerHTML;
    if (/Error|error:|TypeError|stack/i.test(raw.replace('Ammo dry right now. Try again in a bit.', '')))
      no('error leak', 'technical error text leaked into UI');
    else ok('error state: no technical detail leaked');
    var retry = doc.getElementById('xAmmo').querySelector('[data-am-retry]');
    if (retry) {
      fire(retry, 'click');
      if (env.postCalls.length === 2) ok('retry button re-fires the search');
      else no('retry', 'postAction not re-fired');
    } else no('retry button', 'missing');
    /* !ok response also lands in error state */
    env.getPostCb()({ ok: false, err: 'db error' });
    var e2 = doc.getElementById('xAmmo').querySelector('.am-err');
    if (e2 && e2.textContent.indexOf('Ammo dry right now. Try again in a bit.') !== -1)
      ok('!ok response: same friendly error state');
    else no('!ok handling', 'wrong state');
  })();

  /* sources_down note */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    env.getPostCb()({ ok: true, results: [RES1], sources_down: ['news-api'] });
    var d = doc.getElementById('xAmmo').querySelector('.am-down');
    if (d && /Some sources are down right now/.test(d.textContent))
      ok('sources_down: "some sources unavailable" note shown');
    else no('sources_down', 'note missing');
  })();

  /* Enter key submits */
  (function () {
    var env = makeEnv({ warcard: true });
    loadModule(env);
    var input = env.doc.getElementById('am-claim');
    input.value = 'unions built the middle class';
    fire(input, 'keydown', { key: 'Enter' });
    if (env.postCalls.length === 1 && env.postCalls[0].params.claim === 'unions built the middle class')
      ok('Enter key submits the claim');
    else no('enter key', 'did not submit');
  })();

  /* PF surface actually used — no XP-adjacent calls possible */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = searchFlow(env);
    env.getPostCb()({ ok: true, results: [RES1], sources_down: [] });
    fire(doc.getElementById('xAmmo').querySelector('[data-am-copy="0"]'), 'click');
    var allowed = { skip: 1, toast: 1, postAction: 1 };
    var bad = env.pfGets.filter(function (k) { return !allowed[k]; });
    if (bad.length === 0) ok('module only touches PF.skip / PF.toast / PF.postAction');
    else no('PF surface', 'unexpected PF members used: ' + bad.join(','));
  })();

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
}

main().catch(function (e) { console.error('HARNESS CRASH: ' + (e && e.stack || e)); process.exit(1); });
