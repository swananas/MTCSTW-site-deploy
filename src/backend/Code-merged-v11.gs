/* ============================================================================
 * SLR FAN VOTE BACKEND — Google Apps Script (MERGED v12, prepared 2026-10-01 — Vanguard Wall API + unknown-action POST guard)
 *
 * TARGET PROJECT: "SLR Fan Vote Backend" (script id 1omY63JuIChFzQLsp6xPkbKmhhVtD2L3lfvfTj96STmwLgegmcXZKf8m0)
 * DEPLOY AS: new version of the existing "Anyone" web-app deployment
 *            (AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec).
 *            Paste this ENTIRE file over Code.gs. No duplicate doPost/doGet.
 *
 * WHAT CHANGED in v13 vs the deployed v12 (prepared 2026-10-01 — Efficiency Index):
 *  1. NEW doGet branch: ?action=pageview&slug=x -> {ok:true} (fire-and-forget
 *     beacon from catalog pages; appends timestamp | slug to the new
 *     "pageviews" tab, created on first use).
 *  2. NEW doGet branch: ?action=pageview_totals&days=30[&callback=cb]
 *     -> {days, views:{slug:count}} (trailing N days, America/Chicago).
 *  3. NEW doGet branch: ?action=fan_history&weeks=2026-W40,2026-W39[&callback=cb]
 *     -> {weeks, fans:{slug:{votes, tipped}}} — weighted votes for the given
 *     ISO weeks + boost_tipped XP covering the same span. Powers the weekly
 *     Efficiency Index (games/efficiency.js). No PII: slugs only.
 *
 * WHAT CHANGED in v11 vs the deployed v10:
 *  1. NEW doGet branch: ?action=xp_today&callsign=X[&callback=cb]
 *     -> {ok, callsign, xp_today}: pool XP that callsign earned today
 *     (America/Chicago), counting ONLY pool-routed action_types (see
 *     POOL_TYPES). The site seeds each device's 50/day bucket from this so
 *     phone + laptop share one pool. Exempt bonuses (quiz, enlisted, weekly
 *     tasks) are excluded so they never shrink anyone's pool room.
 *  2. NEW doGet branches for Daily Orders cross-device sync (new economy —
 *     the client is the authority on capped XP and sends it as &gained=):
 *       ?action=get&callsign=X[&callback=cb]
 *       ?action=checkin&callsign=X&day=YYYY-MM-DD&mission=M&platform=P&gained=N[&callback=cb]
 *     -> {ok, callsign, xp, streak, last_day, today_done, today_platforms,
 *         op_done}: lifetime XP, cross-device streak, today's mission indexes.
 *     Check-ins are idempotent per (callsign, day, mission) under a script
 *     lock. New "checkins" tab: callsign | day | mission | platform |
 *     gained | timestamp. NOTE: the tally's pf-order-checkin rows already
 *     carry the XP — checkins rows carry NO separate XP total, so nothing is
 *     double-counted in xp_totals/xp_today.
 *
 * WHAT CHANGED in v10 vs the deployed v9:
 *  1. NEW doGet branch: ?action=cell_rename {callsign, device, name}
 *     -> renames the caller's cell. Founder-only (cell.founder must equal the
 *     caller callsign); name is sanitized to 3-24 chars. Returns the updated
 *     public cell object.
 *  2. Cells now report "verified": true once 2+ callsigns are attached —
 *     in the public cell object and on every leaderboard row. The frontend
 *     shows a VERIFIED badge on verified cells.
 *  3. ?action=cell_mine now also returns is_founder so the frontend can show
 *     the rename control to the founder only.
 *
 * WHAT CHANGED vs the deployed v6:
 *  1. doPost: action rows accept an optional 7th column "meta". The frontend
 *     sends meta="slug:tippedXP" on boost_tipped rows (Today's Boost). Older
 *     rows have no 7th column — reads treat it as "".
 *  2. NEW doGet branch: ?action=patron_totals[&callback=cb]
 *     -> {patrons:[{callsign, tipped, signal}]}: all-time top XP tippers,
 *     summed from boost_tipped rows (tipped XP parsed out of meta).
 *  3. NEW doGet branch: ?action=boost_totals[&callback=cb]
 *     -> {week, leaders:[{slug, tipped, signal}]}: per-creator tipped XP for
 *     the current Mon-Sun week (America/Chicago), for the weekly boost crown.
 *
 * PRESERVED EXACTLY: v6's device/callsign columns, user_totals, pts column,
 * task_totals, header repair, vote cast/retract (weights, floor-at-0),
 * action_totals, xp_totals, xp_today, JSONP callbacks, fire-and-forget POSTs.
 * NOTE: boost_tipped rows are stored with xp:0 so tipped XP is never
 * double-counted in xp_totals/xp_today — the tip amount lives only in meta.
 * ============================================================================
 *
 * Stores one row per vote: timestamp | week (YYYY-Www) | creator slug | weight.
 * Weight is 1 normally, 2 for COMMISSAR-tier voters (Enlistment Ranks unlock).
 * Results count weighted votes. Votes carry NO identity — anonymous by design.
 *
 * Also tracks site-wide actions: timestamp | action_type | xp | pts | device | callsign | meta.
 * Each game reports completions with the device id + callsign attached; the
 * unified site-global totals stay visible to everyone, and per-user totals are
 * available via ?action=user_totals. The optional 7th column "meta" carries
 * "slug:tippedXP" on boost_tipped rows (Today's Boost).
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
 *   GET  ?action=patron_totals&callback=cb          -> cb({patrons:[{callsign, tipped, signal}]}) (all-time top tippers)
 *   GET  ?action=boost_totals&callback=cb           -> cb({week, leaders:[{slug, tipped, signal}]}) (this week's per-creator tips, Chicago Mon-Sun)
 *   GET  ?action=pageview&slug=joman                 -> {ok:true} (catalog pageview beacon)
 *   GET  ?action=pageview_totals&days=30&callback=cb -> cb({days, views:{slug:count}})
 *   GET  ?action=fan_history&weeks=2026-W40,2026-W39&callback=cb
 *        -> cb({weeks, fans:{slug:{votes, tipped}}}) (Efficiency Index inputs)
 *
 * Retracts append a negative-weight row (same append-only model as votes).
 * Totals are floored at 0 so a retract can never drive a candidate negative
 * (e.g. if the original cast POST was lost offline).
 */
var SHEET_NAME = "votes";
var ACTIONS_SHEET = "actions"; /* verified 2026-10-01: live tab is lowercase "actions" */
var WALL_SHEET = "wall"; /* Vanguard Wall: etched callsigns, one row each (v12) */

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

/* Get the Vanguard Wall sheet, creating it with headers if missing (v12). */
function ensureWallSheet(ss) {
  var sheet = ss.getSheetByName(WALL_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(WALL_SHEET);
    sheet.appendRow(["timestamp", "callsign"]);
  }
  return sheet;
}

/* ================= DAILY XP POOL + ORDERS SYNC (v11) =================
 * The site caps daily-task XP at 50/day per comrade (core/00-bus.js
 * PF.DAILY_XP_CAP, America/Chicago day bucket). These endpoints let devices
 * share one pool and one Daily Orders state per callsign.
 *
 * POOL_TYPES: action_types that draw from the pool. Everything else the
 * tally records (quiz_done, enlisted, bracket_*, vote_cast, traitor_vote,
 * caption_submit, wb_buy, boost_tipped) is exempt or tally-only and is
 * EXCLUDED from the cross-device seed, so exempt bonuses never shrink
 * anyone's 50/day room.
 *
 * The "checkins" tab records Daily Orders completions for cross-device
 * state only: callsign | day | mission | platform | gained | timestamp.
 * It carries NO separate XP total — the tally's pf-order-checkin rows are
 * the single source of XP truth, so xp_totals/xp_today are never
 * double-counted. */
var CHECKINS_SHEET = "checkins";
var POOL_TYPES = { order_checkin: 1, raid_report: 1, guess_done: 1, poster_made: 1,
  drop_claimed: 1, billionaire_answered: 1, interrogation_answered: 1, share_image: 1,
  checkin: 1 };

function ensureCheckinsSheet(ss) {
  var sh = ss.getSheetByName(CHECKINS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CHECKINS_SHEET);
    sh.appendRow(["callsign", "day", "mission", "platform", "gained", "timestamp"]);
  }
  var want = ["callsign", "day", "mission", "platform", "gained", "timestamp"];
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < want.length; i++) {
    if (String(headers[i] || "") !== want[i]) sh.getRange(1, i + 1).setValue(want[i]);
  }
  /* Day column stays plain text: Sheets auto-converts "2026-10-01" to a Date
     on appendRow, which would break day-string comparisons downstream. */
  try { sh.getRange(2, 2, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat("@"); } catch (e) {}
  return sh;
}
/* Normalize a checkins day cell: Sheets may have stored it as a Date even
   with the "@" format above (rows written before the format was set). */
function checkinDayStr(v) {
  try {
    if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
      return Utilities.formatDate(v, "America/Chicago", "yyyy-MM-dd");
    }
  } catch (e) {}
  return String(v == null ? "" : v);
}
function normCs11(cs) { return String(cs || "").toLowerCase().trim().slice(0, 32); }
function shiftDayStr(dstr, off) {
  var p = String(dstr).split("-");
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
  d.setDate(d.getDate() + off);
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
/* Cross-device Daily Orders state for a callsign, derived from the checkins
 * tab. today_done holds mission indexes only — "field-op" is reported
 * separately as op_done so it can never inflate the 3-mission
 * FULL DEPLOYMENT count. Streak = consecutive Chicago days with >=1
 * check-in, ending today or yesterday. */
function ordersState11(ss, cs) {
  var st = { ok: true, callsign: cs, xp: 0, streak: 0, last_day: "",
             today_done: [], today_platforms: [], op_done: false };
  try {
    var sh = ensureCheckinsSheet(ss);
    var vals = sh.getDataRange().getValues();
    var today = chiDayStr(0), days = {};
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0] || "").toLowerCase() !== cs) continue;
      var d = checkinDayStr(vals[i][1]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      days[d] = 1;
      if (d === today) {
        var m = String(vals[i][2]);
        if (m === "field-op") { st.op_done = true; }
        else if (st.today_done.indexOf(m) < 0) {
          st.today_done.push(m);
          st.today_platforms.push(String(vals[i][3] || ""));
        }
      }
    }
    var keys = Object.keys(days).sort();
    if (keys.length) st.last_day = keys[keys.length - 1];
    if (st.last_day === today || st.last_day === shiftDayStr(today, -1)) {
      var c = st.last_day, n = 0;
      while (days[c]) { n++; c = shiftDayStr(c, -1); }
      st.streak = n;
    }
  } catch (e) {}
  return st;
}
/* Lifetime XP for a callsign: sum of the tally's per-action XP rows.
 * Used by the client for rank max-sync (client keeps the higher value). */
function lifetimeXp11(ss, cs) {
  var total = 0;
  try {
    var sh = ss.getSheetByName(ACTIONS_SHEET);
    if (!sh) return 0;
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][5] || "").toLowerCase() !== cs) continue;
      var v = Number(rows[i][2]);
      if (!isNaN(v) && v > 0) total += v;
    }
  } catch (e) {}
  return total;
}

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  /* Site-wide action tracking: one row per completed action. */
  if (d.type === "action" && d.action_type) {
    var sheet = ensureActionsSheet(SpreadsheetApp.getActiveSpreadsheet());
    var dev = String(d.device || "").slice(0, 64);
    var cs = String(d.callsign || "").slice(0, 64);
    sheet.appendRow([new Date(), String(d.action_type), Number(d.xp) || 0, Number(d.pts) || 0, dev, cs, String(d.meta || "").slice(0, 128)]);
    return jsonOut({ ok: true });
  }
  /* Vanguard Wall etch (v12): one row per callsign, etched once. */
  if (d.action === "wall" || d.action === "etch") {
    var wcs = String(d.callsign || "").toLowerCase().trim().slice(0, 32);
    if (wcs) {
      var wsh = ensureWallSheet(SpreadsheetApp.getActiveSpreadsheet());
      var seen = false;
      try {
        var wr = wsh.getDataRange().getValues();
        for (var wqi = 1; wqi < wr.length; wqi++) {
          if (String(wr[wqi][1]).toLowerCase() === wcs) { seen = true; break; }
        }
      } catch (we) {}
      if (!seen) wsh.appendRow([new Date(), wcs]);
    }
    return jsonOut({ ok: true });
  }
  /* Backend XP ledger (v1.4.3): idempotent XP grants mirrored from the
     device ledger. Contracts escrow and spend against these balances. */
  if (d.type === "xp" && d.xp_action === "grant") {
    var xg = xpGrant(SpreadsheetApp.getActiveSpreadsheet(),
      d.callsign, d.device, d.delta, d.key, d.reason);
    return jsonOut(xg);
  }
  /* Discord relay (v1.4.3): server-side forward to the webhook in Script Properties. */
  if (d.type === "discord" && d.d_action === "notify") {
    var dp = discordPing(String(d.kind || "").slice(0, 32), String(d.text || ""));
    return jsonOut({ ok: dp });
  }
  /* Mercenary contracts (v1.4.3): camps, contract board, escrow, payouts. */
  if (d.type === "contract" && d.c_action) {
    return contractDispatch(d.c_action, d, null);
  }
  /* Unknown actions are rejected — they must never fall through into the
   * fan-vote writer (that once polluted the vote sheet with junk rows). */
  if (d.action && d.action !== "retract") {
    return jsonOut({ ok: false, error: "unknown action: " + d.action });
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
  /* Raid turnout: raid_report rows stamped today (America/Chicago). */
  if (action === "raid_turnout") {
    var rcount = 0;
    var rtoday = "";
    try { rtoday = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd"); } catch (re) {}
    try {
      var rsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (rsheet) {
        var rrows = rsheet.getDataRange().getValues();
        for (var rgi = 1; rgi < rrows.length; rgi++) {
          if (String(rrows[rgi][1]) !== "raid_report") continue;
          var rday = "";
          try { rday = Utilities.formatDate(new Date(rrows[rgi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (re2) {}
          if (rday === rtoday) rcount++;
        }
      }
    } catch (re3) {}
    return jsonOut({ raiders: rcount }, cb);
  }
  /* Recruit count: distinct devices whose recruit_log row names this callsign
     as recruiter. Powers the +25 XP/recruit War Card promise (v1.4.3). */
  if (action === "recruit_count") {
    var rcount = 0;
    var rcs = String(e.parameter.callsign || "").toLowerCase().trim();
    try {
      var rsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (rsheet && rcs) {
        var rrows = rsheet.getDataRange().getValues();
        var rseen = {};
        for (var rqi = 1; rqi < rrows.length; rqi++) {
          if (String(rrows[rqi][1]) !== "recruit_log") continue;
          if (String(rrows[rqi][6] || "").toLowerCase().indexOf("recruiter:" + rcs) !== 0) continue;
          var rdev = String(rrows[rqi][4] || "");
          if (!rdev || rseen[rdev]) continue;
          rseen[rdev] = 1;
          rcount++;
        }
      }
    } catch (re4) {}
    return jsonOut({ recruits: rcount }, cb);
  }
  /* Backend XP balance (v1.4.3). */
  if (action === "xp_balance") {
    var xcs = String(e.parameter.callsign || "").toLowerCase().trim();
    var xbal = 0;
    try { xbal = xpBalanceOf(ensureXpSheet(ss), xcs); } catch (xe) {}
    return jsonOut({ balance: xbal }, cb);
  }
  /* Readable spend (v1.4.3): JSONP so the caller sees insufficient-funds.
     Mirrors use the fire-and-forget POST; spends need the verdict. */
  if (action === "xp_spend") {
    var sg = xpGrant(ss, e.parameter.callsign, e.parameter.device,
      -Math.abs(Math.round(Number(e.parameter.amount) || 0)),
      String(e.parameter.key || "").slice(0, 96), String(e.parameter.reason || "").slice(0, 128));
    return jsonOut(sg, cb);
  }
  /* Mercenary contracts: public board + per-callsign status (v1.4.3). */
  if (action === "contract_list") {
    return contractDispatch("contract_list", e.parameter || {}, cb);
  }
  if (action === "contract_mine") {
    return contractDispatch("contract_mine", e.parameter || {}, cb);
  }
  if (action === "contract_claim") {
    /* Claim is idempotent (payout row + xpGrant key), so a readable GET is safe. */
    return contractDispatch("contract_claim", e.parameter || {}, cb);
  }
  /* Bracket turnout: bracket_ballot rows over the trailing 7 Chicago days. */
  if (action === "bracket_turnout") {
    var bcount = 0;
    var bcut = "";
    try { bcut = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (be) {}
    try {
      var bsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (bsheet) {
        var brows = bsheet.getDataRange().getValues();
        for (var bgi = 1; bgi < brows.length; bgi++) {
          if (String(brows[bgi][1]) !== "bracket_ballot") continue;
          var bday = "";
          try { bday = Utilities.formatDate(new Date(brows[bgi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (be2) {}
          if (!bday || bday < bcut) continue;
          bcount++;
        }
      }
    } catch (be3) {}
    return jsonOut({ ballots: bcount }, cb);
  }
  /* Guess score stats: guess_scored rows over the trailing 7 Chicago days.
     Powers the Guess the Creator social-proof line ("2,140 plays, avg 3.2/5"). */
  if (action === "guess_stats") {
    var gplays = 0, gsum = 0;
    var gcut = "";
    try { gcut = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (ge) {}
    try {
      var gsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (gsheet) {
        var grows = gsheet.getDataRange().getValues();
        for (var gi = 1; gi < grows.length; gi++) {
          if (String(grows[gi][1]) !== "guess_scored") continue;
          var gday = "";
          try { gday = Utilities.formatDate(new Date(grows[gi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (ge2) {}
          if (!gday || gday < gcut) continue;
          var gm = String(grows[gi][6] || "");
          var gsc = gm.indexOf("score:") === 0 ? parseInt(gm.slice(6), 10) : NaN;
          gplays++;
          if (!isNaN(gsc) && gsc >= 0 && gsc <= 5) gsum += gsc;
        }
      }
    } catch (ge3) {}
    return jsonOut({ plays: gplays, avg: gplays ? Math.round(gsum / gplays * 10) / 10 : 0 }, cb);
  }
  /* Quiz tribe counts: quiz_done rows over the trailing 7 Chicago days,
     grouped by archetype from the meta column. Powers the SLR Match Quiz
     social-proof line ("2,314 comrades got AGITATOR this week"). */
  if (action === "quiz_tribes") {
    var tribes = {}, qtotal = 0;
    var qcut = "";
    try { qcut = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (qe) {}
    try {
      var qsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (qsheet) {
        var qrows = qsheet.getDataRange().getValues();
        for (var qi = 1; qi < qrows.length; qi++) {
          if (String(qrows[qi][1]) !== "quiz_done") continue;
          var qday = "";
          try { qday = Utilities.formatDate(new Date(qrows[qi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (qe2) {}
          if (!qday || qday < qcut) continue;
          var qm = String(qrows[qi][6] || "");
          var qarch = qm.indexOf("archetype:") === 0 ? qm.slice(10) : "unknown";
          tribes[qarch] = (tribes[qarch] || 0) + 1;
          qtotal++;
        }
      }
    } catch (qe3) {}
    return jsonOut({ total: qtotal, tribes: tribes }, cb);
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
  /* Today's Boost: all-time top XP tippers. Tipped amounts are parsed out of
   * the meta column ("slug:tippedXP") on boost_tipped rows. */
  if (action === "patron_totals") {
    var pmap = {};
    try {
      var psheet = ss.getSheetByName(ACTIONS_SHEET);
      if (psheet) {
        var prows = psheet.getDataRange().getValues();
        for (var pi = 1; pi < prows.length; pi++) {
          if (String(prows[pi][1]) !== "boost_tipped") continue;
          var pmeta = String(prows[pi][6] || "");
          var ptip = Number(pmeta.split(":")[1]) || 0;
          if (ptip <= 0) continue;
          var pcs = String(prows[pi][5] || "");
          var pdev = String(prows[pi][4] || "");
          var pkey = pcs || pdev || "anon";
          if (!pmap[pkey]) pmap[pkey] = { callsign: pcs || "ghost", tipped: 0 };
          pmap[pkey].tipped += ptip;
        }
      }
    } catch (err) {}
    var plist = Object.keys(pmap).map(function (k) {
      return { callsign: pmap[k].callsign, tipped: pmap[k].tipped, signal: pmap[k].tipped * 2 };
    });
    plist.sort(function (a, b) { return b.tipped - a.tipped; });
    return jsonOut({ patrons: plist.slice(0, 50) }, cb);
  }
  /* Today's Boost: per-creator tipped XP for the current Mon-Sun week
   * (America/Chicago), for the weekly most-boosted crown. */
  if (action === "boost_totals") {
    var cmap = {}, monStr = "";
    try {
      var isoDay = Number(Utilities.formatDate(new Date(), "America/Chicago", "u")); /* 1=Mon..7=Sun */
      var cp = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd").split("-");
      var monMs = Date.UTC(Number(cp[0]), Number(cp[1]) - 1, Number(cp[2])) - (isoDay - 1) * 86400000;
      monStr = Utilities.formatDate(new Date(monMs), "UTC", "yyyy-MM-dd");
      var bsheet = ss.getSheetByName(ACTIONS_SHEET);
      if (bsheet) {
        var brows = bsheet.getDataRange().getValues();
        for (var bi = 1; bi < brows.length; bi++) {
          if (String(brows[bi][1]) !== "boost_tipped") continue;
          var bday = "";
          try { bday = Utilities.formatDate(new Date(brows[bi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (e2) {}
          if (!bday || bday < monStr) continue;
          var bparts = String(brows[bi][6] || "").split(":");
          var bslug = bparts[0], btip = Number(bparts[1]) || 0;
          if (!bslug || btip <= 0) continue;
          if (!cmap[bslug]) cmap[bslug] = 0;
          cmap[bslug] += btip;
        }
      }
    } catch (err) {}
    var bleaders = Object.keys(cmap).map(function (s) {
      return { slug: s, tipped: cmap[s], signal: cmap[s] * 2 };
    });
    bleaders.sort(function (a, b) { return b.tipped - a.tipped; });
    return jsonOut({ week: monStr, leaders: bleaders }, cb);
  }
  /* v13: Efficiency Index support — data-driven propaganda scores.
   *   GET ?action=pageview&slug=x            -> {ok:true} (fire-and-forget beacon
   *      from catalog pages; logs timestamp | slug to the "pageviews" tab.
   *      One ping per slug per session is enforced client-side.)
   *   GET ?action=pageview_totals&days=30    -> {days, views:{slug:count}}
   *      (trailing N days, America/Chicago, clamped 1-90)
   *   GET ?action=fan_history&weeks=2026-W40,2026-W39
   *      -> {weeks:[...], fans:{slug:{votes, tipped}}} — weighted votes from the
   *      votes sheet for the given ISO weeks + boost_tipped XP from the actions
   *      sheet covering the same span (weeks*7 days back from today, Chicago).
   *   The frontend (games/efficiency.js) combines these with roster follower
   *   counts into the weekly Efficiency Index. No PII: slugs only. */
  if (action === "pageview" || action === "pageview_totals" || action === "fan_history") {
    var pvSheet = ss.getSheetByName("pageviews");
    if (!pvSheet) {
      pvSheet = ss.insertSheet("pageviews");
      pvSheet.appendRow(["timestamp", "slug"]);
    }
    if (action === "pageview") {
      var pslug = String(e.parameter.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
      if (pslug) pvSheet.appendRow([new Date(), pslug]);
      return jsonOut({ ok: true }, cb);
    }
    if (action === "pageview_totals") {
      var pdays = Math.max(1, Math.min(90, parseInt(e.parameter.days || "30", 10) || 30));
      var pcut = "";
      try { pcut = Utilities.formatDate(new Date(Date.now() - pdays * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (pe) {}
      var pviews = {};
      try {
        var pvrows = pvSheet.getDataRange().getValues();
        for (var pvi = 1; pvi < pvrows.length; pvi++) {
          var pday = "";
          try { pday = Utilities.formatDate(new Date(pvrows[pvi][0]), "America/Chicago", "yyyy-MM-dd"); } catch (pe2) {}
          if (!pday || pday < pcut) continue;
          var pvs = String(pvrows[pvi][1] || "");
          if (!pvs) continue;
          pviews[pvs] = (pviews[pvs] || 0) + 1;
        }
      } catch (pe3) {}
      return jsonOut({ days: pdays, views: pviews }, cb);
    }
    /* fan_history */
    var fweeks = String(e.parameter.weeks || "").split(",").map(function (w) { return w.trim(); })
      .filter(function (w) { return /^\d{4}-W\d{1,2}$/.test(w); }).slice(0, 12);
    var fcut = "";
    try { fcut = Utilities.formatDate(new Date(Date.now() - fweeks.length * 7 * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (fe) {}
    var fans = {};
    function facc(slug) { if (!fans[slug]) fans[slug] = { votes: 0, tipped: 0 }; return fans[slug]; }
    try {
      var vrows = ss.getSheetByName(SHEET_NAME).getDataRange().getValues();
      for (var fvi = 1; fvi < vrows.length; fvi++) {
        if (fweeks.indexOf(String(vrows[fvi][1])) < 0) continue;
        var fs = String(vrows[fvi][2] || "");
        if (!fs) continue;
        var fw = vrows[fvi].length > 3 ? (Number(vrows[fvi][3]) || 1) : 1;
        facc(fs).votes = Math.max(0, facc(fs).votes + fw);  /* floor at 0, like results */
      }
    } catch (fe2) {}
    try {
      var asheet = ss.getSheetByName(ACTIONS_SHEET);
      if (asheet) {
        var arows = asheet.getDataRange().getValues();
        for (var fai = 1; fai < arows.length; fai++) {
          if (String(arows[fai][1]) !== "boost_tipped") continue;
          var fday = "";
          try { fday = Utilities.formatDate(new Date(arows[fai][0]), "America/Chicago", "yyyy-MM-dd"); } catch (fe3) {}
          if (!fday || fday < fcut) continue;
          var fparts = String(arows[fai][6] || "").split(":");
          var fslug = fparts[0], ftip = Number(fparts[1]) || 0;
          if (!fslug || ftip <= 0) continue;
          facc(fslug).tipped += ftip;
        }
      }
    } catch (fe4) {}
    return jsonOut({ weeks: fweeks, fans: fans }, cb);
  }
  /* v13.1: INFIGHTING — real-time creator battle rounds.
   *   GET ?action=infight_fire&round=R&slug=S&amt=N&callsign=C -> {ok:true, logged:n}
   *      Logs one fire row (timestamp | round | slug | amt | callsign) to the
   *      "infight" tab (created on demand). Server enforces the per-callsign
   *      per-round cap (200): overshoot rows are clamped, never rejected, so a
   *      legit client racing the poll can't lose fire.
   *   GET ?action=infight_totals&round=R -> {round:R, totals:{slug:n}}
   *      Sums amt per slug for the round. No PII: slugs + callsign only. */
  var INFIGHT_SHEET = "infight", INFIGHT_CAP = 200;
  if (action === "infight_fire" || action === "infight_totals") {
    var ifSheet = ss.getSheetByName(INFIGHT_SHEET);
    if (!ifSheet) {
      ifSheet = ss.insertSheet(INFIGHT_SHEET);
      ifSheet.appendRow(["timestamp", "round", "slug", "amt", "callsign"]);
    }
    var iround = String(e.parameter.round || "").replace(/[^0-9-]/g, "").slice(0, 20);
    if (action === "infight_fire") {
      var islug = String(e.parameter.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
      var iamt = Math.max(1, Math.min(1000, parseInt(e.parameter.amt || "0", 10) || 0));
      var ics = String(e.parameter.callsign || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      var logged = 0;
      if (iround && islug && iamt > 0) {
        if (ics) {
          try {
            var irows = ifSheet.getDataRange().getValues(), used = 0;
            for (var ii = 1; ii < irows.length; ii++) {
              if (String(irows[ii][1]) === iround && String(irows[ii][4]) === ics) used += Number(irows[ii][3]) || 0;
            }
            iamt = Math.max(0, Math.min(iamt, INFIGHT_CAP - used));
          } catch (ie) {}
        }
        if (iamt > 0) { ifSheet.appendRow([new Date(), iround, islug, iamt, ics]); logged = iamt; }
      }
      return jsonOut({ ok: true, logged: logged }, cb);
    }
    /* infight_totals */
    var itot = {};
    try {
      var trows = ifSheet.getDataRange().getValues();
      for (var ti = 1; ti < trows.length; ti++) {
        if (String(trows[ti][1]) !== iround) continue;
        var ts = String(trows[ti][2] || "");
        if (!ts) continue;
        itot[ts] = (itot[ts] || 0) + (Number(trows[ti][3]) || 0);
      }
    } catch (ie2) {}
    return jsonOut({ round: iround, totals: itot }, cb);
  }
  /* v11: per-callsign pool XP today (America/Chicago) — the cross-device seed
   * for the 50/day bucket. Counts ONLY pool-routed action_types (POOL_TYPES)
   * so exempt bonuses never shrink anyone's pool room. Must come before the
   * site-wide xp_today branch. */
  if (action === "xp_today" && e.parameter.callsign) {
    var cs11 = normCs11(e.parameter.callsign);
    var todayChi11 = chiDayStr(0), xpT11 = 0;
    try {
      var sh11 = ss.getSheetByName(ACTIONS_SHEET);
      if (sh11 && cs11) {
        var r11 = sh11.getDataRange().getValues();
        for (var i11 = 1; i11 < r11.length; i11++) {
          if (String(r11[i11][5] || "").toLowerCase() !== cs11) continue;
          if (!POOL_TYPES[String(r11[i11][1] || "")]) continue;
          var d11 = "";
          try { d11 = Utilities.formatDate(new Date(r11[i11][0]), "America/Chicago", "yyyy-MM-dd"); } catch (e3) {}
          if (d11 !== todayChi11) continue;
          var v11 = Number(r11[i11][2]);
          if (!isNaN(v11) && v11 > 0) xpT11 += v11;
        }
      }
    } catch (err) {}
    return jsonOut({ ok: true, callsign: cs11, xp_today: xpT11 }, cb);
  }
  /* v11: Daily Orders cross-device state for a callsign (new economy — the
   * client sends its already-capped XP as &gained= and the backend records
   * idempotently; it never recomputes awards). */
  if (action === "get") {
    var gcs = normCs11(e.parameter.callsign);
    if (!gcs) return jsonOut({ ok: false, error: "bad_callsign" }, cb);
    var gst = ordersState11(ss, gcs);
    gst.xp = lifetimeXp11(ss, gcs);
    return jsonOut(gst, cb);
  }
  if (action === "checkin") {
    var ccs = normCs11(e.parameter.callsign);
    var cday = String(e.parameter.day || "");
    var cm = String(e.parameter.mission == null ? "" : e.parameter.mission);
    var cgained = Math.max(0, Math.floor(Number(e.parameter.gained) || 0));
    if (!ccs) return jsonOut({ ok: false, error: "bad_callsign" }, cb);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cday)) return jsonOut({ ok: false, error: "bad_day" }, cb);
    if (!cm) return jsonOut({ ok: false, error: "bad_mission" }, cb);
    var csh = ensureCheckinsSheet(ss);
    var clock = LockService.getScriptLock();
    try {
      clock.waitLock(10000);
      var cvals = csh.getDataRange().getValues(), cdup = false;
      for (var ci = 1; ci < cvals.length; ci++) {
        if (String(cvals[ci][0] || "").toLowerCase() === ccs &&
            checkinDayStr(cvals[ci][1]) === cday && String(cvals[ci][2]) === cm) { cdup = true; break; }
      }
      if (!cdup) csh.appendRow([ccs, cday, cm,
        String(e.parameter.platform || "").toLowerCase().slice(0, 16), cgained, new Date()]);
    } catch (e2) {} finally { try { clock.releaseLock(); } catch (e4) {} }
    var cst = ordersState11(ss, ccs);
    cst.xp = lifetimeXp11(ss, ccs);
    return jsonOut(cst, cb);
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
  /* CELLS — callsign squads: shared streaks, covers, recruit bounties, public
   * weekly leaderboard. All cell state lives here (cross-device by design);
   * the frontend only caches the display. Chainlink: up to 3 cells per
   * callsign, max 5 members per cell. */
  if (action === "cell_create" || action === "cell_join" || action === "cell_checkin" ||
      action === "cell_cover" || action === "cell_leave" || action === "cell_mine" ||
      action === "cell_bounty_claim" || action === "cell_leaderboard" ||
      action === "cell_rename" || action === "cell_links") {
    return cellDispatch(action, e.parameter, cb);
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
  /* Vanguard Wall (v12): public callsign wall for Enlistment Ranks unlocks.
   * GET ?action=wall (or etch, the Daily Orders alias) returns every etched
   * callsign so the wall is shared cross-device. */
  if (action === "wall" || action === "etch") {
    var wsheet = ensureWallSheet(ss);
    var wall = [];
    try {
      var wrows = wsheet.getDataRange().getValues();
      for (var wi = 1; wi < wrows.length; wi++) {
        var wcs = String(wrows[wi][1] || "").trim();
        if (wcs) wall.push({ callsign: wcs });
      }
    } catch (werr) {}
    return jsonOut({ wall: wall }, cb);
  }
  return jsonOut({ error: "unknown action: " + action });
}

/* ================= CELLS ENGINE (v10) =================
 * Callsign squads: shared streaks, weekly covers, recruit bounties, public
 * weekly leaderboard. All cell state lives server-side (cross-device by
 * design); the frontend only caches the display. One cell per callsign,
 * max 5 members. Day boundaries use America/Chicago, like the rest.
 * v10: founder-only cell_rename; cell "verified" badge when 2+ callsigns
 * are attached (custom name only counts once the cell is verified). */
var CELLS_SHEET = "cells";
var CELL_MEMBERS_SHEET = "cell_members";
var CELL_MAX = 5;
var CELL_BOUNTY_XP = 25;
var CHAINLINK_CAP = 3; /* v1.4.3: a callsign may wire up to 3 cells — chainlinks
   connect the network so every cell is reachable by direct contact. */

function ensureCellsSheets(ss) {
  var c = ss.getSheetByName(CELLS_SHEET);
  if (!c) {
    c = ss.insertSheet(CELLS_SHEET);
    c.appendRow(["cell_id", "name", "invite_code", "founder_callsign", "streak",
      "last_streak_day", "covers_used_week", "week_key", "created_day"]);
  }
  var m = ss.getSheetByName(CELL_MEMBERS_SHEET);
  if (!m) {
    m = ss.insertSheet(CELL_MEMBERS_SHEET);
    m.appendRow(["cell_id", "callsign", "device", "joined_day", "inviter_callsign",
      "first_checkin_done", "last_checkin_day", "bounty_claimed"]);
  }
  return { cells: c, members: m };
}
function chiDayStr(off) {
  try {
    var d = new Date(Date.now() + (off || 0) * 86400000);
    return Utilities.formatDate(d, "America/Chicago", "yyyy-MM-dd");
  } catch (e) { return ""; }
}
function chiMondayStr() {
  try {
    var iso = Number(Utilities.formatDate(new Date(), "America/Chicago", "u"));
    var p = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd").split("-");
    var ms = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) - (iso - 1) * 86400000;
    return Utilities.formatDate(new Date(ms), "UTC", "yyyy-MM-dd");
  } catch (e) { return ""; }
}
/* Sheets auto-converts "yyyy-MM-dd" strings to Date cells on write; normalize
 * them back to Chicago day strings on every read, or quorum/streak/cover
 * comparisons silently break (v8 bug, fixed v9). */
function dayStr(v) {
  try {
    if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime()))
      return Utilities.formatDate(v, "America/Chicago", "yyyy-MM-dd");
  } catch (e) {}
  return String(v || "");
}
/* --- pure logic (unit-tested in node against this file) --- */
function cellMult(streak) {
  streak = Number(streak) || 0;
  if (streak <= 0) return 1;
  return 1 + Math.min(streak, 10) * 0.05;
}
function cleanCellName(n) {
  n = String(n || "").replace(/[<>"'&`]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  return n.length >= 3 ? n : "";
}
function makeInviteCode() {
  var A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < 6; i++) s += A.charAt(Math.floor(Math.random() * A.length));
  return s;
}
/* Streak step: quorum = members who existed at the START of the day
 * (joined_day < day), plus everyone when the cell was created that day.
 * Returns {streak, day} when the quorum all checked in, else null. */
function cellQuorum(mems, day, createdDay) {
  return mems.filter(function (m) {
    var j = String(m.joined_day || "");
    return j < day || String(createdDay || "") === day;
  });
}
function cellStreakStep(streak, lastStreakDay, today, yesterday, allChecked) {
  if (!allChecked) return null;
  if (lastStreakDay === yesterday) return { streak: (Number(streak) || 0) + 1, day: today };
  if (lastStreakDay === today) return { streak: Number(streak) || 0, day: today };
  return { streak: 1, day: today };
}
/* A cell is VERIFIED when at least 2 callsigns are attached — the custom
 * name only earns its badge once the cell is real. Pure: unit-tested. */
function cellVerified(mems) { return (mems && mems.length || 0) >= 2; }
/* Cover: once per week per cell, saves yesterday when exactly one member
 * missed and the caller (who must have checked in yesterday) plays it. */
function coverEligible(coversUsedWeek, lastStreakDay, dayBeforeYesterday, missedCount, callerCheckedYest) {
  return (Number(coversUsedWeek) || 0) < 1 &&
    lastStreakDay === dayBeforeYesterday &&
    missedCount === 1 && !!callerCheckedYest;
}

function cellDispatch(action, p, cb) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ensureCellsSheets(ss);
  var cs = String(p.callsign || "").toLowerCase().trim().slice(0, 32);
  var dev = String(p.device || "").slice(0, 64);
  var today = chiDayStr(0), yest = chiDayStr(-1), dby = chiDayStr(-2), wk = chiMondayStr();

  function loadCells() {
    var v = sh.cells.getDataRange().getValues(), out = [];
    for (var i = 1; i < v.length; i++) out.push({
      _row: i + 1, id: String(v[i][0]), name: String(v[i][1]), code: String(v[i][2]),
      founder: String(v[i][3]), streak: Number(v[i][4]) || 0, last_day: String(v[i][5] || ""),
      covers: Number(v[i][6]) || 0, week: dayStr(v[i][7]), created_day: dayStr(v[i][8])
    });
    return out;
  }
  function loadMems() {
    var v = sh.members.getDataRange().getValues(), out = [];
    for (var i = 1; i < v.length; i++) out.push({
      _row: i + 1, cell_id: String(v[i][0]), callsign: String(v[i][1]),
      device: String(v[i][2]), joined_day: dayStr(v[i][3]),
      inviter: String(v[i][4] || ""), first_done: Number(v[i][5]) || 0,
      last_checkin: dayStr(v[i][6]), bounty_claimed: Number(v[i][7]) || 0
    });
    return out;
  }
  function findCell(cells, id) {
    for (var i = 0; i < cells.length; i++) if (cells[i].id === id) return cells[i];
    return null;
  }
  function findCellByCode(cells, code) {
    code = String(code || "").toUpperCase().trim();
    for (var i = 0; i < cells.length; i++) if (cells[i].code === code) return cells[i];
    return null;
  }
  function myMember(mems) {
    for (var i = 0; i < mems.length; i++) if (mems[i].callsign === cs) return mems[i];
    return null;
  }
  /* CHAINLINK: all memberships for this callsign. myMember (primary) is the
     first-joined; everything streak/multiplier-related stays on primary. */
  function myMembers(mems) {
    return mems.filter(function (m) { return m.callsign === cs; });
  }
  function memsOf(mems, id) { return mems.filter(function (m) { return m.cell_id === id; }); }
  function writeCell(c) {
    sh.cells.getRange(c._row, 5).setValue(c.streak);
    sh.cells.getRange(c._row, 6).setValue(c.last_day);
    sh.cells.getRange(c._row, 7).setValue(c.covers);
    sh.cells.getRange(c._row, 8).setValue(c.week);
  }
  function rollWeek(c) {
    if (c.week !== wk) { c.week = wk; c.covers = 0; writeCell(c); }
  }
  function pubCell(c, mems) {
    var act = mems.filter(function (m) { return String(m.last_checkin || "") >= wk; }).length;
    return { id: c.id, name: c.name, invite_code: c.code, streak: c.streak,
      mult: cellMult(c.streak), members: mems.length, active_week: act,
      verified: cellVerified(mems),
      covers_left: Math.max(0, 1 - (Number(c.covers) || 0)) };
  }

  var cells = loadCells(), mems = loadMems();

  /* Chainlink stats (v1.4.3, public): union-find over cells joined by shared
     members — how much of the network sits in one connected chain. */
  if (action === "cell_links") {
    var lkParent = {};
    cells.forEach(function (lc) { lkParent[lc.id] = lc.id; });
    function lkFind(x) { while (lkParent[x] !== x) { lkParent[x] = lkParent[lkParent[x]]; x = lkParent[x]; } return x; }
    function lkUnion(a, b) { a = lkFind(a); b = lkFind(b); if (a !== b) lkParent[a] = b; }
    var lkByCs = {};
    mems.forEach(function (lm) {
      if (!lkByCs[lm.callsign]) lkByCs[lm.callsign] = [];
      lkByCs[lm.callsign].push(lm.cell_id);
    });
    var lkLinks = 0;
    Object.keys(lkByCs).forEach(function (k) {
      var lst = lkByCs[k];
      if (lst.length >= 2) lkLinks++;
      for (var li = 1; li < lst.length; li++) lkUnion(lst[0], lst[li]);
    });
    var lkComp = {};
    cells.forEach(function (lc2) { var r = lkFind(lc2.id); lkComp[r] = (lkComp[r] || 0) + 1; });
    var lkBig = 0;
    Object.keys(lkComp).forEach(function (k2) { if (lkComp[k2] > lkBig) lkBig = lkComp[k2]; });
    return jsonOut({ chainlinkers: lkLinks, cells: cells.length, main_chain: lkBig,
      main_pct: cells.length ? Math.round(lkBig / cells.length * 100) : 0 }, cb);
  }

  /* Public weekly leaderboard — no callsign needed. */
  if (action === "cell_leaderboard") {
    var lb = cells.map(function (c) {
      var mm = memsOf(mems, c.id);
      return { name: c.name, streak: c.streak, members: mm.length,
        active_week: mm.filter(function (m) { return String(m.last_checkin || "") >= wk; }).length,
        verified: cellVerified(mm), founder: c.founder };
    });
    lb.sort(function (a, b) { return (b.streak - a.streak) || (b.active_week - a.active_week); });
    return jsonOut({ week: wk, cells: lb.slice(0, 10) }, cb);
  }

  if (action === "cell_create") {
    if (!cs) return jsonOut({ ok: false, err: "Claim a callsign first." }, cb);
    var name = cleanCellName(p.name);
    if (!name) return jsonOut({ ok: false, err: "Cell name needs 3-24 characters." }, cb);
    if (myMembers(mems).length >= CHAINLINK_CAP) return jsonOut({ ok: false, err: "Chainlink cap reached — you're already wiring " + CHAINLINK_CAP + " cells." }, cb);
    var code = makeInviteCode(), guard = 0;
    while (findCellByCode(cells, code) && guard++ < 20) code = makeInviteCode();
    var id = "c-" + Math.random().toString(36).slice(2, 10);
    sh.cells.appendRow([id, name, code, cs, 0, "", 0, wk, today]);
    sh.members.appendRow([id, cs, dev, today, "", 0, "", 0]);
    cells = loadCells(); mems = loadMems();
    var c0 = findCell(cells, id);
    return jsonOut({ ok: true, cell: pubCell(c0, memsOf(mems, id)) }, cb);
  }

  if (action === "cell_join") {
    if (!cs) return jsonOut({ ok: false, err: "Claim a callsign first." }, cb);
    var jMine = myMembers(mems);
    if (jMine.length >= CHAINLINK_CAP) return jsonOut({ ok: false, err: "Chainlink cap reached — you're already wiring " + CHAINLINK_CAP + " cells." }, cb);
    var jc = findCellByCode(cells, p.code);
    if (!jc) return jsonOut({ ok: false, err: "No cell found with that code." }, cb);
    for (var jji = 0; jji < jMine.length; jji++) if (jMine[jji].cell_id === jc.id) return jsonOut({ ok: false, err: "You're already in that cell." }, cb);
    var jm = memsOf(mems, jc.id);
    if (jm.length >= CELL_MAX) return jsonOut({ ok: false, err: "That cell is full (5/5)." }, cb);
    var ref = String(p.ref || "").toLowerCase().trim().slice(0, 32);
    if (ref === cs) ref = "";
    sh.members.appendRow([jc.id, cs, dev, today, ref, 0, "", 0]);
    mems = loadMems();
    return jsonOut({ ok: true, cell: pubCell(jc, memsOf(mems, jc.id)) }, cb);
  }

  var me = myMember(mems);
  if (!me) return jsonOut({ ok: true, in_cell: false }, cb);
  var cell = findCell(cells, me.cell_id);
  if (!cell) return jsonOut({ ok: true, in_cell: false }, cb);
  rollWeek(cell);
  var cmems = memsOf(mems, cell.id);

  if (action === "cell_checkin") {
    var wasAlready = (me.last_checkin === today);
    if (!wasAlready) {
      sh.members.getRange(me._row, 7).setValue(today);
      me.last_checkin = today;
      if (!me.first_done) { sh.members.getRange(me._row, 6).setValue(1); me.first_done = 1; }
    }
    var q = cellQuorum(cmems, today, cell.created_day);
    var all = q.length > 0 && q.every(function (m) { return m.last_checkin === today; });
    var step = cellStreakStep(cell.streak, cell.last_day, today, yest, all);
    if (step) { cell.streak = step.streak; cell.last_day = step.day; writeCell(cell); }
    return jsonOut({ ok: true, already: wasAlready, cell: pubCell(cell, cmems) }, cb);
  }

  if (action === "cell_cover") {
    var qy = cellQuorum(cmems, yest, cell.created_day);
    var missed = qy.filter(function (m) { return m.last_checkin !== yest; });
    if (!coverEligible(cell.covers, cell.last_day, dby, missed.length, me.last_checkin === yest))
      return jsonOut({ ok: false, err: "No cover to play right now." }, cb);
    cell.last_day = yest; cell.covers = (Number(cell.covers) || 0) + 1; writeCell(cell);
    return jsonOut({ ok: true, cell: pubCell(cell, cmems), covered: missed[0].callsign, streak: cell.streak }, cb);
  }

  if (action === "cell_leave") {
    /* Chainlink: leave one specific cell (cell_id) or default to primary. */
    var lvTarget = me, lvCell = cell;
    var lvId = String(p.cell_id || "");
    if (lvId) {
      lvTarget = null;
      var lvAll = myMembers(mems);
      for (var lvi = 0; lvi < lvAll.length; lvi++) if (lvAll[lvi].cell_id === lvId) lvTarget = lvAll[lvi];
      if (!lvTarget) return jsonOut({ ok: false, err: "Not in that cell." }, cb);
      lvCell = findCell(cells, lvId);
      if (!lvCell) return jsonOut({ ok: false, err: "Cell not found." }, cb);
    }
    sh.members.deleteRow(lvTarget._row);
    var rest = memsOf(mems, lvCell.id).filter(function (m) { return m.callsign !== cs; });
    if (rest.length === 0) {
      sh.cells.deleteRow(lvCell._row);
    } else if (lvCell.founder === cs) {
      rest.sort(function (a, b) { return String(a.joined_day) < String(b.joined_day) ? -1 : 1; });
      sh.cells.getRange(lvCell._row, 4).setValue(rest[0].callsign);
    }
    return jsonOut({ ok: true }, cb);
  }

  if (action === "cell_rename") {
    if (cell.founder !== cs) return jsonOut({ ok: false, err: "Only the founder can rename the cell." }, cb);
    var nm = cleanCellName(p.name);
    if (!nm) return jsonOut({ ok: false, err: "Cell name needs 3-24 characters." }, cb);
    sh.cells.getRange(cell._row, 2).setValue(nm);
    cell.name = nm;
    return jsonOut({ ok: true, cell: pubCell(cell, cmems) }, cb);
  }

  if (action === "cell_bounty_claim") {
    var claimed = [];
    for (var i = 0; i < mems.length; i++) {
      var bm = mems[i];
      if (bm.inviter === cs && bm.first_done && !bm.bounty_claimed) {
        sh.members.getRange(bm._row, 8).setValue(1);
        bm.bounty_claimed = 1;
        claimed.push({ from: bm.callsign, day: bm.joined_day });
      }
    }
    return jsonOut({ ok: true, claimed: claimed, xp_each: CELL_BOUNTY_XP }, cb);
  }

  /* cell_mine — full status for the panel. */
  var qy2 = cellQuorum(cmems, yest, cell.created_day);
  var missed2 = qy2.filter(function (m) { return m.last_checkin !== yest; });
  var coverFor = null;
  if (coverEligible(cell.covers, cell.last_day, dby, missed2.length, me.last_checkin === yest))
    coverFor = missed2[0].callsign;
  var pending = [];
  for (var k = 0; k < mems.length; k++) {
    var pm = mems[k];
    if (pm.inviter === cs && pm.first_done && !pm.bounty_claimed)
      pending.push({ from: pm.callsign, day: pm.joined_day });
  }
  return jsonOut({ ok: true, in_cell: true, cell: pubCell(cell, cmems),
    is_founder: cell.founder === cs,
    /* CHAINLINK: every cell this callsign wires (cap 3). Primary stays `cell`. */
    cells: myMembers(mems).map(function (mm) {
      var cc = findCell(cells, mm.cell_id);
      if (!cc) return null;
      var ccm = memsOf(mems, cc.id);
      return { id: cc.id, name: cc.name, invite_code: cc.code, streak: cc.streak,
        mult: cellMult(cc.streak), members: ccm.length, active_week: ccm.filter(function (m) { return String(m.last_checkin || "") >= wk; }).length,
        verified: cellVerified(ccm), is_founder: cc.founder === cs,
        checked_today: mm.last_checkin === today };
    }).filter(function (x) { return !!x; }),
    members: cmems.map(function (m) {
      return { callsign: m.callsign, checked_today: m.last_checkin === today, joined_day: m.joined_day };
    }),
    checked_today: me.last_checkin === today,
    cover_for: coverFor,
    bounties_pending: pending, bounty_xp: CELL_BOUNTY_XP }, cb);
}

/* ================= BACKEND XP LEDGER + MERCENARY CONTRACTS (v1.4.3) ================
   LAYERING: the device-local pf_ranks_v1 ledger stays the instant UX layer.
   core/11-xpledger.js mirrors every granted delta here with an idempotency
   key. Contracts escrow and pay out against these backend balances, so camp
   founders spend REAL XP they earned — the mercenary economy balances.
   Sheets:
     xp_ledger       [ts, callsign, device, delta, key, reason]
     camps           [callsign, name, created]
     contracts       [id, camp, founder, goal, target, bounty, status,
                      cell_id, cell_name, accepted_at, expires_at]
     contract_payouts[contract_id, callsign, paid_at]
   cells.camp (col 10, appended — loadCells ignores extra columns) records
   which camp a cell is pledged to. */
var XP_SHEET = "xp_ledger";
var CAMPS_SHEET = "camps";
var CONTRACTS_SHEET = "contracts";
var PAYOUTS_SHEET = "contract_payouts";
var CONTRACT_BOUNTY_MIN = 5, CONTRACT_BOUNTY_MAX = 25;
var CONTRACT_MAX_ACTIVE = 3;
var CONTRACT_DAYS = 7;

function ensureXpSheet(ss) {
  var s = ss.getSheetByName(XP_SHEET);
  if (!s) {
    s = ss.insertSheet(XP_SHEET);
    s.appendRow(["ts", "callsign", "device", "delta", "key", "reason"]);
  }
  return s;
}
function xpBalanceOf(s, cs) {
  var total = 0;
  try {
    var v = s.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][1]).toLowerCase() === cs) total += Number(v[i][3]) || 0;
    }
  } catch (e) {}
  return total;
}
function xpKeySeen(s, cs, key) {
  try {
    var v = s.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][1]).toLowerCase() === cs && String(v[i][4]) === key) return true;
    }
  } catch (e) {}
  return false;
}
/* Idempotent grant. Negative deltas are spends — rejected when the balance
   can't cover them. Every grant carries a caller-chosen key; replays of the
   same (callsign, key) return the existing balance without double-applying. */
function xpGrant(ss, cs, dev, delta, key, reason) {
  cs = String(cs || "").toLowerCase().trim().slice(0, 32);
  key = String(key || "").slice(0, 96);
  delta = Math.round(Number(delta) || 0);
  if (!cs || !key || !delta || Math.abs(delta) > 100000)
    return { ok: false, error: "bad grant" };
  var s = ensureXpSheet(ss);
  if (xpKeySeen(s, cs, key))
    return { ok: true, dup: true, balance: xpBalanceOf(s, cs) };
  var bal = xpBalanceOf(s, cs);
  if (delta < 0 && bal + delta < 0)
    return { ok: false, error: "insufficient XP" };
  s.appendRow([new Date(), cs, String(dev || "").slice(0, 64), delta, key,
    String(reason || "").slice(0, 128)]);
  return { ok: true, balance: bal + delta };
}

function ensureContractSheets(ss) {
  var c = ss.getSheetByName(CAMPS_SHEET);
  if (!c) { c = ss.insertSheet(CAMPS_SHEET); c.appendRow(["callsign", "name", "created"]); }
  var t = ss.getSheetByName(CONTRACTS_SHEET);
  if (!t) {
    t = ss.insertSheet(CONTRACTS_SHEET);
    t.appendRow(["id", "camp", "founder", "goal", "target", "bounty", "status",
      "cell_id", "cell_name", "accepted_at", "expires_at"]);
  }
  var p = ss.getSheetByName(PAYOUTS_SHEET);
  if (!p) { p = ss.insertSheet(PAYOUTS_SHEET); p.appendRow(["contract_id", "callsign", "paid_at"]); }
  return { camps: c, contracts: t, payouts: p };
}
function cleanCampName(n) {
  n = String(n || "").replace(/[^a-zA-Z0-9 '\-]/g, "").trim().slice(0, 24);
  return n.length >= 3 ? n : "";
}
var CONTRACT_GOALS = {
  share_raid:    { label: "SHARE RAID",   unit: "shares",  min: 5, max: 500 },
  recruit_drive: { label: "RECRUIT DRIVE", unit: "recruits", min: 1, max: 50 },
  perfect_week:  { label: "PERFECT WEEK", unit: "days",    min: 3, max: 7 }
};

/* Standalone cell/member loaders for the contracts module (cellDispatch
   keeps its own nested copies). */
function cxLoadCells(ss) {
  var sh = ensureCellsSheets(ss), v = sh.cells.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) out.push({
    _row: i + 1, id: String(v[i][0]), name: String(v[i][1]), founder: String(v[i][3]),
    camp: String(v[i][9] || "").toLowerCase()
  });
  return out;
}
function cxLoadMems(ss) {
  var sh = ensureCellsSheets(ss), v = sh.members.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) out.push({
    cell_id: String(v[i][0]), callsign: String(v[i][1]).toLowerCase()
  });
  return out;
}
function cxMemsOf(mems, id) {
  return mems.filter(function (m) { return m.cell_id === id; })
             .map(function (m) { return m.callsign; });
}

/* Goal verification against the actions sheet. progress >= target => done.
   actions columns: [ts, action, xp, pts, device, callsign, meta] */
function cxProgress(ss, ct, members) {
  var target = Number(ct.target) || 0, prog = 0;
  try {
    var sh = ensureActionsSheet(ss), v = sh.getDataRange().getValues();
    var since = 0;
    try { since = new Date(ct.accepted_at).getTime() || 0; } catch (e) {}
    var cut = "";
    try { cut = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), "America/Chicago", "yyyy-MM-dd"); } catch (e2) {}
    if (ct.goal === "share_raid") {
      for (var i = 1; i < v.length; i++) {
        if (String(v[i][1]) !== "share_image") continue;
        var ts = 0;
        try { ts = new Date(v[i][0]).getTime(); } catch (e3) {}
        if (ts < since) continue;
        if (members.indexOf(String(v[i][5]).toLowerCase()) >= 0) prog++;
      }
    } else if (ct.goal === "recruit_drive") {
      for (var j = 1; j < v.length; j++) {
        if (String(v[j][1]) !== "recruit_log") continue;
        var ts2 = 0;
        try { ts2 = new Date(v[j][0]).getTime(); } catch (e4) {}
        if (ts2 < since) continue;
        var meta = String(v[j][6] || "").toLowerCase();
        for (var k = 0; k < members.length; k++) {
          if (meta.indexOf("recruiter:" + members[k]) === 0) { prog++; break; }
        }
      }
    } else if (ct.goal === "perfect_week") {
      var per = {}, m;
      for (m = 0; m < members.length; m++) per[members[m]] = {};
      for (var q = 1; q < v.length; q++) {
        if (String(v[q][1]) !== "cell_checkin") continue;
        var d = "";
        try { d = Utilities.formatDate(new Date(v[q][0]), "America/Chicago", "yyyy-MM-dd"); } catch (e5) {}
        if (!d || d < cut) continue;
        var cm = String(v[q][5]).toLowerCase();
        if (per[cm]) per[cm][d] = 1;
      }
      prog = target;
      for (m = 0; m < members.length; m++) {
        var days = Object.keys(per[members[m]]).length;
        if (days < prog) prog = days;
      }
    }
  } catch (e6) {}
  return { progress: prog, target: target, done: prog >= target && target > 0 };
}

function contractDispatch(action, p, cb) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ensureContractSheets(ss);
  var cs = String(p.callsign || "").toLowerCase().trim().slice(0, 32);
  var dev = String(p.device || "").slice(0, 64);
  var nowMs = Date.now();

  function loadContracts() {
    var v = sh.contracts.getDataRange().getValues(), out = [];
    for (var i = 1; i < v.length; i++) out.push({
      _row: i + 1, id: String(v[i][0]), camp: String(v[i][1]), founder: String(v[i][2]),
      goal: String(v[i][3]), target: Number(v[i][4]) || 0, bounty: Number(v[i][5]) || 0,
      status: String(v[i][6]), cell_id: String(v[i][7]), cell_name: String(v[i][8]),
      accepted_at: String(v[i][9] || ""), expires_at: String(v[i][10] || "")
    });
    return out;
  }
  function findCamp(camps, name) {
    name = String(name || "").toLowerCase();
    for (var i = 1; i < camps.length; i++)
      if (String(camps[i][1]).toLowerCase() === name) return { _row: i + 1, name: String(camps[i][1]), founder: String(camps[i][0]).toLowerCase() };
    return null;
  }
  function myCamp(camps) {
    for (var i = 1; i < camps.length; i++)
      if (String(camps[i][0]).toLowerCase() === cs) return { _row: i + 1, name: String(camps[i][1]) };
    return null;
  }
  function setStatus(ct, st) {
    sh.contracts.getRange(ct._row, 7).setValue(st);
    ct.status = st;
  }
  /* Expire + verify sweep: runs on every read so the board is always honest. */
  function sweep(cts, cells, mems) {
    cts.forEach(function (ct) {
      if (ct.status !== "open" && ct.status !== "accepted") return;
      var exp = 0;
      try { exp = new Date(ct.expires_at).getTime(); } catch (e) {}
      if (exp && nowMs > exp) {
        if (ct.status === "accepted") {
          var mc = cxMemsOf(mems, ct.cell_id).length;
          xpGrant(ss, ct.founder, "", ct.bounty * mc, "contract_refund_" + ct.id, "contract expired — escrow refunded");
        }
        setStatus(ct, "expired");
        return;
      }
      if (ct.status === "accepted") {
        var pr = cxProgress(ss, ct, cxMemsOf(mems, ct.cell_id));
        if (pr.done) {
          setStatus(ct, "complete");
          try { discordPing("contract", "\u2705 CONTRACT COMPLETE: **" + ct.cell_name + "** cleared **" + ct.camp + "'s** " + ct.goal + " — payouts unlocked. Claim your XP: https://www.mtcstw.com/"); } catch (e) {}
        }
      }
    });
  }
  function pubContract(ct) {
    return { id: ct.id, camp: ct.camp, founder: ct.founder, goal: ct.goal,
      goal_label: (CONTRACT_GOALS[ct.goal] || {}).label || ct.goal,
      target: ct.target, bounty: ct.bounty, status: ct.status,
      cell_name: ct.cell_name, expires_at: ct.expires_at };
  }

  var camps = sh.camps.getDataRange().getValues();
  var cts = loadContracts();

  /* ---- public reads ---- */
  if (action === "contract_list" || action === "contract_mine") {
    var cells = cxLoadCells(ss), mems = cxLoadMems(ss);
    sweep(cts, cells, mems);
    var campRows = [];
    for (var ci = 1; ci < camps.length; ci++) {
      var cn = String(camps[ci][1]), pledged = cells.filter(function (c) { return c.camp === cn.toLowerCase(); });
      var headcount = 0;
      pledged.forEach(function (c) { headcount += cxMemsOf(mems, c.id).length; });
      campRows.push({ name: cn, founder: String(camps[ci][0]),
        cells: pledged.map(function (c) { return { id: c.id, name: c.name, members: cxMemsOf(mems, c.id).length }; }),
        members: headcount });
    }
    var open = cts.filter(function (t) { return t.status === "open" || t.status === "accepted"; }).map(pubContract);
    var recent = cts.filter(function (t) { return t.status === "complete"; }).slice(-5).map(pubContract);
    var out = { ok: true, camps: campRows, contracts: open.concat(recent) };
    if (action === "contract_mine" && cs) {
      var mine = cts.filter(function (t) { return t.founder === cs; }).map(pubContract);
      var myCells = [];
      mems.forEach(function (m) { if (m.callsign === cs && myCells.indexOf(m.cell_id) < 0) myCells.push(m.cell_id); });
      var claimable = [];
      cts.forEach(function (t) {
        if (t.status !== "complete" || !t.cell_id || myCells.indexOf(t.cell_id) < 0) return;
        var paid = false;
        try {
          var pv = sh.payouts.getDataRange().getValues();
          for (var pi = 1; pi < pv.length; pi++) {
            if (String(pv[pi][0]) === t.id && String(pv[pi][1]).toLowerCase() === cs) { paid = true; break; }
          }
        } catch (e) {}
        if (!paid) claimable.push({ id: t.id, bounty: t.bounty, camp: t.camp });
      });
      var bal = 0;
      try { bal = xpBalanceOf(ensureXpSheet(ss), cs); } catch (e2) {}
      out.mine = mine; out.claimable = claimable; out.balance = bal;
      out.my_camp = myCamp(camps);
      out.my_cells = myCells.map(function (id) {
        for (var q = 0; q < cells.length; q++)
          if (cells[q].id === id) return { id: id, name: cells[q].name, founder: cells[q].founder, camp: cells[q].camp };
        return { id: id };
      });
    }
    return jsonOut(out, cb);
  }

  if (!cs) return jsonOut({ ok: false, err: "Claim a callsign first." }, cb);

  /* ---- writes ---- */
  if (action === "camp_found") {
    if (myCamp(camps)) return jsonOut({ ok: false, err: "You already run a camp." }, cb);
    var nm = cleanCampName(p.name);
    if (!nm) return jsonOut({ ok: false, err: "Camp name needs 3-24 characters." }, cb);
    if (findCamp(camps, nm)) return jsonOut({ ok: false, err: "That camp name is taken." }, cb);
    sh.camps.appendRow([cs, nm, new Date()]);
    try { discordPing("camp", "\uD83C\uDF34 New camp founded: **" + nm + "** — cells, come get hired."); } catch (e) {}
    return jsonOut({ ok: true, camp: nm }, cb);
  }

  if (action === "camp_pledge") {
    var cells2 = cxLoadCells(ss), target2 = null;
    for (var q2 = 0; q2 < cells2.length; q2++) if (cells2[q2].id === String(p.cell_id)) target2 = cells2[q2];
    if (!target2) return jsonOut({ ok: false, err: "Cell not found." }, cb);
    if (target2.founder !== cs) return jsonOut({ ok: false, err: "Only the cell founder can pledge it." }, cb);
    var camp2 = findCamp(camps, p.camp);
    if (!camp2) return jsonOut({ ok: false, err: "Camp not found." }, cb);
    var col = sh.cells.getRange(target2._row, 10);
    col.setValue(camp2.name);
    return jsonOut({ ok: true, camp: camp2.name }, cb);
  }

  if (action === "contract_post") {
    var mcamp = myCamp(camps);
    if (!mcamp) return jsonOut({ ok: false, err: "Found a camp first." }, cb);
    var goal = String(p.goal || ""), gd = CONTRACT_GOALS[goal];
    if (!gd) return jsonOut({ ok: false, err: "Unknown goal." }, cb);
    var tgt = Math.round(Number(p.target) || 0), bnty = Math.round(Number(p.bounty) || 0);
    if (tgt < gd.min || tgt > gd.max) return jsonOut({ ok: false, err: gd.label + " needs " + gd.min + "-" + gd.max + " " + gd.unit + "." }, cb);
    if (bnty < CONTRACT_BOUNTY_MIN || bnty > CONTRACT_BOUNTY_MAX)
      return jsonOut({ ok: false, err: "Bounty must be " + CONTRACT_BOUNTY_MIN + "-" + CONTRACT_BOUNTY_MAX + " XP." }, cb);
    for (var i3 = 0; i3 < cts.length; i3++) {
      if (cts[i3].camp.toLowerCase() === mcamp.name.toLowerCase() &&
          (cts[i3].status === "open" || cts[i3].status === "accepted"))
        return jsonOut({ ok: false, err: "Your camp already has a live contract." }, cb);
    }
    var active = cts.filter(function (t) { return t.status === "open" || t.status === "accepted"; }).length;
    if (active >= CONTRACT_MAX_ACTIVE)
      return jsonOut({ ok: false, err: "The board is full (3 live contracts)." }, cb);
    var id = "cx-" + Math.random().toString(36).slice(2, 10);
    var exp = new Date(nowMs + CONTRACT_DAYS * 86400000);
    sh.contracts.appendRow([id, mcamp.name, cs, goal, tgt, bnty, "open", "", "", "", exp]);
    try {
      var gd2 = CONTRACT_GOALS[goal];
      discordPing("contract", "\uD83D\uDCDC NEW CONTRACT: **" + mcamp.name + "** offers **" + bnty + " XP** per member — " + gd2.label + " (" + tgt + " " + gd2.unit + "). Cells, come and get it: https://www.mtcstw.com/");
    } catch (e) {}
    return jsonOut({ ok: true, id: id }, cb);
  }

  if (action === "contract_accept") {
    var cts2 = loadContracts(), ct = null;
    for (var i4 = 0; i4 < cts2.length; i4++) if (cts2[i4].id === String(p.contract_id)) ct = cts2[i4];
    if (!ct || ct.status !== "open") return jsonOut({ ok: false, err: "Contract isn't open." }, cb);
    var exp2 = 0;
    try { exp2 = new Date(ct.expires_at).getTime(); } catch (e3) {}
    if (exp2 && nowMs > exp2) { setStatus(ct, "expired"); return jsonOut({ ok: false, err: "Contract expired." }, cb); }
    var cells3 = cxLoadCells(ss), mems3 = cxLoadMems(ss), cell3 = null;
    for (var q3 = 0; q3 < cells3.length; q3++) if (cells3[q3].id === String(p.cell_id)) cell3 = cells3[q3];
    if (!cell3) return jsonOut({ ok: false, err: "Cell not found." }, cb);
    if (cell3.founder !== cs) return jsonOut({ ok: false, err: "Only the cell founder can accept." }, cb);
    for (var i5 = 0; i5 < cts2.length; i5++) {
      if (cts2[i5].cell_id === cell3.id && (cts2[i5].status === "open" || cts2[i5].status === "accepted"))
        return jsonOut({ ok: false, err: "This cell already holds a contract." }, cb);
    }
    var nmems = cxMemsOf(mems3, cell3.id), escrow = ct.bounty * nmems.length;
    var g = xpGrant(ss, ct.founder, dev, -escrow, "contract_escrow_" + ct.id,
      "escrow: " + ct.bounty + " XP x " + nmems.length + " for " + cell3.name);
    if (!g.ok) return jsonOut({ ok: false, err: "Camp founder lacks the XP (" + escrow + " needed)." }, cb);
    sh.contracts.getRange(ct._row, 7).setValue("accepted");
    sh.contracts.getRange(ct._row, 8).setValue(cell3.id);
    sh.contracts.getRange(ct._row, 9).setValue(cell3.name);
    sh.contracts.getRange(ct._row, 10).setValue(new Date());
    try { discordPing("contract", "\u2694\uFE0F **" + cell3.name + "** accepted **" + ct.camp + "'s** contract — " + escrow + " XP escrowed. Go earn it."); } catch (e) {}
    return jsonOut({ ok: true, escrow: escrow }, cb);
  }

  if (action === "contract_cancel") {
    var cts4 = loadContracts(), ct4 = null;
    for (var i6 = 0; i6 < cts4.length; i6++) if (cts4[i6].id === String(p.contract_id)) ct4 = cts4[i6];
    if (!ct4 || ct4.founder !== cs) return jsonOut({ ok: false, err: "Not your contract." }, cb);
    if (ct4.status !== "open" && ct4.status !== "accepted")
      return jsonOut({ ok: false, err: "Contract is already settled." }, cb);
    if (ct4.status === "accepted") {
      var mems4 = cxLoadMems(ss), n4 = cxMemsOf(mems4, ct4.cell_id).length;
      xpGrant(ss, ct4.founder, dev, ct4.bounty * n4, "contract_refund_" + ct4.id, "contract cancelled — escrow refunded");
    }
    setStatus(ct4, "cancelled");
    return jsonOut({ ok: true }, cb);
  }

  if (action === "contract_claim") {
    var cts5 = loadContracts(), ct5 = null;
    for (var i7 = 0; i7 < cts5.length; i7++) if (cts5[i7].id === String(p.contract_id)) ct5 = cts5[i7];
    if (!ct5 || ct5.status !== "complete") return jsonOut({ ok: false, err: "Contract isn't complete." }, cb);
    var mems5 = cxLoadMems(ss), inCell = false;
    for (var i8 = 0; i8 < mems5.length; i8++)
      if (mems5[i8].cell_id === ct5.cell_id && mems5[i8].callsign === cs) inCell = true;
    if (!inCell) return jsonOut({ ok: false, err: "You're not on the contracted cell." }, cb);
    var paid5 = false;
    try {
      var pv5 = sh.payouts.getDataRange().getValues();
      for (var pi5 = 1; pi5 < pv5.length; pi5++) {
        if (String(pv5[pi5][0]) === ct5.id && String(pv5[pi5][1]).toLowerCase() === cs) { paid5 = true; break; }
      }
    } catch (e4) {}
    if (paid5) return jsonOut({ ok: false, err: "Already paid." }, cb);
    var g5 = xpGrant(ss, cs, dev, ct5.bounty, "contract_pay_" + ct5.id + "_" + cs,
      "mercenary payout: " + ct5.camp);
    if (!g5.ok) return jsonOut({ ok: false, err: "Payout failed." }, cb);
    sh.payouts.appendRow([ct5.id, cs, new Date()]);
    return jsonOut({ ok: true, bounty: ct5.bounty, balance: g5.balance }, cb);
  }

  return jsonOut({ ok: false, error: "unknown contract action" }, cb);
}

/* ================= DISCORD RELAY (v1.4.3) =================
   Server-side only. The webhook URL lives in Script Properties as
   DISCORD_WEBHOOK — never in code, never client-side. The site calls
   {type:"discord", d_action:"notify"} and this relays it. Server-side
   events (contracts, camps) ping directly. */
function discordPing(kind, content) {
  var url = "";
  try { url = PropertiesService.getScriptProperties().getProperty("DISCORD_WEBHOOK") || ""; } catch (e) {}
  if (!url || !kind || !content) return false;
  /* Throttle noisy kinds; rare events (contracts, camps) always go through. */
  var throttleMin = { detonation: 60, raid: 30 };
  var wait = (throttleMin[kind] || 0) * 60000;
  try {
    var props = PropertiesService.getScriptProperties();
    var lk = "discord_last_" + kind;
    var last = Number(props.getProperty(lk) || 0);
    if (wait && Date.now() - last < wait) return false;
    props.setProperty(lk, String(Date.now()));
  } catch (e2) {}
  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ content: String(content).slice(0, 1800) }),
      muteHttpExceptions: true
    });
    return true;
  } catch (e3) { return false; }
}
