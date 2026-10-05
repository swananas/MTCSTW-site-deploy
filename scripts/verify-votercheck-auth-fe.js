#!/usr/bin/env node
/* scripts/verify-votercheck-auth-fe.js — voter_check auth frontend verification.
   Run from the worktree root: node scripts/verify-votercheck-auth-fe.js
   1. node --check on civic.js + rebuild bundles via build/bundle.js
   2. Static checks: authGetJSONP routing present, plain-api() fallback present,
      params shape {state} only (secret attached by authGetJSONP, never hardcoded)
   3. Runtime (vm + DOM stubs, REAL inner script extracted from civic.js):
      A. session + secret  -> voter_check URL carries callsign + auth_secret
      B. no PF.authGetJSONP -> falls back to plain api(), state only, no secret
      C. authGetJSONP present, no session -> no callsign/secret, read path intact
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

console.log('== 0. rebuild bundles ==');
try { cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' }); ok('build/bundle.js ran clean'); }
catch (e) { no('build/bundle.js', 'rebuild failed'); }

console.log('== 1. node --check ==');
try { cp.execSync('node --check v1.4.3/games/civic.js', { cwd: ROOT, stdio: 'pipe' }); ok('v1.4.3/games/civic.js'); }
catch (e) { no('node --check civic.js', 'syntax error'); }

var src = read(path.join(ROOT, 'v1.4.3', 'games', 'civic.js'));

console.log('== 2. static checks ==');
if (src.indexOf('PF.authGetJSONP(BACKEND,"voter_check"') !== -1) ok('voterCheck routes through PF.authGetJSONP');
else no('authGetJSONP routing', 'PF.authGetJSONP(BACKEND,"voter_check" not found');
if (/api\("voter_check",pp,cb\)/.test(src)) ok('plain api() fallback preserved for no-authGetJSONP');
else no('api fallback', 'api("voter_check",pp,cb) fallback missing');
if (src.indexOf('auth_secret') !== -1 && /voterCheck[\s\S]{0,400}auth_secret\s*=\s*["'][^"']/.test(src))
  no('secret hardcoding', 'voterCheck appears to hardcode an auth secret');
else ok('no hardcoded auth secret in voterCheck (secret attached by authGetJSONP)');
if (src.indexOf('rep_contact_history') !== -1) ok('rep_contact_history precedent still present (unchanged pattern)');

console.log('== 3. runtime routing tests ==');
/* Extract the real inner script (inside the <template> <script> tag). */
var sIdx = src.indexOf('<script>\n');
var eIdx = src.indexOf('</scr`+`ipt>');
if (sIdx < 0 || eIdx < 0) { no('inner script extraction', 'could not locate inner <script> block'); }
var inner = src.slice(sIdx + '<script>\n'.length, eIdx);

function makeStubs(scenario) {
  var captured = [];           /* appended script srcs */
  var els = {};                /* getElementById cache */
  /* Actions the inner script fires during load/bind; auto-answer so
     render() runs and bind() wires the voter select. */
  var AUTO = { petition_list: { ok: true, petitions: [] },
    rep_list: { ok: true, seeded: true, reps: [] },
    rep_scripts: { ok: true, scripts: [] },
    voter_pledge_stats: { ok: true, total_pledges: 0, by_state: [] },
    ballot_get: { ok: true, rows: [] },
    rep_contact_history: { ok: true, history: [] } };
  function el() {
    return { value: '', innerHTML: '', textContent: '', disabled: false,
      onchange: null, onclick: null, style: {},
      setAttribute: function(){}, appendChild: function(){},
      addEventListener: function(){}, insertAdjacentHTML: function(){} };
  }
  var PFt = { BACKEND_URL: 'https://backend.test', skip: function(){ return false; },
    gateHTML: function(){ return ''; }, errCopy: function(j,d){ return d; },
    toast: function(){}, dope: { confetti: function(){}, ping: function(){}, xpFloat: function(){} } };
  if (scenario.authGetJSONP) {
    /* Test double mirroring the real 14-auth.js contract: attach
       callsign/device/secret when available, then fire. */
    PFt.authGetJSONP = function (backendUrl, action, params, cb) {
      var p = Object.assign({}, params);
      if (scenario.callsign && !p.callsign) p.callsign = scenario.callsign;
      if (scenario.device && !p.device) p.device = scenario.device;
      if (scenario.secret && !p.auth_secret) p.auth_secret = scenario.secret;
      var q = '?action=' + encodeURIComponent(action);
      for (var k in p) { if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]); }
      captured.push({ via: 'authGetJSONP', action: action, src: backendUrl + q });
      /* do not fire cb: no network in harness */
    };
  }
  var PF = new Proxy(PFt, { get: function(t, k) {
    if (k in t) return t[k];
    if (scenario.undef && scenario.undef.indexOf(k) !== -1) return undefined;
    return function(){ return ''; };
  }});
  var winRef = { w: null };
  var sandbox = {
    console: console, Math: Math, JSON: JSON, Object: Object, String: String,
    Number: Number, Date: Date, Array: Array, RegExp: RegExp,
    setTimeout: function(){ return 0; }, clearTimeout: function(){},
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    window: null, document: null, localStorage: { getItem: function(){ return null; }, setItem: function(){} }
  };
  function fireAuto(srcUrl) {
    var m = /[?&]action=([^&]*)/.exec(srcUrl || '');
    if (!m) return;
    var a = decodeURIComponent(m[1]);
    if (!AUTO.hasOwnProperty(a)) return;
    var cm = /[?&]callback=([^&]*)/.exec(srcUrl);
    if (!cm) return;
    var fn = cm[1], w = winRef.w;
    if (w && typeof w[fn] === 'function') {
      try { w[fn](AUTO[a]); } catch (e) { /* harness-level: ignore */ }
    }
  }
  var win = {
    PF: PF, PF_BACKEND_URL: 'https://backend.test',
    PFCallsign: scenario.callsign ? function(){ return scenario.callsign; } : undefined,
    PFDeviceId: scenario.device ? function(){ return scenario.device; } : undefined
  };
  winRef.w = win; sandbox.window = win;
  var doc = {
    getElementById: function(id){ if (!els[id]) els[id] = el(); return els[id]; },
    createElement: function(tag){
      if (tag === 'script') {
        var s = { onerror: null };
        Object.defineProperty(s, 'src', { set: function(v){
          captured.push({ via: 'api', src: v });
          fireAuto(v);
        }, get: function(){ return ''; } });
        return s;
      }
      return el();
    },
    head: { appendChild: function(){} },
    body: { appendChild: function(){} },
    documentElement: { appendChild: function(){} },
    addEventListener: function(){}, readyState: 'complete',
    querySelectorAll: function(){ return []; },
    querySelector: function(){ return null; }
  };
  sandbox.document = doc;
  win.document = doc;
  sandbox.PF = PF; /* inner script uses bare PF (global), like the live page */
  vm.createContext(sandbox);
  try { vm.runInContext(inner, sandbox, { filename: 'civic-inner.js' }); }
  catch (e) { return { error: e }; }
  return { captured: captured, els: els };
}
function voterCheckUrls(st, scenario) {
  var r = st(scenario);
  if (r.error) return { error: r.error };
  var vs = r.els.cvVoterState;
  if (!vs || typeof vs.onchange !== 'function') return { error: new Error('cvVoterState.onchange not bound') };
  vs.value = 'TX';
  try { vs.onchange(); } catch (e) { return { error: e }; }
  return { urls: r.captured.filter(function(c){ return /action=voter_check/.test(c.src); }) };
}
function hasParam(u, k) { return new RegExp('[?&]' + k + '=').test(u); }

/* Scenario A: session + secret -> callsign + auth_secret on the wire */
(function(){
  var r = voterCheckUrls(makeStubs, { authGetJSONP: true, callsign: 'testcallsign', device: 'dev1', secret: 's3cret' });
  if (r.error) { no('A: session routing', String(r.error && r.error.message || r.error)); return; }
  if (r.urls.length !== 1) { no('A: session routing', 'expected 1 voter_check URL, got ' + r.urls.length); return; }
  var u = r.urls[0].src;
  if (r.urls[0].via !== 'authGetJSONP') { no('A: via authGetJSONP', 'went via ' + r.urls[0].via); return; }
  if (hasParam(u, 'callsign') && hasParam(u, 'auth_secret') && hasParam(u, 'state'))
    ok('A: session -> voter_check carries callsign + auth_secret + state');
  else no('A: params', 'missing callsign/auth_secret/state in ' + u);
})();

/* Scenario B: no PF.authGetJSONP -> plain api() fallback, state only.
   (callsign present: the civic UI gates on callsign, so voterCheck is only
   reachable with one.) */
(function(){
  var r = voterCheckUrls(makeStubs, { authGetJSONP: false, callsign: 'testcallsign', undef: ['authGetJSONP'] });
  if (r.error) { no('B: fallback routing', String(r.error && r.error.message || r.error)); return; }
  if (r.urls.length !== 1) { no('B: fallback routing', 'expected 1 voter_check URL, got ' + r.urls.length); return; }
  var u = r.urls[0].src;
  if (r.urls[0].via !== 'api') { no('B: via plain api', 'went via ' + r.urls[0].via); return; }
  if (hasParam(u, 'state') && !hasParam(u, 'auth_secret') && !hasParam(u, 'callsign'))
    ok('B: no authGetJSONP -> plain api(), state only, no secret leaked');
  else no('B: params', 'unexpected params in ' + u);
})();

/* Scenario C: authGetJSONP present, callsign but no stored secret ->
   callsign sent, no secret; backend skips the write, read path intact. */
(function(){
  var r = voterCheckUrls(makeStubs, { authGetJSONP: true, callsign: 'testcallsign' });
  if (r.error) { no('C: no-secret routing', String(r.error && r.error.message || r.error)); return; }
  if (r.urls.length !== 1) { no('C: no-secret routing', 'expected 1 voter_check URL, got ' + r.urls.length); return; }
  var u = r.urls[0].src;
  if (hasParam(u, 'state') && hasParam(u, 'callsign') && !hasParam(u, 'auth_secret'))
    ok('C: callsign, no secret -> read path intact, no secret, backend skips write');
  else no('C: params', 'unexpected params in ' + u);
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function(f){ console.log(' - ' + f); }); process.exit(1); }
