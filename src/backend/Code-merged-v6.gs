/* ============================================================================
 * SLR FAN VOTE BACKEND — Google Apps Script (MERGED v6, prepared 2026-10-01)
 *
 * TARGET PROJECT: "SLR Fan Vote Backend" (script id 1omY63JuIChFzQLsp6xPkbKmhhVtD2L3lfvfTj96STmwLgegmcXZKf8m0)
 * DEPLOY AS: new version of the existing "Anyone" web-app deployment
 *            (AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec).
 *            Paste this ENTIRE file over Code.gs. No duplicate doPost/doGet.
 *
 * WHAT CHANGED vs the deployed v5:
 *  1. actions sheet: adds 5th + 6th columns "device" and "callsign". Frontend
 *     v1.4.1 now POSTs both on every action report, so per-user rows key to
 *     the local device (pf_device_v1) and the user's callsign (pf_identity_v1).
 *  2. ensureActionsSheet(): repairs/adds headers for the 6-column layout on
 *     sheets written by older versions.
 *  3. NEW doGet branch: ?action=user_totals&device=<id> (or &callsign=<name>)
 *     -> {device, callsign, xp, pts, actions}: per-user totals. Votes stay
 *     anonymous by design — no identity is stored on vote rows.
 *
 * PRESERVED EXACTLY: v5's pts column, task_totals endpoint, header repair,
 * vote cast/retract (weights, floor-at-0), action_totals, xp_totals, JSONP
 * callbacks, fire-and-forget POST shapes.
 * ============================================================================
 *
 * Stores one row per vote: timestamp | week (YYYY-Www) | creator slug | weight.
 * Weight is 1 normally, 2 for COMMISSAR-tier voters (Enlistment Ranks unlock).
 * Results count weighted votes. Votes carry NO identity — anonymous by design.
 *
 * Also tracks site-wide actions: timestamp | action_type | xp | pts | device | callsign.
 * Each game reports completions with the device id + callsign attached; the
 * unified site-global totals stay visible to everyone, and per-user totals are
 * available via ?action=user_totals.
 *
 * Endpoints (web app URL):
 *   POST {"week":"2026-W40","slug":"joman","weight":2} -> {ok:true}   (vote; fire-and-forget)
 *   POST {"week":"2026-W40","slug":"joman","weight":2,"action":"retract"} -> {ok:true}
 *        (RESET VOTE: subtracts the voter's weight from that slug's total)
 *   POST {"type":"action","action_type":"daily_orders","device":"d-abc","callsign":"Ghost"} -> {ok:true}
 *        (site action; fire-and-forget; device/callsign optional)
 *   GET  ?action=results&week=2026-W40              -> {week, votes:{slug:weighted_count}}
 *   GET  ?action=results&week=2026-W40&callback=cb   -> cb({week, votes:{slug:weighted_count}}) (JSONP)
 *   GET  ?action=action_totals                      -> {total: N}
 *   GET  ?action=action_totals&callback=cb           -> cb({total: N}) (JSONP)
 *   GET  ?action=xp_totals                          -> {xp_total: N} (site-wide XP, media-nuke meter)
 *   GET  ?action=xp_today                           -> {ok:true, xp_today: N, comrades: M} (today's site-wide XP, Chicago day)
 *   GET  ?action=task_totals                        -> {total: N} (site-wide task points, do-meter)
 *   GET  ?action=user_totals&device=d-abc           -> {device, callsign, xp, pts, actions}
 *   GET  ?action=user_totals&callsign=Ghost&callback=cb -> cb({...}) (JSONP; callsign match is case-insensitive)
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
  var want = ["timestamp", "action_type", "xp", "pts", "device", "callsign"];
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
    var dev = String(d.device || "").slice(0, 64);
    var cs = String(d.callsign || "").slice(0, 64);
    sheet.appendRow([new Date(), String(d.action_type), Number(d.xp) || 0, Number(d.pts) || 0, dev, cs]);
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
  /* Per-user totals: rows keyed to a device id and/or callsign. Votes are
   * excluded — they stay anonymous by design. */
  if (action === "user_totals") {
    var qdev = String(e.parameter.device || "");
    var qcs = String(e.parameter.callsign || "").toLowerCase();
    var uxp = 0, upts = 0, uacts = 0, seenCs = "";
    try {
      var usheet = ss.getSheetByName(ACTIONS_SHEET);
      if (usheet) {
        var urows = usheet.getDataRange().getValues();
        for (var ui = 1; ui < urows.length; ui++) {
          var rdev = String(urows[ui][4] || "");
          var rcs = String(urows[ui][5] || "");
          var match = (qdev && rdev === qdev) || (qcs && rcs.toLowerCase() === qcs);
          if (!match) continue;
          uacts++;
          if (rcs && !seenCs) seenCs = rcs;
          var uxv = Number(urows[ui][2]);
          if (!isNaN(uxv) && uxv > 0) uxp += uxv;
          var upv = Number(urows[ui][3]);
          if ((isNaN(upv) || upv <= 0)) upv = Number(LEGACY_PTS[String(urows[ui][1])]) || 0;
          if (!isNaN(upv) && upv > 0) upts += upv;
        }
      }
    } catch (err) {}
    return jsonOut({ device: qdev, callsign: seenCs, xp: uxp, pts: upts, actions: uacts }, cb);
  }
  /* Media Nuke: today's site-wide XP plus the count of distinct devices that
     charged it. Day boundaries use America/Chicago, matching the site. */
  if (action === "xp_today") {
    var todayChi = "";
    try { todayChi = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd"); } catch (e2) {}
    var xpT = 0, comrades = {};
    try {
      var xsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (xsheet) {
        var xrows = xsheet.getDataRange().getValues();
        for (var xi = 1; xi < xrows.length; xi++) {
          var xd = "";
          try { xd = Utilities.formatDate(new Date(xrows[xi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (e3) {}
          if (!todayChi || xd !== todayChi) continue;
          var xv = Number(xrows[xi][2]);
          if (!isNaN(xv) && xv > 0) xpT += xv;
          var xdev = String(xrows[xi][4] || "");
          if (xdev) comrades[xdev] = 1;
        }
      }
    } catch (err) {}
    return jsonOut({ ok: true, xp_today: xpT, comrades: Object.keys(comrades).length }, cb);
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
