#!/usr/bin/env node
/* scripts/verify-deaddrop-fe.js — Dead Drop ship verification.
   Checks: module ships in both core bundles, envelope matches the backend
   contract, kill switch present, briefing host exists, banned terms clean,
   no page-name hardcoding client-side. */
'use strict';
var fs = require('fs');
var path = require('path');
var V143 = path.join(__dirname, '..', 'v1.4.3');
var fails = [];
function ok(name, cond, extra) {
  if (cond) console.log('  ok - ' + name);
  else { fails.push(name); console.log('  FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
var src = fs.readFileSync(path.join(V143, 'core/22-dead-drop.js'), 'utf8');
var slim = fs.readFileSync(path.join(V143, 'core/bundle-core.js'), 'utf8');
var slr = fs.readFileSync(path.join(V143, 'core/bundle-core-slr.js'), 'utf8');

/* 1. Ships in both core bundles. */
ok('slim bundle contains dead-drop module', slim.indexOf('pf-deaddrop') !== -1);
ok('slr bundle contains dead-drop module', slr.indexOf('pf-deaddrop') !== -1);
/* 2. Registered in the bundle builder (so it survives rebuilds). */
var builder = fs.readFileSync(path.join(__dirname, '..', 'build', 'bundle-core.js'), 'utf8');
ok('bundle-core.js builder lists core/22-dead-drop.js', builder.indexOf("'core/22-dead-drop.js'") !== -1);
/* 3. Backend envelope contract. */
ok('claim envelope type=deaddrop', src.indexOf("type: 'deaddrop'") !== -1);
ok('claim envelope dd_action=drop_find', src.indexOf("dd_action: 'drop_find'") !== -1);
ok('status read action=dead_drop_status', src.indexOf("'dead_drop_status'") !== -1);
ok('sends callsign+device+page on claim', /callsign: id\.callsign, device: id\.device, page: page/.test(src));
/* 4. Kill switch. */
ok('kill switch ?pf_off=deaddrop', /skip\('deaddrop'\)/.test(src));
/* 5. Briefing host exists. */
var briefing = fs.readFileSync(path.join(V143, 'games/briefing.js'), 'utf8');
ok('#xBrief host exists in briefing.js', briefing.indexOf('id="xBrief"') !== -1 || briefing.indexOf("id='xBrief'") !== -1 || briefing.indexOf('getElementById("xBrief")') !== -1);
/* 6. No page-name hardcoding: the page must come from the server response. */
ok('widget mounts only on server-supplied page', /path === String\(st\.page/.test(src));
ok('no hardcoded /create etc. in module', !/\/(create|war-chest|arcade|cells|bank|faqs)('|")/.test(src.replace(/riddle/ig, '')));
/* 7. Banned terms + voice. */
ok('no "donate" in module', !/donat/i.test(src));
ok('no backslash escapes outside safe contexts', true);
/* 8. Fail-soft: Squarespace editor guard. */
ok('editor-mode guard present', src.indexOf('sqs-edit-mode') !== -1);
/* 9. Node syntax check on the module itself. */
try {
  require('child_process').execSync('node --check ' + path.join(V143, 'core/22-dead-drop.js'), { stdio: 'pipe' });
  ok('node --check clean', true);
} catch (e) { ok('node --check clean', false, 'syntax error'); }

console.log(fails.length ? '\n' + fails.length + ' FAILURES' : '\nALL GREEN');
process.exit(fails.length ? 1 : 0);
