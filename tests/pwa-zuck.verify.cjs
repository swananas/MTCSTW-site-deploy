#!/usr/bin/env node
/* tests/pwa-zuck.verify.cjs — ZUCK IT UP PWA workstream (2026-10-09, fe-zuck-pwa).
 * Covers: install-prompt gating/timing/snooze (install.js), manifest splash
 * polish (manifest.json), offline app shell (sw.js), iOS startup images.
 *
 * Run: node tests/pwa-zuck.verify.cjs
 * Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var INSTALL = path.join(ROOT, 'v1.4.3', 'pwa', 'install.js');
var MANIFEST = path.join(ROOT, 'v1.4.3', 'pwa', 'manifest.json');
var SW = path.join(ROOT, 'v1.4.3', 'pwa', 'sw.js');
var INDEX = path.join(ROOT, 'site', 'index.html');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
}
function stat(code, name, re, why) {
  if (re.test(code)) ok(name); else no(name, why || ('missing: ' + re));
}

/* ============ 1. syntax ============ */
console.log('== 1. syntax ==');
[INSTALL, SW].forEach(function (p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok(path.basename(p) + ' syntax'); }
  catch (e) { no(path.basename(p) + ' syntax', 'node --check failed'); }
});
try { JSON.parse(read(MANIFEST)); ok('manifest.json parses'); }
catch (e) { no('manifest.json parses', String(e)); }

var isrc = read(INSTALL), icode = stripComments(isrc);
var ssrc = read(SW), scode = stripComments(ssrc);

/* ============ 2. install.js — prompt gating/timing ============ */
console.log('== 2. install prompt gating ==');
stat(icode, 'gate: visits >= 2 unlocks prompt', /pwaVisits\(\)\s*>=\s*2/);
stat(icode, 'gate: engagement unlocks prompt', /pwaVisits\(\) >= 2 \|\| pwaEngaged\(\)/);
stat(icode, 'Android: prompt held until gate opens (maybeShowAndroid)', /function maybeShowAndroid\(\)/);
stat(icode, 'Android: beforeinstallprompt captured + deferred', /addEventListener\('beforeinstallprompt'/);
stat(icode, 'Android: no immediate showButton on capture', /deferredPrompt = e;\s*maybeShowAndroid\(\);/);
stat(icode, 'snooze: X tap snoozes 7 days', /pwaSnooze\(7\)/);
stat(icode, 'snooze: decline snoozes 7 days',
  /choice && choice\.outcome === 'accepted'\)[\s\S]*?\}\s*else\s*\{[\s\S]*?pwaSnooze\(7\)/,
  'decline branch does not snooze');
stat(icode, 'snooze: accept buys 90 days quiet', /NINETY_DAYS/);
stat(icode, 'snooze: showButton respects snooze', /if \(pwaSnoozed\(\)\) \{ return; \}/);
stat(icode, 'iOS: gate applies to iOS path too', /function iosTryShow\(\)/);
stat(icode, 'engagement: bus events mark engaged', /pf-callsign-claimed.*pf-vote-cast.*pf-order-checkin.*pf-xp/);
stat(icode, 'engagement: scroll past fold counts', /y > 300/);
stat(icode, 'Cloudflare: pwaBase accepts non-jsDelivr versioned scripts', /if \(!fallback\) \{ fallback = base; \}/);
stat(icode, 'entrance: prompt animates in (pfPwaIn)', /pfPwaIn/);
stat(icode, 'a11y: install button has aria-label', /aria-label.*Install the MTCSTW app/);
if (!/donate/i.test(icode)) ok('no "donate" in install copy'); else no('no "donate" in install copy', 'banned word present');

/* ============ 3. manifest — splash polish ============ */
console.log('== 3. manifest splash polish ==');
var mf = JSON.parse(read(MANIFEST));
if (mf.theme_color === '#c1121f') ok('theme_color matches site brand #c1121f');
else no('theme_color matches site brand #c1121f', 'got ' + mf.theme_color);
if (mf.background_color === '#0a0a0a') ok('background_color #0a0a0a (splash bg)');
else no('background_color #0a0a0a (splash bg)', 'got ' + mf.background_color);
var any512 = mf.icons.some(function (i) { return i.sizes === '512x512' && (!i.purpose || i.purpose === 'any'); });
if (any512) ok('512px "any" icon present (Android splash needs non-maskable)');
else no('512px "any" icon present (Android splash needs non-maskable)', JSON.stringify(mf.icons));
var mask512 = mf.icons.some(function (i) { return i.sizes === '512x512' && /maskable/.test(i.purpose || ''); });
if (mask512) ok('512px maskable icon kept (adaptive icons)');
else no('512px maskable icon kept (adaptive icons)', 'missing');
if (Array.isArray(mf.shortcuts) && mf.shortcuts.length >= 1) ok('shortcuts present (' + mf.shortcuts.length + ')');
else no('shortcuts present', 'no shortcuts array');
(mf.shortcuts || []).forEach(function (s) {
  if (s.name && s.url && s.icons && s.icons.length) ok('shortcut "' + s.name + '" well-formed');
  else no('shortcut "' + (s.name || '?') + '" well-formed', JSON.stringify(s));
});
if (!/donate/i.test(read(MANIFEST))) ok('no "donate" in manifest'); else no('no "donate" in manifest', 'banned word present');

/* ============ 4. sw.js — offline app shell ============ */
console.log('== 4. offline app shell ==');
stat(scode, 'SW precaches app shell on install', /var SHELL = \[/);
stat(scode, 'SW shell includes homepage', /'\/'/);
stat(scode, 'SW shell includes core bundle', /bundle-core-slr\.js/);
stat(scode, 'SW shell includes styles', /bundle-styles\.css/);
stat(scode, 'SW shell includes manifest + icons', /manifest\.json/);
stat(scode, 'SW precache is fail-soft per asset', /\.catch\(function \(\) \{\}\)/);
stat(scode, 'SW offline nav serves cached shell', /caches\.match\('\/'\)/);
stat(scode, 'SW injects offline ribbon', /OFFLINE_RIBBON/);
stat(scode, 'SW ribbon is branded (OFFLINE / saved orders)', /RUNNING ON SAVED ORDERS/);
stat(scode, 'SW refreshes cached shell when online', /c\.put\('\/', copy\)/);
stat(scode, 'SW keeps last-resort offline page', /OFFLINE_HTML/);
/* No regressions of prior fixes: */
stat(scode, 'SW keeps JSONP cache skip', /callback=/);
stat(scode, 'SW caches only ok API responses', /cacheable && res && res\.ok/);
stat(scode, 'SW keeps push URL validation (L-1)', /mtcstw\\.com/);
stat(scode, 'SW purges old caches on activate', /caches\.delete\(k\)/);
if (!/donate/i.test(scode)) ok('no "donate" in SW copy'); else no('no "donate" in SW copy', 'banned word present');

/* ============ 5. iOS startup images ============ */
console.log('== 5. iOS startup images ==');
var idx = read(INDEX);
var splashRe = /apple-touch-startup-image/g;
var splashCount = (idx.match(splashRe) || []).length;
if (splashCount >= 4) ok('index.html carries ' + splashCount + ' apple-touch-startup-image links');
else no('index.html carries >= 4 apple-touch-startup-image links', 'found ' + splashCount);
['1170x2532', '1290x2796', '1125x2436', '1242x2688'].forEach(function (sz) {
  var p = path.join(ROOT, 'v1.4.3', 'pwa', 'splash-' + sz + '.png');
  var sp = path.join(ROOT, 'site', 'v1.4.3', 'pwa', 'splash-' + sz + '.png');
  var okPng = false, siteOk = false;
  try {
    var b = fs.readFileSync(p);
    okPng = b.length > 10000 && b[0] === 0x89 && b[1] === 0x50; /* PNG magic */
  } catch (e) {}
  try { siteOk = fs.statSync(sp).size === fs.statSync(p).size; } catch (e) {}
  if (okPng && siteOk) ok('splash-' + sz + '.png valid PNG, mirrored to site/');
  else no('splash-' + sz + '.png valid PNG, mirrored to site/', 'src=' + okPng + ' site=' + siteOk);
});
if (/apple-mobile-web-app-capable/.test(idx)) ok('index.html sets apple-mobile-web-app-capable');
else no('index.html sets apple-mobile-web-app-capable', 'missing');

/* ============ 6. mocked-browser runtime: gating behavior ============ */
console.log('== 6. runtime gating ==');
var IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
var ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/604.1';

function makeWorld(ua, scripts) {
  var idIndex = {};
  function El(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parentNode = null;
    this.style = {}; this.attributes = {}; this._ls = {};
    this._id = ''; this.textContent = ''; this._html = '';
  }
  Object.defineProperty(El.prototype, 'id', {
    get: function () { return this._id; },
    set: function (v) {
      if (this._id && idIndex[this._id] === this) delete idIndex[this._id];
      this._id = String(v); if (this._id) idIndex[this._id] = this;
    }
  });
  Object.defineProperty(El.prototype, 'innerHTML', {
    get: function () { return this._html; },
    set: function (h) {
      this._html = String(h);
      var re = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, m;
      while ((m = re.exec(this._html))) {
        var idm = /id="([^"]+)"/.exec(m[2]);
        if (!idm) continue;
        var c = new El(m[1]); c.id = idm[1]; this.appendChild(c);
      }
    }
  });
  El.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); };
  El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
  El.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i > -1) this.children.splice(i, 1);
    c.parentNode = null;
    if (c.id && idIndex[c.id] === c) delete idIndex[c.id];
    return c;
  };
  El.prototype.addEventListener = function (t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); };
  El.prototype.dispatchEvent = function (ev) {
    ev.target = ev.target || this;
    var node = this;
    while (node) {
      var ls = node._ls[ev.type] || [];
      for (var i = 0; i < ls.length; i++) ls[i].call(node, ev);
      node = node.parentNode;
    }
    return true;
  };
  function walk(n, fn) { fn(n); for (var i = 0; i < n.children.length; i++) walk(n.children[i], fn); }

  var html = new El('html'), head = new El('head'), body = new El('body');
  html.appendChild(head); html.appendChild(body);
  (scripts || []).forEach(function (s) { var e = new El('script'); e.src = s; head.appendChild(e); });

  var timers = [];
  function storage() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      _dump: function () { return m; }
    };
  }
  var session = storage(), local = storage();
  var docLs = {};
  var sb = {
    document: {
      createElement: function (t) { return new El(t); },
      getElementById: function (id) { return idIndex[id] || null; },
      getElementsByTagName: function (t) {
        var out = [];
        walk(html, function (n) { if (n.tagName === String(t).toUpperCase()) out.push(n); });
        return out;
      },
      querySelector: function (sel) {
        var m = /^(link|meta)\[(rel|name)="([^"]+)"\]$/.exec(sel), found = null;
        walk(html, function (n) {
          if (!found && m && n.tagName === m[1].toUpperCase() && n.attributes[m[2]] === m[3]) found = n;
        });
        return found;
      },
      addEventListener: function (t, fn) { (docLs[t] = docLs[t] || []).push(fn); },
      fire: function (t, ev) { (docLs[t] || []).forEach(function (fn) { fn.call(sb.document, ev || { type: t }); }); },
      head: head, body: body, documentElement: html
    },
    navigator: { userAgent: ua },
    location: { search: '', href: 'https://www.mtcstw.com/' },
    localStorage: local, sessionStorage: session,
    setTimeout: function (cb) { timers.push(cb); return timers.length; },
    clearTimeout: function () {},
    console: console,
    PF: { skip: function () { return false; }, toast: function () {} }
  };
  sb.window = sb; sb.globalThis = sb;
  var winLs = {};
  sb.addEventListener = function (t, fn) { (winLs[t] = winLs[t] || []).push(fn); };
  sb.fire = function (t, ev) { (winLs[t] || []).forEach(function (fn) { fn.call(sb, ev || { type: t }); }); };
  sb.matchMedia = function () { return { matches: false }; };
  sb.runTimers = function () { var q = timers.splice(0); q.forEach(function (cb) { cb(); }); };
  vm.createContext(sb);
  return { sb: sb, body: body, session: session, local: local, walk: walk,
    buttons: function () {
      var out = [];
      walk(html, function (n) { if (n.id === 'pf-pwa-install') out.push(n); });
      return out;
    } };
}

/* --- 6a. Cloudflare shell: pwaBase resolves without MTCSTW-site-deploy --- */
(function () {
  var w = makeWorld(ANDROID_UA, [
    'https://www.mtcstw.com/v1.4.3/core/bundle-core-slr.js',
    'https://www.mtcstw.com/v1.4.3/pwa/install.js'
  ]);
  vm.runInContext(isrc, w.sb, { filename: 'install.js#cf' });
  if (w.sb.__pfPwaBooted === true) ok('Cloudflare shell: install.js boots (base resolved, no MTCSTW-site-deploy)');
  else no('Cloudflare shell: install.js boots (base resolved, no MTCSTW-site-deploy)', 'bailed — PWA dead on Cloudflare');
})();

/* --- 6b. Android cold visitor: beforeinstallprompt held, no button --- */
(function () {
  var w = makeWorld(ANDROID_UA, [
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/core/bundle-core-slr.js',
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/pwa/install.js'
  ]);
  vm.runInContext(isrc, w.sb, { filename: 'install.js#cold' });
  var ev = { type: 'beforeinstallprompt', preventDefault: function () {},
    prompt: function () {}, userChoice: { then: function () {} } };
  w.sb.fire('beforeinstallprompt', ev);
  if (w.buttons().length === 0) ok('Android cold visitor: prompt held, no button on first visit');
  else no('Android cold visitor: prompt held, no button on first visit', 'button shown too early');
})();

/* --- 6c. Android engaged visitor: engagement unlocks the held prompt --- */
(function () {
  var w = makeWorld(ANDROID_UA, [
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/core/bundle-core-slr.js',
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/pwa/install.js'
  ]);
  vm.runInContext(isrc, w.sb, { filename: 'install.js#engaged' });
  var ev = { type: 'beforeinstallprompt', preventDefault: function () {},
    prompt: function () {}, userChoice: { then: function () {} } };
  w.sb.fire('beforeinstallprompt', ev);
  w.sb.document.fire('pf-vote-cast');
  if (w.buttons().length === 1) ok('Android engaged visitor: held prompt surfaces after engagement');
  else no('Android engaged visitor: held prompt surfaces after engagement', 'found ' + w.buttons().length);
})();

/* --- 6d. Android 2nd-visit: gate opens without engagement --- */
(function () {
  var w = makeWorld(ANDROID_UA, [
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/core/bundle-core-slr.js',
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/pwa/install.js'
  ]);
  w.sb.localStorage.setItem('pf_pwa_visits_v1', '2');
  vm.runInContext(isrc, w.sb, { filename: 'install.js#2ndvisit' });
  var ev = { type: 'beforeinstallprompt', preventDefault: function () {},
    prompt: function () {}, userChoice: { then: function () {} } };
  w.sb.fire('beforeinstallprompt', ev);
  if (w.buttons().length === 1) ok('Android 2nd visit: prompt surfaces without engagement');
  else no('Android 2nd visit: prompt surfaces without engagement', 'found ' + w.buttons().length);
})();

/* --- 6e. X tap: 7-day snooze blocks the prompt across boots --- */
(function () {
  var scripts = [
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/core/bundle-core-slr.js',
    'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@x/v1.4.3/pwa/install.js'
  ];
  var w = makeWorld(ANDROID_UA, scripts);
  w.sb.localStorage.setItem('pf_pwa_visits_v1', '2');
  vm.runInContext(isrc, w.sb, { filename: 'install.js#snooze1' });
  var ev = { type: 'beforeinstallprompt', preventDefault: function () {},
    prompt: function () {}, userChoice: { then: function () {} } };
  w.sb.fire('beforeinstallprompt', ev);
  var btn = w.buttons()[0];
  function findX(root) {
    var found = null;
    w.walk(root, function (n) { if (n.id === 'pf-pwa-x') found = n; });
    return found;
  }
  var x = findX(btn);
  btn.dispatchEvent({ type: 'click', target: x, bubbles: true });
  var snooze = Number(w.sb.localStorage.getItem('pf_pwa_snooze_v1') || 0);
  if (snooze > Date.now()) ok('X tap sets a future 7-day snooze');
  else no('X tap sets a future 7-day snooze', 'snooze=' + snooze);
  /* Reboot with the snooze persisted (new world, same localStorage values). */
  var w2 = makeWorld(ANDROID_UA, scripts);
  w2.sb.localStorage.setItem('pf_pwa_visits_v1', '3');
  w2.sb.localStorage.setItem('pf_pwa_snooze_v1', String(Date.now() + 7 * 864e5));
  vm.runInContext(isrc, w2.sb, { filename: 'install.js#snooze2' });
  w2.sb.fire('beforeinstallprompt', ev);
  if (w2.buttons().length === 0) ok('snoozed visitor: no prompt even with gate open');
  else no('snoozed visitor: no prompt even with gate open', 'button shown during snooze');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
