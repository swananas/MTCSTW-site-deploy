/* core/share-image-phq.js  |  PF v1.4.3 | PHQ SHARE POSTERS (CONSOLIDATED).
   THE canonical PHQ painter registry. Twenty-three custom PFShare painters
   (1080x1350, house palette) merged from the ~14 divergent branch copies
   (2026-10-05 consolidation, fe/phq-share-consolidation). Registration is
   ADDITIVE — this file never reassigns PF.PHQShare; painters register via
   PF.PHQShare.registerPainters(). The old share-image-phq-kits.js module is
   retired; its painters (phq-bill, phq-urgency) register here.
   LAZY-LOAD: this module is NOT in the page bundle. The ~1.5KB stub
   core/share-image-phq-lazy.js ships in pages/bundle-pages, creates the
   facade, and injects this file on the first share/save/paint call.
   Facade contract (created exactly once — by the stub in the bundle, or by
   this module in standalone mode under the window.pfPhqShareDone guard):
     PF.PHQShare.registerPainters({id: fn}, {id: 'TITLE'})  additive
     PF.PHQShare.ids                                        union of registered ids
     PF.PHQShare.share(id, data, opts)  -> bool (false on unknown id)
     PF.PHQShare.save(id, data, opts)   -> bool (false on unknown id)
     PF.PHQShare.paint(id, data)        -> canvas | null (null on unknown id)
     PF.PHQShare.pledgeData(ballotRow)  -> pledge data | null
   share/save route through PFShare.shareImage/saveImage, so the
   callsign-claim gate, the idempotent stamp, and the pf-share-image credit
   ride along. The caller's opts are forwarded untouched — the campaign-kit
   silo passes {noCredit:true} (Economy Desk 0-XP ruling, 2026-10-05) and
   PFShare honors it.
   Painters are pure: (data, canvas, ctx) -> canvas | null. Exceptions are
   caught at paintOne -> null; the caller toasts 'Poster failed — try again.'
   Data contract (painter receives one data object; missing optional fields
   degrade gracefully; missing fields render '—', never invented):
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
                 Use PF.PHQShare.pledgeData(ballotRow) to build the data object.
     racecall:   {state, office, winner, winnerParty?, loser?, loserParty?,
                 source, calledAt?} — winner announcement card.
     race:       {district, state, chamber, rating, candidates[4] {name, party},
                 stale?, source?} — pre-election race-watch card.
     wallshame:  legislator wall-of-shame card (votes + donor money side by side).
     pac:        {state, district?, cycle, amount, spender, supportOppose
                 ('SUPPORT'|'OPPOSE'), target, baseline ('none'|...),
                 spikeMultiple?, source, sourceDate?} — super-PAC money bomb.
     trades:     {name, tradeCount, topTickers[4] {ticker, n}, dateFrom?,
                 dateTo?, sources[] {url|label}, asOf?} — STOCK Act portfolio.
     billstatus: {billNo, billTitle, status, stuckAt?, source?, sourceDate?}.
     nonprofit:  movement-ally spotlight card.
     pollresults:{poll question + results}.
     repcontact: {rep, action taken} — "I TOOK ACTION" card.
     money:      {name, chamber?, cycle, raised, spent, cash,
                 topDonors[3]? | topIndustries[3]?, retrieved?} — legislator
                 money card; donor names only, no causation copy.
     ledger:     {rank?, name, netWorthB, netWorthAsOf, spending?, spendingCycle?,
                 ratio?} — billionaire ledger card.
     boycott:    {employer, amount, campaignTitle?, cycle?} — donor boycott card.
     corp:       {ticker, name?, year?, buybacks, taxPaid, effectiveRate?,
                 lobbyingSpend?, sourceLine?} — corporate playbook card.
     votedonor:  {billId, billTitle, rows[4] {name, copy}, source?, cycle?} —
                 the money behind the vote; legally-safe correlation line.
     bill:       {billNo, billTitle, status, stuckAt?, sourceUrl?, sourceDate?,
                 generatedAt?} — campaign-kit bill poster.
     urgency:    {title, daysRemaining, endsAt, generatedAt?} — campaign-kit
                 countdown poster.
   Callsigns resolve at paint time via callsignOf() (identity store /
   PFCallsign) — never passed in data. Painters that render the callsign
   inline set cv._pfStamped = true so PFShare.stampCallsign stays a no-op
   safety net. No-callsign fallback: skip the stamp strip and swap the
   recruit/challenge line to CLAIM YOUR CALLSIGN AT MTCSTW.COM.
   Consumer contract for PHQ silos:
     PF.PHQShare.share('phq-pressure', {...})  -> share sheet / download
     PF.PHQShare.save('phq-scorecard', {...})   -> save to phone
     PF.PHQShare.paint('phq-cellwin', {...})    -> raw canvas (previews/tests)
   KILL: ?pf_off=phq-share kills the module (first executable line below).
   Per-painter: ?pf_off=phq-<painter> excludes that id at registration.
   (The retired 'trades-card' kill alias from the stock-trades branch is gone;
   use ?pf_off=phq-trades.)
   Spec: ~/workspace/hidden/design-team/design-system-spec-20261005.md §3. */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip('phq-share')) { return; }
  if (window.pfPhqShareDone) return;
  window.pfPhqShareDone = true;

  var W = 1080, H = 1350;
  var IDS = ['phq-pressure', 'phq-prediction', 'phq-predict-call', 'phq-scorecard', 'phq-cellwin', 'phq-ballot', 'phq-pledge',
    'phq-racecall',
    'phq-pac',
    'phq-wallshame',
    'phq-trades',
    'phq-bill-status',
    'phq-race',
    'phq-poll-results',
    'phq-rep-contact',
    'phq-nonprofit',
    'phq-money',
    'phq-ledger',
    'phq-boycott',
    'phq-corp',
    'phq-votedonor',
    'phq-bill',
    'phq-urgency',
    'phq-index-score',
    'phq-petition'];
  var TITLES = {
    'phq-pressure': 'PRESSURE CAMPAIGN',
    'phq-prediction': 'PREDICTION RESULT',
    'phq-predict-call': 'MY CALL',
    'phq-scorecard': 'VOTING SCORECARD',
    'phq-cellwin': 'CELL VICTORY',
    'phq-ballot': 'BALLOT COUNTDOWN',
    'phq-pledge': 'VOTER PLEDGE',
    'phq-racecall': 'RACE CALLED',
    'phq-pac': 'MONEY BOMB',
    'phq-wallshame': 'WALL OF SHAME',
    'phq-trades': 'THEIR PORTFOLIO',
    'phq-bill-status': 'BILL STATUS',
    'phq-race': 'RACE WATCH',
    'phq-poll-results': 'POLL RESULTS',
    'phq-rep-contact': 'I TOOK ACTION',
    'phq-nonprofit': 'MOVEMENT ALLY',
    'phq-money': 'FOLLOW THE MONEY',
    'phq-ledger': 'THE LEDGER',
    'phq-boycott': 'DONOR BOYCOTT',
    'phq-corp': 'CORPORATE PLAYBOOK',
    'phq-votedonor': 'THE MONEY BEHIND THE VOTE',
    'phq-bill': 'BILL POSTER',
    'phq-urgency': 'URGENCY POSTER',
    'phq-index-score': 'CAPTURE SCORE',
    'phq-petition': 'PETITION SHARE KIT'
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
  /* BUTTER PASS (2026-10-07): editorial ground — ink-black gradient,
     soft top-light vignette, red gradient hairline. Visual-only. */
  var BUTTER_SERIF = 'Georgia,"Times New Roman",serif';
  function butterRedHair(x, y, inset, hgt) {
    var rg = x.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, 'rgba(193,18,31,0)'); rg.addColorStop(0.5, '#c1121f'); rg.addColorStop(1, 'rgba(193,18,31,0)');
    x.fillStyle = rg; x.fillRect(inset || 86, y, W - 2 * (inset || 86), hgt || 5);
  }
  function base(x) {
    var bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#131316'); bg.addColorStop(0.5, '#0a0a0c'); bg.addColorStop(1, '#060607');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    var vg = x.createRadialGradient(W / 2, H * 0.3, 90, W / 2, H / 2, H * 0.62);
    vg.addColorStop(0, 'rgba(245,234,214,0.035)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    butterRedHair(x, 32, 86, 5);
    x.strokeStyle = '#33302a'; x.lineWidth = 2; x.strokeRect(52, 52, W - 104, H - 104);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  }
  function kicker(x) {
    /* letterspaced authority masthead with flanking red diamonds */
    x.fillStyle = '#c9bfa8'; x.font = '700 30px Arial,sans-serif';
    var tw = spaced(x, 'THE PROPAGANDA FACTORY', W / 2, 140, 10);
    x.fillStyle = '#c1121f';
    [[W / 2 - tw / 2 - 48, 140], [W / 2 + tw / 2 + 48, 140]].forEach(function (pp) {
      x.save(); x.translate(pp[0], pp[1] - 9); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore();
    });
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
    var tw = spaced(x, text, W / 2, y, 8);
    x.fillStyle = '#c1121f';
    x.fillRect(W / 2 - tw / 2 - 22, y - 58, tw + 44, 3);
    x.fillRect(W / 2 - tw / 2 - 22, y + 24, tw + 44, 3);
  }
  /* Shrink-to-fit for single-line display type: steps down from base px to
     min px until the text fits maxW. */
  /* BUTTER PASS: fitFont paints display type in the serif headline
     family (900-weight calls); 400/700-weight calls stay tracked sans. */
  function fitFont(x, text, basePx, minPx, maxW, weight) {
    var s = basePx, w = weight || '900';
    var serif = /^9/.test(w);
    var setF = function (sz) {
      x.font = serif ? ('bold ' + sz + 'px ' + BUTTER_SERIF)
                     : (w + ' ' + sz + 'px Arial,sans-serif');
    };
    setF(s);
    while (s > minPx && x.measureText(text).width > maxW) {
      s -= 4;
      setF(s);
    }
    return s;
  }
  /* serif headline setter for direct (non-fit) hero lines */
  function headFont(x, px) { x.font = 'bold ' + px + 'px ' + BUTTER_SERIF; }
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
    var fg = x.createLinearGradient(0, 0, W, 0);
    fg.addColorStop(0, 'rgba(201,191,168,0)'); fg.addColorStop(0.5, '#5a5344'); fg.addColorStop(1, 'rgba(201,191,168,0)');
    x.fillStyle = fg; x.fillRect(172, H - 208, W - 344, 2);
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    spaced(x, DEEP, W / 2, H - 158, 8);
    if (ctaMode === 'cell') {
      button(x, 'JOIN MY CELL / BUILD YOUR CELL', H - 84, 42);
    } else {
      x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
      x.fillText('JOIN THE FIGHT.', W / 2, H - 84);
    }
    x.fillStyle = '#8a8271'; x.font = '400 28px Arial,sans-serif';
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
  /* ---------------------------------------------------------------- */
  /* Grafted helpers (2026-10-05 consolidation) — one copy, shared by  */
  /* the merged painters. Each kept from the donor branch noted.       */
  /* ---------------------------------------------------------------- */
  /* from fe/election-live-mode */
  function callTime(ts) {
    try {
      var dd = new Date(Number(ts));
      if (isNaN(dd.getTime())) return '';
      var s = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago',
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(dd);
      return s.toUpperCase() + ' CT';
    } catch (e) { return ''; }
  }
  /* from fe/stock-trades */
  function initialsOf(name) {
    var p = String(name || '').trim().split(/\s+/).filter(function (w) { return !!w; });
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
  }
  /* from fe/stock-trades */
  function chamberLine(d) {
    var ch = String(d.chamber || '').toLowerCase();
    ch = (ch === 'house' || ch === 'rep') ? 'U.S. HOUSE'
      : ((ch === 'senate' || ch === 'sen') ? 'U.S. SENATE' : String(d.chamber || '—'));
    return (ch + ' \u00b7 ' + String(d.party || '—') + ' \u00b7 ' + String(d.state || '—')).toUpperCase();
  }
  /* from fe/stock-trades */
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
  /* from fe/stock-trades */
  function voteDates(d) {
    var out = [], seen = {}, vs = Array.isArray(d.voteDates) ? d.voteDates : [];
    for (var i = 0; i < vs.length && out.length < 3; i++) {
      var k = String(vs[i] || '');
      if (k && !seen[k]) { seen[k] = 1; out.push(fullDate(k)); }
    }
    return out;
  }
  /* from fe/stock-trades */
  function shortUrl(u) {
    var s = String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return (s || '—').toUpperCase().slice(0, 52);
  }
  /* from fe/studio-painters */
  function goldBar(x, text, cy) {
    fitFont(x, text, 34, 22, 920);
    var tw = x.measureText(text).width + 70;
    x.fillStyle = '#e8b923'; x.fillRect(W / 2 - tw / 2, cy - 46, tw, 62);
    x.fillStyle = '#0d0d0d'; x.textAlign = 'center';
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(text, W / 2, cy - 14);
    x.textBaseline = pb;
    return cy + 40;
  }
  /* from fe/studio-painters */
  function staleBanner(x, cy) {
    return goldBar(x, '! DATA MAY BE OUTDATED !', cy);
  }
  /* from fe/studio-painters */
  function movedBanner(x, cy, oldStage, stage) {
    return goldBar(x, 'JUST MOVED \u2014 ' +
      String(oldStage == null ? '—' : oldStage).toUpperCase() +
      ' \u2192 ' + String(stage == null ? '—' : stage).toUpperCase(), cy);
  }
  /* from fe/money-page */
  function moneyLine(n) {
    if (n == null || isNaN(Number(n))) return '\u2014';
    return '$' + fmtNum(n);
  }
  /* from fe/money-page */
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
  /* from fe/money-page */
  function moneyEntry(d, isDonor) {
    if (isDonor) {
      var emp = d.employer ? ' (' + String(d.employer) + ')' : '';
      return String(d.name || '\u2014').toUpperCase() + emp.toUpperCase() + ' \u2014 ' + moneyLine(d.amount);
    }
    return String(d.industry || '\u2014').toUpperCase() + ' \u2014 ' + moneyLine(d.amount);
  }
  /* from fe/money-page */
  function ledgerDate(iso) {
    var m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '—';
    var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    var mi = parseInt(m[2], 10) - 1;
    if (mi < 0 || mi > 11) return '—';
    return MON[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }
  /* from fe/money-page */
  function ledgerMoneyB(b) {
    var n = Number(b);
    if (!isFinite(n)) return '—';
    return '$' + (Math.round(n * 10) / 10) + 'B';
  }
  /* from fe/money-page */
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
  /* from fe/money-page */
  function ledgerMoney(n) {
    var v = Number(n);
    if (!isFinite(v)) return '—';
    return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* from fe/money-page */
  function ledgerPct(ratio) {
    var r = Number(ratio);
    if (!isFinite(r) || r < 0) return '—';
    var pct = r * 100;
    if (pct >= 1) return (Math.round(pct * 100) / 100) + '%';
    if (pct >= 0.01) return (Math.round(pct * 1000) / 1000) + '%';
    return pct.toPrecision(2) + '%';
  }
  /* from fe/campaign-share-kits */
  function srcStamp(v) {
    var s = String(v == null ? '' : v).trim();
    return (s || '—').toUpperCase().slice(0, 48);
  }
  /* from fe/campaign-share-kits */
  function sourceFooter(x, d, floorY) {
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#c9bfa8'; x.font = '400 26px Arial,sans-serif';
    var lines = wrap(x, 'SRC: ' + srcStamp(d.sourceUrl), 910).slice(0, 2);
    var meta = 'PULLED ' + srcStamp(d.sourceDate) + ' · KIT ' + srcStamp(d.generatedAt);
    /* Stack bottom-up: the last line lands at y=1180, keeping the 1185+
       bottom-stack gap clean no matter how many source lines wrap. */
    var total = lines.length + 1;
    var y = 1180 - (total - 1) * 34;
    if (floorY != null && y < floorY && lines.length > 1) {
      lines = lines.slice(0, 1);
      y = 1180 - 34;
    }
    for (var i = 0; i < lines.length; i++) { x.fillText(lines[i], W / 2, y); y += 34; }
    x.fillText(meta, W / 2, y);
  }
  /* Surface 1 — Pressure Campaign Card                                */
  /* ---------------------------------------------------------------- */
  function paintPressure(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'PRESSURE CAMPAIGN', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 396;
    x.fillStyle = '#c1121f';
    var tlh = 84;
    headFont(x, 76);
    var tl = wrap(x, String(d.title || 'UNTITLED CAMPAIGN').toUpperCase(), 910);
    if (tl.length > 2) { /* shrink 76 -> 64 before truncating (spec §5.4) */
      headFont(x, 64); tlh = 74;
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
    x.fillStyle = '#f5ead6'; headFont(x, 64);
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
    x.fillStyle = '#f5ead6'; headFont(x, 64);
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
    x.fillStyle = '#f5ead6'; headFont(x, 64);
    wrap(x, name + ' ' + sub, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 76; });
    /* The grade — biggest element on the card. F/D red, C gold, B/A cream. */
    var g = String(d.grade || '—').toUpperCase().charAt(0);
    var gc = (g === 'F' || g === 'D') ? '#c1121f' : (g === 'C' ? '#e8b923' : (g === 'B' || g === 'A' ? '#f5ead6' : '#c9bfa8'));
    x.fillStyle = gc; headFont(x, 220);
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
    x.fillStyle = '#c1121f'; headFont(x, 120);
    x.fillText('VICTORY', W / 2, 400);
    var y = 540;
    x.fillStyle = '#f5ead6'; headFont(x, 72);
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
      headFont(x, 120);
      x.fillText('NO DEADLINE', W / 2, y); y += 140;
      x.fillStyle = '#f5ead6'; x.font = '700 52px Arial,sans-serif';
      wrap(x, 'REGISTER AT THE POLLS IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else if (dl === 0) {
      x.fillStyle = '#c1121f';
      headFont(x, 170);
      x.fillText('TODAY', W / 2, y); y += 190;
      x.fillStyle = '#f5ead6'; x.font = '700 52px Arial,sans-serif';
      wrap(x, 'LAST DAY TO REGISTER IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else if (dl !== null && dl > 0) {
      x.fillStyle = '#c1121f';
      headFont(x, 300);
      x.fillText(String(dl), W / 2, y); y += 320;
      x.fillStyle = '#f5ead6'; headFont(x, 84);
      x.fillText(dl === 1 ? 'DAY LEFT' : 'DAYS LEFT', W / 2, y); y += 110;
      x.font = '700 52px Arial,sans-serif';
      wrap(x, 'TO REGISTER IN ' + sName, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 64; });
      y += 24;
    } else {
      /* Missing deadline data: honest degrade, nothing invented. */
      x.fillStyle = '#e8b923';
      headFont(x, 84);
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
    x.fillStyle = '#c1121f'; headFont(x, 118);
    x.fillText("I'M IN.", W / 2, 424);
    fitFont(x, st, 84, 44, 920, '900');
    x.fillStyle = '#f5ead6';
    x.fillText(st, W / 2, 548);
    var y = 668;
    if (left === 'sameday') {
      /* Same-day registration state: the correct variant, never fake urgency. */
      x.fillStyle = '#c1121f'; headFont(x, 62);
      x.fillText('REGISTER AT THE POLLS', W / 2, y); y += 84;
      x.fillStyle = '#f5ead6'; x.font = '700 42px Arial,sans-serif';
      var sdl = wrap(x, 'SAME-DAY REGISTRATION IN ' + st, 920).slice(0, 2);
      for (var si = 0; si < sdl.length; si++) { x.fillText(sdl[si], W / 2, y); y += 56; }
    } else if (left === 0) {
      x.fillStyle = '#c1121f'; headFont(x, 56);
      var tdl = wrap(x, 'TODAY IS THE LAST DAY TO REGISTER', 920).slice(0, 2);
      for (var ti = 0; ti < tdl.length; ti++) { x.fillText(tdl[ti], W / 2, y); y += 68; }
    } else {
      x.fillStyle = '#f5ead6'; headFont(x, 54);
      x.fillText('REGISTER BY ' + pledgeFmtLong(d.deadline), W / 2, y); y += 78;
      x.fillStyle = '#c1121f'; headFont(x, 64);
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
  /* ---------------------------------------------------------------- */
  /* Merged painters (2026-10-05 consolidation)                         */
  /* ---------------------------------------------------------------- */
  /* Race Called Card (election-live) — id phq-racecall */
  function paintRacecall(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'RACE CALLED', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var head = (String(d.state || '').toUpperCase()
      + ' \u2014 ' + String(d.office || '').toUpperCase().replace(/^U\.S\.\s*/, '')).trim();
    x.fillStyle = '#f5ead6'; headFont(x, 56);
    var y = 400;
    wrap(x, head === '\u2014' ? '—' : head, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 68; });
    /* Winner stamp — the rotated verdict treatment from the prediction card. */
    var wtext = '\u2713 ' + String(d.winner || '—').toUpperCase();
    fitFont(x, wtext, 100, 64, 910);
    x.save();
    x.translate(W / 2, 640); x.rotate(-8 * Math.PI / 180);
    x.fillStyle = '#c1121f';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(wtext, 0, 0);
    x.restore();
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    y = 800;
    if (d.winnerParty) {
      x.fillStyle = '#e8b923'; x.font = '700 44px Arial,sans-serif';
      x.fillText('(' + String(d.winnerParty).toUpperCase() + ')', W / 2, y); y += 56;
    }
    if (d.loser) {
      x.fillStyle = '#c9bfa8'; x.font = '400 40px Arial,sans-serif';
      var lline = 'DEFEATED: ' + String(d.loser).toUpperCase()
        + (d.loserParty ? ' (' + String(d.loserParty).toUpperCase() + ')' : '');
      wrap(x, lline, 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 50; });
    }
    y = Math.max(980, y + 20);
    /* Honesty line: who called it, when. Never blank on source. */
    var hline = 'CALLED BY ' + String(d.source || '—').toUpperCase();
    var ct = callTime(d.calledAt);
    if (ct) hline += ' \u00b7 ' + ct;
    x.fillStyle = '#f5ead6'; x.font = '700 36px Arial,sans-serif';
    wrap(x, hline, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    y = Math.max(1080, y + 10);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    bottomStack(x, 'fight');
    return cv;
  }
  /* Super PAC Money Bomb Card (superpac-alerts) — id phq-pac */
  function paintPac(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'MONEY BOMB', 280, '#c1121f', 40);
    var cs = callsignOf();
    var y = 400;
    /* the district — the race */
    var geo = String(d.state || '—').toUpperCase() + (d.district ? '-' + String(d.district).toUpperCase() : '');
    x.fillStyle = '#e8b923';
    fitFont(x, geo, 64, 40, 910);
    x.fillText(geo, W / 2, y); y += 58;
    x.fillStyle = '#c9bfa8'; x.font = '700 34px Arial,sans-serif';
    x.fillText(String(d.cycle || '—').toUpperCase() + ' CYCLE', W / 2, y); y += 66;
    /* the amount — the thumb-stopper */
    var amt = fmtNum(Math.round(Number(d.amount) || 0));
    x.fillStyle = '#c1121f';
    fitFont(x, '$' + amt, 150, 60, 910);
    x.fillText('$' + amt, W / 2, y); y += 120;
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('INDEPENDENT EXPENDITURES — LAST 30 DAYS', W / 2, y); y += 60;
    /* the spender */
    y = Math.max(760, y + 10);
    var fit = fitFont(x, String(d.spender || '—').toUpperCase(), 72, 36, 910);
    var lh = Math.round(fit * 0.98);
    x.fillStyle = '#f5ead6';
    wrap(x, String(d.spender || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    /* target + support/oppose */
    y += 8;
    var so = String(d.supportOppose || '').toUpperCase() === 'OPPOSE' ? 'OPPOSES' : 'SUPPORTS';
    x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
    wrap(x, so + ' ' + String(d.target || '—').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    /* the multiple — the story */
    y = Math.max(1010, y + 12);
    var mline = d.baseline === 'none'
      ? 'NEW SPENDER — NO PRIOR-CYCLE BASELINE'
      : (d.spikeMultiple == null ? '—'
        : Number(d.spikeMultiple).toFixed(1) + '\u00d7 THE OLD DAILY PACE');
    x.fillStyle = '#e8b923';
    fitFont(x, mline, 44, 26, 910);
    x.fillText(mline, W / 2, y); y += 48;
    /* source + date */
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    var sl = 'SOURCE: FEC — INDEPENDENT EXPENDITURES (SCHEDULE E)';
    fitFont(x, sl, 28, 20, 910, '400');
    x.fillText(sl, W / 2, y); y += 40;
    x.fillText('RETRIEVED ' + String(d.sourceDate || '—').toUpperCase(), W / 2, y); y += 40;
    y = Math.max(1150, y + 6);
    if (cs) y = csLine(cv, x, y, cs);
    else y = claimLine(x, y); /* no-callsign: recruit strip becomes the funnel */
    bottomStack(x, 'fight');
    return cv;
  }
  /* Petition Share Kit (political-hq) — id phq-petition.
     1080x1350, red headline, target/demand strips, gold tally + progress
     bar, LIVE COUNT launch-date source line, callsign stamp, ADD MY NAME
     CTA, JOIN THE FIGHT. standard. Sig counts are painted from the live
     kit payload, never invented. */
  function paintPetition(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'PETITION \u2014 SHARE KIT', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 396;
    x.fillStyle = '#c1121f';
    var tlh = 84;
    x.font = '900 76px "Arial Black",Arial,sans-serif';
    var tl = wrap(x, String(d.title || 'UNTITLED PETITION').toUpperCase(), 910);
    if (tl.length > 2) {
      x.font = '900 64px "Arial Black",Arial,sans-serif'; tlh = 74;
      tl = wrap(x, String(d.title || 'UNTITLED PETITION').toUpperCase(), 910);
    }
    tl = tl.slice(0, 3);
    for (var i = 0; i < tl.length; i++) { x.fillText(tl[i], W / 2, y); y += tlh; }
    y = Math.max(700, y + 24);
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    wrap(x, 'TARGET: ' + String(d.target || '\u2014').toUpperCase(), 910).slice(0, 1)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 56; });
    y += 12;
    x.fillStyle = '#c9bfa8'; x.font = '400 38px Arial,sans-serif';
    wrap(x, 'DEMAND: ' + String(d.demand || d.title || '\u2014').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 48; });
    y = Math.max(930, y + 30);
    var sig = Math.max(0, parseInt(d.sigCount, 10) || 0);
    var goal = Math.max(0, parseInt(d.goal, 10) || 0);
    var tally = fmtNum(sig) + ' SIGNATURES' + (goal > 0 ? ' \u2014 ' + fmtNum(Math.max(0, goal - sig)) + ' TO GO' : '');
    x.fillStyle = '#e8b923';
    fitFont(x, tally, 64, 40, 910);
    x.fillText(tally, W / 2, y); y += 44;
    var frac = goal > 0 ? Math.min(1, sig / goal) : 1;
    x.fillStyle = '#f5ead6'; x.fillRect(190, y, 700, 26);
    x.fillStyle = '#c1121f'; x.fillRect(190, y, Math.round(700 * frac), 26);
    y += 26 + 40;
    /* Source line: the kit is only as fresh as its data — launch date. */
    x.fillStyle = '#c9bfa8'; x.font = '400 28px Arial,sans-serif';
    var src = 'LIVE COUNT \u2014 LAUNCHED ' + String(d.sourceDate || '').toUpperCase();
    fitFont(x, src, 28, 22, 910, '400');
    x.fillText(src, W / 2, y); y += 36;
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else y = claimLine(x, y) + 50; /* no-callsign: the recruit line becomes the funnel */
    button(x, 'ADD MY NAME', 1130, 40);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Wall of Shame Card (superpac-alerts) — id phq-wallshame */
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
    x.fillStyle = '#f5ead6'; headFont(x, 60);
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
  /* Stock Trades Card (stock-trades) — id phq-trades */
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
  /* Bill Status Card (studio) — id phq-bill-status */
  function paintBillStatus(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'BILL STATUS', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 400;
    if (d.old_stage) y = movedBanner(x, 360, d.old_stage, d.stage);
    var billId = String(d.bill_id == null ? '—' : d.bill_id).toUpperCase();
    x.fillStyle = '#c1121f'; x.textAlign = 'center';
    fitFont(x, billId, 120, 64, 910);
    x.fillText(billId, W / 2, y + 100);
    y += 170;
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    wrap(x, String(d.title == null ? '—' : d.title).toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 54; });
    y = Math.max(760, y + 30);
    /* 5-stage progress bar: filled pips = stage_index, no invented labels. */
    var raw = parseInt(d.stage_index, 10);
    var idx = (raw >= 1 && raw <= 5) ? raw : 0;
    var bx = 140, bw = 800, seg = bw / 5, by = y, bh = 30, i;
    for (i = 0; i < 5; i++) {
      x.fillStyle = i < idx ? '#c1121f' : '#161616';
      x.fillRect(bx + i * seg + 3, by, seg - 6, bh);
      x.strokeStyle = '#f5ead6'; x.lineWidth = 2;
      x.strokeRect(bx + i * seg + 3, by, seg - 6, bh);
      x.fillStyle = i < idx ? '#ffffff' : '#c9bfa8';
      x.font = '700 26px Arial,sans-serif'; x.textAlign = 'center';
      x.fillText(String(i + 1), bx + i * seg + seg / 2, by + bh + 34);
    }
    y = by + bh + 84;
    x.fillStyle = '#c9bfa8'; x.font = '700 34px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText(idx ? 'STAGE ' + idx + ' OF 5' : 'STAGE \u2014 OF 5', W / 2, y); y += 66;
    var stg = String(d.stage == null ? '—' : d.stage).toUpperCase();
    x.fillStyle = '#e8b923';
    fitFont(x, stg, 64, 40, 910);
    x.fillText(stg, W / 2, y); y += 60;
    y = Math.max(1100, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Race Watch Card (studio) — id phq-race */
  function paintRace(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'RACE WATCH', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 420;
    if (d.stale) y = staleBanner(x, 360) + 20;
    var dist = String(d.district == null ? '—' : d.district).toUpperCase();
    x.fillStyle = '#c1121f'; x.textAlign = 'center';
    fitFont(x, dist, 120, 64, 910);
    x.fillText(dist, W / 2, y + 90); y += 160;
    var sub = String(d.state == null ? '—' : d.state).toUpperCase() + ' \u00b7 ' +
      String(d.chamber == null ? '—' : d.chamber).toUpperCase();
    x.fillStyle = '#c9bfa8';
    fitFont(x, sub, 36, 28, 910, '700');
    x.fillText(sub, W / 2, y); y += 80;
    /* The rating — big gold stamp, the thumb-stopping headline. */
    var rating = String(d.rating == null ? '—' : d.rating).toUpperCase();
    fitFont(x, rating, 56, 34, 820);
    var rw = x.measureText(rating).width + 90;
    x.fillStyle = '#e8b923'; x.fillRect(W / 2 - rw / 2, y, rw, 84);
    x.fillStyle = '#0d0d0d'; x.textAlign = 'center';
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(rating, W / 2, y + 44);
    x.textBaseline = pb;
    y += 150;
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    var cands = Array.isArray(d.candidates) ? d.candidates.slice(0, 4) : [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i] || {};
      var line = String(c.name == null ? '—' : c.name).toUpperCase() +
        ' (' + String(c.party == null ? '—' : c.party).toUpperCase() + ')';
      x.fillStyle = '#f5ead6';
      fitFont(x, line, 42, 30, 910, '700');
      x.fillText(line, W / 2, y); y += 58;
    }
    y = Math.max(1050, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Poll Results Card (studio) — id phq-poll-results */
  function paintPoll(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'POLL RESULTS', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 420;
    x.fillStyle = '#f5ead6'; headFont(x, 56); x.textAlign = 'center';
    wrap(x, String(d.question == null ? '—' : d.question).toUpperCase(), 910).slice(0, 3)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 66; });
    y = Math.max(640, y + 20);
    var opts = Array.isArray(d.options) ? d.options.slice(0, 4) : [];
    var total = parseInt(d.total_votes, 10);
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i] || {};
      var win = !!o.winner;
      var pct = parseFloat(o.pct);
      if (!(pct >= 0)) { /* derive from votes/total only when both exist */
        var vv = parseFloat(o.votes);
        if (!isNaN(total) && total > 0 && !isNaN(vv)) pct = Math.round(vv / total * 100);
      }
      var frac = (pct >= 0) ? Math.max(0, Math.min(1, pct / 100)) : 0;
      var ptxt = (pct >= 0) ? Math.round(pct) + '%' : '—';
      var lab = String(o.text == null ? '—' : o.text).toUpperCase();
      x.textAlign = 'left';
      x.fillStyle = win ? '#e8b923' : '#f5ead6';
      fitFont(x, lab, 36, 26, 640, '700');
      x.fillText(lab, 120, y);
      x.textAlign = 'right';
      x.fillStyle = win ? '#e8b923' : '#c9bfa8';
      x.font = '700 38px Arial,sans-serif';
      x.fillText(ptxt, 960, y);
      if (win) {
        x.textAlign = 'left'; x.fillStyle = '#e8b923'; x.font = '700 28px Arial,sans-serif';
        x.fillText('\u2605 WINNER', 120, y + 34);
      }
      x.fillStyle = '#161616'; x.fillRect(120, y + 46, 840, 20);
      x.strokeStyle = '#f5ead6'; x.lineWidth = 2; x.strokeRect(120, y + 46, 840, 20);
      x.fillStyle = win ? '#e8b923' : '#c1121f';
      x.fillRect(120, y + 46, Math.round(840 * frac), 20);
      x.textAlign = 'center';
      y += 100;
    }
    y = Math.max(1000, y + 10);
    x.fillStyle = '#c9bfa8'; x.font = '700 34px Arial,sans-serif'; x.textAlign = 'center';
    x.fillText('CLOSED ' + monDate(d.closed_at), W / 2, y); y += 46;
    var tot = isNaN(total) ? '—' : fmtNum(total);
    x.fillStyle = '#e8b923';
    fitFont(x, tot + ' VOTES', 44, 32, 910);
    x.fillText(tot + ' VOTES', W / 2, y); y += 40;
    y = Math.max(1100, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Rep Contact Card (studio) — id phq-rep-contact */
  function paintRepContact(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'PRESSURE LOGGED', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var m = String(d.method == null ? '' : d.method).toUpperCase();
    var head = m === 'EMAILED' ? 'I EMAILED' : (m === 'CALLED' ? 'I CALLED' : 'I TOOK ACTION');
    x.fillStyle = '#c1121f'; x.textAlign = 'center';
    fitFont(x, head, 130, 72, 910);
    x.fillText(head, W / 2, 480);
    var y = 590;
    var nm = String(d.rep_name == null ? '—' : d.rep_name).toUpperCase();
    x.fillStyle = '#f5ead6';
    fitFont(x, nm, 72, 44, 910);
    x.fillText(nm, W / 2, y); y += 70;
    x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
    x.fillText('(' + String(d.state == null ? '—' : d.state).toUpperCase() + '-' +
      String(d.party == null ? '—' : d.party).toUpperCase() + ')', W / 2, y); y += 70;
    x.fillStyle = '#e8b923'; x.font = '700 40px Arial,sans-serif';
    wrap(x, 'TOPIC: ' + String(d.topic == null ? '—' : d.topic).toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
    y = Math.max(900, y + 20);
    if (d.tel) { /* rendered as text only — the share caption carries any tap link */
      var tline = 'THEIR NUMBER: ' + String(d.tel).toUpperCase();
      x.fillStyle = '#f5ead6';
      fitFont(x, tline, 44, 32, 910);
      x.fillText(tline, W / 2, y); y += 64;
    }
    y = Math.max(1020, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Nonprofit Ally Card (studio) — id phq-nonprofit */
  function paintNonprofit(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'MOVEMENT ALLY', 280, '#f5ead6', 40);
    var cs = callsignOf();
    var y = 430;
    x.fillStyle = '#c1121f'; x.textAlign = 'center';
    headFont(x, 96);
    wrap(x, String(d.name == null ? '—' : d.name).toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 104; });
    y += 10;
    var focus = 'FOCUS: ' + String(d.focus == null ? '—' : d.focus).toUpperCase();
    x.fillStyle = '#e8b923';
    fitFont(x, focus, 38, 28, 910, '700');
    x.fillText(focus, W / 2, y); y += 62;
    x.fillStyle = '#f5ead6'; x.font = '400 40px Arial,sans-serif';
    wrap(x, String(d.mission == null ? '—' : d.mission).toUpperCase(), 910).slice(0, 3)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 52; });
    y = Math.max(880, y + 20);
    if (d.disclosure) {
      x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
      wrap(x, 'DISCLOSURE: ' + String(d.disclosure).toUpperCase(), 910).slice(0, 2)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 42; });
      y += 20;
    }
    var web = String(d.website == null ? '—' : d.website).toUpperCase();
    x.fillStyle = '#f5ead6';
    fitFont(x, web, 48, 32, 910);
    x.fillText(web, W / 2, y); y += 60;
    y = Math.max(1080, y);
    if (cs) y = csLine(cv, x, y, cs) + 12;
    else { claimLine(x, y); y += 50; }
    srcLine(x, d);
    bottomStack(x, 'fight');
    return cv;
  }
  /* Follow the Money Card (money-page) — id phq-money */
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
  /* Billionaire Ledger Card (money-page) — id phq-ledger */
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
    x.fillStyle = '#c9bfa8'; x.font = '700 40px Arial,sans-serif';
    spaced(x, 'NET WORTH', W / 2, y, 10); y += 64;
    x.fillStyle = '#e8b923';
    fitFont(x, ledgerMoneyB(d.netWorthB), 120, 60, 910);
    x.fillText(ledgerMoneyB(d.netWorthB), W / 2, y); y += 38;
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText('FORBES ' + ledgerDate(d.netWorthAsOf) + ' SNAPSHOT', W / 2, y); y += 54;
    /* vs */
    x.fillStyle = '#c1121f'; headFont(x, 44);
    x.fillText('VS.', W / 2, y); y += 56;
    /* political spending */
    var spend = (d.spending == null) ? null : Number(d.spending);
    if (spend != null && isFinite(spend)) {
      x.fillStyle = '#c9bfa8'; x.font = '700 36px Arial,sans-serif';
      spaced(x, 'SPENT ON FEDERAL ELECTIONS', W / 2, y, 8); y += 58;
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
  /* Donor Boycott Card (money-page) — id phq-boycott */
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
  /* Corporate Playbook Card (money-page) — id phq-corp */
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
    headFont(x, 76);
    var bb = moneyB(d.buybacks), tp = moneyB(d.taxPaid);
    if (bb.length > 8) { headFont(x, 60); }
    x.fillStyle = '#f5ead6'; x.fillText(bb, lx, y);
    headFont(x, 76);
    if (tp.length > 8) { headFont(x, 60); }
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
  /* Vote Donor Card (money-page) — id phq-votedonor */
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
  /* Campaign Kit Bill Poster (campaign-share-kits) — id phq-bill */
  function paintBill(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'TARGET BILL', 280, '#f5ead6', 40);
    var cs = callsignOf();
    /* The bill number — the thumb-stopping headline of this card. */
    var no = String(d.billNo == null || d.billNo === '' ? '—' : d.billNo).toUpperCase();
    x.fillStyle = '#c1121f';
    fitFont(x, no, 130, 64, 910);
    x.fillText(no, W / 2, 460);
    var y = 580;
    x.fillStyle = '#f5ead6'; x.font = '700 48px Arial,sans-serif';
    wrap(x, String(d.billTitle == null || d.billTitle === '' ? '—' : d.billTitle).toUpperCase(), 910)
      .slice(0, 3).forEach(function (l) { x.fillText(l, W / 2, y); y += 60; });
    y = Math.max(820, y + 20);
    x.fillStyle = '#e8b923'; x.font = '700 42px Arial,sans-serif';
    wrap(x, 'STATUS: ' + String(d.status == null || d.status === '' ? '—' : d.status).toUpperCase(), 910)
      .slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 54; });
    y += 16;
    /* STUCK AT: location from the payload, or '—'. Never invented. */
    x.fillStyle = '#f5ead6'; x.font = '700 44px Arial,sans-serif';
    var stuck = (d.stuckAt == null || String(d.stuckAt).trim() === '') ? '—' : String(d.stuckAt).toUpperCase();
    wrap(x, 'STUCK AT: ' + stuck, 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += 56; });
    y = Math.max(1050, y + 24);
    if (cs) y = csLine(cv, x, y, cs) + 10;
    else y = claimLine(x, y);
    sourceFooter(x, d, y);
    bottomStack(x);
    return cv;
  }
  /* Campaign Kit Urgency Poster (campaign-share-kits) — id phq-urgency */
  function paintUrgency(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'FINAL PUSH', 280, '#f5ead6', 40);
    var cs = callsignOf();
    /* The countdown number — biggest element on the card. Missing days
       render '—', never a guess. */
    var dr = (d.daysRemaining == null || d.daysRemaining === '') ? '—'
      : fmtNum(Math.max(0, parseInt(d.daysRemaining, 10) || 0));
    x.fillStyle = '#c1121f'; headFont(x, 260);
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(dr, W / 2, 500);
    x.textBaseline = pb;
    x.fillStyle = '#f5ead6'; x.font = '700 56px Arial,sans-serif';
    x.fillText('DAYS LEFT', W / 2, 640);
    var y = 740;
    x.fillStyle = '#f5ead6'; headFont(x, 60);
    wrap(x, String(d.title == null || d.title === '' ? '—' : d.title).toUpperCase(), 910)
      .slice(0, 2).forEach(function (l) { x.fillText(l, W / 2, y); y += 72; });
    y = Math.max(880, y + 10);
    x.fillStyle = '#e8b923'; x.font = '700 44px Arial,sans-serif';
    x.fillText('ENDS ' + monDate(d.endsAt), W / 2, y); y += 58;
    var pc = parseInt(d.participantCount, 10);
    if (!isNaN(pc) && pc >= 0) {
      x.fillStyle = '#e8b923';
      fitFont(x, fmtNum(pc) + ' SOLDIERS PRESSURING', 52, 36, 910);
      x.fillText(fmtNum(pc) + ' SOLDIERS PRESSURING', W / 2, y); y += 62;
    }
    var tb = String(d.targetBill == null ? '' : d.targetBill).trim();
    if (tb) {
      x.fillStyle = '#c9bfa8'; x.font = '400 36px Arial,sans-serif';
      wrap(x, 'TARGET BILL: ' + tb.toUpperCase(), 910).slice(0, 1)
        .forEach(function (l) { x.fillText(l, W / 2, y); y += 46; });
    }
    y = Math.max(1050, y);
    if (cs) y = csLine(cv, x, y, cs) + 10;
    else y = claimLine(x, y);
    sourceFooter(x, d, y);
    bottomStack(x);
    return cv;
  }
  /* Corruption Index score card (index-page) — id phq-index-score.
     Data contract: {name, sub, score, label, topInputs:[{title, display}],
     vintage ('Week of Oct 5, 2026'), methodology ('v1'), url}.
     Copy rule: label is descriptive ("HIGHLY CAPTURED") — never accusatory.
     1080x1350, house palette, JOIN THE FIGHT. CTA per the share standard. */
  function paintIndexScore(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'THE CORRUPTION INDEX', 280, '#c1121f', 40);
    var y = 380;
    var fit = fitFont(x, String(d.name || '\u2014').toUpperCase(), 84, 38, 910);
    var lh = Math.round(fit * 1.0);
    x.fillStyle = '#f5ead6';
    wrap(x, String(d.name || '\u2014').toUpperCase(), 910).slice(0, 2)
      .forEach(function (l) { x.fillText(l, W / 2, y); y += lh; });
    y = Math.max(500, y + 6);
    if (d.sub) {
      x.fillStyle = '#c9bfa8'; x.font = '700 34px Arial,sans-serif';
      x.fillText(String(d.sub).toUpperCase().slice(0, 60), W / 2, y); y += 52;
    }
    /* the score — biggest element on the card */
    y = Math.max(640, y + 40);
    x.fillStyle = '#e8b923';
    fitFont(x, String(d.score == null ? '\u2014' : d.score), 200, 120, 700);
    x.fillText(String(d.score == null ? '\u2014' : d.score), W / 2, y); y += 60;
    x.fillStyle = '#c1121f';
    fitFont(x, String(d.label || 'CAPTURED').toUpperCase(), 56, 32, 910);
    x.fillText(String(d.label || 'CAPTURED').toUpperCase(), W / 2, y); y += 70;
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText('7.6 \u2013 9.8 capture scale \u00b7 methodology ' +
      String(d.methodology || 'v1'), W / 2, y); y += 60;
    /* top live inputs */
    var ins = Array.isArray(d.topInputs) ? d.topInputs.slice(0, 3) : [];
    x.textAlign = 'left';
    for (var i = 0; i < ins.length; i++) {
      var t = String(ins[i].title || '').toUpperCase().slice(0, 34);
      var v = String(ins[i].display || '\u2014').slice(0, 44);
      x.fillStyle = '#e8b923'; x.font = '700 32px Arial,sans-serif';
      x.fillText(t, 90, y);
      x.fillStyle = '#f5ead6'; x.font = '400 32px Arial,sans-serif';
      var tw = x.measureText(v).width;
      x.fillText(v, Math.max(90, W - 90 - tw), y);
      y += 54;
    }
    x.textAlign = 'center';
    y = Math.max(1060, y + 10);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText('SCORED ' + String(d.vintage || '').toUpperCase(), W / 2, y); y += 46;
    /* bottom: deep link -> CTA -> date (index-specific deep link; DEEP is
       module-wide so this card paints its own stack). */
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM/INDEX', W / 2, H - 128);
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 84);
    x.fillStyle = '#c9bfa8'; x.font = '400 30px Arial,sans-serif';
    x.fillText(dateStr(), W / 2, H - 48);
    return cv;
  }
  /* ---------------------------------------------------------------- */
  /* Registry: additive registration — this file NEVER reassigns          */
  /* PF.PHQShare. The facade is created exactly once (by the lazy stub   */
  /* in the bundle, or here in standalone mode) and painters merge into  */
  /* it via registerPainters().                                          */
  /* ---------------------------------------------------------------- */
  var PAINT_LOCAL = {
    'phq-racecall': paintRacecall,
    'phq-pac': paintPac,
    'phq-wallshame': paintWallShame,
    'phq-trades': paintTrades,
    'phq-bill-status': paintBillStatus,
    'phq-race': paintRace,
    'phq-poll-results': paintPoll,
    'phq-rep-contact': paintRepContact,
    'phq-nonprofit': paintNonprofit,
    'phq-money': paintMoney,
    'phq-ledger': paintLedger,
    'phq-boycott': paintBoycott,
    'phq-corp': paintCorp,
    'phq-votedonor': paintVoteDonor,
    'phq-bill': paintBill,
    'phq-urgency': paintUrgency,
    'phq-index-score': paintIndexScore,
    'phq-petition': paintPetition
  };
  var TITLES_LOCAL = {
    'phq-racecall': 'RACE CALLED',
    'phq-pac': 'MONEY BOMB',
    'phq-wallshame': 'WALL OF SHAME',
    'phq-trades': 'THEIR PORTFOLIO',
    'phq-bill-status': 'BILL STATUS',
    'phq-race': 'RACE WATCH',
    'phq-poll-results': 'POLL RESULTS',
    'phq-rep-contact': 'I TOOK ACTION',
    'phq-nonprofit': 'MOVEMENT ALLY',
    'phq-money': 'FOLLOW THE MONEY',
    'phq-ledger': 'THE LEDGER',
    'phq-boycott': 'DONOR BOYCOTT',
    'phq-corp': 'CORPORATE PLAYBOOK',
    'phq-votedonor': 'THE MONEY BEHIND THE VOTE',
    'phq-bill': 'BILL POSTER',
    'phq-urgency': 'URGENCY POSTER',
    'phq-index-score': 'CAPTURE SCORE',
    'phq-petition': 'PETITION SHARE KIT'
  };
  var FACADE = null;       /* the PF.PHQShare facade (stub or standalone) */
  function paintTable() { try { return (FACADE && FACADE._paint) || {}; } catch (e) { return {}; } }
  var RT = null;           /* module-internal route {share, save, paint, pledgeData} */

  function disabled(id) { try { return PF && PF.skip(id); } catch (e) { return false; } }

  function mkFacade() {
    var F = {
      ids: [],
      _paint: {},
      _titles: {},
      _route: null,
      _queue: [],
      registerPainters: function (painters, titles) {
        for (var id in painters) {
          if (!painters.hasOwnProperty(id)) continue;
          if (disabled(id)) continue;                 /* per-painter kill */
          F._paint[id] = painters[id];
          if (titles && titles[id] && F._titles[id] == null) F._titles[id] = titles[id];
          if (F.ids.indexOf(id) === -1) F.ids.push(id);
        }
        if (!F._flushed) { F._flushed = true; flushQueue(F); }
        return F;
      },
      share: function (id, data, opts) {
        var r = F._route; if (r) return r.share(id, data, opts);
        F._queue.push({ kind: 'share', id: id, data: data, opts: opts });
        if (F._ensure) F._ensure();
        return true;
      },
      save: function (id, data, opts) {
        var r = F._route; if (r) return r.save(id, data, opts);
        F._queue.push({ kind: 'save', id: id, data: data, opts: opts });
        if (F._ensure) F._ensure();
        return true;
      },
      paint: function (id, data) {
        var r = F._route; if (r) return r.paint(id, data);
        if (F._ensure) F._ensure();
        return null;
      },
      pledgeData: function (row) {
        var r = F._route; if (r && r.pledgeData) return r.pledgeData(row);
        if (F._ensure) F._ensure();
        return null;
      }
    };
    return F;
  }
  function flushQueue(F) {
    var r = null;
    try { r = F._route; } catch (e) {}
    if (!r) return;
    var q = [];
    try { q = F._queue.splice(0, F._queue.length); } catch (e) {}
    for (var i = 0; i < q.length; i++) {
      try { r[q[i].kind](q[i].id, q[i].data, q[i].opts); } catch (e2) {}
    }
  }
  function ensureFacade() {
    var F = null;
    try { F = PF.PHQShare; } catch (e) {}
    if (!F || typeof F.registerPainters !== 'function') {
      /* Standalone mode (module loaded without the lazy stub): create the
         facade once. This is the single assignment site in the codebase. */
      F = mkFacade();
      try { PF.PHQShare = F; } catch (e) {}
    }
    return F;
  }

  function paintOne(id, data) {
    var p = paintTable()[id];
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
      if (disabled(IDS[i])) continue;                 /* per-painter kill */
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

  function go(id, data, kind, opts) {
    if (disabled(id) || IDS.indexOf(id) === -1) return false;
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

  /* Merge order: the seven canonical painters first, then the grafted set.
     registerPainters is additive and idempotent — a second call with the
     same ids is a no-op merge. */
  var F = ensureFacade();
  FACADE = F;
  /* _route BEFORE the first registerPainters: the first registration flushes
     the lazy stub's queue, and the queue needs the route to replay. */
  RT = {
    share: function (id, data, opts) { return go(id, data, 'share', opts); },
    save: function (id, data, opts) { return go(id, data, 'save', opts); },
    paint: function (id, data) { try { return paintOne(id, data || {}); } catch (e) { return null; } },
    pledgeData: function (row) { try { return pledgeData(row); } catch (e) { return null; } }
  };
  F._route = RT;
  F.registerPainters({
    'phq-pressure': paintPressure,
    'phq-prediction': paintPrediction,
    'phq-predict-call': paintPredictCall,
    'phq-scorecard': paintScorecard,
    'phq-cellwin': paintCellwin,
    'phq-ballot': paintBallot,
    'phq-pledge': paintPledge
  }, TITLES);
  F.registerPainters(PAINT_LOCAL, TITLES_LOCAL);
  regAll();
})();
