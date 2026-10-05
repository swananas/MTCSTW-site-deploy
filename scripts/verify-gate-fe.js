#!/usr/bin/env node
/* scripts/verify-gate-fe.js — Enlistment Gate (Workstream A) verification.
   Run from the worktree root:  node scripts/verify-gate-fe.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Sections:
   1. node --check on the gate module + touched build/loader files.
   2. Render harness: a minimal DOM shim drives the real gate code —
      hook renders + pays off with no account; kill switch hides everything;
      skip path works; missing-module cases degrade.
   3. Static greps: zero xpGrant anywhere; zero award(/settle(/pf-xp in
      executable code (gate grants nothing itself); banned terms absent.
*/
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var GATE = path.join(V, 'games', 'enlistment-gate.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ================= 1. syntax ================= */
console.log('== 1. node --check ==');
[GATE, path.join(ROOT, 'build', 'bundle.js')].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f)); }
  catch (e) { no(path.basename(f), 'node --check failed'); }
});

/* ================= 2. render harness ================= */
console.log('== 2. render harness (DOM shim) ==');
var SRC = read(GATE);

/* ---- minimal DOM shim: just enough for the gate module ---- */
function makeEnv(opts) {
  opts = opts || {};
  var elements = [], byId = {}, dispatched = [];
  var store = {};
  var ls = {
    getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  function ClassList(el) { this.el = el; }
  ClassList.prototype.add = function (c) {
    var cur = (' ' + (this.el.className || '') + ' ');
    if (cur.indexOf(' ' + c + ' ') === -1) this.el.className = (this.el.className + ' ' + c).trim();
  };
  ClassList.prototype.remove = function (c) {
    this.el.className = (' ' + (this.el.className || '') + ' ').split(' ' + c + ' ').join(' ').trim().replace(/\s+/g, ' ');
  };
  ClassList.prototype.contains = function (c) { return (' ' + (this.el.className || '') + ' ').indexOf(' ' + c + ' ') !== -1; };
  function El(tag, attrs) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = []; this._kids = [];
    this.style = {}; this.className = ''; this.id = '';
    this._html = ''; this.textContent = ''; this.value = ''; this.checked = false;
    this.disabled = false; this.href = ''; this.src = '';
    this._attrs = attrs || {}; this._handlers = {}; this.parent = null;
    if (this._attrs.id) { this.id = this._attrs.id; byId[this.id] = this; }
    if (this._attrs['class']) this.className = this._attrs['class'];
    elements.push(this);
  }
  El.prototype.setAttribute = function (k, v) {
    this._attrs[k] = String(v);
    if (k === 'id') { this.id = String(v); byId[this.id] = this; }
    if (k === 'class') this.className = String(v);
  };
  El.prototype.getAttribute = function (k) { return this._attrs.hasOwnProperty(k) ? this._attrs[k] : null; };
  El.prototype.appendChild = function (c) {
    if (c.tagName === 'SCRIPT' && c.src) fireScript(c);
    this.children.push(c); c.parent = this; return c;
  };
  El.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i !== -1) this.children.splice(i, 1);
    if (c) c.parent = null;
    return c;
  };
  El.prototype.addEventListener = function (t, fn) { (this._handlers[t] = this._handlers[t] || []).push(fn); };
  El.prototype.removeEventListener = function () {};
  El.prototype.click = function () {
    var hs = this._handlers.click || [], e = { preventDefault: function () {} };
    for (var i = 0; i < hs.length; i++) hs[i].call(this, e);
  };
  El.prototype.scrollIntoView = function () {};
  Object.defineProperty(El.prototype, 'classList', { get: function () { if (!this._cl) this._cl = new ClassList(this); return this._cl; } });
  Object.defineProperty(El.prototype, 'parentNode', { get: function () { return this.parent; } });
  Object.defineProperty(El.prototype, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); parseKids(this, this._html); }
  });
  El.prototype.querySelector = function (sel) {
    if (sel.charAt(0) === '#') { var id = sel.slice(1); return findKid(this, id) || byId[id] || null; }
    var all = this.querySelectorAll(sel); return all.length ? all[0] : null;
  };
  El.prototype.querySelectorAll = function (sel) {
    var out = [], want = sel.toUpperCase();
    if (sel.indexOf('.') === 0) { /* .cls */
      var cls = sel.slice(1);
      collectKids(this, function (e) { return (' ' + e.className + ' ').indexOf(' ' + cls + ' ') !== -1; }, out);
    } else if (sel === 'button.r-act') {
      collectKids(this, function (e) { return e.tagName === 'BUTTON' && (' ' + e.className + ' ').indexOf(' r-act ') !== -1; }, out);
    } else if (sel === 'label') {
      collectKids(this, function (e) { return e.tagName === 'LABEL'; }, out);
    }
    return out;
  };
  function eachKid(el, fn) {
    var all = el._kids.concat(el.children), i;
    for (i = 0; i < all.length; i++) {
      fn(all[i]);
      eachKid(all[i], fn);
    }
  }
  function findKid(el, id) {
    var found = null;
    eachKid(el, function (k) { if (!found && k.id === id) found = k; });
    return found;
  }
  function collectKids(el, pred, out) {
    eachKid(el, function (k) { if (pred(k)) out.push(k); });
  }
  /* very small tag parser: registers id/class/data-* stubs for ids */
  function parseKids(el, html) {
    el._kids = [];
    var re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
    while ((m = re.exec(html))) {
      var attrs = {}, am, are = /([a-zA-Z-]+)="([^"]*)"/g;
      while ((am = are.exec(m[2]))) attrs[am[1]] = am[2];
      var kid = new El(m[1], attrs);
      kid.parent = el; el._kids.push(kid);
    }
  }
  function fireScript(sc) {
    /* simulate backend JSONP for known read-only actions */
    setTimeout(function () {
      var src = sc.src || '', cbm = /callback=([^&]+)/.exec(src);
      if (!cbm) return;
      var cb = cbm[1], win = env.window;
      if (typeof win[cb] !== 'function') return;
      if (src.indexOf('action=nuke_status') !== -1) {
        win[cb](opts.nukeStatus !== undefined ? opts.nukeStatus : { ok: true, charge: 48250, armed_charge: 100000 });
      } else if (src.indexOf('action=feed_list') !== -1) {
        win[cb]({ ok: true, events: opts.feedEvents !== undefined ? opts.feedEvents : [{ text: 'comrade pressed the nuke' }] });
      } else if (src.indexOf('action=register') !== -1) {
        win[cb]({ ok: true, xp: 0 });
      }
    }, 5);
  }
  var head = new El('head'), body = new El('body');
  var document = {
    readyState: 'complete',
    head: head, body: body,
    documentElement: new El('html'),
    createElement: function (t) { return new El(t); },
    getElementById: function (id) { return byId[id] || null; },
    querySelectorAll: function (sel) {
      var out = [];
      if (sel === 'button.r-act') {
        for (var i = 0; i < elements.length; i++) {
          var e = elements[i];
          if (e.tagName === 'BUTTON' && (' ' + e.className + ' ').indexOf(' r-act ') !== -1) out.push(e);
        }
      }
      return out;
    },
    addEventListener: function () {},
    dispatchEvent: function (e) { dispatched.push(e.type); return true; }
  };
  var location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  var fetchCalls = [];
  function fakeFetch(url, fopts) {
    fetchCalls.push({ url: url, body: fopts && fopts.body });
    var res = opts.fetchRegister !== undefined ? opts.fetchRegister : { ok: true, xp: 0 };
    return Promise.resolve({ json: function () { return Promise.resolve(res); } });
  }
  function CustomEvent(t, o) { this.type = t; this.detail = (o && o.detail) || null; }
  var window = {
    PF_GATE_HOOK: opts.hook,
    PF_BACKEND_URL: opts.backend === undefined ? '' : opts.backend,
    PF: opts.pf || null,
    __pfGateMounted: false,
    matchMedia: undefined
  };
  var navigator = {};
  var env = { window: window, document: document, location: location, navigator: navigator,
              fetch: fakeFetch, fetchCalls: fetchCalls, store: store, dispatched: dispatched,
              elements: elements, byId: byId, ls: ls };
  /* pre-seed localStorage before the module runs (e.g. seen flag) */
  if (opts.seed) for (var sk2 in opts.seed) store[sk2] = String(opts.seed[sk2]);
  /* run the gate module in this sandbox */
  var factory = new Function('window', 'document', 'localStorage', 'location', 'navigator',
    'fetch', 'setTimeout', 'clearTimeout', 'CustomEvent', SRC + '\n;return window.__pfGate||null;');
  env.gate = factory(window, document, ls, location, navigator, fakeFetch, setTimeout, clearTimeout, CustomEvent);
  return env;
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function el(env, id) { return env.byId[id] || null; }
function dump(n) {
  var s = (n.innerHTML || '') + '|' + (n.textContent || '');
  (n._kids || []).forEach(function (k) { s += dump(k); });
  (n.children || []).forEach(function (k) { s += dump(k); });
  return s;
}
function bodyHTML(env) { var b = el(env, 'pfgBody'); return b ? dump(b) : ''; }

async function run() {
  /* ---- T1: hook renders + pays off with NO account, NO backend ---- */
  var e1 = makeEnv({});
  await sleep(60);
  var ov1 = e1.byId['pf-gate'];
  if (!ov1) no('T1 hook renders', 'overlay #pf-gate not mounted');
  else {
    var btn1 = el(e1, 'pfgHookBtn');
    if (!btn1) no('T1 hook renders', 'hook button missing');
    else {
      btn1.click();
      await sleep(1300); /* detonation visual + payoff delay */
      var h1 = bodyHTML(e1);
      if (h1.indexOf('THAT FELT GOOD') === -1) no('T1 hook payoff', 'payoff copy missing after tap');
      else ok('T1 hook renders + pays off (no account, no backend)');
      if (e1.ls.getItem('pf_ranks_v1')) no('T1 zero XP at hook', 'pf_ranks_v1 written by hook path');
      else ok('T1 zero XP at hook (no ledger write)');
      if (e1.dispatched.indexOf('pf-xp') !== -1) no('T1 no pf-xp event', 'pf-xp dispatched by hook path');
      else ok('T1 no pf-xp event in hook path');
    }
  }

  /* ---- T2: kill switch hides everything ---- */
  var e2 = makeEnv({ search: '?pf_off=gate' });
  await sleep(60);
  if (e2.byId['pf-gate']) no('T2 kill switch', 'overlay mounted despite ?pf_off=gate');
  else ok('T2 kill switch hides everything');

  /* ---- T2b: seen flag hides everything ---- */
  var e2b = makeEnv({ seed: { pf_gate_seen: '1' } });
  await sleep(60);
  if (e2b.byId['pf-gate']) no('T2b seen flag', 'overlay mounted despite pf_gate_seen');
  else ok('T2b seen flag hides everything');

  /* ---- T3: skip path works, sets flag, costs nothing ---- */
  var e3 = makeEnv({});
  await sleep(60);
  var sk = el(e3, 'pfgSkip');
  if (!sk) no('T3 skip link', 'SNEAK IN link missing');
  else {
    sk.click();
    await sleep(30);
    if (e3.ls.getItem('pf_gate_seen') !== '1') no('T3 skip sets flag', 'pf_gate_seen not set');
    else if (e3.byId['pf-gate'] && e3.byId['pf-gate'].parent) no('T3 skip removes overlay', 'overlay still attached');
    else ok('T3 skip path works (flag set, overlay gone, 0 XP)');
  }

  /* ---- T4: full happy path — claim -> enlisted burst -> mission, via existing legs ---- */
  var e4 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', pf: {} });
  /* pre-register EXISTING leg buttons (simulating bundle-sec1's mounted widgets) */
  function legBtn(id, stampFn) {
    var b = e4.document.createElement('button');
    b.className = 'r-act'; b.setAttribute('data-a', id);
    b.addEventListener('click', stampFn);
    e4.document.body.appendChild(b);
    return b;
  }
  legBtn('enlisted', function () { e4.ls.setItem('pf_ranks_v1', JSON.stringify({ xp: 20, got: { enlisted: 'x' } })); });
  legBtn('checkin', function () {
    var day = e4.gate ? e4.gate.chiDay() : 'x';
    e4.ls.setItem('pf_ranks_v1', JSON.stringify({ xp: 22, got: { enlisted: 'x', checkin: day } }));
  });
  await sleep(60);
  /* hook payoff */
  el(e4, 'pfgHookBtn').click();
  await sleep(1300);
  el(e4, 'pfgNext').click(); /* -> claim */
  await sleep(30);
  var csIn = el(e4, 'pfgCs'), age = el(e4, 'pfgAge');
  if (!csIn || !age) no('T4 claim form', 'claim inputs missing');
  else {
    csIn.value = 'testcall'; age.checked = true;
    el(e4, 'pfgClaimBtn').click();
    await sleep(120); /* fetch round-trip */
    var idv = e4.ls.getItem('pf_identity_v1');
    if (!idv || JSON.parse(idv).callsign !== 'testcall') no('T4 claim registers', 'pf_identity_v1 not saved');
    else if (e4.dispatched.indexOf('pf-callsign-claimed') === -1) no('T4 claim event', 'pf-callsign-claimed not dispatched');
    else {
      var eb = bodyHTML(e4);
      if (eb.indexOf('ENLISTED') === -1) no('T4 enlisted moment', 'ENLISTED step missing');
      else {
        await sleep(700); /* leg poll (immediate, buttons exist) */
        var eb2 = bodyHTML(e4);
        if (eb2.indexOf('+20 XP BURST') === -1) no('T4 enlisted burst', '+20 XP burst line missing after leg click');
        else ok('T4 claim -> ENLISTED -> +20 burst via existing enlisted leg');
        el(e4, 'pfgNext').click(); /* -> fight (module missing) */
        await sleep(30);
        var fb = bodyHTML(e4);
        if (fb.indexOf('DROPS SOON') === -1) no('T4 fight degrade', 'missing pick-fight module not handled');
        else ok('T4 missing pick-fight module degrades gracefully');
        el(e4, 'pfgNext').click(); /* -> mission */
        await sleep(700);
        var mbtn = el(e4, 'pfgNext');
        if (!mbtn || mbtn.disabled) no('T4 mission leg', 'mission button not armed');
        else {
          mbtn.click();
          await sleep(60);
          var ob = bodyHTML(e4);
          if (ob.indexOf('THE WORLD OPENS') === -1) no('T4 mission win', 'open step missing after mission');
          else if (ob.indexOf('+2 XP') === -1) no('T4 mission XP', '+2 XP line missing');
          else ok('T4 first mission via existing checkin leg (+2 XP daily)');
          el(e4, 'pfgNext').click(); /* ENTER THE FACTORY */
          await sleep(30);
          if (e4.ls.getItem('pf_gate_seen') !== '1') no('T4 gate seen', 'pf_gate_seen not set on completion');
          else ok('T4 completion sets pf_gate_seen, overlay closes');
        }
      }
    }
  }

  /* ---- T5: missing tally degrades (hook still pays off) ---- */
  var e5 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', nukeStatus: { ok: false } });
  await sleep(80);
  var b5 = el(e5, 'pfgHookBtn');
  if (!b5) no('T5 tally missing', 'hook button missing when tally down');
  else { b5.click(); await sleep(1300); if (bodyHTML(e5).indexOf('THAT FELT GOOD') === -1) no('T5 tally missing', 'payoff missing when tally down'); else ok('T5 missing tally degrades (hook still pays off)'); }

  /* ---- T6: hook (b) self-hides without money data; falls back to (a) ---- */
  var e6 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', hook: 'b', pf: {} });
  await sleep(80);
  var b6 = el(e6, 'pfgHookBtn');
  var h6 = bodyHTML(e6);
  if (!b6) no('T6 hook-b fallback', 'no hook button after (b) self-hide');
  else if (h6.indexOf('UNSEAL') !== -1) no('T6 hook-b invented data', 'reveal card rendered without real money data');
  else { b6.click(); await sleep(1300); if (bodyHTML(e6).indexOf('THAT FELT GOOD') === -1) no('T6 hook-b fallback', 'fallback payoff missing'); else ok('T6 hook (b) self-hides w/o money data, falls back to (a)'); }

  /* ---- T7: hook (c) ticker renders real events; honest empty state ---- */
  var e7 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', hook: 'c', feedEvents: [{ text: 'cell founded in NOLA' }] });
  await sleep(80);
  var h7 = bodyHTML(e7);
  if (h7.indexOf('cell founded in NOLA') === -1) no('T7 ticker', 'real event not rendered');
  else ok('T7 hook (c) ticker renders real events');
  var e7b = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', hook: 'c', feedEvents: [] });
  await sleep(80);
  if (bodyHTML(e7b).indexOf('Quiet on the front') === -1) no('T7b ticker empty', 'honest empty state missing');
  else ok('T7b hook (c) honest empty state');

  /* ---- T8: bad callsign / taken handled, never traps ---- */
  var e8 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev', pf: {}, fetchRegister: { ok: false, error: 'taken' } });
  await sleep(60);
  el(e8, 'pfgHookBtn').click(); await sleep(1300);
  el(e8, 'pfgNext').click(); await sleep(30);
  el(e8, 'pfgCs').value = 'takenone'; el(e8, 'pfgAge').checked = true;
  el(e8, 'pfgClaimBtn').click(); await sleep(120);
  var errHtml = bodyHTML(e8);
  var skipStill = !!el(e8, 'pfgSkip');
  if (errHtml.indexOf('taken') === -1) no('T8 taken callsign', 'taken error not shown');
  else if (!skipStill) no('T8 skip visible', 'skip link gone on error');
  else ok('T8 taken callsign errors cleanly, skip always visible');

  /* ================= 3. static greps ================= */
  console.log('== 3. static greps ==');
  /* strip comments (naive but quote-aware enough: reuse comment-strip approach) */
  function codeOnly(src) {
    var lines = src.split('\n'), out = [], inBlock = false;
    lines.forEach(function (l) {
      var t = l, res = '';
      var i = 0;
      while (i < t.length) {
        if (inBlock) { var e2 = t.indexOf('*/', i); if (e2 === -1) { i = t.length; break; } inBlock = false; i = e2 + 2; continue; }
        var bs = t.indexOf('/*', i), lc = t.indexOf('//', i);
        if (bs !== -1 && (lc === -1 || bs < lc)) { inBlock = true; res += t.slice(i, bs); i = bs + 2; continue; }
        if (lc !== -1) { res += t.slice(i, lc); break; }
        res += t.slice(i); break;
      }
      out.push(res);
    });
    return out.join('\n');
  }
  var code = codeOnly(SRC);
  if (/xpGrant/.test(code)) no('G1 zero xpGrant', 'xpGrant referenced in gate code');
  else ok('G1 zero xpGrant in gate module');
  if (/\baward\s*\(/.test(code)) no('G2 zero award()', 'award( called in gate code — gate must not grant');
  else ok('G2 zero award() calls (existing legs only, via click)');
  if (/\bsettle\s*\(/.test(code)) no('G3 zero settle()', 'settle( called in gate code');
  else ok('G3 zero settle() calls');
  if (/pf-xp/.test(code)) no('G4 zero pf-xp', 'pf-xp event dispatched by gate');
  else ok('G4 gate dispatches no pf-xp (only pf-callsign-claimed)');
  if (/donate/i.test(code)) no('G5 banned term', '"donate" present in user-facing code');
  else ok('G5 banned term "donate" absent from user-facing code');
  if (/\bShane\b|\bSwan\b/i.test(SRC)) no('G6 real names', 'real name present');
  else ok('G6 no real names (MTCSTW only)');
  if (SRC.indexOf('MTCSTW') === -1) no('G7 identity', 'MTCSTW missing from copy');
  else ok('G7 MTCSTW identity present');
  /* hook-path isolation: the three hook functions must contain no XP writes */
  var hookStart = SRC.indexOf('HOOK MODULES'), flowStart = SRC.indexOf('GATE FLOW');
  var hookCode = codeOnly(SRC.slice(hookStart, flowStart));
  if (/\baward\s*\(|\bsettle\s*\(|xpGrant|pf-xp/.test(hookCode)) no('G8 hook path clean', 'XP machinery in hook section');
  else ok('G8 hook section has zero XP machinery');
  /* loader snippet present in the footer bootstrap */
  var foot = read(path.join(ROOT, 'loader', 'footer_v144_final.html'));
  if (foot.indexOf('gateBoot') === -1 || foot.indexOf('pf_gate_seen') === -1 || foot.indexOf('games/enlistment-gate.js') === -1)
    no('G9 loader snippet', 'gate loader snippet missing from footer_v144_final.html');
  else ok('G9 loader snippet present (seen-flag + kill switch + inject)');
  /* bundle build still passes its own enforcement */
  /* bundle build still passes its own enforcement (run, then restore the
     --debug output so the worktree keeps only this branch's real changes) */
  try {
    cp.execSync('node build/bundle.js --debug', { cwd: ROOT, stdio: 'pipe' });
    ok('G10 build/bundle.js enforcement passes (gate = STANDALONE)');
  } catch (e) { no('G10 build enforcement', 'bundle.js failed: ' + String((e.stderr || e.message || '')).slice(0, 200)); }
  try { cp.execSync('git checkout -- v1.4.3/games/bundle-*.js', { cwd: ROOT, stdio: 'pipe' }); }
  catch (e) { /* nothing to restore */ }

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
}

run().catch(function (e) { console.error('HARNESS ERROR: ' + (e && e.stack || e)); process.exit(1); });
