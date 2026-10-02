/* ================= WAR CHEST BANK + JOINT VENTURES (v1.4.4) =================
   STAGING — append to src/backend/Code-merged-v11.gs AFTER the v16
   (discord relay) deploy lands, then deploy as v17. Do NOT push this file
   on its own; it is merged into Code-merged-v11.gs.

   MERGE STEPS (do all three):
   1. In doPost(), after the contract dispatch block, add:
        if (d.type === "bank" && d.b_action) {
          return bankDispatch(d.b_action, d, null);
        }
   2. In doGet(), after the contract_claim block, add:
        if (action === "bank_status" || action === "bank_deposit" ||
            action === "bank_withdraw" || action === "venture_list" ||
            action === "venture_mine" || action === "venture_pledge" ||
            action === "venture_resolve") {
          return bankDispatchGet(action, e.parameter || {}, cb);
        }
   3. Append this entire file below the final discordPing function.

   BANK: personal XP savings. Overtime kicker (25% of daily XP beyond 60,
   cap 5+streak max 10/day), voluntary weekly deposits (40/wk, transferred
   from the spendable xp_ledger — never minted), lazy weekly interest
   (solo 2%; in-cell 3-7% scaled by the cell's credit score), free
   withdrawals that forfeit the week's interest on the withdrawn amount.

   CELL CREDIT SCORE (300-850): activity 40% / contracts 25% / recruits 15%
   / consistency 20%, trailing 7d. Best of the callsign's cells sets the rate.

   VENTURES: shareholder pools. Campaign (co-op, sponsor bounty prize) and
   Clash (PvP, winner takes the pot). Pledges lock BANKED xp in escrow;
   outcomes verified from the actions sheet like contracts. Shareholder
   votes can extend a funding window once at >50% of shares. */
var BANK_SHEET = "xp_bank";
var BANK_META_SHEET = "bank_meta";
var VENTURES_SHEET = "ventures";
var VENTURE_LEDGER_SHEET = "venture_ledger";
var VENTURE_VOTES_SHEET = "venture_votes";

var BANK_OT_THRESHOLD = 60;
var BANK_OT_RATE = 0.25;
var BANK_OT_BASE = 5;
var BANK_OT_MAX = 10;
var BANK_DEPOSIT_WEEK_CAP = 40;
var BANK_RATE_SOLO = 0.02;
var BANK_RATE_CELL_BASE = 0.03;
var BANK_RATE_CELL_RANGE = 0.04;
var BANK_INTEREST_CAP = 500;
var VENTURE_MIN_PLEDGE = 10;
var VENTURE_MAX_PLEDGE = 500;
var VENTURE_EARLYBIRD = 0.10;
var VENTURE_GOALS = { share_raid: 1, recruit_drive: 1 };

function ensureBankSheets(ss) {
  var b = ss.getSheetByName(BANK_SHEET);
  if (!b) { b = ss.insertSheet(BANK_SHEET); b.appendRow(["ts", "callsign", "device", "delta", "key", "kind", "note"]); }
  var m = ss.getSheetByName(BANK_META_SHEET);
  if (!m) { m = ss.insertSheet(BANK_META_SHEET); m.appendRow(["callsign", "last_accrual"]); }
  var v = ss.getSheetByName(VENTURES_SHEET);
  if (!v) {
    v = ss.insertSheet(VENTURES_SHEET);
    v.appendRow(["id", "name", "kind", "founder", "goal", "target", "sponsor_bounty",
      "created", "funding_deadline", "battle_days", "side_b", "resolved", "winner", "extended", "key"]);
  }
  var l = ss.getSheetByName(VENTURE_LEDGER_SHEET);
  if (!l) { l = ss.insertSheet(VENTURE_LEDGER_SHEET); l.appendRow(["ts", "venture_id", "callsign", "device", "shares", "xp", "side", "key", "note"]); }
  var t = ss.getSheetByName(VENTURE_VOTES_SHEET);
  if (!t) { t = ss.insertSheet(VENTURE_VOTES_SHEET); t.appendRow(["ts", "venture_id", "callsign", "proposal", "vote", "key"]); }
  return { bank: b, meta: m, ventures: v, ledger: l, votes: t };
}
function bankBalanceOf(ss, cs) {
  var total = 0;
  try {
    var v = ensureBankSheets(ss).bank.getDataRange().getValues();
    for (var i = 1; i < v.length; i++)
      if (String(v[i][1]).toLowerCase() === cs) total += Number(v[i][3]) || 0;
  } catch (e) {}
  return total;
}
function bankKeySeen(ss, cs, key) {
  try {
    var v = ensureBankSheets(ss).bank.getDataRange().getValues();
    for (var i = 1; i < v.length; i++)
      if (String(v[i][1]).toLowerCase() === cs && String(v[i][4]) === key) return true;
  } catch (e) {}
  return false;
}
/* Idempotent bank grant. Negative deltas rejected on overdraft. */
function bankGrant(ss, cs, dev, delta, key, kind, note) {
  cs = String(cs || "").toLowerCase().trim().slice(0, 32);
  key = String(key || "").slice(0, 96);
  delta = Math.round(Number(delta) || 0);
  if (!cs || !key || !delta || Math.abs(delta) > 100000) return { ok: false, error: "bad grant" };
  if (bankKeySeen(ss, cs, key)) return { ok: true, dup: true, balance: bankBalanceOf(ss, cs) };
  var bal = bankBalanceOf(ss, cs);
  if (delta < 0 && bal + delta < 0) return { ok: false, error: "insufficient bank balance" };
  ensureBankSheets(ss).bank.appendRow([new Date(), cs, String(dev || "").slice(0, 64), delta, key,
    String(kind || "").slice(0, 24), String(note || "").slice(0, 128)]);
  return { ok: true, balance: bal + delta };
}
function bankSumKind(ss, cs, kind, sinceMs) {
  var total = 0;
  try {
    var v = ensureBankSheets(ss).bank.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][1]).toLowerCase() !== cs || String(v[i][5]) !== kind) continue;
      if (sinceMs) { var ts = 0; try { ts = new Date(v[i][0]).getTime(); } catch (e) {} if (ts < sinceMs) continue; }
      total += Math.max(0, Number(v[i][3]) || 0);
    }
  } catch (e) {}
  return total;
}
function chiMondayStr() {
  var chi = "";
  try { chi = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd"); } catch (e) { return ""; }
  var d = new Date(Number(chi.slice(0, 4)), Number(chi.slice(5, 7)) - 1, Number(chi.slice(8, 10)), 12);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
/* Cell credit score 300-850: activity 40 / contracts 25 / recruits 15 /
   consistency 20, trailing 7d Chicago. Best of the callsign's cells wins. */
function creditScoreFor(ss, cellId, members) {
  var dayMs = 86400000, nowMs = Date.now(), i;
  var perMem = {};
  for (i = 0; i < members.length; i++) perMem[members[i]] = {};
  var recruits = 0;
  try {
    var v = ensureActionsSheet(ss).getDataRange().getValues();
    for (i = 1; i < v.length; i++) {
      var mcs = String(v[i][5] || "").toLowerCase();
      if (!perMem.hasOwnProperty(mcs)) continue;
      var ts = 0; try { ts = new Date(v[i][0]).getTime(); } catch (e) {}
      if (!ts || nowMs - ts > 7 * dayMs) continue;
      var ds = ""; try { ds = Utilities.formatDate(new Date(ts), "America/Chicago", "yyyy-MM-dd"); } catch (e2) {}
      if (ds) perMem[mcs][ds] = 1;
      if (String(v[i][1]) === "recruit_log") recruits++;
    }
  } catch (e3) {}
  var active3 = 0, totDays = 0;
  for (i = 0; i < members.length; i++) {
    var n = Object.keys(perMem[members[i]]).length; totDays += n; if (n >= 3) active3++;
  }
  var activity = members.length ? active3 / members.length : 0;
  var consistency = members.length ? Math.min(1, (totDays / members.length) / 5) : 0;
  var rec = Math.min(1, recruits / 5);
  var comp = 0;
  try {
    var cv = ss.getSheetByName(CONTRACTS_SHEET).getDataRange().getValues();
    for (var j = 1; j < cv.length; j++) {
      if (String(cv[j][7]) !== cellId || String(cv[j][6]) !== "complete") continue;
      var cts = 0; try { cts = new Date(cv[j][9]).getTime(); } catch (e4) {}
      if (cts && nowMs - cts < 30 * dayMs) comp++;
    }
  } catch (e5) {}
  var contracts = Math.min(1, comp / 2);
  var w = 0.40 * activity + 0.25 * contracts + 0.15 * rec + 0.20 * consistency;
  return { score: Math.round(300 + 550 * w),
    parts: { activity: +activity.toFixed(2), contracts: +contracts.toFixed(2), recruits: +rec.toFixed(2), consistency: +consistency.toFixed(2) } };
}
function cellCredit(ss, cs) {
  try {
    var mems = cxLoadMems(ss), my = {}, i;
    for (i = 0; i < mems.length; i++) if (mems[i].callsign === cs) my[mems[i].cell_id] = 1;
    var ids = Object.keys(my);
    if (!ids.length) return null;
    var cells = cxLoadCells(ss), best = null;
    for (i = 0; i < ids.length; i++) {
      var members = cxMemsOf(mems, ids[i]);
      if (!members.length) continue;
      var s = creditScoreFor(ss, ids[i], members), nm = ids[i];
      for (var c = 0; c < cells.length; c++) if (cells[c].id === ids[i]) { nm = cells[c].name; break; }
      if (!best || s.score > best.score)
        best = { score: s.score, cell_id: ids[i], cell_name: nm, parts: s.parts };
    }
    return best;
  } catch (e) { return null; }
}
/* Lazy weekly interest: full 7-day periods since last_accrual. */
function accrueInterest(ss, cs) {
  var sh = ensureBankSheets(ss).meta, found = -1, last = 0, i;
  try {
    var rows = sh.getDataRange().getValues();
    for (i = 1; i < rows.length; i++)
      if (String(rows[i][0]).toLowerCase() === cs) { found = i + 1; last = Number(rows[i][1]) || 0; break; }
  } catch (e) {}
  var nowMs = Date.now();
  if (!last) {
    if (found > 0) sh.getRange(found, 2).setValue(nowMs); else sh.appendRow([cs, nowMs]);
    return { paid: 0 };
  }
  var weeks = Math.floor((nowMs - last) / (7 * 86400000));
  if (weeks < 1) return { paid: 0, next: last + 7 * 86400000 };
  var bal = bankBalanceOf(ss, cs);
  if (bal <= 0) { sh.getRange(found, 2).setValue(last + weeks * 7 * 86400000); return { paid: 0 }; }
  var credit = cellCredit(ss, cs);
  var rate = credit ? BANK_RATE_CELL_BASE + BANK_RATE_CELL_RANGE * (credit.score - 300) / 550 : BANK_RATE_SOLO;
  var interest = Math.floor(Math.min(bal, BANK_INTEREST_CAP) * rate * weeks);
  if (interest > 0)
    bankGrant(ss, cs, "", interest, "interest:" + cs + ":" + Math.floor(last / 604800000), "interest",
      "weekly " + Math.round(rate * 1000) / 10 + "%");
  sh.getRange(found, 2).setValue(last + weeks * 7 * 86400000);
  return { paid: interest, rate: rate, next: last + weeks * 7 * 86400000 };
}
function bankHistory(ss, cs, n) {
  var out = [];
  try {
    var v = ensureBankSheets(ss).bank.getDataRange().getValues();
    for (var i = v.length - 1; i >= 1 && out.length < (n || 12); i--) {
      if (String(v[i][1]).toLowerCase() !== cs) continue;
      out.push({ ts: new Date(v[i][0]).getTime(), delta: Number(v[i][3]) || 0, kind: String(v[i][5]), note: String(v[i][6] || "") });
    }
  } catch (e) {}
  return out;
}
function bankStatus(ss, cs) {
  cs = String(cs || "").toLowerCase().trim().slice(0, 32);
  if (!cs) return { ok: false, err: "callsign required" };
  var acc = accrueInterest(ss, cs);
  var credit = cellCredit(ss, cs);
  var rate = credit ? BANK_RATE_CELL_BASE + BANK_RATE_CELL_RANGE * (credit.score - 300) / 550 : BANK_RATE_SOLO;
  var today = ""; try { today = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd"); } catch (e) {}
  var dayStart = 0;
  try { dayStart = new Date(today + "T00:00:00-05:00").getTime(); } catch (e2) {}
  var monday = chiMondayStr(), monStart = 0;
  try { monStart = new Date(monday + "T00:00:00-05:00").getTime(); } catch (e3) {}
  var streak = 0;
  try { streak = ordersState11(ss, cs).streak || 0; } catch (e4) {}
  return {
    ok: true, balance: bankBalanceOf(ss, cs),
    rate: +rate.toFixed(4), rate_pct: Math.round(rate * 1000) / 10,
    credit: credit, interest_paid: acc.paid || 0, next_payout: acc.next || 0,
    overtime_today: bankSumKind(ss, cs, "overtime", dayStart),
    overtime_cap: Math.min(BANK_OT_MAX, BANK_OT_BASE + Math.min(streak, BANK_OT_MAX - BANK_OT_BASE)),
    streak: streak,
    deposit_week_used: bankSumKind(ss, cs, "deposit", monStart),
    deposit_week_cap: BANK_DEPOSIT_WEEK_CAP,
    history: bankHistory(ss, cs, 12)
  };
}
/* Shared transfer logic: deposit moves spendable XP -> bank, withdraw the
   reverse. Used by both POST and JSONP-GET callers. */
function bankTransfer(ss, cs, dev, amount, key, isDeposit) {
  cs = String(cs || "").toLowerCase().trim().slice(0, 32);
  key = String(key || "").slice(0, 96);
  var a = Math.min(100000, Math.max(1, Math.round(Number(amount) || 0)));
  if (!cs || !key || !a) return { ok: false, err: "bad transfer" };
  if (isDeposit) {
    var monday = chiMondayStr(), monStart = 0;
    try { monStart = new Date(monday + "T00:00:00-05:00").getTime(); } catch (e) {}
    if (bankSumKind(ss, cs, "deposit", monStart) + a > BANK_DEPOSIT_WEEK_CAP)
      return { ok: false, err: "weekly deposit cap reached" };
    var sp = xpGrant(ss, cs, dev, -a, "bank:dep:" + key, "war chest deposit");
    if (!sp.ok) return { ok: false, err: sp.error || "insufficient XP" };
    var g = bankGrant(ss, cs, dev, a, "dep:" + key, "deposit", "weekly deposit");
    return { ok: g.ok, balance: g.balance, err: g.error };
  }
  var w = bankGrant(ss, cs, dev, -a, "wd:" + key, "withdraw", "withdrawal");
  if (!w.ok) return { ok: false, err: w.error || "insufficient bank balance" };
  xpGrant(ss, cs, dev, a, "bank:wd:" + key, "war chest withdrawal");
  return { ok: true, balance: w.balance };
}
/* POST bank actions (fire-and-forget). */
function bankDispatch(action, d, cb) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cs = String(d.callsign || "").toLowerCase().trim().slice(0, 32);
  var dev = String(d.device || "").slice(0, 64);
  var key = String(d.key || "").slice(0, 96);
  if (action === "overtime") {
    if (!cs || !key) return jsonOut({ ok: false }, cb);
    var amt = Math.min(50, Math.max(1, Math.round(Number(d.amount) || 0)));
    var today = ""; try { today = Utilities.formatDate(new Date(), "America/Chicago", "yyyy-MM-dd"); } catch (e) {}
    var dayStart = 0; try { dayStart = new Date(today + "T00:00:00-05:00").getTime(); } catch (e2) {}
    var streak = 0; try { streak = ordersState11(ss, cs).streak || 0; } catch (e3) {}
    var cap = Math.min(BANK_OT_MAX, BANK_OT_BASE + Math.min(streak, BANK_OT_MAX - BANK_OT_BASE));
    if (bankSumKind(ss, cs, "overtime", dayStart) + amt > cap) return jsonOut({ ok: false, err: "cap" }, cb);
    return jsonOut(bankGrant(ss, cs, dev, amt, "ot:" + key, "overtime", "daily kicker"), cb);
  }
  if (action === "deposit" || action === "withdraw") {
    if (!cs || !key) return jsonOut({ ok: false }, cb);
    return jsonOut(bankTransfer(ss, cs, dev, d.amount, key, action === "deposit"), cb);
  }
  if (action === "venture_propose") return jsonOut(venturePropose(ss, d), cb);
  if (action === "venture_vote") return jsonOut(ventureVote(ss, d), cb);
  return jsonOut({ ok: false, err: "unknown bank action" }, cb);
}
/* GET bank actions (JSONP, caller gets the verdict). */
function bankDispatchGet(action, p, cb) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cs = String(p.callsign || "").toLowerCase().trim().slice(0, 32);
  if (action === "bank_status") return jsonOut(bankStatus(ss, cs), cb);
  if (action === "bank_deposit") return jsonOut(bankTransfer(ss, cs, String(p.device || "").slice(0, 64), p.amount, String(p.key || ""), true), cb);
  if (action === "bank_withdraw") return jsonOut(bankTransfer(ss, cs, String(p.device || "").slice(0, 64), p.amount, String(p.key || ""), false), cb);
  if (action === "venture_list") return jsonOut(ventureList(ss, cs), cb);
  if (action === "venture_mine") return jsonOut(ventureMine(ss, cs), cb);
  if (action === "venture_pledge") return jsonOut(venturePledge(ss, p), cb);
  if (action === "venture_resolve") return jsonOut(ventureResolve(ss, p), cb);
  return jsonOut({ ok: false, err: "unknown bank action" }, cb);
}
/* ---------------- VENTURES ---------------- */
function loadVentures(ss) {
  var out = [];
  try {
    var v = ensureBankSheets(ss).ventures.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) out.push({
      _row: i + 1, id: String(v[i][0]), name: String(v[i][1]), kind: String(v[i][2]),
      founder: String(v[i][3]).toLowerCase(), goal: String(v[i][4]), target: Number(v[i][5]) || 0,
      sponsor_bounty: Number(v[i][6]) || 0, created: Number(v[i][7]) || 0,
      funding_deadline: Number(v[i][8]) || 0, battle_days: Number(v[i][9]) || 0,
      side_b: String(v[i][10] || ""), resolved: Number(v[i][11]) || 0,
      winner: String(v[i][12] || ""), extended: Number(v[i][13]) || 0
    });
  } catch (e) {}
  return out;
}
function venturePool(ss, vid) {
  var a = 0, b = 0, holders = {}, shares = 0;
  try {
    var v = ensureBankSheets(ss).ledger.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][1]) !== vid) continue;
      var xp = Number(v[i][5]) || 0, sh = Number(v[i][4]) || 0, side = String(v[i][6] || "a");
      if (side === "b") b += xp; else a += xp;
      shares += sh; holders[String(v[i][2]).toLowerCase()] = 1;
    }
  } catch (e) {}
  return { a: a, b: b, total: a + b, holders: Object.keys(holders).length, shares: shares };
}
function ventureHolders(ss, vid, side) {
  var out = {};
  try {
    var v = ensureBankSheets(ss).ledger.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][1]) !== vid) continue;
      if (side && String(v[i][6] || "a") !== side) continue;
      var c = String(v[i][2]).toLowerCase();
      out[c] = { shares: (out[c] ? out[c].shares : 0) + (Number(v[i][4]) || 0),
                 xp: (out[c] ? out[c].xp : 0) + (Number(v[i][5]) || 0) };
    }
  } catch (e) {}
  return out;
}
function venturePhase(vt, nowMs) {
  if (vt.resolved) return "resolved";
  if (nowMs < vt.funding_deadline) return "funding";
  if (nowMs < vt.funding_deadline + vt.battle_days * 86400000) return "battle";
  return "resolvable";
}
function pubVenture(ss, vt, nowMs) {
  var pool = venturePool(ss, vt.id);
  return { id: vt.id, name: vt.name, kind: vt.kind, founder: vt.founder, goal: vt.goal,
    target: vt.target, sponsor_bounty: vt.sponsor_bounty, side_b: vt.side_b,
    phase: venturePhase(vt, nowMs), funding_deadline: vt.funding_deadline,
    battle_end: vt.funding_deadline + vt.battle_days * 86400000,
    pool_a: pool.a, pool_b: pool.b, pool: pool.total, holders: pool.holders,
    shares: pool.shares, winner: vt.winner, extended: !!vt.extended,
    earlybird: nowMs < vt.created + 0.25 * Math.max(1, vt.funding_deadline - vt.created) };
}
function ventureList(ss, cs) {
  var nowMs = Date.now(), vts = loadVentures(ss), out = [];
  for (var i = 0; i < vts.length; i++) {
    if (vts[i].resolved && nowMs - vts[i].funding_deadline > 30 * 86400000) continue;
    out.push(pubVenture(ss, vts[i], nowMs));
  }
  out.sort(function (x, y) { return y.pool - x.pool; });
  return { ok: true, ventures: out };
}
function ventureMine(ss, cs) {
  cs = String(cs || "").toLowerCase();
  var nowMs = Date.now(), vts = loadVentures(ss), mine = [];
  for (var i = 0; i < vts.length; i++) {
    var h = ventureHolders(ss, vts[i].id), pos = h[cs];
    if (!pos && vts[i].founder !== cs) continue;
    var pub = pubVenture(ss, vts[i], nowMs);
    pub.my_shares = pos ? pos.shares : 0; pub.my_xp = pos ? pos.xp : 0;
    pub.my_side = null;
    try {
      var v = ensureBankSheets(ss).ledger.getDataRange().getValues();
      for (var j = 1; j < v.length; j++)
        if (String(v[j][1]) === vts[i].id && String(v[j][2]).toLowerCase() === cs) { pub.my_side = String(v[j][6] || "a"); break; }
    } catch (e) {}
    mine.push(pub);
  }
  return { ok: true, mine: mine };
}
function venturePropose(ss, d) {
  var cs = String(d.callsign || "").toLowerCase().trim().slice(0, 32);
  var key = String(d.key || "").slice(0, 96);
  if (!cs || !key) return { ok: false, err: "callsign required" };
  var name = String(d.name || "").replace(/[^a-zA-Z0-9 '\-!]/g, "").trim().slice(0, 40);
  var kind = String(d.kind || "");
  var goal = String(d.goal || "");
  if (name.length < 3) return { ok: false, err: "name it (3+ chars)" };
  if (kind !== "campaign" && kind !== "clash") return { ok: false, err: "bad kind" };
  if (!VENTURE_GOALS[goal]) return { ok: false, err: "bad goal" };
  var gl = CONTRACT_GOALS[goal];
  var target = Math.min(gl.max, Math.max(gl.min, Math.round(Number(d.target) || 0)));
  if (!target) return { ok: false, err: "bad target" };
  var fdays = Math.min(7, Math.max(1, Math.round(Number(d.funding_days) || 3)));
  var bdays = kind === "clash" ? Math.min(7, Math.max(1, Math.round(Number(d.battle_days) || 3))) : 7;
  var bounty = Math.min(5000, Math.max(0, Math.round(Number(d.sponsor_bounty) || 0)));
  var sideB = kind === "clash" ? String(d.side_b || "").replace(/[^a-zA-Z0-9 '\-]/g, "").trim().slice(0, 24) : "";
  if (kind === "clash" && sideB.length < 2) return { ok: false, err: "name side B" };
  var sh = ensureBankSheets(ss);
  try {
    var v = sh.ventures.getDataRange().getValues();
    for (var i = 1; i < v.length; i++)
      if (String(v[i][14] || "") === key) return { ok: true, dup: true };
  } catch (e) {}
  if (bounty > 0) {
    var esc = xpGrant(ss, cs, String(d.device || "").slice(0, 64), -bounty, "vent:spon:" + key, "venture sponsor bounty");
    if (!esc.ok) return { ok: false, err: esc.error || "insufficient XP for bounty" };
  }
  var nowMs = Date.now();
  var id = "v" + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36);
  sh.ventures.appendRow([id, name, kind, cs, goal, target, bounty, nowMs, nowMs + fdays * 86400000,
    bdays, sideB, 0, "", 0, key]);
  try { discordPing("venture", "NEW VENTURE: " + name + " (" + kind + ") — funding open for " + fdays + "d. Pledge from your War Chest."); } catch (e2) {}
  return { ok: true, id: id };
}
function venturePledge(ss, p) {
  var cs = String(p.callsign || "").toLowerCase().trim().slice(0, 32);
  var key = String(p.key || "").slice(0, 96);
  var vid = String(p.venture_id || "");
  if (!cs || !key || !vid) return { ok: false, err: "missing fields" };
  var vts = loadVentures(ss), vt = null;
  for (var i = 0; i < vts.length; i++) if (vts[i].id === vid) vt = vts[i];
  var nowMs = Date.now();
  if (!vt || vt.resolved || nowMs >= vt.funding_deadline) return { ok: false, err: "funding closed" };
  var amt = Math.round(Number(p.amount) || 0);
  if (amt < VENTURE_MIN_PLEDGE || amt > VENTURE_MAX_PLEDGE)
    return { ok: false, err: "pledge " + VENTURE_MIN_PLEDGE + "-" + VENTURE_MAX_PLEDGE + " XP" };
  var side = vt.kind === "clash" ? String(p.side || "") : "a";
  if (vt.kind === "clash" && side !== "a" && side !== "b") return { ok: false, err: "pick a side" };
  var sh = ensureBankSheets(ss);
  try {
    var lv = sh.ledger.getDataRange().getValues();
    for (var j = 1; j < lv.length; j++)
      if (String(lv[j][1]) === vid && String(lv[j][7]) === "vpledge:" + key)
        return { ok: true, dup: true, pool: venturePool(ss, vid) };
  } catch (e) {}
  var lock = bankGrant(ss, cs, String(p.device || "").slice(0, 64), -amt, "vpledge:" + key, "pledge_out", vid);
  if (!lock.ok) return { ok: false, err: lock.error || "insufficient bank balance" };
  var early = nowMs < vt.created + 0.25 * Math.max(1, vt.funding_deadline - vt.created);
  var shares = early ? Math.round(amt * (1 + VENTURE_EARLYBIRD)) : amt;
  sh.ledger.appendRow([new Date(), vid, cs, String(p.device || "").slice(0, 64), shares, amt, side,
    "vpledge:" + key, early ? "earlybird" : ""]);
  return { ok: true, shares: shares, earlybird: early, pool: venturePool(ss, vid) };
}
function ventureResolve(ss, p) {
  var vid = String(p.venture_id || "");
  if (!vid) return { ok: false, err: "missing venture" };
  var vts = loadVentures(ss), vt = null;
  for (var i = 0; i < vts.length; i++) if (vts[i].id === vid) vt = vts[i];
  var nowMs = Date.now();
  if (!vt) return { ok: false, err: "not found" };
  if (vt.resolved) return { ok: true, dup: true };
  var battleEnd = vt.funding_deadline + vt.battle_days * 86400000;
  if (nowMs < battleEnd) return { ok: false, err: "battle still running" };
  var sh = ensureBankSheets(ss), dev = String(p.device || "").slice(0, 64);
  var battleStartISO = ""; try { battleStartISO = new Date(vt.funding_deadline).toISOString(); } catch (e) {}
  function payBack(hs, note) {
    var names = Object.keys(hs);
    for (var i = 0; i < names.length; i++)
      bankGrant(ss, names[i], dev, hs[names[i]].xp, "vres:back:" + vid + ":" + names[i], "pledge_back", note || vid);
  }
  if (vt.kind === "campaign") {
    var holders = ventureHolders(ss, vid), names = Object.keys(holders);
    var prog = 0;
    try { prog = cxProgress(ss, { goal: vt.goal, target: vt.target, accepted_at: battleStartISO }, names); } catch (e2) {}
    if (prog >= vt.target) {
      var totShares = 0, k;
      for (k in holders) totShares += holders[k].shares;
      payBack(holders, "venture complete");
      for (k in holders) {
        var div = totShares > 0 ? Math.floor(vt.sponsor_bounty * holders[k].shares / totShares) : 0;
        if (div > 0) bankGrant(ss, k, dev, div, "vres:div:" + vid + ":" + k, "dividend", vt.name);
      }
      sh.ventures.getRange(vt._row, 12).setValue(1); sh.ventures.getRange(vt._row, 13).setValue("complete");
      try { discordPing("venture", "VENTURE COMPLETE: " + vt.name + " hit its goal (" + prog + "/" + vt.target + "). Dividends paid to " + names.length + " shareholders."); } catch (e3) {}
      return { ok: true, result: "complete", progress: prog };
    }
    payBack(holders, "venture missed");
    if (vt.sponsor_bounty > 0) bankGrant(ss, vt.founder, dev, vt.sponsor_bounty, "vres:spon:" + vid, "pledge_back", "sponsor refund");
    sh.ventures.getRange(vt._row, 12).setValue(1); sh.ventures.getRange(vt._row, 13).setValue("missed");
    try { discordPing("venture", "VENTURE MISSED: " + vt.name + " fell short (" + prog + "/" + vt.target + "). Pledges returned."); } catch (e4) {}
    return { ok: true, result: "missed", progress: prog };
  }
  /* clash */
  var hA = ventureHolders(ss, vid, "a"), hB = ventureHolders(ss, vid, "b");
  var nA = Object.keys(hA), nB = Object.keys(hB), pA = 0, pB = 0;
  try { pA = cxProgress(ss, { goal: vt.goal, target: 1, accepted_at: battleStartISO }, nA); } catch (e5) {}
  try { pB = cxProgress(ss, { goal: vt.goal, target: 1, accepted_at: battleStartISO }, nB); } catch (e6) {}
  if (pA === pB) {
    payBack(hA, "draw"); payBack(hB, "draw");
    sh.ventures.getRange(vt._row, 12).setValue(1); sh.ventures.getRange(vt._row, 13).setValue("draw");
    try { discordPing("venture", "CLASH DRAW: " + vt.name + " ended " + pA + "-" + pB + ". All pledges returned."); } catch (e7) {}
    return { ok: true, result: "draw", a: pA, b: pB };
  }
  var winH = pA > pB ? hA : hB, loseH = pA > pB ? hB : hA, winSide = pA > pB ? "a" : "b";
  var losePot = 0, kk, winShares = 0;
  for (kk in loseH) losePot += loseH[kk].xp;
  for (kk in winH) winShares += winH[kk].shares;
  payBack(winH, "clash victory");
  for (kk in winH) {
    var wp = winShares > 0 ? Math.floor(losePot * winH[kk].shares / winShares) : 0;
    if (wp > 0) bankGrant(ss, kk, dev, wp, "vres:win:" + vid + ":" + kk, "dividend", vt.name + " spoils");
  }
  sh.ventures.getRange(vt._row, 12).setValue(1); sh.ventures.getRange(vt._row, 13).setValue(winSide);
  try { discordPing("venture", "CLASH RESULT: " + vt.name + " — side " + (winSide === "a" ? "A" : "B (" + vt.side_b + ")") + " wins " + Math.max(pA, pB) + "-" + Math.min(pA, pB) + ". Spoils paid to " + Object.keys(winH).length + " victors."); } catch (e8) {}
  return { ok: true, result: "win", winner: winSide, a: pA, b: pB };
}
function ventureVote(ss, d) {
  var cs = String(d.callsign || "").toLowerCase().trim().slice(0, 32);
  var key = String(d.key || "").slice(0, 96);
  var vid = String(d.venture_id || "");
  var proposal = String(d.proposal || "");
  if (!cs || !key || !vid || proposal !== "extend") return { ok: false, err: "bad vote" };
  var vts = loadVentures(ss), vt = null;
  for (var i = 0; i < vts.length; i++) if (vts[i].id === vid) vt = vts[i];
  var nowMs = Date.now();
  if (!vt || vt.resolved || nowMs >= vt.funding_deadline || vt.extended) return { ok: false, err: "not votable" };
  var sh = ensureBankSheets(ss);
  try {
    var vv = sh.votes.getDataRange().getValues();
    for (var j = 1; j < vv.length; j++)
      if (String(vv[j][1]) === vid && String(vv[j][2]).toLowerCase() === cs && String(vv[j][3]) === "extend")
        return { ok: true, dup: true };
  } catch (e) {}
  sh.votes.appendRow([new Date(), vid, cs, "extend", String(d.vote || "yes"), key]);
  var holders = ventureHolders(ss, vid), totShares = 0, yesShares = 0, k;
  for (k in holders) totShares += holders[k].shares;
  try {
    var vv2 = sh.votes.getDataRange().getValues();
    for (var m = 1; m < vv2.length; m++) {
      if (String(vv2[m][1]) !== vid || String(vv2[m][3]) !== "extend" || String(vv2[m][4]) !== "yes") continue;
      var hc = holders[String(vv2[m][2]).toLowerCase()];
      if (hc) yesShares += hc.shares;
    }
  } catch (e2) {}
  if (totShares > 0 && yesShares > totShares / 2) {
    sh.ventures.getRange(vt._row, 9).setValue(vt.funding_deadline + 3 * 86400000);
    sh.ventures.getRange(vt._row, 14).setValue(1);
    try { discordPing("venture", "VENTURE EXTENDED: " + vt.name + " — shareholders voted to extend funding 3 days."); } catch (e3) {}
    return { ok: true, extended: true };
  }
  return { ok: true, extended: false };
}
