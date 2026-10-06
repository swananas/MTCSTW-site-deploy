/* War Report UX — section parser tests (2026-10-06).
   Extracts parseReport/secHtml from the built source and checks them
   against a realistic backend body. Run: node verify-warreport-ux.js */
var fs = require('fs');
var src = fs.readFileSync('v1.4.3/games/war-report.js', 'utf8');

function extract(name) {
  var re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n}');
  var m = src.match(re);
  if (!m) throw new Error('function not found: ' + name);
  return m[0];
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
eval(extract('wrIsHeader'));
eval(extract('parseReport'));
eval(extract('secHtml'));

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
  ''
].join('\n');

var p = parseReport(BODY);
ok('lede captured', p.lede.indexOf('SOLDIER testsoldier,') === 0);
ok('3 sections parsed', p.secs.length === 3);
ok('headers stripped of colon', p.secs[0].header === 'YOUR WEEK IN NUMBERS (week of 2026-10-05)');
ok('cell war header', p.secs[1].header === 'CELL WAR');
ok('orders header with em-dash', p.secs[2].header === 'NEXT WEEK — ORDERS');
ok('content lines kept', p.secs[0].lines.filter(function(l){return l.trim();}).length === 3);

var html = secHtml(p.secs[2]);
ok('bullets become wr-li', (html.match(/<div class="wr-li"/g) || []).length === 2);
ok('kicker present', html.indexOf('wr-kicker') > -1 && html.indexOf('NEXT WEEK — ORDERS') > -1);
ok('no raw colon in header', html.indexOf('ORDERS:') === -1);

var p2 = parseReport('');
ok('empty body -> no sections', p2.secs.length === 0 && p2.lede === '');

var p3 = parseReport('SOLDIER x,\n\nno headers here\njust text');
ok('no headers -> all lede', p3.secs.length === 0 && p3.lede.indexOf('just text') > -1);

var evil = parseReport('YOUR WEEK IN NUMBERS:\n  <script>alert(1)</script>');
var hevil = secHtml(evil.secs[0]);
ok('XSS escaped', hevil.indexOf('<script>') === -1 && hevil.indexOf('&lt;script&gt;') > -1);

console.log('warreport-ux-fe: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
