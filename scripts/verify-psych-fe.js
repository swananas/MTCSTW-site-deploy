#!/usr/bin/env node
/* scripts/verify-psych-fe.js — Psych Fix Pod frontend verification harness
   (Specs 3, 4, 7-FE, 8, 9, 10 — 2026-10-05). Run from the worktree root:
     node scripts/verify-psych-fe.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function noComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

var ER = path.join(G, 'enlistment-ranks.js');
var MQ = path.join(G, 'slr-match-quiz.js');
var BR = path.join(G, 'briefing.js');
var DO = path.join(G, 'daily-orders.js');
var NT = path.join(G, 'notify.js');
var SEC1 = path.join(G, 'bundle-sec1.js');
var HOME = path.join(G, 'bundle-home.js');
var ARH = path.join(G, 'bundle-arcade-h.js');
var PAGES = path.join(V, 'pages', 'bundle-pages.js');

console.log('== 1. node --check on touched files ==');
[ER, MQ, BR, DO, NT].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f)); }
  catch (e) { no(path.basename(f), 'node --check failed'); }
});

var er = read(ER), mq = read(MQ), br = read(BR), doSrc = read(DO), nt = read(NT);

console.log('== 2. Spec 3 — silent XP receipts get toasts (no new XP) ==');
if (/pf-bracket-ballot[\s\S]{0,200}BALLOT IN — \+10 XP/.test(er)) ok('bracket-ballot toast "BALLOT IN — +10 XP"');
else no('bracket-ballot toast', 'missing');
if (/pf-traitor-vote[\s\S]{0,200}TRAITOR VOTE — \+5 XP/.test(er)) ok('traitor-vote toast "TRAITOR VOTE — +5 XP"');
else no('traitor-vote toast', 'missing');
if (has(er, 'award("bracket_"+w,10,"once"') && has(er, 'award("traitor_"+w,5,"once"'))
  ok('award amounts unchanged (10 / 5 — visibility only, no new XP)');
else no('award amounts', 'bracket/traitor award amounts changed');
if ((er.match(/var gain=award\("bracket_/g) || []).length === 1 &&
    (er.match(/var gain=award\("traitor_/g) || []).length === 1)
  ok('receipt toasts are gain-gated (toast only when XP actually lands)');
else no('gain gating', 'toast not gated on award gain');

console.log('== 3. Spec 4 — quiz finale routes into the enlist flow ==');
if (has(er, 'var QUIZ_COMPLETE_XP=0;')) ok('named constant QUIZ_COMPLETE_XP=0 (Economy Desk TBD)');
else no('QUIZ_COMPLETE_XP', 'named constant missing or non-zero');
if (has(er, 'pf-quiz-enlisted') && /pf-quiz-enlisted[\s\S]{0,220}quiz_enlist/.test(er))
  ok('pf-quiz-enlisted listener awards quiz_enlist');
else no('pf-quiz-enlisted listener', 'missing');
if (has(mq, 'PF.requireCallsign') && /requireCallsign\(function\(cs\)/.test(mq))
  ok('finale CTA calls PF.requireCallsign');
else no('requireCallsign', 'finale does not route through callsign claim');
if (/context:"to lock in your "\+A\.name\+" archetype"/.test(mq)) ok('claim context names the archetype');
else no('claim context', 'missing archetype context');
if (has(mq, 'pf_mq_enlist_v1')) ok('enlistment stashed in localStorage pf_mq_enlist_v1');
else no('enlist stash', 'missing');
if (has(mq, 'pf-quiz-enlisted')) ok('finale dispatches pf-quiz-enlisted on claim');
else no('pf-quiz-enlisted dispatch', 'missing');
if (/document\.hasFocus\(\)/.test(mq) && /},700\)/.test(mq))
  ok('mailto fallback keeps the caption-combat focus-check (700ms)');
else no('focus-check', 'mailto fallback missing hasFocus/700ms guard');
if (has(mq, 'pf-mq-maillink') && has(mq, 'pf-mq-mailfb')) ok('mailto survives as a fallback link row');
else no('mailto fallback row', 'missing');
var mailtoUses = (mq.match(/window\.location\.href="mailto:mtcstw@gmail\.com\?subject=SLR/g) || []).length;
if (mailtoUses === 1 && has(mq, '}else{ mqMailto(em,msg); }'))
  ok('mailto is no longer the primary path (single use, inside the mqMailto fallback)');
else no('mailto primary', 'mailto used ' + mailtoUses + 'x or fallback call missing');

console.log('== 4. Spec 7 FE — market winner deep-link ==');
if (has(nt, "market:'/arcade#pf-forecasts'")) ok("TYPE_DEEP market -> '/arcade#pf-forecasts'");
else no('market deep-link', 'missing from TYPE_DEEP');

console.log('== 5. Spec 8 — comeback routes to Daily Orders ==');
var comebackBlock = br.match(/data-act='comeback'[\s\S]*?}\s*}\s*\)\);/);
if (comebackBlock && /getElementById\("pf-orders"\)/.test(comebackBlock[0]) &&
    /pf-flash/.test(comebackBlock[0]) && /scrollIntoView|scrollTo/.test(comebackBlock[0]))
  ok('comeback_claim scrolls to #pf-orders and flashes it');
else no('comeback routing', 'no #pf-orders scroll+flash in the comeback handler');
if (comebackBlock && !/toast\("Welcome back\.[^}]*load\(\);/.test(comebackBlock[0].replace(/setTimeout\([\s\S]*$/, '')))
  ok('toast + bare reload pattern is gone (load() now feeds the routing)');
else no('toast+reload', 'old pattern may remain');

console.log('== 6. Spec 9 — nuke in the Daily Orders rotation ==');
if (has(doSrc, 'nuke:1') && /CHARGE THE NUKE — one deliberate press feeds the network charge pool \(\+50 charge, \+5 XP\)\. The nuke can't be bought\./.test(doSrc))
  ok('nuke mission appended with honest strip-mirroring copy');
else no('nuke mission', 'missing or copy drifted');
if (has(doSrc, 'o-nukego') && has(doSrc, 'GO TO THE NUKE')) ok('nuke deep-link button rendered + wired');
else no('o-nukego', 'missing');
if (has(doSrc, 'pf_nuke_stick_hide') && has(doSrc, 'getElementById("slr-nuke")'))
  ok('deep-link respects the stick dismissal flag, falls back to #slr-nuke');
else no('nuke deep-link fallback', 'missing dismissal respect or #slr-nuke fallback');
if (has(doSrc, 'pf-nuke-update') && has(doSrc, 'armNukeMission'))
  ok('press auto-completes the mission via pf-nuke-update');
else no('nuke auto-complete', 'missing listener');
if (/armNukeMission[\s\S]{0,2000}checkin\(target,null\)/.test(doSrc))
  ok('auto-complete uses the standard checkin path (same daily pool)');
else no('nuke checkin path', 'not routed through checkin()');

console.log('== 7. Spec 10 — streak multiplier visibility ==');
if (has(doSrc, 'c:cellMult')) ok('done entries capture cellMult');
else no('cellMult capture', 'missing');
if (has(doSrc, 'function fmtMult(c)')) ok('fmtMult helper present');
else no('fmtMult', 'missing');
if (/cell streak/.test(doSrc) && /×/.test(doSrc)) ok('award line renders the (×N.NN cell streak) tag');
else no('multiplier tag', 'missing from award line');
if (/Math\.round\(BASE_XP\*Math\.max\(1,multNow\)\)/.test(doSrc))
  ok('pending missions preview the multiplied want');
else no('pending preview', 'missing');

console.log('== 8. bundle propagation ==');
var sec1 = read(SEC1);
[['o-nukego', 'sec1: nuke button'], ['pf-quiz-enlisted', 'sec1: quiz-enlisted listener'],
 ['QUIZ_COMPLETE_XP', 'sec1: QUIZ_COMPLETE_XP'], ['BALLOT IN', 'sec1: ballot toast'],
 ['pf-nuke-update', 'sec1: nuke auto-complete'], ['cell streak', 'sec1: mult tag'],
 ['pf-orders', 'sec1: Spec 8 routing target']].forEach(function (pair) {
  if (has(sec1, pair[0])) ok(pair[1]); else no(pair[1], 'not in bundle-sec1.js');
});
var home = read(HOME), arh = read(ARH);
[['mqMailto', 'home: mqMailto'], ['pf-mq-mailfb', 'home: fallback row']].forEach(function (pair) {
  if (has(home, pair[0])) ok(pair[1]); else no(pair[1], 'not in bundle-home.js');
});
[['mqMailto', 'arcade-h: mqMailto'], ['pf-mq-mailfb', 'arcade-h: fallback row']].forEach(function (pair) {
  if (has(arh, pair[0])) ok(pair[1]); else no(pair[1], 'not in bundle-arcade-h.js');
});
var pages = read(PAGES);
if (has(pages, "market:'/arcade#pf-forecasts'")) ok('pages: market deep-link');
else no('pages: market deep-link', 'not in bundle-pages.js');

console.log('== 9. banned terms on touched files ==');
[ER, MQ, BR, DO, NT].forEach(function (f) {
  var clean = noComments(read(f));
  if (/\bdonat(e|ion|ions)\b/i.test(clean)) no(path.basename(f), '"donate" family found');
  else ok(path.basename(f) + ' clean');
});

console.log('');
console.log(passes + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
