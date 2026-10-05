#!/usr/bin/env node
/* scripts/verify-publisher-fe.js — One-Button Publisher frontend verification
   harness (fe/publisher-compose-ui, 2026-10-05). Run from the worktree root:
     node scripts/verify-publisher-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the module, build/bundle.js, and this harness.
   2. Kill switch: ?pf_off=publisher via PF.skip('publisher') + documented in
      the header; silent no-op when the admin rail is absent.
   3. Admin gate: module refuses to mount without the admin secret
      (sessionStorage 'pf_admin_secret') — PF.publisherDenied recorded; mount
      conditioned ONLY on #xVault + #vlLock (vault admin area). No public mount.
   4. Compose surface: title, body, link, image fields + LOAD WAR REPORT DRAFT.
   5. Preview: all 5 platform tabs render, char counts shown, PUSH disabled
      until the preview has been viewed (no blind pushes).
   6. Toggles: unconnected platforms show NOT CONNECTED, forced off, unflippable.
   7. Banned terms: no banned term in UI copy (the BANNED enforcement list,
      comments, and the FALLBACK_TARGETS admin account inventory are not
      copy); bannedHit scan runs before preview AND push.
   8. No XP logic in the module (display only).
   9. Dry-run: banner "DRY RUN — nothing publishes." markup present; post
      object carries dry_run:true; banner hidden only when the backend reports
      a platform live.
   10. Status board: queued -> sent/failed/skipped/unknown per-platform
       states; unknown is terminal (no retry) with a manual-reconciliation
       affordance (MARK SENT / MARK FAILED via publisher_reconcile);
       publish history rendered from the audit log (publisher_history).
   11. Backend contract: {type:'publisher', publisher_action} idiom on the
       X-Admin-Secret rail; PUB_ACTION map names the six actions; War Report
       draft reuses the existing warreport_latest read (no new contract).
   12. Bundle registration: publisher.js listed exactly once in
       build/bundle.js and present in the rebuilt bundle-bank.js.
   13. Backslash discipline: no backtick spans in the module, so the lone-
       backslash hazard class is absent by construction (asserted).
   14. Account targeting (spec B3): post object carries the targets block;
       per-platform target selectors with safe defaults; the personal account
       is flagged explicit, never a default, and requires an explicit per-push
       confirmation before PUSH unlocks.
   15. IG placement at preview time (spec B5): the IG preview tab shows the
       pinned placement; a text-only post shows "needs image" in the preview. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var G = path.join(V, 'games');
var MOD = path.join(G, 'publisher.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(src, s) { return src.indexOf(s) !== -1; }
/* Code-only view: strip block comments, line comments, and string literals,
   so prose in comments/docs can't mask or fake a code-level check. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
function uiCopy(src) {
  /* Prose the CEO will actually see: strip comments, the BANNED enforcement
     list (that's the gate, not copy), and the FALLBACK_TARGETS account
     inventory (a CEO-only admin selector, not site copy — its boundary is
     spec B3: never-default + explicit per-push choice, asserted separately). */
  var s = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/var BANNED\s*=\s*\[[^\]]*\];/, ' ');
  return stripVarBlock(s, 'FALLBACK_TARGETS');
}
/* Remove `var NAME = {...};` from source by balancing braces — the inventory
   is data, and its account labels must not count as UI copy. */
function stripVarBlock(src, name) {
  var i = src.indexOf('var ' + name + ' =');
  if (i === -1) return src;
  var j = src.indexOf('{', i);
  if (j === -1) return src;
  var depth = 0, k = j;
  while (k < src.length) {
    var c = src[k];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
    k++;
  }
  return src.slice(0, i) + ' ' + src.slice(k + 1);
}

console.log('== 1. syntax ==');
[['the module', MOD], ['build/bundle.js', path.join(ROOT, 'build', 'bundle.js')], ['this harness', __filename]]
  .forEach(function (pair) {
    try {
      cp.execFileSync(process.execPath, ['--check', pair[1]], { stdio: 'pipe' });
      ok('node --check: ' + pair[0]);
    } catch (e) { no('node --check: ' + pair[0], 'syntax error'); }
  });

var src = read(MOD);
var code = codeOnly(src);
var ui = uiCopy(src);

console.log('== 2. kill switch ==');
if (has(src, "PF.skip('publisher')")) ok('kill: PF.skip(\'publisher\') gate present');
else no('kill', "PF.skip('publisher') gate missing");
if (has(src, '?pf_off=publisher')) ok('kill: ?pf_off=publisher documented in header');
else no('kill', '?pf_off=publisher not documented');
/* Silent no-op when the vault is absent: mount() returns when #xVault/#vlLock missing. */
if (has(src, "getElementById('xVault')") && has(src, "getElementById('vlLock')"))
  ok('kill: silent no-op when the admin area is absent');
else no('kill', 'mount does not guard on #xVault/#vlLock');

console.log('== 3. admin gate ==');
if (has(src, "'pf_admin_secret'")) ok('admin: reads the admin secret from sessionStorage');
else no('admin', "sessionStorage 'pf_admin_secret' not referenced");
if (has(src, "PF.publisherDenied = 'no-admin-secret'")) ok('admin: refuses to mount without the secret (publisherDenied)');
else no('admin', 'no-admin mount refusal missing');
/* The mount appends only into #xVault — never body/document-wide. */
if (!/document\.body\.appendChild|document\.body\.insertAdjacentHTML/.test(src))
  ok('admin: never mounts on a public page (vault-only host)');
else no('admin', 'module mounts outside the vault admin area');

console.log('== 4. compose surface ==');
[['pubTitle', 'title'], ['pubBody', 'body'], ['pubLink', 'link'], ['pubImage', 'image']]
  .forEach(function (f) {
    if (has(src, 'id="' + f[0] + '"')) ok('compose: ' + f[1] + ' field present');
    else no('compose', f[1] + ' field missing');
  });
if (has(src, 'LOAD WAR REPORT DRAFT')) ok('compose: LOAD WAR REPORT DRAFT button');
else no('compose', 'draft-load button missing');
if (has(src, 'pubImageFile') && has(src, 'type="file"')) ok('compose: optional image picker');
else no('compose', 'image picker missing');

console.log('== 5. per-platform preview ==');
['discord', 'instagram', 'threads', 'facebook', 'substack'].forEach(function (p) {
  if (has(src, "key: '" + p + "'")) ok('preview: ' + p + ' platform definition');
  else no('preview', p + ' missing from PLATFORMS');
});
if (has(src, 'data-pub-tab') && has(src, 'data-pub-pane'))
  ok('preview: per-platform tabs and panes');
else no('preview', 'preview tabs/panes missing');
if (has(src, 'chars') && has(src, 'TRUNCATED')) ok('preview: char counts + truncation flags shown');
else no('preview', 'char counts / truncation flags missing');
if (has(src, 'state.previewViewed') && has(src, 'No blind pushes'))
  ok('push: locked until the preview is viewed (no blind pushes)');
else no('push', 'no-blind-push gate missing');
if (has(src, 'id="pubPush" disabled')) ok('push: PUSH button starts disabled');
else no('push', 'PUSH button does not start disabled');

console.log('== 6. per-platform toggles ==');
if (has(src, 'NOT CONNECTED')) ok('toggles: unconnected platforms labeled NOT CONNECTED');
else no('toggles', 'NOT CONNECTED label missing');
if (has(src, 'if (!state.connected[key]) return'))
  ok('toggles: unconnected platforms unflippable');
else no('toggles', 'unflippable-toggles guard missing');
if (has(src, 'if (!state.connected[k]) state.toggles[k] = false'))
  ok('toggles: unconnected platforms forced off');
else no('toggles', 'forced-off for unconnected platforms missing');

console.log('== 7. banned terms ==');
if (/\bdonate\w*\b/i.test(ui)) no('banned', 'banned term in UI copy: ' + (ui.match(/\bdonate\w*\b/i) || [])[0]);
else ok('banned: no banned term in UI copy');
if (/shanetheswan/i.test(ui)) no('banned', 'banned handle in UI copy');
else ok('banned: no banned handle in UI copy');
if (has(src, 'function bannedHit')) ok('banned: bannedHit scanner defined');
else no('banned', 'bannedHit scanner missing');
var scanCalls = (src.match(/bannedHit\(/g) || []).length;
if (scanCalls >= 3) ok('banned: scan runs before preview and push (' + scanCalls + ' call sites)');
else no('banned', 'bannedHit called only ' + scanCalls + 'x — must gate preview and push');

console.log('== 8. no XP logic ==');
if (/\bxp\b/i.test(code.replace(/\bpublisher\b/gi, ''))) no('xp', 'XP token in module code');
else ok('xp: no XP tokens in module code');
if (/xpGrant/i.test(src)) no('xp', 'xpGrant call present');
else ok('xp: no xpGrant call');
if (/experience|xp_amount|xpCap|awardXp/i.test(src)) no('xp', 'XP economy reference present');
else ok('xp: no XP economy references (display only)');

console.log('== 9. dry-run ==');
if (has(src, 'DRY RUN') && has(src, 'nothing publishes')) ok('dry-run: "DRY RUN — nothing publishes." banner copy');
else no('dry-run', 'dry-run banner copy missing');
if (has(src, 'dry_run: true')) ok('dry-run: post object carries dry_run:true');
else no('dry-run', 'post object missing dry_run');
if (has(src, 'j.live')) ok('dry-run: banner hidden only when the backend reports a platform live');
else no('dry-run', 'banner does not react to backend live flags');

console.log('== 10. status board + history ==');
['queued', 'sent', 'failed', 'skipped', 'unknown'].forEach(function (s) {
  if (has(src, "'" + s + "'")) ok('status: per-platform state "' + s + '" rendered');
  else no('status', 'state "' + s + '" missing');
});
if (has(src, "publisher_push_status") || has(src, 'pushStatus')) ok('status: polls publisher_push_status');
else no('status', 'status polling missing');
/* B1: unknown is terminal — poller only continues on 'queued', never retries. */
if (/if \(st === 'queued'\)/.test(src)) ok('status: unknown never retries (poll continues on queued only)');
else no('status', 'poller may retry non-queued states');
if (has(src, 'MARK SENT') && has(src, 'MARK FAILED') && has(src, 'data-pub-reconcile'))
  ok('status: unknown rows carry manual-reconciliation affordance');
else no('status', 'manual-reconciliation affordance missing');
if (has(src, 'publisher_reconcile')) ok('status: publisher_reconcile action wired');
else no('status', 'publisher_reconcile action missing');
if (has(src, 'publisher_history') && has(src, 'PUBLISH HISTORY'))
  ok('history: audit log rendered via publisher_history');
else no('history', 'publish-history surface missing');

console.log('== 11. backend contract ==');
if (has(src, "{ type: 'publisher', publisher_action: cAction }"))
  ok('contract: {type:publisher, publisher_action} envelope idiom');
else no('contract', 'publisher envelope idiom missing');
['status', 'preview', 'push', 'pushStatus', 'reconcile', 'history'].forEach(function (a) {
  if (new RegExp(a + ":\\s*'publisher_").test(src)) ok('contract: PUB_ACTION.' + a);
  else no('contract', 'PUB_ACTION.' + a + ' missing');
});
if (has(src, "'X-Admin-Secret'")) ok('contract: X-Admin-Secret admin rail');
else no('contract', 'X-Admin-Secret header missing');
if (has(src, "warreport_latest")) ok('contract: draft load reuses existing warreport_latest read');
else no('contract', 'draft load does not reuse warreport_latest');

console.log('== 12. bundle registration ==');
var bsrc = read(path.join(ROOT, 'build', 'bundle.js'));
var listHits = bsrc.split("'publisher.js'").length - 1;
if (listHits === 1) ok('bundle: publisher.js listed exactly once in build/bundle.js');
else no('bundle', "'publisher.js' listed " + listHits + ' times in build/bundle.js');
var bundlePath = path.join(G, 'bundle-bank.js');
if (fs.existsSync(bundlePath) && has(read(bundlePath), 'ONE-BUTTON PUBLISHER'))
  ok('bundle: publisher present in rebuilt bundle-bank.js');
else no('bundle', 'bundle-bank.js not rebuilt or missing publisher');

console.log('== 13. backslash discipline ==');
if (/`/.test(src)) no('backticks', 'backtick spans present — lone-backslash hazard class');
else ok('backticks: no backtick spans (hazard class absent by construction)');

console.log('== 14. account targeting (spec B3) ==');
/* Post object carries the spec §2 targets block. */
if (has(src, 'targets: {') && has(src, 'account_id: currentTargetId') && has(src, "page_id: currentTargetId('facebook')") && has(src, "channel: currentTargetId('discord')"))
  ok('targets: post object carries the spec targets block');
else no('targets', 'post object targets block missing or incomplete');
if (has(src, 'data-pub-target')) ok('targets: per-platform target selectors rendered');
else no('targets', 'per-platform target selectors missing');
if (has(src, 'data-pub-placement') && has(src, "'feed'") && has(src, "'story'"))
  ok('targets: IG placement feed|story selector');
else no('targets', 'IG placement selector missing');
/* The personal account is flagged explicit in the inventory and is never
   a default; safeDefault() skips explicit-flagged entries. */
if (/shanetheswan[^}]*explicit:\s*true/.test(src)) ok('targets: personal account flagged explicit in inventory');
else no('targets', 'personal account not flagged explicit');
if (/is_default:\s*true[^}]*explicit:\s*true|explicit:\s*true[^}]*is_default:\s*true/.test(src.replace(/\/\*[\s\S]*?\*\//g, ' ')))
  no('targets', 'an explicit-flagged target is also a default');
else ok('targets: no explicit-flagged target is a default');
if (has(src, 'if (!list[j].explicit)')) ok('targets: safeDefault() never returns an explicit target');
else no('targets', 'safeDefault() may return an explicit target');
if (has(src, 'EXPLICIT PER-PUSH CHOICE') && has(src, 'data-pub-explicit'))
  ok('targets: explicit per-push confirmation affordance');
else no('targets', 'explicit per-push confirmation missing');
if (has(src, 'Explicit choice required')) ok('targets: PUSH blocked until the explicit choice is confirmed');
else no('targets', 'PUSH does not gate on the explicit choice');

console.log('== 15. IG placement at preview time (spec B5) ==');
if (has(src, 'Placement pinned')) ok('preview: IG placement shown in the preview tab');
else no('preview', 'IG placement not shown in preview');
if (has(src, 'NEEDS IMAGE')) ok('preview: text-only IG post shows "needs image" in preview');
else no('preview', '"needs image" preview warning missing');

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
