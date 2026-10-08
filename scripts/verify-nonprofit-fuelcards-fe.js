#!/usr/bin/env node
/* scripts/verify-nonprofit-fuelcards-fe.js — "FUEL THEIR FIGHT" cards.
   Weave #9 (fe/nonprofits-fuel-cards). Run from the repo root:
     node scripts/verify-nonprofit-fuelcards-fe.js
   1. Rebuild bundles (bundle.js + bundle-core.js)
   2. node --check on the module + the painter file
   3. Static contract checks (kill switches, painter registration, CTA/copy
      standards, banned terms, bundle markers)
   4. Painter runtime tests (vm + canvas-2d stub):
      - full org renders name/issue/mission/sanitized URL
      - disclosure marker present ONLY on flagged orgs
      - URL sanitize cases (https passthrough, scheme added, javascript:/garbage dropped)
      - missing fields degrade to em-dash, never throw
      - callsign stamp vs no-callsign funnel
      - ?pf_off=card-nonprofit kills phq-nonprofit only (other 4 painters intact)
      - layout collision guard (all text inside 1080x1350, content above deep link)
   5. Module fail-soft tests (fake DOM + JSONP stub):
      - backend down -> "Ally directory unavailable." + RETRY, no fuel buttons, no throw
      - empty directory -> same treatment
      - card engine missing -> no fuel buttons, generator degrades
      - kill switch -> module bails entirely
      - happy path -> FUEL CARD buttons injected per org, modal previews,
        DOWNLOAD/SHARE route through PF.PHQShare.save/share as phq-nonprofit
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER = path.join(V, 'core', 'share-image-phq.js');
var MOD = path.join(V, 'games', 'nonprofit-fuel-cards.js');
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
try { cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' }); ok('build/bundle.js ran clean'); }
catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
try { cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' }); ok('build/bundle-core.js ran clean'); }
catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[PAINTER, MOD].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p) + ' syntax'); }
  catch (e) { no('syntax', path.basename(p) + ' failed node --check'); }
});

var psrc = read(PAINTER), pcode = stripComments(psrc);
var msrc = read(MOD), mcode = stripComments(msrc);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
if (/PF\.skip\(['"]card-nonprofit['"]\)/.test(psrc)) ok('painter: surgical kill PF.skip("card-nonprofit") wired');
else no('painter kill', 'PF.skip("card-nonprofit") not found in share-image-phq.js');
if (/PF\.skip\(['"]card-nonprofit['"]\)/.test(msrc)) ok('module: kill PF.skip("card-nonprofit") wired');
else no('module kill', 'PF.skip("card-nonprofit") not found in nonprofit-fuel-cards.js');
if (psrc.indexOf('?pf_off=card-nonprofit') !== -1) ok('KILL comment documents ?pf_off=card-nonprofit');
else no('kill comment', '?pf_off=card-nonprofit missing from painter header');
if (psrc.indexOf("'phq-nonprofit': paintNonprofit") !== -1) ok('painter registered in PAINT table');
else no('PAINT table', "'phq-nonprofit' missing from PAINT");
if (psrc.indexOf("'phq-nonprofit': 'FUEL CARD'") !== -1) ok('TITLES carries FUEL CARD');
else no('TITLES', 'phq-nonprofit title missing');
if (psrc.indexOf('FUEL THEIR FIGHT') !== -1) ok('copy: FUEL THEIR FIGHT headline');
else no('copy', 'FUEL THEIR FIGHT missing from painter');
if (psrc.indexOf('JOIN THE FIGHT.') !== -1) ok('CTA standard: JOIN THE FIGHT.');
else no('CTA', 'JOIN THE FIGHT. missing');
if (msrc.indexOf('FUEL CARD') !== -1) ok('module: FUEL CARD surface copy');
else no('module copy', 'FUEL CARD missing from module');
if (msrc.indexOf('Ally directory unavailable.') !== -1) ok('module: fail-soft "Ally directory unavailable." copy');
else no('fail-soft copy', '"Ally directory unavailable." missing');
if (msrc.indexOf('OCTOBER 5, 2026') !== -1) ok('module: directory compiled date traceable');
else no('compiled date', 'OCTOBER 5, 2026 missing');
/* banned terms — whole files (comments included for the painter; the module
   keeps its ban notice but the stripped CODE must be clean). */
['donate', 'shanetheswan'].forEach(function (w) {
  if (psrc.toLowerCase().indexOf(w) === -1) ok('painter: banned term absent: ' + w);
  else no('painter banned term', w + ' present in share-image-phq.js');
  if (mcode.toLowerCase().indexOf(w) === -1) ok('module code: banned term absent: ' + w);
  else no('module banned term', w + ' present in stripped nonprofit-fuel-cards.js');
});
if (!/\bShane\b/.test(psrc) && !/\bShane\b/.test(msrc)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* bundle registration */
if (has(path.join(ROOT, 'build', 'bundle.js'), "'nonprofit-fuel-cards.js'"))
  ok('nonprofit-fuel-cards.js registered in build/bundle.js (bundle-hq)');
else no('bundle registration', 'not found in build/bundle.js');
if (has(path.join(V, 'games', 'bundle-hq.js'), 'pfFuelCardsDone'))
  ok('module marker present in rebuilt games/bundle-hq.js');
else no('bundle marker', 'pfFuelCardsDone missing from bundle-hq.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'phq-nonprofit'))
  ok('phq-nonprofit painter present in rebuilt pages/bundle-pages.js');
else no('painter marker', 'phq-nonprofit missing from bundle-pages.js');
/* no new XP mechanics: the module must not call xpGrant, must not mint XP,
   and must only reference the existing poster_share proof flow. */
if (mcode.indexOf('xpGrant') === -1) ok('module: no xpGrant call (no new grants)');
else no('xp wiring', 'module calls xpGrant');
if (!/\+[0-9]+\s*XP/.test(mcode.replace(/\+5 XP per verified share/g, '')))
  ok('module: no invented XP amounts');
else no('xp amounts', 'module mints XP copy beyond the documented share leg');
if (msrc.indexOf('poster_share') !== -1 || msrc.indexOf('POSTER SHARE') !== -1)
  ok('module: share XP routes through the existing POSTER SHARE proof flow');
else no('share wiring', 'no reference to the existing poster_share proof flow');

/* ============ 3. painter runtime (canvas stub) ============ */
console.log('== 3. painter runtime (canvas stub) ==');
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
['fillRect', 'strokeRect', 'save', 'restore', 'translate', 'rotate', 'beginPath', 'clip', 'rect'].forEach(function (k) {
  Ctx2D.prototype[k] = function () {};
});
function makeCanvas() {
  return {
    width: 0, height: 0, _pfStamped: false, _recs: [],
    getContext: function () { return new Ctx2D(this._recs); },
    toDataURL: function () { return 'data:image/png;base64,STUB'; }
  };
}
function makeEnv(opts) {
  opts = opts || {};
  var killed = !!opts.kill;
  var store = opts.noCallsign ? {} : { pf_identity_v1: JSON.stringify({ callsign: 'WARHAWK' }) };
  var registered = {};
  var shareCalls = [], saveCalls = [];
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.navigator = {};
  sb.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  sb.document = {
    createElement: function (t) { if (String(t).toLowerCase() === 'canvas') return makeCanvas(); return {}; },
    addEventListener: function () {}
  };
  sb.PF = {
    skip: function (s) { return killed && s === 'card-nonprofit'; },
    toast: function () {}
  };
  sb.PFCallsign = function () { return opts.noCallsign ? '' : 'WARHAWK'; };
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(PAINTER), sb, { filename: 'share-image-phq.js' });
  return { sb: sb, registered: registered, shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }

var ORG_FULL = {
  name: 'Brennan Center for Justice', issue: 'Voting Rights & Democracy Reform',
  mission: 'Nonpartisan law and policy institute that works to reform, revitalize, and defend democracy.',
  website: 'https://www.brennancenter.org',
  disclosure: '501(c)(3); affiliated c4 does lobbying',
  compiled: 'OCTOBER 5, 2026'
};
var ORG_CLEAN = {
  name: 'Demos', issue: 'Voting Rights & Democracy Reform',
  mission: 'Think-and-action tank championing equity.',
  website: 'https://www.demos.org', disclosure: '', compiled: 'OCTOBER 5, 2026'
};

var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed');
  if (JSON.stringify(PHQ.ids) === JSON.stringify(['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-nonprofit']))
    ok('ids list carries phq-nonprofit (surgical kill off)');
  else no('ids', 'unexpected ids: ' + JSON.stringify(PHQ.ids));
  if (typeof env.registered['phq-nonprofit'] === 'function') ok('setPoster registered: phq-nonprofit');
  else no('registration', 'phq-nonprofit not registered with PFShare');

  var cv = PHQ.paint('phq-nonprofit', ORG_FULL);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) no('nonprofit mount', 'no 1080x1350 canvas');
  else {
    ok('nonprofit mounts 1080x1350');
    if (hasText(cv, 'FUEL THEIR FIGHT')) ok('headline FUEL THEIR FIGHT');
    else no('headline', 'missing');
    if (hasFrag(cv, 'BRENNAN CENTER FOR JUSTICE')) ok('org name printed');
    else no('org name', 'missing');
    if (hasFrag(cv, 'VOTING RIGHTS & DEMOCRACY REFORM')) ok('issue area printed');
    else no('issue', 'missing');
    if (hasFrag(cv, 'reform, revitalize, and defend democracy')) ok('mission printed');
    else no('mission', 'missing');
    if (hasText(cv, 'https://www.brennancenter.org')) ok('sanitized URL printed verbatim');
    else no('URL', 'sanitized URL missing');
    if (hasFrag(cv, '501(c)(3); affiliated c4 does lobbying')) ok('disclosure marker on flagged org');
    else no('disclosure', 'marker missing on flagged org');
    if (hasFrag(cv, 'THE PROPAGANDA FACTORY ALLY DIRECTORY')) ok('source line printed');
    else no('source', 'missing');
    if (hasFrag(cv, 'COMPILED OCTOBER 5, 2026')) ok('compiled date printed');
    else no('date', 'missing');
    if (hasText(cv, 'JOIN THE FIGHT.')) ok('CTA JOIN THE FIGHT.');
    else no('CTA paint', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK')) ok('callsign stamped FIGHTING AS WARHAWK');
    else no('stamp', 'callsign stamp missing');
    if (cv._pfStamped === true) ok('_pfStamped set (idempotent safety net)');
    else no('_pfStamped', 'not set');
    if (hasText(cv, '\u2605 THE PROPAGANDA FACTORY \u2605')) ok('kicker');
    else no('kicker', 'missing');
    if (hasText(cv, expectedDate())) ok('paint date = today');
    else no('paint date', 'missing or wrong');
    /* layout collision guard */
    var recs = cv._recs || [], bad = [];
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].y < 0 || recs[i].y > 1334) bad.push(recs[i].text.slice(0, 24) + '@' + Math.round(recs[i].y));
    }
    if (!bad.length) ok('layout: all text inside 1080x1350');
    else no('layout', 'text outside canvas: ' + bad.join(', '));
    var contentMax = 0;
    recs.forEach(function (r) { if (r.y < 1222 && r.y > contentMax) contentMax = r.y; });
    if (contentMax > 0 && contentMax < 1222) ok('layout: card content sits above the deep-link stack (max y ' + Math.round(contentMax) + ')');
    else no('layout stack', 'content collides with deep link (max y ' + Math.round(contentMax) + ')');
  }

  /* --- unflagged org: no disclosure marker --- */
  var cv2 = PHQ.paint('phq-nonprofit', ORG_CLEAN);
  if (cv2 && !hasFrag(cv2, '\u26a0')) ok('unflagged org: no disclosure marker');
  else no('disclosure absence', 'marker rendered on clean org');

  /* --- URL sanitize cases --- */
  var cases = [
    ['https passthrough', 'https://www.demos.org', 'https://www.demos.org', true],
    ['scheme added', 'www.demos.org', 'https://www.demos.org', true],
    ['javascript: dropped', 'javascript:alert(1)', 'javascript', false],
    ['data: dropped', 'data:text/html,<h1>x</h1>', 'data:text', false],
    ['garbage dropped', 'not a url at all !!!', 'not a url', false],
    ['empty dropped', '', 'demos', false]
  ];
  cases.forEach(function (c) {
    var d = { name: 'Demos', issue: 'X', mission: 'Y', website: c[1], disclosure: '' };
    var t = PHQ.paint('phq-nonprofit', d);
    var j = t ? joined(t) : '';
    var hit = c[3] ? j.indexOf(c[2]) !== -1 : j.indexOf(c[2]) === -1;
    /* for dropped cases also assert no URL-looking text printed */
    if (hit) ok('sanitize: ' + c[0]);
    else no('sanitize', c[0] + ' (website=' + JSON.stringify(c[1]) + ')');
  });

  /* --- missing fields degrade, never throw --- */
  var threw = false, cv3 = null;
  try { cv3 = PHQ.paint('phq-nonprofit', {}); } catch (e) { threw = true; }
  if (!threw && cv3 && hasText(cv3, '\u2014')) ok('missing fields: em-dash, no throw');
  else no('missing fields', threw ? 'threw' : 'no em-dash fallback');

  /* --- worst-case long row: content must still clear the bottom stack --- */
  var worst = {
    name: 'Reproductive Freedom for All (formerly NARAL Pro-Choice America)',
    issue: 'Criminal Justice Reform & Police Accountability',
    mission: 'Mobilizes 4M members to fight for abortion access, birth control, paid parental leave, and pregnancy protections across all fifty states every single day.',
    website: 'https://www.reproductivefreedomforall.org',
    disclosure: 'Primarily 501(c)(4) lobbying and organizing shop with an affiliated federal PAC',
    compiled: 'OCTOBER 5, 2026'
  };
  var cvw = PHQ.paint('phq-nonprofit', worst);
  if (cvw) {
    var wmax = 0;
    (cvw._recs || []).forEach(function (r) { if (r.y < 1222 && r.y > wmax) wmax = r.y; });
    /* Geometry: the CTA button rect tops at H-84-46 = 1220. Content must stay
       clear of it (1205 keeps a descent margin). */
    if (wmax > 0 && wmax < 1205) ok('worst-case row: content clears the bottom stack (max y ' + Math.round(wmax) + ')');
    else no('worst-case layout', 'content max y ' + Math.round(wmax) + ' — collision risk');
    if (hasFrag(cvw, '\u2026')) ok('worst-case row: trims marked with ellipsis');
    else no('worst-case ellipsis', 'trimmed text not marked');
  } else no('worst-case row', 'paint returned null');
  /* worst case, no callsign — the funnel line must clear too */
  var envW = makeEnv({ noCallsign: true });
  var PHQW = envW.sb.PF && envW.sb.PF.PHQShare;
  var cvw2 = PHQW ? PHQW.paint('phq-nonprofit', worst) : null;
  if (cvw2) {
    var wmax2 = 0;
    (cvw2._recs || []).forEach(function (r) { if (r.y < 1222 && r.y > wmax2) wmax2 = r.y; });
    if (wmax2 > 0 && wmax2 < 1205 && hasText(cvw2, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM'))
      ok('worst-case no-callsign: funnel clears the stack (max y ' + Math.round(wmax2) + ')');
    else no('worst-case no-callsign', 'max y ' + Math.round(wmax2));
  } else no('worst-case no-callsign', 'paint returned null');

  /* --- no-callsign funnel --- */
  var env2 = makeEnv({ noCallsign: true });
  var PHQ2 = env2.sb.PF && env2.sb.PF.PHQShare;
  var cv4 = PHQ2 ? PHQ2.paint('phq-nonprofit', ORG_CLEAN) : null;
  if (cv4 && hasText(cv4, 'CLAIM YOUR CALLSIGN AT MTCSTW.COM') && !hasFrag(cv4, 'FIGHTING AS'))
    ok('no-callsign: funnel line, no blank stamp');
  else no('no-callsign funnel', 'wrong fallback');

  /* --- surgical kill: phq-nonprofit gone, other four intact --- */
  var envK = makeEnv({ kill: true });
  var PHQK = envK.sb.PF && envK.sb.PF.PHQShare;
  if (PHQK && PHQK.ids.indexOf('phq-nonprofit') === -1 && PHQK.ids.length === 4)
    ok('kill: ?pf_off=card-nonprofit drops phq-nonprofit from ids');
  else no('kill ids', 'phq-nonprofit still listed: ' + JSON.stringify(PHQK && PHQK.ids));
  if (PHQK && PHQK.paint('phq-nonprofit', ORG_CLEAN) === null) ok('kill: paint returns null');
  else no('kill paint', 'paint did not fail closed');
  var alive = PHQK && ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin']
    .every(function (id) { return typeof envK.registered[id] === 'function'; });
  if (alive) ok('kill: other four painters keep painting');
  else no('kill scope', 'sibling painters affected');

  /* --- share/save route through PFShare with the nonprofit id --- */
  var before = env.shareCalls.length;
  var okShare = PHQ.share('phq-nonprofit', ORG_CLEAN);
  if (okShare && env.shareCalls.length === before + 1 && env.shareCalls[before].id === 'phq-nonprofit')
    ok('share routes through PFShare.shareImage (phq-nonprofit)');
  else no('share route', 'did not route');
  var beforeS = env.saveCalls.length;
  var okSave = PHQ.save('phq-nonprofit', ORG_CLEAN);
  if (okSave && env.saveCalls.length === beforeS + 1 && env.saveCalls[beforeS].id === 'phq-nonprofit')
    ok('save routes through PFShare.saveImage (phq-nonprofit)');
  else no('save route', 'did not route');
}

/* ============ 4. module fail-soft (fake DOM + JSONP stub) ============ */
console.log('== 4. module fail-soft (fake DOM + JSONP stub) ==');
function FakeEl(tag) {
  this.tagName = String(tag).toUpperCase();
  this.children = [];
  this.attributes = {};
  this._handlers = {};
  this._html = '';
  this._text = '';
  this.style = {};
  this.parentNode = null;
  this.disabled = false;
}
FakeEl.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); };
FakeEl.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
};
FakeEl.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
FakeEl.prototype.insertBefore = function (n, ref) {
  n.parentNode = this;
  var i = this.children.indexOf(ref);
  if (i < 0) this.children.push(n); else this.children.splice(i, 0, n);
  return n;
};
FakeEl.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) this.children.splice(i, 1);
  c.parentNode = null; return c;
};
FakeEl.prototype.replaceChild = function (n, old) {
  var i = this.children.indexOf(old);
  n.parentNode = this;
  if (i >= 0) { this.children[i] = n; old.parentNode = null; }
  else this.children.push(n);
  return old;
};
Object.defineProperty(FakeEl.prototype, 'nextSibling', {
  get: function () {
    if (!this.parentNode) return null;
    var sibs = this.parentNode.children, i = sibs.indexOf(this);
    return (i >= 0 && i + 1 < sibs.length) ? sibs[i + 1] : null;
  }
});
FakeEl.prototype.addEventListener = function (ev, fn) {
  (this._handlers[ev] = this._handlers[ev] || []).push(fn);
};
FakeEl.prototype.fire = function (ev) {
  (this._handlers[ev] || []).forEach(function (fn) { try { fn(); } catch (e) {} });
};
FakeEl.prototype.querySelector = function (sel) {
  var r = this.querySelectorAll(sel); return r.length ? r[0] : null;
};
FakeEl.prototype.querySelectorAll = function (sel) {
  var out = [];
  (function walk(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (matchesSel(c, sel)) out.push(c);
      walk(c);
    }
  })(this);
  return out;
};
function decEnt(s) {
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (h) {
    /* stack-based nesting parser — enough for the module's templates.
       Captures text nodes (whitespace-squished) and decodes entities so
       textContent/getAttribute read back like a real DOM. */
    this._html = String(h); this.children = [];
    this._text = '';
    var stack = [this];
    var re = /<(\/?)(div|button|img|h3|span|a|select|input|p|label|textarea)\b([^>]*)>|([^<]+)/gi, m;
    while ((m = re.exec(this._html))) {
      if (m[4] !== undefined) {
        var t = m[4].replace(/\s+/g, ' ').trim();
        if (t) {
          var top = stack[stack.length - 1];
          top._text = top._text ? top._text + ' ' + decEnt(t) : decEnt(t);
        }
        continue;
      }
      if (m[1] === '/') { if (stack.length > 1) stack.pop(); continue; }
      var e = new FakeEl(m[2]);
      var are = /(id|class|data-[a-z0-9-]+|aria-[a-z-]+|role|alt|src|type|href|target|rel)="([^"]*)"/g, am;
      while ((am = are.exec(m[3]))) e.setAttribute(am[1], decEnt(am[2]));
      stack[stack.length - 1].appendChild(e);
      var selfClose = /\/\s*$/.test(m[3]) || m[2].toLowerCase() === 'img' || m[2].toLowerCase() === 'input';
      if (!selfClose) stack.push(e);
    }
  }
});
Object.defineProperty(FakeEl.prototype, 'textContent', {
  get: function () { return this._text; },
  set: function (t) { this._text = String(t); }
});
Object.defineProperty(FakeEl.prototype, 'firstChild', {
  get: function () { return this.children.length ? this.children[0] : null; }
});
function matchesSel(el, sel) {
  sel = String(sel).trim();
  if (sel.charAt(0) === '#') return el.getAttribute('id') === sel.slice(1);
  if (sel.charAt(0) === '.') {
    var cls = (el.getAttribute('class') || '').split(/\s+/);
    return cls.indexOf(sel.slice(1)) >= 0;
  }
  var m = /^\[data-([a-z0-9-]+)\]$/.exec(sel);
  if (m) return el.getAttribute('data-' + m[1]) !== null;
  return el.tagName === sel.toUpperCase();
}
var FIXTURE_ORGS = [
  { id: 2, name: 'Brennan Center for Justice', website: 'https://www.brennancenter.org',
    mission: 'Nonpartisan law and policy institute.', issue_areas: 'Voting Rights & Democracy Reform',
    scope: 'national', state: null, tax_status: '501(c)(3)',
    disclosure: '501(c)(3); affiliated c4 does lobbying', notes: null },
  { id: 6, name: 'Demos', website: 'https://www.demos.org',
    mission: 'Think-and-action tank championing equity.', issue_areas: 'Voting Rights & Democracy Reform',
    scope: 'national', state: null, tax_status: '501(c)(3)', disclosure: null, notes: null }
];
function makeModuleEnv(opts) {
  /* opts: {kill, backend: 'ok'|'fail'|'empty', noEngine} */
  opts = opts || {};
  var registry = {};            /* id -> element */
  var pane = new FakeEl('div'); pane.setAttribute('id', 'pf-nonprofits');
  var tag = new FakeEl('div'); tag.setAttribute('class', 'c-tag'); pane.appendChild(tag);
  var list = new FakeEl('div'); list.setAttribute('id', 'xNonprofits'); pane.appendChild(list);
  FIXTURE_ORGS.forEach(function (r) {
    var card = new FakeEl('div'); card.setAttribute('class', 'np-card');
    var nm = new FakeEl('div'); nm.setAttribute('class', 'np-name'); nm.textContent = r.name;
    var visit = new FakeEl('div'); visit.setAttribute('class', 'np-visit');
    card.appendChild(nm); card.appendChild(visit);
    list.appendChild(card);
  });
  var head = new FakeEl('head'), body = new FakeEl('body');
  registry['pf-nonprofits'] = pane; registry['xNonprofits'] = list;
  var sb = {};
  sb.window = sb;
  sb.setTimeout = function (fn) { try { fn(); } catch (e) {} return 0; };
  sb.navigator = {};
  sb.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  sb.MutationObserver = function () { this.observe = function () {}; };
  function scriptEl() {
    var el = new FakeEl('script');
    var src = '';
    Object.defineProperty(el, 'src', {
      get: function () { return src; },
      set: function (v) {
        src = String(v);
        var m = /callback=([^&]+)/.exec(src), fn = m && m[1];
        sb.setTimeout(function () {
          if (opts.backend === 'ok' && sb.window[fn])
            sb.window[fn]({ ok: true, nonprofits: FIXTURE_ORGS, count: 2, total: 72 });
          else if (opts.backend === 'empty' && sb.window[fn])
            sb.window[fn]({ ok: true, nonprofits: [], count: 0, total: 0 });
          else if (el.onerror) el.onerror();
        });
      }
    });
    return el;
  }
  sb.document = {
    createElement: function (t) {
      if (String(t).toLowerCase() === 'script') return scriptEl();
      return new FakeEl(t);
    },
    getElementById: function (id) { return registry[id] || null; },
    head: head, body: body,
    addEventListener: function () {}
  };
  var shareCalls = [], saveCalls = [], paints = [];
  var PHQShare = null;
  if (!opts.noEngine) {
    PHQShare = {
      paint: function (id, data) {
        paints.push({ id: id, data: data });
        if (id !== 'phq-nonprofit') return null;
        return makeCanvas();
      },
      share: function (id, data) { shareCalls.push({ id: id, data: data }); return true; },
      save: function (id, data) { saveCalls.push({ id: id, data: data }); return true; }
    };
  }
  sb.PF = {
    skip: function (s) { return !!opts.kill && s === 'card-nonprofit'; },
    toast: function () {},
    holder: function () { return body; },
    PHQShare: PHQShare
  };
  sb.PF_BACKEND_URL = 'https://example.invalid/worker';
  vm.createContext(sb);
  vm.runInContext(read(MOD), sb, { filename: 'nonprofit-fuel-cards.js' });
  return { sb: sb, pane: pane, list: list, head: head, body: body, registry: registry,
           shareCalls: shareCalls, saveCalls: saveCalls, paints: paints, tag: tag };
}
function fuelButtons(env) {
  return env.pane.querySelectorAll('.np-fuel-btn');
}
function genEl(env) {
  return env.pane.querySelector('#pf-fc-gen') || env.body.querySelector('#pf-fc-gen');
}
/* subtree text (the fake DOM has no Text nodes — text lives on _text) */
function textTree(el) {
  if (!el) return '';
  var out = [el._text || ''];
  (function walk(e) {
    for (var i = 0; i < e.children.length; i++) {
      if (e.children[i]._text) out.push(e.children[i]._text);
      walk(e.children[i]);
    }
  })(el);
  return out.join(' ');
}

/* --- backend down: fail-soft --- */
var me1 = makeModuleEnv({ backend: 'fail' });
(function () {
  var g = genEl(me1), t = textTree(g);
  if (t.indexOf('Ally directory unavailable.') !== -1) ok('fail-soft: backend down -> "Ally directory unavailable."');
  else no('fail-soft down', 'missing unavailable copy');
  if (g && g.querySelector('.pf-fc-retry')) ok('fail-soft: RETRY button offered');
  else no('fail-soft retry', 'no RETRY button');
  if (fuelButtons(me1).length === 0) ok('fail-soft: no FUEL CARD buttons injected when directory down');
  else no('fail-soft buttons', fuelButtons(me1).length + ' buttons injected without data');
  ok('fail-soft: module survived (no throw)');
})();

/* --- empty directory (v82 not merged): same treatment --- */
var me2 = makeModuleEnv({ backend: 'empty' });
(function () {
  var g = genEl(me2), t = textTree(g);
  if (t.indexOf('Ally directory unavailable.') !== -1) ok('fail-soft: empty directory -> "Ally directory unavailable."');
  else no('fail-soft empty', 'missing unavailable copy');
  if (fuelButtons(me2).length === 0) ok('fail-soft: no fuel buttons on empty directory');
  else no('fail-soft empty buttons', 'buttons injected on empty data');
})();

/* --- card engine missing: no buttons, no crash --- */
var me3 = makeModuleEnv({ backend: 'ok', noEngine: true });
(function () {
  if (fuelButtons(me3).length === 0) ok('engine missing: no FUEL CARD buttons');
  else no('engine missing buttons', 'buttons injected without engine');
  /* generator still mounts (chips) — degradation is visible, not silent */
  var t3 = textTree(genEl(me3));
  if (t3.indexOf('FUEL CARD GENERATOR') !== -1) ok('engine missing: generator shell visible');
  else no('engine missing shell', 'generator shell absent');
})();

/* --- kill switch: module bails --- */
var me4 = makeModuleEnv({ backend: 'ok', kill: true });
(function () {
  if (me4.sb.window.pfFuelCardsDone === undefined) ok('kill: module bails on ?pf_off=card-nonprofit');
  else no('kill module', 'module ran despite kill');
})();

/* --- happy path --- */
var me5 = makeModuleEnv({ backend: 'ok' });
(function () {
  var btns = fuelButtons(me5);
  if (btns.length === 2) ok('happy: one FUEL CARD button per org card (2)');
  else no('happy buttons', 'expected 2, got ' + btns.length);
  var t5 = textTree(genEl(me5));
  if (t5.indexOf('FUEL CARD GENERATOR') !== -1 && me5.pane.querySelectorAll('[data-fc-issue]').length === 12)
    ok('happy: generator with 12 issue chips');
  else no('happy generator', 'generator shell wrong');
  var chips = me5.pane.querySelectorAll('[data-fc-issue]');
  if (chips.length !== 12) { no('happy chips', 'expected 12 issue chips, got ' + chips.length); return; }
  ok('happy: 12 issue-area chips');
  /* pick the Voting Rights chip -> org grid -> open the Brennan modal */
  var vr = null;
  for (var i = 0; i < chips.length; i++)
    if (chips[i].getAttribute('data-fc-issue') === 'Voting Rights & Democracy Reform') vr = chips[i];
  if (!vr) { no('happy chip', 'Voting Rights chip not found'); return; }
  vr.fire('click');
  var picks = me5.pane.querySelectorAll('.pf-fc-pick');
  if (picks.length === 2) ok('happy: issue filter lists 2 orgs');
  else no('happy picks', 'expected 2 picks, got ' + picks.length);
  picks[0].fire('click');
  var sheets = me5.body.querySelectorAll('.pf-fc-sheet');
  if (sheets.length === 1) ok('happy: modal opens with preview');
  else no('happy modal', 'modal did not open');
  if (me5.paints.length >= 1 && me5.paints[me5.paints.length - 1].id === 'phq-nonprofit')
    ok('happy: preview painted via phq-nonprofit');
  else no('happy paint', 'preview did not use phq-nonprofit');
  var pd = me5.paints[me5.paints.length - 1].data;
  if (pd && pd.name === 'Brennan Center for Justice' && pd.website === 'https://www.brennancenter.org' &&
      pd.disclosure === '501(c)(3); affiliated c4 does lobbying' &&
      pd.issue === 'Voting Rights & Democracy Reform' &&
      pd.compiled === 'OCTOBER 5, 2026')
    ok('happy: card data traces to the directory row (no invented facts)');
  else no('happy data', 'card data wrong: ' + JSON.stringify(pd));
  var dl = me5.body.querySelectorAll('.pf-fc-dl')[0];
  var sh = me5.body.querySelectorAll('.pf-fc-sh')[0];
  if (dl) dl.fire('click');
  if (sh) sh.fire('click');
  if (me5.saveCalls.length === 1 && me5.saveCalls[0].id === 'phq-nonprofit')
    ok('happy: DOWNLOAD routes to PF.PHQShare.save (phq-nonprofit)');
  else no('happy download', 'did not route');
  if (me5.shareCalls.length === 1 && me5.shareCalls[0].id === 'phq-nonprofit')
    ok('happy: SHARE routes to PF.PHQShare.share (phq-nonprofit)');
  else no('happy share', 'did not route');
  /* per-card button also opens the modal */
  var b0 = fuelButtons(me5)[0];
  var beforePaints = me5.paints.length;
  if (b0) b0.fire('click');
  if (me5.paints.length === beforePaints + 1) ok('happy: org-card FUEL CARD button opens preview');
  else no('happy card button', 'no preview painted');
})();

/* ============ summary ============ */
console.log('\n== summary ==');
console.log('passes: ' + passes + '  failures: ' + fails.length);
if (fails.length) {
  console.log('FAILURES:');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
}
console.log('ALL CHECKS PASS');
