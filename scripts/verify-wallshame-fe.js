#!/usr/bin/env node
/* scripts/verify-wallshame-fe.js — Wall of Shame verification.
   Run from the repo root:
     node scripts/verify-wallshame-fe.js
   1. node --check on both new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switch, painter registration (IDS/TITLES/PAINT), esc() on every
      injected name/title field, no photo hotlinking, no auto-mount,
      copy/CTA standards, banned terms, bundle registration
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      the phq-wallshame painter renders its spec copy on fixture data,
      stamps the callsign, degrades with no callsign; PFWallShame.mount()
      renders the carousel on a good endpoint response, wires DOWNLOAD/SHARE
      through the EXISTING PF.PHQShare flow, honors the kill switch, and
      fails soft (hides the section) on bad endpoint responses.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var WS_MOD = path.join(V, 'core', 'wall-of-shame.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}
function expectedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ============ 0. rebuild bundles (bundle-pages carries both modules) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[PAINTER_MOD, WS_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var psrc = read(PAINTER_MOD), wsrc = read(WS_MOD);
var pcode = stripComments(psrc), wcode = stripComments(wsrc);

console.log('== 2. static contract checks ==');
/* painter registration */
if (pcode.indexOf("'phq-wallshame'") !== -1 &&
    /var IDS = \[[^\]]*'phq-wallshame'[^\]]*\]/.test(pcode)) ok('painter id in IDS');
else no('painter IDS', "'phq-wallshame' missing from IDS");
if (/'phq-wallshame':\s*'WALL OF SHAME'/.test(pcode)) ok("TITLES['phq-wallshame'] = 'WALL OF SHAME'");
else no('painter TITLES', 'missing');
if (/'phq-wallshame':\s*paintWallShame/.test(pcode)) ok('painters map registers paintWallShame');
else no('painters map', 'missing paintWallShame');
/* kill switches */
if (/PF\.skip\(['"]wallshame['"]\)/.test(wsrc)) ok('kill switch PF.skip("wallshame") wired');
else no('kill switch', 'PF.skip("wallshame") not found');
if (wsrc.indexOf('?pf_off=wallshame') !== -1) ok('KILL comment documents ?pf_off=wallshame');
else no('kill comment', '?pf_off=wallshame missing from header');
if (/PF\.skip\(['"]phq-share['"]\)/.test(psrc)) ok('painter module kill switch still wired');
else no('painter kill', 'PF.skip("phq-share") missing');
/* esc() on injected fields — checked on the comment-stripped view, no
   string stripping (AGENTS.md lesson). Every field below is interpolated
   into innerHTML in wall-of-shame.js. */
['esc\\(card\\.name\\)', 'esc\\(bill\\.title\\)', 'esc\\(bill\\.bill_id\\)',
 'esc\\(v0\\.position\\)', 'esc\\(v0\\.question\\)', 'esc\\(EMPTY_MSG\\)',
 'esc\\(chamberLabel\\(card\\)\\)'].forEach(function (pat) {
  if (new RegExp(pat).test(wcode)) ok('esc applied: ' + pat.replace(/\\\\/g, ''));
  else no('esc()', pat + ' not found in wall-of-shame.js');
});
/* never auto-mounts: mount is defined and exposed, never invoked here.
   (The integration hook lives in the header comment, which is stripped.) */
if (!/PFWallShame\.mount\(/.test(wcode) && !/\.mount\(billId/.test(wcode))
  ok('module never auto-mounts (Release Eng calls PFWallShame.mount)');
else no('auto-mount', 'mount() appears to be invoked inside the module');
/* existing share flow reused, no rebuilt plumbing, no XP */
if (wcode.indexOf('PF.PHQShare') !== -1 && /PHQ\.save\(/.test(wcode) && /PHQ\.share\(/.test(wcode))
  ok('DOWNLOAD/SHARE route through existing PF.PHQShare.save/.share');
else no('share flow', 'not using PF.PHQShare.save/.share');
if (!/\bxp\b/i.test(wcode.replace(/explain/gi, ''))) ok('no XP code on the frontend');
else no('no-xp', 'found xp reference in wall-of-shame.js');
if (wcode.indexOf("'phq-wallshame'") !== -1) ok('painter id referenced: phq-wallshame');
else no('painter id ref', 'missing');
/* no photo hotlinking in the painter: no drawImage / Image in the wallshame
   segment, monogram comment present */
var seg = pcode.slice(pcode.indexOf('paintWallShame'));
if (seg.indexOf('drawImage') === -1 && seg.indexOf('new Image') === -1) ok('painter: no photo hotlinking (no drawImage/new Image)');
else no('photo', 'drawImage/new Image in paintWallShame');
if (psrc.indexOf('initials') !== -1 && psrc.indexOf('never hotlinked') !== -1) ok('painter: initials monogram documented');
else no('monogram', 'monogram rationale missing');
/* copy/CTA standards */
if (psrc.indexOf('WALL OF SHAME') !== -1) ok('WALL OF SHAME header copy');
else no('header copy', 'missing');
if (wsrc.indexOf('No recorded votes against the progressive position on this bill.') !== -1)
  ok('empty state copy present');
else no('empty copy', 'missing');
if (wsrc.indexOf('Ranked by recorded votes against the progressive position.') !== -1)
  ok('method caption default present');
else no('method', 'missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (wsrc.toLowerCase().indexOf(w) === -1 && psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(wsrc) && !/\bShane\b/.test(pcode)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
function has(p, s) { return read(p).indexOf(s) !== -1; }
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/wall-of-shame.js'"))
  ok('wall-of-shame.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfWallShameDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfWallShameDone missing from bundle-pages.js');

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
function makeEl(tag, captured) {
  var el = {
    tagName: String(tag).toUpperCase(), children: [], _attrs: {},
    _listeners: {}, style: {}, parentNode: null, className: '',
    _innerHTML: '', textContent: '', id: '', scrollLeft: 0, clientWidth: 320
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
  sb.setTimeout = function (fn) { return 0; }; /* no auto-timeout in tests */
  sb.navigator = {};
  sb.location = { search: opts.search || '', href: 'https://mtcstw.com/' };
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  var head = makeEl('head', captured);
  var _headAppend = head.appendChild;
  head.appendChild = function (c) { captured.headChildren.push(c); return _headAppend(c); };
  sb.document = {
    createElement: function (t) {
      t = String(t).toLowerCase();
      if (t === 'canvas') return makeCanvas();
      var el = makeEl(t, captured);
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
  vm.runInContext(read(WS_MOD), sb, { filename: 'wall-of-shame.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }
function badgeOp(cv, firstChar) {
  var rs = cv._recs || [];
  for (var i = 0; i < rs.length; i++)
    if (rs[i].text === firstChar && rs[i].y === 280) return rs[i];
  return null;
}
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

/* Fixtures. Entities (bill, legislators) are real; vote tallies/positions are
   synthetic paint-test values, not asserted facts. */
var PFIX = {
  billId: 'H.R.3633', billTitle: 'THE CLARITY ACT',
  name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
  againstVotes: 1, position: 'Yea', question: 'On Passage',
  voteDates: ['2026-09-15'], sourceUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/3633'
};
var RESP_OK = {
  ok: true,
  bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' },
  progressive_position: 'Nay',
  method: 'Ranked by recorded roll-call votes against the progressive position.',
  total_against: 2,
  cards: [
    { bioguide_id: 'J000288', name: 'MIKE JOHNSON', chamber: 'house', party: 'R', state: 'LA',
      against_votes: 1,
      votes: [{ vote_id: 'rc-101', vote_date: '2026-09-15', question: 'On Passage',
                position: 'Yea', source_url: 'https://www.congress.gov/bill/119th-congress/house-bill/3633' }] },
    { bioguide_id: 'S000148', name: 'CHUCK SCHUMER', chamber: 'senate', party: 'D', state: 'NY',
      against_votes: 2,
      votes: [{ vote_id: 'rc-202', vote_date: '2026-09-16', question: 'On the Motion to Proceed',
                position: 'Yea', source_url: 'https://www.senate.gov/example-roll-call' }] }
  ]
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed (with wallshame painter registered)');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(
      ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-wallshame', 'phq-pac']))
    ok('ids list includes phq-wallshame');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.registered['phq-wallshame'] === 'function') ok('setPoster registered: phq-wallshame');
  else no('registration', 'phq-wallshame not registered with PFShare');

  /* --- painter: full fixture --- */
  var cv = PHQ.paint('phq-wallshame', PFIX);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('wallshame mount', 'no 1080x1350 canvas');
  else {
    ok('wallshame mounts 1080x1350');
    if (hasFrag(cv, 'WALL OF SHAME')) {
      ok('wallshame badge');
      var bop = badgeOp(cv, 'W');
      if (bop && bop.fillStyle === '#c1121f') ok('wallshame badge is red');
      else no('badge color', 'not red: ' + (bop && bop.fillStyle));
    } else no('badge', 'missing');
    if (hasText(cv, 'H.R.3633')) ok('wallshame bill id');
    else no('bill id', 'missing');
    if (hasText(cv, 'THE CLARITY ACT')) ok('wallshame bill title');
    else no('bill title', 'missing');
    if (hasText(cv, 'MJ')) ok('wallshame monogram initials MJ');
    else no('monogram', 'missing: ' + joined(cv).slice(0, 300));
    if (hasText(cv, 'MIKE JOHNSON')) {
      ok('wallshame legislator name');
      var nop = opFor(cv, 'MIKE JOHNSON');
      if (nop && /9\dpx/.test(nop.font)) ok('name is the biggest element');
      else no('name size', 'not display type: ' + (nop && nop.font));
    } else no('name', 'missing');
    if (hasFrag(cv, 'U.S. HOUSE') && hasFrag(cv, 'R') && hasFrag(cv, 'LA'))
      ok('wallshame chamber/party/state line');
    else no('chamber line', 'missing');
    if (hasText(cv, 'VOTED YEA \u2014 AGAINST THE PROGRESSIVE POSITION')) ok('wallshame vote line');
    else no('vote line', 'missing: ' + joined(cv).slice(300, 700));
    var vop = opFor(cv, 'VOTED YEA \u2014 AGAINST THE PROGRESSIVE POSITION');
    if (vop && vop.fillStyle === '#c1121f') ok('vote line is red');
    else no('vote color', 'not red: ' + (vop && vop.fillStyle));
    if (hasText(cv, 'ON: ON PASSAGE')) ok('wallshame question line');
    else no('question', 'missing');
    if (hasText(cv, '1 VOTE AGAINST THE PROGRESSIVE POSITION')) ok('wallshame against-votes count');
    else no('count', 'missing');
    if (hasText(cv, 'VOTED: SEP 15, 2026')) ok('wallshame vote date');
    else no('date', 'missing');
    if (hasFrag(cv, 'SOURCE: CONGRESS.GOV')) ok('wallshame source URL');
    else no('source', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK') && cv._pfStamped === true)
      ok('wallshame callsign stamp + _pfStamped');
    else no('stamp', 'FIGHTING AS WARHAWK missing or _pfStamped unset');
    if (hasText(cv, 'MTCSTW.COM/POLITICAL-HQ') && hasText(cv, 'JOIN THE FIGHT.') && hasText(cv, expectedDate()))
      ok('wallshame bottom stack (deep link + CTA + date)');
    else no('bottom', 'stack incomplete');
  }
  /* --- painter: sparse data degrades to em-dash, never throws --- */
  try {
    cv = PHQ.paint('phq-wallshame', {});
    if (cv && hasFrag(cv, '\u2014')) ok('wallshame empty record renders \u2014');
    else no('degrade', 'no em-dash for missing fields');
  } catch (e) { no('degrade', 'threw on empty data: ' + (e && e.message)); }
  /* --- painter: no-callsign, no blank stamp --- */
  var env2 = makeEnv();
  delete env2.sb.PFCallsign;
  env2.store.pf_identity_v1 = '{}';
  cv = env2.sb.PF.PHQShare.paint('phq-wallshame', PFIX);
  if (!hasFrag(cv, 'FIGHTING AS') && cv._pfStamped !== true) ok('wallshame no-callsign: no blank stamp');
  else no('no-cs', 'blank stamp painted');
  /* --- painter: layout guard (clean gap above bottom stack) --- */
  (function () {
    var c = PHQ.paint('phq-wallshame', PFIX);
    var rs = c._recs || [], bad = [], link = null, date = null;
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i];
      if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
      if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
      if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
    }
    if (!bad.length) ok('wallshame: clean gap above bottom stack');
    else no('gap', 'content in stack gap: ' + bad.join(' | '));
    if (link === 1222) ok('wallshame: deep link at H-128');
    else no('link y', 'deep link y=' + link);
    if (date === 1302) ok('wallshame: date line at H-48');
    else no('date y', 'date y=' + date);
  })();
}

/* --- PFWallShame.mount: happy path --- */
function mountWith(resp) {
  var e = makeEnv();
  var container = e.sb.document.createElement('div');
  var r = e.sb.PFWallShame.mount('H.R.3633', container);
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp', 'callback param missing from script src: ' + sc.src); return null; }
  if (String(sc.src).indexOf('action=wall_of_shame') === -1 ||
      String(sc.src).indexOf('bill_id=H.R.3633') === -1)
    no('jsonp', 'action/bill_id missing: ' + sc.src);
  else ok('mount fires JSONP wall_of_shame&bill_id=H.R.3633');
  e.sb[m[1]](resp); /* backend answers */
  return { env: e, container: container, mountRet: r };
}
(function () {
  var t = mountWith(RESP_OK);
  if (!t) return;
  if (t.mountRet !== true) no('mount ret', 'expected true');
  else ok('mount returns true');
  var root = t.container.children[0];
  if (!root || root.className !== 'pf-ws') { no('carousel root', 'missing .pf-ws'); return; }
  ok('carousel root rendered');
  var html = allHtml(root);
  if (html.indexOf('MIKE JOHNSON') !== -1 && html.indexOf('CHUCK SCHUMER') !== -1)
    ok('one card per legislator (2 cards)');
  else no('cards', 'legislator names missing from cards');
  var track = root.children[1];
  if (track && track.children.length === 2) ok('track holds 2 card elements');
  else no('track', 'expected 2 cards, got ' + (track && track.children.length));
  if (html.indexOf('METHOD: Ranked by recorded roll-call votes') !== -1)
    ok('method caption under carousel');
  else no('method caption', 'missing');
  var nav = root.children[2], dots = nav && nav.children[1];
  if (dots && dots.children.length === 2) ok('dot indicators (2)');
  else no('dots', 'missing');
  /* DOWNLOAD -> PF.PHQShare.save('phq-wallshame', {...}) via existing flow */
  var click = (root._listeners.click || [])[0];
  if (!click) { no('click delegation', 'no click listener on carousel root'); return; }
  ok('click delegation wired');
  click({ target: { getAttribute: function (k) { return k === 'data-ws-dl' ? '0' : null; } } });
  if (t.env.saveCalls.length === 1 && t.env.saveCalls[0].id === 'phq-wallshame' &&
      t.env.saveCalls[0].fn === 'pfn-phq-wallshame.png' &&
      t.env.saveCalls[0].cv && (t.env.saveCalls[0].cv._recs || []).length > 10)
    ok('DOWNLOAD routes to PF.PHQShare.save with painted wallshame canvas');
  else no('download', 'routing failed: ' + JSON.stringify({ n: t.env.saveCalls.length }));
  /* SHARE -> PF.PHQShare.share('phq-wallshame', {...}) */
  click({ target: { getAttribute: function (k) { return k === 'data-ws-sh' ? '1' : null; } } });
  if (t.env.shareCalls.length === 1 && t.env.shareCalls[0].id === 'phq-wallshame')
    ok('SHARE routes to PF.PHQShare.share with painted wallshame canvas');
  else no('share', 'routing failed');
  /* painter data comes from the endpoint card, not invented */
  var scv = t.env.shareCalls[0] && t.env.shareCalls[0].cv;
  if (scv && hasText(scv, 'CHUCK SCHUMER') && hasText(scv, 'VOTED YEA \u2014 AGAINST THE PROGRESSIVE POSITION'))
    ok('shared poster carries endpoint data (card 2)');
  else no('poster data', 'poster missing endpoint fields');
})();

/* --- mount: fail-soft paths --- */
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
  var t = mountWith({ ok: true, bill: { bill_id: 'H.R.3633', title: 'THE CLARITY ACT' }, cards: [] });
  var html = t ? allHtml(t.container) : '';
  if (t && t.container.style.display !== 'none' &&
      html.indexOf('No recorded votes against the progressive position on this bill.') !== -1)
    ok('empty state: zero cards shows the honest empty message (section stays)');
  else no('empty state', 'missing or section hidden');
})();

/* --- mount: bad args --- */
(function () {
  var e = makeEnv();
  var W = e.sb.PFWallShame;
  if (W.mount('', e.sb.document.createElement('div')) === false &&
      W.mount('H.R.3633', null) === false)
    ok('mount fail-soft on missing billId/container (returns false)');
  else no('mount args', 'did not fail closed');
})();

/* --- kill switch honored --- */
(function () {
  var e = makeEnv({ search: '?pf_off=wallshame' });
  if (typeof e.sb.PFWallShame === 'undefined') ok('kill switch: ?pf_off=wallshame prevents mount API');
  else no('kill switch', 'PFWallShame exposed despite ?pf_off=wallshame');
})();

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
