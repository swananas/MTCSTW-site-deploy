#!/usr/bin/env node
/* scripts/verify-fred-creator-fe.js — Wave A3 (S-11 + S-28) frontend harness.
   Run from the worktree root:
     node scripts/verify-fred-creator-fe.js
   1. node --check on the touched files
   2. Static checks (kill switches, backend contract shape, honest copy,
      zero-XP token, banned terms, bundle marker). NOTE (AGENTS.md lesson):
      no naive quote-stripping — comment-strip only, never string-strip.
   3. Mocked-browser runtime tests (vm + minimal DOM shim + JSONP capture):
      mount paths, kill switches, card rendering, citation copy format,
      honest empty/stale/error states, release-prompt gating, dismiss,
      XSS escaping, PF surface discipline.
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
/* Comment-strip ONLY (no quote stripping — the esc() /"/g pattern breaks
   naive string strippers; see AGENTS.md). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
/* The hq bundle regenerates unrelated churn (stale committed bundle at base);
   Wave A3 keeps its diff surgical — revert it if the rebuild touched it. */
try {
  var hqDiff = cp.execSync('git -C ' + ROOT + ' diff --name-only -- v1.4.3/games/bundle-hq.js',
    { encoding: 'utf8' }).trim();
  if (hqDiff) {
    cp.execSync('git -C ' + ROOT + ' checkout -- v1.4.3/games/bundle-hq.js');
    ok('bundle-hq.js regeneration churn reverted (unrelated to this wave)');
  } else ok('bundle-hq.js untouched by rebuild');
} catch (e) { no('bundle-hq revert', e && e.message); }

console.log('== 1. node --check ==');
['v1.4.3/games/ammo-citations.js', 'build/bundle.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var src = read(path.join(V, 'games', 'ammo-citations.js'));
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]ammo-figures['"]\)/.test(src)) ok('kill switch PF.skip("ammo-figures") wired');
else no('kill figures', 'PF.skip("ammo-figures") not found');
if (/PF\.skip\(['"]release-prompts['"]\)/.test(src)) ok('kill switch PF.skip("release-prompts") wired');
else no('kill prompts', 'PF.skip("release-prompts") not found');
if (src.indexOf('?pf_off=ammo-figures') !== -1 && src.indexOf('?pf_off=release-prompts') !== -1)
  ok('KILL comment documents both switches');
else no('kill comments', 'missing ?pf_off docs in header');

['fred_citations', 'fred_release_prompts'].forEach(function (s) {
  if (src.indexOf(s) !== -1) ok('contract string present: ' + s);
  else no('contract string', s + ' missing');
});
if (/CONFIRMED/.test(src) && src.indexOf('be/fred-creator') !== -1)
  ok('backend contract marked CONFIRMED (be/fred-creator)');
else no('contract CONFIRMED marker', 'missing CONFIRMED / be/fred-creator note');

if (src.indexOf('OFFICIAL FIGURES NOT CONNECTED YET') !== -1)
  ok('honest empty copy: not connected');
else no('honest empty', 'OFFICIAL FIGURES NOT CONNECTED YET missing');
/* Source holds the unicode escape; the rendered char appears at runtime. */
if (src.indexOf('FIGURE STALE \\u2014 DO NOT CITE') !== -1)
  ok('stale suppression copy present');
else no('stale copy', 'stale banner copy missing');
if (src.indexOf('Official figures are down right now. Try again in a bit.') !== -1)
  ok('error state copy exact (no stack trace)');
else no('error copy', 'friendly backend-down copy missing');
if (src.indexOf('target="_blank"') !== -1 && src.indexOf('rel="noopener"') !== -1)
  ok('FRED links open in new tab (target=_blank + noopener)');
else no('link target', 'new-tab link attrs missing');

if (!/\bxp\b/i.test(code)) ok('zero-XP token check (no xp word-token in code)');
else no('zero-XP rule', 'found xp-like token: ' +
  (code.match(/\S{0,20}\bxp\b\S{0,20}/i) || ['?'])[0]);
if (code.indexOf('postAction') === -1) ok('module never touches PF.postAction (GET rails only)');
else no('PF surface', 'postAction referenced');
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane"');

var bundleCreate = read(path.join(V, 'games', 'bundle-create.js'));
if (bundleCreate.indexOf('ammo-citations.js') !== -1) ok('ammo-citations.js marker in rebuilt bundle-create.js');
else no('bundle marker', 'ammo-citations.js missing from bundle-create.js');
if (has(path.join(ROOT, 'build', 'bundle.js'), "'ammo-citations.js'"))
  ok('ammo-citations.js registered in build/bundle.js (bundle-create)');
else no('bundle registration', 'ammo-citations.js not in SECTIONS');

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
  this.disabled = false;
  this.scrolled = false;
}
El.prototype.getAttribute = function (n) {
  return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
};
El.prototype.setAttribute = function (n, v) {
  this.attrs[n] = String(v);
  if (n === 'class') this._classes = String(v).split(/\s+/).filter(Boolean);
  if (n === 'value') this.value = String(v);
};
El.prototype.removeAttribute = function (n) { delete this.attrs[n]; };
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
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i !== -1) this.children.splice(i, 1);
  c.parentNode = null;
  return c;
};
El.prototype.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
El.prototype.addEventListener = function (t, fn) {
  (this.listeners[t] = this.listeners[t] || []).push(fn);
};
El.prototype.select = function () {};
El.prototype.scrollIntoView = function () { this.scrolled = true; };
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
    while ((am = are.exec(attrStr))) el.setAttribute(am[1], am[2] === undefined ? '' : am[2]);
    if (el.attrs['class']) el._classes = el.attrs['class'].split(/\s+/).filter(Boolean);
    if (el.attrs.disabled !== undefined && el.attrs.disabled !== null) el.disabled = true;
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

var CIT_FIX = {
  ok: true, fred_live: true, retrieved_at: 1728048000000, citations: [
    { series_id: 'CPIAUCNS', title: 'CPI \u2014 ALL ITEMS (YoY)', frequency: 'monthly',
      sa_nsa: 'NSA', period: '2026-08', period_label: 'Aug 2026', value: 334.98,
      value_label: '334.98', change_basis: 'yoy', change: 10.72, change_label: '+10.72',
      change_pct: 3.31, change_pct_label: '+3.3% YoY',
      headline: 'CONSUMER PRICES +3.3% YOY \u2014 AUG 2026',
      talking_point: 'Consumer prices are up +3.3% YoY in the year to Aug 2026 (CPI-U, NSA).',
      citation: 'Consumer prices rose 3.3% in the year to Aug 2026 (CPI-U, NSA \u2014 ' +
        'U.S. Bureau of Labor Statistics via FRED; retrieved Oct 5, 2026) ' +
        'https://fred.stlouisfed.org/series/CPIAUCNS',
      source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS',
      retrieved_at: 1728048000000, vintage_date: '2026-10-05', stale: false, stale_note: null },
    { series_id: 'CPILFESL', title: 'CORE CPI (YoY)', frequency: 'monthly',
      sa_nsa: 'SA', period: '2026-08', period_label: 'Aug 2026', value: 345.12,
      value_label: '345.12', change_basis: 'yoy', change: 9.72, change_label: '+9.72',
      change_pct: 2.9, change_pct_label: '+2.9% YoY',
      headline: 'CORE CPI +2.9% YOY \u2014 AUG 2026',
      talking_point: 'Even stripping food & energy, prices rose +2.9% YoY in the year to Aug 2026 (core CPI, SA).',
      citation: 'Core consumer prices, excluding food and energy, rose 2.9% in the year to Aug 2026 ' +
        '(core CPI, SA \u2014 U.S. Bureau of Labor Statistics via FRED; retrieved Oct 5, 2026) ' +
        'https://fred.stlouisfed.org/series/CPILFESL',
      source: 'U.S. Bureau of Labor Statistics via FRED',
      source_url: 'https://fred.stlouisfed.org/series/CPILFESL',
      retrieved_at: 1728048000000, vintage_date: '2026-10-05', stale: false, stale_note: null },
    { series_id: 'PCEPI', title: 'PCE PRICE INDEX (YoY)', frequency: 'monthly',
      sa_nsa: 'SA', period: '2026-08', period_label: 'Aug 2026', value: 126.40,
      value_label: '126.40', change_basis: 'yoy', change: 3.2, change_label: '+3.20',
      change_pct: 2.6, change_pct_label: '+2.6% YoY',
      headline: 'PCE PRICE INDEX +2.6% YOY \u2014 AUG 2026',
      talking_point: "The Fed's preferred gauge: prices up +2.6% YoY in the year to Aug 2026 (PCE, SA).",
      citation: 'Prices rose 2.6% in the year to Aug 2026 on the PCE index, the Fed\u2019s preferred inflation gauge ' +
        '(PCE, SA \u2014 U.S. Bureau of Economic Analysis via FRED; retrieved Oct 5, 2026) ' +
        'https://fred.stlouisfed.org/series/PCEPI',
      source: 'U.S. Bureau of Economic Analysis via FRED',
      source_url: 'https://fred.stlouisfed.org/series/PCEPI',
      retrieved_at: 1728048000000, vintage_date: '2026-10-05', stale: false, stale_note: null },
    { series_id: 'MORTGAGE30US', title: '30-YR MORTGAGE', frequency: 'weekly',
      sa_nsa: 'NSA', period: '2026-10-01', period_label: '2026-10-01', value: 6.35,
      value_label: '6.35', change_basis: 'wow', change: 0.04, change_label: '+0.04 pp',
      change_pct: 0.63, change_pct_label: '+0.6%',
      headline: '30-YEAR MORTGAGE 6.35% \u2014 WEEK OF OCT 1, 2026',
      talking_point: 'The 30-year mortgage averaged 6.35% this week \u2014 while landlords keep raising rent.',
      citation: 'The 30-year fixed mortgage averaged 6.35% in the week of Oct 1, 2026 ' +
        '(30-yr mortgage, NSA \u2014 Freddie Mac via FRED; retrieved Oct 5, 2026) ' +
        'https://fred.stlouisfed.org/series/MORTGAGE30US',
      source: 'Freddie Mac via FRED',
      source_url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
      retrieved_at: 1728048000000, vintage_date: '2026-10-05', stale: false, stale_note: null }
  ], pending_series: [], note: ''
};
var PR_FIX = {
  ok: true, fred_live: true, retrieved_at: 1728048000000, release_window_days: 7, prompts: [
    { kind: 'cpi', series_id: 'CPIAUCNS', headline: 'CPI DAY \u2014 THE FRESH PRINT IS LIVE',
      figure: '+3.3% YoY (Aug 2026)',
      copy: "The new CPI figure is in. Cite the official number before the bosses' press offices spin it.",
      cta: 'GRAB THE CITATION', target: 'figures', days_since_release: 1, stale: false,
      period_label: 'Aug 2026', source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS',
      vintage_date: '2026-10-05', retrieved_at: 1728048000000, copy_review: 'pending' },
    { kind: 'jobs', series_id: 'PAYEMS', headline: 'JOBS DAY \u2014 THE FRESH PRINT IS LIVE',
      figure: '+142k jobs added (Aug 2026)',
      copy: 'The jobs report is in. Anchor your claims to the official count.',
      cta: 'GRAB THE CITATION', target: 'figures', days_since_release: 1, stale: false,
      period_label: 'Aug 2026', source_url: 'https://fred.stlouisfed.org/series/PAYEMS',
      vintage_date: '2026-10-05', retrieved_at: 1728048000000, copy_review: 'pending' }
  ], note: ''
};

function makeEnv(opts) {
  opts = opts || {};
  var root = new El('html');
  var head = new El('head');
  var body = new El('body');
  root.appendChild(head);
  root.appendChild(body);
  if (opts.ammo) {
    var a = new El('div'); a.setAttribute('id', 'pf-ammo'); body.appendChild(a);
  }
  if (opts.warcard) {
    var w = new El('div'); w.setAttribute('id', 'pf-war-card'); body.appendChild(w);
  }
  var toasts = [], clips = [], pending = [], pfGets = [], timers = [];
  var skipIds = opts.skip || [];
  var win = {};
  function docCreate(tag) {
    var el = new El(tag);
    if (String(tag).toLowerCase() === 'script') {
      var realSet = Object.getOwnPropertyDescriptor(El.prototype, 'innerHTML');
      Object.defineProperty(el, 'src', {
        get: function () { return this._src || ''; },
        set: function (v) {
          this._src = String(v);
          var m = this._src.match(/[?&]action=([^&]+)/);
          var c = this._src.match(/[?&]callback=([^&]+)/);
          pending.push({ action: m ? decodeURIComponent(m[1]) : '', callback: c ? c[1] : '', el: el });
        }
      });
      el.onerror = null;
    }
    return el;
  }
  var doc = {
    _root: root, body: body, head: head,
    createElement: docCreate,
    getElementById: function (id) { return findById(root, id); },
    execCommand: function () { return true; }
  };
  var store = {};
  var sandbox = {
    window: win, document: doc, navigator: {},
    setTimeout: function (cb) { timers.push(cb); return timers.length; },
    clearTimeout: function () {},
    console: console,
    sessionStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    }
  };
  win.PF = {
    skip: function (s) { return skipIds.indexOf(s) !== -1; },
    toast: function (m) { toasts.push(m); }
  };
  var PFproxy = new Proxy(win.PF, {
    get: function (t, k) {
      if (typeof k === 'string') pfGets.push(k);
      var v = t[k];
      return (typeof v === 'function') ? v.bind(t) : v;
    }
  });
  win.PF = PFproxy;
  win.location = { href: 'https://mtcstw.com/' };
  win.PF_BACKEND_URL = 'https://pf-api.mtcstw.workers.dev';
  sandbox.navigator.clipboard = { writeText: function (txt) { clips.push(txt); return Promise.resolve(txt); } };
  return {
    doc: doc, sandbox: sandbox, win: win, toasts: toasts, clips: clips,
    pending: pending, pfGets: pfGets, timers: timers, store: store,
    /* answer the oldest pending JSONP request for `action` with fixture */
    respond: function (action, data) {
      for (var i = 0; i < pending.length; i++) {
        if (pending[i].action === action) {
          var cbName = pending[i].callback;
          pending.splice(i, 1);
          if (win[cbName]) win[cbName](data);
          return true;
        }
      }
      return false;
    },
    actions: function () { return pending.map(function (p) { return p.action; }); },
    loadModule: function () {
      vm.runInNewContext(read(path.join(V, 'games', 'ammo-citations.js')), sandbox,
        { filename: 'ammo-citations.js' });
    }
  };
}

async function main() {
  console.log('== 3. mocked-browser runtime ==');

  /* kill: ammo-figures off -> nothing mounts, no backend calls */
  (function () {
    var env = makeEnv({ ammo: true, skip: ['ammo-figures'] });
    env.loadModule();
    if (!env.doc.getElementById('pf-figures')) ok('kill: ?pf_off=ammo-figures leaves no section');
    else no('kill figures', '#pf-figures mounted despite skip');
    if (env.pending.length === 0) ok('kill: no backend call attempted');
    else no('kill calls', 'JSONP fired despite skip');
  })();

  /* kill: release-prompts off -> citations load, no prompt rail */
  (function () {
    var env = makeEnv({ ammo: true, skip: ['release-prompts'] });
    env.loadModule();
    if (env.doc.getElementById('pf-figures')) ok('nudge kill: citations still mount');
    else no('nudge kill mount', '#pf-figures missing');
    var acts = env.actions();
    if (acts.indexOf('fred_citations') !== -1 && acts.indexOf('fred_release_prompts') === -1)
      ok('nudge kill: only fred_citations requested, no release rail');
    else no('nudge kill rails', 'actions: ' + acts.join(','));
    env.respond('fred_citations', CIT_FIX);
    var pf = env.doc.getElementById('pf-prompts');
    if (pf && pf.children.length === 0) ok('nudge kill: no prompt strip rendered');
    else no('nudge kill strip', 'prompt strip present');
  })();

  /* mount: right after #pf-ammo */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    var fig = env.doc.getElementById('pf-figures');
    var ammo = env.doc.getElementById('pf-ammo');
    if (fig && ammo && ammo.nextSibling === fig) ok('mounts right after #pf-ammo');
    else no('mount order', 'not placed after #pf-ammo');
    if (env.doc.getElementById('pf-figures-shell')) ok('citations shell present');
    else no('shell', 'missing');
  })();

  /* mount: fallback after #pf-war-card */
  (function () {
    var env = makeEnv({ warcard: true });
    env.loadModule();
    var fig = env.doc.getElementById('pf-figures');
    var anchor = env.doc.getElementById('pf-figures-anchor');
    var wc = env.doc.getElementById('pf-war-card');
    if (fig && anchor && wc && wc.nextSibling === anchor &&
        anchor.children[0] === fig)
      ok('mounts under the fallback anchor after #pf-war-card');
    else no('fallback mount', 'wrong placement');
  })();

  /* mount: nowhere -> visible banner */
  (function () {
    var env = makeEnv({});
    env.loadModule();
    var b = env.doc.getElementById('pf-figures-missing');
    if (b && /NOWHERE TO MOUNT/.test(b.textContent)) ok('no anchors: visible error banner (never silent)');
    else no('no anchors', 'banner missing');
  })();

  /* citations: 4 cards render with headlines + stamps */
  var envC = makeEnv({ ammo: true });
  envC.loadModule();
  envC.respond('fred_citations', CIT_FIX);
  envC.respond('fred_release_prompts', { ok: true, fred_live: true, prompts: [] });
  (function () {
    var cards = envC.doc.getElementById('xFigures').querySelectorAll('.fig-card');
    if (cards.length === 4) ok('4 citation cards rendered');
    else no('cards', 'expected 4, got ' + cards.length);
    var h = cards[0].querySelector('.fig-head');
    if (h && h.textContent === 'CONSUMER PRICES +3.3% YOY \u2014 AUG 2026') ok('card headline exact');
    else no('headline', 'got: ' + (h && h.textContent));
    var tp = cards[1].querySelector('.fig-tp');
    /* mock DOM does not decode entities: '&amp;' stays literal */
    if (tp && /Even stripping food/.test(tp.textContent)) ok('talking point rendered');
    else no('talking point', 'missing');
    var st = cards[0].querySelector('.fig-src');
    if (st && /FRED/.test(st.textContent) && /CPIAUCNS/.test(st.textContent) &&
        /NSA/.test(st.textContent) && /RETRIEVED/.test(st.textContent))
      ok('source stamp: FRED · series · NSA · retrieved date');
    else no('stamp', 'got: ' + (st && st.textContent));
    var a = cards[0].querySelector('a');
    if (a && a.getAttribute('href') === 'https://fred.stlouisfed.org/series/CPIAUCNS' &&
        a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener')
      ok('FRED link: correct href, new tab, noopener');
    else no('FRED link', 'malformed');
    var btn = cards[0].querySelector('[data-fig-copy="CPIAUCNS"]');
    if (btn && btn.textContent === 'COPY CITATION' && !btn.disabled) ok('copy button labeled + enabled');
    else no('copy button', 'missing or disabled');
  })();

  /* copy citation: exact plain-text, no markdown */
  await (async function () {
    var btn = envC.doc.getElementById('xFigures').querySelector('[data-fig-copy="CPIAUCNS"]');
    fire(btn, 'click');
    await new Promise(function (r) { setImmediate(r); });
    var last = envC.clips[envC.clips.length - 1];
    if (last === CIT_FIX.citations[0].citation) ok('copy citation: exact backend citation text');
    else no('copy citation', 'got: ' + JSON.stringify(last));
    if (last && last.indexOf('**') === -1 && last.indexOf('](') === -1 && !/^#/m.test(last))
      ok('copy citation: plain text, no markdown');
    else no('citation markdown', 'markdown detected');
  })();

  /* honest empty: fred_live false */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    env.respond('fred_citations', { ok: true, fred_live: false, citations: [], pending_series: [], note: 'No official macro data yet — key hand-step open.' });
    var e = env.doc.getElementById('xFigures').querySelector('.fig-empty');
    if (e && /OFFICIAL FIGURES NOT CONNECTED YET/.test(e.textContent) && /hand-step open/.test(e.textContent))
      ok('fred_live:false -> honest empty (no invented figures)');
    else no('empty state', 'wrong copy');
  })();

  /* honest empty: key live, no rows yet */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    env.respond('fred_citations', { ok: true, fred_live: true, citations: [], pending_series: [], note: '' });
    var e = env.doc.getElementById('xFigures').querySelector('.fig-empty');
    if (e && /FIRST REFRESH PENDING/.test(e.textContent)) ok('key+no-rows -> first-refresh honest state');
    else no('waiting state', 'wrong copy');
  })();

  /* error state + retry */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    env.respond('fred_citations', null); /* network fail */
    var e = env.doc.getElementById('xFigures').querySelector('.fig-err');
    if (e && /Official figures are down right now/.test(e.textContent)) ok('error state: friendly copy');
    else no('error state', 'wrong copy');
    var raw = env.doc.getElementById('xFigures').innerHTML;
    if (/TypeError|stack/i.test(raw.replace('Official figures are down right now. Try again in a bit.', '')))
      no('error leak', 'technical detail leaked');
    else ok('error state: no technical detail leaked');
    var retry = env.doc.getElementById('xFigures').querySelector('[data-fig-retry]');
    fire(retry, 'click');
    if (env.actions().indexOf('fred_citations') !== -1) ok('retry re-fires the citation rail');
    else no('retry', 'rail not re-fired');
    env.respond('fred_citations', CIT_FIX);
    if (env.doc.getElementById('xFigures').querySelectorAll('.fig-card').length === 4)
      ok('retry recovery renders the cards');
    else no('retry recovery', 'cards missing');
  })();

  /* stale card: figure suppressed, copy disabled */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    var staleFix = JSON.parse(JSON.stringify(CIT_FIX));
    staleFix.citations[0].stale = true;
    staleFix.citations[0].stale_note = 'Last updated Jun 2026 \u2014 refresh pending.';
    staleFix.citations[0].value = null;
    staleFix.citations[0].headline = null;
    staleFix.citations[0].citation = null;
    env.respond('fred_citations', staleFix);
    var cards = env.doc.getElementById('xFigures').querySelectorAll('.fig-card');
    var st = cards[0].querySelector('.fig-stale');
    if (st && /DO NOT CITE/.test(st.textContent)) ok('stale card: DO NOT CITE banner');
    else no('stale banner', 'missing');
    var btn = cards[0].querySelector('[data-fig-copy="CPIAUCNS"]');
    if (btn && btn.disabled) ok('stale card: copy button disabled');
    else no('stale copy', 'copy still enabled on a stale card');
  })();

  /* pending_series line */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    env.respond('fred_citations', { ok: true, fred_live: true, citations: [CIT_FIX.citations[0]],
      pending_series: ['CPILFESL', 'PCEPI', 'MORTGAGE30US'], note: '' });
    var p = env.doc.getElementById('xFigures').querySelector('.fig-pend');
    if (p && /CPILFESL/.test(p.textContent) && /Still on the way/.test(p.textContent))
      ok('pending_series: honest "still on the way" line');
    else no('pending line', 'missing');
  })();

  /* release prompts: 2 strips, CTA scrolls, dismiss clears */
  var envP = makeEnv({ ammo: true });
  envP.loadModule();
  envP.respond('fred_citations', CIT_FIX);
  envP.respond('fred_release_prompts', PR_FIX);
  (function () {
    var strips = envP.doc.getElementById('pf-prompts').querySelectorAll('.pr-strip');
    if (strips.length === 2) ok('2 release prompts rendered');
    else no('prompts', 'expected 2, got ' + strips.length);
    var h0 = strips[0].querySelector('.pr-head');
    var f0 = strips[0].querySelector('.pr-fig');
    if (h0 && h0.textContent === 'CPI DAY \u2014 THE FRESH PRINT IS LIVE' &&
        f0 && f0.textContent === '+3.3% YoY (Aug 2026)') ok('CPI prompt headline + figure exact');
    else no('prompt copy', 'got: ' + (h0 && h0.textContent));
    var cta = strips[0].querySelector('[data-pr-cta]');
    if (cta && cta.textContent === 'GRAB THE CITATION') ok('prompt CTA labeled');
    else no('prompt CTA', 'missing');
    fire(cta, 'click');
    var tgt = envP.doc.getElementById('pf-figures');
    if (tgt && tgt.scrolled) ok('CTA scrolls to the citations block');
    else no('CTA scroll', 'scrollIntoView not called on #pf-figures');
    var dis = strips[1].querySelector('[data-pr-dismiss]');
    if (dis && dis.getAttribute('aria-label')) ok('dismiss button present + aria-labeled');
    else no('dismiss', 'missing or unlabeled');
    fire(dis, 'click'); /* dismiss the jobs prompt */
    var stripsAfter = envP.doc.getElementById('pf-prompts').querySelectorAll('.pr-strip');
    if (stripsAfter.length === 1 && stripsAfter[0].getAttribute('data-pr-kind') === 'cpi')
      ok('dismiss removes only that prompt; the other strip stays');
    else no('dismiss scope', 'expected 1 remaining strip (cpi), got ' + stripsAfter.length);
    if (envP.store['pf_prompts_dismissed_v1'] === '["jobs"]')
      ok('dismiss recorded as a JSON array in session storage');
    else no('dismiss store', 'got: ' + envP.store['pf_prompts_dismissed_v1']);
    /* a fresh load honors the stored dismissal */
    var envP2 = makeEnv({ ammo: true });
    for (var sk in envP.store) envP2.store[sk] = envP.store[sk];
    envP2.loadModule();
    envP2.respond('fred_citations', CIT_FIX);
    envP2.respond('fred_release_prompts', PR_FIX);
    var strips2 = envP2.doc.getElementById('pf-prompts').querySelectorAll('.pr-strip');
    if (strips2.length === 1 && strips2[0].getAttribute('data-pr-kind') === 'cpi')
      ok('stored dismissal honored on the next load');
    else no('dismiss persistence', 'got ' + strips2.length + ' strips');
  })();

  /* no prompts -> no strip (the honest empty is absence) */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    env.respond('fred_citations', CIT_FIX);
    env.respond('fred_release_prompts', { ok: true, fred_live: true, prompts: [], note: '' });
    if (env.doc.getElementById('pf-prompts').children.length === 0)
      ok('no prompts: nothing rendered (no fake urgency)');
    else no('prompt absence', 'strip rendered with no prompts');
  })();

  /* XSS: escaped HTML, javascript: URL never becomes a link */
  (function () {
    var env = makeEnv({ ammo: true });
    env.loadModule();
    var evil = JSON.parse(JSON.stringify(CIT_FIX));
    evil.citations[0].headline = '<script>alert(1)</script>';
    evil.citations[0].source_url = 'javascript:alert(2)';
    env.respond('fred_citations', evil);
    var raw = env.doc.getElementById('xFigures').innerHTML;
    if (raw.indexOf('&lt;script&gt;') !== -1 && raw.indexOf('<script>alert') === -1)
      ok('backend HTML is escaped (no raw tags)');
    else no('escaping', 'raw HTML leaked');
    var links = env.doc.getElementById('xFigures').querySelectorAll('a');
    var bad = links.filter(function (a) { return /^javascript:/i.test(a.getAttribute('href') || ''); });
    if (bad.length === 0) ok('javascript: URL is not rendered as a link');
    else no('url safety', 'javascript: URL became a link');
  })();

  /* PF surface discipline */
  (function () {
    var bad = envP.pfGets.filter(function (k) { return k !== 'skip' && k !== 'toast'; });
    if (bad.length === 0) ok('module touches only PF.skip / PF.toast');
    else no('PF surface', 'unexpected PF members: ' + bad.join(','));
    if (envP.pending.length === 0) ok('all JSONP rails settled (no dangling requests)');
    else no('dangling rails', envP.actions().join(','));
  })();

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
}

main().catch(function (e) { console.error('HARNESS CRASH: ' + (e && e.stack || e)); process.exit(1); });
