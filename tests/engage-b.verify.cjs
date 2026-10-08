#!/usr/bin/env node
/* tests/engage-b.verify.cjs — Engagement Build-B (2026-10-05, items #9/#10) frontend verification.
   Run from the repo root:
     node tests/engage-b.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      IIFE + PF guard + kill switches, template ids, hook_list/quest_list
      read rails, hooks POST (h_action/hook_checkin) + streak_checkin for the
      quest on-site step, QUEST_XP=10 config constant, creditLocal key +
      pf-xp mirror + pf-order-checkin tally settle on quest claim, PFShare
      callsign stamp + JOIN THE FIGHT on share images, honest copy
      (self-reported/0 XP platform steps, never "verified" for them;
      never "donate", never Shane), home-v2 ORDER + SILO_SEC ACT mounts,
      bundle-home registration.
   3. Mocked-browser runtime tests (vm + DOM stub, JSONP intercepted):
      hooks render from fixture; TikTok check-in POSTs hooks/hook_checkin
      (auth-gated) and handles ok/dup; Substack card has NO check-in button
      (read flow owns the +5); kill switch suppresses mount; quests render
      with self-reported 0-XP steps; on-site check-in POSTs
      streak:streak_checkin; claim writes creditLocal('dochall_quest_<id>',10)
      and dispatches pf-xp {gain:10, key} + pf-order-checkin.
   Fixture values are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var HOOKS = path.join(ROOT, 'v1.4.3', 'games', 'platform-hooks.js');
var QUESTS = path.join(ROOT, 'v1.4.3', 'games', 'quests.js');
var HOME = path.join(ROOT, 'v1.4.3', 'pages', 'home-v2.js');
var BC = path.join(ROOT, 'build', 'bundle.js');
var BH = path.join(ROOT, 'v1.4.3', 'games', 'bundle-home.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles (bundle-home carries both modules) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle.js ran clean');
} catch (e) { no('build/bundle.js', 'rebuild failed: ' + (e && e.message)); }
/* bundle-sec1.js carries pre-existing source drift from another branch (not
   ours) — restore it so this branch stays drive-by-free (fred-economy
   convention). */
try { cp.execSync('git checkout -- v1.4.3/games/bundle-sec1.js', { cwd: ROOT, stdio: 'pipe' }); }
catch (e) { /* not a git checkout context; ignore */ }
var bhSrc = read(BH);
if (bhSrc.indexOf('pf-ov-hooks') !== -1 && bhSrc.indexOf('pf-ov-quests') !== -1) {
  ok('bundle-home.js carries platform-hooks.js + quests.js');
} else { no('bundle-home.js', 'new silos missing after rebuild'); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[HOOKS, QUESTS, HOME, BC].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var hks = read(HOOKS), hkc = stripComments(hks);
var qs = read(QUESTS), qsc = stripComments(qs);
var home = read(HOME), homec = stripComments(home);
var bcsrc = read(BC);

/* ============ 2. static checks ============ */
console.log('== 2. static checks ==');
function has(n, re, srcOverride) { if (re.test(srcOverride || hkc)) ok(n); else no(n, 'pattern missing: ' + re); }
function hasNot(n, re, srcOverride) { if (!re.test(srcOverride || hkc)) ok(n); else no(n, 'banned pattern present: ' + re); }
function qhas(n, re) { if (re.test(qsc)) ok(n); else no(n, 'pattern missing: ' + re); }
function qhasNot(n, re) { if (!re.test(qsc)) ok(n); else no(n, 'banned pattern present: ' + re); }

/* platform-hooks.js */
has('hooks: IIFE + use strict', /\(function \(\) \{\s*'use strict';/);
has('hooks: kill switch', /PF\.skip\("platform-hooks"\)/);
has('hooks: template id pf-ov-hooks', /<template id="pf-ov-hooks">/);
has('hooks: inner script closed split', /<\/scr`\+`ipt>/);
has('hooks: public read rail hook_list', /api\("hook_list"/);
has('hooks: auth-gated POST hooks/hook_checkin', /post\("hooks","h_action","hook_checkin"/);
has('hooks: hook_id in POST body', /hook_id:hook\.id/);
has('hooks: dup copy (cross-posting pays once)', /cross-posting pays once/);
has('hooks: Substack fires no check-in (read flow owns +5)', /\+5 IN THE READ FLOW/);
hasNot('hooks: no direct xpGrant (existing legs only)', /xpGrant/);
has('hooks: esc() on rendered fields', /function esc\(s\)/);
has('hooks: PFShare callsign stamp', /PFShare\.stampCallsign/);
has('hooks: JOIN THE FIGHT standard on share image', /JOIN THE FIGHT\./);
hasNot('hooks: never "donate"', /donate/i);
hasNot('hooks: never names Shane', /shane/i);
has('hooks: reconnect hint for missing credentials', /re-claim it in Enlistment Ranks/);

/* quests.js */
qhas('quests: IIFE + use strict', /\(function \(\) \{\s*'use strict';/);
qhas('quests: kill switch', /PF\.skip\("quests"\)/);
qhas('quests: template id pf-ov-quests', /<template id="pf-ov-quests">/);
qhas('quests: inner script closed split', /<\/scr`\+`ipt>/);
qhas('quests: public read rail quest_list', /api\("quest_list"/);
qhas('quests: QUEST_XP=10 config constant', /var QUEST_XP=10/);
qhas('quests: on-site step fires existing streak_checkin', /post\("streak","str_action","streak_checkin"/);
qhas('quests: claim writes creditLocal dochall_quest_ +10', /creditLocal\(key,QUEST_XP\)/);
qhas('quests: claim dispatches pf-xp with dochall_quest_ key', /new CustomEvent\("pf-xp",\{detail:\{gain:QUEST_XP,key:key/);
qhas('quests: claim settles pf-order-checkin tally', /new CustomEvent\("pf-order-checkin"/);
qhas('quests: honest platform-step copy (self-reported, 0 XP)', /self-reported · 0 XP/);
qhas('quests: honest binding copy (can\u2019t verify the platform side)', /can\\u2019t verify/);
qhasNot('quests: platform steps never claim verification', /platform[^.]{0,80}verified|verified[^.]{0,80}platform step/i);
qhasNot('quests: never "donate"', /donate/i);
qhasNot('quests: never names Shane', /shane/i);
qhas('quests: PFShare callsign stamp on completion image', /PFShare\.stampCallsign/);
qhas('quests: JOIN THE FIGHT standard on completion image', /JOIN THE FIGHT\./);
qhas('quests: one claim per quest per callsign', /one claim per quest per callsign/i);

/* home-v2.js mounts */
if (/\['platform-hooks', 'pf-ov-hooks'\]/.test(homec)) ok('home-v2: ORDER platform-hooks'); else no('home-v2: ORDER platform-hooks', 'missing');
if (/\['quests', 'pf-ov-quests'\]/.test(homec)) ok('home-v2: ORDER quests'); else no('home-v2: ORDER quests', 'missing');
if (/'platform-hooks':'act'/.test(homec)) ok('home-v2: SILO_SEC platform-hooks->act'); else no('home-v2: SILO_SEC platform-hooks', 'missing');
if (/'quests':'act'/.test(homec)) ok('home-v2: SILO_SEC quests->act'); else no('home-v2: SILO_SEC quests', 'missing');

/* bundle registration */
if (/'platform-hooks\.js'/.test(bcsrc)) ok('bundle.js: platform-hooks.js registered'); else no('bundle.js', 'platform-hooks.js missing');
if (/'quests\.js'/.test(bcsrc)) ok('bundle.js: quests.js registered'); else no('bundle.js', 'quests.js missing');

/* ============ 3. mocked-browser runtime tests ============ */
console.log('== 3. runtime (vm + DOM stub) ==');

/* Extract the inner <script> body from the template (outer IIFE only stages
   the template; the inner script is what renders). */
function innerScript(src) {
  var m = /<script>\n([\s\S]*?)<\/scr`\+`ipt>/.exec(src);
  if (!m) throw new Error('inner script not found');
  return m[1];
}

var FIX = {
  hook_list: {
    ok: true,
    hooks: [
      { id: 'tiktok_challenge', platform: 'tiktok', title: 'Test Challenge',
        desc: 'Post the test challenge.', platform_url: null },
      { id: 'substack_deepdive', platform: 'substack', title: 'Test Deep Dive',
        desc: 'Read the test deep dive.', platform_url: null }
    ]
  },
  quest_list: {
    ok: true, quest_xp: 10,
    quests: [
      { id: 'q_alpha', title: 'Alpha Quest', desc: 'Do the alpha.',
        platform_steps: [{ label: 'Step one on TikTok' }, { label: 'Step two on IG' }],
        onsite: { label: 'Check in on site.', xp: 10 } },
      { id: 'q_beta', title: 'Beta Quest', desc: 'Do the beta.',
        platform_steps: [{ label: 'Step one on X' }, { label: 'Step two on FB' }],
        onsite: { label: 'Check in on site.', xp: 10 } }
    ]
  }
};

function runSandbox(modSrc, opts) {
  opts = opts || {};
  var killed = opts.killed || [];
  var fix = opts.fix || FIX;
  var posts = [];        /* captured PF.authPost bodies */
  var postCb = {};       /* per-test response override */
  var events = [];       /* captured document.dispatchEvent */
  var toasts = [];
  var creditLocalCalls = [];
  var store = {};
  var mounted = false;
  var bodies = [];
  var bySel = {};        /* querySelector registry */

  function mockBtn() {
    return { disabled: false, textContent: '', _html: '', _txt: '',
      onclick: null, onchange: null,
      set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
      set textContent(v) { this._txt = String(v); }, get textContent() { return this._txt; },
      click: function () { if (this.onclick) this.onclick(); } };
  }
  function mountEl(id) {
    var el = { _html: '', _id: id,
      set innerHTML(v) { this._html = String(v); bodies.push(this._html); },
      get innerHTML() { return this._html; },
      querySelector: function (sel) {
        if (!bySel[sel]) bySel[sel] = mockBtn();
        return bySel[sel];
      }
    };
    return el;
  }
  var mounts = { xHooks: mountEl('xHooks'), xQuests: mountEl('xQuests') };

  function scriptEl() {
    var el = { _src: '', onerror: null, parentNode: null };
    Object.defineProperty(el, 'src', {
      get: function () { return this._src; },
      set: function (v) {
        this._src = String(v);
        var m = /[?&]action=([^&]+)/.exec(this._src);
        var c = /[?&]callback=([^&]+)/.exec(this._src);
        var action = m ? decodeURIComponent(m[1]) : '';
        var cb = c ? c[1] : '';
        var fj = Object.prototype.hasOwnProperty.call(fix, action) ? fix[action] : null;
        if (cb && sandbox.window[cb]) { try { sandbox.window[cb](fj); } catch (e) { throw e; } }
      }
    });
    return el;
  }
  function canvasEl() {
    var ctx = new Proxy({}, { get: function (t, k) {
      if (k === 'measureText') return function () { return { width: 10 }; };
      return function () {};
    }, set: function () { return true; } });
    return { width: 0, height: 0,
      getContext: function () { return ctx; },
      toBlob: function (cb) { cb({ size: 1 }); } };
  }
  function genEl(tag) {
    if (tag === 'script') return scriptEl();
    if (tag === 'canvas') return canvasEl();
    if (tag === 'a') return { href: '', download: '', click: function () {} };
    if (tag === 'div') return { textContent: '', style: {}, remove: function () {},
      appendChild: function () {}, set textContent(v) {}, get textContent() { return ''; } };
    return { style: {}, appendChild: function () {} };
  }

  var PFstub = {
    skip: function (s) { return killed.indexOf(s) !== -1; },
    toast: function (m) { toasts.push(String(m)); },
    holder: function () { return { insertAdjacentHTML: function () { mounted = true; } }; },
    authPost: function (url, body, cb) {
      posts.push(body);
      var j = postCb.response !== undefined ? postCb.response : { ok: true };
      cb(j);
    },
    creditLocal: function (key, xp) { creditLocalCalls.push([key, xp]); return true; },
    creditShare: function () {},
    shareUrl: function (u) { return u; },
    getAuthSecret: function () { return ''; }
  };

  var sandbox = {
    window: {
      PF: PFstub,
      PF_BACKEND_URL: 'https://example.com/exec',
      PFCallsign: function () { return 'testfighter'; },
      PFDeviceId: function () { return 'dev1'; },
      PFShare: { stampCallsign: function (cv) { return cv; } },
      navigator: { canShare: function () { return false; } },
      URL: { createObjectURL: function () { return 'blob:x'; } },
      File: function (parts, name) { this.name = name; },
      location: { search: '', href: 'https://mtcstw.com/' },
      CustomEvent: function (t, o) { this.type = t; this.detail = (o && o.detail) || {}; }
    },
    document: {
      getElementById: function (id) { return mounts[id] || null; },
      createElement: genEl,
      head: { appendChild: function () {} },
      body: { appendChild: function () {} },
      dispatchEvent: function (ev) { events.push(ev); }
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    setTimeout: function () { return 0; },
    fetch: function () { return Promise.reject(new Error('no fetch')); },
    console: console
  };
  sandbox.window.window = sandbox.window;
  /* Browsers expose window's properties as bare globals (the inner scripts
     reference PF, PFCallsign, PFDeviceId, PFShare, navigator, URL, File
     directly). Mirror them into the vm global scope. */
  ['PF', 'PFCallsign', 'PFDeviceId', 'PFShare', 'navigator', 'URL', 'File', 'CustomEvent'].forEach(function (k) {
    sandbox[k] = sandbox.window[k];
  });
  vm.createContext(sandbox);
  vm.runInContext(modSrc, sandbox, { filename: 'engage-b-inner.js' });
  return { bodies: bodies, posts: posts, postCb: postCb, events: events,
           toasts: toasts, creditLocalCalls: creditLocalCalls, mounted: mounted,
           bySel: bySel, mounts: mounts, store: store };
}
function bodiesJoin(r) { return r.bodies.join('\n'); }

/* --- platform-hooks: full render --- */
var hk = runSandbox(innerScript(hks));
var hkAll = bodiesJoin(hk);
if (/Test Challenge/.test(hkAll)) ok('hooks render: TikTok card'); else no('hooks render', 'TikTok card missing');
if (/Test Deep Dive/.test(hkAll)) ok('hooks render: Substack card'); else no('hooks render', 'Substack card missing');
if (/CHECK IN — \+5 STREAK/.test(hkAll)) ok('hooks render: TikTok check-in button'); else no('hooks render', 'TikTok check-in button missing');
if (/READ THE FIGHT/.test(hkAll)) ok('hooks render: Substack read CTA (no check-in button)'); else no('hooks render', 'Substack read CTA missing');
if (!/data-hk-checkin="1"/.test(hkAll)) ok('hooks render: Substack card has no check-in button'); else no('hooks render', 'Substack must not have a check-in button');

/* --- platform-hooks: check-in POST --- */
var hkBtn = hk.bySel['[data-hk-checkin="0"]'];
if (hkBtn && hkBtn.onclick) {
  hkBtn.click();
  var p = hk.posts[0] || {};
  if (p.type === 'hooks' && p.h_action === 'hook_checkin' && p.hook_id === 'tiktok_challenge' && p.callsign === 'testfighter')
    ok('hooks check-in: POSTs hooks/hook_checkin with hook_id');
  else no('hooks check-in POST', 'wrong body: ' + JSON.stringify(p));
  if (hk.toasts.some(function (t) { return /Checked in/.test(t); })) ok('hooks check-in: ok toast');
  else no('hooks check-in toast', 'missing');
} else { no('hooks check-in', 'button handler not wired'); }

/* --- platform-hooks: dup copy --- */
var hk2 = runSandbox(innerScript(hks));
hk2.postCb.response = { ok: true, dup: true, hook: 'tiktok_challenge' };
var hkBtn2 = hk2.bySel['[data-hk-checkin="0"]'];
if (hkBtn2 && hkBtn2.onclick) {
  hkBtn2.click();
  var msg = hk2.bySel['[data-hk-msg="0"]'];
  if (msg && /cross-posting pays once/.test(msg._txt || msg._html)) ok('hooks check-in: dup copy');
  else no('hooks check-in dup', 'dup copy missing: ' + JSON.stringify(msg && (msg._txt || msg._html)));
} else { no('hooks check-in dup', 'button handler not wired'); }

/* --- platform-hooks: kill switch --- */
var hkKilled = runSandbox('(' + 'function(){ var PF=window.PF; if(!PF||PF.skip("platform-hooks")){return;} PF.holder().insertAdjacentHTML(); }' + ')();', { killed: ['platform-hooks'] });
if (!hkKilled.mounted) ok('hooks kill: ?pf_off=platform-hooks suppresses mount');
else no('hooks kill', 'mounted despite kill');

/* --- quests: full render --- */
var qz = runSandbox(innerScript(qs));
var qzAll = bodiesJoin(qz);
if (/Alpha Quest/.test(qzAll) && /Beta Quest/.test(qzAll)) ok('quests render: both quest cards');
else no('quests render', 'quest cards missing');
if (/PLATFORM STEPS — SELF-REPORTED · 0 XP/.test(qzAll)) ok('quests render: honest platform-step header');
else no('quests render', 'platform-step header missing');
if (/ON-SITE CHECK-IN — VERIFIED · \+10 XP/.test(qzAll)) ok('quests render: verified on-site header');
else no('quests render', 'on-site header missing');
if (/CLAIM \+10 XP/.test(qzAll)) ok('quests render: claim button'); else no('quests render', 'claim button missing');

/* --- quests: on-site check-in POST (existing streak leg) --- */
var qOnsite = qz.bySel['[data-q-onsite="0"]'];
if (qOnsite && qOnsite.onclick) {
  qOnsite.click();
  var qp = qz.posts[0] || {};
  if (qp.type === 'streak' && qp.str_action === 'streak_checkin' && qp.callsign === 'testfighter')
    ok('quests on-site: POSTs streak:streak_checkin (existing leg)');
  else no('quests on-site POST', 'wrong body: ' + JSON.stringify(qp));
  if (qz.toasts.some(function (t) { return /verified/.test(t); })) ok('quests on-site: verified toast');
  else no('quests on-site toast', 'missing');
} else { no('quests on-site', 'button handler not wired'); }

/* --- quests: claim flow --- */
var qz2 = runSandbox(innerScript(qs));
/* check every platform step, then the on-site check-in, then claim */
['#qcb_0_0', '#qcb_0_1'].forEach(function (sel) {
  var cb = qz2.bySel[sel];
  if (cb && cb.onchange) { cb.checked = true; cb.onchange(); }
});
var qOn2 = qz2.bySel['[data-q-onsite="0"]'];
if (qOn2 && qOn2.onclick) qOn2.click();
var qClaim = qz2.bySel['[data-q-claim="0"]'];
if (qClaim && qClaim.onclick && !qClaim.disabled) {
  qClaim.click();
  var cl = qz2.creditLocalCalls[0] || [];
  if (cl[0] === 'dochall_quest_q_alpha' && cl[1] === 10) ok('quests claim: creditLocal dochall_quest_q_alpha +10');
  else no('quests claim creditLocal', 'wrong: ' + JSON.stringify(cl));
  var pxp = qz2.events.filter(function (e) { return e.type === 'pf-xp'; })[0];
  if (pxp && pxp.detail.gain === 10 && pxp.detail.key === 'dochall_quest_q_alpha')
    ok('quests claim: pf-xp dispatched {gain:10, key:dochall_quest_q_alpha}');
  else no('quests claim pf-xp', 'missing/wrong: ' + JSON.stringify(pxp && pxp.detail));
  var poc = qz2.events.filter(function (e) { return e.type === 'pf-order-checkin'; })[0];
  if (poc && poc.detail.xp === 10) ok('quests claim: pf-order-checkin tally settle');
  else no('quests claim pf-order-checkin', 'missing');
} else { no('quests claim', 'claim button not enabled after steps + on-site'); }

/* --- quests: kill switch --- */
var qzKilled = runSandbox('(' + 'function(){ var PF=window.PF; if(!PF||PF.skip("quests")){return;} PF.holder().insertAdjacentHTML(); }' + ')();', { killed: ['quests'] });
if (!qzKilled.mounted) ok('quests kill: ?pf_off=quests suppresses mount');
else no('quests kill', 'mounted despite kill');

console.log('\nengage-b FE: ' + passes + ' passed, ' + fails.length + ' failed');
if (fails.length) { fails.forEach(function (f) { console.log('  FAIL ' + f); }); process.exit(1); }
