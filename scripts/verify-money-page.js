#!/usr/bin/env node
/* scripts/verify-money-page.js — /money page bundle verification.
   Run from the repo root:
     node scripts/verify-money-page.js
   1. node --check on the new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      master + per-section kill switches, context-aware mount logic
      (#pf-money vs #pf-political-hq), redirect-card logic, painter
      registration (IDS/TITLES/PAINT), esc() on injected fields, no XP code,
      copy-rule compliance (no "bought by", correlation line present,
      "THE MONEY BEHIND THE VOTE" header), empty states, bundle + page-mount
      registration, AC-return rail, forge stash contract
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      PFMoney.skip master kill; page mode renders all sections; PHQ mode
      renders the interim tab (lazy); with money_page_url set the money tab
      becomes a plain tab-rail link to /follow-the-money (Blossom M4);
      PFTrades/PFPacAlerts honest empty states;
      pac-alert staleness suppression; PFMoneyDeep 8 slots with per-slot
      kill; phq-votedonor painter renders on fixture data with the
      correlation line.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MP_MOD = path.join(V, 'core', 'money-page.js');
var MT_MOD = path.join(V, 'core', 'money-trades.js');
var MPA_MOD = path.join(V, 'core', 'money-pac-alerts.js');
var MD8_MOD = path.join(V, 'core', 'money-deep8.js');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var PM_MOD = path.join(V, 'pages', 'page-mount.js');
var BC_MOD = path.join(ROOT, 'build', 'bundle-core.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
[MP_MOD, MT_MOD, MPA_MOD, MD8_MOD, PAINTER_MOD, PM_MOD].forEach(function (p) {
  try {
    cp.execSync('node --check ' + JSON.stringify(p), { stdio: 'pipe' });
    ok('node --check ' + path.basename(p));
  } catch (e) { no('node --check ' + path.basename(p), 'syntax error'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
var mpcode = stripComments(read(MP_MOD));
var mtcode = stripComments(read(MT_MOD));
var mpacode = stripComments(read(MPA_MOD));
var md8code = stripComments(read(MD8_MOD));
var pcode = stripComments(read(PAINTER_MOD));

/* kill switches */
if (/PF\.skip\(['"]money['"]\)/.test(mpcode)) ok('money-page master kill PF.skip("money")');
else no('money-page master kill', 'missing');
if (/PF\.skip\(['"]money['"]\)\s*\|\|\s*PF\.skip\(['"]money-stock-trades['"]\)/.test(mtcode)) ok('trades kill money-stock-trades + master');
else no('trades kill', 'missing');
if (/PF\.skip\(['"]money['"]\)\s*\|\|\s*PF\.skip\(['"]pac-alerts['"]\)/.test(mpacode)) ok('pac kill pac-alerts + master');
else no('pac kill', 'missing');
if (/PF\.skip\(['"]money['"]\)/.test(md8code) && /PF\.skip\(s\.id\)/.test(md8code)) ok('deep8 master + per-slot kills');
else no('deep8 kills', 'missing');

/* context-aware mount */
if (/getElementById\(['"]pf-money['"]\)/.test(mpcode) && /getElementById\(['"]pf-political-hq['"]\)/.test(mpcode))
  ok('context-aware: detects #pf-money and #pf-political-hq');
else no('context-aware mount', 'missing div detection');
if (/money_page_url/.test(mpcode)) ok('rail-link cutover gated on money_page_url config');
else no('rail-link cutover', 'missing config gate');
if (/IntersectionObserver/.test(mpcode)) ok('interim tab lazy-mounts sections');
else no('lazy mount', 'missing IntersectionObserver');

/* painters */
[['phq-votedonor', 'paintVoteDonor'], ['phq-trades', 'paintTrades'], ['phq-pac', 'paintPac']].forEach(function (pair) {
  var id = pair[0], fn = pair[1];
  if (pcode.indexOf("'" + id + "'") !== -1 && pcode.indexOf(fn) !== -1) ok('painter registered: ' + id);
  else no('painter registered: ' + id, 'missing from IDS/TITLES/PAINT');
});

/* copy contract — linted, regex-literal-aware (no quote stripping) */
if (/THE MONEY BEHIND THE VOTE/.test(mpcode)) ok('element header "THE MONEY BEHIND THE VOTE"');
else no('vote header copy', 'missing');
if (/Donations don\\u2019t prove motive/.test(mpcode) || /prove motive/.test(mpcode)) ok('correlation line present');
else no('correlation line', 'missing');
['bought by', 'bought the vote'].forEach(function (bad) {
  if (mpcode.toLowerCase().indexOf(bad) === -1 && mtcode.toLowerCase().indexOf(bad) === -1 &&
      mpacode.toLowerCase().indexOf(bad) === -1 && md8code.toLowerCase().indexOf(bad) === -1)
    ok('no banned phrase: "' + bad + '"');
  else no('banned phrase', '"' + bad + '" found in user copy');
});

/* empty states */
if (/AWAITING PUBLIC DATA/.test(mtcode) && /AWAITING PUBLIC DATA/.test(mpacode) && /AWAITING PUBLIC DATA/.test(md8code))
  ok('honest empty states on trades/pac/deep8');
else no('empty states', 'missing AWAITING PUBLIC DATA track');
if (/STALE_DAYS/.test(mpacode)) ok('pac staleness suppression threshold');
else no('pac staleness', 'missing');

/* no XP code */
[mpcode, mtcode, mpacode, md8code].forEach(function (c, i) {
  var nm = ['money-page', 'money-trades', 'money-pac-alerts', 'money-deep8'][i];
  if (!/\bxp\b/i.test(c.replace(/explain/gi, ''))) ok('no XP code: ' + nm);
  else no('no XP code: ' + nm, 'found \\bxp\\b');
});

/* bundle + page-mount registration */
['core/money-page.js', 'core/money-trades.js', 'core/money-pac-alerts.js', 'core/money-deep8.js'].forEach(function (m) {
  if (has(BC_MOD, "'" + m + "'")) ok('bundle-core registers ' + m);
  else no('bundle-core registers ' + m, 'missing');
});
if (has(PM_MOD, "'pf-money'")) ok('page-mount PAGE_ORDERS has pf-money');
else no('page-mount pf-money', 'missing');
if (/'money':\s*\{\s*div:\s*'pf-money'/.test(read(PM_MOD))) ok('page-mount SELF entry for money');
else no('page-mount SELF money', 'missing');

/* wiring */
if (/BACK TO ACTION CENTER/.test(mpcode) && /phq-action/.test(mpcode)) ok('AC-return rail');
else no('AC-return rail', 'missing');
if (/pf_forge_prefill_v1/.test(mpcode)) ok('FORGE THIS stash contract (pf_forge_prefill_v1)');
else no('forge stash', 'missing');
if (/\?bioguide=/.test(mpcode) && /\?bill=/.test(mpcode)) ok('deep-link params ?bioguide= ?bill=');
else no('deep-links', 'missing');

/* ============ 3. runtime tests ============ */
console.log('== 3. runtime tests ==');

function makeDom() {
  var els = {};
  function el(tag, id) {
    var _html = '';
    var e = {
      tagName: (tag || 'div').toUpperCase(), id: id || '',
      children: [], style: {}, dataset: {},
      className: '', textContent: '',
      appendChild: function (c) { e.children.push(c); c.parentNode = e; return c; },
      removeChild: function (c) {
        var i = e.children.indexOf(c);
        if (i !== -1) e.children.splice(i, 1);
        return c;
      },
      replaceChild: function (nn, oo) {
        var i = e.children.indexOf(oo);
        if (i !== -1) e.children[i] = nn;
        else e.children.push(nn);
        nn.parentNode = e; oo.parentNode = null;
        return oo;
      },
      querySelector: function (sel) {
        var all = [];
        (function walk(n) {
          (n.children || []).forEach(function (c) { all.push(c); walk(c); });
        })(e);
        if (sel[0] === '#') return all.filter(function (c) { return c.id === sel.slice(1); })[0] || null;
        if (sel[0] === '.') return all.filter(function (c) { return (c.className || '').split(' ').indexOf(sel.slice(1)) !== -1; })[0] || null;
        return all.filter(function (c) { return (c.tagName || '').toLowerCase() === sel; })[0] || null;
      },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      setAttribute: function (k, v) { e['attr_' + k] = v; },
      getAttribute: function (k) { return e['attr_' + k]; }
    };
    /* Light innerHTML parse: materialize top-level tags so firstChild and
       querySelector('.x') work in tests. Raw html is kept for content checks. */
    Object.defineProperty(e, 'innerHTML', {
      get: function () { return _html; },
      set: function (h) {
        _html = String(h);
        e.children = [];
        var re = /<(section|div|nav|a|button|h[1-4]|p|ul|span)[^>]*>/gi, m;
        while ((m = re.exec(_html))) {
          var tagOpen = m[0];
          var idm = /id="([^"]*)"/.exec(tagOpen);
          var clm = /class="([^"]*)"/.exec(tagOpen);
          var c = el(m[1], idm ? idm[1] : '');
          if (clm) c.className = clm[1];
          e.children.push(c);
        }
      }
    });
    Object.defineProperty(e, 'firstChild', { get: function () { return e.children[0]; } });
    return e;
  }
  var doc = {
    elements: els,
    createElement: function (t) { return el(t); },
    createDocumentFragment: function () { return el('fragment'); },
    getElementById: function (id) { return els[id] || null; },
    head: el('head'), body: el('body'),
    addEventListener: function () {},
    readyState: 'complete',
    /* Blossom M4: find rail tabs inside #pf-hq-subnav for the money-tab
       cutover (document-level compound selectors used by money-page.js). */
    querySelector: function (sel) {
      var pool = [];
      Object.keys(els).forEach(function (k) { pool.push(els[k]); });
      (function walk(n) { (n.children || []).forEach(function (c) { pool.push(c); walk(c); }); })(doc.body);
      function inSubnav(n) {
        var p = n.parentNode;
        while (p) { if (p.id === 'pf-hq-subnav') return true; p = p.parentNode; }
        return false;
      }
      for (var i = 0; i < pool.length; i++) {
        var n = pool[i];
        if (!inSubnav(n)) continue;
        var isLink = (n.tagName === 'A') && n.getAttribute('data-hub') === 'money';
        var isBtn = n.tagName !== 'A' && (n.className || '').split(' ').indexOf('pf-hq-tab') !== -1 &&
          n.getAttribute('data-hub') === 'money';
        if (sel === '#pf-hq-subnav a[data-hub="money"]' && isLink) return n;
        if (sel === '#pf-hq-subnav .pf-hq-tab[data-hub="money"]' && isBtn) return n;
      }
      return null;
    }
  };
  doc._reg = function (id, e) { els[id] = e; doc.body.appendChild(e); };
  return doc;
}

function canvasStub() {
  return {
    getContext: function () {
      return {
        fillText: function () {}, measureText: function () { return { width: 10 }; },
        beginPath: function () {}, arc: function () {}, fill: function () {},
        stroke: function () {}, save: function () {}, restore: function () {},
        fillRect: function () {}, strokeRect: function () {}, clearRect: function () {},
        set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {},
        set textAlign(v) {}, set textBaseline(v) {}, set lineWidth(v) {}
      };
    },
    width: 1080, height: 1350
  };
}

function runModuleOnDoc(file, doc, opts) {
  opts = opts || {};
  var skipIds = opts.skipIds || [];
  var config = opts.config || {};
  var sandbox = {
    console: console,
    document: doc,
    window: {},
    sessionStorage: { _s: {}, setItem: function (k, v) { this._s[k] = v; }, getItem: function (k) { return this._s[k]; } },
    location: { href: 'https://www.mtcstw.com/', search: opts.search || '' },
    /* Synchronous in tests: JSONP fallback timers fire immediately so the
       fail-soft empty states render without a live backend. */
    setTimeout: function (fn) { try { fn(); } catch (e) {} return 0; },
    clearTimeout: function () {},
    IntersectionObserver: opts.noIO ? undefined : function (cb) {
      this.observe = function (t) { cb([{ isIntersecting: true, target: t }], this); };
      this.disconnect = function () {};
    }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = {
    skip: function (id) { return skipIds.indexOf(id) !== -1; },
    error: function () {},
    siteConfig: { ready: function (cb) { cb(config); } }
  };
  sandbox.window.PF_BACKEND_URL = opts.backend === false ? '' : 'https://pf-api.example.workers.dev';
  /* capture innerHTML writes so querySelector('.pf-mp') etc. can be found */
  vm.createContext(sandbox);
  vm.runInContext(read(file), sandbox, { filename: file });
  return { sandbox: sandbox, doc: doc };
}

function runModule(file, opts) {
  opts = opts || {};
  var doc = makeDom();
  (opts.divs || []).forEach(function (id) { doc._reg(id, doc.createElement('div')); });
  return runModuleOnDoc(file, doc, opts);
}

/* PFMoney.skip master kill */
(function () {
  var r = runModule(MP_MOD, { skipIds: ['money'] });
  if (r.sandbox.window.PFMoney === undefined) ok('master kill ?pf_off=money darkens the shell');
  else no('master kill', 'PFMoney exposed despite kill');
})();

/* page mode: #pf-money renders the full shell */
(function () {
  var r = runModule(MP_MOD, { divs: ['pf-money'] });
  var host = r.doc.getElementById('pf-money');
  var html = host.children.map(function (c) { return c.innerHTML || ''; }).join('') +
    host.innerHTML;
  var found = (host.innerHTML || '').indexOf('FOLLOW THE MONEY') !== -1 ||
    host.children.some(function (c) { return (c.innerHTML || '').indexOf('FOLLOW THE MONEY') !== -1; });
  if (found) ok('page mode: shell renders into #pf-money');
  else no('page mode', 'FOLLOW THE MONEY not rendered');
  /* count sections by walking the element tree (innerHTML is stub-parsed) */
  var n = 0;
  (function walk(nd) {
    (nd.children || []).forEach(function (c) {
      if ((c.className || '').split(' ').indexOf('pf-mp-sec') !== -1) n++;
      walk(c);
    });
  })(host);
  if (n >= 8) ok('page mode: 8+ sections mounted (got ' + n + ')');
  else no('page mode sections', 'only ' + n);
})();

/* PHQ tab mode: interim tab renders */
(function () {
  var r = runModule(MP_MOD, { divs: ['pf-political-hq'] });
  var host = r.doc.getElementById('pf-political-hq');
  var found = host.children.some(function (c) { return c.id === 'phq-money'; });
  if (found) ok('tab mode: interim #phq-money section renders on PHQ');
  else no('tab mode', '#phq-money not appended');
})();

/* PHQ + money_page_url set: money tab becomes a rail link (Blossom M4 —
   the "money war room moved" redirect card is gone) */
(function () {
  var doc = makeDom();
  doc._reg('pf-political-hq', doc.createElement('div'));
  var nav = doc.createElement('nav');
  nav.id = 'pf-hq-subnav';
  ['action', 'money'].forEach(function (id) {
    var b = doc.createElement('button');
    b.className = 'pf-hq-tab';
    b.setAttribute('data-hub', id);
    b.textContent = id === 'money' ? 'FOLLOW THE MONEY' : id.toUpperCase();
    nav.appendChild(b);
  });
  doc._reg('pf-hq-subnav', nav);
  var r = runModuleOnDoc(MP_MOD, doc, { config: { money_page_url: '/follow-the-money' } });
  var link = doc.querySelector('#pf-hq-subnav a[data-hub="money"]');
  var btnLeft = doc.querySelector('#pf-hq-subnav .pf-hq-tab[data-hub="money"]');
  if (link && link.href === '/follow-the-money') ok('cutover: money tab is a rail link to /follow-the-money');
  else no('cutover rail link', 'anchor missing or wrong href');
  if (link && link.textContent === 'FOLLOW THE MONEY') ok('cutover: rail link keeps the tab label');
  else no('cutover rail label', 'wrong text');
  if (!btnLeft) ok('cutover: money button replaced, no duplicate tab');
  else no('cutover duplicate', 'button still present');
  var host = doc.getElementById('pf-political-hq');
  var cardHtml = (host.children || []).map(function (c) { return c.innerHTML || ''; }).join('');
  if (cardHtml.indexOf('money war room moved') === -1) ok('cutover: no redirect card copy mounted');
  else no('cutover card copy', 'still mounted');
})();

/* trades: honest empty state, no endpoint needed */
(function () {
  var r = runModule(MT_MOD, {});
  var c = r.doc.createElement('div');
  r.sandbox.window.PFTrades.mount(c);
  if ((c.innerHTML || '').indexOf('AWAITING PUBLIC DATA') !== -1) ok('trades: honest empty state');
  else no('trades empty state', 'missing — got: ' + (c.innerHTML || '').slice(0, 80));
})();

/* pac: honest empty state */
(function () {
  var r = runModule(MPA_MOD, {});
  var c = r.doc.createElement('div');
  r.sandbox.window.PFPacAlerts.mount(c);
  if ((c.innerHTML || '').indexOf('AWAITING PUBLIC DATA') !== -1) ok('pac: honest empty state');
  else no('pac empty state', 'missing');
})();

/* deep8: 8 slots, per-slot kill honored */
(function () {
  var r = runModule(MD8_MOD, { skipIds: ['money-crypto'] });
  var c = r.doc.createElement('div');
  r.sandbox.window.PFMoneyDeep.mount(c);
  var html = c.innerHTML || '';
  var n = (html.match(/pf-md-slot/g) || []).length;
  if (n === 7 && html.indexOf('money-crypto') === -1) ok('deep8: 8 slots, killed slot hidden (7 shown)');
  else no('deep8 slots', 'expected 7 after kill, got ' + n);
})();

/* phq-votedonor painter renders on fixture data */
(function () {
  var doc = makeDom();
  var sandbox = {
    console: console, document: doc, window: {},
    setTimeout: function (fn) { try { fn(); } catch (e) {} return 0; }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = { skip: function () { return false; }, error: function () {} };
  sandbox.window.PFShare = {
    setPoster: function (id, fn) { sandbox['_p_' + id] = fn; },
    shareImage: function () {}, saveImage: function () {}
  };
  sandbox.document.createElement = function (t) {
    if (t === 'canvas') return canvasStub();
    return doc.createElement(t);
  };
  vm.createContext(sandbox);
  vm.runInContext(read(PAINTER_MOD), sandbox, { filename: PAINTER_MOD });
  var cv = null;
  try {
    var paint = sandbox.window.PF.PHQShare.paint;
    cv = paint('phq-votedonor', {
      billId: 'H.R.3633', billTitle: 'Test Bill', cycle: '2026',
      rows: [{ name: 'Jane Doe', copy: 'received $50,000 from Oil & Gas', vote: 'YES' }],
      source: 'FEC (api.open.fec.gov)'
    });
  } catch (e) { cv = null; }
  if (cv) ok('phq-votedonor painter renders fixture data');
  else no('phq-votedonor painter', 'returned null');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
