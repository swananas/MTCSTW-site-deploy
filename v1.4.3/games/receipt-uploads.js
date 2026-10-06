/* games/receipt-uploads.js  |  PF v1.4.3 | OPTIONAL RECEIPT UPLOADS FOR PRICE
   CHECK-INS (v1). CEO-greenlit build per ~/workspace/specs/receipt-uploads-spec.md
   (the build contract; §12 CEO decisions locked). v1 = attach-at-check-in-time
   ONLY — no standalone upload entry point (§12 #8). No OCR in v1 (§12 #4).

   WHAT IT IS: after a price report submits successfully, the check-in card
   offers an OPTIONAL "Add receipt photo" step. A trained-reviewer queue
   confirms the receipt shows the item / price / date / store as reported;
   confirmed check-ins earn a quiet "community-verified" checkmark. Verified
   points count 1× in every aggregate, ZERO XP anywhere in this flow.

   BACKEND CONTRACT (backend implements; this module consumes — all
   callsign-authenticated; every failure is fail-closed). SINGLE SOURCE OF
   TRUTH IS THE BACKEND — the frontend aligns to its contract exactly:
     receipt_upload  POST multipart {report_id, image, consent_version,
       callsign, device, auth_secret} — NO type/pr_action form fields; the
       worker's multipart rail sets type:'receipt', rc_action:'receipt_upload'
       itself and ignores any form-sent routing keys
       -> {ok:true, receipt:{id, status:'pending'}} |
          {ok:false, error:'disabled'|'beta_required'|'beta_waitlisted'|
           'forbidden'|'consent_required'|'too_large'|'bad_image'|
           'daily_limit'|'pii_detected'|'duplicate_image'|...}
     receipt_delete  POST JSON {type:'receipt', rc_action:'receipt_delete',
       receipt_id, ...auth} -> {ok:true}
     my_receipts     GET ?action=my_receipts&callsign=&auth_secret=
       -> {ok:true, receipts:[{id, report_id, item_id, price_cents,
           reported_at, status, uploaded_at, reviewed_at, rejection_note,
           image_url (relative ?action=receipt_image&... — absolutized
           against the WORKER origin, never Squarespace), ...}],
           beta:{in_cohort:bool}}
     review_queue    GET ?action=review_queue&callsign=&auth_secret= (reviewer role)
       -> {ok:true, queue:[{receipt_id, image_url, is_audit,
           claimed:{item_id, item_name, price_cents, reported_date, store},
           verified_fields?, uploaded_at}], double_review, audit_pct,
           store_list:[...closed chain names...]}
       Reviewer blindness: NO uploader callsign is ever returned or rendered.
     review_decide   POST JSON {type:'receipt', rc_action:'review_decide',
       receipt_id, decision:'verified'|'rejected',
       reject_reason?, store_name?, receipt_date?, item_id?, price_cents?,
       ...auth}
       PII escape hatch: {decision:'pii_flag'} — quarantine + <=24h purge.
     reviewer_apply  POST JSON {type:'receipt', rc_action:'reviewer_apply', ...auth}
       -> {ok:true, applied, quiz:[{q, options}...] (BACKEND-SERVED —
          this module owns no scenarios), pass_score, questions}
     reviewer_quiz_submit  POST JSON {type:'receipt', rc_action:'reviewer_quiz_submit',
       answers:[optionIndex...], ...auth} -> {ok:true, passed:bool, score}
   The GET rail dispatches on ?action= with callsign+auth_secret params; the
   POST rail dispatches on the JSON BODY {type:'receipt', rc_action}.

   MOUNTS (all silent no-ops when absent):
     - upload step: injected into the check-in card on the
       'pf:price-reported' CustomEvent dispatched by games/inflation-tracker.js
       (detail: {report_id, item_id, item_name, price_cents, area_key}).
       v1 has NO standalone upload UI — the step renders only in the
       check-in flow, per §12 #8.
     - #pf-receipt-history: the user's own receipts (status + image +
       quiet badge + delete). Self-staged after #pf-inflation-checkin when
       absent, so it lands on /economy with no Squarespace change.
     - #pf-receipt-review: the reviewer surface (orientation → 10-item
       calibration quiz → assigned queue). Render-only: assigned receipts
       only, no uploader callsign, no download path.

   KILL: ?pf_off=receipt_uploads  or  localStorage pf_disabled_v1 — checked
   before rendering ANY upload UI; when set, the upload step never renders.
   (The worker ALSO returns {ok:false, error:'disabled'} on receipt_upload
   when the flag is set — belt and suspenders.)

   BETA: uploaders outside the 200-cohort see the waitlist UI
   ("You're on the waitlist — we'll open your spot soon.") and no upload
   control. Cohort membership is read from my_receipts' beta.in_cohort and
   from receipt_upload's waitlist-class errors; the server always enforces.

   ZERO ECONOMY: this module grants no XP, shows no XP, promises no XP.
   Verified = status only. No "donate" copy. Public identity is MTCSTW.
   HONESTY (spec §7): badge reads "community-verified" (never bare
   "verified", never official-adjacent); labels "community report" vs
   "community-verified report"; no shame copy; no user ranking by
   verification rate; aggregates disclose the verified share; methodology
   footnote wherever verified data appears; spike alerts may cite verified
   COUNTS only — this module renders no alerts at all (audit 2026-10-05:
   no spike-alert copy exists in the economy frontend or the backend
   inflation module, so there was nothing to guard).
   Needs: core/00-bus.js (PF, PF.skip), core/03-global.js (PF_BACKEND_URL),
   core/14-auth.js (PF.authPost / PF.authGetJSONP / PF.claimAuthSecret —
   graceful fallbacks when absent). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('receipt_uploads')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL || '';

  /* Kill-switch gate — checked before rendering ANY upload UI. */
  function off() {
    try { return PF.skip('receipt_uploads'); } catch (e) { return false; }
  }

  /* ---------------- shared helpers (self-contained; mirrors
     games/inflation-tracker.js conventions) ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard: http(s) only. Defense-in-depth on top
     of the contract (worker-proxied URLs only); a direct R2 URL or a
     javascript: payload never reaches an <img> src from this module. */
  /* The backend signs image URLs as RELATIVE (?action=receipt_image&...) —
     absolutize them against the WORKER origin (never the Squarespace
     origin) before they reach an <img> src or the safeUrl guard. An
     already-absolute URL passes through untouched. */
  function absUrl(u) {
    var s = String(u || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    var base = String(BACKEND || '').replace(/\/+$/, '');
    if (!base) return '';
    return base + (s.charAt(0) === '?' || s.charAt(0) === '/' ? s : '/' + s);
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    if (!/^https?:\/\//i.test(s)) return '';
    /* Honest no-download control (§4): reviewers never get direct R2
       access. If a backend ever hands us a raw R2 URL, refuse it loudly
       rather than render it. */
    if (/\.r2\.cloudflarestorage\.com/i.test(s) || /[?&]X-Amz-/i.test(s)) {
      try { if (PF && PF.error) PF.error('receipt-uploads', 'refused non-proxied image URL'); } catch (e) {}
      return '';
    }
    return s;
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  function money(cents) {
    if (cents == null || isNaN(cents)) return '—';
    return '$' + (Number(cents) / 100).toFixed(2);
  }
  function fmtDate(s) {
    var t = String(s || '').slice(0, 10);
    return t || '—';
  }

  var CSS = 'background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;';
  var BTN = 'background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;';
  var BTN_GHOST = 'background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;';
  var SMALL = 'font-size:12px;color:#b8b0a0;';
  var HONEST = 'font-size:11px;color:#8f887a;margin-top:10px;line-height:1.5;';
  var CONSENT_BOX = 'background:#0d0d0d;border:1px solid #5a5a5a;border-radius:8px;padding:14px;font-size:13px;line-height:1.65;color:#e8e0d0;margin:10px 0;';

  /* ================= SPEC-LOCKED COPY =================
     The blocks below are the build contract (Psych + Security gate
     conditions, §12 CEO decisions). Do not paraphrase — the consent
     version, rejection renderings, delete confirmation, badge tooltip,
     and waitlist line are audited verbatim. */

  /* Consent copy version shipped with v1 (spec §2: versioned before beta;
     any change surfaces a delta notice — the backend stores consent_version
     + consent_at per receipt for audit). MUST equal the backend's
     CONSENT_VERSION exactly ('receipt-consent-v1') or every upload fails
     with consent_required. */
  var CONSENT_VERSION = 'receipt-consent-v1';

  /* Shown at EVERY upload, never cached as a blanket opt-in (§2 element 4).
     All six required elements: (1) "kept indefinitely" plainly, (2) the
     four extracted fields, (3) what's never kept, (4) per-receipt consent
     via re-show, (5) anytime-deletion right, (6) movement-intelligence
     framing + who sees the photo (trained reviewers only, locked viewer,
     no download). */
  var CONSENT_LINES = [
    'Add your receipt to back up this price report? Optional — your check-in counts either way.',
    'Here\u2019s exactly what happens to your photo:',
    '\u2022 We read only four things from it: the item, the price, the date, and the store name.',
    '\u2022 We never keep card numbers, loyalty IDs, payment details, store addresses, or QR-code data.',
    '\u2022 Your photo is kept indefinitely to power the movement\u2019s price intelligence. It is not deleted after review — please decide with that fact in front of you.',
    '\u2022 Only trained reviewers see it, inside a locked viewer they cannot download from. No other users, no public access, ever.',
    '\u2022 You can delete your photo and its record at any time, instantly, no questions asked.',
    'Your activity powers the movement\u2019s intelligence — reports stay aggregated, your location stays coarse.'
  ];

  /* Rejection renderings (spec §5 table). Internal codes NEVER leak into UI —
     the uploader sees only these plain-language strings + concrete fix.
     The underlying price report is unaffected (stays an unverified
     community report). suspected_fabrication is deliberately non-accusatory:
     framed as OUR inability to verify, never as the uploader lying. */
  var REJECT_COPY = {
    item_unreadable: 'We couldn\u2019t read the item on this receipt. Try a clearer photo with the item line visible \u2014 or re-upload.',
    price_mismatch: 'The price on the receipt didn\u2019t match the price you reported. Check the line-item price (not the total) and re-upload, or correct your report.',
    date_missing: 'We couldn\u2019t find a readable date on this receipt. Re-upload a photo showing the receipt date.',
    wrong_item: 'The receipt shows a different item than the one reported. Make sure the receipt matches the check-in item, then re-upload.',
    suspected_fabrication: 'We couldn\u2019t confirm this receipt. This is about our ability to verify \u2014 not an accusation. You can re-upload a clearer photo.'
  };
  /* Reviewer-facing reason labels (human-readable; the internal code rides
     the API only — codes never appear in any UI, reviewer-side included). */
  var REJECT_LABELS = {
    item_unreadable: 'Can\u2019t read the item',
    price_mismatch: 'Price doesn\u2019t match the report',
    date_missing: 'No readable date',
    wrong_item: 'Receipt shows a different item',
    suspected_fabrication: 'Clear signs of tampering'
  };
  var REJECT_ORDER = ['item_unreadable', 'price_mismatch', 'date_missing', 'wrong_item', 'suspected_fabrication'];

  /* Delete confirmation (spec §4 — Psych gate condition): all three truths
     plainly, a single "Delete my photo" button + cancel. No guilt copy
     ("are you sure? think of the movement"), no extra hurdles, no stacked
     re-confirmation screens. */
  var DELETE_TITLE = 'Delete this receipt photo?';
  var DELETE_LINES = [
    'Your photo and its record are deleted immediately and permanently. This can\u2019t be undone.',
    'Your price report stays, but goes back to unverified \u2014 the community report still counts.',
    'Price figures already published won\u2019t be recalculated.'
  ];

  /* PII-quarantine uploader copy (spec §3, Security-reviewed): honest about
     why, clear the report still counts. */
  var PII_COPY = 'We couldn\u2019t use this photo \u2014 it appears to show payment details. Your price report still counts as an unverified community report.';

  /* Beta waitlist (spec §9): shown instead of the upload control. */
  var WAITLIST_COPY = 'You\u2019re on the waitlist \u2014 we\u2019ll open your spot soon.';

  /* Badge microcopy (spec §5 — Psych gate condition): verification is
     "receipt shown and matched" — never "report proven true". Tooltip text
     is VERBATIM. */
  var TOOLTIP_VERIFIED = 'Community-verified: a reviewer confirmed this receipt shows the item, price, date, and store as reported. It means the receipt matched \u2014 not that the report is proven true.';

  /* Reviewer orientation (spec §5 — Psych gate condition): stewardship, not
     authority. Every reviewer completes this before the quiz. */
  var ORIENTATION = [
    'You\u2019re a steward of other people\u2019s private photos, not a judge of other people. Your job is to protect the uploader\u2019s privacy first and check four facts second.',
    'Your judgment is restricted to four checks: (1) the item is legible and matches the reported item; (2) the price is legible and matches the reported line-item price \u2014 not the total; (3) the date is legible and plausible; (4) the store name is legible. Nothing else is grounds for rejection. Gut feelings and \u201cthis looks odd\u201d are not reject reasons.',
    '\u201cCouldn\u2019t confirm\u201d is about our ability to verify \u2014 never an accusation. Marking a receipt as tampered requires clear evidence: visible edits, impossible totals, duplicated regions. Uncertainty is NEVER fabrication \u2014 when unsure, reject as \u201ccan\u2019t read the item\u201d and let the uploader try a clearer photo.',
    'If you spot payment details, you\u2019re shielding a comrade from exposure \u2014 hit \u201cReport PII\u201d. Don\u2019t copy it, don\u2019t screenshot it, don\u2019t download it. The photo is quarantined and purged within 24 hours, and the uploader\u2019s price report still counts.'
  ];

  /* Calibration quiz: the scenarios are SERVED BY THE BACKEND
     (reviewer_apply returns quiz:[{q, options}], answers stripped).
     This module owns no scenarios and never grades — reviewer_quiz_submit
     sends {answers:[optionIndex...]} and the backend grades. */

  /* Methodology footnote — rendered wherever verified data appears
     (spec §7 rule 4): the four checks, v1 = 1× badge-only (zero XP, no
     weighting), indefinite retention + anytime-delete, link to the full
     methodology (the check-in card's methodology anchor). */
  function methodFootnote() {
    return '<div style="' + HONEST + '">How verification works: a trained reviewer checks four things on your receipt \u2014 the item, the price, the date, and the store name. ' +
      'Verified reports count the same as every other report in our medians \u2014 no weighting, no XP; the badge is status only. ' +
      'Receipt photos are kept indefinitely; you can delete yours at any time. ' +
      '<a href="https://mtcstw.com/economy#pf-inf-method" style="color:#e8a0a0;">Full methodology</a>.</div>';
  }
  /* Quiet verified checkmark (spec §12 #3: quiet badge). The title attr is
     the VERBATIM tooltip. Never on area boards — only check-ins + history. */
  function verifiedBadge() {
    return '<span title="' + esc(TOOLTIP_VERIFIED) + '" style="color:#9fd6a0;font-weight:bold;cursor:help;">\u2713 community-verified</span>';
  }
  function consentHTML() {
    var h = '<div style="' + CONSENT_BOX + '">';
    CONSENT_LINES.forEach(function (ln, i) {
      if (i === 0) h += '<div style="font-weight:bold;margin-bottom:8px;">' + esc(ln) + '</div>';
      else if (i === 1) h += '<div style="margin:8px 0 4px;">' + esc(ln) + '</div>';
      else if (i === CONSENT_LINES.length - 1) h += '<div style="margin-top:8px;font-style:italic;">' + esc(ln) + '</div>';
      else h += '<div style="margin:3px 0;">' + esc(ln) + '</div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------------- network (fail-closed everywhere) ---------------- */
  /* Authenticated GET (my_receipts, review_queue). Prefers PF.authGetJSONP
     (callsign/device/auth_secret attached + one-time claim-retry self-heal);
     falls back to fetch with the same params. A null/!ok result is a
     fail-closed signal to the caller — never a broken render. */
  function getAuthed(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    try {
      if (PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params || {}, done); return; }
    } catch (e) {}
    var id = ident(), sec = authSecret();
    var q = '?action=' + encodeURIComponent(action);
    var p = params || {};
    for (var k in p) {
      if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }
    if (id.callsign) q += '&callsign=' + encodeURIComponent(id.callsign);
    if (id.device) q += '&device=' + encodeURIComponent(id.device);
    if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    try {
      fetch(BACKEND + q, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* Authenticated JSON POST (receipt_delete, review_decide, reviewer_apply,
     reviewer_quiz_submit). Prefers PF.authPost (secret attached + one-time
     claim-retry); falls back to a raw CORS POST. */
  function postJSON(prAction, params, cb) {
    var done = function (j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    var body = { type: 'receipt', rc_action: prAction };
    for (var k in (params || {})) body[k] = params[k];
    if (id.callsign) body.callsign = id.callsign;
    if (id.device) body.device = id.device;
    if (sec) body.auth_secret = sec;
    try {
      if (PF.authPost) { PF.authPost(BACKEND, body, done); return; }
    } catch (e) {}
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    try {
      fetch(BACKEND + '?action=' + encodeURIComponent(prAction),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* Authenticated multipart POST (receipt_upload — the image rides FormData;
     PF.authPost is JSON-only, so this is a dedicated path with the same
     one-time claim-retry self-heal). EXIF/GPS stripping is MANDATORY
     server-side at ingest (spec §4) — the client cannot strip reliably, so
     the contract requires it on the worker. */
  function postMultipart(prAction, fields, file, cb) {
    var done = function (j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    function fire(authSec, retried, cb2) {
      var fd = null;
      try {
        fd = new FormData();
        /* Routing lives on the worker's multipart rail (type:'receipt',
           rc_action:'receipt_upload' set server-side) — the form carries
           NO type/pr_action fields, which the rail would reject anyway. */
        for (var k in (fields || {})) fd.append(k, fields[k]);
        fd.append('image', file, file.name || 'receipt.jpg');
        if (id.callsign) fd.append('callsign', id.callsign);
        if (id.device) fd.append('device', id.device);
        if (authSec) fd.append('auth_secret', authSec);
      } catch (e) { cb2(null); return; }
      var ctl = null, timer = null;
      try {
        if (window.AbortController) {
          ctl = new AbortController();
          timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 30000);
        }
      } catch (e) {}
      try {
        fetch(BACKEND + '?action=' + encodeURIComponent(prAction),
          { method: 'POST', body: fd, signal: ctl ? ctl.signal : undefined })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (timer) clearTimeout(timer); cb2(j); })
          .catch(function () { if (timer) clearTimeout(timer); cb2(null); });
      } catch (e) { if (timer) clearTimeout(timer); cb2(null); }
    }
    fire(sec, false, function (j) {
      /* Claim-retry (mirrors PF.authPost): one auth_claim attempt when the
         callsign has no usable secret, then one retry. Never loops. */
      var ec = j && (j.err || j.error);
      var needClaim = j && !j.ok && !authSecret() &&
        (ec === 'unauthorized' || ec === 'missing credentials' ||
         String(ec || '').indexOf('no secret issued') !== -1 ||
         String(ec || '').indexOf('missing credentials') !== -1);
      if (needClaim && !off()) {
        var cs = String((id.callsign || '')).toLowerCase();
        try {
          if (cs && PF.claimAuthSecret) {
            PF.claimAuthSecret(cs, function (cj) {
              if (cj && cj.ok && cj.auth_secret) {
                try { if (PF.saveAuthSecret) PF.saveAuthSecret(cj.auth_secret); } catch (e) {}
                fire(cj.auth_secret, true, done);
              } else { done(j); }
            });
            return;
          }
        } catch (e) {}
      }
      done(j);
    });
  }

  /* ---------------- beta gating ---------------- */
  /* 'unknown' | 'in' | 'waitlist'. Resolved from my_receipts' beta.in_cohort
     and from receipt_upload's waitlist-class errors. The server ALWAYS
     enforces the 200-cohort cap — this is UX only (which control to show). */
  var betaState = 'unknown';
  /* The BACKEND's actual waitlist-class codes (single source of truth):
     beta_required (not opted in), beta_waitlisted (over the 200 cap),
     forbidden (upload privilege revoked). */
  var WAITLIST_ERRORS = ['beta_required', 'beta_waitlisted', 'forbidden'];
  function noteBetaFromUpload(j) {
    var ec = String((j && (j.err || j.error)) || '').toLowerCase();
    for (var i = 0; i < WAITLIST_ERRORS.length; i++) {
      if (ec.indexOf(WAITLIST_ERRORS[i]) !== -1) { betaState = 'waitlist'; return true; }
    }
    return false;
  }
  function noteBetaFromHistory(j) {
    try {
      if (j && j.beta && j.beta.in_cohort === false) { betaState = 'waitlist'; return; }
      if (j && j.beta && j.beta.in_cohort === true) { betaState = 'in'; return; }
    } catch (e) {}
  }
  function waitlistHTML() {
    return '<div style="' + SMALL + 'margin-top:8px;">' + esc(WAITLIST_COPY) + '</div>';
  }

  /* ================= 1. UPLOAD STEP (check-in flow) ================= */
  var MAX_BYTES = 5 * 1024 * 1024;
  var OK_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 };

  function onPriceReported(e) {
    if (off()) return; /* kill switch: the upload step never renders */
    try {
      var d = (e && e.detail) || {};
      if (d.report_id == null) return;
      /* The card is the event target (#pf-inflation-checkin) — the upload
         step lives inside the check-in card, post-submit. */
      var card = null;
      try { card = e.target && e.target.closest ? e.target.closest('#pf-inflation-checkin') : null; } catch (e2) {}
      if (!card) { try { card = document.getElementById('pf-inflation-checkin'); } catch (e3) {} }
      if (!card) return;
      renderUploadNudge(card, d);
    } catch (err) {}
  }

  function renderUploadNudge(card, d) {
    if (off()) return;
    try {
      var old = card.querySelector('[data-pf-receipt-step]');
      if (old) old.remove();
      var wrap = document.createElement('div');
      wrap.setAttribute('data-pf-receipt-step', '1');
      wrap.style.cssText = 'margin-top:14px;border-top:1px dashed #5a5a5a;padding-top:12px;';
      var msg = card.querySelector('#pf-inf-ci-msg');
      if (msg && msg.parentNode) msg.parentNode.insertBefore(wrap, msg.nextSibling);
      else card.appendChild(wrap);
      /* Beta: waitlisted uploaders get the waitlist line, no control. */
      if (betaState === 'waitlist') { wrap.innerHTML = waitlistHTML(); return; }
      wrap.innerHTML =
        '<button data-pf-rc-nudge style="' + BTN_GHOST + '">ADD RECEIPT PHOTO (OPTIONAL)</button>' +
        '<div style="' + SMALL + 'margin-top:6px;">Back up this price report with a photo of the receipt. ' +
        'Your check-in counts either way \u2014 a reviewer confirms the item, price, date, and store.</div>' +
        '<div data-pf-rc-panel></div>';
      var nudge = wrap.querySelector('[data-pf-rc-nudge]');
      if (nudge) nudge.onclick = function () { renderUploadPanel(wrap, d); };
    } catch (e) {}
  }

  function renderUploadPanel(wrap, d) {
    if (off()) { wrap.innerHTML = ''; return; }
    try {
      if (betaState === 'waitlist') { wrap.innerHTML = waitlistHTML(); return; }
      var panel = wrap.querySelector('[data-pf-rc-panel]');
      if (!panel) return;
      /* Consent is shown at EVERY upload — never cached as a blanket
         opt-in (spec §2). The consent_version recorded is the version
         actually displayed here. */
      panel.innerHTML =
        consentHTML() +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT PHOTO (JPEG, PNG, or WebP \u2014 max 5MB)</label>' +
        '<input type="file" data-pf-rc-file accept="image/jpeg,image/png,image/webp" style="color:#f5f0e6;font-size:14px;margin-bottom:10px;">' +
        '<div><button data-pf-rc-go style="' + BTN + 'margin-right:8px;">UPLOAD THIS RECEIPT</button>' +
        '<button data-pf-rc-skip style="' + BTN_GHOST + '">NOT NOW</button></div>' +
        '<div data-pf-rc-status style="margin-top:10px;font-size:14px;"></div>' +
        methodFootnote();
      var nudgeBtn = wrap.querySelector('[data-pf-rc-nudge]');
      if (nudgeBtn) nudgeBtn.style.display = 'none';
      var fileEl = panel.querySelector('[data-pf-rc-file]');
      var statusEl = panel.querySelector('[data-pf-rc-status]');
      function status(html) { try { statusEl.innerHTML = html; } catch (e) {} }
      panel.querySelector('[data-pf-rc-skip]').onclick = function () {
        panel.innerHTML = '<div style="' + SMALL + '">No problem \u2014 your check-in counts either way.</div>';
        if (nudgeBtn) nudgeBtn.style.display = '';
      };
      panel.querySelector('[data-pf-rc-go]').onclick = function () {
        var f = fileEl && fileEl.files && fileEl.files[0];
        if (!f) { status('<span style="color:#e8a0a0;">Pick a photo of the receipt first.</span>'); return; }
        /* Client-side pre-checks: type + 5MB cap. Server re-validates. */
        var t = String(f.type || '').toLowerCase();
        var extOk = /\.(jpe?g|png|webp)$/i.test(String(f.name || ''));
        if (!OK_TYPES[t] && !extOk) {
          status('<span style="color:#e8a0a0;">That file type won\u2019t work \u2014 JPEG, PNG, or WebP only.</span>');
          return;
        }
        if (f.size > MAX_BYTES) {
          status('<span style="color:#e8a0a0;">That photo is over 5MB \u2014 try a smaller one.</span>');
          return;
        }
        var btn = panel.querySelector('[data-pf-rc-go]');
        btn.disabled = true; btn.style.opacity = '0.5';
        status('<span style="color:#b8b0a0;">Uploading\u2026</span>');
        postMultipart('receipt_upload',
          { report_id: String(d.report_id), consent_version: CONSENT_VERSION },
          f,
          function (j) {
            btn.disabled = false; btn.style.opacity = '1';
            /* Fail closed: an upload failure NEVER breaks the check-in —
               the price report already landed. */
            if (!j || j.ok !== true) {
              if (noteBetaFromUpload(j)) { wrap.innerHTML = waitlistHTML(); return; }
              if (j && String(j.err || j.error || '') === 'disabled') {
                panel.innerHTML = '<div style="' + SMALL + '">Receipt uploads are paused right now. Your price report still counts.</div>';
                return;
              }
              if (j && String(j.err || j.error || '') === 'daily_limit') {
                status('<span style="color:#e8a0a0;">You\u2019ve hit today\u2019s receipt-upload limit \u2014 try again tomorrow. Your price report still counts.</span>');
                return;
              }
              if (j && String(j.err || j.error || '') === 'pii_detected') {
                /* The Security-reviewed PII copy renders on the
                   immediate-upload path (spec §3): the report still counts. */
                status('<span style="color:#e8a0a0;">' + esc(PII_COPY) + '</span>');
                return;
              }
              if (j && String(j.err || j.error || '') === 'consent_required') {
                status('<span style="color:#e8a0a0;">Your consent needs to be re-confirmed for this upload \u2014 please try again. Your price report still counts.</span>');
                return;
              }
              status('<span style="color:#e8a0a0;">Couldn\u2019t upload right now \u2014 your price report still counts. Try again later.</span>');
              return;
            }
            /* Success: quiet pending state. The checkmark appears here and
               in My receipts once a reviewer confirms. */
            var rid = j.receipt && j.receipt.id != null ? j.receipt.id : null;
            panel.innerHTML =
              '<div style="color:#9fd6a0;">Receipt received \u2014 a reviewer will check it against your report (item, price, date, store).</div>' +
              '<div style="' + SMALL + 'margin-top:6px;">Status: in review. ' +
              'Your check-in counts either way \u2014 no XP, no weighting, just a quiet checkmark if it confirms.</div>' +
              '<div style="margin-top:8px;"><button data-pf-rc-hist style="' + BTN_GHOST + '">MY RECEIPTS</button></div>' +
              methodFootnote();
            var hb = panel.querySelector('[data-pf-rc-hist]');
            if (hb) hb.onclick = function () {
              var h = document.getElementById('pf-receipt-history');
              if (h) { try { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
              else toast('My receipts lives on the /economy page.');
            };
            /* Refresh the live status once so a fast review shows the badge. */
            if (rid != null) refreshReceiptStatus(panel, rid);
          });
      };
    } catch (e) {}
  }

  /* After upload, pull the receipt's live status (pending → verified /
     rejected) so the check-in card can show the quiet badge without a
     page reload. */
  function refreshReceiptStatus(panel, receiptId) {
    try {
      getAuthed('my_receipts', {}, function (j) {
        if (!j || j.ok !== true || !Array.isArray(j.receipts)) return;
        var found = null;
        for (var i = 0; i < j.receipts.length; i++) {
          if (String(j.receipts[i].id) === String(receiptId)) { found = j.receipts[i]; break; }
        }
        if (!found || !panel.isConnected) return;
        var st = String(found.status || '');
        var box = panel.querySelector('[data-pf-rc-live]');
        if (!box) {
          box = document.createElement('div');
          box.setAttribute('data-pf-rc-live', '1');
          box.style.marginTop = '8px';
          panel.appendChild(box);
        }
        if (st === 'verified') box.innerHTML = verifiedBadge();
        else if (st === 'rejected') {
          box.innerHTML = '<div style="font-size:13px;color:#e8a0a0;">' +
            esc(found.rejection_note || 'We couldn\u2019t confirm this receipt. You can re-upload a clearer photo.') + '</div>';
        } else if (st === 'pii_quarantined') {
          box.innerHTML = '<div style="font-size:13px;color:#e8a0a0;">' + esc(PII_COPY) + '</div>';
        }
        /* pending → the "in review" line already shown; nothing to add. */
      });
    } catch (e) {}
  }

  try { document.addEventListener('pf:price-reported', onPriceReported); } catch (e) {}

  /* ================= 2. MY RECEIPTS (user's report history) ================= */
  /* The user's own receipts: status + image (worker-proxied URLs only) +
     the quiet verified checkmark + per-receipt delete. This is the
     "report history" surface from §12 #3 — the badge is visible here and
     on the check-in, NEVER on area boards. */
  function stageHistory() {
    if (off()) return null;
    try {
      var el = document.getElementById('pf-receipt-history');
      if (el) return el;
      var anchor = document.getElementById('pf-inflation-checkin');
      if (!anchor || !anchor.parentNode) return null;
      el = document.createElement('div');
      el.id = 'pf-receipt-history';
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
      return el;
    } catch (e) { return null; }
  }

  function statusLabel(r) {
    var st = String(r.status || 'pending');
    if (st === 'verified') return verifiedBadge();
    if (st === 'rejected') {
      return '<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">' +
        esc(r.rejection_note || 'We couldn\u2019t confirm this receipt. You can re-upload a clearer photo.') + '</div>' +
        '<div style="' + SMALL + 'margin-top:4px;">Your price report still counts as a community report.</div>';
    }
    if (st === 'pii_quarantined') {
      return '<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">' + esc(PII_COPY) + '</div>';
    }
    return '<div style="' + SMALL + 'margin-top:6px;">In review \u2014 a reviewer is checking the item, price, date, and store.</div>';
  }

  function receiptCard(r) {
    var img = safeUrl(absUrl(r.image_url));
    var name = r.item_name || r.item_id || 'item';
    var h = '<div data-pf-rc-id="' + esc(String(r.id)) + '" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">';
    if (img) {
      /* Render-only: the URL is worker-proxied and time-limited. No
         download link, no direct R2 URL — the client never constructs
         storage URLs. */
      h += '<img src="' + esc(img) + '" alt="Receipt photo" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">';
    } else {
      h += '<div style="' + SMALL + 'margin-bottom:10px;">Photo unavailable right now.</div>';
    }
    h += '<div style="font-size:14px;font-weight:bold;">' + esc(name) + ' \u2014 ' + esc(money(r.price_cents)) + '</div>' +
      '<div style="' + SMALL + 'margin-top:2px;">' + esc(fmtDate(r.receipt_date)) +
      (r.store_name ? ' \u00b7 ' + esc(String(r.store_name).slice(0, 64)) : '') + '</div>' +
      statusLabel(r) +
      '<div style="margin-top:10px;"><button data-pf-rc-del style="' + BTN_GHOST + '">DELETE MY PHOTO</button></div>' +
      '<div data-pf-rc-delbox></div>' +
      '</div>';
    return h;
  }

  function mountHistory() {
    if (off()) return;
    var host = stageHistory();
    if (!host) return; /* silent no-op */
    host.innerHTML =
      '<div style="' + CSS + 'margin-top:18px;">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">MY RECEIPTS</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Your receipt photos, their review status, and nothing else\u2019s. Only you see this.</div>' +
      '<div data-pf-rc-list><div style="color:#b8b0a0;">Loading your receipts\u2026</div></div>' +
      methodFootnote() +
      '</div>';
    var list = host.querySelector('[data-pf-rc-list]');
    var id = ident();
    if (!id.callsign) {
      list.innerHTML = '<div style="color:#b8b0a0;">Claim a callsign in Enlistment Ranks to see your receipts.</div>';
      return;
    }
    getAuthed('my_receipts', {}, function (j) {
      if (!j || j.ok !== true) {
        list.innerHTML = '<div style="color:#e8a0a0;">Couldn\u2019t load your receipts right now. Try again later.</div>';
        return;
      }
      noteBetaFromHistory(j);
      var rows = Array.isArray(j.receipts) ? j.receipts : [];
      if (!rows.length) {
        list.innerHTML = '<div style="color:#b8b0a0;">No receipts yet. File a price check-in above and attach a photo to back it up \u2014 optional, always.</div>';
        return;
      }
      /* Labels: "community report" (unverified) vs "community-verified
         report" — no shame copy, no ranking by verification rate. The
         badge is quiet: a checkmark on verified rows only. */
      list.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">' +
        rows.map(receiptCard).join('') + '</div>';
      var btns = list.querySelectorAll('[data-pf-rc-del]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.onclick = function () {
            var card = b.closest ? b.closest('[data-pf-rc-id]') : null;
            if (card) deleteFlow(card, card.getAttribute('data-pf-rc-id'));
          };
        })(btns[i]);
      }
    });
  }

  /* Delete flow (spec §4): the EXACT confirmation copy — three truths,
     single "Delete my photo" button + cancel. No guilt copy, no stacked
     re-confirmations. DELETE removes the R2 image AND the receipt_records
     row; the price report survives and reverts to unverified. */
  function deleteFlow(card, receiptId) {
    if (off()) return;
    try {
      var box = card.querySelector('[data-pf-rc-delbox]');
      if (!box) return;
      var h = '<div style="background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:12px;margin-top:10px;">' +
        '<div style="font-weight:bold;margin-bottom:8px;">' + esc(DELETE_TITLE) + '</div>';
      DELETE_LINES.forEach(function (ln) {
        h += '<div style="font-size:13px;margin:4px 0;">\u2022 ' + esc(ln) + '</div>';
      });
      h += '<div style="margin-top:10px;"><button data-pf-rc-del-yes style="' + BTN + 'margin-right:8px;">DELETE MY PHOTO</button>' +
        '<button data-pf-rc-del-no style="' + BTN_GHOST + '">KEEP IT</button></div></div>';
      box.innerHTML = h;
      box.querySelector('[data-pf-rc-del-no]').onclick = function () { box.innerHTML = ''; };
      box.querySelector('[data-pf-rc-del-yes]').onclick = function () {
        var yes = box.querySelector('[data-pf-rc-del-yes]');
        yes.disabled = true; yes.style.opacity = '0.5';
        postJSON('receipt_delete', { receipt_id: String(receiptId) }, function (j) {
          if (!j || j.ok !== true) {
            toast('Delete failed \u2014 your photo is still there. Try again.');
            yes.disabled = false; yes.style.opacity = '1';
            return;
          }
          /* The photo and its record are gone; the report reverts to an
             unverified community report. Remove the card. */
          try { card.remove(); } catch (e) {}
          toast('Receipt photo deleted.');
        });
      };
      try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    } catch (e) {}
  }

  /* ================= 3. REVIEWER VIEWER (render-only) ================= */
  /* Shows ONLY receipts currently assigned for review — the reviewer NEVER
     browses the retained corpus (§4 ACLs). Each card: image (worker-proxied,
     time-limited URL) + the claimed item/price/date/store. NO uploader
     callsign (reviewer blindness, §8). Decision: verified / rejected (+
     reason select) + "Report PII" escape hatch. No download path: no direct
     R2 URLs ever reach the client (safeUrl refuses them), no download
     links are rendered. Reviewer identities are HMAC'd server-side — the
     client never sees or sends reviewer identity beyond its own callsign
     auth. */

  function mountReview() {
    if (off()) return;
    var host = null;
    try { host = document.getElementById('pf-receipt-review'); } catch (e) {}
    if (!host) return; /* silent no-op — the reviewer page stages this div */
    var id = ident();
    if (!id.callsign) {
      host.innerHTML = '<div style="' + CSS + '">Claim a callsign in Enlistment Ranks before reviewing receipts.</div>';
      return;
    }
    renderOrientation(host);
  }

  function renderOrientation(host) {
    if (off()) return;
    var h = '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">RECEIPT REVIEW</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Stewardship, not authority.</div>';
    ORIENTATION.forEach(function (p) {
      h += '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:8px;font-size:13.5px;line-height:1.6;">' + esc(p) + '</div>';
    });
    h += '<div style="' + SMALL + 'margin:10px 0;">Reviewers: established callsign, no abuse flags, at least 5 price reports filed. Pass the calibration quiz below to start. Privilege is revocable at any time.</div>' +
      '<button data-pf-rv-apply style="' + BTN + '">I UNDERSTAND \u2014 BECOME A REVIEWER</button>' +
      '<div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    host.innerHTML = h;
    host.querySelector('[data-pf-rv-apply]').onclick = function () {
      var msg = host.querySelector('[data-pf-rv-msg]');
      msg.innerHTML = '<span style="color:#b8b0a0;">Enlisting\u2026</span>';
      postJSON('reviewer_apply', {}, function (j) {
        if (!j || j.ok !== true) {
          msg.innerHTML = '<span style="color:#e8a0a0;">Couldn\u2019t enlist you right now. Try again later.</span>';
          return;
        }
        renderQuiz(host, j.quiz, j.pass_score);
      });
    };
  }

  /* The calibration quiz is SERVED BY THE BACKEND (reviewer_apply returns
     quiz:[{q, options}], answers stripped) and GRADED by the backend
     (reviewer_quiz_submit). This module renders and collects — never
     owns scenarios, never grades. */
  function renderQuiz(host, quiz, passScore) {
    if (off()) return;
    var qz = Array.isArray(quiz) ? quiz : [];
    var nq = qz.length;
    if (!nq) {
      host.innerHTML = '<div style="' + CSS + '"><div style="color:#e8a0a0;">The quiz didn\u2019t load \u2014 try enlisting again.</div></div>';
      return;
    }
    var h = '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">CALIBRATION QUIZ</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">' + nq + ' scenarios. Answer like the orientation taught you \u2014 the four checks, nothing else.</div>';
    qz.forEach(function (it, qi) {
      h += '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:10px;" data-pf-rv-q="' + qi + '">' +
        '<div style="font-size:14px;font-weight:bold;margin-bottom:8px;">' + (qi + 1) + '. ' + esc(it.q) + '</div>';
      (it.options || []).forEach(function (opt, oi) {
        h += '<label style="display:block;font-size:13.5px;margin:5px 0;cursor:pointer;">' +
          '<input type="radio" name="pf-rv-q' + qi + '" value="' + oi + '" style="margin-right:8px;vertical-align:middle;">' + esc(opt) + '</label>';
      });
      h += '</div>';
    });
    h += '<button data-pf-rv-submit style="' + BTN + '">SUBMIT ANSWERS</button>' +
      '<div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    host.innerHTML = h;
    host.querySelector('[data-pf-rv-submit]').onclick = function () {
      var answers = [], missing = false;
      for (var qi = 0; qi < nq; qi++) {
        var sel = host.querySelector('input[name="pf-rv-q' + qi + '"]:checked');
        if (!sel) { missing = true; break; }
        answers.push(Number(sel.value));
      }
      var msg = host.querySelector('[data-pf-rv-msg]');
      if (missing) { msg.innerHTML = '<span style="color:#e8a0a0;">Answer all ' + nq + ' before submitting.</span>'; return; }
      msg.innerHTML = '<span style="color:#b8b0a0;">Grading\u2026</span>';
      postJSON('reviewer_quiz_submit', { answers: answers }, function (j) {
        if (!j || j.ok !== true) {
          msg.innerHTML = '<span style="color:#e8a0a0;">Couldn\u2019t grade right now. Try again later.</span>';
          return;
        }
        if (j.passed === true) { renderQueue(host); }
        else {
          msg.innerHTML = '<span style="color:#e8a0a0;">Not quite \u2014 review the orientation above and try again. ' +
            'The four checks are the whole job: item, price, date, store.</span>';
          var back = document.createElement('button');
          back.setAttribute('style', BTN_GHOST + 'margin-top:8px;');
          back.textContent = '\u2190 BACK TO ORIENTATION';
          back.onclick = function () { renderOrientation(host); };
          msg.appendChild(back);
        }
      });
    };
  }

  function renderQueue(host) {
    if (off()) return;
    host.innerHTML =
      '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">REVIEW QUEUE</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:4px;">Receipts assigned to you right now. Nothing else \u2014 reviewers never browse the archive.</div>' +
      '<div style="' + SMALL + 'margin-bottom:12px;">Screenshots can\u2019t be prevented by any viewer; reviewers are callsign-authenticated, images are time-limited, and quarantine purges within 24 hours. That\u2019s the honest boundary.</div>' +
      '<div data-pf-rv-list><div style="color:#b8b0a0;">Loading your queue\u2026</div></div>' +
      '</div>';
    loadQueue(host);
  }

  function loadQueue(host) {
    var list = host.querySelector('[data-pf-rv-list]');
    if (!list) return;
    getAuthed('review_queue', {}, function (j) {
      if (!j || j.ok !== true) {
        var ec = String((j && (j.err || j.error)) || '');
        if (ec.indexOf('not_reviewer') !== -1 || ec.indexOf('not a reviewer') !== -1) {
          renderOrientation(host);
          return;
        }
        list.innerHTML = '<div style="color:#e8a0a0;">Couldn\u2019t load the queue right now. Try again later.</div>';
        return;
      }
      var q = Array.isArray(j.queue) ? j.queue : [];
      if (!q.length) {
        list.innerHTML = '<div style="color:#9fd6a0;">Queue\u2019s clear. Nothing assigned to you right now.</div>';
        return;
      }
      var storeList = Array.isArray(j.store_list) ? j.store_list : [];
      list.innerHTML = '<div style="' + SMALL + 'margin-bottom:10px;">' + q.length + ' receipt' + (q.length === 1 ? '' : 's') + ' waiting.</div>' +
        q.map(function (it) { return reviewCard(it, storeList); }).join('');
      var cards = list.querySelectorAll('[data-pf-rv-id]');
      for (var i = 0; i < cards.length; i++) wireReviewCard(host, cards[i], q[i]);
    });
  }

  /* Reviewer queue card — matches the BACKEND's claimed object shape
     EXACTLY: nested claimed:{item_id, item_name, price_cents, reported_date,
     store} (read it.claimed.*, never the old flat fields). The verify
     path collects the four extracted facts the backend requires:
     store_name (server-provided closed list), receipt_date, item_id and
     price_cents (prefilled from the claimed facts the reviewer confirmed
     against the photo). Reviewer blindness: the uploader's callsign is
     never returned by the backend and never rendered. */
  function reviewCard(it, storeList) {
    var img = safeUrl(absUrl(it.image_url));
    var cl = it.claimed || {};
    var stores = Array.isArray(storeList) ? storeList : [];
    var h = '<div data-pf-rv-id="' + esc(String(it.receipt_id)) + '" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;margin-bottom:12px;">';
    if (img) {
      h += '<img src="' + esc(img) + '" alt="Assigned receipt" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">';
    } else {
      h += '<div style="' + SMALL + 'margin-bottom:10px;">Image unavailable \u2014 skip this one.</div>';
    }
    /* The CLAIMED facts only (nested claimed object — the backend contract). */
    h += '<div style="font-size:13px;color:#b8b0a0;margin-bottom:2px;">CLAIMED</div>' +
      '<div style="font-size:14px;"><b>' + esc(String(cl.item_name || cl.item_id || '\u2014')) + '</b> \u2014 ' + esc(money(cl.price_cents)) + '</div>' +
      '<div style="' + SMALL + 'margin-top:2px;">Date: ' + esc(fmtDate(cl.reported_date)) +
      ' \u00b7 Store: ' + esc(String(cl.store || '\u2014').slice(0, 64)) + '</div>';
    if (it.is_audit && it.verified_fields) {
      var vf = it.verified_fields;
      h += '<div style="' + SMALL + 'margin-top:4px;">On record: ' + esc(String(vf.store_name || '')) +
        ' \u00b7 ' + esc(String(vf.receipt_date || '')) + ' \u00b7 ' + esc(money(vf.price_cents)) + '</div>';
    }
    h += '<div style="margin-top:12px;">' +
      '<button data-pf-rv-yes style="' + BTN + 'margin-right:8px;">VERIFIED</button>' +
      '<button data-pf-rv-no style="' + BTN_GHOST + 'margin-right:8px;">REJECT</button>' +
      '<button data-pf-rv-pii style="' + BTN_GHOST + 'border-color:#c1121f;color:#e8a0a0;">REPORT PII</button>' +
      '</div>' +
      /* Verify form: the four extracted facts the backend validates. Item +
         price ride the claimed values the reviewer confirmed on the photo;
         store comes from the server-provided closed list; the date is read
         from the receipt (YYYY-MM-DD, within 7 days before the report). */
      '<div data-pf-rv-verify style="margin-top:10px;display:none;">' +
      '<div style="font-size:13px;color:#b8b0a0;margin-bottom:6px;">CONFIRM THE FOUR FACTS FROM THE PHOTO</div>' +
      '<div style="font-size:13px;margin-bottom:6px;">Item: <b>' + esc(String(cl.item_name || cl.item_id || '')) + '</b>' +
      ' \u00b7 Price: <b>' + esc(money(cl.price_cents)) + '</b></div>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">STORE (from the receipt)</label>' +
      '<select data-pf-rv-store style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;">' +
      stores.map(function (nm) { return '<option value="' + esc(nm) + '">' + esc(nm) + '</option>'; }).join('') +
      '</select>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT DATE (YYYY-MM-DD)</label>' +
      '<input data-pf-rv-date type="text" value="' + esc(fmtDate(cl.reported_date)) + '" placeholder="2026-10-04" style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;">' +
      '<div style="margin-top:8px;"><button data-pf-rv-yes-go style="' + BTN + 'margin-right:8px;">CONFIRM VERIFIED</button>' +
      '<button data-pf-rv-yes-cancel style="' + BTN_GHOST + '">BACK</button></div>' +
      '</div>' +
      '<div data-pf-rv-reason style="margin-top:10px;display:none;">' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">REASON</label>' +
      '<select data-pf-rv-reason-sel style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;">' +
      REJECT_ORDER.map(function (c) { return '<option value="' + c + '">' + esc(REJECT_LABELS[c]) + '</option>'; }).join('') +
      '</select>' +
      '<div style="margin-top:8px;"><button data-pf-rv-no-go style="' + BTN + 'margin-right:8px;">CONFIRM REJECT</button>' +
      '<button data-pf-rv-no-cancel style="' + BTN_GHOST + '">BACK</button></div>' +
      '</div>' +
      '<div data-pf-rv-done style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    return h;
  }

  function wireReviewCard(host, card, it) {
    var rid = card.getAttribute('data-pf-rv-id');
    var cl = (it && it.claimed) || {};
    var doneBox = card.querySelector('[data-pf-rv-done]');
    function decided(html) {
      try {
        doneBox.innerHTML = html;
        var btns = card.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) { btns[i].disabled = true; btns[i].style.opacity = '0.4'; }
      } catch (e) {}
    }
    function decide(payload, doneMsg) {
      payload.receipt_id = String(rid);
      postJSON('review_decide', payload, function (j) {
        if (!j || j.ok !== true) {
          decided('<span style="color:#e8a0a0;">Decision didn\u2019t land \u2014 nothing changed. Try again.</span>');
          var btns = card.querySelectorAll('button');
          for (var i = 0; i < btns.length; i++) { btns[i].disabled = false; btns[i].style.opacity = '1'; }
          return;
        }
        /* Beta double-review: two agreeing reviewers verify. The card
           leaves this reviewer's queue either way. */
        decided(doneMsg);
        setTimeout(function () {
          try {
            if (card.isConnected) { card.remove(); }
            var rest = host.querySelectorAll('[data-pf-rv-id]');
            if (!rest.length) loadQueue(host);
          } catch (e) {}
        }, 1200);
      });
    }
    var verifyBox = card.querySelector('[data-pf-rv-verify]');
    card.querySelector('[data-pf-rv-yes]').onclick = function () {
      verifyBox.style.display = 'block';
      try { verifyBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    };
    card.querySelector('[data-pf-rv-yes-cancel]').onclick = function () { verifyBox.style.display = 'none'; };
    card.querySelector('[data-pf-rv-yes-go]').onclick = function () {
      var storeSel = card.querySelector('[data-pf-rv-store]');
      var dateEl = card.querySelector('[data-pf-rv-date]');
      /* review_decide verify payload, backend-exact:
         {decision, reject_reason?, store_name, receipt_date, item_id, price_cents} */
      decide({ decision: 'verified',
        store_name: storeSel ? storeSel.value : '',
        receipt_date: dateEl ? String(dateEl.value || '').trim() : '',
        item_id: String(cl.item_id || ''),
        price_cents: Number(cl.price_cents) || 0 },
        '<span style="color:#9fd6a0;">Marked verified. The uploader gets a quiet checkmark \u2014 no XP, no fanfare.</span>');
    };
    var reasonBox = card.querySelector('[data-pf-rv-reason]');
    card.querySelector('[data-pf-rv-no]').onclick = function () {
      reasonBox.style.display = 'block';
      try { reasonBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    };
    card.querySelector('[data-pf-rv-no-cancel]').onclick = function () { reasonBox.style.display = 'none'; };
    card.querySelector('[data-pf-rv-no-go]').onclick = function () {
      var sel = card.querySelector('[data-pf-rv-reason-sel]');
      decide({ decision: 'rejected', reject_reason: sel ? sel.value : 'item_unreadable' },
        '<span style="color:#b8b0a0;">Rejected with a plain-language reason for the uploader. Their price report still counts.</span>');
    };
    /* Report PII escape hatch (§3): the backend-exact payload is
       {decision:'pii_flag'} — quarantine + ≤24h purge, reviewer never
       downloads or copies the image. */
    card.querySelector('[data-pf-rv-pii]').onclick = function () {
      if (window.confirm('Flag this photo for payment details? It will be quarantined and purged within 24 hours. The uploader\u2019s report still counts.')) {
        decide({ decision: 'pii_flag' },
          '<span style="color:#9fd6a0;">Flagged \u2014 the photo is quarantined and purges within 24 hours. You shielded the uploader.</span>');
      }
    };
  }

  /* ---------------- init ---------------- */
  try { mountHistory(); } catch (e) { if (PF && PF.error) PF.error('receipt-uploads', e); }
  try { mountReview(); } catch (e) { if (PF && PF.error) PF.error('receipt-uploads', e); }
})();
