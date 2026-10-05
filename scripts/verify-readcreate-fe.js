#!/usr/bin/env node
/* scripts/verify-readcreate-fe.js — Read & Create XP frontend verification
   harness (wave-readcreate-fe, 2026-10-05). Run from the worktree root:
     node scripts/verify-readcreate-fe.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: syntax, bundle inclusion, backend-rail contract, spec copy
   (verbatim), trust-disclosure adjacency, banned terms, kill switch,
   heartbeat cadence + visibility gating + payload shape (no client
   timestamps), quiz single-attempt, news_unavailable fail-soft,
   absent-dependency behavior (PF.newsTop / Ammo Finder), XSS escaping,
   and the cite_token -> Content Bank token flow. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');
var nodeCrypto = require('crypto');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'core', 'read-xp.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(s, sub) { return s.indexOf(sub) !== -1; }
function count(s, sub) { return s.split(sub).length - 1; }

var src = read(MOD);

console.log('== 1. node --check ==');
[['v1.4.3/core/read-xp.js', MOD],
 ['build/bundle-core.js', path.join(ROOT, 'build', 'bundle-core.js')],
 ['scripts/verify-readcreate-fe.js', path.join(__dirname, 'verify-readcreate-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});

console.log('== 2. bundle inclusion ==');
(function () {
  var b;
  try { b = read(BUNDLE); } catch (e) { no('bundle readable', e.message); return; }
  if (has(b, "'readcreate'") || has(b, '"readcreate"')) ok('bundle carries the readcreate rail');
  else no('bundle carries the readcreate rail', 'TYPE_KEY string missing from bundle-core.js');
  if (has(b, 'READ THE FIGHT. Prove it. +5 XP per story.')) ok('bundle carries reader copy');
  else no('bundle carries reader copy', 'copy string missing — rebuild bundles?');
})();

console.log('== 3. static contract checks ==');
/* backend rail */
[['TYPE_KEY readcreate', "'readcreate'"],
 ['param rc_action', "'rc_action'"],
 ['PF.postAction rail', 'PF.postAction(TYPE, AKEY, action'],
 ['read_heartbeat', "'read_heartbeat'"],
 ['read_quiz', "'read_quiz'"],
 ['read_claim', "'read_claim'"],
 ['cite_token', "'cite_token'"],
 ['bank_submit', "'bank_submit'"],
 ['poster_share', "'poster_share'"]
].forEach(function (pair) {
  if (has(src, pair[1])) ok(pair[0]); else no(pair[0], 'missing: ' + pair[1]);
});
/* heartbeat mechanics */
if (/HB_MS\s*=\s*15000/.test(src)) ok('heartbeat cadence 15s'); else no('heartbeat cadence 15s', 'HB_MS !== 15000');
if (has(src, "document.visibilityState !== 'visible'")) ok('visibility gating (no beat when hidden)');
else no('visibility gating (no beat when hidden)', 'visibilityState check missing');
if (has(src, 'p.callsign = callsign()') && has(src, 'p.device') &&
    has(src, 'PFDeviceId')) ok('api() attaches callsign + device identity (all six actions)');
else no('api() attaches callsign + device identity (all six actions)', 'identity merge missing from api()');
if (/read_heartbeat[\s\S]{0,400}Date\.now\(\)/.test(src) === false) ok('no client timestamp near heartbeat');
else no('no client timestamp near heartbeat', 'Date.now near heartbeat path');
/* kill switch */
if (has(src, "PF.skip('readxp')") && has(src, '?pf_off=readxp')) ok('kill switch readxp');
else no('kill switch readxp', "PF.skip('readxp') or ?pf_off=readxp missing");
/* spec copy verbatim */
[['reader copy', 'READ THE FIGHT. Prove it. +5 XP per story.'],
 ['create copy', 'TURN IT INTO AMMUNITION.'],
 ['create sub', 'Read it. Cite it. Bank it.'],
 ['trust disclosure', 'XP has no cash value. Stakes are final.']
].forEach(function (pair) {
  if (has(src, pair[1])) ok('copy: ' + pair[0]); else no('copy: ' + pair[0], 'verbatim string missing');
});
if (count(src, 'COPY.trust') >= 6) ok('trust disclosure adjacent to XP mentions (' + count(src, 'COPY.trust') + ' refs)');
else no('trust disclosure adjacent to XP mentions', 'only ' + count(src, 'COPY.trust') + ' refs');
/* XP amounts exactly per spec */
[['+5 read', '+5 XP'], ['+10 bank', '+10 XP'], ['+20 cited', '+20 XP']].forEach(function (pair) {
  if (has(src, pair[1])) ok('amount shown: ' + pair[0]); else no('amount shown: ' + pair[0], pair[1] + ' missing');
});
['+3 XP', '+15 XP', '+25 XP', '+40 XP', '+50 XP'].forEach(function (bad) {
  if (has(src, bad)) no('no off-spec amount ' + bad, 'found in source');
  else ok('no off-spec amount ' + bad);
});
/* banned terms */
var srcNoComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
if (/\bdonat(e|ion|ions)\b/i.test(srcNoComments)) no('no banned terms', '"donate" family found in code/strings');
else ok('no banned terms');
/* quiz single attempt + wrong-answer copy */
if (has(src, 's.attempted = true') && has(src, 's.state !== \'quiz\' || s.attempted')) ok('quiz one-attempt guard');
else no('quiz one-attempt guard', 'attempted flag missing');
if (has(src, 'No award today for this story.')) ok('wrong-answer copy'); else no('wrong-answer copy', 'missing');
/* fail-soft */
if (has(src, "'news_unavailable'") && has(src, 'teardown(hash, true)')) ok('news_unavailable fail-soft teardown');
else no('news_unavailable fail-soft teardown', 'missing');
if (has(src, 'if (!newsTopPresent()) return;')) ok('absent PF.newsTop -> mounts nothing');
else no('absent PF.newsTop -> mounts nothing', 'missing guard');
/* XSS */
if (count(src, 'esc(') >= 25) ok('esc() applied broadly (' + count(src, 'esc(') + ' uses)');
else no('esc() applied broadly', 'only ' + count(src, 'esc(') + ' uses');
if (has(src, 'function safeUrl(u)') && has(src, '/^https?:\\/\\//i')) ok('safeUrl http(s) gate');
else no('safeUrl http(s) gate', 'missing');
/* dependency adapters */
if (has(src, 'getStories') && has(src, "typeof nt.get === 'function'")) ok('PF.newsTop dual-shape adapter');
else no('PF.newsTop dual-shape adapter', 'missing');
if (has(src, '.am-card') && has(src, 'CITE THIS')) ok('Ammo Finder CITE THIS decorator');
else no('Ammo Finder CITE THIS decorator', 'missing');
/* state machine copy */
if (has(src, 'pending &#8594; accepted (XP lands) / rejected (no award, ever)')) ok('bank state-machine copy');
else no('bank state-machine copy', 'missing');
if (has(src, 'must contain the') && has(src, 'link or title</b> so the wire can verify it')) ok('proof-requirements explainer');
else no('proof-requirements explainer', 'missing');

console.log('== 4. vm unit tests ==');
/* ---- minimal DOM/browser stubs ---- */
function mkEl(tag) {
  var el = {
    tag: tag || 'div', children: [], _attrs: {}, _handlers: {},
    style: {}, textContent: '', disabled: false, value: '',
    classList: { _s: {}, add: function (c) { this._s[c] = 1; }, remove: function (c) { delete this._s[c]; },
      toggle: function (c, f) { if (f) this._s[c] = 1; else delete this._s[c]; },
      contains: function (c) { return !!this._s[c]; } },
    setAttribute: function (k, v) { this._attrs[k] = String(v); },
    getAttribute: function (k) { return (k in this._attrs) ? this._attrs[k] : null; },
    addEventListener: function (t, h) { (this._handlers[t] = this._handlers[t] || []).push(h); },
    appendChild: function (c) { this.children.push(c); return c; },
    insertBefore: function (c) { this.children.push(c); return c; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    remove: function () { this._removed = true; },
    focus: function () {}, scrollIntoView: function () {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html || ''; },
    set: function (v) { this._html = String(v); }
  });
  return el;
}
var postCalls = []; /* {type, actionKey, action, params, cb} */
var pfStub = {
  skip: function () { return false; },
  log: function () {}, error: function () {},
  toast: function (m) { pfStub._toasts.push(String(m)); },
  _toasts: [],
  errCopy: function (j, fb) { return fb || 'fallback'; },
  postAction: function (type, actionKey, action, params, cb) {
    postCalls.push({ type: type, actionKey: actionKey, action: action, params: params, cb: cb });
  }
};
function fireLast(resp) {
  var c = postCalls[postCalls.length - 1];
  if (c) c.cb(resp);
  return c;
}
var docStub = {
  readyState: 'complete',
  visibilityState: 'visible',
  body: mkEl('body'), head: mkEl('head'),
  documentElement: { scrollHeight: 3000, clientHeight: 1000, scrollTop: 0 },
  createElement: function (t) { return mkEl(t); },
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  dispatchEvent: function () { return true; }
};
var winStub = {
  location: { href: 'https://mtcstw.com/' },
  open: function () { winStub._opened.push(Array.prototype.slice.call(arguments)); return null; },
  _opened: [],
  crypto: nodeCrypto.webcrypto,
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
  PFCallsign: function () { return 'TESTER'; },
  PFDeviceId: function () { return 'DEV-9'; }
};
var sandbox = {
  window: winStub, document: docStub,
  crypto: nodeCrypto.webcrypto, /* bare `crypto` global, as in browsers */
  TextEncoder: require('util').TextEncoder,
  URL: require('url').URL,
  CustomEvent: function (n, o) { this.type = n; this.detail = (o && o.detail) || null; },
  setInterval: function () { return 0; }, clearInterval: function () {},
  console: console
};
sandbox.globalThis = sandbox;
winStub.PF = pfStub;
vm.createContext(sandbox);
try {
  vm.runInContext(read(MOD), sandbox, { filename: 'read-xp.js' });
  ok('module loads in vm sandbox');
} catch (e) { no('module loads in vm sandbox', e.message); }
var RX = null, T = null;
try { RX = sandbox.window.PF.readXP; T = RX._t; ok('PF.readXP API exposed'); }
catch (e) { no('PF.readXP API exposed', e.message); }

function mkPanel() {
  var beats = mkEl('span'), status = mkEl('div'), quiz = mkEl('div');
  var input = mkEl('input'); input.value = 'the answer';
  var btn = mkEl('button');
  quiz.querySelector = function (sel) {
    if (sel === '[data-rx-answer]') return input;
    if (sel === '[data-rx-prove]') return btn;
    return null;
  };
  var panel = mkEl('div');
  panel.querySelector = function (sel) {
    if (sel === '[data-rx-beats]') return beats;
    if (sel === '[data-rx-status]') return status;
    if (sel === '[data-rx-quiz]') return quiz;
    return null;
  };
  panel._beats = beats; panel._status = status; panel._quiz = quiz;
  panel._input = input; panel._btn = btn;
  return panel;
}
function mkSession(hash, state) {
  return { story: { url: 'https://example.com/s', title: 'T' }, hash: hash,
    state: state || 'reading', timer: null, panel: mkPanel(),
    beats: 0, fails: 0, attempted: false };
}

(async function run() {
  if (!T) { no('unit tests', 'no _t hooks'); return finish(); }

  /* esc / safeUrl / depth */
  try {
    if (T.esc('<b>"\'&') === '&lt;b&gt;&quot;&#39;&amp;') ok('esc() escapes HTML');
    else no('esc() escapes HTML', T.esc('<b>"\'&'));
  } catch (e) { no('esc() escapes HTML', e.message); }
  try {
    if (T.safeUrl('javascript:alert(1)') === '' && T.safeUrl('https://x.com/a') === 'https://x.com/a')
      ok('safeUrl() gates schemes');
    else no('safeUrl() gates schemes', 'unexpected result');
  } catch (e) { no('safeUrl() gates schemes', e.message); }
  try {
    winStub.pageYOffset = 1000;
    if (T.depth() === 50) ok('depth() computes scroll %');
    else no('depth() computes scroll %', 'got ' + T.depth());
  } catch (e) { no('depth() computes scroll %', e.message); }

  /* storyHash: verbatim passthrough + sha256 derivation */
  try {
    var h1 = await T.storyHash({ url_hash: 'abc123' });
    if (h1 === 'abc123') ok('storyHash() honors url_hash');
    else no('storyHash() honors url_hash', h1);
    var url = 'https://example.com/story';
    var h2 = await T.storyHash({ url: url });
    var exp = nodeCrypto.createHash('sha256').update(url).digest('hex');
    if (h2 === exp && /^[0-9a-f]{64}$/.test(h2)) ok('storyHash() = sha256(trimmed url)');
    else no('storyHash() = sha256(trimmed url)', h2);
    var h3 = await T.storyHash({});
    if (h3 === '') ok('storyHash() fail-closed on empty');
    else no('storyHash() fail-closed on empty', h3);
  } catch (e) { no('storyHash()', e.message); }

  /* heartbeat: hidden tab -> no POST */
  try {
    postCalls.length = 0;
    T.sessions.h1 = mkSession('h1');
    docStub.visibilityState = 'hidden';
    T.beat('h1');
    if (postCalls.length === 0) ok('beat() skipped when tab hidden');
    else no('beat() skipped when tab hidden', postCalls.length + ' calls');
    docStub.visibilityState = 'visible';
  } catch (e) { no('beat() hidden gating', e.message); }

  /* heartbeat: payload shape — identity attached, no client timestamps */
  try {
    postCalls.length = 0;
    T.beat('h1');
    var c = postCalls[0];
    var keys = c ? Object.keys(c.params).sort().join(',') : '';
    if (c && c.type === 'readcreate' && c.actionKey === 'rc_action' &&
        c.action === 'read_heartbeat' && keys === 'callsign,device,scroll_depth_pct,url_hash' &&
        c.params.url_hash === 'h1' && typeof c.params.scroll_depth_pct === 'number' &&
        c.params.callsign === 'TESTER' && c.params.device === 'DEV-9')
      ok('beat() posts {url_hash, scroll_depth_pct, callsign, device} via readcreate/rc_action');
    else no('beat() posts {url_hash, scroll_depth_pct, callsign, device} via readcreate/rc_action',
      JSON.stringify(c && { t: c.type, k: c.actionKey, a: c.action, p: c.params }));
  } catch (e) { no('beat() payload', e.message); }

  /* heartbeat: floors not met -> beats update; floors met -> quiz fetch */
  try {
    fireLast({ ok: true, heartbeats: 3, floors_met: false });
    if (T.sessions.h1.beats === 3) ok('heartbeat response updates beat count');
    else no('heartbeat response updates beat count', 'beats=' + T.sessions.h1.beats);
    postCalls.length = 0;
    T.beat('h1');
    fireLast({ ok: true, heartbeats: 5, floors_met: true });
    var q = postCalls[postCalls.length - 1];
    if (q && q.action === 'read_quiz' && q.params.url_hash === 'h1' &&
        T.sessions.h1.state === 'quiz') ok('floors_met -> read_quiz fetch');
    else no('floors_met -> read_quiz fetch', JSON.stringify(q && q.action));
  } catch (e) { no('floors_met flow', e.message); }

  /* quiz render: question escaped, then claim single-attempt */
  try {
    fireLast({ ok: true, question: '<script>alert(1)</script> According to the article?' });
    var quizHtml = T.sessions.h1.panel._quiz.innerHTML;
    if (quizHtml.indexOf('&lt;script&gt;') !== -1 && quizHtml.indexOf('<script>') === -1)
      ok('quiz question XSS-escaped');
    else no('quiz question XSS-escaped', quizHtml.slice(0, 120));
    postCalls.length = 0;
    T.submitClaim('h1');
    T.submitClaim('h1'); /* double-tap must not double-fire */
    var claims = postCalls.filter(function (x) { return x.action === 'read_claim'; });
    if (claims.length === 1 && claims[0].params.url_hash === 'h1' &&
        typeof claims[0].params.answer === 'string')
      ok('read_claim fires once (one attempt)');
    else no('read_claim fires once (one attempt)', claims.length + ' calls');
    fireLast({ ok: false, err: 'wrong_answer' });
    if (T.sessions.h1.panel._quiz.innerHTML.indexOf('No award today for this story.') !== -1)
      ok('wrong answer -> no-award copy');
    else no('wrong answer -> no-award copy', 'copy missing');
  } catch (e) { no('quiz/claim flow', e.message); }

  /* claim success copy */
  try {
    T.sessions.h2 = mkSession('h2', 'quiz');
    postCalls.length = 0;
    T.submitClaim('h2');
    fireLast({ ok: true, xp: 5, balance: 105 });
    var html2 = T.sessions.h2.panel._quiz.innerHTML;
    if (html2.indexOf('+5 XP banked.') !== -1 && html2.indexOf('XP has no cash value. Stakes are final.') !== -1)
      ok('claim success -> +5 XP + trust disclosure');
    else no('claim success -> +5 XP + trust disclosure', html2.slice(0, 120));
  } catch (e) { no('claim success', e.message); }

  /* news_unavailable -> silent teardown */
  try {
    T.sessions.h3 = mkSession('h3');
    var p3 = T.sessions.h3.panel;
    postCalls.length = 0;
    T.beat('h3');
    fireLast({ ok: false, err: 'news_unavailable' });
    if (!T.sessions.h3 && p3._removed) ok('news_unavailable -> silent teardown');
    else no('news_unavailable -> silent teardown', 'session or panel survived');
  } catch (e) { no('news_unavailable teardown', e.message); }

  /* read_quiz with no question -> silent teardown */
  try {
    T.sessions.h4 = mkSession('h4');
    var p4 = T.sessions.h4.panel;
    postCalls.length = 0;
    T.beat('h4');
    fireLast({ ok: true, heartbeats: 5, floors_met: true });
    fireLast({ ok: true }); /* no question */
    if (!T.sessions.h4 && p4._removed) ok('missing quiz -> silent teardown (ineligible)');
    else no('missing quiz -> silent teardown (ineligible)', 'session survived');
  } catch (e) { no('missing-quiz teardown', e.message); }

  /* absent PF.newsTop -> rail mounts nothing */
  try {
    delete winStub.PF.newsTop;
    var railEl = mkEl('div');
    RX.rail(railEl);
    await new Promise(function (r) { setTimeout(r, 60); });
    if (railEl.innerHTML === '') ok('absent PF.newsTop -> rail mounts nothing');
    else no('absent PF.newsTop -> rail mounts nothing', 'rendered anyway');
  } catch (e) { no('absent newsTop', e.message); }

  /* Ammo CITE THIS decorator -> cite_token -> token stored */
  try {
    var card = mkEl('div');
    var link = mkEl('a');
    link.getAttribute = function (k) { return k === 'href' ? 'https://source.example/story-x' : null; };
    var appended = [];
    card.querySelector = function (sel) {
      if (sel === 'a.am-head[href]') return link;
      if (sel === '.am-copybtn') return null;
      return null;
    };
    card.appendChild = function (c) { appended.push(c); return c; };
    var ammoDoc = { querySelectorAll: function () { return [card]; } };
    T.decorateAmmo(ammoDoc);
    var btn = appended[0];
    if (btn && btn.textContent === 'CITE THIS') {
      postCalls.length = 0;
      btn._handlers.click[0]();
      var cc = postCalls[0];
      fireLast({ ok: true, token: 'tok-1', expires_at: '2030-01-01' });
      if (cc && cc.action === 'cite_token' && cc.params.url === 'https://source.example/story-x' &&
          RX.citeTokens.length === 1 && RX.citeTokens[0].token === 'tok-1' &&
          btn.textContent === 'TOKEN LOCKED')
        ok('CITE THIS -> cite_token -> token stored');
      else no('CITE THIS -> cite_token -> token stored', JSON.stringify(cc && cc.action));
    } else no('CITE THIS button injected', 'button missing');
  } catch (e) { no('CITE THIS flow', e.message); }

  /* Content Bank composer: submit -> pending state, no XP promised */
  try {
    var bankEl = mkEl('div');
    var store = {
      '[data-rx-f="artifact"]': { value: 'https://art.example/poster.png' },
      '[data-rx-f="caption"]': { value: 'Test caption' },
      '[data-rx-f="token"]': { value: '' },
      '[data-rx-f="story"]': { value: '', innerHTML: '' },
      '[data-rx-f="proof"]': { value: '' },
      '[data-rx-submit="bank"]': (function () { var b = mkEl('button'); b.getAttribute = function () { return 'bank'; }; return b; })(),
      '[data-rx-msg="bank"]': mkEl('div'),
      '[data-rx-msg="share"]': mkEl('div')
    };
    bankEl.querySelector = function (sel) { return store[sel] || null; };
    bankEl.querySelectorAll = function () { return []; };
    var clickH = null;
    bankEl.addEventListener = function (t, h) { if (t === 'click') clickH = h; };
    RX.bank(bankEl);
    await new Promise(function (r) { setTimeout(r, 60); });
    if (bankEl.innerHTML.indexOf('TURN IT INTO AMMUNITION.') !== -1 &&
        bankEl.innerHTML.indexOf('Read it. Cite it. Bank it.') !== -1)
      ok('bank composer renders spec copy');
    else no('bank composer renders spec copy', 'copy missing');
    var fakeTarget = mkEl('button');
    fakeTarget.getAttribute = function (k) { return k === 'data-rx-submit' ? 'bank' : null; };
    postCalls.length = 0;
    clickH({ target: fakeTarget });
    var bc = postCalls[0];
    fireLast({ ok: true, submission_id: 'sub-9', status: 'pending' });
    var msgHtml = store['[data-rx-msg="bank"]'].innerHTML;
    if (bc && bc.action === 'bank_submit' &&
        bc.params.artifact_url === 'https://art.example/poster.png' &&
        bc.params.caption === 'Test caption' && !('citation_token' in bc.params) &&
        msgHtml.indexOf('IN THE QUEUE') !== -1 && msgHtml.indexOf('sub-9') !== -1 &&
        msgHtml.indexOf('rejected pieces earn nothing, ever') !== -1 &&
        msgHtml.indexOf('+10 XP') === -1)
      ok('bank_submit -> pending state, no XP promised at submit');
    else no('bank_submit -> pending state, no XP promised at submit',
      JSON.stringify(bc && bc.params) + ' :: ' + msgHtml.slice(0, 140));
  } catch (e) { no('bank composer flow', e.message); }

  finish();
})();

function finish() {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
  if (fails.length) {
    console.log('FAILURES:');
    fails.forEach(function (f) { console.log('  - ' + f); });
    process.exit(1);
  }
  console.log('ALL READ/CREATE XP FRONTEND CHECKS GREEN.');
}
