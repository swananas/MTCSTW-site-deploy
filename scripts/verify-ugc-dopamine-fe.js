#!/usr/bin/env node
/* scripts/verify-ugc-dopamine-fe.js — UGC dopamine layer frontend verification.
   Run from the repo root: node scripts/verify-ugc-dopamine-fe.js
   1. node --check on the module + bundle registration
   2. Static checks: kill switch, no banned copy, no hardcoded XP numbers,
      hook presence (board/CPI/pledge/vote), feed endpoints, gas + stacked
      copy, reduced-motion, bundle wiring
   3. vm + FakeEl DOM runtime tests: celebration render, progress-bar math,
      streak display/milestones, board claim/confirm wiring (incl. gas
      "YOU SEALED IT"), quorum bars from DOM, stacked-leg apex, TOP HANDS +
      leaderboard pulse, feed fail-soft vs success, kill switch. */
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

var SILO = 'v1.4.3/core/ugc-dopamine.js';

console.log('== 1. node --check ==');
[SILO, 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var s = read(path.join(ROOT, SILO));
var bare = stripComments(s);
/* kill switch */
if (/PF\.skip\(['"]ugcdop['"]\)/.test(s) && /\?pf_off=ugcdop/.test(s)) ok('kill switch ?pf_off=ugcdop');
else no('kill switch', 'PF.skip("ugcdop") / ?pf_off=ugcdop missing');
/* banned copy */
var banned = ['donate', 'act now', 'hurry', 'limited time', 'last chance', "don't miss", 'guaranteed'];
var badHit = banned.filter(function (w) { return bare.toLowerCase().indexOf(w) !== -1; });
if (!badHit.length) ok('no banned copy (donate / fake urgency)');
else no('banned copy', 'found: ' + badHit.join(', '));
/* no hardcoded XP numbers in copy */
if (/\b\d+\s*XP\b/.test(bare)) no('XP numbers', 'hardcoded XP amount found in copy');
else ok('no hardcoded XP numbers');
/* MTCSTW identity */
if (/MTCSTW\.COM/.test(s)) ok('MTCSTW identity');
else no('identity', 'MTCSTW.COM missing');
/* hook presence */
[['pf:price-reported', 'CPI price form event'], ['pf-campaign-pledge', 'pledge wall event'],
 ['pf-vote-cast', 'fan vote event'], ['pf-data-bounties', 'bounty board host'],
 ['ugc_dopamine_feed', 'dopamine feed endpoint'], ['ugc_value_rank', 'value rank endpoint'],
 ['TOP HANDS', 'spotlight strip'], ['prefers-reduced-motion', 'reduced-motion safe'],
 ['ugd-qbar', 'quorum progress bars'], ['CONTRIBUTOR STREAK', 'streak display'],
 ['ugd-pulse', 'leaderboard pulse'], ['pf_ugd_seen_v1', 'celebration dedupe'],
 ['pf_ugc_legs_v1', 'stacked-leg store']
].forEach(function (pair) {
  if (s.indexOf(pair[0]) !== -1) ok('hook: ' + pair[1]);
  else no('hook: ' + pair[1], "'" + pair[0] + "' missing");
});
/* gas flagship copy */
if (/GAS PRICE LOCKED IN/.test(s) && /YOU SEALED IT/.test(s) && /GAS REPORT RECEIVED/.test(s))
  ok('gas flagship copy (lock-in / sealed-it / received)');
else no('gas copy', 'gas celebration copy missing');
/* stacked-leg apex copy */
if (/RALLY COMPLETE: 4\/4 LEGS/.test(s) && /RALLY: /.test(s))
  ok('stacked-leg apex copy (RALLY COMPLETE: 4/4 LEGS)');
else no('stack copy', 'stacked celebration copy missing');
/* honest-copy guard: celebrations echo own data, no aggregates invented */
if (/aggregates/.test(s) || /never aggregates/.test(s)) ok('honesty note in comments');
else no('honesty note', 'expected honesty comment');
/* bundle wiring: registered in core bundle build + shipped minified */
if (read(path.join(ROOT, 'build/bundle-core.js')).indexOf("'core/ugc-dopamine.js'") !== -1)
  ok('build/bundle-core.js registers core/ugc-dopamine.js');
else no('bundle registration', "'core/ugc-dopamine.js' missing from build/bundle-core.js");
if (read(path.join(ROOT, 'v1.4.3/core/bundle-core.js')).indexOf('UGCDopamine') !== -1)
  ok('minified core/bundle-core.js ships the silo');
else no('bundle artifact', 'UGCDopamine missing from minified core/bundle-core.js');
if (read(path.join(ROOT, 'v1.4.3/core/bundle-core-slr.js')).indexOf('UGCDopamine') !== -1)
  ok('minified core/bundle-core-slr.js ships the silo');
else no('bundle artifact (slr)', 'UGCDopamine missing from bundle-core-slr.js');
/* 44px tap targets */
if (/min-height:44px/.test(s) && /min-width:44px/.test(s)) ok('44px tap targets');
else no('tap targets', '44px min sizes missing');

console.log('== 3. runtime (vm + FakeEl DOM) ==');

/* ---------- minimal DOM ---------- */
function FakeEl(tag, id) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.id = id || '';
  this.className = '';
  this.children = [];
  this.parentNode = null;
  this.innerHTML = '';
  this.textContent = '';
  this.style = {};
  this.dataset = {};
  this._attrs = {};
  this._listeners = {};
  this.value = '';
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
FakeEl.prototype.setAttribute = function (k, v) {  this._attrs[k] = String(v);
  if (k === 'id') this.id = String(v);
  if (k === 'class') this.className = String(v);
};
FakeEl.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
};
FakeEl.prototype.addEventListener = function (t, f, cap) {
  (this._listeners[t] = this._listeners[t] || []).push({ f: f, cap: !!cap });
};
FakeEl.prototype._hasClasses = function (list) {
  var mine = (' ' + this.className + ' ').replace(/\s+/g, ' ');
  return list.every(function (c) { return mine.indexOf(' ' + c + ' ') !== -1; });
};
FakeEl.prototype._matchSimple = function (sel) {
  sel = sel.trim();
  if (!sel) return false;
  if (sel[0] === '#') return this.id === sel.slice(1);
  if (sel[0] === '.') return this._hasClasses(sel.slice(1).split('.'));
  if (/^[a-zA-Z]+$/.test(sel)) return this.tagName === sel.toUpperCase();
  var attr = /^\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(sel);
  if (attr) {
    var v = this.getAttribute(attr[1]);
    return attr[2] === undefined ? v !== null : v === attr[2];
  }
  return false;
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
  parts.forEach(function (p) {
    var bits = p.split(/\s+/);
    var cands = this._walk(bits[bits.length - 1], []);
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
  }, this);
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
FakeEl.prototype.contains = function (n) {
  while (n) { if (n === this) return true; n = n.parentNode; }
  return false;
};
Object.defineProperty(FakeEl.prototype, 'firstChild', {
  get: function () { return this.children.length ? this.children[0] : null; }
});
Object.defineProperty(FakeEl.prototype, 'lastChild', {
  get: function () { return this.children.length ? this.children[this.children.length - 1] : null; }
});
Object.defineProperty(FakeEl.prototype, 'classList', {  get: function () {
    var self = this;
    function cur() { return self.className.split(/\s+/).filter(Boolean); }
    return {
      add: function (c) { var cs = cur(); if (cs.indexOf(c) === -1) { cs.push(c); self.className = cs.join(' '); } },
      remove: function (c) { self.className = cur().filter(function (x) { return x !== c; }).join(' '); },
      contains: function (c) { return (' ' + self.className + ' ').indexOf(' ' + c + ' ') !== -1; }
    };
  }
});
FakeEl.prototype.insertAdjacentHTML = function (pos, html) {
  if (pos === 'beforeend') {
    /* quorum-bar parse: capture width + line */
    var w = /width:(\d+)%/.exec(html), line = /<div class="ugd-qt">([\s\S]*?)<\/div>/.exec(html);
    var bar = new FakeEl('div');
    bar.className = 'ugd-qbar' + (/ugd-gasbar/.test(html) ? ' ugd-gasbar' : '');
    bar.innerHTML = html;
    bar._barWidth = w ? Number(w[1]) : null;
    bar._barLine = line ? line[1] : '';
    this.appendChild(bar);
  } else if (pos === 'afterend' && this.parentNode) {
    var idm = /id="([^"]+)"/.exec(html);
    var wrap = new FakeEl('div', idm ? idm[1] : '');
    wrap.innerHTML = html;
    /* spotlight rows parse */
    var re = /<div class="ugd-th-row([^"]*)" data-cs="([^"]*)" data-rank="([^"]*)">/g, m;
    while ((m = re.exec(html))) {
      var row = new FakeEl('div');
      row.className = ('ugd-th-row' + m[1]).trim();
      row.setAttribute('data-cs', m[2]);
      row.setAttribute('data-rank', m[3]);
      wrap.appendChild(row);
    }
    var idx = this.parentNode.children.indexOf(this);
    this.parentNode.children.splice(idx + 1, 0, wrap);
    wrap.parentNode = this.parentNode;
    if (this._doc) this._doc._ids[wrap.id] = wrap;
  }
};
FakeEl.prototype.dispatchEvent = function (ev) {
  ev.target = ev.target || this;
  var path = [], n = this;
  while (n) { path.unshift(n); n = n.parentNode; }
  var i, L;
  for (i = 0; i < path.length; i++) { /* capture */
    L = path[i]._listeners[ev.type] || [];
    L.forEach(function (l) { if (l.cap) { try { l.f.call(path[i], ev); } catch (e) {} } });
  }
  for (i = path.length - 1; i >= 0; i--) { /* bubble */
    L = path[i]._listeners[ev.type] || [];
    L.forEach(function (l) { if (!l.cap) { try { l.f.call(path[i], ev); } catch (e) {} } });
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
      /* property-assigned ids (e.g. tray.id='ugd-tray') bypass the registry —
         fall back to a tree search, like the real DOM. */
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
      if (tag === 'script' && opts.onScript) opts.onScript(el);
      return el;
    },
    querySelector: function (sel) {
      var r = this.querySelectorAll(sel);
      return r.length ? r[0] : null;
    },
    querySelectorAll: function (sel) {
      var out = [];
      [this.body, this.head].forEach(function (root) {
        if (root && root._matchSimple && root._matchSimple(sel.split(',')[0].trim().split(/\s+/).pop())) { /* root self */ }
        var r = root.querySelectorAll(sel);
        r.forEach(function (e) { if (out.indexOf(e) === -1) out.push(e); });
      });
      return out;
    },
    addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
    dispatchEvent: function (ev) {
      var L = this._listeners[ev.type] || [];
      L.forEach(function (f) { try { f(ev); } catch (e) {} });
      return true;
    }
  };
  doc.head = new FakeEl('head'); doc.head._doc = doc;
  doc.body = new FakeEl('body'); doc.body._doc = doc;
  function reg(el) { if (el.id) doc._ids[el.id] = el; return el; }
  var store = {};
  var win = {
    document: doc,
    location: { href: opts.href || 'https://www.mtcstw.com/create' },
    PF: {
      skip: function (k) { return (opts.killed || []).indexOf(k) !== -1; },
      toast: function () {}, error: function () {}
    },
    PFCallsign: function () { return opts.callsign || ''; },
    PFDeviceId: function () { return 'dev1'; },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    matchMedia: function () { return { matches: !!opts.reduced }; },
    MutationObserver: function (cb) {
      this.cb = cb;
      (win._observers = win._observers || []).push(this);
    },
    CustomEvent: function (type, o) { this.type = type; this.detail = (o && o.detail) || {}; },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: setInterval, clearInterval: clearInterval,
    Intl: Intl, Date: Date, Math: Math, JSON: JSON, console: console
  };
  win.MutationObserver.prototype.observe = function () {};
  win.MutationObserver.prototype.disconnect = function () {};
  win.window = win;
  if (opts.backend) win.PF_BACKEND_URL = opts.backend;
  return { win: win, doc: doc, reg: reg, store: store };
}
function runSilo(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(s, ctx, { filename: 'ugc-dopamine.js' });
  return env.win.PF.UGCDopamine;
}
function trayHTML(env) {
  var t = env.doc.getElementById('ugd-tray');
  if (!t) return '';
  return t.children.map(function (c) { return '<div class="' + (c.className || '') + '">' + (c.innerHTML || ''); }).join('\n');
}
function fireObservers(env) {
  (env.win._observers || []).forEach(function (o) { try { o.cb([]); } catch (e) {} });
}

/* 3a. kill switch */
(function () {
  var env = makeEnv({ killed: ['ugcdop'] });
  runSilo(env);
  if (env.win.PF.UGCDopamine === undefined) ok('runtime: kill switch -> module inert');
  else no('runtime: kill switch', 'PF.UGCDopamine defined despite ?pf_off=ugcdop');
})();

/* 3b. fail-soft: no backend, no board host */
(function () {
  var env = makeEnv({});
  try {
    var api = runSilo(env);
    if (api && api.version === '1.0.0') ok('runtime: no backend/host -> boots, API present');
    else no('runtime: boot', 'API missing');
    api.refreshFeed(); /* must not throw with no backend */
    ok('runtime: refreshFeed with no backend -> no throw');
  } catch (e) { no('runtime: fail-soft', String(e && e.message || e)); }
})();

/* 3c. progress-bar math */
(function () {
  var env = makeEnv({});
  var api = runSilo(env);
  var h1 = api.progressHTML(1, 2, 'cpi_price');
  if (/width:50%/.test(h1) && /1 more confirmation and your price report locks in!/.test(h1))
    ok('runtime: bar 1/2 -> 50%, singular copy');
  else no('runtime: bar 1/2', h1.slice(0, 120));
  var h0 = api.progressHTML(0, 2, 'photo_evidence');
  if (/width:0%/.test(h0) && /2 more confirmations and your photo locks in!/.test(h0))
    ok('runtime: bar 0/2 -> 0%, plural copy');
  else no('runtime: bar 0/2', h0.slice(0, 120));
  var hg = api.progressHTML(2, 2, 'gas_price');
  if (/width:100%/.test(hg) && /Locked in/.test(hg) && /ugd-gasbar/.test(hg))
    ok('runtime: gas bar 2/2 -> full, gas treatment');
  else no('runtime: gas bar full', hg.slice(0, 120));
  if (/role="progressbar"/.test(h1) && /aria-valuenow="1"/.test(h1))
    ok('runtime: bar has progressbar ARIA');
  else no('runtime: bar ARIA', 'missing role/aria');
})();

/* 3d. kind + action-key parsing */
(function () {
  var env = makeEnv({});
  var t = runSilo(env)._t;
  if (t.kindFromBountyId('db_gas_price_downtown_2026-10-06') === 'gas_price') ok('runtime: kindFromBountyId gas_price');
  else no('runtime: kind gas', 'not detected');
  if (t.kindFromBountyId('db_crowd_confirm_rallyx_2026-10-06') === 'crowd_confirm') ok('runtime: kindFromBountyId crowd_confirm');
  else no('runtime: kind crowd', 'not detected');
  if (t.kindFromBountyId('db_whatever_2026-10-06') === '') ok('runtime: unknown kind -> empty');
  else no('runtime: kind unknown', 'should be empty');
  if (t.actionKeyFromBountyId('db_event_attendance_rallyx_2026-10-06') === 'rallyx' &&
      t.actionKeyFromBountyId('db_photo_evidence_rallyx_2026-10-06') === 'rallyx')
    ok('runtime: stacked legs share action key');
  else no('runtime: action key', 'legs do not group');
  if (t.parseConf('1/2 confirms').confirms === 1 && t.parseConf('12/3 confirms').quorum === 3)
    ok('runtime: parseConf');
  else no('runtime: parseConf', 'bad parse');
  if (t.fmtPrice(289) === '$2.89' && t.fmtPrice('abc') === '') ok('runtime: fmtPrice');
  else no('runtime: fmtPrice', 'bad format');
})();

/* 3e. streak display + milestone */
(function () {
  var env = makeEnv({});
  var api = runSilo(env);
  var t = api._t;
  var days = [t.chiDay(0), t.chiDay(1), t.chiDay(2)];
  env.win.localStorage.setItem('pf_ugc_days_v1', JSON.stringify(days));
  if (api.streak() === 3) ok('runtime: streak counts 3 consecutive Chicago days');
  else no('runtime: streak', 'got ' + api.streak());
  var chip = api.streakChipHTML();
  if (/🔥/.test(chip) && /<b>3<\/b>/.test(chip) && /CONTRIBUTOR STREAK/.test(chip) &&
      /Separate from your daily check-in streak/.test(chip))
    ok('runtime: streak chip (flame, count, distinct from daily)');
  else no('runtime: streak chip', chip.slice(0, 120));
  /* milestone: 6 prior days + today = 7 -> ceremony */
  var env2 = makeEnv({});
  var api2 = runSilo(env2);
  var t2 = api2._t;
  var d6 = [];
  for (var i = 1; i <= 6; i++) d6.push(t2.chiDay(i));
  env2.win.localStorage.setItem('pf_ugc_days_v1', JSON.stringify(d6));
  var r = api2.recordContribution('test');
  if (r.streak === 7 && r.milestone === 7) ok('runtime: 7-day milestone detected');
  else no('runtime: milestone', JSON.stringify(r));
  if (/CONTRIBUTOR STREAK: 7 DAYS/.test(trayHTML(env2))) ok('runtime: milestone celebration rendered');
  else no('runtime: milestone celebration', 'missing');
})();

/* 3f. CPI price-reported -> celebration (gas vs standard) */
(function () {
  var env = makeEnv({});
  runSilo(env);
  env.doc.dispatchEvent(new env.win.CustomEvent('pf:price-reported', { detail: {
    report_id: 42, item_id: 'gasoline', item_name: 'Gasoline (regular)', price_cents: 289, area_key: 'gulf'
  }}));
  var h = trayHTML(env);
  if (/GAS PRICE LOGGED/.test(h) && /\$2\.89\/gal/.test(h) && /ugd-gas/.test(h) && /contributor streak/.test(h))
    ok('runtime: gasoline report -> rich gas celebration, own price echoed');
  else no('runtime: gas price celebration', h.slice(0, 200));
  if (/Never sold|aggregates/.test(h) === false || true) { /* aggregates must NOT appear */ }
  if (/12 reports|average|median/i.test(h)) no('runtime: gas honesty', 'aggregate invented in celebration');
  else ok('runtime: gas celebration shows no aggregates');
  var env2 = makeEnv({});
  runSilo(env2);
  env2.doc.dispatchEvent(new env2.win.CustomEvent('pf:price-reported', { detail: {
    report_id: 43, item_id: 'milk', item_name: 'Milk', price_cents: 429, area_key: 'gulf'
  }}));
  var h2 = trayHTML(env2);
  if (/PRICE LOGGED/.test(h2) && /\$4\.29/.test(h2) && !/ugd-gas/.test(h2))
    ok('runtime: non-gas price -> standard celebration');
  else no('runtime: standard price celebration', h2.slice(0, 200));
})();

/* 3g. pledge + vote celebrations */
(function () {
  var env = makeEnv({});
  runSilo(env);
  env.doc.dispatchEvent(new env.win.CustomEvent('pf-campaign-pledge', { detail: { callsign: 'Tester1' } }));
  if (/PLEDGE ETCHED/.test(trayHTML(env)) && /name is on the wall/.test(trayHTML(env)))
    ok('runtime: pledge -> PLEDGE ETCHED');
  else no('runtime: pledge celebration', 'missing');
  var env2 = makeEnv({});
  runSilo(env2);
  env2.doc.dispatchEvent(new env2.win.CustomEvent('pf-vote-cast', { detail: { week: '2026-W41' } }));
  if (/VOTE CAST/.test(trayHTML(env2))) ok('runtime: vote -> VOTE CAST');
  else no('runtime: vote celebration', 'missing');
})();

/* helpers to build a fake bounty board */
function buildBoard(env, callsign) {
  var doc = env.doc;
  var host = new FakeEl('div', 'pf-data-bounties');
  host._doc = doc; doc._ids['pf-data-bounties'] = host;
  doc.body.appendChild(host);
  var head = new FakeEl('div'); head.className = 'db-head'; host.appendChild(head);
  return { host: host, head: head };
}
function buildCard(env, host, bid, kind, title, rows) {
  var card = new FakeEl('div');
  card.setAttribute('data-b', bid);
  card.className = 'db-card';
  var kt = new FakeEl('div'); kt.className = 'db-kind'; kt.textContent = kind; card.appendChild(kt);
  var tt = new FakeEl('div'); tt.className = 'db-title'; tt.textContent = title; card.appendChild(tt);
  (rows || []).forEach(function (r) {
    var row = new FakeEl('div'); row.className = 'db-claimrow';
    var cs = new FakeEl('span'); cs.className = 'db-cs'; cs.textContent = r.callsign; row.appendChild(cs);
    var cf = new FakeEl('span'); cf.className = 'db-conf'; cf.textContent = r.confirms + '/' + r.quorum + ' confirms'; row.appendChild(cf);
    if (r.confirmable) {
      var b = new FakeEl('button'); b.setAttribute('data-act', 'confirm'); b.setAttribute('data-claim', String(r.claimId)); row.appendChild(b);
      row._confirmBtn = b;
    }
    card.appendChild(row);
    row._rowSpec = r;
  });
  var form = new FakeEl('div'); form.className = 'db-claim';
  (rows._inputs || []).forEach(function (inp) {
    var i = new FakeEl('input'); i.className = 'db-in';
    i.setAttribute('data-f', inp.f); i.value = inp.v; form.appendChild(i);
  });
  var claimBtn = new FakeEl('button'); claimBtn.setAttribute('data-act', 'claim'); form.appendChild(claimBtn);
  card.appendChild(form); card._claimBtn = claimBtn;
  var msg = new FakeEl('div'); msg.className = 'db-msg'; card.appendChild(msg); card._msg = msg;
  host.appendChild(card);
  return card;
}

/* 3h. board claim (gas): click capture -> RECEIVED with own price.
   The module debounces observer scans (120ms), so assertions wait. */
function test3h(done) {
  var env2 = makeEnv({ callsign: 'Tester1' });
  var b2 = buildBoard(env2, 'Tester1');
  var card2 = buildCard(env2, b2.host, 'db_gas_price_downtown_2026-10-06', 'gas_price', 'Gas: downtown', []);
  var inp = new FakeEl('input'); inp.className = 'db-in'; inp.setAttribute('data-f', 'price_cents'); inp.value = '279';
  card2.querySelector('.db-claim').appendChild(inp);
  runSilo(env2);
  card2._claimBtn.dispatchEvent({ type: 'click' });
  card2._msg.className = 'db-msg ok';
  card2._msg.textContent = 'Submitted — awaiting confirmation.';
  fireObservers(env2);
  setTimeout(function () {
    var h = trayHTML(env2);
    if (/GAS REPORT RECEIVED/.test(h) && /\$2\.79\/gal/.test(h))
      ok('runtime: gas claim -> GAS REPORT RECEIVED, own price echoed');
    else no('runtime: gas claim celebration', h.slice(0, 200));
    var before = h;
    fireObservers(env2); /* idempotent: no duplicate */
    setTimeout(function () {
      if (trayHTML(env2) === before) ok('runtime: claim celebration deduped');
      else no('runtime: claim dedupe', 'celebrated twice');
      done();
    }, 250);
  }, 250);
}

/* 3i. board confirm fill: gas -> YOU SEALED IT; standard -> CONFIRMATION ACCEPTED */
function test3i(done) {
  function oneConfirm(bid, kind, title, msgText, wantRe, label, next) {
    var env = makeEnv({ callsign: 'Tester1' });
    var b = buildBoard(env, 'Tester1');
    var card = buildCard(env, b.host, bid, kind, title,
      [{ callsign: 'shooter9', confirms: 1, quorum: 2, claimId: 7, confirmable: true }]);
    runSilo(env);
    card.querySelector('.db-claimrow')._confirmBtn.dispatchEvent({ type: 'click' });
    card._msg.className = 'db-msg ok';
    card._msg.textContent = msgText;
    fireObservers(env);
    setTimeout(function () {
      if (wantRe.test(trayHTML(env))) ok('runtime: ' + label);
      else no('runtime: ' + label, trayHTML(env).slice(0, 200));
      next();
    }, 250);
  }
  oneConfirm('db_gas_price_downtown_2026-10-06', 'gas_price', 'Gas: downtown',
    'Confirmed — bounty filled!', /YOU SEALED IT/, 'gas fill -> YOU SEALED IT (confirmer)',
    function () {
      oneConfirm('db_cpi_price_milk_2026-10-06', 'cpi_price', 'Milk price',
        'Confirmed — bounty filled!', /CONFIRMATION ACCEPTED/, 'standard fill -> CONFIRMATION ACCEPTED',
        function () {
          var env3 = makeEnv({ callsign: 'Tester1' });
          var b3 = buildBoard(env3, 'Tester1');
          var card3 = buildCard(env3, b3.host, 'db_cpi_price_milk_2026-10-06', 'cpi_price', 'Milk price',
            [{ callsign: 'shooter9', confirms: 0, quorum: 2, claimId: 9, confirmable: true }]);
          runSilo(env3);
          card3.querySelector('.db-claimrow')._confirmBtn.dispatchEvent({ type: 'click' });
          card3._msg.className = 'db-msg ok';
          card3._msg.textContent = 'Confirmation recorded (1).';
          fireObservers(env3);
          setTimeout(function () {
            var h3 = trayHTML(env3);
            if (/CONFIRMATION ACCEPTED/.test(h3) && /Recorded/.test(h3))
              ok('runtime: non-final confirm -> recorded moment');
            else no('runtime: recorded confirm', h3.slice(0, 200));
            done();
          }, 250);
        });
    });
}

/* 3j. quorum bars from DOM + honest leg fill for my quorum-met claim */
function test3j() {
  var env = makeEnv({ callsign: 'Tester1' });
  var b = buildBoard(env, 'Tester1');
  buildCard(env, b.host, 'db_cpi_price_milk_2026-10-06', 'cpi_price', 'Milk price',
    [{ callsign: 'other1', confirms: 1, quorum: 2, claimId: 11, confirmable: true }]);
  buildCard(env, b.host, 'db_gas_price_downtown_2026-10-06', 'gas_price', 'Gas: downtown',
    [{ callsign: 'Tester1', confirms: 2, quorum: 2, claimId: 12 }]);
  var api = runSilo(env);
  var n = api._t.renderBarsFromDOM(b.host);
  var bars = b.host.querySelectorAll('.ugd-qbar');
  if (n === 2 && bars.length === 2) ok('runtime: bars injected for 2 claim rows');
  else no('runtime: bar injection', 'n=' + n + ' bars=' + bars.length);
  if (bars[0]._barWidth === 50 && /1 more confirmation and your price report locks in!/.test(bars[0]._barLine))
    ok('runtime: DOM bar 1/2 -> 50% + copy');
  else no('runtime: DOM bar content', 'w=' + bars[0]._barWidth + ' line=' + bars[0]._barLine);
  if (bars[1]._barWidth === 100) ok('runtime: DOM bar 2/2 -> 100%');
  else no('runtime: DOM full bar', 'w=' + bars[1]._barWidth);
  var st = api._t.getStack('downtown');
  if (st && st.legs && st.legs.action === undefined) { /* gas_price has no leg; must not invent one */ }
  /* my 2/2 gas claim: gas has no stacked leg -> no leg recorded, honest */
  if (!st || !st.legs || Object.keys(st.legs).length === 0)
    ok('runtime: gas claim fill records no invented stacked leg');
  else no('runtime: leg honesty', 'invented leg: ' + Object.keys(st.legs).join(','));
  /* claimant gas lock-in: stash price at claim click, then quorum -> flagship */
  var envG = makeEnv({ callsign: 'Tester1' });
  var bG = buildBoard(envG, 'Tester1');
  var cardG = buildCard(envG, bG.host, 'db_gas_price_downtown_2026-10-06', 'gas_price', 'Gas: downtown',
    [{ callsign: 'Tester1', confirms: 2, quorum: 2, claimId: 21 }]);
  var apiG = runSilo(envG);
  var inpG = new FakeEl('input'); inpG.className = 'db-in';
  inpG.setAttribute('data-f', 'price_cents'); inpG.value = '279';
  cardG.querySelector('.db-claim').appendChild(inpG);
  cardG._claimBtn.dispatchEvent({ type: 'click' }); /* stashes my price */
  apiG._t.renderBarsFromDOM(bG.host);
  var hG = trayHTML(envG);
  if (/GAS PRICE LOCKED IN/.test(hG) && /\$2\.79\/gal/.test(hG) && /contributor streak/.test(hG))
    ok('runtime: my gas claim fills -> GAS PRICE LOCKED IN, own price, streak bump');
  else no('runtime: gas lock-in', hG.slice(0, 250));
}

/* 3k. stacked legs -> RALLY 2/4 -> RALLY COMPLETE 4/4 apex */
function test3k() {
  var env = makeEnv({ callsign: 'Tester1' });
  var api = runSilo(env);
  var A = 'db_event_attendance_rallyx_2026-10-06';
  api.markLegFilled(A, 'action', { title: 'Rally X' });
  if (/RALLY: 1 OF 4/.test(trayHTML(env))) no('runtime: stack 1/4', 'should not celebrate a single leg');
  else ok('runtime: single leg -> no stack celebration');
  api.markLegFilled('db_photo_evidence_rallyx_2026-10-06', 'proof', { title: 'Rally X' });
  if (/RALLY: 2 OF 4 LEGS/.test(trayHTML(env))) ok('runtime: 2 legs -> RALLY: 2 OF 4 LEGS');
  else no('runtime: stack 2/4', trayHTML(env).slice(0, 200));
  api.markLegFilled('db_crowd_confirm_rallyx_2026-10-06', 'intel', { title: 'Rally X' });
  api.markLegFilled('db_event_attendance_rallyx_2026-10-06', 'cell', { title: 'Rally X' });
  var h = trayHTML(env);
  if (/RALLY COMPLETE: 4\/4 LEGS/.test(h) && /ugd-apex/.test(h))
    ok('runtime: 4 legs -> RALLY COMPLETE apex');
  else no('runtime: apex', h.slice(0, 300));
  if (/The action/.test(h) && /The proof/.test(h) && /The intel/.test(h) && /The cell showing/.test(h) &&
      (h.match(/locked in/g) || []).length >= 4)
    ok('runtime: apex lists all 4 legs with honest states');
  else no('runtime: apex legs', 'leg rows incomplete');
  if (api.stackFilledCount('rallyx') === 4) ok('runtime: stackFilledCount 4');
  else no('runtime: stackFilledCount', 'got ' + api.stackFilledCount('rallyx'));
}

/* 3l. TOP HANDS + leaderboard pulse */
function test3l() {
  var env = makeEnv({ callsign: 'Tester1' });
  var b = buildBoard(env, 'Tester1');
  var api = runSilo(env);
  env.win.localStorage.setItem('pf_ugd_rank_v1', JSON.stringify(5));
  api.renderTopHands({ ok: true, my_callsign: 'tester1', my_rank: 3, top: [
    { callsign: 'alpha', rank: 1, cohort: 'vanguard' },
    { callsign: 'beta', rank: 2, cohort: 'vanguard' },
    { callsign: 'tester1', rank: 3, cohort: 'agitator' },
    { callsign: 'delta', rank: 4, cohort: 'agitator' },
    { callsign: 'eps', rank: 5, cohort: 'sympathizer' }
  ]});
  var strip = env.doc.getElementById('ugd-tophands');
  if (strip && /TOP HANDS/.test(strip.innerHTML) && /new hands can win too/.test(strip.innerHTML))
    ok('runtime: TOP HANDS strip + cohort note');
  else no('runtime: top hands', 'strip missing');
  var me = strip ? strip.querySelector('.ugd-th-row.me') : null;
  if (me && /ugd-pulse/.test(me.className)) ok('runtime: rank climb 5->3 pulses my row');
  else no('runtime: pulse', 'my row did not pulse');
  if (env.win.localStorage.getItem('pf_ugd_rank_v1') === '3') ok('runtime: rank persisted');
  else no('runtime: rank persist', 'not stored');
  /* empty feed -> no strip, no invented names */
  var env2 = makeEnv({});
  buildBoard(env2, '');
  var api2 = runSilo(env2);
  api2.renderTopHands({ ok: true, top: [] });
  if (!env2.doc.getElementById('ugd-tophands')) ok('runtime: empty rank -> no strip (fail-soft)');
  else no('runtime: empty rank', 'strip rendered without data');
}

/* 3m. feed fail-soft (dead endpoint) */
function test3m() {
  var env = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev/', callsign: 'Tester1',
    onScript: function (el) {
      Object.defineProperty(el, 'src', {
        set: function () { var e = el; setTimeout(function () { if (e.onerror) e.onerror(); }, 5); },
        get: function () { return ''; }
      });
    } });
  var b = buildBoard(env, 'Tester1');
  try {
    var api = runSilo(env);
    api.refreshFeed();
    setTimeout(function () {
      if (!env.doc.getElementById('ugd-tophands')) ok('runtime: dead feed -> no strip, no throw');
      else no('runtime: dead feed', 'strip appeared without data');
      feedSuccess();
    }, 60);
  } catch (e) { no('runtime: dead feed', String(e && e.message || e)); feedSuccess(); }

  /* 3n. feed success: stacks drive the apex */
  function feedSuccess() {
    var env2 = makeEnv({ backend: 'https://pf-api.mtcstw.workers.dev/', callsign: 'Tester1',
      onScript: function (el) {
        Object.defineProperty(el, 'src', {
          set: function (u) {
            var m = /callback=([^&]+)/.exec(u);
            var cb = m && m[1];
            setTimeout(function () {
              if (!cb || !env2.win[cb]) return;
              if (/ugc_dopamine_feed/.test(u)) env2.win[cb]({ ok: true, claims: [],
                stacks: [{ action_key: 'feedrally', title: 'Feed Rally',
                  legs: { action: { state: 'filled' }, proof: { state: 'filled' },
                          intel: { state: 'filled' }, cell: { state: 'filled' } } }] });
              else env2.win[cb]({ ok: false });
            }, 5);
          },
          get: function () { return ''; }
        });
      } });
    buildBoard(env2, 'Tester1');
    var api2 = runSilo(env2);
    api2.refreshFeed();
    setTimeout(function () {
      if (/RALLY COMPLETE: 4\/4 LEGS/.test(trayHTML(env2))) ok('runtime: feed stacks -> apex celebration');
      else no('runtime: feed stacks', trayHTML(env2).slice(0, 200));
      reducedMotion();
    }, 60);
  }

  /* 3o. reduced motion: renders without confetti crash */
  function reducedMotion() {
    var env3 = makeEnv({ reduced: true });
    try {
      var api3 = runSilo(env3);
      api3.celebrate({ title: 'LOCKED IN', sub: 'test' });
      if (/LOCKED IN/.test(trayHTML(env3))) ok('runtime: reduced-motion -> celebration renders');
      else no('runtime: reduced motion', 'no card');
    } catch (e) { no('runtime: reduced motion', String(e && e.message || e)); }
    bannedCopyScan();
  }

  /* 3p. banned copy scan over everything rendered */
  function bannedCopyScan() {
    var env4 = makeEnv({ callsign: 'Tester1' });
    var b4 = buildBoard(env4, 'Tester1');
    var api4 = runSilo(env4);
    api4.celebrate({ title: 'GAS PRICE LOCKED IN', tier: 'gas', sub: '$2.89/gal test' });
    api4.celebrate({ title: 'RALLY COMPLETE: 4/4 LEGS', tier: 'apex', legsHTML: api4.stackHTML('rallyx') });
    var all = trayHTML(env4) + ' ' + api4.progressHTML(1, 2, 'gas_price') + ' ' + api4.streakChipHTML();
    var bad = [];
    if (/donate/i.test(all)) bad.push('donate');
    if (/\b\d+\s*XP\b/.test(all)) bad.push('XP number');
    if (/act now|hurry|limited time|last chance/i.test(all)) bad.push('fake urgency');
    if (bad.length) no('runtime: banned copy', bad.join(', '));
    else ok('runtime: rendered copy clean (no donate/XP/urgency)');
    finish();
  }
}

/* ---- async chain: observer tests first, then the rest ---- */
test3h(function () {
  test3i(function () {
    test3j();
    test3k();
    test3l();
    test3m();
  });
});

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
