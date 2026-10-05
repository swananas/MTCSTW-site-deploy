/* Nuke detonation themes FE tests (fe/nuke-political-themes, 2026-10-05).
   vm sandbox with mocked browser globals; loads the real
   v1.4.3/games/nuke-themes.js and exercises:
     - kill switches (?pf_off=nuke-themes, do-meter killed) -> silent
     - {active:true} -> banner mounted at top of #slr-nuke, both CTAs
     - {active:false} -> zero visual change
     - JSONP failure -> fail-soft, no banner, no throw
     - once/day cache -> no refetch when cached
     - escaping of backend strings
     - DETONATE ON THIS -> scrolls to + highlights the real press button
     - FORGE THIS -> cancelable pf-forge-launch event; toast only when the
       Forge preventDefault()s (honest pre-load claim); scroll fallback
     - themed confirmation line on pf-nuke-update pressed=true
   Run: node tests/nuke-themes.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var CODE = fs.readFileSync(
  path.join(__dirname, '..', 'v1.4.3', 'games', 'nuke-themes.js'), 'utf8');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

function chiDay() {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}

function activePayload() {
  return {
    ok: true, active: true, day: chiDay(),
    bill: {
      id: 'HR-22', number: 'H.R. 22', title: 'SAVE Act',
      stage: 'passed the House', vote_date: chiDay(), chamber: 'house',
      sponsor: 'Rep. Chip Roy [R-TX-21]',
      url: 'https://www.congress.gov/bill/119th-congress/house-bill/22',
      key_facts: ['Floor vote scheduled today (' + chiDay() + ').',
        'Status: passed the House.', 'Sponsor: Rep. Chip Roy [R-TX-21].']
    },
    forge_link: '/?forge=political&bill=HR-22#pf-poster'
  };
}

/* ---------- mock browser ---------- */
function makeEnv(opts) {
  opts = opts || {};
  var store = opts.seedStore || {};
  var registry = {};
  var docListeners = {};
  var dispatched = [];
  var scripts = [];
  var toasts = [];

  function mkEl(id) {
    var e = {
      id: id || '', style: {}, children: [], _listeners: {},
      innerHTML: '', textContent: '', _scrolled: false, _focused: false,
      classList: {
        _s: {},
        add: function (c) { this._s[c] = 1; },
        remove: function (c) { delete this._s[c]; },
        contains: function (c) { return !!this._s[c]; }
      },
      addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
      removeEventListener: function () {},
      click: function () { (this._listeners.click || []).forEach(function (f) { f({}); }); },
      scrollIntoView: function () { this._scrolled = true; },
      focus: function () { this._focused = true; },
      appendChild: function (c) { this.children.push(c); return c; },
      setAttribute: function () {}, getAttribute: function () { return null; },
      insertAdjacentHTML: function (pos, html) {
        this.innerHTML = html;
        /* The banner wires its buttons by id right after inserting — so
           the mock registers them like a real DOM would. */
        if (this.id === 'slr-nuke' && html.indexOf('pf-nuke-theme') >= 0) {
          var banner = mkEl('pf-nuke-theme'); registry['pf-nuke-theme'] = banner;
          var det = mkEl('pnt-detonate'); registry['pnt-detonate'] = det;
          var fg = mkEl('pnt-forge'); registry['pnt-forge'] = fg;
          var cf = mkEl('pnt-confirm'); registry['pnt-confirm'] = cf;
        }
      },
      querySelector: function (sel) {
        if (sel === '[data-nuke-press="1"]') return this._pressBtn || null;
        return null;
      },
      parentNode: null
    };
    return e;
  }

  var nuke = mkEl('slr-nuke');
  registry['slr-nuke'] = nuke;
  var pressWrap = mkEl('slr-nuke-press');
  var pressBtn = mkEl('pressbtn');
  pressWrap._pressBtn = opts.noPressBtn ? null : pressBtn;
  registry['slr-nuke-press'] = pressWrap;
  if (opts.withForge) registry['pf-poster'] = mkEl('pf-poster');

  var head = mkEl('head');
  head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') scripts.push(node);
    return node;
  };

  function CustomEvent(t, init) {
    this.type = t;
    this.detail = init && init.detail;
    this.cancelable = !!(init && init.cancelable);
    this.defaultPrevented = false;
  }
  CustomEvent.prototype.preventDefault = function () { this.defaultPrevented = true; };

  var skipped = opts.skipped || [];
  var sandbox = {
    console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: setInterval, clearInterval: clearInterval,
    CustomEvent: CustomEvent,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    }
  };
  sandbox.window = sandbox;
  sandbox.window.PF_BACKEND_URL = 'https://pf-api.mtcstw.workers.dev';
  sandbox.window.location = { href: '' };
  sandbox.window.PF = {
    skip: function (s) { return skipped.indexOf(s) !== -1; },
    log: function () {},
    toast: function (m) { toasts.push(m); }
  };
  sandbox.document = {
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (tag) {
      var e = mkEl(''); e.tagName = String(tag).toUpperCase(); return e;
    },
    createTextNode: function (t) { return { text: t }; },
    head: head,
    addEventListener: function (t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    removeEventListener: function () {},
    dispatchEvent: function (ev) {
      dispatched.push(ev);
      (docListeners[ev.type] || []).forEach(function (f) { f(ev); });
      return !ev.defaultPrevented;
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(CODE, sandbox, { filename: 'nuke-themes.js' });
  return {
    sandbox: sandbox, registry: registry, scripts: scripts,
    dispatched: dispatched, toasts: toasts, docListeners: docListeners,
    nuke: nuke, pressBtn: pressBtn, store: store,
    /* drive the pending JSONP request with a payload (or null = error) */
    answerJsonp: function (payload) {
      if (!scripts.length) return false;
      var sc = scripts[scripts.length - 1];
      var m = /callback=([A-Za-z0-9_]+)/.exec(sc.src || '');
      if (!m) return false;
      if (payload === null) { sc.onerror && sc.onerror(); return true; }
      sandbox[m[1]](payload);
      return true;
    },
    fireDoc: function (type, detail) {
      (docListeners[type] || []).forEach(function (f) { f({ type: type, detail: detail }); });
    }
  };
}

/* 1: kill switch ?pf_off=nuke-themes -> silent */
{
  var e = makeEnv({ skipped: ['nuke-themes'] });
  ok('kill-switch nuke-themes: no network, no banner',
    e.scripts.length === 0 && !e.registry['pf-nuke-theme']);
}

/* 2: do-meter killed -> silent (respects the existing switch) */
{
  var e = makeEnv({ skipped: ['do-meter'] });
  ok('do-meter kill-switch respected: no network, no banner',
    e.scripts.length === 0 && !e.registry['pf-nuke-theme']);
}

/* 3: active payload -> banner with headline, facts, both CTAs */
{
  var e = makeEnv();
  ok('theme fetch issued', e.answerJsonp(activePayload()));
  var b = e.registry['pf-nuke-theme'];
  ok('banner mounted', !!b);
  ok('headline names the bill', e.nuke.innerHTML.indexOf('H.R. 22') >= 0);
  ok('facts rendered', e.nuke.innerHTML.indexOf('passed the House') >= 0);
  ok('DETONATE ON THIS primary CTA', e.nuke.innerHTML.indexOf('pnt-detonate') >= 0 &&
    e.nuke.innerHTML.indexOf('Detonate on this') >= 0);
  ok('FORGE THIS secondary CTA', e.nuke.innerHTML.indexOf('pnt-forge') >= 0);
  ok('congress.gov source link', e.nuke.innerHTML.indexOf('congress.gov') >= 0);
}

/* 4: inactive -> zero visual change */
{
  var e = makeEnv();
  e.answerJsonp({ ok: true, active: false, day: chiDay() });
  ok('inactive: no banner, nuke block untouched',
    !e.registry['pf-nuke-theme'] && e.nuke.innerHTML === '');
}

/* 5: JSONP failure -> fail-soft */
{
  var e = makeEnv();
  e.answerJsonp(null);
  ok('fetch failure: no banner, no throw',
    !e.registry['pf-nuke-theme'] && e.nuke.innerHTML === '');
}

/* 6: once/day cache -> no refetch */
{
  var seed = {};
  seed.pf_nuke_theme_v1 = JSON.stringify({ day: chiDay(), payload: activePayload() });
  var e = makeEnv({ seedStore: seed });
  ok('cached: banner rendered with zero network requests',
    e.scripts.length === 0 && !!e.registry['pf-nuke-theme']);
}

/* 7: escaping */
{
  var e = makeEnv();
  var p = activePayload();
  p.bill.title = '<script>alert(1)</script>';
  p.bill.key_facts = ['<img src=x onerror=alert(1)>'];
  e.answerJsonp(p);
  ok('backend strings escaped',
    e.nuke.innerHTML.indexOf('<script>') === -1 &&
    e.nuke.innerHTML.indexOf('&lt;script&gt;') >= 0 &&
    e.nuke.innerHTML.indexOf('<img') === -1);
}

/* 8: DETONATE ON THIS -> lands on the real press button */
{
  var e = makeEnv();
  e.answerJsonp(activePayload());
  e.registry['pnt-detonate'].click();
  ok('detonate scrolls to the press button', e.pressBtn._scrolled === true);
  ok('detonate highlights the press button', e.pressBtn.classList.contains('pnt-target'));
  ok('detonate focuses the press button', e.pressBtn._focused === true);
}

/* 9: FORGE THIS -> cancelable pf-forge-launch event + scroll */
{
  var e = makeEnv({ withForge: true });
  e.answerJsonp(activePayload());
  e.registry['pnt-forge'].click();
  var evs = e.dispatched.filter(function (d) { return d.type === 'pf-forge-launch'; });
  ok('forge dispatches pf-forge-launch', evs.length === 1);
  ok('event is cancelable', evs[0].cancelable === true);
  ok('event carries the bill', evs[0].detail.bill_id === 'HR-22' &&
    evs[0].detail.tab === 'political');
  ok('no false pre-load claim when Forge ignores the event', e.toasts.length === 0);
  ok('scrolls to the Forge block', e.registry['pf-poster']._scrolled === true);
}

/* 10: Forge preventDefault -> honest landing confirmation */
{
  var e = makeEnv({ withForge: true });
  e.sandbox.document.addEventListener('pf-forge-launch', function (ev) { ev.preventDefault(); });
  e.answerJsonp(activePayload());
  e.registry['pnt-forge'].click();
  ok('toast only when the Forge pre-loads', e.toasts.length === 1 &&
    e.toasts[0].indexOf('H.R. 22') >= 0);
}

/* 11: forge fallback -> forge_link when no Forge block on page */
{
  var e = makeEnv({ withForge: false });
  e.answerJsonp(activePayload());
  e.registry['pnt-forge'].click();
  ok('falls back to forge_link href',
    e.sandbox.window.location.href === '/?forge=political&bill=HR-22#pf-poster');
}

/* 12: themed confirmation on press */
{
  var e = makeEnv();
  e.answerJsonp(activePayload());
  var cf = e.registry['pnt-confirm'];
  ok('confirmation hidden before press', cf.style.display !== 'block');
  e.fireDoc('pf-nuke-update', { pressed: true, charge_streak: 4 });
  ok('confirmation shows after press', cf.style.display === 'block' &&
    cf.textContent.indexOf('H.R. 22') >= 0);
  ok('confirmation shows once/day flag stored',
    (function () {
      try {
        var s = JSON.parse(e.store.pf_nuke_theme_pressed_v1 || 'null');
        return !!(s && s.day === chiDay() && s.bill === 'HR-22');
      } catch (ex) { return false; }
    })());
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
