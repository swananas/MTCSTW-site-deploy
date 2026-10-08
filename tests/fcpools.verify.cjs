#!/usr/bin/env node
/* tests/fcpools.verify.cjs — verification harness for the S-31 Forecast
 * Pools card in games/cell-hq.js.
 * Static checks:
 *   1. node --check passes (no syntax errors)
 *   2. fcpool_list + fcpool_leaderboard in READ; auth_secret auto-attach
 *      covers fcpool_list (cell-mine pattern)
 *   3. poolMut posts {type:'pool', pl_action} via PF.postAction('pool',...)
 *   4. kill switch PF.skip('fc_pools') wired (?pf_off=fc_pools)
 *   5. every new user string passes through esc() (count + spot checks)
 *   6. banned-term grep on the pool section (Psych Q6) — comments stripped
 *   7. invitation-only grep — no required/mandatory/cell duty/quota
 * Functional checks (pure helpers extracted brace-aware, executed in a
 * sandbox — no DOM needed):
 *   8. poolCountdown math (days/hours/minutes/locked)
 *   9. poolPct math
 *  10. poolOpenCard: pooled totals render; my pick shown; poster sees
 *      can't-pick note; no voter names leak; CALL IT buttons carry side
 *  11. poolResolvedCard: informational readout, no won/lost language
 *  12. poolVoidCard: approved void strings + oracle-discipline sentence
 *  13. poolBoardRow / poolMyStanding render
 * Run: node tests/fcpools.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'cell-hq.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- 1. syntax ---------- */
try {
  cp.execFileSync(process.execPath, ['--check', SRC], { stdio: 'pipe' });
  ok('node --check passes', true);
} catch (e) {
  ok('node --check passes', false, String((e && e.message) || e));
}

/* ---------- 2. READ registration ---------- */
ok('fcpool_list in READ', /var\s+READ\s*=\s*\{[^}]*fcpool_list\s*:\s*1/.test(src));
ok('fcpool_leaderboard in READ', /var\s+READ\s*=\s*\{[^}]*fcpool_leaderboard\s*:\s*1/.test(src));

/* ---------- 3. auth_secret auto-attach ---------- */
ok('auth_secret auto-attach covers fcpool_list',
  /action\s*===\s*"fcpool_list"/.test(src) &&
  /if\s*\(\s*action\s*===\s*"cell_mine"[^)]*action\s*===\s*"fcpool_list"[^)]*\)/.test(src));

/* ---------- 4. poolMut rail ---------- */
ok("poolMut posts type:'pool'/pl_action",
  /type\s*:\s*'pool'\s*,\s*pl_action\s*:\s*pAction/.test(src) ||
  /\{\s*type\s*:\s*'pool'\s*,\s*pl_action\s*:\s*pAction\s*\}/.test(src));
ok("PF.postAction('pool','pl_action',...) preferred",
  /PF\.postAction\(\s*'pool'\s*,\s*'pl_action'/.test(src));

/* ---------- 5. kill switch ---------- */
ok("PF.skip('fc_pools') kill switch wired", /PF\.skip\(\s*['"]fc_pools['"]\s*\)/.test(src));
ok('paintDetail gated on poolOff()', /if\s*\(\s*!poolOff\(\)/.test(src));

/* ---------- pool section slice (from the comment opening, so the doc
   lists of banned terms strip cleanly with the comments) ---------- */
var hbStart = src.lastIndexOf('/*', src.indexOf('FORECAST POOLS (helpers'));
var hbEnd = src.indexOf('/* ---------- TAB 5: TREASURY');
ok('pool helper section found', hbStart !== -1 && hbEnd > hbStart);
var block = src.slice(hbStart, hbEnd);

/* ---------- 6. esc() coverage ---------- */
/* Every dynamic interpolation in the new code should be esc()'d. Count
   esc( occurrences in the block and spot-check key interpolations. */
var escCount = (block.match(/esc\(/g) || []).length;
ok('esc() used in pool block (' + escCount + 'x)', escCount >= 25);
ok('question escaped', /esc\(p\.question/.test(block));
ok('void_note escaped', /esc\(p\.void_note/.test(block));
ok('cell names escaped on board', /esc\(r\.cell_name/.test(block));

/* ---------- 7. banned-term grep (Psych Q6), comments stripped ---------- */
var code = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
var bannedRe = /\bbet\b|\bodds\b|\bwager\b|\bwinnings\b|\bpayout\b|\bstake\b|\bpot\b|\bjackpot\b|\bbetting\b|\bbookmaker\b|\bmarket\b|\bwon\b|\blost\b/i;
var bannedHits = [];
code.split('\n').forEach(function (l, i) {
  if (bannedRe.test(l)) bannedHits.push((i + 1) + ': ' + l.trim().slice(0, 90));
});
ok('banned terms absent from pool code', bannedHits.length === 0,
  bannedHits.slice(0, 4).join(' | '));

/* ---------- 8. invitation-only grep (Psych Q3) ---------- */
var coercionRe = /\brequired\b|\bmandatory\b|cell duty|\bquota\b|back the cell/i;
var coercionHits = [];
code.split('\n').forEach(function (l, i) {
  if (coercionRe.test(l)) coercionHits.push((i + 1) + ': ' + l.trim().slice(0, 90));
});
ok('no coercion language in pool code', coercionHits.length === 0,
  coercionHits.slice(0, 4).join(' | '));
ok('no attendance naming ("X of Y picked")', !/of .* picked|picked.*of/i.test(code));
ok('invitation copy present', /always optional|invited to make a call/i.test(code));

/* ---------- functional: extract pure helpers ---------- */
function extractFn(source, name) {
  var start = source.indexOf('function ' + name + '(');
  if (start === -1) return null;
  var brace = source.indexOf('{', start);
  var depth = 0, i = brace;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) break; }
  }
  return source.slice(start, i + 1);
}
var helperNames = ['poolCountdown', 'poolPct', 'poolTotals', 'poolOpenCard',
  'poolResolvedCard', 'poolVoidCard', 'poolBoardRow', 'poolMyStanding'];
var helpersSrc = helperNames.map(function (n) { return extractFn(block, n); });
ok('all pure helpers extracted', helpersSrc.every(Boolean));

var sandbox = {
  esc: function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  console: console
};
vm.createContext(sandbox);
try {
  vm.runInContext(helpersSrc.join('\n'), sandbox);
  ok('helpers execute in sandbox', true);
} catch (e) {
  ok('helpers execute in sandbox', false, String((e && e.message) || e));
}
function run(name, args) {
  return vm.runInContext(name + '.apply(null, ' + JSON.stringify(args) + ')', sandbox);
}

/* ---------- 9. poolCountdown ---------- */
try {
  var now = Date.now();
  /* +60s margins: the helper's Date.now() runs after `now` is captured,
     so exact-boundary inputs would read one unit low. */
  ok('countdown days', run('poolCountdown', [now + 2 * 86400000 + 3600000 + 60000]) === '2d 1h left');
  ok('countdown hours', run('poolCountdown', [now + 5 * 3600000 + 60000]) === '5h left');
  ok('countdown minutes', run('poolCountdown', [now + 10 * 60000 + 30000]) === '10m left');
  ok('countdown locked', run('poolCountdown', [now - 1000]) === 'locked');
} catch (e) { ok('poolCountdown math', false, String((e && e.message) || e)); }

/* ---------- 10. poolPct ---------- */
try {
  ok('pct 1/4', run('poolPct', [1, 4]) === 25);
  ok('pct 0/0', run('poolPct', [0, 0]) === 0);
} catch (e) { ok('poolPct math', false, String((e && e.message) || e)); }

/* ---------- 11. poolOpenCard ---------- */
try {
  var openPool = {
    id: 'fc_1', question: 'The next Fed decision: will rates go up, hold steady, or come down?',
    sides: ['hike', 'hold', 'cut'],
    labels: { hike: 'Rates go up', hold: 'Rates hold steady', cut: 'Rates come down' },
    totals: { hike: 2, hold: 1, cut: 0 },
    my_pick: null, can_pick: true, created_by: 'founder1',
    locks_at: Date.now() + 86400000, oracle_link: 'https://fred.stlouisfed.org/series/FEDFUNDS'
  };
  var html = run('poolOpenCard', [openPool, 'm1', false, 'c1']);
  ok('question renders', html.indexOf('The next Fed decision') !== -1);
  ok('pooled totals render', html.indexOf('2 call') !== -1 && html.indexOf('(67%)') !== -1);
  ok('CALL IT buttons carry side', /data-side="hike"/.test(html) && /data-side="cut"/.test(html));
  ok('invitation copy, no pressure', /always optional, no pressure/.test(html));
  ok('no voter names', html.indexOf('founder1') !== -1 && !/m2|voter/.test(html.replace('founder1', '')));
  var mineHtml = run('poolOpenCard', [Object.assign({}, openPool, { my_pick: 'hold', can_pick: false }), 'm1', false, 'c1']);
  ok('my pick shown', /Your call:/.test(mineHtml) && mineHtml.indexOf('Rates hold steady') !== -1);
  ok('no CALL IT after picking', mineHtml.indexOf('data-hq="pool-pick"') === -1);
  var posterHtml = run('poolOpenCard', [Object.assign({}, openPool, { my_pick: null }), 'founder1', true, 'c1']);
  ok('poster cannot pick note', /posters don/.test(posterHtml));
  ok('poster sees no CALL IT', posterHtml.indexOf('data-hq="pool-pick"') === -1);
  ok('lead sees VOID POOL', posterHtml.indexOf('data-hq="pool-cancel"') !== -1);
  var xss = run('poolOpenCard', [Object.assign({}, openPool, { question: '<script>alert(1)</script>' }), 'm1', false, 'c1']);
  ok('question escaped', xss.indexOf('<script>') === -1 && xss.indexOf('&lt;script&gt;') !== -1);
} catch (e) { ok('poolOpenCard', false, String((e && e.message) || e)); }

/* ---------- 12. poolResolvedCard ---------- */
try {
  var resPool = {
    question: 'Will year-over-year inflation come in above 3%?',
    sides: ['above', 'at_or_below'],
    labels: { above: 'Above 3%', at_or_below: '3% or below' },
    totals: { above: 3, at_or_below: 1 },
    resolved_detail: 'CPI year-over-year: 3.1% (2026-10-01, CPIAUCNS via FRED). Threshold: 3%.'
  };
  var rhtml = run('poolResolvedCard', [resPool]);
  ok('informational readout', rhtml.indexOf('The print came in:') !== -1 && rhtml.indexOf('3.1%') !== -1);
  ok('consensus shown', rhtml.indexOf('Cell consensus:') !== -1);
  ok('no won/lost language', !/\bwon\b|\blost\b|\bwinner\b/i.test(rhtml));
} catch (e) { ok('poolResolvedCard', false, String((e && e.message) || e)); }

/* ---------- 13. poolVoidCard ---------- */
try {
  var voidHtml = run('poolVoidCard', [{
    question: 'Q?',
    void_note: "No outcome recorded: the official figure wasn't published.",
    oracle_note: 'We only resolve on official data — never on a guess.'
  }]);
  ok('approved void string', voidHtml.indexOf("No outcome recorded: the official figure wasn&#39;t published.") !== -1 ||
    voidHtml.indexOf("No outcome recorded: the official figure wasn't published.") !== -1);
  ok('oracle-discipline sentence', voidHtml.indexOf('We only resolve on official data') !== -1);
  ok('no lost/cancelled-your-pick language', !/\blost\b|cancelled your pick|no winner/i.test(voidHtml));
  var voidHtml2 = run('poolVoidCard', [{ question: 'Q?', void_note: 'Voided — no official figure available.', oracle_note: 'We only resolve on official data — never on a guess.' }]);
  ok('second approved void string', voidHtml2.indexOf('Voided — no official figure available.') !== -1);
} catch (e) { ok('poolVoidCard', false, String((e && e.message) || e)); }

/* ---------- 14. board rows + standing ---------- */
try {
  var brow = run('poolBoardRow', [{ rank: 1, cell_name: 'Alpha Cell', accuracy_pct: 75, scored: 4 }]);
  ok('board row renders', brow.indexOf('#1') !== -1 && brow.indexOf('Alpha Cell') !== -1 && brow.indexOf('75%') !== -1);
  var mine = run('poolMyStanding', [{ cell_id: 'c1', meets_minimum: true, rank: 12, accuracy_pct: 60, scored: 5 }]);
  ok('private standing renders', mine.indexOf('#12') !== -1 && mine.indexOf('60%') !== -1);
  var notyet = run('poolMyStanding', [{ cell_id: 'c1', meets_minimum: false, scored: 1 }]);
  ok('below-minimum honest note', /3 resolved pools/.test(notyet));
} catch (e) { ok('board rows', false, String((e && e.message) || e)); }

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
