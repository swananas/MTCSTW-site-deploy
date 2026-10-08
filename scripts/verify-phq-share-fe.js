#!/usr/bin/env node
/* scripts/verify-phq-share-fe.js — Political HQ share posters verification.
   Run from the repo root:
     node scripts/verify-phq-share-fe.js
   1. node --check on the new module
   2. Static checks (kill switch, copy/CTA standards, banned terms, bundle marker)
   3. Mocked-browser runtime tests (vm + canvas-2d stub): each of the 7 painters
      mounts, paints its spec copy, stamps the callsign, degrades with no
      callsign (claim-line funnel), and PF.PHQShare.share/save route through
      PFShare.shareImage/saveImage. The phq-pledge surface adds deadline
      variants (standard / today / same-day / expired / malformed) against
      REAL ballot seed data parsed from the backend migration
      (tests/pledge-ballot-seed.cjs) — every deadline traceable, never invented.
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
if (/PF\.skip\(['"]card-pledge['"]\)/.test(src)) ok('pledge kill switch PF.skip("card-pledge") wired');
else no('pledge kill switch', 'PF.skip("card-pledge") not found');
if (src.indexOf('?pf_off=card-pledge') !== -1) ok('KILL comment documents ?pf_off=card-pledge');
else no('pledge kill comment', '?pf_off=card-pledge missing from header');
if (/pledgeData:\s*function\s*\(row\)/.test(src)) ok('PF.PHQShare.pledgeData exposed (ballot-row -> card data)');
else no('pledgeData', 'pledgeData not exposed on PF.PHQShare');
['xpGrant', 'create_pledge:', 'xp_ledger', 'grant_key'].forEach(function (w) {
  if (src.indexOf(w) === -1) ok('no XP mint in painter module: ' + w + ' absent');
  else no('XP mint', w + ' present in share-image-phq.js \u2014 card generation must pay 0 XP');
});
['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin', 'phq-ballot', 'phq-pledge'].forEach(function (id) {
  if (src.indexOf("'" + id + "'") !== -1) ok('painter id registered: ' + id);
  else no('painter id', id + ' missing');
});
/* honesty rails live in the module */
if (src.indexOf('SOURCE: ') !== -1) ok('honesty rail: source line painter (srcLine)');
else no('honesty', 'srcLine / SOURCE: line missing');
if (src.indexOf('DATA MAY BE OUTDATED') !== -1) ok('honesty rail: stale banner copy');
else no('honesty', 'DATA MAY BE OUTDATED banner missing');
if (src.indexOf('JUST MOVED') !== -1) ok('bill-status: JUST MOVED banner copy');
else no('honesty', 'JUST MOVED banner missing');
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
['shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in module');
});
/* 'donate' appears ONLY in the legally-mandated boycott disclaimer
   ("CORPORATIONS CAN'T DONATE DIRECTLY — THIS IS EMPLOYEE GIVING") — QC-ruled
   false positive; assert no other occurrence. */
(function () {
  var stripped = src.split("CAN\\u2019T DONATE DIRECTLY").join('');
  if (stripped.toLowerCase().indexOf('donate') === -1) ok('banned term absent outside disclaimer: donate');
  else no('banned term', 'donate present outside the boycott disclaimer');
})();
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane" in module');
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/share-image-phq-lazy.js'"))
  ok('share-image-phq lazy stub registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'lazy stub not found in build/bundle-core.js');
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
function makeEnv(kill) {
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
  sb.PF = { skip: function () { return !!kill; }, toast: function () {} };
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
  'phq-predict-call': {
    billTitle: 'KILL THE BILLIONAIRE TAX BREAK', billId: 'hr-1', pick: 'pass', margin: '+8'
  },
  'phq-predict-call-nomargin': {
    billTitle: 'RENT CAP BILL', billId: 'hr-3', pick: 'fail', margin: ''
  },
  /* Synthetic paint-test vote values; the entities (bill, legislator) are
     real. Wall-of-shame painter fixture — full detail assertions live in
     scripts/verify-wallshame-fe.js. */
  'phq-wallshame': {
    billId: 'H.R.3633', billTitle: 'THE CLARITY ACT',
    name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
    againstVotes: 1, position: 'Yea', question: 'On Passage',
    voteDates: ['2026-09-15'], sourceUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/3633'
  }
};

var env = makeEnv();

/* Real ballot seed data (tests/pledge-ballot-seed.cjs parses the backend
   migration) — every deadline asserted below is traceable to ballot data. */
var SEED = require('../tests/pledge-ballot-seed.cjs');
var ROW_TX = SEED.ballotRow('TX'); /* 2026-10-05 deadline (today, as of the seed) */
var ROW_CO = SEED.ballotRow('CO'); /* NULL deadline -> same-day registration */
var ROW_AK = SEED.ballotRow('AK'); /* 2026-10-04 deadline (expired) */
var ROW_MO = SEED.ballotRow('MO'); /* 2026-10-07 deadline (future) */
function daysLeftOf(iso) {
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(iso || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  var now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}
if (ROW_TX && ROW_TX.registration_deadline === '2026-10-05') ok('seed trace: TX deadline 2026-10-05 from ballot migration');
else no('seed trace', 'TX row mismatch: ' + JSON.stringify(ROW_TX && ROW_TX.registration_deadline));
if (ROW_CO && ROW_CO.registration_deadline === null) ok('seed trace: CO deadline NULL (same-day) from ballot migration');
else no('seed trace', 'CO row mismatch');
if (ROW_AK && ROW_AK.registration_deadline === '2026-10-04') ok('seed trace: AK deadline 2026-10-04 from ballot migration');
else no('seed trace', 'AK row mismatch');
if (ROW_MO && ROW_MO.registration_deadline === '2026-10-07') ok('seed trace: MO deadline 2026-10-07 from ballot migration');
else no('seed trace', 'MO row mismatch');
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed');
  var wantIds = ['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin', 'phq-ballot', 'phq-pledge'];
  var missingIds = wantIds.filter(function (id) { return PHQ.ids.indexOf(id) === -1; });
  if (missingIds.length === 0) ok('ids list contains spec painter keys (registry carries ' + PHQ.ids.length + ' total)');
  else no('ids', 'missing ids: ' + JSON.stringify(missingIds));
  ['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin', 'phq-ballot', 'phq-pledge'].forEach(function (id) {
    if (PHQ.ids.indexOf(id) === -1) no('registry subset', id + ' missing from canonical registry');
    if (typeof env.registered[id] === 'function') ok('setPoster registered: ' + id);
    else no('registration', id + ' not registered with PFShare');
  });
  if (PHQ.paint('phq-bogus', {}) === null && PHQ.share('phq-bogus', {}) === false && PHQ.save('phq-bogus', {}) === false)
    ok('unknown id fails closed (paint null, share/save false)');
  else no('unknown id', 'did not fail closed');

  /* --- kill switch: PF.skip('phq-share') blocks the whole module --- */
  var kenv = makeEnv(true);
  if (!kenv.sb.PF.PHQShare && !kenv.sb.pfPhqShareDone && Object.keys(kenv.registered).length === 0)
    ok('kill switch respected: no PHQShare, no painters registered');
  else no('kill switch', 'module mounted despite PF.skip("phq-share")');

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

  /* --- Surface 2b: predict-call (pre-resolution SHARE YOUR CALL) --- */
  cv = PHQ.paint('phq-predict-call', FIX['phq-predict-call']);
  if (!cv) no('predict-call mount', 'null canvas');
  else {
    ok('predict-call mounts 1080x1350');
    if (hasFrag(cv, 'MY CALL: LOCKED IN')) ok('predict-call badge (locked in, red)');
    else no('predict-call badge', 'missing');
    var pcop = badgeOp(cv, 'M');
    if (pcop && pcop.fillStyle === '#c1121f') ok('locked-in badge is red');
    else no('predict-call badge color', 'not red: ' + (pcop && pcop.fillStyle));
    if (hasFrag(cv, 'KILL THE BILLIONAIRE TAX BREAK')) ok('predict-call bill title (live data)');
    else no('predict-call title', 'missing');
    if (hasText(cv, '\u2713 WILL PASS')) ok('call stamp: \u2713 WILL PASS');
    else no('predict-call stamp', 'missing');
    var psop = opFor(cv, '\u2713 WILL PASS');
    if (psop && psop.fillStyle === '#c1121f' && /9\dpx|10\dpx|11\dpx/.test(psop.font)) ok('call stamp is giant red (same family as resolution)');
    else no('predict-call stamp style', 'not giant red: ' + JSON.stringify(psop && { f: psop.font, c: psop.fillStyle }));
    if (hasText(cv, 'MY MARGIN CALL: +8')) ok('margin line rendered');
    else no('predict-call margin', 'missing');
    if (hasText(cv, 'THINK YOU CAN CALL IT BETTER?')) ok('predict-call taunt footer');
    else no('predict-call taunt', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('predict-call bottom stack');
    else no('predict-call bottom', 'stack incomplete');
  }
  /* fail variant + no-margin degrade */
  cv = PHQ.paint('phq-predict-call', FIX['phq-predict-call-nomargin']);
  if (!cv) no('predict-call-fail mount', 'null canvas');
  else {
    if (hasText(cv, '\u2717 WILL FAIL')) ok('call stamp: \u2717 WILL FAIL');
    else no('predict-call fail stamp', 'missing');
    var pfop = opFor(cv, '\u2717 WILL FAIL');
    if (pfop && pfop.fillStyle === '#c9bfa8') ok('fail stamp muted (same family as missed)');
    else no('predict-call fail color', 'not muted: ' + (pfop && pfop.fillStyle));
    if (!hasFrag(cv, 'MY MARGIN CALL')) ok('no margin line when margin empty');
    else no('predict-call margin leak', 'margin line rendered for empty margin');
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
    /* tri-state vote marks: true→✓ cream, false→✗ red, null→— neutral */
    var tri = PHQ.paint('phq-scorecard', Object.assign({}, FIX['phq-scorecard'], {
      votes: [
        { bill: 'H.R.1', vote: 'YEA', for_us: true },
        { bill: 'H.R.2', vote: 'NAY', for_us: false },
        { bill: 'H.R.3', vote: 'N/A', for_us: null }
      ]
    }));
    var tMark = opFor(tri, '✓'), fMark = opFor(tri, '✗');
    var nMark = (tri._recs || []).filter(function (r) {
      return r.text === '—' && /34px/.test(r.font);
    })[0]; /* voteRow mark; badge em-dash is letterspaced at 36px */
    if (tMark && tMark.fillStyle === '#f5ead6') ok('vote mark true → cream ✓');
    else no('vote mark true', 'not cream ✓: ' + JSON.stringify(tMark && { t: tMark.text, c: tMark.fillStyle }));
    if (fMark && fMark.fillStyle === '#c1121f') ok('vote mark false → red ✗');
    else no('vote mark false', 'not red ✗: ' + JSON.stringify(fMark && { t: fMark.text, c: fMark.fillStyle }));
    if (nMark && nMark.fillStyle === '#c9bfa8') ok('vote mark null → neutral —');
    else no('vote mark null', 'not neutral —: ' + JSON.stringify(nMark && { t: nMark.text, c: nMark.fillStyle }));
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

  /* --- Surface 5: bill-status --- */
  cv = PHQ.paint('phq-bill-status', FIX['phq-bill-status']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('bill-status mount', 'no 1080x1350 canvas');
  else {
    ok('bill-status mounts 1080x1350');
    if (hasFrag(cv, 'BILL STATUS')) ok('bill-status badge');
    else no('bill-status badge', 'missing');
    if (hasText(cv, 'H.R. 14')) ok('bill-status big bill id');
    else no('bill-status id', 'H.R. 14 missing');
    if (hasFrag(cv, 'FOR THE PEOPLE ACT')) ok('bill-status title');
    else no('bill-status title', 'missing');
    if (hasFrag(cv, 'JUST MOVED') && hasFrag(cv, 'IN COMMITTEE') && hasFrag(cv, 'PASSED HOUSE'))
      ok('bill-status JUST MOVED banner (old -> new stage)');
    else no('bill-status moved', 'banner missing');
    if (hasFrag(cv, 'STAGE 3 OF 5')) ok('bill-status stage 3 of 5');
    else no('bill-status stage', 'STAGE 3 OF 5 missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('bill-status callsign stamp + _pfStamped');
    else no('bill-status stamp', 'missing');
    if (hasFrag(cv, 'SOURCE: CONGRESS.GOV') && hasFrag(cv, 'OCT 5'))
      ok('bill-status source + date line (honesty rail)');
    else no('bill-status source', 'SOURCE: CONGRESS.GOV missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('bill-status bottom stack');
    else no('bill-status bottom', 'stack incomplete');
  }
  cv = PHQ.paint('phq-bill-status', {});
  if (cv && hasFrag(cv, '\u2014') && hasFrag(cv, 'STAGE \u2014 OF 5') && !hasFrag(cv, 'JUST MOVED') &&
      !hasFrag(cv, 'SOURCE:'))
    ok('bill-status empty data: honest \u2014s, no moved banner, no source line');
  else no('bill-status degrade', 'empty-data render wrong: ' + (cv && joined(cv).slice(0, 200)));

  /* --- Surface 6: race --- */
  cv = PHQ.paint('phq-race', FIX['phq-race']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('race mount', 'no 1080x1350 canvas');
  else {
    ok('race mounts 1080x1350');
    if (hasFrag(cv, 'RACE WATCH')) ok('race badge');
    else no('race badge', 'missing');
    if (hasText(cv, 'TX-23')) ok('race big district');
    else no('race district', 'TX-23 missing');
    if (hasFrag(cv, 'TEXAS \u00b7 U.S. HOUSE')) ok('race state/chamber subline');
    else no('race subline', 'missing');
    if (hasText(cv, 'TOSS-UP')) {
      ok('race rating badge');
      var rop = opFor(cv, 'TOSS-UP');
      if (rop && rop.fillStyle === '#0d0d0d') ok('race rating is black-on-gold stamp');
      else no('race rating style', 'not black-on-gold: ' + (rop && rop.fillStyle));
    }
    else no('race rating', 'TOSS-UP missing');
    if (hasFrag(cv, 'JOHN DOE (D)') && hasFrag(cv, 'JANE ROE (R)')) ok('race candidates listed');
    else no('race candidates', 'missing');
    if (!hasFrag(cv, 'DATA MAY BE OUTDATED')) ok('race fresh data: no stale banner');
    else no('race banner', 'stale banner on fresh data');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('race callsign stamp + _pfStamped');
    else no('race stamp', 'missing');
    if (hasFrag(cv, 'SOURCE: COOKPOLITICAL.COM')) ok('race source line (honesty rail)');
    else no('race source', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('race bottom stack');
    else no('race bottom', 'stack incomplete');
  }
  cv = PHQ.paint('phq-race', FIX['phq-race-stale']);
  if (cv && hasFrag(cv, 'DATA MAY BE OUTDATED')) ok('race stale:true paints the stale banner');
  else no('race stale', 'stale banner missing on stale data');
  cv = PHQ.paint('phq-race', {});
  if (cv && hasFrag(cv, '\u2014') && !hasFrag(cv, 'DATA MAY BE OUTDATED'))
    ok('race empty data: honest \u2014s, no stale banner');
  else no('race degrade', 'empty-data render wrong');

  /* --- Surface 7: poll-results --- */
  cv = PHQ.paint('phq-poll-results', FIX['phq-poll-results']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('poll mount', 'no 1080x1350 canvas');
  else {
    ok('poll mounts 1080x1350');
    if (hasFrag(cv, 'POLL RESULTS')) ok('poll badge');
    else no('poll badge', 'missing');
    if (hasFrag(cv, 'SHOULD THE SENATE KILL THE FILIBUSTER?')) ok('poll question');
    else no('poll question', 'missing');
    if (hasFrag(cv, 'YES \u2014 KILL IT') && hasFrag(cv, '61%') && hasFrag(cv, 'NO \u2014 KEEP IT') && hasFrag(cv, '39%'))
      ok('poll options with percentages');
    else no('poll options', 'missing');
    if (hasFrag(cv, 'WINNER')) {
      ok('poll winner highlighted');
      var wop = opFor(cv, '\u2605 WINNER');
      if (wop && wop.fillStyle === '#e8b923') ok('poll winner tag is gold');
      else no('poll winner color', 'not gold: ' + (wop && wop.fillStyle));
    }
    else no('poll winner', 'WINNER tag missing');
    if (hasFrag(cv, 'CLOSED OCT 4')) ok('poll CLOSED date line');
    else no('poll closed', 'CLOSED OCT 4 missing');
    if (hasFrag(cv, '1,380 VOTES')) ok('poll total votes');
    else no('poll total', '1,380 VOTES missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('poll callsign stamp + _pfStamped');
    else no('poll stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('poll bottom stack');
    else no('poll bottom', 'stack incomplete');
  }
  cv = PHQ.paint('phq-poll-results', {});
  if (cv && hasFrag(cv, '\u2014') && hasFrag(cv, 'CLOSED \u2014'))
    ok('poll empty data: honest \u2014s');
  else no('poll degrade', 'empty-data render wrong');

  /* --- Surface 8: rep-contact --- */
  cv = PHQ.paint('phq-rep-contact', FIX['phq-rep-contact']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('rep-contact mount', 'no 1080x1350 canvas');
  else {
    ok('rep-contact mounts 1080x1350');
    if (hasFrag(cv, 'PRESSURE LOGGED')) ok('rep-contact badge');
    else no('rep-contact badge', 'missing');
    if (hasText(cv, 'I CALLED')) ok('rep-contact I CALLED headline');
    else no('rep-contact headline', 'I CALLED missing');
    if (hasFrag(cv, 'MIKE JOHNSON (LA-R)')) ok('rep-contact rep name (state-party)');
    else no('rep-contact name', 'missing');
    if (hasFrag(cv, 'TOPIC: VOTE NO ON H.R.3633')) ok('rep-contact topic line');
    else no('rep-contact topic', 'missing');
    if (hasFrag(cv, 'THEIR NUMBER: (555) 019-2834')) ok('rep-contact number as plain text (no tel:)');
    else no('rep-contact tel', 'number missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('rep-contact callsign stamp + _pfStamped');
    else no('rep-contact stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('rep-contact bottom stack');
    else no('rep-contact bottom', 'stack incomplete');
  }
  cv = PHQ.paint('phq-rep-contact', FIX['phq-rep-contact-emailed']);
  if (cv && hasText(cv, 'I EMAILED') && !hasFrag(cv, 'THEIR NUMBER:'))
    ok('rep-contact EMAILED variant headline, no number line without tel');
  else no('rep-contact emailed', 'variant wrong');
  cv = PHQ.paint('phq-rep-contact', {});
  if (cv && hasText(cv, 'I TOOK ACTION') && hasFrag(cv, '\u2014'))
    ok('rep-contact empty data: neutral headline, honest \u2014s');
  else no('rep-contact degrade', 'empty-data render wrong');

  /* --- Surface 9: nonprofit --- */
  cv = PHQ.paint('phq-nonprofit', FIX['phq-nonprofit']);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('nonprofit mount', 'no 1080x1350 canvas');
  else {
    ok('nonprofit mounts 1080x1350');
    if (hasFrag(cv, 'MOVEMENT ALLY')) ok('nonprofit badge');
    else no('nonprofit badge', 'missing');
    if (hasFrag(cv, 'LOUISIANA TRANS ADVOCATES')) ok('nonprofit big name');
    else no('nonprofit name', 'missing');
    if (hasFrag(cv, 'FOCUS: LGBTQ+ RIGHTS')) ok('nonprofit focus line');
    else no('nonprofit focus', 'missing');
    if (hasFrag(cv, 'FIGHTING FOR TRANS RIGHTS ACROSS LOUISIANA')) ok('nonprofit mission');
    else no('nonprofit mission', 'missing');
    if (hasFrag(cv, 'DISCLOSURE: MTCSTW HAS NO FINANCIAL TIES TO THIS ORG')) ok('nonprofit disclosure (honesty rail)');
    else no('nonprofit disclosure', 'missing');
    if (hasFrag(cv, 'LATRANSADVOCATES.ORG')) ok('nonprofit website URL');
    else no('nonprofit website', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('nonprofit callsign stamp + _pfStamped');
    else no('nonprofit stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('nonprofit bottom stack');
    else no('nonprofit bottom', 'stack incomplete');
  }
  cv = PHQ.paint('phq-nonprofit', FIX['phq-nonprofit-nodisclosure']);
  if (cv && !hasFrag(cv, 'DISCLOSURE:')) ok('nonprofit: no disclosure line when none supplied');
  else no('nonprofit nodisclosure', 'disclosure line rendered without data');
  cv = PHQ.paint('phq-nonprofit', {});
  if (cv && hasFrag(cv, '\u2014')) ok('nonprofit empty data: honest \u2014s');
  else no('nonprofit degrade', 'empty-data render wrong');

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
  cv = PHQ2.paint('phq-predict-call', FIX['phq-predict-call']);
  if (!hasFrag(cv, 'FIGHTING AS') && hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') &&
      !hasText(cv, 'THINK YOU CAN CALL IT BETTER?'))
    ok('predict-call no-callsign: taunt swapped for claim funnel');
  else no('predict-call no-cs', 'swap wrong');
  cv = PHQ2.paint('phq-cellwin', FIX['phq-cellwin']);
  if (!hasFrag(cv, 'FIGHTING AS') && hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') &&
      !hasText(cv, 'NEXT ROUND STARTS MONDAY') && hasFrag(cv, 'MVP: IRONHORSE'))
    ok('cellwin no-callsign: recruit strip swapped, MVP (roster data) kept');
  else no('cellwin no-cs', 'swap wrong');
  /* --- Surface 5: phq-pledge (deadline variants, real ballot seed rows) --- */
  var PD = PHQ.pledgeData;
  if (typeof PD !== 'function') no('pledgeData', 'not a function');
  else {
    ok('pledgeData exposed');
    /* malformed / missing rows fail soft */
    if (PD(null) === null && PD({}) === null && PD({ state: 'XX', registration_deadline: 'not-a-date' }) === null)
      ok('pledgeData: null/missing/malformed rows -> null (fail-soft)');
    else no('pledgeData degrade', 'did not fail soft');
    /* expired state (AK, seed deadline 2026-10-04): no card */
    var akLeft = daysLeftOf(ROW_AK.registration_deadline);
    if (akLeft < 0 && PD(ROW_AK) === null) ok('pledgeData: expired AK deadline -> null (fail-soft, caller shows "deadline passed")');
    else no('pledgeData expired', 'AK left=' + akLeft + ' data=' + JSON.stringify(PD(ROW_AK)));
    /* same-day state (CO, NULL deadline): sameday variant, never fake urgency */
    var coData = PD(ROW_CO);
    if (coData && coData.daysLeft === 'sameday' && coData.deadline === null && coData.stateCode === 'CO')
      ok('pledgeData: CO NULL deadline -> sameday variant');
    else no('pledgeData sameday', 'CO data wrong: ' + JSON.stringify(coData));
    /* standard state (MO, seed deadline 2026-10-07): real date, real count */
    var moData = PD(ROW_MO), moLeft = daysLeftOf(ROW_MO.registration_deadline);
    if (moData && moData.deadline === '2026-10-07' && moData.daysLeft === moLeft &&
        moData.registerUrl === ROW_MO.register_url && moData.electionDay === '2026-11-03')
      ok('pledgeData: MO deadline/count/registerUrl/electionDay from ballot row');
    else no('pledgeData standard', 'MO data wrong: ' + JSON.stringify(moData));
    /* TX row carries the seed deadline through unchanged */
    var txData = PD(ROW_TX), txLeft = daysLeftOf(ROW_TX.registration_deadline);
    if (txData && txData.deadline === '2026-10-05' && txData.daysLeft === txLeft)
      ok('pledgeData: TX deadline 2026-10-05 carried through (traceable)');
    else no('pledgeData TX', 'TX data wrong: ' + JSON.stringify(txData));
  }

  /* painter-level fail-soft: expired or malformed deadline -> no card */
  if (PHQ.paint('phq-pledge', { stateName: 'Alaska', deadline: '2020-01-01' }) === null)
    ok('pledge paint: expired deadline -> null (no card)');
  else no('pledge expired paint', 'card rendered for a past deadline');
  if (PHQ.paint('phq-pledge', { stateName: 'X', deadline: 'garbage' }) === null &&
      PHQ.paint('phq-pledge', {}) === null)
    ok('pledge paint: malformed/missing data -> null (no invented card)');
  else no('pledge malformed paint', 'card rendered from bad data');

  /* pledge card common chrome */
  function pledgeChrome(cv, label) {
    if (!cv || cv.width !== 1080 || cv.height !== 1350) { no('pledge mount', label + ': no 1080x1350 canvas'); return false; }
    var probs = [];
    if (!hasText(cv, "I'M IN.")) probs.push('headline');
    if (!hasText(cv, '\u2605 THE PROPAGANDA FACTORY \u2605')) probs.push('kicker');
    if (!hasFrag(cv, 'VOTER PLEDGE')) probs.push('badge');
    if (!hasText(cv, 'FIGHTING AS WARHAWK') || cv._pfStamped !== true) probs.push('stamp');
    if (!hasText(cv, 'MTCSTW.COM/POLITICAL-HQ')) probs.push('deep link');
    if (!hasText(cv, 'JOIN THE FIGHT.')) probs.push('CTA');
    if (!hasText(cv, expectedDate())) probs.push('date');
    if (!hasFrag(cv, 'SOURCE:PFBALLOTCENTERDATA')) probs.push('source');
    if (!hasText(cv, 'VOTE NOVEMBER 3, 2026')) probs.push('election day');
    if (probs.length) { no('pledge chrome', label + ' missing: ' + probs.join(',')); return false; }
    ok('pledge chrome: ' + label + ' (headline, badge, stamp, link, CTA, source+date)');
    return true;
  }

  /* standard variant: MO (future deadline from seed) */
  var moD = PD(ROW_MO), moL = daysLeftOf(ROW_MO.registration_deadline);
  cv = PHQ.paint('phq-pledge', moD);
  if (pledgeChrome(cv, 'MO standard')) {
    if (hasText(cv, 'MISSOURI')) ok('pledge state name: MISSOURI');
    else no('pledge state', 'MISSOURI missing');
    if (hasFrag(cv, 'REGISTER BY OCTOBER 7, 2026')) ok('pledge real deadline printed (OCTOBER 7, 2026)');
    else no('pledge deadline', 'REGISTER BY line missing: ' + joined(cv).slice(0, 400));
    if (moL > 0 && hasText(cv, moL + ' DAYS LEFT')) ok('pledge days-left count (' + moL + ' DAYS LEFT)');
    else no('pledge count', 'days-left missing for left=' + moL);
    if (hasText(cv, 'REGISTER: VOTE.GOV/REGISTER/MO')) ok('pledge vote.gov link (VOTE.GOV/REGISTER/MO)');
    else no('pledge vote.gov', 'register line missing');
  }

  /* today variant: TX (seed deadline 2026-10-05) — asserted dynamically */
  var txD = PD(ROW_TX), txL = daysLeftOf(ROW_TX.registration_deadline);
  cv = txD ? PHQ.paint('phq-pledge', txD) : null;
  if (txL === 0) {
    if (cv && hasFrag(cv, 'TODAY IS THE LAST DAY TO REGISTER')) ok('pledge today variant (TX, deadline is today)');
    else no('pledge today', 'TX today-variant missing: ' + (cv ? joined(cv).slice(0, 300) : 'null'));
    if (cv) pledgeChrome(cv, 'TX today');
  } else if (txL > 0) {
    if (cv && hasFrag(cv, 'REGISTER BY OCTOBER 5, 2026')) ok('pledge TX future variant (deadline not yet reached)');
    else no('pledge TX future', 'missing');
  } else {
    if (txD === null) ok('pledge TX expired variant: pledgeData -> null (deadline has passed)');
    else no('pledge TX expired', 'expected null, got data');
  }

  /* same-day variant: CO (NULL deadline) — the correct variant, no fake urgency */
  cv = PHQ.paint('phq-pledge', PD(ROW_CO));
  if (pledgeChrome(cv, 'CO same-day')) {
    if (hasText(cv, 'REGISTER AT THE POLLS')) ok('pledge same-day variant: REGISTER AT THE POLLS');
    else no('pledge sameday', 'REGISTER AT THE POLLS missing');
    if (hasFrag(cv, 'SAME-DAY REGISTRATION')) ok('pledge same-day registration line');
    else no('pledge sameday line', 'missing');
    if (!hasFrag(cv, 'DAYS LEFT') && !hasFrag(cv, 'LAST DAY')) ok('pledge same-day: no fake urgency copy');
    else no('pledge fake urgency', 'urgency copy on a same-day card');
    if (hasText(cv, 'REGISTER: VOTE.GOV/REGISTER/CO')) ok('pledge CO vote.gov link');
    else no('pledge CO link', 'missing');
  }

  /* kill switch: ?pf_off=card-pledge kills the card, pledgeData still shapes data */
  function makeKillEnv() {
    var e = makeEnv();
    e.sb.PF.skip = function (silo) { return silo === 'card-pledge'; };
    return e;
  }
  var kenv = makeKillEnv();
  var KPHQ = kenv.sb.PF.PHQShare;
  if (KPHQ.paint('phq-pledge', PD(ROW_MO)) === null) ok('kill switch: ?pf_off=card-pledge -> painter returns null');
  else no('kill switch', 'card rendered with card-pledge killed');
  if (KPHQ.pledgeData(ROW_MO) !== null) ok('kill switch: pledgeData still shapes data (kill gates the card only)');
  else no('kill switch data', 'pledgeData gated by kill switch');

  /* no-callsign: no blank stamp, claim-line funnel */
  cv = PHQ2.paint('phq-pledge', PD(ROW_CO));
  if (cv && !hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true &&
      hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') && hasText(cv, 'REGISTER AT THE POLLS'))
    ok('pledge no-callsign: funnel line, no blank stamp, variant kept');
  else no('pledge no-cs', 'swap wrong');


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
  var r3 = PHQ.share('phq-race', FIX['phq-race']);
  if (r3 === true && env.shareCalls.length === 2 && env.shareCalls[1].id === 'phq-race' &&
      env.shareCalls[1].fn === 'pfn-phq-race.png' && env.shareCalls[1].cv._pfStamped === true)
    ok('share() routes new painter id (phq-race) with painted canvas');
  else no('share() new id', 'routing failed');
  var r4 = PHQ.save('phq-nonprofit', FIX['phq-nonprofit']);
  if (r4 === true && env.saveCalls.length === 2 && env.saveCalls[1].id === 'phq-nonprofit' &&
      env.saveCalls[1].fn === 'pfn-phq-nonprofit.png')
    ok('save() routes new painter id (phq-nonprofit)');
  else no('save() new id', 'routing failed');
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
 ['phq-predict-call', FIX['phq-predict-call']], ['phq-scorecard', FIX['phq-scorecard']],
 ['phq-cellwin', FIX['phq-cellwin']], ['phq-wallshame', FIX['phq-wallshame']],
 ['phq-pledge', PD(ROW_MO)]].forEach(function (pc) {
  var c = PHQ.paint(pc[0], pc[1]);
  var rs = c._recs || [], bad = [], link = null, date = null, cta = null;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.text === '\u2713 CALLED IT' || r.text === '\u2717 SWUNG & MISSED' ||
        r.text === '\u2713 WILL PASS' || r.text === '\u2717 WILL FAIL') continue; /* rotated: recorded pre-transform */
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
