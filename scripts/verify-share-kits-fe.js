#!/usr/bin/env node
/* scripts/verify-share-kits-fe.js — Campaign Share-Kit posters verification.
   Run from the repo root:
     node scripts/verify-share-kits-fe.js
   1. node --check on the new module
   2. Static checks (per-painter kill switches, copy/CTA standards, banned
      terms, bundle marker) + XP-compliance greps (Economy Desk signed table
      2026-10-05: no xpGrant calls, no pf-share-image dispatches, no new XP
      grant copy in kit code)
   3. Mocked-browser runtime tests (vm + canvas-2d stub): both kit painters
      mount, paint their spec copy, stamp the callsign, degrade with no
      callsign (claim-line funnel) and on minimal payloads, honor
      ?pf_off=phq-bill / ?pf_off=phq-urgency, decorate PF.PHQShare without
      breaking the original four, and share/save route through
      PFShare.shareImage/saveImage.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'core', 'share-image-phq-kits.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
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
try { cp.execSync('node --check ' + MOD, { stdio: 'pipe' }); ok('share-image-phq-kits.js syntax'); }
catch (e) { no('syntax', 'node --check failed'); }

var src = read(MOD);
var code = stripComments(src);

console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]phq-bill['"]\)/.test(src) && /PF\.skip\(['"]phq-urgency['"]\)/.test(src))
  ok('per-painter kill switches PF.skip("phq-bill") / PF.skip("phq-urgency") wired');
else no('kill switch', 'per-painter PF.skip not found');
if (src.indexOf('?pf_off=phq-bill') !== -1 && src.indexOf('?pf_off=phq-urgency') !== -1)
  ok('KILL comment documents ?pf_off=phq-bill and ?pf_off=phq-urgency');
else no('kill comment', '?pf_off=phq-bill / ?pf_off=phq-urgency missing from header');
['phq-bill', 'phq-urgency'].forEach(function (id) {
  if (src.indexOf("'" + id + "'") !== -1) ok('painter id registered: ' + id);
  else no('painter id', id + ' missing');
});
if (code.indexOf('phq-pressure') === -1) ok('target poster NOT duplicated (reuses existing phq-pressure)');
else no('no-dup', 'phq-pressure painter reimplemented in the kit module');
if (src.indexOf('JOIN THE FIGHT.') !== -1) ok('CTA standard: JOIN THE FIGHT.');
else no('CTA', 'JOIN THE FIGHT. missing');
if (src.indexOf('MTCSTW.COM/POLITICAL-HQ') !== -1) ok('viral deep link MTCSTW.COM/POLITICAL-HQ printed');
else no('deep link', 'MTCSTW.COM/POLITICAL-HQ missing');
if (src.indexOf('CLAIM YOUR CALLSIGN AT MTCSTW.COM') !== -1) ok('no-callsign funnel line present');
else no('funnel', 'CLAIM YOUR CALLSIGN AT MTCSTW.COM missing');
if (src.indexOf('cv._pfStamped = true') !== -1) ok('painters set _pfStamped (idempotent stamp safety net)');
else no('_pfStamped', 'no painter sets cv._pfStamped');
if (src.indexOf('STUCK AT:') !== -1) ok('STUCK AT line present (bill poster)');
else no('stuck-at', 'STUCK AT line missing');
if (src.indexOf('SOLDIERS PRESSURING') !== -1) ok('participant line present (urgency poster)');
else no('soldiers', 'SOLDIERS PRESSURING missing');
if (src.indexOf('SRC:') !== -1) ok('source provenance footer present');
else no('source footer', 'SRC: footer missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1) ok('banned term absent: ' + w);
  else no('banned term', w + ' present in module');
});
if (!/\bShane\b/.test(src)) ok('no real names in copy');
else no('real name', 'found "Shane" in module');
/* Economy Desk signed table 2026-10-05 — XP compliance, checked on the
   comment-stripped view so doc comments can't hide a real call. */
if (code.indexOf('xpGrant') === -1) ok('XP compliance: no xpGrant calls in kit module');
else no('xpGrant', 'xpGrant call found in kit module');
if (code.indexOf('dispatchEvent') === -1) ok('XP compliance: no pf-share-image dispatches (creditShare owns them)');
else no('dispatch', 'dispatchEvent found in kit module');
if (!/pf-share-image/.test(code)) ok('XP compliance: pf-share-image only in doc comments');
else no('pf-share-image', 'pf-share-image event referenced in code');
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/share-image-phq-kits.js'"))
  ok('share-image-phq-kits.js registered in build/bundle-core.js');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfPhqShareKitsDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfPhqShareKitsDone missing from bundle-pages.js');
if (src.indexOf('PF.PHQShare') !== -1 && src.indexOf('setPoster') !== -1)
  ok('decorates PF.PHQShare registry; uses PFShare.setPoster custom-painter hook');
else no('registry', 'PF.PHQShare decoration / setPoster hook not found');

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
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'clip', 'rect'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return {
    width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); }
  };
}
/* makeEnv(disabled): stub browser. PF.PHQShare is stubbed as the ORIGINAL
   four-painter registry so the kit module's decoration path is exercised. */
function makeEnv(disabled) {
  disabled = disabled || [];
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var registered = {};
  var shareCalls = [], saveCalls = [];
  var origShareHits = [], origPaintHits = [];
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
  sb.PF = {
    skip: function (silo) { return disabled.indexOf(silo) !== -1; },
    toast: function () {},
    PHQShare: {
      ids: ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin'],
      share: function (id, data, opts) { origShareHits.push(id); return 'orig-share'; },
      save: function (id, data, opts) { origShareHits.push(id); return 'orig-save'; },
      paint: function (id, data) { origPaintHits.push(id); return { stub: 'orig-paint' }; }
    }
  };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'share-image-phq-kits.js' });
  return { sb: sb, store: store, registered: registered, shareCalls: shareCalls,
           saveCalls: saveCalls, origShareHits: origShareHits, origPaintHits: origPaintHits };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function opFor(cv, text) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++) if (rs[i].text === text) return rs[i];
  return null;
}

var BILL = {
  billNo: 'H.R. 3633', billTitle: 'THE CLARITY ACT — DIGITAL ASSET MARKET STRUCTURE',
  status: 'CLOTURE FAILED 49-50', stuckAt: 'SENATE FLOOR',
  sourceUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/3633',
  sourceDate: '2026-09-15', generatedAt: '2026-10-05'
};
var URGENCY = {
  title: 'STOP THE OLIGARCH POWER GRAB', daysRemaining: 5, endsAt: '2026-10-10',
  participantCount: 1234, targetBill: 'H.R. 14', generatedAt: '2026-10-05'
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ || !PHQ._kitsHooked) { no('decoration', 'kit module did not hook PF.PHQShare'); }
else {
  ok('kit module decorates PF.PHQShare (load-order independent hook)');
  if (PHQ.ids.indexOf('phq-bill') !== -1 && PHQ.ids.indexOf('phq-urgency') !== -1 &&
      PHQ.ids.length === 6) ok('registry ids: original four + two kit painters');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.sb.PF.PHQShareKits === 'object' && env.sb.PF.PHQShareKits.ids.length === 2)
    ok('PF.PHQShareKits standalone handle exposed');
  else no('PHQShareKits', 'standalone handle missing');
  /* Original four keep routing to the originals. */
  PHQ.share('phq-pressure', { title: 'X' });
  PHQ.paint('phq-scorecard', {});
  if (env.origShareHits.join(',') === 'phq-pressure' && env.origPaintHits.join(',') === 'phq-scorecard')
    ok('original four still route to the original registry');
  else no('orig routing', 'decoration broke the original four');
  if (PHQ.paint('phq-bogus', {}) && PHQ.paint('phq-bogus', {}).stub === 'orig-paint')
    ok('unknown id falls through to original (no kit interception)');
  else no('unknown id', 'unexpected interception');

  /* --- Surface 5: bill poster (full payload) --- */
  var cv = PHQ.paint('phq-bill', BILL);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('bill mount', 'no 1080x1350 canvas');
  else {
    ok('bill mounts 1080x1350');
    if (hasText(cv, '\u2605 THE PROPAGANDA FACTORY \u2605')) ok('bill kicker');
    else no('bill kicker', 'missing');
    if (hasFrag(cv, 'TARGET BILL')) ok('bill badge');
    else no('bill badge', 'missing');
    var bop = opFor(cv, 'H.R. 3633');
    if (bop && bop.fillStyle === '#c1121f' && /1[23]\dpx/.test(bop.font)) ok('bill number big + red');
    else no('bill number', 'not big red: ' + JSON.stringify(bop && { f: bop.font, c: bop.fillStyle }));
    if (hasFrag(cv, 'CLARITY ACT')) ok('bill title');
    else no('bill title', 'missing');
    if (hasFrag(cv, 'STATUS: CLOTURE FAILED 49-50')) ok('bill status line');
    else no('bill status', 'missing');
    if (hasFrag(cv, 'STUCK AT: SENATE FLOOR')) ok('bill stuck-at line');
    else no('bill stuck-at', 'missing');
    if (hasFrag(cv, 'SRC:') && hasFrag(cv, 'CONGRESS.GOV')) ok('bill source URL footer');
    else no('bill source', 'SRC footer missing');
    if (hasFrag(cv, 'PULLED 2026-09-15') && hasFrag(cv, 'KIT 2026-10-05')) ok('bill pull/kit dates in footer');
    else no('bill dates', 'footer dates missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('bill callsign stamp + _pfStamped');
    else no('bill stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('bill bottom stack (deep link + CTA + date)');
    else no('bill bottom', 'stack incomplete');
  }
  /* --- Surface 5: bill poster (minimal / degraded payload) --- */
  cv = PHQ.paint('phq-bill', {});
  if (!cv) no('bill minimal', 'threw/failed on empty payload');
  else {
    ok('bill renders on empty payload (degraded)');
    if (hasFrag(cv, 'STUCK AT: \u2014') || hasFrag(cv, 'STUCK AT:\u2014')) ok('bill unknown location renders \u2014 (never invented)');
    else no('bill degrade', 'STUCK AT em-dash missing: ' + joined(cv).slice(0, 300));
    if (hasFrag(cv, 'JOIN THE FIGHT.')) ok('bill degraded keeps CTA standard');
    else no('bill degraded CTA', 'missing');
  }

  /* --- Surface 6: urgency poster (full payload) --- */
  cv = PHQ.paint('phq-urgency', URGENCY);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('urgency mount', 'no 1080x1350 canvas');
  else {
    ok('urgency mounts 1080x1350');
    if (hasFrag(cv, 'FINAL PUSH')) ok('urgency badge');
    else no('urgency badge', 'missing');
    var uop = opFor(cv, '5');
    if (uop && uop.fillStyle === '#c1121f' && /260px/.test(uop.font)) ok('urgency countdown number giant + red');
    else no('urgency number', 'not giant red: ' + JSON.stringify(uop && { f: uop.font, c: uop.fillStyle }));
    if (hasText(cv, 'DAYS LEFT')) ok('urgency DAYS LEFT label');
    else no('urgency label', 'missing');
    if (hasFrag(cv, 'STOP THE OLIGARCH POWER GRAB')) ok('urgency title');
    else no('urgency title', 'missing');
    if (hasText(cv, 'ENDS OCT 10')) ok('urgency ends date');
    else no('urgency ends', 'missing');
    if (hasText(cv, '1,234 SOLDIERS PRESSURING')) ok('urgency participant line');
    else no('urgency soldiers', 'missing');
    if (hasFrag(cv, 'TARGET BILL: H.R. 14')) ok('urgency bill reference');
    else no('urgency bill', 'missing');
    if (hasFrag(cv, 'KIT 2026-10-05')) ok('urgency kit date footer');
    else no('urgency footer', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true) ok('urgency callsign stamp + _pfStamped');
    else no('urgency stamp', 'missing');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.')) ok('urgency bottom stack');
    else no('urgency bottom', 'stack incomplete');
  }
  /* --- Surface 6: urgency poster (minimal / degraded payload) --- */
  cv = PHQ.paint('phq-urgency', {});
  if (!cv) no('urgency minimal', 'threw/failed on empty payload');
  else {
    ok('urgency renders on empty payload (degraded)');
    var uop2 = opFor(cv, '\u2014');
    if (uop2 && /260px/.test(uop2.font)) ok('urgency unknown days render \u2014 (never guessed)');
    else no('urgency degrade', 'countdown em-dash missing');
    if (!hasFrag(cv, 'SOLDIERS PRESSURING')) ok('urgency omits participant line when unknown');
    else no('urgency soldiers degrade', 'participant line present with no data');
  }

  /* --- no-callsign fallback --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  var PHQ2 = env2.sb.PF.PHQShare;
  cv = PHQ2.paint('phq-bill', BILL);
  if (cv && !hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true &&
      hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM'))
    ok('bill no-callsign: no blank stamp, claim-line funnel');
  else no('bill no-cs', 'stamp/funnel wrong');
  cv = PHQ2.paint('phq-urgency', URGENCY);
  if (cv && !hasFrag(cv, 'FIGHTING AS') && hasText(cv, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM'))
    ok('urgency no-callsign: no blank stamp, claim-line funnel');
  else no('urgency no-cs', 'stamp/funnel wrong');

  /* --- share/save routing through PFShare (XP rides the existing leg) --- */
  var r1 = PHQ.share('phq-bill', BILL);
  if (r1 === true && env.shareCalls.length === 1 && env.shareCalls[0].id === 'phq-bill' &&
      env.shareCalls[0].fn === 'pfn-phq-bill.png' && env.shareCalls[0].cv && env.shareCalls[0].cv._recs.length > 10)
    ok('share() routes phq-bill to PFShare.shareImage with painted canvas');
  else no('share()', 'routing failed');
  var r2 = PHQ.save('phq-urgency', URGENCY);
  if (r2 === true && env.saveCalls.length === 1 && env.saveCalls[0].id === 'phq-urgency' &&
      env.saveCalls[0].fn === 'pfn-phq-urgency.png')
    ok('save() routes phq-urgency to PFShare.saveImage with painted canvas');
  else no('save()', 'routing failed');
}

/* --- kill switches: ?pf_off=phq-bill --- */
console.log('== 4. kill switches ==');
var kenv = makeEnv(['phq-bill']);
var KPHQ = kenv.sb.PF.PHQShare;
if (KPHQ.paint('phq-bill', BILL) === null) ok('?pf_off=phq-bill: paint fails closed (null)');
else no('kill bill paint', 'painted despite kill switch');
if (KPHQ.share('phq-bill', BILL) === false) ok('?pf_off=phq-bill: share fails closed (false)');
else no('kill bill share', 'shared despite kill switch');
if (KPHQ.save('phq-bill', BILL) === false) ok('?pf_off=phq-bill: save fails closed (false)');
else no('kill bill save', 'saved despite kill switch');
if (KPHQ.ids.indexOf('phq-bill') === -1 && KPHQ.ids.indexOf('phq-urgency') !== -1)
  ok('?pf_off=phq-bill: registry carries urgency only');
else no('kill bill ids', 'registry wrong: ' + JSON.stringify(KPHQ.ids));
var kcv = KPHQ.paint('phq-urgency', URGENCY);
if (kcv && hasText(kcv, 'DAYS LEFT')) ok('?pf_off=phq-bill: urgency unaffected');
else no('kill bill sibling', 'urgency broken by bill kill switch');
var uenv = makeEnv(['phq-urgency']);
var UPHQ = uenv.sb.PF.PHQShare;
if (UPHQ.paint('phq-urgency', URGENCY) === null && UPHQ.share('phq-urgency', URGENCY) === false &&
    UPHQ.ids.indexOf('phq-urgency') === -1 && UPHQ.ids.indexOf('phq-bill') !== -1)
  ok('?pf_off=phq-urgency: urgency fails closed, bill unaffected');
else no('kill urgency', 'urgency kill switch not honored');

/* --- layout guards (no collisions with the bottom stack) --- */
console.log('== 5. layout guards ==');
[['phq-bill', BILL], ['phq-urgency', URGENCY], ['phq-bill', {}], ['phq-urgency', {}]].forEach(function (pc) {
  var c = PHQ.paint(pc[0], pc[1]);
  var rs = c._recs || [], bad = [], link = null, date = null;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
    if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
    if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
  }
  var tag = pc[0] + (pc[1] === BILL || pc[1] === URGENCY ? '' : ' (degraded)');
  if (!bad.length) ok(tag + ': clean gap above bottom stack');
  else no(tag + ' gap', 'content in stack gap: ' + bad.join(' | '));
  if (link === 1222) ok(tag + ': deep link at H-128');
  else no(tag + ' link', 'deep link y=' + link);
  if (date === 1302) ok(tag + ': date line at H-48');
  else no(tag + ' date', 'date y=' + date);
});

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
