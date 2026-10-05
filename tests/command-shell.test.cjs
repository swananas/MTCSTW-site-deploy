/* Command Dashboard shell — render/smoke tests (branch fe/command-shell).
   Covers: mount + mobile stack order, ?pf_off=command kill switch, theme
   scoping (all selectors under #pf-command), recruit mode (<3 tiles with
   data), request infra (concurrency cap 6, 12s timeout fail-soft,
   IntersectionObserver staggering, auth-gated reflow), homepage exclusion
   in build config, no-xpGrant grep proof.
   Run: node tests/command-shell.test.cjs (from repo root) */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var CMD = path.join(ROOT, 'v1.4.3', 'command');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 20); }); }

/* ---------- minimal fake DOM ---------- */
function parseAttrs(el, s) {
  var re = /([a-zA-Z-]+)="([^"]*)"/g, m;
  while ((m = re.exec(s))) {
    if (m[1] === 'class') el.className = m[2];
    else if (m[1] === 'id') el.id = m[2];
    else if (m[1] === 'href') el.href = m[2];
  }
}
function parseHTML(html, doc, parent) {
  var stack = [parent];
  var re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g, m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      var t = m[4].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      var cur = stack[stack.length - 1];
      if (t.trim()) cur.textContent = (cur.textContent || '') + t.trim();
      continue;
    }
    if (m[1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    var el = doc.createElement(m[2]);
    parseAttrs(el, m[3]);
    stack[stack.length - 1].appendChild(el);
    if (!/\/\s*$/.test(m[3])) stack.push(el);
  }
}
function El(tag, doc) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.children = []; this.style = {}; this.dataset = {};
  this._html = ''; this.textContent = ''; this.className = '';
  this.id = ''; this.parentNode = null; this._ls = {}; this._doc = doc;
}
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c); if (i > -1) this.children.splice(i, 1);
  c.parentNode = null; return c;
};
El.prototype.setAttribute = function (k, v) { this[k] = v; };
El.prototype.addEventListener = function (t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); };
El.prototype.hasClass = function (cls) {
  return (' ' + (this.className || '') + ' ').indexOf(' ' + cls + ' ') !== -1;
};
El.prototype.querySelectorAll = function (sel) {
  var out = [], want = sel.charAt(0) === '.' ? sel.slice(1) : (sel.charAt(0) === '#' ? sel.slice(1) : null);
  var isId = sel.charAt(0) === '#';
  (function walk(n) {
    (n.children || []).forEach(function (c) {
      if (isId ? c.id === want : c.hasClass(want)) out.push(c);
      walk(c);
    });
  })(this);
  return out;
};
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (v) {
    this._html = String(v); this.children = []; this.textContent = '';
    if (this._html) parseHTML(this._html, this._doc, this);
  }
});

function makeEnv(o) {
  o = o || {};
  var store = {};
  if (o.callsign) store.pf_identity_v1 = JSON.stringify({ callsign: o.callsign });
  var win = {
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { search: o.qs || '', href: 'https://mtcstw.com/command' + (o.qs || '') },
    localStorage: {
      getItem: function (k) { return store[k] != null ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    PF: { skip: function (s) { return o.skipFn ? o.skipFn(s) : false; }, log: function () {}, error: function () {} }
  };
  var doc;
  var ioInstances = [];
  function MockIO(cb, opts) { this._cb = cb; this.opts = opts; ioInstances.push(this); }
  MockIO.prototype.observe = function (el) { this.el = el; };
  MockIO.prototype.disconnect = function () {};
  var jsonpCalls = [];
  var responders = o.responders || {};
  function El2(t) { return new El(t, doc); }
  doc = {
    readyState: 'complete',
    createElement: El2,
    head: null, body: null,
    getElementById: function (id) {
      var found = null;
      (function walk(n) {
        (n.children || []).forEach(function (c) {
          if (c.id === id) found = c;
          walk(c);
        });
      })(doc.body);
      return found;
    },
    addEventListener: function () {},
    querySelectorAll: function () { return []; }
  };
  doc.head = El2('head'); doc.body = El2('body');
  doc.head.appendChild = (function (orig) {
    return function (c) {
      orig.call(this, c);
      /* JSONP responder: parse action + callback from the script src. */
      try {
        var src = c.src || '';
        var am = src.match(/[?&]action=([^&]+)/), cm = src.match(/[?&]callback=([^&]+)/);
        var action = am && decodeURIComponent(am[1]), cb = cm && cm[1];
        jsonpCalls.push({ action: action, cb: cb });
        var delay = (o.delays && o.delays[action] != null) ? o.delays[action] : 5;
        var rsp = responders[action];
        if (rsp !== undefined && cb && win[cb]) {
          var concurrent = (o._conc = (o._conc || 0) + 1);
          if (concurrent > (o._concMax || 0)) o._concMax = concurrent;
          setTimeout(function () {
            o._conc--;
            try { win[cb](typeof rsp === 'function' ? rsp() : rsp); } catch (e) {}
          }, delay);
        }
        /* undefined responder = never calls back (timeout path) */
      } catch (e) {}
      return c;
    };
  })(doc.head.appendChild);
  if (o.io !== false) win.IntersectionObserver = MockIO;
  win._triggerIO = function (el) {
    ioInstances.forEach(function (io) {
      if (io.el === el) { try { io._cb([{ isIntersecting: true }]); } catch (e) {} }
    });
  };
  win._jsonpCalls = jsonpCalls;
  win._stats = o;
  return { win: win, doc: doc };
}

function loadBundle(env) {
  var src = ['00-shell.js', '01-request.js', '02-registry.js']
    .map(function (f) { return fs.readFileSync(path.join(CMD, f), 'utf8'); }).join('\n;\n');
  var fn = new Function('window', 'document', 'localStorage', 'fetch',
    'setTimeout', 'clearTimeout', 'console', 'Math', 'JSON', 'Object',
    'Array', 'Number', 'String', 'Date', 'Promise', 'Error',
    'encodeURIComponent', 'IntersectionObserver', src);
  fn(env.win, env.doc, env.win.localStorage, undefined,
    setTimeout, clearTimeout, console, Math, JSON, Object,
    Array, Number, String, Date, Promise, Error,
    encodeURIComponent, env.win.IntersectionObserver);
  /* mount div, as the Squarespace Code block provides it */
  var mount = env.doc.createElement('div');
  mount.id = 'pf-command';
  env.doc.body.appendChild(mount);
  env.win.PFCommand.boot();
  return mount;
}

function tileCard(mount, idx) {
  var tiles = mount.querySelectorAll('.pfc-tiles')[0];
  return tiles && tiles.children[idx];
}

(async function main() {
  console.log('command-shell tests');

  /* ---- 1. mount + stack order ---- */
  var e1 = makeEnv();
  var m1 = loadBundle(e1);
  await tick(30);
  var wrap = m1.querySelectorAll('.pfc-wrap')[0];
  ok('mount renders skeleton', !!wrap);
  var order = wrap.children
    .map(function (c) { return c.className.split(' ')[0]; })
    .filter(function (c) { return ['pfc-callsign', 'pfc-tiles', 'pfc-cta', 'pfc-fronts', 'pfc-river'].indexOf(c) !== -1; });
  ok('mobile stack order: callsign → tiles → cta → fronts → river',
    JSON.stringify(order) === JSON.stringify(
      ['pfc-callsign', 'pfc-tiles', 'pfc-cta', 'pfc-fronts', 'pfc-river']),
    order.join(','));

  /* ---- 2. kill switch ---- */
  var e2 = makeEnv({ qs: '?pf_off=command', skipFn: function (s) { return s === 'command'; } });
  var m2 = loadBundle(e2);
  await tick(30);
  ok('kill switch hides mount', m2.style.display === 'none' && m2.innerHTML === '');
  ok('kill switch: zero in-flight requests', e2.win.PFCommand._inFlight() === 0);
  var e2b = makeEnv({ qs: '?pf_off=other', skipFn: function (s) { return s === 'command' ? false : true; } });
  var m2b = loadBundle(e2b);
  await tick(30);
  ok('kill switch control: other silo off → deck mounts', !!m2b.querySelectorAll('.pfc-wrap')[0]);

  /* ---- 3. theme scoping ---- */
  var shellSrc = fs.readFileSync(path.join(CMD, '00-shell.js'), 'utf8');
  var rawCss = shellSrc.split('/*PFCMD-CSS-START*/')[1].split('/*PFCMD-CSS-END*/')[0];
  /* the CSS lives in a JS string-concat — strip the concatenation artifacts */
  var css = rawCss.replace(/'\s*\+\s*/g, '').replace(/'/g, '').replace(/\\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  var bad = [];
  var re = /([^{}]+)\{([^{}]*)\}/g, mm;
  while ((mm = re.exec(css))) {
    var sel = mm[1].trim();
    if (sel.charAt(0) === '@') continue; /* @media header — inner rules checked below */
    sel.split(',').forEach(function (s) {
      s = s.trim();
      if (s && s.indexOf('#pf-command') !== 0) bad.push(s);
    });
  }
  ok('theme scoping: every selector rooted at #pf-command', bad.length === 0, bad.slice(0, 3).join(' | '));
  ok('theme scoping: no bare body/html/* selectors',
    !/(^|[\s,}])\s*(body|html|\*)\s*\{/.test(css));

  /* ---- 4a. recruit mode: <3 tiles with data ---- */
  var e4 = makeEnv({ callsign: 'VIPER', responders: {
    a1: { ok: true, v: 1 }, a2: { ok: true, v: 2 },
    xp_today: { ok: true, xp_today: 42 }
  }});
  var m4 = loadBundle(e4);
  var P4 = e4.win.PFCommand;
  P4.registerTile({ id: 't1', label: 'T1', fetch: function () { return { action: 'a1' }; },
    render: function (c, d) { c.innerHTML = '<div class="pfc-tile-body">A1</div>'; } });
  P4.registerTile({ id: 't2', label: 'T2', fetch: function () { return { action: 'a2' }; },
    render: function (c, d) { c.innerHTML = '<div class="pfc-tile-body">A2</div>'; } });
  e4.win._triggerIO(tileCard(m4, 0));
  e4.win._triggerIO(tileCard(m4, 1));
  await tick(60);
  ok('recruit mode: 2 tiles with data → tilesWithData()==2', P4._tilesWithData() === 2);
  var rec = m4.querySelectorAll('.pfc-recruit')[0];
  ok('recruit mode renders first-mission sequence', !!rec);
  var missions = rec ? rec.querySelectorAll('.pfc-mission') : [];
  ok('recruit mode: 3 missions', missions.length === 3, String(missions.length));
  var html = rec ? rec.innerHTML : '';
  ok('recruit: claim callsign → /', html.indexOf('href="/"') !== -1);
  ok('recruit: join cell → /cells', html.indexOf('href="/cells"') !== -1);
  ok('recruit: quiz → /arcade', html.indexOf('href="/arcade"') !== -1);

  /* ---- 4b. recruit mode control: 4 tiles with data → no recruit ---- */
  var e4b = makeEnv({ callsign: 'VIPER', responders: {
    b1: { ok: true }, b2: { ok: true }, b3: { ok: true }, b4: { ok: true },
    xp_today: { ok: true, xp_today: 7 }
  }});
  var m4b = loadBundle(e4b);
  var P4b = e4b.win.PFCommand;
  ['b1', 'b2', 'b3', 'b4'].forEach(function (a, i) {
    P4b.registerTile({ id: 't' + i, label: 'T' + i, fetch: function () { return { action: a }; },
      render: function (c) { c.innerHTML = '<div class="pfc-tile-body">OK</div>'; } });
  });
  for (var i = 0; i < 4; i++) e4b.win._triggerIO(tileCard(m4b, i));
  await tick(60);
  ok('4 tiles with data → no recruit sequence', m4b.querySelectorAll('.pfc-recruit').length === 0);

  /* ---- 5. request infra ---- */
  /* 5a. concurrency cap */
  var acts = {};
  for (var k = 1; k <= 8; k++) acts['c' + k] = { ok: true, n: k };
  var e5 = makeEnv({ responders: acts, delays: { c1: 40, c2: 40, c3: 40, c4: 40, c5: 40, c6: 40, c7: 40, c8: 40 } });
  var m5 = loadBundle(e5);
  var P5 = e5.win.PFCommand;
  for (var j = 1; j <= 8; j++) (function (a) {
    P5.registerTile({ id: 'ct' + a, label: a, fetch: function () { return { action: a }; },
      render: function (c) { c.innerHTML = '<div class="pfc-tile-body">x</div>'; } });
  })('c' + j);
  for (var j2 = 0; j2 < 8; j2++) e5.win._triggerIO(tileCard(m5, j2));
  await tick(15);
  ok('concurrency cap: in-flight ≤ 6 under burst', P5._observedMax <= 6, 'observed=' + P5._observedMax);
  await tick(200);
  ok('concurrency: all 8 resolve via queue drain', P5._tilesWithData() === 8, String(P5._tilesWithData()));

  /* 5b. timeout fail-soft */
  var e5b = makeEnv({ responders: {} }); /* 'stall' never answers */
  loadBundle(e5b);
  var P5b = e5b.win.PFCommand;
  P5b._timeoutMs = 40;
  var t0 = Date.now();
  var res = await P5b.jsonp('stall', { x: 1 });
  var dt = Date.now() - t0;
  ok('timeout fail-soft: resolves {ok:false}', res && res.ok === false && res.error === 'timeout', JSON.stringify(res));
  ok('timeout fail-soft: prompt (<2s)', dt < 2000, dt + 'ms');

  /* 5c. auth-gated tiles reflow for logged-out users.
     (3 good tiles keep recruit mode off so the locked card stays mounted.) */
  var fetched = false;
  var e5c = makeEnv({ responders: { g1: { ok: true }, g2: { ok: true }, g3: { ok: true } } });
  var m5c = loadBundle(e5c);
  var P5c = e5c.win.PFCommand;
  ['g1', 'g2', 'g3'].forEach(function (a, i) {
    P5c.registerTile({ id: 'good' + i, label: 'G' + i, fetch: function () { return { action: a }; },
      render: function (c) { c.innerHTML = '<div class="pfc-tile-body">G</div>'; } });
  });
  P5c.registerTile({ id: 'auth1', label: 'SECRET', auth: true,
    fetch: function () { fetched = true; return { action: 'nope' }; },
    render: function () {} });
  for (var i5c = 0; i5c < 4; i5c++) e5c.win._triggerIO(tileCard(m5c, i5c));
  await tick(60);
  ok('auth-gated: no fetch when logged out', fetched === false);
  var locked = m5c.querySelectorAll('.pfc-tile-locked')[0];
  ok('auth-gated: locked card renders, grid reflows', !!locked);
  ok('auth-gated: no recruit sequence with 3 tiles with data',
    m5c.querySelectorAll('.pfc-recruit').length === 0);

  /* 5d. IntersectionObserver staggering */
  var e5d = makeEnv({ responders: { late: { ok: true } } });
  var m5d = loadBundle(e5d);
  var P5d = e5d.win.PFCommand;
  P5d.registerTile({ id: 'late', label: 'LATE', fetch: function () { return { action: 'late' }; },
    render: function (c) { c.innerHTML = '<div class="pfc-tile-body">L</div>'; } });
  await tick(30);
  ok('stagger: below-fold tile does not fetch before visible',
    e5d.win._jsonpCalls.filter(function (c) { return c.action === 'late'; }).length === 0);
  e5d.win._triggerIO(tileCard(m5d, 0));
  await tick(40);
  ok('stagger: tile fetches once visible',
    e5d.win._jsonpCalls.filter(function (c) { return c.action === 'late'; }).length === 1);

  /* 5e. no-IO fallback */
  var e5e = makeEnv({ io: false, responders: { nio: { ok: true } } });
  var m5e = loadBundle(e5e);
  var P5e = e5e.win.PFCommand;
  P5e.registerTile({ id: 'nio', label: 'NIO', fetch: function () { return { action: 'nio' }; },
    render: function (c) { c.innerHTML = '<div class="pfc-tile-body">N</div>'; } });
  await tick(40);
  ok('no-IO fallback: tile still loads', P5e._tilesWithData() === 1);

  /* ---- 6. callsign card ---- */
  var e6 = makeEnv({ callsign: 'VIPER', responders: { xp_today: { ok: true, xp_today: 42 } } });
  var m6 = loadBundle(e6);
  await tick(40);
  var card6 = m6.querySelectorAll('.pfc-callsign')[0];
  ok('callsign card: shows callsign + xp_today',
    card6.innerHTML.indexOf('VIPER') !== -1 && card6.innerHTML.indexOf('42') !== -1, card6.innerHTML.slice(0, 120));
  var e6b = makeEnv();
  var m6b = loadBundle(e6b);
  await tick(30);
  ok('callsign card: logged out → UNENLISTED',
    m6b.querySelectorAll('.pfc-callsign')[0].innerHTML.indexOf('UNENLISTED') !== -1);

  /* ---- 7. homepage exclusion in build config ---- */
  var bsrc = fs.readFileSync(path.join(ROOT, 'build', 'bundle.js'), 'utf8');
  function extractArray(src, key) {
    var start = src.indexOf("'" + key + "': [");
    if (start < 0) return null;
    var i = src.indexOf('[', start), depth = 0, inS = false, q = '';
    var noComments = src; /* comments may hold brackets — strip block comments from span later */
    for (; i < src.length; i++) {
      var ch = src[i];
      if (inS) { if (ch === q && src[i - 1] !== '\\') inS = false; continue; }
      if (ch === '"' || ch === "'") { inS = true; q = ch; continue; }
      if (ch === '[') depth++;
      if (ch === ']') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    return null;
  }
  var sec1 = extractArray(bsrc, 'bundle-sec1'), home = extractArray(bsrc, 'bundle-home');
  var cmdFiles = ['00-shell.js', '01-request.js', '02-registry.js'];
  var leak = cmdFiles.filter(function (f) {
    return (sec1 && sec1.indexOf(f) !== -1) || (home && home.indexOf(f) !== -1);
  });
  ok('homepage exclusion: command files absent from bundle-sec1/bundle-home', leak.length === 0, leak.join(','));
  ok('build config: bundle-command section exists', bsrc.indexOf("'bundle-command'") !== -1);
  ok('build config: homepage-exclusion guard present', bsrc.indexOf('HOMEPAGE_EXCLUDE') !== -1 || bsrc.indexOf('Homepage exclusion') !== -1);

  /* ---- 8. no xpGrant anywhere ---- */
  var noxp = ['00-shell.js', '01-request.js', '02-registry.js'].every(function (f) {
    return fs.readFileSync(path.join(CMD, f), 'utf8').indexOf('xpGrant') === -1;
  });
  ok('no xpGrant in command sources', noxp);
  ok('no xpGrant in built bundle-command.js',
    fs.readFileSync(path.join(ROOT, 'v1.4.3', 'games', 'bundle-command.js'), 'utf8').indexOf('xpGrant') === -1);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
})().catch(function (e) { console.error('TEST HARNESS ERROR', e); process.exitCode = 1; });
