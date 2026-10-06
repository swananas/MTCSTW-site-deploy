#!/usr/bin/env node
/* scripts/verify-teardown-warreport.js — WS-7 WAR REPORT teardown verification
   (section teardown, CEO-approved 2026-10-06). Run from the worktree root:
     node scripts/verify-teardown-warreport.js
   AFTER rebuilding bundles: node build/bundle.js && node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on war-report.js, build/bundle.js, this harness.
   2. Labeled micro-block structure per item (functional render test with the
      REAL PF.patterns library): every item = Briefing Hero (P1, kicker +
      mission <=10 words) + Intel Cards (P2) in the labeled skeleton
      1 BIG THING / WHY IT MATTERS / BY THE NUMBERS / WHAT'S NEXT / GO DEEPER.
   3. "YOUR ORDERS ->" kicker present on EVERY item (section items, meme
      item, fan-favorite item render paths).
   4. Every mission CTA resolves to a real destination: href allowlist +
      fragment targets exist in-DOM; no javascript:/data: URLs, no empties.
   5. Action Bar (P6) present on every item, fixed order:
      SHARE THIS INTEL -> TAKE THIS TO YOUR CELL -> REPORT BACK.
   6. CTA-verb lint clean (rogue-verb map): no CALL IT -> / ENLIST -> /
      donate / CONFIRM pill in CTA copy; red-button rule — no bare red
      .c-btn, no pf-pat-join (enlistment-only; the report is callsign-gated);
      card actions are text links (wrCard never emits a red button).
   7. Kill switches work (vm): PF.skip("war-report")=true stages nothing.
   8. "5-minute read" header contract present in the rendered report.
   9. P8 social proof: meme + fan-fav proof lines carry REAL counts.
   10. Zero new XP mechanics / zero new backend writes (only the staged
      honest email capture POST).
   11. Bundle verification: rebuilt minified bundle-warreport.js contains the
      new markers.
   12. Inner-script gate: scripts/check-inner-scripts.js passes.
   13. Styles sync: build/check-styles-sync.js passes. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var WAR = path.join(ROOT, 'v1.4.3', 'games', 'war-report.js');
var PATTERNS = path.join(ROOT, 'v1.4.3', 'core', '33-patterns.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-warreport.js');

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
function extractFn(inner, name) {
  var m = inner.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n}'));
  if (!m) throw new Error('function not found: ' + name);
  return m[0];
}

/* ================= 1. syntax ================= */
console.log('[1] node --check');
[WAR, path.join(ROOT, 'build', 'bundle.js'), __filename].forEach(function (p) {
  var err = nodeCheck(p);
  if (err) bad('node --check ' + path.basename(p), err); else ok('node --check ' + path.basename(p));
});

var src = read(WAR);
var code = stripComments(src);
var inner;
try { inner = innerScript(src); ok('inner script extracted (browser view)'); }
catch (e) { bad('inner script extraction', e.message); }

/* ================= 2. micro-block structure (functional) ================= */
console.log('[2] micro-block structure per item');
var T = null;
if (inner) {
  try {
    var sb = { window: { PF: { skip: function () { return false; } } } };
    vm.createContext(sb);
    vm.runInContext(read(PATTERNS), sb); /* real PF.patterns */
    var fns = ['wrTrim', 'esc', 'wrIsHeader', 'parseReport', 'wrHeadline',
      'wrBlocks', 'wrMissionFor', 'wrLinkify', 'wrPat', 'wrHero', 'wrCard',
      'wrOrdersHtml', 'wrItemHtml', 'wrExtractMeme', 'wrMemeItemHtml',
      'weekNavHtml', 'shareRowHtml', 'emailPaneHtml', 'nextActionRow', 'reportHtml']
      .map(function (n) { return extractFn(inner, n); }).join('\n');
    var driver = fns +
      '\nvar WR_WEEKS=[],WR_CUR=null,WR_CACHE={};' +
      '\n;({item:wrItemHtml,memeItem:wrMemeItemHtml,report:reportHtml,mission:wrMissionFor,next:nextActionRow});';
    T = vm.runInContext(driver, sb);
    ok('render functions evaluated with real PF.patterns');
  } catch (e) { bad('render harness', e.message); }
}
var BODY = [
  'SOLDIER testsoldier,',
  '',
  'YOUR WEEK IN NUMBERS (week of 2026-10-05):',
  '  120 XP earned across 5/7 active days',
  '  Streak: 6-day (best: 12)',
  '  Medals: none yet — chase them this week',
  '',
  'CELL WAR:',
  '  Red Cell — Rank #2 of 14',
  '  CHAMPIONS! Your cell took the crown all week.',
  '',
  'NEXT WEEK — ORDERS:',
  '  - You were active 5/7 days. A perfect week protects your streak.',
  '  - Join a cell. Solo soldiers leave bonus XP on the table.',
  '  Read the full dispatch: https://example.com/war-report',
  '',
  'MEME OF THE WEEK:',
  '  "Billionaires hate this one trick" — @memelord',
  '  1,204 soldiers shared it this week',
  '  The fight: landlord memes go mega-viral',
  '  Source: https://example.com/meme',
  ''
].join('\n');
var itemHtml = [];
if (T) {
  try {
    var r = { subject: 'WAR REPORT', week_start: '2026-10-05', created_at: String(Date.now()), body: BODY };
    var html = T.report(r);
    /* split the report into its item sections — depth-counted, because each
       item nests pf-pat-hero <section>s (a lazy regex stops at the first
       nested close) */
    (function () {
      var starts = [], rs = /<section class="wr-item" id="([^"]+)">/g, sm;
      while ((sm = rs.exec(html))) starts.push({ id: sm[1], idx: sm.index });
      for (var s = 0; s < starts.length; s++) {
        var from = starts[s].idx;
        var end = (s + 1 < starts.length) ? starts[s + 1].idx : html.length;
        var depth = 0, close = -1, tagre = /<\/?section\b[^>]*>/g, tm;
        tagre.lastIndex = from;
        while ((tm = tagre.exec(html)) && tm.index < end) {
          if (tm[0].charAt(1) === '/') depth--; else depth++;
          if (depth === 0) { close = tm.index + tm[0].length; break; }
        }
        itemHtml.push({ id: starts[s].id, html: html.slice(from, close > 0 ? close : end) });
      }
    })();
    if (itemHtml.length === 4) ok('4 items rendered (3 sections + meme)');
    else bad('item count', 'expected 4, got ' + itemHtml.length);

    itemHtml.forEach(function (it, i) {
      var h = it.html;
      var tag = 'item[' + i + '](' + it.id + ')';
      /* P1: Briefing Hero with kicker + mission */
      if (h.indexOf('pf-pat-hero') > -1 && h.indexOf('pf-pat-hero-kicker') > -1 &&
          h.indexOf('pf-pat-hero-mission') > -1) ok(tag + ' has Briefing Hero (P1)');
      else bad(tag + ' Briefing Hero', 'missing pf-pat-hero/kicker/mission');
      /* hero mission <= 10 words */
      var mm = h.match(/pf-pat-hero-mission">([^<]*)</);
      if (mm) {
        var words = mm[1].trim().split(/\s+/).filter(Boolean).length;
        if (words <= 10 && words > 0) ok(tag + ' headline <=10 words (' + words + ')');
        else bad(tag + ' headline word count', words + ' words');
      } else bad(tag + ' headline', 'mission text not found');
      /* P2: intel cards with labeled micro-blocks (sections carry the
         Smart-Brevity skeleton; the meme item carries its THE MEME card) */
      var labels = ['1 BIG THING', 'WHY IT MATTERS', 'BY THE NUMBERS',
        "WHAT'S NEXT", 'GO DEEPER', 'THE MEME', 'PROPAGANDIST OF THE WEEK'];
      var hasLabel = labels.some(function (l) { return h.indexOf(l) > -1; });
      if (h.indexOf('pf-pat-intel') > -1 && hasLabel)
        ok(tag + ' has Intel Cards (P2) w/ labeled micro-blocks');
      else bad(tag + ' Intel Cards', 'missing pf-pat-intel / labeled micro-block');
      /* YOUR ORDERS kicker */
      if (h.indexOf('YOUR ORDERS') > -1 && h.indexOf('wr-orders-kicker') > -1)
        ok(tag + ' ends with YOUR ORDERS kicker');
      else bad(tag + ' YOUR ORDERS kicker', 'missing');
      /* exactly one red mission CTA per item (DEPLOY-family) */
      var reds = (h.match(/pf-pat-deploy-red/g) || []).length;
      if (reds === 1) ok(tag + ' has exactly one DEPLOY mission CTA');
      else bad(tag + ' mission CTA count', 'expected 1 pf-pat-deploy-red, got ' + reds);
      /* P6: Action Bar, fixed order */
      var ab = h.indexOf('pf-pat-actions');
      var i1 = h.indexOf('SHARE THIS INTEL'), i2 = h.indexOf('TAKE THIS TO YOUR CELL'), i3 = h.indexOf('REPORT BACK');
      if (ab > -1 && i1 > ab && i2 > i1 && i3 > i2) ok(tag + ' Action Bar (P6) in fixed order');
      else bad(tag + ' Action Bar', 'missing or out of order');
    });

    /* micro-block labels land on the right content */
    var nums = itemHtml[0].html;
    if (nums.indexOf('BY THE NUMBERS') > -1 && nums.indexOf('WHY IT MATTERS') > -1)
      ok('numbers item: BY THE NUMBERS + WHY IT MATTERS blocks');
    else bad('numbers item blocks', 'labels missing');
    var ord = itemHtml[2].html;
    if (ord.indexOf("WHAT'S NEXT") > -1 && ord.indexOf('GO DEEPER') > -1 &&
        ord.indexOf('href="https://example.com/war-report"') > -1)
      ok('orders item: WHAT\'S NEXT + GO DEEPER (doorway link)');
    else bad('orders item blocks', 'labels or doorway link missing');
    var meme = itemHtml[3].html;
    if (meme.indexOf('MEME OF THE WEEK') > -1 && meme.indexOf('pf-pat-proof') > -1 &&
        meme.indexOf('1,204') > -1)
      ok('meme item: hero + P8 proof with REAL count (1,204)');
    else bad('meme item', 'hero/proof/real count missing');
    /* XSS: hostile backend text is escaped in rendered items */
    var evil = T.item({ header: 'EVIL', lines: ['<script>alert(1)</script>'] }, 9);
    if (evil.indexOf('<script>') === -1 && evil.indexOf('&lt;script&gt;') > -1)
      ok('rendered items escape hostile backend text');
    else bad('XSS escaping', 'raw <script> in rendered item');
  } catch (e) { bad('functional render', e.message); }
}

/* fan-favorite render path (async; assert structurally on source) */
(function () {
  var m = inner.match(/function loadFanFav\(\)\{[\s\S]*?\n\}/);
  if (!m) { bad('loadFanFav', 'not found'); return; }
  var f = m[0];
  if (f.indexOf('wrHero(') > -1 && f.indexOf('wrOrdersHtml("wr-item-fanfav"') > -1 &&
      f.indexOf('PAT.proof(') > -1) ok('fan-fav path: hero + orders kicker + P8 proof');
  else bad('fan-fav path', 'missing hero/orders-kicker/proof wiring');
})();

/* ================= 3. YOUR ORDERS on every item ================= */
console.log('[3] YOUR ORDERS kicker on every item');
[['wrItemHtml', /function wrItemHtml\([\s\S]*?\n\}/],
 ['wrMemeItemHtml', /function wrMemeItemHtml\([\s\S]*?\n\}/]].forEach(function (pair) {
  var m = inner.match(pair[1]);
  if (m && m[0].indexOf('wrOrdersHtml(') > -1) ok(pair[0] + ' wires wrOrdersHtml');
  else bad(pair[0], 'does not call wrOrdersHtml');
});

/* ================= 4. mission CTA destinations ================= */
console.log('[4] mission CTA destinations are live');
var ALLOW = ['/#pf-orders', '/#pf-vote', '/events#pf-mastercal', '/create?tab=bounties', '/cells'];
/* Mission CTAs (the red DEPLOY buttons) must resolve to verified in-product
   destinations. GO DEEPER doorway links are backend editorial URLs — they
   must be well-formed absolute http(s) links (never javascript:/data:, never
   empty); News Desk owns their liveness. */
function checkHrefs(html, tag) {
  var seen = {}, badness = [];
  var reds = [];
  var rr = /<a class="pf-pat-deploy-red" href="([^"]*)"/g, rm;
  while ((rm = rr.exec(html))) reds.push(rm[1]);
  reds.forEach(function (h) {
    if (ALLOW.indexOf(h) === -1) badness.push('mission CTA ' + h + ' (not a verified destination)');
  });
  var re = /href="([^"]*)"/g, m;
  while ((m = re.exec(html))) {
    var h = m[1];
    if (seen[h]) continue; seen[h] = 1;
    if (/^(javascript|data|vbscript):/i.test(h)) { badness.push(h + ' (dangerous scheme)'); continue; }
    if (!h || h === '#') { badness.push('(empty/bare # href)'); continue; }
    if (ALLOW.indexOf(h) > -1) continue;
    if (/^#wr-item-[\w-]+$/.test(h)) {
      if (html.indexOf('id="' + h.slice(1) + '"') === -1) badness.push(h + ' (fragment target missing)');
      continue;
    }
    if (/^https?:\/\/[^\s<>"']+$/.test(h)) continue; /* well-formed editorial doorway */
    badness.push(h + ' (not in allowlist)');
  }
  if (!badness.length) ok(tag + ': all ' + Object.keys(seen).length + ' hrefs resolve');
  else bad(tag + ' dead/unknown hrefs', badness.join('; '));
}
if (T && itemHtml.length) {
  itemHtml.forEach(function (it, i) { checkHrefs(it.id + '::' + it.html, 'item[' + i + ']'); });
  checkHrefs(T.next(), 'Monday mission list');
  /* every wrMissionFor route lands in the allowlist */
  ['VOTE X', 'RALLY X', 'MEME X', 'ORDERS X', 'RANDOM X'].forEach(function (hd) {
    var mm = T.mission(hd);
    if (ALLOW.indexOf(mm.href) > -1) ok('wrMissionFor(' + hd.split(' ')[0] + ') -> ' + mm.href);
    else bad('wrMissionFor(' + hd + ')', 'unlisted href ' + mm.href);
  });
}

/* ================= 5. Action Bar ================= (covered in [2]; source belt-and-braces) */
console.log('[5] Action Bar wiring');
if (code.indexOf('PAT.actionBar(') > -1 || inner.indexOf('PAT.actionBar(') > -1)
  ok('actionBar composed via PF.patterns');
else bad('actionBar', 'no PAT.actionBar call found');

/* ================= 6. CTA-verb lint ================= */
console.log('[6] CTA-verb lint + red-button rule');
[['no "donate" in CTA copy', /donate/i],
 ['no "ENLIST ->" card CTA', /ENLIST\s*->/],
 ['no "CALL IT ->" card CTA', /CALL\s*IT\s*->/],
 ['no CONFIRM pill', /CONFIRM/]].forEach(function (pair) {
  if (pair[1].test(code)) bad(pair[0], 'rogue verb present');
  else ok(pair[0]);
});
if (/class="c-btn"(?! ghost)/.test(code)) bad('red-button rule', 'bare red .c-btn still present');
else ok('red-button rule: no bare red .c-btn (ghost or DEPLOY-family only)');
if (code.indexOf('pf-pat-join') > -1 || code.indexOf('PAT.join(') > -1)
  bad('JOIN THE FIGHT.', 'pf-pat-join used — enlistment-only, report is callsign-gated');
else ok('no pf-pat-join (enlistment CTA absent, as required)');
var joins = (code.match(/JOIN THE FIGHT\./g) || []).length;
var joinsFill = (code.match(/fillText\("JOIN THE FIGHT\."\W/g) || []).length;
if (joins === joinsFill && joins > 0) ok('JOIN THE FIGHT. appears only in share-poster canvas art');
else bad('JOIN THE FIGHT. placement', joins + ' occurrences, ' + joinsFill + ' in fillText');
var wrCardSrc = (inner.match(/function wrCard\([\s\S]*?\n\}/) || [''])[0];
if (wrCardSrc.indexOf('deployBtn') === -1 && wrCardSrc.indexOf('pf-pat-deploy-red') === -1)
  ok('card actions are text links (wrCard never emits a red button)');
else bad('wrCard', 'emits a red button — card actions must be text links');

/* ================= 7. kill switches ================= */
console.log('[7] kill switches');
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
  if (off.length === 0) ok('?pf_off=war-report stages nothing (fail-closed on kill)');
  else bad('kill switch', 'staged ' + off.length + ' templates while killed');
  if (on.length === 1 && on[0].indexOf('pf-ov-warreport') > -1) ok('enabled module stages pf-ov-warreport');
  else bad('staging', 'template not staged when enabled');
})();
if (code.indexOf('PF.skip("war-report")') > -1) ok('PF.skip("war-report") gate present');
else bad('kill gate', 'PF.skip("war-report") missing');

/* ================= 8. 5-minute contract ================= */
console.log('[8] header contract');
if (T) {
  var rh = T.report({ subject: 'WAR REPORT', week_start: '2026-10-05', created_at: '', body: 'SOLDIER x,\n\nCELL WAR:\n  Red Cell wins' });
  if (/5-MINUTE READ/i.test(rh)) ok('"5-minute read" contract at the top');
  else bad('5-minute contract', 'missing from rendered report');
}

/* ================= 9. P8 social proof honesty ================= */
console.log('[9] P8 social proof');
/* proof() suppresses without a real positive count — assert at the library level */
(function () {
  var sb = { window: { PF: { skip: function () { return false; } } } };
  vm.createContext(sb);
  vm.runInContext(read(PATTERNS), sb);
  var proof = vm.runInContext('window.PF.patterns.proof', sb);
  if (proof({ count: 1204, text: 'soldiers shared it this week' }).indexOf('1,204') > -1 &&
      proof({ count: 0, text: 'x' }) === '' && proof({ text: 'x' }) === '')
    ok('P8 proof(): real counts render, zero/missing counts suppressed');
  else bad('P8 proof()', 'honesty behavior broken');
})();

/* ================= 10. zero new XP / zero new writes ================= */
console.log('[10] zero new XP mechanics / zero new backend writes');
if (/xpGrant|mintXp|grantXp/i.test(code)) bad('XP mechanics', 'mint/grant call present');
else ok('zero new XP mechanics');
var actions = [];
var am = code.match(/wr_action["']?\s*:\s*"([^"]+)"/g) || [];
am.forEach(function (s) { var m = /"([^"]+)"$/.exec(s); if (m) actions.push(m[1]); });
if (actions.length && actions.every(function (a) { return a === 'warreport_email_capture'; }))
  ok('only backend write is the staged honest email capture');
else bad('backend writes', 'unexpected wr_action values: ' + JSON.stringify(actions));
var posts = (code.match(/wrPost\(/g) || []).length;
if (posts === 2) ok('wrPost: definition + 1 staged call site (no new writes)');
else bad('wrPost call sites', 'expected 2, got ' + posts);

/* ================= 11. bundle verification ================= */
console.log('[11] bundle verification');
if (!fs.existsSync(BUNDLE)) { bad('bundle-warreport.js', 'missing'); }
else {
  var b = read(BUNDLE);
  if (b.indexOf('!function') === 0) ok('bundle is minified');
  else bad('bundle minification', 'does not start with !function');
  /* markers are war-report.js SOURCE literals (terser preserves them; it may
     re-escape apostrophes, hence the regex). pf-pat-* class strings are
     runtime-generated by the patterns library, not source literals. */
  ['YOUR ORDERS', '5-MINUTE READ', 'MONDAY MISSION LIST',
   '1 BIG THING', 'wr-orders-kicker', 'WHY IT MATTERS', 'BY THE NUMBERS',
   'GO DEEPER', 'wr-item-', /WHAT\\?'S NEXT/].forEach(function (marker) {
    var found = (marker instanceof RegExp) ? marker.test(b) : b.indexOf(marker) > -1;
    var label = (marker instanceof RegExp) ? "WHAT'S NEXT" : marker;
    if (found) ok('bundle contains "' + label + '"');
    else bad('bundle marker', 'missing "' + label + '"');
  });
  var berr = nodeCheck(BUNDLE);
  if (berr) bad('node --check bundle-warreport.js', berr); else ok('node --check bundle-warreport.js');
}

/* ================= 12. inner-script gate ================= */
console.log('[12] inner-script gate');
var r12 = cp.spawnSync(process.execPath,
  [path.join(ROOT, 'scripts', 'check-inner-scripts.js'), WAR], { encoding: 'utf8' });
if (r12.status === 0) ok('check-inner-scripts.js passes');
else bad('check-inner-scripts.js', (r12.stderr || r12.stdout || 'failed').split('\n')[0]);

/* ================= 13. styles sync ================= */
console.log('[13] styles sync');
var r13 = cp.spawnSync(process.execPath,
  [path.join(ROOT, 'build', 'check-styles-sync.js')], { encoding: 'utf8', cwd: ROOT });
if (r13.status === 0) ok('check-styles-sync.js passes');
else bad('check-styles-sync.js', (r13.stderr || r13.stdout || 'failed').split('\n')[0]);

/* ================= summary ================= */
console.log('\nverify-teardown-warreport: ' + passes + ' passed, ' + failures.length + ' failed');
if (failures.length) { console.error('\nFAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
