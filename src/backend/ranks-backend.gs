/* PFN RANKS BACKEND — Google Apps Script
 * Central store so Enlistment Ranks / Daily Orders XP follow a user across devices.
 * Sheet "ranks", one row per callsign:
 *   callsign | email | xp | streak | last_day | created | updated
 * Sheet "checkins", one row per mission check-in:
 *   callsign | day | mission_idx | platform | gained | timestamp
 * Sheet "wall", one row per etched architect:
 *   callsign | xp | etched
 * Deploy once (see files/hand-steps/ranks-backend-deploy.md), then never touch it.
 *
 * Callsigns: lowercase a-z, 0-9, underscore; 3-20 chars. First claim wins.
 * Email is optional; used later for rank-link recovery + Dispatch import.
 *
 * Economy (mirrors the widget): 3 missions/day, combo XP 10/15/20 per
 * consecutive check-in, +5 spread combo per share mission on a platform not
 * yet used that day, daily max 50 XP from missions, streak milestone
 * bonuses 3d:+10 / 7d:+25 / 30d:+100 on the first check-in of the day.
 *
 * Endpoints (web app URL). POSTs must use Content-Type: text/plain (simple
 * request — avoids CORS preflight, which Apps Script cannot answer).
 *   POST {"action":"register","callsign":"brick_504","email":"a@b.c"}
 *     -> {ok:true, fresh:true|false, xp, streak, last_day}
 *     -> {ok:false, error:"taken"}            (callsign claimed w/ different email)
 *     -> {ok:false, error:"bad_callsign"}
 *   POST {"action":"checkin","callsign":"brick_504","day":"2026-09-26","mission":0,"platform":"tiktok","spread":1}
 *     -> {ok:true, xp, streak, gained, combo, last_day, today_done:[...], today_platforms:[...], today_xp:n}
 *     -> {ok:false, error:"already"}          (mission already checked in today)
 *     -> {ok:false, error:"unknown"}          (callsign not registered)
 *   POST {"action":"wall","callsign":"brick_504"}
 *     -> {ok:true, etched:true}               (idempotent)
 *   GET  ?action=get&callsign=brick_504[&callback=cb]
 *     -> {ok:true, callsign, xp, streak, last_day, today_done:[...], today_platforms:[...], today_xp:n}
 *        (JSONP if callback given)
 *   GET  ?action=wall[&callback=cb]
 *     -> {ok:true, wall:[{callsign, xp, etched}, ...]}   (top 50 by xp)
 *   GET  ?action=nuke[&callback=cb]
 *     -> {ok:true, xp_today, comrades, day, goal}   (network-wide mission XP banked
 *        today, excluding streak bonuses; feeds the Media Nuke master tracker)
 */
var SHEET_RANKS = "ranks";
var SHEET_CHECKINS = "checkins";
var SHEET_WALL = "wall";
var SHEET_DEPLOYS = "deploys";
var BASE_XP = 10, COMBO_STEP = 5, DAILY_MAX = 50, PER_DAY = 3;
var MISSION_COUNT = 30;   /* must match MISSIONS.length in daily-orders.html */
var SPREAD_XP = 5;
var PLATFORMS = ["tiktok", "facebook", "instagram", "x", "youtube"];
var STREAK_BONUS = { "3": 10, "7": 25, "30": 100 };
var NUKE_GOAL = 50000;   /* master-tracker daily goal: 50k XP = ~1,000 comrades at
                            the 50 XP/day mission cap = the coordinated force that
                            can take a hashtag national and force press pickup */

function ranksSheet() {
  return SpreadsheetApp.openById('11c7ofDcBl9YW2BxDI0sRzHBYlAFj9qFLzh3chIanxAc').getSheetByName(SHEET_RANKS);
}
function checkinsSheet() {
  return SpreadsheetApp.openById('11c7ofDcBl9YW2BxDI0sRzHBYlAFj9qFLzh3chIanxAc').getSheetByName(SHEET_CHECKINS);
}
function wallSheet() {
  return SpreadsheetApp.openById('11c7ofDcBl9YW2BxDI0sRzHBYlAFj9qFLzh3chIanxAc').getSheetByName(SHEET_WALL);
}
function deploysSheet() {
  var ss = SpreadsheetApp.openById('11c7ofDcBl9YW2BxDI0sRzHBYlAFj9qFLzh3chIanxAc');
  var sh = ss.getSheetByName(SHEET_DEPLOYS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_DEPLOYS);
    sh.appendRow(["callsign", "week", "bonus", "timestamp"]);
  }
  return sh;
}
/* ISO week key YYYY-Www (Monday-start), matches widget */
function weekKey(d) {
  var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  var fday = (first.getUTCDay() + 6) % 7;
  first.setUTCDate(first.getUTCDate() - fday + 3);
  var w = 1 + Math.round((t - first) / (7 * 864e5));
  return t.getUTCFullYear() + "-W" + ("0" + w).slice(-2);
}

function normCallsign(c) {
  c = String(c || "").trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(c) ? c : "";
}

function dayStr(d) {
  return Utilities.formatDate(d, "America/Chicago", "yyyy-MM-dd");
}
function normDay(v){ if(Object.prototype.toString.call(v)==="[object Date]"&&!isNaN(v)) return dayStr(v); var s=String(v==null?"":v).trim(); return s.length>=10?s.substring(0,10):s; } function yesterdayStr() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return dayStr(d);
}

/* find row index (1-based, incl. header) for callsign, or -1 */
function findRow(sh, callsign) {
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).toLowerCase() === callsign) return i + 1;
  }
  return -1;
}

function rowToObj(sh, r) {
  var v = sh.getRange(r, 1, 1, 7).getValues()[0];
  return {
    ok: true, callsign: String(v[0]),
    xp: Number(v[2]) || 0, streak: Number(v[3]) || 0,
    last_day: String(v[4] || "")
  };
}

function out(obj, cb) {
  var payload = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + "(" + payload + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); }
  catch (err) { return out({ ok: false, error: "bad_json" }); }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (d.action === "register") return handleRegister(d);
    if (d.action === "checkin") return handleCheckin(d);
    if (d.action === "wall") return handleWall(d);
    return out({ ok: false, error: "bad_action" });
  } finally { lock.releaseLock(); }
}

function handleRegister(d) {
  var c = normCallsign(d.callsign);
  if (!c) return out({ ok: false, error: "bad_callsign" });
  var email = String(d.email || "").trim().toLowerCase();
  var sh = ranksSheet(), r = findRow(sh, c), now = new Date();
  if (r > 0) {
    var cur = sh.getRange(r, 1, 1, 7).getValues()[0];
    var storedEmail = String(cur[1] || "").toLowerCase();
    if (storedEmail && email && storedEmail !== email) {
      return out({ ok: false, error: "taken" });
    }
    if (!storedEmail && email) sh.getRange(r, 2).setValue(email);
    sh.getRange(r, 7).setValue(now);
    var o = rowToObj(sh, r); o.fresh = false; return out(o);
  }
  sh.appendRow([c, email, 0, 0, "", now, now]);
  return out({ ok: true, fresh: true, callsign: c, xp: 0, streak: 0, last_day: "", today_done: [] });
}

/* today's check-ins for a callsign: {done:[mission idx], platforms:[...], xp:mission xp earned today} */
function todayState(c, day) {
  var vals = checkinsSheet().getDataRange().getValues();
  var done = [], platforms = [], xp = 0;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).toLowerCase() === c && normDay(vals[i][1]) === day) {
      done.push(Number(vals[i][2]));
      platforms.push(String(vals[i][3] || ""));
      xp += Number(vals[i][4]) || 0;
    }
  }
  return { done: done, platforms: platforms, xp: xp };
}

function handleCheckin(d) {
  var c = normCallsign(d.callsign);
  if (!c) return out({ ok: false, error: "bad_callsign" });
  var day = String(d.day || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return out({ ok: false, error: "bad_day" });
  var mi = Number(d.mission);
  if (!(mi >= 0 && mi < MISSION_COUNT && Math.floor(mi) === mi)) return out({ ok: false, error: "bad_mission" });
  var plat = String(d.platform || "").toLowerCase();
  if (plat && PLATFORMS.indexOf(plat) < 0) return out({ ok: false, error: "bad_platform" });
  var sh = ranksSheet(), r = findRow(sh, c);
  if (r < 0) return out({ ok: false, error: "unknown" });
  var ts = todayState(c, day);
  if (ts.done.indexOf(mi) >= 0) return out({ ok: false, error: "already" });
  var combo = ts.done.length + 1;                    /* 1..3 */
  /* spread combo: widget claims it, backend verifies the platform is fresh today */
  var spread = (d.spread && plat && ts.platforms.indexOf(plat) < 0) ? SPREAD_XP : 0;
  var comboXp = BASE_XP + COMBO_STEP * (combo - 1);
  var room = Math.max(0, DAILY_MAX - ts.xp);         /* same 50 XP/day cap */
  var gained = Math.min(comboXp + spread, room);
  var cur = sh.getRange(r, 1, 1, 7).getValues()[0];
  var lastDay = String(cur[4] || ""), bonus = 0, streak = Number(cur[3]) || 0;
  if (ts.done.length === 0) {                        /* first check-in of the day */
    streak = (normDay(cur[4]) === yesterdayStr()) ? streak + 1 : 1;
    bonus = STREAK_BONUS[String(streak)] || 0;
    sh.getRange(r, 4).setValue(streak);
    sh.getRange(r, 5).setValue(day);
  }
  var xp = (Number(cur[2]) || 0) + gained + bonus;
  sh.getRange(r, 3).setValue(xp);
  sh.getRange(r, 7).setValue(new Date());
  checkinsSheet().appendRow([c, day, mi, plat, gained, new Date()]);
  ts.done.push(mi); ts.platforms.push(plat); ts.xp += gained;
  return out({ ok: true, callsign: c, xp: xp, streak: streak, gained: gained + bonus,
               bonus: bonus, spread: spread, combo: combo, last_day: day,
               today_done: ts.done, today_platforms: ts.platforms, today_xp: ts.xp });
}

function handleWall(d) {
  var c = normCallsign(d.callsign);
  if (!c) return out({ ok: false, error: "bad_callsign" });
  var sh = wallSheet(), r = findRow(sh, c);
  var ranksR = findRow(ranksSheet(), c);
  var xp = ranksR > 0 ? (Number(ranksSheet().getRange(ranksR, 3).getValue()) || 0) : 0;
  if (r < 0) {
    sh.appendRow([c, xp, new Date()]);
  } else {
    sh.getRange(r, 2).setValue(xp);
  }
  return out({ ok: true, etched: true, callsign: c });
}

/* FULL DEPLOYMENT: all 10 weekly medals -> +50 XP (once per week) + wall etch */
function handleDeploy(d) {
  var c = normCallsign(d.callsign);
  if (!c) return out({ ok: false, error: "bad_callsign" });
  var wk = weekKey(new Date());
  var sh = deploysSheet();
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).toLowerCase() === c && String(vals[i][1]) === wk) {
      return out({ ok: false, error: "already", week: wk });
    }
  }
  var rsh = ranksSheet(), r = findRow(rsh, c);
  if (r < 0) return out({ ok: false, error: "unknown" });
  var xp = (Number(rsh.getRange(r, 3).getValue()) || 0) + 50;
  rsh.getRange(r, 3).setValue(xp);
  rsh.getRange(r, 7).setValue(new Date());
  handleWall({ callsign: c });
  sh.appendRow([c, wk, 50, new Date()]);
  return out({ ok: true, callsign: c, xp: xp, week: wk, bonus: 50 });
}

function wallList() {
  var vals = wallSheet().getDataRange().getValues(), list = [];
  for (var i = 1; i < vals.length; i++) {
    list.push({ callsign: String(vals[i][0]), xp: Number(vals[i][1]) || 0,
                etched: String(vals[i][2] || "") });
  }
  list.sort(function(a, b) { return b.xp - a.xp; });
  return list.slice(0, 50);
}

/* network-wide XP banked today (mission XP only; streak bonuses excluded)
   for the Media Nuke master tracker */
function nukeStatus() {
  var today = dayStr(new Date());
  var vals = checkinsSheet().getDataRange().getValues();
  var xp = 0, who = {}, comrades = 0;
  for (var i = 1; i < vals.length; i++) {
    if (normDay(vals[i][1]) === today) {
      xp += Number(vals[i][4]) || 0;
      who[String(vals[i][0]).toLowerCase()] = 1;
    }
  }
  for (var k in who) { if (who.hasOwnProperty(k)) comrades++; }
  return { ok: true, xp_today: xp, comrades: comrades, day: today, goal: NUKE_GOAL,
           armed: xp >= NUKE_GOAL };
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback, a = String(p.action || "");
  if (a === "wall") return out({ ok: true, wall: wallList() }, cb);
  if (a === "nuke") return out(nukeStatus(), cb);
  if (a === "register" || a === "checkin" || a === "etch" || a === "deploy") {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var t;
      if (a === "register") t = handleRegister({ callsign: p.callsign, email: p.email });
      else if (a === "checkin") t = handleCheckin({ callsign: p.callsign, day: p.day, mission: p.mission, platform: p.platform, spread: p.spread });
      else if (a === "deploy") t = handleDeploy({ callsign: p.callsign });
      else t = handleWall({ callsign: p.callsign });
      return out(JSON.parse(t.getContent()), cb);
    } finally { lock.releaseLock(); }
  }
  if (a !== "get") return out({ ok: false, error: "bad_action" }, cb);
  var c = normCallsign(p.callsign);
  if (!c) return out({ ok: false, error: "bad_callsign" }, cb);
  var r = findRow(ranksSheet(), c);
  if (r < 0) return out({ ok: false, error: "unknown" }, cb);
  var o = rowToObj(ranksSheet(), r);
  var ts = todayState(c, dayStr(new Date()));
  o.today_done = ts.done;
  o.today_platforms = ts.platforms;
  o.today_xp = ts.xp;
  return out(o, cb);
}
