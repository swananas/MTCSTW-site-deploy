#!/usr/bin/env node
/* scripts/verify-pacalerts-fe.js — Super PAC Alerts frontend verification.
   Run from the repo root:
     node scripts/verify-pacalerts-fe.js
   1. Rebuild bundles (bundle-pages carries both new files)
   2. node --check on the new module + the edited painter module
   3. Static checks (kill switch, copy/CTA standards, banned terms, no-XP,
      bundle registration) — comment-stripped view only, no string stripping
      (naive quote-stripping is regex-literal-blind)
   4. Mocked-browser runtime tests (vm + canvas-2d stub): the phq-pac painter
      mounts, paints its spec copy, stamps the callsign, degrades with no
      callsign (claim-line funnel) and sparse data, and PFPacAlerts.mount
      renders cards, routes DOWNLOAD/SHARE through the existing PHQShare
      flow, persists the opt-in stub, and shows honest empty states.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var MOD = path.join(V, 'core', 'pac-alerts.js');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function expectedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[MOD, PAINTER_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax', 'node --check failed for ' + m); }
});

var src = read(MOD);
var psrc = read(PAINTER_MOD);
var code = stripComments(src);
var pcode = stripComments(psrc);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]pac-alerts['"]\)/.test(src)) ok('kill switch PF.skip("pac-alerts") wired');
else no('kill switch', 'PF.skip("pac-alerts") missing');
if (/window\.pfPacAlertsDone/.test(src)) ok('double-load guard present');
else no('double-load guard', 'missing');
if (src.indexOf('MONEY BOMB') !== -1) ok('MONEY BOMB kicker copy');
else no('kicker copy', 'missing');
if (src.indexOf('No FEC data yet') !== -1) ok('honest empty state (no FEC key) present');
else no('empty copy', 'missing');
if (psrc.indexOf("'phq-pac': 'MONEY BOMB'") !== -1) ok('phq-pac registered in TITLES as MONEY BOMB');
else no('painter title', 'missing');
if (psrc.indexOf("'phq-pac': paintPac") !== -1 && pcode.indexOf('function paintPac(') !== -1)
  ok('phq-pac painter function + PAINT registration');
else no('painter registration', 'missing');
if (pcode.indexOf("bottomStack(x, 'fight')") !== -1) ok('phq-pac bottom stack uses JOIN THE FIGHT.');
else no('CTA', 'phq-pac does not use the fight CTA stack');
if (pcode.indexOf('csLine(cv, x, y, cs)') !== -1) ok('phq-pac callsign stamp via csLine');
else no('callsign stamp', 'missing');
if (pcode.indexOf('claimLine(x, y)') !== -1) ok('phq-pac no-callsign claim-line funnel');
else no('claim funnel', 'missing');
/* no XP anywhere on this frontend: no xpGrant, no create_share, no ledger writes */
['xpGrant', 'create_share', 'xp_ledger'].forEach(function (w) {
  if (code.toLowerCase().indexOf(w.toLowerCase()) === -1) ok('no XP plumbing: ' + w);
  else no('XP leak', w + ' present in pac-alerts.js');
});
/* opt-in stub documented, not wired to notification_prefs */
if (src.indexOf('pf_pac_alert_optin_') !== -1 && src.indexOf('DOCUMENTED STUB') !== -1)
  ok('opt-in toggle is a documented localStorage stub');
else no('opt-in stub', 'not documented as a stub');
if (code.indexOf('notification_prefs') === -1) ok('opt-in NOT wired to notification_prefs (would silently drop)');
else no('opt-in wiring', 'wired to notification_prefs without backend support');
/* banned terms + real names */
['donate', 'shanetheswan'].forEach(function (w) {
  if (src.toLowerCase().indexOf(w) === -1 && psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(src) && !/\bShane\b/.test(pcode)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/pac-alerts.js'"))
  ok('pac-alerts.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfPacAlertsDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfPacAlertsDone missing from bundle-pages.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), "'phq-pac'"))
  ok('phq-pac painter present in rebuilt bundle');
else no('bundle painter', 'phq-pac missing from bundle-pages.js');

/* ============ 3. mocked-browser runtime ============ */
console.log('== 3. mocked-browser runtime (canvas + DOM stub) ==');
function pxOf(font) { var m = /(\d+(?:\.\d+)?)px/.exec(String(font)); return m ? parseFloat(m[1]) : 10; }
function Ctx2D(rec) {
  this._rec = rec;
  this.font = '400 10px Arial,sans-serif';
  this.fillStyle = '#000000';
  this.textAlign = 'center';
  this.textBaseline = 'alphabetic';
}
Ctx2D.prototype.measureText = function (t) { return { width: String(t).length * pxOf(this.font) * 0.62 }; };
Ctx2D.prototype.fillText = function (t, x, y) {
  this._rec.push({ text: String(t), font: this.font, fillStyle: this.fillStyle, x: x, y: y });
};
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate',
 'beginPath', 'clip', 'rect', 'arc', 'stroke', 'fill'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return {
    width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); }
  };
}
function makeEl(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), children: [], _attrs: {},
    _listeners: {}, style: {}, parentNode: null, className: '',
    _innerHTML: '', textContent: '', id: '', scrollLeft: 0, clientWidth: 320,
    checked: false, type: '', htmlFor: ''
  };
  el.appendChild = function (c) { c.parentNode = el; el.children.push(c); return c; };
  el.removeChild = function (c) {
    var ix = el.children.indexOf(c);
    if (ix !== -1) el.children.splice(ix, 1);
    try { c.parentNode = null; } catch (e) {}
    return c;
  };
  el.setAttribute = function (k, v) { el._attrs[String(k)] = String(v); };
  el.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(el._attrs, k) ? el._attrs[k] : null;
  };
  el.addEventListener = function (t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); };
  el.querySelector = function () { return null; };
  el.scrollTo = function () {};
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  return el;
}
function makeEnv(opts) {
  opts = opts || {};
  var store = { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var captured = { scripts: [], headChildren: [] };
  var registered = {};
  var shareCalls = [], saveCalls = [];
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function () { return 0; }; /* no auto-timeout in tests */
  sb.navigator = {};
  sb.location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  var head = makeEl('head');
  var _headAppend = head.appendChild;
  head.appendChild = function (c) { captured.headChildren.push(c); return _headAppend(c); };
  sb.document = {
    createElement: function (t) {
      t = String(t).toLowerCase();
      if (t === 'canvas') return makeCanvas();
      var el = makeEl(t);
      if (t === 'script') captured.scripts.push(el);
      return el;
    },
    head: head,
    getElementById: function () { return null; },
    addEventListener: function () {}
  };
  sb.PF = {
    skip: function (silo) {
      var disabled = [];
      try {
        var m = String(sb.location.search).match(/[?&]pf_off=([^&]+)/);
        if (m) disabled = disabled.concat(decodeURIComponent(m[1]).split(','));
      } catch (e) {}
      try { disabled = disabled.concat(JSON.parse(sb.localStorage.getItem('pf_disabled_v1') || '[]')); } catch (e2) {}
      return disabled.indexOf(silo) !== -1;
    },
    toast: function () {}
  };
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PF_BACKEND_URL = opts.backend === undefined ? 'https://pf-api.example.com/exec' : opts.backend;
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(PAINTER_MOD), sb, { filename: 'share-image-phq.js' });
  vm.runInContext(read(MOD), sb, { filename: 'pac-alerts.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function opFor(cv, text) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++) if (rs[i].text === text) return rs[i];
  return null;
}
function allHtml(el) {
  var h = (el._innerHTML || '') + '\n' + (el.textContent || '');
  (el.children || []).forEach(function (c) { h += '\n' + allHtml(c); });
  return h;
}

/* Fixtures — committee/candidate names are synthetic paint-test values,
   dollar figures are synthetic; only the shape mirrors the backend contract. */
var NOW = Date.UTC(2026, 9, 5);
var PFIX = {
  state: 'TX', district: '15', cycle: 2026, amount: 120000,
  spender: 'MONEY BOMB PAC', target: 'DOE, JANET', supportOppose: 'OPPOSE',
  spikeMultiple: 4, baseline: 'prior-cycle', sourceDate: 'OCT 4, 2026'
};
var RESP_OK = {
  ok: true, state: 'TX', district: '15', cycle: 2026, fec_live: true,
  retrieved_at: NOW - 86400000,
  method: 'Spike = a committee spending at >3x its prior-cycle daily pace over the last 30 days.',
  source: 'FEC API — independent expenditures (Schedule E)',
  source_url: 'https://api.open.fec.gov/v1/schedules/e/',
  note: null,
  spikes: [
    { committee_id: 'C00000001', committee_name: 'MONEY BOMB PAC', candidate_name: 'DOE, JANET',
      office: 'H', state: 'TX', district: '15', support_oppose: 'OPPOSE',
      recent_30d_total: 120000, prior_cycle_total: 730000, prior_cycle_daily_avg: 1000,
      spike_multiple: 4, spike: true, baseline: 'prior-cycle', cycle: 2026,
      source: 'FEC API — independent expenditures (Schedule E)', retrieved_at: NOW - 86400000 },
    { committee_id: 'C00000003', committee_name: 'NEW MONEY PAC', candidate_name: 'DOE, JANET',
      office: 'H', state: 'TX', district: '15', support_oppose: 'SUPPORT',
      recent_30d_total: 50000, prior_cycle_total: 0, prior_cycle_daily_avg: 0,
      spike_multiple: null, spike: true, baseline: 'none', cycle: 2026,
      source: 'FEC API — independent expenditures (Schedule E)', retrieved_at: NOW - 86400000 }
  ]
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with pac painter registered)');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(
      ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-pac']))
    ok('ids list includes phq-pac (six painters)');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.registered['phq-pac'] === 'function') ok('setPoster registered: phq-pac');
  else no('registration', 'phq-pac not registered with PFShare');

  /* --- painter: full fixture --- */
  var cv = PHQ.paint('phq-pac', PFIX);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('pac mount', 'no 1080x1350 canvas');
  else {
    ok('pac mounts 1080x1350');
    var bop = null, rs0 = cv._recs || [];
    for (var bi = 0; bi < rs0.length; bi++)
      if (rs0[bi].text === 'M' && rs0[bi].y === 280) bop = rs0[bi];
    if (hasFrag(cv, 'MONEYBOMB')) {
      ok('pac MONEY BOMB badge');
      if (bop && bop.fillStyle === '#c1121f') ok('pac badge is red');
      else no('badge color', 'not red: ' + (bop && bop.fillStyle));
    } else no('badge', 'missing');
    if (hasText(cv, 'TX-15')) ok('pac district line');
    else no('district', 'missing: ' + joined(cv).slice(0, 200));
    if (hasText(cv, '$120,000')) {
      ok('pac amount is the thumb-stopper');
      var aop = opFor(cv, '$120,000');
      if (aop && /1\d\dpx/.test(aop.font)) ok('amount is display type');
      else no('amount size', 'not display type: ' + (aop && aop.font));
    } else no('amount', 'missing');
    if (hasText(cv, 'MONEY BOMB PAC')) ok('pac spender name');
    else no('spender', 'missing');
    if (hasFrag(cv, 'OPPOSESDOE,JANET')) ok('pac target + OPPOSES line');
    else no('target', 'missing');
    if (hasFrag(cv, '4.0×THEOLDDAILYPACE')) ok('pac vs-baseline multiple line');
    else no('multiple', 'missing: ' + joined(cv).slice(400, 800));
    if (hasFrag(cv, 'SOURCE:FEC') && hasFrag(cv, 'SCHEDULEE')) ok('pac FEC source line');
    else no('source', 'missing');
    if (hasText(cv, 'RETRIEVED OCT 4, 2026')) ok('pac retrieval date');
    else no('retrieval date', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true)
      ok('pac callsign stamp + _pfStamped');
    else no('stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('pac bottom stack (deep link + CTA + date)');
    else no('bottom', 'stack incomplete');
  }
  /* --- painter: sparse data degrades, never throws --- */
  try {
    cv = PHQ.paint('phq-pac', {});
    if (cv && hasFrag(cv, '\u2014')) ok('pac empty record renders \u2014');
    else no('degrade', 'no em-dash for missing fields');
  } catch (e) { no('degrade', 'threw on empty data: ' + (e && e.message)); }
  /* --- painter: baseline none --- */
  try {
    cv = PHQ.paint('phq-pac', { baseline: 'none', amount: 50000, spender: 'NEW MONEY PAC' });
    if (cv && hasFrag(cv, 'NEWSPENDER')) ok('pac baseline:none renders NEW SPENDER line');
    else no('baseline none', 'missing');
  } catch (e) { no('baseline none', 'threw: ' + (e && e.message)); }
  /* --- painter: no-callsign, no blank stamp --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  cv = env2.sb.PF.PHQShare.paint('phq-pac', PFIX);
  if (!hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true &&
      hasFrag(cv, 'CLAIMYOURCALLSIGNATMTCSTW.COM'))
    ok('pac no-callsign: no blank stamp, claim-line funnel instead');
  else no('no-cs', 'blank stamp painted or funnel missing');
  /* --- painter: layout guard (clean gap above bottom stack) --- */
  (function () {
    var c = PHQ.paint('phq-pac', PFIX);
    var rs = c._recs || [], bad = [], link = null, date = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
      if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
      if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    }
    if (!bad.length) ok('pac: clean gap above bottom stack');
    else no('gap', 'content in stack gap: ' + bad.join(' | '));
    if (link === 1222) ok('pac: deep link at H-128');
    else no('link y', 'deep link y=' + link);
    if (date === 1302) ok('pac: date line at H-48');
    else no('date y', 'date y=' + date);
  })();
}

/* --- PFPacAlerts.mount: happy path --- */
function mountWith(resp, state) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFPacAlerts.mount(state || 'TX', container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp', 'callback param missing from script src: ' + sc.src); return null; }
  if (String(sc.src).indexOf('action=pac_spikes') === -1 ||
      String(sc.src).indexOf('state=TX') === -1)
    no('jsonp', 'action/state missing: ' + sc.src);
  else ok('mount fires JSONP pac_spikes&state=TX');
  e.sb[m[1]](resp); /* backend answers */
  return { env: e, container: container, mountRet: r };
}
function fakeBtn(cardIdx, kind) {
  var article = {
    getAttribute: function (k) { return k === 'data-pa-i' ? String(cardIdx) : null; },
    parentNode: null
  };
  return {
    getAttribute: function (k) { return k === kind ? '1' : null; },
    parentNode: article
  };
}
(function () {
  var t = mountWith(RESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('mount ret', 'expected true');
  else ok('mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-pa') { no('list root', 'missing .pf-pa'); return; }
  ok('spike list root rendered');
  var html = allHtml(root);
  if (html.indexOf('MONEY BOMB PAC') !== -1 && html.indexOf('NEW MONEY PAC') !== -1)
    ok('one card per spike (2 cards)');
  else no('cards', 'spender names missing from cards');
  if (html.indexOf('$120,000') !== -1) ok('card shows recent-30d amount');
  else no('card amount', 'missing');
  if (html.indexOf('OPPOSES DOE, JANET') !== -1) ok('card shows support/oppose + target');
  else no('card target', 'missing');
  if (html.indexOf('4.0× THE OLD DAILY PACE — SPIKE') !== -1) ok('card shows vs-baseline multiple');
  else no('card multiple', 'missing');
  if (html.indexOf('NEW SPENDER — NO PRIOR-CYCLE BASELINE') !== -1) ok('card shows new-spender baseline');
  else no('card baseline', 'missing');
  if (html.indexOf('FEC — INDEPENDENT EXPENDITURES (SCHEDULE E)') !== -1 &&
      html.indexOf('RETRIEVED') !== -1)
    ok('card shows FEC source + retrieval date');
  else no('card source', 'missing');
  var track = null;
  for (var ti = 0; ti < root.children.length; ti++)
    if (root.children[ti].className === 'pf-pa-track') track = root.children[ti];
  if (track && track.children.length === 2)
    ok('track holds 2 card elements');
  else no('track', 'expected 2 cards');
  if (html.indexOf('METHOD: Spike = a committee spending at &gt;3x') !== -1 ||
      html.indexOf('METHOD: Spike = a committee spending at >3x') !== -1)
    ok('method caption under carousel');
  else no('method caption', 'missing');
  /* opt-in toggle: stub persists to localStorage, fires no network */
  var cb = null;
  (function findCb(el) {
    if (el.tagName === 'INPUT' && el.type === 'checkbox') { cb = el; return; }
    (el.children || []).forEach(findCb);
  })(root);
  if (!cb) { no('opt-in toggle', 'checkbox not rendered'); }
  else {
    ok('opt-in toggle rendered');
    if (t.env.store['pf_pac_alert_optin_TX'] === undefined) ok('opt-in defaults off');
    else no('opt-in default', 'unexpected stored value');
    cb.checked = true;
    (cb._listeners.change || []).forEach(function (fn) { fn(); });
    if (t.env.store['pf_pac_alert_optin_TX'] === '1') ok('opt-in persists to localStorage (stub)');
    else no('opt-in persist', 'not stored');
  }
  /* DOWNLOAD -> PF.PHQShare.save('phq-pac', {...}) via existing flow */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('click delegation', 'no click listener on list root'); return; }
  ok('click delegation wired');
  click({ target: fakeBtn(0, 'data-pa-dl') });
  if (t.env.saveCalls.length === 1 && t.env.saveCalls[0].id === 'phq-pac' &&
      t.env.saveCalls[0].fn === 'pfn-phq-pac.png' &&
      t.env.saveCalls[0].cv && (t.env.saveCalls[0].cv._recs || []).length > 10)
    ok('DOWNLOAD routes to PF.PHQShare.save with painted pac canvas');
  else no('download', 'routing failed: ' + JSON.stringify({ n: t.env.saveCalls.length }));
  /* SHARE -> PF.PHQShare.share('phq-pac', {...}) for card 2 */
  click({ target: fakeBtn(1, 'data-pa-sh') });
  if (t.env.shareCalls.length === 1 && t.env.shareCalls[0].id === 'phq-pac')
    ok('SHARE routes to PF.PHQShare.share with painted pac canvas');
  else no('share', 'routing failed');
  var scv = t.env.shareCalls[0] && t.env.shareCalls[0].cv;
  if (scv && hasText(scv, 'NEW MONEY PAC') && hasFrag(scv, 'NEWSPENDER'))
    ok('shared poster carries endpoint data (card 2)');
  else no('poster data', 'poster missing endpoint fields');
})();

/* --- mount: empty + fail-soft paths --- */
(function () {
  var t = mountWith({ ok: false });
  if (t && t.container.style.display === 'none' && t.container.children.length === 0)
    ok('fail-soft: {ok:false} hides the section entirely');
  else no('fail-soft ok:false', 'section not hidden');
})();
(function () {
  var t = mountWith(null);
  if (t && t.container.style.display === 'none')
    ok('fail-soft: endpoint down (null) hides the section entirely');
  else no('fail-soft null', 'section not hidden');
})();
(function () {
  var r2 = JSON.parse(JSON.stringify(RESP_OK));
  r2.fec_live = false; r2.spikes = [];
  var t = mountWith(r2);
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf('No FEC data yet') !== -1)
    ok('empty state: fec_live=false shows the honest no-data message (section stays)');
  else no('empty state no-key', 'missing or section hidden');
})();
(function () {
  var r2 = JSON.parse(JSON.stringify(RESP_OK));
  r2.spikes = []; r2.note = 'No independent expenditures in the last 30 days on file for TX-15 (2026 cycle).';
  var t = mountWith(r2);
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' && html.indexOf('TX-15 (2026 cycle)') !== -1)
    ok('empty state: zero spikes shows the backend geo note (section stays)');
  else no('empty state geo', 'missing or section hidden');
})();

/* --- mount: bad args --- */
(function () {
  var e = makeEnv();
  var W = e.sb.PFPacAlerts;
  if (W.mount('', e.sb.document.createElement('div')) === false &&
      W.mount('TX', null) === false)
    ok('mount fail-soft on missing state/container (returns false)');
  else no('mount args', 'did not fail closed');
})();

/* --- kill switch honored --- */
(function () {
  var e = makeEnv({ search: '?pf_off=pac-alerts' });
  if (typeof e.sb.PFPacAlerts === 'undefined') ok('kill switch: ?pf_off=pac-alerts prevents mount API');
  else no('kill switch', 'PFPacAlerts exposed despite ?pf_off=pac-alerts');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
