/* Academy progression v1 frontend smoke test (2026-10-05).
   DOM-stub harness: loads the REAL v1.4.3/games/academy.js, drives
   PFAcademy.mount with canned JSONP backend responses, and asserts:
     1. Course sections render (BASIC TRAINING, READ THE ECONOMY)
     2. Locked course shows neutral lock copy + no MARK COMPLETE on its lessons
     3. Unlocked course lessons have MARK COMPLETE buttons
     4. Completed course renders a certificate card
     5. Unassigned lessons render under FIELD MANUAL
     6. Flat-list fallback when the backend sends no courses[]
   Run: node tests/academy-progression-smoke.test.cjs */
'use strict';
var fs = require('fs');
var vm = require('vm');
var ROOT = require('path').join(__dirname, '..', 'v1.4.3', 'games');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

var LESSONS = [
  { id: 'make-first-poster', title: 'Make your first poster', content: 'poster', xp_reward: 20, order_num: 1, course_id: 'basic-training', done: true },
  { id: 'killer-caption', title: 'Write a killer caption', content: 'caption', xp_reward: 15, order_num: 2, course_id: 'basic-training', done: true },
  { id: 'share-like-pro', title: 'Share like a pro', content: 'share', xp_reward: 15, order_num: 3, course_id: 'basic-training', done: true },
  { id: 'join-a-cell', title: 'Join a cell', content: 'cell', xp_reward: 25, order_num: 4, course_id: 'basic-training', done: true },
  { id: 'recruit-soldier', title: 'Recruit your first soldier', content: 'recruit', xp_reward: 30, order_num: 5, course_id: 'basic-training', done: false },
  { id: 'read-the-cpi', title: 'Read the CPI', content: 'cpi [[FRED:CPIAUCNS]]', xp_reward: 20, order_num: 6, course_id: 'read-the-economy', done: false },
  { id: 'fed-funds-and-your-rent', title: 'Fed funds', content: 'fed', xp_reward: 20, order_num: 7, course_id: 'read-the-economy', done: false },
  { id: 'what-gdp-hides', title: 'What GDP hides', content: 'gdp', xp_reward: 25, order_num: 8, course_id: 'read-the-economy', done: false },
  { id: 'bonus-lesson', title: 'Bonus', content: 'extra', xp_reward: 10, order_num: 9, course_id: null, done: false }
];
var COURSES = [
  { id: 'basic-training', title: 'BASIC TRAINING', description: 'Learn the craft', order_num: 1, requires_course: null, unlocked: true, completed: false, completed_at: null, lesson_ids: ['make-first-poster', 'killer-caption', 'share-like-pro', 'join-a-cell', 'recruit-soldier'], done_count: 4, total: 5, xp_proposed: 50 },
  { id: 'read-the-economy', title: 'READ THE ECONOMY', description: 'Read the numbers', order_num: 2, requires_course: 'basic-training', unlocked: false, completed: false, completed_at: null, lesson_ids: ['read-the-cpi', 'fed-funds-and-your-rent', 'what-gdp-hides'], done_count: 0, total: 3, xp_proposed: 50 }
];
var COURSES_DONE = JSON.parse(JSON.stringify(COURSES));
COURSES_DONE[0].completed = true; COURSES_DONE[0].completed_at = 1728000000000;
COURSES_DONE[0].done_count = 5; COURSES_DONE[1].unlocked = true;

function runCase(name, lessonList, courses, asserts) {
  var html = '';
  var pendingScripts = [];
  function makeEl(id) {
    return {
      id: id, innerHTML: '', value: '', textContent: '', disabled: false, style: {},
      parentNode: null, onclick: null,
      setAttribute: function () {}, getAttribute: function () { return null; },
      addEventListener: function () {}, removeEventListener: function () {},
      querySelectorAll: function (sel) {
        // minimal: find buttons by class in current innerHTML
        if (!this.innerHTML) return [];
        if (sel === 'button.ac-done') {
          var out = [], re = /<button[^>]*class="c-btn ac-done"[^>]*data-lid="([^"]+)"/g, m;
          while ((m = re.exec(this.innerHTML))) out.push({ lid: m[1], onclick: null, disabled: false });
          return out;
        }
        return [];
      },
      querySelector: function () { return null; },
      appendChild: function (c) { return c; },
      closest: function () { return null; },
      classList: { contains: function () { return false; }, add: function () {} },
      scrollIntoView: function () {}
    };
  }
  var slot = makeEl('pf-academy-slot');
  Object.defineProperty(slot, 'innerHTML', {
    get: function () { return html; },
    set: function (v) { html = String(v); }
  });
  var doc = {
    getElementById: function (id) {
      if (id === 'pf-academy-slot') return slot;
      if (id === 'acRetry') return { onclick: null };
      return null;
    },
    createElement: function (tag) {
      if (tag === 'script') {
        var s = { parentNode: null, onerror: null };
        Object.defineProperty(s, 'src', {
          set: function (v) { pendingScripts.push(String(v)); }
        });
        return s;
      }
      return makeEl('');
    },
    head: { appendChild: function () {} },
    addEventListener: function () {},
    querySelectorAll: function () { return []; }
  };
  var sandbox = {
    console: console,
    setTimeout: function (fn) { return 0; },
    clearTimeout: function () {},
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    String: String, Number: Number, RegExp: RegExp, Error: Error,
    document: doc,
    window: null,
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    sessionStorage: { getItem: function () { return null; }, setItem: function () {} },
    fetch: function () { return Promise.reject(new Error('no network in test')); },
    CustomEvent: function (t, o) { this.type = t; this.detail = (o || {}).detail; },
    AbortController: undefined
  };
  sandbox.window = sandbox;
  sandbox.PF = {
    skip: function () { return false; },
    toast: function () {},
    gateHTML: function (a) { return '<div>' + a + '</div>'; },
    holder: function () { return { insertAdjacentHTML: function () {} }; },
    creditLocal: function () {},
    errCopy: function (j, d) { return (j && j.err) || d; },
    authGetJSONP: null, authPost: null, getAuthSecret: null,
    dope: null, Callsign: null
  };
  sandbox.PFCallsign = function () { return 'testcadet'; };
  sandbox.PFDeviceId = function () { return 'dev1'; };
  sandbox.PF_BACKEND_URL = 'https://test.invalid/';
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(ROOT + '/academy.js', 'utf8'), sandbox, { filename: 'academy.js' });

  // Drive mount; answer JSONP script injections with canned responses.
  sandbox.PFAcademy.mount(slot);
  var guard = 0;
  while (pendingScripts.length && guard++ < 10) {
    var src = pendingScripts.shift();
    var m = /action=([^&]+).*callback=([^&]+)/.exec(src);
    if (!m) continue;
    var action = decodeURIComponent(m[1]), cb = m[2];
    var resp = null;
    if (action === 'lesson_list') resp = { ok: true, lessons: lessonList, courses: courses };
    else if (action === 'academy_progress') resp = { ok: true, lessons: lessonList, courses: courses, graduated: false, fred_guided_unlocked: false };
    else if (action === 'fred_macro') resp = { ok: false };
    if (resp && sandbox[cb]) sandbox[cb](resp);
  }
  asserts(html, slot);
}

console.log('case: progression render');
runCase('prog', LESSONS, COURSES, function (html) {
  ok('course sections render', html.indexOf('BASIC TRAINING') !== -1 && html.indexOf('READ THE ECONOMY') !== -1);
  ok('neutral lock copy', html.indexOf('Complete BASIC TRAINING to unlock.') !== -1);
  ok('no FOMO/shame copy', !/hurry|falling behind|don.t fall|limited|exclusive/i.test(html));
  ok('locked lesson has no MARK COMPLETE', html.indexOf('data-lid="read-the-cpi"') === -1, 'read-the-cpi button present');
  ok('unlocked lesson has MARK COMPLETE', html.indexOf('data-lid="recruit-soldier"') !== -1);
  ok('FIELD MANUAL renders unassigned', html.indexOf('FIELD MANUAL') !== -1 && html.indexOf('data-lid="bonus-lesson"') !== -1);
  ok('per-course progress', html.indexOf('4/5 lessons') !== -1);
});

console.log('case: completed course certificate');
runCase('cert', LESSONS, COURSES_DONE, function (html) {
  ok('certificate card renders', html.indexOf('CERTIFICATE') !== -1 && html.indexOf('earned by testcadet') !== -1);
  ok('course 2 unlocked after course 1', html.indexOf('data-lid="read-the-cpi"') !== -1);
  ok('no XP teaser in certificate', !/50 XP|pending/i.test(html));
});

console.log('case: flat fallback (no courses)');
runCase('flat', LESSONS.map(function (l) { var c = Object.assign({}, l); delete c.course_id; return c; }), [], function (html) {
  ok('flat list renders all lessons', html.indexOf('Make your first poster') !== -1 && html.indexOf('What GDP hides') !== -1);
  ok('no course headers in fallback', html.indexOf('BASIC TRAINING') === -1);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
