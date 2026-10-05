#!/usr/bin/env node
/* scripts/verify-civic-events-fe.js — Protest & Event Map frontend verification.
   2026-10-05 (fe/events-move): REPOINTED from Political HQ to /events.
   The silo moved (mount registration + lazy map chunk bundle-events-map.js);
   silo id, template id and kill switch are unchanged.
   Run from the repo root:
     node scripts/verify-civic-events-fe.js
   0. rebuild game bundles (bundle-events-map.js carries the module)
   1. node --check on the new module + page-mount.js
   2. Static checks (kill switch, template id, map approach, privacy, copy,
      lazy-chunk contract, no tile-map SDK)
   3. Mocked-browser runtime tests (vm): outer module template injection +
      kill switch; inner script list/detail/RSVP/submit flows against canned
      backend responses.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'games', 'civic-events.js');
var PM = path.join(V, 'pages', 'page-mount.js');
var PHQ = path.join(V, 'pages', 'political-hq.js');
var BUNDLEMAP = path.join(V, 'games', 'bundle-events-map.js');
var BUNDLEHQ = path.join(V, 'games', 'bundle-hq.js');
var LOADER = path.join(ROOT, 'loader', 'footer_v144_final.html');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
/* AGENTS.md lesson: strip comments only — never strip string literals
   (regex literals like /"/g unbalance naive strippers and cascade false
   failures). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild game bundles (carries the new module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('civic-events.js syntax'); }
catch (e) { no('syntax', 'node --check failed on civic-events.js'); }
try { cp.execSync('node --check ' + PM, { stdio: 'pipe' }); ok('page-mount.js syntax'); }
catch (e) { no('syntax', 'node --check failed on page-mount.js'); }

var src = read(MOD);
var code = stripComments(src);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
if (/PF\.skip\(["']civicevents["']\)/.test(src)) ok('kill switch PF.skip("civicevents") wired');
else no('kill switch', 'PF.skip("civicevents") missing');
if (src.indexOf('?pf_off=civicevents') !== -1) ok('?pf_off=civicevents documented');
else no('kill doc', '?pf_off=civicevents not documented');
if (src.indexOf('id="pf-ov-civicevents"') !== -1) ok('template id pf-ov-civicevents present');
else no('template id', 'pf-ov-civicevents missing');
if (src.indexOf('id="xCivicEvents"') !== -1) ok('mount div #xCivicEvents present');
else no('mount div', '#xCivicEvents missing');
/* Map approach: no heavy SDK, OSM link-out. */
['leaflet', 'mapbox', 'openlayers', 'googleapis.com/maps'].forEach(function (sdk) {
  if (code.toLowerCase().indexOf(sdk) !== -1) no('map sdk', 'heavy map SDK leaked in: ' + sdk);
});
if (code.indexOf('openstreetmap.org') !== -1) ok('OpenStreetMap link-out approach (no map SDK)');
else no('map approach', 'no openstreetmap.org link found');
/* Privacy rails. */
if (code.indexOf('attendees') === -1) ok('no attendee-list rendering');
else no('privacy', '"attendees" appears in code');
if (code.indexOf('rsvp_count') !== -1) ok('RSVP surfaced as counts only');
else no('privacy', 'rsvp_count not rendered');
if (code.indexOf('No live tracking') !== -1) ok('no-live-tracking copy present');
else no('privacy copy', 'no-live-tracking copy missing');
/* Submit rails: source required + rejection warning. */
if (code.indexOf('source link is required') !== -1 || code.indexOf('Source URL (required)') !== -1) ok('source-URL-required copy present');
else no('submit copy', 'source required copy missing');
if (code.indexOf('rejected') !== -1) ok('rejection warning copy present');
else no('submit copy', 'rejection warning copy missing');
if (code.indexOf('home address') !== -1) ok('no-home-addresses warning present');
else no('submit copy', 'home address warning missing');
/* Banned term. */
if (code.toLowerCase().indexOf('donate') === -1) ok('banned term "donate" absent');
else no('banned term', '"donate" appears in copy');
/* Backend contract: action names match be/civic-events. */
['civicevent_list', 'civicevent_submit', 'civicevent_rsvp', 'civicevent_unrsvp',
 'civicevent_rsvp_status', 'carpool_offer', 'carpool_list'].forEach(function (a) {
  if (code.indexOf(a) !== -1) ok('backend action wired: ' + a);
  else no('backend contract', a + ' not referenced');
});
if (code.indexOf("cv_action") !== -1) ok('dispatch key cv_action used');
else no('backend contract', 'cv_action missing');
/* /events mount + lazy-chunk contract + PHQ cleanup. */
var pm = read(PM);
var evOrder = (pm.match(/'pf-events':\s*\{[\s\S]*?order:\s*\[([\s\S]*?)\n      \]/) || [])[1] || '';
if (evOrder.indexOf("['civicevents', 'pf-ov-civicevents', 'games/bundle-events-map.js']") !== -1)
  ok("page-mount PAGE_ORDERS['pf-events'] mounts civicevents as a LAZY entry");
else no('events mount', "lazy ORDER entry missing in page-mount.js (['civicevents','pf-ov-civicevents','games/bundle-events-map.js'])");
var phq = read(PHQ);
if (phq.indexOf('civicevents') === -1 && phq.indexOf('pf-ov-civicevents') === -1)
  ok('PHQ cleanup: political-hq.js has no civicevents slot');
else no('phq-cleanup', 'political-hq.js still references civicevents — cleanup incomplete');
/* Lazy-anchor machinery in page-mount. */
if (pm.indexOf('data-lazy-silo') !== -1 && pm.indexOf('pf-sec-anchor') !== -1)
  ok('page-mount injects pf-sec-anchor[data-bundle] placeholder for lazy entries');
else no('lazy-anchor', 'lazy anchor injection missing in page-mount.js');
if (pm.indexOf('data-pf-mounted') !== -1) ok('page-mount replaces the anchor on real mount (no orphaned skeletons)');
else no('anchor-replace', 'anchor replacement on mount missing');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
/* anchor on each block's own closing bracket (2-space indent): comments in
   the blocks contain ']' (e.g. PAGE_ORDERS['pf-events']), so a naive
   non-greedy [\s\S]*?\] stops early. */
var mapBlock = (bsrc.match(/'bundle-events-map':\s*\[([\s\S]*?)\n  \]/) || [])[1] || '';
if (/'civic-events\.js'/.test(mapBlock)) ok('civic-events.js registered in the LAZY bundle-events-map chunk');
else no('lazy-bundle-reg', 'civic-events.js not registered in bundle-events-map');
var evBlock = (bsrc.match(/'bundle-events':\s*\[([\s\S]*?)\n  \]/) || [])[1] || '';
if (/'civic-events\.js'/.test(evBlock)) no('eager-leak', 'civic-events.js in eager bundle-events — must be lazy-only');
else ok('civic-events.js NOT in eager bundle-events (lazy-only)');
if (read(BUNDLEHQ).indexOf('civic-events') !== -1) no('bundle-hq-leak', 'bundle-hq.js still carries civic-events — move incomplete');
else ok('bundle-hq.js clean (no civic-events)');
var mapBundle = read(BUNDLEMAP);
if (mapBundle.indexOf('pf-ov-civicevents') !== -1) ok('bundle-events-map.js carries the module');
else no('map-bundle', 'bundle-events-map.js missing the module after rebuild');
/* Loader: jsLazy must see the /events anchor; loadBundle must remount dedicated pages. */
var loader = read(LOADER);
if (/getElementById\('pf-events'\)/.test(loader) && /pf-v2'\)\s*\|\|\s*document\.getElementById\('pf-events'\)/.test(loader))
  ok('loader jsLazy() observes #pf-events anchors');
else no('loader-lazy', 'jsLazy() does not scan #pf-events');
if (/PF\.mountPageSilos/.test(loader)) ok('loader loadBundle() remounts dedicated pages (PF.mountPageSilos)');
else no('loader-remount', 'loadBundle() missing PF.mountPageSilos call');
/* wiring-map §7.2 cross-link: protest map → town halls on /events */
if (code.indexOf('href="#pf-townhall"') !== -1) ok('/events cross-link to #pf-townhall');
else no('xlink', 'cross-link to #pf-townhall missing (wiring-map §7.2)');
/* wiring-map §7.2 exit: AC return rail */
if (code.indexOf('href="/political-hq"') !== -1) ok('AC return rail to /political-hq');
else no('ac-return', 'AC return link missing (wiring-map §7.2)');

/* ============ 3. runtime tests (vm, mocked DOM) ============ */
console.log('== 3. runtime tests ==');
function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', style: {},
    parentNode: null,
    _attrs: {}, _listeners: {},
    setAttribute: function (k, v) { this._attrs[k] = v; },
    getAttribute: function (k) { return this._attrs[k]; },
    addEventListener: function (t, fn) { this._listeners[t] = fn; },
    remove: function () {}
  };
}
/* --- 3a. outer module: template injection + kill switch --- */
var captured = null;
function runOuter(skip) {
  captured = null;
  var sandbox = {
    window: {},
    PF: {
      skip: function () { return skip; },
      holder: function () {
        return { insertAdjacentHTML: function (pos, html) { captured = html; } };
      }
    },
    console: console
  };
  sandbox.window.PF = sandbox.PF;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'civic-events.js' });
}
runOuter(false);
if (captured && captured.indexOf('pf-ov-civicevents') !== -1) ok('outer: template injected into holder');
else no('outer inject', 'template not injected');
if (captured && captured.indexOf('xCivicEvents') !== -1) ok('outer: mount div in template');
else no('outer inject', 'mount div missing from template');
runOuter(true);
if (captured === null) ok('outer: kill switch suppresses injection');
else no('outer kill', 'template injected despite PF.skip()=true');

/* --- 3b. inner script flows --- */
var tplMatch = (function () {
  runOuter(false);
  return captured;
})();
var innerSrc = (function () {
  /* 2026-10-05 (fe/events-move): at RUNTIME the injected template carries a
     literal </script> (the source file splits it as </scr`+`ipt> so the outer
     template literal never sees one — the backticks terminate/restart the
     literal and the '+' concatenates at runtime). Extract against the runtime
     string. The original extractor failed because its character class was
     written [\\s\\S] (literal backslashes — never matches whitespace). */
  var m = tplMatch.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
})();
if (!innerSrc) { no('inner extract', 'could not extract inner script'); }
else {
  var NOW = Date.now();
  var ev1 = { id: 'ev_1', type: 'rally', title: 'Test Rally', starts_at: NOW + 86400000,
    venue: 'Lafayette Square', city: 'New Orleans', state: 'LA', lat: 29.95, lng: -90.07,
    source_url: 'https://example.org/r1', submitted_by_callsign: 'somecomrade', rsvp_count: 5 };
  var ev2 = { id: 'ev_2', type: 'hearing', title: 'Hearing Watch', starts_at: NOW + 2 * 86400000,
    venue: 'City Hall', city: 'Baton Rouge', state: 'LA', lat: null, lng: null,
    source_url: 'https://example.org/h1', submitted_by_callsign: 'othercomrade', rsvp_count: 2 };
  var cannedList = { ok: true, events: [ev1, ev2] };

  function cannedFor(action, params) {
    if (action === 'civicevent_list') {
      if (params.id === 'ev_1') return { ok: true, events: [ev1] };
      if (params.id === 'ev_2') return { ok: true, events: [ev2] };
      if (params.state === 'XX') return { ok: false, err: 'bad state' };
      return cannedList;
    }
    if (action === 'carpool_list')
      return { ok: true, event_id: params.event_id, offers: [
        { id: 'cp_1', driver: 'driver_one', seats: 3, depart_city: 'Baton Rouge',
          contact: 'DM me on Discord', created_at: NOW }
      ] };
    return { ok: false, err: 'unknown' };
  }

  function runInner(backendUrl, callsign) {
    var els = {};
    ['xCivicEvents', 'ce-list', 'ce-rsvp', 'ce-carpools', 'ce-offer-form', 'ce-s-err',
     'ce-s-type', 'ce-s-title', 'ce-s-when', 'ce-s-venue', 'ce-s-city', 'ce-s-state',
     'ce-s-lat', 'ce-s-lng', 'ce-s-src', 'ce-f-state', 'ce-f-type',
     'ce-o-seats', 'ce-o-city', 'ce-o-contact', 'ce-o-show'].forEach(function (id) {
      els[id] = makeEl();
    });
    var postCalls = [];
    var postResponder = function (body) {
      postCalls.push(body);
      var a = body.cv_action;
      if (a === 'civicevent_rsvp_status') return { ok: true, rsvp: false };
      if (a === 'civicevent_rsvp') return { ok: true, rsvp: true, rsvp_count: 6 };
      if (a === 'civicevent_unrsvp') return { ok: true, rsvp: false, rsvp_count: 5 };
      if (a === 'civicevent_submit') return { ok: true, event_id: 'ev_new', status: 'pending' };
      if (a === 'carpool_offer') return { ok: true, offer_id: 'cp_9' };
      return { ok: false, err: 'unknown' };
    };
    var win = {
      PF_BACKEND_URL: backendUrl,
      PFCallsign: function () { return callsign || ''; },
      PFDeviceId: function () { return 'dev_tester'; },
      PF: {
        authPost: function (url, body, cb) { cb(postResponder(body)); },
        gateHTML: function (m) { return '<div class="c-gate">' + m + '</div>'; },
        toast: function () {},
        error: function () {}
      }
    };
    var doc = {
      getElementById: function (id) { return els[id] || null; },
      createElement: function (tag) {
        if (tag === 'script') {
          var s = makeEl();
          Object.defineProperty(s, 'src', {
            set: function (v) {
              var m = /[?&]action=([^&]+)/.exec(v || '');
              var action = m ? decodeURIComponent(m[1]) : '';
              var params = {};
              (v || '').split(/[?&]/).forEach(function (pair) {
                var kv = pair.split('=');
                if (kv[0] && kv[0] !== 'action' && kv[0] !== 'callback')
                  params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
              });
              var cm = /[?&]callback=([^&]+)/.exec(v || '');
              var fn = cm ? decodeURIComponent(cm[1]) : '';
              if (fn && win[fn]) win[fn](cannedFor(action, params));
            }
          });
          s.onerror = null;
          return s;
        }
        return makeEl();
      },
      head: { appendChild: function () {} },
      body: { appendChild: function () {} }
    };
    var sandbox = { window: win, document: doc, console: console,
      setTimeout: setTimeout, clearTimeout: clearTimeout, fetch: function () {} };
    sandbox.window.window = win;
    /* Browser parity: window.PF makes PF a global — mirror that here. */
    sandbox.PF = win.PF;
    sandbox.PFCallsign = win.PFCallsign;
    sandbox.PFDeviceId = win.PFDeviceId;
    sandbox.PF_BACKEND_URL = win.PF_BACKEND_URL;
    vm.createContext(sandbox);
    vm.runInContext(innerSrc, sandbox, { filename: 'civic-events-inner.js' });
    return { els: els, postCalls: postCalls, win: win };
  }
  function fakeClick(els, ce, id, extra) {
    var btn = makeEl();
    btn.getAttribute = function (k) {
      if (k === 'data-ce') return ce;
      if (k === 'data-id') return id || null;
      if (k === 'data-on') return (extra && extra.on) || '0';
      return null;
    };
    var h = els.xCivicEvents._listeners.click;
    if (h) h({ target: { closest: function () { return btn; } } });
  }

  /* list renders */
  var t = runInner('https://backend.test', 'tester1');
  var listHTML = t.els['ce-list'].innerHTML;
  if (listHTML.indexOf('Test Rally') !== -1 && listHTML.indexOf('Hearing Watch') !== -1)
    ok('runtime: list renders events');
  else no('runtime list', 'event titles missing');
  if (listHTML.indexOf('openstreetmap.org') !== -1) ok('runtime: View-map links present');
  else no('runtime map', 'no OSM links in list');
  if (listHTML.indexOf('5 going') !== -1) ok('runtime: RSVP counts rendered');
  else no('runtime counts', 'rsvp counts missing');
  if (t.els.xCivicEvents.innerHTML.indexOf('ce-f-state') !== -1) ok('runtime: state/type filters rendered');
  else no('runtime filters', 'filter selects missing');
  /* filter change refires list */
  t.els['ce-f-state'].value = 'LA';
  var ch = t.els.xCivicEvents._listeners.change;
  if (ch) { ch({ target: t.els['ce-f-state'] }); ok('runtime: filter change re-renders'); }
  else no('runtime filters', 'no change listener');

  /* detail view */
  fakeClick(t.els, 'detail', 'ev_1');
  var detHTML = t.els.xCivicEvents.innerHTML;
  if (detHTML.indexOf('Test Rally') !== -1 && detHTML.indexOf('Source link') !== -1)
    ok('runtime: detail renders with source link');
  else no('runtime detail', 'detail missing title/source');
  if (detHTML.indexOf('openstreetmap.org/?mlat=29.95') !== -1) ok('runtime: coordinate map link correct');
  else no('runtime detail map', 'coordinate OSM link wrong');
  if (detHTML.indexOf('RIDE BOARD') !== -1) ok('runtime: carpool board section present');
  else no('runtime carpool', 'ride board missing');
  if (t.els['ce-carpools'].innerHTML.indexOf('driver_one') !== -1) ok('runtime: carpool offers listed');
  else no('runtime carpool', 'offers not listed');
  var rsvpHTML = t.els['ce-rsvp'].innerHTML;
  if (rsvpHTML.indexOf('RSVP') !== -1) ok('runtime: RSVP button rendered for callsign holder');
  else no('runtime rsvp', 'RSVP button missing');
  /* RSVP toggle posts the right action */
  var before = t.postCalls.length;
  fakeClick(t.els, 'rsvp', 'ev_1', { on: '0' });
  var rsvpCall = t.postCalls.slice(before).filter(function (c) { return c.cv_action === 'civicevent_rsvp'; })[0];
  if (rsvpCall && rsvpCall.type === 'civic' && rsvpCall.event_id === 'ev_1') ok('runtime: RSVP posts civicevent_rsvp');
  else no('runtime rsvp', 'RSVP did not post civicevent_rsvp');
  if (t.els['ce-rsvp'].innerHTML.indexOf('6 going') !== -1) ok('runtime: RSVP count updates in place');
  else no('runtime rsvp', 'count did not update');

  /* submit view: source required */
  fakeClick(t.els, 'submit-view');
  if (t.els.xCivicEvents.innerHTML.indexOf('Source URL (required)') !== -1) ok('runtime: submit form renders');
  else no('runtime submit', 'submit form missing');
  var submitPosts = function () {
    return t.postCalls.filter(function (c) { return c.cv_action === 'civicevent_submit'; }).length;
  };
  var n0 = submitPosts();
  t.els['ce-s-src'].value = '';
  fakeClick(t.els, 'submit-do');
  if (t.els['ce-s-err'].textContent.indexOf('required') !== -1) ok('runtime: missing source blocked client-side');
  else no('runtime submit', 'missing source not blocked');
  if (submitPosts() === n0) ok('runtime: no POST fired without source');
  else no('runtime submit', 'POST fired despite missing source');
  /* valid submit */
  t.els['ce-s-src'].value = 'https://example.org/real-event';
  t.els['ce-s-title'].value = 'Real Rally';
  t.els['ce-s-venue'].value = 'Lafayette Square';
  t.els['ce-s-city'].value = 'New Orleans';
  t.els['ce-s-state'].value = 'LA';
  t.els['ce-s-type'].value = 'rally';
  var d = new Date(NOW + 3 * 86400000);
  t.els['ce-s-when'].value = d.toISOString().slice(0, 16);
  fakeClick(t.els, 'submit-do');
  var sc = t.postCalls.filter(function (c) { return c.cv_action === 'civicevent_submit'; }).pop();
  if (sc && sc.source_url === 'https://example.org/real-event' && sc.state === 'LA') ok('runtime: valid submit posts civicevent_submit');
  else no('runtime submit', 'valid submit did not post correctly');

  /* no-backend fail-soft */
  var t2 = runInner('', 'tester1');
  if (t2.els.xCivicEvents.innerHTML.indexOf('offline') !== -1) ok('runtime: fail-soft when backend unreachable');
  else no('runtime failsoft', 'no offline message');

  /* no-callsign gating */
  var t3 = runInner('https://backend.test', '');
  fakeClick(t3.els, 'detail', 'ev_1');
  if (t3.els['ce-rsvp'].innerHTML.indexOf('c-gate') !== -1) ok('runtime: RSVP gated without callsign');
  else no('runtime gate', 'RSVP not gated for anonymous visitor');
}

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); }
process.exit(fails.length ? 1 : 0);
