'use strict';
/* tests/pledge-ballot-seed.cjs — shared fixture loader for the pledge-card
   tests. Parses the REAL ballot_info seed from the backend migration
   (feature/ballot-center, migrations/v76_ballot_center.sql) so every
   deadline asserted in tests is traceable to ballot data — never invented.

   The migration predates the live SC next-business-day roll (2026-10-05);
   fixtures used here (TX/CO/AK/MO) are unaffected by that fix. */
var cp = require('child_process');
var path = require('path');

var BE = path.join(process.env.HOME || '/home/hatch', 'workspace', 'mtcstw-api');

function seedSql() {
  var out = cp.execSync(
    'git -C ' + JSON.stringify(BE) +
    ' show feature/ballot-center:migrations/v76_ballot_center.sql',
    { stdio: ['ignore', 'pipe', 'pipe'] }
  ).toString('utf8');
  if (!/ballot_info/.test(out)) throw new Error('seed migration not found');
  return out;
}

var COLS = ['state', 'state_name', 'registration_deadline', 'early_voting_start',
  'early_voting_end', 'election_day', 'polling_place_url', 'ballot_info_url',
  'register_url', 'notes'];

function splitTuple(body) {
  /* Split on commas that are not inside single-quoted strings. */
  var parts = [], cur = '', inQ = false;
  for (var i = 0; i < body.length; i++) {
    var c = body[i];
    if (c === "'") {
      if (inQ && body[i + 1] === "'") { cur += "''"; i++; continue; }
      inQ = !inQ; cur += c; continue;
    }
    if (c === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function unq(s) {
  s = String(s).trim();
  if (s === 'NULL') return null;
  if (s[0] === "'" && s[s.length - 1] === "'")
    return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function parseSeed(sql) {
  var rows = {};
  var re = /\(([^\n]*?)\)[,;]/g, m;
  while ((m = re.exec(sql))) {
    var body = m[1];
    if (body.indexOf("'") !== 0 && body.trim().indexOf("'") !== 0) continue;
    var parts = splitTuple(body);
    if (parts.length !== COLS.length) continue;
    var row = {};
    for (var i = 0; i < COLS.length; i++) row[COLS[i]] = unq(parts[i]);
    if (row.state && /^[A-Z]{2}$/.test(row.state)) rows[row.state] = row;
  }
  return rows;
}

var CACHE = null;
function rows() {
  if (!CACHE) CACHE = parseSeed(seedSql());
  if (Object.keys(CACHE).length < 51)
    throw new Error('expected 51 ballot rows, got ' + Object.keys(CACHE).length);
  return CACHE;
}

module.exports = { rows: rows, ballotRow: function (code) { return rows()[code] || null; } };
