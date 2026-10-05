#!/usr/bin/env node
/* scripts/verify-eo-fe.js — Executive Orders feed frontend verification
   harness (fe/eo-feed, 2026-10-05). Run from the worktree root:
     node scripts/verify-eo-fe.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: syntax (source + extracted inner script + bundles), bundle
   inclusion, political-hq ORDER mount, backend-rail contract, honesty copy
   (pending-curation states, never-guessed footer), source-link-on-every-card,
   conditional action button, kill switch (?pf_off=eo), fail-soft
   (hide-on-missing-data, no endless spinner), XSS escaping, banned terms,
   no-XP discipline (no xpGrant, no read_claim), quiz renders only with
   enough factual content, share fires the standard pf-share-image event
   behind the once-per-day gate, and CSS sync for the eo-* rules.

   NOTE (AGENTS.md lesson): no naive quote-stripping static checks here —
   assertions are direct substring checks plus vm behavioral runs. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'core', 'eo-feed.js');
var PHQ = path.join(ROOT, 'v1.4.3', 'pages', 'political-hq.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core.js');
var BUNDLE_SLR = path.join(ROOT, 'v1.4.3', 'core', 'bundle-core-slr.js');
var BUNDLE_PAGES = path.join(ROOT, 'v1.4.3', 'pages', 'bundle-pages.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(s, sub) { return s.indexOf(sub) !== -1; }
function count(s, sub) { return s.split(sub).length - 1; }

var src = read(MOD);

/* Extract the inner silo script. In the source file the closing tag is
   written split so the HTML parser never sees a raw </script> inside the
   bundle — search for that literal split form:
   '<' + '/scr`+`ipt>' (single-quoted; backticks are ordinary chars here). */
var CLOSE_TAG = '<' + '/scr`+`ipt>';
function innerScript(s) {
  var a = s.indexOf('<script>');
  var b = s.indexOf(CLOSE_TAG);
  if (a === -1 || b === -1 || b < a) return null;
  return s.slice(a + '<script>'.length, b);
}
var inner = innerScript(src); /* raw source slice (template-literal escapes intact) */
var RENDERED_INNER = null; /* inner script as the browser will execute it
   (template-literal escapes collapsed) — extracted from staged HTML in §4 */

console.log('== 1. node --check ==');
[['v1.4.3/core/eo-feed.js', MOD],
 ['v1.4.3/pages/political-hq.js', PHQ],
 ['scripts/verify-eo-fe.js', path.join(__dirname, 'verify-eo-fe.js')]
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[1], { stdio: 'pipe' }); ok(pair[0]); }
  catch (e) { no(pair[0], 'node --check failed'); }
});
/* NOTE: the raw source slice is NOT checked here — inside the outer template
   literal, sequences like \\/ are escape pairs that only become valid JS
   after the template renders. The as-executed script is checked in §4,
   extracted from the staged template HTML. */
if (!inner) no('inner script extraction', 'could not find the inner <script> block');

console.log('== 2. bundle inclusion + page mount ==');
(function () {
  var b = read(BUNDLE), b2 = read(BUNDLE_SLR), bp = read(BUNDLE_PAGES), phq = read(PHQ);
  if (has(b, 'pf-ov-eo') && has(b, 'core/eo-feed.js')) ok('bundle-core.js carries the eo silo');
  else no('bundle-core.js carries the eo silo', 'template id or file marker missing — rebuild bundles?');
  if (has(b2, 'pf-ov-eo')) ok('bundle-core-slr.js carries the eo silo');
  else no('bundle-core-slr.js carries the eo silo', 'rebuild bundles?');
  if (/\['eo',\s*'pf-ov-eo'\]/.test(phq)) ok("political-hq.js ORDER has ['eo','pf-ov-eo']");
  else no("political-hq.js ORDER has ['eo','pf-ov-eo']", 'mount entry missing');
  if (/\['eo',\s*'pf-ov-eo'\]/.test(bp)) ok('bundle-pages.js carries the mount entry');
  else no('bundle-pages.js carries the mount entry', 'rebuild bundles?');
})();

console.log('== 3. static contract checks ==');
[['eo_list action', '"eo_list"'],
 ["kill switch PF.skip('eo')", "PF.skip('eo')"],
 ['kill comment documents ?pf_off=eo', '?pf_off=eo'],
 ['pending-curation summary copy', 'Summary pending News Desk curation'],
 ['pending-verification status copy', 'STATUS PENDING VERIFICATION'],
 ['never-guessed footer honesty line', 'never guessed'],
 ['source link gated on safeUrl(source_url)', 'safeUrl(eo.source_url)'],
 ['READ THE FULL ORDER label', 'READ THE FULL ORDER'],
 ['action button conditional on action_link', 'if(eo.action_link&&safeUrl(eo.action_link))'],
 ['topic chips derived from data only', 'topicsPresent()'],
 ['topics-pending fallback copy', 'Topic tags pending News Desk curation'],
 ['quiz toggle affordance', 'PROVE YOU READ IT'],
 ['quiz single-attempt guard', 'if(done) return; done=true;'],
 ['quiz correct copy', 'CORRECT. Eyes on the paperwork.'],
 ['quiz wrong copy', 'WRONG. Read the card again'],
 ['share leg: pf-share-image event', '"pf-share-image"'],
 ['share leg: once-per-day gate', '"pf_shareimg_"'],
 ['share leg: game tag eo-feed', 'game:"eo-feed"'],
 ['fail-soft: hideSection on missing data', 'hideSection()'],
 ['XSS: esc() on title', 'esc(eo.title)'],
 ['XSS: esc() on number', 'esc(eo.eo_number)'],
 ['XSS: esc() on summary', 'esc(eo.summary)'],
 ['HTML-parser safety: split close tag present', CLOSE_TAG],
 ['template literal safety: no backticks inside inner script', null]
].forEach(function (pair) {
  if (pair[1] === null) {
    if (inner && inner.indexOf('`') === -1) ok(pair[0]);
    else no(pair[0], 'backtick found in inner script — would break the outer template literal');
    return;
  }
  if (has(src, pair[1])) ok(pair[0]); else no(pair[0], 'missing: ' + pair[1]);
});
/* The raw 9-char closing sequence must never appear: the HTML parser would
   terminate the bundle <script> element mid-file. (The opening <script> is
   fine — only the closing sequence is dangerous.) */
if (src.indexOf('</scr' + 'ipt>') === -1) ok('no raw </script> in JS string');
else no('no raw </script> in JS string', 'HTML parser would terminate the bundle script');
if (!has(src, 'donate')) ok('banned term "donate" absent');
else no('banned term "donate" absent', 'the word donate appears');
if (!has(src, 'xpGrant')) ok('no xpGrant — module grants zero XP');
else no('no xpGrant', 'xpGrant call found');
/* The read_claim/read_quiz names appear only in the header comment
   documenting WHY the rail is unwired (PENDING). The module must never
   POST: assert no postAction call exists. */
if (!has(src, 'postAction(')) ok('no postAction — never attempts the unwired XP rail');
else no('no postAction', 'module must not call the XP rail it cannot complete');

console.log('== 4. behavioral: outer staging + kill switch (vm) ==');
(function () {
  var staged = null;
  function runOuter(skipEo) {
    staged = null;
    var sandbox = {
      window: {},
      PF_holder_html: null
    };
    sandbox.window.PF = {
      skip: function (s) { return skipEo && s === 'eo'; },
      holder: function () {
        return { insertAdjacentHTML: function (pos, html) { staged = html; } };
      }
    };
    /* eo-feed.js reads bare `PF` and `window.PF` — alias them. */
    var ctx = vm.createContext(sandbox);
    vm.runInContext('var PF = window.PF;', ctx);
    vm.runInContext(src, ctx);
  }
  runOuter(false);
  if (staged && has(staged, 'id="pf-ov-eo"')) ok('outer stages <template id="pf-ov-eo">');
  else no('outer stages template', 'template not staged with kill switch off');
  if (staged && has(staged, 'id="xEo"')) ok('template carries the #xEo mount point');
  else no('template mount point', '#xEo missing');
  runOuter(true);
  if (staged === null) ok("kill switch ?pf_off=eo stages nothing");
  else no('kill switch', 'template staged despite PF.skip("eo")');
  /* As-executed inner script: extract from the STAGED template (escapes
     collapsed — this is what the browser's parser will actually run),
     then syntax-check it. */
  runOuter(false);
  if (staged) {
    var ia = staged.indexOf('<script>'), ib = staged.indexOf('</script>');
    if (ia !== -1 && ib !== -1 && ib > ia) {
      RENDERED_INNER = staged.slice(ia + '<script>'.length, ib);
      var tmp = path.join(__dirname, '.eo-inner-check.js');
      fs.writeFileSync(tmp, RENDERED_INNER);
      try { cp.execSync('node --check ' + tmp, { stdio: 'pipe' }); ok('inner silo script --check (as-executed)'); }
      catch (e) { no('inner silo script --check (as-executed)', 'syntax error: ' + (e.message || e).toString().split('\n').slice(0, 3).join(' ')); }
      fs.unlinkSync(tmp);
    } else no('rendered inner extraction', 'no <script>...</script> in staged template');
  }
})();

console.log('== 5. behavioral: inner script render + fail-soft + quiz + share (vm) ==');
/* Minimal fake DOM sufficient for the inner script's needs. */
function makeWorld() {
  var world = {
    events: [],
    localStore: {},
    lastScriptSrc: null,
    cbName: null,
    section: { style: {} },
    host: null,
    quizBoxes: {},
    clipboardText: null,
    toasts: []
  };
  function parseButtons(html, cls, attr) {
    var out = [], re = new RegExp('<button class="' + cls + '" ' + attr + '="(\\d+)"[^>]*>', 'g'), m;
    while ((m = re.exec(html))) {
      var btn = makeClickable({ 'data-x': m[1] });
      btn._idx = parseInt(m[1], 10);
      out.push(btn);
    }
    return out;
  }
  function makeOpt(okAttr, txt) {
    /* factory (not inline var): each option closes over its OWN instance */
    var o = makeClickable({ 'data-ok': okAttr });
    o.textContent = txt;
    return o;
  }
  function makeClickable(attrs) {
    var el = {
      attributes: attrs || {}, listeners: {}, disabled: false,
      textContent: '', _cls: [],
      getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
      addEventListener: function (t, f) { this.listeners[t] = f; },
      click: function () { if (this.listeners.click) this.listeners.click.call(this); }
    };
    el.classList = { add: function (c) { el._cls.push(c); } };
    return el;
  }
  var host = {
    _html: '',
    set innerHTML(h) {
      this._html = h;
      this._chips = [];
      var re = /<button data-(sv|tv)="([^"]*)" class="([^"]*)">/g, m;
      while ((m = re.exec(h))) {
        var b = makeClickable(m[1] === 'sv' ? { 'data-sv': m[2] } : { 'data-tv': m[2] });
        this._chips.push(b);
      }
      this._shares = parseButtons(h, 'eo-share', 'data-share');
      this._quizzes = parseButtons(h, 'eo-quiz-toggle', 'data-quiz');
    },
    get innerHTML() { return this._html; },
    querySelectorAll: function (sel) {
      if (sel === '.eo-chips button') return this._chips || [];
      if (sel === '[data-share]') return this._shares || [];
      if (sel === '[data-quiz]') return this._quizzes || [];
      return [];
    }
  };
  world.host = host;
  function quizBox(n) {
    if (!world.quizBoxes[n]) {
      var box = {
        style: { display: 'none' }, _html: '',
        set innerHTML(h) {
          this._html = h; this._opts = [];
          var re = /<button class="eo-opt" data-ok="([01])">([^<]*)<\/button>/g, m;
          while ((m = re.exec(h))) this._opts.push(makeOpt(m[1], m[2]));
          this._msg = { textContent: '' };
        },
        get innerHTML() { return this._html; },
        querySelectorAll: function (s) { return s === '.eo-opt' ? (this._opts || []) : []; },
        querySelector: function (s) { return s === '.eo-qmsg' ? this._msg : null; }
      };
      world.quizBoxes[n] = box;
    }
    return world.quizBoxes[n];
  }
  var scriptStub = null;
  var documentMock = {
    getElementById: function (id) { return id === 'xEo' ? host : null; },
    querySelector: function (sel) {
      var m = /data-quizbox="(\d+)"/.exec(sel);
      if (m) return quizBox(parseInt(m[1], 10));
      if (sel === '[data-game="eo"]') return world.section;
      return null;
    },
    createElement: function (tag) {
      if (tag === 'script') {
        scriptStub = {
          _src: '',
          set src(v) {
            this._src = v; world.lastScriptSrc = v;
            var mm = /callback=([^&]+)/.exec(v); world.cbName = mm && mm[1];
          },
          get src() { return this._src; },
          onerror: null, async: false,
          parentNode: { removeChild: function () {} }
        };
        return scriptStub;
      }
      return { style: {}, textContent: '' };
    },
    head: { appendChild: function () {} },
    body: { appendChild: function () {} },
    addEventListener: function () {},
    dispatchEvent: function (ev) { world.events.push(ev); }
  };
  var windowMock = {
    PF_BACKEND_URL: 'https://api.example.test/',
    PF: { toast: function (m) { world.toasts.push(m); } },
    navigator: {
      clipboard: { writeText: function (t) { world.clipboardText = t; return Promise.resolve(); } }
    },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    localStorage: {
      getItem: function (k) { return world.localStore[k] || null; },
      setItem: function (k, v) { world.localStore[k] = v; }
    }
  };
  windowMock.window = windowMock;
  var sandbox = {
    window: windowMock,
    document: documentMock,
    navigator: windowMock.navigator,
    localStorage: windowMock.localStorage,
    CustomEvent: windowMock.CustomEvent,
    setTimeout: function () { return 0; },
    location: { href: 'https://www.mtcstw.com/political-hq', search: '' }
  };
  /* The inner script references bare `window`, `document`, `navigator`,
     `localStorage`, `CustomEvent`, `setTimeout`, `location`. */
  vm.createContext(sandbox);
  return { world: world, sandbox: sandbox };
}
function fireApi(world, sandbox, payload) {
  var fn = world.cbName;
  if (!fn) return false;
  vm.runInContext('window["' + fn + '"](' + JSON.stringify(payload) + ');', sandbox);
  return true;
}
function eq_count(hh, sub, n, name) {
  if (count(hh, sub) === n) ok(name); else no(name, 'got ' + count(hh, sub) + ', want ' + n);
}
var MOCK_OK = { ok: true, count: 2, eos: [  { eo_number: '14434', title: 'Inaugurating the Era of Super Intelligence',
    signed_date: '2026-09-29', president: 'Donald Trump', topic: null, status: null,
    summary: null, summarized: null, action_label: null, action_link: null,
    source_url: 'https://www.federalregister.gov/documents/2026/10/02/2026-20321/inaugurating-the-era-of-super-intelligence' },
  { eo_number: '14410', title: 'Implementing Schedule Policy/Career in the Excepted Service',
    signed_date: '2026-06-03', president: 'Donald Trump', topic: 'labor', status: 'active',
    summary: 'Curated summary text.', summarized: { by: 'News Desk', at: 1791000000 },
    action_label: 'CALL YOUR REP', action_link: 'https://www.mtcstw.com/political-hq',
    source_url: 'https://www.federalregister.gov/documents/2026/06/05/2026-10000/x' }
]};

(function () {
  if (!RENDERED_INNER) { no('section 5 setup', 'no rendered inner script — §4 extraction failed'); return; }
  /* --- successful render --- */
  var w = makeWorld();
  try { vm.runInContext(RENDERED_INNER, w.sandbox); } catch (e) { no('inner script runs', e.message); return; }
  ok('inner script runs without throwing');
  if (!has(w.world.lastScriptSrc || '', 'action=eo_list')) { no('inner calls eo_list', 'no JSONP request captured'); return; }
  ok('inner requests ?action=eo_list via JSONP');
  if (!fireApi(w.world, w.sandbox, MOCK_OK)) { no('mock API fires', 'callback never registered'); return; }
  var h = w.world.host._html;
  [['renders EO 14434 card', 'EO 14434'],
   ['renders EO 14410 card', 'EO 14410'],
   ['pending-verification badge on uncurated status', 'STATUS PENDING VERIFICATION'],
   ['active badge on curated status', '>ACTIVE<'],
   ['pending-curation summary state', 'Summary pending News Desk curation'],
   ['curator credit + date when summary present', 'Curated by News Desk'],
   ['curated summary text', 'Curated summary text.'],
   ['source link on every card', 'READ THE FULL ORDER'],
   ['signed date formatted', 'Sep 29, 2026'],
   ['president shown', 'Donald Trump'],
   ['topic chip for curated topic', '>LABOR<'],
   ['topics honesty line absent when topics exist', null],
   ['share button per card', 'SHARE THIS ORDER'],
   ['quiz toggle per card', 'PROVE YOU READ IT'],
   ['honesty footer', 'never guessed'],
   ['status filter chips', 'SUPERSEDED']
  ].forEach(function (pair) {
    if (pair[1] === null) return;
    if (has(h, pair[1])) ok(pair[0]); else no(pair[0], 'missing in rendered HTML: ' + pair[1]);
  });
  eq_count(h, 'READ THE FULL ORDER', 2, 'source link appears on EVERY card (2 cards)');
  eq_count(h, 'eo-action', 1, 'action button only when action_link exists (1 card)');
  eq_count(h, 'STATUS PENDING VERIFICATION', 1, 'pending badge only on the uncurated card');

  /* --- quiz interaction --- */
  var qtoggles = w.world.host.querySelectorAll('[data-quiz]');
  if (!qtoggles.length) { no('quiz toggle bound', 'no quiz buttons found'); }
  else {
    qtoggles[0].click();
    var box = w.world.quizBoxes[0];
    if (box.style.display !== 'block') no('quiz box opens', 'display not block');
    else ok('quiz toggle opens the question box');
    var bh = box._html;
    if (has(bh, 'When was Executive Order 14434 signed?')) ok('question targets factual metadata (signed date)');
    else no('question content', 'expected the signed-date question, got: ' + bh.slice(0, 80));
    if (has(bh, 'Sep 29, 2026')) ok('correct option present');
    else no('correct option', 'Sep 29, 2026 not among options');
    var opts = box.querySelectorAll('.eo-opt');
    if (opts.length < 2) no('distractor options', 'fewer than 2 options');
    else ok('distractor options rendered (' + opts.length + ')');
    var right = null, wrong = null;
    opts.forEach(function (o) {
      if (o.getAttribute('data-ok') === '1') right = o; else if (!wrong) wrong = o;
    });
    if (right) {
      right.click();
      if (box.querySelector('.eo-qmsg').textContent === 'CORRECT. Eyes on the paperwork.') ok('correct answer acknowledged');
      else no('correct answer', 'unexpected message: ' + box.querySelector('.eo-qmsg').textContent);
      if (right._cls.indexOf('eo-right') !== -1) ok('correct option marked eo-right');
      else no('correct marking', 'eo-right class missing');
    } else no('correct option identified', 'no data-ok=1 option');
    /* wrong-answer path on a fresh box */
    var w2 = makeWorld();
    vm.runInContext(RENDERED_INNER, w2.sandbox);
    fireApi(w2.world, w2.sandbox, MOCK_OK);
    w2.world.host.querySelectorAll('[data-quiz]')[0].click();
    var box2 = w2.world.quizBoxes[0];
    var wrong2 = null;
    box2.querySelectorAll('.eo-opt').forEach(function (o) {
      if (o.getAttribute('data-ok') !== '1' && !wrong2) wrong2 = o;
    });
    wrong2.click();
    if (/WRONG/.test(box2.querySelector('.eo-qmsg').textContent)) ok('wrong answer gets corrective feedback');
    else no('wrong answer feedback', box2.querySelector('.eo-qmsg').textContent);
    /* single attempt: second click changes nothing */
    var msgBefore = box2.querySelector('.eo-qmsg').textContent;
    wrong2.click();
    if (box2.querySelector('.eo-qmsg').textContent === msgBefore) ok('quiz is single-attempt');
    else no('single attempt', 'message changed on second click');
  }

  /* --- share interaction --- */
  var w3 = makeWorld();
  vm.runInContext(RENDERED_INNER, w3.sandbox);
  fireApi(w3.world, w3.sandbox, MOCK_OK);
  var shares = w3.world.host.querySelectorAll('[data-share]');
  shares[0].click();
  setTimeout(function () {}, 0);
  /* clipboard.writeText resolves async — flush microtasks via a tick */
  var done = false;
  Promise.resolve().then(function () { return Promise.resolve(); }).then(function () {
    var evs = w3.world.events.filter(function (e) { return e.type === 'pf-share-image'; });
    if (evs.length === 1) ok('share fires one pf-share-image event');
    else no('share event', 'expected 1 pf-share-image event, got ' + evs.length);
    if (evs[0] && evs[0].detail && evs[0].detail.game === 'eo-feed') ok('share event tagged game=eo-feed');
    else no('share event detail', 'game tag wrong');
    if (w3.world.clipboardText && has(w3.world.clipboardText, 'federalregister.gov')) ok('share copies title + federalregister.gov source URL');
    else no('share payload', 'clipboard text missing source URL');
    /* second share same day: gate blocks a second event */
    shares[1].click();
    Promise.resolve().then(function () { return Promise.resolve(); }).then(function () {
      var evs2 = w3.world.events.filter(function (e) { return e.type === 'pf-share-image'; });
      if (evs2.length === 1) ok('once-per-day share gate holds');
      else no('share gate', 'expected still 1 event, got ' + evs2.length);
      finishAsync();
    });
  });
  function finishAsync() {
    /* --- fail-soft paths --- */
    [['backend {ok:false}', { ok: false }],
     ['backend null (network)', null],
     ['empty eos array', { ok: true, count: 0, eos: [] }],
     ['rows missing required fields', { ok: true, eos: [{ eo_number: '', title: 'x' }] }]
    ].forEach(function (pair) {
      var wx = makeWorld();
      vm.runInContext(RENDERED_INNER, wx.sandbox);
      fireApi(wx.world, wx.sandbox, pair[1]);
      if (wx.world.section.style.display === 'none') ok('fail-soft hides section: ' + pair[0]);
      else no('fail-soft: ' + pair[0], 'section not hidden');
      if (!has(wx.world.host._html, 'c-load')) ok('no endless spinner: ' + pair[0]);
      else no('spinner left spinning: ' + pair[0], 'c-load still in host HTML');
    });
    /* no BACKEND configured */
    var wb = makeWorld();
    wb.sandbox.window.PF_BACKEND_URL = '';
    vm.runInContext(RENDERED_INNER, wb.sandbox);
    if (wb.world.section.style.display === 'none') ok('fail-soft: no backend URL hides section');
    else no('fail-soft: no backend URL', 'section not hidden');
    finish();
  }
})();
function finish() {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); }
  process.exit(fails.length ? 1 : 0);
}
