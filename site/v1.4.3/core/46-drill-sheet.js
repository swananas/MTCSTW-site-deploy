/* core/46-drill-sheet.js | PF v1.4.3 | EXPLORABLE-FACT DRILL-DOWN SHEET (WS-A, dir-20261010-010215-1757).
   WS-D §B2: tap a number → bottom sheet (phone) / right panel (desktop ≥1024px).
   Sheet anatomy, top to bottom:
     1. The figure, large — exact number tapped, unit, as-of timestamp
     2. "Why this number" logic chain — 2-4 plain-language steps (source → method → caveat)
     3. Per-source split bars — contributors, each tappable to its source row
     4. Time filter chips — 7d / 30d / 90d / all (one-tap apply, tap again to clear, honest-empty)
     5. Compare row — vs last period delta (red = worse for us)
     6. Action row — DEPLOY (share pipeline) + "Ask Karl" (composer with figure context)
   Every sheet dismisses via swipe-down / scrim tap / X — and back-button
   works: the sheet pushes a history entry, so back dismisses the sheet
   instead of leaving the page (WS-D B4 global rule: a sheet never traps back).
   DEPLOY confirm-gating (WS-D A1.4): the count flips on share-sheet CONFIRM,
   not on tap. Feedback (glow) ≠ commitment.
   Fail-closed on data: figure + source required, else render nothing.
   Zero XP. No fake counters.
   KILL: ?pf_off=drill-sheet or localStorage pf_disabled_v1='["drill-sheet"]'
   -------------------------------------------------------------------------- */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('drill-sheet')) { return; }

  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var S = null; /* active sheet state */

  function shareFigure(cfg, onConfirm) {
    var text = 'WHY ' + cfg.figure + (cfg.unit ? ' ' + cfg.unit : '') + '? ' +
      (cfg.chain && cfg.chain[0] ? cfg.chain[0] : '') +
      ' — via KARL at mtcstw.com';
    try {
      if (navigator.share) {
        navigator.share({ title: 'KARL Discovery', text: text, url: 'https://mtcstw.com/' })
          .then(function () { onConfirm(); })
          .catch(function () {}); /* dismissed = no confirm (A1.4) */
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          onConfirm();
          try { PF.butter && PF.butter.toast('Copied — paste it anywhere'); } catch (e) {}
        });
        return;
      }
      onConfirm();
    } catch (e) { onConfirm(); }
  }

  function askKarl(figure) {
    close();
    try {
      location.href = '/#ask';
      setTimeout(function () {
        try {
          var q = document.getElementById('kh-q');
          if (q) {
            q.value = 'Why ' + figure + '?';
            q.focus();
          }
        } catch (e) {}
      }, 600);
    } catch (e) {}
  }

  function open(cfg) {
    if (S) close(true);
    var figure = String(cfg.figure || '').trim();
    var source = String(cfg.source || '').trim();
    if (!figure || !source) {
      try { PF.error('drill-sheet', 'fail-closed: figure+source required'); } catch (e) {}
      return;
    }
    var scrim = document.createElement('div');
    scrim.className = 'bt-scrim';
    var sheet = document.createElement('div');
    sheet.className = 'bt-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');

    var chain = (cfg.chain || []).slice(0, 4).map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
    var splits = (cfg.splits || []).slice(0, 6).map(function (sp) {
      var pct = Math.max(0, Math.min(100, Number(sp.pct) || 0));
      return '<div class="bt-sheet-split"><div class="bt-split-top"><span>' + esc(sp.label || '') +
        '</span><span class="v">' + esc(sp.value || '') + '</span></div>' +
        '<div class="bt-split-bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
    var compare = '';
    if (cfg.compare && cfg.compare.delta) {
      var up = /^[-−]/.test(cfg.compare.delta.trim()) ? false : true;
      compare = '<div class="bt-sheet-compare"><span>vs ' + esc(cfg.compare.period || 'last period') +
        '</span><span class="' + (up ? 'delta-up' : 'delta-down') + '">' + esc(cfg.compare.delta) + '</span></div>';
    }
    var chips = ['7d', '30d', '90d', 'all'].map(function (c) {
      return '<button class="bt-chip" data-range="' + c + '">' + c + '</button>';
    }).join('');

    sheet.innerHTML =
      '<div class="bt-sheet-grab" aria-hidden="true"></div>' +
      '<div class="bt-sheet-head"><div><div style="font-size:12px;letter-spacing:.2em;color:#e5383b;font-weight:800">WHY THIS NUMBER</div>' +
      '<div class="bt-sheet-fig">' + esc(figure) + '</div>' +
      '<div class="bt-sheet-unit">' + esc(cfg.unit || '') +
      (cfg.asOf ? ' · <span style="color:#5a554b">as of ' + esc(cfg.asOf) + '</span>' : '') + '</div></div>' +
      '<button class="bt-sheet-x" aria-label="Close">×</button></div>' +
      '<div class="bt-sheet-body">' +
      (chain ? '<ul class="bt-sheet-chain">' + chain + '</ul>' : '') +
      (splits ? '<div class="bt-sheet-splits">' + splits + '</div>' : '') +
      '<div class="bt-sheet-chips" role="group" aria-label="Time range">' + chips + '</div>' +
      compare +
      '<div style="font-size:11px;color:#5a554b;letter-spacing:.06em;margin:4px 0 10px">SOURCE — ' + esc(source) + '</div>' +
      '<div class="bt-sheet-actions">' +
      '<button class="bt-act bt-act-deploy">DEPLOY</button>' +
      '<button class="bt-act bt-act-ask">ASK KARL</button>' +
      '</div></div>';

    document.body.appendChild(scrim);
    document.body.appendChild(sheet);
    /* lock body scroll while sheet is open */
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var state = { scrim: scrim, sheet: sheet, prevOverflow: prevOverflow, cfg: cfg, histPushed: false };
    S = state;

    /* history entry: back dismisses the sheet, never traps the gesture */
    try {
      if (window.history && history.pushState) {
        history.pushState({ btSheet: 1 }, '');
        state.histPushed = true;
      }
    } catch (e) {}

    var dismissed = function () { if (S === state) close(); };

    sheet.querySelector('.bt-sheet-x').addEventListener('click', dismissed);
    scrim.addEventListener('click', dismissed);

    /* swipe-down to dismiss */
    var startY = null;
    sheet.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (startY == null || !e.touches || !e.touches[0]) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      var dy = startY != null && e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0].clientY - startY : 0;
      startY = null;
      if (dy > 110) { dismissed(); }
      else { sheet.style.transform = ''; }
    });

    /* time chips: one tap applies, tap again clears; honest-empty */
    var chipsEls = sheet.querySelectorAll('.bt-chip');
    chipsEls.forEach(function (c) {
      c.addEventListener('click', function () {
        var wasOn = c.classList.contains('on');
        chipsEls.forEach(function (x) { x.classList.remove('on'); });
        if (!wasOn) {
          c.classList.add('on');
          if (cfg.onRange) cfg.onRange(c.getAttribute('data-range'), sheet);
        } else if (cfg.onRange) {
          cfg.onRange('all', sheet);
        }
      });
    });

    /* DEPLOY: glow on tap, count on CONFIRM only (WS-D A1.4) */
    var depBtn = sheet.querySelector('.bt-act-deploy');
    depBtn.addEventListener('click', function () {
      try { PF.butter && PF.butter.glow(depBtn); } catch (e) {}
      var done = false;
      shareFigure(cfg, function () {
        if (done) return; done = true;
        depBtn.textContent = 'DEPLOYED ✓';
        depBtn.disabled = true;
        try { PF.butter && PF.butter.toast('Deployed — spread it'); } catch (e) {}
        try { if (cfg.onDeploy) cfg.onDeploy(); } catch (e) {}
      });
    });

    sheet.querySelector('.bt-act-ask').addEventListener('click', function () {
      askKarl(cfg.figure + (cfg.unit ? ' ' + cfg.unit : ''));
    });

    /* animate in next frame */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        scrim.classList.add('bt-show');
        sheet.classList.add('bt-show');
      });
    });

    state.popstate = function () { if (S === state) close(true); };
    window.addEventListener('popstate', state.popstate);

    /* focus management: focus the close button, restore on dismiss */
    try {
      state.prevFocus = document.activeElement;
      sheet.querySelector('.bt-sheet-x').focus();
    } catch (e) {}
  }

  function close(fromPop) {
    if (!S) return;
    var st = S; S = null;
    try { window.removeEventListener('popstate', st.popstate); } catch (e) {}
    try {
      if (st.histPushed && !fromPop && window.history) history.back();
    } catch (e) {}
    var dur = reduced ? 0 : 280;
    st.scrim.classList.remove('bt-show');
    st.sheet.classList.remove('bt-show');
    st.sheet.style.transform = '';
    setTimeout(function () {
      try { st.scrim.remove(); st.sheet.remove(); } catch (e) {}
      try { document.body.style.overflow = st.prevOverflow || ''; } catch (e) {}
      try { if (st.prevFocus && st.prevFocus.focus) st.prevFocus.focus(); } catch (e) {}
    }, dur);
  }

  PF.drillSheet = { show: open, close: close };
})();
