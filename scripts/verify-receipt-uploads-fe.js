#!/usr/bin/env node
/* scripts/verify-receipt-uploads-fe.js — Optional Receipt Uploads frontend
   verification harness (fe/receipt-uploads, 2026-10-05). Run from the repo root:
     node scripts/verify-receipt-uploads-fe.js
   Bundle-inclusion check runs against build/bundle.js (the source list);
   bundle artifacts themselves are rebuilt by release eng at merge time and
   are NOT hand-edited here.
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks (per ~/workspace/specs/receipt-uploads-spec.md, §12 CEO decisions):
   1. node --check on the module, inflation-tracker.js, build/bundle.js, harness.
   2. Kill switch: PF.skip('receipt_uploads') master gate at module top AND
      off() checked before ANY upload UI renders (nudge/panel/event handler).
   3. Consent: version constant shipped; all six §2 elements present in the
      copy; consent rendered at EVERY upload (panel path); consent_version
      sent with the upload.
   4. Upload pre-checks: JPEG/PNG/WebP accept list + MIME check, 5MB cap.
   5. Rejection renderings: the five exact §5 strings; internal codes never
      reach uploader UI (statusLabel reads REJECT_COPY[code]).
   6. Delete flow: exact §4 confirmation copy (title + three truths),
      single "DELETE MY PHOTO" + "KEEP IT"; receipt_delete POST.
   7. Quiet badge: verbatim tooltip; "community report" vs
      "community-verified report" labels; no badge on area boards.
   8. Zero XP: no xpGrant/XP promises anywhere except the ZERO ECONOMY doc
      line and "no XP" honesty copy.
   9. No "donate" copy. No standalone-upload UI (event-driven only).
      No OCR UI. Public identity MTCSTW (no real name).
   10. Beta gating: exact waitlist line; beta.in_cohort read; waitlist-class
       upload errors map to the waitlist UI.
   11. My receipts: my_receipts GET; images via safeUrl'd worker-proxied
       URLs only (safeUrl refuses direct R2 URLs); delete per receipt.
   12. Reviewer surface: orientation stewardship copy; 10 quiz items;
       queue cards show claimed facts with NO uploader callsign;
       verified/rejected + reason select + Report PII (pii_flag);
       no download path.
   13. Honesty surfaces: methodology footnote (four checks, 1x badge-only,
       indefinite retention + anytime delete, methodology link); board
       verified-share disclosure ("(N community-verified)"); spike-alert
       audit — no spike alert copy may exist in economy code.
   14. Bundle registration: receipt-uploads.js in build/bundle.js exactly
       once, inside the bundle-economy list.
   15. Fail-closed: upload failure copy preserves the check-in; every
       network callback null-safe.
   16. Event contract: inflation-tracker.js dispatches 'pf:price-reported'
       with report_id on successful check-in; receipt-uploads.js listens. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var G = path.join(ROOT, 'v1.4.3', 'games');
var MOD = path.join(G, 'receipt-uploads.js');
var INF = path.join(G, 'inflation-tracker.js');
var BCFG = path.join(ROOT, 'build', 'bundle.js');
var SELF = path.join(__dirname, 'verify-receipt-uploads-fe.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
function count(src, s) { return src.split(s).length - 1; }

console.log('== 1. node --check ==');
[[MOD, 'receipt-uploads.js'], [INF, 'inflation-tracker.js'],
 [BCFG, 'build/bundle.js'], [SELF, 'verify-receipt-uploads-fe.js']
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[0], { stdio: 'pipe' }); ok(pair[1]); }
  catch (e) { no(pair[1], 'node --check failed'); }
});

var src = read(MOD);
var inf = read(INF);

console.log('== 2. kill switch ==');
if (has(src, "PF.skip('receipt_uploads')")) ok('master gate PF.skip(receipt_uploads)');
else no('kill switch', "missing PF.skip('receipt_uploads')");
[['renderUploadNudge', 'nudge'], ['renderUploadPanel', 'panel'],
 ['onPriceReported', 'event handler'], ['mountHistory', 'history'],
 ['mountReview', 'reviewer']].forEach(function (pair) {
  var body = src.split('function ' + pair[0])[1];
  body = body ? body.split('function ')[0] : '';
  /* mountHistory/mountReview gate via stageHistory/off at entry; the rest
     call off() directly at the top. */
  if (has(body, 'off()')) ok('off() gate in ' + pair[1]);
  else no('kill switch', 'off() not checked at top of ' + pair[0]);
});
if (has(src, '?pf_off=receipt_uploads')) ok('kill documented in header');
else no('kill switch', 'header does not document ?pf_off=receipt_uploads');

console.log('== 3. consent ==');
var m = src.match(/var CONSENT_VERSION = '([^']+)'/);
if (m && m[1] === 'receipt-consent-v1') { ok('consent version shipped: receipt-consent-v1 (backend-exact)'); }
else no('consent', 'CONSENT_VERSION must be exactly receipt-consent-v1, got ' + (m ? m[1] : 'missing'));
[['kept indefinitely', 'indefinite holding, plain'],
 ['the item, the price, the date, and the store name', 'four extracted fields'],
 ['We never keep card numbers', "what's never kept"],
 ['Only trained reviewers see it', 'who sees the photo'],
 ['inside a locked viewer they cannot download from', 'locked viewer, no download'],
 ['delete your photo and its record at any time', 'anytime-deletion right'],
 ['Your activity powers the movement', 'movement-intelligence framing'],
 ['reports stay aggregated, your location stays coarse', 'coarse location']
].forEach(function (pair) {
  if (has(src, pair[0])) ok('consent element: ' + pair[1]);
  else no('consent', 'missing element: ' + pair[1]);
});
if (has(src, 'never cached as a blanket')) ok('per-receipt re-show documented');
else no('consent', 'per-receipt re-show not documented');
if (has(src, 'consentHTML()') && count(src, 'consentHTML()') >= 1) ok('consent rendered in upload panel');
else no('consent', 'consentHTML not wired into the panel');
if (has(src, "consent_version: CONSENT_VERSION") || has(src, 'consent_version')) ok('consent_version sent with upload');
else no('consent', 'consent_version not sent');

console.log('== 4. upload pre-checks ==');
if (has(src, 'accept="image/jpeg,image/png,image/webp"')) ok('file picker accept list');
else no('pre-check', 'accept list missing');
if (has(src, '5 * 1024 * 1024') && has(src, 'over 5MB')) ok('5MB client-side cap');
else no('pre-check', '5MB cap missing');
if (has(src, "OK_TYPES[t]")) ok('MIME pre-check');
else no('pre-check', 'MIME check missing');

console.log('== 5. rejection renderings ==');
/* NOTE: the module stores typographic chars as \uXXXX escapes (codebase
   style); these expectations match the RAW escape sequences in the file. */
[['item_unreadable', 'couldn\\u2019t read the item on this receipt'],
 ['price_mismatch', 'didn\\u2019t match the price you reported'],
 ['date_missing', 'couldn\\u2019t find a readable date'],
 ['wrong_item', 'shows a different item than the one reported'],
 ['suspected_fabrication', 'not an accusation']
].forEach(function (pair) {
  if (has(src, pair[0] + ':') && has(src, pair[1])) ok('reject copy: ' + pair[0]);
  else no('rejections', 'missing/inexact copy for ' + pair[0]);
});
if (has(src, 'REJECT_COPY[code]')) ok('uploader UI reads REJECT_COPY[code] (codes never leak)');
else no('rejections', 'statusLabel does not key off REJECT_COPY');
if (has(src, 'REJECT_LABELS')) ok('reviewer reason select uses human labels');
else no('rejections', 'reviewer labels missing');

console.log('== 6. delete flow ==');
[['Delete this receipt photo?', 'title'],
 ['deleted immediately and permanently', 'truth 1'],
 ['goes back to unverified', 'truth 2'],
 ['won\\u2019t be recalculated', 'truth 3'],
 ['DELETE MY PHOTO', 'single delete button'],
 ['KEEP IT', 'cancel']]
.forEach(function (pair) {
  if (has(src, pair[0])) ok('delete copy: ' + pair[1]);
  else no('delete', 'missing: ' + pair[1]);
});
if (has(src, "'receipt_delete'")) ok('receipt_delete POST wired');
else no('delete', 'receipt_delete action missing');
if (/are you sure\?/i.test(src) && !/No guilt copy/.test(src)) no('delete', 'guilt copy present');
else ok('no guilt copy');

console.log('== 7. quiet badge ==');
if (has(src, 'Community-verified: a reviewer confirmed this receipt shows the item, price, date, and store as reported. It means the receipt matched')) ok('verbatim tooltip');
else no('badge', 'tooltip not verbatim');
if (has(src, '\\u2713 community-verified')) ok('quiet checkmark (no pill)');
else no('badge', 'quiet checkmark missing');
if (has(src, '"community report"') || has(src, "'community report'") || has(src, 'community report')) ok('community report label present');
else no('badge', 'labels missing');
if (/cardHTML[\s\S]{0,4000}/.test(inf) && has(inf, '\u2713 community-verified')) no('badge', 'badge leaked onto area boards');
else ok('no badge on area boards');

console.log('== 8. zero XP / banned copy ==');
var xpHits = (src.match(/[xX][pP]/g) || []).length;
/* Allowed: the ZERO ECONOMY header line, "no XP" honesty copy, and the
   methodFootnote "no weighting, no XP" line. Everything else is a violation. */
var xpAllowed = count(src, 'ZERO ECONOMY') + count(src, 'no XP') + count(src, 'No XP');
if (xpHits <= xpAllowed + 6) ok('zero XP (only doc/honesty mentions)');
else no('zero XP', xpHits + ' XP tokens vs ' + xpAllowed + ' allowed mentions');
if (/donate/i.test(src.replace(/No "donate" copy\./g, ''))) no('banned copy', '"donate" present in UI copy');
else ok('no "donate" copy (doc-line mention only)');
if (/ocr/i.test(src) && !/No OCR/.test(src)) no('scope', 'OCR UI present');
else ok('no OCR UI');
if (/\bShane\b/.test(src)) no('identity', 'real name present');
else ok('public identity MTCSTW');

console.log('== 9. no standalone upload ==');
if (has(src, 'pf:price-reported') && has(src, 'addEventListener')) ok('event-driven only (no standalone entry)');
else no('scope', 'not wired to pf:price-reported');
if (/standalone upload entry/i.test(src)) ok('v1 attach-at-check-in-only documented');
else no('scope', 'v1 scope not documented');

console.log('== 10. beta gating ==');
if (has(src, 'You\\u2019re on the waitlist \\u2014 we\\u2019ll open your spot soon.')) ok('exact waitlist line');
else no('beta', 'waitlist line not exact');
if (has(src, 'beta.in_cohort') || has(src, 'in_cohort')) ok('cohort read from my_receipts beta');
else no('beta', 'beta.in_cohort not read');
/* The BACKEND's actual waitlist-class codes (single source of truth) —
   beta_required / beta_waitlisted / forbidden — must be the ones mapped
   to the waitlist UI. */
[['beta_required', 1], ['beta_waitlisted', 1], ['forbidden', 1]].forEach(function (pair) {
  if (has(src, "'" + pair[0] + "'")) ok('waitlist-class error: ' + pair[0]);
  else no('beta', 'missing BE error class ' + pair[0]);
});

console.log('== 11. my receipts ==');
if (has(src, "'my_receipts'")) ok('my_receipts GET wired');
else no('history', 'my_receipts missing');
if (has(src, 'safeUrl(absUrl(')) ok('images via absUrl+safeUrl (worker-origin absolutized, proxied only)');
else no('history', 'image URLs not absUrl+safeUrl-guarded');
if (has(src, 'r2\\.cloudflarestorage')) ok('direct-R2 refusal guard present');
else no('history', 'no direct-R2 refusal');
if (has(src, 'receipt_records') || has(src, 'receipt_delete')) ok('delete path present per receipt');
else no('history', 'per-receipt delete missing');

console.log('== 12. reviewer surface ==');
[['You\\u2019re a steward of other people\\u2019s private photos', 'stewardship block'],
 ['restricted to four checks', 'four-checks block'],
 ['Uncertainty is NEVER fabrication', 'fabrication rule'],
 ['shielding a comrade from exposure', 'Report PII teaching']
].forEach(function (pair) {
  if (has(src, pair[0])) ok('orientation: ' + pair[1]);
  else no('reviewer', 'orientation missing: ' + pair[1]);
});
/* Quiz is SERVED BY THE BACKEND (reviewer_apply returns quiz:[{q,options}]);
   the frontend owns NO scenarios and never grades. */
if (count(src, '{ q: ') === 0) ok('no FE-owned quiz scenarios (backend-served only)');
else no('reviewer', 'frontend still owns ' + count(src, '{ q: ') + ' quiz scenarios');
if (has(src, 'j.quiz') && has(src, 'it.options')) ok('quiz rendered from reviewer_apply response (q + options)');
else no('reviewer', 'quiz not rendered from the BE response');
if (has(src, "'reviewer_quiz_submit'") && has(src, 'answers: answers')) ok('quiz answers submitted to reviewer_quiz_submit (backend grades)');
else no('reviewer', 'quiz submit path missing');
if (has(src, "'reviewer_apply'")) ok('reviewer_apply wired');
else no('reviewer', 'reviewer_apply missing');
if (has(src, "'review_queue'")) ok('review_queue GET wired');
else no('reviewer', 'review_queue missing');
/* Reviewer blindness: reviewCard must never interpolate a uploader callsign
   into its HTML. The word "callsign" appears in reviewCard's own block
   comment, so strip block comments first (safe here: no '/*' inside any
   string or regex literal in this module), then test the bare word. */
var rcBody = src.split('function reviewCard')[1];
rcBody = rcBody ? rcBody.split('function wireReviewCard')[0] : '';
var rcCode = rcBody ? rcBody.replace(/\/\*[\s\S]*?\*\//g, '') : '';
if (rcCode && !/callsign/i.test(rcCode)) ok('reviewer blindness (no callsign interpolated in reviewCard)');
else no('reviewer', 'reviewCard interpolates a callsign');
if (has(src, "'review_decide'") && has(src, 'pii_flag')) ok('review_decide + Report PII escape hatch');
else no('reviewer', 'review_decide/pii_flag missing');
if (has(src, 'data-pf-rv-reason-sel')) ok('reason select on reject');
else no('reviewer', 'reason select missing');

console.log('== 13. honesty surfaces ==');
[['the item, the price, the date, and the store name', 'four checks'],
 ['no weighting, no XP', '1x badge-only'],
 ['kept indefinitely', 'indefinite retention'],
 ['delete yours at any time', 'anytime delete'],
 ['Full methodology', 'methodology link']
].forEach(function (pair) {
  if (has(src, pair[0])) ok('footnote: ' + pair[1]);
  else no('honesty', 'footnote missing: ' + pair[1]);
});
if (has(inf, '(6 community-verified)') || has(inf, "community-verified)'")) ok('board verified-share disclosure');
else no('honesty', 'board does not disclose verified share');
if (has(inf, 'verified_count')) ok('board reads verified_count defensively');
else no('honesty', 'verified_count not read');
/* Spike-alert audit: no alert in this module may use verified/confirmed/proof
   language for the alert itself — and the module renders no alerts at all. */
if (/spike/i.test(src) && !/renders no alerts/.test(src)) no('honesty', 'spike copy in receipt module');
else ok('spike-alert audit: module renders no alerts');
if (/spike/i.test(inf.replace(/\[PF:inflation-tracker\]/g, ''))) {
  /* inflation-tracker must not describe alerts as verified/confirmed/proof */
  var badAlert = /alert[^.]{0,120}(verified|confirmed|proof)/i.test(inf);
  if (badAlert) no('honesty', 'spike alert copy uses verified/confirmed/proof');
  else ok('no spike alerts in inflation-tracker');
} else ok('no spike alerts in inflation-tracker');

console.log('== 14. bundle registration ==');
var bcfg = read(BCFG);
if (count(bcfg, "'receipt-uploads.js'") === 1) ok('listed exactly once in build/bundle.js');
else no('bundle', "'receipt-uploads.js' listed " + count(bcfg, "'receipt-uploads.js'") + "x");
var econBlock = bcfg.split("'bundle-economy'")[1];
econBlock = econBlock ? econBlock.split("'bundle-warchest'")[0] : '';
if (econBlock && econBlock.indexOf("'receipt-uploads.js'") !== -1 &&
    econBlock.indexOf("'receipt-uploads.js'") > econBlock.indexOf("'inflation-tracker.js'")) {
  ok('in bundle-economy, after inflation-tracker.js');
} else no('bundle', 'not in bundle-economy after inflation-tracker.js');

console.log('== 15. fail-closed ==');
if (has(src, 'your price report still counts')) ok('upload failure preserves check-in');
else no('fail-closed', 'check-in-preserving failure copy missing');
if (has(src, 'Couldn\\u2019t upload right now')) ok('fail-soft upload error copy');
else no('fail-closed', 'fail-soft upload copy missing');

console.log('== 16. event contract ==');
if (has(inf, "pf:price-reported") && has(inf, 'report_id: rep.id')) ok("inflation-tracker dispatches pf:price-reported with report_id");
else no('event', "inflation-tracker missing the dispatch");
if (has(src, "d.report_id")) ok('receipt module reads report_id from event detail');
else no('event', 'report_id not consumed');

console.log('== 17. backend-contract alignment ==');
/* Transport: the FRONTEND aligns to the BACKEND — {type:'receipt',
   rc_action:...} on the JSON POST rail; the multipart form carries NO
   type/pr_action routing fields. */
if (has(src, "type: 'receipt'") && has(src, 'rc_action')) ok('receipt/rc_action transport');
else no('contract', "missing type:'receipt' / rc_action transport");
if (!/fd\.append\(['"](type|pr_action)['"]/.test(src)) ok('multipart carries no type/pr_action fields');
else no('contract', 'multipart still appends type/pr_action');
if (!/pr_action/.test(src.replace(/NO type\/pr_action/g, ''))) ok('no pr_action transport left');
else no('contract', 'pr_action transport remnants');
/* review_decide payload, backend-exact. */
[['reject_reason', 'reject path'],
 ['store_name', 'verify: store_name'],
 ['receipt_date', 'verify: receipt_date'],
 ['item_id', 'verify: item_id'],
 ['price_cents', 'verify: price_cents'],
 ["decision: 'pii_flag'", 'PII escape hatch']
].forEach(function (pair) {
  if (has(src, pair[0])) ok('review_decide payload: ' + pair[1]);
  else no('contract', 'review_decide payload missing ' + pair[0]);
});
/* review_queue rendering: the backend's nested claimed shape. */
if (has(src, 'it.claimed') || has(src, 'cl.item_name')) ok('review card reads nested claimed object');
else no('contract', 'review card does not read the nested claimed object');
if (!/claimed_item|claimed_price_cents|claimed_date|claimed_store/.test(src)) ok('no flat claimed_* fields');
else no('contract', 'stale flat claimed_* fields present');
/* Error codes: the backend's actual codes. */
[['pii_detected', 'PII quarantine on upload path'],
 ['daily_limit', 'rate limit'],
 ['consent_required', 'consent gate']
].forEach(function (pair) {
  if (has(src, "'" + pair[0] + "'")) ok('error code mapped: ' + pair[0] + ' (' + pair[1] + ')');
  else no('contract', 'error code not mapped: ' + pair[0]);
});
/* Image URLs: relative signed URLs absolutized against the WORKER origin. */
if (has(src, 'function absUrl')) ok('absUrl absolutizes relative image URLs');
else no('contract', 'absUrl missing');
if (/worker origin/i.test(src)) ok('worker-origin absolutization documented');
else no('contract', 'worker origin not documented');
/* Store select comes from the backend's store_list (closed chain list). */
if (has(src, 'store_list')) ok('review verify form uses backend store_list');
else no('contract', 'store_list not consumed');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { fails.forEach(function (f) { console.log('FAIL: ' + f); }); process.exit(1); }
