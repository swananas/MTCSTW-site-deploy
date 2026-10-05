/* core/share-image-phq-kits.js  |  PF v1.4.3 | CAMPAIGN SHARE-KIT POSTERS.
   Two extra PFShare painters (1080x1350, house palette) for the pressure-
   campaign SHARE KIT (fe/campaign-share-kits): the bill poster and the
   urgency/countdown poster. The target-campaign poster reuses the EXISTING
   phq-pressure painter — it is not duplicated here.
   House system: the canvas helpers (base/kicker/badge/wrap/fitFont/
   csLine/claimLine/button/bottomStack) are the SAME house set as
   core/share-image-phq.js (copied with provenance — that module's helpers
   are private, so this file carries its own copy rather than forking the
   pipeline). Palette, fonts, CTA standard, and callsign-stamp rules match.
   Data contract (painter receives one data object; missing optional fields
   degrade gracefully — render '—' or omit, never invented):
     phq-bill:    {billNo, billTitle, status, stuckAt, sourceUrl, sourceDate,
                   generatedAt}
     phq-urgency: {title, daysRemaining, endsAt, participantCount, targetBill,
                   generatedAt}
   Backend contract: the pressure backend's campaign_kit_get action returns
   the kit object; the silo maps kit.bill -> phq-bill, kit.urgency ->
   phq-urgency, kit.target -> phq-pressure (existing painter).
   Callsigns resolve at paint time via callsignOf() (identity store /
   PFCallsign) — never passed in data. Painters that render the callsign
   inline set cv._pfStamped = true so PFShare.stampCallsign stays a no-op
   safety net. No-callsign fallback: skip the stamp strip; the recruit line
   becomes CLAIM YOUR CALLSIGN AT MTCSTW.COM.
   Consumer contract (decorates the existing PF.PHQShare registry — same
   share/save/paint consumer contract as the four existing painters):
     PF.PHQShare.share('phq-bill', {...})  -> share sheet / download
     PF.PHQShare.save('phq-urgency', {...}) -> save to phone
     PF.PHQShare.paint('phq-bill', {...})   -> raw canvas (previews/tests)
   Decoration is load-order independent: this file retries until
   PF.PHQShare exists (fe/phq-share-posters must be merged first), then wraps
   its share/save/paint so the two kit ids route to the kit painters and the
   existing four route to the originals. XP: sharing/saving rides the
   existing once-per-day pf-share-image leg (0 ledger XP, stats only per the
   Economy Desk signed table 2026-10-05) —
   inherited, zero new code, no second grant.
   KILL: ?pf_off=phq-bill  or  ?pf_off=phq-urgency  (or localStorage
   pf_disabled_v1='["phq-bill"]') — per-painter. */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && (PF.skip('phq-bill') && PF.skip('phq-urgency'))) { return; }
  if (window.pfPhqShareKitsDone) return;
  window.pfPhqShareKitsDone = true;

  var W = 1080, H = 1350;
  var IDS = ['phq-bill', 'phq-urgency'];
  var TITLES = { 'phq-bill': 'BILL POSTER', 'phq-urgency': 'URGENCY POSTER' };
  var DEEP = 'MTCSTW.COM/POLITICAL-HQ';
  var PENDING = {};

  function disabled(id) { try { return PF && PF.skip(id); } catch (e) { return false; } }

  /* ---------------------------------------------------------------- */
  /* House canvas helpers — same set as core/share-image-phq.js       */
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
  /* Bottom stack: deep link -> CTA -> date. */
  function bottomStack(x) {
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText(DEEP, W / 2, H - 128);
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', W / 2, H - 84);
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
  /* Source provenance line formatter: backend supplies whatever it has —
     never invented here. Missing fields render '—'. */
  function srcStamp(v) {
    var s = String(v == null ? '' : v).trim();
    return (s || '—').toUpperCase().slice(0, 48);
  }
  /* Small provenance footer above the bottom stack: source URL + pull date
     + kit generation date. HONESTY RULE: every kit poster carries its source
     and dates; nothing is ever invented to fill a gap. */
  function sourceFooter(x, d) {
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#c9bfa8'; x.font = '400 26px Arial,sans-serif';
    var lines = wrap(x, 'SRC: ' + srcStamp(d.sourceUrl), 910).slice(0, 2);
    var meta = 'PULLED ' + srcStamp(d.sourceDate) + ' · KIT ' + srcStamp(d.generatedAt);
    /* Stack bottom-up: the last line lands at y=1180, keeping the 1185+
       bottom-stack gap clean no matter how many source lines wrap. */
    var total = lines.length + 1;
    var y = 1180 - (total - 1) * 34;
    for (var i = 0; i < lines.length; i++) { x.fillText(lines[i], W / 2, y); y += 34; }
    x.fillText(meta, W / 2, y);
  }

  /* ---------------------------------------------------------------- */
  /* Surface 5 — Bill Poster                                           */
  /* ---------------------------------------------------------------- */
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
    sourceFooter(x, d);
    bottomStack(x);
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Surface 6 — Urgency / Countdown Poster                            */
  /* ---------------------------------------------------------------- */
  function paintUrgency(d, cv, x) {
    base(x); kicker(x);
    badge(x, 'FINAL PUSH', 280, '#f5ead6', 40);
    var cs = callsignOf();
    /* The countdown number — biggest element on the card. Missing days
       render '—', never a guess. */
    var dr = (d.daysRemaining == null || d.daysRemaining === '') ? '—'
      : fmtNum(Math.max(0, parseInt(d.daysRemaining, 10) || 0));
    x.fillStyle = '#c1121f'; x.font = '900 260px "Arial Black",Arial,sans-serif';
    var pb = x.textBaseline; x.textBaseline = 'middle';
    x.fillText(dr, W / 2, 500);
    x.textBaseline = pb;
    x.fillStyle = '#f5ead6'; x.font = '700 56px Arial,sans-serif';
    x.fillText('DAYS LEFT', W / 2, 640);
    var y = 740;
    x.fillStyle = '#f5ead6'; x.font = '900 60px "Arial Black",Arial,sans-serif';
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
    sourceFooter(x, d);
    bottomStack(x);
    return cv;
  }

  /* ---------------------------------------------------------------- */
  /* Painter table + PFShare registration + PF.PHQShare decoration      */
  /* ---------------------------------------------------------------- */
  var PAINT = { 'phq-bill': paintBill, 'phq-urgency': paintUrgency };
  function paintOne(id, data) {
    if (disabled(id)) return null;
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
      if (disabled(IDS[i])) continue;
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

  /* Decorate the existing PF.PHQShare registry (load-order independent):
     the two kit ids route to the kit painters; the original four keep
     routing to the originals. Runs once the fe/phq-share-posters module
     has loaded. */
  function hookRegistry() {
    var PHQ = null;
    try { PHQ = (window.PF && window.PF.PHQShare) || null; } catch (e) {}
    if (!PHQ || typeof PHQ.share !== 'function' || typeof PHQ.save !== 'function' ||
        typeof PHQ.paint !== 'function') { setTimeout(hookRegistry, 600); return; }
    if (PHQ._kitsHooked) return;
    PHQ._kitsHooked = true;
    var origShare = PHQ.share, origSave = PHQ.save, origPaint = PHQ.paint;
    PHQ.share = function (id, data, opts) {
      if (IDS.indexOf(id) !== -1) return go(id, data, 'share', opts);
      return origShare(id, data, opts);
    };
    PHQ.save = function (id, data, opts) {
      if (IDS.indexOf(id) !== -1) return go(id, data, 'save', opts);
      return origSave(id, data, opts);
    };
    PHQ.paint = function (id, data) {
      if (IDS.indexOf(id) !== -1) { try { return paintOne(id, data || {}); } catch (e) { return null; } }
      return origPaint(id, data);
    };
    if (Array.isArray(PHQ.ids)) {
      for (var i = 0; i < IDS.length; i++) {
        if (!disabled(IDS[i]) && PHQ.ids.indexOf(IDS[i]) === -1) PHQ.ids.push(IDS[i]);
      }
    }
    /* Standalone kit access even if a silo reads the kit module directly. */
    try { window.PF.PHQShareKits = { ids: IDS.slice(), share: PHQ.share, save: PHQ.save, paint: PHQ.paint }; } catch (e) {}
  }
  hookRegistry();
})();
