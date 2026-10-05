/* games/deploy-tracker.js | PF v1.4.3 | A3 Deployment Tracker — arcade lobby deep-links
   into unplayed medal games before the Monday rack reset.
   KILL: ?pf_off=deploy-tracker  or  localStorage pf_disabled_v1='["deploy-tracker"]'
   ZERO-XP GUARDRAIL (A3): this is pure routing + urgency. No ledger writes,
   no xpFloat, no confetti. Do not add payouts here.
   Reads the same device-local medal state as games/service-medals.js
   (localStorage 'pf_medals_v2', week key PF.isoWeekKey(PF.chiNow())). */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('deploy-tracker')) { return; }
  try {

  var LS = 'pf_medals_v2';

  /* Medal catalog mirrors service-medals.js MEDALS (glyph + name), extended
     with a deep link into the game that earns it. Anchor = the widget's
     mounted div id on the page it lives on (homepage '/' or '/arcade' or
     '/create'). */
  var MEDALS = [
    { id: 'vote',    glyph: '\u2605',     name: 'Ballot',             ev: 'pf-vote-cast',           href: '/#pf-vote' },
    { id: 'ballot',  glyph: '\u2622',     name: 'Bracket Ballot',     ev: 'pf-bracket-ballot',      href: '/arcade#pf-bracket' },
    { id: 'bracket', glyph: '\u2620',     name: 'Liquidator',         ev: 'pf-bracket-liquidated',  href: '/arcade#pf-bracket' },
    { id: 'bonds',   glyph: '\u25C6',     name: 'War Bonds',          ev: 'pf-wb-buy',               href: '/#pf-warbonds' },
    { id: 'caption', glyph: '\u270E',     name: 'Word Warrior',       ev: 'pf-caption-submit',      href: '/arcade#pf-caption' },
    { id: 'poster',  glyph: '\u25C8',     name: 'Press Pass',         ev: 'pf-poster-made',         href: '/create#pf-poster' },
    { id: 'quiz',    glyph: '\u25C9',     name: 'Intel Operative',    ev: 'pf-quiz-done',           href: '/arcade#pf-matchquiz' },
    { id: 'billionaire', glyph: '\uFF04', name: 'Billionaire Spotter', ev: 'pf-billionaire-answered', href: '/arcade#pf-billionaire' },
    { id: 'interrogation', glyph: '\u2754', name: 'Interrogator',     ev: 'pf-interrogation-answered', href: '/arcade#pf-interrogation' },
    { id: 'orders',  glyph: '\u25B2',     name: 'Field Duty',         ev: 'pf-order-checkin',       href: '/#pf-orders' },
    { id: 'drop',    glyph: '\u25CF',     name: 'Supply Runner',      ev: 'pf-drop-claimed',        href: '/#pf-brief' },
    { id: 'enlisted',glyph: '\u2694',     name: 'Enlisted',           ev: 'pf-enlisted',            href: '/#pf-ranks' },
    { id: 'guess',   glyph: '\u25CE',     name: 'Profiler',           ev: 'pf-guess-done',          href: '/arcade#pf-guess' },
    { id: 'raid',    glyph: '\u26A1',     name: 'Raider',             ev: 'pf-raid-report',         href: '/arcade#pf-battles' },
    { id: 'infight', glyph: '\uD83E\uDD4A', name: 'Brawler',          ev: 'pf-infight-fire',        href: '/arcade#pf-infight-root' },
    /* REDISTRIBUTION LAYER (2026-10-05): the retired casino hall's
       'High Roller' medal (ev pf-casino-cashed, unearnable since casino.js
       was unmounted) was removed from the march with it. The redistribution
       layer's medal is below. */
    /* Redistribution layer 'Market Maker' — first settled redistribution
       event each week (forecast, gambit, raid, or draw — win or loss).
       REQUIRED for FULL DEPLOYMENT. */
    { id: 'whitemarket', glyph: '\uD83C\uDFB2', name: 'Market Maker', ev: 'pf-wm-settled', href: '/arcade#pf-forecasts' }
  ];

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS) || 'null');
      if (s && s.w) return s;
    } catch (e) {}
    return { w: PF.isoWeekKey(PF.chiNow()), m: {}, fd: false };
  }
  function save(s) {
    try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {}
  }
  /* Same week-rollover as service-medals.js: stale week -> fresh bucket. */
  function state() {
    var s = load(), wk = PF.isoWeekKey(PF.chiNow());
    if (s.w !== wk) { s = { w: wk, m: {}, fd: false }; save(s); }
    return s;
  }

  /* On /arcade the Service Medals listeners (bundle-sec1) are NOT loaded,
     so medals earned here must be recorded by this module — same bucket,
     same key, idempotent merge. */
  MEDALS.forEach(function (md) {
    document.addEventListener(md.ev, function () {
      var s = state();
      if (!s.m[md.id]) { s.m[md.id] = 1; save(s); }
      render();
    });
  });

  /* Hours until the next Monday 00:00 America/Chicago (rack reset). */
  function hoursToReset() {
    try {
      var now = PF.chiNow();
      var d = new Date(now.getTime());
      var add = (8 - d.getDay()) % 7; /* getDay: 0=Sun..6=Sat; Monday -> 7 */
      d.setDate(d.getDate() + add);
      d.setHours(0, 0, 0, 0);
      return Math.max(0, (d.getTime() - now.getTime()) / 36e5);
    } catch (e) { return 72; }
  }

  var CSS = '#pf-deploy{margin:0 auto 22px;max-width:720px;padding:16px 14px 14px;border:2px dashed #c1121f;background:#141414;box-sizing:border-box}' +
    '#pf-deploy .pd-title{font-family:\'Arial Black\',Arial,sans-serif;color:#ff5a00;font-size:15px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;text-align:center}' +
    '#pf-deploy .pd-sub{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#c9bfa8;text-transform:uppercase;text-align:center;margin-bottom:10px}' +
    '#pf-deploy .pd-list{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px}' +
    '#pf-deploy .pd-chip{display:inline-block;background:#0b0b0b;border:1px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 12px;border-radius:3px}' +
    '#pf-deploy .pd-chip:hover{background:#c1121f;color:#fff}' +
    '#pf-deploy .pd-chip .g{color:#ff5a00;margin-right:6px}' +
    '#pf-deploy .pd-chip:hover .g{color:#fff}' +
    '#pf-deploy .pd-chip .arr{color:#ff5a00;margin-left:6px}' +
    '#pf-deploy .pd-note{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;letter-spacing:1px;text-align:center;line-height:1.6}' +
    '#pf-deploy .pd-note b{color:#ff5a00}' +
    '#pf-deploy .pd-urgent{color:#fff;background:#c1121f;display:inline-block;padding:5px 12px;margin-top:8px;font-family:\'Arial Black\',Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase}' +
    '#pf-deploy .pd-earned{font-family:Arial,sans-serif;font-size:11px;color:#8a8272;letter-spacing:1px;text-align:center;margin-top:8px}' +
    '#pf-deploy .pd-earned .g{color:#ff5a00;margin:0 2px}';

  function ensureCss() {
    if (document.getElementById('pf-deploy-css')) return;
    var st = document.createElement('style');
    st.id = 'pf-deploy-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function urgencyHtml(left, hrs) {
    if (left <= 0) {
      return '<div class="pd-note">FULL DEPLOYMENT secured. <b>'+MEDALS.length+'/'+MEDALS.length+'</b> medals this week.' +
        '<br>The rack resets Monday \u2014 fresh march, soldier.</div>';
    }
    var noun = left === 1 ? 'medal' : 'medals';
    var h = '<div class="pd-note"><b>' + left + ' ' + noun + ' left</b> before the rack resets Monday.</div>';
    if (hrs <= 24) {
      var hleft = Math.max(1, Math.floor(hrs));
      h += '<div style="text-align:center"><span class="pd-urgent">\u26A0 Rack resets in ' + hleft +
        'h \u2014 deploy tonight</span></div>';
    } else if (hrs <= 72) {
      h += '<div class="pd-note">The rack resets in <b>' + Math.round(hrs / 24) +
        ' days</b>. No stragglers.</div>';
    }
    return h;
  }

  function render() {
    ensureCss();
    var host = document.getElementById('pf-arcade');
    if (!host) return false;
    var s = state();
    var el = document.getElementById('pf-deploy');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pf-deploy';
      var head = host.querySelector(':scope > .pf-page-head');
      if (head && head.parentNode === host) {
        head.parentNode.insertBefore(el, head.nextSibling);
      } else {
        host.insertBefore(el, host.firstChild);
      }
    }
    var missed = [], got = 0, gotGlyphs = '';
    MEDALS.forEach(function (md) {
      if (s.m[md.id]) { got++; gotGlyphs += '<span class="g">' + md.glyph + '</span>'; }
      else missed.push(md);
    });
    var h = '<div class="pd-title">\u2694 Deployment Tracker</div>' +
      '<div class="pd-sub">\u2014 your medal march, this week \u2014</div>';
    if (missed.length) {
      h += '<div class="pd-list">';
      missed.forEach(function (md) {
        h += '<a class="pd-chip" href="' + md.href + '"><span class="g">' + md.glyph +
          '</span>' + esc(md.name) + '<span class="arr">\u2192</span></a>';
      });
      h += '</div>';
    }
    h += urgencyHtml(missed.length, hoursToReset());
    if (got > 0 && missed.length > 0) {
      h += '<div class="pd-earned">' + got + '/'+MEDALS.length+' earned: ' + gotGlyphs + '</div>';
    }
    el.innerHTML = h;
    return true;
  }

  var tries = 0;
  function mount() {
    if (render()) return;
    if (++tries < 20) setTimeout(mount, 1000);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') mount();
  else document.addEventListener('DOMContentLoaded', mount);

  } catch (err) { PF.error('deploy-tracker', err); }
})();
