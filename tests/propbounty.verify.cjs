#!/usr/bin/env node
/* tests/propbounty.verify.cjs — verification harness for the Propaganda
 * Bounties card in games/cell-hq.js.
 * Static checks:
 *   1. node --check passes (no syntax errors)
 *   2. propbounty_list registered in READ; the five writes in WRITE
 *   3. auth_secret auto-attach covers propbounty_list (cell-mine pattern)
 *   4. kill switch PF.skip('propbounty') wired
 *   5. every new user string passes through esc() (count + spot checks)
 * Functional checks (pure helpers extracted brace-aware, executed in a
 * sandbox — no DOM needed):
 *   6. pbCountdown math (days/hours/minutes/expired/no-deadline)
 *   7. escaping: prompt/callsign/title with markup renders escaped
 *   8. entity chip exact rendering (BILL · H.R. 14)
 *   9. vote buttons disabled after voting / on own submission
 *  10. settled winner banner; cancelled muted styling
 *  11. pbThumb rejects non-http URLs
 * Run: node tests/propbounty.verify.cjs
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
  ok('node --check passes', false, String(e && e.message || e));
}

/* ---------- 2. READ/WRITE registration ---------- */
ok('propbounty_list in READ', /var\s+READ\s*=\s*\{[^}]*propbounty_list\s*:\s*1/.test(src));
['propbounty_post', 'propbounty_submit', 'propbounty_vote', 'propbounty_settle', 'propbounty_cancel']
  .forEach(function (a) {
    ok(a + ' in WRITE', new RegExp('var\\s+WRITE\\s*=\\s*\\{[^}]*' + a + '\\s*:\\s*1').test(src));
  });

/* ---------- 3. auth_secret auto-attach ---------- */
ok('auth_secret auto-attach covers propbounty_list',
  /if\s*\(\s*action\s*===\s*"cell_mine"\s*\|\|\s*action\s*===\s*"propbounty_list"\s*\)/.test(src));

/* ---------- 4. kill switch ---------- */
ok("PF.skip('propbounty') kill switch wired", /PF\.skip\(\s*['"]propbounty['"]\s*\)/.test(src));

/* ---------- 5. esc() coverage in new code ---------- */
/* Extract the propaganda-bounties block between the helper banner and
   renderTreasury so we count esc( only in the new code. */
var hbStart = src.indexOf('PROPAGANDA BOUNTIES (helpers');
var helpersEnd = src.indexOf('function renderTreasury(p){', hbStart);
var helperSrc = (hbStart > -1 && helpersEnd > hbStart) ? src.slice(hbStart, helpersEnd) : '';
var paintStart = src.indexOf('--- 3b. PROPAGANDA BOUNTIES');
var paintEnd = src.indexOf('/* --- 4. CELL LOANS', paintStart);
var paintSrc = (paintStart > -1 && paintEnd > paintStart) ? src.slice(paintStart, paintEnd) : '';
var newSrc = helperSrc + '\n' + paintSrc;
var escCount = (newSrc.match(/esc\(/g) || []).length;
ok('new code uses esc() (' + escCount + ' calls)', escCount >= 15);
/* Every literal user field touched in the new section goes through esc():
   prompt, callsign, title, winner, created_by, entity_ref. */
['esc(b.prompt', 'esc(s.callsign', 'esc(s.title', 'esc(b.winner', 'esc(b.created_by', 'esc(ref)']
  .forEach(function (pat) {
    ok('esc() on ' + pat, newSrc.indexOf(pat) !== -1);
  });

/* ---------- extract pure helpers (brace-aware tokenizer) ---------- */
function extractFn(name) {
  var re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  var m = re.exec(src);
  if (!m) return null;
  var i = m.index + m[0].length, depth = 1, n = src.length;
  var mode = null; /* ', ", `, line, block */
  while (i < n && depth > 0) {
    var c = src[i], d = src[i + 1];
    if (mode === "'") { if (c === '\\') i += 2; else { if (c === "'") mode = null; i++; } continue; }
    if (mode === '"') { if (c === '\\') i += 2; else { if (c === '"') mode = null; i++; } continue; }
    if (mode === '`') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { mode = null; i++; continue; }
      i++; continue;
    }
    if (mode === 'line') { if (c === '\n') mode = null; i++; continue; }
    if (mode === 'block') { if (c === '*' && d === '/') { mode = null; i += 2; } else i++; continue; }
    if (c === '/' && d === '/') { mode = 'line'; i += 2; continue; }
    if (c === '/' && d === '*') { mode = 'block'; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') { mode = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return depth === 0 ? src.slice(m.index, i) : null;
}

var fnNames = ['pbCountdown', 'pbEntityChip', 'pbThumb', 'pbSubRow', 'pbBountyCard'];
var fns = {};
fnNames.forEach(function (nm) {
  fns[nm] = extractFn(nm);
  ok('extractable pure helper: ' + nm, !!fns[nm]);
});

var sandbox = {
  Date: Date, Math: Math, Number: Number, String: String,
  console: console
};
/* Same esc() implementation as cell-hq.js so escaping assertions are real. */
var escSrc = "function esc(s){ return String(s==null?\"\":s).replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\").replace(/>/g,\"&gt;\").replace(/\"/g,\"&quot;\"); }";
var bundle = escSrc + '\n' + fnNames.map(function (nm) { return fns[nm]; }).join('\n') +
  '\n;module.exports = {pbCountdown:pbCountdown,pbEntityChip:pbEntityChip,pbThumb:pbThumb,pbSubRow:pbSubRow,pbBountyCard:pbBountyCard};';
var H;
try {
  var mod = { exports: {} };
  vm.runInNewContext(bundle, Object.assign({}, sandbox, { module: mod }), { filename: 'pb-helpers' });
  H = mod.exports;
  ok('helpers execute in sandbox', true);
} catch (e) {
  ok('helpers execute in sandbox', false, String(e && e.stack || e));
}

if (H) {
  var now = Date.now();
  /* ---------- 6. countdown math ---------- */
  /* floor-boundary tests get a small buffer so elapsed test ms can't dip
     them into the previous unit */
  ok('countdown 25h -> "1d 1h left"', H.pbCountdown(now + 25 * 3600000 + 5000) === '1d 1h left');
  ok('countdown 3h -> "3h left"', H.pbCountdown(now + 3 * 3600000 + 5000) === '3h left');
  ok('countdown 5m -> "5m left"', H.pbCountdown(now + 5 * 60000 + 5000) === '5m left');
  ok('countdown past -> "expired"', H.pbCountdown(now - 1000) === 'expired');
  ok('countdown null -> "no deadline"', H.pbCountdown(null) === 'no deadline');

  /* ---------- 7. escaping ---------- */
  var evil = {
    id: 'b1', prompt: 'Best poster <script>alert("x")</script> wins',
    entity_type: 'bill', entity_ref: 'H.R. 14', prize_xp: 50,
    created_by: 'evil<>&"boss', deadline: now + 3600000, status: 'open',
    submissions: [
      { id: 's1', callsign: 'agitator', title: 'Take <b>the</b> fight', asset_url: 'https://x.example/p.png', votes: 3 }
    ]
  };
  var card = H.pbBountyCard(evil, 'me', true);
  ok('prompt markup escaped', card.indexOf('<script>') === -1 && card.indexOf('&lt;script&gt;') !== -1);
  ok('quote escaped in prompt', card.indexOf('&quot;') !== -1);
  ok('created_by escaped', card.indexOf('evil&lt;&gt;&amp;&quot;boss') !== -1, card.slice(0, 200));
  ok('submission title escaped', card.indexOf('&lt;b&gt;the&lt;/b&gt;') !== -1);

  /* ---------- 8. entity chip ---------- */
  ok('chip renders "BILL · H.R. 14"', H.pbEntityChip('bill', 'H.R. 14') === '<span class="hq-stat"><b>BILL &middot; H.R. 14</b></span>', H.pbEntityChip('bill', 'H.R. 14'));
  ok('chip empty for type none', H.pbEntityChip('none', '') === '');
  ok('chip renders what backend returns (no invention)', card.indexOf('BILL &middot; H.R. 14') !== -1);

  /* ---------- 9. vote states ---------- */
  var open = H.pbBountyCard({
    id: 'b2', prompt: 'p', prize_xp: 25, created_by: 'f', deadline: now + 3600000,
    status: 'open', my_vote: 's1',
    submissions: [
      { id: 's1', callsign: 'a', title: 'One', asset_url: 'https://x.example/1.png', votes: 2 },
      { id: 's2', callsign: 'b', title: 'Two', asset_url: 'https://x.example/2.png', votes: 5 }
    ]
  }, 'me', false);
  ok('voted submission shows VOTED + disabled', open.indexOf('disabled>VOTED<') !== -1);
  ok('other submissions disabled after voting', (open.match(/disabled>VOTE</g) || []).length === 1);
  var ownSub = H.pbBountyCard({
    id: 'b3', prompt: 'p', prize_xp: 25, created_by: 'f', deadline: now + 3600000,
    status: 'open', my_vote: null, my_submission: { title: 'Mine' },
    submissions: [{ id: 's9', callsign: 'me', title: 'Mine', asset_url: 'https://x.example/m.png', votes: 0 }]
  }, 'me', false);
  ok('own submission vote disabled + marked (you)', ownSub.indexOf('(you)') !== -1 && ownSub.indexOf('disabled>VOTE<') !== -1);
  ok('submit form hidden after submitting', ownSub.indexOf('hqPbUrl_') === -1 && ownSub.indexOf('one submission per member') !== -1);
  ok('PROPAGANDA badge on every row', (card.match(/class="pb-badge"/g) || []).length >= 1);

  /* ---------- 10. settled / cancelled ---------- */
  var settled = H.pbBountyCard({
    id: 'b4', prompt: 'p', prize_xp: 50, created_by: 'f', deadline: now - 1000,
    status: 'settled', winner: 'champ<script>', my_vote: 's1',
    submissions: [{ id: 's1', callsign: 'champ<script>', title: 'Won', asset_url: 'https://x.example/w.png', votes: 7 }]
  }, 'me', false);
  ok('winner banner "takes 50 XP"', settled.indexOf('takes 50 XP') !== -1);
  ok('winner callsign escaped', settled.indexOf('champ&lt;script&gt;') !== -1 && settled.indexOf('champ<script>') === -1);
  ok('vote counts shown on settled', settled.indexOf('7 votes') !== -1);
  var cancelled = H.pbBountyCard({
    id: 'b5', prompt: 'p', prize_xp: 25, created_by: 'f', deadline: now + 3600000,
    status: 'cancelled', submissions: []
  }, 'me', true);
  ok('cancelled muted (opacity)', cancelled.indexOf('opacity:.45') !== -1);
  ok('no vote/submit controls when cancelled', cancelled.indexOf('data-hq="pb-vote"') === -1 && cancelled.indexOf('hqPbUrl_') === -1);

  /* ---------- 11. thumbnail safety ---------- */
  ok('pbThumb rejects javascript: URL', H.pbThumb('javascript:alert(1)') === '');
  ok('pbThumb renders image thumb for .png', H.pbThumb('https://x.example/p.png').indexOf('<img') !== -1);
  ok('pbThumb renders plain VIEW link for non-image', H.pbThumb('https://x.example/page').indexOf('<img') === -1 && H.pbThumb('https://x.example/page').indexOf('target="_blank"') !== -1);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed.');
process.exit(failures ? 1 : 0);
