/* ============================================================================
 * SLR FAN VOTE BACKEND — Google Apps Script (MERGED v5, prepared 2026-10-01)
 *
 * TARGET PROJECT: "SLR Fan Vote Backend" (script id 1omY63JuIChFzQLsp6xPkbKmhhVtD2L3lfvfTj96STmwLgegmcXZKf8m0)
 * DEPLOY AS: new version of the existing "Anyone" web-app deployment
 *            (AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec).
 *            Paste this ENTIRE file over Code.gs. No duplicate doPost/doGet.
 *
 * WHAT CHANGED vs the deployed v4 (verified read-only 2026-10-01):
 *  1. actions sheet: adds a 4th column "pts" (do-meter task points). Frontend
 *     v1.4.1 already POSTs pts; v4 silently dropped it.
 *  2. ensureActionsSheet(): repairs headers on sheets created by older 2- or
 *     3-column versions (live sheet has timestamp/action_type only, C1 empty).
 *  3. NEW doGet branch: ?action=task_totals -> {total: N}, the site-global
 *     task-point total for the Do Meter. JSONP supported.
 *  4. Removed TWO unreachable duplicate `if (action === "xp_totals")` blocks.
 *  5. The fan-vote results fall-through is now guarded: it runs only for
 *     action=results (or no action), so unknown actions return an error
 *     instead of vote-shaped JSON.
 *
 * PRESERVED EXACTLY: vote cast/retract (weights, floor-at-0), action_totals,
 * xp_totals, JSONP callbacks, fire-and-forget POST shapes.
 * ============================================================================
 *
 * Stores one row per vote: timestamp | week (YYYY-Www) | creator slug | weight.
 * Weight is 1 normally, 2 for COMMISSAR-tier voters (Enlistment Ranks unlock).
 * Results count weighted votes.
 *
 * Also tracks site-wide actions: timestamp | action_type | xp | pts.
 * Each game reports completions; the unified total is visible to everyone.
 *
 * Endpoints (web app URL):
 *   POST {"week":"2026-W40","slug":"joman","weight":2} -> {ok:true}   (vote; fire-and-forget)
 *   POST {"week":"2026-W40","slug":"joman","weight":2,"action":"retract"} -> {ok:true}
 *        (RESET VOTE: subtracts the voter's weight from that slug's total)
 *   POST {"type":"action","action_type":"daily_orders"} -> {ok:true} (site action; fire-and-forget)
 *   GET  ?action=results&week=2026-W40              -> {week, votes:{slug:weighted_count}}
 *   GET  ?action=results&week=2026-W40&callback=cb   -> cb({week, votes:{slug:weighted_count}}) (JSONP)
 *   GET  ?action=action_totals                      -> {total: N}
 *   GET  ?action=action_totals&callback=cb           -> cb({total: N}) (JSONP)
 *   GET  ?action=xp_totals                          -> {xp_total: N} (site-wide XP, media-nuke meter)
 *   GET  ?action=task_totals                        -> {total: N} (site-wide task points, do-meter)
 *
 * Retracts append a negative-weight row (same append-only model as votes).
 * Totals are floored at 0 so a retract can never drive a candidate negative
 * (e.g. if the original cast POST was lost offline).
 */
var SHEET_NAME = "votes";
var ACTIONS_SHEET = "actions"; /* verified 2026-10-01: live tab is lowercase "actions" */

/* Legacy action_type -> task points, for rows written before the frontend
 * started sending pts (those rows have an empty pts cell). */
var LEGACY_PTS = {
  order_checkin: 15, drop_claimed: 10, caption_submit: 10, poster_made: 10,
  quiz_done: 10, vote_cast: 5, bracket_ballot: 10, bracket_liquidated: 10,
  traitor_vote: 5, wb_buy: 25, enlisted: 20, billionaire_answered: 10,
  interrogation_answered: 10, share_image: 5, guess_done: 10, raid_report: 15,
  /* older backend vocabulary observed in the live sheet */
  fan_vote: 5, daily_orders: 15, poster_forge: 10, enlistment: 20,
  bracket_liquidation: 10, quiz_complete: 10, bracket_vote: 5
};

function jsonOut(obj, callback) {
  var payload = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + payload + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

/* Get the actions sheet, creating it if missing and repairing headers on
 * sheets written by older 2-/3-column versions. */
function ensureActionsSheet(ss) {
  var sheet = ss.getSheetByName(ACTIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ACTIONS_SHEET);
    sheet.appendRow(["timestamp", "action_type", "xp", "pts"]);
    return sheet;
  }
  var want = ["timestamp", "action_type", "xp", "pts"];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < want.length; i++) {
    if (String(headers[i] || "") !== want[i]) {
      sheet.getRange(1, i + 1).setValue(want[i]); /* extends the sheet if needed */
    }
  }
  return sheet;
}

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  /* Site-wide action tracking: one row per completed action. */
  if (d.type === "action" && d.action_type) {
    var sheet = ensureActionsSheet(SpreadsheetApp.getActiveSpreadsheet());
    sheet.appendRow([new Date(), String(d.action_type), Number(d.xp) || 0, Number(d.pts) || 0]);
    return jsonOut({ ok: true });
  }
  /* Fan vote handling (existing). */
  var w = Math.min(2, Math.max(1, parseInt(d.weight, 10) || 1));
  if (d.action === "retract") w = -w;  /* RESET VOTE: subtract what the voter added */
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    .appendRow([new Date(), String(d.week), String(d.slug), w]);
  return jsonOut({ ok: true });
}

function sumColumn(sheet, colIndex, legacyMap) {
  var total = 0;
  try {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var v = Number(rows[i][colIndex]);
      if ((isNaN(v) || v <= 0) && legacyMap) {
        v = Number(legacyMap[String(rows[i][1])]) || 0; /* col B = action_type */
      }
      if (!isNaN(v) && v > 0) { total += v; }
    }
  } catch (err) {}
  return total;
}

function doGet(e) {
  var action = String(e.parameter.action || "");
  var cb = e.parameter.callback;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  /* Site-wide XP totals: sum of per-action XP for the media nuke meter. */
  if (action === "xp_totals") {
    var xsheet = ss.getSheetByName(ACTIONS_SHEET);
    return jsonOut({ xp_total: xsheet ? sumColumn(xsheet, 2) : 0 }, cb);
  }
  /* Site-wide task-point totals: sum of per-action pts for the do meter. */
  if (action === "task_totals") {
    var tsheet = ensureActionsSheet(ss);
    return jsonOut({ total: sumColumn(tsheet, 3, LEGACY_PTS) }, cb);
  }
  /* Site-wide action totals: single unified count for everyone. */
  if (action === "action_totals") {
    var total = 0;
    try {
      var asheet = ss.getSheetByName(ACTIONS_SHEET);
      if (asheet) { total = Math.max(0, asheet.getDataRange().getValues().length - 1); }
    } catch (err) {}
    return jsonOut({ total: total }, cb);
  }
  /* Fan vote results (existing). Guarded: only runs for action=results or no
   * action, so unknown actions no longer return vote-shaped JSON. */
  if (action === "results" || action === "") {
    var week = String(e.parameter.week || "");
    var rows = ss.getSheetByName(SHEET_NAME).getDataRange().getValues();
    var totals = {};
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) === week) {
        var s = String(rows[i][2]);
        var w = rows[i].length > 3 ? (Number(rows[i][3]) || 1) : 1;  /* old rows count as 1 */
        totals[s] = Math.max(0, (totals[s] || 0) + w);  /* floor at 0: retracts never go negative */
      }
    }
    return jsonOut({ week: week, votes: totals }, cb);
  }
  return jsonOut({ error: "unknown action: " + action });
}
