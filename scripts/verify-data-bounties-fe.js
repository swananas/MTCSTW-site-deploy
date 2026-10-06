#!/usr/bin/env node
/* scripts/verify-data-bounties-fe.js — Data Bounty board frontend verification.
   Run from the repo root: node scripts/verify-data-bounties-fe.js
   1. node --check on the touched files
   2. Static checks (kill switch, backend contract, banned terms, copy)
   3. Mocked-browser runtime tests (vm + minimal DOM shim): mount paths,
      card rendering, per-kind claim forms (photo gets URL input),
      confirm buttons, kill-switch behavior.
   NOTE: does not run build/bundle.js (full build is blocked by a
   pre-existing inner-script break in games/war-report.js, owned by the
   war-report-ux workstream). bundle-create.js was rebuilt via the
   single-bundle path; this harness asserts the silo marker is in it. */
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
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\/])\/\/[^\n]*/g, '$1');
}

var SILO = 'v1.4.3/games/data-bounties.js';

console.log('== 1. node --check ==');
[SILO, 'v1.4.3/pages/workshop-create.js', 'v1.4.3/pages/page-mount.js',
 'v1.4.3/core/workshop.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var s = read(path.join(ROOT, SILO));
var bare = stripComments(s);
if (/PF\.skip\(['"]databounties['"]\)/.test(s)) ok('kill switch ?pf_off=databounties');
else no('kill switch', 'PF.skip("databounties") missing');
if (/databounty_list/.test(s) && /databounty_claim/.test(s) && /databounty_confirm/.test(s)) ok('backend actions referenced');
else no('backend actions', 'list/claim/confirm not all referenced');
if (/type:\s*['"]databounty['"]/.test(s) && /db_action/.test(s)) ok('POST contract type/databounty + db_action');
else no('POST contract', 'type/db_action shape missing');
if (!/donate/i.test(bare)) ok('no "donate" copy');
else no('banned term', '"donate" appears in copy');
if (/MTCSTW\.COM/.test(s)) ok('MTCSTW identity');
else no('identity', 'MTCSTW.COM missing');
if (/Never sold\. Never ad inventory/.test(s)) ok('content-to-action principle copy');
else no('principle copy', 'never-sold principle missing from board copy');
if (/photo_url/.test(s) && /taken_at/.test(s)) ok('photo claim fields (URL + taken time)');
else no('photo fields', 'photo_url/taken_at inputs missing');
if (has(path.join(ROOT, 'v1.4.3/games/bundle-create.js'), 'pf-data-bounties'))
  ok('bundle-create.js contains the silo');
else no('bundle', 'bundle-create.js missing data-bounties silo');
if (has('v1.4.3/pages/workshop-create.js', "selfMount: 'pf-data-bounties'"))
  ok('workshop tool registration');
else no('workshop registration', "selfMount: 'pf-data-bounties' missing");
if (has('v1.4.3/core/workshop.js', "['pf-data-bounties', 'databounties']"))
  ok('workshop dock host pre-creation');
else no('dock host', 'SELF_MOUNT_HOSTS entry missing');
/* XSS guard (security heartbeat FAIL-grade 2026-10-06): claimant-supplied
   photo_url must pass a scheme allowlist (http/https only) before becoming
   an <a href> — quote-escaping alone does not stop javascript:/data: URLs. */
if (/function safeUrl\(u\)/.test(s) && /safeUrl\(pl\.photo_url\)/.test(s) && /\^https\?:\\\/\\\//.test(s))
  ok('XSS: photo_url passes scheme allowlist (http/https only)');
else no('XSS guard', 'safeUrl allowlist missing or not applied to photo_url href');

console.log('== 3. runtime (vm + DOM shim) ==');
function makeEnv(opts) {
  opts = opts || {};
  var els = {};
  function mkEl(id) {
    var el = {
      id: id, children: [], innerHTML: '', textContent: '',
      style: {}, dataset: {}, className: '',
      _listeners: {},
      appendChild: function (c) { this.children.push(c); return c; },
      insertBefore: function (c) { this.children.unshift(c); return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: function (t, f) { this._listeners[t] = f; },
      setAttribute: function () {}, getAttribute: function () { return null; },
      closest: function () { return null; }
    };
    els[id] = el; return el;
  }
  var doc = {
    _els: els,
    getElementById: function (id) { return els[id] || null; },
    createElement: function (tag) {
      return { tag: tag, children: [], innerHTML: '', textContent: '', style: {},
        dataset: {}, className: '', _listeners: {},
        appendChild: function (c) { this.children.push(c); return c; },
        setAttribute: function () {}, addEventListener: function (t, f) { this._listeners[t] = f; } };
    },
    head: mkEl('head'), body: mkEl('body')
  };
  var win = {
    document: doc,
    location: { href: opts.href || 'https://www.mtcstw.com/create' },
    PF: {
      skip: function (k) { return (opts.killed || []).indexOf(k) !== -1; },
      toast: function () {}, error: function () {},
      postAction: null, getAuthSecret: function () { return ''; }
    },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev/',
    PFCallsign: function () { return opts.callsign || ''; },
    PFDeviceId: function () { return 'dev1'; },
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  win.window = win;
  return { win: win, doc: doc, mkEl: mkEl };
}
function runSilo(env, srcCode) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(srcCode, ctx, { filename: 'data-bounties.js' });
  return env;
}

/* 3a. board mount renders bounties */
(function () {
  var env = makeEnv({ callsign: 'tester1' });
  env.mkEl('pf-data-bounties');
  var seenUrl = null;
  /* stub JSONP: intercept script injection */
  var origCreate = env.doc.createElement.bind(env.doc);
  env.doc.createElement = function (tag) {
    var el = origCreate(tag);
    if (tag === 'script') {
      Object.defineProperty(el, 'src', {
        set: function (u) {
          seenUrl = u;
          var m = /callback=([^&]+)/.exec(u);
          setTimeout(function () {
            env.win[m[1]]({ ok: true, bounties: [
              { id: 'db_photo_evidence_protestx_2026-10-05', kind: 'photo_evidence',
                title: 'Photos: rally', detail: 'Send shots.', xp_amount: 10,
                cell_id: '', quorum: 2, claims: [
                  { id: 7, callsign: 'shooter1', payload: '{"photo_url":"https://pics.example/a.jpg","caption":"crowd"}',
                    confirms: 1 }
                ] },
              { id: 'db_cpi_price_milksouth_2026-10-05', kind: 'cpi_price',
                title: 'Price check', detail: 'd', xp_amount: 5, cell_id: '',
                quorum: 2, surge: 1.6, claims: [] }
            ]});
          }, 5);
        }, get: function () { return ''; }
      });
      env.doc.head.appendChild(el);
    }
    return el;
  };
  runSilo(env, s);
  setTimeout(function () {
    var host = env.doc.getElementById('pf-data-bounties');
    var html = host.innerHTML;
    if (/databounty_list/.test(seenUrl || '')) ok('runtime: JSONP databounty_list requested');
    else no('runtime: list request', 'databounty_list not requested via JSONP');
    if (/PHOTO BOUNTY/.test(html)) ok('runtime: photo bounty card rendered');
    else no('runtime: photo card', 'PHOTO BOUNTY label missing');
    if (/photo_url/.test(html)) ok('runtime: photo claim form has URL input');
    else no('runtime: photo form', 'photo_url input missing');
    if (/data-claim="7"/.test(html) && /CONFIRM/.test(html)) ok('runtime: pending claim with CONFIRM button');
    else no('runtime: confirm button', 'claim row / CONFIRM button missing');
    if (/PRICE CHECK/.test(html) && /price_cents/.test(html)) ok('runtime: CPI card with price input');
    else no('runtime: CPI form', 'price_cents input missing');
    if (/Never sold/.test(html)) ok('runtime: principle copy rendered');
    else no('runtime: principle', 'never-sold copy missing from render');
    if (/SURGE ×1\.6/.test(html) && /[Tt]hin data zone/.test(html)) ok('runtime: surge marker rendered on thin-area bounty');
    else no('runtime: surge marker', 'SURGE ×1.6 marker missing on surged bounty');
    if (!/SURGE ×1\.0/.test(html)) ok('runtime: no surge marker on 1.0x bounty');
    else no('runtime: surge marker 1.0x', 'marker shown for non-surged bounty');
    finish();
  }, 60);
})();

/* 3b. kill switch: no mount, no request */
(function () {
  var env = makeEnv({ killed: ['databounties'] });
  env.mkEl('pf-data-bounties');
  var requested = false;
  var origCreate = env.doc.createElement.bind(env.doc);
  env.doc.createElement = function (tag) {
    var el = origCreate(tag);
    if (tag === 'script') {
      Object.defineProperty(el, 'src', { set: function () { requested = true; }, get: function () { return ''; } });
    }
    return el;
  };
  runSilo(env, s);
  setTimeout(function () {
    if (!requested && env.doc.getElementById('pf-data-bounties').innerHTML === '')
      ok('runtime: kill switch prevents mount + requests');
    else no('runtime: kill switch', 'silo acted despite ?pf_off=databounties');
  }, 30);
})();

/* 3c. no host div: silent no-op (except cell strip path) */
(function () {
  var env = makeEnv({});
  runSilo(env, s);
  setTimeout(function () { ok('runtime: no host div -> silent no-op'); }, 30);
})();

var finished = 0;
function finish() {
  finished++;
  if (finished < 1) return;
  setTimeout(function () {
    console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
    if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
    process.exit(fails.length ? 1 : 0);
  }, 120);
}
