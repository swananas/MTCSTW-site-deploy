#!/usr/bin/env node
/* tests/verify-feed-dest-engage.js — verification harness for
 * site/v1.4.3/core/45-feed-dest-engage.js (WS-3 feed destinations 3-6,
 * dir-20261010-021406-30107).
 * Static assertions (contract + safety) + vm DOM-shim runtime checks:
 *   1. kill switch ?pf_off=feed-dest-engage -> module inert
 *   2. PFFeedDest API surface exposed (attach/detach/open/close/demo/
 *      scan/cardIdFor/cardFromEl/paint/shareText/followUpsFor)
 *   3. cardIdFor matches WS-1 scheme <rail>-<base36 hash32(q)>
 *   4. attach() injects the 4-button bar (deploy/ask/related/track)
 *   5. share-image CTA standard: 'JOIN THE FIGHT.' + MTCSTW.COM in painter
 *   6. canvas-less env -> paint() returns null, no throw
 *   7. local share text contains headline + facts + mtcstw.com
 *   8. follow-ups: prefilled deep-dive + >=3 suggestions, all /karl?q= links
 *   9. sheets open per destination without throwing (deploy/ask/related/track)
 *  10. related endpoint failure -> honest-empty, never a spinner
 *  11. track toggles persist to localStorage with on-device fallback copy
 *  12. no-XP grep: no xpGrant/addXP/XP minting; no auth requirement;
 *      no javascript: URLs; no 'spinner' strings (skeleton-first rule)
 * Run: node tests/verify-feed-dest-engage.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'core', '45-feed-dest-engage.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, pending = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
function asyncDone() { if (--pending === 0) finish(); }
function finish() {
  console.log(failures === 0 ? '\nALL GREEN' : '\n' + failures + ' FAILURE(S)');
  process.exit(failures === 0 ? 0 : 1);
}

/* ---------- static assertions ---------- */
ok('kill switch PF.skip("feed-dest-engage")', src.indexOf("PF.skip('feed-dest-engage')") !== -1);
ok('CTA standard JOIN THE FIGHT.', src.indexOf('JOIN THE FIGHT.') !== -1);
ok('CTA standard MTCSTW.COM', src.indexOf('MTCSTW.COM') !== -1);
ok('endpoint GET /api/feed/card/:cardId/share', src.indexOf('/api/feed/card/') !== -1);
ok('endpoint GET /api/karl/related', src.indexOf('/api/karl/related') !== -1);
ok('endpoint POST /api/feed/save', src.indexOf('/api/feed/save') !== -1);
ok('endpoint POST /api/feed/follow-topic', src.indexOf('/api/feed/follow-topic') !== -1);
ok('endpoint POST /api/feed/alert', src.indexOf('/api/feed/alert') !== -1);
ok('WS-1 contract: data-kh-card', src.indexOf('data-kh-card') !== -1);
ok('WS-1 contract: KH_REG', src.indexOf('KH_REG') !== -1);
ok('no XP minting', !/xpGrant|addXP|awardXP|grantXP/i.test(src));
ok('no auth gate', !/requireCallsign|PF\.auth|authGetJSONP/i.test(src));
ok('no javascript: URLs possible', !/javascript:/i.test(src));
ok('no spinners (skeleton-first rule)',
  !/spinner-|spinner_|class="[^"]*spinner|id="[^"]*spinner/i.test(src) && src.indexOf('fde-sk') !== -1);
ok('prefers-reduced-motion honored', src.indexOf('prefers-reduced-motion') !== -1);
ok('demo mode ?fde_demo=1', src.indexOf('fde_demo=1') !== -1);
ok('demo has 3 sample cards', (src.match(/kind: 'inference'|kind: 'discovery'/g) || []).length >= 3);

/* ---------- DOM shim ---------- */
function makeEl(tag) {
  var el = {
    tagName: String(tag || 'div').toUpperCase(), children: [], attrs: {}, style: {},
    _innerHTML: '', textContent: '', parentNode: null, _qs: {}, _listeners: {},
    classList: {
      _c: [],
      add: function (c) { if (this._c.indexOf(c) < 0) this._c.push(c); },
      remove: function (c) { var i = this._c.indexOf(c); if (i >= 0) this._c.splice(i, 1); },
      contains: function (c) { return this._c.indexOf(c) >= 0; }
    },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore: function (c, ref) { this.children.push(c); c.parentNode = this; return c; },
    remove: function () { if (this.parentNode) { var i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } },
    addEventListener: function (t, fn) { this._listeners[t] = fn; },
    removeEventListener: function () {},
    click: function () { if (this._listeners.click) this._listeners.click({ stopPropagation: function () {} }); },
    querySelector: function (sel) {
      if (!this._qs[sel]) {
        var stub = makeEl('stub');
        /* sheet chrome: return stable stubs for the known ids/classes */
        this._qs[sel] = stub;
      }
      return this._qs[sel];
    },
    querySelectorAll: function () { return []; },
    scrollIntoView: function () {},
    select: function () {},
    focus: function () {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._innerHTML; },
    set: function (v) { this._innerHTML = String(v); }
  });
  return el;
}

function makeEnv(opts) {
  opts = opts || {};
  var lsData = {};
  var body = makeEl('body');
  var head = makeEl('head');
  var created = [];
  var doc = {
    readyState: 'complete',
    body: body, head: head,
    createElement: function (tag) {
      var el;
      if (opts.noCanvas && String(tag).toLowerCase() === 'canvas') el = {};
      else el = makeEl(tag);
      created.push(el);
      return el;
    },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    execCommand: function () { return false; }
  };
  var win = {
    PF: {
      skip: function (silo) { return !!opts.killed && silo === 'feed-dest-engage'; },
      error: function () {}
    },
    PF_BACKEND_URL: opts.backend || '',
    location: { origin: 'https://mtcstw.com', search: opts.search || '', href: 'https://mtcstw.com/' },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null; },
      setItem: function (k, v) { lsData[k] = String(v); },
      removeItem: function (k) { delete lsData[k]; },
      _data: lsData
    },
    navigator: opts.navigator || {},
    document: doc,
    fetch: opts.fetch || function () { return Promise.reject(new Error('no network')); },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    URL: URL,
    MutationObserver: undefined
  };
  win.window = win;
  return { win: win, doc: doc, body: body, head: head, lsData: lsData, created: created,
    sheetBody: function () {
      for (var i = 0; i < created.length; i++) {
        var el = created[i];
        if (el._innerHTML && el._innerHTML.indexOf('fde-title') !== -1 && el._qs['#fde-body']) {
          return el._qs['#fde-body'];
        }
      }
      return null;
    } };
}

function loadModule(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(src, ctx, { filename: '45-feed-dest-engage.js' });
  return env.win.PFFeedDest;
}

/* ---------- runtime assertions ---------- */

/* 1. kill switch -> inert */
(function () {
  var env = makeEnv({ killed: true });
  var api = loadModule(env);
  ok('kill switch: PFFeedDest undefined when ?pf_off=feed-dest-engage', api === undefined);
})();

var env = makeEnv({});
var FDE = loadModule(env);
ok('PFFeedDest exposed', !!FDE);
['attach', 'detach', 'open', 'close', 'demo', 'scan', 'cardIdFor', 'cardFromEl', 'paint', 'shareText', 'followUpsFor']
  .forEach(function (k) { ok('API surface: ' + k, FDE && typeof FDE[k] === 'function'); });

/* 3. cardId scheme */
(function () {
  var id = FDE.cardIdFor('rent', 'Who is driving up rent?');
  ok('cardIdFor scheme <rail>-<base36>', /^rent-[0-9a-z]+$/.test(id), id);
  ok('cardIdFor deterministic', FDE.cardIdFor('rent', 'Who is driving up rent?') === id);
  ok('cardIdFor differs per question', FDE.cardIdFor('rent', 'Other question?') !== id);
})();

/* 4. attach() bar */
function sampleCard() {
  return {
    id: FDE.cardIdFor('rent', 'Who is driving up rent in your town?'),
    question: 'Who is driving up rent in your town?',
    answer_html: 'Corporate landlords bought <b>1 in 4</b> starter homes.',
    figures: [
      { label: 'Starter homes bought by investors', value: '1 in 4', source: 'RECEIPTS — deeds' },
      { label: 'Rent hike since 2020', value: '+31%', source: 'RECEIPTS — ACS' }
    ],
    source: 'RECEIPTS — county deeds · Census ACS',
    deep_link: '/town', rail: 'rent', updated_at: '2h ago', kind: 'inference',
    followUps: ['Which landlords own the most near me?'],
    creators: [{ name: 'Moreno Neurospicy News', reach: '130K+', href: '/sick-left-radicals' }]
  };
}
(function () {
  var cardEl = makeEl('div');
  var attached = FDE.attach(cardEl, sampleCard());
  ok('attach() returns true', attached === true);
  var bar = cardEl._pfFdeBar;
  ok('bar injected', !!bar);
  var kinds = bar.children.map(function (b) { return b.getAttribute('data-fde'); });
  ok('bar has deploy/ask/related/track', JSON.stringify(kinds) === JSON.stringify(['deploy', 'ask', 'related', 'track']), kinds.join(','));
  ok('attach() idempotent', FDE.attach(cardEl, sampleCard()) === false);
  var fromEl = FDE.cardFromEl(cardEl);
  ok('cardFromEl normalizes programmatic data', fromEl && fromEl.id === sampleCard().id && fromEl.facts.length === 2);
  FDE.detach(cardEl);
  ok('detach() removes bar', !cardEl._pfFdeBar);
})();

/* 5/6. painter */
(function () {
  var noCanvasEnv = makeEnv({ noCanvas: true });
  var F2 = loadModule(noCanvasEnv);
  var r = null, threw = false;
  try { r = F2.paint({ q: 'Q?', facts: [{ label: 'L', value: 'V' }], src: 'S' }); }
  catch (e) { threw = true; }
  ok('paint() null without canvas, no throw', r === null && !threw);
})();

/* 7. share text */
(function () {
  var t = FDE.shareText({ q: 'Who is driving up rent?', headline: '', facts: [{ label: 'Rent hike', value: '+31%' }], src: 'RECEIPTS — ACS' });
  ok('shareText has headline', t.indexOf('Who is driving up rent?') !== -1);
  ok('shareText has facts', t.indexOf('+31%') !== -1);
  ok('shareText has mtcstw.com', t.indexOf('mtcstw.com') !== -1);
})();

/* 8. follow-ups */
(function () {
  var fus = FDE.followUpsFor({ q: 'Who is driving up rent?', headline: 'Rent', facts: [{ label: 'Rent hike', value: '+31%' }], src: 'RECEIPTS', followUps: ['Which landlords own the most near me?'] });
  ok('followUps >= 3', fus.length >= 3, String(fus.length));
  ok('followUps carry card followUps first', fus[0].q === 'Which landlords own the most near me?');
  ok('followUps derive from facts', fus.some(function (f) { return f.q.indexOf('+31%') !== -1; }));
})();

/* 9. sheets open per destination */
(function () {
  var card = sampleCard();
  var views = ['deploy', 'ask', 'related', 'track'];
  views.forEach(function (v) {
    var threw = false;
    try { FDE.open({ id: card.id, q: card.question, headline: card.question, facts: card.figures.map(function (f) { return { label: f.label, value: f.value }; }), src: card.source, href: card.deep_link, rail: card.rail, followUps: card.followUps, creators: card.creators, topic: 'rent' }, v); }
    catch (e) { threw = true; }
    ok('sheet opens: ' + v, !threw);
    FDE.close();
  });
})();

/* 10. related endpoint failure -> honest-empty (async) */
pending++;
(function () {
  var env2 = makeEnv({ fetch: function () { return Promise.reject(new Error('down')); } });
  var F3 = loadModule(env2);
  var card = { id: 'rent-abc', q: 'Q?', headline: 'Q?', facts: [], src: '', href: '', rail: 'rent', followUps: [], creators: [], topic: 'rent' };
  F3.open(card, 'related');
  setTimeout(function () {
    var sb = env2.sheetBody();
    var listStub = sb && sb._qs['#fde-rel-list'];
    var html = listStub ? listStub.innerHTML : '';
    ok('related fail-soft renders honest-empty', html.indexOf('NOT DRAWN YET') !== -1, html.slice(0, 80));
    ok('related fail-soft keeps skeleton class contract (no spinner)', html.indexOf('spinner') === -1);
    F3.close();
    asyncDone();
  }, 400);
})();

/* 11. track toggles persist to localStorage with on-device fallback (async) */
pending++;
(function () {
  var env3 = makeEnv({ fetch: function () { return Promise.reject(new Error('down')); } });
  var F4 = loadModule(env3);
  var card = { id: 'rent-xyz', q: 'Q?', headline: 'Q?', facts: [{ label: 'L', value: 'V' }], src: 'S', href: '/town', rail: 'rent', followUps: [], creators: [], topic: 'rent' };
  F4.open(card, 'track');
  setTimeout(function () {
    var sb = env3.sheetBody();
    var saveBtn = sb && sb._qs['[data-fde-track="save"]'];
    ok('track save toggle wired', !!saveBtn);
    if (saveBtn) saveBtn.click();
    setTimeout(function () {
      var stored = null;
      try { stored = JSON.parse(env3.lsData['pf_fde_v1'] || 'null'); } catch (e) {}
      ok('save persists on-device when POST fails', !!(stored && stored.saves && stored.saves['rent-xyz']), env3.lsData['pf_fde_v1']);
      ok('unsynced flag honest (synced=false)', !!(stored && stored.saves['rent-xyz'] && stored.saves['rent-xyz'].synced === false));
      F4.close();
      asyncDone();
    }, 300);
  }, 100);
})();

/* 12. share-image CTA strings live inside the painter source (belt + suspenders) */
(function () {
  var paintSrc = src.slice(src.indexOf('function paintKarlAnswerCard'));
  ok('painter draws JOIN THE FIGHT.', paintSrc.indexOf('JOIN THE FIGHT.') !== -1);
  ok('painter draws MTCSTW.COM', paintSrc.indexOf('MTCSTW.COM') !== -1);
  ok('painter is 1080x1350', paintSrc.indexOf('1080') !== -1 && paintSrc.indexOf('1350') !== -1);
})();

if (pending === 0) finish();
else setTimeout(function () { if (pending > 0) { console.error('TIMEOUT waiting for async checks'); process.exit(1); } }, 5000);
