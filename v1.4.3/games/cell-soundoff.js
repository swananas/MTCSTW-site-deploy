/* games/cell-soundoff.js  |  PF v1.4.3 | TEARDOWN WS-3 (2026-10-06, CEO-approved).
   SOUND OFF — the ONE named first action after a one-tap join.
   "SOUND OFF → name, city, why you're here — REPORT BACK" (News Desk voice).
   Fires on the pf-cell-joined / pf-cell-formed lifecycle events (games/cells.js).
   The squad room opens with exactly ONE card and ONE action — no surveys,
   no menus. The REPORT BACK fires the joiner's first real cell_checkin
   through the EXISTING wire (the check-in that counts toward the quorum);
   the intro itself is stored device-local with provenance flags
   (origin:'soundoff') and never counted toward any aggregate.
   CONTRIBUTION-FIRST, IDENTITY-SECOND (enforced in code):
     - SOCIAL actions (post-as-identity, share-as-identity, cell chat) REQUIRE
       a claimed callsign. This module refuses to mount the form for guests —
       it renders the claim prompt instead. No social action is reachable
       without PFCallsign().
     - DATA actions for guests live in the public squad room (cells.js
       paintGuestRoom) — rate-limited, quarantined in localStorage until a
       callsign is claimed.
   GATES: Psych (no blame copy — "the net holds", never "you failed");
   Security (intro never touches quorums/aggregates; one session -> one
   callsign merge on claim with provenance flags); Brand (CTA discipline —
   the red button is DEPLOY-family; JOIN THE FIGHT. never reused);
   News Desk (red-button rule; zero donate-language).
   ZERO new XP (no xpGrant, no creditLocal, no pf-xp dispatch).
   ZERO new backend actions — cell_checkin already exists.
   KILL: ?pf_off=cell-soundoff  or  localStorage pf_disabled_v1='["cell-soundoff"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('cell-soundoff')) { return; }
  if (window.pfCellSoundoffDone) { return; }
  window.pfCellSoundoffDone = true;

  var DONE_KEY = 'pf_soundoff_done_v1';   /* {cellId:1} — the card fires once per cell */
  var STORE_KEY = 'pf_soundoff_v1';       /* device-local intros w/ provenance */
  var pat = (window.PF && PF.patterns) || null;

  /* Minimal local styles (brand classes come from 33-patterns.css). */
  try {
    if (!document.getElementById('pf-soundoff-css')) {
      var st = document.createElement('style');
      st.id = 'pf-soundoff-css';
      st.textContent = [
        '#pf-soundoff{border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;padding:1.2rem 1.1rem;margin:0 0 1.2rem;box-sizing:border-box;box-shadow:0 0 30px rgba(193,18,31,.4);font-family:inherit}',
        '#pf-soundoff .pf-so-body{padding:.4rem 0 .2rem}',
        '#pf-soundoff .pf-so-fields input,#pf-soundoff .pf-so-fields textarea{display:block;width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5ead6;border:2px solid #444;padding:.7rem .8rem;font-size:1rem;margin:0 0 .5rem;font-family:inherit}',
        '#pf-soundoff .pf-so-cta{margin:.7rem 0}',
        '#pf-soundoff .pf-so-go{background:#c1121f;border:2px solid #c1121f;color:#fff;font-weight:900;letter-spacing:.1em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer}',
        '#pf-soundoff .pf-so-note{font-size:.78rem;color:#b8ab8e;line-height:1.5;margin-top:.5rem}',
        '#pf-soundoff .pf-so-dismiss{margin-top:.6rem;text-align:center}',
        '#pf-soundoff .pf-so-dismiss button{background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;cursor:pointer;text-decoration:underline}',
        '#pf-soundoff .pf-so-fallback-head{margin-bottom:.5rem}',
        '#pf-soundoff .pf-so-fallback-head b{font-size:1.3rem;letter-spacing:.06em}',
        '#pf-soundoff .pf-so-fallback-head div{font-size:.85rem;color:#b8ab8e;margin-top:.25rem}'
      ].join('\n');
      document.head.appendChild(st);
    }
  } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function load(k, fb) {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); } catch (e) { return fb; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) { try { if (window.PF && PF.toast) PF.toast(m); } catch (e) {} }
  function doneFor(cellId) { try { return !!load(DONE_KEY, {})[String(cellId)]; } catch (e) { return false; } }
  function markDone(cellId) {
    var o = load(DONE_KEY, {}); o[String(cellId)] = 1; save(DONE_KEY, o);
  }
  /* Social gate: posting an intro is a SOCIAL action (post-as-identity).
     No callsign, no form — the claim prompt mounts instead. */
  function socialOk() { return !!ident().callsign; }

  function mountPoint() {
    try {
      var h = document.getElementById('pf-cells') || document.getElementById('pf-cell-hq');
      return h || null;
    } catch (e) { return null; }
  }

  /* The REPORT BACK fires the joiner's first cell_checkin through the
     EXISTING wire (PF.postAction when available, fetch fallback). The intro
     is stored device-locally with provenance flags — never sent, never
     aggregated. */
  function fireReportBack(cellId, done) {
    var id = ident();
    var body = {
      type: 'cell', cell_action: 'cell_checkin',
      callsign: id.callsign, device: id.device,
      cell_id: cellId, origin: 'soundoff'
    };
    function cb(j) {
      if (j && j.ok) {
        if (j.milestone_hit) toast('\uD83D\uDD25 CELL STREAK MILESTONE: ' + j.milestone_hit + ' DAYS.');
        else toast(j.already ? 'Already checked in — the net holds.' : 'Checked in. The streak hears you.');
      } else if (j) {
        toast('The wire fought back — your intro is saved, retry the check-in below.');
      }
      done(j && j.ok);
    }
    try {
      if (window.PF && PF.postAction) { PF.postAction('cell', 'cell_action', 'cell_checkin', body, cb); return; }
    } catch (e) {}
    var url = window.PF_BACKEND_URL || '';
    if (!url) { cb({ ok: false }); return; }
    try {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { cb(j || { ok: false }); })
        .catch(function () { cb({ ok: false }); });
    } catch (e) { cb({ ok: false }); }
  }

  function storeIntro(cellId, cellName, name, city, why) {
    var id = ident();
    var rec = {
      cell_id: String(cellId), cell_name: String(cellName || ''),
      callsign: id.callsign, device: id.device,
      name: String(name || '').slice(0, 32),
      city: String(city || '').slice(0, 48),
      why: String(why || '').slice(0, 140),
      ts: Date.now(),
      /* provenance: device-local, never aggregated, merges to this
         callsign on the one session -> one callsign path */
      origin: 'soundoff', guest_queued: 0
    };
    var all = load(STORE_KEY, []);
    all.push(rec);
    save(STORE_KEY, all.slice(-50)); /* bounded */
    try { document.dispatchEvent(new CustomEvent('pf-soundoff', { detail: rec })); } catch (e) {}
    return rec;
  }

  function mount(cell) {
    var cellId = cell && (cell.id || cell.cell_id);
    var cellName = (cell && cell.name) || 'YOUR CELL';
    if (!cellId || doneFor(cellId)) return;
    var host = mountPoint();
    if (!host) return;
    try { if (document.getElementById('pf-soundoff')) return; } catch (e) {}

    var card = document.createElement('div');
    card.id = 'pf-soundoff';
    card.setAttribute('data-pf-soundoff', '1');

    /* SOCIAL GATE: a guest (no callsign) cannot post. The claim prompt
       mounts instead of the form — identity is asked for at the moment
       they want credit. */
    var formHtml;
    if (!socialOk()) {
      formHtml = '<div class="pf-so-note">SOUND OFF is a social action — your voice, your name on it. ' +
        'Claim a callsign and the mic is yours.</div>' +
        (window.PF && PF.gateHTML ? PF.gateHTML('Your voice needs a name.', 'to sound off') : '');
    } else {
      var cs = ident().callsign;
      formHtml =
        '<div class="pf-so-fields">' +
        '<input id="pf-so-name" maxlength="32" placeholder="NAME" value="' + esc(cs) + '" autocomplete="off" aria-label="Name">' +
        '<input id="pf-so-city" maxlength="48" placeholder="CITY (or just the state)" autocomplete="off" aria-label="City">' +
        '<textarea id="pf-so-why" maxlength="140" rows="2" placeholder="WHY YOU\'RE HERE (one line)" aria-label="Why you are here"></textarea>' +
        '</div>' +
        '<div class="pf-so-cta">' +
        (pat && pat.deployBtn
          ? pat.deployBtn('#pf-soundoff', 'REPORT BACK')
          : '<button type="button" id="pf-so-go" class="pf-so-go">REPORT BACK &rarr;</button>') +
        '</div>' +
        '<div class="pf-so-note">This fires your first check-in — it counts toward today&rsquo;s quorum. ' +
        'Your words stay on this device.</div>';
    }

    var head = pat && pat.intelCard
      ? pat.intelCard({
          kicker: 'FIRST ACTION — SOUND OFF',
          headline: 'SOUND OFF',
          dataLine: 'name, city, why you&rsquo;re here — then <b>REPORT BACK</b>. ' +
            'One move. Do it now and the cell knows your voice.'
        })
      : '<div class="pf-so-fallback-head"><b>SOUND OFF</b><div>name, city, why you&rsquo;re here — then REPORT BACK.</div></div>';

    var bar = pat && pat.actionBar
      ? pat.actionBar({ shareUrl: loc(), cellUrl: '/cells', reportUrl: loc() })
      : '';

    card.innerHTML = head +
      '<div class="pf-so-body">' + formHtml + '</div>' + bar +
      '<div class="pf-so-dismiss"><button type="button" id="pf-so-skip">skip for now</button></div>';

    try {
      if (host.firstChild) host.insertBefore(card, host.firstChild);
      else host.appendChild(card);
    } catch (e) { return; }
    try { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {}

    /* Wire the pattern's deploy button (it renders as an anchor): hijack
       the click so it submits the form instead of navigating. */
    var anchor = card.querySelector('.pf-pat-deploy-red');
    var fallbackBtn = card.querySelector('#pf-so-go');
    var skip = card.querySelector('#pf-so-skip');
    if (skip) skip.onclick = function () { markDone(cellId); destroy(); };

    function submit() {
      if (!socialOk()) return; /* belt and suspenders: never post as a ghost */
      var nm = val('pf-so-name'), ct = val('pf-so-city'), why = val('pf-so-why');
      if (!nm) { toast('Give them a name to remember.'); return; }
      fireReportBack(cellId, function () {
        storeIntro(cellId, cellName, nm, ct, why);
        markDone(cellId);
        destroy();
        toast('SOUND OFF heard. Welcome to ' + cellName + '.');
      });
    }
    function val(id) {
      try { var el = card.querySelector('#' + id); return el ? String(el.value || '').trim() : ''; } catch (e) { return ''; }
    }
    if (anchor) anchor.addEventListener('click', function (e) { try { e.preventDefault(); } catch (x) {} submit(); });
    if (fallbackBtn) fallbackBtn.onclick = submit;
  }

  function loc() { try { return String(window.location.href || '/cells'); } catch (e) { return '/cells'; } }

  function destroy() {
    try {
      var c = document.getElementById('pf-soundoff');
      if (c && c.parentNode) c.parentNode.removeChild(c);
    } catch (e) {}
  }

  /* The squad room opens with ONE named first action — exactly once per
     cell. Fires on the same lifecycle events cell-first-hour.js uses; the
     sound-off card mounts FIRST (top of the squad room) and the guided
     first-hour checklist follows after the intro is done or skipped. */
  document.addEventListener('pf-cell-joined', function (e) {
    var cell = e && e.detail && e.detail.cell;
    if (!cell) return;
    setTimeout(function () { mount(cell); }, 400);
  });
  document.addEventListener('pf-cell-formed', function (e) {
    var cell = e && e.detail && e.detail.cell;
    if (!cell) return;
    setTimeout(function () { mount(cell); }, 400);
  });
  /* Exposed for the teardown verify harness. */
  window.PFSoundoff = { mount: mount, socialOk: socialOk, DONE_KEY: DONE_KEY, STORE_KEY: STORE_KEY };
})();
