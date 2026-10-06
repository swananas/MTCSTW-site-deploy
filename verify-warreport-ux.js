/* War Report UX — section parser + micro-block tests (2026-10-06, WS-7 teardown).
   Extracts parseReport/wrBlocks/wrHeadline/wrMissionFor/wrLinkify from the
   built source and checks them against a realistic backend body.
   Run: node verify-warreport-ux.js */
var fs = require('fs');
var src = fs.readFileSync('v1.4.3/games/war-report.js', 'utf8');

/* Extract from the BROWSER's view of the inner script: the source stages the
   widget inside an outer template literal, so regex escapes are doubled in
   the file (\\s) and collapse to single (\s) after template evaluation.
   Evaluating the literal first tests true runtime behavior. */
var tm = src.match(/insertAdjacentHTML\('beforeend', `([\s\S]*?)`\);/);
if (!tm) throw new Error('template literal not found');
var inner = eval('`' + tm[1] + '`');
function extract(name) {
  var re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n}');
  var m = inner.match(re);
  if (!m) throw new Error('function not found: ' + name);
  return m[0];
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
eval(extract('wrTrim'));
eval(extract('wrIsHeader'));
eval(extract('parseReport'));
eval(extract('wrHeadline'));
eval(extract('wrBlocks'));
eval(extract('wrMissionFor'));
eval(extract('wrLinkify'));

var passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.log('FAIL: ' + name); }
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
  '  CHAMPIONS! Your cell took the crown — +10% XP all week.',
  '',
  'NEXT WEEK — ORDERS:',
  '  - You were active 5/7 days. A perfect week protects your streak.',
  '  - Join a cell. Solo soldiers leave bonus XP on the table.',
  '  Read the full dispatch: https://example.com/war-report',
  ''
].join('\n');

var p = parseReport(BODY);
ok('lede captured', p.lede.indexOf('SOLDIER testsoldier,') === 0);
ok('3 sections parsed', p.secs.length === 3);
ok('headers stripped of colon', p.secs[0].header === 'YOUR WEEK IN NUMBERS (week of 2026-10-05)');
ok('cell war header', p.secs[1].header === 'CELL WAR');
ok('orders header with em-dash', p.secs[2].header === 'NEXT WEEK — ORDERS');
ok('content lines kept', p.secs[0].lines.filter(function(l){return l.trim();}).length === 3);

var p2 = parseReport('');
ok('empty body -> no sections', p2.secs.length === 0 && p2.lede === '');

var p3 = parseReport('SOLDIER x,\n\nno headers here\njust text');
ok('no headers -> all lede', p3.secs.length === 0 && p3.lede.indexOf('just text') > -1);

/* XSS: first line always becomes the "1 big thing" (escaped at render);
   the teardown verify script asserts the rendered HTML escapes it. */
var evil = parseReport('YOUR WEEK IN NUMBERS:\n  <script>alert(1)</script>');
ok('evil line captured as big thing', wrBlocks(evil.secs[0]).big === '<script>alert(1)</script>');

/* WS-7 micro-block classifier (documented mapping: line 1 -> big; bullets ->
   next; URLs -> deeper; digit lines -> nums; remaining prose -> why) */
var b0 = wrBlocks(p.secs[0]);
ok('big thing = first line', b0.big === '120 XP earned across 5/7 active days');
ok('digit line -> by the numbers', b0.nums.length === 1 && b0.nums[0].indexOf('Streak') === 0);
ok('digit-free prose -> why it matters', b0.why.length === 1);
ok('no bullets -> no whats-next', b0.next.length === 0);

var b2 = wrBlocks(p.secs[2]);
ok('bullets -> whats next', b2.next.length === 1 && b2.next[0].indexOf('Join a cell') === 0);
ok('url line -> go deeper', b2.deeper.length === 1 && b2.deeper[0].indexOf('https://example.com') > -1);
ok('big thing strips bullet marker', b2.big.indexOf('-') !== 0 && b2.big.indexOf('You were active') === 0);

var b1 = wrBlocks(p.secs[1]);
ok('digit line -> by the numbers', b1.nums.length === 1 && b1.nums[0].indexOf('CHAMPIONS') === 0);
ok('nothing left for why', b1.why.length === 0);

/* headline: under 10 words */
var long = 'This is a very long payoff sentence that runs well past ten words total';
ok('headline capped at 10 words', wrHeadline(long).split(' ').length === 10);
ok('short headline untouched', wrHeadline('Red Cell takes the crown') === 'Red Cell takes the crown');

/* mission CTA routing — every route resolves to a real destination */
ok('vote header -> /#pf-vote', wrMissionFor('FAN FAVORITE VOTE').href === '/#pf-vote');
ok('event header -> war calendar', wrMissionFor('RALLY THIS SATURDAY').href === '/events#pf-mastercal');
ok('bounty header -> bounties', wrMissionFor('MEME OF THE WEEK SHARE').href === '/create?tab=bounties');
ok('orders header -> daily orders', wrMissionFor('NEXT WEEK — ORDERS').href === '/#pf-orders');
ok('unknown header -> daily orders default', wrMissionFor('RANDOM INTEL').href === '/#pf-orders');
ok('mission labels carry no rogue verbs',
  ['VOTE','EVENT','BOUNTY','RANDOM'].every(function(k){
    var l = wrMissionFor(k + ' X').label;
    return !/donate/i.test(l) && !/enlist/i.test(l) && !/confirm/i.test(l);
  }));

/* linkify: XSS-safe doorway links */
var evil2 = wrLinkify('see https://example.com/?a=1&b=2 <script>alert(1)</script>');
ok('linkify escapes HTML', evil2.indexOf('<script>') === -1 && evil2.indexOf('&lt;script&gt;') > -1);
ok('linkify links the URL', evil2.indexOf('<a href="https://example.com/?a=1&amp;b=2"') > -1);

console.log('warreport-ux-fe: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
