#!/usr/bin/env node
/* scripts/verify-sharein.js — Share-In verification.
   Run from the worktree root: node scripts/verify-sharein.js
   1. node --check on new/changed files
   2. Static checks: kill switch, bundle marker, zero-XP / no-backend-writes
      guarantee (no fetch/XHR/postAction/xpGrant in comment-stripped source),
      esc() on every interpolated user string, fail-open param parsing,
      manifest.json share_target shape, banned terms, inner-script gate.
   3. Mocked-browser runtime tests (vm + minimal DOM shim): param parsing
      (deep-link, WST mode, bad params), kill switch, deep-link auto-open +
      param stripping, composer render + escaping, NO-AUTO-PUBLISH guarantee,
      confirm paths (cell draft saved device-local + /cells hand-off only on
      tap; public rides PFShareEverywhere.networks), photo picker vs
      declared-type routing, workshop hand-offs, MY DRAFTS open/delete.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SI = 'v1.4.3/core/35-sharein.js';
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(p, s) { return read(p).indexOf(s) !== -1; }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
[SI, 'build/bundle-core.js'].forEach(function (f) {
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var src = read(path.join(ROOT, SI));
var stripped = stripComments(src);

/* Kill switch */
if (has(path.join(ROOT, SI), "PF.skip('35-sharein')")) ok('kill switch (?pf_off=35-sharein)');
else no('kill switch', 'missing');

/* Bundle marker */
var buildSrc = read(path.join(ROOT, 'build/bundle-core.js'));
var siIdx = buildSrc.indexOf("'core/35-sharein.js'");
if (siIdx !== -1) ok('build list (CORE_FILES)');
else no('build list', "'core/35-sharein.js' missing from CORE_FILES");

/* Zero-XP / no-backend-writes guarantee */
var writeSins = ['fetch(', 'postAction(', 'XMLHttpRequest', 'xpGrant(', 'xpAdd(', 'ledgerAdd('];
var sinFound = writeSins.filter(function (s) { return stripped.indexOf(s) !== -1; });
if (!sinFound.length) ok('no backend writes / zero XP (no fetch, postAction, XHR, xpGrant)');
else no('no backend writes', 'found: ' + sinFound.join(', '));

/* esc() on every interpolated user string */
var escCount = (stripped.match(/esc\(/g) || []).length;
var escTargets = ['esc(d.title', 'esc(d.url', 'esc(d.text'];
var escMiss = escTargets.filter(function (s) { return stripped.indexOf(s) === -1; });
if (escCount >= 8 && !escMiss.length) ok('esc() on user strings (x' + escCount + ')');
else no('esc() coverage', 'count=' + escCount + ' missing=' + escMiss.join(','));

/* Fail-open param parsing: caps + empty-field composer */
if (stripped.indexOf('slice(0, 2000)') !== -1 && stripped.indexOf('slice(0, 500)') !== -1) ok('payload caps (URL/text)');
else no('payload caps', 'missing');

/* Banned terms */
if (stripped.toLowerCase().indexOf('donate') === -1) ok('no "donate"');
else no('banned term', '"donate" found');
if (stripped.indexOf('shanetheswan') === -1) ok('no @shanetheswan');
else no('identity', '@shanetheswan found');

/* Draft storage is device-local */
if (stripped.indexOf('pf_sharein_drafts_v1') !== -1 && stripped.indexOf('localStorage') !== -1) ok('drafts device-local (pf_sharein_drafts_v1)');
else no('draft storage', 'missing localStorage draft key');

/* manifest.json share_target shape */
try {
  var m = JSON.parse(read(path.join(ROOT, 'v1.4.3/pwa/manifest.json')));
  var st = m.share_target;
  if (st && st.action === 'https://www.mtcstw.com/?sharein=1' && st.method === 'GET' &&
      st.enctype === 'application/x-www-form-urlencoded' &&
      st.params && st.params.title === 'title' && st.params.text === 'text' && st.params.url === 'url') {
    ok('manifest.json share_target (same-origin GET, title/text/url)');
  } else { no('manifest share_target', 'wrong shape: ' + JSON.stringify(st)); }
} catch (e) { no('manifest share_target', 'invalid JSON: ' + e.message); }

/* sw.js untouched by this change */
if (read(path.join(ROOT, 'v1.4.3/pwa/sw.js')).indexOf('sharein') === -1) ok('sw.js untouched (GET flow needs no SW changes)');
else no('sw.js', 'sharein reference found — should be unchanged');

/* docs */
if (has(path.join(ROOT, 'docs/SHARE_IN.md'), 'bookmarklet')) ok('docs/SHARE_IN.md present');
else no('docs', 'docs/SHARE_IN.md missing');

/* Inner-script gate */
try {
  cp.execSync('node scripts/check-inner-scripts.js ' + SI, { cwd: ROOT, stdio: 'pipe' });
  ok('inner-script gate');
} catch (e) { no('inner-script gate', 'failed'); }

console.log('== 3. runtime tests (vm + DOM shim) ==');

/* ---------- minimal DOM shim ---------- */
function makeShim(search) {
  function matches(el, sel) {
    if (!sel || !el) return false;
    if (sel.charAt(0) === '.') {
      var cls = sel.slice(1);
      return ((' ' + (el.className || '') + ' ').indexOf(' ' + cls + ' ') !== -1);
    }
    if (sel.charAt(0) === '#') return el.id === sel.slice(1);
    if (/^\[[\w-]+(="[^"]*")?\]$/.test(sel)) {
      var mm = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel);
      var v = el.getAttribute(mm[1]);
      if (v === null || v === undefined) return false;
      return mm[2] === undefined || String(v) === mm[2];
    }
    return (el.tagName || '').toLowerCase() === sel.toLowerCase();
  }
  function walk(el, sel, out) {
    if (matches(el, sel)) out.push(el);
    (el.children || []).forEach(function (c) { walk(c, sel, out); });
    return out;
  }
  function mkEl(tag) {
    var el = {
      tagName: (tag || 'div').toUpperCase(), children: [], attributes: {},
      style: {}, dataset: {}, className: '', id: '', textContent: '',
      innerHTML: '', value: '', title: '', type: '', parentNode: null,
      onclick: null,
      setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); },
      getAttribute: function (k) { return this.attributes.hasOwnProperty(k) ? this.attributes[k] : null; },
      appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
      removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      addEventListener: function () {},
      querySelector: function (sel) { var r = walk(this, sel, []); return r[0] || null; },
      querySelectorAll: function (sel) { return walk(this, sel, []); },
      scrollIntoView: function () {}
    };
    return el;
  }
  var head = mkEl('head'), body = mkEl('body');
  var replaced = [];
  var doc = {
    createElement: mkEl, head: head, body: body, readyState: 'complete',
    addEventListener: function () {},
    dispatchEvent: function () {},
    getElementById: function (id) {
      var r = walk(head, '#' + id, []).concat(walk(body, '#' + id, []));
      return r[0] || null;
    },
    querySelector: function (sel) {
      var r = walk(head, sel, []).concat(walk(body, sel, []));
      return r[0] || null;
    },
    querySelectorAll: function (sel) { return walk(head, sel, []).concat(walk(body, sel, [])); }
  };
  var store = {};
  var timers = [];
  var sandbox = {
    window: {
      location: { search: search || '', pathname: '/', hash: '', href: 'https://www.mtcstw.com/' },
      history: { replaceState: function (st, t, u) { replaced.push(u); } },
      PF: { skip: function () { return false; }, toast: function () {} }
    },
    document: doc,
    localStorage: {
      getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    navigator: { userAgent: 'node' },
    setTimeout: function (fn) { timers.push(fn); return timers.length; },
    clearTimeout: function () {},
    CustomEvent: function (t, o) { this.type = t; this.detail = (o || {}).detail; },
    console: console
  };
  sandbox.window.PFCallsign = function () { return ''; };
  sandbox.PF = sandbox.window.PF;
  return { sandbox: sandbox, doc: doc, store: store, timers: timers, replaced: replaced,
    flush: function () { var t = timers.slice(); timers.length = 0; t.forEach(function (f) { try { f(); } catch (e) {} }); } };
}

function load(search, extra) {
  var sh = makeShim(search);
  if (extra) extra(sh);
  vm.createContext(sh.sandbox);
  vm.runInContext(src, sh.sandbox, { filename: '35-sharein.js' });
  sh.flush();
  return sh;
}
function findBtn(root, label) {
  var found = null;
  (function walk(el) {
    if (found) return;
    if (el.tagName === 'BUTTON' && (el.textContent || '') === label) { found = el; return; }
    (el.children || []).forEach(walk);
  })(root);
  return found;
}
function modalOf(sh) { return sh.doc.getElementById('pf-sharein-modal'); }

/* --- parse() unit tests --- */
try {
  var sh0 = load('');
  var SI0 = sh0.sandbox.window.PF.shareIn;
  if (!SI0) { no('runtime boot', 'PF.shareIn undefined'); }
  else {
    ok('runtime boot (PF.shareIn defined)');

    if (SI0.parse('?foo=1') === null) ok('parse: no sharein param -> null');
    else no('parse null', 'expected null');

    var d1 = SI0.parse('?sharein=' + encodeURIComponent('https://example.com/a?b=1') +
      '&text=' + encodeURIComponent('read this') + '&title=' + encodeURIComponent('Hot take'));
    if (d1 && d1.url === 'https://example.com/a?b=1' && d1.text === 'read this' &&
        d1.title === 'Hot take' && d1.kind === 'link') ok('parse: deep-link mode');
    else no('parse deep-link', JSON.stringify(d1));

    var d2 = SI0.parse('?sharein=1&title=T&text=' + encodeURIComponent('hello') +
      '&url=' + encodeURIComponent('https://example.com/u'));
    if (d2 && d2.url === 'https://example.com/u' && d2.text === 'hello' && d2.title === 'T') ok('parse: Web Share Target mode (?sharein=1)');
    else no('parse WST', JSON.stringify(d2));

    var d3 = SI0.parse('?sharein=not-a-url&text=' + encodeURIComponent('just words'));
    if (d3 && d3.url === '' && d3.kind === 'link') ok('parse: bad params fail open (empty fields, no throw)');
    else no('parse fail-open', JSON.stringify(d3));

    var d4 = SI0.parse('?sharein=' + encodeURIComponent('https://example.com/p.jpg') + '&type=photo');
    var d5 = SI0.parse('?sharein=' + encodeURIComponent('https://example.com/r.jpg') + '&type=receipt');
    if (d4 && d4.kind === 'photo' && d4.type === 'photo') ok('parse: type=photo -> kind photo');
    else no('parse photo', JSON.stringify(d4));
    if (d5 && d5.kind === 'photo' && d5.type === 'receipt') ok('parse: type=receipt declared');
    else no('parse receipt', JSON.stringify(d5));

    var d6 = SI0.parse('?sharein=' + encodeURIComponent('x'.repeat(3000)));
    if (d6 && d6.url === '' ) ok('parse: overlong URL dropped');
    else no('parse caps', JSON.stringify(d6 && d6.url && d6.url.length));
  }
} catch (e) { no('parse tests', 'exception: ' + e.message); }

/* --- kill switch --- */
try {
  var shk = makeShim('');
  shk.sandbox.window.PF.skip = function () { return true; };
  vm.createContext(shk.sandbox);
  vm.runInContext(src, shk.sandbox, { filename: '35-sharein.js' });
  if (shk.sandbox.window.PF.shareIn === undefined) ok('kill switch: PF.skip -> module inert');
  else no('kill switch runtime', 'PF.shareIn still defined');
} catch (e) { no('kill switch runtime', 'exception: ' + e.message); }

/* --- deep-link auto-open + param stripping --- */
try {
  var shA = load('?sharein=' + encodeURIComponent('https://example.com/story') +
    '&text=' + encodeURIComponent('look at this') + '&utm=keep');
  var mA = modalOf(shA);
  if (mA) ok('deep-link: composer auto-opens on ?sharein=');
  else no('deep-link auto-open', 'no modal in body');
  var rep = shA.replaced;
  if (rep.length === 1 && rep[0].indexOf('sharein') === -1 && rep[0].indexOf('utm=keep') !== -1) {
    ok('deep-link: params stripped, others preserved (' + rep[0] + ')');
  } else no('param stripping', JSON.stringify(rep));
  /* no-auto-publish: opening must not save anything */
  if (!shA.store['pf_sharein_drafts_v1']) ok('no-auto-publish: open() writes no draft');
  else no('no-auto-publish', 'draft saved without confirm: ' + shA.store['pf_sharein_drafts_v1']);
} catch (e) { no('deep-link flow', 'exception: ' + e.message); }

/* --- escaping --- */
try {
  var shE = load('');
  var SIE = shE.sandbox.window.PF.shareIn;
  SIE.open({ kind: 'link', url: 'https://example.com/', text: 'hi', title: '<img src=x onerror=alert(1)>' });
  var mE = modalOf(shE);
  var prev = mE ? mE.querySelector('.pf-sharein-prev') : null;
  var html = prev ? prev.innerHTML : '';
  if (html.indexOf('&lt;img') !== -1 && html.indexOf('<img') === -1) ok('esc(): title HTML-escaped in preview');
  else no('esc()', 'unescaped markup in preview: ' + html.slice(0, 80));
} catch (e) { no('esc() runtime', 'exception: ' + e.message); }

/* --- link confirm: POST TO MY CELL (draft saved, /cells only on tap) --- */
try {
  var shC = load('');
  var SIC = shC.sandbox.window.PF.shareIn;
  SIC.open({ kind: 'link', url: 'https://example.com/a', text: 'caption here', title: 'T' });
  var mC = modalOf(shC);
  var cellBtn = findBtn(mC, 'POST TO MY CELL');
  if (!cellBtn) { no('cell confirm', 'POST TO MY CELL button not found'); }
  else {
    cellBtn.onclick();
    var drs = JSON.parse(shC.store['pf_sharein_drafts_v1'] || '[]');
    if (drs.length === 1 && drs[0].dest === 'cell' && drs[0].state === 'confirmed' &&
        drs[0].caption === 'caption here — T — https://example.com/a') {
      ok('confirm: cell draft saved device-local (dest=cell, state=confirmed)');
    } else no('cell draft', JSON.stringify(drs));
    if (shC.sandbox.window.location.href === 'https://www.mtcstw.com/') ok('confirm: no navigation before the /cells tap');
    else no('cell navigation', 'navigated early: ' + shC.sandbox.window.location.href);
    var goBtn = findBtn(mC, 'OPEN MY CELL');
    if (goBtn) { goBtn.onclick(); if (shC.sandbox.window.location.href === '/cells') ok('confirm: OPEN MY CELL -> /cells'); else no('cells href', shC.sandbox.window.location.href); }
    else no('cells CTA', 'OPEN MY CELL button not found');
  }
} catch (e) { no('cell confirm flow', 'exception: ' + e.message); }

/* --- link confirm: SHARE PUBLIC rides the outward pipeline --- */
try {
  var netCalls = [];
  var shP = load('', function (sh) {
    sh.sandbox.window.PFShareEverywhere = {
      networks: function (g, t, u) {
        netCalls.push({ g: g, t: t, u: u });
        var d = sh.doc.createElement('div');
        d.className = 'pfshare-net-stub';
        return d;
      }
    };
  });
  var SIP = shP.sandbox.window.PF.shareIn;
  SIP.open({ kind: 'link', url: 'https://example.com/b', text: 'public note', title: 'PT' });
  var mP = modalOf(shP);
  var pubBtn = findBtn(mP, 'SHARE PUBLIC');
  if (!pubBtn) { no('public confirm', 'SHARE PUBLIC button not found'); }
  else {
    pubBtn.onclick();
    var drsP = JSON.parse(shP.store['pf_sharein_drafts_v1'] || '[]');
    var netOk = netCalls.length === 1 && netCalls[0].g === 'sharein' && netCalls[0].u === 'https://example.com/b';
    var netInDom = modalOf(shP).querySelector('.pfshare-net-stub') !== null;
    if (drsP.length === 1 && drsP[0].dest === 'public' && netOk && netInDom) {
      ok('confirm: SHARE PUBLIC -> outward pipeline (PFShareEverywhere.networks, prefilled)');
    } else no('public pipeline', 'drafts=' + JSON.stringify(drsP) + ' net=' + JSON.stringify(netCalls) + ' dom=' + netInDom);
  }
} catch (e) { no('public confirm flow', 'exception: ' + e.message); }

/* --- photo: ambiguous -> picker; declared -> skip --- */
try {
  var shF = load('');
  var SIF = shF.sandbox.window.PF.shareIn;
  SIF.open({ kind: 'photo', type: '', title: 'A pic', text: '', url: '' });
  var mF = modalOf(shF);
  var hasPicker = !!(findBtn(mF, 'RECEIPT BOUNTY') && findBtn(mF, 'PRICE REPORT') && findBtn(mF, 'PROPAGANDA UPLOAD'));
  if (hasPicker) ok('photo: ambiguous type shows context picker');
  else no('photo picker', 'picker buttons missing');

  SIF.open({ kind: 'photo', type: 'receipt', title: 'R', text: '', url: '' });
  var mF2 = modalOf(shF);
  var confirmBtn = findBtn(mF2, 'CONFIRM — HAND IT OFF');
  var pickerAgain = findBtn(mF2, 'PRICE REPORT');
  if (confirmBtn && !pickerAgain) ok('photo: declared type=receipt skips the picker');
  else no('photo declared-type', 'picker shown despite declared type');
} catch (e) { no('photo flow', 'exception: ' + e.message); }

/* --- photo confirm: workshop hand-offs --- */
try {
  var wsCalls = [];
  var shW = load('', function (sh) {
    sh.sandbox.window.PFWorkshop = {
      get: function (id) { return { id: id }; },
      open: function (id, opts) { wsCalls.push({ id: id, opts: opts }); }
    };
  });
  var SIW = shW.sandbox.window.PF.shareIn;
  SIW.open({ kind: 'photo', type: 'receipt', title: 'R', text: 'grocery run', url: '' });
  var cBtn = findBtn(modalOf(shW), 'CONFIRM — HAND IT OFF');
  cBtn.onclick();
  var drsW = JSON.parse(shW.store['pf_sharein_drafts_v1'] || '[]');
  var wsOk = wsCalls.length === 1 && wsCalls[0].id === 'data-bounties';
  if (wsOk && drsW.length === 1 && drsW[0].dest === 'receipt' && drsW[0].state === 'confirmed') {
    ok('photo confirm: receipt -> data-bounties workshop, draft saved');
  } else no('receipt handoff', 'ws=' + JSON.stringify(wsCalls) + ' drafts=' + JSON.stringify(drsW));

  SIW.open({ kind: 'photo', type: 'propaganda', title: 'P', text: '', url: '' });
  findBtn(modalOf(shW), 'CONFIRM — HAND IT OFF').onclick();
  if (wsCalls.length === 2 && wsCalls[1].id === 'poster-forge') ok('photo confirm: propaganda -> poster-forge workshop');
  else no('propaganda handoff', JSON.stringify(wsCalls));
} catch (e) { no('photo handoffs', 'exception: ' + e.message); }

/* --- MY DRAFTS: reopen + delete --- */
try {
  var shD = load('');
  var SID = shD.sandbox.window.PF.shareIn;
  SID.saveDraft({ kind: 'link', url: 'https://example.com/1', caption: 'one', dest: 'cell', state: 'confirmed' });
  SID.saveDraft({ kind: 'link', url: 'https://example.com/2', caption: 'two', dest: 'public', state: 'confirmed' });
  if (SID.readDrafts().length === 2) ok('drafts: saveDraft/readDrafts round-trip (2)');
  else no('draft round-trip', JSON.stringify(SID.readDrafts().length));
  SID.open({ kind: 'link' });
  var delBtn = findBtn(modalOf(shD), 'DELETE');
  if (delBtn) { delBtn.onclick(); if (SID.readDrafts().length === 1) ok('drafts: DELETE removes one draft'); else no('draft delete', 'left=' + SID.readDrafts().length); }
  else no('draft delete', 'DELETE button not found');
  var openBtn = findBtn(modalOf(shD), 'OPEN');
  if (openBtn) { openBtn.onclick(); if (modalOf(shD)) ok('drafts: OPEN re-opens the composer'); else no('draft reopen', 'no modal'); }
  else no('draft reopen', 'OPEN button not found');
} catch (e) { no('drafts flow', 'exception: ' + e.message); }

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
