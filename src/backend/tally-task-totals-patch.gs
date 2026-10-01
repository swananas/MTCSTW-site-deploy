/* ============================================================================
   PF TALLY BACKEND PATCH — site-wide TASK total for the Do Meter
   ----------------------------------------------------------------------------
   WHERE: paste into the SAME Google Apps Script project that serves
   PF_BACKEND_URL (the tally script), then Deploy > New version.

   WHAT IT ADDS:
   1. doPost() now stores a 4th column, pts (do-meter task points, same unit
      as the Do Meter's local count). Rows posted by older frontend versions
      have no pts — they are mapped with LEGACY_PTS below.
   2. doGet() gains ?action=task_totals -> {total: <site-wide task points>}.
      The v1.4.1 Do Meter shows this as its headline "tasks complete" number
      and falls back to the local week count until this ships.

   MERGE NOTES:
   - If your project already has doPost/doGet, merge the marked sections
     instead of pasting the whole file twice (Apps Script forbids duplicate
     function names).
   - SHEET_NAME must match the tab where action rows are appended.
     Expected headers: Timestamp | action_type | xp | pts
     (add the "pts" header to column D if the tab already exists).
   ============================================================================ */

var SHEET_NAME = 'actions'; // verified 2026-10-01: live SLR Fan Votes tab is lowercase

/* Legacy frontend reported xp in the site-energy scale without pts.
   Map those action_types to do-meter task points so history stays balanced. */
var LEGACY_PTS = {
  'order_checkin': 1,
  'drop_claimed': 2,
  'caption_submit': 2,
  'poster_made': 2,
  'quiz_done': 1,
  'vote_cast': 1,
  'bracket_ballot': 1,
  'bracket_liquidated': 2,
  'traitor_vote': 1,
  'wb_buy': 5,
  'enlisted': 3,
  'billionaire_answered': 1,
  'interrogation_answered': 1,
  'share_image': 2
};

function pfTallySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.getSheets()[0];
  return sh;
}

function pfPtsFor_(actionType, xp, pts) {
  if (typeof pts === 'number' && pts > 0) return pts;
  if (LEGACY_PTS[actionType]) return LEGACY_PTS[actionType];
  return 1;
}

/* --- MERGE: add the pts column to your existing doPost append --- */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d && d.type === 'action') {
      var sh = pfTallySheet_();
      var pts = pfPtsFor_(d.action_type, d.xp, d.pts);
      sh.appendRow([new Date(), d.action_type || '', d.xp || 0, pts]);
    }
  } catch (err) {}
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}

/* --- MERGE: add the task_totals branch to your existing doGet --- */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var cb = (e && e.parameter && e.parameter.callback) || '';
  var out = {};
  if (action === 'task_totals') {
    out = { total: pfTaskTotal_() };
  }
  /* ... keep your existing branches (action_totals, xp_totals) here ... */
  var json = JSON.stringify(out);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function pfTaskTotal_() {
  try {
    var sh = pfTallySheet_();
    var vals = sh.getDataRange().getValues();
    if (vals.length < 2) return 0;
    var head = vals[0].map(function (h) { return String(h).toLowerCase(); });
    var iType = head.indexOf('action_type');
    var iXp = head.indexOf('xp');
    var iPts = head.indexOf('pts');
    var total = 0;
    for (var r = 1; r < vals.length; r++) {
      var row = vals[r];
      if (!row[iType]) continue;
      var pts = (iPts >= 0) ? row[iPts] : null;
      total += pfPtsFor_(String(row[iType]), (iXp >= 0 ? row[iXp] : 0), (typeof pts === 'number' ? pts : null));
    }
    return total;
  } catch (err) { return 0; }
}
