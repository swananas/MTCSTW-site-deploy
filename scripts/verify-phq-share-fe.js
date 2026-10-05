#!/usr/bin/env node
/* scripts/verify-phq-share-fe.js — Political HQ share posters verification.
   Run from the repo root:
     node scripts/verify-phq-share-fe.js
   1. node --check on the new module
   2. Static checks (kill switch, copy/CTA standards, banned terms, bundle marker)
   3. Mocked-browser runtime tests (vm + canvas-2d stub): each of the 4 painters
      mounts, paints its spec copy, stamps the callsign, degrades with no
      callsign (claim-line funnel), and PF.PHQShare.share/save route through
      PFShare.shareImage/saveImage.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'core', 'share-image-phq.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function expectedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ============ 0. rebuild bundles (bundle-pages carries the module) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('share-image-phq.js syntax'); }
catch (e) { no('syntax', 'node --check failed'); }

var src = read(MOD);
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]phq-share['"]\)/.test(src)) ok('kill switch PF.skip("phq-share") wired');
else no('kill switch', 'PF.skip("phq-share") not found');
if (src.indexOf('?pf_off=phq-share') !== -1) ok('KILL comment documents ?pf_off=phq-share');
else no('kill comment', '?pf_off=phq-share missing from header');
['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-corp'].forEach(function (id) {
  if (src.indexOf("'" + id + "'") !== -1) ok('painter id registered: ' + id);
  else no('painter id', id + ' missing');
});
if (src.indexOf('JOIN THE FIGHT.') !== -1) ok('CTA standard: JOIN THE FIGHT.');
else no('CTA', 'JOIN THE FIGHT. missing');
if (src.indexOf('MTCSTW.COM/POLITICAL-HQ') !== -1) ok('viral deep link MTCSTW.COM/POLITICAL-HQ printed');
else no('deep link', 'MTCSTW.COM/POLITICAL-HQ missing');
if (src.indexOf('JOIN MY CELL / BUILD YOUR CELL') !== -1) ok('war-card CTA variant on cell-win surface');
else no('war CTA', 'JOIN MY CELL / BUILD YOUR CELL missing');
if (src.indexOf('CLAIM YOUR CALLSIGN AT MTCSTW.COM') !== -1) ok('no-callsign funnel line present');
else no('funnel', 'CLAIM YOUR CALLSIGN AT MTCSTW.COM missing');
if (src.indexOf('cv._pfStamped = true') !== -1) ok('painters set _pfStamped (idempotent stamp safety net)');
else no('_pfStamped', 'no painter sets cv._pfStamped');
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in module');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane" in module');
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/share-image-phq.js'"))
  ok('share-image-phq.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfPhqShareDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfPhqShareDone missing from bundle-pages.js');
if (src.indexOf('window.PFShare') !== -1 && src.indexOf('setPoster') !== -1) ok('uses PFShare.setPoster custom-painter hook');
else no('hook', 'PFShare.setPoster hook not used');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime (canvas stub) ==');
function pxOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(String(font)); return m ? parseFloat(m[1]) : 10; }
function Ctx2D(rec) {
  this._rec = rec;
  this.font = '400 10px Arial,sans-serif';
  this.fillStyle = '#000000';
  this.textAlign = 'center';
  this.textBaseline = 'alphabetic';
}
Ctx2D.prototype.measureText = function (t) { return { width: String(t).length * pxOf(this.font) * 0.62 }; };
Ctx2D.prototype.fillText = function (t, x, y) {
  this._rec.push({ text: String(t), font: this.font, fillStyle: this.fillStyle, x: x, y: y });
};
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'clip', 'rect', 'arc', 'stroke', 'fill'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return {
    width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); }
  };
}
function makeEnv() {
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var registered = {};
  var shareCalls = [], saveCalls = [];
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.navigator = {};
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.document = {
    createElement: function (t) { if (String(t).toLowerCase() === 'canvas') return makeCanvas(); return {}; },
    addEventListener: function () {}
  };
  sb.PF = { skip: function () { return false; }, toast: function () {} };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'share-image-phq.js' });
  return { sb: sb, store: store, registered: registered, shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
/* squish: whitespace-insensitive contains — badges paint one fillText per
   char (manual letterspacing) and wrap() splits phrases across lines. */
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
/* first char op of a letterspaced badge (y=280) */
function badgeOp(cv, firstChar) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++)
    if (rs[i].text === firstChar && rs[i].y === 280) return rs[i];
  return null;
}
/* the giant grade glyph (220px) — not a badge char that happens to match */
function gradeOp(cv, g) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++)
    if (rs[i].text === g && /220px/.test(rs[i].font)) return rs[i];
  return null;
}
function opFor(cv, text) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++) if (rs[i].text === text) return rs[i];
  return null;
}

/* Fixtures: shapes for the paint contract. Bill/legislator/race entities are
   real (verified 2026-10-05: H.R.3633 cloture failed 49-50 Sep 15; H.R.9497 and
   S.2403 passed the House Sep 16; Mike Johnson R-LA is Speaker); numeric
   tallies/records are synthetic paint-test values, not asserted facts. */
var FIX = {
  'phq-pressure': {
    title: 'BLOCK H.R.3633 — THE CLARITY ACT', target: 'U.S. SENATE',
    demand: 'VOTE NO ON CLOTURE — KILL THE BILL', signatures: 12847, signaturesGoal: 25000
  },
  'phq-prediction': {
    statement: 'SENATE REJECTS CLARITY ACT CLOTURE', outcome: 'correct', wins: 7, losses: 2
  },
  'phq-prediction-missed': {
    statement: 'HOUSE ADJOURNS WITHOUT A FLOOR VOTE FRIDAY', outcome: 'missed', wins: 7, losses: 3
  },
  'phq-scorecard': {
    name: 'MIKE JOHNSON', state: 'LA', party: 'R', grade: 'F',
    verdict: 'VOTED WITH BILLIONAIRES 9 TIMES OUT OF 10',
    votes: [
      { bill: 'H.R.3633 — CLARITY ACT', vote: 'YEA', for_us: false },
      { bill: 'H.R.9497 — WATER RESOURCES', vote: 'YEA', for_us: true },
      { bill: 'S.2403 — RETIRE THROUGH OWNERSHIP', vote: 'YEA', for_us: true }
    ]
  },
  'phq-cellwin': {
    cellName: 'IRON CELL ALPHA', verified: true, members: 23, xp: 18400,
    runnerUp: 'COPPER CELL BETA', marginXp: 2300, mvpCallsign: 'IRONHORSE', weekStart: '2026-09-28'
  },
  /* Synthetic paint-test vote values; the entities (bill, legislator) are
     real. Wall-of-shame painter fixture — full detail assertions live in
     scripts/verify-wallshame-fe.js. */
  'phq-wallshame': {
    billId: 'H.R.3633', billTitle: 'THE CLARITY ACT',
    name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
    againstVotes: 1, position: 'Yea', question: 'On Passage',
    voteDates: ['2026-09-15'], sourceUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/3633'
  },
  /* Synthetic paint-test money values (clearly not real company data);
     the ticker is a real public ticker. Full detail assertions live in
     scripts/verify-corpplay-fe.js. */
  'phq-corp': {
    ticker: 'XOM', name: 'SYNTHETIC OIL CORP', year: 2024,
    buybacks: 19000000000, taxPaid: 9500000000, effectiveRate: 0.2139,
    lobbyingSpend: 2350000,
    sourceLine: 'SOURCES: SEC EDGAR · 10-K FY2024 · LDA · 2024 LD-2 FILINGS'
  }
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-corp']))
    ok('ids list matches spec painter keys');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-corp'].forEach(function (id) {
    if (typeof env.registered[id] === 'function') ok('setPoster registered: ' + id);
    else no('registration', id + ' not registered with PFShare');
  });
  if (PHQ.paint('phq-bogus', {}) === null && PHQ.share('phq-bogus', {}) === false && PHQ.save('phq-bogus', {}) === false)
    ok('unknown id fails closed (paint null, share/save false)');
  else no('unknown id', 'did not fail closed');

  /* --- Surface 1: pressure --- */
  var cv = PHQ.paint('phq-pressure', FIX['phq-pressure']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('pressure mount', 'no 1080x1350 canvas');
  else {
    ok('pressure mounts 1080x1350');
    if (hasText(cv, '\u2605 THE PROPAGANDA FACTORY \u2605')) ok('pressure kicker');
    else no('pressure kicker', 'missing');
    if (hasFrag(cv, 'PRESSURE CAMPAIGN')) {
      ok('pressure badge');
      var pbop = badgeOp(cv, 'P');
      if (pbop && pbop.fillStyle === '#f5ead6') ok('pressure badge cream');
      else no('pressure badge color', 'not cream: ' + (pbop && pbop.fillStyle));
    }
    else no('pressure badge', 'missing');
    if (hasFrag(cv, 'BLOCK H.R.3633')) ok('pressure headline (real bill)');
    else no('pressure headline', 'missing');
    if (hasFrag(cv, 'TARGET: U.S. SENATE')) ok('pressure target strip');
    else no('pressure target', 'missing');
    if (hasFrag(cv, 'DEMAND: VOTE NO ON CLOTURE')) ok('pressure demand line');
    else no('pressure demand', 'missing');
    if (hasFrag(cv, '12,847 SIGNATURES') && hasFrag(cv, '12,153 TO GO')) ok('pressure tally (dopamine number)');
    else no('pressure tally', 'missing or mis-math: ' + joined(cv).slice(0, 200));
    if (hasText(cv, 'ADD MY NAME')) ok('pressure CTA button');
    else no('pressure CTA', 'ADD MY NAME missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('pressure callsign stamp + _pfStamped');
    else no('pressure stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('pressure bottom stack (deep link + CTA + date)');
    else no('pressure bottom', 'stack incomplete');
  }

  /* --- Surface 2: prediction (correct) --- */
  cv = PHQ.paint('phq-prediction', FIX['phq-prediction']);
  if (!cv) no('prediction mount', 'null canvas');
  else {
    ok('prediction mounts 1080x1350');
    if (hasFrag(cv, 'PREDICTION: SETTLED')) ok('prediction badge (settled, red)');
    else no('prediction badge', 'missing');
    var bop = badgeOp(cv, 'P');
    if (bop && bop.fillStyle === '#c1121f') ok('settled badge is red');
    else no('badge color', 'PREDICTION: SETTLED not red: ' + (bop && bop.fillStyle));
    if (hasFrag(cv, 'SENATE REJECTS CLARITY ACT CLOTURE')) ok('prediction statement');
    else no('prediction statement', 'missing');
    if (hasText(cv, '\u2713 CALLED IT')) ok('verdict stamp: \u2713 CALLED IT');
    else no('verdict', '\u2713 CALLED IT missing');
    var vop = opFor(cv, '\u2713 CALLED IT');
    if (vop && vop.fillStyle === '#c1121f' && /9\dpx|10\dpx|11\dpx/.test(vop.font)) ok('verdict is giant red stamp');
    else no('verdict style', 'not giant red: ' + JSON.stringify(vop && { f: vop.font, c: vop.fillStyle }));
    if (hasFrag(cv, 'MY RECORD: 7W \u2014 2L')) ok('record line 7W\u20142L');
    else no('record', 'missing');
    if (hasText(cv, 'THINK YOU CAN CALL IT BETTER?')) ok('taunt footer (correct variant)');
    else no('taunt', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('prediction bottom stack');
    else no('prediction bottom', 'stack incomplete');
  }
  /* --- Surface 2: prediction (missed) --- */
  cv = PHQ.paint('phq-prediction', FIX['phq-prediction-missed']);
  if (!cv) no('missed mount', 'null canvas');
  else {
    if (hasText(cv, '\u2717 SWUNG & MISSED')) ok('missed verdict: \u2717 SWUNG & MISSED');
    else no('missed verdict', 'missing');
    var mop = opFor(cv, '\u2717 SWUNG & MISSED');
    if (mop && mop.fillStyle === '#c9bfa8') ok('missed verdict muted');
    else no('missed color', 'not muted: ' + (mop && mop.fillStyle));
    if (!hasFrag(cv, 'THINK YOU CAN CALL IT BETTER?')) ok('no taunt on missed card');
    else no('missed taunt', 'taunt present on missed variant');
    if (hasFrag(cv, 'MY RECORD: 7W \u2014 3L')) ok('missed record line');
    else no('missed record', 'missing');
  }

  /* --- Surface 3: scorecard --- */
  cv = PHQ.paint('phq-scorecard', FIX['phq-scorecard']);
  if (!cv) no('scorecard mount', 'null canvas');
  else {
    ok('scorecard mounts 1080x1350');
    if (hasFrag(cv, 'KNOW YOUR ENEMY') && hasFrag(cv, 'VOTING RECORD')) {
      ok('scorecard badge');
      var scb = badgeOp(cv, 'K');
      if (scb && scb.fillStyle === '#f5ead6') ok('scorecard badge cream');
      else no('scorecard badge color', 'not cream: ' + (scb && scb.fillStyle));
    }
    else no('scorecard badge', 'missing');
    if (hasFrag(cv, 'MIKE JOHNSON (LA-R)')) ok('scorecard name (state-party)');
    else no('scorecard name', 'missing: ' + joined(cv).slice(0, 300));
    var gop = gradeOp(cv, 'F');
    if (gop && gop.fillStyle === '#c1121f' && /220px/.test(gop.font)) ok('giant red F grade');
    else no('grade', 'F not giant red: ' + JSON.stringify(gop && { f: gop.font, c: gop.fillStyle }));
    if (hasFrag(cv, 'VOTED WITH BILLIONAIRES 9 TIMES OUT OF 10')) ok('scorecard verdict');
    else no('scorecard verdict', 'missing');
    if (hasFrag(cv, 'H.R.3633') && hasFrag(cv, 'H.R.9497') && hasFrag(cv, 'S.2403')) ok('3 real-bill vote rows');
    else no('vote rows', 'missing real bills');
    if (hasText(cv, 'FIGHTING AS WARHAWK')) ok('scorecard callsign stamp');
    else no('scorecard stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('scorecard bottom stack');
    else no('scorecard bottom', 'stack incomplete');
  }
  /* grade color logic */
  [['C', '#e8b923'], ['B', '#f5ead6'], ['A', '#f5ead6'], ['D', '#c1121f']].forEach(function (gc) {
    var c2 = PHQ.paint('phq-scorecard', Object.assign({}, FIX['phq-scorecard'], { grade: gc[0] }));
    var o = gradeOp(c2, gc[0]);
    if (o && o.fillStyle === gc[1]) ok('grade ' + gc[0] + ' -> ' + gc[1]);
    else no('grade color', gc[0] + ' not ' + gc[1] + ': ' + (o && o.fillStyle));
  });
  /* missing fields degrade to em-dash, never invented */
  cv = PHQ.paint('phq-scorecard', {});
  if (hasFrag(cv, '\u2014')) ok('scorecard empty record renders \u2014');
  else no('scorecard degrade', 'no em-dash for missing fields');

  /* --- Surface 4: cellwin --- */
  cv = PHQ.paint('phq-cellwin', FIX['phq-cellwin']);
  if (!cv) no('cellwin mount', 'null canvas');
  else {
    ok('cellwin mounts 1080x1350');
    if (hasFrag(cv, 'CELL COMPETITION') && hasFrag(cv, 'WEEK OF SEP 28')) {
      ok('cellwin badge (week of Mon Sep 28)');
      var cwb = badgeOp(cv, 'C');
      if (cwb && cwb.fillStyle === '#f5ead6') ok('cellwin badge cream');
      else no('cellwin badge color', 'not cream: ' + (cwb && cwb.fillStyle));
    }
    else no('cellwin badge', 'missing');
    if (hasText(cv, 'VICTORY')) ok('cellwin VICTORY headline');
    else no('cellwin headline', 'missing');
    if (hasText(cv, 'IRON CELL ALPHA')) ok('cellwin winning cell name');
    else no('cellwin name', 'missing');
    if (hasText(cv, '\u2605 VERIFIED')) ok('cellwin verified star');
    else no('cellwin verified', 'missing');
    var nop = opFor(cv, '23 MEMBERS \u00b7 18,400 XP');
    if (nop) ok('cellwin numbers line');
    else no('cellwin numbers', 'missing');
    if (hasFrag(cv, 'BEAT COPPER CELL BETA BY 2,300 XP')) ok('cellwin runner-up provocation line');
    else no('cellwin runner-up', 'missing');
    if (hasFrag(cv, 'MVP: IRONHORSE')) ok('cellwin MVP line');
    else no('cellwin MVP', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('cellwin sharer stamp + _pfStamped');
    else no('cellwin stamp', 'missing');
    if (hasText(cv, 'NEXT ROUND STARTS MONDAY. BUILD YOUR CELL.')) ok('cellwin recruit strip');
    else no('cellwin recruit', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ')) ok('cellwin deep link');
    else no('cellwin link', 'missing');
    if (hasText(cv, 'JOIN MY CELL / BUILD YOUR CELL')) ok('cellwin war-card CTA (JOIN THE FIGHT. variant)');
    else no('cellwin CTA', 'missing');
    if (!hasText(cv, 'JOIN THE FIGHT.')) ok('cellwin keeps war-card CTA, not the generic one');
    else no('cellwin CTA clash', 'generic JOIN THE FIGHT. also present');
  }

  /* --- no-callsign fallback: no blank stamp, claim-line funnel --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  var PHQ2 = env2.sb.PF.PHQShare;
  cv = PHQ2.paint('phq-pressure', FIX['phq-pressure']);
  if (!hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true) ok('pressure no-callsign: no blank stamp');
  else no('pressure no-cs', 'blank stamp painted');
  if (hasText(cv, 'ADD MY NAME')) ok('pressure no-callsign: campaign CTA kept');
  else no('pressure no-cs CTA', 'ADD MY NAME dropped');
  cv = PHQ2.paint('phq-prediction', FIX['phq-prediction']);
  if (!hasFrag(cv, 'FIGHTING AS') && hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') &&
      !hasText(cv, 'THINK YOU CAN CALL IT BETTER?'))
    ok('prediction no-callsign: taunt swapped for claim funnel');
  else no('prediction no-cs', 'swap wrong: ' + joined(cv).slice(-200));
  cv = PHQ2.paint('phq-scorecard', FIX['phq-scorecard']);
  if (!hasFrag(cv, 'FIGHTING AS')) ok('scorecard no-callsign: stamp skipped');
  else no('scorecard no-cs', 'stamp painted');
  cv = PHQ2.paint('phq-cellwin', FIX['phq-cellwin']);
  if (!hasFrag(cv, 'FIGHTING AS') && hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') &&
      !hasText(cv, 'NEXT ROUND STARTS MONDAY') && hasFrag(cv, 'MVP: IRONHORSE'))
    ok('cellwin no-callsign: recruit strip swapped, MVP (roster data) kept');
  else no('cellwin no-cs', 'swap wrong');

  /* --- share/save routing through PFShare --- */
  var r1 = PHQ.share('phq-pressure', FIX['phq-pressure']);
  if (r1 === true && env.shareCalls.length === 1 && env.shareCalls[0].id === 'phq-pressure' &&
      env.shareCalls[0].fn === 'pfn-phq-pressure.png' && env.shareCalls[0].cv && env.shareCalls[0].cv._recs.length > 10)
    ok('share() routes to PFShare.shareImage with painted canvas');
  else no('share()', 'routing failed: ' + JSON.stringify({ r: r1, n: env.shareCalls.length }));
  var r2 = PHQ.save('phq-scorecard', FIX['phq-scorecard']);
  if (r2 === true && env.saveCalls.length === 1 && env.saveCalls[0].id === 'phq-scorecard' &&
      env.saveCalls[0].fn === 'pfn-phq-scorecard.png')
    ok('save() routes to PFShare.saveImage with painted canvas');
  else no('save()', 'routing failed');
  /* registered custom painters draw from pending data (the button-row path) */
  var before = env.shareCalls.length;
  env.shareCalls.length = 0;
  PHQ.share('phq-cellwin', FIX['phq-cellwin']); /* sets PENDING like a silo would */
  env.shareCalls.length = 0;
  env.registered['phq-cellwin'](function (c2) {
    if (c2 && hasText(c2, 'IRON CELL ALPHA')) ok('registered painter paints pending data (button-row path)');
    else no('painter path', 'registered painter produced no/empty canvas');
  });
  if (env.shareCalls.length === 0) ok('registered painter does not share by itself');
  else no('painter path', 'registered painter had side effects');
}

console.log('== 4. layout guards (no collisions) ==');
[['phq-pressure', FIX['phq-pressure']], ['phq-prediction', FIX['phq-prediction']],
 ['phq-scorecard', FIX['phq-scorecard']], ['phq-cellwin', FIX['phq-cellwin']],
 ['phq-wallshame', FIX['phq-wallshame']], ['phq-corp', FIX['phq-corp']]].forEach(function (pc) {
  var c = PHQ.paint(pc[0], pc[1]);
  var rs = c._recs || [], bad = [], link = null, date = null, cta = null;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.text === '\u2713 CALLED IT' || r.text === '\u2717 SWUNG & MISSED') continue; /* rotated: recorded pre-transform */
    if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
    if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
    if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    if (r.text === 'JOIN MY CELL / BUILD YOUR CELL') cta = r.y;
  }
  if (!bad.length) ok(pc[0] + ': clean gap above bottom stack');
  else no(pc[0] + ' gap', 'content in stack gap: ' + bad.join(' | '));
  if (link === 1222) ok(pc[0] + ': deep link at H-128');
  else no(pc[0] + ' link', 'deep link y=' + link);
  if (date === 1302) ok(pc[0] + ': date line at H-48');
  else no(pc[0] + ' date', 'date y=' + date);
  if (pc[0] === 'phq-cellwin') {
    if (cta === 1268) ok('cellwin: war CTA button centered at H-84');
    else no('cellwin CTA y', 'y=' + cta);
  }
});

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
