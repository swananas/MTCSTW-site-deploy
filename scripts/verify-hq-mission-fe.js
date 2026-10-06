#!/usr/bin/env node
/* scripts/verify-hq-mission-fe.js — Synergy-2 mission control frontend harness.
   Run from the repo root:
     node scripts/verify-hq-mission-fe.js
   1. Rebuilds bundles (build/bundle.js + build/bundle-core.js); reverts the
      known stale bundle-sec1.js regeneration churn (drive-by-free).
   2. node --check on touched files.
   3. Static checks (comment-strip only, never string-strip — AGENTS.md):
      kill switch, mount contract, zero-XP tokens, banned terms, no secret-key
      endpoint from the browser, fail-soft copy, Psych F1/F2/F3 copy rules,
      bundle + page-mount registration.
   4. Mocked-browser runtime tests (vm + minimal DOM shim + JSONP capture):
      kill path, silent no-op without the mount div, identity picker, synergy
      connecting state, live map render, earnings render, wire render +
      honest-empty, dismiss copy, XSS escaping.
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
/* Comment-strip ONLY (no quote stripping — the esc() /"/g pattern breaks
   naive string strippers; see AGENTS.md). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js + build/bundle-core.js ran clean');
} catch (e) { no('bundle rebuild', 'rebuild failed: ' + (e && e.message)); }
/* Known stale committed bundle: regeneration adds A2's MACRO THIS WEEK, which
   is correct content but out of scope here — revert per drive-by-free. */
try {
  var sec1 = cp.execSync('git -C ' + ROOT + ' diff --name-only -- v1.4.3/games/bundle-sec1.js',
    { encoding: 'utf8' }).trim();
  if (sec1) {
    cp.execSync('git -C ' + ROOT + ' checkout -- v1.4.3/games/bundle-sec1.js');
    ok('bundle-sec1.js regeneration churn reverted (unrelated to this build)');
  } else ok('bundle-sec1.js untouched by rebuild');
} catch (e) { no('sec1 revert', e && e.message); }

console.log('== 1. node --check ==');
['v1.4.3/games/hq-mission.js', 'v1.4.3/pages/page-mount.js', 'build/bundle.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var SRC = path.join(V, 'games', 'hq-mission.js');
var src = read(SRC);
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]hq-mission['"]\)/.test(src)) ok('kill switch PF.skip("hq-mission") wired');
else no('kill switch', 'PF.skip("hq-mission") not found');
if (src.indexOf('?pf_off=hq-mission') !== -1) ok('KILL comment documents ?pf_off=hq-mission');
else no('kill doc', 'missing ?pf_off=hq-mission in header');
if (src.indexOf("getElementById('pf-hq-mission')") !== -1) ok('self-mounts into #pf-hq-mission');
else no('mount div', '#pf-hq-mission mount not found');

/* Zero XP: no grant path anywhere in the module. */
['xpGrant(', 'creditLocal', 'postAction', '.creditLocal', 'xp_action'].forEach(function (t) {
  if (code.indexOf(t) === -1) ok('zero-XP token absent: ' + t);
  else no('zero-XP', 'forbidden token present: ' + t);
});
/* Banned terms. */
if (!/donate/i.test(code)) ok('banned term "donate" absent');
else no('banned term', '"donate" found in module');
/* Security: the secret-key endpoint must NEVER be called from the browser. */
if (code.indexOf('creator_synergy_get') === -1) ok('creator_synergy_get (secret-key) never referenced');
else no('secret endpoint', 'creator_synergy_get must not be called from the browser');
if (code.indexOf('api_action') !== -1 && code.indexOf('synergy_by_creator') !== -1)
  ok('consumes public synergy_by_creator via ?api_action=');
else no('synergy contract', 'public synergy_by_creator read not found');
['fred_release_prompts', 'xp_balance', 'creator_stats_get'].forEach(function (s) {
  if (code.indexOf(s) !== -1) ok('contract string present: ' + s);
  else no('contract string', s + ' not found');
});
/* Fail-soft + honest-empty copy. */
['SYNERGY MAP CONNECTING', 'NOTHING ON THE MAP YET', 'tracked yet',
 "topic-trend models aren"].forEach(function (s) {
  if (src.indexOf(s) !== -1) ok('honest-state copy present: ' + JSON.stringify(s.slice(0, 28)));
  else no('honest copy', 'missing: ' + s);
});
/* Psych F3: neutral dismiss. */
if (src.indexOf('>DISMISS<') !== -1) ok('dismiss control copy is neutral DISMISS');
else no('dismiss copy', 'neutral DISMISS button not found');
if (!/NOT NOW/i.test(code)) ok('no "NOT NOW" deferred-obligation framing');
else no('dismiss framing', '"NOT NOW" found — use neutral DISMISS');
/* Psych F1: no compliance tracking. F2: no delta/growth framing. */
['prompts_acted', 'dismissed_count', 'wire_compliance', 'actRate'].forEach(function (t) {
  if (code.indexOf(t) === -1) ok('no compliance-tracking token: ' + t);
  else no('compliance tracking', 'forbidden token present: ' + t);
});
if (!/\+N this week|growing|slipping|you could earn/i.test(code)) ok('no delta/growth/projection framing');
else no('growth framing', 'delta or projection language found');
/* Grind framing: no urgency/shame strings. "only" is only a violation with a
   number attached ("only 3 left") — the legit "prompts only" idiom must pass. */
["don't miss", 'hours left', "you're behind", 'behind', 'keep it up',
 'break the chain', 'streak'].forEach(function (t) {
  if (code.toLowerCase().indexOf(t) === -1) ok('no grind token: ' + JSON.stringify(t));
  else no('grind framing', 'found: ' + t);
});
if (!/only \d+/i.test(code)) ok('no "only N" scarcity framing');
else no('grind framing', '"only N" scarcity pattern found');
/* Bundle + page-mount registration. */
if (has(path.join(V, 'games', 'bundle-create.js'), 'hq-mission.js')) ok('hq-mission.js ships in bundle-create.js');
else no('bundle-create', 'hq-mission.js not in regenerated bundle-create.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'hq-mission')) ok('page-mount SELF registration in bundle-pages.js');
else no('bundle-pages', 'hq-mission SELF registration missing from bundle-pages.js');
var pm = read(path.join(V, 'pages', 'page-mount.js'));
if (pm.indexOf("'hq-mission': { div: 'pf-hq-mission'") !== -1) ok('SELF map: hq-mission -> #pf-hq-mission');
else no('SELF map', 'hq-mission entry missing in page-mount.js');
if (pm.indexOf("'pf-hq-mission'") !== -1) ok('FE_MOUNT_IDS includes pf-hq-mission');
else no('FE_MOUNT_IDS', 'pf-hq-mission missing');
/* Slug validation + escaping discipline. */
if (/a-z0-9_-/.test(src) && src.indexOf('validSlug') !== -1) ok('slug allow-list validation present');
else no('slug validation', 'validSlug allow-list not found');
if ((src.match(/esc\(/g) || []).length >= 10) ok('esc() used pervasively on render (' + (src.match(/esc\(/g) || []).length + ' calls)');
else no('escaping', 'esc() coverage looks thin');

console.log('== 3. runtime tests (vm + DOM shim) ==');

/* ---------- minimal DOM/browser shim ---------- */
var MEMBERS = [
  { slug: 'dr-greg-show', name: 'Dr. Greg Show' },
  { slug: 'voix-noire', name: 'Voix Noire' },
  { slug: 'joman', name: 'Joman' }
];
function makeCtx(opts) {
  opts = opts || {};
  var store = {};
  if (opts.slug) store['pf_mission_slug'] = JSON.stringify(opts.slug);
  var captured = [];   /* JSONP script srcs */
  var toasts = [];
  var copies = [];
  var stubs = {};      /* selector -> stub */
  function El(tag) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(), children: [], parentNode: null,
      _html: '', _text: '', id: '', className: '', style: {}, value: '',
      _listeners: {}, _src: '',
      set innerHTML(v) {
        this._html = String(v);
        var c = El('div'); c._html = String(v); this.children = [c];
      },
      get innerHTML() { return this._html; },
      set textContent(v) { this._text = String(v); },
      get textContent() { return this._text; },
      get firstChild() { return this.children[0]; },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild: function (c) {
        var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c;
      },
      addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
      closest: function () { return null; },
      querySelector: function (sel) {
        if (!stubs[sel]) stubs[sel] = El('div');
        return stubs[sel];
      },
      querySelectorAll: function () { return []; },
      getAttribute: function () { return null; },
      setAttribute: function () {},
      select: function () {}, remove: function () {},
      set src(v) {
        this._src = String(v);
        if (this.tagName === 'SCRIPT') captured.push({ url: this._src, done: false });
      },
      get src() { return this._src; }
    };
    return el;
  }
  var host = El('div'); host.id = 'pf-hq-mission';
  var head = El('head'), bodyEl = El('body');
  var byId = { 'pf-hq-mission': opts.noDiv ? null : host };
  if (opts.ammo) byId['pf-ammo'] = El('div');
  var sandbox = {
    console: console,
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    location: { search: opts.search || '', pathname: '/creator-hq/' },
    navigator: { clipboard: { writeText: function (t) { copies.push(t); return Promise.resolve(); } } },
    document: {
      getElementById: function (id) { return byId[id] || null; },
      createElement: function (t) { return El(t); },
      head: head, body: bodyEl,
      execCommand: function () { return false; }
    },
    window: null,
    PF_BACKEND_URL: 'https://backend.test',
    PF: {
      skip: function (id) { return opts.killed && id === 'hq-mission'; },
      toast: function (m) { toasts.push(m); },
      slrAll: function () { return MEMBERS.slice(); },
      slrMember: function (s) {
        for (var i = 0; i < MEMBERS.length; i++) if (MEMBERS[i].slug === s) return MEMBERS[i];
        return null;
      }
    },
    PFCALLSIGN: opts.callsign === undefined ? 'testcommander' : opts.callsign
  };
  sandbox.window = sandbox;
  sandbox.PFCallsign = function () { return sandbox.PFCALLSIGN; };
  vm.createContext(sandbox);
  vm.runInContext(read(SRC), sandbox, { filename: 'hq-mission.js' });
  return {
    sb: sandbox, captured: captured, toasts: toasts, copies: copies,
    store: store, stubs: stubs, host: host,
    respond: function (match, payload) {
      for (var i = 0; i < captured.length; i++) {
        var c = captured[i];
        if (c.url.indexOf(match) !== -1 && !c.done) {
          c.done = true;
          var m = c.url.match(/callback=([^&]+)/);
          if (m) vm.runInContext(decodeURIComponent(m[1]) + '(' + JSON.stringify(payload) + ')', sandbox);
        }
      }
    },
    panelHtml: function (n) {
      /* body stub children: [who?, p1, p2, p3]; panels are the divs appended after #mc-body */
      var mcBody = stubs['#mc-body'];
      if (!mcBody) return '';
      var panels = mcBody.children.filter(function (c) { return c.tagName === 'DIV'; });
      var p = panels[n];
      return p && p.children[0] ? p.children[0].innerHTML : '';
    },
    fire: function (sel, type, evt) {
      var s = stubs[sel];
      if (s && s._listeners[type]) s._listeners[type].forEach(function (f) { f(evt || {}); });
    }
  };
}

var SYNERGY_OK = { ok: true, slug: 'dr-greg-show',
  surfaces: [{ surface: 'ammo-finder', count: 3 }, { surface: 'briefing', count: 1 }] };
var SYNERGY_ZERO = { ok: true, slug: 'dr-greg-show', surfaces: [] };
var WIRE = { ok: true, prompts: [{ kind: 'cpi', series_id: 'CPIAUCNS',
  headline: 'CPI DAY — THE FRESH PRINT IS LIVE', figure: '+3.3% YOY',
  copy: 'The new CPI figure is in.', cta: 'GRAB THE CITATION', target: 'figures',
  days_since_release: 1, stale: false, period_label: 'Aug 2026',
  source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS' }] };

/* T1: kill switch — module exits before touching the host. */
(function () {
  var t = makeCtx({ killed: true, slug: 'dr-greg-show' });
  if (t.host.innerHTML === '') ok('T1 kill: ?pf_off=hq-mission leaves the host untouched');
  else no('T1 kill', 'host was written despite kill switch');
})();

/* T2: silent no-op without the mount div. */
(function () {
  var threw = false;
  try { makeCtx({ noDiv: true, slug: 'dr-greg-show' }); }
  catch (e) { threw = true; }
  if (!threw) ok('T2 no-div: silent no-op, no throw');
  else no('T2 no-div', 'threw without the mount div');
})();

/* T3: picker renders when no identity is stored. */
(function () {
  var t = makeCtx({});
  var html = t.stubs['#mc-body'] ? t.stubs['#mc-body'].innerHTML : '';
  /* (shim note: the member list renders into the nested #mc-plist stub,
     mirroring the real DOM where it nests inside #mc-body) */
  var listHtml = t.stubs['#mc-plist'] ? t.stubs['#mc-plist'].innerHTML : '';
  if (html.indexOf('WHOSE MAP IS THIS?') !== -1 && listHtml.indexOf('Dr. Greg Show') !== -1)
    ok('T3 picker: roster picker renders with member names');
  else no('T3 picker', 'picker did not render');
})();

/* T4: picking an identity boots the three panels. */
(function () {
  var t = makeCtx({});
  t.fire('#mc-q', 'input', {});
  t.fire('#mc-plist', 'click', { target: { closest: function () {
    return { getAttribute: function () { return 'dr-greg-show'; } }; } } });
  var whoHtml = '';
  var kids = t.stubs['#mc-body'] ? t.stubs['#mc-body'].children : [];
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].className === 'mc-who') whoHtml = kids[i].innerHTML;
  }
  if (t.store['pf_mission_slug'] === JSON.stringify('dr-greg-show') &&
      whoHtml.indexOf('WATCHING:') !== -1)
    ok('T4 picker click: identity stored, dashboard boots');
  else no('T4 picker click', 'identity not stored or dashboard did not boot');
})();

/* T5: synergy engine absent -> honest CONNECTING state (fail-soft). */
(function () {
  var t = makeCtx({ slug: 'dr-greg-show' });
  t.respond('api_action=synergy_by_creator', { ok: false, err: 'unknown api_action' });
  t.respond('action=xp_balance', { balance: 1250 });
  t.respond('action=fred_release_prompts', { ok: true, prompts: [] });
  var mapHtml = t.panelHtml(0);
  if (mapHtml.indexOf('SYNERGY MAP CONNECTING') !== -1)
    ok('T5 connecting: engine-absent renders the honest connecting card');
  else no('T5 connecting', 'connecting card missing; got: ' + mapHtml.slice(0, 120));
})();

/* T6: live map renders canonical surfaces in fixed order with counts. */
(function () {
  var t = makeCtx({ slug: 'dr-greg-show' });
  t.respond('api_action=synergy_by_creator', SYNERGY_OK);
  t.respond('action=xp_balance', { balance: 1250 });
  t.respond('action=creator_stats_get', { ok: true, stats: [] });
  t.respond('action=fred_release_prompts', { ok: true, prompts: [] });
  var mapHtml = t.panelHtml(0);
  var iAmmo = mapHtml.indexOf('AMMO FINDER CITATIONS'), iBrief = mapHtml.indexOf('THE BRIEFING');
  if (iAmmo !== -1 && iBrief !== -1 && iAmmo < iBrief && mapHtml.indexOf('>3<') !== -1)
    ok('T6 map: canonical order, counts rendered as facts');
  else no('T6 map', 'surface rows/order/counts wrong');
  var earnHtml = t.panelHtml(1);
  if (earnHtml.indexOf('1,250 XP') !== -1 && earnHtml.indexOf("aren't tracked yet") !== -1)
    ok('T6 earnings: server balance + honest views/remixes line');
  else no('T6 earnings', 'earnings panel wrong: ' + earnHtml.slice(0, 160));
})();

/* T7: zero surfaces -> honest zero state, never a wall of zeros. */
(function () {
  var t = makeCtx({ slug: 'voix-noire' });
  t.respond('api_action=synergy_by_creator', SYNERGY_ZERO);
  t.respond('action=xp_balance', { balance: 0 });
  t.respond('action=creator_stats_get', { ok: true, stats: [] });
  t.respond('action=fred_release_prompts', { ok: true, prompts: [] });
  var mapHtml = t.panelHtml(0);
  if (mapHtml.indexOf('NOTHING ON THE MAP YET') !== -1 && mapHtml.indexOf("you're behind") === -1)
    ok('T7 zero state: honest, no shame framing');
  else no('T7 zero state', 'zero-state copy wrong');
})();

/* T8: wire renders prompts; empty -> absence (no fake-urgency banner). */
(function () {
  var t = makeCtx({ slug: 'dr-greg-show' });
  t.respond('api_action=synergy_by_creator', SYNERGY_OK);
  t.respond('action=xp_balance', { balance: 10 });
  t.respond('action=creator_stats_get', { ok: true, stats: [] });
  t.respond('action=fred_release_prompts', WIRE);
  var wireHtml = t.panelHtml(2);
  if (wireHtml.indexOf('CPI DAY') !== -1 && wireHtml.indexOf('COPY FIGURE') !== -1 &&
      wireHtml.indexOf('DISMISS') !== -1 && wireHtml.indexOf("aren't live yet") !== -1)
    ok('T8 wire: prompt card + COPY FIGURE + DISMISS + U-08 label');
  else no('T8 wire', 'wire card wrong: ' + wireHtml.slice(0, 160));
})();
(function () {
  var t = makeCtx({ slug: 'dr-greg-show' });
  t.respond('api_action=synergy_by_creator', SYNERGY_OK);
  t.respond('action=xp_balance', { balance: 10 });
  t.respond('action=creator_stats_get', { ok: true, stats: [] });
  t.respond('action=fred_release_prompts', { ok: true, prompts: [] });
  var wireHtml = t.panelHtml(2);
  if (wireHtml.indexOf('mc-prompt') === -1 && wireHtml.indexOf('THE WIRE') !== -1)
    ok('T8b wire empty: honest absence, no fake-urgency banner');
  else no('T8b wire empty', 'empty wire rendered prompts or lost the header');
})();

/* T9: XSS escaping — hostile strings never break out. */
(function () {
  var t = makeCtx({ slug: 'dr-greg-show' });
  t.respond('api_action=synergy_by_creator', { ok: true, slug: 'x',
    surfaces: [{ surface: 'ammo-finder', count: 1 }] });
  t.respond('action=xp_balance', { balance: 5 });
  t.respond('action=creator_stats_get', { ok: true, stats: [] });
  t.respond('action=fred_release_prompts', { ok: true, prompts: [{
    kind: 'cpi', series_id: '"><script>alert(1)</script>', headline: '<img src=x onerror=alert(1)>',
    figure: '1', copy: 'c', cta: 'x' }] });
  var wireHtml = t.panelHtml(2);
  if (wireHtml.indexOf('<script>') === -1 && wireHtml.indexOf('&lt;img') !== -1)
    ok('T9 escaping: hostile prompt strings are entity-escaped');
  else no('T9 escaping', 'unescaped HTML in wire render');
})();

/* T10: ?creator= param seeds identity. */
(function () {
  var t = makeCtx({ search: '?creator=joman' });
  var whoHtml = '';
  var kids = t.stubs['#mc-body'] ? t.stubs['#mc-body'].children : [];
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].className === 'mc-who') whoHtml = kids[i].innerHTML;
  }
  if (whoHtml.indexOf('WATCHING:') !== -1 &&
      t.store['pf_mission_slug'] === JSON.stringify('joman'))
    ok('T10 ?creator= param seeds and persists identity');
  else no('T10 ?creator=', 'param identity not honored');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
