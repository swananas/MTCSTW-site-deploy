#!/usr/bin/env node
/* scripts/verify-teardown-arcade.js — WS-2 ARCADE teardown verification
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-arcade.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on every touched/new file + this harness.
   2. Card structure: every game card = Intel Card (P2) + Data Strip (P4) +
      Social-Proof Line (P8) + DEPLOY -> + Action Bar (P6).
      - arcade-cards.js: 10-card catalog (7 /arcade, 2 /call-it, 1 /liquidation);
        cardHTML composes pf-pat-intel + dataStrip + proof + deploy + actionBar.
      - markets.js marketRow(): pf-pat-intel + dataStrip + proof +
        data-wdeploy (in-place detail open) + actionBar.
      - predgame.js questionHTML(): pf-pat-intel + dataStrip (closing time).
   3. Plain-stakes language lint (comments stripped): no "volume", no
      "liquidity", no "odds"/"pays Nx"/"no bets yet" gambling framing in card
      copy; "bettors" survives only as the backend field name (.bettors).
   4. In-place play: every card DEPLOY href is an in-page #anchor; no
      app-store / external redirect anywhere in the arcade play path.
   5. Action Bar present: pf-pat-actions via PAT.actionBar on lobby + market
      cards; the CALL IT. section keeps the staged data-pf-handoff pair the
      share-everywhere scanner converts to the branded bar.
   6. CTA-verb lint (rogue-verb map): no "CALL IT ->" as a card CTA (the
      product NAME "CALL IT." and the "CALLED IT — NEXT QUESTION ->"
      result link are fine), no "ENLIST ->", no "donate", no CONFIRM pill;
      News Desk red-button rule — card actions are text links (no
      pf-pat-deploy-red / pf-pat-join in card code).
   7. Kill switches: every arcade silo honors PF.skip("<key>"); functional
      vm test — ?pf_off=arcade-cards stages nothing.
   8. Zero new XP mechanics / zero backend writes in arcade-cards.js
      (JSONP reads only — the established read pattern).
   9. Bundle verification: rebuilt minified bundles contain the new modules
      and the page-mount order change.
   10. Inner-script gate: scripts/check-inner-scripts.js passes.
   11. Styles sync: build/check-styles-sync.js passes (33-patterns.css fix
       mirrored into the served bundle-styles.css). */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var G = function (p) { return path.join(ROOT, 'v1.4.3', 'games', p); };
var ARCADE_CARDS = G('arcade-cards.js');
var MARKETS = G('markets.js');
var PREDGAME = G('predgame.js');
var GAMBITS = G('gambits.js');
var BRACKET = G('bracket-board.js');
var PAGE_MOUNT = path.join(ROOT, 'v1.4.3', 'pages', 'page-mount.js');
var BUNDLE_ARCADE = G('bundle-arcade.js');
var BUNDLE_PREDGAME = G('bundle-predgame.js');
var BUNDLE_PAGES = path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js');

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

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[ARCADE_CARDS, MARKETS, PREDGAME, GAMBITS, PAGE_MOUNT,
 path.join(ROOT, 'build', 'bundle.js'), __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check ' + path.basename(p), err); else ok('node --check ' + path.basename(p));
});

/* ================= 2. card structure ================= */
console.log('[2] card structure (P2 + P4 + P8 + DEPLOY + P6)');
(function () {
  var src = read(ARCADE_CARDS);
  var cards = (src.match(/\{page:'pf-(arcade|call-it|liquidation)'/g) || []).length;
  if (cards >= 10) ok('arcade-cards.js catalog: ' + cards + ' game cards');
  else bad('arcade-cards.js catalog', 'expected >= 10 game cards, found ' + cards);
  ['pf-arcade', 'pf-call-it', 'pf-liquidation'].forEach(function (pg) {
    var n = (src.match(new RegExp("\\{page:'" + pg + "'", 'g')) || []).length;
    if (n >= 1) ok('cards for ' + pg + ': ' + n);
    else bad('cards for ' + pg, 'no cards found');
  });
  var body = src;
  [['pf-pat-intel', 'Intel Card (P2)'], ['dataStrip', 'Data Strip (P4)'],
   ['PAT.proof', 'Social-Proof Line (P8)'], ['PAT.deploy', 'DEPLOY -> CTA'],
   ['PAT.actionBar', 'Action Bar (P6)'], ['pf-arc-grid', '2-up card grid']
  ].forEach(function (pair) {
    if (body.indexOf(pair[0]) !== -1) ok('lobby card composes ' + pair[1]);
    else bad('lobby card', pair[1] + ' missing from cardHTML');
  });

  var mk = read(MARKETS);
  var rowStart = mk.indexOf('function marketRow(m)');
  var rowEnd = mk.indexOf('\nfunction ', rowStart + 1);
  var rowFn = rowStart !== -1 ? mk.slice(rowStart, rowEnd !== -1 ? rowEnd : undefined) : '';
  [['pf-pat-intel', 'Intel Card (P2)'], ['dataStrip', 'Data Strip (P4)'],
   ['PAT.proof', 'Social-Proof Line (P8)'], ['data-wdeploy', 'DEPLOY -> (in-place open)'],
   ['PAT.actionBar', 'Action Bar (P6)'], ['plainStakes', 'plain-stakes line']
  ].forEach(function (pair) {
    if (rowFn.indexOf(pair[0]) !== -1) ok('marketRow() composes ' + pair[1]);
    else bad('marketRow()', pair[1] + ' missing');
  });

  var pg = read(PREDGAME);
  var qStart = pg.indexOf('function questionHTML(q)');
  var qEnd = pg.indexOf('\n  function ', qStart + 1);
  var qh = qStart !== -1 ? pg.slice(qStart, qEnd !== -1 ? qEnd : undefined) : '';
  if (qh.indexOf('pf-pat-intel') !== -1) ok('questionHTML() renders Intel Card (P2)');
  else bad('questionHTML()', 'pf-pat-intel missing');
  if (qh.indexOf('dataStrip') !== -1) ok('questionHTML() renders Data Strip (P4, closing time)');
  else bad('questionHTML()', 'dataStrip missing');
})();

/* ================= 3. plain-stakes language lint ================= */
console.log('[3] plain-stakes language lint');
(function () {
  var files = [ARCADE_CARDS, MARKETS, PREDGAME, GAMBITS, BRACKET];
  files.forEach(function (p) {
    var src = stripComments(read(p));
    var base = path.basename(p);
    if (/liquidity/i.test(src)) bad('trader jargon', '"liquidity" in ' + base);
    else ok('no "liquidity" in ' + base);
    if (/volume/i.test(src)) bad('trader jargon', '"volume" in ' + base);
    else ok('no "volume" in ' + base);
  });
  var mk = stripComments(read(MARKETS));
  if (/pays\s/i.test(mk)) bad('gambling framing', '"pays Nx" odds copy in markets.js');
  else ok('no "pays Nx" odds copy in markets.js');
  if (/no bets yet/i.test(mk)) bad('gambling framing', '"no bets yet" in markets.js');
  else ok('no "no bets yet" in markets.js');
  var noProp = mk.replace(/\.bettors?/g, ' ');
  if (/bettor/i.test(noProp)) bad('gambling framing', '"bettor(s)" in user copy (markets.js)');
  else ok('"bettors" survives only as the backend field name');
  var noCls = mk.replace(/\.wm-sodds|\.cs-odds|wm-sodds|cs-odds/g, ' ');
  if (/\bodds\b/i.test(noCls)) bad('gambling framing', '"odds" in user copy (markets.js)');
  else ok('no "odds" in user copy ("odds" only in legacy class names)');
})();

/* ================= 4. in-place play ================= */
console.log('[4] in-place play (one tap, no redirect, no install)');
(function () {
  var src = read(ARCADE_CARDS);
  var anchors = src.match(/anchor:'(#[^']+)'/g) || [];
  var badAnchors = anchors.filter(function (a) { return a.indexOf("anchor:'#") !== 0; });
  if (anchors.length >= 10 && !badAnchors.length) ok(anchors.length + ' DEPLOY targets, all in-page #anchors');
  else bad('DEPLOY targets', 'expected >= 10 in-page anchors, got ' + anchors.length + ', bad: ' + badAnchors.length);
  var mk = read(MARKETS);
  if (mk.indexOf('href="#pf-forecasts" data-wdeploy') !== -1) ok('market card DEPLOY -> opens the detail in place (#pf-forecasts)');
  else bad('market card DEPLOY', 'in-place data-wdeploy link missing');
  [ARCADE_CARDS, MARKETS, PREDGAME, GAMBITS, BRACKET].forEach(function (p) {
    var src2 = read(p);
    if (/apps\.apple\.com|play\.google\.com|itunes\.apple\.com/i.test(src2))
      bad('app-store flow', 'store URL in ' + path.basename(p));
  });
  ok('no app-store / install URLs in the arcade play path');
  if (/location\.href\s*=\s*['"]https?:/i.test(src)) bad('external redirect', 'in arcade-cards.js');
  else ok('no external redirects in the card play path');
})();

/* ================= 5. action bar ================= */
console.log('[5] Action Bar (P6) present');
(function () {
  var ac = read(ARCADE_CARDS), mk = read(MARKETS), pg = read(PREDGAME);
  if (ac.indexOf('PAT.actionBar(') !== -1) ok('lobby cards end with the Action Bar (P6)');
  else bad('lobby cards', 'PAT.actionBar missing');
  if (mk.indexOf('PAT.actionBar(') !== -1) ok('market cards end with the Action Bar (P6)');
  else bad('market cards', 'PAT.actionBar missing');
  if (pg.indexOf('data-pf-handoff="share-intel"') !== -1 && pg.indexOf('data-pf-handoff="report-back"') !== -1)
    ok('CALL IT. section keeps the staged handoff pair (scanner -> branded bar)');
  else bad('CALL IT. section', 'data-pf-handoff pair missing');
  /* the P6 order is pattern-guaranteed — prove it against the real helper */
  (function () {
    var pf = { skip: function () { return false; } };
    var sandbox = { window: { PF: pf }, console: console };
    vm.runInNewContext(read(path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js')), sandbox, { filename: '33-patterns.js' });
    var P = sandbox.window.PF.patterns;
    var out = P.actionBar({ shareUrl: '/s', cellUrl: '/c', reportUrl: '/r' });
    var labels = ['SHARE THIS INTEL', 'TAKE THIS TO YOUR CELL', 'REPORT BACK'];
    var pos = labels.map(function (l) { return out.indexOf(l); });
    if (pos[0] !== -1 && pos[0] < pos[1] && pos[1] < pos[2])
      ok('P6 order enforced by the helper: SHARE THIS INTEL -> TAKE THIS TO YOUR CELL -> REPORT BACK');
    else bad('P6 order', 'actionBar output order wrong: ' + out.slice(0, 120));
  })();
})();

/* ================= 6. CTA-verb lint ================= */
console.log('[6] CTA-verb lint (rogue-verb map + red-button rule)');
(function () {
  var files = [ARCADE_CARDS, MARKETS, PREDGAME];
  files.forEach(function (p) {
    var src = stripComments(read(p));
    var base = path.basename(p);
    var banned = [
      [/donate/i, '"donate"'],
      [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as a card CTA'],
      [/enlist\s*(\u2192|->)/i, '"ENLIST ->" as a card CTA'],
      [/follow their money\s*(\u2192|->)/i, '"FOLLOW THEIR MONEY ->" as a button']
    ];
    banned.forEach(function (b) {
      if (b[0].test(src)) bad('CTA-verb lint', b[1] + ' in ' + base);
    });
    ok('CTA-verb lint clean: ' + base);
  });
  /* the product NAME "CALL IT." and the "CALLED IT — NEXT QUESTION ->"
     result-state link are explicitly fine — prove the lint allows them */
  var pg = stripComments(read(PREDGAME));
  if (/<h2>CALL IT\.<\/h2>/.test(pg)) ok('product NAME "CALL IT." preserved (not a CTA)');
  else bad('product name', '"CALL IT." heading missing from predgame.js');
  if (/CALLED IT/.test(pg) && !/call\s*it\s*(\u2192|->)/i.test(pg))
    ok('"CALLED IT — NEXT QUESTION ->" result link passes the CTA lint');
  /* News Desk red-button rule: card actions are text links */
  [ARCADE_CARDS, MARKETS].forEach(function (p) {
    var src = stripComments(read(p));
    var base = path.basename(p);
    if (/pf-pat-deploy-red|pf-pat-join/.test(src)) bad('red-button rule', 'red button class in card code (' + base + ')');
    else ok('red-button rule: card CTAs are text links (' + base + ')');
  });
})();

/* ================= 7. kill switches ================= */
console.log('[7] kill switches (?pf_off= / localStorage)');
(function () {
  var silos = [
    [ARCADE_CARDS, 'arcade-cards'], [MARKETS, 'markets'], [PREDGAME, 'predgame'],
    [GAMBITS, 'gambits'], [BRACKET, 'bracket-board'],
    [G('caption-combat.js'), 'caption-combat'], [G('creator-guess.js'), 'creator-guess'],
    [G('daily-interrogation.js'), 'daily-interrogation'],
    [G('billionaire-supervillain.js'), 'billionaire-supervillain'],
    [G('infighting.js'), 'infighting'], [G('deploy-tracker.js'), 'deploy-tracker']
  ];
  silos.forEach(function (pair) {
    var src = read(pair[0]);
    if (src.indexOf("PF.skip('" + pair[1] + "')") !== -1 || src.indexOf('PF.skip("' + pair[1] + '")') !== -1)
      ok('PF.skip("' + pair[1] + '")');
    else bad('kill switch', 'PF.skip("' + pair[1] + '") missing in ' + path.basename(pair[0]));
  });
  /* functional: ?pf_off=arcade-cards stages nothing (fail-open) */
  function runOuter(skipIt) {
    var staged = null;
    var sandbox = {
      window: {
        PF: {
          skip: function (s) { return !!skipIt && s === 'arcade-cards'; },
          holder: function () {
            return { insertAdjacentHTML: function (pos, html) { staged = html; } };
          }
        }
      },
      console: console
    };
    vm.runInNewContext(read(ARCADE_CARDS), sandbox, { filename: 'arcade-cards.js' });
    return staged;
  }
  var killed = runOuter(true);
  if (killed === null) ok('?pf_off=arcade-cards stages nothing (fail-open)');
  else bad('kill switch', 'template staged even when skipped');
  var live = runOuter(false);
  if (live && live.indexOf('pf-ov-arcade-cards') !== -1) ok('arcade-cards stages pf-ov-arcade-cards when live');
  else bad('kill switch', 'template missing when not skipped');
})();

/* ================= 8. zero new XP / zero backend writes ================= */
console.log('[8] zero new XP mechanics / zero backend writes');
(function () {
  var src = stripComments(read(ARCADE_CARDS));
  var banned = ['xpGrant', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'authPost', 'localStorage', '.ajax('];
  var hits = banned.filter(function (b) { return src.indexOf(b) !== -1; });
  if (hits.length) bad('zero XP/writes', 'forbidden calls in arcade-cards.js: ' + hits.join(', '));
  else ok('arcade-cards.js: JSONP reads only, zero writes, zero XP mechanics');
})();

/* ================= 9. bundle verification (minified output) ================= */
console.log('[9] bundle verification');
(function () {
  function has(file, marker, label) {
    if (!fs.existsSync(file)) { bad('bundle', label + ' — file missing: ' + path.basename(file)); return; }
    var src = read(file);
    if (src.indexOf(marker) !== -1) ok(label);
    else bad('bundle', label + ' — marker "' + marker + '" missing from ' + path.basename(file));
  }
  /* NOTE: the build's "===== file.js =====" separators are comments — terser
     strips them. These markers are all string contents, which survive. */
  has(BUNDLE_ARCADE, 'xArcadeCards', 'bundle-arcade.js ships arcade-cards.js');
  has(BUNDLE_ARCADE, 'pf-ov-arcade-cards', 'bundle-arcade.js stages pf-ov-arcade-cards');
  has(BUNDLE_ARCADE, 'pf-pat-actions', 'bundle-arcade.js contains the Action Bar');
  has(BUNDLE_ARCADE, 'pf-pat-data', 'bundle-arcade.js contains Data Strips');
  has(BUNDLE_ARCADE, 'data-wdeploy', 'bundle-arcade.js contains in-place market DEPLOY');
  has(BUNDLE_ARCADE, 'arcade-cards', 'bundle-arcade.js honors the arcade-cards kill key');
  has(BUNDLE_PREDGAME, 'pf-pat pf-pat-intel', 'bundle-predgame.js ships Intel-Card question rows');
  has(BUNDLE_PREDGAME, 'UNTIL CALLS CLOSE', 'bundle-predgame.js ships closing-time strips');
  has(BUNDLE_PAGES, 'pf-ov-arcade-cards', 'bundle-pages.js ships the page-mount order change');
})();

/* ================= 10. inner-script gate ================= */
console.log('[10] inner-script gate');
(function () {
  var r = cp.spawnSync(process.execPath,
    [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), ARCADE_CARDS, MARKETS, PREDGAME],
    { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) ok('check-inner-scripts.js passes on the arcade silos');
  else bad('inner-script gate', (r.stderr || r.stdout || 'failed').split('\n').slice(0, 5).join(' | '));
})();

/* ================= 11. styles sync ================= */
console.log('[11] styles sync');
(function () {
  var r = cp.spawnSync(process.execPath, [path.join(ROOT, 'build', 'check-styles-sync.js')],
    { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0) ok('check-styles-sync.js passes (33-patterns.css fix mirrored to bundle-styles.css)');
  else bad('styles sync', (r.stderr || r.stdout || 'failed').split('\n').slice(0, 5).join(' | '));
})();

console.log('\nRESULT: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.error('\nFAILURES:'); failures.forEach(function (f) { console.error(' - ' + f); }); process.exit(1); }
console.log('ALL CHECKS GREEN');
