#!/usr/bin/env node
/* scripts/verify-hubhome.js — static + runtime checks for the HOMEPAGE HUB
   (teardown WS-1 redesign, CEO-approved 2026-10-06). #pf-v2 becomes:
     ANONYMOUS (no callsign): #pf-anonhero — P1 Briefing Hero (red caps
       kicker, one-line mission, single red JOIN THE FIGHT. button wired to
       the existing claim modal) + dense FRONT LINES grid. Zero backend
       reads; the public landing below stays byte-identical.
     RECOGNIZED (device-local callsign): #pf-hubhero — YOUR CAMPAIGN leads:
       P1 hero + P5 Progression Ring + Next Move ("YOUR ORDERS →" kicker)
       + Daily Orders / War Report intel cards + FRONT LINES grid.
   Every card carries the P6 Action Bar. The pillar bar is NOT rendered here
   (it lives in the HUD's YOUR CAMPAIGN strip — one persistent nav).
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
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1'); }

var hub = read('core/32-hubhome.js');
var hcode = code(hub);
var patternsSrc = read('core/33-patterns.js');

/* 1. syntax */
try {
  cp.execSync('node --check ' + JSON.stringify(path.join(ROOT, 'core/32-hubhome.js')), { stdio: 'pipe' });
  ok('syntax core/32-hubhome.js', true);
} catch (e) { ok('syntax core/32-hubhome.js', false, 'node --check failed'); }

/* 2. kill switches + editor guard */
ok('kill switch ?pf_off=hubhome', hcode.indexOf("PF.skip('hubhome')") !== -1);
ok('kill switch localStorage list', hub.indexOf('pf_disabled_v1') !== -1);
ok('patterns kill fails open (no PF.patterns -> return)', /if\s*\(!P\)\s*return/.test(hcode));
ok('editor guard (/config/)', hcode.indexOf('/config/') !== -1);
ok('editor guard (sqs-edit-mode)', hcode.indexOf('sqs-edit-mode') !== -1);

/* 3. homepage gate + mode detection */
ok('homepage gate #pf-v2', hcode.indexOf("getElementById('pf-v2')") !== -1);
ok('device-local callsign detection (PFCallsign)', hcode.indexOf('window.PFCallsign') !== -1);
ok('anonymous renders #pf-anonhero (no hub DOM)', hcode.indexOf('pf-anonhero') !== -1);
ok('recognized renders #pf-hubhero', hcode.indexOf("getElementById('pf-hubhero')") !== -1);

/* 4. zero new XP, no writes, no donate */
ok('no XP grants (xpGrant)', hcode.indexOf('xpGrant') === -1);
ok('no backend writes (authPost)', hcode.indexOf('authPost') === -1);
ok('no fetch/XHR', hcode.indexOf('fetch(') === -1 && hcode.indexOf('XMLHttpRequest') === -1);
ok('no "donate" anywhere', !/donate/i.test(hcode));

/* 5. pattern-library construction (no bespoke chrome) */
ok('built from PF.patterns (P1 hero)', hcode.indexOf('P.hero(') !== -1);
ok('P2 intel cards', hcode.indexOf('P.intelCard(') !== -1);
ok('P3 CTA family (join via P1 hero + deploy/report verbs)',
  hcode.indexOf('joinHref') !== -1 && hcode.indexOf("verb: 'deploy'") !== -1 &&
  (hcode.indexOf("verb: 'report'") !== -1 || hcode.indexOf("v: 'report'") !== -1));
ok('P5 progression ring', hcode.indexOf('P.ring(') !== -1);
ok('P6 action bar', hcode.indexOf('P.actionBar(') !== -1);
ok('P8 proof (real figures or suppressed)', hcode.indexOf('P.proof(') !== -1);
ok('no inline red (#c1121f) — styling lives in patterns CSS', hcode.indexOf('#c1121f') === -1);
ok('CTA-verb lint: no rogue CTAs',
  !/enlist\s*(\u2192|->)/i.test(hcode) && !/call\s*it\s*(\u2192|->)/i.test(hcode) &&
  !/confirm/i.test(hcode) && !/follow their money\s*(\u2192|->)/i.test(hcode) &&
  !/equity/i.test(hcode));

/* 6. pillar bar demoted: NOT rendered here (lives in the HUD strip) */
ok('no pillar bar markup in hub (demoted to HUD strip)',
  hcode.indexOf('ph-pillars') === -1 && hcode.indexOf('pillarBarHtml') === -1 &&
  hcode.indexOf('data-ph-go') === -1);
ok('pathNames kicker flavor kept (fail-open)', hcode.indexOf('pathNames') !== -1);

/* 7. hub content contract */
['YOUR CAMPAIGN', 'YOUR ORDERS', 'pf-orders', '/war-report', 'FRONT LINES',
 'pf-callsign-claimed', 'data-hub-ring', 'data-hub-next'].forEach(function (s) {
  ok('hub contains: ' + s, hub.indexOf(s) !== -1);
});
ok('JOIN THE FIGHT. wired to claim modal (data-pf-claim-cs)',
  hcode.indexOf('data-pf-claim-cs') !== -1);

/* 8. FRONT LINES reachability: every major feature the pillar dock doesn't
   reach is one tap from the hub. */
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
ok('TRACK kickers (DATA pillar relabeled)', (hcode.match(/k: 'TRACK'/g) || []).length === 2);

/* ---------- runtime sandbox ---------- */
function parseAttrs(str) {
  var attrs = {}, m, re = /([\w-]+)(?:="([^"]*)")?/g;
  while ((m = re.exec(str))) { if (m[1]) attrs[m[1]] = m[2] !== undefined ? m[2] : ''; }
  return attrs;
}
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
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i !== -1) this.children.splice(i, 1);
        c.parentNode = null; return c;
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
    Object.defineProperty(el, 'id', {
      get: function () { return this.attrs.id || ''; },
      set: function (v) { this.attrs.id = String(v); }
    });
    return el;
  }
  function parseInto(src, parent, rg) {
    var st = [];
    var rr = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*(\/?)>/g, mm;
    var last = 0;
    function pushText(upto) {
      var t = src.slice(last, upto);
      if (t) {
        var tn = { tagName: '#TEXT', text: t, attrs: {}, children: [], parentNode: null };
        var th = st.length ? st[st.length - 1] : parent;
        th.children.push(tn); tn.parentNode = th;
      }
      last = upto;
    }
    while ((mm = rr.exec(src))) {
      pushText(mm.index);
      var closing = mm[1] === '/', tag = mm[2].toLowerCase(), attrs = parseAttrs(mm[3] || '');
      if (closing) { st.pop(); last = rr.lastIndex; continue; }
      var el = mkEl(tag, attrs); rg(el);
      var host = st.length ? st[st.length - 1] : parent;
      host.children.push(el); el.parentNode = host;
      last = rr.lastIndex;
      if (!mm[4] && !SELF[tag]) st.push(el);
    }
    pushText(src.length);
  }
  var plast = 0;
  function pushTopText(src, upto, roots) {
    var t = src.slice(plast, upto);
    if (t) roots.push({ tagName: '#TEXT', text: t, attrs: {}, children: [], parentNode: null });
    plast = upto;
  }
  while ((m = re.exec(html))) {
    pushTopText(html, m.index, roots);
    var closing = m[1] === '/', tag = m[2].toLowerCase(), attrs = parseAttrs(m[3] || '');
    if (closing) { stack.pop(); plast = re.lastIndex; continue; }
    var el = mkEl(tag, attrs); reg(el);
    var host = stack.length ? stack[stack.length - 1] : null;
    if (host) { host.children.push(el); el.parentNode = host; }
    else roots.push(el);
    plast = re.lastIndex;
    if (!m[4] && !SELF[tag]) stack.push(el);
  }
  pushTopText(html, html.length, roots);
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
/* Serialize a stub subtree for byte-identical comparisons (text included). */
function serialize(el) {
  if (!el) return '';
  if (el.tagName === '#TEXT') return el.text || '';
  var s = '<' + el.tagName.toLowerCase();
  Object.keys(el.attrs || {}).sort().forEach(function (k) { s += ' ' + k + '="' + el.attrs[k] + '"'; });
  s += '>';
  (el.children || []).forEach(function (c) { s += serialize(c); });
  return s + '</' + el.tagName.toLowerCase() + '>';
}

function makeSandbox(opts) {
  opts = opts || {};
  var registry = [];
  function reg(el) { if (registry.indexOf(el) === -1) registry.push(el); return el; }
  var idMap = {};
  var mutations = [];
  var home = null;
  if (opts.home !== false) {
    home = {
      tagName: 'DIV', attrs: { id: 'pf-v2' }, children: [], parentNode: null,
      _listeners: {}, _html: '',
      getAttribute: function (k) { return this.attrs[k] || null; },
      addEventListener: function () {},
      appendChild: function (c) {
        mutations.push('appendChild');
        this.children.push(c); c.parentNode = this; reg(c); return c;
      },
      insertBefore: function (c, r) {
        mutations.push('insertBefore');
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
    /* Seed pre-existing public-landing content for byte-identical checks. */
    if (opts.seed) {
      var seedWrap = parseHtml(opts.seed, reg)[0];
      home.children.push(seedWrap); seedWrap.parentNode = home;
    }
  }
  var store = {};
  Object.keys(opts.ls || {}).forEach(function (k) { store[k] = opts.ls[k]; });
  var apiLog = [];
  var sandbox = {
    console: console,
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      dispatchEvent: function () { return true; },
      getElementById: function (id) {
        var f = registry.filter(function (e) { return e.attrs && e.attrs.id === id; });
        if (f.length) return f[0];
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
    pillars: opts.pillars === false ? null : {
      pathNames: function () {
        return (opts.paths || []).map(function (p) {
          return { propagandist: 'PROPAGANDIST', data: 'DATA SCOUT', activist: 'ACTIVIST', organizer: 'ORGANIZER' }[p] || p;
        });
      }
    },
    error: function () {}
  };
  sandbox.window.PFCallsign = function () { return opts.callsign || ''; };
  sandbox.window.PF_BACKEND_URL = 'https://example.invalid/';
  sandbox.window.location = { href: 'https://mtcstw.com/', pathname: '/', search: opts.search || '' };
  vm.createContext(sandbox);
  /* The real pattern library loads first — the hub is built from it. */
  vm.runInContext(patternsSrc, sandbox, { filename: '33-patterns.js' });
  sandbox._apiLog = apiLog;
  sandbox._home = home;
  sandbox._mutations = mutations;
  return sandbox;
}
function runHub(sb) {
  vm.runInContext(hub, sb, { filename: '32-hubhome.js' });
}
function byId(sb, id) {
  try { return sb.document.getElementById(id); } catch (e) { return null; }
}

/* A. anonymous: P1 hero + FRONT LINES, zero API calls, landing untouched */
(function () {
  var seed = '<section data-game="daily-orders"><div class="orders-body">ORDERS</div></section>';
  var sb = makeSandbox({ callsign: '', seed: seed });
  var before = serialize(sb._home.children[0]);
  try {
    runHub(sb);
    var anon = byId(sb, 'pf-anonhero');
    ok('runtime: anonymous -> #pf-anonhero rendered', !!anon);
    ok('runtime: anonymous -> no #pf-hubhero (no hub DOM)', !byId(sb, 'pf-hubhero'));
    ok('runtime: anonymous -> zero API calls for mode decision', sb._apiLog.length === 0);
    var hero = anon ? anon.querySelector('.pf-pat-hero') : null;
    ok('runtime: anonymous -> P1 Briefing Hero present', !!hero);
    var join = anon ? anon.querySelector('.pf-pat-join') : null;
    ok('runtime: anonymous -> single red JOIN THE FIGHT. button',
      !!join && serialize(join).indexOf('JOIN THE FIGHT.') !== -1);
    ok('runtime: anonymous -> join wired to claim modal',
      !!join && join.getAttribute('data-pf-claim-cs') === '1');
    var cards = anon ? anon.querySelectorAll('.pf-pat-intel') : [];
    ok('runtime: anonymous -> 12 FRONT LINES intel cards', cards.length === 12);
    var bars = anon ? anon.querySelectorAll('.pf-pat-actions') : [];
    ok('runtime: anonymous -> Action Bar on every card', bars.length === cards.length && cards.length === 12);
    var barLinks = bars.length ? bars[0].querySelectorAll('a') : [];
    ok('runtime: anonymous -> action bar order (share/cell/report)',
      barLinks.length === 3 &&
      serialize(barLinks[0]).indexOf('SHARE THIS INTEL') !== -1 &&
      serialize(barLinks[1]).indexOf('TAKE THIS TO YOUR CELL') !== -1 &&
      serialize(barLinks[2]).indexOf('REPORT BACK') !== -1);
    /* byte-identical public landing: the seeded section is untouched; the
       module only inserted its own node. */
    var seeded = sb._home.children.filter(function (c) { return c.attrs.id !== 'pf-anonhero'; });
    ok('runtime: anonymous -> public landing byte-identical',
      seeded.length === 1 && serialize(seeded[0]) === before);
    ok('runtime: anonymous -> hero is first child of #pf-v2',
      sb._home.firstChild === anon);
  } catch (e) { ok('runtime: anonymous executes', false, String(e && e.message || e)); }
})();

/* B. recognized: YOUR CAMPAIGN leads */
(function () {
  var sb = makeSandbox({
    callsign: 'TESTER',
    ls: { pf_ranks_v1: '{"xp":160}' },
    paths: ['propagandist', 'data'],
    api: {
      xp_today: { ok: true, xp_today: 250 },
      streak_status: { ok: true, count: 7, at_risk: true },
      cell_mine: { ok: true, in_cell: true, cells: [{ name: 'ALPHA', checked_today: true }], members: [{}, {}, {}] },
      dopamine_status: { ok: true, loot: { claimed_today: true }, streak: { at_risk: true } }
    }
  });
  try {
    runHub(sb);
    var hero = byId(sb, 'pf-hubhero');
    ok('runtime: recognized -> #pf-hubhero inserted', !!hero);
    ok('runtime: recognized -> no #pf-anonhero', !byId(sb, 'pf-anonhero'));
    ok('runtime: hero is first child of #pf-v2', !!hero && sb._home.firstChild === hero);
    var html = serialize(hero);
    ok('runtime: P1 hero with YOUR CAMPAIGN kicker', /your campaign/i.test(html));
    ok('runtime: kicker flavored with paths', /PROPAGANDIST \+ DATA SCOUT/i.test(html));
    ok('runtime: P5 progression ring renders', !!hero.querySelector('.pf-pat-ring'));
    ok('runtime: ring shows streak flame', !!hero.querySelector('.pf-pat-ring-streak'));
    ok('runtime: rank shown (COMMISSAR @160xp)', /COMMISSAR/.test(html));
    ok('runtime: Next Move kicker is YOUR ORDERS', /Your orders/i.test(html));
    ok('runtime: next move = STREAK AT RISK (report verb)',
      /STREAK AT RISK/.test(html) && /REPORT BACK/.test(html));
    ok('runtime: orders + war report intel cards',
      html.indexOf('/#pf-orders') !== -1 && html.indexOf('/war-report') !== -1);
    ok('runtime: no pillar bar in hub (demoted to HUD strip)',
      !hero.querySelector('[data-ph-go]') && html.indexOf('ph-pillar') === -1);
    var cards = hero.querySelectorAll('.pf-pat-intel');
    var bars = hero.querySelectorAll('.pf-pat-actions');
    ok('runtime: Action Bar on every card (' + cards.length + ' cards)',
      cards.length > 0 && bars.length === cards.length);
    var grid = hero.querySelector('#pf-fl-grid');
    ok('runtime: FRONT LINES grid = 12 cards', !!grid && grid.querySelectorAll('.pf-pat-intel').length === 12);
    ok('runtime: 15 intel cards total (12 grid + orders + war report + next move)', cards.length === 15);
    ok('runtime: P8 proof from real read (3 cell members)',
      /<b>3<\/b> soldiers in your cell/.test(html));
    ok('runtime: cell status line', /ALPHA/.test(html));
  } catch (e) { ok('runtime: recognized executes', false, String(e && e.message || e)); }
})();

/* C. recognized, backend down -> shell renders, fail-open */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', api: {} });
  try {
    runHub(sb);
    var hero = byId(sb, 'pf-hubhero');
    ok('runtime: hub renders with backend down', !!hero);
    var html = hero ? serialize(hero) : '';
    ok('runtime: next move falls back (no cell -> NO SQUAD YET)',
      html.indexOf('NO SQUAD YET') !== -1);
    ok('runtime: P8 proof suppressed without a real count',
      html.indexOf('pf-pat-proof') === -1);
  } catch (e) { ok('runtime: backend-down executes', false, String(e && e.message || e)); }
})();

/* D. kill switches */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', skip: ['hubhome'] });
  try {
    runHub(sb);
    ok('runtime: ?pf_off=hubhome -> no hub, no anon hero',
      !byId(sb, 'pf-hubhero') && !byId(sb, 'pf-anonhero'));
  } catch (e) { ok('runtime: hubhome kill executes', false, String(e && e.message || e)); }
  var sb2 = makeSandbox({ callsign: '', skip: ['patterns'] });
  try {
    runHub(sb2);
    ok('runtime: ?pf_off=patterns -> hub fails open (landing untouched)',
      !byId(sb2, 'pf-hubhero') && !byId(sb2, 'pf-anonhero'));
  } catch (e) { ok('runtime: patterns kill executes', false, String(e && e.message || e)); }
})();

/* E. no homepage shell */
(function () {
  var sb = makeSandbox({ callsign: 'TESTER', home: false });
  try {
    runHub(sb);
    ok('runtime: no #pf-v2 -> nothing renders', !byId(sb, 'pf-hubhero'));
  } catch (e) { ok('runtime: no-shell executes', false, String(e && e.message || e)); }
})();

/* F. claim-event flip: anonymous -> recognized without reload */
(function () {
  var sb = makeSandbox({ callsign: '' });
  try {
    runHub(sb);
    ok('runtime: flip starts anonymous', !!byId(sb, 'pf-anonhero'));
    /* simulate the claim: the module re-boots on pf-callsign-claimed;
       emulate by re-running with a callsign (same boot path). */
    var sb2 = makeSandbox({ callsign: 'NEWCALL' });
    runHub(sb2);
    ok('runtime: recognized after claim', !!byId(sb2, 'pf-hubhero') && !byId(sb2, 'pf-anonhero'));
  } catch (e) { ok('runtime: flip executes', false, String(e && e.message || e)); }
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
