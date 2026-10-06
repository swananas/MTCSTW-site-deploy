#!/usr/bin/env node
/* scripts/verify-teardown-events.js — WS-8 EVENTS / WAR CALENDAR teardown
   verification (section teardown, CEO-approved 2026-10-06). Run from the
   worktree root:
     node scripts/verify-teardown-events.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on master-calendar.js, build/bundle.js, this harness.
   2. Mission-board structure (functional render test with the REAL
      PF.patterns library): Intel Cards (P2) sorted by IMPACT-WEIGHT, the
      impact sort is LABELED ("SORTED BY IMPACT"), and a CHRONOLOGICAL
      TOGGLE (Psych gate) re-sorts chronologically.
   3. Time badges on cards (TODAY / TOMORROW / THIS WEEKEND / THIS WEEK /
      NEXT WEEK).
   4. One-tap RSVP path: DEPLOY -> button (red DEPLOY-family) per event
      card, data-mc="rsvp".
   5. Post-RSVP Action Bar (P6): SHARE THIS INTEL / TAKE THIS TO YOUR CELL /
      REPORT BACK in fixed order + "YOU ARE IN" state.
   6. P8 social proof: real RSVP counts render, zero/missing suppressed.
   7. Every RSVP/CTA resolves to a real destination (href allowlist; no
      javascript:/data:, no empties).
   8. CTA-verb lint clean (rogue-verb map) + red-button rule: only
      DEPLOY-family red buttons, utility buttons ghost, no pf-pat-join.
   9. Kill switches work (vm): PF.skip("mastercal")=true stages nothing.
   10. Zero new XP mechanics / zero new backend writes: RSVP rides the
      PRE-EXISTING irl rail (the same write events.js performs).
   11. Bundle verification: rebuilt minified bundle-events.js contains the
      new markers.
   12. Inner-script gate: scripts/check-inner-scripts.js passes.
   13. Styles sync: build/check-styles-sync.js passes. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MC = path.join(ROOT, 'v1.4.3', 'games', 'master-calendar.js');
var PATTERNS = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-events.js');

var failures = [];
var passes = 0;
function ok(name) { passes++; console.log('  ok: ' + name); }
function bad(name, why) { failures.push(name + ' — ' + why); console.error('  FAIL: ' + name + ' — ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function nodeCheck(p) {
  var r = cp.spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' });
  return r.status === 0 ? null : ((r.stderr || r.stdout || 'syntax error').split('\n')[0]);
}
/* strip block + line comments for source lints (regex-literal-aware: the
   AGENTS.md lesson — run lints on the comment-stripped view WITHOUT naive
   string-stripping). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}
/* The widget stages its inner script inside an outer template literal, so
   regex escapes are doubled in the file and collapse on template evaluation.
   Return the BROWSER's view of the inner script. */
function innerScript(src) {
  var m = src.match(/insertAdjacentHTML\('beforeend', `([\s\S]*?)`\);/);
  if (!m) throw new Error('template literal not found');
  return vm.runInNewContext('`' + m[1] + '`');
}
/* Brace-matching function extractor (robust to single-line functions and
   braces inside the function body). */
function extractFns(inner, names) {
  var out = {};
  names.forEach(function (n) {
    var re = new RegExp('function ' + n + '\\(');
    var m = re.exec(inner);
    if (!m) throw new Error('fn missing: ' + n);
    var j = inner.indexOf('{', m.index);
    if (j < 0) throw new Error('no body brace: ' + n);
    var depth = 0, k;
    for (k = j; k < inner.length; k++) {
      var ch = inner.charAt(k);
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) throw new Error('unbalanced braces: ' + n);
    out[n] = inner.slice(m.index, k + 1);
  });
  return out;
}
function extractVar(inner, name) {
  var m = inner.match(new RegExp('var ' + name + '=\\{[\\s\\S]*?\\};'));
  if (!m) throw new Error('var missing: ' + name);
  return m[0];
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[MC, path.join(ROOT, 'build', 'bundle.js'), __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check ' + path.basename(p), err); else ok('node --check ' + path.basename(p));
});

var src = read(MC);
var code = stripComments(src);
var inner;
try { inner = innerScript(src); ok('inner script extracted (browser view)'); }
catch (e) { bad('inner script extraction', e.message); }

/* ================= 2. mission-board structure (functional) ================= */
console.log('[2] mission-board structure (impact sort + labels + toggle)');
var T = null;
if (inner) {
  try {
    var sb = { window: { PF: { skip: function () { return false; } } } };
    vm.createContext(sb);
    vm.runInContext(read(PATTERNS), sb); /* real PF.patterns */
    var fns = extractFns(inner, ['esc', 'chiParts', 'chiWeekday', 'mcPat', 'mcBadge',
      'mcImpact', 'mcProof', 'mcActionBar', 'mcHero', 'evCard', 'calCard',
      'mcBoardHtml', 'sortBarHtml', 'tabsHtml', 'chiDate']);
    var prelude = extractVar(inner, 'KIND_LABEL') + '\n' +
      extractVar(inner, 'KIND_W') + '\nvar rsvpd={}, sortMode="impact";\n';
    var driver = prelude +
      Object.keys(fns).map(function (k) { return fns[k]; }).join('\n') +
      '\n;({impact:mcImpact,badge:mcBadge,hero:mcHero,ev:evCard,cal:calCard,' +
      'board:mcBoardHtml,sortbar:sortBarHtml,tabs:tabsHtml,proof:mcProof,' +
      'actionbar:mcActionBar,weekday:chiWeekday});';
    T = vm.runInContext(driver, sb);
    ok('render functions evaluated with real PF.patterns');
  } catch (e) { bad('render harness', e.message); }
}
var NOW = Date.now();
var CAL = [
  { src: 'cal', kind: 'warreport', title: 'War Report Monday', ts: NOW + 3 * 864e5, url: '/events#pf-warreport', dateLabel: 'Mon', detail: '' },
  { src: 'cal', kind: 'offensive', title: 'Midterm Blitz push', ts: NOW + 36e5, url: '/events', dateLabel: 'Today', detail: '' }
];
var EV = [
  { src: 'event', id: 'ev1', title: 'Rally at the Capitol', ts: NOW + 5 * 864e5, type: 'rally', location: 'Baton Rouge, LA', rsvp_count: 214, desc: '' },
  { src: 'event', id: 'ev2', title: 'Phonebank night', ts: NOW + 2 * 864e5, type: 'phonebank', location: '', rsvp_count: 0, desc: '' }
];
if (T) {
  try {
    /* impact weights: ev1 = 100+15+25 = 140; offensive = 90+30 = 120;
       ev2 = 100+15+0 = 115; warreport = 60+15 = 75 */
    if (T.impact(EV[0]) === 140) ok('mcImpact: street event w/ momentum = 140');
    else bad('mcImpact street event', 'expected 140, got ' + T.impact(EV[0]));
    if (T.impact(CAL[1]) === 120) ok('mcImpact: imminent offensive = 120');
    else bad('mcImpact offensive', 'expected 120, got ' + T.impact(CAL[1]));
    if (T.impact({ src: 'cal', kind: 'discord', ts: NOW - 1000 }) === -100000)
      ok('mcImpact: past items score off the board');
    else bad('mcImpact past', 'past item not excluded');
    if (T.impact({ src: 'event', id: 'x', ts: NOW + 2 * 864e5, rsvp_count: 9999 }) === 140)
      ok('mcImpact: momentum capped at +25 (no runaway)');
    else bad('mcImpact cap', 'got ' + T.impact({ src: 'event', id: 'x', ts: NOW + 2 * 864e5, rsvp_count: 9999 }));

    /* impact sort order: ev1(140) > offensive(120) > ev2(115) > warreport(75) */
    var bh = T.board(CAL, EV, 'impact');
    var i1 = bh.indexOf('Rally at the Capitol'), i2 = bh.indexOf('Midterm Blitz push'),
        i3 = bh.indexOf('Phonebank night'), i4 = bh.indexOf('War Report Monday');
    if (i1 > -1 && i2 > -1 && i3 > -1 && i4 > -1 && i1 < i2 && i2 < i3 && i3 < i4)
      ok('board sorted by IMPACT-WEIGHT (not chronology)');
    else bad('impact sort order', 'cards out of impact order');
    /* chrono toggle: offensive(1h) > ev2(2d) > warreport(3d) > ev1(5d) */
    var ch = T.board(CAL, EV, 'chrono');
    var c1 = ch.indexOf('Midterm Blitz push'), c2 = ch.indexOf('Phonebank night'),
        c3 = ch.indexOf('War Report Monday'), c4 = ch.indexOf('Rally at the Capitol');
    if (c1 > -1 && c2 > -1 && c3 > -1 && c4 > -1 && c1 < c2 && c2 < c3 && c3 < c4)
      ok('chronological toggle re-sorts by time');
    else bad('chrono sort order', 'cards out of chronological order');
    /* sort label + toggle (Psych gate: labeled, reversible, user-controlled) */
    var sb2 = T.sortbar();
    if (sb2.indexOf('SORTED BY IMPACT') > -1 && sb2.indexOf('data-mc="sort"') > -1)
      ok('impact sort LABELED + chronological toggle present');
    else bad('sort label/toggle', 'missing SORTED BY IMPACT label or toggle');
    /* P1 hero */
    var hh = T.hero();
    if (hh.indexOf('pf-pat-hero') > -1 && hh.indexOf('WAR CALENDAR') > -1 &&
        hh.indexOf('Pick your fight') > -1)
      ok('Briefing Hero (P1): WAR CALENDAR / Pick your fight');
    else bad('P1 hero', 'missing hero/kicker/mission');
    /* P2 intel cards */
    var cards = (bh.match(/<article class="pf-pat pf-pat-intel/g) || []).length;
    if (cards === 4) ok('4 Intel Cards (P2) rendered');
    else bad('intel card count', 'expected 4, got ' + cards);
    /* tabs: MISSION BOARD + MAP */
    var tb = T.tabs();
    if (tb.indexOf('MISSION BOARD') > -1 && tb.indexOf('MAP') > -1 &&
        tb.indexOf('data-mc="tab-map"') > -1)
      ok('tabs: MISSION BOARD + MAP (second tab)');
    else bad('tabs', 'missing board/map tabs');
    /* XSS: hostile backend text is escaped */
    var evil = T.ev({ src: 'event', id: 'ex', title: '<script>alert(1)</script>', ts: NOW + 864e5, type: 'x', location: '', rsvp_count: 0, desc: '' });
    if (evil.indexOf('<script>') === -1 && evil.indexOf('&lt;script&gt;') > -1)
      ok('rendered cards escape hostile backend text');
    else bad('XSS escaping', 'raw <script> in rendered card');
  } catch (e) { bad('functional board', e.message); }
}

/* ================= 3. time badges ================= */
console.log('[3] time badges');
if (T) {
  try {
    if (T.badge(NOW) === 'TODAY') ok('badge: TODAY');
    else bad('badge TODAY', 'got ' + T.badge(NOW));
    if (T.badge(NOW + 864e5) === 'TOMORROW') ok('badge: TOMORROW');
    else bad('badge TOMORROW', 'got ' + T.badge(NOW + 864e5));
    /* find the next Saturday within 7 days */
    var wk = -1;
    for (var d = 2; d <= 7; d++) { if (T.weekday(NOW + d * 864e5) === 6) { wk = d; break; } }
    if (wk > 0 && T.badge(NOW + wk * 864e5) === 'THIS WEEKEND') ok('badge: THIS WEEKEND');
    else bad('badge THIS WEEKEND', 'got ' + (wk > 0 ? T.badge(NOW + wk * 864e5) : 'no saturday found'));
    if (T.badge(NOW + 10 * 864e5) === 'NEXT WEEK') ok('badge: NEXT WEEK');
    else bad('badge NEXT WEEK', 'got ' + T.badge(NOW + 10 * 864e5));
    var bh3 = T.board(CAL, EV, 'impact');
    if (bh3.indexOf('mc-tbadge') > -1) ok('badges rendered on cards (mc-tbadge)');
    else bad('card badges', 'no mc-tbadge in board HTML');
  } catch (e) { bad('time badges', e.message); }
}

/* ================= 4. one-tap RSVP ================= */
console.log('[4] one-tap RSVP as DEPLOY ->');
if (T) {
  try {
    var ec = T.ev(EV[0]);
    if (ec.indexOf('data-mc="rsvp"') > -1 && ec.indexOf('DEPLOY') > -1 &&
        ec.indexOf('pf-pat-deploy-red') > -1)
      ok('event card: one-tap RSVP (DEPLOY ->, red DEPLOY-family button)');
    else bad('RSVP button', 'missing data-mc=rsvp / DEPLOY / pf-pat-deploy-red');
    if (ec.indexOf('+50 XP') > -1) ok('XP reward line on event card (+50 XP, display only)');
    else bad('XP reward line', 'missing +50 XP on event card');
    var cc = T.cal(CAL[0]);
    if (cc.indexOf('+50 XP') === -1) ok('calendar cards carry no XP line (no invented rewards)');
    else bad('calendar XP', 'calendar card shows an XP line');
  } catch (e) { bad('RSVP path', e.message); }
}

/* ================= 5. post-RSVP Action Bar ================= */
console.log('[5] post-RSVP Action Bar (P6)');
if (T) {
  try {
    /* flip the RSVP state the way doRsvp() does, then re-render */
    var drv = 'rsvpd["ev1"]=1;\nevCard(' + JSON.stringify(EV[0]) + ');';
    var sbx = { window: { PF: { skip: function () { return false; } } } };
    vm.createContext(sbx);
    vm.runInContext(read(PATTERNS), sbx);
    var fns2 = extractFns(inner, ['esc', 'chiParts', 'chiWeekday', 'mcPat', 'mcBadge',
      'mcImpact', 'mcProof', 'mcActionBar', 'evCard', 'chiDate']);
    var pre2 = extractVar(inner, 'KIND_LABEL') + '\n' + extractVar(inner, 'KIND_W') +
      '\nvar rsvpd={}, sortMode="impact";\n';
    var post = vm.runInContext(pre2 + Object.keys(fns2).map(function (k) { return fns2[k]; }).join('\n') +
      '\n' + drv, sbx);
    var p1 = post.indexOf('SHARE THIS INTEL'), p2 = post.indexOf('TAKE THIS TO YOUR CELL'),
        p3 = post.indexOf('REPORT BACK');
    if (post.indexOf('pf-pat-actions') > -1 && p1 > -1 && p2 > p1 && p3 > p2)
      ok('Action Bar (P6) in fixed order: SHARE / CELL / REPORT BACK');
    else bad('Action Bar', 'missing or out of order');
    if (post.indexOf('YOU ARE IN') > -1 && post.indexOf('data-mc="rsvp"') === -1)
      ok('post-RSVP: RSVP button replaced by YOU ARE IN state');
    else bad('post-RSVP state', 'button not swapped');
    if (post.indexOf('href="/events#e=ev1"') > -1 && post.indexOf('href="/cells"') > -1)
      ok('Action Bar destinations: /events#e=ev1 (share + report) + /cells');
    else bad('Action Bar destinations', 'share/cell/report hrefs wrong');
  } catch (e) { bad('post-RSVP Action Bar', e.message); }
}

/* ================= 6. P8 social proof honesty ================= */
console.log('[6] P8 social proof (real-or-suppressed)');
if (T) {
  try {
    var p214 = T.ev(EV[0]);
    if (p214.indexOf('214') > -1 && p214.indexOf('soldiers deployed') > -1 &&
        p214.indexOf('pf-pat-proof') > -1)
      ok('real RSVP count renders via P8 (214 soldiers deployed)');
    else bad('P8 real count', '214 / proof line missing');
    var p0 = T.ev(EV[1]);
    if (p0.indexOf('soldiers deployed') === -1)
      ok('zero RSVPs: proof line suppressed (never invented)');
    else bad('P8 suppression', 'proof rendered for zero count');
    /* library-level honesty */
    var sbp = { window: { PF: { skip: function () { return false; } } } };
    vm.createContext(sbp);
    vm.runInContext(read(PATTERNS), sbp);
    var proof = vm.runInContext('window.PF.patterns.proof', sbp);
    if (proof({ count: 214, text: 'soldiers deployed' }).indexOf('214') > -1 &&
        proof({ count: 0, text: 'x' }) === '' && proof({ text: 'x' }) === '')
      ok('P8 proof(): real counts render, zero/missing suppressed');
    else bad('P8 proof()', 'honesty behavior broken');
  } catch (e) { bad('P8', e.message); }
}

/* ================= 7. CTA destinations resolve ================= */
console.log('[7] every RSVP/CTA resolves to a real destination');
if (T) {
  try {
    var html = T.board(CAL, EV, 'impact');
    /* RSVP is a same-rail POST (button, not a link) — DETAILS opens the
       event detail where RSVP/field-reports live; calendar cards link out. */
    var seen = {}, badness = [];
    var re = /href="([^"]*)"/g, m;
    while ((m = re.exec(html))) {
      var h = m[1];
      if (seen[h]) continue; seen[h] = 1;
      if (/^(javascript|data|vbscript):/i.test(h)) { badness.push(h + ' (dangerous scheme)'); continue; }
      if (!h || h === '#') { badness.push('(empty/bare # href)'); continue; }
      if (h === '/events' || h === '/cells') continue;
      if (/^#e=[\w-]+$/.test(h)) continue;            /* events-silo deep link */
      if (/^\/events#e=[\w-]+$/.test(h)) continue;    /* share/report-back deep link */
      if (/^\/events#pf-[\w-]+$/.test(h)) continue;  /* on-page section anchor */
      if (/^https?:\/\/[^\s<>"']+$/.test(h)) continue; /* well-formed out-link */
      badness.push(h + ' (not a verified destination)');
    }
    if (!badness.length) ok('all ' + Object.keys(seen).length + ' hrefs resolve to real destinations');
    else bad('dead/unknown hrefs', badness.join('; '));
  } catch (e) { bad('CTA destinations', e.message); }
}

/* ================= 8. CTA-verb lint + red-button rule ================= */
console.log('[8] CTA-verb lint + red-button rule');
[['no "donate" in CTA copy', /donate/i],
 ['no "ENLIST ->" card CTA', /ENLIST\s*->/],
 ['no "CALL IT ->" card CTA', /CALL\s*IT\s*->/],
 ['no CONFIRM pill', /CONFIRM/],
 ['no "equity" in CTA copy', /equity/i]].forEach(function (pair) {
  if (pair[1].test(code)) bad(pair[0], 'rogue verb present'); else ok(pair[0]);
});
if (code.indexOf('JOIN THE FIGHT.') > -1) bad('JOIN THE FIGHT.', 'enlistment CTA present — RSVP is callsign-gated');
else ok('no JOIN THE FIGHT. (callsign-gated surface)');
if (/class="c-btn"(?! ghost)/.test(code)) bad('red-button rule', 'bare red .c-btn still present');
else ok('red-button rule: no bare red .c-btn (ghost or DEPLOY-family only)');
if (code.indexOf('pf-pat-join') > -1) bad('pf-pat-join', 'enlistment button present');
else ok('no pf-pat-join (enlistment CTA absent, as required)');
/* every <button> in the inner script is sanctioned: DEPLOY-family red,
   ghost utility, or the map/board tabs */
(function () {
  var btns = inner.match(/<button[^>]*>/g) || [];
  var rogue = btns.filter(function (b) {
    return b.indexOf('pf-pat-deploy-red') === -1 && b.indexOf('c-btn ghost') === -1 &&
      b.indexOf('mc-tab') === -1;
  });
  if (!rogue.length) ok('all ' + btns.length + ' buttons sanctioned (deploy-red / ghost / mc-tab)');
  else bad('button audit', 'unsanctioned buttons: ' + rogue.join(' | '));
})();

/* ================= 9. kill switches ================= */
console.log('[9] kill switches');
(function () {
  function runOuter(skipVal) {
    var staged = [];
    var sb = { window: { PF: { skip: function () { return skipVal; },
      holder: function () { return { insertAdjacentHTML: function (p, h) { staged.push(h); } }; } } } };
    vm.createContext(sb);
    vm.runInContext(src, sb);
    return staged;
  }
  var off = runOuter(true), on = runOuter(false);
  if (off.length === 0) ok('?pf_off=mastercal stages nothing (fail-open on kill)');
  else bad('kill switch', 'staged ' + off.length + ' templates while killed');
  if (on.length === 1 && on[0].indexOf('pf-ov-mastercal') > -1) ok('enabled module stages pf-ov-mastercal');
  else bad('staging', 'template not staged when enabled');
})();
if (/PF\.skip\(['"]mastercal['"]\)/.test(code)) ok('PF.skip("mastercal") gate present');
else bad('kill gate', 'PF.skip("mastercal") missing');

/* ================= 10. zero new XP / zero new backend writes ================= */
console.log('[10] zero new XP mechanics / zero new backend writes');
if (/xpGrant|mintXp|grantXp/i.test(code)) bad('XP mechanics', 'mint/grant call present');
else ok('zero new XP mechanics (+50 XP is display-only, minted by the irl rail)');
if (/'event_rsvp'/.test(code) && /type:'irl'/.test(code))
  ok('RSVP rides the PRE-EXISTING irl rail (same write events.js performs)');
else bad('RSVP rail', 'not on the pre-existing irl rail');
var posts = (code.match(/postIrl\(/g) || []).length;
if (posts === 2) ok('postIrl: definition + 1 call site (no new write actions)');
else bad('postIrl call sites', 'expected 2, got ' + posts);

/* ================= 11. bundle verification ================= */
console.log('[11] bundle verification');
if (!fs.existsSync(BUNDLE)) { bad('bundle-events.js', 'missing'); }
else {
  var b = read(BUNDLE);
  if (b.indexOf('!function') === 0) ok('bundle is minified');
  else bad('bundle minification', 'does not start with !function');
  /* markers are master-calendar.js SOURCE literals (terser preserves them;
     pf-pat-* class strings are runtime-generated by the patterns library,
     so assert the literal class names the widget emits instead). */
  ['SORTED BY IMPACT', 'MISSION BOARD', 'mc-tbadge', 'mcBoardHtml',
   'event_rsvp', 'SHARE THIS INTEL', 'TAKE THIS TO YOUR CELL', 'REPORT BACK',
   'pf-pat-intel', 'pf-ov-mastercal', 'THIS WEEKEND'].forEach(function (marker) {
    if (b.indexOf(marker) > -1) ok('bundle contains "' + marker + '"');
    else bad('bundle marker', 'missing "' + marker + '"');
  });
  var berr = nodeCheck(BUNDLE);
  if (berr) bad('node --check bundle-events.js', berr); else ok('node --check bundle-events.js');
}

/* ================= 12. inner-script gate ================= */
console.log('[12] inner-script gate');
var r12 = cp.spawnSync(process.execPath,
  [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), MC], { encoding: 'utf8' });
if (r12.status === 0) ok('check-inner-scripts.js passes');
else bad('check-inner-scripts.js', (r12.stderr || r12.stdout || 'failed').split('\n')[0]);

/* ================= 13. styles sync ================= */
console.log('[13] styles sync');
var r13 = cp.spawnSync(process.execPath,
  [path.join(ROOT, 'build', 'check-styles-sync.js')], { encoding: 'utf8', cwd: ROOT });
if (r13.status === 0) ok('check-styles-sync.js passes');
else bad('check-styles-sync.js', (r13.stderr || r13.stdout || 'failed').split('\n')[0]);

/* ================= summary ================= */
console.log('\nverify-teardown-events: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.error('\nFAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
