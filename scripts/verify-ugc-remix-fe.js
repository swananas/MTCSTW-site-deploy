#!/usr/bin/env node
/* scripts/verify-ugc-remix-fe.js — UGC Story Remixer frontend verification.
   Run from the repo root: node scripts/verify-ugc-remix-fe.js
   1. node --check on the bundle + page-mount + footer draft
   2. Static checks: kill switch, no banned copy, no hardcoded XP numbers,
      contract endpoints/actions, immutability labels, poster dims, MTCSTW
      identity, JOIN THE FIGHT. CTA, sticky-web links, page-mount + footer
      wiring
   3. vm + fake-DOM runtime tests: feed render from fixture, composer flow
      (story pick -> evidence validation rejects URL-less items ->
      publish POST shape -> success redirect), remix page renders the three
      labeled sections (SOURCED FACTS frozen / USER-SOURCED EVIDENCE /
      OPINION), sticky-web chips, fail-soft feed, kill switch. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

var SILO = 'v1.4.3/pages/bundle-ugc-remix.js';

console.log('== 1. node --check ==');
[SILO, 'v1.4.3/pages/page-mount.js', 'ship-loader/footer-v146-draft-ugcremix.html'].forEach(function (f) {
  if (/\.html$/.test(f)) {
    try { fs.accessSync(path.join(ROOT, f)); ok(f + ' exists'); }
    catch (e) { no(f, 'missing'); }
    return;
  }
  try { cp.execSync('node --check ' + path.join(ROOT, f), { stdio: 'pipe' }); ok(f); }
  catch (e) { no(f, 'node --check failed'); }
});

console.log('== 2. static checks ==');
var s = read(path.join(ROOT, SILO));
var bare = stripComments(s);
/* kill switch */
if (/PF\.skip\(['"]ugcremix['"]\)/.test(s) && /\?pf_off=ugcremix/.test(s)) ok('kill switch ?pf_off=ugcremix');
else no('kill switch', 'PF.skip("ugcremix") / ?pf_off=ugcremix missing');
/* banned copy */
var banned = ['donate', 'act now', 'hurry', 'limited time', 'last chance', "don't miss", 'guaranteed'];
var badHit = banned.filter(function (w) { return bare.toLowerCase().indexOf(w) !== -1; });
if (!badHit.length) ok('no banned copy (donate / fake urgency)');
else no('banned copy', 'found: ' + badHit.join(', '));
/* no hardcoded XP numbers in copy */
if (/\b\d+\s*XP\b/.test(bare)) no('XP numbers', 'hardcoded XP amount found in copy');
else ok('no XP numbers (zero XP product)');
/* contract endpoints + POST actions */
[['remix_feed', 'feed GET'], ['remix_get', 'single remix GET'],
 ['remix_submit', 'publish POST action'], ['remix_report', 'flag POST action'],
 ["type: 'remix'", 'POST type rail']
].forEach(function (pair) {
  if (s.indexOf(pair[0]) !== -1) ok('contract: ' + pair[1]);
  else no('contract: ' + pair[1], "'" + pair[0] + "' missing");
});
/* immutability + labeling */
[['SOURCED FACTS', 'frozen facts section label'],
 ['USER-SOURCED EVIDENCE', 'evidence section label'],
 ['OPINION', 'opinion label'],
 [/can\\'t be changed/, 'immutability copy'],
 ['not a verified fact', 'opinion disclaimer'],
 ['/remix?r=', 'share_url shape']
].forEach(function (pair) {
  var found = (pair[0] instanceof RegExp) ? pair[0].test(s) : (s.indexOf(pair[0]) !== -1);
  if (found) ok('label: ' + pair[1]);
  else no('label: ' + pair[1], "'" + pair[0] + "' missing");
});
/* poster */
if (/cv\.width = 1080; cv\.height = 1350/.test(s)) ok('poster 1080x1350');
else no('poster dims', '1080x1350 missing');
if (/JOIN THE FIGHT\./.test(s) && /MTCSTW\.COM/.test(s)) ok('poster JOIN THE FIGHT. + MTCSTW.COM');
else no('poster CTA', 'share-image CTA standard missing');
/* sticky web */
[['READ THE FULL EXTRACTION STORY', 'back-link to source story'],
 ['/receipt', 'receipts chip'], ['CORRUPTION INDEX', 'index chip'],
 ['STICKY WEB', 'sticky-web section']
].forEach(function (pair) {
  if (s.indexOf(pair[0]) !== -1) ok('sticky web: ' + pair[1]);
  else no('sticky web: ' + pair[1], "'" + pair[0] + "' missing");
});
/* evidence URL requirement, client-side */
if (/needs a valid http\(s\) URL/.test(s) && /No URL, no publish/.test(s)) ok('evidence URL required client-side');
else no('evidence URL', 'client-side URL gate missing');
/* mount div + route */
if (/getElementById\(['"]pf-ugc-remix['"]\)/.test(s)) ok('mounts on #pf-ugc-remix');
else no('mount div', '#pf-ugc-remix missing');
var pm = read(path.join(ROOT, 'v1.4.3/pages/page-mount.js'));
if (/'pf-ugc-remix': \{/.test(pm)) ok('page-mount PAGE_ORDERS entry');
else no('page-mount entry', "'pf-ugc-remix' missing from PAGE_ORDERS");
if (/'pf-ugc-remix'/.test(pm) && /FE_MOUNT_IDS/.test(pm)) ok('page-mount FE_MOUNT_IDS');
else no('FE_MOUNT_IDS', 'pf-ugc-remix not in FE_MOUNT_IDS');
var foot = read(path.join(ROOT, 'ship-loader/footer-v146-draft-ugcremix.html'));
if (/isRemix\?\['pages\/bundle-ugc-remix\.js'\]/.test(foot)) ok('footer draft routes /remix -> bundle-ugc-remix.js');
else no('footer route', 'isRemix routing missing');
if (/isRemix=!!document\.getElementById\('pf-ugc-remix'\)/.test(foot)) ok('footer draft probes #pf-ugc-remix');
else no('footer probe', 'isRemix probe missing');
/* contract: no client-supplied story/headlines in submit body */
var submitMatch = /remix_action: 'remix_submit'([\s\S]*?)\}, function/.exec(s);
if (submitMatch && submitMatch[1].indexOf('story:') === -1 && submitMatch[1].indexOf('headlines') === -1)
  ok('submit body carries NO story/headline values (server freezes)');
else no('submit body', 'client sends story/headlines — immutability breach');

console.log('== 3. runtime (vm + fake DOM) ==');

/* ---------- tiny DOM ---------- */
function makeEnv(search, opts) {
  opts = opts || {};
  var els = {};
  function FakeEl(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._inner = '';
    this._id = '';
    this.value = '';
    this.textContent = '';
    this.onclick = null; this.onchange = null; this.oninput = null;
    this.disabled = false;
    this.style = {};
    this._attrs = {};
    this._listeners = {};
    this._timerQ = [];
  }
  Object.defineProperty(FakeEl.prototype, 'id', {
    get: function () { return this._id; },
    set: function (v) {
      if (this._id && els[this._id] === this) delete els[this._id];
      this._id = String(v || '');
      if (this._id) els[this._id] = this;
    }
  });
  Object.defineProperty(FakeEl.prototype, 'innerHTML', {
    get: function () { return this._inner; },
    set: function (h) { this._inner = String(h); parseInto(this, this._inner); }
  });
  FakeEl.prototype.setAttribute = function (k, v) {
    this._attrs[k] = String(v);
    if (k === 'id') this.id = String(v);
    if (k === 'value') this.value = String(v);
  };
  FakeEl.prototype.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
  };
  FakeEl.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
  FakeEl.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; }
    return c;
  };
  FakeEl.prototype.addEventListener = function () {};
  FakeEl.prototype.click = function () { if (this.onclick) this.onclick(); };
  FakeEl.prototype.querySelectorAll = function (sel) {
    var out = [];
    (function walk(n) {
      for (var i = 0; i < n.children.length; i++) {
        var c = n.children[i];
        if (sel === '[data-k]' && c.getAttribute('data-k') !== null) out.push(c);
        if (sel === '[data-rm]' && c.getAttribute('data-rm') !== null) out.push(c);
        walk(c);
      }
    })(this);
    return out;
  };
  FakeEl.prototype.querySelector = function (sel) { return this.querySelectorAll(sel)[0] || null; };
  FakeEl.prototype.getContext = function () {
    if (!opts.canvas) return null;
    return { fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
      fillRect: function () {}, strokeRect: function () {}, fillText: function () {},
      measureText: function () { return { width: 10 }; } };
  };
  FakeEl.prototype.toDataURL = function () { return 'data:image/png;base64,x'; };
  FakeEl.prototype.toBlob = function () {};
  function parseInto(el, html) {
    /* strip descendants from registry */
    (function unreg(n) {
      for (var i = 0; i < n.children.length; i++) {
        var c = n.children[i];
        if (c.id && els[c.id] === c) delete els[c.id];
        unreg(c);
      }
    })(el);
    el.children = [];
    var stack = [el];
    var re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g, m, last = 0;
    while ((m = re.exec(html))) {
      var txt = html.slice(last, m.index);
      if (txt.trim() && stack.length) stack[stack.length - 1].textContent += txt;
      last = re.lastIndex;
      var closing = html[m.index + 1] === '/';
      if (closing) { if (stack.length > 1) stack.pop(); continue; }
      var tag = m[1], attrStr = m[2];
      var fe = new FakeEl(tag);
      var am = /([a-zA-Z-]+)="([^"]*)"/g, a2;
      while ((a2 = am.exec(attrStr))) fe.setAttribute(a2[1], a2[2]);
      stack[stack.length - 1].appendChild(fe);
      var selfClose = /\/\s*$/.test(attrStr) ||
        /^(input|img|br|hr|meta|link)$/i.test(tag);
      if (!selfClose) stack.push(fe);
    }
  }
  var jsonpCalls = [];
  var document = {
    getElementById: function (id) { return els[id] || null; },
    createElement: function (tag) {
      var fe = new FakeEl(tag);
      if (tag === 'script') {
        Object.defineProperty(fe, 'src', {
          set: function (v) {
            var mm = /[?&]action=([^&]*)/.exec(String(v));
            var cb = /[?&]callback=([^&]*)/.exec(String(v));
            jsonpCalls.push({ action: mm && decodeURIComponent(mm[1]), cb: cb && cb[1] });
          },
          get: function () { return ''; }
        });
      }
      return fe;
    },
    head: new FakeEl('head'),
    body: new FakeEl('body'),
    documentElement: new FakeEl('html')
  };
  var timers = [];
  var pf = {
    skip: function (k) { return !!opts.skip; },
    error: function () {},
    toast: function (m) { env.toasts.push(m); },
    authPost: function (url, body, cb) {
      env.posts.push(body);
      cb(opts.postReply === undefined ? { ok: true, id: 'rx_t1', share_url: '/remix?r=rx_t1' } : opts.postReply);
    }
  };
  var window = {
    location: { href: 'https://mtcstw.com' + search, search: search },
    PF: pf,
    PF_BACKEND_URL: 'https://pf-api.test',
    navigator: {},
    prompt: function () { return ''; },
    addEventListener: function () {}
  };
  window.window = window;
  window.document = document;
  var env = {
    window: window, document: document, els: els, jsonpCalls: jsonpCalls,
    toasts: [], posts: [], timers: timers,
    setTimeout: function (fn) { timers.push(fn); return timers.length; },
    setInterval: function () { return 0; },
    clearTimeout: function () {},
    runTimers: function () { var q = timers.slice(); timers.length = 0; q.forEach(function (f) { f(); }); },
    answerJsonp: function (i, data) {
      var c = jsonpCalls[i];
      if (c && window[c.cb]) window[c.cb](data);
    },
    lastJsonp: function () { return jsonpCalls[jsonpCalls.length - 1]; }
  };
  window.setTimeout = env.setTimeout; window.setInterval = env.setInterval;
  window.clearTimeout = env.clearTimeout;
  env.host = new FakeEl('div'); env.host.id = 'pf-ugc-remix';
  document.body.appendChild(env.host);
  return env;
}
function runBundle(search, opts) {
  var env = makeEnv(search, opts);
  var ctx = vm.createContext(env);
  ctx.window = env.window; ctx.document = env.document;
  ctx.setTimeout = env.setTimeout; ctx.setInterval = env.setInterval; ctx.clearTimeout = env.clearTimeout;
  vm.runInContext(read(path.join(ROOT, SILO)), ctx, { filename: 'bundle-ugc-remix.js' });
  return env;
}

/* fixtures */
var FEED_FIX = { ok: true, items: [
  { id: 'rx_aaa', story_slug: 'acme', company: 'Acme Inc',
    story: 'Acme story.', headlines: { contracts_usd: 4200000000, osha_violations: 12, wagetheft_usd: 900000,
      contracts_citation: 'USAspending.gov · recipient snapshot · trailing 12 months · retrieved 2026-10-07' },
    profile_url: '/extraction?c=acme', share_url: '/remix?r=rx_aaa',
    evidence: [{ kind: 'link', url: 'https://example.com/a', title: 'Contract docs' }],
    commentary: 'This is damning.', callsign: 'FACTCHECK-7', created_at: 1791000000000 },
  { id: 'rx_bbb', story_slug: 'beta', company: 'Beta Corp',
    story: 'Beta story.', headlines: {}, profile_url: '/extraction?c=beta', share_url: '/remix?r=rx_bbb',
    evidence: [], commentary: 'Watch this one.', callsign: '', created_at: 1790900000000 }
], count: 2, has_more: false };
var REMIX_FIX = { ok: true, item: FEED_FIX.items[0] };
var PROFILE_FIX = { ok: true, web: {
  profile_url: '/extraction?c=acme', receipt_base: '/receipt', index_url: '/index?entity=acme',
  town_links: [{ state: 'LA', url: '/town?company=acme&state=LA' }] } };
var GEN_FIX = { ok: true, entity: { slug: 'gamma', display_name: 'Gamma LLC' },
  story: 'Gamma story.', headlines: { contracts_usd: 5000000 } };

/* ---- test: feed mode renders cards ---- */
(function () {
  var env = runBundle('/remix');
  env.answerJsonp(0, FEED_FIX);
  var h = env.els['rx-feed'].innerHTML;
  if (/Acme Inc/.test(h) && /Beta Corp/.test(h) && /VIEW THE REMIX/.test(h))
    ok('feed renders remix cards from remix_feed');
  else no('feed render', 'cards missing');
  if (/\$4/.test(h) && /Federal awards/.test(h)) ok('feed cards show headline numbers');
  else no('feed numbers', 'headline numbers missing');
})();

/* ---- test: feed fail-soft ---- */
(function () {
  var env = runBundle('/remix');
  env.answerJsonp(0, null);
  if (/Couldn't load the remix feed/.test(env.els['rx-feed'].innerHTML)) ok('feed fail-soft on backend error');
  else no('feed fail-soft', 'expected error card');
})();

/* ---- test: empty feed invites the first remix ---- */
(function () {
  var env = runBundle('/remix');
  env.answerJsonp(0, { ok: true, items: [], count: 0, has_more: false, note: 'No remixes published yet.' });
  if (/PUBLISH THE FIRST REMIX/.test(env.els['rx-feed'].innerHTML)) ok('empty feed CTA');
  else no('empty feed', 'first-remix CTA missing');
})();

/* ---- test: composer flow ---- */
(function () {
  var env = runBundle('/remix');
  env.answerJsonp(0, FEED_FIX);
  env.els['rx-start'].click(); /* -> composer step 1 */
  if (!/STEP 1/.test(env.els['rx-c'].innerHTML)) { no('composer step1', 'step 1 missing'); return; }
  ok('composer step 1 renders');
  env.answerJsonp(1, { ok: true, items: [
    { slug: 'acme', company: 'Acme Inc', story: 'Acme story.', headlines: { contracts_usd: 4200000000 } } ] });
  var sel = env.els['rx-sel'];
  sel.value = 'acme'; sel.onchange(); /* pickStory */
  if (!/Frozen sourced facts/.test(env.els['rx-preview'].innerHTML)) {
    no('story pick', 'frozen preview missing'); return;
  }
  ok('story pick shows frozen preview');
  env.els['rx-to2'].click(); /* -> step 2 */
  var list = env.els['rx-evlist'];
  var fields = list.querySelectorAll('[data-k]');
  if (fields.length < 4) { no('evidence fields', 'expected url/title/note/kind fields'); return; }
  ok('evidence item fields render');
  /* validation: junk URL rejected */
  var urlF = fields.filter(function (f) { return f.getAttribute('data-k') === 'url'; })[0];
  urlF.value = 'junk'; if (urlF.oninput) urlF.oninput();
  fields.filter(function (f) { return f.getAttribute('data-k') === 'title'; })[0].value = 'Docs';
  env.els['rx-to3'].click();
  if (/valid http\(s\) URL/.test(env.els['rx-cerr'].textContent || '')) ok('evidence URL-less item rejected');
  else no('evidence validation', 'junk URL not rejected');
  /* valid item passes to step 3 */
  urlF.value = 'https://example.com/docs'; if (urlF.oninput) urlF.oninput();
  var titleF = fields.filter(function (f) { return f.getAttribute('data-k') === 'title'; })[0];
  titleF.value = 'Docs'; if (titleF.oninput) titleF.oninput();
  env.els['rx-to3'].click();
  if (!/STEP 3/.test(env.els['rx-c'].innerHTML)) { no('composer step3', 'step 3 missing'); return; }
  ok('composer step 3 renders');
  /* submit with empty take rejected */
  env.els['rx-pub'].click();
  if (/required/.test(env.els['rx-cerr'].textContent || '')) ok('empty take rejected');
  else no('take validation', 'empty take not rejected');
  env.els['rx-take'].value = 'My take: receipts.';
  env.els['rx-cs'].value = 'FACTCHECK-7';
  env.els['rx-pub'].click();
  var body = env.posts[0] || {};
  if (body.type === 'remix' && body.remix_action === 'remix_submit' &&
      body.story_slug === 'acme' && body.commentary === 'My take: receipts.' &&
      body.evidence && body.evidence[0].url === 'https://example.com/docs' &&
      body.story === undefined && body.headlines === undefined)
    ok('submit POST shape (no client story/headlines)');
  else no('submit POST', 'bad body: ' + JSON.stringify(body).slice(0, 160));
  env.runTimers(); /* publish success -> redirect */
  if (env.window.location.href === '/remix?r=rx_t1') ok('publish success redirects to share_url');
  else no('publish redirect', 'href=' + env.window.location.href);
})();

/* ---- test: on-demand company lookup ---- */
(function () {
  var env = runBundle('/remix');
  env.answerJsonp(0, FEED_FIX);
  env.els['rx-start'].click();
  env.answerJsonp(1, { ok: true, items: [] });
  env.els['rx-lookup'].value = 'Gamma';
  env.els['rx-gobtn'].click();
  env.answerJsonp(2, GEN_FIX);
  if (/Gamma LLC/.test(env.els['rx-preview'].innerHTML)) ok('on-demand company lookup works');
  else no('company lookup', 'Gamma preview missing');
})();

/* ---- test: remix page ---- */
(function () {
  var env = runBundle('/remix?r=rx_aaa');
  env.answerJsonp(0, REMIX_FIX);
  env.answerJsonp(1, PROFILE_FIX);
  var h = env.els['rx-page'].innerHTML + (env.els['rx-web'] ? env.els['rx-web'].innerHTML : '');
  var checks = [
    [/Sourced facts/, 'frozen facts section'],
    [/User-sourced evidence/, 'evidence section'],
    [/Opinion/, 'opinion label'],
    [/READ THE FULL EXTRACTION STORY/, 'back-link to source story'],
    [/USAspending\.gov/, 'citation preserved verbatim'],
    [/Contract docs/, 'evidence item shown'],
    [/This is damning/, 'commentary shown'],
    [/FACTCHECK-7/, 'callsign attribution'],
    [/STICKY WEB/, 'sticky-web section'],
    [/CORRUPTION INDEX/, 'index chip'],
    [/LA TOWN/, 'town chip'],
    [/SHARE THIS REMIX/, 'share button']
  ];
  checks.forEach(function (c) {
    if (c[0].test(h)) ok('remix page: ' + c[1]);
    else no('remix page: ' + c[1], c[0] + ' missing');
  });
})();

/* ---- test: remix not found ---- */
(function () {
  var env = runBundle('/remix?r=rx_nope');
  env.answerJsonp(0, { ok: false, err: 'remix not found' });
  if (/Remix not found/.test(env.els['rx-page'].innerHTML)) ok('remix 404 honest');
  else no('remix 404', 'not-found card missing');
})();

/* ---- test: kill switch ---- */
(function () {
  var env = runBundle('/remix', { skip: true });
  if (env.host.innerHTML === '' && env.jsonpCalls.length === 0) ok('kill switch renders nothing, no calls');
  else no('kill switch', 'bundle ran despite skip');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
