#!/usr/bin/env node
/* scripts/verify-ugc-asks-fe.js — UGC ask injector frontend verification.
   Run from the repo root: node scripts/verify-ugc-asks-fe.js
   1. node --check on v1.4.3/core/ugc-asks.js
   2. Static checks (kill switch, all ask definitions, all 7+ injection points,
      gas P0 ask, stacked bundle, anti-nag logic, deep-link shape, no banned
      copy, MTCSTW identity, BREATHE tokens, Next Move coordination)
   3. Mocked-browser runtime tests (vm + minimal fake DOM): card render,
      deep-link shape, dismissal memory (+persistence), frequency cap,
      contributed suppression, empty-state behavior, gas placements,
      bundle pre/post emphasis + per-leg states, gasThinnest logic,
      REPORT A PRICE retarget (+fail-soft), prefill handshake, kill switch. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SILO = 'v1.4.3/core/ugc-asks.js';
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\/])\/\/[^\n]*/g, '$1');
}

console.log('== 1. node --check ==');
try { cp.execSync('node --check ' + path.join(ROOT, SILO), { stdio: 'pipe' }); ok(SILO); }
catch (e) { no(SILO, 'node --check failed'); }

console.log('== 2. static checks ==');
var s = read(path.join(ROOT, SILO));
var bare = stripComments(s);

if (/PF\.skip\(['"]ugcasks['"]\)/.test(s)) ok('kill switch ?pf_off=ugcasks');
else no('kill switch', 'PF.skip("ugcasks") missing');
if (/PF\.UGCAsks\s*=/.test(s)) ok('PF.UGCAsks public API exported');
else no('public API', 'PF.UGCAsks export missing');

/* ask definitions: original P0+P1 set + gas + bundle legs */
var askKeys = ['gas', 'warreport_photos', 'cpi_thin', 'event_photos', 'empty_intel',
  'empty_raid', 'empty_pledge', 'pred_evidence', 'academy_work', 'cell_intel'];
var missingAsks = askKeys.filter(function (k) { return s.indexOf(k + ':') === -1 && s.indexOf("'" + k + "'") === -1; });
if (!missingAsks.length) ok('all 10 ask definitions present');
else no('ask definitions', 'missing: ' + missingAsks.join(','));
var missingLegs = ['event_leg1', 'event_leg2', 'event_leg3', 'event_leg4'].filter(function (k) { return s.indexOf(k) === -1; });
if (!missingLegs.length) ok('all 4 stacked bundle legs present');
else no('bundle legs', 'missing: ' + missingLegs.join(','));

/* injection points */
var points = [
  ['pf-warreport', 'War Report footer'],
  ['pf-inflation-checkin', '/economy price view'],
  ['pf-cell-hq', 'cell dashboards'],
  ['ce-detail', 'event pages'],
  ['pf-predgame', 'post-prediction'],
  ['pf-lesson-complete', 'post-Academy lesson'],
  ['pf-deaddrop', 'intel empty state'],
  ['pf-raid', 'raid empty state'],
  ['pf-data-bounties', 'bounty board anchor']
];
var missingPts = points.filter(function (p) { return s.indexOf(p[0]) === -1; });
if (!missingPts.length) ok('all 9 injection points present');
else no('injection points', 'missing: ' + missingPts.map(function (p) { return p[1]; }).join(','));

/* gas P0 ask (CEO priority) */
if (/Seen a gas price today\?/.test(s) && /gas_price/.test(s)) ok('gas P0 ask copy + kind');
else no('gas ask', 'gas copy or gas_price kind missing');
if (/Snap the sign for premium confirmation/.test(s) && /photo_evidence/.test(s)) ok('gas photo upsell secondary line');
else no('gas upsell', 'price-sign upsell line missing');
if (/\/create/.test(s) && /pf_kind/.test(s) && /pf_target/.test(s)) ok('deep-link: board URL + kind/target prefill params');
else no('deep-link', 'board URL or pf_kind/pf_target missing');

/* stacked bundle (§7) */
if (/RALLY DAY/.test(s) || /\|\|\s*['"]rally['"]/.test(s)) ok('bundle card title RALLY DAY (dynamic kicker, rally default)');
else no('bundle title', 'RALLY DAY missing');
var legLabels = ['CHECK IN', 'SNAP PHOTOS', 'CONFIRM THE CROWD', 'REP YOUR CELL'];
var missingLegLabels = legLabels.filter(function (l) { return s.indexOf(l) === -1; });
if (!missingLegLabels.length) ok('bundle legs: check in / snap photos / confirm crowd / rep cell');
else no('bundle leg labels', 'missing: ' + missingLegLabels.join(','));
if (/crowd_confirm/.test(s)) ok('crowd_confirm bounty kind wired');
else no('crowd_confirm', 'kind missing');
if (/'pre'/.test(s) && /'post'/.test(s)) ok('pre/post-event bundle emphasis');
else no('pre/post', 'phase handling missing');

/* anti-nag */
if (/pf_ugc_contrib_v1/.test(s) && /pf_ugc_dismiss_v1/.test(s)) ok('contributed + dismissed localStorage markers');
else no('anti-nag storage', 'marker keys missing');
if (/MAX_DISTINCT_PER_SURFACE/.test(s)) ok('max 2 distinct asks per surface per session');
else no('frequency cap', 'MAX_DISTINCT_PER_SURFACE missing');
if (/pf_ugc_seen_v1/.test(s)) ok('session seen-set for frequency cap');
else no('session cap', 'pf_ugc_seen_v1 missing');

/* contracts + copy rails */
if (!/donate/i.test(bare)) ok('no "donate" copy');
else no('banned term', '"donate" appears');
if (/MTCSTW\.COM/.test(s)) ok('MTCSTW identity');
else no('identity', 'MTCSTW.COM missing');
if (/--pf-red/.test(s) && /--pf-gold/.test(s) && /--pf-cream/.test(s) && /--pf-muted/.test(s))
  ok('BREATHE design tokens used');
else no('BREATHE', 'design tokens missing');
if (/nextMove/.test(s) && /ownsSurface/.test(s)) ok('Next Move engine coordination (no competing router)');
else no('coordination', 'nextMove ownsSurface guard missing');
if (/databounty_list/.test(s) && /gasThinnest/.test(s)) ok('gas-thinnest read from board data');
else no('gas-thinnest', 'board-data thinness check missing');
if (/[0-9]\s*XP/.test(bare.replace(/15 seconds/g, ''))) no('XP values', 'ask module must not set XP amounts');
else ok('no XP amounts set (spec: visibility only)');
if (/\.pf-ask-x/.test(s)) ok('dismiss control on every card');
else no('dismiss', '.pf-ask-x missing');

console.log('== 3. runtime tests (vm + fake DOM) ==');

/* ---------- minimal fake DOM ---------- */
function FakeEl(tag, id) {
  this.tagName = (tag || 'div').toUpperCase();
  this.id = id || '';
  this.children = [];
  this.parentNode = null;
  this._attrs = {};
  this._classes = {};
  this._insertLog = [];
  this.textContent = '';
  this.value = '';
  this.href = '';
  var self = this;
  this.classList = {
    add: function (c) { self._classes[c] = 1; },
    remove: function (c) { delete self._classes[c]; },
    contains: function (c) { return !!self._classes[c]; }
  };
}
FakeEl.prototype.setAttribute = function (k, v) { this._attrs[k] = String(v); };
FakeEl.prototype.getAttribute = function (k) { return (k in this._attrs) ? this._attrs[k] : null; };
FakeEl.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
FakeEl.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i > -1) this.children.splice(i, 1);
  c.parentNode = null; return c;
};
function matchSel(el, sel) {
  var parts = sel.split(',').map(function (x) { return x.trim(); });
  for (var i = 0; i < parts.length; i++) if (matchOne(el, parts[i])) return true;
  return false;
}
function matchOne(el, sel) {
  var m = /^([a-zA-Z][a-zA-Z0-9]*)?((?:[.#][a-zA-Z0-9_-]+)*)((?:\[[^\]]+\])?)$/.exec(sel.trim());
  if (!m) return false;
  var tag = m[1], rest = m[2] || '', attr = m[3] || '';
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  var cm = rest.match(/[.#][a-zA-Z0-9_-]+/g) || [];
  for (var i = 0; i < cm.length; i++) {
    if (cm[i][0] === '.' && !el.classList.contains(cm[i].slice(1))) return false;
    if (cm[i][0] === '#' && el.id !== cm[i].slice(1)) return false;
  }
  if (attr) {
    var am = /^\[([a-zA-Z0-9_:@-]+)(\^?=)?"?([^"\]]*)"?\]$/.exec(attr);
    if (!am) return false;
    var name = am[1], op = am[2], val = am[3];
    var av = null;
    if (name === 'href' && el.href) av = el.href;
    else av = el.getAttribute(name);
    if (op === '=') { if (av !== val) return false; }
    else if (op === '^=') { if (!av || av.indexOf(val) !== 0) return false; }
    else { if (av === null) return false; }
  }
  return true;
}
function queryAllFrom(root, sel) {
  var out = [];
  (function walk(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (matchSel(c, sel)) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}
FakeEl.prototype.querySelectorAll = function (sel) { return queryAllFrom(this, sel); };
FakeEl.prototype.querySelector = function (sel) { var r = queryAllFrom(this, sel); return r[0] || null; };
FakeEl.prototype.closest = function (sel) {
  var el = this;
  while (el) { if (matchSel(el, sel)) return el; el = el.parentNode; }
  return null;
};
FakeEl.prototype.addEventListener = function () {};
FakeEl.prototype.scrollIntoView = function () {};
FakeEl.prototype.insertAdjacentHTML = function (pos, html) {
  this._insertLog.push({ pos: pos, html: html });
  /* marker extraction so probes see rendered asks */
  var re = /data-pf-ask="([^"]+)"/g, m, host = this;
  if (pos === 'afterend' && this.parentNode) {
    while ((m = re.exec(html))) {
      var sib = new FakeEl('div');
      sib.classList.add('pf-ask'); sib.setAttribute('data-pf-ask', m[1]);
      var pi = this.parentNode.children.indexOf(this);
      sib.parentNode = this.parentNode;
      this.parentNode.children.splice(pi + 1, 0, sib);
    }
    return;
  }
  while ((m = re.exec(html))) {
    var child = new FakeEl('div');
    child.classList.add('pf-ask'); child.setAttribute('data-pf-ask', m[1]);
    var sm = /data-pf-surface="([^"]+)"/.exec(html);
    if (sm) child.setAttribute('data-pf-surface', sm[1]);
    this.appendChild(child);
  }
  /* bundle leg markers */
  var lr = /data-pf-leg="([^"]+)"/g, lm;
  while ((lm = lr.exec(html))) {
    var leg = new FakeEl('li');
    leg.classList.add('pf-ask-leg'); leg.setAttribute('data-pf-leg', lm[1]);
    this.appendChild(leg);
  }
};

function makeDoc() {
  var byId = {};
  var doc = {
    readyState: 'complete',
    head: new FakeEl('head'),
    body: new FakeEl('body'),
    _listeners: {},
    getElementById: function (id) { return byId[id] || null; },
    createElement: function (tag) { return new FakeEl(tag); },
    getElementsByTagName: function (t) { return t === 'head' ? [doc.head] : []; },
    querySelectorAll: function (sel) {
      var out = [];
      if (matchSel(doc.body, sel)) out.push(doc.body);
      return out.concat(queryAllFrom(doc.body, sel));
    },
    querySelector: function (sel) { var r = doc.querySelectorAll(sel); return r[0] || null; },
    addEventListener: function (t, fn) { (doc._listeners[t] = doc._listeners[t] || []).push(fn); },
    fire: function (t, ev) { (doc._listeners[t] || []).forEach(function (fn) { fn(ev || {}); }); }
  };
  doc.mkEl = function (id, parent) {
    var el = new FakeEl('div', id);
    byId[id] = el;
    (parent || doc.body).appendChild(el);
    return el;
  };
  return doc;
}
function makeStore() {
  var d = {};
  return {
    getItem: function (k) { return (k in d) ? d[k] : null; },
    setItem: function (k, v) { d[k] = String(v); },
    removeItem: function (k) { delete d[k]; },
    _dump: function () { return d; }
  };
}
function makeEnv(opts) {
  opts = opts || {};
  var doc = opts.doc || makeDoc();
  var ls = opts.ls || makeStore();
  var ss = opts.ss || makeStore();
  var win = {
    PF: {
      skip: function (k) { return (opts.killed || []).indexOf(k) !== -1; },
      toast: function () {},
      jsonp: opts.jsonp || null,
      nextMove: opts.nextMove || null
    },
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev/',
    location: { search: opts.search || '', href: 'https://mtcstw.com/' },
    localStorage: ls,
    sessionStorage: ss,
    document: doc,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  win.window = win;
  return { win: win, doc: doc, ls: ls, ss: ss };
}
function runSilo(env) {
  var ctx = vm.createContext(env.win);
  vm.runInContext(s, ctx, { filename: 'ugc-asks.js' });
  return vm.runInContext('window.PF.UGCAsks', ctx);
}

var finished = 0, total = 15;
function finish() {
  finished++;
  if (finished < total) return;
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
}

/* 3a. card render: gas ask copy, CTA, sub-line, dismiss, identity */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  var h = A.cardHTML('gas', { surface: 'economy' });
  if (/Seen a gas price today\?/.test(h) && /REPORT GAS PRICE/.test(h)) ok('runtime: gas card renders copy + CTA');
  else no('runtime: gas card', 'copy/CTA missing');
  if (/Snap the sign for premium confirmation/.test(h) && /data-pf-kind="photo_evidence"/.test(h))
    ok('runtime: gas card carries photo upsell as secondary line');
  else no('runtime: gas upsell', 'secondary photo_evidence line missing');
  if (/data-pf-kind="gas_price"/.test(h) && /pf-ask-x/.test(h) && /MTCSTW\.COM/.test(h))
    ok('runtime: card has kind attr, dismiss, MTCSTW identity');
  else no('runtime: card chrome', 'kind/dismiss/identity missing');
  finish();
})();

/* 3b. deep-link shape: on-page board vs off-page */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  var off = A.deepLink('gas_price', 'gulf');
  if (off.href === '/create?pf_kind=gas_price&pf_target=gulf#pf-data-bounties' && !off.onPage)
    ok('runtime: off-page deep-link = board URL + kind/target + anchor');
  else no('runtime: off-page deep-link', 'got ' + off.href);
  env.doc.mkEl('pf-data-bounties');
  var on = A.deepLink('photo_evidence', 'event:abc');
  if (on.href === '#pf-data-bounties' && on.onPage) ok('runtime: on-page deep-link jumps to board anchor');
  else no('runtime: on-page deep-link', 'got ' + on.href);
  finish();
})();

/* 3c. dismissal memory (+persistence across loads) */
(function () {
  var ls = makeStore();
  var A = runSilo(makeEnv({ ls: ls }));
  A.dismiss('gas');
  if (!A.canShow('gas', 'economy') && A.isDismissed('gas')) ok('runtime: dismissed ask suppressed');
  else no('runtime: dismiss', 'dismissed ask still showable');
  var A2 = runSilo(makeEnv({ ls: ls }));
  if (!A2.canShow('gas', 'warreport')) ok('runtime: dismissal persists across page loads');
  else no('runtime: dismiss persistence', 'dismissal lost on reload');
  finish();
})();

/* 3d. frequency cap: max 2 distinct per surface per session */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.resetSession();
  A.markShown('gas', 'economy');
  A.markShown('cpi_thin', 'economy');
  if (!A.canShow('warreport_photos', 'economy')) ok('runtime: 3rd distinct ask blocked on a surface');
  else no('runtime: frequency cap', '3rd distinct ask allowed');
  if (A.canShow('gas', 'economy')) ok('runtime: repeat of shown ask allowed (distinct-count rule)');
  else no('runtime: distinct rule', 'repeat ask wrongly blocked');
  if (A.canShow('gas', 'warreport')) ok('runtime: cap is per-surface');
  else no('runtime: per-surface', 'other surface wrongly blocked');
  finish();
})();

/* 3e. contributed suppression */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.recordContribution('cpi_thin');
  if (!A.canShow('cpi_thin', 'economy') && A.hasContributed('cpi_thin')) ok('runtime: contributed ask suppressed');
  else no('runtime: contributed', 'contributed ask still showable');
  A.markKindContributed('photo_evidence');
  if (A.hasContributed('warreport_photos') && A.hasContributed('event_leg2'))
    ok('runtime: kind-level contribution marks all matching asks + legs');
  else no('runtime: kind contribution', 'kind mapping incomplete');
  finish();
})();

/* 3f. empty-state behavior */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.resetSession();
  var emptyHost = env.doc.mkEl('pf-inflation-trends');
  emptyHost.setAttribute('data-pf-empty', '1');
  var fullHost = env.doc.mkEl('pf-deaddrop');
  fullHost.appendChild(new FakeEl('div')); /* has content -> not empty */
  A.injectAll(env.doc);
  var gasShown = emptyHost._insertLog.some(function (r) { return /data-pf-ask="gas"/.test(r.html); });
  if (gasShown) ok('runtime: empty price surface gets the gas ask as its content');
  else no('runtime: empty state', 'gas ask not injected into empty price surface');
  var intelShown = fullHost._insertLog.some(function (r) { return /pf-ask/.test(r.html); });
  if (!intelShown) ok('runtime: non-empty surface gets no empty-state ask');
  else no('runtime: empty false-positive', 'ask injected into non-empty surface');
  finish();
})();

/* 3g. gas placements: economy top, warreport footer, cell HQ */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.resetSession();
  var eco = env.doc.mkEl('pf-inflation-checkin');
  var wr = env.doc.mkEl('pf-warreport');
  var hq = env.doc.mkEl('pf-cell-hq');
  A.injectAll(env.doc);
  var ecoTop = eco._insertLog.some(function (r) { return r.pos === 'afterbegin' && /data-pf-ask="gas"/.test(r.html); });
  var wrFoot = wr._insertLog.some(function (r) { return r.pos === 'beforeend' && /pf-ask/.test(r.html); });
  var hqAsks = hq._insertLog.filter(function (r) { return /data-pf-ask="(gas|cell_intel)"/.test(r.html); }).length;
  if (ecoTop) ok('runtime: gas ask prepended at /economy price view top');
  else no('runtime: economy placement', 'gas not at top of price view');
  if (wrFoot) ok('runtime: War Report footer gets rotating ask');
  else no('runtime: warreport placement', 'no ask appended to war report');
  if (hqAsks === 2) ok('runtime: cell dashboard gets gas + cell intel asks');
  else no('runtime: cell placement', 'expected 2 asks, got ' + hqAsks);
  finish();
})();

/* 3h. bundle: pre/post emphasis, per-leg done/dismiss */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  var pre = A.bundleHTML('ev9', { phase: 'pre', evType: 'rally' });
  if (/RALLY DAY/.test(pre) && /CHECK IN/.test(pre) && /SNAP PHOTOS/.test(pre) &&
      /CONFIRM THE CROWD/.test(pre) && /REP YOUR CELL/.test(pre))
    ok('runtime: bundle renders RALLY DAY with all 4 legs');
  else no('runtime: bundle render', 'title or legs missing');
  if (/pf-ask-leg pf-leg-em[^"]*" data-pf-leg="event_leg1"/.test(pre) || /data-pf-leg="event_leg1"[^>]*pf-leg-em/.test(pre) ||
      (pre.indexOf('event_leg1') > -1 && /pf-leg-em/.test(pre.split('event_leg4')[0])))
    ok('runtime: pre-event emphasizes Leg 1 (check in)');
  else no('runtime: pre emphasis', 'leg 1 not emphasized pre-event');
  var post = A.bundleHTML('ev9', { phase: 'post', evType: 'march' });
  if (/MARCH DAY/.test(post)) ok('runtime: bundle title adapts to event type');
  else no('runtime: bundle type', 'MARCH DAY missing');
  if (/data-pf-kind="crowd_confirm"/.test(post) && /event:ev9/.test(post))
    ok('runtime: legs deep-link to bounty flows with event target');
  else no('runtime: leg deep-links', 'crowd_confirm/event target missing');
  var done = A.bundleHTML('ev9', { phase: 'post', rsvpd: true });
  if (/DONE/.test(done)) ok('runtime: RSVP marks Leg 1 done');
  else no('runtime: leg done', 'rsvpd leg not marked done');
  A.dismiss('event_leg2');
  var dis = A.bundleHTML('ev9', { phase: 'post' });
  if (dis.indexOf('event_leg2') === -1 && dis.indexOf('event_leg3') > -1)
    ok('runtime: per-leg dismissal removes only that leg');
  else no('runtime: leg dismiss', 'dismissed leg still rendered');
  finish();
})();

/* 3i. gasThinnest logic */
(function () {
  function withBounties(bounties, okFlag) {
    var env = makeEnv({
      jsonp: function () {
        return okFlag === false ? Promise.reject(new Error('down')) : Promise.resolve({ ok: true, bounties: bounties });
      }
    });
    return runSilo(env);
  }
  var A = withBounties([
    { kind: 'gas_price', need_urgency: 1.5 },
    { kind: 'cpi_price', need_urgency: 0.5 }
  ]);
  A.gasThinnest(function (thin) {
    if (thin) ok('runtime: gas thinnest when its need_urgency tops the basket');
    else no('runtime: gasThinnest', 'true case failed');
    var B = withBounties([
      { kind: 'gas_price', need_urgency: 1.0 },
      { kind: 'cpi_price', need_urgency: 1.0 }
    ]);
    B.gasThinnest(function (thin2) {
      if (!thin2) ok('runtime: tie fails soft to generic (no retarget)');
      else no('runtime: gasThinnest tie', 'tie should not retarget');
      var C = withBounties([], false);
      C.gasThinnest(function (thin3) {
        if (!thin3) ok('runtime: board-data failure fails soft to generic');
        else no('runtime: gasThinnest fail-soft', 'error should not retarget');
        var D = runSilo(makeEnv({}));
        D.gasThinnest(function (thin4) {
          if (!thin4) ok('runtime: no jsonp transport fails soft');
          else no('runtime: gasThinnest no-transport', 'should fail soft');
          finish();
        });
      });
    });
  });
})();

/* 3j. REPORT A PRICE retarget */
(function () {
  var env = makeEnv({
    jsonp: function () {
      return Promise.resolve({ ok: true, bounties: [{ kind: 'gas_price', need_urgency: 1.5 }] });
    }
  });
  var A = runSilo(env);
  A.resetSession();
  var a = new FakeEl('a');
  a.href = '/economy#pf-inflation-checkin';
  a.textContent = 'REPORT A PRICE →';
  env.doc.body.appendChild(a);
  A.retargetReportPrice(env.doc);
  setTimeout(function () {
    if (/pf_kind=gas_price/.test(a.href)) ok('runtime: REPORT A PRICE retargets to gas flow when gas thinnest');
    else no('runtime: retarget', 'href unchanged: ' + a.href);
    var env2 = makeEnv({ jsonp: function () { return Promise.reject(new Error('down')); } });
    var B = runSilo(env2);
    var b = new FakeEl('a');
    b.href = '/economy#pf-inflation-checkin';
    b.textContent = 'REPORT A PRICE →';
    env2.doc.body.appendChild(b);
    B.retargetReportPrice(env2.doc);
    setTimeout(function () {
      if (b.href === '/economy#pf-inflation-checkin') ok('runtime: retarget fails soft, CTA untouched on error');
      else no('runtime: retarget fail-soft', 'CTA rewritten despite error');
      finish();
    }, 30);
  }, 30);
})();

/* 3k. prefill handshake on the board page */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  var board = env.doc.mkEl('pf-data-bounties');
  var card = new FakeEl('div');
  card.classList.add('db-card');
  var kindEl = new FakeEl('div');
  kindEl.classList.add('db-kind');
  kindEl.textContent = 'PHOTO BOUNTY';
  card.appendChild(kindEl);
  card.textContent = 'PHOTO BOUNTY rally photos event:abc123 send your shots';
  var area = new FakeEl('input');
  area.setAttribute('data-f', 'area_key');
  area.value = '';
  card.appendChild(area);
  board.appendChild(card);
  A.stashPrefill('photo_evidence', 'event:abc123', false);
  A.applyPrefill(env.doc);
  setTimeout(function () {
    if (card.classList.contains('pf-ask-flash')) ok('runtime: prefill highlights the matching bounty card');
    else no('runtime: prefill highlight', 'matching card not flashed');
    finish();
  }, 60);
})();

/* 3l. post-lesson ask via pf-lesson-complete */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.resetSession();
  var acad = env.doc.mkEl('pf-academy');
  env.doc.fire('pf-lesson-complete', { detail: { lesson: 'l1' } });
  var shown = acad._insertLog.some(function (r) { return /data-pf-ask="academy_work"/.test(r.html); });
  if (shown) ok('runtime: pf-lesson-complete injects "Show your work" ask');
  else no('runtime: academy ask', 'no ask after lesson complete');
  if (/pf-review-pool/.test(acad._insertLog.map(function (r) { return r.html; }).join('')))
    ok('runtime: academy ask deep-links to Content Bank submit');
  else no('runtime: academy deep-link', 'review-pool link missing');
  finish();
})();

/* 3m. post-prediction ask after locked call */
(function () {
  var env = makeEnv({});
  var A = runSilo(env);
  A.resetSession();
  var pg = env.doc.mkEl('pf-predgame');
  var q = new FakeEl('div');
  q.classList.add('pq-locked');
  q.textContent = 'LOCKED IN — you called Option A.';
  pg.appendChild(q);
  A.injectAll(env.doc);
  var shown = q._insertLog.some(function (r) { return /data-pf-ask="pred_evidence"/.test(r.html); });
  if (shown) ok('runtime: post-prediction injects "Add your evidence" ask');
  else no('runtime: predgame ask', 'no ask after locked call');
  if (/data-pf-kind="intel_corroborate"/.test(q._insertLog.map(function (r) { return r.html; }).join('')))
    ok('runtime: evidence ask deep-links to intel_corroborate flow');
  else no('runtime: predgame deep-link', 'intel_corroborate link missing');
  finish();
})();

/* 3m2. event bundle mounts on .ce-detail with pre/post phase from starts_at */
(function () {
  var future = Date.now() + 86400000, past = Date.now() - 86400000;
  function envFor(startsAt) {
    return makeEnv({
      jsonp: function (action, params) {
        if (action === 'civicevent_list') return Promise.resolve({ ok: true, events: [{ id: params.id, starts_at: startsAt }] });
        return Promise.resolve(null);
      }
    });
  }
  function buildDetail(env, id) {
    var root = env.doc.mkEl('xCivicEvents');
    var detail = new FakeEl('div');
    detail.classList.add('ce-detail');
    var type = new FakeEl('span');
    type.classList.add('ce-type'); type.textContent = 'rally';
    detail.appendChild(type);
    var rsvp = new FakeEl('button');
    rsvp.setAttribute('data-ce', 'rsvp'); rsvp.setAttribute('data-id', id);
    detail.appendChild(rsvp);
    root.appendChild(detail);
    return detail;
  }
  var envPre = envFor(future);
  var Apre = runSilo(envPre);
  Apre.resetSession();
  var dPre = buildDetail(envPre, 'ev-pre');
  Apre.mountEventBundle(envPre.doc);
  var envPost = envFor(past);
  var Apost = runSilo(envPost);
  Apost.resetSession();
  var dPost = buildDetail(envPost, 'ev-post');
  Apost.mountEventBundle(envPost.doc);
  setTimeout(function () {
    var preHtml = dPre._insertLog.map(function (r) { return r.html; }).join('');
    var postHtml = dPost._insertLog.map(function (r) { return r.html; }).join('');
    if (/data-pf-ask="event_bundle"/.test(preHtml) && /event:ev-pre/.test(preHtml))
      ok('runtime: pre-event detail mounts bundle with event target');
    else no('runtime: bundle mount pre', 'bundle missing on pre-event detail');
    if (/data-pf-ask="event_bundle"/.test(postHtml) && /event:ev-post/.test(postHtml))
      ok('runtime: post-event detail mounts bundle with event target');
    else no('runtime: bundle mount post', 'bundle missing on post-event detail');
    /* idempotence: second mount is a no-op */
    var n0 = dPre._insertLog.length;
    Apre.mountEventBundle(envPre.doc);
    setTimeout(function () {
      if (dPre._insertLog.length === n0) ok('runtime: bundle mount is idempotent');
      else no('runtime: bundle idempotence', 'double-mounted');
      finish();
    }, 60);
  }, 60);
})();

/* 3n. kill switch: module inert */
(function () {
  var env = makeEnv({ killed: ['ugcasks'] });
  var ctx = vm.createContext(env.win);
  vm.runInContext(s, ctx, { filename: 'ugc-asks.js' });
  var api = vm.runInContext('window.PF.UGCAsks', ctx);
  if (api === undefined) ok('runtime: ?pf_off=ugcasks leaves PF.UGCAsks undefined');
  else no('runtime: kill switch', 'module active despite kill flag');
  finish();
})();
