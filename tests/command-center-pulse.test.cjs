/* Stub-render harness for the Command Center LIVE PULSE (CEO directive
   2026-10-12 18:13): NOW panel + EVENT STREAM + 30s overview poll +
   1s relative-time ticker, all riding OV.org.pulse.
   The fixture (tests/fixtures/cc-pulse-live-sample.json) is a trimmed
   copy of the REAL pulse read back from the stored production org
   snapshot (cc_snapshots, 2026-10-12 23:17 UTC) — the exact stored
   shape the sync writes, not an invented one.
   Run: node tests/command-center-pulse.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cc-pulse-live-sample.json'), 'utf8'));
var page = fs.readFileSync(path.join(ROOT, 'site', 'command-center', 'index.html'), 'utf8');
var m = page.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('FAIL: no script block found'); process.exit(1); }
var src = m[1];

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function escT(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---- fake clock: starts 125s after the fixture was generated ---- */
var RealDate = Date;
var fakeNow = FIX.generated_at + 125000;
function FakeDate() {
  if (arguments.length === 0) return new RealDate(fakeNow);
  var a = Array.prototype.slice.call(arguments);
  return new (Function.prototype.bind.apply(RealDate, [null].concat(a)))();
}
FakeDate.now = function () { return fakeNow; };
FakeDate.parse = RealDate.parse;
FakeDate.UTC = RealDate.UTC;
FakeDate.prototype = RealDate.prototype;
function ageExpect(ts) {
  var s = Math.max(0, Math.round((fakeNow - Number(ts || 0)) / 1000));
  if (!ts) return 'never';
  if (s < 90) return s + 's ago';
  if (s < 5400) return Math.round(s / 60) + 'm ago';
  if (s < 172800) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}

/* ---- DOM stub: elements by id; data-ts spans parsed from innerHTML,
        cached per element so the ticker's writes are observable ---- */
var els = {};
function makeEl(id) {
  var el = { id: id, textContent: '', className: '', disabled: false, style: {}, _attrs: {}, _spans: null, _html: '' };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); this._spans = null; }
  });
  el.setAttribute = function (k, v) { this._attrs[k] = v; };
  el.getAttribute = function (k) { return this._attrs[k] == null ? null : this._attrs[k]; };
  return el;
}
var doc = {
  getElementById: function (id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll: function (sel) {
    if (sel !== '[data-ts]') return [];
    var out = [];
    Object.keys(els).forEach(function (id) {
      var el = els[id];
      if (el._spans === null) {
        el._spans = [];
        var re = /data-ts="(\d+)"/g, mm;
        while ((mm = re.exec(el._html))) {
          (function (ts) {
            el._spans.push({ textContent: '', getAttribute: function (n) { return n === 'data-ts' ? String(ts) : null; } });
          })(Number(mm[1]));
        }
      }
      out = out.concat(el._spans);
    });
    return out;
  }
};

/* ---- overview fixture in the exact cc_overview section shape ---- */
var OVFIX = {
  ok: true,
  generated_at: FIX.generated_at + 120000,
  org: {
    ok: true, synced_at: FIX.generated_at + 120000, age_s: 5,
    counts: { active: FIX.counts.active_now, complete: 162, blocked: FIX.counts.blocked },
    workers_active: [], workers_blocked: [], recent_complete: [],
    anomalies: { open: 0, latest: [] },
    state_updated_human: '2026-10-12 18:17 CDT',
    pulse: FIX
  }
};
function fetchStub(url) {
  var action = '';
  var mm = String(url).match(/[?&]action=([a-z_]+)/);
  if (mm) action = mm[1];
  var body = action === 'cc_overview' ? OVFIX : { ok: false };
  return Promise.resolve({ json: function () { return Promise.resolve(body); } });
}

var intervals = [];
var sandbox = {
  console: console,
  document: doc,
  navigator: {},
  fetch: fetchStub,
  URLSearchParams: URLSearchParams,
  URL: URL,
  atob: atob,
  btoa: btoa,
  Date: FakeDate,
  setInterval: function (fn, ms) { intervals.push({ fn: fn, ms: ms }); return intervals.length; },
  clearInterval: function () {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  location: { reload: function () {} }
};
sandbox.window = { PublicKeyCredential: undefined, location: sandbox.location, _twStatus: null };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

(async function main() {
  var threw = null;
  try { vm.runInContext(src, sandbox, { filename: 'command-center-inline.js' }); } catch (e) { threw = e; }
  ok('page script loads without throwing', !threw, threw && threw.message);
  await new Promise(function (r) { setTimeout(r, 10); }); /* boot() settle */

  threw = null;
  try { await sandbox.openWall(); } catch (e) { threw = e; }
  ok('openWall renders against the fixture overview', !threw, threw && threw.message);
  ok('wall is shown', els.wall && els.wall.style.display === '');

  var nowHtml = els['p-now'] ? els['p-now'].innerHTML : '';
  var streamHtml = els['p-stream'] ? els['p-stream'].innerHTML : '';
  ok('NOW counts: working now = ' + FIX.counts.active_now, nowHtml.indexOf('>' + FIX.counts.active_now + '<') >= 0);
  ok('NOW counts: done today = ' + FIX.counts.completed_today, nowHtml.indexOf('>' + FIX.counts.completed_today + '<') >= 0 && nowHtml.indexOf('done today') >= 0);
  ok('NOW counts: blocked = ' + FIX.counts.blocked, nowHtml.indexOf('>' + FIX.counts.blocked + '<') >= 0);
  var freshRow = FIX.active_now.filter(function (w) { return !w.quiet; })[0];
  var quietRow = FIX.active_now.filter(function (w) { return w.quiet; })[0];
  ok('NOW lists a fresh worker (' + freshRow.id + ') with a live tag',
    nowHtml.indexOf(escT(freshRow.id)) >= 0 && nowHtml.indexOf('tag grn') >= 0);
  ok('NOW marks the quiet worker (' + quietRow.id + ') quiet, aged, with no-update age',
    nowHtml.indexOf(escT(quietRow.id)) >= 0 && nowHtml.indexOf('quiet') >= 0 && nowHtml.indexOf('no update in') >= 0 && nowHtml.indexOf('opacity:.45') >= 0);
  ok('NOW never headlines the cumulative registry total', nowHtml.indexOf('243') < 0);

  ok('STREAM renders every fixture event', FIX.events.every(function (e) { return streamHtml.indexOf(escT(e.text)) >= 0; }));
  var i0 = streamHtml.indexOf(escT(FIX.events[0].text));
  var i1 = streamHtml.indexOf(escT(FIX.events[1].text));
  ok('STREAM is newest-first', i0 >= 0 && i1 > i0);
  ok('STREAM carries the deploy-guard verdict', streamHtml.indexOf('Deploy guard PASS') >= 0);
  ok('STREAM carries the sync-failure anomaly (the pipe confesses)', streamHtml.indexOf('State sync failed') >= 0);

  var ms = intervals.map(function (i) { return i.ms; });
  ok('overview auto-poll is 30s', ms.indexOf(30000) >= 0, 'intervals=' + ms.join(','));
  ok('relative-time ticker is 1s', ms.indexOf(1000) >= 0);

  /* Ticker: advance the clock 1h; relative times and the LIVE line move. */
  var spansBefore = doc.querySelectorAll('[data-ts]');
  var target = spansBefore.filter(function (s) { return Number(s.getAttribute('data-ts')) === FIX.events[0].ts; })[0];
  fakeNow += 3600000;
  intervals.filter(function (i) { return i.ms === 1000; }).forEach(function (i) { i.fn(); });
  ok('ticker re-ages event timestamps', !!target && target.textContent === ageExpect(FIX.events[0].ts),
    target && ('got "' + target.textContent + '" want "' + ageExpect(FIX.events[0].ts) + '"'));
  ok('LIVE line re-ages', els.pulseLive && els.pulseLive.textContent === 'LIVE · updated ' + ageExpect(FIX.generated_at),
    els.pulseLive && els.pulseLive.textContent);

  /* Escaping: a hostile task string can never inject markup. */
  var FIX2 = JSON.parse(JSON.stringify(FIX));
  FIX2.active_now = [{ id: 'evil-1', task: 'x <script>alert(1)</script>', department: 'QA', updated_at: Math.floor(FIX.generated_at / 1000), age_seconds: 30, quiet: false }];
  sandbox.OV = { ok: true, generated_at: fakeNow, org: { ok: true, pulse: FIX2 } };
  sandbox.renderAll();
  var evilHtml = els['p-now'].innerHTML;
  ok('task text is escaped in NOW rows', evilHtml.indexOf('&lt;script&gt;') >= 0 && evilHtml.indexOf('<script>alert') < 0);

  /* No pulse yet (older snapshot): honest placeholder, no fake data. */
  sandbox.OV = { ok: true, generated_at: fakeNow, org: { ok: true } };
  sandbox.renderAll();
  ok('missing pulse renders the honest placeholder',
    els['p-now'].innerHTML.indexOf('Pulse arrives with the next state sync') >= 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
