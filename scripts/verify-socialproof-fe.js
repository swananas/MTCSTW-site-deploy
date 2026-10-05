#!/usr/bin/env node
/* scripts/verify-socialproof-fe.js — social proof bar S3 verification.
   Run from the repo root:
     node scripts/verify-socialproof-fe.js
   1. node --check on the module (outer file)
   2. node --check on the EXTRACTED INNER script (node --check cannot see
      inner-script SyntaxErrors — the class that killed briefing + draw,
      homepage audit 2026-10-05 Phase 3 #5)
   3. Static checks: 8M+ REACH stat present + static-only (not backend-wired),
      kill switch intact, zero-checkins suppression logic, bundle marker,
      banned terms absent
   4. Mocked-browser runtime tests (vm + DOM stub): evaluate the REAL outer
      file, capture the staged template, evaluate the REAL inner script, and
      drive it with fake backend JSONP fixtures:
        - zero check-ins: the check-ins line is hidden (display:none), XP
          earned / active cells still show, 8M+ REACH is always visible
        - nonzero check-ins: behavior unchanged (line visible, wording exact)
        - zero -> nonzero tick: the line comes back (no stuck-hidden state)
        - all-zero: no empty-room line anywhere; bar leads with 8M+ REACH
        - backend error: honest "unreachable" state preserved, not hidden
        - kill switch + session dismiss: nothing stages
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'games', 'social-proof.js');
var BUNDLE = path.join(V, 'games', 'bundle-sec1.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ============ 0. rebuild bundles (bundle-sec1 carries the module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check: outer file ============ */
console.log('== 1. node --check (outer) ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('social-proof.js outer syntax'); }
catch (e) { no('outer syntax', 'node --check failed'); }

/* ============ 2. inner-script syntax (the class node --check can't see) ============ */
console.log('== 2. inner-script syntax ==');
var src = read(MOD);
/* The template stages <script>...</scr`+`ipt> — extract the real inner script
   exactly as the browser will see it. No quote-stripping anywhere in this
   harness (esc()'s /"/g breaks naive strippers — AGENTS.md lesson). */
var S_OPEN = '<script>';
/* The source literally contains backtick-plus-backtick: </scr`+`ipt>.
   In this file's own JS source that literal is '</scr' + '`+`' + 'ipt>'. */
var S_CLOSE = '</scr' + '`+`' + 'ipt>';
var tplStart = src.indexOf('id="pf-ov-socialproof"');
var i0 = src.indexOf(S_OPEN, tplStart), i1 = src.indexOf(S_CLOSE, i0);
if (i0 === -1 || i1 === -1) { no('inner extract', 'inner <script> block not found'); }
var inner = src.slice(i0 + S_OPEN.length, i1);
var innerPath = path.join('/tmp', 'pf-sp-inner-check.js');
fs.writeFileSync(innerPath, inner);
try { cp.execSync('node --check ' + innerPath, { stdio: 'pipe' }); ok('inner script syntax (template-evaluated)'); }
catch (e) { no('inner syntax', 'node --check failed on extracted inner script'); }
try { fs.unlinkSync(innerPath); } catch (e) {}

/* ============ 3. static contract checks ============ */
console.log('== 3. static contract checks ==');
if (src.indexOf('id="pf-sp-reach"') !== -1) ok('reach stat id pf-sp-reach present');
else no('reach id', 'pf-sp-reach missing from template');
if (src.indexOf('<b>8M+</b> network reach') !== -1) ok('8M+ REACH stat copy present');
else no('reach copy', '<b>8M+</b> network reach missing');
if (/<span class="sp-stat" id="pf-sp-reach"/.test(src)) ok('reach uses sp-stat class (bar visual language)');
else no('reach class', 'pf-sp-reach not styled as sp-stat');
if (!/<span[^>]*id="pf-sp-reach"[^>]*display\s*:\s*none/.test(src)) ok('reach stat has no inline display:none (always visible)');
else no('reach hidden', 'pf-sp-reach carries inline display:none');
/* The figure is static: the paint() logic must never read it from the backend. */
if (inner.indexOf('pf-sp-reach') === -1) ok('reach stat is static-only (inner script never touches pf-sp-reach)');
else no('reach wired', 'inner script references pf-sp-reach — the figure must stay static');
if (/PF\.skip\(['"]socialproof['"]\)/.test(src)) ok('kill switch PF.skip("socialproof") wired');
else no('kill switch', 'PF.skip("socialproof") not found');
if (src.indexOf('?pf_off=social-proof') !== -1) ok('KILL comment documents ?pf_off=social-proof (no new pattern invented)');
else no('kill comment', '?pf_off=social-proof missing from header');
if (src.indexOf('ci.style.display="none"') !== -1) ok('zero-checkins suppression present (ci display none)');
else no('suppression', 'ci.style.display="none" not found');
if (/if\s*\(\s*n\s*>\s*0\s*\)/.test(src)) ok('nonzero branch gated on n>0');
else no('nonzero gate', 'if(n>0) gate not found');
if (src.indexOf('ci.style.display=""') !== -1) ok('nonzero tick restores the line (no stuck-hidden state)');
else no('restore', 'ci.style.display="" missing — a zero->nonzero transition would stay hidden');
if (src.indexOf('soldiers checked in today') !== -1) ok('nonzero copy unchanged ("soldiers checked in today")');
else no('copy', 'check-ins copy changed or missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in module');
});
if (read(BUNDLE).indexOf('id="pf-sp-reach"') !== -1) ok('bundle-sec1.js regenerated with the reach stat');
else no('bundle marker', 'pf-sp-reach missing from regenerated bundle-sec1.js');
if (read(BUNDLE).indexOf('ci.style.display="none"') !== -1) ok('bundle-sec1.js carries the suppression logic');
else no('bundle suppression', 'suppression missing from regenerated bundle-sec1.js');

/* ============ 4. mocked-browser runtime ============ */
console.log('== 4. mocked-browser runtime (DOM stub) ==');
function makeEl(id, display) {
  return { id: id, style: { display: display || '' }, innerHTML: '', onclick: null };
}
function makeOuterEnv(opts) {
  opts = opts || {};
  var staged = [];
  var store = {};
  if (opts.dismissed) store.pf_sp_dismissed = '1';
  var sb = {};
  sb.window = sb;
  sb.sessionStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.PF = {
    skip: function (silo) { return opts.kill === silo; },
    holder: function () {
      return { insertAdjacentHTML: function (pos, html) { staged.push(html); } };
    }
  };
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'social-proof.js' });
  return { sb: sb, staged: staged };
}
function makeEls() {
  var els = {};
  /* mirror the template's initial display state */
  ['pf-sp-bar', 'pf-sp-reach', 'pf-sp-checkins'].forEach(function (id) { els[id] = makeEl(id, ''); });
  ['pf-sp-xp', 'pf-sp-cells', 'pf-sp-online', 'pf-sp-proofwall'].forEach(function (id) { els[id] = makeEl(id, 'none'); });
  els['pf-sp-x'] = makeEl('pf-sp-x', '');
  return els;
}
/* One backend tick: fresh inner-script sandbox (as the 5-min poller would do),
   bound to the SAME persistent element objects. */
function tickWith(els, fixtureObj) {
  var pending = {};
  var sb = {};
  sb.window = sb;
  sb.PF_BACKEND_URL = 'https://example.invalid/?';
  sb.setTimeout = function () { return 0; }; /* no-op: the 10s JSONP fallback must not pre-empt fixtures */
  sb.setInterval = function () { return 0; }; /* no-op: the 5-min poller must not loop in the harness */
  sb.document = {
    getElementById: function (id) { return els[id] || null; },
    createElement: function (t) {
      if (String(t).toLowerCase() !== 'script') return {};
      return { src: '', onerror: null, parentNode: null };
    },
    head: {
      appendChild: function (s) {
        var m = /callback=([^&]+)/.exec(String(s.src || ''));
        if (m) pending.cb = decodeURIComponent(m[1]);
        s.parentNode = { removeChild: function () {} };
      }
    }
  };
  sb.PF = { hidden: function () { return false; } };
  vm.createContext(sb);
  vm.runInContext(inner, sb, { filename: 'social-proof-inner.js' });
  if (!pending.cb) throw new Error('no JSONP callback captured');
  sb.window[pending.cb](fixtureObj);
  return els;
}
function fixture(o) {
  return Object.assign({ ok: true, checkins_today: 0, xp_earned_today: 0,
    active_cells: 0, online_now: 0, proof_wall: [] }, o);
}

/* --- 4a. outer: stages the template, reach stat in the bar --- */
var outer = makeOuterEnv();
if (outer.staged.length === 1) ok('outer stages exactly one template');
else no('staging', 'staged ' + outer.staged.length + ' templates');
var tpl = outer.staged[0] || '';
if (tpl.indexOf('id="pf-sp-reach"') !== -1 && tpl.indexOf('<b>8M+</b> network reach') !== -1)
  ok('staged bar contains the 8M+ REACH stat');
else no('staged reach', 'reach stat missing from staged template');
if (/<span class="sp-live"[^>]*><\/span>\s*<!--[\s\S]*?-->\s*<span class="sp-stat" id="pf-sp-reach"/.test(tpl) ||
    tpl.indexOf('id="pf-sp-reach"') > tpl.indexOf('class="sp-live"') &&
    tpl.indexOf('id="pf-sp-reach"') < tpl.indexOf('id="pf-sp-checkins"'))
  ok('reach stat sits in the bar next to the live dot (before the check-ins line)');
else no('reach placement', 'reach stat not positioned in the bar before check-ins');

/* --- 4b. kill switch + dismiss --- */
if (makeOuterEnv({ kill: 'socialproof' }).staged.length === 0) ok('?pf_off=social-proof (PF.skip) stages nothing');
else no('kill', 'template staged despite PF.skip');
if (makeOuterEnv({ dismissed: true }).staged.length === 0) ok('session dismiss stages nothing');
else no('dismiss', 'template staged despite pf_sp_dismissed');

/* --- 4c. zero check-ins: line hidden, alternates shown --- */
var E = makeEls();
tickWith(E, fixture({ checkins_today: 0, xp_earned_today: 1500, active_cells: 1, online_now: 0 }));
if (E['pf-sp-checkins'].style.display === 'none') ok('zero: check-ins line hidden (display:none)');
else no('zero hide', 'check-ins line display=' + E['pf-sp-checkins'].style.display);
if (E['pf-sp-checkins'].innerHTML.indexOf('0 soldiers') === -1 &&
    E['pf-sp-checkins'].innerHTML.indexOf('checked in today') === -1)
  ok('zero: no "0 soldiers checked in today" copy rendered');
else no('zero copy', 'empty-room copy still rendered: ' + E['pf-sp-checkins'].innerHTML.slice(0, 60));
if (E['pf-sp-xp'].style.display === '' && E['pf-sp-xp'].innerHTML.indexOf('XP earned') !== -1)
  ok('zero: XP earned shown instead (' + E['pf-sp-xp'].innerHTML.replace(/<[^>]*>/g, '') + ')');
else no('zero xp', 'XP earned not shown: display=' + E['pf-sp-xp'].style.display);
if (E['pf-sp-cells'].style.display === '' && E['pf-sp-cells'].innerHTML.indexOf('active cells') !== -1)
  ok('zero: active cells shown instead (' + E['pf-sp-cells'].innerHTML.replace(/<[^>]*>/g, '') + ')');
else no('zero cells', 'active cells not shown: display=' + E['pf-sp-cells'].style.display);

/* --- 4d. nonzero check-ins: behavior unchanged --- */
var E2 = makeEls();
tickWith(E2, fixture({ checkins_today: 127, xp_earned_today: 5000, active_cells: 2, online_now: 34 }));
if (E2['pf-sp-checkins'].style.display === '' &&
    E2['pf-sp-checkins'].innerHTML === '<b>127</b> soldiers checked in today')
  ok('nonzero: check-ins line visible, copy unchanged');
else no('nonzero line', 'display=' + E2['pf-sp-checkins'].style.display +
  ' html=' + E2['pf-sp-checkins'].innerHTML.slice(0, 60));
/* NOTE: fmt() renders 5000 as "5.0K" (its /\.0$/ strip is double-escaped in
   source, so the strip never fires). That is PRE-EXISTING module behavior —
   this worker's mandate is "nonzero behavior unchanged", so the assertion
   below pins the actual current rendering, not the ideal one. Flagged in the
   handoff for a future worker; changing it here would alter nonzero output. */
if (E2['pf-sp-xp'].style.display === '' && E2['pf-sp-xp'].innerHTML.indexOf('5.0K') !== -1 &&
    E2['pf-sp-cells'].style.display === '' && E2['pf-sp-cells'].innerHTML.indexOf('2</b> active cells') !== -1 &&
    E2['pf-sp-online'].style.display === '' && E2['pf-sp-online'].innerHTML.indexOf('34</b> online now') !== -1)
  ok('nonzero: XP / cells / online stats render exactly as before');
else no('nonzero stats', 'xp/cells/online rendering changed');
var E3 = makeEls();
tickWith(E3, fixture({ checkins_today: 1 }));
if (E3['pf-sp-checkins'].innerHTML === '<b>1</b> soldier checked in today')
  ok('nonzero singular: "1 soldier checked in today"');
else no('singular', E3['pf-sp-checkins'].innerHTML.slice(0, 60));
/* stats with 0 values stay hidden in the nonzero case (unchanged) */
if (E3['pf-sp-xp'].style.display === 'none' && E3['pf-sp-cells'].style.display === 'none' &&
    E3['pf-sp-online'].style.display === 'none')
  ok('nonzero: zero-valued stats stay hidden (unchanged)');
else no('nonzero zero-stats', 'a zero-valued stat became visible');

/* --- 4e. zero -> nonzero transition: the line comes back --- */
tickWith(E, fixture({ checkins_today: 42 }));
if (E['pf-sp-checkins'].style.display === '' &&
    E['pf-sp-checkins'].innerHTML === '<b>42</b> soldiers checked in today')
  ok('zero->nonzero: check-ins line restored on the next tick');
else no('transition', 'display=' + E['pf-sp-checkins'].style.display);

/* --- 4f. all-zero: the bar never advertises an empty room --- */
var E4 = makeEls();
tickWith(E4, fixture({ checkins_today: 0, xp_earned_today: 0, active_cells: 0, online_now: 0 }));
var barText = ['pf-sp-checkins', 'pf-sp-xp', 'pf-sp-cells', 'pf-sp-online'].map(function (id) {
  return E4[id].style.display === 'none' ? '' : E4[id].innerHTML;
}).join(' ');
if (E4['pf-sp-checkins'].style.display === 'none' && E4['pf-sp-xp'].style.display === 'none' &&
    E4['pf-sp-cells'].style.display === 'none' && E4['pf-sp-online'].style.display === 'none')
  ok('all-zero: every dynamic stat hidden — only the static 8M+ REACH bar remains');
else no('all-zero', 'a zero-valued dynamic stat is visible');
if (barText.indexOf('<b>0</b>') === -1 && !/>\s*0\s+soldier/.test(barText))
  ok('all-zero: no "0" stat is advertised anywhere in the bar');
else no('all-zero zero', 'a zero stat leaked into the visible bar: ' + barText.slice(0, 80));

/* --- 4g. backend error: honest state preserved, not suppressed --- */
var E5 = makeEls();
tickWith(E5, null);
if (E5['pf-sp-checkins'].innerHTML.indexOf('Network pulse unreachable') !== -1 &&
    E5['pf-sp-checkins'].style.display === '')
  ok('error: honest "unreachable" state shown and NOT suppressed');
else no('error state', 'html=' + E5['pf-sp-checkins'].innerHTML.slice(0, 60) +
  ' display=' + E5['pf-sp-checkins'].style.display);

/* --- 4h. proof wall still composes with the bar --- */
var E6 = makeEls();
tickWith(E6, fixture({ checkins_today: 5,
  proof_wall: [{ callsign: 'WARHAWK', platform: 'tiktok', bounty: 'test bounty' }] }));
if (E6['pf-sp-proofwall'].style.display === '' &&
    E6['pf-sp-proofwall'].innerHTML.indexOf('WARHAWK') !== -1)
  ok('proof wall still renders under the bar (S2 untouched)');
else no('proof wall', 'proof wall did not render');

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
