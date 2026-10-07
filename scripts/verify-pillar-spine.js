#!/usr/bin/env node
/* scripts/verify-pillar-spine.js — static + runtime checks for the four-pillar
   spine (CEO directive 2026-10-06): pillar action bar, adventure-path chooser,
   Next Move bias, destination registry, psych + nav-ceiling contracts.
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

/* 1. syntax */
['core/31-pillars.js', 'core/20-nextop.js', 'build/bundle-core.js'].forEach(function (f) {
  var fp = f.indexOf('build/') === 0
    ? path.join(__dirname, '..', f) : path.join(ROOT, f);
  try {
    cp.execSync('node --check ' + JSON.stringify(fp), { stdio: 'pipe' });
    ok('syntax ' + f, true);
  } catch (e) { ok('syntax ' + f, false, 'node --check failed'); }
});

var pillars = read('core/31-pillars.js');
var pcode = code(pillars);
var nextop = read('core/20-nextop.js');

/* 2. four pillars, four paths (CEO directive 2026-10-06: DATA pillar relabeled TRACK;
   labels are SPREAD / TRACK / ACT / ORGANIZE — see also verify-teardown-hub.js §3) */
['SPREAD', 'TRACK', 'ACT', 'ORGANIZE'].forEach(function (l) {
  ok('pillar label: ' + l, pillars.indexOf("label: '" + l + "'") !== -1);
});
['propagandist', 'data', 'activist', 'organizer'].forEach(function (p) {
  ok('path: ' + p, pillars.indexOf(p + ': {') !== -1);
});
['PROPAGANDIST', 'DATA SCOUT', 'ACTIVIST', 'ORGANIZER'].forEach(function (n) {
  ok('path name: ' + n, pillars.indexOf("name: '" + n + "'") !== -1);
});

/* 3. kill switch + theming */
ok('kill switch ?pf_off=pillars', pillars.indexOf('pf_off=pillars') !== -1);
ok('kill switch localStorage list', pillars.indexOf("pf_disabled_v1='[\"pillars\"]'") !== -1);
ok("CSS vars --pf-p-* for theming", pillars.indexOf('--pf-p-bg') !== -1 &&
  pillars.indexOf('--pf-p-accent') !== -1 && pillars.indexOf('--pf-p-text') !== -1);
ok('vars default to --pf-hud-* set', pillars.indexOf('var(--pf-hud-bg') !== -1);

/* 4. zero new XP, no writes (device-local path preference is the only storage) */
ok('no backend writes (authPost)', pcode.indexOf('authPost') === -1);
ok('no XP grants (xpGrant)', pcode.indexOf('xpGrant') === -1);
ok('no fetch/XHR', pcode.indexOf('fetch(') === -1 && pcode.indexOf('XMLHttpRequest') === -1);
ok('path stored device-local', pillars.indexOf('pf_adventure_path_v1') !== -1);
ok('no "donate" anywhere', !/donate/i.test(pillars));

/* 5. psych constraints: soft paths — never locks, shames, or loss-frames.
   Daily XP cap is the SOLE governor on activity: paths are identity/flavor. */
ok('no loss framing ("miss out")', pcode.indexOf('miss out') === -1);
ok('no loss framing ("fall behind")', pcode.indexOf('fall behind') === -1);
ok('no shaming ("lazy")', pcode.indexOf('lazy') === -1);
ok('do-everything copy', pillars.indexOf('You can do everything') !== -1);
ok('change-anytime copy', pillars.indexOf('Change it whenever') !== -1);
ok('path clearable', pillars.indexOf('clearPath') !== -1);
ok('cap-is-sole-governor documented', /sole governor/i.test(pillars));
ok('paths never restrict: "never a gate" documented', pillars.indexOf('never a gate') !== -1);
ok('paths never restrict: no path-conditional action gating',
  !/if\s*\([^)]*getPath\(\)[^)]*\)\s*return/i.test(pcode));

/* 5b. multi-select adventure paths */
ok('multi-select: getPaths exposed', pillars.indexOf('getPaths: getPaths') !== -1);
ok('multi-select: setPaths exposed', pillars.indexOf('setPaths: setPaths') !== -1);
ok('multi-select: togglePath exposed', pillars.indexOf('togglePath: togglePath') !== -1);
ok('multi-select: JSON array storage', pillars.indexOf('JSON.stringify(clean)') !== -1);
ok('multi-select: v1 bare-string migration', pillars.indexOf('v1 bare-string') !== -1);
ok('multi-select: any-combination copy', pillars.indexOf('Pick any combination') !== -1);
ok('multi-select: confirm button', pillars.indexOf('data-pf-path-confirm') !== -1);
ok('multi-select: aria-pressed checkbox semantics', pillars.indexOf('aria-pressed') !== -1);
ok('multi-select: toggle visual state (is-sel)', pillars.indexOf('is-sel') !== -1);

/* 6. destination registry */
ok('registry: registerDestination exposed', pillars.indexOf('registerDestination: registerDestination') !== -1);
ok('registry: destinations exposed', pillars.indexOf('destinations: destinations') !== -1);
ok('registry: same-origin validation', pcode.indexOf("url.charAt(0) !== '/'") !== -1);
ok('registry: bad pillar rejected', pcode.indexOf('validPillarKey') !== -1);
ok('registry: later registrations win', pcode.indexOf('list.unshift(d)') !== -1);
ok('registry defaults: data->/economy', pillars.indexOf("url: '/economy'") !== -1);
ok('registry defaults: act->/events', pillars.indexOf("url: '/events'") !== -1);
ok('registry defaults: organize->/cells', pillars.indexOf("url: '/cells'") !== -1);
/* NAV CEILING (CEO standing principle): registry maps into the existing nav;
   the bar is a shortcut layer, not nav. */
ok('nav ceiling documented', pillars.indexOf('NAV CEILING') !== -1);
ok('shortcut-layer-not-nav documented', /shortcut\s*\n?\s*layer, not nav/i.test(pillars));
ok('no new top-level nav entries from defaults',
  ['/economy', '/events', '/cells'].every(function (u) { return pillars.indexOf("url: '" + u + "'") !== -1; }));

/* 7. cross-pillar handoffs */
ok('card share contract [data-pf-share-game]', pillars.indexOf('data-pf-share-game') !== -1);
ok('SPREAD via PFShare', pillars.indexOf('PFShare.shareImage') !== -1 || pillars.indexOf('PS.shareImage') !== -1);
ok('SPREAD poster fallback (P-5)', pillars.indexOf("REG['daily-orders']") !== -1 || pillars.indexOf('daily-orders') !== -1);
ok('share caption carries JOIN THE FIGHT.', pillars.indexOf('JOIN THE FIGHT.') !== -1);

/* 8. HUD extension (not rebuild) */
ok('mounts inside #pf-hud-strip', pillars.indexOf("getElementById('pf-hud-strip')") !== -1);
ok('path-flavored headline', pillars.indexOf('pf-hud-strip-title') !== -1 && pillars.indexOf('headline') !== -1);
ok('30-hud.js untouched by pillars (no edit markers)', read('core/30-hud.js').indexOf('31-pillars') === -1);
ok('build lists 31-pillars.js after 30-hud.js',
  (function () {
    var b = fs.readFileSync(path.join(__dirname, '..', 'build', 'bundle-core.js'), 'utf8');
    var a = b.indexOf("'core/30-hud.js'"), c = b.indexOf("'core/31-pillars.js'");
    return a !== -1 && c !== -1 && c > a;
  })());

/* 9. Next Move bias hook */
ok('nextop reads PF.pillars.biasOps', nextop.indexOf('PF.pillars') !== -1 && nextop.indexOf('biasOps') !== -1);
ok('nextop bias is fail-open (try/catch)', /try\s*\{[\s\S]{0,400}biasOps[\s\S]{0,400}\}\s*catch/.test(nextop));
ok('nextop bias is stable reorder', nextop.indexOf('_bfront') !== -1 && nextop.indexOf('_brest') !== -1);

/* 10. runtime: pillar bar + paths + registry (fake DOM sandbox) */
function makeSandbox(opts) {
  opts = opts || {};
  var registry = [];
  var idMap = {};
  function reg(el) { if (registry.indexOf(el) === -1) registry.push(el); return el; }
  function mkEl(tag, attrs) {
    var el = {
      tagName: String(tag || 'div').toUpperCase(),
      children: [], attrs: attrs || {}, style: {},
      _html: '', _listeners: {}, _scrolled: false, _focused: false,
      parentNode: null, textContent: '',
      set innerHTML(h) {
        this._html = String(h);
        /* minimal parse: one root div (carries the first div's id) with the
           buttons/anchors carrying data-pf-* hooks as its children */
        var root = mkEl('div');
        var im = this._html.match(/<div[^>]*\bid="([^"]*)"/i);
        if (im) root.attrs.id = im[1];
        var re = /<(button|a)\b([^>]*)>/gi, m;
        while ((m = re.exec(this._html))) {
          var at = m[2], child = mkEl(m[1]);
          ['data-pf-pillar', 'data-pf-path-pick', 'data-pf-path-confirm',
           'data-pf-path-skip', 'data-pf-path-x', 'data-pf-path-change'].forEach(function (k) {
            var mm = at.match(new RegExp(k + '="([^"]*)"'));
            if (mm) child.attrs[k] = mm[1];
          });
          var cm = at.match(/class="([^"]*)"/);
          if (cm) child.attrs['class'] = cm[1];
          root.children.push(child); child.parentNode = root; reg(child);
        }
        this.children.push(root); root.parentNode = this; reg(root);
      },
      get innerHTML() { return this._html; },
      get firstChild() { return this.children[0] || null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; reg(c); return c; },
      insertBefore: function (c, r) {
        var i = this.children.indexOf(r);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; reg(c); return c;
      },
      replaceChild: function (n, o) {
        var i = this.children.indexOf(o);
        if (i !== -1) this.children[i] = n;
        n.parentNode = this; reg(n); detach(o); return o;
      },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i !== -1) this.children.splice(i, 1);
        detach(c); return c;
      },
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) { return this.attrs[k] != null ? this.attrs[k] : null; },
      addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
      querySelectorAll: function (sel) { return qsa(sel); },
      querySelector: function (sel) { return qsa(sel)[0] || null; },
      scrollIntoView: function () { this._scrolled = true; },
      focus: function () { this._focused = true; }
    };
    return el;
  }
  function qsa(sel) {
    var live = registry.filter(function (e) { return !e._detached; });
    if (sel.indexOf('[data-pf-pillar]') !== -1)
      return live.filter(function (e) { return e.attrs['data-pf-pillar']; });
    if (sel.indexOf('[data-pf-path-pick]') !== -1)
      return live.filter(function (e) { return e.attrs['data-pf-path-pick']; });
    if (sel.indexOf('[data-pf-path-confirm]') !== -1)
      return live.filter(function (e) { return e.attrs['data-pf-path-confirm']; });
    if (sel.indexOf('[data-pf-path-change]') !== -1)
      return live.filter(function (e) { return e.attrs['data-pf-path-change']; });
    return [];
  }
  function detach(el) {
    if (!el || el._detached) return;
    el._detached = true;
    (el.children || []).forEach(detach);
  }
  var hud = mkEl('div', { id: 'pf-hud' });
  var strip = mkEl('div', { id: 'pf-hud-strip' });
  var stripTitle = mkEl('div', { id: 'pf-hud-strip-title' });
  stripTitle.textContent = 'YOUR CAMPAIGN';
  idMap['pf-hud'] = opts.noHud ? null : hud;
  idMap['pf-hud-strip'] = opts.noHud ? null : strip;
  idMap['pf-hud-strip-title'] = opts.noHud ? null : stripTitle;
  if (opts.checkin) idMap['pf-inflation-checkin'] = mkEl('div', { id: 'pf-inflation-checkin' });
  if (opts.priceInput !== false && opts.checkin) {
    var pi = mkEl('input', { id: 'pf-inf-ci-price' });
    idMap['pf-inf-ci-price'] = pi;
  }
  var store = {};
  if (opts.ls) Object.keys(opts.ls).forEach(function (k) { store[k] = opts.ls[k]; });
  var navTo = null;
  var sandbox = {
    console: console,
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function (id) {
        if (id === 'pf-path-chooser' || id === 'pf-pillars') {
          var f = registry.filter(function (e) { return !e._detached && e.attrs.id === id; });
          return f[0] || null;
        }
        if (id === 'pf-pillars-css') return null;
        return idMap[id] || null;
      },
      createElement: function (t) { return reg(mkEl(t)); },
      querySelectorAll: qsa,
      querySelector: function (sel) {
        if (sel === '[data-pf-share-game]') return null;
        return qsa(sel)[0] || null;
      },
      head: mkEl('head'), body: mkEl('body')
    },
    localStorage: {
      getItem: function (k) { return store[k] != null ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      _store: store
    },
    setTimeout: function () { return 0; },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = {
    skip: function (s) { return (opts.skip || []).indexOf(s) !== -1; },
    toast: function () {}
  };
  sandbox.window.PFShare = {
    REG: { 'daily-orders': { title: 'DAILY ORDERS' }, 'fan-vote': { title: 'FAN VOTE' } },
    poster: function () { return {}; },
    shareImage: function () { sandbox._shared = Array.prototype.slice.call(arguments); }
  };
  var _href = 'https://mtcstw.com/';
  sandbox.window.location = { pathname: '/', search: '' };
  Object.defineProperty(sandbox.window.location, 'href', {
    get: function () { return _href; },
    set: function (v) { _href = v; navTo = v; }
  });
  sandbox._navTo = function () { return navTo; };
  sandbox._registry = registry;
  sandbox._idMap = idMap;
  vm.createContext(sandbox);
  return sandbox;
}
function fireClick(el) {
  var ls = el._listeners.click || [];
  for (var i = 0; i < ls.length; i++) ls[i]({ stopPropagation: function () {} });
}

(function runtime() {
  /* A. default render: 4 buttons, default order, chooser on first run */
  var sb = makeSandbox({ ls: {} });
  try {
    vm.runInContext(pillars, sb, { filename: '31-pillars.js' });
    ok('runtime: PF.pillars API', !!sb.window.PF.pillars);
    var btns = sb.document.querySelectorAll('#pf-pillars [data-pf-pillar]');
    var order = btns.map(function (b) { return b.attrs['data-pf-pillar']; });
    ok('runtime: 4 pillar buttons', order.length === 4);
    ok('runtime: default order spread/data/act/organize',
      order.join(',') === 'spread,data,act,organize');
    /* 2026-10-06 (one-prompt): auto-fire REMOVED — the chooser must NOT
       auto-open on first run. It opens via the HUD-strip tap. */
    ok('runtime: first-run chooser does NOT auto-open', !sb.document.getElementById('pf-path-chooser'));
    var ch0 = sb.document.querySelectorAll('#pf-pillars [data-pf-path-change]')[0];
    fireClick(ch0);
    ok('runtime: chooser opens via HUD-strip tap', !!sb.document.getElementById('pf-path-chooser'));
    var picks = sb.document.querySelectorAll('[data-pf-path-pick]');
    ok('runtime: chooser has 4 paths', picks.length === 4);
    ok('runtime: chooser has confirm button',
      sb.document.querySelectorAll('[data-pf-path-confirm]').length === 1);
    /* MULTI-SELECT: toggle DATA SCOUT on — chooser stays open, nothing saved yet */
    var dp = picks.filter(function (p) { return p.attrs['data-pf-path-pick'] === 'data'; })[0];
    fireClick(dp);
    ok('runtime: toggle does not close chooser', !!sb.document.getElementById('pf-path-chooser'));
    ok('runtime: toggle does not persist yet',
      sb.localStorage._store['pf_adventure_path_v1'] == null);
    ok('runtime: toggle paints selected state',
      String(dp.attrs['class'] || '').indexOf('is-sel') !== -1 &&
      dp.attrs['aria-pressed'] === 'true');
    /* toggle it back off */
    fireClick(dp);
    ok('runtime: second toggle clears selected state',
      String(dp.attrs['class'] || '').indexOf('is-sel') === -1 &&
      dp.attrs['aria-pressed'] === 'false');
    /* confirm with a single pick: JSON array persisted, chooser closes */
    fireClick(dp);
    var go = sb.document.querySelectorAll('[data-pf-path-confirm]')[0];
    fireClick(go);
    ok('runtime: path stored device-local as JSON array',
      sb.localStorage._store['pf_adventure_path_v1'] === '["data"]');
    ok('runtime: getPaths returns array',
      JSON.stringify(sb.window.PF.pillars.getPaths()) === '["data"]');
    ok('runtime: chooser closes on confirm', !sb.document.getElementById('pf-path-chooser'));
    var b2 = sb.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .map(function (b) { return b.attrs['data-pf-pillar']; });
    ok('runtime: chosen pillar first', b2[0] === 'data');
    ok('runtime: path-flavored headline',
      sb._idMap['pf-hud-strip-title'].textContent === 'DATA SCOUT \u00B7 YOUR CAMPAIGN');
    ok('runtime: biasOps for data scout',
      sb.window.PF.pillars.biasOps().join(',') === 'predict,bounty,catchup');
    /* MULTI-SELECT: pick two paths — union bias, deduped, path order */
    var ch = sb.document.querySelectorAll('#pf-pillars [data-pf-path-change]')[0];
    fireClick(ch);
    ok('runtime: change-path reopens chooser', !!sb.document.getElementById('pf-path-chooser'));
    var picks2 = sb.document.querySelectorAll('[data-pf-path-pick]');
    var pp = picks2.filter(function (p) { return p.attrs['data-pf-path-pick'] === 'propagandist'; })[0];
    fireClick(pp); /* now data + propagandist selected */
    var go2 = sb.document.querySelectorAll('[data-pf-path-confirm]')[0];
    fireClick(go2);
    ok('runtime: two paths stored',
      sb.localStorage._store['pf_adventure_path_v1'] === '["propagandist","data"]');
    var b4 = sb.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .map(function (b) { return b.attrs['data-pf-pillar']; });
    ok('runtime: selected pillars first in path order', b4[0] === 'spread' && b4[1] === 'data');
    ok('runtime: multi headline joins names',
      sb._idMap['pf-hud-strip-title'].textContent === 'PROPAGANDIST + DATA SCOUT \u00B7 YOUR CAMPAIGN');
    ok('runtime: biasOps union deduped in path order',
      sb.window.PF.pillars.biasOps().join(',') ===
      'orders,bounty,recruit,matchquiz,loot,predict,catchup');
    ok('runtime: both pillar buttons highlighted',
      sb.document.querySelectorAll('#pf-pillars [data-pf-pillar]').filter(function (b) {
        return String(b.attrs['class'] || '').indexOf('is-path') !== -1;
      }).length === 2);
    /* clear path restores default */
    sb.window.PF.pillars.clearPath();
    var b3 = sb.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .map(function (b) { return b.attrs['data-pf-pillar']; });
    ok('runtime: clearPath restores order+headline',
      b3.join(',') === 'spread,data,act,organize' &&
      sb._idMap['pf-hud-strip-title'].textContent === 'YOUR CAMPAIGN');
    ok('runtime: no path -> empty bias', sb.window.PF.pillars.biasOps().length === 0);
    /* togglePath API: add/remove programmatically */
    sb.window.PF.pillars.togglePath('activist');
    ok('runtime: togglePath adds', JSON.stringify(sb.window.PF.pillars.getPaths()) === '["activist"]');
    sb.window.PF.pillars.togglePath('activist');
    ok('runtime: togglePath removes', sb.window.PF.pillars.getPaths().length === 0);
    /* setPath compat: single pick replaces the set */
    sb.window.PF.pillars.setPath('organizer');
    ok('runtime: setPath compat replaces set',
      JSON.stringify(sb.window.PF.pillars.getPaths()) === '["organizer"]');
    ok('runtime: getPath compat returns first',
      sb.window.PF.pillars.getPath() === 'organizer');
    sb.window.PF.pillars.clearPath();
  } catch (e) { ok('runtime: pillars executes', false, String(e && e.message || e)); }

  /* A2. all four paths -> default headline, all highlighted */
  var sbA = makeSandbox({ ls: {} });
  try {
    vm.runInContext(pillars, sbA, { filename: '31-pillars.js' });
    var P = sbA.window.PF.pillars;
    P.setPaths(['propagandist', 'data', 'activist', 'organizer']);
    ok('runtime: all-four stored',
      JSON.stringify(P.getPaths()) === '["propagandist","data","activist","organizer"]');
    ok('runtime: all-four -> default headline',
      sbA._idMap['pf-hud-strip-title'].textContent === 'YOUR CAMPAIGN');
    ok('runtime: all-four -> default pillar order',
      sbA.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
        .map(function (b) { return b.attrs['data-pf-pillar']; }).join(',') ===
        'spread,data,act,organize');
    ok('runtime: all-four pillars highlighted',
      sbA.document.querySelectorAll('#pf-pillars [data-pf-pillar]').filter(function (b) {
        return String(b.attrs['class'] || '').indexOf('is-path') !== -1;
      }).length === 4);
  } catch (e) { ok('runtime: all-four executes', false, String(e && e.message || e)); }

  /* A3. v1 bare-string migration */
  var sbM = makeSandbox({ ls: { pf_pillars_seen_v1: '1', pf_adventure_path_v1: 'data' } });
  try {
    vm.runInContext(pillars, sbM, { filename: '31-pillars.js' });
    ok('runtime: bare-string migrates to array',
      JSON.stringify(sbM.window.PF.pillars.getPaths()) === '["data"]');
    ok('runtime: junk storage value -> empty',
      (function () {
        var sbJ = makeSandbox({ ls: { pf_pillars_seen_v1: '1', pf_adventure_path_v1: '["hacker",42]' } });
        vm.runInContext(pillars, sbJ, { filename: '31-pillars.js' });
        return sbJ.window.PF.pillars.getPaths().length === 0;
      })());
  } catch (e) { ok('runtime: migration executes', false, String(e && e.message || e)); }

  /* B. registry: validation, priority, resolution */
  var sb2 = makeSandbox({ ls: { pf_pillars_seen_v1: '1' } });
  try {
    vm.runInContext(pillars, sb2, { filename: '31-pillars.js' });
    var P = sb2.window.PF.pillars;
    ok('runtime: bad pillar rejected', P.registerDestination('nope', { url: '/x' }) === false);
    ok('runtime: absolute URL rejected',
      P.registerDestination('data', { url: 'https://evil.example/x' }) === false);
    ok('runtime: missing url rejected', P.registerDestination('data', {}) === false);
    ok('runtime: default data destination',
      P.destinations('data')[0].url === '/peoples-cpi');
    ok('runtime: economy stays as data fallback',
      P.destinations('data').some(function (d) { return d.url === '/economy'; }));
    P.registerDestination('data', { url: '/prices', mount: 'pf-prices' });
    ok('runtime: new page takes priority', P.destinations('data')[0].url === '/prices');
    P.registerDestination('data', { url: '/prices', mount: 'pf-prices-v2' });
    ok('runtime: re-register dedupes', P.destinations('data').filter(function (d) {
      return d.url === '/prices';
    }).length === 1 && P.destinations('data')[0].mount === 'pf-prices-v2');
    /* tap DATA with no mount in-page -> navigates to top candidate */
    var dbtn = sb2.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .filter(function (b) { return b.attrs['data-pf-pillar'] === 'data'; })[0];
    fireClick(dbtn);
    ok('runtime: DATA navigates to registered landing',
      sb2._navTo() === '/prices#pf-prices-v2');
  } catch (e) { ok('runtime: registry executes', false, String(e && e.message || e)); }

  /* C. cross-pillar handoff: in-page mount -> scroll, no navigation */
  var sb3 = makeSandbox({ ls: { pf_pillars_seen_v1: '1' }, checkin: true });
  try {
    vm.runInContext(pillars, sb3, { filename: '31-pillars.js' });
    var dbtn3 = sb3.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .filter(function (b) { return b.attrs['data-pf-pillar'] === 'data'; })[0];
    fireClick(dbtn3);
    ok('runtime: DATA scrolls to checkin in-page', sb3._idMap['pf-inflation-checkin']._scrolled === true);
    ok('runtime: no navigation when in-page', sb3._navTo() === null);
  } catch (e) { ok('runtime: handoff executes', false, String(e && e.message || e)); }

  /* D. SPREAD: PFShare pipeline */
  var sb4 = makeSandbox({ ls: { pf_pillars_seen_v1: '1' } });
  try {
    vm.runInContext(pillars, sb4, { filename: '31-pillars.js' });
    var sbtn = sb4.document.querySelectorAll('#pf-pillars [data-pf-pillar]')
      .filter(function (b) { return b.attrs['data-pf-pillar'] === 'spread'; })[0];
    fireClick(sbtn);
    ok('runtime: SPREAD calls PFShare.shareImage', !!sb4._shared);
    ok('runtime: SPREAD caption carries CTA',
      sb4._shared && String(sb4._shared[4] && sb4._shared[4].text || '').indexOf('JOIN THE FIGHT.') !== -1);
  } catch (e) { ok('runtime: spread executes', false, String(e && e.message || e)); }

  /* E. kill switch */
  var sb5 = makeSandbox({ skip: ['pillars'] });
  try {
    vm.runInContext(pillars, sb5, { filename: '31-pillars.js' });
    ok('runtime: ?pf_off=pillars no-ops', !sb5.window.PF.pillars);
  } catch (e) { ok('runtime: kill switch executes', false, String(e && e.message || e)); }

  /* F. silent no-op when the HUD host is absent */
  var sb6 = makeSandbox({ noHud: true });
  try {
    vm.runInContext(pillars, sb6, { filename: '31-pillars.js' });
    ok('runtime: no HUD -> no pillar row', !sb6.document.getElementById('pf-pillars'));
    ok('runtime: no HUD -> no chooser', !sb6.document.getElementById('pf-path-chooser'));
    ok('runtime: API still fail-open for nextop', !!sb6.window.PF.pillars &&
      sb6.window.PF.pillars.biasOps().length === 0);
  } catch (e) { ok('runtime: no-host executes', false, String(e && e.message || e)); }
})();

/* 11. runtime: nextop adventure-path bias */
(function nextopBias() {
  var sandbox = {
    console: console,
    window: {},
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function () { return null; },
      createElement: function () { return { style: {}, appendChild: function () {} }; },
      head: { appendChild: function () {} },
      body: { appendChild: function () {}, classList: { contains: function () { return false; } } },
      querySelectorAll: function () { return []; }
    },
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    setTimeout: function () {}, setInterval: function () {}, clearInterval: function () {},
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; }
  };
  sandbox.window = sandbox;
  sandbox.window.PF = {
    skip: function () { return false; },
    /* adventure path: DATA SCOUT */
    pillars: { biasOps: function () { return ['predict', 'bounty', 'catchup']; } },
    authGetJSONP: function (be, action, params, cb) {
      var j = { ok: false };
      if (action === 'get') j = { ok: true, op_done: false };
      else if (action === 'campaign_status')
        j = { ok: true, campaign: { days_left: 28, day_offset: 4 }, my: { actions_today: 0 } };
      else if (action === 'predict_qlist')
        j = { ok: true, questions: [{ locked: false, resolved: false }, { locked: false, resolved: false }] };
      else if (action === 'dopamine_status') j = { ok: true };
      else if (action === 'streak_status') j = { ok: true };
      else if (action === 'cell_mine') j = { ok: true, in_cell: false };
      else if (action === 'xp_today') j = { ok: true, xp_today: 0 };
      cb(j);
    },
    error: function () {}
  };
  sandbox.window.PFCallsign = function () { return 'TESTER'; };
  sandbox.window.PFDeviceId = function () { return 'dev1'; };
  sandbox.window.PF_BACKEND_URL = 'https://example.invalid/';
  sandbox.window.location = { href: 'https://mtcstw.com/', pathname: '/' };
  vm.createContext(sandbox);
  try {
    vm.runInContext(nextop, sandbox, { filename: '20-nextop.js' });
    var html = '';
    var slot = {
      parentNode: {},
      querySelector: function () { return null; },
      insertAdjacentHTML: function (pos, h) { html = h; }
    };
    sandbox.window.PF.nextMove.render(slot, 'bias-test');
    /* orders would win the raw pf-v2 ladder (op_done=false); the data-scout
       bias must bubble predict ('THE BOARD IS OPEN') to the front. */
    ok('runtime: path bias bubbles predict to front', html.indexOf('MAKE THE CALL') !== -1);
  } catch (e) {
    ok('runtime: nextop bias executes', false, String(e && e.message || e));
  }
})();

/* 12. bundles carry the new code */
(function bundles() {
  ['core/bundle-core.js', 'core/bundle-core-slr.js'].forEach(function (b) {
    var src;
    try { src = read(b); } catch (e) { ok('bundle present: ' + b, false, 'missing'); return; }
    ok('bundle present: ' + b, true);
    ok(b + ' has pillar bar', src.indexOf('PICK YOUR FIGHT') !== -1);
    /* '_bfront' is a minified-away local; 'biasOps' is a property name and
       survives minification. */
    ok(b + ' has nextop bias', src.indexOf('biasOps') !== -1);
    ok(b + ' has registry', src.indexOf('registerDestination') !== -1);
  });
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
