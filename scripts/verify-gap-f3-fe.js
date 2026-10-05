/* GAP F-3 frontend regression checks (2026-10-05): G-06 / G-07 / G-08 / G-11 / G-12 / G-13.
   Run: node scripts/verify-gap-f3-fe.js */
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

var pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

console.log('== gap F-3 frontend checks ==');

/* G-06: 22-dead-drop.js ships in bundle-core (header claimed it; it didn't). */
{
  var bc = read('build/bundle-core.js');
  ok(bc.indexOf("'core/22-dead-drop.js'") !== -1, 'G-06: 22-dead-drop.js in CORE_FILES');
  ok(fs.existsSync(path.join(ROOT, 'v1.4.3', 'core', '22-dead-drop.js')), 'G-06: module file exists');
}

/* G-07: operations-admin.js has the standard PF.skip kill switch. */
{
  var oa = read('v1.4.3/games/operations-admin.js');
  ok(/PF\.skip\(['"]allfronts_admin['"]\)/.test(oa), "G-07: PF.skip('allfronts_admin')");
  ok(oa.indexOf('indexOf(\'pf_off=allfronts_admin\')') === -1, 'G-07: hand-rolled URL check gone');
}

/* G-08: both prefs contracts documented as distinct (not unified). */
{
  var n1 = read('v1.4.3/games/notify.js');
  var n2 = read('v1.4.3/games/notify-prefs.js');
  ok(n1.indexOf('G-08 (2026-10-05)') !== -1, 'G-08: notify.js contract note present');
  ok(n2.indexOf('G-08 (2026-10-05)') !== -1, 'G-08: notify-prefs.js contract note present');
  ok(n1.indexOf('post("notify","n_action","notification_prefs"') !== -1, 'G-08: in-app contract intact');
  ok(n2.indexOf('post("notifyq","nq_action","notify_prefs"') !== -1, 'G-08: email contract intact');
}

/* G-11: war-bonds XP claim surface gone (delink: bonds grant 0 XP). */
{
  var wb = read('v1.4.3/games/war-bonds.js');
  ok(wb.indexOf('CLAIM BOND XP') === -1, 'G-11: claim button gone');
  ok(wb.indexOf('BOND XP CLAIMED') === -1, 'G-11: +N XP claim copy gone');
  ok(wb.indexOf('collect your bond XP') === -1, 'G-11: bond-XP collection copy gone');
  ok(wb.indexOf('they grant no XP') !== -1, 'G-11: honest 0-XP purchase copy present');
}

/* G-12: dead ?action=etch comment gone from source. */
{
  var dor = read('v1.4.3/games/daily-orders.js');
  ok(dor.indexOf('?action=etch') === -1, 'G-12: dead etch comment gone from daily-orders.js');
}

/* G-13: MANIFEST.md load order points at the bundle configs, not stale files. */
{
  var man = read('v1.4.3/MANIFEST.md');
  ok(man.indexOf('- JS `core/01-styles.css`') === -1, 'G-13: stale v1.3.0 load set gone');
  ok(man.indexOf('ARCHIVE NOTE (2026-10-05, G-13)') !== -1, 'G-13: history sections marked archival');
  ok(man.indexOf('build/bundle-core.js') !== -1, 'G-13: points at bundle-core.js as source of truth');
  ok(man.indexOf('22-dead-drop') !== -1, 'G-13: refreshed composition names 22-dead-drop');
}

console.log('== ' + pass + ' passed, ' + fail + ' failed ==');
process.exit(fail ? 1 : 0);
