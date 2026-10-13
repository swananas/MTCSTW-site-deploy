/* People's CPI Ticker harness (fe/cpi-ticker-20261013)
   Structural checks + FUNCTIONAL render tests (jsdom) for the homepage
   campaign-band -> ticker generalization in site/index.html.

   Run:  node tools/cpi-ticker-harness/harness.js
   Needs jsdom resolvable (NODE_PATH or a local install). Exit 1 on any FAIL.

   Per AGENTS.md: pattern checks run on a comment-stripped view WITHOUT
   string stripping (naive quote stripping is regex-literal-blind and
   cascades false failures). Behavior is asserted via the functional tests. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { ({ JSDOM } = require('/tmp/cpi-harness/node_modules/jsdom')); }

const WT = path.resolve(__dirname, '..', '..');
const PAGE = path.join(WT, 'site', 'index.html');
const html = fs.readFileSync(PAGE, 'utf8');
const baseHtml = execSync('git show HEAD:site/index.html', { cwd: WT }).toString();

const tickerFx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-ticker-items.json'), 'utf8'));
const campaignFx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-campaign.json'), 'utf8'));
const NO_CAMPAIGN = { ok: true, campaign: null };

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------- extraction helpers ---------- */
function scriptBlocks(src) {
  const out = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}
function findBlock(src, marker) {
  return scriptBlocks(src).find(b => b.includes(marker)) || null;
}
/* comment-stripped view: HTML comments + JS block comments removed,
   strings left untouched (see header note). */
function commentStripped(src) {
  return src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}
function fnSlice(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) return null;
  const b = src.indexOf(endMarker, a);
  return b < 0 ? null : src.slice(a, b);
}

/* ---------- structural checks ---------- */
section('structural');
const view = commentStripped(html);
ok((view.match(/id="pf-campaign-slot"/g) || []).length === 1, 'exactly one #pf-campaign-slot on the homepage');
ok(view.includes("API+'ticker_items'"), "ticker fetches API+'ticker_items' (same base/pattern as campaign fetch)");
ok(view.includes('ROTATE_MS=4500'), 'rotation interval is 4500ms');
ok(view.includes("matchMedia('(prefers-reduced-motion: reduce)')"), 'ticker checks prefers-reduced-motion before starting rotation');
ok(view.includes('.pf-ticker-item{') && view.includes('min-height:44px'), 'ticker CSS present with >=44px tap target');
ok(view.includes('pf-campaign-slot') && view.includes("kind==='campaign'"), 'campaign-kind API items are skipped (campaign built from campaign_active)');
ok(view.includes('data-kind'), 'tape items carry data-kind');

/* untouched-behavior guards: existing campaign internals byte-identical to base */
const fillBase = fnSlice(baseHtml, 'function fillSlots(c){', 'function render(res){');
const fillNew = fnSlice(html, 'function fillSlots(c){', 'function render(res){');
ok(fillBase !== null && fillBase === fillNew, 'fillSlots() byte-identical to base (template slots unregressed)');
const renderBase = fnSlice(baseHtml, 'function render(res){', '/* UX sprint ITER-10');
const renderNew = fnSlice(html, 'function render(res){', '/* UX sprint ITER-10');
ok(renderBase !== null && renderBase === renderNew, 'campaign render() byte-identical to base (r5 clickability unregressed)');
const joinBase = fnSlice(baseHtml, 'id="pf-campaign-join"', '/* ----------');
const joinNew = fnSlice(html, 'id="pf-campaign-join"', '/* ----------');
ok(joinBase !== null && joinBase.length > 200 && joinBase === joinNew, 'campaign join-card block byte-identical to base (untouched)');
ok(html !== baseHtml && html.includes('__pfTickerBoot'), 'ticker boot hook wired from campaign script');

/* syntax: both touched script blocks must compile */
const campBlock = findBlock(html, 'CAMPAIGN BANNER (fe/campaign-banner)');
const tickBlock = findBlock(html, "PEOPLE'S CPI TICKER (fe/cpi-ticker-20261013)");
ok(!!campBlock, 'campaign script block found');
ok(!!tickBlock, 'ticker script block found');
for (const [nm, blk] of [['campaign', campBlock], ['ticker', tickBlock]]) {
  try { new Function(blk); ok(true, nm + ' script compiles'); }
  catch (e) { ok(false, nm + ' script compiles (' + e.message + ')'); }
}

/* ---------- functional render tests ---------- */
function makeDom(opts) {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="pf-campaign-slot" class="pf-campaign-slot"></div></body></html>',
    { url: 'https://mtcstw.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.__timers = [];
  w.setInterval = (fn, ms) => { w.__timers.push({ fn, ms, cleared: false }); return w.__timers.length; };
  w.clearInterval = (id) => { if (w.__timers[id - 1]) w.__timers[id - 1].cleared = true; };
  w.matchMedia = (q) => ({ matches: !!opts.reducedMotion, media: q, addEventListener() {}, removeEventListener() {} });
  w.fetch = (url) => {
    if (url.includes('campaign_active')) {
      if (opts.campaignFail) return Promise.reject(new Error('net down'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(opts.campaign) });
    }
    if (url.includes('ticker_items')) {
      if (opts.tickerFail) return Promise.reject(new Error('net down'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(opts.ticker) });
    }
    return Promise.reject(new Error('unexpected fetch: ' + url));
  };
  if (opts.preDismiss) w.sessionStorage.setItem('pf_campaign_dismissed', String(opts.preDismiss));
  return dom;
}
async function flush() { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); }
function boot(dom) { dom.window.eval(campBlock); dom.window.eval(tickBlock); }
function visibleItem(dom) {
  return dom.window.document.querySelector('.pf-ticker-item.pf-ticker-on');
}
function visibleLabel(dom) {
  const v = visibleItem(dom);
  if (!v) return null;
  const l = v.querySelector('.pf-ticker-label') || v.querySelector('.pf-campaign-title');
  return l ? l.textContent : v.textContent;
}
function tick(dom, n) {
  const t = dom.window.__timers.find(t => !t.cleared);
  if (!t) return false;
  for (let i = 0; i < (n || 1); i++) t.fn();
  return true;
}

(async function () {
  section('functional: full tape (campaign + breaking + prices + pulse)');
  {
    const dom = makeDom({ campaign: campaignFx, ticker: tickerFx });
    boot(dom); await flush();
    const d = dom.window.document;
    const bar = d.querySelector('#pf-campaign-slot > section.pf-campaign.pf-ticker');
    ok(!!bar, 'tape takes over the campaign band (same slot, .pf-campaign.pf-ticker)');
    const items = d.querySelectorAll('.pf-ticker-item');
    /* 1 campaign + 6 API items (fixture's kind:campaign entry must be skipped) */
    ok(items.length === 7, 'tape has campaign + 6 API items, API campaign-kind skipped (got ' + items.length + ')');
    ok(d.querySelectorAll('.pf-ticker-item[data-kind="campaign"]').length === 1, 'exactly one campaign item');
    ok(visibleItem(dom) && visibleItem(dom).getAttribute('data-kind') === 'campaign', 'campaign item is FIRST');
    ok(visibleLabel(dom) === 'FIRE GOOFY GUIFOYLE', 'campaign title renders');
    const cta = visibleItem(dom).querySelector('.pf-campaign-cta');
    ok(!!cta && cta.getAttribute('href') === '/fire-goofy-guifoyle/', 'campaign CTA preserved with r5 destination');
    const copy = visibleItem(dom).querySelector('a.pf-campaign-copy');
    ok(!!copy && copy.getAttribute('href') === '/fire-goofy-guifoyle/', 'campaign copy block is the tap target (r5)');
    ok(dom.window.__timers.length === 1 && dom.window.__timers[0].ms === 4500, 'rotation timer running at 4500ms');

    const order = [];
    for (let i = 0; i < 7; i++) { order.push(visibleLabel(dom)); tick(dom); }
    const expect = ['FIRE GOOFY GUIFOYLE', 'SEPT CPI PRINT LANDS 7:30 AM CT', 'DAIRY', 'EGGS — Cal-Maine',
      'FRESH FRUIT', 'DRUG PRICES TRACKED', '62 SICK LEFT RADICALS'];
    ok(JSON.stringify(order) === JSON.stringify(expect),
      'rotation order = campaign first, then API order verbatim (breaking pinned first as delivered): ' + JSON.stringify(order));
    ok(visibleLabel(dom) === 'FIRE GOOFY GUIFOYLE', 'rotation wraps back to campaign');

    const byLabel = (t) => [...d.querySelectorAll('.pf-ticker-item')].find(e => { const l = e.querySelector('.pf-ticker-label'); return l && l.textContent === t; });
    const dairy = byLabel('DAIRY');
    ok(dairy && dairy.querySelector('.pf-ticker-move').textContent === '▲ +5.9%', 'price item renders label + arrow + pct (DAIRY ▲ +5.9%)');
    ok(dairy && dairy.tagName === 'A' && dairy.getAttribute('href') === '/peoples-cpi/', 'price item is a link to its href');
    const fruit = byLabel('FRESH FRUIT');
    ok(fruit && fruit.querySelector('.pf-ticker-move').textContent === '▼ -2.3%', 'decliner renders ▼ -2.3%');
    const brk = d.querySelector('.pf-ticker-item.pf-ticker--breaking');
    ok(!!brk && brk.getAttribute('data-kind') === 'breaking', 'breaking item carries breaking styling hook');
    ok(dairy && dairy.querySelector('.pf-ticker-meta').textContent.includes("People's CPI"), 'source/as-of meta renders');

    /* pause on hover */
    bar.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: false }));
    tick(dom); ok(visibleLabel(dom) === 'FIRE GOOFY GUIFOYLE', 'pause on hover: tick does not advance');
    bar.dispatchEvent(new dom.window.MouseEvent('mouseleave', { bubbles: false }));
    tick(dom); ok(visibleLabel(dom) === 'SEPT CPI PRINT LANDS 7:30 AM CT', 'resume after hover ends');

    /* dismiss hides campaign ONLY; rotation continues */
    tick(dom, 6); /* wrap back to campaign */
    ok(visibleLabel(dom) === 'FIRE GOOFY GUIFOYLE', 'back on campaign item before dismiss');
    visibleItem(dom).querySelector('.pf-campaign-dismiss').click();
    ok(dom.window.sessionStorage.getItem('pf_campaign_dismissed') === '7', 'dismiss writes per-campaign session key');
    ok(d.querySelectorAll('.pf-ticker-item').length === 6, 'campaign item removed from tape');
    ok(![...d.querySelectorAll('.pf-ticker-item')].some(e => e.getAttribute('data-kind') === 'campaign'), 'no campaign item remains');
    ok(visibleLabel(dom) === 'SEPT CPI PRINT LANDS 7:30 AM CT', 'rotation continues at next item after dismiss');
    tick(dom); ok(visibleLabel(dom) === 'DAIRY', 'rotation keeps going after dismiss');
    dom.window.close();
  }

  section('functional: no campaign -> rotation starts at prices (API order)');
  {
    const dom = makeDom({ campaign: NO_CAMPAIGN, ticker: tickerFx });
    boot(dom); await flush();
    const d = dom.window.document;
    ok(!!d.querySelector('section.pf-ticker'), 'tape renders without a campaign');
    ok(d.querySelectorAll('.pf-ticker-item').length === 6, 'all 6 API items present, no campaign item');
    ok(visibleLabel(dom) === 'SEPT CPI PRINT LANDS 7:30 AM CT', 'first visible = first API item (breaking, as delivered)');
    dom.window.close();
  }

  section('functional: campaign already dismissed this session');
  {
    const dom = makeDom({ campaign: campaignFx, ticker: tickerFx, preDismiss: 7 });
    boot(dom); await flush();
    const d = dom.window.document;
    ok(d.querySelectorAll('.pf-ticker-item[data-kind="campaign"]').length === 0, 'dismissed campaign excluded from tape');
    ok(visibleLabel(dom) === 'SEPT CPI PRINT LANDS 7:30 AM CT', 'tape starts at prices');
    dom.window.close();
  }

  section('functional: reduced motion = static');
  {
    const dom = makeDom({ campaign: campaignFx, ticker: tickerFx, reducedMotion: true });
    boot(dom); await flush();
    const d = dom.window.document;
    ok(!!d.querySelector('section.pf-ticker'), 'tape still renders under reduced-motion');
    ok(dom.window.__timers.length === 0, 'no rotation timer under prefers-reduced-motion');
    ok(visibleLabel(dom) === 'FIRE GOOFY GUIFOYLE', 'first item shown statically');
    dom.window.close();
  }

  section('functional: fail-soft — ticker fetch fails, band = campaign strip exactly as today');
  {
    const dom = makeDom({ campaign: campaignFx, tickerFail: true });
    boot(dom); await flush();
    const d = dom.window.document;
    const bar = d.querySelector('#pf-campaign-slot > section.pf-campaign');
    ok(!!bar && !bar.classList.contains('pf-ticker'), 'standalone campaign strip renders, no tape takeover');
    ok(d.querySelectorAll('.pf-ticker-item').length === 0, 'no tape items in DOM');
    const x = bar && bar.querySelector('.pf-campaign-dismiss');
    ok(!!x, 'standalone strip dismiss present');
    if (x) { x.click(); ok(d.getElementById('pf-campaign-slot').innerHTML === '', 'standalone strip dismiss still clears the band (no regression)'); }
    dom.window.close();
  }

  section('functional: fail-soft — ticker not-ok + no campaign = empty band');
  {
    const dom = makeDom({ campaign: NO_CAMPAIGN, ticker: { ok: false } });
    boot(dom); await flush();
    ok(dom.window.document.getElementById('pf-campaign-slot').innerHTML === '', 'slot stays empty, exactly as today');
    dom.window.close();
  }

  section('functional: fail-soft — ticker ok but zero items, campaign strip untouched');
  {
    const dom = makeDom({ campaign: campaignFx, ticker: { ok: true, as_of: '2026-10-13', items: [] } });
    boot(dom); await flush();
    const bar = dom.window.document.querySelector('#pf-campaign-slot > section.pf-campaign');
    ok(!!bar && !bar.classList.contains('pf-ticker'), 'campaign-only strip remains when tape has nothing to add');
    dom.window.close();
  }

  section('dead-target check: every fixture href resolves to a real site path');
  {
    const hrefs = new Set();
    tickerFx.items.forEach(i => i.href && hrefs.add(i.href));
    hrefs.add(campaignFx.campaign.cta_url);
    for (const h of hrefs) {
      if (!h.startsWith('/')) { ok(false, 'href is root-relative: ' + h); continue; }
      const p = path.join(WT, 'site', h.replace(/^\//, ''), 'index.html');
      const pFile = path.join(WT, 'site', h.replace(/^\//, ''));
      ok(fs.existsSync(p) || fs.existsSync(pFile), 'href resolves in site tree: ' + h);
    }
    /* and every anchor the tape actually rendered in the full scenario points at a verified path */
    const dom = makeDom({ campaign: campaignFx, ticker: tickerFx });
    boot(dom); await flush();
    const anchors = [...dom.window.document.querySelectorAll('.pf-ticker-item[href], .pf-ticker-item a[href]')];
    ok(anchors.length > 0 && anchors.every(a => hrefs.has(new URL(a.href).pathname)),
      'all rendered tape anchors use verified fixture hrefs (' + anchors.length + ' anchors)');
    dom.window.close();
  }

  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
