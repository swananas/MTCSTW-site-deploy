#!/usr/bin/env node
/* scripts/verify-teardown-hub.js — TEARDOWN WS-1 (HOMEPAGE HUB) wave gate
   (CEO-approved 2026-10-06). Run from the worktree root AFTER rebuilding
   bundles (node build/bundle-core.js):
     node scripts/verify-teardown-hub.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Wave contract (beats the proposal on any conflict):
   - P1 Briefing Hero present in BOTH modes (anonymous #pf-anonhero,
     recognized #pf-hubhero), built from PF.patterns.
   - P6 Action Bar on every card, same order (share/cell/report).
   - P5 Progression Ring renders for recognized users (render-only).
   - DATA pillar relabeled TRACK (verb set); destinations unchanged
     (DATA -> /peoples-cpi primary, /economy fallback).
   - Pillar bar demoted: NOT in the hub; mounts in the HUD's YOUR CAMPAIGN
     strip (one persistent nav, not two competing ones).
   - Anonymous mode = byte-identical public landing (no hub DOM, zero API
     calls for the mode decision — device-local callsign check only).
   - Recognized mode = campaign leads.
   - CTA-verb lint clean (JOIN THE FIGHT. enlistment-only; DEPLOY -> /
     REPORT BACK -> / text links; no donate-language).
   - Kill switches preserved (?pf_off=hubhome, ?pf_off=pillars,
     ?pf_off=hud, ?pf_off=patterns).
   - Zero new XP mechanics, zero backend writes.
   - Rebuilt minified bundles contain the redesigned modules. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V143 = path.join(ROOT, 'v1.4.3');
var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}
function runSub(script) {
  var r = cp.spawnSync(process.execPath, [path.join(ROOT, 'scripts', script)],
    { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* ================= 1. module suites green ================= */
console.log('[1] module verify suites');
(function () {
  ['verify-hubhome.js', 'verify-teardown-patterns.js'].forEach(function (s) {
    var r = runSub(s);
    if (r.status === 0) ok(s + ' GREEN');
    else {
      var tail = r.out.split('\n').filter(function (l) { return /FAIL|failed/i.test(l); }).slice(0, 6).join(' | ');
      bad(s, 'exit ' + r.status + ' :: ' + tail);
    }
  });
})();

/* ================= 2. syntax ================= */
console.log('[2] syntax');
['v1.4.3/core/32-hubhome.js', 'v1.4.3/core/31-pillars.js',
 'v1.4.3/core/30-hud.js', 'v1.4.3/core/20-nextop.js',
 'v1.4.3/pages/home-v2.js', 'scripts/verify-teardown-hub.js'].forEach(function (p) {
  var err = nodeCheck(path.join(ROOT, p));
  if (err) bad('node --check ' + p, err); else ok('node --check ' + path.basename(p));
});

/* ================= 3. DATA -> TRACK relabel ================= */
console.log('[3] DATA -> TRACK relabel (CEO decision 1)');
(function () {
  var src = stripComments(read(path.join(V143, 'core', '31-pillars.js')));
  if (/label:\s*'TRACK'/.test(src)) ok("pillar label is 'TRACK'");
  else bad('TRACK relabel', "label: 'TRACK' not found in 31-pillars.js");
  if (/label:\s*'DATA'/.test(src)) bad('TRACK relabel', "stale label: 'DATA' still present");
  else ok("no stale 'DATA' pillar label");
  /* internal keys stay stable (API contract): go('data'), registry keys */
  if (/key:\s*'data'/.test(src) && /registerDestination\('data'/.test(src))
    ok("internal 'data' keys unchanged (API stable)");
  else bad('TRACK relabel', "internal 'data' key or registry key changed — API break");
  /* runtime: load 31-pillars.js with a HUD host, read the public API */
  var pillarsSrc = read(path.join(V143, 'core', '31-pillars.js'));
  var registry = [];
  function reg(el) { registry.push(el); return el; }
  function mkEl(tag, attrs) {
    return {
      tagName: tag, attrs: attrs || {}, children: [], parentNode: null, _html: '',
      getAttribute: function (k) { return this.attrs[k] || null; },
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      addEventListener: function () {},
      appendChild: function (c) { this.children.push(c); c.parentNode = this; reg(c); return c; },
      insertBefore: function (c, r) {
        var i = this.children.indexOf(r);
        if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; reg(c); return c;
      },
      replaceChild: function (n, o) {
        var i = this.children.indexOf(o);
        if (i !== -1) this.children[i] = n;
        n.parentNode = this; reg(n); return n;
      },
      get firstChild() { return this.children[0] || null; },
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; }
    };
  }
  function defineHtml(el) {
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._html; },
      set: function (h) { this._html = String(h); }
    });
    Object.defineProperty(el, 'textContent', {
      get: function () { return ''; }, set: function () {}
    });
  }
  var strip = mkEl('div', { id: 'pf-hud-strip' }); defineHtml(strip);
  var hudHost = mkEl('div', { id: 'pf-hud' });
  hudHost.children.push(strip); strip.parentNode = hudHost;
  var idMap = { 'pf-hud': hudHost, 'pf-hud-strip': strip };
  var sb = {
    console: console,
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      getElementById: function (id) {
        var f = registry.filter(function (e) { return e.attrs && e.attrs.id === id; });
        return f[0] || idMap[id] || null;
      },
      createElement: function (t) { var e = mkEl(t, {}); defineHtml(e); reg(e); return e; },
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; },
      head: { appendChild: function (c) { reg(c); return c; } },
      body: {
        classList: { contains: function () { return false; } },
        appendChild: function (c) { reg(c); return c; }
      }
    },
    localStorage: {
      _s: {}, getItem: function (k) { return this._s[k] != null ? this._s[k] : null; },
      setItem: function (k, v) { this._s[k] = String(v); },
      removeItem: function (k) { delete this._s[k]; }
    },
    setTimeout: function () { return 0; },
    setInterval: function () { return 0; },
    clearInterval: function () {},
    MutationObserver: function () { return { observe: function () {}, disconnect: function () {} }; }
  };
  sb.window = sb;
  sb.window.PF = { skip: function () { return false; }, toast: function () {} };
  sb.window.location = { href: 'https://mtcstw.com/', pathname: '/' };
  try {
    vm.createContext(sb);
    vm.runInContext(pillarsSrc, sb, { filename: '31-pillars.js' });
    var api = sb.window.PF.pillars;
    if (!api) { bad('TRACK runtime', 'PF.pillars API not exposed'); return; }
    var labels = api.pillars.map(function (p) { return p.label; });
    if (labels.indexOf('TRACK') !== -1) ok('runtime: PF.pillars exposes TRACK label');
    else bad('TRACK runtime', 'TRACK not in PF.pillars.pillars labels: ' + labels.join(','));
    if (labels.indexOf('DATA') === -1) ok("runtime: no 'DATA' label exposed");
    else bad('TRACK runtime', "'DATA' label still exposed");
    var dests = api.destinations('data');
    if (dests.length && dests[0].url === '/peoples-cpi')
      ok('runtime: DATA pillar primary destination still /peoples-cpi');
    else bad('TRACK runtime', 'data destinations changed: ' + JSON.stringify(dests.map(function (d) { return d.url; })));
    if (dests.some(function (d) { return d.url === '/economy'; }))
      ok('runtime: /economy fallback preserved');
    else bad('TRACK runtime', '/economy fallback missing from data destinations');
    var pillarsCode = stripComments(read(path.join(V143, 'core', '31-pillars.js')));
    /* The dock row renders the PILLARS labels (proven TRACK above) into
       .pp-l spans — renderRow maps orderedPillars() -> pl.label. */
    if (/function renderRow\(\)[\s\S]{0,800}?pl\.label/.test(pillarsCode) ||
        pillarsCode.indexOf('renderRow') !== -1 && /\.pp-l/.test(pillarsCode) &&
        pillarsCode.indexOf('esc(pl.label)') !== -1)
      ok('dock row renders the pillar labels (TRACK shown)');
    else bad('TRACK render', 'renderRow does not emit the pillar labels');
    /* The dock mounts inside the HUD's YOUR CAMPAIGN strip (demoted dock):
       mountRow resolves #pf-hud-strip and inserts the row there. */
    if (pillarsCode.indexOf("getElementById('pf-hud-strip')") !== -1 &&
        /strip\.insertBefore\(row/.test(pillarsCode))
      ok('pillar dock mounts inside the HUD YOUR CAMPAIGN strip');
    else bad('pillar dock', 'mountRow does not insert #pf-pillars into #pf-hud-strip');
  } catch (e) {
    bad('TRACK runtime', '31-pillars.js threw in sandbox: ' + (e && e.message || e));
  }
})();

/* ================= 4. CTA-verb + brand lint (wave files) ================= */
console.log('[4] CTA-verb / brand lint');
(function () {
  ['core/32-hubhome.js', 'core/31-pillars.js'].forEach(function (f) {
    var src = stripComments(read(path.join(V143, f)));
    /* data-pf-path-confirm is a data-attribute name (dialog plumbing in the
       path chooser), not rendered CTA copy — exempt from the pill lint. */
    src = src.replace(/data-pf-path-confirm/g, ' ');
    var banned = [
      [/donate/i, '"donate" (any case)'],
      [/equity/i, '"equity" in CTA copy'],
      [/enlist\s*(\u2192|->)/i, '"ENLIST ->" as a card CTA'],
      [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as a card CTA'],
      [/follow their money\s*(\u2192|->)/i, '"FOLLOW THEIR MONEY ->" as a button'],
      [/\bconfirm\b/i, '"CONFIRM" pill CTA']
    ];
    var hit = false;
    banned.forEach(function (b) {
      if (b[0].test(src)) { bad('CTA lint ' + f, 'banned/rogue verb: ' + b[1]); hit = true; }
    });
    if (!hit) ok('CTA-verb lint clean: ' + f);
  });
  /* red-button rule: only pattern classes carry red — no inline red in hub */
  var hubSrc = stripComments(read(path.join(V143, 'core/32-hubhome.js')));
  if (/#c1121f|#dc143c/i.test(hubSrc)) bad('red-button rule', 'inline red in 32-hubhome.js');
  else ok('red-button rule: hub carries no inline red (patterns CSS owns it)');
  /* trends: gray/white only — no trend semantics anywhere in the wave */
  var wave = hubSrc + stripComments(read(path.join(V143, 'core/31-pillars.js')));
  if (/trend/i.test(wave)) bad('color rule', 'trend semantics in hub wave files');
  else ok('color rule: no trend classes/semantics — trends gray/white by construction');
})();

/* ================= 5. kill switches ================= */
console.log('[5] kill switches');
(function () {
  var checks = [
    ['core/32-hubhome.js', "PF.skip('hubhome')", '?pf_off=hubhome'],
    ['core/31-pillars.js', "PF.skip('pillars')", '?pf_off=pillars'],
    ['core/30-hud.js', "PF.skip('hud')", '?pf_off=hud'],
    ['core/20-nextop.js', "PF.skip('nextop')", '?pf_off=nextop'],
    ['core/24-first-minute.js', "PF.skip('first-mission')", '?pf_off=first-mission'],
    ['pages/home-v2.js', "PF.skip('home-v2')", '?pf_off=home-v2']
  ];
  checks.forEach(function (c) {
    var src = read(path.join(V143, c[0]));
    if (src.indexOf(c[1]) !== -1) ok('kill switch preserved: ' + c[2]);
    else bad('kill switch', c[2] + ' missing from ' + c[0]);
  });
  /* patterns kill fails the hub open (no PF.patterns -> return, no throw) */
  var hubSrc = stripComments(read(path.join(V143, 'core/32-hubhome.js')));
  if (/if\s*\(!P\)\s*return/.test(hubSrc)) ok('patterns kill fails hub open (?pf_off=patterns)');
  else bad('kill switch', 'hub does not fail open when PF.patterns is absent');
})();

/* ================= 6. zero XP / zero writes ================= */
console.log('[6] zero new XP, zero backend writes');
(function () {
  ['core/32-hubhome.js', 'core/31-pillars.js'].forEach(function (f) {
    var src = stripComments(read(path.join(V143, f)));
    var banned = ['xpGrant', 'authPost', 'fetch(', 'XMLHttpRequest', 'sendBeacon'];
    var hits = banned.filter(function (b) { return src.indexOf(b) !== -1; });
    if (hits.length) bad('zero XP/writes ' + f, hits.join(', '));
    else ok('zero XP mechanics, zero writes: ' + f);
  });
})();

/* ================= 7. bundle verification ================= */
console.log('[7] rebuilt bundles contain the redesigned modules');
(function () {
  [['core/bundle-core.js', 'bundle-core.js'],
   ['core/bundle-core-slr.js', 'bundle-core-slr.js']].forEach(function (pair) {
    var p = path.join(V143, pair[0]);
    if (!fs.existsSync(p)) { bad('bundle ' + pair[1], 'not built — run node build/bundle-core.js'); return; }
    var min = read(p);
    var markers = [
      ['pf-anonhero', 'anonymous hero'],
      ['pf-hubhero', 'recognized hub hero'],
      ['pf-pat-ring', 'patterns P5 ring'],
      ['pf-pat-actions', 'patterns P6 action bar'],
      ['pf-pat-intel', 'patterns P2 intel card']
    ];
    var missing = markers.filter(function (m) { return min.indexOf(m[0]) === -1; });
    if (missing.length) bad('bundle ' + pair[1], 'missing: ' + missing.map(function (m) { return m[1]; }).join(', '));
    else ok(pair[1] + ' contains the redesigned hub modules');
    if (/label:"TRACK"/.test(min)) ok(pair[1] + ' contains the TRACK relabel');
    else bad('bundle ' + pair[1], 'TRACK relabel not found in minified output');
  });
  /* build composition: the hub wave files are registered in the build */
  var bc = read(path.join(ROOT, 'build', 'bundle-core.js'));
  ['core/32-hubhome.js', 'core/31-pillars.js', 'core/30-hud.js',
   'core/33-patterns.js', 'core/20-nextop.js'].forEach(function (f) {
    if (bc.indexOf("'" + f + "'") !== -1) ok('build registers ' + f);
    else bad('build composition', f + ' not in build/bundle-core.js');
  });
})();

console.log('\nRESULT: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.error('\nFAILURES:');
  failures.forEach(function (f) { console.error(' - ' + f); });
  process.exit(1);
}
console.log('WS-1 HOMEPAGE HUB GATE: ALL CHECKS GREEN');
