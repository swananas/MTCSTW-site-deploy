#!/usr/bin/env node
/* scripts/verify-ugc-dopamine-cartlens-fe.js — CartLens borrows frontend verification.
   Run from the repo root: node scripts/verify-ugc-dopamine-cartlens-fe.js
   1. node --check on the module + bundle registration source
   2. Static checks: kill switch, scout badge copy, scout_priority read,
      receipt_parse_assist POST, suggest_review prompt copy, provenance badge,
      fail-soft, no banned copy, no XP numbers, MTCSTW identity, reduced-motion,
      44px tap targets, no preventDefault (never blocks submission), bundle wiring,
      data-bounties.js untouched
   3. vm + FakeEl DOM runtime tests: kill switch, fail-soft boot, scout badge
      render (first child = most prominent) + copy, idempotent re-render,
      scout flag shapes, check-wrap on photo attach, parse-assist POST shape,
      suggest_review prompt ($X/$Y honest), generic mismatch line (no invented
      numbers), fail-soft with no backend, provenance regardless of outcome,
      submit never blocked, row provenance, banned-copy scan. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

var SILO = 'v1.4.3/core/ugc-cartlens.js';

console.log('== 1. node --check ==');
[SILO, 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var s = read(path.join(ROOT, SILO));
var bare = stripComments(s);
/* kill switch */
if (/PF\.skip\(['"]ugccartlens['"]\)/.test(s) && /\?pf_off=ugccartlens/.test(s)) ok('kill switch ?pf_off=ugccartlens');
else no('kill switch', 'PF.skip("ugccartlens") / ?pf_off=ugccartlens missing');
/* scout badge copy */
if (/SCOUT/.test(s) && /thin data here, your report matters most/.test(s)) ok('scout badge copy (SCOUT + thin-data line)');
else no('scout copy', 'badge copy missing');
/* scout flag read from ugc_value_rank */
if (/scout_priority/.test(s) && /ugc_value_rank/.test(s)) ok('scout_priority read from ugc_value_rank');
else no('scout flag', 'scout_priority / ugc_value_rank missing');
/* parse-assist POST */
if (/receipt_parse_assist/.test(s) && /suggest_review/.test(s)) ok('receipt_parse_assist POST + suggest_review');
else no('parse assist', 'endpoint/suggest_review missing');
if (/want to fix it/.test(s)) ok('gentle double-check prompt copy');
else no('prompt copy', '"want to fix it" missing');
/* provenance badge */
if (/ucl-prov/.test(s) && /provenance/.test(s)) ok('provenance badge (ucl-prov)');
else no('provenance', 'badge missing');
/* fail-soft */
if (/Fail-soft|fail-soft/i.test(s) && /postAction/.test(s)) ok('fail-soft backend posture');
else no('fail-soft', 'fail-soft markers missing');
/* never blocks submission: no preventDefault anywhere */
if (/preventDefault/.test(bare)) no('never blocks', 'preventDefault found — submission could be blocked');
else ok('never blocks submission (no preventDefault)');
/* banned copy */
var banned = ['donate', 'act now', 'hurry', 'limited time', 'last chance', "don't miss", 'guaranteed'];
var badHit = banned.filter(function (w) { return bare.toLowerCase().indexOf(w) !== -1; });
if (!badHit.length) ok('no banned copy (donate / fake urgency)');
else no('banned copy', 'found: ' + badHit.join(', '));
/* no hardcoded XP numbers */
if (/\b\d+\s*XP\b/.test(bare)) no('XP numbers', 'hardcoded XP amount found');
else ok('no hardcoded XP numbers');
/* MTCSTW identity */
if (/MTCSTW\.COM/.test(s)) ok('MTCSTW identity');
else no('identity', 'MTCSTW.COM missing');
/* reduced motion + tap targets */
if (/prefers-reduced-motion/.test(s)) ok('reduced-motion safe');
else no('reduced motion', 'missing');
if (/min-height:44px/.test(s)) ok('44px tap targets');
else no('tap targets', '44px min-height missing');
/* honest-copy: $X/$Y only from real numbers */
if (/ONLY when both are real numbers|never invented/i.test(s)) ok('honesty guard ($X/$Y only from real numbers)');
else no('honesty guard', 'expected honesty comment');
/* MutationObserver hook, board code untouched */
if (/MutationObserver/.test(s)) ok('MutationObserver hook (no board edits)');
else no('observer', 'MutationObserver missing');
try {
  cp.execSync('git diff --quiet fe/ugc-dopamine -- v1.4.3/games/data-bounties.js', { cwd: ROOT, stdio: 'pipe' });
  ok('data-bounties.js untouched vs fe/ugc-dopamine');
} catch (e) { no('board untouched', 'v1.4.3/games/data-bounties.js differs from fe/ugc-dopamine'); }
/* bundle wiring */
if (read(path.join(ROOT, 'build/bundle-core.js')).indexOf("'core/ugc-cartlens.js'") !== -1)
  ok('build/bundle-core.js registers core/ugc-cartlens.js');
else no('bundle registration', "'core/ugc-cartlens.js' missing from build/bundle-core.js");
[['v1.4.3/core/bundle-core.js', 'core'], ['v1.4.3/core/bundle-core-slr.js', 'core-slr']].forEach(function (pair) {
  if (read(path.join(ROOT, pair[0])).indexOf('UGCCartLens') !== -1) ok('minified ' + pair[1] + ' ships the silo');
  else no('bundle artifact (' + pair[1] + ')', 'UGCCartLens missing');
});

console.log('== 3. runtime (vm + FakeEl DOM) ==');

/* ---------- minimal DOM with a tiny HTML parser ---------- */
function FakeEl(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.id = '';
  this.className = '';
  this.children = [];
  this.parentNode = null;
  this._rawHTML = '';
  this.textContent = '';
  this.style = {};
  this._attrs = {};
  this._listeners = {};
  this.value = '';
  this.disabled = false;
}
FakeEl.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
FakeEl.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; }
  return c;
};
FakeEl.prototype.insertBefore = function (c, ref) {
  c.parentNode = this;
  var i = ref ? this.children.indexOf(ref) : -1;
  if (i >= 0) this.children.splice(i, 0, c); else this.children.push(c);
  return c;
};
FakeEl.prototype.setAttribute = function (k, v) {
  this._attrs[k] = String(v);
  if (k === 'id') this.id = String(v);
  if (k === 'class') this.className = String(v);
};
FakeEl.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
};
FakeEl.prototype.addEventListener = function (t, f) {
  (this._listeners[t] = this._listeners[t] || []).push(f);
};
FakeEl.prototype.focus = function () {};
FakeEl.prototype.select = function () {};
FakeEl.prototype._hasClasses = function (list) {
  var mine = (' ' + this.className + ' ').replace(/\s+/g, ' ');
  return list.every(function (c) { return mine.indexOf(' ' + c + ' ') !== -1; });
};
FakeEl.prototype._matchSimple = function (sel) {
  sel = sel.trim();
  if (!sel) return false;
  var tag = null, rest = sel;
  var tm = /^([a-zA-Z][a-zA-Z0-9]*)/.exec(sel);
  if (tm && sel[tm[1].length] !== '#') { /* tag prefix before . or [ */
    if (/^[a-zA-Z][a-zA-Z0-9]*(\.|$|\[)/.test(sel)) { tag = tm[1].toUpperCase(); rest = sel.slice(tm[1].length); }
  }
  if (tag && this.tagName !== tag) return false;
  var idm = /#([a-zA-Z0-9_-]+)/.exec(rest);
  if (idm && this.id !== idm[1]) return false;
  var cm = rest.match(/\.[a-zA-Z0-9_-]+/g) || [];
  if (cm.length && !this._hasClasses(cm.map(function (c) { return c.slice(1); }))) return false;
  var am = /\[([a-zA-Z0-9_:-]+)(?:="([^"]*)")?\]/.exec(rest);
  if (am) {
    var v = this.getAttribute(am[1]);
    if (am[2] === undefined) { if (v === null) return false; }
    else if (v !== am[2]) return false;
  }
  return true;
};
FakeEl.prototype._walk = function (sel, out) {
  for (var i = 0; i < this.children.length; i++) {
    var c = this.children[i];
    if (c._matchSimple && c._matchSimple(sel)) out.push(c);
    if (c._walk) c._walk(sel, out);
  }
  return out;
};
FakeEl.prototype.querySelectorAll = function (sel) {
  var parts = sel.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  var out = [], seen = [];
  var self = this;
  parts.forEach(function (p) {
    var bits = p.split(/\s+/);
    var cands = self._walk(bits[bits.length - 1], []);
    cands.forEach(function (c) {
      var node = c.parentNode, bi = bits.length - 2, good = true;
      while (bi >= 0 && good) {
        var found = false;
        while (node) { if (node._matchSimple && node._matchSimple(bits[bi])) { found = true; node = node.parentNode; break; } node = node.parentNode; }
        if (!found) good = false;
        bi--;
      }
      if (good && seen.indexOf(c) === -1) { seen.push(c); out.push(c); }
    });
  });
  return out;
};
FakeEl.prototype.querySelector = function (sel) {
  var r = this.querySelectorAll(sel);
  return r.length ? r[0] : null;
};
FakeEl.prototype.closest = function (sel) {
  var n = this;
  while (n) { if (n._matchSimple && n._matchSimple(sel)) return n; n = n.parentNode; }
  return null;
};
Object.defineProperty(FakeEl.prototype, 'firstChild', {
  get: function () { return this.children.length ? this.children[0] : null; }
});
Object.defineProperty(FakeEl.prototype, 'nextSibling', {
  get: function () {
    if (!this.parentNode) return null;
    var i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] || null;
  }
});
Object.defineProperty(FakeEl.prototype, 'classList', {
  get: function () {
    var self = this;
    return { contains: function (c) { return (' ' + self.className + ' ').indexOf(' ' + c + ' ') !== -1; } };
  }
});
/* tiny parser: enough for this module's templates (div/span/button, attrs, text) */
function parseInto(parent, html, doc) {
  var stack = [parent];
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g, m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      var cur = stack[stack.length - 1];
      cur.textContent = (cur.textContent || '') + m[4];
      continue;
    }
    if (m[1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    var el = new FakeEl(m[2]);
    el._doc = doc;
    var am = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'))?/g, a2;
    while ((a2 = am.exec(m[3]))) {
      var v = a2[2] == null ? '' : a2[2].slice(1, -1);
      el.setAttribute(a2[1], v);
    }
    stack[stack.length - 1].appendChild(el);
    stack.push(el);
  }
}
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get: function () { return this._rawHTML; },
  set: function (h) {
    this._rawHTML = String(h);
    this.children = [];
    this.textContent = '';
    parseInto(this, this._rawHTML, this._doc);
  }
});
FakeEl.prototype.insertAdjacentHTML = function (pos, html) {
  var tmp = new FakeEl('div');
  tmp._doc = this._doc;
  tmp.innerHTML = html;
  var nodes = tmp.children.slice();
  if (pos === 'afterbegin') {
    for (var i = nodes.length - 1; i >= 0; i--) this.insertBefore(nodes[i], this.firstChild);
  } else {
    for (var j = 0; j < nodes.length; j++) this.appendChild(nodes[j]);
  }
};
FakeEl.prototype.dispatchEvent = function (ev) {
  ev.target = ev.target || this;
  var n = this;
  while (n) {
    var L = n._listeners[ev.type] || [];
    L.forEach(function (f) { try { f.call(n, ev); } catch (e) {} });
    n = n.parentNode;
  }
  return true;
};

function makeEnv(opts) {
  opts = opts || {};
  var doc = {
    _ids: {}, _listeners: {},
    visibilityState: 'visible',
    getElementById: function (id) {
      if (this._ids[id]) return this._ids[id];
      var found = null;
      [this.body, this.head].forEach(function (root) {
        if (found || !root) return;
        if (root.id === id) { found = root; return; }
        var r = root.querySelectorAll('#' + id);
        if (r.length) found = r[0];
      });
      return found;
    },
    createElement: function (tag) {
      var el = new FakeEl(tag);
      el._doc = doc;
      if (tag === 'script') {
        Object.defineProperty(el, 'src', {
          set: function (u) {
            el._src = u;
            if (opts.onScript) opts.onScript(el, u);
          },
          get: function () { return el._src || ''; }
        });
      }
      return el;
    },
    querySelector: function (sel) {
      var r = this.querySelectorAll(sel);
      return r.length ? r[0] : null;
    },
    querySelectorAll: function (sel) {
      var out = [];
      [this.body, this.head].forEach(function (root) {
        var r = root.querySelectorAll(sel);
        r.forEach(function (e) { if (out.indexOf(e) === -1) out.push(e); });
      });
      return out;
    },
    addEventListener: function () {}
  };
  doc.head = new FakeEl('head'); doc.head._doc = doc;
  doc.body = new FakeEl('body'); doc.body._doc = doc;
  var store = {};
  var win = {
    document: doc,
    location: { href: opts.href || 'https://www.mtcstw.com/create' },
    PF: {
      skip: function (k) { return (opts.killed || []).indexOf(k) !== -1; },
      postAction: opts.postAction || function (t, ak, act, params, cb) {
        var body = { type: t };
        body[ak] = act;
        for (var k in params) body[k] = params[k];
        setTimeout(function () { cb(opts.postResp === undefined ? null : opts.postResp); }, 5);
      }
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    matchMedia: function () { return { matches: !!opts.reduced }; },
    MutationObserver: function (cb) { (win._observers = win._observers || []).push({ cb: cb }); },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: setInterval, clearInterval: clearInterval,
    Intl: Intl, Date: Date, Math: Math, JSON: JSON, console: console
  };
  win.MutationObserver.prototype.observe = function () {};
  win.MutationObserver.prototype.disconnect = function () {};
  win.window = win;
  if (opts.backend) win.PF_BACKEND_URL = opts.backend;
  return { win: win, doc: doc, store: store };
}
function runSilo(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(s, ctx, { filename: 'ugc-cartlens.js' });
  return env.win.PF.UGCCartLens;
}
function fireObservers(env) {
  (env.win._observers || []).forEach(function (o) { try { o.cb([]); } catch (e) {} });
}
function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

/* board builders */
function buildBoard(env) {
  var doc = env.doc;
  var host = new FakeEl('div');
  host.setAttribute('id', 'pf-data-bounties');
  host._doc = doc; doc._ids['pf-data-bounties'] = host;
  doc.body.appendChild(host);
  return host;
}
function buildCard(env, host, bid, title, kind) {
  var card = new FakeEl('div');
  card.setAttribute('data-b', bid);
  card.className = 'db-card';
  var k = new FakeEl('div'); k.className = 'db-kind'; k.textContent = kind || 'PRICE CHECK'; card.appendChild(k);
  var t = new FakeEl('div'); t.className = 'db-title'; t.textContent = title || 'Bounty'; card.appendChild(t);
  host.appendChild(card);
  return card;
}
function buildClaimForm(env, card, fields) {
  var form = new FakeEl('div');
  form.className = 'db-claim';
  (fields || []).forEach(function (f) {
    var inp = new FakeEl('input');
    inp.className = 'db-in';
    inp.setAttribute('data-f', f.f);
    inp.value = f.v || '';
    form.appendChild(inp);
  });
  var sub = new FakeEl('button');
  sub.setAttribute('data-act', 'claim');
  sub.textContent = 'SUBMIT';
  form.appendChild(sub);
  card.appendChild(form);
  form._submit = sub;
  return form;
}

/* 3a. kill switch */
(function () {
  var env = makeEnv({ killed: ['ugccartlens'] });
  runSilo(env);
  if (env.win.PF.UGCCartLens === undefined) ok('runtime: kill switch -> module inert');
  else no('runtime: kill switch', 'PF.UGCCartLens defined despite ?pf_off=ugccartlens');
})();

/* 3b. fail-soft boot: no backend, no board host */
(function () {
  var env = makeEnv({});
  try {
    var api = runSilo(env);
    if (api && api.version === '1.0.0') ok('runtime: no backend/host -> boots, API present');
    else no('runtime: boot', 'API missing');
    api.refreshScout();
    api.scan();
    ok('runtime: refreshScout + scan with no backend/host -> no throw');
  } catch (e) { no('runtime: fail-soft', String(e && e.message || e)); }
})();

/* 3c. scoutIdsFromRank shapes */
(function () {
  var env = makeEnv({});
  var api = runSilo(env);
  var f = api.scoutIdsFromRank;
  var t1 = f({ ok: true, scout: ['a1', 'b2'] });
  var t2 = f({ ok: true, bounties: [{ bounty_id: 'x1', scout_priority: true }, { bounty_id: 'y1' }] });
  var t3 = f({ ok: true, ranked: [{ id: 'r1', scout_priority: true }] });
  var t4 = f({ ok: true, items: [{ bounty: 'i1', scout_priority: true }] });
  if (t1.join() === 'a1,b2' && t2.join() === 'x1' && t3.join() === 'r1' && t4.join() === 'i1')
    ok('runtime: scoutIdsFromRank reads j.scout / bounties / ranked / items');
  else no('runtime: scoutIdsFromRank', JSON.stringify([t1, t2, t3, t4]));
  if (f(null).length === 0 && f({ ok: false }).length === 0) ok('runtime: scoutIdsFromRank fail-soft on junk');
  else no('runtime: scoutIdsFromRank junk', 'should be empty');
})();

/* 3d. scout badge render: first child (most prominent), copy, unflagged clean */
function test3d(done) {
  var env = makeEnv({
    backend: 'https://pf-api.mtcstw.workers.dev/',
    onScript: function (el, u) {
      var m = /callback=([^&]+)/.exec(u);
      setTimeout(function () {
        var cb = m && env.win[m[1]];
        if (cb && /ugc_value_rank/.test(u)) cb({ ok: true, scout: ['db_gas_price_downtown_2026-10-06'] });
        else if (cb) cb({ ok: false });
      }, 5);
    }
  });
  var host = buildBoard(env);
  var flagged = buildCard(env, host, 'db_gas_price_downtown_2026-10-06', 'Gas: downtown');
  var plain = buildCard(env, host, 'db_cpi_price_milk_2026-10-06', 'Milk price');
  var api = runSilo(env);
  api.refreshScout();
  wait(80).then(function () {
    var badge = flagged.querySelector('.ucl-scout');
    var first = flagged.firstChild;
    if (badge && first === badge) ok('runtime: scout badge injected as FIRST child (most prominent)');
    else no('runtime: badge position', 'badge not first child');
    var html = badge ? [ '.sk', '.st', '.ss' ].map(function (c) {
      var n = badge.querySelector(c);
      return n ? n.textContent : '';
    }).join(' | ') : '';
    if (/SCOUT/.test(html) && /thin data here, your report matters most/.test(html) && /MTCSTW\.COM/.test(html))
      ok('runtime: badge copy (SCOUT + thin-data line + identity)');
    else no('runtime: badge copy', html.slice(0, 160));
    if (!plain.querySelector('.ucl-scout')) ok('runtime: unflagged card gets no badge');
    else no('runtime: unflagged badge', 'badge leaked to unflagged card');
    test3e(env, host, flagged, api, done);
  });
}

/* 3e. idempotent re-render: board innerHTML replaced -> badge re-injected once */
function test3e(env, host, flagged, api, done) {
  host.innerHTML = ''; /* board re-render wipes injected nodes */
  var card = buildCard(env, host, 'db_gas_price_downtown_2026-10-06', 'Gas: downtown');
  fireObservers(env);
  wait(300).then(function () {
    var badges = card.querySelectorAll('.ucl-scout');
    if (badges.length === 1) ok('runtime: re-render -> badge re-injected exactly once');
    else no('runtime: re-render badge', 'count=' + badges.length);
    api.scan(); api.scan();
    if (card.querySelectorAll('.ucl-scout').length === 1) ok('runtime: double scan -> still one badge');
    else no('runtime: badge dedupe', 'duplicated');
    test3f(done);
  });
}

/* helpers for the photo-claim flow */
function buildPhotoBoard(env) {
  var host = buildBoard(env);
  var card = buildCard(env, host, 'db_photo_evidence_rally_2026-10-06', 'Rally photos', 'PHOTO BOUNTY');
  var form = buildClaimForm(env, card, [
    { f: 'photo_url', v: '' },
    { f: 'caption', v: '' },
    { f: 'price_cents', v: '329' },
    { f: 'taken_at', v: '2026-10-06T10:00' }
  ]);
  return { host: host, card: card, form: form };
}
function photoInputOf(form) { return form.querySelector('input[data-f="photo_url"]'); }

/* 3f. attaching a photo URL -> CHECK MY PHOTO + provenance chip, submit untouched */
function test3f(done) {
  var env = makeEnv({});
  var b = buildPhotoBoard(env);
  runSilo(env);
  var inp = photoInputOf(b.form);
  inp.value = 'https://example.com/photo.jpg';
  inp.dispatchEvent({ type: 'input' });
  wait(350).then(function () {
    var wrap = b.form.querySelector('.ucl-checkwrap');
    var btn = b.form.querySelector('[data-ucl-check]');
    if (wrap && btn && /CHECK MY PHOTO/.test(btn.textContent))
      ok('runtime: photo attach -> CHECK MY PHOTO action appears');
    else no('runtime: check wrap', 'wrap/button missing');
    var prov = b.form.querySelector('.ucl-prov');
    if (prov && /\uD83D\uDCF8/.test(prov.textContent || '')) ok('runtime: provenance chip on attach');
    else no('runtime: attach provenance', 'chip missing');
    if (b.form._submit.disabled !== true) ok('runtime: claim SUBMIT untouched (not disabled)');
    else no('runtime: submit touched', 'SUBMIT disabled by module');
    /* clearing the URL removes the wrap */
    inp.value = '';
    inp.dispatchEvent({ type: 'input' });
    wait(350).then(function () {
      if (!b.form.querySelector('.ucl-checkwrap')) ok('runtime: clearing URL removes the check action');
      else no('runtime: wrap removal', 'wrap persisted');
      test3g(done);
    });
  });
}

/* 3g. suggest_review -> $X/$Y prompt, POST shape, FIX IT / KEEP AS-IS */
function test3g(done) {
  var captured = null;
  var env = makeEnv({
    postAction: function (t, ak, act, params, cb) {
      captured = { type: t }; captured[ak] = act;
      for (var k in params) captured[k] = params[k];
      setTimeout(function () {
        cb({ ok: true, suggest_review: true, assist: { parsed_price_cents: 429 } });
      }, 5);
    }
  });
  var b = buildPhotoBoard(env);
  runSilo(env);
  var inp = photoInputOf(b.form);
  inp.value = 'https://example.com/photo.jpg';
  inp.dispatchEvent({ type: 'input' });
  wait(350).then(function () {
    var btn = b.form.querySelector('[data-ucl-check]');
    btn.dispatchEvent({ type: 'click' });
    wait(80).then(function () {
      if (captured && captured.type === 'ugcassist' && captured.ua_action === 'receipt_parse_assist')
        ok('runtime: POST receipt_parse_assist via ua_action');
      else no('runtime: POST shape', JSON.stringify(captured));
      if (captured && captured.photo_url === 'https://example.com/photo.jpg' &&
          captured.manual && captured.manual.price_cents === 329 &&
          captured.manual.item === 'Rally photos' && captured.manual.date === '2026-10-06T10:00')
        ok('runtime: POST body {photo_url, manual:{price_cents,item,date}}');
      else no('runtime: POST body', JSON.stringify(captured && captured.manual));
      var panel = b.form.querySelector('.ucl-review');
      var rline = panel ? panel.querySelector('.rl') : null;
      var line = rline ? rline.textContent : '';
      if (/The photo looks like \$4\.29 but you entered \$3\.29/.test(line) && /want to fix it/.test(line))
        ok('runtime: suggest_review -> "The photo looks like $4.29 but you entered $3.29 — want to fix it?"');
      else no('runtime: review prompt', line.slice(0, 200));
      var fix = panel.querySelector('[data-ucl-fix]');
      var keep = panel.querySelector('[data-ucl-keep]');
      if (fix && keep) ok('runtime: FIX IT + KEEP AS-IS buttons');
      else no('runtime: review buttons', 'missing');
      /* FIX IT dismisses the panel */
      fix.dispatchEvent({ type: 'click' });
      if (!b.form.querySelector('.ucl-review')) ok('runtime: FIX IT dismisses the prompt');
      else no('runtime: fix dismiss', 'panel persisted');
      /* submission still unblocked */
      if (b.form._submit.disabled !== true) ok('runtime: SUBMIT still enabled after check');
      else no('runtime: submit blocked', 'SUBMIT disabled');
      test3h(done);
    });
  });
}

/* 3h. fail-soft: backend dead -> no prompt, no throw, quiet note */
function test3h(done) {
  var env = makeEnv({
    postAction: function (t, ak, act, params, cb) { setTimeout(function () { cb(null); }, 5); }
  });
  var b = buildPhotoBoard(env);
  var api = runSilo(env);
  try {
    api._t.runCheck && null;
    var inp = photoInputOf(b.form);
    inp.value = 'https://example.com/photo.jpg';
    api.scan();
    var btn = b.form.querySelector('[data-ucl-check]');
    btn.dispatchEvent({ type: 'click' });
    wait(80).then(function () {
      if (!b.form.querySelector('.ucl-review')) ok('runtime: dead backend -> no review prompt');
      else no('runtime: dead backend prompt', 'prompt appeared without backend');
      if (b.form._submit.disabled !== true) ok('runtime: dead backend -> SUBMIT unaffected');
      else no('runtime: dead backend submit', 'SUBMIT touched');
      test3i(done);
    });
  } catch (e) { no('runtime: dead backend', String(e && e.message || e)); test3i(done); }
}

/* 3i. suggest_review:false -> no prompt, provenance stays regardless */
function test3i(done) {
  var env = makeEnv({
    postAction: function (t, ak, act, params, cb) {
      setTimeout(function () { cb({ ok: true, suggest_review: false }); }, 5);
    }
  });
  var b = buildPhotoBoard(env);
  runSilo(env);
  var inp = photoInputOf(b.form);
  inp.value = 'https://example.com/photo.jpg';
  inp.dispatchEvent({ type: 'input' });
  wait(350).then(function () {
    b.form.querySelector('[data-ucl-check]').dispatchEvent({ type: 'click' });
    wait(80).then(function () {
      if (!b.form.querySelector('.ucl-review')) ok('runtime: suggest_review false -> no prompt');
      else no('runtime: false prompt', 'prompt appeared');
      if (b.form.querySelector('.ucl-prov')) ok('runtime: provenance chip applies regardless of check outcome');
      else no('runtime: provenance after check', 'chip missing');
      test3j(done);
    });
  });
}

/* 3j. suggest_review without numbers -> generic line, no invented $X/$Y */
function test3j(done) {
  var env = makeEnv({
    postAction: function (t, ak, act, params, cb) {
      setTimeout(function () { cb({ ok: true, suggest_review: true, assist: {} }); }, 5);
    }
  });
  var b = buildPhotoBoard(env);
  var api = runSilo(env);
  var inp = photoInputOf(b.form);
  inp.value = 'https://example.com/photo.jpg';
  api.scan();
  b.form.querySelector('[data-ucl-check]').dispatchEvent({ type: 'click' });
  wait(80).then(function () {
    var rlNode = b.form.querySelector('.ucl-review .rl');
    var line = rlNode ? rlNode.textContent : '';
    if (/don\u2019t quite line up/.test(line) && !/\$\d/.test(line))
      ok('runtime: no parsed price -> generic line, no invented numbers');
    else no('runtime: generic mismatch', line.slice(0, 200));
    /* reviewLine honesty: equal prices -> generic line */
    var rl = api.reviewLine({ assist: { parsed_price_cents: 329 } }, 329);
    if (!/\$/.test(rl)) ok('runtime: reviewLine equal prices -> no $X/$Y');
    else no('runtime: reviewLine equal', rl);
    var rl2 = api.reviewLine({ assist: { parsed_price_cents: 429 } }, 329);
    if (/\$4\.29/.test(rl2) && /\$3\.29/.test(rl2)) ok('runtime: reviewLine honest $X/$Y from real numbers');
    else no('runtime: reviewLine numbers', rl2);
    if (api.fmtPrice(429) === '$4.29') ok('runtime: fmtPrice');
    else no('runtime: fmtPrice', 'bad format');
    test3k(done);
  });
}

/* 3k. clicking SUBMIT does nothing module-side (never blocks) */
function test3k(done) {
  var env = makeEnv({});
  var b = buildPhotoBoard(env);
  runSilo(env);
  var inp = photoInputOf(b.form);
  inp.value = 'https://example.com/photo.jpg';
  inp.dispatchEvent({ type: 'input' });
  wait(350).then(function () {
    b.form._submit.dispatchEvent({ type: 'click' });
    wait(60).then(function () {
      if (!b.form.querySelector('.ucl-review') && !b.form.querySelector('.ucl-note'))
        ok('runtime: SUBMIT click -> module stays out of the way');
      else no('runtime: submit interference', 'module reacted to SUBMIT');
      test3l(done);
    });
  });
}

/* 3l. rendered claim rows with a photo link get provenance */
function test3l(done) {
  var env = makeEnv({});
  var host = buildBoard(env);
  var card = buildCard(env, host, 'db_photo_evidence_rally_2026-10-06', 'Rally photos');
  var row = new FakeEl('div'); row.className = 'db-claimrow';
  var link = new FakeEl('a'); link.className = 'db-plink'; link.textContent = 'view photo';
  row.appendChild(link);
  card.appendChild(row);
  var api = runSilo(env);
  api.scan();
  var chip = row.querySelector('.ucl-prov');
  if (chip && /provenance/.test(chip.textContent || '')) ok('runtime: claim row with photo -> provenance chip');
  else no('runtime: row provenance', 'chip missing');
  api.scan();
  if (row.querySelectorAll('.ucl-prov').length === 1) ok('runtime: row provenance idempotent');
  else no('runtime: row provenance dedupe', 'duplicated');
  test3m();
}

/* 3m. banned-copy scan over rendered surfaces */
function allText(el) {
  var t = el.textContent || '';
  (el.children || []).forEach(function (c) { t += ' ' + allText(c); });
  return t;
}
function test3m() {
  var env = makeEnv({});
  var b = buildPhotoBoard(env);
  var api = runSilo(env);
  var all = api.scoutBadgeHTML() + ' ' + api.reviewLine({ assist: { parsed_price_cents: 429 } }, 329) +
    ' ' + (function () {
      api.scan();
      var inp = photoInputOf(b.form);
      inp.value = 'https://example.com/photo.jpg';
      api.scan();
      var w = b.form.querySelector('.ucl-checkwrap');
      return w ? allText(w) : '';
    })();
  var bad = [];
  if (/donate/i.test(all)) bad.push('donate');
  if (/\b\d+\s*XP\b/.test(all)) bad.push('XP number');
  if (/act now|hurry|limited time|last chance/i.test(all)) bad.push('fake urgency');
  if (bad.length) no('runtime: banned copy', bad.join(', '));
  else ok('runtime: rendered copy clean (no donate/XP/urgency)');
  finish();
}

/* ---- async chain ---- */
test3d(function () { /* continues through 3e..3m */ });

var finished = 0;
function finish() {
  finished++;
  if (finished < 1) return;
  setTimeout(function () {
    console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
    if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
    process.exit(fails.length ? 1 : 0);
  }, 120);
}
