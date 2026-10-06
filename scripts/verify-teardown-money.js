#!/usr/bin/env node
/* scripts/verify-teardown-money.js — WS-5 MONEY / ROBBERY REPORT teardown
   verification (section teardown, CEO-approved 2026-10-06). Run from the
   worktree root:
     node scripts/verify-teardown-money.js
   AFTER rebuilding bundles: node build/bundle-core.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Checks:
   1. node --check on every touched/new file + this harness.
   2. Card structure: every item/basket = P2 Intel Card (pf-pat-intel:
      kicker = villain, headline, dataLine = mechanism one-liner) + P4 Data
      Strip (pf-pat-data: ONE figure huge + label + source + recency).
      29 items + 4 baskets = 33 cards, 33 strips.
   3. One-villain-one-number: exactly one strip figure per card; villain
      kicker = the company name (uppercase) on every item card; mechanism
      one-liner present and non-empty on every card.
   4. Source line + recency on EVERY figure (fail if any figure lacks
      them): each strip carries "Estimated from their own filings", an
      EDGAR "filed <date>" anchor (items) or the sums line (baskets), and
      "updated Oct 2026". Fail-closed figure: an item that loses its
      EDGAR anchor loses its strip.
   5. Share-image export per card: 33 data-rr-share text links wired to
      the PFShare pipeline; 33 painters registered with unique ids;
      painters fail soft with no canvas.
   6. Integration-audit CTAs preserved, text-link style: every card has
      "REPORT THE PRICE YOU PAID ->" -> /economy#pf-inflation-checkin and
      "FOLLOW THEIR MONEY ->" -> /follow-the-money, rendered as
      pf-pat-textlink (never a button).
   7. CTA-verb lint clean (rogue-verb map + News Desk red-button rule):
      no donate, no ENLIST/CALL IT/HOLD EQUITY ->, no CONFIRM pill, no
      red-button or enlistment classes in card code; "JOIN THE FIGHT."
      lives only in the share-poster canvas footer (sanctioned share CTA
      standard), never in rendered card HTML.
   8. Wonks one tap deep, never the lead: 33 <details class="pf-rr-more">;
      in every card the strip precedes the details block.
   9. P8 social proof: the live CPI chip wires the REAL backend sample
      count through PF.patterns.proof (suppressed without one);
      proof() unit-checked fail-closed.
   10. Kill switches preserved, fail-open: ?pf_off=robreport in
      robreport.js + money-page.js section; vm kill -> no exposure;
      mount(null) -> false; patterns killed -> full legacy fallback
      render with the same source+recency contract.
   11. Zero new XP mechanics, zero backend writes: no POST, no xpGrant,
      no pf-pat-ring; read-only doc line intact.
   12. News Desk red-button rule: every figure traces to an EDGAR filing
      anchor (all receipt URLs are sec.gov EDGAR docs); section freshness
      line + per-figure recency stamp present.
   13. Bundle verification: rebuilt core/bundle-money.js contains the new
      module; MONEY_FILES order data-before-render. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var C = path.join(ROOT, 'v1.4.3', 'core');
var DATA_MOD = path.join(C, 'robreport-data.js');
var RENDER_MOD = path.join(C, 'robreport.js');
var PATTERNS_MOD = path.join(C, '33-patterns.js');
var MONEY_PAGE = path.join(C, 'money-page.js');
var BUILD_JS = path.join(ROOT, 'build', 'bundle-core.js');
var BUNDLE_MONEY = path.join(C, 'bundle-money.js');

var fails = [];
var passes = 0;
function ok(name) { passes++; }
function bad(name, why) { fails.push(name + ' — ' + why); }
function checkFile(p) {
  try { cp.execSync('node --check ' + p, { stdio: 'pipe' }); ok('node --check ' + path.basename(p)); }
  catch (e) { bad('node --check', p + ' failed syntax check'); }
}
[DATA_MOD, RENDER_MOD, PATTERNS_MOD, MONEY_PAGE, BUILD_JS, __filename].forEach(checkFile);

/* Strip block comments + full-line // comments only (never touch strings).
   AGENTS.md lesson: naive quote-stripping is regex-literal-blind. */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .filter(function (l) { return !/^\s*\/\//.test(l); })
            .join('\n');
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
var dataSrc = fs.readFileSync(DATA_MOD, 'utf8');
var renderSrc = fs.readFileSync(RENDER_MOD, 'utf8');
var renderCode = codeOnly(renderSrc);
var dataCode = codeOnly(dataSrc);

/* ---------- vm scaffolding ---------- */
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
function loadRender(skipKill, withPatterns) {
  var painters = {};
  var win = {
    PF: { skip: function (id) { return skipKill && id === 'robreport'; }, error: function () {} },
    PFShare: { setPoster: function (id, fn) { painters[id] = fn; } },
    PF_BACKEND_URL: ''
  };
  win.window = win;
  if (withPatterns) {
    var pbox = { window: win, document: null, console: console };
    vm.createContext(pbox);
    vm.runInContext(fs.readFileSync(PATTERNS_MOD, 'utf8'), pbox, { filename: '33-patterns.js' });
  }
  var doc = {
    readyState: 'complete', head: makeEl('head'), createElement: makeEl,
    addEventListener: function () {}, getElementById: function () { return null; }
  };
  var sandbox = { window: win, document: doc, console: console, PFShare: win.PFShare };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc, sandbox, { filename: 'robreport-data.js' });
  vm.runInContext(renderSrc, sandbox, { filename: 'robreport.js' });
  var host = makeEl('div');
  var html = '';
  Object.defineProperty(host, 'innerHTML', {
    set: function (v) { html = String(v); }, get: function () { return html; }
  });
  host.querySelector = function () { return null; };
  return { win: win, painters: painters, host: host, html: function () { return html; } };
}
function articles(html) {
  return (html.match(/<article[\s\S]*?<\/article>/g) || []);
}

/* ---------- 2/3/4/6/8: card structure, one-villain-one-number,
   source+recency, audit CTAs, wonks one tap deep ---------- */
(function structure() {
  var r = loadRender(false, true);
  if (!r.win.PFRobReport) { bad('structure', 'PFRobReport not exposed'); return; }
  ok('PFRobReport exposed (patterns path)');
  if (r.win.PFRobReport.mount(r.host) !== true) { bad('structure', 'mount() did not return true'); return; }
  var html = r.html();
  var arts = articles(html);
  if (arts.length === 33) ok('33 cards rendered (29 items + 4 baskets)');
  else bad('card count', 'expected 33 <article> cards, got ' + arts.length);

  var D = r.win.PFRobReportData;
  var byId = {};
  D.ITEMS.forEach(function (it) { byId[it.id] = it; });

  /* one strip figure per card + source + recency */
  var stripRe = /<p class="pf-pat-data-fig">([\s\S]*?)<\/p>[\s\S]*?<p class="pf-pat-data-label">([\s\S]*?)<\/p>[\s\S]*?<p class="pf-pat-data-src">([\s\S]*?)<\/p>[\s\S]*?<p class="pf-pat-data-time">updated ([\s\S]*?)<\/p>/g;
  var stripCount = 0, stripBad = 0;
  var m;
  while ((m = stripRe.exec(html)) !== null) {
    stripCount++;
    var fig = m[1].trim(), label = m[2].trim(), src = m[3], upd = m[4].trim();
    if (!fig) { stripBad++; bad('strip figure', 'empty figure in strip #' + stripCount); }
    if (!/their take/i.test(label)) { stripBad++; bad('strip label', 'strip #' + stripCount + ' label is not a take line: ' + label); }
    if (src.indexOf('Estimated from their own filings') === -1) { stripBad++; bad('strip source', 'strip #' + stripCount + ' lacks the honesty signature'); }
    var anchored = /filed\s+\w/i.test(src) || /sums of the item receipts/i.test(src);
    if (!anchored) { stripBad++; bad('strip anchor', 'strip #' + stripCount + ' has no filing anchor'); }
    if (!upd) { stripBad++; bad('strip recency', 'strip #' + stripCount + ' lacks a recency stamp'); }
  }
  if (stripCount === 33) ok('33 data strips, exactly one figure per card');
  else bad('strip count', 'expected 33 strips, got ' + stripCount);
  if (stripBad === 0) ok('every figure carries source line + recency stamp');
  if ((html.match(/updated Oct 2026/g) || []).length >= 33) ok('recency stamp "updated Oct 2026" on every strip');
  else bad('recency stamp', 'not present on every strip');

  /* villain kicker + headline + mechanism one-liner per card */
  var cardBad = 0;
  D.ITEMS.forEach(function (it) {
    var re = new RegExp('<article[^>]*data-rr="' + it.id + '"[\\s\\S]*?</article>');
    var a = (html.match(re) || [])[0] || '';
    if (!a) { cardBad++; bad('item card', 'no card for ' + it.id); return; }
    var kick = (a.match(/pf-pat-intel-kicker">([\s\S]*?)<\/p>/) || [])[1] || '';
    if (kick.trim() !== esc(String(it.company).toUpperCase())) { cardBad++; bad('villain kicker', it.id + ' kicker is "' + kick.trim() + '", expected "' + esc(String(it.company).toUpperCase()) + '"'); }
    var head = (a.match(/pf-pat-intel-head">([\s\S]*?)<\/h3>/) || [])[1] || '';
    if (head.trim() !== esc(it.name)) { cardBad++; bad('headline', it.id + ' headline mismatch'); }
    var mech = (a.match(/pf-pat-intel-data">([\s\S]*?)<\/p>/) || [])[1] || '';
    if (!mech.trim()) { cardBad++; bad('mechanism', it.id + ' has no mechanism one-liner'); }
  });
  D.BASKETS.forEach(function (b) {
    var re = new RegExp('<article[^>]*data-rr="basket:' + b.id + '"[\\s\\S]*?</article>');
    var a = (html.match(re) || [])[0] || '';
    if (!a) { cardBad++; bad('basket card', 'no card for ' + b.id); return; }
    var mech = (a.match(/pf-pat-intel-data">([\s\S]*?)<\/p>/) || [])[1] || '';
    if (!mech.trim()) { cardBad++; bad('basket mechanism', b.id + ' has no one-liner'); }
    var kick = (a.match(/pf-pat-intel-kicker">([\s\S]*?)<\/p>/) || [])[1] || '';
    if (!/HOUSEHOLD BASKET/i.test(kick)) { cardBad++; bad('basket kicker', b.id + ' kicker is not a basket kicker'); }
  });
  if (cardBad === 0) ok('villain kicker + headline + mechanism one-liner on all 33 cards');

  /* the two integration-audit CTAs, text-link style, on every card */
  var ctaReport = '<a class="pf-pat-textlink" href="/economy#pf-inflation-checkin">REPORT THE PRICE YOU PAID \u2192</a>';
  var ctaFollow = '<a class="pf-pat-textlink" href="/follow-the-money">FOLLOW THEIR MONEY \u2192</a>';
  var nR = html.split(ctaReport).length - 1, nF = html.split(ctaFollow).length - 1;
  if (nR === 33) ok('REPORT THE PRICE YOU PAID → → /economy#pf-inflation-checkin on all 33 cards');
  else bad('audit CTA (report)', 'expected 33, got ' + nR);
  if (nF === 33) ok('FOLLOW THEIR MONEY → → /follow-the-money on all 33 cards');
  else bad('audit CTA (follow)', 'expected 33, got ' + nF);

  /* wonks one tap deep, never the lead: strip precedes details in each card */
  var detCount = (html.match(/<details class="pf-rr-more">/g) || []).length;
  if (detCount === 33) ok('33 wonks <details> (one tap deep)');
  else bad('wonks details', 'expected 33, got ' + detCount);
  var orderBad = 0;
  arts.forEach(function (a) {
    var si = a.indexOf('pf-pat-data-fig'), di = a.indexOf('<details');
    if (si === -1 || di === -1 || si > di) orderBad++;
  });
  if (orderBad === 0) ok('strip leads, data table one tap deep in every card');
  else bad('card order', orderBad + ' cards do not lead with the strip');
})();

/* ---------- 5: share-image export per card ---------- */
(function share() {
  var r = loadRender(false, true);
  r.win.PFRobReport.mount(r.host);
  var html = r.html();
  var nItem = (html.match(/data-rr-share="item:/g) || []).length;
  var nBasket = (html.match(/data-rr-share="basket:/g) || []).length;
  if (nItem === 29 && nBasket === 4) ok('33 share text links (29 items + 4 baskets) wired to the share pipeline');
  else bad('share links', 'expected 29 item + 4 basket share links, got ' + nItem + ' + ' + nBasket);
  if ((html.match(/data-rr-share="[^"]*"[^>]*class="pf-pat-textlink"|class="pf-pat-textlink"[^>]*data-rr-share/g) || []).length >= 33)
    ok('share exports are text links (red-button rule)');
  else bad('share style', 'share links are not text-link styled');
  var pk = Object.keys(r.painters);
  if (pk.length === 33 && new Set(pk).size === 33) ok('33 PFShare painters registered, unique ids');
  else bad('painters', 'expected 33 unique painters, got ' + pk.length);
  var done = 'unset';
  try { r.painters['robreport-burrito'](function (cv) { done = cv; }); }
  catch (e) { bad('painter', 'threw: ' + e.message); }
  if (done === null) ok('painters fail soft with no canvas');
  else bad('painter', 'did not fail soft (done=' + done + ')');
})();

/* ---------- 7: CTA-verb lint (rogue-verb map + red-button rule) ---------- */
(function ctaLint() {
  var banned = [
    [/donate/i, '"donate" (any case)'],
    [/enlist\s*(\u2192|->)/i, '"ENLIST ->" as a card CTA'],
    [/call\s*it\s*(\u2192|->)/i, '"CALL IT ->" as a card CTA'],
    [/hold\s*equity/i, '"HOLD EQUITY" in CTA copy'],
    [/confirm/i, '"CONFIRM" pill CTA'],
    [/pf-pat-deploy-red/i, 'red button class in card code'],
    [/pf-pat-join/i, 'enlistment class in card code'],
    [/pf-pat-deploy["'\s>]/i, 'deploy button class in card code']
  ];
  var clean = true;
  banned.forEach(function (b) {
    if (b[0].test(renderCode)) { clean = false; bad('CTA-verb lint', 'banned/rogue found: ' + b[1]); }
  });
  if (clean) ok('CTA-verb lint clean (rogue-verb map + red-button rule)');
  /* JOIN THE FIGHT. is enlistment-only: in card code it may appear ONLY in
     the share-poster canvas footer (the sanctioned share CTA standard). */
  var noFooter = renderCode.replace(/function footerPoster[\s\S]*?\n  \}/, ' ');
  if (/JOIN THE FIGHT\./.test(noFooter)) bad('JOIN THE FIGHT.', 'enlistment CTA leaked outside the share-poster footer');
  else ok('JOIN THE FIGHT. confined to the share-poster footer');
  var r = loadRender(false, true);
  r.win.PFRobReport.mount(r.host);
  if (r.html().indexOf('JOIN THE FIGHT.') === -1) ok('no enlistment CTA in rendered card HTML');
  else bad('rendered HTML', 'JOIN THE FIGHT. leaked into card HTML');
})();

/* ---------- 9: P8 social proof ---------- */
(function proof() {
  if (!/sample_count/.test(renderSrc)) bad('P8 wiring', 'live chip does not read sample_count');
  else if (!/\.proof\(\{\s*count:/.test(renderSrc)) bad('P8 wiring', 'live chip does not route the count through PF.patterns.proof');
  else ok('live CPI chip wires the real sample count through P8 proof()');
  /* proof() unit: suppressed without a real count */
  var win = { PF: { skip: function () { return false; }, error: function () {} } };
  win.window = win;
  var box = { window: win, document: null, console: console };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(PATTERNS_MOD, 'utf8'), box, { filename: '33-patterns.js' });
  var P = win.PF.patterns;
  if (P.proof({ count: 0, text: 'neighbors reported this price' }) === '' &&
      P.proof({ count: -3, text: 'x' }) === '' &&
      P.proof({ text: 'x' }) === '')
    ok('P8 proof() suppressed without a real count (fail-closed)');
  else bad('P8 proof()', 'rendered without a real count');
  var withCount = P.proof({ count: 1234, text: 'neighbors reported this price' });
  if (withCount.indexOf('1,234') !== -1) ok('P8 proof() renders a real count');
  else bad('P8 proof()', 'did not render the real count');
})();

/* ---------- 10: kill switches, fail-open ---------- */
(function kills() {
  if (/PF\.skip\(['"]robreport['"]\)/.test(renderSrc)) ok('kill: PF.skip(\'robreport\') in robreport.js');
  else bad('kill switch', 'robreport.js missing PF.skip kill');
  var mp = fs.readFileSync(MONEY_PAGE, 'utf8');
  if (/key:\s*['"]robreport['"]/.test(mp) && /kill:\s*['"]robreport['"]/.test(mp))
    ok('kill: money-page.js robreport section kill switch');
  else bad('kill switch', 'money-page.js missing robreport section kill');
  var r = loadRender(false, true);
  if (r.win.PFRobReport.mount(null) === false) ok('mount(null) returns false');
  else bad('mount(null)', 'did not return false');
  var rk = loadRender(true, true);
  if (!rk.win.PFRobReport) ok('?pf_off=robreport prevents exposure');
  else bad('kill switch', '?pf_off=robreport did not prevent exposure');
  /* fail-open: patterns killed -> legacy markup, same contract */
  var rf = loadRender(false, false);
  rf.win.PFRobReport.mount(rf.host);
  var html = rf.html();
  var cards = (html.match(/pf-rr-card"/g) || []).length;
  var strips = (html.match(/pf-rr-dstrip"/g) || []).length;
  if (cards === 33 && strips === 33) ok('fail-open: 33 legacy cards + 33 strips with patterns killed');
  else bad('fail-open', 'got ' + cards + ' cards + ' + strips + ' strips');
  if ((html.match(/Estimated from their own filings/g) || []).length >= 33 &&
      (html.match(/updated Oct 2026/g) || []).length >= 33)
    ok('fail-open: source line + recency on every fallback figure');
  else bad('fail-open', 'fallback figures missing source/recency');
})();

/* ---------- 4b: fail-closed figure ---------- */
(function failClosed() {
  var r = loadRender(false, true);
  r.win.PFRobReportData.ITEMS[0].receipt = []; /* anchor lost */
  r.win.PFRobReport.mount(r.host);
  var n = (r.html().match(/pf-pat-data"/g) || []).length;
  if (n === 32) ok('fail-closed: anchorless item loses its strip (32 strips)');
  else bad('fail-closed', 'expected 32 strips after anchor loss, got ' + n);
})();

/* ---------- 11: zero XP, zero backend writes ---------- */
(function purity() {
  if (!/method\s*:\s*['"]POST['"]/i.test(renderCode)) ok('read-only: no POST in robreport.js');
  else bad('read-only', 'POST found in robreport.js');
  if (!/xpGrant|creditShare/i.test(renderCode)) ok('zero XP mechanics');
  else bad('XP', 'XP code in robreport.js');
  if (renderSrc.indexOf('pf-pat-ring') === -1) ok('no progression ring (no new XP mechanics)');
  else bad('XP', 'progression ring in robreport.js');
  if (/ZERO XP/.test(renderSrc)) ok('read-only / zero-XP doc line intact');
  else bad('docs', 'zero-XP doc line missing');
  var both = dataCode + '\n' + renderCode;
  var clean = true;
  ['fraud', 'lied', 'lying', 'scam', 'cheat', 'donate'].forEach(function (t) {
    if (new RegExp('\\b' + t + '\\b', 'i').test(both)) { clean = false; bad('copy rules', 'banned token in code: ' + t); }
  });
  if (clean) ok('copy/defamation rules clean');
})();

/* ---------- 12: News Desk red-button rule (anchors) ---------- */
(function anchors() {
  var D = (function () {
    var win = {};
    win.window = win;
    var box = { window: win, document: null, console: console };
    vm.createContext(box);
    vm.runInContext(dataSrc, box, { filename: 'robreport-data.js' });
    return win.PFRobReportData;
  })();
  var badUrls = 0;
  D.ITEMS.forEach(function (it) {
    (it.receipt || []).forEach(function (rc) {
      if (!/^https:\/\/www\.sec\.gov\/Archives\/edgar\//.test(rc.url)) badUrls++;
    });
    if (!(it.receipt || []).length) badUrls++;
  });
  if (badUrls === 0) ok('every figure traces to a News Desk-verified EDGAR filing anchor');
  else bad('anchors', badUrls + ' receipt problems');
  var r = loadRender(false, true);
  r.win.PFRobReport.mount(r.host);
  if (r.html().indexOf('Anchored to filings current as of Oct 2026') !== -1)
    ok('section freshness line present (recency stamp)');
  else bad('freshness', 'section freshness line missing');
})();

/* ---------- 13: bundle verification ---------- */
(function bundles() {
  var buildSrc = fs.readFileSync(BUILD_JS, 'utf8');
  var di = buildSrc.indexOf("'core/robreport-data.js'");
  var ri = buildSrc.indexOf("'core/robreport.js'");
  if (di >= 0 && ri > di) ok('MONEY_FILES: robreport-data.js precedes robreport.js');
  else bad('bundle order', 'robreport-data.js must precede robreport.js in MONEY_FILES');
  var bundleSrc = fs.readFileSync(BUNDLE_MONEY, 'utf8');
  var markers = ['PFRobReport', 'data-rr-share', 'SHARE THIS INTEL', 'pf-rr-dstrip',
                 'The receipts &amp; the math', 'REPORT THE PRICE YOU PAID', 'FOLLOW THEIR MONEY'];
  var missing = markers.filter(function (mk) { return bundleSrc.indexOf(mk) === -1; });
  if (!missing.length) ok('rebuilt core/bundle-money.js contains the redesigned module');
  else bad('bundle content', 'missing from bundle-money.js: ' + missing.join(', '));
})();

/* ---------- gates: inner scripts + styles sync ---------- */
(function gates() {
  try {
    cp.execSync('node scripts/check-inner-scripts.js v1.4.3/core/robreport.js v1.4.3/core/robreport-data.js v1.4.3/core/money-page.js', { cwd: ROOT, stdio: 'pipe' });
    ok('scripts/check-inner-scripts.js passes on the touched silos');
  } catch (e) { bad('inner scripts', 'scripts/check-inner-scripts.js failed'); }
  try {
    cp.execSync('node build/check-styles-sync.js', { cwd: ROOT, stdio: 'pipe' });
    ok('build/check-styles-sync.js passes');
  } catch (e) { bad('styles sync', 'build/check-styles-sync.js failed'); }
})();

if (fails.length) {
  console.error('TEARDOWN-MONEY VERIFY FAIL (' + fails.length + '):');
  fails.forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
}
console.log('TEARDOWN-MONEY VERIFY OK — ' + passes + ' checks green: 33 P2+P4 cards, every figure sourced + stamped, share per card, audit CTAs preserved, CTA lint clean, kill switches + fail-open/fail-closed green.');
