#!/usr/bin/env node
/* scripts/verify-inflation-fe.js — The People's CPI frontend verification
   harness (fe/inflation-tracker, 2026-10-05). Run from the worktree root:
     node scripts/verify-inflation-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, build/bundle.js, and this harness.
   2. Widget surfaces: the three mount divs, the 12-item basket with units,
      the price input, and the coarse-area placeholder copy.
   3. Area validation: ZIP5 regex ^\d{5}$ and City, ST pattern; the
      placeholder says "ZIP or city — never your address".
   4. Fail-soft: endpoint missing/down -> honest unavailable copy, never a
      broken form (check-in + board + trends paths).
   5. Board n<5 suppression: the not-enough branch shows copy and NEVER
      calls money() — no number can leak.
   6. Trends null buckets: gaps render as empty slots, never interpolated;
      "we don't guess" copy present.
   7. Official-null honesty: "official baseline pending" path; bls.gov source
      link when official exists; community never labeled official.
   8. Kill switches: master + three per-widget via PF.skip, documented.
   9. No XP: zero XP tokens anywhere except the explicit ZERO ECONOMY doc
      line; no xpGrant, no XP toasts, no XP copy.
   10. Bundle registration: inflation-tracker.js listed exactly once in
       build/bundle.js and present in the rebuilt bundle-economy.js.
   11. Contract surface (REAL backend contract, QC-verified 2026-10-05):
       report_price / price_board / price_trends actions,
       price_cents / area_key / item_id fields, POST body canonical
       {type:'price', pr_action:'report_price'} (dispatch is body-only —
       the old "action rides in the query string AND the body" contract was
       false and the POST fell through to "unknown action"), response reader
       checks j.duplicate FIRST and reads status off j.report (never top-level
       j.status — the old read made every success render "unavailable"),
       the three report statuses handled with friendly copy, trends reads
       j.buckets as the series array (j.weeks is a NUMBER, never the array).
   12. Honesty labeling: "community-reported" on every card + series, the
       methodology footnote, "not official data" on the share poster.
   13. Privacy: no geolocation, no lat/lon, no street address collection;
       coarse-area-only copy present.
   14. Loop law: check-in -> board ("SEE YOUR AREA'S BOARD"), board tabs
       YOUR AREA / NATIONAL / COMPARE, SHARE THIS BOARD via PFShare.
   15. Silent no-op: each widget returns when its mount div is absent.
   16. Motivation design (Psych) + red-line scan: cause-framing headline,
       "Join the count." subline, "I fight with receipts." identity anchor,
       per-item "actually" prompt, honest norm line, authorship framing,
       red-line-#6 consent line + "how we use this" methodology anchor,
       week_count receipt payoff with fallback, "not sure" approximate
       toggle wiring (is_approximate), area pre-fill via pf_inflation_area,
       display-only last-reported reference (price input never pre-filled),
       and a scan of user-facing copy for banned tokens: streaks,
       leaderboards, loss-framed and guilt copy. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var MOD = path.join(G, 'inflation-tracker.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function count(src, s) { return src.split(s).length - 1; }

console.log('== 1. node --check ==');
[['v1.4.3/games/inflation-tracker.js', MOD],
 ['build/bundle.js', path.join(ROOT, 'build', 'bundle.js')],
 ['scripts/verify-inflation-fe.js', path.join(ROOT, 'scripts', 'verify-inflation-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

var src = read(MOD);

console.log('== 2. widget surfaces ==');
[['pf-inflation-checkin', 'check-in mount'], ['pf-inflation-board', 'board mount'],
 ['pf-inflation-trends', 'trends mount']].forEach(function (pair) {
  if (has(src, "getElementById('" + pair[0] + "')")) ok('mount: #' + pair[0]);
  else no('mount', '#' + pair[0] + ' not mounted');
});
/* The 12 basket items with units, matching the backend seeds. */
var ITEMS = [
  ['milk', 'gallon'], ['eggs', 'dozen'], ['bread', 'loaf'],
  ['ground_beef', 'lb'], ['chicken_breast', 'lb'], ['white_rice', 'lb'],
  ['bananas', 'lb'], ['butter', 'lb'], ['coffee_12oz', '12oz bag'],
  ['gasoline_regular', 'gallon'], ['electricity', 'kWh'], ['rent_1br', 'month']
];
var itemFails = ITEMS.filter(function (it) {
  return !has(src, "id: '" + it[0] + "'") || !has(src, "unit: '" + it[1] + "'");
});
if (!itemFails.length) ok('basket: 12 items with units match backend seeds');
else no('basket', 'missing/mismatched: ' + itemFails.map(function (i) { return i[0]; }).join(','));
if (has(src, 'ZIP or city — never your address')) ok('area input: coarse-only placeholder copy');
else no('area input', 'placeholder "ZIP or city — never your address" missing');
if (has(src, 'inputmode="decimal"') && has(src, 'pf-inf-ci-price')) ok('check-in: price input present');
else no('check-in', 'price input missing');

console.log('== 3. area validation ==');
if (has(src, '/^\\d{5}$/')) ok('validation: ZIP5 regex ^\\d{5}$');
else no('validation', 'ZIP5 regex missing');
if (has(src, "CITY_RE") && has(src, ",\\s*[A-Za-z]{2}$")) ok('validation: City, ST pattern');
else no('validation', 'City, ST pattern missing');
if (has(src, 'validArea(')) ok('validation: validArea() gate on submit');
else no('validation', 'validArea() not wired');

console.log('== 4. fail-soft ==');
if (has(src, 'Price check-in unavailable right now')) ok('fail-soft: check-in unavailable copy');
else no('fail-soft', 'check-in unavailable copy missing');
if (has(src, 'The price board is unavailable right now')) ok('fail-soft: board unavailable copy');
else no('fail-soft', 'board unavailable copy missing');
if (has(src, 'Trends unavailable right now')) ok('fail-soft: trends unavailable copy');
else no('fail-soft', 'trends unavailable copy missing');
/* getJSON/postReport null the callback on network failure or missing backend. */
if (/if\s*\(!BACKEND\)\s*\{\s*done\(null\)/.test(src)) ok('fail-soft: null callback when backend unset');
else no('fail-soft', 'missing-backend null path not found');
if (has(src, 'never a broken form') || has(src, 'Fail-soft: the endpoint may not exist yet'))
  ok('fail-soft: endpoint-missing comment documents the contract risk');
else no('fail-soft', 'endpoint-missing documentation missing');

console.log('== 5. board n<5 suppression ==');
if (has(src, 'Not enough reports yet')) ok('suppression: "Not enough reports yet" copy');
else no('suppression', '"Not enough reports yet" copy missing');
/* The not-enough branch must never render a number: isolate the branch body
   by brace-counting from its opening brace and assert no money() inside. */
var brIdx = src.indexOf('if (!r.enough_data || r.median_cents == null)');
if (brIdx === -1) { no('suppression', 'enough_data branch not found'); }
else {
  var open = src.indexOf('{', brIdx), depth = 0, close = -1;
  for (var bi = open; bi < src.length && bi < open + 2000; bi++) {
    if (src[bi] === '{') depth++;
    else if (src[bi] === '}') { depth--; if (!depth) { close = bi; break; } }
  }
  var brBody = close === -1 ? '' : src.slice(open, close);
  if (brBody && brBody.indexOf('money(') === -1)
    ok('suppression: not-enough branch renders no number (no money() call)');
  else no('suppression', 'not-enough branch leaks a numeric render');
}
if (has(src, 'We need at least 5 reports before we show a number'))
  ok('suppression: 5-report threshold stated honestly');
else no('suppression', '5-report threshold copy missing');

console.log('== 6. trends null buckets ==');
if (has(src, 'No reports that week')) ok('trends: null bucket renders a labeled gap');
else no('trends', 'null-bucket gap copy missing');
if (/never interpolate/i.test(src) || has(src, 'we don')) ok('trends: never-interpolate rule in code/copy');
else no('trends', 'never-interpolate rule missing');

console.log('== 7. official-null honesty ==');
if (has(src, 'Official baseline pending — check back')) ok('honesty: official-null pending copy');
else no('honesty', 'official-null pending copy missing');
if (has(src, 'bls.gov/cpi')) ok('honesty: bls.gov source link when official exists');
else no('honesty', 'bls.gov source link missing');
if (has(src, 'safeUrl(off.source_url)')) ok('honesty: official source_url scheme-gated');
else no('honesty', 'official.source_url not passed through safeUrl');
if (has(src, 'Community numbers are never presented as official'))
  ok('honesty: never-present-as-official footnote');
else no('honesty', 'never-present-as-official footnote missing');
/* The official block must only render when off.value != null. */
if (/if\s*\(off && off\.value != null\)/.test(src)) ok('honesty: official renders only when value exists');
else no('honesty', 'official render not gated on value presence');

console.log('== 8. kill switches ==');
[['inflation', 'master'], ['inflation-checkin', 'check-in'], ['inflation-board', 'board'],
  ['inflation-trends', 'trends']].forEach(function (pair) {
  if (has(src, "PF.skip('" + pair[0] + "')")) ok('kill: PF.skip(\'' + pair[0] + '\')');
  else no('kill switch', "PF.skip('" + pair[0] + "') missing");
});
if (has(src, '?pf_off=inflation') && has(src, '?pf_off=inflation-checkin') &&
    has(src, '?pf_off=inflation-board') && has(src, '?pf_off=inflation-trends'))
  ok('kill: all four ?pf_off= switches documented in header');
else no('kill switch', 'header docs missing a ?pf_off= switch');

console.log('== 9. no XP ==');
/* The explicit ZERO ECONOMY doc line is allowed; everything else with an
   xp token is a violation. */
var scrubbed = src.split('\n').filter(function (l) { return l.indexOf('ZERO ECONOMY') === -1; }).join('\n');
var xpHits = [];
scrubbed.split('\n').forEach(function (l, i) {
  if (/xp/i.test(l)) xpHits.push((i + 1) + ':' + l.trim().slice(0, 80));
});
if (!xpHits.length) ok('no-XP: zero XP tokens outside the ZERO ECONOMY doc line');
else no('no-XP', 'XP tokens found: ' + xpHits.join(' | '));
if (!/xpGrant/i.test(scrubbed)) ok('no-XP: no xpGrant call');
else no('no-XP', 'xpGrant present');
if (!/\+\s*XP/i.test(scrubbed)) ok('no-XP: no "+ XP" grant copy');
else no('no-XP', '"+ XP" copy present');

console.log('== 10. bundle registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
var listHits = (bsrc.match(/'inflation-tracker\.js'/g) || []).length;
if (listHits === 1) ok('bundle: inflation-tracker.js listed exactly once in build/bundle.js');
else no('bundle', "'inflation-tracker.js' listed " + listHits + ' times in build/bundle.js');
var bundlePath = path.join(G, 'bundle-economy.js');
if (fs.existsSync(bundlePath) && has(read(bundlePath), 'inflation-tracker'))
  ok('bundle: inflation-tracker present in rebuilt bundle-economy.js');
else no('bundle', 'bundle-economy.js not rebuilt or missing inflation-tracker');

console.log('== 11. contract surface (real backend contract) ==');
/* Action names + fields still present. */
[['report_price', 'action name report_price'], ['price_board', 'GET price_board'],
 ['price_trends', 'GET price_trends'], ['price_cents', 'price_cents field'],
 ['area_key', 'area_key field'], ['item_id', 'item_id field']
].forEach(function (pair) {
  if (has(src, pair[0])) ok('contract: ' + pair[1]);
  else no('contract', pair[1] + ' missing');
});
/* The canonical POST-body contract: type:'price' + pr_action:'report_price'
   (src/auth.js TYPE_KEY + src/index.js dispatch are body-only). */
if (has(src, "type: 'price'") && has(src, "pr_action: 'report_price'"))
  ok('contract: POST body carries canonical {type:\'price\', pr_action:\'report_price\'}');
else no('contract', 'POST body missing type:\'price\'/pr_action:\'report_price\' (bare-body POST = "unknown action")');
/* The reader must check j.duplicate FIRST, then read status off j.report —
   and must never read top-level j.status (the old break). Friendly copy
   for the re-report and flagged paths must stay. */
if (has(src, 'j.duplicate') && has(src, 'rep.status'))
  ok('contract: reader checks j.duplicate, reads status off j.report');
else no('contract', 'response reader missing j.duplicate / j.report unwrap');
if (!has(src, 'You already reported') || !has(src, 'flagged for review'))
  no('contract', 'friendly copy for re-report / flagged paths missing');
else ok('contract: friendly copy for re-report + flagged paths');
if (/\bj\.status\b/.test(src))
  no('contract', 'top-level j.status still read — every success would render "unavailable"');
else ok('contract: no top-level j.status read (old false contract gone)');
/* Trends: the series array rides on j.buckets; j.weeks is a number. */
if (has(src, 'j.buckets') && !/Array\.isArray\(j\.weeks\)/.test(src))
  ok('contract: trends reads j.buckets (j.weeks is a number, never the series)');
else no('contract', 'trends does not read j.buckets / still reads j.weeks as the array');

console.log('== 12. honesty labeling ==');
if (count(src, 'community-reported') >= 5) ok('honesty: "community-reported" labels throughout (' + count(src, 'community-reported') + ')');
else no('honesty', '"community-reported" appears only ' + count(src, 'community-reported') + ' times');
if (has(src, 'not official data')) ok('honesty: share poster disclaims official data');
else no('honesty', 'share poster official-data disclaimer missing');
if (has(src, 'JOIN THE FIGHT.') && has(src, 'MTCSTW.COM')) ok('share: JOIN THE FIGHT. + MTCSTW.COM CTA standard');
else no('share', 'share CTA standard missing');

console.log('== 13. privacy ==');
if (!/geolocation/i.test(src)) ok('privacy: no geolocation API');
else no('privacy', 'geolocation API referenced');
if (!/latitude|longitude/i.test(src)) ok('privacy: no lat/lon');
else no('privacy', 'lat/lon referenced');
if (has(src, 'Never your street, never your name')) ok('privacy: coarse-only guidance copy');
else no('privacy', 'coarse-only guidance copy missing');

console.log('== 14. loop law ==');
if (has(src, 'pf-inf-ci-seeboard') && /SEE YOUR AREA/.test(src)) ok('loop: check-in -> "see your area\'s board"');
else no('loop law', 'check-in -> board handoff missing');
if (has(src, "'YOUR AREA'") && has(src, "'NATIONAL'") && has(src, "'COMPARE'"))
  ok('loop: board tabs YOUR AREA / NATIONAL / COMPARE');
else no('loop law', 'board compare tabs missing');
if (has(src, 'SHARE THIS BOARD')) ok('loop: SHARE THIS BOARD button');
else no('loop law', 'share button missing');
if (has(src, 'PFShare.shareImage')) ok('loop: share via existing PFShare pipeline');
else no('loop law', 'PFShare.shareImage not used');
if (has(src, 'PRICES IN ')) ok('loop: "PRICES IN <AREA>" share card');
else no('loop law', '"PRICES IN" share card missing');

console.log('== 15. silent no-op ==');
var noopFails = ['pf-inflation-checkin', 'pf-inflation-board', 'pf-inflation-trends'].filter(function (id) {
  /* Any occurrence of the mount lookup may be a reference (e.g. the
     check-in scrolls to the board div) — pass when at least one is the
     guarded mount idiom. */
  var needle = "getElementById('" + id + "');", i = -1, guarded = false;
  while ((i = src.indexOf(needle, i + 1)) !== -1) {
    if (src.slice(i, i + 120).indexOf('if (!mount) return;') !== -1) { guarded = true; break; }
  }
  return !guarded;
});
if (!noopFails.length) ok('mount: silent no-op when each mount div is absent');
else no('mount', 'silent no-op guard missing for: ' + noopFails.join(','));

console.log('\n== 16. motivation design (Psych) + red-line scan ==');
if (has(src, 'honest inflation number') && has(src, 'building our own'))
  ok('cause: framing headline "honest inflation number / building our own"');
else no('cause', 'cause-framing headline missing');
if (has(src, 'Join the count.')) ok('cause: "Join the count." subline');
else no('cause', '"Join the count." subline missing');
if (has(src, 'I fight with receipts.')) ok('cause: identity anchor "I fight with receipts."');
else no('cause', 'identity anchor "I fight with receipts." missing');
if (has(src, 'actually cost you this week')) ok('copy: per-item "actually" prompt');
else no('copy', 'per-item "actually" prompt missing');
if (has(src, 'Most reports this week come from actual grocery receipts.'))
  ok('copy: honest norm line');
else no('copy', 'honest norm line missing');
if (has(src, 'Your receipt is building the People'))
  ok('copy: authorship framing near submit');
else no('copy', 'authorship framing missing');
if (has(src, 'Your activity powers the movement'))
  ok('consent: red-line-#6 line at the point of collection');
else no('consent', 'red-line-#6 consent line missing');
if (has(src, 'How we use this') && has(src, 'id="pf-inf-method"'))
  ok('consent: plain-language "how we use this" link anchors to the methodology footnote');
else no('consent', '"how we use this" link / methodology footnote anchor missing');
if (has(src, 'week_count') && has(src, 'thanks for building the index'))
  ok('receipt: week_count payoff with fallback when week_count is absent');
else no('receipt', 'week_count receipt / fallback copy missing');
if (/j\s*&&\s*j\.week_count/.test(src))
  ok('receipt: week_count absence handled defensively (never fails on absence)');
else no('receipt', 'week_count absence not guarded');
if (has(src, 'pf-inf-ci-approx') && has(src, 'not sure of the exact price'))
  ok('approx: "not sure" checkbox present, labeled approximate');
else no('approx', '"not sure" checkbox missing');
if (has(src, 'body.is_approximate') && has(src, 'approxEl.checked'))
  ok('approx: is_approximate wired to the checkbox (sent 0/1 on report_price)');
else no('approx', 'is_approximate not wired to the checkbox');
if (has(src, "'pf_inflation_area'") && has(src, 'localStorage.getItem(AREA_LS)'))
  ok('prefill: area remembered in localStorage pf_inflation_area and pre-filled');
else no('prefill', 'pf_inflation_area pre-fill missing');
if (has(src, 'pf-inf-ci-refl') && has(src, 'last reported:'))
  ok('refline: last-reported price shown as display-only reference');
else no('refline', 'last-reported reference line missing');
/* The only write to the price input is the success clear — the reference
   value is NEVER pre-filled into the input. */
if (count(src, 'priceEl.value =') === 1)
  ok('refline: price input is never pre-filled (single write: the success clear)');
else no('refline', 'price input has ' + count(src, 'priceEl.value =') + ' writes (must be 1)');

/* Red-line scan over USER-FACING copy: strip /* *\/ and // comments first,
   so design notes in comments cannot trip (or hide) copy violations. */
var copyOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/mg, '');
var redFails = [];
[['streak', 'streak'], ['leaderboard', 'leaderboard'],
 ["you\u2019ll lose", 'loss-framed'], ["you'll lose", 'loss-framed'],
 ['top contributor', 'top-contributor'], ['counting on you', 'guilt'],
 ['let the movement down', 'guilt'], ['earn xp', 'XP promise'],
 ['+ xp', 'XP promise']
].forEach(function (pair) {
  if (copyOnly.toLowerCase().indexOf(pair[0]) !== -1) redFails.push(pair[1] + ' copy ("' + pair[0] + '")');
});
if (!redFails.length)
  ok('red-lines: user-facing copy clean (no streaks, leaderboards, loss-framed or guilt copy)');
else no('red-lines', 'banned copy found: ' + redFails.join(', '));

console.log('\n== 17. official baseline wiring (cpi_compare) + methodology footnote ==');
/* Fix 1: the trends view must fetch the official series from the dedicated
   cpi_compare endpoint — price_trends does not return one. */
if (has(src, "getJSON('cpi_compare'") || has(src, 'getJSON("cpi_compare"'))
  ok('wiring: trends view calls getJSON(\'cpi_compare\') for the official series');
else no('wiring', 'trends view does not call cpi_compare');
/* The cpi_compare response shape: {official: {cpi_u_all_items: {...},
   ...} | null} — the render must unwrap the nested per-series baseline and
   show period + retrieval date (backend calls it source_date). */
if (has(src, 'c.official') && has(src, 'off.value'))
  ok('wiring: unwraps c.official and gates on value');
else no('wiring', 'c.official unwrap / value gate missing');
if (has(src, 'cpi_u_all_items') && has(src, 'off.period') &&
    has(src, 'off.source_date') && has(src, 'Baseline pulled'))
  ok('wiring: unwraps nested all-items series; renders period + retrieval date ("Baseline pulled")');
else no('wiring', 'nested-series unwrap or period + retrieval-date render missing');
/* Honest fallback: null/404 official leaves the pending copy in place. */
if (has(src, 'pf-inf-tr-official') && has(src, 'officialPendingHTML') &&
    has(src, 'Official baseline pending — check back'))
  ok('wiring: null/404 official keeps the pending fallback');
else no('wiring', 'pending-fallback plumbing missing');
if (has(src, 'never draw a line we don')) ok('wiring: pending fallback keeps the no-invention promise');
else no('wiring', 'no-invention promise missing from pending fallback');
/* Fail-soft: the cpi_compare callback never renders on failure. */
if (/getJSON\('cpi_compare'[\s\S]{0,400}var off = \(c && c\.official\) \|\| null/.test(src))
  ok('wiring: cpi_compare callback is null-safe (fail-soft on 404)');
else no('wiring', 'cpi_compare callback not null-safe');
/* Fix 2: the fair-comparison footnote must disclose the basket difference
   and the rebasing — no more "same-ish basket". */
if (!has(src, 'Same-ish basket')) ok('footnote: "same-ish basket" copy removed');
else no('footnote', '"same-ish basket" still present');
if (has(src, 'genuinely different baskets')) ok('footnote: basket difference disclosed');
else no('footnote', 'basket-difference disclosure missing');
if (has(src, 'housing is about 36%') && has(src, 'services and transport'))
  ok('footnote: CPI-U composition disclosed (housing ~36%, services, transport)');
else no('footnote', 'CPI-U composition disclosure missing');
if (has(src, '12-item basket') && has(src, 'groceries, gas, electricity, rent'))
  ok('footnote: people\u2019s 12-item basket disclosed');
else no('footnote', '12-item basket disclosure missing');
if (has(src, 'compare the direction, not the digits')) ok('footnote: direction-not-digits guidance kept');
else no('footnote', 'direction-not-digits guidance missing');
if (has(src, 'rebased') && has(src, 'first week') && has(src, 'relative, not absolute'))
  ok('footnote: rebasing disclosed (relative, not absolute level)');
else no('footnote', 'rebasing disclosure missing');
if (has(src, 'never presented as official')) ok('footnote: never-presented-as-official language kept');
else no('footnote', 'never-presented-as-official language missing');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
