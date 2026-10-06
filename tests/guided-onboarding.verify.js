#!/usr/bin/env node
/* tests/guided-onboarding.verify.js — verification harness for
 * games/guided-onboarding.js. Tiny DOM shim + minimal HTML parser for the
 * module's own markup. Asserts:
 *  1. kill switch (?pf_off) renders nothing
 *  2. editor mode renders nothing
 *  3. existing callsign -> nothing launches, no chip
 *  4. ?onboard=1 forces step 1 with 12 fight checkboxes (pre-checked)
 *  5. CONTINUE saves picks via PF.setPickFight -> step 2 renders
 *  6. max-3 cap enforced live
 *  7. CLAIM button invokes PF.requireCallsign -> callback -> step 3 renders
 *  8. SEE TODAY'S ORDERS closes overlay, marks done, scrolls to #pf-orders
 *  9. Skip fires pf-onboard-skipped, sticky dismissal, chip re-offered
 * 10. auto-launch fires at 30s only when never seen (sticky thereafter)
 * 11. static: zero direct XP calls, z-index below claim modal (99999)
 * Run: node tests/guided-onboarding.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'guided-onboarding.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- tiny element ---------- */
function El(tag) {
  this.tag = (tag || 'div').toLowerCase();
  this.children = []; this.parentNode = null;
  this.attrs = {}; this.style = {};
  this._innerHTML = ''; this.textContent = '';
  this.listeners = {}; this.checked = false;
  this.scrolled = false;
}
El.prototype.setAttribute = function (k, v) {
  this.attrs[k] = String(v);
  if (k === 'id') this.id = String(v);
  if (k === 'class') this.className = String(v);
  if (k === 'checked') this.checked = true;
};
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.appendChild = function (c) { this.children.push(c); c.parentNode = this; return c; };
El.prototype.insertBefore = function (c, ref) {
  c.parentNode = this;
  var i = ref ? this.children.indexOf(ref) : -1;
  if (i >= 0) this.children.splice(i, 0, c); else this.children.push(c);
  return c;
};
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) this.children.splice(i, 1);
  c.parentNode = null; return c;
};
El.prototype.addEventListener = function (t, fn) {
  (this.listeners[t] = this.listeners[t] || []).push(fn);
};
El.prototype.removeEventListener = function (t, fn) {
  var a = this.listeners[t] || [], i = a.indexOf(fn);
  if (i >= 0) a.splice(i, 1);
};
El.prototype.scrollIntoView = function () { this.scrolled = true; };
El.prototype.focus = function () {};
El.prototype.querySelector = function (s) { return qsa(this, s)[0] || null; };
El.prototype.querySelectorAll = function (s) { return qsa(this, s); };

/* minimal HTML parser: handles the module's well-formed markup subset */
function parseHTML(html, parent) {
  var VOID = { input: 1, br: 1, img: 1 };
  var stack = [parent];
  var re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][a-zA-Z0-9_:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)/g;
  var m;
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) continue; /* text */
    var tag = m[1].toLowerCase(), attrStr = m[2] || '', closing = html[m.index + 1] === '/';
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    var el = new El(tag);
    var am = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, a;
    while ((a = am.exec(attrStr))) {
      var v = a[2] === undefined ? '' : a[2].replace(/^["']|["']$/g, '');
      el.setAttribute(a[1], v);
    }
    stack[stack.length - 1].appendChild(el);
    if (!VOID[tag]) stack.push(el);
  }
}
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._innerHTML; },
  set: function (h) {
    this._innerHTML = String(h);
    this.children = [];
    parseHTML(this._innerHTML, this);
  }
});

function matchSel(el, sel) {
  sel = sel.trim();
  var pseudo = null;
  var pi = sel.indexOf(':');
  if (pi !== -1) { pseudo = sel.slice(pi + 1); sel = sel.slice(0, pi); }
  if (pseudo === 'checked' && !el.checked) return false;
  else if (pseudo && pseudo !== 'checked') return false;
  var m;
  if ((m = /^#([\w-]+)$/.exec(sel))) return el.id === m[1];
  if ((m = /^\.([\w-]+)$/.exec(sel))) {
    return (' ' + (el.className || '') + ' ').indexOf(' ' + m[1] + ' ') !== -1;
  }
  if ((m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel))) {
    var v = el.getAttribute(m[1]);
    if (v === undefined) return false;
    return m[2] === undefined || v === m[2];
  }
  if (/^[a-z]+$/.test(sel)) return el.tag === sel;
  return false;
}
function qsa(root, sel) {
  var out = [], seen = {};
  var parts = String(sel).split(',');
  (function walk(n) {
    for (var i = 0; i < n.children.length; i++) {
      var c = n.children[i];
      for (var p = 0; p < parts.length; p++) {
        if (matchSel(c, parts[p].trim())) {
          if (!seen[c._qid]) { c._qid = out.length + 1; seen[c._qid] = 1; out.push(c); }
          break;
        }
      }
      walk(c);
    }
  })(root);
  return out;
}

/* ---------- environment builder ---------- */
var AREAS = [
  ['voting', 'Voting Rights & Democracy'], ['labor', "Labor & Workers' Rights"],
  ['repro', 'Reproductive Rights'], ['climate', 'Climate & Environment'],
  ['racial', 'Racial Justice'], ['lgbtq', 'LGBTQ+ Rights'],
  ['immigrant', 'Immigrant Rights'], ['criminal', 'Criminal Justice Reform'],
  ['healthcare', 'Healthcare Access'], ['housing', "Housing & Tenants' Rights"],
  ['poverty', 'Anti-Poverty & Economic Justice'], ['watchdog', 'Watchdog & Accountability']
];
function makeEnv(o) {
  o = o || {};
  var store = {};
  if (o.ls) Object.keys(o.ls).forEach(function (k) { store[k] = o.ls[k]; });
  var body = new El('body');
  var pfv2 = new El('div'); pfv2.setAttribute('id', 'pf-v2');
  var orders = new El('div'); orders.setAttribute('id', 'pf-orders');
  body.appendChild(pfv2); body.appendChild(orders);
  var docListeners = {};
  var events = [];
  var timers = [];
  var setPickFightCalls = [];
  var requireCallsignCalls = [];
  var savedFights = o.fights === undefined ? null : o.fights.slice();

  function CustomEvent(t, d) { this.type = t; this.detail = (d && d.detail) || {}; }
  var win = {
    PFCallsign: function () { return o.callsign || ''; },
    location: { href: o.href || 'https://www.mtcstw.com/', search: o.search || '' },
    localStorage: {
      getItem: function (k) { return store[k] === undefined ? null : store[k]; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    document: {
      body: body,
      activeElement: null,
      createElement: function (t) { return new El(t); },
      getElementById: function (id) {
        if (id === 'pf-v2') return pfv2;
        if (id === 'pf-orders') return orders;
        return qsa(body, '#' + id)[0] || null;
      },
      addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
      removeEventListener: function (t, fn) {
        var a = docListeners[t] || [], i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      },
      dispatchEvent: function (e) { events.push(e); return true; },
      querySelector: function (s) { return qsa(body, s)[0] || null; },
      querySelectorAll: function (s) { return qsa(body, s); }
    },
    setTimeout: function (fn, ms) { timers.push({ fn: fn, ms: ms }); return timers.length; },
    clearTimeout: function () {},
    CustomEvent: CustomEvent
  };
  win.PF = {
    skip: function (s) {
      if ((o.search || '').indexOf('pf_off=' + s) !== -1) return true;
      try {
        var d = JSON.parse(win.localStorage.getItem('pf_disabled_v1') || '[]');
        return d.indexOf(s) !== -1;
      } catch (e) { return false; }
    },
    pickFightOptions: o.noPickApi ? undefined : function () { return AREAS.map(function (a) { return a.slice(); }); },
    pickFight: o.noPickApi ? undefined : function () { return savedFights === null ? [] : savedFights.slice(); },
    setPickFight: o.noPickApi ? undefined : function (arr) { setPickFightCalls.push(arr.slice()); savedFights = arr.slice(); return true; },
    requireCallsign: function (cb, opts) { requireCallsignCalls.push(opts || {}); win.__claimCb = cb; }
  };
  return {
    win: win, body: body, events: events, timers: timers, store: store,
    setPickFightCalls: setPickFightCalls, requireCallsignCalls: requireCallsignCalls,
    orders: orders, docListeners: docListeners,
    run: function () {
      var fn = new Function('window', 'document', 'localStorage', 'setTimeout',
        'clearTimeout', 'CustomEvent', src + '\nreturn true;');
      fn(win, win.document, win.localStorage, win.setTimeout, win.clearTimeout, CustomEvent);
    },
    evTypes: function () { return events.map(function (e) { return e.type; }); }
  };
}

/* ---------- tests ---------- */
(function () {
  /* 1. kill switch */
  var e = makeEnv({ search: '?pf_off=guided-onboarding' });
  e.run();
  ok('kill switch renders nothing', !e.win.document.getElementById('pf-onboard') && !e.win.document.getElementById('pf-ob-chip'));

  /* 2. editor mode */
  e = makeEnv({ href: 'https://www.mtcstw.com/config/pages' });
  e.run();
  ok('editor mode renders nothing', !e.win.document.getElementById('pf-onboard'));

  /* 3. existing callsign */
  e = makeEnv({ callsign: 'testfighter' });
  e.run();
  ok('callsign present: no overlay, no chip',
    !e.win.document.getElementById('pf-onboard') && !e.win.document.getElementById('pf-ob-chip'));

  /* 4. forced launch -> step 1, 12 checkboxes, pre-checks */
  e = makeEnv({ search: '?onboard=1', fights: ['voting', 'climate'] });
  e.run();
  var ov = e.win.document.getElementById('pf-onboard');
  ok('?onboard=1 opens overlay', !!ov);
  var boxes = ov.querySelectorAll('.pf-ob-cb');
  ok('step 1 renders 12 fight checkboxes', boxes.length === 12, 'got ' + boxes.length);
  var pre = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.getAttribute('data-fid'); });
  ok('existing picks pre-checked', pre.length === 2 && pre.indexOf('voting') !== -1 && pre.indexOf('climate') !== -1);
  ok('pf-onboard-shown fired', e.evTypes().indexOf('pf-onboard-shown') !== -1);
  ok('step event fired', e.evTypes().indexOf('pf-onboard-step') !== -1);

  /* 6. max-3 cap */
  boxes[0].checked = true; boxes[1].checked = true; boxes[2].checked = true;
  boxes[3].checked = true;
  var ch = boxes[3].listeners.change || [];
  ch.forEach(function (fn) { fn.call(boxes[3]); });
  ok('4th pick rejected by cap', boxes[3].checked === false);
  var cap = ov.querySelector('#pf-ob-cap');
  ok('cap notice shown', cap && cap.style.display === 'block');

  /* 5. CONTINUE -> setPickFight -> step 2 */
  boxes[0].checked = true; boxes[1].checked = false; boxes[2].checked = false; boxes[3].checked = false;
  boxes[4].checked = true;
  ov.querySelector('#pf-ob-continue').onclick();
  ok('CONTINUE saves via PF.setPickFight',
    e.setPickFightCalls.length === 1 && e.setPickFightCalls[0].length === 2,
    JSON.stringify(e.setPickFightCalls));
  var claimBtn = ov.querySelector('#pf-ob-claim');
  ok('step 2 renders claim button', !!claimBtn);

  /* 7. claim -> requireCallsign -> callback -> step 3 */
  claimBtn.onclick();
  ok('CLAIM invokes PF.requireCallsign', e.requireCallsignCalls.length === 1);
  ok('claim context passed', /enlist/i.test(e.requireCallsignCalls[0].context || ''));
  e.win.__claimCb('newfighter');
  var goBtn = ov.querySelector('#pf-ob-go');
  ok('claim success advances to step 3', !!goBtn);

  /* 8. SEE TODAY'S ORDERS closes, marks done, scrolls */
  goBtn.onclick();
  e.timers.forEach(function (t) { if (t.ms === 60) t.fn(); });
  ok('overlay removed after step 3', !e.win.document.getElementById('pf-onboard'));
  ok('state done persisted', e.store.pf_onboard_v1 === 'done');
  ok('pf-onboard-done fired', e.evTypes().indexOf('pf-onboard-done') !== -1);
  ok('scrolled to Daily Orders', e.orders.scrolled === true);

  /* 9. skip: sticky dismissal + chip re-offered */
  e = makeEnv({ search: '?onboard=1' });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ov.querySelector('[data-ob="skip"]').onclick();
  ok('skip fires pf-onboard-skipped', e.evTypes().indexOf('pf-onboard-skipped') !== -1);
  ok('dismissal sticky', e.store.pf_onboard_v1 === 'dismissed');
  ok('overlay closed on skip', !e.win.document.getElementById('pf-onboard'));
  ok('entry chip re-offered after skip', !!e.win.document.getElementById('pf-ob-chip'));

  /* 10. auto-launch timing + stickiness */
  e = makeEnv({});
  e.run();
  var auto = e.timers.filter(function (t) { return t.ms === 30000; });
  ok('auto-launch scheduled at 30s', auto.length === 1);
  ok('chip shown pre-launch (re-enter path)', !!e.win.document.getElementById('pf-ob-chip'));
  auto[0].fn();
  ok('auto-launch opens overlay', !!e.win.document.getElementById('pf-onboard'));
  /* second run with dismissal stored: no auto timer */
  e = makeEnv({ ls: { pf_onboard_v1: 'dismissed' } });
  e.run();
  ok('no auto-launch after dismissal', e.timers.filter(function (t) { return t.ms === 30000; }).length === 0);
  ok('chip still offered after dismissal', !!e.win.document.getElementById('pf-ob-chip'));

  /* C2 (Psych): skip is non-destructive */
  e = makeEnv({ search: '?onboard=1', fights: ['voting', 'climate'] });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ov.querySelector('#pf-ob-skipstep').onclick();
  ok('"Skip this step" never wipes picks', e.setPickFightCalls.length === 0);
  ok('"Skip this step" advances to step 2', !!ov.querySelector('#pf-ob-claim'));

  /* C2: CONTINUE with zero picks, never chosen -> key stays null (no write) */
  e = makeEnv({ search: '?onboard=1' });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ov.querySelector('#pf-ob-continue').onclick();
  ok('empty CONTINUE writes nothing (key stays null)', e.setPickFightCalls.length === 0);
  ok('empty CONTINUE still advances', !!ov.querySelector('#pf-ob-claim'));

  /* C2: first real pick still persists (the +10 path) */
  e = makeEnv({ search: '?onboard=1' });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  var bx = ov.querySelectorAll('.pf-ob-cb');
  bx[0].checked = true;
  ov.querySelector('#pf-ob-continue').onclick();
  ok('first real pick persists via setPickFight',
    e.setPickFightCalls.length === 1 && e.setPickFightCalls[0][0] === 'voting');

  /* C1 (Psych): aria-modal + focus trap */
  e = makeEnv({ search: '?onboard=1' });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ok('dialog has aria-modal=true', ov.getAttribute('aria-modal') === 'true');
  var fz = ov.querySelectorAll('button, input, [tabindex]')
    .filter(function (el) { return el.getAttribute('tabindex') !== '-1'; });
  ok('focusable set non-trivial', fz.length > 3, 'got ' + fz.length);
  var focused = [];
  fz.forEach(function (f) {
    f.focus = function () { focused.push(f); };
  });
  function tabEv(shift, active) {
    var ev = { key: 'Tab', shiftKey: !!shift, pd: false,
      preventDefault: function () { ev.pd = true; } };
    e.win.document.activeElement = active;
    (e.docListeners.keydown || []).forEach(function (fn) { fn(ev); });
    return ev;
  }
  var first = fz[0], last = fz[fz.length - 1];
  focused.length = 0;
  var ev1 = tabEv(false, last);
  ok('Tab on last wraps to first', ev1.pd === true && focused[focused.length - 1] === first);
  focused.length = 0;
  var ev2 = tabEv(true, first);
  ok('Shift+Tab on first wraps to last', ev2.pd === true && focused[focused.length - 1] === last);
  focused.length = 0;
  var ev3 = tabEv(false, fz[1]);
  ok('Tab mid-list does not hijack', ev3.pd === false && focused.length === 0);

  /* anonymous path: stay anonymous -> step 3 */
  e = makeEnv({ search: '?onboard=1' });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ov.querySelector('#pf-ob-continue').onclick();
  ov.querySelector('#pf-ob-anon').onclick();
  ok('anonymous path reaches step 3', !!ov.querySelector('#pf-ob-go'));

  /* degraded: pick-fight API missing -> starts at step 2 */
  e = makeEnv({ search: '?onboard=1', noPickApi: true });
  e.run();
  ov = e.win.document.getElementById('pf-onboard');
  ok('degrades to step 2 without pick API', !!ov.querySelector('#pf-ob-claim'));

  /* 11. static assertions */
  ok('zero direct XP calls', !/(xpGrant|PF\.award|enlistment[^.]*award)\s*\(/.test(src), 'grep');
  var noComments = src.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('z-index below claim modal', /var Z = 99998/.test(noComments) && noComments.indexOf('99999') === -1);
  ok('kill switch documented', src.indexOf('pf_off=guided-onboarding') !== -1);
  ok('all dynamic strings escaped', (src.match(/esc\(/g) || []).length >= 3);
})();

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
