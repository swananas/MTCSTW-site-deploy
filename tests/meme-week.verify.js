#!/usr/bin/env node
/* tests/meme-week.verify.js — verification harness for the MEME OF THE WEEK
 * card in games/war-report.js (frontend builder, 2026-10-05).
 * The card code lives inside the widget's staged <template> (template-literal
 * source: regex backslashes are doubled). The harness extracts the block
 * between MEME:BEGIN / MEME:END, unescapes it to executable JS, and runs
 * behavioral assertions (no quote-stripping — see AGENTS.md lesson on
 * regex-literal-blind static checks):
 *   1. full section (with Source) -> styled card in place, raw lines gone
 *   2. section without Source -> card renders, no Source row
 *   3. non-http(s) Source -> rendered as text, never a link
 *   4. section absent -> card "" and body untouched
 *   5. malformed section -> card "" and body untouched
 *   6. hostile headline/creator/fight label -> escaped, no raw markup
 *   7. dash variants (—, –, -) accepted
 *   8. kill switch: meme block sits inside the PF.skip("war-report") gate;
 *      no new kill switch introduced
 * Run: node tests/meme-week.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'war-report.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

var b0 = src.indexOf('/* MEME:BEGIN */');
var b1 = src.indexOf('/* MEME:END */');
ok('meme block present in source', b0 >= 0 && b1 > b0);
if (!(b0 >= 0 && b1 > b0)) { process.exit(1); }
var code = src.slice(b0, b1).replace(/\\\\/g, '\\');

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
var fns = null;
try {
  fns = new Function('esc', code + '\nreturn {wrExtractMeme: wrExtractMeme, wrMemeLink: wrMemeLink};')(esc);
} catch (e) { ok('meme block evaluates', false, String(e && e.message || e)); }
ok('meme block evaluates', !!fns);
if (!fns) { console.error(failures + ' failure(s)'); process.exit(1); }
var wrExtractMeme = fns.wrExtractMeme;

function fullBody(sourceLine) {
  return [
    'CIVIC FRONT:',
    '  go vote',
    '',
    'MEME OF THE WEEK:',
    '  "Billionaires Fear This One Simple Meme" \u2014 @slaythegop',
    '  1,234 soldiers shared it this week',
    '  The fight: Housing for all',
    sourceLine,
    '',
    'NEXT WEEK:',
    '  more'
  ].join('\n');
}

/* 1. full section with Source */
var r = wrExtractMeme(fullBody('  Source: https://example.com/meme.png'));
ok('full: card rendered', r.card.indexOf('wr-meme') >= 0);
ok('full: headline present', r.card.indexOf('Billionaires Fear This One Simple Meme') >= 0);
ok('full: creator present', r.card.indexOf('@slaythegop') >= 0);
ok('full: share count present', r.card.indexOf('1,234 soldiers shared it this week') >= 0);
ok('full: fight label present', r.card.indexOf('The fight: Housing for all') >= 0);
ok('full: source is a real link', r.card.indexOf('<a href="https://example.com/meme.png"') >= 0);
ok('full: raw section not in before', r.before.indexOf('MEME OF THE WEEK') < 0 && r.before.indexOf('soldiers shared') < 0);
ok('full: raw section not in after', r.after.indexOf('MEME OF THE WEEK') < 0 && r.after.indexOf('soldiers shared') < 0);
ok('full: CIVIC FRONT kept before card', r.before.indexOf('CIVIC FRONT') >= 0);
ok('full: NEXT WEEK kept after card', r.after.indexOf('NEXT WEEK') >= 0);

/* 2. section without Source */
var r2 = wrExtractMeme(fullBody('').replace(/\n\nNEXT/, '\nNEXT'));
ok('no-source: card rendered', r2.card.indexOf('wr-meme') >= 0);
ok('no-source: no Source row', r2.card.indexOf('wm-src') < 0);
ok('no-source: NEXT WEEK kept', r2.after.indexOf('NEXT WEEK') >= 0);

/* 3. hostile Source scheme */
var r3 = wrExtractMeme(fullBody('  Source: javascript:alert(1)'));
ok('bad-scheme: no link emitted', r3.card.indexOf('<a ') < 0);
ok('bad-scheme: source shown as plain text', r3.card.indexOf('Source: javascript:alert(1)') >= 0);

/* 4. section absent */
var plain = 'CIVIC FRONT:\n  go vote\n\nNEXT WEEK:\n  more';
var r4 = wrExtractMeme(plain);
ok('absent: no card', r4.card === '');
ok('absent: body untouched', r4.before === plain && r4.after === '');

/* 5. malformed sections */
var bad1 = 'MEME OF THE WEEK:\n  no quotes here\n  12 soldiers shared it this week\n';
var r5 = wrExtractMeme(bad1);
ok('malformed headline: no card', r5.card === '');
ok('malformed headline: body untouched', r5.before === bad1);
var bad2 = 'MEME OF THE WEEK:\n  "Headline" \u2014 @user\n  12 soldiers shared it this week\n\nNEXT WEEK:\n';
var r6 = wrExtractMeme(bad2);
ok('missing fight line: no card', r6.card === '');
ok('missing fight line: body untouched', r6.before === bad2);

/* 6. injection */
var x = 'MEME OF THE WEEK:\n'
  + '  "<script>alert(1)</script>" \u2014 @ev<img>il\n'
  + '  9 soldiers shared it this week\n'
  + '  The fight: <b>bold</b> & "quotes"\n'
  + '  Source: https://example.com/?a=1&b=2\n';
var r7 = wrExtractMeme(x);
ok('inject: card rendered', r7.card.indexOf('wr-meme') >= 0);
ok('inject: no raw <script>', r7.card.indexOf('<script>') < 0 && r7.card.indexOf('&lt;script&gt;') >= 0);
ok('inject: creator markup escaped', r7.card.indexOf('&lt;img') >= 0);
ok('inject: fight label escaped', r7.card.indexOf('<b>') < 0 && r7.card.indexOf('&lt;b&gt;') >= 0);
ok('inject: url attr escaped', r7.card.indexOf('&amp;b=2') >= 0);

/* 7. dash variants */
['\u2013', '-'].forEach(function (dash) {
  var rr = wrExtractMeme('MEME OF THE WEEK:\n  "Hi" ' + dash + ' @user\n  3 soldiers shared it this week\n  The fight: x\n');
  ok('dash variant accepted: ' + (dash === '-' ? 'hyphen' : 'en-dash'), rr.card.indexOf('wr-meme') >= 0);
});

/* 8. kill switch: block is inside the existing war-report gate */
var gate = src.indexOf('PF.skip("war-report")');
ok('kill gate exists', gate >= 0);
ok('meme block inside kill gate (hides with widget)', gate >= 0 && gate < b0);
ok('no new kill switch introduced', src.indexOf('pf_off=meme') < 0 && src.indexOf('pf_off=warreport-meme') < 0);
ok('paint wires the card', src.indexOf('wrExtractMeme(r.body') >= 0);

console.log(failures ? (failures + ' failure(s)') : 'all checks passed');
process.exit(failures ? 1 : 0);
