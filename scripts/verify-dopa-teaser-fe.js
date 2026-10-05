#!/usr/bin/env node
/* scripts/verify-dopa-teaser-fe.js — Dopa (Daily Fire) anonymous-teaser
   verification harness (Phase 3 #9, 2026-10-05). Run from the worktree root:
     node scripts/verify-dopa-teaser-fe.js
   AFTER rebuilding game bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Strategy: vm + DOM-stub harness evaluating the REAL inner <script> from
   v1.4.3/games/dopamine.js (the template-staged silo script), with JSONP
   intercepted at document.createElement('script').src and canned backend
   responses per action.
   Covers:
     A. anonymous + live data  -> teaser renders: crate pane, live flash row
        (real data: label/multiplier/countdown), war-word bounty, claim CTA;
        no gate card, no redeem box, no OPEN THE CRATE.
     B. anonymous + no data    -> honest mechanic preview: quiet-wire notes,
        mechanic copy, claim CTA; no fake loot promised (no +N XP anywhere).
     C. callsign present       -> 100% unchanged: byte-identical #xDopa HTML
        vs the pre-teaser version (git HEAD) under identical canned data.
     D. kill switch            -> PF.skip("dopa")==true stages nothing;
        false stages the template exactly once.
     E. static contract        -> node --check, bundle-sec1.js carries the
        teaser, kill strings present, esc() on flash labels, no post() (writes)
        in teaser functions, no banned terms, no xpGrant. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'games', 'dopamine.js');
var BUNDLE_SEC1 = path.join(ROOT, 'v1.4.3', 'games', 'bundle-sec1.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(s, sub) { return s.indexOf(sub) !== -1; }

function innerScript(src) {
  var opens = src.split('<script>').length - 1;
  if (opens !== 1) throw new Error('expected exactly 1 <script> in ' + MOD + ', found ' + opens);
  var start = src.indexOf('<script>') + '<script>'.length;
  var closeIdx = src.indexOf('</scr', start);
  if (closeIdx === -1) throw new Error('inner </scr`+`ipt> not found');
  return src.slice(start, closeIdx); /* inner IIFE source, closing tag excluded */
}

var NEW_SRC = read(MOD);
var INNER = innerScript(NEW_SRC);
var OLD_SRC = cp.execSync('git -C ' + ROOT + ' show HEAD:v1.4.3/games/dopamine.js', { encoding: 'utf8' });
var OLD_INNER = innerScript(OLD_SRC);

/* ---------- DOM stub ---------- */
function makeSandbox(opts) {
  var elements = {};
  var headCss = [];
  function registerIds(html) {
    var re = /id="([^"]+)"/g, m;
    while ((m = re.exec(String(html)))) {
      if (!elements[m[1]]) elements[m[1]] = makeEl(m[1]);
    }
  }
  function makeEl(id) {
    var el = {
      id: id, textContent: '', value: '', style: {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      setAttribute: function () {}, getAttribute: function () { return null; },
      appendChild: function () {}, removeChild: function () {}, remove: function () {},
      addEventListener: function () {}, querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      closest: function () { return null; }, click: function () {}, focus: function () {},
      onclick: null, disabled: false
    };
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._h || ''; },
      set: function (v) { this._h = String(v); registerIds(this._h); },
      configurable: true
    });
    return el;
  }
  elements['xDopa'] = makeEl('xDopa');

  function canned(action) {
    switch (action) {
      case 'flash_list': return opts.flashResp;
      case 'warword_status': return opts.wwResp;
      case 'dopamine_status': return opts.dopaStatusResp;
      case 'loot_history': return opts.lootHistResp;
      case 'combo_status': return opts.comboResp;
      case 'comeback_check': return { ok: false };
      default: return { ok: false, err: 'stub: unknown action ' + action };
    }
  }
  var staged = 0;
  var doc = {
    getElementById: function (id) { return elements[id] || null; },
    createElement: function (tag) {
      if (String(tag).toLowerCase() === 'script') {
        var s = makeEl('script');
        var _src = '';
        Object.defineProperty(s, 'src', {
          get: function () { return _src; },
          set: function (v) {
            _src = String(v);
            var m1 = /[?&]action=([^&]*)/.exec(_src), m2 = /[?&]callback=([^&]*)/.exec(_src);
            var action = m1 ? decodeURIComponent(m1[1]) : '';
            var fn = m2 ? decodeURIComponent(m2[1]) : '';
            var resp = canned(action);
            if (fn && typeof win[fn] === 'function') { try { win[fn](resp); } catch (e) {} }
          },
          configurable: true
        });
        s.onerror = null;
        return s;
      }
      return makeEl(String(tag));
    },
    head: null, body: null,
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    hidden: function () { return false; }
  };
  doc.head = makeEl('head');
  doc.head.appendChild = function (el) {
    if (el && el.id) { elements[el.id] = el; headCss.push(el.id); }
  };
  doc.body = makeEl('body');
  doc.body.appendChild = function (el) { if (el && el.id && !elements[el.id]) elements[el.id] = el; };

  var lsStore = {};
  var ls = {
    getItem: function (k) { return (k in lsStore) ? lsStore[k] : null; },
    setItem: function (k, v) { lsStore[k] = String(v); },
    removeItem: function (k) { delete lsStore[k]; }
  };
  var PF = {
    skip: function (id) { return id === 'dopa' ? !!opts.skipDopa : false; },
    holder: function () {
      return { insertAdjacentHTML: function () { staged++; } };
    },
    gateHTML: function (msg) { return '<div class="c-gate">' + msg + '</div>'; },
    errCopy: function (j, fb) { return fb; },
    toast: function () {},
    hidden: function () { return false; }
  };
  var win = {
    PF: PF,
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    PFCallsign: function () { return opts.callsign || ''; },
    PFDeviceId: function () { return 'dev-stub-1'; },
    navigator: { userAgent: 'node-stub' }
  };
  var sandbox = {
    window: win, document: doc, localStorage: ls,
    PF: PF, /* bare-PF references (window globals in the browser) */
    navigator: win.navigator,
    setInterval: function () { return 0; },
    setTimeout: function () { return 0; },
    console: console
  };
  vm.createContext(sandbox);
  return { sandbox: sandbox, win: win, doc: doc, elements: elements,
    xDopa: function () { return elements['xDopa'].innerHTML; },
    staged: function () { return staged; },
    hasCss: function (id) { return headCss.indexOf(id) !== -1; } };
}

function runInner(inner, opts) {
  var sb = makeSandbox(opts);
  vm.runInContext(inner, sb.sandbox, { filename: 'dopamine-inner.js' });
  return sb;
}
function runOuter(src, opts) {
  var sb = makeSandbox(opts);
  vm.runInContext(src, sb.sandbox, { filename: 'dopamine-outer.js' });
  return sb;
}

var NOW = Date.now();
var LIVE_FLASH = { ok: true, events: [
  { active: true, multiplier: 3, title: 'Midnight Raid', ends_at: NOW + 3600000 },
  { active: false, multiplier: 2, title: 'Old Flash', ends_at: NOW - 7200000 }
] };
var QUIET_FLASH = { ok: true, events: [] };
var LIVE_WW = { ok: true, active: true, episode: 'Ep 12', xp_amount: 50, claimed: false };
var QUIET_WW = { ok: true, active: false, claimed: false };
var GATED = { ok: false, err: 'missing credentials' };
var FULL_ST = { ok: true,
  loot: { claimed_today: false, next_reset_in: '6h' },
  streak: { count: 5, at_risk: false, longest: 9 },
  flash: [{ id: 'f1', label: 'Raid', multiplier: 2, ends_at: NOW + 7200000 }],
  combo: { count: 3, multiplier: 1.5 },
  records: { best_day_xp: 120, longest_streak: 9 },
  nearrank: { position: 42, above: { callsign: 'ABC', xp_gap: 10 }, below: { callsign: 'DEF', xp_gap: 5 } } };

console.log('== A. anonymous + live data -> teaser ==');
(function () {
  var sb = runInner(INNER, { callsign: '', flashResp: LIVE_FLASH, wwResp: LIVE_WW,
    dopaStatusResp: GATED, lootHistResp: { ok: false }, comboResp: { ok: false } });
  var h = sb.xDopa();
  if (has(h, 'TODAY&rsquo;S CRATE')) ok('crate pane headline'); else no('crate pane headline', 'missing');
  if (has(h, 'data-pf-claim-cs="1"') && has(h, 'CLAIM YOUR CALLSIGN')) ok('claim CTA with in-place claim button'); else no('claim CTA with in-place claim button', 'data-pf-claim-cs button missing');
  var fl = sb.elements['dpTeaseFlash'] ? sb.elements['dpTeaseFlash'].innerHTML : '';
  if (has(fl, 'dp-flash') && has(fl, '3X XP') && has(fl, 'Midnight Raid')) ok('live flash row with real data'); else no('live flash row with real data', 'got: ' + fl.slice(0, 160));
  if (has(fl, 'data-until="')) ok('flash countdown data-until present'); else no('flash countdown data-until present', 'missing');
  if (!has(fl, 'Old Flash')) ok('only active flashes shown'); else no('only active flashes shown', 'inactive event leaked in');
  var ww = sb.elements['dpTeaseWW'] ? sb.elements['dpTeaseWW'].innerHTML : '';
  if (has(ww, '+50 XP') && has(ww, 'Ep 12') && has(ww, 'LISTEN TO THE PODCAST')) ok('war-word bounty live with real XP + episode'); else no('war-word bounty live with real XP + episode', 'got: ' + ww.slice(0, 160));
  if (has(h, 'DETONATION STREAK') && has(h, 'dp-flame')) ok('streak glimpse pane'); else no('streak glimpse pane', 'missing');
  if (!has(h, 'c-gate') && !has(h, 'runs on callsigns')) ok('no gate card'); else no('no gate card', 'gate copy still present');
  if (!has(h, 'dpWarWordInput')) ok('no redeem box for anonymous'); else no('no redeem box for anonymous', 'redeem input leaked');
  if (!has(h, 'OPEN THE CRATE')) ok('no crate-open button for anonymous'); else no('no crate-open button for anonymous', 'OPEN THE CRATE present');
  if (sb.hasCss('pf-dopa-css')) ok('dopa CSS injected for teaser'); else no('dopa CSS injected for teaser', 'pf-dopa-css missing');
})();

console.log('== B. anonymous + no data -> honest mechanic preview ==');
(function () {
  var sb = runInner(INNER, { callsign: '', flashResp: QUIET_FLASH, wwResp: QUIET_WW,
    dopaStatusResp: GATED, lootHistResp: { ok: false }, comboResp: { ok: false } });
  var h = sb.xDopa();
  var fl = sb.elements['dpTeaseFlash'] ? sb.elements['dpTeaseFlash'].innerHTML : '';
  var ww = sb.elements['dpTeaseWW'] ? sb.elements['dpTeaseWW'].innerHTML : '';
  if (has(fl, 'No flash event live right now')) ok('honest flash quiet note'); else no('honest flash quiet note', 'got: ' + fl.slice(0, 120));
  if (has(ww, 'bounty wire is quiet')) ok('honest war-word quiet note'); else no('honest war-word quiet note', 'got: ' + ww.slice(0, 120));
  if (has(h, 'One free supply crate every day') && has(h, 'Common to Legendary')) ok('crate mechanic described, no fake contents'); else no('crate mechanic described, no fake contents', 'mechanic copy missing');
  if (has(h, 'data-pf-claim-cs="1"')) ok('claim CTA present in preview'); else no('claim CTA present in preview', 'missing');
  if (!/\+\d+\s*XP/.test(h)) ok('no fake loot promised (no +N XP anywhere)'); else no('no fake loot promised (no +N XP anywhere)', 'found an XP promise in the preview');
  if (!has(h, 'c-gate')) ok('no gate card in preview'); else no('no gate card in preview', 'gate copy present');
})();

console.log('== C. callsign present -> widget 100% unchanged vs HEAD ==');
(function () {
  var opts = { callsign: 'TESTCS', flashResp: QUIET_FLASH, wwResp: QUIET_WW,
    dopaStatusResp: FULL_ST, lootHistResp: { ok: true, history: [] },
    comboResp: { ok: true, multiplier: 1, combo_count: 0 } };
  var sbNew = runInner(INNER, opts);
  var sbOld = runInner(OLD_INNER, opts);
  var hn = sbNew.xDopa(), ho = sbOld.xDopa();
  if (has(hn, 'OPEN THE CRATE') && has(hn, 'CHECK IN') && has(hn, 'War-word bounty')) ok('enlisted widget panes render'); else no('enlisted widget panes render', hn.slice(0, 200));
  if (!has(hn, 'TODAY&rsquo;S CRATE') && !has(hn, 'dpTeaseFlash')) ok('no teaser panes when enlisted'); else no('no teaser panes when enlisted', 'teaser leaked into enlisted render');
  if (hn === ho) ok('byte-identical render vs pre-teaser HEAD'); else {
    no('byte-identical render vs pre-teaser HEAD', 'outputs differ (new len ' + hn.length + ', old len ' + ho.length + ')');
  }
})();

console.log('== D. kill switch ==');
(function () {
  var sbOff = runOuter(NEW_SRC, { skipDopa: true, callsign: '', flashResp: QUIET_FLASH, wwResp: QUIET_WW,
    dopaStatusResp: GATED, lootHistResp: { ok: false }, comboResp: { ok: false } });
  if (sbOff.staged() === 0) ok('PF.skip("dopa")==true stages nothing'); else no('PF.skip("dopa")==true stages nothing', 'staged ' + sbOff.staged() + ' time(s)');
  var sbOn = runOuter(NEW_SRC, { skipDopa: false, callsign: '', flashResp: QUIET_FLASH, wwResp: QUIET_WW,
    dopaStatusResp: GATED, lootHistResp: { ok: false }, comboResp: { ok: false } });
  if (sbOn.staged() === 1) ok('PF.skip("dopa")==false stages template once'); else no('PF.skip("dopa")==false stages template once', 'staged ' + sbOn.staged() + ' time(s)');
})();

console.log('== E. static contract ==');
(function () {
  [['node --check dopamine.js', 'node --check ' + MOD],
   ['node --check verify script', 'node --check ' + path.join(__dirname, 'verify-dopa-teaser-fe.js')]
  ].forEach(function (pair) {
    try { cp.execSync(pair[1], { stdio: 'pipe' }); ok(pair[0]); }
    catch (e) { no(pair[0], 'syntax check failed'); }
  });
  if (has(NEW_SRC, 'PF.skip("dopa")') && has(NEW_SRC, '?pf_off=dopa')) ok('kill switch ?pf_off=dopa present'); else no('kill switch ?pf_off=dopa present', 'missing');
  try {
    var b = read(BUNDLE_SEC1);
    if (has(b, 'dpTeaseFlash')) ok('bundle-sec1.js carries the teaser (rebuilt)'); else no('bundle-sec1.js carries the teaser (rebuilt)', 'run: node build/bundle.js');
  } catch (e) { no('bundle-sec1.js carries the teaser (rebuilt)', e.message); }
  var teaserCode = NEW_SRC.slice(NEW_SRC.indexOf('function renderTeaser'), NEW_SRC.indexOf('function renderWarWord'));
  if (teaserCode.length < 500) { no('teaser code slice', 'slice too short — marker drift'); }
  else { ok('teaser code slice'); }
  if (has(teaserCode, 'esc(f.label||f.title')) ok('flash labels escaped'); else no('flash labels escaped', 'esc() not applied');
  if (!/[^a-zA-Z]post\(/.test(teaserCode)) ok('teaser does reads only (no post() writes)'); else no('teaser does reads only (no post() writes)', 'post() found in teaser code');
  if (!has(teaserCode, 'xpGrant')) ok('no new XP mechanics (teaser adds none)'); else no('no new XP mechanics (teaser adds none)', 'xpGrant referenced in teaser');
  if (!/\bdonat/i.test(NEW_SRC)) ok('no banned terms (donate family)'); else no('no banned terms (donate family)', 'found');
  if (has(NEW_SRC, 'PF.gateHTML') === false || has(NEW_SRC, "gateHTML('Daily Fire runs on callsigns.'") === false) ok('dead gate card removed'); else no('dead gate card removed', 'old gate line still present');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
