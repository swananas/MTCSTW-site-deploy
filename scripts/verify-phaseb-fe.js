#!/usr/bin/env node
/* scripts/verify-phaseb-fe.js — Phase B frontend verification harness
   (Redistribution Layer, 2026-10-05). Run from the worktree root:
     node scripts/verify-phaseb-fe.js
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
function has(p, s) { return read(p).indexOf(s) !== -1; }
function grepHits(p, re) {
  var out = [];
  read(p).split('\n').forEach(function (l, i) {
    if (re.test(l)) out.push((i + 1) + ':' + l.trim().slice(0, 100));
  });
  return out;
}

console.log('== 1. node --check on every touched file ==');
['games/supply-raid.js', 'games/solidarity-draw.js', 'games/gambits.js',
 'games/casino-exits.js', 'pages/page-mount.js', 'pages/home-v2.js',
 'build/bundle.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(V, f === 'build/bundle.js' ? '../build/bundle.js' : f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

var raid = path.join(G, 'supply-raid.js');
var draw = path.join(G, 'solidarity-draw.js');

console.log('== 2. cell_id sourcing — mounting context only ==');
/* Code reads only (comments document the guarantee — see the positive
   check below). Track block comments and line comments. */
var raidCodeLines = [], inBlock = false;
read(raid).split('\n').forEach(function (l) {
  var t = l.trim(), out = l;
  if (inBlock) {
    var end = t.indexOf('*/');
    if (end === -1) return;               /* whole line is comment */
    inBlock = false; out = t.slice(end + 2);
  }
  var bs = out.indexOf('/*');
  if (bs !== -1) {
    var be = out.indexOf('*/', bs + 2);
    if (be === -1) { inBlock = true; out = out.slice(0, bs); }
    else out = out.slice(0, bs) + out.slice(be + 2);
  }
  var lc = out.indexOf('//');
  if (lc !== -1) out = out.slice(0, lc);
  raidCodeLines.push(out);
});
var raidCode = raidCodeLines.join('\n');
['location.search', 'URLSearchParams', 'location.hash', 'getQueryParam',
 'parseQuery', 'queryParam', 'window.location'].forEach(function (pat) {
  if (raidCode.indexOf(pat) !== -1) no('raid: no URL reads', 'found "' + pat + '" in code');
});
if (fails.filter(function (f) { return f.indexOf('raid: no URL reads') === 0; }).length === 0)
  ok('raid: no location.search / URLSearchParams / location.hash reads in code');
if (/no location\.search \/ URLSearchParams/.test(read(raid)))
  ok('raid: header documents the no-URL-param guarantee');
else no('raid: sourcing doc', 'header guarantee comment missing');
if (has(raid, 'cell_mine')) ok('raid: cell_id sourced from cell_mine (mounting context)');
else no('raid: cell context', 'cell_mine read missing');
if (has(raid, 'S.detail') || has(raid, 'j.cell.id')) ok('raid: takes primary-cell object (j.cell)');
else no('raid: cell object', 'no j.cell usage');
if (has(raid, 'in_cell')) ok('raid: frontend membership gate (in_cell)');
else no('raid: membership gate', 'in_cell check missing');

console.log('== 3. trust disclosure + odds on every new surface ==');
['XP has no cash value. Stakes are final.'].forEach(function (line) {
  if (has(raid, line)) ok('raid: verbatim trust disclosure');
  else no('raid: trust disclosure', 'missing verbatim line');
  if (has(draw, line)) ok('draw: verbatim trust disclosure');
  else no('draw: trust disclosure', 'missing verbatim line');
});
if (has(raid, 'the line keeps ~5% for the collective')) ok('raid: published odds (§2.6)');
else no('raid: odds', 'raid odds line missing');
if (has(draw, 'Odds = your tickets')) ok('draw: published odds (§2.6)');
else no('draw: odds', 'draw odds line missing');

console.log('== 4. lexicon gate — zero banned terms ==');
/* Hard list: banned in UI copy AND in code (except comments documenting a
   removal). Neither new file documents a removal, so any hit fails. */
var HARD = /casino|white market|jackpot|high roller|takes double|roulette|coin flip|red\/black|single number pays|slots|run it back|rake\b|dice|double-or-nothing/i;
[raid, draw].forEach(function (p) {
  var hits = grepHits(p, HARD);
  if (hits.length) no(path.basename(p) + ': banned terms', hits.join(' | '));
  else ok(path.basename(p) + ': zero banned terms');
});
/* 'bet' as a UI verb / 'cash out' label check: allowed only as the backend
   action names (crash_bet, crash_cashout, lottery_buy) or code identifiers
   (cashed_out, myBet). Flag button labels and visible copy. */
[raid, draw].forEach(function (p) {
  var hits = grepHits(p, />BET<|"BET"|'BET'|CASH OUT|SPIN|Lottery</i);
  var real = hits.filter(function (h) { return !/crash_(bet|cashout)|lottery_(buy|status)|cashed_out|myBet/i.test(h); });
  if (real.length) no(path.basename(p) + ': UI verb check', real.join(' | '));
  else ok(path.basename(p) + ': no BET/CASH OUT/SPIN UI copy');
});

console.log('== 5. backslash discipline ==');
/* Inside backtick spans a backslash must be doubled (\\) or a standard
   simple escape (\" \' \n \t \r \` \$) — the tree's convention (see
   gambits.js/markets.js staged templates). The dangerous case is a lone
   backslash before a regex-class letter (\d \w \s \b …), which must be
   doubled inside backtick spans. Naive span tracking: toggle on unescaped
   backticks per line (files stage one big span). */
function backslashViolations(p) {
  var out = [], inSpan = false;
  var OK_SINGLE = { '"': 1, "'": 1, 'n': 1, 't': 1, 'r': 1, '0': 1, '`': 1, '$': 1 };
  read(p).split('\n').forEach(function (l, i) {
    var line = l;
    if (!inSpan) {
      var idx = line.indexOf('`');
      if (idx !== -1) { inSpan = true; line = line.slice(idx + 1); }
      else return;
    }
    var j = 0;
    while (j < line.length) {
      var c = line[j];
      if (c === '`' && line[j - 1] !== '\\') { inSpan = false; break; }
      if (c === '\\') {
        var nx = line[j + 1];
        if (nx === '\\') { j += 2; continue; }      /* doubled — correct */
        if (OK_SINGLE[nx]) { j += 2; continue; }     /* simple escape — tree convention */
        out.push((i + 1) + ': lone backslash before "' + nx + '"');
        j++;
        continue;
      }
      j++;
    }
  });
  return out;
}
[raid, draw].forEach(function (p) {
  var v = backslashViolations(p);
  if (v.length) no(path.basename(p) + ': backslashes', v.slice(0, 5).join(' | '));
  else ok(path.basename(p) + ': backslash discipline');
});

console.log('== 6. manifest + mounts ==');
var manifest = read(path.join(ROOT, 'build', 'bundle.js'));
if (/['"]bundle-cells['"]\s*:\s*\[[^\]]*'supply-raid\.js'/.test(manifest.replace(/\n/g, ' ')))
  ok('manifest: supply-raid.js in bundle-cells');
else no('manifest', 'supply-raid.js not in bundle-cells');
if (/['"]bundle-home['"]\s*:\s*\[[^\]]*'solidarity-draw\.js'/.test(manifest.replace(/\n/g, ' ')))
  ok('manifest: solidarity-draw.js in bundle-home');
else no('manifest', 'solidarity-draw.js not in bundle-home');
if (manifest.indexOf('not built yet') !== -1) no('manifest', 'stale Phase B comment remains');
else ok('manifest: stale Phase B comment removed');
var pm = read(path.join(V, 'pages', 'page-mount.js'));
if (pm.indexOf("['raid', 'pf-ov-raid']") !== -1 && pm.indexOf("'pf-cells-page'") !== -1)
  ok('page-mount: raid on pf-cells-page');
else no('page-mount', "['raid', 'pf-ov-raid'] entry missing");
var h2 = read(path.join(V, 'pages', 'home-v2.js'));
if (h2.indexOf("['draw', 'pf-ov-draw']") !== -1) ok('home-v2: draw in PROOF ORDER');
else no('home-v2', "['draw', 'pf-ov-draw'] entry missing");
if (h2.indexOf("'draw':'proof'") !== -1) ok('home-v2: draw in SILO_SEC');
else no('home-v2', "'draw':'proof' missing");

console.log('== 7. rebuilt bundles ==');
var cells = path.join(G, 'bundle-cells.js');
var home = path.join(G, 'bundle-home.js');
if (fs.existsSync(cells) && has(cells, 'pf-ov-raid')) ok('bundle-cells.js contains supply-raid (pf-ov-raid)');
else no('bundle-cells.js', 'pf-ov-raid missing — rebuild?');
if (fs.existsSync(home) && has(home, 'pf-ov-draw')) ok('bundle-home.js contains solidarity-draw (pf-ov-draw)');
else no('bundle-home.js', 'pf-ov-draw missing — rebuild?');
var allBundles = fs.readdirSync(G).filter(function (f) { return /^bundle-.*\.js$/.test(f); });
var casinoHits = [];
allBundles.forEach(function (b) {
  if (has(path.join(G, b), 'pf-ov-casino')) casinoHits.push(b);
  if (/Contains:[^\n]*\bcasino\.js\b/.test(read(path.join(G, b)))) casinoHits.push(b + ' (manifest line)');
});
if (casinoHits.length) no('no pf-ov-casino in bundles', casinoHits.join(', '));
else ok('no pf-ov-casino / casino.js in any rebuilt bundle');

console.log('== 8. Gambit surface — still mounts cleanly (Phase A verify) ==');
var gb = path.join(G, 'gambits.js');
['flip_create', 'flip_open', 'flip_join'].forEach(function (a) {
  if (has(gb, '"' + a + '"')) ok('gambits.js uses ' + a);
  else no('gambits.js', 'missing ' + a + ' call');
});
if (/['"]bundle-arcade['"]\s*:\s*\[[^\]]*'gambits\.js'/.test(manifest.replace(/\n/g, ' ')))
  ok('manifest: gambits.js in bundle-arcade');
else no('manifest', 'gambits.js not in bundle-arcade');
if (pm.indexOf("['gambits', 'pf-ov-gambits']") !== -1) ok('page-mount: gambits on /arcade');
else no('page-mount', 'gambits entry missing');
var exits = read(path.join(G, 'casino-exits.js'));
['wmFlipSettled', 'wmLotterySeen', 'wmBetPlaced', 'wmCrashSettled', 'wmCrashCrashed'].forEach(function (fn) {
  if (exits.indexOf('PF.' + fn + ' =') !== -1) ok('casino-exits exposes PF.' + fn);
  else no('casino-exits', 'PF.' + fn + ' missing');
});

console.log('== 9. verify math — fnv1a self-test ==');
try {
  var src = read(raid);
  var m = src.match(/function fnv1a\(s\)\{[\s\S]*?\n\}/);
  if (!m) throw new Error('fnv1a not found in supply-raid.js');
  var fnv = new Function(m[0] + '; return fnv1a;')();
  /* FNV-1a 32-bit reference vector: hash("") = 0x811c9dc5. */
  if (fnv('') === 2166136261) ok('fnv1a("") = 0x811c9dc5 (reference vector)');
  else no('fnv1a', 'empty-string vector mismatch: ' + fnv(''));
  if (fnv('test') === fnv('test') && fnv('test') >= 0 && fnv('test') <= 4294967295)
    ok('fnv1a deterministic, uint32 range');
  else no('fnv1a', 'determinism/range failure');
  /* crashPointFor formula spot-check against the backend expression:
     crashPointNew = 0.95/(1-r), r=(hash32(id+':'+secret)%100000)/100000,
     clamp [1,50], floor to cents. */
  var cpSrc = src.match(/function crashPointFor\(roundId,secret\)\{[\s\S]*?\n\}/);
  if (cpSrc && /0\.95\/\(1-r\)/.test(cpSrc[0]) && /%100000/.test(cpSrc[0]) && /Math\.floor\(cp\*100\)\/100/.test(cpSrc[0]))
    ok('crashPointFor mirrors backend crashPointNew');
  else no('crashPointFor', 'formula drift');
  var dsrc = read(draw);
  if (/:\"\+d\.secret\+\":\"\+d\.total/.test(dsrc.replace(/\s/g, '')) || dsrc.indexOf('d.rid+":"+d.secret+":"+d.total') !== -1)
    ok('draw index formula = hash32(round_id:secret:total_tickets) % total');
  else no('draw index formula', 'spec §1.6 formula not found');
} catch (e) { no('fnv1a self-test', e.message); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PHASE B FRONTEND VERIFIED.');
