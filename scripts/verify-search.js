#!/usr/bin/env node
/* scripts/verify-search.js — static + runtime checks for the unified
   pillar-aware command bar (PLAY 8, CEO directive 2026-10-06 ~14:37 CDT):
   HUD-bar-mounted search trigger, command palette, runtime index from read
   endpoints + SLR DB + page directory, pillar grouping, deep links,
   keyboard shortcut, kill switch, fail-open, zero-XP/no-writes.
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
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^\\:'"\\])\/\/[^\n]*/g, '$1'); }

/* 1. syntax */
['core/32-search.js', 'build/bundle-core.js'].forEach(function (f) {
  var fp = f.indexOf('build/') === 0
    ? path.join(__dirname, '..', f) : path.join(ROOT, f);
  try {
    cp.execSync('node --check ' + JSON.stringify(fp), { stdio: 'pipe' });
    ok('syntax ' + f, true);
  } catch (e) { ok('syntax ' + f, false, 'node --check failed'); }
});

var src = read('core/32-search.js');
var scode = code(src);

/* 2. kill switch */
ok('kill switch ?pf_off=search', src.indexOf('pf_off=search') !== -1);
ok('kill switch localStorage list', src.indexOf("pf_disabled_v1='[\"search\"]'") !== -1);
ok('kill switch via PF.skip', scode.indexOf("PF.skip('search')") !== -1);

/* 3. zero new XP, no writes, device-local only */
ok('no XP grants (xpGrant)', scode.indexOf('xpGrant') === -1);
ok('no backend posts (authPost)', scode.indexOf('authPost') === -1);
ok('no POST/PUT/DELETE methods', !/method['"]?\s*:\s*['"](POST|PUT|DELETE|PATCH)['"]/i.test(scode));
ok('no localStorage', scode.indexOf('localStorage') === -1);
ok('no document.cookie', scode.indexOf('document.cookie') === -1);
ok('no sendBeacon', scode.indexOf('sendBeacon') === -1);
ok('reads are anonymous (credentials omit)', scode.indexOf("credentials: 'omit'") !== -1);
ok('no "donate" anywhere', !/donate/i.test(src));
ok('JOIN THE FIGHT. reserved (not on cards)', src.indexOf('JOIN THE FIGHT.') === -1);
ok('card action is DEPLOY (P-3)', src.indexOf('DEPLOY &rarr;') !== -1);

/* 4. HUD-bar mount (extends 30-hud.js, never rebuilds it) */
ok('mounts trigger in #pf-hud-bar', scode.indexOf("getElementById('pf-hud-bar')") !== -1);
ok('trigger id pf-search-btn', src.indexOf('pf-search-btn') !== -1);
ok("trigger click doesn't toggle strip (stopPropagation)", scode.indexOf('stopPropagation') !== -1);
ok('silent no-op without HUD host (~90s hard stop)', src.indexOf('tries > 45') !== -1);
ok('30-hud.js untouched by search (no edit markers)', read('core/30-hud.js').indexOf('32-search') === -1);
ok('build lists 32-search.js after 31-pillars.js',
  (function () {
    var b = fs.readFileSync(path.join(__dirname, '..', 'build', 'bundle-core.js'), 'utf8');
    var a = b.indexOf("'core/31-pillars.js'"), c = b.indexOf("'core/32-search.js'");
    return a !== -1 && c !== -1 && c > a;
  })());

/* 5. sources across everything */
['price_board', 'databounty_list', 'bounty_list', 'event_list', 'news_top_get'].forEach(function (a) {
  ok('source action: ' + a, src.indexOf("action: '" + a + "'") !== -1);
});
ok('CPI national scope', src.indexOf("area_key: 'national'") !== -1);
ok('creators via PF.slrAll (client-side roster)', scode.indexOf('PF.slrAll') !== -1);
ok('creator deep link = catalog_path', src.indexOf('catalog_path') !== -1);
ok('late SLR snapshot refresh (slrReady)', src.indexOf('slrReady') !== -1);
ok('product pages: war bonds', src.indexOf('/store/p/war-bond-5') !== -1 && src.indexOf('/store/p/war-bond-50') !== -1);
ok('page directory present (PAGE_ORDERS mirror)', src.indexOf("url: '/cells'") !== -1 && src.indexOf("url: '/peoples-cpi'") !== -1);

/* 6. pillar grouping */
['spread', 'data', 'act', 'organize'].forEach(function (p) {
  ok('pillar key: ' + p, src.indexOf("key: '" + p + "'") !== -1);
});
ok('prices -> data pillar', /key: 'prices', pillar: 'data'/.test(src));
ok('databounties -> data pillar', /key: 'databounties', pillar: 'data'/.test(src));
ok('bounties -> act pillar', /key: 'bounties', pillar: 'act'/.test(src));
ok('events -> act pillar', /key: 'events', pillar: 'act'/.test(src));
ok('news -> spread pillar', /key: 'news', pillar: 'spread'/.test(src));

/* 7. Intel Card results (P-2) + theming */
ok('Intel Card class', src.indexOf('pf-s-card') !== -1);
ok('card kicker/headline/data/action', src.indexOf('pf-s-k') !== -1 && src.indexOf('pf-s-h') !== -1 &&
  src.indexOf('pf-s-d') !== -1 && src.indexOf('pf-s-a') !== -1);
ok('red top rule on cards', src.indexOf('border-top:3px solid var(--pf-s-accent)') !== -1);
ok('Arial only', !/font-family:(?!Arial)[a-z-]+/i.test(src.replace(/Arial[^;]*/gi, '')));
ok('CSS vars --pf-s-* default to --pf-hud-*', src.indexOf('--pf-s-bg:var(--pf-hud-bg') !== -1);

/* 8. keyboard + debounce */
ok('"/" shortcut', /ev\.key === '\/'/.test(scode));
ok('Cmd/Ctrl+K shortcut', scode.indexOf("ev.key === 'k'") !== -1 && scode.indexOf('metaKey') !== -1);
ok('Esc closes', scode.indexOf("ev.key === 'Escape'") !== -1);
ok('slash ignored while typing', scode.indexOf('typingTarget') !== -1);
ok('debounced input (150ms)', src.indexOf('DEBOUNCE_MS = 150') !== -1);

/* 9. fail-open + deep-link safety */
ok('fail-open fetch (-> null)', scode.indexOf('done(null)') !== -1);
ok('JSONP fallback for reads', scode.indexOf('jsonp(url, fin)') !== -1);
ok('per-source isolation (mapper try/catch)', /src\.items\(j\)[\s\S]{0,400}\}\s*catch/.test(scode));
ok('static sources always available (no backend needed)', src.indexOf('static sources first') !== -1);
ok('deep-link validation (safeUrl)', scode.indexOf('function safeUrl') !== -1);
ok('external news links get target=_blank + noopener', src.indexOf('target="_blank" rel="noopener"') !== -1);
ok('DATA landing via pillar registry (go/destinations)', src.indexOf("destinations('data')") !== -1);
ok('DATA fallback /peoples-cpi', src.indexOf("return '/peoples-cpi'") !== -1);

/* 10. runtime: fake-DOM sandbox */
function makeSandbox(opts) {
  opts = opts || {};
  var registry = [];
  var listeners = { document: {} };
  var timers = [];
  function reg(el) { if (registry.indexOf(el) === -1) registry.push(el); return el; }
  function detach(el) {
    if (!el || el._detached) return;
    el._detached = true;
    (el.children || []).forEach(detach);
  }
  function mkEl(tag) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(),
      children: [], attrs: {}, style: {}, value: '',
      _html: '', _listeners: {}, _focused: false, _detached: false,
      parentNode: null, textContent: '',
      set innerHTML(h) {
        this._html = String(h);
        /* minimal parse: every tagged element (id and data attrs) joins the registry */
        var re = /<(div|a|button|input|span|script|style)\b([^>]*)>/gi, m;
        while ((m = re.exec(this._html))) {
          var child = mkEl(m[1]);
          var at = m[2];
          var am = /([\w-]+)(?:="([^"]*)")?/g, a;
          while ((a = am.exec(at))) {
            if (a[1] === 'hidden' && a[2] === undefined) child.attrs.hidden = '';
            else child.attrs[a[1]] = a[2] == null ? '' : a[2];
          }
          this.children.push(child); child.parentNode = this; reg(child);
        }
      },
      get innerHTML() { return this._html; },
      get firstChild() { return this.children[0] || null; },
      appendChild: function (c) {
        if (c.tagName === 'SCRIPT' && typeof c.onerror === 'function') {
          /* fail-fast JSONP: scripts never load in the sandbox */
          var cb = c.onerror; setTimeout(function () { cb(); }, 0);
        }
        this.children.push(c); c.parentNode = this; reg(c); return c;
      },
      insertBefore: function (c, r) {
        var i = this.children.indexOf(r);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; reg(c); return c;
      },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i !== -1) this.children.splice(i, 1);
        detach(c); return c;
      },
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      removeAttribute: function (k) { delete this.attrs[k]; },
      hasAttribute: function (k) { return this.attrs[k] !== undefined; },
      addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
      querySelector: function (sel) {
        var m = sel.match(/\[data-([\w-]+)(?:="([^"]*)")?\]/);
        var live = registry.filter(function (e) { return !e._detached; });
        if (m) return live.filter(function (e) { return e.attrs['data-' + m[1]] !== undefined; })[0] || null;
        return null;
      },
      focus: function () { this._focused = true; },
      /* real-DOM fidelity: el.id = 'x' sets the id attribute */
      get id() { return this.attrs.id || ''; },
      set id(v) { this.attrs.id = String(v); },
      click: function () { (this._listeners.click || []).forEach(function (f) { f({ stopPropagation: function () {} }); }); }
    };
    return el;
  }
  function byId(id) {
    var live = registry.filter(function (e) { return !e._detached && e.attrs.id === id; });
    return live[0] || null;
  }
  var head = mkEl('head'); reg(head);
  var body = mkEl('div'); body.attrs.id = 'body'; reg(body);
  if (!opts.noHud) {
    var bar = mkEl('div'); bar.attrs.id = 'pf-hud-bar'; reg(bar); body.appendChild(bar);
    var caret = mkEl('div'); caret.attrs.id = 'pf-hud-caret'; reg(caret); bar.appendChild(caret);
  }
  var fetchCalls = [];
  function fakeFetch(url) {
    fetchCalls.push(String(url));
    var u = String(url);
    function okj(payload) {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve(payload); } });
    }
    if (opts.dead) return Promise.reject(new Error('network down'));
    if (opts.deadSource && u.indexOf('action=' + opts.deadSource) !== -1)
      return Promise.reject(new Error('source down'));
    if (u.indexOf('action=price_board') !== -1)
      return okj({ ok: true, items: [
        { item_id: 'eggs', name: 'Eggs (dozen)', unit: 'dozen', median_cents: 349, enough_data: true, delta_pct: 2.5 },
        { item_id: 'milk', name: 'Milk (gallon)', unit: 'gallon', median_cents: 429, enough_data: false }
      ] });
    if (u.indexOf('action=databounty_list') !== -1)
      return okj({ ok: true, bounties: [
        { id: 'db1', kind: 'photo_evidence', target_key: 'rally', title: 'Rally photo bounty', detail: 'Snap the march', xp_amount: 50 }
      ] });
    if (u.indexOf('action=bounty_list') !== -1)
      return okj({ ok: true, bounties: [
        { id: 'b1', title: 'Share the war report', detail: 'Post it everywhere', xp_reward: 25, platform: 'X' }
      ] });
    if (u.indexOf('action=event_list') !== -1)
      return okj({ ok: true, events: [
        { id: 'e1', title: 'Phone bank night', type: 'call', location: 'Baton Rouge', event_at: Date.now() + 86400000, description: 'Call voters', rsvp_count: 12 }
      ] });
    if (u.indexOf('action=news_top_get') !== -1)
      return okj({ ok: true, stories: [
        { url: 'https://example.com/senate', title: 'Senate vote looms', source: 'TestWire', published_at: Date.now() }
      ] });
    return Promise.reject(new Error('unknown action'));
  }
  var PF = {
    skip: function (s) { return !!opts.pfSkip && s === 'search'; },
    pillars: {
      destinations: function (k) { return k === 'data' ? [{ url: '/peoples-cpi' }] : []; }
    },
    slrAll: function () { return opts.slrMembers || [
      { name: 'Test Creator', slug: 'test-creator', catalog_path: '/test-creator',
        handles: { primary: '@testcreator' }, primary_platform: 'TikTok',
        propaganda_score: 8.5, followers_display: '100K', content_focus: 'test content' }
    ]; }
  };
  var sandbox = {
    window: null, document: null, console: console,
    setTimeout: function (fn) { var h = timers.length; timers.push(fn); return h; },
    clearTimeout: function () {},
    setInterval: function () { return -1; }, /* never fires: modules must not depend on the poll */
    clearInterval: function () {},
    MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
    localStorage: { getItem: function () { throw new Error('localStorage touched'); },
      setItem: function () { throw new Error('localStorage touched'); } }
  };
  sandbox.window = {
    PF: PF, PF_BACKEND_URL: 'https://pf-api.test',
    location: { href: 'https://mtcstw.com/' },
    fetch: fakeFetch, innerWidth: 1200
  };
  /* bare-name globals the module references */
  sandbox.fetch = fakeFetch;
  sandbox.document = {
    getElementById: byId,
    createElement: function (t) { return reg(mkEl(t)); },
    body: body, head: head,
    readyState: 'complete',
    addEventListener: function (t, f) { (listeners.document[t] = listeners.document[t] || []).push(f); }
  };
  sandbox.__ = { PF: PF, fetchCalls: fetchCalls, listeners: listeners, timers: timers,
    byId: byId, body: body,
    flushTimers: function () { var t = timers.splice(0); t.forEach(function (f) { try { f(); } catch (e) {} }); },
    fireKey: function (key, extra) {
      var ev = { key: key, target: body,
        preventDefault: function () { ev._pd = true; },
        stopPropagation: function () { ev._sp = true; } };
      for (var k in (extra || {})) ev[k] = extra[k];
      (listeners.document.keydown || []).forEach(function (f) { f(ev); });
      return ev;
    } };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  return sandbox;
}
function runModule(sbox) {
  vm.runInContext(src, sbox, { filename: '32-search.js' });
  sbox.byId = sbox.__.byId;
  return sbox;
}

/* 10a. kill switch: module no-ops */
(function () {
  var s = makeSandbox({ pfSkip: true });
  runModule(s);
  ok('runtime: ?pf_off=search -> no trigger mounted', s.byId('pf-search-btn') === null);
  ok('runtime: ?pf_off=search -> no PF.search API', s.__.PF.search === undefined);
  ok('runtime: ?pf_off=search -> no keydown listener', !(s.__.listeners.document.keydown || []).length);
})();

/* 10b. no HUD host -> silent no-op */
(function () {
  var s = makeSandbox({ noHud: true });
  runModule(s);
  ok('runtime: no HUD host -> no trigger', s.byId('pf-search-btn') === null);
  ok('runtime: no HUD host -> keys not wired', !(s.__.listeners.document.keydown || []).length);
})();

/* 10c. mount + keyboard + palette */
(function () {
  var s = makeSandbox({});
  runModule(s);
  var btn = s.byId('pf-search-btn');
  ok('runtime: trigger mounts in HUD bar', !!btn);
  ok('runtime: trigger sits before caret', (function () {
    var bar = s.byId('pf-hud-bar');
    return bar && bar.children[0] === btn;
  })());
  ok('runtime: keys wired after mount', (s.__.listeners.document.keydown || []).length === 1);
  /* "/" opens */
  s.__.fireKey('/', {});
  var panel = s.byId('pf-search');
  ok('runtime: "/" opens palette', !!panel && !panel.hasAttribute('hidden'));
  var input = s.byId('pf-search-input');
  ok('runtime: input focused on open', !!input && input._focused === true);
  /* Esc closes */
  s.__.fireKey('Escape', {});
  ok('runtime: Esc closes palette', panel.hasAttribute('hidden'));
  /* Cmd+K opens */
  s.__.fireKey('k', { metaKey: true });
  ok('runtime: Cmd+K opens palette', !panel.hasAttribute('hidden'));
  /* click trigger toggles (stopPropagation: no strip toggle to test, just toggle) */
  btn.click();
  ok('runtime: trigger click closes', panel.hasAttribute('hidden'));
  btn.click();
  ok('runtime: trigger click reopens', !panel.hasAttribute('hidden'));
})();

/* 10d. index + grouping + deep links */
function withIndex(sboxOpts, cb) {
  var s = makeSandbox(sboxOpts || {});
  runModule(s);
  var PF = s.__.PF;
  /* fetch promises settle on microtasks; the index callback fires after all
     five sources settle — give it a macrotask, then assert exactly once. */
  return new Promise(function (resolve) {
    PF.search.buildIndex(function () {
      setTimeout(function () { cb(s, s.__, PF); resolve(); }, 10);
    });
  });
}

var pending = [];
pending.push(withIndex({}, function (s, x, PF) {
  var g = PF.search.search('eggs');
  ok('runtime: price item found (eggs)', g.data.length === 1 && g.data[0].title === 'EGGS (DOZEN)');
  ok('runtime: price deep link -> DATA landing', g.data[0].url === '/peoples-cpi');
  ok('runtime: price data line shows figure', /349|\$3\.49/.test(g.data[0].sub));

  var b = PF.search.search('bounty');
  var kinds = {};
  ['spread', 'data', 'act', 'organize'].forEach(function (p) {
    b[p].forEach(function (it) { kinds[it.kicker] = p; });
  });
  ok('runtime: data bounty grouped under DATA', kinds['DATA BOUNTY'] === 'data');
  ok('runtime: xp bounty grouped under ACT', kinds['BOUNTY'] === 'act');
  ok('runtime: xp bounty deep link -> /create', b.act.some(function (it) { return it.url === '/create'; }));

  var e = PF.search.search('phone bank');
  ok('runtime: event found under ACT', e.act.length >= 1 && /PHONE BANK/.test(e.act[0].title));
  ok('runtime: event deep link -> /events', e.act[0].url === '/events');

  var n = PF.search.search('senate');
  ok('runtime: news found under SPREAD', n.spread.some(function (it) { return it.kicker === 'NEWS'; }));
  var story = n.spread.filter(function (it) { return it.kicker === 'NEWS'; })[0];
  ok('runtime: news deep link is external story url', story && story.url === 'https://example.com/senate');
  ok('runtime: news marked external', story && story.ext === true);

  var c = PF.search.search('test creator');
  ok('runtime: creator found under SPREAD', c.spread.some(function (it) { return it.kicker === 'CREATOR'; }));
  var cr = c.spread.filter(function (it) { return it.kicker === 'CREATOR'; })[0];
  ok('runtime: creator deep link = catalog_path', cr && cr.url === '/test-creator');

  var p = PF.search.search('war bond');
  ok('runtime: products found under SPREAD', p.spread.filter(function (it) { return it.kicker === 'PRODUCT'; }).length === 4);
  ok('runtime: product deep link valid', p.spread.some(function (it) { return it.url === '/store/p/war-bond-25'; }));

  var pg = PF.search.search('cell');
  ok('runtime: page directory hit (/cells)', pg.organize.some(function (it) { return it.url === '/cells'; }));

  /* deep-link validity: every indexed url is same-origin or http(s) */
  var bad = [];
  PF.search.buildIndex(function (idx) {
    idx.forEach(function (it) {
      if (!(/^\/[^\/\s]/.test(it.url) || /^https?:\/\//i.test(it.url) || it.url === '/')) bad.push(it.url);
    });
  });
  setTimeout(function () {
    ok('runtime: all deep links valid (same-origin or https)', bad.length === 0, bad.slice(0, 3).join(','));
  }, 30);

  /* group order in rendered HTML follows pillar order */
  PF.search.open();
  s.__.flushTimers(); /* debounce */
  var results = s.byId('pf-search-results');
  results.innerHTML = ''; /* ensure clean */
  /* render via input event path */
  var input = s.byId('pf-search-input');
  input.value = 'bounty';
  (input._listeners.input || []).forEach(function (f) { f(); });
  s.__.flushTimers();
  var html = results.innerHTML;
  var iSpread = html.indexOf('SPREAD / PROPAGANDA'), iData = html.indexOf('DATA / PRICES'),
      iAct = html.indexOf('ACT / SHOW UP');
  ok('runtime: groups render in pillar order', iSpread !== -1 && iData !== -1 && iAct !== -1 &&
    iSpread < iData && iData < iAct);
  ok('runtime: Intel Card markup rendered', html.indexOf('pf-s-card') !== -1 && html.indexOf('DEPLOY &rarr;') !== -1);
  ok('runtime: empty query renders empty state', (function () {
    input.value = 'zzz-no-such-thing';
    (input._listeners.input || []).forEach(function (f) { f(); });
    s.__.flushTimers();
    return s.byId('pf-search-results').innerHTML.indexOf('NO INTEL ON THAT') !== -1;
  })());
  PF.search.close();
}));

/* 10e. fail-open: every endpoint dead -> static sources still search */
pending.push(withIndex({ dead: true }, function (s, x, PF) {
  var counts = PF.search.counts();
  var remoteZero = ['prices', 'databounties', 'bounties', 'events', 'news']
    .every(function (k) { return (counts[k] || 0) === 0; });
  ok('runtime: dead backend -> remote source counts are 0', remoteZero);
  var g = PF.search.search('cell');
  ok('runtime: dead backend -> pages still searchable', g.organize.some(function (it) { return it.url === '/cells'; }));
  var p = PF.search.search('war bond');
  ok('runtime: dead backend -> products still searchable', p.spread.length === 4);
  var c = PF.search.search('test creator');
  ok('runtime: dead backend -> creators still searchable', c.spread.some(function (it) { return it.kicker === 'CREATOR'; }));
}));

/* 10f. fail-open: one source dead -> others survive */
pending.push(withIndex({ deadSource: 'event_list' }, function (s, x, PF) {
  var e = PF.search.search('phone bank');
  ok('runtime: dead event_list -> event group omitted', e.act.length === 0);
  var n = PF.search.search('senate');
  ok('runtime: dead event_list -> news survives', n.spread.some(function (it) { return it.kicker === 'NEWS'; }));
}));

/* 10g. no writes at runtime: only GET reads */
pending.push(withIndex({}, function (s, x, PF) {
  var gets = s.__.fetchCalls.filter(function (u) { return u.indexOf('action=') !== -1; });
  ok('runtime: backend reads are GET actions', gets.length === 5);
  ok('runtime: no write actions called', !gets.some(function (u) {
    return /action=(report_|claim|rsvp|vote|post|create|update|delete)/.test(u);
  }));
}));

Promise.all(pending).then(function () {
  setTimeout(function () {
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
  }, 60);
});
