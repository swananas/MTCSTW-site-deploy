/* core/share-image-phq.js  |  PF v1.4.3 | POLITICAL HQ SHARE POSTERS.
<<<<<<< HEAD
   Seven custom PFShare painters (1080x1350, house palette) for the Political HQ
   rollout: pressure-campaign card, prediction-result card, prediction-call card
   (pre-resolution "SHARE YOUR CALL", same painter family as the result card),
   voting scorecard, cell-competition winner card, ballot-countdown card,
   voter-pledge card (merged via fe/pledge-share-cards; other PHQ painters
   land with their silos).
=======
   Five custom PFShare painters (1080x1350, house palette) for the Political HQ
   rollout: pressure-campaign card, prediction-result card, prediction-call card
   (pre-resolution "SHARE YOUR CALL", same painter family as the result card),
   voting scorecard, cell-competition winner card.
>>>>>>> origin/fe/predict-share-call
   Spec: ~/workspace/hidden/phq-share-specs.md.
   Data contract (painter receives one data object; missing optional fields
   degrade gracefully; scorecard missing fields render '—', never invented):
     pressure:   {title, target, demand, signatures, signaturesGoal}
     prediction: {statement, outcome ('correct'|'missed'), wins, losses}
     predictcall:{billTitle, billId, pick ('pass'|'fail'), margin?}
     scorecard:  {name, state, party, grade, verdict, votes[3] {bill, vote, for_us}}
     cellwin:    {cellName, verified, members, xp, runnerUp, marginXp, mvpCallsign, weekStart}
     ballot:     {state ('TX'), daysLeft (7|3|1|0|null), deadline ('YYYY-MM-DD'|null),
                 registerUrl, sameDay (bool). daysLeft null + sameDay true ->
                 NO DEADLINE variant. Missing daysLeft + not sameDay ->
                 CHECK YOUR DEADLINE degrade (never invented).}
     pledge:     {stateCode, stateName, deadline ('YYYY-MM-DD' | null),
                 daysLeft (number | 'sameday'), registerUrl, electionDay, source}.
                 Pledge deadline semantics mirror the Ballot Center pane:
                 deadline null -> same-day "REGISTER AT THE POLLS" variant;
                 missing/malformed or past deadline -> fail-soft null (no card).
                 Use PF.PHQShare.pledgeData(ballotRow) to build the data object.
   Callsigns resolve at paint time via callsignOf() (identity store /
   PFCallsign) — never passed in data. Painters that render the callsign
   inline set cv._pfStamped = true so PFShare.stampCallsign stays a no-op
   safety net. No-callsign fallback: skip the stamp strip and swap the
   recruit/challenge line to CLAIM YOUR CALLSIGN AT MTCSTW.COM.
   Consumer contract for PHQ silos:
     PF.PHQShare.share('phq-pressure', {...})  -> share sheet / download
     PF.PHQShare.save('phq-scorecard', {...})  -> save to phone
     PF.PHQShare.paint('phq-cellwin', {...})   -> raw canvas (previews/tests)
   Routes through PFShare.shareImage/saveImage, so the callsign-claim gate,
   the idempotent stamp, and the pf-share-image credit all ride along.
   KILL: ?pf_off=phq-share  or  localStorage pf_disabled_v1='["phq-share"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('phq-share')) { return; }
  if (window.pfPhqShareDone) return;
  window.pfPhqShareDone = true;

  var W = 1080, H = 1350;
<<<<<<< HEAD
  var IDS = ['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin', 'phq-ballot', 'phq-pledge'];
=======
  var IDS = ['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin'];
>>>>>>> origin/fe/predict-share-call
  var TITLES = {
    'phq-pressure': 'PRESSURE CAMPAIGN',
    'phq-prediction': 'PREDICTION RESULT',
    'phq-predict-call': 'MY CALL',
    'phq-scorecard': 'VOTING SCORECARD',
    'phq-cellwin': 'CELL VICTORY',
    'phq-ballot': 'BALLOT COUNTDOWN',
    'phq-pledge': 'VOTER PLEDGE'
  };
  var DEEP = 'MTCSTW.COM/POLITICAL-HQ';
  var PENDING = {};

  /* ---------------------------------------------------------------- */
  /* Small canvas helpers                                              */
  /* ---------------------------------------------------------------- */
  function wrap(x, text, maxW) {
    var words = String(text == null ? '' : text).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else { line = t; }
    }
    if (line) lines.push(line);
    return lines;
  }
  function fmtNum(n) {
    try { return Number(n).toLocaleString('en-US'); } catch (e) { return String(n); }
  }
  function dateStr() {
    try {
      return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return ''; }
  }
  function callsignOf() {
    var cs = '';
    try {
      var id = JSON.parse(localStorage.getItem('pf_identity_v1') || '{}');
      if (id && id.callsign) cs = String(id.callsign).toUpperCase();
    } catch (e) {}
    if (!cs) { try { cs = String((window.PFCallsign && window.PFCallsign()) || '').toUpperCase(); } catch (e) {} }
    return cs;
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }
  function newCv() {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    return cv;
  }
  function base(x) {
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, W - 32, H - 32);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  }
  function kicker(x) {
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('\u2605 THE PROPAGANDA FACTORY \u2605', W / 2, 160);
  }
  /* Manual letterspacing (canvas letterSpacing isn't universal): draws each
     char centered as a whole, returns total width for the rule lines. */
  function spaced(x, text, cx, y, ls) {
    var chars = String(text).split(''), ws = [], total = 0, i, w;
    for (i = 0; i < chars.length; i++) { w = x.measureText(chars[i]).width; ws.push(w); total += w; }
    total += ls * Math.max(0, chars.length - 1);
    var pen = cx - total / 2, prev = x.textAlign;
    x.textAlign = 'left';
    for (i = 0; i < chars.length; i++) { x.fillText(chars[i], pen, y); pen += ws[i] + ls; }
    x.textAlign = prev;
    return total;
  }
  function badge(x, text, y, color, px) {
    x.fillStyle = color || '#f5ead6';
    x.font = '700 ' + (px || 40) + 'px Arial,sans-serif';
    var tw = spaced(x, text, W / 2, y, 6);
    x.fillStyle = '#c1121f';
    x.fillRect(W / 2 - tw / 2 - 20, y - 58, tw + 40, 3);
    x.fillRect(W / 2 - tw / 2 - 20, y + 24, tw + 40, 3);
  }
  /* Shrink-to-fit for single-line display type: steps down from base px to
     min px until the text fits maxW. */
  function fitFont(x, text, basePx, minPx, maxW, weight) {
    var s = basePx;
    var fam = (weight || '900') + ' ' + s + 'px "Arial Black",Arial,sans-serif';
    x.font = fam;
    while (s > minPx && x.measureText(text).width > maxW) {
      s -= 4;
      x.font = (weight || '900') + ' ' + s + 'px "Arial Black",Arial,sans-serif';
    }
    return s;
  }
  /* Callsign strip. Returns the next y (unchanged when skipped). Paints
     nothing when no callsign is claimed — never a blank stamp. */
  function csLine(cv, x, y, cs) {
    if (!cs) return y;
    x.fillStyle = '#c1121f'; x.font = '700 30px Arial,sans-serif';
    x.fillText('FIGHTING AS ' + cs, W / 2, y);
    try { cv._pfStamped = true; } catch (e) {}
    return y + 42;
  }
  /* No-callsign funnel swap for recruit/challenge lines. */
  function claimLine(x, y) {
    x.fillStyle = '#c1121f'; x.font = '700 36px Arial,sans-serif';
    x.fillText('CLAIM YOUR CALLSIGN AT MTCSTW.COM', W / 2, y);
    return y + 50;
  }
  /* Red CTA button, white text, centered at cy. */
  function button(x, text, cy, px) {
    x.font = '900 ' + (px || 40) + 'px "Arial Black",Arial,sans-serif';
    var tw = x.measureText(text).width + 110, bh = 92;
    x.fillStyle = '#c1121f'; x.fillRect(W / 2 - tw / 2, cy - bh / 2, tw, bh);
    x.fillStyle = '#ffffff';
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(text, W / 2, cy + 2);
    x.textBaseline = pb;
  }
  /* Bottom stack: deep link -> CTA -> date. cell mode keeps the war-card CTA
     variant (white on red button) per the standing CTA standard. */
  function bottomStack(x, ctaMode) {
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText(DEEP, W / 2, H - 128);
    if (ctaMode === 'cell') {
      button(x, 'JOIN MY CELL / BUILD YOUR CELL', H - 84, 42);
    } else {
      x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
      x.fillText('JOIN THE FIGHT.', W / 2, H - 84);
    }
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 48);
  }
  function monDate(ws) {
    var s = String(ws == null ? '' : ws).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      var mi = parseInt(m[2], 10) - 1;
      if (mi >= 0 && mi < 12) return MON[mi] + ' ' + parseInt(m[3], 10);
    }
    return (s || '—').toUpperCase().slice(0, 16);
  }

  /* ---------------------------------------------------------------- */
  /* Surface 1 — Pressure Campaign Card                                */
  /* ---------------------------------------------------------------- */
  function paintPressure(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'PRESSURE CAMPAIGN', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 396;
    x.fillStyle = '#c1121f';
    var tlh = 84;
    x.font = '900 76px "Arial Black",Arial,sans-serif';
    var tl = wrap(x, String(d.title || 'UNTITLED CAMPAIGN').toUpperCase(), 910);
    if (tl.length > 2) { /* shrink 76 -> 64 before truncating (spec §5.4) */
      x.font = '900 64px "Arial Black",Arial,sans-serif'; tlh = 74;
      tl = wrap(x, String(d.title || 'UNTITLED CAMPAIGN').toUpperCase(), 910);
    }
    tl = tl.slice(0, 3);
    for (var i = 0; i < tl.length; i++) { x.fillText(tl[i], W / 2, y); y += tlh; }
    y = Math.max(700, y + 24);
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    wrap(x, 'TARGET: ' + String(d.target || '—').toUpperCase(), 910).slice(0, 1)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 56; });
    y += 12;
    x.fillStyle = '#c9bfa8'; x.font = '400 38px Arial,sans-serif';
    wrap(x, 'DEMAND: ' + String(d.demand || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
    y = Math.max(950, y + 40);
    var sig = Math.max(0, parseInt(d.signatures, 10) || 0);
    var goal = Math.max(0, parseInt(d.signaturesGoal, 10) || 0);
    var tally = fmtNum(sig) + ' SIGNATURES' + (goal > 0 ? ' \u2014 ' + fmtNum(Math.max(0, goal - sig)) + ' TO GO' : '');
    x.fillStyle = '#e8b923';
    fitFont(x, tally, 64, 40, 910);
    x.fillText(tally, W / 2, y); y += 44;
    var frac = goal > 0 ? Math.min(1, sig / goal) : 1;
    x.fillStyle = '#f5ead6'; x.fillRect(190, y, 700, 26);
    x.fillStyle = '#c1121f'; x.fillRect(190, y, Math.round(700 * frac), 26);
    y += 26 + 50;
    if (cs) y = csLine(cv, x, y, cs) + 12;
    button(x, 'ADD MY NAME', 1130, 40);
    bottomStack(x, 'fight');
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Surface 2 — Prediction Result Card                                */
  /* ---------------------------------------------------------------- */
  function paintPrediction(d, cv, x) {
    base(x); kicker(x);
    var correct = String(d.outcome || '').toLowerCase() === 'correct';
    badge(x, correct ? 'PREDICTION: SETTLED' : 'PREDICTION: MISSED', 280,
      correct ? '#c1121f' : '#c9bfa8', 40);
    var cs = callsignOf();
    var y = 420;
    x.fillStyle = '#f5ead6'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    wrap(x, String(d.statement || '—').toUpperCase(), 910).slice(0, 3)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 76; });
    /* Verdict stamp — the thumb-stopping headline of the card. */
    var vtext = correct ? '\u2713 CALLED IT' : '\u2717 SWUNG & MISSED';
    fitFont(x, vtext, 110, 72, 910);
    x.save();
    x.translate(W / 2, 700); x.rotate(-8 * Math.PI / 180);
    x.fillStyle = correct ? '#c1121f' : '#c9bfa8';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(vtext, 0, 0);
    x.restore();
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    y = Math.max(900, y + 40);
    var rec = 'MY RECORD: ' + (parseInt(d.wins, 10) || 0) + 'W \u2014 ' + (parseInt(d.losses, 10) || 0) + 'L';
    x.fillStyle = '#e8b923';
    fitFont(x, rec, 56, 40, 910);
    x.fillText(rec, W / 2, y); y += 50;
    y = Math.max(1000, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    y = Math.max(1120, y);
    if (correct) {
      if (cs) {
        x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
        x.fillText('THINK YOU CAN CALL IT BETTER?', W / 2, y);
      } else {
        claimLine(x, y); /* no-callsign: the taunt becomes the funnel */
      }
    }
    bottomStack(x, 'fight');
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Surface 2b — Prediction Call (pre-resolution SHARE YOUR CALL)     */
  /* Same painter family as the result card: the resolution auto-draft  */
  /* produces CALLED IT / MISSED in the identical visual language.     */
  /* Data: {billTitle, billId, pick ('pass'|'fail'), margin?} — bill    */
  /* facts pulled live at generation time, never baked in. No XP rides */
  /* this poster; prediction XP is backend-granted on resolution only. */
  /* ---------------------------------------------------------------- */
  function paintPredictCall(d, cv, x) {
    base(x); kicker(x);
    var pass = String(d.pick || '').toLowerCase() === 'pass';
    badge(x, 'MY CALL: LOCKED IN', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 420;
    x.fillStyle = '#f5ead6'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    wrap(x, String(d.billTitle || d.billId || '—').toUpperCase(), 910).slice(0, 3)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 76; });
    /* The call stamp — same rotated treatment as the resolution verdict. */
    var stext = pass ? '\u2713 WILL PASS' : '\u2717 WILL FAIL';
    fitFont(x, stext, 110, 72, 910);
    x.save();
    x.translate(W / 2, 700); x.rotate(-8 * Math.PI / 180);
    x.fillStyle = pass ? '#c1121f' : '#c9bfa8';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(stext, 0, 0);
    x.restore();
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    y = Math.max(900, y + 40);
    var mg = String(d.margin == null ? '' : d.margin).trim();
    if (mg) {
      var mline = 'MY MARGIN CALL: ' + mg.toUpperCase();
      x.fillStyle = '#e8b923';
      fitFont(x, mline, 56, 40, 910);
      x.fillText(mline, W / 2, y); y += 50;
    }
    y = Math.max(1000, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    y = Math.max(1120, y);
    if (cs) {
      x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
      x.fillText('THINK YOU CAN CALL IT BETTER?', W / 2, y);
    } else {
      claimLine(x, y); /* no-callsign: the taunt becomes the funnel */
    }
    bottomStack(x, 'fight');
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Surface 3 — Voting Scorecard                                      */
  /* ---------------------------------------------------------------- */
  function paintScorecard(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'KNOW YOUR ENEMY \u2014 VOTING RECORD', 280, '#f5ead6', 36);
    var cs = callsignOf();
    var name = String(d.name || '—').toUpperCase();
    var sub = '(' + String(d.state || '—').toUpperCase() + '-' + String(d.party || '—').toUpperCase() + ')';
    var y = 420;
    x.fillStyle = '#f5ead6'; x.font = '900 64px "Arial Black",Arial,sans-serif';
    wrap(x, name + ' ' + sub, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 76; });
    /* The grade — biggest element on the card. F/D red, C gold, B/A cream. */
    var g = String(d.grade || '—').toUpperCase().charAt(0);
    var gc = (g === 'F' || g === 'D') ? '#c1121f' : (g === 'C' ? '#e8b923' : (g === 'B' || g === 'A' ? '#f5ead6' : '#c9bfa8'));
    x.fillStyle = gc; x.font = '900 220px "Arial Black",Arial,sans-serif';
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(g, W / 2, 700);
    x.textBaseline = pb;
    y = 840;
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    wrap(x, String(d.verdict || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
    y = Math.max(950, y + 24);
    var votes = Array.isArray(d.votes) ? d.votes.slice(0, 3) : [];
    for (var i = 0; i < votes.length; i++) {
      voteRow(x, votes[i] || {}, y);
      y += 46;
    }
    y = Math.max(1100, y);
    if (cs) csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }
  function voteRow(x, v, y) {
    var mark = v.for_us ? '\u2713' : '\u2717';
    var rest = ' ' + String(v.bill || '—').toUpperCase() + ' \u2014 ' + String(v.vote || '—').toUpperCase();
    var fs = 34;
    x.font = '400 34px Arial,sans-serif';
    var mw = x.measureText(mark).width, rw = x.measureText(rest).width;
    while (fs > 26 && mw + rw > 910) { /* shrink before truncating */
      fs -= 2; x.font = '400 ' + fs + 'px Arial,sans-serif';
      mw = x.measureText(mark).width; rw = x.measureText(rest).width;
    }
    if (mw + rw > 910) {
      while (rest.length > 4 && x.measureText(mark).width + x.measureText(rest).width > 906) rest = rest.slice(0, -4);
      rest = rest.replace(/\s+$/, '') + '\u2026';
      rw = x.measureText(rest).width;
    }
    var sx = W / 2 - (mw + rw) / 2, pa = x.textAlign;
    x.textAlign = 'left';
    x.fillStyle = v.for_us ? '#f5ead6' : '#c1121f';
    x.fillText(mark, sx, y);
    x.fillStyle = '#c9bfa8';
    x.fillText(rest, sx + mw, y);
    x.textAlign = pa;
  }

  /* ---------------------------------------------------------------- */
  /* Surface 4 — Cell Competition Winner Card                           */
  /* ---------------------------------------------------------------- */
  function paintCellwin(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'CELL COMPETITION \u2014 WEEK OF ' + monDate(d.weekStart), 280, '#f5ead6', 36);
    var cs = callsignOf();
    x.fillStyle = '#c1121f'; x.font = '900 120px "Arial Black",Arial,sans-serif';
    x.fillText('VICTORY', W / 2, 400);
    var y = 540;
    x.fillStyle = '#f5ead6'; x.font = '900 72px "Arial Black",Arial,sans-serif';
    wrap(x, String(d.cellName || 'UNNAMED CELL').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 84; });
    if (d.verified) {
      x.fillStyle = '#e8b923'; x.font = '700 36px Arial,sans-serif';
      x.fillText('\u2605 VERIFIED', W / 2, y); y += 50;
    }
    y = Math.max(790, y + 30);
    var nums = fmtNum(parseInt(d.members, 10) || 0) + ' MEMBERS \u00b7 ' + fmtNum(parseInt(d.xp, 10) || 0) + ' XP';
    x.fillStyle = '#e8b923';
    fitFont(x, nums, 56, 40, 910);
    x.fillText(nums, W / 2, y); y += 62;
    x.fillStyle = '#c9bfa8'; x.font = '400 36px Arial,sans-serif';
    wrap(x, 'BEAT ' + String(d.runnerUp || '—').toUpperCase() + ' BY ' + fmtNum(parseInt(d.marginXp, 10) || 0) + ' XP', 910)
      .slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    y = Math.max(880, y + 24);
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    x.fillText('MVP: ' + String(d.mvpCallsign || '—').toUpperCase(), W / 2, y); y += 56;
    y = Math.max(940, y);
    if (cs) y = csLine(cv, x, y, cs) + 10; /* two callsigns can share this card */
    y = Math.max(1020, y);
    if (cs) {
      x.fillStyle = '#f5ead6'; x.font = '700 38px Arial,sans-serif';
      x.fillText('NEXT ROUND STARTS MONDAY. BUILD YOUR CELL.', W / 2, y);
    } else {
      claimLine(x, y); /* no-callsign: the recruit strip becomes the funnel */
    }
    bottomStack(x, 'cell');
    return cv;
  }

  /* Specific source + date line above the standard stack. Skipped when
     data.source is absent — bottomStack's deep link is the fallback, so we
     never print a redundant second MTCSTW.COM line. */
  function srcLine(x, d) {
    var s = String(d.source == null ? '' : d.source).trim();
    if (!s) return;
    var t = 'SOURCE: ' + s.toUpperCase();
    var dt = String(d.source_date == null ? '' : d.source_date).trim();
    if (dt) t += ' \u00b7 ' + monDate(dt);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#c9bfa8';
    fitFont(x, t, 30, 22, 910, '400');
    x.fillText(t, W / 2, H - 168);
  }
  var BALLOT_STATES = {
    AL: 'ALABAMA', AK: 'ALASKA', AZ: 'ARIZONA', AR: 'ARKANSAS', CA: 'CALIFORNIA',
    CO: 'COLORADO', CT: 'CONNECTICUT', DE: 'DELAWARE', DC: 'DISTRICT OF COLUMBIA',
    FL: 'FLORIDA', GA: 'GEORGIA', HI: 'HAWAII', ID: 'IDAHO', IL: 'ILLINOIS',
    IN: 'INDIANA', IA: 'IOWA', KS: 'KANSAS', KY: 'KENTUCKY', LA: 'LOUISIANA',
    ME: 'MAINE', MD: 'MARYLAND', MA: 'MASSACHUSETTS', MI: 'MICHIGAN',
    MN: 'MINNESOTA', MS: 'MISSISSIPPI', MO: 'MISSOURI', MT: 'MONTANA',
    NE: 'NEBRASKA', NV: 'NEVADA', NH: 'NEW HAMPSHIRE', NJ: 'NEW JERSEY',
    NM: 'NEW MEXICO', NY: 'NEW YORK', NC: 'NORTH CAROLINA', ND: 'NORTH DAKOTA',
    OH: 'OHIO', OK: 'OKLAHOMA', OR: 'OREGON', PA: 'PENNSYLVANIA',
    RI: 'RHODE ISLAND', SC: 'SOUTH CAROLINA', SD: 'SOUTH DAKOTA',
    TN: 'TENNESSEE', TX: 'TEXAS', UT: 'UTAH', VT: 'VERMONT', VA: 'VIRGINIA',
    WA: 'WASHINGTON', WV: 'WEST VIRGINIA', WI: 'WISCONSIN', WY: 'WYOMING'
  };
  function ballotDate(ymd) {
    var s = String(ymd == null ? '' : ymd).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    var MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
      'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    var mi = parseInt(m[2], 10) - 1;
    if (mi < 0 || mi > 11) return '';
    return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  function ballotShortUrl(u, st) {
    var s = String(u == null ? '' : u).trim()
      .replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    if (s) return s.toUpperCase();
    return 'VOTE.GOV/REGISTER' + (st ? '/' + st.toLowerCase() : '');
  }
  function paintBallot(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'BALLOT COUNTDOWN', 280, '#f5ead6', 40);
    var st = String(d.state == null ? '' : d.state).toUpperCase().trim();
    var sName = BALLOT_STATES[st] || (st ? st : 'YOUR STATE');
    var sameDay = !!d.sameDay;
    var dl = (typeof d.daysLeft === 'number' && isFinite(d.daysLeft)) ? Math.round(d.daysLeft) : null;
    var cs = callsignOf();
    var y = 430;
    x.textAlign = 'center';
    if (sameDay) {
      /* Same-day registration: no deadline — never fake urgency. */
      x.fillStyle = '#c1121f';
      x.font = '900 120px "Arial Black",Arial,sans-serif';
      x.fillText('NO DEADLINE', W / 2, y); y += 140;
      x.fillStyle = '#f5ead6'; x.font = '700 52px Arial,sans-serif';
      wrap(x, 'REGISTER AT THE POLLS IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else if (dl === 0) {
      x.fillStyle = '#c1121f';
      x.font = '900 170px "Arial Black",Arial,sans-serif';
      x.fillText('TODAY', W / 2, y); y += 190;
      x.fillStyle = '#f5ead6'; x.font = '700 52px Arial,sans-serif';
      wrap(x, 'LAST DAY TO REGISTER IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else if (dl !== null && dl > 0) {
      x.fillStyle = '#c1121f';
      x.font = '900 300px "Arial Black",Arial,sans-serif';
      x.fillText(String(dl), W / 2, y); y += 320;
      x.fillStyle = '#f5ead6'; x.font = '900 84px "Arial Black",Arial,sans-serif';
      x.fillText(dl === 1 ? 'DAY LEFT' : 'DAYS LEFT', W / 2, y); y += 110;
      x.font = '700 52px Arial,sans-serif';
      wrap(x, 'TO REGISTER IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else {
      /* Missing deadline data: honest degrade, nothing invented. */
      x.fillStyle = '#e8b923';
      x.font = '900 84px "Arial Black",Arial,sans-serif';
      wrap(x, 'CHECK YOUR DEADLINE', 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 96; });
      x.fillStyle = '#f5ead6'; x.font = '700 48px Arial,sans-serif';
      wrap(x, 'REGISTRATION DATES VARY — ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 60; });
      y += 24;
    }
    /* Deadline + register lines (rendered only from real data). */
    var dlFull = ballotDate(d.deadline);
    if (!sameDay && dlFull) {
      x.fillStyle = '#e8b923'; x.font = '700 44px Arial,sans-serif';
      x.fillText('DEADLINE: ' + dlFull, W / 2, y); y += 64;
    }
    var reg = ballotShortUrl(d.registerUrl, st.toLowerCase());
    x.fillStyle = '#f5ead6';
    fitFont(x, 'REGISTER: ' + reg, 46, 30, 910, '700');
    x.fillText('REGISTER: ' + reg, W / 2, y); y += 60;
    y = Math.max(1050, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }

  /* Surface 5 — Voter Pledge Card ("I'M IN. Texas. Registered. Nov 3.") */
  /* ---------------------------------------------------------------- */
  /* Whole calendar days from local-today start to the deadline — the same
     formula the Ballot Center pane uses (positive = days left, 0 = today,
     negative = passed, null = unparseable). */
  function pledgeDaysLeft(iso) {
    var m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  }
  /* Long date for the card ("OCTOBER 13, 2026") — same month list the
     Ballot Center pane uses, uppercase for the canvas. */
  function pledgeFmtLong(iso) {
    var m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return '';
    var MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
      'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    var mi = parseInt(m[2], 10) - 1;
    if (mi < 0 || mi > 11) return '';
    return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  /* vote.gov display form: strip scheme/www so the canvas line stays short. */
  function pledgeShortUrl(u) {
    var s = String(u == null ? '' : u).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '');
    return s.toUpperCase().slice(0, 44);
  }
  /* Pure ballot-row -> pledge card data (or null). Mirrors the Ballot Center
     deadline semantics exactly:
       NULL deadline  -> same-day registration state ('sameday' variant)
       missing/malformed deadline -> null (fail-soft: caller shows no card)
       past deadline  -> null (fail-soft: caller shows "deadline passed")
     Never invents a date: the deadline comes only from the ballot row.
     The civic voter pane uses this after a successful voter_pledge; the
     Ballot Center "my pledge" entry point can reuse it later. */
  function pledgeData(row) {
    row = row || {};
    var code = String(row.state || '').toUpperCase().trim().slice(0, 2);
    if (!code) return null;
    var dl = row.registration_deadline;
    var deadline = (dl == null || dl === '') ? null : String(dl).slice(0, 10);
    var left;
    if (deadline === null) {
      left = 'sameday';
    } else {
      left = pledgeDaysLeft(deadline);
      if (left === null) return null; /* malformed — fail soft */
      if (left < 0) return null;      /* expired — fail soft */
    }
    return {
      stateCode: code,
      stateName: String(row.state_name || code),
      deadline: deadline,          /* null = same-day registration state */
      daysLeft: left,              /* number | 'sameday' */
      registerUrl: String(row.register_url || ''),
      electionDay: String(row.election_day || '').slice(0, 10),
      source: 'PF BALLOT CENTER DATA'
    };
  }
  function paintPledge(d, cv, x) {
    /* Kill switch ?pf_off=card-pledge: no card, fail-soft. */
    try { if (PF && PF.skip('card-pledge')) return null; } catch (e) {}
    d = d || {};
    var st = String(d.stateName || d.stateCode || '').toUpperCase().slice(0, 28);
    if (!st) return null;
    var left = d.daysLeft;
    if (left === undefined || left === null) {
      /* Tolerate callers that pass deadline without daysLeft — derive it. */
      if (d.deadline == null) left = 'sameday';
      else { left = pledgeDaysLeft(d.deadline); if (left === null) return null; }
    }
    if (left !== 'sameday' && left < 0) return null; /* expired — no card */
    base(x); kicker(x);
    badge(x, 'VOTER PLEDGE', 280, '#f5ead6', 40);
    x.textAlign = 'center';
    x.fillStyle = '#c1121f'; x.font = '900 118px "Arial Black",Arial,sans-serif';
    x.fillText("I'M IN.", W / 2, 424);
    fitFont(x, st, 84, 44, 920, '900');
    x.fillStyle = '#f5ead6';
    x.fillText(st, W / 2, 548);
    var y = 668;
    if (left === 'sameday') {
      /* Same-day registration state: the correct variant, never fake urgency. */
      x.fillStyle = '#c1121f'; x.font = '900 62px "Arial Black",Arial,sans-serif';
      x.fillText('REGISTER AT THE POLLS', W / 2, y); y += 84;
      x.fillStyle = '#f5ead6'; x.font = '700 42px Arial,sans-serif';
      var sdl = wrap(x, 'SAME-DAY REGISTRATION IN ' + st, 920).slice(0, 2);
      for (var si = 0; si < sdl.length; si++) { x.fillText(sdl[si], W / 2, y); y += 56; }
    } else if (left === 0) {
      x.fillStyle = '#c1121f'; x.font = '900 56px "Arial Black",Arial,sans-serif';
      var tdl = wrap(x, 'TODAY IS THE LAST DAY TO REGISTER', 920).slice(0, 2);
      for (var ti = 0; ti < tdl.length; ti++) { x.fillText(tdl[ti], W / 2, y); y += 68; }
    } else {
      x.fillStyle = '#f5ead6'; x.font = '900 54px "Arial Black",Arial,sans-serif';
      x.fillText('REGISTER BY ' + pledgeFmtLong(d.deadline), W / 2, y); y += 78;
      x.fillStyle = '#c1121f'; x.font = '900 64px "Arial Black",Arial,sans-serif';
      x.fillText(left + (left === 1 ? ' DAY LEFT' : ' DAYS LEFT'), W / 2, y); y += 86;
    }
    var reg = pledgeShortUrl(d.registerUrl);
    if (reg) {
      x.fillStyle = '#c9bfa8'; x.font = '700 32px Arial,sans-serif';
      x.fillText('REGISTER: ' + reg, W / 2, y); y += 54;
    }
    var ed = pledgeFmtLong(d.electionDay);
    if (ed) {
      x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
      x.fillText('VOTE ' + ed, W / 2, y); y += 58;
    }
    y = Math.max(y + 24, 990);
    var cs = callsignOf();
    if (cs) y = csLine(cv, x, y, cs);   /* _pfStamped=true: stampCallsign stays a no-op */
    else y = claimLine(x, y);            /* no callsign: the funnel line */
    /* Source + date attribution (the generation date rides bottomStack). */
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    x.fillText('SOURCE: ' + String(d.source || 'PF BALLOT CENTER DATA').toUpperCase().slice(0, 44),
      W / 2, H - 176);
    bottomStack(x); /* DEEP link -> JOIN THE FIGHT. -> date */
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* Painter table + registration                                       */
  /* ---------------------------------------------------------------- */
  var PAINT = {
    'phq-pressure': paintPressure,
    'phq-prediction': paintPrediction,
    'phq-predict-call': paintPredictCall,
    'phq-scorecard': paintScorecard,
    'phq-cellwin': paintCellwin,
    'phq-ballot': paintBallot,
    'phq-pledge': paintPledge
  };
  function paintOne(id, data) {
    var p = PAINT[id];
    if (!p) return null;
    var cv = newCv();
    var x = null;
    try { x = cv.getContext('2d'); } catch (e) {}
    if (!x) return null;
    try { return p(data || {}, cv, x); } catch (e) { return null; }
  }
  function regAll() {
    var PS = null;
    try { PS = window.PFShare; } catch (e) {}
    if (!PS || !PS.setPoster) { setTimeout(regAll, 600); return; }
    for (var i = 0; i < IDS.length; i++) {
      (function (id) {
        try {
          PS.setPoster(id, function (done) {
            var cv = null;
            try { cv = paintOne(id, PENDING[id]); } catch (e) {}
            try { done(cv); } catch (e2) {}
          });
        } catch (e3) {}
      })(IDS[i]);
    }
  }
  regAll();

  function go(id, data, kind, opts) {
    if (IDS.indexOf(id) === -1) return false;
    opts = opts || {};
    var PS = null;
    try { PS = window.PFShare; } catch (e) {}
    if (!PS || !PS.setPoster || !PS.shareImage || !PS.saveImage) return false;
    PENDING[id] = data || {};
    var painter = function (done) {
      var cv = null;
      try { cv = paintOne(id, PENDING[id]); } catch (e) {}
      try { done(cv); } catch (e2) {}
    };
    try { PS.setPoster(id, painter); } catch (e) {}
    try {
      painter(function (cv) {
        if (!cv) { toast('Poster failed \u2014 try again.'); return; }
        var fn = 'pfn-' + id + '.png';
        if (kind === 'share') PS.shareImage(cv, fn, opts.title || TITLES[id], id, opts);
        else PS.saveImage(cv, fn, id, opts);
      });
    } catch (e) { toast('Poster failed \u2014 try again.'); return false; }
    return true;
  }

  try {
    PF.PHQShare = {
      ids: IDS.slice(),
      share: function (id, data, opts) { return go(id, data, 'share', opts); },
      save: function (id, data, opts) { return go(id, data, 'save', opts); },
      paint: function (id, data) { try { return paintOne(id, data || {}); } catch (e) { return null; } },
      /* Ballot-row -> pledge card data (null when no card: expired/malformed).
         Used by the civic voter pane after a successful voter_pledge; the
         Ballot Center "my pledge" entry point can reuse it later. */
      pledgeData: function (row) { try { return pledgeData(row); } catch (e) { return null; } }
    };
  } catch (e) {}
})();
