#!/usr/bin/env node
/* scripts/verify-robreport.js — THE ROBBERY REPORT frontend verification
   (fe/robbery-report, 2026-10-06). Run from the worktree root:
     node scripts/verify-robreport.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on the data module, render module, money-page.js,
      build/bundle-core.js, and this harness.
   2. FORMULA AUDIT: every card's published figures recompute from the raw
      inputs in core/robreport-data.js via independently written math
      (rounding: nearest $0.25; $0.50 for 3-digit items; value-chain layers
      nearest $0.05 when price < $5 else $0.25; cost = step(price*phi - take)
      so the bar sums to the revenue base). Corrections applied: Chipotle
      margin leg 25.4% (8-K), Nike phi 0.70.
   3. Completeness: 29 item cards + the excluded note (30 cards total:
      12 pilot slots incl. excluded + 18 staples), each with cls badge,
      SEC EDGAR receipt URL, band (or stated sensitivity range for Class V),
      one-sentence can't-prove line, tagline; SEGMENT vs BLENDED badge
      distinction (Colgate = SEGMENT, other 15 staples = BLENDED).
   4. Baskets: 4 baskets, totals recompute from items×qty, stated
      assumptions present, per-item breakdown exists.
   5. Copy/defamation rules (comment-stripped view, NO string stripping —
      AGENTS.md lesson): no fraud/lied/lying/scam/cheat/donate anywhere in
      code; read-only (no POST); zero XP code.
   6. Kill switches: ?pf_off=robreport in robreport.js + money-page section.
   7. Bundle registration: data+render in MONEY_FILES; PFRobReport present
      in the rebuilt core/bundle-money.js.
   8. DOM smoke (vm + minimal stub): mount() renders 33 P2 intel cards +
      33 P4 data strips + the excluded note + 33 <details> (wonks one tap
      deep) + 33 share links; 33 painters registered; painters fail
      soft with no canvas; kill → no exposure; mount(null) → false.
      Fail-open fallback (patterns killed): 33 legacy cards/strips with the
      same source+recency contract. Fail-closed figure: an item that loses
      its EDGAR anchor loses its strip. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var C = path.join(ROOT, 'v1.4.3', 'core');
var DATA_MOD = path.join(C, 'robreport-data.js');
var RENDER_MOD = path.join(C, 'robreport.js');
var MONEY_PAGE = path.join(C, 'money-page.js');
var BUILD_JS = path.join(ROOT, 'build', 'bundle-core.js');
var BUNDLE_MONEY = path.join(C, 'bundle-money.js');

var fails = [];
function ok(cond, msg) { if (!cond) fails.push(msg); }
function checkFile(p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); }
  catch (e) { fails.push('node --check failed: ' + p); }
}
[DATA_MOD, RENDER_MOD, MONEY_PAGE, BUILD_JS, __filename].forEach(checkFile);

/* Strip block comments + full-line // comments only (never touch strings). */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .filter(function (l) { return !/^\s*\/\//.test(l); })
            .join('\n');
}
var dataSrc = fs.readFileSync(DATA_MOD, 'utf8');
var renderSrc = fs.readFileSync(RENDER_MOD, 'utf8');
var dataCode = codeOnly(dataSrc);
var renderCode = codeOnly(renderSrc);

/* ---------- load data in a sandbox ---------- */
function loadData(extraWin) {
  var win = Object.assign({
    PF_BACKEND_URL: ''
  }, extraWin || {});
  win.window = win;
  var sandbox = { window: win, document: null, console: console };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox, { filename: 'robreport-data.js' });
  return sandbox.window.PFRobReportData;
}
var D = loadData();
ok(D && Array.isArray(D.ITEMS), 'PFRobReportData.ITEMS missing');
ok(D.ITEMS.length === 29, 'expected 29 item cards, got ' + (D.ITEMS && D.ITEMS.length));
ok(D.EXCLUDED && D.EXCLUDED.num === 12, 'excluded card must be #12 (29 items + excluded = 30 cards)');
ok(D.BASKETS.length === 4, 'expected 4 baskets, got ' + (D.BASKETS && D.BASKETS.length));

/* ---------- independent math ---------- */
function r25(x) { return Math.round(x / 0.25) * 0.25; }
function r50(x) { return Math.round(x / 0.50) * 0.50; }
function r05(x) { return Math.round(x / 0.05) * 0.05; }
/* Value-chain layer granularity follows the price magnitude: a $0.25 step
   would crush a $0.14 layer, so sub-$5 items use $0.05. */
function vRound(price, x) { return price < 5 ? r05(x) : r25(x); }
function near(a, b) { return Math.abs(a - b) < 1e-9; }
/* One sentence = one terminator; protect decimals (29.6%) from the split. */
function sentenceCount(s) {
  var t = String(s).replace(/(\d)\.(\d)/g, '$1DEC$2');
  return t.split(/[.!?]+/).filter(function (x) { return x.trim().length > 0; }).length;
}

var byId = {};
D.ITEMS.forEach(function (it) { byId[it.id] = it; });

var seenNums = {};
D.ITEMS.forEach(function (it) {
  ok(Number.isInteger(it.num) && it.num >= 1 && it.num <= 30, it.id + ': bad card num');
  ok(!seenNums[it.num], it.id + ': duplicate card num ' + it.num);
  seenNums[it.num] = 1;
  var m = it.math, step = (m.step === 0.50) ? r50 : r25;
  if (m.kind === 'D') {
    ok(near(it.cost, r25(m.price * m.costRatio)), it.id + ': cost recompute fail');
    ok(near(it.take, r25(m.price * m.takeRatio)), it.id + ': take recompute fail');
  } else if (m.kind === 'S') {
    var takeExp = step(m.price * m.phi * m.g);
    ok(near(it.take, takeExp), it.id + ': take recompute fail');
    ok(near(it.cost, step(m.price * m.phi - takeExp)), it.id + ': cost recompute fail');
    ok(Math.abs(it.r - m.price * m.phi) < 0.005, it.id + ': R recompute fail');
    ok(it.takePct === (m.g * 100).toFixed(1), it.id + ': takePct mismatch ' + it.takePct);
  } else if (m.kind === 'V') {
    var lW = vRound(m.price, m.price * m.r);
    var wb = (1 - m.r) * m.price;
    var lB = vRound(m.price, wb * m.b);
    var bb = (1 - m.b) * wb;
    var lK = vRound(m.price, m.k * m.sMid * bb);
    var lKlo = vRound(m.price, m.k * m.sLo * bb);
    var lKhi = vRound(m.price, m.k * m.sHi * bb);
    ok(near(it.layers[0].amt, lW), it.id + ': walmart layer recompute fail');
    ok(near(it.layers[1].amt, lB), it.id + ': bottler layer recompute fail');
    ok(near(it.layers[2].amt, lK), it.id + ': KO layer recompute fail');
    ok(near(it.takeMid, r25(it.layers[0].amt + it.layers[1].amt + it.layers[2].amt)), it.id + ': takeMid recompute fail');
    ok(near(it.takeLo, it.takeMid - (lK - lKlo)), it.id + ': takeLo range fail');
    ok(near(it.takeHi, it.takeMid + (lKhi - lK)), it.id + ': takeHi range fail');
    ok(it.bandPP == null, it.id + ': Class V must not carry a ±pp band');
    ok(/sensitivity range/i.test(it.bandLabel), it.id + ': Class V needs sensitivity-range label');
  } else if (m.kind === 'R') {
    ok(near(it.take, r25(m.price * m.r)), it.id + ': take recompute fail');
    ok(near(it.cost, r25(m.price * (1 - m.r))), it.id + ': cost recompute fail');
  } else if (m.kind === 'R2') {
    it.legs.forEach(function (l, i) {
      ok(near(l.take, r25(m.prices[i] * m.r)), it.id + ': leg ' + i + ' take recompute fail');
    });
  } else {
    fails.push(it.id + ': unknown math kind ' + m.kind);
  }
  /* Completeness */
  ok(['DIRECT', 'SEGMENT', 'VALUE-CHAIN', 'RETAIL', 'BLENDED'].indexOf(it.cls) >= 0, it.id + ': bad cls badge ' + it.cls);
  ok(Array.isArray(it.receipt) && it.receipt.length > 0, it.id + ': missing receipt');
  it.receipt.forEach(function (r) {
    ok(/^https:\/\/www\.sec\.gov\/Archives\/edgar\//.test(r.url), it.id + ': receipt URL not a real EDGAR doc link');
  });
  ok(typeof it.bandLabel === 'string' && it.bandLabel.length > 0, it.id + ': missing band label');
  if (it.cls !== 'VALUE-CHAIN') ok(typeof it.bandPP === 'number', it.id + ': missing ±pp band');
  ok(typeof it.cantProve === 'string' && it.cantProve.length > 0, it.id + ': missing can\'t-prove');
  ok(sentenceCount(it.cantProve) === 1, it.id + ': can\'t-prove must be ONE sentence (got ' + sentenceCount(it.cantProve) + ')');
  ok('cpiSeries' in it, it.id + ': missing cpiSeries key');
  ok(Array.isArray(it.notes) && it.notes.length > 0, it.id + ': missing notes');
  ok(typeof it.price === 'number' || it.price === null, it.id + ': bad price');
});
/* Spot-check the two News Desk corrections */
ok(near(byId.burrito.take, 2.50) && byId.burrito.takePct === '25.4', 'burrito: Chipotle 25.4% re-anchor not applied');
ok(near(byId['chips-guac'].take, 1.50), 'chips-guac: 25.4% re-anchor not applied');
ok(near(byId.pegasus.take, 45.00) && near(byId.pegasus.cost, 60.00) && near(byId.pegasus.r, 105.00),
   'pegasus: phi=0.70 re-estimate not applied');
/* Badge distinction */
['colgate', 'palmolive', 'irish-spring'].forEach(function (id) {
  ok(byId[id].cls === 'SEGMENT', id + ': Colgate must badge SEGMENT (true segment GM)');
});
['ketchup', 'mac-cheese', 'philly', 'cheerios', 'yoplait', 'cake-mix', 'kleenex', 'scott-tp',
 'huggies', 'dove', 'hellmanns', 'axe', 'bleach', 'wipes', 'glad'].forEach(function (id) {
  ok(byId[id].cls === 'BLENDED', id + ': ' + id + ' must badge BLENDED');
});
/* Rounding rule on every published dollar */
function auditDollars(v, ctx, allow005) {
  if (typeof v !== 'number') return;
  var q = allow005 ? Math.round(v / 0.05) * 0.05 : Math.round(v / 0.25) * 0.25;
  ok(near(v, q), ctx + ': ' + v + ' violates the rounding rule');
}
D.ITEMS.forEach(function (it) {
  var big = it.price != null && it.price >= 100; /* 3-digit items: $0.50 step */
  auditDollars(it.cost, it.id + '.cost');
  auditDollars(it.take, it.id + '.take');
  if (big) {
    ok(near(it.cost, r50(it.cost)) && near(it.take, r50(it.take)), it.id + ': 3-digit item needs $0.50 step');
  }
  (it.layers || []).forEach(function (l, i) {
    var stepFn = (it.price < 5) ? r05 : r25;
    ok(near(l.amt, stepFn(l.amt)), it.id + '.layer' + i + ': ' + l.amt + ' violates the V rounding rule');
  });
  (it.segments || []).forEach(function (s, i) { auditDollars(s.amt, it.id + '.seg' + i); });
});
/* Excluded card */
ok(D.EXCLUDED && /franchise/i.test(D.EXCLUDED.note), 'excluded Big Mac note missing franchise-model reason');
ok(!('take' in D.EXCLUDED) && !('price' in D.EXCLUDED), 'excluded card must carry no figures');

/* ---------- baskets ---------- */
D.BASKETS.forEach(function (b) {
  var paid = 0, take = 0;
  b.items.forEach(function (bi) {
    var it = byId[bi.ref];
    ok(!!it, b.id + ': unknown ref ' + bi.ref);
    if (!it) return;
    paid += it.price * bi.qty;
    take += (it.cls === 'VALUE-CHAIN' ? it.takeMid : it.take) * bi.qty;
  });
  paid = Math.round(paid * 100) / 100; take = Math.round(take * 100) / 100;
  ok(near(b.paid, paid), b.id + ': paid recompute fail (' + b.paid + ' vs ' + paid + ')');
  ok(near(b.take, take), b.id + ': take recompute fail (' + b.take + ' vs ' + take + ')');
  ok(near(b.cost, Math.round((paid - take) * 100) / 100), b.id + ': cost recompute fail');
  ok(b.takePct === (take / paid * 100).toFixed(1), b.id + ': takePct mismatch');
  ok(typeof b.assumptions === 'string' && b.assumptions.length > 0, b.id + ': missing stated assumptions');
  ok(/assumption/i.test(b.assumptions), b.id + ': assumptions must be labeled as assumptions');
  ok(typeof b.tagline === 'string' && /lost/.test(b.tagline), b.id + ': missing household-lost tagline');
});
ok(D.TAGLINE === 'Estimated from their own filings.', 'TAGLINE wrong');
ok(renderCode.indexOf('D.TAGLINE') >= 0, 'render module never prints the tagline');

/* ---------- copy / defamation / read-only / zero-XP rules ---------- */
var both = dataCode + '\n' + renderCode;
['fraud', 'lied', 'lying', 'scam', 'cheat', 'donate'].forEach(function (t) {
  ok(!new RegExp('\\b' + t + '\\b', 'i').test(both), 'banned token in code: ' + t);
});
ok(!/method\s*:\s*['"]POST['"]/i.test(renderCode), 'read-only violation: POST in robreport.js');
ok(!/xpGrant|creditShare|pfCreditShare|\+50 XP|XP\b(?!.*ZERO)/.test(renderCode), 'XP code in robreport.js');
ok(/ZERO XP/.test(renderSrc), 'zero-XP doc line missing from robreport.js');

/* ---------- kill switches ---------- */
ok(/PF\.skip\(['"]robreport['"]\)/.test(renderSrc), 'robreport.js missing PF.skip kill');
var mpSrc = fs.readFileSync(MONEY_PAGE, 'utf8');
ok(/key:\s*['"]robreport['"]/.test(mpSrc) && /kill:\s*['"]robreport['"]/.test(mpSrc),
   'money-page.js missing robreport section with kill switch');

/* ---------- bundle registration ---------- */
var buildSrc = fs.readFileSync(BUILD_JS, 'utf8');
ok(buildSrc.indexOf("'core/robreport-data.js'") >= 0, 'robreport-data.js not in MONEY_FILES');
ok(buildSrc.indexOf("'core/robreport.js'") >= 0, 'robreport.js not in MONEY_FILES');
var di = buildSrc.indexOf("'core/robreport-data.js'");
var ri = buildSrc.indexOf("'core/robreport.js'");
ok(di >= 0 && ri > di, 'robreport-data.js must precede robreport.js in the bundle');
var bundleSrc = fs.readFileSync(BUNDLE_MONEY, 'utf8');
ok(bundleSrc.indexOf('PFRobReport') >= 0, 'rebuilt core/bundle-money.js lacks PFRobReport (rebuild: node build/bundle-core.js)');

/* ---------- DOM smoke test (vm + minimal stub) ----------
   Teardown WS-5: the render is now P2 Intel Card + P4 Data Strip via
   PF.patterns (production path loads the real 33-patterns.js), with a
   fail-open legacy fallback when the patterns module is killed. */
var PATTERNS_MOD = path.join(C, '33-patterns.js');
function makeEl(tag) {
  return {
    tagName: tag, children: [], className: '', _html: '', style: {},
    setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function (c) { this.children.push(c); return c; },
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    set textContent(v) { this._html = v; }, get textContent() { return this._html; }
  };
}
function makeHost() {
  var host = makeEl('div');
  var html = '';
  Object.defineProperty(host, 'innerHTML', {
    set: function (v) { html = String(v); }, get: function () { return html; }
  });
  host.querySelector = function () { return null; };
  return { host: host, html: function () { return html; } };
}
function loadRender(skipKill, withPatterns) {
  var painters = {};
  var beaconCalls = [];
  var win = {
    PF: {
      skip: function (id) { return skipKill && id === 'robreport'; },
      error: function () {},
      postAction: function (type, key, action, params, cb) {
        beaconCalls.push({ type: type, key: key, action: action, params: params });
        if (cb) { try { cb({ ok: true }); } catch (e) {} }
      }
    },
    PFShare: { setPoster: function (id, fn) { painters[id] = fn; } },
    PF_BACKEND_URL: ''
  };
  win.window = win;
  if (withPatterns) {
    /* production path: the real pattern library, exactly as shipped.
       URL is provided: 33-patterns.js cleanHref() uses new URL() for its
       scheme allowlist (security hardening 2026-10-06); the shim must
       mirror a browser global or every relative link is refused. */
    var pbox = { window: win, document: null, console: console, URL: URL };
    vm.createContext(pbox);
    vm.runInContext(fs.readFileSync(PATTERNS_MOD, 'utf8'), pbox, { filename: '33-patterns.js' });
    ok(!!win.PF.patterns, 'PF.patterns loads for the production render path');
  }
  var doc = {
    readyState: 'complete',
    head: makeEl('head'),
    createElement: makeEl,
    addEventListener: function () {},
    getElementById: function () { return null; }
  };
  /* Browsers hoist window.* onto the global scope; mirror that in the vm. */
  var sandbox = { window: win, document: doc, console: console, PFShare: win.PFShare };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox, { filename: 'robreport-data.js' });
  vm.runInContext(renderSrc, sandbox, { filename: 'robreport.js' });
  return { win: win, doc: doc, painters: painters, beaconCalls: beaconCalls };
}
(function smoke() {
  /* production path: P2 Intel + P4 Strip */
  var r = loadRender(false, true);
  ok(!!r.win.PFRobReport, 'PFRobReport not exposed');
  var h1 = makeHost();
  var res = r.win.PFRobReport.mount(h1.host);
  ok(res === true, 'mount() should return true');
  var html = h1.html();
  var intel = (html.match(/pf-pat-intel"/g) || []).length;
  ok(intel === 33, 'mount rendered ' + intel + ' intel cards, expected 33 (29 items + 4 baskets)');
  var strips = (html.match(/pf-pat-data"/g) || []).length;
  ok(strips === 33, 'mount rendered ' + strips + ' data strips, expected 33');
  ok(/Why no Big Mac/.test(html), 'excluded note missing from mount');
  var shares = (html.match(/data-rr-share=/g) || []).length;
  ok(shares === 33, 'expected 33 share links, got ' + shares);
  var details = (html.match(/<details/g) || []).length;
  ok(details === 33, 'expected 33 wonks <details> (one tap deep), got ' + details);
  var pk = Object.keys(r.painters);
  ok(pk.length === 33, 'expected 33 painters registered, got ' + pk.length);
  ok(new Set(pk).size === 33, 'painter ids must be unique');
  /* painter fail-soft with no canvas */
  var painter = r.painters['robreport-burrito'];
  ok(typeof painter === 'function', 'item painter missing');
  var painterDone = null;
  try { painter(function (cv) { painterDone = cv; }); } catch (e) { fails.push('painter threw: ' + e.message); }
  ok(painterDone === null, 'painter should fail soft (done(null)) with no canvas');
  /* tagline + EDGAR links present in rendered HTML */
  ok(html.indexOf('Estimated from their own filings.') >= 0, 'tagline missing in rendered HTML');
  ok((html.match(/https:\/\/www\.sec\.gov\/Archives\/edgar\//g) || []).length >= 30, 'EDGAR links missing in rendered HTML');
  /* silent no-op + kill */
  ok(r.win.PFRobReport.mount(null) === false, 'mount(null) must return false');
<<<<<<< HEAD
  var r2 = loadRender(true, true);
=======
  /* read-signal beacon: mount fires the anonymous pageview beacon once */
  var beacons = r.beaconCalls.filter(function (c) {
    return c.type === 'stats' && c.key === 's_action' && c.action === 'pageview' &&
      c.params && c.params.slug === 'robreport';
  });
  ok(beacons.length === 1, 'mount must fire exactly one pageview beacon (slug robreport), got ' + r.beaconCalls.length + ' postAction calls');
  var r2 = loadRender(true);
>>>>>>> fe/data-pipeline-audit3
  ok(!r2.win.PFRobReport, 'kill switch ?pf_off=robreport must prevent exposure');
})();
/* fail-open fallback: patterns killed -> legacy markup, same contract */
(function fallbackSmoke() {
  var r = loadRender(false, false);
  ok(!!r.win.PFRobReport, 'PFRobReport not exposed (fallback path)');
  var h = makeHost();
  ok(r.win.PFRobReport.mount(h.host) === true, 'fallback mount() should return true');
  var html = h.html();
  var cards = (html.match(/pf-rr-card"/g) || []).length;
  ok(cards === 33, 'fallback rendered ' + cards + ' legacy cards, expected 33');
  var strips = (html.match(/pf-rr-dstrip"/g) || []).length;
  ok(strips === 33, 'fallback rendered ' + strips + ' legacy strips, expected 33');
  ok((html.match(/Estimated from their own filings/g) || []).length >= 33, 'fallback strips missing source lines');
  ok((html.match(/updated Oct 2026/g) || []).length >= 33, 'fallback strips missing recency stamps');
  ok((html.match(/data-rr-share=/g) || []).length === 33, 'fallback missing share links');
})();
/* fail-closed figure: an item that loses its anchor loses its strip */
(function failClosedSmoke() {
  var r = loadRender(false, true);
  var D = r.win.PFRobReportData;
  D.ITEMS[0].receipt = [];
  var h = makeHost();
  r.win.PFRobReport.mount(h.host);
  var html = h.html();
  var strips = (html.match(/pf-pat-data"/g) || []).length;
  ok(strips === 32, 'fail-closed: anchorless item must lose its strip (got ' + strips + ' strips)');
})();

if (fails.length) {
  console.error('ROBREPORT VERIFY FAIL (' + fails.length + '):');
  fails.forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
}
console.log('ROBREPORT VERIFY OK — 29 item cards + excluded note (30 cards), 4 baskets, formula audit clean, kill switch + bundle registration green.');
