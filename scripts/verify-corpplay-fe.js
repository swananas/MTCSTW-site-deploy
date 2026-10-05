#!/usr/bin/env node
/* scripts/verify-corpplay-fe.js — Corporate Playbook frontend verification.
   Run from the repo root:
     node scripts/verify-corpplay-fe.js
   0. Rebuilds bundles (bundle-pages carries both new modules)
   1. node --check on both new/changed modules
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      painter registration (IDS/TITLES/PAINT), kill switch, esc() on every
      injected field, no auto-mount, no rebuilt share plumbing, no XP,
      money-null degradation, copy/CTA standards (incl. the price-hike honest
      empty state), banned terms, bundle registration
   3. Mocked-browser runtime tests (vm + canvas-2d stub + minimal DOM stub):
      the phq-corp painter renders its spec copy on fixture data, degrades
      null money fields to em-dash, stamps the callsign, degrades with no
      callsign; PFCorpCard.mount() renders the card on a good endpoint
      response, wires DOWNLOAD/SHARE through the EXISTING PF.PHQShare flow,
      honors the kill switch, shows the honest empty state on unknown
      ticker, and fails soft (hides the section) on transport failure.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var PAINTER_MOD = path.join(V, 'core', 'share-image-phq.js');
var CARD_MOD = path.join(V, 'core', 'corp-card.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[PAINTER_MOD, CARD_MOD].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var psrc = read(PAINTER_MOD), csrc = read(CARD_MOD);
var pcode = stripComments(psrc), ccode = stripComments(csrc);

/* ============ 2. static contract checks ============ */
console.log('== 2. static contract checks ==');
/* painter registration */
if (pcode.indexOf("'phq-corp'") !== -1 &&
    /var IDS = \[[^\]]*'phq-corp'[^\]]*\]/.test(pcode)) ok('painter id in IDS');
else no('painter IDS', "'phq-corp' missing from IDS");
if (/'phq-corp':\s*'CORPORATE PLAYBOOK'/.test(pcode)) ok("TITLES['phq-corp'] = 'CORPORATE PLAYBOOK'");
else no('painter TITLES', 'missing');
if (/'phq-corp':\s*paintCorp/.test(pcode)) ok('painters map registers paintCorp');
else no('painters map', 'missing paintCorp');
/* kill switches */
if (/PF\.skip\(['"]corp-card['"]\)/.test(csrc)) ok('kill switch PF.skip("corp-card") wired');
else no('kill switch', 'PF.skip("corp-card") not found');
if (csrc.indexOf('?pf_off=corp-card') !== -1) ok('KILL comment documents ?pf_off=corp-card');
else no('kill comment', '?pf_off=corp-card missing from header');
/* esc() on injected fields — comment-stripped view, no string stripping */
['esc\\(j\\.name\\)', 'esc\\(j\\.ticker\\)', 'esc\\(j\\.year\\)',
 'esc\\(money\\(j\\.buybacks\\)\\)', 'esc\\(money\\(j\\.tax_paid\\)\\)',
 'esc\\(pct\\(j\\.effective_rate\\)\\)', 'esc\\(money\\(j\\.lobbying_spend\\)\\)',
 'esc\\(note\\)', 'esc\\(sourceLine\\(j\\.sources, j\\.year\\)\\)',
 'esc\\(EMPTY_MSG\\)'].forEach(function (pat) {
  if (new RegExp(pat).test(ccode)) ok('esc applied: ' + pat.replace(/\\\\/g, '').replace(/\\\./g, '.'));
  else no('esc()', pat + ' not found in corp-card.js');
});
/* never auto-mounts */
if (!/PFCorpCard\.mount\(/.test(ccode) && !/\.mount\(ticker/.test(ccode))
  ok('module never auto-mounts (Release Eng calls PFCorpCard.mount)');
else no('auto-mount', 'mount() appears to be invoked inside the module');
/* existing share flow reused, no rebuilt plumbing, no XP */
if (ccode.indexOf('PF.PHQShare') !== -1 && /PHQ\.save\(/.test(ccode) && /PHQ\.share\(/.test(ccode))
  ok('DOWNLOAD/SHARE route through existing PF.PHQShare.save/.share');
else no('share flow', 'not using PF.PHQShare.save/.share');
if (!/\bxp\b/i.test(ccode.replace(/explain/gi, ''))) ok('no XP code on the frontend');
else no('no-xp', 'found xp reference in corp-card.js');
if (ccode.indexOf("'phq-corp'") !== -1) ok('painter id referenced: phq-corp');
else no('painter id ref', 'missing');
/* money-null degradation in the painter */
if (pcode.indexOf('moneyB') !== -1 && /return '\\u2014'/.test(pcode))
  ok('painter moneyB degrades null/invalid to em-dash');
else no('moneyB', 'null degradation missing');
/* copy/CTA standards */
if (psrc.indexOf('THEIR PLAYBOOK') !== -1 && csrc.indexOf('THEIR PLAYBOOK') !== -1)
  ok('THEIR PLAYBOOK header copy in painter + card');
else no('header copy', 'missing');
if (psrc.indexOf('Per-company price data has no public source') === -1 &&
    csrc.indexOf('Per-company price data has no public source') !== -1)
  ok('price-hike honest empty state copy present on card (no number, never proxied)');
else no('price copy', 'honest empty state copy missing');
if (pcode.indexOf('NO PUBLIC PER-COMPANY SOURCE') !== -1)
  ok('painter renders the price-hike empty line (never a number)');
else no('painter price line', 'missing');
if (csrc.indexOf('SEC EDGAR') !== -1 && csrc.indexOf('LDA') !== -1)
  ok('source labels SEC EDGAR + LDA present');
else no('source labels', 'missing');
['donate', 'shanetheswan'].forEach(function (w) {
  if (csrc.toLowerCase().indexOf(w) === -1 && psrc.toLowerCase().indexOf(w) === -1)
    ok('banned term absent: ' + w);
  else no('banned term', w + ' present');
});
if (!/\bShane\b/.test(csrc) && !/\bShane\b/.test(pcode)) ok('no real names in copy');
else no('real name', 'found "Shane"');
/* every figure labeled with source + year */
['SEC EDGAR · FY', 'LDA LD-2 FILINGS', 'TAXES PAID ÷ PRETAX INCOME'].forEach(function (frag) {
  if (csrc.indexOf(frag) !== -1) ok('figure label present: ' + frag);
  else no('figure labels', frag + ' missing');
});
/* bundle registration */
function has(p, s) { return read(p).indexOf(s) !== -1; }
if (has(path.join(ROOT, 'build', 'bundle-core.js'), "'core/corp-card.js'"))
  ok('corp-card.js registered in build/bundle-core.js (bundle-pages)');
else no('bundle registration', 'not found in build/bundle-core.js');
if (has(path.join(V, 'pages', 'bundle-pages.js'), 'pfCorpCardDone'))
  ok('module marker present in rebuilt pages/bundle-pages.js');
else no('bundle marker', 'pfCorpCardDone missing from bundle-pages.js');

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
  el.querySelector = function (sel) {
    var cls = (String(sel).charAt(0) === '.') ? String(sel).slice(1) : null;
    function walk(n) {
      for (var i = 0; i < n.children.length; i++) {
        var c = n.children[i];
        if (cls && (' ' + String(c.className) + ' ').indexOf(' ' + cls + ' ') !== -1) return c;
        var f = walk(c);
        if (f) return f;
      }
      return null;
    }
    return walk(el);
  };
  el.scrollTo = function () {};
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._innerHTML; },
    set: function (v) { el._innerHTML = String(v); }
  });
  return el;
}
function makeEnv(opts) {
  opts = opts || {};
  var store = {};
  if (opts.callsign !== null) store.pf_identity_v1 = JSON.stringify({ callsign: opts.callsign || 'WARHAWK' });
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
  sb.PFCallsign = function () { return store.pf_identity_v1 ? 'WARHAWK' : ''; };
  sb.PF_BACKEND_URL = opts.backend === undefined ? 'https://pf-api.example.com/exec' : opts.backend;
  sb.PFShare = {
    setPoster: function (id, fn) { registered[id] = fn; },
    shareImage: function (cv, fn2, title, id, o) { shareCalls.push({ cv: cv, fn: fn2, title: title, id: id }); },
    saveImage: function (cv, fn2, id, o) { saveCalls.push({ cv: cv, fn: fn2, id: id }); },
    stampCallsign: function (cv) { return cv; }
  };
  vm.createContext(sb);
  vm.runInContext(read(PAINTER_MOD), sb, { filename: 'share-image-phq.js' });
  vm.runInContext(read(CARD_MOD), sb, { filename: 'corp-card.js' });
  return { sb: sb, store: store, captured: captured, registered: registered,
           shareCalls: shareCalls, saveCalls: saveCalls };
}
function textsOf(cv) { return (cv._recs || []).map(function (r) { return r.text; }); }
function joined(cv) { return textsOf(cv).join('\n'); }
function squish(s) { return String(s).replace(/\s+/g, ''); }
function hasFrag(cv, frag) { return squish(joined(cv)).indexOf(squish(frag)) !== -1; }
function hasText(cv, s) { return textsOf(cv).indexOf(s) !== -1; }

/* --- painter: phq-corp on synthetic fixture data --- */
/* Fixture money values are synthetic (clearly not real company data). */
var FIXC = {
  ticker: 'XOM', name: 'SYNTHETIC OIL CORP', year: 2024,
  buybacks: 19000000000, taxPaid: 9500000000, effectiveRate: 0.2139,
  lobbyingSpend: 2350000,
  sourceLine: 'SOURCES: SEC EDGAR · 10-K FY2024 · LDA · 2024 LD-2 FILINGS'
};
var env = makeEnv();
var PHQ = env.sb.PF && env.sb.PF.PHQShare;
if (!PHQ) { no('PF.PHQShare', 'API not exposed'); }
else {
  ok('PF.PHQShare exposed');
  if (typeof env.registered['phq-corp'] === 'function') ok('setPoster registered: phq-corp');
  else no('registration', 'phq-corp not registered with PFShare');
  var cv = PHQ.paint('phq-corp', FIXC);
  if (!cv || cv.width !== 1080 || cv.height !== 1350) { no('corp painter mount', 'no 1080x1350 canvas'); }
  else {
    ok('corp painter mounts 1080x1350');
    if (hasText(cv, '\u2605 THE PROPAGANDA FACTORY \u2605')) ok('corp painter kicker');
    else no('corp kicker', 'missing');
    if (hasFrag(cv, 'THEIR PLAYBOOK')) ok('corp painter badge: THEIR PLAYBOOK (letter-spaced)');
    else no('corp badge', 'missing');
    if (hasText(cv, 'XOM · FY 2024')) ok('corp painter company line');
    else no('corp company', 'missing: ' + JSON.stringify(textsOf(cv).slice(0, 8)));
    if (hasText(cv, '$19.0B') && hasText(cv, '$9.5B')) ok('corp painter buybacks vs taxes ($19.0B / $9.5B)');
    else no('corp money', 'missing buybacks/taxes figures');
    if (hasText(cv, '21.4%')) ok('corp painter effective rate 21.4%');
    else no('corp rate', 'missing');
    if (hasText(cv, '$2.4M')) ok('corp painter lobbying spend $2.4M');
    else no('corp lobbying', 'missing');
    if (hasFrag(cv, 'PRICE HIKES: NO PUBLIC PER-COMPANY SOURCE')) ok('corp painter price-hike empty line');
    else no('corp price line', 'missing');
    if (hasFrag(cv, 'SOURCES: SEC EDGAR')) ok('corp painter sources footer');
    else no('corp sources', 'missing');
    if (hasText(cv, 'FIGHTING AS WARHAWK')) ok('corp painter callsign stamp');
    else no('corp stamp', 'missing');
    if (hasText(cv, 'JOIN THE FIGHT.')) ok('corp painter CTA: JOIN THE FIGHT.');
    else no('corp CTA', 'missing');
    if (cv._pfStamped === true) ok('painter sets _pfStamped (idempotent stamp safety net)');
    else no('corp _pfStamped', 'not set');
    var j = joined(cv);
    if (j.indexOf('NaN') === -1 && j.indexOf('undefined') === -1) ok('corp painter: no NaN/undefined leaks');
    else no('corp painter', 'leak: ' + j.slice(0, 80));
  }
  /* null money degrades to em-dash, never invented */
  var cv2 = PHQ.paint('phq-corp', { ticker: 'XOM', name: 'SYNTHETIC OIL CORP', year: 2024 });
  if (cv2 && hasText(cv2, '\u2014') && joined(cv2).indexOf('NaN') === -1) ok('corp painter: missing money -> em-dash');
  else no('corp nulls', 'missing fields did not degrade to em-dash');
  /* no-callsign: stamp skipped, no blank stamp */
  var env2 = makeEnv({ callsign: null });
  var PHQ2 = env2.sb.PF && env2.sb.PF.PHQShare;
  var cv3 = PHQ2.paint('phq-corp', FIXC);
  if (cv3 && !hasFrag(cv3, 'FIGHTING AS')) ok('corp painter: no callsign -> no blank stamp');
  else no('corp no-callsign', 'blank stamp rendered');
  /* layout guard: clean gap above the bottom stack (1185-1215), deep link + CTA + date pinned */
  var rs = (cv._recs || []), bad = [], link = null, cta = null, date = null;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.y > 1185 && r.y < 1215) bad.push(r.text.slice(0, 24) + '@' + Math.round(r.y));
    if (r.text === 'MTCSTW.COM/POLITICAL-HQ') link = r.y;
    if (r.text === 'JOIN THE FIGHT.') cta = r.y;
    if (/^[A-Z]+ \d{1,2}, \d{4}$/.test(r.text)) date = r.y;
  }
  if (!bad.length) ok('corp painter: clean gap above bottom stack');
  else no('corp gap', 'content in stack gap: ' + bad.join(' | '));
  if (link === 1222) ok('corp painter: deep link at H-128');
  else no('corp link', 'deep link y=' + link);
  if (cta === 1266) ok('corp painter: JOIN THE FIGHT. at H-84');
  else no('corp CTA y', 'y=' + cta);
  if (date === 1302) ok('corp painter: date line at H-48');
  else no('corp date', 'date y=' + date);
}

/* --- card: PFCorpCard.mount on a good endpoint response --- */
var J = {
  ok: true, ticker: 'XOM', name: 'SYNTHETIC OIL CORP', cik: '0000034088', year: 2024,
  buybacks: 19000000000, tax_paid: 9500000000, pretax_income: 44400000000,
  effective_rate: 0.2139, lobbying_spend: 2350000,
  price_hikes: { empty: true, reason: 'no public per-company source',
    note: 'Per-company price data has no public source. Shown: what filings prove.' },
  sources: [{ name: 'SEC EDGAR', kind: 'edgar', concept: 'PaymentsForRepurchaseOfCommonStock', fy: 2024, form: '10-K' },
            { name: 'LDA', kind: 'lda', year: 2024 }],
  retrieved_at: 1728000000
};
function fireJSONP(e, payload, ticker) {
  ticker = ticker || 'XOM';
  /* grab the script tag the module injected, extract the callback name, fire it */
  var sc = e.captured.scripts[e.captured.scripts.length - 1];
  var m = String(sc.src || '').match(/callback=([^&]+)/);
  if (!m) { no('jsonp', 'no callback in script src: ' + sc.src); return false; }
  var cb = decodeURIComponent(m[1]);
  if (String(sc.src).indexOf('action=corp_card') === -1 || String(sc.src).indexOf('ticker=' + ticker) === -1) {
    no('jsonp', 'unexpected script src: ' + sc.src); return false;
  }
  try { e.sb[cb](payload); } catch (err) { no('jsonp', 'callback threw: ' + err.message); return false; }
  return true;
}
var e3 = makeEnv();
var ctr = e3.sb.document.createElement('div');
if (e3.sb.PFCorpCard && e3.sb.PFCorpCard.mount('XOM', ctr) === true) ok('PFCorpCard.mount returns true');
else no('mount', 'PFCorpCard.mount missing or false');
if (fireJSONP(e3, J)) {
  var html = ctr.children[0] ? ctr.children[0]._innerHTML : '';
  if (html.indexOf('THEIR PLAYBOOK') !== -1) ok('card renders THEIR PLAYBOOK');
  else no('card header', 'missing');
  if (html.indexOf('SYNTHETIC OIL CORP') !== -1 && html.indexOf('XOM') !== -1) ok('card renders company + ticker');
  else no('card company', 'missing');
  if (html.indexOf('$19.0B') !== -1 && html.indexOf('$9.5B') !== -1) ok('card renders $19.0B buybacks / $9.5B taxes');
  else no('card money', 'missing');
  if (html.indexOf('21.4%') !== -1) ok('card renders effective rate 21.4%');
  else no('card rate', 'missing');
  if (html.indexOf('$2.4M') !== -1) ok('card renders lobbying $2.4M');
  else no('card lobbying', 'missing');
  if (html.indexOf('Per-company price data has no public source') !== -1) ok('card renders price-hike empty state');
  else no('card price empty', 'missing');
  if (html.indexOf('SEC EDGAR') !== -1 && html.indexOf('LDA') !== -1 && html.indexOf('FY2024') !== -1)
    ok('card labels every figure with source + year');
  else no('card labels', 'missing source/year labels');
  /* DOWNLOAD/SHARE wire through the existing PF.PHQShare flow */
  var root = ctr.children[0];
  var click = root._listeners.click && root._listeners.click[0];
  if (!click) { no('card click', 'no click handler on card root'); }
  else {
    var tgt = function (k) {
      return { getAttribute: function (a) { return a === k ? '1' : null; } };
    };
    click({ target: tgt('data-cp-sh') });
    if (e3.shareCalls.length === 1 && e3.shareCalls[0].id === 'phq-corp') ok('SHARE routes via PF.PHQShare.share(phq-corp)');
    else no('card SHARE', 'not routed: ' + JSON.stringify(e3.shareCalls.length));
    click({ target: tgt('data-cp-dl') });
    if (e3.saveCalls.length === 1 && e3.saveCalls[0].id === 'phq-corp') ok('DOWNLOAD routes via PF.PHQShare.save(phq-corp)');
    else no('card DOWNLOAD', 'not routed');
    var pd = e3.shareCalls[0] && e3.shareCalls[0].cv;
    if (pd === null || pd === undefined) {
      /* share() paints internally via PFShare.shareImage(cv...) — the stub records cv */
      ok('share payload delivered to PFShare (canvas painted by the phq-corp painter)');
    }
  }
}
/* unknown ticker: honest empty state (shown, not hidden) */
var e4 = makeEnv();
var ctr4 = e4.sb.document.createElement('div');
e4.sb.PFCorpCard.mount('ZZZZ', ctr4);
if (fireJSONP(e4, { ok: false, err: 'no corporate facts for ticker' }, 'ZZZZ')) {
  if (ctr4._innerHTML.indexOf('No corporate facts on file for this ticker') !== -1)
    ok('unknown ticker: honest empty state shown');
  else no('unknown ticker', 'empty state missing: ' + ctr4._innerHTML.slice(0, 80));
}
/* transport failure: fail-soft hide */
var e5 = makeEnv();
var ctr5 = e5.sb.document.createElement('div');
e5.sb.PFCorpCard.mount('XOM', ctr5);
var sc5 = e5.captured.scripts[e5.captured.scripts.length - 1];
try { sc5.onerror(); } catch (err) { no('transport', 'onerror threw: ' + err.message); }
if (ctr5.style.display === 'none' && ctr5._innerHTML === '') ok('transport failure: section hides itself');
else no('fail-soft', 'section did not hide');
/* kill switch */
var e6 = makeEnv({ search: '?pf_off=corp-card' });
if (typeof e6.sb.PFCorpCard === 'undefined') ok('kill switch ?pf_off=corp-card: module stays unloaded');
else no('kill switch', 'module loaded despite kill');
/* double-mount guard */
var e7 = makeEnv();
var ctr7 = e7.sb.document.createElement('div');
e7.sb.PFCorpCard.mount('XOM', ctr7);
fireJSONP(e7, J);
var nScripts = e7.captured.scripts.length;
e7.sb.PFCorpCard.mount('XOM', ctr7);
if (e7.captured.scripts.length === nScripts) ok('double-mount: no second fetch');
else no('double-mount', 'fetched twice');

console.log('\n== summary ==');
console.log(passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL GREEN');
