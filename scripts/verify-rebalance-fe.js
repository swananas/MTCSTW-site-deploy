#!/usr/bin/env node
/* scripts/verify-rebalance-fe.js — XP Rebalance frontend verification harness
   (wave-xp-rebalance-fe, 2026-10-05). Run from the worktree root:
     node scripts/verify-rebalance-fe.js
   AFTER rebuilding bundles: node build/bundle.js
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

var DO = path.join(G, 'daily-orders.js');
var ER = path.join(G, 'enlistment-ranks.js');
var VL = path.join(G, 'vault.js');
var SEC1 = path.join(G, 'bundle-sec1.js');
var BANK = path.join(G, 'bundle-bank.js');

console.log('== 1. node --check on touched files ==');
[DO, ER, VL].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f)); }
  catch (e) { no(path.basename(f), 'node --check failed'); }
});

console.log('== 2. daily-orders.js — REPORT BACK cut 50 -> 25 ==');
var doSrc = read(DO);
if (/var\s+PER_DAY=3,\s*BASE_XP=5,\s*DAILY_MAX=25;/.test(doSrc)) ok('BASE_XP===5, DAILY_MAX===25');
else no('BASE_XP/DAILY_MAX', 'constants line is not BASE_XP=5, DAILY_MAX=25');
if (doSrc.indexOf('3 orders (5 XP each)') !== -1 && doSrc.indexOf('caps at 25 XP a day') !== -1)
  ok('copy: "5 XP each" + "25 XP a day"');
else no('copy note', 'note line missing "5 XP each" or "25 XP a day"');
if (doSrc.indexOf('3 orders (10 XP each)') === -1 && doSrc.indexOf('caps at 50 XP a day') === -1)
  ok('no stale 10-XP/50-cap copy');
else no('stale copy', 'old "10 XP each" or "50 XP a day" text still present');
if (/var\s+OP_XP=5,\s*CMD_XP=5;/.test(doSrc)) ok('OP_XP=5, CMD_XP=5 unchanged');
else no('OP_XP/CMD_XP', 'op/command XP must stay 5');
if (doSrc.indexOf('DAILY_XP_CAP') === -1) ok('shared DAILY_XP_CAP untouched');
else no('DAILY_XP_CAP', 'daily-orders.js must not touch the shared pool cap');
/* math: 3x5 + op 5 + cmd 5 = 25 = DAILY_MAX */
var m = /BASE_XP=(\d+),\s*DAILY_MAX=(\d+)/.exec(doSrc);
var o = /var\s+OP_XP=(\d+),\s*CMD_XP=(\d+)/.exec(doSrc);
if (m && o && (3 * Number(m[1]) + Number(o[1]) + Number(o[2])) === Number(m[2])) ok('math: 3xBASE_XP + OP + CMD = DAILY_MAX');
else no('math', '3xBASE_XP + OP_XP + CMD_XP must equal DAILY_MAX');

console.log('== 3. enlistment-ranks.js — silent-award receipt toasts ==');
var erSrc = read(ER);
var TOASTS = [
  'VOTE COUNTED — +10 XP', 'CAPTION IN — +10 XP',
  'POSTER LOGGED — +1 XP', 'SHARE LOGGED — +1 XP',
  'DROP CLAIMED — +1 XP', 'CHALLENGE DONE — +15 XP',
  'FULL SPECTRUM — +20 XP'
];
TOASTS.forEach(function (t) {
  if (erSrc.indexOf(t) === -1) { no('toast ' + t, 'string missing'); return; }
  /* the toast must sit on the same line as its gain>0 gate (one-liner listeners) */
  var gated = erSrc.split('\n').some(function (l) {
    return l.indexOf(t) !== -1 && l.indexOf('if(gain>0)') !== -1;
  });
  if (gated) ok('toast gated: ' + t);
  else no('toast gate ' + t, 'toast present but not gated on gain>0');
});
/* award amounts must be unchanged (delivery only) */
[['fanvote_', 10], ['caption_', 10], ['dochall_', 15], ['dospec_', 20]].forEach(function (p) {
  if (new RegExp("award\\(\"" + p[0] + "\"\\+w," + p[1] + ',').test(erSrc)) ok('amount unchanged: ' + p[0] + '+' + p[1]);
  else no('amount ' + p[0], 'expected award("' + p[0] + '"+w,' + p[1] + ')');
});
[['poster_', 'award("poster_"+today(),1,"once")'],
 ['share', 'award("share",1,"daily")'],
 ['drop_', 'award("drop_"+d,1,"once")']].forEach(function (p) {
  if (erSrc.indexOf(p[1]) !== -1) ok('amount unchanged: ' + p[0] + ' +1');
  else no('amount ' + p[0], 'expected ' + p[1]);
});

console.log('== 4. vault.js — no user-facing promise of bond XP ==');
var vlSrc = read(VL);
if (vlSrc.indexOf('cap-hit day') === -1 && vlSrc.indexOf('stays claimable via bond_claim') === -1)
  ok('cap-hit/bond_claim promise gone');
else no('stale bond copy', 'cap-hit/bond_claim promise still present');
['50 XP</option>', '100 XP</option>', '250 XP</option>', '500 XP</option>',
 '$5 &mdash; 50 XP', '$10 &mdash; 100 XP'].forEach(function (s) {
  if (vlSrc.indexOf(s) === -1) ok('tier XP label gone: ' + s.slice(0, 22));
  else no('tier label ' + s, 'still promises bond XP');
});
if (vlSrc.indexOf('War Bond XP retired') !== -1) ok('retirement copy present');
else no('retirement copy', '"War Bond XP retired" not found');
if (/Number\(j\.xp_granted\|\|0\)/.test(vlSrc)) ok('renders backend xp_granted honestly');
else no('xp_granted render', 'claim result must render the backend xp_granted value');

console.log('== 5. backslash sweep on touched files ==');
/* every backslash must open a valid JS escape (\n \t \\ \" \' \uXXXX etc.),
   or terminate a line (continuation). */
var VALID = { n: 1, t: 1, r: 1, b: 1, f: 1, v: 1, '0': 1, x: 1, u: 1, "'": 1, '"': 1, '\\': 1, '/': 1,
  /* regex shorthand classes (\s \S \d \D \w \W \B) — valid inside /.../ literals */
  s: 1, S: 1, d: 1, D: 1, w: 1, W: 1, B: 1 };
[DO, ER, VL].forEach(function (f) {
  var bad = [];
  read(f).split('\n').forEach(function (l, i) {
    for (var j = 0; j < l.length; j++) {
      if (l[j] !== '\\') continue;
      var nxt = l[j + 1];
      if (nxt === undefined) continue; /* line continuation — valid */
      if (!VALID[nxt]) { bad.push((i + 1) + ':' + l.trim().slice(0, 80)); break; }
    }
  });
  if (!bad.length) ok('backslashes clean: ' + path.basename(f));
  else no('backslashes ' + path.basename(f), bad.slice(0, 3).join(' | '));
});

console.log('== 6. rebuilt bundles carry the changes ==');
if (read(SEC1).indexOf('3 orders (5 XP each)') !== -1 && read(SEC1).indexOf('25 XP a day') !== -1)
  ok('bundle-sec1: daily-orders cut');
else no('bundle-sec1', 'missing daily-orders cut markers');
var missing = TOASTS.filter(function (t) { return read(SEC1).indexOf(t) === -1; });
if (!missing.length) ok('bundle-sec1: all 7 toasts');
else no('bundle-sec1 toasts', 'missing: ' + missing.join(', '));
if (read(BANK).indexOf('War Bond XP retired') !== -1 && read(BANK).indexOf('cap-hit day') === -1)
  ok('bundle-bank: bond XP delink');
else no('bundle-bank', 'missing vault copy markers');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
process.exit(fails.length ? 1 : 0);
