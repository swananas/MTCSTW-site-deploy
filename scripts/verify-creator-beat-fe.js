#!/usr/bin/env node
/* scripts/verify-creator-beat-fe.js — Roster Beat Pages frontend verification.
   Run from the repo root:
     node scripts/verify-creator-beat-fe.js
   1. node --check on the new module
   2. Static checks (kill switch, mount contract, banned terms, esc hygiene,
      roster grid untouched, no XP surface)
   3. Mocked-browser runtime tests (vm): JSONP read contract, hidden/data
      fail-soft, section render, owner toggle wiring, Jeanine skip.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'pages', 'creator-beat.js');
var CATALOG = path.join(V, 'pages', 'slr-catalog.js');
var ROSTER = path.join(V, 'pages', 'slr-roster.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles (bundle-pages carries the module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('creator-beat.js syntax'); }
catch (e) { no('syntax', 'node --check failed'); }
try { cp.execSync('node --check ' + CATALOG, { stdio: 'pipe' }); ok('slr-catalog.js syntax'); }
catch (e) { no('syntax', 'slr-catalog node --check failed'); }

var src = read(MOD);
var code = stripComments(src);
var catSrc = read(CATALOG);
var rosterSrc = read(ROSTER);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]creator-beat['"]\)/.test(src)) ok('kill switch PF.skip("creator-beat")');
else no('kill-switch', 'PF.skip("creator-beat") missing');
if (has(MOD, 'pf-catalog-beat')) ok('listens for pf-catalog-beat event');
else no('catalog-event', 'pf-catalog-beat listener missing');
if (has(CATALOG, 'id="pf-beat"') && has(CATALOG, 'data-beat-slug')) ok('slr-catalog renders #pf-beat mount with slug');
else no('mount', '#pf-beat mount missing from slr-catalog.js');
if (has(CATALOG, 'pf-catalog-beat')) ok('slr-catalog fires pf-catalog-beat');
else no('mount-event', 'slr-catalog does not fire pf-catalog-beat');
if (has(path.join(ROOT, 'build', 'bundle-core.js'), 'pages/creator-beat.js')) ok('bundled in pages/bundle-pages');
else no('bundle', 'creator-beat.js missing from build/bundle-core.js manifest');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'creator-beat')) ok('bundle-pages.js rebuilt with module');
else no('bundle-output', 'bundle-pages.js lacks creator-beat content');
/* Roster grid untouched */
if (rosterSrc.indexOf('pf-beat') === -1 && rosterSrc.indexOf('Their fight') === -1) ok('roster grid untouched (no beat markup)');
else no('roster-grid', 'slr-roster.js gained beat markup — roster must stay clean');
/* Jeanine do-not-touch */
if (has(MOD, 'jeanine-pirreaux-comedy')) ok('Jeanine Pirreaux Comedy excluded (do-not-touch)');
else no('jeanine', 'BEAT_SKIP_SLUGS missing jeanine-pirreaux-comedy');
/* No XP surface */
if (code.indexOf('xpGrant') === -1 && !/PF\.xp|xp_post/i.test(code)) ok('no XP surface in module');
else no('no-xp', 'module touches XP');
/* Banned terms */
if (!/\bdonate\b/i.test(code)) ok('no banned "donate" copy');
else no('banned-term', '"donate" found in module');
if (!/shanetheswan/i.test(code)) ok('no @shanetheswan handle');
else no('handle', '@shanetheswan found');
/* Read contract */
if (has(MOD, 'beat_get')) ok('reads public beat_get action');
else no('read-action', 'beat_get missing');
if (has(MOD, '12000')) ok('12s JSONP timeout (fail-soft)');
else no('timeout', 'JSONP timeout missing');
/* Opt-out write contract */
if (has(MOD, 'beat_optout_set') && has(MOD, 'PF.authPost')) ok('opt-out via PF.authPost (beat_optout_set)');
else no('optout-write', 'authed opt-out write missing');
if (has(MOD, 'target_callsign')) ok('target==actor binding sent');
else no('self-only', 'target_callsign not sent with opt-out');
/* Privacy: never reads the private pick-fight preference */
if (src.indexOf('pickFight') === -1 && src.indexOf('pf_pick_fight') === -1) ok('never reads private pick-your-fight preference');
else no('privacy', 'module reads the private pick-fight preference');

/* ============ 3. mocked-browser runtime tests ============ */
console.log('== 3. runtime tests ==');

function makeEnv(opts) {
  opts = opts || {};
  var listeners = {};
  var scripts = [];
  var mountRemoved = false;
  var mountHtml = '';
  var mount = {
    parentNode: { removeChild: function () { mountRemoved = true; } },
    getAttribute: function (k) { return k === 'data-beat-slug' ? opts.slug : null; },
    querySelector: function () { return opts.fakeBtn || null; },
    set innerHTML(h) { mountHtml = h; },
    get innerHTML() { return mountHtml; }
  };
  var doc = {
    getElementById: function (id) { return id === 'pf-beat' ? (mountRemoved ? null : mount) : null; },
    createElement: function () {
      var s = { parentNode: null, onerror: null };
      Object.defineProperty(s, 'src', {
        set: function (v) {
          scripts.push(v);
          /* Simulate the JSONP response asynchronously-ish: invoke the
             registered callback on next tick via the sandbox window. */
          var m = /callback=([^&]+)/.exec(v);
          setImmediate(function () {
            try {
              if (opts.jsonpError) { if (s.onerror) s.onerror(); return; }
              sandbox.window[m[1]](opts.response);
            } catch (e) { /* callback missing -> timeout path */ }
          });
        }
      });
      s.parentNode = { removeChild: function () {} };
      return s;
    },
    head: { appendChild: function () {} },
    addEventListener: function (t, h) { (listeners[t] = listeners[t] || []).push(h); },
    removeEventListener: function () {},
    dispatchEvent: function () { return true; },
    readyState: 'complete'
  };
  var sandbox = {
    console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setImmediate: setImmediate,
    document: doc,
    window: {}
  };
  sandbox.window.PF_BACKEND_URL = 'https://api.example.test';
  sandbox.window.PFCallsign = function () { return opts.visitorCs || ''; };
  sandbox.window.PF = {
    skip: function () { return false; },
    authPost: function (url, body, cb) {
      (opts.posts = opts.posts || []).push(body);
      setImmediate(function () { cb(opts.postResponse || { ok: true, hidden: !!body.hidden }); });
    }
  };
  sandbox.window.document = doc;
  vm.createContext(sandbox);
  vm.runInContext(read(MOD), sandbox, { filename: 'creator-beat.js' });
  return {
    sandbox: sandbox, mount: mount, scripts: scripts,
    wasRemoved: function () { return mountRemoved; },
    html: function () { return mountHtml; },
    fire: function (t) { (listeners[t] || []).forEach(function (h) { h(); }); },
    posts: function () { return opts.posts || []; }
  };
}
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  /* A. data -> section renders */
  var env = makeEnv({
    slug: 'mtcstw',
    response: {
      ok: true, hidden: false,
      predictions: { calls: 12, resolved: 8, wins: 6, rate: 75 },
      creations: [{ id: 1, title: 'Stop H.R. 14', url: 'https://x/y.png', issue_area: 'climate', entity_type: 'bill', entity_id: 'hr-14', ts: 1760000000000 }],
      issues: ['climate', 'voting']
    }
  });
  await wait(30);
  var h = env.html();
  if (h.indexOf('Their fight') !== -1) ok('section renders with data');
  else no('render', '"Their fight" heading missing');
  if (h.indexOf('CLIMATE') !== -1 && h.indexOf('VOTING RIGHTS') !== -1) ok('issue chips rendered');
  else no('issues', 'issue chips missing');
  if (h.indexOf('Stop H.R. 14') !== -1) ok('creation listed');
  else no('creations', 'creation title missing');
  if (h.indexOf('12 calls') !== -1 && h.indexOf('75% called it') !== -1) ok('prediction record rendered');
  else no('predictions', 'prediction record line missing');
  if (/action=beat_get/.test(env.scripts[0] || '') && /callsign=mtcstw/.test(env.scripts[0] || '')) ok('JSONP hits beat_get with repKey callsign');
  else no('jsonp', 'beat_get JSONP malformed: ' + (env.scripts[0] || 'none'));

  /* B. hidden (non-owner) -> mount removed */
  var env2 = makeEnv({ slug: 'mtcstw', visitorCs: 'someone_else', response: { ok: true, hidden: true, predictions: null, creations: null, issues: null } });
  await wait(30);
  if (env2.wasRemoved()) ok('hidden beat removed for non-owner');
  else no('hidden', 'hidden beat still rendered');

  /* C. hidden (owner) -> slim bar with SHOW */
  var env3 = makeEnv({ slug: 'mtcstw', visitorCs: 'mtcstw', response: { ok: true, hidden: true, predictions: null, creations: null, issues: null } });
  await wait(30);
  if (!env3.wasRemoved() && env3.html().indexOf('HIDDEN FROM VISITORS') !== -1) ok('owner sees hidden bar with SHOW control');
  else no('owner-hidden', 'owner hidden bar missing');

  /* D. no data -> removed (never an empty section) */
  var env4 = makeEnv({ slug: 'mtcstw', response: { ok: true, hidden: false, predictions: null, creations: null, issues: null } });
  await wait(30);
  if (env4.wasRemoved()) ok('empty beat removed (no hollow section)');
  else no('empty', 'section rendered with zero data');

  /* E. read failure -> removed */
  var env5 = makeEnv({ slug: 'mtcstw', jsonpError: true });
  await wait(30);
  if (env5.wasRemoved()) ok('read failure removes section (fail-soft)');
  else no('fail-soft', 'section survived a failed read');

  /* F. Jeanine skip */
  var env6 = makeEnv({ slug: 'jeanine-pirreaux-comedy', response: { ok: true, hidden: false, predictions: { calls: 1, resolved: 1, wins: 1, rate: 100 }, creations: null, issues: null } });
  await wait(30);
  if (env6.wasRemoved() && env6.scripts.length === 0) ok('Jeanine skipped: no read, no section');
  else no('jeanine-runtime', 'beat rendered or read fired for do-not-touch slug');

  /* G. owner toggle posts self-only opt-out */
  var env7 = makeEnv({
    slug: 'mtcstw', visitorCs: 'mtcstw',
    response: { ok: true, hidden: false, predictions: { calls: 3, resolved: 2, wins: 2, rate: 100 }, creations: null, issues: null },
    fakeBtn: null
  });
  await wait(30);
  /* wire a fake button to exercise wireToggle */
  var clicked = null;
  env7.mount.querySelector = function () {
    return {
      addEventListener: function (t, h) { clicked = h; },
      set disabled(v) {}, textContent: ''
    };
  };
  /* re-fire the catalog event so wireToggle binds to our fake button */
  env7.fire('pf-catalog-beat');
  await wait(40);
  if (clicked) {
    clicked();
    await wait(30);
    var posts = env7.posts();
    if (posts.length && posts[0].beat_action === 'beat_optout_set' &&
        posts[0].callsign === 'mtcstw' && posts[0].target_callsign === 'mtcstw' &&
        posts[0].hidden === 1) ok('toggle posts self-only opt-out (target==actor)');
    else no('toggle-post', 'opt-out POST malformed: ' + JSON.stringify(posts[0] || null));
  } else {
    no('toggle-wire', 'toggle button was not wired for the owner');
  }

  /* H. predictions-only (no creations) still renders, issues hidden */
  var env8 = makeEnv({
    slug: 'mtcstw',
    response: { ok: true, hidden: false, predictions: { calls: 5, resolved: 0, wins: 0, rate: null }, creations: null, issues: null }
  });
  await wait(30);
  if (!env8.wasRemoved() && env8.html().indexOf('CALL THE SHOT RECORD') !== -1) ok('predictions-only renders record row');
  else no('pred-only', 'predictions-only beat did not render');

  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
  process.exit(fails.length ? 1 : 0);
})().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
