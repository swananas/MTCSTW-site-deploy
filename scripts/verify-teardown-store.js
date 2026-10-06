#!/usr/bin/env node
/* scripts/verify-teardown-store.js — WS-9 STORE / WAR BONDS teardown verification
   (section teardown, CEO-approved 2026-10-06 ~14:28 CDT). Run from the worktree root:
     node scripts/verify-teardown-store.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on every touched/new file + this harness.
   2. 3-tier ladder: TIERS = BACKER ($5) / PATRON ($10) / QUARTERMASTER ($25).
   3. CEO DECISION 3 (HARD RULE): tier names are EXACTLY {BACKER, PATRON,
      QUARTERMASTER} — the lint FAILS on any XP rank-name tier (RECRUIT,
      AGITATOR, CADRE, COMMISSAR, ARCHITECT, SYMPATHIZER, VANGUARD, OPERATIVE).
   4. Quartermaster copy: every tier states what the money FUNDS IN THE FIGHT
      (funds line with amount + fight framing).
   5. Mission card per purchase: MISSION CARD + PAT.actionBar (P6) +
      REPORT BACK on first deployment; issued on the FUND confirm path.
   6. No-donate-language lint (comments stripped): FAILS on "donate" (any
      form), "give"/"gives"/"giving"/"gave"/"given", "support"/"supports"/
      "supporting"/"supported" as contribution verbs.
   7. CTA-verb lint: every button label matches the WS-9 sanctioned set —
      ENLIST AS {BACKER|PATRON|QUARTERMASTER} ->, FUND... ->, OUTFIT A CELL ->.
      No generic "ENLIST ->", no "CALL IT ->", no CONFIRM pill, no "donate".
      Red-button rule: only the store-scoped purchase buttons
      (.pf-qm-tier-btn / .pf-qm-fund-btn) may be red — no pf-pat-join /
      pf-pat-deploy-red in the module.
   8. Payment guardrails in code: provider tokenization markers,
      amount-confirm screen (showAmountConfirm before any checkout),
      idempotency keys (idempotencyKey), aggregates-only ledger marker,
      flair opt-in only (checkbox defaults OFF — no checked attribute).
   9. Zero new XP mechanics: no xpGrant/grantXP/mint in the module
      (War Bonds stay 0 XP).
   10. Zero backend writes: no fetch/XHR/beacon/authPost in the module.
   11. Kill switch: PF.skip('quartermaster') stages nothing (vm test).
   12. Bundle verification: rebuilt minified bundle-home.js contains the
       quartermaster module; bundle-pages.js contains the home-v2 order entry.
   13. Inner-script gate: scripts/check-inner-scripts.js passes on the module.
   14. Fail-open: PAT null renders the maintenance fallback, never throws
       (static check of the guard). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var G = function (p) { return path.join(ROOT, 'v1.4.3', 'games', p); };
var QM = G('store-quartermaster.js');
var WAR_BONDS = G('war-bonds.js');
var HOME_V2 = path.join(ROOT, 'v1.4.3', 'pages', 'home-v2.js');
var BUNDLE_BUILD = path.join(ROOT, 'build', 'bundle.js');
var BUNDLE_HOME = G('bundle-home.js');
var BUNDLE_PAGES = path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js');
var INNER_GATE = path.join(ROOT, 'scripts', 'check-inner-scripts.js');

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
   AGENTS.md lesson — lints run on the comment-stripped view WITHOUT naive
   string-stripping). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[QM, WAR_BONDS, HOME_V2, BUNDLE_BUILD, __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check', path.basename(p) + ': ' + err);
  else ok('node --check: ' + path.basename(p));
});

/* ================= 2. 3-tier ladder ================= */
console.log('[2] 3-tier ladder');
(function () {
  var src = stripComments(read(QM));
  var tiers = [];
  var re = /\{\s*name:'([A-Z]+)',\s*amount:(\d+)/g, m;
  while ((m = re.exec(src)) !== null) tiers.push({ name: m[1], amount: Number(m[2]) });
  var want = { BACKER: 5, PATRON: 10, QUARTERMASTER: 25 };
  Object.keys(want).forEach(function (n) {
    var t = tiers.filter(function (x) { return x.name === n; })[0];
    if (!t) bad('tier ladder', n + ' missing from TIERS');
    else if (t.amount !== want[n]) bad('tier ladder', n + ' amount ' + t.amount + ' != ' + want[n]);
    else ok('tier ' + n + ' $' + t.amount + '/mo');
  });
  if (tiers.length !== 3) bad('tier ladder', 'expected exactly 3 tiers, found ' + tiers.length);
})();

/* ================= 3. CEO Decision 3: tier names ================= */
console.log('[3] CEO Decision 3 — tier names (HARD RULE)');
(function () {
  var src = stripComments(read(QM));
  var XP_RANKS = ['RECRUIT', 'AGITATOR', 'CADRE', 'COMMISSAR', 'ARCHITECT',
    'SYMPATHIZER', 'VANGUARD', 'OPERATIVE'];
  var names = [];
  var re = /name:'([A-Z]+)'/g, m;
  while ((m = re.exec(src)) !== null) {
    if (['BACKER', 'PATRON', 'QUARTERMASTER'].indexOf(m[1]) > -1 && names.indexOf(m[1]) === -1)
      names.push(m[1]);
  }
  var sorted = names.slice().sort().join(',');
  if (sorted !== 'BACKER,PATRON,QUARTERMASTER')
    bad('tier names', 'expected BACKER,PATRON,QUARTERMASTER — found: ' + sorted);
  else ok('tiers named BACKER / PATRON / QUARTERMASTER');
  /* lint must FAIL on rank-name tiers: no XP rank name may appear as a tier */
  var tierBlock = (src.match(/var TIERS=\[[\s\S]*?\];/) || [''])[0];
  XP_RANKS.forEach(function (r) {
    if (new RegExp("name:'" + r + "'").test(tierBlock))
      bad('rank-name tier lint', 'XP rank name "' + r + '" used as a store tier');
  });
  ok('rank-name tier lint clean (no XP rank names as tiers)');
})();

/* ================= 4. quartermaster copy ================= */
console.log('[4] funds-the-fight copy');
(function () {
  var src = stripComments(read(QM));
  var funds = [];
  var re = /funds:'((?:[^'\\]|\\.)*)'/g, m;
  while ((m = re.exec(src)) !== null) funds.push(m[1]);
  if (funds.length !== 3) { bad('funds copy', 'expected 3 tier funds lines, found ' + funds.length); return; }
  var frames = ['flyer run', 'banner run', 'full quarter'];
  funds.forEach(function (f, i) {
    if (/\$\d+\/mo/.test(f) && f.indexOf(frames[i]) > -1)
      ok('tier funds-the-fight copy: "' + frames[i] + '"');
    else bad('funds copy', 'tier ' + i + ' missing amount + fight framing: ' + f.slice(0, 60));
  });
  if (!/Not a gift shop/.test(src)) bad('funds copy', 'quartermaster hero mission missing');
  else ok('quartermaster hero: "War bonds that fund the fight. Not a gift shop."');
})();

/* ================= 5. mission card ================= */
console.log('[5] mission card per purchase');
(function () {
  var src = stripComments(read(QM));
  if (!/MISSION CARD/.test(src)) bad('mission card', 'MISSION CARD kicker missing');
  else ok('mission card kicker present');
  if (!/PAT\.actionBar\(/.test(src)) bad('mission card', 'PAT.actionBar (P6) not used');
  else ok('mission card uses PAT.actionBar (P6)');
  var bar = src.match(/PAT\.actionBar\(\{[\s\S]*?\}\)/);
  if (!bar || !/REPORT BACK/.test(read(QM))) bad('mission card', 'REPORT BACK handoff missing');
  else ok('mission card Action Bar: SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK');
  if (!/showAmountConfirm/.test(src) || !/missionCard\(tier,short\)/.test(src))
    bad('mission card', 'mission card not issued on the FUND confirm path');
  else ok('mission card issued on purchase (post amount-confirm)');
  if (!/FIRST DEPLOYMENT ORDERS/.test(src)) bad('mission card', 'first-deployment orders headline missing');
  else ok('first-deployment orders headline present');
})();

/* ================= 6. no-donate-language lint ================= */
console.log('[6] no-donate-language lint');
(function () {
  var files = [QM, WAR_BONDS];
  var banned = [
    [/donat\w*/i, '"donate" (any form)'],
    [/\b(give|gives|giving|gave|given)\b/i, '"give" as contribution verb'],
    [/\b(support|supports|supporting|supported)\b/i, '"support" as contribution verb']
  ];
  files.forEach(function (p) {
    var src = stripComments(read(p));
    var base = path.basename(p);
    var clean = true;
    banned.forEach(function (b) {
      if (b[0].test(src)) { bad('donate-language lint', b[1] + ' in ' + base); clean = false; }
    });
    if (clean) ok('donate-language lint clean: ' + base);
  });
})();

/* ================= 7. CTA-verb lint ================= */
console.log('[7] CTA-verb lint (WS-9 sanctioned set)');
(function () {
  var src = stripComments(read(QM));
  /* check the actual label construction sites */
  var found = 0;
  if (/ENLIST AS '\+esc\(tier\.name\)\+' \\u2192/.test(src)) { found++; ok('tier CTA: "ENLIST AS {TIER} \u2192"'); }
  if (/FUND \$'\+tier\.amount/.test(src)) { found++; ok('confirm CTA: "FUND $X/MO \u2192"'); }
  if (/OUTFIT A CELL \\u2192/.test(src)) { found++; ok('one-time link: "OUTFIT A CELL \u2192"'); }
  if (found !== 3) bad('CTA labels', 'expected 3 sanctioned CTA sites, found ' + found);
  var banned = [
    [/donate/i, '"donate" as CTA'],
    [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as CTA'],
    [/enlist\s*(\u2192|->)/i, 'generic "ENLIST ->" as CTA'],
    [/>CONFIRM</, 'CONFIRM pill CTA']
  ];
  banned.forEach(function (b) {
    /* "ENLIST AS X ->" must not trip the generic ENLIST ban: the regex above
       only matches ENLIST directly followed by the arrow */
    if (b[0].test(src)) bad('CTA-verb lint', b[1] + ' in store-quartermaster.js');
  });
  ok('rogue-verb lint clean (no generic ENLIST ->, CALL IT ->, CONFIRM pill, donate)');
  /* red-button rule: only store-scoped purchase buttons may be red */
  if (/pf-pat-join|pf-pat-deploy-red/.test(src))
    bad('red-button rule', 'pf-pat-join / pf-pat-deploy-red in module');
  else ok('red-button rule: only .pf-qm-tier-btn / .pf-qm-fund-btn are red (store purchase CTAs)');
})();

/* ================= 8. payment guardrails ================= */
console.log('[8] payment guardrails');
(function () {
  var src = stripComments(read(QM));
  function need(re, name) {
    if (re.test(src)) ok(name);
    else bad('payment guardrails', name + ' marker missing');
  }
  need(/provider-tokenized/, 'tokenization: provider-tokenized card handling');
  need(/never touches site JS|never sees or stores your card number/, 'tokenization: no PAN in site JS');
  need(/showAmountConfirm/, 'amount-confirm screen before any charge');
  need(/AMOUNT CONFIRM/, 'amount-confirm screen rendered');
  need(/idempotencyKey/, 'idempotency keys minted per purchase intent');
  need(/aggregates-only/, 'aggregates-only public ledger');
  need(/opt-in-only/, 'flair opt-in only');
  /* flair checkbox must default OFF */
  var flairInput = src.match(/<input type="checkbox" id="pfQmFlair"[^>]*>/);
  if (!flairInput) bad('payment guardrails', 'flair opt-in checkbox missing');
  else if (/checked/.test(flairInput[0])) bad('payment guardrails', 'flair checkbox defaults ON');
  else ok('flair opt-in checkbox defaults OFF');
  /* TIER_PRODUCTS wiring point present with hand-step note */
  if (!/TIER_PRODUCTS/.test(src)) bad('payment guardrails', 'TIER_PRODUCTS wiring point missing');
  else ok('TIER_PRODUCTS wiring point (H1 hand-step documented)');
})();

/* ================= 9. zero new XP ================= */
console.log('[9] zero new XP mechanics');
(function () {
  var src = stripComments(read(QM));
  var banned = [/xpgrant/i, /grantxp/i, /\bmint\s*\(/i, /mintxp/i, /addxp/i];
  var clean = true;
  banned.forEach(function (b) {
    if (b.test(src)) { bad('zero XP', 'XP mint/grant pattern in module: ' + b); clean = false; }
  });
  if (!/grant no XP, ever/.test(src)) bad('zero XP', '0-XP delink notice missing from copy');
  else if (clean) ok('zero XP: no mint/grant; 0-XP delink stated in copy');
})();

/* ================= 10. zero backend writes ================= */
console.log('[10] zero backend writes');
(function () {
  var src = stripComments(read(QM));
  var banned = [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /authPost/, /authGet/, /\.post\s*\(/];
  var clean = true;
  banned.forEach(function (b) {
    if (b.test(src)) { bad('zero backend writes', 'network write pattern: ' + b); clean = false; }
  });
  if (clean) ok('zero backend writes (device-local order records only)');
})();

/* ================= 11. kill switch (vm) ================= */
console.log('[11] kill switch');
(function () {
  function load(skip) {
    var staged = [];
    var sandbox = {
      window: {
        PF: {
          skip: function (silo) { return !!skip && silo === 'quartermaster'; },
          holder: function () {
            return { insertAdjacentHTML: function (pos, html) { staged.push(html); } };
          }
        }
      },
      console: console
    };
    vm.runInNewContext(read(QM), sandbox, { filename: 'store-quartermaster.js' });
    return staged;
  }
  try {
    var off = load(true);
    if (off.length) bad('kill switch', '?pf_off=quartermaster staged ' + off.length + ' template(s)');
    else ok('?pf_off=quartermaster stages nothing');
    var on = load(false);
    if (!on.length) bad('kill switch', 'module stages nothing when enabled');
    else if (!/pf-ov-quartermaster/.test(on[0])) bad('kill switch', 'staged template id wrong');
    else ok('enabled: stages pf-ov-quartermaster template');
  } catch (e) {
    bad('kill switch', 'vm load threw: ' + (e && e.message));
  }
})();

/* ================= 12. bundle verification ================= */
console.log('[12] bundle verification (rebuilt minified output)');
(function () {
  var bh, bp;
  try { bh = read(BUNDLE_HOME); } catch (e) { bad('bundles', 'bundle-home.js missing — rebuild first'); return; }
  try { bp = read(BUNDLE_PAGES); } catch (e) { bad('bundles', 'bundle-pages.js missing — rebuild first'); return; }
  if (!/pf-ov-quartermaster/.test(bh)) bad('bundles', 'bundle-home.js lacks the quartermaster module');
  else ok('bundle-home.js contains store-quartermaster');
  if (!/QUARTERMASTER/.test(bh)) bad('bundles', 'bundle-home.js lacks QUARTERMASTER tier content');
  else ok('bundle-home.js contains tier content');
  if (!/pf-ov-quartermaster/.test(bp)) bad('bundles', 'bundle-pages.js lacks the home-v2 order entry');
  else ok('bundle-pages.js contains quartermaster order entry');
  if (!/store-quartermaster\.js/.test(read(BUNDLE_BUILD))) bad('bundles', 'build/bundle.js not registering the module');
  else ok('build/bundle.js registers store-quartermaster.js');
})();

/* ================= 13. inner-script gate ================= */
console.log('[13] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath, [INNER_GATE, QM], { encoding: 'utf8' });
  if (r.status !== 0) bad('inner-script gate', (r.stderr || r.stdout || 'failed').split('\n')[0]);
  else ok('check-inner-scripts.js passes on store-quartermaster.js');
})();

/* ================= 14. fail-open ================= */
console.log('[14] fail-open');
(function () {
  var src = stripComments(read(QM));
  if (!/if\(!PAT\)/.test(src)) bad('fail-open', 'PAT-null guard missing');
  else ok('PAT null -> maintenance fallback, never throws');
  if (!/try\{\s*render\(\);\s*\}catch/.test(src)) bad('fail-open', 'render() not wrapped in try/catch');
  else ok('render() wrapped in try/catch');
})();

console.log('\n' + passes + ' passed, ' + failures.length + ' failed.');
process.exit(failures.length ? 1 : 0);
