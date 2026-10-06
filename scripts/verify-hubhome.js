#!/usr/bin/env node
/* scripts/verify-hubhome.js — static + runtime checks for the user-hub
   homepage (CEO directive 2026-10-06): #pf-v2 becomes the recognized user's
   campaign hub; anonymous visitors see the public landing untouched.
   No network. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..', 'v1.4.3');
var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
/* Comment-stripped view for static checks (no string stripping — the
   esc() regex literal /"/g unbalances naive strippers; see AGENTS.md). */
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^\:'"\\])\/\/[^\n]*/g, '$1'); }

var hub = read('core/32-hubhome.js');
var hcode = code(hub);

/* 1. syntax */
try {
  cp.execSync('node --check ' + JSON.stringify(path.join(ROOT, 'core/32-hubhome.js')), { stdio: 'pipe' });
  ok('syntax core/32-hubhome.js', true);
} catch (e) { ok('syntax core/32-hubhome.js', false, 'node --check failed'); }

/* 2. kill switch + editor guard */
ok('kill switch ?pf_off=hubhome', hcode.indexOf("PF.skip('hubhome')") !== -1);
ok('kill switch localStorage list', hub.indexOf('pf_disabled_v1') !== -1);
ok('editor guard (/config/)', hcode.indexOf('/config/') !== -1);
ok('editor guard (sqs-edit-mode)', hcode.indexOf('sqs-edit-mode') !== -1);

/* 3. homepage gate + mode detection */
ok('homepage gate #pf-v2', hcode.indexOf("getElementById('pf-v2')") !== -1);
ok('device-local callsign detection (PFCallsign)', hcode.indexOf('window.PFCallsign') !== -1);
ok('anonymous early return (no DOM touch)', /if\s*\(!cs\)\s*return/.test(hcode));

/* 4. zero new XP, no writes */
ok('no XP grants (xpGrant)', hcode.indexOf('xpGrant') === -1);
ok('no backend writes (authPost)', hcode.indexOf('authPost') === -1);
ok('no fetch/XHR', hcode.indexOf('fetch(') === -1 && hcode.indexOf('XMLHttpRequest') === -1);

/* 5. composes pillars, duplicates nothing */
ok('uses PF.pillars.go (no duplicated pillar logic)', hcode.indexOf('PF.pillars') !== -1 && hcode.indexOf('.go(') !== -1);
ok('uses pathNames for kicker flavor', hcode.indexOf('pathNames') !== -1);
ok('no "donate" anywhere', !/donate/i.test(hub));

/* 6. escaping + idempotency + placement */
ok('esc() on callsign', /esc\(cs\)/.test(hcode));
ok('esc() on cell name', /esc\(d\.cellName/.test(hcode));
ok('idempotent (pf-hubhero exists -> return null)', hcode.indexOf("getElementById('pf-hubhero')") !== -1);
ok('inserts as first child of #pf-v2', hcode.indexOf('insertBefore(el, host.firstChild)') !== -1);

/* 7. hub content contract */
['YOUR CAMPAIGN', 'NEXT MOVE', 'DAILY ORDERS', 'WAR REPORT', 'data-ph-go', 'pf-orders', '/war-report'].forEach(function (s) {
  ok('hub contains: ' + s, hub.indexOf(s) !== -1);
});
ok('claim-event flip (pf-callsign-claimed)', hub.indexOf('pf-callsign-claimed') !== -1);

/* 8. FRONT LINES reachability (workstream 1, 2026-10-06): every major
   feature not covered by the pillar bar is one tap from the hub.
   Pillar-covered features stay out of the grid (no duplication):
   price check-in (DATA -> /economy#pf-inflation-checkin), events (ACT ->
   /events), cells (ORGANIZE -> /cells), Daily Orders + War Report (cards). */
ok('FRONT LINES kicker', hub.indexOf('FRONT LINES') !== -1);
var FRONT_LINE_HREFS = [
  '/call-it', '/peoples-cpi', '/follow-the-money', '/cell-war',
  '/arcade', '/create', '/store', '/fund', '/governance',
  '/request-access#pf-academy-hq', '/data-bounties'
];
FRONT_LINE_HREFS.forEach(function (href) {
  ok('front lines links: ' + href, hcode.indexOf("'" + href + "'") !== -1 || hcode.indexOf('"' + href + '"') !== -1);
});
ok('front lines grid has 12 entries', (hcode.match(/\{ k: '/g) || []).length === 12);

/* ---------- runtime sandbox ---------- */
function parseAttrs(str) {
  var attrs = {}, m, re = /([\w-]+)(?:="([^"]*)")?/g;
  while ((m = re.exec(str))) { if (m[1]) attrs[m[1]] = m[2] !== undefined ? m[2] : ''; }
  return attrs;
}
/* Minimal HTML parser: builds element stubs with parent/children so
   querySelector(All) works for [data-*], #id, and .class selectors. */
function parseHtml(html, reg) {
  var roots = [];
  var stack = [];
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g, m;
  var SELF = { br: 1, img: 1, input: 1, hr: 1 };
  function mkEl(tag, attrs) {
    var el = {
      tagName: tag.toUpperCase(), attrs: attrs, children: [],
      parentNode: null, _listeners: {}, _html: '',
      getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; reg(c); return c; },
      insertBefore: function (c, r) {
        var i = this.children.indexOf(r);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; reg(c); return c;
      },
      replaceChild: function (n, o) {
        var i = this.children.indexOf(o);
        if (i !== -1) this.children[i] = n;
        n.parentNode = this; reg(n); return n;
      },
      get firstChild() { return this.children[0] || null; },
      querySelectorAll: function (sel) { return qsa(this, sel); },
      querySelector: function (sel) { return qsa(this, sel)[0] || null; }
    };
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._html; },
      set: function (h) {
        this._html = String(h); this.children = [];
        parseInto(this._html, this, reg);
      }
    });
    Object.defineProperty(el, 'textContent', {
      get: function () { return this._text || ''; },
      set: function (t) { this._text = String(t); }
    });
    /* Real-DOM fidelity: .id reflects to the id attribute. */
    Object.defineProperty(el, 'id', {
      get: function () { return this.attrs.id || ''; },
      set: function (v) { this.attrs.id = String(v); }
    });
    return el;
  }
  function parseInto(src, parent, rg) {
    var st = [];
    var rr = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g, mm;
    while ((mm = rr.exec(src))) {
      var closing = mm[1] === '/', tag = mm[2].toLowerCase(), attrs = parseAttrs(mm[3] || '');
      if (closing) { st.pop(); continue; }
      var el = mkEl(tag, attrs); rg(el);
      var host = st.length ? st[st.length - 1] : parent;
      host.children.push(el); el.parentNode = host;
      if (!mm[4] && !SELF[tag]) st.push(el);
    }
  }
  while ((m = re.exec(html))) {
    var closing = m[1] === '/', tag = m[2].toLowerCase(), attrs = parseAttrs(m[3] || '');
    if (closing) { stack.pop(); continue; }
    var el = mkEl(tag, attrs); reg(el);
    var host = stack.length ? stack[stack.length - 1] : null;
    if (host) { host.children.push(el); el.parentNode = host; }
    else roots.push(el);
    if (!m[4] && !SELF[tag]) stack.push(el);
  }
  return roots;
}
function matches(el, sel) {
  if (sel.charAt(0) === '#') return el.attrs.id === sel.slice(1);
  if (sel.charAt(0) === '.') {
    var c = (el.attrs['class'] || '').split(/\s+/);
    return c.indexOf(sel.slice(1)) !== -1;
  }
  var am = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (am) {
    var v = el.attrs[am[1]];
    return v !== undefined && (am[2] === undefined || v === am[2]);
  }
  var tm = sel.match(/^([a-z]+)\[([\w-]+)(?:="([^"]*)")?\]$/i);
  if (tm) {
    if (el.tagName !== tm[1].toUpperCase()) return false;
    var vv = el.attrs[tm[2]];
    return vv !== undefined && (tm[3] === undefined || vv === tm[3]);
  }
  return el.tagName === sel.toUpperCase();
}
function qsa(root, sel) {
  var out = [];
  (function walk(n) {
    if (n !== root && matches(n, sel)) out.push(n);
    (n.children || []).forEach(walk);
  })(root);
  return out;
}

function makeSandbox(opts) {
  opts = opts || {};
  var registry = [];
  function reg(el) { if (registry.indexOf(el) === -1) registry.push(el); return el; }
  var idMap = {};
  var home = null;
  if (opts.home !== false) {
    home = {
      tagName: 'DIV', attrs: { id: 'pf-v2' }, children: [], parentNode: null,
      _listeners: {}, _html: '',
      getAttribute: function (k) { return this.attrs[k] || null; },
      addEventListener: function () {},
      appendChild: function (c) { this.children.push(c); c.parentNode = this; reg(c); return c; },
      insertBefore: function (c, r) {
        var i = this.children.indexOf(r);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; reg(c); return c;
      },
      get firstChild() { return this.children[0] || null; },
      querySelectorAll: function (s) { return qsa(this, s); },
      querySelector: function (s) { return qsa(this, s)[0] || null; }
    };
    Object.defineProperty(home, 'innerHTML', {
      get: function () { return this._html; },
      set: function (h) { this._html = String(h); }
    });
    reg(home);
    idMap['pf-v2'] = home;
  }
  var store = {};
  Object.keys(opts.ls || {}).forEach(function (k) { store[k] = opts.ls[k]; });
  var goCalls = [];
  var openedChooser = false;
  var pillarsStub = opts.pillars === false ? null : {
    pillars: [
      { key: 'spread', path: 'propagandist', label: 'SPREAD', sub: 'PROPAGANDA' },
      { key: 'data', path: 'data', label: 'DATA', sub: 'INTEL' },
      { key: 'act', path: 'act', label: 'ACT', sub: 'ACTION' },
      { key: 'organize', path: 'organizer', label: 'ORGANIZE', sub: 'SQUAD' }
    ],
    getPaths: function () { return opts.paths || []; },
    pathNames: function () {
      return (opts.paths || []).map(function (p) {
        return { propagandist: 'PROPAGANDIST', data: 'DATA SCOUT', activist: 'ACTIVIST', organizer: 'ORGANIZER' }[p] || p;
      });
    },
    go: function (k) { goCalls.push(k); return true; },
    openChooser: function () { openedChooser = true; }
  };
  var apiLog = [];
  var sandbox = {
    console: console,
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function (id) {
        if (id === 'pf-hubhero') {
          var f = registry.filter(function (e) { return e.attrs && e.attrs.id === 'pf-hubhero'; });
          return f[0] || null;
        }
        if (id === 'pf-hubhero-css') return null;
        return idMap[id] || null;
      },
      createElement: function (t) {
        var roots = parseHtml('<' + t + '></' + t + '>', reg);
        return roots[0];
      },
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; },
      head: {
        children: [],
        appendChild: function (c) { this.children.push(c); reg(c); return c; }
      },
      body: { classList: { contains: function () { return false; } } }
    },
    localStorage: {
      getItem: function (k) { return store[k] != null ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: function () { return 0; },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = {
    skip: function (s) { return (opts.skip || []).indexOf(s) !== -1; },
    authGetJSONP: function (be, action, params, cb) {
      apiLog.push(action);
      var R = opts.api || {};
      cb(R[action] || null);
    },
    pillars: pillarsStub,
    error: function () {}
  };
  sandbox.window.PFCallsign = function () { return opts.callsign || ''; };
  sandbox.window.PF_BACKEND_URL = 'https://example.invalid/';
  sandbox.window.location = { href: 'https://mtcstw.com/', pathname: '/', search: opts.search || '' };
  vm.createContext(sandbox);
  sandbox._goCalls = goCalls;
  sandbox._apiLog = apiLog;
  sandbox._openedChooser = function () { return openedChooser; };
  sandbox._home = home;
  return sandbox;
}
function hubHero(sb) {
  try {
    return sb.document.getElementById('pf-hubhero');
  } catch (e) { return null; }
}
function fireClick(el) {
  var ls = el._listeners.click || [];
  for (var i = 0; i < ls.length; i++) ls[i]({ stopPropagation: function () {}, preventDefault: function () {} });
}

/* A. anonymous: no hub */
(function () {
  var sb = makeSandbox({ callsign: '' });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    ok('runtime: anonymous -> no hub hero', !hubHero(sb));
    ok('runtime: anonymous -> no API calls', sb._apiLog.length === 0);
  } catch (e) { ok('runtime: anonymous executes', false, String(e && e.message || e)); }
})();

/* B. recognized: hub hero leads */
(function () {
  var sb = makeSandbox({
    callsign: 'TESTER',
    ls: { pf_ranks_v1: '{"xp":160}' },
    api: {
      xp_today: { ok: true, xp_today: 250 },
      streak_status: { ok: true, count: 7, at_risk: true },
      cell_mine: { ok: true, in_cell: true, cells: [{ name: 'ALPHA', checked_today: true }] },
      dopamine_status: { ok: true, loot: { claimed_today: true }, streak: { at_risk: true } }
    }
  });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    var hero = hubHero(sb);
    ok('runtime: recognized -> hub hero inserted', !!hero);
    ok('runtime: hero is first child of #pf-v2',
      !!hero && sb._home.firstChild === hero);
    var html = hero.innerHTML;
    ok('runtime: kicker YOUR CAMPAIGN', html.indexOf('YOUR CAMPAIGN') !== -1);
    ok('runtime: callsign shown', html.indexOf('TESTER') !== -1);
    ok('runtime: rank shown (COMMISSAR @160xp)',
      hero.querySelector('[data-ph-rank]').textContent === 'COMMISSAR');
    ok('runtime: streak shown',
      hero.querySelector('[data-ph-streak]').innerHTML.indexOf('7') !== -1);
    ok('runtime: cell shown',
      hero.querySelector('[data-ph-cell]').innerHTML.indexOf('ALPHA') !== -1);
    ok('runtime: next move = STREAK AT RISK',
      hero.querySelector('[data-ph-next]').innerHTML.indexOf('STREAK AT RISK') !== -1);
    ok('runtime: orders link', html.indexOf('/#pf-orders') !== -1);
    ok('runtime: war report link', html.indexOf('/war-report') !== -1);
    var btns = hero.querySelectorAll('[data-ph-go]');
    ok('runtime: 4 pillar buttons', btns.length === 4);
    fireClick(btns[1]);
    ok('runtime: pillar tap fires PF.pillars.go(data)',
      sb._goCalls.length === 1 && sb._goCalls[0] === 'data');
    var ch = hero.querySelector('[data-ph-paths]');
    fireClick(ch);
    ok('runtime: change-fights opens chooser', sb._openedChooser());
    /* FRONT LINES reachability: 12 compact cards, every non-pillar feature
       one tap from the hub. */
    var fl = hero.querySelectorAll('.ph-fl');
    ok('runtime: front lines grid = 12 cards', fl.length === 12);
    var flHrefs = ['/call-it', '/peoples-cpi', '/follow-the-money', '/cell-war',
      '/arcade', '/create', '/store', '/fund', '/governance',
      '/request-access#pf-academy-hq', '/data-bounties'];
    var missing = flHrefs.filter(function (href) { return html.indexOf(href) === -1; });
    ok('runtime: front lines cover all 11 destinations', missing.length === 0,
      missing.length ? 'missing: ' + missing.join(', ') : '');
  } catch (e) { ok('runtime: recognized executes', false, String(e && e.message || e)); }
})();

/* C. kill switch */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', skip: ['hubhome'] });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    ok('runtime: ?pf_off=hubhome -> no hub', !hubHero(sb));
  } catch (e) { ok('runtime: kill switch executes', false, String(e && e.message || e)); }
})();

/* D. no homepage shell */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', home: false });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    ok('runtime: no #pf-v2 -> no hub', !hubHero(sb));
  } catch (e) { ok('runtime: no-shell executes', false, String(e && e.message || e)); }
})();

/* E. path flavoring */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', paths: ['propagandist', 'data'] });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    var hero = hubHero(sb);
    var html = hero ? hero.innerHTML : '';
    ok('runtime: kicker flavored with paths',
      html.indexOf('PROPAGANDIST + DATA SCOUT') !== -1);
  } catch (e) { ok('runtime: path flavor executes', false, String(e && e.message || e)); }
})();

/* F. no pillars module -> no bar, hub still renders */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', pillars: false });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    var hero = hubHero(sb);
    ok('runtime: hub renders without pillars module', !!hero);
    ok('runtime: no pillar buttons without module',
      hero.querySelectorAll('[data-ph-go]').length === 0);
  } catch (e) { ok('runtime: no-pillars executes', false, String(e && e.message || e)); }
})();

/* G. backend down -> shell still renders, fail-open */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', api: {} });
  try {
    vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
    var hero = hubHero(sb);
    ok('runtime: hub renders with backend down', !!hero);
    ok('runtime: next move falls back (no cell -> FIND YOUR CELL)',
      hero.querySelector('[data-ph-next]').innerHTML.indexOf('FIND YOUR CELL') !== -1);
  } catch (e) { ok('runtime: backend-down executes', false, String(e && e.message || e)); }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
