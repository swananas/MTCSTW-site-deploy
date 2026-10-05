/* GAP F-5 dual tally rails — frontend checks (2026-10-05).
   Run: node scripts/verify-gap-f5-fe.js
   Covers: bracket_ballot single rail (no direct POST, event carries ballot
   meta + dedupe key), 05-tally forwards dedupe_key/ballot meta,
   cell_checkin rails documented (no double rail in code). */
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

var pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

console.log('== gap F-5 frontend checks ==');

/* bracket_ballot: ONE rail — the DOM event. The direct no-cors POST is gone. */
{
  var bb = read('v1.4.3/games/bracket-board.js');
  ok(bb.indexOf('type:"action",action_type') === -1 &&
     bb.indexOf("type:'action',action_type") === -1,
     'bracket-board: no direct action POST remains');
  ok(bb.indexOf('pf-bracket-ballot') !== -1, 'bracket-board: event rail intact');
  ok(/dedupe\s*:\s*"bracket_ballot:"/.test(bb), 'bracket-board: event carries dedupe key');
  ok(/ballot\s*:\s*weekKey\(\)/.test(bb), 'bracket-board: event carries ballot meta');
}

/* 05-tally: forwards dedupe_key + ballot meta to the backend. */
{
  var t = read('v1.4.3/core/05-tally.js');
  ok(t.indexOf('dedupe_key') !== -1, '05-tally: report() sends dedupe_key');
  ok(t.indexOf('e.detail.dedupe') !== -1, '05-tally: reads detail.dedupe');
  ok(t.indexOf('e.detail.ballot') !== -1, '05-tally: reads detail.ballot into meta');
  ok((t.match(/report\(actionType, xp, PTS_DEFAULTS\[ev\]\|\|1, meta, dedupeKey\)/g) || []).length === 1,
     '05-tally: raw-event path passes dedupeKey');
}

/* cell_checkin: no double rail in code — pfReportAction is the tally rail
   (contracts perfect_week reads it); api() is the streak rail. Documented. */
{
  var c = read('v1.4.3/games/cells.js');
  ok(c.indexOf('dispatchEvent(new CustomEvent("pf-order-checkin"') === -1,
     'cells: never dispatches pf-order-checkin (no event-rail overlap)');
  ok((c.match(/pfReportAction\("cell_checkin"\)/g) || []).length === 2,
     'cells: exactly 2 pfReportAction("cell_checkin") calls (both annotated)');
  ok(c.indexOf('F-5 (2026-10-05): this tally rail STAYS') !== -1,
     'cells: load-bearing rail documented');
}

console.log('== ' + pass + ' passed, ' + fail + ' failed ==');
process.exit(fail ? 1 : 0);
