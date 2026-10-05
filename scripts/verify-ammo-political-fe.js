#!/usr/bin/env node
/* scripts/verify-ammo-political-fe.js — Ammo Finder POLITICAL mode + Forge
   prefill-reader verification harness (weave #2, 2026-10-05).
   Run from the worktree root:
     node scripts/verify-ammo-political-fe.js
   1. node --check on ammo.js + poster-forge.js
   2. Static checks (political contract strings, pf_forge_prefill_v1 stash
      contract in both files, kill-switch inheritance, zero-XP, honest
      copy, banned terms)
   3. Mocked-browser runtime tests (vm + DOM shim extracted from
      verify-ammo-fe.js): mode tabs, political search/detail/forge flows,
      fail-soft unavailable state, forge stash shape, prefill-reader
      behavior with/without PFStudio.applyPrefill.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
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
            .replace(/(^|[^:/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
['v1.4.3/games/ammo.js', 'v1.4.3/games/poster-forge.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var src = read(path.join(V, 'games', 'ammo.js'));
var forgeSrc = read(path.join(V, 'games', 'poster-forge.js'));
var code = stripComments(src);

console.log('== 2. static contract checks ==');
['ammo', 'ammo_action', 'ammo_political_search', 'ammo_political_detail'].forEach(function (s) {
  if (src.indexOf(s) !== -1) ok('political contract string: ' + s);
  else no('political contract', s + ' missing from ammo.js');
});
if (src.indexOf('pf_forge_prefill_v1') !== -1 && forgeSrc.indexOf('pf_forge_prefill_v1') !== -1)
  ok('pf_forge_prefill_v1 stash contract in ammo.js + poster-forge.js');
else no('stash contract', 'pf_forge_prefill_v1 missing from one side');
if (forgeSrc.indexOf('PFStudio.applyPrefill') !== -1)
  ok('poster-forge defers to PFStudio.applyPrefill when present');
else no('applyPrefill', 'poster-forge does not check PFStudio.applyPrefill');
/* Kill switch: political mode lives inside the same IIFE guarded by
   PF.skip('ammo') — one kill covers both modes. */
if (/PF\.skip\(['"]ammo['"]\)/.test(src) && src.indexOf("setMode('political')") !== -1)
  ok('political mode inherits the ?pf_off=ammo kill switch');
else no('kill switch', 'political mode not under PF.skip("ammo")');
if (!/\bxpGrant\b/.test(code) && !/\bxp\b/i.test(code.replace(/expert|explain/gi, '')))
  ok('zero-XP: no XP calls or XP-adjacent logic in political code');
else no('no-XP rule', 'xp-like token found in ammo.js code');
['"—" means no verified position on record — never guessed', 'Political data not loaded yet',
 'verified positions only, nothing invented', 'Nothing auto-publishes'].forEach(function (s) {
  if (src.indexOf(s) !== -1) ok('honest copy: "' + s.slice(0, 40) + '…"');
  else no('honest copy', 'missing: ' + s.slice(0, 40));
});
if (src.indexOf('STALE RATING') !== -1) ok('stale-rating banner copy present');
else no('stale copy', 'stale banner missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in ammo.js');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane" in ammo.js');
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
  if (n === 'value') this.value = String(v); /* DOM-faithful: value attr sets the property */
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
      contains: function (c) { return self._classes.indexOf(c) !== -1; },
      toggle: function (c, force) {
        var has = self._classes.indexOf(c) !== -1;
        var want = (typeof force === 'boolean') ? force : !has;
        if (want && !has) self._classes.push(c);
        if (!want && has) self._classes = self._classes.filter(function (x) { return x !== c; });
        return want;
      }
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
  /* minimal sessionStorage (recent searches + bank inbox) */
  var store = {};
  sandbox.sessionStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
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

function loadAmmo(env) {
  vm.runInNewContext(read(path.join(V, 'games', 'ammo.js')), env.sandbox, { filename: 'ammo.js' });
}
function loadForgeReader(env) {
  /* The prefill reader is the last IIFE in poster-forge.js and has no
     dependencies on the rest of the file — run it standalone. */
  var full = read(path.join(V, 'games', 'poster-forge.js'));
  var idx = full.indexOf('/* pf_forge_prefill_v1 reader');
  if (idx === -1) throw new Error('reader IIFE not found');
  vm.runInNewContext(full.slice(idx), env.sandbox, { filename: 'poster-forge-reader.js' });
}

/* ---------- canned political backend payloads ---------- */
var POL_SEARCH_RES = {
  ok: true, available: true,
  results: [
    { kind: 'rep', id: 'T000001', title: 'Test Senator', subtitle: 'Democrat · TX Senate', meta: {} },
    { kind: 'bill', id: 'HR-22', title: 'HR-22 — SAVE Act', subtitle: 'Status: passed-house', meta: {} },
    { kind: 'race', id: 'tx-senate', title: 'TX-Senate — U.S. Senate', subtitle: 'Toss-up (+2.7)', meta: {} }
  ]
};
var POL_DETAIL_REP = {
  ok: true, kind: 'rep', id: 'T000001', title: 'Test Senator (Democrat · TX Senate)',
  detail: {
    name: 'Test Senator', party: 'Democrat', chamber: 'Senate', district: 'TX Senate',
    state: 'TX', phone: '202-224-0000', url: 'https://example.org',
    source: 'congress.gov roll-call records via Political HQ scorecards',
    votes: [
      { vote_id: 'v1', vote_date: '2025-01-22', question: 'On Passage', bill_id: 'S.5', bill_title: 'Laken Riley Act', position: 'Yea', source_url: 'https://x' },
      { vote_id: 'v2', vote_date: '2025-01-20', question: 'On Passage', bill_id: 'S.5', bill_title: 'Laken Riley Act', position: '—', source_url: 'https://y' }
    ]
  },
  forge_cards: [
    { plugin_id: 'scorecard', template_id: 'scorecard-attack', label: 'FORGE: SCORECARD CARD', data: { bioguide_id: 'T000001' }, source: 'scorecards', fetched_at: '2026-10-05T00:00:00.000Z' },
    { plugin_id: 'rep', template_id: 'rep-contact', label: 'FORGE: CONTACT CARD', data: { bioguide_id: 'T000001' }, source: 'directory', fetched_at: '2026-10-05T00:00:00.000Z' }
  ]
};
var POL_DETAIL_RACE_STALE = {
  ok: true, kind: 'race', id: 'tx-senate', title: 'TX-Senate — U.S. Senate',
  detail: {
    seat: 'TX-Senate', office: 'U.S. Senate', state: 'TX', rating: 'Toss-up (+2.7)',
    poll_margin: '+2.7', stakes: 'Open seat.', source: 'RCP', source_date: '2026-09-01',
    stale: true, source_note: 'RCP via races tracker — STALE: older than 14 days',
    candidates: [{ name: 'A', party: 'D', funding: 'small-dollar', classTake: '' }]
  },
  forge_cards: [
    { plugin_id: 'race', template_id: 'race-card', label: 'FORGE: RACE CARD', data: { race_id: 'tx-senate', stale: true }, source: 'races', fetched_at: '2026-10-05T00:00:00.000Z' }
  ]
};

function polSearchFlow(env) {
  loadAmmo(env);
  var doc = env.doc;
  fire(doc.getElementById('am-mode-political'), 'click');
  doc.getElementById('am-claim').value = 'texas';
  fire(doc.getElementById('am-go'), 'click');
  return doc;
}

async function main() {
  console.log('== 3. mocked-browser runtime ==');

  /* mode tabs render; political tab switches placeholder + button + pane */
  (function () {
    var env = makeEnv({ warcard: true });
    loadAmmo(env);
    var doc = env.doc;
    var ms = doc.getElementById('am-mode-sources'), mp = doc.getElementById('am-mode-political');
    if (ms && mp) ok('SOURCES + POLITICAL mode tabs render');
    else { no('mode tabs', 'am-mode-sources/political missing'); return; }
    fire(mp, 'click');
    var input = doc.getElementById('am-claim');
    if (input.placeholder === 'e.g. Ted Cruz, HR-22, texas senate') ok('political placeholder swaps in');
    else no('placeholder', 'wrong political placeholder: ' + input.placeholder);
    if (doc.getElementById('am-go').textContent === 'FIND TARGETS') ok('go button reads FIND TARGETS');
    else no('go label', 'go button label wrong in political mode');
    var empty = doc.getElementById('xAmmo').querySelector('.am-empty');
    if (empty && /verified positions only, nothing invented/.test(empty.textContent))
      ok('political empty state carries the honesty line');
    else no('empty state', 'political empty state missing honesty copy');
    fire(ms, 'click');
    if (doc.getElementById('am-go').textContent === 'FIND AMMO') ok('switching back restores SOURCES mode');
    else no('mode back', 'SOURCES mode not restored');
  })();

  /* political search: backend call shape + kind badges */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    if (env.postCalls.length === 1) {
      var c = env.postCalls[0];
      if (c.type === 'ammo' && c.actionKey === 'ammo_action' && c.action === 'ammo_political_search' &&
          c.params && c.params.query === 'texas')
        ok('search calls PF.postAction(ammo, ammo_action, ammo_political_search, {query})');
      else no('search call', 'wrong call shape: ' + JSON.stringify(c));
    } else no('search call', 'postAction not called once');
    env.getPostCb()(POL_SEARCH_RES);
    var badges = doc.getElementById('xAmmo').querySelectorAll('.am-kind');
    if (badges.length === 3) ok('3 results render with kind badges (REP/BILL/RACE)');
    else no('kind badges', 'expected 3 .am-kind badges, got ' + badges.length);
  })();

  /* fail-soft: available:false -> "not loaded yet", no crash */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    env.getPostCb()({ ok: true, available: false, missing: ['congress_members', 'bills'] });
    var empty = doc.getElementById('xAmmo').querySelector('.am-empty');
    if (empty && /Political data not loaded yet/.test(empty.textContent) && /congress_members/.test(empty.textContent))
      ok('fail-soft: available=false renders "not loaded yet" with missing tables');
    else no('fail-soft', 'unavailable state wrong or missing');
  })();

  /* detail: rep voting record, missing position renders — */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    env.getPostCb()(POL_SEARCH_RES);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-pol]'), 'click');
    var dc = env.postCalls[1];
    if (dc && dc.action === 'ammo_political_detail' && dc.params.kind === 'rep' && dc.params.id === 'T000001')
      ok('result click loads ammo_political_detail {kind:rep, id}');
    else no('detail call', 'wrong detail call: ' + JSON.stringify(dc));
    env.getPostCb()(POL_DETAIL_REP);
    var tbl = doc.getElementById('xAmmo').querySelector('.am-votes');
    if (tbl && /Yea/.test(tbl.textContent) && /—/.test(tbl.textContent))
      ok('voting record renders verified Yea + "—" for the missing position');
    else no('voting record', 'record table wrong');
    if (/never guessed/.test(doc.getElementById('xAmmo').textContent))
      ok('missing-position honesty line rendered');
    else no('honesty line', '"never guessed" copy missing');
    var forges = doc.getElementById('xAmmo').querySelectorAll('[data-am-forge]');
    if (forges.length === 2) ok('2 FORGE THIS buttons on rep detail');
    else no('forge buttons', 'expected 2, got ' + forges.length);
  })();

  /* forge: stash shape + navigation to /create */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    env.getPostCb()(POL_SEARCH_RES);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-pol]'), 'click');
    env.getPostCb()(POL_DETAIL_REP);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-forge]'), 'click');
    var raw = env.sandbox.sessionStorage.getItem('pf_forge_prefill_v1');
    var p = null;
    try { p = JSON.parse(raw); } catch (e) {}
    if (p && p.v === 1 && p.plugin_id === 'scorecard' && p.template_id === 'scorecard-attack' &&
        p.source === 'scorecards' && p.fetched_at && p.stashed_at && p.data)
      ok('FORGE THIS stashes pf_forge_prefill_v1 {v, plugin_id, template_id, data, source, fetched_at, stashed_at}');
    else no('stash', 'stash shape wrong: ' + raw);
    if (env.sandbox.window.location.href === '/create') ok('FORGE THIS navigates to /create');
    else no('navigate', 'location.href = ' + env.sandbox.window.location.href);
  })();

  /* forge fail-closed: stash write throws -> toast, no navigation */
  (function () {
    var env = makeEnv({ warcard: true });
    env.sandbox.sessionStorage.setItem = function () { throw new Error('denied'); };
    var doc = polSearchFlow(env);
    env.getPostCb()(POL_SEARCH_RES);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-pol]'), 'click');
    env.getPostCb()(POL_DETAIL_REP);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-forge]'), 'click');
    if (env.toasts.indexOf('Could not stage the payload — try again.') !== -1)
      ok('stash failure toasts instead of navigating blind');
    else no('stash fail-closed', 'missing fail-closed toast');
    if (env.sandbox.window.location.href !== '/create') ok('stash failure: no navigation');
    else no('stash fail-closed nav', 'navigated despite stash failure');
  })();

  /* stale race: banner + stale rides into the forge payload */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    env.getPostCb()(POL_SEARCH_RES);
    var links = doc.getElementById('xAmmo').querySelectorAll('[data-am-pol]');
    fire(links[2], 'click');
    env.getPostCb()(POL_DETAIL_RACE_STALE);
    var stale = doc.getElementById('xAmmo').querySelector('.am-stale');
    if (stale && /STALE RATING/.test(stale.textContent)) ok('stale race renders the STALE RATING banner');
    else no('stale banner', 'stale banner missing');
    fire(doc.getElementById('xAmmo').querySelector('[data-am-forge]'), 'click');
    var p = JSON.parse(env.sandbox.sessionStorage.getItem('pf_forge_prefill_v1'));
    if (p.data && p.data.stale === true) ok('stale flag rides into the forge payload');
    else no('stale payload', 'stale flag missing from payload');
  })();

  /* back button returns to results */
  (function () {
    var env = makeEnv({ warcard: true });
    var doc = polSearchFlow(env);
    env.getPostCb()(POL_SEARCH_RES);
    fire(doc.getElementById('xAmmo').querySelector('[data-am-pol]'), 'click');
    env.getPostCb()(POL_DETAIL_REP);
    fire(doc.getElementById('am-polback'), 'click');
    var badges = doc.getElementById('xAmmo').querySelectorAll('.am-kind');
    if (badges.length === 3) ok('BACK TO TARGETS returns to the results list');
    else no('back button', 'did not return to results');
  })();

  /* sources mode regression: original claim flow untouched */
  (function () {
    var env = makeEnv({ warcard: true });
    loadAmmo(env);
    var doc = env.doc;
    doc.getElementById('am-claim').value = 'billionaires taxes';
    fire(doc.getElementById('am-go'), 'click');
    var c = env.postCalls[0];
    if (c && c.type === 'claimsupport' && c.action === 'claim_support_search')
      ok('SOURCES mode still calls claim_support_search (regression)');
    else no('sources regression', 'sources flow broken: ' + JSON.stringify(c));
  })();

  /* prefill reader: no PFStudio -> toast once, stash KEPT */
  (function () {
    var env = makeEnv({ warcard: true });
    var stash = { v: 1, plugin_id: 'bill', template_id: 'bill-status', label: 'x', data: {}, source: 's', fetched_at: 't', stashed_at: 1 };
    env.sandbox.sessionStorage.setItem('pf_forge_prefill_v1', JSON.stringify(stash));
    loadForgeReader(env);
    if (env.sandbox.sessionStorage.getItem('pf_forge_prefill_v1') !== null)
      ok('reader without PFStudio keeps the stash for later');
    else no('reader stash', 'stash dropped without PFStudio');
    if (env.toasts.some(function (m) { return /not live yet/.test(m); }))
      ok('reader without PFStudio toasts once');
    else no('reader toast', 'missing "not live yet" toast');
  })();

  /* prefill reader: PFStudio.applyPrefill present -> applied + stash cleared */
  (function () {
    var env = makeEnv({ warcard: true });
    var stash = { v: 1, plugin_id: 'bill', template_id: 'bill-status', label: 'FORGE: BILL STATUS CARD', data: {}, source: 's', fetched_at: 't', stashed_at: 1 };
    env.sandbox.sessionStorage.setItem('pf_forge_prefill_v1', JSON.stringify(stash));
    var applied = null;
    env.sandbox.window.PFStudio = { applyPrefill: function (p) { applied = p; return true; } };
    loadForgeReader(env);
    if (applied && applied.template_id === 'bill-status') ok('reader hands payload to PFStudio.applyPrefill');
    else no('reader handoff', 'applyPrefill not called with payload');
    if (env.sandbox.sessionStorage.getItem('pf_forge_prefill_v1') === null)
      ok('reader clears the stash after successful apply');
    else no('reader clear', 'stash not cleared after apply');
  })();

  /* prefill reader: applyPrefill returns false -> stash kept */
  (function () {
    var env = makeEnv({ warcard: true });
    env.sandbox.sessionStorage.setItem('pf_forge_prefill_v1', JSON.stringify({ v: 1, plugin_id: 'bill', template_id: 'bill-status' }));
    env.sandbox.window.PFStudio = { applyPrefill: function () { return false; } };
    loadForgeReader(env);
    if (env.sandbox.sessionStorage.getItem('pf_forge_prefill_v1') !== null)
      ok('reader keeps the stash when applyPrefill reports failure');
    else no('reader fail', 'stash dropped on failed apply');
  })();

  /* prefill reader: no stash -> silent no-op */
  (function () {
    var env = makeEnv({ warcard: true });
    loadForgeReader(env);
    if (env.toasts.length === 0) ok('reader with no stash is a silent no-op');
    else no('reader no-op', 'toasted with no stash present');
  })();

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { fails.forEach(function (f) { console.log('  FAILED: ' + f); }); process.exit(1); }
}

main().catch(function (e) { console.error('HARNESS ERROR:', e); process.exit(1); });
