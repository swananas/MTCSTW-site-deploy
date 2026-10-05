/* core/share-image-phq.js  |  PF v1.4.3 | POLITICAL HQ SHARE POSTERS.
   Six custom PFShare painters (1080x1350, house palette) for the Political HQ
   rollout: pressure-campaign card, prediction-result card, voting scorecard,
   cell-competition winner card, wall-of-shame legislator card,
   follow-the-money card.
   Spec: ~/workspace/hidden/phq-share-specs.md.
   Data contract (painter receives one data object; missing optional fields
   degrade gracefully; scorecard missing fields render '—', never invented):
     pressure:   {title, target, demand, signatures, signaturesGoal}
     prediction: {statement, outcome ('correct'|'missed'), wins, losses}
     scorecard:  {name, state, party, grade, verdict, votes[3] {bill, vote, for_us}}
     cellwin:    {cellName, verified, members, xp, runnerUp, marginXp, mvpCallsign, weekStart}
     wallshame:  {billId, billTitle, name, chamber, party, state, againstVotes,
                  position, question, voteDates[ISO], sourceUrl}
     money:      {bioguideId, name, chamber, party, state, cycle, retrieved,
                  raised, spent, cash, topDonors[3] {name, employer, amount},
                  topIndustries[3] {industry, amount}}
                money prefers top-3 donors; falls back to top-3 industries
                when no donors are reported. Source line always printed.
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
  var IDS = ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-money', 'phq-ledger', 'phq-boycott', 'phq-corp', 'phq-votedonor', 'phq-trades', 'phq-pac'];
  var TITLES = {
    'phq-pressure': 'PRESSURE CAMPAIGN',
    'phq-prediction': 'PREDICTION RESULT',
    'phq-scorecard': 'VOTING SCORECARD',
    'phq-cellwin': 'CELL VICTORY',
    'phq-wallshame': 'WALL OF SHAME',
    'phq-money': 'FOLLOW THE MONEY',
    'phq-ledger': 'THE LEDGER',
    'phq-boycott': 'DONOR BOYCOTT',
    'phq-corp': 'CORPORATE PLAYBOOK',
    'phq-votedonor': 'THE MONEY BEHIND THE VOTE',
    'phq-trades': 'TRADES ON THE HILL',
    'phq-pac': 'SUPER PAC ALERT'
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
    ch = ch === 'house' ? 'U.S. HOUSE' : (ch === 'senate' ? 'U.S. SENATE' : String(d.chamber || '—'));
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
  /* Surface 6 — Follow the Money Card                                  */
  /* ---------------------------------------------------------------- */
  /* Legislator money card: cycle totals, top-3 donors (or top-3 industries
     when no donors are reported), FEC source line with retrieval date.
     Every figure from the data object; missing fields render '—', never
     invented. No causation copy on the card — totals and donor names only. */
  function moneyLine(n) {
    if (n == null || isNaN(Number(n))) return '\u2014';
    return '$' + fmtNum(n);
  }
  function moneyRow(x, label, val, y) {
    var l1 = label + '  ', l2 = String(val);
    x.font = '700 40px Arial,sans-serif';
    var w1 = x.measureText(l1).width;
    x.font = '900 56px "Arial Black",Arial,sans-serif';
    var w2 = x.measureText(l2).width;
    var sx = W / 2 - (w1 + w2) / 2, pa = x.textAlign, pb = x.textBaseline;
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    x.fillText(l1, sx, y);
    x.fillStyle = '#e8b923'; x.font = '900 56px "Arial Black",Arial,sans-serif';
    x.fillText(l2, sx + w1, y);
    x.textAlign = pa; x.textBaseline = pb;
  }
  function moneyEntry(d, isDonor) {
    if (isDonor) {
      var emp = d.employer ? ' (' + String(d.employer) + ')' : '';
      return String(d.name || '\u2014').toUpperCase() + emp.toUpperCase() + ' \u2014 ' + moneyLine(d.amount);
    }
    return String(d.industry || '\u2014').toUpperCase() + ' \u2014 ' + moneyLine(d.amount);
  }
  function paintMoney(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'FOLLOW THE MONEY', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 380;
    var fit = fitFont(x, String(d.name || '\u2014').toUpperCase(), 88, 40, 910);
    var lh = Math.round(fit * 0.98);
    x.fillStyle = '#f5ead6';
    wrap(x, String(d.name || '\u2014').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    y = Math.max(500, y + 8);
    x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
    wrap(x, chamberLine(d), 910).slice(0, 1)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    y += 6;
    x.fillStyle = '#e8b923';
    fitFont(x, String(d.cycle || '\u2014').toUpperCase() + ' CYCLE \u00b7 FEC', 44, 28, 910);
    x.fillText(String(d.cycle || '\u2014').toUpperCase() + ' CYCLE \u00b7 FEC', W / 2, y); y += 52;
    /* cycle totals — the headline of the card */
    y = Math.max(620, y + 40);
    moneyRow(x, 'RAISED', moneyLine(d.raised), y); y += 64;
    moneyRow(x, 'SPENT', moneyLine(d.spent), y); y += 64;
    moneyRow(x, 'CASH ON HAND', moneyLine(d.cash), y); y += 64;
    /* top-3 donors, falling back to top-3 industries */
    var donors = Array.isArray(d.topDonors) ? d.topDonors.slice(0, 3) : [];
    var inds = Array.isArray(d.topIndustries) ? d.topIndustries.slice(0, 3) : [];
    var useDonors = donors.length > 0;
    var rows = useDonors ? donors : inds;
    y = Math.max(880, y + 20);
    x.fillStyle = '#e8b923'; x.font = '700 36px Arial,sans-serif';
    x.fillText(useDonors ? 'TOP DONORS' : 'TOP INDUSTRIES', W / 2, y); y += 50;
    x.textAlign = 'left';
    if (!rows.length) {
      x.fillStyle = '#c9bfa8'; x.font = '400 36px Arial,sans-serif'; x.textAlign = 'center';
      x.fillText('NO DONOR DATA REPORTED', W / 2, y);
      x.textAlign = 'left'; y += 50;
    } else {
      for (var i = 0; i < rows.length; i++) {
        var entry = moneyEntry(rows[i] || {}, useDonors);
        var fs = 34;
        x.font = '400 34px Arial,sans-serif';
        while (fs > 26 && x.measureText(entry).width > 910) {
          fs -= 2; x.font = '400 ' + fs + 'px Arial,sans-serif';
        }
        if (x.measureText(entry).width > 910) {
          while (entry.length > 4 && x.measureText(entry).width > 906) entry = entry.slice(0, -4);
          entry = entry.replace(/\s+$/, '') + '\u2026';
        }
        var tw = x.measureText(entry).width;
        x.fillStyle = '#f5ead6';
        x.fillText(entry, W / 2 - tw / 2, y);
        y += 50;
      }
    }
    x.textAlign = 'center';
    /* source + retrieval date — every number on this card carries its source */
    y = Math.max(1100, y + 10);
    var sl = 'SOURCE: FEC \u00b7 ' + String(d.cycle || '\u2014').toUpperCase() +
      ' CYCLE \u00b7 RETRIEVED ' + fullDate(d.retrieved);
    x.fillStyle = '#c9bfa8';
    fitFont(x, sl, 30, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    y = Math.max(1150, y);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }

  /* ---------------------------------------------------------------- */
  function ledgerDate(iso) {
    var m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '—';
    var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    var mi = parseInt(m[2], 10) - 1;
    if (mi < 0 || mi > 11) return '—';
    return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function ledgerMoneyB(b) {
    var n = Number(b);
    if (!isFinite(n)) return '—';
    return '$' + (Math.round(n * 10) / 10) + 'B';
  }

  function moneyB(v) {
    if (v == null) return '\u2014';
    var n = Number(v);
    if (!isFinite(n)) return '\u2014';
    var sign = n < 0 ? '\u2212' : '';
    var a = Math.abs(n);
    if (a >= 1e9) return sign + '$' + (a / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(1) + 'K';
    return sign + '$' + Math.round(a);
  }

  function ledgerMoney(n) {
    var v = Number(n);
    if (!isFinite(v)) return '—';
    return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function ledgerPct(ratio) {
    var r = Number(ratio);
    if (!isFinite(r) || r < 0) return '—';
    var pct = r * 100;
    if (pct >= 1) return (Math.round(pct * 100) / 100) + '%';
    if (pct >= 0.01) return (Math.round(pct * 1000) / 1000) + '%';
    return pct.toPrecision(2) + '%';
  }

  function paintLedger(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'THE LEDGER', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 380;
    /* rank on the Forbes list */
    var rk = parseInt(d.rank, 10);
    x.fillStyle = '#e8b923'; x.font = '700 38px Arial,sans-serif';
    x.fillText(isFinite(rk) && rk > 0 ? '#' + rk + ' ON THE FORBES 2026 LIST' : 'FORBES 2026 LIST', W / 2, y);
    y += 58;
    /* the billionaire — biggest element on the card */
    x.fillStyle = '#f5ead6';
    fitFont(x, String(d.name || '—').toUpperCase(), 92, 40, 910);
    wrap(x, String(d.name || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 96; });
    /* net worth — the headline number */
    y = Math.max(620, y + 8);
    x.fillStyle = '#f5ead6'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('NET WORTH', W / 2, y); y += 64;
    x.fillStyle = '#e8b923';
    fitFont(x, ledgerMoneyB(d.netWorthB), 120, 60, 910);
    x.fillText(ledgerMoneyB(d.netWorthB), W / 2, y); y += 38;
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText('FORBES ' + ledgerDate(d.netWorthAsOf) + ' SNAPSHOT', W / 2, y); y += 54;
    /* vs */
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('VS.', W / 2, y); y += 56;
    /* political spending */
    var spend = (d.spending == null) ? null : Number(d.spending);
    if (spend != null && isFinite(spend)) {
      x.fillStyle = '#f5ead6'; x.font = '900 40px "Arial Black",Arial,sans-serif';
      x.fillText('SPENT ON FEDERAL ELECTIONS', W / 2, y); y += 58;
      x.fillStyle = '#f5ead6';
      fitFont(x, ledgerMoney(spend), 96, 48, 910);
      x.fillText(ledgerMoney(spend), W / 2, y); y += 38;
      x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
      var cyc = parseInt(d.spendingCycle, 10);
      x.fillText('FEC SCHEDULE A' + (isFinite(cyc) ? ', ' + cyc + ' CYCLE' : '') +
        ' \u00b7 NAME-MATCHED — IDENTITY UNVERIFIED', W / 2, y); y += 48;
      /* the ratio bar — spending as a fraction of net worth, min-width so a
         sliver still reads as a sliver instead of vanishing */
      var ratio = Number(d.ratio);
      var bw = (isFinite(ratio) && ratio > 0) ? Math.max(4, Math.min(880, ratio * 880)) : 0;
      var by = y + 8, bh = 30, bx = (W - 880) / 2;
      x.fillStyle = '#1a1a1a'; x.fillRect(bx, by, 880, bh);
      x.strokeStyle = '#3a3a3a'; x.lineWidth = 2; x.strokeRect(bx, by, 880, bh);
      if (bw > 0) { x.fillStyle = '#c1121f'; x.fillRect(bx, by, bw, bh); }
      y = by + bh + 32;
      x.fillStyle = '#e8b923'; x.font = '700 34px Arial,sans-serif';
      x.fillText(ledgerPct(ratio) + ' OF NET WORTH', W / 2, y); y += 36;
    } else {
      x.fillStyle = '#c9bfa8'; x.font = '400 34px Arial,sans-serif';
      x.fillText('FEC DATA NOT YET LOADED', W / 2, y); y += 44;
      x.font = '400 28px Arial,sans-serif';
      x.fillText('NO FIGURES SHOWN RATHER THAN INVENTED', W / 2, y); y += 56;
    }
    y = Math.max(1080, y + 6);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }

  function paintBoycott(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'FOLLOW THE MONEY', 280, '#e8b923', 40);
    var cs = callsignOf();
    var y = 400;
    /* the employer — biggest element on the card */
    var fit = fitFont(x, String(d.employer || '—').toUpperCase(), 96, 40, 910);
    var lh = Math.round(fit * 0.98);
    x.fillStyle = '#f5ead6';
    wrap(x, String(d.employer || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    /* the money — the thumb-stopper */
    y = Math.max(640, y + 14);
    var amt = fmtNum(parseInt(d.amount, 10) || 0);
    x.fillStyle = '#c1121f';
    fitFont(x, 'EMPLOYEES GAVE ' + amt + ' (FEC)', 56, 30, 910);
    x.fillText('EMPLOYEES GAVE ' + amt + ' (FEC)', W / 2, y); y += 58;
    /* hard copy rule, on the poster itself */
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    wrap(x, 'CORPORATIONS CAN\u2019T DONATE DIRECTLY \u2014 THIS IS EMPLOYEE GIVING', 910)
      .slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 40; });
    /* linked pressure campaign */
    y = Math.max(860, y + 18);
    var ct = String(d.campaignTitle || '').trim();
    if (ct) {
      x.fillStyle = '#e8b923'; x.font = '700 34px Arial,sans-serif';
      x.fillText('NOW PRESSURING THEM VIA', W / 2, y); y += 46;
      x.fillStyle = '#f5ead6';
      fitFont(x, ct.toUpperCase(), 44, 28, 910, '700');
      wrap(x, ct.toUpperCase(), 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
    } else {
      x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
      x.fillText('NO LINKED PRESSURE CAMPAIGN \u2014 YET', W / 2, y); y += 44;
    }
    /* sources */
    y = Math.max(1060, y + 10);
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    var src = 'SOURCE: FEC SCHEDULE A EMPLOYER DATA' +
      (d.cycle ? ' \u00b7 ' + String(d.cycle).toUpperCase() + ' CYCLE' : '');
    fitFont(x, src, 28, 20, 910, '400');
    x.fillText(src, W / 2, y); y += 40;
    y = Math.max(1120, y + 4);
    if (cs) y = csLine(cv, x, y, cs);
    else y = claimLine(x, y);
    bottomStack(x, 'fight');
    return cv;
  }

  function paintCorp(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'THEIR PLAYBOOK', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 400;
    /* the company */
    var who = String(d.ticker || '—').toUpperCase() +
      (d.year == null ? '' : ' · FY ' + String(d.year));
    x.fillStyle = '#f5ead6';
    fitFont(x, who, 88, 40, 910);
    x.fillText(who, W / 2, y); y += 56;
    x.fillStyle = '#c9bfa8'; x.font = '700 38px Arial,sans-serif';
    wrap(x, String(d.name || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 50; });
    /* buybacks vs taxes paid — side by side, the thumb-stopper */
    y = Math.max(590, y + 24);
    var colW = 440, lx = W / 2 - colW / 2 - 20, rx = W / 2 + colW / 2 + 20;
    x.textAlign = 'center';
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    x.fillText('STOCK BUYBACKS', lx, y);
    x.fillText('INCOME TAXES PAID', rx, y); y += 76;
    x.font = '900 76px "Arial Black",Arial,sans-serif';
    var bb = moneyB(d.buybacks), tp = moneyB(d.taxPaid);
    if (bb.length > 8) { x.font = '900 60px "Arial Black",Arial,sans-serif'; }
    x.fillStyle = '#f5ead6'; x.fillText(bb, lx, y);
    x.font = '900 76px "Arial Black",Arial,sans-serif';
    if (tp.length > 8) { x.font = '900 60px "Arial Black",Arial,sans-serif'; }
    x.fillStyle = '#c1121f'; x.fillText(tp, rx, y);
    y += 40;
    x.fillStyle = '#8a8272'; x.font = '400 26px Arial,sans-serif';
    x.fillText('SEC EDGAR · FY ' + String(d.year == null ? '—' : d.year), lx, y);
    x.fillText('SEC EDGAR · FY ' + String(d.year == null ? '—' : d.year), rx, y);
    /* effective rate — big gold */
    y += 70;
    var er = d.effectiveRate == null || !isFinite(Number(d.effectiveRate))
      ? '—' : (Number(d.effectiveRate) * 100).toFixed(1) + '%';
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    x.fillText('EFFECTIVE TAX RATE', W / 2, y); y += 66;
    x.fillStyle = '#e8b923';
    fitFont(x, er, 80, 40, 910);
    x.fillText(er, W / 2, y); y += 34;
    x.fillStyle = '#8a8272'; x.font = '400 26px Arial,sans-serif';
    x.fillText('TAXES PAID ÷ PRETAX INCOME · SEC EDGAR', W / 2, y);
    /* lobbying spend */
    y += 62;
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    x.fillText('LOBBYING SPEND', W / 2, y); y += 56;
    x.fillStyle = '#f5ead6';
    fitFont(x, moneyB(d.lobbyingSpend), 68, 36, 910);
    x.fillText(moneyB(d.lobbyingSpend), W / 2, y); y += 34;
    x.fillStyle = '#8a8272'; x.font = '400 26px Arial,sans-serif';
    x.fillText('LDA LD-2 FILINGS · ' + String(d.year == null ? '—' : d.year) + ' · AS-FILED ESTIMATE', W / 2, y);
    /* price-hike honest empty state — never a number, single line */
    y += 38;
    var pl = 'PRICE HIKES: NO PUBLIC PER-COMPANY SOURCE. SHOWN: WHAT FILINGS PROVE.';
    x.fillStyle = '#8a8272'; x.font = '400 24px Arial,sans-serif';
    fitFont(x, pl, 24, 17, 910, '400');
    x.fillText(pl, W / 2, y); y += 36;
    /* sources footer */
    var sl = String(d.sourceLine || 'SOURCES: PUBLIC FILINGS').toUpperCase();
    x.font = '400 22px Arial,sans-serif';
    fitFont(x, sl, 22, 15, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }


  function paintVoteDonor(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'THE MONEY BEHIND THE VOTE', 280, '#f5ead6', 36);
    var cs = callsignOf();
    var y = 400;
    /* the bill */
    x.fillStyle = '#e8b923';
    fitFont(x, String(d.billId || '\u2014').toUpperCase(), 64, 40, 910);
    x.fillText(String(d.billId || '\u2014').toUpperCase(), W / 2, y); y += 58;
    x.fillStyle = '#f5ead6'; x.font = '700 36px Arial,sans-serif';
    wrap(x, String(d.billTitle || '\u2014').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
    /* the funded rows — BE copy verbatim ("received $X from [industry]") */
    y = Math.max(640, y + 18);
    var rows = Array.isArray(d.rows) ? d.rows.slice(0, 4) : [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      x.fillStyle = '#f5ead6'; x.font = '900 44px "Arial Black",Arial,sans-serif';
      var nm = String(r.name || '\u2014').toUpperCase();
      fitFont(x, nm, 44, 28, 910);
      x.fillText(nm, W / 2, y); y += 52;
      x.fillStyle = '#c1121f'; x.font = '700 36px Arial,sans-serif';
      wrap(x, String(r.copy || '').toUpperCase(), 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 44; });
      y += 14;
    }
    /* correlation line — legally safe, always present */
    y = Math.max(1050, y + 6);
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    wrap(x, 'DONATIONS AND VOTES ARE SEPARATE PUBLIC RECORDS. DONATIONS DON\u2019T PROVE MOTIVE \u2014 THEY SHOW WHO\u2019S IN THE ROOM.', 910).slice(0, 3)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 38; });
    /* source */
    var sl = 'SOURCE: ' + String(d.source || 'FEC') + ' \u00b7 ' + String(d.cycle || '').toUpperCase() + ' CYCLE';
    x.font = '400 28px Arial,sans-serif';
    fitFont(x, sl, 28, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    y = Math.max(1150, y);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }

  function paintTrades(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'TRADES ON THE HILL', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 400;
    x.fillStyle = '#f5ead6';
    fitFont(x, String(d.name || '\u2014').toUpperCase(), 88, 40, 910);
    wrap(x, String(d.name || '\u2014').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 92; });
    y = Math.max(600, y + 12);
    var trades = Array.isArray(d.trades) ? d.trades.slice(0, 5) : [];
    for (var i = 0; i < trades.length; i++) {
      var t = trades[i] || {};
      var line = String(t.ticker || '\u2014').toUpperCase() + ' \u2014 ' +
        String(t.type || '').toUpperCase() + ' ' + String(t.amount_range || '');
      x.fillStyle = '#e8b923'; x.font = '700 40px Arial,sans-serif';
      fitFont(x, line, 40, 26, 910);
      x.fillText(line, W / 2, y); y += 56;
    }
    y = Math.max(1050, y + 6);
    var sl = 'SOURCE: ' + String(d.source || 'HOUSE/SENATE FINANCIAL DISCLOSURES');
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    fitFont(x, sl, 28, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    y = Math.max(1150, y);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }

  function paintPac(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'SUPER PAC ALERT', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 400;
    var alerts = Array.isArray(d.alerts) ? d.alerts.slice(0, 3) : [];
    for (var i = 0; i < alerts.length; i++) {
      var a = alerts[i] || {};
      x.fillStyle = '#c1121f'; x.font = '900 40px "Arial Black",Arial,sans-serif';
      x.fillText('NEW FILING', W / 2, y); y += 52;
      x.fillStyle = '#e8b923';
      fitFont(x, moneyLine(a.amount), 110, 56, 910);
      x.fillText(moneyLine(a.amount), W / 2, y); y += 120;
      x.fillStyle = '#f5ead6'; x.font = '700 38px Arial,sans-serif';
      wrap(x, String(a.pac_name || '\u2014').toUpperCase(), 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
      y += 24;
    }
    y = Math.max(1050, y);
    var sl = 'SOURCE: ' + String(d.source || 'FEC');
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    fitFont(x, sl, 28, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    y = Math.max(1150, y);
    if (cs) y = csLine(cv, x, y, cs);
    bottomStack(x, 'fight');
    return cv;
  }

  /* Painter table + registration                                       */
  /* ---------------------------------------------------------------- */
  var PAINT = {
    'phq-pressure': paintPressure,
    'phq-prediction': paintPrediction,
    'phq-scorecard': paintScorecard,
    'phq-cellwin': paintCellwin,
    'phq-wallshame': paintWallShame,
    'phq-money': paintMoney,
    'phq-ledger': paintLedger,
    'phq-boycott': paintBoycott,
    'phq-corp': paintCorp,
    'phq-votedonor': paintVoteDonor,
    'phq-trades': paintTrades,
    'phq-pac': paintPac
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
      paint: function (id, data) { try { return paintOne(id, data || {}); } catch (e) { return null; } }
    };
  } catch (e) {}
})();
