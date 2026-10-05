/* core/share-image-phq.js  |  PF v1.4.3 | POLITICAL HQ SHARE POSTERS.
   Six custom PFShare painters (1080x1350, house palette) for the Political HQ
   rollout: pressure-campaign card, prediction-result card, voting scorecard,
   cell-competition winner card, wall-of-shame legislator card, stock-trades
   portfolio card.
   Spec: ~/workspace/hidden/phq-share-specs.md.
   Data contract (painter receives one data object; missing optional fields
   degrade gracefully; scorecard missing fields render '—', never invented):
     pressure:   {title, target, demand, signatures, signaturesGoal}
     prediction: {statement, outcome ('correct'|'missed'), wins, losses}
     scorecard:  {name, state, party, grade, verdict, votes[3] {bill, vote, for_us}}
     cellwin:    {cellName, verified, members, xp, runnerUp, marginXp, mvpCallsign, weekStart}
     wallshame:  {billId, billTitle, name, chamber, party, state, againstVotes,
                  position, question, voteDates[ISO], sourceUrl}
     trades:     {name, chamber, party, state, tradeCount,
                  topTickers[4] {ticker, n}, dateFrom, dateTo (ISO),
                  sources[] {label, url}, asOf (ISO date)}
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
   KILL: ?pf_off=phq-share  or  localStorage pf_disabled_v1='["phq-share"]'
   Card kill: ?pf_off=trades-card disables the phq-trades painter only. */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('phq-share')) { return; }
  if (window.pfPhqShareDone) return;
  window.pfPhqShareDone = true;

  var W = 1080, H = 1350;
  var IDS = ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-trades'];
  var TITLES = {
    'phq-pressure': 'PRESSURE CAMPAIGN',
    'phq-prediction': 'PREDICTION RESULT',
    'phq-scorecard': 'VOTING SCORECARD',
    'phq-cellwin': 'CELL VICTORY',
    'phq-wallshame': 'WALL OF SHAME',
    'phq-trades': 'THEIR PORTFOLIO'
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
  /* Surface 5 — Wall of Shame Card                                     */
  /* ---------------------------------------------------------------- */
  /* One legislator shamed for recorded votes against the progressive
     position on a single bill. Monogram initials stand in for a photo —
     the directory ships no photo URLs, so none are invented or hotlinked.
     Every pixel from the data object; missing fields render '—'. */
  function initialsOf(name) {
    var p = String(name || '').trim().split(/\s+/).filter(function (w) { return !!w; });
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
  }
  function chamberLine(d) {
    var ch = String(d.chamber || '').toLowerCase();
    ch = (ch === 'house' || ch === 'rep') ? 'U.S. HOUSE'
      : ((ch === 'senate' || ch === 'sen') ? 'U.S. SENATE' : String(d.chamber || '—'));
    return (ch + ' \u00b7 ' + String(d.party || '—') + ' \u00b7 ' + String(d.state || '—')).toUpperCase();
  }
  function fullDate(ws) {
    var s = String(ws == null ? '' : ws).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      var mi = parseInt(m[2], 10) - 1;
      if (mi >= 0 && mi < 12) return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
    }
    return (s || '—').toUpperCase().slice(0, 24);
  }
  function voteDates(d) {
    var out = [], seen = {}, vs = Array.isArray(d.voteDates) ? d.voteDates : [];
    for (var i = 0; i < vs.length && out.length < 3; i++) {
      var k = String(vs[i] || '');
      if (k && !seen[k]) { seen[k] = 1; out.push(fullDate(k)); }
    }
    return out;
  }
  function shortUrl(u) {
    var s = String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return (s || '—').toUpperCase().slice(0, 52);
  }
  function paintWallShame(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'WALL OF SHAME', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 400;
    /* the bill */
    x.fillStyle = '#e8b923';
    fitFont(x, String(d.billId || '—').toUpperCase(), 64, 40, 910);
    x.fillText(String(d.billId || '—').toUpperCase(), W / 2, y); y += 58;
    x.fillStyle = '#f5ead6'; x.font = '700 38px Arial,sans-serif';
    wrap(x, String(d.billTitle || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 50; });
    /* monogram — no photo URLs exist; initials stand in, never hotlinked */
    y = Math.max(590, y + 22);
    var mr = 56;
    x.fillStyle = '#c1121f'; x.beginPath(); x.arc(W / 2, y, mr, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#f5ead6'; x.lineWidth = 4;
    x.beginPath(); x.arc(W / 2, y, mr - 6, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#f5ead6'; x.font = '900 60px "Arial Black",Arial,sans-serif';
    var tb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(initialsOf(d.name), W / 2, y + 3);
    x.textBaseline = tb;
    y += mr + 30;
    /* the shamed — biggest element on the card */
    var fit = fitFont(x, String(d.name || '—').toUpperCase(), 96, 44, 910);
    var lh = Math.round(fit * 0.98);
    x.fillStyle = '#f5ead6';
    wrap(x, String(d.name || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    /* chamber / party / state */
    y += 2;
    x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
    wrap(x, chamberLine(d), 910).slice(0, 1)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    /* the vote — the thumb-stopper, shrink-to-fit single line */
    y = Math.max(930, y + 12);
    var vline = 'VOTED ' + String(d.position || '—').toUpperCase() + ' \u2014 AGAINST THE PROGRESSIVE POSITION';
    x.fillStyle = '#c1121f';
    fitFont(x, vline, 48, 28, 910);
    x.fillText(vline, W / 2, y); y += 50;
    x.fillStyle = '#f5ead6'; x.font = '700 36px Arial,sans-serif';
    wrap(x, 'ON: ' + String(d.question || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    var n = Math.max(0, parseInt(d.againstVotes, 10) || 0);
    x.fillStyle = '#e8b923';
    fitFont(x, n + (n === 1 ? ' VOTE' : ' VOTES') + ' AGAINST THE PROGRESSIVE POSITION', 40, 26, 910);
    x.fillText(n + (n === 1 ? ' VOTE' : ' VOTES') + ' AGAINST THE PROGRESSIVE POSITION', W / 2, y); y += 46;
    /* dates + source, one line each */
    var dz = voteDates(d);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText('VOTED: ' + (dz.length ? dz.join(' \u00b7 ') : '—'), W / 2, y); y += 40;
    x.font = '400 28px Arial,sans-serif';
    var sl = 'SOURCE: ' + shortUrl(d.sourceUrl);
    fitFont(x, sl, 28, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    y = Math.max(1080, y + 6);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
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

  /* ---------------------------------------------------------------- */
  /* Surface 6 — Stock Trades Portfolio Card                             */
  /* ---------------------------------------------------------------- */
  /* "THEIR PORTFOLIO": a member's STOCK Act trade footprint — top tickers
     by trade count, all from the data object (endpoint rows). Amounts are
     RANGES on the tab; the card shows counts and tickers only, never dollar
     figures (no midpoint, no exact). Mandatory verbatim footer (CEO
     2026-10-05) with the actual source links + retrieval date filled in.
     No trade-before-vote inference anywhere on this card. */
  function paintTrades(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'THEIR PORTFOLIO', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 380;
    var name = String(d.name || '—').toUpperCase();
    var fit = fitFont(x, name, 88, 44, 910);
    var lh = Math.round(fit * 0.98);
    x.fillStyle = '#f5ead6';
    wrap(x, name, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    y += 2;
    x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
    wrap(x, chamberLine(d), 910).slice(0, 1)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    /* headline count */
    y = Math.max(620, y + 18);
    var n = Math.max(0, parseInt(d.tradeCount, 10) || 0);
    x.fillStyle = '#e8b923';
    fitFont(x, n + (n === 1 ? ' STOCK ACT TRADE' : ' STOCK ACT TRADES') + ' ON FILE', 54, 34, 910);
    x.fillText(n + (n === 1 ? ' STOCK ACT TRADE' : ' STOCK ACT TRADES') + ' ON FILE', W / 2, y);
    y += 56;
    /* top tickers by trade count (cap 4 — vertical budget) */
    var tks = Array.isArray(d.topTickers) ? d.topTickers.slice(0, 4) : [];
    if (tks.length) {
      x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
      x.fillText('MOST-TRADED:', W / 2, y); y += 44;
      x.font = '900 44px "Arial Black",Arial,sans-serif';
      for (var i = 0; i < tks.length; i++) {
        var tl = String(tks[i].ticker || '—').toUpperCase() + ' \u00d7' + (parseInt(tks[i].n, 10) || 0);
        x.fillStyle = i === 0 ? '#c1121f' : '#f5ead6';
        fitFont(x, tl, 44, 30, 910);
        x.fillText(tl, W / 2, y); y += 56;
      }
    } else {
      x.fillStyle = '#c9bfa8'; x.font = '400 34px Arial,sans-serif';
      x.fillText('NO TICKERED TRADES ON FILE', W / 2, y); y += 50;
    }
    /* date span */
    y = Math.max(950, y + 8);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    var span = (d.dateFrom && d.dateTo)
      ? fullDate(d.dateFrom) + ' \u2014 ' + fullDate(d.dateTo)
      : '—';
    x.fillText('TRADES SPAN: ' + span, W / 2, y); y += 40;
    /* mandatory verbatim footer (CEO 2026-10-05) — sources + date filled in */
    var srcs = Array.isArray(d.sources) ? d.sources : [];
    var surls = srcs.map(function (s) {
      return String(s.url || s.label || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    }).filter(function (u) { return !!u; });
    var foot = 'PUBLIC RECORDS SHOWN SIDE BY SIDE. A CONTRIBUTION/TRADE DOES NOT PROVE IT CAUSED A VOTE. SOURCES: ' + (surls.length ? surls.join(' \u00b7 ').toUpperCase() : '—') + '. FIGURES AS OF ' + (d.asOf ? fullDate(d.asOf).toUpperCase() : '—') + '.';
    y = Math.max(1000, y + 8);
    x.fillStyle = '#c9bfa8'; x.font = '400 24px Arial,sans-serif';
    wrap(x, foot, 910).slice(0, 4)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 34; });
    y = Math.max(1140, y + 8);
    if (cs) y = csLine(cv, x, y, cs) + 8;
    y = Math.max(1185, y);
    bottomStack(x, 'fight');
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Painter table + registration                                       */
  /* ---------------------------------------------------------------- */
  var PAINT = {
    'phq-pressure': paintPressure,
    'phq-prediction': paintPrediction,
    'phq-scorecard': paintScorecard,
    'phq-cellwin': paintCellwin,
    'phq-wallshame': paintWallShame,
    'phq-trades': paintTrades
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
    /* Card kill: ?pf_off=trades-card disables the phq-trades painter only. */
    if (id === 'phq-trades' && PF && PF.skip('trades-card')) return false;
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
      paint: function (id, data) { try { return paintOne(id, data || {}); } catch (e) { return null; } }
    };
  } catch (e) {}
})();
