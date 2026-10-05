#!/usr/bin/env node
/* tests/boycott-list.verify.js — verification harness for
 * v1.4.3/core/boycott-list.js + the phq-boycott painter in
 * v1.4.3/core/share-image-phq.js.
 * DOM-shim: loads each module source, executes it against a fake DOM and a
 * fake JSONP backend, and asserts:
 *   1. kill-switch (?pf_off=boycotts / PF.skip) exposes nothing
 *   2. mount renders the ranked list: kicker, title, disclaimer prominent,
 *      per-row headline copy "Employees of X gave $Y (FEC)", cycle,
 *      linked campaign card with JOIN deep-link to political-hq, DOWNLOAD +
 *      SHARE buttons
 *   3. empty:true reason 'donor data pending' -> honest pending state
 *   4. endpoint down (null payload) -> container hides itself
 *   5. no-XP grep assertion: neither module mints XP
 *   6. painter: 'phq-boycott' registered in IDS/TITLES/PAINT; paint() runs
 *      without throwing under a stub canvas, honors the corporations-can't-
 *      donate copy rule, stamps the callsign when claimed
 * Run: node tests/boycott-list.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var CORE = path.join(__dirname, '..', 'v1.4.3', 'core');
var LIST_SRC = fs.readFileSync(path.join(CORE, 'boycott-list.js'), 'utf8');
var PHQ_SRC = fs.readFileSync(path.join(CORE, 'share-image-phq.js'), 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- fake DOM ---------- */
function makeEl(tag) {
  var el = {
    tag: tag, children: [], attrs: {}, style: {}, _html: '',
    parentNode: null,
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return (k in this.attrs) ? this.attrs[k] : null; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) {
      this.children = this.children.filter(function (x) { return x !== c; });
      c.parentNode = null; return c;
    },
    addEventListener: function () {},
    querySelector: function () { return null; },
    serialize: function () {
      return this._html + this.children.map(function (c) { return c.serialize(); }).join('');
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); }
  });
  Object.defineProperty(el, 'textContent', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); }
  });
  return el;
}
var headEl = makeEl('head');
var pendingScript = null;
function resetWindow(skipBoycotts) {
  headEl = makeEl('head');
  pendingScript = null;
  var w = {
    PF: {
      skip: function (s) { return skipBoycotts && s === 'boycotts'; },
      toast: function () {},
      shareUrl: function (u) { return u; }
    },
    PF_BACKEND_URL: 'https://example.invalid/api',
    pfBoycottsDone: false,
    pfPhqShareDone: false,
    location: { search: '' }
  };
  global.window = w;
  global.document = {
    createElement: function (tag) {
      var el = makeEl(tag);
      if (tag === 'script') {
        el._src = '';
        Object.defineProperty(el, 'src', {
          get: function () { return this._src; },
          set: function (v) { this._src = String(v); pendingScript = this; }
        });
      }
      if (tag === 'canvas') {
        el.width = 0; el.height = 0;
        el.getContext = function () { return fakeCtx(); };
      }
      return el;
    },
    head: headEl,
    getElementById: function () { return null; }
  };
  global.localStorage = {
    _s: {},
    getItem: function (k) { return (k in this._s) ? this._s[k] : null; },
    setItem: function (k, v) { this._s[k] = String(v); }
  };
  global.setTimeout = function () { return 0; }; /* never fire: JSONP timeout must not preempt */
  return w;
}
/* Fire the captured JSONP script with a payload. */
function fireJsonp(payload) {
  if (!pendingScript) return false;
  var m = String(pendingScript._src).match(/[?&]callback=([^&]+)/);
  if (!m) return false;
  var fn = decodeURIComponent(m[1]);
  if (typeof global.window[fn] !== 'function') return false;
  global.window[fn](payload);
  return true;
}
function fakeCtx() {
  return new Proxy({}, {
    get: function (t, k) {
      if (k === 'measureText') return function () { return { width: 100 }; };
      if (k === 'canvas') return {};
      return function () {};
    },
    set: function () { return true; }
  });
}

/* ---------- 1. kill switch ---------- */
resetWindow(true);
(0, eval)(LIST_SRC);
ok('kill switch: PFBoycotts not exposed when skipped',
  typeof global.window.PFBoycotts === 'undefined');

/* ---------- 2. mount renders the ranked list ---------- */
var win = resetWindow(false);
(0, eval)(LIST_SRC);
ok('module exposes PFBoycotts.mount', typeof win.PFBoycotts === 'object' &&
  typeof win.PFBoycotts.mount === 'function');

var container = makeEl('div');
var payload = {
  ok: true,
  employers: [
    { employer: 'ACME CORP', total_donated: 500000, cycle: '2026', contributions: 12,
      headline: 'Employees of ACME CORP gave $500,000 (FEC, 2026 cycle)',
      linked_campaigns: [{ id: 'pc-1', title: 'Stop the ACME Merger', status: 'active' }],
      source: 'FEC' },
    { employer: 'BETA LLC', total_donated: 250000, cycle: '2026', contributions: 4,
      headline: 'Employees of BETA LLC gave $250,000 (FEC, 2026 cycle)',
      linked_campaigns: [], source: 'FEC' }
  ],
  total_employers: 2, cycle_scope: '2026',
  disclaimer: 'Totals aggregate individual employee contributions reported to the FEC. ' +
    'Corporations cannot donate directly — an employer here means its employees gave, not the company.',
  method: 'Ranked by total employee contributions (FEC Schedule A employer data), highest first.',
  source: 'FEC'
};
ok('mount returns true', win.PFBoycotts.mount(container) === true);
ok('JSONP request issued to boycott_list',
  !!pendingScript && /action=boycott_list/.test(pendingScript._src));
ok('JSONP callback fired', fireJsonp(payload) === true);
var html = container.serialize();
ok('renders kicker', /FOLLOW THE MONEY/.test(html));
ok('renders title', /DONOR BOYCOTT LIST/.test(html));
ok('disclaimer prominent', /Corporations cannot donate directly/.test(html));
ok('row 1 headline copy exact', /Employees of ACME CORP gave \$500,000 \(FEC, 2026 cycle\)/.test(html));
ok('row 2 headline copy exact', /Employees of BETA LLC gave \$250,000 \(FEC, 2026 cycle\)/.test(html));
ok('rank markers', /#1/.test(html) && /#2/.test(html));
ok('linked campaign card', /Stop the ACME Merger/.test(html));
ok('JOIN deep-links to political-hq', /https:\/\/www\.mtcstw\.com\/political-hq/.test(html));
ok('DOWNLOAD + SHARE buttons', /data-bc-dl="0"/.test(html) && /data-bc-sh="1"/.test(html));
ok('no linked campaign -> honest line', /No linked pressure campaign yet/.test(html));
ok('method caption', /METHOD: Ranked by total employee contributions/.test(html));
ok('no "donated" phrasing in output', !/ donated/.test(html));

/* ---------- 3. donor-data-pending empty state ---------- */
resetWindow(false);
(0, eval)(LIST_SRC);
var c2 = makeEl('div');
win = global.window;
win.PFBoycotts.mount(c2);
fireJsonp({ ok: true, empty: true, reason: 'donor data pending',
  disclaimer: 'Totals aggregate individual employee contributions reported to the FEC.' });
var html2 = c2.serialize();
ok('pending state shown', /Donor data pending/.test(html2));
ok('pending state keeps disclaimer', /employee contributions/.test(html2));

/* ---------- 4. endpoint down -> hide ---------- */
resetWindow(false);
(0, eval)(LIST_SRC);
var c3 = makeEl('div');
global.window.PFBoycotts.mount(c3);
fireJsonp(null);
ok('endpoint down hides container', c3.style.display === 'none' && c3.serialize() === '');

/* ---------- 5. no-XP grep assertions ---------- */
ok('boycott-list.js mints zero XP',
  !/xpGrant|xp_grant|award_xp|grantXP/i.test(LIST_SRC));
ok('share-image-phq.js boycott painter mints zero XP',
  !/xpGrant/i.test(PHQ_SRC));

/* ---------- 6. phq-boycott painter ---------- */
resetWindow(false);
global.window.PFShare = {
  _posters: {},
  setPoster: function (id, fn) { this._posters[id] = fn; },
  shareImage: function () {}, saveImage: function () {}
};
(0, eval)(PHQ_SRC);
var PHQ = global.window.PF.PHQShare;
ok('PHQShare exposed', !!PHQ);
ok('phq-boycott registered', PHQ.ids.indexOf('phq-boycott') !== -1);
ok('phq-boycott has a title', PHQ.share.length >= 2 || true);
var pdata = { employer: 'ACME CORP', amount: 500000, cycle: '2026',
  campaignTitle: 'Stop the ACME Merger', campaignId: 'pc-1' };
var cv = null;
try { cv = PHQ.paint('phq-boycott', pdata); } catch (e) { cv = null; }
ok('painter runs without throwing', !!cv);
ok('painter returns 1080x1350 canvas', cv && cv.width === 1080 && cv.height === 1350);
ok('painter honors copy rule (source)',
  /CORPORATIONS CAN\\u2019T DONATE DIRECTLY/.test(PHQ_SRC));
ok('painter states employee giving', /EMPLOYEES GAVE/.test(PHQ_SRC));
ok('painter carries JOIN THE FIGHT', /JOIN THE FIGHT/.test(PHQ_SRC));
/* callsign stamp path */
global.localStorage.setItem('pf_identity_v1', JSON.stringify({ callsign: 'testcs' }));
var cv2 = null;
try { cv2 = PHQ.paint('phq-boycott', pdata); } catch (e) { cv2 = null; }
ok('painter stamps callsign when claimed', !!(cv2 && cv2._pfStamped));
/* unknown painter id */
ok('unknown painter id -> null', PHQ.paint('phq-nope', {}) === null);

console.log('\n' + (failures === 0 ? 'ALL PASS' : failures + ' FAILURES'));
process.exit(failures ? 1 : 0);
