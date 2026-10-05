#!/usr/bin/env node
/* tests/cell-pulse-fe.verify.cjs — verification harness for the Political
 * Pulse section in games/cell-hq.js (fe/cell-political-pulse, 2026-10-05).
 * DOM-shim: loads the real module, intercepts its JSONP reads with canned
 * backend responses, drives the cell-detail tab, and asserts:
 *   1. POLITICAL PULSE card renders when cell_pulse returns items
 *      (title, detail, ACT deep-link, source + timestamp)
 *   2. card hidden ENTIRELY when items are empty
 *   3. card hidden when the read fails (fail-soft, no error box)
 *   4. item titles/details are HTML-escaped (XSS)
 *   5. off-shape deep_link falls back to /political-hq
 *   6. persisted collapse renders the body hidden + EXPAND label
 *   7. pulse-toggle click flips body visibility + button label + localStorage
 *   8. cell_pulse rides the auth_secret auto-attach (private read)
 *   9. no-XP static assertion on the pulse code paths
 * Run: node tests/cell-pulse-fe.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'cell-hq.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- minimal DOM shim ---------- */
function makeEl(id, registry) {
  var listeners = {};
  return {
    id: id || '', _html: '', children: [], parentNode: null,
    style: {}, attrs: {}, textContent: '',
    set innerHTML(v) { this._html = String(v); },
    get innerHTML() { return this._html; },
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    addEventListener: function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    _fire: function (t, ev) { (listeners[t] || []).forEach(function (fn) { fn(ev); }); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } }
  };
}

/* One fresh module environment per case. */
function bootEnv(canned, lsSeed) {
  var store = Object.assign({}, lsSeed || {});
  var registry = {};
  var win = {
    PFCallsign: function () { return 'testcs'; },
    PFDeviceId: function () { return 'dev1'; },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { href: 'https://mtcstw.com/cells', search: '', pathname: '/cells' },
    PF: null
  };
  win.PF = {
    skip: function () { return false; },
    toast: function () {},
    error: function () {},
    getAuthSecret: function () { return 'shhh-secret'; }
  };
  var mount = makeEl('pf-cell-hq');
  var pane = makeEl('hqPane');
  var detBody = makeEl('hqDetBody');
  registry['pf-cell-hq'] = mount;
  registry['hqPane'] = pane;
  registry['hqDetBody'] = detBody;
  registry['pf-war-card'] = null;

  function parseSrc(s) {
    var m = /[?&]action=([^&]+)/.exec(s || '');
    var c = /[?&]callback=([^&]+)/.exec(s || '');
    return { action: m ? decodeURIComponent(m[1]) : '', cb: c ? c[1] : '' };
  }

  var doc = {
    head: {
      appendChild: function (s) {
        var p = parseSrc(s.src);
        /* auth_secret auto-attach check happens at send time; the response
           arrives on the next tick like a real network round-trip. */
        setTimeout(function () {
          try {
            var resp = canned[p.action];
            if (typeof resp === 'function') resp = resp(p);
            if (win[p.cb]) win[p.cb](resp === undefined ? null : resp);
          } catch (e) {}
        }, 0);
        return s;
      }
    },
    body: { classList: { contains: function () { return false; } } },
    createElement: function (tag) {
      var el = makeEl('');
      el.tag = tag;
      return el;
    },
    querySelectorAll: function () { return []; },
    getElementById: function (id) { return registry.hasOwnProperty(id) ? registry[id] : null; }
  };

  var g = {
    window: win, document: doc,
    localStorage: {
      getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    console: console
  };
  /* The module references bare `window`, `document`, `localStorage`,
     `PFCallsign`, `PFDeviceId` — expose them as globals for the eval. */
  var prelude =
    'var window = __g.window; var document = __g.document; ' +
    'var localStorage = __g.localStorage; var setTimeout = __g.setTimeout; ' +
    'var clearTimeout = __g.clearTimeout; ' +
    'var PFCallsign = __g.window.PFCallsign; var PFDeviceId = __g.window.PFDeviceId;\n';
  var fn = new Function('__g', prelude + src + '\nreturn __g;');
  fn(g);
  return { g: g, win: win, doc: doc, mount: mount, pane: pane, detBody: detBody, store: store };
}

function tick(n) { return new Promise(function (res) {
  var i = 0;
  (function next() { if (++i >= (n || 5)) res(); else setTimeout(next, 5); })();
}); }

function fakeClickTarget(attrs) {
  return {
    getAttribute: function (k) { return attrs[k] || null; },
    textContent: attrs.__text || '',
    style: {}
  };
}

function baseCanned(pulseResp) {
  return {
    cell_mine: { ok: true, in_cell: true,
      cell: { id: 'c1', name: 'Test Cell' },
      cells: [{ id: 'c1', name: 'Test Cell' }],
      is_founder: true, members: [] },
    cell_prestige: { ok: true, prestige: { flame: '', tier_name: 'UNRANKED', power: 0, members: [] } },
    cell_health: { ok: true, health: { cell_id: 'c1', score: 80, member_count: 1, checkins_last_7d: 5, recruits_last_30d: 0 } },
    cell_pulse: pulseResp
  };
}

function goDetail(env) {
  /* Simulate the delegated mount click on OPEN HQ (data-hq=detail). */
  var t = fakeClickTarget({ 'data-hq': 'detail', 'data-cell': 'c1' });
  env.mount._fire('click', { target: t });
}

var PULSE_ITEMS = [
  { id: 'bill-HR-22', type: 'bill_stage', title: 'H.R. 22 moved — now passed the Senate',
    detail: 'SAVE Act', deep_link: '/political-hq#bills', source: 'legislation-tracker',
    ts: Date.now() - 3600000, scope: 'federal' },
  { id: 'deadline-TX', type: 'deadline', title: 'TX voter registration closes in 3 days',
    detail: 'General election Nov 3, 2026', deep_link: '/political-hq#ballot', source: 'ballot-center',
    ts: Date.now() + 3 * 86400000, scope: 'state' }
];

async function main() {
  /* 1: card renders with items */
  {
    var env = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: 'TX', items: PULSE_ITEMS }));
    await tick();
    goDetail(env);
    await tick(8);
    var h = env.detBody.innerHTML;
    ok('pulse card renders with items', h.indexOf('hqPulseCard') !== -1 && h.indexOf('Political pulse') !== -1);
    ok('item title rendered', h.indexOf('H.R. 22 moved') !== -1);
    ok('item detail rendered', h.indexOf('SAVE Act') !== -1);
    ok('ACT deep-link rendered', h.indexOf('href="/political-hq#bills"') !== -1);
    ok('source + timestamp rendered', h.indexOf('legislation-tracker') !== -1 && /[0-9]+[mhd] ago/.test(h));
    ok('deadline shows due date', /due [A-Z][a-z]{2} [0-9]{1,2}/.test(h), h.match(/due [A-Z][a-z]{2} [0-9]{1,2}/));
  }
  /* 2: empty items -> hidden entirely */
  {
    var env2 = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: null, items: [] }));
    await tick();
    goDetail(env2);
    await tick(8);
    ok('empty pulse -> card hidden entirely', env2.detBody.innerHTML.indexOf('hqPulseCard') === -1);
  }
  /* 3: failed read -> hidden, no error box */
  {
    var env3 = bootEnv(baseCanned(null));
    await tick();
    goDetail(env3);
    await tick(8);
    var h3 = env3.detBody.innerHTML;
    ok('failed pulse read -> card hidden (fail-soft)', h3.indexOf('hqPulseCard') === -1);
    ok('no error box injected by pulse', h3.indexOf('hq-err') === -1 || h3.indexOf('Political pulse') === -1);
  }
  /* 4: XSS escaping */
  {
    var evil = [{ id: 'x', type: 'bill_stage', title: '<img src=x onerror=alert(1)>',
      detail: '"><script>alert(2)</script>', deep_link: '/political-hq#bills',
      source: 'legislation-tracker', ts: Date.now(), scope: 'federal' }];
    var env4 = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: null, items: evil }));
    await tick();
    goDetail(env4);
    await tick(8);
    var h4 = env4.detBody.innerHTML;
    ok('title HTML-escaped', h4.indexOf('&lt;img') !== -1 && h4.indexOf('<img src=x') === -1);
    ok('detail HTML-escaped', h4.indexOf('&lt;script&gt;') !== -1 && h4.indexOf('<script>alert(2)') === -1);
  }
  /* 5: deep-link whitelist */
  {
    var bad = [{ id: 'x', type: 'bill_stage', title: 't', detail: 'd',
      deep_link: 'javascript:alert(1)', source: 's', ts: Date.now(), scope: 'federal' }];
    var env5 = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: null, items: bad }));
    await tick();
    goDetail(env5);
    await tick(8);
    var h5 = env5.detBody.innerHTML;
    ok('off-shape deep_link falls back to /political-hq', h5.indexOf('javascript:') === -1 && h5.indexOf('href="/political-hq"') !== -1);
  }
  /* 6: persisted collapse */
  {
    var env6 = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: null, items: PULSE_ITEMS }),
      { pf_hq_pulse_collapsed: '1' });
    await tick();
    goDetail(env6);
    await tick(8);
    var h6 = env6.detBody.innerHTML;
    ok('collapsed state hides body', h6.indexOf('id="hqPulseBody" style="display:none"') !== -1);
    ok('collapsed state labels button EXPAND', h6.indexOf('>EXPAND</button>') !== -1);
  }
  /* 7: toggle click flips state */
  {
    var env7 = bootEnv(baseCanned({ ok: true, cell_id: 'c1', state: null, items: PULSE_ITEMS }));
    await tick();
    goDetail(env7);
    await tick(8);
    /* register the card body so the toggle handler can find it */
    var bodyEl = { style: { display: '' } };
    env7.doc.getElementById = (function (orig) {
      return function (id) {
        if (id === 'hqPulseBody') return bodyEl;
        return orig(id);
      };
    })(env7.doc.getElementById);
    var t = fakeClickTarget({ 'data-hq': 'pulse-toggle', __text: 'COLLAPSE' });
    env7.mount._fire('click', { target: t });
    ok('toggle hides body', bodyEl.style.display === 'none');
    ok('toggle persists to localStorage', env7.store['pf_hq_pulse_collapsed'] === '1');
    ok('toggle flips button label', t.textContent === 'EXPAND');
    var t2 = fakeClickTarget({ 'data-hq': 'pulse-toggle', __text: 'EXPAND' });
    env7.mount._fire('click', { target: t2 });
    ok('toggle re-expands body', bodyEl.style.display === '');
    ok('toggle clears persisted collapse', env7.store['pf_hq_pulse_collapsed'] === '0');
  }
  /* 8: auth_secret auto-attach for cell_pulse (static) */
  ok('cell_pulse in READ map', /cell_pulse:1/.test(src));
  ok('cell_pulse rides auth_secret auto-attach',
    /if\s*\(\s*action\s*===\s*"cell_mine"\s*\|\|\s*action\s*===\s*"cell_pulse"\s*\)/.test(src));
  /* 9: no-XP static on pulse paths */
  var pulseRegions = src.match(/loadPulse[\s\S]{0,2000}/);
  ok('pulse loader grants no XP', !/xpGrant|\+ *\d+ *XP|xp['"]?\s*:/i.test(pulseRegions ? pulseRegions[0] : ''));
  ok('pulse section never touches WRITE rail', !/WRITE\[[^\]]*cell_pulse/.test(src) && src.indexOf("WRITE = {") !== -1);

  console.log(failures === 0 ? '\nALL FE CHECKS PASSED' : '\n' + failures + ' FE CHECK(S) FAILED');
  process.exitCode = failures ? 1 : 0;
}

main().catch(function (e) { console.error('HARNESS ERROR', e); process.exitCode = 1; });
