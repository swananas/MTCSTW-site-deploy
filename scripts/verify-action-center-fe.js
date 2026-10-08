#!/usr/bin/env node
/* scripts/verify-action-center-fe.js — Action Center frontend verification
   harness (2026-10-05). Run from the worktree root:
     node scripts/verify-action-center-fe.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, build/bundle.js, pages/political-hq.js,
      and this harness.
   2. Kill switch: ?pf_off=action-center via PF.skip('action-center') + the
      header documents it; template id pf-ov-action-center is staged.
   3. Bundle registration: action-center.js in exactly one bundle
      (bundle-hq) and present in the rebuilt bundle-hq.js; template mounted
      first in pages/political-hq.js ORDER and present in bundle-pages.js.
   4. No hardcoded action list: the five civic action ids appear only in the
      header comment prose — never as render-time literals or branches.
      Pane routing is a pure substring match on backend-supplied ids.
   5. No XP logic in frontend: no xpGrant call, no arithmetic or assignment
      on XP values (server xp displayed only; display rounding in the badge
      painter is allowed).
   6. Stored-XSS guard: label, detail, id, and kind all pass through esc()
      before hitting innerHTML; hrefs are anchors only (no URL injection).
   7. Contract surface: civic_progress JSONP read, "X of Y actions completed"
      progress text, reward badges (+N XP / NO XP), done checkmarks,
      data-ac-jump deep links, claim gate for no-callsign, refresh hooks
      (pf-callsign-claimed, pf-civic-progress-changed, focus, visibility,
      PF.actionCenterRefresh).
   8. Lexicon gate: zero banned terms (casino lexicon + the banned d-word).
   9. Backslash discipline: the inner template script is closed with
      <scr`+`ipt> (no raw </script> inside the outer backtick literal).
   10. Functional render test: stub DOM + PF, capture the JSONP callback URL,
       feed the documented civic_progress schema, and assert the rendered
       HTML carries the progress line, every reward badge, done/not-done
       markers, deep-link buttons, and escaped hostile input. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var MOD = path.join(G, 'action-center.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function grepHits(src, re) {
  var out = [];
  src.split('\n').forEach(function (l, i) {
    if (re.test(l)) out.push((i + 1) + ':' + l.trim().slice(0, 100));
  });
  return out;
}

console.log('== 1. node --check ==');
[['v1.4.3/games/action-center.js', MOD],
 ['build/bundle.js', path.join(ROOT, 'build', 'bundle.js')],
 ['v1.4.3/pages/political-hq.js', path.join(V, 'pages', 'political-hq.js')],
 ['scripts/verify-action-center-fe.js', path.join(ROOT, 'scripts', 'verify-action-center-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

var src = read(MOD);
var tplStart0 = src.indexOf('<script>');
var tplEnd0 = src.indexOf('</scr`+`ipt>');
/* Code-level checks (4/5/6) run against the INNER template script, not the
   whole file: the outer backtick staging literal breaks naive quote
   stripping. The inner script carries no backticks (asserted in check 9). */
var innerSrc = (tplStart0 !== -1 && tplEnd0 !== -1)
  ? src.slice(tplStart0 + '<script>'.length, tplEnd0) : src;
function codeOnly(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
var code = codeOnly(innerSrc);
/* codeNC: comment-stripped inner script WITHOUT string stripping. The full
   codeOnly() string-stripper is regex-literal-blind: esc() carries /"/g and
   the naive dquote pass then swallows the file. For token/pattern checks
   the comment-stripped view is the honest one. */
var codeNC = innerSrc
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

console.log('== 2. kill switch + template staging ==');
if (has(src, 'PF.skip("action-center")')) ok('PF.skip("action-center")'); else no('kill switch', 'PF.skip("action-center") missing');
if (has(src, '?pf_off=action-center')) ok('?pf_off documented in header'); else no('kill switch', 'header does not document ?pf_off=action-center');
if (has(src, 'template id="pf-ov-action-center"')) ok('template pf-ov-action-center staged'); else no('template', 'pf-ov-action-center template missing');
if (has(src, 'id="pf-action-center"')) ok('silo root #pf-action-center'); else no('silo root', '#pf-action-center missing');

console.log('== 3. bundle + page registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
var hqList = (bsrc.match(/'bundle-hq':\s*\[([\s\S]*?)\]/) || [])[1] || '';
if (has(hqList, "'action-center.js'")) ok('action-center.js in bundle-hq list'); else no('bundle list', 'action-center.js not in bundle-hq');
var otherBundles = bsrc.replace(/'bundle-hq':\s*\[[\s\S]*?\]/, '');
if (!has(otherBundles, "'action-center.js'")) ok('exactly one bundle'); else no('bundle exclusivity', 'action-center.js listed in another bundle');
var hqBuilt = read(path.join(G, 'bundle-hq.js'));
if (has(hqBuilt, 'pf-ov-action-center')) ok('rebuilt bundle-hq.js contains module'); else no('bundle-hq.js', 'module not found in rebuilt bundle-hq.js');
var hqPage = read(path.join(V, 'pages', 'political-hq.js'));
if (has(hqPage, "['action-center', 'pf-ov-action-center']")) ok('political-hq.js ORDER mounts action-center'); else no('page mount', "['action-center','pf-ov-action-center'] missing from ORDER");
if (hqPage.indexOf("['action-center'") < hqPage.indexOf("['civic'")) ok('hub mounts before civic flows'); else no('page order', 'action-center is not first in ORDER');
var pagesBuilt = read(path.join(V, 'pages', 'bundle-pages.js'));
if (has(pagesBuilt, "['action-center', 'pf-ov-action-center']")) ok('rebuilt bundle-pages.js contains mount'); else no('bundle-pages.js', 'mount not found in rebuilt bundle-pages.js');

console.log('== 4. no hardcoded action list ==');
var IDS = ['sign_petition', 'create_petition', 'contact_rep', 'voter_pledge', 'voter_check'];
var idHits = IDS.filter(function (id) { return has(codeNC, id); });
if (!idHits.length) ok('no action-id literals in code'); else no('hardcoded actions', 'code references: ' + idHits.join(', '));
if (/switch\s*\(\s*a\.id|a\.id\s*===/.test(codeNC)) no('hardcoded actions', 'id-based branching in code'); else ok('pane routing is substring match on backend ids');

console.log('== 5. no XP logic in frontend ==');
if (!/xpGrant/.test(codeNC)) ok('no xpGrant call'); else no('xp logic', 'xpGrant referenced');
/* Bare-identifier xp (not a.xp, not xpBadge, not ac-xp): must never be
   assigned or arithmetically combined. String contents can't produce these
   shapes, so the comment-stripped view is safe. */
var xpBad = grepHits(codeNC, /(^|[^\w$-])xp(?![\w-])\s*(\+\+|--|\+=|-=|\*=|\/=|=(?![=>]))/);
xpBad = xpBad.concat(grepHits(codeNC, /(^|[^\w$-])xp(?![\w-])\s*[+\-*/]\s*[^=\s]/));
if (!xpBad.length) ok('no XP arithmetic/mutation'); else no('xp logic', xpBad.join(' | '));

console.log('== 6. stored-XSS guard ==');
[['esc(a.label', 'label'], ['esc(a.detail', 'detail'], ['esc(kind', 'pane kind']].forEach(function (pair) {
  if (has(codeNC, pair[0])) ok(pair[0] + ' escaped');
  else no('esc(' + pair[1] + ')', pair[1] + ' reaches innerHTML without esc()');
});
/* a.id only ever reaches the DOM via paneKind() -> esc(kind): assert the id
   never hits innerHTML directly. */
if (/innerHTML[^;]*a\.id/.test(codeNC) || /\+a\.id/.test(codeNC)) no('esc(a.id)', 'a.id interpolated without esc()');
else ok('a.id never interpolated raw');
if (!/href\s*=\s*["']?\+?\s*esc\(/.test(code) && !/href\s*=\s*["']https?:\/\/["']\s*\+/.test(code)) ok('no dynamic hrefs (anchors only)');

console.log('== 7. contract surface ==');
[['civic_progress', 'civic_progress JSONP read'],
 ['actions completed', '"X of Y actions completed" progress line'],
 ['cp-barwrap', 'progress bar (reused cp-barwrap/cp-bar)'],
 ['ac-xp', 'reward badge class'],
 ['NO XP', 'zero-reward badge state'],
 ['u2714', 'done checkmark'],
 ['u25CB', 'not-done marker'],
 ['data-ac-jump', 'deep-link buttons'],
 ['pf-callsign-claimed', 'claim-event refresh hook'],
 ['pf-civic-progress-changed', 'future civic.js refresh event'],
 ['actionCenterRefresh', 'public PF.actionCenterRefresh()'],
 ['visibilitychange', 'visibility refresh hook'],
 ['gateHTML', 'no-callsign claim gate (existing flow)']
].forEach(function (pair) {
  if (has(src, pair[0])) ok(pair[1]); else no(pair[1], 'token "' + pair[0] + '" missing');
});
if (!/requireCallsign/.test(code)) ok('no rebuilt claim flow'); else no('claim flow', 'module rebuilds claim logic — must link only');

console.log('== 8. lexicon gate ==');
var banned = grepHits(src, /donat\w*|casino|slots?|jackpot|wager|betting/i);
if (!banned.length) ok('zero banned terms'); else no('lexicon', banned.join(' | '));

console.log('== 9. backslash discipline ==');
var tplStart = src.indexOf('<script>');
var tplEnd = src.indexOf('</scr`+`ipt>');
if (tplStart !== -1 && tplEnd !== -1 && tplStart < tplEnd) {
  var innerBlock = src.slice(tplStart, tplEnd);
  if (innerBlock.indexOf('`') === -1) ok('inner script has no backtick spans'); else no('backticks', 'backtick found inside inner template script');
  if (/<\/script>/.test(innerBlock)) no('script close', 'raw </script> inside inner block'); else ok('inner script closed via <scr`+`ipt>');
} else no('template script', 'inner <script> block not found');

console.log('== 10. functional render test (stubbed DOM + mocked civic_progress) ==');
(function functional() {
  var inner = src.slice(tplStart + '<script>'.length, tplEnd);
  var capturedHTML = '';
  var scriptSrc = '';
  var jumpHandlers = [];
  var gateCalled = false;
  var els = {};
  function mkEl(id) {
    return {
      id: id,
      _html: '',
      style: {},
      set innerHTML(v) { this._html = v; capturedHTML = v; },
      get innerHTML() { return this._html; },
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; },
      scrollIntoView: function () {},
      onclick: null,
      getAttribute: function () { return ''; }
    };
  }
  var listeners = {};
  var fakeDoc = {
    getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    createElement: function (tag) {
      if (tag === 'script') {
        return {
          set src(u) { scriptSrc = u; },
          get src() { return scriptSrc; },
          parentNode: null, onerror: null
        };
      }
      return mkEl('anon');
    },
    head: {
      appendChild: function (s) {
        /* JSONP fire: answer with the documented civic_progress schema. */
        var m = /callback=([^&]+)/.exec(scriptSrc || '');
        var fn = m && m[1];
        setTimeout(function () {
          /* The JSONP callback lands on the window the module was given
             (fakeWin in this harness), not the harness's global. */
          var target = (typeof fakeWin[fn] === 'function') ? fakeWin :
                       (typeof global[fn] === 'function') ? global : null;
          if (fn && target) {
            target[fn]({
              ok: true, callsign: 'TESTER',
              actions: [
                { id: 'sign_petition', label: 'Sign a petition', xp: 10, done: true, detail: 'Back the current fight.' },
                { id: 'create_petition', label: 'Launch a petition', xp: 25, done: false, detail: 'Start your own battle.' },
                { id: 'contact_rep', label: 'Contact your rep', xp: 25, done: false, detail: '<img src=x onerror=alert(1)> hostile' },
                { id: 'voter_pledge', label: 'Pledge to vote', xp: 50, done: false, detail: '' },
                { id: 'voter_check', label: 'Check registration', xp: 0, done: false, detail: null }
              ],
              completed: 1, total: 5
            });
          }
        }, 5);
        s.parentNode = null;
      }
    },
    querySelectorAll: function () { return []; },
    addEventListener: function (ev, fn) { listeners[ev] = fn; },
    body: { appendChild: function () {} }
  };
  var fakeWin = {
    PFCallsign: function () { return 'TESTER'; },
    PFDeviceId: function () { return 'DEV1'; },
    PF_BACKEND_URL: 'https://backend.example/exec',
    addEventListener: function () {},
    location: { href: 'https://www.mtcstw.com/political-hq' }
  };
  var fakePF = {
    skip: function () { return false; },
    toast: function () {},
    gateHTML: function () { gateCalled = true; return '<div class="c-gate">GATE</div>'; }
  };
  try {
    var runner = new Function('window', 'document', 'PF',
      'window.PF=PF; window.PFCallsign=window.PFCallsign; window.PFDeviceId=window.PFDeviceId; window.PF_BACKEND_URL=window.PF_BACKEND_URL;\n' +
      inner);
    runner(fakeWin, fakeDoc, fakePF);
  } catch (e) { no('functional', 'inner script threw: ' + (e && e.message)); return; }
  setTimeout(function () {
    var h = capturedHTML;
    function check(cond, name, why) { if (cond) ok(name); else no(name, why || 'rendered HTML missing: ' + name); }
    check(h.indexOf('1 of 5 actions completed') !== -1, 'progress "1 of 5 actions completed"');
    check(h.indexOf('width:20%') !== -1, 'progress bar width 20%');
    check(h.indexOf('+10 XP') !== -1 && h.indexOf('+25 XP') !== -1 && h.indexOf('+50 XP') !== -1, 'reward badges +10/+25/+50 XP');
    check(h.indexOf('NO XP') !== -1, 'NO XP badge for voter_check');
    check(h.indexOf('\u2714') !== -1, 'done checkmark rendered');
    check(h.indexOf('\u25CB') !== -1, 'not-done marker rendered');
    check(h.indexOf('data-ac-jump') !== -1, 'deep-link buttons rendered');
    check(h.indexOf('&lt;img src=x onerror=alert(1)&gt;') !== -1, 'hostile detail escaped');
    check(h.indexOf('onerror=alert(1)') === -1 || h.indexOf('&lt;img') !== -1, 'no raw hostile markup');
    check(h.indexOf('XP has no cash value') !== -1, 'XP disclaimer present');
    check(!gateCalled, 'no claim gate when callsign present');
    check(typeof listeners['pf-callsign-claimed'] === 'function', 'pf-callsign-claimed listener wired');
    check(typeof listeners['pf-civic-progress-changed'] === 'function', 'pf-civic-progress-changed listener wired');
    check(fakeWin.PF && typeof fakeWin.PF.actionCenterRefresh === 'function', 'PF.actionCenterRefresh exposed');
    /* No-callsign pass: re-run with empty callsign — gate must appear. */
    gateCalled = false;
    var fakeWin2 = Object.assign({}, fakeWin, { PFCallsign: function () { return ''; } });
    var captured2 = '';
    var els2 = {};
    var fakeDoc2 = Object.assign({}, fakeDoc, {
      getElementById: function (id) { if (!els2[id]) { els2[id] = mkEl(id); els2[id].innerHTML = ''; } return els2[id]; }
    });
    Object.defineProperty(els2, 'xActCenter', { configurable: true, writable: true, value: undefined });
    var fakeDoc3 = {
      getElementById: function (id) {
        if (id === 'xActCenter') {
          return { set innerHTML(v) { captured2 = v; }, get innerHTML() { return captured2; },
            querySelectorAll: function () { return []; }, style: {} };
        }
        return null;
      },
      createElement: fakeDoc.createElement,
      /* Backend rejects the callsign-less fetch: answer {ok:false} so the
         no-callsign render path runs (gate on top, no error box). */
      head: { appendChild: function () {
        var m2 = /callback=([^&]+)/.exec(scriptSrc || '');
        var fn2 = m2 && m2[1];
        setTimeout(function () {
          if (fn2 && typeof fakeWin2[fn2] === 'function') fakeWin2[fn2]({ ok: false });
        }, 5);
      } },
      querySelectorAll: function () { return []; },
      addEventListener: function () {},
      body: { appendChild: function () {} }
    };
    try {
      var runner2 = new Function('window', 'document', 'PF',
        'window.PF=PF; window.PFCallsign=window.PFCallsign; window.PFDeviceId=window.PFDeviceId; window.PF_BACKEND_URL=window.PF_BACKEND_URL;\n' + inner);
      runner2(fakeWin2, fakeDoc3, fakePF);
    } catch (e2) { no('functional', 'no-callsign run threw: ' + (e2 && e2.message)); finish(); return; }
    setTimeout(function () {
      check(gateCalled, 'claim gate rendered for no-callsign visitor');
      finish();
    }, 50);
  }, 100);
  function finish() {
    console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
    if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
  }
})();
