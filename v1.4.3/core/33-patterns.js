/* core/33-patterns.js  |  PF v1.4.3 | Section teardown WS-0 (2026-10-06):
   THE UNIFIED BRAND PATTERN LIBRARY — shared render helpers for the 8 brand
   patterns. Pure HTML-string builders: zero backend calls, zero writes, no new
   XP mechanics (the ring renders supplied numbers only — it never mints, never
   grants, never posts). Every helper is fail-open: it returns '' on any bad
   input and NEVER throws — a pattern that can't render renders nothing.
   KILL: ?pf_off=patterns  or  localStorage pf_disabled_v1='["patterns"]'
   API (all on window.PF.patterns):
     hero(o)      P1 Briefing Hero   {kicker, mission, joinHref, joinLabel?, sub?}
     intelCard(o) P2 Intel Card      {kicker?, headline, dataLine?, verb?, label?, href?}
     join(href, label?)              P3 JOIN THE FIGHT. — enlistment ONLY
     deploy(href, label?)            P3 DEPLOY -> — the action verb
     deployBtn(href, label?)         P3 DEPLOY -> as a red BUTTON (DEPLOY-family red allowed)
     report(href, label?)            P3 REPORT BACK -> — close-the-loop verb
     textLink(href, label)           doorway links (FOLLOW THE MONEY style) — text, never a button
     cta(verb, href, label?)         unified CTA; verb ∈ {join, deploy, deployBtn, report}
     fromLegacy(rogueVerb, href, label?)  migrates rogue verbs to sanctioned ones
     dataStrip(o) P4 Data Strip      {figure, label, source, updated} — FAIL-CLOSED
     ring(o)      P5 Progression Ring {xp, cap, streak?, rank?} — render-only
     actionBar(o) P6 Action Bar      {shareUrl?, cellUrl?, reportUrl?} — fixed order
     ledgerLine(o) P7 Ledger Line    {what, figure, hot?, sub?}
     proof(o)     P8 Social-Proof Line {count, text} — suppressed without a real count
   ---------------------------------------------------------------------------
   ROGUE-VERB MAP (CTA discipline — enforced by scripts/verify-teardown-patterns.js):
     "CALL IT ->"          => cta('deploy', ...)     (plain-stakes action verb)
     "ENLIST ->"           => cta('deploy', ...)     (card CTAs never say enlist)
     "HOLD EQUITY ->"      => cta('deploy', ...)     (or report() where it closes a loop)
     "CONFIRM" pill        => report(...)            (confirmations are close-the-loop)
     "FOLLOW THEIR MONEY ->" => textLink(...)        (a doorway, not an action)
     "JOIN THE FIGHT."     => join(...) ONLY — enlistment, never reused.
   BANNED IN CTA COPY: "donate" (any case), "equity" in CTA copy.
   COLOR RULE: red (#c1121f) never carries up/down trend semantics; trends are
   gray/white only. Red = CTAs, active states, figures-that-matter.
   RED-BUTTON RULE: only enlistment (.pf-pat-join) and DEPLOY-family
   (.pf-pat-deploy-red) buttons may be red; card actions are text links. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('patterns')) return;

  /* -- tiny guards ------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cleanHref(h) {
    h = String(h == null ? '' : h).trim();
    if (!h) return '';
    if (/^(javascript|data|vbscript):/i.test(h)) return '';
    return h;
  }
  /* fail-open wrapper: any helper that can't render renders nothing */
  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments) || ''; }
      catch (e) { return ''; }
    };
  }

  var ARROW = ' \u2192';

  /* -- P3: CTA family ---------------------------------------------------
     JOIN THE FIGHT. is the ONLY red button and is enlistment-only: join()
     refuses custom labels (the label is the product's highest-value action and
     is never reworded) and requires an explicit destination. */
  /* CTA-label discipline: the guards below REFUSE rogue verbs outright.
     The rogue-verb map lives in the header comment + LEGACY_MAP; these regexes
     are the enforcement machinery (exempted from the CTA-verb source lint). */
  function bannedCTA(label, allowMoneyDoorway) {
    label = String(label == null ? '' : label);
    if (/donate/i.test(label)) return true;
    if (/equity|enlist|call\s*it|confirm/i.test(label)) return true;
    if (!allowMoneyDoorway && /follow their money/i.test(label)) return true;
    return false;
  }

  var _join = safe(function (href, label) {
    href = cleanHref(href);
    if (!href) return '';
    label = 'JOIN THE FIGHT.'; /* enlistment-only: never reworded, never reused */
    return '<a class="pf-pat-join" href="' + esc(href) + '">' + esc(label) + '</a>';
  });

  var _deploy = safe(function (href, label) {
    href = cleanHref(href);
    if (!href) return '';
    label = String(label == null || label === '' ? 'DEPLOY' : label);
    if (bannedCTA(label, false)) return '';
    return '<a class="pf-pat-deploy" href="' + esc(href) + '">' + esc(label) + ARROW + '</a>';
  });

  var _deployBtn = safe(function (href, label) {
    href = cleanHref(href);
    if (!href) return '';
    label = String(label == null || label === '' ? 'DEPLOY' : label);
    if (bannedCTA(label, false)) return '';
    return '<a class="pf-pat-deploy-red" href="' + esc(href) + '">' + esc(label) + ARROW + '</a>';
  });

  var _report = safe(function (href, label) {
    href = cleanHref(href);
    if (!href) return '';
    label = String(label == null || label === '' ? 'REPORT BACK' : label);
    if (bannedCTA(label, false)) return '';
    return '<a class="pf-pat-report" href="' + esc(href) + '">' + esc(label) + ARROW + '</a>';
  });

  /* Doorway links (FOLLOW THE MONEY style): text, never a button, never red.
     The money doorway is the ONE sanctioned label this helper accepts. */
  var _textLink = safe(function (href, label) {
    href = cleanHref(href);
    if (!href || !label) return '';
    label = String(label);
    if (bannedCTA(label, true)) return '';
    return '<a class="pf-pat-textlink" href="' + esc(href) + '">' + esc(label) + '</a>';
  });

  /* Legacy-verb migration: CALL IT / ENLIST / HOLD EQUITY / CONFIRM-pill
     usages translate here instead of shipping rogue CTAs. JOIN THE FIGHT.
     never goes through this path (enlistment-only, use join()). */
  var LEGACY_MAP = {
    'call it': 'deploy', 'call-it': 'deploy', 'callit': 'deploy',
    'enlist': 'deploy',
    'hold equity': 'deploy', 'equity': 'deploy',
    'confirm': 'report'
  };
  var _fromLegacy = safe(function (rogueVerb, href, label) {
    var key = String(rogueVerb == null ? '' : rogueVerb).toLowerCase().replace(/[→>\s]+$/, '');
    var verb = LEGACY_MAP[key];
    if (!verb) return '';
    if (verb === 'deploy') return _deploy(href, label);
    return _report(href, label);
  });

  var _cta = safe(function (verb, href, label) {
    verb = String(verb == null ? '' : verb).toLowerCase();
    if (verb === 'join') return _join(href, label);
    if (verb === 'deploy') return _deploy(href, label);
    if (verb === 'deploybtn' || verb === 'deploy-btn' || verb === 'deploy_red') return _deployBtn(href, label);
    if (verb === 'report') return _report(href, label);
    return ''; /* unknown verb: render nothing, never a rogue CTA */
  });

  /* -- P1: Briefing Hero -----------------------------------------------
     Red caps kicker -> one-line mission -> single primary red button.
     No carousels, no sliders, no video. A movement briefs. */
  var _hero = safe(function (o) {
    o = o || {};
    if (!o.kicker || !o.mission) return '';
    var join = o.joinHref ? _join(o.joinHref, o.joinLabel) : '';
    return '<section class="pf-pat pf-pat-hero">' +
      '<p class="pf-pat-hero-kicker">' + esc(o.kicker) + '</p>' +
      '<p class="pf-pat-hero-mission">' + esc(o.mission) + '</p>' +
      (o.sub ? '<p class="pf-pat-hero-sub">' + esc(o.sub) + '</p>' : '') +
      (join ? '<div>' + join + '</div>' : '') +
      '</section>';
  });

  /* -- P2: Intel Card ---------------------------------------------------
     Black card, red top-rule, white Arial-bold headline, one data line, one action. */
  var _intelCard = safe(function (o) {
    o = o || {};
    if (!o.headline) return '';
    var action = '';
    if (o.href) {
      var v = String(o.verb == null ? 'deploy' : o.verb).toLowerCase();
      action = v === 'report' ? _report(o.href, o.label)
        : v === 'join' ? _join(o.href, o.label)
        : _deploy(o.href, o.label);
    }
    return '<article class="pf-pat pf-pat-intel">' +
      (o.kicker ? '<p class="pf-pat-intel-kicker">' + esc(o.kicker) + '</p>' : '') +
      '<h3 class="pf-pat-intel-head">' + esc(o.headline) + '</h3>' +
      (o.dataLine ? '<p class="pf-pat-intel-data">' + o.dataLine + '</p>' : '') +
      (action ? '<div class="pf-pat-intel-actions">' + action + '</div>' : '') +
      '</article>';
  });

  /* -- P4: Data Strip ---------------------------------------------------
     FAIL-CLOSED: figure + label + source + recency ALL required. A figure
     without its source line and recency stamp renders NOTHING — the movement's
     whole pitch is "we count what they hide," and an unsourced number is a lie. */
  var _dataStrip = safe(function (o) {
    o = o || {};
    var figure = String(o.figure == null ? '' : o.figure).trim();
    var label = String(o.label == null ? '' : o.label).trim();
    var source = String(o.source == null ? '' : o.source).trim();
    var updated = String(o.updated == null ? '' : o.updated).trim();
    if (!figure || !label || !source || !updated) return '';
    return '<div class="pf-pat pf-pat-data">' +
      '<p class="pf-pat-data-fig">' + esc(figure) + '</p>' +
      '<p class="pf-pat-data-label">' + esc(label) + '</p>' +
      '<div class="pf-pat-data-rule"></div>' +
      '<p class="pf-pat-data-src">' + esc(source) + '</p>' +
      '<p class="pf-pat-data-time">updated ' + esc(updated) + '</p>' +
      '</div>';
  });

  /* -- P5: Progression Ring ---------------------------------------------
     Render-only: the ring displays supplied numbers. It never mints XP, never
     grants, never posts — zero new XP mechanics by construction. */
  var FLAME = '<svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">' +
    '<path class="pf-pat-ring-flame" d="M7 0c1 4-3 5-3 9a4 4 0 0 0 8 0c0-2-1-3-2-4' +
    ' 0 1.5-1 2-1.5 2C8.5 5 8 2 7 0zM5 12.5A2.5 2.5 0 0 0 7.5 15 2.5 2.5 0 0 0 10 12.5' +
    'c0-1.2-.8-2-1.5-2.7-.3 1-1 1.6-1.7 1.9.2-1.5-.3-3-.8-4.2-1 1.8-3 3.2-3 5z"/></svg>';
  var _ring = safe(function (o) {
    o = o || {};
    var xp = Number(o.xp), cap = Number(o.cap);
    if (!isFinite(xp) || !isFinite(cap) || cap <= 0 || xp < 0) return '';
    var size = Math.max(48, Math.min(120, Number(o.size) || 72));
    var pct = Math.max(0, Math.min(100, Math.round((xp / cap) * 100)));
    var r = (size - 12) / 2, c = 2 * Math.PI * r;
    var dash = (pct / 100 * c).toFixed(1);
    var streak = Math.floor(Number(o.streak) || 0);
    return '<div class="pf-pat pf-pat-ring">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + pct + '% to next rank">' +
      '<circle class="pf-pat-ring-track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="6" fill="none"/>' +
      '<circle class="pf-pat-ring-fill" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="6" ' +
      'stroke-dasharray="' + dash + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text class="pf-pat-ring-pct" x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="' + Math.round(size / 4.5) + '">' + pct + '%</text>' +
      '</svg>' +
      '<div class="pf-pat-ring-meta">' +
      (o.rank ? '<p class="pf-pat-ring-rank">' + esc(o.rank) + '</p>' : '') +
      (streak > 0 ? '<p class="pf-pat-ring-streak">' + FLAME + '<span>' + streak + ' day streak</span></p>' : '') +
      '</div></div>';
  });

  /* -- P6: Action Bar ---------------------------------------------------
     Every surface ends the same way: SHARE THIS INTEL -> TAKE THIS TO YOUR
     CELL -> REPORT BACK. Same order, same styling, always. Nothing ends with
     the individual. */
  var _actionBar = safe(function (o) {
    o = o || {};
    var items = [
      ['SHARE THIS INTEL', cleanHref(o.shareUrl)],
      ['TAKE THIS TO YOUR CELL', cleanHref(o.cellUrl)],
      ['REPORT BACK', cleanHref(o.reportUrl)]
    ];
    var live = items.filter(function (it) { return it[1]; });
    if (!live.length) return '';
    var html = items.map(function (it) {
      return it[1]
        ? '<a href="' + esc(it[1]) + '">' + esc(it[0]) + '</a>'
        : '<span class="pat-disabled">' + esc(it[0]) + '</span>';
    }).join('');
    return '<nav class="pf-pat pf-pat-actions" aria-label="Next actions">' + html + '</nav>';
  });

  /* -- P7: Ledger Line --------------------------------------------------
     Left = what, right = figure, red when it matters (money, XP, votes). */
  var _ledgerLine = safe(function (o) {
    o = o || {};
    if (!o.what || o.figure == null || String(o.figure).trim() === '') return '';
    var cls = o.hot ? ' pf-pat-ledger hot' : 'pf-pat-ledger';
    return '<div class="pf-pat ' + cls + '">' +
      '<span class="pf-pat-ledger-what">' + esc(o.what) +
      (o.sub ? '<span class="pf-pat-ledger-sub">' + esc(o.sub) + '</span>' : '') + '</span>' +
      '<span class="pf-pat-ledger-fig' + (o.hot ? ' hot' : '') + '">' + esc(o.figure) + '</span>' +
      '</div>';
  });

  /* -- P8: Social-Proof Line --------------------------------------------
     Placement: under the figure, before the action. Voice: flat, factual.
     Honesty: REAL figures or the line is suppressed — count must be a
     positive finite number, and the text is passed through un-inflated. */
  var _proof = safe(function (o) {
    o = o || {};
    var n = Number(o.count);
    if (!isFinite(n) || n <= 0) return '';
    var txt = String(o.text == null ? '' : o.text).trim();
    if (!txt) return '';
    return '<p class="pf-pat pf-pat-proof"><b>' + esc(Math.floor(n).toLocaleString('en-US')) + '</b> ' + esc(txt) + '</p>';
  });

  PF.patterns = {
    hero: _hero, intelCard: _intelCard,
    join: _join, deploy: _deploy, deployBtn: _deployBtn, report: _report,
    textLink: _textLink, cta: _cta, fromLegacy: _fromLegacy,
    dataStrip: _dataStrip, ring: _ring, actionBar: _actionBar,
    ledgerLine: _ledgerLine, proof: _proof
  };
})();
