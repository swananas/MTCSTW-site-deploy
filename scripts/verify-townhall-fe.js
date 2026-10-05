#!/usr/bin/env node
/* scripts/verify-townhall-fe.js — Town Hall Tracker frontend verification.
   2026-10-05 (fe/events-move): REPOINTED from Political HQ to /events.
   The silo moved (mount registration + bundles); silo id, template id and
   kill switch are unchanged.
   Run from the repo root:
     node scripts/verify-townhall-fe.js
   1. node --check on the new module + page-mount.js
   2. build/bundle.js gate (townhall.js in bundle-events, in exactly one bundle,
      NOT in bundle-hq)
   3. Static checks (kill switch, /events mount contract, backend action
      contract, banned terms, esc hygiene, map-link-out, no XP surface,
      no invented data, /events cross-link)
   4. Mocked-browser runtime tests (vm): kill switch honored, template
      injected with the right id, mount contract satisfied.
   NOTE (AGENTS.md lesson): pattern checks run on the comment-stripped view
   WITHOUT string stripping — esc()'s /"/g regex contains a quote that
   unbalances naive strippers and cascades false failures.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'games', 'townhall.js');
var PM = path.join(V, 'pages', 'page-mount.js');
var PHQ = path.join(V, 'pages', 'political-hq.js');
var BUNDLEJS = path.join(ROOT, 'build', 'bundle.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('townhall.js syntax'); }
catch (e) { no('syntax', 'townhall.js node --check failed'); }
try { cp.execSync('node --check ' + PM, { stdio: 'pipe' }); ok('page-mount.js syntax'); }
catch (e) { no('syntax', 'page-mount.js node --check failed'); }

/* ============ 2. bundle gate ============ */
console.log('== 2. bundle gate ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean (uniqueness gate)');
} catch (e) { no('bundle', 'build/bundle.js failed: ' + (e && e.message)); }
var bsrc = read(BUNDLEJS);
/* anchor on the block's own closing bracket (2-space indent): the block's
   comments contain ']' (PAGE_ORDERS['pf-events']), so a naive non-greedy
   [\s\S]*?\] stops early. */
var evBlock = (bsrc.match(/'bundle-events':\s*\[([\s\S]*?)\n  \]/) || [])[1] || '';
if (/'townhall\.js'/.test(evBlock)) ok('townhall.js registered in bundle-events');
else no('bundle-reg', 'townhall.js not registered in bundle-events');
if (/'townhall\.js'/.test(bsrc.split('HQ_BUNDLES')[1] || '')) no('bundle-hq-leak', 'townhall.js still in an HQ bundle — move incomplete');
else ok('townhall.js NOT in bundle-hq (move complete)');

var src = read(MOD);
var code = stripComments(src);

/* ============ 3. static contract checks ============ */
console.log('== 3. static contract checks ==');
if (/PF\.skip\(["']townhall["']\)/.test(code)) ok('kill switch PF.skip("townhall")');
else no('kill-switch', 'PF.skip("townhall") missing');
if (/pf_off=townhall/.test(src)) ok('?pf_off=townhall documented');
else no('kill-doc', '?pf_off=townhall not documented');
if (code.indexOf('pf-ov-townhall') !== -1) ok('template id pf-ov-townhall');
else no('template-id', 'pf-ov-townhall template id missing');
['townhall_list', 'townhall_questions', 'townhall_upcoming', 'townhall_submit', 'townhall_rsvp'].forEach(function (a) {
  if (code.indexOf(a) !== -1) ok('backend action ' + a + ' wired');
  else no('action-' + a, a + ' not referenced');
});
if (/type:\s*["']townhall["']/.test(code) && code.indexOf('th_action') !== -1) ok('POST type=townhall / th_action contract');
else no('post-contract', 'townhall POST contract (type/th_action) missing');
if (code.indexOf('pf-ov-townhall') !== -1 && read(PHQ).indexOf("['townhall', 'pf-ov-townhall']") !== -1)
  no('phq-cleanup', "political-hq.js still mounts ['townhall','pf-ov-townhall'] — PHQ cleanup incomplete");
else ok('PHQ cleanup: political-hq.js has no townhall slot');
/* /events mount: the entry must live inside the pf-events PAGE_ORDERS block.
   Anchor on the order array's own closing bracket (6-space indent): inner
   entries close with ] on their own lines, so a naive non-greedy stops at
   the first entry. */
var pmSrc = read(PM);
var evOrder = (pmSrc.match(/'pf-events':\s*\{[\s\S]*?order:\s*\[([\s\S]*?)\n      \]/) || [])[1] || '';
if (evOrder.indexOf("['townhall', 'pf-ov-townhall']") !== -1)
  ok("page-mount.js PAGE_ORDERS['pf-events'] mounts pf-ov-townhall");
else no('mount', "PAGE_ORDERS['pf-events'] missing ['townhall','pf-ov-townhall']");
/* wiring-map §7.1 cross-link: town halls → protest/event map on /events */
if (code.indexOf('href="#pf-civicevents"') !== -1) ok('/events cross-link to #pf-civicevents');
else no('xlink', 'cross-link to #pf-civicevents missing (wiring-map §7.1)');
/* wiring-map §7.1 exit: AC return rail */
if (code.indexOf('href="/political-hq"') !== -1) ok('AC return rail to /political-hq');
else no('ac-return', 'AC return link missing (wiring-map §7.1)');
/* source-URL copy + field */
if (/[Uu]nverified submissions are rejected/.test(code)) ok('"unverified submissions are rejected" copy');
else no('copy-source', 'rejection copy missing');
if (/[Ss]ource URL/.test(code)) ok('source URL field present');
else no('source-field', 'source URL field missing');
/* map link out, never embedded */
if (code.indexOf('google.com/maps/search') !== -1) ok('map link-out (Google Maps search URL)');
else no('map-link', 'Google Maps link-out missing');
if (/<iframe/i.test(code)) no('map-embed', 'iframe found — maps must link out, never embed');
else ok('no iframe embeds');
/* no XP surface */
if (/xpGrant|\+25 XP|\+50 XP|XP reward/i.test(code)) no('xp-surface', 'XP grant or XP copy found — zero XP by design');
else ok('no XP surface');
/* no invented data: the module must not hardcode town hall events */
if (/\bevent_at\b[^:]*:\s*\d{13}/.test(code)) no('invented-data', 'hardcoded event timestamp found');
else ok('no hardcoded events');
if (/lorem|example\.com\/townhall/i.test(code)) no('invented-data', 'placeholder event data found');
else ok('no placeholder event data');
/* esc hygiene on rendered fields */
['esc(h.title)', 'esc(h.legislator_name', 'esc(it.text)'].forEach(function (e) {
  if (code.indexOf(e) !== -1) ok('escapes ' + e);
  else no('esc-' + e, e + ' not escaped at render');
});
/* fail-soft: backend-down path */
if (/Schedule unavailable/.test(code)) ok('fail-soft list error path');
else no('fail-soft', 'no backend-down error path');

console.log('== 4. mocked-browser runtime ==');
function runOuter(skipTownhall) {
  var inserted = [];
  var sandbox = {
    window: {},
    document: { readyState: 'complete', addEventListener: function () {} }
  };
  sandbox.window.PF = {
    skip: function (s) { return skipTownhall && s === 'townhall'; },
    holder: function () {
      return { insertAdjacentHTML: function (pos, html) { inserted.push({ pos: pos, html: html }); } };
    },
    error: function () {}
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'townhall.js' });
  return inserted;
}
try {
  var ins = runOuter(false);
  if (ins.length === 1 && ins[0].html.indexOf('id="pf-ov-townhall"') !== -1)
    ok('outer IIFE injects pf-ov-townhall template');
  else no('inject', 'expected 1 template injection with pf-ov-townhall id, got ' + ins.length);
} catch (e) { no('inject', 'vm threw: ' + (e && e.message)); }
try {
  var ins2 = runOuter(true);
  if (ins2.length === 0) ok('kill switch honored (no injection when skipped)');
  else no('kill-runtime', 'template injected despite PF.skip("townhall")');
} catch (e) { no('kill-runtime', 'vm threw: ' + (e && e.message)); }
/* the injected template carries the inner script with the list loader */
try {
  var ins3 = runOuter(false);
  var html = ins3.length ? ins3[0].html : '';
  if (html.indexOf('xTownhall') !== -1 && html.indexOf('townhall_list') !== -1)
    ok('injected template carries mount div + list loader');
  else no('template-body', 'template missing xTownhall mount or list loader');
} catch (e) { no('template-body', 'vm threw: ' + (e && e.message)); }

/* ============ 5. inner-script parse + functional smoke ============ */
console.log('== 5. inner widget script ==');
var innerM = src.match(/<script>([\s\S]*?)<\/`\+\s*"script"\s*\+\s*`>/);
if (!innerM) { no('inner-extract', 'could not extract inner <script> from template'); }
else {
  var innerSrc = innerM[1];
  try {
    fs.writeFileSync(path.join(__dirname, '.tmp-th-inner.js'), innerSrc);
    cp.execSync('node --check ' + path.join(__dirname, '.tmp-th-inner.js'), { stdio: 'pipe' });
    ok('inner widget script parses (node --check)');
  } catch (e) { no('inner-syntax', 'inner script node --check failed'); }
  try { fs.unlinkSync(path.join(__dirname, '.tmp-th-inner.js')); } catch (e) {}
  /* Compact functional smoke: mocked DOM + fake backend. */
  try {
    var HALL = { id: 'th-x1', legislator_name: 'Test Rep', bioguide_id: 'T1',
      title: 'Hall night', event_at: Date.now() + 86400000, venue: 'Civic Hall',
      city: 'Baton Rouge', state: 'LA', source_url: 'https://example.com/s', rsvp_count: 2 };
    var postedBodies = [];
    function fakeResp(action) {
      if (action === 'townhall_list') return { ok: true, halls: [HALL] };
      if (action === 'townhall_upcoming') return { ok: true, halls: [HALL] };
      if (action === 'townhall_questions') return { ok: true, legislator: 'Test Rep', vote_count: 1,
        questions: [{ text: 'Q1 voted YES', citation: { bill_id: 'H.R.22', source_url: 'https://clerk.house.gov/Votes/2025102' } }] };
      return { ok: false };
    }
    function mkEl(tag) {
      var el = { tagName: tag, _html: '', children: [], style: {}, handlers: {}, _kids: null,
        set innerHTML(v) { this._html = String(v); this._kids = null; },
        get innerHTML() { return this._html; },
        setAttribute: function () {}, remove: function () {},
        appendChild: function (c) { this.children.push(c); return c; },
        addEventListener: function (t, f) { this.handlers[t] = f; },
        querySelector: function (sel) {
          if (!this._kids) this._kids = {};
          if (!this._kids[sel]) this._kids[sel] = mkEl('div');
          return this._kids[sel];
        },
        querySelectorAll: function (sel) {
          var out = [], re = sel === '[data-thq]' ? /data-thq="([^"]+)"/g
            : sel === '[data-thr]' ? /data-thr="([^"]+)"/g : null;
          if (!re) return [];
          /* clicks registry lives on the element: the widget queries its
             own fresh mock array, the test queries another — both must
             observe the same handlers. */
          if (!this._clicks) this._clicks = { q: [], r: [] };
          var self = this;
          var bucket = sel === '[data-thq]' ? this._clicks.q : this._clicks.r;
          var mm;
          while ((mm = re.exec(this._html))) {
            (function (id) {
              out.push({ getAttribute: function () { return id; },
                addEventListener: function (t, f) { bucket.push(f); } });
            })(mm[1]);
          }
          out._clicks = bucket;
          out._all = self._clicks;
          return out;
        }
      };
      return el;
    }
    var sroot = mkEl('div');
    var byId = {};
    var sbox = {
      window: {},
      setTimeout: function () { return 0; }, clearTimeout: function () {},
      document: {
        readyState: 'complete', addEventListener: function () {},
        getElementById: function (id) {
          if (id === 'xTownhall') return sroot;
          if (!byId[id]) byId[id] = mkEl('div');
          return byId[id];
        },
        createElement: function (t) {
          var el = mkEl(t);
          if (t === 'script') {
            Object.defineProperty(el, 'src', { set: function (v) {
              var qm = String(v).match(/[?&]action=([^&]+)/);
              var cm = String(v).match(/[?&]callback=([^&]+)/);
              if (cm && sbox.window[cm[1]]) sbox.window[cm[1]](fakeResp(qm ? decodeURIComponent(qm[1]) : ''));
            }, get: function () { return ''; } });
          }
          return el;
        },
        head: { appendChild: function () {} }, body: { appendChild: function () {} }
      }
    };
    sbox.window.PF_BACKEND_URL = 'https://api.test';
    sbox.window.PF = { authPost: function (u, b, cb) { postedBodies.push(b); cb({ ok: true, rsvps: 3 }); },
      toast: function () {} };
    sbox.PF = sbox.window.PF;
    sbox.window.PFCallsign = function () { return 'tester'; };
    sbox.window.PFDeviceId = function () { return 'd1'; };
    sbox.window.window = sbox.window;
    vm.createContext(sbox);
    vm.runInContext(innerSrc, sbox, { filename: 'th-inner-verify.js' });
    var lh = sroot.querySelector('#thList').innerHTML;
    if (lh.indexOf('Hall night') !== -1 && lh.indexOf('2 GOING') !== -1) ok('smoke: list renders hall + RSVP count');
    else no('smoke-list', 'list did not render hall');
    if (lh.indexOf('google.com/maps/search') !== -1 && lh.indexOf('target="_blank"') !== -1) ok('smoke: map link-out');
    else no('smoke-map', 'map link-out missing');
    var qbtns = sroot.querySelector('#thList').querySelectorAll('[data-thq]');
    if (qbtns._all && qbtns._all.q.length) {
      qbtns._all.q[0]();
      var qh = byId['thq-th-x1'] ? byId['thq-th-x1'].innerHTML : '';
      if (qh.indexOf('Q1 voted YES') !== -1 && qh.indexOf('clerk.house.gov/Votes/2025102') !== -1)
        ok('smoke: question kit renders with cited source');
      else no('smoke-questions', 'question kit did not render');
    } else no('smoke-qbtn', 'no question-kit button found');
    var rbtns = sroot.querySelector('#thList').querySelectorAll('[data-thr]');
    if (rbtns._all && rbtns._all.r.length) {
      rbtns._all.r[0]();
      var last = postedBodies[postedBodies.length - 1];
      if (last && last.type === 'townhall' && last.th_action === 'townhall_rsvp' && last.callsign === 'tester')
        ok('smoke: RSVP posts townhall contract with callsign');
      else no('smoke-rsvp', 'RSVP post contract wrong: ' + JSON.stringify(last));
    } else no('smoke-rbtn', 'no RSVP button found');
  } catch (e) { no('smoke', 'functional smoke threw: ' + (e && e.message)); }
}

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { fails.forEach(function (f) { console.log('FAIL: ' + f); }); process.exit(1); }
